/* eslint-disable no-var */
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

  // ---------------------- Storage Helpers ----------------------

  _initStorage() {
    const arrayKeys = [
      'events',
      'event_availabilities',
      'quote_lists',
      'quote_list_items',
      'quote_requests',
      'bookings',
      'compare_lists',
      'compare_items',
      'wishlists',
      'wishlist_items',
      'planner_day_plans',
      'planner_slots',
      'diy_kits',
      'carts',
      'cart_items',
      'articles',
      'newsletter_subscriptions',
      'pricing_estimates',
      'calculator_addons',
      'event_inquiries'
    ];

    for (const key of arrayKeys) {
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

  _nowIso() {
    return new Date().toISOString();
  }

  // ---------------------- Internal Entity Getters / Creators ----------------------

  _getEvents() {
    return this._getFromStorage('events');
  }

  _saveEvents(events) {
    this._saveToStorage('events', events);
  }

  _getEventAvailabilities() {
    return this._getFromStorage('event_availabilities');
  }

  _saveEventAvailabilities(avails) {
    this._saveToStorage('event_availabilities', avails);
  }

  _getOrCreateQuoteList() {
    let quoteLists = this._getFromStorage('quote_lists');
    let currentId = localStorage.getItem('current_quote_list_id');
    let list = null;

    if (currentId) {
      list = quoteLists.find(l => l.id === currentId) || null;
    }

    if (!list) {
      list = {
        id: this._generateId('quote_list'),
        created_at: this._nowIso(),
        updated_at: this._nowIso()
      };
      quoteLists.push(list);
      this._saveToStorage('quote_lists', quoteLists);
      localStorage.setItem('current_quote_list_id', list.id);
    }

    return list;
  }

  _getOrCreateCart() {
    let carts = this._getFromStorage('carts');
    let currentId = localStorage.getItem('current_cart_id');
    let cart = null;

    if (currentId) {
      cart = carts.find(c => c.id === currentId) || null;
    }

    if (!cart) {
      cart = {
        id: this._generateId('cart'),
        created_at: this._nowIso(),
        updated_at: this._nowIso(),
        total_items: 0,
        subtotal: 0,
        currency: 'USD'
      };
      carts.push(cart);
      this._saveToStorage('carts', carts);
      localStorage.setItem('current_cart_id', cart.id);
    }

    return cart;
  }

  _getOrCreateCompareList() {
    let lists = this._getFromStorage('compare_lists');
    let currentId = localStorage.getItem('current_compare_list_id');
    let list = null;

    if (currentId) {
      list = lists.find(l => l.id === currentId) || null;
    }

    if (!list) {
      list = {
        id: this._generateId('compare_list'),
        created_at: this._nowIso()
      };
      lists.push(list);
      this._saveToStorage('compare_lists', lists);
      localStorage.setItem('current_compare_list_id', list.id);
    }

    return list;
  }

  _getOrCreateWishlist() {
    let lists = this._getFromStorage('wishlists');
    let currentId = localStorage.getItem('current_wishlist_id');
    let list = null;

    if (currentId) {
      list = lists.find(l => l.id === currentId) || null;
    }

    if (!list) {
      list = {
        id: this._generateId('wishlist'),
        created_at: this._nowIso()
      };
      lists.push(list);
      this._saveToStorage('wishlists', lists);
      localStorage.setItem('current_wishlist_id', list.id);
    }

    return list;
  }

  _getOrCreatePlannerDayPlan() {
    let plans = this._getFromStorage('planner_day_plans');
    let slots = this._getFromStorage('planner_slots');
    let currentId = localStorage.getItem('current_planner_day_plan_id');
    let plan = null;

    if (currentId) {
      plan = plans.find(p => p.id === currentId) || null;
    }

    if (!plan) {
      plan = {
        id: this._generateId('day_plan'),
        name: null,
        date: null,
        total_budget_total_max: null,
        total_budget_per_person_max: null,
        created_at: this._nowIso(),
        updated_at: this._nowIso()
      };
      plans.push(plan);
      this._saveToStorage('planner_day_plans', plans);
      localStorage.setItem('current_planner_day_plan_id', plan.id);

      const slotTypes = ['morning', 'afternoon', 'evening'];
      for (const type of slotTypes) {
        const slot = {
          id: this._generateId('slot'),
          planner_day_plan_id: plan.id,
          slot_type: type,
          category: null,
          budget_total_max: null,
          budget_per_person_max: null,
          duration_minutes_min: null,
          duration_minutes_max: null,
          selected_event_id: null,
          selected_event_title: null,
          notes: null
        };
        slots.push(slot);
      }
      this._saveToStorage('planner_slots', slots);
    }

    const planSlots = slots.filter(s => s.planner_day_plan_id === plan.id);

    return { plan, slots: planSlots };
  }

  _getOrCreateCurrentBooking() {
    const bookings = this._getFromStorage('bookings');
    const currentId = localStorage.getItem('current_booking_id');
    if (currentId) {
      const existing = bookings.find(b => b.id === currentId) || null;
      if (existing) return existing;
    }
    return null;
  }

  // ---------------------- Pricing Helpers ----------------------

  _calculateEventPriceEstimate(event, participants) {
    if (!event) {
      return { total: 0, perPerson: 0 };
    }

    const p = Math.max(1, participants || event.min_participants || 1);
    const model = event.pricing_model || 'custom';
    let total = 0;
    let perPerson = 0;

    if (model === 'per_person') {
      const base = event.base_price_per_person || event.min_price_per_person || event.max_price_per_person || 0;
      total = base * p;
      const minTotal = event.min_total_price || 0;
      const maxTotal = event.max_total_price || null;
      if (total < minTotal) total = minTotal;
      if (maxTotal != null && total > maxTotal) total = maxTotal;
      perPerson = p > 0 ? total / p : 0;
    } else if (model === 'flat_rate') {
      total = event.base_price_total || event.min_total_price || event.max_total_price || 0;
      if (event.base_price_per_person != null) {
        perPerson = event.base_price_per_person;
      } else if (event.min_price_per_person != null) {
        perPerson = event.min_price_per_person;
      } else if (event.max_price_per_person != null) {
        perPerson = event.max_price_per_person;
      } else {
        perPerson = p > 0 ? total / p : 0;
      }
    } else {
      if (event.base_price_total != null) {
        total = event.base_price_total;
        perPerson = p > 0 ? total / p : 0;
      } else if (event.base_price_per_person != null) {
        total = event.base_price_per_person * p;
        perPerson = p > 0 ? total / p : 0;
      } else if (event.min_total_price != null) {
        total = event.min_total_price;
        perPerson = p > 0 ? total / p : 0;
      } else if (event.min_price_per_person != null) {
        total = event.min_price_per_person * p;
        perPerson = p > 0 ? total / p : 0;
      } else {
        total = 0;
        perPerson = 0;
      }
    }

    return { total, perPerson };
  }

  _calculatePlannerBudgetTotals(dayPlan, slots) {
    const events = this._getEvents();
    let total = 0;
    let participantsSum = 0;

    for (const slot of slots) {
      if (!slot.selected_event_id) continue;
      const event = events.find(e => e.id === slot.selected_event_id);
      if (!event) continue;
      const participants = event.min_participants || 0;
      const estimate = this._calculateEventPriceEstimate(event, participants || 10);
      total += estimate.total;
      participantsSum += participants || 10;
    }

    const perPerson = participantsSum > 0 ? total / participantsSum : 0;

    return { total, perPerson };
  }

  _calculateCartTotals(cart, itemsWithKits) {
    let subtotal = 0;
    let totalItems = 0;
    for (const pair of itemsWithKits) {
      const item = pair.cart_item;
      subtotal += item.line_total || 0;
      totalItems += item.quantity || 0;
    }
    cart.subtotal = subtotal;
    cart.total_items = totalItems;
    if (!cart.currency) cart.currency = 'USD';
    cart.updated_at = this._nowIso();
    return cart;
  }

  _calculatePricingEstimateTotals(event_type, location_city, location_state, participants, duration_minutes, include_lunch, addon_ids, currency) {
    const baseRatePerPersonPerHourByType = {
      in_person: 40,
      virtual: 60,
      workshop: 80
    };
    const ratePerHour = baseRatePerPersonPerHourByType[event_type] || 80;
    const hours = (duration_minutes || 0) / 60;
    const basePerPerson = ratePerHour * hours + (include_lunch ? 30 : 0);
    const base_estimate = basePerPerson * (participants || 0);

    const addonsAll = this._getFromStorage('calculator_addons');
    const addonIdSet = new Set(addon_ids || []);
    let addons_total = 0;

    for (const addon of addonsAll) {
      if (!addonIdSet.has(addon.id)) continue;
      if (addon.price_type === 'per_person') {
        addons_total += addon.price * (participants || 0);
      } else if (addon.price_type === 'flat_rate') {
        addons_total += addon.price;
      }
    }

    const total_estimate = base_estimate + addons_total;

    return {
      base_estimate,
      addons_total,
      total_estimate,
      currency: currency || 'USD'
    };
  }

  // ---------------------- Helper: Event filtering for search ----------------------

  _eventMatchesLocation(event, filters) {
    if (!filters) return true;
    if (filters.location_city && event.location_city) {
      if (event.location_city.toLowerCase() !== String(filters.location_city).toLowerCase()) return false;
    } else if (filters.location_city && !event.location_city) {
      return false;
    }

    if (filters.location_state && event.location_state) {
      if (event.location_state.toLowerCase() !== String(filters.location_state).toLowerCase()) return false;
    } else if (filters.location_state && !event.location_state) {
      return false;
    }

    if (filters.location_country && event.location_country) {
      if (event.location_country.toLowerCase() !== String(filters.location_country).toLowerCase()) return false;
    } else if (filters.location_country && !event.location_country) {
      return false;
    }

    return true;
  }

  _eventMatchesParticipants(event, filters) {
    if (!filters) return true;
    const desiredMin = filters.participants_min;
    const desiredMax = filters.participants_max;

    if (desiredMin == null && desiredMax == null) return true;

    const eventMin = event.min_participants != null ? event.min_participants : 0;
    const eventMax = event.max_participants != null ? event.max_participants : Number.MAX_SAFE_INTEGER;

    const minOk = desiredMax == null ? true : eventMin <= desiredMax;
    const maxOk = desiredMin == null ? true : eventMax >= desiredMin;

    return minOk && maxOk;
  }

  _eventMatchesBudget(event, filters, participantsGuess) {
    if (!filters) return true;
    const hasTotalFilter = filters.budget_total_min != null || filters.budget_total_max != null;
    const hasPerPersonFilter = filters.budget_per_person_min != null || filters.budget_per_person_max != null;

    if (!hasTotalFilter && !hasPerPersonFilter) return true;

    const estimate = this._calculateEventPriceEstimate(event, participantsGuess || 1);
    const total = estimate.total;
    const perPerson = estimate.perPerson;

    if (hasTotalFilter) {
      if (filters.budget_total_min != null && total < filters.budget_total_min) return false;
      if (filters.budget_total_max != null && total > filters.budget_total_max) return false;
    }

    if (hasPerPersonFilter) {
      if (filters.budget_per_person_min != null && perPerson < filters.budget_per_person_min) return false;
      if (filters.budget_per_person_max != null && perPerson > filters.budget_per_person_max) return false;
    }

    return true;
  }

  _eventMatchesDuration(event, filters) {
    if (!filters) return true;
    if (filters.duration_minutes_min == null && filters.duration_minutes_max == null) return true;
    if (event.duration_minutes == null) return false;

    if (filters.duration_minutes_min != null && event.duration_minutes < filters.duration_minutes_min) return false;
    if (filters.duration_minutes_max != null && event.duration_minutes > filters.duration_minutes_max) return false;

    return true;
  }

  _eventMatchesEnvironment(event, filters) {
    if (!filters || !filters.environment) return true;
    if (!event.environment) return false;
    return event.environment === filters.environment;
  }

  _eventMatchesCategoryAndTags(event, filters) {
    if (!filters) return true;

    if (filters.primary_category) {
      const pc = (event.primary_category || '').toLowerCase();
      if (pc !== String(filters.primary_category).toLowerCase()) return false;
    }

    if (filters.tags && filters.tags.length > 0) {
      const eventTags = (event.tags || []).map(t => String(t).toLowerCase());
      const needed = filters.tags.map(t => String(t).toLowerCase());
      let hasAll = true;
      for (const tag of needed) {
        if (!eventTags.includes(tag)) {
          hasAll = false;
          break;
        }
      }
      if (!hasAll) return false;
    }

    if (filters.is_dei_workshop === true) {
      if (!event.is_dei_workshop) return false;
    }

    return true;
  }

  _eventMatchesAvailability(event, filters) {
    if (!filters || (!filters.date_start && !filters.date_end)) return true;

    const dateStart = filters.date_start ? new Date(filters.date_start) : null;
    const dateEnd = filters.date_end ? new Date(filters.date_end) : null;
    if (!dateStart && !dateEnd) return true;

    const avails = this._getEventAvailabilities().filter(a => a.event_id === event.id && a.is_available);
    if (avails.length === 0) return false;

    for (const slot of avails) {
      const s = new Date(slot.start_datetime);
      const e = new Date(slot.end_datetime);

      let within = true;
      if (dateStart && e < dateStart) within = false;
      if (dateEnd && s > dateEnd) within = false;
      if (within) return true;
    }

    return false;
  }

  _computeParticipantsGuess(filters) {
    if (!filters) return 1;
    if (filters.participants_min != null && filters.participants_max != null) {
      return Math.round((filters.participants_min + filters.participants_max) / 2);
    }
    if (filters.participants_max != null) return filters.participants_max;
    if (filters.participants_min != null) return filters.participants_min;
    return 1;
  }

  // ---------------------- Interfaces ----------------------

  // getHomePageContent()
  getHomePageContent() {
    const events = this._getEvents().filter(e => e.is_active !== false);
    const diyKits = this._getFromStorage('diy_kits').filter(k => k.is_active !== false);

    const featured_in_person_events = events.filter(e => e.event_type === 'in_person' && e.is_featured);
    const featured_virtual_events = events.filter(e => e.event_type === 'virtual' && e.is_featured);
    const featured_workshops = events.filter(e => e.event_type === 'workshop' && e.is_featured);

    const featured_diy_kits = diyKits;

    // Derive simple popular themes from event.primary_category
    const themeMap = {};
    for (const ev of events) {
      if (!ev.primary_category) continue;
      const key = String(ev.primary_category).toLowerCase();
      if (!themeMap[key]) {
        themeMap[key] = { name: ev.primary_category, count: 0, example_event_ids: [] };
      }
      themeMap[key].count += 1;
      if (themeMap[key].example_event_ids.length < 3) {
        themeMap[key].example_event_ids.push(ev.id);
      }
    }
    const popular_themes = Object.values(themeMap)
      .sort((a, b) => b.count - a.count)
      .map(t => ({
        name: t.name,
        description: '',
        example_event_ids: t.example_event_ids
      }));

    return {
      featured_in_person_events,
      featured_virtual_events,
      featured_workshops,
      featured_diy_kits,
      popular_themes
    };
  }

  // searchEvents(query, filters, sort_by, page, page_size)
  searchEvents(query, filters, sort_by, page, page_size) {
    const q = query ? String(query).toLowerCase() : '';
    const eventsAll = this._getEvents().filter(e => e.is_active !== false);
    const participantsGuess = this._computeParticipantsGuess(filters || {});

    let results = eventsAll.filter(event => {
      if (filters && filters.event_type && event.event_type !== filters.event_type) return false;

      if (q) {
        const haystack = [
          event.title || '',
          event.description || '',
          event.primary_category || '',
          (event.tags || []).join(' ')
        ]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }

      if (!this._eventMatchesLocation(event, filters)) return false;
      if (!this._eventMatchesParticipants(event, filters)) return false;
      if (!this._eventMatchesBudget(event, filters, participantsGuess)) return false;
      if (!this._eventMatchesDuration(event, filters)) return false;
      if (!this._eventMatchesEnvironment(event, filters)) return false;
      if (!this._eventMatchesCategoryAndTags(event, filters)) return false;
      if (!this._eventMatchesAvailability(event, filters)) return false;

      return true;
    });

    const guessParticipantsForSort = participantsGuess || 1;

    if (sort_by === 'price_asc' || sort_by === 'price_desc') {
      results = results.slice().sort((a, b) => {
        const ea = this._calculateEventPriceEstimate(a, guessParticipantsForSort).total;
        const eb = this._calculateEventPriceEstimate(b, guessParticipantsForSort).total;
        return sort_by === 'price_asc' ? ea - eb : eb - ea;
      });
    } else if (sort_by === 'rating_desc') {
      results = results.slice().sort((a, b) => {
        const ra = a.rating_average != null ? a.rating_average : 0;
        const rb = b.rating_average != null ? b.rating_average : 0;
        return rb - ra;
      });
    } else if (sort_by === 'duration_asc') {
      results = results.slice().sort((a, b) => {
        const da = a.duration_minutes != null ? a.duration_minutes : Number.MAX_SAFE_INTEGER;
        const db = b.duration_minutes != null ? b.duration_minutes : Number.MAX_SAFE_INTEGER;
        return da - db;
      });
    }

    const p = page && page > 0 ? page : 1;
    const size = page_size && page_size > 0 ? page_size : 20;
    const total = results.length;
    const start = (p - 1) * size;
    const end = start + size;
    const pageResults = results.slice(start, end);

    return {
      results: pageResults,
      total,
      page: p,
      page_size: size
    };
  }

  // getEventFilterOptions(context_event_type)
  getEventFilterOptions(context_event_type) {
    let events = this._getEvents().filter(e => e.is_active !== false);
    if (context_event_type) {
      events = events.filter(e => e.event_type === context_event_type);
    }

    const locationsMap = {};
    for (const e of events) {
      const city = e.location_city || '';
      const state = e.location_state || '';
      const country = e.location_country || '';
      const key = [city, state, country].join('|');
      if (!key.trim()) continue;
      if (!locationsMap[key]) {
        locationsMap[key] = {
          city,
          state,
          country,
          label: [city, state, country].filter(Boolean).join(', ')
        };
      }
    }

    const categoriesMap = {};
    for (const e of events) {
      if (!e.primary_category) continue;
      const key = String(e.primary_category).toLowerCase();
      if (!categoriesMap[key]) {
        categoriesMap[key] = {
          key,
          label: e.primary_category
        };
      }
    }

    const locations = Object.values(locationsMap);
    const categories = Object.values(categoriesMap);

    const durations = [
      { min_minutes: 0, max_minutes: 60, label: 'Up to 1 hour' },
      { min_minutes: 60, max_minutes: 90, label: '60-90 minutes' },
      { min_minutes: 90, max_minutes: 120, label: '90-120 minutes' },
      { min_minutes: 120, max_minutes: 180, label: '2-3 hours' },
      { min_minutes: 180, max_minutes: 240, label: '3-4 hours' },
      { min_minutes: 240, max_minutes: null, label: '4+ hours' }
    ];

    const price_ranges_total = [
      { min: 0, max: 1000, label: 'Up to $1,000' },
      { min: 1000, max: 3000, label: '$1,000 - $3,000' },
      { min: 3000, max: 5000, label: '$3,000 - $5,000' },
      { min: 5000, max: 10000, label: '$5,000 - $10,000' },
      { min: 10000, max: null, label: '$10,000+' }
    ];

    const price_ranges_per_person = [
      { min: 0, max: 50, label: 'Up to $50 / person' },
      { min: 50, max: 100, label: '$50 - $100 / person' },
      { min: 100, max: 150, label: '$100 - $150 / person' },
      { min: 150, max: 250, label: '$150 - $250 / person' },
      { min: 250, max: null, label: '$250+ / person' }
    ];

    const environments = ['indoor', 'outdoor', 'mixed'];

    return {
      locations,
      categories,
      durations,
      price_ranges_total,
      price_ranges_per_person,
      environments
    };
  }

  // getEventDetails(eventId)
  getEventDetails(eventId) {
    const events = this._getEvents();
    const event = events.find(e => e.id === eventId) || null;

    if (!event) {
      return {
        event: null,
        price_display: '',
        rating_display: '',
        is_bookable: false,
        is_quoteable: false,
        is_in_wishlist: false,
        is_in_compare_list: false
      };
    }

    let price_display = '';
    if (event.pricing_model === 'per_person') {
      const p = event.base_price_per_person || event.min_price_per_person || 0;
      price_display = '$' + p.toFixed(2) + ' per person';
    } else if (event.pricing_model === 'flat_rate') {
      const t = event.base_price_total || event.min_total_price || 0;
      price_display = 'Flat rate $' + t.toFixed(2);
    } else {
      const t = event.min_total_price || event.base_price_total || 0;
      if (t) price_display = 'From $' + t.toFixed(2);
    }

    let rating_display = '';
    if (event.rating_average != null && event.rating_count != null) {
      rating_display = event.rating_average.toFixed(1) + ' (' + event.rating_count + ' reviews)';
    } else if (event.rating_average != null) {
      rating_display = event.rating_average.toFixed(1);
    }

    const wishlist = this._getOrCreateWishlist();
    const wishlistItems = this._getFromStorage('wishlist_items');
    const is_in_wishlist = wishlistItems.some(wi => wi.wishlist_id === wishlist.id && wi.event_id === event.id);

    const compareList = this._getOrCreateCompareList();
    const compareItems = this._getFromStorage('compare_items');
    const is_in_compare_list = compareItems.some(ci => ci.compare_list_id === compareList.id && ci.event_id === event.id);

    const is_bookable = event.is_active !== false;
    const is_quoteable = event.is_active !== false;

    return {
      event,
      price_display,
      rating_display,
      is_bookable,
      is_quoteable,
      is_in_wishlist,
      is_in_compare_list
    };
  }

  // getEventAvailabilitySlots(eventId, date_start, date_end, participants, timezone)
  getEventAvailabilitySlots(eventId, date_start, date_end, participants, timezone) {
    const avails = this._getEventAvailabilities().filter(a => a.event_id === eventId && a.is_available);

    const start = new Date(date_start);
    const end = new Date(date_end);

    const filtered = avails.filter(slot => {
      const s = new Date(slot.start_datetime);
      const e = new Date(slot.end_datetime);
      if (e < start) return false;
      if (s > end) return false;
      if (participants != null && slot.max_participants != null && slot.max_participants < participants) return false;
      return true;
    });

    if (timezone) {
      return filtered.map(slot => ({
        ...slot,
        timezone: timezone
      }));
    }

    return filtered;
  }

  // addEventToQuoteList(eventId, participants, selected_datetime, note)
  addEventToQuoteList(eventId, participants, selected_datetime, note) {
    const quoteList = this._getOrCreateQuoteList();
    const events = this._getEvents();
    const event = events.find(e => e.id === eventId) || null;
    if (!event) {
      return { success: false, message: 'Event not found', quote_list: quoteList, items: [], total_estimated_price: 0 };
    }

    const items = this._getFromStorage('quote_list_items');

    const est = this._calculateEventPriceEstimate(event, participants);

    const item = {
      id: this._generateId('quote_item'),
      quote_list_id: quoteList.id,
      event_id: eventId,
      participants: participants != null ? participants : null,
      selected_datetime: selected_datetime || null,
      note: note || null,
      estimated_total_price: est.total
    };

    items.push(item);
    this._saveToStorage('quote_list_items', items);

    const quoteLists = this._getFromStorage('quote_lists');
    const idx = quoteLists.findIndex(l => l.id === quoteList.id);
    if (idx !== -1) {
      quoteLists[idx].updated_at = this._nowIso();
      this._saveToStorage('quote_lists', quoteLists);
    }

    const listItems = items.filter(i => i.quote_list_id === quoteList.id).map(i => ({
      item: i,
      event: events.find(e => e.id === i.event_id) || null
    }));

    const total_estimated_price = listItems.reduce((sum, pair) => sum + (pair.item.estimated_total_price || 0), 0);

    return {
      success: true,
      message: 'Event added to quote list',
      quote_list: quoteList,
      items: listItems,
      total_estimated_price
    };
  }

  // getQuoteListSummary()
  getQuoteListSummary() {
    const quoteList = this._getOrCreateQuoteList();
    const items = this._getFromStorage('quote_list_items');
    const events = this._getEvents();

    const listItems = items
      .filter(i => i.quote_list_id === quoteList.id)
      .map(i => {
        const ev = events.find(e => e.id === i.event_id) || null;
        const participants = i.participants || (ev ? ev.min_participants || 1 : 1);
        const est = ev ? this._calculateEventPriceEstimate(ev, participants) : { total: 0, perPerson: 0 };
        const estimated_total_price = i.estimated_total_price != null ? i.estimated_total_price : est.total;
        const estimated_price_per_person = est.perPerson;
        return {
          item: { ...i, estimated_total_price },
          event: ev,
          estimated_total_price,
          estimated_price_per_person
        };
      });

    const list_total_estimated_price = listItems.reduce((sum, li) => sum + (li.estimated_total_price || 0), 0);

    return {
      quote_list: quoteList,
      items: listItems,
      list_total_estimated_price
    };
  }

  // updateQuoteListItem(quoteListItemId, participants, selected_datetime, note)
  updateQuoteListItem(quoteListItemId, participants, selected_datetime, note) {
    const quoteList = this._getOrCreateQuoteList();
    const items = this._getFromStorage('quote_list_items');
    const events = this._getEvents();

    const idx = items.findIndex(i => i.id === quoteListItemId);
    if (idx === -1) {
      return { success: false, message: 'Quote list item not found', quote_list: quoteList, items: [], list_total_estimated_price: 0 };
    }

    const item = items[idx];
    if (participants != null) item.participants = participants;
    if (selected_datetime != null) item.selected_datetime = selected_datetime;
    if (note != null) item.note = note;

    const ev = events.find(e => e.id === item.event_id) || null;
    if (ev) {
      const est = this._calculateEventPriceEstimate(ev, item.participants || ev.min_participants || 1);
      item.estimated_total_price = est.total;
    }

    items[idx] = item;
    this._saveToStorage('quote_list_items', items);

    const quoteLists = this._getFromStorage('quote_lists');
    const qIdx = quoteLists.findIndex(l => l.id === quoteList.id);
    if (qIdx !== -1) {
      quoteLists[qIdx].updated_at = this._nowIso();
      this._saveToStorage('quote_lists', quoteLists);
    }

    const listItems = items
      .filter(i => i.quote_list_id === quoteList.id)
      .map(i => {
        const ev2 = events.find(e => e.id === i.event_id) || null;
        const participants2 = i.participants || (ev2 ? ev2.min_participants || 1 : 1);
        const est2 = ev2 ? this._calculateEventPriceEstimate(ev2, participants2) : { total: 0, perPerson: 0 };
        const estimated_total_price = i.estimated_total_price != null ? i.estimated_total_price : est2.total;
        const estimated_price_per_person = est2.perPerson;
        return {
          item: { ...i, estimated_total_price },
          event: ev2,
          estimated_total_price,
          estimated_price_per_person
        };
      });

    const list_total_estimated_price = listItems.reduce((sum, li) => sum + (li.estimated_total_price || 0), 0);

    return {
      success: true,
      message: 'Quote list item updated',
      quote_list: quoteList,
      items: listItems,
      list_total_estimated_price
    };
  }

  // removeQuoteListItem(quoteListItemId)
  removeQuoteListItem(quoteListItemId) {
    const quoteList = this._getOrCreateQuoteList();
    let items = this._getFromStorage('quote_list_items');
    const events = this._getEvents();

    items = items.filter(i => i.id !== quoteListItemId);
    this._saveToStorage('quote_list_items', items);

    const quoteLists = this._getFromStorage('quote_lists');
    const qIdx = quoteLists.findIndex(l => l.id === quoteList.id);
    if (qIdx !== -1) {
      quoteLists[qIdx].updated_at = this._nowIso();
      this._saveToStorage('quote_lists', quoteLists);
    }

    const listItems = items
      .filter(i => i.quote_list_id === quoteList.id)
      .map(i => {
        const ev = events.find(e => e.id === i.event_id) || null;
        const participants = i.participants || (ev ? ev.min_participants || 1 : 1);
        const est = ev ? this._calculateEventPriceEstimate(ev, participants) : { total: 0, perPerson: 0 };
        const estimated_total_price = i.estimated_total_price != null ? i.estimated_total_price : est.total;
        const estimated_price_per_person = est.perPerson;
        return {
          item: { ...i, estimated_total_price },
          event: ev,
          estimated_total_price,
          estimated_price_per_person
        };
      });

    const list_total_estimated_price = listItems.reduce((sum, li) => sum + (li.estimated_total_price || 0), 0);

    return {
      success: true,
      message: 'Quote list item removed',
      quote_list: quoteList,
      items: listItems,
      list_total_estimated_price
    };
  }

  // submitQuoteRequestForQuoteList(title, message, participants, budget_total_max, budget_per_person_max, preferred_date, preferred_time, contact_name, contact_email, contact_company, contact_phone)
  submitQuoteRequestForQuoteList(title, message, participants, budget_total_max, budget_per_person_max, preferred_date, preferred_time, contact_name, contact_email, contact_company, contact_phone) {
    const quoteList = this._getOrCreateQuoteList();
    const quoteRequests = this._getFromStorage('quote_requests');

    const req = {
      id: this._generateId('quote_request'),
      source: 'quote_list',
      event_id: null,
      quote_list_id: quoteList.id,
      title: title || null,
      message: message || null,
      participants: participants != null ? participants : null,
      budget_total_max: budget_total_max != null ? budget_total_max : null,
      budget_per_person_max: budget_per_person_max != null ? budget_per_person_max : null,
      preferred_date: preferred_date || null,
      preferred_time: preferred_time || null,
      contact_name: contact_name,
      contact_email: contact_email,
      contact_company: contact_company || null,
      contact_phone: contact_phone || null,
      status: 'submitted',
      created_at: this._nowIso(),
      updated_at: this._nowIso()
    };

    quoteRequests.push(req);
    this._saveToStorage('quote_requests', quoteRequests);

    return {
      success: true,
      message: 'Quote request submitted',
      quote_request: req
    };
  }

  // submitQuoteRequestForEvent(eventId, title, message, participants, budget_total_max, budget_per_person_max, preferred_date, preferred_time, contact_name, contact_email, contact_company, contact_phone)
  submitQuoteRequestForEvent(eventId, title, message, participants, budget_total_max, budget_per_person_max, preferred_date, preferred_time, contact_name, contact_email, contact_company, contact_phone) {
    const events = this._getEvents();
    const event = events.find(e => e.id === eventId) || null;
    if (!event) {
      return { success: false, message: 'Event not found', quote_request: null };
    }

    const quoteRequests = this._getFromStorage('quote_requests');

    const req = {
      id: this._generateId('quote_request'),
      source: 'event_detail',
      event_id: eventId,
      quote_list_id: null,
      title: title || null,
      message: message || null,
      participants: participants != null ? participants : null,
      budget_total_max: budget_total_max != null ? budget_total_max : null,
      budget_per_person_max: budget_per_person_max != null ? budget_per_person_max : null,
      preferred_date: preferred_date || null,
      preferred_time: preferred_time || null,
      contact_name: contact_name,
      contact_email: contact_email,
      contact_company: contact_company || null,
      contact_phone: contact_phone || null,
      status: 'submitted',
      created_at: this._nowIso(),
      updated_at: this._nowIso()
    };

    quoteRequests.push(req);
    this._saveToStorage('quote_requests', quoteRequests);

    return {
      success: true,
      message: 'Quote request submitted',
      quote_request: req
    };
  }

  // createBookingDraftFromEvent(eventId, participants, start_datetime, notes)
  createBookingDraftFromEvent(eventId, participants, start_datetime, notes) {
    const events = this._getEvents();
    const event = events.find(e => e.id === eventId) || null;
    if (!event) {
      return { success: false, message: 'Event not found', booking: null };
    }

    let bookings = this._getFromStorage('bookings');

    const est = this._calculateEventPriceEstimate(event, participants);

    const booking = {
      id: this._generateId('booking'),
      event_id: eventId,
      event_title: event.title,
      participants: participants,
      start_datetime: start_datetime,
      duration_minutes: event.duration_minutes || null,
      price_per_person: est.perPerson,
      total_price: est.total,
      status: 'in_progress',
      contact_name: '',
      contact_email: '',
      contact_company: '',
      contact_phone: '',
      notes: notes || null,
      created_at: this._nowIso(),
      updated_at: this._nowIso()
    };

    // Remove previous current booking if any
    const currentId = localStorage.getItem('current_booking_id');
    if (currentId) {
      bookings = bookings.filter(b => b.id !== currentId);
    }

    bookings.push(booking);
    this._saveToStorage('bookings', bookings);
    localStorage.setItem('current_booking_id', booking.id);

    return {
      success: true,
      message: 'Booking draft created',
      booking
    };
  }

  // getCurrentBooking()
  getCurrentBooking() {
    const bookings = this._getFromStorage('bookings');
    const currentId = localStorage.getItem('current_booking_id');
    if (!currentId) {
      return { booking: null, event: null };
    }
    const booking = bookings.find(b => b.id === currentId) || null;
    if (!booking) {
      return { booking: null, event: null };
    }
    const events = this._getEvents();
    const event = events.find(e => e.id === booking.event_id) || null;
    return { booking, event };
  }

  // updateBookingDetails(bookingId, participants, start_datetime, contact_name, contact_email, contact_company, contact_phone, notes)
  updateBookingDetails(bookingId, participants, start_datetime, contact_name, contact_email, contact_company, contact_phone, notes) {
    const bookings = this._getFromStorage('bookings');
    const idx = bookings.findIndex(b => b.id === bookingId);
    if (idx === -1) {
      return { success: false, message: 'Booking not found', booking: null };
    }

    const booking = bookings[idx];
    const events = this._getEvents();
    const event = events.find(e => e.id === booking.event_id) || null;

    if (participants != null) booking.participants = participants;
    if (start_datetime != null) booking.start_datetime = start_datetime;
    if (contact_name != null) booking.contact_name = contact_name;
    if (contact_email != null) booking.contact_email = contact_email;
    if (contact_company != null) booking.contact_company = contact_company;
    if (contact_phone != null) booking.contact_phone = contact_phone;
    if (notes != null) booking.notes = notes;

    if (event) {
      const est = this._calculateEventPriceEstimate(event, booking.participants);
      booking.price_per_person = est.perPerson;
      booking.total_price = est.total;
      if (booking.duration_minutes == null) booking.duration_minutes = event.duration_minutes || null;
    }

    booking.updated_at = this._nowIso();
    bookings[idx] = booking;
    this._saveToStorage('bookings', bookings);

    return {
      success: true,
      message: 'Booking updated',
      booking
    };
  }

  // submitBooking(bookingId)
  submitBooking(bookingId) {
    const bookings = this._getFromStorage('bookings');
    const idx = bookings.findIndex(b => b.id === bookingId);
    if (idx === -1) {
      return { success: false, message: 'Booking not found', booking: null };
    }
    const booking = bookings[idx];
    booking.status = 'submitted';
    booking.updated_at = this._nowIso();
    bookings[idx] = booking;
    this._saveToStorage('bookings', bookings);

    return {
      success: true,
      message: 'Booking submitted',
      booking
    };
  }

  // addEventToCompareList(eventId)
  addEventToCompareList(eventId) {
    const compareList = this._getOrCreateCompareList();
    const events = this._getEvents();
    const event = events.find(e => e.id === eventId) || null;
    if (!event) {
      return { success: false, message: 'Event not found', compare_list: compareList, items: [] };
    }

    const items = this._getFromStorage('compare_items');

    if (!items.some(i => i.compare_list_id === compareList.id && i.event_id === eventId)) {
      const compareItem = {
        id: this._generateId('compare_item'),
        compare_list_id: compareList.id,
        event_id: eventId,
        added_at: this._nowIso()
      };
      items.push(compareItem);
      this._saveToStorage('compare_items', items);
    }

    const listItems = items
      .filter(i => i.compare_list_id === compareList.id)
      .map(i => ({
        compare_item: i,
        event: events.find(e => e.id === i.event_id) || null
      }));

    return {
      success: true,
      message: 'Event added to compare list',
      compare_list: compareList,
      items: listItems
    };
  }

  // getCompareList()
  getCompareList() {
    const compareList = this._getOrCreateCompareList();
    const items = this._getFromStorage('compare_items');
    const events = this._getEvents();

    const listItems = items
      .filter(i => i.compare_list_id === compareList.id)
      .map(i => ({
        compare_item: i,
        event: events.find(e => e.id === i.event_id) || null
      }));

    return {
      compare_list: compareList,
      items: listItems
    };
  }

  // removeCompareListItem(compareItemId)
  removeCompareListItem(compareItemId) {
    const compareList = this._getOrCreateCompareList();
    let items = this._getFromStorage('compare_items');
    const events = this._getEvents();

    items = items.filter(i => i.id !== compareItemId);
    this._saveToStorage('compare_items', items);

    const listItems = items
      .filter(i => i.compare_list_id === compareList.id)
      .map(i => ({
        compare_item: i,
        event: events.find(e => e.id === i.event_id) || null
      }));

    return {
      success: true,
      message: 'Compare list item removed',
      compare_list: compareList,
      items: listItems
    };
  }

  // saveEventToWishlist(eventId, note)
  saveEventToWishlist(eventId, note) {
    const wishlist = this._getOrCreateWishlist();
    const events = this._getEvents();
    const event = events.find(e => e.id === eventId) || null;
    if (!event) {
      return { success: false, message: 'Event not found', wishlist, items: [] };
    }

    const items = this._getFromStorage('wishlist_items');

    if (!items.some(i => i.wishlist_id === wishlist.id && i.event_id === eventId)) {
      const wishlistItem = {
        id: this._generateId('wishlist_item'),
        wishlist_id: wishlist.id,
        event_id: eventId,
        added_at: this._nowIso(),
        note: note || null
      };
      items.push(wishlistItem);
      this._saveToStorage('wishlist_items', items);
    }

    const listItems = items
      .filter(i => i.wishlist_id === wishlist.id)
      .map(i => ({
        wishlist_item: i,
        event: events.find(e => e.id === i.event_id) || null
      }));

    return {
      success: true,
      message: 'Event saved to wishlist',
      wishlist,
      items: listItems
    };
  }

  // getWishlist()
  getWishlist() {
    const wishlist = this._getOrCreateWishlist();
    const items = this._getFromStorage('wishlist_items');
    const events = this._getEvents();

    const listItems = items
      .filter(i => i.wishlist_id === wishlist.id)
      .map(i => ({
        wishlist_item: i,
        event: events.find(e => e.id === i.event_id) || null
      }));

    return {
      wishlist,
      items: listItems
    };
  }

  // removeWishlistItem(wishlistItemId)
  removeWishlistItem(wishlistItemId) {
    const wishlist = this._getOrCreateWishlist();
    let items = this._getFromStorage('wishlist_items');
    const events = this._getEvents();

    items = items.filter(i => i.id !== wishlistItemId);
    this._saveToStorage('wishlist_items', items);

    const listItems = items
      .filter(i => i.wishlist_id === wishlist.id)
      .map(i => ({
        wishlist_item: i,
        event: events.find(e => e.id === i.event_id) || null
      }));

    return {
      success: true,
      message: 'Wishlist item removed',
      wishlist,
      items: listItems
    };
  }

  // moveWishlistItemToQuoteList(wishlistItemId, participants, note)
  moveWishlistItemToQuoteList(wishlistItemId, participants, note) {
    const wishlist = this._getOrCreateWishlist();
    let wishlistItems = this._getFromStorage('wishlist_items');
    const events = this._getEvents();

    const wiIdx = wishlistItems.findIndex(i => i.id === wishlistItemId);
    if (wiIdx === -1) {
      return {
        success: false,
        message: 'Wishlist item not found',
        wishlist,
        wishlist_items: [],
        quote_list: this._getOrCreateQuoteList(),
        quote_items: []
      };
    }

    const wishlistItem = wishlistItems[wiIdx];
    const eventId = wishlistItem.event_id;

    const quoteResult = this.addEventToQuoteList(eventId, participants, null, note || wishlistItem.note || null);

    wishlistItems = wishlistItems.filter(i => i.id !== wishlistItemId);
    this._saveToStorage('wishlist_items', wishlistItems);

    const wishlist_items = wishlistItems
      .filter(i => i.wishlist_id === wishlist.id)
      .map(i => ({
        wishlist_item: i,
        event: events.find(e => e.id === i.event_id) || null
      }));

    return {
      success: quoteResult.success,
      message: quoteResult.message,
      wishlist,
      wishlist_items,
      quote_list: quoteResult.quote_list,
      quote_items: quoteResult.items
    };
  }

  // getPlannerDayPlanSummary()
  getPlannerDayPlanSummary() {
    const { plan, slots } = this._getOrCreatePlannerDayPlan();
    const events = this._getEvents();

    const slotsWithEvents = slots.map(s => ({
      ...s,
      selected_event: s.selected_event_id ? events.find(e => e.id === s.selected_event_id) || null : null
    }));

    const totals = this._calculatePlannerBudgetTotals(plan, slots);

    return {
      day_plan: plan,
      slots: slotsWithEvents,
      estimated_total_price: totals.total,
      estimated_price_per_person: totals.perPerson
    };
  }

  // updatePlannerSlotConstraints(slotId, category, budget_total_max, budget_per_person_max, duration_minutes_min, duration_minutes_max, notes)
  updatePlannerSlotConstraints(slotId, category, budget_total_max, budget_per_person_max, duration_minutes_min, duration_minutes_max, notes) {
    const plans = this._getFromStorage('planner_day_plans');
    const slots = this._getFromStorage('planner_slots');
    const slotIdx = slots.findIndex(s => s.id === slotId);
    if (slotIdx === -1) {
      return { success: false, message: 'Planner slot not found', day_plan: null, slot: null };
    }

    const slot = slots[slotIdx];
    if (category !== undefined) slot.category = category;
    if (budget_total_max !== undefined) slot.budget_total_max = budget_total_max;
    if (budget_per_person_max !== undefined) slot.budget_per_person_max = budget_per_person_max;
    if (duration_minutes_min !== undefined) slot.duration_minutes_min = duration_minutes_min;
    if (duration_minutes_max !== undefined) slot.duration_minutes_max = duration_minutes_max;
    if (notes !== undefined) slot.notes = notes;

    slots[slotIdx] = slot;
    this._saveToStorage('planner_slots', slots);

    const planIdx = plans.findIndex(p => p.id === slot.planner_day_plan_id);
    const plan = planIdx !== -1 ? plans[planIdx] : null;
    if (plan) {
      plan.updated_at = this._nowIso();
      plans[planIdx] = plan;
      this._saveToStorage('planner_day_plans', plans);
    }

    return {
      success: true,
      message: 'Planner slot updated',
      day_plan: plan,
      slot
    };
  }

  // getPlannerSlotRecommendations(slotId, participants)
  getPlannerSlotRecommendations(slotId, participants) {
    const slots = this._getFromStorage('planner_slots');
    const slot = slots.find(s => s.id === slotId) || null;
    if (!slot) {
      return { slot: null, results: [] };
    }

    const filters = {};

    if (slot.duration_minutes_min != null) filters.duration_minutes_min = slot.duration_minutes_min;
    if (slot.duration_minutes_max != null) filters.duration_minutes_max = slot.duration_minutes_max;

    if (slot.budget_total_max != null) filters.budget_total_max = slot.budget_total_max;
    if (slot.budget_per_person_max != null) filters.budget_per_person_max = slot.budget_per_person_max;

    if (participants != null) {
      filters.participants_min = participants;
      filters.participants_max = participants;
    }

    if (slot.category) {
      // Slot category is informational; do not strictly filter by category to keep recommendations broad.
    }

    const searchResult = this.searchEvents(null, filters, 'price_asc', 1, 20);

    return {
      slot,
      results: searchResult.results
    };
  }

  // selectEventForPlannerSlot(slotId, eventId)
  selectEventForPlannerSlot(slotId, eventId) {
    const events = this._getEvents();
    const event = events.find(e => e.id === eventId) || null;
    if (!event) {
      return {
        success: false,
        message: 'Event not found',
        day_plan: null,
        slots: [],
        estimated_total_price: 0,
        estimated_price_per_person: 0
      };
    }

    const plans = this._getFromStorage('planner_day_plans');
    const slots = this._getFromStorage('planner_slots');

    const slotIdx = slots.findIndex(s => s.id === slotId);
    if (slotIdx === -1) {
      return { success: false, message: 'Planner slot not found', day_plan: null, slots: [], estimated_total_price: 0, estimated_price_per_person: 0 };
    }

    const slot = slots[slotIdx];
    slot.selected_event_id = eventId;
    slot.selected_event_title = event.title;
    slots[slotIdx] = slot;
    this._saveToStorage('planner_slots', slots);

    const planIdx = plans.findIndex(p => p.id === slot.planner_day_plan_id);
    const plan = planIdx !== -1 ? plans[planIdx] : null;
    if (plan) {
      plan.updated_at = this._nowIso();
      plans[planIdx] = plan;
      this._saveToStorage('planner_day_plans', plans);
    }

    const planSlots = slots.filter(s => s.planner_day_plan_id === slot.planner_day_plan_id);
    const totals = this._calculatePlannerBudgetTotals(plan, planSlots);

    const slotsWithEvents = planSlots.map(s => ({
      ...s,
      selected_event: s.selected_event_id ? events.find(e => e.id === s.selected_event_id) || null : null
    }));

    return {
      success: true,
      message: 'Event selected for planner slot',
      day_plan: plan,
      slots: slotsWithEvents,
      estimated_total_price: totals.total,
      estimated_price_per_person: totals.perPerson
    };
  }

  // searchDIYKits(filters, sort_by, page, page_size)
  searchDIYKits(filters, sort_by, page, page_size) {
    const kitsAll = this._getFromStorage('diy_kits').filter(k => k.is_active !== false);
    const f = filters || {};

    let results = kitsAll.filter(kit => {
      if (f.min_capacity != null && kit.min_capacity != null && kit.min_capacity < f.min_capacity) return false;
      if (f.max_capacity != null && kit.max_capacity != null && kit.max_capacity > f.max_capacity) {
        // allow kits with larger max capacity; capacity filter is mostly a minimum capacity filter
      }
      if (f.price_min != null && kit.price < f.price_min) return false;
      if (f.price_max != null && kit.price > f.price_max) return false;
      if (f.category && kit.category && String(kit.category).toLowerCase() !== String(f.category).toLowerCase()) return false;
      if (f.category && !kit.category) return false;
      if (f.tags && f.tags.length > 0) {
        const kitTags = (kit.tags || []).map(t => String(t).toLowerCase());
        const needed = f.tags.map(t => String(t).toLowerCase());
        for (const tag of needed) {
          if (!kitTags.includes(tag)) return false;
        }
      }
      return true;
    });

    if (sort_by === 'price_asc' || sort_by === 'price_desc') {
      results = results.slice().sort((a, b) => sort_by === 'price_asc' ? a.price - b.price : b.price - a.price);
    } else if (sort_by === 'name_asc') {
      results = results.slice().sort((a, b) => {
        const na = (a.name || '').toLowerCase();
        const nb = (b.name || '').toLowerCase();
        if (na < nb) return -1;
        if (na > nb) return 1;
        return 0;
      });
    }

    const p = page && page > 0 ? page : 1;
    const size = page_size && page_size > 0 ? page_size : 20;
    const total = results.length;
    const start = (p - 1) * size;
    const end = start + size;
    const pageResults = results.slice(start, end);

    return {
      results: pageResults,
      total,
      page: p,
      page_size: size
    };
  }

  // getDIYKitFilterOptions()
  getDIYKitFilterOptions() {
    const kits = this._getFromStorage('diy_kits').filter(k => k.is_active !== false);

    const capacity_ranges = [
      { min: 1, max: 5, label: 'Up to 5 participants' },
      { min: 5, max: 10, label: '5-10 participants' },
      { min: 10, max: 20, label: '10-20 participants' },
      { min: 20, max: null, label: '20+ participants' }
    ];

    const price_ranges = [
      { min: 0, max: 100, label: 'Up to $100' },
      { min: 100, max: 200, label: '$100 - $200' },
      { min: 200, max: 400, label: '$200 - $400' },
      { min: 400, max: null, label: '$400+' }
    ];

    const themesSet = new Set();
    for (const kit of kits) {
      if (kit.category) themesSet.add(String(kit.category));
      (kit.tags || []).forEach(t => themesSet.add(String(t)));
    }
    const themes = Array.from(themesSet);

    return {
      capacity_ranges,
      price_ranges,
      themes
    };
  }

  // getDIYKitDetails(kitId)
  getDIYKitDetails(kitId) {
    const kits = this._getFromStorage('diy_kits').filter(k => k.is_active !== false);
    const kit = kits.find(k => k.id === kitId) || null;
    if (!kit) {
      return { kit: null, related_kits: [] };
    }

    const related_kits = kits.filter(k => k.id !== kitId && (k.category === kit.category || (k.tags || []).some(t => (kit.tags || []).includes(t))));

    return {
      kit,
      related_kits
    };
  }

  // addKitToCart(kitId, quantity)
  addKitToCart(kitId, quantity) {
    const qty = quantity != null ? quantity : 1;
    const cart = this._getOrCreateCart();
    const kits = this._getFromStorage('diy_kits');
    const kit = kits.find(k => k.id === kitId) || null;
    if (!kit) {
      return { success: false, message: 'Kit not found', cart, items: [] };
    }

    let items = this._getFromStorage('cart_items');

    const existingIdx = items.findIndex(i => i.cart_id === cart.id && i.kit_id === kitId);
    if (existingIdx !== -1) {
      const existing = items[existingIdx];
      existing.quantity += qty;
      existing.line_total = existing.quantity * existing.unit_price;
      items[existingIdx] = existing;
    } else {
      const item = {
        id: this._generateId('cart_item'),
        cart_id: cart.id,
        kit_id: kitId,
        quantity: qty,
        unit_price: kit.price,
        line_total: kit.price * qty,
        name: kit.name
      };
      items.push(item);
    }

    this._saveToStorage('cart_items', items);

    const itemsWithKits = items
      .filter(i => i.cart_id === cart.id)
      .map(i => ({
        cart_item: i,
        kit: kits.find(k => k.id === i.kit_id) || null
      }));

    const updatedCart = this._calculateCartTotals(cart, itemsWithKits);

    const carts = this._getFromStorage('carts');
    const cIdx = carts.findIndex(c => c.id === updatedCart.id);
    if (cIdx !== -1) {
      carts[cIdx] = updatedCart;
      this._saveToStorage('carts', carts);
    }

    return {
      success: true,
      message: 'Kit added to cart',
      cart: updatedCart,
      items: itemsWithKits
    };
  }

  // getCart()
  getCart() {
    const cart = this._getOrCreateCart();
    const items = this._getFromStorage('cart_items');
    const kits = this._getFromStorage('diy_kits');

    const itemsWithKits = items
      .filter(i => i.cart_id === cart.id)
      .map(i => ({
        cart_item: i,
        kit: kits.find(k => k.id === i.kit_id) || null
      }));

    const updatedCart = this._calculateCartTotals(cart, itemsWithKits);

    const carts = this._getFromStorage('carts');
    const cIdx = carts.findIndex(c => c.id === updatedCart.id);
    if (cIdx !== -1) {
      carts[cIdx] = updatedCart;
      this._saveToStorage('carts', carts);
    }

    return {
      cart: updatedCart,
      items: itemsWithKits
    };
  }

  // updateCartItemQuantity(cartItemId, quantity)
  updateCartItemQuantity(cartItemId, quantity) {
    const cart = this._getOrCreateCart();
    let items = this._getFromStorage('cart_items');
    const kits = this._getFromStorage('diy_kits');

    const idx = items.findIndex(i => i.id === cartItemId);
    if (idx === -1) {
      return { success: false, message: 'Cart item not found', cart, items: [] };
    }

    if (quantity <= 0) {
      items = items.filter(i => i.id !== cartItemId);
    } else {
      const item = items[idx];
      item.quantity = quantity;
      item.line_total = item.unit_price * quantity;
      items[idx] = item;
    }

    this._saveToStorage('cart_items', items);

    const itemsWithKits = items
      .filter(i => i.cart_id === cart.id)
      .map(i => ({
        cart_item: i,
        kit: kits.find(k => k.id === i.kit_id) || null
      }));

    const updatedCart = this._calculateCartTotals(cart, itemsWithKits);

    const carts = this._getFromStorage('carts');
    const cIdx = carts.findIndex(c => c.id === updatedCart.id);
    if (cIdx !== -1) {
      carts[cIdx] = updatedCart;
      this._saveToStorage('carts', carts);
    }

    return {
      success: true,
      message: 'Cart updated',
      cart: updatedCart,
      items: itemsWithKits
    };
  }

  // removeCartItem(cartItemId)
  removeCartItem(cartItemId) {
    const cart = this._getOrCreateCart();
    let items = this._getFromStorage('cart_items');
    const kits = this._getFromStorage('diy_kits');

    items = items.filter(i => i.id !== cartItemId);
    this._saveToStorage('cart_items', items);

    const itemsWithKits = items
      .filter(i => i.cart_id === cart.id)
      .map(i => ({
        cart_item: i,
        kit: kits.find(k => k.id === i.kit_id) || null
      }));

    const updatedCart = this._calculateCartTotals(cart, itemsWithKits);

    const carts = this._getFromStorage('carts');
    const cIdx = carts.findIndex(c => c.id === updatedCart.id);
    if (cIdx !== -1) {
      carts[cIdx] = updatedCart;
      this._saveToStorage('carts', carts);
    }

    return {
      success: true,
      message: 'Cart item removed',
      cart: updatedCart,
      items: itemsWithKits
    };
  }

  // searchArticles(query, filters, page, page_size)
  searchArticles(query, filters, page, page_size) {
    const q = query ? String(query).toLowerCase() : '';
    const f = filters || {};
    const articlesAll = this._getFromStorage('articles').filter(a => a.is_published !== false);

    let results = articlesAll.filter(article => {
      if (q) {
        const haystack = [
          article.title || '',
          article.excerpt || '',
          article.content || ''
        ]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }

      if (f.primary_topic && article.primary_topic && String(article.primary_topic).toLowerCase() !== String(f.primary_topic).toLowerCase()) return false;
      if (f.primary_topic && !article.primary_topic) return false;

      if (f.audience && article.audience && String(article.audience).toLowerCase() !== String(f.audience).toLowerCase()) return false;
      if (f.audience && !article.audience) return false;

      if (f.tag) {
        const tags = (article.tags || []).map(t => String(t).toLowerCase());
        if (!tags.includes(String(f.tag).toLowerCase())) return false;
      }

      if (f.min_tip_count != null) {
        const tc = article.tip_count != null ? article.tip_count : 0;
        if (tc < f.min_tip_count) return false;
      }

      return true;
    });

    const p = page && page > 0 ? page : 1;
    const size = page_size && page_size > 0 ? page_size : 20;
    const total = results.length;
    const start = (p - 1) * size;
    const end = start + size;
    const pageResults = results.slice(start, end);

    return {
      results: pageResults,
      total,
      page: p,
      page_size: size
    };
  }

  // getArticleDetails(articleId)
  getArticleDetails(articleId) {
    const articles = this._getFromStorage('articles');
    const article = articles.find(a => a.id === articleId) || null;
    if (!article) {
      return { article: null, related_articles: [] };
    }

    const related_articles = articles.filter(a => {
      if (a.id === articleId) return false;
      if (a.primary_topic && article.primary_topic && a.primary_topic === article.primary_topic) return true;
      const tagsA = new Set((a.tags || []).map(t => String(t)));
      const tagsB = new Set((article.tags || []).map(t => String(t)));
      for (const t of tagsA) {
        if (tagsB.has(t)) return true;
      }
      return false;
    });

    return {
      article,
      related_articles
    };
  }

  // subscribeToNewsletterFromArticle(articleId, email, name)
  subscribeToNewsletterFromArticle(articleId, email, name) {
    const subs = this._getFromStorage('newsletter_subscriptions');

    const subscription = {
      id: this._generateId('subscription'),
      email: email,
      name: name || null,
      source: 'article_page',
      article_id: articleId || null,
      subscribed_at: this._nowIso(),
      status: 'subscribed'
    };

    subs.push(subscription);
    this._saveToStorage('newsletter_subscriptions', subs);

    return {
      success: true,
      message: 'Subscribed to newsletter',
      subscription
    };
  }

  // getCalculatorAddons(event_type)
  getCalculatorAddons(event_type) {
    let addons = this._getFromStorage('calculator_addons');
    // No event_type field on addons; return all for now
    return {
      addons
    };
  }

  // calculatePricingEstimate(event_type, location_city, location_state, participants, duration_minutes, include_lunch, addon_ids, currency)
  calculatePricingEstimate(event_type, location_city, location_state, participants, duration_minutes, include_lunch, addon_ids, currency) {
    const totals = this._calculatePricingEstimateTotals(event_type, location_city, location_state, participants, duration_minutes, include_lunch, addon_ids, currency);
    return totals;
  }

  // savePricingEstimate(name, event_type, location_city, location_state, participants, duration_minutes, include_lunch, addon_ids, base_estimate, addons_total, total_estimate, currency)
  savePricingEstimate(name, event_type, location_city, location_state, participants, duration_minutes, include_lunch, addon_ids, base_estimate, addons_total, total_estimate, currency) {
    let base = base_estimate;
    let addons = addons_total;
    let total = total_estimate;

    if (total == null) {
      const totals = this._calculatePricingEstimateTotals(event_type, location_city, location_state, participants, duration_minutes, include_lunch, addon_ids, currency);
      base = totals.base_estimate;
      addons = totals.addons_total;
      total = totals.total_estimate;
      currency = totals.currency;
    }

    const estimates = this._getFromStorage('pricing_estimates');

    const estimate = {
      id: this._generateId('pricing_estimate'),
      name,
      event_type,
      location_city: location_city || null,
      location_state: location_state || null,
      participants,
      duration_minutes,
      include_lunch: !!include_lunch,
      addon_ids: addon_ids || [],
      base_estimate: base,
      addons_total: addons,
      total_estimate: total,
      currency: currency || 'USD',
      created_at: this._nowIso(),
      updated_at: this._nowIso()
    };

    estimates.push(estimate);
    this._saveToStorage('pricing_estimates', estimates);

    return {
      success: true,
      message: 'Pricing estimate saved',
      pricing_estimate: estimate
    };
  }

  // submitEventInquiry(eventId, participants, message, preferred_date_start, preferred_date_end, contact_name, contact_email, contact_company)
  submitEventInquiry(eventId, participants, message, preferred_date_start, preferred_date_end, contact_name, contact_email, contact_company) {
    const events = this._getEvents();
    const event = events.find(e => e.id === eventId) || null;
    if (!event) {
      return { success: false, message: 'Event not found', inquiry: null };
    }

    const inquiries = this._getFromStorage('event_inquiries');

    const inquiry = {
      id: this._generateId('event_inquiry'),
      event_id: eventId,
      participants: participants != null ? participants : null,
      message: message || null,
      preferred_date_start: preferred_date_start || null,
      preferred_date_end: preferred_date_end || null,
      contact_name: contact_name || null,
      contact_email: contact_email,
      contact_company: contact_company || null,
      status: 'submitted',
      created_at: this._nowIso(),
      updated_at: this._nowIso()
    };

    inquiries.push(inquiry);
    this._saveToStorage('event_inquiries', inquiries);

    return {
      success: true,
      message: 'Event inquiry submitted',
      inquiry
    };
  }

  // getAboutPageContent()
  getAboutPageContent() {
    return {
      mission: 'We design impactful team building experiences that connect people and accelerate collaboration.',
      values: [
        'Inclusivity',
        'Creativity',
        'Learning by doing',
        'Simplicity'
      ],
      team_building_philosophy: 'We believe the best team building experiences are psychologically safe, purpose-driven, and tailored to each organization\'s culture.',
      expertise_areas: [
        'In-person offsites and retreats',
        'Virtual and hybrid team events',
        'Leadership workshops',
        'Diversity, equity, and inclusion programs'
      ],
      client_logos: [],
      testimonials: [],
      case_studies: []
    };
  }

  // submitContactQuoteRequest(title, message, participants, budget_total_max, preferred_date, preferred_time, contact_name, contact_email, contact_company, contact_phone)
  submitContactQuoteRequest(title, message, participants, budget_total_max, preferred_date, preferred_time, contact_name, contact_email, contact_company, contact_phone) {
    const quoteRequests = this._getFromStorage('quote_requests');

    const req = {
      id: this._generateId('quote_request'),
      source: 'contact_page',
      event_id: null,
      quote_list_id: null,
      title: title || null,
      message: message || null,
      participants: participants != null ? participants : null,
      budget_total_max: budget_total_max != null ? budget_total_max : null,
      budget_per_person_max: null,
      preferred_date: preferred_date || null,
      preferred_time: preferred_time || null,
      contact_name: contact_name,
      contact_email: contact_email,
      contact_company: contact_company || null,
      contact_phone: contact_phone || null,
      status: 'submitted',
      created_at: this._nowIso(),
      updated_at: this._nowIso()
    };

    quoteRequests.push(req);
    this._saveToStorage('quote_requests', quoteRequests);

    return {
      success: true,
      message: 'Contact quote request submitted',
      quote_request: req
    };
  }

  // getFAQEntries(category)
  getFAQEntries(category) {
    const faqs = [
      {
        question: 'How far in advance should we book an in-person event?',
        answer: 'We recommend booking 4-6 weeks in advance for in-person events to secure your preferred date and time.',
        category: 'in_person'
      },
      {
        question: 'Can you support fully remote teams in multiple time zones?',
        answer: 'Yes. Our virtual events are designed for distributed teams and we can help find times that work across time zones.',
        category: 'virtual_events'
      },
      {
        question: 'What is your cancellation policy?',
        answer: 'Cancellation policies vary by event but typically allow rescheduling up to 7 days before the event date.',
        category: 'cancellation'
      }
    ];

    if (!category) return faqs;
    const cat = String(category).toLowerCase();
    return faqs.filter(f => String(f.category).toLowerCase() === cat);
  }

  // getPrivacyPolicy()
  getPrivacyPolicy() {
    return {
      content_html: '<p>We respect your privacy and only use your information to respond to inquiries, fulfill bookings, and improve our services.</p>',
      last_updated: '2024-01-01'
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
