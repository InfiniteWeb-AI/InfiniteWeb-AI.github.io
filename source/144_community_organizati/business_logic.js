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

  // ---------------------- STORAGE & ID HELPERS ----------------------

  _initStorage() {
    const ensureArray = (key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    };
    const ensureObject = (key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify({}));
      }
    };

    // Entity tables
    ensureArray('events');
    ensureArray('workshops');
    ensureArray('venues');
    ensureArray('transit_routes');
    ensureArray('rsvps');
    ensureArray('workshop_registrations');
    ensureArray('schedule_items');
    ensureArray('favorite_items');
    ensureArray('festival_passes');
    ensureArray('festival_pass_events');
    ensureArray('volunteer_opportunities');
    ensureArray('volunteer_shifts');
    ensureArray('volunteer_signups');
    ensureArray('newsletter_subscriptions');
    ensureArray('contact_messages');

    // Content / config
    ensureObject('about_content');
    ensureObject('contact_info');
    ensureObject('privacy_policy_content');
    ensureObject('terms_content');

    // Single-user state store
    ensureObject('single_user_state');

    // ID counter
    if (!localStorage.getItem('idCounter')) {
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

  // ---------------------- GENERIC HELPERS ----------------------

  _truncate(text, maxLength) {
    if (!text || typeof text !== 'string') return '';
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength - 1).trimEnd() + '…';
  }

  _getDateOnly(isoString) {
    if (!isoString) return null;
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return null;
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
       const day = String(d.getDate()).padStart(2, '0');
    return year + '-' + month + '-' + day;
  }

  _formatDateLabel(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toDateString();
  }

  _compareDateTimeAsc(aIso, bIso) {
    const a = new Date(aIso).getTime();
    const b = new Date(bIso).getTime();
    return a - b;
  }

  _nowIso() {
    return new Date().toISOString();
  }

  // Label helpers
  _getCategoryLabel(category) {
    const map = {
      music: 'Music',
      dance: 'Dance',
      theatre: 'Theatre',
      arts_crafts: 'Arts & Crafts',
      community_festival: 'Community Festival',
      film: 'Film',
      lecture: 'Lecture',
      family_activity: 'Family Activity',
      other: 'Other',
      digital_media: 'Digital Media'
    };
    return map[category] || 'Other';
  }

  _getAudienceLabel(audience) {
    const map = {
      families_all_ages: 'Families / All ages',
      seniors: 'Seniors',
      kids_children: 'Kids / Children',
      adults: 'Adults',
      all_ages: 'All ages',
      teens: 'Teens'
    };
    return map[audience] || 'All ages';
  }

  _getTimeOfDayLabel(timeOfDay) {
    const map = {
      morning: 'Morning (before 12 PM)',
      afternoon: 'Afternoon (12 PM – 5 PM)',
      evening: 'Evening (after 5 PM)'
    };
    return map[timeOfDay] || '';
  }

  _getLocationTypeLabel(locationType) {
    const map = {
      indoor: 'Indoor',
      outdoor: 'Outdoor',
      online: 'Online',
      hybrid: 'Hybrid'
    };
    return map[locationType] || '';
  }

  _getShiftTimeOfDayLabel(timeOfDay) {
    return this._getTimeOfDayLabel(timeOfDay);
  }

  // Audience matching with simple hierarchy
  _matchesAudience(eventAudience, filterAudience) {
    if (!filterAudience) return true;
    if (!eventAudience) return false;

    if (filterAudience === eventAudience) return true;

    // Hierarchical logic
    if (filterAudience === 'families_all_ages') {
      return (
        eventAudience === 'families_all_ages' ||
        eventAudience === 'all_ages' ||
        eventAudience === 'kids_children'
      );
    }
    if (filterAudience === 'kids_children') {
      return eventAudience === 'kids_children' || eventAudience === 'families_all_ages';
    }
    if (filterAudience === 'all_ages') {
      return eventAudience === 'all_ages' || eventAudience === 'families_all_ages';
    }

    return false;
  }

  // ---------------------- SINGLE-USER STATE HELPERS ----------------------

  _getOrCreateSingleUserStateStore() {
    let state = this._getFromStorage('single_user_state', null);
    if (!state || typeof state !== 'object') {
      state = {
        festival_pass_draft_id: null,
        created_at: this._nowIso()
      };
      this._saveToStorage('single_user_state', state);
    }
    return state;
  }

  _updateSingleUserStateStore(updates) {
    const state = this._getOrCreateSingleUserStateStore();
    const newState = Object.assign({}, state, updates);
    this._saveToStorage('single_user_state', newState);
    return newState;
  }

  _getOrCreateFestivalPassDraft(passType) {
    const pass_type = passType || 'create_your_own_3_event_pass';
    const state = this._getOrCreateSingleUserStateStore();
    const passes = this._getFromStorage('festival_passes');

    if (state.festival_pass_draft_id) {
      const existing = passes.find(
        (p) => p.id === state.festival_pass_draft_id && p.status === 'draft'
      );
      if (existing) {
        return existing;
      }
    }

    const id = this._generateId('festivalpass');
    const newPass = {
      id: id,
      pass_type: pass_type,
      name: 'Custom Festival Pass',
      contact_name: '',
      contact_email: '',
      quantity: 1,
      total_price: 0,
      status: 'draft',
      created_at: this._nowIso(),
      notes: ''
    };
    passes.push(newPass);
    this._saveToStorage('festival_passes', passes);
    this._updateSingleUserStateStore({ festival_pass_draft_id: id });
    return newPass;
  }

  _saveScheduleItemInternal(scheduleItem) {
    const scheduleItems = this._getFromStorage('schedule_items');
    const existingIndex = scheduleItems.findIndex((s) => s.id === scheduleItem.id);
    if (existingIndex >= 0) {
      scheduleItems[existingIndex] = scheduleItem;
    } else {
      scheduleItems.push(scheduleItem);
    }
    this._saveToStorage('schedule_items', scheduleItems);
    return scheduleItem;
  }

  _saveFavoriteItemInternal(favoriteItem) {
    const favoriteItems = this._getFromStorage('favorite_items');
    const existingIndex = favoriteItems.findIndex((f) => f.id === favoriteItem.id);
    if (existingIndex >= 0) {
      favoriteItems[existingIndex] = favoriteItem;
    } else {
      favoriteItems.push(favoriteItem);
    }
    this._saveToStorage('favorite_items', favoriteItems);
    return favoriteItem;
  }

  _saveNewsletterSubscriptionInternal(subscription) {
    const subs = this._getFromStorage('newsletter_subscriptions');
    subs.push(subscription);
    this._saveToStorage('newsletter_subscriptions', subs);
    return subscription;
  }

  _saveVolunteerSignupInternal(signup) {
    const signups = this._getFromStorage('volunteer_signups');
    signups.push(signup);
    this._saveToStorage('volunteer_signups', signups);

    // Adjust related VolunteerShift spots if needed
    const shifts = this._getFromStorage('volunteer_shifts');
    const idx = shifts.findIndex((s) => s.id === signup.shift_id);
    if (idx >= 0) {
      const shift = shifts[idx];
      if (typeof shift.spots_remaining === 'number' && shift.spots_remaining > 0) {
        shift.spots_remaining -= 1;
        if (shift.spots_remaining <= 0) {
          shift.spots_remaining = 0;
          shift.is_full = true;
        }
        shifts[idx] = shift;
        this._saveToStorage('volunteer_shifts', shifts);
      }
    }

    return signup;
  }

  // Resolve foreign key helper for known relationships
  _attachVenue(entityWithVenueId) {
    const venues = this._getFromStorage('venues');
    if (!entityWithVenueId || !entityWithVenueId.venue_id) return entityWithVenueId;
    const venue = venues.find((v) => v.id === entityWithVenueId.venue_id) || null;
    return Object.assign({}, entityWithVenueId, { venue: venue });
  }

  _getPassTypeConfig(passType) {
    // Currently we support only create_your_own_3_event_pass config
    if (!passType || passType === 'create_your_own_3_event_pass') {
      return {
        pass_type: 'create_your_own_3_event_pass',
        label: 'Create Your Own 3-Event Pass',
        max_events: 3,
        per_event_price_cap: 25,
        requires_distinct_categories: true
      };
    }
    // Fallback generic config
    return {
      pass_type: passType,
      label: 'Festival Pass',
      max_events: 3,
      per_event_price_cap: 25,
      requires_distinct_categories: false
    };
  }

  _buildFestivalPassSelectionSummary(pass, config) {
    const events = this._getFromStorage('events');
    const passEvents = this._getFromStorage('festival_pass_events').filter(
      (pe) => pe.festival_pass_id === pass.id
    );

    const selected_events = passEvents
      .slice()
      .sort((a, b) => a.selection_order - b.selection_order)
      .map((pe) => {
        const ev = events.find((e) => e.id === pe.event_id) || {};
        return {
          event_id: pe.event_id,
          title: ev.title || '',
          category: pe.event_category,
          category_label: this._getCategoryLabel(pe.event_category),
          price: pe.event_price,
          start_datetime: ev.start_datetime || null,
          selection_order: pe.selection_order
        };
      });

    const total_events_selected = selected_events.length;
    const max_events_allowed = config.max_events;
    const per_event_price_cap = config.per_event_price_cap;
    const requires_distinct_categories = config.requires_distinct_categories;

    const validation_errors = [];

    if (max_events_allowed && total_events_selected > max_events_allowed) {
      validation_errors.push('You have selected more than the allowed number of events.');
    }
    if (max_events_allowed && total_events_selected < max_events_allowed) {
      validation_errors.push(
        'You must select exactly ' + max_events_allowed + ' events for this pass.'
      );
    }

    if (per_event_price_cap != null) {
      const overCap = selected_events.filter(
        (se) => typeof se.price === 'number' && se.price > per_event_price_cap
      );
      if (overCap.length > 0) {
        validation_errors.push(
          'Selected events must each cost ' +
            '$' +
            per_event_price_cap +
            ' or less.'
        );
      }
    }

    if (requires_distinct_categories) {
      const catSet = {};
      const duplicates = [];
      selected_events.forEach((se) => {
        if (!se.category) return;
        if (catSet[se.category]) {
          duplicates.push(se.category);
        } else {
          catSet[se.category] = true;
        }
      });
      if (duplicates.length > 0) {
        validation_errors.push('Selected events must be from different categories.');
      }
    }

    const selection_valid = validation_errors.length === 0;

    const estimated_total_price = selected_events.reduce((sum, se) => {
      const price = typeof se.price === 'number' ? se.price : 0;
      return sum + price;
    }, 0);

    return {
      pass_type: config.pass_type,
      pass_label: config.label,
      total_events_selected,
      max_events_allowed,
      per_event_price_cap,
      requires_distinct_categories,
      selection_valid,
      validation_errors,
      selected_events,
      estimated_total_price
    };
  }

  _buildScheduleItemView(scheduleItem) {
    const events = this._getFromStorage('events');
    const workshops = this._getFromStorage('workshops');
    const venues = this._getFromStorage('venues');

    let item = null;
    if (scheduleItem.item_type === 'event') {
      item = events.find((e) => e.id === scheduleItem.item_id) || null;
    } else if (scheduleItem.item_type === 'workshop') {
      item = workshops.find((w) => w.id === scheduleItem.item_id) || null;
    }

    let venueName = '';
    if (item && item.venue_id) {
      const v = venues.find((vv) => vv.id === item.venue_id);
      venueName = v ? v.name : '';
    }

    const category = item ? item.category : null;
    const audience = item ? item.audience : null;
    const start = item ? item.start_datetime : null;
    const end = item ? item.end_datetime : null;
    const timeOfDay = item ? item.time_of_day : null;

    return {
      schedule_item_id: scheduleItem.id,
      item_type: scheduleItem.item_type,
      item_id: scheduleItem.item_id,
      title: item ? item.title : '',
      category_label: this._getCategoryLabel(category),
      audience_label: this._getAudienceLabel(audience),
      start_datetime: start,
      end_datetime: end,
      time_of_day_label: this._getTimeOfDayLabel(timeOfDay),
      venue_name: venueName,
      price: item && typeof item.price === 'number' ? item.price : 0,
      is_free: !!(item && item.is_free),
      source: scheduleItem.source,
      // Foreign key resolution: attach full item
      item: item
    };
  }

  _buildFavoriteItemView(favoriteItem) {
    const events = this._getFromStorage('events');
    const workshops = this._getFromStorage('workshops');
    const venues = this._getFromStorage('venues');

    let item = null;
    if (favoriteItem.item_type === 'event') {
      item = events.find((e) => e.id === favoriteItem.item_id) || null;
    } else if (favoriteItem.item_type === 'workshop') {
      item = workshops.find((w) => w.id === favoriteItem.item_id) || null;
    }

    let venueName = '';
    if (item && item.venue_id) {
      const v = venues.find((vv) => vv.id === item.venue_id);
      venueName = v ? v.name : '';
    }

    const category = item ? item.category : null;
    const audience = item ? item.audience : null;
    const start = item ? item.start_datetime : null;

    return {
      favorite_item_id: favoriteItem.id,
      item_type: favoriteItem.item_type,
      item_id: favoriteItem.item_id,
      label: favoriteItem.label || '',
      added_at: favoriteItem.added_at,
      title: item ? item.title : '',
      category_label: this._getCategoryLabel(category),
      audience_label: this._getAudienceLabel(audience),
      start_datetime: start,
      venue_name: venueName,
      price: item && typeof item.price === 'number' ? item.price : 0,
      is_free: !!(item && item.is_free),
      rating: item && typeof item.rating === 'number' ? item.rating : undefined,
      rating_count: item && typeof item.rating_count === 'number' ? item.rating_count : undefined,
      // Foreign key resolution: attach full item
      item: item
    };
  }

  // ---------------------- CORE INTERFACE IMPLEMENTATIONS ----------------------

  // 1. getHomePageSummary()
  getHomePageSummary() {
    const events = this._getFromStorage('events');
    const workshops = this._getFromStorage('workshops');
    const venues = this._getFromStorage('venues');
    const scheduleItems = this._getFromStorage('schedule_items');
    const favoriteItems = this._getFromStorage('favorite_items');

    const isInSchedule = (eventId) =>
      scheduleItems.some((s) => s.item_type === 'event' && s.item_id === eventId);
    const isInFavorites = (eventId) =>
      favoriteItems.some((f) => f.item_type === 'event' && f.item_id === eventId);

    const featured_events = events
      .filter((e) => e.featured)
      .slice()
      .sort((a, b) => this._compareDateTimeAsc(a.start_datetime, b.start_datetime))
      .slice(0, 10)
      .map((e) => {
        const venue = venues.find((v) => v.id === e.venue_id) || null;
        return {
          event_id: e.id,
          title: e.title,
          short_title: e.short_title || '',
          start_datetime: e.start_datetime,
          end_datetime: e.end_datetime || null,
          time_of_day: e.time_of_day,
          time_of_day_label: this._getTimeOfDayLabel(e.time_of_day),
          category: e.category,
          category_label: this._getCategoryLabel(e.category),
          audience: e.audience,
          audience_label: this._getAudienceLabel(e.audience),
          price: typeof e.price === 'number' ? e.price : 0,
          is_free: !!e.is_free,
          rating: typeof e.rating === 'number' ? e.rating : undefined,
          rating_count: typeof e.rating_count === 'number' ? e.rating_count : undefined,
          venue_id: e.venue_id,
          venue_name: venue ? venue.name : '',
          location_type: e.location_type,
          location_type_label: this._getLocationTypeLabel(e.location_type),
          wheelchair_accessible: !!e.wheelchair_accessible,
          image_url: e.image_url || '',
          is_in_schedule: isInSchedule(e.id),
          is_in_favorites: isInFavorites(e.id),
          // Foreign key resolution
          venue: venue
        };
      });

    const featured_workshops = workshops
      .filter((w) => w.featured)
      .slice()
      .sort((a, b) => this._compareDateTimeAsc(a.start_datetime, b.start_datetime))
      .slice(0, 10)
      .map((w) => {
        const venue = venues.find((v) => v.id === w.venue_id) || null;
        return {
          workshop_id: w.id,
          title: w.title,
          short_title: w.short_title || '',
          start_datetime: w.start_datetime,
          end_datetime: w.end_datetime || null,
          duration_minutes: w.duration_minutes,
          time_of_day: w.time_of_day,
          time_of_day_label: this._getTimeOfDayLabel(w.time_of_day),
          category: w.category,
          category_label: this._getCategoryLabel(w.category),
          audience: w.audience,
          audience_label: this._getAudienceLabel(w.audience),
          price: typeof w.price === 'number' ? w.price : 0,
          is_free: !!w.is_free,
          rating: typeof w.rating === 'number' ? w.rating : undefined,
          rating_count: typeof w.rating_count === 'number' ? w.rating_count : undefined,
          venue_id: w.venue_id,
          venue_name: venue ? venue.name : '',
          image_url: w.image_url || '',
          // Foreign key resolution
          venue: venue
        };
      });

    // Upcoming weekend highlights (Saturday & Sunday of upcoming weekend)
    const now = new Date();
    const day = now.getDay(); // 0=Sun,6=Sat
    const diffToSat = (6 - day + 7) % 7; // days until next Saturday (0 if Sat)
    const saturday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToSat);
    const sunday = new Date(saturday.getFullYear(), saturday.getMonth(), saturday.getDate() + 1);
    const saturdayStr = this._getDateOnly(saturday.toISOString());
    const sundayStr = this._getDateOnly(sunday.toISOString());

    const thisWeekendEvents = events
      .filter((e) => {
        const d = this._getDateOnly(e.start_datetime);
        return d === saturdayStr || d === sundayStr;
      })
      .slice()
      .sort((a, b) => this._compareDateTimeAsc(a.start_datetime, b.start_datetime))
      .slice(0, 10)
      .map((e) => ({
        event_id: e.id,
        title: e.title,
        start_datetime: e.start_datetime,
        time_of_day_label: this._getTimeOfDayLabel(e.time_of_day),
        category_label: this._getCategoryLabel(e.category),
        audience_label: this._getAudienceLabel(e.audience),
        price: typeof e.price === 'number' ? e.price : 0,
        is_free: !!e.is_free
      }));

    // Family-friendly picks (events + workshops upcoming 30 days)
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const thirtyStr = this._getDateOnly(thirtyDaysFromNow.toISOString());

    const familyFriendlyEvents = events.filter((e) => {
      const startDate = this._getDateOnly(e.start_datetime);
      const withinRange = startDate && startDate >= this._getDateOnly(now.toISOString()) && startDate <= thirtyStr;
      return withinRange && this._matchesAudience(e.audience, 'families_all_ages');
    });

    const familyFriendlyWorkshops = workshops.filter((w) => {
      const startDate = this._getDateOnly(w.start_datetime);
      const withinRange = startDate && startDate >= this._getDateOnly(now.toISOString()) && startDate <= thirtyStr;
      return withinRange && this._matchesAudience(w.audience, 'families_all_ages');
    });

    const family_friendly_picks = [];
    familyFriendlyEvents.forEach((e) => {
      family_friendly_picks.push({
        item_type: 'event',
        item_id: e.id,
        title: e.title,
        start_datetime: e.start_datetime,
        category_label: this._getCategoryLabel(e.category),
        audience_label: this._getAudienceLabel(e.audience),
        price: typeof e.price === 'number' ? e.price : 0,
        is_free: !!e.is_free
      });
    });
    familyFriendlyWorkshops.forEach((w) => {
      family_friendly_picks.push({
        item_type: 'workshop',
        item_id: w.id,
        title: w.title,
        start_datetime: w.start_datetime,
        category_label: this._getCategoryLabel(w.category),
        audience_label: this._getAudienceLabel(w.audience),
        price: typeof w.price === 'number' ? w.price : 0,
        is_free: !!w.is_free
      });
    });

    family_friendly_picks.sort((a, b) => this._compareDateTimeAsc(a.start_datetime, b.start_datetime));

    const quick_actions = [
      {
        action_id: 'rsvp_family_music',
        label: 'RSVP to a family-friendly music event',
        description: 'Find family-friendly music events and RSVP.',
        target_page: 'events',
        prefilled_context: {
          category: 'music',
          audience: 'families_all_ages',
          date_preset: 'upcoming_saturday',
          max_price: 15
        }
      },
      {
        action_id: 'register_workshop',
        label: 'Register for workshops',
        description: 'Browse and register for creative workshops.',
        target_page: 'workshops',
        prefilled_context: {}
      },
      {
        action_id: 'build_festival_pass',
        label: 'Build a 3-event festival pass',
        description: 'Create your own custom 3-event festival pass.',
        target_page: 'festival_pass',
        prefilled_context: {
          max_price: 25
        }
      },
      {
        action_id: 'signup_volunteer',
        label: 'Volunteer opportunities',
        description: 'Sign up to volunteer at upcoming events.',
        target_page: 'volunteer',
        prefilled_context: {}
      },
      {
        action_id: 'subscribe_newsletter',
        label: 'Subscribe to newsletter',
        description: 'Get monthly event updates by email.',
        target_page: 'newsletter',
        prefilled_context: {}
      }
    ];

    return {
      featured_events,
      featured_workshops,
      upcoming_highlights: {
        this_weekend_events: thisWeekendEvents,
        family_friendly_picks
      },
      quick_actions
    };
  }

  // 2. getEventFilterOptions()
  getEventFilterOptions() {
    const venues = this._getFromStorage('venues');

    const categories = [
      'music',
      'dance',
      'theatre',
      'arts_crafts',
      'community_festival',
      'film',
      'lecture',
      'family_activity',
      'other'
    ].map((value) => ({ value, label: this._getCategoryLabel(value) }));

    const audiences = [
      'families_all_ages',
      'seniors',
      'kids_children',
      'adults',
      'all_ages',
      'teens'
    ].map((value) => ({ value, label: this._getAudienceLabel(value) }));

    const time_of_day_options = ['morning', 'afternoon', 'evening'].map((value) => ({
      value,
      label: this._getTimeOfDayLabel(value)
    }));

    const price_ranges = [
      { id: 'free', label: 'Free', min: 0, max: 0 },
      { id: 'under_10', label: 'Under $10', min: 0, max: 10 },
      { id: 'under_20', label: 'Under $20', min: 0, max: 20 },
      { id: 'under_50', label: 'Under $50', min: 0, max: 50 }
    ];

    const venueOptions = venues.map((v) => ({
      venue_id: v.id,
      name: v.name,
      city: v.city || '',
      neighborhood: v.neighborhood || ''
    }));

    const location_types = ['indoor', 'outdoor', 'online', 'hybrid'].map((value) => ({
      value,
      label: this._getLocationTypeLabel(value)
    }));

    const accessibility_options = [
      {
        key: 'wheelchair_accessible',
        label: 'Wheelchair accessible',
        description: 'Events and venues that are wheelchair accessible.'
      }
    ];

    const sort_options = [
      { value: 'date_ascending', label: 'Date – Soonest first' },
      { value: 'start_time_ascending', label: 'Start time – Earliest first' },
      { value: 'price_low_to_high', label: 'Price – Low to High' },
      { value: 'price_high_to_low', label: 'Price – High to Low' },
      { value: 'rating_high_to_low', label: 'Rating – High to Low' }
    ];

    return {
      categories,
      audiences,
      time_of_day_options,
      price_ranges,
      venues: venueOptions,
      location_types,
      accessibility_options,
      sort_options
    };
  }

  // 3. searchEvents(filters, sort, pagination)
  searchEvents(filters, sort, pagination) {
    const events = this._getFromStorage('events');
    const venues = this._getFromStorage('venues');
    const scheduleItems = this._getFromStorage('schedule_items');
    const favoriteItems = this._getFromStorage('favorite_items');

    const f = filters || {};
    let results = events.slice();

    if (f.category) {
      results = results.filter((e) => e.category === f.category);
    }

    if (f.audience) {
      results = results.filter((e) => this._matchesAudience(e.audience, f.audience));
    }

    if (f.date) {
      results = results.filter((e) => this._getDateOnly(e.start_datetime) === f.date);
    }

    if (f.start_date) {
      results = results.filter((e) => {
        const d = this._getDateOnly(e.start_datetime);
        return d && d >= f.start_date;
      });
    }

    if (f.end_date) {
      results = results.filter((e) => {
        const d = this._getDateOnly(e.start_datetime);
        return d && d <= f.end_date;
      });
    }

    if (f.time_of_day) {
      results = results.filter((e) => e.time_of_day === f.time_of_day);
    }

    if (typeof f.max_price === 'number') {
      results = results.filter((e) => typeof e.price === 'number' && e.price <= f.max_price);
    }

    if (typeof f.min_price === 'number') {
      results = results.filter((e) => typeof e.price === 'number' && e.price >= f.min_price);
    }

    if (typeof f.is_free === 'boolean') {
      results = results.filter((e) => !!e.is_free === f.is_free);
    }

    if (f.venueId) {
      results = results.filter((e) => e.venue_id === f.venueId);
    }

    if (f.location_type) {
      results = results.filter((e) => e.location_type === f.location_type);
    }

    if (typeof f.wheelchair_accessible === 'boolean') {
      results = results.filter(
        (e) => !!e.wheelchair_accessible === f.wheelchair_accessible
      );
    }

    if (typeof f.rating_min === 'number') {
      results = results.filter((e) => (e.rating || 0) >= f.rating_min);
    }

    const sortKey = sort || 'date_ascending';
    results.sort((a, b) => {
      switch (sortKey) {
        case 'start_time_ascending':
        case 'date_ascending':
          return this._compareDateTimeAsc(a.start_datetime, b.start_datetime);
        case 'price_low_to_high': {
          const ap = typeof a.price === 'number' ? a.price : Number.MAX_SAFE_INTEGER;
          const bp = typeof b.price === 'number' ? b.price : Number.MAX_SAFE_INTEGER;
          return ap - bp;
        }
        case 'price_high_to_low': {
          const ap = typeof a.price === 'number' ? a.price : 0;
          const bp = typeof b.price === 'number' ? b.price : 0;
          return bp - ap;
        }
        case 'rating_high_to_low': {
          const ar = typeof a.rating === 'number' ? a.rating : 0;
          const br = typeof b.rating === 'number' ? b.rating : 0;
          if (br !== ar) return br - ar;
          return this._compareDateTimeAsc(a.start_datetime, b.start_datetime);
        }
        default:
          return this._compareDateTimeAsc(a.start_datetime, b.start_datetime);
      }
    });

    const page = (pagination && pagination.page) || 1;
    const page_size = (pagination && pagination.page_size) || 20;
    const total_count = results.length;
    const startIndex = (page - 1) * page_size;
    const endIndex = startIndex + page_size;
    const paged = results.slice(startIndex, endIndex);

    const mapped = paged.map((e) => {
      const venue = venues.find((v) => v.id === e.venue_id) || null;
      const is_in_schedule = scheduleItems.some(
        (s) => s.item_type === 'event' && s.item_id === e.id
      );
      const is_in_favorites = favoriteItems.some(
        (f) => f.item_type === 'event' && f.item_id === e.id
      );

      return {
        event_id: e.id,
        title: e.title,
        short_title: e.short_title || '',
        description_snippet: this._truncate(e.description || '', 160),
        start_datetime: e.start_datetime,
        end_datetime: e.end_datetime || null,
        time_of_day: e.time_of_day,
        time_of_day_label: this._getTimeOfDayLabel(e.time_of_day),
        category: e.category,
        category_label: this._getCategoryLabel(e.category),
        audience: e.audience,
        audience_label: this._getAudienceLabel(e.audience),
        price: typeof e.price === 'number' ? e.price : 0,
        is_free: !!e.is_free,
        currency: e.currency || 'USD',
        rating: typeof e.rating === 'number' ? e.rating : undefined,
        rating_count: typeof e.rating_count === 'number' ? e.rating_count : undefined,
        venue_id: e.venue_id,
        venue_name: venue ? venue.name : '',
        location_type: e.location_type,
        location_type_label: this._getLocationTypeLabel(e.location_type),
        wheelchair_accessible: !!e.wheelchair_accessible,
        image_url: e.image_url || '',
        is_in_schedule,
        is_in_favorites,
        // Foreign key resolution
        venue
      };
    });

    // Instrumentation for task completion tracking (task_4 and task_9)
    try {
      if (results && results.length > 0) {
        const now = new Date();
        const day = now.getDay();

        // Upcoming Wednesday (0=Sun,...,3=Wed)
        const diffToWed = (3 - day + 7) % 7;
        const upcomingWed = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate() + diffToWed
        );
        const upcomingWedStr = this._getDateOnly(upcomingWed.toISOString());

        // Task 4: senior indoor, wheelchair-accessible, upcoming Wednesday afternoon search
        if (
          f &&
          f.audience === 'seniors' &&
          f.location_type === 'indoor' &&
          f.wheelchair_accessible === true &&
          f.time_of_day === 'afternoon' &&
          f.date === upcomingWedStr
        ) {
          const value = { filters: f, sortKey, timestamp: this._nowIso() };
          localStorage.setItem(
            'task4_seniorIndoorSearchFilters',
            JSON.stringify(value)
          );
        }

        // Upcoming Friday (0=Sun,...,5=Fri)
        const diffToFri = (5 - day + 7) % 7;
        const upcomingFri = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate() + diffToFri
        );
        const upcomingFriStr = this._getDateOnly(upcomingFri.toISOString());

        // Task 9: low-cost Friday search at Riverside Cultural Center
        if (
          f &&
          f.date === upcomingFriStr &&
          typeof f.max_price === 'number' &&
          f.max_price <= 20 &&
          f.venueId
        ) {
          const venue = venues.find((v) => v.id === f.venueId) || null;
          if (venue && venue.name === 'Riverside Cultural Center') {
            const value2 = { filters: f, sortKey, timestamp: this._nowIso() };
            localStorage.setItem(
              'task9_lowCostFridaySearchFilters',
              JSON.stringify(value2)
            );
          }
        }
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      results: mapped,
      total_count,
      page,
      page_size
    };
  }

  // 4. getEventDetails(eventId)
  getEventDetails(eventId) {
    const events = this._getFromStorage('events');
    const venues = this._getFromStorage('venues');
    const scheduleItems = this._getFromStorage('schedule_items');
    const favoriteItems = this._getFromStorage('favorite_items');
    const rsvps = this._getFromStorage('rsvps');

    const e = events.find((ev) => ev.id === eventId) || null;
    if (!e) {
      return {
        event: null,
        venue: null,
        accessibility_info: null,
        state_flags: {
          is_in_schedule: false,
          is_in_favorites: false,
          has_submitted_rsvp: false
        }
      };
    }

    const venue = venues.find((v) => v.id === e.venue_id) || null;

    const eventView = {
      event_id: e.id,
      title: e.title,
      short_title: e.short_title || '',
      description: e.description || '',
      category: e.category,
      category_label: this._getCategoryLabel(e.category),
      audience: e.audience,
      audience_label: this._getAudienceLabel(e.audience),
      start_datetime: e.start_datetime,
      end_datetime: e.end_datetime || null,
      time_of_day: e.time_of_day,
      time_of_day_label: this._getTimeOfDayLabel(e.time_of_day),
      price: typeof e.price === 'number' ? e.price : 0,
      is_free: !!e.is_free,
      currency: e.currency || 'USD',
      location_type: e.location_type,
      location_type_label: this._getLocationTypeLabel(e.location_type),
      wheelchair_accessible: !!e.wheelchair_accessible,
      image_url: e.image_url || '',
      gallery_image_urls: e.gallery_image_urls || [],
      rating: typeof e.rating === 'number' ? e.rating : undefined,
      rating_count: typeof e.rating_count === 'number' ? e.rating_count : undefined,
      featured: !!e.featured
    };

    const venueView = venue
      ? {
          venue_id: venue.id,
          name: venue.name,
          address_line1: venue.address_line1,
          address_line2: venue.address_line2 || '',
          city: venue.city || '',
          state_province: venue.state_province || '',
          postal_code: venue.postal_code || '',
          country: venue.country || '',
          neighborhood: venue.neighborhood || '',
          map_embed_url: venue.map_embed_url || '',
          wheelchair_accessible: !!venue.wheelchair_accessible,
          accessibility_notes: venue.accessibility_notes || ''
        }
      : null;

    const accessibility_info = {
      event_wheelchair_accessible: !!e.wheelchair_accessible,
      venue_wheelchair_accessible: venue ? !!venue.wheelchair_accessible : false,
      combined_accessibility_notes:
        (venue && venue.accessibility_notes) || ''
    };

    const is_in_schedule = scheduleItems.some(
      (s) => s.item_type === 'event' && s.item_id === e.id
    );
    const is_in_favorites = favoriteItems.some(
      (f) => f.item_type === 'event' && f.item_id === e.id
    );
    const has_submitted_rsvp = rsvps.some((r) => r.event_id === e.id);

    // Instrumentation for task completion tracking (task_4 accessibility event viewed)
    try {
      const now = new Date();
      const day = now.getDay();
      const diffToWed = (3 - day + 7) % 7;
      const upcomingWed = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + diffToWed
      );
      const upcomingWedStr = this._getDateOnly(upcomingWed.toISOString());
      const eventDateStr = this._getDateOnly(eventView.start_datetime);

      if (
        eventView.audience === 'seniors' &&
        eventView.location_type === 'indoor' &&
        eventView.wheelchair_accessible === true &&
        eventView.time_of_day === 'afternoon' &&
        eventDateStr === upcomingWedStr
      ) {
        const value = { event_id: eventId, viewed_at: this._nowIso() };
        localStorage.setItem(
          'task4_accessibilityEventViewed',
          JSON.stringify(value)
        );
      }
    } catch (e2) {
      console.error('Instrumentation error:', e2);
    }

    return {
      event: eventView,
      venue: venueView,
      accessibility_info,
      state_flags: {
        is_in_schedule,
        is_in_favorites,
        has_submitted_rsvp
      }
    };
  }

  // 5. submitEventRSVP(eventId, attendee_name, attendee_email, number_of_attendees)
  submitEventRSVP(eventId, attendee_name, attendee_email, number_of_attendees) {
    const events = this._getFromStorage('events');
    const rsvps = this._getFromStorage('rsvps');

    const event = events.find((e) => e.id === eventId);
    if (!event) {
      return {
        success: false,
        message: 'Event not found.',
        rsvp: null
      };
    }

    const rsvpId = this._generateId('rsvp');
    const createdAt = this._nowIso();

    const rsvpRecord = {
      id: rsvpId,
      event_id: eventId,
      attendee_name,
      attendee_email,
      number_of_attendees,
      status: 'submitted',
      created_at: createdAt
    };

    rsvps.push(rsvpRecord);
    this._saveToStorage('rsvps', rsvps);

    return {
      success: true,
      message: 'RSVP submitted successfully.',
      rsvp: {
        rsvp_id: rsvpRecord.id,
        event_id: rsvpRecord.event_id,
        event_title: event.title,
        attendee_name: rsvpRecord.attendee_name,
        attendee_email: rsvpRecord.attendee_email,
        number_of_attendees: rsvpRecord.number_of_attendees,
        status: rsvpRecord.status,
        created_at: rsvpRecord.created_at,
        // Foreign key resolution
        event: event
      }
    };
  }

  // 6. addItemToMySchedule(item_type, item_id, source)
  addItemToMySchedule(item_type, item_id, source) {
    const scheduleItems = this._getFromStorage('schedule_items');

    if (item_type !== 'event' && item_type !== 'workshop') {
      return { success: false, message: 'Invalid item_type.', schedule_item: null };
    }

    let existing = scheduleItems.find(
      (s) => s.item_type === item_type && s.item_id === item_id
    );

    if (!existing) {
      const id = this._generateId('schedule');
      existing = {
        id,
        item_type,
        item_id,
        source,
        added_at: this._nowIso(),
        notes: ''
      };
      this._saveScheduleItemInternal(existing);
    }

    const view = this._buildScheduleItemView(existing);

    return {
      success: true,
      message: 'Item added to schedule.',
      schedule_item: view
    };
  }

  // 7. removeItemFromMySchedule(schedule_item_id)
  removeItemFromMySchedule(schedule_item_id) {
    const scheduleItems = this._getFromStorage('schedule_items');
    const idx = scheduleItems.findIndex((s) => s.id === schedule_item_id);
    if (idx === -1) {
      return {
        success: false,
        message: 'Schedule item not found.',
        remaining_schedule_count: scheduleItems.length
      };
    }
    scheduleItems.splice(idx, 1);
    this._saveToStorage('schedule_items', scheduleItems);

    return {
      success: true,
      message: 'Schedule item removed.',
      remaining_schedule_count: scheduleItems.length
    };
  }

  // 8. getCalendarDayEvents(date, filters)
  getCalendarDayEvents(date, filters) {
    const events = this._getFromStorage('events');
    const scheduleItems = this._getFromStorage('schedule_items');
    const venues = this._getFromStorage('venues');

    const f = filters || {};

    let dayEvents = events.filter((e) => this._getDateOnly(e.start_datetime) === date);

    if (typeof f.max_price === 'number') {
      dayEvents = dayEvents.filter((e) => typeof e.price === 'number' && e.price <= f.max_price);
    }
    if (typeof f.is_free === 'boolean') {
      dayEvents = dayEvents.filter((e) => !!e.is_free === f.is_free);
    }
    if (f.time_of_day) {
      dayEvents = dayEvents.filter((e) => e.time_of_day === f.time_of_day);
    }

    const eventsView = dayEvents
      .slice()
      .sort((a, b) => this._compareDateTimeAsc(a.start_datetime, b.start_datetime))
      .map((e) => {
        const venue = venues.find((v) => v.id === e.venue_id) || null;
        const is_in_schedule = scheduleItems.some(
          (s) => s.item_type === 'event' && s.item_id === e.id
        );
        return {
          event_id: e.id,
          title: e.title,
          start_datetime: e.start_datetime,
          end_datetime: e.end_datetime || null,
          time_of_day_label: this._getTimeOfDayLabel(e.time_of_day),
          category_label: this._getCategoryLabel(e.category),
          audience_label: this._getAudienceLabel(e.audience),
          price: typeof e.price === 'number' ? e.price : 0,
          is_free: !!e.is_free,
          venue_name: venue ? venue.name : '',
          is_in_schedule
        };
      });

    return {
      date,
      filters_applied: {
        max_price: typeof f.max_price === 'number' ? f.max_price : undefined,
        is_free: typeof f.is_free === 'boolean' ? f.is_free : undefined,
        time_of_day: f.time_of_day || undefined
      },
      events: eventsView
    };
  }

  // 9. getMyScheduleAndSavedItems()
  getMyScheduleAndSavedItems() {
    const scheduleItemsRaw = this._getFromStorage('schedule_items');
    const favoriteItemsRaw = this._getFromStorage('favorite_items');

    const scheduleViews = scheduleItemsRaw.map((s) => this._buildScheduleItemView(s));
    const favoritesViews = favoriteItemsRaw.map((f) => this._buildFavoriteItemView(f));

    // Group schedule by date
    const groups = {};
    scheduleViews.forEach((item) => {
      const date = this._getDateOnly(item.start_datetime) || 'unscheduled';
      if (!groups[date]) groups[date] = [];
      groups[date].push(item);
    });

    const schedule_by_date = Object.keys(groups)
      .sort()
      .map((date) => ({
        date,
        date_label: this._formatDateLabel(date),
        items: groups[date]
      }));

    return {
      schedule_by_date,
      favorites: favoritesViews
    };
  }

  // 10. addItemToFavorites(item_type, item_id, label)
  addItemToFavorites(item_type, item_id, label) {
    const favoriteItems = this._getFromStorage('favorite_items');

    if (item_type !== 'event' && item_type !== 'workshop') {
      return { success: false, message: 'Invalid item_type.', favorite_item: null };
    }

    let existing = favoriteItems.find(
      (f) => f.item_type === item_type && f.item_id === item_id
    );

    if (!existing) {
      const id = this._generateId('favorite');
      existing = {
        id,
        item_type,
        item_id,
        added_at: this._nowIso(),
        label: label || ''
      };
      this._saveFavoriteItemInternal(existing);
    } else if (typeof label === 'string') {
      existing.label = label;
      this._saveFavoriteItemInternal(existing);
    }

    const view = this._buildFavoriteItemView(existing);

    return {
      success: true,
      message: 'Item added to favorites.',
      favorite_item: view
    };
  }

  // 11. removeFavoriteItem(favorite_item_id)
  removeFavoriteItem(favorite_item_id) {
    const favoriteItems = this._getFromStorage('favorite_items');
    const idx = favoriteItems.findIndex((f) => f.id === favorite_item_id);
    if (idx === -1) {
      return {
        success: false,
        message: 'Favorite item not found.',
        remaining_favorites_count: favoriteItems.length
      };
    }
    favoriteItems.splice(idx, 1);
    this._saveToStorage('favorite_items', favoriteItems);

    return {
      success: true,
      message: 'Favorite item removed.',
      remaining_favorites_count: favoriteItems.length
    };
  }

  // 12. getWorkshopFilterOptions()
  getWorkshopFilterOptions() {
    const categories = [
      'arts_crafts',
      'music',
      'dance',
      'theatre',
      'digital_media',
      'other'
    ].map((value) => ({ value, label: this._getCategoryLabel(value) }));

    const audiences = [
      'kids_children',
      'families_all_ages',
      'seniors',
      'adults',
      'all_ages',
      'teens'
    ].map((value) => ({ value, label: this._getAudienceLabel(value) }));

    const date_range_presets = [
      { value: 'this_week', label: 'This week' },
      { value: 'next_month', label: 'Next month' }
    ];

    const price_ranges = [
      { id: 'free', label: 'Free', min: 0, max: 0 },
      { id: 'under_10', label: 'Under $10', min: 0, max: 10 },
      { id: 'under_20', label: 'Under $20', min: 0, max: 20 },
      { id: 'under_40', label: 'Under $40', min: 0, max: 40 }
    ];

    const rating_options = [
      { label: '4 stars & up', min_rating: 4 },
      { label: '3 stars & up', min_rating: 3 }
    ];

    const duration_ranges = [
      { id: 'up_to_60', label: 'Up to 1 hour', min_minutes: 0, max_minutes: 60 },
      { id: '60_to_120', label: '1–2 hours', min_minutes: 60, max_minutes: 120 },
      { id: 'over_120', label: 'Over 2 hours', min_minutes: 121, max_minutes: 9999 }
    ];

    const time_of_day_options = ['morning', 'afternoon', 'evening'].map((value) => ({
      value,
      label: this._getTimeOfDayLabel(value)
    }));

    const sort_options = [
      { value: 'duration_long_to_short', label: 'Duration – Long to Short' },
      { value: 'rating_high_to_low', label: 'Rating – High to Low' },
      { value: 'date_ascending', label: 'Date – Soonest first' },
      { value: 'price_low_to_high', label: 'Price – Low to High' }
    ];

    return {
      categories,
      audiences,
      date_range_presets,
      price_ranges,
      rating_options,
      duration_ranges,
      time_of_day_options,
      sort_options
    };
  }

  // 13. searchWorkshops(filters, sort, pagination)
  searchWorkshops(filters, sort, pagination) {
    const workshops = this._getFromStorage('workshops');
    const venues = this._getFromStorage('venues');
    const favoriteItems = this._getFromStorage('favorite_items');

    const f = filters || {};
    let results = workshops.slice();

    if (f.category) {
      results = results.filter((w) => w.category === f.category);
    }

    if (f.audience) {
      results = results.filter((w) => this._matchesAudience(w.audience, f.audience));
    }

    // Date range
    let startDate = f.start_date || null;
    let endDate = f.end_date || null;

    if (f.date_range_preset === 'next_month') {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth();
      const nextMonthFirst = new Date(year, month + 1, 1);
      const nextMonthLast = new Date(year, month + 2, 0);
      startDate = this._getDateOnly(nextMonthFirst.toISOString());
      endDate = this._getDateOnly(nextMonthLast.toISOString());
    } else if (f.date_range_preset === 'this_week') {
      const now = new Date();
      const day = now.getDay() || 7; // Monday-based if needed
      const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (day - 1));
      const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6);
      startDate = this._getDateOnly(monday.toISOString());
      endDate = this._getDateOnly(sunday.toISOString());
    }

    if (startDate) {
      results = results.filter((w) => {
        const d = this._getDateOnly(w.start_datetime);
        return d && d >= startDate;
      });
    }
    if (endDate) {
      results = results.filter((w) => {
        const d = this._getDateOnly(w.start_datetime);
        return d && d <= endDate;
      });
    }

    if (f.time_of_day) {
      results = results.filter((w) => w.time_of_day === f.time_of_day);
    }

    if (typeof f.max_price === 'number') {
      results = results.filter((w) => typeof w.price === 'number' && w.price <= f.max_price);
    }
    if (typeof f.min_price === 'number') {
      results = results.filter((w) => typeof w.price === 'number' && w.price >= f.min_price);
    }

    if (typeof f.is_free === 'boolean') {
      results = results.filter((w) => !!w.is_free === f.is_free);
    }

    if (typeof f.rating_min === 'number') {
      results = results.filter((w) => (w.rating || 0) >= f.rating_min);
    }

    if (typeof f.duration_min === 'number') {
      results = results.filter(
        (w) => typeof w.duration_minutes === 'number' && w.duration_minutes >= f.duration_min
      );
    }
    if (typeof f.duration_max === 'number') {
      results = results.filter(
        (w) => typeof w.duration_minutes === 'number' && w.duration_minutes <= f.duration_max
      );
    }

    const sortKey = sort || 'date_ascending';
    results.sort((a, b) => {
      switch (sortKey) {
        case 'duration_long_to_short': {
          const ad = typeof a.duration_minutes === 'number' ? a.duration_minutes : 0;
          const bd = typeof b.duration_minutes === 'number' ? b.duration_minutes : 0;
          return bd - ad;
        }
        case 'rating_high_to_low': {
          const ar = typeof a.rating === 'number' ? a.rating : 0;
          const br = typeof b.rating === 'number' ? b.rating : 0;
          if (br !== ar) return br - ar;
          return this._compareDateTimeAsc(a.start_datetime, b.start_datetime);
        }
        case 'price_low_to_high': {
          const ap = typeof a.price === 'number' ? a.price : Number.MAX_SAFE_INTEGER;
          const bp = typeof b.price === 'number' ? b.price : Number.MAX_SAFE_INTEGER;
          return ap - bp;
        }
        case 'date_ascending':
        default:
          return this._compareDateTimeAsc(a.start_datetime, b.start_datetime);
      }
    });

    const page = (pagination && pagination.page) || 1;
    const page_size = (pagination && pagination.page_size) || 20;
    const total_count = results.length;
    const startIndex = (page - 1) * page_size;
    const endIndex = startIndex + page_size;
    const paged = results.slice(startIndex, endIndex);

    const mapped = paged.map((w) => {
      const venue = venues.find((v) => v.id === w.venue_id) || null;
      const is_in_favorites = favoriteItems.some(
        (f) => f.item_type === 'workshop' && f.item_id === w.id
      );
      return {
        workshop_id: w.id,
        title: w.title,
        short_title: w.short_title || '',
        description_snippet: this._truncate(w.description || '', 160),
        start_datetime: w.start_datetime,
        end_datetime: w.end_datetime || null,
        duration_minutes: w.duration_minutes,
        time_of_day: w.time_of_day,
        time_of_day_label: this._getTimeOfDayLabel(w.time_of_day),
        category: w.category,
        category_label: this._getCategoryLabel(w.category),
        audience: w.audience,
        audience_label: this._getAudienceLabel(w.audience),
        price: typeof w.price === 'number' ? w.price : 0,
        is_free: !!w.is_free,
        currency: w.currency || 'USD',
        rating: typeof w.rating === 'number' ? w.rating : undefined,
        rating_count: typeof w.rating_count === 'number' ? w.rating_count : undefined,
        venue_id: w.venue_id,
        venue_name: venue ? venue.name : '',
        image_url: w.image_url || '',
        wheelchair_accessible: !!w.wheelchair_accessible,
        is_in_favorites,
        // Foreign key resolution
        venue
      };
    });

    return {
      results: mapped,
      total_count,
      page,
      page_size
    };
  }

  // 14. getWorkshopDetails(workshopId)
  getWorkshopDetails(workshopId) {
    const workshops = this._getFromStorage('workshops');
    const venues = this._getFromStorage('venues');
    const scheduleItems = this._getFromStorage('schedule_items');
    const favoriteItems = this._getFromStorage('favorite_items');

    const w = workshops.find((ws) => ws.id === workshopId) || null;
    if (!w) {
      return {
        workshop: null,
        venue: null,
        state_flags: {
          is_in_schedule: false,
          is_in_favorites: false
        }
      };
    }

    const venue = venues.find((v) => v.id === w.venue_id) || null;

    const workshopView = {
      workshop_id: w.id,
      title: w.title,
      short_title: w.short_title || '',
      description: w.description || '',
      category: w.category,
      category_label: this._getCategoryLabel(w.category),
      audience: w.audience,
      audience_label: this._getAudienceLabel(w.audience),
      start_datetime: w.start_datetime,
      end_datetime: w.end_datetime || null,
      duration_minutes: w.duration_minutes,
      time_of_day: w.time_of_day,
      time_of_day_label: this._getTimeOfDayLabel(w.time_of_day),
      price: typeof w.price === 'number' ? w.price : 0,
      is_free: !!w.is_free,
      currency: w.currency || 'USD',
      rating: typeof w.rating === 'number' ? w.rating : undefined,
      rating_count: typeof w.rating_count === 'number' ? w.rating_count : undefined,
      image_url: w.image_url || '',
      featured: !!w.featured
    };

    const venueView = venue
      ? {
          venue_id: venue.id,
          name: venue.name,
          address_line1: venue.address_line1,
          city: venue.city || '',
          neighborhood: venue.neighborhood || ''
        }
      : null;

    const is_in_schedule = scheduleItems.some(
      (s) => s.item_type === 'workshop' && s.item_id === w.id
    );
    const is_in_favorites = favoriteItems.some(
      (f) => f.item_type === 'workshop' && f.item_id === w.id
    );

    return {
      workshop: workshopView,
      venue: venueView,
      state_flags: {
        is_in_schedule,
        is_in_favorites
      }
    };
  }

  // 15. submitWorkshopRegistration(workshopId, registrant_name, registrant_email, number_of_attendees)
  submitWorkshopRegistration(workshopId, registrant_name, registrant_email, number_of_attendees) {
    const workshops = this._getFromStorage('workshops');
    const registrations = this._getFromStorage('workshop_registrations');

    const workshop = workshops.find((w) => w.id === workshopId);
    if (!workshop) {
      return {
        success: false,
        message: 'Workshop not found.',
        registration: null
      };
    }

    const regId = this._generateId('workshopreg');
    const createdAt = this._nowIso();
    const count = typeof number_of_attendees === 'number' && number_of_attendees > 0 ? number_of_attendees : 1;

    const regRecord = {
      id: regId,
      workshop_id: workshopId,
      registrant_name,
      registrant_email,
      number_of_attendees: count,
      status: 'submitted',
      created_at: createdAt
    };

    registrations.push(regRecord);
    this._saveToStorage('workshop_registrations', registrations);

    return {
      success: true,
      message: 'Workshop registration submitted successfully.',
      registration: {
        registration_id: regRecord.id,
        workshop_id: regRecord.workshop_id,
        workshop_title: workshop.title,
        registrant_name: regRecord.registrant_name,
        registrant_email: regRecord.registrant_email,
        number_of_attendees: regRecord.number_of_attendees,
        status: regRecord.status,
        created_at: regRecord.created_at,
        // Foreign key resolution
        workshop
      }
    };
  }

  // 16. getFestivalPassBuilderConfig()
  getFestivalPassBuilderConfig() {
    const available_pass_types = [
      {
        pass_type: 'create_your_own_3_event_pass',
        label: 'Create Your Own 3-Event Pass',
        description: 'Pick exactly 3 eligible events, each priced at $25 or less.',
        max_events: 3,
        per_event_price_cap: 25,
        requires_distinct_categories: true
      }
    ];

    const default_pass_type = 'create_your_own_3_event_pass';

    const category_options = [
      'music',
      'dance',
      'theatre',
      'arts_crafts',
      'community_festival',
      'film',
      'lecture',
      'family_activity',
      'other'
    ].map((value) => ({ value, label: this._getCategoryLabel(value) }));

    const price_cap_default = 25;

    return {
      available_pass_types,
      default_pass_type,
      category_options,
      price_cap_default
    };
  }

  // 17. searchFestivalPassEligibleEvents(pass_type, filters, sort, pagination)
  searchFestivalPassEligibleEvents(pass_type, filters, sort, pagination) {
    const config = this._getPassTypeConfig(pass_type);
    const events = this._getFromStorage('events');

    const passDraft = this._getOrCreateFestivalPassDraft(pass_type);
    const passEvents = this._getFromStorage('festival_pass_events').filter(
      (pe) => pe.festival_pass_id === passDraft.id
    );

    const f = filters || {};
    let results = events.slice();

    if (f.category) {
      results = results.filter((e) => e.category === f.category);
    }

    // Price cap: obey both pass config and filters.max_price if provided (use the lower)
    let priceCap = config.per_event_price_cap;
    if (typeof f.max_price === 'number') {
      priceCap = Math.min(priceCap, f.max_price);
    }

    if (priceCap != null) {
      results = results.filter(
        (e) => typeof e.price === 'number' && e.price <= priceCap
      );
    }

    if (f.date) {
      results = results.filter((e) => this._getDateOnly(e.start_datetime) === f.date);
    }
    if (f.start_date) {
      results = results.filter((e) => {
        const d = this._getDateOnly(e.start_datetime);
        return d && d >= f.start_date;
      });
    }
    if (f.end_date) {
      results = results.filter((e) => {
        const d = this._getDateOnly(e.start_datetime);
        return d && d <= f.end_date;
      });
    }

    if (f.time_of_day) {
      results = results.filter((e) => e.time_of_day === f.time_of_day);
    }

    const sortKey = sort || 'date_ascending';
    results.sort((a, b) => {
      switch (sortKey) {
        case 'price_low_to_high': {
          const ap = typeof a.price === 'number' ? a.price : Number.MAX_SAFE_INTEGER;
          const bp = typeof b.price === 'number' ? b.price : Number.MAX_SAFE_INTEGER;
          return ap - bp;
        }
        case 'rating_high_to_low': {
          const ar = typeof a.rating === 'number' ? a.rating : 0;
          const br = typeof b.rating === 'number' ? b.rating : 0;
          if (br !== ar) return br - ar;
          return this._compareDateTimeAsc(a.start_datetime, b.start_datetime);
        }
        case 'date_ascending':
        default:
          return this._compareDateTimeAsc(a.start_datetime, b.start_datetime);
      }
    });

    const page = (pagination && pagination.page) || 1;
    const page_size = (pagination && pagination.page_size) || 20;
    const total_count = results.length;
    const startIndex = (page - 1) * page_size;
    const endIndex = startIndex + page_size;
    const paged = results.slice(startIndex, endIndex);

    const venues = this._getFromStorage('venues');

    const mapped = paged.map((e) => {
      const venue = venues.find((v) => v.id === e.venue_id) || null;
      const selected = passEvents.find((pe) => pe.event_id === e.id);
      return {
        event_id: e.id,
        title: e.title,
        start_datetime: e.start_datetime,
        time_of_day_label: this._getTimeOfDayLabel(e.time_of_day),
        category: e.category,
        category_label: this._getCategoryLabel(e.category),
        price: typeof e.price === 'number' ? e.price : 0,
        is_free: !!e.is_free,
        venue_name: venue ? venue.name : '',
        rating: typeof e.rating === 'number' ? e.rating : undefined,
        rating_count: typeof e.rating_count === 'number' ? e.rating_count : undefined,
        is_already_selected: !!selected,
        selection_order: selected ? selected.selection_order : null,
        // Foreign key resolution
        venue
      };
    });

    return {
      results: mapped,
      total_count,
      page,
      page_size
    };
  }

  // 18. addEventToFestivalPassSelection(pass_type, event_id)
  addEventToFestivalPassSelection(pass_type, event_id) {
    const config = this._getPassTypeConfig(pass_type);
    const events = this._getFromStorage('events');
    const event = events.find((e) => e.id === event_id);
    if (!event) {
      return {
        success: false,
        message: 'Event not found.',
        pass_selection_summary: null
      };
    }

    const passDraft = this._getOrCreateFestivalPassDraft(pass_type);
    const passEvents = this._getFromStorage('festival_pass_events');
    const existingForPass = passEvents.filter((pe) => pe.festival_pass_id === passDraft.id);

    const alreadySelected = existingForPass.find((pe) => pe.event_id === event_id);
    if (alreadySelected) {
      const summary = this._buildFestivalPassSelectionSummary(passDraft, config);
      return {
        success: true,
        message: 'Event is already in the pass selection.',
        pass_selection_summary: summary
      };
    }

    if (config.max_events && existingForPass.length >= config.max_events) {
      const summary = this._buildFestivalPassSelectionSummary(passDraft, config);
      return {
        success: false,
        message: 'Maximum number of events already selected for this pass.',
        pass_selection_summary: summary
      };
    }

    if (
      config.per_event_price_cap != null &&
      (typeof event.price !== 'number' || event.price > config.per_event_price_cap)
    ) {
      const summary = this._buildFestivalPassSelectionSummary(passDraft, config);
      return {
        success: false,
        message: 'Event price exceeds the allowed cap for this pass.',
        pass_selection_summary: summary
      };
    }

    if (config.requires_distinct_categories) {
      const existingCats = existingForPass.map((pe) => pe.event_category);
      if (existingCats.indexOf(event.category) !== -1) {
        const summary = this._buildFestivalPassSelectionSummary(passDraft, config);
        return {
          success: false,
          message: 'Each selected event must be from a different category.',
          pass_selection_summary: summary
        };
      }
    }

    const newPassEvent = {
      id: this._generateId('festivalpassevt'),
      festival_pass_id: passDraft.id,
      event_id: event.id,
      event_category: event.category,
      event_price: typeof event.price === 'number' ? event.price : 0,
      selection_order: existingForPass.length + 1
    };

    passEvents.push(newPassEvent);
    this._saveToStorage('festival_pass_events', passEvents);

    const summary = this._buildFestivalPassSelectionSummary(passDraft, config);

    return {
      success: true,
      message: 'Event added to festival pass selection.',
      pass_selection_summary: summary
    };
  }

  // 19. removeEventFromFestivalPassSelection(event_id)
  removeEventFromFestivalPassSelection(event_id) {
    const state = this._getOrCreateSingleUserStateStore();
    if (!state.festival_pass_draft_id) {
      return {
        success: false,
        message: 'No active festival pass draft.',
        pass_selection_summary: null
      };
    }

    const passes = this._getFromStorage('festival_passes');
    const passDraft = passes.find((p) => p.id === state.festival_pass_draft_id);
    if (!passDraft) {
      return {
        success: false,
        message: 'Festival pass draft not found.',
        pass_selection_summary: null
      };
    }

    const config = this._getPassTypeConfig(passDraft.pass_type);

    const passEvents = this._getFromStorage('festival_pass_events');
    const remaining = passEvents.filter(
      (pe) => !(pe.festival_pass_id === passDraft.id && pe.event_id === event_id)
    );

    // Re-sequence selection_order for this pass
    let order = 1;
    remaining
      .filter((pe) => pe.festival_pass_id === passDraft.id)
      .sort((a, b) => a.selection_order - b.selection_order)
      .forEach((pe) => {
        pe.selection_order = order++;
      });

    this._saveToStorage('festival_pass_events', remaining);

    const summary = this._buildFestivalPassSelectionSummary(passDraft, config);

    return {
      success: true,
      message: 'Event removed from festival pass selection.',
      pass_selection_summary: summary
    };
  }

  // 20. getFestivalPassSelectionSummary()
  getFestivalPassSelectionSummary() {
    const state = this._getOrCreateSingleUserStateStore();
    const passes = this._getFromStorage('festival_passes');
    const passDraft = state.festival_pass_draft_id
      ? passes.find((p) => p.id === state.festival_pass_draft_id)
      : null;

    if (!passDraft) {
      return {
        pass_selection_summary: null
      };
    }

    const config = this._getPassTypeConfig(passDraft.pass_type);
    const summary = this._buildFestivalPassSelectionSummary(passDraft, config);

    return {
      pass_selection_summary: summary
    };
  }

  // 21. finalizeFestivalPassOrder(contact_name, contact_email, quantity, notes)
  finalizeFestivalPassOrder(contact_name, contact_email, quantity, notes) {
    const state = this._getOrCreateSingleUserStateStore();
    const passes = this._getFromStorage('festival_passes');
    const passDraft = state.festival_pass_draft_id
      ? passes.find((p) => p.id === state.festival_pass_draft_id)
      : null;

    if (!passDraft) {
      return {
        success: false,
        message: 'No active festival pass draft to finalize.',
        festival_pass: null,
        selected_events: []
      };
    }

    const config = this._getPassTypeConfig(passDraft.pass_type);
    const summary = this._buildFestivalPassSelectionSummary(passDraft, config);

    if (!summary.selection_valid) {
      return {
        success: false,
        message: 'Festival pass selection is not valid: ' + summary.validation_errors.join(' '),
        festival_pass: null,
        selected_events: summary.selected_events
      };
    }

    const qty = typeof quantity === 'number' && quantity > 0 ? quantity : 1;
    const total_price = summary.estimated_total_price * qty;

    const passesUpdated = passes.slice();
    const idx = passesUpdated.findIndex((p) => p.id === passDraft.id);
    if (idx === -1) {
      return {
        success: false,
        message: 'Festival pass draft not found.',
        festival_pass: null,
        selected_events: summary.selected_events
      };
    }

    const updatedPass = Object.assign({}, passDraft, {
      contact_name,
      contact_email,
      quantity: qty,
      total_price,
      status: 'confirmed',
      name: config.label,
      notes: notes || passDraft.notes || ''
    });

    passesUpdated[idx] = updatedPass;
    this._saveToStorage('festival_passes', passesUpdated);

    // Clear draft id so a new builder session can start fresh later
    this._updateSingleUserStateStore({ festival_pass_draft_id: null });

    return {
      success: true,
      message: 'Festival pass order completed successfully.',
      festival_pass: {
        festival_pass_id: updatedPass.id,
        pass_type: updatedPass.pass_type,
        name: updatedPass.name,
        contact_name: updatedPass.contact_name,
        contact_email: updatedPass.contact_email,
        quantity: updatedPass.quantity,
        total_price: updatedPass.total_price,
        status: updatedPass.status,
        created_at: updatedPass.created_at
      },
      selected_events: summary.selected_events
    };
  }

  // 22. getVolunteerFilterOptions()
  getVolunteerFilterOptions() {
    const opportunities = this._getFromStorage('volunteer_opportunities');
    const events = this._getFromStorage('events');
    const venues = this._getFromStorage('venues');

    const oppViews = opportunities.map((o) => {
      const event = o.event_id ? events.find((e) => e.id === o.event_id) : null;
      const venue = o.venue_id ? venues.find((v) => v.id === o.venue_id) : null;
      return {
        opportunity_id: o.id,
        name: o.name,
        description: o.description || '',
        event_title: event ? event.title : '',
        venue_name: venue ? venue.name : '',
        is_active: !!o.is_active,
        // Foreign key resolution
        event,
        venue
      };
    });

    const date_presets = [
      {
        value: 'upcoming_saturdays',
        label: 'Upcoming Saturdays',
        description: 'Volunteer shifts on upcoming Saturdays.'
      }
    ];

    const shift_time_of_day_options = ['morning', 'afternoon', 'evening'].map((value) => ({
      value,
      label: this._getShiftTimeOfDayLabel(value)
    }));

    const duration_options = [
      { id: 'four_hours_or_less', label: '4 hours or less', max_minutes: 240 },
      { id: 'two_hours_or_less', label: '2 hours or less', max_minutes: 120 }
    ];

    const sort_options = [
      { value: 'start_time_earliest_first', label: 'Start time – Earliest first' },
      { value: 'start_time_latest_first', label: 'Start time – Latest first' }
    ];

    return {
      opportunities: oppViews,
      date_presets,
      shift_time_of_day_options,
      duration_options,
      sort_options
    };
  }

  // 23. searchVolunteerShifts(filters, sort, pagination)
  searchVolunteerShifts(filters, sort, pagination) {
    const shifts = this._getFromStorage('volunteer_shifts');
    const opportunities = this._getFromStorage('volunteer_opportunities');
    const events = this._getFromStorage('events');
    const venues = this._getFromStorage('venues');

    const f = filters || {};
    let results = shifts.slice();

    if (f.opportunity_id) {
      results = results.filter((s) => s.opportunity_id === f.opportunity_id);
    }

    if (f.date) {
      results = results.filter((s) => this._getDateOnly(s.start_datetime) === f.date);
    }

    if (f.date_preset === 'upcoming_saturdays') {
      const now = new Date();
      results = results.filter((s) => {
        const d = new Date(s.start_datetime);
        if (isNaN(d.getTime())) return false;
        if (d < now) return false;
        return d.getDay() === 6; // Saturday
      });
    }

    if (f.shift_time_of_day) {
      results = results.filter((s) => s.shift_time_of_day === f.shift_time_of_day);
    }

    if (typeof f.duration_max === 'number') {
      results = results.filter(
        (s) => typeof s.duration_minutes === 'number' && s.duration_minutes <= f.duration_max
      );
    }

    if (typeof f.duration_min === 'number') {
      results = results.filter(
        (s) => typeof s.duration_minutes === 'number' && s.duration_minutes >= f.duration_min
      );
    }

    const sortKey = sort || 'start_time_earliest_first';
    results.sort((a, b) => {
      const cmp = this._compareDateTimeAsc(a.start_datetime, b.start_datetime);
      if (sortKey === 'start_time_latest_first') return -cmp;
      return cmp;
    });

    const page = (pagination && pagination.page) || 1;
    const page_size = (pagination && pagination.page_size) || 20;
    const total_count = results.length;
    const startIndex = (page - 1) * page_size;
    const endIndex = startIndex + page_size;
    const paged = results.slice(startIndex, endIndex);

    const mapped = paged.map((s) => {
      const opp = opportunities.find((o) => o.id === s.opportunity_id) || null;
      let venue = null;
      if (opp && opp.venue_id) {
        venue = venues.find((v) => v.id === opp.venue_id) || null;
      } else if (opp && opp.event_id) {
        const ev = events.find((e) => e.id === opp.event_id) || null;
        if (ev) {
          venue = venues.find((v) => v.id === ev.venue_id) || null;
        }
      }

      return {
        shift_id: s.id,
        opportunity_id: s.opportunity_id,
        opportunity_name: opp ? opp.name : '',
        start_datetime: s.start_datetime,
        end_datetime: s.end_datetime,
        duration_minutes: s.duration_minutes,
        shift_time_of_day: s.shift_time_of_day,
        shift_time_of_day_label: this._getShiftTimeOfDayLabel(s.shift_time_of_day),
        spots_remaining: typeof s.spots_remaining === 'number' ? s.spots_remaining : undefined,
        is_full: !!s.is_full,
        available_roles: s.available_roles || [],
        venue_name: venue ? venue.name : '',
        // Foreign key resolution
        opportunity: opp,
        venue
      };
    });

    return {
      results: mapped,
      total_count,
      page,
      page_size
    };
  }

  // 24. submitVolunteerSignup(shift_id, preferred_role, name, phone, email)
  submitVolunteerSignup(shift_id, preferred_role, name, phone, email) {
    const shifts = this._getFromStorage('volunteer_shifts');
    const opportunities = this._getFromStorage('volunteer_opportunities');

    const shift = shifts.find((s) => s.id === shift_id);
    if (!shift) {
      return {
        success: false,
        message: 'Volunteer shift not found.',
        signup: null
      };
    }

    if (shift.is_full) {
      // Still allow signup if desired, but we respect is_full
      // For this implementation, we will still submit as 'submitted'
    }

    const signupId = this._generateId('volsignup');
    const createdAt = this._nowIso();

    const signupRecord = {
      id: signupId,
      shift_id,
      preferred_role: preferred_role || '',
      name,
      phone,
      email,
      status: 'submitted',
      created_at: createdAt
    };

    this._saveVolunteerSignupInternal(signupRecord);

    const opp = opportunities.find((o) => o.id === shift.opportunity_id) || null;

    return {
      success: true,
      message: 'Volunteer signup submitted successfully.',
      signup: {
        volunteer_signup_id: signupRecord.id,
        shift_id: signupRecord.shift_id,
        opportunity_name: opp ? opp.name : '',
        shift_start_datetime: shift.start_datetime,
        shift_end_datetime: shift.end_datetime,
        duration_minutes: shift.duration_minutes,
        preferred_role: signupRecord.preferred_role,
        name: signupRecord.name,
        phone: signupRecord.phone,
        email: signupRecord.email,
        status: signupRecord.status,
        created_at: signupRecord.created_at,
        // Foreign key resolution
        shift,
        opportunity: opp
      }
    };
  }

  // 25. getNewsletterOptions()
  getNewsletterOptions() {
    const languages = [
      { value: 'english', label: 'English' },
      { value: 'spanish', label: 'Español' }
    ];

    const frequencies = [
      {
        value: 'monthly_events_digest',
        label: 'Monthly events digest',
        description: 'Highlights of upcoming events once a month.'
      },
      {
        value: 'weekly_events_digest',
        label: 'Weekly events digest',
        description: 'A weekly overview of new and upcoming events.'
      },
      {
        value: 'occasional_announcements',
        label: 'Occasional announcements',
        description: 'Important announcements only.'
      }
    ];

    const interests = [
      { value: 'music', label: 'Music', description: 'Concerts, performances, and jams.' },
      { value: 'dance', label: 'Dance', description: 'Dance performances and classes.' },
      { value: 'theatre', label: 'Theatre', description: 'Plays, readings, and improv.' },
      { value: 'arts_crafts', label: 'Arts & Crafts', description: 'Hands-on creative workshops.' },
      { value: 'kids_children', label: 'Kids / Children', description: 'Activities for kids.' },
      { value: 'families_all_ages', label: 'Families / All ages', description: 'Family-friendly events.' },
      { value: 'seniors', label: 'Seniors', description: 'Programs for older adults.' },
      { value: 'volunteer_opportunities', label: 'Volunteer opportunities', description: 'Help out at events.' }
    ];

    return {
      languages,
      frequencies,
      interests
    };
  }

  // 26. submitNewsletterSubscription(name, email, language, frequency, interests)
  submitNewsletterSubscription(name, email, language, frequency, interests) {
    const id = this._generateId('newsletter');
    const createdAt = this._nowIso();

    const subscriptionRecord = {
      id,
      name,
      email,
      language,
      frequency,
      interests: Array.isArray(interests) ? interests.slice() : [],
      created_at: createdAt
    };

    this._saveNewsletterSubscriptionInternal(subscriptionRecord);

    return {
      success: true,
      message: 'Newsletter subscription saved.',
      subscription: {
        subscription_id: subscriptionRecord.id,
        name: subscriptionRecord.name,
        email: subscriptionRecord.email,
        language: subscriptionRecord.language,
        frequency: subscriptionRecord.frequency,
        interests: subscriptionRecord.interests,
        created_at: subscriptionRecord.created_at
      }
    };
  }

  // 27. getVenueDetailsAndTransit(venueId)
  getVenueDetailsAndTransit(venueId) {
    const venues = this._getFromStorage('venues');
    const transitRoutes = this._getFromStorage('transit_routes');
    const events = this._getFromStorage('events');

    const venue = venues.find((v) => v.id === venueId) || null;
    if (!venue) {
      return {
        venue: null,
        transit_routes: [],
        upcoming_events: []
      };
    }

    const venueView = {
      venue_id: venue.id,
      name: venue.name,
      description: venue.description || '',
      address_line1: venue.address_line1,
      address_line2: venue.address_line2 || '',
      city: venue.city || '',
      state_province: venue.state_province || '',
      postal_code: venue.postal_code || '',
      country: venue.country || '',
      neighborhood: venue.neighborhood || '',
      map_embed_url: venue.map_embed_url || '',
      phone: venue.phone || '',
      email: venue.email || '',
      website_url: venue.website_url || '',
      wheelchair_accessible: !!venue.wheelchair_accessible,
      accessibility_notes: venue.accessibility_notes || '',
      directions_driving: venue.directions_driving || '',
      directions_walking: venue.directions_walking || '',
      directions_public_transit_summary: venue.directions_public_transit_summary || ''
    };

    const transitViews = transitRoutes
      .filter((tr) => tr.venue_id === venueId)
      .map((tr) => ({
        route_id: tr.id,
        mode: tr.mode,
        route_name: tr.route_name,
        route_number: tr.route_number || '',
        description: tr.description || '',
        stops: (tr.stops || []).map((s) => ({
          stop_name: s.stop_name,
          stop_description: s.stop_description || '',
          sequence: s.sequence
        }))
      }));

    const now = new Date();
    const upcomingEvents = events
      .filter((e) => e.venue_id === venueId && new Date(e.start_datetime) >= now)
      .slice()
      .sort((a, b) => this._compareDateTimeAsc(a.start_datetime, b.start_datetime))
      .slice(0, 20)
      .map((e) => ({
        event_id: e.id,
        title: e.title,
        start_datetime: e.start_datetime,
        category_label: this._getCategoryLabel(e.category),
        audience_label: this._getAudienceLabel(e.audience),
        price: typeof e.price === 'number' ? e.price : 0,
        is_free: !!e.is_free
      }));

    // Instrumentation for task completion tracking (task_9 transit directions viewed)
    try {
      if (venue && venue.name === 'Riverside Cultural Center') {
        const hasPublicTransit = transitRoutes.some(
          (tr) => tr.venue_id === venueId && tr.mode === 'bus'
        );
        if (hasPublicTransit) {
          const value = {
            venue_id: venueId,
            has_public_transit_routes: true,
            viewed_at: this._nowIso()
          };
          localStorage.setItem(
            'task9_transitDirectionsViewed',
            JSON.stringify(value)
          );
        }
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      venue: venueView,
      transit_routes: transitViews,
      upcoming_events: upcomingEvents
    };
  }

  // 28. getAboutContent()
  getAboutContent() {
    const stored = this._getFromStorage('about_content', {});
    return {
      mission: stored.mission || '',
      values: Array.isArray(stored.values) ? stored.values : [],
      programs_overview: stored.programs_overview || '',
      history: stored.history || '',
      leadership: Array.isArray(stored.leadership) ? stored.leadership : [],
      partnerships: Array.isArray(stored.partnerships) ? stored.partnerships : [],
      call_to_action_links: Array.isArray(stored.call_to_action_links)
        ? stored.call_to_action_links
        : []
    };
  }

  // 29. getContactInfo()
  getContactInfo() {
    const stored = this._getFromStorage('contact_info', {});
    return {
      email: stored.email || '',
      phone: stored.phone || '',
      address: {
        address_line1: stored.address && stored.address.address_line1 ? stored.address.address_line1 : '',
        address_line2: stored.address && stored.address.address_line2 ? stored.address.address_line2 : '',
        city: stored.address && stored.address.city ? stored.address.city : '',
        state_province:
          stored.address && stored.address.state_province ? stored.address.state_province : '',
        postal_code: stored.address && stored.address.postal_code ? stored.address.postal_code : '',
        country: stored.address && stored.address.country ? stored.address.country : ''
      },
      office_hours: stored.office_hours || '',
      related_links: Array.isArray(stored.related_links) ? stored.related_links : []
    };
  }

  // 30. submitContactForm(name, email, topic, message)
  submitContactForm(name, email, topic, message) {
    const id = this._generateId('contactmsg');
    const createdAt = this._nowIso();

    const record = {
      id,
      name,
      email,
      topic,
      message,
      created_at: createdAt
    };

    const messages = this._getFromStorage('contact_messages');
    messages.push(record);
    this._saveToStorage('contact_messages', messages);

    return {
      success: true,
      message: 'Your message has been received.',
      reference_id: id
    };
  }

  // 31. getPrivacyPolicyContent()
  getPrivacyPolicyContent() {
    const stored = this._getFromStorage('privacy_policy_content', {});
    return {
      last_updated: stored.last_updated || '',
      sections: Array.isArray(stored.sections) ? stored.sections : []
    };
  }

  // 32. getTermsAndConditionsContent()
  getTermsAndConditionsContent() {
    const stored = this._getFromStorage('terms_content', {});
    return {
      last_updated: stored.last_updated || '',
      sections: Array.isArray(stored.sections) ? stored.sections : []
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