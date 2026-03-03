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

  // ----------------------
  // Storage helpers
  // ----------------------

  _initStorage() {
    const tables = [
      'voiceover_demos',
      'favorite_voiceover_demos',
      'project_shortlists',
      'project_shortlist_items',
      'showreels',
      'casting_lists',
      'casting_list_items',
      'clients',
      'testimonials',
      'favorite_clients',
      'service_options',
      'project_plans',
      'project_plan_service_items',
      'rate_quotes',
      'quote_inquiries',
      'booking_requests',
      'newsletter_subscriptions',
      'contact_messages'
    ];

    for (let i = 0; i < tables.length; i++) {
      const key = tables[i];
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
    return data ? JSON.parse(data) : [];
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

  _findById(list, id) {
    for (let i = 0; i < list.length; i++) {
      if (list[i].id === id) return list[i];
    }
    return null;
  }

  // ----------------------
  // Internal helpers (private)
  // ----------------------

  // Favorite VO list helper
  _getOrCreateFavoriteVoiceoverList() {
    // In this simplified model, favorites are just the favorite_voiceover_demos table
    let favorites = this._getFromStorage('favorite_voiceover_demos');
    if (!Array.isArray(favorites)) {
      favorites = [];
      this._saveToStorage('favorite_voiceover_demos', favorites);
    }
    return favorites;
  }

  // Project shortlist helper
  _getOrCreateProjectShortlist() {
    let shortlists = this._getFromStorage('project_shortlists');
    if (!Array.isArray(shortlists)) {
      shortlists = [];
    }
    let shortlist = shortlists.length > 0 ? shortlists[0] : null;
    if (!shortlist) {
      shortlist = {
        id: this._generateId('shortlist'),
        name: 'Project Shortlist',
        created_at: new Date().toISOString()
      };
      shortlists.push(shortlist);
      this._saveToStorage('project_shortlists', shortlists);
    }
    return shortlist;
  }

  // Casting list helper
  _getOrCreateCastingList() {
    let lists = this._getFromStorage('casting_lists');
    if (!Array.isArray(lists)) {
      lists = [];
    }
    let castingList = lists.length > 0 ? lists[0] : null;
    if (!castingList) {
      castingList = {
        id: this._generateId('casting_list'),
        name: 'Casting List',
        created_at: new Date().toISOString()
      };
      lists.push(castingList);
      this._saveToStorage('casting_lists', lists);
    }
    return castingList;
  }

  // Duration formatting helper
  _calculateDisplayDuration(seconds) {
    if (!seconds || seconds < 0) seconds = 0;
    const total = Math.round(seconds);
    const mins = Math.floor(total / 60);
    const secs = total % 60;
    const paddedSecs = secs < 10 ? '0' + secs : String(secs);
    return mins + ':' + paddedSecs;
  }

  // Project plan total duration helper
  _calculateProjectPlanTotals(serviceItems) {
    // serviceItems: array of { service_option_id, quantity }
    const serviceOptions = this._getFromStorage('service_options');
    let total = 0;
    for (let i = 0; i < serviceItems.length; i++) {
      const item = serviceItems[i];
      const opt = this._findById(serviceOptions, item.service_option_id);
      if (!opt || !opt.is_active) continue;
      const qty = typeof item.quantity === 'number' && item.quantity > 0 ? item.quantity : 1;
      const dur = typeof opt.session_duration_hours === 'number' ? opt.session_duration_hours : 0;
      total += dur * qty;
    }
    return total;
  }

  // Rate estimate helper
  _calculateRateEstimateInternal(project_type, script_length_seconds, usage_duration, territory) {
    const length = script_length_seconds || 0;
    const units = Math.max(1, Math.ceil(length / 30));

    let basePerUnit;
    if (project_type === 'online_ad_web_commercial') {
      basePerUnit = 200;
    } else if (project_type === 'corporate_narration') {
      basePerUnit = 150;
    } else if (project_type === 'explainer_video') {
      basePerUnit = 140;
    } else if (project_type === 'character_voice') {
      basePerUnit = 180;
    } else if (project_type === 'e_learning_module') {
      basePerUnit = 130;
    } else {
      basePerUnit = 150;
    }

    let usageMult;
    if (usage_duration === '3_months') usageMult = 1.0;
    else if (usage_duration === '6_months') usageMult = 1.4;
    else if (usage_duration === '12_months') usageMult = 1.8;
    else if (usage_duration === 'in_perpetuity') usageMult = 2.5;
    else usageMult = 1.0;

    let terrMult;
    if (territory === 'online_worldwide') terrMult = 1.0;
    else if (territory === 'online_us_only') terrMult = 0.9;
    else if (territory === 'broadcast_us_national') terrMult = 2.2;
    else if (territory === 'broadcast_uk') terrMult = 1.8;
    else if (territory === 'internal_use_only') terrMult = 0.8;
    else terrMult = 1.0;

    const fee = Math.round(basePerUnit * units * usageMult * terrMult);
    return fee;
  }

  // Booking datetime validator / combiner
  _validateBookingDateTime(session_date, session_time, timezone) {
    if (!session_date || !session_time || !timezone) {
      return { valid: false, error: 'Missing date, time, or timezone.' };
    }

    // Expect session_date as 'YYYY-MM-DD'
    const dateParts = session_date.split('-');
    if (dateParts.length !== 3) {
      return { valid: false, error: 'Invalid date format.' };
    }

    let year = parseInt(dateParts[0], 10);
    let month = parseInt(dateParts[1], 10) - 1;
    let day = parseInt(dateParts[2], 10);
    if (isNaN(year) || isNaN(month) || isNaN(day)) {
      return { valid: false, error: 'Invalid date numbers.' };
    }

    // Parse time 'HH:MM' or 'HH:MM AM/PM'
    let timeStr = session_time.trim();
    let meridiem = null;
    const parts = timeStr.split(' ');
    if (parts.length === 2) {
      timeStr = parts[0];
      meridiem = parts[1].toUpperCase();
    }

    const timeParts = timeStr.split(':');
    if (timeParts.length !== 2) {
      return { valid: false, error: 'Invalid time format.' };
    }

    let hour = parseInt(timeParts[0], 10);
    let minute = parseInt(timeParts[1], 10);
    if (isNaN(hour) || isNaN(minute)) {
      return { valid: false, error: 'Invalid time numbers.' };
    }

    if (meridiem === 'AM' || meridiem === 'PM') {
      if (hour === 12) {
        hour = meridiem === 'AM' ? 0 : 12;
      } else if (meridiem === 'PM') {
        hour += 12;
      }
    }

    if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
      return { valid: false, error: 'Time out of range.' };
    }

    const dt = new Date(Date.UTC(year, month, day, hour, minute, 0));
    const iso = dt.toISOString();

    return { valid: true, session_start: iso };
  }

  // Testimonials filter helper
  _applyTestimonialsFilters(testimonials, client_type, min_year, max_year, sort_by) {
    let filtered = testimonials.slice();

    if (client_type) {
      filtered = filtered.filter(function (t) {
        return t.client && t.client.client_type === client_type;
      });
    }

    if (typeof min_year === 'number') {
      filtered = filtered.filter(function (t) {
        return typeof t.year === 'number' && t.year >= min_year;
      });
    }

    if (typeof max_year === 'number') {
      filtered = filtered.filter(function (t) {
        return typeof t.year === 'number' && t.year <= max_year;
      });
    }

    const sort = sort_by || 'date_desc';

    filtered.sort(function (a, b) {
      if (sort === 'date_asc') {
        return (a.date || '').localeCompare(b.date || '');
      }
      if (sort === 'client_name_asc') {
        const an = (a.client && a.client.company_name) || '';
        const bn = (b.client && b.client.company_name) || '';
        return an.localeCompare(bn);
      }
      // default date_desc
      return (b.date || '').localeCompare(a.date || '');
    });

    return filtered;
  }

  // ----------------------
  // Interface implementations
  // ----------------------

  // Homepage content
  getHomePageContent() {
    return {
      hero_title: 'Versatile Voice & On-Camera Performance For Your Next Project',
      hero_subtitle: 'Commercial, character, and drama-ready performance delivered from a broadcast-quality home studio.',
      key_strengths: [
        'Fast, reliable turnaround for agencies and producers',
        'Experienced in commercial VO, video games, and drama acting',
        'Broadcast-quality audio with flexible remote direction options'
      ],
      primary_call_to_actions: [
        { id: 'cta_voiceover', label: 'Explore Voiceover Demos', target_page: 'voiceover' },
        { id: 'cta_acting', label: 'View Acting Showreels', target_page: 'acting' },
        { id: 'cta_rates', label: 'Check Rates & Request A Quote', target_page: 'rates_quotes' },
        { id: 'cta_planner', label: 'Plan Your Project', target_page: 'project_planner' },
        { id: 'cta_clients', label: 'Clients & Testimonials', target_page: 'clients_testimonials' },
        { id: 'cta_contact', label: 'Contact / Booking', target_page: 'contact_booking' }
      ]
    };
  }

  // Featured voiceover demos for homepage
  getFeaturedVoiceoverDemos() {
    const demos = this._getFromStorage('voiceover_demos');
    const favorites = this._getFromStorage('favorite_voiceover_demos');
    const shortlistItems = this._getFromStorage('project_shortlist_items');

    const featured = demos.filter(function (d) {
      return d.is_featured === true && d.category === 'commercial';
    });

    return featured.slice(0, 6).map(function (d) {
      const isFavorited = favorites.some(function (f) { return f.demo_id === d.id; });
      const inShortlist = shortlistItems.some(function (s) { return s.demo_id === d.id; });
      const has10 = typeof d.review_count === 'number' && d.review_count >= 10;
      return {
        id: d.id,
        title: d.title,
        category: d.category,
        category_label: 'Commercial',
        language: d.language,
        style: d.style || null,
        style_label: d.style === 'video_game_animation' ? 'Video Game / Animation' : (d.style || ''),
        duration_seconds: d.duration_seconds,
        display_duration: this._calculateDisplayDuration(d.duration_seconds),
        audio_url: d.audio_url,
        average_rating: typeof d.average_rating === 'number' ? d.average_rating : null,
        review_count: typeof d.review_count === 'number' ? d.review_count : 0,
        has_10_plus_reviews: has10,
        is_featured: d.is_featured === true,
        is_favorited: isFavorited,
        is_in_project_shortlist: inShortlist
      };
    }, this);
  }

  // Featured drama showreels for homepage
  getFeaturedShowreels() {
    const showreels = this._getFromStorage('showreels');
    const castingItems = this._getFromStorage('casting_list_items');

    const featured = showreels.filter(function (s) {
      return s.genre === 'drama';
    });

    return featured.slice(0, 6).map(function (s) {
      const inCasting = castingItems.some(function (c) { return c.showreel_id === s.id; });
      return {
        id: s.id,
        title: s.title,
        genre: s.genre,
        genre_label: 'Drama',
        year_filmed: s.year_filmed,
        duration_seconds: s.duration_seconds,
        display_duration: this._calculateDisplayDuration(s.duration_seconds),
        video_url: s.video_url,
        thumbnail_url: s.thumbnail_url || null,
        is_in_casting_list: inCasting
      };
    }, this);
  }

  // Newsletter options
  getNewsletterPreferencesOptions() {
    return {
      interest_options: [
        { id: 'commercial_voiceover', label: 'Commercial voiceover' },
        { id: 'animation', label: 'Animation' },
        { id: 'drama_acting', label: 'Drama acting' },
        { id: 'promo_trailer', label: 'Promo & Trailer' },
        { id: 'narration', label: 'Narration & Corporate' }
      ],
      summary_frequency_options: [
        { id: 'monthly_summary', label: 'Monthly summary', description: 'A once-per-month overview of new work and availability.' },
        { id: 'weekly_digest', label: 'Weekly digest', description: 'Short weekly highlights and booking windows.' },
        { id: 'none', label: 'No regular summary', description: 'Only send critical booking or release announcements.' }
      ],
      weekly_tips_default_enabled: true,
      casting_availability_opt_in_label: 'Send me casting availability updates.'
    };
  }

  // Subscribe to newsletter
  subscribeToNewsletter(email, interests, summary_frequency, wants_weekly_tips, wants_casting_availability_updates) {
    const subs = this._getFromStorage('newsletter_subscriptions');

    if (!email || typeof email !== 'string' || !/.+@.+\..+/.test(email)) {
      return { success: false, message: 'Invalid email address.', subscription: null };
    }

    const freq = summary_frequency || 'monthly_summary';

    const sub = {
      id: this._generateId('subscription'),
      email: email,
      interests: Array.isArray(interests) ? interests.slice() : [],
      summary_frequency: freq,
      wants_weekly_tips: !!wants_weekly_tips,
      wants_casting_availability_updates: !!wants_casting_availability_updates,
      subscribed_at: new Date().toISOString()
    };

    subs.push(sub);
    this._saveToStorage('newsletter_subscriptions', subs);

    return {
      success: true,
      message: 'Subscription saved.',
      subscription: sub
    };
  }

  // Voiceover page content
  getVoiceoverPageContent() {
    return {
      overview_html: '<h1>Voiceover</h1><p>Commercial, character, narration, and more delivered from a broadcast-quality home studio.</p>',
      studio_faq_html: '<h2>Studio & FAQ</h2><p>Remote direction available via Source-Connect, Zoom, and other platforms. Turnaround typically within 24 hours for short-form projects.</p>',
      default_tab: 'demos'
    };
  }

  // Voiceover filter options
  getVoiceoverFilterOptions() {
    const demos = this._getFromStorage('voiceover_demos');
    const languagesMap = {};
    for (let i = 0; i < demos.length; i++) {
      const lang = demos[i].language;
      if (lang && !languagesMap[lang]) languagesMap[lang] = true;
    }
    const languages = Object.keys(languagesMap);

    const durationRange = { min_seconds: 0, max_seconds: 0, step_seconds: 5 };
    if (demos.length > 0) {
      let min = demos[0].duration_seconds || 0;
      let max = demos[0].duration_seconds || 0;
      for (let j = 1; j < demos.length; j++) {
        const d = demos[j].duration_seconds || 0;
        if (d < min) min = d;
        if (d > max) max = d;
      }
      durationRange.min_seconds = min;
      durationRange.max_seconds = max;
    }

    return {
      categories: [
        { id: 'commercial', label: 'Commercial' },
        { id: 'character', label: 'Character' },
        { id: 'narration', label: 'Narration' },
        { id: 'promo', label: 'Promo' },
        { id: 'trailer', label: 'Trailer' },
        { id: 'explainer', label: 'Explainer' },
        { id: 'e_learning', label: 'E-Learning' },
        { id: 'other', label: 'Other' }
      ],
      languages: languages,
      styles: [
        { id: 'video_game_animation', label: 'Video Game / Animation' },
        { id: 'conversational', label: 'Conversational' },
        { id: 'corporate', label: 'Corporate' },
        { id: 'promo_high_energy', label: 'Promo / High-Energy' },
        { id: 'narrative', label: 'Narrative' },
        { id: 'other', label: 'Other' }
      ],
      rating_thresholds: [
        { id: '4_0_up', label: '4.0 stars & up', min_value: 4.0 },
        { id: '4_5_up', label: '4.5 stars & up', min_value: 4.5 },
        { id: '5_0_only', label: '5.0 stars only', min_value: 5.0 }
      ],
      duration_range: durationRange,
      sort_options: [
        { id: 'rating_desc', label: 'Rating  High to Low', description: 'Highest rated demos first.' },
        { id: 'most_recent', label: 'Most Recent', description: 'Newest demos first.' },
        { id: 'duration_asc', label: 'Shortest First', description: 'Shorter demos first.' },
        { id: 'duration_desc', label: 'Longest First', description: 'Longer demos first.' },
        { id: 'title_asc', label: 'Title AZ', description: 'Alphabetical by title.' }
      ]
    };
  }

  // Search/filter voiceover demos
  searchVoiceoverDemos(category, languages, min_duration_seconds, max_duration_seconds, min_average_rating, style, tags, sort_by, page, page_size) {
    const all = this._getFromStorage('voiceover_demos');
    const favorites = this._getFromStorage('favorite_voiceover_demos');
    const shortlistItems = this._getFromStorage('project_shortlist_items');

    let results = all.slice();

    if (category) {
      results = results.filter(function (d) { return d.category === category; });
    }

    if (Array.isArray(languages) && languages.length > 0) {
      results = results.filter(function (d) {
        return languages.indexOf(d.language) !== -1;
      });
    }

    if (typeof min_duration_seconds === 'number') {
      results = results.filter(function (d) {
        return typeof d.duration_seconds === 'number' && d.duration_seconds >= min_duration_seconds;
      });
    }

    if (typeof max_duration_seconds === 'number') {
      results = results.filter(function (d) {
        return typeof d.duration_seconds === 'number' && d.duration_seconds <= max_duration_seconds;
      });
    }

    if (typeof min_average_rating === 'number') {
      results = results.filter(function (d) {
        return typeof d.average_rating === 'number' && d.average_rating >= min_average_rating;
      });
    }

    if (style) {
      results = results.filter(function (d) { return d.style === style; });
    }

    if (Array.isArray(tags) && tags.length > 0) {
      results = results.filter(function (d) {
        if (!Array.isArray(d.tags) || d.tags.length === 0) return false;
        for (let i = 0; i < tags.length; i++) {
          if (d.tags.indexOf(tags[i]) !== -1) return true;
        }
        return false;
      });
    }

    const sort = sort_by || 'most_recent';
    results.sort(function (a, b) {
      if (sort === 'rating_desc') {
        const ar = typeof a.average_rating === 'number' ? a.average_rating : 0;
        const br = typeof b.average_rating === 'number' ? b.average_rating : 0;
        if (br !== ar) return br - ar;
        return (b.review_count || 0) - (a.review_count || 0);
      }
      if (sort === 'duration_asc') {
        return (a.duration_seconds || 0) - (b.duration_seconds || 0);
      }
      if (sort === 'duration_desc') {
        return (b.duration_seconds || 0) - (a.duration_seconds || 0);
      }
      if (sort === 'title_asc') {
        return (a.title || '').localeCompare(b.title || '');
      }
      // most_recent by created_at desc
      return (b.created_at || '').localeCompare(a.created_at || '');
    });

    // Instrumentation for task completion tracking (task_1 and task_2)
    try {
      const params = {
        category: category,
        languages: languages,
        min_duration_seconds: min_duration_seconds,
        max_duration_seconds: max_duration_seconds,
        min_average_rating: min_average_rating,
        style: style,
        tags: tags,
        sort_by: sort_by,
        page: page,
        page_size: page_size
      };
      localStorage.setItem('task1_filterParams', JSON.stringify(params));
      localStorage.setItem('task2_filterParams', JSON.stringify(params));
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    const total = results.length;
    const pg = page && page > 0 ? page : 1;
    const size = page_size && page_size > 0 ? page_size : 20;
    const start = (pg - 1) * size;
    const end = start + size;
    const slice = results.slice(start, end);

    const demos = slice.map(function (d) {
      const isFavorited = favorites.some(function (f) { return f.demo_id === d.id; });
      const inShortlist = shortlistItems.some(function (s) { return s.demo_id === d.id; });
      const rating = typeof d.average_rating === 'number' ? d.average_rating : null;
      const rc = typeof d.review_count === 'number' ? d.review_count : 0;
      const has10 = rc >= 10;
      return {
        id: d.id,
        title: d.title,
        category: d.category,
        category_label: d.category === 'commercial' ? 'Commercial' : (d.category === 'character' ? 'Character' : d.category),
        language: d.language,
        style: d.style || null,
        style_label: d.style === 'video_game_animation' ? 'Video Game / Animation' : (d.style || ''),
        duration_seconds: d.duration_seconds,
        display_duration: this._calculateDisplayDuration(d.duration_seconds),
        audio_url: d.audio_url,
        description_snippet: d.description || '',
        average_rating: rating,
        review_count: rc,
        rating_label: rating !== null ? rating.toFixed(1) + ' / 5.0' : 'No ratings yet',
        has_10_plus_reviews: has10,
        reviews_badge_text: has10 ? '10+ reviews' : '',
        is_favorited: isFavorited,
        is_in_project_shortlist: inShortlist,
        created_at: d.created_at || null
      };
    }, this);

    return {
      total_results: total,
      page: pg,
      page_size: size,
      demos: demos
    };
  }

  // Voiceover demo detail
  getVoiceoverDemoDetail(demoId) {

    // Instrumentation for task completion tracking (task_2)
    try {
      let ids;
      const raw = localStorage.getItem('task2_comparedDemoIds');
      if (raw) {
        ids = JSON.parse(raw);
        if (!Array.isArray(ids)) ids = [];
      } else {
        ids = [];
      }
      if (ids.indexOf(demoId) === -1) {
        ids.push(demoId);
        localStorage.setItem('task2_comparedDemoIds', JSON.stringify(ids));
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    const demos = this._getFromStorage('voiceover_demos');
    const favorites = this._getFromStorage('favorite_voiceover_demos');
    const shortlistItems = this._getFromStorage('project_shortlist_items');

    const demo = this._findById(demos, demoId);
    if (!demo) {
      return null;
    }

    const isFavorited = favorites.some(function (f) { return f.demo_id === demo.id; });
    const inShortlist = shortlistItems.some(function (s) { return s.demo_id === demo.id; });

    const rating = typeof demo.average_rating === 'number' ? demo.average_rating : null;
    const rc = typeof demo.review_count === 'number' ? demo.review_count : 0;
    const has10 = rc >= 10;

    return {
      id: demo.id,
      title: demo.title,
      category: demo.category,
      category_label: demo.category === 'commercial' ? 'Commercial' : (demo.category === 'character' ? 'Character' : demo.category),
      language: demo.language,
      style: demo.style || null,
      style_label: demo.style === 'video_game_animation' ? 'Video Game / Animation' : (demo.style || ''),
      duration_seconds: demo.duration_seconds,
      display_duration: this._calculateDisplayDuration(demo.duration_seconds),
      audio_url: demo.audio_url,
      description: demo.description || '',
      tags: Array.isArray(demo.tags) ? demo.tags.slice() : [],
      average_rating: rating,
      review_count: rc,
      rating_label: rating !== null ? rating.toFixed(1) + ' / 5.0' : 'No ratings yet',
      has_10_plus_reviews: has10,
      reviews_badge_text: has10 ? '10+ reviews' : '',
      recent_reviews: [],
      is_favorited: isFavorited,
      is_in_project_shortlist: inShortlist
    };
  }

  // Add a demo to favorites
  addVoiceoverDemoToFavorites(demoId) {
    const demos = this._getFromStorage('voiceover_demos');
    const demo = this._findById(demos, demoId);
    if (!demo) {
      return { success: false, message: 'Demo not found.', is_favorited: false, favorites_total: this._getFromStorage('favorite_voiceover_demos').length };
    }

    let favorites = this._getOrCreateFavoriteVoiceoverList();
    const exists = favorites.some(function (f) { return f.demo_id === demoId; });
    if (!exists) {
      favorites.push({
        id: this._generateId('fav_demo'),
        demo_id: demoId,
        added_at: new Date().toISOString()
      });
      this._saveToStorage('favorite_voiceover_demos', favorites);
    }

    return {
      success: true,
      message: exists ? 'Demo already in favorites.' : 'Demo added to favorites.',
      is_favorited: true,
      favorites_total: favorites.length
    };
  }

  // Get favorite voiceover demos (with foreign key resolution)
  getFavoriteVoiceoverDemos() {
    const favorites = this._getFromStorage('favorite_voiceover_demos');
    const demos = this._getFromStorage('voiceover_demos');

    return favorites.map(function (f) {
      const demo = demos.find(function (d) { return d.id === f.demo_id; }) || null;
      return {
        demo_id: f.demo_id,
        title: demo ? demo.title : null,
        category: demo ? demo.category : null,
        category_label: demo ? (demo.category === 'commercial' ? 'Commercial' : (demo.category === 'character' ? 'Character' : demo.category)) : null,
        language: demo ? demo.language : null,
        duration_seconds: demo ? demo.duration_seconds : null,
        display_duration: demo ? this._calculateDisplayDuration(demo.duration_seconds) : null,
        audio_url: demo ? demo.audio_url : null,
        average_rating: demo && typeof demo.average_rating === 'number' ? demo.average_rating : null,
        review_count: demo && typeof demo.review_count === 'number' ? demo.review_count : 0,
        added_at: f.added_at,
        demo: demo
      };
    }, this);
  }

  // Add demo to project shortlist
  addDemoToProjectShortlist(demoId) {
    const demos = this._getFromStorage('voiceover_demos');
    const demo = this._findById(demos, demoId);
    if (!demo) {
      return { success: false, message: 'Demo not found.', shortlist: null };
    }

    const shortlist = this._getOrCreateProjectShortlist();
    let items = this._getFromStorage('project_shortlist_items');

    let shortlistItems = items.filter(function (it) { return it.shortlist_id === shortlist.id; });
    const exists = shortlistItems.some(function (it) { return it.demo_id === demoId; });

    if (!exists) {
      const newItem = {
        id: this._generateId('shortlist_item'),
        shortlist_id: shortlist.id,
        demo_id: demoId,
        added_at: new Date().toISOString()
      };
      items.push(newItem);
      this._saveToStorage('project_shortlist_items', items);
      shortlistItems.push(newItem);
    }

    const enrichedItems = shortlistItems.map(function (it) {
      const d = demos.find(function (dd) { return dd.id === it.demo_id; }) || null;
      return {
        demo_id: it.demo_id,
        demo_title: d ? d.title : null,
        category: d ? d.category : null,
        category_label: d ? (d.category === 'commercial' ? 'Commercial' : (d.category === 'character' ? 'Character' : d.category)) : null,
        average_rating: d && typeof d.average_rating === 'number' ? d.average_rating : null,
        duration_seconds: d ? d.duration_seconds : null,
        display_duration: d ? this._calculateDisplayDuration(d.duration_seconds) : null,
        added_at: it.added_at,
        demo: d
      };
    }, this);

    return {
      success: true,
      message: exists ? 'Demo already in shortlist.' : 'Demo added to shortlist.',
      shortlist: {
        id: shortlist.id,
        name: shortlist.name,
        created_at: shortlist.created_at,
        total_items: enrichedItems.length,
        items: enrichedItems
      }
    };
  }

  // Get current project shortlist
  getProjectShortlist() {
    const shortlists = this._getFromStorage('project_shortlists');
    if (!shortlists || shortlists.length === 0) {
      return { exists: false, shortlist: null };
    }
    const shortlist = shortlists[0];
    const items = this._getFromStorage('project_shortlist_items');
    const demos = this._getFromStorage('voiceover_demos');

    const shortlistItems = items.filter(function (it) { return it.shortlist_id === shortlist.id; });
    const enrichedItems = shortlistItems.map(function (it) {
      const d = demos.find(function (dd) { return dd.id === it.demo_id; }) || null;
      return {
        demo_id: it.demo_id,
        demo_title: d ? d.title : null,
        category: d ? d.category : null,
        category_label: d ? (d.category === 'commercial' ? 'Commercial' : (d.category === 'character' ? 'Character' : d.category)) : null,
        average_rating: d && typeof d.average_rating === 'number' ? d.average_rating : null,
        duration_seconds: d ? d.duration_seconds : null,
        display_duration: d ? this._calculateDisplayDuration(d.duration_seconds) : null,
        added_at: it.added_at,
        demo: d
      };
    }, this);

    return {
      exists: true,
      shortlist: {
        id: shortlist.id,
        name: shortlist.name,
        created_at: shortlist.created_at,
        total_items: enrichedItems.length,
        items: enrichedItems
      }
    };
  }

  // Acting page content
  getActingPageContent() {
    return {
      overview_html: '<h1>Acting</h1><p>On-camera performance for drama, comedy, and commercial projects, with self-tape and studio options.</p>',
      default_tab: 'showreels'
    };
  }

  // Acting filter options
  getActingFilterOptions() {
    const showreels = this._getFromStorage('showreels');

    const yearRange = { min_year: null, max_year: null };
    if (showreels.length > 0) {
      let min = showreels[0].year_filmed;
      let max = showreels[0].year_filmed;
      for (let i = 1; i < showreels.length; i++) {
        const y = showreels[i].year_filmed;
        if (typeof y === 'number') {
          if (y < min) min = y;
          if (y > max) max = y;
        }
      }
      yearRange.min_year = min;
      yearRange.max_year = max;
    } else {
      const currentYear = new Date().getFullYear();
      yearRange.min_year = currentYear;
      yearRange.max_year = currentYear;
    }

    const durationRange = { min_seconds: 0, max_seconds: 0, step_seconds: 5 };
    if (showreels.length > 0) {
      let minD = showreels[0].duration_seconds || 0;
      let maxD = showreels[0].duration_seconds || 0;
      for (let j = 1; j < showreels.length; j++) {
        const d = showreels[j].duration_seconds || 0;
        if (d < minD) minD = d;
        if (d > maxD) maxD = d;
      }
      durationRange.min_seconds = minD;
      durationRange.max_seconds = maxD;
    }

    return {
      genres: [
        { id: 'drama', label: 'Drama' },
        { id: 'comedy', label: 'Comedy' },
        { id: 'thriller', label: 'Thriller' },
        { id: 'commercial', label: 'Commercial' },
        { id: 'sci_fi', label: 'Sci-Fi' },
        { id: 'animation', label: 'Animation' },
        { id: 'other', label: 'Other' }
      ],
      year_range: yearRange,
      duration_range: durationRange,
      sort_options: [
        { id: 'most_recent', label: 'Most Recent First', description: 'Newest showreels first.' },
        { id: 'oldest_first', label: 'Oldest First', description: 'Oldest showreels first.' },
        { id: 'duration_asc', label: 'Shortest First', description: 'Shorter showreels first.' },
        { id: 'duration_desc', label: 'Longest First', description: 'Longer showreels first.' },
        { id: 'title_asc', label: 'Title AZ', description: 'Alphabetical by title.' }
      ]
    };
  }

  // Search/filter acting showreels
  searchShowreels(genre, min_year, max_year, min_duration_seconds, max_duration_seconds, sort_by, page, page_size) {
    const all = this._getFromStorage('showreels');
    const castingItems = this._getFromStorage('casting_list_items');

    let results = all.slice();

    if (genre) {
      results = results.filter(function (s) { return s.genre === genre; });
    }

    if (typeof min_year === 'number') {
      results = results.filter(function (s) { return typeof s.year_filmed === 'number' && s.year_filmed >= min_year; });
    }

    if (typeof max_year === 'number') {
      results = results.filter(function (s) { return typeof s.year_filmed === 'number' && s.year_filmed <= max_year; });
    }

    if (typeof min_duration_seconds === 'number') {
      results = results.filter(function (s) { return typeof s.duration_seconds === 'number' && s.duration_seconds >= min_duration_seconds; });
    }

    if (typeof max_duration_seconds === 'number') {
      results = results.filter(function (s) { return typeof s.duration_seconds === 'number' && s.duration_seconds <= max_duration_seconds; });
    }

    const sort = sort_by || 'most_recent';
    results.sort(function (a, b) {
      if (sort === 'most_recent') {
        // most_recent by year desc, then created_at desc
        if (b.year_filmed !== a.year_filmed) return (b.year_filmed || 0) - (a.year_filmed || 0);
        return (b.created_at || '').localeCompare(a.created_at || '');
      }
      if (sort === 'oldest_first') {
        if (a.year_filmed !== b.year_filmed) return (a.year_filmed || 0) - (b.year_filmed || 0);
        return (a.created_at || '').localeCompare(b.created_at || '');
      }
      if (sort === 'duration_asc') {
        return (a.duration_seconds || 0) - (b.duration_seconds || 0);
      }
      if (sort === 'duration_desc') {
        return (b.duration_seconds || 0) - (a.duration_seconds || 0);
      }
      if (sort === 'title_asc') {
        return (a.title || '').localeCompare(b.title || '');
      }
      return 0;
    });

    // Instrumentation for task completion tracking (task_3)
    try {
      const params = {
        genre: genre,
        min_year: min_year,
        max_year: max_year,
        min_duration_seconds: min_duration_seconds,
        max_duration_seconds: max_duration_seconds,
        sort_by: sort_by,
        page: page,
        page_size: page_size
      };
      localStorage.setItem('task3_filterParams', JSON.stringify(params));
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    const total = results.length;
    const pg = page && page > 0 ? page : 1;
    const size = page_size && page_size > 0 ? page_size : 20;
    const start = (pg - 1) * size;
    const end = start + size;
    const slice = results.slice(start, end);

    const showreels = slice.map(function (s) {
      const inCasting = castingItems.some(function (c) { return c.showreel_id === s.id; });
      return {
        id: s.id,
        title: s.title,
        genre: s.genre,
        genre_label: s.genre === 'drama' ? 'Drama' : s.genre,
        year_filmed: s.year_filmed,
        duration_seconds: s.duration_seconds,
        display_duration: this._calculateDisplayDuration(s.duration_seconds),
        thumbnail_url: s.thumbnail_url || null,
        video_url: s.video_url,
        description_snippet: s.description || '',
        accent: s.accent || null,
        age_range: s.age_range || null,
        notable_credits: s.notable_credits || null,
        is_in_casting_list: inCasting
      };
    }, this);

    return {
      total_results: total,
      page: pg,
      page_size: size,
      showreels: showreels
    };
  }

  // Showreel detail
  getShowreelDetail(showreelId) {
    const showreels = this._getFromStorage('showreels');
    const castingItems = this._getFromStorage('casting_list_items');

    const sr = this._findById(showreels, showreelId);
    if (!sr) return null;

    const inCasting = castingItems.some(function (c) { return c.showreel_id === sr.id; });

    return {
      id: sr.id,
      title: sr.title,
      genre: sr.genre,
      genre_label: sr.genre === 'drama' ? 'Drama' : sr.genre,
      year_filmed: sr.year_filmed,
      duration_seconds: sr.duration_seconds,
      display_duration: this._calculateDisplayDuration(sr.duration_seconds),
      video_url: sr.video_url,
      description: sr.description || '',
      accent: sr.accent || null,
      age_range: sr.age_range || null,
      notable_credits: sr.notable_credits || null,
      tags: Array.isArray(sr.tags) ? sr.tags.slice() : [],
      is_in_casting_list: inCasting
    };
  }

  // Add showreel to casting list
  addShowreelToCastingList(showreelId) {
    const showreels = this._getFromStorage('showreels');
    const sr = this._findById(showreels, showreelId);
    if (!sr) {
      return { success: false, message: 'Showreel not found.', casting_list: null };
    }

    const castingList = this._getOrCreateCastingList();
    let items = this._getFromStorage('casting_list_items');

    let listItems = items.filter(function (it) { return it.casting_list_id === castingList.id; });
    const exists = listItems.some(function (it) { return it.showreel_id === showreelId; });

    if (!exists) {
      const newItem = {
        id: this._generateId('casting_item'),
        casting_list_id: castingList.id,
        showreel_id: showreelId,
        added_at: new Date().toISOString()
      };
      items.push(newItem);
      this._saveToStorage('casting_list_items', items);
      listItems.push(newItem);
    }

    const enrichedItems = listItems.map(function (it) {
      const s = showreels.find(function (ss) { return ss.id === it.showreel_id; }) || null;
      return {
        showreel_id: it.showreel_id,
        showreel_title: s ? s.title : null,
        genre: s ? s.genre : null,
        genre_label: s ? (s.genre === 'drama' ? 'Drama' : s.genre) : null,
        year_filmed: s ? s.year_filmed : null,
        duration_seconds: s ? s.duration_seconds : null,
        display_duration: s ? this._calculateDisplayDuration(s.duration_seconds) : null,
        added_at: it.added_at,
        showreel: s
      };
    }, this);

    return {
      success: true,
      message: exists ? 'Showreel already in casting list.' : 'Showreel added to casting list.',
      casting_list: {
        id: castingList.id,
        name: castingList.name,
        created_at: castingList.created_at,
        total_items: enrichedItems.length,
        items: enrichedItems
      }
    };
  }

  // Get casting list
  getCastingList() {
    const lists = this._getFromStorage('casting_lists');
    if (!lists || lists.length === 0) {
      return { exists: false, casting_list: null };
    }
    const castingList = lists[0];
    const items = this._getFromStorage('casting_list_items');
    const showreels = this._getFromStorage('showreels');

    const listItems = items.filter(function (it) { return it.casting_list_id === castingList.id; });
    const enrichedItems = listItems.map(function (it) {
      const s = showreels.find(function (ss) { return ss.id === it.showreel_id; }) || null;
      return {
        showreel_id: it.showreel_id,
        showreel_title: s ? s.title : null,
        genre: s ? s.genre : null,
        genre_label: s ? (s.genre === 'drama' ? 'Drama' : s.genre) : null,
        year_filmed: s ? s.year_filmed : null,
        duration_seconds: s ? s.duration_seconds : null,
        display_duration: s ? this._calculateDisplayDuration(s.duration_seconds) : null,
        added_at: it.added_at,
        showreel: s
      };
    }, this);

    return {
      exists: true,
      casting_list: {
        id: castingList.id,
        name: castingList.name,
        created_at: castingList.created_at,
        total_items: enrichedItems.length,
        items: enrichedItems
      }
    };
  }

  // Rates & Quotes page content
  getRatesAndQuotesPageContent() {
    return {
      overview_html: '<h1>Rates & Quotes</h1><p>Transparent, usage-based pricing for broadcast, online, and internal projects.</p>',
      rate_guides: [
        {
          service_type: 'online_ad_web_commercial',
          label: 'Online Ad / Web Commercial',
          starting_rate: 250,
          description: 'Short-form ads for social, pre-roll, and web campaigns.'
        },
        {
          service_type: 'corporate_narration',
          label: 'Corporate Narration',
          starting_rate: 300,
          description: 'Company overview, internal, and industrial narration.'
        },
        {
          service_type: 'explainer_video',
          label: 'Explainer Video',
          starting_rate: 275,
          description: 'Animated and live-action explainer projects.'
        },
        {
          service_type: 'character_voice',
          label: 'Character Voice',
          starting_rate: 350,
          description: 'Video game, animation, and character performance.'
        }
      ],
      faqs_html: '<h2>FAQ</h2><p>Rates vary based on script length, usage duration, and territory. Use the calculator below to generate a starting estimate.</p>'
    };
  }

  // Rate calculator options
  getRateCalculatorOptions() {
    return {
      project_types: [
        { id: 'online_ad_web_commercial', label: 'Online Ad / Web Commercial', description: 'Social, web pre-roll, and digital campaigns.' },
        { id: 'corporate_narration', label: 'Corporate Narration', description: 'Internal and external corporate communications.' },
        { id: 'explainer_video', label: 'Explainer Video', description: 'Animated and live-action explainers.' },
        { id: 'character_voice', label: 'Character Voice', description: 'Video game and animation characters.' },
        { id: 'e_learning_module', label: 'E-Learning Module', description: 'Course modules and training content.' },
        { id: 'other', label: 'Other / Custom', description: 'If your project does not fit the presets.' }
      ],
      usage_durations: [
        { id: '3_months', label: '3 months', months: 3 },
        { id: '6_months', label: '6 months', months: 6 },
        { id: '12_months', label: '12 months', months: 12 },
        { id: 'in_perpetuity', label: 'In perpetuity', months: 999 }
      ],
      territories: [
        { id: 'online_worldwide', label: 'Online  Worldwide', description: 'Digital use across all territories.' },
        { id: 'online_us_only', label: 'Online  US Only', description: 'Digital use limited to the United States.' },
        { id: 'broadcast_us_national', label: 'Broadcast  US National', description: 'Television or radio broadcast across the United States.' },
        { id: 'broadcast_uk', label: 'Broadcast  UK', description: 'Television or radio broadcast in the United Kingdom.' },
        { id: 'internal_use_only', label: 'Internal Use Only', description: 'Non-public internal presentations and training.' }
      ],
      default_values: {
        project_type_id: 'online_ad_web_commercial',
        script_length_seconds: 30,
        usage_duration_id: '3_months',
        territory_id: 'online_worldwide',
        target_budget_usd: 600
      }
    };
  }

  // Calculate instant rate quote
  calculateInstantRateQuote(project_type, script_length_seconds, usage_duration, territory) {
    const estimate = this._calculateRateEstimateInternal(project_type, script_length_seconds, usage_duration, territory);

    const quotes = this._getFromStorage('rate_quotes');
    const quote = {
      id: this._generateId('rate_quote'),
      project_type: project_type,
      script_length_seconds: script_length_seconds,
      usage_duration: usage_duration,
      territory: territory,
      estimated_fee: estimate,
      created_at: new Date().toISOString()
    };
    quotes.push(quote);
    this._saveToStorage('rate_quotes', quotes);

    return { rate_quote: quote };
  }

  // Submit quote inquiry
  submitQuoteInquiry(name, email, message, project_type, script_length_seconds, usage_duration, territory, estimated_fee, budget_limit) {
    if (!name || !email || !message) {
      return { success: false, message: 'Name, email, and message are required.', inquiry_id: null };
    }

    const inquiries = this._getFromStorage('quote_inquiries');
    const inquiry = {
      id: this._generateId('quote_inquiry'),
      name: name,
      email: email,
      message: message,
      project_type: project_type,
      script_length_seconds: script_length_seconds,
      usage_duration: usage_duration,
      territory: territory,
      estimated_fee: typeof estimated_fee === 'number' ? estimated_fee : null,
      budget_limit: typeof budget_limit === 'number' ? budget_limit : null,
      created_at: new Date().toISOString()
    };

    inquiries.push(inquiry);
    this._saveToStorage('quote_inquiries', inquiries);

    return {
      success: true,
      message: 'Inquiry submitted.',
      inquiry_id: inquiry.id
    };
  }

  // Contact & Booking page content
  getContactPageContent() {
    return {
      general_contact_intro_html: '<h1>Contact</h1><p>For general questions, collaboration ideas, or press inquiries, use the contact form below.</p>',
      booking_intro_html: '<h2>Booking Requests</h2><p>For directed sessions, self-tapes, or on-site bookings, share your preferred times and connection details.</p>',
      general_contact_info: {
        email: 'hello@example-voice.com',
        phone: '+1 (555) 000-0000',
        location: 'New York, NY (America/New_York)',
        office_hours: 'MondayFriday, 9:00 AM5:00 PM (ET)'
      }
    };
  }

  // Submit booking request
  submitBookingRequest(session_type, session_length_hours, session_date, session_time, timezone, preferred_connection_methods, additional_details) {
    if (!session_type || typeof session_length_hours !== 'number') {
      return { success: false, message: 'Session type and length are required.', booking_request: null };
    }

    const validation = this._validateBookingDateTime(session_date, session_time, timezone);
    if (!validation.valid) {
      return { success: false, message: validation.error || 'Invalid date/time.', booking_request: null };
    }

    const requests = this._getFromStorage('booking_requests');

    const req = {
      id: this._generateId('booking_request'),
      session_type: session_type,
      session_length_hours: session_length_hours,
      session_start: validation.session_start,
      timezone: timezone,
      preferred_connection_methods: Array.isArray(preferred_connection_methods) ? preferred_connection_methods.slice() : [],
      additional_details: additional_details || '',
      status: 'pending',
      created_at: new Date().toISOString()
    };

    requests.push(req);
    this._saveToStorage('booking_requests', requests);

    return {
      success: true,
      message: 'Booking request submitted.',
      booking_request: req
    };
  }

  // Submit general contact message
  submitContactMessage(name, email, subject, message) {
    if (!name || !email || !message) {
      return { success: false, message: 'Name, email, and message are required.', contact_message_id: null };
    }

    const messages = this._getFromStorage('contact_messages');
    const msg = {
      id: this._generateId('contact_msg'),
      name: name,
      email: email,
      subject: subject || '',
      message: message,
      created_at: new Date().toISOString()
    };

    messages.push(msg);
    this._saveToStorage('contact_messages', messages);

    return {
      success: true,
      message: 'Message submitted.',
      contact_message_id: msg.id
    };
  }

  // Clients & Testimonials page content
  getClientsTestimonialsPageContent() {
    return {
      intro_html: '<h1>Clients & Testimonials</h1><p>Agencies, production companies, and studios that trust this voice and on-camera work.</p>',
      client_type_descriptions: [
        { client_type: 'advertising_marketing_agency', label: 'Advertising / Marketing Agency', description: 'Creative and media agencies producing campaigns across formats.' },
        { client_type: 'production_company', label: 'Production Company', description: 'Full-service production partners for film, TV, and digital.' },
        { client_type: 'game_studio', label: 'Game Studio', description: 'Video game and interactive experience developers.' },
        { client_type: 'corporate_client', label: 'Corporate Client', description: 'Brands and organizations commissioning direct work.' },
        { client_type: 'independent_film', label: 'Independent Film', description: 'Indie film and festival-focused teams.' },
        { client_type: 'individual_direct_client', label: 'Individual / Direct Client', description: 'Direct collaborations with entrepreneurs and creatives.' },
        { client_type: 'other', label: 'Other', description: 'Other collaborators and partners.' }
      ]
    };
  }

  // Testimonial filter options
  getTestimonialFilterOptions() {
    const testimonials = this._getFromStorage('testimonials');

    const yearRange = { min_year: null, max_year: null };
    if (testimonials.length > 0) {
      let min = testimonials[0].year;
      let max = testimonials[0].year;
      for (let i = 1; i < testimonials.length; i++) {
        const y = testimonials[i].year;
        if (typeof y === 'number') {
          if (y < min) min = y;
          if (y > max) max = y;
        }
      }
      yearRange.min_year = min;
      yearRange.max_year = max;
    } else {
      const currentYear = new Date().getFullYear();
      yearRange.min_year = currentYear;
      yearRange.max_year = currentYear;
    }

    return {
      client_types: [
        { id: 'advertising_marketing_agency', label: 'Advertising / Marketing Agency' },
        { id: 'production_company', label: 'Production Company' },
        { id: 'game_studio', label: 'Game Studio' },
        { id: 'corporate_client', label: 'Corporate Client' },
        { id: 'independent_film', label: 'Independent Film' },
        { id: 'individual_direct_client', label: 'Individual / Direct Client' },
        { id: 'other', label: 'Other' }
      ],
      year_range: yearRange,
      sort_options: [
        { id: 'date_desc', label: 'Most Recent First', description: 'Newest testimonials first.' },
        { id: 'date_asc', label: 'Oldest First', description: 'Oldest testimonials first.' },
        { id: 'client_name_asc', label: 'Company Name AZ', description: 'Alphabetical by company name.' }
      ]
    };
  }

  // Search/filter testimonials (with foreign key resolution)
  searchTestimonials(client_type, min_year, max_year, sort_by, page, page_size) {
    const testimonialsRaw = this._getFromStorage('testimonials');
    const clients = this._getFromStorage('clients');
    const favoriteClients = this._getFromStorage('favorite_clients');

    // Enrich with client
    const enriched = testimonialsRaw.map(function (t) {
      const client = clients.find(function (c) { return c.id === t.client_id; }) || null;
      const isFav = client ? favoriteClients.some(function (fc) { return fc.client_id === client.id; }) : false;
      return {
        testimonial_id: t.id,
        quote_short: t.quote_short,
        quote_full: t.quote_full,
        project_description: t.project_description || '',
        date: t.date,
        year: t.year,
        client_id: t.client_id,
        company_name: client ? client.company_name : null,
        client_type: client ? client.client_type : null,
        client_type_label: client ? client.client_type : null,
        contact_name: t.contact_name || null,
        contact_title: t.contact_title || null,
        is_favorite_client: isFav,
        client: client
      };
    });

    const filteredSorted = this._applyTestimonialsFilters(enriched, client_type, min_year, max_year, sort_by);

    // Instrumentation for task completion tracking (task_6 testimonials filters)
    try {
      const params = {
        client_type: client_type,
        min_year: min_year,
        max_year: max_year,
        sort_by: sort_by,
        page: page,
        page_size: page_size
      };
      localStorage.setItem('task6_filterParams', JSON.stringify(params));
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    const total = filteredSorted.length;
    const pg = page && page > 0 ? page : 1;
    const size = page_size && page_size > 0 ? page_size : 10;
    const start = (pg - 1) * size;
    const end = start + size;
    const slice = filteredSorted.slice(start, end);

    return {
      total_results: total,
      page: pg,
      page_size: size,
      testimonials: slice
    };
  }

  // Add client to favorites
  addClientToFavorites(clientId) {
    const clients = this._getFromStorage('clients');
    const client = this._findById(clients, clientId);
    if (!client) {
      return { success: false, message: 'Client not found.', favorites_total: this._getFromStorage('favorite_clients').length };
    }

    let favorites = this._getFromStorage('favorite_clients');
    const exists = favorites.some(function (f) { return f.client_id === clientId; });

    if (!exists) {
      favorites.push({
        id: this._generateId('fav_client'),
        client_id: clientId,
        added_at: new Date().toISOString()
      });
      this._saveToStorage('favorite_clients', favorites);
    }

    return {
      success: true,
      message: exists ? 'Client already in favorites.' : 'Client added to favorites.',
      favorites_total: favorites.length
    };
  }

  // Get favorite clients (with foreign key resolution)
  getFavoriteClients(sort_by) {
    const favorites = this._getFromStorage('favorite_clients');
    const clients = this._getFromStorage('clients');
    const testimonials = this._getFromStorage('testimonials');

    let list = favorites.map(function (f) {
      const client = clients.find(function (c) { return c.id === f.client_id; }) || null;

      // Find latest testimonial for this client
      const related = testimonials.filter(function (t) { return t.client_id === f.client_id; });
      let latest = null;
      for (let i = 0; i < related.length; i++) {
        const t = related[i];
        if (!latest || (t.date || '').localeCompare(latest.date || '') > 0) {
          latest = t;
        }
      }

      return {
        client_id: f.client_id,
        company_name: client ? client.company_name : null,
        client_type: client ? client.client_type : null,
        client_type_label: client ? client.client_type : null,
        added_at: f.added_at,
        latest_testimonial_quote_short: latest ? latest.quote_short : null,
        latest_testimonial_year: latest ? latest.year : null,
        client: client
      };
    });

    const sort = sort_by || 'company_name_asc';
    list.sort(function (a, b) {
      if (sort === 'company_name_desc') {
        return (b.company_name || '').localeCompare(a.company_name || '');
      }
      if (sort === 'recently_added') {
        return (b.added_at || '').localeCompare(a.added_at || '');
      }
      // company_name_asc
      return (a.company_name || '').localeCompare(b.company_name || '');
    });

    // Instrumentation for task completion tracking (task_6 favorite clients sort)
    try {
      localStorage.setItem('task6_favoriteClientsSortBy', sort);
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      sort_by: sort,
      total_results: list.length,
      clients: list
    };
  }

  // Project Planner page content
  getProjectPlannerPageContent() {
    return {
      intro_html: '<h1>Project Planner</h1><p>Combine voiceover and on-camera services into a single plan with estimated studio time.</p>',
      tips_html: '<ul><li>Keep total session time to around 3 hours for best performance.</li><li>Group similar scripts together to use studio time efficiently.</li></ul>',
      max_recommended_duration_hours: 3
    };
  }

  // Project Planner service options
  getProjectPlannerServiceOptions() {
    const options = this._getFromStorage('service_options');
    const voiceover_services = [];
    const acting_services = [];
    const other_services = [];

    for (let i = 0; i < options.length; i++) {
      const o = options[i];
      const mapped = {
        id: o.id,
        name: o.name,
        service_category: o.service_category,
        description: o.description || '',
        session_duration_hours: o.session_duration_hours,
        scenes_included: typeof o.scenes_included === 'number' ? o.scenes_included : null,
        is_active: o.is_active
      };
      if (o.service_category === 'voiceover') voiceover_services.push(mapped);
      else if (o.service_category === 'acting') acting_services.push(mapped);
      else other_services.push(mapped);
    }

    return {
      voiceover_services: voiceover_services,
      acting_services: acting_services,
      other_services: other_services
    };
  }

  // Save project plan
  saveProjectPlan(title, budget_note, notes, service_items) {
    if (!title) {
      return { success: false, message: 'Title is required.', project_plan: null, service_items: [] };
    }

    if (!Array.isArray(service_items)) {
      service_items = [];
    }

    const serviceOptions = this._getFromStorage('service_options');
    const totalDuration = this._calculateProjectPlanTotals(service_items);

    const plans = this._getFromStorage('project_plans');
    const planId = this._generateId('project_plan');
    const now = new Date().toISOString();

    const plan = {
      id: planId,
      title: title,
      budget_note: budget_note || '',
      notes: notes || '',
      total_duration_hours: totalDuration,
      created_at: now,
      updated_at: now
    };

    plans.push(plan);
    this._saveToStorage('project_plans', plans);

    const ppItems = this._getFromStorage('project_plan_service_items');
    const createdItems = [];

    for (let i = 0; i < service_items.length; i++) {
      const si = service_items[i];
      const opt = this._findById(serviceOptions, si.service_option_id);
      if (!opt || !opt.is_active) continue;
      const qty = typeof si.quantity === 'number' && si.quantity > 0 ? si.quantity : 1;
      const dur = typeof opt.session_duration_hours === 'number' ? opt.session_duration_hours : 0;
      const total = dur * qty;

      const itemId = this._generateId('project_plan_item');
      const item = {
        id: itemId,
        project_plan_id: planId,
        service_option_id: si.service_option_id,
        quantity: qty,
        session_duration_hours: dur,
        total_duration_hours: total,
        added_at: now
      };
      ppItems.push(item);
      createdItems.push({
        id: itemId,
        service_option_id: si.service_option_id,
        service_name: opt.name,
        service_category: opt.service_category,
        quantity: qty,
        session_duration_hours: dur,
        total_duration_hours: total,
        added_at: now,
        service_option: opt
      });
    }

    this._saveToStorage('project_plan_service_items', ppItems);

    const plannerContent = this.getProjectPlannerPageContent();
    const maxRecommended = typeof plannerContent.max_recommended_duration_hours === 'number' ? plannerContent.max_recommended_duration_hours : 3;

    return {
      success: true,
      message: 'Project plan saved.',
      project_plan: {
        id: plan.id,
        title: plan.title,
        budget_note: plan.budget_note,
        notes: plan.notes,
        total_duration_hours: plan.total_duration_hours,
        within_recommended_duration: plan.total_duration_hours <= maxRecommended,
        created_at: plan.created_at,
        updated_at: plan.updated_at
      },
      service_items: createdItems
    };
  }

  // About page content
  getAboutPageContent() {
    return {
      bio_html: '<h1>About</h1><p>This performer brings experience across commercial VO, video games, and drama acting, with training in both voice and on-camera work.</p>',
      studio_setup_html: '<h2>Studio</h2><p>Treated recording space, large-diaphragm condenser microphone, and broadcast-ready chain. Remote sessions available via Source-Connect and Zoom.</p>',
      faqs_html: '<h2>FAQ</h2><p>Ask about availability, usage, and turnaround times via the Contact page.</p>',
      representation_html: '<h2>Representation</h2><p>Representation details available upon request.</p>'
    };
  }

  // Privacy Policy content
  getPrivacyPolicyContent() {
    return {
      last_updated: '2024-01-01',
      content_html: '<h1>Privacy Policy</h1><p>This site stores only the minimum data required to respond to your inquiries, booking requests, and newsletter preferences.</p>'
    };
  }

  // Terms of Use content
  getTermsOfUseContent() {
    return {
      last_updated: '2024-01-01',
      content_html: '<h1>Terms of Use</h1><p>By using this site, you agree to use demo and showreel material solely for casting and evaluation purposes.</p>'
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