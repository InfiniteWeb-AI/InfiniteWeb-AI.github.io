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
  }

  // ----------------------
  // Storage helpers
  // ----------------------

  _initStorage() {
    // Global id counter
    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }

    // Core data tables (arrays)
    this._ensureStorageKey('coaches', []);
    this._ensureStorageKey('coach_session_options', []);
    this._ensureStorageKey('coach_availability_slots', []);
    this._ensureStorageKey('coaching_session_bookings', []);
    this._ensureStorageKey('matchmaking_plans', []);
    this._ensureStorageKey('events', []);
    this._ensureStorageKey('articles', []);
    this._ensureStorageKey('saved_articles_state', []);
    this._ensureStorageKey('coaching_bundles', []);
    this._ensureStorageKey('matchmakers', []);
    this._ensureStorageKey('matchmaker_favorite_lists', []);
    this._ensureStorageKey('matchmaker_favorite_items', []);
    this._ensureStorageKey('gift_card_types', []);
    this._ensureStorageKey('cart_items', []);

    // Single-entity tables (objects or null)
    this._ensureStorageKey('dating_profile', null);
    this._ensureStorageKey('notification_settings', null);
    this._ensureStorageKey('cart', null);
  }

  _ensureStorageKey(key, defaultValue) {
    if (localStorage.getItem(key) === null) {
      localStorage.setItem(key, JSON.stringify(defaultValue));
    }
  }

  _getFromStorage(key, defaultValue) {
    const data = localStorage.getItem(key);
    if (data === null || data === undefined) {
      return defaultValue;
    }
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

  _nowIso() {
    return new Date().toISOString();
  }

  _todayIsoDate() {
    return new Date().toISOString().slice(0, 10);
  }

  _compareValues(a, b, direction) {
    const dir = direction === 'asc' ? 1 : -1;
    if (a === b) return 0;
    if (a === undefined || a === null) return 1 * dir;
    if (b === undefined || b === null) return -1 * dir;
    if (typeof a === 'string' && typeof b === 'string') {
      return a.localeCompare(b) * dir;
    }
    return (a < b ? -1 : 1) * dir;
  }

  _labelFromKey(key) {
    if (!key) return '';
    return key
      .split('_')
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  // ----------------------
  // Cart helpers
  // ----------------------

  _getOrCreateCart() {
    let cart = this._getFromStorage('cart', null);
    const now = this._nowIso();
    if (!cart || cart.status !== 'open') {
      cart = {
        id: this._generateId('cart'),
        status: 'open',
        item_ids: [],
        created_at: now,
        updated_at: now
      };
    }
    this._saveToStorage('cart', cart);
    return cart;
  }

  _addItemToCart(cart, params) {
    const cartItems = this._getFromStorage('cart_items', []);
    const now = this._nowIso();

    const quantity = params.quantity != null ? params.quantity : 1;
    const unitPrice = params.unitPrice != null ? params.unitPrice : 0;

    const cartItem = {
      id: this._generateId('cart_item'),
      cart_id: cart.id,
      item_type: params.itemType,
      name: params.name,
      quantity: quantity,
      unit_price: unitPrice,
      total_price: unitPrice * quantity,
      currency: params.currency || 'usd',
      added_at: now,
      matchmaking_plan_id: params.matchmakingPlanId || null,
      coaching_bundle_id: params.coachingBundleId || null,
      event_id: params.eventId || null,
      gift_card_type_id: params.giftCardTypeId || null,
      coaching_session_booking_id: params.coachingSessionBookingId || null,
      plan_start_date: params.planStartDate || null,
      billing_option: params.billingOption || null,
      scheduling_preference: params.schedulingPreference || null,
      event_start_datetime: params.eventStartDatetime || null,
      event_type: params.eventType || null,
      ticket_type: params.ticketType || null,
      gift_amount: params.giftAmount || null,
      recipient_name: params.recipientName || null,
      recipient_email: params.recipientEmail || null,
      gift_message: params.giftMessage || null,
      delivery_timing: params.deliveryTiming || null,
      delivery_datetime: params.deliveryDatetime || null,
      session_start_datetime: params.sessionStartDatetime || null,
      session_duration_minutes: params.sessionDurationMinutes || null
    };

    cartItems.push(cartItem);
    cart.item_ids = cart.item_ids || [];
    cart.item_ids.push(cartItem.id);
    cart.updated_at = now;

    this._saveToStorage('cart_items', cartItems);
    this._saveToStorage('cart', cart);
    this._recalculateCartTotals(cart, cartItems);

    return { cart, cartItem };
  }

  _recalculateCartTotals(cart, cartItems) {
    // Cart entity schema does not store subtotal, so this is a no-op
    // but kept for compatibility/extension.
    return;
  }

  // ----------------------
  // Notification helpers
  // ----------------------

  _loadNotificationSettings() {
    const stored = this._getFromStorage('notification_settings', null);
    if (!stored) {
      return {
        id: this._generateId('notif'),
        match_suggestions_frequency: 'off',
        match_suggestions_per_period: 0,
        match_suggestions_email_enabled: true,
        match_suggestions_sms_enabled: false,
        coaching_reminder_timing: 'none',
        coaching_reminders_email_enabled: true,
        coaching_reminders_sms_enabled: false,
        updated_at: this._nowIso()
      };
    }
    return stored;
  }

  _saveNotificationSettings(entity) {
    entity.updated_at = this._nowIso();
    this._saveToStorage('notification_settings', entity);
  }

  // ----------------------
  // Misc helpers
  // ----------------------

  _resolveZipToLocation(zipCode) {
    // Minimal implementation; real data is expected to be managed outside.
    // This helper is here for potential future distance-based filtering.
    if (!zipCode) {
      return { zipCode: null, city: null, state: null, latitude: null, longitude: null };
    }
    // We do NOT introduce any domain/location records here to honor
    // the "do not mock data" requirement.
    return { zipCode, city: null, state: null, latitude: null, longitude: null };
  }

  _filterAndSortEntities(entities, filterFn, sortBy, sortDirection) {
    let results = Array.isArray(entities) ? entities.slice() : [];
    if (typeof filterFn === 'function') {
      results = results.filter(filterFn);
    }
    if (sortBy) {
      const dir = sortDirection === 'asc' ? 'asc' : 'desc';
      results.sort((a, b) => this._compareValues(a[sortBy], b[sortBy], dir));
    }
    return results;
  }

  // ==========================================================
  // Interface implementations
  // ==========================================================

  // ----------------------------------------------------------
  // getHomePageContent
  // ----------------------------------------------------------
  getHomePageContent() {
    const coaches = this._getFromStorage('coaches', []).filter(c => c.is_active);
    const plans = this._getFromStorage('matchmaking_plans', []).filter(p => p.is_active);
    const events = this._getFromStorage('events', []).filter(e => e.is_active);
    const articles = this._getFromStorage('articles', []).filter(a => a.status === 'published');

    const featuredCoaches = coaches
      .slice()
      .sort((a, b) => this._compareValues(a.rating, b.rating, 'desc'))
      .slice(0, 3)
      .map(c => ({
        coachId: c.id,
        name: c.name,
        headline: c.headline || '',
        city: c.city,
        state: c.state,
        rating: c.rating,
        ratingCount: c.rating_count || 0,
        minSessionPrice: c.min_session_price,
        currency: 'usd',
        photoUrl: c.photo_url || ''
      }));

    const featuredMatchmakingPlans = plans
      .slice()
      .sort((a, b) => {
        // Recommended plans first, then by price ascending
        if (a.is_recommended && !b.is_recommended) return -1;
        if (!a.is_recommended && b.is_recommended) return 1;
        return this._compareValues(a.total_price, b.total_price, 'asc');
      })
      .slice(0, 3)
      .map(p => ({
        planId: p.id,
        name: p.name,
        durationMonths: p.duration_months,
        introductionsPerMonth: p.introductions_per_month,
        totalPrice: p.total_price,
        currency: p.currency || 'usd',
        isRecommended: !!p.is_recommended
      }));

    const now = new Date();
    const featuredEvents = events
      .filter(e => new Date(e.start_datetime) >= now)
      .sort((a, b) => this._compareValues(a.start_datetime, b.start_datetime, 'asc'))
      .slice(0, 3)
      .map(e => ({
        eventId: e.id,
        name: e.name,
        eventType: e.event_type,
        city: e.city,
        state: e.state,
        startDatetime: e.start_datetime,
        price: e.price,
        currency: e.currency || 'usd',
        isInPerson: !!e.is_in_person
      }));

    const recentArticles = articles
      .slice()
      .sort((a, b) => this._compareValues(a.created_at, b.created_at, 'desc'))
      .slice(0, 3)
      .map(a => ({
        articleId: a.id,
        title: a.title,
        excerpt: a.excerpt || (a.content ? a.content.slice(0, 140) + '...' : ''),
        estimatedReadingTimeMinutes: a.estimated_reading_time_minutes,
        createdAt: a.created_at
      }));

    return {
      hero: {
        title: 'Local matchmaking and date coaching, built around you',
        subtitle: 'Meet real people nearby with support from professional matchmakers and coaches.',
        primaryCtaLabel: 'Get Started',
        primaryCtaTargetPage: 'profile_setup',
        secondaryCtaLabel: 'Browse Matchmaking Plans',
        secondaryCtaTargetPage: 'matchmaking_plans'
      },
      coreServices: [
        {
          key: 'matchmaking',
          title: 'Personal Matchmaking',
          description: 'Curated introductions with matches screened by real matchmakers.'
        },
        {
          key: 'date_coaching',
          title: '1:1 Date Coaching',
          description: 'Work with a coach on confidence, messaging, and first-date skills.'
        },
        {
          key: 'events',
          title: 'Local Singles Events',
          description: 'Speed dating, workshops, and socials hosted in your city.'
        },
        {
          key: 'advice',
          title: 'Expert Advice',
          description: 'Short, practical articles from matchmakers and coaches.'
        }
      ],
      privacyAndLocality: {
        headline: 'Local, private, and human-centered',
        body: 'We focus on introductions within your area and never show your full profile publicly without your consent.'
      },
      howItWorksSections: [
        {
          stepNumber: 1,
          title: 'Create your profile',
          description: 'Share your preferences, deal-breakers, and what you are looking for.'
        },
        {
          stepNumber: 2,
          title: 'Meet your team',
          description: 'Get matched with a local matchmaker and coach who understand your goals.'
        },
        {
          stepNumber: 3,
          title: 'Get introductions & coaching',
          description: 'Receive curated matches, attend events, and get practical coaching support.'
        }
      ],
      featuredCoaches,
      featuredMatchmakingPlans,
      featuredEvents,
      recentArticles
    };
  }

  // ----------------------------------------------------------
  // Coaches listing & booking
  // ----------------------------------------------------------

  getCoachesFilterOptions() {
    const coaches = this._getFromStorage('coaches', []).filter(c => c.is_active);
    const sessionOptions = this._getFromStorage('coach_session_options', []).filter(s => s.is_active);

    let minPrice = null;
    let maxPrice = null;
    coaches.forEach(c => {
      if (typeof c.min_session_price === 'number') {
        if (minPrice === null || c.min_session_price < minPrice) minPrice = c.min_session_price;
      }
      if (typeof c.max_session_price === 'number') {
        if (maxPrice === null || c.max_session_price > maxPrice) maxPrice = c.max_session_price;
      }
    });

    if (minPrice === null) minPrice = 0;
    if (maxPrice === null) maxPrice = 0;

    const durationMap = {};
    sessionOptions.forEach(so => {
      durationMap[so.duration_minutes] = true;
    });
    const sessionLengthOptions = Object.keys(durationMap)
      .map(d => parseInt(d, 10))
      .sort((a, b) => a - b)
      .map(d => ({ durationMinutes: d, label: d + ' minutes' }));

    const ratingOptions = [
      { value: 4.5, label: '4.5+ stars' },
      { value: 4.0, label: '4.0+ stars' },
      { value: 3.0, label: '3.0+ stars' }
    ];

    const sortOptions = [
      { key: 'rating', label: 'Rating: High to Low', defaultDirection: 'desc' },
      { key: 'price', label: 'Price: Low to High', defaultDirection: 'asc' },
      { key: 'relevance', label: 'Best match', defaultDirection: 'desc' }
    ];

    return {
      priceRange: {
        min: minPrice,
        max: maxPrice,
        step: 5,
        currency: 'usd'
      },
      ratingOptions,
      sessionLengthOptions,
      sortOptions
    };
  }

  searchCoaches(
    city,
    zipCode,
    maxDistanceMiles,
    minRating,
    maxSessionPrice,
    sessionDurationMinutes,
    sortBy,
    sortDirection,
    page,
    pageSize
  ) {
    const coaches = this._getFromStorage('coaches', []).filter(c => c.is_active);
    const sessionOptions = this._getFromStorage('coach_session_options', []).filter(s => s.is_active);

    const byCoach = {};
    sessionOptions.forEach(so => {
      if (!byCoach[so.coach_id]) byCoach[so.coach_id] = [];
      byCoach[so.coach_id].push(so);
    });

    let results = coaches.filter(c => {
      if (city && c.city && c.city.toLowerCase() !== String(city).toLowerCase()) {
        return false;
      }
      if (!city && zipCode && c.zip_code !== zipCode) {
        return false;
      }
      // maxDistanceMiles ignored – no geo data without external sources
      if (typeof minRating === 'number' && c.rating < minRating) {
        return false;
      }

      const coachSessionOptions = byCoach[c.id] || [];

      if (sessionDurationMinutes) {
        const matching = coachSessionOptions.filter(so => so.duration_minutes === sessionDurationMinutes);
        if (matching.length === 0) {
          return false;
        }

        if (typeof maxSessionPrice === 'number') {
          const minPriceForDuration = matching.reduce((min, so) => {
            return min === null || so.price < min ? so.price : min;
          }, null);
          if (minPriceForDuration === null || minPriceForDuration > maxSessionPrice) {
            return false;
          }
        }
      } else if (typeof maxSessionPrice === 'number') {
        if (typeof c.min_session_price === 'number' && c.min_session_price > maxSessionPrice) {
          return false;
        }
      }

      return true;
    });

    const mapped = results.map(c => {
      const coachSessionOptions = byCoach[c.id] || [];
      const durationsMap = {};
      coachSessionOptions.forEach(so => {
        durationsMap[so.duration_minutes] = true;
      });
      const availableSessionLengths = Object.keys(durationsMap).map(d => parseInt(d, 10));

      return {
        coachId: c.id,
        name: c.name,
        headline: c.headline || '',
        city: c.city,
        state: c.state,
        rating: c.rating,
        ratingCount: c.rating_count || 0,
        minSessionPrice: c.min_session_price,
        maxSessionPrice: c.max_session_price,
        currency: 'usd',
        photoUrl: c.photo_url || '',
        availableSessionLengths
      };
    });

    const effectiveSortBy = sortBy || 'rating';
    const dir = sortDirection || (effectiveSortBy === 'price' ? 'asc' : 'desc');

    mapped.sort((a, b) => {
      if (effectiveSortBy === 'price') {
        return this._compareValues(a.minSessionPrice, b.minSessionPrice, dir);
      }
      if (effectiveSortBy === 'rating') {
        return this._compareValues(a.rating, b.rating, dir);
      }
      // relevance: use rating then price
      const r = this._compareValues(a.rating, b.rating, 'desc');
      if (r !== 0) return r;
      return this._compareValues(a.minSessionPrice, b.minSessionPrice, 'asc');
    });

    const totalCount = mapped.length;
    const p = page && page > 0 ? page : 1;
    const ps = pageSize && pageSize > 0 ? pageSize : 20;
    const start = (p - 1) * ps;
    const paged = mapped.slice(start, start + ps);

    return {
      results: paged,
      totalCount,
      page: p,
      pageSize: ps
    };
  }

  getCoachDetails(coachId) {
    const coaches = this._getFromStorage('coaches', []);
    const coach = coaches.find(c => c.id === coachId) || null;
    const sessionOptionsRaw = this._getFromStorage('coach_session_options', []).filter(
      so => so.coach_id === coachId && so.is_active
    );

    const sessionOptions = sessionOptionsRaw.map(so => ({
      sessionOptionId: so.id,
      name: so.name,
      durationMinutes: so.duration_minutes,
      price: so.price,
      currency: so.currency || 'usd',
      description: so.description || '',
      isActive: !!so.is_active
    }));

    const coachObj = coach
      ? {
          id: coach.id,
          name: coach.name,
          headline: coach.headline || '',
          bio: coach.bio || '',
          photoUrl: coach.photo_url || '',
          city: coach.city,
          state: coach.state,
          zipCode: coach.zip_code,
          baseTimezone: coach.base_timezone || '',
          rating: coach.rating,
          ratingCount: coach.rating_count || 0,
          minSessionPrice: coach.min_session_price,
          maxSessionPrice: coach.max_session_price,
          currency: 'usd'
        }
      : null;

    return {
      coach: coachObj,
      sessionOptions,
      reviewsSummary: {
        averageRating: coach ? coach.rating : 0,
        ratingCount: coach ? coach.rating_count || 0 : 0
      }
    };
  }

  getCoachSessionAvailability(coachId, sessionOptionId, startDate, endDate) {
    const slots = this._getFromStorage('coach_availability_slots', []).filter(
      s => s.coach_id === coachId && s.session_option_id === sessionOptionId && !s.is_booked
    );

    const start = new Date(startDate);
    const end = new Date(endDate);

    const inRange = slots.filter(s => {
      const st = new Date(s.start_time);
      return st >= start && st <= end;
    });

    return inRange.map(s => {
      const startTime = new Date(s.start_time);
      const label = startTime.toLocaleString('en-US', {
        weekday: 'short',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
      return {
        slotId: s.id,
        startTime: s.start_time,
        endTime: s.end_time,
        isBooked: !!s.is_booked,
        localStartTimeLabel: label
      };
    });
  }

  bookCoachingSession(coachId, sessionOptionId, slotId, notes) {
    const coaches = this._getFromStorage('coaches', []);
    const coach = coaches.find(c => c.id === coachId) || null;
    const sessionOptions = this._getFromStorage('coach_session_options', []);
    const sessionOption = sessionOptions.find(so => so.id === sessionOptionId) || null;
    const slots = this._getFromStorage('coach_availability_slots', []);
    const slotIndex = slots.findIndex(s => s.id === slotId && s.coach_id === coachId && s.session_option_id === sessionOptionId);

    if (!coach || !sessionOption || slotIndex === -1 || slots[slotIndex].is_booked) {
      return {
        success: false,
        bookingId: null,
        status: 'pending',
        coachName: coach ? coach.name : '',
        sessionName: sessionOption ? sessionOption.name : '',
        sessionDurationMinutes: sessionOption ? sessionOption.duration_minutes : 0,
        startTime: null,
        endTime: null,
        price: sessionOption ? sessionOption.price : 0,
        currency: sessionOption ? sessionOption.currency || 'usd' : 'usd',
        confirmationMessage: 'Unable to book session. Slot may no longer be available.'
      };
    }

    const slot = slots[slotIndex];
    const bookings = this._getFromStorage('coaching_session_bookings', []);

    const booking = {
      id: this._generateId('cs_booking'),
      coach_id: coachId,
      session_option_id: sessionOptionId,
      slot_id: slotId,
      status: 'confirmed',
      price: sessionOption.price,
      currency: sessionOption.currency || 'usd',
      created_at: this._nowIso(),
      notes: notes || ''
    };

    bookings.push(booking);
    slots[slotIndex].is_booked = true;

    this._saveToStorage('coaching_session_bookings', bookings);
    this._saveToStorage('coach_availability_slots', slots);

    return {
      success: true,
      bookingId: booking.id,
      status: booking.status,
      coachName: coach.name,
      sessionName: sessionOption.name,
      sessionDurationMinutes: sessionOption.duration_minutes,
      startTime: slot.start_time,
      endTime: slot.end_time,
      price: booking.price,
      currency: booking.currency,
      confirmationMessage: 'Your coaching session is confirmed.'
    };
  }

  // ----------------------------------------------------------
  // Matchmaking plans
  // ----------------------------------------------------------

  getMatchmakingPlanFilterOptions() {
    const plans = this._getFromStorage('matchmaking_plans', []).filter(p => p.is_active);

    const durationMap = {};
    const introsMap = {};
    let minPrice = null;
    let maxPrice = null;

    plans.forEach(p => {
      durationMap[p.duration_months] = true;
      introsMap[p.introductions_per_month] = true;
      if (typeof p.total_price === 'number') {
        if (minPrice === null || p.total_price < minPrice) minPrice = p.total_price;
        if (maxPrice === null || p.total_price > maxPrice) maxPrice = p.total_price;
      }
    });

    if (minPrice === null) minPrice = 0;
    if (maxPrice === null) maxPrice = 0;

    const durationOptions = Object.keys(durationMap)
      .map(m => parseInt(m, 10))
      .sort((a, b) => a - b)
      .map(m => ({ months: m, label: m + ' months' }));

    const introductionsPerMonthOptions = Object.keys(introsMap)
      .map(v => parseInt(v, 10))
      .sort((a, b) => a - b)
      .map(v => ({ value: v, label: v + ' introductions/month' }));

    const sortOptions = [
      { key: 'price', label: 'Price: Low to High', defaultDirection: 'asc' },
      { key: 'value', label: 'Best value', defaultDirection: 'asc' },
      { key: 'duration', label: 'Duration', defaultDirection: 'asc' }
    ];

    return {
      durationOptions,
      introductionsPerMonthOptions,
      priceRange: {
        min: minPrice,
        max: maxPrice,
        step: 25,
        currency: 'usd'
      },
      sortOptions
    };
  }

  searchMatchmakingPlans(durationMonths, maxTotalPrice, minIntroductionsPerMonth, sortBy, sortDirection) {
    let plans = this._getFromStorage('matchmaking_plans', []).filter(p => p.is_active);

    plans = plans.filter(p => {
      if (typeof durationMonths === 'number' && p.duration_months !== durationMonths) return false;
      if (typeof maxTotalPrice === 'number' && p.total_price > maxTotalPrice) return false;
      if (
        typeof minIntroductionsPerMonth === 'number' &&
        p.introductions_per_month < minIntroductionsPerMonth
      )
        return false;
      return true;
    });

    const effectiveSortBy = sortBy || 'price';
    const dir = sortDirection || (effectiveSortBy === 'price' ? 'asc' : 'asc');

    plans.sort((a, b) => {
      if (effectiveSortBy === 'price') {
        return this._compareValues(a.total_price, b.total_price, dir);
      }
      if (effectiveSortBy === 'duration') {
        return this._compareValues(a.duration_months, b.duration_months, dir);
      }
      // value: price per introduction (lower is better)
      const totalIntrosA = a.duration_months * a.introductions_per_month;
      const totalIntrosB = b.duration_months * b.introductions_per_month;
      const valueA = totalIntrosA > 0 ? a.total_price / totalIntrosA : Infinity;
      const valueB = totalIntrosB > 0 ? b.total_price / totalIntrosB : Infinity;
      return this._compareValues(valueA, valueB, 'asc');
    });

    return plans.map(p => ({
      planId: p.id,
      name: p.name,
      description: p.description || '',
      durationMonths: p.duration_months,
      introductionsPerMonth: p.introductions_per_month,
      totalPrice: p.total_price,
      currency: p.currency || 'usd',
      isRecommended: !!p.is_recommended
    }));
  }

  getMatchmakingPlanDetails(planId) {
    const plans = this._getFromStorage('matchmaking_plans', []);
    const plan = plans.find(p => p.id === planId) || null;

    const planObj = plan
      ? {
          id: plan.id,
          name: plan.name,
          description: plan.description || '',
          durationMonths: plan.duration_months,
          introductionsPerMonth: plan.introductions_per_month,
          totalPrice: plan.total_price,
          currency: plan.currency || 'usd',
          features: plan.features || [],
          isRecommended: !!plan.is_recommended
        }
      : null;

    const billingOptions = [
      {
        key: 'one_time_payment',
        label: 'One-time payment',
        description: 'Pay the full amount upfront.'
      },
      {
        key: 'installments',
        label: 'Installments',
        description: 'Split your plan into monthly payments.'
      }
    ];

    return {
      plan: planObj,
      billingOptions,
      earliestStartDate: this._todayIsoDate()
    };
  }

  addMatchmakingPlanToCart(planId, billingOption, startDate) {
    const plans = this._getFromStorage('matchmaking_plans', []);
    const plan = plans.find(p => p.id === planId && p.is_active);

    if (!plan) {
      return {
        success: false,
        cartId: null,
        cartItemId: null,
        message: 'Matchmaking plan not found or inactive.'
      };
    }

    const cart = this._getOrCreateCart();
    const { cartItem } = this._addItemToCart(cart, {
      itemType: 'matchmaking_plan',
      name: plan.name,
      quantity: 1,
      unitPrice: plan.total_price,
      currency: plan.currency || 'usd',
      matchmakingPlanId: plan.id,
      planStartDate: startDate,
      billingOption: billingOption
    });

    return {
      success: true,
      cartId: cart.id,
      cartItemId: cartItem.id,
      message: 'Matchmaking plan added to cart.'
    };
  }

  // ----------------------------------------------------------
  // Dating profile
  // ----------------------------------------------------------

  getProfileSetupData() {
    const stored = this._getFromStorage('dating_profile', null);

    const profile = stored
      ? {
          id: stored.id,
          firstName: stored.first_name,
          lastName: stored.last_name || '',
          age: stored.age || null,
          dateOfBirth: stored.date_of_birth || null,
          gender: stored.gender,
          lookingForGender: stored.looking_for_gender,
          preferredAgeMin: stored.preferred_age_min,
          preferredAgeMax: stored.preferred_age_max,
          zipCode: stored.zip_code,
          city: stored.city || '',
          state: stored.state || '',
          searchRadiusMiles: stored.search_radius_miles,
          matchmakingEnabled: !!stored.matchmaking_enabled,
          coachingEnabled: !!stored.coaching_enabled
        }
      : null;

    const genderOptions = ['male', 'female', 'non_binary', 'other', 'prefer_not_to_say'];
    const lookingForGenderOptions = ['men', 'women', 'non_binary', 'any'];

    return {
      profile,
      genderOptions,
      lookingForGenderOptions,
      defaultSearchRadiusMiles: 25
    };
  }

  saveDatingProfile(profile) {
    const existing = this._getFromStorage('dating_profile', null);
    const now = this._nowIso();

    const id = existing ? existing.id : this._generateId('profile');

    const entity = {
      id,
      first_name: profile.firstName,
      last_name: profile.lastName || '',
      age: profile.age != null ? profile.age : existing ? existing.age : null,
      date_of_birth:
        profile.dateOfBirth != null
          ? profile.dateOfBirth
          : existing
          ? existing.date_of_birth
          : null,
      gender: profile.gender,
      looking_for_gender: profile.lookingForGender,
      preferred_age_min: profile.preferredAgeMin,
      preferred_age_max: profile.preferredAgeMax,
      zip_code: profile.zipCode,
      city: profile.city || '',
      state: profile.state || '',
      search_radius_miles: profile.searchRadiusMiles,
      matchmaking_enabled: !!profile.matchmakingEnabled,
      coaching_enabled: !!profile.coachingEnabled,
      created_at: existing ? existing.created_at : now,
      updated_at: now
    };

    this._saveToStorage('dating_profile', entity);

    return {
      success: true,
      profileId: id,
      message: 'Profile saved.'
    };
  }

  // ----------------------------------------------------------
  // Events & tickets
  // ----------------------------------------------------------

  getEventFilterOptions() {
    const events = this._getFromStorage('events', []).filter(e => e.is_active);

    const typeMap = {};
    let minPrice = null;
    let maxPrice = null;

    events.forEach(e => {
      typeMap[e.event_type] = true;
      if (typeof e.price === 'number') {
        if (minPrice === null || e.price < minPrice) minPrice = e.price;
        if (maxPrice === null || e.price > maxPrice) maxPrice = e.price;
      }
    });

    if (minPrice === null) minPrice = 0;
    if (maxPrice === null) maxPrice = 0;

    const eventTypeOptions = Object.keys(typeMap).map(t => ({
      key: t,
      label: this._labelFromKey(t)
    }));

    const sortOptions = [
      { key: 'date', label: 'Date', defaultDirection: 'asc' },
      { key: 'price', label: 'Price', defaultDirection: 'asc' }
    ];

    return {
      eventTypeOptions,
      priceRange: {
        min: minPrice,
        max: maxPrice,
        step: 5,
        currency: 'usd'
      },
      sortOptions
    };
  }

  searchEvents(
    zipCode,
    radiusMiles,
    startDate,
    endDate,
    maxPrice,
    eventType,
    isInPersonOnly,
    sortBy,
    sortDirection
  ) {
    let events = this._getFromStorage('events', []).filter(e => e.is_active);

    events = events.filter(e => {
      if (zipCode && e.zip_code !== zipCode) return false;
      // radiusMiles ignored – no geo resolution without external data
      if (eventType && e.event_type !== eventType) return false;
      if (isInPersonOnly && !e.is_in_person) return false;
      if (typeof maxPrice === 'number' && e.price > maxPrice) return false;
      if (startDate) {
        const sd = new Date(startDate);
        const es = new Date(e.start_datetime);
        if (es < sd) return false;
      }
      if (endDate) {
        const ed = new Date(endDate);
        const es = new Date(e.start_datetime);
        if (es > ed) return false;
      }
      return true;
    });

    const effectiveSortBy = sortBy || 'date';
    const dir = sortDirection || (effectiveSortBy === 'price' ? 'asc' : 'asc');

    events.sort((a, b) => {
      if (effectiveSortBy === 'price') {
        return this._compareValues(a.price, b.price, dir);
      }
      return this._compareValues(a.start_datetime, b.start_datetime, dir);
    });

    return events.map(e => ({
      eventId: e.id,
      name: e.name,
      eventType: e.event_type,
      description: e.description || '',
      startDatetime: e.start_datetime,
      endDatetime: e.end_datetime || null,
      city: e.city,
      state: e.state,
      zipCode: e.zip_code,
      price: e.price,
      currency: e.currency || 'usd',
      isInPerson: !!e.is_in_person,
      remainingCapacity: e.remaining_capacity != null ? e.remaining_capacity : null
    }));
  }

  getEventDetails(eventId) {
    const events = this._getFromStorage('events', []);
    const event = events.find(e => e.id === eventId) || null;

    const eventObj = event
      ? {
          id: event.id,
          name: event.name,
          description: event.description || '',
          eventType: event.event_type,
          startDatetime: event.start_datetime,
          endDatetime: event.end_datetime || null,
          venueName: event.venue_name || '',
          addressLine: event.address_line || '',
          city: event.city,
          state: event.state,
          zipCode: event.zip_code,
          price: event.price,
          currency: event.currency || 'usd',
          maxCapacity: event.max_capacity != null ? event.max_capacity : null,
          remainingCapacity: event.remaining_capacity != null ? event.remaining_capacity : null,
          isInPerson: !!event.is_in_person
        }
      : null;

    const ticketTypes = event
      ? [
          {
            ticketType: 'standard',
            label: 'Standard',
            price: event.price
          }
        ]
      : [];

    return {
      event: eventObj,
      ticketTypes,
      defaultTicketQuantity: 1
    };
  }

  addEventTicketToCart(eventId, ticketType, quantity) {
    const events = this._getFromStorage('events', []);
    const event = events.find(e => e.id === eventId && e.is_active);

    if (!event) {
      return {
        success: false,
        cartId: null,
        cartItemId: null,
        message: 'Event not found or inactive.'
      };
    }

    const qty = quantity && quantity > 0 ? quantity : 1;
    const pricePerTicket = event.price;

    const cart = this._getOrCreateCart();
    const { cartItem } = this._addItemToCart(cart, {
      itemType: 'event_ticket',
      name: event.name,
      quantity: qty,
      unitPrice: pricePerTicket,
      currency: event.currency || 'usd',
      eventId: event.id,
      eventStartDatetime: event.start_datetime,
      eventType: event.event_type,
      ticketType: ticketType || 'standard'
    });

    // Optionally decrement remaining capacity
    const eventIndex = events.findIndex(e => e.id === eventId);
    if (eventIndex !== -1 && typeof events[eventIndex].remaining_capacity === 'number') {
      events[eventIndex].remaining_capacity = Math.max(
        0,
        events[eventIndex].remaining_capacity - qty
      );
      this._saveToStorage('events', events);
    }

    return {
      success: true,
      cartId: cart.id,
      cartItemId: cartItem.id,
      message: 'Event ticket added to cart.'
    };
  }

  // ----------------------------------------------------------
  // Articles & advice
  // ----------------------------------------------------------

  getArticleSearchOptions() {
    const readingTimeOptions = [
      { maxMinutes: 5, label: 'Up to 5 minutes' },
      { maxMinutes: 10, label: 'Up to 10 minutes' },
      { maxMinutes: 15, label: 'Up to 15 minutes' }
    ];

    const sortOptions = [
      { key: 'recent', label: 'Most recent', defaultDirection: 'desc' },
      { key: 'popular', label: 'Most popular', defaultDirection: 'desc' }
    ];

    return {
      readingTimeOptions,
      sortOptions
    };
  }

  searchArticles(query, maxReadingTimeMinutes, sortBy, page, pageSize) {
    let articles = this._getFromStorage('articles', []).filter(a => a.status === 'published');

    const q = query ? String(query).toLowerCase() : '';

    if (q) {
      articles = articles.filter(a => {
        const title = (a.title || '').toLowerCase();
        const excerpt = (a.excerpt || '').toLowerCase();
        const content = (a.content || '').toLowerCase();
        const tags = Array.isArray(a.tags) ? a.tags.join(' ').toLowerCase() : '';
        return (
          title.includes(q) ||
          excerpt.includes(q) ||
          content.includes(q) ||
          tags.includes(q)
        );
      });
    }

    if (typeof maxReadingTimeMinutes === 'number') {
      articles = articles.filter(
        a => a.estimated_reading_time_minutes <= maxReadingTimeMinutes
      );
    }

    const effectiveSortBy = sortBy || 'recent';

    articles.sort((a, b) => {
      // No popularity metric stored; treat 'popular' same as 'recent'
      return this._compareValues(a.created_at, b.created_at, 'desc');
    });

    const totalCount = articles.length;
    const p = page && page > 0 ? page : 1;
    const ps = pageSize && pageSize > 0 ? pageSize : 20;
    const start = (p - 1) * ps;
    const paged = articles.slice(start, start + ps);

    const results = paged.map(a => ({
      articleId: a.id,
      title: a.title,
      excerpt: a.excerpt || (a.content ? a.content.slice(0, 140) + '...' : ''),
      estimatedReadingTimeMinutes: a.estimated_reading_time_minutes,
      createdAt: a.created_at,
      tags: Array.isArray(a.tags) ? a.tags : []
    }));

    return {
      results,
      totalCount,
      page: p,
      pageSize: ps
    };
  }

  getArticleDetails(articleId) {
    const articles = this._getFromStorage('articles', []);
    const saved = this._getFromStorage('saved_articles_state', []);

    const article = articles.find(a => a.id === articleId) || null;
    const isSaved = saved.some(sa => sa.article_id === articleId);

    const articleObj = article
      ? {
          id: article.id,
          title: article.title,
          content: article.content,
          estimatedReadingTimeMinutes: article.estimated_reading_time_minutes,
          createdAt: article.created_at,
          tags: Array.isArray(article.tags) ? article.tags : []
        }
      : null;

    return {
      article: articleObj,
      isSaved
    };
  }

  saveArticle(articleId) {
    const articles = this._getFromStorage('articles', []);
    const article = articles.find(a => a.id === articleId);
    if (!article) {
      return {
        success: false,
        savedAt: null,
        message: 'Article not found.'
      };
    }

    const saved = this._getFromStorage('saved_articles_state', []);
    const now = this._nowIso();

    const existingIndex = saved.findIndex(sa => sa.article_id === articleId);
    if (existingIndex !== -1) {
      saved[existingIndex].saved_at = now;
    } else {
      saved.push({
        id: this._generateId('saved_article'),
        article_id: articleId,
        saved_at: now
      });
    }

    this._saveToStorage('saved_articles_state', saved);

    return {
      success: true,
      savedAt: now,
      message: 'Article saved.'
    };
  }

  getSavedArticles() {
    const saved = this._getFromStorage('saved_articles_state', []);
    const articles = this._getFromStorage('articles', []);

    return saved.map(sa => {
      const article = articles.find(a => a.id === sa.article_id) || null;
      return {
        articleId: sa.article_id,
        title: article ? article.title : '',
        excerpt: article
          ? article.excerpt || (article.content ? article.content.slice(0, 140) + '...' : '')
          : '',
        estimatedReadingTimeMinutes: article
          ? article.estimated_reading_time_minutes
          : null,
        savedAt: sa.saved_at,
        // Foreign key resolution
        article: article
      };
    });
  }

  removeSavedArticle(articleId) {
    const saved = this._getFromStorage('saved_articles_state', []);
    const filtered = saved.filter(sa => sa.article_id !== articleId);
    this._saveToStorage('saved_articles_state', filtered);

    return {
      success: true,
      message: 'Saved article removed.'
    };
  }

  // ----------------------------------------------------------
  // Coaching bundles
  // ----------------------------------------------------------

  getCoachingBundleFilterOptions() {
    const bundles = this._getFromStorage('coaching_bundles', []).filter(b => b.is_active);

    const sessionsMap = {};
    const lengthMap = {};
    let minPrice = null;
    let maxPrice = null;

    bundles.forEach(b => {
      sessionsMap[b.number_of_sessions] = true;
      lengthMap[b.session_length_minutes] = true;
      if (typeof b.total_price === 'number') {
        if (minPrice === null || b.total_price < minPrice) minPrice = b.total_price;
        if (maxPrice === null || b.total_price > maxPrice) maxPrice = b.total_price;
      }
    });

    if (minPrice === null) minPrice = 0;
    if (maxPrice === null) maxPrice = 0;

    const sessionCountOptions = Object.keys(sessionsMap)
      .map(s => parseInt(s, 10))
      .sort((a, b) => a - b)
      .map(s => ({ sessions: s, label: s + ' sessions' }));

    const sessionLengthOptions = Object.keys(lengthMap)
      .map(m => parseInt(m, 10))
      .sort((a, b) => a - b)
      .map(m => ({ minutes: m, label: m + ' minutes' }));

    const sortOptions = [
      { key: 'price', label: 'Price: Low to High', defaultDirection: 'asc' },
      { key: 'sessions', label: 'Number of sessions', defaultDirection: 'asc' }
    ];

    return {
      sessionCountOptions,
      sessionLengthOptions,
      priceRange: {
        min: minPrice,
        max: maxPrice,
        step: 25,
        currency: 'usd'
      },
      sortOptions
    };
  }

  searchCoachingBundles(
    numberOfSessions,
    minSessionLengthMinutes,
    maxSessionLengthMinutes,
    maxTotalPrice,
    sortBy,
    sortDirection
  ) {
    let bundles = this._getFromStorage('coaching_bundles', []).filter(b => b.is_active);

    bundles = bundles.filter(b => {
      if (typeof numberOfSessions === 'number' && b.number_of_sessions !== numberOfSessions)
        return false;
      if (
        typeof minSessionLengthMinutes === 'number' &&
        b.session_length_minutes < minSessionLengthMinutes
      )
        return false;
      if (
        typeof maxSessionLengthMinutes === 'number' &&
        b.session_length_minutes > maxSessionLengthMinutes
      )
        return false;
      if (typeof maxTotalPrice === 'number' && b.total_price > maxTotalPrice) return false;
      return true;
    });

    const effectiveSortBy = sortBy || 'price';
    const dir = sortDirection || 'asc';

    bundles.sort((a, b) => {
      if (effectiveSortBy === 'sessions') {
        return this._compareValues(a.number_of_sessions, b.number_of_sessions, dir);
      }
      return this._compareValues(a.total_price, b.total_price, dir);
    });

    return bundles.map(b => ({
      bundleId: b.id,
      name: b.name,
      description: b.description || '',
      numberOfSessions: b.number_of_sessions,
      sessionLengthMinutes: b.session_length_minutes,
      totalPrice: b.total_price,
      currency: b.currency || 'usd'
    }));
  }

  getCoachingBundleDetails(bundleId) {
    const bundles = this._getFromStorage('coaching_bundles', []);
    const bundle = bundles.find(b => b.id === bundleId) || null;

    const bundleObj = bundle
      ? {
          id: bundle.id,
          name: bundle.name,
          description: bundle.description || '',
          numberOfSessions: bundle.number_of_sessions,
          sessionLengthMinutes: bundle.session_length_minutes,
          totalPrice: bundle.total_price,
          currency: bundle.currency || 'usd'
        }
      : null;

    const schedulingPreferenceOptions = [
      {
        key: 'schedule_later',
        label: 'Schedule later',
        description: 'Purchase now and schedule sessions when you are ready.'
      },
      {
        key: 'flexible',
        label: 'Flexible scheduling',
        description: 'We will work with you to find times that fit your calendar.'
      },
      {
        key: 'fixed',
        label: 'Fixed schedule',
        description: 'Book your recurring time slot in advance.'
      }
    ];

    return {
      bundle: bundleObj,
      schedulingPreferenceOptions
    };
  }

  addCoachingBundleToCart(bundleId, schedulingPreference) {
    const bundles = this._getFromStorage('coaching_bundles', []);
    const bundle = bundles.find(b => b.id === bundleId && b.is_active);

    if (!bundle) {
      return {
        success: false,
        cartId: null,
        cartItemId: null,
        message: 'Coaching bundle not found or inactive.'
      };
    }

    const cart = this._getOrCreateCart();
    const { cartItem } = this._addItemToCart(cart, {
      itemType: 'coaching_bundle',
      name: bundle.name,
      quantity: 1,
      unitPrice: bundle.total_price,
      currency: bundle.currency || 'usd',
      coachingBundleId: bundle.id,
      schedulingPreference: schedulingPreference || 'schedule_later'
    });

    return {
      success: true,
      cartId: cart.id,
      cartItemId: cartItem.id,
      message: 'Coaching bundle added to cart.'
    };
  }

  // ----------------------------------------------------------
  // Matchmakers & favorites
  // ----------------------------------------------------------

  getMatchmakerFilterOptions() {
    const matchmakers = this._getFromStorage('matchmakers', []).filter(m => m.is_active);

    const specializationMap = {};
    const languageMap = {};

    matchmakers.forEach(m => {
      if (Array.isArray(m.specializations)) {
        m.specializations.forEach(s => {
          specializationMap[s] = true;
        });
      }
      if (Array.isArray(m.languages)) {
        m.languages.forEach(l => {
          languageMap[l] = true;
        });
      }
    });

    const specializationOptions = Object.keys(specializationMap).map(s => ({
      key: s,
      label: this._labelFromKey(s)
    }));

    const languageOptions = Object.keys(languageMap).map(code => ({
      code,
      label: this._labelFromKey(code)
    }));

    const ratingOptions = [
      { value: 4.5, label: '4.5+ stars' },
      { value: 4.0, label: '4.0+ stars' },
      { value: 3.0, label: '3.0+ stars' }
    ];

    const sortOptions = [
      { key: 'rating', label: 'Rating: High to Low', defaultDirection: 'desc' },
      { key: 'experience', label: 'Experience', defaultDirection: 'desc' }
    ];

    return {
      specializationOptions,
      languageOptions,
      ratingOptions,
      sortOptions
    };
  }

  searchMatchmakers(specializations, languages, minRating, sortBy, sortDirection) {
    let matchmakers = this._getFromStorage('matchmakers', []).filter(m => m.is_active);

    const specs = Array.isArray(specializations) ? specializations : [];
    const langs = Array.isArray(languages) ? languages : [];

    matchmakers = matchmakers.filter(m => {
      if (typeof minRating === 'number' && m.rating < minRating) return false;

      if (specs.length > 0) {
        const mspecs = Array.isArray(m.specializations) ? m.specializations : [];
        const hasSpec = specs.some(s => mspecs.includes(s));
        if (!hasSpec) return false;
      }

      if (langs.length > 0) {
        const ml = Array.isArray(m.languages) ? m.languages : [];
        const hasLang = langs.some(l => ml.includes(l));
        if (!hasLang) return false;
      }

      return true;
    });

    const effectiveSortBy = sortBy || 'rating';
    const dir = sortDirection || 'desc';

    matchmakers.sort((a, b) => {
      if (effectiveSortBy === 'rating') {
        return this._compareValues(a.rating, b.rating, dir);
      }
      // experience is not modeled; fall back to rating
      return this._compareValues(a.rating, b.rating, dir);
    });

    return matchmakers.map(m => ({
      matchmakerId: m.id,
      name: m.name,
      bioSnippet: m.bio ? m.bio.slice(0, 140) + (m.bio.length > 140 ? '...' : '') : '',
      photoUrl: m.photo_url || '',
      specializations: Array.isArray(m.specializations) ? m.specializations : [],
      languages: Array.isArray(m.languages) ? m.languages : [],
      rating: m.rating,
      ratingCount: m.rating_count || 0
    }));
  }

  getMatchmakerDetails(matchmakerId) {
    const matchmakers = this._getFromStorage('matchmakers', []);
    const lists = this._getFromStorage('matchmaker_favorite_lists', []);
    const items = this._getFromStorage('matchmaker_favorite_items', []);

    const m = matchmakers.find(mm => mm.id === matchmakerId) || null;

    const isFavorited = items.some(i => i.matchmaker_id === matchmakerId);

    const relevantItems = items.filter(i => i.matchmaker_id === matchmakerId);

    const favoriteLists = relevantItems.map(i => {
      const list = lists.find(l => l.id === i.list_id) || null;
      return {
        listId: i.list_id,
        name: list ? list.name : '',
        // Foreign key resolution
        list: list
      };
    });

    const matchmakerObj = m
      ? {
          id: m.id,
          name: m.name,
          bio: m.bio || '',
          photoUrl: m.photo_url || '',
          specializations: Array.isArray(m.specializations) ? m.specializations : [],
          languages: Array.isArray(m.languages) ? m.languages : [],
          rating: m.rating,
          ratingCount: m.rating_count || 0
        }
      : null;

    return {
      matchmaker: matchmakerObj,
      isFavorited,
      favoriteLists
    };
  }

  getMatchmakerFavoriteLists() {
    const lists = this._getFromStorage('matchmaker_favorite_lists', []);
    const items = this._getFromStorage('matchmaker_favorite_items', []);

    return lists.map(l => {
      const itemCount = items.filter(i => i.list_id === l.id).length;
      return {
        listId: l.id,
        name: l.name,
        createdAt: l.created_at,
        itemCount
      };
    });
  }

  createMatchmakerFavoriteList(name) {
    const lists = this._getFromStorage('matchmaker_favorite_lists', []);
    const now = this._nowIso();

    const list = {
      id: this._generateId('mm_list'),
      name,
      created_at: now
    };

    lists.push(list);
    this._saveToStorage('matchmaker_favorite_lists', lists);

    return {
      success: true,
      listId: list.id,
      name: list.name,
      createdAt: list.created_at
    };
  }

  addMatchmakerToFavoriteList(listId, matchmakerId) {
    const lists = this._getFromStorage('matchmaker_favorite_lists', []);
    const matchmakers = this._getFromStorage('matchmakers', []);
    const items = this._getFromStorage('matchmaker_favorite_items', []);

    const list = lists.find(l => l.id === listId);
    if (!list) {
      return {
        success: false,
        message: 'Favorite list not found.'
      };
    }

    const matchmaker = matchmakers.find(m => m.id === matchmakerId);
    if (!matchmaker) {
      return {
        success: false,
        message: 'Matchmaker not found.'
      };
    }

    const existing = items.find(i => i.list_id === listId && i.matchmaker_id === matchmakerId);
    if (existing) {
      return {
        success: true,
        message: 'Matchmaker already in list.'
      };
    }

    const now = this._nowIso();
    const item = {
      id: this._generateId('mm_item'),
      list_id: listId,
      matchmaker_id: matchmakerId,
      added_at: now,
      sort_order: items.length + 1
    };

    items.push(item);
    this._saveToStorage('matchmaker_favorite_items', items);

    return {
      success: true,
      message: 'Matchmaker added to list.'
    };
  }

  getMatchmakersInFavoriteList(listId) {
    const items = this._getFromStorage('matchmaker_favorite_items', []);
    const matchmakers = this._getFromStorage('matchmakers', []);

    const filteredItems = items.filter(i => i.list_id === listId);

    return filteredItems.map(i => {
      const m = matchmakers.find(mm => mm.id === i.matchmaker_id) || null;
      return {
        matchmakerId: i.matchmaker_id,
        name: m ? m.name : '',
        photoUrl: m ? m.photo_url || '' : '',
        rating: m ? m.rating : null,
        ratingCount: m ? m.rating_count || 0 : 0,
        // Foreign key resolution
        matchmaker: m
      };
    });
  }

  // ----------------------------------------------------------
  // Notification settings
  // ----------------------------------------------------------

  getNotificationSettings() {
    const entity = this._loadNotificationSettings();

    return {
      matchSuggestionsFrequency: entity.match_suggestions_frequency,
      matchSuggestionsPerPeriod: entity.match_suggestions_per_period,
      matchSuggestionsEmailEnabled: !!entity.match_suggestions_email_enabled,
      matchSuggestionsSmsEnabled: !!entity.match_suggestions_sms_enabled,
      coachingReminderTiming: entity.coaching_reminder_timing,
      coachingRemindersEmailEnabled: !!entity.coaching_reminders_email_enabled,
      coachingRemindersSmsEnabled: !!entity.coaching_reminders_sms_enabled
    };
  }

  updateNotificationSettings(settings) {
    const entity = this._loadNotificationSettings();

    if (settings.matchSuggestionsFrequency != null) {
      entity.match_suggestions_frequency = settings.matchSuggestionsFrequency;
    }
    if (typeof settings.matchSuggestionsPerPeriod === 'number') {
      entity.match_suggestions_per_period = settings.matchSuggestionsPerPeriod;
    }
    if (typeof settings.matchSuggestionsEmailEnabled === 'boolean') {
      entity.match_suggestions_email_enabled = settings.matchSuggestionsEmailEnabled;
    }
    if (typeof settings.matchSuggestionsSmsEnabled === 'boolean') {
      entity.match_suggestions_sms_enabled = settings.matchSuggestionsSmsEnabled;
    }
    if (settings.coachingReminderTiming != null) {
      entity.coaching_reminder_timing = settings.coachingReminderTiming;
    }
    if (typeof settings.coachingRemindersEmailEnabled === 'boolean') {
      entity.coaching_reminders_email_enabled = settings.coachingRemindersEmailEnabled;
    }
    if (typeof settings.coachingRemindersSmsEnabled === 'boolean') {
      entity.coaching_reminders_sms_enabled = settings.coachingRemindersSmsEnabled;
    }

    this._saveNotificationSettings(entity);

    return {
      success: true,
      updatedAt: entity.updated_at,
      message: 'Notification settings updated.'
    };
  }

  // ----------------------------------------------------------
  // Gift cards
  // ----------------------------------------------------------

  getGiftCardTypes() {
    const types = this._getFromStorage('gift_card_types', []);

    return types.map(t => ({
      giftCardTypeId: t.id,
      name: t.name,
      category: t.category,
      description: t.description || '',
      allowedAmounts: Array.isArray(t.allowed_amounts) ? t.allowed_amounts : [],
      isActive: !!t.is_active
    }));
  }

  addGiftCardToCart(
    giftCardTypeId,
    amount,
    recipientName,
    recipientEmail,
    message,
    deliveryTiming,
    deliveryDatetime
  ) {
    const types = this._getFromStorage('gift_card_types', []);
    const type = types.find(t => t.id === giftCardTypeId && t.is_active);

    if (!type) {
      return {
        success: false,
        cartId: null,
        cartItemId: null,
        message: 'Gift card type not found or inactive.'
      };
    }

    if (typeof amount !== 'number' || amount <= 0) {
      return {
        success: false,
        cartId: null,
        cartItemId: null,
        message: 'Invalid gift card amount.'
      };
    }

    if (!deliveryTiming) {
      return {
        success: false,
        cartId: null,
        cartItemId: null,
        message: 'Delivery timing is required.'
      };
    }

    if (deliveryTiming === 'scheduled' && !deliveryDatetime) {
      return {
        success: false,
        cartId: null,
        cartItemId: null,
        message: 'deliveryDatetime is required for scheduled delivery.'
      };
    }

    const cart = this._getOrCreateCart();
    const { cartItem } = this._addItemToCart(cart, {
      itemType: 'gift_card',
      name: type.name,
      quantity: 1,
      unitPrice: amount,
      currency: 'usd',
      giftCardTypeId: type.id,
      giftAmount: amount,
      recipientName,
      recipientEmail,
      giftMessage: message || '',
      deliveryTiming,
      deliveryDatetime: deliveryDatetime || null
    });

    return {
      success: true,
      cartId: cart.id,
      cartItemId: cartItem.id,
      message: 'Gift card added to cart.'
    };
  }

  // ----------------------------------------------------------
  // Cart details & modifications
  // ----------------------------------------------------------

  getCartDetails() {
    const cart = this._getFromStorage('cart', null);
    const items = this._getFromStorage('cart_items', []);

    if (!cart) {
      return {
        cartId: null,
        status: 'open',
        items: [],
        subtotal: 0,
        currency: 'usd'
      };
    }

    const matchmakingPlans = this._getFromStorage('matchmaking_plans', []);
    const bundles = this._getFromStorage('coaching_bundles', []);
    const events = this._getFromStorage('events', []);
    const giftCardTypes = this._getFromStorage('gift_card_types', []);
    const bookings = this._getFromStorage('coaching_session_bookings', []);

    const cartItems = items.filter(i => i.cart_id === cart.id);

    let subtotal = 0;
    const currency = 'usd';

    const detailedItems = cartItems.map(i => {
      subtotal += i.total_price || 0;

      let details = {};

      let matchmakingPlan = null;
      let coachingBundle = null;
      let event = null;
      let giftCardType = null;
      let coachingSessionBooking = null;

      if (i.matchmaking_plan_id) {
        matchmakingPlan = matchmakingPlans.find(p => p.id === i.matchmaking_plan_id) || null;
        if (matchmakingPlan) {
          details.planDurationMonths = matchmakingPlan.duration_months;
          details.planIntroductionsPerMonth = matchmakingPlan.introductions_per_month;
        }
      }

      if (i.coaching_bundle_id) {
        coachingBundle = bundles.find(b => b.id === i.coaching_bundle_id) || null;
        if (coachingBundle) {
          details.bundleSessions = coachingBundle.number_of_sessions;
          details.bundleSessionLengthMinutes = coachingBundle.session_length_minutes;
        }
      }

      if (i.event_id) {
        event = events.find(e => e.id === i.event_id) || null;
        if (event) {
          details.eventStartDatetime = event.start_datetime;
          details.eventType = event.event_type;
        }
      } else if (i.event_start_datetime || i.event_type) {
        details.eventStartDatetime = i.event_start_datetime || null;
        details.eventType = i.event_type || null;
      }

      if (i.gift_card_type_id) {
        giftCardType = giftCardTypes.find(g => g.id === i.gift_card_type_id) || null;
      }

      if (i.coaching_session_booking_id) {
        coachingSessionBooking =
          bookings.find(b => b.id === i.coaching_session_booking_id) || null;
      }

      if (typeof i.gift_amount === 'number') {
        details.giftAmount = i.gift_amount;
        details.recipientName = i.recipient_name || '';
      }

      return {
        cartItemId: i.id,
        itemType: i.item_type,
        name: i.name,
        quantity: i.quantity,
        unitPrice: i.unit_price,
        totalPrice: i.total_price,
        currency: i.currency || currency,
        details,
        // Foreign key resolution
        matchmakingPlan,
        coachingBundle,
        event,
        giftCardType,
        coachingSessionBooking
      };
    });

    return {
      cartId: cart.id,
      status: cart.status,
      items: detailedItems,
      subtotal,
      currency
    };
  }

  updateCartItemQuantity(cartItemId, quantity) {
    if (typeof quantity !== 'number' || quantity <= 0) {
      return {
        success: false,
        cartId: null,
        message: 'Quantity must be a positive number.'
      };
    }

    const cart = this._getFromStorage('cart', null);
    if (!cart) {
      return {
        success: false,
        cartId: null,
        message: 'Cart not found.'
      };
    }

    const items = this._getFromStorage('cart_items', []);
    const index = items.findIndex(i => i.id === cartItemId && i.cart_id === cart.id);

    if (index === -1) {
      return {
        success: false,
        cartId: cart.id,
        message: 'Cart item not found.'
      };
    }

    items[index].quantity = quantity;
    items[index].total_price = (items[index].unit_price || 0) * quantity;

    this._saveToStorage('cart_items', items);
    this._recalculateCartTotals(cart, items);

    return {
      success: true,
      cartId: cart.id,
      message: 'Cart item quantity updated.'
    };
  }

  removeCartItem(cartItemId) {
    const cart = this._getFromStorage('cart', null);
    if (!cart) {
      return {
        success: false,
        cartId: null,
        message: 'Cart not found.'
      };
    }

    let items = this._getFromStorage('cart_items', []);
    const beforeCount = items.length;
    items = items.filter(i => i.id !== cartItemId || i.cart_id !== cart.id);

    this._saveToStorage('cart_items', items);

    if (Array.isArray(cart.item_ids)) {
      cart.item_ids = cart.item_ids.filter(id => id !== cartItemId);
      this._saveToStorage('cart', cart);
    }

    this._recalculateCartTotals(cart, items);

    const removed = beforeCount !== items.length;

    return {
      success: removed,
      cartId: cart.id,
      message: removed ? 'Cart item removed.' : 'Cart item not found.'
    };
  }

  // ----------------------------------------------------------
  // Info & Support content
  // ----------------------------------------------------------

  getInfoSupportContent() {
    return {
      aboutSections: [
        {
          title: 'About Our Service',
          body:
            'We are a local matchmaking and date coaching service focused on thoughtful, human introductions and practical support. Our team combines technology with real matchmakers in your area.'
        },
        {
          title: 'How We Work',
          body:
            'We start with a detailed profile, then pair you with matchmakers and coaches who understand your goals. Together, you will design a plan that can include curated matches, coaching sessions, and events.'
        }
      ],
      faqItems: [
        {
          question: 'Is this an app or a traditional matchmaking service?',
          answer:
            'It is a hybrid. You control your profile and preferences online, while real matchmakers and coaches handle introductions and support behind the scenes.'
        },
        {
          question: 'Do you work only in specific cities?',
          answer:
            'We focus on local matchmaking. Availability of matchmakers, coaches, and events varies by city, and we are expanding over time.'
        },
        {
          question: 'Can I use coaching without matchmaking?',
          answer:
            'Yes. You can enable coaching, matchmaking, or both in your profile settings.'
        }
      ],
      contact: {
        email: 'support@example.com',
        phone: '+1 (555) 123-4567',
        supportHours: 'Mon–Fri, 9am–6pm local time'
      },
      policies: [
        {
          key: 'terms_of_service',
          title: 'Terms of Service',
          summary: 'The rules and guidelines for using our matchmaking, coaching, and events.'
        },
        {
          key: 'privacy_policy',
          title: 'Privacy Policy',
          summary: 'How we collect, use, and protect your personal information.'
        }
      ]
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
