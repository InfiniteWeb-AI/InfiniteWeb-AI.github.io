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

  // ---------------------- Storage Helpers ----------------------

  _initStorage() {
    const tableKeys = [
      'events',
      'event_packages',
      'event_registrations',
      'ride_plans',
      'ride_plan_items',
      'product_categories',
      'products',
      'cart',
      'cart_items',
      'chapters',
      'chapter_contact_messages',
      'membership_types',
      'membership_applications',
      'news_articles',
      'article_comments',
      'donation_funds',
      'donations',
      'safety_guides',
      'courses',
      'course_enrollments',
      'contact_messages'
    ];

    for (const key of tableKeys) {
      if (!localStorage.getItem(key)) {
        if (key === 'cart') {
          localStorage.setItem(key, 'null');
        } else {
          localStorage.setItem(key, JSON.stringify([]));
        }
      }
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, defaultValue) {
    const raw = localStorage.getItem(key);
    if (raw === null || raw === undefined) {
      return defaultValue !== undefined ? defaultValue : [];
    }
    try {
      return JSON.parse(raw);
    } catch (e) {
      // If corrupted, reset to default
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

  _nowIso() {
    return new Date().toISOString();
  }

  _parseDate(value) {
    if (!value) return null;
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }

  _formatDate(date) {
    const d = (date instanceof Date) ? date : this._parseDate(date);
    if (!d) return '';
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  _formatDateRange(start, end) {
    const s = this._parseDate(start);
    const e = this._parseDate(end);
    if (!s && !e) return '';
    if (s && !e) return this._formatDate(s);
    if (!s && e) return this._formatDate(e);
    const sStr = this._formatDate(s);
    const eStr = this._formatDate(e);
    return sStr === eStr ? sStr : `${sStr} - ${eStr}`;
  }

  _normalizeSize(size) {
    if (!size) return undefined;
    const s = String(size).trim().toLowerCase();
    const map = {
      'xs': 'xs',
      'extra small': 'xs',
      'x-small': 'xs',
      'small': 'small',
      's': 'small',
      'medium': 'medium',
      'm': 'medium',
      'large': 'large',
      'l': 'large',
      'x-large': 'xl',
      'xl': 'xl',
      'xxl': 'xxl',
      'xx-large': 'xxl'
    };
    return map[s] || s;
  }

  _getEventTypeLabel(code) {
    const map = {
      'charity_ride': 'Charity Ride',
      'training': 'Training',
      'social': 'Social',
      'memorial_ride': 'Memorial Ride',
      'fundraiser': 'Fundraiser',
      'community_outreach': 'Community Outreach'
    };
    return map[code] || code || '';
  }

  _getCourseFormatLabel(code) {
    const map = {
      'online': 'Online',
      'in_person': 'In Person',
      'hybrid': 'Hybrid'
    };
    return map[code] || '';
  }

  // ---------------------- Cart Helpers ----------------------

  _getActiveCart() {
    const cart = this._getFromStorage('cart', null);
    if (cart && cart.status === 'active') {
      return cart;
    }
    return null;
  }

  _getOrCreateCart() {
    let cart = this._getActiveCart();
    if (!cart) {
      cart = {
        id: this._generateId('cart'),
        status: 'active',
        created_at: this._nowIso(),
        updated_at: this._nowIso()
      };
      this._saveToStorage('cart', cart);
    }
    return cart;
  }

  // ---------------------- Ride Plan Helpers ----------------------

  _getOrCreateRidePlan() {
    const ridePlans = this._getFromStorage('ride_plans', []);
    if (ridePlans.length > 0) {
      return ridePlans[0];
    }
    const ridePlan = {
      id: this._generateId('rideplan'),
      name: 'My Ride Plan',
      created_at: this._nowIso(),
      updated_at: this._nowIso()
    };
    ridePlans.push(ridePlan);
    this._saveToStorage('ride_plans', ridePlans);
    return ridePlan;
  }

  // ---------------------- Geo / Events Helpers ----------------------

  _geocodeLocationText(locationText) {
    if (!locationText) return null;
    // Attempt to read from a geocoded_locations table if present
    const locations = this._getFromStorage('geocoded_locations', []);
    const match = locations.find(l =>
      typeof l.text === 'string' && l.text.toLowerCase() === String(locationText).toLowerCase()
    );
    if (match && typeof match.latitude === 'number' && typeof match.longitude === 'number') {
      return { latitude: match.latitude, longitude: match.longitude };
    }
    return null;
  }

  _calculateEventDistance(locationText, event) {
    // Returns distance in miles or null if not computable
    const searchLoc = this._geocodeLocationText(locationText);
    if (!searchLoc || typeof event.latitude !== 'number' || typeof event.longitude !== 'number') {
      return null;
    }
    const toRad = d => (d * Math.PI) / 180;
    const R = 3958.8; // miles
    const dLat = toRad(event.latitude - searchLoc.latitude);
    const dLon = toRad(event.longitude - searchLoc.longitude);
    const lat1 = toRad(searchLoc.latitude);
    const lat2 = toRad(event.latitude);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c;
    return d;
  }

  _filterAndSortEvents(events, locationText, radiusMiles, eventTypes, startDateFrom, startDateTo, onlyRegistrationOpen, sortBy) {
    let filtered = Array.isArray(events) ? events.slice() : [];
    const startFromDate = startDateFrom ? new Date(startDateFrom) : null;
    const startToDate = startDateTo ? new Date(startDateTo) : null;

    if (Array.isArray(eventTypes) && eventTypes.length > 0) {
      const set = new Set(eventTypes);
      filtered = filtered.filter(e => set.has(e.event_type));
    }

    if (startFromDate) {
      filtered = filtered.filter(e => {
        const d = this._parseDate(e.start_datetime);
        return d && d >= startFromDate;
      });
    }

    if (startToDate) {
      filtered = filtered.filter(e => {
        const d = this._parseDate(e.start_datetime);
        return d && d <= startToDate;
      });
    }

    if (onlyRegistrationOpen === undefined || onlyRegistrationOpen === true) {
      filtered = filtered.filter(e => e.registration_open === true);
    }

    const distances = {};
    if (locationText) {
      for (const e of filtered) {
        distances[e.id] = this._calculateEventDistance(locationText, e);
      }

      if (typeof radiusMiles === 'number' && !isNaN(radiusMiles) && radiusMiles > 0) {
        filtered = filtered.filter(e => {
          const d = distances[e.id];
          if (d == null) return true; // if distance unknown, do not exclude
          return d <= radiusMiles;
        });
      }
    }

    const sortKey = sortBy || 'date_soonest';
    filtered.sort((a, b) => {
      if (sortKey === 'date_latest') {
        const ad = this._parseDate(a.start_datetime) || new Date(0);
        const bd = this._parseDate(b.start_datetime) || new Date(0);
        return bd - ad;
      }
      if (sortKey === 'distance_closest' && locationText) {
        const da = distances[a.id];
        const db = distances[b.id];
        if (da == null && db == null) {
          const ad = this._parseDate(a.start_datetime) || new Date(0);
          const bd = this._parseDate(b.start_datetime) || new Date(0);
          return ad - bd;
        }
        if (da == null) return 1;
        if (db == null) return -1;
        if (da !== db) return da - db;
        const ad = this._parseDate(a.start_datetime) || new Date(0);
        const bd = this._parseDate(b.start_datetime) || new Date(0);
        return ad - bd;
      }
      // default date_soonest
      const ad = this._parseDate(a.start_datetime) || new Date(0);
      const bd = this._parseDate(b.start_datetime) || new Date(0);
      return ad - bd;
    });

    return { events: filtered, distances };
  }

  // ---------------------- Donation Helpers ----------------------

  _validateDonationAmount(amount, fundCode) {
    const errors = [];
    if (typeof amount !== 'number' || isNaN(amount)) {
      errors.push('amount_invalid');
    } else {
      const opts = this.getDonationOptions();
      const min = typeof opts.min_amount === 'number' ? opts.min_amount : 1;
      const max = typeof opts.max_amount === 'number' ? opts.max_amount : 100000;
      if (amount < min) errors.push('amount_below_min');
      if (amount > max) errors.push('amount_above_max');
    }

    const funds = this._getFromStorage('donation_funds', []);
    const fund = funds.find(f => f.code === fundCode && f.is_active !== false);
    if (!fund) {
      errors.push('fund_not_found');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  _maskAndTokenizeCard(cardNumber, cardExpiration) {
    const num = (cardNumber || '').replace(/\s|-/g, '');
    const last4 = num.slice(-4);
    let brand = 'unknown';
    if (/^4[0-9]{6,}$/.test(num)) brand = 'visa';
    else if (/^5[1-5][0-9]{5,}$/.test(num)) brand = 'mastercard';
    else if (/^3[47][0-9]{5,}$/.test(num)) brand = 'amex';

    const token = this._generateId('cardtok');
    return {
      last4,
      brand,
      token,
      expiration: cardExpiration || ''
    };
  }

  // ---------------------- Core Interfaces ----------------------

  // getHomeContent()
  getHomeContent() {
    const events = this._getFromStorage('events', []);
    const news = this._getFromStorage('news_articles', []);
    const chapters = this._getFromStorage('chapters', []);
    const courses = this._getFromStorage('courses', []);
    const funds = this._getFromStorage('donation_funds', []);

    const now = new Date();
    const upcoming = events
      .filter(e => {
        const d = this._parseDate(e.start_datetime);
        return d && d >= now && e.registration_open === true;
      })
      .sort((a, b) => {
        const ad = this._parseDate(a.start_datetime) || new Date(0);
        const bd = this._parseDate(b.start_datetime) || new Date(0);
        return ad - bd;
      });

    const nextEvent = upcoming[0] || null;

    let next_upcoming_event = null;
    if (nextEvent) {
      next_upcoming_event = {
        event: nextEvent,
        event_type_label: this._getEventTypeLabel(nextEvent.event_type),
        distance_miles: null,
        is_featured: !!nextEvent.is_featured
      };
    }

    const featured_news = news
      .filter(a => a.is_published)
      .sort((a, b) => {
        const ad = this._parseDate(a.publish_datetime) || new Date(0);
        const bd = this._parseDate(b.publish_datetime) || new Date(0);
        return bd - ad;
      })
      .slice(0, 3);

    const upcoming_events_count = upcoming.length;
    const active_chapters_count = chapters.filter(c => c.is_active !== false).length;
    const active_courses_count = courses.filter(c => c.is_active !== false).length;

    const key_causes = funds
      .filter(f => f.is_active !== false)
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
      .map((f, idx) => ({
        code: f.code,
        name: f.name,
        description: f.description || '',
        related_fund_code: f.code,
        is_primary: idx === 0
      }));

    return {
      mission_summary: '',
      key_causes,
      next_upcoming_event,
      featured_news,
      highlight_counts: {
        upcoming_events_count,
        active_chapters_count,
        active_courses_count
      },
      has_chapter_locator_shortcut: active_chapters_count > 0,
      has_quick_donate_shortcut: key_causes.length > 0
    };
  }

  // getEventFilterOptions()
  getEventFilterOptions() {
    const distance_options = [
      { value_miles: 25, label: 'Within 25 miles' },
      { value_miles: 50, label: 'Within 50 miles' },
      { value_miles: 100, label: 'Within 100 miles' },
      { value_miles: 250, label: 'Within 250 miles' }
    ];

    const event_type_options = [
      { value: 'charity_ride', label: 'Charity Rides' },
      { value: 'training', label: 'Training' },
      { value: 'social', label: 'Social' },
      { value: 'memorial_ride', label: 'Memorial Rides' },
      { value: 'fundraiser', label: 'Fundraisers' },
      { value: 'community_outreach', label: 'Community Outreach' }
    ];

    const sort_options = [
      { value: 'date_soonest', label: 'Date (Soonest First)' },
      { value: 'date_latest', label: 'Date (Latest First)' },
      { value: 'distance_closest', label: 'Distance (Closest)' }
    ];

    return { distance_options, event_type_options, sort_options };
  }

  // searchEvents(locationText, radiusMiles, eventTypes, startDateFrom, startDateTo, onlyRegistrationOpen, sortBy)
  searchEvents(locationText, radiusMiles, eventTypes, startDateFrom, startDateTo, onlyRegistrationOpen, sortBy) {
    const events = this._getFromStorage('events', []);
    const { events: filtered, distances } = this._filterAndSortEvents(
      events,
      locationText,
      radiusMiles,
      eventTypes,
      startDateFrom,
      startDateTo,
      onlyRegistrationOpen,
      sortBy
    );

    const ridePlanItems = this._getFromStorage('ride_plan_items', []);
    const ridePlan = this._getFromStorage('ride_plans', [])[0];
    const inRidePlanSet = new Set(
      ridePlan && ridePlanItems
        ? ridePlanItems.filter(i => i.ride_plan_id === ridePlan.id).map(i => i.event_id)
        : []
    );

    const results = filtered.map(e => ({
      event: e,
      event_type_label: this._getEventTypeLabel(e.event_type),
      distance_miles: distances[e.id] != null ? distances[e.id] : null,
      display_date: this._formatDateRange(e.start_datetime, e.end_datetime),
      display_location: e.location_name || `${e.city || ''}${e.city && e.state ? ', ' : ''}${e.state || ''}`,
      is_in_ride_plan: inRidePlanSet.has(e.id)
    }));

    return {
      results,
      total_count: results.length,
      applied_filters: {
        location_text: locationText || '',
        radius_miles: radiusMiles || null,
        event_types: Array.isArray(eventTypes) ? eventTypes : [],
        sort_by: sortBy || 'date_soonest'
      }
    };
  }

  // getEventDetails(eventId, fromLocationText)
  getEventDetails(eventId, fromLocationText) {
    const events = this._getFromStorage('events', []);
    const event = events.find(e => e.id === eventId) || null;
    if (!event) {
      return {
        event: null,
        event_type_label: '',
        display_date_range: '',
        display_location: '',
        distance_miles: null,
        tags_display: [],
        location_map: { latitude: null, longitude: null },
        packages: [],
        registration_open: false
      };
    }

    const allPackages = this._getFromStorage('event_packages', []);
    const packagesForEvent = allPackages.filter(p => p.event_id === event.id);

    let minPrice = Infinity;
    let maxPrice = -Infinity;
    for (const p of packagesForEvent) {
      if (typeof p.price === 'number') {
        if (p.price < minPrice) minPrice = p.price;
        if (p.price > maxPrice) maxPrice = p.price;
      }
    }

    const packages = packagesForEvent
      .slice()
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0) || (a.price || 0) - (b.price || 0))
      .map(p => {
        const isCheapest = p.price === minPrice;
        const isMostExpensive = p.price === maxPrice;
        const isMidTier = p.price > minPrice && p.price < maxPrice;
        return {
          package: Object.assign({}, p, {
            is_cheapest: isCheapest,
            is_most_expensive: isMostExpensive
          }),
          price_display: typeof p.price === 'number' ? `$${p.price.toFixed(2)}` : '',
          is_cheapest: isCheapest,
          is_most_expensive: isMostExpensive,
          is_mid_tier: isMidTier
        };
      });

    const distance_miles = fromLocationText ? this._calculateEventDistance(fromLocationText, event) : null;

    return {
      event,
      event_type_label: this._getEventTypeLabel(event.event_type),
      display_date_range: this._formatDateRange(event.start_datetime, event.end_datetime),
      display_location: event.location_name || `${event.city || ''}${event.city && event.state ? ', ' : ''}${event.state || ''}`,
      distance_miles,
      tags_display: Array.isArray(event.tags) ? event.tags : [],
      location_map: {
        latitude: typeof event.latitude === 'number' ? event.latitude : null,
        longitude: typeof event.longitude === 'number' ? event.longitude : null
      },
      packages,
      registration_open: event.registration_open === true
    };
  }

  // registerForEvent(eventId, eventPackageId, registrantName, phone, email, tshirtSize)
  registerForEvent(eventId, eventPackageId, registrantName, phone, email, tshirtSize) {
    const events = this._getFromStorage('events', []);
    const event = events.find(e => e.id === eventId);
    if (!event) {
      return { success: false, registration: null, confirmation_message: 'event_not_found' };
    }
    if (event.registration_open !== true) {
      return { success: false, registration: null, confirmation_message: 'registration_closed' };
    }

    const packages = this._getFromStorage('event_packages', []);
    const pkg = packages.find(p => p.id === eventPackageId && p.event_id === eventId);
    if (!pkg) {
      return { success: false, registration: null, confirmation_message: 'package_not_found' };
    }
    if (typeof pkg.remaining_slots === 'number' && pkg.remaining_slots <= 0) {
      return { success: false, registration: null, confirmation_message: 'package_sold_out' };
    }

    const normalizedSize = this._normalizeSize(tshirtSize);

    const registrations = this._getFromStorage('event_registrations', []);
    const registration = {
      id: this._generateId('eventreg'),
      event_id: eventId,
      event_package_id: eventPackageId,
      registrant_name: registrantName,
      phone: phone || '',
      email: email || '',
      t_shirt_size: normalizedSize,
      registration_datetime: this._nowIso(),
      status: 'confirmed',
      notes: ''
    };
    registrations.push(registration);
    this._saveToStorage('event_registrations', registrations);

    if (typeof pkg.remaining_slots === 'number') {
      pkg.remaining_slots = Math.max(0, pkg.remaining_slots - 1);
      this._saveToStorage('event_packages', packages);
    }

    return {
      success: true,
      registration,
      confirmation_message: 'registration_confirmed'
    };
  }

  // addEventToRidePlan(eventId)
  addEventToRidePlan(eventId) {
    const events = this._getFromStorage('events', []);
    const event = events.find(e => e.id === eventId);
    if (!event) {
      return { success: false, ride_plan: null, items: [], message: 'event_not_found' };
    }

    const ridePlan = this._getOrCreateRidePlan();
    let items = this._getFromStorage('ride_plan_items', []);

    const existing = items.find(i => i.ride_plan_id === ridePlan.id && i.event_id === eventId);
    if (!existing) {
      const item = {
        id: this._generateId('rideplanitem'),
        ride_plan_id: ridePlan.id,
        event_id: eventId,
        added_at: this._nowIso(),
        notes: ''
      };
      items.push(item);
      this._saveToStorage('ride_plan_items', items);

      const ridePlans = this._getFromStorage('ride_plans', []);
      const idx = ridePlans.findIndex(rp => rp.id === ridePlan.id);
      if (idx >= 0) {
        ridePlans[idx].updated_at = this._nowIso();
        this._saveToStorage('ride_plans', ridePlans);
      }
    }

    // Rebuild items with event resolution
    items = this._getFromStorage('ride_plan_items', []);
    const planItems = items
      .filter(i => i.ride_plan_id === ridePlan.id)
      .map(i => {
        const ev = events.find(e => e.id === i.event_id) || null;
        return {
          item: i,
          event: ev,
          display_date: ev ? this._formatDateRange(ev.start_datetime, ev.end_datetime) : '',
          display_location: ev
            ? (ev.location_name || `${ev.city || ''}${ev.city && ev.state ? ', ' : ''}${ev.state || ''}`)
            : '',
          event_type_label: ev ? this._getEventTypeLabel(ev.event_type) : ''
        };
      });

    return {
      success: true,
      ride_plan: ridePlan,
      items: planItems,
      message: 'event_added_to_ride_plan'
    };
  }

  // removeEventFromRidePlan(eventId)
  removeEventFromRidePlan(eventId) {
    const ridePlans = this._getFromStorage('ride_plans', []);
    const ridePlan = ridePlans[0] || null;
    if (!ridePlan) {
      return { success: false, ride_plan: null, items: [], message: 'ride_plan_not_found' };
    }

    let items = this._getFromStorage('ride_plan_items', []);
    const beforeLen = items.length;
    items = items.filter(i => !(i.ride_plan_id === ridePlan.id && i.event_id === eventId));
    this._saveToStorage('ride_plan_items', items);

    if (beforeLen !== items.length) {
      const idx = ridePlans.findIndex(rp => rp.id === ridePlan.id);
      if (idx >= 0) {
        ridePlans[idx].updated_at = this._nowIso();
        this._saveToStorage('ride_plans', ridePlans);
      }
    }

    const events = this._getFromStorage('events', []);
    const planItems = items
      .filter(i => i.ride_plan_id === ridePlan.id)
      .map(i => {
        const ev = events.find(e => e.id === i.event_id) || null;
        return {
          item: i,
          event: ev
        };
      });

    return {
      success: true,
      ride_plan: ridePlan,
      items: planItems,
      message: 'event_removed_from_ride_plan'
    };
  }

  // getRidePlan()
  getRidePlan() {
    const ridePlans = this._getFromStorage('ride_plans', []);
    const ridePlan = ridePlans[0] || null;
    if (!ridePlan) {
      return { ride_plan: null, items: [] };
    }
    const items = this._getFromStorage('ride_plan_items', []);
    const events = this._getFromStorage('events', []);

    const planItems = items
      .filter(i => i.ride_plan_id === ridePlan.id)
      .map(i => {
        const ev = events.find(e => e.id === i.event_id) || null;
        return {
          item: i,
          event: ev,
          display_date: ev ? this._formatDateRange(ev.start_datetime, ev.end_datetime) : '',
          display_location: ev
            ? (ev.location_name || `${ev.city || ''}${ev.city && ev.state ? ', ' : ''}${ev.state || ''}`)
            : '',
          event_type_label: ev ? this._getEventTypeLabel(ev.event_type) : ''
        };
      });

    return {
      ride_plan: ridePlan,
      items: planItems
    };
  }

  // getStoreCategories()
  getStoreCategories() {
    const cats = this._getFromStorage('product_categories', []);
    return cats
      .filter(c => c.is_active !== false)
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  }

  // getProductFilterOptions(categoryCode, subcategory)
  getProductFilterOptions(categoryCode, subcategory) {
    const products = this._getFromStorage('products', []);
    let filtered = products.filter(p => p.is_active !== false);
    if (categoryCode && categoryCode !== 'all') {
      filtered = filtered.filter(p => p.category_code === categoryCode);
    }
    if (subcategory) {
      filtered = filtered.filter(p => p.subcategory === subcategory);
    }

    let minPrice = Infinity;
    let maxPrice = -Infinity;
    const sizeSet = new Set();
    const ratings = new Set();
    const reviewCounts = new Set();

    for (const p of filtered) {
      if (typeof p.price === 'number') {
        if (p.price < minPrice) minPrice = p.price;
        if (p.price > maxPrice) maxPrice = p.price;
      }
      if (Array.isArray(p.available_sizes)) {
        p.available_sizes.forEach(s => sizeSet.add(s));
      }
      if (typeof p.rating_average === 'number') ratings.add(Math.floor(p.rating_average));
      if (typeof p.rating_count === 'number') reviewCounts.add(p.rating_count);
    }

    const price_ranges = [];
    if (isFinite(minPrice) && isFinite(maxPrice)) {
      price_ranges.push({ label: `Up to $${maxPrice.toFixed(2)}`, min_price: 0, max_price: maxPrice });
    }

    const size_options = Array.from(sizeSet);

    const rating_options = [];
    const ratingThresholds = [4, 3, 2];
    for (const r of ratingThresholds) {
      rating_options.push({ min_rating: r, label: `${r} stars & up` });
    }

    const review_count_options = [];
    const thresholds = [10, 25, 50];
    for (const t of thresholds) {
      review_count_options.push({ min_count: t, label: `${t}+ reviews` });
    }

    const sort_options = [
      { value: 'price_low_to_high', label: 'Price: Low to High' },
      { value: 'price_high_to_low', label: 'Price: High to Low' },
      { value: 'top_rated', label: 'Top Rated' },
      { value: 'newest_first', label: 'Newest First' }
    ];

    return {
      price_ranges,
      size_options,
      rating_options,
      review_count_options,
      sort_options
    };
  }

  // listProducts(categoryCode, subcategory, filters, sortBy, page, pageSize)
  listProducts(categoryCode, subcategory, filters, sortBy, page, pageSize) {
    const products = this._getFromStorage('products', []);
    const categories = this._getFromStorage('product_categories', []);

    let list = products.filter(p => p.is_active !== false);
    if (categoryCode && categoryCode !== 'all') {
      list = list.filter(p => p.category_code === categoryCode);
    }
    if (subcategory) {
      list = list.filter(p => p.subcategory === subcategory);
    }

    const f = filters || {};
    if (typeof f.minPrice === 'number') {
      list = list.filter(p => typeof p.price === 'number' && p.price >= f.minPrice);
    }
    if (typeof f.maxPrice === 'number') {
      list = list.filter(p => typeof p.price === 'number' && p.price <= f.maxPrice);
    }
    if (f.size) {
      const sizeCode = this._normalizeSize(f.size);
      list = list.filter(p => Array.isArray(p.available_sizes) && p.available_sizes.includes(sizeCode));
    }
    if (typeof f.minRating === 'number') {
      list = list.filter(p => typeof p.rating_average === 'number' && p.rating_average >= f.minRating);
    }
    if (typeof f.minRatingCount === 'number') {
      list = list.filter(p => typeof p.rating_count === 'number' && p.rating_count >= f.minRatingCount);
    }

    const sort = sortBy || 'price_low_to_high';
    list.sort((a, b) => {
      if (sort === 'price_high_to_low') {
        return (b.price || 0) - (a.price || 0);
      }
      if (sort === 'top_rated') {
        const ra = a.rating_average || 0;
        const rb = b.rating_average || 0;
        if (rb !== ra) return rb - ra;
        const ca = a.rating_count || 0;
        const cb = b.rating_count || 0;
        return cb - ca;
      }
      if (sort === 'newest_first') {
        const ad = this._parseDate(a.created_at) || new Date(0);
        const bd = this._parseDate(b.created_at) || new Date(0);
        return bd - ad;
      }
      // default price_low_to_high
      return (a.price || 0) - (b.price || 0);
    });

    const total_count = list.length;
    const pg = page || 1;
    const ps = pageSize || 24;
    const startIdx = (pg - 1) * ps;
    const pageItems = list.slice(startIdx, startIdx + ps);

    const items = pageItems.map(p => {
      const cat = categories.find(c => c.code === p.category_code) || null;
      const available_size_labels = Array.isArray(p.available_sizes) ? p.available_sizes.slice() : [];
      const rating_display = typeof p.rating_average === 'number' && typeof p.rating_count === 'number'
        ? `${p.rating_average.toFixed(1)} (${p.rating_count})`
        : '';
      return {
        product: p,
        category_name: cat ? cat.name : '',
        price_display: typeof p.price === 'number' ? `$${p.price.toFixed(2)}` : '',
        available_size_labels,
        rating_display
      };
    });

    return {
      products: items,
      total_count,
      page: pg,
      page_size: ps
    };
  }

  // getProductDetails(productId)
  getProductDetails(productId) {
    const products = this._getFromStorage('products', []);
    const categories = this._getFromStorage('product_categories', []);

    const product = products.find(p => p.id === productId) || null;
    if (!product) {
      return {
        product: null,
        category: null,
        price_display: '',
        available_size_labels: [],
        rating_display: '',
        related_products: []
      };
    }

    const category = categories.find(c => c.code === product.category_code) || null;
    const price_display = typeof product.price === 'number' ? `$${product.price.toFixed(2)}` : '';
    const available_size_labels = Array.isArray(product.available_sizes) ? product.available_sizes.slice() : [];
    const rating_display = typeof product.rating_average === 'number' && typeof product.rating_count === 'number'
      ? `${product.rating_average.toFixed(1)} (${product.rating_count})`
      : '';

    const related_products = products
      .filter(p => p.category_code === product.category_code && p.id !== product.id)
      .slice(0, 4);

    return {
      product,
      category,
      price_display,
      available_size_labels,
      rating_display,
      related_products
    };
  }

  // addToCart(productId, quantity, selectedSize)
  addToCart(productId, quantity, selectedSize) {
    const qty = typeof quantity === 'number' && quantity > 0 ? quantity : 1;
    const products = this._getFromStorage('products', []);
    const product = products.find(p => p.id === productId && p.is_active !== false);
    if (!product) {
      return { success: false, cart: null, items: [], cart_item_count: 0, subtotal: 0, message: 'product_not_found' };
    }

    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items', []);
    const sizeCode = this._normalizeSize(selectedSize);

    let existing = cartItems.find(ci => ci.cart_id === cart.id && ci.product_id === productId && ci.selected_size === sizeCode);
    if (existing) {
      existing.quantity += qty;
    } else {
      existing = {
        id: this._generateId('cartitem'),
        cart_id: cart.id,
        product_id: product.id,
        product_name: product.name,
        unit_price: product.price,
        quantity: qty,
        selected_size: sizeCode,
        added_at: this._nowIso()
      };
      cartItems.push(existing);
    }

    cart.updated_at = this._nowIso();
    this._saveToStorage('cart', cart);
    this._saveToStorage('cart_items', cartItems);

    // Build return with foreign key resolution
    cartItems = this._getFromStorage('cart_items', []);
    const items = cartItems
      .filter(ci => ci.cart_id === cart.id)
      .map(ci => ({
        item: ci,
        product: products.find(p => p.id === ci.product_id) || null
      }));

    let subtotal = 0;
    let count = 0;
    for (const it of items) {
      const price = typeof it.item.unit_price === 'number' ? it.item.unit_price : 0;
      const q = typeof it.item.quantity === 'number' ? it.item.quantity : 0;
      subtotal += price * q;
      count += q;
    }

    return {
      success: true,
      cart,
      items,
      cart_item_count: count,
      subtotal,
      message: 'added_to_cart'
    };
  }

  // getCart()
  getCart() {
    const cart = this._getFromStorage('cart', null);
    if (!cart) {
      return {
        cart: null,
        items: [],
        subtotal: 0,
        estimated_tax: 0,
        estimated_total: 0
      };
    }
    const cartItems = this._getFromStorage('cart_items', []);
    const products = this._getFromStorage('products', []);

    const items = cartItems
      .filter(ci => ci.cart_id === cart.id)
      .map(ci => {
        const product = products.find(p => p.id === ci.product_id) || null;
        const unit = typeof ci.unit_price === 'number' ? ci.unit_price : (product && product.price) || 0;
        const qty = typeof ci.quantity === 'number' ? ci.quantity : 0;
        return {
          item: ci,
          product,
          line_total: unit * qty
        };
      });

    let subtotal = 0;
    for (const it of items) {
      subtotal += it.line_total;
    }
    const estimated_tax = Math.round(subtotal * 0.1 * 100) / 100;
    const estimated_total = subtotal + estimated_tax;

    return {
      cart,
      items,
      subtotal,
      estimated_tax,
      estimated_total
    };
  }

  // updateCartItem(cartItemId, quantity)
  updateCartItem(cartItemId, quantity) {
    let cart = this._getFromStorage('cart', null);
    if (!cart) {
      return { success: false, cart: null, items: [], subtotal: 0, estimated_total: 0 };
    }
    let cartItems = this._getFromStorage('cart_items', []);
    const idx = cartItems.findIndex(ci => ci.id === cartItemId && ci.cart_id === cart.id);
    if (idx < 0) {
      return { success: false, cart, items: [], subtotal: 0, estimated_total: 0 };
    }

    if (quantity <= 0) {
      cartItems.splice(idx, 1);
    } else {
      cartItems[idx].quantity = quantity;
    }

    cart.updated_at = this._nowIso();
    this._saveToStorage('cart', cart);
    this._saveToStorage('cart_items', cartItems);

    const products = this._getFromStorage('products', []);
    const items = cartItems
      .filter(ci => ci.cart_id === cart.id)
      .map(ci => ({
        item: ci,
        product: products.find(p => p.id === ci.product_id) || null
      }));

    let subtotal = 0;
    for (const it of items) {
      const price = typeof it.item.unit_price === 'number' ? it.item.unit_price : (it.product && it.product.price) || 0;
      const qty = typeof it.item.quantity === 'number' ? it.item.quantity : 0;
      subtotal += price * qty;
    }

    const estimated_total = subtotal; // tax not required in this interface

    return {
      success: true,
      cart,
      items,
      subtotal,
      estimated_total
    };
  }

  // removeCartItem(cartItemId)
  removeCartItem(cartItemId) {
    let cart = this._getFromStorage('cart', null);
    if (!cart) {
      return { success: false, cart: null, items: [], subtotal: 0, estimated_total: 0 };
    }
    let cartItems = this._getFromStorage('cart_items', []);
    cartItems = cartItems.filter(ci => !(ci.id === cartItemId && ci.cart_id === cart.id));

    cart.updated_at = this._nowIso();
    this._saveToStorage('cart', cart);
    this._saveToStorage('cart_items', cartItems);

    const products = this._getFromStorage('products', []);
    const items = cartItems
      .filter(ci => ci.cart_id === cart.id)
      .map(ci => ({
        item: ci,
        product: products.find(p => p.id === ci.product_id) || null
      }));

    let subtotal = 0;
    for (const it of items) {
      const price = typeof it.item.unit_price === 'number' ? it.item.unit_price : (it.product && it.product.price) || 0;
      const qty = typeof it.item.quantity === 'number' ? it.item.quantity : 0;
      subtotal += price * qty;
    }

    const estimated_total = subtotal;

    return {
      success: true,
      cart,
      items,
      subtotal,
      estimated_total
    };
  }

  // searchChapters(postalCode, radiusMiles)
  searchChapters(postalCode, radiusMiles) {
    const chapters = this._getFromStorage('chapters', []);
    const results = [];

    for (const ch of chapters) {
      if (ch.is_active === false) continue;
      // Distance calculation uses geocoded postalCode and chapter coordinates if available
      let distance = null;
      if (postalCode) {
        const locationText = String(postalCode);
        // create a pseudo-event-like object for chapter
        const pseudoEvent = {
          latitude: ch.latitude,
          longitude: ch.longitude
        };
        distance = this._calculateEventDistance(locationText, pseudoEvent);
      }
      results.push({ chapter: ch, distance_miles: distance });
    }

    let filtered = results;
    if (typeof radiusMiles === 'number' && radiusMiles > 0) {
      filtered = filtered.filter(r => {
        if (r.distance_miles == null) return true;
        return r.distance_miles <= radiusMiles;
      });
    }

    filtered.sort((a, b) => {
      const da = a.distance_miles;
      const db = b.distance_miles;
      if (da == null && db == null) return 0;
      if (da == null) return 1;
      if (db == null) return -1;
      return da - db;
    });

    return {
      results: filtered,
      total_count: filtered.length
    };
  }

  // getChapterDetails(chapterId)
  getChapterDetails(chapterId) {
    const chapters = this._getFromStorage('chapters', []);
    const chapter = chapters.find(c => c.id === chapterId) || null;
    return { chapter };
  }

  // contactChapter(chapterId, name, email, subject, message)
  contactChapter(chapterId, name, email, subject, message) {
    const chapters = this._getFromStorage('chapters', []);
    const chapter = chapters.find(c => c.id === chapterId);
    if (!chapter) {
      return {
        success: false,
        chapter_message: null,
        confirmation_message: 'chapter_not_found'
      };
    }

    const messages = this._getFromStorage('chapter_contact_messages', []);
    const msg = {
      id: this._generateId('chapmsg'),
      chapter_id: chapterId,
      name,
      email,
      subject,
      message,
      submitted_at: this._nowIso(),
      status: 'new'
    };
    messages.push(msg);
    this._saveToStorage('chapter_contact_messages', messages);

    return {
      success: true,
      chapter_message: msg,
      confirmation_message: 'message_sent'
    };
  }

  // getMembershipOptions(maxAnnualDues)
  getMembershipOptions(maxAnnualDues) {
    const types = this._getFromStorage('membership_types', []);
    const list = types.filter(t => t.is_active !== false);

    let minUnderMax = Infinity;
    const numericMax = typeof maxAnnualDues === 'number' ? maxAnnualDues : null;

    if (numericMax != null) {
      for (const t of list) {
        if (typeof t.annual_dues === 'number' && t.annual_dues <= numericMax) {
          if (t.annual_dues < minUnderMax) minUnderMax = t.annual_dues;
        }
      }
    }

    const membership_types = list
      .slice()
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0) || (a.annual_dues || 0) - (b.annual_dues || 0))
      .map(t => {
        const is_under_max = numericMax != null && typeof t.annual_dues === 'number' && t.annual_dues <= numericMax;
        const is_most_affordable_under_max = is_under_max && t.annual_dues === minUnderMax;
        return {
          membership_type: t,
          annual_dues_display: typeof t.annual_dues === 'number' ? `$${t.annual_dues.toFixed(2)}` : '',
          is_under_max,
          is_most_affordable_under_max
        };
      });

    return {
      membership_types,
      max_annual_dues_filter_used: numericMax
    };
  }

  // submitMembershipApplication(membershipTypeId, fullName, city, state, ridingExperience, agreeCodeOfConduct)
  submitMembershipApplication(membershipTypeId, fullName, city, state, ridingExperience, agreeCodeOfConduct) {
    const types = this._getFromStorage('membership_types', []);
    const type = types.find(t => t.id === membershipTypeId);
    if (!type) {
      return {
        success: false,
        application: null,
        confirmation_message: 'membership_type_not_found'
      };
    }

    if (!agreeCodeOfConduct) {
      return {
        success: false,
        application: null,
        confirmation_message: 'must_agree_code_of_conduct'
      };
    }

    const apps = this._getFromStorage('membership_applications', []);
    const application = {
      id: this._generateId('mshipapp'),
      membership_type_id: type.id,
      membership_type_code: type.code,
      full_name: fullName,
      city: city || '',
      state: state || '',
      riding_experience: ridingExperience || null,
      agree_code_of_conduct: !!agreeCodeOfConduct,
      submitted_at: this._nowIso(),
      status: 'submitted',
      step_completed: 1
    };
    apps.push(application);
    this._saveToStorage('membership_applications', apps);

    return {
      success: true,
      application,
      confirmation_message: 'application_submitted'
    };
  }

  // getNewsFilterOptions()
  getNewsFilterOptions() {
    const articles = this._getFromStorage('news_articles', []);
    const tagSet = new Set();
    const yearSet = new Set();

    for (const a of articles) {
      if (Array.isArray(a.tags)) {
        a.tags.forEach(t => tagSet.add(t));
      }
      if (typeof a.year === 'number') {
        yearSet.add(a.year);
      }
    }

    const tag_options = Array.from(tagSet);
    const year_options = Array.from(yearSet).sort((a, b) => b - a);
    const default_year = year_options.length > 0 ? year_options[0] : new Date().getFullYear();

    const sort_options = [
      { value: 'newest_first', label: 'Newest First' },
      { value: 'oldest_first', label: 'Oldest First' }
    ];

    return {
      tag_options,
      year_options,
      sort_options,
      default_year,
      default_sort: 'newest_first'
    };
  }

  // listNewsArticles(tag, year, sortBy, page, pageSize)
  listNewsArticles(tag, year, sortBy, page, pageSize) {
    const articles = this._getFromStorage('news_articles', []);
    let list = articles.filter(a => a.is_published === true);

    if (tag) {
      list = list.filter(a => Array.isArray(a.tags) && a.tags.includes(tag));
    }
    if (typeof year === 'number') {
      list = list.filter(a => a.year === year);
    }

    const sort = sortBy || 'newest_first';
    list.sort((a, b) => {
      const ad = this._parseDate(a.publish_datetime) || new Date(0);
      const bd = this._parseDate(b.publish_datetime) || new Date(0);
      if (sort === 'oldest_first') return ad - bd;
      return bd - ad; // newest_first
    });

    const total_count = list.length;
    const pg = page || 1;
    const ps = pageSize || 10;
    const startIdx = (pg - 1) * ps;
    const pageItems = list.slice(startIdx, startIdx + ps);

    const mapped = pageItems.map(a => ({
      article: a,
      publish_date_display: this._formatDate(a.publish_datetime),
      tag_labels: Array.isArray(a.tags) ? a.tags.slice() : []
    }));

    return {
      articles: mapped,
      total_count,
      page: pg,
      page_size: ps
    };
  }

  // getNewsArticleDetails(articleId)
  getNewsArticleDetails(articleId) {
    const articles = this._getFromStorage('news_articles', []);
    const article = articles.find(a => a.id === articleId) || null;
    const commentsAll = this._getFromStorage('article_comments', []);

    const commentsVisible = commentsAll
      .filter(c => c.article_id === articleId && c.status === 'visible')
      .map(c => Object.assign({}, c, { article: article }));

    return {
      article,
      tag_labels: article && Array.isArray(article.tags) ? article.tags.slice() : [],
      publish_date_display: article ? this._formatDate(article.publish_datetime) : '',
      comments: commentsVisible
    };
  }

  // addArticleComment(articleId, commenterName, commentText)
  addArticleComment(articleId, commenterName, commentText) {
    const articles = this._getFromStorage('news_articles', []);
    const article = articles.find(a => a.id === articleId);
    if (!article) {
      return {
        success: false,
        comment: null,
        confirmation_message: 'article_not_found'
      };
    }

    const comments = this._getFromStorage('article_comments', []);
    const comment = {
      id: this._generateId('artcmt'),
      article_id: articleId,
      commenter_name: commenterName,
      comment_text: commentText,
      submitted_at: this._nowIso(),
      status: 'visible'
    };
    comments.push(comment);
    this._saveToStorage('article_comments', comments);

    return {
      success: true,
      comment,
      confirmation_message: 'comment_posted'
    };
  }

  // getDonationOptions()
  getDonationOptions() {
    const funds = this._getFromStorage('donation_funds', []);
    const activeFunds = funds.filter(f => f.is_active !== false);

    const suggested_amounts = [25, 50, 75, 100];
    const min_amount = 1;
    const max_amount = 100000;

    const payment_methods = ['credit_card', 'paypal', 'bank_transfer', 'cash', 'check'];

    return {
      default_donation_type: 'one_time',
      suggested_amounts,
      funds: activeFunds,
      payment_methods,
      min_amount,
      max_amount
    };
  }

  // submitDonation(donationType, amount, fundCode, paymentMethod, nameOnCard, billingPostalCode, cardNumber, cardExpiration, cardCvv, agreeTerms)
  submitDonation(donationType, amount, fundCode, paymentMethod, nameOnCard, billingPostalCode, cardNumber, cardExpiration, cardCvv, agreeTerms) {
    const errors = [];

    if (donationType !== 'one_time' && donationType !== 'recurring') {
      errors.push('invalid_donation_type');
    }

    const { valid, errors: amountErrors } = this._validateDonationAmount(amount, fundCode);
    if (!valid) {
      errors.push(...amountErrors);
    }

    const options = this.getDonationOptions();
    if (!options.payment_methods.includes(paymentMethod)) {
      errors.push('invalid_payment_method');
    }

    if (!agreeTerms) {
      errors.push('must_agree_terms');
    }

    let cardMasked = null;
    if (paymentMethod === 'credit_card') {
      if (!cardNumber || !cardExpiration || !cardCvv || !nameOnCard) {
        errors.push('credit_card_details_incomplete');
      } else {
        cardMasked = this._maskAndTokenizeCard(cardNumber, cardExpiration);
      }
    }

    if (errors.length > 0) {
      return {
        success: false,
        donation: null,
        confirmation_message: 'donation_failed',
        errors
      };
    }

    const funds = this._getFromStorage('donation_funds', []);
    const fund = funds.find(f => f.code === fundCode) || null;

    const donations = this._getFromStorage('donations', []);
    const donation = {
      id: this._generateId('donation'),
      donation_type: donationType,
      amount,
      currency: 'USD',
      fund_id: fund ? fund.id : null,
      fund_code: fundCode,
      payment_method: paymentMethod,
      name_on_card: nameOnCard || '',
      billing_postal_code: billingPostalCode || '',
      card_last4: cardMasked ? cardMasked.last4 : '',
      card_brand: cardMasked ? cardMasked.brand : '',
      transaction_reference: cardMasked ? cardMasked.token : '',
      donation_datetime: this._nowIso(),
      agree_terms: !!agreeTerms,
      status: 'completed'
    };

    donations.push(donation);
    this._saveToStorage('donations', donations);

    return {
      success: true,
      donation,
      confirmation_message: 'donation_completed',
      errors: []
    };
  }

  // getSafetyCategories()
  getSafetyCategories() {
    const guides = this._getFromStorage('safety_guides', []);
    const courses = this._getFromStorage('courses', []);
    const set = new Set();

    guides.forEach(g => {
      if (g.category) set.add(g.category);
    });
    courses.forEach(c => {
      if (c.category) set.add(c.category);
    });

    const categories = Array.from(set).map(key => ({ key, label: key }));
    return { categories };
  }

  // listSafetyGuides(category, sortBy)
  listSafetyGuides(category, sortBy) {
    let guides = this._getFromStorage('safety_guides', []);
    guides = guides.filter(g => g.is_published !== false);
    if (category) {
      guides = guides.filter(g => g.category === category);
    }

    const sort = sortBy || 'sort_order';
    guides.sort((a, b) => {
      if (sort === 'newest_first') {
        const ad = this._parseDate(a.publish_datetime) || new Date(0);
        const bd = this._parseDate(b.publish_datetime) || new Date(0);
        return bd - ad;
      }
      return (a.sort_order || 0) - (b.sort_order || 0);
    });

    return { guides };
  }

  // getSafetyGuideDetails(guideId)
  getSafetyGuideDetails(guideId) {
    const guides = this._getFromStorage('safety_guides', []);
    const guide = guides.find(g => g.id === guideId) || null;
    return { guide };
  }

  // listCourses(category, durationFilter, sortBy)
  listCourses(category, durationFilter, sortBy) {
    let courses = this._getFromStorage('courses', []);
    courses = courses.filter(c => c.is_active !== false);
    if (category) {
      courses = courses.filter(c => c.category === category);
    }

    if (durationFilter) {
      courses = courses.filter(c => {
        const d = c.duration_minutes || 0;
        if (durationFilter === 'under_2_hours') return d < 120;
        if (durationFilter === 'two_to_four_hours') return d >= 120 && d <= 240;
        if (durationFilter === 'over_four_hours') return d > 240;
        return true;
      });
    }

    const sort = sortBy || 'soonest_first';
    courses.sort((a, b) => {
      if (sort === 'soonest_first') {
        const ad = this._parseDate(a.start_datetime) || new Date(8640000000000000);
        const bd = this._parseDate(b.start_datetime) || new Date(8640000000000000);
        return ad - bd;
      }
      return 0;
    });

    const mapped = courses.map(c => {
      const d = c.duration_minutes || 0;
      let duration_label = '';
      if (d > 0) {
        const hours = Math.floor(d / 60);
        const mins = d % 60;
        if (hours && mins) duration_label = `${hours}h ${mins}m`;
        else if (hours) duration_label = `${hours}h`;
        else duration_label = `${mins}m`;
      }
      let schedule_display = '';
      if (c.start_datetime) {
        schedule_display = this._formatDateRange(c.start_datetime, c.end_datetime);
      } else if (c.schedule_description) {
        schedule_display = c.schedule_description;
      }
      return {
        course: c,
        duration_label,
        schedule_display
      };
    });

    return { courses: mapped };
  }

  // getCourseDetails(courseId)
  getCourseDetails(courseId) {
    const courses = this._getFromStorage('courses', []);
    const course = courses.find(c => c.id === courseId) || null;
    if (!course) {
      return {
        course: null,
        duration_label: '',
        schedule_display: '',
        format_label: ''
      };
    }

    const d = course.duration_minutes || 0;
    let duration_label = '';
    if (d > 0) {
      const hours = Math.floor(d / 60);
      const mins = d % 60;
      if (hours && mins) duration_label = `${hours}h ${mins}m`;
      else if (hours) duration_label = `${hours}h`;
      else duration_label = `${mins}m`;
    }

    let schedule_display = '';
    if (course.start_datetime) {
      schedule_display = this._formatDateRange(course.start_datetime, course.end_datetime);
    } else if (course.schedule_description) {
      schedule_display = course.schedule_description;
    }

    const format_label = this._getCourseFormatLabel(course.format);

    return {
      course,
      duration_label,
      schedule_display,
      format_label
    };
  }

  // enrollInCourse(courseId)
  enrollInCourse(courseId) {
    const courses = this._getFromStorage('courses', []);
    const course = courses.find(c => c.id === courseId);
    if (!course) {
      return {
        success: false,
        enrollment: null,
        confirmation_message: 'course_not_found'
      };
    }

    if (typeof course.remaining_slots === 'number' && course.remaining_slots <= 0) {
      return {
        success: false,
        enrollment: null,
        confirmation_message: 'course_full'
      };
    }

    const enrollments = this._getFromStorage('course_enrollments', []);
    const enrollment = {
      id: this._generateId('courseenroll'),
      course_id: courseId,
      enrollment_datetime: this._nowIso(),
      status: 'enrolled'
    };
    enrollments.push(enrollment);
    this._saveToStorage('course_enrollments', enrollments);

    if (typeof course.remaining_slots === 'number') {
      course.remaining_slots = Math.max(0, course.remaining_slots - 1);
      this._saveToStorage('courses', courses);
    }

    return {
      success: true,
      enrollment,
      confirmation_message: 'course_enrolled'
    };
  }

  // getAboutClubContent()
  getAboutClubContent() {
    const content = this._getFromStorage('about_content', null);
    if (content && typeof content === 'object') {
      return {
        history_html: content.history_html || '',
        mission_html: content.mission_html || '',
        values: Array.isArray(content.values) ? content.values : [],
        community_outreach_html: content.community_outreach_html || '',
        leadership_summaries: Array.isArray(content.leadership_summaries) ? content.leadership_summaries : []
      };
    }
    return {
      history_html: '',
      mission_html: '',
      values: [],
      community_outreach_html: '',
      leadership_summaries: []
    };
  }

  // getContactTopics()
  getContactTopics() {
    const stored = this._getFromStorage('contact_topics', null);
    if (Array.isArray(stored)) {
      return { topics: stored };
    }
    const topics = [
      { code: 'membership', label: 'Membership' },
      { code: 'store_order', label: 'Store Order' },
      { code: 'media_inquiry', label: 'Media Inquiry' },
      { code: 'general_question', label: 'General Question' },
      { code: 'donation', label: 'Donation' },
      { code: 'website_issue', label: 'Website Issue' },
      { code: 'other', label: 'Other' }
    ];
    return { topics };
  }

  // submitGeneralContact(name, email, topic, message)
  submitGeneralContact(name, email, topic, message) {
    const messages = this._getFromStorage('contact_messages', []);
    const msg = {
      id: this._generateId('contactmsg'),
      name,
      email,
      topic,
      message,
      submitted_at: this._nowIso(),
      status: 'new'
    };
    messages.push(msg);
    this._saveToStorage('contact_messages', messages);

    return {
      success: true,
      contact_message: msg,
      confirmation_message: 'message_sent'
    };
  }

  // getPolicyContent(policyCode)
  getPolicyContent(policyCode) {
    const policies = this._getFromStorage('policies', []);
    const policy = policies.find(p => p.policy_code === policyCode) || null;
    if (policy) {
      return policy;
    }
    return {
      policy_code: policyCode,
      title: '',
      content_html: '',
      last_updated: ''
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
