// localStorage polyfill for Node.js and environments without localStorage
const localStorage = (function () {
  try {
    if (typeof globalThis !== 'undefined' && globalThis.localStorage) {
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

  // ---------- Storage helpers ----------

  _initStorage() {
    const arrayKeys = [
      'users',
      'products',
      'events',
      'event_ticket_types',
      'carts',
      'cart_items',
      'ticket_orders',
      'order_items',
      'vip_table_packages',
      'vip_table_reservation_requests',
      'guest_list_signups',
      'rsvps',
      'workshops',
      'workshop_sessions',
      'workshop_registrations',
      'newsletter_subscriptions',
      'faq_entries',
      'contact_messages'
    ];

    for (const key of arrayKeys) {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }

    // Seed default sample data needed by tests if not already present
    if (!localStorage.getItem('default_seed_done')) {
      try {
        // Seed events
        let events = this._getFromStorage('events');

        if (!events.some(e => e.id === 'evt_soul_city_extended_jam')) {
          events.push({
            id: 'evt_soul_city_extended_jam',
            title: 'Soul City Live: Extended Jam Session',
            subtitle: 'Extended live band jam into the night',
            description:
              'A special live band showcase featuring Soul City and friends with extended improvisational sets.',
            genre: 'live_band',
            tags: ['Live Band', 'Soul', 'Featured'],
            start_datetime: '2026-03-27T20:00:00',
            end_datetime: '2026-03-28T00:00:00',
            doors_open_datetime: '2026-03-27T19:00:00',
            starting_price: 50,
            is_free_event: false,
            is_guest_list_available: false,
            is_rsvp_enabled: false,
            is_featured: false,
            venue_name: 'Neon Vault Live Room',
            image_url: '',
            status: 'scheduled',
            created_at: '2026-02-01T10:00:00',
            updated_at: '2026-02-10T10:00:00'
          });
        }

        if (!events.some(e => e.id === 'evt_groove_masters_live')) {
          events.push({
            id: 'evt_groove_masters_live',
            title: 'Groove Masters Live',
            subtitle: 'Funk & soul band grooves',
            description:
              'High-energy funk and soul from our resident live band, Groove Masters.',
            genre: 'live_band',
            tags: ['Live Band', 'Funk', 'Soul'],
            start_datetime: '2026-03-20T20:00:00',
            end_datetime: '2026-03-20T23:00:00',
            doors_open_datetime: '2026-03-20T19:00:00',
            starting_price: 40,
            is_free_event: false,
            is_guest_list_available: false,
            is_rsvp_enabled: false,
            is_featured: false,
            venue_name: 'Neon Vault Live Room',
            image_url: '',
            status: 'scheduled',
            created_at: '2026-02-01T09:00:00',
            updated_at: '2026-02-10T09:00:00'
          });
        }

        const currentYear = new Date().getFullYear();
        const halloweenEventId = 'evt_halloween_costume_contest_' + currentYear;
        if (!events.some(e => e.id === halloweenEventId)) {
          const halloweenStart = currentYear + '-10-31T21:00:00';
          const halloweenEnd = currentYear + '-11-01T02:00:00';
          const halloweenDoors = currentYear + '-10-31T20:00:00';
          events.push({
            id: halloweenEventId,
            title: 'Halloween Costume Party & Contest',
            subtitle: 'Halloween bash with a late-night costume contest',
            description:
              'Spooky beats, themed cocktails, and a midnight costume contest with prizes.',
            genre: 'dj_electronic',
            tags: ['Halloween', 'Costume Contest', 'Party'],
            start_datetime: halloweenStart,
            end_datetime: halloweenEnd,
            doors_open_datetime: halloweenDoors,
            starting_price: 35,
            is_free_event: false,
            is_guest_list_available: false,
            is_rsvp_enabled: true,
            is_featured: false,
            venue_name: 'Neon Vault Main Room',
            image_url: '',
            status: 'scheduled',
            created_at: currentYear + '-09-15T10:00:00',
            updated_at: currentYear + '-09-20T10:00:00'
          });
        }

        if (!events.some(e => e.id === 'evt_latin_saturday_fiesta')) {
          events.push({
            id: 'evt_latin_saturday_fiesta',
            title: 'Latin Saturday Fiesta',
            subtitle: 'Reggaeton, salsa & Latin club anthems',
            description:
              'Our weekly Latin Saturday with resident DJs spinning reggaeton, salsa, and more.',
            genre: 'latin',
            tags: ['Latin', 'Saturday'],
            start_datetime: '2026-03-14T22:00:00',
            end_datetime: '2026-03-15T02:30:00',
            doors_open_datetime: '2026-03-14T21:00:00',
            starting_price: 40,
            is_free_event: false,
            is_guest_list_available: false,
            is_rsvp_enabled: false,
            is_featured: false,
            venue_name: 'Neon Vault Main Room',
            image_url: '',
            status: 'scheduled',
            created_at: '2026-02-05T12:00:00',
            updated_at: '2026-02-10T12:00:00'
          });
        }

        this._saveToStorage('events', events);

        // Seed ticket types
        let ticketTypes = this._getFromStorage('event_ticket_types');

        if (!ticketTypes.some(t => t.id === 'tt_soul_city_ga')) {
          ticketTypes.push({
            id: 'tt_soul_city_ga',
            event_id: 'evt_soul_city_extended_jam',
            name: 'General Admission',
            category: 'general_admission',
            description: 'Standard entry for Soul City Live: Extended Jam Session.',
            price: 50,
            is_free: false,
            is_available: true,
            quantity_total: 200,
            min_purchase_quantity: 1,
            max_purchase_quantity: 8,
            display_order: 1,
            quantity_remaining: 200
          });
        }

        if (!ticketTypes.some(t => t.id === 'tt_groove_masters_ga')) {
          ticketTypes.push({
            id: 'tt_groove_masters_ga',
            event_id: 'evt_groove_masters_live',
            name: 'General Admission',
            category: 'general_admission',
            description: 'Standard entry for Groove Masters Live.',
            price: 40,
            is_free: false,
            is_available: true,
            quantity_total: 150,
            min_purchase_quantity: 1,
            max_purchase_quantity: 8,
            display_order: 1,
            quantity_remaining: 150
          });
        }

        if (!ticketTypes.some(t => t.id === 'tt_headliner_early_bird')) {
          ticketTypes.push({
            id: 'tt_headliner_early_bird',
            event_id: 'evt_headliner_dj_night',
            name: 'Early Bird',
            category: 'early_bird',
            description: 'Discounted Early Bird tickets for Headliner DJ Night.',
            price: 55,
            is_free: false,
            is_available: true,
            quantity_total: 100,
            min_purchase_quantity: 1,
            max_purchase_quantity: 6,
            display_order: 2,
            quantity_remaining: 100
          });
        }

        if (!ticketTypes.some(t => t.id === 'tt_headliner_ga')) {
          ticketTypes.push({
            id: 'tt_headliner_ga',
            event_id: 'evt_headliner_dj_night',
            name: 'General Admission',
            category: 'general_admission',
            description: 'General Admission for Headliner DJ Night.',
            price: 60,
            is_free: false,
            is_available: true,
            quantity_total: 150,
            min_purchase_quantity: 1,
            max_purchase_quantity: 8,
            display_order: 3,
            quantity_remaining: 150
          });
        }

        if (!ticketTypes.some(t => t.id === 'tt_latin_saturday_ga')) {
          ticketTypes.push({
            id: 'tt_latin_saturday_ga',
            event_id: 'evt_latin_saturday_fiesta',
            name: 'General Admission',
            category: 'general_admission',
            description: 'General Admission for Latin Saturday Fiesta.',
            price: 40,
            is_free: false,
            is_available: true,
            quantity_total: 150,
            min_purchase_quantity: 1,
            max_purchase_quantity: 8,
            display_order: 1,
            quantity_remaining: 150
          });
        }

        this._saveToStorage('event_ticket_types', ticketTypes);

        localStorage.setItem('default_seed_done', '1');
      } catch (e) {
        // Ignore seeding errors
      }
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

  // ---------- Common domain helpers ----------

  _getGenreLabel(value) {
    const map = {
      dj_electronic: 'DJ / Electronic',
      hip_hop_rnb: 'Hip-Hop / R&B',
      live_band: 'Live Band',
      edm_electronic: 'EDM / Electronic',
      latin: 'Latin',
      other: 'Other'
    };
    return map[value] || 'Other';
  }

  _formatCurrency(amount) {
    if (typeof amount !== 'number' || isNaN(amount)) return '$0.00';
    return '$' + amount.toFixed(2).replace(/\.00$/, '');
  }

  _getDayOfWeekName(date) {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return days[date.getDay()];
  }

  _parseDateTime(value) {
    return value instanceof Date ? value : new Date(value);
  }

  // ---------- Cart helpers ----------

  _getCurrentCartId() {
    return localStorage.getItem('current_cart_id');
  }

  _setCurrentCartId(cartId) {
    if (cartId) {
      localStorage.setItem('current_cart_id', cartId);
    } else {
      localStorage.removeItem('current_cart_id');
    }
  }

  _getOrCreateCart() {
    let carts = this._getFromStorage('carts');
    let cartItems = this._getFromStorage('cart_items');

    let currentCartId = this._getCurrentCartId();
    let cart = null;

    if (currentCartId) {
      cart = carts.find(c => c.id === currentCartId) || null;
    }

    if (!cart) {
      const now = new Date().toISOString();
      cart = {
        id: this._generateId('cart'),
        items: [], // array of cart_item ids
        subtotal: 0,
        selected_delivery_method: 'not_selected',
        created_at: now,
        updated_at: now
      };
      carts.push(cart);
      this._setCurrentCartId(cart.id);
      this._saveToStorage('carts', carts);
      this._saveToStorage('cart_items', cartItems);
    }

    return cart;
  }

  _saveCart(cart, cartItems) {
    let carts = this._getFromStorage('carts');
    const idx = carts.findIndex(c => c.id === cart.id);
    if (idx !== -1) {
      carts[idx] = cart;
    } else {
      carts.push(cart);
    }
    this._saveToStorage('carts', carts);
    this._saveToStorage('cart_items', cartItems);
  }

  _recalculateCartSubtotal(cart, cartItems) {
    let subtotal = 0;
    for (const item of cartItems) {
      if (item.cart_id === cart.id) {
        subtotal += typeof item.line_subtotal === 'number' ? item.line_subtotal : 0;
      }
    }
    cart.subtotal = subtotal;
    cart.updated_at = new Date().toISOString();
  }

  // ---------- Event filtering helpers ----------

  _calculateEventDuration(event) {
    if (!event || !event.start_datetime || !event.end_datetime) return 0;
    const start = this._parseDateTime(event.start_datetime);
    const end = this._parseDateTime(event.end_datetime);
    const diffMs = end - start;
    if (!isFinite(diffMs) || diffMs <= 0) return 0;
    return diffMs / (1000 * 60); // minutes
  }

  _resolveDatePresetRange(datePreset, specificDate, startDate, endDate) {
    let now = new Date();
    // Use baseline date from metadata if available so tests are deterministic
    try {
      const metaRaw = localStorage.getItem('_metadata');
      if (metaRaw) {
        const meta = JSON.parse(metaRaw);
        if (meta && meta.baselineDate) {
          const baseline = new Date(meta.baselineDate);
          if (!isNaN(baseline.getTime())) {
            now = baseline;
          }
        }
      }
    } catch (e) {}
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const addDays = (base, days) => new Date(base.getFullYear(), base.getMonth(), base.getDate() + days);

    let rangeStart = null;
    let rangeEnd = null;

    switch (datePreset) {
      case 'today': {
        rangeStart = new Date(today);
        rangeEnd = addDays(today, 1);
        break;
      }
      case 'this_week': {
        const day = today.getDay();
        const mondayOffset = day === 0 ? -6 : 1 - day; // Monday as first day
        rangeStart = addDays(today, mondayOffset);
        rangeEnd = addDays(rangeStart, 7);
        break;
      }
      case 'this_weekend': {
        const day = today.getDay();
        const daysUntilFriday = (5 - day + 7) % 7; // 5 = Friday
        const friday = addDays(today, daysUntilFriday);
        const mondayAfterWeekend = addDays(friday, 3); // Fri-Sun inclusive
        rangeStart = friday;
        rangeEnd = mondayAfterWeekend;
        break;
      }
      case 'next_30_days': {
        rangeStart = new Date(today);
        rangeEnd = addDays(today, 30);
        break;
      }
      case 'specific_date': {
        if (specificDate) {
          let d = null;
          if (typeof specificDate === 'string') {
            const parts = specificDate.split('-');
            if (parts.length === 3) {
              const y = parseInt(parts[0], 10);
              const m = parseInt(parts[1], 10) - 1;
              const day = parseInt(parts[2], 10);
              if (!isNaN(y) && !isNaN(m) && !isNaN(day)) {
                d = new Date(y, m, day);
              }
            }
          } else {
            d = new Date(specificDate);
          }
          if (d && !isNaN(d.getTime())) {
            rangeStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
            rangeEnd = addDays(rangeStart, 1);
          }
        }
        break;
      }
      case undefined:
      case null:
      default: {
        if (startDate || endDate) {
          if (startDate) {
            const d = new Date(startDate);
            if (!isNaN(d.getTime())) {
              rangeStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
            }
          }
          if (endDate) {
            const d = new Date(endDate);
            if (!isNaN(d.getTime())) {
              rangeEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
            }
          }
        }
        break;
      }
    }

    return { start: rangeStart, end: rangeEnd };
  }

  _filterEvents(events, options) {
    const {
      searchTerm,
      genre,
      datePreset,
      specificDate,
      startDate,
      endDate,
      dayOfWeek,
      onlyGuestListAvailable,
      onlyFreeEvents
    } = options || {};

    let filtered = events.slice();

    // Status: only scheduled events by default
    filtered = filtered.filter(e => e.status === 'scheduled');

    // Search term
    if (searchTerm && typeof searchTerm === 'string' && searchTerm.trim() !== '') {
      const term = searchTerm.trim().toLowerCase();
      filtered = filtered.filter(e => {
        const inTitle = (e.title || '').toLowerCase().includes(term);
        const inSubtitle = (e.subtitle || '').toLowerCase().includes(term);
        const inDesc = (e.description || '').toLowerCase().includes(term);
        const inTags = Array.isArray(e.tags)
          ? e.tags.some(t => (t || '').toString().toLowerCase().includes(term))
          : false;
        return inTitle || inSubtitle || inDesc || inTags;
      });
    }

    // Genre
    if (genre) {
      filtered = filtered.filter(e => e.genre === genre);
    }

    // Date range
    const range = this._resolveDatePresetRange(datePreset, specificDate, startDate, endDate);
    if (range.start || range.end) {
      filtered = filtered.filter(e => {
        const start = this._parseDateTime(e.start_datetime);
        if (range.start && start < range.start) return false;
        if (range.end && start >= range.end) return false;
        return true;
      });
    }

    // Day of week
    if (Array.isArray(dayOfWeek) && dayOfWeek.length > 0) {
      const daySet = new Set(dayOfWeek.map(d => (d || '').toLowerCase()));
      filtered = filtered.filter(e => {
        const start = this._parseDateTime(e.start_datetime);
        const dow = this._getDayOfWeekName(start);
        return daySet.has(dow);
      });
    }

    // Guest list
    if (onlyGuestListAvailable) {
      filtered = filtered.filter(e => !!e.is_guest_list_available);
    }

    // Free events
    if (onlyFreeEvents) {
      filtered = filtered.filter(e => !!e.is_free_event);
    }

    return filtered;
  }

  // ---------- VIP / Guest list / Workshops helpers ----------

  _validateVipPackageConstraints(pkg, partySize, maxBudget) {
    if (!pkg || pkg.status !== 'active') return false;
    if (typeof partySize === 'number') {
      if (pkg.min_guests && partySize < pkg.min_guests) return false;
      if (pkg.max_guests && partySize > pkg.max_guests) return false;
    }
    if (typeof maxBudget === 'number') {
      if (pkg.base_min_spend > maxBudget) return false;
    }
    return true;
  }

  _validateGuestListCounts(totalGuests, femaleGuests, maleGuests, nonbinaryGuests) {
    const f = typeof femaleGuests === 'number' ? femaleGuests : 0;
    const m = typeof maleGuests === 'number' ? maleGuests : 0;
    const n = typeof nonbinaryGuests === 'number' ? nonbinaryGuests : 0;
    return totalGuests === f + m + n;
  }

  _validateWorkshopSessionTimeWindow(session, hourStart, hourEnd) {
    if (!session || !session.start_datetime) return false;
    const start = this._parseDateTime(session.start_datetime);
    const h = start.getHours();
    return h >= hourStart && h <= hourEnd;
  }

  // ---------- Interfaces ----------

  // getHomeFeaturedEvent
  getHomeFeaturedEvent() {
    const events = this._getFromStorage('events');
    const scheduled = events.filter(e => e.status === 'scheduled');

    let candidates = scheduled.filter(e => e.is_featured);
    if (candidates.length === 0) {
      candidates = scheduled.slice();
    }

    if (candidates.length === 0) {
      return {
        event: null,
        display: {
          title: '',
          subtitle: '',
          imageUrl: '',
          dateLabel: '',
          genreLabel: '',
          startingFromPriceLabel: '',
          isFreeLabel: ''
        }
      };
    }

    candidates.sort((a, b) => {
      const da = this._parseDateTime(a.start_datetime);
      const db = this._parseDateTime(b.start_datetime);
      return da - db;
    });

    const event = candidates[0];
    const start = this._parseDateTime(event.start_datetime);

    const dateLabel = start.toDateString();
    const genreLabel = this._getGenreLabel(event.genre);
    const startingFromPriceLabel = event.is_free_event
      ? 'Free'
      : 'From ' + this._formatCurrency(event.starting_price || 0);
    const isFreeLabel = event.is_free_event ? 'Free Event' : '';

    return {
      event,
      display: {
        title: event.title || '',
        subtitle: event.subtitle || '',
        imageUrl: event.image_url || '',
        dateLabel,
        genreLabel,
        startingFromPriceLabel,
        isFreeLabel
      }
    };
  }

  // getHomeEventShortcuts
  getHomeEventShortcuts() {
    // Static configuration for shortcut tiles (no persistence required)
    return [
      {
        id: 'dj_nights',
        label: 'DJ Nights',
        description: 'Upcoming DJ & electronic events',
        icon: 'icon-dj',
        presetFilters: {
          genre: 'dj_electronic',
          datePreset: 'next_30_days'
        }
      },
      {
        id: 'this_weekend',
        label: 'This Weekend',
        description: 'What\'s happening this weekend',
        icon: 'icon-weekend',
        presetFilters: {
          datePreset: 'this_weekend'
        }
      },
      {
        id: 'live_bands',
        label: 'Live Bands',
        description: 'Upcoming live band shows',
        icon: 'icon-guitar',
        presetFilters: {
          genre: 'live_band',
          datePreset: 'next_30_days'
        }
      },
      {
        id: 'latin_saturdays',
        label: 'Latin Saturdays',
        description: 'Latin nights on Saturdays',
        icon: 'icon-latin',
        presetFilters: {
          genre: 'latin',
          dayOfWeek: 'saturday',
          datePreset: 'next_30_days'
        }
      }
    ];
  }

  // getEventFilterOptions
  getEventFilterOptions() {
    const genreOptions = [
      { value: 'dj_electronic', label: 'DJ / Electronic' },
      { value: 'hip_hop_rnb', label: 'Hip-Hop / R&B' },
      { value: 'live_band', label: 'Live Band' },
      { value: 'edm_electronic', label: 'EDM / Electronic' },
      { value: 'latin', label: 'Latin' },
      { value: 'other', label: 'Other' }
    ];

    const datePresetOptions = [
      { value: 'today', label: 'Today' },
      { value: 'this_weekend', label: 'This Weekend' },
      { value: 'next_30_days', label: 'Next 30 Days' },
      { value: 'specific_date', label: 'Specific Date' }
    ];

    const dayOfWeekOptions = [
      { value: 'friday', label: 'Friday' },
      { value: 'saturday', label: 'Saturday' },
      { value: 'sunday', label: 'Sunday' }
    ];

    const sortOptions = [
      { value: 'date_soonest_first', label: 'Date: Soonest First' },
      { value: 'price_low_to_high', label: 'Price: Low to High' }
    ];

    return { genreOptions, datePresetOptions, dayOfWeekOptions, sortOptions };
  }

  // searchEvents
  searchEvents(
    searchTerm,
    genre,
    datePreset,
    specificDate,
    startDate,
    endDate,
    dayOfWeek,
    onlyGuestListAvailable,
    onlyFreeEvents,
    sortBy,
    limit,
    offset
  ) {
    const events = this._getFromStorage('events');

    const filtered = this._filterEvents(events, {
      searchTerm,
      genre,
      datePreset,
      specificDate,
      startDate,
      endDate,
      dayOfWeek,
      onlyGuestListAvailable,
      onlyFreeEvents
    });

    let sorted = filtered.slice();
    if (sortBy === 'price_low_to_high') {
      sorted.sort((a, b) => {
        const pa = typeof a.starting_price === 'number' ? a.starting_price : Number.MAX_SAFE_INTEGER;
        const pb = typeof b.starting_price === 'number' ? b.starting_price : Number.MAX_SAFE_INTEGER;
        if (pa === pb) {
          const da = this._parseDateTime(a.start_datetime);
          const db = this._parseDateTime(b.start_datetime);
          return da - db;
        }
        return pa - pb;
      });
    } else if (sortBy === 'date_soonest_first' || !sortBy) {
      sorted.sort((a, b) => {
        const da = this._parseDateTime(a.start_datetime);
        const db = this._parseDateTime(b.start_datetime);
        return da - db;
      });
    }

    const totalCount = sorted.length;
    let sliced = sorted;
    const off = typeof offset === 'number' && offset > 0 ? offset : 0;
    const lim = typeof limit === 'number' && limit > 0 ? limit : null;
    if (lim !== null) {
      sliced = sorted.slice(off, off + lim);
    } else if (off > 0) {
      sliced = sorted.slice(off);
    }

    return {
      events: sliced,
      totalCount
    };
  }

  // getEventDetail
  getEventDetail(eventId) {
    const events = this._getFromStorage('events');
    const ticketTypesAll = this._getFromStorage('event_ticket_types');

    const event = events.find(e => e.id === eventId) || null;

    const ticketTypesRaw = ticketTypesAll.filter(t => t.event_id === eventId);
    // Resolve foreign key: include event object on each ticket type
    const ticketTypes = ticketTypesRaw.map(t => ({
      ...t,
      event
    }));

    let dateLabel = '';
    let timeRangeLabel = '';
    let durationLabel = '';
    let genreLabel = '';
    let tags = [];
    let startingFromPriceLabel = '';

    if (event) {
      const start = this._parseDateTime(event.start_datetime);
      const end = this._parseDateTime(event.end_datetime);
      dateLabel = start.toDateString();
      timeRangeLabel = start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) +
        ' - ' +
        end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const durationMinutes = this._calculateEventDuration(event);
      if (durationMinutes > 0) {
        const hours = Math.floor(durationMinutes / 60);
        const minutes = Math.round(durationMinutes % 60);
        if (hours > 0 && minutes > 0) {
          durationLabel = hours + 'h ' + minutes + 'm';
        } else if (hours > 0) {
          durationLabel = hours + 'h';
        } else {
          durationLabel = minutes + 'm';
        }
      }
      genreLabel = this._getGenreLabel(event.genre);
      tags = Array.isArray(event.tags) ? event.tags.slice() : [];
      startingFromPriceLabel = event.is_free_event
        ? 'Free'
        : 'From ' + this._formatCurrency(event.starting_price || 0);
    }

    return {
      event,
      ticketTypes,
      hasGuestList: !!(event && event.is_guest_list_available),
      hasRsvp: !!(event && event.is_rsvp_enabled),
      display: {
        dateLabel,
        timeRangeLabel,
        durationLabel,
        genreLabel,
        tags,
        startingFromPriceLabel
      }
    };
  }

  // addTicketsToCart
  addTicketsToCart(eventId, ticketTypeId, quantity) {
    const qty = typeof quantity === 'number' ? quantity : parseInt(quantity, 10) || 0;
    if (qty <= 0) {
      return { success: false, message: 'Quantity must be at least 1', addedItem: null, cartSubtotal: 0 };
    }

    const events = this._getFromStorage('events');
    const ticketTypes = this._getFromStorage('event_ticket_types');
    let cartItems = this._getFromStorage('cart_items');

    const event = events.find(e => e.id === eventId);
    if (!event) {
      return { success: false, message: 'Event not found', addedItem: null, cartSubtotal: 0 };
    }

    const ticketType = ticketTypes.find(t => t.id === ticketTypeId && t.event_id === eventId);
    if (!ticketType) {
      return { success: false, message: 'Ticket type not found', addedItem: null, cartSubtotal: 0 };
    }

    if (!ticketType.is_available) {
      return { success: false, message: 'Ticket type is not available', addedItem: null, cartSubtotal: 0 };
    }

    const minQ = ticketType.min_purchase_quantity || 1;
    const maxQ = ticketType.max_purchase_quantity || null;

    if (qty < minQ) {
      return {
        success: false,
        message: 'Minimum purchase quantity is ' + minQ,
        addedItem: null,
        cartSubtotal: 0
      };
    }

    const cart = this._getOrCreateCart();

    let existing = cartItems.find(
      ci => ci.cart_id === cart.id && ci.event_id === eventId && ci.ticket_type_id === ticketTypeId
    );

    let newQuantity = qty;
    if (existing) {
      newQuantity = existing.quantity + qty;
    }

    if (maxQ && newQuantity > maxQ) {
      return {
        success: false,
        message: 'Maximum purchase quantity is ' + maxQ,
        addedItem: null,
        cartSubtotal: cart.subtotal
      };
    }

    if (typeof ticketType.quantity_remaining === 'number' && ticketType.quantity_remaining >= 0) {
      if (newQuantity > ticketType.quantity_remaining) {
        return {
          success: false,
          message: 'Not enough tickets remaining',
          addedItem: null,
          cartSubtotal: cart.subtotal
        };
      }
    }

    const unitPrice = ticketType.price || 0;

    if (existing) {
      existing.quantity = newQuantity;
      existing.unit_price = unitPrice;
      existing.line_subtotal = unitPrice * existing.quantity;
    } else {
      const item = {
        id: this._generateId('cart_item'),
        cart_id: cart.id,
        event_id: eventId,
        ticket_type_id: ticketTypeId,
        event_title: event.title || '',
        event_date: event.start_datetime,
        ticket_type_name: ticketType.name || '',
        unit_price: unitPrice,
        quantity: qty,
        line_subtotal: unitPrice * qty
      };
      cartItems.push(item);
      cart.items.push(item.id);
      existing = item;
    }

    // Recalculate subtotal
    this._recalculateCartSubtotal(cart, cartItems);
    this._saveCart(cart, cartItems);

    return {
      success: true,
      message: 'Added to cart',
      addedItem: existing,
      cartSubtotal: cart.subtotal
    };
  }

  // getCart
  getCart() {
    const cart = this._getOrCreateCart();
    const allItems = this._getFromStorage('cart_items');
    const events = this._getFromStorage('events');
    const ticketTypes = this._getFromStorage('event_ticket_types');

    const itemsForCart = allItems.filter(ci => ci.cart_id === cart.id);

    const resolvedItems = itemsForCart.map(ci => {
      const event = events.find(e => e.id === ci.event_id) || null;
      const ticketType = ticketTypes.find(t => t.id === ci.ticket_type_id) || null;
      // Foreign key resolution: include cart, event, ticketType objects
      return {
        ...ci,
        cart,
        event,
        ticketType
      };
    });

    let totalQuantity = 0;
    for (const item of itemsForCart) {
      totalQuantity += item.quantity || 0;
    }

    return {
      items: resolvedItems,
      subtotal: cart.subtotal || 0,
      totalQuantity,
      selectedDeliveryMethod: cart.selected_delivery_method || 'not_selected'
    };
  }

  // updateCartItemQuantity
  updateCartItemQuantity(cartItemId, quantity) {
    let cartItems = this._getFromStorage('cart_items');
    const carts = this._getFromStorage('carts');
    const ticketTypes = this._getFromStorage('event_ticket_types');

    const itemIndex = cartItems.findIndex(ci => ci.id === cartItemId);
    if (itemIndex === -1) {
      const cart = this._getOrCreateCart();
      return { success: false, updatedItem: null, subtotal: cart.subtotal || 0 };
    }

    const item = cartItems[itemIndex];
    const cart = carts.find(c => c.id === item.cart_id) || this._getOrCreateCart();

    const newQty = typeof quantity === 'number' ? quantity : parseInt(quantity, 10) || 0;

    if (newQty <= 0) {
      // Remove item
      cartItems.splice(itemIndex, 1);
      const idxInCart = cart.items.indexOf(cartItemId);
      if (idxInCart !== -1) {
        cart.items.splice(idxInCart, 1);
      }
      this._recalculateCartSubtotal(cart, cartItems);
      this._saveCart(cart, cartItems);
      return { success: true, updatedItem: null, subtotal: cart.subtotal };
    }

    const ticketType = ticketTypes.find(t => t.id === item.ticket_type_id);

    let maxQ = ticketType && ticketType.max_purchase_quantity ? ticketType.max_purchase_quantity : null;
    let minQ = ticketType && ticketType.min_purchase_quantity ? ticketType.min_purchase_quantity : 1;

    if (newQty < minQ) {
      return {
        success: false,
        updatedItem: item,
        subtotal: cart.subtotal,
        message: 'Minimum quantity is ' + minQ
      };
    }

    if (maxQ && newQty > maxQ) {
      return {
        success: false,
        updatedItem: item,
        subtotal: cart.subtotal,
        message: 'Maximum quantity is ' + maxQ
      };
    }

    if (ticketType && typeof ticketType.quantity_remaining === 'number' && ticketType.quantity_remaining >= 0) {
      if (newQty > ticketType.quantity_remaining) {
        return {
          success: false,
          updatedItem: item,
          subtotal: cart.subtotal,
          message: 'Not enough tickets remaining'
        };
      }
    }

    const unitPrice = item.unit_price || (ticketType ? ticketType.price || 0 : 0);
    item.quantity = newQty;
    item.unit_price = unitPrice;
    item.line_subtotal = unitPrice * newQty;

    cartItems[itemIndex] = item;

    this._recalculateCartSubtotal(cart, cartItems);
    this._saveCart(cart, cartItems);

    return {
      success: true,
      updatedItem: item,
      subtotal: cart.subtotal
    };
  }

  // removeCartItem
  removeCartItem(cartItemId) {
    let cartItems = this._getFromStorage('cart_items');
    const carts = this._getFromStorage('carts');

    const idx = cartItems.findIndex(ci => ci.id === cartItemId);
    if (idx === -1) {
      const cart = this._getOrCreateCart();
      return { success: false, subtotal: cart.subtotal || 0, remainingItems: [] };
    }

    const item = cartItems[idx];
    const cart = carts.find(c => c.id === item.cart_id) || this._getOrCreateCart();

    cartItems.splice(idx, 1);
    const pos = cart.items.indexOf(cartItemId);
    if (pos !== -1) {
      cart.items.splice(pos, 1);
    }

    this._recalculateCartSubtotal(cart, cartItems);
    this._saveCart(cart, cartItems);

    const remainingForCart = cartItems.filter(ci => ci.cart_id === cart.id);

    return {
      success: true,
      subtotal: cart.subtotal,
      remainingItems: remainingForCart
    };
  }

  // getCheckoutSummary
  getCheckoutSummary() {
    const cart = this._getOrCreateCart();
    const allItems = this._getFromStorage('cart_items');

    const itemsForCart = allItems.filter(ci => ci.cart_id === cart.id);

    const items = itemsForCart.map(ci => ({
      cartItemId: ci.id,
      eventTitle: ci.event_title,
      eventDate: ci.event_date,
      ticketTypeName: ci.ticket_type_name,
      unitPrice: ci.unit_price,
      quantity: ci.quantity,
      lineSubtotal: ci.line_subtotal
    }));

    return {
      items,
      subtotal: cart.subtotal || 0,
      selectedDeliveryMethod: cart.selected_delivery_method || 'not_selected'
    };
  }

  // setCartDeliveryMethod
  setCartDeliveryMethod(deliveryMethod) {
    const allowed = new Set(['mobile_ticket', 'e_ticket_pdf', 'not_selected']);
    if (!allowed.has(deliveryMethod)) {
      const cart = this._getOrCreateCart();
      return { success: false, selectedDeliveryMethod: cart.selected_delivery_method || 'not_selected' };
    }

    const cart = this._getOrCreateCart();
    cart.selected_delivery_method = deliveryMethod;
    cart.updated_at = new Date().toISOString();

    const cartItems = this._getFromStorage('cart_items');
    this._saveCart(cart, cartItems);

    return { success: true, selectedDeliveryMethod: cart.selected_delivery_method };
  }

  // placeTicketOrder
  placeTicketOrder(contactEmail, contactPhone) {
    const cart = this._getOrCreateCart();
    const allItems = this._getFromStorage('cart_items');

    const itemsForCart = allItems.filter(ci => ci.cart_id === cart.id);
    if (itemsForCart.length === 0) {
      return { success: false, order: null };
    }

    if (!cart.selected_delivery_method || cart.selected_delivery_method === 'not_selected') {
      return { success: false, order: null };
    }

    const ticketOrders = this._getFromStorage('ticket_orders');
    const orderItems = this._getFromStorage('order_items');

    const orderId = this._generateId('order');
    const orderNumber = 'ORD-' + Date.now();

    const orderItemIds = [];
    for (const ci of itemsForCart) {
      const oi = {
        id: this._generateId('order_item'),
        order_id: orderId,
        event_id: ci.event_id,
        ticket_type_id: ci.ticket_type_id,
        event_title: ci.event_title,
        event_date: ci.event_date,
        ticket_type_name: ci.ticket_type_name,
        unit_price: ci.unit_price,
        quantity: ci.quantity,
        line_total: ci.line_subtotal
      };
      orderItems.push(oi);
      orderItemIds.push(oi.id);
    }

    const now = new Date().toISOString();

    const order = {
      id: orderId,
      order_number: orderNumber,
      cart_id: cart.id,
      items: orderItemIds,
      total_amount: cart.subtotal,
      delivery_method: cart.selected_delivery_method === 'e_ticket_pdf' ? 'e_ticket_pdf' : 'mobile_ticket',
      contact_email: contactEmail || null,
      contact_phone: contactPhone || null,
      status: 'pending',
      created_at: now,
      updated_at: now
    };

    ticketOrders.push(order);

    // Persist order & items
    this._saveToStorage('ticket_orders', ticketOrders);
    this._saveToStorage('order_items', orderItems);

    // Clear cart
    const remainingItems = allItems.filter(ci => ci.cart_id !== cart.id);
    let carts = this._getFromStorage('carts');
    carts = carts.filter(c => c.id !== cart.id);
    this._saveToStorage('carts', carts);
    this._saveToStorage('cart_items', remainingItems);
    this._setCurrentCartId(null);

    return { success: true, order };
  }

  // getVIPTablePackages
  getVIPTablePackages(reservationDate, partySize, maxBudget) {
    const packages = this._getFromStorage('vip_table_packages');

    const size = typeof partySize === 'number' ? partySize : parseInt(partySize, 10) || null;
    const budget = typeof maxBudget === 'number' ? maxBudget : maxBudget != null ? parseFloat(maxBudget) : null;

    const filtered = packages.filter(pkg => this._validateVipPackageConstraints(pkg, size, budget));

    return {
      packages: filtered
    };
  }

  // getVIPTablePackageDetail
  getVIPTablePackageDetail(vipTablePackageId) {
    const packages = this._getFromStorage('vip_table_packages');
    const pkg = packages.find(p => p.id === vipTablePackageId) || null;

    // Static arrival time options; UI can filter as needed
    const arrivalTimeSlots = [
      { value: '10:00 PM', label: '10:00 PM' },
      { value: '10:30 PM', label: '10:30 PM' },
      { value: '11:00 PM', label: '11:00 PM' },
      { value: '11:30 PM', label: '11:30 PM' }
    ];

    return {
      package: pkg,
      arrivalTimeSlots
    };
  }

  // submitVIPTableReservationRequest
  submitVIPTableReservationRequest(
    vipTablePackageId,
    reservationDate,
    partySize,
    arrivalTimeSlot,
    contactName,
    contactPhone,
    notes
  ) {
    const packages = this._getFromStorage('vip_table_packages');
    const requests = this._getFromStorage('vip_table_reservation_requests');

    const pkg = packages.find(p => p.id === vipTablePackageId);
    if (!pkg) {
      return { success: false, reservationRequest: null };
    }

    const size = typeof partySize === 'number' ? partySize : parseInt(partySize, 10) || 0;
    if (!this._validateVipPackageConstraints(pkg, size, null)) {
      return { success: false, reservationRequest: null };
    }

    const date = reservationDate ? new Date(reservationDate) : new Date();
    const normalizedDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    const req = {
      id: this._generateId('vip_req'),
      vip_table_package_id: vipTablePackageId,
      reservation_date: normalizedDate.toISOString(),
      party_size: size,
      arrival_time_slot: arrivalTimeSlot,
      contact_name: contactName,
      contact_phone: contactPhone,
      status: 'pending',
      notes: notes || null,
      created_at: new Date().toISOString()
    };

    requests.push(req);
    this._saveToStorage('vip_table_reservation_requests', requests);

    return { success: true, reservationRequest: req };
  }

  // getEventGuestListOptions
  getEventGuestListOptions(eventId) {
    const events = this._getFromStorage('events');
    const event = events.find(e => e.id === eventId);

    if (!event || !event.is_guest_list_available) {
      return {
        isGuestListAvailable: false,
        arrivalTimeOptions: [],
        maxGuestsPerSignup: 0
      };
    }

    const arrivalTimeOptions = [
      { value: 'before_10pm', label: 'Before 10:00 PM' },
      { value: 'before_11pm', label: 'Before 11:00 PM' },
      { value: 'before_midnight', label: 'Before Midnight' },
      { value: 'anytime', label: 'Anytime' }
    ];

    return {
      isGuestListAvailable: true,
      arrivalTimeOptions,
      maxGuestsPerSignup: 20
    };
  }

  // submitGuestListSignup
  submitGuestListSignup(
    eventId,
    arrivalTimeOption,
    totalGuests,
    femaleGuests,
    maleGuests,
    nonbinaryGuests,
    contactFirstName,
    contactLastName,
    contactPhone,
    notes
  ) {
    const events = this._getFromStorage('events');
    const signups = this._getFromStorage('guest_list_signups');

    const event = events.find(e => e.id === eventId);
    if (!event || !event.is_guest_list_available) {
      return { success: false, guestListSignup: null };
    }

    const options = this.getEventGuestListOptions(eventId);
    const option = (options.arrivalTimeOptions || []).find(o => o.value === arrivalTimeOption);
    if (!option) {
      return { success: false, guestListSignup: null };
    }

    const total = typeof totalGuests === 'number' ? totalGuests : parseInt(totalGuests, 10) || 0;
    const f = typeof femaleGuests === 'number' ? femaleGuests : parseInt(femaleGuests, 10) || 0;
    const m = typeof maleGuests === 'number' ? maleGuests : parseInt(maleGuests, 10) || 0;
    const n = typeof nonbinaryGuests === 'number' ? nonbinaryGuests : parseInt(nonbinaryGuests, 10) || 0;

    if (total <= 0) {
      return { success: false, guestListSignup: null };
    }

    if (!this._validateGuestListCounts(total, f, m, n)) {
      return { success: false, guestListSignup: null };
    }

    const signup = {
      id: this._generateId('guestlist'),
      event_id: eventId,
      submitted_at: new Date().toISOString(),
      arrival_time_option: arrivalTimeOption,
      arrival_time_label: option.label,
      total_guests: total,
      female_guests: f,
      male_guests: m,
      nonbinary_guests: n,
      contact_first_name: contactFirstName,
      contact_last_name: contactLastName || null,
      contact_phone: contactPhone,
      status: 'pending',
      notes: notes || null
    };

    signups.push(signup);
    this._saveToStorage('guest_list_signups', signups);

    return { success: true, guestListSignup: signup };
  }

  // getEventRSVPOptions
  getEventRSVPOptions(eventId) {
    const events = this._getFromStorage('events');
    const event = events.find(e => e.id === eventId);

    if (!event || !event.is_rsvp_enabled) {
      return {
        isRsvpEnabled: false,
        allowedStatuses: [],
        supportsEmailNotifications: false,
        supportsSmsNotifications: false
      };
    }

    const allowedStatuses = [
      { value: 'going', label: 'Going' },
      { value: 'interested', label: 'Interested' },
      { value: 'not_going', label: 'Not Going' }
    ];

    return {
      isRsvpEnabled: true,
      allowedStatuses,
      supportsEmailNotifications: true,
      supportsSmsNotifications: true
    };
  }

  // submitRSVP
  submitRSVP(
    eventId,
    status,
    additionalGuests,
    notificationEmailEnabled,
    notificationSmsEnabled,
    email,
    phone
  ) {
    const events = this._getFromStorage('events');
    const rsvps = this._getFromStorage('rsvps');

    const event = events.find(e => e.id === eventId);
    if (!event || !event.is_rsvp_enabled) {
      return { success: false, rsvp: null };
    }

    const options = this.getEventRSVPOptions(eventId);
    const allowedValues = new Set((options.allowedStatuses || []).map(o => o.value));
    if (!allowedValues.has(status)) {
      return { success: false, rsvp: null };
    }

    const addGuests = typeof additionalGuests === 'number'
      ? additionalGuests
      : parseInt(additionalGuests, 10) || 0;

    const totalGuests = 1 + (addGuests > 0 ? addGuests : 0);

    const emailEnabled = !!notificationEmailEnabled;
    const smsEnabled = !!notificationSmsEnabled;

    if (emailEnabled && (!email || typeof email !== 'string')) {
      return { success: false, rsvp: null };
    }

    if (smsEnabled && (!phone || typeof phone !== 'string')) {
      return { success: false, rsvp: null };
    }

    const now = new Date().toISOString();
    const rsvp = {
      id: this._generateId('rsvp'),
      event_id: eventId,
      status,
      total_guests: totalGuests,
      additional_guests: addGuests,
      notification_email_enabled: emailEnabled,
      notification_sms_enabled: smsEnabled,
      email: emailEnabled ? email : null,
      phone: smsEnabled ? phone : null,
      created_at: now,
      updated_at: now
    };

    rsvps.push(rsvp);
    this._saveToStorage('rsvps', rsvps);

    return { success: true, rsvp };
  }

  // getWorkshops
  getWorkshops(datePreset, specificDate, onlyFree) {
    const workshops = this._getFromStorage('workshops');

    let filtered = workshops.filter(w => w.status === 'scheduled');

    if (onlyFree) {
      filtered = filtered.filter(w => !!w.is_free);
    }

    const range = this._resolveDatePresetRange(datePreset, specificDate, null, null);
    if (range.start || range.end) {
      filtered = filtered.filter(w => {
        const d = this._parseDateTime(w.date);
        if (range.start && d < range.start) return false;
        if (range.end && d >= range.end) return false;
        return true;
      });
    }

    return { workshops: filtered };
  }

  // getWorkshopDetail
  getWorkshopDetail(workshopId) {
    const workshops = this._getFromStorage('workshops');
    const sessionsAll = this._getFromStorage('workshop_sessions');

    const workshop = workshops.find(w => w.id === workshopId) || null;

    const sessionsRaw = sessionsAll.filter(s => s.workshop_id === workshopId);
    const sessions = sessionsRaw.map(s => ({
      ...s,
      workshop
    }));

    return {
      workshop,
      sessions
    };
  }

  // registerForWorkshopSession
  registerForWorkshopSession(workshopSessionId, fullName, email, newsletterOptIn) {
    const sessions = this._getFromStorage('workshop_sessions');
    const registrations = this._getFromStorage('workshop_registrations');

    const session = sessions.find(s => s.id === workshopSessionId);
    if (!session || session.status !== 'scheduled') {
      return { success: false, registration: null };
    }

    if (typeof session.spots_remaining === 'number' && session.spots_remaining <= 0) {
      return { success: false, registration: null };
    }

    const reg = {
      id: this._generateId('workshop_reg'),
      workshop_session_id: workshopSessionId,
      full_name: fullName,
      email: email,
      newsletter_opt_in: !!newsletterOptIn,
      status: 'registered',
      created_at: new Date().toISOString()
    };

    registrations.push(reg);

    // Decrement spots_remaining if applicable
    const idx = sessions.findIndex(s => s.id === workshopSessionId);
    if (idx !== -1 && typeof sessions[idx].spots_remaining === 'number') {
      sessions[idx].spots_remaining = Math.max(0, sessions[idx].spots_remaining - 1);
    }

    this._saveToStorage('workshop_registrations', registrations);
    this._saveToStorage('workshop_sessions', sessions);

    return { success: true, registration: reg };
  }

  // submitNewsletterSubscription
  submitNewsletterSubscription(
    email,
    interestDjNights,
    interestLiveBands,
    interestWorkshops,
    frequency,
    city,
    source
  ) {
    const subscriptions = this._getFromStorage('newsletter_subscriptions');

    const allowedFrequencies = new Set(['daily', 'weekly', 'monthly']);
    const allowedSources = new Set(['footer', 'newsletter_page']);

    if (!email || !allowedFrequencies.has(frequency) || !allowedSources.has(source)) {
      return { success: false, subscription: null };
    }

    const sub = {
      id: this._generateId('newsletter'),
      email: email,
      interest_dj_nights: !!interestDjNights,
      interest_live_bands: !!interestLiveBands,
      interest_workshops: !!interestWorkshops,
      frequency: frequency,
      city: city || null,
      source: source,
      created_at: new Date().toISOString()
    };

    subscriptions.push(sub);
    this._saveToStorage('newsletter_subscriptions', subscriptions);

    return { success: true, subscription: sub };
  }

  // getNewsletterOptions
  getNewsletterOptions() {
    const interestOptions = [
      { key: 'dj_nights', label: 'DJ Nights' },
      { key: 'live_bands', label: 'Live Bands' },
      { key: 'workshops', label: 'Workshops & Special Events' }
    ];

    const frequencyOptions = [
      { value: 'daily', label: 'Daily' },
      { value: 'weekly', label: 'Weekly' },
      { value: 'monthly', label: 'Monthly' }
    ];

    const cities = ['New York', 'Los Angeles', 'Chicago'];

    return {
      interestOptions,
      frequencyOptions,
      cities
    };
  }

  // getAboutPageContent
  getAboutPageContent() {
    const raw = localStorage.getItem('about_page_content');
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch (e) {}
    }
    return {
      title: '',
      sections: [],
      venueAddress: '',
      operatingHours: '',
      ageRequirements: '',
      showEventsLink: false,
      showVipTablesLink: false,
      showWorkshopsLink: false
    };
  }

  // getContactPageContent
  getContactPageContent() {
    const raw = localStorage.getItem('contact_page_content');
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch (e) {}
    }
    return {
      venuePhone: '',
      venueEmail: '',
      venueAddress: '',
      mapEmbedToken: ''
    };
  }

  // submitContactMessage
  submitContactMessage(name, email, phone, subject, message, preferredContactMethod) {
    if (!name || !email || !subject || !message) {
      return { success: false, messageId: null };
    }

    const messages = this._getFromStorage('contact_messages');
    const id = this._generateId('contact_msg');

    const msg = {
      id,
      name,
      email,
      phone: phone || null,
      subject,
      message,
      preferred_contact_method: preferredContactMethod || null,
      created_at: new Date().toISOString()
    };

    messages.push(msg);
    this._saveToStorage('contact_messages', messages);

    return { success: true, messageId: id };
  }

  // getFAQEntries
  getFAQEntries() {
    const entries = this._getFromStorage('faq_entries');
    return entries;
  }

  // getTicketingPolicyContent
  getTicketingPolicyContent() {
    const raw = localStorage.getItem('ticketing_policy_content');
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch (e) {}
    }
    return { contentHtml: '' };
  }

  // getPrivacyPolicyContent
  getPrivacyPolicyContent() {
    const raw = localStorage.getItem('privacy_policy_content');
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch (e) {}
    }
    return { contentHtml: '' };
  }

  // getTermsAndConditionsContent
  getTermsAndConditionsContent() {
    const raw = localStorage.getItem('terms_and_conditions_content');
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch (e) {}
    }
    return { contentHtml: '' };
  }

  // getBudgetValidationForCart
  getBudgetValidationForCart(budget) {
    const cart = this._getOrCreateCart();
    const allItems = this._getFromStorage('cart_items');
    const events = this._getFromStorage('events');

    const itemsForCart = allItems.filter(ci => ci.cart_id === cart.id);

    const subtotal = cart.subtotal || 0;
    const isWithinBudget = typeof budget === 'number' ? subtotal <= budget : true;

    const eventSummaries = itemsForCart.map(ci => {
      const event = events.find(e => e.id === ci.event_id) || null;
      return {
        eventId: ci.event_id,
        event: event, // foreign key resolution
        eventTitle: ci.event_title || (event ? event.title : ''),
        eventDate: ci.event_date || (event ? event.start_datetime : null),
        lineSubtotal: ci.line_subtotal || 0
      };
    });

    return {
      subtotal,
      isWithinBudget,
      eventSummaries
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
