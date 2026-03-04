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

  // ------------------------------
  // Storage helpers
  // ------------------------------

  _initStorage() {
    // Initialize all data tables in localStorage if not exist
    const arrayKeys = [
      'coworking_passes',
      'spaces',
      'amenities',
      'membership_plans',
      'events',
      'groups',
      'group_memberships',
      'member_profiles',
      'messages',
      'pass_bundles',
      'addons',
      'promo_codes',
      'carts',
      'cart_items',
      'orders',
      'order_items',
      'event_rsvps',
      'membership_signups',
      'promo_code_usages',
      'static_sections'
    ];

    arrayKeys.forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    });

    if (!localStorage.getItem('user_state')) {
      // Single-user defaults
      localStorage.setItem(
        'user_state',
        JSON.stringify({
          default_contact_name: '',
          default_contact_email: ''
        })
      );
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

  _parseDateOnly(dateStr) {
    // dateStr: 'YYYY-MM-DD'
    if (!dateStr) return null;
    const parts = dateStr.split('-');
    if (parts.length !== 3) return null;
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    return new Date(y, m, d);
  }

  _toDateOnlyString(date) {
    if (!(date instanceof Date)) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return year + '-' + month + '-' + day;
  }

  _formatCurrency(amount, currency) {
    if (typeof amount !== 'number' || isNaN(amount)) return '';
    const curr = currency || 'USD';
    return curr + ' ' + amount.toFixed(2);
  }

  _formatAccessLabel(access_level) {
    switch (access_level) {
      case 'access_24_7':
        return '24/7 access';
      case 'extended_hours':
        return 'Extended hours';
      case 'business_hours':
        return 'Business hours';
      default:
        return '';
    }
  }

  _formatTimeRange(startIso, endIso) {
    if (!startIso || !endIso) return '';
    const start = new Date(startIso);
    const end = new Date(endIso);
    const pad = (n) => String(n).padStart(2, '0');

    const to12h = (d) => {
      let h = d.getHours();
      const m = pad(d.getMinutes());
      const ampm = h >= 12 ? 'PM' : 'AM';
      h = h % 12;
      if (h === 0) h = 12;
      return h + ':' + m + ' ' + ampm;
    };

    return to12h(start) + ' - ' + to12h(end);
  }

  _getCurrentUserState() {
    const raw = localStorage.getItem('user_state');
    if (!raw) {
      const state = { default_contact_name: '', default_contact_email: '' };
      localStorage.setItem('user_state', JSON.stringify(state));
      return state;
    }
    try {
      return JSON.parse(raw);
    } catch (e) {
      const state = { default_contact_name: '', default_contact_email: '' };
      localStorage.setItem('user_state', JSON.stringify(state));
      return state;
    }
  }

  _setCurrentUserContact(name, email) {
    const state = this._getCurrentUserState();
    state.default_contact_name = name || state.default_contact_name;
    state.default_contact_email = email || state.default_contact_email;
    localStorage.setItem('user_state', JSON.stringify(state));
  }

  // ------------------------------
  // Cart helpers
  // ------------------------------

  _getOrCreateCart() {
    let carts = this._getFromStorage('carts');
    let cart = carts[0] || null; // single-user: at most one active cart
    if (!cart) {
      cart = {
        id: this._generateId('cart'),
        item_ids: [],
        subtotal_amount: 0,
        discount_amount: 0,
        total_before_tax: 0,
        promo_code_id: null,
        created_at: this._nowIso(),
        updated_at: this._nowIso()
      };
      carts.push(cart);
      this._saveToStorage('carts', carts);
    }
    return cart;
  }

  _recalculateCartTotals(cart) {
    const carts = this._getFromStorage('carts');
    let cartItems = this._getFromStorage('cart_items');
    const itemsForCart = cartItems.filter((it) => it.cart_id === cart.id);

    let subtotal = 0;
    itemsForCart.forEach((it) => {
      const lineTotal = typeof it.total_price === 'number'
        ? it.total_price
        : (typeof it.unit_price === 'number' ? it.unit_price * (it.quantity || 1) : 0);
      subtotal += lineTotal;
    });

    let discount = 0;
    let promoId = cart.promo_code_id || null;
    if (promoId) {
      const promos = this._getFromStorage('promo_codes');
      const promo = promos.find((p) => p.id === promoId) || null;
      if (promo && this._validatePromoCode(promo, cart, itemsForCart, subtotal)) {
        // compute discount based on applicable_scope
        const scope = promo.applicable_scope;
        let scopeSubtotal = 0;
        if (scope === 'cart_total') {
          scopeSubtotal = subtotal;
        } else {
          const typeMap = {
            pass_bundle: 'pass_bundle',
            addon: 'addon',
            membership_plan: 'membership_plan',
            day_pass: 'day_pass',
            space_booking: 'space_booking',
            event_ticket: 'event_ticket'
          };
          const itemType = typeMap[scope] || null;
          if (itemType) {
            itemsForCart.forEach((it) => {
              if (it.item_type === itemType) {
                const lineTotal = typeof it.total_price === 'number'
                  ? it.total_price
                  : (typeof it.unit_price === 'number' ? it.unit_price * (it.quantity || 1) : 0);
                scopeSubtotal += lineTotal;
              }
            });
          }
        }

        if (scopeSubtotal > 0) {
          if (promo.discount_type === 'percentage_discount') {
            discount = scopeSubtotal * (promo.discount_value / 100);
          } else if (promo.discount_type === 'fixed_amount_discount') {
            discount = promo.discount_value;
          }
          if (discount > scopeSubtotal) discount = scopeSubtotal;
        }
      } else {
        // invalid promo; clear it
        promoId = null;
        cart.promo_code_id = null;
      }
    }

    cart.subtotal_amount = subtotal;
    cart.discount_amount = discount;
    cart.total_before_tax = subtotal - discount < 0 ? 0 : subtotal - discount;
    cart.updated_at = this._nowIso();

    // persist updated cart
    const idx = carts.findIndex((c) => c.id === cart.id);
    if (idx !== -1) {
      carts[idx] = cart;
      this._saveToStorage('carts', carts);
    }

    // ensure cart_items are saved (unchanged here but for consistency)
    this._saveToStorage('cart_items', cartItems);

    return { cart, items: itemsForCart };
  }

  _validatePromoCode(promo, cart, itemsForCart, currentSubtotal) {
    if (!promo || !promo.is_active) return false;

    const now = new Date();

    if (promo.valid_from) {
      const from = new Date(promo.valid_from);
      if (now < from) return false;
    }
    if (promo.valid_to) {
      const to = new Date(promo.valid_to);
      if (now > to) return false;
    }

    if (typeof promo.min_order_subtotal === 'number') {
      const subtotal = typeof currentSubtotal === 'number' ? currentSubtotal : (cart.subtotal_amount || 0);
      if (subtotal < promo.min_order_subtotal) return false;
    }

    if (typeof promo.max_uses === 'number') {
      const usages = this._getFromStorage('promo_code_usages');
      const usedCount = usages.filter((u) => u.promo_code_id === promo.id).length;
      if (usedCount >= promo.max_uses) return false;
    }

    return true;
  }

  _createOrderFromCart(cart, items, payment_method, contact_name, contact_email) {
    const orders = this._getFromStorage('orders');
    const orderItems = this._getFromStorage('order_items');
    const promos = this._getFromStorage('promo_codes');

    const taxRate = 0; // simple: no tax calculation
    const subtotal = cart.subtotal_amount || 0;
    const discount = cart.discount_amount || 0;
    const tax_amount = subtotal * taxRate;
    const total_after_tax = subtotal - discount + tax_amount;

    const orderId = this._generateId('order');
    const orderNumber = 'ORD-' + String(this._getNextIdCounter());

    const order = {
      id: orderId,
      cart_id: cart.id,
      order_number: orderNumber,
      created_at: this._nowIso(),
      subtotal_amount: subtotal,
      discount_amount: discount,
      tax_amount: tax_amount,
      total_after_tax: total_after_tax,
      payment_method: payment_method,
      payment_status: 'pending',
      status: 'confirmed',
      contact_name: contact_name,
      contact_email: contact_email
    };

    const createdOrderItems = [];

    items.forEach((ci) => {
      const oi = {
        id: this._generateId('order_item'),
        order_id: orderId,
        item_type: ci.item_type,
        reference_id: ci.reference_id || null,
        name: ci.name,
        quantity: ci.quantity,
        unit_price: ci.unit_price,
        total_price: ci.total_price,
        visit_date: ci.visit_date || null,
        booking_date: ci.booking_date || null,
        start_datetime: ci.start_datetime || null,
        end_datetime: ci.end_datetime || null,
        duration_hours: ci.duration_hours || null,
        includes_addon_ids: ci.includes_addon_ids || []
      };
      orderItems.push(oi);
      createdOrderItems.push(oi);
    });

    orders.push(order);
    this._saveToStorage('orders', orders);
    this._saveToStorage('order_items', orderItems);

    // Track promo usage
    if (cart.promo_code_id) {
      const promoUsages = this._getFromStorage('promo_code_usages');
      promoUsages.push({
        id: this._generateId('promo_usage'),
        promo_code_id: cart.promo_code_id,
        order_id: order.id,
        created_at: this._nowIso()
      });
      this._saveToStorage('promo_code_usages', promoUsages);
    }

    // Clear cart and items after order creation
    let allCarts = this._getFromStorage('carts');
    let allCartItems = this._getFromStorage('cart_items');
    allCartItems = allCartItems.filter((ci) => ci.cart_id !== cart.id);
    const cartIdx = allCarts.findIndex((c) => c.id === cart.id);
    if (cartIdx !== -1) {
      allCarts[cartIdx].item_ids = [];
      allCarts[cartIdx].subtotal_amount = 0;
      allCarts[cartIdx].discount_amount = 0;
      allCarts[cartIdx].total_before_tax = 0;
      allCarts[cartIdx].promo_code_id = null;
      allCarts[cartIdx].updated_at = this._nowIso();
    }
    this._saveToStorage('carts', allCarts);
    this._saveToStorage('cart_items', allCartItems);

    return { order, order_items: createdOrderItems };
  }

  _resolveCartItemDisplayData(cartItems) {
    const passes = this._getFromStorage('coworking_passes');
    const spaces = this._getFromStorage('spaces');
    const plans = this._getFromStorage('membership_plans');
    const events = this._getFromStorage('events');
    const bundles = this._getFromStorage('pass_bundles');
    const addons = this._getFromStorage('addons');

    const findById = (arr, id) => arr.find((x) => x.id === id) || null;

    const formatDateOnlyFromIso = (iso) => {
      if (!iso) return '';
      const d = new Date(iso);
      return this._toDateOnlyString(d);
    };

    return cartItems.map((ci) => {
      let displayName = ci.name || '';
      const details = {
        date: null,
        time_range: null,
        quantity: ci.quantity,
        addons: []
      };
      let currency = 'USD';

      if (ci.item_type === 'day_pass') {
        const pass = findById(passes, ci.reference_id);
        if (pass) {
          displayName = pass.name;
          currency = pass.currency || currency;
        }
        details.date = formatDateOnlyFromIso(ci.visit_date);
      } else if (ci.item_type === 'space_booking') {
        const space = findById(spaces, ci.reference_id);
        if (space) {
          displayName = space.name;
          currency = space.currency || currency;
        }
        details.date = formatDateOnlyFromIso(ci.booking_date || ci.start_datetime);
        details.time_range = this._formatTimeRange(ci.start_datetime, ci.end_datetime);
      } else if (ci.item_type === 'membership_plan') {
        const plan = findById(plans, ci.reference_id);
        if (plan) {
          displayName = plan.name;
          currency = plan.currency || currency;
        }
      } else if (ci.item_type === 'event_ticket') {
        const event = findById(events, ci.reference_id);
        if (event) {
          displayName = event.title;
          currency = event.currency || currency;
          details.date = formatDateOnlyFromIso(event.start_datetime);
          details.time_range = this._formatTimeRange(event.start_datetime, event.end_datetime);
        }
      } else if (ci.item_type === 'pass_bundle') {
        const bundle = findById(bundles, ci.reference_id);
        if (bundle) {
          displayName = bundle.name;
          currency = bundle.currency || currency;
        }
        details.date = formatDateOnlyFromIso(ci.start_datetime || ci.visit_date);
      } else if (ci.item_type === 'addon') {
        const addon = findById(addons, ci.reference_id);
        if (addon) {
          displayName = addon.name;
          currency = addon.currency || currency;
        }
      }

      if (Array.isArray(ci.includes_addon_ids) && ci.includes_addon_ids.length > 0) {
        details.addons = ci.includes_addon_ids
          .map((id) => {
            const addon = findById(addons, id);
            return addon ? addon.name : null;
          })
          .filter(Boolean);
      }

      const lineTotal = typeof ci.total_price === 'number'
        ? ci.total_price
        : (typeof ci.unit_price === 'number' ? ci.unit_price * (ci.quantity || 1) : 0);

      return {
        cart_item_id: ci.id,
        item_type: ci.item_type,
        display_name: displayName,
        details: details,
        line_total: lineTotal,
        formatted_line_total: this._formatCurrency(lineTotal, currency)
      };
    });
  }

  // ------------------------------
  // Interface implementations
  // ------------------------------

  // getHomeOverview()
  getHomeOverview() {
    const passes = this._getFromStorage('coworking_passes').filter((p) => p.status === 'active');
    const spaces = this._getFromStorage('spaces').filter((s) => s.status === 'active');
    const events = this._getFromStorage('events').filter((e) => e.status === 'scheduled');
    const bundles = this._getFromStorage('pass_bundles').filter((b) => b.status === 'active');
    const promos = this._getFromStorage('promo_codes').filter((p) => p.is_active);

    const featured_day_passes = passes
      .slice()
      .sort((a, b) => a.price - b.price)
      .slice(0, 3)
      .map((p) => ({
        pass: p,
        formatted_price: this._formatCurrency(p.price, p.currency),
        access_label: this._formatAccessLabel(p.access_level),
        is_24_7: !!p.is_24_7
      }));

    const featured_spaces = spaces
      .slice()
      .sort((a, b) => a.base_hourly_rate - b.base_hourly_rate)
      .slice(0, 3)
      .map((s) => ({
        space: s,
        from_hourly_rate: s.base_hourly_rate,
        formatted_from_price: this._formatCurrency(s.base_hourly_rate, s.currency)
      }));

    const featured_events = events
      .slice()
      .sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime))
      .slice(0, 3)
      .map((e) => ({
        event: e,
        display_time: this._formatTimeRange(e.start_datetime, e.end_datetime),
        formatted_price: this._formatCurrency(e.price, e.currency)
      }));

    const featured_pass_bundles = bundles
      .slice()
      .sort((a, b) => a.price - b.price)
      .slice(0, 3)
      .map((b) => ({
        bundle: b,
        formatted_price: this._formatCurrency(b.price, b.currency)
      }));

    const active_promotions = promos.map((p) => ({
      title: p.code,
      summary: p.description || '',
      promo_code: p.code
    }));

    return {
      hero: {
        headline: 'Coworking & Creative Community Space',
        subheadline: 'Flexible desks, meeting rooms, studios, and events for creators and teams.',
        primary_cta_label: 'Book a Day Pass',
        secondary_cta_label: 'Explore Memberships'
      },
      featured_day_passes,
      featured_spaces,
      featured_events,
      featured_pass_bundles,
      active_promotions
    };
  }

  // getStaticSectionContent(section_code)
  getStaticSectionContent(section_code) {
    const sections = this._getFromStorage('static_sections');
    const found = sections.find((s) => s.section_code === section_code) || null;
    if (found) {
      return found;
    }
    // Fallback empty structure using requested code
    return {
      section_code: section_code,
      title: '',
      body_html: '',
      last_updated: ''
    };
  }

  // ------------------------------
  // Coworking Day Passes
  // ------------------------------

  // getCoworkingDayPassFilterOptions()
  getCoworkingDayPassFilterOptions() {
    const passes = this._getFromStorage('coworking_passes').filter((p) => p.status === 'active');
    let min = null;
    let max = null;
    let currency = 'USD';
    passes.forEach((p) => {
      if (typeof p.price === 'number') {
        if (min === null || p.price < min) min = p.price;
        if (max === null || p.price > max) max = p.price;
      }
      if (p.currency) currency = p.currency;
    });

    const today = new Date();
    const earliest_date = this._toDateOnlyString(today);
    const latest = new Date(today.getFullYear(), today.getMonth() + 3, today.getDate());
    const latest_date = this._toDateOnlyString(latest);

    return {
      access_levels: [
        { value: 'business_hours', label: 'Business hours' },
        { value: 'extended_hours', label: 'Extended hours' },
        { value: 'access_24_7', label: '24/7 access' }
      ],
      price_range: {
        min_price: min || 0,
        max_price: max || 0,
        currency: currency
      },
      date_constraints: {
        earliest_date,
        latest_date
      }
    };
  }

  // searchCoworkingDayPasses(visit_date, filters, sort)
  searchCoworkingDayPasses(visit_date, filters, sort) {
    const passes = this._getFromStorage('coworking_passes').filter((p) => p.status === 'active');
    const sortMode = sort || 'price_low_to_high';
    const f = filters || {};

    let results = passes.filter((p) => {
      if (f.access_level && p.access_level !== f.access_level) return false;
      if (f.is_24_7_only && !p.is_24_7 && p.access_level !== 'access_24_7') return false;
      if (typeof f.max_price === 'number' && p.price > f.max_price) return false;
      return true;
    });

    results = results.slice().sort((a, b) => {
      if (sortMode === 'price_high_to_low') return b.price - a.price;
      return a.price - b.price;
    });

    // Instrumentation for task completion tracking (task_1)
    try {
      localStorage.setItem('task1_dayPassSearchParams', JSON.stringify({ visit_date, filters, sort }));
    } catch (e) {}

    return results.map((p) => ({
      pass: p,
      formatted_price: this._formatCurrency(p.price, p.currency),
      access_label: this._formatAccessLabel(p.access_level),
      is_24_7: !!p.is_24_7,
      is_available: p.status === 'active'
    }));
  }

  // getDayPassDetail(coworkingPassId, visit_date, quantity)
  getDayPassDetail(coworkingPassId, visit_date, quantity) {
    const qty = typeof quantity === 'number' && quantity > 0 ? quantity : 1;
    const passes = this._getFromStorage('coworking_passes');
    const pass = passes.find((p) => p.id === coworkingPassId) || null;
    if (!pass) {
      return {
        pass: null,
        visit_date,
        quantity: qty,
        unit_price: 0,
        line_subtotal: 0,
        formatted_price: '',
        access_label: '',
        is_available: false
      };
    }
    const unit = pass.price;
    const line = unit * qty;
    return {
      pass,
      visit_date,
      quantity: qty,
      unit_price: unit,
      line_subtotal: line,
      formatted_price: this._formatCurrency(line, pass.currency),
      access_label: this._formatAccessLabel(pass.access_level),
      is_available: pass.status === 'active'
    };
  }

  // addDayPassToCart(coworkingPassId, visit_date, quantity)
  addDayPassToCart(coworkingPassId, visit_date, quantity) {
    const qty = typeof quantity === 'number' && quantity > 0 ? quantity : 1;
    const passes = this._getFromStorage('coworking_passes');
    const pass = passes.find((p) => p.id === coworkingPassId) || null;
    if (!pass || pass.status !== 'active') {
      return { success: false, cart: null, items: [], created_item: null, message: 'Day pass not found or inactive.' };
    }

    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items');

    const unit = pass.price;
    const total = unit * qty;

    const visitDateIso = this._parseDateOnly(visit_date)
      ? this._parseDateOnly(visit_date).toISOString()
      : null;

    const cartItem = {
      id: this._generateId('cart_item'),
      cart_id: cart.id,
      item_type: 'day_pass',
      reference_id: pass.id,
      name: pass.name,
      description: pass.description || '',
      quantity: qty,
      unit_price: unit,
      total_price: total,
      visit_date: visitDateIso,
      booking_date: null,
      start_datetime: null,
      end_datetime: null,
      duration_hours: null,
      access_level: pass.access_level,
      includes_addon_ids: [],
      created_at: this._nowIso()
    };

    cartItems.push(cartItem);
    this._saveToStorage('cart_items', cartItems);

    // Update cart item_ids
    const carts = this._getFromStorage('carts');
    const idx = carts.findIndex((c) => c.id === cart.id);
    if (idx !== -1) {
      carts[idx].item_ids = carts[idx].item_ids || [];
      carts[idx].item_ids.push(cartItem.id);
      this._saveToStorage('carts', carts);
      Object.assign(cart, carts[idx]);
    }

    const recalced = this._recalculateCartTotals(cart);

    return {
      success: true,
      cart: recalced.cart,
      items: recalced.items,
      created_item: cartItem,
      message: 'Day pass added to cart.'
    };
  }

  // ------------------------------
  // Spaces (meeting rooms, studios, podcast studios)
  // ------------------------------

  // getSpaceFilterOptions()
  getSpaceFilterOptions() {
    const spaces = this._getFromStorage('spaces').filter((s) => s.status === 'active');
    const amenities = this._getFromStorage('amenities');

    let minCap = null;
    let maxCap = null;
    let minPrice = null;
    let maxPrice = null;
    let currency = 'USD';

    spaces.forEach((s) => {
      if (typeof s.capacity === 'number') {
        if (minCap === null || s.capacity < minCap) minCap = s.capacity;
        if (maxCap === null || s.capacity > maxCap) maxCap = s.capacity;
      }
      if (typeof s.base_hourly_rate === 'number') {
        if (minPrice === null || s.base_hourly_rate < minPrice) minPrice = s.base_hourly_rate;
        if (maxPrice === null || s.base_hourly_rate > maxPrice) maxPrice = s.base_hourly_rate;
      }
      if (s.currency) currency = s.currency;
    });

    return {
      space_categories: [
        { value: 'meeting_room', label: 'Meeting Room' },
        { value: 'studio', label: 'Studio' },
        { value: 'podcast_studio', label: 'Podcast Studio' }
      ],
      amenities: amenities,
      capacity_range: {
        min_capacity: minCap || 0,
        max_capacity: maxCap || 0
      },
      price_range: {
        min_price: minPrice || 0,
        max_price: maxPrice || 0,
        currency: currency
      },
      time_of_day_options: [
        { value: 'morning', label: 'Morning', start_time: '09:00', end_time: '12:00' },
        { value: 'afternoon', label: 'Afternoon', start_time: '12:00', end_time: '17:00' },
        { value: 'evening', label: 'Evening', start_time: '17:00', end_time: '21:00' }
      ]
    };
  }

  // searchSpaces(booking_date, space_category, filters, sort)
  searchSpaces(booking_date, space_category, filters, sort) {
    const spaces = this._getFromStorage('spaces').filter((s) => s.status === 'active');
    const f = filters || {};
    const sortMode = sort || 'price_low_to_high';

    let results = spaces.filter((s) => {
      if (space_category && s.space_category !== space_category) return false;
      if (typeof f.min_capacity === 'number' && s.capacity < f.min_capacity) return false;
      if (Array.isArray(f.amenity_ids) && f.amenity_ids.length > 0) {
        const ids = s.amenity_ids || [];
        const allPresent = f.amenity_ids.every((id) => ids.includes(id));
        if (!allPresent) return false;
      }
      if (typeof f.max_total_price === 'number') {
        const duration = typeof f.duration_hours === 'number' && f.duration_hours > 0 ? f.duration_hours : 1;
        const total = s.base_hourly_rate * duration;
        if (total > f.max_total_price) return false;
      }
      return true;
    });

    results = results.slice().sort((a, b) => {
      if (sortMode === 'price_high_to_low') return b.base_hourly_rate - a.base_hourly_rate;
      if (sortMode === 'capacity_high_to_low') return b.capacity - a.capacity;
      return a.base_hourly_rate - b.base_hourly_rate;
    });

    const checkWindow = (s) => {
      const open = s.opening_time || '08:00';
      const close = s.closing_time || '22:00';
      const start = f.start_time || open;
      const end = f.end_time || close;
      if (!start || !end) return true;
      if (start >= end) return false;
      if (start < open || end > close) return false;
      if (typeof f.duration_hours === 'number') {
        const durationMs = f.duration_hours * 60 * 60 * 1000;
        const [sh, sm] = start.split(':').map((x) => parseInt(x, 10));
        const [eh, em] = end.split(':').map((x) => parseInt(x, 10));
        const startDate = new Date(2000, 0, 1, sh, sm, 0);
        const endDate = new Date(2000, 0, 1, eh, em, 0);
        if (endDate - startDate < durationMs) return false;
      }
      return true;
    };

    // Instrumentation for task completion tracking (task_2)
    try {
      if (space_category === 'meeting_room') {
        localStorage.setItem('task2_spaceSearchParams', JSON.stringify({ booking_date, space_category, filters, sort }));
      }
    } catch (e) {}

    return results.map((s) => {
      const duration = typeof f.duration_hours === 'number' && f.duration_hours > 0 ? f.duration_hours : 1;
      const lowest_available_rate = s.base_hourly_rate * duration;
      return {
        space: s,
        lowest_available_rate,
        currency: s.currency || 'USD',
        formatted_from_price: this._formatCurrency(lowest_available_rate, s.currency),
        is_available_for_requested_window: checkWindow(s)
      };
    });
  }

  // getSpaceDetailsAndAvailability(spaceId, booking_date)
  getSpaceDetailsAndAvailability(spaceId, booking_date) {
    const spaces = this._getFromStorage('spaces');
    const amenities = this._getFromStorage('amenities');
    const space = spaces.find((s) => s.id === spaceId) || null;

    if (!space) {
      return {
        space: null,
        amenities: [],
        booking_date,
        opening_time: '',
        closing_time: '',
        time_slots: [],
        min_booking_duration_hours: 1
      };
    }

    const spaceAmenities = (space.amenity_ids || []).map((id) => amenities.find((a) => a.id === id)).filter(Boolean);

    const openStr = space.opening_time || '08:00';
    const closeStr = space.closing_time || '22:00';

    const dateObj = this._parseDateOnly(booking_date) || new Date();
    const [openH, openM] = openStr.split(':').map((x) => parseInt(x, 10));
    const [closeH, closeM] = closeStr.split(':').map((x) => parseInt(x, 10));
    const openDate = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate(), openH, openM, 0);
    const closeDate = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate(), closeH, closeM, 0);

    const time_slots = [];
    let cursor = new Date(openDate.getTime());
    while (cursor < closeDate) {
      const next = new Date(cursor.getTime() + 60 * 60 * 1000);
      if (next > closeDate) break;
      const duration_hours = 1;
      const total_price = space.base_hourly_rate * duration_hours;
      time_slots.push({
        start_datetime: cursor.toISOString(),
        end_datetime: next.toISOString(),
        duration_hours,
        is_available: true,
        total_price,
        formatted_price: this._formatCurrency(total_price, space.currency)
      });
      cursor = next;
    }

    return {
      space,
      amenities: spaceAmenities,
      booking_date,
      opening_time: openStr,
      closing_time: closeStr,
      time_slots,
      min_booking_duration_hours: 1
    };
  }

  // getSpaceAddons(spaceId)
  getSpaceAddons(spaceId) {
    const spaces = this._getFromStorage('spaces');
    const addons = this._getFromStorage('addons').filter((a) => a.status === 'active');
    const space = spaces.find((s) => s.id === spaceId) || null;
    if (!space) {
      return { space: null, addons: [] };
    }

    // Basic heuristic: if studio or podcast_studio, prefer studio_addon; otherwise include non-studio add-ons
    let applicable = addons;
    if (space.space_category === 'studio' || space.space_category === 'podcast_studio') {
      applicable = addons.filter((a) => a.category === 'studio_addon' || a.category === 'other');
    } else if (space.space_category === 'meeting_room') {
      applicable = addons.filter((a) => a.category !== 'studio_addon');
    }

    return {
      space,
      addons: applicable
    };
  }

  // addSpaceBookingToCart(spaceId, booking_date, start_datetime, end_datetime, addon_ids)
  addSpaceBookingToCart(spaceId, booking_date, start_datetime, end_datetime, addon_ids) {
    const spaces = this._getFromStorage('spaces');
    const addons = this._getFromStorage('addons');
    const space = spaces.find((s) => s.id === spaceId) || null;
    if (!space || space.status !== 'active') {
      return { success: false, cart: null, items: [], created_item: null, message: 'Space not found or inactive.' };
    }

    const start = new Date(start_datetime);
    const end = new Date(end_datetime);
    if (!(start instanceof Date) || !(end instanceof Date) || isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) {
      return { success: false, cart: null, items: [], created_item: null, message: 'Invalid time range.' };
    }

    const durationHours = (end - start) / (60 * 60 * 1000);
    const baseCost = space.base_hourly_rate * durationHours;
    let addonsCost = 0;
    const includesAddonIds = Array.isArray(addon_ids) ? addon_ids.slice() : [];

    includesAddonIds.forEach((id) => {
      const addon = addons.find((a) => a.id === id && a.status === 'active');
      if (addon) {
        addonsCost += addon.price;
      }
    });

    const total = baseCost + addonsCost;

    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items');

    const bookingDateIso = this._parseDateOnly(booking_date)
      ? this._parseDateOnly(booking_date).toISOString()
      : start.toISOString();

    const cartItem = {
      id: this._generateId('cart_item'),
      cart_id: cart.id,
      item_type: 'space_booking',
      reference_id: space.id,
      name: space.name,
      description: space.description || '',
      quantity: 1,
      unit_price: total,
      total_price: total,
      visit_date: null,
      booking_date: bookingDateIso,
      start_datetime: start.toISOString(),
      end_datetime: end.toISOString(),
      duration_hours: durationHours,
      access_level: null,
      includes_addon_ids: includesAddonIds,
      created_at: this._nowIso()
    };

    cartItems.push(cartItem);
    this._saveToStorage('cart_items', cartItems);

    const carts = this._getFromStorage('carts');
    const idx = carts.findIndex((c) => c.id === cart.id);
    if (idx !== -1) {
      carts[idx].item_ids = carts[idx].item_ids || [];
      carts[idx].item_ids.push(cartItem.id);
      this._saveToStorage('carts', carts);
      Object.assign(cart, carts[idx]);
    }

    const recalced = this._recalculateCartTotals(cart);

    return {
      success: true,
      cart: recalced.cart,
      items: recalced.items,
      created_item: cartItem,
      message: 'Space booking added to cart.'
    };
  }

  // ------------------------------
  // Membership Plans
  // ------------------------------

  // getMembershipFilterOptions()
  getMembershipFilterOptions() {
    const plans = this._getFromStorage('membership_plans').filter((p) => p.status === 'active');
    let minHours = null;
    let maxHours = null;
    let minPrice = null;
    let maxPrice = null;
    let currency = 'USD';

    plans.forEach((p) => {
      if (typeof p.meeting_room_hours_included === 'number') {
        if (minHours === null || p.meeting_room_hours_included < minHours) minHours = p.meeting_room_hours_included;
        if (maxHours === null || p.meeting_room_hours_included > maxHours) maxHours = p.meeting_room_hours_included;
      }
      if (typeof p.monthly_price === 'number') {
        if (minPrice === null || p.monthly_price < minPrice) minPrice = p.monthly_price;
        if (maxPrice === null || p.monthly_price > maxPrice) maxPrice = p.monthly_price;
      }
      if (p.currency) currency = p.currency;
    });

    return {
      access_options: [
        { value: 'business_hours', label: 'Business hours' },
        { value: 'extended_hours', label: 'Extended hours' },
        { value: 'access_24_7', label: '24/7 access' }
      ],
      meeting_room_hours_range: {
        min_hours: minHours || 0,
        max_hours: maxHours || 0
      },
      price_range: {
        min_price: minPrice || 0,
        max_price: maxPrice || 0,
        currency: currency
      }
    };
  }

  // searchMembershipPlans(filters, sort)
  searchMembershipPlans(filters, sort) {
    const f = filters || {};
    const sortMode = sort || 'monthly_price_low_to_high';
    const plans = this._getFromStorage('membership_plans').filter((p) => p.status === 'active');

    let filtered = plans.filter((p) => {
      if (f.includes_24_7_access) {
        if (!p.includes_24_7_access && p.access_level !== 'access_24_7') return false;
      }
      if (typeof f.min_meeting_room_hours === 'number' && p.meeting_room_hours_included < f.min_meeting_room_hours) return false;
      if (typeof f.max_monthly_price === 'number' && p.monthly_price > f.max_monthly_price) return false;
      return true;
    });

    filtered = filtered.slice().sort((a, b) => {
      if (sortMode === 'monthly_price_high_to_low') return b.monthly_price - a.monthly_price;
      return a.monthly_price - b.monthly_price;
    });

    // Instrumentation for task completion tracking (task_3)
    try {
      localStorage.setItem('task3_membershipSearchParams', JSON.stringify({ filters, sort }));
    } catch (e) {}

    return filtered.map((p) => ({
      plan: p,
      formatted_price: this._formatCurrency(p.monthly_price, p.currency),
      access_label: this._formatAccessLabel(p.access_level),
      meets_filter_criteria: true
    }));
  }

  // getMembershipPlanDetails(membershipPlanId)
  getMembershipPlanDetails(membershipPlanId) {
    const plans = this._getFromStorage('membership_plans');
    const plan = plans.find((p) => p.id === membershipPlanId) || null;
    if (!plan) {
      return {
        plan: null,
        access_label: '',
        formatted_price: '',
        included_benefits: []
      };
    }
    return {
      plan,
      access_label: this._formatAccessLabel(plan.access_level),
      formatted_price: this._formatCurrency(plan.monthly_price, plan.currency),
      included_benefits: Array.isArray(plan.benefits) ? plan.benefits : []
    };
  }

  // startMembershipSignup(membershipPlanId, full_name, email)
  startMembershipSignup(membershipPlanId, full_name, email) {
    const plans = this._getFromStorage('membership_plans');
    const plan = plans.find((p) => p.id === membershipPlanId) || null;
    if (!plan || plan.status !== 'active') {
      return { success: false, signup: null, message: 'Membership plan not found or inactive.' };
    }

    const signups = this._getFromStorage('membership_signups');
    const signup = {
      id: this._generateId('membership_signup'),
      membership_plan_id: plan.id,
      full_name,
      email,
      created_at: this._nowIso(),
      status: 'initiated'
    };
    signups.push(signup);
    this._saveToStorage('membership_signups', signups);

    this._setCurrentUserContact(full_name, email);

    return {
      success: true,
      signup,
      message: 'Membership signup initiated.'
    };
  }

  // ------------------------------
  // Events & RSVPs
  // ------------------------------

  // getEventFilterOptions()
  getEventFilterOptions() {
    const events = this._getFromStorage('events').filter((e) => e.status === 'scheduled');
    let minPrice = null;
    let maxPrice = null;
    let currency = 'USD';
    let earliest = null;
    let latest = null;

    events.forEach((e) => {
      if (typeof e.price === 'number') {
        if (minPrice === null || e.price < minPrice) minPrice = e.price;
        if (maxPrice === null || e.price > maxPrice) maxPrice = e.price;
      }
      if (e.currency) currency = e.currency;
      const d = new Date(e.start_datetime);
      if (!isNaN(d.getTime())) {
        if (!earliest || d < earliest) earliest = d;
        if (!latest || d > latest) latest = d;
      }
    });

    return {
      event_types: [
        { value: 'workshop', label: 'Workshop' },
        { value: 'meetup', label: 'Meetup' },
        { value: 'talk', label: 'Talk' },
        { value: 'class', label: 'Class' },
        { value: 'social', label: 'Social' },
        { value: 'other', label: 'Other' }
      ],
      skill_levels: [
        { value: 'beginner', label: 'Beginner' },
        { value: 'intermediate', label: 'Intermediate' },
        { value: 'advanced', label: 'Advanced' },
        { value: 'all_levels', label: 'All levels' },
        { value: 'not_aplicable', label: 'N/A' }
      ],
      time_of_day_options: [
        { value: 'morning', label: 'Morning' },
        { value: 'afternoon', label: 'Afternoon' },
        { value: 'evening', label: 'Evening' },
        { value: 'full_day', label: 'Full day' },
        { value: 'multi_day', label: 'Multi day' }
      ],
      price_range: {
        min_price: minPrice || 0,
        max_price: maxPrice || 0,
        currency: currency
      },
      date_constraints: {
        earliest_date: earliest ? this._toDateOnlyString(earliest) : '',
        latest_date: latest ? this._toDateOnlyString(latest) : ''
      }
    };
  }

  // searchEvents(date, filters, sort)
  searchEvents(date, filters, sort) {
    const targetDate = this._parseDateOnly(date);
    const f = filters || {};
    const sortMode = sort || 'price_low_to_high';
    const events = this._getFromStorage('events').filter((e) => e.status === 'scheduled');

    let filtered = events.filter((e) => {
      const start = new Date(e.start_datetime);
      if (!targetDate || isNaN(start.getTime())) return false;
      if (this._toDateOnlyString(start) !== this._toDateOnlyString(targetDate)) return false;
      if (f.event_type && e.event_type !== f.event_type) return false;
      if (f.time_of_day && e.time_of_day !== f.time_of_day) return false;
      if (f.skill_level && e.skill_level !== f.skill_level) return false;
      if (typeof f.max_price === 'number' && e.price > f.max_price) return false;
      return true;
    });

    filtered = filtered.slice().sort((a, b) => {
      if (sortMode === 'start_time_asc') {
        return new Date(a.start_datetime) - new Date(b.start_datetime);
      }
      if (sortMode === 'price_high_to_low') return b.price - a.price;
      return a.price - b.price;
    });

    // Instrumentation for task completion tracking (task_4)
    try {
      localStorage.setItem('task4_eventSearchParams', JSON.stringify({ date, filters, sort }));
    } catch (e) {}

    return filtered.map((e) => ({
      event: e,
      display_time: this._formatTimeRange(e.start_datetime, e.end_datetime),
      formatted_price: this._formatCurrency(e.price, e.currency),
      is_sold_out: typeof e.tickets_available === 'number' && e.tickets_available <= 0
    }));
  }

  // getEventDetails(eventId)
  getEventDetails(eventId) {
    const events = this._getFromStorage('events');
    const groups = this._getFromStorage('groups');
    const event = events.find((e) => e.id === eventId) || null;
    if (!event) {
      return {
        event: null,
        group: null,
        formatted_price: '',
        display_time: '',
        remaining_tickets: 0,
        is_sold_out: false
      };
    }
    const group = event.group_id ? (groups.find((g) => g.id === event.group_id) || null) : null;
    const remaining = typeof event.tickets_available === 'number' ? event.tickets_available : null;

    return {
      event,
      group,
      formatted_price: this._formatCurrency(event.price, event.currency),
      display_time: this._formatTimeRange(event.start_datetime, event.end_datetime),
      remaining_tickets: remaining,
      is_sold_out: typeof remaining === 'number' && remaining <= 0
    };
  }

  // addEventTicketToCart(eventId, quantity)
  addEventTicketToCart(eventId, quantity) {
    const qty = typeof quantity === 'number' && quantity > 0 ? quantity : 1;
    const events = this._getFromStorage('events');
    const event = events.find((e) => e.id === eventId) || null;
    if (!event || event.status !== 'scheduled') {
      return { success: false, cart: null, items: [], created_item: null, message: 'Event not found or not scheduled.' };
    }

    const unit = event.price;
    const total = unit * qty;
    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items');

    const cartItem = {
      id: this._generateId('cart_item'),
      cart_id: cart.id,
      item_type: 'event_ticket',
      reference_id: event.id,
      name: event.title,
      description: event.description || '',
      quantity: qty,
      unit_price: unit,
      total_price: total,
      visit_date: null,
      booking_date: null,
      start_datetime: event.start_datetime,
      end_datetime: event.end_datetime || null,
      duration_hours: null,
      access_level: null,
      includes_addon_ids: [],
      created_at: this._nowIso()
    };

    cartItems.push(cartItem);
    this._saveToStorage('cart_items', cartItems);

    const carts = this._getFromStorage('carts');
    const idx = carts.findIndex((c) => c.id === cart.id);
    if (idx !== -1) {
      carts[idx].item_ids = carts[idx].item_ids || [];
      carts[idx].item_ids.push(cartItem.id);
      this._saveToStorage('carts', carts);
      Object.assign(cart, carts[idx]);
    }

    const recalced = this._recalculateCartTotals(cart);

    return {
      success: true,
      cart: recalced.cart,
      items: recalced.items,
      created_item: cartItem,
      message: 'Event ticket added to cart.'
    };
  }

  // setEventRsvpStatus(eventId, status)
  setEventRsvpStatus(eventId, status) {
    const allowed = ['going', 'interested', 'not_going', 'waitlisted', 'cancelled'];
    if (!allowed.includes(status)) {
      return { success: false, rsvp: null, message: 'Invalid RSVP status.' };
    }

    const rsvps = this._getFromStorage('event_rsvps');
    let rsvp = rsvps.find((r) => r.event_id === eventId) || null;
    if (rsvp) {
      rsvp.status = status;
      rsvp.created_at = this._nowIso();
    } else {
      rsvp = {
        id: this._generateId('event_rsvp'),
        event_id: eventId,
        status,
        created_at: this._nowIso()
      };
      rsvps.push(rsvp);
    }
    this._saveToStorage('event_rsvps', rsvps);

    return {
      success: true,
      rsvp,
      message: 'RSVP updated.'
    };
  }

  // ------------------------------
  // Community Groups
  // ------------------------------

  // searchGroups(query)
  searchGroups(query) {
    const groups = this._getFromStorage('groups');
    const memberships = this._getFromStorage('group_memberships');
    const q = (query || '').toLowerCase();

    return groups
      .filter((g) => {
        if (!q) return true;
        const text = (g.name || '') + ' ' + (g.description || '');
        return text.toLowerCase().indexOf(q) !== -1;
      })
      .map((g) => {
        const membership = memberships.find((m) => m.group_id === g.id && (m.membership_status === 'member' || m.membership_status === 'admin'));
        return {
          group: g,
          is_member: !!membership
        };
      });
  }

  // getGroupDetails(groupId)
  getGroupDetails(groupId) {
    const groups = this._getFromStorage('groups');
    const memberships = this._getFromStorage('group_memberships');
    const events = this._getFromStorage('events');

    const group = groups.find((g) => g.id === groupId) || null;
    if (!group) {
      return {
        group: null,
        is_member: false,
        upcoming_events: []
      };
    }

    const membership = memberships.find((m) => m.group_id === group.id && (m.membership_status === 'member' || m.membership_status === 'admin'));
    const now = new Date();
    const upcoming_events = events.filter((e) => e.group_id === group.id && e.status === 'scheduled' && new Date(e.start_datetime) >= now);

    return {
      group,
      is_member: !!membership,
      upcoming_events
    };
  }

  // joinGroup(groupId)
  joinGroup(groupId) {
    const groups = this._getFromStorage('groups');
    const group = groups.find((g) => g.id === groupId) || null;
    if (!group || group.status !== 'active') {
      return { success: false, membership: null, message: 'Group not found or inactive.' };
    }

    const memberships = this._getFromStorage('group_memberships');
    let membership = memberships.find((m) => m.group_id === groupId) || null;
    if (membership) {
      membership.membership_status = 'member';
      membership.joined_at = this._nowIso();
    } else {
      membership = {
        id: this._generateId('group_membership'),
        group_id: groupId,
        membership_status: 'member',
        joined_at: this._nowIso()
      };
      memberships.push(membership);
    }

    this._saveToStorage('group_memberships', memberships);

    return {
      success: true,
      membership,
      message: 'Joined group.'
    };
  }

  // getGroupUpcomingEvents(groupId)
  getGroupUpcomingEvents(groupId) {
    const events = this._getFromStorage('events');
    const now = new Date();
    return events.filter((e) => e.group_id === groupId && e.status === 'scheduled' && new Date(e.start_datetime) >= now);
  }

  // ------------------------------
  // Member Directory & Messaging
  // ------------------------------

  // getCommunityMemberFilterOptions()
  getCommunityMemberFilterOptions() {
    const members = this._getFromStorage('member_profiles').filter((m) => m.status === 'active');
    let minRate = null;
    let maxRate = null;
    let currency = 'USD';
    const rolesSet = new Set();
    const skillsSet = new Set();

    members.forEach((m) => {
      if (typeof m.hourly_rate === 'number') {
        if (minRate === null || m.hourly_rate < minRate) minRate = m.hourly_rate;
        if (maxRate === null || m.hourly_rate > maxRate) maxRate = m.hourly_rate;
      }
      if (m.currency) currency = m.currency;
      if (m.role) rolesSet.add(m.role);
      if (Array.isArray(m.skills)) {
        m.skills.forEach((s) => skillsSet.add(s));
      }
    });

    return {
      rating_options: [
        { value: 0, label: 'All ratings' },
        { value: 3, label: '3 stars & up' },
        { value: 4, label: '4 stars & up' },
        { value: 4.5, label: '4.5 stars & up' }
      ],
      hourly_rate_range: {
        min_rate: minRate || 0,
        max_rate: maxRate || 0,
        currency: currency
      },
      roles: Array.from(rolesSet),
      skills: Array.from(skillsSet)
    };
  }

  // searchMembers(query, filters, sort)
  searchMembers(query, filters, sort) {
    const members = this._getFromStorage('member_profiles').filter((m) => m.status === 'active');
    const f = filters || {};
    const sortMode = sort || 'rating_high_to_low';
    const q = (query || '').toLowerCase();

    let filtered = members.filter((m) => {
      let matchesQuery = true;
      if (q) {
        const text = (m.name || '') + ' ' + (m.role || '') + ' ' + (m.bio || '') + ' ' + (Array.isArray(m.skills) ? m.skills.join(' ') : '');
        matchesQuery = text.toLowerCase().indexOf(q) !== -1;
      }
      if (!matchesQuery) return false;
      if (typeof f.min_rating === 'number' && typeof m.rating === 'number' && m.rating < f.min_rating) return false;
      if (typeof f.max_hourly_rate === 'number' && typeof m.hourly_rate === 'number' && m.hourly_rate > f.max_hourly_rate) return false;
      return true;
    });

    filtered = filtered.slice().sort((a, b) => {
      if (sortMode === 'hourly_rate_low_to_high') {
        const ar = typeof a.hourly_rate === 'number' ? a.hourly_rate : Number.MAX_VALUE;
        const br = typeof b.hourly_rate === 'number' ? b.hourly_rate : Number.MAX_VALUE;
        return ar - br;
      }
      // rating_high_to_low default
      const ar = typeof a.rating === 'number' ? a.rating : 0;
      const br = typeof b.rating === 'number' ? b.rating : 0;
      return br - ar;
    });

    // Instrumentation for task completion tracking (task_7)
    try {
      if (q && q.indexOf('photographer') !== -1) {
        localStorage.setItem('task7_memberSearchParams', JSON.stringify({ query, filters, sort }));
      }
    } catch (e) {}

    return filtered.map((m) => {
      let matchesQuery = true;
      if (q) {
        const text = (m.name || '') + ' ' + (m.role || '') + ' ' + (m.bio || '') + ' ' + (Array.isArray(m.skills) ? m.skills.join(' ') : '');
        matchesQuery = text.toLowerCase().indexOf(q) !== -1;
      }
      return {
        member: m,
        matches_query: matchesQuery
      };
    });
  }

  // getMemberProfile(memberId)
  getMemberProfile(memberId) {
    const members = this._getFromStorage('member_profiles');
    const member = members.find((m) => m.id === memberId) || null;
    return { member };
  }

  // sendMessageToMember(to_member_id, subject, body)
  sendMessageToMember(to_member_id, subject, body) {
    const members = this._getFromStorage('member_profiles');
    const member = members.find((m) => m.id === to_member_id) || null;
    if (!member) {
      return { success: false, message_record: null, message: 'Member not found.' };
    }

    const messages = this._getFromStorage('messages');
    const msg = {
      id: this._generateId('message'),
      to_member_id,
      subject,
      body,
      sent_at: this._nowIso(),
      status: 'sent'
    };
    messages.push(msg);
    this._saveToStorage('messages', messages);

    return {
      success: true,
      message_record: msg,
      message: 'Message sent.'
    };
  }

  // ------------------------------
  // Pass Bundles & Add-ons
  // ------------------------------

  // getPassBundles(filters, sort)
  getPassBundles(filters, sort) {
    const f = filters || {};
    const sortMode = sort || 'price_low_to_high';
    let bundles = this._getFromStorage('pass_bundles').filter((b) => b.status === 'active');

    bundles = bundles.filter((b) => {
      if (typeof f.num_days === 'number' && b.num_days !== f.num_days) return false;
      if (typeof f.max_price === 'number' && b.price > f.max_price) return false;
      return true;
    });

    bundles = bundles.slice().sort((a, b) => {
      if (sortMode === 'price_high_to_low') return b.price - a.price;
      return a.price - b.price;
    });

    return bundles.map((b) => ({
      bundle: b,
      formatted_price: this._formatCurrency(b.price, b.currency)
    }));
  }

  // getPassBundleDetails(passBundleId)
  getPassBundleDetails(passBundleId) {
    const bundles = this._getFromStorage('pass_bundles');
    const bundle = bundles.find((b) => b.id === passBundleId) || null;
    if (!bundle) {
      return { bundle: null, formatted_price: '', usage_rules: '' };
    }

    let rules = '';
    if (bundle.valid_for_coworking) {
      rules += 'Valid for coworking sessions. ';
    }
    rules += 'Access: ' + this._formatAccessLabel(bundle.access_level) + '.';

    return {
      bundle,
      formatted_price: this._formatCurrency(bundle.price, bundle.currency),
      usage_rules: rules.trim()
    };
  }

  // addPassBundleToCart(passBundleId, quantity, start_date)
  addPassBundleToCart(passBundleId, quantity, start_date) {
    const qty = typeof quantity === 'number' && quantity > 0 ? quantity : 1;
    const bundles = this._getFromStorage('pass_bundles');
    const bundle = bundles.find((b) => b.id === passBundleId) || null;
    if (!bundle || bundle.status !== 'active') {
      return { success: false, cart: null, items: [], created_item: null, message: 'Pass bundle not found or inactive.' };
    }

    const unit = bundle.price;
    const total = unit * qty;
    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items');

    const startIso = start_date && this._parseDateOnly(start_date)
      ? this._parseDateOnly(start_date).toISOString()
      : null;

    const cartItem = {
      id: this._generateId('cart_item'),
      cart_id: cart.id,
      item_type: 'pass_bundle',
      reference_id: bundle.id,
      name: bundle.name,
      description: bundle.description || '',
      quantity: qty,
      unit_price: unit,
      total_price: total,
      visit_date: null,
      booking_date: null,
      start_datetime: startIso,
      end_datetime: null,
      duration_hours: null,
      access_level: bundle.access_level || null,
      includes_addon_ids: [],
      created_at: this._nowIso()
    };

    cartItems.push(cartItem);
    this._saveToStorage('cart_items', cartItems);

    const carts = this._getFromStorage('carts');
    const idx = carts.findIndex((c) => c.id === cart.id);
    if (idx !== -1) {
      carts[idx].item_ids = carts[idx].item_ids || [];
      carts[idx].item_ids.push(cartItem.id);
      this._saveToStorage('carts', carts);
      Object.assign(cart, carts[idx]);
    }

    const recalced = this._recalculateCartTotals(cart);

    return {
      success: true,
      cart: recalced.cart,
      items: recalced.items,
      created_item: cartItem,
      message: 'Pass bundle added to cart.'
    };
  }

  // getAddons(filters, sort)
  getAddons(filters, sort) {
    const f = filters || {};
    const sortMode = sort || 'price_low_to_high';
    let addons = this._getFromStorage('addons').filter((a) => a.status === 'active');

    addons = addons.filter((a) => {
      if (f.category && a.category !== f.category) return false;
      if (typeof f.max_price === 'number' && a.price > f.max_price) return false;
      return true;
    });

    addons = addons.slice().sort((a, b) => {
      if (sortMode === 'price_high_to_low') return b.price - a.price;
      return a.price - b.price;
    });

    return addons.map((a) => ({
      addon: a,
      formatted_price: this._formatCurrency(a.price, a.currency)
    }));
  }

  // getAddonDetails(addonId)
  getAddonDetails(addonId) {
    const addons = this._getFromStorage('addons');
    const addon = addons.find((a) => a.id === addonId) || null;
    if (!addon) {
      return { addon: null, formatted_price: '', details: '' };
    }
    return {
      addon,
      formatted_price: this._formatCurrency(addon.price, addon.currency),
      details: addon.description || ''
    };
  }

  // addAddonToCart(addonId, quantity)
  addAddonToCart(addonId, quantity) {
    const qty = typeof quantity === 'number' && quantity > 0 ? quantity : 1;
    const addons = this._getFromStorage('addons');
    const addon = addons.find((a) => a.id === addonId) || null;
    if (!addon || addon.status !== 'active') {
      return { success: false, cart: null, items: [], created_item: null, message: 'Addon not found or inactive.' };
    }

    const unit = addon.price;
    const total = unit * qty;
    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items');

    const cartItem = {
      id: this._generateId('cart_item'),
      cart_id: cart.id,
      item_type: 'addon',
      reference_id: addon.id,
      name: addon.name,
      description: addon.description || '',
      quantity: qty,
      unit_price: unit,
      total_price: total,
      visit_date: null,
      booking_date: null,
      start_datetime: null,
      end_datetime: null,
      duration_hours: null,
      access_level: null,
      includes_addon_ids: [],
      created_at: this._nowIso()
    };

    cartItems.push(cartItem);
    this._saveToStorage('cart_items', cartItems);

    const carts = this._getFromStorage('carts');
    const idx = carts.findIndex((c) => c.id === cart.id);
    if (idx !== -1) {
      carts[idx].item_ids = carts[idx].item_ids || [];
      carts[idx].item_ids.push(cartItem.id);
      this._saveToStorage('carts', carts);
      Object.assign(cart, carts[idx]);
    }

    const recalced = this._recalculateCartTotals(cart);

    return {
      success: true,
      cart: recalced.cart,
      items: recalced.items,
      created_item: cartItem,
      message: 'Addon added to cart.'
    };
  }

  // ------------------------------
  // Cart & Checkout
  // ------------------------------

  // getCartSummary()
  getCartSummary() {
    const cart = this._getOrCreateCart();
    const allItems = this._getFromStorage('cart_items');
    const items = allItems.filter((it) => it.cart_id === cart.id);

    const { cart: updatedCart } = this._recalculateCartTotals(cart);
    const resolved_items = this._resolveCartItemDisplayData(items);

    let applied_promo_code = '';
    if (updatedCart.promo_code_id) {
      const promos = this._getFromStorage('promo_codes');
      const promo = promos.find((p) => p.id === updatedCart.promo_code_id) || null;
      if (promo) applied_promo_code = promo.code;
    }

    return {
      cart: updatedCart,
      items,
      resolved_items,
      subtotal_amount: updatedCart.subtotal_amount,
      discount_amount: updatedCart.discount_amount,
      total_before_tax: updatedCart.total_before_tax,
      applied_promo_code
    };
  }

  // updateCartItemQuantity(cart_item_id, quantity)
  updateCartItemQuantity(cart_item_id, quantity) {
    let qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty < 0) qty = 0;

    let cartItems = this._getFromStorage('cart_items');
    const idxItem = cartItems.findIndex((it) => it.id === cart_item_id);
    if (idxItem === -1) {
      return { success: false, cart: null, items: [], message: 'Cart item not found.' };
    }

    const cartId = cartItems[idxItem].cart_id;
    if (qty === 0) {
      cartItems.splice(idxItem, 1);
    } else {
      cartItems[idxItem].quantity = qty;
      cartItems[idxItem].total_price = cartItems[idxItem].unit_price * qty;
    }

    this._saveToStorage('cart_items', cartItems);

    const carts = this._getFromStorage('carts');
    const cartIdx = carts.findIndex((c) => c.id === cartId);
    const cart = cartIdx !== -1 ? carts[cartIdx] : this._getOrCreateCart();

    const recalced = this._recalculateCartTotals(cart);

    return {
      success: true,
      cart: recalced.cart,
      items: recalced.items,
      message: 'Cart updated.'
    };
  }

  // removeCartItem(cart_item_id)
  removeCartItem(cart_item_id) {
    let cartItems = this._getFromStorage('cart_items');
    const idxItem = cartItems.findIndex((it) => it.id === cart_item_id);
    if (idxItem === -1) {
      return { success: false, cart: null, items: [], message: 'Cart item not found.' };
    }

    const cartId = cartItems[idxItem].cart_id;
    cartItems.splice(idxItem, 1);
    this._saveToStorage('cart_items', cartItems);

    let carts = this._getFromStorage('carts');
    const cartIdx = carts.findIndex((c) => c.id === cartId);
    let cart = cartIdx !== -1 ? carts[cartIdx] : this._getOrCreateCart();

    if (cartIdx !== -1) {
      carts[cartIdx].item_ids = (carts[cartIdx].item_ids || []).filter((id) => id !== cart_item_id);
      this._saveToStorage('carts', carts);
      cart = carts[cartIdx];
    }

    const recalced = this._recalculateCartTotals(cart);

    return {
      success: true,
      cart: recalced.cart,
      items: recalced.items,
      message: 'Cart item removed.'
    };
  }

  // applyPromoCodeToCart(promo_code)
  applyPromoCodeToCart(promo_code) {
    const code = (promo_code || '').trim();
    if (!code) {
      return { success: false, cart: null, items: [], discount_applied: 0, message: 'Promo code is empty.' };
    }

    const promos = this._getFromStorage('promo_codes');
    const promo = promos.find((p) => p.code === code) || null;
    if (!promo) {
      return { success: false, cart: null, items: [], discount_applied: 0, message: 'Promo code not found.' };
    }

    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items').filter((it) => it.cart_id === cart.id);

    if (!this._validatePromoCode(promo, cart, cartItems, cart.subtotal_amount)) {
      return { success: false, cart, items: cartItems, discount_applied: 0, message: 'Promo code is not applicable.' };
    }

    // apply
    const carts = this._getFromStorage('carts');
    const idx = carts.findIndex((c) => c.id === cart.id);
    if (idx !== -1) {
      carts[idx].promo_code_id = promo.id;
      this._saveToStorage('carts', carts);
      Object.assign(cart, carts[idx]);
    } else {
      cart.promo_code_id = promo.id;
    }

    const recalced = this._recalculateCartTotals(cart);

    const discountApplied = recalced.cart.discount_amount || 0;

    return {
      success: true,
      cart: recalced.cart,
      items: recalced.items,
      discount_applied: discountApplied,
      message: 'Promo code applied.'
    };
  }

  // getCheckoutSummary()
  getCheckoutSummary() {
    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items').filter((it) => it.cart_id === cart.id);
    const { cart: updatedCart } = this._recalculateCartTotals(cart);

    const subtotal = updatedCart.subtotal_amount || 0;
    const discount = updatedCart.discount_amount || 0;
    const totalBeforeTax = updatedCart.total_before_tax || 0;
    const estimatedTax = 0;
    const totalAfterTax = totalBeforeTax + estimatedTax;

    const userState = this._getCurrentUserState();

    const payment_methods = [
      { value: 'pay_on_arrival', label: 'Pay on arrival' },
      { value: 'card_online', label: 'Credit/Debit card' },
      { value: 'bank_transfer', label: 'Bank transfer' }
    ];

    return {
      cart: updatedCart,
      items: cartItems,
      subtotal_amount: subtotal,
      discount_amount: discount,
      total_before_tax: totalBeforeTax,
      estimated_tax_amount: estimatedTax,
      total_after_tax: totalAfterTax,
      payment_methods,
      default_contact_name: userState.default_contact_name || '',
      default_contact_email: userState.default_contact_email || ''
    };
  }

  // placeOrder(payment_method, contact_name, contact_email)
  placeOrder(payment_method, contact_name, contact_email) {
    const allowedMethods = ['pay_on_arrival', 'card_online', 'bank_transfer'];
    if (!allowedMethods.includes(payment_method)) {
      return { success: false, order: null, order_items: [], message: 'Invalid payment method.' };
    }

    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items').filter((it) => it.cart_id === cart.id);
    if (cartItems.length === 0) {
      return { success: false, order: null, order_items: [], message: 'Cart is empty.' };
    }

    const { cart: updatedCart } = this._recalculateCartTotals(cart);

    const { order, order_items } = this._createOrderFromCart(updatedCart, cartItems, payment_method, contact_name, contact_email);

    if (contact_name || contact_email) {
      this._setCurrentUserContact(contact_name, contact_email);
    }

    return {
      success: true,
      order,
      order_items,
      message: 'Order placed.'
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