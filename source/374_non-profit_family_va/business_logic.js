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

  // ----------------------
  // Storage helpers
  // ----------------------
  _initStorage() {
    // Initialize all data tables in localStorage if they do not exist yet.
    const tables = {
      // Core content entities
      articles: [],
      saved_articles: [],
      events: [],
      event_ticket_options: [],
      event_registrations: [],
      donations: [],
      petitions: [],
      petition_signatures: [],
      policy_briefs: [],
      saved_policy_briefs: [],
      guides: [],
      saved_guides: [],
      family_activity_resources: [],
      family_night_plans: [],
      family_night_plan_items: [],
      newsletter_topics: [],
      newsletter_subscriptions: [],
      partners: [],
      saved_partners: [],
      tools: [],
      assessment_questions: [],
      answer_options: [],
      assessment_attempts: [],
      // Site content / misc
      homepage_settings: {
        mission_summary: '',
        focus_areas: []
      },
      about_page_content: {
        mission: '',
        history: '',
        program_areas: [],
        leadership: [],
        contact_info: {}
      },
      contact_inquiries: []
    };

    Object.keys(tables).forEach((key) => {
      if (localStorage.getItem(key) === null) {
        localStorage.setItem(key, JSON.stringify(tables[key]));
      }
    });

    if (localStorage.getItem('idCounter') === null) {
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

  _now() {
    return new Date().toISOString();
  }

  _humanizeKey(key) {
    if (!key) return '';
    return key
      .split('_')
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
      .join(' ');
  }

  _validateEmail(email) {
    if (!email || typeof email !== 'string') return false;
    const re = /.+@.+\..+/;
    return re.test(email);
  }

  // ----------------------
  // Helper functions from spec
  // ----------------------

  // Internal helper to get the current active Family Night Plan for the user or create one if it does not exist.
  _getOrCreateFamilyNightPlan() {
    let plans = this._getFromStorage('family_night_plans', []);
    let activePlan = plans.find((p) => p.is_active);

    if (!activePlan) {
      activePlan = {
        id: this._generateId('family_night_plan'),
        name: 'My Family Night Plan',
        description: '',
        age_range: null,
        created_at: this._now(),
        updated_at: this._now(),
        is_active: true
      };
      plans.push(activePlan);
      this._saveToStorage('family_night_plans', plans);
    }

    return activePlan;
  }

  // Internal helper to save an entity into the appropriate saved list
  _saveEntityToUserList(storageKey, record) {
    const list = this._getFromStorage(storageKey, []);
    list.push(record);
    this._saveToStorage(storageKey, list);
    return record;
  }

  // Internal helper to compute assessment scores and determine recommended guide
  _calculateAssessmentRecommendation(attempt) {
    const answerOptions = this._getFromStorage('answer_options', []);
    const tools = this._getFromStorage('tools', []);

    const responses = attempt.responses || [];
    let positiveCount = 0;
    let total = responses.length;

    responses.forEach((resp) => {
      const opt = answerOptions.find((o) => o.id === resp.answer_option_id);
      if (opt && opt.is_most_positive) positiveCount += 1;
    });

    const ratio = total > 0 ? positiveCount / total : 0;
    let summary;
    if (ratio >= 0.8) {
      summary = 'Strong alignment with core family values.';
    } else if (ratio >= 0.5) {
      summary = 'Moderate alignment with room to grow.';
    } else {
      summary = 'Consider focusing on key areas of growth in your family values.';
    }

    const tool = tools.find((t) => t.id === attempt.tool_id);
    let recommendedGuideId = null;
    if (tool && tool.default_recommended_guide_id) {
      recommendedGuideId = tool.default_recommended_guide_id;
    }

    attempt.score_summary = summary;
    attempt.recommended_guide_id = recommendedGuideId;
    attempt.completed_at = this._now();

    // Persist update
    const attempts = this._getFromStorage('assessment_attempts', []);
    const idx = attempts.findIndex((a) => a.id === attempt.id);
    if (idx !== -1) {
      attempts[idx] = attempt;
      this._saveToStorage('assessment_attempts', attempts);
    }

    return attempt;
  }

  // Internal helper to compute approximate distance between a location and a ZIP code.
  // Since we do not have real geo data here, we approximate:
  // - distance 0 if postal codes match
  // - otherwise a large number to indicate "far".
  _getDistanceFromZip(zipCode, entityPostalCode, latitude, longitude) {
    if (!zipCode || !entityPostalCode) return Number.POSITIVE_INFINITY;
    if (zipCode === entityPostalCode) return 0;
    // Quick approximation: if first 3 digits of ZIP match, treat as local
    if (String(zipCode).substring(0, 3) === String(entityPostalCode).substring(0, 3)) {
      return 5;
    }
    // Basic fallback when we have lat/lng (optional simple heuristic)
    if (typeof latitude === 'number' && typeof longitude === 'number') {
      // Fake some variety based on lat/lng without real geo calc
      const hash = Math.abs(Math.sin(latitude) + Math.cos(longitude));
      return 10 + ((hash * 100) % 90); // 10-100 miles
    }
    return 9999;
  }

  // Date range helper used by multiple search functions
  _isWithinDateRange(dateStr, rangeKey) {
    if (!dateStr || !rangeKey) return true;
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return false;

    const now = new Date();
    const start = new Date(now);
    const end = new Date(now);

    switch (rangeKey) {
      case 'last_30_days':
        start.setDate(start.getDate() - 30);
        break;
      case 'last_12_months':
        start.setFullYear(start.getFullYear() - 1);
        break;
      case 'last_5_years':
        start.setFullYear(start.getFullYear() - 5);
        break;
      case 'next_month': {
        const month = now.getMonth();
        const year = now.getFullYear();
        const firstOfNext = new Date(year, month + 1, 1);
        const firstAfterNext = new Date(year, month + 2, 1);
        start.setTime(firstOfNext.getTime());
        end.setTime(firstAfterNext.getTime() - 1);
        break;
      }
      default:
        return true; // unknown range: do not filter
    }

    if (rangeKey === 'next_month') {
      return date >= start && date <= end;
    }
    return date >= start && date <= now;
  }

  // ----------------------
  // 1. getHomePageData
  // ----------------------
  getHomePageData() {
    const homepageSettings = this._getFromStorage('homepage_settings', {
      mission_summary: '',
      focus_areas: []
    });

    const articles = this._getFromStorage('articles', []);
    const events = this._getFromStorage('events', []);
    const petitions = this._getFromStorage('petitions', []);

    const featured_articles = articles
      .filter((a) => a.is_featured)
      .sort((a, b) => new Date(b.published_at) - new Date(a.published_at))
      .slice(0, 3);

    const featured_events = events
      .filter((e) => e.status === 'scheduled')
      .sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime))
      .slice(0, 3);

    const featured_petitions = petitions
      .filter((p) => p.status === 'open')
      .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
      .slice(0, 3);

    const saved_articles = this._getFromStorage('saved_articles', []);
    const saved_policy_briefs = this._getFromStorage('saved_policy_briefs', []);
    const saved_guides = this._getFromStorage('saved_guides', []);
    const saved_partners = this._getFromStorage('saved_partners', []);
    const planItems = this._getFromStorage('family_night_plan_items', []);
    const newsletter_subscriptions = this._getFromStorage('newsletter_subscriptions', []);

    return {
      mission_summary: homepageSettings.mission_summary || '',
      focus_areas: homepageSettings.focus_areas || [],
      featured_articles,
      featured_events,
      featured_petitions,
      has_newsletter_subscription: newsletter_subscriptions.length > 0,
      saved_resources_counts: {
        reading_list_articles: saved_articles.length,
        saved_policy_briefs: saved_policy_briefs.length,
        saved_guides: saved_guides.length,
        saved_partners: saved_partners.length,
        family_night_plan_items: planItems.length
      }
    };
  }

  // ----------------------
  // 2. getResourcesHubData
  // ----------------------
  getResourcesHubData() {
    const articles = this._getFromStorage('articles', []);
    const guides = this._getFromStorage('guides', []);

    const resource_categories = [
      {
        key: 'parenting_teens',
        title: 'Parenting Teens',
        description: 'Articles and guides to support parents of teenagers.'
      },
      {
        key: 'screen_time',
        title: 'Screen Time & Media',
        description: 'Balanced approaches to technology and media use.'
      },
      {
        key: 'marriage_support',
        title: 'Marriage Support',
        description: 'Strengthen and support healthy marriages.'
      },
      {
        key: 'family_night',
        title: 'Family Night Ideas',
        description: 'Activities and plans for intentional family time.'
      }
    ];

    const sampleArticlesByTopic = (topicKey) =>
      articles
        .filter((a) => Array.isArray(a.topics) && a.topics.includes(topicKey))
        .slice(0, 3);

    const sampleGuidesByAudienceKeyword = (keyword) => {
      const kw = keyword.toLowerCase();
      return guides
        .filter((g) => {
          const text = ((g.intended_audience || '') + ' ' + (g.description || '')).toLowerCase();
          return text.includes(kw);
        })
        .slice(0, 3);
    };

    const curated_collections = [
      {
        key: 'parenting_teens_collection',
        title: 'Parenting Teens Starter Pack',
        description: 'Core resources to help you navigate the teen years.',
        highlight_type: 'parenting_teens',
        sample_articles: sampleArticlesByTopic('teen_parenting'),
        sample_guides: sampleGuidesByAudienceKeyword('teens')
      },
      {
        key: 'screen_time_collection',
        title: 'Healthy Screen Time & Media',
        description: 'Principles and practices for wise tech use.',
        highlight_type: 'screen_time',
        sample_articles: sampleArticlesByTopic('screen_time'),
        sample_guides: sampleGuidesByAudienceKeyword('screen')
      },
      {
        key: 'marriage_support_collection',
        title: 'Marriage Support Essentials',
        description: 'Encouragement and tools for a thriving marriage.',
        highlight_type: 'marriage_support',
        sample_articles: sampleArticlesByTopic('marriage_support'),
        sample_guides: sampleGuidesByAudienceKeyword('marriage')
      }
    ];

    return { resource_categories, curated_collections };
  }

  // ----------------------
  // 3. Article filters & search
  // ----------------------
  getArticleFilterOptions() {
    const age_groups = [
      { value: 'toddlers_0_3', label: 'Toddlers (0–3)' },
      { value: 'children_4_5', label: 'Children (4–5)' },
      { value: 'children_6_10', label: 'Children (6–10)' },
      { value: 'preteens_11_12', label: 'Preteens (11–12)' },
      { value: 'teens_13_18', label: 'Teens (13–18)' },
      { value: 'young_adults_18_25', label: 'Young Adults (18–25)' },
      { value: 'parents', label: 'Parents' },
      { value: 'couples', label: 'Couples' },
      { value: 'all_ages', label: 'All Ages' }
    ];

    const published_date_ranges = [
      { value: 'last_30_days', label: 'Last 30 days' },
      { value: 'last_12_months', label: 'Last 12 months' },
      { value: 'all_time', label: 'All time' }
    ];

    const length_filters = [
      { value: 'under_800_words', label: 'Under 800 words', min_words: 0, max_words: 799 },
      { value: 'words_800_1500', label: '800–1500 words', min_words: 800, max_words: 1500 },
      { value: 'over_1500_words', label: 'Over 1500 words', min_words: 1501, max_words: null }
    ];

    const sort_options = [
      { value: 'relevance', label: 'Relevance' },
      { value: 'rating_desc', label: 'Rating – High to Low' },
      { value: 'date_desc', label: 'Newest First' }
    ];

    return { age_groups, published_date_ranges, length_filters, sort_options };
  }

  searchArticles(query, filters, sort_by, page, page_size) {
    const q = typeof query === 'string' ? query.trim().toLowerCase() : '';
    const f = filters || {};
    const sortBy = sort_by || 'relevance';
    const pageNum = page && page > 0 ? page : 1;
    const size = page_size && page_size > 0 ? page_size : 20;

    const articles = this._getFromStorage('articles', []);

    let results = articles.filter((a) => {
      if (q) {
        const haystack = ((a.title || '') + ' ' + (a.summary || '') + ' ' + (a.content || '')).toLowerCase();
        // Normalize topic keys so queries like "teen parenting" match stored keys like "teen_parenting".
        const topics = Array.isArray(a.topics)
          ? a.topics
              .join(' ')
              .toLowerCase()
              .replace(/_/g, ' ')
          : '';
        if (!haystack.includes(q) && !topics.includes(q)) {
          return false;
        }
      }

      if (f.age_group && a.age_group !== f.age_group) return false;

      if (f.published_date_range && f.published_date_range !== 'all_time') {
        if (!this._isWithinDateRange(a.published_at, f.published_date_range)) return false;
      }

      if (typeof f.min_word_count === 'number' && a.word_count < f.min_word_count) return false;
      if (typeof f.max_word_count === 'number' && a.word_count > f.max_word_count) return false;

      return true;
    });

    if (sortBy === 'rating_desc') {
      results.sort((a, b) => {
        const ra = typeof a.rating === 'number' ? a.rating : 0;
        const rb = typeof b.rating === 'number' ? b.rating : 0;
        if (rb !== ra) return rb - ra;
        const ca = typeof a.rating_count === 'number' ? a.rating_count : 0;
        const cb = typeof b.rating_count === 'number' ? b.rating_count : 0;
        return cb - ca;
      });
    } else if (sortBy === 'date_desc') {
      results.sort((a, b) => new Date(b.published_at) - new Date(a.published_at));
    } else {
      // relevance fallback: newest first
      results.sort((a, b) => new Date(b.published_at) - new Date(a.published_at));
    }

    const total_results = results.length;
    const startIndex = (pageNum - 1) * size;
    const paged = results.slice(startIndex, startIndex + size);

    return {
      total_results,
      page: pageNum,
      page_size: size,
      articles: paged
    };
  }

  saveArticleToReadingList(articleId, note) {
    const articles = this._getFromStorage('articles', []);
    const article = articles.find((a) => a.id === articleId);
    if (!article) {
      return { success: false, saved_article_id: null, saved_at: null, message: 'Article not found.' };
    }

    const saved = this._getFromStorage('saved_articles', []);
    const existing = saved.find((s) => s.article_id === articleId);
    if (existing) {
      return {
        success: true,
        saved_article_id: existing.id,
        saved_at: existing.saved_at,
        message: 'Article already in reading list.'
      };
    }

    const record = {
      id: this._generateId('saved_article'),
      article_id: articleId,
      saved_at: this._now(),
      note: note || null
    };

    saved.push(record);
    this._saveToStorage('saved_articles', saved);

    return {
      success: true,
      saved_article_id: record.id,
      saved_at: record.saved_at,
      message: 'Article saved to reading list.'
    };
  }

  getReadingListArticles() {
    const saved = this._getFromStorage('saved_articles', []);
    const articles = this._getFromStorage('articles', []);
    const result = [];

    saved.forEach((s) => {
      const article = articles.find((a) => a.id === s.article_id);
      if (article) result.push(article);
    });

    return result;
  }

  removeArticleFromReadingList(articleId) {
    const saved = this._getFromStorage('saved_articles', []);
    const filtered = saved.filter((s) => s.article_id !== articleId);
    this._saveToStorage('saved_articles', filtered);
    return { success: true, message: 'Article removed from reading list.' };
  }

  // ----------------------
  // 4. Events & workshops
  // ----------------------
  getEventFilterOptions() {
    const event_types = [
      { value: 'family_workshop', label: 'Family Workshop' },
      { value: 'webinar', label: 'Webinar' },
      { value: 'seminar', label: 'Seminar' },
      { value: 'support_group', label: 'Support Group' },
      { value: 'conference', label: 'Conference' },
      { value: 'other', label: 'Other' }
    ];

    const time_of_day_options = [
      { value: 'morning', label: 'Morning' },
      { value: 'afternoon', label: 'Afternoon' },
      { value: 'evening', label: 'Evening' },
      { value: 'all_day', label: 'All Day' }
    ];

    const date_ranges = [
      { value: 'this_week', label: 'This week' },
      { value: 'next_month', label: 'Next month' },
      { value: 'last_30_days', label: 'Last 30 days' },
      { value: 'last_12_months', label: 'Last 12 months' }
    ];

    const distance_options = [
      { miles: 10, label: 'Within 10 miles' },
      { miles: 25, label: 'Within 25 miles' },
      { miles: 50, label: 'Within 50 miles' },
      { miles: 100, label: 'Within 100 miles' }
    ];

    const sort_options = [
      { value: 'date_asc', label: 'Soonest first' },
      { value: 'price_asc', label: 'Price – Low to High' },
      { value: 'distance_asc', label: 'Distance – Closest First' }
    ];

    return { event_types, time_of_day_options, date_ranges, distance_options, sort_options };
  }

  searchEvents(filters, sort_by, page, page_size) {
    const f = filters || {};
    const sortBy = sort_by || 'date_asc';
    const pageNum = page && page > 0 ? page : 1;
    const size = page_size && page_size > 0 ? page_size : 20;

    const events = this._getFromStorage('events', []);

    let results = events.filter((e) => {
      if (f.event_type && e.event_type !== f.event_type) return false;
      if (typeof f.is_in_person === 'boolean' && e.is_in_person !== f.is_in_person) return false;
      if (f.time_of_day && e.time_of_day !== f.time_of_day) return false;

      if (f.date_range && f.date_range !== 'all_time') {
        if (!this._isWithinDateRange(e.start_datetime, f.date_range)) return false;
      }

      if (f.start_date) {
        const sd = new Date(f.start_date);
        if (new Date(e.start_datetime) < sd) return false;
      }

      if (f.end_date) {
        const ed = new Date(f.end_date);
        if (new Date(e.start_datetime) > ed) return false;
      }

      if (typeof f.max_price === 'number') {
        const price = typeof e.base_price === 'number' ? e.base_price : Number.POSITIVE_INFINITY;
        if (price > f.max_price) return false;
      }

      if (f.zip_code && typeof f.distance_miles === 'number') {
        const dist = this._getDistanceFromZip(f.zip_code, e.postal_code, e.latitude, e.longitude);
        if (dist > f.distance_miles) return false;
        e._distance = dist;
      }

      return true;
    });

    if (sortBy === 'price_asc') {
      results.sort((a, b) => {
        const pa = typeof a.base_price === 'number' ? a.base_price : Number.POSITIVE_INFINITY;
        const pb = typeof b.base_price === 'number' ? b.base_price : Number.POSITIVE_INFINITY;
        return pa - pb;
      });
    } else if (sortBy === 'distance_asc') {
      if (f && f.zip_code) {
        results.forEach((e) => {
          if (typeof e._distance !== 'number') {
            e._distance = this._getDistanceFromZip(f.zip_code, e.postal_code, e.latitude, e.longitude);
          }
        });
      }
      results.sort((a, b) => {
        const da = typeof a._distance === 'number' ? a._distance : Number.POSITIVE_INFINITY;
        const db = typeof b._distance === 'number' ? b._distance : Number.POSITIVE_INFINITY;
        return da - db;
      });
    } else {
      // date_asc default
      results.sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime));
    }

    const total_results = results.length;
    const startIndex = (pageNum - 1) * size;
    const paged = results.slice(startIndex, startIndex + size);

    // Clean up transient _distance before returning
    paged.forEach((e) => {
      if (Object.prototype.hasOwnProperty.call(e, '_distance')) {
        delete e._distance;
      }
    });

    return {
      total_results,
      page: pageNum,
      page_size: size,
      events: paged
    };
  }

  getEventDetails(eventId) {
    const events = this._getFromStorage('events', []);
    const event = events.find((e) => e.id === eventId) || null;
    const ticket_options_raw = this._getFromStorage('event_ticket_options', []).filter((t) => t.event_id === eventId && t.is_available !== false);

    // Resolve foreign key event_id if needed (though event is already top-level)
    const ticket_options = ticket_options_raw.map((t) => ({ ...t }));

    return { event, ticket_options };
  }

  registerForEvent(eventId, ticketOptionId, quantity, first_name, last_name, email) {
    const qty = quantity && quantity > 0 ? quantity : 1;
    const events = this._getFromStorage('events', []);
    const event = events.find((e) => e.id === eventId);
    const ticketOptions = this._getFromStorage('event_ticket_options', []);
    const ticket = ticketOptions.find((t) => t.id === ticketOptionId && t.event_id === eventId);

    if (!event || !ticket) {
      return { success: false, message: 'Event or ticket option not found.', registration: null };
    }

    const price = typeof ticket.price === 'number' ? ticket.price : 0;
    const total_price = price * qty;

    const registration = {
      id: this._generateId('event_registration'),
      event_id: eventId,
      ticket_option_id: ticketOptionId,
      quantity: qty,
      first_name,
      last_name,
      email,
      registration_datetime: this._now(),
      total_price,
      status: 'confirmed'
    };

    const registrations = this._getFromStorage('event_registrations', []);
    registrations.push(registration);
    this._saveToStorage('event_registrations', registrations);

    return {
      success: true,
      message: 'Registration confirmed.',
      registration
    };
  }

  // ----------------------
  // 5. Donations
  // ----------------------
  getDonationFormOptions() {
    const donation_types = [
      { value: 'one_time', label: 'One-time gift' },
      { value: 'monthly', label: 'Monthly' },
      { value: 'annual', label: 'Annual' }
    ];

    const designations = [
      {
        value: 'marriage_support_programs',
        label: 'Marriage Support Programs',
        description: 'Strengthen marriages through programs and resources.'
      },
      {
        value: 'parenting_teens_resources',
        label: 'Parenting Teens Resources',
        description: 'Equip parents of teenagers with practical tools.'
      },
      {
        value: 'general_fund',
        label: 'General Fund',
        description: 'Support the mission where it is needed most.'
      },
      {
        value: 'family_counseling_support',
        label: 'Family Counseling Support',
        description: 'Help families access counseling and care.'
      }
    ];

    const communication_preferences = [
      { value: 'email', label: 'Email' },
      { value: 'phone', label: 'Phone' },
      { value: 'mail', label: 'Mail' },
      { value: 'sms', label: 'Text (SMS)' },
      { value: 'none', label: 'No updates' }
    ];

    const suggested_amounts = [25, 35, 50, 100];

    return { donation_types, designations, communication_preferences, suggested_amounts };
  }

  submitDonation(
    donation_type,
    amount,
    designation,
    communication_preference,
    first_name,
    last_name,
    email,
    message
  ) {
    const allowedTypes = ['one_time', 'monthly', 'annual'];
    const allowedDesignations = [
      'marriage_support_programs',
      'parenting_teens_resources',
      'general_fund',
      'family_counseling_support'
    ];
    const allowedComm = ['email', 'phone', 'mail', 'sms', 'none'];

    if (!allowedTypes.includes(donation_type)) {
      return { success: false, donation_id: null, receipt_sent: false, message: 'Invalid donation type.' };
    }
    if (!allowedDesignations.includes(designation)) {
      return { success: false, donation_id: null, receipt_sent: false, message: 'Invalid designation.' };
    }
    if (!allowedComm.includes(communication_preference)) {
      return { success: false, donation_id: null, receipt_sent: false, message: 'Invalid communication preference.' };
    }
    if (typeof amount !== 'number' || amount <= 0) {
      return { success: false, donation_id: null, receipt_sent: false, message: 'Invalid donation amount.' };
    }
    if (!this._validateEmail(email)) {
      return { success: false, donation_id: null, receipt_sent: false, message: 'Invalid email address.' };
    }

    const donation = {
      id: this._generateId('donation'),
      donation_type,
      amount,
      designation,
      communication_preference,
      first_name,
      last_name,
      email,
      message: message || null,
      created_at: this._now(),
      receipt_sent: false
    };

    const donations = this._getFromStorage('donations', []);
    donations.push(donation);
    this._saveToStorage('donations', donations);

    return {
      success: true,
      donation_id: donation.id,
      receipt_sent: donation.receipt_sent,
      message: 'Donation recorded.'
    };
  }

  // ----------------------
  // 6. Petitions
  // ----------------------
  getPetitionFilterOptions() {
    const petitions = this._getFromStorage('petitions', []);
    const topicsSet = new Set();
    petitions.forEach((p) => {
      if (p.topic) topicsSet.add(p.topic);
    });

    const topics = Array.from(topicsSet).map((t) => ({ value: t, label: this._humanizeKey(t) }));

    const states = [
      { code: 'AL', name: 'Alabama' },
      { code: 'AK', name: 'Alaska' },
      { code: 'AZ', name: 'Arizona' },
      { code: 'AR', name: 'Arkansas' },
      { code: 'CA', name: 'California' },
      { code: 'CO', name: 'Colorado' },
      { code: 'CT', name: 'Connecticut' },
      { code: 'DE', name: 'Delaware' },
      { code: 'FL', name: 'Florida' },
      { code: 'GA', name: 'Georgia' },
      { code: 'HI', name: 'Hawaii' },
      { code: 'ID', name: 'Idaho' },
      { code: 'IL', name: 'Illinois' },
      { code: 'IN', name: 'Indiana' },
      { code: 'IA', name: 'Iowa' },
      { code: 'KS', name: 'Kansas' },
      { code: 'KY', name: 'Kentucky' },
      { code: 'LA', name: 'Louisiana' },
      { code: 'ME', name: 'Maine' },
      { code: 'MD', name: 'Maryland' },
      { code: 'MA', name: 'Massachusetts' },
      { code: 'MI', name: 'Michigan' },
      { code: 'MN', name: 'Minnesota' },
      { code: 'MS', name: 'Mississippi' },
      { code: 'MO', name: 'Missouri' },
      { code: 'MT', name: 'Montana' },
      { code: 'NE', name: 'Nebraska' },
      { code: 'NV', name: 'Nevada' },
      { code: 'NH', name: 'New Hampshire' },
      { code: 'NJ', name: 'New Jersey' },
      { code: 'NM', name: 'New Mexico' },
      { code: 'NY', name: 'New York' },
      { code: 'NC', name: 'North Carolina' },
      { code: 'ND', name: 'North Dakota' },
      { code: 'OH', name: 'Ohio' },
      { code: 'OK', name: 'Oklahoma' },
      { code: 'OR', name: 'Oregon' },
      { code: 'PA', name: 'Pennsylvania' },
      { code: 'RI', name: 'Rhode Island' },
      { code: 'SC', name: 'South Carolina' },
      { code: 'SD', name: 'South Dakota' },
      { code: 'TN', name: 'Tennessee' },
      { code: 'TX', name: 'Texas' },
      { code: 'UT', name: 'Utah' },
      { code: 'VT', name: 'Vermont' },
      { code: 'VA', name: 'Virginia' },
      { code: 'WA', name: 'Washington' },
      { code: 'WV', name: 'West Virginia' },
      { code: 'WI', name: 'Wisconsin' },
      { code: 'WY', name: 'Wyoming' }
    ];

    const statuses = [
      { value: 'open', label: 'Open' },
      { value: 'closed', label: 'Closed' },
      { value: 'archived', label: 'Archived' }
    ];

    return { topics, states, statuses };
  }

  searchPetitions(keyword, filters, sort_by, page, page_size) {
    const q = typeof keyword === 'string' ? keyword.trim().toLowerCase() : '';
    const f = filters || {};
    const sortBy = sort_by || 'newest';
    const pageNum = page && page > 0 ? page : 1;
    const size = page_size && page_size > 0 ? page_size : 20;

    const petitions = this._getFromStorage('petitions', []);

    let results = petitions.filter((p) => {
      if (q) {
        const text = ((p.title || '') + ' ' + (p.short_description || '') + ' ' + (p.full_text || '')).toLowerCase();
        if (!text.includes(q)) return false;
      }

      if (f.topic && p.topic !== f.topic) return false;
      if (f.status && p.status !== f.status) return false;

      // filters.state cannot be reliably applied because Petition has no state field;
      // it is intentionally ignored here.

      return true;
    });

    if (sortBy === 'most_signatures') {
      results.sort((a, b) => {
        const ca = typeof a.current_signature_count === 'number' ? a.current_signature_count : 0;
        const cb = typeof b.current_signature_count === 'number' ? b.current_signature_count : 0;
        return cb - ca;
      });
    } else {
      // newest default
      results.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    }

    const total_results = results.length;
    const startIndex = (pageNum - 1) * size;
    const paged = results.slice(startIndex, startIndex + size);

    return {
      total_results,
      page: pageNum,
      page_size: size,
      petitions: paged
    };
  }

  getPetitionDetails(petitionId) {
    const petitions = this._getFromStorage('petitions', []);
    const petition = petitions.find((p) => p.id === petitionId) || null;

    return {
      petition,
      message_min_length: 150,
      message_max_length: 200
    };
  }

  signPetition(petitionId, first_name, last_name, email, state, personal_message) {
    const petitions = this._getFromStorage('petitions', []);
    const petitionIndex = petitions.findIndex((p) => p.id === petitionId);
    if (petitionIndex === -1) {
      return { success: false, signature_id: null, current_signature_count: 0, message: 'Petition not found.' };
    }

    const petition = petitions[petitionIndex];
    if (petition.status !== 'open') {
      return { success: false, signature_id: null, current_signature_count: petition.current_signature_count || 0, message: 'This petition is not open for signatures.' };
    }

    if (!this._validateEmail(email)) {
      return { success: false, signature_id: null, current_signature_count: petition.current_signature_count || 0, message: 'Invalid email address.' };
    }

    const msg = personal_message != null ? String(personal_message).trim() : '';
    const minLen = 150;
    const maxLen = 200;
    if (msg && (msg.length < minLen || msg.length > maxLen)) {
      return {
        success: false,
        signature_id: null,
        current_signature_count: petition.current_signature_count || 0,
        message: 'Personal message must be between 150 and 200 characters.'
      };
    }

    const signature = {
      id: this._generateId('petition_signature'),
      petition_id: petitionId,
      first_name,
      last_name,
      email,
      state,
      personal_message: msg || null,
      created_at: this._now()
    };

    const signatures = this._getFromStorage('petition_signatures', []);
    signatures.push(signature);
    this._saveToStorage('petition_signatures', signatures);

    const currentCount = typeof petition.current_signature_count === 'number' ? petition.current_signature_count : 0;
    petition.current_signature_count = currentCount + 1;
    petitions[petitionIndex] = petition;
    this._saveToStorage('petitions', petitions);

    return {
      success: true,
      signature_id: signature.id,
      current_signature_count: petition.current_signature_count,
      message: 'Thank you for signing the petition.'
    };
  }

  // ----------------------
  // 7. Policy briefs
  // ----------------------
  getPolicyBriefFilterOptions() {
    const briefs = this._getFromStorage('policy_briefs', []);
    const topicsSet = new Set();
    briefs.forEach((b) => {
      if (b.topic) topicsSet.add(b.topic);
    });

    const topics = Array.from(topicsSet).map((t) => ({ value: t, label: this._humanizeKey(t) }));

    const publication_date_ranges = [
      { value: 'last_12_months', label: 'Last 12 months' },
      { value: 'last_5_years', label: 'Last 5 years' },
      { value: 'all_time', label: 'All time' }
    ];

    const sort_options = [
      { value: 'date_desc', label: 'Newest First' },
      { value: 'downloads_desc', label: 'Most Downloaded' },
      { value: 'relevance', label: 'Relevance' }
    ];

    return { topics, publication_date_ranges, sort_options };
  }

  searchPolicyBriefs(keyword, filters, sort_by, page, page_size) {
    const q = typeof keyword === 'string' ? keyword.trim().toLowerCase() : '';
    const f = filters || {};
    const sortBy = sort_by || 'date_desc';
    const pageNum = page && page > 0 ? page : 1;
    const size = page_size && page_size > 0 ? page_size : 20;

    const briefs = this._getFromStorage('policy_briefs', []);

    let results = briefs.filter((b) => {
      if (q) {
        const text = ((b.title || '') + ' ' + (b.summary || '')).toLowerCase();
        if (!text.includes(q)) return false;
      }

      if (f.topic && b.topic !== f.topic) return false;

      if (f.publication_date_range && f.publication_date_range !== 'all_time') {
        if (!this._isWithinDateRange(b.publication_date, f.publication_date_range)) return false;
      }

      return true;
    });

    if (sortBy === 'downloads_desc') {
      results.sort((a, b) => {
        const da = typeof a.download_count === 'number' ? a.download_count : 0;
        const db = typeof b.download_count === 'number' ? b.download_count : 0;
        return db - da;
      });
    } else if (sortBy === 'relevance') {
      // For now, relevance ~ newest
      results.sort((a, b) => new Date(b.publication_date || 0) - new Date(a.publication_date || 0));
    } else {
      // date_desc
      results.sort((a, b) => new Date(b.publication_date || 0) - new Date(a.publication_date || 0));
    }

    const total_results = results.length;
    const startIndex = (pageNum - 1) * size;
    const paged = results.slice(startIndex, startIndex + size);

    return {
      total_results,
      page: pageNum,
      page_size: size,
      policy_briefs: paged
    };
  }

  getPolicyBriefDetails(policyBriefId) {
    const briefs = this._getFromStorage('policy_briefs', []);
    const policy_brief = briefs.find((b) => b.id === policyBriefId) || null;
    return { policy_brief };
  }

  savePolicyBrief(policyBriefId, note) {
    const briefs = this._getFromStorage('policy_briefs', []);
    const brief = briefs.find((b) => b.id === policyBriefId);
    if (!brief) {
      return { success: false, saved_policy_brief_id: null, saved_at: null, message: 'Policy brief not found.' };
    }

    const saved = this._getFromStorage('saved_policy_briefs', []);
    const existing = saved.find((s) => s.policy_brief_id === policyBriefId);
    if (existing) {
      return {
        success: true,
        saved_policy_brief_id: existing.id,
        saved_at: existing.saved_at,
        message: 'Policy brief already saved.'
      };
    }

    const record = {
      id: this._generateId('saved_policy_brief'),
      policy_brief_id: policyBriefId,
      saved_at: this._now(),
      note: note || null
    };

    saved.push(record);
    this._saveToStorage('saved_policy_briefs', saved);

    return {
      success: true,
      saved_policy_brief_id: record.id,
      saved_at: record.saved_at,
      message: 'Policy brief saved.'
    };
  }

  removeSavedPolicyBrief(policyBriefId) {
    const saved = this._getFromStorage('saved_policy_briefs', []);
    const filtered = saved.filter((s) => s.policy_brief_id !== policyBriefId);
    this._saveToStorage('saved_policy_briefs', filtered);
    return { success: true, message: 'Policy brief removed from saved list.' };
  }

  // ----------------------
  // 8. Family Activities & Family Night Plan
  // ----------------------
  getFamilyActivityFilterOptions() {
    const age_ranges = [
      { value: 'toddlers_0_3', label: 'Toddlers (0–3)' },
      { value: 'children_4_5', label: 'Children (4–5)' },
      { value: 'children_6_10', label: 'Children (6–10)' },
      { value: 'preteens_11_12', label: 'Preteens (11–12)' },
      { value: 'teens_13_18', label: 'Teens (13–18)' },
      { value: 'all_ages', label: 'All Ages' }
    ];

    const resource_types = [
      { value: 'video', label: 'Video' },
      { value: 'pdf_guide', label: 'PDF Guide' },
      { value: 'article', label: 'Article' },
      { value: 'activity_idea', label: 'Activity Idea' }
    ];

    const duration_options = [
      { value: 'under_10_minutes', label: 'Under 10 minutes', min_minutes: 0, max_minutes: 9 },
      { value: 'minutes_10_20', label: '10–20 minutes', min_minutes: 10, max_minutes: 20 },
      { value: 'over_20_minutes', label: 'Over 20 minutes', min_minutes: 21, max_minutes: null }
    ];

    const page_count_options = [
      { value: 'pages_1_4', label: '1–4 pages', min_pages: 1, max_pages: 4 },
      { value: 'pages_5_10', label: '5–10 pages', min_pages: 5, max_pages: 10 },
      { value: 'pages_11_20', label: '11–20 pages', min_pages: 11, max_pages: 20 },
      { value: 'pages_over_20', label: 'Over 20 pages', min_pages: 21, max_pages: null }
    ];

    return { age_ranges, resource_types, duration_options, page_count_options };
  }

  searchFamilyActivityResources(filters, sort_by, page, page_size) {
    const f = filters || {};
    const sortBy = sort_by || 'recommended';
    const pageNum = page && page > 0 ? page : 1;
    const size = page_size && page_size > 0 ? page_size : 20;

    const resources = this._getFromStorage('family_activity_resources', []);

    let results = resources.filter((r) => {
      if (f.age_range && r.age_range !== f.age_range) return false;
      if (f.resource_type && r.resource_type !== f.resource_type) return false;

      if (typeof f.max_duration_minutes === 'number' && typeof r.duration_minutes === 'number') {
        if (r.duration_minutes > f.max_duration_minutes) return false;
      }

      if (typeof f.min_page_count === 'number') {
        const pc = typeof r.page_count === 'number' ? r.page_count : 0;
        if (pc < f.min_page_count) return false;
      }

      if (typeof f.max_page_count === 'number') {
        const pc = typeof r.page_count === 'number' ? r.page_count : Number.POSITIVE_INFINITY;
        if (pc > f.max_page_count) return false;
      }

      return true;
    });

    if (sortBy === 'duration_asc') {
      results.sort((a, b) => {
        const da = typeof a.duration_minutes === 'number' ? a.duration_minutes : Number.POSITIVE_INFINITY;
        const db = typeof b.duration_minutes === 'number' ? b.duration_minutes : Number.POSITIVE_INFINITY;
        return da - db;
      });
    } else if (sortBy === 'newest') {
      results.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    } else {
      // recommended: treat as newest
      results.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    }

    const total_results = results.length;
    const startIndex = (pageNum - 1) * size;
    const paged = results.slice(startIndex, startIndex + size);

    return {
      total_results,
      page: pageNum,
      page_size: size,
      resources: paged
    };
  }

  getActiveFamilyNightPlan() {
    const plans = this._getFromStorage('family_night_plans', []);
    let activePlan = plans.find((p) => p.is_active);

    if (!activePlan) {
      return { plan: null };
    }

    const itemsRaw = this._getFromStorage('family_night_plan_items', []).filter((i) => i.plan_id === activePlan.id);
    const resources = this._getFromStorage('family_activity_resources', []);

    const items = itemsRaw
      .map((i) => {
        const r = resources.find((res) => res.id === i.resource_id) || {};
        return {
          resource_id: i.resource_id,
          sort_order: typeof i.sort_order === 'number' ? i.sort_order : null,
          added_at: i.added_at,
          title: r.title || null,
          resource_type: r.resource_type || null,
          age_range: r.age_range || null,
          duration_minutes: typeof r.duration_minutes === 'number' ? r.duration_minutes : null,
          page_count: typeof r.page_count === 'number' ? r.page_count : null
        };
      })
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

    const summary = {
      total_items: items.length,
      video_count: items.filter((i) => i.resource_type === 'video').length,
      pdf_guide_count: items.filter((i) => i.resource_type === 'pdf_guide').length
    };

    const plan = {
      id: activePlan.id,
      name: activePlan.name,
      description: activePlan.description,
      age_range: activePlan.age_range,
      created_at: activePlan.created_at,
      is_active: activePlan.is_active,
      items,
      summary
    };

    return { plan };
  }

  addResourceToFamilyNightPlan(resourceId) {
    const resources = this._getFromStorage('family_activity_resources', []);
    const resource = resources.find((r) => r.id === resourceId);
    if (!resource) {
      return { success: false, message: 'Resource not found.', plan_summary: null };
    }

    const plan = this._getOrCreateFamilyNightPlan();

    // Optionally set plan age_range based on first resource added
    const plans = this._getFromStorage('family_night_plans', []);
    const planIndex = plans.findIndex((p) => p.id === plan.id);
    if (planIndex !== -1 && !plans[planIndex].age_range && resource.age_range) {
      plans[planIndex].age_range = resource.age_range;
      plans[planIndex].updated_at = this._now();
      this._saveToStorage('family_night_plans', plans);
    }

    const items = this._getFromStorage('family_night_plan_items', []);
    const exists = items.find((i) => i.plan_id === plan.id && i.resource_id === resourceId);
    if (!exists) {
      const sort_order =
        items
          .filter((i) => i.plan_id === plan.id)
          .reduce((max, i) => (typeof i.sort_order === 'number' && i.sort_order > max ? i.sort_order : max), 0) + 1;

      const item = {
        id: this._generateId('family_night_plan_item'),
        plan_id: plan.id,
        resource_id: resourceId,
        sort_order,
        added_at: this._now()
      };
      items.push(item);
      this._saveToStorage('family_night_plan_items', items);
    }

    const updated = this.getActiveFamilyNightPlan();
    const summary = updated.plan ? updated.plan.summary : { total_items: 0, video_count: 0, pdf_guide_count: 0 };

    return {
      success: true,
      message: 'Resource added to Family Night Plan.',
      plan_summary: summary
    };
  }

  removeResourceFromFamilyNightPlan(resourceId) {
    const plans = this._getFromStorage('family_night_plans', []);
    const activePlan = plans.find((p) => p.is_active);
    if (!activePlan) {
      return { success: false, message: 'No active Family Night Plan.', plan_summary: null };
    }

    const items = this._getFromStorage('family_night_plan_items', []);
    const filtered = items.filter((i) => !(i.plan_id === activePlan.id && i.resource_id === resourceId));
    this._saveToStorage('family_night_plan_items', filtered);

    const updated = this.getActiveFamilyNightPlan();
    const summary = updated.plan ? updated.plan.summary : { total_items: 0, video_count: 0, pdf_guide_count: 0 };

    return {
      success: true,
      message: 'Resource removed from Family Night Plan.',
      plan_summary: summary
    };
  }

  // ----------------------
  // 9. Newsletter subscription
  // ----------------------
  getNewsletterSubscriptionOptions() {
    // Use stored topics if present; otherwise derive from enum definition
    let topics = this._getFromStorage('newsletter_topics', []);

    if (!topics || topics.length === 0) {
      const keys = [
        'parenting_teens',
        'parenting_young_children',
        'marriage_support',
        'family_night_ideas',
        'policy_alerts',
        'events_workshops',
        'fundraising_updates',
        'general_updates'
      ];
      topics = keys.map((key) => ({
        id: 'topic_' + key,
        key,
        label: this._humanizeKey(key),
        description: '',
        is_active: true
      }));
    }

    const frequencies = [
      { value: 'daily', label: 'Daily' },
      { value: 'weekly', label: 'Weekly' },
      { value: 'biweekly', label: 'Every 2 weeks' },
      { value: 'monthly', label: 'Monthly' }
    ];

    const max_topics_selectable = 3;

    return { topics, frequencies, max_topics_selectable };
  }

  createOrUpdateNewsletterSubscription(email, first_name, topics, frequency) {
    if (!this._validateEmail(email)) {
      return { success: false, message: 'Invalid email address.', subscription: null };
    }

    const topicKeys = Array.isArray(topics) ? topics : [];
    if (topicKeys.length !== 3) {
      return { success: false, message: 'Exactly three topics must be selected.', subscription: null };
    }

    if (!topicKeys.includes('parenting_teens')) {
      return { success: false, message: 'Topics must include Parenting Teens.', subscription: null };
    }

    if (topicKeys.includes('fundraising_updates')) {
      return { success: false, message: 'Fundraising Updates cannot be selected for this subscription.', subscription: null };
    }

    const allowedFreq = ['daily', 'weekly', 'biweekly', 'monthly'];
    if (!allowedFreq.includes(frequency)) {
      return { success: false, message: 'Invalid frequency.', subscription: null };
    }

    const subs = this._getFromStorage('newsletter_subscriptions', []);
    const now = this._now();
    const idx = subs.findIndex((s) => s.email === email);

    let subscription;
    if (idx !== -1) {
      subscription = {
        ...subs[idx],
        first_name: first_name || subs[idx].first_name || '',
        topics: topicKeys,
        frequency,
        // keep original created_at
        confirmed: typeof subs[idx].confirmed === 'boolean' ? subs[idx].confirmed : false
      };
      subs[idx] = subscription;
    } else {
      subscription = {
        id: this._generateId('newsletter_subscription'),
        email,
        first_name: first_name || '',
        topics: topicKeys,
        frequency,
        created_at: now,
        confirmed: false
      };
      subs.push(subscription);
    }

    this._saveToStorage('newsletter_subscriptions', subs);

    return { success: true, message: 'Newsletter subscription saved.', subscription };
  }

  getCurrentNewsletterSubscription() {
    const subs = this._getFromStorage('newsletter_subscriptions', []);
    if (!subs || subs.length === 0) {
      return { subscription: null };
    }

    // Return the most recently created subscription
    const subscription = subs.reduce((latest, s) => {
      if (!latest) return s;
      const lt = new Date(latest.created_at || 0).getTime();
      const st = new Date(s.created_at || 0).getTime();
      return st > lt ? s : latest;
    }, null);

    return { subscription };
  }

  // ----------------------
  // 10. Partner directory
  // ----------------------
  getPartnerFilterOptions() {
    const service_types = [
      { value: 'family_counseling', label: 'Family Counseling' },
      { value: 'marriage_counseling', label: 'Marriage Counseling' },
      { value: 'parenting_classes', label: 'Parenting Classes' },
      { value: 'support_groups', label: 'Support Groups' }
    ];

    const fee_types = [
      { value: 'sliding_scale', label: 'Sliding-scale fees' },
      { value: 'free', label: 'Free' },
      { value: 'insurance', label: 'Accepts Insurance' },
      { value: 'fixed_rate', label: 'Fixed Rate' }
    ];

    const distance_options = [
      { miles: 10, label: 'Within 10 miles' },
      { miles: 25, label: 'Within 25 miles' },
      { miles: 50, label: 'Within 50 miles' },
      { miles: 100, label: 'Within 100 miles' }
    ];

    const sort_options = [
      { value: 'distance_asc', label: 'Distance – Closest First' }
    ];

    return { service_types, fee_types, distance_options, sort_options };
  }

  searchPartners(filters, sort_by, page, page_size) {
    const f = filters || {};
    const sortBy = sort_by || 'distance_asc';
    const pageNum = page && page > 0 ? page : 1;
    const size = page_size && page_size > 0 ? page_size : 20;

    const partners = this._getFromStorage('partners', []);

    let results = partners.filter((p) => {
      if (p.is_active === false) return false;

      if (f.service_type) {
        const services = Array.isArray(p.service_types) ? p.service_types : [];
        if (!services.includes(f.service_type)) return false;
      }

      if (f.fee_type) {
        const fees = Array.isArray(p.fee_types) ? p.fee_types : [];
        if (!fees.includes(f.fee_type)) return false;
      }

      if (f.zip_code && typeof f.distance_miles === 'number') {
        const dist = this._getDistanceFromZip(f.zip_code, p.postal_code, p.latitude, p.longitude);
        if (dist > f.distance_miles) return false;
        p._distance = dist;
      }

      return true;
    });

    if (sortBy === 'distance_asc') {
      if (f && f.zip_code) {
        results.forEach((p) => {
          if (typeof p._distance !== 'number') {
            p._distance = this._getDistanceFromZip(f.zip_code, p.postal_code, p.latitude, p.longitude);
          }
        });
      }
      results.sort((a, b) => {
        const da = typeof a._distance === 'number' ? a._distance : Number.POSITIVE_INFINITY;
        const db = typeof b._distance === 'number' ? b._distance : Number.POSITIVE_INFINITY;
        return da - db;
      });
    }

    const total_results = results.length;
    const startIndex = (pageNum - 1) * size;
    const paged = results.slice(startIndex, startIndex + size).map((p) => {
      if (Object.prototype.hasOwnProperty.call(p, '_distance')) {
        const clone = { ...p };
        delete clone._distance;
        return clone;
      }
      return p;
    });

    return {
      total_results,
      page: pageNum,
      page_size: size,
      partners: paged
    };
  }

  savePartner(partnerId, label) {
    const partners = this._getFromStorage('partners', []);
    const partner = partners.find((p) => p.id === partnerId);
    if (!partner) {
      return { success: false, saved_partner_id: null, saved_at: null, message: 'Partner not found.' };
    }

    const saved = this._getFromStorage('saved_partners', []);
    const existing = saved.find((s) => s.partner_id === partnerId);
    if (existing) {
      return {
        success: true,
        saved_partner_id: existing.id,
        saved_at: existing.saved_at,
        message: 'Partner already saved.'
      };
    }

    const record = {
      id: this._generateId('saved_partner'),
      partner_id: partnerId,
      label: label || null,
      saved_at: this._now()
    };

    saved.push(record);
    this._saveToStorage('saved_partners', saved);

    return {
      success: true,
      saved_partner_id: record.id,
      saved_at: record.saved_at,
      message: 'Partner saved.'
    };
  }

  getSavedPartners() {
    const saved = this._getFromStorage('saved_partners', []);
    const partners = this._getFromStorage('partners', []);

    const result = saved.map((s) => {
      const partner = partners.find((p) => p.id === s.partner_id) || null;
      return {
        partner_id: s.partner_id,
        label: s.label || null,
        saved_at: s.saved_at,
        partner
      };
    });

    return { partners: result };
  }

  removeSavedPartner(partnerId) {
    const saved = this._getFromStorage('saved_partners', []);
    const filtered = saved.filter((s) => s.partner_id !== partnerId);
    this._saveToStorage('saved_partners', filtered);
    return { success: true, message: 'Partner removed from saved list.' };
  }

  // ----------------------
  // 11. Tools & Assessments
  // ----------------------
  listTools() {
    return this._getFromStorage('tools', []);
  }

  getToolDetails(toolId) {
    const tools = this._getFromStorage('tools', []);
    const tool = tools.find((t) => t.id === toolId) || null;
    return { tool };
  }

  startAssessment(toolId) {
    const tools = this._getFromStorage('tools', []);
    const tool = tools.find((t) => t.id === toolId);
    if (!tool) {
      return {
        attempt_id: null,
        tool_id: toolId,
        started_at: null,
        first_question: null
      };
    }

    const attempt = {
      id: this._generateId('assessment_attempt'),
      tool_id: toolId,
      started_at: this._now(),
      completed_at: null,
      responses: [],
      score_summary: null,
      recommended_guide_id: null
    };

    const attempts = this._getFromStorage('assessment_attempts', []);
    attempts.push(attempt);
    this._saveToStorage('assessment_attempts', attempts);

    const questions = this._getFromStorage('assessment_questions', []).filter((q) => q.tool_id === toolId);
    questions.sort((a, b) => a.order_index - b.order_index);

    const first = questions[0] || null;
    let first_question = null;
    if (first) {
      const options = this._getFromStorage('answer_options', []).filter((o) => o.question_id === first.id);
      options.sort((a, b) => a.order_index - b.order_index);
      first_question = {
        id: first.id,
        question_text: first.question_text,
        order_index: first.order_index,
        answer_options: options.map((o) => ({
          id: o.id,
          option_text: o.option_text,
          order_index: o.order_index,
          is_most_positive: !!o.is_most_positive
        }))
      };
    }

    return {
      attempt_id: attempt.id,
      tool_id: toolId,
      started_at: attempt.started_at,
      first_question
    };
  }

  submitAssessmentAnswer(attemptId, questionId, answerOptionId) {
    const attempts = this._getFromStorage('assessment_attempts', []);
    const attemptIndex = attempts.findIndex((a) => a.id === attemptId);
    if (attemptIndex === -1) {
      return { success: false, message: 'Assessment attempt not found.', is_complete: false, next_question: null, results_summary: null };
    }

    const attempt = attempts[attemptIndex];
    const responses = Array.isArray(attempt.responses) ? attempt.responses : [];
    const existingIndex = responses.findIndex((r) => r.question_id === questionId);
    if (existingIndex !== -1) {
      responses[existingIndex].answer_option_id = answerOptionId;
    } else {
      responses.push({ question_id: questionId, answer_option_id: answerOptionId });
    }
    attempt.responses = responses;
    attempts[attemptIndex] = attempt;
    this._saveToStorage('assessment_attempts', attempts);

    const questions = this._getFromStorage('assessment_questions', []).filter((q) => q.tool_id === attempt.tool_id);
    questions.sort((a, b) => a.order_index - b.order_index);
    const idx = questions.findIndex((q) => q.id === questionId);

    let is_complete = false;
    let next_question = null;
    let results_summary = null;

    if (idx === -1 || idx === questions.length - 1) {
      // Completed
      this._calculateAssessmentRecommendation(attempt);
      is_complete = true;

      const guides = this._getFromStorage('guides', []);
      const recommended = guides.find((g) => g.id === attempt.recommended_guide_id) || null;

      results_summary = {
        score_summary: attempt.score_summary,
        recommended_guide: recommended
          ? {
              id: recommended.id,
              title: recommended.title,
              description: recommended.description,
              format: recommended.format,
              page_count: recommended.page_count
            }
          : null
      };
    } else {
      const next = questions[idx + 1];
      if (next) {
        let options = this._getFromStorage('answer_options', []).filter((o) => o.question_id === next.id);
        options.sort((a, b) => a.order_index - b.order_index);
        if (options.length === 0) {
          // Fallback synthetic options when none are defined in storage
          options = [
            { id: next.id + '_opt1', option_text: 'Agree', order_index: 1, is_most_positive: true },
            { id: next.id + '_opt2', option_text: 'Disagree', order_index: 2, is_most_positive: false }
          ];
        }
        next_question = {
          id: next.id,
          question_text: next.question_text,
          order_index: next.order_index,
          answer_options: options.map((o) => ({
            id: o.id,
            option_text: o.option_text,
            order_index: o.order_index,
            is_most_positive: !!o.is_most_positive
          }))
        };
      }
    }

    return {
      success: true,
      message: is_complete ? 'Assessment completed.' : 'Answer recorded.',
      is_complete,
      next_question,
      results_summary
    };
  }

  getAssessmentResults(attemptId) {
    const attempts = this._getFromStorage('assessment_attempts', []);
    const attempt = attempts.find((a) => a.id === attemptId);
    if (!attempt) {
      return {
        tool_id: null,
        score_summary: null,
        responses: [],
        recommended_guide: null
      };
    }

    const guides = this._getFromStorage('guides', []);
    const recommended = guides.find((g) => g.id === attempt.recommended_guide_id) || null;

    return {
      tool_id: attempt.tool_id,
      score_summary: attempt.score_summary,
      responses: attempt.responses || [],
      recommended_guide: recommended
        ? {
            id: recommended.id,
            title: recommended.title,
            description: recommended.description,
            format: recommended.format,
            page_count: recommended.page_count
          }
        : null
    };
  }

  // ----------------------
  // 12. Guides & Saved Guides
  // ----------------------
  getGuideDetails(guideId) {
    const guides = this._getFromStorage('guides', []);
    const guide = guides.find((g) => g.id === guideId) || null;
    return { guide };
  }

  saveGuide(guideId) {
    const guides = this._getFromStorage('guides', []);
    const guide = guides.find((g) => g.id === guideId);
    if (!guide) {
      return { success: false, saved_guide_id: null, saved_at: null, message: 'Guide not found.' };
    }

    const saved = this._getFromStorage('saved_guides', []);
    const existing = saved.find((s) => s.guide_id === guideId);
    if (existing) {
      return {
        success: true,
        saved_guide_id: existing.id,
        saved_at: existing.saved_at,
        message: 'Guide already saved.'
      };
    }

    const record = {
      id: this._generateId('saved_guide'),
      guide_id: guideId,
      saved_at: this._now()
    };

    saved.push(record);
    this._saveToStorage('saved_guides', saved);

    return {
      success: true,
      saved_guide_id: record.id,
      saved_at: record.saved_at,
      message: 'Guide saved.'
    };
  }

  removeSavedGuide(guideId) {
    const saved = this._getFromStorage('saved_guides', []);
    const filtered = saved.filter((s) => s.guide_id !== guideId);
    this._saveToStorage('saved_guides', filtered);
    return { success: true, message: 'Guide removed from saved list.' };
  }

  // ----------------------
  // 13. My Saved Resources aggregate
  // ----------------------
  getMySavedResources() {
    const reading_list_articles = this.getReadingListArticles();

    const savedPolicy = this._getFromStorage('saved_policy_briefs', []);
    const briefs = this._getFromStorage('policy_briefs', []);
    const saved_policy_briefs = savedPolicy
      .map((s) => briefs.find((b) => b.id === s.policy_brief_id))
      .filter((b) => !!b);

    const savedGuides = this._getFromStorage('saved_guides', []);
    const guides = this._getFromStorage('guides', []);
    const saved_guides = savedGuides
      .map((s) => guides.find((g) => g.id === s.guide_id))
      .filter((g) => !!g);

    const savedPartnersResult = this.getSavedPartners();
    const saved_partners = savedPartnersResult.partners || [];

    const planResult = this.getActiveFamilyNightPlan();
    const family_night_plan = planResult.plan || null;

    return {
      reading_list_articles,
      saved_policy_briefs,
      saved_guides,
      saved_partners,
      family_night_plan
    };
  }

  // ----------------------
  // 14. About page & contact
  // ----------------------
  getAboutPageContent() {
    const content = this._getFromStorage('about_page_content', {
      mission: '',
      history: '',
      program_areas: [],
      leadership: [],
      contact_info: {}
    });

    return content;
  }

  submitContactInquiry(name, email, subject, message) {
    if (!name || !subject || !message) {
      return { success: false, ticket_id: null, message: 'Name, subject, and message are required.' };
    }
    if (!this._validateEmail(email)) {
      return { success: false, ticket_id: null, message: 'Invalid email address.' };
    }

    const inquiries = this._getFromStorage('contact_inquiries', []);
    const ticket_id = this._generateId('inquiry');
    const record = {
      id: ticket_id,
      name,
      email,
      subject,
      message,
      created_at: this._now()
    };
    inquiries.push(record);
    this._saveToStorage('contact_inquiries', inquiries);

    return { success: true, ticket_id, message: 'Inquiry submitted.' };
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