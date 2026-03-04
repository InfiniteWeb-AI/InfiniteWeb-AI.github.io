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

  _initStorage() {
    // Core id counter
    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }

    // Entity tables (arrays)
    const arrayKeys = [
      'users',
      'products', // unused but kept from base snippet
      'seating_options',
      'reservation_addons',
      'reservation_time_slots',
      'reservations',
      'events',
      'ticket_tiers',
      'event_listing_preferences',
      'menu_categories',
      'menu_items',
      'carts',
      'cart_items',
      'gift_card_products',
      'newsletter_subscriptions',
      'loyalty_profiles',
      'orders',
      'order_items',
      'contact_form_submissions',
      'faqs'
    ];

    for (var i = 0; i < arrayKeys.length; i++) {
      var key = arrayKeys[i];
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    }

    // Object-style content tables (not pre-populated - just ensure they exist when written)
    const objectKeys = [
      'home_highlighted_promotions',
      'venue_info',
      'contact_info',
      'privacy_policy',
      'terms_and_conditions',
      'loyalty_program_info'
    ];
    for (var j = 0; j < objectKeys.length; j++) {
      var oKey = objectKeys[j];
      if (!localStorage.getItem(oKey)) {
        // Do not pre-populate with mock content; leave unset until stored explicitly
        // We simply avoid setting anything here to honour "do not mock data".
      }
    }
  }

  _getFromStorage(key, defaultValue) {
    const data = localStorage.getItem(key);
    if (!data) {
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

  // --- Foreign key resolvers -------------------------------------------------

  _resolveReservationTimeSlotFKs(slot) {
    if (!slot) return null;
    const seatingOptions = this._getFromStorage('seating_options', []);
    const seating = seatingOptions.find(function (s) { return s.id === slot.seating_option_id; }) || null;
    return Object.assign({}, slot, { seating_option: seating });
  }

  _resolveReservationFKs(reservation) {
    if (!reservation) return null;
    const seatingOptions = this._getFromStorage('seating_options', []);
    const timeSlots = this._getFromStorage('reservation_time_slots', []);
    const addons = this._getFromStorage('reservation_addons', []);

    const seating = seatingOptions.find(function (s) { return s.id === reservation.seating_option_id; }) || null;
    const timeSlot = timeSlots.find(function (t) { return t.id === reservation.time_slot_id; }) || null;

    let selectedAddons = [];
    if (Array.isArray(reservation.addon_ids) && reservation.addon_ids.length > 0) {
      selectedAddons = addons.filter(function (a) { return reservation.addon_ids.indexOf(a.id) !== -1; });
    }

    return Object.assign({}, reservation, {
      seating_option: seating,
      time_slot: timeSlot ? this._resolveReservationTimeSlotFKs(timeSlot) : null,
      addons: selectedAddons
    });
  }

  _resolveCartItemFKs(items) {
    const events = this._getFromStorage('events', []);
    const ticketTiers = this._getFromStorage('ticket_tiers', []);
    const menuItems = this._getFromStorage('menu_items', []);
    const giftCardProducts = this._getFromStorage('gift_card_products', []);

    return items.map(function (item) {
      var resolved = Object.assign({}, item);

      if (item.event_id) {
        resolved.event = events.find(function (e) { return e.id === item.event_id; }) || null;
      }
      if (item.ticket_tier_id) {
        resolved.ticket_tier = ticketTiers.find(function (t) { return t.id === item.ticket_tier_id; }) || null;
      }
      if (item.menu_item_id) {
        resolved.menu_item = menuItems.find(function (m) { return m.id === item.menu_item_id; }) || null;
      }
      if (item.gift_card_product_id) {
        resolved.gift_card_product = giftCardProducts.find(function (g) { return g.id === item.gift_card_product_id; }) || null;
      }
      return resolved;
    });
  }

  _resolveMenuItemFKs(items) {
    const categories = this._getFromStorage('menu_categories', []);
    return items.map(function (item) {
      var resolved = Object.assign({}, item);
      if (item.category_id) {
        resolved.category = categories.find(function (c) { return c.id === item.category_id; }) || null;
      }
      return resolved;
    });
  }

  // --- Cart helpers ----------------------------------------------------------

  _getOrCreateCart() {
    let carts = this._getFromStorage('carts', []);
    let currentCartId = localStorage.getItem('current_cart_id');
    let cart = null;

    if (currentCartId) {
      cart = carts.find(function (c) { return c.id === currentCartId; }) || null;
    }

    if (!cart) {
      cart = {
        id: this._generateId('cart'),
        items: [], // stores cart_item ids
        subtotal: 0,
        total: 0,
        currency: 'USD',
        created_at: this._nowIso(),
        updated_at: this._nowIso()
      };
      carts.push(cart);
      this._saveToStorage('carts', carts);
      localStorage.setItem('current_cart_id', cart.id);
    }

    return cart;
  }

  _recalculateCartTotals(cart) {
    let carts = this._getFromStorage('carts', []);
    let cartItems = this._getFromStorage('cart_items', []);

    const itemsForCart = cartItems.filter(function (ci) { return ci.cart_id === cart.id; });

    let subtotal = 0;
    for (let i = 0; i < itemsForCart.length; i++) {
      const it = itemsForCart[i];
      const lineTotal = typeof it.total_price === 'number' ? it.total_price : (it.unit_price || 0) * (it.quantity || 0);
      subtotal += lineTotal;
    }

    cart.subtotal = subtotal;
    cart.total = subtotal; // no tax/fees in business logic layer
    cart.currency = cart.currency || 'USD';
    cart.updated_at = this._nowIso();

    carts = carts.map(function (c) { return c.id === cart.id ? cart : c; });
    this._saveToStorage('carts', carts);
  }

  // Event listing preference helper
  _storeEventListingPreference(view_mode, sort_order, genre_filter, min_rating, start_date, end_date) {
    let prefs = this._getFromStorage('event_listing_preferences', []);
    const id = 'single_user';
    const existingIndex = prefs.findIndex(function (p) { return p.id === id; });

    const pref = {
      id: id,
      view_mode: view_mode,
      sort_order: sort_order,
      genre_filter: genre_filter,
      min_rating: typeof min_rating === 'number' ? min_rating : null,
      start_date: start_date || null,
      end_date: end_date || null
    };

    if (existingIndex >= 0) {
      prefs[existingIndex] = pref;
    } else {
      prefs.push(pref);
    }

    this._saveToStorage('event_listing_preferences', prefs);
  }

  // Reservation slot validation helper
  _validateReservationSlot(time_slot_id, party_size) {
    const timeSlots = this._getFromStorage('reservation_time_slots', []);
    const slot = timeSlots.find(function (t) { return t.id === time_slot_id; }) || null;

    if (!slot || !slot.is_available) {
      return { valid: false, message: 'Selected time slot is not available.' };
    }

    if (typeof slot.min_party_size === 'number' && party_size < slot.min_party_size) {
      return { valid: false, message: 'Party size is below minimum for this slot.' };
    }

    if (typeof slot.max_party_size === 'number' && party_size > slot.max_party_size) {
      return { valid: false, message: 'Party size exceeds maximum for this slot.' };
    }

    if (typeof slot.capacity_total === 'number' && typeof slot.capacity_reserved === 'number') {
      if (slot.capacity_reserved + party_size > slot.capacity_total) {
        return { valid: false, message: 'Not enough capacity remaining for this slot.' };
      }
    }

    return { valid: true, slot: slot };
  }

  // --- Core interface implementations ---------------------------------------

  // 1) getHomeFeaturedContent
  getHomeFeaturedContent() {
    const events = this._getFromStorage('events', []);
    const featuredEvents = events.filter(function (e) { return !!e.is_featured; });

    const highlightedPromotions = this._getFromStorage('home_highlighted_promotions', []);

    return {
      featured_events: featuredEvents,
      highlighted_promotions: highlightedPromotions
    };
  }

  // 2) getReservationSeatingAndAddons
  getReservationSeatingAndAddons() {
    const seatingOptions = this._getFromStorage('seating_options', []).filter(function (s) { return s.is_active; });
    const reservationAddons = this._getFromStorage('reservation_addons', []).filter(function (a) { return a.is_active; });

    // Party size options: derive from existing time slots if possible, otherwise fallback range
    const timeSlots = this._getFromStorage('reservation_time_slots', []);
    let minParty = null;
    let maxParty = null;
    for (let i = 0; i < timeSlots.length; i++) {
      const ts = timeSlots[i];
      if (typeof ts.min_party_size === 'number') {
        if (minParty === null || ts.min_party_size < minParty) minParty = ts.min_party_size;
      }
      if (typeof ts.max_party_size === 'number') {
        if (maxParty === null || ts.max_party_size > maxParty) maxParty = ts.max_party_size;
      }
    }
    if (minParty === null) minParty = 1;
    if (maxParty === null) maxParty = 10;
    const partySizeOptions = [];
    for (let p = minParty; p <= maxParty; p++) {
      partySizeOptions.push(p);
    }

    const occasionOptions = ['none', 'birthday', 'anniversary', 'date_night', 'business', 'other'];

    let defaultMinDatetime = null;
    let defaultMaxDatetime = null;
    if (timeSlots.length > 0) {
      const sorted = timeSlots.slice().sort(function (a, b) {
        return new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime();
      });
      defaultMinDatetime = sorted[0].start_datetime;
      defaultMaxDatetime = sorted[sorted.length - 1].start_datetime;
    } else {
      const now = new Date();
      defaultMinDatetime = now.toISOString();
      const later = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
      defaultMaxDatetime = later.toISOString();
    }

    return {
      seating_options: seatingOptions,
      reservation_addons: reservationAddons,
      party_size_options: partySizeOptions,
      occasion_options: occasionOptions,
      default_min_datetime: defaultMinDatetime,
      default_max_datetime: defaultMaxDatetime
    };
  }

  // 3) getAvailableReservationTimeSlots(date, party_size, seating_option_id)
  getAvailableReservationTimeSlots(date, party_size, seating_option_id) {
    const timeSlots = this._getFromStorage('reservation_time_slots', []);

    const filtered = timeSlots.filter(function (ts) {
      if (!ts.is_available) return false;
      if (ts.seating_option_id !== seating_option_id) return false;
      const slotDate = (ts.start_datetime || '').slice(0, 10);
      if (slotDate !== date) return false;
      if (typeof ts.min_party_size === 'number' && party_size < ts.min_party_size) return false;
      if (typeof ts.max_party_size === 'number' && party_size > ts.max_party_size) return false;
      if (typeof ts.capacity_total === 'number' && typeof ts.capacity_reserved === 'number') {
        if (ts.capacity_reserved >= ts.capacity_total) return false;
      }
      return true;
    });

    const resolved = filtered.map(this._resolveReservationTimeSlotFKs.bind(this));

    return { time_slots: resolved };
  }

  // 4) checkReservationAvailability(start_datetime, party_size, seating_option_id)
  checkReservationAvailability(start_datetime, party_size, seating_option_id) {
    const timeSlots = this._getFromStorage('reservation_time_slots', []);

    let matched = null;
    for (let i = 0; i < timeSlots.length; i++) {
      const ts = timeSlots[i];
      if (!ts.is_available) continue;
      if (ts.seating_option_id !== seating_option_id) continue;
      if (ts.start_datetime !== start_datetime) continue;
      if (typeof ts.min_party_size === 'number' && party_size < ts.min_party_size) continue;
      if (typeof ts.max_party_size === 'number' && party_size > ts.max_party_size) continue;
      if (typeof ts.capacity_total === 'number' && typeof ts.capacity_reserved === 'number') {
        if (ts.capacity_reserved >= ts.capacity_total) continue;
      }
      matched = ts;
      break;
    }

    let alternativeSlots = [];
    let message = '';

    if (matched) {
      message = 'Requested time slot is available.';
    } else {
      message = 'Requested time slot is not available. Showing alternatives for the same date.';
      const date = start_datetime.slice(0, 10);
      const result = this.getAvailableReservationTimeSlots(date, party_size, seating_option_id);
      alternativeSlots = result.time_slots || [];
    }

    return {
      is_available: !!matched,
      matched_time_slot: matched
        ? {
            time_slot: matched.id,
            start_datetime: matched.start_datetime
          }
        : null,
      alternative_time_slots: alternativeSlots,
      message: message
    };
  }

  // 5) createReservationDraft(time_slot_id, party_size, seating_option_id, occasion, addon_ids, notes)
  createReservationDraft(time_slot_id, party_size, seating_option_id, occasion, addon_ids, notes) {
    const validation = this._validateReservationSlot(time_slot_id, party_size);
    if (!validation.valid) {
      return { reservation: null, message: validation.message };
    }

    const slot = validation.slot;
    let reservations = this._getFromStorage('reservations', []);
    let timeSlots = this._getFromStorage('reservation_time_slots', []);

    const reservation = {
      id: this._generateId('reservation'),
      start_datetime: slot.start_datetime,
      end_datetime: slot.end_datetime || null,
      party_size: party_size,
      seating_option_id: seating_option_id,
      time_slot_id: time_slot_id,
      occasion: occasion || 'none',
      addon_ids: Array.isArray(addon_ids) ? addon_ids.slice() : [],
      notes: notes || '',
      status: 'pending',
      contact_name: '',
      contact_phone: '',
      contact_email: '',
      created_at: this._nowIso(),
      updated_at: this._nowIso()
    };

    reservations.push(reservation);
    this._saveToStorage('reservations', reservations);

    // Increment capacity_reserved for the slot to hold it
    timeSlots = timeSlots.map(function (ts) {
      if (ts.id === slot.id) {
        const updated = Object.assign({}, ts);
        if (typeof updated.capacity_reserved !== 'number') {
          updated.capacity_reserved = 0;
        }
        updated.capacity_reserved += party_size;
        return updated;
      }
      return ts;
    });
    this._saveToStorage('reservation_time_slots', timeSlots);

    return {
      reservation: this._resolveReservationFKs(reservation),
      message: 'Reservation draft created.'
    };
  }

  // 6) getReservationSummary(reservation_id)
  getReservationSummary(reservation_id) {
    const reservations = this._getFromStorage('reservations', []);
    const reservation = reservations.find(function (r) { return r.id === reservation_id; }) || null;
    if (!reservation) {
      return { reservation: null, seating_option: null, selected_addons: [], estimated_total: 0 };
    }

    const seatingOptions = this._getFromStorage('seating_options', []);
    const addons = this._getFromStorage('reservation_addons', []);

    const seating = seatingOptions.find(function (s) { return s.id === reservation.seating_option_id; }) || null;

    let selectedAddons = [];
    let estimatedTotal = 0;
    if (Array.isArray(reservation.addon_ids)) {
      selectedAddons = addons.filter(function (a) { return reservation.addon_ids.indexOf(a.id) !== -1; });
      for (let i = 0; i < selectedAddons.length; i++) {
        estimatedTotal += selectedAddons[i].price || 0;
      }
    }

    return {
      reservation: this._resolveReservationFKs(reservation),
      seating_option: seating,
      selected_addons: selectedAddons,
      estimated_total: estimatedTotal
    };
  }

  // 7) finalizeReservation(reservation_id, contact_name, contact_phone, contact_email, notes)
  finalizeReservation(reservation_id, contact_name, contact_phone, contact_email, notes) {
    let reservations = this._getFromStorage('reservations', []);
    const index = reservations.findIndex(function (r) { return r.id === reservation_id; });
    if (index < 0) {
      return { reservation: null, success: false, confirmation_message: 'Reservation not found.' };
    }

    let reservation = reservations[index];

    // Optional revalidation
    const validation = this._validateReservationSlot(reservation.time_slot_id, reservation.party_size);
    if (!validation.valid) {
      return { reservation: this._resolveReservationFKs(reservation), success: false, confirmation_message: validation.message };
    }

    reservation = Object.assign({}, reservation, {
      contact_name: contact_name,
      contact_phone: contact_phone,
      contact_email: contact_email || reservation.contact_email || '',
      notes: typeof notes === 'string' && notes.length > 0 ? notes : reservation.notes,
      status: 'confirmed',
      updated_at: this._nowIso()
    });

    reservations[index] = reservation;
    this._saveToStorage('reservations', reservations);

    return {
      reservation: this._resolveReservationFKs(reservation),
      success: true,
      confirmation_message: 'Your reservation is confirmed.'
    };
  }

  // 8) getEventFilterOptions
  getEventFilterOptions() {
    const genreOptions = [
      { value: 'jazz', label: 'Jazz' },
      { value: 'rock', label: 'Rock' },
      { value: 'comedy', label: 'Comedy' },
      { value: 'blues', label: 'Blues' },
      { value: 'acoustic', label: 'Acoustic' },
      { value: 'other', label: 'Other' }
    ];

    const minRatingOptions = [3.0, 4.0, 4.5];

    const sortOptions = [
      { value: 'date_asc', label: 'Date: Soonest First' },
      { value: 'date_desc', label: 'Date: Latest First' },
      { value: 'price_low_to_high', label: 'Price: Low to High' },
      { value: 'price_high_to_low', label: 'Price: High to Low' },
      { value: 'rating_desc', label: 'Rating: Highest First' }
    ];

    return {
      genre_options: genreOptions,
      min_rating_options: minRatingOptions,
      sort_options: sortOptions
    };
  }

  // 9) listEvents(filters, sort_order)
  listEvents(filters, sort_order) {
    const events = this._getFromStorage('events', []);
    const f = filters || {};
    const sortOrder = sort_order || 'date_asc';

    let filtered = events.slice();

    // status filter (default to scheduled)
    if (f.status) {
      filtered = filtered.filter(function (e) { return e.status === f.status; });
    } else {
      filtered = filtered.filter(function (e) { return e.status === 'scheduled'; });
    }

    if (f.genre && f.genre !== 'all') {
      filtered = filtered.filter(function (e) { return e.genre === f.genre; });
    }

    if (typeof f.min_rating === 'number') {
      filtered = filtered.filter(function (e) {
        if (typeof e.rating !== 'number') return false;
        return e.rating >= f.min_rating;
      });
    }

    if (f.start_date) {
      const start = new Date(f.start_date + 'T00:00:00Z').getTime();
      filtered = filtered.filter(function (e) {
        return new Date(e.start_datetime).getTime() >= start;
      });
    }

    if (f.end_date) {
      const end = new Date(f.end_date + 'T23:59:59Z').getTime();
      filtered = filtered.filter(function (e) {
        return new Date(e.start_datetime).getTime() <= end;
      });
    }

    filtered.sort(function (a, b) {
      if (sortOrder === 'date_desc') {
        return new Date(b.start_datetime).getTime() - new Date(a.start_datetime).getTime();
      }
      if (sortOrder === 'price_low_to_high') {
        const ap = typeof a.base_ticket_price === 'number' ? a.base_ticket_price : Number.MAX_VALUE;
        const bp = typeof b.base_ticket_price === 'number' ? b.base_ticket_price : Number.MAX_VALUE;
        if (ap === bp) return new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime();
        return ap - bp;
      }
      if (sortOrder === 'price_high_to_low') {
        const ap2 = typeof a.base_ticket_price === 'number' ? a.base_ticket_price : 0;
        const bp2 = typeof b.base_ticket_price === 'number' ? b.base_ticket_price : 0;
        if (ap2 === bp2) return new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime();
        return bp2 - ap2;
      }
      if (sortOrder === 'rating_desc') {
        const ar = typeof a.rating === 'number' ? a.rating : 0;
        const br = typeof b.rating === 'number' ? b.rating : 0;
        if (ar === br) return new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime();
        return br - ar;
      }
      // default date_asc
      return new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime();
    });

    // Persist preferences for single user
    this._storeEventListingPreference(
      'list_view',
      sortOrder,
      f.genre || 'all',
      typeof f.min_rating === 'number' ? f.min_rating : null,
      f.start_date || null,
      f.end_date || null
    );

    return { events: filtered };
  }

  // 10) getEventDetails(event_id)
  getEventDetails(event_id) {
    const events = this._getFromStorage('events', []);
    const ticketTiers = this._getFromStorage('ticket_tiers', []);

    const event = events.find(function (e) { return e.id === event_id; }) || null;
    const tiersRaw = ticketTiers.filter(function (t) { return t.event_id === event_id && t.is_active; });

    // Resolve foreign key event on each ticket tier
    const tiers = tiersRaw.map(function (tier) {
      return Object.assign({}, tier, { event: event });
    });

    return {
      event: event,
      ticket_tiers: tiers
    };
  }

  // 11) addTicketsToCart(event_id, ticket_tier_id, quantity)
  addTicketsToCart(event_id, ticket_tier_id, quantity) {
    const qty = typeof quantity === 'number' && quantity > 0 ? quantity : 1;
    let cart = this._getOrCreateCart();

    const events = this._getFromStorage('events', []);
    const ticketTiers = this._getFromStorage('ticket_tiers', []);
    let cartItems = this._getFromStorage('cart_items', []);

    const event = events.find(function (e) { return e.id === event_id; }) || null;
    if (!event) {
      return { success: false, cart: cart, added_item: null, message: 'Event not found.' };
    }

    const ticketTier = ticketTiers.find(function (t) { return t.id === ticket_tier_id && t.event_id === event_id && t.is_active; }) || null;
    if (!ticketTier) {
      return { success: false, cart: cart, added_item: null, message: 'Ticket tier not found or inactive.' };
    }

    if (typeof ticketTier.available_quantity === 'number' && ticketTier.available_quantity < qty) {
      return { success: false, cart: cart, added_item: null, message: 'Not enough ticket quantity available.' };
    }

    // Try to merge with existing cart item
    let existingIndex = cartItems.findIndex(function (ci) {
      return ci.cart_id === cart.id && ci.item_type === 'event_ticket' && ci.event_id === event_id && ci.ticket_tier_id === ticket_tier_id;
    });

    let addedItem;
    const unitPrice = ticketTier.price || 0;

    if (existingIndex >= 0) {
      const existing = cartItems[existingIndex];
      const newQuantity = qty;
      if (typeof ticketTier.available_quantity === 'number' && ticketTier.available_quantity < newQuantity) {
        return { success: false, cart: cart, added_item: null, message: 'Not enough ticket quantity available.' };
      }
      const updated = Object.assign({}, existing, {
        quantity: newQuantity,
        total_price: unitPrice * newQuantity
      });
      cartItems[existingIndex] = updated;
      addedItem = updated;
    } else {
      addedItem = {
        id: this._generateId('cart_item'),
        cart_id: cart.id,
        item_type: 'event_ticket',
        event_id: event_id,
        ticket_tier_id: ticket_tier_id,
        menu_item_id: null,
        gift_card_product_id: null,
        quantity: qty,
        unit_price: unitPrice,
        total_price: unitPrice * qty,
        description: event.name + ' - ' + ticketTier.name,
        gift_card_amount: null,
        gift_card_recipient_name: null,
        gift_card_recipient_email: null,
        gift_card_sender_name: null,
        gift_card_message: null,
        created_at: this._nowIso()
      };
      cartItems.push(addedItem);
      if (!Array.isArray(cart.items)) cart.items = [];
      cart.items.push(addedItem.id);
    }

    this._saveToStorage('cart_items', cartItems);
    this._recalculateCartTotals(cart);

    return { success: true, cart: cart, added_item: addedItem, message: 'Tickets added to cart.' };
  }

  // 12) getCart()
  getCart() {
    const cart = this._getOrCreateCart();
    const allCartItems = this._getFromStorage('cart_items', []);

    const itemsForCart = allCartItems.filter(function (ci) { return ci.cart_id === cart.id; });
    const resolvedItems = this._resolveCartItemFKs(itemsForCart).map(function (item) {
      let displayName = '';
      let description = item.description || '';

      if (item.item_type === 'event_ticket' && item.event && item.ticket_tier) {
        displayName = item.event.name + ' - ' + item.ticket_tier.name;
      } else if (item.item_type === 'menu_item' && item.menu_item) {
        displayName = item.menu_item.name;
      } else if (item.item_type === 'gift_card' && item.gift_card_product) {
        displayName = 'Gift Card: ' + item.gift_card_product.name;
      }

      return Object.assign({}, item, {
        display_name: displayName,
        description: description
      });
    });

    // Ensure totals are up-to-date
    this._recalculateCartTotals(cart);

    return {
      cart: {
        id: cart.id,
        items: resolvedItems,
        subtotal: cart.subtotal,
        total: cart.total,
        currency: cart.currency
      }
    };
  }

  // 13) updateCartItemQuantity(cart_item_id, quantity)
  updateCartItemQuantity(cart_item_id, quantity) {
    const qty = quantity;
    let cartItems = this._getFromStorage('cart_items', []);
    const index = cartItems.findIndex(function (ci) { return ci.id === cart_item_id; });
    if (index < 0) {
      const cart = this._getOrCreateCart();
      return { cart: cart, success: false };
    }

    const item = cartItems[index];

    if (qty <= 0) {
      return this.removeCartItem(cart_item_id);
    }

    const updatedItem = Object.assign({}, item, {
      quantity: qty,
      total_price: (item.unit_price || 0) * qty
    });
    cartItems[index] = updatedItem;
    this._saveToStorage('cart_items', cartItems);

    // Recalculate cart totals
    const carts = this._getFromStorage('carts', []);
    const cart = carts.find(function (c) { return c.id === item.cart_id; }) || this._getOrCreateCart();
    this._recalculateCartTotals(cart);

    return { cart: cart, success: true };
  }

  // 14) removeCartItem(cart_item_id)
  removeCartItem(cart_item_id) {
    let cartItems = this._getFromStorage('cart_items', []);
    const item = cartItems.find(function (ci) { return ci.id === cart_item_id; }) || null;
    if (!item) {
      const cart = this._getOrCreateCart();
      return { cart: cart, success: false };
    }

    cartItems = cartItems.filter(function (ci) { return ci.id !== cart_item_id; });
    this._saveToStorage('cart_items', cartItems);

    let carts = this._getFromStorage('carts', []);
    const cartIndex = carts.findIndex(function (c) { return c.id === item.cart_id; });
    let cart;
    if (cartIndex >= 0) {
      cart = carts[cartIndex];
      cart.items = (cart.items || []).filter(function (id) { return id !== cart_item_id; });
      carts[cartIndex] = cart;
      this._saveToStorage('carts', carts);
      this._recalculateCartTotals(cart);
    } else {
      cart = this._getOrCreateCart();
    }

    return { cart: cart, success: true };
  }

  // 15) getCheckoutSummary()
  getCheckoutSummary() {
    const cart = this._getOrCreateCart();
    const allCartItems = this._getFromStorage('cart_items', []);
    const itemsForCart = allCartItems.filter(function (ci) { return ci.cart_id === cart.id; });
    const resolvedItems = this._resolveCartItemFKs(itemsForCart);

    this._recalculateCartTotals(cart);

    const subtotal = cart.subtotal || 0;
    const tax = 0;
    const fees = 0;
    const total = subtotal + tax + fees;

    // Determine allowed delivery methods based on item types
    let hasMenu = false;
    let hasGiftCard = false;
    let hasTickets = false;

    for (let i = 0; i < itemsForCart.length; i++) {
      const it = itemsForCart[i];
      if (it.item_type === 'menu_item') hasMenu = true;
      if (it.item_type === 'gift_card') hasGiftCard = true;
      if (it.item_type === 'event_ticket') hasTickets = true;
    }

    const allowed = [];
    if (hasMenu && !hasGiftCard && !hasTickets) {
      allowed.push('pickup');
    } else if (!hasMenu && (hasGiftCard || hasTickets)) {
      allowed.push('email');
    } else if (hasMenu && (hasGiftCard || hasTickets)) {
      allowed.push('mixed');
    } else {
      // empty cart - no delivery methods
    }

    return {
      items: resolvedItems,
      subtotal: subtotal,
      tax: tax,
      fees: fees,
      total: total,
      currency: cart.currency || 'USD',
      allowed_delivery_methods: allowed
    };
  }

  // 16) submitCheckout(contact_name, contact_email, contact_phone, delivery_method)
  submitCheckout(contact_name, contact_email, contact_phone, delivery_method) {
    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items', []).filter(function (ci) { return ci.cart_id === cart.id; });

    if (cartItems.length === 0) {
      return { order: null, success: false, confirmation_message: 'Cart is empty.' };
    }

    // Determine delivery method if not provided
    let chosenDelivery = delivery_method || null;
    if (!chosenDelivery) {
      const summary = this.getCheckoutSummary();
      if (summary.allowed_delivery_methods.length > 0) {
        chosenDelivery = summary.allowed_delivery_methods[0];
      }
    }

    this._recalculateCartTotals(cart);

    let orders = this._getFromStorage('orders', []);
    let orderItems = this._getFromStorage('order_items', []);

    const order = {
      id: this._generateId('order'),
      order_number: 'ORD-' + Date.now(),
      source_cart_id: cart.id,
      items: [], // order_item ids
      subtotal: cart.subtotal,
      tax: 0,
      fees: 0,
      total: cart.total,
      currency: cart.currency || 'USD',
      status: 'paid',
      order_type: chosenDelivery === 'pickup' ? 'pickup' : null,
      contact_name: contact_name,
      contact_email: contact_email,
      contact_phone: contact_phone || '',
      delivery_method: chosenDelivery || null,
      created_at: this._nowIso(),
      completed_at: this._nowIso()
    };

    for (let i = 0; i < cartItems.length; i++) {
      const ci = cartItems[i];
      const orderItem = {
        id: this._generateId('order_item'),
        order_id: order.id,
        source_cart_item_id: ci.id,
        item_type: ci.item_type,
        event_id: ci.event_id || null,
        ticket_tier_id: ci.ticket_tier_id || null,
        menu_item_id: ci.menu_item_id || null,
        gift_card_product_id: ci.gift_card_product_id || null,
        quantity: ci.quantity,
        unit_price: ci.unit_price,
        total_price: ci.total_price,
        description: ci.description || '',
        gift_card_amount: ci.gift_card_amount || null,
        gift_card_recipient_name: ci.gift_card_recipient_name || null,
        gift_card_recipient_email: ci.gift_card_recipient_email || null,
        gift_card_sender_name: ci.gift_card_sender_name || null,
        gift_card_message: ci.gift_card_message || null
      };
      orderItems.push(orderItem);
      order.items.push(orderItem.id);
    }

    orders.push(order);
    this._saveToStorage('orders', orders);
    this._saveToStorage('order_items', orderItems);

    // Clear current cart and its items after checkout
    let allCarts = this._getFromStorage('carts', []);
    allCarts = allCarts.filter(function (c) { return c.id !== cart.id; });
    this._saveToStorage('carts', allCarts);

    let allCartItems = this._getFromStorage('cart_items', []);
    allCartItems = allCartItems.filter(function (ci) { return ci.cart_id !== cart.id; });
    this._saveToStorage('cart_items', allCartItems);

    localStorage.removeItem('current_cart_id');

    return {
      order: order,
      success: true,
      confirmation_message: 'Your order has been placed successfully.'
    };
  }

  // 17) getFoodAndDrinksOverview()
  getFoodAndDrinksOverview() {
    const menuItems = this._getFromStorage('menu_items', []);
    const menuCategories = this._getFromStorage('menu_categories', []);

    const activeItems = menuItems.filter(function (mi) { return mi.is_active; });

    const featuredItemsRaw = activeItems.slice(0, 5);
    const featuredItems = this._resolveMenuItemFKs(featuredItemsRaw);

    // Highlight categories that have at least one active item
    const categoryIdsWithItems = {};
    for (let i = 0; i < activeItems.length; i++) {
      categoryIdsWithItems[activeItems[i].category_id] = true;
    }

    const highlightedCategories = menuCategories.filter(function (c) {
      return c.is_active && !!categoryIdsWithItems[c.id];
    });

    const hasOnlineOrdering = menuItems.some(function (mi) { return mi.is_active && mi.available_for_pickup; });

    return {
      featured_items: featuredItems,
      highlighted_categories: highlightedCategories,
      has_online_ordering: hasOnlineOrdering
    };
  }

  // 18) getOrderingCategories(section)
  getOrderingCategories(section) {
    const menuCategories = this._getFromStorage('menu_categories', []);
    const menuItems = this._getFromStorage('menu_items', []);

    const categories = menuCategories.filter(function (c) {
      if (!c.is_active) return false;
      if (section && c.section !== section) return false;
      // must have at least one orderable item
      const hasItem = menuItems.some(function (mi) {
        return mi.is_active && mi.available_for_pickup && mi.category_id === c.id;
      });
      return hasItem;
    });

    return { categories: categories };
  }

  // 19) listOrderableMenuItems(category_id, max_price, is_vegan, is_vegetarian, is_gluten_free)
  listOrderableMenuItems(category_id, max_price, is_vegan, is_vegetarian, is_gluten_free) {
    const menuItems = this._getFromStorage('menu_items', []);

    let items = menuItems.filter(function (mi) {
      if (!mi.is_active || !mi.available_for_pickup) return false;
      if (mi.category_id !== category_id) return false;
      if (typeof max_price === 'number' && mi.price > max_price) return false;
      if (is_vegan === true && mi.is_vegan !== true) return false;
      if (is_vegetarian === true && mi.is_vegetarian !== true) return false;
      if (is_gluten_free === true && mi.is_gluten_free !== true) return false;
      return true;
    });

    items = this._resolveMenuItemFKs(items);

    return { items: items };
  }

  // 20) addMenuItemToCart(menu_item_id, quantity)
  addMenuItemToCart(menu_item_id, quantity) {
    const qty = typeof quantity === 'number' && quantity > 0 ? quantity : 1;
    let cart = this._getOrCreateCart();

    const menuItems = this._getFromStorage('menu_items', []);
    let cartItems = this._getFromStorage('cart_items', []);

    const menuItem = menuItems.find(function (mi) { return mi.id === menu_item_id && mi.is_active; }) || null;
    if (!menuItem) {
      return { success: false, cart: cart, added_item: null, message: 'Menu item not found.' };
    }
    if (!menuItem.available_for_pickup) {
      return { success: false, cart: cart, added_item: null, message: 'Menu item not available for pickup.' };
    }

    // Merge with existing
    let existingIndex = cartItems.findIndex(function (ci) {
      return ci.cart_id === cart.id && ci.item_type === 'menu_item' && ci.menu_item_id === menu_item_id;
    });

    let addedItem;
    const unitPrice = menuItem.price || 0;

    if (existingIndex >= 0) {
      const existing = cartItems[existingIndex];
      const newQuantity = qty;
      const updated = Object.assign({}, existing, {
        quantity: newQuantity,
        total_price: unitPrice * newQuantity
      });
      cartItems[existingIndex] = updated;
      addedItem = updated;
    } else {
      addedItem = {
        id: this._generateId('cart_item'),
        cart_id: cart.id,
        item_type: 'menu_item',
        event_id: null,
        ticket_tier_id: null,
        menu_item_id: menu_item_id,
        gift_card_product_id: null,
        quantity: qty,
        unit_price: unitPrice,
        total_price: unitPrice * qty,
        description: menuItem.name,
        gift_card_amount: null,
        gift_card_recipient_name: null,
        gift_card_recipient_email: null,
        gift_card_sender_name: null,
        gift_card_message: null,
        created_at: this._nowIso()
      };
      cartItems.push(addedItem);
      if (!Array.isArray(cart.items)) cart.items = [];
      cart.items.push(addedItem.id);
    }

    this._saveToStorage('cart_items', cartItems);
    this._recalculateCartTotals(cart);

    return { success: true, cart: cart, added_item: addedItem, message: 'Menu item added to cart.' };
  }

  // 21) getMenuSectionsAndFilters()
  getMenuSectionsAndFilters() {
    const menuCategories = this._getFromStorage('menu_categories', []);
    const menuItems = this._getFromStorage('menu_items', []);

    const sections = [];
    if (menuCategories.some(function (c) { return c.section === 'food'; })) sections.push('food');
    if (menuCategories.some(function (c) { return c.section === 'drinks'; })) sections.push('drinks');

    const foodCategories = menuCategories.filter(function (c) { return c.section === 'food' && c.is_active; });
    const drinkCategories = menuCategories.filter(function (c) { return c.section === 'drinks' && c.is_active; });

    let minPrice = null;
    let maxPrice = null;
    for (let i = 0; i < menuItems.length; i++) {
      const price = menuItems[i].price;
      if (typeof price !== 'number') continue;
      if (minPrice === null || price < minPrice) minPrice = price;
      if (maxPrice === null || price > maxPrice) maxPrice = price;
    }

    const dietaryFilters = [
      { code: 'vegan', label: 'Vegan' },
      { code: 'vegetarian', label: 'Vegetarian' },
      { code: 'gluten_free', label: 'Gluten-free' }
    ];

    return {
      sections: sections,
      categories_by_section: {
        food: foodCategories,
        drinks: drinkCategories
      },
      dietary_filters: dietaryFilters,
      price_filter: {
        min_price: minPrice,
        max_price: maxPrice
      }
    };
  }

  // 22) listMenuItems(section, category_id, max_price, is_vegan, is_vegetarian, is_gluten_free)
  listMenuItems(section, category_id, max_price, is_vegan, is_vegetarian, is_gluten_free) {
    const menuItems = this._getFromStorage('menu_items', []);

    let items = menuItems.filter(function (mi) {
      if (!mi.is_active) return false;
      if (mi.section !== section) return false;
      if (category_id && mi.category_id !== category_id) return false;
      if (typeof max_price === 'number' && mi.price > max_price) return false;
      if (is_vegan === true && mi.is_vegan !== true) return false;
      if (is_vegetarian === true && mi.is_vegetarian !== true) return false;
      if (is_gluten_free === true && mi.is_gluten_free !== true) return false;
      return true;
    });

    items = this._resolveMenuItemFKs(items);

    return { items: items };
  }

  // 23) getGiftCardProducts()
  getGiftCardProducts() {
    const products = this._getFromStorage('gift_card_products', []);
    const activeProducts = products.filter(function (p) { return p.is_active; });
    return { gift_card_products: activeProducts };
  }

  // 24) configureGiftCardAndAddToCart(gift_card_product_id, amount, recipient_name, recipient_email, sender_name, message)
  configureGiftCardAndAddToCart(gift_card_product_id, amount, recipient_name, recipient_email, sender_name, message) {
    let cart = this._getOrCreateCart();

    const products = this._getFromStorage('gift_card_products', []);
    let cartItems = this._getFromStorage('cart_items', []);

    const product = products.find(function (p) { return p.id === gift_card_product_id && p.is_active; }) || null;
    if (!product) {
      return { cart: cart, added_item: null, success: false, message: 'Gift card product not found.' };
    }

    if (typeof amount !== 'number' || amount <= 0) {
      return { cart: cart, added_item: null, success: false, message: 'Invalid gift card amount.' };
    }

    if (Array.isArray(product.preset_amounts) && product.preset_amounts.length > 0) {
      if (product.preset_amounts.indexOf(amount) === -1) {
        return { cart: cart, added_item: null, success: false, message: 'Amount must match one of the preset amounts.' };
      }
    }

    if (typeof product.min_amount === 'number' && amount < product.min_amount) {
      return { cart: cart, added_item: null, success: false, message: 'Amount is below minimum allowed.' };
    }

    if (typeof product.max_amount === 'number' && amount > product.max_amount) {
      return { cart: cart, added_item: null, success: false, message: 'Amount exceeds maximum allowed.' };
    }

    const qty = 1;

    const addedItem = {
      id: this._generateId('cart_item'),
      cart_id: cart.id,
      item_type: 'gift_card',
      event_id: null,
      ticket_tier_id: null,
      menu_item_id: null,
      gift_card_product_id: gift_card_product_id,
      quantity: qty,
      unit_price: amount,
      total_price: amount * qty,
      description: 'Gift Card: ' + product.name,
      gift_card_amount: amount,
      gift_card_recipient_name: recipient_name,
      gift_card_recipient_email: recipient_email || null,
      gift_card_sender_name: sender_name,
      gift_card_message: message || '',
      created_at: this._nowIso()
    };

    cartItems.push(addedItem);
    if (!Array.isArray(cart.items)) cart.items = [];
    cart.items.push(addedItem.id);

    this._saveToStorage('cart_items', cartItems);
    this._recalculateCartTotals(cart);

    return { cart: cart, added_item: addedItem, success: true, message: 'Gift card added to cart.' };
  }

  // 25) getNewsletterPreferencesOptions()
  getNewsletterPreferencesOptions() {
    const genreOptions = [
      { value: 'jazz', label: 'Jazz' },
      { value: 'rock', label: 'Rock' },
      { value: 'blues', label: 'Blues' },
      { value: 'comedy', label: 'Comedy' },
      { value: 'acoustic', label: 'Acoustic' },
      { value: 'other', label: 'Other' }
    ];

    const frequencyOptions = [
      { value: 'instant', label: 'Instant' },
      { value: 'daily', label: 'Daily' },
      { value: 'weekly', label: 'Weekly' },
      { value: 'biweekly', label: 'Biweekly' },
      { value: 'monthly', label: 'Monthly' }
    ];

    return {
      genre_options: genreOptions,
      frequency_options: frequencyOptions,
      default_frequency: 'weekly',
      special_event_updates_default: true
    };
  }

  // 26) subscribeToNewsletter(full_name, email, genre_preferences, frequency, wants_special_event_updates)
  subscribeToNewsletter(full_name, email, genre_preferences, frequency, wants_special_event_updates) {
    let subscriptions = this._getFromStorage('newsletter_subscriptions', []);

    const subscription = {
      id: this._generateId('newsletter_subscription'),
      full_name: full_name,
      email: email,
      genre_preferences: Array.isArray(genre_preferences) ? genre_preferences.slice() : [],
      frequency: frequency,
      wants_special_event_updates: !!wants_special_event_updates,
      status: 'active',
      created_at: this._nowIso()
    };

    subscriptions.push(subscription);
    this._saveToStorage('newsletter_subscriptions', subscriptions);

    return {
      subscription: subscription,
      success: true,
      confirmation_message: 'You have been subscribed to the newsletter.'
    };
  }

  // 27) getLoyaltyProgramInfo()
  getLoyaltyProgramInfo() {
    const info = this._getFromStorage('loyalty_program_info', null) || {
      headline: '',
      description: '',
      benefits: []
    };
    return {
      headline: info.headline || '',
      description: info.description || '',
      benefits: Array.isArray(info.benefits) ? info.benefits : []
    };
  }

  // 28) getLoyaltyPreferenceOptions()
  getLoyaltyPreferenceOptions() {
    const eventTypeOptions = [
      { value: 'live_jazz', label: 'Live Jazz' },
      { value: 'stand_up_comedy', label: 'Stand-up Comedy' },
      { value: 'dj_night', label: 'DJ Night' },
      { value: 'open_mic', label: 'Open Mic' },
      { value: 'other', label: 'Other' }
    ];

    return {
      event_type_options: eventTypeOptions,
      sms_opt_in_default: true
    };
  }

  // 29) createLoyaltyProfile(first_name, last_name, email, mobile_number, event_type_preferences, sms_opt_in, password)
  createLoyaltyProfile(first_name, last_name, email, mobile_number, event_type_preferences, sms_opt_in, password) {
    let profiles = this._getFromStorage('loyalty_profiles', []);

    const profile = {
      id: this._generateId('loyalty_profile'),
      first_name: first_name,
      last_name: last_name,
      email: email,
      mobile_number: mobile_number,
      event_type_preferences: Array.isArray(event_type_preferences) ? event_type_preferences.slice() : [],
      sms_opt_in: !!sms_opt_in,
      password: password,
      status: 'active',
      created_at: this._nowIso(),
      updated_at: this._nowIso()
    };

    profiles.push(profile);
    this._saveToStorage('loyalty_profiles', profiles);

    return {
      profile: profile,
      success: true,
      confirmation_message: 'Loyalty profile created successfully.'
    };
  }

  // 30) getVenueInfo()
  getVenueInfo() {
    const info = this._getFromStorage('venue_info', null) || {};
    return {
      story: info.story || '',
      mission: info.mission || '',
      address: info.address || '',
      phone: info.phone || '',
      hours: Array.isArray(info.hours) ? info.hours : [],
      entertainment_overview: info.entertainment_overview || ''
    };
  }

  // 31) getContactInfo()
  getContactInfo() {
    const info = this._getFromStorage('contact_info', null) || {};
    return {
      address: info.address || '',
      phone: info.phone || '',
      email: info.email || ''
    };
  }

  // 32) submitContactForm(name, email, topic, subject, message)
  submitContactForm(name, email, topic, subject, message) {
    let submissions = this._getFromStorage('contact_form_submissions', []);

    const submission = {
      id: this._generateId('contact_submission'),
      name: name,
      email: email,
      topic: topic || 'general',
      subject: subject || '',
      message: message,
      created_at: this._nowIso()
    };

    submissions.push(submission);
    this._saveToStorage('contact_form_submissions', submissions);

    return {
      success: true,
      confirmation_message: 'Your message has been received.'
    };
  }

  // 33) getFaqEntries()
  getFaqEntries() {
    const faqs = this._getFromStorage('faqs', []);
    return { faqs: faqs };
  }

  // 34) getPrivacyPolicyContent()
  getPrivacyPolicyContent() {
    const policy = this._getFromStorage('privacy_policy', null) || {};
    return {
      last_updated: policy.last_updated || '',
      sections: Array.isArray(policy.sections) ? policy.sections : []
    };
  }

  // 35) getTermsAndConditionsContent()
  getTermsAndConditionsContent() {
    const terms = this._getFromStorage('terms_and_conditions', null) || {};
    return {
      last_updated: terms.last_updated || '',
      sections: Array.isArray(terms.sections) ? terms.sections : []
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
