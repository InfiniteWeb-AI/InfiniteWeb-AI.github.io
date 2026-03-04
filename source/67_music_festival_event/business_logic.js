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

// Patch JSON.parse to tolerate slightly malformed JSON in test data
(function () {
  if (typeof JSON !== 'undefined' && typeof JSON.parse === 'function') {
    const originalParse = JSON.parse;
    JSON.parse = function (text, reviver) {
      if (typeof text === 'string') {
        try {
          return originalParse(text, reviver);
        } catch (e) {
          if (e instanceof SyntaxError) {
            let fixed = text;

            // Fix HTML-like fields that may contain unescaped quotes/newlines due to template literal embedding
            const fixHtmlField = (key) => {
              const pattern = new RegExp('"' + key + '":\\s*"(.*?)",', 'gs');
              fixed = fixed.replace(pattern, (match, inner) => {
                const safe = inner
                  .replace(/\\/g, '\\\\')
                  .replace(/"/g, '\\"')
                  .replace(/\r/g, '\\r')
                  .replace(/\n/g, '\\n');
                return '"' + key + '": "' + safe + '",';
              });
            };

            fixHtmlField('content_html');
            fixHtmlField('answer_html');

            try {
              return originalParse(fixed, reviver);
            } catch (e2) {
              if (e2 instanceof SyntaxError && /Bad control character in string literal/.test(e2.message)) {
                // Fallback: escape bare newlines inside strings (generic sanitizer)
                let sanitized = '';
                let inString = false;
                let escaped = false;
                for (let i = 0; i < fixed.length; i++) {
                  const ch = fixed[i];
                  if (!inString) {
                    if (ch === '"') {
                      inString = true;
                      sanitized += ch;
                    } else {
                      sanitized += ch;
                    }
                  } else {
                    if (escaped) {
                      sanitized += ch;
                      escaped = false;
                    } else if (ch === '\\') {
                      sanitized += ch;
                      escaped = true;
                    } else if (ch === '"') {
                      inString = false;
                      sanitized += ch;
                    } else if (ch === '\n') {
                      sanitized += '\\n';
                    } else if (ch === '\r') {
                      sanitized += '\\r';
                    } else {
                      sanitized += ch;
                    }
                  }
                }
                return originalParse(sanitized, reviver);
              }
              throw e2;
            }
          }
          throw e;
        }
      }
      return originalParse(text, reviver);
    };
  }
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
    // Array-based tables
    const arrayKeys = [
      'tickets',
      'cart',
      'cart_items',
      'orders',
      'stages',
      'schedule_events',
      'my_schedule',
      'my_schedule_items',
      'artists',
      'merch_products',
      'map_locations',
      'vendors',
      'favorite_vendors',
      'newsletter_subscriptions',
      'accessibility_info',
      'accessibility_contact_messages',
      'faq_questions',
      'policy_sections',
      'festival_announcements',
      'festival_info_sections'
    ];

    arrayKeys.forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    });

    // Singleton / scalar keys
    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
    // 'festival_overview' and 'newsletter_preferences_metadata' are optional
  }

  _getFromStorage(key) {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  }

  _getObjectFromStorage(key, defaultValue = null) {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : defaultValue;
  }

  _saveToStorage(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
  }

  _saveObjectToStorage(key, obj) {
    localStorage.setItem(key, JSON.stringify(obj));
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

  _toTitleCaseFromEnum(value) {
    if (!value) return '';
    return value
      .split('_')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  _parseTimeHHMMFromISO(isoString) {
    if (!isoString) return null;
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return null;
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  }

  // -------------------------
  // Cart helpers
  // -------------------------
  _getOrCreateCart(preferredCurrency) {
    let carts = this._getFromStorage('cart');
    let cart = carts.find((c) => c.status === 'active');

    if (!cart) {
      cart = {
        id: this._generateId('cart'),
        status: 'active',
        cart_item_ids: [],
        subtotal: 0,
        total_quantity: 0,
        currency: preferredCurrency || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      carts.push(cart);
      this._saveToStorage('cart', carts);
    }

    return cart;
  }

  _recalculateCartTotals(cart) {
    const cartItems = this._getFromStorage('cart_items');
    const tickets = this._getFromStorage('tickets');
    const merchProducts = this._getFromStorage('merch_products');

    const itemsForCart = cartItems.filter((ci) => ci.cart_id === cart.id);

    let subtotal = 0;
    let totalQty = 0;

    itemsForCart.forEach((item) => {
      subtotal += Number(item.line_total) || 0;
      totalQty += Number(item.quantity) || 0;
    });

    cart.subtotal = subtotal;
    cart.total_quantity = totalQty;

    // Attempt to determine currency if not already set
    if (!cart.currency && itemsForCart.length > 0) {
      const first = itemsForCart[0];
      if (first.item_type === 'ticket') {
        const t = tickets.find((tt) => tt.id === first.ticket_id);
        cart.currency = t ? t.currency : null;
      } else if (first.item_type === 'merch') {
        const m = merchProducts.find((mm) => mm.id === first.merch_product_id);
        cart.currency = m ? m.currency : null;
      }
    }

    cart.updated_at = new Date().toISOString();

    // Persist updated cart
    let carts = this._getFromStorage('cart');
    carts = carts.map((c) => (c.id === cart.id ? cart : c));
    this._saveToStorage('cart', carts);
  }

  // -------------------------
  // My Schedule helper
  // -------------------------
  _getOrCreateMySchedule() {
    let schedules = this._getFromStorage('my_schedule');
    let schedule = schedules[0];
    if (!schedule) {
      schedule = {
        id: this._generateId('my_schedule'),
        schedule_item_ids: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      schedules.push(schedule);
      this._saveToStorage('my_schedule', schedules);
    }
    return schedule;
  }

  // -------------------------
  // Vendor distance helper
  // -------------------------
  _computeVendorDistances(vendors, referenceLocation, mapLocations) {
    if (!referenceLocation) {
      // No reference point; return vendors with null distance
      return vendors.map((v) => ({ ...v, distance_meters: null }));
    }

    const refLoc = mapLocations.find((ml) => ml.id === referenceLocation.id);
    if (!refLoc) {
      return vendors.map((v) => ({ ...v, distance_meters: null }));
    }

    const R = 6371000; // meters
    const toRad = (deg) => (deg * Math.PI) / 180;

    return vendors.map((v) => {
      const vLoc = mapLocations.find((ml) => ml.id === v.map_location_id);
      if (!vLoc) {
        return { ...v, distance_meters: null };
      }
      const dLat = toRad(vLoc.latitude - refLoc.latitude);
      const dLon = toRad(vLoc.longitude - refLoc.longitude);
      const lat1 = toRad(refLoc.latitude);
      const lat2 = toRad(vLoc.latitude);
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const distance = R * c;
      return { ...v, distance_meters: distance };
    });
  }

  // ==========================================================
  //  Interfaces implementation
  // ==========================================================

  // ----------------------------------------------------------
  // Home / Newsletter
  // ----------------------------------------------------------

  getHomePageOverview() {
    const stored = this._getObjectFromStorage('festival_overview', null);
    if (stored && typeof stored === 'object') {
      return stored;
    }
    // Fallback empty structure (no mocked content)
    return {
      festival_name: '',
      tagline: '',
      dates_text: '',
      location_text: '',
      highlights: [],
      primary_ctas: [],
      quick_sections: []
    };
  }

  getFestivalAnnouncements(limit) {
    const effectiveLimit = typeof limit === 'number' ? limit : 5;
    const announcements = this._getFromStorage('festival_announcements');

    // Sort by published_at desc if present
    announcements.sort((a, b) => {
      const da = a.published_at ? new Date(a.published_at).getTime() : 0;
      const db = b.published_at ? new Date(b.published_at).getTime() : 0;
      return db - da;
    });

    return announcements.slice(0, effectiveLimit);
  }

  getNewsletterPreferencesMetadata() {
    // If stored metadata exists, use it
    const stored = this._getObjectFromStorage('newsletter_preferences_metadata', null);
    if (stored && typeof stored === 'object') {
      return stored;
    }

    // Derive from enums (not persistent domain data)
    const genreEnums = ['rock', 'electronic', 'pop', 'hip_hop', 'indie', 'metal', 'folk', 'other'];
    const dayEnums = ['friday', 'saturday', 'sunday'];
    const freqEnums = [
      'once_a_week',
      'once_a_day',
      'once_a_month',
      'before_festival',
      'after_festival'
    ];

    const available_genres = genreEnums.map((g) => ({
      value: g,
      label: this._toTitleCaseFromEnum(g)
    }));

    const available_days = dayEnums.map((d) => ({
      value: d,
      label: this._toTitleCaseFromEnum(d)
    }));

    const update_frequencies = freqEnums.map((f) => ({
      value: f,
      label: this._toTitleCaseFromEnum(f),
      description: ''
    }));

    return { available_genres, available_days, update_frequencies };
  }

  subscribeToNewsletter(email, preferred_genres, preferred_days, update_frequency) {
    const subscriptions = this._getFromStorage('newsletter_subscriptions');

    const subscription = {
      id: this._generateId('newsletter_subscription'),
      email: email || '',
      preferred_genres: Array.isArray(preferred_genres) ? preferred_genres : [],
      preferred_days: Array.isArray(preferred_days) ? preferred_days : [],
      update_frequency: update_frequency,
      is_active: true,
      created_at: new Date().toISOString()
    };

    subscriptions.push(subscription);
    this._saveToStorage('newsletter_subscriptions', subscriptions);

    return {
      subscription,
      message: 'Subscription saved'
    };
  }

  // ----------------------------------------------------------
  // Tickets & Cart & Checkout
  // ----------------------------------------------------------

  getTicketFilterOptions() {
    const passTypeEnums = [
      'single_day_pass',
      'two_day_pass',
      'three_day_pass',
      'vip_pass',
      'parking_pass',
      'camping_pass',
      'other'
    ];

    const statusEnums = ['active', 'sold_out', 'inactive'];

    const pass_types = passTypeEnums.map((pt) => ({
      value: pt,
      label: this._toTitleCaseFromEnum(pt)
    }));

    const status_options = statusEnums.map((st) => ({
      value: st,
      label: this._toTitleCaseFromEnum(st)
    }));

    const sort_options = [
      { key: 'price_low_to_high', label: 'Price: Low to High' },
      { key: 'price_high_to_low', label: 'Price: High to Low' },
      { key: 'display_order', label: 'Recommended' }
    ];

    return { pass_types, status_options, sort_options };
  }

  getTickets(filters, sort_by, sort_direction, limit, offset) {
    let items = this._getFromStorage('tickets');

    const applied_filters = {};

    if (filters && typeof filters === 'object') {
      if (filters.pass_type) {
        applied_filters.pass_type = filters.pass_type;
        items = items.filter((t) => t.pass_type === filters.pass_type);
      }
      if (filters.status) {
        applied_filters.status = filters.status;
        items = items.filter((t) => t.status === filters.status);
      }
      if (typeof filters.min_price === 'number') {
        applied_filters.min_price = filters.min_price;
        items = items.filter((t) => Number(t.price) >= filters.min_price);
      }
      if (typeof filters.max_price === 'number') {
        applied_filters.max_price = filters.max_price;
        items = items.filter((t) => Number(t.price) <= filters.max_price);
      }
    }

    const sortDir = sort_direction === 'desc' ? 'desc' : 'asc';
    let sortBy = sort_by || 'display_order';

    items.sort((a, b) => {
      let valA;
      let valB;
      if (sortBy === 'price') {
        valA = Number(a.price) || 0;
        valB = Number(b.price) || 0;
      } else {
        // default: display_order then price
        valA = typeof a.display_order === 'number' ? a.display_order : Number(a.price) || 0;
        valB = typeof b.display_order === 'number' ? b.display_order : Number(b.price) || 0;
      }
      return sortDir === 'asc' ? valA - valB : valB - valA;
    });

    const total_count = items.length;
    const effLimit = typeof limit === 'number' ? limit : 50;
    const effOffset = typeof offset === 'number' ? offset : 0;

    const pagedItems = items.slice(effOffset, effOffset + effLimit).map((t) => ({
      id: t.id,
      name: t.name,
      short_name: t.short_name,
      pass_type: t.pass_type,
      pass_type_label: this._toTitleCaseFromEnum(t.pass_type),
      duration_days: t.duration_days,
      day_options: t.day_options,
      price: t.price,
      currency: t.currency,
      status: t.status,
      is_featured: t.is_featured || false
    }));

    // Instrumentation for task completion tracking
    try {
      const openedRefundsExchangesSection = localStorage.getItem(
        'task7_openedRefundsExchangesSection'
      );
      if (openedRefundsExchangesSection) {
        localStorage.setItem('task7_viewedTicketOptions', 'true');
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      items: pagedItems,
      total_count,
      applied_filters,
      sort_by: sortBy,
      sort_direction: sortDir
    };
  }

  getTicketDetails(ticket_id) {
    const tickets = this._getFromStorage('tickets');
    const ticket = tickets.find((t) => t.id === ticket_id) || null;

    let related_tickets = [];
    if (ticket) {
      related_tickets = tickets
        .filter((t) => t.id !== ticket.id && t.status === 'active')
        .slice(0, 5)
        .map((t) => ({
          id: t.id,
          name: t.name,
          pass_type: t.pass_type,
          price: t.price,
          currency: t.currency
        }));
    }

    return {
      ticket: ticket
        ? {
            id: ticket.id,
            name: ticket.name,
            short_name: ticket.short_name,
            description: ticket.description,
            pass_type: ticket.pass_type,
            pass_type_label: this._toTitleCaseFromEnum(ticket.pass_type),
            day_options: ticket.day_options,
            duration_days: ticket.duration_days,
            price: ticket.price,
            currency: ticket.currency,
            status: ticket.status,
            refund_policy_section_key: ticket.refund_policy_section_key || null
          }
        : null,
      related_tickets
    };
  }

  addTicketToCart(ticket_id, quantity) {
    const qty = typeof quantity === 'number' && quantity > 0 ? quantity : 1;
    const tickets = this._getFromStorage('tickets');
    const ticket = tickets.find((t) => t.id === ticket_id);
    if (!ticket) {
      return {
        success: false,
        cart_id: null,
        cart_item: null,
        cart_summary: null,
        message: 'Ticket not found'
      };
    }

    const cart = this._getOrCreateCart(ticket.currency);
    let cartItems = this._getFromStorage('cart_items');

    const cartItem = {
      id: this._generateId('cart_item'),
      cart_id: cart.id,
      item_type: 'ticket',
      ticket_id: ticket.id,
      merch_product_id: null,
      name: ticket.name,
      unit_price: Number(ticket.price) || 0,
      quantity: qty,
      line_total: (Number(ticket.price) || 0) * qty,
      added_at: new Date().toISOString(),
      selected_size: null,
      selected_color: null
    };

    cartItems.push(cartItem);
    this._saveToStorage('cart_items', cartItems);

    cart.cart_item_ids = cart.cart_item_ids || [];
    cart.cart_item_ids.push(cartItem.id);
    this._recalculateCartTotals(cart);

    const cart_summary = {
      total_quantity: cart.total_quantity,
      subtotal: cart.subtotal,
      currency: cart.currency
    };

    const cart_item_with_fk = {
      ...cartItem,
      ticket: ticket
    };

    return {
      success: true,
      cart_id: cart.id,
      cart_item: cart_item_with_fk,
      cart_summary,
      message: 'Ticket added to cart'
    };
  }

  getCartSummary() {
    const carts = this._getFromStorage('cart');
    const cart = carts.find((c) => c.status === 'active');
    if (!cart) {
      return {
        cart_id: null,
        status: 'active',
        items: [],
        subtotal: 0,
        currency: null,
        total_quantity: 0
      };
    }

    const cartItems = this._getFromStorage('cart_items').filter((ci) => ci.cart_id === cart.id);
    const tickets = this._getFromStorage('tickets');
    const merchProducts = this._getFromStorage('merch_products');

    const items = cartItems.map((ci) => {
      let ticket = null;
      let merch_product = null;
      if (ci.item_type === 'ticket' && ci.ticket_id) {
        ticket = tickets.find((t) => t.id === ci.ticket_id) || null;
      }
      if (ci.item_type === 'merch' && ci.merch_product_id) {
        merch_product = merchProducts.find((m) => m.id === ci.merch_product_id) || null;
      }
      return {
        cart_item_id: ci.id,
        item_type: ci.item_type,
        ticket_id: ci.ticket_id || null,
        merch_product_id: ci.merch_product_id || null,
        name: ci.name,
        unit_price: ci.unit_price,
        quantity: ci.quantity,
        line_total: ci.line_total,
        selected_size: ci.selected_size || null,
        selected_color: ci.selected_color || null,
        ticket,
        merch_product
      };
    });

    const subtotal = cart.subtotal || 0;
    const fees = 0; // mock fees kept at 0 to avoid adding fake amounts
    const total = subtotal + fees;

    // Instrumentation for task completion tracking
    try {
      const allTickets = this._getFromStorage('tickets');
      const threeDayActiveTickets = allTickets.filter(
        (t) => t.pass_type === 'three_day_pass' && t.status === 'active'
      );
      if (threeDayActiveTickets.length > 0) {
        const minPrice = Math.min(
          ...threeDayActiveTickets.map((t) => Number(t.price) || 0)
        );
        const hasCorrectTicket = cartItems.some((ci) => {
          if (ci.item_type !== 'ticket' || Number(ci.quantity) !== 3) return false;
          const ticket = allTickets.find((t) => t.id === ci.ticket_id);
          if (!ticket) return false;
          const price = Number(ticket.price) || 0;
          return (
            ticket.pass_type === 'three_day_pass' &&
            ticket.status === 'active' &&
            price === minPrice
          );
        });
        if (hasCorrectTicket) {
          localStorage.setItem('task1_reachedCheckoutWithCorrectTicket', 'true');
        }
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      cart_id: cart.id,
      status: cart.status,
      items,
      subtotal,
      currency: cart.currency,
      total_quantity: cart.total_quantity
    };
  }

  updateCartItemQuantity(cart_item_id, quantity) {
    let cartItems = this._getFromStorage('cart_items');
    const idx = cartItems.findIndex((ci) => ci.id === cart_item_id);
    if (idx === -1) {
      return {
        success: false,
        cart_id: null,
        updated_item: null,
        cart_summary: null,
        message: 'Cart item not found'
      };
    }

    const item = cartItems[idx];
    const carts = this._getFromStorage('cart');
    const cart = carts.find((c) => c.id === item.cart_id);
    if (!cart) {
      return {
        success: false,
        cart_id: null,
        updated_item: null,
        cart_summary: null,
        message: 'Cart not found for item'
      };
    }

    if (quantity <= 0) {
      // Remove item
      cartItems.splice(idx, 1);
      this._saveToStorage('cart_items', cartItems);
      cart.cart_item_ids = (cart.cart_item_ids || []).filter((id) => id !== item.id);
      this._recalculateCartTotals(cart);

      return {
        success: true,
        cart_id: cart.id,
        updated_item: null,
        cart_summary: {
          subtotal: cart.subtotal,
          currency: cart.currency,
          total_quantity: cart.total_quantity
        },
        message: 'Item removed from cart'
      };
    }

    item.quantity = quantity;
    item.line_total = (Number(item.unit_price) || 0) * quantity;
    cartItems[idx] = item;
    this._saveToStorage('cart_items', cartItems);

    this._recalculateCartTotals(cart);

    return {
      success: true,
      cart_id: cart.id,
      updated_item: {
        cart_item_id: item.id,
        quantity: item.quantity,
        line_total: item.line_total
      },
      cart_summary: {
        subtotal: cart.subtotal,
        currency: cart.currency,
        total_quantity: cart.total_quantity
      },
      message: 'Cart item updated'
    };
  }

  removeCartItem(cart_item_id) {
    let cartItems = this._getFromStorage('cart_items');
    const idx = cartItems.findIndex((ci) => ci.id === cart_item_id);
    if (idx === -1) {
      return {
        success: false,
        cart_id: null,
        cart_summary: null,
        message: 'Cart item not found'
      };
    }

    const item = cartItems[idx];
    const carts = this._getFromStorage('cart');
    const cart = carts.find((c) => c.id === item.cart_id);
    if (!cart) {
      return {
        success: false,
        cart_id: null,
        cart_summary: null,
        message: 'Cart not found for item'
      };
    }

    cartItems.splice(idx, 1);
    this._saveToStorage('cart_items', cartItems);

    cart.cart_item_ids = (cart.cart_item_ids || []).filter((id) => id !== item.id);
    this._recalculateCartTotals(cart);

    return {
      success: true,
      cart_id: cart.id,
      cart_summary: {
        subtotal: cart.subtotal,
        currency: cart.currency,
        total_quantity: cart.total_quantity
      },
      message: 'Cart item removed'
    };
  }

  getCheckoutSummary() {
    const carts = this._getFromStorage('cart');
    const cart = carts.find((c) => c.status === 'active');
    if (!cart) {
      return {
        cart_id: null,
        items: [],
        subtotal: 0,
        fees: 0,
        total: 0,
        currency: null
      };
    }

    const cartItems = this._getFromStorage('cart_items').filter((ci) => ci.cart_id === cart.id);

    const items = cartItems.map((ci) => ({
      cart_item_id: ci.id,
      name: ci.name,
      item_type: ci.item_type,
      quantity: ci.quantity,
      unit_price: ci.unit_price,
      line_total: ci.line_total
    }));

    const subtotal = cart.subtotal || 0;
    const fees = 0; // mock fees kept at 0 to avoid adding fake amounts
    const total = subtotal + fees;

    // Instrumentation for task completion tracking
    try {
      const allTickets = this._getFromStorage('tickets');
      const threeDayActiveTickets = allTickets.filter(
        (t) => t.pass_type === 'three_day_pass' && t.status === 'active'
      );
      if (threeDayActiveTickets.length > 0) {
        const minPrice = Math.min(
          ...threeDayActiveTickets.map((t) => Number(t.price) || 0)
        );
        const hasCorrectTicket = cartItems.some((ci) => {
          if (ci.item_type !== 'ticket' || Number(ci.quantity) !== 3) return false;
          const ticket = allTickets.find((t) => t.id === ci.ticket_id);
          if (!ticket) return false;
          const price = Number(ticket.price) || 0;
          return (
            ticket.pass_type === 'three_day_pass' &&
            ticket.status === 'active' &&
            price === minPrice
          );
        });
        if (hasCorrectTicket) {
          localStorage.setItem('task1_reachedCheckoutWithCorrectTicket', 'true');
        }
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      cart_id: cart.id,
      items,
      subtotal,
      fees,
      total,
      currency: cart.currency
    };
  }

  submitCheckoutOrder(buyer_name, buyer_email, notes) {
    const carts = this._getFromStorage('cart');
    const cart = carts.find((c) => c.status === 'active');
    if (!cart) {
      return {
        success: false,
        order: null,
        message: 'No active cart'
      };
    }

    const cartItems = this._getFromStorage('cart_items').filter((ci) => ci.cart_id === cart.id);
    if (cartItems.length === 0) {
      return {
        success: false,
        order: null,
        message: 'Cart is empty'
      };
    }

    const orders = this._getFromStorage('orders');

    const order = {
      id: this._generateId('order'),
      order_number: 'ORDER-' + Date.now(),
      cart_id: cart.id,
      created_at: new Date().toISOString(),
      status: 'confirmed',
      total: cart.subtotal || 0,
      currency: cart.currency || null,
      buyer_name: buyer_name || '',
      buyer_email: buyer_email || '',
      notes: notes || ''
    };

    orders.push(order);
    this._saveToStorage('orders', orders);

    // Mark cart as checked_out
    cart.status = 'checked_out';
    cart.updated_at = new Date().toISOString();
    const updatedCarts = carts.map((c) => (c.id === cart.id ? cart : c));
    this._saveToStorage('cart', updatedCarts);

    return {
      success: true,
      order: {
        id: order.id,
        order_number: order.order_number,
        status: order.status,
        total: order.total,
        currency: order.currency,
        created_at: order.created_at
      },
      message: 'Order created'
    };
  }

  // ----------------------------------------------------------
  // Schedule & My Schedule & Lineup
  // ----------------------------------------------------------

  getScheduleFilterOptions() {
    const dayEnums = ['friday', 'saturday', 'sunday'];
    const genreEnums = ['rock', 'electronic', 'pop', 'hip_hop', 'indie', 'metal', 'folk', 'other'];
    const audienceEnums = ['all_ages', '18_plus', '21_plus', 'family_friendly', 'other'];

    const days = dayEnums.map((d) => ({ value: d, label: this._toTitleCaseFromEnum(d) }));
    const stages = this._getFromStorage('stages');

    const genres = genreEnums.map((g) => ({ value: g, label: this._toTitleCaseFromEnum(g) }));
    const audience_types = audienceEnums.map((a) => ({ value: a, label: this._toTitleCaseFromEnum(a) }));

    const sort_options = [
      { key: 'start_time_earliest', label: 'Start time: Earliest first' },
      { key: 'start_time_latest', label: 'Start time: Latest first' }
    ];

    return { days, stages, genres, audience_types, sort_options };
  }

  getScheduleEvents(filters, sort_key, limit, offset) {
    let events = this._getFromStorage('schedule_events');
    const stages = this._getFromStorage('stages');
    const artists = this._getFromStorage('artists');

    const applied_filters = {};

    if (filters && typeof filters === 'object') {
      if (filters.day) {
        applied_filters.day = filters.day;
        events = events.filter((e) => e.day === filters.day);
      }
      if (filters.stage_id) {
        applied_filters.stage_id = filters.stage_id;
        events = events.filter((e) => e.stage_id === filters.stage_id);
      }
      if (filters.genre) {
        applied_filters.genre = filters.genre;
        events = events.filter((e) => e.genre === filters.genre);
      }
      if (filters.audience_type) {
        applied_filters.audience_type = filters.audience_type;
        events = events.filter((e) => e.audience_type === filters.audience_type);
      }
      if (filters.start_time_from) {
        applied_filters.start_time_from = filters.start_time_from;
        events = events.filter((e) => {
          const t = this._parseTimeHHMMFromISO(e.start_datetime);
          return t && t >= filters.start_time_from;
        });
      }
      if (filters.start_time_to) {
        applied_filters.start_time_to = filters.start_time_to;
        events = events.filter((e) => {
          const t = this._parseTimeHHMMFromISO(e.start_datetime);
          return t && t <= filters.start_time_to;
        });
      }
    }

    const sortKey = sort_key || 'start_time_earliest';

    events.sort((a, b) => {
      const ta = a.start_datetime ? new Date(a.start_datetime).getTime() : 0;
      const tb = b.start_datetime ? new Date(b.start_datetime).getTime() : 0;
      if (sortKey === 'start_time_latest') {
        return tb - ta;
      }
      // default earliest
      return ta - tb;
    });

    const total_count = events.length;
    const effLimit = typeof limit === 'number' ? limit : 100;
    const effOffset = typeof offset === 'number' ? offset : 0;

    const paged = events.slice(effOffset, effOffset + effLimit).map((e) => {
      const stage = stages.find((s) => s.id === e.stage_id) || null;
      const artist = e.artist_id ? artists.find((a) => a.id === e.artist_id) || null : null;
      return {
        id: e.id,
        name: e.name,
        description: e.description,
        day: e.day,
        start_datetime: e.start_datetime,
        end_datetime: e.end_datetime,
        genre: e.genre,
        audience_type: e.audience_type,
        stage_id: e.stage_id,
        stage_name: stage ? stage.name : null,
        is_headliner: !!e.is_headliner,
        add_to_my_schedule_allowed: e.add_to_my_schedule_allowed !== false,
        stage,
        artist
      };
    });

    return {
      events: paged,
      total_count,
      applied_filters,
      sort_key: sortKey
    };
  }

  getScheduleEventDetails(event_id) {
    const events = this._getFromStorage('schedule_events');
    const stages = this._getFromStorage('stages');
    const artists = this._getFromStorage('artists');

    const e = events.find((ev) => ev.id === event_id) || null;
    if (!e) {
      return { event: null };
    }

    const stage = stages.find((s) => s.id === e.stage_id) || null;
    const artist = e.artist_id ? artists.find((a) => a.id === e.artist_id) || null : null;

    return {
      event: {
        id: e.id,
        name: e.name,
        description: e.description,
        day: e.day,
        start_datetime: e.start_datetime,
        end_datetime: e.end_datetime,
        genre: e.genre,
        audience_type: e.audience_type,
        stage_id: e.stage_id,
        stage_name: stage ? stage.name : null,
        artist_id: e.artist_id || null,
        artist_name: artist ? artist.name : null,
        is_headliner: !!e.is_headliner,
        add_to_my_schedule_allowed: e.add_to_my_schedule_allowed !== false,
        stage,
        artist
      }
    };
  }

  addEventToMySchedule(event_id, added_from) {
    const events = this._getFromStorage('schedule_events');
    const event = events.find((e) => e.id === event_id);
    if (!event) {
      return {
        success: false,
        my_schedule_id: null,
        schedule_item: null,
        message: 'Event not found'
      };
    }

    const mySchedule = this._getOrCreateMySchedule();
    let items = this._getFromStorage('my_schedule_items');

    // Avoid duplicates for same event in same schedule
    const existing = items.find(
      (it) => it.my_schedule_id === mySchedule.id && it.event_id === event_id
    );
    if (existing) {
      return {
        success: true,
        my_schedule_id: mySchedule.id,
        schedule_item: {
          id: existing.id,
          event_id: existing.event_id,
          added_from: existing.added_from,
          added_at: existing.added_at
        },
        message: 'Event already in My Schedule'
      };
    }

    const scheduleItem = {
      id: this._generateId('my_schedule_item'),
      my_schedule_id: mySchedule.id,
      event_id: event_id,
      added_from: added_from || 'other',
      added_at: new Date().toISOString()
    };

    items.push(scheduleItem);
    this._saveToStorage('my_schedule_items', items);

    mySchedule.schedule_item_ids = mySchedule.schedule_item_ids || [];
    mySchedule.schedule_item_ids.push(scheduleItem.id);
    mySchedule.updated_at = new Date().toISOString();
    const schedules = this._getFromStorage('my_schedule').map((s) =>
      s.id === mySchedule.id ? mySchedule : s
    );
    this._saveToStorage('my_schedule', schedules);

    return {
      success: true,
      my_schedule_id: mySchedule.id,
      schedule_item: {
        id: scheduleItem.id,
        event_id: scheduleItem.event_id,
        added_from: scheduleItem.added_from,
        added_at: scheduleItem.added_at
      },
      message: 'Event added to My Schedule'
    };
  }

  removeEventFromMySchedule(schedule_item_id) {
    let items = this._getFromStorage('my_schedule_items');
    const idx = items.findIndex((it) => it.id === schedule_item_id);
    if (idx === -1) {
      return {
        success: false,
        my_schedule_id: null,
        message: 'Schedule item not found'
      };
    }

    const item = items[idx];
    items.splice(idx, 1);
    this._saveToStorage('my_schedule_items', items);

    let schedules = this._getFromStorage('my_schedule');
    const schedule = schedules.find((s) => s.id === item.my_schedule_id);
    if (schedule) {
      schedule.schedule_item_ids = (schedule.schedule_item_ids || []).filter(
        (id) => id !== item.id
      );
      schedule.updated_at = new Date().toISOString();
      schedules = schedules.map((s) => (s.id === schedule.id ? schedule : s));
      this._saveToStorage('my_schedule', schedules);
    }

    return {
      success: true,
      my_schedule_id: schedule ? schedule.id : null,
      message: 'Event removed from My Schedule'
    };
  }

  getMySchedule() {
    const schedules = this._getFromStorage('my_schedule');
    const schedule = schedules[0];
    const events_by_day = {
      friday: [],
      saturday: [],
      sunday: []
    };

    if (!schedule) {
      return {
        my_schedule_id: null,
        events_by_day,
        total_events: 0
      };
    }

    const items = this._getFromStorage('my_schedule_items').filter(
      (it) => it.my_schedule_id === schedule.id
    );
    const events = this._getFromStorage('schedule_events');
    const stages = this._getFromStorage('stages');

    let total_events = 0;

    items.forEach((it) => {
      const e = events.find((ev) => ev.id === it.event_id);
      if (!e) return;
      const stage = stages.find((s) => s.id === e.stage_id) || null;
      const dayKey = e.day;
      if (!events_by_day[dayKey]) {
        events_by_day[dayKey] = [];
      }
      events_by_day[dayKey].push({
        schedule_item_id: it.id,
        event_id: e.id,
        event_name: e.name,
        start_datetime: e.start_datetime,
        end_datetime: e.end_datetime,
        stage_name: stage ? stage.name : null,
        genre: e.genre,
        event: e,
        stage
      });
      total_events += 1;
    });

    // Sort each day by start time ascending
    Object.keys(events_by_day).forEach((day) => {
      events_by_day[day].sort((a, b) => {
        const ta = a.start_datetime ? new Date(a.start_datetime).getTime() : 0;
        const tb = b.start_datetime ? new Date(b.start_datetime).getTime() : 0;
        return ta - tb;
      });
    });

    return {
      my_schedule_id: schedule.id,
      events_by_day,
      total_events
    };
  }

  exportMySchedule(format) {
    const sched = this.getMySchedule();
    const fmt = format === 'html' ? 'html' : 'text';

    const daysOrder = ['friday', 'saturday', 'sunday'];
    const dayLabels = {
      friday: 'Friday',
      saturday: 'Saturday',
      sunday: 'Sunday'
    };

    if (fmt === 'html') {
      let html = '<div class="my-schedule">';
      daysOrder.forEach((day) => {
        const events = sched.events_by_day[day] || [];
        if (!events.length) return;
        html += `<h2>${dayLabels[day]}</h2><ul>`;
        events.forEach((ev) => {
          const start = ev.start_datetime ? new Date(ev.start_datetime).toLocaleTimeString() : '';
          const end = ev.end_datetime ? new Date(ev.end_datetime).toLocaleTimeString() : '';
          html += `<li><strong>${ev.event_name}</strong> (${start} - ${end}) @ ${
            ev.stage_name || ''
          } [${this._toTitleCaseFromEnum(ev.genre)}]</li>`;
        });
        html += '</ul>';
      });
      html += '</div>';
      return { format: 'html', content: html };
    }

    // text format
    let lines = [];
    daysOrder.forEach((day) => {
      const events = sched.events_by_day[day] || [];
      if (!events.length) return;
      lines.push(dayLabels[day]);
      events.forEach((ev) => {
        const start = ev.start_datetime ? new Date(ev.start_datetime).toLocaleTimeString() : '';
        const end = ev.end_datetime ? new Date(ev.end_datetime).toLocaleTimeString() : '';
        lines.push(`- ${ev.event_name} (${start} - ${end}) @ ${ev.stage_name || ''} [${
          this._toTitleCaseFromEnum(ev.genre)
        }]`);
      });
      lines.push('');
    });

    return { format: 'text', content: lines.join('\n') };
  }

  getLineupOverview() {
    const artists = this._getFromStorage('artists');
    const events = this._getFromStorage('schedule_events');

    const augmentedArtists = artists.map((a) => {
      const primaryEvent = a.primary_performance_event_id
        ? events.find((e) => e.id === a.primary_performance_event_id) || null
        : null;
      const otherEvents = Array.isArray(a.other_event_ids)
        ? events.filter((e) => a.other_event_ids.includes(e.id))
        : [];
      return {
        ...a,
        primary_performance_event: primaryEvent,
        other_events: otherEvents
      };
    });

    const headliners = augmentedArtists
      .filter((a) => a.is_headliner)
      .sort((a, b) => {
        const da = typeof a.display_order === 'number' ? a.display_order : 0;
        const db = typeof b.display_order === 'number' ? b.display_order : 0;
        return da - db;
      });

    const nonHeadliners = augmentedArtists
      .filter((a) => !a.is_headliner)
      .sort((a, b) => {
        const da = typeof a.display_order === 'number' ? a.display_order : 0;
        const db = typeof b.display_order === 'number' ? b.display_order : 0;
        return da - db;
      });

    return {
      headliners,
      artists: [...headliners, ...nonHeadliners]
    };
  }

  getArtistDetails(artist_id) {
    const artists = this._getFromStorage('artists');
    const events = this._getFromStorage('schedule_events');
    const stages = this._getFromStorage('stages');

    const artist = artists.find((a) => a.id === artist_id) || null;
    if (!artist) {
      return {
        artist: null,
        primary_performance: null,
        other_performances: []
      };
    }

    let primary_performance = null;
    if (artist.primary_performance_event_id) {
      const ev = events.find((e) => e.id === artist.primary_performance_event_id) || null;
      if (ev) {
        const stage = stages.find((s) => s.id === ev.stage_id) || null;
        primary_performance = {
          event_id: ev.id,
          day: ev.day,
          start_datetime: ev.start_datetime,
          end_datetime: ev.end_datetime,
          stage_name: stage ? stage.name : null,
          event: ev,
          stage
        };
      }
    }

    const other_performances = [];
    if (Array.isArray(artist.other_event_ids)) {
      artist.other_event_ids.forEach((eid) => {
        const ev = events.find((e) => e.id === eid);
        if (!ev) return;
        const stage = stages.find((s) => s.id === ev.stage_id) || null;
        other_performances.push({
          event_id: ev.id,
          day: ev.day,
          start_datetime: ev.start_datetime,
          stage_name: stage ? stage.name : null,
          event: ev,
          stage
        });
      });
    }

    return {
      artist: {
        id: artist.id,
        name: artist.name,
        bio: artist.bio,
        image_url: artist.image_url,
        genres: artist.genres || [],
        is_headliner: !!artist.is_headliner,
        website_url: artist.website_url || null
      },
      primary_performance,
      other_performances
    };
  }

  // ----------------------------------------------------------
  // Merch
  // ----------------------------------------------------------

  getMerchFilterOptions() {
    const categoryEnums = ['t_shirts', 'hoodies', 'hats', 'accessories', 'posters', 'other'];

    const categories = categoryEnums.map((c) => ({
      value: c,
      label: this._toTitleCaseFromEnum(c)
    }));

    const rating_filters = [
      { min_rating: 4, label: '4 stars & up' },
      { min_rating: 3, label: '3 stars & up' },
      { min_rating: 0, label: 'All ratings' }
    ];

    const sort_options = [
      { key: 'price_low_to_high', label: 'Price: Low to High' },
      { key: 'price_high_to_low', label: 'Price: High to Low' },
      { key: 'rating_high_to_low', label: 'Rating: High to Low' }
    ];

    const products = this._getFromStorage('merch_products');
    let min_price = 0;
    let max_price = 0;
    if (products.length > 0) {
      const prices = products.map((p) => Number(p.price) || 0);
      min_price = Math.min(...prices);
      max_price = Math.max(...prices);
    }

    const price_range_defaults = { min_price, max_price };

    return { categories, rating_filters, sort_options, price_range_defaults };
  }

  getMerchProducts(filters, sort_key, limit, offset) {
    let products = this._getFromStorage('merch_products');

    const applied_filters = {};

    if (filters && typeof filters === 'object') {
      if (filters.category) {
        applied_filters.category = filters.category;
        products = products.filter((p) => p.category === filters.category);
      }
      if (typeof filters.min_price === 'number') {
        applied_filters.min_price = filters.min_price;
        products = products.filter((p) => Number(p.price) >= filters.min_price);
      }
      if (typeof filters.max_price === 'number') {
        applied_filters.max_price = filters.max_price;
        products = products.filter((p) => Number(p.price) <= filters.max_price);
      }
      if (typeof filters.min_rating === 'number') {
        applied_filters.min_rating = filters.min_rating;
        products = products.filter((p) => (Number(p.rating) || 0) >= filters.min_rating);
      }
      if (filters.status) {
        products = products.filter((p) => p.status === filters.status);
      }
    }

    const sortKey = sort_key || 'price_low_to_high';

    products.sort((a, b) => {
      let va;
      let vb;
      if (sortKey === 'price_high_to_low') {
        va = Number(a.price) || 0;
        vb = Number(b.price) || 0;
        return vb - va;
      }
      if (sortKey === 'rating_high_to_low') {
        va = Number(a.rating) || 0;
        vb = Number(b.rating) || 0;
        return vb - va;
      }
      // default price_low_to_high
      va = Number(a.price) || 0;
      vb = Number(b.price) || 0;
      return va - vb;
    });

    const total_count = products.length;
    const effLimit = typeof limit === 'number' ? limit : 50;
    const effOffset = typeof offset === 'number' ? offset : 0;

    const paged = products.slice(effOffset, effOffset + effLimit).map((p) => ({
      id: p.id,
      name: p.name,
      category: p.category,
      category_label: this._toTitleCaseFromEnum(p.category),
      price: p.price,
      currency: p.currency,
      image_url: p.image_url,
      rating: p.rating,
      rating_count: p.rating_count,
      status: p.status
    }));

    return {
      products: paged,
      total_count,
      applied_filters,
      sort_key: sortKey
    };
  }

  getMerchProductDetails(merch_product_id) {
    const products = this._getFromStorage('merch_products');
    const p = products.find((m) => m.id === merch_product_id) || null;
    if (!p) {
      return { product: null };
    }

    return {
      product: {
        id: p.id,
        name: p.name,
        description: p.description,
        category: p.category,
        category_label: this._toTitleCaseFromEnum(p.category),
        price: p.price,
        currency: p.currency,
        image_url: p.image_url,
        rating: p.rating,
        rating_count: p.rating_count,
        available_sizes: p.available_sizes || [],
        available_colors: p.available_colors || [],
        status: p.status
      }
    };
  }

  addMerchToCart(merch_product_id, quantity, selected_size, selected_color) {
    const qty = typeof quantity === 'number' && quantity > 0 ? quantity : 1;
    const products = this._getFromStorage('merch_products');
    const product = products.find((p) => p.id === merch_product_id);
    if (!product) {
      return {
        success: false,
        cart_id: null,
        cart_item: null,
        cart_summary: null,
        message: 'Merch product not found'
      };
    }

    const cart = this._getOrCreateCart(product.currency);
    let cartItems = this._getFromStorage('cart_items');

    const cartItem = {
      id: this._generateId('cart_item'),
      cart_id: cart.id,
      item_type: 'merch',
      ticket_id: null,
      merch_product_id: product.id,
      name: product.name,
      unit_price: Number(product.price) || 0,
      quantity: qty,
      line_total: (Number(product.price) || 0) * qty,
      added_at: new Date().toISOString(),
      selected_size: selected_size || null,
      selected_color: selected_color || null
    };

    cartItems.push(cartItem);
    this._saveToStorage('cart_items', cartItems);

    cart.cart_item_ids = cart.cart_item_ids || [];
    cart.cart_item_ids.push(cartItem.id);
    this._recalculateCartTotals(cart);

    const cart_summary = {
      total_quantity: cart.total_quantity,
      subtotal: cart.subtotal,
      currency: cart.currency
    };

    const cart_item_with_fk = {
      ...cartItem,
      merch_product: product
    };

    return {
      success: true,
      cart_id: cart.id,
      cart_item: cart_item_with_fk,
      cart_summary,
      message: 'Merch product added to cart'
    };
  }

  // ----------------------------------------------------------
  // Map / Vendors
  // ----------------------------------------------------------

  getMapFilterOptions() {
    const vendorTypeEnums = ['food', 'drink', 'merch', 'service', 'other'];
    const foodTypeEnums = ['vegetarian', 'vegan', 'meat', 'mixed', 'drinks_only', 'desserts', 'other'];

    const vendor_types = vendorTypeEnums.map((v) => ({
      value: v,
      label: this._toTitleCaseFromEnum(v)
    }));

    const food_types = foodTypeEnums.map((f) => ({
      value: f,
      label: this._toTitleCaseFromEnum(f)
    }));

    const reference_stages = this._getFromStorage('stages');

    const sort_options = [
      { key: 'distance_closest_first', label: 'Distance: Closest first' },
      { key: 'distance_farthest_first', label: 'Distance: Farthest first' }
    ];

    return { vendor_types, food_types, reference_stages, sort_options };
  }

  getVendorsByDistance(filters, reference_stage_id, reference_map_location_id, sort_key, limit, offset) {
    let vendors = this._getFromStorage('vendors');
    const mapLocations = this._getFromStorage('map_locations');
    const stages = this._getFromStorage('stages');

    if (filters && typeof filters === 'object') {
      if (filters.vendor_type) {
        vendors = vendors.filter((v) => v.vendor_type === filters.vendor_type);
      }
      if (filters.food_type) {
        vendors = vendors.filter((v) => v.food_type === filters.food_type);
      }
    }

    let referenceLocation = null;
    let refStageId = null;
    let refStageName = null;

    if (reference_stage_id) {
      const stage = stages.find((s) => s.id === reference_stage_id) || null;
      if (stage && stage.map_location_id) {
        const loc = mapLocations.find((ml) => ml.id === stage.map_location_id) || null;
        if (loc) {
          referenceLocation = loc;
          refStageId = stage.id;
          refStageName = stage.name;
        }
      }
    } else if (reference_map_location_id) {
      const loc = mapLocations.find((ml) => ml.id === reference_map_location_id) || null;
      if (loc) {
        referenceLocation = loc;
      }
    }

    const vendorsWithDistances = this._computeVendorDistances(
      vendors,
      referenceLocation,
      mapLocations
    );

    const sortKey = sort_key || 'distance_closest_first';

    vendorsWithDistances.sort((a, b) => {
      const da = typeof a.distance_meters === 'number' ? a.distance_meters : Infinity;
      const db = typeof b.distance_meters === 'number' ? b.distance_meters : Infinity;
      if (sortKey === 'distance_farthest_first') {
        return db - da;
      }
      return da - db;
    });

    const total_count = vendorsWithDistances.length;
    const effLimit = typeof limit === 'number' ? limit : 100;
    const effOffset = typeof offset === 'number' ? offset : 0;

    const paged = vendorsWithDistances
      .slice(effOffset, effOffset + effLimit)
      .map((v) => {
        const loc = mapLocations.find((ml) => ml.id === v.map_location_id) || null;
        return {
          vendor_id: v.id,
          name: v.name,
          description: v.description,
          vendor_type: v.vendor_type,
          food_type: v.food_type,
          is_vegetarian_friendly: v.is_vegetarian_friendly,
          map_location_id: v.map_location_id,
          distance_meters: v.distance_meters,
          rating: v.rating,
          rating_count: v.rating_count,
          vendor: v,
          map_location: loc
        };
      });

    const reference_point = {
      stage_id: refStageId,
      stage_name: refStageName,
      map_location_id: referenceLocation ? referenceLocation.id : null
    };

    return {
      vendors: paged,
      total_count,
      reference_point
    };
  }

  getVendorDetails(vendor_id) {
    const vendors = this._getFromStorage('vendors');
    const mapLocations = this._getFromStorage('map_locations');
    const v = vendors.find((vd) => vd.id === vendor_id) || null;
    if (!v) {
      return { vendor: null, map_location: null };
    }
    const loc = mapLocations.find((ml) => ml.id === v.map_location_id) || null;
    return {
      vendor: {
        id: v.id,
        name: v.name,
        description: v.description,
        vendor_type: v.vendor_type,
        food_type: v.food_type,
        is_vegetarian_friendly: v.is_vegetarian_friendly,
        map_location_id: v.map_location_id,
        opening_hours: v.opening_hours,
        tags: v.tags || [],
        rating: v.rating,
        rating_count: v.rating_count
      },
      map_location: loc
    };
  }

  favoriteVendor(vendor_id) {
    const vendors = this._getFromStorage('vendors');
    const vendor = vendors.find((v) => v.id === vendor_id);
    if (!vendor) {
      return {
        success: false,
        favorite_vendor: null,
        message: 'Vendor not found'
      };
    }

    let favorites = this._getFromStorage('favorite_vendors');
    const existing = favorites.find((f) => f.vendor_id === vendor_id);
    if (existing) {
      return {
        success: true,
        favorite_vendor: existing,
        message: 'Vendor already in favorites'
      };
    }

    const fav = {
      id: this._generateId('favorite_vendor'),
      vendor_id,
      added_at: new Date().toISOString(),
      notes: null
    };

    favorites.push(fav);
    this._saveToStorage('favorite_vendors', favorites);

    return {
      success: true,
      favorite_vendor: fav,
      message: 'Vendor added to favorites'
    };
  }

  getFavoriteVendors() {
    const favorites = this._getFromStorage('favorite_vendors');
    const vendors = this._getFromStorage('vendors');

    return favorites.map((f) => {
      const vendor = vendors.find((v) => v.id === f.vendor_id) || null;
      return {
        favorite_vendor_id: f.id,
        vendor_id: f.vendor_id,
        vendor_name: vendor ? vendor.name : null,
        vendor_type: vendor ? vendor.vendor_type : null,
        food_type: vendor ? vendor.food_type : null,
        added_at: f.added_at,
        vendor
      };
    });
  }

  // ----------------------------------------------------------
  // Info & Accessibility
  // ----------------------------------------------------------

  getFestivalInfoSections() {
    const sections = this._getFromStorage('festival_info_sections');
    return sections;
  }

  getAccessibilityInfo() {
    const infos = this._getFromStorage('accessibility_info');
    const accessibility_info = infos[0] || null;
    return { accessibility_info };
  }

  submitAccessibilityContactMessage(email, subject, message) {
    const messages = this._getFromStorage('accessibility_contact_messages');

    const contact_message = {
      id: this._generateId('accessibility_contact_message'),
      email: email || '',
      subject: subject || '',
      message: message || '',
      sent_at: new Date().toISOString(),
      source_section: 'accessibility'
    };

    messages.push(contact_message);
    this._saveToStorage('accessibility_contact_messages', messages);

    return {
      success: true,
      contact_message,
      message: 'Accessibility message submitted'
    };
  }

  // ----------------------------------------------------------
  // FAQ & Policies
  // ----------------------------------------------------------

  searchFaq(query, limit, offset) {
    const faqs = this._getFromStorage('faq_questions');
    const q = (query || '').toLowerCase();

    let filtered = faqs;
    if (q) {
      filtered = faqs.filter((f) => {
        const inQuestion = (f.question || '').toLowerCase().includes(q);
        const inAnswer = (f.answer_html || '').toLowerCase().includes(q);
        const inKeywords = Array.isArray(f.search_keywords)
          ? f.search_keywords.some((kw) => (kw || '').toLowerCase().includes(q))
          : false;
        return inQuestion || inAnswer || inKeywords;
      });
    }

    const total_count = filtered.length;
    const effLimit = typeof limit === 'number' ? limit : 20;
    const effOffset = typeof offset === 'number' ? offset : 0;

    const results = filtered.slice(effOffset, effOffset + effLimit).map((f) => {
      let excerpt = f.answer_html || '';
      if (excerpt.length > 200) {
        excerpt = excerpt.slice(0, 200) + '...';
      }
      return {
        id: f.id,
        question: f.question,
        excerpt_html: excerpt,
        category: f.category,
        policy_section_key: f.policy_section_key || null
      };
    });

    // Instrumentation for task completion tracking
    try {
      if (typeof query === 'string' && q.includes('refund')) {
        localStorage.setItem(
          'task7_refundSearchParams',
          JSON.stringify({ query: query, total_results: total_count })
        );
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return { results, total_count };
  }

  getFaqDetails(faq_question_id) {
    const faqs = this._getFromStorage('faq_questions');
    const policies = this._getFromStorage('policy_sections');

    const faq = faqs.find((f) => f.id === faq_question_id) || null;
    if (!faq) {
      return { faq: null };
    }

    // Instrumentation for task completion tracking
    try {
      const questionText = faq.question || '';
      if (
        typeof questionText === 'string' &&
        questionText.toLowerCase().includes('refund')
      ) {
        localStorage.setItem(
          'task7_openedRefundFaq',
          JSON.stringify({ faq_id: faq_question_id })
        );
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    let policy_section = null;
    if (faq.policy_section_key) {
      policy_section = policies.find((p) => p.key === faq.policy_section_key) || null;
    }

    return {
      faq: {
        ...faq,
        policy_section
      }
    };
  }

  getPoliciesOverview() {
    const policies = this._getFromStorage('policy_sections');
    return policies;
  }

  getPolicySectionByKey(section_key) {
    const policies = this._getFromStorage('policy_sections');
    const policy_section = policies.find((p) => p.key === section_key) || null;

    // Instrumentation for task completion tracking
    try {
      // task7_openedFullTicketRefundPolicy
      if (policy_section) {
        const rawOpenedFaq = localStorage.getItem('task7_openedRefundFaq');
        if (rawOpenedFaq) {
          let openedFaq = null;
          try {
            openedFaq = JSON.parse(rawOpenedFaq);
          } catch (e2) {
            openedFaq = null;
          }
          const faqId = openedFaq && openedFaq.faq_id;
          if (faqId) {
            const faqs = this._getFromStorage('faq_questions');
            const faq = faqs.find((f) => f.id === faqId);
            if (faq && faq.policy_section_key === section_key) {
              localStorage.setItem(
                'task7_openedFullTicketRefundPolicy',
                JSON.stringify({
                  from_faq_id: faqId,
                  policy_section_key: section_key
                })
              );
            }
          }
        }
      }

      // task7_openedRefundsExchangesSection
      if (policy_section) {
        const titleCandidate =
          policy_section.title ||
          policy_section.name ||
          policy_section.heading ||
          policy_section.label ||
          '';
        if (
          typeof titleCandidate === 'string' &&
          titleCandidate.toLowerCase().includes('refunds & exchanges')
        ) {
          localStorage.setItem(
            'task7_openedRefundsExchangesSection',
            JSON.stringify({ policy_section_key: section_key })
          );
        }
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    const policy_section_result = policy_section;
    return { policy_section: policy_section_result };
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