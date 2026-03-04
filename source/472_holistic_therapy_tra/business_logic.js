// localStorage polyfill for Node.js and environments without localStorage
const localStorage = (function () {
  // Always prefer a global localStorage instance so that tests and other modules
  // share the same backing store.
  function getGlobalStorage() {
    if (typeof globalThis !== 'undefined' && globalThis.localStorage) {
      return globalThis.localStorage;
    }

    // Create a minimal in-memory implementation and attach it to globalThis
    // so that any later code using globalThis.localStorage will see the same store.
    let store = {};
    const polyfill = {
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

    try {
      if (typeof globalThis !== 'undefined') {
        globalThis.localStorage = polyfill;
      }
    } catch (e) {
      // Ignore if we cannot assign to globalThis
    }

    return polyfill;
  }

  // Return a thin wrapper that always delegates to the current global store.
  return {
    getItem: function (key) {
      return getGlobalStorage().getItem(key);
    },
    setItem: function (key, value) {
      getGlobalStorage().setItem(key, value);
    },
    removeItem: function (key) {
      getGlobalStorage().removeItem(key);
    },
    clear: function () {
      getGlobalStorage().clear();
    },
    key: function (index) {
      return getGlobalStorage().key(index);
    },
    get length() {
      return getGlobalStorage().length;
    }
  };
})();

class BusinessLogic {
  constructor() {
    this._initStorage();
    this.idCounter = this._getNextIdCounter();
  }

  // -------------------- Storage Helpers --------------------

  _initStorage() {
    const keys = [
      'centers',
      'retreats',
      'retreat_packages',
      'retreat_room_types',
      'retreat_bookings',
      'training_programs',
      'training_cohorts',
      'training_enrollments',
      'workshop_sessions',
      'custom_itineraries',
      'therapists',
      'therapy_services',
      'gift_vouchers',
      'events',
      'event_registrations',
      'newsletter_subscriptions',
      'articles',
      'favorite_articles',
      'contact_forms',
      'current_itinerary',
      'booking_draft'
    ];

    for (const key of keys) {
      if (localStorage.getItem(key) === null) {
        // For current_itinerary and booking_draft we store null, others []
        if (key === 'current_itinerary' || key === 'booking_draft') {
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
    const data = localStorage.getItem(key);
    if (data === null || typeof data === 'undefined') {
      return typeof defaultValue !== 'undefined' ? defaultValue : [];
    }
    try {
      return JSON.parse(data);
    } catch (e) {
      return typeof defaultValue !== 'undefined' ? defaultValue : [];
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

  // -------------------- General Helpers --------------------

  _parseDate(value) {
    // Accepts ISO strings; returns Date or null
    if (!value) return null;
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }

  _formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    // Use UTC date portion to avoid timezone-related off-by-one errors
    return d.toISOString().slice(0, 10);
  }

  _formatDateRange(startStr, endStr) {
    const start = this._formatDate(startStr);
    const end = this._formatDate(endStr);
    if (start && end) return start + ' to ' + end;
    return start || end || '';
  }

  _formatDateTime(dateTimeStr) {
    if (!dateTimeStr) return '';
    const d = this._parseDate(dateTimeStr);
    if (!d) return '';
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return y + '-' + m + '-' + day + ' ' + hh + ':' + mm;
  }

  _formatCurrency(amount, currency) {
    if (typeof amount !== 'number' || isNaN(amount)) return '';
    const cur = currency || 'USD';
    return cur + ' ' + amount.toFixed(2);
  }

  _sumMeals(retreat) {
    const b = retreat && typeof retreat.included_breakfasts === 'number' ? retreat.included_breakfasts : 0;
    const l = retreat && typeof retreat.included_lunches === 'number' ? retreat.included_lunches : 0;
    const d = retreat && typeof retreat.included_dinners === 'number' ? retreat.included_dinners : 0;
    return b + l + d;
  }

  _categoryLabelForRetreat(cat) {
    const map = {
      meditation_retreat: 'Meditation retreat',
      yoga_retreat: 'Yoga retreat',
      holistic_retreat: 'Holistic retreat',
      trauma_informed_retreat: 'Trauma-informed retreat',
      breathwork_retreat: 'Breathwork retreat',
      digital_detox_retreat: 'Digital detox retreat',
      other_retreat: 'Other retreat'
    };
    return map[cat] || 'Retreat';
  }

  _formatTrainingFormat(format) {
    const map = {
      online: 'Online',
      in_person: 'In-person',
      hybrid: 'Hybrid'
    };
    return map[format] || '';
  }

  _formatScheduleLabel(timeOfDay) {
    const map = {
      morning: 'Morning',
      afternoon: 'Afternoon',
      evening: 'Evening',
      full_day: 'Full day',
      self_paced: 'Self-paced'
    };
    return map[timeOfDay] || '';
  }

  _ensureArray(value) {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    return [value];
  }

  // -------------------- HelperFunctions required by spec --------------------

  // Internal helper to get or create the current user's in-progress custom retreat itinerary
  _getOrCreateCurrentItinerary(initialDate) {
    let itinerary = this._getFromStorage('current_itinerary', null);
    if (!itinerary) {
      itinerary = {
        date: initialDate || null,
        session_ids: [],
        total_price: 0,
        currency: 'USD'
      };
      this._saveToStorage('current_itinerary', itinerary);
    }
    return itinerary;
  }

  // Internal helper to recalc itinerary totals and validation
  _updateItineraryTotalsAndValidation(itinerary, budget_limit) {
    const sessionsAll = this._getFromStorage('workshop_sessions', []);
    const sessions = itinerary.session_ids
      .map(function (id) {
        return sessionsAll.find(function (s) { return s.id === id; }) || null;
      })
      .filter(function (s) { return !!s; });

    let total = 0;
    let currency = 'USD';
    let hasCurrency = false;
    let hasYoga = false;
    let hasMindfulness = false;

    for (const s of sessions) {
      if (typeof s.price === 'number') total += s.price;
      if (!hasCurrency && s.currency) {
        currency = s.currency;
        hasCurrency = true;
      }
      if (s.category === 'yoga') hasYoga = true;
      if (s.category === 'mindfulness' || s.category === 'meditation') hasMindfulness = true;
    }

    const withinBudget = typeof budget_limit === 'number' ? total <= budget_limit : true;

    itinerary.total_price = total;
    itinerary.currency = currency;

    const validation = {
      total_sessions: sessions.length,
      has_yoga: hasYoga,
      has_mindfulness: hasMindfulness,
      within_budget: withinBudget,
      budget_limit: typeof budget_limit === 'number' ? budget_limit : null
    };

    return {
      date: itinerary.date,
      session_ids: itinerary.session_ids.slice(),
      sessions: sessions,
      total_price: total,
      currency: currency,
      validation: validation
    };
  }

  // Internal helper for booking drafts
  _getOrCreateBookingDraft(initialData) {
    let draft = this._getFromStorage('booking_draft', null);
    if (!draft) {
      draft = {
        retreatId: initialData && initialData.retreatId ? initialData.retreatId : null,
        retreatPackageId: initialData && initialData.retreatPackageId ? initialData.retreatPackageId : null,
        retreatRoomTypeId: initialData && initialData.retreatRoomTypeId ? initialData.retreatRoomTypeId : null,
        start_date: initialData && initialData.start_date ? initialData.start_date : null,
        number_of_participants: initialData && initialData.number_of_participants ? initialData.number_of_participants : 1,
        total_price: initialData && typeof initialData.total_price === 'number' ? initialData.total_price : 0,
        currency: initialData && initialData.currency ? initialData.currency : 'USD',
        created_at: new Date().toISOString()
      };
      this._saveToStorage('booking_draft', draft);
    }
    return draft;
  }

  // Internal helper to persist newsletter subscriptions
  _persistNewsletterSubscription(email, frequency, interest_topics, content_format_preference, consent_given) {
    let subs = this._getFromStorage('newsletter_subscriptions', []);
    const now = new Date().toISOString();
    const existingIndex = subs.findIndex(function (s) { return s.email === email && !s.unsubscribed; });

    if (existingIndex >= 0) {
      const existing = subs[existingIndex];
      existing.frequency = frequency;
      existing.interest_topics = this._ensureArray(interest_topics);
      existing.content_format_preference = content_format_preference;
      existing.consent_given = consent_given;
      subs[existingIndex] = existing;
      this._saveToStorage('newsletter_subscriptions', subs);
      return existing;
    }

    const subscription = {
      id: this._generateId('newsletter_subscription'),
      email: email,
      frequency: frequency,
      interest_topics: this._ensureArray(interest_topics),
      content_format_preference: content_format_preference,
      consent_given: consent_given,
      created_at: now,
      unsubscribed: false,
      unsubscribed_at: null
    };
    subs.push(subscription);
    this._saveToStorage('newsletter_subscriptions', subs);
    return subscription;
  }

  // Internal helper for favorites store
  _favoritesStore() {
    const self = this;
    return {
      getAll: function () {
        return self._getFromStorage('favorite_articles', []);
      },
      saveAll: function (list) {
        self._saveToStorage('favorite_articles', list);
      }
    };
  }

  // Mapping helpers for page display models
  _mapEntitiesToDisplayModels() {
    const self = this;
    return {
      retreatToListing: function (retreat) {
        return {
          retreat: retreat,
          category_label: self._categoryLabelForRetreat(retreat.category),
          date_range_display: self._formatDateRange(retreat.start_date, retreat.end_date),
          location_display: retreat.location_name,
          price_from_display: self._formatCurrency(retreat.price_from_per_person, retreat.currency),
          total_meals_included: self._sumMeals(retreat)
        };
      },
      trainingToListing: function (program, primary_cohort) {
        return {
          program: program,
          primary_cohort: primary_cohort,
          format_label: self._formatTrainingFormat(program.format),
          duration_label: program.duration_weeks + ' weeks',
          schedule_label: primary_cohort ? self._formatScheduleLabel(primary_cohort.schedule_time_of_day) : ''
        };
      },
      eventToListing: function (event) {
        return {
          event: event,
          is_free: event.price_type === 'free',
          date_time_display: self._formatDateTime(event.start_datetime),
          price_display: event.price_type === 'free' ? 'Free' : self._formatCurrency(event.price || 0, event.currency || 'USD')
        };
      },
      articleToListing: function (article) {
        return article;
      }
    };
  }

  // -------------------- Core Interface Implementations --------------------

  // getHomePageContent
  getHomePageContent() {
    const mapper = this._mapEntitiesToDisplayModels();

    const retreats = this._getFromStorage('retreats', []).filter(function (r) { return r.is_active; });
    const trainingPrograms = this._getFromStorage('training_programs', []).filter(function (p) { return p.is_active; });
    const trainingCohorts = this._getFromStorage('training_cohorts', []);
    const events = this._getFromStorage('events', []).filter(function (e) { return e.is_active; });
    const articles = this._getFromStorage('articles', []);

    // Featured retreats: highest rated first
    const featured_retreats = retreats
      .slice()
      .sort(function (a, b) {
        const ra = typeof a.rating === 'number' ? a.rating : 0;
        const rb = typeof b.rating === 'number' ? b.rating : 0;
        return rb - ra;
      })
      .slice(0, 3)
      .map(function (r) { return mapper.retreatToListing(r); });

    // Featured training programs: those with an upcoming cohort
    const featured_training_programs = [];
    for (const program of trainingPrograms) {
      const cohortsForProgram = trainingCohorts.filter(function (c) {
        return c.training_program_id === program.id && c.status === 'upcoming';
      });
      if (cohortsForProgram.length === 0) continue;
      cohortsForProgram.sort(function (a, b) {
        const da = new Date(a.start_date).getTime();
        const db = new Date(b.start_date).getTime();
        return da - db;
      });
      const primary = cohortsForProgram[0];
      featured_training_programs.push(mapper.trainingToListing(program, primary));
      if (featured_training_programs.length >= 3) break;
    }

    // Featured events: upcoming, by start date
    const featured_events = events
      .slice()
      .sort(function (a, b) {
        const da = new Date(a.start_datetime).getTime();
        const db = new Date(b.start_datetime).getTime();
        return da - db;
      })
      .slice(0, 3)
      .map(function (e) { return mapper.eventToListing(e); });

    // Recent articles: by publication_date desc
    const recent_articles = articles
      .slice()
      .sort(function (a, b) {
        const da = new Date(a.publication_date).getTime();
        const db = new Date(b.publication_date).getTime();
        return db - da;
      })
      .slice(0, 3);

    const seasonal_highlights = [
      'Summer meditation retreats',
      'Trauma-informed holistic trainings',
      'Online breathwork circles'
    ];

    return {
      hero_title: 'Holistic therapy trainings & retreats',
      hero_subtitle: 'Meditation, yoga, trauma-informed care and more – online and in-person.',
      intro_body: 'Explore retreats, trainings, workshops and events to support your healing and growth.',
      featured_retreats: featured_retreats,
      featured_training_programs: featured_training_programs,
      featured_events: featured_events,
      recent_articles: recent_articles,
      seasonal_highlights: seasonal_highlights
    };
  }

  // getRetreatFilterOptions
  getRetreatFilterOptions() {
    const retreats = this._getFromStorage('retreats', []).filter(function (r) { return r.is_active; });

    const categories = [
      { value: 'meditation_retreat', label: 'Meditation retreats' },
      { value: 'yoga_retreat', label: 'Yoga retreats' },
      { value: 'holistic_retreat', label: 'Holistic retreats' },
      { value: 'trauma_informed_retreat', label: 'Trauma-informed retreats' },
      { value: 'breathwork_retreat', label: 'Breathwork retreats' },
      { value: 'digital_detox_retreat', label: 'Digital detox retreats' },
      { value: 'other_retreat', label: 'Other retreats' }
    ];

    const locationMap = {};
    const locations = [];
    for (const r of retreats) {
      const key = (r.location_name || '') + '|' + (r.center_id || '');
      if (!locationMap[key]) {
        locationMap[key] = true;
        locations.push({ location_name: r.location_name, center_id: r.center_id || null });
      }
    }

    let minPrice = null;
    let maxPrice = null;
    let currency = 'USD';
    for (const r of retreats) {
      const p = r.price_from_per_person;
      if (typeof p === 'number') {
        if (minPrice === null || p < minPrice) minPrice = p;
        if (maxPrice === null || p > maxPrice) maxPrice = p;
        if (r.currency) currency = r.currency;
      }
    }

    const durationSet = {};
    const duration_options_days = [];
    for (const r of retreats) {
      if (typeof r.duration_days === 'number' && !durationSet[r.duration_days]) {
        durationSet[r.duration_days] = true;
        duration_options_days.push(r.duration_days);
      }
    }
    duration_options_days.sort(function (a, b) { return a - b; });

    const rating_options = [5, 4.5, 4, 3.5, 3];

    const sort_options = [
      { value: 'rating_desc', label: 'Rating: High to Low' },
      { value: 'price_asc', label: 'Price: Low to High' },
      { value: 'price_desc', label: 'Price: High to Low' },
      { value: 'start_date_asc', label: 'Start date: Soonest first' },
      { value: 'duration_days_asc', label: 'Duration: Short to Long' }
    ];

    return {
      categories: categories,
      locations: locations,
      duration_options_days: duration_options_days,
      price_range_per_person: {
        min: minPrice === null ? 0 : minPrice,
        max: maxPrice === null ? 0 : maxPrice,
        currency: currency
      },
      rating_options: rating_options,
      sort_options: sort_options
    };
  }

  // searchRetreats(filters)
  searchRetreats(filters) {
    filters = filters || {};
    let retreats = this._getFromStorage('retreats', []).filter(function (r) { return r.is_active; });

    if (filters.category) {
      retreats = retreats.filter(function (r) { return r.category === filters.category; });
    }
    if (filters.location_name) {
      const lname = filters.location_name.toLowerCase();
      retreats = retreats.filter(function (r) {
        return r.location_name && r.location_name.toLowerCase() === lname;
      });
    }
    if (filters.centerId) {
      retreats = retreats.filter(function (r) { return r.center_id === filters.centerId; });
    }
    if (filters.start_date_from) {
      const fromTime = new Date(filters.start_date_from).getTime();
      retreats = retreats.filter(function (r) {
        const st = new Date(r.start_date).getTime();
        return st >= fromTime;
      });
    }
    if (filters.start_date_to) {
      const toTime = new Date(filters.start_date_to).getTime();
      retreats = retreats.filter(function (r) {
        const st = new Date(r.start_date).getTime();
        return st <= toTime;
      });
    }
    if (typeof filters.min_duration_days === 'number') {
      retreats = retreats.filter(function (r) { return r.duration_days >= filters.min_duration_days; });
    }
    if (typeof filters.max_duration_days === 'number') {
      retreats = retreats.filter(function (r) { return r.duration_days <= filters.max_duration_days; });
    }
    if (typeof filters.max_price_per_person === 'number') {
      retreats = retreats.filter(function (r) { return r.price_from_per_person <= filters.max_price_per_person; });
    }
    if (typeof filters.min_rating === 'number') {
      retreats = retreats.filter(function (r) {
        const rating = typeof r.rating === 'number' ? r.rating : 0;
        return rating >= filters.min_rating;
      });
    }
    if (typeof filters.is_weekend_only === 'boolean') {
      retreats = retreats.filter(function (r) { return !!r.is_weekend_only === filters.is_weekend_only; });
    }

    const sortBy = filters.sort_by || 'start_date';
    const sortDirection = filters.sort_direction || 'asc';

    retreats = retreats.slice().sort(function (a, b) {
      let va;
      let vb;
      if (sortBy === 'rating') {
        va = typeof a.rating === 'number' ? a.rating : 0;
        vb = typeof b.rating === 'number' ? b.rating : 0;
      } else if (sortBy === 'price') {
        va = typeof a.price_from_per_person === 'number' ? a.price_from_per_person : 0;
        vb = typeof b.price_from_per_person === 'number' ? b.price_from_per_person : 0;
      } else if (sortBy === 'duration_days') {
        va = a.duration_days || 0;
        vb = b.duration_days || 0;
      } else {
        va = new Date(a.start_date).getTime();
        vb = new Date(b.start_date).getTime();
      }
      if (va < vb) return sortDirection === 'asc' ? -1 : 1;
      if (va > vb) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    const offset = typeof filters.offset === 'number' ? filters.offset : 0;
    const limit = typeof filters.limit === 'number' ? filters.limit : retreats.length;
    const sliced = retreats.slice(offset, offset + limit);

    const results = sliced.map((r) => {
      return {
        retreat: r,
        category_label: this._categoryLabelForRetreat(r.category),
        date_range_display: this._formatDateRange(r.start_date, r.end_date),
        location_display: r.location_name,
        price_from_display: this._formatCurrency(r.price_from_per_person, r.currency),
        total_meals_included: this._sumMeals(r)
      };
    });

    return results;
  }

  // getRetreatDetail(retreatId)
  getRetreatDetail(retreatId) {
    const retreats = this._getFromStorage('retreats', []);
    const packagesAll = this._getFromStorage('retreat_packages', []);
    const roomTypesAll = this._getFromStorage('retreat_room_types', []);

    const retreat = retreats.find(function (r) { return r.id === retreatId; }) || null;

    if (!retreat) {
      return {
        retreat: null,
        packages: [],
        room_types: [],
        meals_summary: {
          included_breakfasts: 0,
          included_lunches: 0,
          included_dinners: 0,
          total_meals: 0
        },
        highlights: [],
        reviews_summary: {
          rating: 0,
          rating_count: 0
        }
      };
    }

    const packagesRaw = packagesAll.filter(function (p) { return p.retreat_id === retreat.id; });
    const roomTypesRaw = roomTypesAll.filter(function (rt) { return rt.retreat_id === retreat.id; });

    // Foreign key resolution: include retreat on packages and room types
    const packages = packagesRaw.map(function (p) {
      return Object.assign({}, p, { retreat: retreat });
    });
    const room_types = roomTypesRaw.map(function (rt) {
      return Object.assign({}, rt, { retreat: retreat });
    });

    const included_breakfasts = retreat.included_breakfasts || 0;
    const included_lunches = retreat.included_lunches || 0;
    const included_dinners = retreat.included_dinners || 0;
    const total_meals = included_breakfasts + included_lunches + included_dinners;

    return {
      retreat: retreat,
      packages: packages,
      room_types: room_types,
      meals_summary: {
        included_breakfasts: included_breakfasts,
        included_lunches: included_lunches,
        included_dinners: included_dinners,
        total_meals: total_meals
      },
      highlights: retreat.highlights || [],
      reviews_summary: {
        rating: typeof retreat.rating === 'number' ? retreat.rating : 0,
        rating_count: typeof retreat.rating_count === 'number' ? retreat.rating_count : 0
      }
    };
  }

  // getRetreatBookingQuote
  getRetreatBookingQuote(retreatId, retreatPackageId, retreatRoomTypeId, number_of_participants, start_date) {
    const retreats = this._getFromStorage('retreats', []);
    const packages = this._getFromStorage('retreat_packages', []);
    const roomTypes = this._getFromStorage('retreat_room_types', []);

    const retreat = retreats.find(function (r) { return r.id === retreatId; }) || null;
    const pkg = packages.find(function (p) { return p.id === retreatPackageId; }) || null;
    const roomType = roomTypes.find(function (rt) { return rt.id === retreatRoomTypeId; }) || null;

    let price_per_person = 0;
    let currency = 'USD';

    if (roomType && typeof roomType.price_per_person === 'number') {
      price_per_person = roomType.price_per_person;
      if (roomType.currency) currency = roomType.currency;
    } else if (pkg && typeof pkg.price_per_person === 'number') {
      price_per_person = pkg.price_per_person;
      if (pkg.currency) currency = pkg.currency;
    } else if (retreat && typeof retreat.price_from_per_person === 'number') {
      price_per_person = retreat.price_from_per_person;
      if (retreat.currency) currency = retreat.currency;
    }

    const participants = typeof number_of_participants === 'number' && number_of_participants > 0 ? number_of_participants : 1;
    const total_price = price_per_person * participants;

    const payment_options = [
      {
        option: 'reserve_without_payment',
        label: 'Reserve without payment',
        deposit_amount: 0
      },
      {
        option: 'pay_at_check_in',
        label: 'Pay at check-in',
        deposit_amount: 0
      },
      {
        option: 'deposit_30_percent',
        label: 'Pay 30% deposit now',
        deposit_amount: total_price * 0.3
      },
      {
        option: 'pay_in_full',
        label: 'Pay in full',
        deposit_amount: total_price
      }
    ];

    this._getOrCreateBookingDraft({
      retreatId: retreatId,
      retreatPackageId: retreatPackageId,
      retreatRoomTypeId: retreatRoomTypeId,
      start_date: start_date,
      number_of_participants: participants,
      total_price: total_price,
      currency: currency
    });

    return {
      currency: currency,
      price_per_person: price_per_person,
      total_price: total_price,
      payment_options: payment_options
    };
  }

  // submitRetreatBooking
  submitRetreatBooking(retreatId, retreatPackageId, retreatRoomTypeId, start_date, end_date, number_of_participants, participant_names, primary_contact_name, primary_contact_email, primary_contact_phone, payment_option) {
    const retreats = this._getFromStorage('retreats', []);
    const packages = this._getFromStorage('retreat_packages', []);
    const roomTypes = this._getFromStorage('retreat_room_types', []);
    const bookings = this._getFromStorage('retreat_bookings', []);

    const retreat = retreats.find(function (r) { return r.id === retreatId; }) || null;
    const pkg = retreatPackageId ? packages.find(function (p) { return p.id === retreatPackageId; }) || null : null;
    const roomType = retreatRoomTypeId ? roomTypes.find(function (rt) { return rt.id === retreatRoomTypeId; }) || null : null;

    if (!retreat) {
      return { success: false, message: 'Retreat not found', booking: null };
    }

    const participants = typeof number_of_participants === 'number' && number_of_participants > 0 ? number_of_participants : 1;

    let price_per_person = 0;
    let currency = retreat.currency || 'USD';
    if (roomType && typeof roomType.price_per_person === 'number') {
      price_per_person = roomType.price_per_person;
      if (roomType.currency) currency = roomType.currency;
    } else if (pkg && typeof pkg.price_per_person === 'number') {
      price_per_person = pkg.price_per_person;
      if (pkg.currency) currency = pkg.currency;
    } else if (typeof retreat.price_from_per_person === 'number') {
      price_per_person = retreat.price_from_per_person;
    }

    const total_price = price_per_person * participants;

    const paymentOpt = payment_option || 'reserve_without_payment';
    let deposit_amount = null;
    if (paymentOpt === 'deposit_30_percent') {
      deposit_amount = total_price * 0.3;
    } else if (paymentOpt === 'pay_in_full') {
      deposit_amount = total_price;
    } else {
      deposit_amount = 0;
    }

    const start = start_date || (retreat.start_date ? this._formatDate(retreat.start_date) : null);
    let end = end_date;
    if (!end) {
      if (retreat.end_date) {
        end = this._formatDate(retreat.end_date);
      } else if (start && retreat.duration_days) {
        const dStart = new Date(start);
        dStart.setDate(dStart.getDate() + (retreat.duration_days || 0));
        end = this._formatDate(dStart.toISOString());
      }
    }

    const booking = {
      id: this._generateId('retreat_booking'),
      retreat_id: retreat.id,
      retreat_package_id: pkg ? pkg.id : null,
      retreat_room_type_id: roomType ? roomType.id : null,
      room_type_label: roomType ? roomType.name : null,
      start_date: start ? new Date(start).toISOString() : retreat.start_date,
      end_date: end ? new Date(end).toISOString() : retreat.end_date,
      number_of_participants: participants,
      participant_names: this._ensureArray(participant_names),
      primary_contact_name: primary_contact_name,
      primary_contact_email: primary_contact_email,
      primary_contact_phone: primary_contact_phone || null,
      total_price: total_price,
      currency: currency,
      payment_option: paymentOpt,
      deposit_amount: deposit_amount,
      booking_status: 'pending',
      created_at: new Date().toISOString()
    };

    bookings.push(booking);
    this._saveToStorage('retreat_bookings', bookings);
    this._saveToStorage('booking_draft', null);

    return {
      success: true,
      message: 'Retreat booking created',
      booking: booking
    };
  }

  // getTrainingFilterOptions
  getTrainingFilterOptions() {
    const programs = this._getFromStorage('training_programs', []).filter(function (p) { return p.is_active; });
    const cohorts = this._getFromStorage('training_cohorts', []);

    const formats = [
      { value: 'online', label: 'Online' },
      { value: 'in_person', label: 'In-person' },
      { value: 'hybrid', label: 'Hybrid' }
    ];

    const durationSet = {};
    const duration_weeks_options = [];
    for (const p of programs) {
      if (typeof p.duration_weeks === 'number' && !durationSet[p.duration_weeks]) {
        durationSet[p.duration_weeks] = true;
        duration_weeks_options.push(p.duration_weeks);
      }
    }
    duration_weeks_options.sort(function (a, b) { return a - b; });

    const schedule_time_of_day_options = [
      { value: 'morning', label: 'Morning' },
      { value: 'afternoon', label: 'Afternoon' },
      { value: 'evening', label: 'Evening' },
      { value: 'full_day', label: 'Full day' },
      { value: 'self_paced', label: 'Self-paced' }
    ];

    // Price range based on cohorts (more precise) or programs as fallback
    let minPrice = null;
    let maxPrice = null;
    let currency = 'USD';

    const priceSources = cohorts.length > 0 ? cohorts : programs;

    for (const item of priceSources) {
      const p = item.price || item.price_from;
      if (typeof p === 'number') {
        if (minPrice === null || p < minPrice) minPrice = p;
        if (maxPrice === null || p > maxPrice) maxPrice = p;
        if (item.currency) currency = item.currency;
      }
    }

    const categorySet = {};
    const category_options = [];
    for (const p of programs) {
      if (p.category && !categorySet[p.category]) {
        categorySet[p.category] = true;
        category_options.push(p.category);
      }
    }

    const sort_options = [
      { value: 'start_date_asc', label: 'Start date: Soonest first' },
      { value: 'price_asc', label: 'Price: Low to High' },
      { value: 'price_desc', label: 'Price: High to Low' },
      { value: 'popularity_desc', label: 'Most popular' }
    ];

    return {
      formats: formats,
      duration_weeks_options: duration_weeks_options,
      schedule_time_of_day_options: schedule_time_of_day_options,
      price_range: {
        min: minPrice === null ? 0 : minPrice,
        max: maxPrice === null ? 0 : maxPrice,
        currency: currency
      },
      category_options: category_options,
      sort_options: sort_options
    };
  }

  // searchTrainingPrograms(filters)
  searchTrainingPrograms(filters) {
    filters = filters || {};
    const programs = this._getFromStorage('training_programs', []).filter(function (p) { return p.is_active; });
    const cohorts = this._getFromStorage('training_cohorts', []);

    const results = [];

    for (const program of programs) {
      if (filters.format && program.format !== filters.format) continue;
      if (typeof filters.duration_weeks === 'number' && program.duration_weeks !== filters.duration_weeks) continue;
      if (filters.category && program.category !== filters.category) continue;

      let programCohorts = cohorts.filter(function (c) { return c.training_program_id === program.id && c.status === 'upcoming'; });

      if (filters.min_start_date) {
        const minStart = new Date(filters.min_start_date).getTime();
        programCohorts = programCohorts.filter(function (c) {
          const st = new Date(c.start_date).getTime();
          return st >= minStart;
        });
      }

      if (filters.schedule_time_of_day) {
        programCohorts = programCohorts.filter(function (c) { return c.schedule_time_of_day === filters.schedule_time_of_day; });
      }

      if (typeof filters.max_price === 'number') {
        programCohorts = programCohorts.filter(function (c) { return c.price <= filters.max_price; });
      }

      if (programCohorts.length === 0) continue;

      programCohorts.sort(function (a, b) {
        const da = new Date(a.start_date).getTime();
        const db = new Date(b.start_date).getTime();
        return da - db;
      });

      const primary = programCohorts[0];

      results.push({
        program: program,
        primary_cohort: primary,
        format_label: this._formatTrainingFormat(program.format),
        duration_label: program.duration_weeks + ' weeks',
        schedule_label: this._formatScheduleLabel(primary.schedule_time_of_day)
      });
    }

    const sortBy = filters.sort_by || 'start_date';
    const sortDirection = filters.sort_direction || 'asc';

    results.sort(function (a, b) {
      let va;
      let vb;
      if (sortBy === 'price') {
        va = a.primary_cohort.price;
        vb = b.primary_cohort.price;
      } else if (sortBy === 'popularity') {
        va = typeof a.program.rating_count === 'number' ? a.program.rating_count : 0;
        vb = typeof b.program.rating_count === 'number' ? b.program.rating_count : 0;
      } else {
        va = new Date(a.primary_cohort.start_date).getTime();
        vb = new Date(b.primary_cohort.start_date).getTime();
      }
      if (va < vb) return sortDirection === 'asc' ? -1 : 1;
      if (va > vb) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    const offset = typeof filters.offset === 'number' ? filters.offset : 0;
    const limit = typeof filters.limit === 'number' ? filters.limit : results.length;
    return results.slice(offset, offset + limit);
  }

  // getTrainingProgramDetail
  getTrainingProgramDetail(trainingProgramId) {
    const programs = this._getFromStorage('training_programs', []);
    const cohortsAll = this._getFromStorage('training_cohorts', []);

    const program = programs.find(function (p) { return p.id === trainingProgramId; }) || null;

    if (!program) {
      return {
        program: null,
        cohorts: [],
        overview_sections: [],
        learning_outcomes: [],
        weekly_structure: []
      };
    }

    const cohorts = cohortsAll.filter(function (c) { return c.training_program_id === program.id; });
    cohorts.sort(function (a, b) {
      const da = new Date(a.start_date).getTime();
      const db = new Date(b.start_date).getTime();
      return da - db;
    });

    const overview_sections = [
      'Overview of ' + (program.title || 'this training'),
      'Who this training is for'
    ];
    const learning_outcomes = [
      'Develop practical holistic therapy skills.',
      'Learn to support clients with a trauma-informed lens.'
    ];
    const weekly_structure = [
      'Weekly live sessions and practice circles.',
      'Self-study materials and integration exercises.'
    ];

    return {
      program: program,
      cohorts: cohorts,
      overview_sections: overview_sections,
      learning_outcomes: learning_outcomes,
      weekly_structure: weekly_structure
    };
  }

  // submitTrainingEnrollment
  submitTrainingEnrollment(trainingProgramId, trainingCohortId, participant_name, participant_email, selected_schedule_label) {
    const programs = this._getFromStorage('training_programs', []);
    const cohorts = this._getFromStorage('training_cohorts', []);
    const enrollments = this._getFromStorage('training_enrollments', []);

    const program = programs.find(function (p) { return p.id === trainingProgramId; }) || null;
    if (!program) {
      return { success: false, message: 'Training program not found', enrollment: null };
    }

    let cohort = null;
    if (trainingCohortId) {
      cohort = cohorts.find(function (c) { return c.id === trainingCohortId; }) || null;
    }

    const enrollment = {
      id: this._generateId('training_enrollment'),
      training_program_id: program.id,
      training_cohort_id: cohort ? cohort.id : null,
      participant_name: participant_name,
      participant_email: participant_email,
      selected_schedule_label: selected_schedule_label || (cohort ? this._formatScheduleLabel(cohort.schedule_time_of_day) : null),
      enrollment_status: 'pending',
      created_at: new Date().toISOString()
    };

    enrollments.push(enrollment);
    this._saveToStorage('training_enrollments', enrollments);

    return {
      success: true,
      message: 'Enrollment submitted',
      enrollment: enrollment
    };
  }

  // getWorkshopFilterOptions
  getWorkshopFilterOptions() {
    const sessions = this._getFromStorage('workshop_sessions', []);

    const categories = [
      { value: 'yoga', label: 'Yoga' },
      { value: 'mindfulness', label: 'Mindfulness' },
      { value: 'meditation', label: 'Meditation' },
      { value: 'breathwork', label: 'Breathwork' },
      { value: 'sound_healing', label: 'Sound healing' },
      { value: 'bodywork', label: 'Bodywork' },
      { value: 'other', label: 'Other' }
    ];

    const time_of_day_options = [
      { value: 'morning', label: 'Morning (8:00-12:00)' },
      { value: 'afternoon', label: 'Afternoon' },
      { value: 'evening', label: 'Evening' },
      { value: 'full_day', label: 'Full day' }
    ];

    let minPrice = null;
    let maxPrice = null;
    let currency = 'USD';
    for (const s of sessions) {
      if (typeof s.price === 'number') {
        if (minPrice === null || s.price < minPrice) minPrice = s.price;
        if (maxPrice === null || s.price > maxPrice) maxPrice = s.price;
        if (s.currency) currency = s.currency;
      }
    }

    return {
      categories: categories,
      time_of_day_options: time_of_day_options,
      price_range: {
        min: minPrice === null ? 0 : minPrice,
        max: maxPrice === null ? 0 : maxPrice,
        currency: currency
      }
    };
  }

  // searchWorkshopSessions(filters)
  searchWorkshopSessions(filters) {
    filters = filters || {};
    const sessions = this._getFromStorage('workshop_sessions', []).filter(function (s) { return s.is_active; });

    let results = sessions.filter((s) => {
      const dateMatch = this._formatDate(s.date).startsWith(filters.date);
      return dateMatch;
    });

    if (filters.time_of_day) {
      results = results.filter(function (s) { return s.time_of_day === filters.time_of_day; });
    }
    if (filters.category) {
      results = results.filter(function (s) { return s.category === filters.category; });
    }
    if (filters.centerId) {
      results = results.filter(function (s) { return s.center_id === filters.centerId; });
    }
    if (typeof filters.min_price === 'number') {
      results = results.filter(function (s) { return s.price >= filters.min_price; });
    }
    if (typeof filters.max_price === 'number') {
      results = results.filter(function (s) { return s.price <= filters.max_price; });
    }

    const sort_by = filters.sort_by || 'start_time';
    const sort_direction = filters.sort_direction || 'asc';

    results = results.slice().sort(function (a, b) {
      let va;
      let vb;
      if (sort_by === 'price') {
        va = a.price;
        vb = b.price;
      } else {
        va = a.start_time || '';
        vb = b.start_time || '';
      }
      if (va < vb) return sort_direction === 'asc' ? -1 : 1;
      if (va > vb) return sort_direction === 'asc' ? 1 : -1;
      return 0;
    });

    return results;
  }

  // addWorkshopSessionToItinerary
  addWorkshopSessionToItinerary(workshopSessionId, budget_limit) {
    const sessions = this._getFromStorage('workshop_sessions', []);
    const session = sessions.find(function (s) { return s.id === workshopSessionId; }) || null;
    if (!session) {
      return { success: false, message: 'Workshop session not found', itinerary: null };
    }

    let itinerary = this._getOrCreateCurrentItinerary(this._formatDate(session.date));

    const sessionDate = this._formatDate(session.date);
    if (itinerary.date && itinerary.date !== sessionDate) {
      // For simplicity, allow sessions on a different date by resetting itinerary date
      itinerary.date = sessionDate;
      itinerary.session_ids = [];
    }

    if (!itinerary.session_ids.includes(session.id)) {
      itinerary.session_ids.push(session.id);
    }

    const updated = this._updateItineraryTotalsAndValidation(itinerary, budget_limit);
    itinerary.total_price = updated.total_price;
    itinerary.currency = updated.currency;
    this._saveToStorage('current_itinerary', itinerary);

    return {
      success: true,
      message: 'Session added to itinerary',
      itinerary: updated
    };
  }

  // removeWorkshopSessionFromItinerary
  removeWorkshopSessionFromItinerary(workshopSessionId, budget_limit) {
    let itinerary = this._getFromStorage('current_itinerary', null);
    if (!itinerary) {
      return { success: false, message: 'No current itinerary', itinerary: null };
    }

    itinerary.session_ids = itinerary.session_ids.filter(function (id) { return id !== workshopSessionId; });

    const updated = this._updateItineraryTotalsAndValidation(itinerary, budget_limit);
    itinerary.total_price = updated.total_price;
    itinerary.currency = updated.currency;
    this._saveToStorage('current_itinerary', itinerary);

    return {
      success: true,
      message: 'Session removed from itinerary',
      itinerary: updated
    };
  }

  // getCurrentItinerary
  getCurrentItinerary() {
    const itinerary = this._getFromStorage('current_itinerary', null);
    if (!itinerary) {
      return { has_itinerary: false, itinerary: null };
    }

    const sessionsAll = this._getFromStorage('workshop_sessions', []);
    const sessions = itinerary.session_ids
      .map(function (id) { return sessionsAll.find(function (s) { return s.id === id; }) || null; })
      .filter(function (s) { return !!s; });

    return {
      has_itinerary: true,
      itinerary: {
        date: itinerary.date,
        session_ids: itinerary.session_ids.slice(),
        sessions: sessions,
        total_price: itinerary.total_price || 0,
        currency: itinerary.currency || 'USD'
      }
    };
  }

  // saveCurrentItinerary
  saveCurrentItinerary(name, date) {
    const itineraryState = this._getFromStorage('current_itinerary', null);
    if (!itineraryState) {
      return { success: false, message: 'No current itinerary to save', saved_itinerary: null };
    }

    const finalDate = date || itineraryState.date;
    if (!finalDate) {
      return { success: false, message: 'Itinerary date is required', saved_itinerary: null };
    }

    const customItineraries = this._getFromStorage('custom_itineraries', []);

    const saved = {
      id: this._generateId('custom_itinerary'),
      name: name,
      date: new Date(finalDate).toISOString(),
      session_ids: itineraryState.session_ids.slice(),
      total_price: itineraryState.total_price || 0,
      currency: itineraryState.currency || 'USD',
      created_at: new Date().toISOString()
    };

    customItineraries.push(saved);
    this._saveToStorage('custom_itineraries', customItineraries);

    return {
      success: true,
      message: 'Itinerary saved',
      saved_itinerary: saved
    };
  }

  // getGiftVoucherFilterOptions
  getGiftVoucherFilterOptions() {
    const centers = this._getFromStorage('centers', []);
    const services = this._getFromStorage('therapy_services', []).filter(function (s) { return s.is_active && s.is_voucher_eligible; });
    const therapists = this._getFromStorage('therapists', []);

    const service_categories = [
      { value: 'holistic_massage', label: 'Holistic massage' },
      { value: 'acupuncture', label: 'Acupuncture' },
      { value: 'energy_healing', label: 'Energy healing' },
      { value: 'counseling', label: 'Counseling' },
      { value: 'bodywork', label: 'Bodywork' },
      { value: 'other_service', label: 'Other services' }
    ];

    let minDuration = null;
    let maxDuration = null;
    let minPrice = null;
    let maxPrice = null;
    let currency = 'USD';

    for (const s of services) {
      if (typeof s.duration_minutes === 'number') {
        if (minDuration === null || s.duration_minutes < minDuration) minDuration = s.duration_minutes;
        if (maxDuration === null || s.duration_minutes > maxDuration) maxDuration = s.duration_minutes;
      }
      if (typeof s.price === 'number') {
        if (minPrice === null || s.price < minPrice) minPrice = s.price;
        if (maxPrice === null || s.price > maxPrice) maxPrice = s.price;
        if (s.currency) currency = s.currency;
      }
    }

    const ratingOptionsSet = {};
    const therapist_rating_options = [];
    for (const t of therapists) {
      if (typeof t.rating === 'number') {
        const r = Math.round(t.rating * 2) / 2;
        if (!ratingOptionsSet[r]) {
          ratingOptionsSet[r] = true;
          therapist_rating_options.push(r);
        }
      }
    }
    therapist_rating_options.sort(function (a, b) { return b - a; });

    return {
      centers: centers,
      service_categories: service_categories,
      duration_range_minutes: {
        min: minDuration === null ? 0 : minDuration,
        max: maxDuration === null ? 0 : maxDuration
      },
      therapist_rating_options: therapist_rating_options,
      price_range: {
        min: minPrice === null ? 0 : minPrice,
        max: maxPrice === null ? 0 : maxPrice,
        currency: currency
      }
    };
  }

  // searchVoucherEligibleServices(filters)
  searchVoucherEligibleServices(filters) {
    filters = filters || {};
    const services = this._getFromStorage('therapy_services', []).filter(function (s) { return s.is_active && s.is_voucher_eligible; });
    const therapists = this._getFromStorage('therapists', []);
    const centers = this._getFromStorage('centers', []);

    let results = services;

    if (filters.centerId) {
      results = results.filter(function (s) { return s.center_id === filters.centerId; });
    }
    if (filters.category) {
      results = results.filter(function (s) { return s.category === filters.category; });
    }
    if (typeof filters.min_duration_minutes === 'number') {
      results = results.filter(function (s) { return s.duration_minutes >= filters.min_duration_minutes; });
    }
    if (typeof filters.max_duration_minutes === 'number') {
      results = results.filter(function (s) { return s.duration_minutes <= filters.max_duration_minutes; });
    }
    if (typeof filters.max_price === 'number') {
      results = results.filter(function (s) { return s.price <= filters.max_price; });
    }

    if (typeof filters.min_therapist_rating === 'number') {
      results = results.filter(function (s) {
        const therapist = therapists.find(function (t) { return t.id === s.therapist_id; }) || null;
        const rating = therapist && typeof therapist.rating === 'number' ? therapist.rating : 0;
        return rating >= filters.min_therapist_rating;
      });
    }

    const sort_by = filters.sort_by || 'price';
    const sort_direction = filters.sort_direction || 'asc';

    results = results.slice().sort((a, b) => {
      let va;
      let vb;
      if (sort_by === 'rating') {
        const ta = therapists.find(function (t) { return t.id === a.therapist_id; }) || {};
        const tb = therapists.find(function (t) { return t.id === b.therapist_id; }) || {};
        va = typeof ta.rating === 'number' ? ta.rating : 0;
        vb = typeof tb.rating === 'number' ? tb.rating : 0;
      } else if (sort_by === 'duration') {
        va = a.duration_minutes;
        vb = b.duration_minutes;
      } else {
        va = a.price;
        vb = b.price;
      }
      if (va < vb) return sort_direction === 'asc' ? -1 : 1;
      if (va > vb) return sort_direction === 'asc' ? 1 : -1;
      return 0;
    });

    return results.map((s) => {
      const therapist = therapists.find(function (t) { return t.id === s.therapist_id; }) || null;
      const center = centers.find(function (c) { return c.id === s.center_id; }) || null;
      return {
        service: s,
        therapist: therapist,
        center: center,
        duration_minutes: s.duration_minutes,
        price_display: this._formatCurrency(s.price, s.currency)
      };
    });
  }

  // createGiftVoucher
  createGiftVoucher(therapyServiceId, recipient_name, sender_name, message, amount, currency, delivery_option, payment_preference) {
    const services = this._getFromStorage('therapy_services', []);
    const therapists = this._getFromStorage('therapists', []);
    const vouchers = this._getFromStorage('gift_vouchers', []);

    const service = services.find(function (s) { return s.id === therapyServiceId; }) || null;
    if (!service) {
      return { success: false, message: 'Service not found', voucher: null };
    }

    const therapist = therapists.find(function (t) { return t.id === service.therapist_id; }) || null;

    const cur = currency || service.currency || 'USD';
    const amt = typeof amount === 'number' ? amount : service.price;

    const now = new Date();
    const validUntil = new Date(now.getTime());
    validUntil.setFullYear(validUntil.getFullYear() + 1);

    const paymentPref = payment_preference || 'pay_in_person';

    let payment_status = 'unpaid';
    if (paymentPref === 'pay_online') {
      payment_status = 'paid_online';
    } else if (paymentPref === 'pay_in_person') {
      payment_status = 'unpaid';
    }

    const voucher = {
      id: this._generateId('gift_voucher'),
      center_id: service.center_id,
      therapy_service_id: service.id,
      therapist_id: therapist ? therapist.id : null,
      recipient_name: recipient_name,
      sender_name: sender_name,
      message: message || '',
      amount: amt,
      currency: cur,
      delivery_option: delivery_option || 'print_at_home',
      code: 'GV-' + Math.random().toString(36).substring(2, 10).toUpperCase(),
      status: 'reserved',
      payment_status: payment_status,
      created_at: now.toISOString(),
      valid_until: validUntil.toISOString()
    };

    vouchers.push(voucher);
    this._saveToStorage('gift_vouchers', vouchers);

    return {
      success: true,
      message: 'Gift voucher created',
      voucher: voucher
    };
  }

  // getEventFilterOptions
  getEventFilterOptions() {
    const events = this._getFromStorage('events', []);

    const formats = [
      { value: 'online_webinar', label: 'Online webinar' },
      { value: 'in_person_event', label: 'In-person event' },
      { value: 'hybrid_event', label: 'Hybrid event' }
    ];

    const tagSet = {};
    const topic_tags = [];
    for (const e of events) {
      const tags = this._ensureArray(e.topic_tags);
      for (const t of tags) {
        if (!tagSet[t]) {
          tagSet[t] = true;
          topic_tags.push(t);
        }
      }
    }

    const price_type_options = [
      { value: 'free', label: 'Free' },
      { value: 'paid', label: 'Paid' },
      { value: 'donation', label: 'Donation-based' }
    ];

    return {
      formats: formats,
      topic_tags: topic_tags,
      price_type_options: price_type_options
    };
  }

  // searchEvents(filters)
  searchEvents(filters) {
    filters = filters || {};
    const events = this._getFromStorage('events', []).filter(function (e) { return e.is_active; });

    let results = events;

    if (filters.format) {
      results = results.filter(function (e) { return e.format === filters.format; });
    }

    if (filters.topic_tags && filters.topic_tags.length > 0) {
      const tagsFilter = filters.topic_tags;
      results = results.filter((e) => {
        const etags = this._ensureArray(e.topic_tags);
        return tagsFilter.some(function (t) { return etags.indexOf(t) >= 0; });
      });
    }

    if (filters.price_type) {
      results = results.filter(function (e) { return e.price_type === filters.price_type; });
    }

    if (filters.start_date_from) {
      const fromTime = new Date(filters.start_date_from).getTime();
      results = results.filter(function (e) {
        const st = new Date(e.start_datetime).getTime();
        return st >= fromTime;
      });
    }

    if (filters.start_date_to) {
      const toTime = new Date(filters.start_date_to).getTime();
      results = results.filter(function (e) {
        const st = new Date(e.start_datetime).getTime();
        return st <= toTime;
      });
    }

    const sort_by = filters.sort_by || 'start_datetime';
    const sort_direction = filters.sort_direction || 'asc';

    results = results.slice().sort(function (a, b) {
      let va;
      let vb;
      if (sort_by === 'price') {
        va = a.price || 0;
        vb = b.price || 0;
      } else {
        va = new Date(a.start_datetime).getTime();
        vb = new Date(b.start_datetime).getTime();
      }
      if (va < vb) return sort_direction === 'asc' ? -1 : 1;
      if (va > vb) return sort_direction === 'asc' ? 1 : -1;
      return 0;
    });

    return results.map((e) => {
      return {
        event: e,
        is_free: e.price_type === 'free',
        date_time_display: this._formatDateTime(e.start_datetime),
        price_display: e.price_type === 'free' ? 'Free' : this._formatCurrency(e.price || 0, e.currency || 'USD')
      };
    });
  }

  // getEventDetail
  getEventDetail(eventId) {
    const events = this._getFromStorage('events', []);
    const event = events.find(function (e) { return e.id === eventId; }) || null;

    if (!event) {
      return {
        event: null,
        is_free: false,
        presenter_bio: '',
        capacity_info: { capacity: 0, spots_remaining: 0 },
        registration_deadline_display: ''
      };
    }

    const registration_deadline_display = event.registration_deadline ? this._formatDateTime(event.registration_deadline) : '';

    return {
      event: event,
      is_free: event.price_type === 'free',
      presenter_bio: '',
      capacity_info: {
        capacity: event.capacity || 0,
        spots_remaining: event.spots_remaining || 0
      },
      registration_deadline_display: registration_deadline_display
    };
  }

  // submitEventRegistration
  submitEventRegistration(eventId, full_name, email, timezone, send_reminders) {
    const events = this._getFromStorage('events', []);
    const registrations = this._getFromStorage('event_registrations', []);

    const event = events.find(function (e) { return e.id === eventId; }) || null;
    if (!event) {
      return { success: false, message: 'Event not found', registration: null };
    }

    const registration = {
      id: this._generateId('event_registration'),
      event_id: event.id,
      full_name: full_name,
      email: email,
      timezone: timezone || null,
      send_reminders: !!send_reminders,
      registration_status: 'confirmed',
      created_at: new Date().toISOString()
    };

    registrations.push(registration);
    this._saveToStorage('event_registrations', registrations);

    return {
      success: true,
      message: 'Registration completed',
      registration: registration
    };
  }

  // getNewsletterOptions
  getNewsletterOptions() {
    const frequency_options = [
      { value: 'daily', label: 'Daily' },
      { value: 'weekly', label: 'Weekly' },
      { value: 'monthly', label: 'Monthly' },
      { value: 'quarterly', label: 'Quarterly' }
    ];

    const interest_topic_options = [
      { value: 'yoga_and_movement', label: 'Yoga & movement' },
      { value: 'trauma_informed_therapy', label: 'Trauma-informed therapy' },
      { value: 'retreats_in_europe', label: 'Retreats in Europe' },
      { value: 'breathwork', label: 'Breathwork' },
      { value: 'sleep', label: 'Sleep & rest' }
    ];

    const content_format_options = [
      { value: 'article_summaries_and_links', label: 'Article summaries and links' },
      { value: 'full_articles', label: 'Full articles' },
      { value: 'upcoming_events_only', label: 'Upcoming events only' }
    ];

    const consent_text = 'I agree to receive email communications about retreats, trainings, and resources.';

    return {
      frequency_options: frequency_options,
      interest_topic_options: interest_topic_options,
      content_format_options: content_format_options,
      consent_text: consent_text
    };
  }

  // submitNewsletterSubscription
  submitNewsletterSubscription(email, frequency, interest_topics, content_format_preference, consent_given) {
    if (!consent_given) {
      return { success: false, message: 'Consent is required', subscription: null };
    }

    const subscription = this._persistNewsletterSubscription(email, frequency, interest_topics, content_format_preference, consent_given);

    return {
      success: true,
      message: 'Subscription saved',
      subscription: subscription
    };
  }

  // getArticleSearchFilterOptions
  getArticleSearchFilterOptions() {
    const articles = this._getFromStorage('articles', []);

    const tagSet = {};
    const topic_tags = [];
    for (const a of articles) {
      const tags = this._ensureArray(a.tags);
      for (const t of tags) {
        if (!tagSet[t]) {
          tagSet[t] = true;
          topic_tags.push(t);
        }
      }
    }

    const date_range_presets = [
      { value: 'last_30_days', label: 'Last 30 days' },
      { value: 'last_12_months', label: 'Last 12 months' },
      { value: 'all_time', label: 'All time' }
    ];

    return {
      topic_tags: topic_tags,
      date_range_presets: date_range_presets
    };
  }

  // searchArticles
  searchArticles(query, filters) {
    query = query || '';
    filters = filters || {};

    const articles = this._getFromStorage('articles', []);
    const favorites = this._getFromStorage('favorite_articles', []);

    const q = query.trim().toLowerCase();

    let results = articles;

    if (q) {
      results = results.filter(function (a) {
        const title = (a.title || '').toLowerCase();
        const summary = (a.summary || '').toLowerCase();
        const body = (a.body || '').toLowerCase();
        return title.indexOf(q) >= 0 || summary.indexOf(q) >= 0 || body.indexOf(q) >= 0;
      });
    }

    if (filters.tags && filters.tags.length > 0) {
      const tagsFilter = filters.tags;
      results = results.filter((a) => {
        const tags = this._ensureArray(a.tags);
        return tagsFilter.some(function (t) { return tags.indexOf(t) >= 0; });
      });
    }

    if (filters.primary_topic) {
      results = results.filter(function (a) { return a.primary_topic === filters.primary_topic; });
    }

    const now = new Date();
    if (filters.date_range_preset === 'last_30_days') {
      const from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      results = results.filter(function (a) {
        const pub = new Date(a.publication_date).getTime();
        return pub >= from.getTime();
      });
    } else if (filters.date_range_preset === 'last_12_months') {
      const from = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      results = results.filter(function (a) {
        const pub = new Date(a.publication_date).getTime();
        return pub >= from.getTime();
      });
    }

    if (filters.published_after) {
      const from = new Date(filters.published_after).getTime();
      results = results.filter(function (a) {
        const pub = new Date(a.publication_date).getTime();
        return pub >= from;
      });
    }
    if (filters.published_before) {
      const to = new Date(filters.published_before).getTime();
      results = results.filter(function (a) {
        const pub = new Date(a.publication_date).getTime();
        return pub <= to;
      });
    }

    const sort_by = filters.sort_by || 'publication_date';
    const sort_direction = filters.sort_direction || 'desc';

    results = results.slice().sort(function (a, b) {
      let va;
      let vb;
      if (sort_by === 'publication_date') {
        va = new Date(a.publication_date).getTime();
        vb = new Date(b.publication_date).getTime();
      } else {
        va = 0;
        vb = 0;
      }
      if (va < vb) return sort_direction === 'asc' ? -1 : 1;
      if (va > vb) return sort_direction === 'asc' ? 1 : -1;
      return 0;
    });

    return results.map((a) => {
      const is_favorited = favorites.some(function (f) { return f.article_id === a.id; });
      return {
        article: a,
        is_favorited: is_favorited
      };
    });
  }

  // getArticleDetail
  getArticleDetail(articleId) {
    const articles = this._getFromStorage('articles', []);
    const favorites = this._getFromStorage('favorite_articles', []);

    const article = articles.find(function (a) { return a.id === articleId; }) || null;
    if (!article) {
      return {
        article: null,
        is_favorited: false,
        related_articles: []
      };
    }

    const is_favorited = favorites.some(function (f) { return f.article_id === article.id; });

    const tags = this._ensureArray(article.tags);
    let related_articles = [];
    if (tags.length > 0) {
      related_articles = articles.filter((a) => {
        if (a.id === article.id) return false;
        const atags = this._ensureArray(a.tags);
        return tags.some(function (t) { return atags.indexOf(t) >= 0; });
      }).slice(0, 5);
    }

    return {
      article: article,
      is_favorited: is_favorited,
      related_articles: related_articles
    };
  }

  // addArticleToFavorites
  addArticleToFavorites(articleId, note) {
    const articles = this._getFromStorage('articles', []);
    const article = articles.find(function (a) { return a.id === articleId; }) || null;
    if (!article) {
      return { success: false, message: 'Article not found', favorite: null };
    }

    const store = this._favoritesStore();
    const favorites = store.getAll();

    let favorite = favorites.find(function (f) { return f.article_id === articleId; }) || null;
    const now = new Date().toISOString();

    if (favorite) {
      favorite.notes = note || favorite.notes || '';
      favorite.date_saved = now;
    } else {
      favorite = {
        id: this._generateId('favorite_article'),
        article_id: articleId,
        date_saved: now,
        user_tags: [],
        notes: note || ''
      };
      favorites.push(favorite);
    }

    store.saveAll(favorites);

    return {
      success: true,
      message: 'Article saved to favorites',
      favorite: favorite
    };
  }

  // getFavoriteArticles
  getFavoriteArticles(filters) {
    filters = filters || {};
    const store = this._favoritesStore();
    const favorites = store.getAll();
    const articles = this._getFromStorage('articles', []);

    let results = favorites;

    if (filters.tag) {
      const tag = filters.tag;
      results = results.filter(function (f) {
        const tags = f.user_tags || [];
        return tags.indexOf(tag) >= 0;
      });
    }

    const combined = results.map((f) => {
      const article = articles.find(function (a) { return a.id === f.article_id; }) || null;
      return {
        favorite: f,
        article: article
      };
    });

    const sort_by = filters.sort_by || 'date_saved';
    const sort_direction = filters.sort_direction || 'desc';

    combined.sort(function (a, b) {
      let va;
      let vb;
      if (sort_by === 'title') {
        va = (a.article && a.article.title) ? a.article.title.toLowerCase() : '';
        vb = (b.article && b.article.title) ? b.article.title.toLowerCase() : '';
      } else if (sort_by === 'publication_date') {
        va = a.article ? new Date(a.article.publication_date).getTime() : 0;
        vb = b.article ? new Date(b.article.publication_date).getTime() : 0;
      } else {
        va = new Date(a.favorite.date_saved).getTime();
        vb = new Date(b.favorite.date_saved).getTime();
      }
      if (va < vb) return sort_direction === 'asc' ? -1 : 1;
      if (va > vb) return sort_direction === 'asc' ? 1 : -1;
      return 0;
    });

    return combined;
  }

  // updateFavoriteArticlesTags
  updateFavoriteArticlesTags(favoriteIds, tags_to_add, tags_to_remove) {
    favoriteIds = this._ensureArray(favoriteIds);
    tags_to_add = this._ensureArray(tags_to_add);
    tags_to_remove = this._ensureArray(tags_to_remove);

    const store = this._favoritesStore();
    const favorites = store.getAll();

    const idSet = {};
    for (const id of favoriteIds) idSet[id] = true;

    const updated = [];

    for (const f of favorites) {
      if (!idSet[f.id]) continue;
      let tags = this._ensureArray(f.user_tags);

      for (const t of tags_to_add) {
        if (tags.indexOf(t) === -1) tags.push(t);
      }

      if (tags_to_remove.length > 0) {
        tags = tags.filter(function (t) { return tags_to_remove.indexOf(t) === -1; });
      }

      f.user_tags = tags;
      updated.push(f);
    }

    store.saveAll(favorites);

    return {
      success: true,
      message: 'Favorite article tags updated',
      updated_favorites: updated
    };
  }

  // getAboutPageContent
  getAboutPageContent() {
    return {
      mission: 'To make trauma-informed, holistic healing experiences accessible through retreats, trainings and community.',
      values: [
        'Safety and consent',
        'Embodied learning',
        'Cultural humility',
        'Accessibility and inclusion'
      ],
      approach: 'We combine meditation, yoga, somatic therapies and evidence-informed modalities to support whole-person healing.',
      differentiators: [
        'Small-group retreats with experienced facilitators',
        'Integrated online and in-person learning paths',
        'Trauma-informed framework across all offerings'
      ],
      facilitators: []
    };
  }

  // getContactPageContent
  getContactPageContent() {
    return {
      email: 'support@example-holistic-center.com',
      phone: '+1 (000) 000-0000',
      postal_address: 'Holistic Center, 123 Example Street, Anytown',
      office_hours: 'Monday to Friday, 9am - 5pm (local time)',
      response_time_message: 'We usually respond within 2 business days.'
    };
  }

  // submitContactForm
  submitContactForm(full_name, email, phone, topic, message) {
    const forms = this._getFromStorage('contact_forms', []);

    const ticket_id = this._generateId('contact_ticket');

    const record = {
      id: ticket_id,
      full_name: full_name,
      email: email,
      phone: phone || null,
      topic: topic || null,
      message: message,
      created_at: new Date().toISOString()
    };

    forms.push(record);
    this._saveToStorage('contact_forms', forms);

    return {
      success: true,
      message: 'Your message has been received',
      ticket_id: ticket_id
    };
  }

  // listCenters
  listCenters() {
    const centers = this._getFromStorage('centers', []);
    return centers;
  }

  // getCenterDetail
  getCenterDetail(centerId) {
    const centers = this._getFromStorage('centers', []);
    const retreats = this._getFromStorage('retreats', []);
    const services = this._getFromStorage('therapy_services', []);

    const center = centers.find(function (c) { return c.id === centerId; }) || null;

    if (!center) {
      return {
        center: null,
        services_summary: [],
        upcoming_retreats: []
      };
    }

    const centerServices = services.filter(function (s) { return s.center_id === center.id && s.is_active; });
    const serviceCategoriesSet = {};
    const services_summary = [];
    for (const s of centerServices) {
      if (!serviceCategoriesSet[s.category]) {
        serviceCategoriesSet[s.category] = true;
        services_summary.push(s.name || s.category);
      }
    }

    const upcoming = retreats
      .filter(function (r) { return r.center_id === center.id && r.is_active; })
      .sort(function (a, b) {
        const da = new Date(a.start_date).getTime();
        const db = new Date(b.start_date).getTime();
        return da - db;
      })
      .slice(0, 5)
      .map((r) => {
        return {
          retreat: r,
          date_range_display: this._formatDateRange(r.start_date, r.end_date),
          price_from_display: this._formatCurrency(r.price_from_per_person, r.currency)
        };
      });

    return {
      center: center,
      services_summary: services_summary,
      upcoming_retreats: upcoming
    };
  }

  // getPoliciesContent
  getPoliciesContent(policy_type) {
    let title = 'Policy';
    let body = '';

    if (policy_type === 'privacy_policy') {
      title = 'Privacy Policy';
      body = 'We respect your privacy and only use your data to provide and improve our services. Personal data is stored securely and is never sold.';
    } else if (policy_type === 'terms_and_conditions') {
      title = 'Terms and Conditions';
      body = 'By using this site and booking services, you agree to our terms including payment, cancellation, and participation guidelines.';
    } else if (policy_type === 'booking_and_cancellation') {
      title = 'Booking and Cancellation Policy';
      body = 'Retreat and training bookings may be cancelled or changed according to the timelines specified in your confirmation email.';
    } else if (policy_type === 'voucher_terms') {
      title = 'Voucher Terms';
      body = 'Gift vouchers are valid until the stated expiry date and can be redeemed for eligible services at participating centers.';
    }

    return {
      policy_type: policy_type,
      title: title,
      body: body,
      last_updated: this._formatDate(new Date().toISOString())
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