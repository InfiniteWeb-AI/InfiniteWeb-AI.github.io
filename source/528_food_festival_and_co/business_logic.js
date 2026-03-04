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

  // ---------------------- INIT & STORAGE HELPERS ----------------------
  _initStorage() {
    // All entity tables
    const tables = [
      'ticket_types',
      'promo_codes',
      'ticket_delivery_methods',
      'token_pickup_options',
      'token_bundles',
      'carts',
      'cart_items',
      'orders',
      'order_items',
      'competitions',
      'competition_registrations',
      'vendors',
      'vendor_availabilities',
      'menu_items',
      'vendor_lists',
      'vendor_list_items',
      'workshops',
      'activities',
      'schedule_items',
      'past_visits',
      'reviews',
      'contact_inquiries'
    ];

    for (const key of tables) {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    }

    // Pending ticket selection for checkout
    if (!localStorage.getItem('pending_ticket_selection')) {
      localStorage.setItem(
        'pending_ticket_selection',
        JSON.stringify({ selections: [], promo_code: null, updated_at: null })
      );
    }

    // Single-user cart pointer
    if (!localStorage.getItem('current_cart_id')) {
      localStorage.setItem('current_cart_id', '');
    }

    // Schedule meta (confirmation flags, etc.)
    if (!localStorage.getItem('schedule_meta')) {
      localStorage.setItem(
        'schedule_meta',
        JSON.stringify({
          confirmed: {
            family: {},
            general: {}
          }
        })
      );
    }

    // ID counter
    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, defaultValue = []) {
    const data = localStorage.getItem(key);
    if (data === null || data === undefined) return defaultValue;
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

  _nowISO() {
    return new Date().toISOString();
  }

  _parseLocalTimeToMinutes(timeStr) {
    if (!timeStr) return null;
    const parts = timeStr.split(':');
    if (parts.length < 2) return null;
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) || 0;
    if (isNaN(h) || isNaN(m)) return null;
    return h * 60 + m;
  }

  _getLocalMinutesFromDate(dateStr) {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;
    return d.getHours() * 60 + d.getMinutes();
  }

  _comparePriceLevel(levelA, levelB) {
    const order = { cheap: 1, moderate: 2, expensive: 3 };
    return (order[levelA] || 0) - (order[levelB] || 0);
  }

  _normalizeString(str) {
    return (str || '').toString().toLowerCase();
  }

  _getEntityById(table, id) {
    if (!id) return null;
    const arr = this._getFromStorage(table, []);
    return arr.find((e) => e.id === id) || null;
  }

  _updateEntity(table, entity) {
    const arr = this._getFromStorage(table, []);
    const idx = arr.findIndex((e) => e.id === entity.id);
    if (idx >= 0) {
      arr[idx] = entity;
      this._saveToStorage(table, arr);
    }
  }

  _removeEntity(table, id) {
    const arr = this._getFromStorage(table, []);
    const filtered = arr.filter((e) => e.id !== id);
    this._saveToStorage(table, filtered);
  }

  // ---------------------- HELPER: CART & TICKETS ----------------------
  _getOrCreateCart() {
    let carts = this._getFromStorage('carts', []);
    let currentCartId = localStorage.getItem('current_cart_id') || '';
    let cart = null;

    if (currentCartId) {
      cart = carts.find((c) => c.id === currentCartId && c.status === 'open') || null;
    }

    if (!cart) {
      cart = carts.find((c) => c.status === 'open') || null;
    }

    if (!cart) {
      cart = {
        id: this._generateId('cart'),
        status: 'open',
        cart_item_ids: [],
        promo_code: null,
        created_at: this._nowISO(),
        updated_at: null
      };
      carts.push(cart);
      this._saveToStorage('carts', carts);
    }

    localStorage.setItem('current_cart_id', cart.id);
    return cart;
  }

  _getPendingTicketSelection() {
    const raw = this._getFromStorage('pending_ticket_selection', null);
    if (!raw || typeof raw !== 'object') {
      return { selections: [], promo_code: null, updated_at: null };
    }
    return raw;
  }

  _savePendingTicketSelection(data) {
    this._saveToStorage('pending_ticket_selection', data);
  }

  _findPromoByCode(code) {
    if (!code) return null;
    const norm = this._normalizeString(code);
    const promos = this._getFromStorage('promo_codes', []);
    const now = new Date();
    return (
      promos.find((p) => {
        if (!p.is_active) return false;
        if (this._normalizeString(p.code) !== norm) return false;
        if (p.start_datetime) {
          const sd = new Date(p.start_datetime);
          if (now < sd) return false;
        }
        if (p.end_datetime) {
          const ed = new Date(p.end_datetime);
          if (now > ed) return false;
        }
        return true;
      }) || null
    );
  }

  _calculateTicketFees(ticketType, quantity) {
    if (!ticketType) return 0;
    const fee = ticketType.fee_per_ticket || 0;
    return fee * (quantity || 0);
  }

  // ---------------------- HELPER: SCHEDULE ----------------------
  _getUserScheduleState() {
    const state = this._getFromStorage('schedule_meta', null);
    if (!state || typeof state !== 'object') {
      return { confirmed: { family: {}, general: {} } };
    }
    if (!state.confirmed) state.confirmed = { family: {}, general: {} };
    if (!state.confirmed.family) state.confirmed.family = {};
    if (!state.confirmed.general) state.confirmed.general = {};
    return state;
  }

  _saveUserScheduleState(state) {
    this._saveToStorage('schedule_meta', state);
  }

  _detectScheduleConflicts(candidate, existingItems) {
    if (!candidate || !candidate.start_datetime || !candidate.end_datetime) {
      return { hasConflict: false, conflictingItems: [] };
    }
    const candStart = new Date(candidate.start_datetime).getTime();
    const candEnd = new Date(candidate.end_datetime).getTime();
    if (isNaN(candStart) || isNaN(candEnd)) {
      return { hasConflict: false, conflictingItems: [] };
    }

    const conflicts = [];
    for (const item of existingItems || []) {
      if (!item || !item.start_datetime || !item.end_datetime) continue;
      const s = new Date(item.start_datetime).getTime();
      const e = new Date(item.end_datetime).getTime();
      if (isNaN(s) || isNaN(e)) continue;

      // Optional: only compare same day_of_week if both have it
      if (candidate.day_of_week && item.day_of_week && candidate.day_of_week !== item.day_of_week) {
        continue;
      }

      const overlaps = candStart < e && candEnd > s;
      if (overlaps) conflicts.push(item);
    }

    return { hasConflict: conflicts.length > 0, conflictingItems: conflicts };
  }

  // ---------------------- HELPER: VENDOR LISTS ----------------------
  _getOrCreateVendorListByType(list_type) {
    let lists = this._getFromStorage('vendor_lists', []);
    let list = lists.find((l) => l.list_type === list_type) || null;
    if (!list) {
      let defaultName = 'Custom List';
      if (list_type === 'tasting_list') defaultName = 'My Tasting List';
      else if (list_type === 'quick_bites') defaultName = 'Quick Bites';
      else if (list_type === 'favorites') defaultName = 'Favorites';

      list = {
        id: this._generateId('vendor_list'),
        name: defaultName,
        list_type,
        description: '',
        created_at: this._nowISO(),
        updated_at: null,
        planned_day_of_week: null,
        planned_date: null,
        planned_start_time: null,
        planned_end_time: null,
        is_pinned: false
      };
      lists.push(list);
      this._saveToStorage('vendor_lists', lists);
    }
    return list;
  }

  // ---------------------- HOME OVERVIEW ----------------------
  getHomeOverview() {
    const featured_ticket_types = this._getFromStorage('ticket_types', []).filter((t) => t.is_active).slice(0, 5);
    const featured_competitions = this._getFromStorage('competitions', []).filter((c) => c.status === 'open').slice(0, 5);
    const featured_workshops = this._getFromStorage('workshops', []).filter((w) => w.status === 'scheduled').slice(0, 5);
    const featured_family_activities = this._getFromStorage('activities', []).filter((a) => a.status === 'scheduled' && (a.is_family_friendly || a.is_kid_friendly)).slice(0, 5);
    const featured_vendors = this._getFromStorage('vendors', []).filter((v) => v.is_active).slice(0, 5);
    const featured_token_bundles = this._getFromStorage('token_bundles', []).filter((b) => b.is_active).slice(0, 5);

    const now = new Date();
    const active_promo_codes = this._getFromStorage('promo_codes', []).filter((p) => {
      if (!p.is_active) return false;
      if (p.start_datetime) {
        const sd = new Date(p.start_datetime);
        if (now < sd) return false;
      }
      if (p.end_datetime) {
        const ed = new Date(p.end_datetime);
        if (now > ed) return false;
      }
      return true;
    });

    const message = 'Home overview generated from current festival data.';

    return {
      featured_ticket_types,
      featured_competitions,
      featured_workshops,
      featured_family_activities,
      featured_vendors,
      featured_token_bundles,
      active_promo_codes,
      message
    };
  }

  // ---------------------- TICKETS ----------------------
  getTicketFilterOptions() {
    const day_options = [
      { value: 'friday', label: 'Friday' },
      { value: 'saturday', label: 'Saturday' },
      { value: 'sunday', label: 'Sunday' }
    ];

    const ticket_type_options = [
      { value: 'general_admission', label: 'General Admission' },
      { value: 'vip', label: 'VIP' },
      { value: 'weekend_pass', label: 'Weekend Pass' },
      { value: 'multi_day_pass', label: 'Multi-day Pass' },
      { value: 'child', label: 'Child' },
      { value: 'senior', label: 'Senior' },
      { value: 'other', label: 'Other' }
    ];

    const ticketTypes = this._getFromStorage('ticket_types', []);
    let max_tickets_per_order = 10;
    for (const t of ticketTypes) {
      if (typeof t.max_per_order === 'number') {
        if (!max_tickets_per_order || t.max_per_order > max_tickets_per_order) {
          max_tickets_per_order = t.max_per_order;
        }
      }
    }

    return { day_options, ticket_type_options, max_tickets_per_order };
  }

  listTicketTypes(day_of_week, ticket_type, only_active = true) {
    let tickets = this._getFromStorage('ticket_types', []);
    tickets = tickets.filter((t) => t.day_of_week === day_of_week);
    if (ticket_type) {
      tickets = tickets.filter((t) => t.ticket_type === ticket_type);
    }
    if (only_active) {
      tickets = tickets.filter((t) => t.is_active);
    }
    return tickets;
  }

  previewTicketPricing(selections, promo_code) {
    const ticketTypes = this._getFromStorage('ticket_types', []);
    const promo = promo_code ? this._findPromoByCode(promo_code) : null;
    const appliesToTickets = promo && (promo.applies_to === 'tickets' || promo.applies_to === 'all_items');

    const line_items = [];
    let tickets_subtotal_before_discounts = 0;

    for (const sel of selections || []) {
      const t = ticketTypes.find((tt) => tt.id === sel.ticket_type_id);
      if (!t || !t.is_active) continue;
      const quantity = sel.quantity || 0;
      const line_subtotal_before_discounts = (t.base_price || 0) * quantity;
      tickets_subtotal_before_discounts += line_subtotal_before_discounts;
      line_items.push({
        ticket_type: t,
        quantity,
        line_subtotal_before_discounts,
        line_discount: 0,
        line_subtotal_after_discounts: line_subtotal_before_discounts,
        estimated_fees: 0,
        estimated_line_total_with_fees: line_subtotal_before_discounts
      });
    }

    let tickets_discount_total = 0;
    let promo_code_valid = false;
    let promo_code_message = '';

    if (promo && appliesToTickets && tickets_subtotal_before_discounts > 0) {
      promo_code_valid = true;
      if (promo.min_order_amount && tickets_subtotal_before_discounts < promo.min_order_amount) {
        promo_code_valid = false;
        promo_code_message = 'Promo code does not meet minimum order amount.';
      }

      if (promo_code_valid) {
        if (promo.discount_type === 'percent') {
          tickets_discount_total = (tickets_subtotal_before_discounts * (promo.discount_value || 0)) / 100;
        } else if (promo.discount_type === 'fixed_amount') {
          tickets_discount_total = promo.discount_value || 0;
        }

        if (tickets_discount_total > tickets_subtotal_before_discounts) {
          tickets_discount_total = tickets_subtotal_before_discounts;
        }
      }
    } else if (promo_code && !promo) {
      promo_code_message = 'Promo code not found or inactive.';
    }

    const tickets_subtotal_after_discounts = tickets_subtotal_before_discounts - tickets_discount_total;

    // Allocate discount proportionally to lines
    if (tickets_discount_total > 0 && tickets_subtotal_before_discounts > 0) {
      let allocated = 0;
      for (let i = 0; i < line_items.length; i++) {
        const li = line_items[i];
        const isLast = i === line_items.length - 1;
        let line_discount;
        if (isLast) {
          line_discount = tickets_discount_total - allocated;
        } else {
          line_discount = (tickets_discount_total * li.line_subtotal_before_discounts) / tickets_subtotal_before_discounts;
          line_discount = Math.round(line_discount * 100) / 100;
        }
        allocated += line_discount;
        li.line_discount = line_discount;
        li.line_subtotal_after_discounts = li.line_subtotal_before_discounts - line_discount;
      }
    }

    // Fees and estimated totals
    let estimated_fees_total = 0;
    let estimated_order_total = 0;
    for (const li of line_items) {
      const fees = this._calculateTicketFees(li.ticket_type, li.quantity);
      li.estimated_fees = fees;
      li.estimated_line_total_with_fees = li.line_subtotal_after_discounts + fees;
      estimated_fees_total += fees;
      estimated_order_total += li.estimated_line_total_with_fees;
    }

    return {
      line_items,
      tickets_subtotal_before_discounts,
      tickets_discount_total,
      tickets_subtotal_after_discounts,
      estimated_fees_total,
      estimated_order_total,
      applied_promo_code: promo_code_valid ? promo_code : null,
      promo_code_valid,
      promo_code_message
    };
  }

  setTicketSelectionForCheckout(selections, promo_code) {
    const preview = this.previewTicketPricing(selections, promo_code);
    const pending_ticket_count = (preview.line_items || []).reduce((sum, li) => sum + (li.quantity || 0), 0);

    const data = {
      selections: selections || [],
      promo_code: preview.promo_code_valid ? promo_code : null,
      updated_at: this._nowISO()
    };
    this._savePendingTicketSelection(data);

    return {
      success: true,
      pending_ticket_count,
      tickets_subtotal_after_discounts: preview.tickets_subtotal_after_discounts,
      applied_promo_code: preview.promo_code_valid ? promo_code : null,
      message: preview.promo_code_message || 'Ticket selection updated.'
    };
  }

  getCheckoutSummary() {
    const pending = this._getPendingTicketSelection();
    const preview = this.previewTicketPricing(pending.selections || [], pending.promo_code || undefined);

    const tickets = (preview.line_items || []).map((li) => ({
      ticket_type: li.ticket_type,
      quantity: li.quantity,
      line_subtotal_before_discounts: li.line_subtotal_before_discounts,
      line_discount: li.line_discount,
      line_subtotal_after_discounts: li.line_subtotal_after_discounts,
      fees: li.estimated_fees,
      line_total: li.estimated_line_total_with_fees
    }));

    // Cart / token bundles
    const cart = this._getOrCreateCart();
    const allCartItems = this._getFromStorage('cart_items', []);
    const bundles = this._getFromStorage('token_bundles', []);
    const cartItemsForCart = allCartItems.filter((ci) => ci.cart_id === cart.id);

    const token_bundle_items = cartItemsForCart.map((ci) => ({
      cart_item: ci,
      token_bundle: bundles.find((b) => b.id === ci.item_ref_id) || null
    }));

    let tokens_subtotal = 0;
    for (const ci of cartItemsForCart) {
      tokens_subtotal += ci.line_total || 0;
    }

    const tickets_subtotal_after_discounts = preview.tickets_subtotal_after_discounts || 0;
    const tickets_discount_total = preview.tickets_discount_total || 0;
    const ticket_fees_total = preview.estimated_fees_total || 0;
    const ticket_total_with_fees = preview.estimated_order_total || 0;

    const subtotal = tickets_subtotal_after_discounts + tokens_subtotal;
    const fees_total = ticket_fees_total; // no extra fees for token bundles here
    const discount_total = tickets_discount_total;
    const total = ticket_total_with_fees + tokens_subtotal;

    const has_tickets = (pending.selections || []).length > 0;
    const has_token_bundles = cartItemsForCart.length > 0;
    const is_ready_for_checkout = has_tickets || has_token_bundles;

    return {
      tickets,
      token_bundle_items,
      subtotal,
      fees_total,
      discount_total,
      total,
      applied_promo_code: preview.promo_code_valid ? pending.promo_code : null,
      has_tickets,
      has_token_bundles,
      is_ready_for_checkout
    };
  }

  getAvailableTicketDeliveryMethods() {
    return this._getFromStorage('ticket_delivery_methods', []).filter((m) => m.is_active);
  }

  getAvailableTokenPickupOptions() {
    return this._getFromStorage('token_pickup_options', []).filter((o) => o.is_active);
  }

  placeOrder(buyer_name, buyer_email, buyer_phone, delivery_method_id, pickup_option_id, notes, agrees_to_terms) {
    if (!agrees_to_terms) {
      return { success: false, order: null, order_items: [], message: 'You must agree to terms to place an order.' };
    }

    const checkout = this.getCheckoutSummary();
    if (!checkout.is_ready_for_checkout) {
      return { success: false, order: null, order_items: [], message: 'No items to checkout.' };
    }

    const cart = this._getOrCreateCart();
    const pending = this._getPendingTicketSelection();
    const promo = pending.promo_code ? this._findPromoByCode(pending.promo_code) : null;

    const orderId = this._generateId('order');
    const order_number = 'ORD-' + orderId.split('_')[1];

    const order = {
      id: orderId,
      order_number,
      cart_id: cart && cart.id ? cart.id : null,
      status: 'completed',
      subtotal: checkout.subtotal,
      fees_total: checkout.fees_total,
      discount_total: checkout.discount_total,
      total: checkout.total,
      promo_code: pending.promo_code || null,
      promo_code_id: promo ? promo.id : null,
      delivery_method_id: delivery_method_id || null,
      pickup_option_id: pickup_option_id || null,
      buyer_name,
      buyer_email,
      buyer_phone: buyer_phone || null,
      notes: notes || null,
      created_at: this._nowISO(),
      updated_at: null
    };

    const order_items = [];

    // Ticket order items
    for (const li of checkout.tickets || []) {
      const ticketType = li.ticket_type;
      const oi = {
        id: this._generateId('order_item'),
        order_id: order.id,
        item_type: 'ticket',
        item_ref_id: ticketType.id,
        name: ticketType.name,
        unit_price: ticketType.base_price || 0,
        quantity: li.quantity || 0,
        line_subtotal: li.line_subtotal_before_discounts || 0,
        fees: li.fees || 0,
        discounts: li.line_discount || 0,
        line_total: li.line_total || 0
      };
      order_items.push(oi);
    }

    // Token bundle order items
    for (const bi of checkout.token_bundle_items || []) {
      const ci = bi.cart_item;
      const bundle = bi.token_bundle;
      if (!ci || !bundle) continue;
      const line_subtotal = (ci.unit_price || 0) * (ci.quantity || 0);
      const oi = {
        id: this._generateId('order_item'),
        order_id: order.id,
        item_type: 'token_bundle',
        item_ref_id: bundle.id,
        name: bundle.name,
        unit_price: ci.unit_price || 0,
        quantity: ci.quantity || 0,
        line_subtotal,
        fees: 0,
        discounts: 0,
        line_total: line_subtotal
      };
      order_items.push(oi);
    }

    const orders = this._getFromStorage('orders', []);
    orders.push(order);
    this._saveToStorage('orders', orders);

    const existingOrderItems = this._getFromStorage('order_items', []);
    this._saveToStorage('order_items', existingOrderItems.concat(order_items));

    // Update cart status and clear current cart items
    let carts = this._getFromStorage('carts', []);
    const cartIdx = carts.findIndex((c) => c.id === cart.id);
    if (cartIdx >= 0) {
      carts[cartIdx] = { ...carts[cartIdx], status: 'converted_to_order', updated_at: this._nowISO() };
      this._saveToStorage('carts', carts);
    }

    // Clear cart items
    let cartItems = this._getFromStorage('cart_items', []);
    cartItems = cartItems.filter((ci) => ci.cart_id !== cart.id);
    this._saveToStorage('cart_items', cartItems);
    localStorage.setItem('current_cart_id', '');

    // Clear pending tickets
    this._savePendingTicketSelection({ selections: [], promo_code: null, updated_at: this._nowISO() });

    return { success: true, order, order_items, message: 'Order placed successfully.' };
  }

  // ---------------------- COMPETITIONS ----------------------
  getCompetitionFilterOptions() {
    const category_options = [
      { value: 'dessert', label: 'Dessert' },
      { value: 'chili', label: 'Chili' },
      { value: 'bbq', label: 'BBQ' },
      { value: 'appetizer', label: 'Appetizer' },
      { value: 'entree', label: 'Entrée' },
      { value: 'beverage', label: 'Beverage' },
      { value: 'other', label: 'Other' }
    ];

    const dietary_focus_options = [
      { value: 'none', label: 'None' },
      { value: 'vegan', label: 'Vegan' },
      { value: 'vegetarian', label: 'Vegetarian' },
      { value: 'gluten_free', label: 'Gluten Free' }
    ];

    const day_options = [
      { value: 'friday', label: 'Friday' },
      { value: 'saturday', label: 'Saturday' },
      { value: 'sunday', label: 'Sunday' }
    ];

    const comps = this._getFromStorage('competitions', []);
    let max_entry_fee_default = 100;
    for (const c of comps) {
      if (typeof c.entry_fee === 'number' && c.entry_fee > max_entry_fee_default) {
        max_entry_fee_default = c.entry_fee;
      }
    }

    return { category_options, dietary_focus_options, day_options, max_entry_fee_default };
  }

  searchCompetitions(query, category, dietary_focus, day_of_week, start_time_from, start_time_to, max_entry_fee, keyword) {
    let competitions = this._getFromStorage('competitions', []);

    competitions = competitions.filter((c) => c.status === 'open');

    const q = this._normalizeString(query || keyword || '');
    if (q) {
      competitions = competitions.filter((c) => {
        return (
          this._normalizeString(c.name).includes(q) ||
          this._normalizeString(c.description).includes(q)
        );
      });
    }

    if (category) {
      competitions = competitions.filter((c) => c.category === category);
    }

    if (dietary_focus) {
      competitions = competitions.filter((c) => c.dietary_focus === dietary_focus);
    }

    if (day_of_week) {
      competitions = competitions.filter((c) => c.day_of_week === day_of_week);
    }

    const fromMin = this._parseLocalTimeToMinutes(start_time_from);
    const toMin = this._parseLocalTimeToMinutes(start_time_to);
    if (fromMin !== null || toMin !== null) {
      competitions = competitions.filter((c) => {
        const m = this._getLocalMinutesFromDate(c.start_datetime);
        if (m === null) return false;
        if (fromMin !== null && m < fromMin) return false;
        if (toMin !== null && m > toMin) return false;
        return true;
      });
    }

    if (typeof max_entry_fee === 'number') {
      competitions = competitions.filter((c) => (c.entry_fee || 0) <= max_entry_fee);
    }

    return competitions;
  }

  getCompetitionDetail(competition_id) {
    const competition = this._getEntityById('competitions', competition_id);
    if (!competition) {
      return {
        competition: null,
        can_register: false,
        registration_status_note: 'Competition not found.',
        participant_type_options: []
      };
    }

    const can_register =
      competition.status === 'open' &&
      (typeof competition.remaining_spots !== 'number' || competition.remaining_spots > 0);

    let registration_status_note = can_register ? 'Registration is open.' : 'Registration is not available.';

    const participant_type_options =
      Array.isArray(competition.participant_type_options) && competition.participant_type_options.length
        ? competition.participant_type_options
        : ['home_cook', 'amateur', 'professional', 'youth'];

    // Instrumentation for task completion tracking
    try {
      const isChiliCategory = competition.category === 'chili';
      const nameNorm = this._normalizeString(competition.name);
      const descNorm = this._normalizeString(competition.description);
      const isChiliText = nameNorm.includes('chili') || descNorm.includes('chili');
      if (isChiliCategory || isChiliText) {
        const existing = localStorage.getItem('task8_comparedCompetitionIds');
        let ids = [];
        if (existing) {
          try {
            ids = JSON.parse(existing);
          } catch (e2) {
            ids = [];
          }
        }
        if (!Array.isArray(ids)) ids = [];
        const updated = [...new Set(ids.concat(competition.id))];
        localStorage.setItem('task8_comparedCompetitionIds', JSON.stringify(updated));
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return { competition, can_register, registration_status_note, participant_type_options };
  }

  registerForCompetition(competition_id, participant_name, team_name, phone, email, participant_type, dish_name, dish_description, agrees_to_terms) {
    if (!agrees_to_terms) {
      return { success: false, registration: null, message: 'You must agree to the terms.' };
    }

    const competition = this._getEntityById('competitions', competition_id);
    if (!competition) {
      return { success: false, registration: null, message: 'Competition not found.' };
    }

    if (competition.status !== 'open') {
      return { success: false, registration: null, message: 'Competition is not open for registration.' };
    }

    if (typeof competition.remaining_spots === 'number' && competition.remaining_spots <= 0) {
      return { success: false, registration: null, message: 'Competition is full.' };
    }

    const registration = {
      id: this._generateId('competition_registration'),
      competition_id,
      created_at: this._nowISO(),
      updated_at: null,
      status: 'confirmed',
      participant_name,
      team_name: team_name || null,
      phone,
      email: email || null,
      participant_type,
      dish_name: dish_name || null,
      dish_description: dish_description || null,
      agrees_to_terms: !!agrees_to_terms
    };

    const regs = this._getFromStorage('competition_registrations', []);
    regs.push(registration);
    this._saveToStorage('competition_registrations', regs);

    // Decrement remaining_spots if applicable
    let competitions = this._getFromStorage('competitions', []);
    const idx = competitions.findIndex((c) => c.id === competition_id);
    if (idx >= 0 && typeof competitions[idx].remaining_spots === 'number') {
      competitions[idx].remaining_spots = Math.max(0, competitions[idx].remaining_spots - 1);
      this._saveToStorage('competitions', competitions);
    }

    // Instrumentation for task completion tracking
    try {
      const isChiliCategory = competition.category === 'chili';
      const nameNorm = this._normalizeString(competition.name);
      const descNorm = this._normalizeString(competition.description);
      const isChiliText = nameNorm.includes('chili') || descNorm.includes('chili');
      if (isChiliCategory || isChiliText) {
        localStorage.setItem('task8_selectedCompetitionId', competition_id);
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return { success: true, registration, message: 'Successfully registered for competition.' };
  }

  // ---------------------- VENDORS & LISTS ----------------------
  getVendorFilterOptions() {
    const dietary_options = [
      { value: 'vegetarian', label: 'Vegetarian' },
      { value: 'vegetarian_friendly', label: 'Vegetarian Friendly' },
      { value: 'vegan', label: 'Vegan' },
      { value: 'gluten_free', label: 'Gluten Free' },
      { value: 'gluten_free_options', label: 'Gluten Free Options' },
      { value: 'omnivore', label: 'Omnivore' }
    ];

    const rating_threshold_options = [3, 3.5, 4, 4.5];

    const price_level_options = [
      { value: 'cheap', label: 'Cheap' },
      { value: 'moderate', label: 'Moderate' },
      { value: 'expensive', label: 'Expensive' }
    ];

    const wait_time_options = [5, 10, 15, 20];

    const day_options = [
      { value: 'friday', label: 'Friday' },
      { value: 'saturday', label: 'Saturday' },
      { value: 'sunday', label: 'Sunday' }
    ];

    return { dietary_options, rating_threshold_options, price_level_options, wait_time_options, day_options };
  }

  searchVendors(query, dietary_filter, min_rating, max_price_level, max_wait_time_minutes, day_of_week, time_range_start, time_range_end) {
    let vendors = this._getFromStorage('vendors', []).filter((v) => v.is_active);

    const q = this._normalizeString(query || '');
    if (q) {
      vendors = vendors.filter((v) => {
        return (
          this._normalizeString(v.name).includes(q) ||
          this._normalizeString(v.cuisine_type).includes(q) ||
          this._normalizeString(v.description).includes(q)
        );
      });
    }

    if (dietary_filter) {
      vendors = vendors.filter((v) => {
        if (v.primary_dietary_type === dietary_filter) return true;
        if (Array.isArray(v.dietary_tags)) {
          return v.dietary_tags.map((t) => this._normalizeString(t)).includes(this._normalizeString(dietary_filter));
        }
        return false;
      });
    }

    if (typeof min_rating === 'number') {
      vendors = vendors.filter((v) => (v.avg_rating || 0) >= min_rating);
    }

    if (max_price_level) {
      vendors = vendors.filter((v) => {
        if (!v.price_level) return true;
        return this._comparePriceLevel(v.price_level, max_price_level) <= 0;
      });
    }

    if (typeof max_wait_time_minutes === 'number') {
      vendors = vendors.filter((v) => {
        if (typeof v.avg_wait_time_minutes !== 'number') return true;
        return v.avg_wait_time_minutes <= max_wait_time_minutes;
      });
    }

    const fromMin = this._parseLocalTimeToMinutes(time_range_start);
    const toMin = this._parseLocalTimeToMinutes(time_range_end);

    if (day_of_week || fromMin !== null || toMin !== null) {
      const availabilities = this._getFromStorage('vendor_availabilities', []);
      vendors = vendors.filter((v) => {
        const avs = availabilities.filter((a) => a.vendor_id === v.id);
        if (!avs.length) return false;
        return avs.some((a) => {
          if (day_of_week && a.day_of_week !== day_of_week) return false;
          if (fromMin === null && toMin === null) return true;
          const s = this._getLocalMinutesFromDate(a.start_datetime);
          const e = this._getLocalMinutesFromDate(a.end_datetime);
          if (s === null || e === null) return false;
          const windowStart = fromMin !== null ? fromMin : s;
          const windowEnd = toMin !== null ? toMin : e;
          return s < windowEnd && e > windowStart;
        });
      });
    }

    return vendors;
  }

  getVendorDetail(vendor_id) {
    const vendor = this._getEntityById('vendors', vendor_id);
    if (!vendor) {
      return {
        vendor: null,
        menu_items: [],
        availabilities: [],
        reviews: [],
        average_rating: 0,
        review_count: 0
      };
    }

    const menu_items = this._getFromStorage('menu_items', []).filter((m) => m.vendor_id === vendor.id);
    const availabilities = this._getFromStorage('vendor_availabilities', []).filter((a) => a.vendor_id === vendor.id);
    const reviews = this._getFromStorage('reviews', []).filter((r) => r.vendor_id === vendor.id && r.is_visible);

    const review_count = reviews.length;
    const average_rating =
      review_count > 0 ? reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / review_count : vendor.avg_rating || 0;

    return { vendor, menu_items, availabilities, reviews, average_rating, review_count };
  }

  addVendorToList(vendor_id, list_type, list_name) {
    const vendor = this._getEntityById('vendors', vendor_id);
    if (!vendor) {
      return { success: false, list: null, list_item: null, message: 'Vendor not found.' };
    }

    let list = null;
    if (list_name) {
      const lists = this._getFromStorage('vendor_lists', []);
      list = lists.find((l) => l.list_type === list_type && l.name === list_name) || null;
    }
    if (!list) {
      list = this._getOrCreateVendorListByType(list_type);
    }

    let listItems = this._getFromStorage('vendor_list_items', []);
    const existing = listItems.find((li) => li.list_id === list.id && li.vendor_id === vendor_id);
    if (existing) {
      return { success: true, list, list_item: existing, message: 'Vendor already in list.' };
    }

    const position = listItems.filter((li) => li.list_id === list.id).length + 1;
    const list_item = {
      id: this._generateId('vendor_list_item'),
      list_id: list.id,
      vendor_id,
      added_at: this._nowISO(),
      position
    };
    listItems.push(list_item);
    this._saveToStorage('vendor_list_items', listItems);

    return { success: true, list, list_item, message: 'Vendor added to list.' };
  }

  writeVendorReview(vendor_id, rating, comment, past_visit_id) {
    const vendor = this._getEntityById('vendors', vendor_id);
    if (!vendor) {
      return { success: false, review: null, message: 'Vendor not found.' };
    }

    const review = {
      id: this._generateId('review'),
      vendor_id,
      past_visit_id: past_visit_id || null,
      rating: rating || 0,
      comment: comment || '',
      created_at: this._nowISO(),
      updated_at: null,
      source: past_visit_id ? 'past_visit' : 'direct',
      is_visible: true
    };

    const reviews = this._getFromStorage('reviews', []);
    reviews.push(review);
    this._saveToStorage('reviews', reviews);

    // Update vendor aggregate rating
    const vendorReviews = reviews.filter((r) => r.vendor_id === vendor_id && r.is_visible);
    if (vendorReviews.length) {
      const avg = vendorReviews.reduce((sum, r) => sum + (r.rating || 0), 0) / vendorReviews.length;
      let vendors = this._getFromStorage('vendors', []);
      const idx = vendors.findIndex((v) => v.id === vendor_id);
      if (idx >= 0) {
        vendors[idx].avg_rating = avg;
        vendors[idx].rating_count = vendorReviews.length;
        this._saveToStorage('vendors', vendors);
      }
    }

    return { success: true, review, message: 'Review submitted.' };
  }

  getMyVendorListsOverview() {
    const lists = this._getFromStorage('vendor_lists', []);
    const listItems = this._getFromStorage('vendor_list_items', []);

    return lists.map((list) => {
      const vendor_count = listItems.filter((li) => li.list_id === list.id).length;
      const is_pinned = !!list.is_pinned;
      return { list, vendor_count, is_pinned };
    });
  }

  getVendorListDetail(list_id) {
    const list = this._getEntityById('vendor_lists', list_id);
    if (!list) {
      return { list: null, vendors: [] };
    }

    const listItems = this._getFromStorage('vendor_list_items', []).filter((li) => li.list_id === list.id);
    listItems.sort((a, b) => (a.position || 0) - (b.position || 0));

    const vendorsTbl = this._getFromStorage('vendors', []);

    const vendors = listItems.map((li) => ({
      vendor: vendorsTbl.find((v) => v.id === li.vendor_id) || null,
      list_item: li
    }));

    return { list, vendors };
  }

  removeVendorFromList(list_id, vendor_id) {
    let listItems = this._getFromStorage('vendor_list_items', []);
    const before = listItems.length;
    listItems = listItems.filter((li) => !(li.list_id === list_id && li.vendor_id === vendor_id));
    this._saveToStorage('vendor_list_items', listItems);
    const removed = before !== listItems.length;
    return { success: removed, message: removed ? 'Vendor removed from list.' : 'Vendor not found in list.' };
  }

  reorderVendorList(list_id, ordered_vendor_ids) {
    const list = this._getEntityById('vendor_lists', list_id);
    if (!list) {
      return { success: false, list: null, message: 'List not found.' };
    }

    const listItems = this._getFromStorage('vendor_list_items', []);
    const itemsForList = listItems.filter((li) => li.list_id === list_id);

    const idToItem = {};
    for (const li of itemsForList) {
      idToItem[li.vendor_id] = li;
    }

    let position = 1;
    for (const vid of ordered_vendor_ids || []) {
      const li = idToItem[vid];
      if (li) {
        li.position = position++;
      }
    }

    // Any remaining items keep their relative order but come after
    const remaining = itemsForList.filter((li) => !ordered_vendor_ids.includes(li.vendor_id));
    remaining.sort((a, b) => (a.position || 0) - (b.position || 0));
    for (const li of remaining) {
      li.position = position++;
    }

    // Save back
    const updatedListItems = listItems.map((li) => {
      const updated = itemsForList.find((x) => x.id === li.id);
      return updated || li;
    });
    this._saveToStorage('vendor_list_items', updatedListItems);

    return { success: true, list, message: 'List reordered.' };
  }

  updateVendorListPlan(list_id, planned_day_of_week, planned_start_time, planned_end_time, is_pinned) {
    let lists = this._getFromStorage('vendor_lists', []);
    const idx = lists.findIndex((l) => l.id === list_id);
    if (idx < 0) {
      return { success: false, list: null, message: 'List not found.' };
    }

    const list = lists[idx];
    if (planned_day_of_week) list.planned_day_of_week = planned_day_of_week;
    if (planned_start_time !== undefined) list.planned_start_time = planned_start_time;
    if (planned_end_time !== undefined) list.planned_end_time = planned_end_time;
    if (typeof is_pinned === 'boolean') list.is_pinned = is_pinned;
    list.updated_at = this._nowISO();

    lists[idx] = list;
    this._saveToStorage('vendor_lists', lists);

    return { success: true, list, message: 'List plan updated.' };
  }

  // ---------------------- WORKSHOPS & SCHEDULE ----------------------
  getWorkshopFilterOptions() {
    const topic_options = [
      { value: 'baking', label: 'Baking' },
      { value: 'grilling', label: 'Grilling' },
      { value: 'bbq', label: 'BBQ' },
      { value: 'pastry', label: 'Pastry' },
      { value: 'general_cooking', label: 'General Cooking' },
      { value: 'other', label: 'Other' }
    ];

    const day_options = [
      { value: 'friday', label: 'Friday' },
      { value: 'saturday', label: 'Saturday' },
      { value: 'sunday', label: 'Sunday' }
    ];

    const workshops = this._getFromStorage('workshops', []);
    let default_max_price = 100;
    for (const w of workshops) {
      if (typeof w.price === 'number' && w.price > default_max_price) {
        default_max_price = w.price;
      }
    }

    return { topic_options, day_options, default_max_price };
  }

  searchWorkshops(topic, day_of_week, max_price, start_time_from, start_time_to) {
    let workshops = this._getFromStorage('workshops', []).filter((w) => w.status === 'scheduled');

    if (topic) {
      workshops = workshops.filter((w) => w.topic === topic);
    }

    if (day_of_week) {
      workshops = workshops.filter((w) => w.day_of_week === day_of_week);
    }

    if (typeof max_price === 'number') {
      workshops = workshops.filter((w) => (w.price || 0) <= max_price);
    }

    const fromMin = this._parseLocalTimeToMinutes(start_time_from);
    const toMin = this._parseLocalTimeToMinutes(start_time_to);

    if (fromMin !== null || toMin !== null) {
      workshops = workshops.filter((w) => {
        const m = this._getLocalMinutesFromDate(w.start_datetime);
        if (m === null) return false;
        if (fromMin !== null && m < fromMin) return false;
        if (toMin !== null && m > toMin) return false;
        return true;
      });
    }

    return workshops;
  }

  getWorkshopDetail(workshop_id) {
    const workshop = this._getEntityById('workshops', workshop_id);
    if (!workshop) {
      return { workshop: null, has_schedule_conflict: false, conflicting_items: [] };
    }

    const schedule_items = this._getFromStorage('schedule_items', []);
    const { hasConflict, conflictingItems } = this._detectScheduleConflicts(
      { ...workshop, start_datetime: workshop.start_datetime, end_datetime: workshop.end_datetime },
      schedule_items
    );

    return { workshop, has_schedule_conflict: hasConflict, conflicting_items: conflictingItems };
  }

  addWorkshopToSchedule(workshop_id, plan_type = 'general') {
    const workshop = this._getEntityById('workshops', workshop_id);
    if (!workshop) {
      return { success: false, schedule_item: null, has_schedule_conflict: false, message: 'Workshop not found.' };
    }

    const schedule_items = this._getFromStorage('schedule_items', []);
    const { hasConflict, conflictingItems } = this._detectScheduleConflicts(
      { ...workshop, start_datetime: workshop.start_datetime, end_datetime: workshop.end_datetime },
      schedule_items
    );

    const schedule_item = {
      id: this._generateId('schedule_item'),
      item_type: 'workshop',
      item_ref_id: workshop.id,
      title: workshop.title,
      date: workshop.date,
      start_datetime: workshop.start_datetime,
      end_datetime: workshop.end_datetime,
      location: workshop.location || null,
      plan_type: plan_type || 'general',
      source_page: 'workshops',
      created_at: this._nowISO(),
      day_of_week: workshop.day_of_week || null
    };

    schedule_items.push(schedule_item);
    this._saveToStorage('schedule_items', schedule_items);

    return {
      success: true,
      schedule_item,
      has_schedule_conflict: hasConflict,
      message: hasConflict ? 'Added, but conflicts with existing items.' : 'Workshop added to schedule.'
    };
  }

  getScheduleOverview(day_of_week, plan_type) {
    let items = this._getFromStorage('schedule_items', []);

    if (plan_type) {
      items = items.filter((i) => i.plan_type === plan_type);
    }

    if (day_of_week) {
      items = items.filter((i) => !i.day_of_week || i.day_of_week === day_of_week);
    }

    items.sort((a, b) => {
      const ta = new Date(a.start_datetime).getTime();
      const tb = new Date(b.start_datetime).getTime();
      return ta - tb;
    });

    // Detect conflicts among items
    const conflictMap = {};
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const a = items[i];
        const b = items[j];
        const res = this._detectScheduleConflicts(a, [b]);
        if (res.hasConflict) {
          const key = [a.id, b.id].sort().join('-');
          if (!conflictMap[key]) {
            conflictMap[key] = { conflicting_item_ids: [a.id, b.id] };
          }
        }
      }
    }

    const conflict_groups = Object.values(conflictMap);
    const has_conflicts = conflict_groups.length > 0;

    return { items, has_conflicts, conflict_groups };
  }

  getFamilyPlanForDay(day_of_week) {
    let items = this._getFromStorage('schedule_items', []).filter((i) => i.plan_type === 'family');
    items = items.filter((i) => !i.day_of_week || i.day_of_week === day_of_week);

    const scheduleState = this._getUserScheduleState();
    const is_confirmed = !!(scheduleState.confirmed && scheduleState.confirmed.family && scheduleState.confirmed.family[day_of_week]);

    return { items, is_confirmed };
  }

  removeScheduleItem(schedule_item_id) {
    let items = this._getFromStorage('schedule_items', []);
    const before = items.length;
    items = items.filter((i) => i.id !== schedule_item_id);
    this._saveToStorage('schedule_items', items);
    const removed = before !== items.length;
    return { success: removed, message: removed ? 'Schedule item removed.' : 'Schedule item not found.' };
  }

  confirmSchedule(plan_type, day_of_week) {
    const state = this._getUserScheduleState();
    const pt = plan_type || 'general';
    if (!state.confirmed[pt]) state.confirmed[pt] = {};

    if (day_of_week) {
      state.confirmed[pt][day_of_week] = true;
    } else {
      state.confirmed[pt].friday = true;
      state.confirmed[pt].saturday = true;
      state.confirmed[pt].sunday = true;
    }

    this._saveUserScheduleState(state);

    return { success: true, message: 'Schedule confirmed.' };
  }

  // ---------------------- TOKEN BUNDLES & CART ----------------------
  listTokenBundles() {
    return this._getFromStorage('token_bundles', []).filter((b) => b.is_active);
  }

  getTokenBundleDetail(bundle_id) {
    const token_bundle = this._getEntityById('token_bundles', bundle_id);
    return { token_bundle };
  }

  addTokenBundleToCart(bundle_id, quantity = 1) {
    const bundle = this._getEntityById('token_bundles', bundle_id);
    if (!bundle || !bundle.is_active) {
      return { success: false, cart: null, cart_item: null, message: 'Token bundle not found or inactive.' };
    }

    const cart = this._getOrCreateCart();
    let carts = this._getFromStorage('carts', []);
    let cartItems = this._getFromStorage('cart_items', []);

    let cartItem = cartItems.find((ci) => ci.cart_id === cart.id && ci.item_type === 'token_bundle' && ci.item_ref_id === bundle.id);
    if (cartItem) {
      cartItem.quantity += quantity;
      cartItem.line_total = (cartItem.unit_price || 0) * cartItem.quantity;
      cartItem.created_at = cartItem.created_at || this._nowISO();
    } else {
      cartItem = {
        id: this._generateId('cart_item'),
        cart_id: cart.id,
        item_type: 'token_bundle',
        item_ref_id: bundle.id,
        name: bundle.name,
        unit_price: bundle.price || 0,
        quantity: quantity || 1,
        line_total: (bundle.price || 0) * (quantity || 1),
        created_at: this._nowISO()
      };
      cartItems.push(cartItem);
      if (!Array.isArray(cart.cart_item_ids)) cart.cart_item_ids = [];
      cart.cart_item_ids.push(cartItem.id);
    }

    // Save cart
    const cartIdx = carts.findIndex((c) => c.id === cart.id);
    if (cartIdx >= 0) {
      carts[cartIdx] = { ...cart, updated_at: this._nowISO() };
    } else {
      carts.push(cart);
    }
    this._saveToStorage('carts', carts);
    this._saveToStorage('cart_items', cartItems);

    return { success: true, cart, cart_item: cartItem, message: 'Token bundle added to cart.' };
  }

  getCartContents() {
    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items', []).filter((ci) => ci.cart_id === cart.id);
    const bundles = this._getFromStorage('token_bundles', []);

    let subtotal = 0;
    const items = cartItems.map((ci) => {
      subtotal += ci.line_total || 0;
      return {
        cart_item: ci,
        token_bundle: bundles.find((b) => b.id === ci.item_ref_id) || null
      };
    });

    const fees_total = 0;
    const total = subtotal + fees_total;

    return { cart, items, subtotal, fees_total, total };
  }

  updateCartItemQuantity(cart_item_id, quantity) {
    let cartItems = this._getFromStorage('cart_items', []);
    const idx = cartItems.findIndex((ci) => ci.id === cart_item_id);
    if (idx < 0) {
      return { success: false, cart: null, message: 'Cart item not found.' };
    }

    const cartItem = cartItems[idx];
    if (quantity <= 0) {
      // Remove item
      cartItems.splice(idx, 1);
    } else {
      cartItem.quantity = quantity;
      cartItem.line_total = (cartItem.unit_price || 0) * quantity;
      cartItems[idx] = cartItem;
    }
    this._saveToStorage('cart_items', cartItems);

    // Update cart updated_at
    const cart = this._getEntityById('carts', cartItem.cart_id);
    if (cart) {
      cart.updated_at = this._nowISO();
      this._updateEntity('carts', cart);
    }

    return { success: true, cart, message: 'Cart item updated.' };
  }

  removeCartItem(cart_item_id) {
    let cartItems = this._getFromStorage('cart_items', []);
    const item = cartItems.find((ci) => ci.id === cart_item_id) || null;
    cartItems = cartItems.filter((ci) => ci.id !== cart_item_id);
    this._saveToStorage('cart_items', cartItems);

    if (!item) {
      return { success: false, cart: null, message: 'Cart item not found.' };
    }

    const cart = this._getEntityById('carts', item.cart_id);
    if (cart && Array.isArray(cart.cart_item_ids)) {
      cart.cart_item_ids = cart.cart_item_ids.filter((id) => id !== cart_item_id);
      cart.updated_at = this._nowISO();
      this._updateEntity('carts', cart);
    }

    return { success: true, cart, message: 'Cart item removed.' };
  }

  clearCart() {
    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items', []);
    const before = cartItems.length;
    cartItems = cartItems.filter((ci) => ci.cart_id !== cart.id);
    this._saveToStorage('cart_items', cartItems);
    const cart_cleared = before !== cartItems.length;
    return { success: true, cart_cleared };
  }

  // ---------------------- ACTIVITIES & FAMILY PLAN ----------------------
  getActivityFilterOptions() {
    const audience_options = [
      { value: 'family', label: 'Family' },
      { value: 'kid_friendly', label: 'Kid Friendly' },
      { value: 'all_ages', label: 'All Ages' },
      { value: 'adult', label: 'Adult-focused' }
    ];

    const day_options = [
      { value: 'friday', label: 'Friday' },
      { value: 'saturday', label: 'Saturday' },
      { value: 'sunday', label: 'Sunday' }
    ];

    const default_end_time_limit_for_kids = '18:00';

    return { audience_options, day_options, default_end_time_limit_for_kids };
  }

  searchActivities(day_of_week, audience_filter, end_time_before, start_time_from, start_time_to) {
    let activities = this._getFromStorage('activities', []).filter((a) => a.status === 'scheduled');

    if (day_of_week) {
      activities = activities.filter((a) => a.day_of_week === day_of_week);
    }

    if (audience_filter) {
      activities = activities.filter((a) => {
        const family = !!a.is_family_friendly;
        const kid = !!a.is_kid_friendly;
        switch (audience_filter) {
          case 'family':
            return family || kid;
          case 'kid_friendly':
            return kid || family;
          case 'all_ages':
            return family || kid;
          case 'adult':
            return !family && !kid;
          default:
            return true;
        }
      });
    }

    const endBeforeMin = this._parseLocalTimeToMinutes(end_time_before);
    const startFromMin = this._parseLocalTimeToMinutes(start_time_from);
    const startToMin = this._parseLocalTimeToMinutes(start_time_to);

    if (endBeforeMin !== null) {
      activities = activities.filter((a) => {
        const m = this._getLocalMinutesFromDate(a.end_datetime);
        return m !== null && m <= endBeforeMin;
      });
    }

    if (startFromMin !== null || startToMin !== null) {
      activities = activities.filter((a) => {
        const m = this._getLocalMinutesFromDate(a.start_datetime);
        if (m === null) return false;
        if (startFromMin !== null && m < startFromMin) return false;
        if (startToMin !== null && m > startToMin) return false;
        return true;
      });
    }

    return activities;
  }

  getActivityDetail(activity_id) {
    const activity = this._getEntityById('activities', activity_id);
    if (!activity) {
      return {
        activity: null,
        is_family_friendly: false,
        ends_by_18_00: false,
        has_schedule_conflict: false,
        conflicting_items: []
      };
    }

    const is_family_friendly = !!(activity.is_family_friendly || activity.is_kid_friendly);
    const endMin = this._getLocalMinutesFromDate(activity.end_datetime);
    const eighteen = this._parseLocalTimeToMinutes('18:00');
    const ends_by_18_00 = endMin !== null && endMin <= eighteen;

    const schedule_items = this._getFromStorage('schedule_items', []).filter((i) => i.plan_type === 'family');
    const { hasConflict, conflictingItems } = this._detectScheduleConflicts(
      { ...activity, start_datetime: activity.start_datetime, end_datetime: activity.end_datetime },
      schedule_items
    );

    return { activity, is_family_friendly, ends_by_18_00, has_schedule_conflict: hasConflict, conflicting_items: conflictingItems };
  }

  addActivityToSchedule(activity_id, plan_type) {
    const activity = this._getEntityById('activities', activity_id);
    if (!activity) {
      return { success: false, schedule_item: null, has_schedule_conflict: false, message: 'Activity not found.' };
    }

    const schedule_items = this._getFromStorage('schedule_items', []);
    const { hasConflict, conflictingItems } = this._detectScheduleConflicts(
      { ...activity, start_datetime: activity.start_datetime, end_datetime: activity.end_datetime },
      schedule_items
    );

    const schedule_item = {
      id: this._generateId('schedule_item'),
      item_type: 'activity',
      item_ref_id: activity.id,
      title: activity.title,
      date: activity.date,
      start_datetime: activity.start_datetime,
      end_datetime: activity.end_datetime,
      location: activity.location || null,
      plan_type: plan_type || 'family',
      source_page: 'schedule',
      created_at: this._nowISO(),
      day_of_week: activity.day_of_week || null
    };

    schedule_items.push(schedule_item);
    this._saveToStorage('schedule_items', schedule_items);

    return {
      success: true,
      schedule_item,
      has_schedule_conflict: hasConflict,
      message: hasConflict ? 'Added, but conflicts with existing items.' : 'Activity added to schedule.'
    };
  }

  // ---------------------- PAST VISITS & REVIEWS ----------------------
  getPastVisits() {
    const past_visits = this._getFromStorage('past_visits', []);
    const vendors = this._getFromStorage('vendors', []);
    return past_visits.map((pv) => ({
      past_visit: pv,
      vendor: vendors.find((v) => v.id === pv.vendor_id) || null
    }));
  }

  getMyOrders() {
    const orders = this._getFromStorage('orders', []);
    const carts = this._getFromStorage('carts', []);
    const deliveryMethods = this._getFromStorage('ticket_delivery_methods', []);
    const pickupOptions = this._getFromStorage('token_pickup_options', []);
    const promos = this._getFromStorage('promo_codes', []);

    return orders.map((o) => {
      const enriched = { ...o };
      if (o.cart_id) {
        enriched.cart = carts.find((c) => c.id === o.cart_id) || null;
      }
      if (o.delivery_method_id) {
        enriched.delivery_method = deliveryMethods.find((d) => d.id === o.delivery_method_id) || null;
      }
      if (o.pickup_option_id) {
        enriched.pickup_option = pickupOptions.find((p) => p.id === o.pickup_option_id) || null;
      }
      if (o.promo_code_id) {
        enriched.promo_code_detail = promos.find((p) => p.id === o.promo_code_id) || null;
      }
      return enriched;
    });
  }

  getMyReviews() {
    const reviews = this._getFromStorage('reviews', []);
    const vendors = this._getFromStorage('vendors', []);
    return reviews.map((r) => ({
      review: r,
      vendor: vendors.find((v) => v.id === r.vendor_id) || null
    }));
  }

  updateReview(review_id, rating, comment) {
    let reviews = this._getFromStorage('reviews', []);
    const idx = reviews.findIndex((r) => r.id === review_id);
    if (idx < 0) {
      return { success: false, review: null, message: 'Review not found.' };
    }

    const review = reviews[idx];
    if (typeof rating === 'number') review.rating = rating;
    if (typeof comment === 'string') review.comment = comment;
    review.updated_at = this._nowISO();
    reviews[idx] = review;
    this._saveToStorage('reviews', reviews);

    // Update vendor rating aggregate
    const vendor_id = review.vendor_id;
    const vendorReviews = reviews.filter((r) => r.vendor_id === vendor_id && r.is_visible);
    if (vendorReviews.length) {
      const avg = vendorReviews.reduce((sum, r) => sum + (r.rating || 0), 0) / vendorReviews.length;
      let vendors = this._getFromStorage('vendors', []);
      const vIdx = vendors.findIndex((v) => v.id === vendor_id);
      if (vIdx >= 0) {
        vendors[vIdx].avg_rating = avg;
        vendors[vIdx].rating_count = vendorReviews.length;
        this._saveToStorage('vendors', vendors);
      }
    }

    return { success: true, review, message: 'Review updated.' };
  }

  deleteReview(review_id) {
    const reviews = this._getFromStorage('reviews', []);
    const exists = reviews.some((r) => r.id === review_id);
    if (!exists) {
      return { success: false, message: 'Review not found.' };
    }
    const remaining = reviews.filter((r) => r.id !== review_id);
    this._saveToStorage('reviews', remaining);
    return { success: true, message: 'Review deleted.' };
  }

  // ---------------------- FESTIVAL INFO & CONTACT ----------------------
  getFestivalInfo() {
    const stored = this._getFromStorage('festival_info', null);
    if (stored && typeof stored === 'object') {
      // If a proper object has been stored externally, return it as-is.
      return stored;
    }

    // Fallback empty structure (keeps shape without mocking real content)
    return {
      festival_name: '',
      description: '',
      location: '',
      dates: [],
      hours_by_day: [],
      policies: [],
      contact_email: '',
      faq_items: []
    };
  }

  submitContactInquiry(name, email, subject, message) {
    const inquiries = this._getFromStorage('contact_inquiries', []);
    const inquiry = {
      id: this._generateId('contact_inquiry'),
      name,
      email,
      subject,
      message,
      created_at: this._nowISO()
    };
    inquiries.push(inquiry);
    this._saveToStorage('contact_inquiries', inquiries);
    return { success: true, message: 'Inquiry submitted.' };
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