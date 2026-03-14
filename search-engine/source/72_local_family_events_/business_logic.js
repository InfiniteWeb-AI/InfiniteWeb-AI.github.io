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

  // ---------------------- Storage helpers ----------------------

  _initStorage() {
    // Legacy/example keys from template (kept for compatibility, not used)
    if (!localStorage.getItem('users')) {
      localStorage.setItem('users', JSON.stringify([]));
    }
    if (!localStorage.getItem('products')) {
      localStorage.setItem('products', JSON.stringify([]));
    }
    if (!localStorage.getItem('carts')) {
      localStorage.setItem('carts', JSON.stringify([]));
    }
    if (!localStorage.getItem('cartItems')) {
      localStorage.setItem('cartItems', JSON.stringify([]));
    }

    // Core domain storage tables (arrays)
    const arrayKeys = [
      'activities',
      'activity_sessions',
      'locations',
      'memberships',
      'cart', // array of Cart entities (single-user but still stored as array)
      'cart_items',
      'registrations',
      'favorites_lists',
      'favorite_items',
      'day_plans',
      'day_plan_items',
      'watchlists',
      'watchlist_items'
    ];
    for (const key of arrayKeys) {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    }

    // Content/config objects
    if (!localStorage.getItem('about_content')) {
      localStorage.setItem('about_content', JSON.stringify({
        title: '',
        body_html: '',
        last_updated: null
      }));
    }
    if (!localStorage.getItem('contact_info')) {
      localStorage.setItem('contact_info', JSON.stringify({
        support_email: '',
        support_phone: '',
        address_lines: [],
        support_hours: ''
      }));
    }
    if (!localStorage.getItem('faq_content')) {
      localStorage.setItem('faq_content', JSON.stringify({ sections: [] }));
    }
    if (!localStorage.getItem('privacy_policy_content')) {
      localStorage.setItem('privacy_policy_content', JSON.stringify({
        body_html: '',
        last_updated: null
      }));
    }
    if (!localStorage.getItem('terms_content')) {
      localStorage.setItem('terms_content', JSON.stringify({
        body_html: '',
        last_updated: null
      }));
    }

    // User default location (optional) is not initialized here; if missing, distance filters will be ignored.

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key) {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }

  _getObjectFromStorage(key, defaultValue) {
    const raw = localStorage.getItem(key);
    if (!raw) return defaultValue;
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : defaultValue;
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

  // ---------------------- Generic helpers ----------------------

  _nowIso() {
    return new Date().toISOString();
  }

  _toDateOnlyString(date) {
    if (!date) return null;
    const d = date instanceof Date ? date : new Date(date);
    return d.toISOString().slice(0, 10);
  }

  _normalizeDateRange(date_start, date_end) {
    if (!date_start && !date_end) return { date_start: null, date_end: null };
    if (date_start && !date_end) return { date_start, date_end: date_start };
    if (!date_start && date_end) return { date_start: date_end, date_end };
    return { date_start, date_end };
  }

  _dateInRange(dateTimeIso, date_start, date_end) {
    if (!date_start && !date_end) return true;
    const dStr = String(dateTimeIso).slice(0, 10);
    const { date_start: ds, date_end: de } = this._normalizeDateRange(date_start, date_end);
    if (ds && dStr < ds) return false;
    if (de && dStr > de) return false;
    return true;
  }

  _calculateDistanceMiles(lat1, lon1, lat2, lon2) {
    if (
      lat1 == null || lon1 == null ||
      lat2 == null || lon2 == null ||
      isNaN(lat1) || isNaN(lon1) || isNaN(lat2) || isNaN(lon2)
    ) {
      return null;
    }
    const toRad = deg => (deg * Math.PI) / 180;
    const R = 3958.8; // Earth radius in miles
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  _getContentGroupLabel(content_group) {
    const map = {
      events: 'Events',
      classes_programs: 'Classes & Programs',
      workshops_camps: 'Workshops & Camps',
      seasonal_holiday: 'Seasonal & Holiday'
    };
    return map[content_group] || '';
  }

  _getActivityCategoryLabel(category) {
    const map = {
      indoor: 'Indoor',
      outdoor: 'Outdoor',
      parks_playgrounds: 'Parks & Playgrounds',
      playground: 'Playground',
      storytime: 'Storytime',
      shows_performances: 'Shows & Performances'
    };
    return map[category] || '';
  }

  _formatPriceSummary(activity) {
    if (!activity) return '';
    const type = activity.price_type;
    if (type === 'free') return 'Free';
    const currency = activity.price_currency || 'USD';
    const unitLabel = activity.price_unit === 'per_family'
      ? ' per family'
      : activity.price_unit === 'per_group'
        ? ' per group'
        : ' per ticket';
    const min = typeof activity.price_min === 'number' ? activity.price_min : null;
    const max = typeof activity.price_max === 'number' ? activity.price_max : null;
    const fmt = v => (currency === 'USD' ? '$' + v.toFixed(2).replace(/\.00$/, '') : v.toString());
    if (min != null && max != null && min !== max) {
      return fmt(min) + '–' + fmt(max) + unitLabel;
    }
    if (min != null) {
      return fmt(min) + unitLabel;
    }
    if (max != null) {
      return fmt(max) + unitLabel;
    }
    if (type === 'donation') return 'Donation suggested';
    return '';
  }

  _formatRatingSummary(activity) {
    if (!activity || typeof activity.rating !== 'number' || typeof activity.rating_count !== 'number') {
      return '';
    }
    return activity.rating.toFixed(1).replace(/\.0$/, '') + ' (' + activity.rating_count + ' reviews)';
  }

  _tagsToDisplay(tags) {
    if (!Array.isArray(tags)) return [];
    const map = {
      holiday: 'Holiday',
      free_parking: 'Free parking'
    };
    return tags.map(t => map[t] || t).filter(Boolean);
  }

  _accessibilityToDisplay(features) {
    if (!Array.isArray(features)) return [];
    const map = {
      sensory_friendly: 'Sensory-friendly',
      stroller_friendly: 'Stroller-friendly'
    };
    return features.map(f => map[f] || f).filter(Boolean);
  }

  // ---------------------- Required private helpers ----------------------

  _getOrCreateCart() {
    const carts = this._getFromStorage('cart');
    let cart = carts[0] || null;
    if (!cart) {
      cart = {
        id: this._generateId('cart'),
        items: [], // array of cart_item ids
        created_at: this._nowIso(),
        updated_at: this._nowIso()
      };
      carts.push(cart);
      this._saveToStorage('cart', carts);
    }
    return cart;
  }

  _getOrCreateFavoritesList() {
    const lists = this._getFromStorage('favorites_lists');
    let list = lists.find(l => l.name === 'Favorites') || lists[0] || null;
    if (!list) {
      list = {
        id: this._generateId('favorites'),
        name: 'Favorites',
        created_at: this._nowIso(),
        updated_at: this._nowIso()
      };
      lists.push(list);
      this._saveToStorage('favorites_lists', lists);
    }
    return list;
  }

  _getOrCreateWatchlist() {
    const lists = this._getFromStorage('watchlists');
    let list = lists.find(l => l.name === 'Classes Watchlist') || lists[0] || null;
    if (!list) {
      list = {
        id: this._generateId('watchlist'),
        name: 'Classes Watchlist',
        created_at: this._nowIso(),
        updated_at: this._nowIso()
      };
      lists.push(list);
      this._saveToStorage('watchlists', lists);
    }
    return list;
  }

  _getOrCreateDayPlan(dateStr) {
    const dayPlans = this._getFromStorage('day_plans');
    let plan = dayPlans.find(p => String(p.date).slice(0, 10) === dateStr) || null;
    if (!plan) {
      plan = {
        id: this._generateId('dayplan'),
        date: dateStr,
        title: '',
        notes: '',
        created_at: this._nowIso(),
        updated_at: this._nowIso()
      };
      dayPlans.push(plan);
      this._saveToStorage('day_plans', dayPlans);
    }
    return plan;
  }

  _getUserDefaultLocation() {
    const raw = localStorage.getItem('user_default_location');
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') return parsed;
    } catch (e) {}
    return null;
  }

  _inferTimeOfDayBucketFromSession(session) {
    if (!session || !session.start_datetime) return null;
    const d = new Date(session.start_datetime);
    const hour = d.getHours();
    if (hour >= 16) return 'after_4pm';
    if (hour < 12) return 'morning';
    if (hour < 17) return 'afternoon';
    return 'evening';
  }

  _calculateEstimatedCostForActivity(activity) {
    if (!activity || activity.price_type === 'free') return 0;
    if (typeof activity.price_min === 'number') {
      return activity.price_min;
    }
    if (typeof activity.price_max === 'number') {
      return activity.price_max;
    }
    return 0;
  }

  // ---------------------- Date & homepage interfaces ----------------------

  // getDateShortcuts()
  getDateShortcuts() {
    const today = new Date();
    const day = today.getDay(); // 0=Sun
    const daysUntilSaturday = (6 - day + 7) % 7 || 7; // upcoming Saturday (not today)
    const daysUntilSunday = (7 - day + 7) % 7 || 7; // upcoming Sunday

    const upcomingSaturday = new Date(today);
    upcomingSaturday.setDate(today.getDate() + daysUntilSaturday);
    const upcomingSunday = new Date(today);
    upcomingSunday.setDate(today.getDate() + daysUntilSunday);

    const thisWeekendStart = new Date(today);
    const offsetToSat = (6 - day + 7) % 7; // include today if Saturday
    thisWeekendStart.setDate(today.getDate() + offsetToSat);
    const thisWeekendEnd = new Date(thisWeekendStart);
    thisWeekendEnd.setDate(thisWeekendStart.getDate() + 1);

    const year = today.getFullYear();
    const month = today.getMonth();
    const nextMonthFirst = new Date(year, month + 1, 1);
    const nextMonthLast = new Date(year, month + 2, 0);

    return {
      upcoming_saturday: this._toDateOnlyString(upcomingSaturday),
      upcoming_sunday: this._toDateOnlyString(upcomingSunday),
      this_weekend_start_date: this._toDateOnlyString(thisWeekendStart),
      this_weekend_end_date: this._toDateOnlyString(thisWeekendEnd),
      next_month_start_date: this._toDateOnlyString(nextMonthFirst),
      next_month_end_date: this._toDateOnlyString(nextMonthLast)
    };
  }

  // getHomeSections()
  getHomeSections() {
    return {
      sections: [
        {
          id: 'events',
          label: 'Events',
          content_group: 'events',
          description: 'Find local family-friendly events.'
        },
        {
          id: 'classes_programs',
          label: 'Classes & Programs',
          content_group: 'classes_programs',
          description: 'Ongoing classes, lessons, and programs.'
        },
        {
          id: 'workshops_camps',
          label: 'Workshops & Camps',
          content_group: 'workshops_camps',
          description: 'One-time and multi-day workshops and camps.'
        },
        {
          id: 'seasonal_holiday',
          label: 'Seasonal & Holiday',
          content_group: 'seasonal_holiday',
          description: 'Holiday lights, parades, and seasonal fun.'
        },
        {
          id: 'memberships_passes',
          label: 'Memberships & Passes',
          content_group: null,
          description: 'Save with family memberships and passes.'
        },
        {
          id: 'map_view',
          label: 'Map View',
          content_group: null,
          description: 'Explore what’s nearby on the map.'
        }
      ]
    };
  }

  // getHomepageActivityHighlights(variant, content_groups, limit)
  getHomepageActivityHighlights(variant, content_groups, limit = 8) {
    const activities = this._getFromStorage('activities');
    const sessions = this._getFromStorage('activity_sessions');
    const locations = this._getFromStorage('locations');
    const locationsById = {};
    for (const loc of locations) locationsById[loc.id] = loc;

    let filtered = activities.slice();
    if (Array.isArray(content_groups) && content_groups.length) {
      filtered = filtered.filter(a => content_groups.includes(a.content_group));
    }

    if (variant === 'featured') {
      filtered = filtered.filter(a => a.is_featured === true);
    } else if (variant === 'popular') {
      filtered = filtered.filter(a => typeof a.rating === 'number');
      filtered.sort((a, b) => {
        const rcA = a.rating_count || 0;
        const rcB = b.rating_count || 0;
        if (rcB !== rcA) return rcB - rcA;
        const rA = a.rating || 0;
        const rB = b.rating || 0;
        return rB - rA;
      });
    }

    const sessionsByActivity = {};
    for (const s of sessions) {
      if (!sessionsByActivity[s.activity_id]) sessionsByActivity[s.activity_id] = [];
      sessionsByActivity[s.activity_id].push(s);
    }

    const defaultLoc = this._getUserDefaultLocation();
    const defaultLat = defaultLoc ? defaultLoc.latitude : null;
    const defaultLon = defaultLoc ? defaultLoc.longitude : null;

    const items = [];
    for (const activity of filtered) {
      const actSessions = sessionsByActivity[activity.id] || [];
      let nextSession = null;
      const now = new Date();
      for (const s of actSessions) {
        const sd = new Date(s.start_datetime);
        if (!nextSession || sd < new Date(nextSession.start_datetime)) {
          if (sd >= now) {
            nextSession = s;
          }
        }
      }
      const loc = locationsById[activity.location_id] || null;
      const distance = loc && defaultLat != null && defaultLon != null
        ? this._calculateDistanceMiles(defaultLat, defaultLon, loc.latitude, loc.longitude)
        : null;
      items.push({
        activity_id: activity.id,
        title: activity.title,
        subtitle: activity.subtitle || '',
        short_description: activity.short_description || '',
        image_url: activity.image_url || '',
        content_group: activity.content_group,
        content_group_label: this._getContentGroupLabel(activity.content_group),
        primary_category: activity.activity_category,
        primary_category_label: this._getActivityCategoryLabel(activity.activity_category),
        next_start_datetime: nextSession ? nextSession.start_datetime : null,
        min_age: activity.min_age,
        max_age: activity.max_age,
        price_summary: this._formatPriceSummary(activity),
        rating: activity.rating,
        rating_count: activity.rating_count,
        location_name: loc ? loc.name : null,
        neighborhood: loc ? loc.neighborhood : null,
        distance_miles: distance
      });
      if (items.length >= limit) break;
    }

    return { items };
  }

  // getUserToolSummaries()
  getUserToolSummaries() {
    const favorites = this._getFromStorage('favorite_items');
    const watchlistItems = this._getFromStorage('watchlist_items');
    const cartItems = this._getFromStorage('cart_items');
    const dayPlans = this._getFromStorage('day_plans');
    const dayPlanItems = this._getFromStorage('day_plan_items');

    const todayStr = this._toDateOnlyString(new Date());
    const todayPlans = dayPlans.filter(p => String(p.date).slice(0, 10) === todayStr);
    const todayPlanIds = new Set(todayPlans.map(p => p.id));
    const day_plan_today_items_count = dayPlanItems.filter(i => todayPlanIds.has(i.day_plan_id)).length;

    const cart_items_count = cartItems.reduce((sum, item) => sum + (item.quantity || 0), 0);

    return {
      favorites_count: favorites.length,
      day_plan_today_items_count,
      watchlist_count: watchlistItems.length,
      cart_items_count
    };
  }

  // getActivityFilterOptions(context, content_group)
  getActivityFilterOptions(context, content_group) {
    // Static configuration based on enums
    const age_ranges = [
      { id: 'age_3_4', label: 'Ages 3–4', min_age: 3, max_age: 4 },
      { id: 'age_5_8', label: 'Ages 5–8', min_age: 5, max_age: 8 },
      { id: 'age_10_12', label: 'Ages 10–12', min_age: 10, max_age: 12 }
    ];

    const price_ranges = [
      { id: 'free_only', label: 'Free only', min_price: 0, max_price: 0 },
      { id: 'under_20', label: 'Under $20', min_price: 0, max_price: 20 },
      { id: 'under_50', label: 'Under $50', min_price: 0, max_price: 50 }
    ];

    const time_of_day_options = [
      { value: 'morning', label: 'Morning (before 12 PM)' },
      { value: 'afternoon', label: 'Afternoon (12–5 PM)' },
      { value: 'evening', label: 'Evening (after 5 PM)' },
      { value: 'daytime', label: 'Daytime (before 5 PM)' },
      { value: 'after_4pm', label: 'After 4 PM' }
    ];

    const day_of_week_options = [
      { value: 'monday', label: 'Monday', is_weekday: true, is_weekend: false },
      { value: 'tuesday', label: 'Tuesday', is_weekday: true, is_weekend: false },
      { value: 'wednesday', label: 'Wednesday', is_weekday: true, is_weekend: false },
      { value: 'thursday', label: 'Thursday', is_weekday: true, is_weekend: false },
      { value: 'friday', label: 'Friday', is_weekday: true, is_weekend: false },
      { value: 'saturday', label: 'Saturday', is_weekday: false, is_weekend: true },
      { value: 'sunday', label: 'Sunday', is_weekday: false, is_weekend: true }
    ];

    const distance_options_miles = [
      { value: 2, label: 'Within 2 miles' },
      { value: 5, label: 'Within 5 miles' },
      { value: 10, label: 'Within 10 miles' },
      { value: 25, label: 'Within 25 miles' }
    ];

    const category_options = [
      { value: 'indoor', label: 'Indoor' },
      { value: 'outdoor', label: 'Outdoor' },
      { value: 'parks_playgrounds', label: 'Parks & Playgrounds' },
      { value: 'playground', label: 'Playground' },
      { value: 'storytime', label: 'Storytime' },
      { value: 'shows_performances', label: 'Shows & Performances' }
    ];

    const schedule_recurrence_options = [
      { value: 'one_time', label: 'One-time' },
      { value: 'weekly', label: 'Weekly' },
      { value: 'multi_day', label: 'Multi-day' },
      { value: 'seasonal', label: 'Seasonal' }
    ];

    const rating_options = [
      { min_rating: 4.0, label: '4.0+' },
      { min_rating: 4.5, label: '4.5+' }
    ];

    const tag_options = [
      { value: 'holiday', label: 'Holiday' },
      { value: 'free_parking', label: 'Free parking' }
    ];

    const accessibility_options = [
      { value: 'sensory_friendly', label: 'Sensory-friendly' },
      { value: 'stroller_friendly', label: 'Stroller-friendly' }
    ];

    const sort_options = [
      { value: 'relevance', label: 'Relevance' },
      { value: 'start_time_earliest', label: 'Start time – Earliest first' },
      { value: 'price_low_to_high', label: 'Price – Low to High' },
      { value: 'rating_high_to_low', label: 'Rating – High to Low' },
      { value: 'distance_nearest_first', label: 'Distance – Nearest first' }
    ];

    return {
      age_ranges,
      price_ranges,
      time_of_day_options,
      day_of_week_options,
      distance_options_miles,
      category_options,
      schedule_recurrence_options,
      rating_options,
      tag_options,
      accessibility_options,
      sort_options
    };
  }

  // ---------------------- Activity search & details ----------------------

  // searchActivities(...)
  searchActivities(
    keyword,
    date_start,
    date_end,
    content_groups,
    activity_categories,
    min_age,
    max_age,
    price_type = 'any',
    price_max,
    time_of_day_buckets,
    days_of_week,
    schedule_recurrence = 'any',
    distance_max_miles,
    tags,
    accessibility_features,
    rating_min,
    sort_by = 'relevance',
    page = 1,
    page_size = 20
  ) {
    const activities = this._getFromStorage('activities');
    const sessions = this._getFromStorage('activity_sessions');
    const locations = this._getFromStorage('locations');

    // Build a combined session list that includes synthetic sessions for
    // activities which have date info but no explicit sessions in storage.
    const activityHasSession = {};
    for (const s of sessions) {
      activityHasSession[s.activity_id] = true;
    }
    const sessionsToSearch = sessions.slice();
    for (const activity of activities) {
      if (!activityHasSession[activity.id] && activity.first_start_datetime) {
        const start = activity.first_start_datetime;
        const end = activity.last_end_datetime || null;
        const d = new Date(start);
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const day_of_week = dayNames[d.getUTCDay()].toLowerCase();
        const syntheticSession = {
          id: 'synthetic_' + activity.id,
          activity_id: activity.id,
          start_datetime: start,
          end_datetime: end,
          day_of_week,
          time_of_day_bucket: this._inferTimeOfDayBucketFromSession({ start_datetime: start })
        };
        sessionsToSearch.push(syntheticSession);
      }
    }

    const activitiesById = {};
    for (const a of activities) activitiesById[a.id] = a;

    const locationsById = {};
    for (const l of locations) locationsById[l.id] = l;

    const defaultLoc = this._getUserDefaultLocation();
    const defaultLat = defaultLoc ? defaultLoc.latitude : null;
    const defaultLon = defaultLoc ? defaultLoc.longitude : null;

    const keywordLower = keyword ? String(keyword).toLowerCase() : null;
    const dateRange = this._normalizeDateRange(date_start, date_end);

    const resultsByActivity = {};

    for (const session of sessionsToSearch) {
      const activity = activitiesById[session.activity_id];
      if (!activity) continue;

      // Filter by Activity fields
      if (Array.isArray(content_groups) && content_groups.length && !content_groups.includes(activity.content_group)) {
        continue;
      }

      if (Array.isArray(activity_categories) && activity_categories.length && !activity_categories.includes(activity.activity_category)) {
        continue;
      }

      if (typeof min_age === 'number') {
        const actMax = typeof activity.max_age === 'number' ? activity.max_age : Infinity;
        if (actMax < min_age) continue;
      }
      if (typeof max_age === 'number') {
        const actMin = typeof activity.min_age === 'number' ? activity.min_age : 0;
        if (actMin > max_age) continue;
      }

      if (price_type && price_type !== 'any') {
        if (activity.price_type !== price_type) continue;
      }
      if (typeof price_max === 'number') {
        const actMinPrice = typeof activity.price_min === 'number' ? activity.price_min : 0;
        const actMaxPrice = typeof activity.price_max === 'number' ? activity.price_max : actMinPrice;
        if (actMinPrice > price_max && actMaxPrice > price_max) continue;
      }

      if (schedule_recurrence && schedule_recurrence !== 'any') {
        if (activity.schedule_recurrence !== schedule_recurrence) continue;
      }

      if (Array.isArray(tags) && tags.length) {
        const actTags = Array.isArray(activity.tags) ? activity.tags : [];
        const hasAllTags = tags.every(t => actTags.includes(t));
        if (!hasAllTags) continue;
      }

      if (Array.isArray(accessibility_features) && accessibility_features.length) {
        const actAcc = Array.isArray(activity.accessibility_features) ? activity.accessibility_features : [];
        const hasAll = accessibility_features.every(f => actAcc.includes(f));
        if (!hasAll) continue;
      }

      if (typeof rating_min === 'number') {
        const r = typeof activity.rating === 'number' ? activity.rating : 0;
        if (r < rating_min) continue;
      }

      // Keyword search
      if (keywordLower) {
        const haystack = [
          activity.title,
          activity.subtitle,
          activity.short_description,
          activity.description
        ]
          .filter(Boolean)
          .join(' ') + ' ' + (locationsById[activity.location_id] ? locationsById[activity.location_id].name || '' : '');
        if (!haystack.toLowerCase().includes(keywordLower)) {
          continue;
        }
      }

      // Session-based filters
      if (Array.isArray(time_of_day_buckets) && time_of_day_buckets.length && !time_of_day_buckets.includes(session.time_of_day_bucket)) {
        continue;
      }

      if (Array.isArray(days_of_week) && days_of_week.length && !days_of_week.includes(session.day_of_week)) {
        continue;
      }

      if (!this._dateInRange(session.start_datetime, dateRange.date_start, dateRange.date_end)) {
        continue;
      }

      const loc = locationsById[activity.location_id] || null;
      let distance = null;
      if (loc && defaultLat != null && defaultLon != null) {
        distance = this._calculateDistanceMiles(defaultLat, defaultLon, loc.latitude, loc.longitude);
        if (typeof distance_max_miles === 'number' && distance != null && distance > distance_max_miles) {
          continue;
        }
      }
      // If we do not have a default location, distance-based filters are ignored.

      // Passed all filters for this session
      let existing = resultsByActivity[activity.id];
      if (!existing) {
        existing = {
          activity,
          bestSession: session,
          distance_miles: distance,
          location: loc
        };
        resultsByActivity[activity.id] = existing;
      } else {
        const currBestDate = new Date(existing.bestSession.start_datetime);
        const newDate = new Date(session.start_datetime);
        if (newDate < currBestDate) {
          existing.bestSession = session;
        }
        if (existing.distance_miles == null && distance != null) {
          existing.distance_miles = distance;
        }
      }
    }

    // Build result items
    const entries = Object.values(resultsByActivity);

    // Sorting
    const sortKey = sort_by || 'relevance';
    entries.sort((a, b) => {
      const actA = a.activity;
      const actB = b.activity;
      if (sortKey === 'start_time_earliest') {
        const dA = a.bestSession ? new Date(a.bestSession.start_datetime) : new Date(8640000000000000);
        const dB = b.bestSession ? new Date(b.bestSession.start_datetime) : new Date(8640000000000000);
        return dA - dB;
      } else if (sortKey === 'price_low_to_high') {
        const pA = typeof actA.price_min === 'number' ? actA.price_min : (typeof actA.price_max === 'number' ? actA.price_max : Number.POSITIVE_INFINITY);
        const pB = typeof actB.price_min === 'number' ? actB.price_min : (typeof actB.price_max === 'number' ? actB.price_max : Number.POSITIVE_INFINITY);
        return pA - pB;
      } else if (sortKey === 'rating_high_to_low') {
        const rA = typeof actA.rating === 'number' ? actA.rating : 0;
        const rB = typeof actB.rating === 'number' ? actB.rating : 0;
        if (rB !== rA) return rB - rA;
        const rcA = actA.rating_count || 0;
        const rcB = actB.rating_count || 0;
        return rcB - rcA;
      } else if (sortKey === 'distance_nearest_first') {
        const dA = a.distance_miles != null ? a.distance_miles : Number.POSITIVE_INFINITY;
        const dB = b.distance_miles != null ? b.distance_miles : Number.POSITIVE_INFINITY;
        return dA - dB;
      } else {
        // relevance: sort by rating desc then earliest start
        const rA = typeof actA.rating === 'number' ? actA.rating : 0;
        const rB = typeof actB.rating === 'number' ? actB.rating : 0;
        if (rB !== rA) return rB - rA;
        const dA = a.bestSession ? new Date(a.bestSession.start_datetime) : new Date(8640000000000000);
        const dB = b.bestSession ? new Date(b.bestSession.start_datetime) : new Date(8640000000000000);
        return dA - dB;
      }
    });

    const total_count = entries.length;
    const startIdx = (page - 1) * page_size;
    const endIdx = startIdx + page_size;
    const pageEntries = entries.slice(startIdx, endIdx);

    const items = pageEntries.map(entry => {
      const activity = entry.activity;
      const session = entry.bestSession || null;
      const loc = entry.location || (locationsById[activity.location_id] || null);
      return {
        activity_id: activity.id,
        title: activity.title,
        subtitle: activity.subtitle || '',
        short_description: activity.short_description || '',
        image_url: activity.image_url || '',
        content_group: activity.content_group,
        content_group_label: this._getContentGroupLabel(activity.content_group),
        primary_category: activity.activity_category,
        primary_category_label: this._getActivityCategoryLabel(activity.activity_category),
        min_age: activity.min_age,
        max_age: activity.max_age,
        price_type: activity.price_type,
        price_min: activity.price_min,
        price_max: activity.price_max,
        price_currency: activity.price_currency,
        price_unit: activity.price_unit,
        price_summary: this._formatPriceSummary(activity),
        next_start_datetime: session ? session.start_datetime : null,
        next_end_datetime: session ? session.end_datetime || null : null,
        next_session_time_of_day_bucket: session ? session.time_of_day_bucket : null,
        location_name: loc ? loc.name : null,
        neighborhood: loc ? loc.neighborhood : null,
        distance_miles: entry.distance_miles,
        tags: Array.isArray(activity.tags) ? activity.tags : [],
        accessibility_features: Array.isArray(activity.accessibility_features) ? activity.accessibility_features : [],
        rating: activity.rating,
        rating_count: activity.rating_count,
        booking_required: activity.booking_required,
        registration_available: activity.registration_available
      };
    });

    return {
      items,
      total_count,
      page,
      page_size
    };
  }

  // getActivityDetails(activityId)
  getActivityDetails(activityId) {
    const activities = this._getFromStorage('activities');
    const sessions = this._getFromStorage('activity_sessions');
    const locations = this._getFromStorage('locations');

    const activity = activities.find(a => a.id === activityId) || null;
    if (!activity) {
      return {
        activity: null,
        location: null,
        sessions: [],
        content_group_label: '',
        category_label: '',
        price_summary: '',
        rating_summary: '',
        distance_miles: null,
        tags_display: [],
        accessibility_display: []
      };
    }

    const location = locations.find(l => l.id === activity.location_id) || null;
    const activitySessions = sessions.filter(s => s.activity_id === activity.id);

    const defaultLoc = this._getUserDefaultLocation();
    let distance_miles = null;
    if (defaultLoc && location) {
      distance_miles = this._calculateDistanceMiles(
        defaultLoc.latitude,
        defaultLoc.longitude,
        location.latitude,
        location.longitude
      );
    }

    return {
      activity,
      location,
      sessions: activitySessions,
      content_group_label: this._getContentGroupLabel(activity.content_group),
      category_label: this._getActivityCategoryLabel(activity.activity_category),
      price_summary: this._formatPriceSummary(activity),
      rating_summary: this._formatRatingSummary(activity),
      distance_miles,
      tags_display: this._tagsToDisplay(activity.tags || []),
      accessibility_display: this._accessibilityToDisplay(activity.accessibility_features || [])
    };
  }

  // getUserDefaultLocation()
  getUserDefaultLocation() {
    const stored = this._getUserDefaultLocation();
    if (!stored) {
      return {
        location_id: null,
        label: null,
        city: null,
        state: null,
        latitude: null,
        longitude: null
      };
    }
    return stored;
  }

  // searchLocations(query, limit)
  searchLocations(query, limit = 10) {
    const locations = this._getFromStorage('locations');
    const q = (query || '').toLowerCase();
    if (!q) return locations.slice(0, limit);
    const matches = locations.filter(loc => {
      const haystack = [loc.name, loc.neighborhood, loc.city, loc.state]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
    return matches.slice(0, limit);
  }

  // getMapActivities(center_latitude, center_longitude, radius_miles, ...)
  getMapActivities(
    center_latitude,
    center_longitude,
    radius_miles,
    date_start,
    date_end,
    activity_categories,
    content_groups,
    time_of_day_buckets,
    days_of_week,
    tags,
    accessibility_features,
    price_type = 'any',
    price_max
  ) {
    const activities = this._getFromStorage('activities');
    const sessions = this._getFromStorage('activity_sessions');
    const locations = this._getFromStorage('locations');

    const activitiesById = {};
    for (const a of activities) activitiesById[a.id] = a;
    const locationsById = {};
    for (const l of locations) locationsById[l.id] = l;

    const dateRange = this._normalizeDateRange(date_start, date_end);

    const sessionsByActivity = {};
    for (const s of sessions) {
      if (!sessionsByActivity[s.activity_id]) sessionsByActivity[s.activity_id] = [];
      sessionsByActivity[s.activity_id].push(s);
    }

    const markers = [];

    for (const activity of activities) {
      if (Array.isArray(content_groups) && content_groups.length && !content_groups.includes(activity.content_group)) {
        continue;
      }
      if (Array.isArray(activity_categories) && activity_categories.length && !activity_categories.includes(activity.activity_category)) {
        continue;
      }
      if (price_type && price_type !== 'any') {
        if (activity.price_type !== price_type) continue;
      }
      if (typeof price_max === 'number') {
        const pMin = typeof activity.price_min === 'number' ? activity.price_min : 0;
        const pMax = typeof activity.price_max === 'number' ? activity.price_max : pMin;
        if (pMin > price_max && pMax > price_max) continue;
      }
      if (Array.isArray(tags) && tags.length) {
        const actTags = Array.isArray(activity.tags) ? activity.tags : [];
        const hasAll = tags.every(t => actTags.includes(t));
        if (!hasAll) continue;
      }
      if (Array.isArray(accessibility_features) && accessibility_features.length) {
        const actAcc = Array.isArray(activity.accessibility_features) ? activity.accessibility_features : [];
        const hasAll = accessibility_features.every(f => actAcc.includes(f));
        if (!hasAll) continue;
      }

      const loc = locationsById[activity.location_id];
      if (!loc) continue;

      const distanceFromCenter = this._calculateDistanceMiles(
        center_latitude,
        center_longitude,
        loc.latitude,
        loc.longitude
      );
      if (typeof radius_miles === 'number' && distanceFromCenter != null && distanceFromCenter > radius_miles) {
        continue;
      }

      const actSessions = sessionsByActivity[activity.id] || [];
      let bestSession = null;
      for (const s of actSessions) {
        if (!this._dateInRange(s.start_datetime, dateRange.date_start, dateRange.date_end)) continue;
        if (Array.isArray(time_of_day_buckets) && time_of_day_buckets.length && !time_of_day_buckets.includes(s.time_of_day_bucket)) {
          continue;
        }
        if (Array.isArray(days_of_week) && days_of_week.length && !days_of_week.includes(s.day_of_week)) {
          continue;
        }
        if (!bestSession || new Date(s.start_datetime) < new Date(bestSession.start_datetime)) {
          bestSession = s;
        }
      }
      if (!bestSession) continue;

      markers.push({
        activity_id: activity.id,
        location_id: loc.id,
        title: activity.title,
        primary_category_label: this._getActivityCategoryLabel(activity.activity_category),
        latitude: loc.latitude,
        longitude: loc.longitude,
        start_datetime: bestSession.start_datetime,
        time_of_day_bucket: bestSession.time_of_day_bucket,
        price_summary: this._formatPriceSummary(activity),
        min_age: activity.min_age,
        max_age: activity.max_age,
        rating: activity.rating,
        has_free_parking: !!loc.has_free_parking,
        distance_from_center_miles: distanceFromCenter
      });
    }

    return {
      markers,
      total_count: markers.length
    };
  }

  // ---------------------- Memberships & cart ----------------------

  // getMembershipFilterOptions()
  getMembershipFilterOptions() {
    const membership_type_options = [
      { value: 'family', label: 'Family' },
      { value: 'individual', label: 'Individual' }
    ];

    const price_ranges = [
      { id: 'under_150', label: 'Under $150', min_price: 0, max_price: 150 },
      { id: 'under_300', label: 'Under $300', min_price: 0, max_price: 300 }
    ];

    const billing_period_options = [
      { value: 'annual', label: 'Annual' },
      { value: 'monthly', label: 'Monthly' }
    ];

    const benefit_tags = [];

    const sort_options = [
      { value: 'price_low_to_high', label: 'Price – Low to High' },
      { value: 'price_high_to_low', label: 'Price – High to Low' },
      { value: 'included_free_events_desc', label: 'Included free events – Most first' },
      { value: 'included_free_events_asc', label: 'Included free events – Fewest first' }
    ];

    return {
      membership_type_options,
      price_ranges,
      billing_period_options,
      benefit_tags,
      sort_options
    };
  }

  // getMemberships(membership_type, price_max, is_active_only, sort_by, page, page_size)
  getMemberships(
    membership_type = 'any',
    price_max,
    is_active_only = true,
    sort_by = 'price_low_to_high',
    page = 1,
    page_size = 20
  ) {
    let memberships = this._getFromStorage('memberships');

    if (membership_type && membership_type !== 'any') {
      memberships = memberships.filter(m => m.membership_type === membership_type);
    }
    if (typeof price_max === 'number') {
      memberships = memberships.filter(m => typeof m.price === 'number' && m.price <= price_max);
    }
    if (is_active_only) {
      memberships = memberships.filter(m => m.is_active !== false);
    }

    const sortKey = sort_by || 'price_low_to_high';
    memberships.sort((a, b) => {
      if (sortKey === 'price_low_to_high') {
        return (a.price || 0) - (b.price || 0);
      } else if (sortKey === 'price_high_to_low') {
        return (b.price || 0) - (a.price || 0);
      } else if (sortKey === 'included_free_events_desc') {
        return (b.included_free_events_per_year || 0) - (a.included_free_events_per_year || 0);
      } else if (sortKey === 'included_free_events_asc') {
        return (a.included_free_events_per_year || 0) - (b.included_free_events_per_year || 0);
      }
      return 0;
    });

    const total_count = memberships.length;
    const startIdx = (page - 1) * page_size;
    const endIdx = startIdx + page_size;
    const pageItems = memberships.slice(startIdx, endIdx).map(m => ({
      membership_id: m.id,
      name: m.name,
      description: m.description || '',
      membership_type: m.membership_type,
      price: m.price,
      currency: m.currency || 'USD',
      billing_period_default: m.billing_period_default || null,
      billing_period_options: Array.isArray(m.billing_period_options) ? m.billing_period_options : [],
      included_free_events_per_year: m.included_free_events_per_year,
      benefits: Array.isArray(m.benefits) ? m.benefits : [],
      image_url: m.image_url || '',
      is_active: m.is_active
    }));

    return {
      items: pageItems,
      total_count,
      page,
      page_size
    };
  }

  // getMembershipDetails(membershipId)
  getMembershipDetails(membershipId) {
    const memberships = this._getFromStorage('memberships');
    const membership = memberships.find(m => m.id === membershipId) || null;
    if (!membership) {
      return {
        membership: null,
        benefit_list: [],
        billing_period_options: [],
        included_free_events_per_year_label: 'Included free events per year'
      };
    }
    return {
      membership,
      benefit_list: Array.isArray(membership.benefits) ? membership.benefits : [],
      billing_period_options: Array.isArray(membership.billing_period_options)
        ? membership.billing_period_options
        : (membership.billing_period_default ? [membership.billing_period_default] : []),
      included_free_events_per_year_label: 'Included free events per year'
    };
  }

  // getMembershipComparison(membership_ids)
  getMembershipComparison(membership_ids) {
    const membershipsAll = this._getFromStorage('memberships');
    const ids = Array.isArray(membership_ids) ? membership_ids : [];
    const memberships = membershipsAll.filter(m => ids.includes(m.id));
    return {
      memberships,
      field_labels: {
        price: 'Price',
        membership_type: 'Membership type',
        included_free_events_per_year: 'Included free events per year'
      }
    };
  }

  // addMembershipToCart(membershipId, billing_period, quantity)
  addMembershipToCart(membershipId, billing_period, quantity = 1) {
    const memberships = this._getFromStorage('memberships');
    const membership = memberships.find(m => m.id === membershipId) || null;
    if (!membership) {
      return { success: false, message: 'Membership not found', cart: null };
    }

    const cart = this._getOrCreateCart();
    const carts = this._getFromStorage('cart');
    const cartItems = this._getFromStorage('cart_items');

    const chosenPeriod = billing_period || membership.billing_period_default || null;

    let cartItem = cartItems.find(
      ci => ci.cart_id === cart.id && ci.membership_id === membershipId && ci.billing_period === chosenPeriod
    );

    if (cartItem) {
      cartItem.quantity = (cartItem.quantity || 0) + (quantity || 1);
      cartItem.added_at = this._nowIso();
      // update price for new quantity
      cartItem.price = (membership.price || 0) * cartItem.quantity;
    } else {
      cartItem = {
        id: this._generateId('cartitem'),
        cart_id: cart.id,
        membership_id: membershipId,
        quantity: quantity || 1,
        billing_period: chosenPeriod,
        price: (membership.price || 0) * (quantity || 1),
        added_at: this._nowIso()
      };
      cartItems.push(cartItem);
      cart.items.push(cartItem.id);
    }

    cart.updated_at = this._nowIso();

    // Persist
    const updatedCarts = carts.map(c => (c.id === cart.id ? cart : c));
    this._saveToStorage('cart', updatedCarts);
    this._saveToStorage('cart_items', cartItems);

    return {
      success: true,
      message: 'Added to cart',
      cart: this._buildCartResponse(cart, cartItems, memberships)
    };
  }

  _buildCartResponse(cart, cartItems, memberships) {
    const membershipById = {};
    for (const m of memberships) membershipById[m.id] = m;

    const items = [];
    let total_price = 0;
    let currency = 'USD';

    for (const ci of cartItems.filter(ci => ci.cart_id === cart.id)) {
      const membership = membershipById[ci.membership_id] || null;
      const price_per_unit = membership ? (membership.price || 0) : 0;
      const line_total = price_per_unit * (ci.quantity || 0);
      total_price += line_total;
      if (membership && membership.currency) {
        currency = membership.currency;
      }
      items.push({
        cart_item_id: ci.id,
        membership_id: ci.membership_id,
        membership_name: membership ? membership.name : '',
        billing_period: ci.billing_period || null,
        quantity: ci.quantity || 0,
        price_per_unit,
        currency,
        line_total
      });
    }

    return {
      cart_id: cart.id,
      items,
      total_price,
      currency
    };
  }

  // getCart()
  getCart() {
    const carts = this._getFromStorage('cart');
    const cartItems = this._getFromStorage('cart_items');
    const memberships = this._getFromStorage('memberships');
    const cart = carts[0] || null;
    if (!cart) {
      return {
        cart_id: null,
        items: [],
        total_price: 0,
        currency: 'USD'
      };
    }
    return this._buildCartResponse(cart, cartItems, memberships);
  }

  // updateCartItemBillingPeriod(cartItemId, billing_period)
  updateCartItemBillingPeriod(cartItemId, billing_period) {
    const carts = this._getFromStorage('cart');
    const cartItems = this._getFromStorage('cart_items');
    const memberships = this._getFromStorage('memberships');
    const cart = carts[0] || null;
    if (!cart) {
      return { success: false, message: 'Cart not found', cart: null };
    }

    const cartItem = cartItems.find(ci => ci.id === cartItemId && ci.cart_id === cart.id);
    if (!cartItem) {
      return { success: false, message: 'Cart item not found', cart: null };
    }

    const membership = memberships.find(m => m.id === cartItem.membership_id) || null;
    cartItem.billing_period = billing_period;
    if (membership) {
      cartItem.price = (membership.price || 0) * (cartItem.quantity || 0);
    }

    cart.updated_at = this._nowIso();

    this._saveToStorage('cart', carts.map(c => (c.id === cart.id ? cart : c)));
    this._saveToStorage('cart_items', cartItems);

    return {
      success: true,
      message: 'Billing period updated',
      cart: this._buildCartResponse(cart, cartItems, memberships)
    };
  }

  // removeCartItem(cartItemId)
  removeCartItem(cartItemId) {
    const carts = this._getFromStorage('cart');
    const cartItems = this._getFromStorage('cart_items');
    const memberships = this._getFromStorage('memberships');
    const cart = carts[0] || null;
    if (!cart) {
      return { success: false, message: 'Cart not found', cart: null };
    }

    const newCartItems = cartItems.filter(ci => !(ci.id === cartItemId && ci.cart_id === cart.id));
    cart.items = cart.items.filter(id => id !== cartItemId);
    cart.updated_at = this._nowIso();

    this._saveToStorage('cart', carts.map(c => (c.id === cart.id ? cart : c)));
    this._saveToStorage('cart_items', newCartItems);

    return {
      success: true,
      message: 'Cart item removed',
      cart: this._buildCartResponse(cart, newCartItems, memberships)
    };
  }

  // confirmCartSelection()
  confirmCartSelection() {
    const carts = this._getFromStorage('cart');
    const cart = carts[0] || null;
    if (!cart) {
      return {
        success: false,
        message: 'Cart is empty',
        cart_id: null,
        confirmed_at: null
      };
    }
    const confirmed_at = this._nowIso();
    return {
      success: true,
      message: 'Selection confirmed',
      cart_id: cart.id,
      confirmed_at
    };
  }

  // ---------------------- Registration ----------------------

  // getRegistrationFormDefaults(activityId, sessionId)
  getRegistrationFormDefaults(activityId, sessionId) {
    const activities = this._getFromStorage('activities');
    const sessions = this._getFromStorage('activity_sessions');

    const activity = activities.find(a => a.id === activityId) || null;
    if (!activity) {
      return {
        activity_summary: null,
        session_options: [],
        default_session_id: null,
        default_participants_count: 1,
        price_per_participant: 0,
        currency: 'USD',
        registration_open: false
      };
    }

    const activitySessions = sessions.filter(s => s.activity_id === activity.id);

    let defaultSession = null;
    if (sessionId) {
      defaultSession = activitySessions.find(s => s.id === sessionId) || null;
    }
    if (!defaultSession) {
      const openSessions = activitySessions.filter(s => s.is_registration_open !== false);
      if (openSessions.length) {
        openSessions.sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime));
        defaultSession = openSessions[0];
      }
    }

    const price_per_participant = typeof activity.price_min === 'number' ? activity.price_min : 0;
    const currency = activity.price_currency || 'USD';

    const activity_summary = {
      activity_id: activity.id,
      title: activity.title,
      min_age: activity.min_age,
      max_age: activity.max_age,
      price_type: activity.price_type,
      price_min: activity.price_min,
      price_currency: activity.price_currency || 'USD',
      price_unit: activity.price_unit
    };

    return {
      activity_summary,
      session_options: activitySessions,
      default_session_id: defaultSession ? defaultSession.id : null,
      default_participants_count: 1,
      price_per_participant,
      currency,
      registration_open: activity.registration_available === true && activitySessions.length > 0
    };
  }

  // submitRegistration(activityId, sessionId, participants_count, parent_guardian_name, contact_phone, contact_email)
  submitRegistration(
    activityId,
    sessionId,
    participants_count,
    parent_guardian_name,
    contact_phone,
    contact_email
  ) {
    const activities = this._getFromStorage('activities');
    const sessions = this._getFromStorage('activity_sessions');
    const registrations = this._getFromStorage('registrations');

    const activity = activities.find(a => a.id === activityId) || null;
    const session = sessions.find(s => s.id === sessionId) || null;
    if (!activity || !session || session.activity_id !== activity.id) {
      return {
        success: false,
        message: 'Invalid activity or session',
        registration: null
      };
    }

    const count = participants_count || 1;
    let total_price = 0;
    let currency = activity.price_currency || 'USD';
    if (activity.price_type !== 'free') {
      const pricePer = typeof activity.price_min === 'number' ? activity.price_min : 0;
      total_price = pricePer * count;
    }

    const registration = {
      id: this._generateId('registration'),
      activity_id: activity.id,
      session_id: session.id,
      created_at: this._nowIso(),
      participants_count: count,
      parent_guardian_name,
      contact_phone,
      contact_email: contact_email || null,
      total_price,
      currency,
      registration_status: 'confirmed'
    };

    registrations.push(registration);

    // Update session capacity if present
    const sessionIndex = sessions.findIndex(s => s.id === session.id);
    if (sessionIndex >= 0) {
      const s = sessions[sessionIndex];
      if (typeof s.capacity_available === 'number') {
        s.capacity_available = Math.max(0, s.capacity_available - count);
      }
      sessions[sessionIndex] = s;
      this._saveToStorage('activity_sessions', sessions);
    }

    this._saveToStorage('registrations', registrations);

    return {
      success: true,
      message: 'Registration confirmed',
      registration
    };
  }

  // ---------------------- Favorites ----------------------

  // getFavoritesList(date_start, date_end, content_groups, activity_categories, tags, sort_by)
  getFavoritesList(
    date_start,
    date_end,
    content_groups,
    activity_categories,
    tags,
    sort_by = 'added_desc'
  ) {
    const favoritesLists = this._getFromStorage('favorites_lists');
    const favoriteItems = this._getFromStorage('favorite_items');
    const activities = this._getFromStorage('activities');
    const sessions = this._getFromStorage('activity_sessions');
    const locations = this._getFromStorage('locations');

    const list = favoritesLists.find(l => l.name === 'Favorites') || favoritesLists[0] || null;
    if (!list) {
      return {
        items: [],
        total_count: 0
      };
    }

    const activitiesById = {};
    for (const a of activities) activitiesById[a.id] = a;
    const sessionsByActivity = {};
    for (const s of sessions) {
      if (!sessionsByActivity[s.activity_id]) sessionsByActivity[s.activity_id] = [];
      sessionsByActivity[s.activity_id].push(s);
    }
    const locationsById = {};
    for (const l of locations) locationsById[l.id] = l;

    const dateRange = this._normalizeDateRange(date_start, date_end);

    let items = favoriteItems
      .filter(fi => fi.favorites_list_id === list.id)
      .map(fi => {
        const activity = activitiesById[fi.activity_id];
        return { favoriteItem: fi, activity };
      })
      .filter(x => !!x.activity);

    if (Array.isArray(content_groups) && content_groups.length) {
      items = items.filter(x => content_groups.includes(x.activity.content_group));
    }
    if (Array.isArray(activity_categories) && activity_categories.length) {
      items = items.filter(x => activity_categories.includes(x.activity.activity_category));
    }
    if (Array.isArray(tags) && tags.length) {
      items = items.filter(x => {
        const actTags = Array.isArray(x.activity.tags) ? x.activity.tags : [];
        return tags.every(t => actTags.includes(t));
      });
    }

    // Date filtering based on sessions
    if (dateRange.date_start || dateRange.date_end) {
      items = items.filter(x => {
        const actSessions = sessionsByActivity[x.activity.id] || [];
        return actSessions.some(s => this._dateInRange(s.start_datetime, dateRange.date_start, dateRange.date_end));
      });
    }

    // Build summaries
    const resultItems = items.map(({ favoriteItem, activity }) => {
      const actSessions = sessionsByActivity[activity.id] || [];
      let nextSession = null;
      for (const s of actSessions) {
        if (!nextSession || new Date(s.start_datetime) < new Date(nextSession.start_datetime)) {
          nextSession = s;
        }
      }
      const loc = locationsById[activity.location_id] || null;
      return {
        favorite_item_id: favoriteItem.id,
        added_at: favoriteItem.added_at,
        activity_summary: {
          activity_id: activity.id,
          title: activity.title,
          short_description: activity.short_description || '',
          content_group_label: this._getContentGroupLabel(activity.content_group),
          primary_category_label: this._getActivityCategoryLabel(activity.activity_category),
          next_start_datetime: nextSession ? nextSession.start_datetime : null,
          price_summary: this._formatPriceSummary(activity),
          location_name: loc ? loc.name : null,
          rating: activity.rating
        }
      };
    });

    // Sorting
    const sortKey = sort_by || 'added_desc';
    resultItems.sort((a, b) => {
      if (sortKey === 'added_asc') {
        return new Date(a.added_at || 0) - new Date(b.added_at || 0);
      } else if (sortKey === 'added_desc') {
        return new Date(b.added_at || 0) - new Date(a.added_at || 0);
      } else if (sortKey === 'date_asc') {
        const da = a.activity_summary.next_start_datetime ? new Date(a.activity_summary.next_start_datetime) : new Date(8640000000000000);
        const db = b.activity_summary.next_start_datetime ? new Date(b.activity_summary.next_start_datetime) : new Date(8640000000000000);
        return da - db;
      } else if (sortKey === 'date_desc') {
        const da = a.activity_summary.next_start_datetime ? new Date(a.activity_summary.next_start_datetime) : new Date(0);
        const db = b.activity_summary.next_start_datetime ? new Date(b.activity_summary.next_start_datetime) : new Date(0);
        return db - da;
      }
      return 0;
    });

    return {
      items: resultItems,
      total_count: resultItems.length
    };
  }

  // addActivityToFavorites(activityId)
  addActivityToFavorites(activityId) {
    const activities = this._getFromStorage('activities');
    const activity = activities.find(a => a.id === activityId) || null;
    if (!activity) {
      return { success: false, message: 'Activity not found', favorite_item_id: null, favorites_count: 0 };
    }

    const list = this._getOrCreateFavoritesList();
    const favoriteItems = this._getFromStorage('favorite_items');

    let existing = favoriteItems.find(fi => fi.favorites_list_id === list.id && fi.activity_id === activityId);
    if (!existing) {
      existing = {
        id: this._generateId('favorite'),
        favorites_list_id: list.id,
        activity_id: activityId,
        added_at: this._nowIso()
      };
      favoriteItems.push(existing);
      list.updated_at = this._nowIso();
      const lists = this._getFromStorage('favorites_lists').map(l => (l.id === list.id ? list : l));
      this._saveToStorage('favorites_lists', lists);
    }

    this._saveToStorage('favorite_items', favoriteItems);

    const favorites_count = favoriteItems.filter(fi => fi.favorites_list_id === list.id).length;
    return {
      success: true,
      message: 'Added to favorites',
      favorite_item_id: existing.id,
      favorites_count
    };
  }

  // removeFavorite(favoriteItemId)
  removeFavorite(favoriteItemId) {
    const favoriteItems = this._getFromStorage('favorite_items');
    const favoritesLists = this._getFromStorage('favorites_lists');
    const list = favoritesLists.find(l => l.name === 'Favorites') || favoritesLists[0] || null;

    const newItems = favoriteItems.filter(fi => fi.id !== favoriteItemId);
    this._saveToStorage('favorite_items', newItems);

    const favorites_count = list ? newItems.filter(fi => fi.favorites_list_id === list.id).length : newItems.length;
    return {
      success: true,
      message: 'Favorite removed',
      favorites_count
    };
  }

  // ---------------------- Day plans ----------------------

  _buildDayPlanResponse(plan) {
    const dayPlanItems = this._getFromStorage('day_plan_items').filter(i => i.day_plan_id === plan.id);
    const activities = this._getFromStorage('activities');
    const sessions = this._getFromStorage('activity_sessions');
    const locations = this._getFromStorage('locations');

    const activitiesById = {};
    for (const a of activities) activitiesById[a.id] = a;
    const sessionsById = {};
    for (const s of sessions) sessionsById[s.id] = s;
    const locationsById = {};
    for (const l of locations) locationsById[l.id] = l;

    const items = [];
    let total_estimated_cost = 0;

    for (const dpi of dayPlanItems) {
      const activity = activitiesById[dpi.activity_id] || null;
      const session = dpi.session_id ? sessionsById[dpi.session_id] || null : null;
      const loc = activity ? locationsById[activity.location_id] || null : null;
      total_estimated_cost += dpi.estimated_cost || 0;
      items.push({
        day_plan_item_id: dpi.id,
        activity_summary: activity
          ? {
              activity_id: activity.id,
              title: activity.title,
              short_description: activity.short_description || '',
              primary_category_label: this._getActivityCategoryLabel(activity.activity_category),
              price_summary: this._formatPriceSummary(activity),
              location_name: loc ? loc.name : null
            }
          : null,
        session_summary: session
          ? {
              session_id: session.id,
              start_datetime: session.start_datetime,
              end_datetime: session.end_datetime || null,
              time_of_day_bucket: session.time_of_day_bucket
            }
          : null,
        time_of_day_bucket: dpi.time_of_day_bucket || (session ? session.time_of_day_bucket : null),
        sort_order: dpi.sort_order,
        estimated_cost: dpi.estimated_cost || 0
      });
    }

    items.sort((a, b) => {
      const tA = a.time_of_day_bucket || '';
      const tB = b.time_of_day_bucket || '';
      if (tA < tB) return -1;
      if (tA > tB) return 1;
      return (a.sort_order || 0) - (b.sort_order || 0);
    });

    return {
      day_plan_id: plan.id,
      date: plan.date,
      title: plan.title || '',
      notes: plan.notes || '',
      items,
      summary: {
        total_items: items.length,
        total_estimated_cost,
        currency: 'USD'
      }
    };
  }

  // getDayPlan(date)
  getDayPlan(date) {
    const dateStr = String(date).slice(0, 10);
    const dayPlans = this._getFromStorage('day_plans');
    let plan = dayPlans.find(p => String(p.date).slice(0, 10) === dateStr) || null;
    if (!plan) {
      // Return empty plan shape without creating
      return {
        day_plan_id: null,
        date: dateStr,
        title: '',
        notes: '',
        items: [],
        summary: {
          total_items: 0,
          total_estimated_cost: 0,
          currency: 'USD'
        }
      };
    }
    return this._buildDayPlanResponse(plan);
  }

  // addActivityToDayPlan(date, activityId, sessionId, time_of_day_bucket)
  addActivityToDayPlan(date, activityId, sessionId, time_of_day_bucket) {
    const dateStr = String(date).slice(0, 10);
    const activities = this._getFromStorage('activities');
    const sessions = this._getFromStorage('activity_sessions');
    const activity = activities.find(a => a.id === activityId) || null;
    if (!activity) {
      return { success: false, message: 'Activity not found', day_plan: null };
    }

    const plan = this._getOrCreateDayPlan(dateStr);
    const dayPlanItems = this._getFromStorage('day_plan_items');

    let chosenSession = null;
    if (sessionId) {
      chosenSession = sessions.find(s => s.id === sessionId && s.activity_id === activity.id) || null;
    } else {
      const actSessions = sessions.filter(s => s.activity_id === activity.id);
      const dateRange = this._normalizeDateRange(dateStr, dateStr);
      const candidates = actSessions.filter(s => this._dateInRange(s.start_datetime, dateRange.date_start, dateRange.date_end));
      if (candidates.length) {
        candidates.sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime));
        chosenSession = candidates[0];
      }
    }

    let bucket = time_of_day_bucket;
    if (!bucket && chosenSession) {
      bucket = chosenSession.time_of_day_bucket || this._inferTimeOfDayBucketFromSession(chosenSession);
    }
    if (!bucket) bucket = 'daytime';

    const existingForPlan = dayPlanItems.filter(i => i.day_plan_id === plan.id);
    const maxSort = existingForPlan.reduce((max, i) => Math.max(max, i.sort_order || 0), 0);

    const estimated_cost = this._calculateEstimatedCostForActivity(activity);

    const dayPlanItem = {
      id: this._generateId('dayplanitem'),
      day_plan_id: plan.id,
      activity_id: activity.id,
      session_id: chosenSession ? chosenSession.id : null,
      time_of_day_bucket: bucket,
      sort_order: maxSort + 1,
      estimated_cost,
      added_at: this._nowIso()
    };

    dayPlanItems.push(dayPlanItem);
    this._saveToStorage('day_plan_items', dayPlanItems);

    const dayPlans = this._getFromStorage('day_plans').map(p => (p.id === plan.id ? { ...p, updated_at: this._nowIso() } : p));
    this._saveToStorage('day_plans', dayPlans);

    const updatedPlan = dayPlans.find(p => p.id === plan.id) || plan;
    return {
      success: true,
      message: 'Added to day plan',
      day_plan: this._buildDayPlanResponse(updatedPlan)
    };
  }

  // updateDayPlanItemTime(dayPlanItemId, time_of_day_bucket)
  updateDayPlanItemTime(dayPlanItemId, time_of_day_bucket) {
    const dayPlanItems = this._getFromStorage('day_plan_items');
    const idx = dayPlanItems.findIndex(i => i.id === dayPlanItemId);
    if (idx === -1) {
      return { success: false, message: 'Day plan item not found', day_plan: null };
    }
    const item = dayPlanItems[idx];
    item.time_of_day_bucket = time_of_day_bucket;
    dayPlanItems[idx] = item;
    this._saveToStorage('day_plan_items', dayPlanItems);

    const dayPlans = this._getFromStorage('day_plans');
    const plan = dayPlans.find(p => p.id === item.day_plan_id) || null;
    return {
      success: true,
      message: 'Time updated',
      day_plan: plan ? { day_plan_id: plan.id, date: plan.date } : null
    };
  }

  // updateDayPlanItemSortOrder(dayPlanItemId, sort_order)
  updateDayPlanItemSortOrder(dayPlanItemId, sort_order) {
    const dayPlanItems = this._getFromStorage('day_plan_items');
    const idx = dayPlanItems.findIndex(i => i.id === dayPlanItemId);
    if (idx === -1) {
      return { success: false, message: 'Day plan item not found' };
    }
    const item = dayPlanItems[idx];
    item.sort_order = sort_order;
    dayPlanItems[idx] = item;
    this._saveToStorage('day_plan_items', dayPlanItems);
    return { success: true, message: 'Sort order updated' };
  }

  // removeDayPlanItem(dayPlanItemId)
  removeDayPlanItem(dayPlanItemId) {
    const dayPlanItems = this._getFromStorage('day_plan_items');
    const item = dayPlanItems.find(i => i.id === dayPlanItemId) || null;
    const newItems = dayPlanItems.filter(i => i.id !== dayPlanItemId);
    this._saveToStorage('day_plan_items', newItems);

    const dayPlans = this._getFromStorage('day_plans');
    const plan = item ? dayPlans.find(p => p.id === item.day_plan_id) || null : null;

    return {
      success: true,
      message: 'Removed from day plan',
      day_plan: plan ? { day_plan_id: plan.id, date: plan.date } : null
    };
  }

  // ---------------------- Watchlist ----------------------

  // getWatchlist(age_min, age_max, schedule_recurrence, days_of_week, time_of_day_buckets, distance_max_miles, sort_by)
  getWatchlist(
    age_min,
    age_max,
    schedule_recurrence = 'any',
    days_of_week,
    time_of_day_buckets,
    distance_max_miles,
    sort_by = 'distance_nearest_first'
  ) {
    const watchlists = this._getFromStorage('watchlists');
    const watchlistItems = this._getFromStorage('watchlist_items');
    const activities = this._getFromStorage('activities');
    const sessions = this._getFromStorage('activity_sessions');
    const locations = this._getFromStorage('locations');

    const watchlist = watchlists.find(l => l.name === 'Classes Watchlist') || watchlists[0] || null;
    if (!watchlist) {
      return { items: [], total_count: 0 };
    }

    const activitiesById = {};
    for (const a of activities) activitiesById[a.id] = a;
    const sessionsByActivity = {};
    for (const s of sessions) {
      if (!sessionsByActivity[s.activity_id]) sessionsByActivity[s.activity_id] = [];
      sessionsByActivity[s.activity_id].push(s);
    }
    const locationsById = {};
    for (const l of locations) locationsById[l.id] = l;

    const defaultLoc = this._getUserDefaultLocation();
    const dLat = defaultLoc ? defaultLoc.latitude : null;
    const dLon = defaultLoc ? defaultLoc.longitude : null;

    let items = watchlistItems
      .filter(wi => wi.watchlist_id === watchlist.id)
      .map(wi => {
        const activity = activitiesById[wi.activity_id];
        return { watchlistItem: wi, activity };
      })
      .filter(x => !!x.activity);

    if (typeof age_min === 'number') {
      items = items.filter(({ activity }) => {
        const max = typeof activity.max_age === 'number' ? activity.max_age : Infinity;
        return max >= age_min;
      });
    }
    if (typeof age_max === 'number') {
      items = items.filter(({ activity }) => {
        const min = typeof activity.min_age === 'number' ? activity.min_age : 0;
        return min <= age_max;
      });
    }

    if (schedule_recurrence && schedule_recurrence !== 'any') {
      items = items.filter(({ activity }) => activity.schedule_recurrence === schedule_recurrence);
    }

    // Filter by days/time using sessions
    if ((Array.isArray(days_of_week) && days_of_week.length) || (Array.isArray(time_of_day_buckets) && time_of_day_buckets.length)) {
      items = items.filter(({ activity }) => {
        const actSessions = sessionsByActivity[activity.id] || [];
        return actSessions.some(s => {
          if (Array.isArray(days_of_week) && days_of_week.length && !days_of_week.includes(s.day_of_week)) {
            return false;
          }
          if (Array.isArray(time_of_day_buckets) && time_of_day_buckets.length && !time_of_day_buckets.includes(s.time_of_day_bucket)) {
            return false;
          }
          return true;
        });
      });
    }

    // Distance filter
    items = items.map(x => {
      const loc = locationsById[x.activity.location_id] || null;
      const distance = loc && dLat != null && dLon != null
        ? this._calculateDistanceMiles(dLat, dLon, loc.latitude, loc.longitude)
        : null;
      return { ...x, distance };
    });

    if (typeof distance_max_miles === 'number') {
      items = items.filter(x => x.distance != null && x.distance <= distance_max_miles);
    }

    // Build summaries
    const resultItems = items.map(({ watchlistItem, activity, distance }) => {
      const actSessions = sessionsByActivity[activity.id] || [];
      let nextSession = null;
      for (const s of actSessions) {
        if (!nextSession || new Date(s.start_datetime) < new Date(nextSession.start_datetime)) {
          nextSession = s;
        }
      }
      const loc = locationsById[activity.location_id] || null;
      return {
        watchlist_item_id: watchlistItem.id,
        added_at: watchlistItem.added_at,
        activity_summary: {
          activity_id: activity.id,
          title: activity.title,
          short_description: activity.short_description || '',
          schedule_recurrence: activity.schedule_recurrence || null,
          primary_category_label: this._getActivityCategoryLabel(activity.activity_category),
          next_start_datetime: nextSession ? nextSession.start_datetime : null,
          price_summary: this._formatPriceSummary(activity),
          location_name: loc ? loc.name : null,
          distance_miles: distance
        }
      };
    });

    // Sorting
    const sortKey = sort_by || 'distance_nearest_first';
    resultItems.sort((a, b) => {
      if (sortKey === 'title') {
        return (a.activity_summary.title || '').localeCompare(b.activity_summary.title || '');
      } else if (sortKey === 'added_desc') {
        return new Date(b.added_at || 0) - new Date(a.added_at || 0);
      } else if (sortKey === 'distance_nearest_first') {
        const dA = a.activity_summary.distance_miles != null ? a.activity_summary.distance_miles : Number.POSITIVE_INFINITY;
        const dB = b.activity_summary.distance_miles != null ? b.activity_summary.distance_miles : Number.POSITIVE_INFINITY;
        return dA - dB;
      }
      return 0;
    });

    return { items: resultItems, total_count: resultItems.length };
  }

  // addActivityToWatchlist(activityId)
  addActivityToWatchlist(activityId) {
    const activities = this._getFromStorage('activities');
    const activity = activities.find(a => a.id === activityId) || null;
    if (!activity) {
      return { success: false, message: 'Activity not found', watchlist_item_id: null, watchlist_count: 0 };
    }

    const watchlist = this._getOrCreateWatchlist();
    const watchlistItems = this._getFromStorage('watchlist_items');

    let existing = watchlistItems.find(wi => wi.watchlist_id === watchlist.id && wi.activity_id === activityId);
    if (!existing) {
      existing = {
        id: this._generateId('watchlistitem'),
        watchlist_id: watchlist.id,
        activity_id: activityId,
        added_at: this._nowIso()
      };
      watchlistItems.push(existing);
      watchlist.updated_at = this._nowIso();
      const watchlists = this._getFromStorage('watchlists').map(w => (w.id === watchlist.id ? watchlist : w));
      this._saveToStorage('watchlists', watchlists);
    }

    this._saveToStorage('watchlist_items', watchlistItems);

    const watchlist_count = watchlistItems.filter(wi => wi.watchlist_id === watchlist.id).length;
    return {
      success: true,
      message: 'Added to watchlist',
      watchlist_item_id: existing.id,
      watchlist_count
    };
  }

  // removeFromWatchlist(watchlistItemId)
  removeFromWatchlist(watchlistItemId) {
    const watchlistItems = this._getFromStorage('watchlist_items');
    const watchlists = this._getFromStorage('watchlists');
    const watchlist = watchlists.find(w => w.name === 'Classes Watchlist') || watchlists[0] || null;

    const newItems = watchlistItems.filter(wi => wi.id !== watchlistItemId);
    this._saveToStorage('watchlist_items', newItems);

    const watchlist_count = watchlist ? newItems.filter(wi => wi.watchlist_id === watchlist.id).length : newItems.length;
    return {
      success: true,
      message: 'Removed from watchlist',
      watchlist_count
    };
  }

  // ---------------------- Static content & contact ----------------------

  // getAboutContent()
  getAboutContent() {
    return this._getObjectFromStorage('about_content', {
      title: '',
      body_html: '',
      last_updated: null
    });
  }

  // getContactInfo()
  getContactInfo() {
    return this._getObjectFromStorage('contact_info', {
      support_email: '',
      support_phone: '',
      address_lines: [],
      support_hours: ''
    });
  }

  // submitContactForm(name, email, subject, message)
  submitContactForm(name, email, subject, message) {
    // For business logic, simulate by returning a ticket id; no storage needed for large payloads
    const ticket_id = this._generateId('ticket');
    return {
      success: true,
      message: 'Message received',
      ticket_id
    };
  }

  // getFAQContent()
  getFAQContent() {
    return this._getObjectFromStorage('faq_content', { sections: [] });
  }

  // getPrivacyPolicyContent()
  getPrivacyPolicyContent() {
    return this._getObjectFromStorage('privacy_policy_content', {
      body_html: '',
      last_updated: null
    });
  }

  // getTermsContent()
  getTermsContent() {
    return this._getObjectFromStorage('terms_content', {
      body_html: '',
      last_updated: null
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
