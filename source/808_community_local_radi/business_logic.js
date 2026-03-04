// localStorage polyfill for Node.js and environments without localStorage
const localStorage = (function () {
  try {
    if (typeof globalThis !== "undefined" && globalThis.localStorage) {
      return globalThis.localStorage;
    }
  } catch (e) {}
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

  _initStorage() {
    const keys = [
      'shows',
      'schedule_slots',
      'show_reminders',
      'show_favorites',
      'events',
      'my_events',
      'community_bulletin_events',
      'episodes',
      'listening_queue',
      'listening_queue_items',
      'donation_funds',
      'donations',
      'volunteer_roles',
      'volunteer_applications',
      'song_requests',
      'newsletter_topics',
      'newsletter_subscriptions',
      'faq_sections',
      'policies',
      'contact_inquiries',
      'underwriting_inquiries',
      'live_stream_info'
    ];

    keys.forEach((key) => {
      if (!localStorage.getItem(key)) {
        // Arrays by default; some keys may later store objects but [] parses fine
        localStorage.setItem(key, JSON.stringify([]));
      }
    });

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key) {
    const data = localStorage.getItem(key);
    if (!data) return [];
    try {
      return JSON.parse(data);
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

  _nowISO() {
    return new Date().toISOString();
  }

  _toDate(dateStr) {
    return dateStr ? new Date(dateStr) : null;
  }

  _startOfDay(dateStr) {
    if (!dateStr) return null;
    return new Date(dateStr + 'T00:00:00');
  }

  _endOfDay(dateStr) {
    if (!dateStr) return null;
    return new Date(dateStr + 'T23:59:59');
  }

  _titleCase(str) {
    if (!str) return '';
    return str
      .split('_')
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
      .join(' ');
  }

  _resolveForeignKey(obj, foreignKeyField, collection, collectionIdField = 'id') {
    if (!obj || !foreignKeyField || !collection) return obj;
    const val = obj[foreignKeyField];
    if (!val) return obj;
    let baseName = foreignKeyField;
    if (baseName.endsWith('Id')) {
      baseName = baseName.slice(0, -2);
    } else if (baseName.endsWith('_id')) {
      baseName = baseName.slice(0, -3);
    }
    const resolved = collection.find((item) => item[collectionIdField] === val) || null;
    return { ...obj, [baseName]: resolved };
  }

  _getOrCreateListeningQueue() {
    let queues = this._getFromStorage('listening_queue');
    if (!Array.isArray(queues)) queues = [];
    let queue = queues[0] || null;
    if (!queue) {
      const now = this._nowISO();
      queue = {
        id: this._generateId('queue'),
        created_at: now,
        updated_at: now
      };
      queues.push(queue);
      this._saveToStorage('listening_queue', queues);
    }
    return queue;
  }

  _getOrCreateMyEventsList() {
    let myEvents = this._getFromStorage('my_events');
    if (!Array.isArray(myEvents)) myEvents = [];
    return myEvents;
  }

  _processCreditCardPayment(paymentMethod, cardNumber, cardExpiration, cardSecurityCode, billingPostalCode, amount) {
    if (paymentMethod !== 'credit_card') {
      return { success: false, message: 'unsupported_payment_method' };
    }
    const num = (cardNumber || '').replace(/\s+/g, '');
    if (num.length < 12 || !cardExpiration || !cardSecurityCode) {
      return { success: false, message: 'invalid_card_details' };
    }
    return {
      success: true,
      transactionId: this._generateId('txn'),
      card_last4: num.slice(-4),
      card_expiration: cardExpiration,
      billing_postal_code: billingPostalCode || ''
    };
  }

  _calculateDistanceFromZip(event, zipCode) {
    if (!event) return Number.POSITIVE_INFINITY;
    if (zipCode && event.postal_code && String(event.postal_code) === String(zipCode)) {
      return 0;
    }
    return 99999; // treat non-matching zips as very far away
  }

  _generateMyEventsExport(format, events) {
    const fmt = format || 'print_view';
    const list = Array.isArray(events) ? events : [];

    if (fmt === 'csv') {
      const header = [
        'Title',
        'Start DateTime',
        'End DateTime',
        'Venue',
        'City',
        'State',
        'Postal Code',
        'Cost Type',
        'Station Sponsored'
      ];
      const rows = list.map((e) => [
        e.title || '',
        e.start_datetime || '',
        e.end_datetime || '',
        e.venue_name || '',
        e.city || '',
        e.state || '',
        e.postal_code || '',
        e.cost_type || '',
        e.is_station_sponsored ? 'yes' : 'no'
      ]);
      const csvLines = [header.join(','), ...rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))];
      return {
        format: 'csv',
        mime_type: 'text/csv',
        content: csvLines.join('\n')
      };
    }

    if (fmt === 'ics') {
      const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//LocalRadio//MyEvents//EN'];
      list.forEach((e, idx) => {
        const uid = (e.event_id || 'evt') + '@localradio';
        lines.push('BEGIN:VEVENT');
        lines.push('UID:' + uid);
        if (e.start_datetime) {
          const dt = new Date(e.start_datetime).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
          lines.push('DTSTART:' + dt);
        }
        if (e.end_datetime) {
          const dtEnd = new Date(e.end_datetime).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
          lines.push('DTEND:' + dtEnd);
        }
        lines.push('SUMMARY:' + (e.title || 'Event'));
        const locParts = [e.venue_name, e.city, e.state, e.postal_code].filter(Boolean);
        if (locParts.length) {
          lines.push('LOCATION:' + locParts.join(', '));
        }
        lines.push('END:VEVENT');
      });
      lines.push('END:VCALENDAR');
      return {
        format: 'ics',
        mime_type: 'text/calendar',
        content: lines.join('\n')
      };
    }

    // default: print_view (simple HTML)
    const rowsHtml = list
      .map((e) => {
        return (
          '<tr>' +
          '<td>' + (e.title || '') + '</td>' +
          '<td>' + (e.start_datetime || '') + '</td>' +
          '<td>' + (e.end_datetime || '') + '</td>' +
          '<td>' + (e.venue_name || '') + '</td>' +
          '<td>' + (e.city || '') + '</td>' +
          '<td>' + (e.state || '') + '</td>' +
          '<td>' + (e.postal_code || '') + '</td>' +
          '<td>' + (e.cost_type || '') + '</td>' +
          '<td>' + (e.is_station_sponsored ? 'Yes' : 'No') + '</td>' +
          '</tr>'
        );
      })
      .join('');

    const html =
      '<html><head><title>My Events</title></head><body>' +
      '<h1>My Events</h1>' +
      '<table border="1" cellspacing="0" cellpadding="4">' +
      '<thead><tr>' +
      '<th>Title</th><th>Start</th><th>End</th><th>Venue</th><th>City</th><th>State</th><th>Postal</th><th>Cost</th><th>Station Sponsored</th>' +
      '</tr></thead>' +
      '<tbody>' +
      rowsHtml +
      '</tbody></table></body></html>';

    return {
      format: 'print_view',
      mime_type: 'text/html',
      content: html
    };
  }

  _computeNextAirDateTime(dayOfWeek, startTime) {
    const dayMap = {
      sunday: 0,
      monday: 1,
      tuesday: 2,
      wednesday: 3,
      thursday: 4,
      friday: 5,
      saturday: 6
    };
    const targetDow = dayMap[dayOfWeek];
    if (typeof targetDow === 'undefined') return null;
    const now = new Date();
    const result = new Date(now.getTime());
    const currentDow = now.getDay();
    let diff = targetDow - currentDow;
    if (diff < 0) diff += 7;
    result.setDate(now.getDate() + diff);
    if (startTime && /^\d{2}:\d{2}$/.test(startTime)) {
      const [h, m] = startTime.split(':').map((x) => parseInt(x, 10));
      result.setHours(h, m, 0, 0);
    }
    if (result <= now) {
      result.setDate(result.getDate() + 7);
    }
    return result.toISOString();
  }

  // ===================== Interfaces =====================

  // getHomePageContent()
  getHomePageContent() {
    const episodes = this._getFromStorage('episodes');
    const shows = this._getFromStorage('shows');
    const events = this._getFromStorage('events');

    const liveStream = this.getLiveStreamInfo();

    const activeShows = shows.filter((s) => s.is_active);
    const featuredShows = activeShows.slice(0, 5).map((s) => {
      const scheduleSlots = this._getFromStorage('schedule_slots').filter((sl) => sl.show_id === s.id);
      let typical_air_times = '';
      if (scheduleSlots.length) {
        const first = scheduleSlots[0];
        typical_air_times = this._titleCase(first.day_of_week) + ' ' + (first.start_time || '') + '-' + (first.end_time || '');
      }
      return {
        show_id: s.id,
        title: s.title,
        primary_genre: s.primary_genre,
        format: s.format,
        host_name: s.host_name || '',
        image_url: s.image_url || '',
        typical_air_times,
        short_description: s.description || ''
      };
    });

    const latestLocalNewsEpisodes = episodes
      .filter((e) => e.is_published && e.category === 'local_news')
      .sort((a, b) => (a.air_datetime > b.air_datetime ? -1 : 1))
      .slice(0, 5)
      .map((e) => {
        const show = shows.find((s) => s.id === e.show_id) || {};
        return {
          episode_id: e.id,
          title: e.title,
          show_title: show.title || '',
          air_datetime: e.air_datetime,
          duration_minutes: e.duration_minutes,
          audio_url: e.audio_url || ''
        };
      });

    const upcomingEvents = events
      .slice()
      .filter((ev) => !!ev.start_datetime)
      .sort((a, b) => (a.start_datetime < b.start_datetime ? -1 : 1));

    const highlightedEvents = upcomingEvents.slice(0, 5).map((ev) => ({
      event_id: ev.id,
      title: ev.title,
      start_datetime: ev.start_datetime,
      venue_name: ev.venue_name || '',
      city: ev.city || '',
      is_station_sponsored: !!ev.is_station_sponsored,
      cost_type: ev.cost_type,
      is_free: ev.cost_type === 'free'
    }));

    const primaryCTAs = [
      {
        code: 'donate',
        label: 'Donate',
        description: 'Support your community radio station.'
      },
      {
        code: 'volunteer',
        label: 'Volunteer',
        description: 'Join our street team and community outreach.'
      },
      {
        code: 'newsletter_signup',
        label: 'Newsletter Signup',
        description: 'Get weekly updates on live events and new music.'
      }
    ];

    return {
      liveStream,
      featuredShows,
      latestLocalNewsEpisodes,
      highlightedEvents,
      primaryCTAs
    };
  }

  // getLiveStreamInfo()
  getLiveStreamInfo() {
    const data = localStorage.getItem('live_stream_info');
    let info = {};
    try {
      info = data ? JSON.parse(data) : {};
    } catch (e) {
      info = {};
    }
    return {
      is_live: !!info.is_live,
      now_playing_title: info.now_playing_title || '',
      now_playing_show_title: info.now_playing_show_title || '',
      live_stream_url: info.live_stream_url || '',
      bitrate_kbps: typeof info.bitrate_kbps === 'number' ? info.bitrate_kbps : 128
    };
  }

  // getScheduleFilterOptions()
  getScheduleFilterOptions() {
    const shows = this._getFromStorage('shows');
    const genreSet = new Set();
    const formatSet = new Set();
    shows.forEach((s) => {
      if (s.primary_genre) genreSet.add(s.primary_genre);
      if (s.format) formatSet.add(s.format);
    });

    const genres = Array.from(genreSet).map((code) => ({ code, label: this._titleCase(code) }));
    const formats = Array.from(formatSet).map((code) => ({ code, label: this._titleCase(code) }));

    const timeWindows = [
      {
        code: 'before_9_am',
        label: 'Before 9:00 am',
        start_time: null,
        end_time: '09:00'
      },
      {
        code: 'between_7_10_pm',
        label: '7:00 pm – 10:00 pm',
        start_time: '19:00',
        end_time: '22:00'
      },
      {
        code: 'after_7_pm',
        label: 'After 7:00 pm',
        start_time: '19:00',
        end_time: null
      }
    ];

    return { genres, formats, timeWindows };
  }

  // getScheduleDayView(dayOfWeek, primaryGenre, format, timeWindowStart, timeWindowEnd, includeRebroadcasts)
  getScheduleDayView(dayOfWeek, primaryGenre, format, timeWindowStart, timeWindowEnd, includeRebroadcasts) {
    const slotsAll = this._getFromStorage('schedule_slots');
    const shows = this._getFromStorage('shows');
    const favorites = this._getFromStorage('show_favorites');

    const includeReb = typeof includeRebroadcasts === 'boolean' ? includeRebroadcasts : true;

    let slots = slotsAll.filter((sl) => sl.day_of_week === dayOfWeek);
    if (!includeReb) {
      slots = slots.filter((sl) => !sl.is_rebroadcast);
    }

    slots = slots
      .map((sl) => {
        const show = shows.find((s) => s.id === sl.show_id);
        return { slot: sl, show };
      })
      .filter((pair) => !!pair.show);

    if (primaryGenre) {
      slots = slots.filter((pair) => pair.show.primary_genre === primaryGenre);
    }
    if (format) {
      slots = slots.filter((pair) => pair.show.format === format);
    }
    if (timeWindowStart) {
      slots = slots.filter((pair) => !pair.slot.start_time || pair.slot.start_time >= timeWindowStart);
    }
    if (timeWindowEnd) {
      slots = slots.filter((pair) => !pair.slot.start_time || pair.slot.start_time <= timeWindowEnd);
    }

    slots.sort((a, b) => {
      const at = a.slot.start_time || '';
      const bt = b.slot.start_time || '';
      return at < bt ? -1 : at > bt ? 1 : 0;
    });

    const resultSlots = slots.map(({ slot, show }) => {
      const isFav = favorites.some((f) => f.show_id === show.id);
      let obj = {
        schedule_slot_id: slot.id,
        show_id: show.id,
        show_title: show.title,
        show_primary_genre: show.primary_genre,
        show_format: show.format,
        start_time: slot.start_time,
        end_time: slot.end_time,
        is_rebroadcast: !!slot.is_rebroadcast,
        allows_song_requests: !!show.allows_song_requests,
        is_favorited: isFav,
        short_description: show.description || ''
      };
      obj = this._resolveForeignKey(obj, 'show_id', shows);
      obj = this._resolveForeignKey(obj, 'schedule_slot_id', slotsAll);
      return obj;
    });

    const label = this._titleCase(dayOfWeek) + ' (this week)';

    return {
      dayOfWeek,
      dateLabel: label,
      slots: resultSlots
    };
  }

  // getShowDetail(showId)
  getShowDetail(showId) {
    const shows = this._getFromStorage('shows');
    const slotsAll = this._getFromStorage('schedule_slots');
    const episodes = this._getFromStorage('episodes');
    const favorites = this._getFromStorage('show_favorites');

    const show = shows.find((s) => s.id === showId) || null;

    const schedule_slots = slotsAll
      .filter((sl) => sl.show_id === showId)
      .map((sl) => {
        let obj = {
          schedule_slot_id: sl.id,
          day_of_week: sl.day_of_week,
          start_time: sl.start_time,
          end_time: sl.end_time,
          is_rebroadcast: !!sl.is_rebroadcast,
          notes: sl.notes || ''
        };
        obj = this._resolveForeignKey(obj, 'schedule_slot_id', slotsAll);
        return obj;
      });

    const upcoming_airings = schedule_slots.map((sl) => {
      const nextAir = this._computeNextAirDateTime(sl.day_of_week, sl.start_time);
      let obj = {
        schedule_slot_id: sl.schedule_slot_id,
        next_air_datetime: nextAir
      };
      obj = this._resolveForeignKey(obj, 'schedule_slot_id', slotsAll);
      return obj;
    });

    const related_episodes = episodes
      .filter((e) => e.show_id === showId && e.is_published)
      .sort((a, b) => (a.air_datetime > b.air_datetime ? -1 : 1))
      .map((e) => ({
        episode_id: e.id,
        title: e.title,
        air_datetime: e.air_datetime,
        duration_minutes: e.duration_minutes,
        category: e.category,
        audio_url: e.audio_url || ''
      }));

    const is_favorited = favorites.some((f) => f.show_id === showId);

    return {
      show: show
        ? {
            id: show.id,
            title: show.title,
            description: show.description || '',
            host_name: show.host_name || '',
            primary_genre: show.primary_genre,
            format: show.format,
            image_url: show.image_url || '',
            allows_song_requests: !!show.allows_song_requests,
            is_active: !!show.is_active
          }
        : null,
      schedule_slots,
      upcoming_airings,
      related_episodes,
      is_favorited
    };
  }

  // createShowReminderEmail(showId, scheduleSlotId, email, leadTimeMinutes)
  createShowReminderEmail(showId, scheduleSlotId, email, leadTimeMinutes) {
    const shows = this._getFromStorage('shows');
    const slots = this._getFromStorage('schedule_slots');
    const reminders = this._getFromStorage('show_reminders');

    const show = shows.find((s) => s.id === showId);
    if (!show) {
      return { success: false, reminder: null, message: 'show_not_found' };
    }
    if (scheduleSlotId) {
      const slot = slots.find((sl) => sl.id === scheduleSlotId);
      if (!slot) {
        return { success: false, reminder: null, message: 'schedule_slot_not_found' };
      }
    }

    const reminder = {
      id: this._generateId('reminder'),
      show_id: showId,
      schedule_slot_id: scheduleSlotId || null,
      reminder_channel: 'email',
      email: email,
      lead_time_minutes: typeof leadTimeMinutes === 'number' ? leadTimeMinutes : 30,
      created_at: this._nowISO(),
      is_active: true
    };

    reminders.push(reminder);
    this._saveToStorage('show_reminders', reminders);

    return {
      success: true,
      reminder,
      message: 'reminder_created'
    };
  }

  // addShowToFavorites(showId)
  addShowToFavorites(showId) {
    const shows = this._getFromStorage('shows');
    const favorites = this._getFromStorage('show_favorites');

    const show = shows.find((s) => s.id === showId);
    if (!show) {
      return { success: false, favorite: null, message: 'show_not_found' };
    }

    const existing = favorites.find((f) => f.show_id === showId);
    if (existing) {
      return { success: true, favorite: existing, message: 'already_favorited' };
    }

    const favorite = {
      id: this._generateId('fav'),
      show_id: showId,
      created_at: this._nowISO()
    };

    favorites.push(favorite);
    this._saveToStorage('show_favorites', favorites);

    return { success: true, favorite, message: 'favorited' };
  }

  // removeShowFromFavorites(showId)
  removeShowFromFavorites(showId) {
    let favorites = this._getFromStorage('show_favorites');
    const before = favorites.length;
    favorites = favorites.filter((f) => f.show_id !== showId);
    this._saveToStorage('show_favorites', favorites);
    const removed = before !== favorites.length;
    return { success: removed, message: removed ? 'unfavorited' : 'not_in_favorites' };
  }

  // getEventFilterOptions()
  getEventFilterOptions() {
    const costTypes = [
      { code: 'free', label: 'Free' },
      { code: 'paid', label: 'Paid' },
      { code: 'donation_suggested', label: 'Donation suggested' }
    ];

    const sortOptions = [
      { code: 'date_soonest_first', label: 'Date: Soonest first' },
      { code: 'date_latest_first', label: 'Date: Latest first' },
      { code: 'distance_nearest_first', label: 'Distance: Nearest first' }
    ];

    const distanceOptionsMiles = [5, 10, 25, 50];

    const today = new Date();
    const start = new Date(today.getTime());
    const end = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
    const yyyyMmDd = (d) => d.toISOString().slice(0, 10);

    const datePresets = [
      {
        code: 'next_30_days',
        label: 'Next 30 days',
        start_date: yyyyMmDd(start),
        end_date: yyyyMmDd(end)
      }
    ];

    return { costTypes, sortOptions, distanceOptionsMiles, datePresets };
  }

  // searchEvents(startDate, endDate, zipCode, distanceMiles, stationSponsoredOnly, costTypes, sortOrder)
  searchEvents(startDate, endDate, zipCode, distanceMiles, stationSponsoredOnly, costTypes, sortOrder) {
    const events = this._getFromStorage('events');
    const saved = this._getFromStorage('my_events');

    const start = this._startOfDay(startDate);
    const end = this._endOfDay(endDate);
    const sort = sortOrder || 'date_soonest_first';
    const costFilter = Array.isArray(costTypes) ? costTypes : null;
    const stationOnly = !!stationSponsoredOnly;

    let filtered = events.filter((ev) => !!ev.start_datetime);

    filtered = filtered.filter((ev) => {
      const d = this._toDate(ev.start_datetime);
      if (!d) return false;
      if (start && d < start) return false;
      if (end && d > end) return false;
      if (stationOnly && !ev.is_station_sponsored) return false;
      if (costFilter && costFilter.length && !costFilter.includes(ev.cost_type)) return false;
      return true;
    });

    const withDistance = filtered.map((ev) => {
      let dist = null;
      if (zipCode && distanceMiles) {
        dist = this._calculateDistanceFromZip(ev, zipCode);
      }
      return { ev, distance: dist };
    });

    let finalList = withDistance;

    if (zipCode && distanceMiles) {
      finalList = finalList.filter((item) => item.distance !== null && item.distance <= distanceMiles);
    }

    finalList.sort((a, b) => {
      if (sort === 'distance_nearest_first') {
        const ad = a.distance == null ? Number.POSITIVE_INFINITY : a.distance;
        const bd = b.distance == null ? Number.POSITIVE_INFINITY : b.distance;
        return ad - bd;
      }
      if (sort === 'date_latest_first') {
        return a.ev.start_datetime < b.ev.start_datetime ? 1 : -1;
      }
      // default: date_soonest_first
      return a.ev.start_datetime > b.ev.start_datetime ? 1 : -1;
    });

    const resultEvents = finalList.map(({ ev, distance }) => {
      const isSaved = saved.some((s) => s.event_id === ev.id);
      let obj = {
        event_id: ev.id,
        title: ev.title,
        description_snippet: (ev.description || '').slice(0, 160),
        start_datetime: ev.start_datetime,
        end_datetime: ev.end_datetime || null,
        venue_name: ev.venue_name || '',
        city: ev.city || '',
        state: ev.state || '',
        postal_code: ev.postal_code || '',
        is_station_sponsored: !!ev.is_station_sponsored,
        cost_type: ev.cost_type,
        is_free: ev.cost_type === 'free',
        distance_miles: typeof distance === 'number' ? distance : null,
        is_saved_to_my_events: isSaved
      };
      obj = this._resolveForeignKey(obj, 'event_id', events);
      return obj;
    });

    return {
      totalResults: resultEvents.length,
      events: resultEvents
    };
  }

  // saveEventToMyEvents(eventId)
  saveEventToMyEvents(eventId) {
    const events = this._getFromStorage('events');
    const myEvents = this._getOrCreateMyEventsList();

    const ev = events.find((e) => e.id === eventId);
    if (!ev) {
      return { success: false, saved_event: null, message: 'event_not_found' };
    }

    const existing = myEvents.find((s) => s.event_id === eventId);
    if (existing) {
      return { success: true, saved_event: existing, message: 'already_saved' };
    }

    const saved_event = {
      id: this._generateId('myevt'),
      event_id: eventId,
      saved_at: this._nowISO()
    };

    myEvents.push(saved_event);
    this._saveToStorage('my_events', myEvents);

    return { success: true, saved_event, message: 'saved' };
  }

  // getMyEvents()
  getMyEvents() {
    const myEvents = this._getOrCreateMyEventsList();
    const events = this._getFromStorage('events');

    const detailed = myEvents
      .map((s) => {
        const ev = events.find((e) => e.id === s.event_id);
        if (!ev) return null;
        let obj = {
          event_id: ev.id,
          title: ev.title,
          start_datetime: ev.start_datetime,
          end_datetime: ev.end_datetime || null,
          venue_name: ev.venue_name || '',
          city: ev.city || '',
          state: ev.state || '',
          postal_code: ev.postal_code || '',
          is_station_sponsored: !!ev.is_station_sponsored,
          cost_type: ev.cost_type,
          is_free: ev.cost_type === 'free',
          saved_at: s.saved_at
        };
        obj = this._resolveForeignKey(obj, 'event_id', events);
        return obj;
      })
      .filter(Boolean);

    return {
      totalEvents: detailed.length,
      events: detailed
    };
  }

  // removeEventFromMyEvents(eventId)
  removeEventFromMyEvents(eventId) {
    let myEvents = this._getFromStorage('my_events');
    const before = myEvents.length;
    myEvents = myEvents.filter((s) => s.event_id !== eventId);
    this._saveToStorage('my_events', myEvents);
    const removed = before !== myEvents.length;
    return { success: removed, message: removed ? 'removed' : 'not_found' };
  }

  // exportMyEventsList(format)
  exportMyEventsList(format) {
    const myEvents = this.getMyEvents();
    const exported = this._generateMyEventsExport(format, myEvents.events || []);
    return exported;
  }

  // getOnDemandFilterOptions()
  getOnDemandFilterOptions() {
    const categoriesEnum = [
      'local_news',
      'music_programs',
      'talk',
      'special',
      'other'
    ];
    const categories = categoriesEnum.map((code) => ({ code, label: this._titleCase(code) }));

    const sortOptions = [
      { code: 'newest_first', label: 'Newest first' },
      { code: 'oldest_first', label: 'Oldest first' },
      { code: 'longest_first', label: 'Longest first' }
    ];

    const durationOptions = [
      { code: 'min_20', label: '20+ minutes', min_minutes: 20 },
      { code: 'min_30', label: '30+ minutes', min_minutes: 30 }
    ];

    return { categories, sortOptions, durationOptions };
  }

  // searchEpisodes(category, startDate, endDate, minDurationMinutes, sortOrder)
  searchEpisodes(category, startDate, endDate, minDurationMinutes, sortOrder) {
    const episodes = this._getFromStorage('episodes');
    const shows = this._getFromStorage('shows');
    const queueItems = this._getFromStorage('listening_queue_items');

    const start = this._startOfDay(startDate);
    const end = this._endOfDay(endDate);
    const minDur = typeof minDurationMinutes === 'number' ? minDurationMinutes : null;
    const sort = sortOrder || 'newest_first';

    let filtered = episodes.filter((e) => e.is_published);

    if (category) {
      filtered = filtered.filter((e) => e.category === category);
    }
    if (start) {
      filtered = filtered.filter((e) => this._toDate(e.air_datetime) >= start);
    }
    if (end) {
      filtered = filtered.filter((e) => this._toDate(e.air_datetime) <= end);
    }
    if (minDur != null) {
      filtered = filtered.filter((e) => e.duration_minutes >= minDur);
    }

    filtered.sort((a, b) => {
      if (sort === 'oldest_first') {
        return a.air_datetime > b.air_datetime ? 1 : -1;
      }
      if (sort === 'longest_first') {
        return b.duration_minutes - a.duration_minutes;
      }
      // newest_first
      return a.air_datetime < b.air_datetime ? 1 : -1;
    });

    const inQueueSet = new Set(queueItems.map((qi) => qi.episode_id));

    const results = filtered.map((e) => {
      const show = shows.find((s) => s.id === e.show_id) || {};
      let obj = {
        episode_id: e.id,
        title: e.title,
        show_title: show.title || '',
        air_datetime: e.air_datetime,
        duration_minutes: e.duration_minutes,
        category: e.category,
        audio_url: e.audio_url || '',
        is_in_queue: inQueueSet.has(e.id)
      };
      obj = this._resolveForeignKey(obj, 'episode_id', episodes);
      return obj;
    });

    return {
      totalResults: results.length,
      episodes: results
    };
  }

  // getEpisodeDetail(episodeId)
  getEpisodeDetail(episodeId) {
    const episodes = this._getFromStorage('episodes');
    const shows = this._getFromStorage('shows');
    const queueItems = this._getFromStorage('listening_queue_items');

    const e = episodes.find((ep) => ep.id === episodeId) || null;
    if (!e) {
      return {
        episode: null,
        is_in_queue: false
      };
    }
    const show = shows.find((s) => s.id === e.show_id) || {};
    const is_in_queue = queueItems.some((qi) => qi.episode_id === episodeId);

    return {
      episode: {
        id: e.id,
        title: e.title,
        description: e.description || '',
        air_datetime: e.air_datetime,
        duration_minutes: e.duration_minutes,
        category: e.category,
        audio_url: e.audio_url || '',
        show_id: e.show_id,
        show_title: show.title || ''
      },
      is_in_queue
    };
  }

  // addEpisodeToListeningQueue(episodeId)
  addEpisodeToListeningQueue(episodeId) {
    const episodes = this._getFromStorage('episodes');
    const episode = episodes.find((e) => e.id === episodeId);
    if (!episode) {
      return { success: false, queue_id: null, position: null, message: 'episode_not_found' };
    }

    const queue = this._getOrCreateListeningQueue();
    let items = this._getFromStorage('listening_queue_items');
    const existingForQueue = items.filter((i) => i.queue_id === queue.id);
    const position = existingForQueue.length;

    const item = {
      id: this._generateId('qitem'),
      queue_id: queue.id,
      episode_id: episodeId,
      position,
      added_at: this._nowISO(),
      is_played: false
    };

    items.push(item);
    this._saveToStorage('listening_queue_items', items);

    let queues = this._getFromStorage('listening_queue');
    queues = queues.map((q) => (q.id === queue.id ? { ...q, updated_at: this._nowISO() } : q));
    this._saveToStorage('listening_queue', queues);

    return { success: true, queue_id: queue.id, position, message: 'added_to_queue' };
  }

  // getListeningQueue()
  getListeningQueue() {
    const queue = this._getOrCreateListeningQueue();
    const episodes = this._getFromStorage('episodes');
    const shows = this._getFromStorage('shows');
    let items = this._getFromStorage('listening_queue_items');

    items = items
      .filter((i) => i.queue_id === queue.id)
      .sort((a, b) => a.position - b.position);

    const resultItems = items.map((i) => {
      const episode = episodes.find((e) => e.id === i.episode_id) || {};
      const show = shows.find((s) => s.id === episode.show_id) || {};
      let obj = {
        queue_item_id: i.id,
        episode_id: i.episode_id,
        episode_title: episode.title || '',
        show_title: show.title || '',
        position: i.position,
        duration_minutes: episode.duration_minutes || 0,
        added_at: i.added_at,
        is_played: !!i.is_played
      };
      obj = this._resolveForeignKey(obj, 'episode_id', episodes);
      return obj;
    });

    return {
      queue_id: queue.id,
      created_at: queue.created_at,
      updated_at: queue.updated_at,
      items: resultItems
    };
  }

  // removeListeningQueueItem(queueItemId)
  removeListeningQueueItem(queueItemId) {
    let items = this._getFromStorage('listening_queue_items');
    const item = items.find((i) => i.id === queueItemId);
    if (!item) {
      return { success: false, message: 'queue_item_not_found' };
    }
    const queueId = item.queue_id;
    items = items.filter((i) => i.id !== queueItemId);

    const sameQueue = items
      .filter((i) => i.queue_id === queueId)
      .sort((a, b) => a.position - b.position);
    sameQueue.forEach((i, idx) => {
      i.position = idx;
    });

    this._saveToStorage('listening_queue_items', items);

    return { success: true, message: 'removed_from_queue' };
  }

  // reorderListeningQueue(orderedQueueItemIds)
  reorderListeningQueue(orderedQueueItemIds) {
    if (!Array.isArray(orderedQueueItemIds)) {
      return { success: false, updated_items: [], message: 'invalid_input' };
    }
    let items = this._getFromStorage('listening_queue_items');
    const idToItem = new Map(items.map((i) => [i.id, i]));

    orderedQueueItemIds.forEach((id, idx) => {
      const item = idToItem.get(id);
      if (item) {
        item.position = idx;
      }
    });

    this._saveToStorage('listening_queue_items', items);

    const updated_items = orderedQueueItemIds
      .map((id) => idToItem.get(id))
      .filter(Boolean)
      .map((i) => ({ queue_item_id: i.id, episode_id: i.episode_id, position: i.position }));

    return { success: true, updated_items, message: 'queue_reordered' };
  }

  // getCommunityBulletinFilterOptions()
  getCommunityBulletinFilterOptions() {
    const categoriesEnum = [
      'music_concert',
      'arts_culture',
      'community_meeting',
      'sports_recreation',
      'other'
    ];
    const categories = categoriesEnum.map((code) => ({ code, label: this._titleCase(code) }));

    const today = new Date();
    const end = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
    const yyyyMmDd = (d) => d.toISOString().slice(0, 10);

    const datePresets = [
      {
        code: 'next_30_days',
        label: 'Next 30 days',
        start_date: yyyyMmDd(today),
        end_date: yyyyMmDd(end)
      }
    ];

    return { categories, datePresets };
  }

  // listCommunityBulletinEvents(category, startDate, endDate)
  listCommunityBulletinEvents(category, startDate, endDate) {
    const events = this._getFromStorage('community_bulletin_events');

    const start = this._startOfDay(startDate);
    const end = this._endOfDay(endDate);

    let filtered = events.filter((e) => e.status === 'approved');

    if (category) {
      filtered = filtered.filter((e) => e.category === category);
    }
    if (start) {
      filtered = filtered.filter((e) => this._toDate(e.start_datetime) >= start);
    }
    if (end) {
      filtered = filtered.filter((e) => this._toDate(e.start_datetime) <= end);
    }

    filtered.sort((a, b) => (a.start_datetime > b.start_datetime ? 1 : -1));

    const results = filtered.map((e) => ({
      bulletin_event_id: e.id,
      title: e.title,
      description_snippet: (e.description || '').slice(0, 160),
      category: e.category,
      start_datetime: e.start_datetime,
      end_datetime: e.end_datetime || null,
      location_name: e.location_name || '',
      city: e.city || '',
      state: e.state || '',
      cost_type: e.cost_type,
      is_free: e.cost_type === 'free',
      status: e.status
    }));

    return {
      totalResults: results.length,
      events: results
    };
  }

  // submitCommunityBulletinEvent(title, description, category, startDateTime, endDateTime, locationName, addressLine1, city, state, postalCode, costType, priceMin, priceMax, contactEmail)
  submitCommunityBulletinEvent(
    title,
    description,
    category,
    startDateTime,
    endDateTime,
    locationName,
    addressLine1,
    city,
    state,
    postalCode,
    costType,
    priceMin,
    priceMax,
    contactEmail
  ) {
    const events = this._getFromStorage('community_bulletin_events');

    const bulletin_event = {
      id: this._generateId('cb'),
      title,
      description,
      category,
      start_datetime: startDateTime,
      end_datetime: endDateTime || null,
      location_name: locationName || '',
      address_line1: addressLine1 || '',
      city: city || '',
      state: state || '',
      postal_code: postalCode || '',
      cost_type: costType,
      price_min: typeof priceMin === 'number' ? priceMin : null,
      price_max: typeof priceMax === 'number' ? priceMax : null,
      contact_email: contactEmail,
      submitted_at: this._nowISO(),
      status: 'approved',
      source: 'community_submission'
    };

    events.push(bulletin_event);
    this._saveToStorage('community_bulletin_events', events);

    return { success: true, bulletin_event, message: 'community_event_submitted' };
  }

  // getShowDirectoryFilterOptions()
  getShowDirectoryFilterOptions() {
    const shows = this._getFromStorage('shows');
    const genreSet = new Set();
    const formatSet = new Set();

    shows.forEach((s) => {
      if (s.primary_genre) genreSet.add(s.primary_genre);
      if (s.format) formatSet.add(s.format);
    });

    const genres = Array.from(genreSet).map((code) => ({ code, label: this._titleCase(code) }));
    const formats = Array.from(formatSet).map((code) => ({ code, label: this._titleCase(code) }));

    const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((code) => ({
      code,
      label: this._titleCase(code)
    }));

    return { genres, formats, daysOfWeek };
  }

  // searchShows(query, primaryGenre, format, dayOfWeek)
  searchShows(query, primaryGenre, format, dayOfWeek) {
    const shows = this._getFromStorage('shows');
    const slots = this._getFromStorage('schedule_slots');

    const q = (query || '').toLowerCase();

    let filtered = shows.filter((s) => s.is_active);

    if (q) {
      filtered = filtered.filter((s) => {
        const hay = (s.title + ' ' + (s.description || '')).toLowerCase();
        return hay.includes(q);
      });
    }
    if (primaryGenre) {
      filtered = filtered.filter((s) => s.primary_genre === primaryGenre);
    }
    if (format) {
      filtered = filtered.filter((s) => s.format === format);
    }
    if (dayOfWeek) {
      const showIdSet = new Set(slots.filter((sl) => sl.day_of_week === dayOfWeek).map((sl) => sl.show_id));
      filtered = filtered.filter((s) => showIdSet.has(s.id));
    }

    const results = filtered.map((s) => {
      const showSlots = slots.filter((sl) => sl.show_id === s.id);
      let typical_air_times = '';
      if (showSlots.length) {
        const distinct = {};
        showSlots.forEach((sl) => {
          const key = sl.day_of_week + sl.start_time;
          if (!distinct[key]) distinct[key] = sl;
        });
        const sample = Object.values(distinct).slice(0, 2);
        typical_air_times = sample
          .map((sl) => this._titleCase(sl.day_of_week) + ' ' + (sl.start_time || '') + '-' + (sl.end_time || ''))
          .join(', ');
      }
      let obj = {
        show_id: s.id,
        title: s.title,
        primary_genre: s.primary_genre,
        format: s.format,
        brief_description: (s.description || '').slice(0, 200),
        typical_air_times,
        is_active: !!s.is_active
      };
      obj = this._resolveForeignKey(obj, 'show_id', shows);
      return obj;
    });

    return {
      totalResults: results.length,
      shows: results
    };
  }

  // submitSongRequest(showId, songTitle, artistName, preferredAirDate, preferredTimeWindow, dedicationMessage, requesterName, requesterEmail)
  submitSongRequest(
    showId,
    songTitle,
    artistName,
    preferredAirDate,
    preferredTimeWindow,
    dedicationMessage,
    requesterName,
    requesterEmail
  ) {
    const shows = this._getFromStorage('shows');
    const requests = this._getFromStorage('song_requests');

    const show = shows.find((s) => s.id === showId);
    if (!show) {
      return { success: false, song_request: null, message: 'show_not_found' };
    }
    if (!show.allows_song_requests) {
      return { success: false, song_request: null, message: 'song_requests_not_allowed' };
    }

    const preferred_air_date = preferredAirDate ? preferredAirDate + 'T00:00:00' : this._nowISO();

    const song_request = {
      id: this._generateId('req'),
      show_id: showId,
      song_title: songTitle,
      artist_name: artistName,
      preferred_air_date,
      preferred_time_window: preferredTimeWindow,
      dedication_message: dedicationMessage || '',
      requester_name: requesterName,
      requester_email: requesterEmail || '',
      created_at: this._nowISO(),
      status: 'submitted'
    };

    requests.push(song_request);
    this._saveToStorage('song_requests', requests);

    return { success: true, song_request, message: 'song_request_submitted' };
  }

  // getDonationFormOptions()
  getDonationFormOptions() {
    const donation_funds = this._getFromStorage('donation_funds');

    const presetAmounts = [10, 25, 50, 100];
    const donationTypes = [
      { code: 'one_time', label: 'One-time' },
      { code: 'monthly', label: 'Monthly' },
      { code: 'annual', label: 'Annual' }
    ];

    const funds = donation_funds.map((f) => ({
      fund_id: f.id,
      code: f.code,
      name: f.name,
      description: f.description || '',
      is_default: !!f.is_default
    }));

    const defaultAmount = 25;
    const defaultDonationType = 'one_time';
    const defaultFund = donation_funds.find((f) => f.is_default) || donation_funds[0] || null;
    const defaultFundId = defaultFund ? defaultFund.id : null;

    const paymentMethods = [
      { code: 'credit_card', label: 'Credit/Debit Card' },
      { code: 'bank_transfer', label: 'Bank Transfer' },
      { code: 'paypal', label: 'PayPal' }
    ];

    return {
      presetAmounts,
      donationTypes,
      funds,
      defaultAmount,
      defaultDonationType,
      defaultFundId,
      paymentMethods
    };
  }

  // submitDonation(amount, donationType, fundId, donorName, donorEmail, paymentMethod, cardNumber, cardExpiration, cardSecurityCode, billingPostalCode)
  submitDonation(
    amount,
    donationType,
    fundId,
    donorName,
    donorEmail,
    paymentMethod,
    cardNumber,
    cardExpiration,
    cardSecurityCode,
    billingPostalCode
  ) {
    const donation_funds = this._getFromStorage('donation_funds');
    const donations = this._getFromStorage('donations');

    if (!(amount > 0)) {
      return { success: false, donation: null, message: 'invalid_amount', receiptEmailSent: false };
    }
    const fund = donation_funds.find((f) => f.id === fundId);
    if (!fund) {
      return { success: false, donation: null, message: 'fund_not_found', receiptEmailSent: false };
    }

    const paymentResult = this._processCreditCardPayment(
      paymentMethod,
      cardNumber,
      cardExpiration,
      cardSecurityCode,
      billingPostalCode,
      amount
    );

    if (!paymentResult.success) {
      const donation = {
        id: this._generateId('don'),
        amount,
        donation_type: donationType,
        fund_id: fundId,
        donor_name: donorName,
        donor_email: donorEmail,
        payment_method: paymentMethod,
        card_last4: null,
        card_expiration: null,
        billing_postal_code: billingPostalCode || '',
        created_at: this._nowISO(),
        status: 'failed'
      };
      donations.push(donation);
      this._saveToStorage('donations', donations);
      return { success: false, donation, message: paymentResult.message || 'payment_failed', receiptEmailSent: false };
    }

    const donation = {
      id: this._generateId('don'),
      amount,
      donation_type: donationType,
      fund_id: fundId,
      donor_name: donorName,
      donor_email: donorEmail,
      payment_method: paymentMethod,
      card_last4: paymentResult.card_last4,
      card_expiration: paymentResult.card_expiration,
      billing_postal_code: paymentResult.billing_postal_code,
      created_at: this._nowISO(),
      status: 'completed'
    };

    donations.push(donation);
    this._saveToStorage('donations', donations);

    return { success: true, donation, message: 'donation_completed', receiptEmailSent: true };
  }

  // getVolunteerPageContent()
  getVolunteerPageContent() {
    const rolesRaw = this._getFromStorage('volunteer_roles');
    const roles = rolesRaw.map((r) => ({
      role_id: r.id,
      code: r.code,
      name: r.name,
      description: r.description || '',
      is_active: !!r.is_active,
      time_commitment: r.time_commitment || '',
      requirements: r.requirements || ''
    }));

    const availabilityOptions = [
      { code: 'monday_evening', label: 'Monday evenings', description: 'Evening shifts on Mondays' },
      { code: 'tuesday_evening', label: 'Tuesday evenings', description: 'Evening shifts on Tuesdays' },
      { code: 'wednesday_evening', label: 'Wednesday evenings', description: 'Evening shifts on Wednesdays' },
      { code: 'thursday_evening', label: 'Thursday evenings', description: 'Evening shifts on Thursdays' },
      { code: 'friday_evening', label: 'Friday evenings', description: 'Evening shifts on Fridays' }
    ];

    const introText =
      'Volunteer with our community radio station to support local music, news, and outreach.';

    return { introText, roles, availabilityOptions };
  }

  // submitVolunteerApplication(fullName, email, phone, roleCodes, availabilityCodes, motivationStatement)
  submitVolunteerApplication(fullName, email, phone, roleCodes, availabilityCodes, motivationStatement) {
    const applications = this._getFromStorage('volunteer_applications');

    const application = {
      id: this._generateId('volapp'),
      full_name: fullName,
      email: email,
      phone: phone || '',
      roles: Array.isArray(roleCodes) ? roleCodes : [],
      availability: Array.isArray(availabilityCodes) ? availabilityCodes : [],
      motivation_statement: motivationStatement,
      created_at: this._nowISO(),
      status: 'submitted'
    };

    applications.push(application);
    this._saveToStorage('volunteer_applications', applications);

    return { success: true, application, message: 'volunteer_application_submitted' };
  }

  // getNewsletterSignupOptions()
  getNewsletterSignupOptions() {
    const topicsRaw = this._getFromStorage('newsletter_topics');

    const frequencies = [
      { code: 'daily', label: 'Daily', description: 'Daily updates' },
      { code: 'weekly', label: 'Weekly', description: 'Weekly digest' },
      { code: 'monthly', label: 'Monthly', description: 'Monthly highlights' }
    ];

    const topics = topicsRaw.map((t) => ({
      topic_id: t.id,
      code: t.code,
      name: t.name,
      description: t.description || '',
      is_active: !!t.is_active
    }));

    return { frequencies, topics };
  }

  // subscribeToNewsletter(email, name, frequency, topicCodes, postalCode)
  subscribeToNewsletter(email, name, frequency, topicCodes, postalCode) {
    const subscriptions = this._getFromStorage('newsletter_subscriptions');

    const subscription = {
      id: this._generateId('nlsub'),
      email,
      name: name || '',
      frequency,
      topics: Array.isArray(topicCodes) ? topicCodes : [],
      postal_code: postalCode || '',
      created_at: this._nowISO(),
      is_confirmed: false
    };

    subscriptions.push(subscription);
    this._saveToStorage('newsletter_subscriptions', subscriptions);

    return {
      success: true,
      subscription,
      message: 'subscription_created',
      confirmationRequired: true
    };
  }

  // getCommunityPageContent()
  getCommunityPageContent() {
    const events = this._getFromStorage('events');
    const bulletin = this._getFromStorage('community_bulletin_events');

    const missionText =
      'Our community radio station connects neighbors through music, local news, and outreach.';

    const outreachHighlights = [];

    const streetTeamBlurb =
      'Join the Street Team to help with outreach at neighborhood events, concerts, and festivals.';

    const upcomingStationEvents = events
      .filter((e) => e.is_station_sponsored)
      .sort((a, b) => (a.start_datetime > b.start_datetime ? 1 : -1))
      .slice(0, 3)
      .map((e) => ({
        source: 'events',
        id: e.id,
        title: e.title,
        start_datetime: e.start_datetime,
        location_name: e.venue_name || '',
        is_free: e.cost_type === 'free'
      }));

    const upcomingBulletin = bulletin
      .filter((b) => b.status === 'approved')
      .sort((a, b2) => (a.start_datetime > b2.start_datetime ? 1 : -1))
      .slice(0, 3)
      .map((b) => ({
        source: 'community_bulletin',
        id: b.id,
        title: b.title,
        start_datetime: b.start_datetime,
        location_name: b.location_name || '',
        is_free: b.cost_type === 'free'
      }));

    const featuredCommunityEvents = [...upcomingStationEvents, ...upcomingBulletin].slice(0, 5);

    const keyLinks = [
      { code: 'community_bulletin', label: 'Community Bulletin' },
      { code: 'volunteer', label: 'Volunteer' }
    ];

    return {
      missionText,
      outreachHighlights,
      streetTeamBlurb,
      featuredCommunityEvents,
      keyLinks
    };
  }

  // getAboutPageContent()
  getAboutPageContent() {
    const missionText = localStorage.getItem('about_mission_text') || '';
    const historyTimeline = this._getFromStorage('about_history_timeline');
    const staffAndHosts = this._getFromStorage('about_staff_and_hosts');

    const relatedLinks = [
      { code: 'contact', label: 'Contact' },
      { code: 'volunteer', label: 'Volunteer' },
      { code: 'donate', label: 'Donate' }
    ];

    return { missionText, historyTimeline, staffAndHosts, relatedLinks };
  }

  // getContactPageContent()
  getContactPageContent() {
    const raw = localStorage.getItem('contact_page_content');
    let cfg = {};
    try {
      cfg = raw ? JSON.parse(raw) : {};
    } catch (e) {
      cfg = {};
    }

    const mainEmail = cfg.mainEmail || '';
    const mainPhone = cfg.mainPhone || '';
    const mailingAddress = cfg.mailingAddress || {
      line1: '',
      city: '',
      state: '',
      postalCode: ''
    };

    const topics = cfg.topics || [
      { code: 'programming', label: 'Programming', description: 'Questions about shows and schedule' },
      { code: 'events', label: 'Events', description: 'Questions about events and concerts' },
      { code: 'technical', label: 'Technical', description: 'Streaming or reception issues' },
      { code: 'other', label: 'Other', description: 'Anything else' }
    ];

    const supportLinks = cfg.supportLinks || [
      { code: 'faq', label: 'FAQ' },
      { code: 'policies', label: 'Policies' }
    ];

    return { mainEmail, mainPhone, mailingAddress, topics, supportLinks };
  }

  // submitContactForm(name, email, topicCode, subject, message)
  submitContactForm(name, email, topicCode, subject, message) {
    const inquiries = this._getFromStorage('contact_inquiries');
    const ticketId = this._generateId('ct');
    const record = {
      id: ticketId,
      name,
      email,
      topic_code: topicCode || '',
      subject,
      message,
      created_at: this._nowISO()
    };
    inquiries.push(record);
    this._saveToStorage('contact_inquiries', inquiries);

    return { success: true, ticketId, message: 'contact_submitted' };
  }

  // getSupportUnderwritingPageContent()
  getSupportUnderwritingPageContent() {
    const raw = localStorage.getItem('underwriting_page_content');
    let cfg = {};
    try {
      cfg = raw ? JSON.parse(raw) : {};
    } catch (e) {
      cfg = {};
    }

    const introText = cfg.introText || 'Promote your organization while supporting community radio.';
    const packages = cfg.packages || [];
    const contactEmail = cfg.contactEmail || '';
    const contactPhone = cfg.contactPhone || '';
    const relatedLinks = cfg.relatedLinks || [
      { code: 'donate', label: 'Donate' },
      { code: 'contact', label: 'Contact' }
    ];

    return { introText, packages, contactEmail, contactPhone, relatedLinks };
  }

  // submitUnderwritingInquiry(name, email, organization, budgetRange, message)
  submitUnderwritingInquiry(name, email, organization, budgetRange, message) {
    const inquiries = this._getFromStorage('underwriting_inquiries');
    const inquiryId = this._generateId('uw');
    const record = {
      id: inquiryId,
      name,
      email,
      organization: organization || '',
      budget_range: budgetRange || '',
      message,
      created_at: this._nowISO()
    };
    inquiries.push(record);
    this._saveToStorage('underwriting_inquiries', inquiries);

    return { success: true, inquiryId, message: 'underwriting_inquiry_submitted' };
  }

  // getFAQContent()
  getFAQContent() {
    const sections = this._getFromStorage('faq_sections');
    return { sections };
  }

  // getPoliciesContent(policyCode)
  getPoliciesContent(policyCode) {
    const policiesAll = this._getFromStorage('policies');
    let policies = policiesAll;
    if (policyCode && policyCode !== 'all') {
      policies = policiesAll.filter((p) => p.code === policyCode);
    }
    return { policies };
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
