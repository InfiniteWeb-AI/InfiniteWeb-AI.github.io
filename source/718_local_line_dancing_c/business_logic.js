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

  // -------- Storage helpers --------

  _initStorage() {
    const tableKeys = [
      // Core domain entities
      'class_sessions',
      'workshop_events',
      'membership_plans',
      'class_pass_products',
      'instructors',
      'locations',
      'location_amenities',
      'promo_banners',
      'promo_codes',
      'faq_articles',
      'contact_messages',
      // Commerce & booking entities
      'carts',
      'cart_items',
      'checkout_sessions',
      'checkout_items',
      'orders',
      'payments'
    ];

    tableKeys.forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    });

    // Optional legacy/example keys from template (harmless if unused)
    if (!localStorage.getItem('users')) {
      localStorage.setItem('users', JSON.stringify([]));
    }
    if (!localStorage.getItem('products')) {
      localStorage.setItem('products', JSON.stringify([]));
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key) {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    try {
      return JSON.parse(raw);
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

  // -------- Generic helpers --------

  _nowISO() {
    return new Date().toISOString();
  }

  _parseISODate(dateStr) {
    return dateStr ? new Date(dateStr) : null;
  }

  _toISODate(date) {
    if (!date) return null;
    const d = (date instanceof Date) ? date : new Date(date);
    return d.toISOString().slice(0, 10);
  }

  _clone(obj) {
    return obj == null ? obj : JSON.parse(JSON.stringify(obj));
  }

  // Very simple distance heuristic based on ZIP code difference.
  // Uses only data already stored (no external services).
  _calculateDistanceFromZip(zipCode, location) {
    if (!zipCode || !location || !location.zip_code) return null;
    const z1 = parseInt(String(zipCode).slice(0, 5), 10);
    const z2 = parseInt(String(location.zip_code).slice(0, 5), 10);
    if (isNaN(z1) || isNaN(z2)) return null;
    return Math.abs(z1 - z2) * 0.1; // arbitrary 0.1 miles per ZIP step
  }

  // Resolve relative date labels like 'next_wednesday', 'upcoming_saturday', 'next_month'
  _resolveRelativeDates(label) {
    const today = new Date();
    const result = {};

    const getNextDow = (targetDow) => {
      const date = new Date(today);
      const currentDow = date.getDay(); // 0=Sun,1=Mon,...
      let offset = targetDow - currentDow;
      if (offset <= 0) offset += 7;
      date.setDate(date.getDate() + offset);
      return this._toISODate(date);
    };

    switch (label) {
      case 'next_wednesday':
        result.startDate = getNextDow(3); // Wed
        result.endDate = result.startDate;
        break;
      case 'upcoming_saturday':
        result.startDate = getNextDow(6); // Sat
        result.endDate = result.startDate;
        break;
      case 'upcoming_sunday':
        result.startDate = getNextDow(0); // Sun
        result.endDate = result.startDate;
        break;
      case 'next_month': {
        const d = new Date(today);
        d.setMonth(d.getMonth() + 1, 1);
        const start = new Date(d.getFullYear(), d.getMonth(), 1);
        const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
        result.startDate = this._toISODate(start);
        result.endDate = this._toISODate(end);
        result.month = d.getMonth() + 1;
        result.year = d.getFullYear();
        break;
      }
      default:
        break;
    }

    return result;
  }

  // Foreign key resolution for non-itemId fields (classSessionId, locationId, etc.)
  _resolveForeignKeysForObject(obj) {
    if (!obj || typeof obj !== 'object') return obj;

    const entityTableByBase = {
      classSession: 'class_sessions',
      workshopEvent: 'workshop_events',
      membershipPlan: 'membership_plans',
      classPassProduct: 'class_pass_products',
      instructor: 'instructors',
      location: 'locations',
      faqArticle: 'faq_articles',
      cartItem: 'cart_items',
      order: 'orders'
    };

    const cache = {};

    Object.keys(obj).forEach((key) => {
      if (!key.endsWith('Id')) return;
      if (key === 'itemId') return; // handled separately
      const base = key.slice(0, -2); // drop 'Id'
      const tableKey = entityTableByBase[base];
      if (!tableKey) return;
      if (!cache[tableKey]) {
        cache[tableKey] = this._getFromStorage(tableKey);
      }
      const list = cache[tableKey];
      const found = list.find((e) => e.id === obj[key]) || null;
      obj[base] = found ? this._clone(found) : null;
    });

    return obj;
  }

  // Resolve itemId -> item based on itemType for cart/checkout/order snapshots
  _attachItemForLine(line) {
    if (!line || typeof line !== 'object') return line;
    if (!('itemId' in line)) return line;
    const itemType = line.itemType;
    const itemId = line.itemId;
    if (!itemType || !itemId) return line;

    let tableKey = null;
    switch (itemType) {
      case 'class_session':
        tableKey = 'class_sessions';
        break;
      case 'workshop_event':
        tableKey = 'workshop_events';
        break;
      case 'membership_plan':
        tableKey = 'membership_plans';
        break;
      case 'class_pass_product':
        tableKey = 'class_pass_products';
        break;
      default:
        break;
    }
    if (!tableKey) return line;
    const list = this._getFromStorage(tableKey);
    const found = list.find((e) => e.id === itemId) || null;
    line.item = found ? this._clone(found) : null;
    return line;
  }

  // -------- Cart & Checkout helpers --------

  _getOrCreateCart() {
    const carts = this._getFromStorage('carts');
    let activeCartId = localStorage.getItem('active_cart_id');
    let cart = null;

    if (activeCartId) {
      cart = carts.find((c) => c.id === activeCartId) || null;
    }

    if (!cart) {
      const id = this._generateId('cart');
      const now = this._nowISO();
      cart = {
        id,
        items: [], // array of CartItem ids
        applied_promo_code_id: null,
        subtotal_amount: 0,
        discount_amount: 0,
        total_amount: 0,
        created_at: now,
        updated_at: now
      };
      carts.push(cart);
      this._saveToStorage('carts', carts);
      localStorage.setItem('active_cart_id', id);
    }

    return cart;
  }

  _updateCart(cart) {
    const carts = this._getFromStorage('carts');
    const idx = carts.findIndex((c) => c.id === cart.id);
    if (idx !== -1) {
      carts[idx] = cart;
      this._saveToStorage('carts', carts);
    }
  }

  _getCartItems(cart) {
    const cartItems = this._getFromStorage('cart_items');
    return cartItems.filter((ci) => ci.cart_id === cart.id);
  }

  _calculateCartTotals(cart) {
    const cartItems = this._getCartItems(cart);
    const subtotal = cartItems.reduce((sum, item) => sum + (item.line_subtotal || 0), 0);
    let discount = 0;
    let total = subtotal;

    if (cart.applied_promo_code_id) {
      const promoCodes = this._getFromStorage('promo_codes');
      const promo = promoCodes.find((p) => p.id === cart.applied_promo_code_id && p.is_active);
      if (promo) {
        discount = this._calculateDiscountForCart(cart, cartItems, promo);
        if (discount < 0) discount = 0;
        if (discount > subtotal) discount = subtotal;
        total = subtotal - discount;
      }
    }

    cart.subtotal_amount = subtotal;
    cart.discount_amount = discount;
    cart.total_amount = total;
    cart.updated_at = this._nowISO();
  }

  _calculateDiscountForCart(cart, cartItems, promo) {
    if (!promo) return 0;

    const applicableTypesMap = {
      all_items: ['class_session', 'workshop_event', 'membership_plan', 'class_pass_product'],
      passes_only: ['class_pass_product'],
      memberships_only: ['membership_plan'],
      classes_only: ['class_session'],
      workshops_only: ['workshop_event']
    };

    const applicableTypes = applicableTypesMap[promo.applicable_to] || [];

    const applicableSubtotal = cartItems
      .filter((ci) => applicableTypes.includes(ci.item_type))
      .reduce((sum, item) => sum + (item.line_subtotal || 0), 0);

    if (promo.min_order_amount != null && applicableSubtotal < promo.min_order_amount) {
      return 0;
    }

    let discount = 0;
    if (promo.discount_type === 'percent') {
      discount = (applicableSubtotal * promo.discount_value) / 100;
    } else if (promo.discount_type === 'fixed_amount') {
      discount = promo.discount_value;
    }

    return discount;
  }

  _buildCartSummary(cart) {
    const cartItems = this._getCartItems(cart);

    const items = cartItems.map((ci) => {
      const itemObj = {
        cartItemId: ci.id,
        itemType: ci.item_type,
        itemId: ci.item_id,
        name: ci.name,
        dateTimeDisplay: ci.date_time_display || null,
        unitPrice: ci.unit_price,
        quantity: ci.quantity,
        lineSubtotal: ci.line_subtotal
      };
      this._attachItemForLine(itemObj);
      this._resolveForeignKeysForObject(itemObj);
      return itemObj;
    });

    const promoCodes = this._getFromStorage('promo_codes');
    let appliedPromoCode = null;
    if (cart.applied_promo_code_id) {
      const promo = promoCodes.find((p) => p.id === cart.applied_promo_code_id);
      if (promo) appliedPromoCode = promo.code;
    }

    return {
      items,
      appliedPromoCode,
      subtotalAmount: cart.subtotal_amount || 0,
      discountAmount: cart.discount_amount || 0,
      totalAmount: cart.total_amount || 0
    };
  }

  _createCheckoutSession({ reset = false, sourceCartId = null, checkoutMode = 'guest' } = {}) {
    const sessions = this._getFromStorage('checkout_sessions');
    let activeId = localStorage.getItem('active_checkout_session_id');
    let session = null;

    if (!reset && activeId) {
      session = sessions.find((s) => s.id === activeId) || null;
    }

    if (!session || reset) {
      const id = this._generateId('checkout');
      const now = this._nowISO();
      session = {
        id,
        source_cart_id: sourceCartId,
        items: [], // array of CheckoutItem ids
        subtotal_amount: 0,
        discount_amount: 0,
        total_amount: 0,
        checkout_mode: checkoutMode || 'guest',
        membership_start_date: null,
        status: 'in_progress',
        created_at: now,
        updated_at: now
      };
      if (reset && activeId) {
        // keep old sessions as history; do not delete
      }
      sessions.push(session);
      this._saveToStorage('checkout_sessions', sessions);
      localStorage.setItem('active_checkout_session_id', session.id);
    }

    return session;
  }

  _getCurrentCheckoutSession() {
    const sessions = this._getFromStorage('checkout_sessions');
    const activeId = localStorage.getItem('active_checkout_session_id');
    if (!activeId) return null;
    return sessions.find((s) => s.id === activeId) || null;
  }

  _updateCheckoutSession(session) {
    const sessions = this._getFromStorage('checkout_sessions');
    const idx = sessions.findIndex((s) => s.id === session.id);
    if (idx !== -1) {
      sessions[idx] = session;
      this._saveToStorage('checkout_sessions', sessions);
    }
  }

  _getCheckoutItems(session) {
    const all = this._getFromStorage('checkout_items');
    return all.filter((ci) => ci.checkout_session_id === session.id);
  }

  _setCheckoutItems(session, items) {
    const all = this._getFromStorage('checkout_items');
    const remaining = all.filter((ci) => ci.checkout_session_id !== session.id);
    const newAll = remaining.concat(items);
    this._saveToStorage('checkout_items', newAll);
    session.items = items.map((i) => i.id);
    this._updateCheckoutSession(session);
  }

  _calculateCheckoutTotals(session) {
    const items = this._getCheckoutItems(session);
    const subtotal = items.reduce((sum, item) => sum + (item.line_subtotal || 0), 0);
    const discount = session.discount_amount || 0; // CheckoutSession does not track promo; mirrored from cart when created
    const total = subtotal - discount;
    session.subtotal_amount = subtotal;
    session.total_amount = total < 0 ? 0 : total;
    session.updated_at = this._nowISO();
  }

  _buildCheckoutSummary(session) {
    if (!session) {
      return {
        checkoutMode: 'guest',
        items: [],
        subtotalAmount: 0,
        discountAmount: 0,
        totalAmount: 0,
        membershipStartDate: null,
        membershipStartDateOptions: []
      };
    }

    const checkoutItems = this._getCheckoutItems(session);
    const items = checkoutItems.map((ci) => {
      const line = {
        checkoutItemId: ci.id,
        itemType: ci.item_type,
        itemId: ci.item_id,
        name: ci.name,
        dateTimeDisplay: ci.date_time_display || null,
        unitPrice: ci.unit_price,
        quantity: ci.quantity,
        lineSubtotal: ci.line_subtotal
      };
      this._attachItemForLine(line);
      this._resolveForeignKeysForObject(line);
      return line;
    });

    // Membership start date options (if any membership in checkout)
    const hasMembership = checkoutItems.some((ci) => ci.item_type === 'membership_plan');
    const membershipStartDateOptions = hasMembership ? this._buildMembershipStartDateOptions() : [];

    return {
      checkoutMode: session.checkout_mode || 'guest',
      items,
      subtotalAmount: session.subtotal_amount || 0,
      discountAmount: session.discount_amount || 0,
      totalAmount: session.total_amount || 0,
      membershipStartDate: session.membership_start_date || null,
      membershipStartDateOptions
    };
  }

  _buildMembershipStartDateOptions() {
    const today = new Date();
    const todayISO = this._toISODate(today);
    const firstNextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    const nextMonthISO = this._toISODate(firstNextMonth);
    return [todayISO, nextMonthISO];
  }

  // -------- Interface implementations --------

  // --- Homepage ---

  getHomepageContent() {
    const promoBannersRaw = this._getFromStorage('promo_banners');
    const promoCodes = this._getFromStorage('promo_codes');
    const classSessions = this._getFromStorage('class_sessions');
    const workshops = this._getFromStorage('workshop_events');
    const membershipPlans = this._getFromStorage('membership_plans');
    const classPassProducts = this._getFromStorage('class_pass_products');
    const locations = this._getFromStorage('locations');
    const instructors = this._getFromStorage('instructors');

    const now = new Date();

    const promoBanners = promoBannersRaw
      .filter((b) => b.is_active)
      .filter((b) => {
        const startOk = !b.start_datetime || new Date(b.start_datetime) <= now;
        const endOk = !b.end_datetime || new Date(b.end_datetime) >= now;
        return startOk && endOk;
      })
      .map((b) => {
        const promo = b.promo_code_id
          ? promoCodes.find((p) => p.id === b.promo_code_id)
          : null;
        const obj = {
          id: b.id,
          title: b.title,
          message: b.message,
          promoCode: promo ? promo.code : null,
          promoCodeDescription: promo ? (promo.description || '') : null,
          isActive: !!b.is_active
        };
        this._resolveForeignKeysForObject(obj);
        return obj;
      });

    const todayISO = this._toISODate(new Date());
    const quickSearchDefaults = {
      defaultZipCode: '',
      defaultLevel: 'beginner',
      defaultDate: todayISO
    };

    const featuredClasses = classSessions
      .filter((c) => c.is_featured && c.status === 'active')
      .map((c) => {
        const loc = locations.find((l) => l.id === c.location_id) || {};
        const inst = instructors.find((i) => i.id === c.instructor_id) || {};
        const obj = {
          classSessionId: c.id,
          name: c.name,
          level: c.level,
          classType: c.class_type,
          startDatetime: c.start_datetime,
          endDatetime: c.end_datetime,
          durationMinutes: c.duration_minutes,
          price: c.price,
          currency: c.currency || 'USD',
          locationName: loc.name || null,
          locationCity: loc.city || null,
          locationZipCode: loc.zip_code || null,
          instructorName: inst.name || null,
          isFeatured: !!c.is_featured
        };
        this._resolveForeignKeysForObject(obj);
        return obj;
      });

    const featuredWorkshops = workshops
      .filter((w) => w.is_featured && w.status === 'active')
      .map((w) => {
        const loc = locations.find((l) => l.id === w.location_id) || {};
        const obj = {
          workshopEventId: w.id,
          title: w.title,
          startDatetime: w.start_datetime,
          durationMinutes: w.duration_minutes,
          price: w.price,
          currency: w.currency || 'USD',
          locationName: loc.name || null,
          isFeatured: !!w.is_featured
        };
        this._resolveForeignKeysForObject(obj);
        return obj;
      });

    const featuredMembershipPlans = membershipPlans
      .filter((m) => m.is_active && m.is_featured)
      .map((m) => {
        const obj = {
          membershipPlanId: m.id,
          name: m.name,
          planType: m.plan_type,
          pricePerPeriod: m.price_per_period,
          currency: m.currency || 'USD',
          classesPerMonth: m.classes_per_month,
          contractType: m.contract_type,
          cancelAnytime: !!m.cancel_anytime,
          isFeatured: !!m.is_featured
        };
        this._resolveForeignKeysForObject(obj);
        return obj;
      });

    const featuredClassPasses = classPassProducts
      .filter((p) => p.is_active && p.is_featured)
      .map((p) => {
        const obj = {
          classPassProductId: p.id,
          name: p.name,
          numClasses: p.num_classes,
          price: p.price,
          currency: p.currency || 'USD',
          validityDays: p.validity_days || null,
          isFeatured: !!p.is_featured
        };
        this._resolveForeignKeysForObject(obj);
        return obj;
      });

    return {
      promoBanners,
      quickSearchDefaults,
      featuredClasses,
      featuredWorkshops,
      featuredMembershipPlans,
      featuredClassPasses
    };
  }

  // --- Class filters & search ---

  getClassFilterOptions() {
    const levels = ['beginner', 'intermediate', 'advanced', 'all_levels'];
    const classTypes = ['adult', 'kids_teens', 'all_ages'];
    const timeOfDayBuckets = ['morning', 'afternoon', 'evening'];
    const distanceOptionsMiles = [5, 10, 15, 20, 25];
    const priceCeilingOptions = [15, 20, 25, 30, 40, 50];
    const dayOfWeekOptions = [
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
      'sunday'
    ];

    const commonAgeRanges = [
      { label: 'ages_3_5', minAge: 3, maxAge: 5 },
      { label: 'ages_6_8', minAge: 6, maxAge: 8 },
      { label: 'ages_9_10', minAge: 9, maxAge: 10 },
      { label: 'ages_11_13', minAge: 11, maxAge: 13 },
      { label: 'ages_14_17', minAge: 14, maxAge: 17 }
    ];

    return {
      levels,
      classTypes,
      timeOfDayBuckets,
      distanceOptionsMiles,
      priceCeilingOptions,
      dayOfWeekOptions,
      commonAgeRanges
    };
  }

  searchClasses(
    zipCode,
    maxDistanceMiles,
    locationId,
    instructorId,
    startDate,
    endDate,
    dayOfWeek,
    timeOfDayBucket,
    startTimeEarliest,
    startTimeLatest,
    levelFilter,
    maxPrice,
    classType,
    ageMin,
    ageMax,
    sortBy,
    limit
  ) {
    const classSessions = this._getFromStorage('class_sessions');
    const locations = this._getFromStorage('locations');
    const instructors = this._getFromStorage('instructors');

    const results = [];

    // Normalize params
    const levelSet = Array.isArray(levelFilter) && levelFilter.length ? new Set(levelFilter) : null;
    const hasStartRange = !!startDate;
    const hasEndRange = !!endDate;
    const dayStart = hasStartRange ? new Date(startDate) : null;
    const dayEnd = hasEndRange ? new Date(endDate) : null;

    const parseHM = (s) => {
      if (!s) return null;
      const [h, m] = s.split(':').map((v) => parseInt(v, 10));
      if (isNaN(h) || isNaN(m)) return null;
      return { h, m };
    };
    const startHM = parseHM(startTimeEarliest);
    const endHM = parseHM(startTimeLatest);

    classSessions.forEach((c) => {
      if (c.status !== 'active') return;

      const loc = locations.find((l) => l.id === c.location_id) || null;
      const inst = instructors.find((i) => i.id === c.instructor_id) || null;

      if (locationId && c.location_id !== locationId) return;
      if (instructorId && c.instructor_id !== instructorId) return;

      if (classType && c.class_type !== classType) return;

      if (levelSet && !levelSet.has(c.level)) return;

      if (maxPrice != null && c.price != null && c.price > maxPrice) return;

      if (dayOfWeek) {
        if (c.day_of_week !== dayOfWeek) return;
      } else if (startDate) {
        const sd = new Date(c.start_datetime);
        const sdDate = new Date(sd.getFullYear(), sd.getMonth(), sd.getDate());
        if (dayStart && sdDate < dayStart) return;
        if (dayEnd && sdDate > dayEnd) return;
      }

      if (timeOfDayBucket && c.time_of_day_bucket !== timeOfDayBucket) return;

      if (startHM || endHM) {
        const dt = new Date(c.start_datetime);
        // Use UTC time to match stored ISO datetimes (which are in Z/UTC) and
        // avoid environment-dependent local timezone shifts that could filter
        // out valid classes in time-range searches.
        const h = dt.getUTCHours();
        const m = dt.getUTCMinutes();
        if (startHM) {
          if (h < startHM.h || (h === startHM.h && m < startHM.m)) return;
        }
        if (endHM) {
          if (h > endHM.h || (h === endHM.h && m > endHM.m)) return;
        }
      }

      if (ageMin != null || ageMax != null) {
        const minAge = c.min_age != null ? c.min_age : 0;
        const maxAge = c.max_age != null ? c.max_age : 200;
        if (ageMin != null && maxAge < ageMin) return;
        if (ageMax != null && minAge > ageMax) return;
      }

      let distanceMiles = null;
      if (zipCode && loc) {
        distanceMiles = this._calculateDistanceFromZip(zipCode, loc);
        if (maxDistanceMiles != null && distanceMiles != null && distanceMiles > maxDistanceMiles) {
          return;
        }
      }

      const item = {
        classSessionId: c.id,
        name: c.name,
        descriptionSnippet: c.description ? String(c.description).slice(0, 140) : '',
        level: c.level,
        classType: c.class_type,
        tags: Array.isArray(c.tags) ? c.tags : [],
        startDatetime: c.start_datetime,
        endDatetime: c.end_datetime,
        durationMinutes: c.duration_minutes,
        dayOfWeek: c.day_of_week,
        timeOfDayBucket: c.time_of_day_bucket,
        price: c.price,
        currency: c.currency || 'USD',
        locationId: c.location_id,
        locationName: loc ? loc.name : null,
        locationCity: loc ? loc.city : null,
        locationZipCode: loc ? loc.zip_code : null,
        distanceMiles: distanceMiles,
        instructorId: c.instructor_id,
        instructorName: inst ? inst.name : null,
        remainingSpots: c.remaining_spots,
        status: c.status,
        isFeatured: !!c.is_featured
      };
      this._resolveForeignKeysForObject(item);
      results.push(item);
    });

    if (sortBy) {
      if (sortBy === 'start_time_asc') {
        results.sort((a, b) => new Date(a.startDatetime) - new Date(b.startDatetime));
      } else if (sortBy === 'price_low_to_high') {
        results.sort((a, b) => (a.price || 0) - (b.price || 0));
      } else if (sortBy === 'price_high_to_low') {
        results.sort((a, b) => (b.price || 0) - (a.price || 0));
      }
    }

    const limited = typeof limit === 'number' && limit > 0 ? results.slice(0, limit) : results;
    return limited;
  }

  getClassDetails(classSessionId) {
    const classSessions = this._getFromStorage('class_sessions');
    const locations = this._getFromStorage('locations');
    const instructors = this._getFromStorage('instructors');

    const c = classSessions.find((cs) => cs.id === classSessionId);
    if (!c) return null;

    const loc = locations.find((l) => l.id === c.location_id) || null;
    const inst = instructors.find((i) => i.id === c.instructor_id) || null;

    const locationObj = loc
      ? {
          locationId: loc.id,
          name: loc.name,
          addressLine1: loc.address_line1,
          addressLine2: loc.address_line2 || null,
          city: loc.city,
          state: loc.state,
          zipCode: loc.zip_code,
          distanceMiles: null,
          hasFreeParking: !!loc.has_free_parking,
          openingHoursSummary: loc.opening_hours_summary || null
        }
      : null;

    const instructorObj = inst
      ? {
          instructorId: inst.id,
          name: inst.name,
          photoUrl: inst.photo_url || null,
          averageRating: inst.average_rating,
          reviewCount: inst.review_count,
          primaryStyles: Array.isArray(inst.primary_styles) ? inst.primary_styles : []
        }
      : null;

    const result = {
      classSessionId: c.id,
      name: c.name,
      description: c.description || '',
      level: c.level,
      classType: c.class_type,
      tags: Array.isArray(c.tags) ? c.tags : [],
      startDatetime: c.start_datetime,
      endDatetime: c.end_datetime,
      durationMinutes: c.duration_minutes,
      dayOfWeek: c.day_of_week,
      timeOfDayBucket: c.time_of_day_bucket,
      price: c.price,
      currency: c.currency || 'USD',
      minAge: c.min_age != null ? c.min_age : null,
      maxAge: c.max_age != null ? c.max_age : null,
      status: c.status,
      capacity: c.capacity != null ? c.capacity : null,
      remainingSpots: c.remaining_spots != null ? c.remaining_spots : null,
      location: locationObj,
      instructor: instructorObj
    };

    this._resolveForeignKeysForObject(result.location || {});
    this._resolveForeignKeysForObject(result.instructor || {});
    this._resolveForeignKeysForObject(result);
    return result;
  }

  startClassBookingToCheckout(classSessionId, participants) {
    const classSessions = this._getFromStorage('class_sessions');
    const c = classSessions.find((cs) => cs.id === classSessionId);
    if (!c) {
      return {
        checkoutCreated: false,
        checkoutMode: 'guest',
        items: [],
        subtotalAmount: 0,
        discountAmount: 0,
        totalAmount: 0
      };
    }

    const qty = typeof participants === 'number' && participants > 0 ? participants : 1;

    const session = this._createCheckoutSession({ reset: true, sourceCartId: null, checkoutMode: 'guest' });

    const dateTimeDisplay = `${c.start_datetime} - ${c.end_datetime}`;

    const checkoutItem = {
      id: this._generateId('checkoutitem'),
      checkout_session_id: session.id,
      item_type: 'class_session',
      item_id: c.id,
      name: c.name,
      date_time_display: dateTimeDisplay,
      unit_price: c.price,
      quantity: qty,
      line_subtotal: (c.price || 0) * qty
    };

    this._setCheckoutItems(session, [checkoutItem]);
    session.discount_amount = 0;
    this._calculateCheckoutTotals(session);
    this._updateCheckoutSession(session);

    const summary = this._buildCheckoutSummary(session);

    return {
      checkoutCreated: true,
      checkoutMode: summary.checkoutMode,
      items: summary.items,
      subtotalAmount: summary.subtotalAmount,
      discountAmount: summary.discountAmount,
      totalAmount: summary.totalAmount
    };
  }

  addClassToCart(classSessionId, participants) {
    const classSessions = this._getFromStorage('class_sessions');
    const c = classSessions.find((cs) => cs.id === classSessionId);
    if (!c) {
      return { success: false, message: 'Class not found', cart: null };
    }

    const qty = typeof participants === 'number' && participants > 0 ? participants : 1;

    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items');

    const dateTimeDisplay = `${c.start_datetime} - ${c.end_datetime}`;

    const cartItem = {
      id: this._generateId('cartitem'),
      cart_id: cart.id,
      item_type: 'class_session',
      item_id: c.id,
      name: c.name,
      date_time_display: dateTimeDisplay,
      unit_price: c.price,
      quantity: qty,
      line_subtotal: (c.price || 0) * qty
    };

    cartItems.push(cartItem);
    this._saveToStorage('cart_items', cartItems);

    if (!Array.isArray(cart.items)) cart.items = [];
    cart.items.push(cartItem.id);

    this._calculateCartTotals(cart);
    this._updateCart(cart);

    const summary = this._buildCartSummary(cart);

    return {
      success: true,
      message: 'Class added to cart',
      cart: summary
    };
  }

  // --- Workshops ---

  getWorkshopFilterOptions() {
    const dayOfWeekOptions = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const durationOptionsMinutes = [60, 90, 120, 150, 180];
    const priceCeilingOptions = [25, 50, 75, 100];

    const today = new Date();
    const currentMonth = today.getMonth() + 1;
    const currentYear = today.getFullYear();
    const nextMonthDate = new Date(currentYear, currentMonth, 1);
    const monthOptions = [
      {
        label: 'current_month',
        month: currentMonth,
        year: currentYear
      },
      {
        label: 'next_month',
        month: nextMonthDate.getMonth() + 1,
        year: nextMonthDate.getFullYear()
      }
    ];

    return {
      dayOfWeekOptions,
      durationOptionsMinutes,
      priceCeilingOptions,
      monthOptions
    };
  }

  searchWorkshops(
    keyword,
    month,
    year,
    startDate,
    endDate,
    dayOfWeek,
    minDurationMinutes,
    maxPrice,
    zipCode,
    maxDistanceMiles,
    locationId,
    sortBy
  ) {
    const workshops = this._getFromStorage('workshop_events');
    const locations = this._getFromStorage('locations');

    const results = [];

    let rangeStart = null;
    let rangeEnd = null;

    if (month && year) {
      rangeStart = new Date(year, month - 1, 1);
      rangeEnd = new Date(year, month, 0);
    } else if (startDate) {
      rangeStart = new Date(startDate);
      rangeEnd = endDate ? new Date(endDate) : rangeStart;
    }

    const kw = keyword ? String(keyword).toLowerCase() : null;

    workshops.forEach((w) => {
      if (w.status !== 'active') return;

      const loc = locations.find((l) => l.id === w.location_id) || null;

      if (locationId && w.location_id !== locationId) return;

      if (kw) {
        const title = (w.title || '').toLowerCase();
        const desc = (w.description || '').toLowerCase();
        const tags = Array.isArray(w.keyword_tags) ? w.keyword_tags.join(' ').toLowerCase() : '';
        if (!title.includes(kw) && !desc.includes(kw) && !tags.includes(kw)) return;
      }

      if (rangeStart && rangeEnd) {
        const sd = new Date(w.start_datetime);
        const sdDate = new Date(sd.getFullYear(), sd.getMonth(), sd.getDate());
        if (sdDate < rangeStart || sdDate > rangeEnd) return;
      }

      if (dayOfWeek && w.day_of_week !== dayOfWeek) return;

      if (minDurationMinutes != null && w.duration_minutes < minDurationMinutes) return;

      if (maxPrice != null && w.price != null && w.price > maxPrice) return;

      let distanceMiles = null;
      if (zipCode && loc) {
        distanceMiles = this._calculateDistanceFromZip(zipCode, loc);
        if (maxDistanceMiles != null && distanceMiles != null && distanceMiles > maxDistanceMiles) {
          return;
        }
      }

      const item = {
        workshopEventId: w.id,
        title: w.title,
        descriptionSnippet: w.description ? String(w.description).slice(0, 140) : '',
        keywordTags: Array.isArray(w.keyword_tags) ? w.keyword_tags : [],
        startDatetime: w.start_datetime,
        endDatetime: w.end_datetime,
        durationMinutes: w.duration_minutes,
        dayOfWeek: w.day_of_week,
        price: w.price,
        currency: w.currency || 'USD',
        locationId: w.location_id,
        locationName: loc ? loc.name : null,
        locationCity: loc ? loc.city : null,
        status: w.status,
        remainingSpots: w.remaining_spots,
        isFeatured: !!w.is_featured
      };
      this._resolveForeignKeysForObject(item);
      results.push(item);
    });

    if (sortBy) {
      if (sortBy === 'start_time_asc') {
        results.sort((a, b) => new Date(a.startDatetime) - new Date(b.startDatetime));
      } else if (sortBy === 'price_low_to_high') {
        results.sort((a, b) => (a.price || 0) - (b.price || 0));
      }
    }

    return results;
  }

  getWorkshopDetails(workshopEventId) {
    const workshops = this._getFromStorage('workshop_events');
    const locations = this._getFromStorage('locations');

    const w = workshops.find((we) => we.id === workshopEventId);
    if (!w) return null;

    const loc = locations.find((l) => l.id === w.location_id) || null;

    const locationObj = loc
      ? {
          locationId: loc.id,
          name: loc.name,
          addressLine1: loc.address_line1,
          city: loc.city,
          state: loc.state,
          zipCode: loc.zip_code,
          hasFreeParking: !!loc.has_free_parking
        }
      : null;

    const result = {
      workshopEventId: w.id,
      title: w.title,
      description: w.description || '',
      keywordTags: Array.isArray(w.keyword_tags) ? w.keyword_tags : [],
      startDatetime: w.start_datetime,
      endDatetime: w.end_datetime,
      durationMinutes: w.duration_minutes,
      dayOfWeek: w.day_of_week,
      price: w.price,
      currency: w.currency || 'USD',
      status: w.status,
      capacity: w.capacity != null ? w.capacity : null,
      remainingSpots: w.remaining_spots != null ? w.remaining_spots : null,
      location: locationObj
    };

    this._resolveForeignKeysForObject(result.location || {});
    this._resolveForeignKeysForObject(result);
    return result;
  }

  addWorkshopToCart(workshopEventId, tickets) {
    const workshops = this._getFromStorage('workshop_events');
    const w = workshops.find((we) => we.id === workshopEventId);
    if (!w) {
      return { success: false, message: 'Workshop not found', cart: null };
    }

    const qty = typeof tickets === 'number' && tickets > 0 ? tickets : 1;

    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items');

    const dateTimeDisplay = `${w.start_datetime} - ${w.end_datetime}`;

    const cartItem = {
      id: this._generateId('cartitem'),
      cart_id: cart.id,
      item_type: 'workshop_event',
      item_id: w.id,
      name: w.title,
      date_time_display: dateTimeDisplay,
      unit_price: w.price,
      quantity: qty,
      line_subtotal: (w.price || 0) * qty
    };

    cartItems.push(cartItem);
    this._saveToStorage('cart_items', cartItems);

    if (!Array.isArray(cart.items)) cart.items = [];
    cart.items.push(cartItem.id);

    this._calculateCartTotals(cart);
    this._updateCart(cart);

    const summary = this._buildCartSummary(cart);

    return {
      success: true,
      message: 'Workshop added to cart',
      cart: summary
    };
  }

  // --- Memberships ---

  getMembershipFilterOptions() {
    const planTypes = ['monthly', 'annual', 'intro_offer'];
    const billingFrequencies = ['monthly', 'yearly'];
    const sortOptions = [
      { value: 'price_low_to_high', label: 'Price: Low to High' },
      { value: 'price_high_to_low', label: 'Price: High to Low' },
      { value: 'classes_high_to_low', label: 'Classes per Month: High to Low' }
    ];

    return {
      planTypes,
      billingFrequencies,
      sortOptions
    };
  }

  _filterAndSortMembershipPlans({
    planType,
    billingFrequency,
    minClassesPerMonth,
    contractType,
    cancelAnytimeOnly,
    sortBy,
    includeInactive
  }) {
    const membershipPlans = this._getFromStorage('membership_plans');

    let filtered = membershipPlans.filter((m) => includeInactive || m.is_active);

    if (planType) {
      filtered = filtered.filter((m) => m.plan_type === planType);
    }
    if (billingFrequency) {
      filtered = filtered.filter((m) => m.billing_frequency === billingFrequency);
    }
    if (minClassesPerMonth != null) {
      filtered = filtered.filter((m) => (m.classes_per_month || 0) >= minClassesPerMonth);
    }
    if (contractType) {
      filtered = filtered.filter((m) => m.contract_type === contractType);
    }
    if (cancelAnytimeOnly) {
      filtered = filtered.filter((m) => !!m.cancel_anytime);
    }

    if (sortBy) {
      if (sortBy === 'price_low_to_high') {
        filtered.sort((a, b) => (a.price_per_period || 0) - (b.price_per_period || 0));
      } else if (sortBy === 'price_high_to_low') {
        filtered.sort((a, b) => (b.price_per_period || 0) - (a.price_per_period || 0));
      } else if (sortBy === 'classes_high_to_low') {
        filtered.sort((a, b) => (b.classes_per_month || 0) - (a.classes_per_month || 0));
      }
    }

    return filtered;
  }

  listMembershipPlans(
    planType,
    billingFrequency,
    minClassesPerMonth,
    contractType,
    cancelAnytimeOnly,
    sortBy,
    includeInactive
  ) {
    const plans = this._filterAndSortMembershipPlans({
      planType,
      billingFrequency,
      minClassesPerMonth,
      contractType,
      cancelAnytimeOnly,
      sortBy,
      includeInactive: !!includeInactive
    });

    const results = plans.map((m) => {
      const obj = {
        membershipPlanId: m.id,
        name: m.name,
        descriptionSnippet: m.description ? String(m.description).slice(0, 140) : '',
        pricePerPeriod: m.price_per_period,
        currency: m.currency || 'USD',
        planType: m.plan_type,
        billingFrequency: m.billing_frequency,
        classesPerMonth: m.classes_per_month,
        contractType: m.contract_type,
        contractLengthMonths: m.contract_length_months || null,
        cancelAnytime: !!m.cancel_anytime,
        perks: Array.isArray(m.perks) ? m.perks : [],
        isActive: !!m.is_active,
        isFeatured: !!m.is_featured
      };
      this._resolveForeignKeysForObject(obj);
      return obj;
    });

    return results;
  }

  getMembershipDetails(membershipPlanId) {
    const membershipPlans = this._getFromStorage('membership_plans');
    const m = membershipPlans.find((mp) => mp.id === membershipPlanId);
    if (!m) return null;

    const result = {
      membershipPlanId: m.id,
      name: m.name,
      description: m.description || '',
      pricePerPeriod: m.price_per_period,
      currency: m.currency || 'USD',
      planType: m.plan_type,
      billingFrequency: m.billing_frequency,
      classesPerMonth: m.classes_per_month,
      contractType: m.contract_type,
      contractLengthMonths: m.contract_length_months || null,
      cancelAnytime: !!m.cancel_anytime,
      perks: Array.isArray(m.perks) ? m.perks : [],
      isActive: !!m.is_active,
      isFeatured: !!m.is_featured
    };

    this._resolveForeignKeysForObject(result);
    return result;
  }

  startMembershipCheckout(membershipPlanId, quantity) {
    const membershipPlans = this._getFromStorage('membership_plans');
    const m = membershipPlans.find((mp) => mp.id === membershipPlanId && mp.is_active);
    if (!m) {
      return {
        checkoutCreated: false,
        checkoutMode: 'guest',
        membershipStartDate: null,
        membershipStartDateOptions: [],
        items: [],
        subtotalAmount: 0,
        discountAmount: 0,
        totalAmount: 0
      };
    }

    const qty = typeof quantity === 'number' && quantity > 0 ? quantity : 1;

    const session = this._createCheckoutSession({ reset: true, sourceCartId: null, checkoutMode: 'guest' });

    const checkoutItem = {
      id: this._generateId('checkoutitem'),
      checkout_session_id: session.id,
      item_type: 'membership_plan',
      item_id: m.id,
      name: m.name,
      date_time_display: null,
      unit_price: m.price_per_period,
      quantity: qty,
      line_subtotal: (m.price_per_period || 0) * qty
    };

    this._setCheckoutItems(session, [checkoutItem]);

    const options = this._buildMembershipStartDateOptions();
    const defaultDate = options[0] || this._toISODate(new Date());
    session.membership_start_date = defaultDate;
    session.discount_amount = 0;
    this._calculateCheckoutTotals(session);
    this._updateCheckoutSession(session);

    const summary = this._buildCheckoutSummary(session);

    return {
      checkoutCreated: true,
      checkoutMode: summary.checkoutMode,
      membershipStartDate: summary.membershipStartDate,
      membershipStartDateOptions: summary.membershipStartDateOptions,
      items: summary.items,
      subtotalAmount: summary.subtotalAmount,
      discountAmount: summary.discountAmount,
      totalAmount: summary.totalAmount
    };
  }

  // --- Class passes ---

  listClassPassProducts(passType, includeInactive) {
    const products = this._getFromStorage('class_pass_products');

    let filtered = products.filter((p) => includeInactive || p.is_active);
    if (passType) {
      filtered = filtered.filter((p) => p.pass_type === passType);
    }

    const results = filtered.map((p) => {
      const obj = {
        classPassProductId: p.id,
        name: p.name,
        descriptionSnippet: p.description ? String(p.description).slice(0, 140) : '',
        numClasses: p.num_classes,
        price: p.price,
        currency: p.currency || 'USD',
        validityDays: p.validity_days || null,
        passType: p.pass_type,
        isActive: !!p.is_active,
        isFeatured: !!p.is_featured
      };
      this._resolveForeignKeysForObject(obj);
      return obj;
    });

    return results;
  }

  getClassPassDetails(classPassProductId) {
    const products = this._getFromStorage('class_pass_products');
    const p = products.find((cp) => cp.id === classPassProductId);
    if (!p) return null;

    const promoBanners = this._getFromStorage('promo_banners');
    const promoCodes = this._getFromStorage('promo_codes');

    const now = new Date();
    let applicablePromo = null;

    promoBanners
      .filter((b) => b.is_active)
      .forEach((b) => {
        const startOk = !b.start_datetime || new Date(b.start_datetime) <= now;
        const endOk = !b.end_datetime || new Date(b.end_datetime) >= now;
        if (!startOk || !endOk) return;
        if (!b.promo_code_id) return;
        const promo = promoCodes.find((pc) => pc.id === b.promo_code_id && pc.is_active);
        if (!promo) return;
        if (promo.applicable_to === 'all_items' || promo.applicable_to === 'passes_only') {
          if (!applicablePromo) applicablePromo = promo;
        }
      });

    const result = {
      classPassProductId: p.id,
      name: p.name,
      description: p.description || '',
      numClasses: p.num_classes,
      price: p.price,
      currency: p.currency || 'USD',
      validityDays: p.validity_days || null,
      passType: p.pass_type,
      isActive: !!p.is_active,
      isFeatured: !!p.is_featured,
      promoEligible: !!applicablePromo,
      currentPromoCode: applicablePromo ? applicablePromo.code : null
    };

    this._resolveForeignKeysForObject(result);
    return result;
  }

  addClassPassToCart(classPassProductId, quantity) {
    const products = this._getFromStorage('class_pass_products');
    const p = products.find((cp) => cp.id === classPassProductId);
    if (!p) {
      return { success: false, message: 'Pass not found', cart: null };
    }

    const qty = typeof quantity === 'number' && quantity > 0 ? quantity : 1;

    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items');

    const cartItem = {
      id: this._generateId('cartitem'),
      cart_id: cart.id,
      item_type: 'class_pass_product',
      item_id: p.id,
      name: p.name,
      date_time_display: null,
      unit_price: p.price,
      quantity: qty,
      line_subtotal: (p.price || 0) * qty
    };

    cartItems.push(cartItem);
    this._saveToStorage('cart_items', cartItems);

    if (!Array.isArray(cart.items)) cart.items = [];
    cart.items.push(cartItem.id);

    this._calculateCartTotals(cart);
    this._updateCart(cart);

    const summary = this._buildCartSummary(cart);

    return {
      success: true,
      message: 'Class pass added to cart',
      cart: summary
    };
  }

  // --- Instructors ---

  getInstructorFilterOptions() {
    const instructors = this._getFromStorage('instructors');

    const ratingThresholds = [4.0, 4.5, 5.0];
    const minReviewCountOptions = [10, 20, 50];

    const styleSet = new Set();
    instructors.forEach((i) => {
      (i.primary_styles || []).forEach((s) => styleSet.add(s));
    });
    const styleOptions = Array.from(styleSet);

    return {
      ratingThresholds,
      minReviewCountOptions,
      styleOptions
    };
  }

  searchInstructors(minRating, minReviewCount, primaryStyle, sortBy) {
    const instructors = this._getFromStorage('instructors');

    let filtered = instructors.filter((i) => i.is_active);

    if (minRating != null) {
      filtered = filtered.filter((i) => (i.average_rating || 0) >= minRating);
    }
    if (minReviewCount != null) {
      filtered = filtered.filter((i) => (i.review_count || 0) >= minReviewCount);
    }
    if (primaryStyle) {
      filtered = filtered.filter((i) => Array.isArray(i.primary_styles) && i.primary_styles.includes(primaryStyle));
    }

    if (sortBy) {
      if (sortBy === 'rating_high_to_low') {
        filtered.sort((a, b) => (b.average_rating || 0) - (a.average_rating || 0));
      } else if (sortBy === 'review_count_high_to_low') {
        filtered.sort((a, b) => (b.review_count || 0) - (a.review_count || 0));
      }
    }

    const results = filtered.map((i) => {
      const obj = {
        instructorId: i.id,
        name: i.name,
        photoUrl: i.photo_url || null,
        primaryStyles: Array.isArray(i.primary_styles) ? i.primary_styles : [],
        averageRating: i.average_rating,
        reviewCount: i.review_count,
        isFeatured: !!i.is_featured
      };
      this._resolveForeignKeysForObject(obj);
      return obj;
    });

    return results;
  }

  getInstructorProfile(instructorId) {
    const instructors = this._getFromStorage('instructors');
    const i = instructors.find((inst) => inst.id === instructorId);
    if (!i) return null;

    const result = {
      instructorId: i.id,
      name: i.name,
      bio: i.bio || '',
      photoUrl: i.photo_url || null,
      primaryStyles: Array.isArray(i.primary_styles) ? i.primary_styles : [],
      averageRating: i.average_rating,
      reviewCount: i.review_count,
      certifications: Array.isArray(i.certifications) ? i.certifications : [],
      isActive: !!i.is_active
    };

    this._resolveForeignKeysForObject(result);
    return result;
  }

  getInstructorSchedule(instructorId, dayFilter, timeOfDayBucket) {
    const classSessions = this._getFromStorage('class_sessions');

    let filtered = classSessions.filter((c) => c.instructor_id === instructorId && c.status === 'active');

    if (dayFilter) {
      if (dayFilter === 'weekend') {
        filtered = filtered.filter((c) => c.day_of_week === 'saturday' || c.day_of_week === 'sunday');
      } else {
        filtered = filtered.filter((c) => c.day_of_week === dayFilter);
      }
    }

    if (timeOfDayBucket) {
      filtered = filtered.filter((c) => c.time_of_day_bucket === timeOfDayBucket);
    }

    const locations = this._getFromStorage('locations');

    const results = filtered.map((c) => {
      const loc = locations.find((l) => l.id === c.location_id) || {};
      const obj = {
        classSessionId: c.id,
        name: c.name,
        level: c.level,
        classType: c.class_type,
        startDatetime: c.start_datetime,
        endDatetime: c.end_datetime,
        durationMinutes: c.duration_minutes,
        dayOfWeek: c.day_of_week,
        timeOfDayBucket: c.time_of_day_bucket,
        locationName: loc.name || null,
        locationCity: loc.city || null,
        price: c.price,
        currency: c.currency || 'USD',
        remainingSpots: c.remaining_spots
      };
      this._resolveForeignKeysForObject(obj);
      return obj;
    });

    return results;
  }

  // --- Locations ---

  searchLocations(zipCodeOrAddress, maxDistanceMiles) {
    const locations = this._getFromStorage('locations');
    const queryZip = zipCodeOrAddress ? zipCodeOrAddress.trim() : '';

    const results = [];

    locations.forEach((loc) => {
      let distanceMiles = null;
      if (queryZip) {
        distanceMiles = this._calculateDistanceFromZip(queryZip, loc);
        if (maxDistanceMiles != null && distanceMiles != null && distanceMiles > maxDistanceMiles) {
          return;
        }
      }

      const obj = {
        locationId: loc.id,
        name: loc.name,
        addressLine1: loc.address_line1,
        addressLine2: loc.address_line2 || null,
        city: loc.city,
        state: loc.state,
        zipCode: loc.zip_code,
        distanceMiles,
        hasFreeParking: !!loc.has_free_parking,
        openingHoursSummary: loc.opening_hours_summary || null
      };
      this._resolveForeignKeysForObject(obj);
      results.push(obj);
    });

    // Sort by distance if available
    results.sort((a, b) => {
      const da = a.distanceMiles != null ? a.distanceMiles : Number.MAX_VALUE;
      const db = b.distanceMiles != null ? b.distanceMiles : Number.MAX_VALUE;
      return da - db;
    });

    return results;
  }

  getLocationDetails(locationId) {
    const locations = this._getFromStorage('locations');
    const amenities = this._getFromStorage('location_amenities');

    const loc = locations.find((l) => l.id === locationId);
    if (!loc) return null;

    const locAmenities = amenities
      .filter((a) => a.location_id === loc.id)
      .map((a) => ({ amenityType: a.amenity_type }));

    const result = {
      locationId: loc.id,
      name: loc.name,
      description: loc.description || '',
      addressLine1: loc.address_line1,
      addressLine2: loc.address_line2 || null,
      city: loc.city,
      state: loc.state,
      zipCode: loc.zip_code,
      latitude: loc.latitude != null ? loc.latitude : null,
      longitude: loc.longitude != null ? loc.longitude : null,
      phone: loc.phone || null,
      email: loc.email || null,
      openingHoursSummary: loc.opening_hours_summary || null,
      hasFreeParking: !!loc.has_free_parking,
      amenities: locAmenities
    };

    this._resolveForeignKeysForObject(result);
    return result;
  }

  getLocationSchedule(locationId, date, level, timeOfDayFilter) {
    const classSessions = this._getFromStorage('class_sessions');

    const targetDate = date ? new Date(date) : null;
    const results = [];

    classSessions.forEach((c) => {
      if (c.location_id !== locationId) return;
      if (c.status !== 'active') return;

      if (targetDate) {
        const sd = new Date(c.start_datetime);
        if (
          sd.getFullYear() !== targetDate.getFullYear() ||
          sd.getMonth() !== targetDate.getMonth() ||
          sd.getDate() !== targetDate.getDate()
        ) {
          return;
        }
      }

      if (level && c.level !== level) return;

      if (timeOfDayFilter) {
        if (timeOfDayFilter === 'before_17_00') {
          const sd = new Date(c.start_datetime);
          const h = sd.getHours();
          const m = sd.getMinutes();
          if (h > 17 || (h === 17 && m > 0)) return;
        } else {
          if (c.time_of_day_bucket !== timeOfDayFilter) return;
        }
      }

      const obj = {
        classSessionId: c.id,
        name: c.name,
        level: c.level,
        classType: c.class_type,
        startDatetime: c.start_datetime,
        endDatetime: c.end_datetime,
        durationMinutes: c.duration_minutes,
        dayOfWeek: c.day_of_week,
        timeOfDayBucket: c.time_of_day_bucket,
        price: c.price,
        currency: c.currency || 'USD',
        remainingSpots: c.remaining_spots
      };
      this._resolveForeignKeysForObject(obj);
      results.push(obj);
    });

    results.sort((a, b) => new Date(a.startDatetime) - new Date(b.startDatetime));
    return results;
  }

  // --- FAQ & Contact ---

  searchFAQArticles(query, category) {
    const faqArticles = this._getFromStorage('faq_articles');
    const q = query ? String(query).toLowerCase() : '';

    let filtered = faqArticles.filter((f) => f.is_published);

    if (category) {
      filtered = filtered.filter((f) => f.category === category);
    }

    if (q) {
      filtered = filtered.filter((f) => {
        const title = (f.title || '').toLowerCase();
        const body = (f.body || '').toLowerCase();
        const keywords = Array.isArray(f.keywords) ? f.keywords.join(' ').toLowerCase() : '';
        return title.includes(q) || body.includes(q) || keywords.includes(q);
      });
    }

    const results = filtered.map((f) => {
      const obj = {
        faqArticleId: f.id,
        title: f.title,
        slug: f.slug,
        category: f.category || null,
        snippet: f.body ? String(f.body).slice(0, 160) : ''
      };
      this._resolveForeignKeysForObject(obj);
      return obj;
    });

    return results;
  }

  getFAQArticleDetails(faqArticleId) {
    const faqArticles = this._getFromStorage('faq_articles');
    const f = faqArticles.find((fa) => fa.id === faqArticleId);
    if (!f) return null;

    const result = {
      faqArticleId: f.id,
      title: f.title,
      slug: f.slug,
      category: f.category || null,
      body: f.body || '',
      keywords: Array.isArray(f.keywords) ? f.keywords : [],
      createdAt: f.created_at,
      updatedAt: f.updated_at || null
    };

    this._resolveForeignKeysForObject(result);
    return result;
  }

  submitContactMessage(subject, message, name, email, relatedFaqArticleId) {
    const contactMessages = this._getFromStorage('contact_messages');

    const cm = {
      id: this._generateId('contact'),
      subject: subject || '',
      message: message || '',
      name: name || '',
      email: email || '',
      created_at: this._nowISO(),
      status: 'received',
      related_faq_article_id: relatedFaqArticleId || null
    };

    contactMessages.push(cm);
    this._saveToStorage('contact_messages', contactMessages);

    const result = {
      success: true,
      contactMessageId: cm.id,
      status: cm.status,
      confirmationMessage: 'Your message has been received.'
    };

    this._resolveForeignKeysForObject(result);
    return result;
  }

  // --- Cart interfaces ---

  getCartSummary() {
    const cart = this._getOrCreateCart();
    this._calculateCartTotals(cart);
    this._updateCart(cart);
    const summary = this._buildCartSummary(cart);
    return summary;
  }

  updateCartItemQuantity(cartItemId, quantity) {
    const cartItems = this._getFromStorage('cart_items');
    const carts = this._getFromStorage('carts');

    const item = cartItems.find((ci) => ci.id === cartItemId);
    if (!item) {
      const cart = this._getOrCreateCart();
      this._calculateCartTotals(cart);
      this._updateCart(cart);
      return { success: false, cart: this._buildCartSummary(cart) };
    }

    const cart = carts.find((c) => c.id === item.cart_id) || this._getOrCreateCart();

    if (quantity <= 0) {
      // Remove item
      const newCartItems = cartItems.filter((ci) => ci.id !== cartItemId);
      this._saveToStorage('cart_items', newCartItems);
      if (Array.isArray(cart.items)) {
        cart.items = cart.items.filter((id) => id !== cartItemId);
      }
    } else {
      item.quantity = quantity;
      item.line_subtotal = (item.unit_price || 0) * quantity;
      const idx = cartItems.findIndex((ci) => ci.id === cartItemId);
      if (idx !== -1) {
        cartItems[idx] = item;
        this._saveToStorage('cart_items', cartItems);
      }
    }

    this._calculateCartTotals(cart);
    this._updateCart(cart);

    const summary = this._buildCartSummary(cart);

    return {
      success: true,
      cart: summary
    };
  }

  removeCartItem(cartItemId) {
    const cartItems = this._getFromStorage('cart_items');
    const carts = this._getFromStorage('carts');

    const item = cartItems.find((ci) => ci.id === cartItemId);
    const newCartItems = cartItems.filter((ci) => ci.id !== cartItemId);
    this._saveToStorage('cart_items', newCartItems);

    let cart = null;
    if (item) {
      cart = carts.find((c) => c.id === item.cart_id) || null;
      if (cart && Array.isArray(cart.items)) {
        cart.items = cart.items.filter((id) => id !== cartItemId);
        this._calculateCartTotals(cart);
        this._updateCart(cart);
      }
    }

    if (!cart) {
      cart = this._getOrCreateCart();
      this._calculateCartTotals(cart);
      this._updateCart(cart);
    }

    const summary = this._buildCartSummary(cart);

    return {
      success: true,
      cart: summary
    };
  }

  applyPromoCodeToCart(promoCode) {
    const cart = this._getOrCreateCart();
    const cartItems = this._getCartItems(cart);
    const promoCodes = this._getFromStorage('promo_codes');

    const code = promoCode ? String(promoCode).trim() : '';
    const promo = promoCodes.find((p) => p.code === code && p.is_active);

    if (!promo) {
      this._calculateCartTotals(cart);
      this._updateCart(cart);
      return {
        success: false,
        message: 'Invalid promo code',
        cart: this._buildCartSummary(cart)
      };
    }

    const now = new Date();
    const startOk = !promo.start_datetime || new Date(promo.start_datetime) <= now;
    const endOk = !promo.end_datetime || new Date(promo.end_datetime) >= now;
    if (!startOk || !endOk) {
      this._calculateCartTotals(cart);
      this._updateCart(cart);
      return {
        success: false,
        message: 'Promo code is not currently valid',
        cart: this._buildCartSummary(cart)
      };
    }

    const discount = this._calculateDiscountForCart(cart, cartItems, promo);
    if (discount <= 0 && promo.min_order_amount != null) {
      this._calculateCartTotals(cart);
      this._updateCart(cart);
      return {
        success: false,
        message: 'Order does not meet the minimum amount for this promo code',
        cart: this._buildCartSummary(cart)
      };
    }

    cart.applied_promo_code_id = promo.id;
    this._calculateCartTotals(cart);
    this._updateCart(cart);

    const summary = this._buildCartSummary(cart);

    return {
      success: true,
      message: 'Promo code applied',
      cart: summary
    };
  }

  proceedToCheckout(checkoutMode) {
    const cart = this._getOrCreateCart();
    this._calculateCartTotals(cart);
    this._updateCart(cart);

    const cartItems = this._getCartItems(cart);

    const session = this._createCheckoutSession({
      reset: true,
      sourceCartId: cart.id,
      checkoutMode: checkoutMode || 'guest'
    });

    const checkoutItems = cartItems.map((ci) => ({
      id: this._generateId('checkoutitem'),
      checkout_session_id: session.id,
      item_type: ci.item_type,
      item_id: ci.item_id,
      name: ci.name,
      date_time_display: ci.date_time_display || null,
      unit_price: ci.unit_price,
      quantity: ci.quantity,
      line_subtotal: ci.line_subtotal
    }));

    this._setCheckoutItems(session, checkoutItems);
    session.discount_amount = cart.discount_amount || 0;
    this._calculateCheckoutTotals(session);
    this._updateCheckoutSession(session);

    const summary = this._buildCheckoutSummary(session);

    return {
      checkoutMode: summary.checkoutMode,
      items: summary.items,
      subtotalAmount: summary.subtotalAmount,
      discountAmount: summary.discountAmount,
      totalAmount: summary.totalAmount,
      membershipStartDate: summary.membershipStartDate
    };
  }

  getCheckoutSummary() {
    const session = this._getCurrentCheckoutSession();
    const summary = this._buildCheckoutSummary(session);
    return summary;
  }

  setCheckoutMode(checkoutMode) {
    const session = this._getCurrentCheckoutSession() || this._createCheckoutSession({ reset: true, sourceCartId: null, checkoutMode });
    session.checkout_mode = checkoutMode || 'guest';
    this._updateCheckoutSession(session);
    return { checkoutMode: session.checkout_mode };
  }

  updateMembershipStartDateForCheckout(membershipStartDate) {
    const session = this._getCurrentCheckoutSession();
    if (!session) {
      return {
        membershipStartDate: null,
        subtotalAmount: 0,
        discountAmount: 0,
        totalAmount: 0
      };
    }

    session.membership_start_date = membershipStartDate;
    this._calculateCheckoutTotals(session);
    this._updateCheckoutSession(session);

    return {
      membershipStartDate: session.membership_start_date,
      subtotalAmount: session.subtotal_amount || 0,
      discountAmount: session.discount_amount || 0,
      totalAmount: session.total_amount || 0
    };
  }

  confirmCheckoutAndProceedToPayment() {
    const session = this._getCurrentCheckoutSession();
    if (!session) {
      return {
        orderId: null,
        itemsSnapshot: [],
        subtotalAmount: 0,
        discountAmount: 0,
        totalAmount: 0,
        orderStatus: 'failed'
      };
    }

    this._calculateCheckoutTotals(session);
    this._updateCheckoutSession(session);

    const checkoutItems = this._getCheckoutItems(session);

    const itemsSnapshot = checkoutItems.map((ci) => {
      const line = {
        itemType: ci.item_type,
        itemId: ci.item_id,
        name: ci.name,
        dateTimeDisplay: ci.date_time_display || null,
        unitPrice: ci.unit_price,
        quantity: ci.quantity,
        lineSubtotal: ci.line_subtotal
      };
      this._attachItemForLine(line);
      this._resolveForeignKeysForObject(line);
      return line;
    });

    const orders = this._getFromStorage('orders');

    const order = {
      id: this._generateId('order'),
      checkout_session_id: session.id,
      items_snapshot: itemsSnapshot,
      subtotal_amount: session.subtotal_amount || 0,
      discount_amount: session.discount_amount || 0,
      total_amount: session.total_amount || 0,
      status: 'pending_payment',
      created_at: this._nowISO(),
      updated_at: this._nowISO()
    };

    orders.push(order);
    this._saveToStorage('orders', orders);

    session.status = 'completed';
    this._updateCheckoutSession(session);

    localStorage.setItem('active_order_id', order.id);

    return {
      orderId: order.id,
      itemsSnapshot,
      subtotalAmount: order.subtotal_amount,
      discountAmount: order.discount_amount,
      totalAmount: order.total_amount,
      orderStatus: order.status
    };
  }

  getPaymentSummary(orderId) {
    const orders = this._getFromStorage('orders');
    const order = orders.find((o) => o.id === orderId);
    if (!order) {
      return {
        orderId: null,
        itemsSnapshot: [],
        subtotalAmount: 0,
        discountAmount: 0,
        totalAmount: 0
      };
    }

    const itemsSnapshot = (order.items_snapshot || []).map((line) => {
      const cloned = this._clone(line);
      this._attachItemForLine(cloned);
      this._resolveForeignKeysForObject(cloned);
      return cloned;
    });

    return {
      orderId: order.id,
      itemsSnapshot,
      subtotalAmount: order.subtotal_amount,
      discountAmount: order.discount_amount,
      totalAmount: order.total_amount
    };
  }

  submitPayment(orderId, paymentMethod, cardDetails) {
    const orders = this._getFromStorage('orders');
    const order = orders.find((o) => o.id === orderId);
    if (!order) {
      return {
        paymentId: null,
        status: 'failed',
        message: 'Order not found'
      };
    }

    const payments = this._getFromStorage('payments');

    const payment = {
      id: this._generateId('payment'),
      order_id: order.id,
      amount: order.total_amount || 0,
      currency: 'USD',
      payment_method: paymentMethod || 'card',
      status: 'pending',
      created_at: this._nowISO(),
      updated_at: this._nowISO()
    };

    // Simulate success without processing card details (metadata only)
    payment.status = 'succeeded';
    payment.updated_at = this._nowISO();

    payments.push(payment);
    this._saveToStorage('payments', payments);

    order.status = payment.status === 'succeeded' ? 'paid' : 'failed';
    order.updated_at = this._nowISO();
    this._saveToStorage('orders', orders);

    return {
      paymentId: payment.id,
      status: payment.status,
      message: payment.status === 'succeeded' ? 'Payment successful' : 'Payment failed'
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