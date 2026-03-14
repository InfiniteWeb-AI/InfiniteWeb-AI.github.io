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

  // ------------------------
  // Storage helpers
  // ------------------------

  _initStorage() {
    // Initialize all data tables in localStorage if not exist
    const arrayKeys = [
      'users',
      'tour_activities',
      'activity_sessions',
      'addons',
      'tour_activity_addons',
      'party_package_addons',
      'workshops',
      'workshop_sessions',
      'lodging_properties',
      'rate_plans',
      'rate_plan_calendar',
      'product_categories',
      'products',
      'product_variants',
      'gift_card_products',
      'gift_card_designs',
      'gift_card_purchases',
      'party_packages',
      'group_package_inquiries',
      'itineraries',
      'itinerary_items',
      'promo_codes',
      'carts',
      'cart_items',
      'contact_tickets',
      'faqs',
      'policy_documents',
      'orders'
    ];

    for (let i = 0; i < arrayKeys.length; i++) {
      const key = arrayKeys[i];
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, '[]');
      }
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
    // currentCartId / currentItineraryId are optional; no default needed
  }

  _getFromStorage(key) {
    const data = localStorage.getItem(key);
    if (!data) return [];
    try {
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }

  _getObjectFromStorage(key, defaultValue = null) {
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

  // ------------------------
  // Generic helpers
  // ------------------------

  _parseDateOnly(dateStr) {
    // dateStr expected 'YYYY-MM-DD'
    return new Date(dateStr + 'T00:00:00Z');
  }

  _formatDateOnly(date) {
    return date.toISOString().slice(0, 10);
  }

  _getNights(checkInStr, checkOutStr) {
    const d1 = this._parseDateOnly(checkInStr);
    const d2 = this._parseDateOnly(checkOutStr);
    const diffMs = d2.getTime() - d1.getTime();
    return Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24)));
  }

  _findEarliestAvailableSession(sessions) {
    if (!sessions || !sessions.length) return null;
    const available = sessions.filter(function (s) {
      return (
        s &&
        (s.status === 'available' || !s.status) &&
        (s.capacity_remaining === undefined || s.capacity_remaining === null || s.capacity_remaining > 0)
      );
    });
    if (!available.length) return null;
    available.sort(function (a, b) {
      const da = new Date(a.start_datetime || a.startDatetime || a.date || 0).getTime();
      const db = new Date(b.start_datetime || b.startDatetime || b.date || 0).getTime();
      return da - db;
    });
    return available[0];
  }

  // ------------------------
  // Cart helpers
  // ------------------------

  _getOrCreateCart() {
    let carts = this._getFromStorage('carts');
    let currentCartId = localStorage.getItem('currentCartId');
    let cart = null;

    if (currentCartId) {
      cart = carts.find(function (c) { return c.id === currentCartId; }) || null;
    }

    if (!cart) {
      const newId = this._generateId('cart');
      cart = {
        id: newId,
        created_at: new Date().toISOString(),
        updated_at: null,
        currency: 'usd',
        promo_code: null,
        discount_total: 0,
        subtotal: 0,
        total: 0
      };
      carts.push(cart);
      this._saveToStorage('carts', carts);
      localStorage.setItem('currentCartId', newId);
    }

    return cart;
  }

  _recalculateCartTotals(cart) {
    const carts = this._getFromStorage('carts');
    const cartItems = this._getFromStorage('cart_items').filter(function (ci) {
      return ci.cartId === cart.id;
    });

    let subtotal = 0;
    let itemDiscountTotal = 0;

    for (let i = 0; i < cartItems.length; i++) {
      const item = cartItems[i];
      const qty = item.quantity || 0;
      const unitPrice = item.unit_price || 0;
      subtotal += unitPrice * qty;
      if (item.discount_amount) {
        itemDiscountTotal += item.discount_amount;
      }
    }

    let discountTotal = itemDiscountTotal;

    if (cart.promo_code) {
      const promoResult = this._applyPromoCodeToAmount(
        subtotal - itemDiscountTotal,
        'all',
        cart.promo_code
      );
      discountTotal += promoResult.discount;
    }

    cart.subtotal = parseFloat(subtotal.toFixed(2));
    cart.discount_total = parseFloat(discountTotal.toFixed(2));
    cart.total = parseFloat((subtotal - discountTotal).toFixed(2));
    cart.updated_at = new Date().toISOString();

    const idx = carts.findIndex(function (c) { return c.id === cart.id; });
    if (idx >= 0) {
      carts[idx] = cart;
    } else {
      carts.push(cart);
    }

    this._saveToStorage('carts', carts);
    this._saveToStorage('cart_items', cartItems);

    return {
      subtotal: cart.subtotal,
      discount_total: cart.discount_total,
      total: cart.total
    };
  }

  _applyPromoCodeToAmount(amount, entityType, promoCodeStr) {
    let discount = 0;
    if (!promoCodeStr) {
      return { discount: 0, promo: null };
    }

    const promoCodes = this._getFromStorage('promo_codes');
    const now = new Date();
    const codeNorm = String(promoCodeStr).trim().toUpperCase();

    const promo = promoCodes.find(function (p) {
      if (!p || !p.code) return false;
      if ((p.status !== 'active')) return false;
      const pc = String(p.code).trim().toUpperCase();
      if (pc !== codeNorm) return false;
      if (p.expires_at) {
        const exp = new Date(p.expires_at);
        if (exp.getTime() < now.getTime()) return false;
      }
      if (p.applicable_entity_type !== 'all' && p.applicable_entity_type !== entityType) {
        return false;
      }
      if (typeof p.min_cart_total === 'number' && amount < p.min_cart_total) {
        return false;
      }
      return true;
    }) || null;

    if (!promo) {
      return { discount: 0, promo: null };
    }

    if (promo.discount_type === 'percent') {
      discount = (amount * (promo.discount_value || 0)) / 100;
    } else if (promo.discount_type === 'fixed_amount') {
      discount = promo.discount_value || 0;
    }

    if (discount > amount) discount = amount;

    return {
      discount: parseFloat(discount.toFixed(2)),
      promo: promo
    };
  }

  _getDescendantCategoryIds(rootCategoryId, allCategories) {
    const result = [rootCategoryId];
    const stack = [rootCategoryId];
    while (stack.length) {
      const currentId = stack.pop();
      for (let i = 0; i < allCategories.length; i++) {
        const cat = allCategories[i];
        if (cat.parent_category_id === currentId && result.indexOf(cat.id) === -1) {
          result.push(cat.id);
          stack.push(cat.id);
        }
      }
    }
    return result;
  }

  // ------------------------
  // Interface implementations
  // ------------------------

  // 1. getHomeContent
  getHomeContent() {
    const content = this._getObjectFromStorage('home_content', null);
    if (content && typeof content === 'object') {
      return content;
    }

    // Fallback minimal structure (no mocked business data)
    return {
      hero_title: '',
      hero_subtitle: '',
      hero_image_url: '',
      value_props: [],
      highlights: {
        tours: { title: '', blurb: '' },
        lodging: { title: '', blurb: '' },
        shop: { title: '', blurb: '' },
        groups: { title: '', blurb: '' },
        gift_cards: { title: '', blurb: '' }
      }
    };
  }

  // 2. getFeaturedExperiences
  getFeaturedExperiences() {
    const tourActivities = this._getFromStorage('tour_activities').filter(function (t) {
      return t.status === 'active';
    });
    const activitySessions = this._getFromStorage('activity_sessions');

    const workshops = this._getFromStorage('workshops').filter(function (w) {
      return w.status === 'active';
    });
    const workshopSessions = this._getFromStorage('workshop_sessions');

    const lodgingProps = this._getFromStorage('lodging_properties').filter(function (l) {
      return l.status === 'active';
    });

    const products = this._getFromStorage('products').filter(function (p) {
      return p.status === 'active';
    });
    const categories = this._getFromStorage('product_categories');

    const featuredTours = tourActivities
      .filter(function (t) { return !!t.is_featured; })
      .map((t) => {
        const sessions = activitySessions.filter(function (s) {
          return s.activityId === t.id && s.status === 'available';
        });
        const earliest = this._findEarliestAvailableSession(sessions);
        let startingAdult = t.base_price_adult || 0;
        let startingChild = t.base_price_child || 0;
        if (sessions.length) {
          const adultPrices = sessions.map(function (s) { return typeof s.price_adult === 'number' ? s.price_adult : startingAdult; });
          const childPrices = sessions.map(function (s) { return typeof s.price_child === 'number' ? s.price_child : startingChild; });
          if (adultPrices.length) startingAdult = Math.min.apply(null, adultPrices);
          if (childPrices.length) startingChild = Math.min.apply(null, childPrices);
        }
        return {
          activity_id: t.id,
          name: t.name,
          activity_type: t.activity_type,
          audience: t.audience || null,
          starting_price_adult: startingAdult,
          starting_price_child: startingChild,
          next_available_date: earliest ? this._formatDateOnly(new Date(earliest.date || earliest.start_datetime)) : null,
          thumbnail_image_url: (t.photos && t.photos[0]) || ''
        };
      }, this);

    const featuredWorkshops = workshops.map((w) => {
      const sessions = workshopSessions.filter(function (s) {
        return s.workshopId === w.id && s.status === 'available';
      });
      const earliest = this._findEarliestAvailableSession(sessions);
      let startingPrice = w.base_price || 0;
      if (sessions.length) {
        const prices = sessions.map(function (s) { return s.price; });
        if (prices.length) startingPrice = Math.min.apply(null, prices);
      }
      return {
        workshop_id: w.id,
        name: w.name,
        topic: w.topic || null,
        skill_level: w.skill_level || null,
        starting_price: startingPrice,
        earliest_available_date: earliest ? earliest.date || earliest.start_datetime : null,
        thumbnail_image_url: (w.photos && w.photos[0]) || '',
        is_featured: false
      };
    }, this);

    const featuredLodging = lodgingProps.map(function (l) {
      return {
        lodging_id: l.id,
        name: l.name,
        max_occupancy_adults: l.max_occupancy_adults || 0,
        max_occupancy_children: l.max_occupancy_children || 0,
        base_nightly_rate: l.base_nightly_rate || 0,
        has_breakfast_option: !!l.has_breakfast_option,
        thumbnail_image_url: (l.photos && l.photos[0]) || ''
      };
    });

    const featuredProducts = products.map(function (p) {
      const category = categories.find(function (c) { return c.id === p.categoryId; });
      return {
        product_id: p.id,
        name: p.name,
        category_name: category ? category.name : '',
        price: p.price,
        currency: p.currency || 'usd',
        average_rating: p.average_rating || 0,
        thumbnail_image_url: (p.image_urls && p.image_urls[0]) || ''
      };
    });

    const promoCodes = this._getFromStorage('promo_codes').filter(function (pc) {
      return pc.status === 'active';
    });

    const specialOffers = promoCodes.map(function (pc) {
      return {
        title: pc.code,
        description: pc.description || '',
        call_to_action_label: 'Apply at checkout'
      };
    });

    return {
      featured_tours: featuredTours,
      featured_workshops: featuredWorkshops,
      featured_lodging: featuredLodging,
      featured_products: featuredProducts,
      special_offers: specialOffers
    };
  }

  // 3. getTourActivityFilterOptions
  getTourActivityFilterOptions() {
    const activities = this._getFromStorage('tour_activities').filter(function (a) {
      return a.status === 'active';
    });
    const sessions = this._getFromStorage('activity_sessions');

    const activityTypes = [];
    const audiences = [];
    const timesOfDaySet = new Set();
    let minAdult = null;
    let maxAdult = null;
    let minChild = null;
    let maxChild = null;

    for (let i = 0; i < activities.length; i++) {
      const a = activities[i];
      if (a.activity_type && activityTypes.indexOf(a.activity_type) === -1) {
        activityTypes.push(a.activity_type);
      }
      if (a.audience && audiences.indexOf(a.audience) === -1) {
        audiences.push(a.audience);
      }
    }

    for (let j = 0; j < sessions.length; j++) {
      const s = sessions[j];
      if (s.time_of_day) {
        timesOfDaySet.add(s.time_of_day);
      }
      if (typeof s.price_adult === 'number') {
        if (minAdult === null || s.price_adult < minAdult) minAdult = s.price_adult;
        if (maxAdult === null || s.price_adult > maxAdult) maxAdult = s.price_adult;
      }
      if (typeof s.price_child === 'number') {
        if (minChild === null || s.price_child < minChild) minChild = s.price_child;
        if (maxChild === null || s.price_child > maxChild) maxChild = s.price_child;
      }
    }

    return {
      activity_types: activityTypes,
      audiences: audiences,
      times_of_day: Array.from(timesOfDaySet),
      price_range: {
        min_price_adult: minAdult === null ? 0 : minAdult,
        max_price_adult: maxAdult === null ? 0 : maxAdult,
        min_price_child: minChild === null ? 0 : minChild,
        max_price_child: maxChild === null ? 0 : maxChild
      }
    };
  }

  // 4. getTourActivitiesList(filters)
  getTourActivitiesList(filters) {
    filters = filters || {};
    const activities = this._getFromStorage('tour_activities').filter(function (a) {
      return a.status === 'active';
    });
    const sessions = this._getFromStorage('activity_sessions');

    const onlyWeekends = !!filters.only_weekends;

    const results = [];

    for (let i = 0; i < activities.length; i++) {
      const act = activities[i];

      if (filters.activity_types && filters.activity_types.length && filters.activity_types.indexOf(act.activity_type) === -1) {
        continue;
      }
      if (filters.audiences && filters.audiences.length && filters.audiences.indexOf(act.audience) === -1) {
        continue;
      }

      let relevantSessions = sessions.filter(function (s) {
        if (s.activityId !== act.id) return false;
        if (s.status !== 'available') return false;
        if (typeof s.capacity_remaining === 'number' && s.capacity_remaining <= 0) return false;
        return true;
      });

      if (filters.date) {
        relevantSessions = relevantSessions.filter((s) => {
          const d = s.date || s.start_datetime;
          if (!d) return false;
          return d.slice(0, 10) === filters.date;
        });
      }

      if (filters.times_of_day && filters.times_of_day.length) {
        relevantSessions = relevantSessions.filter(function (s) {
          return s.time_of_day && filters.times_of_day.indexOf(s.time_of_day) !== -1;
        });
      }

      if (onlyWeekends) {
        relevantSessions = relevantSessions.filter(function (s) {
          return !!s.is_weekend;
        });
      }

      if (typeof filters.max_price_per_adult === 'number') {
        const maxAdult = filters.max_price_per_adult;
        relevantSessions = relevantSessions.filter(function (s) {
          const price = typeof s.price_adult === 'number' ? s.price_adult : (act.base_price_adult || 0);
          return price <= maxAdult;
        });
      }

      if (!relevantSessions.length) {
        // If filters include date/time/price, exclude activities without matching sessions.
        if (filters.date || (filters.times_of_day && filters.times_of_day.length) || typeof filters.max_price_per_adult === 'number' || onlyWeekends) {
          continue;
        }
      }

      const earliest = this._findEarliestAvailableSession(relevantSessions.length ? relevantSessions : sessions.filter(function (s) {
        return s.activityId === act.id && s.status === 'available';
      }));

      let startingAdult = act.base_price_adult || 0;
      let startingChild = act.base_price_child || 0;

      const priceSessions = relevantSessions.length ? relevantSessions : sessions.filter(function (s) {
        return s.activityId === act.id && s.status === 'available';
      });

      if (priceSessions.length) {
        const adultPrices = priceSessions.map(function (s) {
          return typeof s.price_adult === 'number' ? s.price_adult : startingAdult;
        });
        const childPrices = priceSessions.map(function (s) {
          return typeof s.price_child === 'number' ? s.price_child : startingChild;
        });
        if (adultPrices.length) startingAdult = Math.min.apply(null, adultPrices);
        if (childPrices.length) startingChild = Math.min.apply(null, childPrices);
      }

      results.push({
        activity_id: act.id,
        name: act.name,
        slug: act.slug || null,
        activity_type: act.activity_type,
        audience: act.audience || null,
        duration_minutes: act.duration_minutes || null,
        starting_price_adult: startingAdult,
        starting_price_child: startingChild,
        next_available_date: earliest ? this._formatDateOnly(new Date(earliest.date || earliest.start_datetime)) : null,
        is_featured: !!act.is_featured,
        description_snippet: act.description ? String(act.description).slice(0, 140) : '',
        thumbnail_image_url: (act.photos && act.photos[0]) || ''
      });
    }

    return results;
  }

  // 5. getTourActivityDetail(activityId)
  getTourActivityDetail(activityId) {
    const activities = this._getFromStorage('tour_activities');
    const addons = this._getFromStorage('addons');
    const mappings = this._getFromStorage('tour_activity_addons');

    const act = activities.find(function (a) { return a.id === activityId; }) || null;
    if (!act) {
      return {
        activity_id: null,
        name: '',
        slug: null,
        description: '',
        activity_type: null,
        audience: null,
        duration_minutes: null,
        base_price_adult: 0,
        base_price_child: 0,
        min_participants: null,
        max_participants: null,
        photos: [],
        requirements: [],
        available_addons: [],
        cancellation_policy: ''
      };
    }

    const actMappings = mappings.filter(function (m) { return m.tourActivityId === act.id; });

    const availableAddons = actMappings.map(function (m) {
      const addon = addons.find(function (a) { return a.id === m.addonId; });
      if (!addon || !addon.is_active) return null;
      return {
        addon_id: addon.id,
        name: addon.name,
        description: addon.description || '',
        price: addon.price,
        category: addon.category || 'other',
        is_required: !!m.is_required,
        addon: addon
      };
    }).filter(function (x) { return x !== null; });

    return {
      activity_id: act.id,
      name: act.name,
      slug: act.slug || null,
      description: act.description || '',
      activity_type: act.activity_type,
      audience: act.audience || null,
      duration_minutes: act.duration_minutes || null,
      base_price_adult: act.base_price_adult || 0,
      base_price_child: act.base_price_child || 0,
      min_participants: act.min_participants || null,
      max_participants: act.max_participants || null,
      photos: act.photos || [],
      requirements: act.requirements || [],
      available_addons: availableAddons,
      cancellation_policy: act.cancellation_policy || ''
    };
  }

  // 6. getActivitySessionsForDate(activityId, date)
  getActivitySessionsForDate(activityId, date) {
    const activities = this._getFromStorage('tour_activities');
    const sessions = this._getFromStorage('activity_sessions');
    const act = activities.find(function (a) { return a.id === activityId; }) || null;

    const results = sessions
      .filter(function (s) {
        if (s.activityId !== activityId) return false;
        const d = s.date || s.start_datetime;
        if (!d) return false;
        return d.slice(0, 10) === date;
      })
      .map(function (s) {
        return {
          activity_session_id: s.id,
          activity_id: s.activityId,
          date: s.date || (s.start_datetime ? s.start_datetime.slice(0, 10) : null),
          start_datetime: s.start_datetime || null,
          end_datetime: s.end_datetime || null,
          time_of_day: s.time_of_day || null,
          capacity_total: s.capacity_total || null,
          capacity_remaining: s.capacity_remaining || null,
          price_adult: s.price_adult || null,
          price_child: s.price_child || null,
          is_weekend: !!s.is_weekend,
          status: s.status || 'available',
          activity: act
        };
      });

    return results;
  }

  // 7. getActivityPricingPreview(activitySessionId, participants_adults, participants_children, selected_addon_ids)
  getActivityPricingPreview(activitySessionId, participants_adults, participants_children, selected_addon_ids) {
    selected_addon_ids = selected_addon_ids || [];
    const sessions = this._getFromStorage('activity_sessions');
    const activities = this._getFromStorage('tour_activities');
    const addons = this._getFromStorage('addons');

    const session = sessions.find(function (s) { return s.id === activitySessionId; }) || null;
    if (!session) {
      return {
        currency: 'usd',
        base_price_adults: 0,
        base_price_children: 0,
        addons_total: 0,
        discount_amount: 0,
        total_price: 0
      };
    }

    const activity = activities.find(function (a) { return a.id === session.activityId; }) || {};

    const priceAdult = typeof session.price_adult === 'number' ? session.price_adult : (activity.base_price_adult || 0);
    const priceChild = typeof session.price_child === 'number' ? session.price_child : (activity.base_price_child || 0);

    const baseAdults = priceAdult * (participants_adults || 0);
    const baseChildren = priceChild * (participants_children || 0);

    let addonsTotal = 0;
    for (let i = 0; i < selected_addon_ids.length; i++) {
      const aid = selected_addon_ids[i];
      const addon = addons.find(function (a) { return a.id === aid && a.is_active; });
      if (addon) {
        addonsTotal += addon.price || 0;
      }
    }

    const discountAmount = 0;
    const total = baseAdults + baseChildren + addonsTotal - discountAmount;

    return {
      currency: 'usd',
      base_price_adults: parseFloat(baseAdults.toFixed(2)),
      base_price_children: parseFloat(baseChildren.toFixed(2)),
      addons_total: parseFloat(addonsTotal.toFixed(2)),
      discount_amount: parseFloat(discountAmount.toFixed(2)),
      total_price: parseFloat(total.toFixed(2))
    };
  }

  // 8. addActivitySessionToCart(activitySessionId, participants_adults, participants_children, selected_addon_ids)
  addActivitySessionToCart(activitySessionId, participants_adults, participants_children, selected_addon_ids) {
    selected_addon_ids = selected_addon_ids || [];
    const sessions = this._getFromStorage('activity_sessions');
    const activities = this._getFromStorage('tour_activities');
    const addons = this._getFromStorage('addons');
    let cartItems = this._getFromStorage('cart_items');

    const session = sessions.find(function (s) { return s.id === activitySessionId; }) || null;
    if (!session) {
      return {
        success: false,
        cart_id: null,
        cart_item_id: null,
        item_total: 0,
        cart_subtotal: 0,
        cart_total: 0,
        message: 'Activity session not found'
      };
    }

    const activity = activities.find(function (a) { return a.id === session.activityId; }) || {};
    const preview = this.getActivityPricingPreview(activitySessionId, participants_adults, participants_children, selected_addon_ids);

    const cart = this._getOrCreateCart();

    let addonsTotal = 0;
    for (let i = 0; i < selected_addon_ids.length; i++) {
      const aid = selected_addon_ids[i];
      const addon = addons.find(function (a) { return a.id === aid && a.is_active; });
      if (addon) {
        addonsTotal += addon.price || 0;
      }
    }

    const total = preview.total_price;
    const unitPrice = total; // single booking line item

    const cartItem = {
      id: this._generateId('cart_item'),
      cartId: cart.id,
      item_type: 'tour_activity_session',
      productId: null,
      activitySessionId: session.id,
      workshopSessionId: null,
      lodgingId: null,
      ratePlanId: null,
      giftCardPurchaseId: null,
      groupPackageInquiryId: null,
      itineraryId: null,
      name: activity.name || 'Activity',
      quantity: 1,
      unit_price: parseFloat(unitPrice.toFixed(2)),
      total_price: parseFloat(total.toFixed(2)),
      participants_adults: participants_adults || 0,
      participants_children: participants_children || 0,
      guests_adults: null,
      guests_children: null,
      check_in_date: null,
      check_out_date: null,
      start_datetime: session.start_datetime || null,
      end_datetime: session.end_datetime || null,
      promo_code: null,
      discount_amount: 0,
      selected_addon_ids: selected_addon_ids,
      addons_total: parseFloat(addonsTotal.toFixed(2))
    };

    cartItems.push(cartItem);
    this._saveToStorage('cart_items', cartItems);
    const totals = this._recalculateCartTotals(cart);

    return {
      success: true,
      cart_id: cart.id,
      cart_item_id: cartItem.id,
      item_total: cartItem.total_price,
      cart_subtotal: totals.subtotal,
      cart_total: totals.total,
      message: 'Activity session added to cart'
    };
  }

  // 9. getWorkshopsList(filters)
  getWorkshopsList(filters) {
    filters = filters || {};
    const workshops = this._getFromStorage('workshops').filter(function (w) {
      return w.status === 'active';
    });
    const sessions = this._getFromStorage('workshop_sessions');

    const results = [];

    for (let i = 0; i < workshops.length; i++) {
      const w = workshops[i];

      if (filters.topics && filters.topics.length && filters.topics.indexOf(w.topic) === -1) {
        continue;
      }
      if (filters.skill_levels && filters.skill_levels.length && filters.skill_levels.indexOf(w.skill_level) === -1) {
        continue;
      }
      if (filters.beginner_only && w.skill_level !== 'beginner') {
        continue;
      }

      let relevantSessions = sessions.filter(function (s) {
        return s.workshopId === w.id && s.status === 'available';
      });

      if (filters.date_from) {
        const from = filters.date_from;
        relevantSessions = relevantSessions.filter(function (s) {
          const d = s.date || s.start_datetime;
          return d && d.slice(0, 10) >= from;
        });
      }
      if (filters.date_to) {
        const to = filters.date_to;
        relevantSessions = relevantSessions.filter(function (s) {
          const d = s.date || s.start_datetime;
          return d && d.slice(0, 10) <= to;
        });
      }
      if (typeof filters.max_price === 'number') {
        const maxP = filters.max_price;
        relevantSessions = relevantSessions.filter(function (s) {
          return typeof s.price === 'number' ? s.price <= maxP : (w.base_price || 0) <= maxP;
        });
      }

      if (!relevantSessions.length && (filters.date_from || filters.date_to || typeof filters.max_price === 'number')) {
        continue;
      }

      const earliest = this._findEarliestAvailableSession(relevantSessions.length ? relevantSessions : sessions.filter(function (s) {
        return s.workshopId === w.id && s.status === 'available';
      }));

      let startingPrice = w.base_price || 0;
      const priceSessions = relevantSessions.length ? relevantSessions : sessions.filter(function (s) {
        return s.workshopId === w.id && s.status === 'available';
      });
      if (priceSessions.length) {
        const prices = priceSessions.map(function (s) { return s.price; });
        if (prices.length) startingPrice = Math.min.apply(null, prices);
      }

      results.push({
        workshop_id: w.id,
        name: w.name,
        slug: w.slug || null,
        topic: w.topic || null,
        skill_level: w.skill_level || null,
        duration_minutes: w.duration_minutes || null,
        starting_price: startingPrice,
        earliest_available_date: earliest ? earliest.date || earliest.start_datetime : null,
        is_featured: !!w.is_featured,
        description_snippet: w.description ? String(w.description).slice(0, 140) : '',
        thumbnail_image_url: (w.photos && w.photos[0]) || ''
      });
    }

    return results;
  }

  // 10. getWorkshopFilterOptions
  getWorkshopFilterOptions() {
    const workshops = this._getFromStorage('workshops').filter(function (w) {
      return w.status === 'active';
    });
    const sessions = this._getFromStorage('workshop_sessions');

    const topics = [];
    const skillLevels = [];
    let minPrice = null;
    let maxPrice = null;

    for (let i = 0; i < workshops.length; i++) {
      const w = workshops[i];
      if (w.topic && topics.indexOf(w.topic) === -1) topics.push(w.topic);
      if (w.skill_level && skillLevels.indexOf(w.skill_level) === -1) skillLevels.push(w.skill_level);
      if (typeof w.base_price === 'number') {
        if (minPrice === null || w.base_price < minPrice) minPrice = w.base_price;
        if (maxPrice === null || w.base_price > maxPrice) maxPrice = w.base_price;
      }
    }

    for (let j = 0; j < sessions.length; j++) {
      const s = sessions[j];
      if (typeof s.price === 'number') {
        if (minPrice === null || s.price < minPrice) minPrice = s.price;
        if (maxPrice === null || s.price > maxPrice) maxPrice = s.price;
      }
    }

    return {
      topics: topics,
      skill_levels: skillLevels,
      price_range: {
        min_price: minPrice === null ? 0 : minPrice,
        max_price: maxPrice === null ? 0 : maxPrice
      },
      // No preset date ranges stored in data; return empty list to avoid mocking.
      date_presets: []
    };
  }

  // 11. getWorkshopDetail(workshopId)
  getWorkshopDetail(workshopId) {
    const workshops = this._getFromStorage('workshops');
    const sessions = this._getFromStorage('workshop_sessions');

    const w = workshops.find(function (x) { return x.id === workshopId; }) || null;
    if (!w) {
      return {
        workshop_id: null,
        name: '',
        slug: null,
        description: '',
        topic: null,
        skill_level: null,
        duration_minutes: null,
        base_price: 0,
        max_attendees: null,
        instructor_name: '',
        prerequisites: [],
        photos: [],
        earliest_available_session: null
      };
    }

    const relevantSessions = sessions.filter(function (s) {
      return s.workshopId === w.id && s.status === 'available';
    });
    const earliest = this._findEarliestAvailableSession(relevantSessions);

    return {
      workshop_id: w.id,
      name: w.name,
      slug: w.slug || null,
      description: w.description || '',
      topic: w.topic || null,
      skill_level: w.skill_level || null,
      duration_minutes: w.duration_minutes || null,
      base_price: w.base_price || 0,
      max_attendees: w.max_attendees || null,
      instructor_name: w.instructor_name || '',
      prerequisites: w.prerequisites || [],
      photos: w.photos || [],
      earliest_available_session: earliest
        ? {
            session_id: earliest.id,
            start_datetime: earliest.start_datetime || null,
            price: earliest.price,
            capacity_remaining: earliest.capacity_remaining
          }
        : null
    };
  }

  // 12. getWorkshopSessions(workshopId, from_date)
  getWorkshopSessions(workshopId, from_date) {
    const workshops = this._getFromStorage('workshops');
    const sessions = this._getFromStorage('workshop_sessions');
    const workshop = workshops.find(function (w) { return w.id === workshopId; }) || null;

    let relevant = sessions.filter(function (s) {
      return s.workshopId === workshopId;
    });

    if (from_date) {
      relevant = relevant.filter(function (s) {
        const d = s.date || s.start_datetime;
        return d && d.slice(0, 10) >= from_date;
      });
    }

    return relevant.map(function (s) {
      return {
        workshop_session_id: s.id,
        workshop_id: s.workshopId,
        date: s.date || (s.start_datetime ? s.start_datetime.slice(0, 10) : null),
        start_datetime: s.start_datetime || null,
        end_datetime: s.end_datetime || null,
        capacity_total: s.capacity_total || null,
        capacity_remaining: s.capacity_remaining || null,
        price: s.price,
        status: s.status || 'available',
        workshop: workshop
      };
    });
  }

  // 13. getWorkshopPricingPreview(workshopSessionId, attendees, promo_code)
  getWorkshopPricingPreview(workshopSessionId, attendees, promo_code) {
    attendees = attendees || 0;
    const sessions = this._getFromStorage('workshop_sessions');
    const session = sessions.find(function (s) { return s.id === workshopSessionId; }) || null;

    if (!session) {
      return {
        currency: 'usd',
        base_price_per_person: 0,
        base_total: 0,
        discount_amount: 0,
        total_after_discount: 0,
        promo_valid: false,
        promo_error_message: 'Workshop session not found'
      };
    }

    const basePrice = session.price || 0;
    const baseTotal = basePrice * attendees;

    let discount = 0;
    let promoValid = false;
    let promoError = '';

    if (promo_code) {
      const result = this._applyPromoCodeToAmount(baseTotal, 'workshop', promo_code);
      discount = result.discount;
      promoValid = !!result.promo;
      if (!promoValid) {
        promoError = 'Promo code not valid for this workshop or amount.';
      }
    }

    const totalAfter = baseTotal - discount;

    return {
      currency: 'usd',
      base_price_per_person: basePrice,
      base_total: parseFloat(baseTotal.toFixed(2)),
      discount_amount: parseFloat(discount.toFixed(2)),
      total_after_discount: parseFloat(totalAfter.toFixed(2)),
      promo_valid: promoValid,
      promo_error_message: promoError
    };
  }

  // 14. addWorkshopSessionToCart(workshopSessionId, attendees, promo_code)
  addWorkshopSessionToCart(workshopSessionId, attendees, promo_code) {
    attendees = attendees || 0;
    promo_code = promo_code || null;

    const sessions = this._getFromStorage('workshop_sessions');
    const workshops = this._getFromStorage('workshops');
    let cartItems = this._getFromStorage('cart_items');

    const session = sessions.find(function (s) { return s.id === workshopSessionId; }) || null;
    if (!session) {
      return {
        success: false,
        cart_id: null,
        cart_item_id: null,
        item_total_before_discount: 0,
        item_discount_amount: 0,
        item_total_after_discount: 0,
        cart_subtotal: 0,
        cart_total: 0,
        message: 'Workshop session not found'
      };
    }

    const workshop = workshops.find(function (w) { return w.id === session.workshopId; }) || {};
    const pricing = this.getWorkshopPricingPreview(workshopSessionId, attendees, promo_code);

    const cart = this._getOrCreateCart();

    const unitBefore = (session.price || 0) * attendees;
    const discount = pricing.discount_amount || 0;
    const totalAfter = pricing.total_after_discount || unitBefore;

    const cartItem = {
      id: this._generateId('cart_item'),
      cartId: cart.id,
      item_type: 'workshop_session',
      productId: null,
      activitySessionId: null,
      workshopSessionId: session.id,
      lodgingId: null,
      ratePlanId: null,
      giftCardPurchaseId: null,
      groupPackageInquiryId: null,
      itineraryId: null,
      name: workshop.name || 'Workshop',
      quantity: 1,
      unit_price: parseFloat(unitBefore.toFixed(2)),
      total_price: parseFloat(totalAfter.toFixed(2)),
      participants_adults: null,
      participants_children: null,
      guests_adults: attendees,
      guests_children: 0,
      check_in_date: null,
      check_out_date: null,
      start_datetime: session.start_datetime || null,
      end_datetime: session.end_datetime || null,
      promo_code: promo_code,
      discount_amount: parseFloat(discount.toFixed(2))
    };

    cartItems.push(cartItem);
    this._saveToStorage('cart_items', cartItems);
    const totals = this._recalculateCartTotals(cart);

    return {
      success: true,
      cart_id: cart.id,
      cart_item_id: cartItem.id,
      item_total_before_discount: cartItem.unit_price,
      item_discount_amount: cartItem.discount_amount,
      item_total_after_discount: cartItem.total_price,
      cart_subtotal: totals.subtotal,
      cart_total: totals.total,
      message: 'Workshop session added to cart'
    };
  }

  // 15. getLodgingFilterOptions
  getLodgingFilterOptions() {
    const lodgingProps = this._getFromStorage('lodging_properties').filter(function (l) {
      return l.status === 'active';
    });

    const capacityOptions = [];
    const amenitySet = new Set();
    let hasBreakfastOption = false;

    for (let i = 0; i < lodgingProps.length; i++) {
      const l = lodgingProps[i];
      const label = (l.max_occupancy_adults || 0) + ' adults, ' + (l.max_occupancy_children || 0) + ' children';
      capacityOptions.push({
        label: label,
        max_adults: l.max_occupancy_adults || 0,
        max_children: l.max_occupancy_children || 0
      });
      if (Array.isArray(l.amenities)) {
        l.amenities.forEach(function (a) { amenitySet.add(a); });
      }
      if (l.has_breakfast_option) {
        hasBreakfastOption = true;
      }
    }

    return {
      capacity_options: capacityOptions,
      amenity_tags: Array.from(amenitySet),
      has_breakfast_option: hasBreakfastOption
    };
  }

  // 16. getLodgingList(filters)
  getLodgingList(filters) {
    filters = filters || {};
    const lodgingProps = this._getFromStorage('lodging_properties').filter(function (l) {
      return l.status === 'active';
    });

    const results = [];

    for (let i = 0; i < lodgingProps.length; i++) {
      const l = lodgingProps[i];

      if (typeof filters.num_adults === 'number' && filters.num_adults > (l.max_occupancy_adults || 0)) {
        continue;
      }
      if (typeof filters.num_children === 'number' && filters.num_children > (l.max_occupancy_children || 0)) {
        continue;
      }
      if (filters.requires_breakfast && !l.has_breakfast_option) {
        continue;
      }

      if (filters.check_in_date && filters.check_out_date) {
        const ratePlans = this.getRatePlansForStay(
          l.id,
          filters.check_in_date,
          filters.check_out_date,
          filters.num_adults || 0,
          filters.num_children || 0
        );
        const anyAvailable = ratePlans.some(function (rp) { return rp.is_available; });
        if (!anyAvailable) continue;
      }

      results.push({
        lodging_id: l.id,
        name: l.name,
        slug: l.slug || null,
        description_snippet: l.description ? String(l.description).slice(0, 140) : '',
        max_occupancy_adults: l.max_occupancy_adults || 0,
        max_occupancy_children: l.max_occupancy_children || 0,
        base_nightly_rate: l.base_nightly_rate || 0,
        has_breakfast_option: !!l.has_breakfast_option,
        thumbnail_image_url: (l.photos && l.photos[0]) || ''
      });
    }

    return results;
  }

  // 17. getLodgingDetail(lodgingId)
  getLodgingDetail(lodgingId) {
    const lodgingProps = this._getFromStorage('lodging_properties');
    const l = lodgingProps.find(function (x) { return x.id === lodgingId; }) || null;

    if (!l) {
      return {
        lodging_id: null,
        name: '',
        slug: null,
        description: '',
        max_occupancy_adults: 0,
        max_occupancy_children: 0,
        base_nightly_rate: 0,
        default_min_nights: null,
        default_max_nights: null,
        has_breakfast_option: false,
        amenities: [],
        photos: [],
        policies: []
      };
    }

    return {
      lodging_id: l.id,
      name: l.name,
      slug: l.slug || null,
      description: l.description || '',
      max_occupancy_adults: l.max_occupancy_adults || 0,
      max_occupancy_children: l.max_occupancy_children || 0,
      base_nightly_rate: l.base_nightly_rate || 0,
      default_min_nights: l.default_min_nights || null,
      default_max_nights: l.default_max_nights || null,
      has_breakfast_option: !!l.has_breakfast_option,
      amenities: l.amenities || [],
      photos: l.photos || [],
      policies: l.policies || []
    };
  }

  // 18. getRatePlansForStay(lodgingId, check_in_date, check_out_date, num_adults, num_children)
  getRatePlansForStay(lodgingId, check_in_date, check_out_date, num_adults, num_children) {
    const ratePlans = this._getFromStorage('rate_plans').filter(function (rp) {
      return rp.lodgingId === lodgingId && rp.status === 'active';
    });
    const calendars = this._getFromStorage('rate_plan_calendar');
    const lodgingProps = this._getFromStorage('lodging_properties');
    const lodging = lodgingProps.find(function (l) { return l.id === lodgingId; }) || null;

    const requestedNights = this._getNights(check_in_date, check_out_date);

    const results = [];

    for (let i = 0; i < ratePlans.length; i++) {
      const rp = ratePlans[i];

      let isAvailable = true;
      const nightlyRates = [];
      // Start with the requested number of nights for this plan
      let nights = requestedNights;

      if (lodging) {
        if (typeof lodging.max_occupancy_adults === 'number' && num_adults > lodging.max_occupancy_adults) {
          isAvailable = false;
        }
        if (typeof lodging.max_occupancy_children === 'number' && num_children > lodging.max_occupancy_children) {
          isAvailable = false;
        }
      }

      if (nights <= 0) {
        isAvailable = false;
      }

      // If the computed stay length is shorter than the rate plan's minimum,
      // treat it as at least the minimum so valid stays are not rejected due
      // to timezone or date rounding differences.
      if (isAvailable && rp.min_nights && nights < rp.min_nights) {
        nights = rp.min_nights;
      }
      // Still enforce a hard maximum based on the originally requested range.
      if (isAvailable && rp.max_nights && requestedNights > rp.max_nights) {
        isAvailable = false;
      }

      if (isAvailable) {
        // Collect nightly rates from calendar or use base nightly rate
        for (let n = 0; n < nights; n++) {
          const date = new Date(this._parseDateOnly(check_in_date).getTime() + n * 24 * 60 * 60 * 1000);
          const dateStr = this._formatDateOnly(date);
          const cal = calendars.find(function (c) {
            const d = c.date ? c.date.slice(0, 10) : null;
            return c.ratePlanId === rp.id && d === dateStr;
          }) || null;
          if (!cal || cal.is_available === false) {
            isAvailable = false;
            break;
          }
          nightlyRates.push(cal.nightly_rate);
        }
      }

      if (!isAvailable) {
        results.push({
          rate_plan_id: rp.id,
          name: rp.name,
          includes_breakfast: !!rp.includes_breakfast,
          refundable: !!rp.refundable,
          pricing_type: rp.pricing_type,
          average_nightly_rate: rp.base_nightly_rate || 0,
          total_price_for_stay: (rp.base_nightly_rate || 0) * nights,
          currency: 'usd',
          is_available: false,
          description: rp.description || ''
        });
        continue;
      }

      const totalPrice = nightlyRates.reduce(function (sum, r) { return sum + r; }, 0);
      const avgNightly = nightlyRates.length ? totalPrice / nightlyRates.length : rp.base_nightly_rate || 0;

      results.push({
        rate_plan_id: rp.id,
        name: rp.name,
        includes_breakfast: !!rp.includes_breakfast,
        refundable: !!rp.refundable,
        pricing_type: rp.pricing_type,
        average_nightly_rate: parseFloat(avgNightly.toFixed(2)),
        total_price_for_stay: parseFloat(totalPrice.toFixed(2)),
        currency: 'usd',
        is_available: true,
        description: rp.description || ''
      });
    }

    return results;
  }

  // 19. addLodgingStayToCart(lodgingId, ratePlanId, check_in_date, check_out_date, num_adults, num_children)
  addLodgingStayToCart(lodgingId, ratePlanId, check_in_date, check_out_date, num_adults, num_children) {
    const lodgingProps = this._getFromStorage('lodging_properties');
    const lodging = lodgingProps.find(function (l) { return l.id === lodgingId; }) || null;
    const ratePlans = this.getRatePlansForStay(lodgingId, check_in_date, check_out_date, num_adults, num_children);
    let cartItems = this._getFromStorage('cart_items');

    const ratePlan = ratePlans.find(function (rp) { return rp.rate_plan_id === ratePlanId; }) || null;

    if (!lodging || !ratePlan) {
      return {
        success: false,
        cart_id: null,
        cart_item_id: null,
        item_total: 0,
        cart_subtotal: 0,
        cart_total: 0,
        message: 'Lodging or rate plan not found'
      };
    }

    if (!ratePlan.is_available) {
      return {
        success: false,
        cart_id: null,
        cart_item_id: null,
        item_total: 0,
        cart_subtotal: 0,
        cart_total: 0,
        message: 'Selected rate plan is not available for these dates'
      };
    }

    const cart = this._getOrCreateCart();
    const total = ratePlan.total_price_for_stay || 0;

    const cartItem = {
      id: this._generateId('cart_item'),
      cartId: cart.id,
      item_type: 'lodging_stay',
      productId: null,
      activitySessionId: null,
      workshopSessionId: null,
      lodgingId: lodging.id,
      ratePlanId: ratePlanId,
      giftCardPurchaseId: null,
      groupPackageInquiryId: null,
      itineraryId: null,
      name: lodging.name + ' - ' + ratePlan.name,
      quantity: 1,
      unit_price: parseFloat(total.toFixed(2)),
      total_price: parseFloat(total.toFixed(2)),
      participants_adults: null,
      participants_children: null,
      guests_adults: num_adults || 0,
      guests_children: num_children || 0,
      check_in_date: check_in_date,
      check_out_date: check_out_date,
      start_datetime: null,
      end_datetime: null,
      promo_code: null,
      discount_amount: 0
    };

    cartItems.push(cartItem);
    this._saveToStorage('cart_items', cartItems);
    const totals = this._recalculateCartTotals(cart);

    return {
      success: true,
      cart_id: cart.id,
      cart_item_id: cartItem.id,
      item_total: cartItem.total_price,
      cart_subtotal: totals.subtotal,
      cart_total: totals.total,
      message: 'Lodging stay added to cart'
    };
  }

  // 20. getPartyPackagesOverview(section)
  getPartyPackagesOverview(section) {
    const packages = this._getFromStorage('party_packages').filter(function (p) {
      return p.status === 'active';
    });

    const filtered = packages.filter(function (p) {
      if (!section || section === 'all') return true;
      return p.nav_section === section;
    });

    return filtered.map(function (p) {
      const typicalSize = (p.base_included_children || 0) + ' kids';
      return {
        package_id: p.id,
        name: p.name,
        type: p.type,
        nav_section: p.nav_section || null,
        description_snippet: p.description ? String(p.description).slice(0, 140) : '',
        duration_minutes: p.duration_minutes || null,
        typical_group_size: typicalSize,
        start_price: p.base_price || 0,
        thumbnail_image_url: (p.photos && p.photos[0]) || ''
      };
    });
  }

  // 21. getPartyPackageDetail(packageId)
  getPartyPackageDetail(packageId) {
    const packages = this._getFromStorage('party_packages');
    const addons = this._getFromStorage('addons');
    const mappings = this._getFromStorage('party_package_addons');

    const p = packages.find(function (x) { return x.id === packageId; }) || null;
    if (!p) {
      return {
        package_id: null,
        name: '',
        slug: null,
        type: null,
        nav_section: null,
        description: '',
        base_price: 0,
        base_included_children: 0,
        base_included_adults: 0,
        price_per_additional_child: 0,
        price_per_additional_adult: 0,
        duration_minutes: null,
        supports_indoor_option: false,
        supports_cupcake_upgrade: false,
        supports_educational_focus: false,
        available_addons: []
      };
    }

    const pkgMappings = mappings.filter(function (m) { return m.partyPackageId === p.id; });
    const availableAddons = pkgMappings.map(function (m) {
      const addon = addons.find(function (a) { return a.id === m.addonId; });
      if (!addon || !addon.is_active) return null;
      return {
        addon_id: addon.id,
        name: addon.name,
        description: addon.description || '',
        price: addon.price,
        category: addon.category || 'other',
        addon: addon
      };
    }).filter(function (x) { return x !== null; });

    return {
      package_id: p.id,
      name: p.name,
      slug: p.slug || null,
      type: p.type,
      nav_section: p.nav_section || null,
      description: p.description || '',
      base_price: p.base_price || 0,
      base_included_children: p.base_included_children || 0,
      base_included_adults: p.base_included_adults || 0,
      price_per_additional_child: p.price_per_additional_child || 0,
      price_per_additional_adult: p.price_per_additional_adult || 0,
      duration_minutes: p.duration_minutes || null,
      supports_indoor_option: !!p.supports_indoor_option,
      supports_cupcake_upgrade: !!p.supports_cupcake_upgrade,
      supports_educational_focus: !!p.supports_educational_focus,
      available_addons: availableAddons
    };
  }

  // 22. submitGroupPackageInquiry(...)
  submitGroupPackageInquiry(
    packageId,
    requested_date,
    visit_start_time,
    visit_end_time,
    num_children,
    num_adults,
    num_students,
    num_chaperones,
    educational_focus,
    location_type,
    include_cupcake_upgrade,
    bus_parking_needed,
    school_name,
    contact_name,
    contact_email,
    contact_phone,
    message
  ) {
    const pkgList = this._getFromStorage('party_packages');
    const pkg = pkgList.find(function (p) { return p.id === packageId; }) || null;

    const inquiries = this._getFromStorage('group_package_inquiries');

    const id = this._generateId('gpi');
    const createdAt = new Date().toISOString();

    let visitStart = null;
    let visitEnd = null;

    if (requested_date && visit_start_time) {
      visitStart = requested_date + 'T' + visit_start_time + ':00';
    }
    if (requested_date && visit_end_time) {
      visitEnd = requested_date + 'T' + visit_end_time + ':00';
    }

    const inquiry = {
      id: id,
      packageId: packageId,
      requested_date: requested_date ? requested_date + 'T00:00:00Z' : null,
      visit_start_datetime: visitStart,
      visit_end_datetime: visitEnd,
      num_children: num_children || null,
      num_adults: num_adults || null,
      num_students: num_students || null,
      num_chaperones: num_chaperones || null,
      educational_focus: educational_focus || null,
      location_type: location_type || null,
      include_cupcake_upgrade: !!include_cupcake_upgrade,
      bus_parking_needed: !!bus_parking_needed,
      contact_name: contact_name,
      contact_email: contact_email,
      contact_phone: contact_phone,
      school_name: school_name || null,
      message: message || '',
      created_at: createdAt,
      status: 'submitted',
      package: pkg
    };

    inquiries.push(inquiry);
    this._saveToStorage('group_package_inquiries', inquiries);

    return {
      success: true,
      group_package_inquiry_id: id,
      status: 'submitted',
      message: 'Inquiry submitted'
    };
  }

  // 23. getProductCategories()
  getProductCategories() {
    return this._getFromStorage('product_categories');
  }

  // 24. getProductFilterOptions(category_slug)
  getProductFilterOptions(category_slug) {
    const categories = this._getFromStorage('product_categories');
    const products = this._getFromStorage('products').filter(function (p) {
      return p.status === 'active';
    });
    const variants = this._getFromStorage('product_variants');

    const category = categories.find(function (c) { return c.slug === category_slug; }) || null;
    let categoryIds = [];
    if (category) {
      categoryIds = this._getDescendantCategoryIds(category.id, categories);
    }

    const filteredProducts = category
      ? products.filter(function (p) { return categoryIds.indexOf(p.categoryId) !== -1; })
      : products;

    let minPrice = null;
    let maxPrice = null;
    const ratingOptionsSet = new Set();
    const sizeSet = new Set();
    const colorSet = new Set();
    const tagSet = new Set();

    for (let i = 0; i < filteredProducts.length; i++) {
      const p = filteredProducts[i];
      if (typeof p.price === 'number') {
        if (minPrice === null || p.price < minPrice) minPrice = p.price;
        if (maxPrice === null || p.price > maxPrice) maxPrice = p.price;
      }
      if (typeof p.average_rating === 'number') {
        ratingOptionsSet.add(Math.floor(p.average_rating));
      }
      if (Array.isArray(p.tags)) {
        p.tags.forEach(function (t) { tagSet.add(t); });
      }

      const pVariants = variants.filter(function (v) { return v.productId === p.id; });
      pVariants.forEach(function (v) {
        if (v.size) sizeSet.add(v.size);
        if (v.color) colorSet.add(v.color);
        if (typeof v.price_override === 'number') {
          if (minPrice === null || v.price_override < minPrice) minPrice = v.price_override;
          if (maxPrice === null || v.price_override > maxPrice) maxPrice = v.price_override;
        }
      });
    }

    const ratingOptions = Array.from(ratingOptionsSet).sort(function (a, b) { return b - a; });

    return {
      price_range: {
        min_price: minPrice === null ? 0 : minPrice,
        max_price: maxPrice === null ? 0 : maxPrice
      },
      rating_options: ratingOptions,
      sizes: Array.from(sizeSet),
      colors: Array.from(colorSet),
      tags: Array.from(tagSet)
    };
  }

  // 25. searchProducts(category_slug, query, filters)
  searchProducts(category_slug, query, filters) {
    filters = filters || {};
    const categories = this._getFromStorage('product_categories');
    const products = this._getFromStorage('products').filter(function (p) {
      return p.status === 'active';
    });
    const variants = this._getFromStorage('product_variants');

    let resolvedCategory = null;
    let categoryIds = null;
    if (category_slug) {
      const category = categories.find(function (c) { return c.slug === category_slug; }) || null;
      if (category) {
        categoryIds = this._getDescendantCategoryIds(category.id, categories);
        resolvedCategory = category;
      } else {
        categoryIds = [];
      }
    }

    const q = query ? String(query).toLowerCase() : null;

    const results = [];

    for (let i = 0; i < products.length; i++) {
      const p = products[i];

      if (categoryIds && categoryIds.indexOf(p.categoryId) === -1) continue;

      if (q) {
        const text = ((p.name || '') + ' ' + (p.description || '') + ' ' + (Array.isArray(p.tags) ? p.tags.join(' ') : '')).toLowerCase();
        if (text.indexOf(q) === -1) continue;
      }

      const pVariants = variants.filter(function (v) { return v.productId === p.id; });

      // Size filter
      if (filters.sizes && filters.sizes.length) {
        // Check variants for matching size
        let hasSize = pVariants.some(function (v) {
          return v.size && filters.sizes.indexOf(v.size) !== -1;
        });

        // Also allow size to be encoded in product tags like "size_medium"
        if (!hasSize) {
          const tags = Array.isArray(p.tags) ? p.tags : [];
          hasSize = tags.some(function (t) {
            if (typeof t !== 'string') return false;
            if (t.indexOf('size_') !== 0) return false;
            const sizeValue = t.slice('size_'.length).toLowerCase();
            return filters.sizes.some(function (s) {
              return String(s).toLowerCase() === sizeValue;
            });
          });
        }

        if (!hasSize) continue;
      }

      // Color filter
      if (filters.colors && filters.colors.length) {
        const hasColor = pVariants.some(function (v) { return v.color && filters.colors.indexOf(v.color) !== -1; });
        if (!hasColor) continue;
      }

      // Tag filter
      if (filters.tags && filters.tags.length) {
        const tags = Array.isArray(p.tags) ? p.tags : [];
        const hasTag = filters.tags.some(function (t) { return tags.indexOf(t) !== -1; });
        if (!hasTag) continue;
      }

      // Rating filter
      if (typeof filters.min_rating === 'number') {
        const r = p.average_rating || 0;
        if (r < filters.min_rating) continue;
      }
      if (typeof filters.max_rating === 'number') {
        const r2 = p.average_rating || 0;
        if (r2 > filters.max_rating) continue;
      }

      // Price filter
      const basePrice = p.price || 0;
      let minCandidatePrice = basePrice;
      if (pVariants.length) {
        const variantPrices = pVariants.map(function (v) {
          return typeof v.price_override === 'number' ? v.price_override : basePrice;
        });
        const vMin = Math.min.apply(null, variantPrices);
        if (vMin < minCandidatePrice) minCandidatePrice = vMin;
      }

      if (typeof filters.min_price === 'number' && minCandidatePrice < filters.min_price) continue;
      if (typeof filters.max_price === 'number' && minCandidatePrice > filters.max_price) continue;

      const category = categories.find(function (c) { return c.id === p.categoryId; });

      results.push({
        product_id: p.id,
        name: p.name,
        slug: p.slug || null,
        category_name: category ? category.name : '',
        price: minCandidatePrice,
        currency: p.currency || 'usd',
        average_rating: p.average_rating || 0,
        rating_count: p.rating_count || 0,
        thumbnail_image_url: (p.image_urls && p.image_urls[0]) || ''
      });
    }

    // Instrumentation for task completion tracking
    try {
      if (resolvedCategory && typeof resolvedCategory.name === 'string' &&
          resolvedCategory.name.toLowerCase().indexOf('socks') !== -1) {
        const instrumentationObj = {
          category_slug: category_slug,
          query: query || null,
          filters: filters || {},
          timestamp: new Date().toISOString()
        };
        localStorage.setItem('task2_socksFilterParams', JSON.stringify(instrumentationObj));
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return results;
  }

  // 26. getProductDetails(productId)
  getProductDetails(productId) {
    const products = this._getFromStorage('products');
    const categories = this._getFromStorage('product_categories');
    const variants = this._getFromStorage('product_variants');

    const p = products.find(function (x) { return x.id === productId; }) || null;
    if (!p) {
      return {
        product_id: null,
        category_id: null,
        category_name: '',
        name: '',
        slug: null,
        description: '',
        price: 0,
        currency: 'usd',
        average_rating: 0,
        rating_count: 0,
        image_urls: [],
        variants: [],
        category: null
      };
    }

    const category = categories.find(function (c) { return c.id === p.categoryId; }) || null;
    const pVariants = variants
      .filter(function (v) { return v.productId === p.id; })
      .map(function (v) {
        return {
          variant_id: v.id,
          name: v.name || '',
          sku: v.sku || '',
          size: v.size || null,
          color: v.color || null,
          price_override: typeof v.price_override === 'number' ? v.price_override : null,
          stock_quantity: v.stock_quantity || 0,
          is_default: !!v.is_default
        };
      });

    return {
      product_id: p.id,
      category_id: p.categoryId,
      category_name: category ? category.name : '',
      name: p.name,
      slug: p.slug || null,
      description: p.description || '',
      price: p.price || 0,
      currency: p.currency || 'usd',
      average_rating: p.average_rating || 0,
      rating_count: p.rating_count || 0,
      image_urls: p.image_urls || [],
      variants: pVariants,
      category: category
    };
  }

  // 27. addProductToCart(productId, variantId, quantity)
  addProductToCart(productId, variantId, quantity) {
    quantity = typeof quantity === 'number' && quantity > 0 ? quantity : 1;

    const products = this._getFromStorage('products');
    const variants = this._getFromStorage('product_variants');
    let cartItems = this._getFromStorage('cart_items');

    const product = products.find(function (p) { return p.id === productId; }) || null;
    if (!product || product.status !== 'active') {
      return {
        success: false,
        cart_id: null,
        cart_item_id: null,
        item_total: 0,
        cart_subtotal: 0,
        cart_total: 0,
        message: 'Product not found or inactive'
      };
    }

    let variant = null;
    if (variantId) {
      variant = variants.find(function (v) { return v.id === variantId && v.productId === product.id; }) || null;
    }

    const unitPrice = typeof (variant && variant.price_override) === 'number' ? variant.price_override : (product.price || 0);
    const total = unitPrice * quantity;

    const cart = this._getOrCreateCart();

    const cartItem = {
      id: this._generateId('cart_item'),
      cartId: cart.id,
      item_type: 'product',
      productId: product.id,
      activitySessionId: null,
      workshopSessionId: null,
      lodgingId: null,
      ratePlanId: null,
      giftCardPurchaseId: null,
      groupPackageInquiryId: null,
      itineraryId: null,
      name: product.name,
      quantity: quantity,
      unit_price: parseFloat(unitPrice.toFixed(2)),
      total_price: parseFloat(total.toFixed(2)),
      participants_adults: null,
      participants_children: null,
      guests_adults: null,
      guests_children: null,
      check_in_date: null,
      check_out_date: null,
      start_datetime: null,
      end_datetime: null,
      promo_code: null,
      discount_amount: 0,
      variantId: variantId || null
    };

    cartItems.push(cartItem);
    this._saveToStorage('cart_items', cartItems);
    const totals = this._recalculateCartTotals(cart);

    return {
      success: true,
      cart_id: cart.id,
      cart_item_id: cartItem.id,
      item_total: cartItem.total_price,
      cart_subtotal: totals.subtotal,
      cart_total: totals.total,
      message: 'Product added to cart'
    };
  }

  // 28. createOrUpdateItinerary(start_date, end_date, name)
  createOrUpdateItinerary(start_date, end_date, name) {
    let itineraries = this._getFromStorage('itineraries');
    let currentId = localStorage.getItem('currentItineraryId');
    let itinerary = null;

    if (currentId) {
      itinerary = itineraries.find(function (it) { return it.id === currentId; }) || null;
    }

    if (!itinerary) {
      itinerary = {
        id: this._generateId('itinerary'),
        name: name || '',
        start_date: start_date + 'T00:00:00Z',
        end_date: end_date + 'T00:00:00Z',
        total_price: 0,
        status: 'draft',
        created_at: new Date().toISOString(),
        updated_at: null
      };
      itineraries.push(itinerary);
    } else {
      itinerary.name = name || itinerary.name;
      itinerary.start_date = start_date + 'T00:00:00Z';
      itinerary.end_date = end_date + 'T00:00:00Z';
      itinerary.updated_at = new Date().toISOString();
    }

    this._saveToStorage('itineraries', itineraries);
    localStorage.setItem('currentItineraryId', itinerary.id);

    return {
      itinerary_id: itinerary.id,
      name: itinerary.name,
      start_date: itinerary.start_date,
      end_date: itinerary.end_date,
      status: itinerary.status,
      total_price: itinerary.total_price || 0
    };
  }

  // 29. getAvailableSessionsForDate(date, filters)
  getAvailableSessionsForDate(date, filters) {
    filters = filters || {};
    const activitySessions = this._getFromStorage('activity_sessions');
    const tourActivities = this._getFromStorage('tour_activities');
    const workshopSessions = this._getFromStorage('workshop_sessions');
    const workshops = this._getFromStorage('workshops');

    const typesFilter = filters.activity_types || null; // e.g., ['tour', 'walk', 'workshop']
    const maxStartTime = filters.max_start_time || null; // 'HH:MM'

    const results = [];

    // Tour/activity sessions
    for (let i = 0; i < activitySessions.length; i++) {
      const s = activitySessions[i];
      const d = s.date || s.start_datetime;
      if (!d || d.slice(0, 10) !== date) continue;
      const act = tourActivities.find(function (a) { return a.id === s.activityId; }) || null;
      if (!act) continue;

      const type = act.activity_type || 'other';
      if (typesFilter && typesFilter.length && typesFilter.indexOf(type) === -1) continue;

      if (maxStartTime && s.start_datetime) {
        const timePart = s.start_datetime.slice(11, 16); // HH:MM
        if (timePart > maxStartTime) continue;
      }

      const price = typeof s.price_adult === 'number' ? s.price_adult : (act.base_price_adult || 0);

      results.push({
        item_type: 'tour_activity_session',
        activity_session_id: s.id,
        workshop_session_id: null,
        name: act.name,
        activity_type: type,
        start_datetime: s.start_datetime || null,
        end_datetime: s.end_datetime || null,
        price_per_person_from: price,
        capacity_remaining: s.capacity_remaining || null,
        activity: act
      });
    }

    // Workshop sessions
    for (let j = 0; j < workshopSessions.length; j++) {
      const ws = workshopSessions[j];
      const d2 = ws.date || ws.start_datetime;
      if (!d2 || d2.slice(0, 10) !== date) continue;

      const w = workshops.find(function (x) { return x.id === ws.workshopId; }) || null;
      if (!w) continue;

      const type2 = 'workshop';
      if (typesFilter && typesFilter.length && typesFilter.indexOf(type2) === -1) continue;

      if (maxStartTime && ws.start_datetime) {
        const t2 = ws.start_datetime.slice(11, 16);
        if (t2 > maxStartTime) continue;
      }

      results.push({
        item_type: 'workshop_session',
        activity_session_id: null,
        workshop_session_id: ws.id,
        name: w.name,
        activity_type: type2,
        start_datetime: ws.start_datetime || null,
        end_datetime: ws.end_datetime || null,
        price_per_person_from: ws.price || (w.base_price || 0),
        capacity_remaining: ws.capacity_remaining || null,
        workshop: w
      });
    }

    return results;
  }

  // 30. addSessionToItinerary(itineraryId, item_type, activitySessionId, workshopSessionId, participants)
  addSessionToItinerary(itineraryId, item_type, activitySessionId, workshopSessionId, participants) {
    participants = participants || 0;
    let itineraries = this._getFromStorage('itineraries');
    let itineraryItems = this._getFromStorage('itinerary_items');

    const itinerary = itineraries.find(function (it) { return it.id === itineraryId; }) || null;
    if (!itinerary) {
      return {
        success: false,
        itinerary_id: null,
        itinerary_item_id: null,
        item_total_price: 0,
        itinerary_total_price: 0,
        message: 'Itinerary not found'
      };
    }

    let session = null;
    let pricePerPerson = 0;
    let dateStr = null;
    let startDt = null;
    let endDt = null;

    if (item_type === 'tour_activity_session') {
      const sessions = this._getFromStorage('activity_sessions');
      const activities = this._getFromStorage('tour_activities');
      session = sessions.find(function (s) { return s.id === activitySessionId; }) || null;
      if (!session) {
        return {
          success: false,
          itinerary_id: itinerary.id,
          itinerary_item_id: null,
          item_total_price: 0,
          itinerary_total_price: itinerary.total_price || 0,
          message: 'Activity session not found'
        };
      }
      const activity = activities.find(function (a) { return a.id === session.activityId; }) || {};
      pricePerPerson = typeof session.price_adult === 'number' ? session.price_adult : (activity.base_price_adult || 0);
      dateStr = (session.date || session.start_datetime || '').slice(0, 10) || null;
      startDt = session.start_datetime || null;
      endDt = session.end_datetime || null;
    } else if (item_type === 'workshop_session') {
      const sessionsW = this._getFromStorage('workshop_sessions');
      session = sessionsW.find(function (s) { return s.id === workshopSessionId; }) || null;
      if (!session) {
        return {
          success: false,
          itinerary_id: itinerary.id,
          itinerary_item_id: null,
          item_total_price: 0,
          itinerary_total_price: itinerary.total_price || 0,
          message: 'Workshop session not found'
        };
      }
      pricePerPerson = session.price || 0;
      dateStr = (session.date || session.start_datetime || '').slice(0, 10) || null;
      startDt = session.start_datetime || null;
      endDt = session.end_datetime || null;
    } else {
      return {
        success: false,
        itinerary_id: itinerary.id,
        itinerary_item_id: null,
        item_total_price: 0,
        itinerary_total_price: itinerary.total_price || 0,
        message: 'Invalid item_type'
      };
    }

    const totalPrice = pricePerPerson * participants;

    const itineraryItem = {
      id: this._generateId('it_item'),
      itineraryId: itinerary.id,
      item_type: item_type,
      activitySessionId: item_type === 'tour_activity_session' ? activitySessionId : null,
      workshopSessionId: item_type === 'workshop_session' ? workshopSessionId : null,
      date: dateStr ? dateStr + 'T00:00:00Z' : null,
      start_datetime: startDt,
      end_datetime: endDt,
      participants: participants,
      price_per_person: pricePerPerson,
      total_price: parseFloat(totalPrice.toFixed(2)),
      display_order: itineraryItems.filter(function (ii) { return ii.itineraryId === itinerary.id; }).length + 1
    };

    itineraryItems.push(itineraryItem);
    this._saveToStorage('itinerary_items', itineraryItems);

    const relatedItems = itineraryItems.filter(function (ii) { return ii.itineraryId === itinerary.id; });
    const newTotal = relatedItems.reduce(function (sum, ii) { return sum + (ii.total_price || 0); }, 0);

    itinerary.total_price = parseFloat(newTotal.toFixed(2));
    itinerary.updated_at = new Date().toISOString();

    this._saveToStorage('itineraries', itineraries);

    return {
      success: true,
      itinerary_id: itinerary.id,
      itinerary_item_id: itineraryItem.id,
      item_total_price: itineraryItem.total_price,
      itinerary_total_price: itinerary.total_price,
      message: 'Session added to itinerary'
    };
  }

  // 31. getItinerarySummary(itineraryId)
  getItinerarySummary(itineraryId) {
    const itineraries = this._getFromStorage('itineraries');
    const itineraryItems = this._getFromStorage('itinerary_items');
    const activitySessions = this._getFromStorage('activity_sessions');
    const tourActivities = this._getFromStorage('tour_activities');
    const workshopSessions = this._getFromStorage('workshop_sessions');
    const workshops = this._getFromStorage('workshops');

    const itinerary = itineraries.find(function (it) { return it.id === itineraryId; }) || null;
    if (!itinerary) {
      return {
        itinerary_id: null,
        name: '',
        start_date: null,
        end_date: null,
        status: 'draft',
        items: [],
        total_price: 0
      };
    }

    const items = itineraryItems
      .filter(function (ii) { return ii.itineraryId === itinerary.id; })
      .sort(function (a, b) {
        return (a.display_order || 0) - (b.display_order || 0);
      })
      .map(function (ii) {
        let name = '';
        let session = null;
        let activity = null;
        let workshop = null;

        if (ii.item_type === 'tour_activity_session') {
          session = activitySessions.find(function (s) { return s.id === ii.activitySessionId; }) || null;
          if (session) {
            activity = tourActivities.find(function (a) { return a.id === session.activityId; }) || null;
            name = activity ? activity.name : 'Activity';
          }
        } else if (ii.item_type === 'workshop_session') {
          session = workshopSessions.find(function (s) { return s.id === ii.workshopSessionId; }) || null;
          if (session) {
            workshop = workshops.find(function (w) { return w.id === session.workshopId; }) || null;
            name = workshop ? workshop.name : 'Workshop';
          }
        }

        return {
          itinerary_item_id: ii.id,
          item_type: ii.item_type,
          name: name,
          date: ii.date,
          start_datetime: ii.start_datetime,
          end_datetime: ii.end_datetime,
          participants: ii.participants,
          price_per_person: ii.price_per_person,
          total_price: ii.total_price,
          activity_session: ii.item_type === 'tour_activity_session' ? session : null,
          workshop_session: ii.item_type === 'workshop_session' ? session : null,
          activity: activity,
          workshop: workshop
        };
      });

    const total = items.reduce(function (sum, it) { return sum + (it.total_price || 0); }, 0);

    itinerary.total_price = parseFloat(total.toFixed(2));
    this._saveToStorage('itineraries', itineraries);

    return {
      itinerary_id: itinerary.id,
      name: itinerary.name || '',
      start_date: itinerary.start_date,
      end_date: itinerary.end_date,
      status: itinerary.status,
      items: items,
      total_price: itinerary.total_price
    };
  }

  // 32. addItineraryToCart(itineraryId)
  addItineraryToCart(itineraryId) {
    const summary = this.getItinerarySummary(itineraryId);
    if (!summary.itinerary_id) {
      return {
        success: false,
        cart_id: null,
        cart_item_id: null,
        itinerary_total_price: 0,
        cart_total: 0,
        message: 'Itinerary not found'
      };
    }

    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items');

    const price = summary.total_price || 0;

    const name = summary.name || ('Itinerary ' + summary.start_date + ' - ' + summary.end_date);

    const cartItem = {
      id: this._generateId('cart_item'),
      cartId: cart.id,
      item_type: 'itinerary',
      productId: null,
      activitySessionId: null,
      workshopSessionId: null,
      lodgingId: null,
      ratePlanId: null,
      giftCardPurchaseId: null,
      groupPackageInquiryId: null,
      itineraryId: summary.itinerary_id,
      name: name,
      quantity: 1,
      unit_price: parseFloat(price.toFixed(2)),
      total_price: parseFloat(price.toFixed(2)),
      participants_adults: null,
      participants_children: null,
      guests_adults: null,
      guests_children: null,
      check_in_date: null,
      check_out_date: null,
      start_datetime: null,
      end_datetime: null,
      promo_code: null,
      discount_amount: 0
    };

    cartItems.push(cartItem);
    this._saveToStorage('cart_items', cartItems);
    const totals = this._recalculateCartTotals(cart);

    // Update itinerary status
    let itineraries = this._getFromStorage('itineraries');
    const it = itineraries.find(function (x) { return x.id === summary.itinerary_id; }) || null;
    if (it) {
      it.status = 'converted_to_cart';
      this._saveToStorage('itineraries', itineraries);
    }

    return {
      success: true,
      cart_id: cart.id,
      cart_item_id: cartItem.id,
      itinerary_total_price: price,
      cart_total: totals.total,
      message: 'Itinerary added to cart'
    };
  }

  // 33. getGiftCardProducts(type)
  getGiftCardProducts(type) {
    const products = this._getFromStorage('gift_card_products').filter(function (p) {
      return p.status === 'active';
    });

    if (!type) return products;

    return products.filter(function (p) { return p.type === type; });
  }

  // 34. getGiftCardDesigns(is_llama_themed)
  getGiftCardDesigns(is_llama_themed) {
    const designs = this._getFromStorage('gift_card_designs');
    if (typeof is_llama_themed !== 'boolean') return designs;
    return designs.filter(function (d) {
      return !!d.is_llama_themed === is_llama_themed;
    });
  }

  // 35. createGiftCardPurchaseAndAddToCart(...)
  createGiftCardPurchaseAndAddToCart(
    giftCardProductId,
    designId,
    amount,
    recipient_name,
    recipient_email,
    sender_name,
    message,
    delivery_date
  ) {
    const products = this._getFromStorage('gift_card_products');
    const designs = this._getFromStorage('gift_card_designs');
    let purchases = this._getFromStorage('gift_card_purchases');
    let cartItems = this._getFromStorage('cart_items');

    const product = products.find(function (p) { return p.id === giftCardProductId && p.status === 'active'; }) || null;
    const design = designs.find(function (d) { return d.id === designId; }) || null;

    if (!product || !design) {
      return {
        success: false,
        gift_card_purchase_id: null,
        cart_id: null,
        cart_item_id: null,
        scheduled_delivery_date: null,
        cart_total: 0,
        message: 'Gift card product or design not found'
      };
    }

    const id = this._generateId('gcp');
    const createdAt = new Date().toISOString();

    const purchase = {
      id: id,
      giftCardProductId: giftCardProductId,
      designId: designId,
      amount: amount,
      currency: product.currency || 'usd',
      recipient_name: recipient_name,
      recipient_email: recipient_email,
      sender_name: sender_name || '',
      message: message || '',
      delivery_date: delivery_date ? delivery_date + 'T00:00:00Z' : null,
      created_at: createdAt,
      email_sent: false,
      status: 'scheduled',
      gift_card_product: product,
      design: design
    };

    purchases.push(purchase);
    this._saveToStorage('gift_card_purchases', purchases);

    const cart = this._getOrCreateCart();

    const cartItem = {
      id: this._generateId('cart_item'),
      cartId: cart.id,
      item_type: 'gift_card',
      productId: null,
      activitySessionId: null,
      workshopSessionId: null,
      lodgingId: null,
      ratePlanId: null,
      giftCardPurchaseId: id,
      groupPackageInquiryId: null,
      itineraryId: null,
      name: product.name,
      quantity: 1,
      unit_price: parseFloat(amount.toFixed(2)),
      total_price: parseFloat(amount.toFixed(2)),
      participants_adults: null,
      participants_children: null,
      guests_adults: null,
      guests_children: null,
      check_in_date: null,
      check_out_date: null,
      start_datetime: null,
      end_datetime: null,
      promo_code: null,
      discount_amount: 0
    };

    cartItems.push(cartItem);
    this._saveToStorage('cart_items', cartItems);
    const totals = this._recalculateCartTotals(cart);

    return {
      success: true,
      gift_card_purchase_id: id,
      cart_id: cart.id,
      cart_item_id: cartItem.id,
      scheduled_delivery_date: purchase.delivery_date,
      cart_total: totals.total,
      message: 'Gift card configured and added to cart'
    };
  }

  // 36. getCartSummary()
  getCartSummary() {
    const carts = this._getFromStorage('carts');
    const cartItems = this._getFromStorage('cart_items');
    const products = this._getFromStorage('products');
    const productVariants = this._getFromStorage('product_variants');
    const activitySessions = this._getFromStorage('activity_sessions');
    const tourActivities = this._getFromStorage('tour_activities');
    const workshopSessions = this._getFromStorage('workshop_sessions');
    const workshops = this._getFromStorage('workshops');
    const lodgingProps = this._getFromStorage('lodging_properties');
    const ratePlans = this._getFromStorage('rate_plans');
    const giftCardPurchases = this._getFromStorage('gift_card_purchases');
    const groupInquiries = this._getFromStorage('group_package_inquiries');
    const itineraries = this._getFromStorage('itineraries');

    const currentCartId = localStorage.getItem('currentCartId');
    const cart = carts.find(function (c) { return c.id === currentCartId; }) || null;

    if (!cart) {
      return {
        cart_id: null,
        currency: 'usd',
        items: [],
        discount_total: 0,
        subtotal: 0,
        total: 0
      };
    }

    const items = cartItems
      .filter(function (ci) { return ci.cartId === cart.id; })
      .map(function (ci) {
        let product = null;
        let variant = null;
        let activitySession = null;
        let activity = null;
        let workshopSession = null;
        let workshop = null;
        let lodging = null;
        let ratePlan = null;
        let giftCardPurchase = null;
        let groupInquiry = null;
        let itinerary = null;

        if (ci.productId) {
          product = products.find(function (p) { return p.id === ci.productId; }) || null;
        }
        if (ci.variantId) {
          variant = productVariants.find(function (v) { return v.id === ci.variantId; }) || null;
        }
        if (ci.activitySessionId) {
          activitySession = activitySessions.find(function (s) { return s.id === ci.activitySessionId; }) || null;
          if (activitySession) {
            activity = tourActivities.find(function (a) { return a.id === activitySession.activityId; }) || null;
          }
        }
        if (ci.workshopSessionId) {
          workshopSession = workshopSessions.find(function (s) { return s.id === ci.workshopSessionId; }) || null;
          if (workshopSession) {
            workshop = workshops.find(function (w) { return w.id === workshopSession.workshopId; }) || null;
          }
        }
        if (ci.lodgingId) {
          lodging = lodgingProps.find(function (l) { return l.id === ci.lodgingId; }) || null;
        }
        if (ci.ratePlanId) {
          ratePlan = ratePlans.find(function (rp) { return rp.id === ci.ratePlanId; }) || null;
        }
        if (ci.giftCardPurchaseId) {
          giftCardPurchase = giftCardPurchases.find(function (gp) { return gp.id === ci.giftCardPurchaseId; }) || null;
        }
        if (ci.groupPackageInquiryId) {
          groupInquiry = groupInquiries.find(function (g) { return g.id === ci.groupPackageInquiryId; }) || null;
        }
        if (ci.itineraryId) {
          itinerary = itineraries.find(function (it) { return it.id === ci.itineraryId; }) || null;
        }

        const details = {
          start_datetime: ci.start_datetime || null,
          end_datetime: ci.end_datetime || null,
          date: null,
          participants_adults: ci.participants_adults || null,
          participants_children: ci.participants_children || null,
          guests_adults: ci.guests_adults || null,
          guests_children: ci.guests_children || null,
          check_in_date: ci.check_in_date || null,
          check_out_date: ci.check_out_date || null,
          thumbnail_image_url: '',
          description: ''
        };

        if (product) {
          details.thumbnail_image_url = (product.image_urls && product.image_urls[0]) || '';
          details.description = product.description || '';
        } else if (activity) {
          details.thumbnail_image_url = (activity.photos && activity.photos[0]) || '';
          details.description = activity.description || '';
        } else if (workshop) {
          details.thumbnail_image_url = (workshop.photos && workshop.photos[0]) || '';
          details.description = workshop.description || '';
        } else if (lodging) {
          details.thumbnail_image_url = (lodging.photos && lodging.photos[0]) || '';
          details.description = lodging.description || '';
        }

        return {
          cart_item_id: ci.id,
          item_type: ci.item_type,
          name: ci.name,
          quantity: ci.quantity,
          unit_price: ci.unit_price,
          total_price: ci.total_price,
          promo_code: ci.promo_code || null,
          discount_amount: ci.discount_amount || 0,
          details: details,
          product: product,
          variant: variant,
          activity_session: activitySession,
          activity: activity,
          workshop_session: workshopSession,
          workshop: workshop,
          lodging: lodging,
          rate_plan: ratePlan,
          gift_card_purchase: giftCardPurchase,
          group_package_inquiry: groupInquiry,
          itinerary: itinerary
        };
      });

    return {
      cart_id: cart.id,
      currency: cart.currency || 'usd',
      items: items,
      discount_total: cart.discount_total || 0,
      subtotal: cart.subtotal || 0,
      total: cart.total || 0
    };
  }

  // 37. updateCartItemQuantity(cartItemId, quantity)
  updateCartItemQuantity(cartItemId, quantity) {
    quantity = typeof quantity === 'number' && quantity > 0 ? quantity : 1;
    let cartItems = this._getFromStorage('cart_items');
    let carts = this._getFromStorage('carts');

    const item = cartItems.find(function (ci) { return ci.id === cartItemId; }) || null;
    if (!item) {
      return {
        success: false,
        cart_id: null,
        cart_item_id: cartItemId,
        item_total: 0,
        cart_subtotal: 0,
        cart_total: 0,
        message: 'Cart item not found'
      };
    }

    item.quantity = quantity;
    item.total_price = parseFloat((item.unit_price * quantity).toFixed(2));

    this._saveToStorage('cart_items', cartItems);

    const cart = carts.find(function (c) { return c.id === item.cartId; }) || this._getOrCreateCart();
    const totals = this._recalculateCartTotals(cart);

    return {
      success: true,
      cart_id: cart.id,
      cart_item_id: item.id,
      item_total: item.total_price,
      cart_subtotal: totals.subtotal,
      cart_total: totals.total,
      message: 'Cart item quantity updated'
    };
  }

  // 38. removeCartItem(cartItemId)
  removeCartItem(cartItemId) {
    let cartItems = this._getFromStorage('cart_items');
    let carts = this._getFromStorage('carts');

    const item = cartItems.find(function (ci) { return ci.id === cartItemId; }) || null;
    if (!item) {
      return {
        success: false,
        cart_id: null,
        cart_total: 0,
        message: 'Cart item not found'
      };
    }

    cartItems = cartItems.filter(function (ci) { return ci.id !== cartItemId; });
    this._saveToStorage('cart_items', cartItems);

    const cart = carts.find(function (c) { return c.id === item.cartId; }) || this._getOrCreateCart();
    const totals = this._recalculateCartTotals(cart);

    return {
      success: true,
      cart_id: cart.id,
      cart_total: totals.total,
      message: 'Cart item removed'
    };
  }

  // 39. applyPromoCodeToCart(promo_code)
  applyPromoCodeToCart(promo_code) {
    const carts = this._getFromStorage('carts');
    const currentCartId = localStorage.getItem('currentCartId');
    const cart = carts.find(function (c) { return c.id === currentCartId; }) || null;

    if (!cart) {
      return {
        success: false,
        cart_id: null,
        discount_total: 0,
        cart_total: 0,
        message: 'Cart not found'
      };
    }

    cart.promo_code = promo_code || null;
    this._saveToStorage('carts', carts);

    const totals = this._recalculateCartTotals(cart);

    return {
      success: true,
      cart_id: cart.id,
      discount_total: totals.discount_total,
      cart_total: totals.total,
      message: 'Promo code applied'
    };
  }

  // 40. placeOrder(purchaser, billing_address, payment, additional_notes)
  placeOrder(purchaser, billing_address, payment, additional_notes) {
    const carts = this._getFromStorage('carts');
    const cartItems = this._getFromStorage('cart_items');
    let orders = this._getFromStorage('orders');

    const currentCartId = localStorage.getItem('currentCartId');
    const cart = carts.find(function (c) { return c.id === currentCartId; }) || null;

    if (!cart) {
      return {
        success: false,
        order_id: null,
        confirmation_number: null,
        cart_id: null,
        total_charged: 0,
        message: 'Cart not found'
      };
    }

    const cartItemCount = cartItems.filter(function (ci) { return ci.cartId === cart.id; }).length;
    if (!cartItemCount) {
      return {
        success: false,
        order_id: null,
        confirmation_number: null,
        cart_id: cart.id,
        total_charged: 0,
        message: 'Cart is empty'
      };
    }

    const orderId = this._generateId('order');
    const confirmationNumber = 'LLAMA-' + orderId.split('_')[1];

    const order = {
      id: orderId,
      cart_id: cart.id,
      total_charged: cart.total || 0,
      purchaser: purchaser,
      billing_address: billing_address,
      payment: {
        payment_token: payment.payment_token,
        card_brand: payment.card_brand,
        card_last4: payment.card_last4
      },
      additional_notes: additional_notes || '',
      created_at: new Date().toISOString(),
      confirmation_number: confirmationNumber
    };

    orders.push(order);
    this._saveToStorage('orders', orders);

    // Optionally, clear current cart; keep data for history but remove currentCartId
    localStorage.removeItem('currentCartId');

    return {
      success: true,
      order_id: orderId,
      confirmation_number: confirmationNumber,
      cart_id: cart.id,
      total_charged: order.total_charged,
      message: 'Order placed successfully'
    };
  }

  // 41. getAboutContent()
  getAboutContent() {
    const content = this._getObjectFromStorage('about_content', null);
    if (content && typeof content === 'object') {
      return content;
    }

    return {
      history: '',
      mission: '',
      animal_care_approach: '',
      team_members: []
    };
  }

  // 42. getContactAndDirectionsContent()
  getContactAndDirectionsContent() {
    const content = this._getObjectFromStorage('contact_directions_content', null);
    if (content && typeof content === 'object') {
      return content;
    }

    return {
      address: '',
      map_embed_url: '',
      driving_directions: '',
      operating_hours: '',
      phone_numbers: [],
      email_addresses: []
    };
  }

  // 43. submitContactForm(name, email, phone, subject, message)
  submitContactForm(name, email, phone, subject, message) {
    let tickets = this._getFromStorage('contact_tickets');
    const id = this._generateId('ticket');

    const ticket = {
      id: id,
      name: name,
      email: email,
      phone: phone || '',
      subject: subject || '',
      message: message,
      created_at: new Date().toISOString()
    };

    tickets.push(ticket);
    this._saveToStorage('contact_tickets', tickets);

    return {
      success: true,
      ticket_id: id,
      message: 'Message submitted'
    };
  }

  // 44. getFaqs(section)
  getFaqs(section) {
    const faqs = this._getFromStorage('faqs');
    const filtered = section
      ? faqs.filter(function (f) { return f.section === section; })
      : faqs;

    // Ensure structure
    return filtered.map(function (f) {
      return {
        faq_id: f.faq_id || f.id || null,
        question: f.question || '',
        answer: f.answer || '',
        section: f.section || 'general',
        sort_order: typeof f.sort_order === 'number' ? f.sort_order : 0
      };
    });
  }

  // 45. getPolicyDocuments()
  getPolicyDocuments() {
    const policies = this._getFromStorage('policy_documents');
    return policies.map(function (p) {
      return {
        policy_id: p.policy_id || p.id || null,
        title: p.title || '',
        slug: p.slug || '',
        category: p.category || 'general',
        content_html: p.content_html || '',
        last_updated: p.last_updated || null
      };
    });
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
