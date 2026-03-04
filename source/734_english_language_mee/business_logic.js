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

  // -------------------- STORAGE HELPERS --------------------

  _initStorage() {
    const ensureKey = (key, defaultJson) => {
      if (localStorage.getItem(key) === null) {
        localStorage.setItem(key, defaultJson);
      }
    };

    // Core entity tables (arrays)
    ensureKey('events', '[]');
    ensureKey('my_events', '[]'); // MyEventRegistration
    ensureKey('event_bookmarks', '[]');
    ensureKey('messages_to_host', '[]');
    ensureKey('membership_plans', '[]');
    ensureKey('membership_subscriptions', '[]');
    ensureKey('promo_codes', '[]');
    ensureKey('membership_checkouts', '[]');
    ensureKey('courses', '[]');
    ensureKey('course_sessions', '[]');
    ensureKey('course_enrollments', '[]');
    ensureKey('calendar_items', '[]');

    // Single-object or other tables
    // ProfileSettings: single record or null
    if (localStorage.getItem('profile_settings') === null) {
      localStorage.setItem('profile_settings', 'null');
    }

    // Static content (can be null/empty; no mock content)
    if (localStorage.getItem('about_page_content') === null) {
      localStorage.setItem('about_page_content', 'null');
    }
    if (localStorage.getItem('contact_page_content') === null) {
      localStorage.setItem('contact_page_content', 'null');
    }
    if (localStorage.getItem('help_faq_content') === null) {
      localStorage.setItem('help_faq_content', '[]');
    }
    if (localStorage.getItem('terms_content') === null) {
      localStorage.setItem('terms_content', 'null');
    }
    if (localStorage.getItem('privacy_policy_content') === null) {
      localStorage.setItem('privacy_policy_content', 'null');
    }

    // Contact form submissions (for record-keeping)
    ensureKey('contact_form_submissions', '[]');

    // ID counter
    if (localStorage.getItem('idCounter') === null) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, defaultValue) {
    const raw = localStorage.getItem(key);
    if (raw === null || raw === undefined || raw === '') {
      return defaultValue !== undefined ? defaultValue : [];
    }
    try {
      return JSON.parse(raw);
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

  _nowIso() {
    return new Date().toISOString();
  }

  // -------------------- DATE/TIME HELPERS --------------------

  _startOfDay(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  _endOfDay(date) {
    const d = new Date(date);
    d.setHours(23, 59, 59, 999);
    return d;
  }

  _parseDateOnly(isoDateStr) {
    // isoDateStr like 'YYYY-MM-DD'
    return new Date(isoDateStr + 'T00:00:00');
  }

  _computeDateRange(date_range_type, start_date, end_date) {
    const now = new Date();
    let rangeStart = null;
    let rangeEnd = null;

    switch (date_range_type) {
      case 'today': {
        rangeStart = this._startOfDay(now);
        rangeEnd = this._endOfDay(now);
        break;
      }
      case 'this_saturday': {
        const day = now.getDay(); // 0=Sun, 6=Sat
        const daysUntilSaturday = (6 - day + 7) % 7;
        const saturday = new Date(now);
        saturday.setDate(now.getDate() + daysUntilSaturday);
        rangeStart = this._startOfDay(saturday);
        rangeEnd = this._endOfDay(saturday);
        break;
      }
      case 'next_week': {
        const day = now.getDay(); // 0=Sun,1=Mon,...
        let daysUntilNextMonday = (8 - day) % 7;
        if (daysUntilNextMonday === 0) {
          daysUntilNextMonday = 7;
        }
        const nextMonday = new Date(now);
        nextMonday.setDate(now.getDate() + daysUntilNextMonday);
        const nextSunday = new Date(nextMonday);
        nextSunday.setDate(nextMonday.getDate() + 6);
        rangeStart = this._startOfDay(nextMonday);
        rangeEnd = this._endOfDay(nextSunday);
        break;
      }
      case 'next_7_days': {
        const start = this._startOfDay(now);
        const end = new Date(start);
        end.setDate(start.getDate() + 7);
        rangeStart = start;
        rangeEnd = this._endOfDay(end);
        break;
      }
      case 'specific_day': {
        if (start_date) {
          const d = this._parseDateOnly(start_date);
          rangeStart = this._startOfDay(d);
          rangeEnd = this._endOfDay(d);
        }
        break;
      }
      case 'custom_range': {
        if (start_date) {
          rangeStart = this._startOfDay(this._parseDateOnly(start_date));
        }
        if (end_date) {
          rangeEnd = this._endOfDay(this._parseDateOnly(end_date));
        }
        break;
      }
      default:
        break;
    }

    if (!rangeStart || !rangeEnd) {
      return null;
    }
    return { start: rangeStart, end: rangeEnd };
  }

  _parseTimeToMinutes(timeStr) {
    if (!timeStr) return null;
    const parts = timeStr.split(':');
    if (parts.length < 2) return null;
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    if (isNaN(h) || isNaN(m)) return null;
    return h * 60 + m;
  }

  _getMinutesOfDayFromDatetime(isoDatetime) {
    const d = new Date(isoDatetime);
    // Use UTC-based time to avoid local timezone offsets when comparing to user-specified time ranges
    return d.getUTCHours() * 60 + d.getUTCMinutes();
  }

  // -------------------- PROFILE HELPERS --------------------

  _getOrCreateProfileSettings() {
    const raw = localStorage.getItem('profile_settings');
    let profile = null;
    if (raw && raw !== 'null') {
      try {
        profile = JSON.parse(raw);
      } catch (e) {
        profile = null;
      }
    }
    if (!profile) {
      const nowIso = this._nowIso();
      profile = {
        id: 'profile',
        full_name: null,
        email: null,
        level: null,
        interests: [],
        notification_instant_event_alerts: false,
        notification_daily_updates: false,
        notification_weekly_summary: false,
        preferred_location_name: null,
        availability_slots: [],
        learning_goals: '',
        preferred_group_size: null,
        created_at: nowIso,
        updated_at: nowIso
      };
      localStorage.setItem('profile_settings', JSON.stringify(profile));
    }
    return profile;
  }

  _saveProfileSettings(profile) {
    profile.updated_at = this._nowIso();
    localStorage.setItem('profile_settings', JSON.stringify(profile));
    return profile;
  }

  // -------------------- CALENDAR HELPERS --------------------

  _getOrCreateCalendarItemsForEvent(eventId, source) {
    const events = this._getFromStorage('events', []);
    const event = events.find(e => e.id === eventId);
    if (!event) {
      return null;
    }

    const calendarItems = this._getFromStorage('calendar_items', []);
    let item = calendarItems.find(ci => ci.item_type === 'event' && ci.ref_id === eventId);

    if (!item) {
      item = {
        id: this._generateId('cal_evt'),
        item_type: 'event',
        ref_id: eventId,
        start_datetime: event.start_datetime,
        end_datetime: event.end_datetime || null,
        title: event.title,
        location_name: event.location_name || null,
        source: source === 'manual_event_add' ? 'manual_event_add' : 'event_rsvp',
        created_at: this._nowIso()
      };
      calendarItems.push(item);
      this._saveToStorage('calendar_items', calendarItems);
    }

    return item;
  }

  // -------------------- PROMO HELPER --------------------

  _validateAndApplyPromoCode(plan, promo_code) {
    const result = {
      promo_code_applied: false,
      discount_amount: 0,
      message: ''
    };

    if (!promo_code || !promo_code.trim()) {
      result.message = 'No promo code provided.';
      return result;
    }

    const promoCodes = this._getFromStorage('promo_codes', []);
    const codeUpper = promo_code.trim().toUpperCase();
    const promo = promoCodes.find(p => (p.code || '').toUpperCase() === codeUpper && p.is_active);

    if (!promo) {
      result.message = 'Promo code not found or inactive.';
      return result;
    }

    const now = new Date();
    if (promo.valid_from) {
      const vf = new Date(promo.valid_from);
      if (now < vf) {
        result.message = 'Promo code is not yet valid.';
        return result;
      }
    }
    if (promo.valid_to) {
      const vt = new Date(promo.valid_to);
      if (now > vt) {
        result.message = 'Promo code has expired.';
        return result;
      }
    }

    if (Array.isArray(promo.applicable_plan_codes) && promo.applicable_plan_codes.length > 0) {
      if (!promo.applicable_plan_codes.includes(plan.plan_code)) {
        result.message = 'Promo code not applicable to this plan.';
        return result;
      }
    }

    const total = plan.price_amount;
    let discount = 0;

    if (promo.discount_type === 'percentage') {
      discount = (total * promo.discount_value) / 100;
    } else if (promo.discount_type === 'fixed_amount') {
      if (!promo.currency || promo.currency === plan.price_currency) {
        discount = promo.discount_value;
      } else {
        result.message = 'Promo currency does not match plan currency.';
        return result;
      }
    }

    if (discount < 0) discount = 0;
    if (discount > total) discount = total;

    result.promo_code_applied = discount > 0;
    result.discount_amount = discount;
    result.message = result.promo_code_applied ? 'Promo code applied.' : 'Promo code valid but no discount applied.';
    return result;
  }

  // -------------------- INTERFACES IMPLEMENTATION --------------------

  // getHomeHighlights()
  getHomeHighlights() {
    const events = this._getFromStorage('events', []);
    const courses = this._getFromStorage('courses', []);
    const profile = this._getOrCreateProfileSettings();
    const now = new Date();

    const featured_events = events
      .filter(e => e.status === 'published' && new Date(e.start_datetime) >= now)
      .sort((a, b) => {
        const ra = typeof a.average_rating === 'number' ? a.average_rating : 0;
        const rb = typeof b.average_rating === 'number' ? b.average_rating : 0;
        if (rb !== ra) return rb - ra;
        return new Date(a.start_datetime) - new Date(b.start_datetime);
      })
      .slice(0, 5);

    const featured_courses = courses
      .filter(c => c.status === 'published')
      .sort((a, b) => {
        const ra = typeof a.average_rating === 'number' ? a.average_rating : 0;
        const rb = typeof b.average_rating === 'number' ? b.average_rating : 0;
        return rb - ra;
      })
      .slice(0, 5);

    const suggested_filters = {
      default_level: profile.level || null,
      default_location_city: profile.preferred_location_name || null,
      default_date_range: 'next_7_days'
    };

    return { featured_events, featured_courses, suggested_filters };
  }

  // getEventSearchConfig()
  getEventSearchConfig() {
    return {
      date_presets: [
        { key: 'today', label: 'Today' },
        { key: 'this_saturday', label: 'This Saturday' },
        { key: 'next_week', label: 'Next week' },
        { key: 'next_7_days', label: 'Next 7 days' }
      ],
      levels: [
        { value: 'beginner_a1_a2', label: 'Beginner (A1–A2)' },
        { value: 'intermediate_b1_b2', label: 'Intermediate (B1–B2)' },
        { value: 'advanced_c1_c2', label: 'Advanced (C1–C2)' }
      ],
      formats: [
        { value: 'online', label: 'Online' },
        { value: 'in_person', label: 'In-person' }
      ],
      event_categories: [
        { value: 'meetup', label: 'Meetup' },
        { value: 'workshop', label: 'Workshop' }
      ],
      price_filters: {
        supports_free_only: true,
        max_price_default: 50,
        currency: 'usd'
      },
      sort_options: [
        { value: 'rating_desc', label: 'Rating - High to Low' },
        { value: 'start_time_asc', label: 'Start time - Earliest first' },
        { value: 'start_time_desc', label: 'Start time - Latest first' }
      ]
    };
  }

  // searchEvents(...)
  searchEvents(
    keyword,
    date_range_type,
    start_date,
    end_date,
    time_range_start,
    time_range_end,
    location_city,
    location_zip,
    radius_km, // not used for calculations; no coordinates for user
    level,
    price_type,
    max_price,
    format,
    event_category,
    max_capacity,
    min_review_count,
    min_rating,
    sort_by,
    page = 1,
    page_size = 20
  ) {
    let events = this._getFromStorage('events', []);

    // Only published
    events = events.filter(e => e.status === 'published');

    // Keyword
    if (keyword && keyword.trim()) {
      const kw = keyword.trim().toLowerCase();
      events = events.filter(e => {
        const title = (e.title || '').toLowerCase();
        const desc = (e.description || '').toLowerCase();
        const host = (e.host_name || '').toLowerCase();
        const tags = Array.isArray(e.tags) ? e.tags.join(' ').toLowerCase() : '';
        return (
          title.includes(kw) ||
          desc.includes(kw) ||
          host.includes(kw) ||
          tags.includes(kw)
        );
      });
    }

    // Date range
    if (date_range_type) {
      const range = this._computeDateRange(date_range_type, start_date, end_date);
      if (range) {
        events = events.filter(e => {
          const d = new Date(e.start_datetime);
          return d >= range.start && d <= range.end;
        });
      }
    }

    // Time range
    const timeStartMinutes = this._parseTimeToMinutes(time_range_start);
    const timeEndMinutes = this._parseTimeToMinutes(time_range_end);
    if (timeStartMinutes !== null || timeEndMinutes !== null) {
      events = events.filter(e => {
        const m = this._getMinutesOfDayFromDatetime(e.start_datetime);
        if (timeStartMinutes !== null && m < timeStartMinutes) return false;
        if (timeEndMinutes !== null && m > timeEndMinutes) return false;
        return true;
      });
    }

    // Location filters: equality-based, radius_km ignored due to lack of user coords
    if (location_city && location_city.trim()) {
      const lc = location_city.trim().toLowerCase();
      events = events.filter(e => {
        const ec = (e.location_city || '').toLowerCase();
        const ln = (e.location_name || '').toLowerCase();
        return (ec && ec === lc) || ln.includes(lc);
      });
    }
    if (location_zip && location_zip.trim()) {
      const lz = location_zip.trim();
      events = events.filter(e => (e.location_zip || '') === lz);
    }

    // Level
    if (level) {
      events = events.filter(e => e.level === level);
    }

    // Price type & max price
    if (price_type) {
      events = events.filter(e => e.price_type === price_type);
    }
    if (typeof max_price === 'number') {
      events = events.filter(e => typeof e.price_amount === 'number' && e.price_amount <= max_price);
    }

    // Format
    if (format) {
      events = events.filter(e => e.format === format);
    }

    // Event category
    if (event_category) {
      events = events.filter(e => e.event_category === event_category);
    }

    // Capacity upper bound (e.g., up to 8)
    if (typeof max_capacity === 'number') {
      events = events.filter(e => typeof e.capacity_max === 'number' && e.capacity_max <= max_capacity);
    }

    // Minimum review count
    if (typeof min_review_count === 'number') {
      events = events.filter(e => typeof e.review_count === 'number' && e.review_count >= min_review_count);
    }

    // Minimum rating
    if (typeof min_rating === 'number') {
      events = events.filter(e => typeof e.average_rating === 'number' && e.average_rating >= min_rating);
    }

    // Sorting
    if (sort_by === 'rating_desc') {
      events.sort((a, b) => {
        const ra = typeof a.average_rating === 'number' ? a.average_rating : 0;
        const rb = typeof b.average_rating === 'number' ? b.average_rating : 0;
        if (rb !== ra) return rb - ra;
        return new Date(a.start_datetime) - new Date(b.start_datetime);
      });
    } else if (sort_by === 'start_time_desc') {
      events.sort((a, b) => new Date(b.start_datetime) - new Date(a.start_datetime));
    } else {
      // default and 'start_time_asc'
      events.sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime));
    }

    const total = events.length;
    const p = page || 1;
    const size = page_size || 20;
    const fromIndex = (p - 1) * size;
    const toIndex = fromIndex + size;
    const sliced = events.slice(fromIndex, toIndex);

    return {
      events: sliced,
      total,
      page: p,
      page_size: size,
      has_more: toIndex < total
    };
  }

  // getEventDetails(eventId)
  getEventDetails(eventId) {
    const events = this._getFromStorage('events', []);
    const myEvents = this._getFromStorage('my_events', []);
    const bookmarks = this._getFromStorage('event_bookmarks', []);

    const event = events.find(e => e.id === eventId) || null;

    const registration = myEvents.find(r => r.event_id === eventId && r.status !== 'cancelled');
    const is_in_my_events = !!registration;
    const registration_status = registration ? registration.status : 'none';

    const is_bookmarked = bookmarks.some(b => b.event_id === eventId);

    const can_rsvp = !!event && event.status === 'published';

    return {
      event,
      user_state: {
        is_bookmarked,
        is_in_my_events,
        registration_status,
        can_rsvp
      }
    };
  }

  // rsvpToEvent(eventId)
  rsvpToEvent(eventId) {
    const events = this._getFromStorage('events', []);
    const event = events.find(e => e.id === eventId);
    if (!event) {
      return { success: false, registration: null, calendar_item: null, message: 'Event not found.' };
    }
    if (event.status !== 'published') {
      return { success: false, registration: null, calendar_item: null, message: 'Event is not open for RSVP.' };
    }

    const myEvents = this._getFromStorage('my_events', []);
    let registration = myEvents.find(r => r.event_id === eventId);

    if (!registration) {
      registration = {
        id: this._generateId('my_evt'),
        event_id: eventId,
        status: 'going',
        source: 'rsvp',
        added_at: this._nowIso()
      };
      myEvents.push(registration);
    } else {
      registration.status = 'going';
      registration.source = 'rsvp';
      registration.added_at = this._nowIso();
    }

    this._saveToStorage('my_events', myEvents);

    const calendar_item = this._getOrCreateCalendarItemsForEvent(eventId, 'event_rsvp');

    return {
      success: true,
      registration,
      calendar_item,
      message: 'RSVP successful.'
    };
  }

  // addEventToMyEvents(eventId, source)
  addEventToMyEvents(eventId, source) {
    const events = this._getFromStorage('events', []);
    const event = events.find(e => e.id === eventId);
    if (!event) {
      return { success: false, registration: null, calendar_item: null, message: 'Event not found.' };
    }

    const myEvents = this._getFromStorage('my_events', []);
    let registration = myEvents.find(r => r.event_id === eventId);

    if (!registration) {
      registration = {
        id: this._generateId('my_evt'),
        event_id: eventId,
        status: 'going',
        source: 'manual_add',
        added_at: this._nowIso()
      };
      myEvents.push(registration);
    } else {
      registration.status = 'going';
      registration.source = 'manual_add';
      registration.added_at = this._nowIso();
    }

    this._saveToStorage('my_events', myEvents);

    const calendar_item = this._getOrCreateCalendarItemsForEvent(eventId, 'manual_event_add');

    return {
      success: true,
      registration,
      calendar_item,
      message: 'Event added to My Events.'
    };
  }

  // cancelMyEventRegistration(eventId)
  cancelMyEventRegistration(eventId) {
    const myEvents = this._getFromStorage('my_events', []);
    const registration = myEvents.find(r => r.event_id === eventId);

    if (!registration) {
      return { success: false, updated_registration: null, message: 'Registration not found.' };
    }

    registration.status = 'cancelled';
    this._saveToStorage('my_events', myEvents);

    // Remove related calendar items
    let calendarItems = this._getFromStorage('calendar_items', []);
    calendarItems = calendarItems.filter(
      ci => !(ci.item_type === 'event' && ci.ref_id === eventId)
    );
    this._saveToStorage('calendar_items', calendarItems);

    return { success: true, updated_registration: registration, message: 'Registration cancelled.' };
  }

  // bookmarkEvent(eventId, source)
  bookmarkEvent(eventId, source) {
    const events = this._getFromStorage('events', []);
    const event = events.find(e => e.id === eventId);
    if (!event) {
      return { success: false, bookmark: null, message: 'Event not found.' };
    }

    const bookmarks = this._getFromStorage('event_bookmarks', []);
    let bookmark = bookmarks.find(b => b.event_id === eventId);

    if (!bookmark) {
      bookmark = {
        id: this._generateId('bmk'),
        event_id: eventId,
        bookmarked_at: this._nowIso(),
        source: source || 'events_list'
      };
      bookmarks.push(bookmark);
      this._saveToStorage('event_bookmarks', bookmarks);
      return { success: true, bookmark, message: 'Event bookmarked.' };
    }

    return { success: true, bookmark, message: 'Event already bookmarked.' };
  }

  // unbookmarkEvent(eventId)
  unbookmarkEvent(eventId) {
    let bookmarks = this._getFromStorage('event_bookmarks', []);
    const before = bookmarks.length;
    bookmarks = bookmarks.filter(b => b.event_id !== eventId);
    this._saveToStorage('event_bookmarks', bookmarks);
    const removed = before !== bookmarks.length;
    return { success: removed, message: removed ? 'Bookmark removed.' : 'Bookmark not found.' };
  }

  // sendMessageToHost(eventId, message_text)
  sendMessageToHost(eventId, message_text) {
    const events = this._getFromStorage('events', []);
    const event = events.find(e => e.id === eventId);
    if (!event) {
      return {
        success: false,
        message: null,
        feedback: 'Event not found.'
      };
    }

    if (!message_text || !message_text.trim()) {
      return {
        success: false,
        message: null,
        feedback: 'Message text is required.'
      };
    }

    const messages = this._getFromStorage('messages_to_host', []);
    const msg = {
      id: this._generateId('msg_host'),
      event_id: eventId,
      message_text: message_text,
      sent_at: this._nowIso(),
      status: 'sent',
      host_reply_text: null
    };
    messages.push(msg);
    this._saveToStorage('messages_to_host', messages);

    return {
      success: true,
      message: msg,
      feedback: 'Message sent to host.'
    };
  }

  // signUpAccountWithPreferences(...)
  signUpAccountWithPreferences(
    full_name,
    email,
    password,
    level,
    interests,
    notification_instant_event_alerts,
    notification_daily_updates,
    notification_weekly_summary
  ) {
    // Single-user profile semantics: overwrite or initialize profile
    const nowIso = this._nowIso();
    const profile = {
      id: 'profile',
      full_name: full_name || null,
      email: email || null,
      level: level || null,
      interests: Array.isArray(interests) ? interests : [],
      notification_instant_event_alerts: !!notification_instant_event_alerts,
      notification_daily_updates: !!notification_daily_updates,
      notification_weekly_summary: !!notification_weekly_summary,
      preferred_location_name: null,
      availability_slots: [],
      learning_goals: '',
      preferred_group_size: null,
      created_at: nowIso,
      updated_at: nowIso
    };

    this._saveProfileSettings(profile);

    // Password is accepted but not persisted in this business-logic layer.

    return {
      profile,
      success: true,
      message: 'Account created with preferences.'
    };
  }

  // getProfileSettings()
  getProfileSettings() {
    return this._getOrCreateProfileSettings();
  }

  // updateProfileSettings({ ...updates })
  updateProfileSettings(updates) {
    const profile = this._getOrCreateProfileSettings();
    const allowedKeys = [
      'full_name',
      'email',
      'level',
      'interests',
      'notification_instant_event_alerts',
      'notification_daily_updates',
      'notification_weekly_summary',
      'preferred_location_name',
      'availability_slots',
      'learning_goals',
      'preferred_group_size'
    ];

    allowedKeys.forEach(key => {
      if (Object.prototype.hasOwnProperty.call(updates, key) && updates[key] !== undefined) {
        profile[key] = updates[key];
      }
    });

    this._saveProfileSettings(profile);
    return profile;
  }

  // getMyEventsList()
  getMyEventsList() {
    const registrations = this._getFromStorage('my_events', []);
    const events = this._getFromStorage('events', []);

    // Resolve event_id -> event
    const list = registrations.map(reg => {
      const event = events.find(e => e.id === reg.event_id) || null;
      return { registration: reg, event };
    });

    return list;
  }

  // getSavedEventsList()
  getSavedEventsList() {
    const bookmarks = this._getFromStorage('event_bookmarks', []);
    const events = this._getFromStorage('events', []);
    const registrations = this._getFromStorage('my_events', []);

    return bookmarks.map(b => {
      const event = events.find(e => e.id === b.event_id) || null;
      const is_in_my_events = registrations.some(r => r.event_id === b.event_id && r.status === 'going');
      return { bookmark: b, event, is_in_my_events };
    });
  }

  // convertBookmarkToMyEvent(eventId, keep_bookmark = true)
  convertBookmarkToMyEvent(eventId, keep_bookmark = true) {
    const addResult = this.addEventToMyEvents(eventId, 'events_list');
    if (!addResult.success) {
      return {
        registration: null,
        calendar_item: null,
        success: false,
        message: addResult.message
      };
    }

    if (!keep_bookmark) {
      this.unbookmarkEvent(eventId);
    }

    return {
      registration: addResult.registration,
      calendar_item: addResult.calendar_item,
      success: true,
      message: 'Bookmark converted to My Event.'
    };
  }

  // getSavedEventsCalendarView()
  getSavedEventsCalendarView() {
    const bookmarks = this._getFromStorage('event_bookmarks', []);
    const events = this._getFromStorage('events', []);

    // Instrumentation for task completion tracking
    try {
      localStorage.setItem('task7_savedEventsCalendarViewOpened', 'true');
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return bookmarks.map(b => {
      const event = events.find(e => e.id === b.event_id) || null;
      return {
        event,
        bookmarked_at: b.bookmarked_at
      };
    });
  }

  // getCalendarItems(start_date, end_date, item_type_filter)
  getCalendarItems(start_date, end_date, item_type_filter) {
    const calendarItems = this._getFromStorage('calendar_items', []);
    const events = this._getFromStorage('events', []);
    const sessions = this._getFromStorage('course_sessions', []);

    const start = this._startOfDay(this._parseDateOnly(start_date));
    const end = this._endOfDay(this._parseDateOnly(end_date));

    const typeFilter = item_type_filter && item_type_filter !== 'all' ? item_type_filter : null;

    const filtered = calendarItems
      .filter(ci => {
        const d = new Date(ci.start_datetime);
        if (d < start || d > end) return false;
        if (typeFilter && ci.item_type !== typeFilter) return false;
        return true;
      })
      .sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime));

    // Instrumentation for task completion tracking
    try {
      localStorage.setItem(
        'task9_calendarViewOpened',
        JSON.stringify({
          start_date: start_date,
          end_date: end_date,
          item_type_filter: item_type_filter || 'all',
          opened_at: this._nowIso()
        })
      );
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    // Resolve foreign keys: ref_id -> event or course_session
    return filtered.map(ci => {
      let resolved = { ...ci };
      if (ci.item_type === 'event') {
        resolved.event = events.find(e => e.id === ci.ref_id) || null;
      } else if (ci.item_type === 'course_session') {
        resolved.course_session = sessions.find(s => s.id === ci.ref_id) || null;
      }
      return resolved;
    });
  }

  // createHostedEvent(...)
  createHostedEvent(
    title,
    event_category,
    format,
    level,
    start_datetime,
    end_datetime,
    location_name,
    location_address,
    location_city,
    location_zip,
    online_meeting_url,
    capacity_max,
    price_type,
    price_amount,
    description
  ) {
    const events = this._getFromStorage('events', []);

    const startDt = new Date(start_datetime);
    let duration_minutes = null;
    if (end_datetime) {
      const endDt = new Date(end_datetime);
      const diffMs = endDt - startDt;
      if (!isNaN(diffMs) && diffMs > 0) {
        duration_minutes = Math.round(diffMs / 60000);
      }
    }

    const event = {
      id: this._generateId('evt'),
      title: title,
      event_category: event_category,
      format: format,
      level: level,
      price_type: price_type,
      price_amount: typeof price_amount === 'number' ? price_amount : 0,
      price_currency: 'usd',
      capacity_max: typeof capacity_max === 'number' ? capacity_max : null,
      start_datetime: start_datetime,
      end_datetime: end_datetime || null,
      duration_minutes: duration_minutes,
      location_name: location_name || null,
      location_address: location_address || null,
      location_city: location_city || null,
      location_zip: location_zip || null,
      location_lat: null,
      location_lng: null,
      online_meeting_url: online_meeting_url || null,
      average_rating: null,
      review_count: 0,
      host_name: null,
      tags: [],
      description: description || '',
      status: 'published',
      created_at: this._nowIso()
    };

    events.push(event);
    this._saveToStorage('events', events);

    return {
      event,
      success: true,
      message: 'Event created.'
    };
  }

  // getMembershipPlans()
  getMembershipPlans() {
    return this._getFromStorage('membership_plans', []);
  }

  // getMembershipPlanDetails(planId)
  getMembershipPlanDetails(planId) {
    const plans = this._getFromStorage('membership_plans', []);
    return plans.find(p => p.id === planId) || null;
  }

  // calculateMembershipPriceWithPromo(planId, promo_code)
  calculateMembershipPriceWithPromo(planId, promo_code) {
    const plans = this._getFromStorage('membership_plans', []);
    const plan = plans.find(p => p.id === planId);

    if (!plan) {
      return {
        plan: null,
        total_before_discount: 0,
        promo_code: promo_code || null,
        promo_code_applied: false,
        discount_amount: 0,
        total_after_discount: 0,
        message: 'Plan not found.'
      };
    }

    const total_before_discount = plan.price_amount;

    const { promo_code_applied, discount_amount, message } = this._validateAndApplyPromoCode(
      plan,
      promo_code
    );

    const total_after_discount = total_before_discount - discount_amount;

    return {
      plan,
      total_before_discount,
      promo_code: promo_code || null,
      promo_code_applied,
      discount_amount,
      total_after_discount,
      message
    };
  }

  // submitMembershipCheckout(...)
  submitMembershipCheckout(
    planId,
    full_name,
    card_number,
    card_expiration,
    card_cvv,
    billing_address,
    billing_zip,
    promo_code
  ) {
    const plans = this._getFromStorage('membership_plans', []);
    const plan = plans.find(p => p.id === planId);

    if (!plan) {
      return {
        checkout: null,
        subscription: null,
        success: false,
        message: 'Plan not found.'
      };
    }

    const total_before_discount = plan.price_amount;
    const { promo_code_applied, discount_amount } = this._validateAndApplyPromoCode(
      plan,
      promo_code
    );
    const total_after_discount = total_before_discount - discount_amount;

    const checkouts = this._getFromStorage('membership_checkouts', []);
    const subscriptions = this._getFromStorage('membership_subscriptions', []);

    const checkoutId = this._generateId('chk');
    const subscriptionId = this._generateId('sub');

    const checkout = {
      id: checkoutId,
      plan_id: planId,
      full_name,
      card_number,
      card_expiration,
      card_cvv,
      billing_address,
      billing_zip,
      promo_code: promo_code || null,
      promo_code_applied,
      total_before_discount,
      discount_amount,
      total_after_discount,
      created_at: this._nowIso(),
      status: 'completed',
      subscription_id: subscriptionId
    };

    const subscription = {
      id: subscriptionId,
      plan_id: planId,
      start_date: this._nowIso(),
      end_date: null,
      status: 'active',
      auto_renew: true,
      last_payment_transaction_id: checkoutId
    };

    checkouts.push(checkout);
    subscriptions.push(subscription);
    this._saveToStorage('membership_checkouts', checkouts);
    this._saveToStorage('membership_subscriptions', subscriptions);

    return {
      checkout,
      subscription,
      success: true,
      message: 'Membership started.'
    };
  }

  // getCourseSearchConfig()
  getCourseSearchConfig() {
    return {
      course_types: [
        { value: 'single_session', label: 'Single session' },
        { value: 'course_series', label: 'Course series' }
      ],
      focus_areas: [
        { value: 'pronunciation', label: 'Pronunciation' },
        { value: 'grammar', label: 'Grammar' },
        { value: 'conversation', label: 'Conversation' },
        { value: 'business_english', label: 'Business English' },
        { value: 'travel_and_culture', label: 'Travel & Culture' },
        { value: 'exam_preparation', label: 'Exam preparation' }
      ],
      sort_options: [
        { value: 'rating_desc', label: 'Rating - High to Low' },
        { value: 'relevance', label: 'Relevance' }
      ]
    };
  }

  // searchCourses(...)
  searchCourses(
    keyword,
    course_type,
    focus_area,
    level,
    min_rating,
    max_total_price,
    sort_by,
    page = 1,
    page_size = 20
  ) {
    let courses = this._getFromStorage('courses', []);

    // Only published
    courses = courses.filter(c => c.status === 'published');

    // Keyword
    if (keyword && keyword.trim()) {
      const kw = keyword.trim().toLowerCase();
      courses = courses.filter(c => {
        const title = (c.title || '').toLowerCase();
        const desc = (c.description || '').toLowerCase();
        return title.includes(kw) || desc.includes(kw);
      });
    }

    if (course_type) {
      courses = courses.filter(c => c.course_type === course_type);
    }

    if (focus_area) {
      courses = courses.filter(c => c.focus_area === focus_area);
    }

    if (level) {
      courses = courses.filter(c => c.level === level);
    }

    if (typeof min_rating === 'number') {
      courses = courses.filter(c => typeof c.average_rating === 'number' && c.average_rating >= min_rating);
    }

    if (typeof max_total_price === 'number') {
      courses = courses.filter(
        c => typeof c.total_price_amount === 'number' && c.total_price_amount <= max_total_price
      );
    }

    if (sort_by === 'rating_desc') {
      courses.sort((a, b) => {
        const ra = typeof a.average_rating === 'number' ? a.average_rating : 0;
        const rb = typeof b.average_rating === 'number' ? b.average_rating : 0;
        return rb - ra;
      });
    } else {
      // 'relevance' or default: also sort by rating desc as simple heuristic
      courses.sort((a, b) => {
        const ra = typeof a.average_rating === 'number' ? a.average_rating : 0;
        const rb = typeof b.average_rating === 'number' ? b.average_rating : 0;
        return rb - ra;
      });
    }

    const total = courses.length;
    const p = page || 1;
    const size = page_size || 20;
    const fromIndex = (p - 1) * size;
    const toIndex = fromIndex + size;
    const sliced = courses.slice(fromIndex, toIndex);

    return {
      courses: sliced,
      total,
      page: p,
      page_size: size,
      has_more: toIndex < total
    };
  }

  // getCourseDetails(courseId)
  getCourseDetails(courseId) {
    const courses = this._getFromStorage('courses', []);
    const sessions = this._getFromStorage('course_sessions', []);
    const enrollments = this._getFromStorage('course_enrollments', []);

    const course = courses.find(c => c.id === courseId) || null;

    const courseSessions = sessions
      .filter(s => s.course_id === courseId)
      .sort((a, b) => {
        if (typeof a.session_index === 'number' && typeof b.session_index === 'number') {
          return a.session_index - b.session_index;
        }
        return new Date(a.start_datetime) - new Date(b.start_datetime);
      });

    const enrollment = enrollments.find(e => e.course_id === courseId);
    const enrollment_state = {
      is_enrolled: !!enrollment && enrollment.status === 'enrolled',
      status: enrollment ? enrollment.status : 'none'
    };

    return {
      course,
      sessions: courseSessions,
      enrollment_state
    };
  }

  // enrollInCourse(courseId)
  enrollInCourse(courseId) {
    const courses = this._getFromStorage('courses', []);
    const course = courses.find(c => c.id === courseId);
    if (!course) {
      return {
        enrollment: null,
        success: false,
        message: 'Course not found.'
      };
    }

    const enrollments = this._getFromStorage('course_enrollments', []);
    let enrollment = enrollments.find(e => e.course_id === courseId);

    if (!enrollment) {
      enrollment = {
        id: this._generateId('enr'),
        course_id: courseId,
        enrolled_at: this._nowIso(),
        status: 'enrolled'
      };
      enrollments.push(enrollment);
    } else {
      enrollment.status = 'enrolled';
      enrollment.enrolled_at = this._nowIso();
    }

    this._saveToStorage('course_enrollments', enrollments);

    return {
      enrollment,
      success: true,
      message: 'Enrolled in course.'
    };
  }

  // addCourseSessionsToCalendar(courseId)
  addCourseSessionsToCalendar(courseId) {
    const sessions = this._getFromStorage('course_sessions', []);
    const calendarItems = this._getFromStorage('calendar_items', []);
    const courses = this._getFromStorage('courses', []);

    const course = courses.find(c => c.id === courseId);
    if (!course) {
      return {
        calendar_items: [],
        success: false,
        message: 'Course not found.'
      };
    }

    const courseSessions = sessions.filter(s => s.course_id === courseId);
    const createdItems = [];

    courseSessions.forEach(session => {
      const exists = calendarItems.some(
        ci => ci.item_type === 'course_session' && ci.ref_id === session.id
      );
      if (exists) {
        return;
      }
      const title = session.title || (course.title + ' - Session ' + (session.session_index || ''));
      const item = {
        id: this._generateId('cal_course'),
        item_type: 'course_session',
        ref_id: session.id,
        start_datetime: session.start_datetime,
        end_datetime: session.end_datetime || null,
        title: title,
        location_name: session.location_name || null,
        source: 'course_enrollment',
        created_at: this._nowIso()
      };
      calendarItems.push(item);
      createdItems.push(item);
    });

    this._saveToStorage('calendar_items', calendarItems);

    return {
      calendar_items: createdItems,
      success: true,
      message: 'Course sessions added to calendar.'
    };
  }

  // getAboutPageContent()
  getAboutPageContent() {
    const stored = this._getFromStorage('about_page_content', null);
    if (stored && typeof stored === 'object') {
      return stored;
    }
    return {
      heading: '',
      sections: []
    };
  }

  // getContactPageContent()
  getContactPageContent() {
    const stored = this._getFromStorage('contact_page_content', null);
    if (stored && typeof stored === 'object') {
      return stored;
    }
    return {
      contact_email: '',
      physical_address: ''
    };
  }

  // submitContactForm(name, email, subject, message)
  submitContactForm(name, email, subject, message) {
    const submissions = this._getFromStorage('contact_form_submissions', []);
    const submission = {
      id: this._generateId('contact'),
      name,
      email,
      subject,
      message,
      created_at: this._nowIso()
    };
    submissions.push(submission);
    this._saveToStorage('contact_form_submissions', submissions);

    return {
      success: true,
      message: 'Contact form submitted.'
    };
  }

  // getHelpFaqContent()
  getHelpFaqContent() {
    return this._getFromStorage('help_faq_content', []);
  }

  // getTermsContent()
  getTermsContent() {
    const stored = this._getFromStorage('terms_content', null);
    if (stored && typeof stored === 'object') {
      return stored;
    }
    return {
      last_updated: '',
      body: ''
    };
  }

  // getPrivacyPolicyContent()
  getPrivacyPolicyContent() {
    const stored = this._getFromStorage('privacy_policy_content', null);
    if (stored && typeof stored === 'object') {
      return stored;
    }
    return {
      last_updated: '',
      body: ''
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