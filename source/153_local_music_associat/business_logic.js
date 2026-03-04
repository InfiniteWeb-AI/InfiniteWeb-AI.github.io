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

  // -------------------- STORAGE & ID HELPERS --------------------

  _initStorage() {
    const tables = [
      'genres',
      'instruments',
      'venues',
      'events',
      'ticket_types',
      'carts',
      'cart_items',
      'workshops',
      'workshop_registrations',
      'membership_plans',
      'membership_signups',
      'schedules',
      'schedule_items',
      'donation_campaigns',
      'donations',
      'newsletter_subscriptions',
      'artists',
      'favorites',
      'rsvps',
      'contact_requests'
    ];

    for (const key of tables) {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, defaultValue) {
    const data = localStorage.getItem(key);
    if (!data) {
      return typeof defaultValue !== 'undefined' ? defaultValue : [];
    }
    try {
      return JSON.parse(data);
    } catch (e) {
      return typeof defaultValue !== 'undefined' ? defaultValue : [];
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

  // -------------------- GENERIC HELPERS --------------------

  _getCurrentDateTime() {
    return new Date();
  }

  _toDateOnlyString(date) {
    const d = (date instanceof Date) ? date : new Date(date);
    if (Number.isNaN(d.getTime())) return null;
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const da = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${da}`;
  }

  _getDayOfWeekCode(date) {
    const d = (date instanceof Date) ? date : new Date(date);
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return days[d.getDay()];
  }

  _getTimeOfDayCode(date) {
    const d = (date instanceof Date) ? date : new Date(date);
    const h = d.getHours();
    if (h < 12) return 'morning';
    if (h < 17) return 'afternoon';
    return 'evening';
  }

  _minutesOfDayFromISO(isoString) {
    const d = new Date(isoString);
    if (Number.isNaN(d.getTime())) return null;
    return d.getHours() * 60 + d.getMinutes();
  }

  _clampPagination(page, pageSize, totalCount) {
    const safePageSize = pageSize && pageSize > 0 ? pageSize : 20;
    const safePage = page && page > 0 ? page : 1;
    const maxPage = Math.max(1, Math.ceil(totalCount / safePageSize));
    const finalPage = Math.min(safePage, maxPage);
    const start = (finalPage - 1) * safePageSize;
    const end = start + safePageSize;
    return { page: finalPage, pageSize: safePageSize, start, end };
  }

  _resolveVenue(venueId, venuesMap) {
    if (!venueId) return null;
    if (venuesMap && venuesMap[venueId]) return venuesMap[venueId];
    const venues = this._getFromStorage('venues', []);
    return venues.find(v => v.id === venueId) || null;
  }

  _resolveGenres(genreIds) {
    const genres = this._getFromStorage('genres', []);
    if (!Array.isArray(genreIds) || genreIds.length === 0) return [];
    const lookup = new Map(genres.map(g => [g.id, g]));
    return genreIds.map(id => lookup.get(id)).filter(Boolean);
  }

  // -------------------- CART HELPERS --------------------

  _getOrCreateCart() {
    let carts = this._getFromStorage('carts', []);
    let cart = carts.find(c => c.status === 'active');
    if (!cart) {
      cart = {
        id: this._generateId('cart'),
        status: 'active',
        items: [],
        subtotal: 0,
        total_quantity: 0,
        created_at: this._getCurrentDateTime().toISOString(),
        updated_at: null
      };
      carts.push(cart);
      this._saveToStorage('carts', carts);
    }
    return cart;
  }

  _recalculateCartTotals(cart, allCartItems) {
    const itemsForCart = allCartItems.filter(ci => ci.cart_id === cart.id);
    let subtotal = 0;
    let qty = 0;
    const itemIds = [];
    for (const item of itemsForCart) {
      const lineTotal = Number(item.unit_price || 0) * Number(item.quantity || 0);
      item.total_price = lineTotal;
      subtotal += lineTotal;
      qty += item.quantity || 0;
      itemIds.push(item.id);
    }
    cart.subtotal = subtotal;
    cart.total_quantity = qty;
    cart.items = itemIds;
    cart.updated_at = this._getCurrentDateTime().toISOString();
  }

  // -------------------- SCHEDULE HELPERS --------------------

  _getOrCreateSchedule() {
    let schedules = this._getFromStorage('schedules', []);
    let schedule = schedules[0] || null;
    if (!schedule) {
      schedule = {
        id: this._generateId('schedule'),
        name: 'My Schedule',
        created_at: this._getCurrentDateTime().toISOString(),
        updated_at: null
      };
      schedules.push(schedule);
      this._saveToStorage('schedules', schedules);
    }
    return schedule;
  }

  _getScheduleItems(scheduleId) {
    const items = this._getFromStorage('schedule_items', []);
    return items.filter(i => i.schedule_id === scheduleId);
  }

  // -------------------- FAVORITES HELPER --------------------

  _getFavorites() {
    return this._getFromStorage('favorites', []);
  }

  // -------------------- INTERFACES IMPLEMENTATION --------------------

  // 1) getHomePageHighlights()
  getHomePageHighlights() {
    const now = this._getCurrentDateTime();
    const nowISO = now.toISOString();

    const events = this._getFromStorage('events', []);
    const venues = this._getFromStorage('venues', []);
    const workshops = this._getFromStorage('workshops', []);
    const instruments = this._getFromStorage('instruments', []);
    const donationCampaigns = this._getFromStorage('donation_campaigns', []);
    const genres = this._getFromStorage('genres', []);

    const venuesMap = Object.fromEntries(venues.map(v => [v.id, v]));
    const instrumentsMap = Object.fromEntries(instruments.map(i => [i.id, i]));
    const genresMap = Object.fromEntries(genres.map(g => [g.id, g]));

    // Featured events: upcoming, sorted by date asc then rating desc
    const upcomingEvents = events
      .filter(e => {
        if (!e.start_datetime) return false;
        return e.start_datetime >= nowISO;
      })
      .sort((a, b) => {
        const da = new Date(a.start_datetime).getTime();
        const db = new Date(b.start_datetime).getTime();
        if (da !== db) return da - db;
        const ra = a.rating || 0;
        const rb = b.rating || 0;
        return rb - ra;
      })
      .slice(0, 10)
      .map(e => {
        const venue = venuesMap[e.venue_id] || {};
        const gNames = (Array.isArray(e.genre_ids) ? e.genre_ids : [])
          .map(id => (genresMap[id] ? genresMap[id].name : null))
          .filter(Boolean);
        return {
          event_id: e.id,
          title: e.title,
          start_datetime: e.start_datetime,
          end_datetime: e.end_datetime,
          genre_names: gNames,
          event_type: e.event_type,
          audience_categories: e.audience_categories || [],
          venue_name: venue.name || null,
          distance_from_city_center_km: venue.distance_from_city_center_km != null ? venue.distance_from_city_center_km : null,
          min_ticket_price: e.min_ticket_price,
          max_ticket_price: e.max_ticket_price,
          is_free: !!e.is_free,
          rating: e.rating || 0,
          rating_count: e.rating_count || 0,
          tags: e.tags || []
        };
      });

    // Featured workshops: upcoming, sorted by date asc
    const upcomingWorkshops = workshops
      .filter(w => w.start_datetime && w.start_datetime >= nowISO)
      .sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime))
      .slice(0, 10)
      .map(w => {
        const inst = instrumentsMap[w.instrument_id] || {};
        return {
          workshop_id: w.id,
          title: w.title,
          instrument_name: inst.name || null,
          skill_level: w.skill_level,
          start_datetime: w.start_datetime,
          end_datetime: w.end_datetime,
          price: w.price,
          currency: w.currency,
          rating: w.rating || 0,
          rating_count: w.rating_count || 0
        };
      });

    const activeCampaigns = donationCampaigns.filter(c => c.is_active);

    const newsletter_highlight = {
      headline: 'Stay in tune with our latest jazz, rock, and classical events',
      description: 'Subscribe to our newsletter to get weekly updates on concerts, workshops, and community sessions.'
    };

    return {
      featured_events: upcomingEvents,
      featured_workshops: upcomingWorkshops,
      featured_campaigns: activeCampaigns,
      newsletter_highlight
    };
  }

  // 2) searchAllContent(query, contentTypes, limitPerType)
  searchAllContent(query, contentTypes, limitPerType) {
    const q = (query || '').trim().toLowerCase();
    const types = Array.isArray(contentTypes) && contentTypes.length ? contentTypes : ['events', 'workshops', 'artists'];
    const limit = typeof limitPerType === 'number' && limitPerType > 0 ? limitPerType : 5;

    const result = {
      events: [],
      workshops: [],
      artists: []
    };

    if (!q) {
      return result;
    }

    if (types.includes('events')) {
      const events = this._getFromStorage('events', []);
      const venues = this._getFromStorage('venues', []);
      const venuesMap = Object.fromEntries(venues.map(v => [v.id, v]));
      const matched = [];
      for (const e of events) {
        const haystack = ((e.title || '') + ' ' + (e.description || '')).toLowerCase();
        if (haystack.includes(q)) {
          const venue = venuesMap[e.venue_id] || {};
          matched.push({
            event_id: e.id,
            title: e.title,
            start_datetime: e.start_datetime,
            venue_name: venue.name || null,
            min_ticket_price: e.min_ticket_price,
            is_free: !!e.is_free,
            // foreign key resolution
            event: e,
            venue
          });
          if (matched.length >= limit) break;
        }
      }
      result.events = matched;
    }

    if (types.includes('workshops')) {
      const workshops = this._getFromStorage('workshops', []);
      const instruments = this._getFromStorage('instruments', []);
      const instMap = Object.fromEntries(instruments.map(i => [i.id, i]));
      const matched = [];
      for (const w of workshops) {
        const haystack = ((w.title || '') + ' ' + (w.description || '')).toLowerCase();
        if (haystack.includes(q)) {
          const inst = instMap[w.instrument_id] || {};
          matched.push({
            workshop_id: w.id,
            title: w.title,
            instrument_name: inst.name || null,
            start_datetime: w.start_datetime,
            price: w.price,
            currency: w.currency,
            // foreign key resolution
            workshop: w,
            instrument: inst
          });
          if (matched.length >= limit) break;
        }
      }
      result.workshops = matched;
    }

    if (types.includes('artists')) {
      const artists = this._getFromStorage('artists', []);
      const genres = this._getFromStorage('genres', []);
      const genresMap = Object.fromEntries(genres.map(g => [g.id, g]));
      const matched = [];
      for (const a of artists) {
        const haystack = ((a.name || '') + ' ' + (a.biography || '')).toLowerCase();
        if (haystack.includes(q)) {
          const gNames = (Array.isArray(a.genre_ids) ? a.genre_ids : [])
            .map(id => (genresMap[id] ? genresMap[id].name : null))
            .filter(Boolean);
          matched.push({
            artist_id: a.id,
            name: a.name,
            genre_names: gNames,
            rating: a.rating || 0,
            // foreign key resolution
            artist: a
          });
          if (matched.length >= limit) break;
        }
      }
      result.artists = matched;
    }

    return result;
  }

  // 3) getEventFilterOptions()
  getEventFilterOptions() {
    const genres = this._getFromStorage('genres', []);
    const venues = this._getFromStorage('venues', []);
    const events = this._getFromStorage('events', []);

    // audience categories from existing events
    const audienceSet = new Set();
    for (const e of events) {
      if (Array.isArray(e.audience_categories)) {
        for (const a of e.audience_categories) audienceSet.add(a);
      }
    }
    const audience_categories = Array.from(audienceSet).map(code => ({
      code,
      label: code.split('_').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ')
    }));

    const eventTypeEnum = ['concert', 'workshop', 'community_jam', 'family_event', 'other'];
    const event_types = eventTypeEnum.map(code => ({
      code,
      label: code.split('_').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ')
    }));

    const time_of_day_options = [
      { code: 'morning', label: 'Morning' },
      { code: 'afternoon', label: 'Afternoon' },
      { code: 'evening', label: 'Evening' }
    ];

    const dayCodes = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
    const day_of_week_options = dayCodes.map(code => ({
      code,
      label: code.charAt(0).toUpperCase() + code.slice(1)
    }));

    let minPrice = null;
    let maxPrice = null;
    for (const e of events) {
      if (typeof e.min_ticket_price === 'number') {
        if (minPrice === null || e.min_ticket_price < minPrice) minPrice = e.min_ticket_price;
      }
      if (typeof e.max_ticket_price === 'number') {
        if (maxPrice === null || e.max_ticket_price > maxPrice) maxPrice = e.max_ticket_price;
      }
    }
    if (minPrice === null) minPrice = 0;
    if (maxPrice === null) maxPrice = 0;

    const price_range = {
      min: minPrice,
      max: maxPrice,
      currency: 'USD'
    };

    const rating_options = [
      { min_value: 0, label: 'All ratings' },
      { min_value: 3, label: '3+ stars' },
      { min_value: 4, label: '4+ stars' },
      { min_value: 4.5, label: '4.5+ stars' }
    ];

    const distance_options_km = [
      { value: 1, label: 'Within 1 km' },
      { value: 5, label: 'Within 5 km' },
      { value: 10, label: 'Within 10 km' },
      { value: 25, label: 'Within 25 km' }
    ];

    const sort_options = [
      { code: 'price_asc', label: 'Price: Low to High' },
      { code: 'price_desc', label: 'Price: High to Low' },
      { code: 'date_asc', label: 'Date: Soonest First' },
      { code: 'date_desc', label: 'Date: Latest First' },
      { code: 'rating_desc', label: 'Rating: High to Low' },
      { code: 'title_asc', label: 'Title A-Z' }
    ];

    return {
      genres,
      venues,
      audience_categories,
      event_types,
      time_of_day_options,
      day_of_week_options,
      price_range,
      rating_options,
      distance_options_km,
      sort_options
    };
  }

  // 4) searchEvents(filters, sort, page, pageSize)
  searchEvents(filters, sort, page, pageSize) {
    filters = filters || {};
    sort = sort || {};

    const events = this._getFromStorage('events', []);
    const venues = this._getFromStorage('venues', []);
    const genres = this._getFromStorage('genres', []);
    const venuesMap = Object.fromEntries(venues.map(v => [v.id, v]));
    const genresMap = Object.fromEntries(genres.map(g => [g.id, g]));

    const schedule = this._getOrCreateSchedule();
    const scheduleItems = this._getScheduleItems(schedule.id);
    const scheduledIds = new Set(scheduleItems.map(si => si.event_id));

    const now = this._getCurrentDateTime();

    const filtered = events.filter(e => {
      // query
      if (filters.query) {
        const q = String(filters.query).toLowerCase();
        const text = ((e.title || '') + ' ' + (e.description || '')).toLowerCase();
        if (!text.includes(q)) return false;
      }

      // genreIds
      if (Array.isArray(filters.genreIds) && filters.genreIds.length) {
        const eventGenres = Array.isArray(e.genre_ids) ? e.genre_ids : [];
        if (!eventGenres.some(gid => filters.genreIds.indexOf(gid) !== -1)) return false;
      }

      // eventTypes
      if (Array.isArray(filters.eventTypes) && filters.eventTypes.length) {
        if (!filters.eventTypes.includes(e.event_type)) return false;
      }

      // audienceCategories
      if (Array.isArray(filters.audienceCategories) && filters.audienceCategories.length) {
        const aud = Array.isArray(e.audience_categories) ? e.audience_categories : [];
        if (!aud.some(ac => filters.audienceCategories.indexOf(ac) !== -1)) return false;
      }

      // date range (based on start date only)
      if (filters.startDate) {
        const startDateOnly = this._toDateOnlyString(e.start_datetime);
        if (startDateOnly < filters.startDate) return false;
      }
      if (filters.endDate) {
        const startDateOnly = this._toDateOnlyString(e.start_datetime);
        if (startDateOnly > filters.endDate) return false;
      }

      // price range
      if (typeof filters.minPrice === 'number') {
        if (e.max_ticket_price < filters.minPrice) return false;
      }
      if (typeof filters.maxPrice === 'number') {
        if (e.min_ticket_price > filters.maxPrice) return false;
      }

      // isFree
      if (typeof filters.isFree === 'boolean') {
        if (filters.isFree && !e.is_free) return false;
        if (!filters.isFree && e.is_free) {
          // if explicitly looking for non-free only and event is free
          // this branch is only used if someone passes false; spec doesn't, so ignore
        }
      }

      // minRating
      if (typeof filters.minRating === 'number') {
        const rating = typeof e.rating === 'number' ? e.rating : 0;
        if (rating < filters.minRating) return false;
      }

      // venueIds
      if (Array.isArray(filters.venueIds) && filters.venueIds.length) {
        if (!filters.venueIds.includes(e.venue_id)) return false;
      }

      // maxDistanceKm
      if (typeof filters.maxDistanceKm === 'number') {
        const venue = venuesMap[e.venue_id];
        if (!venue) return false;
        const dist = typeof venue.distance_from_city_center_km === 'number' ? venue.distance_from_city_center_km : Infinity;
        if (dist > filters.maxDistanceKm) return false;
      }

      // dayOfWeek
      if (Array.isArray(filters.dayOfWeek) && filters.dayOfWeek.length) {
        const dayCode = this._getDayOfWeekCode(e.start_datetime);
        if (!filters.dayOfWeek.includes(dayCode)) return false;
      }

      // timeOfDay
      if (Array.isArray(filters.timeOfDay) && filters.timeOfDay.length) {
        const tod = this._getTimeOfDayCode(e.start_datetime);
        if (!filters.timeOfDay.includes(tod)) return false;
      }

      // latestEndTime (HH:MM)
      if (filters.latestEndTime) {
        const maxMinutes = (() => {
          const parts = String(filters.latestEndTime).split(':');
          if (parts.length !== 2) return null;
          const h = parseInt(parts[0], 10);
          const m = parseInt(parts[1], 10);
          if (Number.isNaN(h) || Number.isNaN(m)) return null;
          return h * 60 + m;
        })();
        const endMinutes = this._minutesOfDayFromISO(e.end_datetime);
        if (maxMinutes != null && endMinutes != null && endMinutes > maxMinutes) return false;
      }

      // hasUpcomingEventsWithinDays
      if (typeof filters.hasUpcomingEventsWithinDays === 'number') {
        if (!e.start_datetime) return false;
        const start = new Date(e.start_datetime);
        const diffMs = start.getTime() - now.getTime();
        const diffDays = diffMs / (1000 * 60 * 60 * 24);
        if (diffDays < 0 || diffDays > filters.hasUpcomingEventsWithinDays) return false;
      }

      return true;
    });

    // sorting
    let items = filtered.slice();
    const sortBy = sort.sortBy || 'date';
    const sortDir = (sort.sortDirection || (sortBy === 'rating' ? 'desc' : 'asc')).toLowerCase();
    const dir = sortDir === 'desc' ? -1 : 1;

    items.sort((a, b) => {
      if (sortBy === 'price') {
        const pa = a.min_ticket_price || 0;
        const pb = b.min_ticket_price || 0;
        if (pa === pb) return 0;
        return pa < pb ? -1 * dir : 1 * dir;
      }
      if (sortBy === 'rating') {
        const ra = a.rating || 0;
        const rb = b.rating || 0;
        if (ra === rb) return 0;
        return ra < rb ? -1 * dir : 1 * dir;
      }
      if (sortBy === 'title') {
        const ta = (a.title || '').toLowerCase();
        const tb = (b.title || '').toLowerCase();
        if (ta === tb) return 0;
        return ta < tb ? -1 * dir : 1 * dir;
      }
      // default date
      const da = new Date(a.start_datetime).getTime();
      const db = new Date(b.start_datetime).getTime();
      if (da === db) return 0;
      return da < db ? -1 * dir : 1 * dir;
    });

    const totalCount = items.length;
    const pg = this._clampPagination(page, pageSize, totalCount);
    const slice = items.slice(pg.start, pg.end);

    const mapped = slice.map(e => {
      const venue = venuesMap[e.venue_id] || {};
      const gObjs = (Array.isArray(e.genre_ids) ? e.genre_ids : [])
        .map(id => genresMap[id])
        .filter(Boolean);
      return {
        event_id: e.id,
        title: e.title,
        description_excerpt: (e.description || '').slice(0, 200),
        event_type: e.event_type,
        audience_categories: e.audience_categories || [],
        start_datetime: e.start_datetime,
        end_datetime: e.end_datetime,
        min_ticket_price: e.min_ticket_price,
        max_ticket_price: e.max_ticket_price,
        is_free: !!e.is_free,
        rating: e.rating || 0,
        rating_count: e.rating_count || 0,
        tags: e.tags || [],
        venue: {
          venue_id: venue.id || null,
          name: venue.name || null,
          address: venue.address || null,
          city: venue.city || null,
          distance_from_city_center_km: venue.distance_from_city_center_km != null ? venue.distance_from_city_center_km : null,
          is_main_hall: !!venue.is_main_hall
        },
        genres: gObjs.map(g => ({ genre_id: g.id, name: g.name })),
        is_in_my_schedule: scheduledIds.has(e.id),
        // foreign key resolution
        event: e
      };
    });

    return {
      totalCount,
      page: pg.page,
      pageSize: pg.pageSize,
      items: mapped
    };
  }

  // 5) getEventDetail(eventId)
  getEventDetail(eventId) {
    const events = this._getFromStorage('events', []);
    const venues = this._getFromStorage('venues', []);
    const ticketTypes = this._getFromStorage('ticket_types', []);
    const genres = this._getFromStorage('genres', []);
    const artists = this._getFromStorage('artists', []);

    const event = events.find(e => e.id === eventId) || null;

    if (!event) {
      return {
        event: null,
        ticket_types: [],
        schedule_state: { is_in_my_schedule: false },
        rsvp_options: {
          is_rsvp_available: false,
          requires_instrument: false,
          max_attendees_per_rsvp: null
        }
      };
    }

    const venue = venues.find(v => v.id === event.venue_id) || null;
    const genreObjs = this._resolveGenres(event.genre_ids || []);
    const artistObjs = (Array.isArray(event.artist_ids) ? event.artist_ids : [])
      .map(id => artists.find(a => a.id === id))
      .filter(Boolean);

    const schedule = this._getOrCreateSchedule();
    const scheduleItems = this._getScheduleItems(schedule.id);
    const isInSchedule = scheduleItems.some(si => si.event_id === event.id);

    const ttForEvent = ticketTypes.filter(tt => tt.event_id === event.id).map(tt => ({
      ticket_type_id: tt.id,
      name: tt.name,
      description: tt.description || '',
      category: tt.category,
      price: tt.price,
      currency: tt.currency,
      is_default: !!tt.is_default,
      max_per_order: tt.max_per_order != null ? tt.max_per_order : null,
      remaining_quantity: tt.remaining_quantity != null ? tt.remaining_quantity : null,
      // foreign key resolution
      ticket_type: tt
    }));

    const isJam = event.event_type === 'community_jam';
    const is_rsvp_available = isJam && !!event.is_free;

    return {
      event: {
        id: event.id,
        title: event.title,
        description: event.description || '',
        event_type: event.event_type,
        audience_categories: event.audience_categories || [],
        genre_names: genreObjs.map(g => g.name),
        start_datetime: event.start_datetime,
        end_datetime: event.end_datetime,
        is_free: !!event.is_free,
        min_ticket_price: event.min_ticket_price,
        max_ticket_price: event.max_ticket_price,
        rating: event.rating || 0,
        rating_count: event.rating_count || 0,
        tags: event.tags || [],
        venue: venue ? {
          id: venue.id,
          name: venue.name,
          address: venue.address || null,
          city: venue.city || null,
          postal_code: venue.postal_code || null,
          distance_from_city_center_km: venue.distance_from_city_center_km != null ? venue.distance_from_city_center_km : null,
          capacity: venue.capacity != null ? venue.capacity : null,
          is_main_hall: !!venue.is_main_hall
        } : null,
        artists: artistObjs.map(a => ({ artist_id: a.id, name: a.name })),
        // foreign key resolution
        raw_event: event
      },
      ticket_types: ttForEvent,
      schedule_state: {
        is_in_my_schedule: isInSchedule
      },
      rsvp_options: {
        is_rsvp_available,
        requires_instrument: isJam,
        max_attendees_per_rsvp: null
      }
    };
  }

  // 6) addTicketsToCart(eventId, ticketSelections)
  addTicketsToCart(eventId, ticketSelections) {
    ticketSelections = Array.isArray(ticketSelections) ? ticketSelections : [];

    const events = this._getFromStorage('events', []);
    const ticketTypes = this._getFromStorage('ticket_types', []);
    const venues = this._getFromStorage('venues', []);
    const event = events.find(e => e.id === eventId);
    if (!event) {
      return { success: false, message: 'Event not found', cart: null };
    }
    const venue = venues.find(v => v.id === event.venue_id) || {};

    let carts = this._getFromStorage('carts', []);
    let cartItems = this._getFromStorage('cart_items', []);
    let cart = this._getOrCreateCart();

    for (const sel of ticketSelections) {
      if (!sel || !sel.ticketTypeId || !sel.quantity) continue;
      const tt = ticketTypes.find(t => t.id === sel.ticketTypeId && t.event_id === eventId);
      if (!tt) continue;

      let existing = cartItems.find(ci => ci.cart_id === cart.id && ci.ticket_type_id === tt.id);
      if (existing) {
        existing.quantity += sel.quantity;
      } else {
        existing = {
          id: this._generateId('cart_item'),
          cart_id: cart.id,
          event_id: event.id,
          event_title: event.title,
          event_start_datetime: event.start_datetime,
          venue_name: venue.name || null,
          ticket_type_id: tt.id,
          ticket_type_name: tt.name,
          unit_price: tt.price,
          quantity: sel.quantity,
          total_price: tt.price * sel.quantity
        };
        cartItems.push(existing);
      }
    }

    // Recalculate totals
    carts = this._getFromStorage('carts', []);
    cart = carts.find(c => c.id === cart.id) || cart;
    this._recalculateCartTotals(cart, cartItems);

    // Save back
    const cartIndex = carts.findIndex(c => c.id === cart.id);
    if (cartIndex >= 0) {
      carts[cartIndex] = cart;
    } else {
      carts.push(cart);
    }
    this._saveToStorage('carts', carts);
    this._saveToStorage('cart_items', cartItems);

    // Build response cart structure with foreign key resolution
    const cartItemsForCart = cartItems.filter(ci => ci.cart_id === cart.id);
    const responseItems = cartItemsForCart.map(ci => {
      const tt = ticketTypes.find(t => t.id === ci.ticket_type_id) || null;
      const ev = events.find(e => e.id === ci.event_id) || null;
      const v = ev ? venues.find(vv => vv.id === ev.venue_id) || null : null;
      return {
        cart_item_id: ci.id,
        event_id: ci.event_id,
        event_title: ci.event_title,
        event_start_datetime: ci.event_start_datetime,
        venue_name: ci.venue_name,
        ticket_type_id: ci.ticket_type_id,
        ticket_type_name: ci.ticket_type_name,
        unit_price: ci.unit_price,
        quantity: ci.quantity,
        total_price: ci.total_price,
        // foreign key resolution
        event: ev,
        ticket_type: tt,
        venue: v
      };
    });

    return {
      success: true,
      message: 'Tickets added to cart',
      cart: {
        cart_id: cart.id,
        status: cart.status,
        subtotal: cart.subtotal,
        total_quantity: cart.total_quantity,
        items: responseItems
      }
    };
  }

  // 7) getCartSummary()
  getCartSummary() {
    const carts = this._getFromStorage('carts', []);
    const cartItems = this._getFromStorage('cart_items', []);
    const events = this._getFromStorage('events', []);
    const venues = this._getFromStorage('venues', []);
    const ticketTypes = this._getFromStorage('ticket_types', []);

    const cart = carts.find(c => c.status === 'active');
    if (!cart) {
      return { cart_exists: false, cart: null };
    }

    const itemsForCart = cartItems.filter(ci => ci.cart_id === cart.id);
    const responseItems = itemsForCart.map(ci => {
      const ev = events.find(e => e.id === ci.event_id) || null;
      const tt = ticketTypes.find(t => t.id === ci.ticket_type_id) || null;
      const v = ev ? venues.find(vv => vv.id === ev.venue_id) || null : null;
      return {
        cart_item_id: ci.id,
        event_id: ci.event_id,
        event_title: ci.event_title,
        event_start_datetime: ci.event_start_datetime,
        venue_name: ci.venue_name,
        ticket_type_id: ci.ticket_type_id,
        ticket_type_name: ci.ticket_type_name,
        unit_price: ci.unit_price,
        quantity: ci.quantity,
        total_price: ci.total_price,
        // foreign key resolution
        event: ev,
        ticket_type: tt,
        venue: v
      };
    });

    return {
      cart_exists: true,
      cart: {
        cart_id: cart.id,
        status: cart.status,
        subtotal: cart.subtotal,
        total_quantity: cart.total_quantity,
        items: responseItems
      }
    };
  }

  // 8) updateCartItemQuantity(cartItemId, quantity)
  updateCartItemQuantity(cartItemId, quantity) {
    quantity = Number(quantity);
    let carts = this._getFromStorage('carts', []);
    let cartItems = this._getFromStorage('cart_items', []);

    const ciIndex = cartItems.findIndex(ci => ci.id === cartItemId);
    if (ciIndex === -1) {
      return { success: false, message: 'Cart item not found', cart: null };
    }
    const item = cartItems[ciIndex];
    const cart = carts.find(c => c.id === item.cart_id);
    if (!cart) {
      return { success: false, message: 'Associated cart not found', cart: null };
    }

    if (quantity <= 0) {
      cartItems.splice(ciIndex, 1);
    } else {
      item.quantity = quantity;
      item.total_price = item.unit_price * quantity;
      cartItems[ciIndex] = item;
    }

    this._recalculateCartTotals(cart, cartItems);

    const cartIndex = carts.findIndex(c => c.id === cart.id);
    if (cartIndex >= 0) carts[cartIndex] = cart;

    this._saveToStorage('carts', carts);
    this._saveToStorage('cart_items', cartItems);

    const itemsForCart = cartItems.filter(ci => ci.cart_id === cart.id);

    return {
      success: true,
      message: 'Cart updated',
      cart: {
        cart_id: cart.id,
        status: cart.status,
        subtotal: cart.subtotal,
        total_quantity: cart.total_quantity,
        items: itemsForCart.map(ci => ({
          cart_item_id: ci.id,
          event_id: ci.event_id,
          event_title: ci.event_title,
          ticket_type_name: ci.ticket_type_name,
          unit_price: ci.unit_price,
          quantity: ci.quantity,
          total_price: ci.total_price
        }))
      }
    };
  }

  // 9) removeCartItem(cartItemId)
  removeCartItem(cartItemId) {
    let carts = this._getFromStorage('carts', []);
    let cartItems = this._getFromStorage('cart_items', []);

    const ciIndex = cartItems.findIndex(ci => ci.id === cartItemId);
    if (ciIndex === -1) {
      return { success: false, message: 'Cart item not found', cart: null };
    }
    const item = cartItems[ciIndex];
    const cart = carts.find(c => c.id === item.cart_id);
    if (!cart) {
      return { success: false, message: 'Associated cart not found', cart: null };
    }

    cartItems.splice(ciIndex, 1);
    this._recalculateCartTotals(cart, cartItems);

    const cartIndex = carts.findIndex(c => c.id === cart.id);
    if (cartIndex >= 0) carts[cartIndex] = cart;

    this._saveToStorage('carts', carts);
    this._saveToStorage('cart_items', cartItems);

    const itemsForCart = cartItems.filter(ci => ci.cart_id === cart.id);

    return {
      success: true,
      message: 'Item removed from cart',
      cart: {
        cart_id: cart.id,
        status: cart.status,
        subtotal: cart.subtotal,
        total_quantity: cart.total_quantity,
        items: itemsForCart.map(ci => ({
          cart_item_id: ci.id,
          event_id: ci.event_id,
          event_title: ci.event_title,
          ticket_type_name: ci.ticket_type_name,
          unit_price: ci.unit_price,
          quantity: ci.quantity,
          total_price: ci.total_price
        }))
      }
    };
  }

  // 10) getWorkshopFilterOptions()
  getWorkshopFilterOptions() {
    const instruments = this._getFromStorage('instruments', []);
    const venues = this._getFromStorage('venues', []);
    const workshops = this._getFromStorage('workshops', []);

    let minPrice = null;
    let maxPrice = null;
    let currency = 'USD';
    for (const w of workshops) {
      if (typeof w.price === 'number') {
        if (minPrice === null || w.price < minPrice) minPrice = w.price;
        if (maxPrice === null || w.price > maxPrice) maxPrice = w.price;
      }
      if (w.currency) currency = w.currency;
    }
    if (minPrice === null) minPrice = 0;
    if (maxPrice === null) maxPrice = 0;

    const skillLevels = ['beginner', 'intermediate', 'advanced', 'all_levels'];
    const skill_levels = skillLevels.map(code => ({
      code,
      label: code.split('_').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ')
    }));

    const dayCodes = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
    const day_of_week_options = dayCodes.map(code => ({
      code,
      label: code.charAt(0).toUpperCase() + code.slice(1)
    }));

    const time_of_day_options = [
      { code: 'morning', label: 'Morning' },
      { code: 'afternoon', label: 'Afternoon' },
      { code: 'evening', label: 'Evening' },
      { code: 'full_day', label: 'Full day' },
      { code: 'other', label: 'Other' }
    ];

    const price_range = { min: minPrice, max: maxPrice, currency };

    const rating_options = [
      { min_value: 0, label: 'All ratings' },
      { min_value: 3, label: '3+ stars' },
      { min_value: 4, label: '4+ stars' }
    ];

    const sort_options = [
      { code: 'date_asc', label: 'Date: Soonest First' },
      { code: 'date_desc', label: 'Date: Latest First' },
      { code: 'price_asc', label: 'Price: Low to High' },
      { code: 'price_desc', label: 'Price: High to Low' },
      { code: 'rating_desc', label: 'Rating: High to Low' }
    ];

    return {
      instruments,
      venues,
      skill_levels,
      day_of_week_options,
      time_of_day_options,
      price_range,
      rating_options,
      sort_options
    };
  }

  // 11) searchWorkshops(filters, sort, page, pageSize)
  searchWorkshops(filters, sort, page, pageSize) {
    filters = filters || {};
    sort = sort || {};

    const workshops = this._getFromStorage('workshops', []);
    const instruments = this._getFromStorage('instruments', []);
    const venues = this._getFromStorage('venues', []);

    const instMap = Object.fromEntries(instruments.map(i => [i.id, i]));
    const venueMap = Object.fromEntries(venues.map(v => [v.id, v]));

    const filtered = workshops.filter(w => {
      // query
      if (filters.query) {
        const q = String(filters.query).toLowerCase();
        const text = ((w.title || '') + ' ' + (w.description || '')).toLowerCase();
        if (!text.includes(q)) return false;
      }

      // instrumentIds
      if (Array.isArray(filters.instrumentIds) && filters.instrumentIds.length) {
        if (!filters.instrumentIds.includes(w.instrument_id)) return false;
      }

      // skillLevels
      if (Array.isArray(filters.skillLevels) && filters.skillLevels.length) {
        if (!filters.skillLevels.includes(w.skill_level)) return false;
      }

      // dayOfWeek
      if (Array.isArray(filters.dayOfWeek) && filters.dayOfWeek.length) {
        if (!filters.dayOfWeek.includes(w.day_of_week)) return false;
      }

      // timeOfDay
      if (Array.isArray(filters.timeOfDay) && filters.timeOfDay.length) {
        if (!filters.timeOfDay.includes(w.time_of_day)) return false;
      }

      // date range
      if (filters.startDate) {
        const d = this._toDateOnlyString(w.start_datetime);
        if (d < filters.startDate) return false;
      }
      if (filters.endDate) {
        const d = this._toDateOnlyString(w.start_datetime);
        if (d > filters.endDate) return false;
      }

      // price
      if (typeof filters.minPrice === 'number') {
        if (w.price < filters.minPrice) return false;
      }
      if (typeof filters.maxPrice === 'number') {
        if (w.price > filters.maxPrice) return false;
      }

      // rating
      if (typeof filters.minRating === 'number') {
        const rating = typeof w.rating === 'number' ? w.rating : 0;
        if (rating < filters.minRating) return false;
      }

      // venueIds
      if (Array.isArray(filters.venueIds) && filters.venueIds.length) {
        if (!filters.venueIds.includes(w.venue_id)) return false;
      }

      return true;
    });

    const sortBy = sort.sortBy || 'date';
    const sortDir = (sort.sortDirection || (sortBy === 'rating' ? 'desc' : 'asc')).toLowerCase();
    const dir = sortDir === 'desc' ? -1 : 1;

    const itemsSorted = filtered.slice().sort((a, b) => {
      if (sortBy === 'price') {
        if (a.price === b.price) return 0;
        return a.price < b.price ? -1 * dir : 1 * dir;
      }
      if (sortBy === 'rating') {
        const ra = a.rating || 0;
        const rb = b.rating || 0;
        if (ra === rb) return 0;
        return ra < rb ? -1 * dir : 1 * dir;
      }
      // default: date
      const da = new Date(a.start_datetime).getTime();
      const db = new Date(b.start_datetime).getTime();
      if (da === db) return 0;
      return da < db ? -1 * dir : 1 * dir;
    });

    const totalCount = itemsSorted.length;
    const pg = this._clampPagination(page, pageSize, totalCount);
    const slice = itemsSorted.slice(pg.start, pg.end);

    const mapped = slice.map(w => {
      const inst = instMap[w.instrument_id] || {};
      const v = venueMap[w.venue_id] || {};
      return {
        workshop_id: w.id,
        title: w.title,
        description_excerpt: (w.description || '').slice(0, 200),
        instrument_name: inst.name || null,
        skill_level: w.skill_level,
        start_datetime: w.start_datetime,
        end_datetime: w.end_datetime,
        day_of_week: w.day_of_week,
        time_of_day: w.time_of_day,
        price: w.price,
        currency: w.currency,
        rating: w.rating || 0,
        rating_count: w.rating_count || 0,
        capacity: w.capacity != null ? w.capacity : null,
        remaining_spots: w.remaining_spots != null ? w.remaining_spots : null,
        venue: {
          venue_id: v.id || null,
          name: v.name || null,
          city: v.city || null
        },
        // foreign key resolution
        workshop: w,
        instrument: inst
      };
    });

    return {
      totalCount,
      page: pg.page,
      pageSize: pg.pageSize,
      items: mapped
    };
  }

  // 12) getWorkshopDetail(workshopId)
  getWorkshopDetail(workshopId) {
    const workshops = this._getFromStorage('workshops', []);
    const instruments = this._getFromStorage('instruments', []);
    const venues = this._getFromStorage('venues', []);

    const workshop = workshops.find(w => w.id === workshopId) || null;
    if (!workshop) {
      return { workshop: null };
    }

    const inst = instruments.find(i => i.id === workshop.instrument_id) || null;
    const venue = venues.find(v => v.id === workshop.venue_id) || null;

    return {
      workshop: {
        id: workshop.id,
        title: workshop.title,
        description: workshop.description || '',
        instrument: inst ? { id: inst.id, name: inst.name } : null,
        skill_level: workshop.skill_level,
        start_datetime: workshop.start_datetime,
        end_datetime: workshop.end_datetime,
        day_of_week: workshop.day_of_week,
        time_of_day: workshop.time_of_day,
        price: workshop.price,
        currency: workshop.currency,
        rating: workshop.rating || 0,
        rating_count: workshop.rating_count || 0,
        capacity: workshop.capacity != null ? workshop.capacity : null,
        remaining_spots: workshop.remaining_spots != null ? workshop.remaining_spots : null,
        venue: venue ? {
          id: venue.id,
          name: venue.name,
          address: venue.address || null,
          city: venue.city || null,
          postal_code: venue.postal_code || null
        } : null,
        // foreign key resolution
        raw_workshop: workshop
      }
    };
  }

  // 13) registerForWorkshop(workshopId, firstName, lastName, email, paymentMethod)
  registerForWorkshop(workshopId, firstName, lastName, email, paymentMethod) {
    const workshops = this._getFromStorage('workshops', []);
    const workshop = workshops.find(w => w.id === workshopId);
    if (!workshop) {
      return { success: false, message: 'Workshop not found', registration: null };
    }

    const registrations = this._getFromStorage('workshop_registrations', []);
    const reg = {
      id: this._generateId('workshop_reg'),
      workshop_id: workshopId,
      first_name: firstName,
      last_name: lastName,
      email: email,
      payment_method: paymentMethod,
      status: 'pending',
      created_at: this._getCurrentDateTime().toISOString()
    };
    registrations.push(reg);
    this._saveToStorage('workshop_registrations', registrations);

    return {
      success: true,
      message: 'Workshop registration submitted',
      registration: {
        id: reg.id,
        workshop_id: reg.workshop_id,
        first_name: reg.first_name,
        last_name: reg.last_name,
        email: reg.email,
        payment_method: reg.payment_method,
        status: reg.status,
        created_at: reg.created_at,
        // foreign key resolution
        workshop
      }
    };
  }

  // 14) getMembershipPlans()
  getMembershipPlans() {
    const plans = this._getFromStorage('membership_plans', []).filter(p => p.status === 'active');
    const recommended = plans.find(p => p.is_default) || null;
    return {
      plans,
      recommended_plan_id: recommended ? recommended.id : null
    };
  }

  // 15) getMembershipPlanDetails(planId)
  getMembershipPlanDetails(planId) {
    const plans = this._getFromStorage('membership_plans', []);
    const plan = plans.find(p => p.id === planId) || null;
    const activePlans = plans.filter(p => p.status === 'active');
    return {
      plan,
      all_plans_for_comparison: activePlans
    };
  }

  // 16) submitMembershipSignup(planId, firstName, lastName, email, phone, communicationPreference)
  submitMembershipSignup(planId, firstName, lastName, email, phone, communicationPreference) {
    const plans = this._getFromStorage('membership_plans', []);
    const plan = plans.find(p => p.id === planId);
    if (!plan) {
      return { success: false, message: 'Membership plan not found', membership_signup: null };
    }

    const signups = this._getFromStorage('membership_signups', []);
    const signup = {
      id: this._generateId('membership_signup'),
      membership_plan_id: planId,
      plan_name: plan.name,
      first_name: firstName,
      last_name: lastName,
      email: email,
      phone: phone,
      communication_preference: communicationPreference,
      status: 'pending',
      created_at: this._getCurrentDateTime().toISOString()
    };
    signups.push(signup);
    this._saveToStorage('membership_signups', signups);

    return {
      success: true,
      message: 'Membership signup submitted',
      membership_signup: {
        id: signup.id,
        membership_plan_id: signup.membership_plan_id,
        plan_name: signup.plan_name,
        first_name: signup.first_name,
        last_name: signup.last_name,
        email: signup.email,
        phone: signup.phone,
        communication_preference: signup.communication_preference,
        status: signup.status,
        created_at: signup.created_at,
        // foreign key resolution
        membership_plan: plan
      }
    };
  }

  // 17) getCalendarEvents(startDate, endDate, filters, includeScheduleState)
  getCalendarEvents(startDate, endDate, filters, includeScheduleState) {
    filters = filters || {};
    const events = this._getFromStorage('events', []);
    const venues = this._getFromStorage('venues', []);
    const genres = this._getFromStorage('genres', []);

    const venuesMap = Object.fromEntries(venues.map(v => [v.id, v]));
    const genresMap = Object.fromEntries(genres.map(g => [g.id, g]));

    let scheduledIds = new Set();
    if (includeScheduleState !== false) {
      const schedule = this._getOrCreateSchedule();
      const scheduleItems = this._getScheduleItems(schedule.id);
      scheduledIds = new Set(scheduleItems.map(si => si.event_id));
    }

    const items = events.filter(e => {
      const start = this._toDateOnlyString(e.start_datetime);
      if (!start) return false;
      if (start < startDate || start > endDate) return false;

      // genreIds
      if (Array.isArray(filters.genreIds) && filters.genreIds.length) {
        const eventGenres = Array.isArray(e.genre_ids) ? e.genre_ids : [];
        if (!eventGenres.some(gid => filters.genreIds.indexOf(gid) !== -1)) return false;
      }

      // venueIds
      if (Array.isArray(filters.venueIds) && filters.venueIds.length) {
        if (!filters.venueIds.includes(e.venue_id)) return false;
      }

      // maxDistanceKm
      if (typeof filters.maxDistanceKm === 'number') {
        const v = venuesMap[e.venue_id];
        if (!v) return false;
        const dist = typeof v.distance_from_city_center_km === 'number' ? v.distance_from_city_center_km : Infinity;
        if (dist > filters.maxDistanceKm) return false;
      }

      // eventTypes
      if (Array.isArray(filters.eventTypes) && filters.eventTypes.length) {
        if (!filters.eventTypes.includes(e.event_type)) return false;
      }

      // audienceCategories
      if (Array.isArray(filters.audienceCategories) && filters.audienceCategories.length) {
        const aud = Array.isArray(e.audience_categories) ? e.audience_categories : [];
        if (!aud.some(ac => filters.audienceCategories.indexOf(ac) !== -1)) return false;
      }

      return true;
    }).map(e => {
      const v = venuesMap[e.venue_id] || {};
      const gNames = (Array.isArray(e.genre_ids) ? e.genre_ids : [])
        .map(id => genresMap[id])
        .filter(Boolean)
        .map(g => g.name);
      return {
        event_id: e.id,
        title: e.title,
        start_datetime: e.start_datetime,
        end_datetime: e.end_datetime,
        event_type: e.event_type,
        venue: {
          venue_id: v.id || null,
          name: v.name || null,
          distance_from_city_center_km: v.distance_from_city_center_km != null ? v.distance_from_city_center_km : null
        },
        genre_names: gNames,
        is_in_my_schedule: includeScheduleState === false ? false : scheduledIds.has(e.id),
        // foreign key resolution
        event: e
      };
    });

    return { items };
  }

  // 18) addEventToSchedule(eventId)
  addEventToSchedule(eventId) {
    const events = this._getFromStorage('events', []);
    const venues = this._getFromStorage('venues', []);

    const event = events.find(e => e.id === eventId);
    if (!event) {
      return { success: false, message: 'Event not found', schedule: null, schedule_item: null };
    }

    const schedule = this._getOrCreateSchedule();
    const allItems = this._getFromStorage('schedule_items', []);
    const existing = allItems.find(si => si.schedule_id === schedule.id && si.event_id === eventId);
    if (existing) {
      return {
        success: true,
        message: 'Event already in schedule',
        schedule: {
          schedule_id: schedule.id,
          name: schedule.name,
          items_count: allItems.filter(si => si.schedule_id === schedule.id).length
        },
        schedule_item: existing
      };
    }

    const venue = venues.find(v => v.id === event.venue_id) || {};
    const item = {
      id: this._generateId('schedule_item'),
      schedule_id: schedule.id,
      event_id: event.id,
      event_title: event.title,
      event_start_datetime: event.start_datetime,
      venue_name: venue.name || null,
      added_at: this._getCurrentDateTime().toISOString()
    };

    allItems.push(item);
    schedule.updated_at = this._getCurrentDateTime().toISOString();

    const schedules = this._getFromStorage('schedules', []);
    const idx = schedules.findIndex(s => s.id === schedule.id);
    if (idx >= 0) schedules[idx] = schedule; else schedules.push(schedule);

    this._saveToStorage('schedule_items', allItems);
    this._saveToStorage('schedules', schedules);

    return {
      success: true,
      message: 'Event added to schedule',
      schedule: {
        schedule_id: schedule.id,
        name: schedule.name,
        items_count: allItems.filter(si => si.schedule_id === schedule.id).length
      },
      schedule_item: item
    };
  }

  // 19) removeEventFromSchedule(eventId)
  removeEventFromSchedule(eventId) {
    const schedule = this._getOrCreateSchedule();
    const allItems = this._getFromStorage('schedule_items', []);
    const remaining = allItems.filter(si => !(si.schedule_id === schedule.id && si.event_id === eventId));

    const removedCount = allItems.length - remaining.length;
    if (removedCount > 0) {
      schedule.updated_at = this._getCurrentDateTime().toISOString();
      const schedules = this._getFromStorage('schedules', []);
      const idx = schedules.findIndex(s => s.id === schedule.id);
      if (idx >= 0) schedules[idx] = schedule; else schedules.push(schedule);
      this._saveToStorage('schedules', schedules);
      this._saveToStorage('schedule_items', remaining);
    }

    return {
      success: true,
      message: removedCount > 0 ? 'Event removed from schedule' : 'Event not in schedule',
      schedule: {
        schedule_id: schedule.id,
        name: schedule.name,
        items_count: remaining.filter(si => si.schedule_id === schedule.id).length
      }
    };
  }

  // 20) getMySchedule()
  getMySchedule() {
    // Instrumentation for task completion tracking
    try {
      localStorage.setItem('task4_openedMySchedule', 'true');
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    const schedules = this._getFromStorage('schedules', []);
    const schedule = schedules[0] || null;
    if (!schedule) {
      return {
        schedule_exists: false,
        schedule: null,
        items_by_date: []
      };
    }

    const scheduleItems = this._getFromStorage('schedule_items', []).filter(si => si.schedule_id === schedule.id);
    const events = this._getFromStorage('events', []);
    const venues = this._getFromStorage('venues', []);

    const eventsMap = Object.fromEntries(events.map(e => [e.id, e]));
    const venuesMap = Object.fromEntries(venues.map(v => [v.id, v]));

    const byDate = {};
    for (const si of scheduleItems) {
      const ev = eventsMap[si.event_id] || null;
      const dateKey = this._toDateOnlyString(si.event_start_datetime || (ev ? ev.start_datetime : null));
      if (!dateKey) continue;
      if (!byDate[dateKey]) {
        byDate[dateKey] = [];
      }
      const v = ev ? venuesMap[ev.venue_id] || {} : {};
      byDate[dateKey].push({
        schedule_item_id: si.id,
        event_id: si.event_id,
        event_title: si.event_title,
        event_start_datetime: si.event_start_datetime,
        venue_name: v.name || si.venue_name || null,
        address: v.address || null,
        city: v.city || null,
        postal_code: v.postal_code || null,
        distance_from_city_center_km: v.distance_from_city_center_km != null ? v.distance_from_city_center_km : null,
        // foreign key resolution
        event: ev,
        venue: v
      });
    }

    const items_by_date = Object.keys(byDate)
      .sort()
      .map(date => ({ date, events: byDate[date] }));

    return {
      schedule_exists: true,
      schedule: {
        schedule_id: schedule.id,
        name: schedule.name,
        created_at: schedule.created_at,
        updated_at: schedule.updated_at
      },
      items_by_date
    };
  }

  // 21) getDonationCampaigns()
  getDonationCampaigns() {
    const campaigns = this._getFromStorage('donation_campaigns', []);
    return { campaigns };
  }

  // 22) getDonationCampaignDetails(campaignId)
  getDonationCampaignDetails(campaignId) {
    const campaigns = this._getFromStorage('donation_campaigns', []);
    const campaign = campaigns.find(c => c.id === campaignId) || null;

    // Suggested amounts and ranges are configuration-level, not domain data.
    // Provide generic values if not present elsewhere.
    const suggested_amounts = [10, 25, 50];
    const minimum_amount = 1;
    const maximum_amount = 10000;
    const supports_monthly = true;
    const currency = 'USD';

    return {
      campaign,
      suggested_amounts,
      minimum_amount,
      maximum_amount,
      supports_monthly,
      currency
    };
  }

  // 23) submitDonation(campaignId, donationType, amount, currency, paymentMethod, cardName, cardNumber, cardExpiryMonth, cardExpiryYear, cardCvv, billingPostalCode)
  submitDonation(campaignId, donationType, amount, currency, paymentMethod, cardName, cardNumber, cardExpiryMonth, cardExpiryYear, cardCvv, billingPostalCode) {
    const campaigns = this._getFromStorage('donation_campaigns', []);
    const campaign = campaigns.find(c => c.id === campaignId);
    if (!campaign) {
      return { success: false, message: 'Donation campaign not found', donation: null };
    }

    const donations = this._getFromStorage('donations', []);
    const nowISO = this._getCurrentDateTime().toISOString();

    const donation = {
      id: this._generateId('donation'),
      campaign_id: campaignId,
      campaign_name: campaign.name,
      donation_type: donationType,
      amount: amount,
      currency: currency || 'USD',
      payment_method: paymentMethod,
      card_name: paymentMethod === 'onsite_card' ? cardName || '' : null,
      card_number: paymentMethod === 'onsite_card' ? cardNumber || '' : null,
      card_expiry_month: paymentMethod === 'onsite_card' ? cardExpiryMonth || '' : null,
      card_expiry_year: paymentMethod === 'onsite_card' ? cardExpiryYear || '' : null,
      card_cvv: paymentMethod === 'onsite_card' ? cardCvv || '' : null,
      billing_postal_code: billingPostalCode || null,
      created_at: nowISO,
      status: 'succeeded'
    };

    donations.push(donation);
    this._saveToStorage('donations', donations);

    // update amount_raised if tracked
    if (typeof campaign.amount_raised === 'number') {
      campaign.amount_raised += amount;
    } else {
      campaign.amount_raised = amount;
    }
    const idx = campaigns.findIndex(c => c.id === campaignId);
    if (idx >= 0) campaigns[idx] = campaign;
    this._saveToStorage('donation_campaigns', campaigns);

    return {
      success: true,
      message: 'Donation submitted',
      donation: {
        id: donation.id,
        campaign_id: donation.campaign_id,
        campaign_name: donation.campaign_name,
        donation_type: donation.donation_type,
        amount: donation.amount,
        currency: donation.currency,
        payment_method: donation.payment_method,
        status: donation.status,
        created_at: donation.created_at,
        // foreign key resolution
        campaign
      }
    };
  }

  // 24) getNewsletterPreferencesOptions()
  getNewsletterPreferencesOptions() {
    const genres = this._getFromStorage('genres', []);
    const eventTypes = ['concert', 'workshop', 'community_jam', 'family_event', 'other'];
    const event_types = eventTypes.map(code => ({
      code,
      label: code.split('_').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ')
    }));

    const frequencies = [
      { code: 'daily', label: 'Daily' },
      { code: 'weekly', label: 'Weekly' },
      { code: 'monthly', label: 'Monthly' }
    ];

    return {
      genres,
      event_types,
      frequencies
    };
  }

  // 25) subscribeToNewsletter(email, firstName, lastName, preferredGenreIds, preferredEventTypes, frequency, consentGiven)
  subscribeToNewsletter(email, firstName, lastName, preferredGenreIds, preferredEventTypes, frequency, consentGiven) {
    if (!email) {
      return { success: false, message: 'Email is required', subscription: null };
    }
    if (!consentGiven) {
      return { success: false, message: 'Consent is required', subscription: null };
    }

    const subs = this._getFromStorage('newsletter_subscriptions', []);
    const sub = {
      id: this._generateId('newsletter_sub'),
      email,
      first_name: firstName || null,
      last_name: lastName || null,
      preferred_genre_ids: Array.isArray(preferredGenreIds) ? preferredGenreIds : [],
      preferred_event_types: Array.isArray(preferredEventTypes) ? preferredEventTypes : [],
      frequency: frequency,
      consent_given: !!consentGiven,
      created_at: this._getCurrentDateTime().toISOString(),
      status: 'active'
    };

    subs.push(sub);
    this._saveToStorage('newsletter_subscriptions', subs);

    return {
      success: true,
      message: 'Subscribed to newsletter',
      subscription: sub
    };
  }

  // 26) getArtistFilterOptions()
  getArtistFilterOptions() {
    const genres = this._getFromStorage('genres', []);

    const rating_options = [
      { min_value: 0, label: 'All ratings' },
      { min_value: 3, label: '3+ stars' },
      { min_value: 4, label: '4+ stars' }
    ];

    const upcoming_show_windows = [
      { code: 'next_7_days', days: 7, label: 'Next 7 days' },
      { code: 'next_30_days', days: 30, label: 'Next 30 days' }
    ];

    const sort_options = [
      { code: 'rating_desc', label: 'Rating: High to Low' },
      { code: 'name_asc', label: 'Name A-Z' },
      { code: 'next_show_date_asc', label: 'Next Show: Soonest First' }
    ];

    return {
      genres,
      rating_options,
      upcoming_show_windows,
      sort_options
    };
  }

  // 27) searchArtists(filters, sort, page, pageSize)
  searchArtists(filters, sort, page, pageSize) {
    filters = filters || {};
    sort = sort || {};

    const artists = this._getFromStorage('artists', []);
    const genres = this._getFromStorage('genres', []);
    const genresMap = Object.fromEntries(genres.map(g => [g.id, g]));
    const now = this._getCurrentDateTime();

    const filtered = artists.filter(a => {
      // query
      if (filters.query) {
        const q = String(filters.query).toLowerCase();
        const text = ((a.name || '') + ' ' + (a.biography || '')).toLowerCase();
        if (!text.includes(q)) return false;
      }

      // genreIds
      if (Array.isArray(filters.genreIds) && filters.genreIds.length) {
        const ag = Array.isArray(a.genre_ids) ? a.genre_ids : [];
        if (!ag.some(id => filters.genreIds.indexOf(id) !== -1)) return false;
      }

      // minRating
      if (typeof filters.minRating === 'number') {
        const rating = typeof a.rating === 'number' ? a.rating : 0;
        if (rating < filters.minRating) return false;
      }

      // hasUpcomingEventsWithinDays
      if (typeof filters.hasUpcomingEventsWithinDays === 'number') {
        if (!a.next_show_date) return false;
        const d = new Date(a.next_show_date);
        const diffDays = (d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
        if (diffDays < 0 || diffDays > filters.hasUpcomingEventsWithinDays) return false;
      }

      return true;
    });

    const sortBy = sort.sortBy || 'rating';
    const sortDir = (sort.sortDirection || (sortBy === 'rating' ? 'desc' : 'asc')).toLowerCase();
    const dir = sortDir === 'desc' ? -1 : 1;

    const itemsSorted = filtered.slice().sort((a, b) => {
      if (sortBy === 'name') {
        const na = (a.name || '').toLowerCase();
        const nb = (b.name || '').toLowerCase();
        if (na === nb) return 0;
        return na < nb ? -1 * dir : 1 * dir;
      }
      if (sortBy === 'next_show_date') {
        const da = a.next_show_date ? new Date(a.next_show_date).getTime() : Infinity;
        const db = b.next_show_date ? new Date(b.next_show_date).getTime() : Infinity;
        if (da === db) return 0;
        return da < db ? -1 * dir : 1 * dir;
      }
      if (sortBy === 'rating') {
        const ra = a.rating || 0;
        const rb = b.rating || 0;
        if (ra === rb) return 0;
        return ra < rb ? -1 * dir : 1 * dir;
      }
      // fallback to rating
      const ra = a.rating || 0;
      const rb = b.rating || 0;
      if (ra === rb) return 0;
      return ra < rb ? -1 * dir : 1 * dir;
    });

    const totalCount = itemsSorted.length;
    const pg = this._clampPagination(page, pageSize, totalCount);
    const slice = itemsSorted.slice(pg.start, pg.end);

    const mapped = slice.map(a => {
      const gNames = (Array.isArray(a.genre_ids) ? a.genre_ids : [])
        .map(id => genresMap[id])
        .filter(Boolean)
        .map(g => g.name);

      let hasUpcomingWithinWindow = false;
      const windowDays = typeof filters.hasUpcomingEventsWithinDays === 'number' ? filters.hasUpcomingEventsWithinDays : 30;
      if (a.next_show_date) {
        const d = new Date(a.next_show_date);
        const diffDays = (d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
        hasUpcomingWithinWindow = diffDays >= 0 && diffDays <= windowDays;
      }

      return {
        artist_id: a.id,
        name: a.name,
        biography_excerpt: (a.biography || '').slice(0, 200),
        genre_names: gNames,
        rating: a.rating || 0,
        rating_count: a.rating_count || 0,
        next_show_date: a.next_show_date || null,
        has_upcoming_events_within_window: hasUpcomingWithinWindow,
        // foreign key resolution
        artist: a
      };
    });

    return {
      totalCount,
      page: pg.page,
      pageSize: pg.pageSize,
      items: mapped
    };
  }

  // 28) getArtistDetail(artistId)
  getArtistDetail(artistId) {
    const artists = this._getFromStorage('artists', []);
    const events = this._getFromStorage('events', []);
    const venues = this._getFromStorage('venues', []);
    const genres = this._getFromStorage('genres', []);
    const favorites = this._getFromStorage('favorites', []);

    const artist = artists.find(a => a.id === artistId) || null;
    if (!artist) {
      return { artist: null, upcoming_events: [], is_favorite: false };
    }

    const genresMap = Object.fromEntries(genres.map(g => [g.id, g]));
    const genre_names = (Array.isArray(artist.genre_ids) ? artist.genre_ids : [])
      .map(id => genresMap[id])
      .filter(Boolean)
      .map(g => g.name);

    const upcomingEvents = (Array.isArray(artist.upcoming_event_ids) ? artist.upcoming_event_ids : [])
      .map(id => events.find(e => e.id === id))
      .filter(Boolean)
      .map(e => {
        const v = venues.find(vv => vv.id === e.venue_id) || {};
        return {
          event_id: e.id,
          title: e.title,
          start_datetime: e.start_datetime,
          venue_name: v.name || null,
          // foreign key resolution
          event: e,
          venue: v
        };
      });

    const is_favorite = favorites.some(f => f.artist_id === artistId);

    return {
      artist: {
        id: artist.id,
        name: artist.name,
        biography: artist.biography || '',
        genre_names,
        rating: artist.rating || 0,
        rating_count: artist.rating_count || 0,
        image_url: artist.image_url || null,
        next_show_date: artist.next_show_date || null,
        // foreign key resolution
        raw_artist: artist
      },
      upcoming_events: upcomingEvents,
      is_favorite
    };
  }

  // 29) addFavoriteArtist(artistId)
  addFavoriteArtist(artistId) {
    const artists = this._getFromStorage('artists', []);
    const artist = artists.find(a => a.id === artistId);
    if (!artist) {
      return { success: false, message: 'Artist not found', favorite: null, favorites_count: 0 };
    }

    const favorites = this._getFromStorage('favorites', []);
    let favorite = favorites.find(f => f.artist_id === artistId);
    if (!favorite) {
      favorite = {
        id: this._generateId('favorite'),
        artist_id: artistId,
        added_at: this._getCurrentDateTime().toISOString()
      };
      favorites.push(favorite);
      this._saveToStorage('favorites', favorites);
    }

    return {
      success: true,
      message: 'Artist added to favorites',
      favorite: {
        favorite_id: favorite.id,
        artist_id: favorite.artist_id,
        added_at: favorite.added_at,
        // foreign key resolution
        artist
      },
      favorites_count: favorites.length
    };
  }

  // 30) removeFavoriteArtist(artistId)
  removeFavoriteArtist(artistId) {
    const favorites = this._getFromStorage('favorites', []);
    const remaining = favorites.filter(f => f.artist_id !== artistId);
    this._saveToStorage('favorites', remaining);
    return {
      success: true,
      message: 'Artist removed from favorites',
      favorites_count: remaining.length
    };
  }

  // 31) getFavoriteArtists()
  getFavoriteArtists() {
    const favorites = this._getFromStorage('favorites', []);
    const artists = this._getFromStorage('artists', []);
    const genres = this._getFromStorage('genres', []);
    const genresMap = Object.fromEntries(genres.map(g => [g.id, g]));
    const now = this._getCurrentDateTime();

    const items = favorites.map(f => {
      const artist = artists.find(a => a.id === f.artist_id) || {};
      const gNames = (Array.isArray(artist.genre_ids) ? artist.genre_ids : [])
        .map(id => genresMap[id])
        .filter(Boolean)
        .map(g => g.name);
      let hasUpcomingWithin30 = false;
      if (artist.next_show_date) {
        const d = new Date(artist.next_show_date);
        const diffDays = (d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
        hasUpcomingWithin30 = diffDays >= 0 && diffDays <= 30;
      }
      return {
        favorite_id: f.id,
        artist_id: f.artist_id,
        artist_name: artist.name || null,
        genre_names: gNames,
        rating: artist.rating || 0,
        rating_count: artist.rating_count || 0,
        next_show_date: artist.next_show_date || null,
        has_upcoming_within_30_days: hasUpcomingWithin30,
        // foreign key resolution
        artist
      };
    });

    // Instrumentation for task completion tracking
    try {
      localStorage.setItem('task8_openedFavorites', 'true');
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      totalCount: items.length,
      items
    };
  }

  // 32) submitEventRSVP(eventId, name, email, attendeeCount, instrumentId, instrumentOther)
  submitEventRSVP(eventId, name, email, attendeeCount, instrumentId, instrumentOther) {
    const events = this._getFromStorage('events', []);
    const instruments = this._getFromStorage('instruments', []);
    const event = events.find(e => e.id === eventId);
    if (!event) {
      return { success: false, message: 'Event not found', rsvp: null };
    }

    const rsvps = this._getFromStorage('rsvps', []);
    const rsvp = {
      id: this._generateId('rsvp'),
      event_id: eventId,
      event_title: event.title,
      name,
      email,
      attendee_count: attendeeCount,
      instrument_id: instrumentId || null,
      instrument_other: instrumentOther || null,
      status: 'pending',
      created_at: this._getCurrentDateTime().toISOString()
    };

    rsvps.push(rsvp);
    this._saveToStorage('rsvps', rsvps);

    const instrument = instrumentId ? instruments.find(i => i.id === instrumentId) || null : null;

    return {
      success: true,
      message: 'RSVP submitted',
      rsvp: {
        id: rsvp.id,
        event_id: rsvp.event_id,
        event_title: rsvp.event_title,
        name: rsvp.name,
        email: rsvp.email,
        attendee_count: rsvp.attendee_count,
        instrument_id: rsvp.instrument_id,
        instrument_other: rsvp.instrument_other,
        status: rsvp.status,
        created_at: rsvp.created_at,
        // foreign key resolution
        event,
        instrument
      }
    };
  }

  // 33) submitContactForm(name, email, topic, subject, message)
  submitContactForm(name, email, topic, subject, message) {
    const requests = this._getFromStorage('contact_requests', []);
    const ticketId = this._generateId('contact');
    const createdAt = this._getCurrentDateTime().toISOString();

    const record = {
      id: ticketId,
      name,
      email,
      topic,
      subject,
      message,
      created_at: createdAt
    };

    requests.push(record);
    this._saveToStorage('contact_requests', requests);

    return {
      success: true,
      message: 'Contact request submitted',
      ticket_id: ticketId,
      estimated_response_time_hours: 24
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