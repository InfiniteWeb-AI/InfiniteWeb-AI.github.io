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

  // ---------- Initialization & basic storage helpers ----------

  _initStorage() {
    // Initialize all data tables in localStorage if they do not exist
    const keys = [
      'party_packages',
      'party_package_durations',
      'entertainers',
      'entertainer_rates',
      'add_ons',
      'custom_parties',
      'bookings',
      'carts',
      'cart_items',
      'gift_card_templates',
      'gift_card_purchases',
      'promo_codes',
      'faq_items',
      'reviews',
      'inquiries',
      'orders',
      'order_items'
    ];

    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, fallback) {
    const data = localStorage.getItem(key);
    if (!data) {
      return typeof fallback === 'undefined' ? [] : fallback;
    }
    try {
      return JSON.parse(data);
    } catch (e) {
      return typeof fallback === 'undefined' ? [] : fallback;
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

  _now() {
    return new Date().toISOString();
  }

  _normalizeTheme(theme) {
    if (!theme) return '';
    return String(theme)
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
  }

  _getEntityById(storageKey, id) {
    if (!id) return null;
    const list = this._getFromStorage(storageKey);
    return list.find(function (item) { return item.id === id; }) || null;
  }

  _updateEntityInStorage(storageKey, entity) {
    const list = this._getFromStorage(storageKey);
    const idx = list.findIndex(function (item) { return item.id === entity.id; });
    if (idx === -1) {
      list.push(entity);
    } else {
      list[idx] = entity;
    }
    this._saveToStorage(storageKey, list);
  }

  // ---------- Cart helpers ----------

  _getOrCreateCart() {
    let carts = this._getFromStorage('carts');
    let currentCartId = localStorage.getItem('current_cart_id');
    let cart = null;

    if (currentCartId) {
      cart = carts.find(function (c) { return c.id === currentCartId; }) || null;
    }

    if (!cart) {
      cart = {
        id: this._generateId('cart'),
        items: [],
        subtotal: 0,
        discount_total: 0,
        total: 0,
        promo_code: null,
        created_at: this._now(),
        updated_at: this._now()
      };
      carts.push(cart);
      this._saveToStorage('carts', carts);
      localStorage.setItem('current_cart_id', cart.id);
    }

    return cart;
  }

  _updateCartInStorage(cart) {
    let carts = this._getFromStorage('carts');
    const idx = carts.findIndex(function (c) { return c.id === cart.id; });
    if (idx === -1) {
      carts.push(cart);
    } else {
      carts[idx] = cart;
    }
    this._saveToStorage('carts', carts);
  }

  _calculateCartTotals(cart) {
    const cartItems = this._getFromStorage('cart_items');
    const itemsForCart = cartItems.filter(function (ci) { return ci.cart_id === cart.id; });

    let subtotal = 0;
    for (let i = 0; i < itemsForCart.length; i++) {
      subtotal += Number(itemsForCart[i].total_price || 0);
    }

    cart.subtotal = Number(subtotal.toFixed(2));
    cart.discount_total = 0;
    cart.total = cart.subtotal;

    let appliedPromo = null;

    if (cart.promo_code) {
      const validation = this._validatePromoCodeForCart(cart.promo_code, cart, itemsForCart);
      if (validation.valid && validation.promo) {
        appliedPromo = validation.promo;
        cart.discount_total = Number(validation.discount.toFixed(2));
        cart.total = Number((cart.subtotal - cart.discount_total).toFixed(2));
      } else {
        cart.promo_code = null;
      }
    }

    cart.updated_at = this._now();
    this._updateCartInStorage(cart);

    return { cart: cart, items: itemsForCart, promo: appliedPromo };
  }

  _validatePromoCodeForCart(promoCode, cart, cartItems) {
    const promoList = this._getFromStorage('promo_codes');
    if (!promoCode) {
      return { valid: false, promo: null, discount: 0, message: 'No promo code provided' };
    }

    const codeLower = String(promoCode).trim().toLowerCase();
    let promo = null;
    for (let i = 0; i < promoList.length; i++) {
      if (String(promoList[i].code || '').toLowerCase() === codeLower) {
        promo = promoList[i];
        break;
      }
    }

    if (!promo || promo.is_active === false) {
      return { valid: false, promo: null, discount: 0, message: 'Invalid promo code' };
    }

    const now = new Date();
    if (promo.valid_from) {
      const from = new Date(promo.valid_from);
      if (now < from) {
        return { valid: false, promo: promo, discount: 0, message: 'Promo code not yet valid' };
      }
    }
    if (promo.valid_to) {
      const to = new Date(promo.valid_to);
      if (now > to) {
        return { valid: false, promo: promo, discount: 0, message: 'Promo code expired' };
      }
    }

    if (typeof promo.max_uses === 'number' && typeof promo.current_uses === 'number') {
      if (promo.current_uses >= promo.max_uses) {
        return { valid: false, promo: promo, discount: 0, message: 'Promo code usage limit reached' };
      }
    }

    const subtotal = cart.subtotal || 0;
    if (typeof promo.min_order_total === 'number' && subtotal < promo.min_order_total) {
      return { valid: false, promo: promo, discount: 0, message: 'Order total below minimum for promo' };
    }

    // Applicability checks based on applies_to
    const bookings = this._getFromStorage('bookings');
    const bookingIds = cartItems
      .filter(function (item) { return item.item_type === 'party_booking'; })
      .map(function (item) { return item.booking_id; });

    const bookingMap = {};
    for (let i = 0; i < bookings.length; i++) {
      bookingMap[bookings[i].id] = bookings[i];
    }

    const bookingList = [];
    for (let j = 0; j < bookingIds.length; j++) {
      const b = bookingMap[bookingIds[j]];
      if (b) bookingList.push(b);
    }

    let anyWeekday = false;
    let anyWeekend = false;
    for (let k = 0; k < bookingList.length; k++) {
      const b = bookingList[k];
      if (!b.start_datetime) continue;
      const d = new Date(b.start_datetime);
      const day = d.getDay();
      if (day === 0 || day === 6) {
        anyWeekend = true;
      } else {
        anyWeekday = true;
      }
    }

    const hasGiftCard = cartItems.some(function (item) { return item.item_type === 'gift_card'; });
    const hasPartyBooking = bookingList.length > 0;

    if (promo.applies_to === 'weekday_bookings' && !anyWeekday) {
      return { valid: false, promo: promo, discount: 0, message: 'Promo applies only to weekday bookings' };
    }
    if (promo.applies_to === 'weekend_bookings' && !anyWeekend) {
      return { valid: false, promo: promo, discount: 0, message: 'Promo applies only to weekend bookings' };
    }
    if (promo.applies_to === 'gift_cards_only') {
      if (!hasGiftCard || hasPartyBooking) {
        return { valid: false, promo: promo, discount: 0, message: 'Promo applies only to gift cards' };
      }
    }

    let discount = 0;
    if (promo.discount_type === 'percent') {
      discount = subtotal * (promo.discount_value / 100);
    } else if (promo.discount_type === 'fixed_amount') {
      discount = promo.discount_value;
    }

    if (discount > subtotal) {
      discount = subtotal;
    }

    return { valid: true, promo: promo, discount: discount, message: 'Promo code applied' };
  }

  _buildOrderFromCart(cart, buyerDetails) {
    const cartItems = this._getFromStorage('cart_items').filter(function (ci) { return ci.cart_id === cart.id; });

    const orders = this._getFromStorage('orders');
    const orderItems = this._getFromStorage('order_items');

    const order = {
      id: this._generateId('order'),
      cart_id: cart.id,
      status: 'draft',
      subtotal: cart.subtotal || 0,
      discount_total: cart.discount_total || 0,
      tax_total: cart.tax_total || 0,
      total: cart.total || 0,
      promo_code: cart.promo_code || null,
      buyer_name: buyerDetails.buyerName,
      buyer_email: buyerDetails.buyerEmail,
      buyer_phone: buyerDetails.buyerPhone || null,
      billing_address: buyerDetails.billingAddress || null,
      payment_method: buyerDetails.paymentMethod || null,
      created_at: this._now(),
      updated_at: this._now()
    };

    orders.push(order);

    for (let i = 0; i < cartItems.length; i++) {
      const ci = cartItems[i];
      const oi = {
        id: this._generateId('order_item'),
        order_id: order.id,
        item_type: ci.item_type,
        booking_id: ci.item_type === 'party_booking' ? ci.booking_id : null,
        gift_card_purchase_id: ci.item_type === 'gift_card' ? ci.gift_card_purchase_id : null,
        quantity: ci.quantity,
        unit_price: ci.unit_price,
        total_price: ci.total_price,
        description: ci.display_name
      };
      orderItems.push(oi);
    }

    this._saveToStorage('orders', orders);
    this._saveToStorage('order_items', orderItems);

    return { order: order, order_items: orderItems.filter(function (oi) { return oi.order_id === order.id; }) };
  }

  // Ensure bookings have consistent derived fields
  _upsertBooking(bookingPartial) {
    const bookings = this._getFromStorage('bookings');
    let existing = null;
    let idx = -1;
    if (bookingPartial.id) {
      idx = bookings.findIndex(function (b) { return b.id === bookingPartial.id; });
      if (idx !== -1) {
        existing = bookings[idx];
      }
    }

    const merged = existing ? Object.assign({}, existing, bookingPartial) : Object.assign({}, bookingPartial);

    // Derive duration and pricing
    let basePrice = merged.base_price || 0;
    let durationMinutes = merged.duration_minutes || 0;
    let travelFee = merged.travel_fee || 0;

    if (merged.source_type === 'party_package' && merged.selected_package_duration_id) {
      const duration = this._getEntityById('party_package_durations', merged.selected_package_duration_id);
      if (duration) {
        durationMinutes = durationMinutes || duration.duration_minutes;
        basePrice = duration.price;
      }
    } else if (merged.source_type === 'entertainer' && merged.selected_entertainer_rate_id) {
      const rate = this._getEntityById('entertainer_rates', merged.selected_entertainer_rate_id);
      if (rate) {
        durationMinutes = durationMinutes || rate.duration_minutes;
        basePrice = rate.price;
      }
      const entertainer = this._getEntityById('entertainers', merged.source_id);
      if (entertainer) {
        if (entertainer.has_travel_fee && entertainer.travel_fee_type && entertainer.travel_fee_type !== 'none') {
          if (entertainer.travel_fee_type === 'flat_fee') {
            travelFee = entertainer.travel_fee_amount || 0;
          } else {
            travelFee = merged.travel_fee || 0;
          }
        } else {
          travelFee = 0;
        }
      }
    } else if (merged.source_type === 'custom_party') {
      const custom = this._getEntityById('custom_parties', merged.source_id);
      if (custom) {
        basePrice = custom.total_price || 0;
      }
    }

    merged.base_price = basePrice || 0;
    merged.duration_minutes = durationMinutes || 0;
    merged.travel_fee = travelFee || 0;
    merged.total_price = Number((merged.base_price + (merged.travel_fee || 0)).toFixed(2));
    merged.updated_at = this._now();
    if (!merged.created_at) {
      merged.created_at = this._now();
    }

    if (idx === -1) {
      if (!merged.id) {
        merged.id = this._generateId('booking');
      }
      bookings.push(merged);
    } else {
      bookings[idx] = merged;
    }

    this._saveToStorage('bookings', bookings);
    return merged;
  }

  // ---------- Filter helpers ----------

  _filterPackagesByDurationAndPrice(packages, filters) {
    const durations = this._getFromStorage('party_package_durations');
    const allowedIds = {};

    const durationMinutes = filters && typeof filters.durationMinutes === 'number' ? filters.durationMinutes : null;
    const minPrice = filters && typeof filters.minPrice === 'number' ? filters.minPrice : null;
    const maxPrice = filters && typeof filters.maxPrice === 'number' ? filters.maxPrice : null;

    for (let i = 0; i < packages.length; i++) {
      const pkg = packages[i];
      const opts = durations.filter(function (d) { return d.package_id === pkg.id; });
      let matches = false;
      for (let j = 0; j < opts.length; j++) {
        const opt = opts[j];
        if (durationMinutes && opt.duration_minutes !== durationMinutes) continue;
        if (minPrice !== null && opt.price < minPrice) continue;
        if (maxPrice !== null && opt.price > maxPrice) continue;
        matches = true;
        break;
      }
      if (matches) {
        allowedIds[pkg.id] = true;
      }
    }

    return packages.filter(function (pkg) { return !!allowedIds[pkg.id]; });
  }

  _filterEntertainersByDurationLocationAndPrice(entertainers, filters) {
    const rates = this._getFromStorage('entertainer_rates');

    const durationMinutes = filters && typeof filters.durationMinutes === 'number' ? filters.durationMinutes : null;
    const minPrice = filters && typeof filters.minPrice === 'number' ? filters.minPrice : null;
    const maxPrice = filters && typeof filters.maxPrice === 'number' ? filters.maxPrice : null;
    const locationZip = filters && filters.locationZip ? String(filters.locationZip) : null;
    const noTravelFeeOnly = !!(filters && filters.noTravelFeeOnly);

    const filtered = [];

    for (let i = 0; i < entertainers.length; i++) {
      const ent = entertainers[i];

      if (locationZip) {
        const zips = Array.isArray(ent.service_zip_codes) ? ent.service_zip_codes : [];
        if (!zips.includes(locationZip)) {
          continue;
        }
      }

      if (noTravelFeeOnly) {
        if (ent.has_travel_fee && ent.travel_fee_type && ent.travel_fee_type !== 'none') {
          continue;
        }
      }

      const entRates = rates.filter(function (r) { return r.entertainer_id === ent.id; });
      let matchesRate = false;
      for (let j = 0; j < entRates.length; j++) {
        const r = entRates[j];
        if (durationMinutes && r.duration_minutes !== durationMinutes) continue;
        if (minPrice !== null && r.price < minPrice) continue;
        if (maxPrice !== null && r.price > maxPrice) continue;
        matchesRate = true;
        break;
      }

      if (matchesRate) {
        filtered.push(ent);
      }
    }

    return filtered;
  }

  // Attach foreign key objects for cart items
  _attachCartItemRelations(items) {
    const bookings = this._getFromStorage('bookings');
    const giftPurchases = this._getFromStorage('gift_card_purchases');
    const templates = this._getFromStorage('gift_card_templates');

    return items.map(function (ci) {
      let booking = null;
      let giftPurchase = null;
      let template = null;

      if (ci.booking_id) {
        booking = bookings.find(function (b) { return b.id === ci.booking_id; }) || null;
      }
      if (ci.gift_card_purchase_id) {
        giftPurchase = giftPurchases.find(function (g) { return g.id === ci.gift_card_purchase_id; }) || null;
        if (giftPurchase && giftPurchase.template_id) {
          template = templates.find(function (t) { return t.id === giftPurchase.template_id; }) || null;
          if (template) {
            giftPurchase = Object.assign({}, giftPurchase, { template: template });
          }
        }
      }

      const cloned = Object.assign({}, ci);
      if (ci.booking_id) cloned.booking = booking;
      if (ci.gift_card_purchase_id) cloned.gift_card_purchase = giftPurchase;
      return cloned;
    });
  }

  _attachOrderItemRelations(items) {
    const bookings = this._getFromStorage('bookings');
    const giftPurchases = this._getFromStorage('gift_card_purchases');
    const templates = this._getFromStorage('gift_card_templates');

    return items.map(function (oi) {
      let booking = null;
      let giftPurchase = null;
      let template = null;

      if (oi.booking_id) {
        booking = bookings.find(function (b) { return b.id === oi.booking_id; }) || null;
      }
      if (oi.gift_card_purchase_id) {
        giftPurchase = giftPurchases.find(function (g) { return g.id === oi.gift_card_purchase_id; }) || null;
        if (giftPurchase && giftPurchase.template_id) {
          template = templates.find(function (t) { return t.id === giftPurchase.template_id; }) || null;
          if (template) {
            giftPurchase = Object.assign({}, giftPurchase, { template: template });
          }
        }
      }

      const cloned = Object.assign({}, oi);
      if (oi.booking_id) cloned.booking = booking;
      if (oi.gift_card_purchase_id) cloned.gift_card_purchase = giftPurchase;
      return cloned;
    });
  }

  // ---------- Core interface implementations ----------

  // 1. getHomePageContent
  getHomePageContent() {
    const packages = this._getFromStorage('party_packages');
    const entertainers = this._getFromStorage('entertainers');

    const activePackages = packages.filter(function (p) { return p.is_active !== false; });
    const activeEntertainers = entertainers.filter(function (e) { return e.is_active !== false; });

    const featuredPackages = activePackages
      .slice()
      .sort(function (a, b) {
        const ra = a.rating || 0;
        const rb = b.rating || 0;
        if (rb !== ra) return rb - ra;
        const ca = a.review_count || 0;
        const cb = b.review_count || 0;
        return cb - ca;
      })
      .slice(0, 3);

    const featuredEntertainers = activeEntertainers
      .slice()
      .sort(function (a, b) {
        const ra = a.rating || 0;
        const rb = b.rating || 0;
        if (rb !== ra) return rb - ra;
        const ca = a.review_count || 0;
        const cb = b.review_count || 0;
        return cb - ca;
      })
      .slice(0, 3);

    const themeMap = {};
    for (let i = 0; i < activePackages.length; i++) {
      const pkg = activePackages[i];
      const theme = pkg.theme || 'other';
      if (!themeMap[theme]) {
        themeMap[theme] = pkg;
      }
    }

    const topThemes = Object.keys(themeMap).slice(0, 5).map(function (theme) {
      const pkg = themeMap[theme];
      return {
        theme: theme,
        label: theme,
        image_url: pkg.image_url || null,
        description: pkg.description || ''
      };
    });

    const customPartyHighlight = this._getFromStorage('custom_party_highlight', null) || null;

    return {
      featured_party_packages: featuredPackages,
      featured_entertainers: featuredEntertainers,
      top_themes: topThemes,
      custom_party_highlight: customPartyHighlight
    };
  }

  // 2. getPartyPackageFilterOptions
  getPartyPackageFilterOptions() {
    const packages = this._getFromStorage('party_packages');
    const durations = this._getFromStorage('party_package_durations');

    const ageRanges = [];
    for (let i = 0; i < packages.length; i++) {
      const p = packages[i];
      if (typeof p.min_age === 'number' && typeof p.max_age === 'number') {
        ageRanges.push({ min_age: p.min_age, max_age: p.max_age });
      }
    }

    const themesSet = {};
    const themeOptions = [];
    for (let j = 0; j < packages.length; j++) {
      const theme = packages[j].theme;
      if (!theme) continue;
      const key = this._normalizeTheme(theme);
      if (!themesSet[key]) {
        themesSet[key] = true;
        themeOptions.push({ value: key, label: theme });
      }
    }

    const durationMap = {};
    for (let k = 0; k < durations.length; k++) {
      const d = durations[k];
      if (!durationMap[d.duration_minutes]) {
        durationMap[d.duration_minutes] = d.label || (d.duration_minutes + ' minutes');
      }
    }
    const durationOptions = Object.keys(durationMap).map(function (minutesStr) {
      const m = parseInt(minutesStr, 10);
      return { duration_minutes: m, label: durationMap[m] };
    }).sort(function (a, b) { return a.duration_minutes - b.duration_minutes; });

    const prices = durations.map(function (d) { return d.price; }).filter(function (n) { return typeof n === 'number'; });
    let priceRanges = [];
    if (prices.length > 0) {
      const min = Math.min.apply(null, prices);
      const max = Math.max.apply(null, prices);
      const step = Math.max(50, Math.round((max - min) / 3) || 50);
      let start = Math.floor(min / step) * step;
      while (start < max) {
        const end = start + step;
        priceRanges.push({ min_price: start, max_price: end, label: '$' + start + ' - $' + end });
        start = end;
      }
    }

    const capacityOptions = [];
    for (let x = 0; x < packages.length; x++) {
      const p = packages[x];
      capacityOptions.push({
        min_children: p.base_capacity || 0,
        max_children: p.max_capacity || p.base_capacity || 0,
        label: (p.base_capacity || 0) + '-' + (p.max_capacity || p.base_capacity || 0) + ' kids'
      });
    }

    return {
      age_ranges: ageRanges,
      themes: themeOptions,
      durations: durationOptions,
      price_ranges: priceRanges,
      capacity_options: capacityOptions
    };
  }

  // 3. listPartyPackages
  listPartyPackages(filters, sort, pagination) {
    filters = filters || {};
    sort = sort || 'price_asc';
    pagination = pagination || {};
    const page = pagination.page || 1;
    const pageSize = pagination.pageSize || 20;

    let items = this._getFromStorage('party_packages').filter(function (p) { return p.is_active !== false; });

    if (typeof filters.minAge === 'number') {
      const minAge = filters.minAge;
      items = items.filter(function (p) {
        return typeof p.max_age === 'number' ? p.max_age >= minAge : true;
      });
    }
    if (typeof filters.maxAge === 'number') {
      const maxAge = filters.maxAge;
      items = items.filter(function (p) {
        return typeof p.min_age === 'number' ? p.min_age <= maxAge : true;
      });
    }

    if (filters.theme) {
      const self = this;
      const themeValue = self._normalizeTheme(String(filters.theme));
      items = items.filter(function (p) {
        return self._normalizeTheme(p.theme) === themeValue;
      });
    }

    if (typeof filters.minCapacity === 'number') {
      const minCap = filters.minCapacity;
      items = items.filter(function (p) {
        const cap = p.max_capacity || p.base_capacity || 0;
        return cap >= minCap;
      });
    }
    if (typeof filters.maxCapacity === 'number') {
      const maxCap = filters.maxCapacity;
      items = items.filter(function (p) {
        const cap = p.max_capacity || p.base_capacity || 0;
        return cap <= maxCap;
      });
    }

    if (filters.onlyCustomBaseAvailable) {
      items = items.filter(function (p) { return !!p.is_custom_base_available; });
    }

    if (typeof filters.durationMinutes === 'number' || typeof filters.minPrice === 'number' || typeof filters.maxPrice === 'number') {
      items = this._filterPackagesByDurationAndPrice(items, filters);
    }

    items = items.filter(function (p) {
      if (typeof filters.minPrice === 'number' && typeof p.price_from === 'number' && p.price_from < filters.minPrice) return false;
      if (typeof filters.maxPrice === 'number' && typeof p.price_from === 'number' && p.price_from > filters.maxPrice) return false;
      return true;
    });

    items = items.slice();
    if (sort === 'price_asc') {
      items.sort(function (a, b) { return (a.price_from || 0) - (b.price_from || 0); });
    } else if (sort === 'price_desc') {
      items.sort(function (a, b) { return (b.price_from || 0) - (a.price_from || 0); });
    } else if (sort === 'rating_desc') {
      items.sort(function (a, b) {
        const ra = a.rating || 0;
        const rb = b.rating || 0;
        if (rb !== ra) return rb - ra;
        return (b.review_count || 0) - (a.review_count || 0);
      });
    } else if (sort === 'popularity_desc') {
      items.sort(function (a, b) { return (b.review_count || 0) - (a.review_count || 0); });
    }

    const totalItems = items.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const start = (page - 1) * pageSize;
    const pagedItems = items.slice(start, start + pageSize);

    return {
      items: pagedItems,
      page: page,
      pageSize: pageSize,
      totalItems: totalItems,
      totalPages: totalPages
    };
  }

  // 4. getPartyPackageDetails
  getPartyPackageDetails(packageId) {
    const pkg = this._getEntityById('party_packages', packageId);
    if (!pkg) {
      return { package: null, duration_options: [], rating: null, review_count: 0, review_snippet: '' };
    }

    const durations = this._getFromStorage('party_package_durations').filter(function (d) { return d.package_id === packageId; });
    const rating = pkg.rating || null;
    const reviewCount = pkg.review_count || 0;
    let reviewSnippet = '';
    const reviews = this._getFromStorage('reviews').filter(function (r) {
      return r.subject_type === 'party_package' && r.subject_id === packageId;
    });
    if (reviews.length > 0 && reviews[0].body) {
      reviewSnippet = reviews[0].body;
    }

    return {
      package: pkg,
      duration_options: durations,
      rating: rating,
      review_count: reviewCount,
      review_snippet: reviewSnippet
    };
  }

  // 5. getPartyPackageReviews
  getPartyPackageReviews(packageId, page, pageSize) {
    page = page || 1;
    pageSize = pageSize || 10;

    const all = this._getFromStorage('reviews').filter(function (r) {
      return r.subject_type === 'party_package' && r.subject_id === packageId;
    });

    const totalItems = all.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const start = (page - 1) * pageSize;
    const reviews = all.slice(start, start + pageSize);

    return {
      reviews: reviews,
      page: page,
      pageSize: pageSize,
      totalItems: totalItems,
      totalPages: totalPages
    };
  }

  // 6. getEntertainerFilterOptions
  getEntertainerFilterOptions() {
    const entertainers = this._getFromStorage('entertainers');
    const rates = this._getFromStorage('entertainer_rates');

    const typeMap = {};
    const types = [];
    for (let i = 0; i < entertainers.length; i++) {
      const t = entertainers[i].type;
      if (!t) continue;
      if (!typeMap[t]) {
        typeMap[t] = true;
        types.push({ value: t, label: t });
      }
    }

    const durationMap = {};
    for (let j = 0; j < rates.length; j++) {
      const r = rates[j];
      if (!durationMap[r.duration_minutes]) {
        durationMap[r.duration_minutes] = r.label || (r.duration_minutes + ' minutes');
      }
    }
    const durations = Object.keys(durationMap).map(function (minutesStr) {
      const m = parseInt(minutesStr, 10);
      return { duration_minutes: m, label: durationMap[m] };
    }).sort(function (a, b) { return a.duration_minutes - b.duration_minutes; });

    const priceValues = rates.map(function (r) { return r.price; }).filter(function (n) { return typeof n === 'number'; });
    let priceRanges = [];
    if (priceValues.length > 0) {
      const min = Math.min.apply(null, priceValues);
      const max = Math.max.apply(null, priceValues);
      const step = Math.max(50, Math.round((max - min) / 3) || 50);
      let start = Math.floor(min / step) * step;
      while (start < max) {
        const end = start + step;
        priceRanges.push({ min_price: start, max_price: end, label: '$' + start + ' - $' + end });
        start = end;
      }
    }

    const ratingOptions = [
      { min_rating: 3, label: '3.0+' },
      { min_rating: 4, label: '4.0+' },
      { min_rating: 4.5, label: '4.5+' },
      { min_rating: 4.8, label: '4.8+' }
    ];

    const travelFeeFilters = [
      { value: 'all', label: 'All' },
      { value: 'no_travel_fee', label: 'No travel fee' }
    ];

    return {
      types: types,
      durations: durations,
      price_ranges: priceRanges,
      rating_options: ratingOptions,
      travel_fee_filters: travelFeeFilters
    };
  }

  // 7. listEntertainers
  listEntertainers(filters, sort, pagination) {
    filters = filters || {};
    sort = sort || 'price_asc';
    pagination = pagination || {};
    const page = pagination.page || 1;
    const pageSize = pagination.pageSize || 20;

    let items = this._getFromStorage('entertainers').filter(function (e) { return e.is_active !== false; });

    if (Array.isArray(filters.types) && filters.types.length > 0) {
      const typeSet = {};
      for (let i = 0; i < filters.types.length; i++) {
        typeSet[filters.types[i]] = true;
      }
      items = items.filter(function (e) { return !!typeSet[e.type]; });
    }

    if (typeof filters.minRating === 'number') {
      const minRating = filters.minRating;
      items = items.filter(function (e) { return (e.rating || 0) >= minRating; });
    }

    items = this._filterEntertainersByDurationLocationAndPrice(items, filters);

    const rates = this._getFromStorage('entertainer_rates');

    items = items.slice();
    if (sort === 'price_asc' || sort === 'price_desc') {
      items.sort(function (a, b) {
        const ratesA = rates.filter(function (r) { return r.entertainer_id === a.id; });
        const ratesB = rates.filter(function (r) { return r.entertainer_id === b.id; });
        const minA = ratesA.length ? Math.min.apply(null, ratesA.map(function (r) { return r.price; })) : (a.starting_price || 0);
        const minB = ratesB.length ? Math.min.apply(null, ratesB.map(function (r) { return r.price; })) : (b.starting_price || 0);
        return sort === 'price_asc' ? (minA - minB) : (minB - minA);
      });
    } else if (sort === 'rating_desc') {
      items.sort(function (a, b) {
        const ra = a.rating || 0;
        const rb = b.rating || 0;
        if (rb !== ra) return rb - ra;
        return (b.review_count || 0) - (a.review_count || 0);
      });
    }

    const totalItems = items.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const start = (page - 1) * pageSize;
    const pagedItems = items.slice(start, start + pageSize);

    // Instrumentation for task completion tracking
    try {
      const types = Array.isArray(filters.types) ? filters.types : [];
      const hasMagician = types.indexOf('Magician') !== -1;
      const hasClown = types.indexOf('Clown') !== -1;
      if (
        hasMagician &&
        hasClown &&
        filters.durationMinutes === 60 &&
        typeof filters.maxPrice === 'number' &&
        filters.maxPrice <= 220
      ) {
        localStorage.setItem('task2_entertainerFilterParams', JSON.stringify({ filters: filters, sort: sort }));
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      items: pagedItems,
      page: page,
      pageSize: pageSize,
      totalItems: totalItems,
      totalPages: totalPages
    };
  }

  // 8. getEntertainerDetails
  getEntertainerDetails(entertainerId) {
    const ent = this._getEntityById('entertainers', entertainerId);
    if (!ent) {
      return { entertainer: null, rates: [], rating: null, review_count: 0, review_snippet: '' };
    }

    const rates = this._getFromStorage('entertainer_rates').filter(function (r) { return r.entertainer_id === ent.id; });

    const rating = ent.rating || null;
    const reviewCount = ent.review_count || 0;
    let reviewSnippet = '';
    const reviews = this._getFromStorage('reviews').filter(function (r) {
      return r.subject_type === 'entertainer' && r.subject_id === entertainerId;
    });
    if (reviews.length > 0 && reviews[0].body) {
      reviewSnippet = reviews[0].body;
    }

    // Instrumentation for task completion tracking
    try {
      if (ent && (ent.type === 'Magician' || ent.type === 'Clown')) {
        const hasQualifyingRate = Array.isArray(rates) && rates.some(function (r) {
          return r.duration_minutes === 60 && typeof r.price === 'number' && r.price <= 220;
        });
        if (hasQualifyingRate) {
          let existing = [];
          const raw = localStorage.getItem('task2_comparedEntertainerIds');
          if (raw) {
            try {
              const parsed = JSON.parse(raw);
              if (Array.isArray(parsed)) {
                existing = parsed;
              }
            } catch (e2) {
              // Ignore JSON parse errors, fall back to empty array
            }
          }
          if (existing.indexOf(entertainerId) === -1) {
            existing.push(entertainerId);
            localStorage.setItem('task2_comparedEntertainerIds', JSON.stringify(existing));
          }
        }
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      entertainer: ent,
      rates: rates,
      rating: rating,
      review_count: reviewCount,
      review_snippet: reviewSnippet
    };
  }

  // 9. getEntertainerReviews
  getEntertainerReviews(entertainerId, page, pageSize) {
    page = page || 1;
    pageSize = pageSize || 10;

    const all = this._getFromStorage('reviews').filter(function (r) {
      return r.subject_type === 'entertainer' && r.subject_id === entertainerId;
    });

    const totalItems = all.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const start = (page - 1) * pageSize;
    const reviews = all.slice(start, start + pageSize);

    return {
      reviews: reviews,
      page: page,
      pageSize: pageSize,
      totalItems: totalItems,
      totalPages: totalPages
    };
  }

  // 10. sendEntertainerInquiry
  sendEntertainerInquiry(entertainerId, name, email, message) {
    const inquiries = this._getFromStorage('inquiries');
    const inquiry = {
      id: this._generateId('inquiry'),
      type: 'entertainer_inquiry',
      related_entertainer_id: entertainerId,
      subject: null,
      name: name,
      email: email,
      message: message,
      created_at: this._now()
    };
    inquiries.push(inquiry);
    this._saveToStorage('inquiries', inquiries);
    return { success: true, inquiry: inquiry, message: 'Inquiry sent' };
  }

  // 11. getCustomPartyBaseOptions
  getCustomPartyBaseOptions(filters) {
    filters = filters || {};
    let basePackages = this._getFromStorage('party_packages').filter(function (p) {
      return p.is_active !== false && p.is_custom_base_available;
    });

    if (typeof filters.minAge === 'number') {
      const minAge = filters.minAge;
      basePackages = basePackages.filter(function (p) { return (p.max_age || 0) >= minAge; });
    }
    if (typeof filters.maxAge === 'number') {
      const maxAge = filters.maxAge;
      basePackages = basePackages.filter(function (p) { return (p.min_age || 0) <= maxAge; });
    }

    return { base_packages: basePackages };
  }

  // 12. getAddOnFilterOptions
  getAddOnFilterOptions() {
    const addOns = this._getFromStorage('add_ons');

    const ratingOptions = [
      { min_rating: 3, label: '3.0+' },
      { min_rating: 4, label: '4.0+' },
      { min_rating: 4.5, label: '4.5+' }
    ];

    const prices = addOns.map(function (a) { return a.price; }).filter(function (n) { return typeof n === 'number'; });
    let priceRanges = [];
    if (prices.length > 0) {
      const min = Math.min.apply(null, prices);
      const max = Math.max.apply(null, prices);
      const step = Math.max(20, Math.round((max - min) / 3) || 20);
      let start = Math.floor(min / step) * step;
      while (start < max) {
        const end = start + step;
        priceRanges.push({ min_price: start, max_price: end, label: '$' + start + ' - $' + end });
        start = end;
      }
    }

    const catMap = {};
    const categories = [];
    for (let i = 0; i < addOns.length; i++) {
      const c = addOns[i].category;
      if (!c) continue;
      if (!catMap[c]) {
        catMap[c] = true;
        categories.push({ value: c, label: c });
      }
    }

    return {
      rating_options: ratingOptions,
      price_ranges: priceRanges,
      categories: categories
    };
  }

  // 13. listAddOns
  listAddOns(filters, pagination) {
    filters = filters || {};
    pagination = pagination || {};
    const page = pagination.page || 1;
    const pageSize = pagination.pageSize || 20;

    let items = this._getFromStorage('add_ons').filter(function (a) { return a.is_active !== false; });

    if (typeof filters.minRating === 'number') {
      const minRating = filters.minRating;
      items = items.filter(function (a) { return (a.rating || 0) >= minRating; });
    }
    if (typeof filters.maxPrice === 'number') {
      const maxPrice = filters.maxPrice;
      items = items.filter(function (a) { return (a.price || 0) <= maxPrice; });
    }
    if (filters.category) {
      const cat = filters.category;
      items = items.filter(function (a) { return a.category === cat; });
    }

    const totalItems = items.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const start = (page - 1) * pageSize;
    const pagedItems = items.slice(start, start + pageSize);

    return {
      items: pagedItems,
      page: page,
      pageSize: pageSize,
      totalItems: totalItems,
      totalPages: totalPages
    };
  }

  // 14. configureCustomParty
  configureCustomParty(customPartyId, basePackageId, addOnIds) {
    const basePackage = this._getEntityById('party_packages', basePackageId);
    if (!basePackage) {
      return { custom_party: null, base_package: null, add_ons: [], message: 'Base package not found' };
    }

    const allAddOns = this._getFromStorage('add_ons');
    const selectedAddOns = [];
    let totalAddOnPrice = 0;

    for (let i = 0; i < addOnIds.length; i++) {
      const addOn = allAddOns.find(function (a) { return a.id === addOnIds[i]; });
      if (addOn) {
        selectedAddOns.push(addOn);
        totalAddOnPrice += addOn.price || 0;
      }
    }

    const basePrice = basePackage.price_from || 0;
    const totalPrice = Number((basePrice + totalAddOnPrice).toFixed(2));

    const customParties = this._getFromStorage('custom_parties');
    let customParty = null;
    let idx = -1;

    if (customPartyId) {
      idx = customParties.findIndex(function (cp) { return cp.id === customPartyId; });
      if (idx !== -1) {
        customParty = customParties[idx];
      }
    }

    if (!customParty) {
      customParty = {
        id: this._generateId('custom_party'),
        base_package_id: basePackageId,
        selected_addon_ids: addOnIds.slice(),
        total_price: totalPrice,
        min_age: basePackage.min_age,
        max_age: basePackage.max_age,
        notes: null,
        created_at: this._now()
      };
      customParties.push(customParty);
    } else {
      customParty.base_package_id = basePackageId;
      customParty.selected_addon_ids = addOnIds.slice();
      customParty.total_price = totalPrice;
      customParty.min_age = basePackage.min_age;
      customParty.max_age = basePackage.max_age;
    }

    this._saveToStorage('custom_parties', customParties);

    return {
      custom_party: customParty,
      base_package: basePackage,
      add_ons: selectedAddOns
    };
  }

  // 15. getCustomPartySummary
  getCustomPartySummary(customPartyId) {
    const customParty = this._getEntityById('custom_parties', customPartyId);
    if (!customParty) {
      return { custom_party: null, base_package: null, add_ons: [] };
    }

    const basePackage = this._getEntityById('party_packages', customParty.base_package_id);
    const allAddOns = this._getFromStorage('add_ons');
    const addOns = [];
    for (let i = 0; i < customParty.selected_addon_ids.length; i++) {
      const addOn = allAddOns.find(function (a) { return a.id === customParty.selected_addon_ids[i]; });
      if (addOn) addOns.push(addOn);
    }

    return {
      custom_party: customParty,
      base_package: basePackage,
      add_ons: addOns
    };
  }

  // 16. searchServices
  searchServices(query, filters, sort, pagination) {
    filters = filters || {};
    sort = sort || 'relevance_desc';
    pagination = pagination || {};
    const page = pagination.page || 1;
    const pageSize = pagination.pageSize || 20;

    const q = String(query || '').trim().toLowerCase();

    let searchPackages = this._getFromStorage('party_packages');
    let searchEntertainers = this._getFromStorage('entertainers');

    if (filters.categoryType === 'entertainer') {
      searchPackages = [];
    } else if (filters.categoryType === 'party_package') {
      searchEntertainers = [];
    }

    if (Array.isArray(filters.entertainerTypes) && filters.entertainerTypes.length > 0) {
      const typeSet = {};
      for (let i = 0; i < filters.entertainerTypes.length; i++) {
        typeSet[filters.entertainerTypes[i]] = true;
      }
      searchEntertainers = searchEntertainers.filter(function (e) { return !!typeSet[e.type]; });
    }

    if (typeof filters.minRating === 'number') {
      const minRating = filters.minRating;
      searchPackages = searchPackages.filter(function (p) { return (p.rating || 0) >= minRating; });
      searchEntertainers = searchEntertainers.filter(function (e) { return (e.rating || 0) >= minRating; });
    }

    if (typeof filters.minReviewCount === 'number') {
      const minReviews = filters.minReviewCount;
      searchPackages = searchPackages.filter(function (p) { return (p.review_count || 0) >= minReviews; });
      searchEntertainers = searchEntertainers.filter(function (e) { return (e.review_count || 0) >= minReviews; });
    }

    function scoreText(text, queryLower) {
      if (!queryLower) return 0;
      const t = String(text || '').toLowerCase();
      if (!t.includes(queryLower)) return 0;
      if (t === queryLower) return 3;
      if (t.startsWith(queryLower)) return 2;
      return 1;
    }

    const pkgResults = [];
    for (let i = 0; i < searchPackages.length; i++) {
      const p = searchPackages[i];
      const text = (p.name || '') + ' ' + (p.theme || '') + ' ' + (p.description || '');
      const s = scoreText(text, q);
      if (q && s === 0) continue;
      pkgResults.push({ item: p, score: s });
    }

    const entResults = [];
    for (let j = 0; j < searchEntertainers.length; j++) {
      const e = searchEntertainers[j];
      const text = (e.name || '') + ' ' + (e.type || '') + ' ' + (e.description || '');
      const s = scoreText(text, q);
      if (q && s === 0) continue;
      entResults.push({ item: e, score: s });
    }

    function sortResults(arr, sortType) {
      return arr.slice().sort(function (a, b) {
        if (sortType === 'rating_desc') {
          const ra = a.item.rating || 0;
          const rb = b.item.rating || 0;
          if (rb !== ra) return rb - ra;
          const ca = a.item.review_count || 0;
          const cb = b.item.review_count || 0;
          return cb - ca;
        }
        const sa = a.score || 0;
        const sb = b.score || 0;
        if (sb !== sa) return sb - sa;
        const ra = a.item.rating || 0;
        const rb = b.item.rating || 0;
        if (rb !== ra) return rb - ra;
        return (b.item.review_count || 0) - (a.item.review_count || 0);
      });
    }

    const sortedPkgs = sortResults(pkgResults, sort).map(function (r) { return r.item; });
    const sortedEnts = sortResults(entResults, sort).map(function (r) { return r.item; });

    const totalItems = sortedPkgs.length + sortedEnts.length;

    return {
      party_packages: sortedPkgs,
      entertainers: sortedEnts,
      page: page,
      pageSize: pageSize,
      totalItems: totalItems
    };
  }

  // 17. startPackageBooking
  startPackageBooking(packageId, selectedPackageDurationId) {
    const pkg = this._getEntityById('party_packages', packageId);
    const duration = this._getEntityById('party_package_durations', selectedPackageDurationId);

    const bookingDraft = {
      id: this._generateId('booking'),
      source_type: 'party_package',
      source_id: packageId,
      event_type: 'birthday_party',
      number_of_children: 0,
      start_datetime: null,
      duration_minutes: duration ? duration.duration_minutes : (pkg ? pkg.default_duration_minutes || 0 : 0),
      location_address: null,
      location_zip: null,
      location_type: null,
      special_notes: null,
      selected_package_duration_id: selectedPackageDurationId,
      selected_entertainer_rate_id: null,
      status: 'draft',
      base_price: duration ? duration.price : (pkg ? pkg.price_from || 0 : 0),
      travel_fee: 0,
      total_price: duration ? duration.price : (pkg ? pkg.price_from || 0 : 0),
      created_at: this._now(),
      updated_at: this._now()
    };

    const saved = this._upsertBooking(bookingDraft);

    return {
      booking: saved,
      package: pkg,
      selected_duration: duration
    };
  }

  // 18. startEntertainerBooking
  startEntertainerBooking(entertainerId, selectedEntertainerRateId) {
    const ent = this._getEntityById('entertainers', entertainerId);
    const rate = this._getEntityById('entertainer_rates', selectedEntertainerRateId);

    const bookingDraft = {
      id: this._generateId('booking'),
      source_type: 'entertainer',
      source_id: entertainerId,
      event_type: 'birthday_party',
      number_of_children: 0,
      start_datetime: null,
      duration_minutes: rate ? rate.duration_minutes : 0,
      location_address: null,
      location_zip: null,
      location_type: null,
      special_notes: null,
      selected_package_duration_id: null,
      selected_entertainer_rate_id: selectedEntertainerRateId,
      status: 'draft',
      base_price: rate ? rate.price : (ent ? ent.starting_price || 0 : 0),
      travel_fee: 0,
      total_price: rate ? rate.price : (ent ? ent.starting_price || 0 : 0),
      created_at: this._now(),
      updated_at: this._now()
    };

    const saved = this._upsertBooking(bookingDraft);

    return {
      booking: saved,
      entertainer: ent,
      selected_rate: rate
    };
  }

  // 19. startCustomPartyBooking
  startCustomPartyBooking(customPartyId) {
    const customParty = this._getEntityById('custom_parties', customPartyId);

    const bookingDraft = {
      id: this._generateId('booking'),
      source_type: 'custom_party',
      source_id: customPartyId,
      event_type: 'birthday_party',
      number_of_children: 0,
      start_datetime: null,
      duration_minutes: 0,
      location_address: null,
      location_zip: null,
      location_type: null,
      special_notes: null,
      selected_package_duration_id: null,
      selected_entertainer_rate_id: null,
      status: 'draft',
      base_price: customParty ? customParty.total_price || 0 : 0,
      travel_fee: 0,
      total_price: customParty ? customParty.total_price || 0 : 0,
      created_at: this._now(),
      updated_at: this._now()
    };

    const saved = this._upsertBooking(bookingDraft);

    return {
      booking: saved,
      custom_party: customParty
    };
  }

  // 20. startBookingFromFAQ
  startBookingFromFAQ() {
    const bookingDraft = {
      id: this._generateId('booking'),
      source_type: 'party_package',
      source_id: '',
      event_type: 'birthday_party',
      number_of_children: 0,
      start_datetime: null,
      duration_minutes: 0,
      location_address: null,
      location_zip: null,
      location_type: null,
      special_notes: null,
      selected_package_duration_id: null,
      selected_entertainer_rate_id: null,
      status: 'draft',
      base_price: 0,
      travel_fee: 0,
      total_price: 0,
      created_at: this._now(),
      updated_at: this._now()
    };

    const saved = this._upsertBooking(bookingDraft);

    return {
      booking: saved,
      recommended_event_type: 'birthday_party'
    };
  }

  // 21. getBookingFormContext
  getBookingFormContext(bookingId) {
    const booking = this._getEntityById('bookings', bookingId);
    if (!booking) {
      return { booking: null, source_summary: null };
    }

    let sourceSummary = null;
    if (booking.source_type === 'party_package') {
      if (booking.source_id) {
        sourceSummary = this._getEntityById('party_packages', booking.source_id);
      }
    } else if (booking.source_type === 'entertainer') {
      if (booking.source_id) {
        sourceSummary = this._getEntityById('entertainers', booking.source_id);
      }
    } else if (booking.source_type === 'custom_party') {
      if (booking.source_id) {
        sourceSummary = this._getEntityById('custom_parties', booking.source_id);
      }
    }

    const enrichedBooking = Object.assign({}, booking);
    if (booking.selected_package_duration_id) {
      enrichedBooking.selected_package_duration = this._getEntityById('party_package_durations', booking.selected_package_duration_id);
    }
    if (booking.selected_entertainer_rate_id) {
      enrichedBooking.selected_entertainer_rate = this._getEntityById('entertainer_rates', booking.selected_entertainer_rate_id);
    }

    return {
      booking: enrichedBooking,
      source_summary: sourceSummary
    };
  }

  // 22. submitBookingForm
  submitBookingForm(bookingId, numberOfChildren, eventType, startDate, startTime, durationMinutes, location, specialNotes, actionType) {
    const bookings = this._getFromStorage('bookings');
    const existing = bookings.find(function (b) { return b.id === bookingId; });
    if (!existing) {
      return { booking: null, cart: null, success: false, message: 'Booking not found' };
    }

    const startDateStr = String(startDate || '').trim();
    const startTimeStr = String(startTime || '').trim();
    let startDatetime = existing.start_datetime || null;
    if (startDateStr && startTimeStr) {
      const iso = startDateStr + 'T' + startTimeStr + ':00';
      const d = new Date(iso);
      if (!isNaN(d.getTime())) {
        startDatetime = d.toISOString();
      }
    }

    const updatedBooking = Object.assign({}, existing, {
      number_of_children: numberOfChildren,
      event_type: eventType || existing.event_type || 'birthday_party',
      start_datetime: startDatetime,
      duration_minutes: typeof durationMinutes === 'number' && durationMinutes > 0 ? durationMinutes : existing.duration_minutes,
      special_notes: typeof specialNotes === 'string' ? specialNotes : existing.special_notes
    });

    if (location && typeof location === 'object') {
      updatedBooking.location_address = location.address || existing.location_address || null;
      updatedBooking.location_zip = location.zip || existing.location_zip || null;
      updatedBooking.location_type = location.locationType || existing.location_type || null;
    }

    const doAction = actionType || 'add_to_cart';
    updatedBooking.status = doAction === 'add_to_cart' ? 'in_cart' : 'draft';

    const saved = this._upsertBooking(updatedBooking);

    let cartResult = null;

    if (doAction === 'add_to_cart') {
      const cart = this._getOrCreateCart();
      const cartItems = this._getFromStorage('cart_items');

      let cartItem = cartItems.find(function (ci) {
        return ci.cart_id === cart.id && ci.item_type === 'party_booking' && ci.booking_id === saved.id;
      });

      const unitPrice = saved.total_price || saved.base_price || 0;

      if (!cartItem) {
        cartItem = {
          id: this._generateId('cart_item'),
          cart_id: cart.id,
          item_type: 'party_booking',
          booking_id: saved.id,
          gift_card_purchase_id: null,
          quantity: 1,
          unit_price: unitPrice,
          total_price: unitPrice,
          display_name: 'Party booking'
        };
        cartItems.push(cartItem);
      } else {
        cartItem.unit_price = unitPrice;
        cartItem.total_price = unitPrice * (cartItem.quantity || 1);
      }

      this._saveToStorage('cart_items', cartItems);

      const totals = this._calculateCartTotals(cart);
      const itemsWithRelations = this._attachCartItemRelations(totals.items);

      cartResult = Object.assign({}, totals.cart, { items: itemsWithRelations });
    }

    return {
      booking: saved,
      cart: cartResult,
      success: true,
      message: 'Booking updated'
    };
  }

  // 23. getCartSummary
  getCartSummary() {
    const cart = this._getOrCreateCart();
    const totals = this._calculateCartTotals(cart);
    const itemsWithRelations = this._attachCartItemRelations(totals.items);

    const bookingDetails = [];
    for (let i = 0; i < totals.items.length; i++) {
      const item = totals.items[i];
      if (item.item_type === 'party_booking' && item.booking_id) {
        const ctx = this.getBookingFormContext(item.booking_id);
        if (ctx.booking) {
          bookingDetails.push({ booking: ctx.booking, source_summary: ctx.source_summary });
        }
      }
    }

    const giftCardDetails = [];
    const giftPurchases = this._getFromStorage('gift_card_purchases');
    const templates = this._getFromStorage('gift_card_templates');

    for (let j = 0; j < totals.items.length; j++) {
      const item = totals.items[j];
      if (item.item_type === 'gift_card' && item.gift_card_purchase_id) {
        const purchase = giftPurchases.find(function (g) { return g.id === item.gift_card_purchase_id; }) || null;
        if (purchase) {
          const template = templates.find(function (t) { return t.id === purchase.template_id; }) || null;
          giftCardDetails.push({ gift_card_purchase: purchase, template: template });
        }
      }
    }

    return {
      cart: totals.cart,
      items: itemsWithRelations,
      booking_details: bookingDetails,
      gift_card_details: giftCardDetails
    };
  }

  // 24. removeCartItem
  removeCartItem(cartItemId) {
    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items');
    const initialLength = cartItems.length;
    cartItems = cartItems.filter(function (ci) { return ci.id !== cartItemId; });
    this._saveToStorage('cart_items', cartItems);

    const totals = this._calculateCartTotals(cart);
    const itemsWithRelations = this._attachCartItemRelations(totals.items);

    const success = cartItems.length < initialLength;

    return {
      cart: totals.cart,
      items: itemsWithRelations,
      success: success,
      message: success ? 'Item removed' : 'Item not found'
    };
  }

  // 25. getCheckoutSummary
  getCheckoutSummary() {
    const cart = this._getOrCreateCart();
    const totals = this._calculateCartTotals(cart);
    const itemsWithRelations = this._attachCartItemRelations(totals.items);

    return {
      cart: totals.cart,
      items: itemsWithRelations
    };
  }

  // 26. applyPromoCodeToCart
  applyPromoCodeToCart(promoCode) {
    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items').filter(function (ci) { return ci.cart_id === cart.id; });

    const baseSubtotal = cartItems.reduce(function (sum, ci) { return sum + (ci.total_price || 0); }, 0);
    cart.subtotal = Number(baseSubtotal.toFixed(2));

    const validation = this._validatePromoCodeForCart(promoCode, cart, cartItems);

    if (!validation.valid) {
      cart.promo_code = null;
      cart.discount_total = 0;
      cart.total = cart.subtotal;
      this._updateCartInStorage(cart);
      const itemsWithRelations = this._attachCartItemRelations(cartItems);
      return {
        cart: cart,
        promo: null,
        success: false,
        message: validation.message
      };
    }

    cart.promo_code = validation.promo.code;
    cart.discount_total = Number(validation.discount.toFixed(2));
    cart.total = Number((cart.subtotal - cart.discount_total).toFixed(2));
    this._updateCartInStorage(cart);

    const itemsWithRelations = this._attachCartItemRelations(cartItems);

    return {
      cart: cart,
      promo: validation.promo,
      success: true,
      message: validation.message
    };
  }

  // 27. updateBuyerDetailsAndCreateOrder
  updateBuyerDetailsAndCreateOrder(buyerDetails) {
    const cart = this._getOrCreateCart();
    this._calculateCartTotals(cart);
    const result = this._buildOrderFromCart(cart, buyerDetails);

    return {
      order: result.order,
      order_items: this._attachOrderItemRelations(result.order_items.filter(function (oi) { return oi.order_id === result.order.id; })),
      success: true,
      message: 'Order created from cart'
    };
  }

  // 28. getOrderReview
  getOrderReview(orderId) {
    const order = this._getEntityById('orders', orderId);
    if (!order) {
      return { order: null, items: [], booking_details: [], gift_card_details: [] };
    }

    const orderItems = this._getFromStorage('order_items').filter(function (oi) { return oi.order_id === orderId; });
    const itemsWithRelations = this._attachOrderItemRelations(orderItems);

    const bookingDetails = [];
    for (let i = 0; i < orderItems.length; i++) {
      const item = orderItems[i];
      if (item.item_type === 'party_booking' && item.booking_id) {
        const ctx = this.getBookingFormContext(item.booking_id);
        if (ctx.booking) bookingDetails.push({ booking: ctx.booking, source_summary: ctx.source_summary });
      }
    }

    const giftCardDetails = [];
    const giftPurchases = this._getFromStorage('gift_card_purchases');
    const templates = this._getFromStorage('gift_card_templates');

    for (let j = 0; j < orderItems.length; j++) {
      const item = orderItems[j];
      if (item.item_type === 'gift_card' && item.gift_card_purchase_id) {
        const purchase = giftPurchases.find(function (g) { return g.id === item.gift_card_purchase_id; }) || null;
        if (purchase) {
          const template = templates.find(function (t) { return t.id === purchase.template_id; }) || null;
          giftCardDetails.push({ gift_card_purchase: purchase, template: template });
        }
      }
    }

    return {
      order: order,
      items: itemsWithRelations,
      booking_details: bookingDetails,
      gift_card_details: giftCardDetails
    };
  }

  // 29. confirmOrder
  confirmOrder(orderId) {
    const orders = this._getFromStorage('orders');
    const idx = orders.findIndex(function (o) { return o.id === orderId; });
    if (idx === -1) {
      return { order: null, success: false, message: 'Order not found' };
    }

    const order = orders[idx];
    order.status = 'confirmed';
    order.updated_at = this._now();
    orders[idx] = order;
    this._saveToStorage('orders', orders);

    const orderItems = this._getFromStorage('order_items').filter(function (oi) { return oi.order_id === orderId; });
    const bookings = this._getFromStorage('bookings');
    const giftPurchases = this._getFromStorage('gift_card_purchases');
    const promoCodes = this._getFromStorage('promo_codes');

    for (let i = 0; i < orderItems.length; i++) {
      const oi = orderItems[i];
      if (oi.item_type === 'party_booking' && oi.booking_id) {
        const bIdx = bookings.findIndex(function (b) { return b.id === oi.booking_id; });
        if (bIdx !== -1) {
          bookings[bIdx].status = 'booked';
          bookings[bIdx].updated_at = this._now();
        }
      } else if (oi.item_type === 'gift_card' && oi.gift_card_purchase_id) {
        const gIdx = giftPurchases.findIndex(function (g) { return g.id === oi.gift_card_purchase_id; });
        if (gIdx !== -1) {
          giftPurchases[gIdx].status = 'purchased';
          giftPurchases[gIdx].created_at = giftPurchases[gIdx].created_at || this._now();
        }
      }
    }

    this._saveToStorage('bookings', bookings);
    this._saveToStorage('gift_card_purchases', giftPurchases);

    if (order.promo_code) {
      const codeLower = String(order.promo_code).toLowerCase();
      let changed = false;
      for (let j = 0; j < promoCodes.length; j++) {
        const p = promoCodes[j];
        if (String(p.code || '').toLowerCase() === codeLower) {
          p.current_uses = (p.current_uses || 0) + 1;
          changed = true;
          break;
        }
      }
      if (changed) {
        this._saveToStorage('promo_codes', promoCodes);
      }
    }

    return {
      order: order,
      success: true,
      message: 'Order confirmed'
    };
  }

  // 30. getGiftCardOptions
  getGiftCardOptions() {
    const templates = this._getFromStorage('gift_card_templates').filter(function (t) { return t.is_active !== false; });
    return { templates: templates };
  }

  // 31. addGiftCardToCart
  addGiftCardToCart(templateId, amount, recipientName, recipientEmail, message, deliveryDate) {
    const template = this._getEntityById('gift_card_templates', templateId);
    if (!template || template.is_active === false) {
      return { gift_card_purchase: null, cart: null, items: [], success: false, message: 'Gift card template not found or inactive' };
    }

    const amt = Number(amount);
    if (isNaN(amt)) {
      return { gift_card_purchase: null, cart: null, items: [], success: false, message: 'Invalid amount' };
    }

    if (typeof template.min_amount === 'number' && amt < template.min_amount) {
      return { gift_card_purchase: null, cart: null, items: [], success: false, message: 'Amount below minimum' };
    }
    if (typeof template.max_amount === 'number' && amt > template.max_amount) {
      return { gift_card_purchase: null, cart: null, items: [], success: false, message: 'Amount above maximum' };
    }

    const deliveries = this._getFromStorage('gift_card_purchases');

    let deliveryIso = null;
    if (deliveryDate) {
      const d = new Date(deliveryDate);
      if (!isNaN(d.getTime())) {
        deliveryIso = d.toISOString();
      }
    }
    if (!deliveryIso) {
      deliveryIso = this._now();
    }

    const purchase = {
      id: this._generateId('gift_card_purchase'),
      template_id: templateId,
      amount: amt,
      recipient_name: recipientName,
      recipient_email: recipientEmail,
      message: message || null,
      delivery_date: deliveryIso,
      sender_name: null,
      status: 'in_cart',
      created_at: this._now()
    };

    deliveries.push(purchase);
    this._saveToStorage('gift_card_purchases', deliveries);

    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items');

    const cartItem = {
      id: this._generateId('cart_item'),
      cart_id: cart.id,
      item_type: 'gift_card',
      booking_id: null,
      gift_card_purchase_id: purchase.id,
      quantity: 1,
      unit_price: amt,
      total_price: amt,
      display_name: 'Gift card for ' + recipientName
    };

    cartItems.push(cartItem);
    this._saveToStorage('cart_items', cartItems);

    const totals = this._calculateCartTotals(cart);
    const itemsWithRelations = this._attachCartItemRelations(totals.items);

    return {
      gift_card_purchase: purchase,
      cart: totals.cart,
      items: itemsWithRelations,
      success: true,
      message: 'Gift card added to cart'
    };
  }

  // 32. getFAQItems
  getFAQItems() {
    const faqs = this._getFromStorage('faq_items');
    faqs.sort(function (a, b) {
      const ia = typeof a.order_index === 'number' ? a.order_index : 0;
      const ib = typeof b.order_index === 'number' ? b.order_index : 0;
      return ia - ib;
    });
    return { faqs: faqs };
  }

  // 33. getAboutPageContent
  getAboutPageContent() {
    const raw = localStorage.getItem('about_page_content');
    if (!raw) {
      return {
        heading: '',
        body: '',
        safety_practices: [],
        service_areas: []
      };
    }
    try {
      const obj = JSON.parse(raw);
      return {
        heading: obj.heading || '',
        body: obj.body || '',
        safety_practices: Array.isArray(obj.safety_practices) ? obj.safety_practices : [],
        service_areas: Array.isArray(obj.service_areas) ? obj.service_areas : []
      };
    } catch (e) {
      return {
        heading: '',
        body: '',
        safety_practices: [],
        service_areas: []
      };
    }
  }

  // 34. getContactPageContent
  getContactPageContent() {
    const raw = localStorage.getItem('contact_page_content');
    if (!raw) {
      return {
        support_email: '',
        support_phone: '',
        response_time_message: '',
        service_region_note: ''
      };
    }
    try {
      const obj = JSON.parse(raw);
      return {
        support_email: obj.support_email || '',
        support_phone: obj.support_phone || '',
        response_time_message: obj.response_time_message || '',
        service_region_note: obj.service_region_note || ''
      };
    } catch (e) {
      return {
        support_email: '',
        support_phone: '',
        response_time_message: '',
        service_region_note: ''
      };
    }
  }

  // 35. sendGeneralContactInquiry
  sendGeneralContactInquiry(topic, name, email, message) {
    const inquiries = this._getFromStorage('inquiries');
    const inquiry = {
      id: this._generateId('inquiry'),
      type: 'general_contact',
      related_entertainer_id: null,
      subject: topic || null,
      name: name,
      email: email,
      message: message,
      created_at: this._now()
    };
    inquiries.push(inquiry);
    this._saveToStorage('inquiries', inquiries);

    return {
      inquiry: inquiry,
      success: true,
      message: 'Inquiry sent'
    };
  }

  // 36. getPoliciesContent
  getPoliciesContent() {
    const raw = localStorage.getItem('policies_content');
    if (!raw) {
      return {
        booking_terms: '',
        cancellation_policy: '',
        payment_and_deposit_policy: '',
        travel_fee_policy: '',
        privacy_policy: ''
      };
    }
    try {
      const obj = JSON.parse(raw);
      return {
        booking_terms: obj.booking_terms || '',
        cancellation_policy: obj.cancellation_policy || '',
        payment_and_deposit_policy: obj.payment_and_deposit_policy || '',
        travel_fee_policy: obj.travel_fee_policy || '',
        privacy_policy: obj.privacy_policy || ''
      };
    } catch (e) {
      return {
        booking_terms: '',
        cancellation_policy: '',
        payment_and_deposit_policy: '',
        travel_fee_policy: '',
        privacy_policy: ''
      };
    }
  }

  // --------- Example generic addToCart kept for compatibility (not used by core logic) ---------
  addToCart(userId, productId, quantity) {
    quantity = typeof quantity === 'number' ? quantity : 1;
    let carts = this._getFromStorage('carts');
    let cartItems = this._getFromStorage('cart_items');

    let cart = carts[0];
    if (!cart) {
      cart = {
        id: this._generateId('cart'),
        items: [],
        subtotal: 0,
        discount_total: 0,
        total: 0,
        promo_code: null,
        created_at: this._now(),
        updated_at: this._now()
      };
      carts.push(cart);
      this._saveToStorage('carts', carts);
      localStorage.setItem('current_cart_id', cart.id);
    }

    const existing = cartItems.find(function (ci) {
      return ci.cart_id === cart.id && ci.item_type === 'party_booking' && ci.booking_id === productId;
    });

    if (!existing) {
      const ci = {
        id: this._generateId('cart_item'),
        cart_id: cart.id,
        item_type: 'party_booking',
        booking_id: productId,
        gift_card_purchase_id: null,
        quantity: quantity,
        unit_price: 0,
        total_price: 0,
        display_name: 'Item ' + productId
      };
      cartItems.push(ci);
    } else {
      existing.quantity += quantity;
    }

    this._saveToStorage('cart_items', cartItems);

    return { success: true, cartId: cart.id };
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