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

  // ------------------------
  // Storage helpers
  // ------------------------
  _initStorage() {
    const arrayKeys = [
      'events',
      'event_registrations',
      'personal_schedules',
      'personal_schedule_items',
      'donation_campaigns',
      'donations',
      'volunteer_shifts',
      'volunteer_signups',
      'solar_estimates',
      'articles',
      'reading_lists',
      'reading_list_items',
      'field_trip_slots',
      'field_trip_requests',
      'exhibitors',
      'contact_messages'
    ];

    arrayKeys.forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    });

    // Generic local UI state (single-user)
    if (!localStorage.getItem('local_state')) {
      const defaultState = {
        personalScheduleId: null,
        readingListId: null
      };
      localStorage.setItem('local_state', JSON.stringify(defaultState));
    }

    // Static-ish content/config buckets (only if not already provided)
    if (!localStorage.getItem('home_page_content')) {
      const home = {
        event_name: 'Solar Awareness Event',
        mission_text: 'A nonprofit initiative to help our community learn about solar energy and clean power.',
        event_start_date: '',
        event_end_date: '',
        location_name: '',
        location_city: '',
        location_state: '',
        primary_cta_label: 'Explore Events',
        secondary_ctas: [
          { label: 'Schedule', target_page: 'schedule' },
          { label: 'Donate', target_page: 'donate' }
        ]
      };
      localStorage.setItem('home_page_content', JSON.stringify(home));
    }

    if (!localStorage.getItem('about_page_content')) {
      const about = {
        mission: 'Empower families, schools, and communities to understand and adopt solar energy.',
        goals: [
          'Increase awareness of solar benefits and costs.',
          'Connect residents with local installers and resources.',
          'Support youth solar education programs.'
        ],
        youth_solar_education_section: 'Our Youth Solar Education programs bring hands-on solar science to classrooms and youth groups.',
        program_areas: [
          {
            title: 'Community Education',
            description: 'Workshops, tours, and talks for residents and small businesses.'
          },
          {
            title: 'Youth Programs',
            description: 'Field trips, classroom visits, and youth-focused activities.'
          },
          {
            title: 'Installer Connections',
            description: 'Helping attendees connect with reputable local solar installers.'
          }
        ]
      };
      localStorage.setItem('about_page_content', JSON.stringify(about));
    }

    if (!localStorage.getItem('privacy_content')) {
      const privacy = {
        sections: [
          {
            id: 'overview',
            title: 'Overview',
            body: 'We collect only the information needed to operate the event and respond to your requests. Data is stored securely and not sold to third parties.'
          },
          {
            id: 'events',
            title: 'Event Registrations',
            body: 'When you register for an event, we store your name, email, and registration details so we can confirm your spot and send updates.'
          },
          {
            id: 'donations',
            title: 'Donations',
            body: 'Donation information is used to record your gift or pledge. For offline payments, we do not store full payment details.'
          },
          {
            id: 'volunteers',
            title: 'Volunteers',
            body: 'Volunteer signups collect contact information so coordinators can confirm roles and schedules.'
          },
          {
            id: 'schools',
            title: 'Schools & Field Trips',
            body: 'School group contacts and logistics are stored so we can plan your visit and keep participants safe.'
          },
          {
            id: 'tools',
            title: 'Tools & Calculators',
            body: 'If you save a solar savings estimate, we store your inputs and email so we can send your results.'
          }
        ],
        contact_email: 'privacy@solar-awareness.example.org'
      };
      localStorage.setItem('privacy_content', JSON.stringify(privacy));
    }

    if (!localStorage.getItem('field_trips_info')) {
      const info = {
        overview_text: 'Bring your class or youth group for a hands-on solar field trip that aligns with science standards.',
        educational_objectives: [
          'Introduce basic concepts of solar energy and electricity.',
          'Explore real solar installations and monitoring equipment.',
          'Connect renewable energy to climate and community resilience.'
        ],
        group_size_limits: 'Typical field trips welcome groups of 10–30 students plus chaperones.',
        typical_schedule: 'Most visits last 90–120 minutes and include a site tour, interactive demo, and Q&A.',
        logistics: 'Bus parking is available by request. Space for lunch can be reserved when scheduling.',
        add_ons_description: 'Optional add-ons include pre-visit virtual sessions and follow-up classroom activities.'
      };
      localStorage.setItem('field_trips_info', JSON.stringify(info));
    }

    if (!localStorage.getItem('resource_tools')) {
      const tools = [
        {
          id: 'solar_savings_calculator',
          name: 'Solar Savings Calculator',
          description: 'Estimate your potential monthly savings and upfront costs for going solar.',
          slug: 'solar_savings_calculator'
        }
      ];
      localStorage.setItem('resource_tools', JSON.stringify(tools));
    }

    if (!localStorage.getItem('contact_topics')) {
      const topics = {
        message_types: [
          { value: 'general_question', label: 'General question' },
          { value: 'map_request', label: 'Map or wayfinding request' },
          { value: 'volunteer_question', label: 'Volunteer question' },
          { value: 'donation_question', label: 'Donation question' },
          { value: 'school_group_question', label: 'School or youth group question' },
          { value: 'other', label: 'Other' }
        ],
        default_subject: 'Message from Solar Awareness website'
      };
      localStorage.setItem('contact_topics', JSON.stringify(topics));
    }

    if (!localStorage.getItem('solar_calculator_config')) {
      const cfg = {
        default_zip_code: '30301',
        default_average_monthly_bill: 120,
        currency: 'USD',
        min_system_size_kw: 1,
        max_system_size_kw: 20,
        default_system_size_kw: 4,
        system_size_step_kw: 0.5,
        default_home_type: 'single_family_home',
        default_roof_orientation: 'mostly_south_facing',
        disclaimer_text: 'This calculator provides rough estimates only and is not a binding quote. Actual costs and savings may vary.'
      };
      localStorage.setItem('solar_calculator_config', JSON.stringify(cfg));
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
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

  _getOrCreateLocalState() {
    let state = this._getFromStorage('local_state', null);
    if (!state || typeof state !== 'object') {
      state = { personalScheduleId: null, readingListId: null };
      this._saveToStorage('local_state', state);
    }
    return state;
  }

  _setLocalState(state) {
    this._saveToStorage('local_state', state || {});
  }

  _formatDateLabel(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  }

  _formatTimeRange(startStr, endStr) {
    const start = new Date(startStr);
    const end = new Date(endStr);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return '';
    const opts = { hour: 'numeric', minute: '2-digit' };
    return (
      start.toLocaleTimeString('en-US', opts) +
      '  ' +
      end.toLocaleTimeString('en-US', opts)
    );
  }

  _formatDurationLabel(minutes) {
    if (typeof minutes !== 'number' || !isFinite(minutes)) return '';
    return minutes + ' minutes';
  }

  _formatPriceLabel(price, currency, isFree) {
    if (isFree) return 'Free';
    const p = Number(price || 0);
    const cur = currency || 'USD';
    const symbol = cur === 'USD' ? '$' : '';
    return symbol + p.toFixed(2) + ' per person';
  }

  _getDateOnlyISO(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    return d.toISOString().slice(0, 10);
  }

  _timeToMinutes(str) {
    if (!str) return null;
    const parts = str.split(':');
    if (parts.length < 2) return null;
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) || 0;
    if (isNaN(h) || isNaN(m)) return null;
    return h * 60 + m;
  }

  _dateToMinutesSinceMidnight(dateStr) {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;
    return d.getHours() * 60 + d.getMinutes();
  }

  _calculateEventConflicts(events) {
    // events: array of Event objects
    const conflictsMap = {};
    const sorted = (events || []).slice().sort((a, b) => {
      const as = new Date(a.start_datetime).getTime();
      const bs = new Date(b.start_datetime).getTime();
      return as - bs;
    });
    for (let i = 0; i < sorted.length; i++) {
      for (let j = i + 1; j < sorted.length; j++) {
        const e1 = sorted[i];
        const e2 = sorted[j];
        const start1 = new Date(e1.start_datetime).getTime();
        const end1 = new Date(e1.end_datetime).getTime();
        const start2 = new Date(e2.start_datetime).getTime();
        const end2 = new Date(e2.end_datetime).getTime();
        if (isNaN(start1) || isNaN(end1) || isNaN(start2) || isNaN(end2)) continue;
        if (start2 >= end1) break; // sorted by start time
        const overlap = start1 < end2 && start2 < end1;
        if (overlap) {
          if (!conflictsMap[e1.id]) conflictsMap[e1.id] = new Set();
          if (!conflictsMap[e2.id]) conflictsMap[e2.id] = new Set();
          conflictsMap[e1.id].add(e2.id);
          conflictsMap[e2.id].add(e1.id);
        }
      }
    }
    return Object.keys(conflictsMap).map((id) => ({
      event_id: id,
      conflicts_with: Array.from(conflictsMap[id])
    }));
  }

  _getOrCreatePersonalSchedule() {
    const state = this._getOrCreateLocalState();
    let schedules = this._getFromStorage('personal_schedules', []);
    let schedule = null;

    if (state.personalScheduleId) {
      schedule = schedules.find((s) => s.id === state.personalScheduleId) || null;
    }

    if (!schedule) {
      const now = new Date().toISOString();
      schedule = {
        id: this._generateId('psched'),
        name: 'My Schedule',
        created_at: now,
        updated_at: now
      };
      schedules.push(schedule);
      this._saveToStorage('personal_schedules', schedules);
      state.personalScheduleId = schedule.id;
      this._setLocalState(state);
    }

    return schedule;
  }

  _getOrCreateReadingList() {
    const state = this._getOrCreateLocalState();
    let lists = this._getFromStorage('reading_lists', []);
    let list = null;

    if (state.readingListId) {
      list = lists.find((l) => l.id === state.readingListId) || null;
    }

    if (!list) {
      const now = new Date().toISOString();
      list = {
        id: this._generateId('rlist'),
        name: 'My Reading List',
        created_at: now,
        updated_at: now
      };
      lists.push(list);
      this._saveToStorage('reading_lists', lists);
      state.readingListId = list.id;
      this._setLocalState(state);
    }

    return list;
  }

  _calculateSolarEstimateInternal(zipCode, averageMonthlyBill, currency, homeType, roofOrientation, systemSizeKw, panelCount) {
    // Simple, monotonic model: savings ~ system size, cost ~ system size
    const avgBill = Number(averageMonthlyBill || 0);
    let sizeKw = Number(systemSizeKw || 0);
    let pCount = Number(panelCount || 0);

    // Assume 0.4 kW per panel if size not provided
    if (!sizeKw && pCount) {
      sizeKw = pCount * 0.4;
    }
    if (!pCount && sizeKw) {
      pCount = Math.round(sizeKw / 0.4);
    }

    // Ensure reasonable bounds
    if (!sizeKw || sizeKw <= 0) sizeKw = 4;

    // Assumptions: each kW offsets ~25% of a $120 bill in this simple model.
    const savingsPerKw = avgBill > 0 ? avgBill * 0.25 : 30; // fallback ~30 $/kW
    let estimated_monthly_savings = savingsPerKw * sizeKw;

    // Do not allow savings to exceed the bill too much
    if (avgBill > 0) {
      const maxSavings = avgBill * 1.1;
      if (estimated_monthly_savings > maxSavings) {
        estimated_monthly_savings = maxSavings;
      }
    }

    // Cost model: ~2400 USD per kW
    const costPerKw = 2400;
    let estimated_upfront_cost = costPerKw * sizeKw;

    const assumptions_text =
      'Estimates assume average solar production for ZIP ' +
      (zipCode || '') +
      ', a simple flat-rate electricity tariff, and typical installed costs. Actual results may vary.';

    return {
      estimated_monthly_savings,
      estimated_upfront_cost,
      system_size_kw: sizeKw,
      panel_count: pCount || null,
      assumptions_text
    };
  }

  _ensureTourEventsFromRegistrations() {
    const events = this._getFromStorage('events', []);
    const registrations = this._getFromStorage('event_registrations', []);
    const existingIds = new Set(events.map((e) => e.id));
    let changed = false;

    registrations.forEach((reg) => {
      if (!reg || !reg.event_id) return;
      if (existingIds.has(reg.event_id)) return;
      // Only synthesize obvious tour-like events
      if (typeof reg.event_id === 'string' && reg.event_id.indexOf('evt_tour') !== 0) return;

      const start = reg.event_start_datetime || new Date().toISOString();
      const startDate = new Date(start);
      let end;
      if (!isNaN(startDate.getTime())) {
        const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000);
        end = endDate.toISOString();
      } else {
        end = start;
      }

      const price = typeof reg.price_per_person === 'number' ? reg.price_per_person : 0;

      const ev = {
        id: reg.event_id,
        title: reg.event_title || 'Solar Tour',
        description: '',
        event_type: 'tour',
        level: 'all_levels',
        is_program_session: false,
        track: 'Tours',
        topic_tags: ['tour'],
        start_datetime: start,
        end_datetime: end,
        duration_minutes: null,
        location_name: '',
        location_description: '',
        location_type: 'outdoor',
        capacity_total: null,
        price_per_person: price,
        currency: (reg.currency || 'USD'),
        is_free: price <= 0,
        time_of_day: null,
        status: 'scheduled',
        featured_order: null,
        capacity_remaining: null
      };

      events.push(ev);
      existingIds.add(ev.id);
      changed = true;
    });

    if (changed) {
      this._saveToStorage('events', events);
    }
  }

  // ------------------------
  // Interface implementations
  // ------------------------

  // getHomePageContent()
  getHomePageContent() {
    const stored = this._getFromStorage('home_page_content', null);
    const events = this._getFromStorage('events', []);

    let startDate = '';
    let endDate = '';

    if (events.length > 0) {
      const sortedByStart = events.slice().sort((a, b) => {
        return new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime();
      });
      const sortedByEnd = events.slice().sort((a, b) => {
        return new Date(a.end_datetime).getTime() - new Date(b.end_datetime).getTime();
      });
      startDate = this._getDateOnlyISO(sortedByStart[0].start_datetime);
      endDate = this._getDateOnlyISO(sortedByEnd[sortedByEnd.length - 1].end_datetime);
    }

    const result = stored || {};

    if (!result.event_start_date) result.event_start_date = startDate;
    if (!result.event_end_date) result.event_end_date = endDate;

    return {
      event_name: result.event_name || 'Solar Awareness Event',
      mission_text: result.mission_text || 'A nonprofit initiative to help our community learn about solar energy and clean power.',
      event_start_date: result.event_start_date || startDate,
      event_end_date: result.event_end_date || endDate,
      location_name: result.location_name || '',
      location_city: result.location_city || '',
      location_state: result.location_state || '',
      primary_cta_label: result.primary_cta_label || 'Explore Events',
      secondary_ctas: Array.isArray(result.secondary_ctas) ? result.secondary_ctas : []
    };
  }

  // getFeaturedEvents(limit)
  getFeaturedEvents(limit) {
    const lim = typeof limit === 'number' && limit > 0 ? limit : 6;
    const events = this._getFromStorage('events', []);
    const scheduled = events.filter((e) => e.status === 'scheduled');

    scheduled.sort((a, b) => {
      const fa = typeof a.featured_order === 'number' ? a.featured_order : Number.MAX_SAFE_INTEGER;
      const fb = typeof b.featured_order === 'number' ? b.featured_order : Number.MAX_SAFE_INTEGER;
      if (fa !== fb) return fa - fb;
      return new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime();
    });

    return scheduled.slice(0, lim);
  }

  // getEventFilterOptions()
  getEventFilterOptions() {
    const events = this._getFromStorage('events', []);
    const scheduled = events.filter((e) => e.status === 'scheduled');

    const dateSet = new Set();
    scheduled.forEach((e) => {
      const d = this._getDateOnlyISO(e.start_datetime);
      if (d) dateSet.add(d);
    });

    const dates = Array.from(dateSet)
      .sort()
      .map((d) => ({
        value: d,
        label: this._formatDateLabel(d)
      }));

    const eventTypesEnum = [
      'workshop',
      'tour',
      'session',
      'special_event',
      'panel_discussion',
      'keynote',
      'other'
    ];

    const event_types = eventTypesEnum.map((v) => ({
      value: v,
      label:
        v === 'panel_discussion'
          ? 'Panel discussion'
          : v === 'special_event'
          ? 'Special event'
          : v
              .split('_')
              .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
              .join(' ')
    }));

    const levelsEnum = [
      'beginner',
      'introductory',
      'intermediate',
      'advanced',
      'all_levels',
      'kids_family',
      'educator_training'
    ];

    const levels = levelsEnum.map((v) => ({
      value: v,
      label: v
        .split('_')
        .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
        .join(' ')
    }));

    const todEnum = ['morning', 'afternoon', 'evening', 'full_day', 'multi_day', 'unknown'];
    const time_of_day_options = todEnum.map((v) => ({
      value: v,
      label: v
        .split('_')
        .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
        .join(' ')
    }));

    let has_free_option = false;
    let has_paid_option = false;
    let maxPrice = 0;
    scheduled.forEach((e) => {
      if (e.is_free) has_free_option = true;
      if (!e.is_free && e.price_per_person > 0) has_paid_option = true;
      if (typeof e.price_per_person === 'number' && e.price_per_person > maxPrice) {
        maxPrice = e.price_per_person;
      }
    });

    const price_filters = {
      has_free_option,
      has_paid_option,
      suggested_max_price: maxPrice
    };

    const sort_options = [
      { value: 'start_time', label: 'Start time' },
      { value: 'price_low_to_high', label: 'Price: low to high' },
      { value: 'price_high_to_low', label: 'Price: high to low' },
      { value: 'relevance', label: 'Relevance' }
    ];

    return {
      dates,
      event_types,
      levels,
      time_of_day_options,
      price_filters,
      sort_options
    };
  }

  // searchEvents(date, filters, sort, page, page_size)
  searchEvents(date, filters, sort, page, page_size) {
    this._ensureTourEventsFromRegistrations();
    const events = this._getFromStorage('events', []);
    const scheduled = events.filter((e) => e.status === 'scheduled');

    let result = scheduled;

    if (date) {
      result = result.filter((e) => this._getDateOnlyISO(e.start_datetime) === date);
    }

    const f = filters || {};

    if (Array.isArray(f.event_types) && f.event_types.length > 0) {
      const set = new Set(f.event_types);
      result = result.filter((e) => set.has(e.event_type));
    }

    if (Array.isArray(f.levels) && f.levels.length > 0) {
      const set = new Set(f.levels);
      result = result.filter((e) => e.level && set.has(e.level));
    }

    if (f.time_of_day) {
      result = result.filter((e) => e.time_of_day === f.time_of_day);
    }

    if (f.start_time_at_or_after) {
      const minMinutes = this._timeToMinutes(f.start_time_at_or_after);
      if (minMinutes !== null) {
        result = result.filter((e) => {
          const m = this._dateToMinutesSinceMidnight(e.start_datetime);
          return m === null ? true : m >= minMinutes;
        });
      }
    }

    if (typeof f.max_duration_minutes === 'number') {
      result = result.filter((e) => {
        if (typeof e.duration_minutes !== 'number') return true;
        return e.duration_minutes <= f.max_duration_minutes;
      });
    }

    if (typeof f.is_free === 'boolean') {
      result = result.filter((e) => e.is_free === f.is_free);
    }

    if (f.paid_only) {
      result = result.filter((e) => !e.is_free && e.price_per_person > 0);
    }

    if (typeof f.max_price === 'number') {
      result = result.filter((e) => {
        if (typeof e.price_per_person !== 'number') return false;
        return e.price_per_person <= f.max_price;
      });
    }

    const sortMode = sort || 'start_time';

    if (sortMode === 'price_low_to_high') {
      result = result.slice().sort((a, b) => {
        return (a.price_per_person || 0) - (b.price_per_person || 0);
      });
    } else if (sortMode === 'price_high_to_low') {
      result = result.slice().sort((a, b) => {
        return (b.price_per_person || 0) - (a.price_per_person || 0);
      });
    } else {
      // default: start_time
      result = result.slice().sort((a, b) => {
        return new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime();
      });
    }

    const pg = typeof page === 'number' && page > 0 ? page : 1;
    const ps = typeof page_size === 'number' && page_size > 0 ? page_size : 20;
    const startIndex = (pg - 1) * ps;
    const endIndex = startIndex + ps;
    const paged = result.slice(startIndex, endIndex);

    return {
      events: paged,
      total_count: result.length,
      page: pg,
      page_size: ps,
      applied_sort: sortMode,
      applied_filters: {
        event_types: f.event_types || [],
        levels: f.levels || [],
        time_of_day: f.time_of_day || null,
        start_time_at_or_after: f.start_time_at_or_after || null,
        max_duration_minutes: typeof f.max_duration_minutes === 'number' ? f.max_duration_minutes : null,
        is_free: typeof f.is_free === 'boolean' ? f.is_free : null,
        paid_only: !!f.paid_only,
        max_price: typeof f.max_price === 'number' ? f.max_price : null
      }
    };
  }

  // getEventDetail(eventId)
  getEventDetail(eventId) {
    const events = this._getFromStorage('events', []);
    const event = events.find((e) => e.id === eventId) || null;
    if (!event) {
      return { event: null, display: null };
    }

    const date_label = this._formatDateLabel(event.start_datetime);
    const time_range_label = this._formatTimeRange(event.start_datetime, event.end_datetime);
    const duration_label = this._formatDurationLabel(event.duration_minutes);
    const price_label = this._formatPriceLabel(event.price_per_person, event.currency, event.is_free);
    const level_label = event.level
      ? event.level
          .split('_')
          .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
          .join(' ')
      : '';

    const location_label = event.location_name || event.location_description || '';

    const is_bookable = event.status === 'scheduled' && (event.capacity_remaining === null || event.capacity_remaining === undefined || event.capacity_remaining > 0);
    const can_add_to_schedule = !!event.is_program_session;

    return {
      event,
      display: {
        date_label,
        time_range_label,
        duration_label,
        price_label,
        level_label,
        location_label,
        is_bookable,
        can_add_to_schedule
      }
    };
  }

  // getEventRegistrationSummary(eventId)
  getEventRegistrationSummary(eventId) {
    const events = this._getFromStorage('events', []);
    const event = events.find((e) => e.id === eventId) || null;
    if (!event) {
      return {
        event: null,
        price_per_person: 0,
        currency: 'USD',
        capacity_remaining: 0,
        default_quantity: 1,
        display: {
          title: '',
          date_label: '',
          time_range_label: '',
          duration_label: '',
          price_label: ''
        }
      };
    }

    const date_label = this._formatDateLabel(event.start_datetime);
    const time_range_label = this._formatTimeRange(event.start_datetime, event.end_datetime);
    const duration_label = this._formatDurationLabel(event.duration_minutes);
    const price_label = this._formatPriceLabel(event.price_per_person, event.currency, event.is_free);

    return {
      event,
      price_per_person: event.price_per_person,
      currency: event.currency,
      capacity_remaining: typeof event.capacity_remaining === 'number' ? event.capacity_remaining : null,
      default_quantity: 1,
      display: {
        title: event.title,
        date_label,
        time_range_label,
        duration_label,
        price_label
      }
    };
  }

  // registerForEvent(eventId, registrationName, registrationEmail, quantity)
  registerForEvent(eventId, registrationName, registrationEmail, quantity) {
    const events = this._getFromStorage('events', []);
    const event = events.find((e) => e.id === eventId) || null;
    if (!event) {
      return { success: false, message: 'Event not found', registration: null, updated_capacity_remaining: null };
    }
    if (event.status !== 'scheduled') {
      return { success: false, message: 'Event is not open for registration', registration: null, updated_capacity_remaining: event.capacity_remaining };
    }

    const qty = typeof quantity === 'number' && quantity > 0 ? Math.floor(quantity) : 1;

    if (typeof event.capacity_remaining === 'number') {
      if (event.capacity_remaining <= 0 || event.capacity_remaining < qty) {
        return { success: false, message: 'Not enough capacity remaining', registration: null, updated_capacity_remaining: event.capacity_remaining };
      }
      event.capacity_remaining = event.capacity_remaining - qty;
      if (event.capacity_remaining <= 0) {
        event.capacity_remaining = 0;
        event.status = 'sold_out';
      }
    }

    const pricePerPerson = typeof event.price_per_person === 'number' ? event.price_per_person : 0;
    const totalCost = pricePerPerson * qty;

    const now = new Date().toISOString();
    const registration = {
      id: this._generateId('eventreg'),
      event_id: event.id,
      event_title: event.title,
      event_start_datetime: event.start_datetime,
      registration_name: registrationName,
      registration_email: registrationEmail,
      quantity: qty,
      price_per_person: pricePerPerson,
      total_cost: totalCost,
      status: 'pending',
      created_at: now
    };

    const registrations = this._getFromStorage('event_registrations', []);
    registrations.push(registration);
    this._saveToStorage('event_registrations', registrations);

    // Save updated event
    const idx = events.findIndex((e) => e.id === event.id);
    if (idx >= 0) {
      events[idx] = event;
      this._saveToStorage('events', events);
    }

    return {
      success: true,
      message: 'Registration submitted',
      registration,
      updated_capacity_remaining: typeof event.capacity_remaining === 'number' ? event.capacity_remaining : null
    };
  }

  // getScheduleFilterOptions()
  getScheduleFilterOptions() {
    const events = this._getFromStorage('events', []);
    const sessions = events.filter((e) => e.is_program_session && e.status === 'scheduled');

    const daySet = new Set();
    sessions.forEach((e) => {
      const d = this._getDateOnlyISO(e.start_datetime);
      if (d) daySet.add(d);
    });

    const days = Array.from(daySet)
      .sort()
      .map((d) => ({ value: d, label: this._formatDateLabel(d) }));

    const levelsEnum = [
      'beginner',
      'introductory',
      'intermediate',
      'advanced',
      'all_levels',
      'kids_family',
      'educator_training'
    ];

    const levels = levelsEnum.map((v) => ({
      value: v,
      label: v
        .split('_')
        .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
        .join(' ')
    }));

    const trackSet = new Set();
    const topicSet = new Set();
    sessions.forEach((e) => {
      if (e.track) trackSet.add(e.track);
      if (Array.isArray(e.topic_tags)) {
        e.topic_tags.forEach((t) => topicSet.add(t));
      }
    });

    const tracks = Array.from(trackSet).sort();
    const topics = Array.from(topicSet).sort();

    return {
      days,
      levels,
      tracks,
      topics
    };
  }

  // getScheduleSessions(day, filters)
  getScheduleSessions(day, filters) {
    const events = this._getFromStorage('events', []);
    const sessionsAll = events.filter((e) => e.is_program_session && e.status === 'scheduled');

    let sessions = sessionsAll.filter((e) => this._getDateOnlyISO(e.start_datetime) === day);
    const f = filters || {};

    if (Array.isArray(f.levels) && f.levels.length > 0) {
      const set = new Set(f.levels);
      sessions = sessions.filter((e) => e.level && set.has(e.level));
    }

    if (Array.isArray(f.tracks) && f.tracks.length > 0) {
      const set = new Set(f.tracks);
      sessions = sessions.filter((e) => e.track && set.has(e.track));
    }

    if (Array.isArray(f.topics) && f.topics.length > 0) {
      const reqTopics = new Set(f.topics);
      sessions = sessions.filter((e) => {
        if (!Array.isArray(e.topic_tags) || e.topic_tags.length === 0) return false;
        return e.topic_tags.some((t) => reqTopics.has(t));
      });
    }

    const conflicts = this._calculateEventConflicts(sessions);

    // my_schedule_event_ids for this day
    const personalSchedule = this._getOrCreatePersonalSchedule();
    const items = this._getFromStorage('personal_schedule_items', []);
    const myItems = items.filter((it) => it.personal_schedule_id === personalSchedule.id);
    const allEvents = events;

    const my_schedule_event_ids = [];
    myItems.forEach((it) => {
      const ev = allEvents.find((e) => e.id === it.event_id);
      if (ev && this._getDateOnlyISO(ev.start_datetime) === day) {
        my_schedule_event_ids.push(ev.id);
      }
    });

    return {
      sessions,
      conflicts,
      my_schedule_event_ids
    };
  }

  // addSessionToMySchedule(eventId)
  addSessionToMySchedule(eventId) {
    const events = this._getFromStorage('events', []);
    const event = events.find((e) => e.id === eventId) || null;
    if (!event) {
      return { success: false, message: 'Session not found', personal_schedule: null, added_item: null, conflicting_event_ids: [] };
    }
    if (!event.is_program_session) {
      return { success: false, message: 'Event is not a program session', personal_schedule: null, added_item: null, conflicting_event_ids: [] };
    }

    const personalSchedule = this._getOrCreatePersonalSchedule();
    const items = this._getFromStorage('personal_schedule_items', []);

    const existing = items.find(
      (it) => it.personal_schedule_id === personalSchedule.id && it.event_id === event.id
    );
    if (existing) {
      return {
        success: true,
        message: 'Session already in schedule',
        personal_schedule: personalSchedule,
        added_item: existing,
        conflicting_event_ids: []
      };
    }

    // Determine conflicts with existing schedule items
    const myItems = items.filter((it) => it.personal_schedule_id === personalSchedule.id);
    const myEvents = myItems
      .map((it) => events.find((e) => e.id === it.event_id))
      .filter((e) => !!e);

    const conflicts = [];
    const startNew = new Date(event.start_datetime).getTime();
    const endNew = new Date(event.end_datetime).getTime();

    myEvents.forEach((ev) => {
      const s = new Date(ev.start_datetime).getTime();
      const e = new Date(ev.end_datetime).getTime();
      if (!isNaN(s) && !isNaN(e) && !isNaN(startNew) && !isNaN(endNew)) {
        const overlap = startNew < e && s < endNew;
        if (overlap) conflicts.push(ev.id);
      }
    });

    const now = new Date().toISOString();
    const newItem = {
      id: this._generateId('psitem'),
      personal_schedule_id: personalSchedule.id,
      event_id: event.id,
      added_at: now
    };
    items.push(newItem);
    this._saveToStorage('personal_schedule_items', items);

    // Update schedule updated_at
    let schedules = this._getFromStorage('personal_schedules', []);
    const idx = schedules.findIndex((s) => s.id === personalSchedule.id);
    if (idx >= 0) {
      schedules[idx].updated_at = now;
      this._saveToStorage('personal_schedules', schedules);
    }

    return {
      success: true,
      message: 'Session added to schedule',
      personal_schedule: personalSchedule,
      added_item: newItem,
      conflicting_event_ids: conflicts
    };
  }

  // getMySchedule()
  getMySchedule() {
    const personalSchedule = this._getOrCreatePersonalSchedule();
    const items = this._getFromStorage('personal_schedule_items', []);
    const events = this._getFromStorage('events', []);

    const myItems = items.filter((it) => it.personal_schedule_id === personalSchedule.id);
    const entries = myItems.map((it) => ({
      item: it,
      event: events.find((e) => e.id === it.event_id) || null
    }));

    return {
      personal_schedule: personalSchedule,
      entries
    };
  }

  // getDonationCampaigns()
  getDonationCampaigns() {
    const campaigns = this._getFromStorage('donation_campaigns', []);
    return campaigns;
  }

  // submitDonation(campaignId, donationType, amount, currency, coverProcessingFees, paymentMethod, donorName, donorEmail, newsletterOptIn)
  submitDonation(campaignId, donationType, amount, currency, coverProcessingFees, paymentMethod, donorName, donorEmail, newsletterOptIn) {
    const campaigns = this._getFromStorage('donation_campaigns', []);
    const campaign = campaigns.find((c) => c.id === campaignId) || null;
    if (!campaign) {
      return { success: false, message: 'Campaign not found', donation: null };
    }

    const amt = Number(amount || 0);
    if (!amt || amt <= 0) {
      return { success: false, message: 'Invalid donation amount', donation: null };
    }

    const cur = currency || 'USD';
    const cover = !!coverProcessingFees;

    let processing_fee_amount = null;
    let total_with_fees = null;

    if (cover) {
      const fee = amt * 0.029 + 0.3;
      processing_fee_amount = Math.round(fee * 100) / 100;
      total_with_fees = Math.round((amt + processing_fee_amount) * 100) / 100;
    }

    const now = new Date().toISOString();
    const donation = {
      id: this._generateId('don'),
      campaign_id: campaign.id,
      campaign_name: campaign.name,
      amount: amt,
      currency: cur,
      donation_type: donationType,
      cover_processing_fees: cover,
      processing_fee_amount,
      total_with_fees,
      payment_method: paymentMethod,
      donor_name: donorName,
      donor_email: donorEmail,
      newsletter_opt_in: !!newsletterOptIn,
      status: 'pending',
      created_at: now
    };

    const donations = this._getFromStorage('donations', []);
    donations.push(donation);
    this._saveToStorage('donations', donations);

    return {
      success: true,
      message: 'Donation submitted',
      donation
    };
  }

  // getVolunteerFilterOptions()
  getVolunteerFilterOptions() {
    const shifts = this._getFromStorage('volunteer_shifts', []);

    const allDays = [
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
      'sunday'
    ];

    const days_of_week = allDays.map((d) => ({
      value: d,
      label: d.charAt(0).toUpperCase() + d.slice(1)
    }));

    const todEnum = ['morning', 'afternoon', 'evening', 'overnight'];
    const time_of_day_options = todEnum.map((v) => ({
      value: v,
      label: v.charAt(0).toUpperCase() + v.slice(1)
    }));

    const roleSet = new Set();
    shifts.forEach((s) => {
      if (Array.isArray(s.roles_available)) {
        s.roles_available.forEach((r) => roleSet.add(r));
      }
    });

    const roles = Array.from(roleSet).sort();

    return {
      days_of_week,
      time_of_day_options,
      roles
    };
  }

  // searchVolunteerShifts(dayOfWeek, timeOfDay, role, startTimeWindowStart, startTimeWindowEnd, minDurationMinutes)
  searchVolunteerShifts(dayOfWeek, timeOfDay, role, startTimeWindowStart, startTimeWindowEnd, minDurationMinutes) {
    const shifts = this._getFromStorage('volunteer_shifts', []);

    let result = shifts.filter((s) => s.is_active);

    if (dayOfWeek) {
      result = result.filter((s) => s.day_of_week === dayOfWeek);
    }

    if (timeOfDay) {
      result = result.filter((s) => s.time_of_day === timeOfDay);
    }

    if (role) {
      result = result.filter((s) => Array.isArray(s.roles_available) && s.roles_available.includes(role));
    }

    const minStart = this._timeToMinutes(startTimeWindowStart);
    const maxStart = this._timeToMinutes(startTimeWindowEnd);

    if (minStart !== null || maxStart !== null) {
      result = result.filter((s) => {
        const m = this._dateToMinutesSinceMidnight(s.start_datetime);
        if (m === null) return true;
        if (minStart !== null && m < minStart) return false;
        if (maxStart !== null && m > maxStart) return false;
        return true;
      });
    }

    if (typeof minDurationMinutes === 'number') {
      result = result.filter((s) => {
        if (typeof s.duration_minutes !== 'number') return true;
        return s.duration_minutes >= minDurationMinutes;
      });
    }

    return {
      shifts: result
    };
  }

  // getVolunteerShiftDetail(shiftId)
  getVolunteerShiftDetail(shiftId) {
    const shifts = this._getFromStorage('volunteer_shifts', []);
    const shift = shifts.find((s) => s.id === shiftId) || null;
    if (!shift) {
      return {
        shift: null,
        display: {
          date_label: '',
          time_range_label: '',
          duration_label: '',
          time_of_day_label: ''
        }
      };
    }

    const date_label = this._formatDateLabel(shift.start_datetime);
    const time_range_label = this._formatTimeRange(shift.start_datetime, shift.end_datetime);
    const duration_label = this._formatDurationLabel(shift.duration_minutes);
    const time_of_day_label = shift.time_of_day
      ? shift.time_of_day.charAt(0).toUpperCase() + shift.time_of_day.slice(1)
      : '';

    return {
      shift,
      display: {
        date_label,
        time_range_label,
        duration_label,
        time_of_day_label
      }
    };
  }

  // signupForVolunteerShift(shiftId, volunteerName, volunteerEmail, preferredRole)
  signupForVolunteerShift(shiftId, volunteerName, volunteerEmail, preferredRole) {
    const shifts = this._getFromStorage('volunteer_shifts', []);
    const shift = shifts.find((s) => s.id === shiftId) || null;
    if (!shift) {
      return { success: false, message: 'Shift not found', signup: null };
    }
    if (!shift.is_active) {
      return { success: false, message: 'Shift is not active', signup: null };
    }

    if (typeof shift.capacity_remaining === 'number') {
      if (shift.capacity_remaining <= 0) {
        return { success: false, message: 'Shift is full', signup: null };
      }
      shift.capacity_remaining = shift.capacity_remaining - 1;
      if (shift.capacity_remaining < 0) shift.capacity_remaining = 0;
    }

    const now = new Date().toISOString();
    const signup = {
      id: this._generateId('vsignup'),
      shift_id: shift.id,
      shift_title: shift.title,
      volunteer_name: volunteerName,
      volunteer_email: volunteerEmail,
      preferred_role: preferredRole || null,
      status: 'pending',
      created_at: now
    };

    const signups = this._getFromStorage('volunteer_signups', []);
    signups.push(signup);
    this._saveToStorage('volunteer_signups', signups);

    // Save updated shift
    const idx = shifts.findIndex((s) => s.id === shift.id);
    if (idx >= 0) {
      shifts[idx] = shift;
      this._saveToStorage('volunteer_shifts', shifts);
    }

    return {
      success: true,
      message: 'Volunteer signup submitted',
      signup
    };
  }

  // getSolarCalculatorConfig()
  getSolarCalculatorConfig() {
    const cfg = this._getFromStorage('solar_calculator_config', null);
    return cfg || {
      default_zip_code: '30301',
      default_average_monthly_bill: 120,
      currency: 'USD',
      min_system_size_kw: 1,
      max_system_size_kw: 20,
      default_system_size_kw: 4,
      system_size_step_kw: 0.5,
      default_home_type: 'single_family_home',
      default_roof_orientation: 'mostly_south_facing',
      disclaimer_text:
        'This calculator provides rough estimates only and is not a binding quote. Actual costs and savings may vary.'
    };
  }

  // calculateSolarEstimate(zipCode, averageMonthlyBill, currency, homeType, roofOrientation, systemSizeKw, panelCount)
  calculateSolarEstimate(zipCode, averageMonthlyBill, currency, homeType, roofOrientation, systemSizeKw, panelCount) {
    const cur = currency || 'USD';
    const res = this._calculateSolarEstimateInternal(
      zipCode,
      averageMonthlyBill,
      cur,
      homeType,
      roofOrientation,
      systemSizeKw,
      panelCount
    );

    return {
      estimated_monthly_savings: res.estimated_monthly_savings,
      estimated_upfront_cost: res.estimated_upfront_cost,
      system_size_kw: res.system_size_kw,
      panel_count: res.panel_count,
      assumptions_text: res.assumptions_text
    };
  }

  // saveSolarEstimate(zipCode, averageMonthlyBill, currency, homeType, roofOrientation, systemSizeKw, panelCount, estimatedMonthlySavings, estimatedUpfrontCost, name, email, notes)
  saveSolarEstimate(zipCode, averageMonthlyBill, currency, homeType, roofOrientation, systemSizeKw, panelCount, estimatedMonthlySavings, estimatedUpfrontCost, name, email, notes) {
    const cur = currency || 'USD';
    const now = new Date().toISOString();

    const estimate = {
      id: this._generateId('sest'),
      zip_code: zipCode,
      average_monthly_bill: Number(averageMonthlyBill || 0),
      currency: cur,
      home_type: homeType,
      roof_orientation: roofOrientation || null,
      system_size_kw: systemSizeKw || null,
      panel_count: panelCount || null,
      estimated_monthly_savings: Number(estimatedMonthlySavings || 0),
      estimated_upfront_cost: Number(estimatedUpfrontCost || 0),
      name,
      email,
      created_at: now,
      notes: notes || null
    };

    const estimates = this._getFromStorage('solar_estimates', []);
    estimates.push(estimate);
    this._saveToStorage('solar_estimates', estimates);

    return {
      success: true,
      message: 'Estimate saved',
      estimate
    };
  }

  // getArticleFilterOptions()
  getArticleFilterOptions() {
    const articles = this._getFromStorage('articles', []);

    const contentTypesEnum = ['article', 'guide', 'tool'];
    const content_types = contentTypesEnum.map((v) => ({
      value: v,
      label: v.charAt(0).toUpperCase() + v.slice(1)
    }));

    const audiencesEnum = ['homeowners', 'renters', 'educators', 'installers', 'policy_makers', 'general_public'];
    const audiences = audiencesEnum.map((v) => ({
      value: v,
      label: v
        .split('_')
        .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
        .join(' ')
    }));

    const topicSet = new Set();
    const yearSet = new Set();

    articles.forEach((a) => {
      if (Array.isArray(a.topics)) {
        a.topics.forEach((t) => topicSet.add(t));
      }
      if (typeof a.year === 'number') {
        yearSet.add(a.year);
      }
    });

    const topics = Array.from(topicSet).sort();
    const years = Array.from(yearSet).sort((a, b) => a - b);

    return {
      content_types,
      audiences,
      topics,
      years
    };
  }

  // searchArticles(contentType, audience, topics, startYear, endYear, sort)
  searchArticles(contentType, audience, topics, startYear, endYear, sort) {
    const articles = this._getFromStorage('articles', []);

    let result = articles;
    if (contentType) {
      result = result.filter((a) => a.content_type === contentType);
    }
    if (audience) {
      result = result.filter((a) => a.primary_audience === audience);
    }
    if (Array.isArray(topics) && topics.length > 0) {
      const req = new Set(topics);
      result = result.filter((a) => Array.isArray(a.topics) && a.topics.some((t) => req.has(t)));
    }
    if (typeof startYear === 'number') {
      result = result.filter((a) => typeof a.year === 'number' && a.year >= startYear);
    }
    if (typeof endYear === 'number') {
      result = result.filter((a) => typeof a.year === 'number' && a.year <= endYear);
    }

    const mode = sort || 'newest_first';

    if (mode === 'oldest_first') {
      result = result.slice().sort((a, b) => {
        const t1 = new Date(a.publication_date).getTime();
        const t2 = new Date(b.publication_date).getTime();
        return t1 - t2;
      });
    } else {
      // newest_first or relevance fallback
      result = result.slice().sort((a, b) => {
        const t1 = new Date(a.publication_date).getTime();
        const t2 = new Date(b.publication_date).getTime();
        return t2 - t1;
      });
    }

    return {
      articles: result,
      total_count: result.length
    };
  }

  // getArticleDetail(articleId)
  getArticleDetail(articleId) {
    const articles = this._getFromStorage('articles', []);
    const article = articles.find((a) => a.id === articleId) || null;

    if (!article) {
      return {
        article: null,
        is_in_reading_list: false,
        related_articles: []
      };
    }

    const readingList = this._getOrCreateReadingList();
    const items = this._getFromStorage('reading_list_items', []);
    const myItems = items.filter((it) => it.reading_list_id === readingList.id);
    const is_in_reading_list = myItems.some((it) => it.article_id === article.id);

    // Simple related articles: same primary audience, different id
    const related = articles
      .filter((a) => a.id !== article.id && a.primary_audience === article.primary_audience)
      .slice(0, 3);

    return {
      article,
      is_in_reading_list,
      related_articles: related
    };
  }

  // addArticleToReadingList(articleId)
  addArticleToReadingList(articleId) {
    const readingList = this._getOrCreateReadingList();
    const items = this._getFromStorage('reading_list_items', []);

    let existing = items.find(
      (it) => it.reading_list_id === readingList.id && it.article_id === articleId
    );

    if (existing) {
      return {
        success: true,
        message: 'Article already in reading list',
        reading_list: readingList,
        added_item: existing
      };
    }

    const now = new Date().toISOString();
    const newItem = {
      id: this._generateId('rlitem'),
      reading_list_id: readingList.id,
      article_id: articleId,
      added_at: now
    };

    items.push(newItem);
    this._saveToStorage('reading_list_items', items);

    // Update reading list updated_at
    let lists = this._getFromStorage('reading_lists', []);
    const idx = lists.findIndex((l) => l.id === readingList.id);
    if (idx >= 0) {
      lists[idx].updated_at = now;
      this._saveToStorage('reading_lists', lists);
    }

    return {
      success: true,
      message: 'Article added to reading list',
      reading_list: readingList,
      added_item: newItem
    };
  }

  // getReadingList()
  getReadingList() {
    const readingList = this._getOrCreateReadingList();
    const items = this._getFromStorage('reading_list_items', []);
    const articles = this._getFromStorage('articles', []);

    const myItems = items.filter((it) => it.reading_list_id === readingList.id);

    const listItems = myItems.map((it) => ({
      item: it,
      article: articles.find((a) => a.id === it.article_id) || null
    }));

    return {
      reading_list: readingList,
      items: listItems
    };
  }

  // getFieldTripsInfo()
  getFieldTripsInfo() {
    const info = this._getFromStorage('field_trips_info', null);
    return (
      info || {
        overview_text: '',
        educational_objectives: [],
        group_size_limits: '',
        typical_schedule: '',
        logistics: '',
        add_ons_description: ''
      }
    );
  }

  // getAvailableFieldTripSlots(startDate, endDate, dayOfWeek)
  getAvailableFieldTripSlots(startDate, endDate, dayOfWeek) {
    const slots = this._getFromStorage('field_trip_slots', []);

    let result = slots.filter((s) => s.is_available);

    if (dayOfWeek) {
      result = result.filter((s) => s.day_of_week === dayOfWeek);
    }

    if (startDate) {
      result = result.filter((s) => {
        const d = this._getDateOnlyISO(s.date || s.start_datetime);
        return d >= startDate;
      });
    }

    if (endDate) {
      result = result.filter((s) => {
        const d = this._getDateOnlyISO(s.date || s.start_datetime);
        return d <= endDate;
      });
    }

    return {
      slots: result
    };
  }

  // getFieldTripSlotDetail(slotId)
  getFieldTripSlotDetail(slotId) {
    const slots = this._getFromStorage('field_trip_slots', []);
    const slot = slots.find((s) => s.id === slotId) || null;
    if (!slot) {
      return {
        slot: null,
        display: {
          date_label: '',
          time_range_label: '',
          capacity_label: ''
        }
      };
    }

    const date_label = this._formatDateLabel(slot.start_datetime || slot.date);
    const time_range_label = this._formatTimeRange(slot.start_datetime, slot.end_datetime);
    let capacity_label = '';
    if (typeof slot.capacity_total === 'number') {
      const remaining = typeof slot.capacity_remaining === 'number' ? slot.capacity_remaining : null;
      if (remaining !== null) {
        capacity_label = remaining + ' of ' + slot.capacity_total + ' spots remaining';
      } else {
        capacity_label = slot.capacity_total + ' spots total';
      }
    }

    return {
      slot,
      display: {
        date_label,
        time_range_label,
        capacity_label
      }
    };
  }

  // submitFieldTripRequest(slotId, numStudents, gradeLevel, numChaperones, busParkingRequired, lunchNeeded, preVisitVirtualSession, contactName, contactEmail, notes)
  submitFieldTripRequest(slotId, numStudents, gradeLevel, numChaperones, busParkingRequired, lunchNeeded, preVisitVirtualSession, contactName, contactEmail, notes) {
    const slots = this._getFromStorage('field_trip_slots', []);
    const slot = slots.find((s) => s.id === slotId) || null;
    if (!slot) {
      return { success: false, message: 'Field trip slot not found', request: null };
    }
    if (!slot.is_available) {
      return { success: false, message: 'Field trip slot is not available', request: null };
    }

    const students = Number(numStudents || 0);
    if (!students || students <= 0) {
      return { success: false, message: 'Invalid number of students', request: null };
    }

    if (typeof slot.capacity_remaining === 'number') {
      if (slot.capacity_remaining <= 0 || slot.capacity_remaining < students) {
        return { success: false, message: 'Not enough capacity for this slot', request: null };
      }
      slot.capacity_remaining = slot.capacity_remaining - students;
      if (slot.capacity_remaining <= 0) {
        slot.capacity_remaining = 0;
        slot.is_available = false;
      }
    }

    const now = new Date().toISOString();
    const request = {
      id: this._generateId('ftripreq'),
      slot_id: slot.id,
      requested_date: slot.date || slot.start_datetime,
      requested_start_datetime: slot.start_datetime,
      requested_end_datetime: slot.end_datetime,
      num_students: students,
      grade_level: gradeLevel,
      num_chaperones: typeof numChaperones === 'number' ? numChaperones : null,
      bus_parking_required: !!busParkingRequired,
      lunch_needed: !!lunchNeeded,
      pre_visit_virtual_session: !!preVisitVirtualSession,
      contact_name: contactName,
      contact_email: contactEmail,
      status: 'pending',
      created_at: now,
      notes: notes || null
    };

    const requests = this._getFromStorage('field_trip_requests', []);
    requests.push(request);
    this._saveToStorage('field_trip_requests', requests);

    // Save updated slot
    const idx = slots.findIndex((s) => s.id === slot.id);
    if (idx >= 0) {
      slots[idx] = slot;
      this._saveToStorage('field_trip_slots', slots);
    }

    return {
      success: true,
      message: 'Field trip request submitted',
      request
    };
  }

  // getExhibitorFilterOptions()
  getExhibitorFilterOptions() {
    const categoriesEnum = [
      'solar_installer',
      'nonprofit',
      'manufacturer',
      'utility',
      'government_agency',
      'sponsor',
      'other'
    ];

    const categories = categoriesEnum.map((v) => ({
      value: v,
      label: v
        .split('_')
        .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
        .join(' ')
    }));

    return {
      categories,
      default_radius_miles: 25
    };
  }

  // searchExhibitors(category, zipCode, radiusMiles, sort)
  searchExhibitors(category, zipCode, radiusMiles, sort) {
    const exhibitors = this._getFromStorage('exhibitors', []);

    let result = exhibitors;
    if (category) {
      result = result.filter((e) => e.category === category);
    }

    if (zipCode) {
      // If zipCode is provided and we have exhibitor.zip_code, prefer exact match
      const withZip = result.filter((e) => e.zip_code === zipCode);
      if (withZip.length > 0) {
        result = withZip;
      }
    }

    if (typeof radiusMiles === 'number') {
      result = result.filter((e) => {
        if (typeof e.distance_miles_from_event !== 'number') return true;
        return e.distance_miles_from_event <= radiusMiles;
      });
    }

    const mode = sort || 'name';
    if (mode === 'distance') {
      result = result.slice().sort((a, b) => {
        const da = typeof a.distance_miles_from_event === 'number' ? a.distance_miles_from_event : Number.MAX_SAFE_INTEGER;
        const db = typeof b.distance_miles_from_event === 'number' ? b.distance_miles_from_event : Number.MAX_SAFE_INTEGER;
        return da - db;
      });
    } else {
      result = result.slice().sort((a, b) => {
        const na = (a.name || '').toLowerCase();
        const nb = (b.name || '').toLowerCase();
        if (na < nb) return -1;
        if (na > nb) return 1;
        return 0;
      });
    }

    return {
      exhibitors: result
    };
  }

  // getExhibitorDetail(exhibitorId)
  getExhibitorDetail(exhibitorId) {
    const exhibitors = this._getFromStorage('exhibitors', []);
    const exhibitor = exhibitors.find((e) => e.id === exhibitorId) || null;
    return { exhibitor };
  }

  // getResourceTools()
  getResourceTools() {
    const tools = this._getFromStorage('resource_tools', []);
    return tools;
  }

  // getContactTopics()
  getContactTopics() {
    const topics = this._getFromStorage('contact_topics', null);
    return (
      topics || {
        message_types: [],
        default_subject: ''
      }
    );
  }

  // sendContactMessage(name, email, subject, message, messageType)
  sendContactMessage(name, email, subject, message, messageType) {
    const now = new Date().toISOString();
    const msg = {
      id: this._generateId('cmsg'),
      name,
      email,
      subject: subject || null,
      message,
      message_type: messageType || 'other',
      status: 'received',
      created_at: now
    };

    const messages = this._getFromStorage('contact_messages', []);
    messages.push(msg);
    this._saveToStorage('contact_messages', messages);

    return {
      success: true,
      confirmation_message: 'Thank you for your message. We will get back to you soon.',
      contact_message: msg
    };
  }

  // getAboutPageContent()
  getAboutPageContent() {
    const about = this._getFromStorage('about_page_content', null);
    return (
      about || {
        mission: '',
        goals: [],
        youth_solar_education_section: '',
        program_areas: []
      }
    );
  }

  // getPrivacyContent()
  getPrivacyContent() {
    const privacy = this._getFromStorage('privacy_content', null);
    return (
      privacy || {
        sections: [],
        contact_email: ''
      }
    );
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
