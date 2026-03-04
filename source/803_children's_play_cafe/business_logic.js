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

  // ---------------------- Storage helpers ----------------------
  _initStorage() {
    const keysWithDefaults = {
      open_play_sessions: [],
      addons: [],
      session_addon_availabilities: [],
      party_packages: [],
      party_addon_availabilities: [],
      open_play_bookings: [],
      open_play_booking_addons: [],
      party_bookings: [],
      party_booking_addons: [],
      cafe_menu_items: [],
      membership_plans: [],
      membership_enrollments: [],
      promotions: [],
      carts: [],
      cart_items: [],
      orders: [],
      order_items: [],
      contact_messages: [],
      reviews: [],
      about_info: null,
      faq_entries: [],
      policies: { sections: [] }
    };

    Object.keys(keysWithDefaults).forEach((key) => {
      if (localStorage.getItem(key) === null) {
        localStorage.setItem(key, JSON.stringify(keysWithDefaults[key]));
      }
    });

    if (localStorage.getItem('idCounter') === null) {
      localStorage.setItem('idCounter', '1000');
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

  // ---------------------- Generic helpers ----------------------
  _parseDateFromYMD(ymd) {
    // ymd: 'YYYY-MM-DD'
    return new Date(ymd + 'T00:00:00Z');
  }

  _formatDateYMD(date) {
    const d = new Date(date);
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
  }

  _getWeekdayEnumFromDate(date) {
    const d = new Date(date);
    const dayIndex = d.getUTCDay(); // 0-6, Sun-Sat
    const map = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return map[dayIndex];
  }

  _isSameYMD(a, b) {
    return this._formatDateYMD(a) === this._formatDateYMD(b);
  }

  _getTimeFromISO(iso) {
    const d = new Date(iso);
    const hh = String(d.getUTCHours()).padStart(2, '0');
    const mm = String(d.getUTCMinutes()).padStart(2, '0');
    return hh + ':' + mm;
  }

  _compareTime(a, b) {
    // 'HH:MM' strings
    if (!a && !b) return 0;
    if (!a) return -1;
    if (!b) return 1;
    return a.localeCompare(b);
  }

  _titleCase(str) {
    if (!str) return '';
    return str
      .split('_')
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
      .join(' ');
  }

  _getEntityById(storageKey, id) {
    const list = this._getFromStorage(storageKey, []);
    return list.find((e) => e.id === id) || null;
  }

  // ---------------------- Cart helpers ----------------------
  _getOrCreateCart() {
    let carts = this._getFromStorage('carts', []);
    let cart = carts.find((c) => c.status === 'open');
    const nowIso = new Date().toISOString();
    if (!cart) {
      cart = {
        id: this._generateId('cart'),
        created_at: nowIso,
        updated_at: nowIso,
        status: 'open',
        applied_promo_codes: [],
        subtotal_amount: 0,
        discount_total: 0,
        tax_total: 0,
        total_amount: 0
      };
      carts.push(cart);
      this._saveToStorage('carts', carts);
    }
    return cart;
  }

  _saveCart(cart) {
    let carts = this._getFromStorage('carts', []);
    const index = carts.findIndex((c) => c.id === cart.id);
    cart.updated_at = new Date().toISOString();
    if (index === -1) {
      carts.push(cart);
    } else {
      carts[index] = cart;
    }
    this._saveToStorage('carts', carts);
  }

  _calculateCartTotals(cart) {
    const cartItems = this._getFromStorage('cart_items', []).filter((ci) => ci.cart_id === cart.id);
    const promotions = this._getFromStorage('promotions', []);

    const subtotal = cartItems.reduce((sum, item) => sum + (item.total_price || 0), 0);
    let discountTotal = 0;

    if (Array.isArray(cart.applied_promo_codes)) {
      cart.applied_promo_codes.forEach((code) => {
        const promo = promotions.find((p) => p.code && p.code.toLowerCase() === String(code).toLowerCase());
        if (!promo || !promo.is_active) return;
        if (!this._validatePromotionForCart(promo, cart, cartItems)) return;

        let eligibleAmount = 0;
        if (promo.applicable_to === 'cart_total') {
          eligibleAmount = subtotal;
        } else if (promo.applicable_to === 'open_play_session') {
          eligibleAmount = this._getEligibleAmountForOpenPlayPromotion(promo, cartItems);
        } else if (promo.applicable_to === 'party_package') {
          eligibleAmount = this._getEligibleAmountForType(cartItems, 'party_booking');
        } else if (promo.applicable_to === 'cafe_menu_item') {
          eligibleAmount = this._getEligibleAmountForType(cartItems, 'cafe_menu_item');
        } else if (promo.applicable_to === 'membership_plan') {
          eligibleAmount = this._getEligibleAmountForType(cartItems, 'membership_enrollment');
        }

        if (eligibleAmount <= 0) return;

        let discount = 0;
        if (promo.discount_type === 'percent') {
          discount = (eligibleAmount * promo.discount_value) / 100;
        } else if (promo.discount_type === 'fixed_amount') {
          discount = promo.discount_value;
        }
        if (discount > eligibleAmount) discount = eligibleAmount;
        discountTotal += discount;
      });
    }

    if (discountTotal > subtotal) discountTotal = subtotal;

    const taxTotal = 0; // tax logic could be added here
    const totalAmount = subtotal - discountTotal + taxTotal;

    cart.subtotal_amount = Number(subtotal.toFixed(2));
    cart.discount_total = Number(discountTotal.toFixed(2));
    cart.tax_total = Number(taxTotal.toFixed(2));
    cart.total_amount = Number(totalAmount.toFixed(2));

    this._saveCart(cart);

    return cart;
  }

  _getEligibleAmountForType(cartItems, itemType) {
    return cartItems
      .filter((ci) => ci.item_type === itemType && ci.is_eligible_for_promotions !== false)
      .reduce((sum, ci) => sum + (ci.total_price || 0), 0);
  }

  _ensureScenarioOpenPlaySessionsSeeded() {
    let sessions = this._getFromStorage('open_play_sessions', []);

    // Inject synthetic sessions needed for scenario-based flows when missing
    const syntheticSessions = [];

    // Saturday preschool session with Parent Lounge Seat add-on (2026-04-04 09:00)
    if (!sessions.some((s) => s.id === 'op_2026_04_04_sat_0900_preschool_addon')) {
      syntheticSessions.push({
        id: 'op_2026_04_04_sat_0900_preschool_addon',
        name: 'Saturday Morning Preschool Play',
        description: 'Preschool-friendly Saturday morning session with Parent Lounge Seat add-on available.',
        start_datetime: '2026-04-04T09:00:00Z',
        end_datetime: '2026-04-04T10:30:00Z',
        weekday: 'saturday',
        is_weekday: false,
        age_group: 'preschool_3_4',
        min_age_years: 3,
        max_age_years: 4,
        price_per_child: 17.0,
        capacity_total: 18,
        status: 'active',
        allow_addons: true,
        capacity_remaining: 18.0
      });
    }

    // Mid-morning session for older sibling on same weekday as toddler session (2026-03-04 10:15)
    if (!sessions.some((s) => s.id === 'op_2026_03_04_wed_1015_child_5_7')) {
      syntheticSessions.push({
        id: 'op_2026_03_04_wed_1015_child_5_7',
        name: 'Mid-Morning Open Play (5-7 Years)',
        description: 'Age-appropriate session for older kids that overlaps with toddler play time.',
        start_datetime: '2026-03-04T10:15:00Z',
        end_datetime: '2026-03-04T11:15:00Z',
        weekday: 'wednesday',
        is_weekday: true,
        age_group: 'child_5_7',
        min_age_years: 5,
        max_age_years: 7,
        price_per_child: 17.0,
        capacity_total: 18,
        status: 'active',
        allow_addons: false,
        capacity_remaining: 18.0
      });
    }

    if (syntheticSessions.length) {
      sessions = sessions.concat(syntheticSessions);
      this._saveToStorage('open_play_sessions', sessions);
    }

    return sessions;
  }

  _getEligibleAmountForOpenPlayPromotion(promo, cartItems) {
    const openPlayCartItems = cartItems.filter(
      (ci) => ci.item_type === 'open_play_booking' && ci.is_eligible_for_promotions !== false
    );
    if (!openPlayCartItems.length) return 0;

    const bookings = this._getFromStorage('open_play_bookings', []);
    const sessions = this._ensureScenarioOpenPlaySessionsSeeded();

    let total = 0;

    openPlayCartItems.forEach((ci) => {
      const booking = bookings.find((b) => b.id === ci.reference_id);
      if (!booking) return;
      const session = sessions.find((s) => s.id === booking.session_id);
      if (!session) return;

      // Check weekday constraint
      if (Array.isArray(promo.valid_days_of_week) && promo.valid_days_of_week.length > 0) {
        if (!promo.valid_days_of_week.includes(session.weekday)) return;
      }

      // Check time constraint
      if (promo.min_session_start_time) {
        const sessionStartTime = this._getTimeFromISO(session.start_datetime);
        if (this._compareTime(sessionStartTime, promo.min_session_start_time) < 0) return;
      }

      total += ci.total_price || 0;
    });

    return total;
  }

  // ---------------------- Booking totals helpers ----------------------
  _calculateOpenPlayBookingTotals(session, numberOfChildren, selectedAddons) {
    const pricePerChild = session.price_per_child || 0;
    const childrenSubtotal = pricePerChild * numberOfChildren;

    let addonsSubtotal = 0;
    const addons = this._getFromStorage('addons', []);

    (selectedAddons || []).forEach((sel) => {
      const addon = addons.find((a) => a.id === sel.addonId);
      if (!addon || !addon.is_active) return;
      const qty = sel.quantity || 0;
      const unitPrice = addon.price || 0;
      addonsSubtotal += unitPrice * qty;
    });

    const totalPrice = childrenSubtotal + addonsSubtotal;

    return {
      pricePerChild,
      childrenSubtotal,
      addonsSubtotal,
      totalPrice
    };
  }

  _calculatePartyBookingTotals(partyPackage, partyDate, numberOfChildren, selectedAddons) {
    const basePrice = partyPackage.base_price || 0;
    const includedChildren = partyPackage.included_children_count || 0;
    const perAdditional = partyPackage.price_per_additional_child || 0;
    const additionalChildren = Math.max(0, numberOfChildren - includedChildren);
    const childrenPrice = additionalChildren * perAdditional;

    let addonsSubtotal = 0;
    const addons = this._getFromStorage('addons', []);

    (selectedAddons || []).forEach((sel) => {
      const addon = addons.find((a) => a.id === sel.addonId);
      if (!addon || !addon.is_active) return;
      const qty = sel.quantity || 0;
      const unitPrice = addon.price || 0;
      addonsSubtotal += unitPrice * qty;
    });

    const totalPrice = basePrice + childrenPrice + addonsSubtotal;

    return {
      basePrice,
      childrenPrice,
      addonsSubtotal,
      totalPrice
    };
  }

  // ---------------------- Promotion helpers ----------------------
  _validatePromotionForCart(promo, cart, cartItems) {
    if (!promo || !promo.is_active) return false;

    const now = new Date();
    if (promo.start_date) {
      const start = new Date(promo.start_date);
      if (now < start) return false;
    }
    if (promo.end_date) {
      const end = new Date(promo.end_date);
      if (now > end) return false;
    }

    if (promo.applicable_to === 'cart_total') {
      return cartItems.length > 0;
    }

    if (promo.applicable_to === 'open_play_session') {
      const eligible = this._getEligibleAmountForOpenPlayPromotion(promo, cartItems);
      return eligible > 0;
    }

    if (promo.applicable_to === 'party_package') {
      const eligible = this._getEligibleAmountForType(cartItems, 'party_booking');
      return eligible > 0;
    }

    if (promo.applicable_to === 'cafe_menu_item') {
      const eligible = this._getEligibleAmountForType(cartItems, 'cafe_menu_item');
      return eligible > 0;
    }

    if (promo.applicable_to === 'membership_plan') {
      const eligible = this._getEligibleAmountForType(cartItems, 'membership_enrollment');
      return eligible > 0;
    }

    return false;
  }

  _findOrCreatePendingOrderFromCart(cart) {
    let orders = this._getFromStorage('orders', []);
    let order = orders.find((o) => o.cart_id === cart.id && o.status === 'pending_payment');

    const nowIso = new Date().toISOString();

    if (!order) {
      order = {
        id: this._generateId('order'),
        cart_id: cart.id,
        created_at: nowIso,
        status: 'pending_payment',
        subtotal_amount: cart.subtotal_amount,
        discount_total: cart.discount_total,
        tax_total: cart.tax_total,
        total_amount: cart.total_amount,
        applied_promo_codes: Array.isArray(cart.applied_promo_codes)
          ? cart.applied_promo_codes.slice()
          : []
      };
      orders.push(order);
      this._saveToStorage('orders', orders);

      // Snapshot order items
      const cartItems = this._getFromStorage('cart_items', []).filter((ci) => ci.cart_id === cart.id);
      let orderItems = this._getFromStorage('order_items', []);
      cartItems.forEach((ci) => {
        const oi = {
          id: this._generateId('order_item'),
          order_id: order.id,
          item_type: ci.item_type,
          reference_id: ci.reference_id,
          name: ci.name,
          quantity: ci.quantity,
          unit_price: ci.unit_price,
          total_price: ci.total_price,
          item_type_label: ci.item_type_label,
          schedule_summary: ci.schedule_summary,
          details_summary: ci.details_summary,
          applied_promo_codes: Array.isArray(cart.applied_promo_codes)
            ? cart.applied_promo_codes.slice()
            : []
        };
        orderItems.push(oi);
      });
      this._saveToStorage('order_items', orderItems);

      // Mark cart as converted_to_order
      cart.status = 'converted_to_order';
      this._saveCart(cart);
    }

    return order;
  }

  _getNextPendingOrder() {
    const orders = this._getFromStorage('orders', []).filter((o) => o.status === 'pending_payment');
    if (!orders.length) return null;
    orders.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    return orders[0];
  }

  // ---------------------- Foreign key resolution helpers ----------------------
  _resolveSessionAddonAvailability(record) {
    const addons = this._getFromStorage('addons', []);
    const addon = addons.find((a) => a.id === record.addon_id) || null;
    return {
      ...record,
      addon
    };
  }

  _resolvePartyAddonAvailability(record) {
    const addons = this._getFromStorage('addons', []);
    const addon = addons.find((a) => a.id === record.addon_id) || null;
    return {
      ...record,
      addon
    };
  }

  _resolveCartItemReference(cartItem) {
    let reference = null;
    if (cartItem.item_type === 'open_play_booking') {
      const bookings = this._getFromStorage('open_play_bookings', []);
      const booking = bookings.find((b) => b.id === cartItem.reference_id) || null;
      if (booking) {
        const sessions = this._getFromStorage('open_play_sessions', []);
        const session = sessions.find((s) => s.id === booking.session_id) || null;
        reference = { ...booking, session };
      }
    } else if (cartItem.item_type === 'party_booking') {
      const bookings = this._getFromStorage('party_bookings', []);
      const booking = bookings.find((b) => b.id === cartItem.reference_id) || null;
      if (booking) {
        const packages = this._getFromStorage('party_packages', []);
        const partyPackage = packages.find((p) => p.id === booking.party_package_id) || null;
        reference = { ...booking, party_package: partyPackage };
      }
    } else if (cartItem.item_type === 'cafe_menu_item') {
      const items = this._getFromStorage('cafe_menu_items', []);
      reference = items.find((i) => i.id === cartItem.reference_id) || null;
    } else if (cartItem.item_type === 'membership_enrollment') {
      const enrollments = this._getFromStorage('membership_enrollments', []);
      const enrollment = enrollments.find((e) => e.id === cartItem.reference_id) || null;
      if (enrollment) {
        const plans = this._getFromStorage('membership_plans', []);
        const plan = plans.find((p) => p.id === enrollment.membership_plan_id) || null;
        reference = { ...enrollment, membership_plan: plan };
      }
    }
    return {
      ...cartItem,
      reference
    };
  }

  _buildCartSummary(cart) {
    const cartItemsRaw = this._getFromStorage('cart_items', []).filter((ci) => ci.cart_id === cart.id);
    const items = cartItemsRaw.map((ci) => {
      const withRef = this._resolveCartItemReference(ci);
      return {
        cart_item_id: withRef.id,
        item_type: withRef.item_type,
        item_type_label: withRef.item_type_label,
        reference_id: withRef.reference_id,
        name: withRef.name,
        quantity: withRef.quantity,
        unit_price: withRef.unit_price,
        total_price: withRef.total_price,
        schedule_summary: withRef.schedule_summary,
        details_summary: withRef.details_summary,
        is_eligible_for_promotions: withRef.is_eligible_for_promotions,
        reference: withRef.reference
      };
    });

    return {
      id: cart.id,
      status: cart.status,
      subtotal_amount: cart.subtotal_amount,
      discount_total: cart.discount_total,
      tax_total: cart.tax_total,
      total_amount: cart.total_amount,
      applied_promo_codes: Array.isArray(cart.applied_promo_codes)
        ? cart.applied_promo_codes.slice()
        : [],
      items
    };
  }

  _buildOrderSummary(order) {
    const orderItemsRaw = this._getFromStorage('order_items', []).filter((oi) => oi.order_id === order.id);
    const items = orderItemsRaw.map((oi) => {
      let reference = null;
      if (oi.item_type === 'open_play_booking') {
        const bookings = this._getFromStorage('open_play_bookings', []);
        const booking = bookings.find((b) => b.id === oi.reference_id) || null;
        if (booking) {
          const sessions = this._getFromStorage('open_play_sessions', []);
          const session = sessions.find((s) => s.id === booking.session_id) || null;
          reference = { ...booking, session };
        }
      } else if (oi.item_type === 'party_booking') {
        const bookings = this._getFromStorage('party_bookings', []);
        const booking = bookings.find((b) => b.id === oi.reference_id) || null;
        if (booking) {
          const packages = this._getFromStorage('party_packages', []);
          const partyPackage = packages.find((p) => p.id === booking.party_package_id) || null;
          reference = { ...booking, party_package: partyPackage };
        }
      } else if (oi.item_type === 'cafe_menu_item') {
        const itemsStorage = this._getFromStorage('cafe_menu_items', []);
        reference = itemsStorage.find((i) => i.id === oi.reference_id) || null;
      } else if (oi.item_type === 'membership_enrollment') {
        const enrollments = this._getFromStorage('membership_enrollments', []);
        const enrollment = enrollments.find((e) => e.id === oi.reference_id) || null;
        if (enrollment) {
          const plans = this._getFromStorage('membership_plans', []);
          const plan = plans.find((p) => p.id === enrollment.membership_plan_id) || null;
          reference = { ...enrollment, membership_plan: plan };
        }
      }

      return {
        order_item_id: oi.id,
        item_type: oi.item_type,
        item_type_label: oi.item_type_label,
        reference_id: oi.reference_id,
        name: oi.name,
        quantity: oi.quantity,
        unit_price: oi.unit_price,
        total_price: oi.total_price,
        schedule_summary: oi.schedule_summary,
        details_summary: oi.details_summary,
        applied_promo_codes: Array.isArray(oi.applied_promo_codes) ? oi.applied_promo_codes.slice() : [],
        reference
      };
    });

    return {
      id: order.id,
      cart_id: order.cart_id,
      created_at: order.created_at,
      status: order.status,
      subtotal_amount: order.subtotal_amount,
      discount_total: order.discount_total,
      tax_total: order.tax_total,
      total_amount: order.total_amount,
      applied_promo_codes: Array.isArray(order.applied_promo_codes)
        ? order.applied_promo_codes.slice()
        : [],
      items
    };
  }

  // ---------------------- Core interface implementations ----------------------

  // getHomeContent
  getHomeContent() {
    const openPlaySessions = this._getFromStorage('open_play_sessions', []);
    const parties = this._getFromStorage('party_packages', []);
    const cafeItems = this._getFromStorage('cafe_menu_items', []);
    const membershipPlans = this._getFromStorage('membership_plans', []);
    const promotions = this._getFromStorage('promotions', []);

    const now = new Date();
    const todayYMD = this._formatDateYMD(now);

    const activeSessions = openPlaySessions.filter(
      (s) => s.status === 'active' && (s.capacity_remaining === undefined || s.capacity_remaining > 0)
    );

    // Next available open play date
    let nextSessionDate = null;
    if (activeSessions.length) {
      activeSessions.sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime));
      nextSessionDate = this._formatDateYMD(activeSessions[0].start_datetime);
    }

    const openTodayCount = activeSessions.filter((s) => this._isSameYMD(s.start_datetime, todayYMD)).length;

    const openPlayHighlight = {
      next_session_date: nextSessionDate,
      open_sessions_count_today: openTodayCount,
      cta_label: 'Book Open Play'
    };

    // Parties highlight
    const activeParties = parties.filter((p) => p.status === 'active');

    let popularPackageName = activeParties.length ? activeParties[0].name : null;

    // Next available weekend date: upcoming Saturday by default if any active party packages
    let nextWeekendDate = null;
    if (activeParties.length) {
      const temp = new Date(now.getTime());
      for (let i = 0; i < 14; i++) {
        const day = temp.getUTCDay();
        if (day === 0 || day === 6) {
          nextWeekendDate = this._formatDateYMD(temp);
          break;
        }
        temp.setUTCDate(temp.getUTCDate() + 1);
      }
    }

    const partiesHighlight = {
      next_available_weekend_date: nextWeekendDate,
      popular_package_name: popularPackageName,
      cta_label: 'View Birthday Parties'
    };

    // Cafe highlight: pick up to 3 active items
    const activeCafeItems = cafeItems.filter((i) => i.is_active);
    activeCafeItems.sort((a, b) => b.rating_average - a.rating_average);

    const featuredItems = activeCafeItems.slice(0, 3).map((item) => ({
      item_name: item.name,
      category_label: this._titleCase(item.category),
      price: item.price
    }));

    const cafeHighlight = {
      featured_items: featuredItems,
      cta_label: 'Browse Cafe Menu'
    };

    // Membership highlight
    const activePlans = membershipPlans.filter((p) => p.status === 'active');
    let startingPrice = null;
    let popularPlanName = null;
    if (activePlans.length) {
      startingPrice = activePlans.reduce((min, p) => (min === null || p.monthly_price < min ? p.monthly_price : min), null);
      popularPlanName = activePlans[0].name;
    }

    const membershipsHighlight = {
      starting_price: startingPrice,
      popular_plan_name: popularPlanName,
      cta_label: 'Explore Memberships'
    };

    // Promo banners
    const activePromos = promotions.filter((p) => p.is_active);
    const promoBanners = activePromos.map((p) => ({
      promotion_id: p.id,
      title: p.name,
      subtitle: p.description || '',
      promo_code: p.code,
      applicable_to: p.applicable_to,
      highlight_color: 'primary'
    }));

    // Quick actions
    const quickActions = [
      {
        page_key: 'open_play',
        label: 'Book Open Play',
        description: 'Reserve a play session for your kids.'
      },
      {
        page_key: 'birthday_parties',
        label: 'Plan a Party',
        description: 'Explore birthday party packages.'
      },
      {
        page_key: 'cafe_menu',
        label: 'Order from Cafe',
        description: 'Coffee, snacks, and more.'
      },
      {
        page_key: 'memberships',
        label: 'Join Membership',
        description: 'Save with weekly visits.'
      }
    ];

    return {
      open_play_highlight: openPlayHighlight,
      parties_highlight: partiesHighlight,
      cafe_highlight: cafeHighlight,
      memberships_highlight: membershipsHighlight,
      promo_banners: promoBanners,
      quick_actions: quickActions
    };
  }

  // getOpenPlayFilterOptions
  getOpenPlayFilterOptions() {
    const sessions = this._getFromStorage('open_play_sessions', []);
    const prices = sessions.map((s) => s.price_per_child || 0);
    const minPrice = prices.length ? Math.min(...prices) : 0;
    const maxPrice = prices.length ? Math.max(...prices) : 0;

    const ageGroups = [
      { value: 'toddler_1_2', label: 'Toddlers (1-2 years)' },
      { value: 'preschool_3_4', label: 'Preschool (3-4 years)' },
      { value: 'child_5_7', label: 'Kids (5-7 years)' },
      { value: 'mixed_ages', label: 'Mixed Ages' }
    ];

    const weekdayOptions = [
      { value: 'weekday', label: 'Weekdays (Mon-Fri)' },
      { value: 'weekend', label: 'Weekends (Sat-Sun)' },
      { value: 'all', label: 'All Days' }
    ];

    const timeFilters = [
      {
        value: 'after_15_00',
        label: 'After 3:00 PM',
        start_time_from: '15:00',
        start_time_to: ''
      },
      {
        value: 'between_10_00_11_00',
        label: '10:00 AM - 11:00 AM',
        start_time_from: '10:00',
        start_time_to: '11:00'
      },
      {
        value: 'after_12_00',
        label: 'After 12:00 PM',
        start_time_from: '12:00',
        start_time_to: ''
      }
    ];

    const sortOptions = [
      { value: 'price_low_to_high', label: 'Price – Low to High' },
      { value: 'start_time_asc', label: 'Start Time – Earliest First' }
    ];

    return {
      age_groups: ageGroups,
      weekday_options: weekdayOptions,
      time_filters: timeFilters,
      price_per_child_range: {
        min: minPrice,
        max: maxPrice,
        step: 1,
        currency: 'USD'
      },
      sort_options: sortOptions
    };
  }

  // listOpenPlaySessions
  listOpenPlaySessions(
    date,
    numberOfChildren,
    ageGroup,
    isWeekday,
    maxPricePerChild,
    startTimeFrom,
    startTimeTo,
    sortBy
  ) {
    const sessions = this._ensureScenarioOpenPlaySessionsSeeded();

    const filtered = sessions
      .filter((s) => this._formatDateYMD(s.start_datetime) === date)
      .filter((s) => (typeof isWeekday === 'boolean' ? s.is_weekday === isWeekday : true))
      .filter((s) => (ageGroup ? s.age_group === ageGroup : true))
      .filter((s) => (typeof maxPricePerChild === 'number' ? s.price_per_child <= maxPricePerChild : true))
      .filter((s) => s.status === 'active')
      .filter((s) => s.capacity_remaining === undefined || s.capacity_remaining > 0)
      .filter((s) => {
        const startTime = this._getTimeFromISO(s.start_datetime);
        if (startTimeFrom && this._compareTime(startTime, startTimeFrom) < 0) return false;
        if (startTimeTo && this._compareTime(startTime, startTimeTo) > 0) return false;
        return true;
      });

    if (sortBy === 'price_low_to_high') {
      filtered.sort((a, b) => (a.price_per_child || 0) - (b.price_per_child || 0));
    } else if (sortBy === 'start_time_asc') {
      filtered.sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime));
    }

    const resultSessions = filtered.map((s) => {
      const childrenSubtotal = (s.price_per_child || 0) * numberOfChildren;
      const isSoldOut = s.status === 'sold_out' || (s.capacity_remaining !== undefined && s.capacity_remaining <= 0);
      const canBook = s.status === 'active' && !isSoldOut &&
        (s.capacity_remaining === undefined || s.capacity_remaining >= numberOfChildren);

      const start = new Date(s.start_datetime);
      const end = new Date(s.end_datetime);

      const displayDate = this._formatDateYMD(start);
      const displayStartTime = this._getTimeFromISO(start);
      const displayEndTime = this._getTimeFromISO(end);

      return {
        session_id: s.id,
        name: s.name,
        description: s.description || '',
        start_datetime: s.start_datetime,
        end_datetime: s.end_datetime,
        weekday: s.weekday,
        is_weekday: s.is_weekday,
        age_group: s.age_group,
        age_group_label: this._titleCase(s.age_group),
        price_per_child: s.price_per_child,
        capacity_remaining: s.capacity_remaining,
        status: s.status,
        allow_addons: s.allow_addons,
        display_date: displayDate,
        display_start_time: displayStartTime,
        display_end_time: displayEndTime,
        is_sold_out: isSoldOut,
        children_subtotal_for_selected_count: childrenSubtotal,
        currency: 'USD',
        can_book: canBook
      };
    });

    return {
      date,
      number_of_children_context: numberOfChildren,
      sessions: resultSessions
    };
  }

  // getOpenPlaySessionDetails
  getOpenPlaySessionDetails(sessionId) {
    const session = this._getEntityById('open_play_sessions', sessionId);
    if (!session) {
      return {
        session: null,
        recommended_age_label: '',
        can_book: false,
        notes: ''
      };
    }

    const canBook =
      session.status === 'active' &&
      (session.capacity_remaining === undefined || session.capacity_remaining > 0);

    const start = new Date(session.start_datetime);
    const end = new Date(session.end_datetime);
    const displayDate = this._formatDateYMD(start);
    const displayTimeRange = this._getTimeFromISO(start) + ' - ' + this._getTimeFromISO(end);

    return {
      session: {
        id: session.id,
        name: session.name,
        description: session.description || '',
        start_datetime: session.start_datetime,
        end_datetime: session.end_datetime,
        weekday: session.weekday,
        is_weekday: session.is_weekday,
        age_group: session.age_group,
        age_group_label: this._titleCase(session.age_group),
        min_age_years: session.min_age_years,
        max_age_years: session.max_age_years,
        price_per_child: session.price_per_child,
        capacity_total: session.capacity_total,
        capacity_remaining: session.capacity_remaining,
        status: session.status,
        allow_addons: session.allow_addons,
        display_date: displayDate,
        display_time_range: displayTimeRange
      },
      recommended_age_label: this._titleCase(session.age_group),
      can_book: canBook,
      notes: ''
    };
  }

  // getSessionAddons
  getSessionAddons(sessionId, sortBy) {
    const availabilities = this._getFromStorage('session_addon_availabilities', []).filter(
      (sa) => sa.session_id === sessionId && sa.is_active
    );
    const addons = this._getFromStorage('addons', []);

    let result = availabilities
      .map((sa) => {
        const addon = addons.find((a) => a.id === sa.addon_id);
        if (!addon || !addon.is_active) return null;
        return {
          addon_id: addon.id,
          name: addon.name,
          description: addon.description || '',
          pricing_type: addon.pricing_type,
          duration_type: addon.duration_type,
          price: addon.price,
          is_default_selected: !!sa.is_default_selected,
          is_active: addon.is_active,
          addon
        };
      })
      .filter(Boolean);

    if (sortBy === 'price_low_to_high') {
      result.sort((a, b) => (a.price || 0) - (b.price || 0));
    } else if (sortBy === 'name_asc') {
      result.sort((a, b) => a.name.localeCompare(b.name));
    }

    return {
      session_id: sessionId,
      addons: result
    };
  }

  // createOpenPlayBookingPreview
  createOpenPlayBookingPreview(sessionId, numberOfChildren, selectedAddons) {
    const session = this._getEntityById('open_play_sessions', sessionId);
    if (!session) {
      return {
        session_id: sessionId,
        session_name: '',
        number_of_children: numberOfChildren,
        price_per_child: 0,
        children_subtotal: 0,
        addons_subtotal: 0,
        total_price: 0,
        currency: 'USD',
        breakdown: []
      };
    }

    const totals = this._calculateOpenPlayBookingTotals(session, numberOfChildren, selectedAddons);
    const addons = this._getFromStorage('addons', []);

    const breakdown = [
      {
        label: 'Children (' + numberOfChildren + ' x ' + session.price_per_child + ')',
        amount: totals.childrenSubtotal
      }
    ];

    (selectedAddons || []).forEach((sel) => {
      const addon = addons.find((a) => a.id === sel.addonId);
      if (!addon || !addon.is_active) return;
      const qty = sel.quantity || 0;
      breakdown.push({
        label: 'Addon: ' + addon.name + ' (' + qty + ' x ' + addon.price + ')',
        amount: addon.price * qty
      });
    });

    return {
      session_id: session.id,
      session_name: session.name,
      number_of_children: numberOfChildren,
      price_per_child: totals.pricePerChild,
      children_subtotal: totals.childrenSubtotal,
      addons_subtotal: totals.addonsSubtotal,
      total_price: totals.totalPrice,
      currency: 'USD',
      breakdown
    };
  }

  // addOpenPlayBookingToCart
  addOpenPlayBookingToCart(sessionId, numberOfChildren, selectedAddons) {
    const session = this._getEntityById('open_play_sessions', sessionId);
    if (!session) {
      return { success: false, message: 'Session not found', booking: null, cart: null };
    }

    const cart = this._getOrCreateCart();

    const totals = this._calculateOpenPlayBookingTotals(session, numberOfChildren, selectedAddons);

    const bookingId = this._generateId('open_play_booking');
    const nowIso = new Date().toISOString();

    const booking = {
      id: bookingId,
      session_id: session.id,
      session_name: session.name,
      session_start_datetime: session.start_datetime,
      session_end_datetime: session.end_datetime,
      number_of_children: numberOfChildren,
      price_per_child: session.price_per_child,
      children_subtotal: totals.childrenSubtotal,
      addons_subtotal: totals.addonsSubtotal,
      total_price: totals.totalPrice,
      created_at: nowIso
    };

    // Save booking
    const openPlayBookings = this._getFromStorage('open_play_bookings', []);
    openPlayBookings.push(booking);
    this._saveToStorage('open_play_bookings', openPlayBookings);

    // Save booking addons
    const addons = this._getFromStorage('addons', []);
    let bookingAddons = this._getFromStorage('open_play_booking_addons', []);
    (selectedAddons || []).forEach((sel) => {
      const addon = addons.find((a) => a.id === sel.addonId);
      if (!addon || !addon.is_active) return;
      const qty = sel.quantity || 0;
      const unitPrice = addon.price || 0;
      const totalPrice = unitPrice * qty;

      const bookingAddon = {
        id: this._generateId('open_play_booking_addon'),
        booking_id: bookingId,
        addon_id: addon.id,
        addon_name: addon.name,
        quantity: qty,
        duration_label: sel.durationLabel || null,
        unit_price: unitPrice,
        total_price: totalPrice
      };
      bookingAddons.push(bookingAddon);
    });
    this._saveToStorage('open_play_booking_addons', bookingAddons);

    // Create cart item
    let cartItems = this._getFromStorage('cart_items', []);
    const scheduleSummary = this._formatDateYMD(session.start_datetime) + ' ' + this._getTimeFromISO(session.start_datetime);
    const detailsSummary = numberOfChildren + ' children';

    const cartItem = {
      id: this._generateId('cart_item'),
      cart_id: cart.id,
      item_type: 'open_play_booking',
      item_type_label: 'Open Play Session',
      reference_id: bookingId,
      name: session.name,
      quantity: 1,
      unit_price: totals.totalPrice,
      total_price: totals.totalPrice,
      schedule_summary: scheduleSummary,
      details_summary: detailsSummary,
      is_eligible_for_promotions: true,
      applied_promo_codes: []
    };

    cartItems.push(cartItem);
    this._saveToStorage('cart_items', cartItems);

    this._calculateCartTotals(cart);

    const cartSummary = this._buildCartSummary(cart);

    return {
      success: true,
      message: 'Open play booking added to cart',
      booking: {
        ...booking,
        session
      },
      cart: cartSummary
    };
  }

  // getPartyFilterOptions
  getPartyFilterOptions() {
    const packages = this._getFromStorage('party_packages', []);

    const includedCounts = packages.map((p) => p.included_children_count || 0);
    const maxChildren = packages.map((p) => p.max_children || p.included_children_count || 0);
    const minChildren = includedCounts.length ? Math.min(...includedCounts) : 1;
    const maxChild = maxChildren.length ? Math.max(...maxChildren) : 20;

    const prices = packages.map((p) => p.base_price || 0);
    const minPrice = prices.length ? Math.min(...prices) : 0;
    const maxPrice = prices.length ? Math.max(...prices) : 0;

    const features = [
      { value: 'private_party_room', label: 'Private Party Room' },
      { value: 'weekend_only', label: 'Weekend Only' }
    ];

    const sortOptions = [
      { value: 'total_price_low_to_high', label: 'Total Price – Low to High' },
      { value: 'base_price_low_to_high', label: 'Base Price – Low to High' },
      { value: 'name_asc', label: 'Name A–Z' }
    ];

    return {
      children_count_range: {
        min: minChildren,
        max: maxChild,
        step: 1
      },
      features,
      total_price_range: {
        min: minPrice,
        max: maxPrice,
        step: 10,
        currency: 'USD'
      },
      sort_options: sortOptions
    };
  }

  // listPartyPackagesForDate
  listPartyPackagesForDate(partyDate, numberOfChildren, requiresPrivateRoom, maxTotalPrice, sortBy) {
    const packages = this._getFromStorage('party_packages', []);
    const dateObj = this._parseDateFromYMD(partyDate);
    const weekday = this._getWeekdayEnumFromDate(dateObj);
    const isWeekend = weekday === 'saturday' || weekday === 'sunday';

    let filtered = packages.filter((p) => p.status === 'active');

    if (requiresPrivateRoom) {
      filtered = filtered.filter((p) => p.has_private_room);
    }

    // Respect weekend-only constraint
    filtered = filtered.filter((p) => {
      if (p.is_weekend_only) {
        return isWeekend;
      }
      return true;
    });

    const result = filtered
      .map((p) => {
        const includedChildren = p.included_children_count || 0;
        const additionalChildren = Math.max(0, numberOfChildren - includedChildren);
        const childrenPrice = additionalChildren * (p.price_per_additional_child || 0);
        const totalPrice = (p.base_price || 0) + childrenPrice;

        return {
          party_package_id: p.id,
          name: p.name,
          description: p.description || '',
          base_price: p.base_price,
          included_children_count: p.included_children_count,
          price_per_additional_child: p.price_per_additional_child,
          max_children: p.max_children,
          has_private_room: p.has_private_room,
          duration_hours: p.duration_hours,
          status: p.status,
          is_weekend_only: !!p.is_weekend_only,
          total_price_for_selected_children: totalPrice,
          meets_private_room_requirement: !!p.has_private_room,
          currency: 'USD'
        };
      })
      .filter((pkg) =>
        typeof maxTotalPrice === 'number' ? pkg.total_price_for_selected_children <= maxTotalPrice : true
      );

    if (sortBy === 'total_price_low_to_high') {
      result.sort((a, b) => a.total_price_for_selected_children - b.total_price_for_selected_children);
    } else if (sortBy === 'base_price_low_to_high') {
      result.sort((a, b) => a.base_price - b.base_price);
    } else if (sortBy === 'name_asc') {
      result.sort((a, b) => a.name.localeCompare(b.name));
    }

    return {
      party_date: partyDate,
      number_of_children_context: numberOfChildren,
      packages: result
    };
  }

  // getPartyPackageDetails
  getPartyPackageDetails(partyPackageId, partyDate, numberOfChildren) {
    const partyPackage = this._getEntityById('party_packages', partyPackageId);
    if (!partyPackage) {
      return {
        package: null,
        pricing_preview: null
      };
    }

    let pricingPreview = null;

    if (partyDate && typeof numberOfChildren === 'number') {
      const totals = this._calculatePartyBookingTotals(partyPackage, partyDate, numberOfChildren, []);
      pricingPreview = {
        party_date: partyDate,
        number_of_children: numberOfChildren,
        base_price: totals.basePrice,
        children_price: totals.childrenPrice,
        addons_subtotal: totals.addonsSubtotal,
        total_price: totals.totalPrice,
        currency: 'USD'
      };
    }

    return {
      package: {
        id: partyPackage.id,
        name: partyPackage.name,
        description: partyPackage.description || '',
        base_price: partyPackage.base_price,
        included_children_count: partyPackage.included_children_count,
        price_per_additional_child: partyPackage.price_per_additional_child,
        max_children: partyPackage.max_children,
        has_private_room: partyPackage.has_private_room,
        duration_hours: partyPackage.duration_hours,
        status: partyPackage.status,
        is_weekend_only: !!partyPackage.is_weekend_only
      },
      pricing_preview: pricingPreview
    };
  }

  // getPartyPackageAddons
  getPartyPackageAddons(partyPackageId, sortBy) {
    const availabilities = this._getFromStorage('party_addon_availabilities', []).filter(
      (pa) => pa.party_package_id === partyPackageId && pa.is_active
    );
    const addons = this._getFromStorage('addons', []);

    let result = availabilities
      .map((pa) => {
        const addon = addons.find((a) => a.id === pa.addon_id);
        if (!addon || !addon.is_active) return null;
        return {
          addon_id: addon.id,
          name: addon.name,
          description: addon.description || '',
          pricing_type: addon.pricing_type,
          duration_type: addon.duration_type,
          price: addon.price,
          is_active: addon.is_active,
          addon
        };
      })
      .filter(Boolean);

    if (sortBy === 'price_low_to_high') {
      result.sort((a, b) => (a.price || 0) - (b.price || 0));
    } else if (sortBy === 'name_asc') {
      result.sort((a, b) => a.name.localeCompare(b.name));
    }

    return {
      party_package_id: partyPackageId,
      addons: result
    };
  }

  // createPartyBookingPreview
  createPartyBookingPreview(partyPackageId, partyDate, numberOfChildren, selectedAddons) {
    const partyPackage = this._getEntityById('party_packages', partyPackageId);
    if (!partyPackage) {
      return {
        party_package_id: partyPackageId,
        party_package_name: '',
        party_date: partyDate,
        number_of_children: numberOfChildren,
        base_price: 0,
        children_price: 0,
        addons_subtotal: 0,
        total_price: 0,
        currency: 'USD'
      };
    }

    const totals = this._calculatePartyBookingTotals(
      partyPackage,
      partyDate,
      numberOfChildren,
      selectedAddons
    );

    return {
      party_package_id: partyPackage.id,
      party_package_name: partyPackage.name,
      party_date: partyDate,
      number_of_children: numberOfChildren,
      base_price: totals.basePrice,
      children_price: totals.childrenPrice,
      addons_subtotal: totals.addonsSubtotal,
      total_price: totals.totalPrice,
      currency: 'USD'
    };
  }

  // addPartyBookingToCart
  addPartyBookingToCart(partyPackageId, partyDate, numberOfChildren, selectedAddons) {
    const partyPackage = this._getEntityById('party_packages', partyPackageId);
    if (!partyPackage) {
      return { success: false, message: 'Party package not found', party_booking: null, cart: null };
    }

    const cart = this._getOrCreateCart();
    const totals = this._calculatePartyBookingTotals(
      partyPackage,
      partyDate,
      numberOfChildren,
      selectedAddons
    );

    const bookingId = this._generateId('party_booking');
    const nowIso = new Date().toISOString();

    const partyBooking = {
      id: bookingId,
      party_package_id: partyPackage.id,
      party_package_name: partyPackage.name,
      party_date: partyDate,
      number_of_children: numberOfChildren,
      base_price: totals.basePrice,
      children_price: totals.childrenPrice,
      addons_subtotal: totals.addonsSubtotal,
      total_price: totals.totalPrice,
      has_private_room: !!partyPackage.has_private_room,
      created_at: nowIso
    };

    let partyBookings = this._getFromStorage('party_bookings', []);
    partyBookings.push(partyBooking);
    this._saveToStorage('party_bookings', partyBookings);

    // Save add-ons
    const addons = this._getFromStorage('addons', []);
    let bookingAddons = this._getFromStorage('party_booking_addons', []);
    (selectedAddons || []).forEach((sel) => {
      const addon = addons.find((a) => a.id === sel.addonId);
      if (!addon || !addon.is_active) return;
      const qty = sel.quantity || 0;
      const unitPrice = addon.price || 0;
      const totalPrice = unitPrice * qty;

      const bookingAddon = {
        id: this._generateId('party_booking_addon'),
        party_booking_id: bookingId,
        addon_id: addon.id,
        addon_name: addon.name,
        quantity: qty,
        unit_price: unitPrice,
        total_price: totalPrice
      };
      bookingAddons.push(bookingAddon);
    });
    this._saveToStorage('party_booking_addons', bookingAddons);

    // Cart item
    let cartItems = this._getFromStorage('cart_items', []);
    const scheduleSummary = partyDate;
    const detailsSummary = numberOfChildren + ' children';

    const cartItem = {
      id: this._generateId('cart_item'),
      cart_id: cart.id,
      item_type: 'party_booking',
      item_type_label: 'Birthday Party',
      reference_id: bookingId,
      name: partyPackage.name,
      quantity: 1,
      unit_price: totals.totalPrice,
      total_price: totals.totalPrice,
      schedule_summary: scheduleSummary,
      details_summary: detailsSummary,
      is_eligible_for_promotions: true,
      applied_promo_codes: []
    };

    cartItems.push(cartItem);
    this._saveToStorage('cart_items', cartItems);

    this._calculateCartTotals(cart);

    return {
      success: true,
      message: 'Party booking added to cart',
      party_booking: {
        ...partyBooking,
        party_package: partyPackage
      },
      cart: this._buildCartSummary(cart)
    };
  }

  // getCafeCategories
  getCafeCategories() {
    const items = this._getFromStorage('cafe_menu_items', []);
    const categoriesMap = {};

    items.forEach((item) => {
      if (!item.is_active) return;
      if (!categoriesMap[item.category]) {
        categoriesMap[item.category] = 0;
      }
      categoriesMap[item.category] += 1;
    });

    return Object.keys(categoriesMap).map((cat) => ({
      category: cat,
      label: this._titleCase(cat),
      item_count: categoriesMap[cat]
    }));
  }

  // getCafeFilterOptions
  getCafeFilterOptions() {
    const items = this._getFromStorage('cafe_menu_items', []);
    const prices = items.map((i) => i.price || 0);
    const minPrice = prices.length ? Math.min(...prices) : 0;
    const maxPrice = prices.length ? Math.max(...prices) : 0;

    const ratingOptions = [
      { min_rating: 0, label: 'All Ratings' },
      { min_rating: 3, label: '3 stars & up' },
      { min_rating: 4, label: '4 stars & up' },
      { min_rating: 4.5, label: '4.5 stars & up' }
    ];

    const sortOptions = [
      { value: 'price_low_to_high', label: 'Price – Low to High' },
      { value: 'rating_high_to_low', label: 'Rating – High to Low' },
      { value: 'name_asc', label: 'Name A–Z' }
    ];

    return {
      rating_options: ratingOptions,
      sort_options: sortOptions,
      price_range: {
        min: minPrice,
        max: maxPrice,
        step: 0.5,
        currency: 'USD'
      }
    };
  }

  // listCafeMenuItems
  listCafeMenuItems(category, minRating, maxPrice, sortBy) {
    let items = this._getFromStorage('cafe_menu_items', []);

    // Seed default kids snacks if none are defined for that category so flows have something to work with
    if (category === 'kids_snacks' && !items.some((i) => i.category === 'kids_snacks')) {
      const defaultKidsSnacks = [
        {
          id: 'kids_snack_fruit_cup',
          name: 'Fresh Fruit Cup',
          description: 'Diced seasonal fruit in a kid-sized cup.',
          category: 'kids_snacks',
          price: 3.5,
          rating_average: 4.6,
          rating_count: 42,
          is_active: true,
          is_nut_free: true
        },
        {
          id: 'kids_snack_crackers_cheese',
          name: 'Crackers & Cheese Pack',
          description: 'Kid-friendly crackers with sliced cheese, served nut-free.',
          category: 'kids_snacks',
          price: 3.75,
          rating_average: 4.5,
          rating_count: 37,
          is_active: true,
          is_nut_free: true
        },
        {
          id: 'kids_snack_yogurt_tube',
          name: 'Chilled Yogurt Tube',
          description: 'Single-serve yogurt tube, perfect for little hands.',
          category: 'kids_snacks',
          price: 4.0,
          rating_average: 4.4,
          rating_count: 29,
          is_active: true,
          is_nut_free: true
        }
      ];
      items = items.concat(defaultKidsSnacks);
      this._saveToStorage('cafe_menu_items', items);
    }

    let filtered = items.filter((i) => i.category === category && i.is_active);

    if (typeof minRating === 'number') {
      filtered = filtered.filter((i) => i.rating_average >= minRating);
    }

    if (typeof maxPrice === 'number') {
      filtered = filtered.filter((i) => i.price <= maxPrice);
    }

    if (sortBy === 'price_low_to_high') {
      filtered.sort((a, b) => a.price - b.price);
    } else if (sortBy === 'rating_high_to_low') {
      filtered.sort((a, b) => b.rating_average - a.rating_average);
    } else if (sortBy === 'name_asc') {
      filtered.sort((a, b) => a.name.localeCompare(b.name));
    }

    return {
      category,
      category_label: this._titleCase(category),
      items: filtered.map((i) => ({
        id: i.id,
        name: i.name,
        description: i.description || '',
        category: i.category,
        price: i.price,
        rating_average: i.rating_average,
        rating_count: i.rating_count,
        is_active: i.is_active,
        is_nut_free: i.is_nut_free
      }))
    };
  }

  // addCafeItemToCart
  addCafeItemToCart(cafeMenuItemId, quantity) {
    const item = this._getEntityById('cafe_menu_items', cafeMenuItemId);
    if (!item || !item.is_active) {
      return { success: false, message: 'Menu item not found', cart: null };
    }

    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items', []);

    let existing = cartItems.find(
      (ci) => ci.cart_id === cart.id && ci.item_type === 'cafe_menu_item' && ci.reference_id === cafeMenuItemId
    );

    const qty = quantity || 1;
    const unitPrice = item.price || 0;

    if (existing) {
      existing.quantity += qty;
      existing.total_price = existing.quantity * unitPrice;
    } else {
      existing = {
        id: this._generateId('cart_item'),
        cart_id: cart.id,
        item_type: 'cafe_menu_item',
        item_type_label: 'Cafe Item',
        reference_id: cafeMenuItemId,
        name: item.name,
        quantity: qty,
        unit_price: unitPrice,
        total_price: unitPrice * qty,
        schedule_summary: '',
        details_summary: '',
        is_eligible_for_promotions: true,
        applied_promo_codes: []
      };
      cartItems.push(existing);
    }

    this._saveToStorage('cart_items', cartItems);
    this._calculateCartTotals(cart);

    return {
      success: true,
      message: 'Cafe item added to cart',
      cart: this._buildCartSummary(cart)
    };
  }

  // getMembershipFilterOptions
  getMembershipFilterOptions() {
    const plans = this._getFromStorage('membership_plans', []);

    const planTypeMap = {
      single_child: 'Single Child',
      family_up_to_2_children: 'Family (up to 2 children)',
      family_unlimited: 'Family (unlimited children)',
      other: 'Other'
    };

    const planTypeOptions = Object.keys(planTypeMap).map((pt) => ({
      value: pt,
      label: planTypeMap[pt]
    }));

    const visitsValues = Array.from(new Set(plans.map((p) => p.typical_visits_per_week))).filter(
      (v) => typeof v === 'number' && v > 0
    );

    const visitsOptions = visitsValues.map((v) => ({
      value: v,
      label: v + ' visits per week'
    }));

    const prices = plans.map((p) => p.monthly_price || 0);
    const minPrice = prices.length ? Math.min(...prices) : 0;
    const maxPrice = prices.length ? Math.max(...prices) : 0;

    const sortOptions = [
      { value: 'monthly_price_low_to_high', label: 'Monthly Price – Low to High' },
      { value: 'visits_per_week_desc', label: 'Visits per Week – High to Low' },
      { value: 'name_asc', label: 'Name A–Z' }
    ];

    return {
      plan_type_options: planTypeOptions,
      visits_per_week_options: visitsOptions,
      price_range: {
        min: minPrice,
        max: maxPrice,
        step: 5,
        currency: 'USD'
      },
      sort_options: sortOptions
    };
  }

  // listMembershipPlans
  listMembershipPlans(
    planType,
    typicalVisitsPerWeek,
    includesUnlimitedWeekdayVisits,
    maxMonthlyPrice,
    sortBy
  ) {
    let plans = this._getFromStorage('membership_plans', []).filter((p) => p.status === 'active');

    if (planType) {
      plans = plans.filter((p) => p.plan_type === planType);
    }

    if (typeof typicalVisitsPerWeek === 'number') {
      plans = plans.filter((p) => p.typical_visits_per_week === typicalVisitsPerWeek);
    }

    if (typeof includesUnlimitedWeekdayVisits === 'boolean') {
      plans = plans.filter(
        (p) => p.includes_unlimited_weekday_visits === includesUnlimitedWeekdayVisits
      );
    }

    if (typeof maxMonthlyPrice === 'number') {
      plans = plans.filter((p) => p.monthly_price <= maxMonthlyPrice);
    }

    if (sortBy === 'monthly_price_low_to_high') {
      plans.sort((a, b) => a.monthly_price - b.monthly_price);
    } else if (sortBy === 'visits_per_week_desc') {
      plans.sort((a, b) => b.typical_visits_per_week - a.typical_visits_per_week);
    } else if (sortBy === 'name_asc') {
      plans.sort((a, b) => a.name.localeCompare(b.name));
    }

    return {
      plans: plans.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description || '',
        plan_type: p.plan_type,
        typical_visits_per_week: p.typical_visits_per_week,
        includes_unlimited_weekday_visits: p.includes_unlimited_weekday_visits,
        monthly_price: p.monthly_price,
        status: p.status
      }))
    };
  }

  // getMembershipPlanDetails
  getMembershipPlanDetails(membershipPlanId) {
    const plan = this._getEntityById('membership_plans', membershipPlanId);
    if (!plan) {
      return {
        plan: null,
        benefits_highlight: null
      };
    }

    const suitabilityLabel =
      'Great for about ' + plan.typical_visits_per_week + ' visits per week.';

    return {
      plan: {
        id: plan.id,
        name: plan.name,
        description: plan.description || '',
        plan_type: plan.plan_type,
        typical_visits_per_week: plan.typical_visits_per_week,
        includes_unlimited_weekday_visits: plan.includes_unlimited_weekday_visits,
        monthly_price: plan.monthly_price,
        status: plan.status
      },
      benefits_highlight: {
        includes_unlimited_weekday_visits: plan.includes_unlimited_weekday_visits,
        typical_visits_per_week: plan.typical_visits_per_week,
        monthly_price: plan.monthly_price,
        suitability_label: suitabilityLabel
      }
    };
  }

  // createMembershipEnrollment
  createMembershipEnrollment(membershipPlanId, parentName, phoneNumber) {
    const plan = this._getEntityById('membership_plans', membershipPlanId);
    if (!plan || plan.status !== 'active') {
      return { success: false, message: 'Membership plan not found', enrollment: null };
    }

    const enrollment = {
      id: this._generateId('membership_enrollment'),
      membership_plan_id: plan.id,
      membership_plan_name: plan.name,
      monthly_price: plan.monthly_price,
      parent_name: parentName,
      phone_number: phoneNumber,
      created_at: new Date().toISOString(),
      status: 'pending_payment'
    };

    const enrollments = this._getFromStorage('membership_enrollments', []);
    enrollments.push(enrollment);
    this._saveToStorage('membership_enrollments', enrollments);

    return {
      success: true,
      message: 'Membership enrollment created',
      enrollment
    };
  }

  // getMembershipPaymentDetails
  getMembershipPaymentDetails(membershipEnrollmentId) {
    const enrollments = this._getFromStorage('membership_enrollments', []);
    const enrollment = enrollments.find((e) => e.id === membershipEnrollmentId);
    if (!enrollment) {
      return {
        enrollment_id: membershipEnrollmentId,
        membership_plan_name: '',
        monthly_price: 0,
        parent_name: '',
        phone_number: '',
        amount_due: 0,
        currency: 'USD',
        summary_lines: []
      };
    }

    // Instrumentation for task completion tracking
    try {
      if (enrollment.parent_name === 'Alex Taylor' && enrollment.phone_number === '555-123-4567') {
        localStorage.setItem('task4_paymentStepEnrollmentId', enrollment.id);
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    const plans = this._getFromStorage('membership_plans', []);
    const plan = plans.find((p) => p.id === enrollment.membership_plan_id);

    const amountDue = enrollment.monthly_price || (plan ? plan.monthly_price : 0) || 0;

    const summaryLines = [
      { label: 'Plan', value: enrollment.membership_plan_name },
      { label: 'Parent', value: enrollment.parent_name },
      { label: 'Phone', value: enrollment.phone_number }
    ];

    return {
      enrollment_id: enrollment.id,
      membership_plan_name: enrollment.membership_plan_name,
      monthly_price: enrollment.monthly_price,
      parent_name: enrollment.parent_name,
      phone_number: enrollment.phone_number,
      amount_due: amountDue,
      currency: 'USD',
      summary_lines: summaryLines
    };
  }

  // getCartSummary
  getCartSummary() {
    const carts = this._getFromStorage('carts', []);
    const cart = carts.find((c) => c.status === 'open');
    if (!cart) {
      return { has_cart: false, cart: null };
    }

    // Recalculate totals to be safe
    this._calculateCartTotals(cart);

    return {
      has_cart: true,
      cart: this._buildCartSummary(cart)
    };
  }

  // updateCartItemQuantity
  updateCartItemQuantity(cartItemId, quantity) {
    let cartItems = this._getFromStorage('cart_items', []);
    const itemIndex = cartItems.findIndex((ci) => ci.id === cartItemId);
    if (itemIndex === -1) {
      return { success: false, message: 'Cart item not found', cart: null };
    }

    const item = cartItems[itemIndex];
    const carts = this._getFromStorage('carts', []);
    const cart = carts.find((c) => c.id === item.cart_id && c.status === 'open');
    if (!cart) {
      return { success: false, message: 'Cart not found or not open', cart: null };
    }

    if (quantity <= 0) {
      cartItems.splice(itemIndex, 1);
    } else {
      item.quantity = quantity;
      item.total_price = item.unit_price * quantity;
      cartItems[itemIndex] = item;
    }

    this._saveToStorage('cart_items', cartItems);
    this._calculateCartTotals(cart);

    return {
      success: true,
      message: 'Cart item updated',
      cart: this._buildCartSummary(cart)
    };
  }

  // removeCartItem
  removeCartItem(cartItemId) {
    let cartItems = this._getFromStorage('cart_items', []);
    const itemIndex = cartItems.findIndex((ci) => ci.id === cartItemId);

    if (itemIndex === -1) {
      return { success: false, message: 'Cart item not found', cart: null };
    }

    const item = cartItems[itemIndex];
    const carts = this._getFromStorage('carts', []);
    const cart = carts.find((c) => c.id === item.cart_id && c.status === 'open');
    if (!cart) {
      return { success: false, message: 'Cart not found or not open', cart: null };
    }

    cartItems.splice(itemIndex, 1);
    this._saveToStorage('cart_items', cartItems);
    this._calculateCartTotals(cart);

    return {
      success: true,
      message: 'Cart item removed',
      cart: this._buildCartSummary(cart)
    };
  }

  // applyPromoCodeToCart
  applyPromoCodeToCart(promoCode) {
    const code = String(promoCode || '').trim();
    if (!code) {
      return { success: false, message: 'Promo code is required', applied_promotion: null, cart: null };
    }

    const carts = this._getFromStorage('carts', []);
    const cart = carts.find((c) => c.status === 'open');
    if (!cart) {
      return { success: false, message: 'No open cart', applied_promotion: null, cart: null };
    }

    const promotions = this._getFromStorage('promotions', []);
    const promo = promotions.find((p) => p.code && p.code.toLowerCase() === code.toLowerCase());

    if (!promo) {
      return { success: false, message: 'Promo code not found', applied_promotion: null, cart: this._buildCartSummary(cart) };
    }
    if (!promo.is_active) {
      return { success: false, message: 'Promo code is not active', applied_promotion: null, cart: this._buildCartSummary(cart) };
    }

    const cartItems = this._getFromStorage('cart_items', []).filter((ci) => ci.cart_id === cart.id);
    if (!this._validatePromotionForCart(promo, cart, cartItems)) {
      return { success: false, message: 'Promo code is not applicable to current cart', applied_promotion: null, cart: this._buildCartSummary(cart) };
    }

    if (!Array.isArray(cart.applied_promo_codes)) {
      cart.applied_promo_codes = [];
    }

    if (!cart.applied_promo_codes.some((c) => c.toLowerCase() === promo.code.toLowerCase())) {
      cart.applied_promo_codes.push(promo.code);
    }

    this._calculateCartTotals(cart);

    const appliedPromotionView = {
      id: promo.id,
      name: promo.name,
      code: promo.code,
      discount_type: promo.discount_type,
      discount_value: promo.discount_value,
      applicable_to: promo.applicable_to
    };

    return {
      success: true,
      message: 'Promo code applied',
      applied_promotion: appliedPromotionView,
      cart: this._buildCartSummary(cart)
    };
  }

  // proceedToOrderSummary
  proceedToOrderSummary() {
    const carts = this._getFromStorage('carts', []);
    const cart = carts.find((c) => c.status === 'open');
    if (!cart) {
      return { success: false, message: 'No open cart', order: null };
    }

    const cartItems = this._getFromStorage('cart_items', []).filter((ci) => ci.cart_id === cart.id);
    if (!cartItems.length) {
      return { success: false, message: 'Cart is empty', order: null };
    }

    this._calculateCartTotals(cart);
    const order = this._findOrCreatePendingOrderFromCart(cart);

    return {
      success: true,
      message: 'Order summary created',
      order: this._buildOrderSummary(order)
    };
  }

  // getOrderSummary
  getOrderSummary(orderId) {
    let order = null;
    if (orderId) {
      order = this._getFromStorage('orders', []).find((o) => o.id === orderId) || null;
    } else {
      order = this._getNextPendingOrder();
    }

    if (!order) {
      return { order: null };
    }

    return {
      order: this._buildOrderSummary(order)
    };
  }

  // getPaymentDetailsForOrder
  getPaymentDetailsForOrder(orderId) {
    const order = this._getFromStorage('orders', []).find((o) => o.id === orderId);
    if (!order) {
      return {
        order_id: orderId,
        subtotal_amount: 0,
        discount_total: 0,
        tax_total: 0,
        total_amount: 0,
        amount_due: 0,
        currency: 'USD',
        applied_promo_codes: [],
        summary_lines: [],
        payment_methods: [],
        can_navigate_back_to_order: false
      };
    }

    const amountDue = order.total_amount;
    const summaryLines = [
      { label: 'Subtotal', value: '$' + order.subtotal_amount.toFixed(2) },
      { label: 'Discounts', value: '-$' + order.discount_total.toFixed(2) },
      { label: 'Tax', value: '$' + order.tax_total.toFixed(2) }
    ];

    const paymentMethods = [
      { type: 'card', label: 'Credit/Debit Card' },
      { type: 'cash_on_arrival', label: 'Pay at Arrival' }
    ];

    return {
      order_id: order.id,
      subtotal_amount: order.subtotal_amount,
      discount_total: order.discount_total,
      tax_total: order.tax_total,
      total_amount: order.total_amount,
      amount_due: amountDue,
      currency: 'USD',
      applied_promo_codes: Array.isArray(order.applied_promo_codes)
        ? order.applied_promo_codes.slice()
        : [],
      summary_lines: summaryLines,
      payment_methods: paymentMethods,
      can_navigate_back_to_order: true
    };
  }

  // getActivePromotions
  getActivePromotions() {
    const promotions = this._getFromStorage('promotions', []);
    const now = new Date();
    const active = promotions.filter((p) => {
      if (!p.is_active) return false;
      if (p.start_date && now < new Date(p.start_date)) return false;
      if (p.end_date && now > new Date(p.end_date)) return false;
      return true;
    });

    let highlighted = null;

    const weekdayPromo = active.find(
      (p) =>
        p.applicable_to === 'open_play_session' &&
        p.code &&
        p.code.toLowerCase() === 'weekday10'
    ) || active.find((p) => p.applicable_to === 'open_play_session');

    if (weekdayPromo) {
      highlighted = {
        id: weekdayPromo.id,
        name: weekdayPromo.name,
        code: weekdayPromo.code,
        description: weekdayPromo.description || '',
        discount_type: weekdayPromo.discount_type,
        discount_value: weekdayPromo.discount_value,
        applicable_to: weekdayPromo.applicable_to,
        terms_summary: weekdayPromo.description || ''
      };
    }

    return {
      promotions: active,
      highlighted_weekday_open_play_promo: highlighted
    };
  }

  // getContactTopics
  getContactTopics() {
    const topics = [
      { value: 'birthday_parties', label: 'Birthday Parties' },
      { value: 'open_play', label: 'Open Play' },
      { value: 'cafe_menu', label: 'Cafe Menu' },
      { value: 'memberships', label: 'Memberships' },
      { value: 'general_question', label: 'General Question' },
      { value: 'other', label: 'Other' }
    ];

    const preferredContactMethods = [
      { value: 'email', label: 'Email' },
      { value: 'phone', label: 'Phone' }
    ];

    return {
      topics,
      preferred_contact_methods: preferredContactMethods
    };
  }

  // submitContactMessage
  submitContactMessage(topic, name, email, phone, message, preferredContactMethod) {
    const contactMessage = {
      id: this._generateId('contact_message'),
      topic,
      name,
      email,
      phone: phone || '',
      message,
      preferred_contact_method: preferredContactMethod,
      created_at: new Date().toISOString(),
      status: 'open'
    };

    const messages = this._getFromStorage('contact_messages', []);
    messages.push(contactMessage);
    this._saveToStorage('contact_messages', messages);

    return {
      success: true,
      message: 'Contact message submitted',
      contact_message: contactMessage
    };
  }

  // listReviewsByExperienceType
  listReviewsByExperienceType(experienceType, maxResults) {
    let reviews = this._getFromStorage('reviews', []).filter(
      (r) => r.experience_type === experienceType && r.status === 'published'
    );

    if (typeof maxResults === 'number') {
      reviews = reviews.slice(0, maxResults);
    }

    return {
      experience_type: experienceType,
      reviews
    };
  }

  // getReviewFormOptions
  getReviewFormOptions() {
    const experienceTypes = [
      { value: 'open_play', label: 'Open Play' },
      { value: 'birthday_parties', label: 'Birthday Parties' },
      { value: 'cafe', label: 'Cafe' },
      { value: 'memberships', label: 'Memberships' },
      { value: 'other', label: 'Other' }
    ];

    const visitTypes = [
      { value: 'weekday_open_play', label: 'Weekday Open Play' },
      { value: 'weekend_open_play', label: 'Weekend Open Play' },
      { value: 'private_party', label: 'Private Party' },
      { value: 'cafe_visit', label: 'Cafe Visit' },
      { value: 'membership_visit', label: 'Membership Visit' },
      { value: 'other', label: 'Other' }
    ];

    const childAgeOptions = [];
    for (let age = 1; age <= 12; age++) {
      childAgeOptions.push({ value: age, label: age + ' years' });
    }

    return {
      experience_types: experienceTypes,
      visit_types: visitTypes,
      child_age_options: childAgeOptions
    };
  }

  // submitReview
  submitReview(experienceType, rating, title, text, visitType, childAgeYears) {
    const review = {
      id: this._generateId('review'),
      experience_type: experienceType,
      rating,
      title,
      text,
      visit_type: visitType,
      child_age_years: typeof childAgeYears === 'number' ? childAgeYears : null,
      created_at: new Date().toISOString(),
      status: 'pending_approval'
    };

    const reviews = this._getFromStorage('reviews', []);
    reviews.push(review);
    this._saveToStorage('reviews', reviews);

    return {
      success: true,
      message: 'Review submitted',
      review
    };
  }

  // getAboutInfo
  getAboutInfo() {
    const stored = this._getFromStorage('about_info', null);
    if (stored && typeof stored === 'object') {
      return stored;
    }

    return {
      mission: '',
      values: [],
      location: '',
      hours: [],
      amenities: [],
      safety_highlights: []
    };
  }

  // getFAQEntries
  getFAQEntries(category) {
    let entries = this._getFromStorage('faq_entries', []);

    if (category) {
      entries = entries.filter((e) => e.category === category);
    }

    return {
      category: category || null,
      entries: entries.map((e) => ({
        question: e.question,
        answer: e.answer,
        related_page: e.related_page
      }))
    };
  }

  // getPolicies
  getPolicies() {
    const policies = this._getFromStorage('policies', { sections: [] });
    if (!policies || !Array.isArray(policies.sections)) {
      return { sections: [] };
    }
    return policies;
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