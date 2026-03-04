/* localStorage polyfill for Node.js and environments without localStorage */
const localStorage = (function () {
  try {
    if (typeof globalThis !== 'undefined' && globalThis.localStorage) {
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

// Constants / helpers not tied to DOM
const MEETING_DAY_OF_WEEK_OPTIONS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday'
];

const MEETING_FORMAT_OPTIONS = ['in_person', 'online', 'hybrid'];
const MEETING_GROUP_FOCUS_OPTIONS = [
  'alcohol_support',
  'narcotics_support',
  'family_friends_support',
  'general_recovery',
  'other'
];
const MEETING_AUDIENCE_OPTIONS = [
  'open_to_all',
  'women_only',
  'men_only',
  'lgbtq_only',
  'family_friends_only',
  'other'
];

const EVENT_TOPIC_OPTIONS = [
  'relapse_prevention',
  'coping_skills',
  'mindfulness',
  'family_support',
  'other'
];

const EVENT_FORMAT_OPTIONS = ['in_person', 'online', 'hybrid'];

const TIME_OF_DAY_BUCKETS = [
  {
    key: 'morning',
    label: 'Morning (5:00 AM - 12:00 PM)',
    start_time_local: '05:00',
    end_time_local: '12:00'
  },
  {
    key: 'afternoon',
    label: 'Afternoon (12:00 PM - 5:00 PM)',
    start_time_local: '12:00',
    end_time_local: '17:00'
  },
  {
    key: 'evening',
    label: 'Evening (5:00 PM - 10:00 PM)',
    start_time_local: '17:00',
    end_time_local: '22:00'
  },
  {
    key: 'late_night',
    label: 'Late Night (10:00 PM - 5:00 AM)',
    start_time_local: '22:00',
    end_time_local: '05:00'
  }
];

function _pad2(num) {
  return num < 10 ? '0' + num : '' + num;
}

function _dateToISODateString(d) {
  if (!(d instanceof Date) || isNaN(d.getTime())) return null;
  return d.getFullYear() + '-' + _pad2(d.getMonth() + 1) + '-' + _pad2(d.getDate());
}

function _parseISODate(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return d;
}

function _compareTimesHHMM(a, b) {
  if (!a && !b) return 0;
  if (!a) return -1;
  if (!b) return 1;
  const [ah, am] = a.split(':').map(Number);
  const [bh, bm] = b.split(':').map(Number);
  const at = ah * 60 + am;
  const bt = bh * 60 + bm;
  if (at < bt) return -1;
  if (at > bt) return 1;
  return 0;
}

function _formatTimeHHMMTo12h(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return '';
  const parts = timeStr.split(':');
  if (parts.length < 2) return timeStr;
  let h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10) || 0;
  if (isNaN(h)) return timeStr;
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  if (h === 0) h = 12;
  return h + ':' + _pad2(m) + ' ' + ampm;
}

function _capitalizeFirst(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function _haversineDistanceMiles(lat1, lon1, lat2, lon2) {
  function toRad(v) {
    return (v * Math.PI) / 180;
  }
  const R = 3958.8; // Earth radius in miles
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

class BusinessLogic {
  constructor() {
    this._initStorage();
    this.idCounter = this._getNextIdCounter();
  }

  /* ------------------------ Storage helpers ------------------------ */

  _initStorage() {
    const keys = [
      'meetings',
      'facilitators',
      'facilitator_messages',
      'articles',
      'reading_list_items',
      'events',
      'event_registrations',
      'plan_items',
      'favorite_groups',
      'self_assessment_quizzes',
      'self_assessment_questions',
      'self_assessment_options',
      'self_assessment_submissions',
      'self_assessment_answers',
      'stories',
      'note_items',
      'hotlines',
      'quick_contact_items'
    ];

    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
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

  _getUserScopedCollection(key) {
    // Single-user context: just return the collection
    return this._getFromStorage(key);
  }

  _dayOfWeekIndex(dayKey) {
    return MEETING_DAY_OF_WEEK_OPTIONS.indexOf(dayKey);
  }

  _computeMeetingScheduleDisplay(meeting) {
    if (!meeting) return '';
    const day = _capitalizeFirst(meeting.day_of_week || '');
    const start = _formatTimeHHMMTo12h(meeting.start_time_local || '');
    const end = meeting.end_time_local ? _formatTimeHHMMTo12h(meeting.end_time_local) : '';
    if (start && end) return day + ' ' + start + ' - ' + end;
    if (start) return day + ' ' + start;
    return day;
  }

  _computeRatingDisplay(rating, reviewCount) {
    if (typeof rating !== 'number' || isNaN(rating)) return 'No ratings yet';
    const r = rating.toFixed(1);
    if (typeof reviewCount === 'number' && !isNaN(reviewCount)) {
      return r + ' stars (' + reviewCount + ' reviews)';
    }
    return r + ' stars';
  }

  _computeMeetingAudienceDisplay(audience) {
    const map = {
      open_to_all: 'Open to all',
      women_only: 'Women only',
      men_only: 'Men only',
      lgbtq_only: 'LGBTQ+ only',
      family_friends_only: 'Family & friends only',
      other: 'Other'
    };
    return map[audience] || 'Unspecified';
  }

  _computeGroupFocusDisplay(groupFocus) {
    const map = {
      alcohol_support: 'Alcohol support',
      narcotics_support: 'Narcotics support',
      family_friends_support: 'Family & friends support',
      general_recovery: 'General recovery',
      other: 'Other'
    };
    return map[groupFocus] || 'Unspecified';
  }

  _computeMeetingFormatDisplay(format) {
    const map = {
      in_person: 'In-person',
      online: 'Online',
      hybrid: 'Hybrid'
    };
    return map[format] || 'Unspecified';
  }

  _computeEventPriceDisplay(event) {
    if (!event) return '';
    if (typeof event.price !== 'number' || isNaN(event.price)) return 'Price not specified';
    if (event.price === 0) return 'Free';
    return '$' + event.price.toFixed(2) + ' ' + (event.currency || 'usd').toUpperCase();
  }

  _computeStoryStageDisplay(stage) {
    const map = {
      early_0_6_months: 'Early (0–6 months)',
      mid_6_12_months: 'Mid (6–12 months)',
      long_term_1_plus_years: 'Long-term (1+ years)',
      unspecified: 'Unspecified'
    };
    return map[stage] || 'Unspecified';
  }

  _getOrCreateUserPlan() {
    // Returns the array of plan_items (single-user)
    return this._getUserScopedCollection('plan_items');
  }

  _resolveLocationToCoordinates(location_query) {
    if (!location_query) return null;
    // Use existing meetings data: derive coordinates from city/state match
    const meetings = this._getFromStorage('meetings');
    if (!meetings.length) return null;
    const q = String(location_query).toLowerCase();
    let chosen = null;
    for (let i = 0; i < meetings.length; i++) {
      const m = meetings[i];
      const city = (m.city || '').toLowerCase();
      const state = (m.state || '').toLowerCase();
      const label = (m.city || '') + (m.state ? ', ' + m.state : '');
      const labelLower = label.toLowerCase();
      if (
        (city && q.indexOf(city) !== -1) ||
        (state && q.indexOf(state) !== -1) ||
        (label && labelLower.indexOf(q) !== -1)
      ) {
        if (typeof m.latitude === 'number' && typeof m.longitude === 'number') {
          chosen = { latitude: m.latitude, longitude: m.longitude };
          break;
        }
      }
    }
    return chosen;
  }

  _applyMeetingSearchFilters(meetings, locationCoordinates, filters, sort_by) {
    filters = filters || {};
    sort_by = sort_by || 'distance';

    const maxDistance = typeof filters.max_distance_miles === 'number' ? filters.max_distance_miles : null;
    const formats = Array.isArray(filters.formats) && filters.formats.length ? filters.formats : null;
    const days = Array.isArray(filters.days_of_week) && filters.days_of_week.length ? filters.days_of_week : null;
    const groupFocuses = Array.isArray(filters.group_focuses) && filters.group_focuses.length ? filters.group_focuses : null;
    const audiences = Array.isArray(filters.audiences) && filters.audiences.length ? filters.audiences : null;
    const minRating = typeof filters.min_rating === 'number' ? filters.min_rating : null;
    const minReviewCount = typeof filters.min_review_count === 'number' ? filters.min_review_count : null;
    const startTimeMin = filters.start_time_min_local || null;
    const strictAfter = !!filters.start_time_strictly_after;
    const timeOfDayKey = filters.time_of_day_key || null;

    let bucket = null;
    if (timeOfDayKey) {
      for (let i = 0; i < TIME_OF_DAY_BUCKETS.length; i++) {
        if (TIME_OF_DAY_BUCKETS[i].key === timeOfDayKey) {
          bucket = TIME_OF_DAY_BUCKETS[i];
          break;
        }
      }
    }

    const filtered = [];
    for (let i = 0; i < meetings.length; i++) {
      const m = meetings[i];
      let distanceMiles = null;

      if (
        locationCoordinates &&
        typeof m.latitude === 'number' &&
        typeof m.longitude === 'number'
      ) {
        distanceMiles = _haversineDistanceMiles(
          locationCoordinates.latitude,
          locationCoordinates.longitude,
          m.latitude,
          m.longitude
        );
      }

      if (maxDistance != null && distanceMiles != null && distanceMiles > maxDistance) {
        continue;
      }

      if (formats && formats.indexOf(m.format) === -1) continue;
      if (days && days.indexOf(m.day_of_week) === -1) continue;
      if (groupFocuses && groupFocuses.indexOf(m.group_focus) === -1) continue;
      if (audiences && audiences.indexOf(m.audience) === -1) continue;

      if (minRating != null) {
        if (typeof m.rating !== 'number' || m.rating < minRating) continue;
      }
      if (minReviewCount != null) {
        if (typeof m.review_count !== 'number' || m.review_count < minReviewCount) continue;
      }

      if (startTimeMin) {
        const cmp = _compareTimesHHMM(m.start_time_local || '00:00', startTimeMin);
        if (strictAfter) {
          if (cmp <= 0) continue;
        } else {
          if (cmp < 0) continue;
        }
      }

      if (bucket) {
        const start = m.start_time_local || null;
        if (bucket.key === 'late_night') {
          const afterLateNight = _compareTimesHHMM(start, bucket.start_time_local) >= 0;
          const beforeMorning = _compareTimesHHMM(start, bucket.end_time_local) < 0;
          if (!(afterLateNight || beforeMorning)) continue;
        } else {
          if (
            _compareTimesHHMM(start, bucket.start_time_local) < 0 ||
            _compareTimesHHMM(start, bucket.end_time_local) >= 0
          ) {
            continue;
          }
        }
      }

      filtered.push({ meeting: m, distanceMiles: distanceMiles });
    }

    filtered.sort(function (a, b) {
      if (sort_by === 'rating_desc') {
        const ra = typeof a.meeting.rating === 'number' ? a.meeting.rating : 0;
        const rb = typeof b.meeting.rating === 'number' ? b.meeting.rating : 0;
        if (rb !== ra) return rb - ra;
        const rca = typeof a.meeting.review_count === 'number' ? a.meeting.review_count : 0;
        const rcb = typeof b.meeting.review_count === 'number' ? b.meeting.review_count : 0;
        return rcb - rca;
      } else if (sort_by === 'start_time_asc') {
        return _compareTimesHHMM(a.meeting.start_time_local || '00:00', b.meeting.start_time_local || '00:00');
      } else if (sort_by === 'distance') {
        const da = a.distanceMiles != null ? a.distanceMiles : Number.POSITIVE_INFINITY;
        const db = b.distanceMiles != null ? b.distanceMiles : Number.POSITIVE_INFINITY;
        if (da < db) return -1;
        if (da > db) return 1;
        return 0;
      } else {
        // default/relevance fallback: rating desc then distance
        const ra = typeof a.meeting.rating === 'number' ? a.meeting.rating : 0;
        const rb = typeof b.meeting.rating === 'number' ? b.meeting.rating : 0;
        if (rb !== ra) return rb - ra;
        const da = a.distanceMiles != null ? a.distanceMiles : Number.POSITIVE_INFINITY;
        const db = b.distanceMiles != null ? b.distanceMiles : Number.POSITIVE_INFINITY;
        if (da < db) return -1;
        if (da > db) return 1;
        return 0;
      }
    });

    return filtered;
  }

  _generateUpcomingOccurrencesForMeeting(meeting, count) {
    const occurrences = [];
    if (!meeting || !meeting.day_of_week || !meeting.start_time_local) return occurrences;
    const today = new Date();
    const todayDow = today.getDay(); // 0-6 Sun-Sat
    const mapDayToIndex = {
      sunday: 0,
      monday: 1,
      tuesday: 2,
      wednesday: 3,
      thursday: 4,
      friday: 5,
      saturday: 6
    };
    const targetDow = mapDayToIndex[meeting.day_of_week];
    if (typeof targetDow !== 'number') return occurrences;

    let diff = targetDow - todayDow;
    if (diff < 0) diff += 7;

    for (let i = 0; i < count; i++) {
      const d = new Date(today.getTime());
      d.setDate(d.getDate() + diff + i * 7);
      occurrences.push({
        occurrence_date: _dateToISODateString(d),
        start_time_local: meeting.start_time_local,
        end_time_local: meeting.end_time_local || null
      });
    }
    return occurrences;
  }

  /* ---------------------- Interfaces implementation ---------------------- */

  // getHomeContentSummary()
  getHomeContentSummary() {
    const articles = this._getFromStorage('articles');
    const events = this._getFromStorage('events');
    const stories = this._getFromStorage('stories');

    const latest_articles = articles
      .slice()
      .sort(function (a, b) {
        const da = _parseISODate(a.publish_date) || new Date(0);
        const db = _parseISODate(b.publish_date) || new Date(0);
        return db - da;
      })
      .slice(0, 5);

    const now = new Date();
    const upcoming_events = events
      .filter(function (e) {
        const d = _parseISODate(e.start_datetime);
        return d && d >= now;
      })
      .sort(function (a, b) {
        const da = _parseISODate(a.start_datetime) || new Date(0);
        const db = _parseISODate(b.start_datetime) || new Date(0);
        return da - db;
      })
      .slice(0, 5);

    const featured_stories = stories
      .slice()
      .sort(function (a, b) {
        const ha = typeof a.helpfulness_score === 'number' ? a.helpfulness_score : 0;
        const hb = typeof b.helpfulness_score === 'number' ? b.helpfulness_score : 0;
        if (hb !== ha) return hb - ha;
        const da = _parseISODate(a.publish_date) || new Date(0);
        const db = _parseISODate(b.publish_date) || new Date(0);
        return db - da;
      })
      .slice(0, 5);

    const site_summary =
      'This site helps you find addiction recovery meetings, workshops, educational resources, and crisis contacts, ' +
      'and organize them into a personal recovery plan.';

    return {
      site_summary: site_summary,
      latest_articles: latest_articles,
      upcoming_events: upcoming_events,
      featured_stories: featured_stories
    };
  }

  // getUrgentHelpBannerInfo()
  getUrgentHelpBannerInfo() {
    const quickContacts = this._getFromStorage('quick_contact_items');
    const count = quickContacts.length;
    return {
      headline: 'Need help now?',
      body:
        'If you are in immediate danger, call your local emergency number. You can also reach out to a 24/7 crisis hotline for support.',
      primary_cta_label: 'View crisis & hotlines',
      show_quick_contacts_shortcut: count > 0,
      quick_contacts_count: count
    };
  }

  // getLocationSuggestions(query, limit = 8)
  getLocationSuggestions(query, limit) {
    const q = (query || '').trim().toLowerCase();
    const max = typeof limit === 'number' && limit > 0 ? limit : 8;
    if (!q) return [];
    const meetings = this._getFromStorage('meetings');
    const map = {};
    for (let i = 0; i < meetings.length; i++) {
      const m = meetings[i];
      if (!m.city && !m.state && !m.country) continue;
      const city = m.city || '';
      const state = m.state || '';
      const country = m.country || '';
      const label = city + (state ? ', ' + state : '') + (state || city ? '' : country ? country : '');
      const labelLower = label.toLowerCase();
      if (!labelLower) continue;
      if (labelLower.indexOf(q) === -1 && city.toLowerCase().indexOf(q) === -1 && state.toLowerCase().indexOf(q) === -1) {
        continue;
      }
      const key = city + '|' + state + '|' + country;
      if (!map[key]) {
        map[key] = {
          label: label,
          city: city || null,
          state: state || null,
          country: country || null,
          latitude: typeof m.latitude === 'number' ? m.latitude : null,
          longitude: typeof m.longitude === 'number' ? m.longitude : null
        };
      }
    }
    const arr = Object.keys(map)
      .map(function (k) {
        return map[k];
      })
      .sort(function (a, b) {
        if (a.label < b.label) return -1;
        if (a.label > b.label) return 1;
        return 0;
      })
      .slice(0, max);
    return arr;
  }

  // getMeetingFilterOptions()
  getMeetingFilterOptions() {
    return {
      distance_options_miles: [1, 2, 5, 10, 25, 50],
      day_of_week_options: MEETING_DAY_OF_WEEK_OPTIONS.slice(),
      time_of_day_options: TIME_OF_DAY_BUCKETS.map(function (b) {
        return {
          key: b.key,
          label: b.label,
          start_time_local: b.start_time_local,
          end_time_local: b.end_time_local
        };
      }),
      format_options: MEETING_FORMAT_OPTIONS.slice(),
      group_focus_options: MEETING_GROUP_FOCUS_OPTIONS.slice(),
      audience_options: MEETING_AUDIENCE_OPTIONS.slice(),
      sort_options: [
        { key: 'distance', label: 'Distance - Near to far' },
        { key: 'rating_desc', label: 'Rating - High to low' },
        { key: 'start_time_asc', label: 'Start time - Earliest first' },
        { key: 'relevance', label: 'Best match' }
      ]
    };
  }

  // searchMeetings(location_query, location_coordinates, filters, sort_by = 'distance', page = 1, page_size = 20)
  searchMeetings(location_query, location_coordinates, filters, sort_by, page, page_size) {
    const meetings = this._getFromStorage('meetings');
    let coords = null;
    if (location_coordinates && typeof location_coordinates.latitude === 'number' && typeof location_coordinates.longitude === 'number') {
      coords = {
        latitude: location_coordinates.latitude,
        longitude: location_coordinates.longitude
      };
    } else if (location_query) {
      coords = this._resolveLocationToCoordinates(location_query);
    }

    const applied = this._applyMeetingSearchFilters(meetings, coords, filters || {}, sort_by || 'distance');

    const pg = typeof page === 'number' && page > 0 ? page : 1;
    const size = typeof page_size === 'number' && page_size > 0 ? page_size : 20;
    const startIndex = (pg - 1) * size;
    const paged = applied.slice(startIndex, startIndex + size);

    const results = paged.map(
      function (item) {
        const m = item.meeting;
        const distance_display = item.distanceMiles != null ? item.distanceMiles.toFixed(1) + ' mi' : null;
        const schedule_display = this._computeMeetingScheduleDisplay(m);
        const rating_display = this._computeRatingDisplay(m.rating, m.review_count);
        return {
          meeting: m,
          distance_display: distance_display,
          schedule_display: schedule_display,
          rating_display: rating_display,
          can_quick_save: true
        };
      }.bind(this)
    );

    const applied_filters = {
      max_distance_miles: filters && typeof filters.max_distance_miles === 'number' ? filters.max_distance_miles : null,
      formats: filters && Array.isArray(filters.formats) ? filters.formats : [],
      days_of_week: filters && Array.isArray(filters.days_of_week) ? filters.days_of_week : [],
      time_of_day_key: filters ? filters.time_of_day_key || null : null,
      min_rating: filters && typeof filters.min_rating === 'number' ? filters.min_rating : null,
      min_review_count: filters && typeof filters.min_review_count === 'number' ? filters.min_review_count : null
    };

    return {
      meetings: results,
      total_results: applied.length,
      page: pg,
      page_size: size,
      sort_by_applied: sort_by || 'distance',
      applied_filters: applied_filters
    };
  }

  // getMeetingDetail(meetingId)
  getMeetingDetail(meetingId) {
    const meetings = this._getFromStorage('meetings');
    const facilitators = this._getFromStorage('facilitators');

    let meeting = null;
    for (let i = 0; i < meetings.length; i++) {
      if (meetings[i].id === meetingId) {
        meeting = meetings[i];
        break;
      }
    }

    if (!meeting) {
      return {
        meeting: null,
        distance_display: null,
        rating_display: 'No ratings yet',
        schedule_display: '',
        audience_display: '',
        group_focus_display: '',
        participation_guidelines: '',
        upcoming_occurrences: [],
        facilitator: null
      };
    }

    const distance_display =
      typeof meeting.distance_miles === 'number' ? meeting.distance_miles.toFixed(1) + ' mi' : null;
    const rating_display = this._computeRatingDisplay(meeting.rating, meeting.review_count);
    const schedule_display = this._computeMeetingScheduleDisplay(meeting);
    const audience_display = this._computeMeetingAudienceDisplay(meeting.audience);
    const group_focus_display = this._computeGroupFocusDisplay(meeting.group_focus);
    const participation_guidelines =
      'Please join a few minutes early and respect others by keeping what is shared in the group confidential.';

    let facilitatorObj = null;
    if (meeting.facilitator_id) {
      for (let j = 0; j < facilitators.length; j++) {
        if (facilitators[j].id === meeting.facilitator_id) {
          facilitatorObj = facilitators[j];
          break;
        }
      }
    }

    const facilitator = facilitatorObj
      ? {
          facilitator: facilitatorObj,
          primary_contact_method_display:
            facilitatorObj.primary_contact_method === 'site_messages_only'
              ? 'Site messages only'
              : facilitatorObj.primary_contact_method === 'email'
              ? 'Email'
              : facilitatorObj.primary_contact_method === 'phone'
              ? 'Phone'
              : 'Not specified'
        }
      : null;

    const upcoming_occurrences = this._generateUpcomingOccurrencesForMeeting(meeting, 4);

    return {
      meeting: meeting,
      distance_display: distance_display,
      rating_display: rating_display,
      schedule_display: schedule_display,
      audience_display: audience_display,
      group_focus_display: group_focus_display,
      participation_guidelines: participation_guidelines,
      upcoming_occurrences: upcoming_occurrences,
      facilitator: facilitator
    };
  }

  // addMeetingToPlan(meetingId, planned_date, source)
  addMeetingToPlan(meetingId, planned_date, source) {
    const meetings = this._getFromStorage('meetings');
    const planItems = this._getOrCreateUserPlan();

    let meeting = null;
    for (let i = 0; i < meetings.length; i++) {
      if (meetings[i].id === meetingId) {
        meeting = meetings[i];
        break;
      }
    }

    if (!meeting) {
      return { success: false, plan_item: null, message: 'Meeting not found' };
    }

    const plan_item = {
      id: this._generateId('plan'),
      item_type: 'meeting',
      meeting_id: meetingId,
      event_id: null,
      planned_date: planned_date ? new Date(planned_date).toISOString() : null,
      planned_day_of_week: meeting.day_of_week || null,
      planned_start_time: meeting.start_time_local || null,
      source: source || 'meetings_list',
      created_at: new Date().toISOString()
    };

    planItems.push(plan_item);
    this._saveToStorage('plan_items', planItems);

    return {
      success: true,
      plan_item: plan_item,
      message: 'Meeting added to plan'
    };
  }

  // getMyPlanSummary()
  getMyPlanSummary() {
    const planItems = this._getFromStorage('plan_items');
    const meetings = this._getFromStorage('meetings');
    const events = this._getFromStorage('events');

    const weekly_schedule_map = {};
    for (let i = 0; i < MEETING_DAY_OF_WEEK_OPTIONS.length; i++) {
      weekly_schedule_map[MEETING_DAY_OF_WEEK_OPTIONS[i]] = [];
    }

    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime());
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    const upcoming_next_7_days = [];

    for (let i = 0; i < planItems.length; i++) {
      const p = planItems[i];
      let title = '';
      let type = p.item_type;
      let format_display = '';
      let start_time_display = '';
      let dayKey = p.planned_day_of_week || null;
      let meeting = null;
      let event = null;

      if (p.item_type === 'meeting' && p.meeting_id) {
        for (let j = 0; j < meetings.length; j++) {
          if (meetings[j].id === p.meeting_id) {
            meeting = meetings[j];
            break;
          }
        }
        if (meeting) {
          title = meeting.title || '';
          format_display = this._computeMeetingFormatDisplay(meeting.format);
          start_time_display = _formatTimeHHMMTo12h(meeting.start_time_local || '');
          if (!dayKey) dayKey = meeting.day_of_week || null;
        }
      } else if (p.item_type === 'event' && p.event_id) {
        for (let k = 0; k < events.length; k++) {
          if (events[k].id === p.event_id) {
            event = events[k];
            break;
          }
        }
        if (event) {
          title = event.title || '';
          format_display = this._computeMeetingFormatDisplay(event.format);
          const dt = _parseISODate(event.start_datetime);
          if (dt) {
            const hh = _pad2(dt.getHours());
            const mm = _pad2(dt.getMinutes());
            start_time_display = _formatTimeHHMMTo12h(hh + ':' + mm);
          }
          if (!dayKey) dayKey = event.day_of_week || null;
        }
      }

      const weeklyItem = {
        plan_item: p,
        title: title,
        type: type,
        start_time_display: start_time_display,
        format_display: format_display,
        meeting: meeting || null,
        event: event || null
      };

      if (dayKey && weekly_schedule_map[dayKey]) {
        weekly_schedule_map[dayKey].push(weeklyItem);
      }

      if (p.planned_date) {
        const dateObj = _parseISODate(p.planned_date);
        if (dateObj && dateObj >= now && dateObj <= sevenDaysFromNow) {
          let occursAt = p.planned_date;
          if (p.planned_start_time) {
            occursAt = p.planned_date.slice(0, 10) + ' ' + p.planned_start_time;
          }
          upcoming_next_7_days.push({
            plan_item: p,
            title: title,
            occurs_at: occursAt,
            type: type,
            meeting: meeting || null,
            event: event || null
          });
        }
      }
    }

    const weekly_schedule = [];
    for (let i = 0; i < MEETING_DAY_OF_WEEK_OPTIONS.length; i++) {
      const dayKey = MEETING_DAY_OF_WEEK_OPTIONS[i];
      const items = weekly_schedule_map[dayKey] || [];
      items.sort(function (a, b) {
        const pa = a.plan_item;
        const pb = b.plan_item;
        const ta = pa.planned_start_time || '00:00';
        const tb = pb.planned_start_time || '00:00';
        return _compareTimesHHMM(ta, tb);
      });
      weekly_schedule.push({ day_of_week: dayKey, items: items });
    }

    upcoming_next_7_days.sort(function (a, b) {
      const da = _parseISODate(a.plan_item.planned_date) || new Date(0);
      const db = _parseISODate(b.plan_item.planned_date) || new Date(0);
      return da - db;
    });

    return {
      weekly_schedule: weekly_schedule,
      upcoming_next_7_days: upcoming_next_7_days
    };
  }

  // updatePlanItemOccurrence(planItemId, planned_date, planned_start_time)
  updatePlanItemOccurrence(planItemId, planned_date, planned_start_time) {
    const planItems = this._getFromStorage('plan_items');
    let updated = null;
    for (let i = 0; i < planItems.length; i++) {
      if (planItems[i].id === planItemId) {
        if (planned_date) {
          planItems[i].planned_date = new Date(planned_date).toISOString();
        }
        if (planned_start_time) {
          planItems[i].planned_start_time = planned_start_time;
        }
        updated = planItems[i];
        break;
      }
    }
    if (!updated) {
      return { plan_item: null, success: false, message: 'Plan item not found' };
    }
    this._saveToStorage('plan_items', planItems);
    return { plan_item: updated, success: true, message: 'Plan item updated' };
  }

  // removePlanItem(planItemId)
  removePlanItem(planItemId) {
    const planItems = this._getFromStorage('plan_items');
    const before = planItems.length;
    const remaining = planItems.filter(function (p) {
      return p.id !== planItemId;
    });
    this._saveToStorage('plan_items', remaining);
    const success = remaining.length < before;
    return { success: success, message: success ? 'Removed from plan' : 'Plan item not found' };
  }

  // getFavoriteGroups()
  getFavoriteGroups() {
    const favorites = this._getFromStorage('favorite_groups');
    const meetings = this._getFromStorage('meetings');
    const result = favorites.map(
      function (fav) {
        let meeting = null;
        for (let i = 0; i < meetings.length; i++) {
          if (meetings[i].id === fav.meeting_id) {
            meeting = meetings[i];
            break;
          }
        }
        const rating_display = meeting
          ? this._computeRatingDisplay(meeting.rating, meeting.review_count)
          : 'No ratings yet';
        let freqDisplay = '';
        if (meeting && meeting.meeting_frequency) {
          const map = {
            daily: 'Daily',
            weekly: 'Weekly',
            biweekly: 'Every 2 weeks',
            monthly: 'Monthly',
            irregular: 'Irregular'
          };
          freqDisplay = map[meeting.meeting_frequency] || 'Unspecified';
        }
        const format_display = meeting ? this._computeMeetingFormatDisplay(meeting.format) : '';
        return {
          favorite: fav,
          meeting: meeting,
          title: meeting ? meeting.title : '',
          rating_display: rating_display,
          meeting_frequency_display: freqDisplay,
          format_display: format_display
        };
      }.bind(this)
    );
    return result;
  }

  // addFavoriteGroup(meetingId, source)
  addFavoriteGroup(meetingId, source) {
    const meetings = this._getFromStorage('meetings');
    const favorites = this._getFromStorage('favorite_groups');

    let meeting = null;
    for (let i = 0; i < meetings.length; i++) {
      if (meetings[i].id === meetingId) {
        meeting = meetings[i];
        break;
      }
    }
    if (!meeting) {
      return { favorite: null, success: false, message: 'Meeting not found' };
    }

    for (let j = 0; j < favorites.length; j++) {
      if (favorites[j].meeting_id === meetingId) {
        return { favorite: favorites[j], success: true, message: 'Already in favorites' };
      }
    }

    const fav = {
      id: this._generateId('fav'),
      meeting_id: meetingId,
      added_at: new Date().toISOString(),
      source: source || 'other'
    };
    favorites.push(fav);
    this._saveToStorage('favorite_groups', favorites);
    return { favorite: fav, success: true, message: 'Added to favorites' };
  }

  // removeFavoriteGroup(favoriteGroupId)
  removeFavoriteGroup(favoriteGroupId) {
    const favorites = this._getFromStorage('favorite_groups');
    const remaining = favorites.filter(function (f) {
      return f.id !== favoriteGroupId;
    });
    this._saveToStorage('favorite_groups', remaining);
    const success = remaining.length < favorites.length;
    return { success: success, message: success ? 'Removed from favorites' : 'Favorite not found' };
  }

  // addFavoriteGroupToPlan(favoriteGroupId, planned_date)
  addFavoriteGroupToPlan(favoriteGroupId, planned_date) {
    const favorites = this._getFromStorage('favorite_groups');
    let fav = null;
    for (let i = 0; i < favorites.length; i++) {
      if (favorites[i].id === favoriteGroupId) {
        fav = favorites[i];
        break;
      }
    }
    if (!fav) {
      return { plan_item: null, success: false, message: 'Favorite not found' };
    }
    const res = this.addMeetingToPlan(fav.meeting_id, planned_date || null, 'self_assessment_recommendations');
    return {
      plan_item: res.plan_item || null,
      success: !!res.success,
      message: res.message || ''
    };
  }

  // getArticleFilterOptions()
  getArticleFilterOptions() {
    const now = new Date();
    const last12Months = new Date(now.getTime());
    last12Months.setFullYear(last12Months.getFullYear() - 1);
    const last30Days = new Date(now.getTime());
    last30Days.setDate(last30Days.getDate() - 30);
    const last7Days = new Date(now.getTime());
    last7Days.setDate(last7Days.getDate() - 7);

    const date_range_presets = [
      {
        key: 'last_7_days',
        label: 'Last 7 days',
        from_date: _dateToISODateString(last7Days)
      },
      {
        key: 'last_30_days',
        label: 'Last 30 days',
        from_date: _dateToISODateString(last30Days)
      },
      {
        key: 'last_12_months',
        label: 'Last 12 months',
        from_date: _dateToISODateString(last12Months)
      }
    ];

    const reading_time_ranges = [
      { min_minutes: 0, max_minutes: 5, label: 'Under 5 minutes' },
      { min_minutes: 5, max_minutes: 15, label: '5–15 minutes' },
      { min_minutes: 15, max_minutes: 30, label: '15–30 minutes' }
    ];

    const sort_options = [
      { key: 'newest', label: 'Newest first' },
      { key: 'oldest', label: 'Oldest first' },
      { key: 'relevance', label: 'Most relevant' }
    ];

    return {
      date_range_presets: date_range_presets,
      reading_time_ranges: reading_time_ranges,
      sort_options: sort_options
    };
  }

  // searchArticles(query, filters, sort_by = 'newest', page = 1, page_size = 20)
  searchArticles(query, filters, sort_by, page, page_size) {
    const articles = this._getFromStorage('articles');
    const q = (query || '').trim().toLowerCase();
    filters = filters || {};

    const dateFrom = filters.date_from ? _parseISODate(filters.date_from) : null;
    const dateTo = filters.date_to ? _parseISODate(filters.date_to) : null;
    const minTime = typeof filters.reading_time_min === 'number' ? filters.reading_time_min : null;
    const maxTime = typeof filters.reading_time_max === 'number' ? filters.reading_time_max : null;
    const topics = Array.isArray(filters.topics) && filters.topics.length ? filters.topics : null;

    const filtered = [];
    for (let i = 0; i < articles.length; i++) {
      const a = articles[i];
      if (q) {
        const inTitle = (a.title || '').toLowerCase().indexOf(q) !== -1;
        const inSummary = (a.summary || '').toLowerCase().indexOf(q) !== -1;
        const topicsArr = Array.isArray(a.topics) ? a.topics : [];
        let inTopics = false;
        for (let t = 0; t < topicsArr.length; t++) {
          if ((topicsArr[t] || '').toLowerCase().indexOf(q) !== -1) {
            inTopics = true;
            break;
          }
        }
        if (!inTitle && !inSummary && !inTopics) continue;
      }

      const pd = _parseISODate(a.publish_date);
      if (dateFrom && (!pd || pd < dateFrom)) continue;
      if (dateTo && (!pd || pd > dateTo)) continue;

      if (minTime != null && typeof a.reading_time_minutes === 'number') {
        if (a.reading_time_minutes < minTime) continue;
      }
      if (maxTime != null && typeof a.reading_time_minutes === 'number') {
        if (a.reading_time_minutes > maxTime) continue;
      }

      if (topics) {
        const at = Array.isArray(a.topics) ? a.topics : [];
        let matchTopic = false;
        for (let tt = 0; tt < topics.length; tt++) {
          if (at.indexOf(topics[tt]) !== -1) {
            matchTopic = true;
            break;
          }
        }
        if (!matchTopic) continue;
      }

      filtered.push(a);
    }

    sort_by = sort_by || 'newest';
    filtered.sort(function (a, b) {
      if (sort_by === 'oldest') {
        const da = _parseISODate(a.publish_date) || new Date(0);
        const db = _parseISODate(b.publish_date) || new Date(0);
        return da - db;
      } else {
        // newest or relevance
        const da = _parseISODate(a.publish_date) || new Date(0);
        const db = _parseISODate(b.publish_date) || new Date(0);
        return db - da;
      }
    });

    const pg = typeof page === 'number' && page > 0 ? page : 1;
    const size = typeof page_size === 'number' && page_size > 0 ? page_size : 20;
    const startIndex = (pg - 1) * size;
    const paged = filtered.slice(startIndex, startIndex + size);

    const applied_filters = {
      date_from: filters.date_from || null,
      date_to: filters.date_to || null,
      reading_time_min: minTime,
      reading_time_max: maxTime
    };

    return {
      articles: paged,
      total_results: filtered.length,
      page: pg,
      page_size: size,
      applied_filters: applied_filters
    };
  }

  // getArticleDetail(articleId)
  getArticleDetail(articleId) {
    const articles = this._getFromStorage('articles');
    let article = null;
    for (let i = 0; i < articles.length; i++) {
      if (articles[i].id === articleId) {
        article = articles[i];
        break;
      }
    }
    if (!article) {
      return { article: null, reading_time_display: '', related_articles: [] };
    }
    const reading_time_display =
      typeof article.reading_time_minutes === 'number'
        ? article.reading_time_minutes + ' min read'
        : '';

    const related_articles = articles
      .filter(function (a) {
        if (a.id === article.id) return false;
        const at = Array.isArray(a.topics) ? a.topics : [];
        const bt = Array.isArray(article.topics) ? article.topics : [];
        for (let i = 0; i < at.length; i++) {
          if (bt.indexOf(at[i]) !== -1) return true;
        }
        return false;
      })
      .slice(0, 5);

    return {
      article: article,
      reading_time_display: reading_time_display,
      related_articles: related_articles
    };
  }

  // addArticleToReadingList(articleId, source)
  addArticleToReadingList(articleId, source) {
    const articles = this._getFromStorage('articles');
    const items = this._getFromStorage('reading_list_items');

    let article = null;
    for (let i = 0; i < articles.length; i++) {
      if (articles[i].id === articleId) {
        article = articles[i];
        break;
      }
    }
    if (!article) {
      return { reading_list_item: null, success: false, message: 'Article not found' };
    }

    for (let j = 0; j < items.length; j++) {
      if (items[j].article_id === articleId) {
        return {
          reading_list_item: items[j],
          success: true,
          message: 'Already in reading list'
        };
      }
    }

    const item = {
      id: this._generateId('read'),
      article_id: articleId,
      saved_at: new Date().toISOString(),
      source: source || 'article_detail'
    };
    items.push(item);
    this._saveToStorage('reading_list_items', items);

    return {
      reading_list_item: item,
      success: true,
      message: 'Added to reading list'
    };
  }

  // getReadingListItems()
  getReadingListItems() {
    const items = this._getFromStorage('reading_list_items');
    const articles = this._getFromStorage('articles');
    const result = items.map(function (it) {
      let article = null;
      for (let i = 0; i < articles.length; i++) {
        if (articles[i].id === it.article_id) {
          article = articles[i];
          break;
        }
      }
      let topic_group = 'Other';
      if (article && Array.isArray(article.topics) && article.topics.length) {
        topic_group = article.topics[0];
      }
      return {
        reading_list_item: it,
        article: article,
        topic_group: topic_group
      };
    });
    return result;
  }

  // removeReadingListItem(readingListItemId)
  removeReadingListItem(readingListItemId) {
    const items = this._getFromStorage('reading_list_items');
    const remaining = items.filter(function (it) {
      return it.id !== readingListItemId;
    });
    this._saveToStorage('reading_list_items', remaining);
    const success = remaining.length < items.length;
    return { success: success, message: success ? 'Removed from reading list' : 'Item not found' };
  }

  // getEventFilterOptions()
  getEventFilterOptions() {
    const price_ranges = [
      { min_price: 0, max_price: 0, label: 'Free' },
      { min_price: 0, max_price: 10, label: 'Up to $10' },
      { min_price: 10, max_price: 50, label: '$10–$50' },
      { min_price: 50, max_price: 999999, label: 'Above $50' }
    ];
    const sort_options = [
      { key: 'soonest', label: 'Soonest first' },
      { key: 'lowest_price', label: 'Lowest price' },
      { key: 'relevance', label: 'Best match' }
    ];
    return {
      topic_options: EVENT_TOPIC_OPTIONS.slice(),
      day_of_week_options: MEETING_DAY_OF_WEEK_OPTIONS.slice(),
      format_options: EVENT_FORMAT_OPTIONS.slice(),
      price_ranges: price_ranges,
      sort_options: sort_options
    };
  }

  // searchEvents(filters, sort_by = 'soonest', page = 1, page_size = 20)
  searchEvents(filters, sort_by, page, page_size) {
    const events = this._getFromStorage('events');
    filters = filters || {};

    const topics = Array.isArray(filters.topics) && filters.topics.length ? filters.topics : null;
    const dateFrom = filters.date_from ? _parseISODate(filters.date_from) : null;
    const dateTo = filters.date_to ? _parseISODate(filters.date_to) : null;
    const days = Array.isArray(filters.days_of_week) && filters.days_of_week.length ? filters.days_of_week : null;
    const fmts = Array.isArray(filters.formats) && filters.formats.length ? filters.formats : null;
    const priceMin = typeof filters.price_min === 'number' ? filters.price_min : null;
    const priceMax = typeof filters.price_max === 'number' ? filters.price_max : null;

    const filtered = [];
    for (let i = 0; i < events.length; i++) {
      const e = events[i];
      if (topics && topics.indexOf(e.topic) === -1) continue;
      const d = _parseISODate(e.start_datetime);
      if (dateFrom && (!d || d < dateFrom)) continue;
      if (dateTo && (!d || d > dateTo)) continue;
      if (days && days.indexOf(e.day_of_week) === -1) continue;
      if (fmts && fmts.indexOf(e.format) === -1) continue;
      if (priceMin != null && typeof e.price === 'number' && e.price < priceMin) continue;
      if (priceMax != null && typeof e.price === 'number' && e.price > priceMax) continue;
      filtered.push(e);
    }

    sort_by = sort_by || 'soonest';
    filtered.sort(function (a, b) {
      if (sort_by === 'lowest_price') {
        const pa = typeof a.price === 'number' ? a.price : Number.POSITIVE_INFINITY;
        const pb = typeof b.price === 'number' ? b.price : Number.POSITIVE_INFINITY;
        if (pa < pb) return -1;
        if (pa > pb) return 1;
        const da = _parseISODate(a.start_datetime) || new Date(0);
        const db = _parseISODate(b.start_datetime) || new Date(0);
        return da - db;
      } else {
        const da = _parseISODate(a.start_datetime) || new Date(0);
        const db = _parseISODate(b.start_datetime) || new Date(0);
        return da - db;
      }
    });

    const pg = typeof page === 'number' && page > 0 ? page : 1;
    const size = typeof page_size === 'number' && page_size > 0 ? page_size : 20;
    const startIndex = (pg - 1) * size;
    const paged = filtered.slice(startIndex, startIndex + size);

    return {
      events: paged,
      total_results: filtered.length,
      page: pg,
      page_size: size
    };
  }

  // getEventDetail(eventId)
  getEventDetail(eventId) {
    const events = this._getFromStorage('events');
    let event = null;
    for (let i = 0; i < events.length; i++) {
      if (events[i].id === eventId) {
        event = events[i];
        break;
      }
    }
    if (!event) {
      return {
        event: null,
        agenda: '',
        format_display: '',
        price_display: '',
        attendance_types_display: [],
        capacity_display: ''
      };
    }

    const agenda = event.description || '';
    const format_display = this._computeMeetingFormatDisplay(event.format);
    const price_display = this._computeEventPriceDisplay(event);

    const attendance_types_display = Array.isArray(event.attendance_types_available)
      ? event.attendance_types_available.map(function (t) {
          if (t === 'online') return 'Online';
          if (t === 'in_person') return 'In-person';
          if (t === 'hybrid') return 'Hybrid';
          return 'Other';
        })
      : [];

    const capacity_display =
      typeof event.capacity === 'number' && !isNaN(event.capacity)
        ? 'Capacity: ' + event.capacity
        : 'Capacity not specified';

    return {
      event: event,
      agenda: agenda,
      format_display: format_display,
      price_display: price_display,
      attendance_types_display: attendance_types_display,
      capacity_display: capacity_display
    };
  }

  // registerForEvent(eventId, full_name, email, city, attendance_type, goals_message)
  registerForEvent(eventId, full_name, email, city, attendance_type, goals_message) {
    const events = this._getFromStorage('events');
    const regs = this._getFromStorage('event_registrations');

    let event = null;
    for (let i = 0; i < events.length; i++) {
      if (events[i].id === eventId) {
        event = events[i];
        break;
      }
    }
    if (!event) {
      return {
        registration: null,
        success: false,
        confirmation_message: 'Event not found'
      };
    }

    let attendance = attendance_type || 'other';
    const allowed = Array.isArray(event.attendance_types_available) ? event.attendance_types_available : [];
    if (allowed.length && allowed.indexOf(attendance) === -1) {
      // fall back to first allowed type
      attendance = allowed[0];
    }

    const registration = {
      id: this._generateId('reg'),
      event_id: eventId,
      full_name: full_name,
      email: email,
      city: city || null,
      attendance_type: attendance,
      goals_message: goals_message || null,
      registered_at: new Date().toISOString(),
      status: 'submitted'
    };

    regs.push(registration);
    this._saveToStorage('event_registrations', regs);

    return {
      registration: registration,
      success: true,
      confirmation_message: 'Registration submitted'
    };
  }

  // addEventToPlan(eventId, source)
  addEventToPlan(eventId, source) {
    const events = this._getFromStorage('events');
    const planItems = this._getOrCreateUserPlan();

    let event = null;
    for (let i = 0; i < events.length; i++) {
      if (events[i].id === eventId) {
        event = events[i];
        break;
      }
    }
    if (!event) {
      return { plan_item: null, success: false, message: 'Event not found' };
    }

    const dt = _parseISODate(event.start_datetime);
    const planned_date = dt ? dt.toISOString() : null;
    let hhmm = null;
    if (dt) {
      hhmm = _pad2(dt.getHours()) + ':' + _pad2(dt.getMinutes());
    }

    const plan_item = {
      id: this._generateId('plan'),
      item_type: 'event',
      meeting_id: null,
      event_id: eventId,
      planned_date: planned_date,
      planned_day_of_week: event.day_of_week || null,
      planned_start_time: hhmm,
      source: source || 'events_detail',
      created_at: new Date().toISOString()
    };

    planItems.push(plan_item);
    this._saveToStorage('plan_items', planItems);

    return {
      plan_item: plan_item,
      success: true,
      message: 'Event added to plan'
    };
  }

  // getToolsOverview()
  getToolsOverview() {
    const quizzes = this._getFromStorage('self_assessment_quizzes');
    const active = quizzes.filter(function (q) {
      return q.status === 'active';
    });

    return {
      self_assessment_quizzes: active,
      other_tools: [],
      recommended_start_tools: active.length ? [active[0].id] : []
    };
  }

  // getActiveSelfAssessmentQuiz()
  getActiveSelfAssessmentQuiz() {
    const quizzes = this._getFromStorage('self_assessment_quizzes');
    const questions = this._getFromStorage('self_assessment_questions');
    const options = this._getFromStorage('self_assessment_options');

    let quiz = null;
    for (let i = 0; i < quizzes.length; i++) {
      if (quizzes[i].status === 'active') {
        quiz = quizzes[i];
        break;
      }
    }
    if (!quiz) {
      return { quiz: null, questions: [] };
    }

    const quizQuestions = questions
      .filter(function (q) {
        return q.quiz_id === quiz.id;
      })
      .sort(function (a, b) {
        return (a.order || 0) - (b.order || 0);
      })
      .map(function (q) {
        const qOptions = options
          .filter(function (o) {
            return o.question_id === q.id;
          })
          .sort(function (a, b) {
            return (a.order || 0) - (b.order || 0);
          });
        return { question: q, options: qOptions };
      });

    return {
      quiz: quiz,
      questions: quizQuestions
    };
  }

  // submitSelfAssessmentResponses(quizId, answers)
  submitSelfAssessmentResponses(quizId, answers) {
    const quizzes = this._getFromStorage('self_assessment_quizzes');
    const questions = this._getFromStorage('self_assessment_questions');
    const options = this._getFromStorage('self_assessment_options');
    const submissions = this._getFromStorage('self_assessment_submissions');
    const answersStore = this._getFromStorage('self_assessment_answers');
    const meetings = this._getFromStorage('meetings');

    let quiz = null;
    for (let i = 0; i < quizzes.length; i++) {
      if (quizzes[i].id === quizId) {
        quiz = quizzes[i];
        break;
      }
    }
    if (!quiz) {
      return {
        submission: null,
        risk_level_display: '',
        summary: 'Quiz not found',
        recommended_groups: []
      };
    }

    // Simple heuristic for risk level based on certain option codes/values
    let score = 0;
    const answersArray = Array.isArray(answers) ? answers : [];
    for (let i = 0; i < answersArray.length; i++) {
      const ans = answersArray[i];
      const qOptions = options.filter(function (o) {
        return o.question_id === ans.questionId;
      });
      const selIds = Array.isArray(ans.selectedOptionIds) ? ans.selectedOptionIds : [];
      for (let j = 0; j < selIds.length; j++) {
        for (let k = 0; k < qOptions.length; k++) {
          if (qOptions[k].id === selIds[j]) {
            const code = (qOptions[k].code || '').toLowerCase();
            const val = (qOptions[k].value || '').toLowerCase();
            if (code.indexOf('daily') !== -1 || val.indexOf('daily') !== -1) score += 3;
            if (code.indexOf('3_days') !== -1 || val.indexOf('3 days') !== -1) score += 2;
            if (code.indexOf('weekly') !== -1 || val.indexOf('weekly') !== -1) score += 1;
          }
        }
      }
    }

    let risk_level = 'moderate';
    if (score >= 5) risk_level = 'high';
    else if (score <= 1) risk_level = 'low';

    const submission = {
      id: this._generateId('sas'),
      quiz_id: quizId,
      created_at: new Date().toISOString(),
      risk_level: risk_level,
      summary:
        risk_level === 'high'
          ? 'Your answers suggest a higher risk of relapse. Consider frequent support and crisis resources.'
          : risk_level === 'low'
          ? 'Your answers suggest a lower immediate risk, but ongoing support is still helpful.'
          : 'Your answers suggest a moderate risk level. Regular groups and check-ins can support your recovery.'
    };

    submissions.push(submission);

    for (let i = 0; i < answersArray.length; i++) {
      const ans = answersArray[i];
      const answerRecord = {
        id: this._generateId('saa'),
        submission_id: submission.id,
        question_id: ans.questionId,
        selected_option_ids: Array.isArray(ans.selectedOptionIds) ? ans.selectedOptionIds : [],
        free_text_answer: ans.freeTextAnswer || null
      };
      answersStore.push(answerRecord);
    }

    this._saveToStorage('self_assessment_submissions', submissions);
    this._saveToStorage('self_assessment_answers', answersStore);

    // Recommended groups: pick higher-rated weekly/daily meetings
    const candidates = meetings
      .filter(function (m) {
        return m.meeting_frequency === 'weekly' || m.meeting_frequency === 'daily' || m.meeting_frequency === 'biweekly';
      })
      .slice();

    candidates.sort(function (a, b) {
      const ra = typeof a.rating === 'number' ? a.rating : 0;
      const rb = typeof b.rating === 'number' ? b.rating : 0;
      if (rb !== ra) return rb - ra;
      const rca = typeof a.review_count === 'number' ? a.review_count : 0;
      const rcb = typeof b.review_count === 'number' ? b.review_count : 0;
      return rcb - rca;
    });

    const recommended_groups = candidates.slice(0, 10).map(
      function (m) {
        const reasons = [];
        if (m.meeting_frequency === 'daily') reasons.push('Meets daily for frequent support.');
        if (m.meeting_frequency === 'weekly') reasons.push('Meets weekly for consistent support.');
        if (m.group_focus === 'general_recovery') reasons.push('General recovery group suitable for many substances.');
        if (typeof m.rating === 'number' && m.rating >= 4) reasons.push('Highly rated by other members.');
        if (!reasons.length) reasons.push('Matches general support needs.');
        return { meeting: m, match_reasons: reasons };
      }.bind(this)
    );

    return {
      submission: submission,
      risk_level_display:
        risk_level === 'high' ? 'High risk' : risk_level === 'low' ? 'Low risk' : 'Moderate risk',
      summary: submission.summary,
      recommended_groups: recommended_groups
    };
  }

  // getStoryFilterOptions()
  getStoryFilterOptions() {
    const stage_of_recovery_options = [
      'early_0_6_months',
      'mid_6_12_months',
      'long_term_1_plus_years',
      'unspecified'
    ];

    const reading_time_options = [
      { key: 'under_5', label: 'Under 5 minutes', max_minutes: 5 },
      { key: 'under_10', label: 'Under 10 minutes', max_minutes: 10 },
      { key: 'under_20', label: 'Under 20 minutes', max_minutes: 20 }
    ];

    const sort_options = [
      { key: 'most_helpful', label: 'Most helpful' },
      { key: 'rating_desc', label: 'Rating - High to low' },
      { key: 'newest', label: 'Newest first' }
    ];

    return {
      stage_of_recovery_options: stage_of_recovery_options,
      reading_time_options: reading_time_options,
      sort_options: sort_options
    };
  }

  // searchStories(filters, sort_by = 'most_helpful', page = 1, page_size = 20)
  searchStories(filters, sort_by, page, page_size) {
    const stories = this._getFromStorage('stories');
    filters = filters || {};

    const stage = filters.stage_of_recovery || null;
    const maxMinutes = typeof filters.max_reading_time_minutes === 'number' ? filters.max_reading_time_minutes : null;
    const tagsFilter = Array.isArray(filters.tags) && filters.tags.length ? filters.tags : null;

    const filtered = [];
    for (let i = 0; i < stories.length; i++) {
      const s = stories[i];
      if (stage && s.stage_of_recovery !== stage) continue;
      if (maxMinutes != null && typeof s.reading_time_minutes === 'number') {
        if (s.reading_time_minutes > maxMinutes) continue;
      }
      if (tagsFilter) {
        const stags = Array.isArray(s.tags) ? s.tags : [];
        let match = false;
        for (let j = 0; j < tagsFilter.length; j++) {
          if (stags.indexOf(tagsFilter[j]) !== -1) {
            match = true;
            break;
          }
        }
        if (!match) continue;
      }
      filtered.push(s);
    }

    sort_by = sort_by || 'most_helpful';
    filtered.sort(function (a, b) {
      if (sort_by === 'rating_desc') {
        const ra = typeof a.rating === 'number' ? a.rating : 0;
        const rb = typeof b.rating === 'number' ? b.rating : 0;
        if (rb !== ra) return rb - ra;
        const ha = typeof a.helpfulness_score === 'number' ? a.helpfulness_score : 0;
        const hb = typeof b.helpfulness_score === 'number' ? b.helpfulness_score : 0;
        return hb - ha;
      } else if (sort_by === 'newest') {
        const da = _parseISODate(a.publish_date) || new Date(0);
        const db = _parseISODate(b.publish_date) || new Date(0);
        return db - da;
      } else {
        const ha = typeof a.helpfulness_score === 'number' ? a.helpfulness_score : 0;
        const hb = typeof b.helpfulness_score === 'number' ? b.helpfulness_score : 0;
        if (hb !== ha) return hb - ha;
        const ra = typeof a.rating === 'number' ? a.rating : 0;
        const rb = typeof b.rating === 'number' ? b.rating : 0;
        return rb - ra;
      }
    });

    const pg = typeof page === 'number' && page > 0 ? page : 1;
    const size = typeof page_size === 'number' && page_size > 0 ? page_size : 20;
    const startIndex = (pg - 1) * size;
    const paged = filtered.slice(startIndex, startIndex + size);

    return {
      stories: paged,
      total_results: filtered.length,
      page: pg,
      page_size: size
    };
  }

  // getStoryDetail(storyId)
  getStoryDetail(storyId) {
    const stories = this._getFromStorage('stories');
    let story = null;
    for (let i = 0; i < stories.length; i++) {
      if (stories[i].id === storyId) {
        story = stories[i];
        break;
      }
    }
    if (!story) {
      return {
        story: null,
        reading_time_display: '',
        stage_of_recovery_display: '',
        rating_display: '',
        related_stories: []
      };
    }
    const reading_time_display =
      typeof story.reading_time_minutes === 'number'
        ? story.reading_time_minutes + ' min read'
        : '';
    const stage_of_recovery_display = this._computeStoryStageDisplay(story.stage_of_recovery);
    const rating_display = this._computeRatingDisplay(story.rating, story.rating_count);

    const related_stories = stories
      .filter(function (s) {
        if (s.id === story.id) return false;
        return s.stage_of_recovery === story.stage_of_recovery;
      })
      .slice(0, 5);

    return {
      story: story,
      reading_time_display: reading_time_display,
      stage_of_recovery_display: stage_of_recovery_display,
      rating_display: rating_display,
      related_stories: related_stories
    };
  }

  // saveStoryLinkToNotes(storyId, personal_note)
  saveStoryLinkToNotes(storyId, personal_note) {
    const stories = this._getFromStorage('stories');
    const notes = this._getFromStorage('note_items');

    let story = null;
    for (let i = 0; i < stories.length; i++) {
      if (stories[i].id === storyId) {
        story = stories[i];
        break;
      }
    }
    if (!story) {
      return { note_item: null, success: false, message: 'Story not found' };
    }

    const note_item = {
      id: this._generateId('note'),
      linked_type: 'story',
      story_id: storyId,
      article_id: null,
      url: null,
      title_snapshot: story.title || null,
      personal_note: personal_note || '',
      created_at: new Date().toISOString(),
      source: 'story_detail'
    };

    notes.push(note_item);
    this._saveToStorage('note_items', notes);

    return { note_item: note_item, success: true, message: 'Story link saved to notes' };
  }

  // getMyNotes()
  getMyNotes() {
    const notes = this._getFromStorage('note_items');
    const stories = this._getFromStorage('stories');
    const articles = this._getFromStorage('articles');

    const result = notes.map(function (n) {
      let linked_story = null;
      let linked_article = null;
      if (n.linked_type === 'story' && n.story_id) {
        for (let i = 0; i < stories.length; i++) {
          if (stories[i].id === n.story_id) {
            linked_story = stories[i];
            break;
          }
        }
      } else if (n.linked_type === 'article' && n.article_id) {
        for (let j = 0; j < articles.length; j++) {
          if (articles[j].id === n.article_id) {
            linked_article = articles[j];
            break;
          }
        }
      }
      return {
        note_item: n,
        linked_story: linked_story,
        linked_article: linked_article
      };
    });

    return result;
  }

  // updateNoteItem(noteItemId, personal_note)
  updateNoteItem(noteItemId, personal_note) {
    const notes = this._getFromStorage('note_items');
    let updated = null;
    for (let i = 0; i < notes.length; i++) {
      if (notes[i].id === noteItemId) {
        notes[i].personal_note = personal_note;
        updated = notes[i];
        break;
      }
    }
    if (!updated) {
      return { note_item: null, success: false };
    }
    this._saveToStorage('note_items', notes);
    return { note_item: updated, success: true };
  }

  // removeNoteItem(noteItemId)
  removeNoteItem(noteItemId) {
    const notes = this._getFromStorage('note_items');
    const remaining = notes.filter(function (n) {
      return n.id !== noteItemId;
    });
    this._saveToStorage('note_items', remaining);
    const success = remaining.length < notes.length;
    return { success: success, message: success ? 'Note removed' : 'Note not found' };
  }

  // getCrisisPageOverview()
  getCrisisPageOverview() {
    const immediate_instructions =
      'If you are in immediate danger or having a medical emergency, call your local emergency number right away.';
    const emergency_numbers = ['911'];
    const sections = [
      {
        key: 'nationwide_24_7_hotlines',
        title: 'Nationwide 24/7 Hotlines',
        description: 'Confidential crisis lines that are available 24/7 across the country.'
      }
    ];

    return {
      immediate_instructions: immediate_instructions,
      emergency_numbers: emergency_numbers,
      sections: sections
    };
  }

  // searchHotlines(filters)
  searchHotlines(filters) {
    const hotlines = this._getFromStorage('hotlines');
    filters = filters || {};

    const area = filters.service_area || null;
    const scope = filters.scope || null;
    const is_24_7 = typeof filters.is_24_7 === 'boolean' ? filters.is_24_7 : null;

    const result = [];
    for (let i = 0; i < hotlines.length; i++) {
      const h = hotlines[i];
      if (area && h.service_area !== area) continue;
      if (scope && h.scope !== scope) continue;
      if (is_24_7 != null && h.is_24_7 !== is_24_7) continue;
      result.push(h);
    }
    return result;
  }

  // addHotlineToQuickContacts(hotlineId, label, notes)
  addHotlineToQuickContacts(hotlineId, label, notes) {
    const hotlines = this._getFromStorage('hotlines');
    const quick = this._getFromStorage('quick_contact_items');

    let hotline = null;
    for (let i = 0; i < hotlines.length; i++) {
      if (hotlines[i].id === hotlineId) {
        hotline = hotlines[i];
        break;
      }
    }
    if (!hotline) {
      return { quick_contact_item: null, success: false, message: 'Hotline not found' };
    }

    for (let j = 0; j < quick.length; j++) {
      if (quick[j].hotline_id === hotlineId) {
        return {
          quick_contact_item: quick[j],
          success: true,
          message: 'Already in Quick Contacts'
        };
      }
    }

    const item = {
      id: this._generateId('qc'),
      hotline_id: hotlineId,
      added_at: new Date().toISOString(),
      label: label || null,
      notes: notes || null
    };
    quick.push(item);
    this._saveToStorage('quick_contact_items', quick);

    return {
      quick_contact_item: item,
      success: true,
      message: 'Hotline added to Quick Contacts'
    };
  }

  // getQuickContacts()
  getQuickContacts() {
    const quick = this._getFromStorage('quick_contact_items');
    const hotlines = this._getFromStorage('hotlines');

    const result = quick.map(function (q) {
      let hotline = null;
      for (let i = 0; i < hotlines.length; i++) {
        if (hotlines[i].id === q.hotline_id) {
          hotline = hotlines[i];
          break;
        }
      }
      const name = q.label || (hotline ? hotline.name : '');
      const phone = hotline ? hotline.phone_number : '';
      const hours_display = hotline
        ? hotline.hours_description || (hotline.is_24_7 ? '24/7' : 'Limited hours')
        : '';
      let scope_display = '';
      if (hotline) {
        const map = {
          all_substances: 'All substances',
          alcohol_only: 'Alcohol only',
          opioids_only: 'Opioids only',
          mental_health: 'Mental health',
          other: 'Other'
        };
        scope_display = map[hotline.scope] || '';
      }
      return {
        quick_contact_item: q,
        hotline: hotline,
        name: name,
        phone_number: phone,
        hours_display: hours_display,
        scope_display: scope_display
      };
    });

    return result;
  }

  // removeQuickContactItem(quickContactItemId)
  removeQuickContactItem(quickContactItemId) {
    const quick = this._getFromStorage('quick_contact_items');
    const remaining = quick.filter(function (q) {
      return q.id !== quickContactItemId;
    });
    this._saveToStorage('quick_contact_items', remaining);
    const success = remaining.length < quick.length;
    return { success: success, message: success ? 'Quick contact removed' : 'Quick contact not found' };
  }

  // getFacilitatorProfile(facilitatorId)
  getFacilitatorProfile(facilitatorId) {
    const facilitators = this._getFromStorage('facilitators');
    const meetings = this._getFromStorage('meetings');

    let facilitator = null;
    for (let i = 0; i < facilitators.length; i++) {
      if (facilitators[i].id === facilitatorId) {
        facilitator = facilitators[i];
        break;
      }
    }

    const groups = meetings.filter(function (m) {
      return m.facilitator_id === facilitatorId;
    });

    return {
      facilitator: facilitator,
      groups: groups
    };
  }

  // sendFacilitatorMessage(facilitatorId, subject, message_body, preferred_reply_method)
  sendFacilitatorMessage(facilitatorId, subject, message_body, preferred_reply_method) {
    const facilitators = this._getFromStorage('facilitators');
    const messages = this._getFromStorage('facilitator_messages');

    let facilitator = null;
    for (let i = 0; i < facilitators.length; i++) {
      if (facilitators[i].id === facilitatorId) {
        facilitator = facilitators[i];
        break;
      }
    }
    if (!facilitator) {
      return {
        facilitator_message: null,
        success: false,
        confirmation_message: 'Facilitator not found'
      };
    }

    const replyMethod = preferred_reply_method || 'none_specified';

    const msg = {
      id: this._generateId('msg'),
      facilitator_id: facilitatorId,
      subject: subject,
      message_body: message_body,
      preferred_reply_method: replyMethod,
      created_at: new Date().toISOString(),
      status: 'sent'
    };
    messages.push(msg);
    this._saveToStorage('facilitator_messages', messages);

    return {
      facilitator_message: msg,
      success: true,
      confirmation_message: 'Your message has been sent to the facilitator.'
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
