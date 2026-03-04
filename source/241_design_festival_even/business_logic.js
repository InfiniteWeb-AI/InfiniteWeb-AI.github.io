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

  _initStorage() {
    const defaults = [
      { key: 'sessions', value: [] },
      { key: 'speakers', value: [] },
      { key: 'venues', value: [] },
      { key: 'tickets', value: [] },
      { key: 'ticket_price_tiers', value: [] },
      { key: 'carts', value: [] },
      { key: 'cart_items', value: [] },
      { key: 'orders', value: [] },
      { key: 'order_items', value: [] },
      { key: 'schedules', value: [] },
      { key: 'favorites_lists', value: [] },
      { key: 'visit_lists', value: [] },
      { key: 'portfolio_review_slots', value: [] },
      { key: 'portfolio_review_registrations', value: [] },
      { key: 'exhibitors', value: [] },
      { key: 'newsletter_subscriptions', value: [] },
      { key: 'newsletter_topic_preferences', value: [] },
      { key: 'routes', value: [] },
      { key: 'festival_overview', value: {} },
      {
        key: 'festival_info',
        value: {
          mission_html: '',
          organizers: [],
          contact_email: '',
          contact_phone: '',
          policies: []
        }
      },
      { key: 'session_share_logs', value: [] },
      { key: 'latest_order_id', value: null }
    ];

    for (const def of defaults) {
      if (localStorage.getItem(def.key) === null) {
        localStorage.setItem(def.key, JSON.stringify(def.value));
      }
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

  _nowIso() {
    return new Date().toISOString();
  }

  _formatDateLabel(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T00:00:00Z');
    if (isNaN(d.getTime())) return dateStr;
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const month = monthNames[d.getUTCMonth()];
    const day = d.getUTCDate();
    const year = d.getUTCFullYear();
    return month + ' ' + day + ', ' + year;
  }

  _datePartFromIso(isoStr) {
    if (!isoStr) return null;
    const idx = isoStr.indexOf('T');
    return idx > 0 ? isoStr.slice(0, idx) : isoStr;
  }

  _timeMinutesFromIso(isoStr) {
    if (!isoStr) return null;
    const m = String(isoStr).match(/T(\d{2}):(\d{2})/);
    if (!m) return null;
    const h = parseInt(m[1], 10);
    const mins = parseInt(m[2], 10);
    if (isNaN(h) || isNaN(mins)) return null;
    return h * 60 + mins;
  }

  _timeMinutesFromHHMM(timeStr) {
    if (!timeStr) return null;
    const parts = timeStr.split(':');
    if (parts.length !== 2) return null;
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    if (isNaN(h) || isNaN(m)) return null;
    return h * 60 + m;
  }

  _formatLabelForFormat(format) {
    if (!format) return '';
    const map = {
      talk: 'Talk',
      workshop: 'Workshop',
      panel: 'Panel',
      networking: 'Networking',
      meetup: 'Meetup',
      keynote: 'Keynote',
      portfolio_review: 'Portfolio Review',
      other: 'Other'
    };
    return map[format] || format;
  }

  _haversineDistanceMeters(lat1, lon1, lat2, lon2) {
    if (
      typeof lat1 !== 'number' || typeof lon1 !== 'number' ||
      typeof lat2 !== 'number' || typeof lon2 !== 'number'
    ) {
      return 0;
    }
    const toRad = deg => (deg * Math.PI) / 180;
    const R = 6371000; // meters
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
  }

  // Helper: get or create single-user MySchedule
  _getOrCreateMySchedule() {
    const schedules = this._getFromStorage('schedules', []);
    let schedule = schedules[0] || null;
    if (!schedule) {
      schedule = {
        id: this._generateId('schedule'),
        name: 'My Schedule',
        created_at: this._nowIso(),
        updated_at: this._nowIso(),
        session_ids: []
      };
      schedules.push(schedule);
      this._saveToStorage('schedules', schedules);
    }
    if (!Array.isArray(schedule.session_ids)) {
      schedule.session_ids = [];
    }
    return schedule;
  }

  // Helper: get or create FavoritesList
  _getOrCreateFavoritesList() {
    const lists = this._getFromStorage('favorites_lists', []);
    let list = lists[0] || null;
    if (!list) {
      list = {
        id: this._generateId('favorites'),
        name: 'Favorites',
        created_at: this._nowIso(),
        updated_at: this._nowIso(),
        session_ids: []
      };
      lists.push(list);
      this._saveToStorage('favorites_lists', lists);
    }
    if (!Array.isArray(list.session_ids)) {
      list.session_ids = [];
    }
    return list;
  }

  // Helper: get or create VisitList (with optional notes map)
  _getOrCreateVisitList() {
    const lists = this._getFromStorage('visit_lists', []);
    let list = lists[0] || null;
    if (!list) {
      list = {
        id: this._generateId('visitlist'),
        name: 'My Visit List',
        created_at: this._nowIso(),
        updated_at: this._nowIso(),
        exhibitor_ids: [],
        notes: {}
      };
      lists.push(list);
      this._saveToStorage('visit_lists', lists);
    }
    if (!Array.isArray(list.exhibitor_ids)) {
      list.exhibitor_ids = [];
    }
    if (!list.notes || typeof list.notes !== 'object') {
      list.notes = {};
    }
    return list;
  }

  // Helper: get or create single active Cart
  _getOrCreateCart() {
    const carts = this._getFromStorage('carts', []);
    let cart = carts.find(c => c.status === 'active') || null;
    if (!cart) {
      cart = {
        id: this._generateId('cart'),
        status: 'active',
        created_at: this._nowIso(),
        updated_at: this._nowIso(),
        subtotal: 0,
        currency: 'usd'
      };
      carts.push(cart);
      this._saveToStorage('carts', carts);
    }
    return cart;
  }

  // Helper: recalc totals for a cart
  _recalculateCartTotals(cartId) {
    const carts = this._getFromStorage('carts', []);
    const cartItems = this._getFromStorage('cart_items', []);
    const cart = carts.find(c => c.id === cartId);
    if (!cart) return null;
    const itemsForCart = cartItems.filter(ci => ci.cart_id === cartId);
    let subtotal = 0;
    for (const item of itemsForCart) {
      const qty = Number(item.quantity) || 0;
      const unit = Number(item.unit_price) || 0;
      item.total_price = unit * qty;
      subtotal += item.total_price;
    }
    cart.subtotal = subtotal;
    cart.updated_at = this._nowIso();
    this._saveToStorage('cart_items', cartItems);
    this._saveToStorage('carts', carts);
    return cart;
  }

  // Helper: get or create NewsletterSubscription record for single user (by email if provided)
  _getOrCreateNewsletterSubscriptionRecord(email) {
    const subs = this._getFromStorage('newsletter_subscriptions', []);
    let sub = null;
    if (email) {
      sub = subs.find(s => s.email === email) || null;
    }
    if (!sub) {
      sub = subs[0] || null;
    }
    if (!sub) {
      sub = {
        id: this._generateId('nsub'),
        full_name: '',
        email: email || '',
        frequency: 'weekly',
        consent_to_updates: false,
        status: 'pending',
        created_at: this._nowIso(),
        updated_at: this._nowIso()
      };
      subs.push(sub);
      this._saveToStorage('newsletter_subscriptions', subs);
    }
    return sub;
  }

  // Helper: save Route entity
  _saveRoute(route) {
    const routes = this._getFromStorage('routes', []);
    routes.push(route);
    this._saveToStorage('routes', routes);
  }

  // ===================== Interfaces =====================

  // getFestivalOverview
  getFestivalOverview() {
    const overviewMeta = this._getFromStorage('festival_overview', {}) || {};
    const venues = this._getFromStorage('venues', []);
    const sessions = this._getFromStorage('sessions', []);
    const speakers = this._getFromStorage('speakers', []);
    const exhibitors = this._getFromStorage('exhibitors', []);

    // Derive dates if missing
    let startDate = overviewMeta.start_date || null;
    let endDate = overviewMeta.end_date || null;
    const allDates = [];
    for (const s of sessions) {
      const d = this._datePartFromIso(s.start_datetime);
      if (d) allDates.push(d);
    }
    if (!startDate && allDates.length > 0) {
      startDate = allDates.slice().sort()[0];
    }
    if (!endDate && allDates.length > 0) {
      endDate = allDates.slice().sort()[allDates.length - 1];
    }

    const mainVenues = venues
      .filter(v => v.is_main_venue)
      .map(v => ({
        venue_id: v.id,
        name: v.name,
        description: v.description || '',
        address: v.address || '',
        city: v.city || '',
        is_main_venue: !!v.is_main_venue
      }));

    return {
      festival_name: overviewMeta.festival_name || '',
      tagline: overviewMeta.tagline || '',
      start_date: startDate || '',
      end_date: endDate || '',
      location_summary: overviewMeta.location_summary || '',
      main_venues: mainVenues,
      highlight_counts: {
        total_sessions: sessions.length,
        total_speakers: speakers.length,
        total_exhibitors: exhibitors.length,
        total_venues: venues.length
      }
    };
  }

  // getHomeFeaturedContent
  getHomeFeaturedContent(maxSessions, maxExhibitors) {
    const ms = typeof maxSessions === 'number' ? maxSessions : 6;
    const me = typeof maxExhibitors === 'number' ? maxExhibitors : 6;

    const sessions = this._getFromStorage('sessions', []);
    const speakers = this._getFromStorage('speakers', []);
    const venues = this._getFromStorage('venues', []);
    const exhibitors = this._getFromStorage('exhibitors', []);

    const venueById = {};
    for (const v of venues) venueById[v.id] = v;
    const speakerById = {};
    for (const sp of speakers) speakerById[sp.id] = sp;

    const featuredSessionsRaw = sessions
      .filter(s => !!s.is_featured)
      .sort((a, b) => {
        const da = a.start_datetime || '';
        const db = b.start_datetime || '';
        return da.localeCompare(db);
      })
      .slice(0, ms);

    const featured_sessions = featuredSessionsRaw.map(s => ({
      session_id: s.id,
      title: s.title,
      format: s.format,
      format_label: this._formatLabelForFormat(s.format),
      start_datetime: s.start_datetime,
      end_datetime: s.end_datetime,
      is_featured: !!s.is_featured,
      venue_name: s.venue_id && venueById[s.venue_id] ? venueById[s.venue_id].name : '',
      speaker_names: Array.isArray(s.speaker_ids)
        ? s.speaker_ids
            .map(id => (speakerById[id] ? speakerById[id].name : null))
            .filter(Boolean)
        : [],
      is_free: !!s.is_free,
      price: typeof s.price === 'number' ? s.price : 0
    }));

    const featured_speakers = speakers
      .slice()
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
      .slice(0, 6)
      .map(sp => ({
        speaker_id: sp.id,
        name: sp.name,
        role: sp.role || '',
        organization: sp.organization || '',
        photo_url: sp.photo_url || ''
      }));

    const featured_exhibitors = exhibitors
      .slice()
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
      .slice(0, me)
      .map(ex => ({
        exhibitor_id: ex.id,
        name: ex.name,
        category: ex.category || '',
        rating: typeof ex.rating === 'number' ? ex.rating : 0,
        is_prototyping_tool: !!ex.is_prototyping_tool,
        logo_url: ex.logo_url || ''
      }));

    return { featured_sessions, featured_speakers, featured_exhibitors };
  }

  // getHomeQuickAccessSummary
  getHomeQuickAccessSummary() {
    const mySchedule = this._getOrCreateMySchedule();
    const favoritesList = this._getOrCreateFavoritesList();
    const visitList = this._getOrCreateVisitList();

    const sessions = this._getFromStorage('sessions', []);
    const venues = this._getFromStorage('venues', []);
    const slots = this._getFromStorage('portfolio_review_slots', []);

    const venueById = {};
    for (const v of venues) venueById[v.id] = v;

    const now = new Date();

    const mySessions = mySchedule.session_ids
      .map(id => sessions.find(s => s.id === id) || null)
      .filter(Boolean);

    const upcoming = mySessions
      .filter(s => {
        const d = new Date(s.start_datetime);
        return !isNaN(d.getTime()) && d >= now;
      })
      .sort((a, b) => (a.start_datetime || '').localeCompare(b.start_datetime || ''))
      .slice(0, 5)
      .map(s => ({
        session_id: s.id,
        title: s.title,
        start_datetime: s.start_datetime,
        end_datetime: s.end_datetime,
        format_label: this._formatLabelForFormat(s.format),
        venue_name: s.venue_id && venueById[s.venue_id] ? venueById[s.venue_id].name : ''
      }));

    const availableSlots = slots
      .filter(sl => sl.status === 'available')
      .filter(sl => {
        const d = new Date(sl.start_datetime);
        return !isNaN(d.getTime()) && d >= now;
      })
      .sort((a, b) => (a.start_datetime || '').localeCompare(b.start_datetime || ''));

    const nextSlot = availableSlots[0] || null;
    let next_portfolio_review_slot = null;
    if (nextSlot) {
      const venue = nextSlot.venue_id && venueById[nextSlot.venue_id] ? venueById[nextSlot.venue_id] : null;
      next_portfolio_review_slot = {
        slot_id: nextSlot.id,
        start_datetime: nextSlot.start_datetime,
        end_datetime: nextSlot.end_datetime,
        mentor_name: nextSlot.mentor_name || '',
        discipline: nextSlot.discipline,
        venue_name: venue ? venue.name : ''
      };
    }

    return {
      my_schedule_upcoming_sessions: upcoming,
      my_schedule_total_sessions: mySchedule.session_ids.length,
      favorites_total_sessions: favoritesList.session_ids.length,
      visit_list_total_exhibitors: visitList.exhibitor_ids.length,
      next_portfolio_review_slot
    };
  }

  // getSessionFilterOptions
  getSessionFilterOptions() {
    const sessions = this._getFromStorage('sessions', []);
    const datesSet = new Set();
    for (const s of sessions) {
      const d = this._datePartFromIso(s.start_datetime);
      if (d) datesSet.add(d);
    }
    const date_options = Array.from(datesSet)
      .sort()
      .map(d => ({ date: d, label: this._formatDateLabel(d) }));

    const formatValues = [
      'talk',
      'workshop',
      'panel',
      'networking',
      'meetup',
      'keynote',
      'portfolio_review',
      'other'
    ];
    const format_options = formatValues.map(v => ({ value: v, label: this._formatLabelForFormat(v) }));

    const price_options = [
      {
        value: 'all',
        label: 'All prices',
        min_price: 0,
        max_price: null,
        is_free_only: false
      },
      {
        value: 'free_only',
        label: 'Free events',
        min_price: 0,
        max_price: 0,
        is_free_only: true
      },
      {
        value: 'paid_only',
        label: 'Paid events',
        min_price: 0.01,
        max_price: null,
        is_free_only: false
      }
    ];

    const sort_options = [
      { value: 'start_time_asc', label: 'Start time – earliest first' },
      { value: 'start_time_desc', label: 'Start time – latest first' },
      { value: 'title_asc', label: 'Title A–Z' }
    ];

    return { date_options, format_options, price_options, sort_options };
  }

  // searchSessions(query, filters, sort_by, page, page_size)
  searchSessions(query, filters, sort_by, page, page_size) {
    const q = (query || '').toLowerCase();
    const f = filters || {};
    const sortBy = sort_by || 'start_time_asc';
    const pg = page && page > 0 ? page : 1;
    const size = page_size && page_size > 0 ? page_size : 20;

    const sessions = this._getFromStorage('sessions', []);
    const speakers = this._getFromStorage('speakers', []);
    const venues = this._getFromStorage('venues', []);
    const mySchedule = this._getOrCreateMySchedule();
    const favoritesList = this._getOrCreateFavoritesList();

    const venueById = {};
    for (const v of venues) venueById[v.id] = v;
    const speakerById = {};
    for (const sp of speakers) speakerById[sp.id] = sp;

    let results = sessions.slice();

    if (q) {
      results = results.filter(s => {
        const title = (s.title || '').toLowerCase();
        const desc = (s.description || '').toLowerCase();
        const tags = Array.isArray(s.tags) ? s.tags.join(' ').toLowerCase() : '';
        return title.includes(q) || desc.includes(q) || tags.includes(q);
      });
    }

    if (f.date) {
      results = results.filter(s => this._datePartFromIso(s.start_datetime) === f.date);
    }

    const startMinutes = f.start_time ? this._timeMinutesFromHHMM(f.start_time) : null;
    const endMinutes = f.end_time ? this._timeMinutesFromHHMM(f.end_time) : null;
    if (startMinutes !== null || endMinutes !== null) {
      results = results.filter(s => {
        const sm = this._timeMinutesFromIso(s.start_datetime);
        const em = this._timeMinutesFromIso(s.end_datetime);
        if (sm === null || em === null) return false;
        if (startMinutes !== null && em < startMinutes) return false;
        if (endMinutes !== null && sm > endMinutes) return false;
        return true;
      });
    }

    if (Array.isArray(f.formats) && f.formats.length > 0) {
      const set = new Set(f.formats);
      results = results.filter(s => set.has(s.format));
    }

    if (f.is_free_only) {
      results = results.filter(s => s.is_free || s.price === 0);
    } else {
      if (typeof f.min_price === 'number') {
        results = results.filter(s => typeof s.price === 'number' && s.price >= f.min_price);
      }
      if (typeof f.max_price === 'number') {
        results = results.filter(s => typeof s.price === 'number' && s.price <= f.max_price);
      }
    }

    if (Array.isArray(f.tags) && f.tags.length > 0) {
      const tagSet = new Set(f.tags.map(t => String(t).toLowerCase()));
      results = results.filter(s => {
        if (!Array.isArray(s.tags)) return false;
        const stags = s.tags.map(t => String(t).toLowerCase());
        return stags.some(t => tagSet.has(t));
      });
    }

    results.sort((a, b) => {
      if (sortBy === 'start_time_desc') {
        return (b.start_datetime || '').localeCompare(a.start_datetime || '');
      }
      if (sortBy === 'title_asc') {
        return (a.title || '').localeCompare(b.title || '');
      }
      // default start_time_asc
      return (a.start_datetime || '').localeCompare(b.start_datetime || '');
    });

    const total_results = results.length;
    const startIdx = (pg - 1) * size;
    const pageItems = results.slice(startIdx, startIdx + size);

    const scheduleSet = new Set(mySchedule.session_ids || []);
    const favSet = new Set(favoritesList.session_ids || []);

    const mapped = pageItems.map(s => ({
      session_id: s.id,
      title: s.title,
      slug: s.slug || '',
      description_snippet: (s.description || '').slice(0, 200),
      format: s.format,
      format_label: this._formatLabelForFormat(s.format),
      start_datetime: s.start_datetime,
      end_datetime: s.end_datetime,
      venue_name: s.venue_id && venueById[s.venue_id] ? venueById[s.venue_id].name : '',
      price: typeof s.price === 'number' ? s.price : 0,
      currency: s.currency || 'usd',
      is_free: !!s.is_free,
      tags: Array.isArray(s.tags) ? s.tags : [],
      speaker_names: Array.isArray(s.speaker_ids)
        ? s.speaker_ids
            .map(id => (speakerById[id] ? speakerById[id].name : null))
            .filter(Boolean)
        : [],
      is_in_my_schedule: scheduleSet.has(s.id),
      is_favorited: favSet.has(s.id)
    }));

    return {
      sessions: mapped,
      page: pg,
      page_size: size,
      total_results
    };
  }

  // getSessionDetails(sessionId)
  getSessionDetails(sessionId) {
    const sessions = this._getFromStorage('sessions', []);
    const speakers = this._getFromStorage('speakers', []);
    const venues = this._getFromStorage('venues', []);
    const mySchedule = this._getOrCreateMySchedule();
    const favoritesList = this._getOrCreateFavoritesList();

    const s = sessions.find(x => x.id === sessionId);
    if (!s) return null;

    const venue = s.venue_id ? venues.find(v => v.id === s.venue_id) || null : null;
    const spList = Array.isArray(s.speaker_ids)
      ? s.speaker_ids
          .map(id => speakers.find(sp => sp.id === id) || null)
          .filter(Boolean)
      : [];

    const scheduleSet = new Set(mySchedule.session_ids || []);
    const favSet = new Set(favoritesList.session_ids || []);

    return {
      session_id: s.id,
      title: s.title,
      slug: s.slug || '',
      description: s.description || '',
      format: s.format,
      format_label: this._formatLabelForFormat(s.format),
      start_datetime: s.start_datetime,
      end_datetime: s.end_datetime,
      venue: venue
        ? {
            venue_id: venue.id,
            name: venue.name,
            address: venue.address || '',
            city: venue.city || ''
          }
        : {
            venue_id: '',
            name: '',
            address: '',
            city: ''
          },
      speakers: spList.map(sp => ({
        speaker_id: sp.id,
        name: sp.name,
        role: sp.role || '',
        organization: sp.organization || '',
        photo_url: sp.photo_url || ''
      })),
      price: typeof s.price === 'number' ? s.price : 0,
      currency: s.currency || 'usd',
      is_free: !!s.is_free,
      tags: Array.isArray(s.tags) ? s.tags : [],
      share_url: s.share_url || '',
      is_in_my_schedule: scheduleSet.has(s.id),
      is_favorited: favSet.has(s.id)
    };
  }

  // addSessionToMySchedule(sessionId)
  addSessionToMySchedule(sessionId) {
    const sessions = this._getFromStorage('sessions', []);
    const s = sessions.find(x => x.id === sessionId);
    if (!s) {
      return {
        success: false,
        message: 'Session not found',
        my_schedule_session_ids: [],
        conflicting_sessions: []
      };
    }

    const schedules = this._getFromStorage('schedules', []);
    const mySchedule = this._getOrCreateMySchedule();

    if (!mySchedule.session_ids.includes(sessionId)) {
      mySchedule.session_ids.push(sessionId);
      mySchedule.updated_at = this._nowIso();
      // Save back updated schedule
      const idx = schedules.findIndex(sc => sc.id === mySchedule.id);
      if (idx >= 0) {
        schedules[idx] = mySchedule;
      } else {
        schedules.push(mySchedule);
      }
      this._saveToStorage('schedules', schedules);
    }

    const newStart = new Date(s.start_datetime);
    const newEnd = new Date(s.end_datetime);
    const conflicting_sessions = [];

    for (const existingId of mySchedule.session_ids) {
      if (existingId === sessionId) continue;
      const es = sessions.find(x => x.id === existingId);
      if (!es) continue;
      const esStart = new Date(es.start_datetime);
      const esEnd = new Date(es.end_datetime);
      if (isNaN(newStart.getTime()) || isNaN(newEnd.getTime()) || isNaN(esStart.getTime()) || isNaN(esEnd.getTime())) {
        continue;
      }
      if (newStart < esEnd && newEnd > esStart) {
        conflicting_sessions.push({
          session_id: es.id,
          title: es.title,
          start_datetime: es.start_datetime,
          end_datetime: es.end_datetime
        });
      }
    }

    return {
      success: true,
      message: 'Session added to schedule',
      my_schedule_session_ids: mySchedule.session_ids.slice(),
      conflicting_sessions
    };
  }

  // removeSessionFromMySchedule(sessionId)
  removeSessionFromMySchedule(sessionId) {
    const schedules = this._getFromStorage('schedules', []);
    const mySchedule = this._getOrCreateMySchedule();
    const idxSession = mySchedule.session_ids.indexOf(sessionId);
    if (idxSession >= 0) {
      mySchedule.session_ids.splice(idxSession, 1);
      mySchedule.updated_at = this._nowIso();
    }
    const idx = schedules.findIndex(sc => sc.id === mySchedule.id);
    if (idx >= 0) {
      schedules[idx] = mySchedule;
    } else {
      schedules.push(mySchedule);
    }
    this._saveToStorage('schedules', schedules);

    return {
      success: true,
      message: 'Session removed from schedule',
      my_schedule_session_ids: mySchedule.session_ids.slice()
    };
  }

  // addSessionToFavorites(sessionId)
  addSessionToFavorites(sessionId) {
    const sessions = this._getFromStorage('sessions', []);
    const s = sessions.find(x => x.id === sessionId);
    if (!s) {
      return { success: false, message: 'Session not found', favorites_session_ids: [] };
    }
    const lists = this._getFromStorage('favorites_lists', []);
    const favorites = this._getOrCreateFavoritesList();
    if (!favorites.session_ids.includes(sessionId)) {
      favorites.session_ids.push(sessionId);
      favorites.updated_at = this._nowIso();
      const idx = lists.findIndex(l => l.id === favorites.id);
      if (idx >= 0) lists[idx] = favorites;
      else lists.push(favorites);
      this._saveToStorage('favorites_lists', lists);
    }
    return {
      success: true,
      message: 'Session added to favorites',
      favorites_session_ids: favorites.session_ids.slice()
    };
  }

  // removeSessionFromFavorites(sessionId)
  removeSessionFromFavorites(sessionId) {
    const lists = this._getFromStorage('favorites_lists', []);
    const favorites = this._getOrCreateFavoritesList();
    const idxSession = favorites.session_ids.indexOf(sessionId);
    if (idxSession >= 0) {
      favorites.session_ids.splice(idxSession, 1);
      favorites.updated_at = this._nowIso();
      const idx = lists.findIndex(l => l.id === favorites.id);
      if (idx >= 0) lists[idx] = favorites;
      else lists.push(favorites);
      this._saveToStorage('favorites_lists', lists);
    }
    return {
      success: true,
      message: 'Session removed from favorites',
      favorites_session_ids: favorites.session_ids.slice()
    };
  }

  // copySessionShareLink(sessionId)
  copySessionShareLink(sessionId) {
    const sessions = this._getFromStorage('sessions', []);
    const s = sessions.find(x => x.id === sessionId);
    if (!s) {
      return { success: false, share_url: '', message: 'Session not found' };
    }
    const logs = this._getFromStorage('session_share_logs', []);
    logs.push({
      id: this._generateId('share'),
      session_id: sessionId,
      created_at: this._nowIso()
    });
    this._saveToStorage('session_share_logs', logs);
    return { success: true, share_url: s.share_url || '', message: 'Share link retrieved' };
  }

  // searchSpeakers(query, filters, sort_by, page, page_size)
  searchSpeakers(query, filters, sort_by, page, page_size) {
    const q = (query || '').toLowerCase();
    const f = filters || {};
    const sortBy = sort_by || 'name_asc';
    const pg = page && page > 0 ? page : 1;
    const size = page_size && page_size > 0 ? page_size : 30;

    const speakers = this._getFromStorage('speakers', []);
    const sessions = this._getFromStorage('sessions', []);

    const sessionsById = {};
    for (const s of sessions) sessionsById[s.id] = s;

    let results = speakers.slice();

    if (q) {
      results = results.filter(sp => (sp.name || '').toLowerCase().includes(q));
    }

    if (f.topic_tags && Array.isArray(f.topic_tags) && f.topic_tags.length > 0) {
      const tagSet = new Set(f.topic_tags.map(t => String(t).toLowerCase()));
      results = results.filter(sp => {
        const sids = Array.isArray(sp.session_ids) ? sp.session_ids : [];
        for (const id of sids) {
          const s = sessionsById[id];
          if (!s || !Array.isArray(s.tags)) continue;
          const stags = s.tags.map(t => String(t).toLowerCase());
          if (stags.some(t => tagSet.has(t))) return true;
        }
        return false;
      });
    }

    if (f.speaking_date) {
      const date = f.speaking_date;
      results = results.filter(sp => {
        const sids = Array.isArray(sp.session_ids) ? sp.session_ids : [];
        return sids.some(id => {
          const s = sessionsById[id];
          if (!s) return false;
          return this._datePartFromIso(s.start_datetime) === date;
        });
      });
    }

    if (f.discipline) {
      const disc = String(f.discipline).toLowerCase();
      results = results.filter(sp => {
        const sids = Array.isArray(sp.session_ids) ? sp.session_ids : [];
        return sids.some(id => {
          const s = sessionsById[id];
          if (!s || !Array.isArray(s.tags)) return false;
          return s.tags.map(t => String(t).toLowerCase()).includes(disc);
        });
      });
    }

    if (sortBy === 'name_asc') {
      results.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }

    const total_results = results.length;
    const startIdx = (pg - 1) * size;
    const pageItems = results.slice(startIdx, startIdx + size);

    const mapped = pageItems.map(sp => ({
      speaker_id: sp.id,
      name: sp.name,
      role: sp.role || '',
      organization: sp.organization || '',
      photo_url: sp.photo_url || ''
    }));

    return {
      speakers: mapped,
      page: pg,
      page_size: size,
      total_results
    };
  }

  // getSpeakerFilterOptions
  getSpeakerFilterOptions() {
    const sessions = this._getFromStorage('sessions', []);

    const discipline_values = [
      'ux',
      'interaction_design',
      'visual_design',
      'service_design',
      'research',
      'strategy'
    ];
    const discipline_options = discipline_values.map(v => ({
      value: v,
      label: v.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    }));

    const tagSet = new Set();
    const dateSet = new Set();
    for (const s of sessions) {
      if (Array.isArray(s.tags)) {
        for (const t of s.tags) tagSet.add(String(t));
      }
      const d = this._datePartFromIso(s.start_datetime);
      if (d) dateSet.add(d);
    }

    const topic_options = Array.from(tagSet).map(t => ({
      value: t,
      label: String(t).replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    }));

    const date_options = Array.from(dateSet)
      .sort()
      .map(d => ({ date: d, label: this._formatDateLabel(d) }));

    return { discipline_options, topic_options, date_options };
  }

  // getSpeakerProfile(speakerId)
  getSpeakerProfile(speakerId) {
    const speakers = this._getFromStorage('speakers', []);
    const sessions = this._getFromStorage('sessions', []);
    const venues = this._getFromStorage('venues', []);

    const sp = speakers.find(s => s.id === speakerId);
    if (!sp) return null;

    const sessionsById = {};
    for (const s of sessions) sessionsById[s.id] = s;
    const venueById = {};
    for (const v of venues) venueById[v.id] = v;

    const sessionList = Array.isArray(sp.session_ids) ? sp.session_ids : [];
    const mappedSessions = sessionList
      .map(id => sessionsById[id] || null)
      .filter(Boolean)
      .map(s => ({
        session_id: s.id,
        title: s.title,
        format: s.format,
        format_label: this._formatLabelForFormat(s.format),
        start_datetime: s.start_datetime,
        end_datetime: s.end_datetime,
        venue_name: s.venue_id && venueById[s.venue_id] ? venueById[s.venue_id].name : '',
        is_keynote: s.format === 'keynote'
      }));

    return {
      speaker_id: sp.id,
      name: sp.name,
      first_name: sp.first_name || '',
      last_name: sp.last_name || '',
      role: sp.role || '',
      organization: sp.organization || '',
      bio: sp.bio || '',
      photo_url: sp.photo_url || '',
      social_links: Array.isArray(sp.social_links) ? sp.social_links : [],
      sessions: mappedSessions
    };
  }

  // getTicketFilterOptions
  getTicketFilterOptions() {
    const duration_options = [
      { value: 'single_day', label: 'Single day' },
      { value: 'three_day', label: '3-day pass' },
      { value: 'full_festival', label: 'Full festival' },
      { value: 'workshop_only', label: 'Workshop only' },
      { value: 'other', label: 'Other' }
    ];

    const category_options = [
      { value: 'standard', label: 'Standard' },
      { value: 'student', label: 'Student' },
      { value: 'vip', label: 'VIP' },
      { value: 'other', label: 'Other' }
    ];

    const sort_options = [
      { value: 'price_asc', label: 'Price – Low to High' },
      { value: 'price_desc', label: 'Price – High to Low' },
      { value: 'name_asc', label: 'Name A–Z' }
    ];

    return {
      duration_options,
      category_options,
      sort_options,
      currency: 'usd'
    };
  }

  // listTickets(filters, sort_by)
  listTickets(filters, sort_by) {
    const f = filters || {};
    const sortBy = sort_by || 'price_asc';

    const tickets = this._getFromStorage('tickets', []);
    const tiers = this._getFromStorage('ticket_price_tiers', []);

    const tiersByTicket = {};
    for (const t of tiers) {
      if (!tiersByTicket[t.ticket_id]) tiersByTicket[t.ticket_id] = [];
      tiersByTicket[t.ticket_id].push(t);
    }

    let results = tickets.slice();

    if (Array.isArray(f.duration_types) && f.duration_types.length > 0) {
      const set = new Set(f.duration_types);
      results = results.filter(t => set.has(t.duration_type));
    }

    if (f.duration_label_includes) {
      const q = String(f.duration_label_includes).toLowerCase();
      results = results.filter(t => (t.duration_label || '').toLowerCase().includes(q));
    }

    if (Array.isArray(f.categories) && f.categories.length > 0) {
      const set = new Set(f.categories);
      results = results.filter(t => set.has(t.category));
    }

    if (f.is_active_only) {
      results = results.filter(t => t.is_active);
    }

    const enriched = results.map(t => {
      const ticketTiers = tiersByTicket[t.id] || [];
      let fromPrice = typeof t.base_price === 'number' ? t.base_price : Infinity;
      for (const pt of ticketTiers) {
        if (typeof pt.price === 'number' && pt.price < fromPrice) {
          fromPrice = pt.price;
        }
      }
      if (!isFinite(fromPrice)) fromPrice = 0;
      return { ticket: t, from_price: fromPrice };
    });

    enriched.sort((a, b) => {
      if (sortBy === 'price_desc') {
        return b.from_price - a.from_price;
      }
      if (sortBy === 'name_asc') {
        return (a.ticket.name || '').localeCompare(b.ticket.name || '');
      }
      // default price_asc
      return a.from_price - b.from_price;
    });

    const mapped = enriched.map(e => ({
      ticket_id: e.ticket.id,
      name: e.ticket.name,
      slug: e.ticket.slug || '',
      duration_type: e.ticket.duration_type,
      duration_label: e.ticket.duration_label,
      category: e.ticket.category,
      from_price: e.from_price,
      currency: e.ticket.currency || 'usd',
      is_active: !!e.ticket.is_active
    }));

    return { tickets: mapped };
  }

  // getTicketDetails(ticketId)
  getTicketDetails(ticketId) {
    const tickets = this._getFromStorage('tickets', []);
    const tiers = this._getFromStorage('ticket_price_tiers', []);

    const t = tickets.find(x => x.id === ticketId);
    if (!t) return null;

    const ticketTiers = tiers
      .filter(pt => pt.ticket_id === ticketId)
      .map(pt => ({
        ticket_price_tier_id: pt.id,
        attendee_type: pt.attendee_type,
        label: pt.label,
        price: pt.price,
        currency: pt.currency || 'usd'
      }));

    return {
      ticket_id: t.id,
      name: t.name,
      slug: t.slug || '',
      description: t.description || '',
      duration_type: t.duration_type,
      duration_label: t.duration_label,
      category: t.category,
      base_price: typeof t.base_price === 'number' ? t.base_price : 0,
      currency: t.currency || 'usd',
      is_active: !!t.is_active,
      price_tiers: ticketTiers
    };
  }

  // addTicketToCart(ticketId, attendeeType, quantity)
  addTicketToCart(ticketId, attendeeType, quantity) {
    const qty = quantity && quantity > 0 ? quantity : 1;
    const tickets = this._getFromStorage('tickets', []);
    const tiers = this._getFromStorage('ticket_price_tiers', []);
    const cartItems = this._getFromStorage('cart_items', []);

    const ticket = tickets.find(t => t.id === ticketId);
    if (!ticket) {
      return { success: false, message: 'Ticket not found', cart: null };
    }

    const cart = this._getOrCreateCart();

    const tier = tiers.find(
      pt => pt.ticket_id === ticketId && pt.attendee_type === attendeeType
    ) || null;

    let unitPrice;
    if (tier) {
      unitPrice = typeof tier.price === 'number' ? tier.price : 0;
    } else {
      unitPrice = typeof ticket.base_price === 'number' ? ticket.base_price : 0;
    }

    const cartItem = {
      id: this._generateId('cartitem'),
      cart_id: cart.id,
      ticket_id: ticket.id,
      ticket_price_tier_id: tier ? tier.id : null,
      attendee_type: attendeeType,
      quantity: qty,
      unit_price: unitPrice,
      total_price: unitPrice * qty,
      ticket_name: ticket.name,
      duration_label: ticket.duration_label
    };

    cartItems.push(cartItem);
    this._saveToStorage('cart_items', cartItems);
    const updatedCart = this._recalculateCartTotals(cart.id) || cart;

    const itemsForCart = cartItems
      .filter(ci => ci.cart_id === updatedCart.id)
      .map(ci => ({
        cart_item_id: ci.id,
        ticket_id: ci.ticket_id,
        ticket_name: ci.ticket_name,
        duration_label: ci.duration_label,
        attendee_type: ci.attendee_type,
        quantity: ci.quantity,
        unit_price: ci.unit_price,
        total_price: ci.total_price
      }));

    return {
      success: true,
      message: 'Ticket added to cart',
      cart: {
        cart_id: updatedCart.id,
        status: updatedCart.status,
        currency: updatedCart.currency,
        subtotal: updatedCart.subtotal,
        items: itemsForCart
      }
    };
  }

  // getCart()
  getCart() {
    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items', []);
    const updatedCart = this._recalculateCartTotals(cart.id) || cart;
    const itemsForCart = cartItems
      .filter(ci => ci.cart_id === updatedCart.id)
      .map(ci => ({
        cart_item_id: ci.id,
        ticket_id: ci.ticket_id,
        ticket_name: ci.ticket_name,
        duration_label: ci.duration_label,
        attendee_type: ci.attendee_type,
        quantity: ci.quantity,
        unit_price: ci.unit_price,
        total_price: ci.total_price
      }));

    return {
      cart_id: updatedCart.id,
      status: updatedCart.status,
      currency: updatedCart.currency,
      subtotal: updatedCart.subtotal,
      items: itemsForCart
    };
  }

  // updateCartItemQuantity(cartItemId, quantity)
  updateCartItemQuantity(cartItemId, quantity) {
    const qty = quantity && quantity > 0 ? quantity : 1;
    const cartItems = this._getFromStorage('cart_items', []);
    const carts = this._getFromStorage('carts', []);

    const item = cartItems.find(ci => ci.id === cartItemId);
    if (!item) {
      return { success: false, message: 'Cart item not found', cart: null };
    }

    item.quantity = qty;
    item.total_price = item.unit_price * qty;
    this._saveToStorage('cart_items', cartItems);

    const cart = carts.find(c => c.id === item.cart_id);
    const updatedCart = cart ? this._recalculateCartTotals(cart.id) : null;

    if (!updatedCart) {
      return { success: false, message: 'Cart not found', cart: null };
    }

    const itemsForCart = cartItems
      .filter(ci => ci.cart_id === updatedCart.id)
      .map(ci => ({
        cart_item_id: ci.id,
        ticket_id: ci.ticket_id,
        ticket_name: ci.ticket_name,
        duration_label: ci.duration_label,
        attendee_type: ci.attendee_type,
        quantity: ci.quantity,
        unit_price: ci.unit_price,
        total_price: ci.total_price
      }));

    return {
      success: true,
      message: 'Cart item updated',
      cart: {
        cart_id: updatedCart.id,
        status: updatedCart.status,
        currency: updatedCart.currency,
        subtotal: updatedCart.subtotal,
        items: itemsForCart
      }
    };
  }

  // removeCartItem(cartItemId)
  removeCartItem(cartItemId) {
    let cartItems = this._getFromStorage('cart_items', []);
    const carts = this._getFromStorage('carts', []);

    const item = cartItems.find(ci => ci.id === cartItemId);
    if (!item) {
      return { success: false, message: 'Cart item not found', cart: null };
    }

    const cartId = item.cart_id;
    cartItems = cartItems.filter(ci => ci.id !== cartItemId);
    this._saveToStorage('cart_items', cartItems);

    const cart = carts.find(c => c.id === cartId);
    const updatedCart = cart ? this._recalculateCartTotals(cart.id) : null;

    if (!updatedCart) {
      return { success: false, message: 'Cart not found', cart: null };
    }

    const itemsForCart = cartItems
      .filter(ci => ci.cart_id === updatedCart.id)
      .map(ci => ({
        cart_item_id: ci.id,
        ticket_id: ci.ticket_id,
        ticket_name: ci.ticket_name,
        duration_label: ci.duration_label,
        attendee_type: ci.attendee_type,
        quantity: ci.quantity,
        unit_price: ci.unit_price,
        total_price: ci.total_price
      }));

    return {
      success: true,
      message: 'Cart item removed',
      cart: {
        cart_id: updatedCart.id,
        status: updatedCart.status,
        currency: updatedCart.currency,
        subtotal: updatedCart.subtotal,
        items: itemsForCart
      }
    };
  }

  // getCheckoutSummary()
  getCheckoutSummary() {
    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items', []);
    const updatedCart = this._recalculateCartTotals(cart.id) || cart;

    const itemsForCart = cartItems
      .filter(ci => ci.cart_id === updatedCart.id)
      .map(ci => ({
        cart_item_id: ci.id,
        ticket_name: ci.ticket_name,
        duration_label: ci.duration_label,
        attendee_type: ci.attendee_type,
        quantity: ci.quantity,
        total_price: ci.total_price
      }));

    const delivery_options = [
      {
        value: 'standard_e_ticket',
        label: 'Standard e-ticket',
        description: 'Receive tickets via email.'
      },
      {
        value: 'print_at_home',
        label: 'Print at home',
        description: 'Download PDF tickets to print.'
      },
      {
        value: 'will_call',
        label: 'Will call',
        description: 'Pick up tickets at the venue.'
      }
    ];

    const estimated_total = updatedCart.subtotal || 0;

    return {
      cart: {
        cart_id: updatedCart.id,
        currency: updatedCart.currency,
        subtotal: updatedCart.subtotal,
        items: itemsForCart
      },
      delivery_options,
      estimated_total
    };
  }

  // placeOrder(fullName, email, address, city, postalCode, deliveryOption)
  placeOrder(fullName, email, address, city, postalCode, deliveryOption) {
    const carts = this._getFromStorage('carts', []);
    const cartItems = this._getFromStorage('cart_items', []);
    const orders = this._getFromStorage('orders', []);
    const orderItems = this._getFromStorage('order_items', []);

    const cart = carts.find(c => c.status === 'active') || null;
    if (!cart) {
      return { success: false, message: 'No active cart', order: null };
    }

    const itemsForCart = cartItems.filter(ci => ci.cart_id === cart.id);
    if (itemsForCart.length === 0) {
      return { success: false, message: 'Cart is empty', order: null };
    }

    const updatedCart = this._recalculateCartTotals(cart.id) || cart;
    const totalAmount = updatedCart.subtotal || 0;

    const orderId = this._generateId('order');
    const now = this._nowIso();
    const order_number = 'ORD-' + this._getNextIdCounter();

    const order = {
      id: orderId,
      order_number: order_number,
      cart_id: cart.id,
      created_at: now,
      status: 'paid',
      total_amount: totalAmount,
      currency: updatedCart.currency || 'usd',
      full_name: fullName,
      email: email,
      address: address,
      city: city,
      postal_code: postalCode,
      delivery_option: deliveryOption
    };

    orders.push(order);

    for (const ci of itemsForCart) {
      const oi = {
        id: this._generateId('orderitem'),
        order_id: orderId,
        ticket_id: ci.ticket_id,
        ticket_price_tier_id: ci.ticket_price_tier_id || null,
        attendee_type: ci.attendee_type,
        quantity: ci.quantity,
        unit_price: ci.unit_price,
        total_price: ci.total_price,
        ticket_name: ci.ticket_name,
        duration_label: ci.duration_label
      };
      orderItems.push(oi);
    }

    // Mark cart as checked_out and clear its items
    cart.status = 'checked_out';
    cart.updated_at = now;
    cart.subtotal = 0;

    const remainingCartItems = cartItems.filter(ci => ci.cart_id !== cart.id);

    this._saveToStorage('order_items', orderItems);
    this._saveToStorage('orders', orders);
    this._saveToStorage('cart_items', remainingCartItems);
    this._saveToStorage('carts', carts);
    this._saveToStorage('latest_order_id', orderId);

    const returnItems = itemsForCart.map(ci => ({
      ticket_name: ci.ticket_name,
      duration_label: ci.duration_label,
      attendee_type: ci.attendee_type,
      quantity: ci.quantity,
      unit_price: ci.unit_price,
      total_price: ci.total_price
    }));

    return {
      success: true,
      message: 'Order placed',
      order: {
        order_id: order.id,
        order_number: order.order_number,
        status: order.status,
        created_at: order.created_at,
        total_amount: order.total_amount,
        currency: order.currency,
        full_name: order.full_name,
        email: order.email,
        address: order.address,
        city: order.city,
        postal_code: order.postal_code,
        delivery_option: order.delivery_option,
        items: returnItems
      }
    };
  }

  // getLatestOrder()
  getLatestOrder() {
    const orders = this._getFromStorage('orders', []);
    const orderItems = this._getFromStorage('order_items', []);

    if (orders.length === 0) return null;

    const latestId = this._getFromStorage('latest_order_id', null);
    let order = null;
    if (latestId) {
      order = orders.find(o => o.id === latestId) || null;
    }
    if (!order) {
      orders.sort((a, b) => (a.created_at || '').localeCompare(b.created_at || ''));
      order = orders[orders.length - 1];
    }

    const itemsForOrder = orderItems
      .filter(oi => oi.order_id === order.id)
      .map(oi => ({
        ticket_name: oi.ticket_name,
        duration_label: oi.duration_label,
        attendee_type: oi.attendee_type,
        quantity: oi.quantity,
        unit_price: oi.unit_price,
        total_price: oi.total_price
      }));

    return {
      order_id: order.id,
      order_number: order.order_number,
      status: order.status,
      created_at: order.created_at,
      total_amount: order.total_amount,
      currency: order.currency,
      full_name: order.full_name,
      email: order.email,
      address: order.address,
      city: order.city,
      postal_code: order.postal_code,
      delivery_option: order.delivery_option,
      items: itemsForOrder
    };
  }

  // getMySchedule(date)
  getMySchedule(date) {
    const mySchedule = this._getOrCreateMySchedule();
    const sessions = this._getFromStorage('sessions', []);
    const venues = this._getFromStorage('venues', []);

    const venueById = {};
    for (const v of venues) venueById[v.id] = v;

    const daysMap = {};

    for (const sid of mySchedule.session_ids) {
      const s = sessions.find(x => x.id === sid);
      if (!s) continue;
      const d = this._datePartFromIso(s.start_datetime);
      if (!d) continue;
      if (date && d !== date) continue;
      if (!daysMap[d]) {
        daysMap[d] = {
          date: d,
          label: this._formatDateLabel(d),
          sessions: []
        };
      }
      daysMap[d].sessions.push({
        session_id: s.id,
        title: s.title,
        format_label: this._formatLabelForFormat(s.format),
        start_datetime: s.start_datetime,
        end_datetime: s.end_datetime,
        venue_name: s.venue_id && venueById[s.venue_id] ? venueById[s.venue_id].name : ''
      });
    }

    const days = Object.values(daysMap).sort((a, b) => a.date.localeCompare(b.date));

    for (const dayObj of days) {
      dayObj.sessions.sort((a, b) => (a.start_datetime || '').localeCompare(b.start_datetime || ''));
    }

    return { days };
  }

  // getFavorites(filters, sort_by)
  getFavorites(filters, sort_by) {
    const f = filters || {};
    const sortBy = sort_by || 'start_time_asc';

    const favorites = this._getOrCreateFavoritesList();
    const sessions = this._getFromStorage('sessions', []);
    const venues = this._getFromStorage('venues', []);

    const venueById = {};
    for (const v of venues) venueById[v.id] = v;

    let favSessions = favorites.session_ids
      .map(id => sessions.find(s => s.id === id) || null)
      .filter(Boolean);

    if (f.date) {
      favSessions = favSessions.filter(s => this._datePartFromIso(s.start_datetime) === f.date);
    }

    if (f.format) {
      favSessions = favSessions.filter(s => s.format === f.format);
    }

    if (f.min_start_time) {
      const minMinutes = this._timeMinutesFromHHMM(f.min_start_time);
      if (minMinutes !== null) {
        favSessions = favSessions.filter(s => {
          const sm = this._timeMinutesFromIso(s.start_datetime);
          return sm !== null && sm >= minMinutes;
        });
      }
    }

    favSessions.sort((a, b) => {
      if (sortBy === 'start_time_desc') {
        return (b.start_datetime || '').localeCompare(a.start_datetime || '');
      }
      return (a.start_datetime || '').localeCompare(b.start_datetime || '');
    });

    const mapped = favSessions.map(s => ({
      session_id: s.id,
      title: s.title,
      format_label: this._formatLabelForFormat(s.format),
      start_datetime: s.start_datetime,
      end_datetime: s.end_datetime,
      venue_name: s.venue_id && venueById[s.venue_id] ? venueById[s.venue_id].name : '',
      is_free: !!s.is_free,
      price: typeof s.price === 'number' ? s.price : 0
    }));

    return { sessions: mapped };
  }

  // getPortfolioReviewFilterOptions
  getPortfolioReviewFilterOptions() {
    const slots = this._getFromStorage('portfolio_review_slots', []);

    const dateSet = new Set();
    for (const sl of slots) {
      const d = this._datePartFromIso(sl.start_datetime);
      if (d) dateSet.add(d);
    }

    const date_options = Array.from(dateSet)
      .sort()
      .map(d => ({ date: d, label: this._formatDateLabel(d) }));

    const disciplines = [
      'ux_design',
      'visual_design',
      'product_design',
      'research',
      'other'
    ];
    const discipline_options = disciplines.map(v => ({
      value: v,
      label: v.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    }));

    const sort_options = [
      { value: 'start_time_asc', label: 'Start time – earliest first' },
      { value: 'start_time_desc', label: 'Start time – latest first' }
    ];

    return { date_options, discipline_options, sort_options };
  }

  // searchPortfolioReviewSlots(date, timeRange, discipline, status, sort_by)
  searchPortfolioReviewSlots(date, timeRange, discipline, status, sort_by) {
    const slots = this._getFromStorage('portfolio_review_slots', []);
    const venues = this._getFromStorage('venues', []);

    const venueById = {};
    for (const v of venues) venueById[v.id] = v;

    const st = status || 'available';
    const sortBy = sort_by || 'start_time_asc';

    let results = slots.slice();

    if (date) {
      results = results.filter(sl => this._datePartFromIso(sl.start_datetime) === date);
    }

    if (timeRange && (timeRange.start_time || timeRange.end_time)) {
      const startMinutes = timeRange.start_time ? this._timeMinutesFromHHMM(timeRange.start_time) : null;
      const endMinutes = timeRange.end_time ? this._timeMinutesFromHHMM(timeRange.end_time) : null;
      results = results.filter(sl => {
        const sm = this._timeMinutesFromIso(sl.start_datetime);
        const em = this._timeMinutesFromIso(sl.end_datetime);
        if (sm === null || em === null) return false;
        if (startMinutes !== null && em < startMinutes) return false;
        if (endMinutes !== null && sm > endMinutes) return false;
        return true;
      });
    }

    if (discipline) {
      results = results.filter(sl => sl.discipline === discipline);
    }

    if (st !== 'all') {
      results = results.filter(sl => sl.status === st);
    }

    results.sort((a, b) => {
      if (sortBy === 'start_time_desc') {
        return (b.start_datetime || '').localeCompare(a.start_datetime || '');
      }
      return (a.start_datetime || '').localeCompare(b.start_datetime || '');
    });

    const mapped = results.map(sl => ({
      slot_id: sl.id,
      start_datetime: sl.start_datetime,
      end_datetime: sl.end_datetime,
      venue_name: sl.venue_id && venueById[sl.venue_id] ? venueById[sl.venue_id].name : '',
      mentor_name: sl.mentor_name || '',
      mentor_bio: sl.mentor_bio || '',
      discipline: sl.discipline,
      status: sl.status,
      capacity: typeof sl.capacity === 'number' ? sl.capacity : null
    }));

    return { slots: mapped };
  }

  // registerForPortfolioReviewSlot(slotId, name, email, discipline)
  registerForPortfolioReviewSlot(slotId, name, email, discipline) {
    const slots = this._getFromStorage('portfolio_review_slots', []);
    const regs = this._getFromStorage('portfolio_review_registrations', []);

    const slot = slots.find(sl => sl.id === slotId);
    if (!slot) {
      return { success: false, message: 'Slot not found', registration: null };
    }
    if (slot.status !== 'available') {
      return { success: false, message: 'Slot not available', registration: null };
    }

    const reg = {
      id: this._generateId('prreg'),
      slot_id: slotId,
      name: name,
      email: email,
      discipline: discipline,
      created_at: this._nowIso()
    };

    regs.push(reg);
    slot.status = 'booked';

    this._saveToStorage('portfolio_review_registrations', regs);
    this._saveToStorage('portfolio_review_slots', slots);

    return {
      success: true,
      message: 'Portfolio review slot booked',
      registration: {
        registration_id: reg.id,
        slot_id: reg.slot_id,
        name: reg.name,
        email: reg.email,
        discipline: reg.discipline,
        created_at: reg.created_at
      }
    };
  }

  // getExhibitorFilterOptions
  getExhibitorFilterOptions() {
    const exhibitors = this._getFromStorage('exhibitors', []);

    const categorySet = new Set();
    const industrySet = new Set();

    for (const ex of exhibitors) {
      if (ex.category) categorySet.add(ex.category);
      if (ex.industry) industrySet.add(ex.industry);
    }

    const category_options = Array.from(categorySet).map(c => ({ value: c, label: c }));
    const industry_options = Array.from(industrySet).map(i => ({ value: i, label: i }));

    const rating_threshold_options = [
      { min_rating: 0, label: 'All ratings' },
      { min_rating: 4.0, label: '4.0+ stars' },
      { min_rating: 4.5, label: '4.5+ stars' }
    ];

    const sort_options = [
      { value: 'rating_desc', label: 'Rating – High to Low' },
      { value: 'rating_asc', label: 'Rating – Low to High' },
      { value: 'name_asc', label: 'Name A–Z' }
    ];

    return { category_options, industry_options, rating_threshold_options, sort_options };
  }

  // searchExhibitors(query, filters, sort_by, page, page_size)
  searchExhibitors(query, filters, sort_by, page, page_size) {
    const q = (query || '').toLowerCase();
    const f = filters || {};
    const sortBy = sort_by || 'rating_desc';
    const pg = page && page > 0 ? page : 1;
    const size = page_size && page_size > 0 ? page_size : 30;

    const exhibitors = this._getFromStorage('exhibitors', []);
    const venues = this._getFromStorage('venues', []);
    const visitList = this._getOrCreateVisitList();

    const venueById = {};
    for (const v of venues) venueById[v.id] = v;

    let results = exhibitors.slice();

    if (q) {
      results = results.filter(ex => {
        const name = (ex.name || '').toLowerCase();
        const desc = (ex.description || '').toLowerCase();
        const kw = Array.isArray(ex.keywords) ? ex.keywords.join(' ').toLowerCase() : '';
        return name.includes(q) || desc.includes(q) || kw.includes(q);
      });
    }

    if (Array.isArray(f.categories) && f.categories.length > 0) {
      const set = new Set(f.categories);
      results = results.filter(ex => set.has(ex.category));
    }

    if (Array.isArray(f.industries) && f.industries.length > 0) {
      const set = new Set(f.industries);
      results = results.filter(ex => set.has(ex.industry));
    }

    if (typeof f.min_rating === 'number') {
      results = results.filter(ex => typeof ex.rating === 'number' && ex.rating >= f.min_rating);
    }

    if (f.is_prototyping_tool) {
      results = results.filter(ex => !!ex.is_prototyping_tool);
    }

    results.sort((a, b) => {
      if (sortBy === 'rating_asc') {
        return (a.rating || 0) - (b.rating || 0);
      }
      if (sortBy === 'name_asc') {
        return (a.name || '').localeCompare(b.name || '');
      }
      // default rating_desc
      return (b.rating || 0) - (a.rating || 0);
    });

    const total_results = results.length;
    const startIdx = (pg - 1) * size;
    const pageItems = results.slice(startIdx, startIdx + size);

    const visitSet = new Set(visitList.exhibitor_ids || []);

    const mapped = pageItems.map(ex => ({
      exhibitor_id: ex.id,
      name: ex.name,
      description: ex.description || '',
      category: ex.category || '',
      industry: ex.industry || '',
      rating: typeof ex.rating === 'number' ? ex.rating : 0,
      rating_count: typeof ex.rating_count === 'number' ? ex.rating_count : 0,
      keywords: Array.isArray(ex.keywords) ? ex.keywords : [],
      venue_name: ex.venue_id && venueById[ex.venue_id] ? venueById[ex.venue_id].name : '',
      website_url: ex.website_url || '',
      logo_url: ex.logo_url || '',
      is_prototyping_tool: !!ex.is_prototyping_tool,
      is_in_visit_list: visitSet.has(ex.id)
    }));

    return {
      exhibitors: mapped,
      page: pg,
      page_size: size,
      total_results
    };
  }

  // addExhibitorToVisitList(exhibitorId)
  addExhibitorToVisitList(exhibitorId) {
    const exhibitors = this._getFromStorage('exhibitors', []);
    const ex = exhibitors.find(e => e.id === exhibitorId);
    if (!ex) {
      return { success: false, message: 'Exhibitor not found', visit_list_exhibitor_ids: [] };
    }

    const lists = this._getFromStorage('visit_lists', []);
    const visitList = this._getOrCreateVisitList();

    if (!visitList.exhibitor_ids.includes(exhibitorId)) {
      visitList.exhibitor_ids.push(exhibitorId);
      visitList.updated_at = this._nowIso();
      const idx = lists.findIndex(l => l.id === visitList.id);
      if (idx >= 0) lists[idx] = visitList;
      else lists.push(visitList);
      this._saveToStorage('visit_lists', lists);
    }

    return {
      success: true,
      message: 'Exhibitor added to visit list',
      visit_list_exhibitor_ids: visitList.exhibitor_ids.slice()
    };
  }

  // removeExhibitorFromVisitList(exhibitorId)
  removeExhibitorFromVisitList(exhibitorId) {
    const lists = this._getFromStorage('visit_lists', []);
    const visitList = this._getOrCreateVisitList();

    const idxEx = visitList.exhibitor_ids.indexOf(exhibitorId);
    if (idxEx >= 0) {
      visitList.exhibitor_ids.splice(idxEx, 1);
    }
    if (visitList.notes && visitList.notes[exhibitorId]) {
      delete visitList.notes[exhibitorId];
    }

    visitList.updated_at = this._nowIso();
    const idx = lists.findIndex(l => l.id === visitList.id);
    if (idx >= 0) lists[idx] = visitList;
    else lists.push(visitList);
    this._saveToStorage('visit_lists', lists);

    return {
      success: true,
      message: 'Exhibitor removed from visit list',
      visit_list_exhibitor_ids: visitList.exhibitor_ids.slice()
    };
  }

  // updateVisitListOrder(exhibitorIds)
  updateVisitListOrder(exhibitorIds) {
    const ids = Array.isArray(exhibitorIds) ? exhibitorIds.slice() : [];
    const lists = this._getFromStorage('visit_lists', []);
    const visitList = this._getOrCreateVisitList();

    visitList.exhibitor_ids = ids;
    visitList.updated_at = this._nowIso();

    const idx = lists.findIndex(l => l.id === visitList.id);
    if (idx >= 0) lists[idx] = visitList;
    else lists.push(visitList);
    this._saveToStorage('visit_lists', lists);

    return {
      success: true,
      message: 'Visit list order updated',
      visit_list_exhibitor_ids: visitList.exhibitor_ids.slice()
    };
  }

  // updateVisitNote(exhibitorId, note)
  updateVisitNote(exhibitorId, note) {
    const lists = this._getFromStorage('visit_lists', []);
    const visitList = this._getOrCreateVisitList();

    if (!visitList.notes || typeof visitList.notes !== 'object') {
      visitList.notes = {};
    }
    visitList.notes[exhibitorId] = note;
    visitList.updated_at = this._nowIso();

    const idx = lists.findIndex(l => l.id === visitList.id);
    if (idx >= 0) lists[idx] = visitList;
    else lists.push(visitList);
    this._saveToStorage('visit_lists', lists);

    return {
      success: true,
      message: 'Note updated',
      note: note
    };
  }

  // getVisitList()
  getVisitList() {
    const visitList = this._getOrCreateVisitList();
    const exhibitors = this._getFromStorage('exhibitors', []);
    const venues = this._getFromStorage('venues', []);

    const exhibitorById = {};
    for (const ex of exhibitors) exhibitorById[ex.id] = ex;
    const venueById = {};
    for (const v of venues) venueById[v.id] = v;

    const result = [];
    for (const id of visitList.exhibitor_ids) {
      const ex = exhibitorById[id];
      if (!ex) continue;
      const venue = ex.venue_id && venueById[ex.venue_id] ? venueById[ex.venue_id] : null;
      result.push({
        exhibitor_id: ex.id,
        name: ex.name,
        category: ex.category || '',
        industry: ex.industry || '',
        rating: typeof ex.rating === 'number' ? ex.rating : 0,
        rating_count: typeof ex.rating_count === 'number' ? ex.rating_count : 0,
        venue_name: venue ? venue.name : '',
        website_url: ex.website_url || '',
        logo_url: ex.logo_url || '',
        note: visitList.notes && visitList.notes[ex.id] ? visitList.notes[ex.id] : ''
      });
    }

    return { exhibitors: result };
  }

  // getNewsletterOptions
  getNewsletterOptions() {
    const topic_values = [
      'ux',
      'interaction_design',
      'visual_design',
      'service_design',
      'research',
      'strategy'
    ];
    const topic_options = topic_values.map(v => ({
      value: v,
      label: v.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    }));

    const frequency_values = ['daily', 'weekly', 'monthly', 'event_only'];
    const frequency_options = frequency_values.map(v => ({
      value: v,
      label: v.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    }));

    const default_frequency = 'weekly';

    return { topic_options, frequency_options, default_frequency };
  }

  // subscribeToNewsletter(fullName, email, topics, frequency, consentToUpdates)
  subscribeToNewsletter(fullName, email, topics, frequency, consentToUpdates) {
    const subs = this._getFromStorage('newsletter_subscriptions', []);
    let sub = subs.find(s => s.email === email) || null;
    const now = this._nowIso();

    if (!sub) {
      sub = {
        id: this._generateId('nsub'),
        full_name: fullName || '',
        email: email,
        frequency: frequency,
        consent_to_updates: !!consentToUpdates,
        status: consentToUpdates ? 'subscribed' : 'pending',
        created_at: now,
        updated_at: now
      };
      subs.push(sub);
    } else {
      sub.full_name = fullName || sub.full_name || '';
      sub.email = email;
      sub.frequency = frequency;
      sub.consent_to_updates = !!consentToUpdates;
      sub.status = consentToUpdates ? 'subscribed' : sub.status || 'pending';
      sub.updated_at = now;
    }

    this._saveToStorage('newsletter_subscriptions', subs);

    const allPrefs = this._getFromStorage('newsletter_topic_preferences', []);
    const remainingPrefs = allPrefs.filter(p => p.subscription_id !== sub.id);

    const validTopics = Array.isArray(topics) ? topics : [];
    for (const t of validTopics) {
      const pref = {
        id: this._generateId('ntpref'),
        subscription_id: sub.id,
        topic: t
      };
      remainingPrefs.push(pref);
    }

    this._saveToStorage('newsletter_topic_preferences', remainingPrefs);

    return {
      success: true,
      message: 'Subscription updated',
      subscription: {
        subscription_id: sub.id,
        full_name: sub.full_name,
        email: sub.email,
        frequency: sub.frequency,
        status: sub.status,
        topics: validTopics.slice()
      }
    };
  }

  // getMapVenues(date)
  getMapVenues(date) {
    const venues = this._getFromStorage('venues', []);
    const dateStr = date || null;

    const mapped = venues.map(v => {
      let isActive = false;
      if (Array.isArray(v.active_dates) && v.active_dates.length > 0 && dateStr) {
        const activeDates = v.active_dates.map(d => this._datePartFromIso(String(d)));
        isActive = activeDates.includes(dateStr);
      }
      return {
        venue_id: v.id,
        name: v.name,
        description: v.description || '',
        address: v.address || '',
        city: v.city || '',
        postal_code: v.postal_code || '',
        country: v.country || '',
        latitude: typeof v.latitude === 'number' ? v.latitude : null,
        longitude: typeof v.longitude === 'number' ? v.longitude : null,
        is_main_venue: !!v.is_main_venue,
        is_active_on_date: isActive
      };
    });

    return { venues: mapped };
  }

  // searchVenues(query, date)
  searchVenues(query, date) {
    const q = (query || '').toLowerCase();
    const dateStr = date || null;

    const venues = this._getFromStorage('venues', []);

    const results = venues.filter(v => {
      if (q && !(v.name || '').toLowerCase().includes(q)) return false;
      if (dateStr && Array.isArray(v.active_dates) && v.active_dates.length > 0) {
        const activeDates = v.active_dates.map(d => this._datePartFromIso(String(d)));
        if (!activeDates.includes(dateStr)) return false;
      }
      return true;
    });

    return results.map(v => ({
      venue_id: v.id,
      name: v.name,
      address: v.address || '',
      city: v.city || '',
      latitude: typeof v.latitude === 'number' ? v.latitude : null,
      longitude: typeof v.longitude === 'number' ? v.longitude : null,
      is_active_on_date: dateStr
        ? (Array.isArray(v.active_dates)
            ? v.active_dates
                .map(d => this._datePartFromIso(String(d)))
                .includes(dateStr)
            : false)
        : false
    }));
  }

  // getVenueDetails(venueId)
  getVenueDetails(venueId) {
    const venues = this._getFromStorage('venues', []);
    const sessions = this._getFromStorage('sessions', []);
    const exhibitors = this._getFromStorage('exhibitors', []);

    const v = venues.find(ve => ve.id === venueId);
    if (!v) return null;

    const vSessions = sessions
      .filter(s => s.venue_id === venueId)
      .map(s => ({
        session_id: s.id,
        title: s.title,
        format_label: this._formatLabelForFormat(s.format),
        start_datetime: s.start_datetime,
        end_datetime: s.end_datetime
      }));

    const vExhibitors = exhibitors
      .filter(ex => ex.venue_id === venueId)
      .map(ex => ({
        exhibitor_id: ex.id,
        name: ex.name,
        category: ex.category || '',
        rating: typeof ex.rating === 'number' ? ex.rating : 0
      }));

    return {
      venue_id: v.id,
      name: v.name,
      description: v.description || '',
      address: v.address || '',
      city: v.city || '',
      postal_code: v.postal_code || '',
      country: v.country || '',
      latitude: typeof v.latitude === 'number' ? v.latitude : null,
      longitude: typeof v.longitude === 'number' ? v.longitude : null,
      sessions: vSessions,
      exhibitors: vExhibitors
    };
  }

  // planRoute(startVenueId, endVenueId, date, mode)
  planRoute(startVenueId, endVenueId, date, mode) {
    const venues = this._getFromStorage('venues', []);

    const start = venues.find(v => v.id === startVenueId) || null;
    const end = venues.find(v => v.id === endVenueId) || null;

    if (!start || !end) {
      return {
        route_id: null,
        date: date,
        start_venue: start
          ? { venue_id: start.id, name: start.name, latitude: start.latitude, longitude: start.longitude }
          : null,
        end_venue: end
          ? { venue_id: end.id, name: end.name, latitude: end.latitude, longitude: end.longitude }
          : null,
        mode: mode,
        distance_meters: 0,
        duration_minutes: 0,
        path_points: []
      };
    }

    const dist = this._haversineDistanceMeters(
      start.latitude,
      start.longitude,
      end.latitude,
      end.longitude
    );

    let durationMinutes = 0;
    if (mode === 'walking') {
      const speed = 80; // meters per minute (~4.8 km/h)
      durationMinutes = dist > 0 ? Math.round(dist / speed) : 0;
    } else if (mode === 'cycling') {
      const speed = 250; // ~15 km/h
      durationMinutes = dist > 0 ? Math.round(dist / speed) : 0;
    } else if (mode === 'driving') {
      const speed = 600; // ~36 km/h
      durationMinutes = dist > 0 ? Math.round(dist / speed) : 0;
    } else if (mode === 'transit') {
      const speed = 400; // ~24 km/h
      durationMinutes = dist > 0 ? Math.round(dist / speed) : 0;
    }

    const route = {
      id: this._generateId('route'),
      date: date,
      start_venue_id: start.id,
      end_venue_id: end.id,
      mode: mode,
      distance_meters: dist,
      duration_minutes: durationMinutes,
      path_points: [
        {
          latitude: typeof start.latitude === 'number' ? start.latitude : null,
          longitude: typeof start.longitude === 'number' ? start.longitude : null
        },
        {
          latitude: typeof end.latitude === 'number' ? end.latitude : null,
          longitude: typeof end.longitude === 'number' ? end.longitude : null
        }
      ],
      created_at: this._nowIso()
    };

    this._saveRoute(route);

    return {
      route_id: route.id,
      date: route.date,
      start_venue: {
        venue_id: start.id,
        name: start.name,
        latitude: typeof start.latitude === 'number' ? start.latitude : null,
        longitude: typeof start.longitude === 'number' ? start.longitude : null
      },
      end_venue: {
        venue_id: end.id,
        name: end.name,
        latitude: typeof end.latitude === 'number' ? end.latitude : null,
        longitude: typeof end.longitude === 'number' ? end.longitude : null
      },
      mode: route.mode,
      distance_meters: route.distance_meters,
      duration_minutes: route.duration_minutes,
      path_points: route.path_points
    };
  }

  // getFestivalInfo
  getFestivalInfo() {
    const info = this._getFromStorage('festival_info', {
      mission_html: '',
      organizers: [],
      contact_email: '',
      contact_phone: '',
      policies: []
    });

    return {
      mission_html: info.mission_html || '',
      organizers: Array.isArray(info.organizers) ? info.organizers : [],
      contact_email: info.contact_email || '',
      contact_phone: info.contact_phone || '',
      policies: Array.isArray(info.policies) ? info.policies : []
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
