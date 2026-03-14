// localStorage polyfill for Node.js and environments without localStorage
const localStorage = (function () {
  try {
    if (typeof globalThis !== "undefined" && globalThis.localStorage) {
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

  // ----------------------
  // Storage initialization
  // ----------------------
  _initStorage() {
    // ID counter
    if (localStorage.getItem('idCounter') === null) {
      localStorage.setItem('idCounter', '1000');
    }

    // Entity tables (arrays)
    const arrayKeys = [
      'ticket_types',
      'sessions',
      'session_ticket_prices',
      'session_addons',
      'cart_items',
      'activities',
      'itineraries',
      'itinerary_items',
      'entrances',
      'accessible_viewing_areas',
      'group_session_options',
      'group_bookings',
      'newsletter_subscriptions',
      'transit_routes',
      'contact_messages',
      'faq_sections',
      'faq_items'
    ];

    arrayKeys.forEach((key) => {
      if (localStorage.getItem(key) === null) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    });

    // Single-object tables
    const objectKeys = [
      'cart', // ShoppingCart (single current cart)
      'home_page_content',
      'about_attraction_content',
      'groups_overview_content',
      'getting_here_content',
      'accessibility_overview'
    ];

    objectKeys.forEach((key) => {
      if (localStorage.getItem(key) === null) {
        localStorage.setItem(key, 'null');
      }
    });
  }

  // Generic helpers
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

  _getObjectFromStorage(key, defaultValue = null) {
    const data = localStorage.getItem(key);
    if (data === null || data === undefined) return defaultValue;
    try {
      return JSON.parse(data);
    } catch (e) {
      return defaultValue;
    }
  }

  _setObjectToStorage(key, obj) {
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

  _nowIso() {
    return new Date().toISOString();
  }

  _toDateString(date) {
    const d = (date instanceof Date) ? date : new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  _toTimeString(date) {
    const d = (date instanceof Date) ? date : new Date(date);
    const hours = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    return `${hours}:${mins}`;
  }

  _compareTimeStrings(a, b) {
    // a, b formatted as 'HH:MM'
    if (!a && !b) return 0;
    if (!a) return -1;
    if (!b) return 1;
    if (a === b) return 0;
    return a < b ? -1 : 1;
  }

  _dayOfWeekString(date) {
    const d = (date instanceof Date) ? date : new Date(date);
    const map = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return map[d.getDay()];
  }

  // --------------------
  // Cart helper functions
  // --------------------
  _getOrCreateCart() {
    let cart = this._getObjectFromStorage('cart', null);
    if (!cart) {
      cart = {
        id: this._generateId('cart'),
        items: [], // array of CartItem ids
        subtotal: 0,
        taxes: 0,
        fees: 0,
        total: 0,
        updatedAt: this._nowIso()
      };
      this._setObjectToStorage('cart', cart);
    }
    return cart;
  }

  _recalculateCartTotals() {
    let cart = this._getObjectFromStorage('cart', null);
    if (!cart) return null;
    const cartItems = this._getFromStorage('cart_items', []);
    const relevantItems = cart.items
      ? cart.items.map((id) => cartItems.find((ci) => ci.id === id)).filter(Boolean)
      : [];
    const subtotal = relevantItems.reduce((sum, item) => sum + (item.lineTotal || 0), 0);
    const taxes = 0; // business rule: no tax calculation here
    const fees = 0;  // business rule: no extra fees here
    const total = subtotal + taxes + fees;
    cart.subtotal = subtotal;
    cart.taxes = taxes;
    cart.fees = fees;
    cart.total = total;
    cart.updatedAt = this._nowIso();
    this._setObjectToStorage('cart', cart);
    return cart;
  }

  // ------------------------
  // Itinerary helper methods
  // ------------------------
  _getOrCreateItineraryForDate(dateStr) {
    const itineraries = this._getFromStorage('itineraries', []);
    let itinerary = itineraries.find((it) => it.date === dateStr);
    if (!itinerary) {
      itinerary = {
        id: this._generateId('itinerary'),
        date: dateStr,
        itemIds: [],
        name: `My Night ${dateStr}`,
        createdAt: this._nowIso(),
        updatedAt: this._nowIso()
      };
      itineraries.push(itinerary);
      this._saveToStorage('itineraries', itineraries);
    }
    return itinerary;
  }

  _detectItineraryConflicts(itinerary, itemsWithActivities) {
    // itemsWithActivities: array of {itineraryItemId, activity}
    const result = itemsWithActivities.map((item) => ({
      itineraryItemId: item.itineraryItemId,
      activity: item.activity,
      hasTimeConflict: false,
      conflictsWithActivityIds: []
    }));

    for (let i = 0; i < result.length; i++) {
      for (let j = i + 1; j < result.length; j++) {
        const ai = result[i].activity;
        const aj = result[j].activity;
        if (!ai || !aj) continue;
        const si = new Date(ai.startDateTime).getTime();
        const ei = new Date(ai.endDateTime).getTime();
        const sj = new Date(aj.startDateTime).getTime();
        const ej = new Date(aj.endDateTime).getTime();
        const overlap = si < ej && sj < ei;
        if (overlap) {
          result[i].hasTimeConflict = true;
          result[j].hasTimeConflict = true;
          result[i].conflictsWithActivityIds.push(aj.id);
          result[j].conflictsWithActivityIds.push(ai.id);
        }
      }
    }

    return result;
  }

  // ------------------------
  // Session pricing helpers
  // ------------------------
  _estimateFamilyOf4SessionPrice(sessionId) {
    const prices = this._getFromStorage('session_ticket_prices', []);
    const forSession = prices.filter((p) => p.sessionId === sessionId);
    if (!forSession.length) return null;

    const adults = forSession.filter((p) => p.category === 'adult');
    const children = forSession.filter((p) => p.category === 'child');

    const adultPrice = adults.length ? Math.min(...adults.map((p) => p.price)) : null;
    const childPrice = children.length ? Math.min(...children.map((p) => p.price)) : null;

    if (adultPrice != null && childPrice != null) {
      return adultPrice * 2 + childPrice * 2;
    }
    if (adultPrice != null) {
      return adultPrice * 4;
    }
    if (childPrice != null) {
      return childPrice * 4;
    }
    return null;
  }

  _filterSessionsByTimeAndDate(sessions, filters) {
    const {
      startDate,
      endDate,
      startTimeFrom,
      startTimeTo
    } = filters || {};

    return sessions.filter((s) => {
      if (!s.startDateTime) return false;
      const dateStr = this._toDateString(s.startDateTime);
      if (startDate && dateStr < startDate) return false;
      if (endDate && dateStr > endDate) return false;

      if (startTimeFrom || startTimeTo) {
        const timeStr = this._toTimeString(s.startDateTime);
        if (startTimeFrom && this._compareTimeStrings(timeStr, startTimeFrom) < 0) {
          return false;
        }
        if (startTimeTo && this._compareTimeStrings(timeStr, startTimeTo) > 0) {
          return false;
        }
      }
      return true;
    });
  }

  _findNextSaturdayDate() {
    const now = new Date();
    const day = now.getDay(); // 0=Sun
    const daysUntilSaturday = (6 - day + 7) % 7 || 7; // next Saturday, not today
    const target = new Date(now.getTime() + daysUntilSaturday * 24 * 60 * 60 * 1000);
    return this._toDateString(target);
  }

  // -----------------------------
  // Transit route filter helper
  // -----------------------------
  _filterTransitRoutesByServiceWindow(routes, maxWalkingTimeMinutes, minServiceEndTime) {
    return routes.filter((r) => {
      if (typeof maxWalkingTimeMinutes === 'number' && r.walkingTimeMinutes != null) {
        if (r.walkingTimeMinutes > maxWalkingTimeMinutes) return false;
      }
      if (minServiceEndTime && r.serviceEndTime) {
        if (this._compareTimeStrings(r.serviceEndTime, minServiceEndTime) < 0) return false;
      }
      return true;
    });
  }

  // ------------------------------
  // Contact message helper method
  // ------------------------------
  _createContactMessageRecord(topic, name, email, message, source, relatedContext) {
    const messages = this._getFromStorage('contact_messages', []);
    const id = this._generateId('contact');
    const record = {
      id,
      topic,
      name,
      email,
      message,
      source,
      relatedContext: relatedContext || null,
      createdAt: this._nowIso()
    };
    messages.push(record);
    this._saveToStorage('contact_messages', messages);
    return record;
  }

  // ==============================
  // Core interface implementations
  // ==============================

  // ---------------------
  // Homepage / Marketing
  // ---------------------
  getHomePageContent() {
    // Content expected to be pre-populated in localStorage under 'home_page_content'
    // If not present, fall back to a minimal default object used by tests.
    let content = this._getObjectFromStorage('home_page_content', null);
    if (!content) {
      content = {
        heroTitle: 'Welcome to the Christmas Attraction',
        newsletterPromo: {
          heading: 'Stay in the holiday loop',
          description: 'Sign up for our newsletter for family activities, special offers, and event updates.'
        }
      };
    }
    return content;
  }

  getAboutAttractionContent() {
    const content = this._getObjectFromStorage('about_attraction_content', null);
    return content;
  }

  // -------------
  // FAQ functions
  // -------------
  getFaqSections() {
    // Stored under 'faq_sections'
    const sections = this._getFromStorage('faq_sections', []);
    return sections;
  }

  getFaqItems(query, sectionId) {
    let items = this._getFromStorage('faq_items', []);
    if (sectionId) {
      items = items.filter((item) => item.sectionId === sectionId);
    }
    if (query) {
      const q = String(query).toLowerCase();
      items = items.filter((item) => {
        const question = (item.question || '').toLowerCase();
        const answer = (item.answer || '').toLowerCase();
        return question.includes(q) || answer.includes(q);
      });
    }
    return items;
  }

  // ----------------------
  // TicketType operations
  // ----------------------
  getTicketTypesForListing() {
    const ticketTypes = this._getFromStorage('ticket_types', []);
    return ticketTypes
      .filter((t) => t.status === 'active')
      .sort((a, b) => {
        const ao = a.displayOrder != null ? a.displayOrder : Number.MAX_SAFE_INTEGER;
        const bo = b.displayOrder != null ? b.displayOrder : Number.MAX_SAFE_INTEGER;
        if (ao === bo) {
          return (a.name || '').localeCompare(b.name || '');
        }
        return ao - bo;
      });
  }

  getTicketTypeDetails(ticketTypeId) {
    const ticketTypes = this._getFromStorage('ticket_types', []);
    const ticketType = ticketTypes.find((t) => t.id === ticketTypeId) || null;
    if (!ticketType) {
      return { ticketType: null, formattedWhatsIncluded: '' };
    }
    const formattedWhatsIncluded = ticketType.whatsIncluded || '';
    return { ticketType, formattedWhatsIncluded };
  }

  addTicketTypeToCart(ticketTypeId, ticketSelections) {
    const ticketTypes = this._getFromStorage('ticket_types', []);
    const ticketType = ticketTypes.find((t) => t.id === ticketTypeId);
    if (!ticketType) {
      return {
        success: false,
        addedItem: null,
        cartSummary: null,
        message: 'Ticket type not found'
      };
    }

    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items', []);

    const selections = Array.isArray(ticketSelections) ? ticketSelections : [];

    const pricedSelections = selections.map((sel) => {
      let unitPrice = 0;
      if (sel.category === 'adult') {
        unitPrice = ticketType.adultPrice || 0;
      } else if (sel.category === 'child') {
        unitPrice = ticketType.childPrice || 0;
      } else {
        // Other categories could be mapped here if needed
        unitPrice = ticketType.adultPrice || 0;
      }
      return {
        category: sel.category,
        quantity: sel.quantity || 0,
        unitPrice
      };
    });

    const ticketsTotal = pricedSelections.reduce((sum, s) => sum + s.quantity * s.unitPrice, 0);

    const id = this._generateId('cart_item');
    const descriptionParts = [];
    pricedSelections.forEach((s) => {
      if (s.quantity > 0) {
        const label = s.category === 'adult' ? 'Adults' : s.category === 'child' ? 'Children' : s.category;
        descriptionParts.push(`${s.quantity} ${label}`);
      }
    });
    const descriptionSuffix = descriptionParts.length ? ` – ${descriptionParts.join(', ')}` : '';
    const description = `${ticketType.name}${descriptionSuffix}`;

    const cartItem = {
      id,
      cartId: cart.id,
      itemType: 'ticket_type',
      sessionId: null,
      ticketTypeId: ticketType.id,
      ticketSelections: pricedSelections,
      addOnIds: [],
      lineTotal: ticketsTotal,
      description
    };

    cartItems.push(cartItem);
    this._saveToStorage('cart_items', cartItems);

    if (!Array.isArray(cart.items)) cart.items = [];
    cart.items.push(cartItem.id);
    this._setObjectToStorage('cart', cart);

    const updatedCart = this._recalculateCartTotals();

    const cartSummary = {
      cartId: updatedCart.id,
      itemsCount: (updatedCart.items || []).length,
      subtotal: updatedCart.subtotal,
      taxes: updatedCart.taxes,
      fees: updatedCart.fees,
      total: updatedCart.total
    };

    return {
      success: true,
      addedItem: {
        cartItemId: cartItem.id,
        description: cartItem.description,
        lineTotal: cartItem.lineTotal
      },
      cartSummary,
      message: 'Ticket type added to cart'
    };
  }

  // ------------------------
  // Session listing & booking
  // ------------------------
  getSessionFilterOptions() {
    // Static definitions based on enums
    return {
      eventTypes: [
        { id: 'family_night', label: 'Family Night' },
        { id: 'sensory_friendly', label: 'Sensory-Friendly' },
        { id: 'general_session', label: 'General Sessions' },
        { id: 'group_only', label: 'Group Only' },
        { id: 'other', label: 'Other' }
      ],
      audiences: [
        { id: 'families', label: 'Families' },
        { id: 'adults', label: 'Adults' },
        { id: 'kids', label: 'Kids' },
        { id: 'all_ages', label: 'All Ages' }
      ],
      timeOfDayRanges: [
        { id: 'morning', label: 'Morning', startTime: '09:00', endTime: '12:00' },
        { id: 'afternoon', label: 'Afternoon', startTime: '12:00', endTime: '17:00' },
        { id: 'evening', label: 'Evening', startTime: '17:00', endTime: '21:00' },
        { id: 'late_night', label: 'Late Night', startTime: '21:00', endTime: '23:59' }
      ]
    };
  }

  getSessionSortOptions() {
    return [
      { id: 'start_time_asc', label: 'Start Time – Earliest First' },
      { id: 'family_of_4_price_asc', label: 'Total Price (Family of 4) – Low to High' },
      { id: 'price_per_person_asc', label: 'Price per Person – Low to High' }
    ];
  }

  searchSessions(startDate, endDate, eventTypes, audience, isSensoryFriendly, isFamilyNight, startTimeFrom, startTimeTo, sortBy) {
    const sessions = this._getFromStorage('sessions', []).filter((s) => s.isActive !== false);
    const prices = this._getFromStorage('session_ticket_prices', []);

    let filtered = this._filterSessionsByTimeAndDate(sessions, {
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      startTimeFrom: startTimeFrom || undefined,
      startTimeTo: startTimeTo || undefined
    });

    if (Array.isArray(eventTypes) && eventTypes.length) {
      filtered = filtered.filter((s) => eventTypes.includes(s.eventType));
    }
    if (audience) {
      filtered = filtered.filter((s) => !s.audience || s.audience === audience);
    }
    if (typeof isSensoryFriendly === 'boolean') {
      filtered = filtered.filter((s) => Boolean(s.isSensoryFriendly) === isSensoryFriendly);
    }
    if (typeof isFamilyNight === 'boolean') {
      filtered = filtered.filter((s) => Boolean(s.isFamilyNight) === isFamilyNight);
    }

    let results = filtered.map((session) => {
      const sessionPrices = prices.filter((p) => p.sessionId === session.id);
      const adultPrices = sessionPrices.filter((p) => p.category === 'adult');
      const childPrices = sessionPrices.filter((p) => p.category === 'child');
      const adultPriceFrom = adultPrices.length ? Math.min(...adultPrices.map((p) => p.price)) : (session.baseAdultPrice || null);
      const childPriceFrom = childPrices.length ? Math.min(...childPrices.map((p) => p.price)) : (session.baseChildPrice || null);
      const familyOf4PriceEstimate = this._estimateFamilyOf4SessionPrice(session.id);

      const availabilitySummary = {
        remainingCapacity: session.remainingCapacity != null ? session.remainingCapacity : null,
        isSoldOut: session.remainingCapacity != null ? session.remainingCapacity <= 0 : false
      };

      return {
        session,
        pricingSummary: {
          adultPriceFrom,
          childPriceFrom,
          familyOf4PriceEstimate,
          currency: (sessionPrices[0] && sessionPrices[0].currency) || null
        },
        availabilitySummary
      };
    });

    if (sortBy === 'family_of_4_price_asc') {
      results.sort((a, b) => {
        const ap = a.pricingSummary.familyOf4PriceEstimate;
        const bp = b.pricingSummary.familyOf4PriceEstimate;
        if (ap == null && bp == null) return 0;
        if (ap == null) return 1;
        if (bp == null) return -1;
        return ap - bp;
      });
    } else if (sortBy === 'price_per_person_asc') {
      results.sort((a, b) => {
        const aa = a.pricingSummary.adultPriceFrom;
        const ac = a.pricingSummary.childPriceFrom;
        const ba = b.pricingSummary.adultPriceFrom;
        const bc = b.pricingSummary.childPriceFrom;
        const aPrice = aa != null ? aa : ac != null ? ac : Number.MAX_SAFE_INTEGER;
        const bPrice = ba != null ? ba : bc != null ? bc : Number.MAX_SAFE_INTEGER;
        if (aPrice === bPrice) return 0;
        return aPrice - bPrice;
      });
    } else {
      // default sort by start_time_asc
      results.sort((a, b) => {
        const ta = new Date(a.session.startDateTime).getTime();
        const tb = new Date(b.session.startDateTime).getTime();
        return ta - tb;
      });
    }

    return results;
  }

  getSessionBookingDetails(sessionId) {
    const sessions = this._getFromStorage('sessions', []);
    const prices = this._getFromStorage('session_ticket_prices', []);
    const addons = this._getFromStorage('session_addons', []);

    const session = sessions.find((s) => s.id === sessionId) || null;
    if (!session) {
      return {
        session: null,
        ticketCategories: [],
        addOns: [],
        capacityInfo: { maxCapacity: null, remainingCapacity: null }
      };
    }

    const sessionPrices = prices.filter((p) => p.sessionId === session.id);
    const ticketCategories = sessionPrices.map((p) => ({
      category: p.category,
      label: this._ticketCategoryLabel(p.category),
      price: p.price,
      currency: p.currency || null,
      minAge: p.minAge != null ? p.minAge : null,
      maxAge: p.maxAge != null ? p.maxAge : null,
      description: p.description || ''
    }));

    const sessionAddOns = addons
      .filter((a) => a.sessionId === session.id && a.isActive !== false)
      .map((a) => ({
        id: a.id,
        name: a.name,
        description: a.description || '',
        price: a.price,
        currency: null,
        defaultSelected: Boolean(a.defaultSelected),
        isActive: Boolean(a.isActive)
      }));

    const capacityInfo = {
      maxCapacity: session.maxCapacity != null ? session.maxCapacity : null,
      remainingCapacity: session.remainingCapacity != null ? session.remainingCapacity : null
    };

    return {
      session,
      ticketCategories,
      addOns: sessionAddOns,
      capacityInfo
    };
  }

  _ticketCategoryLabel(category) {
    switch (category) {
      case 'adult':
        return 'Adult';
      case 'child':
        return 'Child';
      case 'senior':
        return 'Senior';
      case 'family_pack':
        return 'Family Pack';
      case 'student':
        return 'Student';
      default:
        return category;
    }
  }

  addSessionTicketsToCart(sessionId, ticketSelections, addOnIds) {
    const sessions = this._getFromStorage('sessions', []);
    const addons = this._getFromStorage('session_addons', []);
    const session = sessions.find((s) => s.id === sessionId);

    if (!session) {
      return {
        success: false,
        addedItem: null,
        cartSummary: null,
        message: 'Session not found'
      };
    }

    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items', []);

    const selections = Array.isArray(ticketSelections) ? ticketSelections : [];

    const ticketsTotal = selections.reduce((sum, s) => sum + (s.quantity || 0) * (s.unitPrice || 0), 0);

    const sessionAddOns = addons.filter((a) => a.sessionId === session.id && a.isActive !== false);

    let selectedAddOnIds;
    if (Array.isArray(addOnIds)) {
      selectedAddOnIds = addOnIds;
    } else {
      selectedAddOnIds = sessionAddOns.filter((a) => a.defaultSelected).map((a) => a.id);
    }

    const selectedAddOns = sessionAddOns.filter((a) => selectedAddOnIds.includes(a.id));
    const addOnsTotal = selectedAddOns.reduce((sum, a) => sum + (a.price || 0), 0);
    const lineTotal = ticketsTotal + addOnsTotal;

    const id = this._generateId('cart_item');

    const descriptionParts = [];
    selections.forEach((s) => {
      if (s.quantity > 0) {
        const label = this._ticketCategoryLabel(s.category);
        descriptionParts.push(`${s.quantity} ${label}`);
      }
    });
    const descriptionSuffix = descriptionParts.length ? ` – ${descriptionParts.join(', ')}` : '';
    const description = `${session.name || 'Session'} ${descriptionSuffix}`;

    const cartItem = {
      id,
      cartId: cart.id,
      itemType: 'session_ticket',
      sessionId: session.id,
      ticketTypeId: null,
      ticketSelections: selections.map((s) => ({
        category: s.category,
        quantity: s.quantity || 0,
        unitPrice: s.unitPrice || 0
      })),
      addOnIds: selectedAddOnIds,
      lineTotal,
      description
    };

    cartItems.push(cartItem);
    this._saveToStorage('cart_items', cartItems);

    if (!Array.isArray(cart.items)) cart.items = [];
    cart.items.push(cartItem.id);
    this._setObjectToStorage('cart', cart);

    const updatedCart = this._recalculateCartTotals();

    const cartSummary = {
      cartId: updatedCart.id,
      itemsCount: (updatedCart.items || []).length,
      subtotal: updatedCart.subtotal,
      taxes: updatedCart.taxes,
      fees: updatedCart.fees,
      total: updatedCart.total
    };

    return {
      success: true,
      addedItem: {
        cartItemId: cartItem.id,
        description: cartItem.description,
        lineTotal: cartItem.lineTotal
      },
      cartSummary,
      message: 'Session tickets added to cart'
    };
  }

  getCartSummary() {
    const cart = this._getObjectFromStorage('cart', null);
    const cartItems = this._getFromStorage('cart_items', []);
    const addons = this._getFromStorage('session_addons', []);

    if (!cart) {
      return {
        cartId: null,
        items: [],
        subtotal: 0,
        taxes: 0,
        fees: 0,
        total: 0
      };
    }

    const items = (cart.items || [])
      .map((id) => cartItems.find((ci) => ci.id === id))
      .filter(Boolean)
      .map((item) => {
        const addOnSummaries = Array.isArray(item.addOnIds)
          ? item.addOnIds
              .map((aid) => addons.find((a) => a.id === aid))
              .filter(Boolean)
              .map((a) => ({ name: a.name, price: a.price }))
          : [];
        return {
          cartItemId: item.id,
          itemType: item.itemType,
          description: item.description,
          ticketSelections: item.ticketSelections || [],
          addOnSummaries,
          lineTotal: item.lineTotal || 0
        };
      });

    return {
      cartId: cart.id,
      items,
      subtotal: cart.subtotal || 0,
      taxes: cart.taxes || 0,
      fees: cart.fees || 0,
      total: cart.total || 0
    };
  }

  updateCartItemTickets(cartItemId, ticketSelections) {
    let cart = this._getObjectFromStorage('cart', null);
    if (!cart) {
      return {
        success: false,
        cartSummary: null,
        message: 'Cart not found'
      };
    }

    let cartItems = this._getFromStorage('cart_items', []);
    const idx = cartItems.findIndex((ci) => ci.id === cartItemId);
    if (idx === -1) {
      return {
        success: false,
        cartSummary: null,
        message: 'Cart item not found'
      };
    }

    const item = cartItems[idx];
    const newSelections = Array.isArray(ticketSelections) ? ticketSelections : [];

    const existingSelectionsMap = {};
    (item.ticketSelections || []).forEach((s) => {
      existingSelectionsMap[s.category] = s;
    });

    const updatedSelections = newSelections.map((sel) => {
      const existing = existingSelectionsMap[sel.category];
      let unitPrice = existing ? existing.unitPrice : 0;

      if (!existing) {
        // Try to infer price from session or ticket type
        if (item.itemType === 'session_ticket' && item.sessionId) {
          const details = this.getSessionBookingDetails(item.sessionId);
          const cat = (details.ticketCategories || []).find((c) => c.category === sel.category);
          if (cat) unitPrice = cat.price || 0;
        } else if (item.itemType === 'ticket_type' && item.ticketTypeId) {
          const ticketTypes = this._getFromStorage('ticket_types', []);
          const tt = ticketTypes.find((t) => t.id === item.ticketTypeId);
          if (tt) {
            if (sel.category === 'adult') unitPrice = tt.adultPrice || 0;
            else if (sel.category === 'child') unitPrice = tt.childPrice || tt.adultPrice || 0;
          }
        }
      }

      return {
        category: sel.category,
        quantity: sel.quantity || 0,
        unitPrice
      };
    });

    const ticketsTotal = updatedSelections.reduce((sum, s) => sum + s.quantity * s.unitPrice, 0);

    // Add-ons total
    const addons = this._getFromStorage('session_addons', []);
    const addOns = Array.isArray(item.addOnIds)
      ? item.addOnIds.map((id) => addons.find((a) => a.id === id)).filter(Boolean)
      : [];
    const addOnsTotal = addOns.reduce((sum, a) => sum + (a.price || 0), 0);

    item.ticketSelections = updatedSelections;
    item.lineTotal = ticketsTotal + addOnsTotal;

    cartItems[idx] = item;
    this._saveToStorage('cart_items', cartItems);

    cart = this._recalculateCartTotals();

    const cartSummary = {
      cartId: cart.id,
      itemsCount: (cart.items || []).length,
      subtotal: cart.subtotal,
      taxes: cart.taxes,
      fees: cart.fees,
      total: cart.total
    };

    return {
      success: true,
      cartSummary,
      message: 'Cart item updated'
    };
  }

  removeCartItem(cartItemId) {
    let cart = this._getObjectFromStorage('cart', null);
    if (!cart) {
      return {
        success: false,
        cartSummary: null,
        message: 'Cart not found'
      };
    }

    let cartItems = this._getFromStorage('cart_items', []);
    const newCartItems = cartItems.filter((ci) => ci.id !== cartItemId);
    this._saveToStorage('cart_items', newCartItems);

    cart.items = (cart.items || []).filter((id) => id !== cartItemId);
    this._setObjectToStorage('cart', cart);

    cart = this._recalculateCartTotals();

    const cartSummary = {
      cartId: cart.id,
      itemsCount: (cart.items || []).length,
      subtotal: cart.subtotal,
      taxes: cart.taxes,
      fees: cart.fees,
      total: cart.total
    };

    return {
      success: true,
      cartSummary,
      message: 'Cart item removed'
    };
  }

  // -----------------------
  // Schedule & Activities
  // -----------------------
  getScheduleFilterOptions() {
    return {
      audiences: [
        { id: 'families', label: 'Families' },
        { id: 'adults', label: 'Adults' },
        { id: 'kids', label: 'Kids' },
        { id: 'all_ages', label: 'All Ages' }
      ],
      categories: [
        { id: 'santa_experience', label: 'Santa Experiences' },
        { id: 'light_show', label: 'Light Shows' },
        { id: 'workshop_craft', label: 'Workshops & Crafts' },
        { id: 'live_music', label: 'Live Music' },
        { id: 'show', label: 'Shows' },
        { id: 'other', label: 'Other' }
      ],
      locationTypes: [
        { id: 'indoor', label: 'Indoors' },
        { id: 'outdoor', label: 'Outdoors' },
        { id: 'mixed', label: 'Mixed' }
      ],
      timeRangePresets: [
        { id: 'afternoon_evening', label: '4:00 pm – 8:00 pm', startTime: '16:00', endTime: '20:00' },
        { id: 'evening', label: '6:00 pm – 10:00 pm', startTime: '18:00', endTime: '22:00' }
      ]
    };
  }

  searchActivities(date, audience, timeRangeStart, timeRangeEnd, category, locationType) {
    const activities = this._getFromStorage('activities', []).filter((a) => a.isActive !== false);

    const filtered = activities.filter((act) => {
      const actDate = this._toDateString(act.startDateTime);
      if (date && actDate !== date) return false;
      if (audience && act.audience && act.audience !== audience) return false;
      if (category && act.category !== category) return false;
      if (locationType && act.locationType && act.locationType !== locationType) return false;

      if (timeRangeStart || timeRangeEnd) {
        const timeStr = this._toTimeString(act.startDateTime);
        if (timeRangeStart && this._compareTimeStrings(timeStr, timeRangeStart) < 0) return false;
        if (timeRangeEnd && this._compareTimeStrings(timeStr, timeRangeEnd) > 0) return false;
      }

      return true;
    });

    return filtered.map((activity) => {
      const start = new Date(activity.startDateTime).getTime();
      const end = new Date(activity.endDateTime).getTime();
      const durationMinutes = Math.max(0, Math.round((end - start) / 60000));
      return {
        activity,
        durationMinutes,
        canAddToItinerary: activity.isActive !== false
      };
    });
  }

  getActivityDetails(activityId) {
    const activities = this._getFromStorage('activities', []);
    const activity = activities.find((a) => a.id === activityId) || null;
    if (!activity) {
      return { activity: null, durationMinutes: 0, formattedDescription: '' };
    }
    const start = new Date(activity.startDateTime).getTime();
    const end = new Date(activity.endDateTime).getTime();
    const durationMinutes = Math.max(0, Math.round((end - start) / 60000));
    const formattedDescription = activity.description || '';
    return { activity, durationMinutes, formattedDescription };
  }

  addActivityToItinerary(activityId) {
    const activities = this._getFromStorage('activities', []);
    const activity = activities.find((a) => a.id === activityId);
    if (!activity) {
      return {
        success: false,
        itinerary: null,
        message: 'Activity not found'
      };
    }

    const dateStr = this._toDateString(activity.startDateTime);
    const itinerary = this._getOrCreateItineraryForDate(dateStr);
    const itineraryItems = this._getFromStorage('itinerary_items', []);

    const existing = itineraryItems.find((it) => it.itineraryId === itinerary.id && it.activityId === activityId);
    let updatedItinerary = itinerary;

    if (!existing) {
      const newItem = {
        id: this._generateId('itinerary_item'),
        itineraryId: itinerary.id,
        activityId,
        addedAt: this._nowIso()
      };
      itineraryItems.push(newItem);
      this._saveToStorage('itinerary_items', itineraryItems);

      const itineraries = this._getFromStorage('itineraries', []);
      const idx = itineraries.findIndex((it) => it.id === itinerary.id);
      if (idx !== -1) {
        if (!Array.isArray(itineraries[idx].itemIds)) itineraries[idx].itemIds = [];
        itineraries[idx].itemIds.push(newItem.id);
        itineraries[idx].updatedAt = this._nowIso();
        updatedItinerary = itineraries[idx];
        this._saveToStorage('itineraries', itineraries);
      }
    }

    const result = this.getItinerary(dateStr);
    return {
      success: true,
      itinerary: result.itinerary,
      message: 'Activity added to itinerary'
    };
  }

  getItinerary(date) {
    const itineraries = this._getFromStorage('itineraries', []);
    const itineraryItems = this._getFromStorage('itinerary_items', []);
    const activities = this._getFromStorage('activities', []);

    let itinerary = null;

    if (date) {
      itinerary = itineraries.find((it) => it.date === date) || null;
    } else {
      // Most recently updated itinerary
      itinerary = itineraries
        .slice()
        .sort((a, b) => {
          const ta = new Date(a.updatedAt || a.createdAt || 0).getTime();
          const tb = new Date(b.updatedAt || b.createdAt || 0).getTime();
          return tb - ta;
        })[0] || null;
    }

    if (!itinerary) {
      return { itinerary: null };
    }

    const itemsForItinerary = itineraryItems.filter((it) => it.itineraryId === itinerary.id);
    const itemsWithActivities = itemsForItinerary.map((item) => ({
      itineraryItemId: item.id,
      activity: activities.find((a) => a.id === item.activityId) || null
    }));

    const itemsWithConflicts = this._detectItineraryConflicts(itinerary, itemsWithActivities);

    // Sort by activity start time
    itemsWithConflicts.sort((a, b) => {
      if (!a.activity || !b.activity) return 0;
      const ta = new Date(a.activity.startDateTime).getTime();
      const tb = new Date(b.activity.startDateTime).getTime();
      return ta - tb;
    });

    return {
      itinerary: {
        id: itinerary.id,
        date: itinerary.date,
        name: itinerary.name,
        items: itemsWithConflicts
      }
    };
  }

  removeItineraryItem(itineraryItemId) {
    const itineraryItems = this._getFromStorage('itinerary_items', []);
    const item = itineraryItems.find((it) => it.id === itineraryItemId);
    if (!item) {
      return {
        success: false,
        itinerary: null,
        message: 'Itinerary item not found'
      };
    }

    const newItems = itineraryItems.filter((it) => it.id !== itineraryItemId);
    this._saveToStorage('itinerary_items', newItems);

    const itineraries = this._getFromStorage('itineraries', []);
    const idx = itineraries.findIndex((it) => it.id === item.itineraryId);
    if (idx !== -1) {
      itineraries[idx].itemIds = (itineraries[idx].itemIds || []).filter((id) => id !== itineraryItemId);
      itineraries[idx].updatedAt = this._nowIso();
      this._saveToStorage('itineraries', itineraries);
    }

    const result = this.getItinerary(itineraries[idx] ? itineraries[idx].date : undefined);

    return {
      success: true,
      itinerary: result.itinerary,
      message: 'Itinerary item removed'
    };
  }

  // -----------------
  // Accessibility APIs
  // -----------------
  getAccessibilityOverview() {
    let overview = this._getObjectFromStorage('accessibility_overview', null);
    if (!overview) {
      overview = {
        wheelchairAccessInfo: 'All main entrances and most activity areas are wheelchair accessible, with ramps and step-free routes available throughout the site.',
        sensoryInfo: 'Sensory-friendly showtimes and low-sensory spaces are available; contact our team for additional accommodations.'
      };
    }
    return overview;
  }

  listAccessibleEntrances() {
    const entrances = this._getFromStorage('entrances', []);
    return entrances;
  }

  getEntranceDetails(entranceId) {
    const entrances = this._getFromStorage('entrances', []);
    const areas = this._getFromStorage('accessible_viewing_areas', []);

    const entrance = entrances.find((e) => e.id === entranceId) || null;
    const nearbyAccessibleViewingAreasRaw = areas.filter((a) => a.nearestEntranceId === entranceId);

    // Resolve nearestEntrance for each area (foreign key resolution)
    const nearbyAccessibleViewingAreas = nearbyAccessibleViewingAreasRaw.map((a) => ({
      ...a,
      nearestEntrance: entrance
    }));

    return {
      entrance,
      nearbyAccessibleViewingAreas
    };
  }

  listAccessibleViewingAreas() {
    const entrances = this._getFromStorage('entrances', []);
    const areas = this._getFromStorage('accessible_viewing_areas', []);

    // Resolve nearestEntrance for each area
    return areas.map((area) => ({
      ...area,
      nearestEntrance: entrances.find((e) => e.id === area.nearestEntranceId) || null
    }));
  }

  getAccessibleViewingAreaDetails(accessibleViewingAreaId) {
    const entrances = this._getFromStorage('entrances', []);
    const areas = this._getFromStorage('accessible_viewing_areas', []);

    const area = areas.find((a) => a.id === accessibleViewingAreaId) || null;
    if (!area) {
      return { accessibleViewingArea: null, nearestEntrance: null };
    }
    const nearestEntrance = entrances.find((e) => e.id === area.nearestEntranceId) || null;

    // Include resolved foreign key inside the area as well
    const areaWithResolved = { ...area, nearestEntrance };

    return {
      accessibleViewingArea: areaWithResolved,
      nearestEntrance
    };
  }

  submitAccessibilityInquiry(topic, name, email, message, relatedContext) {
    const record = this._createContactMessageRecord(
      topic,
      name,
      email,
      message,
      'accessibility_page',
      relatedContext
    );
    return {
      success: true,
      messageId: record.id,
      message: 'Accessibility inquiry submitted'
    };
  }

  // -----------------
  // Groups & Parties
  // -----------------
  getGroupsOverviewContent() {
    let content = this._getObjectFromStorage('groups_overview_content', null);
    if (!content) {
      content = {
        introText: 'Plan an unforgettable night for your group with discounted evening sessions, flexible payment options, and dedicated support.',
        faqSnippet: 'Group rates typically start at 10 guests or more; contact us for custom packages.'
      };
    }
    return content;
  }

  searchGroupSessionOptions(groupSize, date, startTimeFrom, startTimeTo, dayOfWeek, mustHaveGroupDiscount, sortBy) {
    const options = this._getFromStorage('group_session_options', []).filter((o) => o.isActive !== false);
    const sessions = this._getFromStorage('sessions', []);

    let filtered = options.filter((opt) => {
      if (typeof groupSize === 'number') {
        if (opt.minGroupSize != null && groupSize < opt.minGroupSize) return false;
        if (opt.maxGroupSize != null && groupSize > opt.maxGroupSize) return false;
      }

      if (date || dayOfWeek || startTimeFrom || startTimeTo) {
        const start = new Date(opt.startDateTime);
        const dStr = this._toDateString(start);
        if (date && dStr !== date) return false;

        if (dayOfWeek) {
          const dow = this._dayOfWeekString(start);
          if (dow !== dayOfWeek) return false;
        }

        const tStr = this._toTimeString(start);
        if (startTimeFrom && this._compareTimeStrings(tStr, startTimeFrom) < 0) return false;
        if (startTimeTo && this._compareTimeStrings(tStr, startTimeTo) > 0) return false;
      }

      if (mustHaveGroupDiscount) {
        if (!opt.hasGroupDiscount && !(Array.isArray(opt.badges) && opt.badges.includes('Group Discount'))) {
          return false;
        }
      }

      return true;
    });

    if (sortBy === 'price_per_person_asc') {
      filtered.sort((a, b) => a.pricePerPerson - b.pricePerPerson);
    } else if (sortBy === 'start_time_asc') {
      filtered.sort((a, b) => new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime());
    }

    // Resolve foreign key: sessionId -> session
    return filtered.map((opt) => ({
      ...opt,
      session: opt.sessionId ? sessions.find((s) => s.id === opt.sessionId) || null : null
    }));
  }

  getGroupSessionDetails(groupSessionOptionId, groupSize) {
    const options = this._getFromStorage('group_session_options', []);
    const sessions = this._getFromStorage('sessions', []);

    const groupSessionOption = options.find((o) => o.id === groupSessionOptionId) || null;
    if (!groupSessionOption) {
      return {
        groupSessionOption: null,
        session: null,
        priceEstimate: null
      };
    }

    const session = groupSessionOption.sessionId
      ? sessions.find((s) => s.id === groupSessionOption.sessionId) || null
      : null;

    const size = typeof groupSize === 'number' ? groupSize : (groupSessionOption.minGroupSize || 0);
    const pricePerPerson = groupSessionOption.pricePerPerson || 0;
    const totalPrice = pricePerPerson * size;

    return {
      groupSessionOption,
      session,
      priceEstimate: {
        groupSize: size,
        pricePerPerson,
        totalPrice,
        currency: null
      }
    };
  }

  createGroupBooking(groupSessionOptionId, groupSize, paymentMethod, contactName, contactPhone, contactEmail) {
    const options = this._getFromStorage('group_session_options', []);
    const option = options.find((o) => o.id === groupSessionOptionId);
    if (!option) {
      return {
        success: false,
        groupBooking: null,
        message: 'Group session option not found'
      };
    }

    const groupBookings = this._getFromStorage('group_bookings', []);
    const booking = {
      id: this._generateId('group_booking'),
      groupSessionOptionId,
      groupSize,
      paymentMethod,
      contactName,
      contactPhone,
      contactEmail,
      status: 'pending',
      createdAt: this._nowIso()
    };

    groupBookings.push(booking);
    this._saveToStorage('group_bookings', groupBookings);

    return {
      success: true,
      groupBooking: booking,
      message: 'Group booking created'
    };
  }

  // ----------------------
  // Newsletter subscriptions
  // ----------------------
  getNewsletterSignupOptions() {
    // Static configuration of interests and frequencies
    const interestOptions = [
      {
        id: 'family_activities',
        label: 'Family Activities',
        description: 'Updates about family-friendly events and activities.'
      },
      {
        id: 'special_offers_discounts',
        label: 'Special Offers & Discounts',
        description: 'Exclusive deals, promo codes, and savings opportunities.'
      },
      {
        id: 'general_updates',
        label: 'General Updates',
        description: 'News about the attraction and seasonal highlights.'
      }
    ];

    const frequencyOptions = [
      { id: 'weekly', label: 'Weekly', description: 'Once a week' },
      { id: 'monthly', label: 'Monthly', description: 'About once a month' },
      { id: 'occasional', label: 'Occasional', description: 'Only major announcements' }
    ];

    return { interestOptions, frequencyOptions };
  }

  createNewsletterSubscription(email, firstName, postalCode, interests, frequency) {
    const newsletterSubscriptions = this._getFromStorage('newsletter_subscriptions', []);
    const subscription = {
      id: this._generateId('newsletter'),
      email,
      firstName: firstName || null,
      postalCode: postalCode || null,
      interests: Array.isArray(interests) ? interests : [],
      frequency,
      status: 'active',
      createdAt: this._nowIso()
    };

    newsletterSubscriptions.push(subscription);
    this._saveToStorage('newsletter_subscriptions', newsletterSubscriptions);

    return {
      success: true,
      subscription,
      message: 'Newsletter subscription created'
    };
  }

  // -------------------
  // Getting Here / Transit
  // -------------------
  getGettingHereContent() {
    let content = this._getObjectFromStorage('getting_here_content', null);
    if (!content) {
      content = {
        drivingDirections: 'Use the North Garage entrance from Holiday Parkway; follow signs for event parking.',
        publicTransitInfo: 'Several bus routes stop near the North and South Gates, including late-night service on select lines. Check local transit schedules for exact times.',
        parkingInfo: 'On-site parking is available in the main garage and overflow lots; prepaid options may be offered on select dates.'
      };
    }
    return content;
  }

  searchTransitRoutes(mode, maxWalkingTimeMinutes, minServiceEndTime, dayOfWeek) {
    let routes = this._getFromStorage('transit_routes', []);

    if (mode) {
      routes = routes.filter((r) => r.mode === mode);
    }

    if (dayOfWeek) {
      routes = routes.filter((r) => {
        if (!Array.isArray(r.daysOfWeek) || !r.daysOfWeek.length) return true;
        return r.daysOfWeek.includes(dayOfWeek);
      });
    }

    routes = this._filterTransitRoutesByServiceWindow(routes, maxWalkingTimeMinutes, minServiceEndTime);

    return routes;
  }

  getTransitRouteDetails(transitRouteId) {
    const routes = this._getFromStorage('transit_routes', []);
    const transitRoute = routes.find((r) => r.id === transitRouteId) || null;
    return { transitRoute };
  }

  // -------------
  // Contact forms
  // -------------
  getContactTopics() {
    // Static mapping of topics
    return [
      { id: 'transportation_parking', label: 'Transportation & Parking' },
      { id: 'tickets_pricing', label: 'Tickets & Pricing' },
      { id: 'group_bookings', label: 'Groups & Parties' },
      { id: 'accessibility_mobility', label: 'Accessibility & Mobility' },
      { id: 'general_question', label: 'General Question' },
      { id: 'other', label: 'Other' }
    ];
  }

  submitContactMessage(topic, name, email, message, relatedContext) {
    const record = this._createContactMessageRecord(
      topic,
      name,
      email,
      message,
      'contact_page',
      relatedContext
    );
    return {
      success: true,
      messageId: record.id,
      message: 'Contact message submitted'
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
