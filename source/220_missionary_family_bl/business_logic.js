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
    const arrayKeys = [
      'projects',
      'donations',
      'blog_posts',
      'reading_list_items',
      'prayer_updates',
      'prayer_comments',
      'events',
      'event_sessions',
      'event_rsvps',
      'newsletter_subscriptions',
      'gift_items',
      'baskets',
      'basket_items',
      'countries',
      'country_team_members',
      'prayer_reminders',
      'stories'
    ];

    arrayKeys.forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    });

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }

    // Optional config keys can be added by other parts of the app
    // e.g., 'family_intro', 'newsletter_topics' etc. We do not seed them here.
  }

  _getFromStorage(key) {
    const data = localStorage.getItem(key);
    try {
      return data ? JSON.parse(data) : [];
    } catch (e) {
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

  _now() {
    return new Date().toISOString();
  }

  _parseDate(value) {
    if (!value) return null;
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }

  // ----------------------
  // Basket helpers
  // ----------------------

  _getOrCreateBasket() {
    let baskets = this._getFromStorage('baskets');
    let basket = baskets.find((b) => b.status === 'open');
    if (!basket) {
      basket = {
        id: this._generateId('basket'),
        created_at: this._now(),
        updated_at: null,
        status: 'open',
        total_amount: 0,
        currency: null
      };
      baskets.push(basket);
      this._saveToStorage('baskets', baskets);
    }
    return basket;
  }

  _calculateBasketTotals(basket) {
    const basketItems = this._getFromStorage('basket_items');
    const giftItems = this._getFromStorage('gift_items');
    const itemsForBasket = basketItems.filter((bi) => bi.basket_id === basket.id);

    let total = 0;
    let currency = basket.currency || null;

    itemsForBasket.forEach((bi) => {
      const gift = giftItems.find((g) => g.id === bi.gift_item_id) || null;
      if (gift && !currency) {
        currency = gift.currency || null;
      }
      total += Number(bi.line_total || 0);
    });

    basket.total_amount = total;
    basket.currency = currency;

    // Persist basket
    let baskets = this._getFromStorage('baskets');
    baskets = baskets.map((b) => (b.id === basket.id ? basket : b));
    this._saveToStorage('baskets', baskets);

    return { basket, itemsForBasket };
  }

  // ----------------------
  // Prayer reminder helper
  // ----------------------

  _computeNextPrayerReminderAt(frequency, day_of_week, time_of_day) {
    const now = new Date();
    const [hStr, mStr] = (time_of_day || '08:00').split(':');
    const hour = parseInt(hStr || '8', 10);
    const minute = parseInt(mStr || '0', 10);

    const next = new Date(now);

    const setTime = (d) => {
      d.setSeconds(0, 0);
      d.setHours(hour, minute, 0, 0);
    };

    if (frequency === 'daily') {
      setTime(next);
      if (next <= now) {
        next.setDate(next.getDate() + 1);
        setTime(next);
      }
      return next.toISOString();
    }

    if (frequency === 'weekly') {
      const dayMap = {
        sunday: 0,
        monday: 1,
        tuesday: 2,
        wednesday: 3,
        thursday: 4,
        friday: 5,
        saturday: 6
      };
      const targetDow = dayMap[(day_of_week || 'monday').toLowerCase()] ?? 1;
      const currentDow = now.getDay();
      let delta = (targetDow - currentDow + 7) % 7;
      setTime(next);
      if (delta === 0 && next <= now) {
        delta = 7;
      }
      if (delta > 0) {
        next.setDate(next.getDate() + delta);
        setTime(next);
      }
      return next.toISOString();
    }

    if (frequency === 'monthly') {
      setTime(next);
      if (next <= now) {
        next.setMonth(next.getMonth() + 1);
        setTime(next);
      }
      return next.toISOString();
    }

    return null;
  }

  // ----------------------
  // Home Page
  // ----------------------

  getHomePageContent() {
    const projects = this._getFromStorage('projects');
    const blogPosts = this._getFromStorage('blog_posts');
    const stories = this._getFromStorage('stories');
    const prayerUpdates = this._getFromStorage('prayer_updates');

    const featured_projects = projects.filter((p) => p.featured === true && p.status === 'active');

    const latest_blog_posts = blogPosts
      .filter((p) => p.status === 'published')
      .sort((a, b) => {
        const da = this._parseDate(a.published_at) || new Date(0);
        const db = this._parseDate(b.published_at) || new Date(0);
        return db - da;
      });

    const latest_stories = stories
      .filter((s) => s.status === 'published')
      .sort((a, b) => {
        const da = this._parseDate(a.published_at) || new Date(0);
        const db = this._parseDate(b.published_at) || new Date(0);
        return db - da;
      });

    const latest_prayer_updates = prayerUpdates
      .filter((u) => u.status === 'published')
      .sort((a, b) => {
        const da = this._parseDate(a.created_at) || new Date(0);
        const db = this._parseDate(b.created_at) || new Date(0);
        return db - da;
      });

    const family_intro = localStorage.getItem('family_intro') || '';

    return {
      family_intro,
      featured_projects,
      latest_blog_posts,
      latest_stories,
      latest_prayer_updates
    };
  }

  // ----------------------
  // Projects & Donations
  // ----------------------

  getProjectFilterOptions() {
    const projects = this._getFromStorage('projects');

    const categoriesSet = new Set();
    const tagsSet = new Set();
    const fundingModelsSet = new Set();
    const statusSet = new Set();

    let minGoal = null;
    let maxGoal = null;

    projects.forEach((p) => {
      if (p.category) categoriesSet.add(p.category);
      if (Array.isArray(p.tags)) {
        p.tags.forEach((t) => tagsSet.add(t));
      }
      if (p.funding_model) fundingModelsSet.add(p.funding_model);
      if (p.status) statusSet.add(p.status);

      if (typeof p.monthly_goal === 'number') {
        if (minGoal === null || p.monthly_goal < minGoal) minGoal = p.monthly_goal;
        if (maxGoal === null || p.monthly_goal > maxGoal) maxGoal = p.monthly_goal;
      }
    });

    return {
      categories: Array.from(categoriesSet),
      tags: Array.from(tagsSet),
      funding_models: Array.from(fundingModelsSet),
      status_options: Array.from(statusSet),
      monthly_goal_range: {
        min: minGoal,
        max: maxGoal
      },
      sort_options: ['monthly_goal_low_to_high', 'monthly_goal_high_to_low', 'newest', 'oldest', 'featured_first']
    };
  }

  listProjects(filters, sort, page = 1, page_size = 20) {
    let projects = this._getFromStorage('projects');

    if (filters && typeof filters === 'object') {
      if (filters.category) {
        projects = projects.filter((p) => p.category === filters.category);
      }
      if (filters.tag) {
        projects = projects.filter((p) => Array.isArray(p.tags) && p.tags.includes(filters.tag));
      }
      if (filters.funding_model) {
        const fm = filters.funding_model;
        projects = projects.filter((p) => {
          if (!p.funding_model) return false;
          if (fm === 'one_time') return p.funding_model === 'one_time' || p.funding_model === 'both';
          if (fm === 'recurring') return p.funding_model === 'recurring' || p.funding_model === 'both';
          return p.funding_model === fm;
        });
      }
      if (typeof filters.monthly_goal_max === 'number') {
        projects = projects.filter(
          (p) => typeof p.monthly_goal === 'number' && p.monthly_goal <= filters.monthly_goal_max
        );
      }
      if (filters.status) {
        projects = projects.filter((p) => p.status === filters.status);
      }
      if (filters.search) {
        const q = filters.search.toLowerCase();
        projects = projects.filter((p) => {
          const title = (p.title || '').toLowerCase();
          const summary = (p.summary || '').toLowerCase();
          return title.includes(q) || summary.includes(q);
        });
      }
      if (filters.featured_only) {
        projects = projects.filter((p) => p.featured === true);
      }
    }

    if (sort === 'monthly_goal_low_to_high') {
      projects.sort((a, b) => {
        const ag = typeof a.monthly_goal === 'number' ? a.monthly_goal : Number.POSITIVE_INFINITY;
        const bg = typeof b.monthly_goal === 'number' ? b.monthly_goal : Number.POSITIVE_INFINITY;
        return ag - bg;
      });
    } else if (sort === 'monthly_goal_high_to_low') {
      projects.sort((a, b) => {
        const ag = typeof a.monthly_goal === 'number' ? a.monthly_goal : -1;
        const bg = typeof b.monthly_goal === 'number' ? b.monthly_goal : -1;
        return bg - ag;
      });
    } else if (sort === 'newest') {
      projects.sort((a, b) => {
        const da = this._parseDate(a.created_at) || new Date(0);
        const db = this._parseDate(b.created_at) || new Date(0);
        return db - da;
      });
    } else if (sort === 'oldest') {
      projects.sort((a, b) => {
        const da = this._parseDate(a.created_at) || new Date(0);
        const db = this._parseDate(b.created_at) || new Date(0);
        return da - db;
      });
    } else if (sort === 'featured_first') {
      projects.sort((a, b) => {
        const fa = a.featured ? 1 : 0;
        const fb = b.featured ? 1 : 0;
        return fb - fa;
      });
    }

    const total_count = projects.length;
    const start = (page - 1) * page_size;
    const items = projects.slice(start, start + page_size);

    return {
      items,
      total_count,
      page,
      page_size
    };
  }

  getProjectDetail(slug) {
    const projects = this._getFromStorage('projects');
    const project = projects.find((p) => p.slug === slug) || null;

    if (!project) {
      return {
        project: null,
        funding_summary: {
          monthly_goal: null,
          monthly_amount_raised: null,
          monthly_progress_percent: null,
          one_time_target_amount: null,
          one_time_amount_raised: null,
          one_time_progress_percent: null
        },
        allowed_donation_types: [],
        recommended_amounts: []
      };
    }

    const monthly_goal = typeof project.monthly_goal === 'number' ? project.monthly_goal : null;
    const monthly_amount_raised = typeof project.monthly_amount_raised === 'number'
      ? project.monthly_amount_raised
      : null;
    const one_time_target_amount = typeof project.target_amount === 'number' ? project.target_amount : null;
    const one_time_amount_raised = typeof project.amount_raised === 'number' ? project.amount_raised : null;

    const monthly_progress_percent =
      monthly_goal && monthly_amount_raised != null && monthly_goal > 0
        ? Math.min(100, (monthly_amount_raised / monthly_goal) * 100)
        : null;

    const one_time_progress_percent =
      one_time_target_amount && one_time_amount_raised != null && one_time_target_amount > 0
        ? Math.min(100, (one_time_amount_raised / one_time_target_amount) * 100)
        : null;

    let allowed_donation_types = [];
    if (project.funding_model === 'one_time') {
      allowed_donation_types = ['one_time'];
    } else if (project.funding_model === 'recurring') {
      allowed_donation_types = ['recurring'];
    } else if (project.funding_model === 'both') {
      allowed_donation_types = ['one_time', 'recurring'];
    }

    const funding_summary = {
      monthly_goal,
      monthly_amount_raised,
      monthly_progress_percent,
      one_time_target_amount,
      one_time_amount_raised,
      one_time_progress_percent
    };

    const recommended_amounts = [25, 50, 75, 100];

    return {
      project,
      funding_summary,
      allowed_donation_types,
      recommended_amounts
    };
  }

  submitProjectDonation(
    project_id,
    donation_type,
    amount,
    currency,
    cover_fees,
    payment_method,
    schedule_start_date,
    frequency,
    donor_name,
    donor_email,
    billing_address_line1,
    billing_address_line2,
    billing_city,
    billing_state,
    billing_postal_code,
    billing_country,
    note
  ) {
    const projects = this._getFromStorage('projects');
    const project = projects.find((p) => p.id === project_id) || null;
    if (!project) {
      return {
        success: false,
        message: 'Project not found',
        donation: null,
        thank_you_text: ''
      };
    }

    if (!amount || amount <= 0) {
      return {
        success: false,
        message: 'Invalid donation amount',
        donation: null,
        thank_you_text: ''
      };
    }

    const isRecurring = donation_type === 'recurring';
    if (isRecurring) {
      if (!schedule_start_date) {
        return {
          success: false,
          message: 'schedule_start_date is required for recurring donations',
          donation: null,
          thank_you_text: ''
        };
      }
      if (!['weekly', 'monthly', 'quarterly', 'annual'].includes(frequency)) {
        return {
          success: false,
          message: 'Invalid frequency for recurring donation',
          donation: null,
          thank_you_text: ''
        };
      }
    } else {
      if (frequency !== 'one_time') {
        return {
          success: false,
          message: 'frequency must be one_time for one-time donations',
          donation: null,
          thank_you_text: ''
        };
      }
    }

    const effectiveCurrency = currency || project.currency || 'USD';

    const now = this._now();
    let next_charge_date = null;
    if (isRecurring) {
      const start = this._parseDate(schedule_start_date) || new Date();
      const startIso = start.toISOString();
      if (frequency === 'monthly') {
        const next = new Date(start);
        next.setMonth(next.getMonth() + 1);
        next_charge_date = next.toISOString();
      } else if (frequency === 'weekly') {
        const next = new Date(start);
        next.setDate(next.getDate() + 7);
        next_charge_date = next.toISOString();
      } else if (frequency === 'quarterly') {
        const next = new Date(start);
        next.setMonth(next.getMonth() + 3);
        next_charge_date = next.toISOString();
      } else if (frequency === 'annual') {
        const next = new Date(start);
        next.setFullYear(next.getFullYear() + 1);
        next_charge_date = next.toISOString();
      }
      schedule_start_date = startIso;
    }

    const donation = {
      id: this._generateId('don'),
      project_id,
      donation_type,
      amount,
      currency: effectiveCurrency,
      cover_fees: !!cover_fees,
      payment_method,
      payment_status: 'completed',
      created_at: now,
      schedule_start_date: isRecurring ? schedule_start_date : null,
      frequency,
      next_charge_date,
      donor_name: donor_name || null,
      donor_email: donor_email || null,
      billing_address_line1: billing_address_line1 || null,
      billing_address_line2: billing_address_line2 || null,
      billing_city: billing_city || null,
      billing_state: billing_state || null,
      billing_postal_code: billing_postal_code || null,
      billing_country: billing_country || null,
      card_last4: null,
      card_brand: null,
      card_exp_month: null,
      card_exp_year: null,
      note: note || null
    };

    const donations = this._getFromStorage('donations');
    donations.push(donation);
    this._saveToStorage('donations', donations);

    const typeLabel = isRecurring ? 'monthly support' : 'gift';
    const thank_you_text = `Thank you for your ${typeLabel} of ${effectiveCurrency} ${amount} to ${project.title}.`;

    return {
      success: true,
      message: 'Donation recorded successfully',
      donation,
      thank_you_text
    };
  }

  // ----------------------
  // Blog & Reading List
  // ----------------------

  getBlogFilterOptions() {
    const posts = this._getFromStorage('blog_posts');

    const tagsSet = new Set();
    const categoriesSet = new Set();
    const yearsSet = new Set();

    posts.forEach((p) => {
      if (Array.isArray(p.tags)) {
        p.tags.forEach((t) => tagsSet.add(t));
      }
      if (p.category) categoriesSet.add(p.category);
      if (p.status === 'published' && p.published_at) {
        const d = this._parseDate(p.published_at);
        if (d) yearsSet.add(d.getFullYear());
      }
    });

    return {
      tags: Array.from(tagsSet),
      categories: Array.from(categoriesSet),
      years: Array.from(yearsSet).sort((a, b) => b - a),
      sort_options: ['newest_first', 'oldest_first']
    };
  }

  listBlogPosts(filters, sort = 'newest_first', page = 1, page_size = 10) {
    let posts = this._getFromStorage('blog_posts');

    const f = filters || {};

    if (f.status) {
      posts = posts.filter((p) => p.status === f.status);
    } else {
      posts = posts.filter((p) => p.status === 'published');
    }

    if (f.tag) {
      posts = posts.filter((p) => Array.isArray(p.tags) && p.tags.includes(f.tag));
    }
    if (f.category) {
      posts = posts.filter((p) => p.category === f.category);
    }
    if (typeof f.year === 'number') {
      posts = posts.filter((p) => {
        const d = this._parseDate(p.published_at);
        return d && d.getFullYear() === f.year;
      });
    }
    if (f.search) {
      const q = f.search.toLowerCase();
      posts = posts.filter((p) => {
        const title = (p.title || '').toLowerCase();
        const content = (p.content || '').toLowerCase();
        return title.includes(q) || content.includes(q);
      });
    }

    if (sort === 'oldest_first') {
      posts.sort((a, b) => {
        const da = this._parseDate(a.published_at) || new Date(0);
        const db = this._parseDate(b.published_at) || new Date(0);
        return da - db;
      });
    } else {
      posts.sort((a, b) => {
        const da = this._parseDate(a.published_at) || new Date(0);
        const db = this._parseDate(b.published_at) || new Date(0);
        return db - da;
      });
    }

    const total_count = posts.length;
    const start = (page - 1) * page_size;
    const items = posts.slice(start, start + page_size);

    return {
      items,
      total_count,
      page,
      page_size
    };
  }

  getBlogPostDetail(slug) {
    const posts = this._getFromStorage('blog_posts');
    return posts.find((p) => p.slug === slug) || null;
  }

  saveToReadingList(content_type, content_id, category_label, note) {
    const type = content_type;
    let contentArrayKey = null;
    if (type === 'blog_post') contentArrayKey = 'blog_posts';
    else if (type === 'story') contentArrayKey = 'stories';

    if (!contentArrayKey) {
      return {
        success: false,
        message: 'Invalid content_type',
        reading_list_item: null
      };
    }

    const contentArray = this._getFromStorage(contentArrayKey);
    const content = contentArray.find((c) => c.id === content_id) || null;
    if (!content) {
      return {
        success: false,
        message: 'Content not found',
        reading_list_item: null
      };
    }

    const items = this._getFromStorage('reading_list_items');

    const reading_list_item = {
      id: this._generateId('rli'),
      content_type: type,
      content_id,
      saved_at: this._now(),
      category_label: category_label || 'General',
      note: note || null,
      pinned: false
    };

    items.push(reading_list_item);
    this._saveToStorage('reading_list_items', items);

    return {
      success: true,
      message: 'Item saved to reading list',
      reading_list_item
    };
  }

  getReadingListItems(filters) {
    const items = this._getFromStorage('reading_list_items');
    const blogPosts = this._getFromStorage('blog_posts');
    const stories = this._getFromStorage('stories');

    const f = filters || {};

    let filtered = items;
    if (f.category_label) {
      filtered = filtered.filter((i) => i.category_label === f.category_label);
    }
    if (f.content_type) {
      filtered = filtered.filter((i) => i.content_type === f.content_type);
    }

    const mapped = filtered.map((item) => {
      let content = null;
      if (item.content_type === 'blog_post') {
        content = blogPosts.find((p) => p.id === item.content_id) || null;
      } else if (item.content_type === 'story') {
        content = stories.find((s) => s.id === item.content_id) || null;
      }

      const preview = content
        ? content.excerpt || (content.content ? String(content.content).slice(0, 140) : '')
        : '';

      return {
        item,
        title: content ? content.title : '',
        content_type: item.content_type,
        slug: content ? content.slug : '',
        preview_text: preview,
        // Foreign key resolution for content_id -> content
        content
      };
    });

    return {
      items: mapped,
      total_count: mapped.length
    };
  }

  removeReadingListItem(reading_list_item_id) {
    let items = this._getFromStorage('reading_list_items');
    const before = items.length;
    items = items.filter((i) => i.id !== reading_list_item_id);
    this._saveToStorage('reading_list_items', items);

    const removed = items.length < before;
    return {
      success: removed,
      message: removed ? 'Reading list item removed' : 'Reading list item not found'
    };
  }

  // ----------------------
  // Prayer Updates & Comments
  // ----------------------

  getPrayerUpdateFilterOptions() {
    const updates = this._getFromStorage('prayer_updates');

    const regionsSet = new Set();
    const tagsSet = new Set();

    updates.forEach((u) => {
      if (u.region) regionsSet.add(u.region);
      if (Array.isArray(u.tags)) {
        u.tags.forEach((t) => tagsSet.add(t));
      }
    });

    return {
      regions: Array.from(regionsSet),
      tags: Array.from(tagsSet),
      sort_options: ['newest_first', 'oldest_first']
    };
  }

  searchPrayerUpdates(query, filters, sort = 'newest_first', page = 1, page_size = 10) {
    let updates = this._getFromStorage('prayer_updates');
    const f = filters || {};

    if (f.status) {
      updates = updates.filter((u) => u.status === f.status);
    } else {
      updates = updates.filter((u) => u.status === 'published');
    }

    if (query) {
      const q = query.toLowerCase();
      updates = updates.filter((u) => {
        const title = (u.title || '').toLowerCase();
        const content = (u.content || '').toLowerCase();
        const summary = (u.summary || '').toLowerCase();
        return title.includes(q) || content.includes(q) || summary.includes(q);
      });
    }

    if (f.region) {
      updates = updates.filter((u) => u.region === f.region);
    }
    if (f.country) {
      updates = updates.filter((u) => u.country === f.country);
    }
    if (f.tag) {
      updates = updates.filter((u) => Array.isArray(u.tags) && u.tags.includes(f.tag));
    }
    if (f.urgent_only) {
      updates = updates.filter((u) => u.urgent === true);
    }

    if (sort === 'oldest_first') {
      updates.sort((a, b) => {
        const da = this._parseDate(a.created_at) || new Date(0);
        const db = this._parseDate(b.created_at) || new Date(0);
        return da - db;
      });
    } else {
      updates.sort((a, b) => {
        const da = this._parseDate(a.created_at) || new Date(0);
        const db = this._parseDate(b.created_at) || new Date(0);
        return db - da;
      });
    }

    const total_count = updates.length;
    const start = (page - 1) * page_size;
    const items = updates.slice(start, start + page_size);

    return {
      items,
      total_count,
      page,
      page_size
    };
  }

  getPrayerUpdateDetail(slug) {
    const updates = this._getFromStorage('prayer_updates');
    const comments = this._getFromStorage('prayer_comments');

    const prayer_update = updates.find((u) => u.slug === slug) || null;
    if (!prayer_update) {
      return {
        prayer_update: null,
        comments: []
      };
    }

    const filteredComments = comments
      .filter((c) => c.prayer_update_id === prayer_update.id)
      .filter((c) => c.approved === true || typeof c.approved === 'undefined');

    const mappedComments = filteredComments.map((c) => ({
      ...c,
      // foreign key resolution for prayer_update_id -> prayer_update
      prayer_update
    }));

    return {
      prayer_update,
      comments: mappedComments
    };
  }

  submitPrayerComment(prayer_update_id, name, text) {
    const updates = this._getFromStorage('prayer_updates');
    const update = updates.find((u) => u.id === prayer_update_id) || null;
    if (!update) {
      return {
        success: false,
        message: 'Prayer update not found',
        comment: null
      };
    }

    if (!name || !text) {
      return {
        success: false,
        message: 'Name and text are required',
        comment: null
      };
    }

    const comment = {
      id: this._generateId('pc'),
      prayer_update_id,
      name,
      text,
      created_at: this._now(),
      approved: false
    };

    const comments = this._getFromStorage('prayer_comments');
    comments.push(comment);
    this._saveToStorage('prayer_comments', comments);

    return {
      success: true,
      message: 'Prayer comment submitted for review',
      comment
    };
  }

  // ----------------------
  // Events & RSVPs
  // ----------------------

  getEventFilterOptions() {
    const events = this._getFromStorage('events');

    const statesSet = new Set();
    const citiesSet = new Set();
    const countriesSet = new Set();
    const statusSet = new Set();

    events.forEach((e) => {
      if (e.state) statesSet.add(e.state);
      if (e.city) citiesSet.add(e.city);
      if (e.country) countriesSet.add(e.country);
      if (e.status) statusSet.add(e.status);
    });

    return {
      states: Array.from(statesSet),
      cities: Array.from(citiesSet),
      countries: Array.from(countriesSet),
      status_options: Array.from(statusSet)
    };
  }

  listEvents(filters, sort = 'start_date_asc', page = 1, page_size = 20) {
    let events = this._getFromStorage('events');
    const f = filters || {};

    if (f.state) {
      events = events.filter((e) => e.state === f.state);
    }
    if (f.city) {
      events = events.filter((e) => e.city === f.city);
    }
    if (f.country) {
      events = events.filter((e) => e.country === f.country);
    }
    if (typeof f.is_online === 'boolean') {
      events = events.filter((e) => !!e.is_online === f.is_online);
    }
    if (f.status) {
      events = events.filter((e) => e.status === f.status);
    }
    if (f.date_from) {
      const from = this._parseDate(f.date_from);
      if (from) {
        events = events.filter((e) => {
          const sd = this._parseDate(e.start_date);
          return sd && sd >= from;
        });
      }
    }
    if (f.date_to) {
      const to = this._parseDate(f.date_to);
      if (to) {
        events = events.filter((e) => {
          const sd = this._parseDate(e.start_date);
          return sd && sd <= to;
        });
      }
    }

    if (sort === 'start_date_desc') {
      events.sort((a, b) => {
        const da = this._parseDate(a.start_date) || new Date(0);
        const db = this._parseDate(b.start_date) || new Date(0);
        return db - da;
      });
    } else {
      events.sort((a, b) => {
        const da = this._parseDate(a.start_date) || new Date(0);
        const db = this._parseDate(b.start_date) || new Date(0);
        return da - db;
      });
    }

    const total_count = events.length;
    const start = (page - 1) * page_size;
    const items = events.slice(start, start + page_size);

    return {
      items,
      total_count,
      page,
      page_size
    };
  }

  getEventDetail(slug) {
    const events = this._getFromStorage('events');
    const sessions = this._getFromStorage('event_sessions');

    const event = events.find((e) => e.slug === slug) || null;
    if (!event) {
      return {
        event: null,
        sessions: []
      };
    }

    const eventSessions = sessions
      .filter((s) => s.event_id === event.id)
      .map((s) => ({
        ...s,
        // foreign key resolution event_id -> event
        event
      }));

    return {
      event,
      sessions: eventSessions
    };
  }

  submitEventRSVP(
    event_id,
    event_session_id,
    guest_name,
    guest_email,
    guests_count,
    receive_reminders,
    notes
  ) {
    const events = this._getFromStorage('events');
    const sessions = this._getFromStorage('event_sessions');

    const event = events.find((e) => e.id === event_id) || null;
    if (!event) {
      return {
        success: false,
        message: 'Event not found',
        rsvp: null,
        confirmation_text: ''
      };
    }

    let session = null;
    if (event_session_id) {
      session = sessions.find((s) => s.id === event_session_id && s.event_id === event_id) || null;
      if (!session) {
        return {
          success: false,
          message: 'Event session not found for this event',
          rsvp: null,
          confirmation_text: ''
        };
      }
    }

    if (!guest_name || !guest_email || !guests_count || guests_count <= 0) {
      return {
        success: false,
        message: 'Invalid RSVP details',
        rsvp: null,
        confirmation_text: ''
      };
    }

    const rsvp = {
      id: this._generateId('rsvp'),
      event_id,
      event_session_id: event_session_id || null,
      guest_name,
      guest_email,
      guests_count,
      receive_reminders: !!receive_reminders,
      created_at: this._now(),
      status: 'confirmed',
      notes: notes || null
    };

    const rsvps = this._getFromStorage('event_rsvps');
    rsvps.push(rsvp);
    this._saveToStorage('event_rsvps', rsvps);

    const confirmation_text = `RSVP confirmed for ${event.title} for ${guests_count} guest(s).`;

    // Attach foreign key resolutions for convenience
    const enrichedRsvp = {
      ...rsvp,
      event,
      event_session: session
    };

    return {
      success: true,
      message: 'RSVP submitted successfully',
      rsvp: enrichedRsvp,
      confirmation_text
    };
  }

  // ----------------------
  // Newsletter
  // ----------------------

  getNewsletterOptions() {
    // Try to load custom topics from storage; if not present, use sensible defaults
    let storedTopics = [];
    const raw = localStorage.getItem('newsletter_topics');
    if (raw) {
      try {
        storedTopics = JSON.parse(raw) || [];
      } catch (e) {
        storedTopics = [];
      }
    }

    const defaultTopics = [
      {
        id: 'family_life',
        label: 'Family Life',
        description: 'Stories and reflections from our daily family life in the field.'
      },
      {
        id: 'field_updates',
        label: 'Field Updates',
        description: 'Ministry news, progress, and ways to pray from the field.'
      },
      {
        id: 'financial_reports',
        label: 'Financial Reports',
        description: 'Periodic financial transparency and stewardship reports.'
      }
    ];

    const topics = storedTopics.length > 0 ? storedTopics : defaultTopics;

    return {
      frequencies: ['immediate', 'daily', 'weekly', 'monthly'],
      topics,
      email_formats: ['html', 'plain_text']
    };
  }

  createOrUpdateNewsletterSubscription(name, email, frequency, email_format, topics, agreed_to_terms) {
    if (!name || !email) {
      return {
        success: false,
        message: 'Name and email are required',
        subscription: null
      };
    }

    const options = this.getNewsletterOptions();
    if (!options.frequencies.includes(frequency)) {
      return {
        success: false,
        message: 'Invalid frequency',
        subscription: null
      };
    }
    if (!options.email_formats.includes(email_format)) {
      return {
        success: false,
        message: 'Invalid email format',
        subscription: null
      };
    }
    if (!Array.isArray(topics) || topics.length === 0) {
      return {
        success: false,
        message: 'At least one topic must be selected',
        subscription: null
      };
    }
    if (!agreed_to_terms) {
      return {
        success: false,
        message: 'You must agree to the terms to subscribe',
        subscription: null
      };
    }

    let subs = this._getFromStorage('newsletter_subscriptions');
    let subscription = subs.find((s) => s.email === email) || null;

    if (subscription) {
      subscription.name = name;
      subscription.frequency = frequency;
      subscription.email_format = email_format;
      subscription.topics = topics;
      subscription.agreed_to_terms = !!agreed_to_terms;
      subscription.is_active = true;
      subscription.updated_at = this._now();
    } else {
      subscription = {
        id: this._generateId('sub'),
        name,
        email,
        frequency,
        email_format,
        topics,
        agreed_to_terms: !!agreed_to_terms,
        is_active: true,
        created_at: this._now(),
        updated_at: null
      };
      subs.push(subscription);
    }

    this._saveToStorage('newsletter_subscriptions', subs);

    return {
      success: true,
      message: 'Subscription saved',
      subscription
    };
  }

  // ----------------------
  // Gift Catalog & Basket
  // ----------------------

  getGiftCatalogFilterOptions() {
    const items = this._getFromStorage('gift_items');

    const categoriesSet = new Set();
    const tagsSet = new Set();
    const currenciesSet = new Set();

    items.forEach((i) => {
      if (i.category) categoriesSet.add(i.category);
      if (Array.isArray(i.tags)) {
        i.tags.forEach((t) => tagsSet.add(t));
      }
      if (i.currency) currenciesSet.add(i.currency);
    });

    const price_ranges = [
      { id: 'under_30', label: 'Under $30', min_price: 0, max_price: 30 },
      { id: '30_to_60', label: '$30 - $60', min_price: 30, max_price: 60 },
      { id: 'under_100', label: 'Under $100', min_price: 0, max_price: 100 },
      { id: 'under_150', label: 'Under $150', min_price: 0, max_price: 150 }
    ];

    return {
      price_ranges,
      categories: Array.from(categoriesSet),
      tags: Array.from(tagsSet),
      currencies: Array.from(currenciesSet)
    };
  }

  listGiftItems(filters, sort = 'price_low_to_high', page = 1, page_size = 20) {
    let items = this._getFromStorage('gift_items');
    const f = filters || {};

    if (f.status) {
      items = items.filter((i) => i.status === f.status);
    } else {
      items = items.filter((i) => i.status === 'active');
    }

    if (typeof f.min_price === 'number') {
      items = items.filter((i) => typeof i.price === 'number' && i.price >= f.min_price);
    }
    if (typeof f.max_price === 'number') {
      items = items.filter((i) => typeof i.price === 'number' && i.price <= f.max_price);
    }

    if (f.price_range_id) {
      const options = this.getGiftCatalogFilterOptions();
      const range = options.price_ranges.find((r) => r.id === f.price_range_id) || null;
      if (range) {
        items = items.filter(
          (i) =>
            typeof i.price === 'number' &&
            i.price >= (range.min_price || 0) &&
            (typeof range.max_price !== 'number' || i.price <= range.max_price)
        );
      }
    }

    if (f.category) {
      items = items.filter((i) => i.category === f.category);
    }
    if (f.tag) {
      items = items.filter((i) => Array.isArray(i.tags) && i.tags.includes(f.tag));
    }

    if (sort === 'price_high_to_low') {
      items.sort((a, b) => {
        const ap = typeof a.price === 'number' ? a.price : 0;
        const bp = typeof b.price === 'number' ? b.price : 0;
        return bp - ap;
      });
    } else if (sort === 'title_asc') {
      items.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    } else {
      items.sort((a, b) => {
        const ap = typeof a.price === 'number' ? a.price : Number.POSITIVE_INFINITY;
        const bp = typeof b.price === 'number' ? b.price : Number.POSITIVE_INFINITY;
        return ap - bp;
      });
    }

    const total_count = items.length;
    const start = (page - 1) * page_size;
    const pageItems = items.slice(start, start + page_size);

    return {
      items: pageItems,
      total_count,
      page,
      page_size
    };
  }

  getGiftItemDetail(slug) {
    const items = this._getFromStorage('gift_items');
    return items.find((i) => i.slug === slug) || null;
  }

  addGiftItemToBasket(gift_item_id, quantity = 1) {
    const giftItems = this._getFromStorage('gift_items');
    const gift = giftItems.find((g) => g.id === gift_item_id) || null;
    if (!gift || gift.status !== 'active') {
      return {
        success: false,
        message: 'Gift item not found or inactive',
        basket: null,
        items: []
      };
    }

    let qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty <= 0) qty = 1;

    if (typeof gift.min_quantity === 'number' && qty < gift.min_quantity) {
      qty = gift.min_quantity;
    }
    if (typeof gift.max_quantity === 'number' && qty > gift.max_quantity) {
      qty = gift.max_quantity;
    }

    const basket = this._getOrCreateBasket();

    let basketItems = this._getFromStorage('basket_items');
    let line = basketItems.find((bi) => bi.basket_id === basket.id && bi.gift_item_id === gift_item_id) || null;

    if (line) {
      line.quantity += qty;
      line.line_total = line.unit_price * line.quantity;
      line.added_at = this._now();
      basketItems = basketItems.map((bi) => (bi.id === line.id ? line : bi));
    } else {
      line = {
        id: this._generateId('bi'),
        basket_id: basket.id,
        gift_item_id,
        quantity: qty,
        unit_price: gift.price,
        line_total: gift.price * qty,
        added_at: this._now()
      };
      basketItems.push(line);
    }

    this._saveToStorage('basket_items', basketItems);

    const { basket: updatedBasket } = this._calculateBasketTotals(basket);

    const itemsForBasket = basketItems.filter((bi) => bi.basket_id === updatedBasket.id);

    return {
      success: true,
      message: 'Item added to basket',
      basket: updatedBasket,
      items: itemsForBasket
    };
  }

  getDonationBasket() {
    const baskets = this._getFromStorage('baskets');
    const basket = baskets.find((b) => b.status === 'open') || null;

    if (!basket) {
      return {
        basket: null,
        items: [],
        total_amount: 0,
        currency: null
      };
    }

    const basketItems = this._getFromStorage('basket_items');
    const giftItems = this._getFromStorage('gift_items');

    const itemsForBasket = basketItems
      .filter((bi) => bi.basket_id === basket.id)
      .map((line_item) => {
        const gift_item = giftItems.find((g) => g.id === line_item.gift_item_id) || null;
        return {
          line_item,
          gift_item
        };
      });

    const total_amount = basket.total_amount || 0;
    const currency = basket.currency || (itemsForBasket[0] && itemsForBasket[0].gift_item
      ? itemsForBasket[0].gift_item.currency
      : null);

    return {
      basket,
      items: itemsForBasket,
      total_amount,
      currency
    };
  }

  updateBasketItemQuantity(basket_item_id, quantity) {
    let basketItems = this._getFromStorage('basket_items');
    const line = basketItems.find((bi) => bi.id === basket_item_id) || null;
    if (!line) {
      return this.getDonationBasket();
    }

    let qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty <= 0) {
      basketItems = basketItems.filter((bi) => bi.id !== basket_item_id);
      this._saveToStorage('basket_items', basketItems);
    } else {
      line.quantity = qty;
      line.line_total = line.unit_price * qty;
      basketItems = basketItems.map((bi) => (bi.id === basket_item_id ? line : bi));
      this._saveToStorage('basket_items', basketItems);
    }

    const baskets = this._getFromStorage('baskets');
    const basket = baskets.find((b) => b.id === line.basket_id) || null;
    if (!basket) {
      return this.getDonationBasket();
    }

    const { basket: updatedBasket } = this._calculateBasketTotals(basket);

    const giftItems = this._getFromStorage('gift_items');
    const itemsForBasket = basketItems
      .filter((bi) => bi.basket_id === updatedBasket.id)
      .map((li) => ({
        line_item: li,
        gift_item: giftItems.find((g) => g.id === li.gift_item_id) || null
      }));

    return {
      basket: updatedBasket,
      items: itemsForBasket,
      total_amount: updatedBasket.total_amount || 0,
      currency: updatedBasket.currency || null
    };
  }

  removeBasketItem(basket_item_id) {
    let basketItems = this._getFromStorage('basket_items');
    const line = basketItems.find((bi) => bi.id === basket_item_id) || null;
    if (!line) {
      return this.getDonationBasket();
    }

    basketItems = basketItems.filter((bi) => bi.id !== basket_item_id);
    this._saveToStorage('basket_items', basketItems);

    const baskets = this._getFromStorage('baskets');
    const basket = baskets.find((b) => b.id === line.basket_id) || null;
    if (!basket) {
      return this.getDonationBasket();
    }

    const { basket: updatedBasket } = this._calculateBasketTotals(basket);
    const giftItems = this._getFromStorage('gift_items');

    const itemsForBasket = basketItems
      .filter((bi) => bi.basket_id === updatedBasket.id)
      .map((li) => ({
        line_item: li,
        gift_item: giftItems.find((g) => g.id === li.gift_item_id) || null
      }));

    return {
      basket: updatedBasket,
      items: itemsForBasket,
      total_amount: updatedBasket.total_amount || 0,
      currency: updatedBasket.currency || null
    };
  }

  // ----------------------
  // Mission Countries & Prayer Reminders
  // ----------------------

  listMissionCountries(filters, sort = 'name_asc') {
    let countries = this._getFromStorage('countries');
    const f = filters || {};

    if (f.region) {
      countries = countries.filter((c) => c.region === f.region);
    }

    if (sort === 'name_asc') {
      countries.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }

    return countries;
  }

  getMissionCountryDetail(slug) {
    const countries = this._getFromStorage('countries');
    const members = this._getFromStorage('country_team_members');
    const reminders = this._getFromStorage('prayer_reminders');

    const country = countries.find((c) => c.slug === slug) || null;
    if (!country) {
      return {
        country: null,
        team_members: [],
        existing_prayer_reminder: null
      };
    }

    const team_members = members
      .filter((m) => m.country_id === country.id)
      .map((m) => ({
        ...m,
        // foreign key resolution country_id -> country
        country
      }));

    const existing_prayer_reminder =
      reminders
        .filter((r) => r.country_id === country.id)
        .map((r) => ({
          ...r,
          // foreign key resolution country_id -> country
          country
        }))[0] || null;

    return {
      country,
      team_members,
      existing_prayer_reminder
    };
  }

  createOrUpdatePrayerReminder(country_id, frequency, day_of_week, time_of_day) {
    const countries = this._getFromStorage('countries');
    const country = countries.find((c) => c.id === country_id) || null;
    if (!country) {
      return {
        success: false,
        message: 'Country not found',
        prayer_reminder: null
      };
    }

    if (!['daily', 'weekly', 'monthly'].includes(frequency)) {
      return {
        success: false,
        message: 'Invalid frequency',
        prayer_reminder: null
      };
    }

    if (frequency !== 'weekly') {
      day_of_week = 'none';
    } else {
      const allowedDays = [
        'monday',
        'tuesday',
        'wednesday',
        'thursday',
        'friday',
        'saturday',
        'sunday'
      ];
      if (!allowedDays.includes((day_of_week || '').toLowerCase())) {
        day_of_week = 'monday';
      }
    }

    const next_reminder_at = this._computeNextPrayerReminderAt(
      frequency,
      day_of_week,
      time_of_day || '08:00'
    );

    let reminders = this._getFromStorage('prayer_reminders');
    let reminder = reminders.find((r) => r.country_id === country_id) || null;

    if (reminder) {
      reminder.frequency = frequency;
      reminder.day_of_week = day_of_week || 'none';
      reminder.time_of_day = time_of_day || '08:00';
      reminder.next_reminder_at = next_reminder_at;
    } else {
      reminder = {
        id: this._generateId('pr'),
        country_id,
        frequency,
        day_of_week: day_of_week || 'none',
        time_of_day: time_of_day || '08:00',
        next_reminder_at,
        created_at: this._now()
      };
      reminders.push(reminder);
    }

    this._saveToStorage('prayer_reminders', reminders);

    const enrichedReminder = {
      ...reminder,
      country
    };

    return {
      success: true,
      message: 'Prayer reminder saved',
      prayer_reminder: enrichedReminder
    };
  }

  // ----------------------
  // Stories & Sharing
  // ----------------------

  getStoryFilterOptions() {
    const stories = this._getFromStorage('stories');

    const categoriesSet = new Set();
    const tagsSet = new Set();

    stories.forEach((s) => {
      if (s.category) categoriesSet.add(s.category);
      if (Array.isArray(s.tags)) {
        s.tags.forEach((t) => tagsSet.add(t));
      }
    });

    return {
      categories: Array.from(categoriesSet),
      tags: Array.from(tagsSet),
      sort_options: ['most_popular', 'newest_first', 'oldest_first']
    };
  }

  listStories(filters, sort = 'most_popular', page = 1, page_size = 10) {
    let stories = this._getFromStorage('stories');
    const f = filters || {};

    if (f.status) {
      stories = stories.filter((s) => s.status === f.status);
    } else {
      stories = stories.filter((s) => s.status === 'published');
    }

    if (f.category) {
      stories = stories.filter((s) => s.category === f.category);
    }
    if (f.tag) {
      stories = stories.filter((s) => Array.isArray(s.tags) && s.tags.includes(f.tag));
    }
    if (typeof f.year === 'number') {
      stories = stories.filter((s) => {
        const d = this._parseDate(s.published_at);
        return d && d.getFullYear() === f.year;
      });
    }
    if (f.search) {
      const q = f.search.toLowerCase();
      stories = stories.filter((s) => {
        const title = (s.title || '').toLowerCase();
        const content = (s.content || '').toLowerCase();
        return title.includes(q) || content.includes(q);
      });
    }

    if (sort === 'newest_first') {
      stories.sort((a, b) => {
        const da = this._parseDate(a.published_at) || new Date(0);
        const db = this._parseDate(b.published_at) || new Date(0);
        return db - da;
      });
    } else if (sort === 'oldest_first') {
      stories.sort((a, b) => {
        const da = this._parseDate(a.published_at) || new Date(0);
        const db = this._parseDate(b.published_at) || new Date(0);
        return da - db;
      });
    } else if (sort === 'most_popular') {
      stories.sort((a, b) => {
        const ap = typeof a.popularity_score === 'number' ? a.popularity_score : 0;
        const bp = typeof b.popularity_score === 'number' ? b.popularity_score : 0;
        return bp - ap;
      });
    }

    const total_count = stories.length;
    const start = (page - 1) * page_size;
    const items = stories.slice(start, start + page_size);

    return {
      items,
      total_count,
      page,
      page_size
    };
  }

  getStoryDetail(slug) {
    const stories = this._getFromStorage('stories');
    return stories.find((s) => s.slug === slug) || null;
  }

  getShareLink(content_type, content_id) {
    let content = null;
    let url = '';

    if (content_type === 'story') {
      const stories = this._getFromStorage('stories');
      content = stories.find((s) => s.id === content_id) || null;
      if (!content) {
        return {
          success: false,
          url: '',
          message: 'Story not found'
        };
      }
      if (content.share_url) {
        url = content.share_url;
      } else if (content.slug) {
        url = `/stories/${content.slug}`;
      }
    } else if (content_type === 'blog_post') {
      const posts = this._getFromStorage('blog_posts');
      content = posts.find((p) => p.id === content_id) || null;
      if (!content) {
        return {
          success: false,
          url: '',
          message: 'Blog post not found'
        };
      }
      if (content.slug) {
        url = `/blog/${content.slug}`;
      }
    } else {
      return {
        success: false,
        url: '',
        message: 'Invalid content_type'
      };
    }

    // Instrumentation for task completion tracking
    try {
      localStorage.setItem(
        'task9_shareLinkGenerated',
        JSON.stringify({
          content_type,
          content_id,
          url,
          requested_at: new Date().toISOString()
        })
      );
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      success: true,
      url,
      message: 'Share link generated'
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