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
    // Initialize localStorage with default data structures
    this._initStorage();
    this.idCounter = this._getNextIdCounter();
  }

  // ----------------------
  // Storage & ID helpers
  // ----------------------

  _initStorage() {
    const keys = [
      'membership_tiers',
      'membership_applications',
      'events',
      'event_registrations',
      'resources',
      'saved_resources',
      'chapters',
      'chapter_contact_messages',
      'job_postings',
      'saved_jobs',
      'courses',
      'learning_plan_items',
      'newsletter_topics',
      'email_subscriptions',
      'leadership_groups',
      'leaders',
      'followed_leaders',
      'news_articles',
      'saved_news_items'
    ];

    keys.forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    });

    // Optional content/config buckets (kept minimal/empty by default)
    if (!localStorage.getItem('homepage_content')) {
      localStorage.setItem(
        'homepage_content',
        JSON.stringify({
          hero_title: '',
          hero_subtitle: '',
          mission_statement: '',
          value_props: [],
          primary_ctas: []
        })
      );
    }

    if (!localStorage.getItem('membership_overview')) {
      localStorage.setItem(
        'membership_overview',
        JSON.stringify({
          overview_title: '',
          overview_body: '',
          audience_benefits: []
        })
      );
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

  // ----------------------
  // Generic helpers
  // ----------------------

  /**
   * Internal helper to load or initialize single-user state.
   * Returns current arrays; does not mutate.
   */
  _getOrCreateSingleUserState() {
    return {
      saved_resources: this._getFromStorage('saved_resources'),
      saved_jobs: this._getFromStorage('saved_jobs'),
      learning_plan_items: this._getFromStorage('learning_plan_items'),
      followed_leaders: this._getFromStorage('followed_leaders'),
      saved_news_items: this._getFromStorage('saved_news_items')
    };
  }

  /**
   * Generic filter + sort helper.
   * @param {Array} items
   * @param {Function|null} filterFn
   * @param {Object|null} sort
   */
  _applyFiltersAndSorting(items, filterFn, sort) {
    let result = Array.isArray(items) ? items.slice() : [];

    if (typeof filterFn === 'function') {
      result = result.filter(filterFn);
    }

    if (sort && sort.sort_by) {
      const sortBy = sort.sort_by;
      const direction = sort.sort_direction === 'desc' ? -1 : 1;
      result.sort((a, b) => {
        const av = a[sortBy];
        const bv = b[sortBy];

        if (av == null && bv == null) return 0;
        if (av == null) return 1;
        if (bv == null) return -1;

        // Date-like strings
        if (typeof av === 'string' && typeof bv === 'string' && (av.includes('T') || bv.includes('T'))) {
          const ad = new Date(av).getTime();
          const bd = new Date(bv).getTime();
          if (ad === bd) return 0;
          return ad < bd ? -1 * direction : 1 * direction;
        }

        if (av < bv) return -1 * direction;
        if (av > bv) return 1 * direction;
        return 0;
      });
    }

    return result;
  }

  /**
   * Generic entity creation + persistence helper.
   * @param {string} storageKey
   * @param {string} idPrefix
   * @param {Object} data
   */
  _createAndPersistEntity(storageKey, idPrefix, data) {
    const collection = this._getFromStorage(storageKey);
    const id = this._generateId(idPrefix);
    const entity = Object.assign({ id }, data);
    collection.push(entity);
    this._saveToStorage(storageKey, collection);
    return entity;
  }

  // ----------------------
  // Interface implementations
  // ----------------------

  // getHomepageContent
  getHomepageContent() {
    const stored = localStorage.getItem('homepage_content');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        // Fall through to empty structure on parse error
      }
    }
    return {
      hero_title: '',
      hero_subtitle: '',
      mission_statement: '',
      value_props: [],
      primary_ctas: []
    };
  }

  // getHomepageFeaturedItems
  getHomepageFeaturedItems() {
    const events = this._getFromStorage('events');
    const news = this._getFromStorage('news_articles');
    const resources = this._getFromStorage('resources');
    const jobs = this._getFromStorage('job_postings');
    const courses = this._getFromStorage('courses');

    const featured_events = events.filter((e) => e.is_featured === true);
    const featured_news = news.filter((n) => n.is_featured === true);
    const featured_resources = resources.filter((r) => r.is_featured === true);
    const featured_courses = courses.filter((c) => c.is_featured === true);

    // JobPosting has no is_featured in the model; use most recent active jobs as a proxy.
    const featured_jobs = jobs
      .filter((j) => j.is_active === true)
      .sort((a, b) => {
        const ad = a.posted_date ? new Date(a.posted_date).getTime() : 0;
        const bd = b.posted_date ? new Date(b.posted_date).getTime() : 0;
        return bd - ad;
      })
      .slice(0, 5);

    return {
      featured_events,
      featured_news,
      featured_resources,
      featured_jobs,
      featured_courses
    };
  }

  // getMembershipOverview
  getMembershipOverview() {
    const stored = localStorage.getItem('membership_overview');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        // fall through
      }
    }
    return {
      overview_title: '',
      overview_body: '',
      audience_benefits: []
    };
  }

  // getMembershipTiers(filters, sort)
  getMembershipTiers(filters, sort) {
    let tiers = this._getFromStorage('membership_tiers');

    const f = filters || {};
    const activeOnly = f.active_only !== false; // default true

    if (activeOnly) {
      tiers = tiers.filter((t) => t.is_active !== false);
    }

    if (f.includes_annual_conference_discount === true) {
      tiers = tiers.filter((t) => t.includes_annual_conference_discount === true);
    }

    if (typeof f.max_annual_price === 'number') {
      tiers = tiers.filter((t) => typeof t.annual_price === 'number' && t.annual_price <= f.max_annual_price);
    }

    if (typeof f.min_annual_price === 'number') {
      tiers = tiers.filter((t) => typeof t.annual_price === 'number' && t.annual_price >= f.min_annual_price);
    }

    const s = sort || {};
    const sortBy = s.sort_by || 'display_order';
    const sortDir = s.sort_direction === 'desc' ? -1 : 1;

    tiers.sort((a, b) => {
      const av = a[sortBy];
      const bv = b[sortBy];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (av < bv) return -1 * sortDir;
      if (av > bv) return 1 * sortDir;
      return 0;
    });

    return tiers;
  }

  // getMembershipApplicationContext(membership_tier_id)
  getMembershipApplicationContext(membership_tier_id) {
    const tiers = this._getFromStorage('membership_tiers');
    const tier = tiers.find((t) => t.id === membership_tier_id) || null;

    if (!tier) {
      return {
        tier_name: null,
        tier_description: null,
        annual_price: null,
        currency: null,
        billing_frequencies_available: [],
        payment_methods_available: ['invoice_me', 'pay_now_credit_card', 'bank_transfer', 'check', 'other'],
        form_fields: {
          require_organization: false
        }
      };
    }

    return {
      tier_name: tier.name || null,
      tier_description: tier.description || null,
      annual_price: tier.annual_price || null,
      currency: tier.currency || null,
      billing_frequencies_available: tier.billing_frequencies_available || [],
      payment_methods_available: ['invoice_me', 'pay_now_credit_card', 'bank_transfer', 'check', 'other'],
      form_fields: {
        require_organization: false
      }
    };
  }

  // submitMembershipApplication(
  //   membership_tier_id, first_name, last_name, email, organization, billing_frequency, payment_method
  // )
  submitMembershipApplication(
    membership_tier_id,
    first_name,
    last_name,
    email,
    organization,
    billing_frequency,
    payment_method
  ) {
    const tiers = this._getFromStorage('membership_tiers');
    const tier = tiers.find((t) => t.id === membership_tier_id) || null;

    if (!tier) {
      return {
        application: null,
        tier_summary: null,
        success: false,
        message: 'Membership tier not found.'
      };
    }

    const now = new Date().toISOString();

    const application = this._createAndPersistEntity('membership_applications', 'membership_application', {
      membership_tier_id,
      first_name,
      last_name,
      email,
      organization: organization || null,
      billing_frequency: billing_frequency || null,
      payment_method: payment_method || null,
      status: 'submitted',
      created_at: now,
      submitted_at: now,
      internal_notes: null
    });

    return {
      application: {
        id: application.id,
        status: application.status,
        submitted_at: application.submitted_at
      },
      tier_summary: {
        tier_name: tier.name || null,
        annual_price: tier.annual_price || null,
        currency: tier.currency || null
      },
      success: true,
      message: 'Membership application submitted successfully.'
    };
  }

  // getEventListing(view, filters, sort, page, page_size)
  getEventListing(view, filters, sort, page, page_size) {
    let events = this._getFromStorage('events');

    const f = filters || {};
    const nowIso = new Date().toISOString();

    if (Array.isArray(f.event_types) && f.event_types.length > 0) {
      events = events.filter((e) => f.event_types.indexOf(e.event_type) !== -1);
    }

    if (Array.isArray(f.formats) && f.formats.length > 0) {
      events = events.filter((e) => f.formats.indexOf(e.format) !== -1);
    }

    if (Array.isArray(f.cost_types) && f.cost_types.length > 0) {
      events = events.filter((e) => f.cost_types.indexOf(e.cost_type) !== -1);
    }

    if (f.from_date) {
      events = events.filter((e) => e.start_datetime && e.start_datetime >= f.from_date);
    }

    if (f.to_date) {
      events = events.filter((e) => e.start_datetime && e.start_datetime <= f.to_date);
    }

    if (Array.isArray(f.tags) && f.tags.length > 0) {
      events = events.filter((e) => {
        if (!Array.isArray(e.tags)) return false;
        return e.tags.some((tag) => f.tags.indexOf(tag) !== -1);
      });
    }

    const onlyUpcoming = f.only_upcoming !== false; // default true
    if (onlyUpcoming) {
      events = events.filter((e) => e.start_datetime && e.start_datetime >= nowIso);
    }

    const s = sort || {};
    const sortBy = s.sort_by || 'start_datetime';
    const sortDir = s.sort_direction === 'asc' ? 1 : -1; // default desc -> latest first

    events.sort((a, b) => {
      const av = a[sortBy];
      const bv = b[sortBy];
      if (!av && !bv) return 0;
      if (!av) return 1;
      if (!bv) return -1;
      if (sortBy === 'start_datetime') {
        const ad = new Date(av).getTime();
        const bd = new Date(bv).getTime();
        if (ad === bd) return 0;
        return ad < bd ? -1 * sortDir : 1 * sortDir;
      }
      if (av < bv) return -1 * sortDir;
      if (av > bv) return 1 * sortDir;
      return 0;
    });

    const pg = typeof page === 'number' && page > 0 ? page : 1;
    const ps = typeof page_size === 'number' && page_size > 0 ? page_size : 20;
    const total_count = events.length;
    const start = (pg - 1) * ps;
    const items = events.slice(start, start + ps);

    return {
      items,
      total_count,
      page: pg,
      page_size: ps
    };
  }

  // getEventCalendarView(filters)
  getEventCalendarView(filters) {
    let events = this._getFromStorage('events');
    const f = filters || {};

    if (Array.isArray(f.event_types) && f.event_types.length > 0) {
      events = events.filter((e) => f.event_types.indexOf(e.event_type) !== -1);
    }

    if (f.from_date) {
      events = events.filter((e) => e.start_datetime && e.start_datetime >= f.from_date);
    }

    if (f.to_date) {
      events = events.filter((e) => e.start_datetime && e.start_datetime <= f.to_date);
    }

    const grouped = {};
    events.forEach((e) => {
      if (!e.start_datetime) return;
      const dateStr = e.start_datetime.split('T')[0];
      if (!grouped[dateStr]) grouped[dateStr] = [];
      grouped[dateStr].push(e);
    });

    const dates = Object.keys(grouped).sort();
    return dates.map((date) => ({
      date,
      events: grouped[date]
    }));
  }

  // getEventDetail(event_id)
  getEventDetail(event_id) {
    const events = this._getFromStorage('events');
    const event = events.find((e) => e.id === event_id) || null;

    const is_free_online_webinar = !!(
      event &&
      event.event_type === 'webinar' &&
      event.format === 'online' &&
      event.cost_type === 'free'
    );

    return {
      event,
      is_free_online_webinar
    };
  }

  // registerForEvent(event_id, full_name, email, participant_type)
  registerForEvent(event_id, full_name, email, participant_type) {
    const events = this._getFromStorage('events');
    const event = events.find((e) => e.id === event_id) || null;

    if (!event) {
      return {
        registration: null,
        event_title: null,
        success: false,
        message: 'Event not found.'
      };
    }

    const now = new Date().toISOString();

    const registration = this._createAndPersistEntity('event_registrations', 'event_registration', {
      event_id,
      full_name,
      email,
      participant_type: participant_type || null,
      registration_status: 'registered',
      registered_at: now
    });

    return {
      registration: {
        id: registration.id,
        registration_status: registration.registration_status,
        registered_at: registration.registered_at
      },
      event_title: event.title || null,
      success: true,
      message: 'Registration completed successfully.'
    };
  }

  // getResourceListing(filters, sort, page, page_size)
  getResourceListing(filters, sort, page, page_size) {
    let resources = this._getFromStorage('resources');
    const f = filters || {};

    if (f.category) {
      resources = resources.filter((r) => r.category === f.category);
    }

    if (typeof f.is_standard_or_guideline === 'boolean') {
      resources = resources.filter((r) => !!r.is_standard_or_guideline === f.is_standard_or_guideline);
    }

    if (Array.isArray(f.topics) && f.topics.length > 0) {
      resources = resources.filter((r) => {
        if (!Array.isArray(r.topics)) return false;
        return r.topics.some((t) => f.topics.indexOf(t) !== -1);
      });
    }

    const getYear = (r) => {
      if (typeof r.publication_year === 'number') return r.publication_year;
      if (r.publication_date) {
        const d = new Date(r.publication_date);
        if (!isNaN(d.getTime())) return d.getFullYear();
      }
      return null;
    };

    if (typeof f.min_publication_year === 'number') {
      resources = resources.filter((r) => {
        const y = getYear(r);
        return y == null ? false : y >= f.min_publication_year;
      });
    }

    if (typeof f.max_publication_year === 'number') {
      resources = resources.filter((r) => {
        const y = getYear(r);
        return y == null ? false : y <= f.max_publication_year;
      });
    }

    const activeOnly = f.active_only !== false; // default true
    if (activeOnly) {
      resources = resources.filter((r) => r.is_active !== false);
    }

    const s = sort || {};
    const sortBy = s.sort_by || 'publication_date';
    const sortDir = s.sort_direction === 'asc' ? 1 : -1; // default desc

    resources.sort((a, b) => {
      let av = a[sortBy];
      let bv = b[sortBy];

      if (sortBy === 'publication_date') {
        const ad = a.publication_date ? new Date(a.publication_date).getTime() : 0;
        const bd = b.publication_date ? new Date(b.publication_date).getTime() : 0;
        if (ad === bd) return 0;
        return ad < bd ? -1 * sortDir : 1 * sortDir;
      }

      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (av < bv) return -1 * sortDir;
      if (av > bv) return 1 * sortDir;
      return 0;
    });

    const pg = typeof page === 'number' && page > 0 ? page : 1;
    const ps = typeof page_size === 'number' && page_size > 0 ? page_size : 20;
    const total_count = resources.length;
    const start = (pg - 1) * ps;
    const items = resources.slice(start, start + ps);

    return {
      items,
      total_count,
      page: pg,
      page_size: ps
    };
  }

  // getResourceDetail(resource_id)
  getResourceDetail(resource_id) {
    const resources = this._getFromStorage('resources');
    const resource = resources.find((r) => r.id === resource_id) || null;
    return { resource };
  }

  // saveResource(resource_id)
  saveResource(resource_id) {
    const saved = this._getFromStorage('saved_resources');
    const existing = saved.find((s) => s.resource_id === resource_id) || null;

    if (existing) {
      return {
        saved_resource: existing,
        already_saved: true,
        success: true,
        message: 'Resource already saved.'
      };
    }

    const now = new Date().toISOString();
    const saved_resource = this._createAndPersistEntity('saved_resources', 'saved_resource', {
      resource_id,
      saved_at: now
    });

    return {
      saved_resource,
      already_saved: false,
      success: true,
      message: 'Resource saved successfully.'
    };
  }

  // getSavedResources() with foreign key resolution
  getSavedResources() {
    const saved = this._getFromStorage('saved_resources');
    const resources = this._getFromStorage('resources');

    const items = saved
      .slice()
      .sort((a, b) => {
        const ad = a.saved_at ? new Date(a.saved_at).getTime() : 0;
        const bd = b.saved_at ? new Date(b.saved_at).getTime() : 0;
        return bd - ad;
      })
      .map((item) => {
        const resource = resources.find((r) => r.id === item.resource_id) || null;
        return Object.assign({}, item, { resource });
      });

    return { items };
  }

  // removeSavedResource(saved_resource_id)
  removeSavedResource(saved_resource_id) {
    const saved = this._getFromStorage('saved_resources');
    const newSaved = saved.filter((s) => s.id !== saved_resource_id);
    const removed = newSaved.length !== saved.length;
    this._saveToStorage('saved_resources', newSaved);

    return {
      success: removed,
      message: removed ? 'Saved resource removed.' : 'Saved resource not found.'
    };
  }

  // getChaptersListing(filters, sort)
  getChaptersListing(filters, sort) {
    let chapters = this._getFromStorage('chapters');
    const f = filters || {};

    if (f.state) {
      chapters = chapters.filter((c) => c.state === f.state);
    }

    if (f.country) {
      chapters = chapters.filter((c) => c.country === f.country);
    }

    const s = sort || {};
    const sortBy = s.sort_by || 'name';
    const sortDir = s.sort_direction === 'desc' ? -1 : 1;

    chapters.sort((a, b) => {
      const av = a[sortBy];
      const bv = b[sortBy];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (av < bv) return -1 * sortDir;
      if (av > bv) return 1 * sortDir;
      return 0;
    });

    return chapters;
  }

  // getChapterDetail(chapter_id)
  getChapterDetail(chapter_id) {
    const chapters = this._getFromStorage('chapters');
    const chapter = chapters.find((c) => c.id === chapter_id) || null;
    return { chapter };
  }

  // contactChapter(chapter_id, name, email, subject_type, subject_text, message)
  contactChapter(chapter_id, name, email, subject_type, subject_text, message) {
    const chapters = this._getFromStorage('chapters');
    const chapter = chapters.find((c) => c.id === chapter_id) || null;

    if (!chapter) {
      return {
        contact_message: null,
        success: false,
        message: 'Chapter not found.'
      };
    }

    const now = new Date().toISOString();

    const contact_message = this._createAndPersistEntity('chapter_contact_messages', 'chapter_contact_message', {
      chapter_id,
      name,
      email,
      subject_type: subject_type || null,
      subject_text: subject_text || null,
      message,
      submitted_at: now,
      status: 'sent'
    });

    return {
      contact_message: {
        id: contact_message.id,
        status: contact_message.status,
        submitted_at: contact_message.submitted_at
      },
      success: true,
      message: 'Your message has been sent to the chapter.'
    };
  }

  // searchJobPostings(query, filters, sort, page, page_size)
  searchJobPostings(query, filters, sort, page, page_size) {
    let jobs = this._getFromStorage('job_postings');

    const q = (query || '').trim().toLowerCase();
    if (q) {
      jobs = jobs.filter((job) => {
        const haystack = [
          job.title || '',
          job.description || '',
          job.employer_name || '',
          Array.isArray(job.keywords) ? job.keywords.join(' ') : ''
        ]
          .join(' ')
          .toLowerCase();
        return haystack.indexOf(q) !== -1;
      });
    }

    const f = filters || {};

    if (Array.isArray(f.location_types) && f.location_types.length > 0) {
      jobs = jobs.filter((j) => f.location_types.indexOf(j.location_type) !== -1);
    }

    if (typeof f.min_salary === 'number') {
      jobs = jobs.filter((j) => {
        const min = typeof j.salary_min === 'number' ? j.salary_min : null;
        const max = typeof j.salary_max === 'number' ? j.salary_max : null;
        if (min == null && max == null) return false;
        if (max != null) return max >= f.min_salary;
        return min != null ? min >= f.min_salary : false;
      });
    }

    if (f.salary_frequency) {
      jobs = jobs.filter((j) => j.salary_frequency === f.salary_frequency);
    }

    if (f.currency) {
      jobs = jobs.filter((j) => j.salary_currency === f.currency);
    }

    const onlyActive = f.only_active !== false; // default true
    if (onlyActive) {
      jobs = jobs.filter((j) => j.is_active !== false);
    }

    const s = sort || {};
    const sortBy = s.sort_by || 'posted_date';
    const sortDir = s.sort_direction === 'asc' ? 1 : -1; // default desc

    jobs.sort((a, b) => {
      const av = a[sortBy];
      const bv = b[sortBy];

      if (sortBy === 'posted_date') {
        const ad = a.posted_date ? new Date(a.posted_date).getTime() : 0;
        const bd = b.posted_date ? new Date(b.posted_date).getTime() : 0;
        if (ad === bd) return 0;
        return ad < bd ? -1 * sortDir : 1 * sortDir;
      }

      if (sortBy === 'salary_max' || sortBy === 'salary_min') {
        const an = typeof av === 'number' ? av : 0;
        const bn = typeof bv === 'number' ? bv : 0;
        if (an === bn) return 0;
        return an < bn ? -1 * sortDir : 1 * sortDir;
      }

      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (av < bv) return -1 * sortDir;
      if (av > bv) return 1 * sortDir;
      return 0;
    });

    const pg = typeof page === 'number' && page > 0 ? page : 1;
    const ps = typeof page_size === 'number' && page_size > 0 ? page_size : 20;
    const total_count = jobs.length;
    const start = (pg - 1) * ps;
    const items = jobs.slice(start, start + ps);

    return {
      items,
      total_count,
      page: pg,
      page_size: ps
    };
  }

  // getJobPostingDetail(job_posting_id)
  getJobPostingDetail(job_posting_id) {
    const jobs = this._getFromStorage('job_postings');
    const job_posting = jobs.find((j) => j.id === job_posting_id) || null;

    const is_remote_or_telecommute = !!(
      job_posting &&
      (job_posting.location_type === 'remote' || job_posting.location_type === 'telecommute')
    );

    return {
      job_posting,
      is_remote_or_telecommute
    };
  }

  // saveJobPosting(job_posting_id)
  saveJobPosting(job_posting_id) {
    const saved = this._getFromStorage('saved_jobs');
    const existing = saved.find((s) => s.job_posting_id === job_posting_id) || null;

    if (existing) {
      return {
        saved_job: existing,
        already_saved: true,
        success: true,
        message: 'Job already saved.'
      };
    }

    const now = new Date().toISOString();
    const saved_job = this._createAndPersistEntity('saved_jobs', 'saved_job', {
      job_posting_id,
      saved_at: now
    });

    return {
      saved_job,
      already_saved: false,
      success: true,
      message: 'Job saved successfully.'
    };
  }

  // getSavedJobs() with foreign key resolution
  getSavedJobs() {
    const saved = this._getFromStorage('saved_jobs');
    const jobs = this._getFromStorage('job_postings');

    const items = saved
      .slice()
      .sort((a, b) => {
        const ad = a.saved_at ? new Date(a.saved_at).getTime() : 0;
        const bd = b.saved_at ? new Date(b.saved_at).getTime() : 0;
        return bd - ad;
      })
      .map((item) => {
        const job_posting = jobs.find((j) => j.id === item.job_posting_id) || null;
        return Object.assign({}, item, { job_posting });
      });

    return { items };
  }

  // removeSavedJob(saved_job_id)
  removeSavedJob(saved_job_id) {
    const saved = this._getFromStorage('saved_jobs');
    const newSaved = saved.filter((s) => s.id !== saved_job_id);
    const removed = newSaved.length !== saved.length;
    this._saveToStorage('saved_jobs', newSaved);

    return {
      success: removed,
      message: removed ? 'Saved job removed.' : 'Saved job not found.'
    };
  }

  // searchCourses(filters, sort, page, page_size)
  searchCourses(filters, sort, page, page_size) {
    let courses = this._getFromStorage('courses');
    const f = filters || {};

    if (Array.isArray(f.delivery_methods) && f.delivery_methods.length > 0) {
      courses = courses.filter((c) => f.delivery_methods.indexOf(c.delivery_method) !== -1);
    }

    if (typeof f.min_ce_credits === 'number') {
      courses = courses.filter((c) => typeof c.ce_credits === 'number' && c.ce_credits >= f.min_ce_credits);
    }

    if (typeof f.max_price === 'number') {
      courses = courses.filter((c) => typeof c.price === 'number' && c.price <= f.max_price);
    }

    if (f.currency) {
      courses = courses.filter((c) => c.currency === f.currency);
    }

    const activeOnly = f.active_only !== false; // default true
    if (activeOnly) {
      courses = courses.filter((c) => c.is_active !== false);
    }

    const s = sort || {};
    const sortBy = s.sort_by || 'title';
    const sortDir = s.sort_direction === 'desc' ? -1 : 1;

    courses.sort((a, b) => {
      const av = a[sortBy];
      const bv = b[sortBy];

      if (sortBy === 'price') {
        const an = typeof av === 'number' ? av : Number.MAX_SAFE_INTEGER;
        const bn = typeof bv === 'number' ? bv : Number.MAX_SAFE_INTEGER;
        if (an === bn) return 0;
        return an < bn ? -1 * sortDir : 1 * sortDir;
      }

      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (av < bv) return -1 * sortDir;
      if (av > bv) return 1 * sortDir;
      return 0;
    });

    const pg = typeof page === 'number' && page > 0 ? page : 1;
    const ps = typeof page_size === 'number' && page_size > 0 ? page_size : 20;
    const total_count = courses.length;
    const start = (pg - 1) * ps;
    const items = courses.slice(start, start + ps);

    return {
      items,
      total_count,
      page: pg,
      page_size: ps
    };
  }

  // getCourseDetail(course_id)
  getCourseDetail(course_id) {
    const courses = this._getFromStorage('courses');
    const course = courses.find((c) => c.id === course_id) || null;
    return { course };
  }

  // addCourseToLearningPlan(course_id, status)
  addCourseToLearningPlan(course_id, status) {
    const plan = this._getFromStorage('learning_plan_items');
    const existing = plan.find((p) => p.course_id === course_id) || null;

    if (existing) {
      return {
        learning_plan_item: existing,
        already_in_plan: true,
        success: true,
        message: 'Course already in learning plan.'
      };
    }

    const now = new Date().toISOString();
    const learning_plan_item = this._createAndPersistEntity('learning_plan_items', 'learning_plan_item', {
      course_id,
      status: status || 'planned',
      added_at: now
    });

    return {
      learning_plan_item,
      already_in_plan: false,
      success: true,
      message: 'Course added to learning plan.'
    };
  }

  // getLearningPlan() with foreign key resolution
  getLearningPlan() {
    const itemsRaw = this._getFromStorage('learning_plan_items');
    const courses = this._getFromStorage('courses');

    const items = itemsRaw
      .slice()
      .sort((a, b) => {
        const ad = a.added_at ? new Date(a.added_at).getTime() : 0;
        const bd = b.added_at ? new Date(b.added_at).getTime() : 0;
        return bd - ad;
      })
      .map((item) => {
        const course = courses.find((c) => c.id === item.course_id) || null;
        return Object.assign({}, item, { course });
      });

    return { items };
  }

  // removeLearningPlanItem(learning_plan_item_id)
  removeLearningPlanItem(learning_plan_item_id) {
    const plan = this._getFromStorage('learning_plan_items');
    const newPlan = plan.filter((p) => p.id !== learning_plan_item_id);
    const removed = newPlan.length !== plan.length;
    this._saveToStorage('learning_plan_items', newPlan);

    return {
      success: removed,
      message: removed ? 'Learning plan item removed.' : 'Learning plan item not found.'
    };
  }

  // getNewsletterTopics()
  getNewsletterTopics() {
    return this._getFromStorage('newsletter_topics');
  }

  // subscribeToNewsletters(email, full_name, subscribe_all_topics, selected_topic_codes, frequency)
  subscribeToNewsletters(email, full_name, subscribe_all_topics, selected_topic_codes, frequency) {
    const subs = this._getFromStorage('email_subscriptions');
    const topics = this._getFromStorage('newsletter_topics');

    let subscribeAll = !!subscribe_all_topics;
    let selectedCodes = Array.isArray(selected_topic_codes) ? selected_topic_codes.slice() : [];

    if (subscribeAll) {
      selectedCodes = topics.map((t) => t.code);
    }

    const now = new Date().toISOString();

    const existingIndex = subs.findIndex((s) => s.email === email);
    let subscription;

    if (existingIndex !== -1) {
      const existing = subs[existingIndex];
      subscription = Object.assign({}, existing, {
        full_name: full_name || existing.full_name || null,
        subscribe_all_topics: subscribeAll,
        selected_topic_codes: selectedCodes,
        frequency,
        status: 'active',
        updated_at: now
      });
      subs[existingIndex] = subscription;
    } else {
      subscription = this._createAndPersistEntity('email_subscriptions', 'email_subscription', {
        email,
        full_name: full_name || null,
        subscribe_all_topics: subscribeAll,
        selected_topic_codes: selectedCodes,
        frequency,
        status: 'active',
        created_at: now,
        updated_at: now
      });
    }

    this._saveToStorage('email_subscriptions', subs);

    return {
      subscription: {
        id: subscription.id,
        status: subscription.status,
        created_at: subscription.created_at,
        updated_at: subscription.updated_at
      },
      success: true,
      message: 'Subscription preferences saved.'
    };
  }

  // getLeadershipGroups()
  getLeadershipGroups() {
    const groups = this._getFromStorage('leadership_groups');
    return groups
      .slice()
      .sort((a, b) => {
        const av = typeof a.display_order === 'number' ? a.display_order : Number.MAX_SAFE_INTEGER;
        const bv = typeof b.display_order === 'number' ? b.display_order : Number.MAX_SAFE_INTEGER;
        if (av === bv) return 0;
        return av < bv ? -1 : 1;
      });
  }

  // getLeadersListing(filters, sort)
  getLeadersListing(filters, sort) {
    let leaders = this._getFromStorage('leaders');
    const f = filters || {};

    if (f.group_code) {
      leaders = leaders.filter((l) => l.group_code === f.group_code);
    }

    if (typeof f.is_board_chair === 'boolean') {
      leaders = leaders.filter((l) => !!l.is_board_chair === f.is_board_chair);
    }

    const activeOnly = f.active_only !== false; // default true
    if (activeOnly) {
      leaders = leaders.filter((l) => l.is_active !== false);
    }

    const s = sort || {};
    const sortBy = s.sort_by || 'priority';
    const sortDir = s.sort_direction === 'desc' ? -1 : 1;

    leaders.sort((a, b) => {
      let av = a[sortBy];
      let bv = b[sortBy];

      if (sortBy === 'priority') {
        av = typeof av === 'number' ? av : Number.MAX_SAFE_INTEGER;
        bv = typeof bv === 'number' ? bv : Number.MAX_SAFE_INTEGER;
      }

      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (av < bv) return -1 * sortDir;
      if (av > bv) return 1 * sortDir;
      return 0;
    });

    return leaders;
  }

  // getCurrentBoardChair()
  getCurrentBoardChair() {
    const leaders = this._getFromStorage('leaders');
    const chairs = leaders.filter((l) => l.is_board_chair === true && l.is_active !== false);

    if (chairs.length === 0) {
      return { leader: null };
    }

    chairs.sort((a, b) => {
      const av = typeof a.priority === 'number' ? a.priority : Number.MAX_SAFE_INTEGER;
      const bv = typeof b.priority === 'number' ? b.priority : Number.MAX_SAFE_INTEGER;
      if (av === bv) return 0;
      return av < bv ? -1 : 1;
    });

    return { leader: chairs[0] };
  }

  // getLeaderProfile(leader_id)
  getLeaderProfile(leader_id) {
    const leaders = this._getFromStorage('leaders');
    const leader = leaders.find((l) => l.id === leader_id) || null;
    return { leader };
  }

  // followLeaderProfile(leader_id, list_name)
  followLeaderProfile(leader_id, list_name) {
    const listName = list_name || 'my_followed_leaders';
    const followed = this._getFromStorage('followed_leaders');

    const existing = followed.find(
      (f) => f.leader_id === leader_id && f.list_name === listName
    );

    if (existing) {
      return {
        followed_leader: existing,
        already_following: true,
        success: true,
        message: 'Leader already followed.'
      };
    }

    const now = new Date().toISOString();
    const followed_leader = this._createAndPersistEntity('followed_leaders', 'followed_leader', {
      leader_id,
      list_name: listName,
      followed_at: now
    });

    return {
      followed_leader,
      already_following: false,
      success: true,
      message: 'Leader followed successfully.'
    };
  }

  // getFollowedLeaders(list_name) with foreign key resolution
  getFollowedLeaders(list_name) {
    const followed = this._getFromStorage('followed_leaders');
    const leaders = this._getFromStorage('leaders');

    let items = followed;
    if (list_name) {
      items = items.filter((f) => f.list_name === list_name);
    }

    items = items
      .slice()
      .sort((a, b) => {
        const ad = a.followed_at ? new Date(a.followed_at).getTime() : 0;
        const bd = b.followed_at ? new Date(b.followed_at).getTime() : 0;
        return bd - ad;
      })
      .map((item) => {
        const leader = leaders.find((l) => l.id === item.leader_id) || null;
        return Object.assign({}, item, { leader });
      });

    return { items };
  }

  // unfollowLeader(followed_leader_id)
  unfollowLeader(followed_leader_id) {
    const followed = this._getFromStorage('followed_leaders');
    const newFollowed = followed.filter((f) => f.id !== followed_leader_id);
    const removed = newFollowed.length !== followed.length;
    this._saveToStorage('followed_leaders', newFollowed);

    return {
      success: removed,
      message: removed ? 'Leader unfollowed.' : 'Followed leader not found.'
    };
  }

  // getNewsListing(filters, sort, page, page_size)
  getNewsListing(filters, sort, page, page_size) {
    let news = this._getFromStorage('news_articles');
    const f = filters || {};

    if (f.category) {
      news = news.filter((n) => n.category === f.category);
    }

    if (Array.isArray(f.topics) && f.topics.length > 0) {
      news = news.filter((n) => {
        if (!Array.isArray(n.topics)) return false;
        return n.topics.some((t) => f.topics.indexOf(t) !== -1);
      });
    }

    if (Array.isArray(f.tags) && f.tags.length > 0) {
      news = news.filter((n) => {
        if (!Array.isArray(n.tags)) return false;
        return n.tags.some((t) => f.tags.indexOf(t) !== -1);
      });
    }

    if (f.from_publication_date) {
      news = news.filter(
        (n) => n.publication_date && n.publication_date >= f.from_publication_date
      );
    }

    if (f.to_publication_date) {
      news = news.filter(
        (n) => n.publication_date && n.publication_date <= f.to_publication_date
      );
    }

    const s = sort || {};
    const sortBy = s.sort_by || 'publication_date';
    const sortDir = s.sort_direction === 'asc' ? 1 : -1; // default desc

    news.sort((a, b) => {
      const av = a[sortBy];
      const bv = b[sortBy];

      if (sortBy === 'publication_date') {
        const ad = a.publication_date ? new Date(a.publication_date).getTime() : 0;
        const bd = b.publication_date ? new Date(b.publication_date).getTime() : 0;
        if (ad === bd) return 0;
        return ad < bd ? -1 * sortDir : 1 * sortDir;
      }

      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (av < bv) return -1 * sortDir;
      if (av > bv) return 1 * sortDir;
      return 0;
    });

    const pg = typeof page === 'number' && page > 0 ? page : 1;
    const ps = typeof page_size === 'number' && page_size > 0 ? page_size : 20;
    const total_count = news.length;
    const start = (pg - 1) * ps;
    const items = news.slice(start, start + ps);

    return {
      items,
      total_count,
      page: pg,
      page_size: ps
    };
  }

  // getNewsArticleDetail(news_article_id)
  getNewsArticleDetail(news_article_id) {
    const news = this._getFromStorage('news_articles');
    const article = news.find((n) => n.id === news_article_id) || null;
    return { article };
  }

  // saveNewsArticle(news_article_id)
  saveNewsArticle(news_article_id) {
    const saved = this._getFromStorage('saved_news_items');
    const existing = saved.find((s) => s.news_article_id === news_article_id) || null;

    if (existing) {
      return {
        saved_news_item: existing,
        already_saved: true,
        success: true,
        message: 'News article already saved.'
      };
    }

    const now = new Date().toISOString();
    const saved_news_item = this._createAndPersistEntity('saved_news_items', 'saved_news_item', {
      news_article_id,
      saved_at: now
    });

    return {
      saved_news_item,
      already_saved: false,
      success: true,
      message: 'News article saved successfully.'
    };
  }

  // getSavedNews() with foreign key resolution
  getSavedNews() {
    const saved = this._getFromStorage('saved_news_items');
    const news = this._getFromStorage('news_articles');

    const items = saved
      .slice()
      .sort((a, b) => {
        const ad = a.saved_at ? new Date(a.saved_at).getTime() : 0;
        const bd = b.saved_at ? new Date(b.saved_at).getTime() : 0;
        return bd - ad;
      })
      .map((item) => {
        const news_article = news.find((n) => n.id === item.news_article_id) || null;
        return Object.assign({}, item, { news_article });
      });

    return { items };
  }

  // removeSavedNewsItem(saved_news_item_id)
  removeSavedNewsItem(saved_news_item_id) {
    const saved = this._getFromStorage('saved_news_items');
    const newSaved = saved.filter((s) => s.id !== saved_news_item_id);
    const removed = newSaved.length !== saved.length;
    this._saveToStorage('saved_news_items', newSaved);

    return {
      success: removed,
      message: removed ? 'Saved news item removed.' : 'Saved news item not found.'
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
