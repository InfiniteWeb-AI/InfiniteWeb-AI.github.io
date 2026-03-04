/* eslint-disable no-var */
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
    this.defaultCurrency = 'USD';
    this._initStorage();
    this.idCounter = this._getNextIdCounter();
  }

  // ---------------------- Storage helpers ----------------------

  _initStorage() {
    const keysWithArrayDefault = [
      'programs',
      'learning_plan_items',
      'case_studies',
      'favorite_case_studies',
      'custom_program_quote_requests',
      'addon_options',
      'team_package_configs',
      'consultation_requests',
      'coaches',
      'intro_call_requests',
      'webinar_registrations',
      'newsletter_subscriptions',
      'legal_documents',
      'notifications'
    ];

    keysWithArrayDefault.forEach((key) => {
      if (!localStorage.getItem(key)) {
        if (key === 'programs') {
          const now = new Date();
          const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
          const defaultPrograms = [
            {
              id: 'prog_course_self_paced_1',
              title: 'Self-Paced Leadership Essentials',
              subtitle: 'Core leadership tools in a flexible self-paced format',
              description:
                'A short self-paced leadership course covering foundations of coaching and communication.',
              category_id: 'courses',
              delivery_format: 'self_paced',
              topic_tags: ['leadership', 'coaching_skills'],
              audience_level: 'emerging_leaders',
              keywords: ['self-paced leadership course', 'leadership'],
              duration_days: null,
              duration_hours: 8,
              total_hours: 8,
              price_type: 'per_person',
              price_per_person: 299,
              list_price_per_person: 399,
              currency: this.defaultCurrency,
              is_free: false,
              rating: 4.5,
              rating_count: 25,
              num_modules: 4,
              modules: [],
              is_active: true,
              created_at: now.toISOString()
            },
            {
              id: 'prog_course_online_ondemand_1',
              title: 'On-Demand Leadership Micro-Course',
              subtitle: 'Bite-sized lessons for busy leaders',
              description:
                'An on-demand online leadership course focused on practical coaching conversations.',
              category_id: 'courses',
              delivery_format: 'online_on_demand',
              topic_tags: ['leadership', 'coaching'],
              audience_level: 'all_levels',
              keywords: ['online leadership course', 'leadership'],
              duration_days: null,
              duration_hours: 6,
              total_hours: 6,
              price_type: 'per_person',
              price_per_person: 249,
              list_price_per_person: 349,
              currency: this.defaultCurrency,
              is_free: false,
              rating: 4.3,
              rating_count: 18,
              num_modules: 3,
              modules: [],
              is_active: true,
              created_at: now.toISOString()
            },
            {
              id: 'prog_webinar_coaching_skills_1',
              title: 'Free Coaching Skills Webinar for Managers',
              subtitle: 'Live webinar on practical coaching techniques',
              description: 'A free live webinar focused on essential coaching skills for people managers.',
              category_id: 'webinars',
              delivery_format: 'virtual_live',
              topic_tags: ['coaching_skills', 'coaching'],
              audience_level: 'all_levels',
              keywords: ['coaching webinar', 'leadership'],
              start_datetime: in30Days.toISOString(),
              duration_hours: 1.5,
              price_type: 'free',
              price_per_person: null,
              list_price_per_person: null,
              currency: this.defaultCurrency,
              is_free: true,
              rating: 4.6,
              rating_count: 40,
              max_participants: 500,
              is_active: true,
              created_at: now.toISOString()
            }
          ];
          localStorage.setItem('programs', JSON.stringify(defaultPrograms));
        } else {
          localStorage.setItem(key, JSON.stringify([]));
        }
      }
    });

    // Single cart for the single-user agent
    if (!localStorage.getItem('cart')) {
      localStorage.setItem('cart', JSON.stringify(null));
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, defaultValue = []) {
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

  _nowISO() {
    return new Date().toISOString();
  }

  _parseISO(dateStr) {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
  }

  _persistSingleUserState() {
    // All state is already persisted directly into localStorage.
    // This hook is provided for extensibility; currently a no-op.
  }

  // ---------------------- Label helpers ----------------------

  _getCategoryLabel(categoryId) {
    const map = {
      workshops: 'Workshops',
      courses: 'Courses',
      webinars: 'Webinars'
    };
    return map[categoryId] || categoryId || '';
  }

  _getDeliveryFormatLabel(format) {
    const map = {
      in_person: 'In-person',
      virtual_live: 'Virtual live',
      self_paced: 'Self-paced',
      online_on_demand: 'Online, on-demand'
    };
    return map[format] || format || '';
  }

  _getAudienceLevelLabel(level) {
    const map = {
      emerging_leaders: 'Emerging leaders',
      mid_level_managers: 'Mid-level managers',
      senior_leaders: 'Senior leaders',
      executives: 'Executives',
      all_levels: 'All levels'
    };
    return map[level] || level || '';
  }

  // ---------------------- Cart helpers ----------------------

  _getOrCreateCart() {
    let cart = this._getFromStorage('cart', null);
    if (!cart || typeof cart !== 'object') {
      cart = {
        id: this._generateId('cart'),
        items: [],
        subtotal: 0,
        tax: 0,
        total: 0,
        currency: this.defaultCurrency,
        last_updated: this._nowISO()
      };
      this._saveToStorage('cart', cart);
    }
    return cart;
  }

  _recalculateCartTotals(cart) {
    let subtotal = 0;
    if (Array.isArray(cart.items)) {
      cart.items.forEach((item) => {
        subtotal += item.line_total || 0;
      });
    }
    cart.subtotal = subtotal;
    // For simplicity, tax is 0. Could be extended.
    cart.tax = 0;
    cart.total = cart.subtotal + cart.tax;
    cart.last_updated = this._nowISO();
    return cart;
  }

  _validateProgramForCart(program) {
    if (!program) {
      return { valid: false, message: 'Program not found.' };
    }
    if (!program.is_active) {
      return { valid: false, message: 'Program is not active.' };
    }
    if (program.category_id === 'webinars') {
      return { valid: false, message: 'Webinars must be registered via webinar registration, not cart.' };
    }
    if (program.is_free || program.price_type === 'free') {
      return { valid: false, message: 'Free programs do not need to be added to cart.' };
    }
    if (program.price_type !== 'per_person') {
      return { valid: false, message: 'Only per-person priced programs can be added to cart.' };
    }
    if (typeof program.price_per_person !== 'number') {
      return { valid: false, message: 'Program price is not configured correctly.' };
    }
    return { valid: true, message: 'OK' };
  }

  _enrichCartForOutput(cart) {
    const programs = this._getFromStorage('programs', []);
    const enhancedItems = (cart.items || []).map((item) => {
      const program = programs.find((p) => p.id === item.program_id) || null;
      return Object.assign({}, item, {
        category_label: program ? this._getCategoryLabel(program.category_id) : item.category_label,
        program
      });
    });
    return Object.assign({}, cart, {
      items: enhancedItems,
      items_count: enhancedItems.length
    });
  }

  // ---------------------- Program & CaseStudy mappers ----------------------

  _mapProgramToSummaryCard(program) {
    if (!program) return null;
    return {
      id: program.id,
      title: program.title,
      subtitle: program.subtitle || '',
      category_id: program.category_id,
      category_label: this._getCategoryLabel(program.category_id),
      delivery_format: program.delivery_format,
      delivery_format_label: this._getDeliveryFormatLabel(program.delivery_format),
      topic_tags: Array.isArray(program.topic_tags) ? program.topic_tags : [],
      audience_level: program.audience_level,
      audience_level_label: this._getAudienceLevelLabel(program.audience_level),
      location_city: program.location_city || null,
      location_country: program.location_country || null,
      start_datetime: program.start_datetime || null,
      end_datetime: program.end_datetime || null,
      duration_days: typeof program.duration_days === 'number' ? program.duration_days : null,
      duration_hours: typeof program.duration_hours === 'number' ? program.duration_hours : null,
      total_hours: typeof program.total_hours === 'number' ? program.total_hours : null,
      price_type: program.price_type,
      price_per_person: typeof program.price_per_person === 'number' ? program.price_per_person : null,
      list_price_per_person: typeof program.list_price_per_person === 'number' ? program.list_price_per_person : null,
      currency: program.currency || this.defaultCurrency,
      is_free: !!program.is_free,
      rating: typeof program.rating === 'number' ? program.rating : null,
      rating_count: typeof program.rating_count === 'number' ? program.rating_count : 0,
      is_active: !!program.is_active
    };
  }

  _mapCaseStudyToSummaryCard(cs) {
    if (!cs) return null;
    return {
      id: cs.id,
      title: cs.title,
      client_name: cs.client_name || '',
      industry: cs.industry,
      audience_level: cs.audience_level,
      audience_level_label: this._getAudienceLevelLabel(cs.audience_level),
      summary: cs.summary || ''
    };
  }

  // ---------------------- Team package pricing helper ----------------------

  _calculateTeamPackagePricing(number_of_participants, region, delivery_mode, selected_addon_ids) {
    const baseMatrix = {
      north_america: { in_person: 950, virtual: 650, blended: 800 },
      south_america: { in_person: 800, virtual: 550, blended: 700 },
      europe: { in_person: 900, virtual: 600, blended: 750 },
      asia_pacific: { in_person: 850, virtual: 550, blended: 700 },
      middle_east_africa: { in_person: 800, virtual: 550, blended: 700 },
      global: { in_person: 900, virtual: 650, blended: 775 }
    };

    const perRegion = baseMatrix[region] || baseMatrix.global;
    const base_price_per_person = perRegion[delivery_mode] || perRegion.virtual;

    const allAddons = this._getFromStorage('addon_options', []);
    const selectedAddons = allAddons.filter((a) =>
      selected_addon_ids && selected_addon_ids.indexOf(a.id) !== -1 && a.is_active
    );

    const addons_price_per_person = selectedAddons.reduce((sum, addon) => {
      if (addon && typeof addon.price_per_person === 'number') {
        return sum + addon.price_per_person;
      }
      return sum;
    }, 0);

    const total_price_per_person = base_price_per_person + addons_price_per_person;
    const total_price = total_price_per_person * number_of_participants;

    return {
      base_price_per_person,
      addons_price_per_person,
      total_price_per_person,
      total_price,
      currency: this.defaultCurrency
    };
  }

  // ---------------------- Webinar & scheduling helpers ----------------------

  _validateWebinarProgram(program, quantity) {
    if (!program) {
      return { valid: false, message: 'Webinar not found.' };
    }
    if (program.category_id !== 'webinars') {
      return { valid: false, message: 'Program is not a webinar.' };
    }
    if (!program.is_active) {
      return { valid: false, message: 'Webinar is not active.' };
    }
    const now = new Date();
    const start = this._parseISO(program.start_datetime);
    if (start && start < now) {
      return { valid: false, message: 'Webinar has already started or finished.' };
    }
    if (typeof quantity !== 'number' || quantity <= 0) {
      return { valid: false, message: 'Quantity must be a positive number.' };
    }

    if (typeof program.max_participants === 'number') {
      const registrations = this._getFromStorage('webinar_registrations', []);
      const currentQty = registrations
        .filter((r) => r.program_id === program.id)
        .reduce((sum, r) => sum + (r.quantity || 0), 0);
      if (currentQty + quantity > program.max_participants) {
        return { valid: false, message: 'Webinar is at or over capacity.' };
      }
    }

    return { valid: true, message: 'OK' };
  }

  _validateConsultationPreferredTime(preferred_date, preferred_time_start, preferred_time_end) {
    const date = this._parseISO(preferred_date);
    if (!date) {
      return { valid: false, message: 'Invalid preferred date.' };
    }
    const today = new Date();
    // Remove time from comparison
    const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    if (dateOnly < todayOnly) {
      return { valid: false, message: 'Preferred date must be today or in the future.' };
    }

    if (!preferred_time_start || !preferred_time_end) {
      return { valid: false, message: 'Preferred time window is required.' };
    }

    // Simple HH:MM validation
    const timeRegex = /^\d{2}:\d{2}$/;
    if (!timeRegex.test(preferred_time_start) || !timeRegex.test(preferred_time_end)) {
      return { valid: false, message: 'Preferred time must be in HH:MM format.' };
    }

    if (preferred_time_start >= preferred_time_end) {
      return { valid: false, message: 'Preferred start time must be before end time.' };
    }

    return { valid: true, message: 'OK' };
  }

  _validateIntroCallSlot(requested_datetime) {
    const dt = this._parseISO(requested_datetime);
    if (!dt) {
      return { valid: false, message: 'Invalid requested datetime.' };
    }
    const now = new Date();
    if (dt <= now) {
      return { valid: false, message: 'Requested datetime must be in the future.' };
    }
    return { valid: true, message: 'OK' };
  }

  _sendNotificationEmail(type, payload) {
    // Simulate email by storing metadata only; no external calls.
    const notifications = this._getFromStorage('notifications', []);
    notifications.push({
      id: this._generateId('notif'),
      type,
      payload,
      created_at: this._nowISO()
    });
    this._saveToStorage('notifications', notifications);
  }

  // =============================================================
  // Core interface implementations
  // =============================================================

  // ---------------------- Homepage & filters ----------------------

  getHomepageSummary() {
    const programs = this._getFromStorage('programs', []);
    const now = new Date();

    const activePrograms = programs.filter((p) => p && p.is_active);

    const sortByStart = (a, b) => {
      const da = this._parseISO(a.start_datetime) || new Date(8640000000000000); // max date
      const db = this._parseISO(b.start_datetime) || new Date(8640000000000000);
      return da - db;
    };

    const featured_workshops = activePrograms
      .filter((p) => p.category_id === 'workshops')
      .sort(sortByStart)
      .slice(0, 3)
      .map((p) => ({
        id: p.id,
        title: p.title,
        subtitle: p.subtitle || '',
        category_id: p.category_id,
        category_label: this._getCategoryLabel(p.category_id),
        delivery_format: p.delivery_format,
        delivery_format_label: this._getDeliveryFormatLabel(p.delivery_format),
        start_datetime: p.start_datetime || null,
        location_city: p.location_city || null,
        location_country: p.location_country || null,
        price_type: p.price_type,
        price_per_person: typeof p.price_per_person === 'number' ? p.price_per_person : null,
        currency: p.currency || this.defaultCurrency,
        is_free: !!p.is_free,
        rating: typeof p.rating === 'number' ? p.rating : null,
        rating_count: typeof p.rating_count === 'number' ? p.rating_count : 0
      }));

    const featured_courses = activePrograms
      .filter((p) => p.category_id === 'courses')
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
      .slice(0, 3)
      .map((p) => ({
        id: p.id,
        title: p.title,
        subtitle: p.subtitle || '',
        category_id: p.category_id,
        category_label: this._getCategoryLabel(p.category_id),
        delivery_format: p.delivery_format,
        delivery_format_label: this._getDeliveryFormatLabel(p.delivery_format),
        total_hours: typeof p.total_hours === 'number' ? p.total_hours : null,
        price_type: p.price_type,
        price_per_person: typeof p.price_per_person === 'number' ? p.price_per_person : null,
        currency: p.currency || this.defaultCurrency,
        is_free: !!p.is_free,
        rating: typeof p.rating === 'number' ? p.rating : null,
        rating_count: typeof p.rating_count === 'number' ? p.rating_count : 0
      }));

    const featured_webinars = activePrograms
      .filter((p) => p.category_id === 'webinars')
      .filter((p) => {
        const sd = this._parseISO(p.start_datetime);
        return sd && sd > now;
      })
      .sort(sortByStart)
      .slice(0, 3)
      .map((p) => ({
        id: p.id,
        title: p.title,
        subtitle: p.subtitle || '',
        category_id: p.category_id,
        category_label: this._getCategoryLabel(p.category_id),
        start_datetime: p.start_datetime || null,
        duration_hours: typeof p.duration_hours === 'number' ? p.duration_hours : null,
        price_type: p.price_type,
        is_free: !!p.is_free,
        location_city: p.location_city || null,
        location_country: p.location_country || null
      }));

    const coaches = this._getFromStorage('coaches', []);
    const caseStudies = this._getFromStorage('case_studies', []);
    const uniqueClients = {};
    caseStudies.forEach((cs) => {
      if (cs && cs.client_name) {
        uniqueClients[cs.client_name] = true;
      }
    });

    const stats = {
      total_programs: programs.length,
      total_coaches: coaches.length,
      total_clients: Object.keys(uniqueClients).length
    };

    return {
      hero_title: 'Leadership programs, workshops, and coaching for modern organizations',
      hero_subtitle: 'Build leadership capability at every level with scalable learning experiences.',
      featured_workshops,
      featured_courses,
      featured_webinars,
      stats,
      show_newsletter_promo: true,
      newsletter_promo_copy: 'Stay ahead of leadership trends with our weekly insights on remote teams, change, and culture.'
    };
  }

  getProgramFilterOptions(category_id) {
    const programs = this._getFromStorage('programs', []);
    const filtered = category_id
      ? programs.filter((p) => p.category_id === category_id)
      : programs;

    // Delivery formats from enum
    const delivery_formats = [
      { value: 'in_person', label: 'In-person' },
      { value: 'virtual_live', label: 'Virtual live' },
      { value: 'self_paced', label: 'Self-paced' },
      { value: 'online_on_demand', label: 'Online, on-demand' }
    ];

    // Audience levels from enum
    const audience_levels = [
      { value: 'emerging_leaders', label: 'Emerging leaders' },
      { value: 'mid_level_managers', label: 'Mid-level managers' },
      { value: 'senior_leaders', label: 'Senior leaders' },
      { value: 'executives', label: 'Executives' },
      { value: 'all_levels', label: 'All levels' }
    ];

    // Topics derived from programs
    const topicSet = {};
    filtered.forEach((p) => {
      (p.topic_tags || []).forEach((t) => {
        if (t) topicSet[t] = true;
      });
    });
    const topics = Object.keys(topicSet).map((t) => ({
      value: t,
      label: t.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    }));

    const price_ranges = [
      { min: 0, max: 500, label: 'Up to $500' },
      { min: 500, max: 1000, label: '$500 - $1,000' },
      { min: 1000, max: 1500, label: '$1,000 - $1,500' },
      { min: 1500, max: null, label: '$1,500+' }
    ];

    const duration_day_options = [
      { value: 1, label: '1 day' },
      { value: 2, label: '2 days' },
      { value: 3, label: '3 days' },
      { value: 5, label: '5 days' }
    ];

    const duration_hour_options = [
      { max_hours: 2, label: 'Up to 2 hours' },
      { max_hours: 4, label: 'Up to 4 hours' },
      { max_hours: 8, label: 'Up to 8 hours' },
      { max_hours: 10, label: 'Up to 10 hours' }
    ];

    const sort_options = [
      { value: 'relevance', label: 'Relevance' },
      { value: 'price_low_to_high', label: 'Price: Low to High' },
      { value: 'price_high_to_low', label: 'Price: High to Low' },
      { value: 'date_soonest_first', label: 'Date: Soonest First' },
      { value: 'rating_high_to_low', label: 'Rating: High to Low' }
    ];

    const date_presets = [
      { value: 'next_30_days', label: 'Next 30 days', start_offset_days: 0, end_offset_days: 30 },
      { value: 'next_60_days', label: 'Next 60 days', start_offset_days: 0, end_offset_days: 60 }
    ];

    return {
      delivery_formats,
      audience_levels,
      topics,
      price_ranges,
      duration_day_options,
      duration_hour_options,
      sort_options,
      date_presets
    };
  }

  // ---------------------- Program search & details ----------------------

  searchPrograms(
    query,
    category_id,
    delivery_formats,
    min_duration_days,
    max_duration_days,
    max_total_hours,
    start_date,
    end_date,
    min_price_per_person,
    max_price_per_person,
    topic_tags,
    audience_levels,
    is_free,
    sort_option,
    page,
    page_size
  ) {
    const programs = this._getFromStorage('programs', []);
    const q = (query || '').trim().toLowerCase();
    const dfSet = new Set(delivery_formats || []);
    const topicSet = new Set(topic_tags || []);
    const audienceSet = new Set(audience_levels || []);

    const startDateObj = start_date ? new Date(start_date + 'T00:00:00Z') : null;
    const endDateObj = end_date ? new Date(end_date + 'T23:59:59Z') : null;

    let filtered = programs.filter((p) => p && p.is_active);

    if (category_id) {
      filtered = filtered.filter((p) => p.category_id === category_id);
    }

    if (dfSet.size > 0) {
      filtered = filtered.filter((p) => dfSet.has(p.delivery_format));
    }

    if (typeof min_duration_days === 'number') {
      filtered = filtered.filter((p) => typeof p.duration_days === 'number' && p.duration_days >= min_duration_days);
    }

    if (typeof max_duration_days === 'number') {
      filtered = filtered.filter((p) => typeof p.duration_days === 'number' && p.duration_days <= max_duration_days);
    }

    if (typeof max_total_hours === 'number') {
      filtered = filtered.filter((p) => {
        const total = typeof p.total_hours === 'number' ? p.total_hours : p.duration_hours;
        return typeof total === 'number' ? total <= max_total_hours : false;
      });
    }

    if (startDateObj) {
      filtered = filtered.filter((p) => {
        if (!p.start_datetime) return false;
        const sd = this._parseISO(p.start_datetime);
        return sd && sd >= startDateObj;
      });
    }

    if (endDateObj) {
      filtered = filtered.filter((p) => {
        if (!p.start_datetime) return false;
        const sd = this._parseISO(p.start_datetime);
        return sd && sd <= endDateObj;
      });
    }

    if (typeof min_price_per_person === 'number') {
      filtered = filtered.filter((p) => typeof p.price_per_person === 'number' && p.price_per_person >= min_price_per_person);
    }

    if (typeof max_price_per_person === 'number') {
      filtered = filtered.filter((p) => typeof p.price_per_person === 'number' && p.price_per_person <= max_price_per_person);
    }

    if (topicSet.size > 0) {
      filtered = filtered.filter((p) => {
        const tags = p.topic_tags || [];
        return tags.some((t) => topicSet.has(t));
      });
    }

    if (audienceSet.size > 0) {
      filtered = filtered.filter((p) => audienceSet.has(p.audience_level));
    }

    if (typeof is_free === 'boolean') {
      filtered = filtered.filter((p) => !!p.is_free === is_free);
    }

    if (q) {
      filtered = filtered.filter((p) => {
        const fields = [p.title, p.subtitle, p.description].concat(p.keywords || []);
        return fields.some((f) => (f || '').toLowerCase().indexOf(q) !== -1);
      });
    }

    const sort = sort_option || 'relevance';

    if (sort === 'price_low_to_high') {
      filtered.sort((a, b) => {
        const pa = typeof a.price_per_person === 'number' ? a.price_per_person : Number.POSITIVE_INFINITY;
        const pb = typeof b.price_per_person === 'number' ? b.price_per_person : Number.POSITIVE_INFINITY;
        return pa - pb;
      });
    } else if (sort === 'price_high_to_low') {
      filtered.sort((a, b) => {
        const pa = typeof a.price_per_person === 'number' ? a.price_per_person : 0;
        const pb = typeof b.price_per_person === 'number' ? b.price_per_person : 0;
        return pb - pa;
      });
    } else if (sort === 'date_soonest_first') {
      filtered.sort((a, b) => {
        const da = this._parseISO(a.start_datetime) || new Date(8640000000000000);
        const db = this._parseISO(b.start_datetime) || new Date(8640000000000000);
        return da - db;
      });
    } else if (sort === 'rating_high_to_low') {
      filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else {
      // relevance or default: sort by created_at desc if available
      filtered.sort((a, b) => {
        const da = this._parseISO(a.created_at) || new Date(0);
        const db = this._parseISO(b.created_at) || new Date(0);
        return db - da;
      });
    }

    const pg = page && page > 0 ? page : 1;
    const size = page_size && page_size > 0 ? page_size : 20;
    const startIndex = (pg - 1) * size;
    const endIndex = startIndex + size;

    const pageResults = filtered.slice(startIndex, endIndex).map((p) => this._mapProgramToSummaryCard(p));

    return {
      results: pageResults,
      total_results: filtered.length,
      page: pg,
      page_size: size
    };
  }

  getProgramDetails(programId) {
    const programs = this._getFromStorage('programs', []);
    const program = programs.find((p) => p.id === programId) || null;
    if (!program) {
      return {
        program: null,
        curriculum: { num_modules: 0, modules: [] },
        is_webinar: false,
        is_self_paced: false,
        can_add_to_cart: false,
        can_register_directly: false,
        pricing_display: {
          price_type_label: '',
          price_per_person: null,
          list_price_per_person: null,
          currency: this.defaultCurrency,
          is_free: false
        },
        recommended_programs: []
      };
    }

    const is_webinar = program.category_id === 'webinars';
    const is_self_paced =
      program.delivery_format === 'self_paced' || program.delivery_format === 'online_on_demand';

    const validation = this._validateProgramForCart(program);
    const can_add_to_cart = validation.valid;

    const can_register_directly = is_webinar && !!program.is_active;

    const price_type_labelMap = {
      per_person: 'Per person',
      per_team: 'Per team',
      free: 'Free'
    };

    const pricing_display = {
      price_type_label: price_type_labelMap[program.price_type] || program.price_type || '',
      price_per_person: typeof program.price_per_person === 'number' ? program.price_per_person : null,
      list_price_per_person:
        typeof program.list_price_per_person === 'number' ? program.list_price_per_person : null,
      currency: program.currency || this.defaultCurrency,
      is_free: !!program.is_free
    };

    const curriculum = {
      num_modules: typeof program.num_modules === 'number' ? program.num_modules : 0,
      modules: Array.isArray(program.modules) ? program.modules : []
    };

    // Recommended programs: same category, different id, active, highest rating
    const recommended_programs = programs
      .filter((p) => p.id !== program.id && p.category_id === program.category_id && p.is_active)
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
      .slice(0, 4)
      .map((p) => ({
        id: p.id,
        title: p.title,
        category_id: p.category_id,
        category_label: this._getCategoryLabel(p.category_id),
        delivery_format: p.delivery_format,
        delivery_format_label: this._getDeliveryFormatLabel(p.delivery_format),
        start_datetime: p.start_datetime || null,
        price_per_person: typeof p.price_per_person === 'number' ? p.price_per_person : null,
        is_free: !!p.is_free,
        rating: typeof p.rating === 'number' ? p.rating : null
      }));

    return {
      program: Object.assign({}, program, {
        category_label: this._getCategoryLabel(program.category_id),
        delivery_format_label: this._getDeliveryFormatLabel(program.delivery_format),
        audience_level_label: this._getAudienceLevelLabel(program.audience_level)
      }),
      curriculum,
      is_webinar,
      is_self_paced,
      can_add_to_cart,
      can_register_directly,
      pricing_display,
      recommended_programs
    };
  }

  // ---------------------- Cart interfaces ----------------------

  addProgramToCart(programId, quantity) {
    const qty = typeof quantity === 'number' && quantity > 0 ? quantity : 1;
    const programs = this._getFromStorage('programs', []);
    const program = programs.find((p) => p.id === programId) || null;
    const validation = this._validateProgramForCart(program);
    if (!validation.valid) {
      return { success: false, message: validation.message, cart: null };
    }

    let cart = this._getOrCreateCart();
    if (!Array.isArray(cart.items)) cart.items = [];

    let item = cart.items.find((it) => it.program_id === program.id);
    if (item) {
      item.quantity += qty;
      item.line_total = item.quantity * item.price_per_person;
    } else {
      item = {
        id: this._generateId('cartitem'),
        cart_id: cart.id,
        program_id: program.id,
        program_title: program.title,
        category_id: program.category_id,
        price_per_person: program.price_per_person,
        quantity: qty,
        line_total: program.price_per_person * qty,
        added_at: this._nowISO()
      };
      cart.items.push(item);
    }

    cart = this._recalculateCartTotals(cart);
    this._saveToStorage('cart', cart);
    this._persistSingleUserState();

    const enrichedCart = this._enrichCartForOutput(cart);
    return { success: true, message: 'Added to cart.', cart: enrichedCart };
  }

  getCart() {
    const cart = this._getOrCreateCart();
    return this._enrichCartForOutput(cart);
  }

  updateCartItemQuantity(cartItemId, quantity) {
    const qty = Number(quantity);
    if (!cartItemId || isNaN(qty)) {
      return { success: false, cart: null, message: 'Invalid parameters.' };
    }

    let cart = this._getOrCreateCart();
    if (!Array.isArray(cart.items)) cart.items = [];

    const index = cart.items.findIndex((it) => it.id === cartItemId);
    if (index === -1) {
      return { success: false, cart: this._enrichCartForOutput(cart), message: 'Cart item not found.' };
    }

    if (qty <= 0) {
      cart.items.splice(index, 1);
    } else {
      const item = cart.items[index];
      item.quantity = qty;
      item.line_total = item.price_per_person * qty;
    }

    cart = this._recalculateCartTotals(cart);
    this._saveToStorage('cart', cart);
    this._persistSingleUserState();

    return { success: true, cart: this._enrichCartForOutput(cart), message: 'Cart updated.' };
  }

  removeCartItem(cartItemId) {
    if (!cartItemId) {
      return { success: false, cart: null, message: 'Invalid cart item id.' };
    }
    let cart = this._getOrCreateCart();
    if (!Array.isArray(cart.items)) cart.items = [];

    const before = cart.items.length;
    cart.items = cart.items.filter((it) => it.id !== cartItemId);

    if (cart.items.length === before) {
      return { success: false, cart: this._enrichCartForOutput(cart), message: 'Cart item not found.' };
    }

    cart = this._recalculateCartTotals(cart);
    this._saveToStorage('cart', cart);
    this._persistSingleUserState();

    return { success: true, cart: this._enrichCartForOutput(cart), message: 'Item removed from cart.' };
  }

  // ---------------------- Learning plan ----------------------

  saveProgramToLearningPlan(programId) {
    const programs = this._getFromStorage('programs', []);
    const program = programs.find((p) => p.id === programId) || null;
    if (!program) {
      return { success: false, learning_plan_item: null, message: 'Program not found.' };
    }

    const items = this._getFromStorage('learning_plan_items', []);
    const existing = items.find((it) => it.program_id === programId);
    if (existing) {
      return { success: true, learning_plan_item: existing, message: 'Program already in learning plan.' };
    }

    const newItem = {
      id: this._generateId('lpitem'),
      program_id: programId,
      added_at: this._nowISO()
    };
    items.push(newItem);
    this._saveToStorage('learning_plan_items', items);
    this._persistSingleUserState();

    return { success: true, learning_plan_item: newItem, message: 'Program saved to learning plan.' };
  }

  removeLearningPlanItem(learningPlanItemId) {
    if (!learningPlanItemId) {
      return { success: false, message: 'Invalid learning plan item id.' };
    }
    const items = this._getFromStorage('learning_plan_items', []);
    const before = items.length;
    const remaining = items.filter((it) => it.id !== learningPlanItemId);
    this._saveToStorage('learning_plan_items', remaining);
    this._persistSingleUserState();

    if (remaining.length === before) {
      return { success: false, message: 'Learning plan item not found.' };
    }
    return { success: true, message: 'Learning plan item removed.' };
  }

  // ---------------------- Webinar registration ----------------------

  registerForWebinar(programId, attendee_name, attendee_email, quantity) {
    const qty = typeof quantity === 'number' && quantity > 0 ? quantity : 1;
    const programs = this._getFromStorage('programs', []);
    const program = programs.find((p) => p.id === programId) || null;
    const validation = this._validateWebinarProgram(program, qty);
    if (!validation.valid) {
      return { success: false, registration: null, message: validation.message };
    }

    const registration = {
      id: this._generateId('webreg'),
      program_id: program.id,
      program_title: program.title,
      webinar_datetime: program.start_datetime || this._nowISO(),
      attendee_name,
      attendee_email,
      quantity: qty,
      created_at: this._nowISO()
    };

    const registrations = this._getFromStorage('webinar_registrations', []);
    registrations.push(registration);
    this._saveToStorage('webinar_registrations', registrations);

    this._sendNotificationEmail('webinar_registration', {
      registration_id: registration.id,
      program_id: program.id,
      attendee_name,
      attendee_email
    });

    // Foreign key resolution: include full program object
    const enrichedRegistration = Object.assign({}, registration, {
      program
    });

    return { success: true, registration: enrichedRegistration, message: 'Registered for webinar.' };
  }

  // ---------------------- Saved items overview ----------------------

  getSavedItemsOverview() {
    const lpItems = this._getFromStorage('learning_plan_items', []);
    const favoriteItems = this._getFromStorage('favorite_case_studies', []);
    const programs = this._getFromStorage('programs', []);
    const caseStudies = this._getFromStorage('case_studies', []);

    const learning_plan = lpItems.map((item) => {
      const program = programs.find((p) => p.id === item.program_id) || null;
      const program_summary = program ? this._mapProgramToSummaryCard(program) : null;
      return {
        learning_plan_item: item,
        program_summary,
        program
      };
    });

    const favorite_case_studies = favoriteItems.map((fav) => {
      const cs = caseStudies.find((c) => c.id === fav.case_study_id) || null;
      const case_study_summary = cs ? this._mapCaseStudyToSummaryCard(cs) : null;
      return {
        favorite: fav,
        case_study_summary,
        case_study: cs
      };
    });

    return { learning_plan, favorite_case_studies };
  }

  // ---------------------- Case studies ----------------------

  getCaseStudyFilterOptions() {
    const caseStudies = this._getFromStorage('case_studies', []);

    const industrySet = {};
    const topicSet = {};
    const programTypeSet = {};

    caseStudies.forEach((cs) => {
      if (!cs) return;
      if (cs.industry) {
        industrySet[cs.industry.toLowerCase()] = cs.industry;
      }
      (cs.topics || []).forEach((t) => {
        if (t) topicSet[t] = true;
      });
      (cs.program_types || []).forEach((pt) => {
        if (pt) programTypeSet[pt] = true;
      });
    });

    const industries = Object.keys(industrySet).map((value) => ({
      value,
      label: industrySet[value]
    }));

    const audience_levels = [
      { value: 'emerging_leaders', label: 'Emerging leaders' },
      { value: 'mid_level_managers', label: 'Mid-level managers' },
      { value: 'senior_leaders', label: 'Senior leaders' },
      { value: 'executives', label: 'Executives' },
      { value: 'all_levels', label: 'All levels' }
    ];

    const topics = Object.keys(topicSet).map((t) => ({
      value: t,
      label: t.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    }));

    const program_types = Object.keys(programTypeSet).map((pt) => ({
      value: pt,
      label: pt.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    }));

    const sort_options = [
      { value: 'newest_first', label: 'Newest first' },
      { value: 'oldest_first', label: 'Oldest first' },
      { value: 'relevance', label: 'Relevance' }
    ];

    return { industries, audience_levels, topics, program_types, sort_options };
  }

  listCaseStudies(industry, audience_levels, topics, program_types, sort_option, page, page_size) {
    const caseStudies = this._getFromStorage('case_studies', []);
    const audienceSet = new Set(audience_levels || []);
    const topicSet = new Set(topics || []);
    const programTypeSet = new Set(program_types || []);
    const industryValue = industry ? industry.toLowerCase() : null;

    let filtered = caseStudies.slice();

    if (industryValue) {
      filtered = filtered.filter((cs) => cs.industry && cs.industry.toLowerCase() === industryValue);
    }

    if (audienceSet.size > 0) {
      filtered = filtered.filter((cs) => audienceSet.has(cs.audience_level));
    }

    if (topicSet.size > 0) {
      filtered = filtered.filter((cs) => {
        const ts = cs.topics || [];
        return ts.some((t) => topicSet.has(t));
      });
    }

    if (programTypeSet.size > 0) {
      filtered = filtered.filter((cs) => {
        const pts = cs.program_types || [];
        return pts.some((pt) => programTypeSet.has(pt));
      });
    }

    const sort = sort_option || 'relevance';
    if (sort === 'newest_first') {
      filtered.sort((a, b) => {
        const da = this._parseISO(a.published_at) || new Date(0);
        const db = this._parseISO(b.published_at) || new Date(0);
        return db - da;
      });
    } else if (sort === 'oldest_first') {
      filtered.sort((a, b) => {
        const da = this._parseISO(a.published_at) || new Date(0);
        const db = this._parseISO(b.published_at) || new Date(0);
        return da - db;
      });
    }

    const pg = page && page > 0 ? page : 1;
    const size = page_size && page_size > 0 ? page_size : 20;
    const startIndex = (pg - 1) * size;
    const endIndex = startIndex + size;

    const results = filtered.slice(startIndex, endIndex);

    return {
      results,
      total_results: filtered.length,
      page: pg,
      page_size: size
    };
  }

  getCaseStudyDetails(caseStudyId) {
    const caseStudies = this._getFromStorage('case_studies', []);
    const case_study = caseStudies.find((cs) => cs.id === caseStudyId) || null;
    if (!case_study) {
      return { case_study: null, related_case_studies: [] };
    }

    const related_case_studies = caseStudies
      .filter((cs) => cs.id !== case_study.id)
      .filter((cs) => {
        if (cs.industry && cs.industry === case_study.industry) return true;
        const topicsA = case_study.topics || [];
        const topicsB = cs.topics || [];
        return topicsA.some((t) => topicsB.indexOf(t) !== -1);
      })
      .slice(0, 4);

    return { case_study, related_case_studies };
  }

  saveCaseStudyToFavorites(caseStudyId) {
    const caseStudies = this._getFromStorage('case_studies', []);
    const cs = caseStudies.find((c) => c.id === caseStudyId) || null;
    if (!cs) {
      return { success: false, favorite: null, message: 'Case study not found.' };
    }

    const favorites = this._getFromStorage('favorite_case_studies', []);
    const existing = favorites.find((f) => f.case_study_id === caseStudyId);
    if (existing) {
      return { success: true, favorite: existing, message: 'Case study already in favorites.' };
    }

    const favorite = {
      id: this._generateId('favcs'),
      case_study_id: caseStudyId,
      added_at: this._nowISO()
    };
    favorites.push(favorite);
    this._saveToStorage('favorite_case_studies', favorites);
    this._persistSingleUserState();

    return { success: true, favorite, message: 'Case study saved to favorites.' };
  }

  removeFavoriteCaseStudy(favoriteId) {
    if (!favoriteId) {
      return { success: false, message: 'Invalid favorite id.' };
    }
    const favorites = this._getFromStorage('favorite_case_studies', []);
    const before = favorites.length;
    const remaining = favorites.filter((f) => f.id !== favoriteId);
    this._saveToStorage('favorite_case_studies', remaining);
    this._persistSingleUserState();

    if (before === remaining.length) {
      return { success: false, message: 'Favorite not found.' };
    }
    return { success: true, message: 'Favorite removed.' };
  }

  // ---------------------- Team packages & consultation ----------------------

  getTeamPackageCalculatorOptions() {
    const regions = [
      { value: 'north_america', label: 'North America' },
      { value: 'south_america', label: 'South America' },
      { value: 'europe', label: 'Europe' },
      { value: 'asia_pacific', label: 'Asia Pacific' },
      { value: 'middle_east_africa', label: 'Middle East & Africa' },
      { value: 'global', label: 'Global' }
    ];

    const delivery_modes = [
      { value: 'in_person', label: 'In-person' },
      { value: 'virtual', label: 'Virtual live' },
      { value: 'blended', label: 'Blended' }
    ];

    const add_on_options = this._getFromStorage('addon_options', []).filter((a) => a.is_active);

    return { regions, delivery_modes, add_on_options };
  }

  configureTeamPackage(number_of_participants, region, delivery_mode, selected_addon_ids) {
    const num = Number(number_of_participants);
    if (!region || !delivery_mode || isNaN(num) || num <= 0) {
      return { success: false, config: null, message: 'Invalid configuration parameters.' };
    }

    const addonIds = Array.isArray(selected_addon_ids) ? selected_addon_ids : [];
    const pricing = this._calculateTeamPackagePricing(num, region, delivery_mode, addonIds);

    const config = {
      id: this._generateId('pkg'),
      number_of_participants: num,
      region,
      delivery_mode,
      base_price_per_person: pricing.base_price_per_person,
      selected_addon_ids: addonIds,
      addons_price_per_person: pricing.addons_price_per_person,
      total_price_per_person: pricing.total_price_per_person,
      total_price: pricing.total_price,
      currency: pricing.currency,
      created_at: this._nowISO()
    };

    const configs = this._getFromStorage('team_package_configs', []);
    configs.push(config);
    this._saveToStorage('team_package_configs', configs);

    const addonsAll = this._getFromStorage('addon_options', []);
    const resolvedAddons = addonsAll.filter((a) => addonIds.indexOf(a.id) !== -1);

    const enrichedConfig = Object.assign({}, config, {
      addons: resolvedAddons
    });

    return { success: true, config: enrichedConfig, message: 'Team package configured.' };
  }

  submitConsultationRequest(
    configId,
    name,
    email,
    preferred_date,
    preferred_time_start,
    preferred_time_end,
    notes
  ) {
    const validation = this._validateConsultationPreferredTime(
      preferred_date,
      preferred_time_start,
      preferred_time_end
    );
    if (!validation.valid) {
      return { consultation_request: null, success: false, message: validation.message };
    }

    const configs = this._getFromStorage('team_package_configs', []);
    const config = configs.find((c) => c.id === configId) || null;

    const preferredDateObj = this._parseISO(preferred_date) || new Date();

    const consultation_request = {
      id: this._generateId('consult'),
      config_id: config ? config.id : null,
      name,
      email,
      preferred_date: preferredDateObj.toISOString(),
      preferred_time_start,
      preferred_time_end,
      notes: notes || '',
      status: 'submitted',
      submitted_at: this._nowISO()
    };

    const requests = this._getFromStorage('consultation_requests', []);
    requests.push(consultation_request);
    this._saveToStorage('consultation_requests', requests);

    this._sendNotificationEmail('team_package_consultation', {
      consultation_id: consultation_request.id,
      config_id: consultation_request.config_id,
      name,
      email
    });

    const enrichedRequest = Object.assign({}, consultation_request, {
      config
    });

    return { consultation_request: enrichedRequest, success: true, message: 'Consultation requested.' };
  }

  // ---------------------- Coach directory & intro calls ----------------------

  getCoachFilterOptions() {
    const coaches = this._getFromStorage('coaches', []);

    const specializationSet = {};
    const regionSet = {};
    let minYears = null;
    let maxYears = null;

    coaches.forEach((c) => {
      if (!c || !c.is_active) return;
      (c.specializations || []).forEach((s) => {
        if (s) specializationSet[s] = true;
      });
      if (c.region) regionSet[c.region] = true;
      if (typeof c.years_of_experience === 'number') {
        if (minYears === null || c.years_of_experience < minYears) minYears = c.years_of_experience;
        if (maxYears === null || c.years_of_experience > maxYears) maxYears = c.years_of_experience;
      }
    });

    const specializations = Object.keys(specializationSet).map((s) => ({
      value: s,
      label: s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    }));

    const regions = Object.keys(regionSet);

    const rate_ranges = [
      { min: 0, max: 250, label: 'Up to $250/hr' },
      { min: 250, max: 400, label: '$250 - $400/hr' },
      { min: 400, max: 600, label: '$400 - $600/hr' },
      { min: 600, max: null, label: '$600+/hr' }
    ];

    const sort_options = [
      { value: 'hourly_rate_low_to_high', label: 'Hourly rate: Low to High' },
      { value: 'hourly_rate_high_to_low', label: 'Hourly rate: High to Low' },
      { value: 'rating_high_to_low', label: 'Rating: High to Low' }
    ];

    return {
      specializations,
      regions,
      min_years_of_experience: minYears,
      max_years_of_experience: maxYears,
      rate_ranges,
      sort_options
    };
  }

  listCoaches(specialization, min_years_experience, max_hourly_rate, region, sort_option, page, page_size) {
    const coaches = this._getFromStorage('coaches', []);

    let filtered = coaches.filter((c) => c && c.is_active);

    if (specialization) {
      const specNorm = specialization.toLowerCase().replace(/\s+/g, '_');
      filtered = filtered.filter((c) => {
        const specs = c.specializations || [];
        return specs.some((s) => {
          const sNorm = String(s).toLowerCase().replace(/\s+/g, '_');
          return sNorm === specNorm;
        });
      });
    }

    if (typeof min_years_experience === 'number') {
      filtered = filtered.filter((c) => c.years_of_experience >= min_years_experience);
    }

    if (typeof max_hourly_rate === 'number') {
      filtered = filtered.filter((c) => c.hourly_rate <= max_hourly_rate);
    }

    if (region) {
      filtered = filtered.filter((c) => c.region === region);
    }

    const sort = sort_option || 'hourly_rate_low_to_high';

    if (sort === 'hourly_rate_low_to_high') {
      filtered.sort((a, b) => a.hourly_rate - b.hourly_rate);
    } else if (sort === 'hourly_rate_high_to_low') {
      filtered.sort((a, b) => b.hourly_rate - a.hourly_rate);
    } else if (sort === 'rating_high_to_low') {
      filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    }

    const pg = page && page > 0 ? page : 1;
    const size = page_size && page_size > 0 ? page_size : 20;
    const startIndex = (pg - 1) * size;
    const endIndex = startIndex + size;

    const results = filtered.slice(startIndex, endIndex);

    return {
      results,
      total_results: filtered.length,
      page: pg,
      page_size: size
    };
  }

  getCoachDetails(coachId) {
    const coaches = this._getFromStorage('coaches', []);
    const coach = coaches.find((c) => c.id === coachId) || null;
    if (!coach) {
      return { coach: null, availability_overview: '', similar_coaches: [] };
    }

    // Simple availability text based on region
    const regionText = coach.region ? coach.region.replace(/_/g, ' ') : 'their region';
    const availability_overview =
      'Typically available for intro calls on weekdays during business hours in ' + regionText + '.';

    const similar_coaches = coaches
      .filter((c) => c.id !== coach.id && c.is_active)
      .filter((c) => {
        const sharedSpec = (c.specializations || []).some((s) => (coach.specializations || []).indexOf(s) !== -1);
        const sameRegion = !coach.region || c.region === coach.region;
        return sharedSpec && sameRegion;
      })
      .slice(0, 4);

    return { coach, availability_overview, similar_coaches };
  }

  requestIntroCall(coachId, requested_datetime, name, email) {
    const coaches = this._getFromStorage('coaches', []);
    const coach = coaches.find((c) => c.id === coachId) || null;
    if (!coach) {
      return { intro_call_request: null, success: false, message: 'Coach not found.' };
    }

    const validation = this._validateIntroCallSlot(requested_datetime);
    if (!validation.valid) {
      return { intro_call_request: null, success: false, message: validation.message };
    }

    const requestedDateObj = this._parseISO(requested_datetime) || new Date();

    const intro_call_request = {
      id: this._generateId('intro'),
      coach_id: coach.id,
      coach_name: coach.full_name,
      requested_datetime: requestedDateObj.toISOString(),
      name,
      email,
      status: 'submitted',
      submitted_at: this._nowISO()
    };

    const calls = this._getFromStorage('intro_call_requests', []);
    calls.push(intro_call_request);
    this._saveToStorage('intro_call_requests', calls);

    this._sendNotificationEmail('intro_call_request', {
      intro_call_request_id: intro_call_request.id,
      coach_id: coach.id,
      name,
      email
    });

    const enriched = Object.assign({}, intro_call_request, { coach });

    return { intro_call_request: enriched, success: true, message: 'Intro call requested.' };
  }

  // ---------------------- Newsletter ----------------------

  getNewsletterOptions() {
    const topics = [
      {
        value: 'leadership_trends',
        label: 'Leadership trends',
        description: 'Insights on emerging leadership practices, research, and case studies.'
      },
      {
        value: 'remote_teams',
        label: 'Remote teams',
        description: 'Practical guidance for leading hybrid and remote teams.'
      },
      {
        value: 'coaching_skills',
        label: 'Coaching skills',
        description: 'Micro-tips and tools to coach your team more effectively.'
      }
    ];

    const frequencies = [
      {
        value: 'daily',
        label: 'Daily',
        description: 'Short daily insights and prompts.',
        is_default: false
      },
      {
        value: 'weekly',
        label: 'Weekly',
        description: 'A concise weekly roundup of leadership insights.',
        is_default: true
      },
      {
        value: 'monthly',
        label: 'Monthly',
        description: 'A monthly deep-dive on a core leadership topic.',
        is_default: false
      }
    ];

    return { topics, frequencies };
  }

  subscribeToNewsletter(email, name, topics, frequency) {
    if (!email || !frequency) {
      return {
        subscription: null,
        success: false,
        is_new_subscription: false,
        message: 'Email and frequency are required.'
      };
    }

    const freqSet = new Set(['daily', 'weekly', 'monthly']);
    if (!freqSet.has(frequency)) {
      return {
        subscription: null,
        success: false,
        is_new_subscription: false,
        message: 'Invalid frequency.'
      };
    }

    const subs = this._getFromStorage('newsletter_subscriptions', []);
    let existing = subs.find((s) => s.email === email) || null;
    const now = this._nowISO();

    if (existing) {
      existing.name = name || existing.name || '';
      existing.topics = Array.isArray(topics) ? topics : existing.topics || [];
      existing.frequency = frequency;
      existing.is_active = true;
      this._saveToStorage('newsletter_subscriptions', subs);
      return {
        subscription: existing,
        success: true,
        is_new_subscription: false,
        message: 'Subscription updated.'
      };
    }

    const subscription = {
      id: this._generateId('nsub'),
      email,
      name: name || '',
      topics: Array.isArray(topics) ? topics : [],
      frequency,
      subscribed_at: now,
      is_active: true
    };

    subs.push(subscription);
    this._saveToStorage('newsletter_subscriptions', subs);

    return {
      subscription,
      success: true,
      is_new_subscription: true,
      message: 'Subscribed to newsletter.'
    };
  }

  // ---------------------- Custom programs (quotes) ----------------------

  getCustomProgramsContent() {
    // Static marketing content; can be overridden externally via storage if desired.
    const stored = this._getFromStorage('custom_programs_content', null);
    if (stored && typeof stored === 'object') {
      return stored;
    }

    return {
      hero_title: 'Custom leadership programs for your organization',
      hero_subtitle: 'Co-design a leadership journey aligned to your strategy, culture, and context.',
      sections: [
        {
          id: 'diagnose',
          title: 'Diagnose your needs',
          body: 'We start with discovery conversations, stakeholder interviews, and diagnostics to understand your leadership context.'
        },
        {
          id: 'design',
          title: 'Design the journey',
          body: 'We co-create a learning journey that blends workshops, coaching, and on-the-job experimentation.'
        },
        {
          id: 'deliver',
          title: 'Deliver and iterate',
          body: 'Our global faculty deliver impactful experiences and iterate based on real-time feedback.'
        }
      ],
      sample_structures: [
        {
          title: '12-week manager accelerator',
          duration_weeks: 12,
          summary: 'Bi-weekly virtual workshops, peer coaching circles, and applied projects.'
        },
        {
          title: '6-month senior leader program',
          duration_weeks: 24,
          summary: 'In-person kick-off, executive coaching, strategic simulations, and capstone presentations.'
        }
      ],
      outcomes: [
        {
          title: 'Stronger leadership pipeline',
          description: 'Equip managers and senior leaders with the skills to lead through change.'
        },
        {
          title: 'Scalable leadership culture',
          description: 'Embed a shared language and habits for coaching, feedback, and decision-making.'
        }
      ],
      cta_label: 'Request a custom program quote',
      quote_form_help_text: 'Tell us about your participants, outcomes, and budget. We will respond within 2 business days.'
    };
  }

  submitCustomProgramQuote(
    number_of_participants,
    program_length_text,
    program_length_weeks,
    audience_level,
    budget_total,
    currency,
    contact_name,
    contact_email,
    notes
  ) {
    const num = Number(number_of_participants);
    const budget = Number(budget_total);

    if (!num || num <= 0 || !program_length_text || !audience_level || !contact_name || !contact_email) {
      return {
        quote_request: null,
        success: false,
        message: 'Missing or invalid required fields.'
      };
    }

    let plWeeks = null;
    if (typeof program_length_weeks === 'number' && program_length_weeks > 0) {
      plWeeks = program_length_weeks;
    } else {
      const text = program_length_text.toLowerCase();
      const weeksMatch = text.match(/(\d+)\s*week/);
      const monthsMatch = text.match(/(\d+)\s*month/);
      if (weeksMatch) {
        plWeeks = parseInt(weeksMatch[1], 10);
      } else if (monthsMatch) {
        plWeeks = parseInt(monthsMatch[1], 10) * 4;
      }
    }

    const quote_request = {
      id: this._generateId('cquote'),
      number_of_participants: num,
      program_length_text,
      program_length_weeks: plWeeks,
      audience_level,
      budget_total: budget,
      currency: currency || this.defaultCurrency,
      contact_name,
      contact_email,
      notes: notes || '',
      status: 'submitted',
      created_at: this._nowISO()
    };

    const quotes = this._getFromStorage('custom_program_quote_requests', []);
    quotes.push(quote_request);
    this._saveToStorage('custom_program_quote_requests', quotes);

    this._sendNotificationEmail('custom_program_quote', {
      quote_id: quote_request.id,
      contact_name,
      contact_email
    });

    return { quote_request, success: true, message: 'Quote request submitted.' };
  }

  // ---------------------- Team packages page content ----------------------

  getTeamPackagesContent() {
    const stored = this._getFromStorage('team_packages_content', null);
    if (stored && typeof stored === 'object') {
      return stored;
    }

    return {
      hero_title: 'Team packages & pricing',
      hero_subtitle: 'Flexible leadership training packages for intact teams and cohorts.',
      formats: [
        {
          delivery_mode: 'in_person',
          label: 'In-person workshops',
          description: 'Immersive, facilitator-led experiences at your offices or offsites.'
        },
        {
          delivery_mode: 'virtual',
          label: 'Virtual live sessions',
          description: 'Interactive live sessions optimized for remote and hybrid teams.'
        },
        {
          delivery_mode: 'blended',
          label: 'Blended journeys',
          description: 'Combine self-paced pre-work, virtual sessions, and in-person labs.'
        }
      ],
      what_is_included: [
        {
          id: 'design',
          title: 'Program design',
          description: 'Co-design of objectives, curriculum, and success measures.'
        },
        {
          id: 'facilitators',
          title: 'Expert facilitators',
          description: 'Experienced faculty with deep leadership and industry expertise.'
        },
        {
          id: 'materials',
          title: 'Learning materials',
          description: 'Toolkits, job aids, and digital resources for ongoing application.'
        }
      ],
      faqs: [
        {
          question: 'What is the minimum team size?',
          answer: 'Most team packages start at 8 participants, but we can accommodate smaller groups.'
        },
        {
          question: 'Do you offer discounts for larger cohorts?',
          answer: 'Yes. Pricing scales based on cohort size, regions, and delivery mode. Use the calculator or contact us for a custom quote.'
        }
      ]
    };
  }

  // ---------------------- Executive coaching page content ----------------------

  getExecutiveCoachingContent() {
    const stored = this._getFromStorage('executive_coaching_content', null);
    if (stored && typeof stored === 'object') {
      return stored;
    }

    return {
      hero_title: 'Executive coaching & coach directory',
      hero_subtitle: 'Partner with experienced executive coaches to accelerate impact.',
      overview_html:
        '<p>Our global network of certified executive coaches works with senior leaders and high-potential talent on their most important goals.</p>',
      benefits: [
        {
          title: 'Confidential thought partnership',
          description: 'A space to think through strategic decisions, stakeholder dynamics, and personal leadership style.'
        },
        {
          title: 'Sustainable behavior change',
          description: 'Evidence-based routines and experiments that translate into lasting shifts in how leaders show up.'
        }
      ],
      typical_engagements: [
        {
          title: '3-month focused sprint',
          duration_weeks: 12,
          summary: 'Bi-weekly sessions on a specific leadership or transition challenge.'
        },
        {
          title: '6-12 month transformation',
          duration_weeks: 24,
          summary: 'Longer-term engagements to support major role transitions or organization-wide change.'
        }
      ]
    };
  }

  // ---------------------- Newsletter page content ----------------------

  getNewsletterPageContent() {
    const stored = this._getFromStorage('newsletter_page_content', null);
    if (stored && typeof stored === 'object') {
      return stored;
    }

    return {
      hero_title: 'Leadership insights newsletter',
      hero_subtitle: 'Actionable ideas for leading teams in a changing world.',
      description_html:
        '<p>Each week, we curate the most relevant ideas on leadership, culture, and remote work into a concise, practical email.</p>',
      example_sections: [
        {
          title: 'Trend spotlight',
          summary: 'A short overview of a key leadership trend, with links to research and case studies.'
        },
        {
          title: 'Manager toolkit',
          summary: 'Simple tools, prompts, and facilitation guides you can use with your team.'
        }
      ]
    };
  }

  // ---------------------- About & Contact ----------------------

  getAboutPageContent() {
    const stored = this._getFromStorage('about_page_content', null);
    if (stored && typeof stored === 'object') {
      return stored;
    }

    return {
      mission_html:
        '<p>We exist to help organizations unlock the full potential of their leaders at every level.</p>',
      values: [
        {
          title: 'Impact first',
          description: 'We design learning that changes behavior and business outcomes, not just satisfaction scores.'
        },
        {
          title: 'Human-centered',
          description: 'We treat leadership as a deeply human endeavor, respecting context, identity, and lived experience.'
        }
      ],
      leadership_team: [],
      client_logos: [],
      testimonials: []
    };
  }

  getContactInfo() {
    const stored = this._getFromStorage('contact_info', null);
    if (stored && typeof stored === 'object') {
      return stored;
    }

    return {
      primary_email: 'hello@example-leadership.com',
      primary_phone: '+1 (555) 123-4567',
      office_locations: [
        {
          city: 'New York',
          country: 'USA',
          address_line1: '123 Leadership Way',
          address_line2: 'Suite 500',
          timezone: 'America/New_York'
        }
      ],
      support_hours: 'Monday - Friday, 9:00 AM - 5:00 PM (local time)'
    };
  }

  submitContactForm(name, email, subject, message, reason) {
    if (!name || !email || !subject || !message) {
      return { success: false, ticket_id: null, message: 'All fields are required.' };
    }

    const ticket_id = this._generateId('contact');

    this._sendNotificationEmail('contact_form', {
      ticket_id,
      name,
      email,
      subject,
      message,
      reason: reason || null
    });

    return { success: true, ticket_id, message: 'Your message has been received.' };
  }

  // ---------------------- Legal documents ----------------------

  getLegalDocuments(document_type) {
    const docs = this._getFromStorage('legal_documents', []);
    let results = docs;

    if (document_type) {
      results = docs.filter((d) => d.type === document_type);
    }

    if (results.length === 0 && !document_type) {
      // Provide default placeholders if none stored
      results = [
        {
          type: 'privacy_policy',
          title: 'Privacy Policy',
          content_html: '<p>We respect your privacy and handle your data responsibly.</p>',
          last_updated: new Date().toISOString().slice(0, 10)
        },
        {
          type: 'terms_of_service',
          title: 'Terms of Service',
          content_html: '<p>Use of this site is subject to the following terms and conditions.</p>',
          last_updated: new Date().toISOString().slice(0, 10)
        }
      ];
    }

    return { documents: results };
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
