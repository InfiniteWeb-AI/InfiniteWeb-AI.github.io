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

  // -------------------- Initialization & Storage Helpers --------------------

  _initStorage() {
    // Initialize all entity tables defined in the data model
    const keys = [
      'classes',
      'schedule_items',
      'membership_plans',
      'membership_applications',
      'clubs',
      'favorite_clubs',
      'volunteer_opportunities',
      'volunteer_signups',
      'rooms',
      'room_reservations',
      'news_articles',
      'article_bookmarks',
      'forum_boards',
      'forum_topics',
      'topic_subscriptions',
      'workshops',
      'workshop_registrations',
      'newsletter_preferences'
    ];

    for (const key of keys) {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key) {
    const data = localStorage.getItem(key);
    if (!data) return [];
    try {
      return JSON.parse(data);
    } catch (e) {
      // If parsing fails, reset to empty array to avoid breaking the app
      return [];
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

  _getCurrentTimestamp() {
    return new Date().toISOString();
  }

  _normalizeDateAndTime(dateStr, timeStr) {
    if (!dateStr || !timeStr) return null;
    // Expect dateStr: 'YYYY-MM-DD', timeStr: 'HH:MM'
    const isoString = dateStr + 'T' + timeStr + ':00';
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return null;
    return d.toISOString();
  }

  _applyPagination(items, page = 1, pageSize = 20) {
    const total = items.length;
    const p = page && page > 0 ? page : 1;
    const ps = pageSize && pageSize > 0 ? pageSize : 20;
    const start = (p - 1) * ps;
    const end = start + ps;
    return {
      items: items.slice(start, end),
      total,
      page: p,
      pageSize: ps
    };
  }

  _getCurrentUserContext() {
    const key = 'current_user_context';
    const existing = localStorage.getItem(key);
    if (existing) {
      try {
        return JSON.parse(existing);
      } catch (e) {
        // fall through to recreate
      }
    }
    const ctx = {
      id: 'user_1',
      created_at: this._getCurrentTimestamp()
    };
    localStorage.setItem(key, JSON.stringify(ctx));
    return ctx;
  }

  // -------------------- Label Helpers --------------------

  _difficultyLabel(value) {
    switch (value) {
      case 'beginner': return 'Beginner';
      case 'intermediate': return 'Intermediate';
      case 'advanced': return 'Advanced';
      case 'all_levels': return 'All Levels';
      default: return 'Unknown';
    }
  }

  _clubCategoryLabel(value) {
    switch (value) {
      case 'arts_culture': return 'Arts & Culture';
      case 'outdoors_nature': return 'Outdoors & Nature';
      case 'games_hobbies': return 'Games & Hobbies';
      case 'other': return 'Other';
      default: return 'Other';
    }
  }

  _newsCategoryLabel(value) {
    switch (value) {
      case 'music': return 'Music';
      case 'events': return 'Events';
      case 'announcements': return 'Announcements';
      case 'sports': return 'Sports';
      case 'community': return 'Community';
      case 'other': return 'Other';
      default: return 'Other';
    }
  }

  _amenityLabel(key) {
    if (!key || typeof key !== 'string') return '';
    const withSpaces = key.replace(/_/g, ' ');
    return withSpaces.charAt(0).toUpperCase() + withSpaces.slice(1);
  }

  _dayOfWeekFromDateString(isoString) {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return null;
    return d.getDay(); // 0=Sunday ... 6=Saturday
  }

  _timeHHMMFromDateString(isoString) {
    if (!isoString || typeof isoString !== 'string') return null;
    // Expect ISO 8601 like 'YYYY-MM-DDTHH:MM:SSZ' – extract literal time to avoid timezone shifts
    const match = isoString.match(/T(\d{2}):(\d{2})/);
    if (!match) return null;
    return match[1] + ':' + match[2];
  }

  _compareTimeHHMM(a, b) {
    // return negative if a<b, 0 if equal, positive if a>b
    const [ah, am] = (a || '00:00').split(':').map(Number);
    const [bh, bm] = (b || '00:00').split(':').map(Number);
    const aMinutes = ah * 60 + am;
    const bMinutes = bh * 60 + bm;
    return aMinutes - bMinutes;
  }

  // -------------------- Homepage --------------------

  getHomepageOverview() {
    const now = new Date();

    const classes = this._getFromStorage('classes');
    const workshops = this._getFromStorage('workshops');
    const clubs = this._getFromStorage('clubs');
    const articles = this._getFromStorage('news_articles');

    const upcomingClasses = classes
      .filter(c => c && c.status === 'scheduled' && c.start_datetime && new Date(c.start_datetime) >= now)
      .sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime))
      .slice(0, 5)
      .map(c => ({
        id: c.id,
        title: c.title,
        category: c.category || '',
        difficulty_level: c.difficulty_level,
        difficulty_label: this._difficultyLabel(c.difficulty_level),
        start_datetime: c.start_datetime,
        end_datetime: c.end_datetime,
        price: c.price,
        currency: c.currency,
        location: c.location || ''
      }));

    const upcomingWorkshops = workshops
      .filter(w => w && w.status === 'upcoming' && w.start_datetime && new Date(w.start_datetime) >= now)
      .sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime))
      .slice(0, 5)
      .map(w => ({
        id: w.id,
        title: w.title,
        start_datetime: w.start_datetime,
        end_datetime: w.end_datetime,
        fee: w.fee,
        currency: w.currency,
        rating: w.rating
      }));

    const featuredClubs = clubs
      .slice()
      .sort((a, b) => (b.member_count || 0) - (a.member_count || 0))
      .slice(0, 5)
      .map(c => ({
        id: c.id,
        name: c.name,
        category: c.category,
        category_label: this._clubCategoryLabel(c.category),
        next_meeting_datetime: c.next_meeting_datetime,
        member_count: c.member_count
      }));

    const publishedArticles = articles.filter(a => a && a.status === 'published');

    const featuredArticles = publishedArticles
      .slice()
      .sort((a, b) => new Date(b.published_at) - new Date(a.published_at))
      .slice(0, 5)
      .map(a => ({
        id: a.id,
        title: a.title,
        category: a.category,
        category_label: this._newsCategoryLabel(a.category),
        published_at: a.published_at,
        excerpt: a.excerpt || (a.content ? a.content.slice(0, 140) : '')
      }));

    const announcements = publishedArticles
      .filter(a => a.category === 'announcements')
      .slice()
      .sort((a, b) => new Date(b.published_at) - new Date(a.published_at))
      .slice(0, 5)
      .map(a => ({
        id: a.id,
        title: a.title,
        published_at: a.published_at,
        excerpt: a.excerpt || (a.content ? a.content.slice(0, 140) : '')
      }));

    return {
      hero_message: 'Welcome to your local social club – connect, move, and have fun close to home.',
      upcoming_classes: upcomingClasses,
      upcoming_workshops: upcomingWorkshops,
      featured_clubs: featuredClubs,
      featured_articles: featuredArticles,
      announcements
    };
  }

  // -------------------- Classes & Activities --------------------

  getClassFilterOptions() {
    const classes = this._getFromStorage('classes');
    const categorySet = new Set();
    for (const c of classes) {
      if (c && c.category) categorySet.add(c.category);
    }

    let minPrice = Infinity;
    let maxPrice = 0;
    for (const c of classes) {
      if (typeof c.price === 'number') {
        if (c.price < minPrice) minPrice = c.price;
        if (c.price > maxPrice) maxPrice = c.price;
      }
    }
    if (!isFinite(minPrice)) minPrice = 0;
    if (!isFinite(maxPrice)) maxPrice = minPrice + 100;

    return {
      difficulty_levels: [
        { value: 'beginner', label: 'Beginner' },
        { value: 'intermediate', label: 'Intermediate' },
        { value: 'advanced', label: 'Advanced' },
        { value: 'all_levels', label: 'All Levels' }
      ],
      categories: Array.from(categorySet),
      price_range_suggestions: {
        min: minPrice,
        max: maxPrice,
        step: Math.max(1, Math.round((maxPrice - minPrice) / 10) || 5)
      },
      sort_options: [
        { value: 'start_time_asc', label: 'Start time - Earliest first' },
        { value: 'start_time_desc', label: 'Start time - Latest first' },
        { value: 'price_asc', label: 'Price - Low to High' },
        { value: 'price_desc', label: 'Price - High to Low' },
        { value: 'created_at_desc', label: 'Newest classes' }
      ]
    };
  }

  searchClasses(
    keyword,
    startDate,
    endDate,
    startTimeAfter,
    minPrice,
    maxPrice,
    difficultyLevels,
    categories,
    sortBy = 'start_time_asc',
    page = 1,
    pageSize = 20
  ) {
    const classes = this._getFromStorage('classes');
    const kw = keyword ? String(keyword).toLowerCase() : null;

    let results = classes.filter(c => !!c);

    if (kw) {
      results = results.filter(c => {
        const title = (c.title || '').toLowerCase();
        const subtitle = (c.subtitle || '').toLowerCase();
        const desc = (c.description || '').toLowerCase();
        const cat = (c.category || '').toLowerCase();
        return (
          title.includes(kw) ||
          subtitle.includes(kw) ||
          desc.includes(kw) ||
          cat.includes(kw)
        );
      });
    }

    if (startDate) {
      const start = new Date(startDate + 'T00:00:00');
      results = results.filter(c => c.start_datetime && new Date(c.start_datetime) >= start);
    }

    if (endDate) {
      const end = new Date(endDate + 'T23:59:59');
      results = results.filter(c => c.start_datetime && new Date(c.start_datetime) <= end);
    }

    if (startTimeAfter) {
      results = results.filter(c => {
        const time = this._timeHHMMFromDateString(c.start_datetime);
        if (!time) return false;
        // "after" means strictly greater than
        return this._compareTimeHHMM(time, startTimeAfter) > 0;
      });
    }

    if (typeof minPrice === 'number') {
      results = results.filter(c => typeof c.price === 'number' && c.price >= minPrice);
    }

    if (typeof maxPrice === 'number') {
      results = results.filter(c => typeof c.price === 'number' && c.price <= maxPrice);
    }

    if (Array.isArray(difficultyLevels) && difficultyLevels.length > 0) {
      results = results.filter(c => difficultyLevels.includes(c.difficulty_level));
    }

    if (Array.isArray(categories) && categories.length > 0) {
      results = results.filter(c => categories.includes(c.category));
    }

    // Sorting
    const sorted = results.slice();
    switch (sortBy) {
      case 'start_time_desc':
        sorted.sort((a, b) => new Date(b.start_datetime) - new Date(a.start_datetime));
        break;
      case 'price_asc':
        sorted.sort((a, b) => (a.price || 0) - (b.price || 0));
        break;
      case 'price_desc':
        sorted.sort((a, b) => (b.price || 0) - (a.price || 0));
        break;
      case 'created_at_desc':
        sorted.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
        break;
      case 'start_time_asc':
      default:
        sorted.sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime));
        break;
    }

    const { items, total, page: p, pageSize: ps } = this._applyPagination(sorted, page, pageSize);

    const mapped = items.map(c => ({
      id: c.id,
      title: c.title,
      subtitle: c.subtitle || '',
      category: c.category || '',
      difficulty_level: c.difficulty_level,
      difficulty_label: this._difficultyLabel(c.difficulty_level),
      price: c.price,
      currency: c.currency,
      start_datetime: c.start_datetime,
      end_datetime: c.end_datetime,
      location: c.location || '',
      instructor_name: c.instructor_name || '',
      capacity: typeof c.capacity === 'number' ? c.capacity : null,
      spots_remaining: typeof c.spots_remaining === 'number' ? c.spots_remaining : null,
      is_full: typeof c.spots_remaining === 'number' ? c.spots_remaining <= 0 : false,
      status: c.status
    }));

    return { results: mapped, total, page: p, pageSize: ps };
  }

  getClassDetail(classId) {
    const classes = this._getFromStorage('classes');
    const scheduleItems = this._getFromStorage('schedule_items');
    const c = classes.find(cl => cl.id === classId);
    if (!c) return null;

    const isFull = typeof c.spots_remaining === 'number' ? c.spots_remaining <= 0 : false;
    const now = new Date();
    const start = c.start_datetime ? new Date(c.start_datetime) : null;
    let availability_message = '';
    if (c.status === 'cancelled') {
      availability_message = 'This class has been cancelled.';
    } else if (c.status === 'completed') {
      availability_message = 'This class has already taken place.';
    } else if (isFull) {
      availability_message = 'This class is currently full.';
    } else if (start && start < now) {
      availability_message = 'This class has already started.';
    } else {
      availability_message = 'Spots are available. Add to your schedule to reserve a spot.';
    }

    const isInSchedule = scheduleItems.some(si => si.class_id === classId);

    return {
      id: c.id,
      title: c.title,
      subtitle: c.subtitle || '',
      description: c.description || '',
      category: c.category || '',
      difficulty_level: c.difficulty_level,
      difficulty_label: this._difficultyLabel(c.difficulty_level),
      price: c.price,
      currency: c.currency,
      start_datetime: c.start_datetime,
      end_datetime: c.end_datetime,
      location: c.location || '',
      instructor_name: c.instructor_name || '',
      capacity: typeof c.capacity === 'number' ? c.capacity : null,
      spots_remaining: typeof c.spots_remaining === 'number' ? c.spots_remaining : null,
      status: c.status,
      requirements: c.requirements || '',
      availability_message,
      is_full: isFull,
      is_in_schedule: isInSchedule
    };
  }

  addClassToSchedule(classId, notes) {
    const classes = this._getFromStorage('classes');
    const scheduleItems = this._getFromStorage('schedule_items');

    const c = classes.find(cl => cl.id === classId);
    if (!c) {
      return { success: false, schedule_item: null, message: 'Class not found.' };
    }

    const existing = scheduleItems.find(si => si.class_id === classId);
    if (existing) {
      return {
        success: false,
        schedule_item: existing,
        message: 'Class is already in your schedule.'
      };
    }

    const scheduleItem = {
      id: this._generateId('scheduleitem'),
      class_id: classId,
      added_at: this._getCurrentTimestamp(),
      notes: notes || ''
    };

    scheduleItems.push(scheduleItem);
    this._saveToStorage('schedule_items', scheduleItems);

    return {
      success: true,
      schedule_item: scheduleItem,
      message: 'Class added to your schedule.'
    };
  }

  getMySchedule(startDate, endDate) {
    const scheduleItems = this._getFromStorage('schedule_items');
    const classes = this._getFromStorage('classes');

    let items = scheduleItems.slice();

    if (startDate || endDate) {
      const start = startDate ? new Date(startDate + 'T00:00:00') : null;
      const end = endDate ? new Date(endDate + 'T23:59:59') : null;
      items = items.filter(si => {
        const cls = classes.find(c => c.id === si.class_id);
        if (!cls || !cls.start_datetime) return false;
        const d = new Date(cls.start_datetime);
        if (start && d < start) return false;
        if (end && d > end) return false;
        return true;
      });
    }

    return items.map(si => {
      const cls = classes.find(c => c.id === si.class_id) || null;
      const classSummary = cls
        ? {
            id: cls.id,
            title: cls.title,
            start_datetime: cls.start_datetime,
            end_datetime: cls.end_datetime,
            location: cls.location || '',
            difficulty_level: cls.difficulty_level,
            difficulty_label: this._difficultyLabel(cls.difficulty_level)
          }
        : null;

      return {
        schedule_item_id: si.id,
        added_at: si.added_at,
        notes: si.notes || '',
        class: classSummary
      };
    });
  }

  // -------------------- Membership --------------------

  getMembershipFilterOptions() {
    const plans = this._getFromStorage('membership_plans');
    const amenitySet = new Set();
    for (const p of plans) {
      if (Array.isArray(p.amenities)) {
        for (const a of p.amenities) {
          amenitySet.add(a);
        }
      }
    }

    let minPrice = Infinity;
    let maxPrice = 0;
    for (const p of plans) {
      if (typeof p.monthly_price === 'number') {
        if (p.monthly_price < minPrice) minPrice = p.monthly_price;
        if (p.monthly_price > maxPrice) maxPrice = p.monthly_price;
      }
    }
    if (!isFinite(minPrice)) minPrice = 0;
    if (!isFinite(maxPrice)) maxPrice = minPrice + 100;

    const amenities = Array.from(amenitySet).map(key => ({ key, label: this._amenityLabel(key) }));

    return {
      amenities,
      price_range_suggestions: {
        min: minPrice,
        max: maxPrice,
        step: Math.max(1, Math.round((maxPrice - minPrice) / 10) || 5)
      },
      sort_options: [
        { value: 'price_monthly_asc', label: 'Price (monthly) - Low to High' },
        { value: 'price_monthly_desc', label: 'Price (monthly) - High to Low' },
        { value: 'created_at_desc', label: 'Newest plans' }
      ]
    };
  }

  listMembershipPlans(
    amenityKeys,
    minMonthlyPrice,
    maxMonthlyPrice,
    sortBy = 'price_monthly_asc',
    page = 1,
    pageSize = 20
  ) {
    const plans = this._getFromStorage('membership_plans');

    let results = plans.filter(p => p && p.status === 'active');

    if (Array.isArray(amenityKeys) && amenityKeys.length > 0) {
      results = results.filter(p => {
        const amenities = Array.isArray(p.amenities) ? p.amenities : [];
        return amenityKeys.every(a => amenities.includes(a));
      });
    }

    if (typeof minMonthlyPrice === 'number') {
      results = results.filter(p => typeof p.monthly_price === 'number' && p.monthly_price >= minMonthlyPrice);
    }

    if (typeof maxMonthlyPrice === 'number') {
      results = results.filter(p => typeof p.monthly_price === 'number' && p.monthly_price <= maxMonthlyPrice);
    }

    const sorted = results.slice();
    switch (sortBy) {
      case 'price_monthly_desc':
        sorted.sort((a, b) => (b.monthly_price || 0) - (a.monthly_price || 0));
        break;
      case 'created_at_desc':
        sorted.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
        break;
      case 'price_monthly_asc':
      default:
        sorted.sort((a, b) => (a.monthly_price || 0) - (b.monthly_price || 0));
        break;
    }

    // Determine best value (cheapest active plan in this filtered set)
    let bestValueId = null;
    if (sorted.length > 0) {
      let min = Infinity;
      for (const p of sorted) {
        if (typeof p.monthly_price === 'number' && p.monthly_price < min) {
          min = p.monthly_price;
          bestValueId = p.id;
        }
      }
    }

    const { items, total, page: p, pageSize: ps } = this._applyPagination(sorted, page, pageSize);

    const mapped = items.map(plan => ({
      id: plan.id,
      name: plan.name,
      description: plan.description || '',
      monthly_price: plan.monthly_price,
      currency: plan.currency,
      amenities: Array.isArray(plan.amenities) ? plan.amenities : [],
      amenities_labels: Array.isArray(plan.amenities)
        ? plan.amenities.map(a => this._amenityLabel(a))
        : [],
      term_length_months: typeof plan.term_length_months === 'number' ? plan.term_length_months : null,
      enrollment_fee: typeof plan.enrollment_fee === 'number' ? plan.enrollment_fee : null,
      status: plan.status,
      is_best_value: plan.id === bestValueId
    }));

    return { results: mapped, total, page: p, pageSize: ps };
  }

  getMembershipPlanDetail(membershipPlanId) {
    const plans = this._getFromStorage('membership_plans');
    const p = plans.find(pl => pl.id === membershipPlanId);
    if (!p) return null;

    return {
      id: p.id,
      name: p.name,
      description: p.description || '',
      monthly_price: p.monthly_price,
      currency: p.currency,
      amenities: Array.isArray(p.amenities) ? p.amenities : [],
      amenities_labels: Array.isArray(p.amenities)
        ? p.amenities.map(a => this._amenityLabel(a))
        : [],
      term_length_months: typeof p.term_length_months === 'number' ? p.term_length_months : null,
      enrollment_fee: typeof p.enrollment_fee === 'number' ? p.enrollment_fee : null,
      status: p.status,
      access_privileges: p.access_privileges || '',
      conditions: p.conditions || ''
    };
  }

  submitMembershipApplication(
    membershipPlanId,
    fullName,
    email,
    phone,
    streetAddress,
    city,
    state,
    zipCode,
    startDate,
    billingFrequency,
    paymentMethod
  ) {
    const plans = this._getFromStorage('membership_plans');
    const applications = this._getFromStorage('membership_applications');

    const plan = plans.find(p => p.id === membershipPlanId && p.status === 'active');
    if (!plan) {
      return { success: false, application: null, message: 'Membership plan not found or inactive.' };
    }

    const allowedBilling = ['monthly', 'quarterly', 'annual'];
    const billing = allowedBilling.includes(billingFrequency) ? billingFrequency : 'monthly';

    const allowedPayment = ['pay_in_person_at_club_desk', 'credit_card_online', 'bank_transfer'];
    const payment = allowedPayment.includes(paymentMethod) ? paymentMethod : 'pay_in_person_at_club_desk';

    const startDateIso = startDate
      ? new Date(startDate + 'T00:00:00').toISOString()
      : new Date().toISOString();

    const application = {
      id: this._generateId('membershipapp'),
      membership_plan_id: membershipPlanId,
      full_name: fullName,
      email,
      phone,
      street_address: streetAddress,
      city,
      state,
      zip_code: zipCode,
      start_date: startDateIso,
      billing_frequency: billing,
      payment_method: payment,
      status: 'submitted',
      submitted_at: this._getCurrentTimestamp()
    };

    applications.push(application);
    this._saveToStorage('membership_applications', applications);

    return {
      success: true,
      application,
      message: 'Membership application submitted successfully.'
    };
  }

  // -------------------- Clubs & Groups --------------------

  getClubFilterOptions() {
    return {
      categories: [
        { value: 'arts_culture', label: 'Arts & Culture' },
        { value: 'outdoors_nature', label: 'Outdoors & Nature' },
        { value: 'games_hobbies', label: 'Games & Hobbies' },
        { value: 'other', label: 'Other' }
      ],
      meeting_time_presets: [
        { value: 'weekday_evenings', label: 'Weekday evenings (after 5 PM)', description: 'Monday–Friday after 5:00 PM' },
        { value: 'weekends', label: 'Weekends', description: 'Saturday and Sunday meetings' },
        { value: 'any', label: 'Any time', description: 'No time filter' }
      ],
      member_count_suggestions: [5, 10, 20, 50, 100],
      sort_options: [
        { value: 'next_meeting_asc', label: 'Next meeting - Soonest first' },
        { value: 'member_count_desc', label: 'Member count - Largest first' },
        { value: 'created_at_desc', label: 'Newest clubs' }
      ]
    };
  }

  searchClubs(
    category,
    meetingTimePreset,
    minMemberCount,
    sortBy = 'next_meeting_asc',
    page = 1,
    pageSize = 20
  ) {
    const clubs = this._getFromStorage('clubs');

    let results = clubs.filter(c => !!c);

    if (category) {
      results = results.filter(c => c.category === category);
    }

    if (typeof minMemberCount === 'number') {
      results = results.filter(c => typeof c.member_count === 'number' && c.member_count >= minMemberCount);
    }

    if (meetingTimePreset && meetingTimePreset !== 'any') {
      results = results.filter(c => {
        if (!c.next_meeting_datetime) return false;
        const day = this._dayOfWeekFromDateString(c.next_meeting_datetime);
        const time = this._timeHHMMFromDateString(c.next_meeting_datetime);
        if (day === null || !time) return false;
        if (meetingTimePreset === 'weekday_evenings') {
          // Monday=1 to Friday=5, after 17:00
          if (day < 1 || day > 5) return false;
          return this._compareTimeHHMM(time, '17:00') >= 0;
        }
        if (meetingTimePreset === 'weekends') {
          return day === 0 || day === 6;
        }
        return true;
      });
    }

    const sorted = results.slice();
    switch (sortBy) {
      case 'member_count_desc':
        sorted.sort((a, b) => (b.member_count || 0) - (a.member_count || 0));
        break;
      case 'created_at_desc':
        sorted.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
        break;
      case 'next_meeting_asc':
      default:
        sorted.sort((a, b) => new Date(a.next_meeting_datetime || 0) - new Date(b.next_meeting_datetime || 0));
        break;
    }

    const { items, total, page: p, pageSize: ps } = this._applyPagination(sorted, page, pageSize);

    const mapped = items.map(c => ({
      id: c.id,
      name: c.name,
      description_snippet: c.description ? c.description.slice(0, 140) : '',
      category: c.category,
      category_label: this._clubCategoryLabel(c.category),
      next_meeting_datetime: c.next_meeting_datetime,
      meeting_location: c.meeting_location || '',
      meeting_recurrence: c.meeting_recurrence || '',
      member_count: c.member_count,
      is_open_to_new_members: !!c.is_open_to_new_members
    }));

    return { results: mapped, total, page: p, pageSize: ps };
  }

  getClubDetail(clubId) {
    const clubs = this._getFromStorage('clubs');
    const favorites = this._getFromStorage('favorite_clubs');

    const c = clubs.find(cl => cl.id === clubId);
    if (!c) return null;

    const isFavorited = favorites.some(f => f.club_id === clubId);

    return {
      id: c.id,
      name: c.name,
      description: c.description || '',
      category: c.category,
      category_label: this._clubCategoryLabel(c.category),
      next_meeting_datetime: c.next_meeting_datetime,
      meeting_location: c.meeting_location || '',
      meeting_recurrence: c.meeting_recurrence || '',
      member_count: c.member_count,
      is_open_to_new_members: !!c.is_open_to_new_members,
      participation_guidelines: c.participation_guidelines || '',
      is_favorited: isFavorited
    };
  }

  addClubToFavorites(clubId) {
    const clubs = this._getFromStorage('clubs');
    const favorites = this._getFromStorage('favorite_clubs');

    const c = clubs.find(cl => cl.id === clubId);
    if (!c) {
      return { success: false, favorite: null, is_new_favorite: false, message: 'Club not found.' };
    }

    const existing = favorites.find(f => f.club_id === clubId);
    if (existing) {
      return {
        success: true,
        favorite: existing,
        is_new_favorite: false,
        message: 'Club is already in favorites.'
      };
    }

    const favorite = {
      id: this._generateId('favoriteclub'),
      club_id: clubId,
      added_at: this._getCurrentTimestamp()
    };

    favorites.push(favorite);
    this._saveToStorage('favorite_clubs', favorites);

    return {
      success: true,
      favorite,
      is_new_favorite: true,
      message: 'Club added to favorites.'
    };
  }

  getFavoriteClubs() {
    const favorites = this._getFromStorage('favorite_clubs');
    const clubs = this._getFromStorage('clubs');

    return favorites.map(f => {
      const club = clubs.find(c => c.id === f.club_id) || null;
      const clubSummary = club
        ? {
            id: club.id,
            name: club.name,
            category: club.category,
            category_label: this._clubCategoryLabel(club.category),
            next_meeting_datetime: club.next_meeting_datetime,
            member_count: club.member_count
          }
        : null;

      return {
        favorite_id: f.id,
        added_at: f.added_at,
        club: clubSummary
      };
    });
  }

  // -------------------- Volunteer Opportunities --------------------

  getVolunteerFilterOptions() {
    return {
      duration_options: [
        { max_minutes: 60, label: 'Up to 1 hour' },
        { max_minutes: 120, label: 'Up to 2 hours' },
        { max_minutes: 180, label: 'Up to 3 hours' }
      ],
      spots_min_options: [1, 3, 5, 10, 20],
      date_presets: [
        { value: 'current_month', label: 'This month' },
        { value: 'next_month', label: 'Next month' }
      ],
      sort_options: [
        { value: 'date_asc', label: 'Date - Soonest first' },
        { value: 'spots_remaining_desc', label: 'Most spots remaining' }
      ]
    };
  }

  searchVolunteerOpportunities(
    startDate,
    endDate,
    isFamilyFriendly,
    maxDurationMinutes,
    minSpotsRemaining,
    sortBy = 'date_asc',
    page = 1,
    pageSize = 20
  ) {
    const opportunities = this._getFromStorage('volunteer_opportunities');

    let results = opportunities.filter(o => o && o.status === 'upcoming');

    if (startDate) {
      const start = new Date(startDate + 'T00:00:00');
      results = results.filter(o => o.start_datetime && new Date(o.start_datetime) >= start);
    }

    if (endDate) {
      const end = new Date(endDate + 'T23:59:59');
      results = results.filter(o => o.start_datetime && new Date(o.start_datetime) <= end);
    }

    if (typeof isFamilyFriendly === 'boolean') {
      results = results.filter(o => !!o.is_family_friendly === isFamilyFriendly);
    }

    if (typeof maxDurationMinutes === 'number') {
      results = results.filter(o => typeof o.duration_minutes === 'number' && o.duration_minutes <= maxDurationMinutes);
    }

    if (typeof minSpotsRemaining === 'number') {
      results = results.filter(o => typeof o.spots_remaining === 'number' && o.spots_remaining >= minSpotsRemaining);
    }

    const sorted = results.slice();
    switch (sortBy) {
      case 'spots_remaining_desc':
        sorted.sort((a, b) => (b.spots_remaining || 0) - (a.spots_remaining || 0));
        break;
      case 'date_asc':
      default:
        sorted.sort((a, b) => new Date(a.start_datetime || 0) - new Date(b.start_datetime || 0));
        break;
    }

    const { items, total, page: p, pageSize: ps } = this._applyPagination(sorted, page, pageSize);

    const mapped = items.map(o => ({
      id: o.id,
      title: o.title,
      start_datetime: o.start_datetime,
      end_datetime: o.end_datetime,
      duration_minutes: o.duration_minutes,
      location: o.location || '',
      is_family_friendly: !!o.is_family_friendly,
      spots_total: o.spots_total,
      spots_remaining: o.spots_remaining,
      status: o.status
    }));

    return { results: mapped, total, page: p, pageSize: ps };
  }

  getVolunteerOpportunityDetail(volunteerOpportunityId) {
    const opportunities = this._getFromStorage('volunteer_opportunities');
    const o = opportunities.find(op => op.id === volunteerOpportunityId);
    if (!o) return null;

    return {
      id: o.id,
      title: o.title,
      description: o.description || '',
      start_datetime: o.start_datetime,
      end_datetime: o.end_datetime,
      duration_minutes: o.duration_minutes,
      location: o.location || '',
      is_family_friendly: !!o.is_family_friendly,
      spots_total: o.spots_total,
      spots_remaining: o.spots_remaining,
      roles: Array.isArray(o.roles) ? o.roles : [],
      status: o.status,
      contact_email: o.contact_email || ''
    };
  }

  submitVolunteerSignup(
    volunteerOpportunityId,
    name,
    email,
    phone,
    preferredRole
  ) {
    const opportunities = this._getFromStorage('volunteer_opportunities');
    const signups = this._getFromStorage('volunteer_signups');

    const oIndex = opportunities.findIndex(op => op.id === volunteerOpportunityId);
    if (oIndex === -1) {
      return { success: false, signup: null, message: 'Volunteer opportunity not found.' };
    }

    const opportunity = opportunities[oIndex];
    if (opportunity.status !== 'upcoming') {
      return { success: false, signup: null, message: 'Volunteer opportunity is not open for signups.' };
    }

    if (typeof opportunity.spots_remaining === 'number' && opportunity.spots_remaining <= 0) {
      return { success: false, signup: null, message: 'No spots remaining for this opportunity.' };
    }

    const signup = {
      id: this._generateId('volunteersignup'),
      volunteer_opportunity_id: volunteerOpportunityId,
      name,
      email,
      phone,
      preferred_role: preferredRole || '',
      status: 'submitted',
      submitted_at: this._getCurrentTimestamp()
    };

    signups.push(signup);

    // decrement spots_remaining if available
    if (typeof opportunity.spots_remaining === 'number') {
      opportunity.spots_remaining = Math.max(0, opportunity.spots_remaining - 1);
      opportunities[oIndex] = opportunity;
      this._saveToStorage('volunteer_opportunities', opportunities);
    }

    this._saveToStorage('volunteer_signups', signups);

    return {
      success: true,
      signup,
      message: 'Volunteer signup submitted successfully.'
    };
  }

  // -------------------- Facilities & Room Booking --------------------

  getRoomFilterOptions() {
    return {
      amenities: [
        { key: 'food_allowed', label: 'Food allowed' },
        { key: 'has_projector', label: 'Projector' },
        { key: 'whiteboard', label: 'Whiteboard' },
        { key: 'sound_system', label: 'Sound system' }
      ],
      capacity_suggestions: [4, 8, 12, 20, 50],
      sort_options: [
        { value: 'room_name_asc', label: 'Room name A–Z' },
        { value: 'room_name_desc', label: 'Room name Z–A' },
        { value: 'capacity_asc', label: 'Capacity - Smallest first' }
      ]
    };
  }

  searchAvailableRooms(
    date,
    startTime,
    endTime,
    minCapacity,
    requireFoodAllowed = false,
    requireProjector = false,
    sortBy = 'room_name_asc',
    page = 1,
    pageSize = 20
  ) {
    const rooms = this._getFromStorage('rooms');
    const reservations = this._getFromStorage('room_reservations');

    const requestedStart = this._normalizeDateAndTime(date, startTime);
    const requestedEnd = this._normalizeDateAndTime(date, endTime);
    const reqStartDate = requestedStart ? new Date(requestedStart) : null;
    const reqEndDate = requestedEnd ? new Date(requestedEnd) : null;

    let results = rooms.filter(r => !!r);

    if (typeof minCapacity === 'number') {
      results = results.filter(r => typeof r.capacity === 'number' && r.capacity >= minCapacity);
    }

    if (requireFoodAllowed) {
      results = results.filter(r => !!r.food_allowed);
    }

    if (requireProjector) {
      results = results.filter(r => !!r.has_projector);
    }

    // Filter by availability against existing reservations
    if (reqStartDate && reqEndDate) {
      results = results.filter(room => {
        const roomReservations = reservations.filter(
          res => res.room_id === room.id && res.status !== 'cancelled'
        );
        for (const res of roomReservations) {
          if (!res.start_datetime || !res.end_datetime) continue;
          const existingStart = new Date(res.start_datetime);
          const existingEnd = new Date(res.end_datetime);
          // Check overlap: start < existingEnd && end > existingStart
          if (reqStartDate < existingEnd && reqEndDate > existingStart) {
            return false;
          }
        }
        return true;
      });
    }

    const sorted = results.slice();
    switch (sortBy) {
      case 'room_name_desc':
        sorted.sort((a, b) => (b.name || '').localeCompare(a.name || ''));
        break;
      case 'capacity_asc':
        sorted.sort((a, b) => (a.capacity || 0) - (b.capacity || 0));
        break;
      case 'room_name_asc':
      default:
        sorted.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        break;
    }

    const { items, total, page: p, pageSize: ps } = this._applyPagination(sorted, page, pageSize);

    const mapped = items.map(r => ({
      room_id: r.id,
      name: r.name,
      description: r.description || '',
      capacity: r.capacity,
      food_allowed: !!r.food_allowed,
      has_projector: !!r.has_projector,
      amenities: Array.isArray(r.amenities) ? r.amenities : [],
      location: r.location || ''
    }));

    return {
      requested_start_datetime: requestedStart,
      requested_end_datetime: requestedEnd,
      results: mapped,
      total,
      page: p,
      pageSize: ps
    };
  }

  getRoomDetailForReservation(roomId, date, startTime, endTime) {
    const rooms = this._getFromStorage('rooms');
    const room = rooms.find(r => r.id === roomId);
    if (!room) return null;

    const requestedStart = this._normalizeDateAndTime(date, startTime);
    const requestedEnd = this._normalizeDateAndTime(date, endTime);

    return {
      room: {
        id: room.id,
        name: room.name,
        description: room.description || '',
        capacity: room.capacity,
        food_allowed: !!room.food_allowed,
        has_projector: !!room.has_projector,
        amenities: Array.isArray(room.amenities) ? room.amenities : [],
        location: room.location || '',
        photos: Array.isArray(room.photos) ? room.photos : []
      },
      requested_start_datetime: requestedStart,
      requested_end_datetime: requestedEnd
    };
  }

  submitRoomReservation(
    roomId,
    eventName,
    contactName,
    contactEmail,
    expectedAttendees,
    date,
    startTime,
    endTime,
    notes
  ) {
    const rooms = this._getFromStorage('rooms');
    const reservations = this._getFromStorage('room_reservations');

    const room = rooms.find(r => r.id === roomId);
    if (!room) {
      return { success: false, reservation: null, message: 'Room not found.' };
    }

    const requestedStart = this._normalizeDateAndTime(date, startTime);
    const requestedEnd = this._normalizeDateAndTime(date, endTime);
    const reqStartDate = requestedStart ? new Date(requestedStart) : null;
    const reqEndDate = requestedEnd ? new Date(requestedEnd) : null;

    if (!reqStartDate || !reqEndDate || reqEndDate <= reqStartDate) {
      return { success: false, reservation: null, message: 'Invalid date or time range.' };
    }

    // Check capacity
    if (typeof room.capacity === 'number' && typeof expectedAttendees === 'number') {
      if (expectedAttendees > room.capacity) {
        return {
          success: false,
          reservation: null,
          message: 'Expected attendees exceed room capacity.'
        };
      }
    }

    // Check availability
    const conflicting = reservations.some(res => {
      if (res.room_id !== roomId || res.status === 'cancelled') return false;
      if (!res.start_datetime || !res.end_datetime) return false;
      const existingStart = new Date(res.start_datetime);
      const existingEnd = new Date(res.end_datetime);
      return reqStartDate < existingEnd && reqEndDate > existingStart;
    });

    if (conflicting) {
      return {
        success: false,
        reservation: null,
        message: 'Room is not available at the requested time.'
      };
    }

    const reservation = {
      id: this._generateId('roomres'),
      room_id: roomId,
      event_name: eventName,
      contact_name: contactName,
      contact_email: contactEmail,
      expected_attendees: expectedAttendees,
      start_datetime: requestedStart,
      end_datetime: requestedEnd,
      status: 'pending',
      created_at: this._getCurrentTimestamp(),
      notes: notes || ''
    };

    reservations.push(reservation);
    this._saveToStorage('room_reservations', reservations);

    return {
      success: true,
      reservation,
      message: 'Room reservation submitted successfully.'
    };
  }

  // -------------------- News / Blog --------------------

  getNewsFilterOptions() {
    return {
      categories: [
        { value: 'music', label: 'Music' },
        { value: 'events', label: 'Events' },
        { value: 'announcements', label: 'Announcements' },
        { value: 'sports', label: 'Sports' },
        { value: 'community', label: 'Community' },
        { value: 'other', label: 'Other' }
      ],
      date_presets: [
        { value: 'last_30_days', label: 'Last 30 days' },
        { value: 'last_6_months', label: 'Last 6 months' },
        { value: 'this_year', label: 'This year' }
      ],
      sort_options: [
        { value: 'published_at_desc', label: 'Newest first' },
        { value: 'published_at_asc', label: 'Oldest first' }
      ]
    };
  }

  searchNewsArticles(
    category,
    startDate,
    endDate,
    sortBy = 'published_at_desc',
    page = 1,
    pageSize = 20
  ) {
    const articles = this._getFromStorage('news_articles');

    let results = articles.filter(a => a && a.status === 'published');

    if (category) {
      results = results.filter(a => a.category === category);
    }

    if (startDate) {
      const start = new Date(startDate + 'T00:00:00');
      results = results.filter(a => a.published_at && new Date(a.published_at) >= start);
    }

    if (endDate) {
      const end = new Date(endDate + 'T23:59:59');
      results = results.filter(a => a.published_at && new Date(a.published_at) <= end);
    }

    const sorted = results.slice();
    switch (sortBy) {
      case 'published_at_asc':
        sorted.sort((a, b) => new Date(a.published_at || 0) - new Date(b.published_at || 0));
        break;
      case 'published_at_desc':
      default:
        sorted.sort((a, b) => new Date(b.published_at || 0) - new Date(a.published_at || 0));
        break;
    }

    const { items, total, page: p, pageSize: ps } = this._applyPagination(sorted, page, pageSize);

    const mapped = items.map(a => ({
      id: a.id,
      title: a.title,
      excerpt: a.excerpt || (a.content ? a.content.slice(0, 140) : ''),
      category: a.category,
      category_label: this._newsCategoryLabel(a.category),
      published_at: a.published_at,
      author_name: a.author_name || '',
      image_url: a.image_url || ''
    }));

    return { results: mapped, total, page: p, pageSize: ps };
  }

  getNewsArticleDetail(articleId) {
    const articles = this._getFromStorage('news_articles');
    const bookmarks = this._getFromStorage('article_bookmarks');

    const a = articles.find(ar => ar.id === articleId);
    if (!a) return null;

    const isBookmarked = bookmarks.some(b => b.article_id === articleId);

    return {
      id: a.id,
      title: a.title,
      content: a.content,
      excerpt: a.excerpt || (a.content ? a.content.slice(0, 140) : ''),
      category: a.category,
      category_label: this._newsCategoryLabel(a.category),
      published_at: a.published_at,
      author_name: a.author_name || '',
      image_url: a.image_url || '',
      is_bookmarked: isBookmarked
    };
  }

  bookmarkArticle(articleId) {
    const articles = this._getFromStorage('news_articles');
    const bookmarks = this._getFromStorage('article_bookmarks');

    const a = articles.find(ar => ar.id === articleId);
    if (!a) {
      return { success: false, bookmark: null, is_new_bookmark: false, message: 'Article not found.' };
    }

    const existing = bookmarks.find(b => b.article_id === articleId);
    if (existing) {
      return {
        success: true,
        bookmark: existing,
        is_new_bookmark: false,
        message: 'Article already bookmarked.'
      };
    }

    const bookmark = {
      id: this._generateId('articlebm'),
      article_id: articleId,
      bookmarked_at: this._getCurrentTimestamp()
    };

    bookmarks.push(bookmark);
    this._saveToStorage('article_bookmarks', bookmarks);

    return {
      success: true,
      bookmark,
      is_new_bookmark: true,
      message: 'Article bookmarked.'
    };
  }

  getBookmarkedArticles() {
    const bookmarks = this._getFromStorage('article_bookmarks');
    const articles = this._getFromStorage('news_articles');

    const items = bookmarks.map(b => {
      const article = articles.find(a => a.id === b.article_id) || null;
      const articleSummary = article
        ? {
            id: article.id,
            title: article.title,
            category: article.category,
            category_label: this._newsCategoryLabel(article.category),
            published_at: article.published_at
          }
        : null;

      return {
        bookmark_id: b.id,
        bookmarked_at: b.bookmarked_at,
        article: articleSummary
      };
    });

    // Sort by bookmarked_at descending
    items.sort((a, b) => new Date(b.bookmarked_at || 0) - new Date(a.bookmarked_at || 0));
    return items;
  }

  // -------------------- Community Forums --------------------

  getForumBoards() {
    const boards = this._getFromStorage('forum_boards');
    return boards.map(b => ({
      id: b.id,
      name: b.name,
      description: b.description || '',
      slug: b.slug
    }));
  }

  getForumBoardTopics(
    boardId,
    sortBy = 'last_activity_desc',
    page = 1,
    pageSize = 20
  ) {
    const boards = this._getFromStorage('forum_boards');
    const topics = this._getFromStorage('forum_topics');

    const board = boards.find(b => b.id === boardId);
    if (!board) {
      return {
        board: null,
        topics: [],
        total: 0,
        page: 1,
        pageSize
      };
    }

    let results = topics.filter(t => t && t.board_id === boardId);

    const sorted = results.slice();
    sorted.forEach(t => {
      if (!t.updated_at) t.updated_at = t.created_at;
      if (!t.last_activity_at) t.last_activity_at = t.updated_at || t.created_at;
    });

    switch (sortBy) {
      case 'created_at_desc':
        sorted.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
        break;
      case 'created_at_asc':
        sorted.sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0));
        break;
      case 'last_activity_desc':
      default:
        sorted.sort((a, b) => new Date(b.last_activity_at || 0) - new Date(a.last_activity_at || 0));
        break;
    }

    const { items, total, page: p, pageSize: ps } = this._applyPagination(sorted, page, pageSize);

    const mappedTopics = items.map(t => ({
      id: t.id,
      title: t.title,
      body_snippet: t.body ? t.body.slice(0, 160) : '',
      tags: Array.isArray(t.tags) ? t.tags : [],
      created_at: t.created_at,
      updated_at: t.updated_at || t.created_at,
      last_activity_at: t.last_activity_at || t.updated_at || t.created_at,
      reply_count: typeof t.reply_count === 'number' ? t.reply_count : 0
    }));

    return {
      board: {
        id: board.id,
        name: board.name,
        description: board.description || '',
        slug: board.slug
      },
      topics: mappedTopics,
      total,
      page: p,
      pageSize: ps
    };
  }

  createForumTopic(
    boardId,
    title,
    body,
    tags,
    visibility
  ) {
    const boards = this._getFromStorage('forum_boards');
    const topics = this._getFromStorage('forum_topics');

    const board = boards.find(b => b.id === boardId);
    if (!board) {
      return { success: false, topic: null, message: 'Forum board not found.' };
    }

    const allowedVis = ['public', 'private', 'anonymous'];
    const vis = allowedVis.includes(visibility) ? visibility : 'public';

    const now = this._getCurrentTimestamp();

    const topic = {
      id: this._generateId('forumtopic'),
      board_id: boardId,
      title,
      body,
      tags: Array.isArray(tags) ? tags : [],
      visibility: vis,
      created_at: now,
      updated_at: now
    };

    topics.push(topic);
    this._saveToStorage('forum_topics', topics);

    return {
      success: true,
      topic,
      message: 'Forum topic created successfully.'
    };
  }

  getForumTopicDetail(topicId) {
    const topics = this._getFromStorage('forum_topics');
    const subscriptions = this._getFromStorage('topic_subscriptions');

    const t = topics.find(tp => tp.id === topicId);
    if (!t) return null;

    const sub = subscriptions.find(s => s.topic_id === topicId);
    const isSubscribed = !!sub && sub.notification_method === 'email';

    return {
      id: t.id,
      board_id: t.board_id,
      title: t.title,
      body: t.body,
      tags: Array.isArray(t.tags) ? t.tags : [],
      visibility: t.visibility,
      created_at: t.created_at,
      updated_at: t.updated_at || t.created_at,
      is_subscribed: isSubscribed
    };
  }

  subscribeToTopic(topicId, notificationMethod) {
    const topics = this._getFromStorage('forum_topics');
    const subscriptions = this._getFromStorage('topic_subscriptions');

    const t = topics.find(tp => tp.id === topicId);
    if (!t) {
      return {
        success: false,
        is_subscribed: false,
        subscription: null,
        message: 'Topic not found.'
      };
    }

    const allowed = ['email', 'none'];
    const method = allowed.includes(notificationMethod) ? notificationMethod : 'none';

    let sub = subscriptions.find(s => s.topic_id === topicId);

    if (!sub) {
      sub = {
        id: this._generateId('topicsub'),
        topic_id: topicId,
        subscribed_at: this._getCurrentTimestamp(),
        notification_method: method
      };
      subscriptions.push(sub);
    } else {
      sub.notification_method = method;
      if (!sub.subscribed_at) {
        sub.subscribed_at = this._getCurrentTimestamp();
      }
    }

    this._saveToStorage('topic_subscriptions', subscriptions);

    const isSubscribed = method === 'email';

    return {
      success: true,
      is_subscribed: isSubscribed,
      subscription: sub,
      message: isSubscribed ? 'Subscribed to topic.' : 'Unsubscribed from topic.'
    };
  }

  // -------------------- Workshops & Classes --------------------

  getWorkshopFilterOptions() {
    const workshops = this._getFromStorage('workshops');

    let minFee = Infinity;
    let maxFee = 0;
    for (const w of workshops) {
      if (typeof w.fee === 'number') {
        if (w.fee < minFee) minFee = w.fee;
        if (w.fee > maxFee) maxFee = w.fee;
      }
    }
    if (!isFinite(minFee)) minFee = 0;
    if (!isFinite(maxFee)) maxFee = minFee + 100;

    return {
      day_of_week_presets: [
        { value: 'weekdays', label: 'Weekdays (Mon–Fri)' },
        { value: 'weekends', label: 'Weekends (Sat–Sun)' },
        { value: 'monday', label: 'Monday' },
        { value: 'tuesday', label: 'Tuesday' },
        { value: 'wednesday', label: 'Wednesday' },
        { value: 'thursday', label: 'Thursday' },
        { value: 'friday', label: 'Friday' }
      ],
      time_of_day_presets: [
        { value: 'morning', label: 'Morning' },
        { value: 'afternoon', label: 'Afternoon' },
        { value: 'evening', label: 'Evening' }
      ],
      price_range_suggestions: {
        min: minFee,
        max: maxFee,
        step: Math.max(1, Math.round((maxFee - minFee) / 10) || 5)
      },
      sort_options: [
        { value: 'rating_desc', label: 'Rating - High to Low' },
        { value: 'fee_asc', label: 'Fee - Low to High' },
        { value: 'start_datetime_asc', label: 'Date - Soonest first' }
      ]
    };
  }

  searchWorkshops(
    dayOfWeekPreset,
    startTimeAfter,
    maxFee,
    category,
    sortBy = 'rating_desc',
    page = 1,
    pageSize = 20
  ) {
    const workshops = this._getFromStorage('workshops');

    let results = workshops.filter(w => w && w.status === 'upcoming');

    if (dayOfWeekPreset) {
      results = results.filter(w => {
        if (!w.start_datetime) return false;
        const day = this._dayOfWeekFromDateString(w.start_datetime);
        if (day === null) return false;
        switch (dayOfWeekPreset) {
          case 'weekdays':
            return day >= 1 && day <= 5;
          case 'weekends':
            return day === 0 || day === 6;
          case 'monday': return day === 1;
          case 'tuesday': return day === 2;
          case 'wednesday': return day === 3;
          case 'thursday': return day === 4;
          case 'friday': return day === 5;
          case 'saturday': return day === 6;
          case 'sunday': return day === 0;
          default:
            return true;
        }
      });
    }

    if (startTimeAfter) {
      results = results.filter(w => {
        const time = this._timeHHMMFromDateString(w.start_datetime);
        if (!time) return false;
        // at or after this time
        return this._compareTimeHHMM(time, startTimeAfter) >= 0;
      });
    }

    if (typeof maxFee === 'number') {
      results = results.filter(w => typeof w.fee === 'number' && w.fee <= maxFee);
    }

    if (category) {
      results = results.filter(w => w.category === category);
    }

    const sorted = results.slice();
    switch (sortBy) {
      case 'fee_asc':
        sorted.sort((a, b) => (a.fee || 0) - (b.fee || 0));
        break;
      case 'start_datetime_asc':
        sorted.sort((a, b) => new Date(a.start_datetime || 0) - new Date(b.start_datetime || 0));
        break;
      case 'rating_desc':
      default:
        sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
    }

    const { items, total, page: p, pageSize: ps } = this._applyPagination(sorted, page, pageSize);

    const mapped = items.map(w => ({
      id: w.id,
      title: w.title,
      description_snippet: w.description ? w.description.slice(0, 160) : '',
      start_datetime: w.start_datetime,
      end_datetime: w.end_datetime,
      fee: w.fee,
      currency: w.currency,
      rating: w.rating,
      rating_count: w.rating_count,
      category: w.category || '',
      status: w.status
    }));

    return { results: mapped, total, page: p, pageSize: ps };
  }

  getWorkshopDetail(workshopId) {
    const workshops = this._getFromStorage('workshops');
    const w = workshops.find(ws => ws.id === workshopId);
    if (!w) return null;

    return {
      id: w.id,
      title: w.title,
      description: w.description || '',
      start_datetime: w.start_datetime,
      end_datetime: w.end_datetime,
      fee: w.fee,
      currency: w.currency,
      rating: w.rating,
      rating_count: w.rating_count,
      category: w.category || '',
      prerequisites: w.prerequisites || '',
      status: w.status
    };
  }

  registerForWorkshop(
    workshopId,
    attendeeName,
    attendeeEmail
  ) {
    const workshops = this._getFromStorage('workshops');
    const registrations = this._getFromStorage('workshop_registrations');

    const w = workshops.find(ws => ws.id === workshopId);
    if (!w || w.status !== 'upcoming') {
      return {
        success: false,
        registration: null,
        message: 'Workshop not found or not open for registration.'
      };
    }

    const registration = {
      id: this._generateId('workshopreg'),
      workshop_id: workshopId,
      attendee_name: attendeeName,
      attendee_email: attendeeEmail,
      status: 'submitted',
      registered_at: this._getCurrentTimestamp()
    };

    registrations.push(registration);
    this._saveToStorage('workshop_registrations', registrations);

    return {
      success: true,
      registration,
      message: 'Workshop registration submitted successfully.'
    };
  }

  // -------------------- Newsletter Preferences --------------------

  getNewsletterOptions() {
    return {
      topic_options: [
        { key: 'events_calendar', label: 'Events Calendar', description: 'Upcoming classes, workshops, and events.' },
        { key: 'volunteer_opportunities', label: 'Volunteer Opportunities', description: 'Ways to give back at the club.' },
        { key: 'family_activities', label: 'Family Activities', description: 'Kid-friendly and family-focused events.' },
        { key: 'sports_fitness', label: 'Sports & Fitness', description: 'Sports leagues, fitness classes, and more.' },
        { key: 'general_updates', label: 'General Updates', description: 'Important announcements and club news.' }
      ],
      frequency_options: [
        { value: 'instant', label: 'Instant' },
        { value: 'daily', label: 'Daily summary' },
        { value: 'weekly_digest', label: 'Weekly digest' },
        { value: 'monthly_summary', label: 'Monthly summary' }
      ],
      day_of_week_options: [
        { value: 'monday', label: 'Monday' },
        { value: 'tuesday', label: 'Tuesday' },
        { value: 'wednesday', label: 'Wednesday' },
        { value: 'thursday', label: 'Thursday' },
        { value: 'friday', label: 'Friday' },
        { value: 'saturday', label: 'Saturday' },
        { value: 'sunday', label: 'Sunday' }
      ],
      radius_options: [
        { value: 5, label: 'Within 5 miles' },
        { value: 10, label: 'Within 10 miles' },
        { value: 25, label: 'Within 25 miles' },
        { value: 50, label: 'Within 50 miles' }
      ]
    };
  }

  getNewsletterPreferences() {
    const prefsList = this._getFromStorage('newsletter_preferences');
    if (!prefsList || prefsList.length === 0) {
      return {
        email: '',
        topics: [],
        frequency: '',
        day_of_week: '',
        zip_code: '',
        radius_miles: null,
        is_active: false,
        created_at: '',
        updated_at: ''
      };
    }

    // Return the most recently updated preference
    const sorted = prefsList.slice().sort((a, b) => {
      const ad = new Date(a.updated_at || a.created_at || 0);
      const bd = new Date(b.updated_at || b.created_at || 0);
      return bd - ad;
    });

    const p = sorted[0];

    return {
      email: p.email,
      topics: Array.isArray(p.topics) ? p.topics : [],
      frequency: p.frequency,
      day_of_week: p.day_of_week || '',
      zip_code: p.zip_code || '',
      radius_miles: typeof p.radius_miles === 'number' ? p.radius_miles : null,
      is_active: !!p.is_active,
      created_at: p.created_at,
      updated_at: p.updated_at || ''
    };
  }

  saveNewsletterPreferences(
    email,
    topics,
    frequency,
    dayOfWeek,
    zipCode,
    radiusMiles,
    isActive = true
  ) {
    const prefsList = this._getFromStorage('newsletter_preferences');

    const allowedFreq = ['instant', 'daily', 'weekly_digest', 'monthly_summary'];
    const freq = allowedFreq.includes(frequency) ? frequency : 'weekly_digest';

    const allowedDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const day = dayOfWeek && allowedDays.includes(dayOfWeek) ? dayOfWeek : null;

    const now = this._getCurrentTimestamp();

    let existingIndex = prefsList.findIndex(p => p.email === email);
    let pref;

    if (existingIndex === -1) {
      pref = {
        id: this._generateId('newsletterpref'),
        email,
        topics: Array.isArray(topics) ? topics : [],
        frequency: freq,
        day_of_week: day,
        zip_code: zipCode || '',
        radius_miles: typeof radiusMiles === 'number' ? radiusMiles : null,
        is_active: !!isActive,
        created_at: now,
        updated_at: now
      };
      prefsList.push(pref);
    } else {
      pref = prefsList[existingIndex];
      pref.topics = Array.isArray(topics) ? topics : [];
      pref.frequency = freq;
      pref.day_of_week = day;
      pref.zip_code = zipCode || '';
      pref.radius_miles = typeof radiusMiles === 'number' ? radiusMiles : null;
      pref.is_active = !!isActive;
      pref.updated_at = now;
      prefsList[existingIndex] = pref;
    }

    this._saveToStorage('newsletter_preferences', prefsList);

    return {
      success: true,
      preferences: pref,
      message: 'Newsletter preferences saved.'
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
