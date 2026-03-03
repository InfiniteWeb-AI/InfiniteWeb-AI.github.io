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

  // -------------------------
  // Storage helpers
  // -------------------------

  _initStorage() {
    const keys = [
      'talent_profiles',
      'talent_availability_slots',
      'talent_lists',
      'talent_list_items',
      'casting_calls',
      'booking_requests',
      'messages',
      'subscription_plans',
      'subscription_checkout_sessions',
      'events',
      'event_registrations',
      'talent_reviews',
      'contact_inquiries',
      // additional internal tables
      'talent_accounts',
      'home_overview',
      'about_content',
      'contact_info',
      'help_faq_content',
      'terms_content',
      'privacy_policy_content'
    ];

    for (const key of keys) {
      if (localStorage.getItem(key) === null) {
        // Use [] for collections, {} for singletons/content; but do NOT pre-populate entities
        const isContent = [
          'home_overview',
          'about_content',
          'contact_info',
          'help_faq_content',
          'terms_content',
          'privacy_policy_content'
        ].includes(key);
        localStorage.setItem(key, JSON.stringify(isContent ? {} : []));
      }
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }

    if (!localStorage.getItem('current_talent_id')) {
      localStorage.setItem('current_talent_id', '');
    }
  }

  _getFromStorage(key) {
    const data = localStorage.getItem(key);
    try {
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }

  _getObjectFromStorage(key) {
    const data = localStorage.getItem(key);
    try {
      return data ? JSON.parse(data) : {};
    } catch (e) {
      return {};
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

  // -------------------------
  // Private helpers (required by spec)
  // -------------------------

  _getOrCreateDefaultShortlist() {
    let lists = this._getFromStorage('talent_lists');
    let shortlist = lists.find(
      (l) => l.list_type === 'shortlist' && l.is_default === true
    );

    if (!shortlist) {
      shortlist = {
        id: this._generateId('tlist'),
        name: 'Shortlist',
        list_type: 'shortlist',
        description: 'Default shortlist',
        is_default: true,
        created_at: this._nowIso()
      };
      lists.push(shortlist);
      this._saveToStorage('talent_lists', lists);
    }

    return shortlist;
  }

  _getOrCreateFavoritesListByName(name) {
    let lists = this._getFromStorage('talent_lists');
    let list = lists.find(
      (l) => l.list_type === 'favorites_list' && l.name === name
    );

    if (!list) {
      list = {
        id: this._generateId('tlist'),
        name,
        list_type: 'favorites_list',
        description: '',
        is_default: false,
        created_at: this._nowIso()
      };
      lists.push(list);
      this._saveToStorage('talent_lists', lists);
    }

    return list;
  }

  _calculateBookingCost(talentProfile, duration_hours) {
    const hourly = typeof talentProfile.hourly_rate === 'number'
      ? talentProfile.hourly_rate
      : 0;
    const total = hourly * (duration_hours || 0);
    return {
      hourly_rate_snapshot: hourly,
      total_cost: total,
      currency: talentProfile.currency || 'USD'
    };
  }

  _getOrCreateSubscriptionCheckoutSession(planId, billing_frequency) {
    let sessions = this._getFromStorage('subscription_checkout_sessions');
    let session = sessions.find(
      (s) =>
        s.plan_id === planId &&
        s.billing_frequency === billing_frequency &&
        s.status !== 'completed' &&
        s.status !== 'cancelled'
    );

    if (!session) {
      session = {
        id: this._generateId('subsess'),
        plan_id: planId,
        billing_frequency,
        company_name: '',
        contact_email: '',
        billing_address_line1: '',
        billing_address_line2: '',
        billing_city: '',
        billing_state: '',
        billing_postal_code: '',
        billing_country: '',
        created_at: this._nowIso(),
        status: 'in_progress'
      };
      sessions.push(session);
      this._saveToStorage('subscription_checkout_sessions', sessions);
    }

    return session;
  }

  _validateEventPaymentOption(event, payment_option) {
    if (!event) return false;
    const options = Array.isArray(event.payment_options)
      ? event.payment_options
      : [];
    if (options.length === 0) {
      // If no options specified, allow any valid enum value
      return ['pay_on_site', 'pay_online', 'pay_later'].includes(payment_option);
    }
    return options.includes(payment_option);
  }

  _parseLocationDisplay(location_display) {
    if (!location_display || typeof location_display !== 'string') {
      return {
        city: '',
        state: '',
        country: ''
      };
    }
    const parts = location_display.split(',').map((p) => p.trim());
    let city = '';
    let state = '';
    let country = '';

    if (parts.length === 1) {
      city = parts[0];
    } else if (parts.length === 2) {
      city = parts[0];
      state = parts[1];
      country = 'USA';
    } else {
      city = parts[0];
      state = parts[1];
      country = parts.slice(2).join(', ');
    }

    return { city, state, country };
  }

  _applyTalentSearchFilters(
    talents,
    {
      query,
      location,
      primary_category,
      gender,
      min_age,
      max_age,
      languages_any,
      languages_all,
      min_hourly_rate,
      max_hourly_rate,
      min_rating,
      sort_by
    }
  ) {
    let filtered = talents.filter((t) => t.profile_status === 'active');

    if (location) {
      const locLower = location.toLowerCase();
      filtered = filtered.filter((t) =>
        (t.location_display || '').toLowerCase() === locLower
      );
    }

    if (primary_category) {
      const catLower = primary_category.toLowerCase();
      filtered = filtered.filter(
        (t) => (t.primary_category || '').toLowerCase() === catLower
      );
    }

    if (gender) {
      filtered = filtered.filter((t) => t.gender === gender);
    }

    if (typeof min_age === 'number') {
      filtered = filtered.filter(
        (t) => typeof t.age === 'number' && t.age >= min_age
      );
    }

    if (typeof max_age === 'number') {
      filtered = filtered.filter(
        (t) => typeof t.age === 'number' && t.age <= max_age
      );
    }

    if (Array.isArray(languages_any) && languages_any.length > 0) {
      const anyLower = languages_any.map((l) => l.toLowerCase());
      filtered = filtered.filter((t) => {
        const langs = (t.languages || []).map((l) => l.toLowerCase());
        return langs.some((l) => anyLower.includes(l));
      });
    }

    if (Array.isArray(languages_all) && languages_all.length > 0) {
      const allLower = languages_all.map((l) => l.toLowerCase());
      filtered = filtered.filter((t) => {
        const langs = (t.languages || []).map((l) => l.toLowerCase());
        return allLower.every((l) => langs.includes(l));
      });
    }

    if (typeof min_hourly_rate === 'number') {
      filtered = filtered.filter(
        (t) => typeof t.hourly_rate === 'number' && t.hourly_rate >= min_hourly_rate
      );
    }

    if (typeof max_hourly_rate === 'number') {
      filtered = filtered.filter(
        (t) => typeof t.hourly_rate === 'number' && t.hourly_rate <= max_hourly_rate
      );
    }

    if (typeof min_rating === 'number') {
      filtered = filtered.filter(
        (t) => typeof t.rating_overall === 'number' && t.rating_overall >= min_rating
      );
    }

    const sortKey = sort_by || 'relevance';

    const byRatingDesc = (a, b) => {
      const ar = typeof a.rating_overall === 'number' ? a.rating_overall : 0;
      const br = typeof b.rating_overall === 'number' ? b.rating_overall : 0;
      if (br !== ar) return br - ar;
      return (b.rating_count || 0) - (a.rating_count || 0);
    };

    const byPriceAsc = (a, b) => {
      const ap = typeof a.hourly_rate === 'number' ? a.hourly_rate : Number.MAX_SAFE_INTEGER;
      const bp = typeof b.hourly_rate === 'number' ? b.hourly_rate : Number.MAX_SAFE_INTEGER;
      if (ap !== bp) return ap - bp;
      return byRatingDesc(a, b);
    };

    const byPriceDesc = (a, b) => {
      const ap = typeof a.hourly_rate === 'number' ? a.hourly_rate : 0;
      const bp = typeof b.hourly_rate === 'number' ? b.hourly_rate : 0;
      if (bp !== ap) return bp - ap;
      return byRatingDesc(a, b);
    };

    if (sortKey === 'rating_desc') {
      filtered = filtered.slice().sort(byRatingDesc);
    } else if (sortKey === 'price_asc') {
      filtered = filtered.slice().sort(byPriceAsc);
    } else if (sortKey === 'price_desc') {
      filtered = filtered.slice().sort(byPriceDesc);
    } else if (sortKey === 'relevance') {
      // Simple relevance: rating desc.
      filtered = filtered.slice().sort(byRatingDesc);
    }

    if (query && typeof query === 'string' && query.trim()) {
      const q = query.toLowerCase();
      filtered = filtered.filter((t) => {
        const fields = [
          t.full_name,
          t.display_name,
          t.primary_category,
          (t.categories || []).join(' '),
          t.bio,
          t.location_display
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return fields.includes(q);
      });
    }

    return filtered;
  }

  _resolveMessageForeignKeys(message) {
    const talents = this._getFromStorage('talent_profiles');
    const castings = this._getFromStorage('casting_calls');
    const bookings = this._getFromStorage('booking_requests');
    const events = this._getFromStorage('events');

    const recipient_talents = (message.recipient_talent_ids || []).map((id) =>
      talents.find((t) => t.id === id) || null
    );

    const related_casting = message.related_casting_id
      ? castings.find((c) => c.id === message.related_casting_id) || null
      : null;

    const related_booking = message.related_booking_id
      ? bookings.find((b) => b.id === message.related_booking_id) || null
      : null;

    const related_event = message.related_event_id
      ? events.find((e) => e.id === message.related_event_id) || null
      : null;

    return {
      ...message,
      recipient_talents,
      related_casting,
      related_booking,
      related_event
    };
  }

  // -------------------------
  // Core interface implementations
  // -------------------------

  // getHomeOverview()
  getHomeOverview() {
    const stored = this._getObjectFromStorage('home_overview');
    if (stored && Object.keys(stored).length > 0) {
      return stored;
    }

    // Fallback static content (not persisted)
    return {
      tagline: 'Discover, book, and manage world-class talent',
      description:
        'A dedicated platform for brands, casting directors, and agencies to connect with professional models and actors worldwide.',
      highlight_bullets: [
        'Search verified talent by location, category, and budget',
        'Shortlist, book, and message talent in one place',
        'Manage castings, events, and subscriptions securely'
      ],
      primary_ctas: [
        { label: 'Find Talent', target_page: 'find_talent' },
        { label: 'Post a Casting', target_page: 'post_casting' },
        { label: 'Join as Talent', target_page: 'join_as_talent' },
        { label: 'View Events', target_page: 'view_events' },
        { label: 'View Pricing', target_page: 'view_pricing' }
      ]
    };
  }

  // getFeaturedTalent(limit = 8)
  getFeaturedTalent(limit) {
    const lim = typeof limit === 'number' ? limit : 8;
    const profiles = this._getFromStorage('talent_profiles');
    const featured = profiles
      .filter((t) => t.is_featured && t.profile_status === 'active')
      .sort((a, b) => {
        const ar = typeof a.rating_overall === 'number' ? a.rating_overall : 0;
        const br = typeof b.rating_overall === 'number' ? b.rating_overall : 0;
        if (br !== ar) return br - ar;
        return (b.rating_count || 0) - (a.rating_count || 0);
      })
      .slice(0, lim);
    return featured;
  }

  // getUpcomingFeaturedEvents(limit = 5)
  getUpcomingFeaturedEvents(limit) {
    const lim = typeof limit === 'number' ? limit : 5;
    const events = this._getFromStorage('events');
    const now = new Date();
    const upcoming = events
      .filter((e) => {
        if (!e.is_published) return false;
        const start = new Date(e.start_datetime);
        return start >= now;
      })
      .sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime))
      .slice(0, lim);
    return upcoming;
  }

  // getTalentSearchFilters()
  getTalentSearchFilters() {
    const talents = this._getFromStorage('talent_profiles');

    const locationsSet = new Set();
    const categoriesSet = new Set();
    const gendersSet = new Set();
    const languagesSet = new Set();
    const experienceSet = new Set();

    talents.forEach((t) => {
      if (t.location_display) locationsSet.add(t.location_display);
      if (t.primary_category) categoriesSet.add(t.primary_category);
      if (t.gender) gendersSet.add(t.gender);
      (t.languages || []).forEach((l) => languagesSet.add(l));
      if (t.experience_level) experienceSet.add(t.experience_level);
    });

    const sort_options = [
      { value: 'relevance', label: 'Best Match' },
      { value: 'rating_desc', label: 'Rating: High to Low' },
      { value: 'price_asc', label: 'Price: Low to High' },
      { value: 'price_desc', label: 'Price: High to Low' }
    ];

    return {
      locations: Array.from(locationsSet),
      categories: Array.from(categoriesSet),
      genders: Array.from(gendersSet),
      languages: Array.from(languagesSet),
      experience_levels: Array.from(experienceSet),
      sort_options
    };
  }

  // searchTalent(...positional args...)
  searchTalent(
    query,
    location,
    primary_category,
    gender,
    min_age,
    max_age,
    languages_any,
    languages_all,
    min_hourly_rate,
    max_hourly_rate,
    min_rating,
    sort_by,
    page,
    page_size
  ) {
    const talents = this._getFromStorage('talent_profiles');

    const filters = {
      query,
      location,
      primary_category,
      gender,
      min_age,
      max_age,
      languages_any,
      languages_all,
      min_hourly_rate,
      max_hourly_rate,
      min_rating,
      sort_by: sort_by || 'relevance'
    };

    const filtered = this._applyTalentSearchFilters(talents, filters);

    const p = typeof page === 'number' && page > 0 ? page : 1;
    const ps = typeof page_size === 'number' && page_size > 0 ? page_size : 20;
    const startIdx = (p - 1) * ps;
    const results = filtered.slice(startIdx, startIdx + ps);

    // Instrumentation for task completion tracking
    try {
      // Task 1: record specific filtered search with rating-desc sort
      const task1LocationMatch =
        typeof location === 'string' &&
        location.toLowerCase() === 'new york, ny'.toLowerCase();
      const task1CategoryMatch =
        typeof primary_category === 'string' &&
        primary_category.toLowerCase() === 'fashion model'.toLowerCase();
      const task1GenderMatch = gender === 'female';
      const task1MaxRateMatch =
        typeof max_hourly_rate === 'number' && max_hourly_rate <= 150;
      const task1MinRatingMatch =
        typeof min_rating === 'number' && min_rating >= 4.5;
      const task1SortMatch = (filters.sort_by || '') === 'rating_desc';

      if (
        task1LocationMatch &&
        task1CategoryMatch &&
        task1GenderMatch &&
        task1MaxRateMatch &&
        task1MinRatingMatch &&
        task1SortMatch
      ) {
        const task1Value = {
          location,
          primary_category,
          gender,
          max_hourly_rate,
          min_rating,
          sort_by: filters.sort_by
        };
        localStorage.setItem('task1_filterParams', JSON.stringify(task1Value));
      }

      // Task 6: record bilingual commercial actor search and top results
      const task6LocationMatch =
        typeof location === 'string' &&
        location.toLowerCase() === 'los angeles, ca'.toLowerCase();
      const task6CategoryMatch =
        typeof primary_category === 'string' &&
        primary_category.toLowerCase() === 'commercial actor'.toLowerCase();
      const task6LanguagesAllMatch =
        Array.isArray(languages_all) &&
        (function () {
          const langsLower = languages_all.map((l) =>
            l != null ? String(l).toLowerCase() : ''
          );
          return langsLower.includes('english') && langsLower.includes('spanish');
        })();
      const task6MinRatingMatch =
        typeof min_rating === 'number' && min_rating >= 4;

      const task6Condition =
        task6LocationMatch &&
        task6CategoryMatch &&
        task6LanguagesAllMatch &&
        task6MinRatingMatch;

      if (task6Condition) {
        const task6ParamsValue = {
          location,
          primary_category,
          languages_all,
          min_rating,
          sort_by: filters.sort_by
        };
        localStorage.setItem(
          'task6_searchParams',
          JSON.stringify(task6ParamsValue)
        );

        const firstThree = filtered.slice(0, 3).map((t) => t.id);
        const task6IdsValue = { ids: firstThree };
        localStorage.setItem(
          'task6_firstResultIds',
          JSON.stringify(task6IdsValue)
        );
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      results,
      total: filtered.length,
      page: p,
      page_size: ps,
      sort_by: filters.sort_by
    };
  }

  // getTalentProfileDetails(talentId)
  getTalentProfileDetails(talentId) {
    const talents = this._getFromStorage('talent_profiles');
    const reviews = this._getFromStorage('talent_reviews');

    const talent = talents.find((t) => t.id === talentId) || null;

    if (!talent) {
      return {
        talent: null,
        reviews: [],
        social_metrics: {
          instagram_followers: 0,
          social_reach_total: 0
        },
        can_message: false,
        can_book: false
      };
    }

    const talentReviews = reviews.filter((r) => r.talent_id === talent.id);

    const social_metrics = {
      instagram_followers: talent.instagram_followers || 0,
      social_reach_total: talent.social_reach_total || 0
    };

    const can_message = talent.profile_status === 'active';
    const can_book = talent.profile_status === 'active';

    // Instrumentation for task completion tracking (task 4)
    try {
      if (
        talent &&
        typeof talent.hourly_rate === 'number' &&
        talent.hourly_rate <= 150
      ) {
        const lists = this._getFromStorage('talent_lists');
        const items = this._getFromStorage('talent_list_items');

        const shortlistLists = (lists || []).filter(
          (l) => l && l.list_type === 'shortlist'
        );
        const shortlistIds = shortlistLists.map((l) => l.id);

        const inShortlist = (items || []).some(
          (i) =>
            i &&
            i.talent_id === talent.id &&
            shortlistIds.includes(i.list_id)
        );

        if (inShortlist) {
          let existing;
          try {
            const existingRaw = localStorage.getItem('task4_comparedTalentIds');
            existing = existingRaw ? JSON.parse(existingRaw) : null;
          } catch (e2) {
            existing = null;
          }

          let ids = existing && Array.isArray(existing.ids) ? existing.ids : [];
          if (!ids.includes(talent.id)) {
            ids = ids.concat([talent.id]);
            localStorage.setItem(
              'task4_comparedTalentIds',
              JSON.stringify({ ids })
            );
          }
        }
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      talent,
      reviews: talentReviews,
      social_metrics,
      can_message,
      can_book
    };
  }

  // getTalentAvailability(talentId, start_date, end_date)
  getTalentAvailability(talentId, start_date, end_date) {
    const slots = this._getFromStorage('talent_availability_slots');
    const talents = this._getFromStorage('talent_profiles');
    const talent = talents.find((t) => t.id === talentId) || null;

    const start = new Date(start_date);
    const end = new Date(end_date);

    const filtered = slots.filter((s) => {
      if (s.talent_id !== talentId) return false;
      const d = new Date(s.date);
      return d >= start && d <= end;
    });

    // Foreign key resolution: include full talent object
    return filtered.map((s) => ({
      ...s,
      talent
    }));
  }

  // getTalentListsSummary()
  getTalentListsSummary() {
    this._getOrCreateDefaultShortlist();
    const lists = this._getFromStorage('talent_lists');
    return lists;
  }

  // getTalentListItems(listId)
  getTalentListItems(listId) {
    const lists = this._getFromStorage('talent_lists');
    const items = this._getFromStorage('talent_list_items');
    const talents = this._getFromStorage('talent_profiles');

    const list = lists.find((l) => l.id === listId) || null;

    if (!list) {
      return {
        list: null,
        items: []
      };
    }

    const listItems = items.filter((i) => i.list_id === listId);

    const resultItems = listItems.map((li) => {
      const talent = talents.find((t) => t.id === li.talent_id) || null;
      return {
        list_item: {
          id: li.id,
          selected_date: li.selected_date || null,
          notes: li.notes || '',
          added_at: li.added_at || null
        },
        talent
      };
    });

    return {
      list,
      items: resultItems
    };
  }

  // createTalentList(name, list_type = 'favorites_list', description)
  createTalentList(name, list_type, description) {
    const lt = list_type || 'favorites_list';
    let lists = this._getFromStorage('talent_lists');

    const list = {
      id: this._generateId('tlist'),
      name,
      list_type: lt === 'shortlist' || lt === 'favorites_list' ? lt : 'favorites_list',
      description: description || '',
      is_default: false,
      created_at: this._nowIso()
    };

    lists.push(list);
    this._saveToStorage('talent_lists', lists);

    return { list };
  }

  // renameTalentList(listId, new_name)
  renameTalentList(listId, new_name) {
    let lists = this._getFromStorage('talent_lists');
    const idx = lists.findIndex((l) => l.id === listId);

    if (idx === -1) {
      return { success: false, list: null };
    }

    lists[idx] = { ...lists[idx], name: new_name };
    this._saveToStorage('talent_lists', lists);

    return { success: true, list: lists[idx] };
  }

  // deleteTalentList(listId)
  deleteTalentList(listId) {
    let lists = this._getFromStorage('talent_lists');
    const list = lists.find((l) => l.id === listId);

    if (!list) {
      return { success: false, message: 'List not found' };
    }

    if (list.is_default && list.list_type === 'shortlist') {
      return { success: false, message: 'Cannot delete default shortlist' };
    }

    lists = lists.filter((l) => l.id !== listId);
    this._saveToStorage('talent_lists', lists);

    // Remove associated items
    let items = this._getFromStorage('talent_list_items');
    items = items.filter((i) => i.list_id !== listId);
    this._saveToStorage('talent_list_items', items);

    return { success: true, message: 'List deleted' };
  }

  // Internal helper to add talent to list
  _addTalentToListInternal(listId, talentId, selected_date, notes) {
    const talents = this._getFromStorage('talent_profiles');
    const lists = this._getFromStorage('talent_lists');
    let items = this._getFromStorage('talent_list_items');

    const list = lists.find((l) => l.id === listId);
    const talent = talents.find((t) => t.id === talentId);

    if (!list) {
      return { success: false, list_id: listId, list_item_id: null, message: 'List not found' };
    }

    if (!talent) {
      return { success: false, list_id: listId, list_item_id: null, message: 'Talent not found' };
    }

    const list_item = {
      id: this._generateId('tlistitem'),
      list_id: listId,
      talent_id: talentId,
      added_at: this._nowIso(),
      selected_date: selected_date || null,
      notes: notes || ''
    };

    items.push(list_item);
    this._saveToStorage('talent_list_items', items);

    return {
      success: true,
      list_id: listId,
      list_item_id: list_item.id,
      message: 'Talent added to list'
    };
  }

  // addTalentToShortlist(talentId, selected_date, notes)
  addTalentToShortlist(talentId, selected_date, notes) {
    const shortlist = this._getOrCreateDefaultShortlist();
    return this._addTalentToListInternal(
      shortlist.id,
      talentId,
      selected_date,
      notes
    );
  }

  // addTalentToList(listId, talentId, selected_date, notes)
  addTalentToList(listId, talentId, selected_date, notes) {
    return this._addTalentToListInternal(listId, talentId, selected_date, notes);
  }

  // removeTalentFromList(listId, talentId)
  removeTalentFromList(listId, talentId) {
    let items = this._getFromStorage('talent_list_items');
    const before = items.length;
    items = items.filter((i) => !(i.list_id === listId && i.talent_id === talentId));
    const after = items.length;
    this._saveToStorage('talent_list_items', items);
    return { success: after < before };
  }

  // moveTalentBetweenLists(fromListId, toListId, talentId)
  moveTalentBetweenLists(fromListId, toListId, talentId) {
    let items = this._getFromStorage('talent_list_items');
    const idx = items.findIndex(
      (i) => i.list_id === fromListId && i.talent_id === talentId
    );

    if (idx === -1) {
      return { success: false, to_list_item_id: null };
    }

    const sourceItem = items[idx];

    // Create new item in destination list
    const newItem = {
      id: this._generateId('tlistitem'),
      list_id: toListId,
      talent_id: talentId,
      added_at: this._nowIso(),
      selected_date: sourceItem.selected_date || null,
      notes: sourceItem.notes || ''
    };

    items.push(newItem);
    // Remove old item
    items.splice(idx, 1);

    this._saveToStorage('talent_list_items', items);

    return { success: true, to_list_item_id: newItem.id };
  }

  // getCastingFormOptions()
  getCastingFormOptions() {
    return {
      talent_roles: ['model', 'actor', 'model_actor', 'other'],
      genders: ['female', 'male', 'non_binary', 'other', 'prefer_not_to_say'],
      rate_types: ['per_hour', 'per_day', 'flat_fee'],
      visibilities: ['public', 'private', 'invite_only'],
      creator_roles: ['client', 'casting_director', 'agency_staff'],
      currencies: ['USD', 'EUR', 'GBP']
    };
  }

  // createCastingCall(...)
  createCastingCall(
    title,
    location_display,
    talent_category,
    talent_role,
    gender,
    num_talent_needed,
    rate_type,
    rate_amount,
    currency,
    project_date,
    description,
    visibility,
    application_deadline,
    creator_role,
    status
  ) {
    const { city, state, country } = this._parseLocationDisplay(location_display);
    const calls = this._getFromStorage('casting_calls');

    const castStatus = status || 'published';
    const curr = currency || 'USD';

    const casting_call = {
      id: this._generateId('casting'),
      title,
      location_city: city,
      location_state: state,
      location_country: country || 'USA',
      location_display,
      talent_category,
      talent_role,
      gender: gender || null,
      num_talent_needed: num_talent_needed || 1,
      rate_type,
      rate_amount: rate_amount || 0,
      currency: curr,
      project_date: project_date ? new Date(project_date).toISOString() : null,
      description: description || '',
      visibility: visibility || 'public',
      application_deadline: application_deadline
        ? new Date(application_deadline).toISOString()
        : null,
      creator_role: creator_role || 'client',
      status: castStatus,
      created_at: this._nowIso(),
      updated_at: this._nowIso()
    };

    calls.push(casting_call);
    this._saveToStorage('casting_calls', calls);

    return {
      casting_call,
      message: 'Casting call created'
    };
  }

  // getTalentSignupOptions()
  getTalentSignupOptions() {
    const talents = this._getFromStorage('talent_profiles');

    const roles = ['model', 'actor', 'model_actor'];

    const primarySet = new Set();
    const languagesSet = new Set();

    talents.forEach((t) => {
      if (t.primary_category) primarySet.add(t.primary_category);
      (t.languages || []).forEach((l) => languagesSet.add(l));
    });

    const primary_categories = primarySet.size
      ? Array.from(primarySet)
      : ['Fashion Model', 'Fitness Model', 'Commercial Actor'];

    const languages = languagesSet.size
      ? Array.from(languagesSet)
      : ['English', 'Spanish'];

    const experience_levels = ['beginner', 'intermediate', 'advanced', 'expert'];

    return {
      talent_roles: roles,
      primary_categories,
      experience_levels,
      languages
    };
  }

  // registerTalentProfile(...)
  registerTalentProfile(
    full_name,
    display_name,
    email,
    password,
    location_display,
    primary_category,
    talent_role,
    experience_level,
    languages,
    bio
  ) {
    const { city, state, country } = this._parseLocationDisplay(location_display);

    let talents = this._getFromStorage('talent_profiles');
    let accounts = this._getFromStorage('talent_accounts');

    const talentId = this._generateId('talent');

    const talent_profile = {
      id: talentId,
      full_name,
      display_name: display_name || full_name,
      gender: null,
      talent_role,
      primary_category,
      categories: [],
      location_city: city,
      location_state: state,
      location_country: country || 'USA',
      location_display,
      age: null,
      date_of_birth: null,
      languages: Array.isArray(languages) ? languages : [],
      experience_level: experience_level || null,
      bio: bio || '',
      hourly_rate: 0,
      currency: 'USD',
      rating_overall: 0,
      rating_count: 0,
      instagram_followers: 0,
      social_reach_total: 0,
      profile_photo: '',
      portfolio_photos: [],
      is_featured: false,
      profile_status: 'active',
      created_at: this._nowIso(),
      updated_at: this._nowIso()
    };

    talents.push(talent_profile);
    this._saveToStorage('talent_profiles', talents);

    const account = {
      id: this._generateId('tacct'),
      email,
      password,
      talent_id: talentId,
      created_at: this._nowIso()
    };
    accounts.push(account);
    this._saveToStorage('talent_accounts', accounts);

    localStorage.setItem('current_talent_id', talentId);

    return { success: true, talent_profile };
  }

  // getMyTalentProfile()
  getMyTalentProfile() {
    const talentId = localStorage.getItem('current_talent_id');
    if (!talentId) {
      return { exists: false, talent_profile: null };
    }
    const talents = this._getFromStorage('talent_profiles');
    const talent = talents.find((t) => t.id === talentId) || null;
    if (!talent) {
      return { exists: false, talent_profile: null };
    }
    return { exists: true, talent_profile: talent };
  }

  // setMyTalentAvailability(availability_slots)
  setMyTalentAvailability(availability_slots) {
    const my = this.getMyTalentProfile();
    if (!my.exists || !my.talent_profile) {
      return { success: false, updated_slots: [] };
    }
    const talentId = my.talent_profile.id;

    let slots = this._getFromStorage('talent_availability_slots');

    const updated_slots = [];

    (availability_slots || []).forEach((slot) => {
      if (!slot || !slot.date) return;
      const dateStr = new Date(slot.date).toISOString();
      const idx = slots.findIndex(
        (s) => s.talent_id === talentId && new Date(s.date).toISOString() === dateStr
      );

      if (idx !== -1) {
        slots[idx] = {
          ...slots[idx],
          is_available: !!slot.is_available
        };
        updated_slots.push(slots[idx]);
      } else {
        const newSlot = {
          id: this._generateId('tavail'),
          talent_id: talentId,
          date: dateStr,
          is_available: !!slot.is_available,
          created_at: this._nowIso()
        };
        slots.push(newSlot);
        updated_slots.push(newSlot);
      }
    });

    this._saveToStorage('talent_availability_slots', slots);

    return { success: true, updated_slots };
  }

  // getBookingQuote(talentId, booking_date, duration_hours, budget_limit)
  getBookingQuote(talentId, booking_date, duration_hours, budget_limit) {
    const talents = this._getFromStorage('talent_profiles');
    const talent = talents.find((t) => t.id === talentId) || null;

    if (!talent) {
      return {
        talent_id: talentId,
        booking_date,
        duration_hours,
        hourly_rate_snapshot: 0,
        total_cost: 0,
        currency: 'USD',
        within_budget: false,
        message: 'Talent not found'
      };
    }

    const bookingDateIso = booking_date
      ? new Date(booking_date).toISOString()
      : null;

    const cost = this._calculateBookingCost(talent, duration_hours || 0);
    const within_budget = typeof budget_limit === 'number'
      ? cost.total_cost <= budget_limit
      : true;

    return {
      talent_id: talentId,
      booking_date: bookingDateIso,
      duration_hours: duration_hours || 0,
      hourly_rate_snapshot: cost.hourly_rate_snapshot,
      total_cost: cost.total_cost,
      currency: cost.currency,
      within_budget,
      message: within_budget
        ? 'Within budget'
        : 'Total cost exceeds budget limit'
    };
  }

  // createBookingRequest(talentId, booking_date, duration_hours, budget_limit, notes)
  createBookingRequest(
    talentId,
    booking_date,
    duration_hours,
    budget_limit,
    notes
  ) {
    const talents = this._getFromStorage('talent_profiles');
    let bookings = this._getFromStorage('booking_requests');

    const talent = talents.find((t) => t.id === talentId) || null;

    if (!talent) {
      return { success: false, booking: null, error: 'Talent not found' };
    }

    const cost = this._calculateBookingCost(talent, duration_hours || 0);

    if (typeof budget_limit === 'number' && cost.total_cost > budget_limit) {
      return {
        success: false,
        booking: null,
        error: 'Budget limit exceeded'
      };
    }

    const booking = {
      id: this._generateId('booking'),
      talent_id: talentId,
      booking_date: booking_date
        ? new Date(booking_date).toISOString()
        : null,
      duration_hours: duration_hours || 0,
      hourly_rate_snapshot: cost.hourly_rate_snapshot,
      total_cost: cost.total_cost,
      currency: cost.currency,
      budget_limit: typeof budget_limit === 'number' ? budget_limit : null,
      notes: notes || '',
      status: 'pending',
      created_at: this._nowIso()
    };

    bookings.push(booking);
    this._saveToStorage('booking_requests', bookings);

    // Attach foreign key resolution for convenience
    const bookingWithTalent = {
      ...booking,
      talent
    };

    return {
      success: true,
      booking: bookingWithTalent,
      error: null
    };
  }

  // getMessages(folder = 'inbox', limit = 20, offset = 0)
  getMessages(folder, limit, offset) {
    const msgs = this._getFromStorage('messages');
    const folderVal = folder || 'inbox';
    const lim = typeof limit === 'number' ? limit : 20;
    const off = typeof offset === 'number' ? offset : 0;

    let filtered = msgs;

    if (folderVal === 'inbox') {
      filtered = msgs.filter((m) => m.sender_role !== 'client');
    } else if (folderVal === 'sent') {
      filtered = msgs.filter((m) => m.sender_role === 'client');
    }

    filtered = filtered
      .slice()
      .sort((a, b) => new Date(b.sent_at || 0) - new Date(a.sent_at || 0));

    const paged = filtered.slice(off, off + lim);

    return paged.map((m) => this._resolveMessageForeignKeys(m));
  }

  // sendMessageToTalents(subject, body, recipientTalentIds, ...)
  sendMessageToTalents(
    subject,
    body,
    recipientTalentIds,
    related_casting_id,
    related_booking_id,
    related_event_id
  ) {
    if (!body || !Array.isArray(recipientTalentIds) || recipientTalentIds.length === 0) {
      return { success: false, message_id: null, sent_at: null };
    }

    const talents = this._getFromStorage('talent_profiles');
    const validRecipientIds = recipientTalentIds.filter((id) =>
      talents.some((t) => t.id === id)
    );

    if (validRecipientIds.length === 0) {
      return { success: false, message_id: null, sent_at: null };
    }

    let messages = this._getFromStorage('messages');

    const msg = {
      id: this._generateId('msg'),
      subject: subject || null,
      body,
      sender_role: 'client',
      sender_display_name: 'Client',
      recipient_talent_ids: validRecipientIds,
      related_casting_id: related_casting_id || null,
      related_booking_id: related_booking_id || null,
      related_event_id: related_event_id || null,
      sent_at: this._nowIso(),
      is_read: false
    };

    messages.push(msg);
    this._saveToStorage('messages', messages);

    return {
      success: true,
      message_id: msg.id,
      sent_at: msg.sent_at
    };
  }

  // getSubscriptionPlans(plan_type, plan_tier, billing_frequency, price_max_monthly)
  getSubscriptionPlans(plan_type, plan_tier, billing_frequency, price_max_monthly) {
    const plans = this._getFromStorage('subscription_plans');

    let filtered = plans.filter((p) => p.is_active);

    if (plan_type) {
      filtered = filtered.filter((p) => p.plan_type === plan_type);
    }

    if (plan_tier) {
      filtered = filtered.filter((p) => p.plan_tier === plan_tier);
    }

    if (billing_frequency === 'monthly') {
      filtered = filtered.filter((p) => p.supports_monthly_billing);
    } else if (billing_frequency === 'annual') {
      filtered = filtered.filter((p) => p.supports_annual_billing);
    }

    if (typeof price_max_monthly === 'number') {
      filtered = filtered.filter(
        (p) => typeof p.price_monthly === 'number' && p.price_monthly <= price_max_monthly
      );
    }

    return filtered;
  }

  // startSubscriptionCheckoutSession(planId, billing_frequency)
  startSubscriptionCheckoutSession(planId, billing_frequency) {
    const plans = this._getFromStorage('subscription_plans');
    const plan = plans.find((p) => p.id === planId) || null;

    if (!plan) {
      return {
        checkoutId: null,
        plan: null,
        billing_frequency,
        status: 'cancelled'
      };
    }

    if (billing_frequency === 'monthly' && !plan.supports_monthly_billing) {
      return {
        checkoutId: null,
        plan,
        billing_frequency,
        status: 'cancelled'
      };
    }

    if (billing_frequency === 'annual' && !plan.supports_annual_billing) {
      return {
        checkoutId: null,
        plan,
        billing_frequency,
        status: 'cancelled'
      };
    }

    const session = this._getOrCreateSubscriptionCheckoutSession(
      planId,
      billing_frequency
    );

    return {
      checkoutId: session.id,
      plan,
      billing_frequency: session.billing_frequency,
      status: session.status
    };
  }

  // updateSubscriptionCheckoutBilling(checkoutId, ...)
  updateSubscriptionCheckoutBilling(
    checkoutId,
    company_name,
    contact_email,
    billing_address_line1,
    billing_address_line2,
    billing_city,
    billing_state,
    billing_postal_code,
    billing_country
  ) {
    let sessions = this._getFromStorage('subscription_checkout_sessions');
    const idx = sessions.findIndex((s) => s.id === checkoutId);

    if (idx === -1) {
      return { checkoutId, success: false, status: 'cancelled' };
    }

    const session = sessions[idx];

    const updated = {
      ...session,
      company_name: company_name || session.company_name || '',
      contact_email: contact_email || session.contact_email || '',
      billing_address_line1: billing_address_line1 || session.billing_address_line1 || '',
      billing_address_line2: billing_address_line2 || session.billing_address_line2 || '',
      billing_city: billing_city || session.billing_city || '',
      billing_state: billing_state || session.billing_state || '',
      billing_postal_code: billing_postal_code || session.billing_postal_code || '',
      billing_country: billing_country || session.billing_country || ''
    };

    sessions[idx] = updated;
    this._saveToStorage('subscription_checkout_sessions', sessions);

    return {
      checkoutId,
      success: true,
      status: updated.status
    };
  }

  // proceedSubscriptionCheckoutToReview(checkoutId)
  proceedSubscriptionCheckoutToReview(checkoutId) {
    let sessions = this._getFromStorage('subscription_checkout_sessions');
    const plans = this._getFromStorage('subscription_plans');

    const idx = sessions.findIndex((s) => s.id === checkoutId);
    if (idx === -1) {
      return {
        checkoutId,
        status: 'cancelled',
        summary: null
      };
    }

    let session = sessions[idx];
    session = { ...session, status: 'review' };
    sessions[idx] = session;
    this._saveToStorage('subscription_checkout_sessions', sessions);

    const plan = plans.find((p) => p.id === session.plan_id) || null;

    let price_per_interval = 0;
    let currency = 'USD';

    if (plan) {
      currency = plan.currency || 'USD';
      if (session.billing_frequency === 'monthly') {
        price_per_interval = plan.price_monthly || 0;
      } else if (session.billing_frequency === 'annual') {
        price_per_interval = plan.price_annual || 0;
      }
    }

    return {
      checkoutId,
      status: session.status,
      summary: {
        plan,
        billing_frequency: session.billing_frequency,
        price_per_interval,
        currency
      }
    };
  }

  // getEvents(location, event_type, title_query, start_date, end_date, sort_by, page, page_size)
  getEvents(
    location,
    event_type,
    title_query,
    start_date,
    end_date,
    sort_by,
    page,
    page_size
  ) {
    const events = this._getFromStorage('events');

    let filtered = events.filter((e) => e.is_published);

    if (location) {
      const locLower = location.toLowerCase();
      filtered = filtered.filter(
        (e) => (e.location_display || '').toLowerCase() === locLower
      );
    }

    if (event_type) {
      filtered = filtered.filter((e) => e.event_type === event_type);
    }

    if (title_query && typeof title_query === 'string') {
      const tq = title_query.toLowerCase();
      filtered = filtered.filter((e) =>
        (e.title || '').toLowerCase().includes(tq)
      );
    }

    if (start_date) {
      const sd = new Date(start_date);
      filtered = filtered.filter((e) => new Date(e.start_datetime) >= sd);
    }

    if (end_date) {
      const ed = new Date(end_date);
      filtered = filtered.filter((e) => new Date(e.start_datetime) <= ed);
    }

    const sortKey = sort_by || 'date_asc';

    if (sortKey === 'date_asc') {
      filtered = filtered
        .slice()
        .sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime));
    } else if (sortKey === 'date_desc') {
      filtered = filtered
        .slice()
        .sort((a, b) => new Date(b.start_datetime) - new Date(a.start_datetime));
    }

    const p = typeof page === 'number' && page > 0 ? page : 1;
    const ps = typeof page_size === 'number' && page_size > 0 ? page_size : 20;
    const startIdx = (p - 1) * ps;
    const results = filtered.slice(startIdx, startIdx + ps);

    return {
      results,
      total: filtered.length,
      page: p,
      page_size: ps
    };
  }

  // getEventDetails(eventId)
  getEventDetails(eventId) {
    const events = this._getFromStorage('events');
    const event = events.find((e) => e.id === eventId) || null;
    return { event };
  }

  // createEventRegistration(eventId, seats_reserved, payment_option)
  createEventRegistration(eventId, seats_reserved, payment_option) {
    const events = this._getFromStorage('events');
    const event = events.find((e) => e.id === eventId) || null;

    if (!event) {
      return {
        success: false,
        registration: null,
        message: 'Event not found'
      };
    }

    if (!this._validateEventPaymentOption(event, payment_option)) {
      return {
        success: false,
        registration: null,
        message: 'Invalid payment option for this event'
      };
    }

    const seats = seats_reserved || 0;

    if (
      typeof event.capacity_remaining === 'number' &&
      event.capacity_remaining < seats
    ) {
      return {
        success: false,
        registration: null,
        message: 'Not enough capacity remaining'
      };
    }

    let regs = this._getFromStorage('event_registrations');

    const total_price = (event.price_per_seat || 0) * seats;
    const registration = {
      id: this._generateId('ereg'),
      event_id: eventId,
      seats_reserved: seats,
      payment_option,
      total_price,
      currency: event.currency || 'USD',
      registered_at: this._nowIso(),
      status: payment_option === 'pay_online' ? 'confirmed' : 'pending'
    };

    regs.push(registration);
    this._saveToStorage('event_registrations', regs);

    // Update event capacity
    const updatedEvents = events.map((e) => {
      if (e.id !== eventId) return e;
      let remaining = e.capacity_remaining;
      if (typeof remaining === 'number') {
        remaining = remaining - seats;
        if (remaining < 0) remaining = 0;
      }
      return {
        ...e,
        capacity_remaining: remaining
      };
    });

    this._saveToStorage('events', updatedEvents);

    return {
      success: true,
      registration,
      message: 'Registration created'
    };
  }

  // getAboutContent()
  getAboutContent() {
    const stored = this._getObjectFromStorage('about_content');
    if (stored && Object.keys(stored).length > 0) {
      return stored;
    }

    return {
      title: 'About Our Agency',
      mission:
        'We connect brands with diverse, professional models and actors through a transparent and efficient digital platform.',
      values: [
        'Professionalism',
        'Diversity & Inclusion',
        'Transparency',
        'Safety'
      ],
      specializations: [
        'Fashion & Editorial',
        'Commercial & Lifestyle',
        'Fitness & Sports',
        'Events & Promotions'
      ]
    };
  }

  // getContactInfo()
  getContactInfo() {
    const stored = this._getObjectFromStorage('contact_info');
    if (stored && Object.keys(stored).length > 0) {
      return stored;
    }

    return {
      support_email: 'support@example-agency.com',
      phone_numbers: ['+1 (555) 000-0000'],
      office_locations: [
        {
          label: 'Head Office',
          address: '123 Talent Ave, New York, NY 10001, USA'
        }
      ]
    };
  }

  // submitContactInquiry(name, email, subject, message)
  submitContactInquiry(name, email, subject, message) {
    if (!email || !message) {
      return { success: false, inquiry_id: null, status: 'closed' };
    }

    let inquiries = this._getFromStorage('contact_inquiries');

    const inquiry = {
      id: this._generateId('contact'),
      name: name || null,
      email,
      subject: subject || null,
      message,
      created_at: this._nowIso(),
      status: 'new'
    };

    inquiries.push(inquiry);
    this._saveToStorage('contact_inquiries', inquiries);

    return {
      success: true,
      inquiry_id: inquiry.id,
      status: inquiry.status
    };
  }

  // getHelpFaqContent()
  getHelpFaqContent() {
    const stored = this._getObjectFromStorage('help_faq_content');
    if (stored && Array.isArray(stored) && stored.length > 0) {
      return stored;
    }

    // Minimal default FAQ
    return [
      {
        section_id: 'general',
        title: 'General',
        questions: [
          {
            question: 'How do I book a model?',
            answer:
              'Use the Find Talent search, shortlist profiles, and send a booking request from the model profile page.'
          },
          {
            question: 'How do I join as talent?',
            answer:
              'Click “Join as Talent” on the homepage and complete the signup form to create your profile.'
          }
        ]
      }
    ];
  }

  // getTermsContent()
  getTermsContent() {
    const stored = this._getObjectFromStorage('terms_content');
    if (stored && Object.keys(stored).length > 0) {
      return stored;
    }

    return {
      last_updated: '2024-01-01',
      content: 'Terms & Conditions will be provided by the agency and displayed here.'
    };
  }

  // getPrivacyPolicyContent()
  getPrivacyPolicyContent() {
    const stored = this._getObjectFromStorage('privacy_policy_content');
    if (stored && Object.keys(stored).length > 0) {
      return stored;
    }

    return {
      last_updated: '2024-01-01',
      content:
        'Our privacy policy explains how we handle your personal data and cookies on this platform.'
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