/*
  BusinessLogic implementation for academic seminar schedule information website
  - Uses localStorage (with Node-compatible polyfill)
  - No DOM operations
  - All persistence via JSON-serializable objects in localStorage
*/

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

  // ----------------------
  // Storage initialization
  // ----------------------

  _initStorage() {
    const ensureArray = (key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    };

    // Core entities
    ensureArray('seminars');
    ensureArray('topics');
    ensureArray('speakers');
    ensureArray('buildings');
    ensureArray('registrations');

    // Personal collections
    ensureArray('schedule_items');
    ensureArray('bookmark_items');
    ensureArray('favorite_items');
    ensureArray('list_items');
    ensureArray('track_items');
    ensureArray('watchlist_items');

    // Listing configuration
    ensureArray('listing_configs');

    // Contact form submissions (for persistence)
    ensureArray('contact_form_submissions');

    // Maintain an ID counter for generated IDs
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

  // ---------------------------------
  // Generic helper utilities (private)
  // ---------------------------------

  _getOrCreatePersonalCollectionStore() {
    // In this single-user implementation, personal collections are just global arrays.
    // Ensure they exist and return the current snapshots.
    const schedule_items = this._getFromStorage('schedule_items');
    const bookmark_items = this._getFromStorage('bookmark_items');
    const favorite_items = this._getFromStorage('favorite_items');
    const list_items = this._getFromStorage('list_items');
    const track_items = this._getFromStorage('track_items');
    const watchlist_items = this._getFromStorage('watchlist_items');

    return {
      schedule_items,
      bookmark_items,
      favorite_items,
      list_items,
      track_items,
      watchlist_items
    };
  }

  _getDateOnlyString(dateTimeStr) {
    if (!dateTimeStr) return null;
    // Assume ISO string; take first 10 chars (yyyy-mm-dd)
    return String(dateTimeStr).slice(0, 10);
  }

  _parseDate(dateStr) {
    return dateStr ? new Date(dateStr) : null;
  }

  _formatDateDisplay(date) {
    if (!date) return '';
    // Simple ISO date (yyyy-mm-dd); can be adjusted to any human format
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  _formatTimeRangeDisplay(startStr, endStr) {
    if (!startStr || !endStr) return '';
    const start = new Date(startStr);
    const end = new Date(endStr);
    const toTime = (d) => {
      const h = String(d.getHours()).padStart(2, '0');
      const m = String(d.getMinutes()).padStart(2, '0');
      return `${h}:${m}`;
    };
    return `${toTime(start)} - ${toTime(end)}`;
  }

  _timeStringToMinutes(timeStr) {
    if (!timeStr) return null;
    const parts = String(timeStr).split(':');
    const h = parseInt(parts[0], 10) || 0;
    const m = parseInt(parts[1] || '0', 10) || 0;
    return h * 60 + m;
  }

  _getSeminarStartMinutes(seminar) {
    if (!seminar || !seminar.start_datetime) return null;
    const d = new Date(seminar.start_datetime);
    // Use UTC time so filters behave consistently regardless of server/local timezone
    return d.getUTCHours() * 60 + d.getUTCMinutes();
  }

  _applyDurationBucketFilter(seminar, duration_bucket) {
    if (!duration_bucket) return true;
    const duration = seminar.duration_minutes;
    if (duration == null) return false;

    if (duration_bucket === 'under_90_minutes') {
      return duration < 90;
    }
    if (duration_bucket === 'two_hours_or_longer') {
      return duration >= 120;
    }
    // Unknown bucket: do not filter
    return true;
  }

  _applySeminarFiltersAndSort(seminars, filters, sortKey) {
    const topics = this._getFromStorage('topics');
    const buildings = this._getFromStorage('buildings');

    const filterObj = filters || {};
    const {
      topicIds,
      level,
      duration_bucket,
      format,
      buildingId,
      session_type,
      offers_certificate,
      is_free,
      min_seats_remaining,
      start_time_from,
      start_time_to,
      tag_keywords,
      is_wheelchair_accessible,
      has_live_qa
    } = filterObj;

    const startFromMinutes = this._timeStringToMinutes(start_time_from);
    const startToMinutes = this._timeStringToMinutes(start_time_to);

    let result = seminars.filter((s) => {
      if (topicIds && topicIds.length && !topicIds.includes(s.topicId)) {
        return false;
      }
      if (level && s.level !== level) {
        return false;
      }
      if (duration_bucket && !this._applyDurationBucketFilter(s, duration_bucket)) {
        return false;
      }
      if (format && s.format !== format) {
        return false;
      }
      if (buildingId && s.buildingId !== buildingId) {
        return false;
      }
      if (session_type && s.session_type !== session_type) {
        return false;
      }
      if (typeof offers_certificate === 'boolean' && s.offers_certificate !== offers_certificate) {
        return false;
      }
      if (typeof is_free === 'boolean' && s.is_free !== is_free) {
        return false;
      }
      if (typeof min_seats_remaining === 'number') {
        if (typeof s.seats_remaining !== 'number' || s.seats_remaining < min_seats_remaining) {
          return false;
        }
      }
      if (typeof is_wheelchair_accessible === 'boolean') {
        if (s.is_wheelchair_accessible !== is_wheelchair_accessible) {
          return false;
        }
      }
      if (typeof has_live_qa === 'boolean') {
        if (s.has_live_qa !== has_live_qa) {
          return false;
        }
      }
      if (startFromMinutes != null || startToMinutes != null) {
        const startMinutes = this._getSeminarStartMinutes(s);
        if (startMinutes == null) return false;
        if (startFromMinutes != null && startMinutes < startFromMinutes) {
          return false;
        }
        if (startToMinutes != null && startMinutes >= startToMinutes) {
          return false;
        }
      }
      if (tag_keywords && tag_keywords.length) {
        const tags = (s.tags || []).map((t) => String(t).toLowerCase());
        const lowerKeywords = tag_keywords.map((k) => String(k).toLowerCase());
        const matches = lowerKeywords.some((kw) => tags.some((tag) => tag.includes(kw)));
        if (!matches) return false;
      }
      return true;
    });

    // Sorting
    const sort = sortKey || 'date_soonest';
    result = result.slice();
    if (sort === 'start_time_earliest' || sort === 'date_soonest') {
      result.sort((a, b) => {
        const da = new Date(a.start_datetime).getTime();
        const db = new Date(b.start_datetime).getTime();
        return da - db;
      });
    }
    // Additional sort keys could be implemented here if needed

    // Attach display fields (but not user-specific flags)
    return result.map((seminar) => this._formatSeminarForDisplay(seminar, topics, buildings));
  }

  _formatSeminarForDisplay(seminar, topicsCache, buildingsCache, speakersCache) {
    const topics = topicsCache || this._getFromStorage('topics');
    const buildings = buildingsCache || this._getFromStorage('buildings');
    const speakers = speakersCache || this._getFromStorage('speakers');

    const topic = topics.find((t) => t.id === seminar.topicId) || null;
    const building = seminar.buildingId
      ? buildings.find((b) => b.id === seminar.buildingId) || null
      : null;

    const speakerObjs = (seminar.speakerIds || [])
      .map((sid) => speakers.find((sp) => sp.id === sid) || null)
      .filter((sp) => sp);

    const primarySpeaker = speakerObjs.length ? speakerObjs[0] : null;

    const start = seminar.start_datetime ? new Date(seminar.start_datetime) : null;
    const end = seminar.end_datetime ? new Date(seminar.end_datetime) : null;

    return {
      seminar,
      topic_name: topic ? topic.name : '',
      primary_speaker_name: primarySpeaker ? primarySpeaker.full_name : '',
      speaker_names: speakerObjs.map((sp) => sp.full_name),
      building_name: building ? building.name : '',
      formatted_date: start ? this._formatDateDisplay(start) : '',
      formatted_time_range: start && end
        ? this._formatTimeRangeDisplay(seminar.start_datetime, seminar.end_datetime)
        : ''
    };
  }

  _detectScheduleConflicts(items) {
    // items: array of { schedule_item, seminar }
    const conflicts = new Set();

    const getContextDate = (schedule_item, seminar) => {
      if (schedule_item.day_date) {
        return this._getDateOnlyString(schedule_item.day_date);
      }
      return this._getDateOnlyString(seminar.start_datetime);
    };

    for (let i = 0; i < items.length; i++) {
      const a = items[i];
      if (!a.seminar) continue;
      const aStart = new Date(a.seminar.start_datetime).getTime();
      const aEnd = new Date(a.seminar.end_datetime).getTime();
      const aDate = getContextDate(a.schedule_item, a.seminar);

      for (let j = i + 1; j < items.length; j++) {
        const b = items[j];
        if (!b.seminar) continue;
        const bStart = new Date(b.seminar.start_datetime).getTime();
        const bEnd = new Date(b.seminar.end_datetime).getTime();
        const bDate = getContextDate(b.schedule_item, b.seminar);

        if (aDate && bDate && aDate === bDate) {
          const overlap = aStart < bEnd && bStart < aEnd;
          if (overlap) {
            conflicts.add(a.schedule_item.id);
            conflicts.add(b.schedule_item.id);
          }
        }
      }
    }

    return conflicts;
  }

  _updateSeatsRemainingOnRegistration(seminarId) {
    const seminars = this._getFromStorage('seminars');
    const idx = seminars.findIndex((s) => s.id === seminarId);
    if (idx === -1) {
      return { seats_capacity: null, seats_remaining: null };
    }
    const seminar = seminars[idx];
    const capacity = typeof seminar.seats_capacity === 'number' ? seminar.seats_capacity : null;
    let remaining = typeof seminar.seats_remaining === 'number' ? seminar.seats_remaining : 0;

    if (remaining > 0) {
      remaining -= 1;
      seminar.seats_remaining = remaining;
      seminars[idx] = seminar;
      this._saveToStorage('seminars', seminars);
    }

    return {
      seats_capacity: capacity,
      seats_remaining: remaining
    };
  }

  _getTodayIsoDate() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // ----------------------
  // Core interface methods
  // ----------------------

  // getHomeOverview()
  getHomeOverview() {
    const seminars = this._getFromStorage('seminars');
    const topics = this._getFromStorage('topics');
    const speakers = this._getFromStorage('speakers');
    const buildings = this._getFromStorage('buildings');

    // Personal collection counts
    const { schedule_items, bookmark_items, favorite_items, list_items, track_items, watchlist_items } =
      this._getOrCreatePersonalCollectionStore();

    // Featured seminars: pick earliest upcoming seminars
    const now = new Date().getTime();
    const upcoming = seminars
      .filter((s) => s.start_datetime && new Date(s.start_datetime).getTime() >= now)
      .sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime));

    const featured_seminars = upcoming.slice(0, 5).map((s) => {
      const base = this._formatSeminarForDisplay(s, topics, buildings, speakers);
      return {
        ...base,
        is_featured: true
      };
    });

    return {
      intro_title: 'Academic Seminar Program',
      intro_body: 'Browse upcoming academic seminars, workshops, and tutorials, and build your personal schedule.',
      featured_seminars,
      quick_search_default_date: this._getTodayIsoDate(),
      quick_search_topics: topics,
      personal_counts: {
        schedule_count: schedule_items.length,
        bookmarks_count: bookmark_items.length,
        favorites_count: favorite_items.length,
        my_list_count: list_items.length,
        track_count: track_items.length,
        watchlist_count: watchlist_items.length
      }
    };
  }

  // quickSearchSeminars(date, topicId, limit)
  quickSearchSeminars(date, topicId, limit) {
    const seminars = this._getFromStorage('seminars');
    const topics = this._getFromStorage('topics');
    const speakers = this._getFromStorage('speakers');
    const buildings = this._getFromStorage('buildings');

    const targetDate = date || this._getTodayIsoDate();

    const filtered = seminars.filter((s) => {
      const d = this._getDateOnlyString(s.start_datetime);
      if (d !== targetDate) return false;
      if (topicId && s.topicId !== topicId) return false;
      return true;
    });

    filtered.sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime));

    const lim = typeof limit === 'number' ? limit : 10;

    const results = filtered.slice(0, lim).map((s) => {
      const base = this._formatSeminarForDisplay(s, topics, buildings, speakers);
      return {
        seminar: s,
        topic_name: base.topic_name,
        primary_speaker_name: base.primary_speaker_name,
        formatted_time_range: base.formatted_time_range,
        building_name: base.building_name
      };
    });

    return {
      results,
      total_count: filtered.length
    };
  }

  // getSeminarFilterOptions()
  getSeminarFilterOptions() {
    const topics = this._getFromStorage('topics');
    const buildings = this._getFromStorage('buildings');

    const duration_buckets = [
      {
        key: 'under_90_minutes',
        label: 'Under 90 minutes',
        min_minutes: 0,
        max_minutes: 89
      },
      {
        key: 'two_hours_or_longer',
        label: '2 hours or longer',
        min_minutes: 120,
        max_minutes: null
      }
    ];

    const seminars = this._getFromStorage('seminars');
    const allTags = new Set();
    seminars.forEach((s) => {
      (s.tags || []).forEach((t) => allTags.add(String(t)));
    });

    const sort_options = [
      { key: 'start_time_earliest', label: 'Start time: earliest first' },
      { key: 'date_soonest', label: 'Date: soonest first' }
    ];

    return {
      topics,
      levels: ['beginner', 'intermediate', 'advanced', 'all_levels'],
      formats: ['in_person', 'online', 'hybrid'],
      duration_buckets,
      buildings,
      session_types: ['seminar', 'workshop', 'lecture', 'panel', 'tutorial'],
      accessibility_options: {
        wheelchair_accessible_room: true,
        has_live_qa: true
      },
      price_filters: [
        { key: 'free', label: 'Free' },
        { key: 'paid', label: 'Paid' }
      ],
      tag_suggestions: Array.from(allTags),
      sort_options
    };
  }

  // getCalendarMonthSummary(month)
  getCalendarMonthSummary(month) {
    // month format: yyyy-mm
    const seminars = this._getFromStorage('seminars');
    const summaryMap = new Map();

    seminars.forEach((s) => {
      const dateStr = this._getDateOnlyString(s.start_datetime);
      if (!dateStr) return;
      if (!dateStr.startsWith(month + '-')) return;

      if (!summaryMap.has(dateStr)) {
        summaryMap.set(dateStr, {
          date: dateStr,
          seminar_count: 0,
          has_in_person: false,
          has_online: false,
          has_workshops: false
        });
      }
      const entry = summaryMap.get(dateStr);
      entry.seminar_count += 1;
      if (s.format === 'in_person') entry.has_in_person = true;
      if (s.format === 'online') entry.has_online = true;
      if (s.session_type === 'workshop') entry.has_workshops = true;
    });

    const days = Array.from(summaryMap.values()).sort((a, b) => (a.date < b.date ? -1 : 1));

    return {
      month,
      days
    };
  }

  // getCalendarDaySeminars(date, filters, sort)
  getCalendarDaySeminars(date, filters, sort) {
    const allSeminars = this._getFromStorage('seminars');
    const topics = this._getFromStorage('topics');
    const speakers = this._getFromStorage('speakers');
    const buildings = this._getFromStorage('buildings');

    const targetDate = date;
    const daySeminars = allSeminars.filter((s) => this._getDateOnlyString(s.start_datetime) === targetDate);

    const filteredDisplay = this._applySeminarFiltersAndSort(
      daySeminars,
      filters || {},
      sort || 'start_time_earliest'
    );

    const results = filteredDisplay.map((d) => ({
      seminar: d.seminar,
      topic_name: d.topic_name,
      primary_speaker_name: d.primary_speaker_name,
      formatted_time_range: d.formatted_time_range,
      building_name: d.building_name,
      is_in_person: d.seminar.format === 'in_person',
      seats_remaining: d.seminar.seats_remaining
    }));

    return {
      date: targetDate,
      applied_filters: {
        topicIds: (filters && filters.topicIds) || [],
        format: (filters && filters.format) || undefined,
        start_time_from: (filters && filters.start_time_from) || undefined,
        start_time_to: (filters && filters.start_time_to) || undefined
      },
      sort: sort || 'start_time_earliest',
      results
    };
  }

  // getDailyScheduleSeminars(date, filters, sort)
  getDailyScheduleSeminars(date, filters, sort) {
    const allSeminars = this._getFromStorage('seminars');
    const topics = this._getFromStorage('topics');
    const speakers = this._getFromStorage('speakers');
    const buildings = this._getFromStorage('buildings');

    const { schedule_items, list_items, track_items } = this._getOrCreatePersonalCollectionStore();

    const daySeminars = allSeminars.filter((s) => this._getDateOnlyString(s.start_datetime) === date);

    const appliedSort = sort || 'start_time_earliest';
    const filteredDisplay = this._applySeminarFiltersAndSort(
      daySeminars,
      filters || {},
      appliedSort
    );

    const results = filteredDisplay.map((d) => {
      const seminar = d.seminar;
      const inMyDay = schedule_items.some(
        (si) => si.seminarId === seminar.id && si.added_via === 'my_day' && this._getDateOnlyString(si.day_date) === date
      );
      const inMyList = list_items.some((li) => li.seminarId === seminar.id);
      const inMyTrack = track_items.some((ti) => ti.seminarId === seminar.id);

      return {
        seminar,
        topic_name: d.topic_name,
        primary_speaker_name: d.primary_speaker_name,
        formatted_time_range: d.formatted_time_range,
        duration_minutes: seminar.duration_minutes,
        building_name: d.building_name,
        is_wheelchair_accessible: seminar.is_wheelchair_accessible,
        has_live_qa: seminar.has_live_qa,
        already_in_my_day: inMyDay,
        already_in_my_list: inMyList,
        already_in_my_track: inMyTrack
      };
    });

    return {
      date,
      applied_filters: {
        topicIds: (filters && filters.topicIds) || [],
        session_type: (filters && filters.session_type) || undefined,
        is_wheelchair_accessible: (filters && filters.is_wheelchair_accessible) || undefined,
        has_live_qa: (filters && filters.has_live_qa) || undefined
      },
      sort: appliedSort,
      results
    };
  }

  // getSeminarListing(view_type, filters, sort, page, page_size)
  getSeminarListing(view_type, filters, sort, page, page_size) {
    const allSeminars = this._getFromStorage('seminars');
    const topics = this._getFromStorage('topics');
    const speakers = this._getFromStorage('speakers');
    const buildings = this._getFromStorage('buildings');

    const { schedule_items, bookmark_items, favorite_items } = this._getOrCreatePersonalCollectionStore();

    const filterObj = filters || {};

    // Date constraints (single date or date range)
    let byDate = allSeminars;
    if (filterObj.date) {
      const dateStr = filterObj.date;
      byDate = byDate.filter((s) => this._getDateOnlyString(s.start_datetime) === dateStr);
    } else if (filterObj.date_from || filterObj.date_to) {
      const fromStr = filterObj.date_from;
      const toStr = filterObj.date_to;
      byDate = byDate.filter((s) => {
        const dStr = this._getDateOnlyString(s.start_datetime);
        if (!dStr) return false;
        if (fromStr && dStr < fromStr) return false;
        if (toStr && dStr > toStr) return false;
        return true;
      });
    }

    const sortKey = sort || 'date_soonest';
    const displayItems = this._applySeminarFiltersAndSort(byDate, filterObj, sortKey);

    const total_count = displayItems.length;
    const p = page && page > 0 ? page : 1;
    const ps = page_size && page_size > 0 ? page_size : 20;
    const startIndex = (p - 1) * ps;
    const paged = displayItems.slice(startIndex, startIndex + ps);

    const results = paged.map((d) => {
      const seminar = d.seminar;
      const already_in_my_schedule = schedule_items.some(
        (si) => si.seminarId === seminar.id && si.added_via === 'my_schedule'
      );
      const already_bookmarked = bookmark_items.some((bi) => bi.seminarId === seminar.id);
      const already_favorited = favorite_items.some((fi) => fi.seminarId === seminar.id);

      const price_display = seminar.is_free
        ? 'Free'
        : seminar.price_amount != null
        ? `${seminar.price_amount} ${seminar.currency || ''}`.trim()
        : '';

      const accessibility_badges = [];
      if (seminar.is_wheelchair_accessible) accessibility_badges.push('Wheelchair accessible');
      if (seminar.has_live_qa) accessibility_badges.push('Includes live Q&A');

      return {
        seminar,
        topic_name: d.topic_name,
        speaker_names: d.speaker_names,
        primary_speaker_name: d.primary_speaker_name,
        building_name: d.building_name,
        formatted_date: d.formatted_date,
        formatted_time_range: d.formatted_time_range,
        accessibility_badges,
        price_display,
        seats_remaining: seminar.seats_remaining,
        already_in_my_schedule,
        already_bookmarked,
        already_favorited
      };
    });

    return {
      view_type: view_type || 'seminar_list',
      applied_filters: {
        date: filterObj.date || undefined,
        date_from: filterObj.date_from || undefined,
        date_to: filterObj.date_to || undefined,
        topicIds: filterObj.topicIds || [],
        level: filterObj.level || undefined,
        duration_bucket: filterObj.duration_bucket || undefined,
        format: filterObj.format || undefined,
        buildingId: filterObj.buildingId || undefined,
        session_type: filterObj.session_type || undefined,
        offers_certificate: filterObj.offers_certificate,
        is_free: filterObj.is_free,
        min_seats_remaining: filterObj.min_seats_remaining,
        start_time_from: filterObj.start_time_from,
        start_time_to: filterObj.start_time_to,
        tag_keywords: filterObj.tag_keywords || []
      },
      sort: sortKey,
      page: p,
      page_size: ps,
      total_count,
      results
    };
  }

  // advancedSearchSeminars(month, date_from, date_to, filters, sort, page, page_size)
  advancedSearchSeminars(month, date_from, date_to, filters, sort, page, page_size) {
    const allSeminars = this._getFromStorage('seminars');

    const filterObj = filters || {};

    // Derive date bounds
    let applied_month = null;
    let fromStr = null;
    let toStr = null;

    if (date_from || date_to) {
      fromStr = date_from || null;
      toStr = date_to || null;
    } else if (month) {
      applied_month = month;
    }

    let byDate = allSeminars;
    if (fromStr || toStr) {
      byDate = byDate.filter((s) => {
        const dStr = this._getDateOnlyString(s.start_datetime);
        if (!dStr) return false;
        if (fromStr && dStr < fromStr) return false;
        if (toStr && dStr > toStr) return false;
        return true;
      });
    } else if (applied_month) {
      byDate = byDate.filter((s) => {
        const dStr = this._getDateOnlyString(s.start_datetime);
        return dStr && dStr.startsWith(applied_month + '-');
      });
    }

    const sortKey = sort || 'start_time_earliest';
    const displayItems = this._applySeminarFiltersAndSort(byDate, filterObj, sortKey);

    const total_count = displayItems.length;
    const p = page && page > 0 ? page : 1;
    const ps = page_size && page_size > 0 ? page_size : 20;
    const startIndex = (p - 1) * ps;
    const paged = displayItems.slice(startIndex, startIndex + ps);

    const topics = this._getFromStorage('topics');
    const buildings = this._getFromStorage('buildings');
    const speakers = this._getFromStorage('speakers');
    const { watchlist_items, schedule_items } = this._getOrCreatePersonalCollectionStore();

    const results = paged.map((d) => {
      const seminar = d.seminar;
      const base = this._formatSeminarForDisplay(seminar, topics, buildings, speakers);
      const is_free = seminar.is_free;
      const price_display = is_free
        ? 'Free'
        : seminar.price_amount != null
        ? `${seminar.price_amount} ${seminar.currency || ''}`.trim()
        : '';
      const already_in_watchlist = watchlist_items.some((wi) => wi.seminarId === seminar.id);
      const already_in_my_schedule = schedule_items.some(
        (si) => si.seminarId === seminar.id && si.added_via === 'my_schedule'
      );

      return {
        seminar,
        topic_name: base.topic_name,
        primary_speaker_name: base.primary_speaker_name,
        formatted_date: base.formatted_date,
        formatted_time_range: base.formatted_time_range,
        building_name: base.building_name,
        price_display,
        is_free,
        already_in_watchlist,
        already_in_my_schedule
      };
    });

    return {
      applied_month: applied_month,
      applied_date_from: fromStr,
      applied_date_to: toStr,
      applied_filters: {
        topicIds: filterObj.topicIds || [],
        format: filterObj.format || undefined,
        level: filterObj.level || undefined,
        duration_bucket: filterObj.duration_bucket || undefined,
        is_free: filterObj.is_free,
        offers_certificate: filterObj.offers_certificate,
        tag_keywords: filterObj.tag_keywords || []
      },
      sort: sortKey,
      page: p,
      page_size: ps,
      total_count,
      results
    };
  }

  // searchSpeakers(query, filters, page, page_size)
  searchSpeakers(query, filters, page, page_size) {
    const speakers = this._getFromStorage('speakers');
    const seminars = this._getFromStorage('seminars');

    const filterObj = filters || {};
    const q = (query || '').toLowerCase();

    let resultsArr = speakers.filter((s) => {
      if (q) {
        if (!s.full_name || !s.full_name.toLowerCase().includes(q)) return false;
      }
      if (filterObj.department && s.department !== filterObj.department) return false;
      if (filterObj.affiliation && s.affiliation !== filterObj.affiliation) return false;
      if (filterObj.topicIds && filterObj.topicIds.length) {
        const topicIds = filterObj.topicIds;
        // A speaker matches if any of their upcoming seminars has one of these topics
        const spSeminars = seminars.filter((sem) => (sem.speakerIds || []).includes(s.id));
        const hasTopic = spSeminars.some((sem) => topicIds.includes(sem.topicId));
        if (!hasTopic) return false;
      }
      return true;
    });

    const total_count = resultsArr.length;
    const p = page && page > 0 ? page : 1;
    const ps = page_size && page_size > 0 ? page_size : 30;
    const startIndex = (p - 1) * ps;
    resultsArr = resultsArr.slice(startIndex, startIndex + ps);

    const suggestions = resultsArr.map((s) => ({
      speaker_id: s.id,
      display_name: s.full_name
    }));

    return {
      results: resultsArr,
      total_count,
      suggestions
    };
  }

  // getSpeakerProfile(speakerId)
  getSpeakerProfile(speakerId) {
    const speakers = this._getFromStorage('speakers');
    const seminars = this._getFromStorage('seminars');
    const topics = this._getFromStorage('topics');
    const buildings = this._getFromStorage('buildings');

    const speaker = speakers.find((s) => s.id === speakerId) || null;

    const now = new Date().getTime();
    const speakerSeminars = seminars.filter((sem) => (sem.speakerIds || []).includes(speakerId));

    const upcoming_seminars = [];
    const past_seminars = [];

    speakerSeminars.forEach((sem) => {
      const startTime = sem.start_datetime ? new Date(sem.start_datetime).getTime() : 0;
      const topic = topics.find((t) => t.id === sem.topicId) || null;
      const building = sem.buildingId
        ? buildings.find((b) => b.id === sem.buildingId) || null
        : null;
      const formatted_date = sem.start_datetime
        ? this._formatDateDisplay(new Date(sem.start_datetime))
        : '';
      const formatted_time_range = sem.start_datetime && sem.end_datetime
        ? this._formatTimeRangeDisplay(sem.start_datetime, sem.end_datetime)
        : '';

      const entry = {
        seminar: sem,
        topic_name: topic ? topic.name : '',
        formatted_date,
        formatted_time_range,
        duration_minutes: sem.duration_minutes,
        building_name: building ? building.name : ''
      };

      if (startTime >= now) {
        upcoming_seminars.push(entry);
      } else {
        past_seminars.push(entry);
      }
    });

    upcoming_seminars.sort((a, b) => new Date(a.seminar.start_datetime) - new Date(b.seminar.start_datetime));
    past_seminars.sort((a, b) => new Date(b.seminar.start_datetime) - new Date(a.seminar.start_datetime));

    return {
      speaker,
      upcoming_seminars,
      past_seminars
    };
  }

  // getSeminarDetail(seminarId)
  getSeminarDetail(seminarId) {
    const seminars = this._getFromStorage('seminars');
    const topics = this._getFromStorage('topics');
    const speakers = this._getFromStorage('speakers');
    const buildings = this._getFromStorage('buildings');

    const seminar = seminars.find((s) => s.id === seminarId) || null;
    if (!seminar) {
      return {
        seminar: null,
        topic_name: '',
        speaker_profiles: [],
        building_name: '',
        building_accessibility: {
          is_wheelchair_accessible: false,
          has_assistive_listening: false,
          has_captioning: false,
          accessibility_notes: ''
        },
        formatted_date: '',
        formatted_time_range: '',
        duration_display: '',
        price_display: '',
        seat_status: {
          seats_capacity: null,
          seats_remaining: null
        },
        tags: [],
        user_flags: {
          in_my_schedule: false,
          in_my_day: false,
          in_my_track: false,
          in_my_list: false,
          bookmarked: false,
          favorited: false,
          in_watchlist: false
        }
      };
    }

    const topic = topics.find((t) => t.id === seminar.topicId) || null;
    const speaker_profiles = (seminar.speakerIds || [])
      .map((sid) => speakers.find((sp) => sp.id === sid) || null)
      .filter((sp) => sp);
    const building = seminar.buildingId
      ? buildings.find((b) => b.id === seminar.buildingId) || null
      : null;

    const formatted_date = seminar.start_datetime
      ? this._formatDateDisplay(new Date(seminar.start_datetime))
      : '';
    const formatted_time_range = seminar.start_datetime && seminar.end_datetime
      ? this._formatTimeRangeDisplay(seminar.start_datetime, seminar.end_datetime)
      : '';

    const duration_display = typeof seminar.duration_minutes === 'number'
      ? `${seminar.duration_minutes} minutes`
      : '';

    const price_display = seminar.is_free
      ? 'Free'
      : seminar.price_amount != null
      ? `${seminar.price_amount} ${seminar.currency || ''}`.trim()
      : '';

    const seat_status = {
      seats_capacity: seminar.seats_capacity != null ? seminar.seats_capacity : null,
      seats_remaining: seminar.seats_remaining != null ? seminar.seats_remaining : null
    };

    const { schedule_items, bookmark_items, favorite_items, list_items, track_items, watchlist_items } =
      this._getOrCreatePersonalCollectionStore();

    const in_my_schedule = schedule_items.some(
      (si) => si.seminarId === seminar.id && si.added_via === 'my_schedule'
    );
    const in_my_day = schedule_items.some(
      (si) => si.seminarId === seminar.id && si.added_via === 'my_day'
    );
    const in_my_track = track_items.some((ti) => ti.seminarId === seminar.id);
    const in_my_list = list_items.some((li) => li.seminarId === seminar.id);
    const bookmarked = bookmark_items.some((bi) => bi.seminarId === seminar.id);
    const favorited = favorite_items.some((fi) => fi.seminarId === seminar.id);
    const in_watchlist = watchlist_items.some((wi) => wi.seminarId === seminar.id);

    return {
      seminar,
      topic_name: topic ? topic.name : '',
      speaker_profiles,
      building_name: building ? building.name : '',
      building_accessibility: {
        is_wheelchair_accessible: building ? !!building.is_wheelchair_accessible : false,
        has_assistive_listening: building ? !!building.has_assistive_listening : false,
        has_captioning: building ? !!building.has_captioning : false,
        accessibility_notes: building ? building.accessibility_notes || '' : ''
      },
      formatted_date,
      formatted_time_range,
      duration_display,
      price_display,
      seat_status,
      tags: seminar.tags || [],
      user_flags: {
        in_my_schedule,
        in_my_day,
        in_my_track,
        in_my_list,
        bookmarked,
        favorited,
        in_watchlist
      }
    };
  }

  // addSeminarToMySchedule(seminarId)
  addSeminarToMySchedule(seminarId) {
    const seminars = this._getFromStorage('seminars');
    const seminar = seminars.find((s) => s.id === seminarId) || null;
    if (!seminar) {
      return { success: false, schedule_item: null, message: 'Seminar not found' };
    }

    const schedule_items = this._getFromStorage('schedule_items');
    const existing = schedule_items.find(
      (si) => si.seminarId === seminarId && si.added_via === 'my_schedule'
    );
    if (existing) {
      return { success: true, schedule_item: existing, message: 'Already in My Schedule' };
    }

    const newItem = {
      id: this._generateId('schedule'),
      seminarId,
      added_via: 'my_schedule',
      day_date: null,
      added_at: new Date().toISOString()
    };
    schedule_items.push(newItem);
    this._saveToStorage('schedule_items', schedule_items);

    return { success: true, schedule_item: newItem, message: 'Added to My Schedule' };
  }

  // addSeminarToMyDay(seminarId, day_date)
  addSeminarToMyDay(seminarId, day_date) {
    const seminars = this._getFromStorage('seminars');
    const seminar = seminars.find((s) => s.id === seminarId) || null;
    if (!seminar) {
      return { success: false, schedule_item: null, message: 'Seminar not found' };
    }

    const schedule_items = this._getFromStorage('schedule_items');
    const dateOnly = this._getDateOnlyString(day_date || seminar.start_datetime);

    const existing = schedule_items.find(
      (si) =>
        si.seminarId === seminarId &&
        si.added_via === 'my_day' &&
        this._getDateOnlyString(si.day_date) === dateOnly
    );
    if (existing) {
      return { success: true, schedule_item: existing, message: 'Already in My Day' };
    }

    const newItem = {
      id: this._generateId('schedule'),
      seminarId,
      added_via: 'my_day',
      day_date: dateOnly,
      added_at: new Date().toISOString()
    };
    schedule_items.push(newItem);
    this._saveToStorage('schedule_items', schedule_items);

    return { success: true, schedule_item: newItem, message: 'Added to My Day' };
  }

  // removeScheduleItem(scheduleItemId)
  removeScheduleItem(scheduleItemId) {
    const schedule_items = this._getFromStorage('schedule_items');
    const idx = schedule_items.findIndex((si) => si.id === scheduleItemId);
    if (idx === -1) {
      return { success: false, message: 'Schedule item not found' };
    }
    schedule_items.splice(idx, 1);
    this._saveToStorage('schedule_items', schedule_items);
    return { success: true, message: 'Schedule item removed' };
  }

  // getMySchedule(view_mode, date_from, date_to)
  getMySchedule(view_mode, date_from, date_to) {
    const schedule_items = this._getFromStorage('schedule_items');
    const seminars = this._getFromStorage('seminars');
    const topics = this._getFromStorage('topics');
    const speakers = this._getFromStorage('speakers');
    const buildings = this._getFromStorage('buildings');

    const fromStr = date_from || null;
    const toStr = date_to || null;

    const scheduleWithSeminars = schedule_items
      .map((si) => {
        const seminar = seminars.find((s) => s.id === si.seminarId) || null;
        return { schedule_item: si, seminar };
      })
      .filter(({ seminar }) => seminar);

    let filtered = scheduleWithSeminars;
    if (fromStr || toStr) {
      filtered = filtered.filter(({ schedule_item, seminar }) => {
        const dateContext = schedule_item.day_date
          ? this._getDateOnlyString(schedule_item.day_date)
          : this._getDateOnlyString(seminar.start_datetime);
        if (!dateContext) return false;
        if (fromStr && dateContext < fromStr) return false;
        if (toStr && dateContext > toStr) return false;
        return true;
      });
    }

    filtered.sort((a, b) => {
      const da = new Date(a.seminar.start_datetime).getTime();
      const db = new Date(b.seminar.start_datetime).getTime();
      return da - db;
    });

    const conflictIds = this._detectScheduleConflicts(filtered);

    const items = filtered.map(({ schedule_item, seminar }) => {
      const topic = topics.find((t) => t.id === seminar.topicId) || null;
      const speakerObjs = (seminar.speakerIds || [])
        .map((sid) => speakers.find((sp) => sp.id === sid) || null)
        .filter((sp) => sp);
      const primarySpeaker = speakerObjs.length ? speakerObjs[0] : null;
      const building = seminar.buildingId
        ? buildings.find((b) => b.id === seminar.buildingId) || null
        : null;

      const formatted_date = seminar.start_datetime
        ? this._formatDateDisplay(new Date(seminar.start_datetime))
        : '';
      const formatted_time_range = seminar.start_datetime && seminar.end_datetime
        ? this._formatTimeRangeDisplay(seminar.start_datetime, seminar.end_datetime)
        : '';

      return {
        schedule_item,
        seminar,
        topic_name: topic ? topic.name : '',
        primary_speaker_name: primarySpeaker ? primarySpeaker.full_name : '',
        formatted_date,
        formatted_time_range,
        building_name: building ? building.name : '',
        collection_type: schedule_item.added_via,
        has_time_conflict: conflictIds.has(schedule_item.id)
      };
    });

    return {
      view_mode: view_mode || 'agenda',
      items
    };
  }

  // addSeminarToBookmarks(seminarId)
  addSeminarToBookmarks(seminarId) {
    const seminars = this._getFromStorage('seminars');
    const seminar = seminars.find((s) => s.id === seminarId) || null;
    if (!seminar) {
      return { success: false, bookmark_item: null, message: 'Seminar not found' };
    }

    const bookmark_items = this._getFromStorage('bookmark_items');
    const existing = bookmark_items.find((bi) => bi.seminarId === seminarId);
    if (existing) {
      return { success: true, bookmark_item: existing, message: 'Already bookmarked' };
    }

    const newItem = {
      id: this._generateId('bookmark'),
      seminarId,
      added_at: new Date().toISOString()
    };
    bookmark_items.push(newItem);
    this._saveToStorage('bookmark_items', bookmark_items);

    return { success: true, bookmark_item: newItem, message: 'Bookmarked' };
  }

  // removeBookmark(bookmarkItemId)
  removeBookmark(bookmarkItemId) {
    const bookmark_items = this._getFromStorage('bookmark_items');
    const idx = bookmark_items.findIndex((bi) => bi.id === bookmarkItemId);
    if (idx === -1) {
      return { success: false, message: 'Bookmark not found' };
    }
    bookmark_items.splice(idx, 1);
    this._saveToStorage('bookmark_items', bookmark_items);
    return { success: true, message: 'Bookmark removed' };
  }

  // getMyBookmarks(sort, filters)
  getMyBookmarks(sort, filters) {
    const bookmark_items = this._getFromStorage('bookmark_items');
    const seminars = this._getFromStorage('seminars');
    const topics = this._getFromStorage('topics');
    const speakers = this._getFromStorage('speakers');

    const filterObj = filters || {};

    let resultsArr = bookmark_items
      .map((bi) => {
        const seminar = seminars.find((s) => s.id === bi.seminarId) || null;
        return { bookmark_item: bi, seminar };
      })
      .filter(({ seminar }) => seminar);

    if (filterObj.topicIds && filterObj.topicIds.length) {
      const topicIds = filterObj.topicIds;
      resultsArr = resultsArr.filter(({ seminar }) => topicIds.includes(seminar.topicId));
    }
    if (filterObj.speakerId) {
      const spId = filterObj.speakerId;
      resultsArr = resultsArr.filter(({ seminar }) => (seminar.speakerIds || []).includes(spId));
    }

    const sortKey = sort || 'date_soonest';
    resultsArr.sort((a, b) => {
      const da = new Date(a.seminar.start_datetime).getTime();
      const db = new Date(b.seminar.start_datetime).getTime();
      return da - db;
    });

    const results = resultsArr.map(({ bookmark_item, seminar }) => {
      const topic = topics.find((t) => t.id === seminar.topicId) || null;
      const speakerObjs = (seminar.speakerIds || [])
        .map((sid) => speakers.find((sp) => sp.id === sid) || null)
        .filter((sp) => sp);
      const primarySpeaker = speakerObjs.length ? speakerObjs[0] : null;
      const formatted_date = seminar.start_datetime
        ? this._formatDateDisplay(new Date(seminar.start_datetime))
        : '';
      const formatted_time_range = seminar.start_datetime && seminar.end_datetime
        ? this._formatTimeRangeDisplay(seminar.start_datetime, seminar.end_datetime)
        : '';

      return {
        bookmark_item,
        seminar,
        topic_name: topic ? topic.name : '',
        primary_speaker_name: primarySpeaker ? primarySpeaker.full_name : '',
        formatted_date,
        formatted_time_range
      };
    });

    return {
      sort: sortKey,
      results
    };
  }

  // addSeminarToFavorites(seminarId)
  addSeminarToFavorites(seminarId) {
    const seminars = this._getFromStorage('seminars');
    const seminar = seminars.find((s) => s.id === seminarId) || null;
    if (!seminar) {
      return { success: false, favorite_item: null, message: 'Seminar not found' };
    }

    const favorite_items = this._getFromStorage('favorite_items');
    const existing = favorite_items.find((fi) => fi.seminarId === seminarId);
    if (existing) {
      return { success: true, favorite_item: existing, message: 'Already favorited' };
    }

    const newItem = {
      id: this._generateId('favorite'),
      seminarId,
      added_at: new Date().toISOString()
    };
    favorite_items.push(newItem);
    this._saveToStorage('favorite_items', favorite_items);

    return { success: true, favorite_item: newItem, message: 'Marked as favorite' };
  }

  // removeFavorite(favoriteItemId)
  removeFavorite(favoriteItemId) {
    const favorite_items = this._getFromStorage('favorite_items');
    const idx = favorite_items.findIndex((fi) => fi.id === favoriteItemId);
    if (idx === -1) {
      return { success: false, message: 'Favorite not found' };
    }
    favorite_items.splice(idx, 1);
    this._saveToStorage('favorite_items', favorite_items);
    return { success: true, message: 'Favorite removed' };
  }

  // getFavorites(sort, filters)
  getFavorites(sort, filters) {
    const favorite_items = this._getFromStorage('favorite_items');
    const seminars = this._getFromStorage('seminars');
    const topics = this._getFromStorage('topics');
    const speakers = this._getFromStorage('speakers');

    const filterObj = filters || {};

    let resultsArr = favorite_items
      .map((fi) => {
        const seminar = seminars.find((s) => s.id === fi.seminarId) || null;
        return { favorite_item: fi, seminar };
      })
      .filter(({ seminar }) => seminar);

    if (filterObj.topicIds && filterObj.topicIds.length) {
      const topicIds = filterObj.topicIds;
      resultsArr = resultsArr.filter(({ seminar }) => topicIds.includes(seminar.topicId));
    }

    const sortKey = sort || 'date_soonest';
    resultsArr.sort((a, b) => {
      const da = new Date(a.seminar.start_datetime).getTime();
      const db = new Date(b.seminar.start_datetime).getTime();
      return da - db;
    });

    const results = resultsArr.map(({ favorite_item, seminar }) => {
      const topic = topics.find((t) => t.id === seminar.topicId) || null;
      const speakerObjs = (seminar.speakerIds || [])
        .map((sid) => speakers.find((sp) => sp.id === sid) || null)
        .filter((sp) => sp);
      const primarySpeaker = speakerObjs.length ? speakerObjs[0] : null;
      const formatted_date = seminar.start_datetime
        ? this._formatDateDisplay(new Date(seminar.start_datetime))
        : '';
      const formatted_time_range = seminar.start_datetime && seminar.end_datetime
        ? this._formatTimeRangeDisplay(seminar.start_datetime, seminar.end_datetime)
        : '';

      return {
        favorite_item,
        seminar,
        topic_name: topic ? topic.name : '',
        primary_speaker_name: primarySpeaker ? primarySpeaker.full_name : '',
        formatted_date,
        formatted_time_range
      };
    });

    return {
      sort: sortKey,
      results
    };
  }

  // addSeminarToMyList(seminarId, notes)
  addSeminarToMyList(seminarId, notes) {
    const seminars = this._getFromStorage('seminars');
    const seminar = seminars.find((s) => s.id === seminarId) || null;
    if (!seminar) {
      return { success: false, list_item: null, message: 'Seminar not found' };
    }

    const list_items = this._getFromStorage('list_items');
    const existing = list_items.find((li) => li.seminarId === seminarId);
    if (existing) {
      return { success: true, list_item: existing, message: 'Already in My List' };
    }

    const newItem = {
      id: this._generateId('list'),
      seminarId,
      added_at: new Date().toISOString(),
      notes: notes || ''
    };
    list_items.push(newItem);
    this._saveToStorage('list_items', list_items);

    return { success: true, list_item: newItem, message: 'Added to My List' };
  }

  // updateMyListItem(listItemId, notes, position)
  updateMyListItem(listItemId, notes, position) {
    const list_items = this._getFromStorage('list_items');
    const idx = list_items.findIndex((li) => li.id === listItemId);
    if (idx === -1) {
      return { success: false, list_item: null, message: 'List item not found' };
    }
    const item = list_items[idx];
    if (typeof notes === 'string') {
      item.notes = notes;
    }
    if (typeof position === 'number') {
      // Store position on the item; not part of original model but JSON-serializable
      item.position = position;
    }
    list_items[idx] = item;
    this._saveToStorage('list_items', list_items);

    return { success: true, list_item: item, message: 'List item updated' };
  }

  // removeMyListItem(listItemId)
  removeMyListItem(listItemId) {
    const list_items = this._getFromStorage('list_items');
    const idx = list_items.findIndex((li) => li.id === listItemId);
    if (idx === -1) {
      return { success: false, message: 'List item not found' };
    }
    list_items.splice(idx, 1);
    this._saveToStorage('list_items', list_items);
    return { success: true, message: 'List item removed' };
  }

  // getMyList()
  getMyList() {
    const list_items = this._getFromStorage('list_items');
    const seminars = this._getFromStorage('seminars');
    const topics = this._getFromStorage('topics');

    const results = list_items
      .map((li) => {
        const seminar = seminars.find((s) => s.id === li.seminarId) || null;
        if (!seminar) return null;
        const topic = topics.find((t) => t.id === seminar.topicId) || null;
        const formatted_date = seminar.start_datetime
          ? this._formatDateDisplay(new Date(seminar.start_datetime))
          : '';
        const formatted_time_range = seminar.start_datetime && seminar.end_datetime
          ? this._formatTimeRangeDisplay(seminar.start_datetime, seminar.end_datetime)
          : '';

        return {
          list_item: li,
          seminar,
          topic_name: topic ? topic.name : '',
          formatted_date,
          formatted_time_range,
          is_wheelchair_accessible: seminar.is_wheelchair_accessible,
          has_live_qa: seminar.has_live_qa
        };
      })
      .filter((x) => x);

    return { results };
  }

  // addSeminarToTrack(seminarId, day_order, overall_order)
  addSeminarToTrack(seminarId, day_order, overall_order) {
    const seminars = this._getFromStorage('seminars');
    const seminar = seminars.find((s) => s.id === seminarId) || null;
    if (!seminar) {
      return { success: false, track_item: null, message: 'Seminar not found' };
    }

    const track_items = this._getFromStorage('track_items');
    const existing = track_items.find((ti) => ti.seminarId === seminarId);
    if (existing) {
      return { success: true, track_item: existing, message: 'Already in My Track' };
    }

    const newItem = {
      id: this._generateId('track'),
      seminarId,
      added_at: new Date().toISOString()
    };
    if (typeof day_order === 'number') newItem.day_order = day_order;
    if (typeof overall_order === 'number') newItem.overall_order = overall_order;

    track_items.push(newItem);
    this._saveToStorage('track_items', track_items);

    return { success: true, track_item: newItem, message: 'Added to My Track' };
  }

  // updateTrackOrder(ordering)
  updateTrackOrder(ordering) {
    const track_items = this._getFromStorage('track_items');
    const updated_items = [];

    (ordering || []).forEach((ord) => {
      const idx = track_items.findIndex((ti) => ti.id === ord.trackItemId);
      if (idx !== -1) {
        const item = track_items[idx];
        if (typeof ord.day_order === 'number') item.day_order = ord.day_order;
        if (typeof ord.overall_order === 'number') item.overall_order = ord.overall_order;
        track_items[idx] = item;
        updated_items.push(item);
      }
    });

    this._saveToStorage('track_items', track_items);

    return {
      success: true,
      updated_items,
      message: 'Track order updated'
    };
  }

  // removeTrackItem(trackItemId)
  removeTrackItem(trackItemId) {
    const track_items = this._getFromStorage('track_items');
    const idx = track_items.findIndex((ti) => ti.id === trackItemId);
    if (idx === -1) {
      return { success: false, message: 'Track item not found' };
    }
    track_items.splice(idx, 1);
    this._saveToStorage('track_items', track_items);
    return { success: true, message: 'Track item removed' };
  }

  // getMyTrack()
  getMyTrack() {
    const track_items = this._getFromStorage('track_items');
    const seminars = this._getFromStorage('seminars');
    const topics = this._getFromStorage('topics');

    const itemsWithSeminar = track_items
      .map((ti) => {
        const seminar = seminars.find((s) => s.id === ti.seminarId) || null;
        if (!seminar) return null;
        const topic = topics.find((t) => t.id === seminar.topicId) || null;
        const formatted_time_range = seminar.start_datetime && seminar.end_datetime
          ? this._formatTimeRangeDisplay(seminar.start_datetime, seminar.end_datetime)
          : '';
        return {
          track_item: ti,
          seminar,
          topic_name: topic ? topic.name : '',
          formatted_time_range,
          session_type: seminar.session_type
        };
      })
      .filter((x) => x);

    const dayMap = new Map();
    itemsWithSeminar.forEach((item) => {
      const dateStr = this._getDateOnlyString(item.seminar.start_datetime);
      if (!dateStr) return;
      if (!dayMap.has(dateStr)) {
        dayMap.set(dateStr, []);
      }
      dayMap.get(dateStr).push(item);
    });

    const days = Array.from(dayMap.entries())
      .sort((a, b) => (a[0] < b[0] ? -1 : 1))
      .map(([date, items]) => {
        items.sort((a, b) => {
          const oa = typeof a.track_item.overall_order === 'number'
            ? a.track_item.overall_order
            : new Date(a.seminar.start_datetime).getTime();
          const ob = typeof b.track_item.overall_order === 'number'
            ? b.track_item.overall_order
            : new Date(b.seminar.start_datetime).getTime();
          return oa - ob;
        });
        return { date, items };
      });

    return { days };
  }

  // addSeminarToWatchlist(seminarId)
  addSeminarToWatchlist(seminarId) {
    const seminars = this._getFromStorage('seminars');
    const seminar = seminars.find((s) => s.id === seminarId) || null;
    if (!seminar) {
      return { success: false, watchlist_item: null, message: 'Seminar not found' };
    }

    const watchlist_items = this._getFromStorage('watchlist_items');
    const existing = watchlist_items.find((wi) => wi.seminarId === seminarId);
    if (existing) {
      return { success: true, watchlist_item: existing, message: 'Already in watchlist' };
    }

    const newItem = {
      id: this._generateId('watchlist'),
      seminarId,
      added_at: new Date().toISOString()
    };
    watchlist_items.push(newItem);
    this._saveToStorage('watchlist_items', watchlist_items);

    return { success: true, watchlist_item: newItem, message: 'Added to watchlist' };
  }

  // removeWatchlistItem(watchlistItemId)
  removeWatchlistItem(watchlistItemId) {
    const watchlist_items = this._getFromStorage('watchlist_items');
    const idx = watchlist_items.findIndex((wi) => wi.id === watchlistItemId);
    if (idx === -1) {
      return { success: false, message: 'Watchlist item not found' };
    }
    watchlist_items.splice(idx, 1);
    this._saveToStorage('watchlist_items', watchlist_items);
    return { success: true, message: 'Watchlist item removed' };
  }

  // getWatchlist()
  getWatchlist() {
    const watchlist_items = this._getFromStorage('watchlist_items');
    const seminars = this._getFromStorage('seminars');
    const topics = this._getFromStorage('topics');

    const results = watchlist_items
      .map((wi) => {
        const seminar = seminars.find((s) => s.id === wi.seminarId) || null;
        if (!seminar) return null;
        const topic = topics.find((t) => t.id === seminar.topicId) || null;
        const formatted_date = seminar.start_datetime
          ? this._formatDateDisplay(new Date(seminar.start_datetime))
          : '';
        const formatted_time_range = seminar.start_datetime && seminar.end_datetime
          ? this._formatTimeRangeDisplay(seminar.start_datetime, seminar.end_datetime)
          : '';

        return {
          watchlist_item: wi,
          seminar,
          topic_name: topic ? topic.name : '',
          formatted_date,
          formatted_time_range
        };
      })
      .filter((x) => x);

    return { results };
  }

  // submitSeminarRegistration(seminarId, full_name, affiliation, dietary_needs)
  submitSeminarRegistration(seminarId, full_name, affiliation, dietary_needs) {
    const seminars = this._getFromStorage('seminars');
    const seminar = seminars.find((s) => s.id === seminarId) || null;
    if (!seminar) {
      return { success: false, registration: null, updated_seat_status: null, message: 'Seminar not found' };
    }

    const remaining = typeof seminar.seats_remaining === 'number' ? seminar.seats_remaining : 0;
    if (remaining <= 0) {
      return {
        success: false,
        registration: null,
        updated_seat_status: {
          seats_capacity: seminar.seats_capacity != null ? seminar.seats_capacity : null,
          seats_remaining: remaining
        },
        message: 'No seats remaining'
      };
    }

    const registrations = this._getFromStorage('registrations');

    const registration = {
      id: this._generateId('reg'),
      seminarId,
      full_name,
      affiliation: affiliation || '',
      dietary_needs,
      status: 'submitted',
      submitted_at: new Date().toISOString()
    };

    registrations.push(registration);
    this._saveToStorage('registrations', registrations);

    const updatedSeatStatus = this._updateSeatsRemainingOnRegistration(seminarId);

    // Instrumentation for task completion tracking
    try {
      localStorage.setItem(
        'task3_registrationContext',
        JSON.stringify({
          seminarId: seminarId,
          seats_remaining_before: remaining,
          seats_remaining_after: updatedSeatStatus.seats_remaining
        })
      );
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      success: true,
      registration,
      updated_seat_status: updatedSeatStatus,
      message: 'Registration submitted'
    };
  }

  // getHelpContent()
  getHelpContent() {
    return {
      sections: [
        {
          id: 'navigation',
          title: 'Navigation',
          body:
            'Use the Calendar, Browse by Day, or All Seminars links to explore upcoming events. Each view supports filters and sorting.'
        },
        {
          id: 'filters',
          title: 'Using Filters',
          body:
            'Filter seminars by topic, format, level, accessibility, and more. You can combine filters to narrow results to exactly what you need.'
        },
        {
          id: 'personal-collections',
          title: 'Personal Collections',
          body:
            'Use My Schedule, My Day, My List, My Track, Bookmarks, Favorites, and Watchlist to organize seminars you are interested in.'
        },
        {
          id: 'troubleshooting',
          title: 'Troubleshooting',
          body:
            'If you encounter issues with missing seminars or saving your schedule, try refreshing the page or clearing browser storage, then reload the site.'
        }
      ]
    };
  }

  // getAccessibilityInformation()
  getAccessibilityInformation() {
    return {
      physical_accessibility:
        'Many in-person seminars are held in wheelchair-accessible buildings and rooms. Look for the wheelchair accessibility filter and badges in listings.',
      digital_accessibility:
        'The seminar website is designed to work with modern screen readers and keyboard navigation. Text alternatives are provided for essential content.',
      filter_explanations: [
        {
          filter_key: 'wheelchair_accessible_room',
          label: 'Wheelchair accessible room',
          explanation:
            'When selected, results include only seminars held in rooms marked as wheelchair accessible.'
        },
        {
          filter_key: 'has_live_qa',
          label: 'Includes live Q&A',
          explanation:
            'When selected, results include only seminars that offer a live question-and-answer segment.'
        }
      ],
      accommodations_contact: {
        email: 'accessibility@example.edu',
        phone: '+1 (555) 010-0001',
        instructions:
          'For disability-related accommodations or questions about accessibility, please contact us at least two weeks before the event.'
      }
    };
  }

  // getAboutContent()
  getAboutContent() {
    return {
      program_overview:
        'The Academic Seminar Program brings together researchers, students, and practitioners across disciplines for regular seminars, workshops, and tutorials.',
      organizing_institutions: [
        'Department of Computer Science',
        'Department of Statistics',
        'School of Engineering'
      ],
      sponsors: ['University Research Office', 'Graduate School'],
      policies: [
        {
          title: 'Code of Conduct',
          body:
            'Participants are expected to contribute to a welcoming, inclusive environment and to follow the university code of conduct.'
        },
        {
          title: 'Recording Policy',
          body:
            'Some seminars may be recorded. Check the seminar description for details and contact organizers with questions.'
        }
      ],
      related_resources: [
        'Graduate seminar requirements',
        'Research group meeting schedules',
        'Online course catalog'
      ]
    };
  }

  // getContactInformation()
  getContactInformation() {
    return {
      general_email: 'seminars@example.edu',
      phone: '+1 (555) 010-0000',
      mailing_address: 'Seminar Program Office, 123 Academic Way, University City, ST 12345',
      special_contacts: [
        {
          purpose: 'registration_issues',
          email: 'seminars-registration@example.edu'
        },
        {
          purpose: 'technical_support',
          email: 'seminars-tech@example.edu'
        },
        {
          purpose: 'accessibility_requests',
          email: 'accessibility@example.edu'
        }
      ]
    };
  }

  // submitContactForm(name, email, subject, message, topic)
  submitContactForm(name, email, subject, message, topic) {
    const submissions = this._getFromStorage('contact_form_submissions');
    const submission = {
      id: this._generateId('contact'),
      name,
      email,
      subject,
      message,
      topic: topic || null,
      submitted_at: new Date().toISOString()
    };
    submissions.push(submission);
    this._saveToStorage('contact_form_submissions', submissions);

    return {
      success: true,
      message: 'Your message has been submitted.'
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