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
  }

  // ----------------------
  // Storage helpers
  // ----------------------

  _initStorage() {
    // Initialize all data tables in localStorage if not exist
    const tableKeys = [
      'events',
      'event_days',
      'tickets',
      'registrations',
      'attendees',
      'promo_codes',
      'payments',
      'sessions',
      'personal_agenda_items',
      'speakers',
      'session_speakers',
      'followed_speakers',
      'reminder_subscriptions',
      'resources',
      'saved_resources',
      'faq_items',
      'refund_policies',
      'contact_form_submissions'
    ];

    tableKeys.forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    });

    // Single-object configs (empty by default, no mock content)
    const objectKeys = [
      'organizer_info',
      'contact_support_info',
      'privacy_policy_content',
      'terms_and_conditions_content',
      'accessibility_info_content'
    ];

    objectKeys.forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify({}));
      }
    });

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

  _nowIso() {
    return new Date().toISOString();
  }

  // ----------------------
  // Internal helpers (private)
  // ----------------------

  _getCurrentEvent() {
    const events = this._getFromStorage('events', []);
    if (!events.length) return null;

    const now = new Date();
    let current = null;

    for (const ev of events) {
      if (!ev.start_date || !ev.end_date) continue;
      const start = new Date(ev.start_date);
      const end = new Date(ev.end_date);
      if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
        if (start <= now && now <= end) {
          if (!current || new Date(current.start_date) > start) {
            current = ev;
          }
        }
      }
    }

    if (!current) {
      current = events[0];
    }
    return current;
  }

  _getOrCreatePersonalAgendaStore() {
    let items = this._getFromStorage('personal_agenda_items', null);
    if (!Array.isArray(items)) {
      items = [];
      this._saveToStorage('personal_agenda_items', items);
    }
    return items;
  }

  _getOrCreateReadingListStore() {
    let items = this._getFromStorage('saved_resources', null);
    if (!Array.isArray(items)) {
      items = [];
      this._saveToStorage('saved_resources', items);
    }
    return items;
  }

  _getOrCreateFollowedSpeakersStore() {
    let items = this._getFromStorage('followed_speakers', null);
    if (!Array.isArray(items)) {
      items = [];
      this._saveToStorage('followed_speakers', items);
    }
    return items;
  }

  _getOrCreateReminderSubscriptionStore() {
    let items = this._getFromStorage('reminder_subscriptions', null);
    if (!Array.isArray(items)) {
      items = [];
      this._saveToStorage('reminder_subscriptions', items);
    }
    return items;
  }

  _getTimezoneLabel(tz) {
    switch (tz) {
      case 'et':
        return 'Eastern Time (ET)';
      case 'pt':
        return 'Pacific Time (PT)';
      case 'utc':
        return 'Coordinated Universal Time (UTC)';
      case 'gmt':
        return 'Greenwich Mean Time (GMT)';
      case 'cet':
        return 'Central European Time (CET)';
      default:
        return tz || '';
    }
  }

  _getTimezoneIana(tz) {
    switch (tz) {
      case 'et':
        return 'America/New_York';
      case 'pt':
        return 'America/Los_Angeles';
      case 'utc':
        return 'UTC';
      case 'gmt':
        return 'Etc/GMT';
      case 'cet':
        return 'Europe/Berlin';
      default:
        return 'UTC';
    }
  }

  _formatTimeLabel(isoString, timezoneCode) {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return '';
      const tz = this._getTimezoneIana(timezoneCode || 'utc');
      return d.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        timeZone: tz
      });
    } catch (e) {
      return '';
    }
  }

  _formatSessionTimeRange(isoString, durationMinutes, timezoneCode) {
    const startLabel = this._formatTimeLabel(isoString, timezoneCode);
    let endLabel = '';
    if (isoString && typeof durationMinutes === 'number') {
      try {
        const start = new Date(isoString);
        if (!isNaN(start.getTime())) {
          const end = new Date(start.getTime() + durationMinutes * 60000);
          const tz = this._getTimezoneIana(timezoneCode || 'utc');
          endLabel = end.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            timeZone: tz
          });
        }
      } catch (e) {
        endLabel = '';
      }
    }
    return { startLabel, endLabel };
  }

  _applyPromoCodeToPrice(ticket, promo) {
    if (!ticket || !promo) {
      return {
        is_valid: false,
        discount_amount_usd: 0,
        new_total_usd: ticket ? ticket.price_usd : 0,
        message: 'Promo code or ticket not found.'
      };
    }

    const now = new Date();

    if (!promo.is_active) {
      return {
        is_valid: false,
        discount_amount_usd: 0,
        new_total_usd: ticket.price_usd,
        message: 'Promo code is not active.'
      };
    }

    if (promo.valid_from) {
      const from = new Date(promo.valid_from);
      if (!isNaN(from.getTime()) && from > now) {
        return {
          is_valid: false,
          discount_amount_usd: 0,
          new_total_usd: ticket.price_usd,
          message: 'Promo code is not yet valid.'
        };
      }
    }

    if (promo.valid_to) {
      const to = new Date(promo.valid_to);
      if (!isNaN(to.getTime()) && to < now) {
        return {
          is_valid: false,
          discount_amount_usd: 0,
          new_total_usd: ticket.price_usd,
          message: 'Promo code has expired.'
        };
      }
    }

    if (typeof promo.min_ticket_price_usd === 'number' && ticket.price_usd < promo.min_ticket_price_usd) {
      return {
        is_valid: false,
        discount_amount_usd: 0,
        new_total_usd: ticket.price_usd,
        message: 'Ticket price does not meet minimum for this promo.'
      };
    }

    if (Array.isArray(promo.applicable_ticket_tiers) && promo.applicable_ticket_tiers.length > 0) {
      if (!promo.applicable_ticket_tiers.includes(ticket.tier)) {
        return {
          is_valid: false,
          discount_amount_usd: 0,
          new_total_usd: ticket.price_usd,
          message: 'Promo code is not applicable to this ticket tier.'
        };
      }
    }

    let discount = 0;
    if (promo.discount_type === 'percentage') {
      discount = (ticket.price_usd * promo.discount_value) / 100;
    } else if (promo.discount_type === 'fixed_amount') {
      discount = promo.discount_value;
    }

    if (discount < 0) discount = 0;
    if (discount > ticket.price_usd) discount = ticket.price_usd;

    const newTotal = ticket.price_usd - discount;

    return {
      is_valid: true,
      discount_amount_usd: discount,
      new_total_usd: newTotal,
      message: 'Promo code applied successfully.'
    };
  }

  // ----------------------
  // Interface implementations
  // ----------------------

  // getCurrentEventOverview
  getCurrentEventOverview() {
    const event = this._getCurrentEvent();
    if (!event) {
      return { event: null };
    }

    const start = event.start_date ? new Date(event.start_date) : null;
    const end = event.end_date ? new Date(event.end_date) : null;

    let date_range_label = '';
       if (start && end && !isNaN(start.getTime()) && !isNaN(end.getTime())) {
      const startStr = start.toISOString().slice(0, 10);
      const endStr = end.toISOString().slice(0, 10);
      date_range_label = startStr + ' – ' + endStr;
    }

    let time_range_label = '';
    if (start && end && !isNaN(start.getTime()) && !isNaN(end.getTime())) {
      const startStr = start.toISOString().slice(11, 16);
      const endStr = end.toISOString().slice(11, 16);
      time_range_label = startStr + ' – ' + endStr;
    }

    const default_timezone_label = this._getTimezoneLabel(event.default_timezone);

    const eventDays = this._getFromStorage('event_days', []);
    const mainDay = event.main_conference_day_id
      ? eventDays.find((d) => d.id === event.main_conference_day_id) || null
      : null;

    return {
      event: {
        ...event,
        date_range_label,
        time_range_label,
        default_timezone_label,
        key_value_propositions: Array.isArray(event.key_value_propositions)
          ? event.key_value_propositions
          : [],
        main_conference_day: mainDay
      }
    };
  }

  // getTicketOptionsForCurrentEvent
  getTicketOptionsForCurrentEvent() {
    const event = this._getCurrentEvent();
    if (!event) return [];

    const tickets = this._getFromStorage('tickets', []);
    const eventTickets = tickets.filter(
      (t) => t.event_id === event.id && t.is_active
    );

    return eventTickets
      .sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
      .map((t) => {
        const perSeat = t.included_seat_count
          ? t.price_usd / t.included_seat_count
          : t.price_usd;
        const includes_recordings_label = t.includes_recordings
          ? 'Session recordings included'
          : 'Live access only';
        const refundable_label = t.is_refundable
          ? t.max_refund_days_before_event
            ? 'Refundable up to ' + t.max_refund_days_before_event + ' days before event'
            : 'Refundable ticket'
          : 'Non-refundable ticket';

        const price_display_label = '$' + t.price_usd.toFixed(2) + ' USD';
        const per_seat_price_label = '$' + perSeat.toFixed(2) + ' per seat';

        return {
          id: t.id,
          name: t.name,
          short_label: t.short_label || '',
          description: t.description || '',
          tier: t.tier,
          type: t.type,
          price_usd: t.price_usd,
          price_display_label,
          currency: t.currency,
          includes_recordings: t.includes_recordings,
          includes_recordings_label,
          is_refundable: t.is_refundable,
          refundable_label,
          max_refund_days_before_event: t.max_refund_days_before_event,
          included_seat_count: t.included_seat_count,
          min_attendees: t.min_attendees,
          max_attendees: t.max_attendees,
          per_seat_price_usd: perSeat,
          per_seat_price_label,
          benefits: Array.isArray(t.benefits) ? t.benefits : [],
          is_active: t.is_active,
          display_order: t.display_order,
          is_team_ticket: t.type === 'team',
          recordings_icon_hint: t.includes_recordings
            ? 'Includes session recordings'
            : 'Does not include recordings',
          refund_policy_hint: refundable_label,
          // Foreign key resolution
          event: event
        };
      });
  }

  // getAgendaSummaryForLanding
  getAgendaSummaryForLanding() {
    const event = this._getCurrentEvent();
    if (!event) {
      return {
        summary_text: '',
        highlight_sessions: []
      };
    }

    const sessions = this._getFromStorage('sessions', []);
    const eventDays = this._getFromStorage('event_days', []);
    const eventSessions = sessions.filter((s) => s.event_id === event.id);

    if (!eventSessions.length) {
      return {
        summary_text: '',
        highlight_sessions: []
      };
    }

    const sorted = eventSessions.slice().sort((a, b) => {
      const da = new Date(a.start_datetime || 0).getTime();
      const db = new Date(b.start_datetime || 0).getTime();
      return da - db;
    });

    const highlight = sorted.slice(0, 3).map((s) => {
      const day = eventDays.find((d) => d.id === s.event_day_id) || null;
      const timeLabel = this._formatTimeLabel(
        s.start_datetime,
        event.default_timezone || 'utc'
      );
      return {
        session_id: s.id,
        title: s.title,
        start_datetime: s.start_datetime,
        start_time_label: timeLabel,
        event_day_label: day ? day.label : '',
        topic_tags: Array.isArray(s.topic_tags) ? s.topic_tags : [],
        is_main_conference_day: !!s.is_main_conference_day,
        // Foreign key resolution
        session: s,
        event_day: day
      };
    });

    const uniqueDayIds = new Set(eventSessions.map((s) => s.event_day_id));
    const summary_text =
      eventSessions.length +
      ' sessions across ' +
      uniqueDayIds.size +
      ' day' +
      (uniqueDayIds.size === 1 ? '' : 's');

    return {
      summary_text,
      highlight_sessions: highlight
    };
  }

  // getSpeakerTeasersForLanding
  getSpeakerTeasersForLanding(limit) {
    const speakers = this._getFromStorage('speakers', []);
    const max = typeof limit === 'number' && limit > 0 ? limit : 4;

    const featured = speakers
      .filter((s) => s.is_featured)
      .sort((a, b) => (b.popularity_score || 0) - (a.popularity_score || 0));

    const list = featured.length >= max
      ? featured.slice(0, max)
      : speakers
          .slice()
          .sort((a, b) => (b.popularity_score || 0) - (a.popularity_score || 0))
          .slice(0, max);

    return list.map((s) => ({
      speaker_id: s.id,
      name: s.name,
      job_title: s.job_title || '',
      company: s.company || '',
      profile_photo_url: s.profile_photo_url || '',
      topic_tags: Array.isArray(s.topic_tags) ? s.topic_tags : [],
      is_featured: !!s.is_featured,
      // Foreign key resolution
      speaker: s
    }));
  }

  // getReminderOptionsForEvent
  getReminderOptionsForEvent() {
    return {
      email_timings: [
        { value: 'one_week_before', label: '1 week before', is_recommended: false },
        { value: 'one_day_before', label: '1 day before', is_recommended: true }
      ],
      sms_timings: [
        { value: 'one_day_before', label: '1 day before', is_recommended: false },
        { value: 'one_hour_before', label: '1 hour before', is_recommended: true }
      ],
      sms_consent_text:
        'By opting in, you agree to receive SMS reminders about this event. Message and data rates may apply.',
      privacy_policy_snippet:
        'We respect your privacy. Your contact details will only be used for event communications as described in our privacy policy.'
    };
  }

  // subscribeToEmailReminder
  subscribeToEmailReminder(email, reminder_timing, source_section_label) {
    const event = this._getCurrentEvent();
    if (!event) {
      return {
        success: false,
        subscription_id: null,
        message: 'No current event found.'
      };
    }

    const timing = reminder_timing || 'one_day_before';
    const source = source_section_label || 'get_reminders_section';

    const store = this._getOrCreateReminderSubscriptionStore();
    const id = this._generateId('reminder');

    const subscription = {
      id,
      channel: 'email',
      destination: email,
      reminder_timing: timing,
      event_id: event.id,
      sms_consent_accepted: false,
      source_section_label: source,
      created_at: this._nowIso()
    };

    store.push(subscription);
    this._saveToStorage('reminder_subscriptions', store);

    return {
      success: true,
      subscription_id: id,
      message: 'Email reminder subscription saved.'
    };
  }

  // subscribeToSmsReminder
  subscribeToSmsReminder(phone_number, reminder_timing, sms_consent_accepted, source_section_label) {
    const event = this._getCurrentEvent();
    if (!event) {
      return {
        success: false,
        subscription_id: null,
        message: 'No current event found.'
      };
    }

    if (!sms_consent_accepted) {
      return {
        success: false,
        subscription_id: null,
        message: 'SMS consent must be accepted.'
      };
    }

    const timing = reminder_timing || 'one_hour_before';
    const source = source_section_label || 'get_reminders_section';

    const store = this._getOrCreateReminderSubscriptionStore();
    const id = this._generateId('reminder');

    const subscription = {
      id,
      channel: 'sms',
      destination: phone_number,
      reminder_timing: timing,
      event_id: event.id,
      sms_consent_accepted: !!sms_consent_accepted,
      source_section_label: source,
      created_at: this._nowIso()
    };

    store.push(subscription);
    this._saveToStorage('reminder_subscriptions', store);

    return {
      success: true,
      subscription_id: id,
      message: 'SMS reminder subscription saved.'
    };
  }

  // getFAQItemsForEvent
  getFAQItemsForEvent(category) {
    const event = this._getCurrentEvent();
    if (!event) return [];

    const faqs = this._getFromStorage('faq_items', []);
    const filtered = faqs
      .filter((f) => f.event_id === event.id)
      .filter((f) => {
        if (!category) return true;
        return f.category === category;
      })
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

    return filtered.map((f) => {
      const isRefundRelated =
        f.category === 'refunds' ||
        /refund/i.test(f.question || '') ||
        /refund/i.test(f.answer || '');

      return {
        id: f.id,
        question: f.question,
        answer: f.answer,
        category: f.category,
        sort_order: f.sort_order,
        is_expanded_by_default: !!f.is_expanded_by_default,
        is_refund_related: isRefundRelated
      };
    });
  }

  // getResourcePreviewForLanding
  getResourcePreviewForLanding(limit) {
    const max = typeof limit === 'number' && limit > 0 ? limit : 3;
    const resources = this._getFromStorage('resources', []);
    const saved = this._getOrCreateReadingListStore();
    const savedIds = new Set(saved.map((r) => r.resource_id));

    const preEvent = resources.filter((r) => r.is_pre_event);

    const sorted = preEvent
      .slice()
      .sort((a, b) => {
        if (a.is_featured && !b.is_featured) return -1;
        if (!a.is_featured && b.is_featured) return 1;
        return (a.reading_time_minutes || 0) - (b.reading_time_minutes || 0);
      })
      .slice(0, max);

    const res = sorted.map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description || '',
      topic_tags: Array.isArray(r.topic_tags) ? r.topic_tags : [],
      content_type: r.content_type,
      reading_time_minutes: r.reading_time_minutes,
      estimated_reading_time_label:
        r.estimated_reading_time_label ||
        (typeof r.reading_time_minutes === 'number'
          ? r.reading_time_minutes + ' min read'
          : ''),
      is_pre_event: !!r.is_pre_event,
      is_featured: !!r.is_featured,
      is_saved: savedIds.has(r.id)
    }));

    return {
      resources: res,
      saved_resources_count: saved.length
    };
  }

  // getAgendaConfigForEvent
  getAgendaConfigForEvent() {
    const event = this._getCurrentEvent();
    if (!event) {
      return {
        event_days: [],
        default_timezone: '',
        default_timezone_label: '',
        available_timezones: [],
        main_conference_day_id: null
      };
    }

    const eventDays = this._getFromStorage('event_days', []);
    const daysForEvent = eventDays.filter((d) => d.event_id === event.id);

    const default_timezone = event.default_timezone || 'utc';
    const default_timezone_label = this._getTimezoneLabel(default_timezone);

    const available_timezones = [
      { value: 'et', label: this._getTimezoneLabel('et'), is_default: default_timezone === 'et' },
      { value: 'pt', label: this._getTimezoneLabel('pt'), is_default: default_timezone === 'pt' },
      { value: 'utc', label: this._getTimezoneLabel('utc'), is_default: default_timezone === 'utc' },
      { value: 'gmt', label: this._getTimezoneLabel('gmt'), is_default: default_timezone === 'gmt' },
      { value: 'cet', label: this._getTimezoneLabel('cet'), is_default: default_timezone === 'cet' }
    ];

    let mainId = event.main_conference_day_id || null;
    if (!mainId) {
      const mainDay = daysForEvent.find((d) => d.is_main_conference_day);
      if (mainDay) mainId = mainDay.id;
    }

    return {
      event_days: daysForEvent.map((d) => ({
        id: d.id,
        label: d.label,
        date: d.date,
        is_main_conference_day: !!d.is_main_conference_day
      })),
      default_timezone,
      default_timezone_label,
      available_timezones,
      main_conference_day_id: mainId
    };
  }

  // getAgendaSessions
  getAgendaSessions(eventDayId, timezone, search_query, topic_tags, view) {
    const event = this._getCurrentEvent();
    if (!event) return [];

    const eventDays = this._getFromStorage('event_days', []);
    const sessions = this._getFromStorage('sessions', []);
    const agendaItems = this._getOrCreatePersonalAgendaStore();
    const inAgendaIds = new Set(agendaItems.map((i) => i.session_id));

    const tz = timezone || event.default_timezone || 'utc';

    let mainDayId = event.main_conference_day_id || null;
    if (!mainDayId) {
      const ed = eventDays.find((d) => d.event_id === event.id && d.is_main_conference_day);
      if (ed) mainDayId = ed.id;
    }

    let filtered = sessions.filter((s) => s.event_id === event.id);

    if (eventDayId) {
      filtered = filtered.filter((s) => s.event_day_id === eventDayId);
    } else if (view === 'main_conference_day' && mainDayId) {
      filtered = filtered.filter((s) => s.event_day_id === mainDayId);
    }

    if (search_query) {
      const q = String(search_query).toLowerCase();
      filtered = filtered.filter((s) => {
        const title = (s.title || '').toLowerCase();
        const desc = (s.description || '').toLowerCase();
        return title.includes(q) || desc.includes(q);
      });
    }

    if (Array.isArray(topic_tags) && topic_tags.length > 0) {
      const tagSet = new Set(topic_tags.map((t) => String(t).toLowerCase()));
      filtered = filtered.filter((s) => {
        const tags = Array.isArray(s.topic_tags) ? s.topic_tags : [];
        return tags.some((t) => tagSet.has(String(t).toLowerCase()));
      });
    }

    // Instrumentation for task completion tracking (task4_lastAgendaQuery)
    try {
      const resolvedDayId = eventDayId || (view === 'main_conference_day' ? mainDayId : null);
      const instrumentationValue = {
        timezone: tz,
        event_day_id: resolvedDayId || null,
        view: view || null,
        queried_at: this._nowIso()
      };
      localStorage.setItem('task4_lastAgendaQuery', JSON.stringify(instrumentationValue));
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return filtered
      .slice()
      .sort((a, b) => {
        const da = new Date(a.start_datetime || 0).getTime();
        const db = new Date(b.start_datetime || 0).getTime();
        return da - db;
      })
      .map((s) => {
        const day = eventDays.find((d) => d.id === s.event_day_id) || null;
        const { startLabel, endLabel } = this._formatSessionTimeRange(
          s.start_datetime,
          s.duration_minutes,
          tz
        );

        return {
          session_id: s.id,
          event_day_id: s.event_day_id,
          event_day_label: day ? day.label : '',
          title: s.title,
          description: s.description || '',
          topic_tags: Array.isArray(s.topic_tags) ? s.topic_tags : [],
          start_datetime: s.start_datetime,
          duration_minutes: s.duration_minutes,
          base_timezone: s.base_timezone || event.default_timezone || 'utc',
          start_time_local_label: startLabel,
          end_time_local_label: endLabel,
          is_main_conference_day: !!s.is_main_conference_day,
          track_name: s.track_name || '',
          location: s.location || '',
          can_add_to_calendar: !!s.can_add_to_calendar,
          is_in_my_agenda: inAgendaIds.has(s.id),
          // Foreign key resolution
          event_day: day,
          session: s
        };
      });
  }

  // getMyAgendaSessions
  getMyAgendaSessions(timezone) {
    const event = this._getCurrentEvent();
    if (!event) return [];

    const tz = timezone || event.default_timezone || 'utc';
    const agendaItems = this._getOrCreatePersonalAgendaStore();
    const sessions = this._getFromStorage('sessions', []);
    const eventDays = this._getFromStorage('event_days', []);

    return agendaItems
      .map((item) => {
        const session = sessions.find((s) => s.id === item.session_id);
        if (!session || session.event_id !== event.id) return null;
        const day = eventDays.find((d) => d.id === session.event_day_id) || null;
        const { startLabel, endLabel } = this._formatSessionTimeRange(
          session.start_datetime,
          session.duration_minutes,
          tz
        );
        return {
          session_id: session.id,
          event_day_id: session.event_day_id,
          event_day_label: day ? day.label : '',
          title: session.title,
          description: session.description || '',
          topic_tags: Array.isArray(session.topic_tags) ? session.topic_tags : [],
          start_datetime: session.start_datetime,
          duration_minutes: session.duration_minutes,
          start_time_local_label: startLabel,
          end_time_local_label: endLabel,
          is_main_conference_day: !!session.is_main_conference_day,
          track_name: session.track_name || '',
          location: session.location || '',
          // Foreign key resolution
          session,
          event_day: day
        };
      })
      .filter((x) => x !== null);
  }

  // getSessionDetails
  getSessionDetails(sessionId, timezone) {
    const event = this._getCurrentEvent();
    const sessions = this._getFromStorage('sessions', []);
    const eventDays = this._getFromStorage('event_days', []);
    const sessionSpeakers = this._getFromStorage('session_speakers', []);
    const speakers = this._getFromStorage('speakers', []);
    const agendaItems = this._getOrCreatePersonalAgendaStore();
    const inAgendaIds = new Set(agendaItems.map((i) => i.session_id));

    const s = sessions.find((x) => x.id === sessionId);
    if (!s) {
      return {
        session_id: null,
        event_day_id: null,
        event_day_label: '',
        title: '',
        description: '',
        topic_tags: [],
        start_datetime: '',
        duration_minutes: 0,
        base_timezone: '',
        start_time_local_label: '',
        end_time_local_label: '',
        track_name: '',
        location: '',
        can_add_to_calendar: false,
        calendar_ics_url: '',
        speakers: [],
        is_in_my_agenda: false,
        event_day: null
      };
    }

    const tz = timezone || (event ? event.default_timezone : 'utc') || 'utc';
    const day = eventDays.find((d) => d.id === s.event_day_id) || null;

    const { startLabel, endLabel } = this._formatSessionTimeRange(
      s.start_datetime,
      s.duration_minutes,
      tz
    );

    const speakerLinks = sessionSpeakers.filter((ss) => ss.session_id === s.id);
    const speakerList = speakerLinks
      .map((link) => {
        const sp = speakers.find((spk) => spk.id === link.speaker_id);
        if (!sp) return null;
        return {
          speaker_id: sp.id,
          name: sp.name,
          job_title: sp.job_title || '',
          company: sp.company || '',
          profile_photo_url: sp.profile_photo_url || ''
        };
      })
      .filter((x) => x !== null);

    // Instrumentation for task completion tracking (task4_selectedSessionForCalendar)
    try {
      if (s && s.can_add_to_calendar) {
        const instrumentationValue = {
          session_id: s.id,
          event_day_id: s.event_day_id,
          start_datetime: s.start_datetime,
          start_time_local_label: startLabel,
          end_time_local_label: endLabel,
          timezone: tz,
          can_add_to_calendar: !!s.can_add_to_calendar,
          calendar_ics_url: s.calendar_ics_url || '',
          captured_at: this._nowIso()
        };
        localStorage.setItem('task4_selectedSessionForCalendar', JSON.stringify(instrumentationValue));
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      session_id: s.id,
      event_day_id: s.event_day_id,
      event_day_label: day ? day.label : '',
      title: s.title,
      description: s.description || '',
      topic_tags: Array.isArray(s.topic_tags) ? s.topic_tags : [],
      start_datetime: s.start_datetime,
      duration_minutes: s.duration_minutes,
      base_timezone: s.base_timezone || (event ? event.default_timezone : 'utc') || 'utc',
      start_time_local_label: startLabel,
      end_time_local_label: endLabel,
      track_name: s.track_name || '',
      location: s.location || '',
      can_add_to_calendar: !!s.can_add_to_calendar,
      calendar_ics_url: s.calendar_ics_url || '',
      speakers: speakerList,
      is_in_my_agenda: inAgendaIds.has(s.id),
      // Foreign key resolution
      event_day: day
    };
  }

  // addSessionToMyAgenda
  addSessionToMyAgenda(sessionId) {
    const sessions = this._getFromStorage('sessions', []);
    const session = sessions.find((s) => s.id === sessionId);
    if (!session) {
      return {
        success: false,
        session_id: sessionId,
        added_at: null,
        message: 'Session not found.'
      };
    }

    const store = this._getOrCreatePersonalAgendaStore();
    const existing = store.find((i) => i.session_id === sessionId);
    if (existing) {
      return {
        success: true,
        session_id: sessionId,
        added_at: existing.added_at,
        message: 'Session already in agenda.'
      };
    }

    const addedAt = this._nowIso();
    const item = {
      id: this._generateId('personal_agenda_item'),
      session_id: sessionId,
      added_at: addedAt
    };

    store.push(item);
    this._saveToStorage('personal_agenda_items', store);

    return {
      success: true,
      session_id: sessionId,
      added_at: addedAt,
      message: 'Session added to agenda.'
    };
  }

  // removeSessionFromMyAgenda
  removeSessionFromMyAgenda(sessionId) {
    const store = this._getOrCreatePersonalAgendaStore();
    const newStore = store.filter((i) => i.session_id !== sessionId);
    this._saveToStorage('personal_agenda_items', newStore);

    return {
      success: true,
      session_id: sessionId,
      message: 'Session removed from agenda if it existed.'
    };
  }

  // getSpeakerFilterOptions
  getSpeakerFilterOptions() {
    const speakers = this._getFromStorage('speakers', []);
    const tagSet = new Set();

    speakers.forEach((s) => {
      if (Array.isArray(s.topic_tags)) {
        s.topic_tags.forEach((t) => tagSet.add(t));
      }
    });

    const topic_tags = Array.from(tagSet);

    // No dedicated industry tags in data model; reuse topic tags for options
    const industry_tags = Array.from(tagSet);

    const sort_options = [
      { value: 'featured', label: 'Featured', is_default: true },
      { value: 'most_popular', label: 'Most popular', is_default: false },
      { value: 'a_z', label: 'A to Z', is_default: false }
    ];

    return {
      topic_tags,
      industry_tags,
      sort_options
    };
  }

  // getSpeakers
  getSpeakers(topic_tags, industry_tags, sort_by) {
    const speakers = this._getFromStorage('speakers', []);
    const followed = this._getOrCreateFollowedSpeakersStore();
    const followedIds = new Set(followed.map((f) => f.speaker_id));

    let filtered = speakers.slice();

    if (Array.isArray(topic_tags) && topic_tags.length > 0) {
      const tagSet = new Set(topic_tags.map((t) => String(t).toLowerCase()));
      filtered = filtered.filter((s) => {
        const tags = Array.isArray(s.topic_tags) ? s.topic_tags : [];
        return tags.some((t) => tagSet.has(String(t).toLowerCase()));
      });
    }

    if (Array.isArray(industry_tags) && industry_tags.length > 0) {
      const indSet = new Set(industry_tags.map((t) => String(t).toLowerCase()));
      filtered = filtered.filter((s) => {
        const tags = Array.isArray(s.topic_tags) ? s.topic_tags : [];
        return tags.some((t) => indSet.has(String(t).toLowerCase()));
      });
    }

    const sortBy = sort_by || 'featured';

    filtered.sort((a, b) => {
      if (sortBy === 'a_z') {
        return (a.name || '').localeCompare(b.name || '');
      }
      if (sortBy === 'most_popular') {
        return (b.popularity_score || 0) - (a.popularity_score || 0);
      }
      // default: featured
      if (a.is_featured && !b.is_featured) return -1;
      if (!a.is_featured && b.is_featured) return 1;
      return (b.popularity_score || 0) - (a.popularity_score || 0);
    });

    return filtered.map((s) => ({
      speaker_id: s.id,
      name: s.name,
      job_title: s.job_title || '',
      company: s.company || '',
      profile_photo_url: s.profile_photo_url || '',
      topic_tags: Array.isArray(s.topic_tags) ? s.topic_tags : [],
      is_featured: !!s.is_featured,
      popularity_score: s.popularity_score || 0,
      is_followed: followedIds.has(s.id),
      // Foreign key resolution
      speaker: s
    }));
  }

  // getSpeakerDetails
  getSpeakerDetails(speakerId, timezone) {
    const event = this._getCurrentEvent();
    const speakers = this._getFromStorage('speakers', []);
    const sessionSpeakers = this._getFromStorage('session_speakers', []);
    const sessions = this._getFromStorage('sessions', []);
    const eventDays = this._getFromStorage('event_days', []);
    const agendaItems = this._getOrCreatePersonalAgendaStore();
    const inAgendaIds = new Set(agendaItems.map((i) => i.session_id));
    const followed = this._getOrCreateFollowedSpeakersStore();
    const isFollowed = followed.some((f) => f.speaker_id === speakerId);

    const sp = speakers.find((s) => s.id === speakerId);
    if (!sp) {
      return {
        speaker_id: speakerId,
        name: '',
        job_title: '',
        company: '',
        bio: '',
        profile_photo_url: '',
        topic_tags: [],
        is_featured: false,
        is_followed: isFollowed,
        sessions: []
      };
    }

    const tz = timezone || (event ? event.default_timezone : 'utc') || 'utc';

    const links = sessionSpeakers.filter((ss) => ss.speaker_id === speakerId);
    const speakerSessions = links
      .map((link) => {
        const sess = sessions.find((s) => s.id === link.session_id);
        if (!sess) return null;
        if (event && sess.event_id !== event.id) return null;
        const day = eventDays.find((d) => d.id === sess.event_day_id) || null;
        const { startLabel } = this._formatSessionTimeRange(
          sess.start_datetime,
          sess.duration_minutes,
          tz
        );
        return {
          session_id: sess.id,
          title: sess.title,
          short_description: sess.description || '',
          event_day_id: sess.event_day_id,
          event_day_label: day ? day.label : '',
          start_datetime: sess.start_datetime,
          start_time_local_label: startLabel,
          duration_minutes: sess.duration_minutes,
          track_name: sess.track_name || '',
          is_in_my_agenda: inAgendaIds.has(sess.id),
          // Foreign key resolution
          session: sess,
          event_day: day
        };
      })
      .filter((x) => x !== null);

    return {
      speaker_id: sp.id,
      name: sp.name,
      job_title: sp.job_title || '',
      company: sp.company || '',
      bio: sp.bio || '',
      profile_photo_url: sp.profile_photo_url || '',
      topic_tags: Array.isArray(sp.topic_tags) ? sp.topic_tags : [],
      is_featured: !!sp.is_featured,
      is_followed: isFollowed,
      sessions: speakerSessions
    };
  }

  // followSpeaker
  followSpeaker(speakerId, follow) {
    const shouldFollow = typeof follow === 'boolean' ? follow : true;
    const store = this._getOrCreateFollowedSpeakersStore();

    const existingIndex = store.findIndex((f) => f.speaker_id === speakerId);

    if (shouldFollow) {
      if (existingIndex === -1) {
        store.push({
          id: this._generateId('followed_speaker'),
          speaker_id: speakerId,
          followed_at: this._nowIso()
        });
        this._saveToStorage('followed_speakers', store);
      }
      return {
        success: true,
        speaker_id: speakerId,
        is_followed: true,
        message: 'Speaker followed.'
      };
    }

    if (existingIndex !== -1) {
      store.splice(existingIndex, 1);
      this._saveToStorage('followed_speakers', store);
    }

    return {
      success: true,
      speaker_id: speakerId,
      is_followed: false,
      message: 'Speaker unfollowed.'
    };
  }

  // getRegistrationTicketSummary
  getRegistrationTicketSummary(ticketId) {
    const tickets = this._getFromStorage('tickets', []);
    const event = this._getCurrentEvent();
    const t = tickets.find((tk) => tk.id === ticketId);
    if (!t) {
      return {
        ticket_id: null,
        ticket_name: '',
        short_label: '',
        description: '',
        tier: '',
        type: '',
        price_usd: 0,
        price_display_label: '',
        currency: 'usd',
        includes_recordings: false,
        includes_recordings_label: '',
        is_refundable: false,
        refundable_label: '',
        max_refund_days_before_event: null,
        included_seat_count: 0,
        min_attendees: null,
        max_attendees: null,
        benefits: [],
        payment_required: false,
        base_subtotal_price_usd: 0,
        base_total_price_usd: 0,
        ticket: null
      };
    }

    const includes_recordings_label = t.includes_recordings
      ? 'Session recordings included'
      : 'Live access only';
    const refundable_label = t.is_refundable
      ? t.max_refund_days_before_event
        ? 'Refundable up to ' + t.max_refund_days_before_event + ' days before event'
        : 'Refundable ticket'
      : 'Non-refundable ticket';

    const price_display_label = '$' + t.price_usd.toFixed(2) + ' USD';
    const payment_required = t.price_usd > 0;

    return {
      ticket_id: t.id,
      ticket_name: t.name,
      short_label: t.short_label || '',
      description: t.description || '',
      tier: t.tier,
      type: t.type,
      price_usd: t.price_usd,
      price_display_label,
      currency: t.currency,
      includes_recordings: t.includes_recordings,
      includes_recordings_label,
      is_refundable: t.is_refundable,
      refundable_label,
      max_refund_days_before_event: t.max_refund_days_before_event,
      included_seat_count: t.included_seat_count,
      min_attendees: t.min_attendees,
      max_attendees: t.max_attendees,
      benefits: Array.isArray(t.benefits) ? t.benefits : [],
      payment_required,
      base_subtotal_price_usd: t.price_usd,
      base_total_price_usd: t.price_usd,
      // Foreign key resolution
      ticket: t,
      event: event || null
    };
  }

  // applyPromoCodeToTicket
  applyPromoCodeToTicket(ticketId, promo_code) {
    const tickets = this._getFromStorage('tickets', []);
    const promos = this._getFromStorage('promo_codes', []);

    const t = tickets.find((tk) => tk.id === ticketId);
    if (!t) {
      return {
        is_valid: false,
        promo_code: promo_code,
        discount_type: '',
        discount_value: 0,
        discount_amount_usd: 0,
        original_subtotal_usd: 0,
        new_subtotal_usd: 0,
        original_total_usd: 0,
        new_total_usd: 0,
        message: 'Ticket not found.'
      };
    }

    const codeNorm = String(promo_code || '').trim();
    const promo = promos.find(
      (p) => String(p.code || '').trim().toLowerCase() === codeNorm.toLowerCase()
    );

    const result = this._applyPromoCodeToPrice(t, promo);

    return {
      is_valid: result.is_valid,
      promo_code: promo_code,
      discount_type: promo ? promo.discount_type : '',
      discount_value: promo ? promo.discount_value : 0,
      discount_amount_usd: result.discount_amount_usd,
      original_subtotal_usd: t.price_usd,
      new_subtotal_usd: result.new_total_usd,
      original_total_usd: t.price_usd,
      new_total_usd: result.new_total_usd,
      message: result.message
    };
  }

  // submitRegistration
  submitRegistration(ticketId, registration) {
    const tickets = this._getFromStorage('tickets', []);
    const promos = this._getFromStorage('promo_codes', []);
    const registrations = this._getFromStorage('registrations', []);
    const attendeesStore = this._getFromStorage('attendees', []);
    const payments = this._getFromStorage('payments', []);

    const ticket = tickets.find((t) => t.id === ticketId);
    const errors = [];

    if (!ticket) {
      errors.push('Ticket not found.');
    }

    if (!registration || typeof registration !== 'object') {
      errors.push('Registration data is required.');
    }

    if (registration && !registration.consent_terms_accepted) {
      errors.push('Terms and conditions must be accepted.');
    }

    const attendeeCount = Array.isArray(registration && registration.attendees)
      ? registration.attendees.length
      : 0;

    if (!attendeeCount) {
      errors.push('At least one attendee is required.');
    }

    if (errors.length || !ticket) {
      return {
        success: false,
        registration_id: null,
        attendee_count: 0,
        subtotal_price_usd: 0,
        total_price_usd: 0,
        promo_code: registration ? registration.promo_code || '' : '',
        promo_code_discount_amount: 0,
        payment_required: false,
        payment_status: 'not_required',
        confirmation_message: '',
        errors
      };
    }

    let promoCodeStr = registration.promo_code || '';
    let promo = null;
    if (promoCodeStr) {
      const codeNorm = String(promoCodeStr).trim();
      promo = promos.find(
        (p) => String(p.code || '').trim().toLowerCase() === codeNorm.toLowerCase()
      );
    }

    const promoResult = this._applyPromoCodeToPrice(ticket, promo);

    const subtotal = ticket.price_usd;
    const total = promoResult.is_valid ? promoResult.new_total_usd : subtotal;
    const discountAmount = promoResult.is_valid ? promoResult.discount_amount_usd : 0;

    let payment_required = total > 0;

    let payment_status = payment_required ? 'pending' : 'not_required';

    const registration_type = registration.registration_type || ticket.type;

    const regId = this._generateId('registration');

    const regRecord = {
      id: regId,
      ticket_id: ticket.id,
      ticket_name_snapshot: ticket.name,
      registration_type,
      attendee_count: attendeeCount,
      company_name: registration.company_name || '',
      team_size_option: registration.team_size_option || null,
      primary_focus_area: registration.primary_focus_area || 'other',
      promo_code: promoResult.is_valid ? promoCodeStr : '',
      promo_code_discount_amount: discountAmount,
      subtotal_price_usd: subtotal,
      total_price_usd: total,
      payment_required: payment_required,
      payment_status: payment_status,
      consent_terms_accepted: !!registration.consent_terms_accepted,
      consent_marketing_opt_in: !!registration.consent_marketing_opt_in,
      created_at: this._nowIso(),
      confirmation_message: 'Registration submitted successfully.'
    };

    // Handle payment if required
    if (payment_required) {
      const method = registration.payment_method || 'credit_card';
      const details = registration.payment_details || {};

      let cardBrand = 'other';
      let cardLast4 = '';
      let cardMasked = '';
      let cardCvvProvided = false;
      let expMonth = null;
      let expYear = null;
      let billingZip = details.billing_zip || '';

      const cardNumberRaw = (details.card_number || '').replace(/\s+/g, '');
      if (cardNumberRaw) {
        cardLast4 = cardNumberRaw.slice(-4);
        cardMasked = '**** **** **** ' + cardLast4;
        if (cardNumberRaw[0] === '4') cardBrand = 'visa';
        else if (cardNumberRaw[0] === '5') cardBrand = 'mastercard';
        else if (cardNumberRaw[0] === '3') cardBrand = 'amex';
        else if (cardNumberRaw[0] === '6') cardBrand = 'discover';
      }

      if (details.card_cvv) {
        cardCvvProvided = true;
      }

      if (details.card_expiration) {
        const parts = String(details.card_expiration).split('/');
        if (parts.length === 2) {
          const m = parseInt(parts[0], 10);
          const y = parseInt(parts[1], 10);
          if (!isNaN(m)) expMonth = m;
          if (!isNaN(y)) {
            expYear = y < 100 ? 2000 + y : y;
          }
        }
      }

      const paymentId = this._generateId('payment');
      const paymentRecord = {
        id: paymentId,
        registration_id: regId,
        payment_method: method === 'invoice' ? 'invoice' : 'credit_card',
        amount_usd: total,
        currency: 'usd',
        cardholder_name: details.cardholder_name || '',
        card_number_masked: cardMasked,
        card_last4: cardLast4,
        card_brand: cardBrand,
        card_exp_month: expMonth,
        card_exp_year: expYear,
        card_cvv_provided: cardCvvProvided,
        billing_zip: billingZip,
        status: 'captured',
        created_at: this._nowIso()
      };

      payments.push(paymentRecord);
      this._saveToStorage('payments', payments);

      payment_status = 'paid';
      regRecord.payment_status = payment_status;
    }

    registrations.push(regRecord);
    this._saveToStorage('registrations', registrations);

    const newAttendees = Array.isArray(registration.attendees)
      ? registration.attendees.map((a, index) => ({
          id: this._generateId('attendee'),
          registration_id: regId,
          full_name: a.full_name,
          email: a.email,
          company: a.company || registration.company_name || '',
          job_role: a.job_role || 'other',
          is_primary_contact: !!a.is_primary_contact,
          attendee_index: typeof a.attendee_index === 'number' ? a.attendee_index : index + 1
        }))
      : [];

    attendeesStore.push(...newAttendees);
    this._saveToStorage('attendees', attendeesStore);

    return {
      success: true,
      registration_id: regId,
      attendee_count: attendeeCount,
      subtotal_price_usd: subtotal,
      total_price_usd: total,
      promo_code: promoResult.is_valid ? promoCodeStr : '',
      promo_code_discount_amount: discountAmount,
      payment_required: payment_required,
      payment_status: payment_status,
      confirmation_message: regRecord.confirmation_message,
      errors: []
    };
  }

  // getResourceFilterOptions
  getResourceFilterOptions() {
    const resources = this._getFromStorage('resources', []);
    const contentTypeSet = new Set();
    const topicSet = new Set();

    resources.forEach((r) => {
      if (r.content_type) contentTypeSet.add(r.content_type);
      if (Array.isArray(r.topic_tags)) {
        r.topic_tags.forEach((t) => topicSet.add(t));
      }
    });

    const content_types = Array.from(contentTypeSet).map((ct) => ({
      value: ct,
      label: ct.charAt(0).toUpperCase() + ct.slice(1)
    }));

    return {
      content_types,
      topic_tags: Array.from(topicSet)
    };
  }

  // searchResources
  searchResources(search_query, content_type, topic_tags, max_reading_time_minutes, is_pre_event_only) {
    const resources = this._getFromStorage('resources', []);
    const saved = this._getOrCreateReadingListStore();
    const savedIds = new Set(saved.map((r) => r.resource_id));

    const preOnly = typeof is_pre_event_only === 'boolean' ? is_pre_event_only : true;

    let filtered = resources.slice();

    if (preOnly) {
      filtered = filtered.filter((r) => r.is_pre_event);
    }

    if (search_query) {
      const q = String(search_query).toLowerCase();
      filtered = filtered.filter((r) => {
        const title = (r.title || '').toLowerCase();
        const desc = (r.description || '').toLowerCase();
        return title.includes(q) || desc.includes(q);
      });
    }

    if (content_type) {
      filtered = filtered.filter((r) => r.content_type === content_type);
    }

    if (Array.isArray(topic_tags) && topic_tags.length > 0) {
      const tagSet = new Set(topic_tags.map((t) => String(t).toLowerCase()));
      filtered = filtered.filter((r) => {
        const tags = Array.isArray(r.topic_tags) ? r.topic_tags : [];
        return tags.some((t) => tagSet.has(String(t).toLowerCase()));
      });
    }

    if (typeof max_reading_time_minutes === 'number') {
      filtered = filtered.filter(
        (r) => typeof r.reading_time_minutes === 'number' && r.reading_time_minutes <= max_reading_time_minutes
      );
    }

    return filtered.map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description || '',
      topic_tags: Array.isArray(r.topic_tags) ? r.topic_tags : [],
      content_type: r.content_type,
      reading_time_minutes: r.reading_time_minutes,
      estimated_reading_time_label:
        r.estimated_reading_time_label ||
        (typeof r.reading_time_minutes === 'number'
          ? r.reading_time_minutes + ' min read'
          : ''),
      is_pre_event: !!r.is_pre_event,
      url: r.url || '',
      is_featured: !!r.is_featured,
      is_saved: savedIds.has(r.id)
    }));
  }

  // saveResourceToReadingList
  saveResourceToReadingList(resourceId) {
    const resources = this._getFromStorage('resources', []);
    const resource = resources.find((r) => r.id === resourceId);
    if (!resource) {
      return {
        success: false,
        resource_id: resourceId,
        saved_at: null,
        message: 'Resource not found.'
      };
    }

    const store = this._getOrCreateReadingListStore();
    const existing = store.find((s) => s.resource_id === resourceId);
    if (existing) {
      return {
        success: true,
        resource_id: resourceId,
        saved_at: existing.saved_at,
        message: 'Resource already in reading list.'
      };
    }

    const savedAt = this._nowIso();
    const item = {
      id: this._generateId('saved_resource'),
      resource_id: resourceId,
      saved_at: savedAt
    };

    store.push(item);
    this._saveToStorage('saved_resources', store);

    return {
      success: true,
      resource_id: resourceId,
      saved_at: savedAt,
      message: 'Resource saved to reading list.'
    };
  }

  // getMyReadingList
  getMyReadingList() {
    const saved = this._getOrCreateReadingListStore();
    const resources = this._getFromStorage('resources', []);

    return saved
      .map((s) => {
        const res = resources.find((r) => r.id === s.resource_id);
        if (!res) return null;
        return {
          resource_id: res.id,
          title: res.title,
          description: res.description || '',
          topic_tags: Array.isArray(res.topic_tags) ? res.topic_tags : [],
          content_type: res.content_type,
          reading_time_minutes: res.reading_time_minutes,
          estimated_reading_time_label:
            res.estimated_reading_time_label ||
            (typeof res.reading_time_minutes === 'number'
              ? res.reading_time_minutes + ' min read'
              : ''),
          is_pre_event: !!res.is_pre_event,
          url: res.url || '',
          saved_at: s.saved_at,
          // Foreign key resolution
          resource: res
        };
      })
      .filter((x) => x !== null);
  }

  // getOrganizerInfo
  getOrganizerInfo() {
    const info = this._getFromStorage('organizer_info', {});
    return {
      organizer_name: info.organizer_name || '',
      organizer_description: info.organizer_description || '',
      event_mission: info.event_mission || '',
      expertise_areas: Array.isArray(info.expertise_areas) ? info.expertise_areas : []
    };
  }

  // getContactSupportInfo
  getContactSupportInfo() {
    const info = this._getFromStorage('contact_support_info', {});
    return {
      support_email: info.support_email || '',
      support_phone: info.support_phone || '',
      support_hours_label: info.support_hours_label || ''
    };
  }

  // submitContactForm
  submitContactForm(full_name, email, topic, message) {
    const submissions = this._getFromStorage('contact_form_submissions', []);
    const id = this._generateId('contact');

    const record = {
      id,
      full_name,
      email,
      topic: topic || '',
      message,
      created_at: this._nowIso()
    };

    submissions.push(record);
    this._saveToStorage('contact_form_submissions', submissions);

    return {
      success: true,
      message: 'Your message has been received.'
    };
  }

  // getPrivacyPolicyContent
  getPrivacyPolicyContent() {
    const content = this._getFromStorage('privacy_policy_content', {});
    return {
      title: content.title || '',
      last_updated_at: content.last_updated_at || '',
      body_html: content.body_html || ''
    };
  }

  // getTermsAndConditionsContent
  getTermsAndConditionsContent() {
    const content = this._getFromStorage('terms_and_conditions_content', {});
    return {
      title: content.title || '',
      last_updated_at: content.last_updated_at || '',
      body_html: content.body_html || ''
    };
  }

  // getRefundPolicyDetailsForEvent
  getRefundPolicyDetailsForEvent() {
    const event = this._getCurrentEvent();
    if (!event) {
      return {
        summary: '',
        detailed_text: '',
        refundable_ticket_tiers: [],
        non_refundable_ticket_tiers: [],
        last_updated_at: ''
      };
    }

    const policies = this._getFromStorage('refund_policies', []);
    const policy = policies.find((p) => p.event_id === event.id);

    if (!policy) {
      return {
        summary: '',
        detailed_text: '',
        refundable_ticket_tiers: [],
        non_refundable_ticket_tiers: [],
        last_updated_at: ''
      };
    }

    return {
      summary: policy.summary || '',
      detailed_text: policy.detailed_text || '',
      refundable_ticket_tiers: Array.isArray(policy.refundable_ticket_tiers)
        ? policy.refundable_ticket_tiers
        : [],
      non_refundable_ticket_tiers: Array.isArray(policy.non_refundable_ticket_tiers)
        ? policy.non_refundable_ticket_tiers
        : [],
      last_updated_at: policy.last_updated_at || ''
    };
  }

  // getAccessibilityInfoContent
  getAccessibilityInfoContent() {
    const content = this._getFromStorage('accessibility_info_content', {});
    return {
      title: content.title || '',
      body_html: content.body_html || '',
      accessibility_contact_email: content.accessibility_contact_email || ''
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