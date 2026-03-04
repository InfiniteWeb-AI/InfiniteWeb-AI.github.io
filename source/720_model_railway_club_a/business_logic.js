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
    this._ensureSingleUserState();
  }

  // =====================
  // Initialization & Utils
  // =====================

  _initStorage() {
    // Legacy/example keys from template
    if (!localStorage.getItem('users')) {
      localStorage.setItem('users', JSON.stringify([]));
    }
    if (!localStorage.getItem('products')) {
      localStorage.setItem('products', JSON.stringify([]));
    }
    if (!localStorage.getItem('carts')) {
      localStorage.setItem('carts', JSON.stringify([]));
    }
    if (!localStorage.getItem('cartItems')) {
      localStorage.setItem('cartItems', JSON.stringify([]));
    }

    // Domain storage keys (entities)
    const keys = [
      'events',
      'ticket_categories',
      'ticket_options',
      'cart',
      'cart_items',
      'membership_plans',
      'membership_applications',
      'layouts',
      'favorite_layouts',
      'product_categories',
      'shipping_methods',
      'workshops',
      'workshop_sessions',
      'workshop_bookings',
      'talks',
      'schedule_items',
      'parking_options',
      'visit_notes',
      'donation_funds',
      'donations',
      'policy_articles',
      'contact_inquiries'
    ];

    keys.forEach((key) => {
      if (!localStorage.getItem(key)) {
        // Default to empty array; some (like 'cart') will be converted to object lazily
        localStorage.setItem(key, JSON.stringify([]));
      }
    });

    // ID counter
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

  _parseDate(value) {
    if (!value) return null;
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  _formatDateISO(date) {
    if (!date) return null;
    const d = date instanceof Date ? date : this._parseDate(date);
    if (!d) return null;
    return d.toISOString();
  }

  _dateToYMD(date) {
    const d = date instanceof Date ? date : this._parseDate(date);
    if (!d) return null;
    // Use UTC to avoid timezone-dependent date shifts
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const da = String(d.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${da}`;
  }

  _getDayLabel(date) {
    const d = date instanceof Date ? date : this._parseDate(date);
    if (!d) return '';
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return days[d.getDay()];
  }

  _ensureSingleUserState() {
    // Migrate legacy plural carts -> single cart if needed
    const legacyCarts = this._getFromStorage('carts', []);
    let cart = this._getFromStorage('cart', null);

    if ((!cart || Array.isArray(cart)) && legacyCarts && legacyCarts.length > 0) {
      cart = legacyCarts[0];
      this._saveToStorage('cart', cart);
    }
  }

  // =====================
  // Cart helpers
  // =====================

  _getOrCreateCart() {
    let cart = this._getFromStorage('cart', null);
    if (!cart || Array.isArray(cart)) {
      cart = {
        id: this._generateId('cart'),
        shippingMethodId: null,
        shipping_method_code: null,
        shipping_cost: 0,
        currency: null,
        merchandise_subtotal: 0,
        tickets_subtotal: 0,
        marketplace_subtotal: 0,
        total: 0,
        created_at: new Date().toISOString(),
        updated_at: null
      };
      this._saveToStorage('cart', cart);
    }
    return cart;
  }

  // Backwards compatibility with template naming
  _findOrCreateCart() {
    return this._getOrCreateCart();
  }

  _recalculateCartTotals(cart, cartItemsAll) {
    const cartItems = (cartItemsAll || this._getFromStorage('cart_items', [])).filter(
      (ci) => ci.cartId === cart.id
    );

    let merchandise_subtotal = 0;
    let tickets_subtotal = 0;
    let marketplace_subtotal = 0;

    cartItems.forEach((ci) => {
      if (ci.item_type === 'ticket' || ci.item_type === 'workshop_booking') {
        tickets_subtotal += ci.line_subtotal || 0;
      } else if (ci.item_type === 'marketplace_product') {
        marketplace_subtotal += ci.line_subtotal || 0;
      } else if (ci.item_type === 'shop_product') {
        merchandise_subtotal += ci.line_subtotal || 0;
      }
    });

    // Determine currency from first item if not set
    if (!cart.currency && cartItems.length > 0) {
      cart.currency = cartItems[0].currency || null;
    }

    const shippingMethods = this._getFromStorage('shipping_methods', []);
    let shipping_cost = 0;
    let shipping_method_code = null;

    if (cart.shippingMethodId) {
      const method = shippingMethods.find((m) => m.id === cart.shippingMethodId);
      if (method) {
        shipping_cost = method.price || 0;
        shipping_method_code = method.code || null;
      }
    }

    cart.merchandise_subtotal = merchandise_subtotal;
    cart.tickets_subtotal = tickets_subtotal;
    cart.marketplace_subtotal = marketplace_subtotal;
    cart.shipping_cost = shipping_cost;
    cart.shipping_method_code = shipping_method_code;
    cart.total = merchandise_subtotal + tickets_subtotal + marketplace_subtotal + shipping_cost;
    cart.updated_at = new Date().toISOString();

    this._saveToStorage('cart', cart);
    return cart;
  }

  // =====================
  // Membership helpers
  // =====================

  _validateMembershipInterestAreas(interest_area_1, interest_area_2) {
    const allowed = [
      'scenic_modeling',
      'digital_control_dcc',
      'youth_projects',
      'historical_research',
      'operations',
      'photography_videography'
    ];
    const errors = [];

    if (!allowed.includes(interest_area_1)) {
      errors.push({ field: 'interest_area_1', message: 'Invalid interest area 1' });
    }
    if (!allowed.includes(interest_area_2)) {
      errors.push({ field: 'interest_area_2', message: 'Invalid interest area 2' });
    }
    if (interest_area_1 && interest_area_2 && interest_area_1 === interest_area_2) {
      errors.push({ field: 'interest_area_2', message: 'Interest areas must be distinct' });
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  // =====================
  // Events / Exhibitions
  // =====================

  _findNextMainExhibition() {
    const events = this._getFromStorage('events', []);
    const now = new Date();

    const candidates = events.filter((e) => {
      if (!e) return false;
      const isMain = !!e.is_main_exhibition;
      const statusOk = e.status === 'scheduled';
      const start = this._parseDate(e.start_date);
      return isMain && statusOk && start && start >= now;
    });

    if (candidates.length === 0) return null;

    candidates.sort((a, b) => {
      const da = this._parseDate(a.start_date) || new Date(8640000000000000);
      const db = this._parseDate(b.start_date) || new Date(8640000000000000);
      return da - db;
    });

    return candidates[0];
  }

  getHomepageOverview() {
    const layouts = this._getFromStorage('layouts', []);
    const workshops = this._getFromStorage('workshops', []);
    const workshopSessions = this._getFromStorage('workshop_sessions', []);
    const membershipPlans = this._getFromStorage('membership_plans', []);
    const donationFunds = this._getFromStorage('donation_funds', []);

    const nextEvent = this._findNextMainExhibition();

    let next_main_exhibition = null;
    if (nextEvent) {
      const start = this._parseDate(nextEvent.start_date);
      const end = this._parseDate(nextEvent.end_date);
      const startLabel = this._dateToYMD(start);
      const endLabel = this._dateToYMD(end);
      const date_range_label = startLabel && endLabel ? `${startLabel} to ${endLabel}` : '';

      next_main_exhibition = {
        event_id: nextEvent.id,
        name: nextEvent.name,
        start_date: nextEvent.start_date,
        end_date: nextEvent.end_date,
        venue_name: nextEvent.venue_name || '',
        venue_address: nextEvent.venue_address || '',
        highlight_text: nextEvent.highlight_text || '',
        status: nextEvent.status,
        is_main_exhibition: !!nextEvent.is_main_exhibition,
        date_range_label
      };
    }

    const featured_layouts = layouts
      .filter((l) => !!l.is_featured)
      .map((l) => ({
        layout_id: l.id,
        title: l.title,
        scale: l.scale,
        era: l.era,
        rating: l.rating,
        thumbnail_url: l.thumbnail_url || '',
        is_featured: !!l.is_featured
      }));

    const top_rated_layouts = layouts
      .slice()
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
      .slice(0, 10)
      .map((l) => ({
        layout_id: l.id,
        title: l.title,
        scale: l.scale,
        era: l.era,
        rating: l.rating,
        thumbnail_url: l.thumbnail_url || ''
      }));

    // Workshop teasers: get next upcoming session per workshop
    const workshop_teasers = workshops.map((w) => {
      const sessionsForWorkshop = workshopSessions
        .filter((s) => s.workshopId === w.id && s.status === 'scheduled')
        .slice()
        .sort((a, b) => {
          const da = this._parseDate(a.start_datetime) || new Date(8640000000000000);
          const db = this._parseDate(b.start_datetime) || new Date(8640000000000000);
          return da - db;
        });

      const nextSession = sessionsForWorkshop[0];

      return {
        workshop_id: w.id,
        title: w.title,
        level: w.level,
        min_age: w.min_age || null,
        max_age: w.max_age || null,
        is_child_friendly: !!w.is_child_friendly,
        next_session_start: nextSession ? nextSession.start_datetime : null
      };
    });

    // Membership highlight: prefer adult_annual, else first active
    let membership_highlight = null;
    const activePlans = membershipPlans.filter((p) => p.is_active !== false);
    let plan = activePlans.find((p) => p.code === 'adult_annual');
    if (!plan) plan = activePlans[0];
    if (plan) {
      membership_highlight = {
        membershipPlanId: plan.id,
        code: plan.code,
        name: plan.name,
        description: plan.description || '',
        duration_months: plan.duration_months,
        price: plan.price,
        currency: plan.currency
      };
    }

    // Donation highlight: prefer youth_projects, else first active
    let donate_highlight = null;
    const activeFunds = donationFunds.filter((f) => f.is_active !== false);
    let fund = activeFunds.find((f) => f.code === 'youth_projects');
    if (!fund) fund = activeFunds[0];
    if (fund) {
      donate_highlight = {
        donationFundId: fund.id,
        code: fund.code,
        name: fund.name,
        description: fund.description || ''
      };
    }

    return {
      club_intro: '', // No mocked content; expected to be filled by site
      next_main_exhibition,
      featured_layouts,
      top_rated_layouts,
      workshop_teasers,
      membership_highlight,
      donate_highlight
    };
  }

  getEventsList(filters) {
    filters = filters || {};
    const events = this._getFromStorage('events', []);

    const result = events.filter((e) => {
      if (!e) return false;

      if (filters.status && e.status !== filters.status) return false;

      if (filters.is_main_exhibition_only && !e.is_main_exhibition) return false;

      const start = this._parseDate(e.start_date);
      const end = this._parseDate(e.end_date);

      if (filters.start_date) {
        const filterStart = this._parseDate(filters.start_date);
        if (start && filterStart && start < filterStart) return false;
      }

      if (filters.end_date) {
        const filterEnd = this._parseDate(filters.end_date);
        if (end && filterEnd && end > filterEnd) return false;
      }

      if (filters.month) {
        const [y, m] = filters.month.split('-').map((v) => parseInt(v, 10));
        if (!start) return false;
        const sm = start.getMonth() + 1;
        const sy = start.getFullYear();
        if (sy !== y || sm !== m) return false;
      }

      if (filters.day_of_week) {
        // Check if event spans the requested day of week
        const day = String(filters.day_of_week).toLowerCase();
        if (start && end) {
          let hasDay = false;
          let d = new Date(start.getTime());
          while (d <= end) {
            if (this._getDayLabel(d) === day) {
              hasDay = true;
              break;
            }
            d.setDate(d.getDate() + 1);
          }
          if (!hasDay) return false;
        }
      }

      return true;
    });

    const mapped = result.map((e) => {
      const start = this._parseDate(e.start_date);
      const end = this._parseDate(e.end_date);

      const day_labels = [];
      if (start && end) {
        let d = new Date(start.getTime());
        while (d <= end) {
          const label = this._getDayLabel(d);
          if (!day_labels.includes(label)) day_labels.push(label);
          d.setDate(d.getDate() + 1);
        }
      }

      return {
        event_id: e.id,
        name: e.name,
        start_date: e.start_date,
        end_date: e.end_date,
        venue_name: e.venue_name || '',
        venue_address: e.venue_address || '',
        status: e.status,
        is_main_exhibition: !!e.is_main_exhibition,
        highlight_text: e.highlight_text || '',
        day_labels
      };
    });

    return { events: mapped };
  }

  getEventDetail(eventId) {
    const events = this._getFromStorage('events', []);
    const e = events.find((ev) => ev.id === eventId);
    if (!e) {
      return {
        event_id: null,
        name: '',
        slug: '',
        description: '',
        venue_name: '',
        venue_address: '',
        start_date: null,
        end_date: null,
        status: null,
        is_main_exhibition: false,
        highlight_text: '',
        date_range_label: '',
        open_days: []
      };
    }

    const start = this._parseDate(e.start_date);
    const end = this._parseDate(e.end_date);
    const date_range_label = start && end ? `${this._dateToYMD(start)} to ${this._dateToYMD(end)}` : '';

    const open_days = [];
    if (start && end) {
      let d = new Date(start.getTime());
      while (d <= end) {
        open_days.push({
          date: this._dateToYMD(d),
          day_label: this._getDayLabel(d),
          is_weekend: [0, 6].includes(d.getDay())
        });
        d.setDate(d.getDate() + 1);
      }
    }

    return {
      event_id: e.id,
      name: e.name,
      slug: e.slug || '',
      description: e.description || '',
      venue_name: e.venue_name || '',
      venue_address: e.venue_address || '',
      start_date: e.start_date,
      end_date: e.end_date,
      status: e.status,
      is_main_exhibition: !!e.is_main_exhibition,
      highlight_text: e.highlight_text || '',
      date_range_label,
      open_days
    };
  }

  getEventTicketOptions(eventId, visit_date, ticket_category_code, include_sold_out) {
    const ticketCategories = this._getFromStorage('ticket_categories', []);
    const ticketOptions = this._getFromStorage('ticket_options', []);

    let filteredOptions = ticketOptions.filter((opt) => opt.eventId === eventId);

    if (!include_sold_out) {
      filteredOptions = filteredOptions.filter((opt) => opt.is_available !== false);
    }

    if (visit_date) {
      filteredOptions = filteredOptions.filter((opt) => {
        const vd = this._dateToYMD(opt.visit_date);
        return vd === visit_date;
      });
    }

    if (ticket_category_code) {
      const allowedCategoryIds = ticketCategories
        .filter((tc) => tc.code === ticket_category_code)
        .map((tc) => tc.id);
      filteredOptions = filteredOptions.filter((opt) => allowedCategoryIds.includes(opt.ticketCategoryId));
    }

    // Determine categories actually used
    const usedCategoryIds = Array.from(new Set(filteredOptions.map((opt) => opt.ticketCategoryId)));
    const categoriesResult = usedCategoryIds
      .map((id) => ticketCategories.find((tc) => tc.id === id))
      .filter(Boolean)
      .map((tc) => ({
        ticketCategoryId: tc.id,
        code: tc.code,
        label: tc.label,
        description: tc.description || ''
      }));

    // Mark cheapest per category
    const cheapestByCategory = {};
    usedCategoryIds.forEach((catId) => {
      const forCat = filteredOptions.filter((opt) => opt.ticketCategoryId === catId);
      if (forCat.length === 0) return;
      const minPrice = Math.min.apply(
        null,
        forCat.map((o) => o.price || 0)
      );
      cheapestByCategory[catId] = minPrice;
    });

    const ticket_options = filteredOptions.map((opt) => {
      const cat = ticketCategories.find((tc) => tc.id === opt.ticketCategoryId) || null;
      const visitDateYmd = this._dateToYMD(opt.visit_date);
      const start = this._parseDate(opt.entry_start_datetime);
      const end = this._parseDate(opt.entry_end_datetime);
      let time_slot_label = opt.time_slot_label || '';
      if (!time_slot_label && opt.is_time_slot && start && end) {
        const pad = (n) => String(n).padStart(2, '0');
        const sLabel = `${pad(start.getHours())}:${pad(start.getMinutes())}`;
        const eLabel = `${pad(end.getHours())}:${pad(end.getMinutes())}`;
        time_slot_label = `${sLabel} - ${eLabel}`;
      }

      const is_cheapest_for_category =
        typeof cheapestByCategory[opt.ticketCategoryId] === 'number' &&
        opt.price === cheapestByCategory[opt.ticketCategoryId];

      const optionObj = {
        ticketOptionId: opt.id,
        name: opt.name,
        description: opt.description || '',
        ticketCategoryId: opt.ticketCategoryId,
        category_code: cat ? cat.code : null,
        category_label: cat ? cat.label : null,
        visit_date: visitDateYmd,
        entry_start_datetime: opt.entry_start_datetime || null,
        entry_end_datetime: opt.entry_end_datetime || null,
        is_time_slot: !!opt.is_time_slot,
        is_day_ticket: !!opt.is_day_ticket,
        time_slot_label,
        price: opt.price,
        currency: opt.currency,
        is_available: opt.is_available !== false,
        remaining_capacity: opt.remaining_capacity,
        max_per_order: opt.max_per_order,
        is_cheapest_for_category
      };

      // Foreign key resolution for ticketCategoryId
      optionObj.ticketCategory = cat;

      return optionObj;
    });

    return {
      event_id: eventId,
      visit_date: visit_date || null,
      ticket_categories: categoriesResult,
      ticket_options
    };
  }

  addTicketToCart(ticketOptionId, quantity) {
    quantity = typeof quantity === 'number' && quantity > 0 ? quantity : 1;
    const ticketOptions = this._getFromStorage('ticket_options', []);
    const opt = ticketOptions.find((o) => o.id === ticketOptionId);

    if (!opt) {
      return { success: false, message: 'Ticket option not found', cart: null };
    }

    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items', []);

    // Merge with existing same ticketOptionId if present
    let item = cartItems.find(
      (ci) => ci.cartId === cart.id && ci.item_type === 'ticket' && ci.ticketOptionId === ticketOptionId
    );

    const eventDate = this._dateToYMD(opt.visit_date);
    const start = this._parseDate(opt.entry_start_datetime);
    const end = this._parseDate(opt.entry_end_datetime);
    let time_slot_label = opt.time_slot_label || '';
    if (!time_slot_label && opt.is_time_slot && start && end) {
      const pad = (n) => String(n).padStart(2, '0');
      const sLabel = `${pad(start.getHours())}:${pad(start.getMinutes())}`;
      const eLabel = `${pad(end.getHours())}:${pad(end.getMinutes())}`;
      time_slot_label = `${sLabel} - ${eLabel}`;
    }

    if (item) {
      item.quantity += quantity;
      item.line_subtotal = item.unit_price * item.quantity;
      item.event_date = eventDate;
      item.time_slot_label = time_slot_label;
      item.options_summary = time_slot_label ? `Entry ${time_slot_label}` : '';
      item.currency = opt.currency;
    } else {
      item = {
        id: this._generateId('cartitem'),
        cartId: cart.id,
        item_type: 'ticket',
        productId: null,
        ticketOptionId: opt.id,
        workshopBookingId: null,
        name: opt.name,
        description: opt.description || '',
        unit_price: opt.price,
        quantity,
        line_subtotal: opt.price * quantity,
        event_date: eventDate,
        time_slot_label,
        options_summary: time_slot_label ? `Entry ${time_slot_label}` : '',
        created_at: new Date().toISOString(),
        currency: opt.currency
      };
      cartItems.push(item);
    }

    this._saveToStorage('cart_items', cartItems);
    const updatedCart = this._recalculateCartTotals(cart, cartItems);

    const cartResponse = this._buildCartResponse(updatedCart, cartItems);

    return {
      success: true,
      message: 'Ticket(s) added to cart',
      cart: cartResponse
    };
  }

  getEventSchedule(eventId, filters) {
    filters = filters || {};
    const talks = this._getFromStorage('talks', []);

    const filtered = talks.filter((t) => {
      if (t.eventId !== eventId) return false;

      if (filters.day_label) {
        const day = String(filters.day_label).toLowerCase();
        const talkDay = (t.day_label || this._getDayLabel(t.start_datetime)).toLowerCase();
        if (talkDay !== day) return false;
      }

      if (filters.date) {
        const dateYmd = this._dateToYMD(t.start_datetime);
        if (dateYmd !== filters.date) return false;
      }

      const start = this._parseDate(t.start_datetime);
      if (filters.start_time_from) {
        const [h, m] = filters.start_time_from.split(':').map((v) => parseInt(v, 10));
        const cmp = new Date(start.getTime());
        cmp.setHours(h || 0, m || 0, 0, 0);
        if (start < cmp) return false;
      }
      if (filters.start_time_to) {
        const [h, m] = filters.start_time_to.split(':').map((v) => parseInt(v, 10));
        const cmp = new Date(start.getTime());
        cmp.setHours(h || 0, m || 0, 0, 0);
        if (start > cmp) return false;
      }

      if (filters.track_name) {
        if ((t.track_name || '').toLowerCase() !== String(filters.track_name).toLowerCase()) return false;
      }

      return true;
    });

    const mapped = filtered.map((t) => ({
      talkId: t.id,
      title: t.title,
      description_short: (t.description || '').slice(0, 280),
      start_datetime: t.start_datetime,
      end_datetime: t.end_datetime,
      location: t.location || '',
      speaker_name: t.speaker_name || '',
      track_name: t.track_name || '',
      day_label: t.day_label || this._getDayLabel(t.start_datetime)
    }));

    return {
      event_id: eventId,
      talks: mapped
    };
  }

  getTalkDetail(talkId) {
    const talks = this._getFromStorage('talks', []);
    const events = this._getFromStorage('events', []);

    const t = talks.find((tk) => tk.id === talkId);
    if (!t) {
      return {
        talkId: null,
        eventId: null,
        title: '',
        description: '',
        start_datetime: null,
        end_datetime: null,
        location: '',
        speaker_name: '',
        track_name: '',
        day_label: '',
        event: null
      };
    }

    const event = events.find((e) => e.id === t.eventId) || null;

    return {
      talkId: t.id,
      eventId: t.eventId,
      title: t.title,
      description: t.description || '',
      start_datetime: t.start_datetime,
      end_datetime: t.end_datetime,
      location: t.location || '',
      speaker_name: t.speaker_name || '',
      track_name: t.track_name || '',
      day_label: t.day_label || this._getDayLabel(t.start_datetime),
      // Foreign key resolution
      event
    };
  }

  addTalkToMySchedule(talkId) {
    const talks = this._getFromStorage('talks', []);
    const t = talks.find((tk) => tk.id === talkId);
    if (!t) {
      return {
        success: false,
        message: 'Talk not found',
        schedule_item: null,
        talk: null
      };
    }

    const scheduleItems = this._getFromStorage('schedule_items', []);

    // Avoid duplicates
    let existing = scheduleItems.find((si) => si.talkId === talkId);
    if (existing) {
      return {
        success: true,
        message: 'Talk already in schedule',
        schedule_item: {
          scheduleItemId: existing.id,
          talkId: existing.talkId,
          added_at: existing.added_at
        },
        talk: {
          title: t.title,
          start_datetime: t.start_datetime,
          end_datetime: t.end_datetime,
          location: t.location || '',
          day_label: t.day_label || this._getDayLabel(t.start_datetime)
        }
      };
    }

    const scheduleItem = {
      id: this._generateId('schedule'),
      talkId,
      added_at: new Date().toISOString()
    };

    scheduleItems.push(scheduleItem);
    this._saveToStorage('schedule_items', scheduleItems);

    return {
      success: true,
      message: 'Talk added to schedule',
      schedule_item: {
        scheduleItemId: scheduleItem.id,
        talkId: scheduleItem.talkId,
        added_at: scheduleItem.added_at
      },
      talk: {
        title: t.title,
        start_datetime: t.start_datetime,
        end_datetime: t.end_datetime,
        location: t.location || '',
        day_label: t.day_label || this._getDayLabel(t.start_datetime)
      }
    };
  }

  getMySchedule() {
    const scheduleItems = this._getFromStorage('schedule_items', []);
    const talks = this._getFromStorage('talks', []);
    const events = this._getFromStorage('events', []);

    const items = scheduleItems.map((si) => {
      const t = talks.find((tk) => tk.id === si.talkId) || {};
      const e = events.find((ev) => ev.id === t.eventId) || null;

      const talkObj = {
        talkId: t.id || null,
        eventId: t.eventId || null,
        event_name: e ? e.name : null,
        title: t.title || '',
        start_datetime: t.start_datetime || null,
        end_datetime: t.end_datetime || null,
        location: t.location || '',
        speaker_name: t.speaker_name || '',
        day_label: t.day_label || (t.start_datetime ? this._getDayLabel(t.start_datetime) : '')
      };

      // Foreign key resolution for eventId in nested talk
      talkObj.event = e;

      return {
        scheduleItemId: si.id,
        added_at: si.added_at,
        talk: talkObj,
        has_time_conflict: false // set later
      };
    });

    // Compute conflicts (simple O(n^2))
    for (let i = 0; i < items.length; i++) {
      const tiStart = this._parseDate(items[i].talk.start_datetime);
      const tiEnd = this._parseDate(items[i].talk.end_datetime);
      if (!tiStart || !tiEnd) continue;

      for (let j = 0; j < items.length; j++) {
        if (i === j) continue;
        const tjStart = this._parseDate(items[j].talk.start_datetime);
        const tjEnd = this._parseDate(items[j].talk.end_datetime);
        if (!tjStart || !tjEnd) continue;

        const overlaps = tiStart < tjEnd && tjStart < tiEnd;
        if (overlaps) {
          items[i].has_time_conflict = true;
          break;
        }
      }
    }

    return { items };
  }

  removeScheduleItem(scheduleItemId) {
    const scheduleItems = this._getFromStorage('schedule_items', []);
    const initialLength = scheduleItems.length;
    const remaining = scheduleItems.filter((si) => si.id !== scheduleItemId);

    const removed = remaining.length !== initialLength;
    this._saveToStorage('schedule_items', remaining);

    return {
      success: removed,
      message: removed ? 'Schedule item removed' : 'Schedule item not found',
      remaining_count: remaining.length
    };
  }

  // =====================
  // Membership
  // =====================

  getMembershipOverview() {
    const plansRaw = this._getFromStorage('membership_plans', []);

    const plans = plansRaw.map((p) => ({
      membershipPlanId: p.id,
      code: p.code,
      name: p.name,
      description: p.description || '',
      duration_months: p.duration_months,
      price: p.price,
      currency: p.currency,
      is_active: p.is_active !== false,
      is_recommended: p.code === 'adult_annual'
    }));

    return {
      plans,
      benefits_summary: [] // No mocked text; can be filled by site configuration
    };
  }

  submitMembershipApplication(
    membershipPlanId,
    applicant_full_name,
    applicant_email,
    city,
    postal_code,
    address_line1,
    address_line2,
    membership_duration,
    interest_area_1,
    interest_area_2
  ) {
    const membershipPlans = this._getFromStorage('membership_plans', []);
    const plan = membershipPlans.find((p) => p.id === membershipPlanId);

    const errors = [];

    if (!plan) {
      errors.push({ field: 'membershipPlanId', message: 'Membership plan not found' });
    }

    const allowedDurations = ['annual', 'two_year', 'lifetime'];
    if (!allowedDurations.includes(membership_duration)) {
      errors.push({ field: 'membership_duration', message: 'Invalid membership duration' });
    }

    const interestValidation = this._validateMembershipInterestAreas(
      interest_area_1,
      interest_area_2
    );
    errors.push.apply(errors, interestValidation.errors);

    if (!applicant_full_name) {
      errors.push({ field: 'applicant_full_name', message: 'Full name is required' });
    }
    if (!applicant_email) {
      errors.push({ field: 'applicant_email', message: 'Email is required' });
    }

    if (errors.length > 0) {
      return {
        success: false,
        application_id: null,
        status: 'draft',
        errors
      };
    }

    const applications = this._getFromStorage('membership_applications', []);

    const application = {
      id: this._generateId('mship'),
      membershipPlanId,
      applicant_full_name,
      applicant_email,
      city: city || '',
      postal_code: postal_code || '',
      address_line1: address_line1 || '',
      address_line2: address_line2 || '',
      membership_duration,
      interest_area_1,
      interest_area_2,
      status: 'submitted',
      submitted_at: new Date().toISOString()
    };

    applications.push(application);
    this._saveToStorage('membership_applications', applications);

    return {
      success: true,
      application_id: application.id,
      status: application.status,
      errors: []
    };
  }

  // =====================
  // Layouts / Gallery
  // =====================

  getLayoutFilterOptions() {
    const scales = [
      { value: 'n_scale', label: 'N scale' },
      { value: 'ho_scale', label: 'HO scale' },
      { value: 'oo_scale', label: 'OO scale' },
      { value: 'o_scale', label: 'O scale' },
      { value: 'g_scale', label: 'G scale' },
      { value: 'z_scale', label: 'Z scale' }
    ];

    const eras = [
      { value: 'steam_era', label: 'Steam era' },
      { value: 'diesel_era', label: 'Diesel era' },
      { value: 'modern_era', label: 'Modern era' },
      { value: 'mixed_era', label: 'Mixed era' }
    ];

    const sort_options = [
      { value: 'rating_desc', label: 'Rating: High to Low' },
      { value: 'rating_asc', label: 'Rating: Low to High' },
      { value: 'title_asc', label: 'Title: A to Z' },
      { value: 'title_desc', label: 'Title: Z to A' }
    ];

    return { scales, eras, sort_options };
  }

  listLayouts(filters) {
    filters = filters || {};
    const layouts = this._getFromStorage('layouts', []);
    const favorites = this._getFromStorage('favorite_layouts', []);
    const favoriteIds = new Set(favorites.map((f) => f.layoutId));

    let result = layouts.slice();

    if (filters.scale) {
      result = result.filter((l) => l.scale === filters.scale);
    }
    if (filters.era) {
      result = result.filter((l) => l.era === filters.era);
    }
    if (typeof filters.min_rating === 'number') {
      result = result.filter((l) => (l.rating || 0) >= filters.min_rating);
    }
    if (filters.favorites_only) {
      result = result.filter((l) => favoriteIds.has(l.id));
    }

    const sort_by = filters.sort_by || 'rating_desc';
    result.sort((a, b) => {
      if (sort_by === 'rating_desc') return (b.rating || 0) - (a.rating || 0);
      if (sort_by === 'rating_asc') return (a.rating || 0) - (b.rating || 0);
      if (sort_by === 'title_asc') return (a.title || '').localeCompare(b.title || '');
      if (sort_by === 'title_desc') return (b.title || '').localeCompare(a.title || '');
      return 0;
    });

    const mapped = result.map((l) => ({
      layout_id: l.id,
      title: l.title,
      description: l.description || '',
      scale: l.scale,
      era: l.era,
      rating: l.rating,
      rating_count: l.rating_count || 0,
      thumbnail_url: l.thumbnail_url || '',
      is_featured: !!l.is_featured,
      is_favorited: favoriteIds.has(l.id)
    }));

    return { layouts: mapped };
  }

  getLayoutDetail(layoutId) {
    const layouts = this._getFromStorage('layouts', []);
    const favorites = this._getFromStorage('favorite_layouts', []);
    const layout = layouts.find((l) => l.id === layoutId);
    const is_favorited = favorites.some((f) => f.layoutId === layoutId);

    if (!layout) {
      return {
        layout_id: null,
        title: '',
        description: '',
        scale: null,
        era: null,
        rating: 0,
        rating_count: 0,
        thumbnail_url: '',
        image_urls: [],
        is_featured: false,
        created_at: null,
        is_favorited: false
      };
    }

    return {
      layout_id: layout.id,
      title: layout.title,
      description: layout.description || '',
      scale: layout.scale,
      era: layout.era,
      rating: layout.rating,
      rating_count: layout.rating_count || 0,
      thumbnail_url: layout.thumbnail_url || '',
      image_urls: layout.image_urls || [],
      is_featured: !!layout.is_featured,
      created_at: layout.created_at || null,
      is_favorited
    };
  }

  addLayoutToFavorites(layoutId) {
    const layouts = this._getFromStorage('layouts', []);
    const layout = layouts.find((l) => l.id === layoutId);
    if (!layout) {
      return {
        success: false,
        favorite_id: null,
        added_at: null,
        favorite_count: 0,
        message: 'Layout not found'
      };
    }

    const favorites = this._getFromStorage('favorite_layouts', []);
    const existing = favorites.find((f) => f.layoutId === layoutId);
    if (existing) {
      return {
        success: true,
        favorite_id: existing.id,
        added_at: existing.added_at,
        favorite_count: favorites.length,
        message: 'Layout already in favorites'
      };
    }

    const fav = {
      id: this._generateId('favlayout'),
      layoutId,
      added_at: new Date().toISOString()
    };

    favorites.push(fav);
    this._saveToStorage('favorite_layouts', favorites);

    return {
      success: true,
      favorite_id: fav.id,
      added_at: fav.added_at,
      favorite_count: favorites.length,
      message: 'Layout added to favorites'
    };
  }

  removeLayoutFromFavorites(layoutId) {
    const favorites = this._getFromStorage('favorite_layouts', []);
    const remaining = favorites.filter((f) => f.layoutId !== layoutId);
    const removed = remaining.length !== favorites.length;
    this._saveToStorage('favorite_layouts', remaining);

    return {
      success: removed,
      favorite_count: remaining.length,
      message: removed ? 'Layout removed from favorites' : 'Layout not in favorites'
    };
  }

  getFavoriteLayouts() {
    const favorites = this._getFromStorage('favorite_layouts', []);
    const layouts = this._getFromStorage('layouts', []);

    const result = favorites
      .map((f) => layouts.find((l) => l.id === f.layoutId))
      .filter(Boolean)
      .map((l) => ({
        layout_id: l.id,
        title: l.title,
        scale: l.scale,
        era: l.era,
        rating: l.rating,
        thumbnail_url: l.thumbnail_url || ''
      }));

    return { layouts: result };
  }

  // =====================
  // Products & Marketplace
  // =====================

  getProductFilterOptions(mode) {
    const productCategories = this._getFromStorage('product_categories', []);
    const categories = productCategories
      .filter((c) => {
        if (mode === 'shop') return c.is_for_marketplace === false;
        if (mode === 'marketplace') return c.is_for_marketplace === true;
        return true;
      })
      .map((c) => ({
        code: c.code,
        name: c.name,
        is_for_marketplace: !!c.is_for_marketplace
      }));

    const price_ranges = [
      { min: 0, max: 20, label: 'Under 20' },
      { min: 20, max: 50, label: '20 to 50' },
      { min: 50, max: 100, label: '50 to 100' },
      { min: 100, max: 999999, label: '100 and above' }
    ];

    const scales = [
      { value: 'n_scale', label: 'N scale' },
      { value: 'ho_scale', label: 'HO scale' },
      { value: 'oo_scale', label: 'OO scale' },
      { value: 'o_scale', label: 'O scale' },
      { value: 'g_scale', label: 'G scale' },
      { value: 'z_scale', label: 'Z scale' },
      { value: 'na', label: 'Not applicable' }
    ];

    const conditions = [
      { value: 'new', label: 'New' },
      { value: 'like_new', label: 'Like new' },
      { value: 'very_good', label: 'Very good' },
      { value: 'good', label: 'Good' },
      { value: 'fair', label: 'Fair' },
      { value: 'poor', label: 'Poor' }
    ];

    const sort_options = [
      { value: 'price_asc', label: 'Price: Low to High' },
      { value: 'price_desc', label: 'Price: High to Low' },
      { value: 'seller_rating_desc', label: 'Seller rating: High to Low' }
    ];

    return {
      categories,
      price_ranges,
      scales,
      conditions,
      sort_options
    };
  }

  listProducts(mode, filters) {
    filters = filters || {};
    const products = this._getFromStorage('products', []);
    const categories = this._getFromStorage('product_categories', []);

    let result = products.filter((p) => p.catalog_type === mode);

    if (filters.product_category_code) {
      const cat = categories.find((c) => c.code === filters.product_category_code);
      if (cat) {
        result = result.filter((p) => p.productCategoryId === cat.id);
      }
    }

    if (typeof filters.min_price === 'number') {
      result = result.filter((p) => (p.base_price || 0) >= filters.min_price);
    }
    if (typeof filters.max_price === 'number') {
      result = result.filter((p) => (p.base_price || 0) <= filters.max_price);
    }
    if (typeof filters.only_under_price === 'number') {
      result = result.filter((p) => (p.base_price || 0) <= filters.only_under_price);
    }

    if (filters.scale) {
      result = result.filter((p) => p.scale === filters.scale);
    }

    if (filters.condition_list && Array.isArray(filters.condition_list) && filters.condition_list.length) {
      const allowed = new Set(filters.condition_list);
      result = result.filter((p) => allowed.has(p.condition));
    }

    if (filters.search_query) {
      const q = String(filters.search_query).toLowerCase();
      result = result.filter((p) => {
        const name = (p.name || '').toLowerCase();
        const desc = (p.description || '').toLowerCase();
        return name.includes(q) || desc.includes(q);
      });
    }

    const sort_by = filters.sort_by || 'price_asc';
    result.sort((a, b) => {
      if (sort_by === 'price_asc') return (a.base_price || 0) - (b.base_price || 0);
      if (sort_by === 'price_desc') return (b.base_price || 0) - (a.base_price || 0);
      if (sort_by === 'seller_rating_desc') return (b.seller_rating || 0) - (a.seller_rating || 0);
      return 0;
    });

    const mapped = result.map((p) => {
      const cat = categories.find((c) => c.id === p.productCategoryId) || null;
      const obj = {
        productId: p.id,
        name: p.name,
        description_short: (p.description || '').slice(0, 280),
        base_price: p.base_price,
        currency: p.currency,
        productCategoryId: p.productCategoryId || null,
        category_name: cat ? cat.name : null,
        catalog_type: p.catalog_type,
        product_type: p.product_type,
        is_clothing: !!p.is_clothing,
        is_mug: !!p.is_mug,
        sizes_available: p.sizes_available || [],
        scale: p.scale || 'na',
        condition: p.condition || null,
        is_used: !!p.is_used,
        seller_name: p.seller_name || '',
        seller_rating: p.seller_rating || 0,
        status: p.status,
        stock_quantity: typeof p.stock_quantity === 'number' ? p.stock_quantity : null,
        image_url: (p.image_urls && p.image_urls[0]) || null
      };

      // Foreign key resolution for productCategoryId
      obj.productCategory = cat;

      return obj;
    });

    return { products: mapped };
  }

  getProductDetail(productId) {
    const products = this._getFromStorage('products', []);
    const categories = this._getFromStorage('product_categories', []);

    const p = products.find((pr) => pr.id === productId);
    if (!p) {
      return {
        productId: null,
        name: '',
        description: '',
        base_price: 0,
        currency: '',
        productCategoryId: null,
        category_name: null,
        catalog_type: null,
        product_type: null,
        is_clothing: false,
        is_mug: false,
        sizes_available: [],
        scale: null,
        condition: null,
        is_used: false,
        seller_name: '',
        seller_rating: 0,
        status: null,
        stock_quantity: null,
        image_urls: [],
        is_marketplace: false,
        productCategory: null
      };
    }

    const cat = categories.find((c) => c.id === p.productCategoryId) || null;

    return {
      productId: p.id,
      name: p.name,
      description: p.description || '',
      base_price: p.base_price,
      currency: p.currency,
      productCategoryId: p.productCategoryId || null,
      category_name: cat ? cat.name : null,
      catalog_type: p.catalog_type,
      product_type: p.product_type,
      is_clothing: !!p.is_clothing,
      is_mug: !!p.is_mug,
      sizes_available: p.sizes_available || [],
      scale: p.scale || null,
      condition: p.condition || null,
      is_used: !!p.is_used,
      seller_name: p.seller_name || '',
      seller_rating: p.seller_rating || 0,
      status: p.status,
      stock_quantity: typeof p.stock_quantity === 'number' ? p.stock_quantity : null,
      image_urls: p.image_urls || [],
      is_marketplace: p.catalog_type === 'marketplace',
      // Foreign key resolution
      productCategory: cat
    };
  }

  addProductToCart(productId, quantity, options) {
    quantity = typeof quantity === 'number' && quantity > 0 ? quantity : 1;
    options = options || {};

    const products = this._getFromStorage('products', []);
    const p = products.find((pr) => pr.id === productId);
    if (!p) {
      return { success: false, message: 'Product not found', cart: null };
    }

    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items', []);

    const item_type = p.catalog_type === 'marketplace' ? 'marketplace_product' : 'shop_product';

    // Merge identical product with same options (size)
    let existing = cartItems.find((ci) => {
      if (ci.cartId !== cart.id) return false;
      if (ci.item_type !== item_type) return false;
      if (ci.productId !== p.id) return false;
      const sizeInSummary = (ci.options_summary || '').toLowerCase();
      const optSize = (options.size || '').toLowerCase();
      if (optSize) {
        return sizeInSummary.includes(`size ${optSize}`);
      }
      return !optSize && !sizeInSummary.includes('size ');
    });

    const options_summary = options.size ? `Size ${String(options.size).toUpperCase()}` : '';

    if (existing) {
      existing.quantity += quantity;
      existing.line_subtotal = existing.unit_price * existing.quantity;
      existing.options_summary = options_summary;
      existing.currency = p.currency;
    } else {
      const item = {
        id: this._generateId('cartitem'),
        cartId: cart.id,
        item_type,
        productId: p.id,
        ticketOptionId: null,
        workshopBookingId: null,
        name: p.name,
        description: p.description || '',
        unit_price: p.base_price,
        quantity,
        line_subtotal: p.base_price * quantity,
        event_date: null,
        time_slot_label: null,
        options_summary,
        created_at: new Date().toISOString(),
        currency: p.currency
      };
      cartItems.push(item);
    }

    this._saveToStorage('cart_items', cartItems);
    const updatedCart = this._recalculateCartTotals(cart, cartItems);
    const cartResponse = this._buildCartResponse(updatedCart, cartItems);

    return {
      success: true,
      message: 'Product added to cart',
      cart: cartResponse
    };
  }

  // Backwards compatibility example method from template
  addToCart(userId, productId, quantity) {
    // userId is ignored; single-user cart
    return this.addProductToCart(productId, quantity);
  }

  _buildCartResponse(cart, cartItemsAll) {
    const cartItems = cartItemsAll.filter((ci) => ci.cartId === cart.id);
    const products = this._getFromStorage('products', []);
    const ticketOptions = this._getFromStorage('ticket_options', []);
    const workshopBookings = this._getFromStorage('workshop_bookings', []);

    const items = cartItems.map((ci) => {
      const product = ci.productId ? products.find((p) => p.id === ci.productId) : null;
      const ticketOption = ci.ticketOptionId
        ? ticketOptions.find((t) => t.id === ci.ticketOptionId)
        : null;
      const workshopBooking = ci.workshopBookingId
        ? workshopBookings.find((w) => w.id === ci.workshopBookingId)
        : null;

      const is_marketplace = product ? product.catalog_type === 'marketplace' : false;
      const product_type = product ? product.product_type : null;

      const obj = {
        cart_item_id: ci.id,
        item_type: ci.item_type,
        name: ci.name,
        description: ci.description || '',
        unit_price: ci.unit_price,
        quantity: ci.quantity,
        line_subtotal: ci.line_subtotal,
        product_type,
        is_marketplace,
        event_date: ci.event_date || null,
        time_slot_label: ci.time_slot_label || null,
        options_summary: ci.options_summary || ''
      };

      // Expose foreign keys + resolved objects per requirement
      obj.productId = ci.productId || null;
      obj.ticketOptionId = ci.ticketOptionId || null;
      obj.workshopBookingId = ci.workshopBookingId || null;
      obj.product = product;
      obj.ticketOption = ticketOption;
      obj.workshopBooking = workshopBooking;

      return obj;
    });

    const total_items = cartItems.reduce((sum, ci) => sum + (ci.quantity || 0), 0);

    return {
      cart_id: cart.id,
      currency: cart.currency,
      merchandise_subtotal: cart.merchandise_subtotal,
      tickets_subtotal: cart.tickets_subtotal,
      marketplace_subtotal: cart.marketplace_subtotal,
      shipping_cost: cart.shipping_cost,
      total: cart.total,
      total_items,
      items
    };
  }

  getCartDetails() {
    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items', []);
    const updatedCart = this._recalculateCartTotals(cart, cartItems);

    const shippingMethods = this._getFromStorage('shipping_methods', []);

    const available_shipping_methods = shippingMethods.map((m) => {
      const obj = {
        shippingMethodId: m.id,
        code: m.code,
        name: m.name,
        description: m.description || '',
        price: m.price,
        currency: m.currency,
        is_default: !!m.is_default,
        is_selected: updatedCart.shippingMethodId === m.id
      };
      // Foreign key-style resolution (though this is the base entity itself)
      obj.shippingMethod = m;
      return obj;
    });

    const cartResponse = this._buildCartResponse(updatedCart, cartItems);

    // Enrich with selected shipping method info
    let shipping_method_name = null;
    const selected = shippingMethods.find((m) => m.id === updatedCart.shippingMethodId);
    if (selected) {
      shipping_method_name = selected.name;
    }

    return {
      cart_id: cartResponse.cart_id,
      currency: cartResponse.currency,
      merchandise_subtotal: cartResponse.merchandise_subtotal,
      tickets_subtotal: cartResponse.tickets_subtotal,
      marketplace_subtotal: cartResponse.marketplace_subtotal,
      shipping_cost: cartResponse.shipping_cost,
      shipping_method_code: updatedCart.shipping_method_code,
      shipping_method_name,
      total: cartResponse.total,
      items: cartResponse.items,
      available_shipping_methods
    };
  }

  updateCartItemQuantity(cartItemId, quantity) {
    quantity = typeof quantity === 'number' ? quantity : 0;
    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items', []);

    const itemIndex = cartItems.findIndex((ci) => ci.id === cartItemId && ci.cartId === cart.id);
    if (itemIndex === -1) {
      return {
        success: false,
        message: 'Cart item not found',
        cart: null
      };
    }

    if (quantity <= 0) {
      cartItems.splice(itemIndex, 1);
    } else {
      const item = cartItems[itemIndex];
      item.quantity = quantity;
      item.line_subtotal = item.unit_price * quantity;
    }

    this._saveToStorage('cart_items', cartItems);
    const updatedCart = this._recalculateCartTotals(cart, cartItems);

    return {
      success: true,
      message: 'Cart updated',
      cart: {
        cart_id: updatedCart.id,
        merchandise_subtotal: updatedCart.merchandise_subtotal,
        tickets_subtotal: updatedCart.tickets_subtotal,
        marketplace_subtotal: updatedCart.marketplace_subtotal,
        shipping_cost: updatedCart.shipping_cost,
        total: updatedCart.total
      }
    };
  }

  removeCartItem(cartItemId) {
    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items', []);

    const filtered = cartItems.filter((ci) => !(ci.id === cartItemId && ci.cartId === cart.id));
    const removed = filtered.length !== cartItems.length;

    this._saveToStorage('cart_items', filtered);
    const updatedCart = this._recalculateCartTotals(cart, filtered);

    return {
      success: removed,
      message: removed ? 'Cart item removed' : 'Cart item not found',
      cart: {
        cart_id: updatedCart.id,
        merchandise_subtotal: updatedCart.merchandise_subtotal,
        tickets_subtotal: updatedCart.tickets_subtotal,
        marketplace_subtotal: updatedCart.marketplace_subtotal,
        shipping_cost: updatedCart.shipping_cost,
        total: updatedCart.total
      }
    };
  }

  setCartShippingMethod(shippingMethodId) {
    const cart = this._getOrCreateCart();
    const shippingMethods = this._getFromStorage('shipping_methods', []);
    const method = shippingMethods.find((m) => m.id === shippingMethodId);

    if (!method) {
      return {
        success: false,
        message: 'Shipping method not found',
        cart: null
      };
    }

    cart.shippingMethodId = method.id;
    const cartItems = this._getFromStorage('cart_items', []);
    const updatedCart = this._recalculateCartTotals(cart, cartItems);

    return {
      success: true,
      message: 'Shipping method updated',
      cart: {
        cart_id: updatedCart.id,
        shipping_method_code: updatedCart.shipping_method_code,
        shipping_method_name: method.name,
        shipping_cost: updatedCart.shipping_cost,
        total: updatedCart.total
      }
    };
  }

  // =====================
  // Workshops
  // =====================

  getWorkshopFilterOptions() {
    const levels = [
      { value: 'beginner', label: 'Beginner' },
      { value: 'introduction', label: 'Introduction' },
      { value: 'intermediate', label: 'Intermediate' },
      { value: 'advanced', label: 'Advanced' }
    ];

    const day_of_week_options = [
      { value: 'monday', label: 'Monday' },
      { value: 'tuesday', label: 'Tuesday' },
      { value: 'wednesday', label: 'Wednesday' },
      { value: 'thursday', label: 'Thursday' },
      { value: 'friday', label: 'Friday' },
      { value: 'saturday', label: 'Saturday' },
      { value: 'sunday', label: 'Sunday' }
    ];

    const time_band_options = [
      { value: 'morning', label: 'Morning' },
      { value: 'afternoon', label: 'Afternoon' },
      { value: 'evening', label: 'Evening' }
    ];

    return { levels, day_of_week_options, time_band_options };
  }

  listWorkshopSessions(filters) {
    filters = filters || {};
    const sessions = this._getFromStorage('workshop_sessions', []);
    const workshops = this._getFromStorage('workshops', []);

    let result = sessions.filter((s) => s.status === 'scheduled');

    if (filters.month) {
      const [y, m] = filters.month.split('-').map((v) => parseInt(v, 10));
      result = result.filter((s) => {
        const d = this._parseDate(s.start_datetime);
        if (!d) return false;
        return d.getFullYear() === y && d.getMonth() + 1 === m;
      });
    }

    if (filters.day_of_week) {
      const day = String(filters.day_of_week).toLowerCase();
      result = result.filter((s) => {
        const label = this._getDayLabel(s.start_datetime);
        return label === day;
      });
    }

    if (filters.is_morning) {
      result = result.filter((s) => {
        if (typeof s.is_morning === 'boolean') return s.is_morning;
        const d = this._parseDate(s.start_datetime);
        if (!d) return false;
        return d.getHours() < 12;
      });
    }

    // Filters based on workshop properties
    result = result.filter((s) => {
      const w = workshops.find((wk) => wk.id === s.workshopId);
      if (!w) return false;

      if (filters.level && w.level !== filters.level) return false;
      if (filters.is_child_friendly && !w.is_child_friendly) return false;
      if (filters.status && s.status !== filters.status) return false;

      return true;
    });

    const mapped = result.map((s) => {
      const w = workshops.find((wk) => wk.id === s.workshopId) || {};
      const d = this._parseDate(s.start_datetime);
      const is_saturday = typeof s.is_saturday === 'boolean'
        ? s.is_saturday
        : this._getDayLabel(s.start_datetime) === 'saturday';
      const is_morning = typeof s.is_morning === 'boolean'
        ? s.is_morning
        : d && d.getHours() < 12;

      const obj = {
        workshopSessionId: s.id,
        workshopId: s.workshopId,
        workshop_title: w.title || '',
        level: w.level,
        min_age: w.min_age || null,
        max_age: w.max_age || null,
        is_child_friendly: !!w.is_child_friendly,
        start_datetime: s.start_datetime,
        end_datetime: s.end_datetime,
        is_saturday,
        is_morning,
        seats_remaining: s.seats_remaining,
        status: s.status
      };

      // Foreign key resolution for workshopId
      obj.workshop = w;

      return obj;
    });

    return { sessions: mapped };
  }

  getWorkshopDetail(workshopId) {
    const workshops = this._getFromStorage('workshops', []);
    const sessions = this._getFromStorage('workshop_sessions', []);

    const w = workshops.find((wk) => wk.id === workshopId);
    if (!w) {
      return {
        workshopId: null,
        title: '',
        description: '',
        level: null,
        min_age: null,
        max_age: null,
        location: '',
        is_child_friendly: false,
        status: null,
        upcoming_sessions: []
      };
    }

    const now = new Date();
    const upcoming_sessions = sessions
      .filter((s) => s.workshopId === workshopId && s.status === 'scheduled')
      .filter((s) => {
        const d = this._parseDate(s.start_datetime);
        return d && d >= now;
      })
      .map((s) => {
        const d = this._parseDate(s.start_datetime);
        const is_saturday = typeof s.is_saturday === 'boolean'
          ? s.is_saturday
          : this._getDayLabel(s.start_datetime) === 'saturday';
        const is_morning = typeof s.is_morning === 'boolean'
          ? s.is_morning
          : d && d.getHours() < 12;

        return {
          workshopSessionId: s.id,
          start_datetime: s.start_datetime,
          end_datetime: s.end_datetime,
          is_saturday,
          is_morning,
          seats_remaining: s.seats_remaining,
          status: s.status
        };
      });

    return {
      workshopId: w.id,
      title: w.title,
      description: w.description || '',
      level: w.level,
      min_age: w.min_age || null,
      max_age: w.max_age || null,
      location: w.location || '',
      is_child_friendly: !!w.is_child_friendly,
      status: w.status,
      upcoming_sessions
    };
  }

  getWorkshopSessionDetail(workshopSessionId) {
    const sessions = this._getFromStorage('workshop_sessions', []);
    const workshops = this._getFromStorage('workshops', []);

    const s = sessions.find((sess) => sess.id === workshopSessionId);
    if (!s) {
      return {
        workshopSessionId: null,
        workshopId: null,
        workshop_title: '',
        start_datetime: null,
        end_datetime: null,
        location: '',
        is_saturday: false,
        is_morning: false,
        seats_remaining: null,
        status: null,
        workshop: null
      };
    }

    const w = workshops.find((wk) => wk.id === s.workshopId) || {};
    const d = this._parseDate(s.start_datetime);
    const is_saturday = typeof s.is_saturday === 'boolean'
      ? s.is_saturday
      : this._getDayLabel(s.start_datetime) === 'saturday';
    const is_morning = typeof s.is_morning === 'boolean'
      ? s.is_morning
      : d && d.getHours() < 12;

    return {
      workshopSessionId: s.id,
      workshopId: s.workshopId,
      workshop_title: w.title || '',
      start_datetime: s.start_datetime,
      end_datetime: s.end_datetime,
      location: w.location || '',
      is_saturday,
      is_morning,
      seats_remaining: s.seats_remaining,
      status: s.status,
      // Foreign key resolution
      workshop: w
    };
  }

  createWorkshopBooking(
    workshopSessionId,
    child_name,
    child_age,
    child_count,
    guardian_name,
    guardian_email,
    guardian_phone
  ) {
    const sessions = this._getFromStorage('workshop_sessions', []);
    const workshops = this._getFromStorage('workshops', []);

    const s = sessions.find((sess) => sess.id === workshopSessionId);
    if (!s) {
      return {
        success: false,
        booking_id: null,
        status: 'cancelled',
        message: 'Workshop session not found',
        workshop_session: null
      };
    }

    if (s.status !== 'scheduled') {
      return {
        success: false,
        booking_id: null,
        status: 'cancelled',
        message: 'Workshop session is not available for booking',
        workshop_session: null
      };
    }

    const seats_remaining = typeof s.seats_remaining === 'number' ? s.seats_remaining : null;
    const count = typeof child_count === 'number' && child_count > 0 ? child_count : 1;

    if (seats_remaining !== null && seats_remaining < count) {
      return {
        success: false,
        booking_id: null,
        status: 'cancelled',
        message: 'Not enough seats remaining',
        workshop_session: null
      };
    }

    const bookings = this._getFromStorage('workshop_bookings', []);

    const booking = {
      id: this._generateId('wbooking'),
      workshopSessionId,
      child_name,
      child_age,
      child_count: count,
      guardian_name,
      guardian_email,
      guardian_phone: guardian_phone || '',
      created_at: new Date().toISOString(),
      status: 'pending'
    };

    bookings.push(booking);
    this._saveToStorage('workshop_bookings', bookings);

    // Update seats_remaining
    if (seats_remaining !== null) {
      s.seats_remaining = seats_remaining - count;
      const idx = sessions.findIndex((sess) => sess.id === s.id);
      if (idx !== -1) {
        sessions[idx] = s;
        this._saveToStorage('workshop_sessions', sessions);
      }
    }

    const w = workshops.find((wk) => wk.id === s.workshopId) || {};

    return {
      success: true,
      booking_id: booking.id,
      status: booking.status,
      message: 'Workshop booking created',
      workshop_session: {
        workshop_title: w.title || '',
        start_datetime: s.start_datetime,
        end_datetime: s.end_datetime
      }
    };
  }

  // =====================
  // Visit info & notes
  // =====================

  getVisitInfo() {
    const parking_options_raw = this._getFromStorage('parking_options', []);
    const nextEvent = this._findNextMainExhibition();

    const parking_options = parking_options_raw.map((p) => ({
      parkingOptionId: p.id,
      name: p.name,
      address: p.address,
      is_free: !!p.is_free,
      distance_meters: p.distance_meters,
      notes: p.notes || '',
      is_within_500m: typeof p.distance_meters === 'number' ? p.distance_meters <= 500 : false
    }));

    return {
      venue_name: nextEvent ? nextEvent.venue_name || '' : '',
      venue_address: nextEvent ? nextEvent.venue_address || '' : '',
      map_url: '',
      directions_public_transport: '',
      directions_car: '',
      parking_options
    };
  }

  createVisitNote(title, body) {
    const notes = this._getFromStorage('visit_notes', []);
    const now = new Date().toISOString();

    const note = {
      id: this._generateId('vnote'),
      title: title || '',
      body: body || '',
      created_at: now,
      updated_at: null
    };

    notes.push(note);
    this._saveToStorage('visit_notes', notes);

    return {
      success: true,
      note_id: note.id,
      created_at: note.created_at,
      updated_at: note.updated_at
    };
  }

  getVisitNotes() {
    const notes = this._getFromStorage('visit_notes', []);

    const mapped = notes.map((n) => ({
      note_id: n.id,
      title: n.title || '',
      body: n.body || '',
      created_at: n.created_at,
      updated_at: n.updated_at
    }));

    return { notes: mapped };
  }

  // =====================
  // Donations
  // =====================

  getDonationOptions() {
    const fundsRaw = this._getFromStorage('donation_funds', []);

    const funds = fundsRaw.map((f) => ({
      donationFundId: f.id,
      code: f.code,
      name: f.name,
      description: f.description || '',
      is_active: f.is_active !== false
    }));

    const frequencies = [
      { value: 'one_time', label: 'One-time' },
      { value: 'monthly', label: 'Monthly' }
    ];

    const payment_methods = [
      { value: 'credit_debit_card', label: 'Credit/Debit Card' },
      { value: 'pay_at_club', label: 'Pay at Club' },
      { value: 'bank_transfer', label: 'Bank transfer' }
    ];

    // Default currency: leave empty if not configured elsewhere
    const default_currency = 'USD';

    return {
      funds,
      frequencies,
      payment_methods,
      default_currency
    };
  }

  createDonation(amount, currency, frequency, donationFundId, donor_name, donor_email, payment_method) {
    const donationFunds = this._getFromStorage('donation_funds', []);
    const fund = donationFunds.find((f) => f.id === donationFundId);

    const allowedFreq = ['one_time', 'monthly'];
    const allowedMethods = ['credit_debit_card', 'pay_at_club', 'bank_transfer'];

    if (!fund || fund.is_active === false) {
      return {
        success: false,
        donation_id: null,
        status: 'cancelled',
        summary: null
      };
    }

    if (!(amount > 0) || !currency || !allowedFreq.includes(frequency) || !allowedMethods.includes(payment_method)) {
      return {
        success: false,
        donation_id: null,
        status: 'cancelled',
        summary: null
      };
    }

    const donations = this._getFromStorage('donations', []);

    const donation = {
      id: this._generateId('donation'),
      amount,
      currency,
      frequency,
      donationFundId,
      donor_name,
      donor_email,
      payment_method,
      status: 'review',
      created_at: new Date().toISOString()
    };

    donations.push(donation);
    this._saveToStorage('donations', donations);

    return {
      success: true,
      donation_id: donation.id,
      status: donation.status,
      summary: {
        amount: donation.amount,
        currency: donation.currency,
        frequency: donation.frequency,
        fund_name: fund.name,
        donor_name: donation.donor_name,
        donor_email: donation.donor_email,
        payment_method: donation.payment_method
      }
    };
  }

  // =====================
  // About & Contact & Policies
  // =====================

  getAboutContent() {
    return {
      club_history: '',
      mission: '',
      key_activities: [],
      volunteers: [],
      featured_projects: []
    };
  }

  getContactInfo() {
    return {
      email_addresses: [],
      phone_numbers: [],
      postal_address: '',
      subject_categories: [
        { value: 'exhibitions', label: 'Exhibitions' },
        { value: 'membership', label: 'Membership' },
        { value: 'workshops', label: 'Workshops' },
        { value: 'donations', label: 'Donations' },
        { value: 'general', label: 'General' }
      ]
    };
  }

  submitContactInquiry(name, email, subject_category, subject_text, message) {
    if (!name || !email || !subject_category || !message) {
      return {
        success: false,
        inquiry_id: null,
        status: 'cancelled',
        message: 'Missing required fields'
      };
    }

    const inquiries = this._getFromStorage('contact_inquiries', []);

    const inquiry = {
      id: this._generateId('contact'),
      name,
      email,
      subject_category,
      subject_text: subject_text || '',
      message,
      created_at: new Date().toISOString(),
      status: 'new'
    };

    inquiries.push(inquiry);
    this._saveToStorage('contact_inquiries', inquiries);

    return {
      success: true,
      inquiry_id: inquiry.id,
      status: inquiry.status,
      message: 'Inquiry submitted'
    };
  }

  getPolicyArticle(article_id) {
    const articles = this._getFromStorage('policy_articles', []);
    const a = articles.find((art) => art.article_id === article_id && art.is_published !== false);

    if (!a) {
      return {
        id: null,
        article_id,
        title: '',
        content: '',
        is_published: false
      };
    }

    return {
      id: a.id,
      article_id: a.article_id,
      title: a.title,
      content: a.content,
      is_published: a.is_published !== false
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