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
    // Ensure all entity collections exist in localStorage
    const ensure = (key, defaultValue) => {
      if (localStorage.getItem(key) === null) {
        localStorage.setItem(key, JSON.stringify(defaultValue));
      }
    };

    ensure('workshops', []); // Workshop
    ensure('workshop_sessions', []); // WorkshopSession
    ensure('categories', []); // WorkshopCategory
    ensure('studio_locations', []); // StudioLocation
    ensure('bundles', []); // Bundle
    ensure('bundle_included_sessions', []); // BundleIncludedSession
    ensure('gift_vouchers', []); // GiftVoucher
    ensure('cart', null); // Single Cart object or null
    ensure('cart_items', []); // CartItem
    ensure('orders', []); // Order
    ensure('order_items', []); // OrderItem
    ensure('promo_codes', []); // PromoCode
    ensure('payment_cards', []); // PaymentCard
    ensure('contact_inquiries', []); // for submitContactInquiry

    // Global ID counter
    if (localStorage.getItem('idCounter') === null) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, fallback) {
    const raw = localStorage.getItem(key);
    if (raw === null || raw === undefined) {
      return fallback !== undefined ? fallback : null;
    }
    try {
      return JSON.parse(raw);
    } catch (e) {
      return fallback !== undefined ? fallback : null;
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

  _parseDateOnly(dateStr) {
    // dateStr in 'YYYY-MM-DD' or ISO datetime
    if (!dateStr) return null;
    if (dateStr.length === 10) {
      // treat as local date at midnight
      return new Date(dateStr + 'T00:00:00Z');
    }
    return new Date(dateStr);
  }

  _compareDatesOnly(a, b) {
    // Compare by date part only (ignore time)
    const da = this._parseDateOnly(a);
    const db = this._parseDateOnly(b);
    if (!da || !db) return 0;
    const ya = da.getUTCFullYear();
    const yb = db.getUTCFullYear();
    if (ya !== yb) return ya - yb;
    const ma = da.getUTCMonth();
    const mb = db.getUTCMonth();
    if (ma !== mb) return ma - mb;
    const daDay = da.getUTCDate();
    const dbDay = db.getUTCDate();
    return daDay - dbDay;
  }

  _dayOfWeek(dateStr) {
    const d = this._parseDateOnly(dateStr);
    if (!d) return null;
    return d.getUTCDay(); // 0=Sun ... 6=Sat
  }

  // ---------- Cart helpers ----------

  _getOrCreateCart() {
    let cart = this._getFromStorage('cart', null);
    if (!cart) {
      cart = {
        id: this._generateId('cart'),
        items: [],
        subtotal: 0,
        discount_total: 0,
        total: 0,
        promo_code: null,
        created_at: this._nowISO(),
        updated_at: null
      };
      this._saveToStorage('cart', cart);
    }
    return cart;
  }

  _recalculateCartTotals() {
    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items', []);
    const itemsForCart = cartItems.filter(ci => ci.cart_id === cart.id);

    let subtotal = 0;
    itemsForCart.forEach(item => {
      const quantity = typeof item.quantity === 'number' ? item.quantity : 0;
      const price = typeof item.price_per_unit === 'number' ? item.price_per_unit : 0;
      item.subtotal = price * quantity;
      subtotal += item.subtotal;
    });

    // Persist updated cart items
    const updatedAll = cartItems.map(ci => {
      const found = itemsForCart.find(i => i.id === ci.id);
      return found || ci;
    });

    let discount = 0;
    if (cart.promo_code) {
      const promoValidation = this._validatePromoCode(cart.promo_code, subtotal);
      if (promoValidation.valid && promoValidation.promo) {
        const promo = promoValidation.promo;
        if (promo.discount_type === 'percentage') {
          discount = subtotal * (promo.discount_value / 100);
        } else if (promo.discount_type === 'fixed_amount') {
          discount = promo.discount_value;
        }
        if (discount > subtotal) discount = subtotal;
      } else {
        // Invalid or expired promo; clear it
        cart.promo_code = null;
      }
    }

    cart.subtotal = subtotal;
    cart.discount_total = discount;
    cart.total = subtotal - discount;
    cart.updated_at = this._nowISO();

    this._saveToStorage('cart_items', updatedAll);
    this._saveToStorage('cart', cart);

    return { cart, items: itemsForCart };
  }

  _validatePromoCode(code, cartSubtotal) {
    const promoCodes = this._getFromStorage('promo_codes', []);
    if (!code) {
      return { valid: false, promo: null, reason: 'No code provided' };
    }
    const normalized = String(code).toLowerCase();
    const promo = promoCodes.find(p => String(p.code || '').toLowerCase() === normalized);
    if (!promo) {
      return { valid: false, promo: null, reason: 'Promo code not found' };
    }
    if (!promo.is_active) {
      return { valid: false, promo: null, reason: 'Promo code is not active' };
    }
    const now = new Date();
    if (promo.starts_at) {
      const starts = new Date(promo.starts_at);
      if (now < starts) {
        return { valid: false, promo, reason: 'Promo code not yet valid' };
      }
    }
    if (promo.ends_at) {
      const ends = new Date(promo.ends_at);
      if (now > ends) {
        return { valid: false, promo, reason: 'Promo code expired' };
      }
    }
    if (typeof promo.max_uses === 'number' && typeof promo.times_used === 'number') {
      if (promo.times_used >= promo.max_uses) {
        return { valid: false, promo, reason: 'Promo code usage limit reached' };
      }
    }
    if (typeof promo.min_order_total === 'number') {
      if (cartSubtotal < promo.min_order_total) {
        return { valid: false, promo, reason: 'Order total below promo minimum' };
      }
    }
    return { valid: true, promo, reason: null };
  }

  _createOrderFromCart(cart, items, contactName, contactEmail, contactPhone, notes, paymentMethod, paymentCardId) {
    const orderId = this._generateId('order');
    const orderNumber = 'B' + Date.now();
    const createdAt = this._nowISO();

    const order = {
      id: orderId,
      order_number: orderNumber,
      created_at: createdAt,
      status: 'confirmed',
      payment_status: paymentMethod === 'pay_at_studio' ? 'pay_at_studio' : 'unpaid',
      payment_method: paymentMethod,
      promo_code: cart.promo_code || null,
      discount_total: cart.discount_total || 0,
      subtotal: cart.subtotal || 0,
      total: cart.total || 0,
      contact_name: contactName || null,
      contact_email: contactEmail || null,
      contact_phone: contactPhone || null,
      notes: notes || null,
      payment_card_id: paymentCardId || null,
      confirmation_sent: false,
      confirmation_pdf_url: null
    };

    const orderItems = items.map(ci => ({
      id: this._generateId('order_item'),
      order_id: orderId,
      item_type: ci.item_type,
      workshop_session_id: ci.workshop_session_id || null,
      bundle_id: ci.bundle_id || null,
      gift_voucher_id: ci.gift_voucher_id || null,
      title: ci.title,
      date_display: ci.date_display || null,
      time_display: ci.time_display || null,
      location_name: ci.location_name || null,
      participant_count: ci.participant_count || null,
      adult_count: ci.adult_count || null,
      child_count: ci.child_count || null,
      price_per_unit: ci.price_per_unit,
      quantity: ci.quantity,
      subtotal: ci.subtotal
    }));

    return { order, orderItems };
  }

  _processPayment(order, paymentMethod, paymentCardId, creditCard, saveCard) {
    const paymentCards = this._getFromStorage('payment_cards', []);
    let updatedOrder = { ...order };
    let usedCardId = paymentCardId || null;

    if (paymentMethod === 'pay_at_studio') {
      updatedOrder.payment_method = 'pay_at_studio';
      updatedOrder.payment_status = 'pay_at_studio';
      this._saveToStorage('payment_cards', paymentCards);
      return { success: true, order: updatedOrder, payment_card_id: null };
    }

    if (paymentMethod === 'credit_card') {
      updatedOrder.payment_method = 'credit_card';

      if (paymentCardId) {
        const existing = paymentCards.find(pc => pc.id === paymentCardId);
        if (!existing) {
          return { success: false, order, payment_card_id: null, message: 'Saved card not found' };
        }
        existing.last_used_at = this._nowISO();
        updatedOrder.payment_card_id = existing.id;
      } else {
        if (!creditCard || !creditCard.cardNumber || !creditCard.cardholderName) {
          return { success: false, order, payment_card_id: null, message: 'Incomplete credit card details' };
        }
        const num = String(creditCard.cardNumber);
        const last4 = num.slice(-4);
        const masked = '**** **** **** ' + last4;
        const newCard = {
          id: this._generateId('card'),
          cardholder_name: creditCard.cardholderName,
          masked_number: masked,
          brand: 'card',
          expiry_month: creditCard.expiryMonth || 1,
          expiry_year: creditCard.expiryYear || (new Date().getFullYear() + 1),
          is_saved: !!saveCard,
          created_at: this._nowISO(),
          last_used_at: this._nowISO()
        };
        if (saveCard) {
          paymentCards.push(newCard);
        }
        usedCardId = newCard.id;
        updatedOrder.payment_card_id = usedCardId;
      }

      // Simulate successful payment
      updatedOrder.payment_status = 'paid';
      this._saveToStorage('payment_cards', paymentCards);
      return { success: true, order: updatedOrder, payment_card_id: usedCardId };
    }

    return { success: false, order, payment_card_id: null, message: 'Unsupported payment method' };
  }

  _clearCartAfterOrder(cartId) {
    const cart = this._getFromStorage('cart', null);
    const cartItems = this._getFromStorage('cart_items', []);
    if (cart && cart.id === cartId) {
      // Remove cart items belonging to this cart
      const remainingItems = cartItems.filter(ci => ci.cart_id !== cartId);
      this._saveToStorage('cart_items', remainingItems);
      // Clear cart
      this._saveToStorage('cart', null);
    }
  }

  // ---------- Interface implementations ----------

  // getPrimaryNavigationCategories
  getPrimaryNavigationCategories() {
    const categories = this._getFromStorage('categories', []);
    const workshopCategories = categories
      .filter(c => c.is_primary_nav || c.slug === 'all' || c.slug === 'family_kids' || c.slug === 'advanced_masterclasses')
      .sort((a, b) => {
        const sa = typeof a.sort_order === 'number' ? a.sort_order : 0;
        const sb = typeof b.sort_order === 'number' ? b.sort_order : 0;
        return sa - sb;
      });

    const specialSections = [
      {
        slug: 'packages_bundles',
        label: 'Packages & Bundles',
        description: 'Save with multi-session batik workshop bundles.'
      },
      {
        slug: 'gift_vouchers',
        label: 'Gift Vouchers',
        description: 'Give the gift of a batik workshop experience.'
      }
    ];

    return {
      workshop_categories: workshopCategories,
      special_sections: specialSections
    };
  }

  // getHomepageOverview
  getHomepageOverview() {
    const workshops = this._getFromStorage('workshops', []);
    const sessions = this._getFromStorage('workshop_sessions', []);
    const locations = this._getFromStorage('studio_locations', []);
    const bundles = this._getFromStorage('bundles', []);

    // Featured workshops: pick up to 6 highest-rated active workshops
    const activeWorkshops = workshops.filter(w => w.is_active !== false);
    const sortedByRating = [...activeWorkshops].sort((a, b) => {
      const ra = typeof a.rating_average === 'number' ? a.rating_average : 0;
      const rb = typeof b.rating_average === 'number' ? b.rating_average : 0;
      if (rb !== ra) return rb - ra;
      const ca = typeof a.rating_count === 'number' ? a.rating_count : 0;
      const cb = typeof b.rating_count === 'number' ? b.rating_count : 0;
      return cb - ca;
    });

    const featuredWorkshops = sortedByRating.slice(0, 6).map(w => {
      const wsessions = sessions
        .filter(s => s.workshop_id === w.id && s.status === 'scheduled')
        .sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime));
      const firstSession = wsessions[0];
      let nextSessionObj = null;
      if (firstSession) {
        const loc = locations.find(l => l.id === firstSession.location_id) || null;
        nextSessionObj = {
          workshop_session_id: firstSession.id,
          date_display: firstSession.start_datetime,
          time_display: firstSession.start_datetime,
          time_of_day: firstSession.time_of_day,
          location_name: loc ? loc.name : null,
          price_from: firstSession.price_per_person
        };
      }
      const badges = [];
      if (w.level === 'beginner') badges.push('Beginner friendly');
      if (w.is_family_friendly) badges.push('Family friendly');
      if (typeof w.rating_average === 'number' && w.rating_average >= 4.5) badges.push('Top rated');
      return {
        workshop: {
          id: w.id,
          title: w.title,
          short_description: w.short_description || '',
          level: w.level,
          category_slug: w.category_slug || 'all',
          rating_average: w.rating_average || 0,
          rating_count: w.rating_count || 0,
          min_price_per_person: w.min_price_per_person || w.base_price_per_person || 0,
          max_price_per_person: w.max_price_per_person || w.base_price_per_person || 0,
          duration_hours: w.duration_hours,
          is_family_friendly: !!w.is_family_friendly,
          age_suitability_label: w.age_suitability_label || '',
          image_url: w.image_url || ''
        },
        next_available_session: nextSessionObj,
        badges
      };
    });

    // Featured bundles: pick up to 6 active bundles
    const activeBundles = bundles.filter(b => b.is_active !== false);
    const featuredBundles = activeBundles.slice(0, 6).map(b => {
      const badges = [];
      if (b.materials_included) badges.push('Materials included');
      if (b.level === 'beginner') badges.push('Beginner');
      if (b.number_of_sessions >= 3) badges.push(b.number_of_sessions + ' sessions');
      return {
        bundle: {
          id: b.id,
          title: b.title,
          short_description: b.short_description || '',
          level: b.level || null,
          number_of_sessions: b.number_of_sessions,
          total_price: b.total_price,
          materials_included: !!b.materials_included,
          image_url: b.image_url || ''
        },
        badges
      };
    });

    const shortcutTiles = [
      {
        id: 'shortcut_beginner',
        title: 'Beginner Workshops',
        description: 'Start your batik journey with beginner-friendly classes.',
        target_type: 'workshop_level',
        target_value: 'beginner'
      },
      {
        id: 'shortcut_family_weekend',
        title: 'Weekend Family Workshops',
        description: 'Fun batik sessions for kids and families.',
        target_type: 'category',
        target_value: 'family_kids'
      },
      {
        id: 'shortcut_gift_vouchers',
        title: 'Gift Vouchers',
        description: 'Send a batik experience as a gift.',
        target_type: 'gift_vouchers',
        target_value: 'gift_vouchers'
      }
    ];

    return {
      featured_workshops: featuredWorkshops,
      featured_bundles: featuredBundles,
      shortcut_tiles: shortcutTiles
    };
  }

  // getWorkshopFilterOptions
  getWorkshopFilterOptions(categorySlug) {
    const locations = this._getFromStorage('studio_locations', []);
    const workshops = this._getFromStorage('workshops', []);
    const sessions = this._getFromStorage('workshop_sessions', []);

    // Price range from sessions if available, otherwise from workshops
    let minPrice = null;
    let maxPrice = null;

    sessions.forEach(s => {
      if (typeof s.price_per_person === 'number') {
        if (minPrice === null || s.price_per_person < minPrice) minPrice = s.price_per_person;
        if (maxPrice === null || s.price_per_person > maxPrice) maxPrice = s.price_per_person;
      }
    });

    if (minPrice === null || maxPrice === null) {
      workshops.forEach(w => {
        const prices = [w.min_price_per_person, w.max_price_per_person, w.base_price_per_person].filter(v => typeof v === 'number');
        prices.forEach(p => {
          if (minPrice === null || p < minPrice) minPrice = p;
          if (maxPrice === null || p > maxPrice) maxPrice = p;
        });
      });
    }

    const levels = [
      { value: 'beginner', label: 'Beginner' },
      { value: 'intermediate', label: 'Intermediate' },
      { value: 'advanced', label: 'Advanced' }
    ];

    const timeOfDayOptions = [
      { value: 'morning', label: 'Morning (before 12:00)' },
      { value: 'afternoon', label: 'Afternoon (12:00 - 5:00)' },
      { value: 'evening', label: 'Evening (after 5:00)' }
    ];

    const durationOptions = [
      { hours: 2, label: '2 hours' },
      { hours: 3, label: '3 hours' },
      { hours: 4, label: '4 hours' }
    ];

    const ratingThresholds = [3, 3.5, 4, 4.5, 5];

    const ageSuitabilityOptions = [
      { min_age: 6, label: 'Age 6+' },
      { min_age: 8, label: 'Age 8+' },
      { min_age: 10, label: 'Age 10+' },
      { min_age: 12, label: 'Age 12+' }
    ];

    const sortOptions = [
      { value: 'rating_desc', label: 'Rating: High to Low' },
      { value: 'price_asc', label: 'Price: Low to High' },
      { value: 'price_desc', label: 'Price: High to Low' },
      { value: 'recommended', label: 'Recommended' },
      { value: 'soonest_date', label: 'Soonest date' }
    ];

    return {
      levels,
      time_of_day_options: timeOfDayOptions,
      locations,
      duration_options: durationOptions,
      rating_thresholds: ratingThresholds,
      price_range: {
        min_price: minPrice || 0,
        max_price: maxPrice || 0,
        currency: workshops[0] && workshops[0].currency ? workshops[0].currency : 'USD'
      },
      age_suitability_options: ageSuitabilityOptions,
      sort_options: sortOptions
    };
  }

  // listWorkshops
  listWorkshops(
    categorySlug,
    query,
    level,
    dateFrom,
    dateTo,
    timeOfDay,
    minPrice,
    maxPrice,
    minRating,
    durationHours,
    locationId,
    minAge,
    familyFriendlyOnly,
    sortBy,
    page,
    pageSize
  ) {
    const workshops = this._getFromStorage('workshops', []);
    const sessions = this._getFromStorage('workshop_sessions', []);
    const categories = this._getFromStorage('categories', []);
    const locations = this._getFromStorage('studio_locations', []);

    const normalizedQuery = query ? String(query).toLowerCase() : null;
    const dateFromObj = dateFrom ? this._parseDateOnly(dateFrom) : null;
    const dateToObj = dateTo ? this._parseDateOnly(dateTo) : null;

    const filteredWorkshops = workshops.filter(w => {
      if (w.is_active === false) return false;
      if (categorySlug && categorySlug !== 'all' && w.category_slug && w.category_slug !== categorySlug) return false;
      if (level && w.level !== level) return false;
      if (typeof minRating === 'number') {
        const r = typeof w.rating_average === 'number' ? w.rating_average : 0;
        if (r < minRating) return false;
      }
      if (familyFriendlyOnly) {
        if (!w.is_family_friendly) return false;
      }
      if (typeof minAge === 'number') {
        if (typeof w.min_age === 'number' && w.min_age > minAge) return false;
      }
      if (normalizedQuery) {
        const title = (w.title || '').toLowerCase();
        const shortDesc = (w.short_description || '').toLowerCase();
        const longDesc = (w.long_description || '').toLowerCase();
        if (!title.includes(normalizedQuery) && !shortDesc.includes(normalizedQuery) && !longDesc.includes(normalizedQuery)) {
          return false;
        }
      }
      return true;
    });

    const resultsWithSessions = filteredWorkshops.map(w => {
      const wsessions = sessions.filter(s => {
        if (s.workshop_id !== w.id) return false;
        if (s.status !== 'scheduled') return false;
        if (timeOfDay && s.time_of_day !== timeOfDay) return false;
        if (durationHours && typeof s.duration_hours === 'number' && s.duration_hours !== durationHours) return false;
        if (locationId && s.location_id !== locationId) return false;

        const start = new Date(s.start_datetime);
        if (dateFromObj) {
          if (start < dateFromObj) return false;
        }
        if (dateToObj) {
          if (start > dateToObj) return false;
        }

        const price = s.price_per_person;
        if (typeof minPrice === 'number' && typeof price === 'number' && price < minPrice) return false;
        if (typeof maxPrice === 'number' && typeof price === 'number' && price > maxPrice) return false;

        return true;
      });

      if (wsessions.length === 0) return null;

      const sortedSessions = wsessions.sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime));
      const nextSession = sortedSessions[0];
      const loc = locations.find(l => l.id === nextSession.location_id) || null;

      const category = categories.find(c => c.slug === w.category_slug) || null;

      return {
        workshop: {
          id: w.id,
          title: w.title,
          slug: w.slug || null,
          short_description: w.short_description || '',
          level: w.level,
          category_slug: w.category_slug || 'all',
          category_name: category ? category.name : null,
          format: w.format,
          duration_hours: w.duration_hours,
          rating_average: w.rating_average || 0,
          rating_count: w.rating_count || 0,
          is_family_friendly: !!w.is_family_friendly,
          age_suitability_label: w.age_suitability_label || '',
          base_price_per_person: w.base_price_per_person,
          min_price_per_person: w.min_price_per_person || w.base_price_per_person,
          max_price_per_person: w.max_price_per_person || w.base_price_per_person,
          currency: w.currency || 'USD',
          image_url: w.image_url || ''
        },
        next_matching_session: {
          workshop_session_id: nextSession.id,
          start_datetime: nextSession.start_datetime,
          end_datetime: nextSession.end_datetime,
          date_display: nextSession.start_datetime,
          time_display: nextSession.start_datetime,
          time_of_day: nextSession.time_of_day,
          location_name: loc ? loc.name : null,
          duration_hours: nextSession.duration_hours || w.duration_hours,
          price_per_person: nextSession.price_per_person,
          capacity_available: nextSession.capacity_available,
          is_weekend: (() => {
            const dow = this._dayOfWeek(nextSession.start_datetime);
            return dow === 0 || dow === 6;
          })()
        },
        badges: []
      };
    }).filter(r => r !== null);

    // Sorting
    const sortKey = sortBy || 'recommended';
    resultsWithSessions.sort((a, b) => {
      if (sortKey === 'rating_desc') {
        const ra = a.workshop.rating_average || 0;
        const rb = b.workshop.rating_average || 0;
        if (rb !== ra) return rb - ra;
        const ca = a.workshop.rating_count || 0;
        const cb = b.workshop.rating_count || 0;
        return cb - ca;
      }
      if (sortKey === 'price_asc' || sortKey === 'price_desc') {
        const pa = a.next_matching_session && typeof a.next_matching_session.price_per_person === 'number'
          ? a.next_matching_session.price_per_person
          : (a.workshop.min_price_per_person || a.workshop.base_price_per_person || 0);
        const pb = b.next_matching_session && typeof b.next_matching_session.price_per_person === 'number'
          ? b.next_matching_session.price_per_person
          : (b.workshop.min_price_per_person || b.workshop.base_price_per_person || 0);
        return sortKey === 'price_asc' ? (pa - pb) : (pb - pa);
      }
      if (sortKey === 'soonest_date') {
        const da = a.next_matching_session ? new Date(a.next_matching_session.start_datetime) : new Date(8640000000000000);
        const db = b.next_matching_session ? new Date(b.next_matching_session.start_datetime) : new Date(8640000000000000);
        return da - db;
      }
      // recommended: sort by rating then soonest date
      const ra = a.workshop.rating_average || 0;
      const rb = b.workshop.rating_average || 0;
      if (rb !== ra) return rb - ra;
      const da = a.next_matching_session ? new Date(a.next_matching_session.start_datetime) : new Date(8640000000000000);
      const db = b.next_matching_session ? new Date(b.next_matching_session.start_datetime) : new Date(8640000000000000);
      return da - db;
    });

    const currentPage = page && page > 0 ? page : 1;
    const size = pageSize && pageSize > 0 ? pageSize : 20;
    const totalResults = resultsWithSessions.length;
    const totalPages = Math.ceil(totalResults / size) || 1;
    const startIndex = (currentPage - 1) * size;
    const pagedResults = resultsWithSessions.slice(startIndex, startIndex + size);

    return {
      results: pagedResults,
      pagination: {
        page: currentPage,
        page_size: size,
        total_results: totalResults,
        total_pages: totalPages
      }
    };
  }

  // getWorkshopDetail
  getWorkshopDetail(workshopId) {
    const workshops = this._getFromStorage('workshops', []);
    const categories = this._getFromStorage('categories', []);
    const locations = this._getFromStorage('studio_locations', []);

    const w = workshops.find(x => x.id === workshopId) || null;
    if (!w) {
      return {
        workshop: null,
        category_name: null,
        level_label: null,
        format_label: null,
        default_location: null,
        materials_included_label: null,
        age_suitability_label: null,
        is_weekend_only: false,
        prerequisites: {
          description: null,
          prerequisite_workshop_id: null,
          prerequisite_workshop_title: null
        }
      };
    }

    const category = categories.find(c => c.slug === w.category_slug) || null;
    const defaultLocation = w.default_location_id ? (locations.find(l => l.id === w.default_location_id) || null) : null;

    const levelLabel = w.level === 'beginner' ? 'Beginner' : (w.level === 'intermediate' ? 'Intermediate' : 'Advanced');
    const formatLabel = w.format === 'masterclass' ? 'Masterclass' : 'Standard workshop';

    const materialsIncludedLabel = w.materials_included ? 'Materials included' : 'Materials not included';

    const prerequisites = {
      description: w.prerequisites_description || null,
      prerequisite_workshop_id: w.prerequisite_workshop_id || null,
      prerequisite_workshop_title: null
    };

    if (w.prerequisite_workshop_id) {
      const prereq = workshops.find(x => x.id === w.prerequisite_workshop_id);
      if (prereq) {
        prerequisites.prerequisite_workshop_title = prereq.title;
      }
    }

    // Determine if typically weekend-only by checking sessions
    const sessions = this._getFromStorage('workshop_sessions', []);
    const wsessions = sessions.filter(s => s.workshop_id === w.id && s.status === 'scheduled');
    let isWeekendOnly = false;
    if (wsessions.length > 0) {
      const allWeekend = wsessions.every(s => {
        const dow = this._dayOfWeek(s.start_datetime);
        return dow === 0 || dow === 6;
      });
      isWeekendOnly = allWeekend;
    }

    return {
      workshop: w,
      category_name: category ? category.name : null,
      level_label: levelLabel,
      format_label: formatLabel,
      default_location: defaultLocation,
      materials_included_label: materialsIncludedLabel,
      age_suitability_label: w.age_suitability_label || null,
      is_weekend_only: isWeekendOnly,
      prerequisites
    };
  }

  // getWorkshopSchedule
  getWorkshopSchedule(workshopId, month, dateFrom, dateTo, timeOfDay, weekdayOnly, weekendOnly, locationId) {
    const sessions = this._getFromStorage('workshop_sessions', []);
    const workshops = this._getFromStorage('workshops', []);
    const locations = this._getFromStorage('studio_locations', []);

    let filtered = sessions.filter(s => s.workshop_id === workshopId && s.status === 'scheduled');

    if (month) {
      const [y, m] = month.split('-');
      const year = parseInt(y, 10);
      const mon = parseInt(m, 10) - 1;
      filtered = filtered.filter(s => {
        const d = new Date(s.start_datetime);
        return d.getUTCFullYear() === year && d.getUTCMonth() === mon;
      });
    }

    const dateFromObj = dateFrom ? this._parseDateOnly(dateFrom) : null;
    const dateToObj = dateTo ? this._parseDateOnly(dateTo) : null;

    if (dateFromObj || dateToObj) {
      filtered = filtered.filter(s => {
        const d = new Date(s.start_datetime);
        if (dateFromObj && d < dateFromObj) return false;
        if (dateToObj && d > dateToObj) return false;
        return true;
      });
    }

    if (timeOfDay) {
      filtered = filtered.filter(s => s.time_of_day === timeOfDay);
    }

    if (locationId) {
      filtered = filtered.filter(s => s.location_id === locationId);
    }

    if (weekdayOnly) {
      filtered = filtered.filter(s => {
        const dow = this._dayOfWeek(s.start_datetime);
        return dow >= 1 && dow <= 5;
      });
    }

    if (weekendOnly) {
      filtered = filtered.filter(s => {
        const dow = this._dayOfWeek(s.start_datetime);
        return dow === 0 || dow === 6;
      });
    }

    filtered.sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime));

    // Foreign key resolution: include workshop and location objects
    const result = filtered.map(s => {
      const workshop = workshops.find(w => w.id === s.workshop_id) || null;
      const location = locations.find(l => l.id === s.location_id) || null;
      return {
        ...s,
        workshop,
        location
      };
    });

    return result;
  }

  // addWorkshopSessionToCart
  addWorkshopSessionToCart(workshopSessionId, participantCount, adultCount, childCount, childAges, notes) {
    const sessions = this._getFromStorage('workshop_sessions', []);
    const workshops = this._getFromStorage('workshops', []);
    const locations = this._getFromStorage('studio_locations', []);

    const session = sessions.find(s => s.id === workshopSessionId);
    if (!session) {
      return { success: false, message: 'Workshop session not found', cart: null, added_item: null };
    }
    if (session.status !== 'scheduled') {
      return { success: false, message: 'Workshop session is not available', cart: null, added_item: null };
    }

    const workshop = workshops.find(w => w.id === session.workshop_id) || null;
    const location = locations.find(l => l.id === session.location_id) || null;

    let totalParticipants = 0;
    if (typeof participantCount === 'number' && participantCount > 0) {
      totalParticipants = participantCount;
    } else {
      const adults = typeof adultCount === 'number' ? adultCount : 0;
      const children = typeof childCount === 'number' ? childCount : 0;
      totalParticipants = adults + children;
    }
    if (totalParticipants <= 0) totalParticipants = 1;

    if (typeof session.capacity_available === 'number' && session.capacity_available < totalParticipants) {
      return { success: false, message: 'Not enough capacity available', cart: null, added_item: null };
    }

    const cart = this._getOrCreateCart();
    const allItems = this._getFromStorage('cart_items', []);

    const pricePerPerson = session.price_per_person;
    const cartItem = {
      id: this._generateId('cart_item'),
      cart_id: cart.id,
      item_type: 'workshop_session',
      workshop_session_id: session.id,
      bundle_id: null,
      gift_voucher_id: null,
      title: workshop ? workshop.title : 'Workshop session',
      date_display: session.start_datetime,
      time_display: session.start_datetime,
      location_name: location ? location.name : null,
      participant_count: totalParticipants,
      adult_count: typeof adultCount === 'number' ? adultCount : null,
      child_count: typeof childCount === 'number' ? childCount : null,
      child_ages: Array.isArray(childAges) ? childAges.slice() : null,
      price_per_unit: pricePerPerson,
      quantity: totalParticipants,
      subtotal: pricePerPerson * totalParticipants,
      notes: notes || null
    };

    allItems.push(cartItem);
    cart.items = cart.items || [];
    cart.items.push(cartItem.id);

    this._saveToStorage('cart_items', allItems);
    this._saveToStorage('cart', cart);

    const { cart: updatedCart } = this._recalculateCartTotals();

    return {
      success: true,
      message: 'Workshop session added to cart',
      cart: updatedCart,
      added_item: cartItem
    };
  }

  // getBundleFilterOptions
  getBundleFilterOptions() {
    const bundles = this._getFromStorage('bundles', []);

    let minPrice = null;
    let maxPrice = null;
    bundles.forEach(b => {
      if (typeof b.total_price === 'number') {
        if (minPrice === null || b.total_price < minPrice) minPrice = b.total_price;
        if (maxPrice === null || b.total_price > maxPrice) maxPrice = b.total_price;
      }
    });

    const levels = [
      { value: 'beginner', label: 'Beginner' },
      { value: 'intermediate', label: 'Intermediate' },
      { value: 'advanced', label: 'Advanced' }
    ];

    const sessionCountOptions = [
      { value: 2, label: '2 sessions' },
      { value: 3, label: '3 sessions' },
      { value: 4, label: '4 sessions' }
    ];

    const materialsIncludedOptions = [
      { value: true, label: 'Materials included' },
      { value: false, label: 'Materials not included' }
    ];

    const sortOptions = [
      { value: 'price_asc', label: 'Price: Low to High' },
      { value: 'price_desc', label: 'Price: High to Low' },
      { value: 'recommended', label: 'Recommended' },
      { value: 'popularity_desc', label: 'Most popular' }
    ];

    return {
      levels,
      price_range: {
        min_price: minPrice || 0,
        max_price: maxPrice || 0,
        currency: bundles[0] && bundles[0].currency ? bundles[0].currency : 'USD'
      },
      session_count_options: sessionCountOptions,
      materials_included_options: materialsIncludedOptions,
      sort_options: sortOptions
    };
  }

  // listBundles
  listBundles(query, level, minPrice, maxPrice, minSessions, maxSessions, materialsIncludedOnly, sortBy, page, pageSize) {
    const bundles = this._getFromStorage('bundles', []);
    const normalizedQuery = query ? String(query).toLowerCase() : null;

    let filtered = bundles.filter(b => b.is_active !== false);

    if (normalizedQuery) {
      filtered = filtered.filter(b => {
        const title = (b.title || '').toLowerCase();
        const shortDesc = (b.short_description || '').toLowerCase();
        const longDesc = (b.long_description || '').toLowerCase();
        return title.includes(normalizedQuery) || shortDesc.includes(normalizedQuery) || longDesc.includes(normalizedQuery);
      });
    }

    if (level) {
      filtered = filtered.filter(b => b.level === level);
    }

    if (typeof minPrice === 'number') {
      filtered = filtered.filter(b => typeof b.total_price === 'number' && b.total_price >= minPrice);
    }
    if (typeof maxPrice === 'number') {
      filtered = filtered.filter(b => typeof b.total_price === 'number' && b.total_price <= maxPrice);
    }

    if (typeof minSessions === 'number') {
      filtered = filtered.filter(b => typeof b.number_of_sessions === 'number' && b.number_of_sessions >= minSessions);
    }
    if (typeof maxSessions === 'number') {
      filtered = filtered.filter(b => typeof b.number_of_sessions === 'number' && b.number_of_sessions <= maxSessions);
    }

    if (materialsIncludedOnly) {
      filtered = filtered.filter(b => !!b.materials_included);
    }

    const sortKey = sortBy || 'recommended';
    filtered.sort((a, b) => {
      if (sortKey === 'price_asc' || sortKey === 'price_desc') {
        const pa = a.total_price || 0;
        const pb = b.total_price || 0;
        return sortKey === 'price_asc' ? (pa - pb) : (pb - pa);
      }
      // For recommended/popularity, we do a simple price-based or session-count-based sort
      const sa = a.number_of_sessions || 0;
      const sb = b.number_of_sessions || 0;
      if (sb !== sa) return sb - sa;
      const pa = a.total_price || 0;
      const pb = b.total_price || 0;
      return pa - pb;
    });

    const currentPage = page && page > 0 ? page : 1;
    const size = pageSize && pageSize > 0 ? pageSize : 20;
    const totalResults = filtered.length;
    const totalPages = Math.ceil(totalResults / size) || 1;
    const startIndex = (currentPage - 1) * size;
    const paged = filtered.slice(startIndex, startIndex + size);

    const results = paged.map(b => {
      const whatsIncludedSnippet = (b.whats_included || b.long_description || '').slice(0, 160);
      const materialsIncludedLabel = b.materials_included ? 'Materials included' : 'Materials not included';
      const badges = [];
      if (b.materials_included) badges.push('Materials included');
      if (b.number_of_sessions >= 3) badges.push(b.number_of_sessions + ' sessions');
      if (b.level === 'beginner') badges.push('Beginner');
      return {
        bundle: b,
        number_of_sessions: b.number_of_sessions,
        materials_included_label: materialsIncludedLabel,
        whats_included_snippet: whatsIncludedSnippet,
        badges
      };
    });

    return {
      results,
      pagination: {
        page: currentPage,
        page_size: size,
        total_results: totalResults,
        total_pages: totalPages
      }
    };
  }

  // getBundleDetail
  getBundleDetail(bundleId) {
    const bundles = this._getFromStorage('bundles', []);
    const includedSessions = this._getFromStorage('bundle_included_sessions', []);
    const workshops = this._getFromStorage('workshops', []);

    const bundle = bundles.find(b => b.id === bundleId) || null;
    if (!bundle) {
      return {
        bundle: null,
        included_sessions: [],
        whats_included: '',
        start_date_constraints: {
          min_start_date: null,
          max_start_date: null,
          available_start_dates: []
        }
      };
    }

    const sessionsForBundle = includedSessions
      .filter(s => s.bundle_id === bundle.id)
      .sort((a, b) => a.sequence_number - b.sequence_number)
      .map(s => {
        const workshop = s.workshop_id ? (workshops.find(w => w.id === s.workshop_id) || null) : null;
        return {
          ...s,
          workshop,
          bundle
        };
      });

    const whatsIncluded = bundle.whats_included || bundle.long_description || '';

    const startConstraints = {
      min_start_date: bundle.min_start_date || null,
      max_start_date: bundle.max_start_date || null,
      available_start_dates: []
    };

    return {
      bundle,
      included_sessions: sessionsForBundle,
      whats_included: whatsIncluded,
      start_date_constraints: startConstraints
    };
  }

  // addBundleToCart
  addBundleToCart(bundleId, startDate, quantity, notes) {
    const bundles = this._getFromStorage('bundles', []);
    const bundle = bundles.find(b => b.id === bundleId);
    if (!bundle) {
      return { success: false, message: 'Bundle not found', cart: null, added_item: null };
    }

    const qty = typeof quantity === 'number' && quantity > 0 ? quantity : 1;

    const cart = this._getOrCreateCart();
    const allItems = this._getFromStorage('cart_items', []);

    const price = bundle.total_price;
    const cartItem = {
      id: this._generateId('cart_item'),
      cart_id: cart.id,
      item_type: 'bundle',
      workshop_session_id: null,
      bundle_id: bundle.id,
      gift_voucher_id: null,
      title: bundle.title,
      date_display: startDate || null,
      time_display: null,
      location_name: null,
      participant_count: qty,
      adult_count: null,
      child_count: null,
      child_ages: null,
      price_per_unit: price,
      quantity: qty,
      subtotal: price * qty,
      notes: notes || null
    };

    allItems.push(cartItem);
    cart.items = cart.items || [];
    cart.items.push(cartItem.id);

    this._saveToStorage('cart_items', allItems);
    this._saveToStorage('cart', cart);

    const { cart: updatedCart } = this._recalculateCartTotals();

    return {
      success: true,
      message: 'Bundle added to cart',
      cart: updatedCart,
      added_item: cartItem
    };
  }

  // getGiftVoucherConfig
  getGiftVoucherConfig() {
    const currency = 'USD';
    return {
      currency,
      preset_amounts: [25, 50, 80, 100],
      min_amount: 10,
      max_amount: 500,
      delivery_methods: [
        { value: 'printable_pdf', label: 'Printable PDF', requires_email: false },
        { value: 'email', label: 'Email', requires_email: true }
      ],
      redeem_instructions_html: '<p>Gift vouchers can be redeemed online at checkout using the voucher code printed on the voucher or included in the email.</p>'
    };
  }

  // createGiftVoucherAndAddToCart
  createGiftVoucherAndAddToCart(amount, deliveryMethod, recipientName, recipientEmail, message, senderName) {
    const config = this.getGiftVoucherConfig();
    const numericAmount = Number(amount);
    if (!numericAmount || numericAmount <= 0) {
      return { success: false, message: 'Invalid amount', gift_voucher: null, cart: null, added_item: null };
    }
    if (numericAmount < config.min_amount || numericAmount > config.max_amount) {
      return { success: false, message: 'Amount out of allowed range', gift_voucher: null, cart: null, added_item: null };
    }
    if (deliveryMethod === 'email' && !recipientEmail) {
      return { success: false, message: 'Recipient email is required for email delivery', gift_voucher: null, cart: null, added_item: null };
    }

    const vouchers = this._getFromStorage('gift_vouchers', []);
    const voucher = {
      id: this._generateId('voucher'),
      amount: numericAmount,
      currency: config.currency,
      delivery_method: deliveryMethod,
      recipient_name: recipientName,
      recipient_email: recipientEmail || null,
      message: message || null,
      sender_name: senderName || null,
      is_active: true,
      created_at: this._nowISO()
    };

    vouchers.push(voucher);
    this._saveToStorage('gift_vouchers', vouchers);

    const cart = this._getOrCreateCart();
    const allItems = this._getFromStorage('cart_items', []);

    const title = 'Gift Voucher ' + config.currency + ' ' + numericAmount;
    const cartItem = {
      id: this._generateId('cart_item'),
      cart_id: cart.id,
      item_type: 'gift_voucher',
      workshop_session_id: null,
      bundle_id: null,
      gift_voucher_id: voucher.id,
      title,
      date_display: null,
      time_display: null,
      location_name: null,
      participant_count: 1,
      adult_count: null,
      child_count: null,
      child_ages: null,
      price_per_unit: numericAmount,
      quantity: 1,
      subtotal: numericAmount,
      notes: null
    };

    allItems.push(cartItem);
    cart.items = cart.items || [];
    cart.items.push(cartItem.id);

    this._saveToStorage('cart_items', allItems);
    this._saveToStorage('cart', cart);

    const { cart: updatedCart } = this._recalculateCartTotals();

    return {
      success: true,
      message: 'Gift voucher added to cart',
      gift_voucher: voucher,
      cart: updatedCart,
      added_item: cartItem
    };
  }

  // getCart (with foreign key resolution)
  getCart() {
    const cart = this._getOrCreateCart();
    const allItems = this._getFromStorage('cart_items', []);
    const workshops = this._getFromStorage('workshops', []);
    const sessions = this._getFromStorage('workshop_sessions', []);
    const bundles = this._getFromStorage('bundles', []);
    const giftVouchers = this._getFromStorage('gift_vouchers', []);
    const locations = this._getFromStorage('studio_locations', []);

    const itemsForCart = allItems.filter(ci => ci.cart_id === cart.id).map(ci => {
      let workshopSession = null;
      let bundle = null;
      let giftVoucher = null;

      if (ci.workshop_session_id) {
        const s = sessions.find(x => x.id === ci.workshop_session_id) || null;
        if (s) {
          const w = workshops.find(wk => wk.id === s.workshop_id) || null;
          const loc = locations.find(l => l.id === s.location_id) || null;
          workshopSession = { ...s, workshop: w, location: loc };
        }
      }

      if (ci.bundle_id) {
        bundle = bundles.find(b => b.id === ci.bundle_id) || null;
      }

      if (ci.gift_voucher_id) {
        giftVoucher = giftVouchers.find(g => g.id === ci.gift_voucher_id) || null;
      }

      return {
        ...ci,
        workshop_session: workshopSession,
        bundle,
        gift_voucher: giftVoucher
      };
    });

    // Ensure totals are up to date
    this._recalculateCartTotals();
    const refreshedCart = this._getFromStorage('cart', null) || cart;

    return {
      cart: refreshedCart,
      items: itemsForCart
    };
  }

  // updateCartItemQuantity
  updateCartItemQuantity(cartItemId, quantity) {
    const cart = this._getOrCreateCart();
    const allItems = this._getFromStorage('cart_items', []);
    const itemIndex = allItems.findIndex(ci => ci.id === cartItemId && ci.cart_id === cart.id);
    if (itemIndex === -1) {
      return { success: false, message: 'Cart item not found', cart: cart, updated_item: null };
    }

    const qty = quantity < 0 ? 0 : quantity;

    if (qty === 0) {
      const removed = allItems.splice(itemIndex, 1)[0];
      if (cart.items) {
        cart.items = cart.items.filter(id => id !== removed.id);
      }
      this._saveToStorage('cart_items', allItems);
      this._saveToStorage('cart', cart);
      const { cart: updatedCart } = this._recalculateCartTotals();
      return { success: true, message: 'Cart item removed', cart: updatedCart, updated_item: null };
    }

    const item = allItems[itemIndex];
    item.quantity = qty;
    // For workshop sessions, participant_count mirrors quantity
    if (item.item_type === 'workshop_session') {
      item.participant_count = qty;
    }
    this._saveToStorage('cart_items', allItems);
    this._saveToStorage('cart', cart);
    const { cart: updatedCart } = this._recalculateCartTotals();

    return {
      success: true,
      message: 'Cart item quantity updated',
      cart: updatedCart,
      updated_item: item
    };
  }

  // removeCartItem
  removeCartItem(cartItemId) {
    const cart = this._getOrCreateCart();
    const allItems = this._getFromStorage('cart_items', []);
    const itemIndex = allItems.findIndex(ci => ci.id === cartItemId && ci.cart_id === cart.id);

    if (itemIndex === -1) {
      return { success: false, message: 'Cart item not found', cart };
    }

    const removed = allItems.splice(itemIndex, 1)[0];
    if (cart.items) {
      cart.items = cart.items.filter(id => id !== removed.id);
    }

    this._saveToStorage('cart_items', allItems);
    this._saveToStorage('cart', cart);
    const { cart: updatedCart } = this._recalculateCartTotals();

    return {
      success: true,
      message: 'Cart item removed',
      cart: updatedCart
    };
  }

  // getCheckoutSummary
  getCheckoutSummary() {
    const { cart, items } = this.getCart();
    const savedCards = this._getFromStorage('payment_cards', []);
    const availablePaymentMethods = ['credit_card', 'pay_at_studio'];

    // Instrumentation for task completion tracking
    try {
      if (items && items.length > 0) {
        localStorage.setItem('task1_checkoutStarted', 'true');
        localStorage.setItem('task4_checkoutStarted', 'true');
        localStorage.setItem('task6_checkoutStarted', 'true');
        localStorage.setItem('task8_checkoutStarted', 'true');
      }
    } catch (e) {
      console.error('Instrumentation error in getCheckoutSummary:', e);
    }

    return {
      cart,
      items,
      available_payment_methods: availablePaymentMethods,
      saved_cards: savedCards
    };
  }

  // applyPromoCode
  applyPromoCode(code) {
    const cart = this._getOrCreateCart();
    const allItems = this._getFromStorage('cart_items', []);
    const itemsForCart = allItems.filter(ci => ci.cart_id === cart.id);
    const currentSubtotal = itemsForCart.reduce((sum, ci) => sum + (ci.subtotal || (ci.price_per_unit || 0) * (ci.quantity || 0)), 0);

    const validation = this._validatePromoCode(code, currentSubtotal);
    if (!validation.valid || !validation.promo) {
      // Clear promo if invalid
      cart.promo_code = null;
      this._saveToStorage('cart', cart);
      this._recalculateCartTotals();
      return {
        success: false,
        message: validation.reason || 'Invalid promo code',
        cart: this._getFromStorage('cart', cart)
      };
    }

    cart.promo_code = validation.promo.code;
    this._saveToStorage('cart', cart);
    const { cart: updatedCart } = this._recalculateCartTotals();

    return {
      success: true,
      message: 'Promo code applied',
      cart: updatedCart
    };
  }

  // placeOrder
  placeOrder(contactName, contactEmail, contactPhone, notes, paymentMethod, paymentCardId, creditCard, saveCard) {
    const cart = this._getOrCreateCart();
    const allItems = this._getFromStorage('cart_items', []);
    const itemsForCart = allItems.filter(ci => ci.cart_id === cart.id);

    if (!itemsForCart.length) {
      return { success: false, message: 'Cart is empty', order: null, order_items: [] };
    }

    if (!paymentMethod || (paymentMethod !== 'credit_card' && paymentMethod !== 'pay_at_studio')) {
      return { success: false, message: 'Invalid payment method', order: null, order_items: [] };
    }

    const { order, orderItems } = this._createOrderFromCart(
      cart,
      itemsForCart,
      contactName,
      contactEmail,
      contactPhone,
      notes,
      paymentMethod,
      paymentCardId
    );

    const paymentResult = this._processPayment(order, paymentMethod, paymentCardId, creditCard, saveCard);
    if (!paymentResult.success) {
      return { success: false, message: paymentResult.message || 'Payment failed', order: null, order_items: [] };
    }

    const finalOrder = paymentResult.order;

    const orders = this._getFromStorage('orders', []);
    const orderItemsAll = this._getFromStorage('order_items', []);

    orders.push(finalOrder);
    orderItemsAll.push(...orderItems);

    this._saveToStorage('orders', orders);
    this._saveToStorage('order_items', orderItemsAll);

    // Update promo usage count if applicable
    if (finalOrder.promo_code) {
      const promoCodes = this._getFromStorage('promo_codes', []);
      const idx = promoCodes.findIndex(p => p.code === finalOrder.promo_code);
      if (idx !== -1) {
        const promo = promoCodes[idx];
        if (typeof promo.times_used !== 'number') promo.times_used = 0;
        promo.times_used += 1;
        promoCodes[idx] = promo;
        this._saveToStorage('promo_codes', promoCodes);
      }
    }

    // Clear the cart and related items
    this._clearCartAfterOrder(cart.id);

    return {
      success: true,
      message: 'Order placed successfully',
      order: finalOrder,
      order_items: orderItems
    };
  }

  // getOrderSummary
  getOrderSummary(orderNumber) {
    const orders = this._getFromStorage('orders', []);
    const orderItemsAll = this._getFromStorage('order_items', []);
    const sessions = this._getFromStorage('workshop_sessions', []);
    const workshops = this._getFromStorage('workshops', []);
    const bundles = this._getFromStorage('bundles', []);
    const giftVouchers = this._getFromStorage('gift_vouchers', []);
    const locations = this._getFromStorage('studio_locations', []);
    const paymentCards = this._getFromStorage('payment_cards', []);

    const order = orders.find(o => o.order_number === orderNumber) || null;
    if (!order) {
      return {
        order: null,
        items: [],
        general_arrival_instructions_html: '<p>No order found.</p>',
        what_to_bring_html: ''
      };
    }

    const orderItems = orderItemsAll.filter(oi => oi.order_id === order.id).map(oi => {
      let workshopSession = null;
      let bundle = null;
      let giftVoucher = null;

      if (oi.workshop_session_id) {
        const s = sessions.find(x => x.id === oi.workshop_session_id) || null;
        if (s) {
          const w = workshops.find(wk => wk.id === s.workshop_id) || null;
          const loc = locations.find(l => l.id === s.location_id) || null;
          workshopSession = { ...s, workshop: w, location: loc };
        }
      }

      if (oi.bundle_id) {
        bundle = bundles.find(b => b.id === oi.bundle_id) || null;
      }

      if (oi.gift_voucher_id) {
        giftVoucher = giftVouchers.find(g => g.id === oi.gift_voucher_id) || null;
      }

      return {
        ...oi,
        workshop_session: workshopSession,
        bundle,
        gift_voucher: giftVoucher
      };
    });

    const paymentCard = order.payment_card_id
      ? (paymentCards.find(pc => pc.id === order.payment_card_id) || null)
      : null;

    const enrichedOrder = {
      ...order,
      payment_card: paymentCard
    };

    const generalArrival = '<p>Please arrive 10-15 minutes before your workshop start time to check in and get settled. Our studios provide aprons, but we recommend wearing clothes you do not mind getting a little dye on.</p>';
    const whatToBring = '<p>We provide basic tools and materials unless otherwise stated. You may wish to bring an old shirt or apron, a notebook for design ideas, and closed-toe shoes for safety.</p>';

    return {
      order: enrichedOrder,
      items: orderItems,
      general_arrival_instructions_html: generalArrival,
      what_to_bring_html: whatToBring
    };
  }

  // getStudioLocations
  getStudioLocations() {
    const locations = this._getFromStorage('studio_locations', []);
    return locations.map(loc => ({
      location: loc,
      typical_categories: [],
      parking_info: '',
      public_transport_info: ''
    }));
  }

  // getAboutStudioContent
  getAboutStudioContent() {
    return {
      background_html: '<p>Our batik studio was founded to share the rich tradition of wax-resist fabric art with a modern audience. We host small, hands-on workshops led by experienced instructors.</p>',
      mission_html: '<p>Our mission is to make batik accessible, inspiring, and sustainable for beginners, families, and advanced artists alike.</p>',
      values_html: '<ul><li>Creativity</li><li>Patience</li><li>Community</li><li>Sustainability</li></ul>',
      philosophy_html: '<p>We believe that everyone can create meaningful art when given the right guidance, time, and tools. Our workshops focus on process over perfection.</p>',
      instructors: []
    };
  }

  // getFAQEntries
  getFAQEntries() {
    return [
      {
        category: 'levels',
        question: 'What is the difference between beginner, intermediate, and advanced workshops?',
        answer_html: '<p>Beginner workshops assume no prior batik experience. Intermediate sessions build on basic wax-resist and dyeing skills. Advanced and masterclasses are suited to participants with solid batik experience.</p>'
      },
      {
        category: 'age_suitability',
        question: 'Can children attend the workshops?',
        answer_html: '<p>Family & Kids workshops are designed for children when accompanied by an adult. Please check the age suitability label (e.g., Age 8+) on each workshop.</p>'
      },
      {
        category: 'booking_policies',
        question: 'What is your cancellation policy?',
        answer_html: '<p>Our standard policy allows rescheduling or cancellation up to a set time before the workshop. Specific details may vary by workshop and are shown during checkout.</p>'
      },
      {
        category: 'vouchers',
        question: 'How do gift vouchers work?',
        answer_html: '<p>Gift vouchers can be purchased as printable PDFs or email vouchers. The recipient can redeem them online at checkout.</p>'
      },
      {
        category: 'bundles',
        question: 'How do bundles differ from single workshops?',
        answer_html: '<p>Bundles group multiple sessions at a discounted price and may include additional benefits such as all materials provided.</p>'
      },
      {
        category: 'promo_codes',
        question: 'Where do I enter a promo code?',
        answer_html: '<p>Promo codes can be applied on the checkout page in the promo or discount code field.</p>'
      }
    ];
  }

  // getContactInfo
  getContactInfo() {
    return {
      email: 'hello@example-batik-studio.com',
      phone: '+1 (000) 000-0000',
      address: {
        line1: '123 Batik Lane',
        line2: '',
        city: 'Art City',
        state: 'CA',
        postal_code: '00000',
        country: 'USA'
      },
      response_time_info: 'We typically respond to inquiries within 1-2 business days.',
      support_hours_info: 'Support is available Monday to Friday, 9:00 AM to 5:00 PM local time.'
    };
  }

  // submitContactInquiry
  submitContactInquiry(name, email, topic, message) {
    if (!name || !email || !message) {
      return { success: false, message: 'Name, email, and message are required.' };
    }
    const inquiries = this._getFromStorage('contact_inquiries', []);
    const inquiry = {
      id: this._generateId('contact_inquiry'),
      name,
      email,
      topic: topic || null,
      message,
      created_at: this._nowISO()
    };
    inquiries.push(inquiry);
    this._saveToStorage('contact_inquiries', inquiries);
    return { success: true, message: 'Your inquiry has been submitted.' };
  }

  // getTermsAndConditionsContent
  getTermsAndConditionsContent() {
    return {
      content_html: '<h2>Terms &amp; Conditions</h2><p>By booking a workshop, bundle, or purchasing a voucher, you agree to our booking, cancellation, and refund policies as displayed during checkout.</p>',
      last_updated: '2024-01-01'
    };
  }

  // getPrivacyPolicyContent
  getPrivacyPolicyContent() {
    return {
      content_html: '<h2>Privacy Policy</h2><p>We collect only the personal data necessary to process your bookings and payments, and we store payment card details in a tokenized or masked form when you choose to save a card.</p>',
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