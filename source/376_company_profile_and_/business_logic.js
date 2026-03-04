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
    // Entity tables
    const tableKeys = [
      'blog_articles',
      'reading_lists',
      'reading_list_items',
      'newsletter_subscriptions',
      'case_studies',
      'contact_submissions',
      'team_members',
      'sustainability_reports',
      'events',
      'webinar_registrations',
      'job_postings',
      'job_applications',
      'contact_email_queue'
    ];

    for (let i = 0; i < tableKeys.length; i++) {
      const key = tableKeys[i];
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    }

    // ID counter
    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }

    // Config / content structures (initialized once if missing)
    if (!localStorage.getItem('home_hero_content')) {
      const hero = {
        headline: 'Designing better products, together.',
        subheadline: 'We help teams ship user-centered digital products through research, design, and analytics.',
        value_propositions: [
          'End-to-end UX research and product design',
          'Proven impact through measurable case studies',
          'Distributed team experienced in remote collaboration'
        ],
        key_differentiators: [
          'Industry expertise in healthcare, SaaS, and fintech',
          'Embedded teams that work like your own',
          'A data-informed approach to design decisions'
        ],
        primary_ctas: [
          { label: 'Explore our blog', target_page: 'blog', style: 'primary' },
          { label: 'See case studies', target_page: 'resources_case_studies', style: 'secondary' },
          { label: 'View open roles', target_page: 'careers', style: 'ghost' }
        ]
      };
      localStorage.setItem('home_hero_content', JSON.stringify(hero));
    }

    if (!localStorage.getItem('home_careers_promo')) {
      const promo = {
        headline: 'Join our distributed team',
        subheadline: 'Work with product, design, and research experts around the world.',
        open_roles_count: 0,
        highlight_departments: ['design', 'product', 'engineering'],
        cta_label: 'View open roles'
      };
      localStorage.setItem('home_careers_promo', JSON.stringify(promo));
    }

    if (!localStorage.getItem('about_page_content')) {
      const aboutContent = {
        mission: 'To help organizations build products that are delightful for users and effective for business.',
        values: [
          'Put users first',
          'Collaborate openly',
          'Measure what matters',
          'Act sustainably'
        ],
        history: 'Founded by UX, product, and engineering leaders, we have partnered with organizations across industries to deliver product transformations.',
        services_overview: 'We offer UX research, product design, design systems, analytics strategy, and implementation support.',
        impact_areas: ['Healthcare', 'B2B SaaS', 'Fintech', 'E-commerce'],
        awards_and_certifications: [],
        subpage_links: [
          { id: 'our_team', label: 'Our Team' },
          { id: 'sustainability', label: 'Sustainability' }
        ],
        contact_cta_label: 'Talk to our team'
      };
      localStorage.setItem('about_page_content', JSON.stringify(aboutContent));
    }

    if (!localStorage.getItem('sustainability_page_content')) {
      const sust = {
        strategy: 'We integrate sustainability into how we operate, choose partners, and design products.',
        goals: [
          'Reduce operational emissions year over year',
          'Support inclusive, accessible product experiences',
          'Partner with organizations focused on positive impact'
        ],
        key_initiatives: [
          'Remote-first operations to reduce travel emissions',
          'Pro-bono projects for mission-driven organizations',
          'Annual impact reporting with Scope 1, 2, and 3 disclosures'
        ],
        impact_reports_intro: 'Explore our annual impact and sustainability reports.'
      };
      localStorage.setItem('sustainability_page_content', JSON.stringify(sust));
    }

    if (!localStorage.getItem('contact_page_content')) {
      const contact = {
        intro_text: 'Reach out to our team for sales, support, media, or general questions.',
        support_email: 'support@example.com',
        sales_email: 'sales@example.com',
        phone_number: '+1 (555) 555-0100',
        post_submit_message: 'Thanks for contacting us. We will get back to you shortly.'
      };
      localStorage.setItem('contact_page_content', JSON.stringify(contact));
    }

    if (!localStorage.getItem('contact_topics')) {
      const contactTopics = [
        { id: 'sales_inquiry', label: 'Sales inquiry' },
        { id: 'support', label: 'Product support' },
        { id: 'media', label: 'Media / press' },
        { id: 'general_question', label: 'General question' }
      ];
      localStorage.setItem('contact_topics', JSON.stringify(contactTopics));
    }

    if (!localStorage.getItem('privacy_policy_content')) {
      const privacy = {
        last_updated: this._nowISO(),
        content: 'We respect your privacy. This policy explains what data we collect, how we use it, and your rights.',
        data_subject_rights: [
          'Right to access',
          'Right to rectification',
          'Right to erasure',
          'Right to data portability',
          'Right to object'
        ],
        privacy_contact_instructions: 'For any privacy-related questions or requests, please contact privacy@example.com.'
      };
      localStorage.setItem('privacy_policy_content', JSON.stringify(privacy));
    }

    if (!localStorage.getItem('blog_filter_options')) {
      const blogFilterOptions = {
        categories: [
          { id: 'remote_work', label: 'Remote work' },
          { id: 'ux_research', label: 'UX Research' },
          { id: 'product_design', label: 'Product Design' },
          { id: 'analytics', label: 'Analytics' },
          { id: 'company_news', label: 'Company news' },
          { id: 'other', label: 'Other' }
        ],
        reading_time_options: [
          { id: 'under_8_minutes', label: 'Under 8 minutes', max_minutes: 8 },
          { id: 'twelve_or_less', label: '12 minutes or less', max_minutes: 12 }
        ],
        rating_options: [
          { id: 'four_point_five_up', label: '4.5 stars & up', min_rating: 4.5 },
          { id: 'four_up', label: '4.0 stars & up', min_rating: 4.0 }
        ],
        date_presets: [
          { id: 'last_30_days', label: 'Last 30 days' },
          { id: 'this_year', label: 'This year' }
        ],
        sort_options: [
          { id: 'newest_first', label: 'Newest first' },
          { id: 'most_viewed', label: 'Most viewed' }
        ]
      };
      localStorage.setItem('blog_filter_options', JSON.stringify(blogFilterOptions));
    }

    if (!localStorage.getItem('event_filter_options')) {
      const eventFilterOptions = {
        date_presets: [
          { id: 'next_30_days', label: 'Next 30 days' },
          { id: 'next_60_days', label: 'Next 60 days' }
        ],
        time_zones: [
          { id: 'est', label: 'EST (Eastern Time)' },
          { id: 'pst', label: 'PST (Pacific Time)' },
          { id: 'cst', label: 'CST (Central Time)' },
          { id: 'mst', label: 'MST (Mountain Time)' },
          { id: 'gmt', label: 'GMT' },
          { id: 'cet', label: 'CET (Central European Time)' },
          { id: 'ist', label: 'IST (India Standard Time)' },
          { id: 'other', label: 'Other' }
        ],
        event_types: [
          { id: 'webinar', label: 'Webinar' },
          { id: 'virtual_event', label: 'Virtual event' },
          { id: 'in_person_event', label: 'In-person event' },
          { id: 'conference', label: 'Conference' },
          { id: 'workshop', label: 'Workshop' }
        ]
      };
      localStorage.setItem('event_filter_options', JSON.stringify(eventFilterOptions));
    }

    if (!localStorage.getItem('case_study_filter_options')) {
      const caseStudyFilterOptions = {
        industries: [
          { id: 'healthcare', label: 'Healthcare' },
          { id: 'finance', label: 'Finance' },
          { id: 'retail', label: 'Retail' },
          { id: 'technology', label: 'Technology' },
          { id: 'manufacturing', label: 'Manufacturing' },
          { id: 'other', label: 'Other' }
        ]
      };
      localStorage.setItem('case_study_filter_options', JSON.stringify(caseStudyFilterOptions));
    }

    if (!localStorage.getItem('job_filter_options')) {
      const jobFilterOptions = {
        departments: [
          { id: 'design', label: 'Design' },
          { id: 'engineering', label: 'Engineering' },
          { id: 'product', label: 'Product' },
          { id: 'sales', label: 'Sales' },
          { id: 'marketing', label: 'Marketing' },
          { id: 'operations', label: 'Operations' },
          { id: 'customer_success', label: 'Customer success' },
          { id: 'people', label: 'People' },
          { id: 'finance', label: 'Finance' },
          { id: 'other', label: 'Other' }
        ],
        location_types: [
          { id: 'remote', label: 'Remote' },
          { id: 'onsite', label: 'Onsite' },
          { id: 'hybrid', label: 'Hybrid' }
        ],
        sort_options: [
          { id: 'newest_first', label: 'Newest first' },
          { id: 'oldest_first', label: 'Oldest first' }
        ]
      };
      localStorage.setItem('job_filter_options', JSON.stringify(jobFilterOptions));
    }

    if (!localStorage.getItem('blog_category_banners')) {
      const blogCategoryBanners = {
        remote_work: {
          category: 'remote_work',
          headline: 'Stay updated on remote work',
          subheadline: 'Get practical tips and stories on managing distributed teams.',
          cta_label: 'Subscribe for remote work insights',
          frequency_options: [
            { id: 'weekly', label: 'Weekly' },
            { id: 'monthly', label: 'Monthly' },
            { id: 'quarterly', label: 'Quarterly' }
          ]
        },
        analytics: {
          category: 'analytics',
          headline: 'Better decisions through analytics',
          subheadline: 'Actionable guidance on product and business analytics.',
          cta_label: 'Get analytics tips',
          frequency_options: [
            { id: 'monthly_insights', label: 'Monthly insights' },
            { id: 'weekly', label: 'Weekly' }
          ]
        },
        ux_research: {
          category: 'ux_research',
          headline: 'UX research in your inbox',
          subheadline: 'Methods, case studies, and playbooks from our team.',
          cta_label: 'Subscribe to UX research updates',
          frequency_options: [
            { id: 'monthly', label: 'Monthly' },
            { id: 'quarterly', label: 'Quarterly' }
          ]
        },
        product_design: {
          category: 'product_design',
          headline: 'Product design inspiration',
          subheadline: 'Patterns, systems, and stories from product teams.',
          cta_label: 'Subscribe to product design',
          frequency_options: [
            { id: 'monthly', label: 'Monthly' },
            { id: 'weekly', label: 'Weekly' }
          ]
        }
      };
      localStorage.setItem('blog_category_banners', JSON.stringify(blogCategoryBanners));
    }
  }

  _getFromStorage(key, defaultValue) {
    const raw = localStorage.getItem(key);
    if (!raw) {
      return defaultValue !== undefined ? defaultValue : [];
    }
    try {
      return JSON.parse(raw);
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

  _nowISO() {
    return new Date().toISOString();
  }

  _findById(list, id) {
    for (let i = 0; i < list.length; i++) {
      if (list[i].id === id) return list[i];
    }
    return null;
  }

  // ----------------------
  // Reading list helpers
  // ----------------------

  _getOrCreateReadingList() {
    let readingLists = this._getFromStorage('reading_lists', []);
    if (readingLists.length > 0) {
      return readingLists[0];
    }
    const newList = {
      id: this._generateId('reading_list'),
      name: 'My Reading List',
      created_at: this._nowISO(),
      updated_at: this._nowISO()
    };
    readingLists.push(newList);
    this._saveToStorage('reading_lists', readingLists);
    return newList;
  }

  _updateReadingListTimestamp(readingListId) {
    const readingLists = this._getFromStorage('reading_lists', []);
    let changed = false;
    for (let i = 0; i < readingLists.length; i++) {
      if (readingLists[i].id === readingListId) {
        readingLists[i].updated_at = this._nowISO();
        changed = true;
        break;
      }
    }
    if (changed) {
      this._saveToStorage('reading_lists', readingLists);
    }
  }

  _saveReadingListItem(readingListId, articleId, source) {
    const readingListItems = this._getFromStorage('reading_list_items', []);
    const now = this._nowISO();
    const item = {
      id: this._generateId('reading_list_item'),
      reading_list_id: readingListId,
      article_id: articleId,
      saved_at: now,
      source: source || null,
      notes: ''
    };
    readingListItems.push(item);
    this._saveToStorage('reading_list_items', readingListItems);
    this._updateReadingListTimestamp(readingListId);
    return item;
  }

  _removeReadingListItem(readingListId, articleId) {
    let readingListItems = this._getFromStorage('reading_list_items', []);
    const originalLength = readingListItems.length;
    readingListItems = readingListItems.filter(function (item) {
      return !(item.reading_list_id === readingListId && item.article_id === articleId);
    });
    const removed = readingListItems.length !== originalLength;
    if (removed) {
      this._saveToStorage('reading_list_items', readingListItems);
      this._updateReadingListTimestamp(readingListId);
    }
    return removed;
  }

  // ----------------------
  // Filtering helpers
  // ----------------------

  _applyBlogArticleFiltersAndSort(articles, options) {
    let result = articles.slice();
    const query = options.query ? options.query.toLowerCase() : null;
    const category = options.category || null;
    const readingTimeMax = typeof options.reading_time_max === 'number' ? options.reading_time_max : null;
    const dateFrom = options.date_from ? new Date(options.date_from) : null;
    const dateTo = options.date_to ? new Date(options.date_to) : null;
    const ratingMin = typeof options.rating_min === 'number' ? options.rating_min : null;
    const sortBy = options.sort_by || 'newest_first';

    if (query) {
      result = result.filter(function (a) {
        const q = query;
        const inTitle = a.title && a.title.toLowerCase().indexOf(q) !== -1;
        const inSummary = a.summary && a.summary.toLowerCase().indexOf(q) !== -1;
        const inContent = a.content && a.content.toLowerCase().indexOf(q) !== -1;
        const inTags = Array.isArray(a.tags) && a.tags.join(' ').toLowerCase().indexOf(q) !== -1;
        const isLaunch = a.is_product_launch === true && q.indexOf('product launch') !== -1;
        return inTitle || inSummary || inContent || inTags || isLaunch;
      });
    }

    if (category) {
      result = result.filter(function (a) {
        return a.category === category;
      });
    }

    if (readingTimeMax !== null) {
      result = result.filter(function (a) {
        return typeof a.reading_time_minutes === 'number' && a.reading_time_minutes <= readingTimeMax;
      });
    }

    if (dateFrom) {
      result = result.filter(function (a) {
        if (!a.publish_date) return false;
        const d = new Date(a.publish_date);
        return d >= dateFrom;
      });
    }

    if (dateTo) {
      result = result.filter(function (a) {
        if (!a.publish_date) return false;
        const d = new Date(a.publish_date);
        return d <= dateTo;
      });
    }

    if (ratingMin !== null) {
      result = result.filter(function (a) {
        return typeof a.rating === 'number' && a.rating >= ratingMin;
      });
    }

    result.sort(function (a, b) {
      if (sortBy === 'most_viewed') {
        const av = typeof a.view_count === 'number' ? a.view_count : 0;
        const bv = typeof b.view_count === 'number' ? b.view_count : 0;
        if (bv !== av) return bv - av;
        const ad = a.publish_date ? new Date(a.publish_date).getTime() : 0;
        const bd = b.publish_date ? new Date(b.publish_date).getTime() : 0;
        return bd - ad;
      }
      // default newest_first
      const ad = a.publish_date ? new Date(a.publish_date).getTime() : 0;
      const bd = b.publish_date ? new Date(b.publish_date).getTime() : 0;
      return bd - ad;
    });

    return result;
  }

  _applyCaseStudyFilters(caseStudies, options) {
    let result = caseStudies.slice();
    const industry = options.industry || null;
    if (industry) {
      result = result.filter(function (cs) {
        return cs.industry === industry;
      });
    }
    return result;
  }

  _applyEventFilters(events, options) {
    let result = events.slice();
    const eventType = options.event_type || null;
    const status = options.status || null;
    const datePresetId = options.date_preset_id || null;
    const timeZone = options.time_zone || null;

    if (eventType) {
      result = result.filter(function (e) {
        return e.event_type === eventType;
      });
    }

    if (status) {
      result = result.filter(function (e) {
        return e.status === status;
      });
    }

    if (timeZone) {
      result = result.filter(function (e) {
        return e.time_zone === timeZone;
      });
    }

    if (datePresetId) {
      const now = new Date();
      let future = null;
      if (datePresetId === 'next_30_days') {
        future = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      } else if (datePresetId === 'next_60_days') {
        future = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);
      }
      if (future) {
        result = result.filter(function (e) {
          if (!e.start_datetime) return false;
          const d = new Date(e.start_datetime);
          return d >= now && d <= future;
        });
      }
    }

    // Sort by start date ascending for listing
    result.sort(function (a, b) {
      const ad = a.start_datetime ? new Date(a.start_datetime).getTime() : 0;
      const bd = b.start_datetime ? new Date(b.start_datetime).getTime() : 0;
      return ad - bd;
    });

    return result;
  }

  _applyJobFiltersAndSort(jobs, options) {
    let result = jobs.slice();
    const department = options.department || null;
    const locationType = options.location_type || null;
    const sortBy = options.sort_by || 'newest_first';

    // Only active jobs by default
    result = result.filter(function (j) {
      return j.is_active !== false;
    });

    if (department) {
      result = result.filter(function (j) {
        return j.department === department;
      });
    }

    if (locationType) {
      result = result.filter(function (j) {
        return j.location_type === locationType;
      });
    }

    result.sort(function (a, b) {
      const ad = a.posting_date ? new Date(a.posting_date).getTime() : 0;
      const bd = b.posting_date ? new Date(b.posting_date).getTime() : 0;
      if (sortBy === 'oldest_first') {
        return ad - bd;
      }
      // newest_first
      return bd - ad;
    });

    return result;
  }

  _sendContactConfirmationEmail(submission) {
    // Simulate email routing by enqueueing a record in localStorage
    const queue = this._getFromStorage('contact_email_queue', []);
    const entry = {
      id: this._generateId('contact_email'),
      contact_submission_id: submission.id,
      enqueued_at: this._nowISO()
    };
    queue.push(entry);
    this._saveToStorage('contact_email_queue', queue);
  }

  _normalizeEventTimesToTimezone(events, timeZoneId) {
    // Placeholder: for now, just return events as-is.
    // This helper exists for future timezone normalization logic.
    return events;
  }

  // ----------------------
  // Home page interfaces
  // ----------------------

  getHomeHeroContent() {
    return this._getFromStorage('home_hero_content', {
      headline: '',
      subheadline: '',
      value_propositions: [],
      key_differentiators: [],
      primary_ctas: []
    });
  }

  getHomeFeaturedBlogArticles(limit) {
    const lim = typeof limit === 'number' ? limit : 3;
    const articles = this._getFromStorage('blog_articles', []);
    const teamMembers = this._getFromStorage('team_members', []);

    let featured = articles.filter(function (a) {
      return a.is_featured === true;
    });

    if (featured.length === 0) {
      featured = articles.slice();
    }

    featured.sort(function (a, b) {
      const ad = a.publish_date ? new Date(a.publish_date).getTime() : 0;
      const bd = b.publish_date ? new Date(b.publish_date).getTime() : 0;
      return bd - ad;
    });

    const selected = featured.slice(0, lim).map(function (a) {
      const copy = Object.assign({}, a);
      if (copy.author_id) {
        copy.author = teamMembers.find(function (t) { return t.id === copy.author_id; }) || null;
      } else {
        copy.author = null;
      }
      return copy;
    });

    return selected;
  }

  getHomeFeaturedCaseStudies(limit) {
    const lim = typeof limit === 'number' ? limit : 3;
    const caseStudies = this._getFromStorage('case_studies', []);
    const sorted = caseStudies.slice().sort(function (a, b) {
      const ad = a.publish_date ? new Date(a.publish_date).getTime() : 0;
      const bd = b.publish_date ? new Date(b.publish_date).getTime() : 0;
      return bd - ad;
    });
    return sorted.slice(0, lim);
  }

  getHomeFeaturedEvents(within_days) {
    const withinDays = typeof within_days === 'number' ? within_days : 60;
    const events = this._getFromStorage('events', []);
    const now = new Date();
    const future = new Date(now.getTime() + withinDays * 24 * 60 * 60 * 1000);

    const filtered = events.filter(function (e) {
      if (!e.start_datetime) return false;
      const d = new Date(e.start_datetime);
      if (d < now || d > future) return false;
      return e.status === 'upcoming' || e.status === 'live';
    });

    filtered.sort(function (a, b) {
      const ad = a.start_datetime ? new Date(a.start_datetime).getTime() : 0;
      const bd = b.start_datetime ? new Date(b.start_datetime).getTime() : 0;
      return ad - bd;
    });

    return filtered;
  }

  getHomeCareersPromo() {
    const basePromo = this._getFromStorage('home_careers_promo', {
      headline: '',
      subheadline: '',
      open_roles_count: 0,
      highlight_departments: [],
      cta_label: ''
    });
    const jobPostings = this._getFromStorage('job_postings', []);

    const activeJobs = jobPostings.filter(function (j) { return j.is_active !== false; });
    const departmentsSet = {};
    for (let i = 0; i < activeJobs.length; i++) {
      const dept = activeJobs[i].department;
      if (dept && !departmentsSet[dept]) {
        departmentsSet[dept] = true;
      }
    }

    const highlightDepartments = Object.keys(departmentsSet).slice(0, 3);

    return {
      headline: basePromo.headline,
      subheadline: basePromo.subheadline,
      open_roles_count: activeJobs.length,
      highlight_departments: highlightDepartments,
      cta_label: basePromo.cta_label
    };
  }

  // ----------------------
  // Blog interfaces
  // ----------------------

  getBlogFilterOptions() {
    return this._getFromStorage('blog_filter_options', {
      categories: [],
      reading_time_options: [],
      rating_options: [],
      date_presets: [],
      sort_options: []
    });
  }

  getBlogArticles(query, category, reading_time_max, reading_time_filter_id, date_from, date_to, rating_min, sort_by, page, page_size) {
    const articles = this._getFromStorage('blog_articles', []);
    const filterOptions = this._getFromStorage('blog_filter_options', {
      reading_time_options: []
    });

    let readingTimeMax = typeof reading_time_max === 'number' ? reading_time_max : null;
    if (!readingTimeMax && reading_time_filter_id) {
      const opt = (filterOptions.reading_time_options || []).find(function (o) {
        return o.id === reading_time_filter_id;
      });
      if (opt && typeof opt.max_minutes === 'number') {
        readingTimeMax = opt.max_minutes;
      }
    }

    const nowISO = new Date().toISOString().slice(0, 10);

    const filtered = this._applyBlogArticleFiltersAndSort(articles, {
      query: query || null,
      category: category || null,
      reading_time_max: readingTimeMax,
      date_from: date_from || null,
      date_to: date_to || nowISO,
      rating_min: typeof rating_min === 'number' ? rating_min : null,
      sort_by: sort_by || 'newest_first'
    });

    const pg = typeof page === 'number' && page > 0 ? page : 1;
    const size = typeof page_size === 'number' && page_size > 0 ? page_size : 10;
    const start = (pg - 1) * size;
    const end = start + size;

    const teamMembers = this._getFromStorage('team_members', []);

    const pagedArticles = filtered.slice(start, end).map(function (a) {
      const copy = Object.assign({}, a);
      if (copy.author_id) {
        copy.author = teamMembers.find(function (t) { return t.id === copy.author_id; }) || null;
      } else {
        copy.author = null;
      }
      return copy;
    });

    const readingList = this._getOrCreateReadingList();
    const readingListItems = this._getFromStorage('reading_list_items', []);
    const savedIds = readingListItems
      .filter(function (item) { return item.reading_list_id === readingList.id; })
      .map(function (item) { return item.article_id; });

    return {
      total: filtered.length,
      page: pg,
      page_size: size,
      articles: pagedArticles,
      saved_article_ids: savedIds
    };
  }

  getBlogCategoryNewsletterBanner(category) {
    const banners = this._getFromStorage('blog_category_banners', {});
    const key = category || '';
    const banner = banners[key] || null;
    if (banner) return banner;

    // Fallback generic banner if specific category not configured
    return {
      category: category || 'other',
      headline: 'Stay updated',
      subheadline: 'Subscribe to updates from our blog.',
      cta_label: 'Subscribe',
      frequency_options: [
        { id: 'weekly', label: 'Weekly' },
        { id: 'monthly', label: 'Monthly' },
        { id: 'quarterly', label: 'Quarterly' }
      ]
    };
  }

  getBlogArticleDetail(articleId) {
    const articles = this._getFromStorage('blog_articles', []);
    const teamMembers = this._getFromStorage('team_members', []);
    const article = this._findById(articles, articleId) || null;

    if (!article) {
      return {
        article: null,
        is_saved_to_reading_list: false,
        inline_signup_available: false,
        inline_signup_config: null
      };
    }

    const readingList = this._getOrCreateReadingList();
    const readingListItems = this._getFromStorage('reading_list_items', []);
    const isSaved = readingListItems.some(function (item) {
      return item.reading_list_id === readingList.id && item.article_id === article.id;
    });

    let inlineAvailable = false;
    let inlineConfig = null;

    if (article.category === 'analytics') {
      inlineAvailable = true;
      inlineConfig = {
        headline: 'Get analytics tips',
        description: 'Sign up to receive practical analytics insights for product teams.',
        default_frequency: 'monthly_insights'
      };
    } else if (article.category === 'remote_work') {
      inlineAvailable = true;
      inlineConfig = {
        headline: 'Remote work insights',
        description: 'Receive stories and best practices for distributed teams.',
        default_frequency: 'weekly'
      };
    }

    const articleWithAuthor = Object.assign({}, article);
    if (articleWithAuthor.author_id) {
      articleWithAuthor.author = teamMembers.find(function (t) { return t.id === articleWithAuthor.author_id; }) || null;
    } else {
      articleWithAuthor.author = null;
    }

    return {
      article: articleWithAuthor,
      is_saved_to_reading_list: isSaved,
      inline_signup_available: inlineAvailable,
      inline_signup_config: inlineConfig
    };
  }

  getRelatedBlogArticles(articleId, limit) {
    const lim = typeof limit === 'number' ? limit : 3;
    const articles = this._getFromStorage('blog_articles', []);
    const teamMembers = this._getFromStorage('team_members', []);
    const base = this._findById(articles, articleId);
    if (!base) return [];

    const baseTags = Array.isArray(base.tags) ? base.tags : [];

    const related = articles.filter(function (a) {
      if (a.id === base.id) return false;
      if (a.category !== base.category) return false;
      if (!Array.isArray(a.tags) || baseTags.length === 0) return true;
      // Prefer overlapping tags when present
      const aTags = a.tags;
      for (let i = 0; i < aTags.length; i++) {
        if (baseTags.indexOf(aTags[i]) !== -1) return true;
      }
      return false;
    });

    related.sort(function (a, b) {
      const ad = a.publish_date ? new Date(a.publish_date).getTime() : 0;
      const bd = b.publish_date ? new Date(b.publish_date).getTime() : 0;
      return bd - ad;
    });

    return related.slice(0, lim).map(function (a) {
      const copy = Object.assign({}, a);
      if (copy.author_id) {
        copy.author = teamMembers.find(function (t) { return t.id === copy.author_id; }) || null;
      } else {
        copy.author = null;
      }
      return copy;
    });
  }

  saveArticleToReadingList(articleId, source) {
    const articles = this._getFromStorage('blog_articles', []);
    const article = this._findById(articles, articleId);
    if (!article) {
      return {
        success: false,
        message: 'Article not found',
        saved_at: null,
        reading_list_count: 0,
        already_saved: false
      };
    }

    const readingList = this._getOrCreateReadingList();
    const readingListItems = this._getFromStorage('reading_list_items', []);
    const existing = readingListItems.find(function (item) {
      return item.reading_list_id === readingList.id && item.article_id === articleId;
    });

    if (existing) {
      const count = readingListItems.filter(function (item) {
        return item.reading_list_id === readingList.id;
      }).length;
      return {
        success: true,
        message: 'Article already in reading list',
        saved_at: existing.saved_at,
        reading_list_count: count,
        already_saved: true
      };
    }

    const item = this._saveReadingListItem(readingList.id, articleId, source || 'blog_list');
    const updatedItems = this._getFromStorage('reading_list_items', []);
    const count = updatedItems.filter(function (ri) {
      return ri.reading_list_id === readingList.id;
    }).length;

    return {
      success: true,
      message: 'Article saved to reading list',
      saved_at: item.saved_at,
      reading_list_count: count,
      already_saved: false
    };
  }

  removeArticleFromReadingList(articleId) {
    const readingList = this._getOrCreateReadingList();
    const removed = this._removeReadingListItem(readingList.id, articleId);
    const readingListItems = this._getFromStorage('reading_list_items', []);
    const count = readingListItems.filter(function (item) {
      return item.reading_list_id === readingList.id;
    }).length;

    return {
      success: removed,
      message: removed ? 'Article removed from reading list' : 'Article not found in reading list',
      reading_list_count: count
    };
  }

  getReadingListItems() {
    const readingList = this._getOrCreateReadingList();
    const readingListItems = this._getFromStorage('reading_list_items', []);
    const articles = this._getFromStorage('blog_articles', []);

    const items = readingListItems
      .filter(function (item) { return item.reading_list_id === readingList.id; })
      .sort(function (a, b) {
        const ad = a.saved_at ? new Date(a.saved_at).getTime() : 0;
        const bd = b.saved_at ? new Date(b.saved_at).getTime() : 0;
        return bd - ad;
      })
      .map(function (item) {
        const article = articles.find(function (a) { return a.id === item.article_id; }) || null;
        const articleSummary = article
          ? {
              id: article.id,
              title: article.title,
              summary: article.summary || '',
              category: article.category,
              reading_time_minutes: article.reading_time_minutes,
              publish_date: article.publish_date,
              rating: article.rating
            }
          : null;
        return {
          reading_list_item_id: item.id,
          saved_at: item.saved_at,
          source: item.source || null,
          article: articleSummary
        };
      });

    return {
      list_name: readingList.name,
      created_at: readingList.created_at,
      updated_at: readingList.updated_at,
      items: items
    };
  }

  createNewsletterSubscription(name, email, frequency, source_type, category, article_id) {
    if (!name || !email || !frequency || !source_type) {
      return {
        success: false,
        message: 'Missing required fields',
        subscription: null
      };
    }

    const subscriptions = this._getFromStorage('newsletter_subscriptions', []);
    const subscription = {
      id: this._generateId('newsletter'),
      name: name,
      email: email,
      frequency: frequency,
      source_type: source_type,
      category: category || null,
      article_id: article_id || null,
      created_at: this._nowISO(),
      confirmed: false
    };
    subscriptions.push(subscription);
    this._saveToStorage('newsletter_subscriptions', subscriptions);

    return {
      success: true,
      message: 'Subscription created',
      subscription: subscription
    };
  }

  // ----------------------
  // About & team interfaces
  // ----------------------

  getAboutPageContent() {
    return this._getFromStorage('about_page_content', {
      mission: '',
      values: [],
      history: '',
      services_overview: '',
      impact_areas: [],
      awards_and_certifications: [],
      subpage_links: [],
      contact_cta_label: ''
    });
  }

  getTeamMembers(department, is_leadership, location_city, search) {
    const members = this._getFromStorage('team_members', []);
    const searchLower = search ? search.toLowerCase() : null;

    return members.filter(function (m) {
      if (department && m.department !== department) return false;
      if (typeof is_leadership === 'boolean' && m.is_leadership !== is_leadership) return false;
      if (location_city && m.location_city !== location_city) return false;
      if (searchLower) {
        const nameMatch = m.full_name && m.full_name.toLowerCase().indexOf(searchLower) !== -1;
        const titleMatch = m.title && m.title.toLowerCase().indexOf(searchLower) !== -1;
        if (!nameMatch && !titleMatch) return false;
      }
      return true;
    });
  }

  getTeamMemberProfile(teamMemberId) {
    const members = this._getFromStorage('team_members', []);
    const profile = this._findById(members, teamMemberId) || null;

    if (!profile) {
      return {
        profile: null,
        contact_cta_label: '',
        contact_topics: []
      };
    }

    let label = 'Contact this team member';
    const titleLower = profile.title ? profile.title.toLowerCase() : '';
    if (titleLower.indexOf('ux') !== -1 || profile.department === 'design') {
      label = 'Contact us about UX';
    }

    const topics = [];
    if (titleLower.indexOf('ux') !== -1 || profile.department === 'design') {
      topics.push({ id: 'ux_design_consultation', label: 'UX & Design consultation' });
    }
    topics.push({ id: 'general_question', label: 'General question' });

    return {
      profile: profile,
      contact_cta_label: label,
      contact_topics: topics
    };
  }

  submitTeamMemberContact(teamMemberId, topic, name, email, message) {
    if (!teamMemberId || !topic || !name || !email || !message) {
      return {
        success: false,
        message: 'Missing required fields',
        submission_id: null
      };
    }

    const members = this._getFromStorage('team_members', []);
    const member = this._findById(members, teamMemberId);
    if (!member) {
      return {
        success: false,
        message: 'Team member not found',
        submission_id: null
      };
    }

    const submissions = this._getFromStorage('contact_submissions', []);
    const id = this._generateId('contact');
    const formType = topic === 'ux_design_consultation' ? 'ux_design_consultation' : 'general_contact';

    const submission = {
      id: id,
      context_type: 'team_member_profile',
      context_id: teamMemberId,
      form_type: formType,
      topic: topic,
      reason_for_contact: topic === 'ux_design_consultation' ? null : 'general_question',
      name: name,
      email: email,
      message: message,
      submitted_at: this._nowISO()
    };

    submissions.push(submission);
    this._saveToStorage('contact_submissions', submissions);
    this._sendContactConfirmationEmail(submission);

    return {
      success: true,
      message: 'Contact request submitted',
      submission_id: id
    };
  }

  // ----------------------
  // Sustainability interfaces
  // ----------------------

  getSustainabilityPageContent() {
    return this._getFromStorage('sustainability_page_content', {
      strategy: '',
      goals: [],
      key_initiatives: [],
      impact_reports_intro: ''
    });
  }

  getImpactReportsList() {
    return this._getFromStorage('sustainability_reports', []);
  }

  getSustainabilityReportDetail(reportId) {
    const reports = this._getFromStorage('sustainability_reports', []);
    const report = this._findById(reports, reportId) || null;
    return {
      report: report,
      back_to_sustainability_label: 'Back to Sustainability',
      ask_question_cta_label: 'Ask a sustainability question'
    };
  }

  submitSustainabilityQuestion(reportId, topic, name, email, message) {
    if (!reportId || !topic || !name || !email || !message) {
      return {
        success: false,
        message: 'Missing required fields',
        submission_id: null
      };
    }

    if (topic !== 'sustainability_csr') {
      return {
        success: false,
        message: 'Invalid topic for sustainability question',
        submission_id: null
      };
    }

    const reports = this._getFromStorage('sustainability_reports', []);
    const report = this._findById(reports, reportId);
    if (!report) {
      return {
        success: false,
        message: 'Report not found',
        submission_id: null
      };
    }

    const submissions = this._getFromStorage('contact_submissions', []);
    const id = this._generateId('contact');
    const submission = {
      id: id,
      context_type: 'sustainability_report',
      context_id: reportId,
      form_type: 'sustainability_question',
      topic: topic,
      reason_for_contact: null,
      name: name,
      email: email,
      message: message,
      submitted_at: this._nowISO()
    };
    submissions.push(submission);
    this._saveToStorage('contact_submissions', submissions);
    this._sendContactConfirmationEmail(submission);

    return {
      success: true,
      message: 'Sustainability question submitted',
      submission_id: id
    };
  }

  // ----------------------
  // Case study interfaces
  // ----------------------

  getCaseStudyFilterOptions() {
    return this._getFromStorage('case_study_filter_options', {
      industries: []
    });
  }

  getCaseStudies(industry, page, page_size) {
    const caseStudies = this._getFromStorage('case_studies', []);
    const filtered = this._applyCaseStudyFilters(caseStudies, {
      industry: industry || null
    });

    const pg = typeof page === 'number' && page > 0 ? page : 1;
    const size = typeof page_size === 'number' && page_size > 0 ? page_size : 12;
    const start = (pg - 1) * size;
    const end = start + size;

    const paged = filtered.slice(start, end);

    return {
      total: filtered.length,
      page: pg,
      page_size: size,
      case_studies: paged
    };
  }

  getCaseStudyDetail(caseStudyId) {
    const caseStudies = this._getFromStorage('case_studies', []);
    const cs = this._findById(caseStudies, caseStudyId) || null;
    return {
      case_study: cs,
      talk_to_team_cta_label: 'Talk to our team'
    };
  }

  submitCaseStudyFollowUp(caseStudyId, reason_for_contact, topic, name, email, message) {
    if (!caseStudyId || !reason_for_contact || !topic || !name || !email || !message) {
      return {
        success: false,
        message: 'Missing required fields',
        submission_id: null
      };
    }

    const caseStudies = this._getFromStorage('case_studies', []);
    const cs = this._findById(caseStudies, caseStudyId);
    if (!cs) {
      return {
        success: false,
        message: 'Case study not found',
        submission_id: null
      };
    }

    const submissions = this._getFromStorage('contact_submissions', []);
    const id = this._generateId('contact');
    const submission = {
      id: id,
      context_type: 'case_study',
      context_id: caseStudyId,
      form_type: 'case_study_follow_up',
      topic: topic,
      reason_for_contact: reason_for_contact,
      name: name,
      email: email,
      message: message,
      submitted_at: this._nowISO()
    };
    submissions.push(submission);
    this._saveToStorage('contact_submissions', submissions);
    this._sendContactConfirmationEmail(submission);

    return {
      success: true,
      message: 'Case study follow-up submitted',
      submission_id: id
    };
  }

  // ----------------------
  // Events / webinars interfaces
  // ----------------------

  getEventFilterOptions() {
    return this._getFromStorage('event_filter_options', {
      date_presets: [],
      time_zones: [],
      event_types: []
    });
  }

  getEvents(event_type, status, date_preset_id, time_zone, page, page_size) {
    const events = this._getFromStorage('events', []);
    const filtered = this._applyEventFilters(events, {
      event_type: event_type || null,
      status: status || null,
      date_preset_id: date_preset_id || null,
      time_zone: time_zone || null
    });

    const normalized = this._normalizeEventTimesToTimezone(filtered, time_zone || null);

    const pg = typeof page === 'number' && page > 0 ? page : 1;
    const size = typeof page_size === 'number' && page_size > 0 ? page_size : 12;
    const start = (pg - 1) * size;
    const end = start + size;

    const paged = normalized.slice(start, end);

    return {
      total: normalized.length,
      page: pg,
      page_size: size,
      events: paged
    };
  }

  getEventDetail(eventId) {
    const events = this._getFromStorage('events', []);
    const event = this._findById(events, eventId) || null;
    return {
      event: event,
      register_cta_label: 'Register for free'
    };
  }

  registerForEvent(eventId, full_name, email, reminder) {
    if (!eventId || !full_name || !email || !reminder) {
      return {
        success: false,
        message: 'Missing required fields',
        registration_id: null,
        status: null
      };
    }

    const events = this._getFromStorage('events', []);
    const event = this._findById(events, eventId);
    if (!event) {
      return {
        success: false,
        message: 'Event not found',
        registration_id: null,
        status: null
      };
    }

    if (event.registration_open === false) {
      return {
        success: false,
        message: 'Registration is closed',
        registration_id: null,
        status: null
      };
    }

    const registrations = this._getFromStorage('webinar_registrations', []);
    const id = this._generateId('registration');
    const registration = {
      id: id,
      event_id: eventId,
      full_name: full_name,
      email: email,
      reminder: reminder,
      status: 'registered',
      registered_at: this._nowISO()
    };
    registrations.push(registration);
    this._saveToStorage('webinar_registrations', registrations);

    return {
      success: true,
      message: 'Registration successful',
      registration_id: id,
      status: 'registered'
    };
  }

  // ----------------------
  // Careers / jobs interfaces
  // ----------------------

  getJobFilterOptions() {
    return this._getFromStorage('job_filter_options', {
      departments: [],
      location_types: [],
      sort_options: []
    });
  }

  getJobPostings(department, location_type, sort_by, page, page_size) {
    const jobs = this._getFromStorage('job_postings', []);
    const filtered = this._applyJobFiltersAndSort(jobs, {
      department: department || null,
      location_type: location_type || null,
      sort_by: sort_by || 'newest_first'
    });

    const pg = typeof page === 'number' && page > 0 ? page : 1;
    const size = typeof page_size === 'number' && page_size > 0 ? page_size : 20;
    const start = (pg - 1) * size;
    const end = start + size;

    const paged = filtered.slice(start, end);

    return {
      total: filtered.length,
      page: pg,
      page_size: size,
      jobs: paged
    };
  }

  getJobDetail(jobPostingId) {
    const jobs = this._getFromStorage('job_postings', []);
    const job = this._findById(jobs, jobPostingId) || null;
    return {
      job: job,
      apply_cta_label: 'Apply now'
    };
  }

  submitJobApplication(jobPostingId, full_name, email, experience_summary, resume_url) {
    if (!jobPostingId || !full_name || !email || !experience_summary) {
      return {
        success: false,
        message: 'Missing required fields',
        application_id: null,
        status: null
      };
    }

    const jobs = this._getFromStorage('job_postings', []);
    const job = this._findById(jobs, jobPostingId);
    if (!job) {
      return {
        success: false,
        message: 'Job posting not found',
        application_id: null,
        status: null
      };
    }

    const applications = this._getFromStorage('job_applications', []);
    const id = this._generateId('job_application');
    const application = {
      id: id,
      job_posting_id: jobPostingId,
      full_name: full_name,
      email: email,
      experience_summary: experience_summary,
      resume_url: resume_url || '',
      status: 'submitted',
      submitted_at: this._nowISO()
    };
    applications.push(application);
    this._saveToStorage('job_applications', applications);

    return {
      success: true,
      message: 'Application submitted',
      application_id: id,
      status: 'submitted'
    };
  }

  // ----------------------
  // General contact & privacy
  // ----------------------

  getContactPageContent() {
    return this._getFromStorage('contact_page_content', {
      intro_text: '',
      support_email: '',
      sales_email: '',
      phone_number: '',
      post_submit_message: ''
    });
  }

  getContactTopics() {
    return this._getFromStorage('contact_topics', []);
  }

  submitGeneralContact(topic, name, email, message) {
    if (!topic || !name || !email || !message) {
      return {
        success: false,
        message: 'Missing required fields',
        submission_id: null
      };
    }

    const submissions = this._getFromStorage('contact_submissions', []);
    const id = this._generateId('contact');
    const submission = {
      id: id,
      context_type: 'general',
      context_id: null,
      form_type: 'general_contact',
      topic: topic,
      reason_for_contact: topic,
      name: name,
      email: email,
      message: message,
      submitted_at: this._nowISO()
    };
    submissions.push(submission);
    this._saveToStorage('contact_submissions', submissions);
    this._sendContactConfirmationEmail(submission);

    return {
      success: true,
      message: 'Contact form submitted',
      submission_id: id
    };
  }

  getPrivacyPolicyContent() {
    return this._getFromStorage('privacy_policy_content', {
      last_updated: '',
      content: '',
      data_subject_rights: [],
      privacy_contact_instructions: ''
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
