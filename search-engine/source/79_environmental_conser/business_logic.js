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

  _initStorage() {
    const keys = [
      'events',
      'saved_events',
      'event_registrations',
      'actions',
      'action_plans',
      'action_plan_items',
      'carbon_assessments',
      'carbon_reduction_goals',
      'conservation_projects',
      'donation_pledges',
      'articles',
      'article_bookmarks',
      'reading_lists',
      'reading_list_items',
      'volunteer_groups',
      'group_memberships',
      'quiz_questions',
      'quiz_options',
      'quiz_sessions',
      'challenges',
      'activated_challenges',
      'faq_entries',
      'contact_submissions'
    ];
    for (const key of keys) {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    }
    if (!localStorage.getItem('about_page_content')) {
      localStorage.setItem(
        'about_page_content',
        JSON.stringify({
          mission: '',
          vision: '',
          focus_areas: [],
          approach_to_education: '',
          approach_to_tools: '',
          approach_to_community_engagement: ''
        })
      );
    }
    if (!localStorage.getItem('contact_page_info')) {
      localStorage.setItem(
        'contact_page_info',
        JSON.stringify({
          support_email: '',
          mailing_address: '',
          contact_categories: [],
          faq_link_label: ''
        })
      );
    }
    if (!localStorage.getItem('privacy_policy_content')) {
      localStorage.setItem(
        'privacy_policy_content',
        JSON.stringify({
          last_updated: '',
          sections: []
        })
      );
    }
    if (!localStorage.getItem('user_state')) {
      localStorage.setItem('user_state', JSON.stringify({}));
    }
    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, defaultValue = []) {
    const data = localStorage.getItem(key);
    if (!data) return defaultValue;
    try {
      return JSON.parse(data);
    } catch (e) {
      return defaultValue;
    }
  }

  _getObjectFromStorage(key, defaultValue = {}) {
    const data = localStorage.getItem(key);
    if (!data) {
      localStorage.setItem(key, JSON.stringify(defaultValue));
      return defaultValue;
    }
    try {
      return JSON.parse(data);
    } catch (e) {
      localStorage.setItem(key, JSON.stringify(defaultValue));
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

  _getUserStateStore() {
    const state = this._getObjectFromStorage('user_state', {});
    return state || {};
  }

  _saveUserStateStore(state) {
    this._saveToStorage('user_state', state || {});
  }

  _getOrCreateActiveActionPlan() {
    const plans = this._getFromStorage('action_plans');
    let plan = plans.find((p) => p.status === 'active');
    if (!plan) {
      const now = new Date().toISOString();
      plan = {
        id: this._generateId('plan'),
        name: '',
        description: '',
        status: 'active',
        created_at: now,
        updated_at: now
      };
      plans.push(plan);
      this._saveToStorage('action_plans', plans);
    }
    return plan;
  }

  _getLatestCarbonAssessment() {
    const assessments = this._getFromStorage('carbon_assessments');
    if (!assessments.length) return null;
    const sorted = assessments.slice().sort((a, b) => {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
    return sorted[0];
  }

  _getOrCreateQuizSession() {
    const sessions = this._getFromStorage('quiz_sessions');
    let session = sessions.find((s) => s.status === 'in_progress');
    if (!session) {
      const now = new Date().toISOString();
      session = {
        id: this._generateId('quizsession'),
        started_at: now,
        completed_at: null,
        status: 'in_progress',
        results_summary: ''
      };
      sessions.push(session);
      this._saveToStorage('quiz_sessions', sessions);
    }
    return session;
  }

  _calculateDistanceMiles(entity, postalCode) {
    if (!entity) return null;
    // If postal code matches exactly, assume 0 miles
    if (postalCode && entity.postal_code && entity.postal_code === postalCode) {
      return 0;
    }
    // If entity has a cached distance value, use it
    if (typeof entity.distance_miles_from_reference === 'number') {
      return entity.distance_miles_from_reference;
    }
    // If we have lat/long but no reference point, we cannot compute; return null
    return null;
  }

  _formatDistanceLabel(distance) {
    if (typeof distance !== 'number' || isNaN(distance)) return '';
    return distance.toFixed(1) + ' mi';
  }

  _mapEventTypeLabel(type) {
    switch (type) {
      case 'in_person':
        return 'In-Person';
      case 'webinar':
        return 'Webinar';
      case 'online_event':
        return 'Online Event';
      default:
        return '';
    }
  }

  _mapEventCategoryLabel(category) {
    if (!category) return '';
    return category
      .split('_')
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
      .join(' ');
  }

  _mapProjectCategoryLabel(category) {
    if (!category) return '';
    return category
      .split('_')
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
      .join(' ');
  }

  _mapVolunteerFocusLabel(focus) {
    if (!focus) return '';
    return focus
      .split('_')
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
      .join(' ');
  }

  _buildLocationSummary(entity) {
    if (!entity) return '';
    if (entity.location_name) return entity.location_name;
    const parts = [];
    if (entity.city) parts.push(entity.city);
    if (entity.state_region) parts.push(entity.state_region);
    if (entity.country && !entity.state_region) parts.push(entity.country);
    return parts.join(', ');
  }

  _buildDashboardSnapshot() {
    const nowIso = new Date().toISOString();
    const events = this._getFromStorage('events');
    const savedEvents = this._getFromStorage('saved_events');
    const registrations = this._getFromStorage('event_registrations');
    const activatedChallenges = this._getFromStorage('activated_challenges');
    const challenges = this._getFromStorage('challenges');
    const actionPlans = this._getFromStorage('action_plans');
    const actionPlanItems = this._getFromStorage('action_plan_items');
    const carbonGoals = this._getFromStorage('carbon_reduction_goals');
    const pledges = this._getFromStorage('donation_pledges');
    const projects = this._getFromStorage('conservation_projects');
    const readingLists = this._getFromStorage('reading_lists');
    const readingListItems = this._getFromStorage('reading_list_items');

    // Challenges
    const challengesOverview = activatedChallenges.map((ac) => {
      const ch = challenges.find((c) => c.id === ac.challenge_id) || null;
      return {
        activated_challenge_id: ac.id,
        name: ch ? ch.name : '',
        category: ch ? ch.category : '',
        difficulty: ch ? ch.difficulty : '',
        frequency: ac.frequency,
        status: ac.status
      };
    });

    // Upcoming events (bookmarked or registered)
    const upcomingEventsMap = new Map();
    const nowTime = new Date(nowIso).getTime();

    for (const se of savedEvents) {
      const ev = events.find((e) => e.id === se.event_id);
      if (!ev) continue;
      const startTime = new Date(ev.start_datetime).getTime();
      if (isNaN(startTime)) continue;
      const key = ev.id;
      const existing = upcomingEventsMap.get(key) || {};
      upcomingEventsMap.set(key, {
        event_id: ev.id,
        title: ev.title,
        start_datetime: ev.start_datetime,
        day_of_week_label: ev.day_of_week,
        time_of_day_label: ev.time_of_day_label || '',
        location_summary: this._buildLocationSummary(ev),
        is_registered: existing.is_registered || false,
        is_bookmarked: true,
        event: ev
      });
    }

    for (const reg of registrations) {
      if (reg.status !== 'registered') continue;
      const ev = events.find((e) => e.id === reg.event_id);
      if (!ev) continue;
      const startTime = new Date(ev.start_datetime).getTime();
      if (isNaN(startTime)) continue;
      const key = ev.id;
      const existing = upcomingEventsMap.get(key) || {};
      upcomingEventsMap.set(key, {
        event_id: ev.id,
        title: ev.title,
        start_datetime: ev.start_datetime,
        day_of_week_label: ev.day_of_week,
        time_of_day_label: ev.time_of_day_label || '',
        location_summary: this._buildLocationSummary(ev),
        is_registered: true,
        is_bookmarked: existing.is_bookmarked || false,
        event: ev
      });
    }

    const upcoming_events = Array.from(upcomingEventsMap.values()).sort((a, b) => {
      return new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime();
    });

    // Action plan summary (active)
    const activePlan = actionPlans.find((p) => p.status === 'active') || null;
    let action_plan_summary = {
      plan_id: null,
      plan_name: '',
      total_actions: 0,
      total_estimated_monthly_cost: 0
    };
    if (activePlan) {
      const items = actionPlanItems.filter((i) => i.plan_id === activePlan.id);
      const actions = this._getFromStorage('actions');
      let totalCost = 0;
      for (const item of items) {
        const act = actions.find((a) => a.id === item.action_id);
        if (act && typeof act.estimated_monthly_cost === 'number') {
          totalCost += act.estimated_monthly_cost;
        }
      }
      action_plan_summary = {
        plan_id: activePlan.id,
        plan_name: activePlan.name,
        total_actions: items.length,
        total_estimated_monthly_cost: totalCost
      };
    }

    // Carbon goal summary (latest active)
    let carbon_goal_summary = {
      goal_id: null,
      goal_name: '',
      reduction_percentage: 0,
      baseline_emissions_tons_co2e: 0,
      target_emissions_tons_co2e: 0
    };
    const activeGoals = carbonGoals.filter((g) => g.status === 'active');
    if (activeGoals.length) {
      const latestGoal = activeGoals
        .slice()
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
      carbon_goal_summary = {
        goal_id: latestGoal.id,
        goal_name: latestGoal.name,
        reduction_percentage: latestGoal.reduction_percentage,
        baseline_emissions_tons_co2e: latestGoal.baseline_emissions_tons_co2e,
        target_emissions_tons_co2e: latestGoal.target_emissions_tons_co2e
      };
    }

    // Donation pledges summary (active)
    const donation_pledges = pledges
      .filter((p) => p.status === 'active')
      .map((p) => {
        const proj = projects.find((pr) => pr.id === p.project_id) || null;
        return {
          pledge_id: p.id,
          project_name: proj ? proj.name : '',
          category_label: proj ? this._mapProjectCategoryLabel(proj.category) : '',
          amount: p.amount,
          frequency: p.frequency,
          status: p.status,
          project: proj
        };
      });

    // Reading lists summary
    const reading_lists_summary = readingLists.map((rl) => {
      const count = readingListItems.filter((it) => it.reading_list_id === rl.id).length;
      return {
        reading_list_id: rl.id,
        name: rl.name,
        item_count: count
      };
    });

    return {
      challenges: challengesOverview,
      upcoming_events,
      action_plan_summary,
      carbon_goal_summary,
      donation_pledges,
      reading_lists_summary
    };
  }

  // ==========================
  // Homepage & Static Content
  // ==========================

  getHomePageHighlights() {
    const events = this._getFromStorage('events');
    const savedEvents = this._getFromStorage('saved_events');
    const articles = this._getFromStorage('articles');
    const bookmarkedEventIds = new Set(savedEvents.map((se) => se.event_id));
    const bookmarkedArticleIds = new Set(
      this._getFromStorage('article_bookmarks').map((b) => b.article_id)
    );

    const featured_events = events
      .filter((e) => e.is_featured)
      .map((e) => ({
        event_id: e.id,
        title: e.title,
        subtitle: e.subtitle || '',
        start_datetime: e.start_datetime,
        day_of_week_label: e.day_of_week,
        time_of_day_label: e.time_of_day_label || '',
        location_summary: this._buildLocationSummary(e),
        category_label: this._mapEventCategoryLabel(e.category),
        type_label: this._mapEventTypeLabel(e.type),
        is_webinar: e.type === 'webinar' || e.type === 'online_event',
        is_bookmarked: bookmarkedEventIds.has(e.id),
        event: e
      }));

    const featured_articles = articles
      .filter((a) => a.is_featured || a.difficulty_level === 'beginner')
      .map((a) => ({
        article_id: a.id,
        title: a.title,
        subtitle: a.subtitle || '',
        topic: a.topic || '',
        summary: a.summary || '',
        publication_date: a.publication_date,
        reading_time_minutes: a.reading_time_minutes,
        difficulty_level: a.difficulty_level,
        is_bookmarked: bookmarkedArticleIds.has(a.id),
        article: a
      }));

    const primary_tools = [
      {
        tool_key: 'lifestyle_quiz',
        label: 'Lifestyle Quiz',
        description: 'Discover daily habits to reduce your environmental impact.'
      },
      {
        tool_key: 'carbon_calculator',
        label: 'Carbon Footprint Calculator',
        description: 'Estimate your household emissions and set reduction goals.'
      },
      {
        tool_key: 'action_planner',
        label: 'Action Planner',
        description: 'Build a personalized conservation action plan.'
      }
    ];

    return { featured_events, featured_articles, primary_tools };
  }

  getAboutPageContent() {
    return this._getObjectFromStorage('about_page_content', {
      mission: '',
      vision: '',
      focus_areas: [],
      approach_to_education: '',
      approach_to_tools: '',
      approach_to_community_engagement: ''
    });
  }

  getContactPageInfo() {
    return this._getObjectFromStorage('contact_page_info', {
      support_email: '',
      mailing_address: '',
      contact_categories: [],
      faq_link_label: ''
    });
  }

  submitContactForm(name, email, subject, category, message) {
    const submissions = this._getFromStorage('contact_submissions');
    const id = this._generateId('contact');
    const now = new Date().toISOString();
    submissions.push({
      id,
      name,
      email,
      subject: subject || '',
      category: category || 'general',
      message,
      created_at: now
    });
    this._saveToStorage('contact_submissions', submissions);
    return { success: true, ticket_id: id, message: 'Message received' };
  }

  getFaqEntries() {
    const faq_entries = this._getFromStorage('faq_entries');
    return { faq_entries };
  }

  getPrivacyPolicyContent() {
    return this._getObjectFromStorage('privacy_policy_content', {
      last_updated: '',
      sections: []
    });
  }

  // ==================
  // Events & Programs
  // ==================

  getEventFilterOptions() {
    const events = this._getFromStorage('events');
    const event_types = Array.from(new Set(events.map((e) => e.type).filter(Boolean)));
    const categories = Array.from(new Set(events.map((e) => e.category).filter(Boolean)));
    const topicsSet = new Set();
    const dayOfWeekSet = new Set();
    const timeOfDaySet = new Set();
    const distances = [];

    for (const e of events) {
      if (Array.isArray(e.topics)) {
        e.topics.forEach((t) => topicsSet.add(t));
      }
      if (e.day_of_week) dayOfWeekSet.add(e.day_of_week);
      if (e.time_of_day_label) timeOfDaySet.add(e.time_of_day_label);
      if (typeof e.distance_miles_from_reference === 'number') {
        distances.push(e.distance_miles_from_reference);
      }
    }

    const distance_range_miles = {
      min: distances.length ? Math.max(0, Math.min(...distances)) : 0,
      max: distances.length ? Math.max(...distances) : 100,
      default: 25
    };

    const date_filter_presets = [
      { key: 'this_week', label: 'This Week' },
      { key: 'this_month', label: 'This Month' },
      { key: 'next_60_days', label: 'Next 60 Days' }
    ];

    const sort_options = [
      { key: 'date_soonest_first', label: 'Date - Soonest First' },
      { key: 'date_latest_first', label: 'Date - Latest First' }
    ];

    return {
      event_types,
      categories,
      topics: Array.from(topicsSet),
      day_of_week_options: Array.from(dayOfWeekSet),
      time_of_day_options: Array.from(timeOfDaySet),
      distance_range_miles,
      date_filter_presets,
      sort_options
    };
  }

  searchEvents(keyword, filters, sort_by, page = 1, page_size = 20) {
    const events = this._getFromStorage('events');
    const savedEvents = this._getFromStorage('saved_events');
    const registrations = this._getFromStorage('event_registrations');
    const bookmarkedIds = new Set(savedEvents.map((se) => se.event_id));
    const registeredIds = new Set(
      registrations.filter((r) => r.status === 'registered').map((r) => r.event_id)
    );

    const f = filters || {};
    const kw = keyword ? String(keyword).toLowerCase() : null;
    const distanceCache = new Map();

    let results = events.filter((e) => {
      if (kw) {
        const text = ((e.title || '') + ' ' + (e.description || '')).toLowerCase();
        if (!text.includes(kw)) return false;
      }

      if (f.postal_code) {
        if (f.max_distance_miles != null) {
          const dKey = e.id;
          let dist = distanceCache.get(dKey);
          if (dist === undefined) {
            dist = this._calculateDistanceMiles(e, f.postal_code);
            distanceCache.set(dKey, dist);
          }
          if (dist == null || dist > f.max_distance_miles) return false;
        }
      }

      if (f.start_date) {
        const eventDate = new Date(e.start_datetime).getTime();
        const startDate = new Date(f.start_date).getTime();
        if (!isNaN(startDate) && !isNaN(eventDate) && eventDate < startDate) return false;
      }

      if (f.end_date) {
        const eventDate = new Date(e.start_datetime).getTime();
        const endDate = new Date(f.end_date).getTime();
        if (!isNaN(endDate) && !isNaN(eventDate) && eventDate > endDate) return false;
      }

      if (Array.isArray(f.event_types) && f.event_types.length) {
        if (!f.event_types.includes(e.type)) return false;
      }

      if (Array.isArray(f.categories) && f.categories.length) {
        if (!f.categories.includes(e.category)) return false;
      }

      if (Array.isArray(f.topics) && f.topics.length) {
        const etopics = Array.isArray(e.topics) ? e.topics : [];
        const hasTopic = f.topics.some((t) => etopics.includes(t));
        if (!hasTopic) return false;
      }

      if (Array.isArray(f.days_of_week) && f.days_of_week.length) {
        if (!f.days_of_week.includes(e.day_of_week)) return false;
      }

      if (Array.isArray(f.time_of_day_labels) && f.time_of_day_labels.length) {
        if (!f.time_of_day_labels.includes(e.time_of_day_label)) return false;
      }

      return true;
    });

    if (sort_by === 'date_soonest_first') {
      results = results.slice().sort((a, b) => {
        return new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime();
      });
    } else if (sort_by === 'date_latest_first') {
      results = results.slice().sort((a, b) => {
        return new Date(b.start_datetime).getTime() - new Date(a.start_datetime).getTime();
      });
    }

    // Save last event search postal code for distance display in details
    if (f.postal_code) {
      const state = this._getUserStateStore();
      state.last_event_search = state.last_event_search || {};
      state.last_event_search.postal_code = f.postal_code;
      this._saveUserStateStore(state);
    }

    const total_count = results.length;
    const startIndex = (page - 1) * page_size;
    const pageItems = results.slice(startIndex, startIndex + page_size);

    const mapped = pageItems.map((e) => {
      let dist = null;
      if (f && f.postal_code) {
        const dKey = e.id;
        dist = distanceCache.has(dKey)
          ? distanceCache.get(dKey)
          : this._calculateDistanceMiles(e, f.postal_code);
      }
      return {
        event_id: e.id,
        title: e.title,
        subtitle: e.subtitle || '',
        start_datetime: e.start_datetime,
        end_datetime: e.end_datetime || null,
        day_of_week_label: e.day_of_week,
        time_of_day_label: e.time_of_day_label || '',
        timezone: e.timezone || '',
        location_summary: this._buildLocationSummary(e),
        postal_code: e.postal_code || '',
        distance_miles: dist,
        distance_display: this._formatDistanceLabel(dist),
        type_label: this._mapEventTypeLabel(e.type),
        category_label: this._mapEventCategoryLabel(e.category),
        topics: Array.isArray(e.topics) ? e.topics : [],
        registration_required: !!e.registration_required,
        remaining_spots: typeof e.remaining_spots === 'number' ? e.remaining_spots : null,
        is_webinar: e.type === 'webinar' || e.type === 'online_event',
        is_bookmarked: bookmarkedIds.has(e.id),
        is_registered: registeredIds.has(e.id),
        event: e
      };
    });

    return {
      results: mapped,
      total_count,
      page,
      page_size,
      applied_sort: sort_by || null
    };
  }

  getEventDetails(eventId) {
    const events = this._getFromStorage('events');
    const event = events.find((e) => e.id === eventId) || null;
    const savedEvents = this._getFromStorage('saved_events');
    const registrations = this._getFromStorage('event_registrations');

    if (!event) {
      return {
        event: null,
        display: {},
        user_state: { is_bookmarked: false, is_registered: false }
      };
    }

    const state = this._getUserStateStore();
    const postalCode = state.last_event_search && state.last_event_search.postal_code;
    const dist = postalCode ? this._calculateDistanceMiles(event, postalCode) : null;

    const start = event.start_datetime ? new Date(event.start_datetime) : null;
    const end = event.end_datetime ? new Date(event.end_datetime) : null;
    const date_display = start ? start.toISOString() : '';
    let time_range_display = '';
    if (start && end) {
      time_range_display = start.toISOString() + ' - ' + end.toISOString();
    } else if (start) {
      time_range_display = start.toISOString();
    }

    const full_address_parts = [];
    if (event.address_line1) full_address_parts.push(event.address_line1);
    if (event.address_line2) full_address_parts.push(event.address_line2);
    if (event.city) full_address_parts.push(event.city);
    if (event.state_region) full_address_parts.push(event.state_region);
    if (event.postal_code) full_address_parts.push(event.postal_code);
    if (event.country) full_address_parts.push(event.country);

    const is_bookmarked = savedEvents.some((se) => se.event_id === event.id);
    const is_registered = registrations.some(
      (r) => r.event_id === event.id && r.status === 'registered'
    );

    return {
      event,
      display: {
        date_display,
        time_range_display,
        weekday_label: event.day_of_week,
        full_address_display: full_address_parts.join(', '),
        distance_miles_from_last_search: dist,
        distance_display: this._formatDistanceLabel(dist),
        category_label: this._mapEventCategoryLabel(event.category),
        type_label: this._mapEventTypeLabel(event.type)
      },
      user_state: {
        is_bookmarked,
        is_registered
      }
    };
  }

  bookmarkEvent(eventId, source = 'bookmark_button') {
    const savedEvents = this._getFromStorage('saved_events');
    const existing = savedEvents.find((se) => se.event_id === eventId);
    if (existing) {
      return {
        success: true,
        saved_event_id: existing.id,
        already_bookmarked: true,
        message: 'Event already bookmarked'
      };
    }
    const id = this._generateId('savedevent');
    const now = new Date().toISOString();
    savedEvents.push({ id, event_id: eventId, saved_at: now, source });
    this._saveToStorage('saved_events', savedEvents);
    return {
      success: true,
      saved_event_id: id,
      already_bookmarked: false,
      message: 'Event bookmarked'
    };
  }

  registerForEvent(eventId, registrant_name, registrant_email, add_to_dashboard = true) {
    const registrations = this._getFromStorage('event_registrations');
    const id = this._generateId('eventreg');
    const now = new Date().toISOString();
    const registration = {
      id,
      event_id: eventId,
      registrant_name,
      registrant_email,
      registration_datetime: now,
      status: 'registered',
      add_to_dashboard: !!add_to_dashboard
    };
    registrations.push(registration);
    this._saveToStorage('event_registrations', registrations);

    if (add_to_dashboard) {
      this.bookmarkEvent(eventId, 'auto_registration');
    }

    return {
      success: true,
      registration,
      message: 'Registration successful'
    };
  }

  getMyEventsOverview() {
    const events = this._getFromStorage('events');
    const savedEvents = this._getFromStorage('saved_events');
    const registrations = this._getFromStorage('event_registrations');

    const bookmarked_events = savedEvents.map((se) => {
      const ev = events.find((e) => e.id === se.event_id) || null;
      if (!ev) {
        return {
          event_id: se.event_id,
          title: '',
          start_datetime: '',
          day_of_week_label: '',
          time_of_day_label: '',
          location_summary: '',
          category_label: '',
          type_label: '',
          event: null
        };
      }
      return {
        event_id: ev.id,
        title: ev.title,
        start_datetime: ev.start_datetime,
        day_of_week_label: ev.day_of_week,
        time_of_day_label: ev.time_of_day_label || '',
        location_summary: this._buildLocationSummary(ev),
        category_label: this._mapEventCategoryLabel(ev.category),
        type_label: this._mapEventTypeLabel(ev.type),
        event: ev
      };
    });

    const registered_events = registrations
      .filter((r) => r.status === 'registered')
      .map((r) => {
        const ev = events.find((e) => e.id === r.event_id) || null;
        if (!ev) {
          return {
            event_id: r.event_id,
            title: '',
            start_datetime: '',
            day_of_week_label: '',
            time_of_day_label: '',
            location_summary: '',
            registration_status: r.status,
            event: null
          };
        }
        return {
          event_id: ev.id,
          title: ev.title,
          start_datetime: ev.start_datetime,
          day_of_week_label: ev.day_of_week,
          time_of_day_label: ev.time_of_day_label || '',
          location_summary: this._buildLocationSummary(ev),
          registration_status: r.status,
          event: ev
        };
      });

    return { bookmarked_events, registered_events };
  }

  // ==================
  // Action Planner
  // ==================

  getActionFilterOptions() {
    const actions = this._getFromStorage('actions');
    const costs = actions.map((a) => a.estimated_monthly_cost).filter((n) => typeof n === 'number');
    const impacts = actions.map((a) => a.impact_score).filter((n) => typeof n === 'number');

    const cost_range = {
      min: costs.length ? Math.min(...costs) : 0,
      max: costs.length ? Math.max(...costs) : 0,
      default_max: 50
    };

    const impact_score_range = {
      min: impacts.length ? Math.min(...impacts) : 0,
      max: impacts.length ? Math.max(...impacts) : 0
    };

    const categories = Array.from(new Set(actions.map((a) => a.category).filter(Boolean)));
    const tagsSet = new Set();
    for (const a of actions) {
      if (Array.isArray(a.tags)) {
        a.tags.forEach((t) => tagsSet.add(t));
      }
    }

    const sort_options = [
      { key: 'impact_high_to_low', label: 'Impact - High to Low' },
      { key: 'impact_low_to_high', label: 'Impact - Low to High' },
      { key: 'cost_low_to_high', label: 'Cost - Low to High' },
      { key: 'cost_high_to_low', label: 'Cost - High to Low' }
    ];

    return {
      cost_range,
      impact_score_range,
      categories,
      tags: Array.from(tagsSet),
      sort_options
    };
  }

  searchActions(filters, sort_by, page = 1, page_size = 20) {
    const actions = this._getFromStorage('actions');
    const f = filters || {};

    const plans = this._getFromStorage('action_plans');
    const activePlan = plans.find((p) => p.status === 'active') || null;
    const planItems = this._getFromStorage('action_plan_items');
    const currentActionIds = new Set(
      activePlan
        ? planItems.filter((i) => i.plan_id === activePlan.id).map((i) => i.action_id)
        : []
    );

    let results = actions.filter((a) => {
      if (f.only_active && !a.is_active) return false;
      if (f.min_monthly_cost != null && a.estimated_monthly_cost < f.min_monthly_cost) return false;
      if (f.max_monthly_cost != null && a.estimated_monthly_cost > f.max_monthly_cost) return false;
      if (f.min_impact_score != null && a.impact_score < f.min_impact_score) return false;
      if (Array.isArray(f.categories) && f.categories.length) {
        if (!f.categories.includes(a.category)) return false;
      }
      if (Array.isArray(f.tags) && f.tags.length) {
        const atags = Array.isArray(a.tags) ? a.tags : [];
        const hasTag = f.tags.some((t) => atags.includes(t));
        if (!hasTag) return false;
      }
      return true;
    });

    if (sort_by === 'impact_high_to_low') {
      results = results.slice().sort((a, b) => b.impact_score - a.impact_score);
    } else if (sort_by === 'impact_low_to_high') {
      results = results.slice().sort((a, b) => a.impact_score - b.impact_score);
    } else if (sort_by === 'cost_low_to_high') {
      results = results.slice().sort((a, b) => a.estimated_monthly_cost - b.estimated_monthly_cost);
    } else if (sort_by === 'cost_high_to_low') {
      results = results.slice().sort((a, b) => b.estimated_monthly_cost - a.estimated_monthly_cost);
    }

    const total_count = results.length;
    const startIndex = (page - 1) * page_size;
    const pageItems = results.slice(startIndex, startIndex + page_size);

    const mapped = pageItems.map((a) => ({
      action_id: a.id,
      name: a.name,
      short_description: a.short_description,
      estimated_monthly_cost: a.estimated_monthly_cost,
      impact_score: a.impact_score,
      category: a.category,
      tags: Array.isArray(a.tags) ? a.tags : [],
      is_active: a.is_active,
      is_in_current_plan: currentActionIds.has(a.id),
      action: a
    }));

    return { results: mapped, total_count, page, page_size };
  }

  addActionToActiveActionPlan(actionId) {
    const plan = this._getOrCreateActiveActionPlan();
    const items = this._getFromStorage('action_plan_items');
    const planItems = items.filter((i) => i.plan_id === plan.id);
    const existing = planItems.find((i) => i.action_id === actionId);
    if (existing) {
      return {
        success: true,
        plan: {
          plan_id: plan.id,
          name: plan.name,
          status: plan.status,
          total_actions: planItems.length
        },
        added_item: {
          action_plan_item_id: existing.id,
          action_id: existing.action_id,
          order_index: existing.order_index || 0
        },
        message: 'Action already in plan'
      };
    }

    const order_index = planItems.length
      ? Math.max(...planItems.map((i) => i.order_index || 0)) + 1
      : 1;
    const id = this._generateId('planitem');
    const newItem = {
      id,
      plan_id: plan.id,
      action_id: actionId,
      order_index,
      notes: ''
    };
    items.push(newItem);
    this._saveToStorage('action_plan_items', items);

    const plans = this._getFromStorage('action_plans');
    const now = new Date().toISOString();
    const planIndex = plans.findIndex((p) => p.id === plan.id);
    if (planIndex !== -1) {
      plans[planIndex].updated_at = now;
      this._saveToStorage('action_plans', plans);
    }

    const total_actions = planItems.length + 1;
    return {
      success: true,
      plan: {
        plan_id: plan.id,
        name: plan.name,
        status: plan.status,
        total_actions
      },
      added_item: {
        action_plan_item_id: id,
        action_id: actionId,
        order_index
      },
      message: 'Action added to plan'
    };
  }

  removeActionFromActiveActionPlan(actionId) {
    const plans = this._getFromStorage('action_plans');
    const plan = plans.find((p) => p.status === 'active');
    if (!plan) {
      return {
        success: false,
        plan_id: null,
        remaining_actions: 0,
        message: 'No active plan found'
      };
    }
    let items = this._getFromStorage('action_plan_items');
    const beforeCount = items.filter((i) => i.plan_id === plan.id).length;
    const newItems = items.filter(
      (i) => !(i.plan_id === plan.id && i.action_id === actionId)
    );
    const afterCount = newItems.filter((i) => i.plan_id === plan.id).length;
    const removed = beforeCount - afterCount;
    if (removed > 0) {
      this._saveToStorage('action_plan_items', newItems);
      return {
        success: true,
        plan_id: plan.id,
        remaining_actions: afterCount,
        message: 'Action removed from plan'
      };
    }
    return {
      success: false,
      plan_id: plan.id,
      remaining_actions: afterCount,
      message: 'Action not found in plan'
    };
  }

  getActiveActionPlanOverview() {
    const plan = this._getOrCreateActiveActionPlan();
    const items = this._getFromStorage('action_plan_items').filter(
      (i) => i.plan_id === plan.id
    );
    const actions = this._getFromStorage('actions');

    const fullItems = items
      .slice()
      .sort((a, b) => (a.order_index || 0) - (b.order_index || 0))
      .map((item) => {
        const act = actions.find((a) => a.id === item.action_id) || null;
        return {
          action_plan_item_id: item.id,
          order_index: item.order_index || 0,
          notes: item.notes || '',
          action: act
            ? {
                id: act.id,
                name: act.name,
                short_description: act.short_description,
                estimated_monthly_cost: act.estimated_monthly_cost,
                impact_score: act.impact_score,
                category: act.category
              }
            : null
        };
      });

    let totalCost = 0;
    const impactScores = [];
    for (const fi of fullItems) {
      if (fi.action) {
        if (typeof fi.action.estimated_monthly_cost === 'number') {
          totalCost += fi.action.estimated_monthly_cost;
        }
        if (typeof fi.action.impact_score === 'number') {
          impactScores.push(fi.action.impact_score);
        }
      }
    }
    const average_impact_score = impactScores.length
      ? impactScores.reduce((a, b) => a + b, 0) / impactScores.length
      : 0;

    return {
      plan: {
        plan_id: plan.id,
        name: plan.name,
        description: plan.description || '',
        status: plan.status,
        created_at: plan.created_at,
        updated_at: plan.updated_at
      },
      items: fullItems,
      summary: {
        total_actions: fullItems.length,
        total_estimated_monthly_cost: totalCost,
        average_impact_score
      }
    };
  }

  saveActiveActionPlan(name, description) {
    const plans = this._getFromStorage('action_plans');
    let plan = plans.find((p) => p.status === 'active');
    if (!plan) {
      plan = this._getOrCreateActiveActionPlan();
    }
    const now = new Date().toISOString();
    plan.name = name;
    if (description !== undefined) {
      plan.description = description;
    }
    plan.updated_at = now;
    const idx = plans.findIndex((p) => p.id === plan.id);
    if (idx === -1) {
      plans.push(plan);
    } else {
      plans[idx] = plan;
    }
    this._saveToStorage('action_plans', plans);

    return {
      success: true,
      plan: {
        plan_id: plan.id,
        name: plan.name,
        description: plan.description || '',
        status: plan.status,
        updated_at: plan.updated_at
      },
      message: 'Action plan saved'
    };
  }

  // =====================
  // Carbon Calculator
  // =====================

  calculateCarbonFootprint(
    household_size,
    bedrooms,
    weekly_driving_miles,
    vehicle_fuel_type,
    monthly_electricity_kwh,
    heating_type,
    monthly_natural_gas_therms
  ) {
    const hhSize = Number(household_size) || 0;
    const weeklyMiles = Number(weekly_driving_miles) || 0;
    const monthlyKwh = Number(monthly_electricity_kwh) || 0;
    const monthlyTherms = Number(monthly_natural_gas_therms) || 0;

    // Simple emission factors in tons CO2e
    const EF_DRIVING_TON_PER_MILE = 0.000404; // approx 404 g/mile
    const EF_ELECTRICITY_TON_PER_KWH = 0.000417; // approx 0.417 kg/kWh
    const EF_NATGAS_TON_PER_THERM = 0.0053; // approx 5.3 kg/therm

    const drivingTons = weeklyMiles * 52 * EF_DRIVING_TON_PER_MILE;
    const electricityTons = monthlyKwh * 12 * EF_ELECTRICITY_TON_PER_KWH;
    const heatTons = heating_type === 'natural_gas' ? monthlyTherms * 12 * EF_NATGAS_TON_PER_THERM : 0;
    const basePerPersonTons = hhSize * 0.5; // simple constant overhead

    const baseline = drivingTons + electricityTons + heatTons + basePerPersonTons;

    const now = new Date().toISOString();
    const assessment = {
      id: this._generateId('carbon'),
      household_size: hhSize,
      bedrooms: bedrooms != null ? Number(bedrooms) : null,
      weekly_driving_miles: weeklyMiles || null,
      vehicle_fuel_type: vehicle_fuel_type || null,
      monthly_electricity_kwh: monthlyKwh || null,
      heating_type: heating_type || null,
      monthly_natural_gas_therms: monthlyTherms || null,
      baseline_annual_emissions_tons_co2e: baseline,
      created_at: now,
      notes: ''
    };

    const assessments = this._getFromStorage('carbon_assessments');
    assessments.push(assessment);
    this._saveToStorage('carbon_assessments', assessments);

    const total = baseline || 0.00001;
    const emissions_by_category = [
      {
        category: 'transportation',
        tons_co2e: drivingTons,
        percentage: (drivingTons / total) * 100
      },
      {
        category: 'home_energy',
        tons_co2e: electricityTons + heatTons,
        percentage: ((electricityTons + heatTons) / total) * 100
      },
      {
        category: 'other',
        tons_co2e: basePerPersonTons,
        percentage: (basePerPersonTons / total) * 100
      }
    ];

    let comparison_to_average = 'About average compared to similar households.';
    if (baseline < 5) {
      comparison_to_average = 'Below average emissions for a typical household.';
    } else if (baseline > 20) {
      comparison_to_average = 'Above average emissions for a typical household.';
    }

    return {
      assessment: {
        id: assessment.id,
        household_size: assessment.household_size,
        bedrooms: assessment.bedrooms,
        weekly_driving_miles: assessment.weekly_driving_miles,
        vehicle_fuel_type: assessment.vehicle_fuel_type,
        monthly_electricity_kwh: assessment.monthly_electricity_kwh,
        heating_type: assessment.heating_type,
        monthly_natural_gas_therms: assessment.monthly_natural_gas_therms,
        baseline_annual_emissions_tons_co2e: assessment.baseline_annual_emissions_tons_co2e,
        created_at: assessment.created_at
      },
      results_summary: {
        baseline_annual_emissions_tons_co2e: baseline,
        emissions_by_category,
        comparison_to_average
      },
      can_set_reduction_goal: baseline > 0
    };
  }

  setCarbonReductionGoalForLatestAssessment(reduction_percentage, name) {
    const assessment = this._getLatestCarbonAssessment();
    if (!assessment) {
      return {
        success: false,
        goal: null,
        message: 'No assessment found to base goal on.'
      };
    }
    const rp = Number(reduction_percentage) || 0;
    if (rp <= 0) {
      return {
        success: false,
        goal: null,
        message: 'Reduction percentage must be greater than 0.'
      };
    }
    const baseline = assessment.baseline_annual_emissions_tons_co2e || 0;
    const target = baseline * (1 - rp / 100);
    const now = new Date().toISOString();
    const goal = {
      id: this._generateId('cgoal'),
      assessment_id: assessment.id,
      name,
      reduction_percentage: rp,
      baseline_emissions_tons_co2e: baseline,
      target_emissions_tons_co2e: target,
      status: 'active',
      created_at: now
    };
    const goals = this._getFromStorage('carbon_reduction_goals');
    goals.push(goal);
    this._saveToStorage('carbon_reduction_goals', goals);

    return {
      success: true,
      goal,
      message: 'Carbon reduction goal created.'
    };
  }

  getCarbonCalculatorSummary() {
    const latest_assessment = this._getLatestCarbonAssessment();
    const goals = this._getFromStorage('carbon_reduction_goals');
    const activeGoals = goals.filter((g) => g.status === 'active');
    let active_goal = null;
    if (activeGoals.length) {
      active_goal = activeGoals
        .slice()
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
    }
    return {
      latest_assessment: latest_assessment
        ? {
            id: latest_assessment.id,
            baseline_annual_emissions_tons_co2e:
              latest_assessment.baseline_annual_emissions_tons_co2e,
            created_at: latest_assessment.created_at
          }
        : null,
      active_goal
    };
  }

  // =========================
  // Conservation Projects
  // =========================

  getConservationProjectFilterOptions() {
    const projects = this._getFromStorage('conservation_projects');
    const categories = Array.from(new Set(projects.map((p) => p.category).filter(Boolean)));
    const tr = projects.map((p) => p.transparency_rating).filter((n) => typeof n === 'number');
    const sd = projects
      .map((p) => p.suggested_monthly_donation)
      .filter((n) => typeof n === 'number');

    const transparency_rating_range = {
      min: tr.length ? Math.min(...tr) : 0,
      max: tr.length ? Math.max(...tr) : 0
    };

    const suggested_monthly_donation_range = {
      min: sd.length ? Math.min(...sd) : 0,
      max: sd.length ? Math.max(...sd) : 0
    };

    const sort_options = [
      { key: 'suggested_monthly_low_to_high', label: 'Suggested Monthly - Low to High' },
      { key: 'suggested_monthly_high_to_low', label: 'Suggested Monthly - High to Low' },
      { key: 'transparency_high_to_low', label: 'Transparency - High to Low' }
    ];

    return {
      categories,
      transparency_rating_range,
      suggested_monthly_donation_range,
      sort_options
    };
  }

  searchConservationProjects(filters, sort_by, page = 1, page_size = 20) {
    const projects = this._getFromStorage('conservation_projects');
    const f = filters || {};

    let results = projects.filter((p) => {
      if (f.only_active && !p.is_active) return false;
      if (Array.isArray(f.categories) && f.categories.length) {
        if (!f.categories.includes(p.category)) return false;
      }
      if (f.min_transparency_rating != null) {
        if (p.transparency_rating < f.min_transparency_rating) return false;
      }
      if (f.max_suggested_monthly_donation != null && p.suggested_monthly_donation != null) {
        if (p.suggested_monthly_donation > f.max_suggested_monthly_donation) return false;
      }
      return true;
    });

    if (sort_by === 'suggested_monthly_low_to_high') {
      results = results.slice().sort((a, b) => {
        const av = a.suggested_monthly_donation || 0;
        const bv = b.suggested_monthly_donation || 0;
        return av - bv;
      });
    } else if (sort_by === 'suggested_monthly_high_to_low') {
      results = results.slice().sort((a, b) => {
        const av = a.suggested_monthly_donation || 0;
        const bv = b.suggested_monthly_donation || 0;
        return bv - av;
      });
    } else if (sort_by === 'transparency_high_to_low') {
      results = results.slice().sort((a, b) => b.transparency_rating - a.transparency_rating);
    }

    const total_count = results.length;
    const startIndex = (page - 1) * page_size;
    const pageItems = results.slice(startIndex, startIndex + page_size);

    const mapped = pageItems.map((p) => ({
      project_id: p.id,
      name: p.name,
      short_description: p.short_description,
      category: p.category,
      category_label: this._mapProjectCategoryLabel(p.category),
      geographic_focus: p.geographic_focus || '',
      transparency_rating: p.transparency_rating,
      suggested_monthly_donation: p.suggested_monthly_donation || null,
      suggested_monthly_label:
        typeof p.suggested_monthly_donation === 'number'
          ? '$' + p.suggested_monthly_donation + '/mo'
          : 'N/A',
      impact_score: typeof p.impact_score === 'number' ? p.impact_score : null,
      is_active: p.is_active,
      project: p
    }));

    return { results: mapped, total_count, page, page_size };
  }

  getConservationProjectDetails(projectId) {
    const projects = this._getFromStorage('conservation_projects');
    const project = projects.find((p) => p.id === projectId) || null;
    const pledges = this._getFromStorage('donation_pledges');

    if (!project) {
      return {
        project: null,
        display: {},
        user_state: { has_active_pledge: false, active_pledge: null }
      };
    }

    const activePledges = pledges.filter(
      (pl) => pl.project_id === project.id && pl.status === 'active'
    );
    let active_pledge = null;
    if (activePledges.length) {
      active_pledge = activePledges
        .slice()
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
    }

    return {
      project,
      display: {
        category_label: this._mapProjectCategoryLabel(project.category),
        transparency_label: project.transparency_rating + ' / 5',
        suggested_monthly_label:
          typeof project.suggested_monthly_donation === 'number'
            ? '$' + project.suggested_monthly_donation + '/mo'
            : 'N/A'
      },
      user_state: {
        has_active_pledge: !!active_pledge,
        active_pledge: active_pledge
          ? {
              pledge_id: active_pledge.id,
              amount: active_pledge.amount,
              frequency: active_pledge.frequency,
              status: active_pledge.status
            }
          : null
      }
    };
  }

  createDonationPledge(projectId, donor_name, donor_email, amount, frequency) {
    const pledges = this._getFromStorage('donation_pledges');
    const id = this._generateId('pledge');
    const now = new Date().toISOString();
    const pledge = {
      id,
      project_id: projectId,
      donor_name,
      donor_email,
      amount: Number(amount) || 0,
      frequency,
      start_date: now,
      status: 'active',
      created_at: now
    };
    pledges.push(pledge);
    this._saveToStorage('donation_pledges', pledges);

    return {
      success: true,
      pledge,
      message: 'Pledge created.'
    };
  }

  getActiveDonationPledgesSummary() {
    const pledges = this._getFromStorage('donation_pledges');
    const projects = this._getFromStorage('conservation_projects');
    const active = pledges.filter((p) => p.status === 'active');

    const mapped = active.map((p) => {
      const proj = projects.find((pr) => pr.id === p.project_id) || null;
      return {
        pledge_id: p.id,
        project_id: p.project_id,
        project_name: proj ? proj.name : '',
        category_label: proj ? this._mapProjectCategoryLabel(proj.category) : '',
        amount: p.amount,
        frequency: p.frequency,
        status: p.status,
        project: proj
      };
    });

    return { pledges: mapped };
  }

  // ================
  // Articles
  // ================

  getArticleFilterOptions() {
    const articles = this._getFromStorage('articles');
    const topics = Array.from(new Set(articles.map((a) => a.topic).filter(Boolean)));
    const difficulty_levels = Array.from(
      new Set(articles.map((a) => a.difficulty_level).filter(Boolean))
    );

    const reading_time_presets = [
      { max_minutes: 5, label: 'Up to 5 minutes' },
      { max_minutes: 10, label: 'Up to 10 minutes' },
      { max_minutes: 20, label: 'Up to 20 minutes' }
    ];

    const date_range_presets = [
      { key: 'last_6_months', label: 'Last 6 months' },
      { key: 'last_1_year', label: 'Last year' },
      { key: 'last_2_years', label: 'Last 2 years' }
    ];

    const sort_options = [
      { key: 'most_recent', label: 'Most Recent' },
      { key: 'oldest_first', label: 'Oldest First' }
    ];

    return {
      topics,
      difficulty_levels,
      reading_time_presets,
      date_range_presets,
      sort_options
    };
  }

  searchArticles(query, filters, sort_by, page = 1, page_size = 20) {
    const articles = this._getFromStorage('articles');
    const bookmarks = this._getFromStorage('article_bookmarks');
    const bookmarkedIds = new Set(bookmarks.map((b) => b.article_id));
    const f = filters || {};
    const q = query ? String(query).toLowerCase() : null;

    let results = articles.filter((a) => {
      if (q) {
        const text = (
          (a.title || '') +
          ' ' +
          (a.subtitle || '') +
          ' ' +
          (a.summary || '') +
          ' ' +
          (a.content || '')
        ).toLowerCase();
        if (!text.includes(q)) return false;
      }
      if (f.topic && a.topic !== f.topic) return false;
      if (f.min_publication_date) {
        const ad = new Date(a.publication_date).getTime();
        const min = new Date(f.min_publication_date).getTime();
        if (!isNaN(min) && !isNaN(ad) && ad < min) return false;
      }
      if (f.max_publication_date) {
        const ad = new Date(a.publication_date).getTime();
        const max = new Date(f.max_publication_date).getTime();
        if (!isNaN(max) && !isNaN(ad) && ad > max) return false;
      }
      if (f.max_reading_time_minutes != null) {
        if (a.reading_time_minutes > f.max_reading_time_minutes) return false;
      }
      if (Array.isArray(f.difficulty_levels) && f.difficulty_levels.length) {
        if (!f.difficulty_levels.includes(a.difficulty_level)) return false;
      }
      if (f.only_featured && !a.is_featured) return false;
      return true;
    });

    if (sort_by === 'most_recent') {
      results = results.slice().sort((a, b) => {
        return new Date(b.publication_date).getTime() - new Date(a.publication_date).getTime();
      });
    } else if (sort_by === 'oldest_first') {
      results = results.slice().sort((a, b) => {
        return new Date(a.publication_date).getTime() - new Date(b.publication_date).getTime();
      });
    }

    const total_count = results.length;
    const startIndex = (page - 1) * page_size;
    const pageItems = results.slice(startIndex, startIndex + page_size);

    const mapped = pageItems.map((a) => ({
      article_id: a.id,
      title: a.title,
      subtitle: a.subtitle || '',
      topic: a.topic || '',
      summary: a.summary || '',
      publication_date: a.publication_date,
      reading_time_minutes: a.reading_time_minutes,
      difficulty_level: a.difficulty_level,
      is_featured: !!a.is_featured,
      is_bookmarked: bookmarkedIds.has(a.id),
      article: a
    }));

    return { results: mapped, total_count, page, page_size };
  }

  getArticleDetails(articleId) {
    const articles = this._getFromStorage('articles');
    const article = articles.find((a) => a.id === articleId) || null;
    const bookmarks = this._getFromStorage('article_bookmarks');
    const readingLists = this._getFromStorage('reading_lists');
    const readingListItems = this._getFromStorage('reading_list_items');

    if (!article) {
      return {
        article: null,
        user_state: { is_bookmarked: false, in_reading_lists: [] },
        related_articles: []
      };
    }

    const is_bookmarked = bookmarks.some((b) => b.article_id === article.id);
    const in_reading_lists = readingListItems
      .filter((it) => it.article_id === article.id)
      .map((it) => {
        const rl = readingLists.find((r) => r.id === it.reading_list_id);
        return {
          reading_list_id: it.reading_list_id,
          reading_list_name: rl ? rl.name : ''
        };
      });

    const related_articles = articles
      .filter((a) => a.id !== article.id && a.topic && a.topic === article.topic)
      .slice(0, 3)
      .map((a) => ({ article_id: a.id, title: a.title, topic: a.topic || '' }));

    return {
      article,
      user_state: {
        is_bookmarked,
        in_reading_lists
      },
      related_articles
    };
  }

  bookmarkArticle(articleId) {
    const bookmarks = this._getFromStorage('article_bookmarks');
    const existing = bookmarks.find((b) => b.article_id === articleId);
    if (existing) {
      return {
        success: true,
        bookmark_id: existing.id,
        already_bookmarked: true,
        message: 'Article already bookmarked'
      };
    }
    const id = this._generateId('abook');
    const now = new Date().toISOString();
    bookmarks.push({ id, article_id: articleId, bookmarked_at: now });
    this._saveToStorage('article_bookmarks', bookmarks);
    return {
      success: true,
      bookmark_id: id,
      already_bookmarked: false,
      message: 'Article bookmarked'
    };
  }

  getBookmarkedArticles() {
    const bookmarks = this._getFromStorage('article_bookmarks');
    const articles = this._getFromStorage('articles');
    const bookmarked_articles = bookmarks.map((b) => {
      const a = articles.find((ar) => ar.id === b.article_id) || null;
      if (!a) {
        return {
          article_id: b.article_id,
          title: '',
          topic: '',
          publication_date: '',
          reading_time_minutes: 0,
          difficulty_level: '',
          article: null
        };
      }
      return {
        article_id: a.id,
        title: a.title,
        topic: a.topic || '',
        publication_date: a.publication_date,
        reading_time_minutes: a.reading_time_minutes,
        difficulty_level: a.difficulty_level,
        article: a
      };
    });
    return { bookmarked_articles };
  }

  createReadingList(name, description) {
    const lists = this._getFromStorage('reading_lists');
    const now = new Date().toISOString();
    const rl = {
      id: this._generateId('rlist'),
      name,
      description: description || '',
      created_at: now,
      updated_at: now
    };
    lists.push(rl);
    this._saveToStorage('reading_lists', lists);
    return {
      success: true,
      reading_list: rl,
      message: 'Reading list created.'
    };
  }

  updateReadingList(readingListId, name, description) {
    const lists = this._getFromStorage('reading_lists');
    const idx = lists.findIndex((l) => l.id === readingListId);
    if (idx === -1) {
      return { success: false, reading_list: null, message: 'Reading list not found.' };
    }
    const now = new Date().toISOString();
    if (name !== undefined) lists[idx].name = name;
    if (description !== undefined) lists[idx].description = description;
    lists[idx].updated_at = now;
    this._saveToStorage('reading_lists', lists);
    return {
      success: true,
      reading_list: {
        id: lists[idx].id,
        name: lists[idx].name,
        description: lists[idx].description,
        updated_at: lists[idx].updated_at
      },
      message: 'Reading list updated.'
    };
  }

  deleteReadingList(readingListId) {
    const lists = this._getFromStorage('reading_lists');
    const items = this._getFromStorage('reading_list_items');
    const newLists = lists.filter((l) => l.id !== readingListId);
    const removed = lists.length - newLists.length;
    const newItems = items.filter((it) => it.reading_list_id !== readingListId);
    this._saveToStorage('reading_lists', newLists);
    this._saveToStorage('reading_list_items', newItems);
    return {
      success: removed > 0,
      message: removed > 0 ? 'Reading list deleted.' : 'Reading list not found.'
    };
  }

  addArticleToReadingList(articleId, readingListId) {
    const items = this._getFromStorage('reading_list_items');
    const listItems = items.filter((it) => it.reading_list_id === readingListId);
    const existing = listItems.find((it) => it.article_id === articleId);
    if (existing) {
      return {
        success: true,
        reading_list_item: existing,
        message: 'Article already in reading list.'
      };
    }
    const order_index = listItems.length
      ? Math.max(...listItems.map((it) => it.order_index || 0)) + 1
      : 1;
    const now = new Date().toISOString();
    const item = {
      id: this._generateId('rlitem'),
      reading_list_id: readingListId,
      article_id: articleId,
      added_at: now,
      order_index
    };
    items.push(item);
    this._saveToStorage('reading_list_items', items);
    return {
      success: true,
      reading_list_item: item,
      message: 'Article added to reading list.'
    };
  }

  removeArticleFromReadingList(readingListItemId) {
    const items = this._getFromStorage('reading_list_items');
    const newItems = items.filter((it) => it.id !== readingListItemId);
    const removed = items.length - newItems.length;
    this._saveToStorage('reading_list_items', newItems);
    return {
      success: removed > 0,
      message: removed > 0 ? 'Article removed from reading list.' : 'Reading list item not found.'
    };
  }

  getMyReadingListsOverview() {
    const lists = this._getFromStorage('reading_lists');
    const items = this._getFromStorage('reading_list_items');
    const reading_lists = lists.map((rl) => {
      const count = items.filter((it) => it.reading_list_id === rl.id).length;
      return {
        reading_list_id: rl.id,
        name: rl.name,
        description: rl.description || '',
        item_count: count,
        created_at: rl.created_at,
        updated_at: rl.updated_at
      };
    });
    return { reading_lists };
  }

  getReadingListDetails(readingListId) {
    const lists = this._getFromStorage('reading_lists');
    const rl = lists.find((l) => l.id === readingListId) || null;
    const items = this._getFromStorage('reading_list_items').filter(
      (it) => it.reading_list_id === readingListId
    );
    const articles = this._getFromStorage('articles');

    const mappedItems = items
      .slice()
      .sort((a, b) => (a.order_index || 0) - (b.order_index || 0))
      .map((it) => {
        const a = articles.find((ar) => ar.id === it.article_id) || null;
        return {
          reading_list_item_id: it.id,
          article_id: it.article_id,
          added_at: it.added_at,
          order_index: it.order_index || 0,
          article: a
            ? {
                title: a.title,
                topic: a.topic || '',
                publication_date: a.publication_date,
                reading_time_minutes: a.reading_time_minutes,
                difficulty_level: a.difficulty_level
              }
            : null
        };
      });

    return {
      reading_list: rl,
      items: mappedItems
    };
  }

  // =====================
  // Volunteer Groups
  // =====================

  getVolunteerGroupFilterOptions() {
    const groups = this._getFromStorage('volunteer_groups');
    const focus_areas = Array.from(new Set(groups.map((g) => g.focus_area).filter(Boolean)));
    const ratings = groups.map((g) => g.average_rating).filter((n) => typeof n === 'number');
    const rating_range = {
      min: ratings.length ? Math.min(...ratings) : 0,
      max: ratings.length ? Math.max(...ratings) : 0
    };

    const distance_range_miles = {
      min: 0,
      max: 100,
      default: 10
    };

    const sort_options = [
      { key: 'rating_high_to_low', label: 'Rating - High to Low' },
      { key: 'distance_low_to_high', label: 'Distance - Low to High' },
      { key: 'name_a_to_z', label: 'Name A to Z' }
    ];

    return {
      focus_areas,
      rating_range,
      distance_range_miles,
      sort_options
    };
  }

  searchVolunteerGroups(filters, sort_by, page = 1, page_size = 20) {
    const groups = this._getFromStorage('volunteer_groups');
    const f = filters || {};

    const distanceCache = new Map();

    let results = groups.filter((g) => {
      if (f.only_active && !g.is_active) return false;
      if (Array.isArray(f.focus_areas) && f.focus_areas.length) {
        if (!f.focus_areas.includes(g.focus_area)) return false;
      }
      if (f.min_average_rating != null) {
        if (g.average_rating < f.min_average_rating) return false;
      }
      if (f.postal_code && f.max_distance_miles != null) {
        const dKey = g.id;
        let dist = distanceCache.get(dKey);
        if (dist === undefined) {
          dist = this._calculateDistanceMiles(g, f.postal_code);
          distanceCache.set(dKey, dist);
        }
        if (dist == null || dist > f.max_distance_miles) return false;
      }
      return true;
    });

    if (sort_by === 'rating_high_to_low') {
      results = results.slice().sort((a, b) => b.average_rating - a.average_rating);
    } else if (sort_by === 'distance_low_to_high' && f && f.postal_code) {
      results = results.slice().sort((a, b) => {
        const da = this._calculateDistanceMiles(a, f.postal_code) || Infinity;
        const db = this._calculateDistanceMiles(b, f.postal_code) || Infinity;
        return da - db;
      });
    } else if (sort_by === 'name_a_to_z') {
      results = results.slice().sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }

    const total_count = results.length;
    const startIndex = (page - 1) * page_size;
    const pageItems = results.slice(startIndex, startIndex + page_size);

    const mapped = pageItems.map((g) => {
      let dist = null;
      if (f && f.postal_code) {
        const dKey = g.id;
        dist = distanceCache.has(dKey)
          ? distanceCache.get(dKey)
          : this._calculateDistanceMiles(g, f.postal_code);
      }
      return {
        group_id: g.id,
        name: g.name,
        description: g.description,
        focus_area: g.focus_area,
        focus_area_label: this._mapVolunteerFocusLabel(g.focus_area),
        average_rating: g.average_rating,
        total_reviews: g.total_reviews || 0,
        city: g.city || '',
        state_region: g.state_region || '',
        postal_code: g.postal_code || '',
        distance_miles: dist,
        distance_display: this._formatDistanceLabel(dist),
        is_active: g.is_active,
        group: g
      };
    });

    // Instrumentation for task completion tracking (task_7)
    try {
      if (filters && filters.postal_code && filters.max_distance_miles != null) {
        localStorage.setItem(
          'task7_groupSearchParams',
          JSON.stringify({
            "postal_code": filters.postal_code || null,
            "max_distance_miles": filters.max_distance_miles != null ? filters.max_distance_miles : null,
            "min_average_rating": filters.min_average_rating != null ? filters.min_average_rating : null,
            "focus_areas": Array.isArray(filters.focus_areas) ? filters.focus_areas : []
          })
        );
      }
    } catch (e) {
      console.error('Instrumentation error (task_7):', e);
    }

    return { results: mapped, total_count, page, page_size };
  }

  getVolunteerGroupDetails(groupId) {
    const groups = this._getFromStorage('volunteer_groups');
    const group = groups.find((g) => g.id === groupId) || null;
    const memberships = this._getFromStorage('group_memberships');

    if (!group) {
      return {
        group: null,
        display: {},
        user_membership: null
      };
    }

    const location_parts = [];
    if (group.city) location_parts.push(group.city);
    if (group.state_region) location_parts.push(group.state_region);
    if (group.country) location_parts.push(group.country);
    const location_display = location_parts.join(', ');

    const groupMemberships = memberships.filter((m) => m.group_id === group.id);
    let user_membership = null;
    if (groupMemberships.length) {
      user_membership = groupMemberships
        .slice()
        .sort((a, b) => new Date(b.join_date).getTime() - new Date(a.join_date).getTime())[0];
    }

    return {
      group,
      display: {
        focus_area_label: this._mapVolunteerFocusLabel(group.focus_area),
        rating_label: group.average_rating + ' / 5',
        location_display
      },
      user_membership
    };
  }

  joinVolunteerGroup(groupId) {
    const memberships = this._getFromStorage('group_memberships');
    const now = new Date().toISOString();
    const membership = {
      id: this._generateId('gmembership'),
      group_id: groupId,
      join_date: now,
      participation_frequency: 'monthly',
      status: 'active',
      preferences_notes: ''
    };
    memberships.push(membership);
    this._saveToStorage('group_memberships', memberships);
    return {
      success: true,
      membership,
      message: 'Joined volunteer group.'
    };
  }

  updateGroupMembershipPreferences(membershipId, participation_frequency, preferences_notes) {
    const memberships = this._getFromStorage('group_memberships');
    const idx = memberships.findIndex((m) => m.id === membershipId);
    if (idx === -1) {
      return { success: false, membership: null, message: 'Membership not found.' };
    }
    memberships[idx].participation_frequency = participation_frequency;
    if (preferences_notes !== undefined) {
      memberships[idx].preferences_notes = preferences_notes;
    }
    this._saveToStorage('group_memberships', memberships);
    return {
      success: true,
      membership: memberships[idx],
      message: 'Membership preferences updated.'
    };
  }

  getVolunteerMembershipsSummary() {
    const memberships = this._getFromStorage('group_memberships');
    const groups = this._getFromStorage('volunteer_groups');
    const mapped = memberships.map((m) => {
      const g = groups.find((gr) => gr.id === m.group_id) || null;
      return {
        membership_id: m.id,
        group_id: m.group_id,
        group_name: g ? g.name : '',
        focus_area_label: g ? this._mapVolunteerFocusLabel(g.focus_area) : '',
        participation_frequency: m.participation_frequency,
        status: m.status,
        group: g
      };
    });
    return { memberships: mapped };
  }

  // =====================
  // Lifestyle Quiz & Challenges
  // =====================

  getLifestyleQuizIntro() {
    const questions = this._getFromStorage('quiz_questions');
    const sectionsSet = new Set(questions.map((q) => q.section).filter(Boolean));
    const sections = Array.from(sectionsSet).map((section) => {
      let title = '';
      switch (section) {
        case 'home_energy':
          title = 'Home Energy';
          break;
        case 'transportation':
          title = 'Transportation';
          break;
        case 'waste':
          title = 'Waste';
          break;
        case 'food':
          title = 'Food';
          break;
        case 'water':
          title = 'Water';
          break;
        default:
          title = 'General';
      }
      return {
        section_key: section,
        title,
        description: '',
        estimated_time_minutes: 2
      };
    });
    return { sections };
  }

  startLifestyleQuiz() {
    const session = this._getOrCreateQuizSession();
    const questions = this._getFromStorage('quiz_questions');
    const options = this._getFromStorage('quiz_options');

    const qPayload = questions
      .slice()
      .sort((a, b) => (a.order_index || 0) - (b.order_index || 0))
      .map((q) => ({
        question_id: q.id,
        section: q.section,
        text: q.text,
        allow_multiple: q.allow_multiple,
        order_index: q.order_index,
        options: options
          .filter((op) => op.question_id === q.id)
          .sort((a, b) => (a.order_index || 0) - (b.order_index || 0))
          .map((op) => ({ option_id: op.id, text: op.text }))
      }));

    return { success: true, status: session.status, questions: qPayload };
  }

  submitLifestyleQuizAnswers(answers) {
    const sessions = this._getFromStorage('quiz_sessions');
    let session = sessions.find((s) => s.status === 'in_progress');
    if (!session) {
      session = this._getOrCreateQuizSession();
    }
    const options = this._getFromStorage('quiz_options');
    const questions = this._getFromStorage('quiz_questions');

    const sectionScores = {};

    for (const ans of answers || []) {
      const q = questions.find((qq) => qq.id === ans.question_id);
      if (!q) continue;
      const section = q.section;
      if (!sectionScores[section]) {
        sectionScores[section] = { score: 0, count: 0 };
      }
      for (const optId of ans.selected_option_ids || []) {
        const op = options.find((o) => o.id === optId);
        if (!op) continue;
        const s = typeof op.score === 'number' ? op.score : 0;
        sectionScores[section].score += s;
        sectionScores[section].count += 1;
      }
    }

    const impact_scores_by_section = Object.keys(sectionScores).map((section) => {
      const { score } = sectionScores[section];
      let interpretation = 'Moderate impact potential.';
      if (score <= 2) interpretation = 'High opportunity to improve.';
      else if (score >= 8) interpretation = 'Already doing quite well.';
      return { section, score, interpretation };
    });

    let results_summary_text = 'Lifestyle quiz completed.';
    if (impact_scores_by_section.length) {
      const totalScore = impact_scores_by_section.reduce((sum, s) => sum + s.score, 0);
      results_summary_text += ' Total score: ' + totalScore + '.';
    }

    const challenges = this._getFromStorage('challenges');
    const recommended_challenges = challenges
      .filter((c) => c.is_active)
      .map((c) => ({
        challenge_id: c.id,
        name: c.name,
        description: c.description,
        category: c.category,
        difficulty: c.difficulty,
        default_frequency: c.default_frequency,
        is_active: c.is_active
      }));

    // Update session to completed
    const now = new Date().toISOString();
    const idx = sessions.findIndex((s) => s.id === session.id);
    if (idx !== -1) {
      sessions[idx].status = 'completed';
      sessions[idx].completed_at = now;
      sessions[idx].results_summary = results_summary_text;
      this._saveToStorage('quiz_sessions', sessions);
    }

    return {
      success: true,
      results_summary_text,
      impact_scores_by_section,
      recommended_challenges
    };
  }

  getQuizRecommendedChallenges(filters) {
    const sessions = this._getFromStorage('quiz_sessions');
    const completedSessions = sessions.filter((s) => s.status === 'completed');
    if (!completedSessions.length) {
      return { recommended_challenges: [] };
    }
    const challenges = this._getFromStorage('challenges');
    const activated = this._getFromStorage('activated_challenges');
    const activeChallengeIds = new Set(
      activated.filter((ac) => ac.status === 'active').map((ac) => ac.challenge_id)
    );

    const f = filters || {};
    let rec = challenges.filter((c) => c.is_active);
    if (f.category) {
      rec = rec.filter((c) => c.category === f.category);
    }
    if (f.difficulty) {
      rec = rec.filter((c) => c.difficulty === f.difficulty);
    }

    const recommended_challenges = rec.map((c) => ({
      challenge_id: c.id,
      name: c.name,
      description: c.description,
      category: c.category,
      difficulty: c.difficulty,
      default_frequency: c.default_frequency,
      is_already_activated: activeChallengeIds.has(c.id)
    }));

    return { recommended_challenges };
  }

  activateChallengeFromQuiz(challengeId) {
    const challenges = this._getFromStorage('challenges');
    const challenge = challenges.find((c) => c.id === challengeId) || null;
    const activated = this._getFromStorage('activated_challenges');
    const existing = activated.find(
      (ac) => ac.challenge_id === challengeId && ac.status === 'active'
    );
    if (existing) {
      return {
        success: true,
        activated_challenge: existing,
        message: 'Challenge already activated.'
      };
    }
    const now = new Date().toISOString();
    const ac = {
      id: this._generateId('actchall'),
      challenge_id: challengeId,
      activated_at: now,
      frequency: challenge ? challenge.default_frequency : 'daily',
      status: 'active',
      source: 'quiz_recommendation'
    };
    activated.push(ac);
    this._saveToStorage('activated_challenges', activated);
    return {
      success: true,
      activated_challenge: ac,
      message: 'Challenge activated.'
    };
  }

  getMyChallengesOverview() {
    const activated = this._getFromStorage('activated_challenges');
    const challenges = this._getFromStorage('challenges');
    const activated_challenges = activated.map((ac) => {
      const ch = challenges.find((c) => c.id === ac.challenge_id) || null;
      return {
        activated_challenge_id: ac.id,
        frequency: ac.frequency,
        status: ac.status,
        source: ac.source,
        challenge: ch
          ? {
              id: ch.id,
              name: ch.name,
              description: ch.description,
              category: ch.category,
              difficulty: ch.difficulty,
              default_frequency: ch.default_frequency
            }
          : null
      };
    });
    return { activated_challenges };
  }

  setActivatedChallengeFrequency(activatedChallengeId, frequency) {
    const activated = this._getFromStorage('activated_challenges');
    const idx = activated.findIndex((ac) => ac.id === activatedChallengeId);
    if (idx === -1) {
      return { success: false, activated_challenge: null, message: 'Activated challenge not found.' };
    }
    activated[idx].frequency = frequency;
    this._saveToStorage('activated_challenges', activated);
    return {
      success: true,
      activated_challenge: activated[idx],
      message: 'Challenge frequency updated.'
    };
  }

  updateActivatedChallengeStatus(activatedChallengeId, status) {
    const activated = this._getFromStorage('activated_challenges');
    const idx = activated.findIndex((ac) => ac.id === activatedChallengeId);
    if (idx === -1) {
      return { success: false, activated_challenge: null, message: 'Activated challenge not found.' };
    }
    activated[idx].status = status;
    this._saveToStorage('activated_challenges', activated);
    return {
      success: true,
      activated_challenge: activated[idx],
      message: 'Challenge status updated.'
    };
  }

  // =====================
  // Dashboard Overview
  // =====================

  getDashboardOverview() {
    return this._buildDashboardSnapshot();
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
