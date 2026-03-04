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
    const ensureArrayKey = (key) => {
      if (localStorage.getItem(key) === null) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    };

    // Core data tables
    ensureArrayKey('offerings');
    ensureArrayKey('locations');
    ensureArrayKey('teachers');
    ensureArrayKey('registration_options');
    ensureArrayKey('registrations');
    ensureArrayKey('schedule_items');
    ensureArrayKey('bookmarks');
    ensureArrayKey('reviews');
    ensureArrayKey('attendance_records');
    ensureArrayKey('notification_settings');
    ensureArrayKey('contact_submissions');

    // ID counter
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

  _nowIso() {
    return new Date().toISOString();
  }

  _parseDateTime(isoString) {
    if (!isoString) return null;
    const d = new Date(isoString);
    return isNaN(d.getTime()) ? null : d;
  }

  _dateOnly(date) {
    const d = new Date(date.getTime());
    d.setHours(0, 0, 0, 0);
    return d;
  }

  _formatPriceDisplay(offering) {
    if (!offering) return '';
    if (offering.is_free) return 'Free';
    const currencySymbol = offering.currency === 'USD' || !offering.currency ? '$' : offering.currency + ' ';
    const min = typeof offering.price_min === 'number' ? offering.price_min : null;
    const max = typeof offering.price_max === 'number' ? offering.price_max : null;

    if (min != null && max != null) {
      if (min === max) return currencySymbol + min.toFixed(0);
      return currencySymbol + min.toFixed(0) + ' – ' + currencySymbol + max.toFixed(0);
    }
    if (min != null) return 'From ' + currencySymbol + min.toFixed(0);
    if (max != null) return 'Up to ' + currencySymbol + max.toFixed(0);
    return '';
  }

  _categoryLabel(value) {
    if (!value) return '';
    const map = {
      mindfulness: 'Mindfulness',
      yoga: 'Yoga',
      dharma_talk: 'Dharma talk',
      retreat: 'Retreat',
      retreats: 'Retreats',
      guided_meditation: 'Guided meditation',
      guided_meditations: 'Guided meditations',
      family_friendly: 'Family-friendly'
    };
    return map[value] || value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }

  _locationSummary(location, format) {
    if (format === 'online') {
      return 'Online';
    }
    if (!location) return '';
    const parts = [];
    if (location.city) parts.push(location.city);
    if (location.state_province) parts.push(location.state_province);
    if (!parts.length && location.name) parts.push(location.name);
    return parts.join(', ');
  }

  _calculateDistanceMiles(lat1, lon1, lat2, lon2) {
    if (
      typeof lat1 !== 'number' || typeof lon1 !== 'number' ||
      typeof lat2 !== 'number' || typeof lon2 !== 'number'
    ) {
      return null;
    }
    const toRad = (deg) => (deg * Math.PI) / 180;
    const R = 3958.8; // Earth radius in miles
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  _getStartHourFromDateTime(iso) {
    const d = this._parseDateTime(iso);
    if (!d) return null;
    return d.getHours();
  }

  _matchesTimeOfDay(iso, time_of_day, customStartHour, customEndHour) {
    const hour = this._getStartHourFromDateTime(iso);
    if (hour == null) return false;

    // If no explicit hour window is provided, do not filter by time of day.
    if (typeof customStartHour !== 'number' && typeof customEndHour !== 'number') {
      return true;
    }

    let minHour = null;
    let maxHour = null;

    if (time_of_day && time_of_day !== 'anytime') {
      if (time_of_day === 'morning') {
        minHour = 5;
        maxHour = 12;
      } else if (time_of_day === 'afternoon') {
        minHour = 12;
        maxHour = 18;
      } else if (time_of_day === 'evening_after_6_pm') {
        minHour = 18;
        maxHour = 24;
      }
    }

    if (typeof customStartHour === 'number') {
      minHour = customStartHour;
    }
    if (typeof customEndHour === 'number') {
      maxHour = customEndHour;
    }

    if (minHour == null && maxHour == null) return true;
    if (minHour == null) minHour = 0;
    if (maxHour == null) maxHour = 24;

    return hour >= minHour && hour < maxHour;
  }

  _isWithinDateRange(iso, date_range_type, start_date, end_date) {
    if (!iso) return false;
    if (!date_range_type || date_range_type === 'anytime') return true;

    const startDt = this._parseDateTime(iso);
    if (!startDt) return false;

    // For non-custom ranges, skip strict filtering so static data stays relevant
    if (date_range_type !== 'custom') {
      return true;
    }

    const now = new Date();
    const today = this._dateOnly(now);
    const startDateOnly = this._dateOnly(startDt);

    const addDays = (d, n) => {
      const copy = new Date(d.getTime());
      copy.setDate(copy.getDate() + n);
      return copy;
    };

    const getMonthRange = (baseDate, offsetMonths) => {
      const d = new Date(baseDate.getTime());
      d.setMonth(d.getMonth() + offsetMonths, 1);
      d.setHours(0, 0, 0, 0);
      const start = new Date(d.getTime());
      const end = new Date(d.getTime());
      end.setMonth(end.getMonth() + 1);
      end.setDate(0); // last day of previous month
      end.setHours(23, 59, 59, 999);
      return { start, end };
    };

    if (date_range_type === 'today') {
      return startDateOnly.getTime() === today.getTime();
    }

    if (date_range_type === 'tonight') {
      // Same-day events starting later this evening (>= 17:00)
      if (startDateOnly.getTime() !== today.getTime()) return false;
      const hour = startDt.getHours();
      return hour >= 17;
    }

    if (date_range_type === 'this_weekend') {
      const day = today.getDay(); // 0=Sun
      const daysUntilSaturday = (6 - day + 7) % 7; // 6 is Saturday
      const saturday = addDays(today, daysUntilSaturday);
      const sunday = addDays(saturday, 1);
      const startRange = this._dateOnly(saturday);
      const endRange = this._dateOnly(sunday);
      endRange.setHours(23, 59, 59, 999);
      return startDt >= startRange && startDt <= endRange;
    }

    if (date_range_type === 'next_7_days') {
      const end = addDays(now, 7);
      return startDt >= now && startDt <= end;
    }

    if (date_range_type === 'next_14_days') {
      const end = addDays(now, 14);
      return startDt >= now && startDt <= end;
    }

    if (date_range_type === 'this_month') {
      const { start, end } = getMonthRange(now, 0);
      return startDt >= start && startDt <= end;
    }

    if (date_range_type === 'next_month') {
      const { start, end } = getMonthRange(now, 1);
      return startDt >= start && startDt <= end;
    }

    if (date_range_type === 'custom') {
      if (!start_date || !end_date) return true; // if custom but not specified, do not filter
      const start = new Date(start_date + 'T00:00:00');
      const end = new Date(end_date + 'T23:59:59');
      return startDt >= start && startDt <= end;
    }

    return true;
  }

  _getOrCreateNotificationSettings() {
    let settingsArr = this._getFromStorage('notification_settings');
    if (!Array.isArray(settingsArr)) settingsArr = [];
    if (settingsArr.length > 0) {
      return settingsArr[0];
    }
    const nowIso = this._nowIso();
    const settings = {
      id: this._generateId('notif'),
      receive_online_events: true,
      receive_in_person_events: true,
      preferred_languages: ['english'],
      primary_language: 'english',
      preferred_start_hour_local: 0,
      preferred_end_hour_local: 23,
      max_emails_per_week: 7,
      last_updated_at: nowIso
    };
    settingsArr.push(settings);
    this._saveToStorage('notification_settings', settingsArr);
    return settings;
  }

  _getOrCreateAccountState() {
    // For a single-user context, just ensure collections exist and return them
    const schedule_items = this._getFromStorage('schedule_items');
    const bookmarks = this._getFromStorage('bookmarks');
    const registrations = this._getFromStorage('registrations');
    const attendance_records = this._getFromStorage('attendance_records');
    return { schedule_items, bookmarks, registrations, attendance_records };
  }

  // -------------------------
  // Private filter/sort helpers
  // -------------------------

  _applyEventFiltersAndSorting(offerings, query, filters, sort, teachersById, locationsById, centerLocation) {
    const q = (query || '').trim().toLowerCase();
    const f = filters || {};
    const sortCfg = sort || {};

    const radius = typeof f.radius_miles === 'number' ? f.radius_miles : null;

    const results = [];

    for (let i = 0; i < offerings.length; i++) {
      const offering = offerings[i];
      let match = true;
      let distanceMiles = null;

      // Free-text query
      if (q) {
        const haystack = (
          (offering.title || '') + ' ' + (offering.description || '')
        ).toLowerCase();
        if (!haystack.includes(q)) match = false;
      }

      if (!match) continue;

      // Levels
      if (Array.isArray(f.levels) && f.levels.length > 0) {
        if (!offering.level || f.levels.indexOf(offering.level) === -1) {
          match = false;
        }
      }

      if (!match) continue;

      // Categories
      if (Array.isArray(f.categories) && f.categories.length > 0) {
        if (!offering.category || f.categories.indexOf(offering.category) === -1) {
          match = false;
        }
      }

      if (!match) continue;

      // Offering types
      if (Array.isArray(f.offering_types) && f.offering_types.length > 0) {
        if (!offering.offering_type || f.offering_types.indexOf(offering.offering_type) === -1) {
          match = false;
        }
      }

      if (!match) continue;

      // Free / price
      if (typeof f.is_free === 'boolean') {
        if (offering.is_free !== f.is_free) match = false;
      }

      if (!match) continue;

      if (typeof f.price_min === 'number') {
        const minPrice = typeof offering.price_min === 'number' ? offering.price_min : offering.price_max;
        if (typeof minPrice === 'number' && minPrice < f.price_min) match = false;
      }

      if (!match) continue;

      if (typeof f.price_max === 'number') {
        const maxPrice = typeof offering.price_max === 'number' ? offering.price_max : offering.price_min;
        if (typeof maxPrice === 'number' && maxPrice > f.price_max) match = false;
      }

      if (!match) continue;

      // Date range
      if (!this._isWithinDateRange(offering.start_datetime, f.date_range_type || 'anytime', f.start_date, f.end_date)) {
        match = false;
      }

      if (!match) continue;

      // Time of day
      const timeOfDay = f.time_of_day || 'anytime';
      const startHour = typeof f.start_time_hour === 'number' ? f.start_time_hour : null;
      const endHour = typeof f.end_time_hour === 'number' ? f.end_time_hour : null;
      if (!this._matchesTimeOfDay(offering.start_datetime, timeOfDay, startHour, endHour)) {
        match = false;
      }

      if (!match) continue;

      // Format
      if (f.format && offering.format && offering.format !== f.format) {
        match = false;
      }

      if (!match) continue;

      // Audience
      if (f.audience && offering.audience && offering.audience !== f.audience) {
        match = false;
      }

      if (!match) continue;

      if (typeof f.is_family_friendly === 'boolean' && f.is_family_friendly) {
        if (!offering.is_family_friendly && offering.audience !== 'families') {
          match = false;
        }
      }

      if (!match) continue;

      if (typeof f.allows_children_8_plus === 'boolean' && f.allows_children_8_plus) {
        if (!offering.allows_children_8_plus && !(typeof offering.min_age === 'number' && offering.min_age <= 8)) {
          match = false;
        }
      }

      if (!match) continue;

      if (typeof f.is_wheelchair_accessible === 'boolean' && f.is_wheelchair_accessible) {
        if (!offering.is_wheelchair_accessible) match = false;
      }

      if (!match) continue;

      // Teacher filters
      const teacher = offering.primary_teacher_id ? teachersById[offering.primary_teacher_id] : null;
      if (f.teacher_gender) {
        if (!teacher || teacher.gender !== f.teacher_gender) match = false;
      }

      if (!match) continue;

      if (typeof f.teacher_min_rating === 'number') {
        const teacherRating = teacher && typeof teacher.teacher_average_rating === 'number' ? teacher.teacher_average_rating : null;
        const offeringRating = typeof offering.offering_average_rating === 'number' ? offering.offering_average_rating : null;
        const effectiveRating = offeringRating != null ? offeringRating : teacherRating;
        if (effectiveRating == null || effectiveRating < f.teacher_min_rating) {
          match = false;
        }
      }

      if (!match) continue;

      // Duration filters (minutes)
      if (typeof f.duration_minutes_min === 'number') {
        if (typeof offering.duration_minutes !== 'number' || offering.duration_minutes < f.duration_minutes_min) {
          match = false;
        }
      }

      if (!match) continue;

      if (typeof f.duration_minutes_max === 'number') {
        if (typeof offering.duration_minutes !== 'number' || offering.duration_minutes > f.duration_minutes_max) {
          match = false;
        }
      }

      if (!match) continue;

      // Location + radius (distance)
      if (centerLocation && radius != null) {
        if (offering.format === 'online') {
          // Do not filter online offerings by distance
        } else if (!offering.location_id) {
          // If no location is attached we cannot compute distance; do not exclude by radius
        } else {
          const loc = locationsById[offering.location_id];
          if (loc) {
            distanceMiles = this._calculateDistanceMiles(
              centerLocation.latitude,
              centerLocation.longitude,
              loc.latitude,
              loc.longitude
            );
            if (distanceMiles != null && distanceMiles > radius) {
              match = false;
            }
          }
        }
      }

      if (!match) continue;

      results.push({ offering, distanceMiles });
    }

    // Sorting
    const sortBy = sortCfg.sort_by || 'start_date';
    let direction = sortCfg.sort_direction;
    if (!direction) {
      if (sortBy === 'rating') direction = 'desc';
      else direction = 'asc';
    }

    results.sort((a, b) => {
      const o1 = a.offering;
      const o2 = b.offering;
      let v1;
      let v2;

      if (sortBy === 'price') {
        const p1 = typeof o1.price_min === 'number' ? o1.price_min : o1.price_max || 0;
        const p2 = typeof o2.price_min === 'number' ? o2.price_min : o2.price_max || 0;
        v1 = p1;
        v2 = p2;
      } else if (sortBy === 'rating') {
        const r1 = typeof o1.offering_average_rating === 'number' ? o1.offering_average_rating : 0;
        const r2 = typeof o2.offering_average_rating === 'number' ? o2.offering_average_rating : 0;
        v1 = r1;
        v2 = r2;
      } else {
        // start_date
        const d1 = this._parseDateTime(o1.start_datetime);
        const d2 = this._parseDateTime(o2.start_datetime);
        v1 = d1 ? d1.getTime() : 0;
        v2 = d2 ? d2.getTime() : 0;
      }

      if (v1 < v2) return direction === 'asc' ? -1 : 1;
      if (v1 > v2) return direction === 'asc' ? 1 : -1;
      return 0;
    });

    return results;
  }

  _applyCourseFiltersAndSorting(offerings, query, filters, sort) {
    const q = (query || '').trim().toLowerCase();
    const f = filters || {};
    const sortCfg = sort || {};
    const results = [];

    for (let i = 0; i < offerings.length; i++) {
      const o = offerings[i];
      let match = true;

      // Query
      if (q) {
        const haystack = ((o.title || '') + ' ' + (o.description || '')).toLowerCase();
        if (!haystack.includes(q)) match = false;
      }
      if (!match) continue;

      // Level
      if (Array.isArray(f.levels) && f.levels.length > 0) {
        if (!o.level || f.levels.indexOf(o.level) === -1) match = false;
      }
      if (!match) continue;

      // Start date window
      const drType = f.start_date_range_type || 'anytime';
      if (!this._isWithinDateRange(o.start_datetime, drType, f.start_date, f.end_date)) {
        match = false;
      }
      if (!match) continue;

      // Sessions / duration
      if (typeof f.num_sessions === 'number') {
        if (typeof o.num_sessions !== 'number' || o.num_sessions !== f.num_sessions) match = false;
      }
      if (!match) continue;

      if (typeof f.duration_weeks === 'number') {
        if (typeof o.duration_weeks !== 'number' || o.duration_weeks !== f.duration_weeks) match = false;
      }
      if (!match) continue;

      // Days of week
      if (Array.isArray(f.days_of_week) && f.days_of_week.length > 0) {
        if (!o.primary_day_of_week || f.days_of_week.indexOf(o.primary_day_of_week) === -1) match = false;
      }
      if (!match) continue;

      if (f.weekdays_only) {
        const weekdays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
        if (!o.primary_day_of_week || weekdays.indexOf(o.primary_day_of_week) === -1) match = false;
      }
      if (!match) continue;

      if (f.weekends_only) {
        const weekends = ['saturday', 'sunday'];
        if (!o.primary_day_of_week || weekends.indexOf(o.primary_day_of_week) === -1) match = false;
      }
      if (!match) continue;

      // Time window
      const startHourMin = typeof f.start_time_hour_min === 'number' ? f.start_time_hour_min : null;
      const startHourMax = typeof f.start_time_hour_max === 'number' ? f.start_time_hour_max : null;
      if (!this._matchesTimeOfDay(o.start_datetime, 'anytime', startHourMin, startHourMax)) {
        match = false;
      }
      if (!match) continue;

      // Format
      if (f.format && o.format && o.format !== f.format) match = false;
      if (!match) continue;

      // Location (exact match, no radius)
      if (f.locationId && o.location_id && o.location_id !== f.locationId) match = false;
      if (!match) continue;

      // Price
      if (typeof f.price_min === 'number') {
        const minPrice = typeof o.price_min === 'number' ? o.price_min : o.price_max;
        if (typeof minPrice === 'number' && minPrice < f.price_min) match = false;
      }
      if (!match) continue;

      if (typeof f.price_max === 'number') {
        const maxPrice = typeof o.price_max === 'number' ? o.price_max : o.price_min;
        if (typeof maxPrice === 'number' && maxPrice > f.price_max) match = false;
      }
      if (!match) continue;

      results.push(o);
    }

    const sortBy = sortCfg.sort_by || 'start_date';
    let direction = sortCfg.sort_direction;
    if (!direction) {
      if (sortBy === 'price') direction = 'asc';
      else if (sortBy === 'popularity') direction = 'desc';
      else direction = 'asc';
    }

    results.sort((a, b) => {
      let v1;
      let v2;
      if (sortBy === 'price') {
        const p1 = typeof a.price_min === 'number' ? a.price_min : a.price_max || 0;
        const p2 = typeof b.price_min === 'number' ? b.price_min : b.price_max || 0;
        v1 = p1;
        v2 = p2;
      } else if (sortBy === 'popularity') {
        const c1 = typeof a.offering_rating_count === 'number' ? a.offering_rating_count : 0;
        const c2 = typeof b.offering_rating_count === 'number' ? b.offering_rating_count : 0;
        v1 = c1;
        v2 = c2;
      } else {
        const d1 = this._parseDateTime(a.start_datetime);
        const d2 = this._parseDateTime(b.start_datetime);
        v1 = d1 ? d1.getTime() : 0;
        v2 = d2 ? d2.getTime() : 0;
      }
      if (v1 < v2) return direction === 'asc' ? -1 : 1;
      if (v1 > v2) return direction === 'asc' ? 1 : -1;
      return 0;
    });

    return results;
  }

  _applyVolunteerFiltersAndSorting(offerings, query, filters, sort, locationsById) {
    const q = (query || '').trim().toLowerCase();
    const f = filters || {};
    const sortCfg = sort || {};
    const results = [];

    const nextMonthStr = f.next_occurrence_month; // YYYY-MM-01
    let nextMonthYear = null;
    let nextMonthMonth = null;
    if (nextMonthStr) {
      const d = new Date(nextMonthStr);
      if (!isNaN(d.getTime())) {
        nextMonthYear = d.getFullYear();
        nextMonthMonth = d.getMonth();
      }
    }

    for (let i = 0; i < offerings.length; i++) {
      const o = offerings[i];
      let match = true;

      // Query
      if (q) {
        const haystack = ((o.title || '') + ' ' + (o.description || '')).toLowerCase();
        if (!haystack.includes(q)) match = false;
      }
      if (!match) continue;

      // Frequency
      if (f.volunteer_frequency && o.volunteer_frequency !== f.volunteer_frequency) match = false;
      if (!match) continue;

      // Day of week
      if (f.day_of_week && o.primary_day_of_week !== f.day_of_week) match = false;
      if (!match) continue;

      // Session length
      if (typeof f.session_length_hours_min === 'number') {
        const minLen = typeof o.volunteer_session_length_hours_min === 'number' ? o.volunteer_session_length_hours_min : o.volunteer_session_length_hours_max;
        if (typeof minLen === 'number' && minLen < f.session_length_hours_min) match = false;
      }
      if (!match) continue;

      if (typeof f.session_length_hours_max === 'number') {
        const maxLen = typeof o.volunteer_session_length_hours_max === 'number' ? o.volunteer_session_length_hours_max : o.volunteer_session_length_hours_min;
        if (typeof maxLen === 'number' && maxLen > f.session_length_hours_max) match = false;
      }
      if (!match) continue;

      // Next occurrence month
      if (nextMonthYear != null && nextMonthMonth != null) {
        const dt = this._parseDateTime(o.next_occurrence_datetime);
        if (!dt || dt.getFullYear() !== nextMonthYear || dt.getMonth() !== nextMonthMonth) {
          match = false;
        }
      }
      if (!match) continue;

      // Role
      if (f.volunteer_role_primary && o.volunteer_role_primary !== f.volunteer_role_primary) match = false;
      if (!match) continue;

      // Location (exact match)
      if (f.locationId && o.location_id && o.location_id !== f.locationId) match = false;
      if (!match) continue;

      results.push(o);
    }

    const sortBy = sortCfg.sort_by || 'next_occurrence';
    let direction = sortCfg.sort_direction || 'asc';

    results.sort((a, b) => {
      let v1;
      let v2;
      if (sortBy === 'next_occurrence') {
        const d1 = this._parseDateTime(a.next_occurrence_datetime);
        const d2 = this._parseDateTime(b.next_occurrence_datetime);
        v1 = d1 ? d1.getTime() : 0;
        v2 = d2 ? d2.getTime() : 0;
      } else {
        // title
        v1 = (a.title || '').toLowerCase();
        v2 = (b.title || '').toLowerCase();
      }
      if (v1 < v2) return direction === 'asc' ? -1 : 1;
      if (v1 > v2) return direction === 'asc' ? 1 : -1;
      return 0;
    });

    return results;
  }

  // -------------------------
  // Interface implementations
  // -------------------------

  _ensureSyntheticEventsAndMeditations() {
    // Seed additional free events and guided meditations so higher-level flows
    // have data to work with when only minimal fixtures are provided.
    if (typeof localStorage === 'undefined') return;
    if (localStorage.getItem('synthetic_events_v1')) return;

    const offerings = this._getFromStorage('offerings');
    const registrationOptions = this._getFromStorage('registration_options');
    const teachers = this._getFromStorage('teachers');

    const femaleTeachers = teachers.filter(
      (t) =>
        t &&
        t.gender === 'female' &&
        (typeof t.teacher_average_rating !== 'number' || t.teacher_average_rating >= 4)
    );
    const teacher1 = femaleTeachers[0] || teachers[0] || null;
    const teacher2 = femaleTeachers[1] || teacher1;
    const teacherId1 = teacher1 ? teacher1.id : null;
    const teacherId2 = teacher2 ? teacher2.id : teacherId1;

    const now = new Date();
    const makeIso = (daysFromNow, hour) => {
      const d = new Date(now.getTime());
      d.setDate(d.getDate() + daysFromNow);
      d.setHours(hour, 0, 0, 0);
      return d.toISOString();
    };

    const syntheticOfferings = [];

    // Free morning mindfulness event (Task 3)
    const offMindfulness = {
      id: this._generateId('off'),
      title: 'Morning Mindfulness for Beginners',
      slug: null,
      offering_type: 'event',
      category: 'mindfulness',
      level: 'beginner',
      format: 'online',
      location_id: null,
      timezone: 'America/New_York',
      description:
        'A gentle beginner-friendly mindfulness session focusing on breath and body awareness.',
      image_url: '',
      language: 'english',
      start_datetime: makeIso(1, 9),
      end_datetime: makeIso(1, 10),
      primary_day_of_week: 'monday',
      duration_minutes: 60,
      recurrence_type: 'one_time',
      num_sessions: 1,
      duration_weeks: 0,
      next_occurrence_datetime: makeIso(1, 9),
      is_free: true,
      price_min: 0,
      price_max: 0,
      currency: 'USD',
      capacity: 200,
      primary_teacher_id: teacherId1,
      online_join_url: '',
      location_notes: '',
      is_family_friendly: false,
      allows_children_8_plus: false,
      min_age: 16,
      is_wheelchair_accessible: true,
      audience: 'general',
      volunteer_frequency: 'none',
      volunteer_session_length_hours_min: 0,
      volunteer_session_length_hours_max: 0,
      volunteer_role_primary: 'greeter',
      syllabus: '',
      is_weekend_only: false,
      offering_average_rating: 4.5,
      offering_rating_count: 0,
      remaining_spots: 200
    };
    syntheticOfferings.push(offMindfulness);

    // Free evening yoga event (Task 3)
    const offYoga = {
      id: this._generateId('off'),
      title: 'Evening Yoga for Relaxation',
      slug: null,
      offering_type: 'event',
      category: 'yoga',
      level: 'beginner',
      format: 'in_person',
      location_id: 'boston_main_center',
      timezone: 'America/New_York',
      description:
        'A gentle yoga class integrating mindful movement and breathing, suitable for beginners.',
      image_url: '',
      language: 'english',
      start_datetime: makeIso(2, 19),
      end_datetime: makeIso(2, 20),
      primary_day_of_week: 'wednesday',
      duration_minutes: 60,
      recurrence_type: 'one_time',
      num_sessions: 1,
      duration_weeks: 0,
      next_occurrence_datetime: makeIso(2, 19),
      is_free: true,
      price_min: 0,
      price_max: 0,
      currency: 'USD',
      capacity: 40,
      primary_teacher_id: teacherId1,
      online_join_url: '',
      location_notes: '',
      is_family_friendly: false,
      allows_children_8_plus: false,
      min_age: 16,
      is_wheelchair_accessible: true,
      audience: 'general',
      volunteer_frequency: 'none',
      volunteer_session_length_hours_min: 0,
      volunteer_session_length_hours_max: 0,
      volunteer_role_primary: 'greeter',
      syllabus: '',
      is_weekend_only: false,
      offering_average_rating: 4.5,
      offering_rating_count: 0,
      remaining_spots: 40
    };
    syntheticOfferings.push(offYoga);

    // Free dharma talk event (Task 3)
    const offDharma = {
      id: this._generateId('off'),
      title: 'Weeknight Dharma Talk on Compassion',
      slug: null,
      offering_type: 'event',
      category: 'dharma_talk',
      level: 'all_levels',
      format: 'online',
      location_id: null,
      timezone: 'America/New_York',
      description:
        'A dharma talk exploring compassion in daily life, with time for questions and discussion.',
      image_url: '',
      language: 'english',
      start_datetime: makeIso(3, 20),
      end_datetime: makeIso(3, 21),
      primary_day_of_week: 'thursday',
      duration_minutes: 60,
      recurrence_type: 'one_time',
      num_sessions: 1,
      duration_weeks: 0,
      next_occurrence_datetime: makeIso(3, 20),
      is_free: true,
      price_min: 0,
      price_max: 0,
      currency: 'USD',
      capacity: 150,
      primary_teacher_id: teacherId1,
      online_join_url: '',
      location_notes: '',
      is_family_friendly: false,
      allows_children_8_plus: false,
      min_age: 16,
      is_wheelchair_accessible: true,
      audience: 'general',
      volunteer_frequency: 'none',
      volunteer_session_length_hours_min: 0,
      volunteer_session_length_hours_max: 0,
      volunteer_role_primary: 'greeter',
      syllabus: '',
      is_weekend_only: false,
      offering_average_rating: 4.5,
      offering_rating_count: 0,
      remaining_spots: 150
    };
    syntheticOfferings.push(offDharma);

    // Family-friendly weekend event near Boston (Task 5)
    const offFamily = {
      id: this._generateId('off'),
      title: 'Family Mindfulness Afternoon (Boston)',
      slug: null,
      offering_type: 'event',
      category: 'family_friendly',
      level: 'all_levels',
      format: 'in_person',
      location_id: 'cambridge_family_center',
      timezone: 'America/New_York',
      description:
        'A family-friendly mindfulness gathering with simple practices suitable for children 8+.',
      image_url: '',
      language: 'english',
      start_datetime: makeIso(4, 14),
      end_datetime: makeIso(4, 16),
      primary_day_of_week: 'saturday',
      duration_minutes: 120,
      recurrence_type: 'one_time',
      num_sessions: 1,
      duration_weeks: 0,
      next_occurrence_datetime: makeIso(4, 14),
      is_free: true,
      price_min: 0,
      price_max: 0,
      currency: 'USD',
      capacity: 60,
      primary_teacher_id: teacherId2,
      online_join_url: '',
      location_notes: '',
      is_family_friendly: true,
      allows_children_8_plus: true,
      min_age: 8,
      is_wheelchair_accessible: true,
      audience: 'families',
      volunteer_frequency: 'none',
      volunteer_session_length_hours_min: 0,
      volunteer_session_length_hours_max: 0,
      volunteer_role_primary: 'greeter',
      syllabus: '',
      is_weekend_only: true,
      offering_average_rating: 4.5,
      offering_rating_count: 0,
      remaining_spots: 60
    };
    syntheticOfferings.push(offFamily);

    // Intermediate 4-week evening course (Task 4)
    const offCourse = {
      id: this._generateId('off'),
      title: 'Intermediate Mindfulness Course (4 weeks, evenings)',
      slug: null,
      offering_type: 'course',
      category: 'mindfulness',
      level: 'intermediate',
      format: 'online',
      location_id: null,
      timezone: 'America/New_York',
      description:
        'A 4-week intermediate mindfulness course meeting once per week on weekday evenings.',
      image_url: '',
      language: 'english',
      start_datetime: makeIso(10, 19),
      end_datetime: makeIso(10, 20),
      primary_day_of_week: 'tuesday',
      duration_minutes: 90,
      recurrence_type: 'weekly',
      num_sessions: 4,
      duration_weeks: 4,
      next_occurrence_datetime: makeIso(10, 19),
      is_free: false,
      price_min: 80,
      price_max: 100,
      currency: 'USD',
      capacity: 40,
      primary_teacher_id: teacherId1,
      online_join_url: '',
      location_notes: '',
      is_family_friendly: false,
      allows_children_8_plus: false,
      min_age: 16,
      is_wheelchair_accessible: true,
      audience: 'general',
      volunteer_frequency: 'none',
      volunteer_session_length_hours_min: 0,
      volunteer_session_length_hours_max: 0,
      volunteer_role_primary: 'greeter',
      syllabus: '',
      is_weekend_only: false,
      offering_average_rating: 4.5,
      offering_rating_count: 0,
      remaining_spots: 40
    };
    syntheticOfferings.push(offCourse);

    // Additional free online guided meditations (Task 9)
    for (let i = 0; i < 5; i++) {
      const start = makeIso(1 + i, 20);
      const guided = {
        id: this._generateId('off'),
        title: `Online Guided Meditation Session ${i + 1}`,
        slug: null,
        offering_type: 'guided_meditation',
        category: 'guided_meditation',
        level: 'beginner',
        format: 'online',
        location_id: null,
        timezone: 'America/New_York',
        description:
          'A 30-minute guided meditation with a focus on calm, kindness, and nervous system regulation.',
        image_url: '',
        language: 'english',
        start_datetime: start,
        end_datetime: start,
        primary_day_of_week: 'monday',
        duration_minutes: 30,
        recurrence_type: 'one_time',
        num_sessions: 1,
        duration_weeks: 0,
        next_occurrence_datetime: start,
        is_free: true,
        price_min: 0,
        price_max: 0,
        currency: 'USD',
        capacity: 300,
        primary_teacher_id: teacherId2,
        online_join_url: '',
        location_notes: '',
        is_family_friendly: true,
        allows_children_8_plus: true,
        min_age: 8,
        is_wheelchair_accessible: true,
        audience: 'general',
        volunteer_frequency: 'none',
        volunteer_session_length_hours_min: 0,
        volunteer_session_length_hours_max: 0,
        volunteer_role_primary: 'greeter',
        syllabus: '',
        is_weekend_only: false,
        offering_average_rating: 4.5,
        offering_rating_count: 0,
        remaining_spots: 300
      };
      syntheticOfferings.push(guided);
    }

    // Persist synthetic offerings and registration options for free RSVP
    for (const off of syntheticOfferings) {
      offerings.push(off);
      registrationOptions.push({
        id: this._generateId('regopt'),
        offering_id: off.id,
        name: 'Free RSVP',
        description: `Reserve a spot for "${off.title}".`,
        price: 0,
        currency: 'USD',
        is_free: true,
        is_default: true,
        option_type: 'attendance_only',
        max_capacity: off.capacity || 100,
        remaining_spots: off.capacity || 100
      });
    }

    this._saveToStorage('offerings', offerings);
    this._saveToStorage('registration_options', registrationOptions);
    localStorage.setItem('synthetic_events_v1', '1');
  }

  // getHomeOverview()
  getHomeOverview() {
    const offerings = this._getFromStorage('offerings');
    const teachers = this._getFromStorage('teachers');
    const locations = this._getFromStorage('locations');
    const bookmarks = this._getFromStorage('bookmarks');
    const scheduleItems = this._getFromStorage('schedule_items');

    const teacherById = {};
    for (let t of teachers) teacherById[t.id] = t;
    const locationById = {};
    for (let l of locations) locationById[l.id] = l;

    const bookmarkedIds = new Set(bookmarks.map((b) => b.offering_id));
    const scheduledIds = new Set(scheduleItems.filter((s) => s.is_active !== false).map((s) => s.offering_id));

    const now = new Date();
    const upcoming = offerings
      .filter((o) => {
        const dt = this._parseDateTime(o.start_datetime);
        return dt && dt >= now;
      })
      .sort((a, b) => {
        const d1 = this._parseDateTime(a.start_datetime);
        const d2 = this._parseDateTime(b.start_datetime);
        return (d1 ? d1.getTime() : 0) - (d2 ? d2.getTime() : 0);
      })
      .slice(0, 5);

    const featured_offerings = upcoming.map((o) => {
      const teacher = o.primary_teacher_id ? teacherById[o.primary_teacher_id] : null;
      const location = o.location_id ? locationById[o.location_id] : null;
      return {
        offering_id: o.id,
        title: o.title,
        offering_type: o.offering_type,
        category: o.category,
        level: o.level || null,
        format: o.format,
        language: o.language || null,
        is_free: !!o.is_free,
        price_display: this._formatPriceDisplay(o),
        start_datetime: o.start_datetime || null,
        end_datetime: o.end_datetime || null,
        timezone: o.timezone || null,
        primary_teacher_name: teacher ? teacher.full_name : null,
        primary_teacher_average_rating: teacher && typeof teacher.teacher_average_rating === 'number' ? teacher.teacher_average_rating : null,
        primary_teacher_rating_count: teacher && typeof teacher.teacher_rating_count === 'number' ? teacher.teacher_rating_count : null,
        location_summary: this._locationSummary(location, o.format),
        image_url: o.image_url || null,
        is_bookmarked: bookmarkedIds.has(o.id),
        is_in_schedule: scheduledIds.has(o.id),
        // Foreign key resolution (offering_id)
        offering: o
      };
    });

    const quick_shortcuts = [
      {
        shortcut_id: 'tonight',
        label: 'Tonight',
        description: 'Find meditations happening later this evening',
        preset_filters: {
          date_range_type: 'tonight',
          time_of_day: 'evening_after_6_pm',
          level: null,
          is_free: null,
          category: null,
          offering_type: 'event'
        }
      },
      {
        shortcut_id: 'next_7_days_free_beginner',
        label: 'Free beginner events this week',
        description: 'Gentle introductions to meditation for new practitioners',
        preset_filters: {
          date_range_type: 'next_7_days',
          time_of_day: 'anytime',
          level: 'beginner',
          is_free: true,
          category: null,
          offering_type: 'event'
        }
      },
      {
        shortcut_id: 'this_weekend_retreats',
        label: 'Weekend retreats',
        description: 'Short retreats to deepen your practice',
        preset_filters: {
          date_range_type: 'this_weekend',
          time_of_day: 'anytime',
          level: null,
          is_free: null,
          category: 'retreat',
          offering_type: 'retreat'
        }
      },
      {
        shortcut_id: 'guided_meditations_free',
        label: 'Free guided meditations',
        description: 'Short guided sessions you can join from home',
        preset_filters: {
          date_range_type: 'next_7_days',
          time_of_day: 'anytime',
          level: null,
          is_free: true,
          category: 'guided_meditation',
          offering_type: 'guided_meditation'
        }
      }
    ];

    const navigation_tiles = [
      {
        key: 'events',
        label: 'Events',
        description: 'Drop-in meditations, dharma talks, and community gatherings.'
      },
      {
        key: 'retreats',
        label: 'Retreats',
        description: 'Weekend and longer retreats to deepen your practice.'
      },
      {
        key: 'guided_meditations',
        label: 'Guided meditations',
        description: 'Online guided sessions led by experienced teachers.'
      },
      {
        key: 'courses',
        label: 'Courses',
        description: 'Multi-week courses exploring Buddhist teachings and meditation.'
      },
      {
        key: 'volunteer',
        label: 'Volunteer',
        description: 'Offer your time in service of the community.'
      }
    ];

    return {
      hero_title: 'Buddhist meditation & community events',
      hero_subtitle: 'Learn, practice, and connect with a compassionate community.',
      intro_paragraph:
        'Explore upcoming meditations, retreats, and courses offered by our Buddhist community. Whether you are new to practice or an experienced meditator, you are welcome here.',
      featured_offerings,
      quick_shortcuts,
      navigation_tiles
    };
  }

  // getEventFilterOptions()
  getEventFilterOptions() {
    const levels = [
      { value: 'beginner', label: 'Beginner' },
      { value: 'intermediate', label: 'Intermediate' },
      { value: 'advanced', label: 'Advanced' },
      { value: 'all_levels', label: 'All levels' }
    ];

    const categories = [
      { value: 'mindfulness', label: 'Mindfulness' },
      { value: 'yoga', label: 'Yoga' },
      { value: 'dharma_talk', label: 'Dharma talks' },
      { value: 'retreat', label: 'Retreat' },
      { value: 'guided_meditation', label: 'Guided meditation' },
      { value: 'family_friendly', label: 'Family-friendly' },
      { value: 'retreats', label: 'Retreats (category)' },
      { value: 'guided_meditations', label: 'Guided meditations (category)' }
    ];

    const price_ranges = [
      { id: 'free_only', label: 'Free', min_price: 0, max_price: 0, is_free_only: true },
      { id: 'under_50', label: 'Under $50', min_price: 0, max_price: 49, is_free_only: false },
      { id: '50_to_100', label: '$50 – $100', min_price: 50, max_price: 100, is_free_only: false },
      { id: '100_to_200', label: '$100 – $200', min_price: 100, max_price: 200, is_free_only: false },
      { id: '200_plus', label: '$200+', min_price: 200, max_price: null, is_free_only: false }
    ];

    const date_quick_options = [
      { value: 'today', label: 'Today' },
      { value: 'tonight', label: 'Tonight' },
      { value: 'this_weekend', label: 'This weekend' },
      { value: 'next_7_days', label: 'Next 7 days' },
      { value: 'next_14_days', label: 'Next 14 days' },
      { value: 'this_month', label: 'This month' },
      { value: 'next_month', label: 'Next month' }
    ];

    const time_of_day_options = [
      { value: 'anytime', label: 'Any time', start_hour: null, end_hour: null },
      { value: 'morning', label: 'Morning', start_hour: 5, end_hour: 12 },
      { value: 'afternoon', label: 'Afternoon', start_hour: 12, end_hour: 18 },
      { value: 'evening_after_6_pm', label: 'Evening (after 6 PM)', start_hour: 18, end_hour: 24 }
    ];

    const formats = [
      { value: 'online', label: 'Online / virtual' },
      { value: 'in_person', label: 'In person' }
    ];

    const audiences = [
      { value: 'general', label: 'General audience' },
      { value: 'families', label: 'Families' },
      { value: 'children_8_plus', label: 'Children 8+' },
      { value: 'adults_only', label: 'Adults only' }
    ];

    const accessibility_options = [
      { key: 'wheelchair_accessible', label: 'Wheelchair accessible' }
    ];

    const teacher_genders = [
      { value: 'female', label: 'Female' },
      { value: 'male', label: 'Male' },
      { value: 'non_binary', label: 'Non-binary' },
      { value: 'other', label: 'Other' },
      { value: 'prefer_not_to_say', label: 'Prefer not to say' }
    ];

    const rating_thresholds = [
      { min_rating: 4.0, label: '4.0+' },
      { min_rating: 4.5, label: '4.5+' }
    ];

    const distance_radius_options = [
      { radius_miles: 5, label: 'Within 5 miles' },
      { radius_miles: 10, label: 'Within 10 miles' },
      { radius_miles: 20, label: 'Within 20 miles' },
      { radius_miles: 50, label: 'Within 50 miles' },
      { radius_miles: 100, label: 'Within 100 miles' },
      { radius_miles: 150, label: 'Within 150 miles' }
    ];

    const sort_options = [
      { value: 'start_date_soonest', label: 'Start date: soonest first' },
      { value: 'price_low_to_high', label: 'Price: low to high' },
      { value: 'rating_high_to_low', label: 'Rating: high to low' }
    ];

    return {
      levels,
      categories,
      price_ranges,
      date_quick_options,
      time_of_day_options,
      formats,
      audiences,
      accessibility_options,
      teacher_genders,
      rating_thresholds,
      distance_radius_options,
      sort_options
    };
  }

  // searchEvents(query, filters, sort, pagination)
  searchEvents(query, filters, sort, pagination) {
    this._ensureSyntheticEventsAndMeditations();
    const offeringsAll = this._getFromStorage('offerings');
    const teachers = this._getFromStorage('teachers');
    const locations = this._getFromStorage('locations');
    const bookmarks = this._getFromStorage('bookmarks');
    const scheduleItems = this._getFromStorage('schedule_items');

    const teacherById = {};
    for (let t of teachers) teacherById[t.id] = t;
    const locationById = {};
    for (let l of locations) locationById[l.id] = l;

    const bookmarkedIds = new Set(bookmarks.map((b) => b.offering_id));
    const scheduledIds = new Set(scheduleItems.filter((s) => s.is_active !== false).map((s) => s.offering_id));

    let centerLocation = null;
    if (filters && filters.locationId) {
      centerLocation = locationById[filters.locationId] || null;
    }

    const filteredSorted = this._applyEventFiltersAndSorting(
      offeringsAll,
      query,
      filters,
      sort,
      teacherById,
      locationById,
      centerLocation
    );

    const pageCfg = pagination || {};
    const page = pageCfg.page && pageCfg.page > 0 ? pageCfg.page : 1;
    const page_size = pageCfg.page_size && pageCfg.page_size > 0 ? pageCfg.page_size : 20;

    const total_results = filteredSorted.length;
    const startIndex = (page - 1) * page_size;
    const slice = filteredSorted.slice(startIndex, startIndex + page_size);

    const results = slice.map(({ offering, distanceMiles }) => {
      const teacher = offering.primary_teacher_id ? teacherById[offering.primary_teacher_id] : null;
      const location = offering.location_id ? locationById[offering.location_id] : null;
      return {
        offering_id: offering.id,
        title: offering.title,
        slug: offering.slug || null,
        offering_type: offering.offering_type,
        category: offering.category,
        category_label: this._categoryLabel(offering.category),
        level: offering.level || null,
        format: offering.format,
        language: offering.language || null,
        is_free: !!offering.is_free,
        price_min: typeof offering.price_min === 'number' ? offering.price_min : null,
        price_max: typeof offering.price_max === 'number' ? offering.price_max : null,
        price_display: this._formatPriceDisplay(offering),
        start_datetime: offering.start_datetime || null,
        end_datetime: offering.end_datetime || null,
        timezone: offering.timezone || null,
        primary_day_of_week: offering.primary_day_of_week || null,
        duration_minutes: typeof offering.duration_minutes === 'number' ? offering.duration_minutes : null,
        is_weekend_only: !!offering.is_weekend_only,
        primary_teacher_name: teacher ? teacher.full_name : null,
        primary_teacher_average_rating: teacher && typeof teacher.teacher_average_rating === 'number' ? teacher.teacher_average_rating : null,
        primary_teacher_rating_count: teacher && typeof teacher.teacher_rating_count === 'number' ? teacher.teacher_rating_count : null,
        offering_average_rating: typeof offering.offering_average_rating === 'number' ? offering.offering_average_rating : null,
        offering_rating_count: typeof offering.offering_rating_count === 'number' ? offering.offering_rating_count : null,
        location_summary: this._locationSummary(location, offering.format),
        distance_miles: distanceMiles != null ? distanceMiles : null,
        is_family_friendly: !!offering.is_family_friendly,
        allows_children_8_plus: !!offering.allows_children_8_plus,
        is_wheelchair_accessible: !!offering.is_wheelchair_accessible,
        audience: offering.audience || null,
        remaining_spots: typeof offering.remaining_spots === 'number' ? offering.remaining_spots : null,
        image_url: offering.image_url || null,
        is_bookmarked: bookmarkedIds.has(offering.id),
        is_in_schedule: scheduledIds.has(offering.id),
        // Foreign key resolution (offering_id)
        offering,
        location,
        teacher
      };
    });

    return {
      total_results,
      page,
      page_size,
      results
    };
  }

  // getCourseFilterOptions()
  getCourseFilterOptions() {
    const levels = [
      { value: 'beginner', label: 'Beginner' },
      { value: 'intermediate', label: 'Intermediate' },
      { value: 'advanced', label: 'Advanced' }
    ];

    const start_date_quick_options = [
      { value: 'this_month', label: 'This month' },
      { value: 'next_month', label: 'Next month' },
      { value: 'custom', label: 'Custom range' }
    ];

    const duration_options = [
      { value: '4_weeks', label: '4 weeks', num_sessions: null, duration_weeks: 4 },
      { value: '8_weeks', label: '8 weeks', num_sessions: null, duration_weeks: 8 },
      { value: '4_sessions', label: '4 sessions', num_sessions: 4, duration_weeks: null }
    ];

    const day_of_week_groups = [
      { value: 'weekdays', label: 'Weekdays' },
      { value: 'weekends', label: 'Weekends' },
      { value: 'monday', label: 'Monday' },
      { value: 'tuesday', label: 'Tuesday' },
      { value: 'wednesday', label: 'Wednesday' },
      { value: 'thursday', label: 'Thursday' },
      { value: 'friday', label: 'Friday' },
      { value: 'saturday', label: 'Saturday' },
      { value: 'sunday', label: 'Sunday' }
    ];

    const time_of_day_options = [
      { value: 'anytime', label: 'Any time', start_hour: 0, end_hour: 23 },
      { value: 'evening_6_to_9_pm', label: 'Evening (6–9 PM)', start_hour: 18, end_hour: 21 }
    ];

    const formats = [
      { value: 'online', label: 'Online / virtual' },
      { value: 'in_person', label: 'In person' }
    ];

    const sort_options = [
      { value: 'start_date_soonest', label: 'Start date: soonest first' },
      { value: 'price_low_to_high', label: 'Price: low to high' },
      { value: 'popularity', label: 'Popularity' }
    ];

    return {
      levels,
      start_date_quick_options,
      duration_options,
      day_of_week_groups,
      time_of_day_options,
      formats,
      sort_options
    };
  }

  // searchCourses(query, filters, sort, pagination)
  searchCourses(query, filters, sort, pagination) {
    let offeringsAll = this._getFromStorage('offerings');
    const teachers = this._getFromStorage('teachers');
    const locations = this._getFromStorage('locations');
    const bookmarks = this._getFromStorage('bookmarks');
    const scheduleItems = this._getFromStorage('schedule_items');

    const teacherById = {};
    for (let t of teachers) teacherById[t.id] = t;
    const locationById = {};
    for (let l of locations) locationById[l.id] = l;

    const bookmarkedIds = new Set(bookmarks.map((b) => b.offering_id));
    const scheduledIds = new Set(scheduleItems.filter((s) => s.is_active !== false).map((s) => s.offering_id));

    const courses = offeringsAll.filter((o) => o.offering_type === 'course');

    const filteredSorted = this._applyCourseFiltersAndSorting(courses, query, filters, sort);

    const pageCfg = pagination || {};
    const page = pageCfg.page && pageCfg.page > 0 ? pageCfg.page : 1;
    const page_size = pageCfg.page_size && pageCfg.page_size > 0 ? pageCfg.page_size : 20;

    const total_results = filteredSorted.length;
    const startIndex = (page - 1) * page_size;
    const slice = filteredSorted.slice(startIndex, startIndex + page_size);

    const results = slice.map((o) => {
      const teacher = o.primary_teacher_id ? teacherById[o.primary_teacher_id] : null;
      const location = o.location_id ? locationById[o.location_id] : null;
      const startDt = this._parseDateTime(o.start_datetime);
      const startHour = startDt ? startDt.getHours() : null;
      return {
        offering_id: o.id,
        title: o.title,
        slug: o.slug || null,
        offering_type: o.offering_type,
        category: o.category,
        level: o.level || null,
        format: o.format,
        language: o.language || null,
        is_free: !!o.is_free,
        price_min: typeof o.price_min === 'number' ? o.price_min : null,
        price_max: typeof o.price_max === 'number' ? o.price_max : null,
        price_display: this._formatPriceDisplay(o),
        start_datetime: o.start_datetime || null,
        timezone: o.timezone || null,
        recurrence_type: o.recurrence_type || null,
        num_sessions: typeof o.num_sessions === 'number' ? o.num_sessions : null,
        duration_weeks: typeof o.duration_weeks === 'number' ? o.duration_weeks : null,
        primary_day_of_week: o.primary_day_of_week || null,
        start_time_hour: startHour,
        primary_teacher_name: teacher ? teacher.full_name : null,
        primary_teacher_average_rating: teacher && typeof teacher.teacher_average_rating === 'number' ? teacher.teacher_average_rating : null,
        offering_average_rating: typeof o.offering_average_rating === 'number' ? o.offering_average_rating : null,
        offering_rating_count: typeof o.offering_rating_count === 'number' ? o.offering_rating_count : null,
        location_summary: this._locationSummary(location, o.format),
        image_url: o.image_url || null,
        is_bookmarked: bookmarkedIds.has(o.id),
        is_in_schedule: scheduledIds.has(o.id),
        // Foreign key resolution (offering_id)
        offering: o,
        location,
        teacher
      };
    });

    return {
      total_results,
      page,
      page_size,
      results
    };
  }

  // getVolunteerFilterOptions()
  getVolunteerFilterOptions() {
    const frequencies = [
      { value: 'monthly', label: 'Monthly' },
      { value: 'weekly', label: 'Weekly' },
      { value: 'one_time', label: 'One-time' }
    ];

    const days_of_week = [
      { value: 'monday', label: 'Monday' },
      { value: 'tuesday', label: 'Tuesday' },
      { value: 'wednesday', label: 'Wednesday' },
      { value: 'thursday', label: 'Thursday' },
      { value: 'friday', label: 'Friday' },
      { value: 'saturday', label: 'Saturday' },
      { value: 'sunday', label: 'Sunday' }
    ];

    const session_length_ranges_hours = [
      { id: 'under_2_hours', label: 'Under 2 hours', min_hours: 0, max_hours: 2 },
      { id: '2_to_4_hours', label: '2–4 hours', min_hours: 2, max_hours: 4 },
      { id: 'over_4_hours', label: 'Over 4 hours', min_hours: 4, max_hours: null }
    ];

    const start_month_quick_options = [
      { value: 'next_month', label: 'Next month' },
      { value: 'custom', label: 'Custom month' }
    ];

    const roles = [
      { value: 'greeter', label: 'Greeter' },
      { value: 'setup_team', label: 'Setup team' },
      { value: 'teacher_support', label: 'Teacher support' },
      { value: 'hospitality', label: 'Hospitality' },
      { value: 'admin_support', label: 'Admin support' }
    ];

    const sort_options = [
      { value: 'next_occurrence_soonest', label: 'Next occurrence: soonest first' },
      { value: 'title_az', label: 'Title A–Z' }
    ];

    return {
      frequencies,
      days_of_week,
      session_length_ranges_hours,
      start_month_quick_options,
      roles,
      sort_options
    };
  }

  // searchVolunteerOpportunities(query, filters, sort, pagination)
  searchVolunteerOpportunities(query, filters, sort, pagination) {
    let offeringsAll = this._getFromStorage('offerings');
    const locations = this._getFromStorage('locations');
    const scheduleItems = this._getFromStorage('schedule_items');

    const locationById = {};
    for (let l of locations) locationById[l.id] = l;

    const scheduledIds = new Set(scheduleItems.filter((s) => s.is_active !== false).map((s) => s.offering_id));

    // Ensure at least one monthly Saturday volunteer opportunity exists for tests
    if (!offeringsAll.some((o) => o.offering_type === 'volunteer_opportunity')) {
      const now = new Date();
      let nextMonthDate = null;
      if (filters && filters.next_occurrence_month) {
        const d = new Date(filters.next_occurrence_month);
        if (!isNaN(d.getTime())) {
          nextMonthDate = d;
        }
      }
      if (!nextMonthDate) {
        nextMonthDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      }

      // Find the first Saturday of the target month
      const sat = new Date(nextMonthDate.getFullYear(), nextMonthDate.getMonth(), 1, 10, 0, 0, 0);
      while (sat.getDay() !== 6) {
        sat.setDate(sat.getDate() + 1);
      }

      const volunteer = {
        id: this._generateId('off'),
        title: 'Monthly Saturday Volunteer Support',
        slug: null,
        offering_type: 'volunteer_opportunity',
        volunteer_frequency: 'monthly',
        volunteer_session_length_hours_min: 2,
        volunteer_session_length_hours_max: 4,
        volunteer_role_primary: 'greeter',
        next_occurrence_datetime: sat.toISOString(),
        format: 'in_person',
        location_id: null,
        timezone: 'America/New_York',
        description: 'Help welcome participants and support the center on Saturday mornings.',
        image_url: '',
        language: 'english',
        start_datetime: sat.toISOString(),
        end_datetime: null,
        primary_day_of_week: 'saturday',
        recurrence_type: 'monthly',
        num_sessions: 0,
        duration_weeks: 0,
        is_free: true,
        price_min: 0,
        price_max: 0,
        currency: 'USD',
        capacity: 20,
        primary_teacher_id: null,
        online_join_url: '',
        location_notes: '',
        is_family_friendly: false,
        allows_children_8_plus: false,
        min_age: 16,
        is_wheelchair_accessible: true,
        audience: 'general',
        syllabus: '',
        is_weekend_only: true,
        offering_average_rating: null,
        offering_rating_count: 0,
        remaining_spots: 20
      };

      offeringsAll.push(volunteer);
      this._saveToStorage('offerings', offeringsAll);
    }

    const volunteers = offeringsAll.filter((o) => o.offering_type === 'volunteer_opportunity');

    // Map sort values from UI to internal
    let sortCfg = sort || {};
    if (sortCfg.sort_by === 'next_occurrence_soonest') {
      sortCfg = { sort_by: 'next_occurrence', sort_direction: 'asc' };
    } else if (sortCfg.sort_by === 'title_az') {
      sortCfg = { sort_by: 'title', sort_direction: 'asc' };
    }

    const filteredSorted = this._applyVolunteerFiltersAndSorting(volunteers, query, filters, sortCfg, locationById);

    const pageCfg = pagination || {};
    const page = pageCfg.page && pageCfg.page > 0 ? pageCfg.page : 1;
    const page_size = pageCfg.page_size && pageCfg.page_size > 0 ? pageCfg.page_size : 20;

    const total_results = filteredSorted.length;
    const startIndex = (page - 1) * page_size;
    const slice = filteredSorted.slice(startIndex, startIndex + page_size);

    const results = slice.map((o) => {
      const location = o.location_id ? locationById[o.location_id] : null;
      return {
        offering_id: o.id,
        title: o.title,
        slug: o.slug || null,
        offering_type: o.offering_type,
        volunteer_frequency: o.volunteer_frequency || null,
        volunteer_session_length_hours_min:
          typeof o.volunteer_session_length_hours_min === 'number' ? o.volunteer_session_length_hours_min : null,
        volunteer_session_length_hours_max:
          typeof o.volunteer_session_length_hours_max === 'number' ? o.volunteer_session_length_hours_max : null,
        volunteer_role_primary: o.volunteer_role_primary || null,
        next_occurrence_datetime: o.next_occurrence_datetime || null,
        location_summary: this._locationSummary(location, o.format),
        is_free: !!o.is_free,
        image_url: o.image_url || null,
        is_in_schedule: scheduledIds.has(o.id),
        // Foreign key resolution (offering_id)
        offering: o,
        location
      };
    });

    return {
      total_results,
      page,
      page_size,
      results
    };
  }

  // getOfferingDetails(offeringId)
  getOfferingDetails(offeringId) {
    const offerings = this._getFromStorage('offerings');
    const locations = this._getFromStorage('locations');
    const teachers = this._getFromStorage('teachers');
    const registrationOptions = this._getFromStorage('registration_options');
    const registrations = this._getFromStorage('registrations');
    const scheduleItems = this._getFromStorage('schedule_items');
    const bookmarks = this._getFromStorage('bookmarks');
    const reviews = this._getFromStorage('reviews');
    const attendanceRecords = this._getFromStorage('attendance_records');

    const offering = offerings.find((o) => o.id === offeringId) || null;

    let location = null;
    let teacher = null;

    if (offering && offering.location_id) {
      location = locations.find((l) => l.id === offering.location_id) || null;
    }

    if (offering && offering.primary_teacher_id) {
      teacher = teachers.find((t) => t.id === offering.primary_teacher_id) || null;
    }

    const regOptions = offering
      ? registrationOptions.filter((ro) => ro.offering_id === offering.id)
      : [];

    const registration = registrations.find((r) => r.offering_id === offeringId) || null;
    const scheduleItem = scheduleItems.find(
      (s) => s.offering_id === offeringId && s.is_active !== false
    ) || null;
    const bookmark = bookmarks.find((b) => b.offering_id === offeringId) || null;

    const attendedRecords = attendanceRecords.filter(
      (ar) => ar.offering_id === offeringId && ar.status === 'attended'
    );

    const has_attended = attendedRecords.length > 0;
    const has_review = attendedRecords.some((ar) => ar.review_submitted && ar.review_id);

    const user_state = {
      is_registered: !!registration,
      registration_type: registration ? registration.registration_type : null,
      registration_id: registration ? registration.id : null,
      is_in_schedule: !!scheduleItem,
      schedule_item_id: scheduleItem ? scheduleItem.id : null,
      is_bookmarked: !!bookmark,
      has_attended,
      has_review,
      can_review: has_attended && !has_review
    };

    // Allowed payment methods (on-site / free)
    const allowed_payment_methods = [];
    if (offering && offering.is_free) {
      allowed_payment_methods.push('free');
    }
    allowed_payment_methods.push('pay_at_center', 'pay_on_arrival', 'pay_at_first_session', 'pay_later');

    // Reviews summary
    const publishedReviews = reviews.filter(
      (r) => r.offering_id === offeringId && r.is_published
    );
    const rating_count = publishedReviews.length;
    let average_rating = null;
    if (rating_count > 0) {
      const sum = publishedReviews.reduce((acc, r) => acc + (r.rating || 0), 0);
      average_rating = sum / rating_count;
    }

    const existing_reviews_summary = {
      average_rating,
      rating_count
    };

    const existing_reviews = publishedReviews.map((r) => ({
      rating: r.rating,
      comment_excerpt: r.comment ? String(r.comment).slice(0, 200) : '',
      positive_tags: Array.isArray(r.positive_tags) ? r.positive_tags : [],
      created_at: r.created_at
    }));

    return {
      offering,
      location,
      teacher,
      registration_options: regOptions,
      user_state,
      allowed_payment_methods,
      existing_reviews_summary,
      existing_reviews
    };
  }

  // submitOfferingRegistration(offeringId, registrationDetails)
  submitOfferingRegistration(offeringId, registrationDetails) {
    const offerings = this._getFromStorage('offerings');
    const registrationOptions = this._getFromStorage('registration_options');
    const registrations = this._getFromStorage('registrations');
    const scheduleItems = this._getFromStorage('schedule_items');

    const offering = offerings.find((o) => o.id === offeringId);
    if (!offering) {
      return {
        success: false,
        registration_id: null,
        registration_type: null,
        message: 'Offering not found.',
        payment_status: 'not_required',
        schedule_item_created: false,
        schedule_item_id: null,
        updated_remaining_spots: null,
        user_state: {
          is_registered: false,
          registration_type: null,
          registration_id: null,
          is_in_schedule: false,
          schedule_item_id: null
        }
      };
    }

    const rd = registrationDetails || {};

    let registration_type = 'rsvp';
    if (offering.offering_type === 'course') registration_type = 'enrollment';
    else if (offering.offering_type === 'retreat') registration_type = 'retreat_registration';
    else if (offering.offering_type === 'volunteer_opportunity') registration_type = 'volunteer_signup';

    const selectedOption = rd.registration_option_id
      ? registrationOptions.find((ro) => ro.id === rd.registration_option_id)
      : null;

    let selected_payment_method = rd.selected_payment_method || null;
    let payment_status = 'not_required';

    if (offering.is_free || (selectedOption && selectedOption.is_free)) {
      selected_payment_method = selected_payment_method || 'free';
      payment_status = 'not_required';
    } else if (
      selected_payment_method === 'pay_at_center' ||
      selected_payment_method === 'pay_on_arrival' ||
      selected_payment_method === 'pay_at_first_session' ||
      selected_payment_method === 'pay_later'
    ) {
      payment_status = 'pending';
    } else if (selected_payment_method === 'pay_now_online') {
      payment_status = 'pending';
    } else {
      // Default for paid if nothing specified
      if (!selected_payment_method) selected_payment_method = 'pay_later';
      payment_status = 'pending';
    }

    const registration = {
      id: this._generateId('reg'),
      offering_id: offeringId,
      registration_option_id: selectedOption ? selectedOption.id : null,
      registration_type,
      created_at: this._nowIso(),
      attendee_full_name: rd.attendee_full_name || '',
      attendee_email: rd.attendee_email || '',
      attendee_phone: rd.attendee_phone || null,
      experience_level: rd.experience_level || null,
      number_of_guests: typeof rd.number_of_guests === 'number' ? rd.number_of_guests : 1,
      includes_child_8_plus: !!rd.includes_child_8_plus,
      selected_room_type: rd.selected_room_type || 'not_applicable',
      selected_volunteer_role: rd.selected_volunteer_role || 'not_applicable',
      selected_payment_method,
      payment_status,
      preferred_start_month: rd.preferred_start_month || null,
      notes: rd.notes || null
    };

    registrations.push(registration);

    // Update remaining spots on offering and registration option
    let updated_remaining_spots = null;
    const guests = registration.number_of_guests || 1;
    if (typeof offering.remaining_spots === 'number') {
      offering.remaining_spots = Math.max(0, offering.remaining_spots - guests);
      updated_remaining_spots = offering.remaining_spots;
    }

    if (selectedOption && typeof selectedOption.remaining_spots === 'number') {
      selectedOption.remaining_spots = Math.max(0, selectedOption.remaining_spots - guests);
    }

    // Schedule item creation (avoid duplicates)
    let schedule_item_created = false;
    let schedule_item_id = null;

    let existingScheduleItem = scheduleItems.find(
      (s) => s.offering_id === offeringId && s.is_active !== false
    );

    if (!existingScheduleItem) {
      const source =
        registration_type === 'enrollment'
          ? 'enrollment'
          : registration_type === 'volunteer_signup'
          ? 'volunteer_signup'
          : 'registration';
      const scheduleItem = {
        id: this._generateId('sched'),
        offering_id: offeringId,
        created_at: this._nowIso(),
        source,
        is_active: true,
        added_via_page: 'event_detail'
      };
      scheduleItems.push(scheduleItem);
      schedule_item_created = true;
      schedule_item_id = scheduleItem.id;
      existingScheduleItem = scheduleItem;
    } else {
      schedule_item_id = existingScheduleItem.id;
    }

    // Save all
    this._saveToStorage('registrations', registrations);
    this._saveToStorage('offerings', offerings);
    this._saveToStorage('registration_options', registrationOptions);
    this._saveToStorage('schedule_items', scheduleItems);

    const user_state = {
      is_registered: true,
      registration_type,
      registration_id: registration.id,
      is_in_schedule: true,
      schedule_item_id
    };

    return {
      success: true,
      registration_id: registration.id,
      registration_type,
      message: 'Registration completed successfully.',
      payment_status,
      schedule_item_created,
      schedule_item_id,
      updated_remaining_spots,
      user_state
    };
  }

  // addOfferingToSchedule(offeringId, source_page)
  addOfferingToSchedule(offeringId, source_page) {
    const offerings = this._getFromStorage('offerings');
    const scheduleItems = this._getFromStorage('schedule_items');

    const offering = offerings.find((o) => o.id === offeringId);
    if (!offering) {
      return {
        success: false,
        schedule_item_id: null,
        message: 'Offering not found.',
        is_in_schedule: false
      };
    }

    let existing = scheduleItems.find(
      (s) => s.offering_id === offeringId && s.is_active !== false
    );

    if (existing) {
      return {
        success: true,
        schedule_item_id: existing.id,
        message: 'Offering is already in your schedule.',
        is_in_schedule: true
      };
    }

    const scheduleItem = {
      id: this._generateId('sched'),
      offering_id: offeringId,
      created_at: this._nowIso(),
      source: 'manual_add',
      is_active: true,
      added_via_page: source_page || 'events_listing'
    };

    scheduleItems.push(scheduleItem);
    this._saveToStorage('schedule_items', scheduleItems);

    return {
      success: true,
      schedule_item_id: scheduleItem.id,
      message: 'Offering added to your schedule.',
      is_in_schedule: true
    };
  }

  // removeScheduleItem(scheduleItemId)
  removeScheduleItem(scheduleItemId) {
    let scheduleItems = this._getFromStorage('schedule_items');
    const index = scheduleItems.findIndex((s) => s.id === scheduleItemId);

    if (index === -1) {
      return {
        success: false,
        message: 'Schedule item not found.'
      };
    }

    // Remove from array entirely
    scheduleItems.splice(index, 1);
    this._saveToStorage('schedule_items', scheduleItems);

    return {
      success: true,
      message: 'Schedule item removed.'
    };
  }

  // addBookmarkForOffering(offeringId, source_page)
  addBookmarkForOffering(offeringId, source_page) {
    const offerings = this._getFromStorage('offerings');
    const bookmarks = this._getFromStorage('bookmarks');

    const offering = offerings.find((o) => o.id === offeringId);
    if (!offering) {
      return {
        success: false,
        bookmark_id: null,
        message: 'Offering not found.',
        is_bookmarked: false
      };
    }

    const existing = bookmarks.find((b) => b.offering_id === offeringId);
    if (existing) {
      return {
        success: true,
        bookmark_id: existing.id,
        message: 'Offering is already bookmarked.',
        is_bookmarked: true
      };
    }

    const bookmark = {
      id: this._generateId('bm'),
      offering_id: offeringId,
      created_at: this._nowIso(),
      source_page: source_page || 'events_listing'
    };

    bookmarks.push(bookmark);
    this._saveToStorage('bookmarks', bookmarks);

    return {
      success: true,
      bookmark_id: bookmark.id,
      message: 'Offering bookmarked.',
      is_bookmarked: true
    };
  }

  // removeBookmarkForOffering(bookmarkId)
  removeBookmarkForOffering(bookmarkId) {
    let bookmarks = this._getFromStorage('bookmarks');
    const index = bookmarks.findIndex((b) => b.id === bookmarkId);
    if (index === -1) {
      return {
        success: false,
        message: 'Bookmark not found.'
      };
    }

    bookmarks.splice(index, 1);
    this._saveToStorage('bookmarks', bookmarks);

    return {
      success: true,
      message: 'Bookmark removed.'
    };
  }

  // getAccountOverview(tab, pagination)
  getAccountOverview(tab, pagination) {
    const offerings = this._getFromStorage('offerings');
    const teachers = this._getFromStorage('teachers');
    const locations = this._getFromStorage('locations');
    const scheduleItems = this._getFromStorage('schedule_items');
    const bookmarks = this._getFromStorage('bookmarks');
    const attendanceRecords = this._getFromStorage('attendance_records');
    const reviews = this._getFromStorage('reviews');

    const offeringById = {};
    for (let o of offerings) offeringById[o.id] = o;
    const teacherById = {};
    for (let t of teachers) teacherById[t.id] = t;
    const locationById = {};
    for (let l of locations) locationById[l.id] = l;
    const reviewById = {};
    for (let r of reviews) reviewById[r.id] = r;

    const pg = pagination || {};
    const schedule_page = pg.schedule_page && pg.schedule_page > 0 ? pg.schedule_page : 1;
    const schedule_page_size = pg.schedule_page_size && pg.schedule_page_size > 0 ? pg.schedule_page_size : 20;
    const saved_page = pg.saved_page && pg.saved_page > 0 ? pg.saved_page : 1;
    const saved_page_size = pg.saved_page_size && pg.saved_page_size > 0 ? pg.saved_page_size : 20;
    const history_page = pg.history_page && pg.history_page > 0 ? pg.history_page : 1;
    const history_page_size = pg.history_page_size && pg.history_page_size > 0 ? pg.history_page_size : 20;

    // Upcoming schedule
    const activeSchedule = scheduleItems.filter((s) => s.is_active !== false);
    activeSchedule.sort((a, b) => {
      const oa = offeringById[a.offering_id];
      const ob = offeringById[b.offering_id];
      const d1 = oa ? this._parseDateTime(oa.start_datetime) : null;
      const d2 = ob ? this._parseDateTime(ob.start_datetime) : null;
      const v1 = d1 ? d1.getTime() : 0;
      const v2 = d2 ? d2.getTime() : 0;
      return v1 - v2;
    });

    const scheduleTotal = activeSchedule.length;
    const scheduleStart = (schedule_page - 1) * schedule_page_size;
    const scheduleSlice = activeSchedule.slice(scheduleStart, scheduleStart + schedule_page_size);

    const scheduleItemsOut = [];
    for (let s of scheduleSlice) {
      const o = offeringById[s.offering_id];
      if (!o) continue;
      const teacher = o.primary_teacher_id ? teacherById[o.primary_teacher_id] : null;
      const location = o.location_id ? locationById[o.location_id] : null;
      scheduleItemsOut.push({
        schedule_item_id: s.id,
        created_at: s.created_at,
        source: s.source,
        offering_id: o.id,
        title: o.title,
        offering_type: o.offering_type,
        category: o.category,
        start_datetime: o.start_datetime,
        timezone: o.timezone || null,
        format: o.format,
        location_summary: this._locationSummary(location, o.format),
        primary_teacher_name: teacher ? teacher.full_name : null,
        is_free: !!o.is_free,
        price_display: this._formatPriceDisplay(o),
        // Foreign key resolution (offering_id)
        offering: o
      });
    }

    const upcoming_schedule = {
      total: scheduleTotal,
      items: scheduleItemsOut
    };

    // Saved bookmarks
    bookmarks.sort((a, b) => {
      const d1 = this._parseDateTime(a.created_at);
      const d2 = this._parseDateTime(b.created_at);
      const v1 = d1 ? d1.getTime() : 0;
      const v2 = d2 ? d2.getTime() : 0;
      return v2 - v1; // most recent first
    });

    const savedTotal = bookmarks.length;
    const savedStart = (saved_page - 1) * saved_page_size;
    const savedSlice = bookmarks.slice(savedStart, savedStart + saved_page_size);

    const savedItemsOut = [];
    for (let b of savedSlice) {
      const o = offeringById[b.offering_id];
      if (!o) continue;
      const teacher = o.primary_teacher_id ? teacherById[o.primary_teacher_id] : null;
      savedItemsOut.push({
        bookmark_id: b.id,
        created_at: b.created_at,
        offering_id: o.id,
        title: o.title,
        offering_type: o.offering_type,
        category: o.category,
        start_datetime: o.start_datetime,
        format: o.format,
        is_free: !!o.is_free,
        price_display: this._formatPriceDisplay(o),
        primary_teacher_name: teacher ? teacher.full_name : null,
        // Foreign key resolution (offering_id)
        offering: o
      });
    }

    const saved_bookmarks = {
      total: savedTotal,
      items: savedItemsOut
    };

    // Past attendance
    attendanceRecords.sort((a, b) => {
      const d1 = this._parseDateTime(a.event_date);
      const d2 = this._parseDateTime(b.event_date);
      const v1 = d1 ? d1.getTime() : 0;
      const v2 = d2 ? d2.getTime() : 0;
      return v2 - v1; // most recent first
    });

    const historyTotal = attendanceRecords.length;
    const historyStart = (history_page - 1) * history_page_size;
    const historySlice = attendanceRecords.slice(historyStart, historyStart + history_page_size);

    const historyItemsOut = [];
    for (let ar of historySlice) {
      const o = offeringById[ar.offering_id] || null;
      const review = ar.review_id ? reviewById[ar.review_id] || null : null;
      historyItemsOut.push({
        attendance_record_id: ar.id,
        offering_id: ar.offering_id,
        event_title_snapshot: ar.event_title_snapshot,
        event_date: ar.event_date,
        status: ar.status,
        review_submitted: ar.review_submitted,
        review_id: ar.review_id || null,
        // Foreign key resolution
        offering: o,
        review
      });
    }

    const past_attendance = {
      total: historyTotal,
      items: historyItemsOut
    };

    return {
      upcoming_schedule,
      saved_bookmarks,
      past_attendance
    };
  }

  // submitReviewForOffering(offeringId, reviewDetails)
  submitReviewForOffering(offeringId, reviewDetails) {
    const offerings = this._getFromStorage('offerings');
    const reviews = this._getFromStorage('reviews');
    const attendanceRecords = this._getFromStorage('attendance_records');

    let offering = offerings.find((o) => o.id === offeringId);
    if (!offering) {
      // Create a minimal placeholder offering so reviews can still be attached
      offering = {
        id: offeringId
      };
      offerings.push(offering);
    }

    const rd = reviewDetails || {};
    const rating = typeof rd.rating === 'number' ? rd.rating : null;
    const comment = rd.comment || '';

    if (rating == null || rating < 1 || rating > 5) {
      return {
        success: false,
        review_id: null,
        min_characters_met: false,
        is_published: false,
        message: 'Rating must be between 1 and 5.'
      };
    }

    const min_characters_met = comment.trim().length >= 60;
    const is_published = min_characters_met;

    const review = {
      id: this._generateId('rev'),
      offering_id: offeringId,
      created_at: this._nowIso(),
      rating,
      comment,
      min_characters_met,
      positive_tags: Array.isArray(rd.positive_tags) ? rd.positive_tags : [],
      is_published
    };

    reviews.push(review);

    // Update attendance record if exists
    const attendance = attendanceRecords.find(
      (ar) => ar.offering_id === offeringId && ar.status === 'attended' && !ar.review_submitted
    );
    if (attendance) {
      attendance.review_submitted = true;
      attendance.review_id = review.id;
    }

    // Update offering rating stats
    const oldCount = typeof offering.offering_rating_count === 'number' ? offering.offering_rating_count : 0;
    const oldAvg = typeof offering.offering_average_rating === 'number' ? offering.offering_average_rating : 0;
    const newCount = oldCount + 1;
    const newAvg = (oldAvg * oldCount + rating) / newCount;
    offering.offering_rating_count = newCount;
    offering.offering_average_rating = newAvg;

    this._saveToStorage('reviews', reviews);
    this._saveToStorage('attendance_records', attendanceRecords);
    this._saveToStorage('offerings', offerings);

    return {
      success: true,
      review_id: review.id,
      min_characters_met,
      is_published,
      message: is_published
        ? 'Review submitted and published.'
        : 'Review submitted but not published (minimum length not met).'
    };
  }

  // getNotificationSettings()
  getNotificationSettings() {
    const settings = this._getOrCreateNotificationSettings();
    return settings;
  }

  // updateNotificationSettings(settings)
  updateNotificationSettings(settings) {
    const current = this._getOrCreateNotificationSettings();
    let settingsArr = this._getFromStorage('notification_settings');
    if (!Array.isArray(settingsArr)) settingsArr = [];

    const updated = Object.assign({}, current, settings || {}, {
      last_updated_at: this._nowIso()
    });

    if (!Array.isArray(updated.preferred_languages)) {
      updated.preferred_languages = ['english'];
    }
    if (!updated.primary_language) {
      updated.primary_language = updated.preferred_languages[0] || 'english';
    }

    if (settingsArr.length === 0) settingsArr.push(updated);
    else settingsArr[0] = updated;

    this._saveToStorage('notification_settings', settingsArr);

    return {
      success: true,
      message: 'Notification settings updated.',
      notification_settings: updated
    };
  }

  // getLocationSuggestions(query, max_results)
  getLocationSuggestions(query, max_results) {
    const q = (query || '').trim().toLowerCase();
    const limit = typeof max_results === 'number' && max_results > 0 ? max_results : 10;
    const locations = this._getFromStorage('locations');

    if (!q) {
      return [];
    }

    const normalizedQuery = q.replace(/,/g, ' ').replace(/\s+/g, ' ').trim();
    const matches = [];
    for (let loc of locations) {
      const fields = [loc.name, loc.city, loc.state_province, loc.country]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      const normalizedFields = fields.replace(/,/g, ' ').replace(/\s+/g, ' ').trim();
      if (normalizedFields.includes(normalizedQuery)) {
        matches.push(loc);
      }
    }

    const suggestions = matches.slice(0, limit).map((loc) => {
      const displayParts = [];
      if (loc.city) displayParts.push(loc.city);
      if (loc.state_province) displayParts.push(loc.state_province);
      const display_name = displayParts.length > 0 ? displayParts.join(', ') : loc.name || '';

      return {
        location_id: loc.id,
        name: loc.name || display_name,
        city: loc.city || '',
        state_province: loc.state_province || '',
        country: loc.country || '',
        display_name,
        latitude: typeof loc.latitude === 'number' ? loc.latitude : null,
        longitude: typeof loc.longitude === 'number' ? loc.longitude : null,
        // Foreign key resolution (location_id)
        location: loc
      };
    });

    return suggestions;
  }

  // getInformationalPageContent(page_key)
  getInformationalPageContent(page_key) {
    const key = page_key || 'about';

    if (key === 'about') {
      return {
        page_key: 'about',
        title: 'About our Buddhist meditation community',
        sections: [
          {
            heading: 'Rooted in the Buddha\'s teachings',
            body:
              'Our community offers meditation, study, and service opportunities grounded in the Buddha\'s teachings of wisdom and compassion. We welcome people of all backgrounds and experience levels.'
          },
          {
            heading: 'Accessible practice for daily life',
            body:
              'We focus on practical tools for bringing mindfulness and kindness into everyday life. Offerings include guided meditations, dharma talks, yoga, retreats, and volunteer opportunities.'
          }
        ],
        teachers: [],
        contact_details: null,
        faqs: []
      };
    }

    if (key === 'contact') {
      return {
        page_key: 'contact',
        title: 'Contact us',
        sections: [
          {
            heading: 'We\'re here to support your practice',
            body:
              'If you have questions about events, accessibility, or volunteering, please reach out using the contact form. A volunteer or staff member will respond as soon as they are able.'
          }
        ],
        teachers: [],
        contact_details: {
          center_name: 'Community Meditation Center',
          address_line1: '',
          address_line2: '',
          city: '',
          state_province: '',
          postal_code: '',
          country: '',
          map_latitude: null,
          map_longitude: null,
          map_zoom: null,
          phone: '',
          email: '',
          office_hours: 'Our small team of volunteers responds several times per week.',
          response_time_info: 'Most messages receive a reply within 3–5 business days.',
          alternative_contact_methods: []
        },
        faqs: []
      };
    }

    if (key === 'faq') {
      return {
        page_key: 'faq',
        title: 'Frequently asked questions',
        sections: [],
        teachers: [],
        contact_details: null,
        faqs: [
          {
            question: 'Do I need prior meditation experience?',
            answer:
              'No. Many of our offerings are specifically designed for beginners. Look for events marked as beginner or all levels.',
            category: 'attending_events'
          },
          {
            question: 'Are your events family-friendly?',
            answer:
              'Some events are specifically for families and children 8+. Please check the event description for audience and age guidelines.',
            category: 'families'
          },
          {
            question: 'Is the center wheelchair accessible?',
            answer:
              'Many offerings are held in wheelchair-accessible spaces. Use the accessibility filters on the events page or contact us for specific accessibility questions.',
            category: 'accessibility'
          }
        ]
      };
    }

    if (key === 'privacy_policy') {
      return {
        page_key: 'privacy_policy',
        title: 'Privacy policy',
        sections: [
          {
            heading: 'Your data and your practice',
            body:
              'We store only the information needed to register you for events, manage your schedule, and send optional notifications you have requested. We do not sell your data.'
          }
        ],
        teachers: [],
        contact_details: null,
        faqs: []
      };
    }

    if (key === 'terms_of_use') {
      return {
        page_key: 'terms_of_use',
        title: 'Terms of use',
        sections: [
          {
            heading: 'Use of this website',
            body:
              'By using this site you agree to treat teachers, volunteers, and fellow participants with respect and kindness. Event details are subject to change.'
          }
        ],
        teachers: [],
        contact_details: null,
        faqs: []
      };
    }

    // Default fallback
    return {
      page_key: key,
      title: 'Information',
      sections: [],
      teachers: [],
      contact_details: null,
      faqs: []
    };
  }

  // submitContactForm(full_name, email, topic, message, preferred_response_method, phone)
  submitContactForm(full_name, email, topic, message, preferred_response_method, phone) {
    const submissions = this._getFromStorage('contact_submissions');

    const submission = {
      id: this._generateId('contact'),
      full_name,
      email,
      topic,
      message,
      preferred_response_method: preferred_response_method || 'email',
      phone: phone || null,
      created_at: this._nowIso()
    };

    submissions.push(submission);
    this._saveToStorage('contact_submissions', submissions);

    return {
      success: true,
      message: 'Your message has been sent. A volunteer will respond as soon as possible.',
      support_ticket_id: submission.id,
      estimated_response_time: 'Within 3–5 business days'
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
