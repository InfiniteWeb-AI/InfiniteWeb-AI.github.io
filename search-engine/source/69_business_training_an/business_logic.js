/* localStorage polyfill for Node.js and environments without localStorage */
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
  }

  // ----------------------
  // Storage helpers
  // ----------------------

  _initStorage() {
    const ensureArrayKey = (key) => {
      if (localStorage.getItem(key) === null) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    };

    // Core entity storage tables (arrays)
    ensureArrayKey('courses');
    // Single-user cart is stored as a single object under key 'cart'
    ensureArrayKey('cart_items');
    ensureArrayKey('consulting_packages');
    ensureArrayKey('proposal_requests');
    ensureArrayKey('workshops');
    // Single-user training plan stored as single object under 'training_plan'
    ensureArrayKey('training_plan_items');
    ensureArrayKey('services'); // BookingService
    ensureArrayKey('availability_slots');
    ensureArrayKey('bookings');
    ensureArrayKey('case_studies');
    ensureArrayKey('saved_items');
    ensureArrayKey('articles');
    ensureArrayKey('newsletter_subscriptions');
    ensureArrayKey('pricing_calculator_settings');
    ensureArrayKey('custom_training_configurations'); // we treat as array with at most one config
    ensureArrayKey('consultants');
    ensureArrayKey('consultant_contact_requests');

    // Extra table for generic contact form submissions
    ensureArrayKey('contact_form_submissions');

    if (localStorage.getItem('idCounter') === null) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, defaultValue) {
    const raw = localStorage.getItem(key);
    if (raw === null || raw === undefined) {
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

  _now() {
    return new Date().toISOString();
  }

  _findById(collection, id) {
    if (!Array.isArray(collection)) return null;
    return collection.find((item) => item && item.id === id) || null;
  }

  _clone(obj) {
    return obj == null ? obj : JSON.parse(JSON.stringify(obj));
  }

  // ----------------------
  // Cart helpers
  // ----------------------

  _getOrCreateCart() {
    let cart = this._getFromStorage('cart', null);
    if (!cart || typeof cart !== 'object') {
      const now = this._now();
      cart = {
        id: this._generateId('cart'),
        status: 'open',
        created_at: now,
        updated_at: now
      };
      this._saveToStorage('cart', cart);
    }
    // If cart is checked_out or abandoned, create a new open cart
    if (cart.status !== 'open') {
      const now = this._now();
      cart = {
        id: this._generateId('cart'),
        status: 'open',
        created_at: now,
        updated_at: now
      };
      this._saveToStorage('cart', cart);
    }
    return cart;
  }

  _getCartItems(cartId) {
    const allItems = this._getFromStorage('cart_items', []);
    return allItems.filter((item) => item.cart_id === cartId);
  }

  _recalculateCartTotals(cartId) {
    const cartItems = this._getCartItems(cartId);
    let subtotal = 0;
    let currency = null;

    cartItems.forEach((item) => {
      subtotal += (item.unit_price || 0) * (item.quantity || 0);
      if (!currency) {
        currency = item.currency || 'usd';
      }
    });

    const discounts = 0;
    const tax = 0;
    const total = subtotal - discounts + tax;

    return {
      items: cartItems,
      subtotal,
      discounts,
      tax,
      total,
      currency: currency || 'usd'
    };
  }

  // ----------------------
  // Training plan helpers
  // ----------------------

  _getOrCreateTrainingPlan() {
    let plan = this._getFromStorage('training_plan', null);
    if (!plan || typeof plan !== 'object') {
      const now = this._now();
      plan = {
        id: this._generateId('trainingplan'),
        name: 'My Training Plan',
        notes: '',
        created_at: now,
        updated_at: now
      };
      this._saveToStorage('training_plan', plan);
    }
    return plan;
  }

  _getTrainingPlanItems(planId) {
    const allItems = this._getFromStorage('training_plan_items', []);
    return allItems.filter((item) => item.training_plan_id === planId);
  }

  // ----------------------
  // Custom training configuration helpers
  // ----------------------

  _getOrCreateCustomTrainingConfiguration() {
    const configs = this._getFromStorage('custom_training_configurations', []);
    if (configs.length > 0) {
      return configs[0];
    }
    const now = this._now();
    const config = {
      id: this._generateId('ctc'),
      delivery_format: 'on_site_at_office',
      num_participants: 10,
      workshop_length_days: 1,
      workshop_length_label: '1_day',
      include_followup_group_coaching: false,
      followup_group_coaching_sessions: 0,
      include_online_prework_modules: false,
      estimated_total: 0,
      currency: 'usd',
      budget_limit: null,
      is_under_budget: null,
      last_calculated_at: now,
      notes: ''
    };
    configs.push(config);
    this._saveToStorage('custom_training_configurations', configs);
    return config;
  }

  _calculateTrainingEstimateFromSettings(configuration, settings, budgetLimit) {
    if (!configuration || !settings) return configuration;

    const baseDaily = settings.base_daily_rate || 0;
    const perParticipant = settings.per_participant_fee || 0;
    const perCoaching = settings.per_coaching_session_fee || 0;
    const preworkFee = settings.online_prework_module_fee || 0;

    const days = configuration.workshop_length_days || 1;
    const participants = configuration.num_participants || 0;
    const coachingSessions = configuration.include_followup_group_coaching
      ? (configuration.followup_group_coaching_sessions || 0)
      : 0;

    let total = 0;
    total += baseDaily * days;
    total += perParticipant * participants;
    total += perCoaching * coachingSessions;
    if (configuration.include_online_prework_modules) {
      total += preworkFee;
    }

    configuration.estimated_total = total;
    configuration.currency = settings.currency || configuration.currency || 'usd';

    if (typeof budgetLimit === 'number') {
      configuration.budget_limit = budgetLimit;
    }
    if (configuration.budget_limit != null) {
      configuration.is_under_budget = total <= configuration.budget_limit;
    } else {
      configuration.is_under_budget = null;
    }

    configuration.last_calculated_at = this._now();
    return configuration;
  }

  // ----------------------
  // Booking helpers
  // ----------------------

  _lockAndMarkSlotAsBooked(slotId) {
    const slots = this._getFromStorage('availability_slots', []);
    const slot = slots.find((s) => s.id === slotId);
    if (!slot) return { success: false, slot: null };
    if (slot.is_booked) {
      return { success: false, slot: slot };
    }
    slot.is_booked = true;
    this._saveToStorage('availability_slots', slots);
    return { success: true, slot };
  }

  // ==========================================================
  // Core interface implementations
  // ==========================================================

  // ----------------------
  // Home overview
  // ----------------------

  getHomeOverview() {
    const courses = this._getFromStorage('courses', []);
    const workshops = this._getFromStorage('workshops', []);
    const caseStudies = this._getFromStorage('case_studies', []);
    const articles = this._getFromStorage('articles', []);

    const featuredCourses = courses.filter((c) => c.status === 'active' && c.is_featured);
    const featuredWorkshops = workshops.filter((w) => w.status === 'active' && w.is_featured);
    const featuredCaseStudies = caseStudies.filter((c) => c.status === 'published' && c.is_featured);

    const recentArticles = articles
      .filter((a) => a.status === 'published')
      .sort((a, b) => {
        const da = a.published_date ? Date.parse(a.published_date) : 0;
        const db = b.published_date ? Date.parse(b.published_date) : 0;
        return db - da;
      })
      .slice(0, 5);

    return {
      hero: {
        heading: 'Leadership, Training & Consulting',
        subheading: 'Build stronger leaders and more resilient organizations with tailored programs.',
        primaryCtaLabel: 'Explore Training',
        secondaryCtaLabel: 'Consulting Services'
      },
      summarySections: [
        {
          key: 'training',
          title: 'Workshops & Online Training',
          description: 'In-person and virtual leadership, change management, and team performance programs.'
        },
        {
          key: 'consulting',
          title: 'Consulting Services',
          description: 'Advisory support and coaching packages for small businesses through enterprise.'
        }
      ],
      featuredCourses,
      featuredWorkshops,
      featuredCaseStudies,
      recentArticles
    };
  }

  // ----------------------
  // Courses / Cart
  // ----------------------

  getCourseFilterOptions() {
    return {
      levels: [
        { value: 'beginner', label: 'Beginner' },
        { value: 'intermediate', label: 'Intermediate' },
        { value: 'advanced', label: 'Advanced' },
        { value: 'all_levels', label: 'All levels' }
      ],
      topics: ['leadership', 'change_management', 'communication', 'remote_work', 'team_effectiveness'],
      deliveryFormats: [
        { value: 'online_self_paced', label: 'Online (self-paced)' },
        { value: 'online_live', label: 'Online (live)' },
        { value: 'blended', label: 'Blended' }
      ],
      priceRanges: [
        { min: 0, max: 100, label: 'Up to $100' },
        { min: 100, max: 300, label: '$100–$300' },
        { min: 300, max: 1000, label: '$300+' }
      ],
      ratingOptions: [
        { minRating: 4, label: '4.0+ stars' },
        { minRating: 4.5, label: '4.5+ stars' }
      ],
      sortOptions: [
        { value: 'price_asc', label: 'Price: Low to High' },
        { value: 'price_desc', label: 'Price: High to Low' },
        { value: 'rating_desc', label: 'Rating: High to Low' },
        { value: 'popularity_desc', label: 'Most Popular' }
      ]
    };
  }

  searchCourses(query, filters, sort, page = 1, pageSize = 20) {
    let courses = this._getFromStorage('courses', []);

    const q = (query || '').trim().toLowerCase();
    if (q) {
      courses = courses.filter((c) => {
        const haystack = [c.title, c.short_description, c.full_description]
          .filter(Boolean)
          .join(' ') + ' ' + (Array.isArray(c.topics) ? c.topics.join(' ') : '');
        return haystack.toLowerCase().includes(q);
      });
    }

    if (filters && typeof filters === 'object') {
      if (filters.level) {
        courses = courses.filter((c) => c.level === filters.level);
      }
      if (typeof filters.minPrice === 'number') {
        courses = courses.filter((c) => typeof c.price === 'number' && c.price >= filters.minPrice);
      }
      if (typeof filters.maxPrice === 'number') {
        courses = courses.filter((c) => typeof c.price === 'number' && c.price <= filters.maxPrice);
      }
      if (typeof filters.minRating === 'number') {
        courses = courses.filter((c) => typeof c.rating === 'number' && c.rating >= filters.minRating);
      }
      if (typeof filters.maxRating === 'number') {
        courses = courses.filter((c) => typeof c.rating === 'number' && c.rating <= filters.maxRating);
      }
      if (filters.topics && Array.isArray(filters.topics) && filters.topics.length > 0) {
        courses = courses.filter((c) => {
          if (!Array.isArray(c.topics)) return false;
          return filters.topics.some((t) => c.topics.includes(t));
        });
      }
      if (filters.deliveryFormat) {
        courses = courses.filter((c) => c.delivery_format === filters.deliveryFormat);
      }
      if (filters.currency) {
        courses = courses.filter((c) => c.currency === filters.currency);
      }
      if (filters.onlyActive) {
        courses = courses.filter((c) => c.status === 'active');
      }
    }

    if (sort) {
      if (sort === 'price_asc') {
        courses.sort((a, b) => (a.price || 0) - (b.price || 0));
      } else if (sort === 'price_desc') {
        courses.sort((a, b) => (b.price || 0) - (a.price || 0));
      } else if (sort === 'rating_desc') {
        courses.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      } else if (sort === 'popularity_desc') {
        courses.sort((a, b) => (b.rating_count || 0) - (a.rating_count || 0));
      }
    }

    const totalCount = courses.length;
    const start = (page - 1) * pageSize;
    const items = courses.slice(start, start + pageSize);

    return {
      items,
      totalCount,
      page,
      pageSize
    };
  }

  getCourseDetails(courseId) {
    const courses = this._getFromStorage('courses', []);
    const course = this._findById(courses, courseId);

    let relatedCourses = [];
    if (course) {
      relatedCourses = courses
        .filter((c) => c.id !== course.id && c.status === 'active')
        .filter((c) => {
          const sameLevel = c.level === course.level;
          const overlapTopics = Array.isArray(c.topics) && Array.isArray(course.topics)
            ? c.topics.some((t) => course.topics.includes(t))
            : false;
          return sameLevel || overlapTopics;
        })
        .sort((a, b) => (b.rating || 0) - (a.rating || 0))
        .slice(0, 5);
    }

    return {
      course: course || null,
      relatedCourses
    };
  }

  addCourseToCart(courseId, quantity = 1) {
    if (!courseId || quantity <= 0) {
      return { success: false, message: 'Invalid course or quantity.' };
    }

    const courses = this._getFromStorage('courses', []);
    const course = this._findById(courses, courseId);
    if (!course || course.status !== 'active') {
      return { success: false, message: 'Course not found or inactive.' };
    }

    const cart = this._getOrCreateCart();
    const allItems = this._getFromStorage('cart_items', []);

    let item = allItems.find(
      (ci) => ci.cart_id === cart.id && ci.item_type === 'course' && ci.item_ref_id === courseId
    );

    if (item) {
      item.quantity += quantity;
      item.added_at = this._now();
    } else {
      item = {
        id: this._generateId('cartitem'),
        cart_id: cart.id,
        item_type: 'course',
        item_ref_id: courseId,
        title_snapshot: course.title,
        unit_price: course.price,
        currency: course.currency,
        quantity: quantity,
        added_at: this._now()
      };
      allItems.push(item);
    }

    cart.updated_at = this._now();
    this._saveToStorage('cart', cart);
    this._saveToStorage('cart_items', allItems);

    const totals = this._recalculateCartTotals(cart.id);

    return {
      success: true,
      message: 'Course added to cart.',
      cart,
      items: totals.items,
      subtotal: totals.subtotal,
      discounts: totals.discounts,
      tax: totals.tax,
      total: totals.total,
      currency: totals.currency
    };
  }

  getCartDetails() {
    const cart = this._getFromStorage('cart', null);
    if (!cart) {
      return {
        cart: null,
        items: [],
        subtotal: 0,
        discounts: 0,
        tax: 0,
        total: 0,
        currency: 'usd'
      };
    }

    const courses = this._getFromStorage('courses', []);
    const totals = this._recalculateCartTotals(cart.id);

    const itemsDetailed = totals.items.map((cartItem) => {
      const course = courses.find((c) => c.id === cartItem.item_ref_id) || null;
      return { cartItem, course };
    });

    return {
      cart,
      items: itemsDetailed,
      subtotal: totals.subtotal,
      discounts: totals.discounts,
      tax: totals.tax,
      total: totals.total,
      currency: totals.currency
    };
  }

  updateCartItemQuantity(cartItemId, quantity) {
    const cart = this._getFromStorage('cart', null);
    const allItems = this._getFromStorage('cart_items', []);

    const index = allItems.findIndex((ci) => ci.id === cartItemId);
    if (index !== -1) {
      if (quantity <= 0) {
        allItems.splice(index, 1);
      } else {
        allItems[index].quantity = quantity;
        allItems[index].added_at = this._now();
      }
      this._saveToStorage('cart_items', allItems);
      if (cart) {
        cart.updated_at = this._now();
        this._saveToStorage('cart', cart);
      }
    }

    if (!cart) {
      return {
        cart: null,
        items: [],
        subtotal: 0,
        discounts: 0,
        tax: 0,
        total: 0,
        currency: 'usd'
      };
    }

    const totals = this._recalculateCartTotals(cart.id);
    return {
      cart,
      items: totals.items,
      subtotal: totals.subtotal,
      discounts: totals.discounts,
      tax: totals.tax,
      total: totals.total,
      currency: totals.currency
    };
  }

  removeCartItem(cartItemId) {
    const cart = this._getFromStorage('cart', null);
    const allItems = this._getFromStorage('cart_items', []);

    const index = allItems.findIndex((ci) => ci.id === cartItemId);
    if (index !== -1) {
      allItems.splice(index, 1);
      this._saveToStorage('cart_items', allItems);
      if (cart) {
        cart.updated_at = this._now();
        this._saveToStorage('cart', cart);
      }
    }

    if (!cart) {
      return {
        cart: null,
        items: [],
        subtotal: 0,
        discounts: 0,
        tax: 0,
        total: 0,
        currency: 'usd'
      };
    }

    const totals = this._recalculateCartTotals(cart.id);
    return {
      cart,
      items: totals.items,
      subtotal: totals.subtotal,
      discounts: totals.discounts,
      tax: totals.tax,
      total: totals.total,
      currency: totals.currency
    };
  }

  // ----------------------
  // Consulting packages & proposal
  // ----------------------

  getConsultingPackageFilterOptions() {
    return {
      audiences: [
        { value: 'small_business_1_50', label: 'Small Business (1–50 employees)' },
        { value: 'startup_1_20', label: 'Startup (1–20 employees)' },
        { value: 'mid_market_51_500', label: 'Mid-market (51–500 employees)' },
        { value: 'enterprise_500_plus', label: 'Enterprise (500+ employees)' }
      ],
      industries: ['technology', 'healthcare', 'finance', 'manufacturing', 'professional_services', 'other'],
      sortOptions: [
        { value: 'monthly_price_asc', label: 'Monthly Price: Low to High' },
        { value: 'monthly_price_desc', label: 'Monthly Price: High to Low' },
        { value: 'hours_desc', label: 'Hours per Month: High to Low' },
        { value: 'popularity_desc', label: 'Most Popular' }
      ]
    };
  }

  searchConsultingPackages(filters, sort, page = 1, pageSize = 20) {
    let packages = this._getFromStorage('consulting_packages', []);

    if (filters && typeof filters === 'object') {
      if (filters.audience) {
        packages = packages.filter((p) => p.audience === filters.audience);
      }
      if (filters.industry) {
        packages = packages.filter((p) => {
          if (!Array.isArray(p.industry_focus)) return false;
          return p.industry_focus.includes(filters.industry);
        });
      }
      if (typeof filters.minMonthlyPrice === 'number') {
        packages = packages.filter(
          (p) => typeof p.monthly_price === 'number' && p.monthly_price >= filters.minMonthlyPrice
        );
      }
      if (typeof filters.maxMonthlyPrice === 'number') {
        packages = packages.filter(
          (p) => typeof p.monthly_price === 'number' && p.monthly_price <= filters.maxMonthlyPrice
        );
      }
      if (typeof filters.minHoursPerMonth === 'number') {
        packages = packages.filter(
          (p) => typeof p.hours_per_month === 'number' && p.hours_per_month >= filters.minHoursPerMonth
        );
      }
      if (filters.onlyActive) {
        packages = packages.filter((p) => p.status === 'active');
      }
    }

    if (sort) {
      if (sort === 'monthly_price_asc') {
        packages.sort((a, b) => (a.monthly_price || 0) - (b.monthly_price || 0));
      } else if (sort === 'monthly_price_desc') {
        packages.sort((a, b) => (b.monthly_price || 0) - (a.monthly_price || 0));
      } else if (sort === 'hours_desc') {
        packages.sort((a, b) => (b.hours_per_month || 0) - (a.hours_per_month || 0));
      } else if (sort === 'popularity_desc') {
        packages.sort((a, b) => (b.is_featured ? 1 : 0) - (a.is_featured ? 1 : 0));
      }
    }

    const totalCount = packages.length;
    const start = (page - 1) * pageSize;
    const items = packages.slice(start, start + pageSize);

    return { items, totalCount, page, pageSize };
  }

  getConsultingPackageDetails(packageId) {
    const packages = this._getFromStorage('consulting_packages', []);
    const consultingPackage = this._findById(packages, packageId);

    let similarPackages = [];
    if (consultingPackage) {
      similarPackages = packages
        .filter((p) => p.id !== consultingPackage.id && p.audience === consultingPackage.audience)
        .sort((a, b) => (a.monthly_price || 0) - (b.monthly_price || 0))
        .slice(0, 5);
    }

    return {
      consultingPackage: consultingPackage || null,
      similarPackages
    };
  }

  getProposalContext(sourceType, consultingPackageId, customTrainingConfigurationId) {
    const result = {
      sourceType,
      consultingPackage: null,
      customTrainingConfiguration: null,
      summaryText: '',
      estimateTotal: null,
      currency: null
    };

    if (sourceType === 'consulting_package' && consultingPackageId) {
      const packages = this._getFromStorage('consulting_packages', []);
      const pkg = this._findById(packages, consultingPackageId);
      if (pkg) {
        result.consultingPackage = pkg;
        result.summaryText = pkg.summary || pkg.description || pkg.name || '';
        result.estimateTotal = pkg.monthly_price || null;
        result.currency = pkg.currency || null;
      }
    } else if (sourceType === 'custom_training_configuration' && customTrainingConfigurationId) {
      const configs = this._getFromStorage('custom_training_configurations', []);
      const config = this._findById(configs, customTrainingConfigurationId);
      if (config) {
        result.customTrainingConfiguration = config;
        result.summaryText = config.notes || 'Custom training configuration';
        result.estimateTotal = config.estimated_total || null;
        result.currency = config.currency || null;
      }
    }

    return result;
  }

  submitProposalRequest(
    sourceType,
    consultingPackageId,
    customTrainingConfigurationId,
    companyName,
    companySize,
    contactName,
    email,
    phone,
    projectGoals,
    projectScope,
    preferredStartDate
  ) {
    if (!email) {
      return { success: false, message: 'Email is required.', proposalRequest: null };
    }

    const now = this._now();
    const requests = this._getFromStorage('proposal_requests', []);

    let pkgSnapshotName = null;
    let estimateTotal = null;
    let currency = null;
    let configurationSummary = null;

    if (sourceType === 'consulting_package' && consultingPackageId) {
      const packages = this._getFromStorage('consulting_packages', []);
      const pkg = this._findById(packages, consultingPackageId);
      if (pkg) {
        pkgSnapshotName = pkg.name;
        estimateTotal = pkg.monthly_price || null;
        currency = pkg.currency || null;
      }
    } else if (sourceType === 'custom_training_configuration' && customTrainingConfigurationId) {
      const configs = this._getFromStorage('custom_training_configurations', []);
      const config = this._findById(configs, customTrainingConfigurationId);
      if (config) {
        configurationSummary = config.notes || 'Custom training configuration';
        estimateTotal = config.estimated_total || null;
        currency = config.currency || null;
      }
    }

    const proposalRequest = {
      id: this._generateId('proposal'),
      source_type: sourceType,
      consulting_package_id: sourceType === 'consulting_package' ? consultingPackageId || null : null,
      custom_training_configuration_id:
        sourceType === 'custom_training_configuration' ? customTrainingConfigurationId || null : null,
      package_name_snapshot: pkgSnapshotName,
      configuration_summary: configurationSummary,
      estimate_total: estimateTotal,
      currency: currency,
      company_name: companyName || null,
      company_size: companySize || null,
      contact_name: contactName || null,
      email: email,
      phone: phone || null,
      project_goals: projectGoals || null,
      project_scope: projectScope || null,
      preferred_start_date: preferredStartDate || null,
      status: 'submitted',
      created_at: now,
      updated_at: now
    };

    requests.push(proposalRequest);
    this._saveToStorage('proposal_requests', requests);

    return {
      success: true,
      message: 'Proposal request submitted.',
      proposalRequest
    };
  }

  // ----------------------
  // Workshops & Training plan
  // ----------------------

  getWorkshopFilterOptions() {
    return {
      categories: ['leadership', 'change_management', 'communication', 'strategy'],
      formats: [
        { value: 'in_person', label: 'In-person' },
        { value: 'virtual_live', label: 'Virtual live' },
        { value: 'online_self_paced', label: 'Online self-paced' },
        { value: 'blended', label: 'Blended' }
      ],
      durationTypes: [
        { value: 'half_day', label: 'Half day' },
        { value: '1_day', label: '1 day' },
        { value: '2_day', label: '2 days' },
        { value: 'multi_day', label: 'Multi-day' },
        { value: 'multi_week', label: 'Multi-week' }
      ],
      sortOptions: [
        { value: 'rating_desc', label: 'Rating: High to Low' },
        { value: 'next_start_date_asc', label: 'Next date: Soonest' },
        { value: 'price_asc', label: 'Price: Low to High' }
      ]
    };
  }

  searchWorkshops(filters, sort, page = 1, pageSize = 20) {
    let workshops = this._getFromStorage('workshops', []);

    if (filters && typeof filters === 'object') {
      if (filters.categories && Array.isArray(filters.categories) && filters.categories.length > 0) {
        workshops = workshops.filter((w) => {
          if (!Array.isArray(w.categories)) return false;
          return filters.categories.some((c) => w.categories.includes(c));
        });
      }
      if (filters.format) {
        workshops = workshops.filter((w) => w.format === filters.format);
      }
      if (filters.durationTypes && Array.isArray(filters.durationTypes) && filters.durationTypes.length > 0) {
        workshops = workshops.filter((w) => filters.durationTypes.includes(w.duration_type));
      }
      if (typeof filters.minRating === 'number') {
        workshops = workshops.filter((w) => typeof w.rating === 'number' && w.rating >= filters.minRating);
      }
      if (filters.onlyActive) {
        workshops = workshops.filter((w) => w.status === 'active');
      }
    }

    if (sort) {
      if (sort === 'rating_desc') {
        workshops.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      } else if (sort === 'next_start_date_asc') {
        workshops.sort((a, b) => {
          const da = a.next_start_date ? Date.parse(a.next_start_date) : Infinity;
          const db = b.next_start_date ? Date.parse(b.next_start_date) : Infinity;
          return da - db;
        });
      } else if (sort === 'price_asc') {
        workshops.sort((a, b) => (a.price_per_session || 0) - (b.price_per_session || 0));
      }
    }

    const totalCount = workshops.length;
    const start = (page - 1) * pageSize;
    const items = workshops.slice(start, start + pageSize);

    return { items, totalCount, page, pageSize };
  }

  getWorkshopDetails(workshopId) {
    const workshops = this._getFromStorage('workshops', []);
    const workshop = this._findById(workshops, workshopId);

    const summary = workshop && workshop.summary ? workshop.summary : '';
    const description = workshop && workshop.description ? workshop.description : '';

    const agenda = summary || description || 'Agenda to be confirmed.';
    const expectedOutcomes = 'Expected outcomes will be tailored based on your organization and participants.';

    return {
      workshop: workshop || null,
      agenda,
      expectedOutcomes
    };
  }

  addWorkshopToTrainingPlan(workshopId, priority, notes) {
    if (!workshopId) {
      return { success: false, trainingPlan: null, items: [] };
    }

    const workshops = this._getFromStorage('workshops', []);
    const workshop = this._findById(workshops, workshopId);
    if (!workshop) {
      return { success: false, trainingPlan: null, items: [] };
    }

    const trainingPlan = this._getOrCreateTrainingPlan();
    const allItems = this._getFromStorage('training_plan_items', []);

    let item = allItems.find(
      (i) => i.training_plan_id === trainingPlan.id && i.workshop_id === workshopId
    );

    if (item) {
      if (priority) item.priority = priority;
      if (notes) item.notes = notes;
      item.added_at = this._now();
    } else {
      item = {
        id: this._generateId('tpi'),
        training_plan_id: trainingPlan.id,
        workshop_id: workshopId,
        added_at: this._now(),
        priority: priority || null,
        notes: notes || ''
      };
      allItems.push(item);
    }

    trainingPlan.updated_at = this._now();
    this._saveToStorage('training_plan', trainingPlan);
    this._saveToStorage('training_plan_items', allItems);

    const planItems = this._getTrainingPlanItems(trainingPlan.id);

    return {
      success: true,
      trainingPlan,
      items: planItems
    };
  }

  getTrainingPlan() {
    const trainingPlan = this._getOrCreateTrainingPlan();
    const planItems = this._getTrainingPlanItems(trainingPlan.id);
    const workshops = this._getFromStorage('workshops', []);

    const itemsDetailed = planItems.map((trainingPlanItem) => {
      const workshop = workshops.find((w) => w.id === trainingPlanItem.workshop_id) || null;
      return { trainingPlanItem, workshop };
    });

    return {
      trainingPlan,
      items: itemsDetailed
    };
  }

  updateTrainingPlanItem(trainingPlanItemId, priority, notes) {
    const allItems = this._getFromStorage('training_plan_items', []);
    const idx = allItems.findIndex((i) => i.id === trainingPlanItemId);
    if (idx !== -1) {
      if (priority !== undefined && priority !== null) {
        allItems[idx].priority = priority;
      }
      if (notes !== undefined && notes !== null) {
        allItems[idx].notes = notes;
      }
      this._saveToStorage('training_plan_items', allItems);
    }

    const trainingPlan = this._getOrCreateTrainingPlan();
    const planItems = this._getTrainingPlanItems(trainingPlan.id);

    return {
      trainingPlan,
      items: planItems
    };
  }

  removeTrainingPlanItem(trainingPlanItemId) {
    const allItems = this._getFromStorage('training_plan_items', []);
    const idx = allItems.findIndex((i) => i.id === trainingPlanItemId);
    if (idx !== -1) {
      allItems.splice(idx, 1);
      this._saveToStorage('training_plan_items', allItems);
    }

    const trainingPlan = this._getOrCreateTrainingPlan();
    const planItems = this._getTrainingPlanItems(trainingPlan.id);

    return {
      trainingPlan,
      items: planItems
    };
  }

  exportTrainingPlan(format) {
    const { trainingPlan, items } = this.getTrainingPlan();

    const lines = [];
    lines.push('Training Plan: ' + (trainingPlan.name || 'My Training Plan'));
    lines.push('');
    items.forEach(({ trainingPlanItem, workshop }, index) => {
      const title = workshop ? workshop.title : 'Unknown workshop';
      const dur = workshop ? workshop.duration_type : '';
      const fmt = workshop ? workshop.format : '';
      lines.push(
        (index + 1) + '. ' + title + (dur ? ' (' + dur + ')' : '') + (fmt ? ' - ' + fmt : '')
      );
    });

    let contentType = 'text/plain';
    let content = lines.join('\n');

    if (format === 'print_view') {
      contentType = 'text/html';
      const htmlItems = items
        .map(({ trainingPlanItem, workshop }) => {
          const title = workshop ? workshop.title : 'Unknown workshop';
          return '<li>' + title + '</li>';
        })
        .join('');
      content =
        '<h1>' +
        (trainingPlan.name || 'My Training Plan') +
        '</h1><ul>' +
        htmlItems +
        '</ul>';
    } else if (format === 'pdf') {
      contentType = 'application/pdf';
      // Still text; a real system would generate binary PDF content
      content = lines.join('\n');
    } else if (format === 'email_body') {
      contentType = 'text/plain';
      content = lines.join('\n');
    }

    return {
      content,
      contentType
    };
  }

  // ----------------------
  // Booking services & availability
  // ----------------------

  getBookingServices() {
    const services = this._getFromStorage('services', []);
    return services.filter((s) => s.is_active);
  }

  getServiceDurations(serviceId) {
    const services = this._getFromStorage('services', []);
    const service = this._findById(services, serviceId);
    if (!service) return [];

    const base = service.default_duration_minutes || 60;
    const durations = new Set();
    durations.add(base);
    durations.add(60);
    durations.add(90);

    return Array.from(durations)
      .sort((a, b) => a - b)
      .map((d) => ({ durationMinutes: d, label: d + ' minutes' }));
  }

  getAvailabilitySlots(serviceId, weekStartDate, timeOfDay) {
    const slots = this._getFromStorage('availability_slots', []);
    const start = Date.parse(weekStartDate);
    const end = isNaN(start) ? null : start + 7 * 24 * 60 * 60 * 1000;

    let filtered = slots.filter((s) => s.service_id === serviceId && !s.is_booked);

    if (!isNaN(start) && end !== null) {
      filtered = filtered.filter((s) => {
        const sStart = Date.parse(s.start_datetime);
        return !isNaN(sStart) && sStart >= start && sStart < end;
      });
    }

    if (timeOfDay) {
      filtered = filtered.filter((s) => s.time_of_day === timeOfDay);
    }

    filtered.sort((a, b) => {
      const sa = Date.parse(a.start_datetime);
      const sb = Date.parse(b.start_datetime);
      return sa - sb;
    });

    return { slots: filtered };
  }

  createBooking(serviceId, slotId, durationMinutes, fullName, email, company) {
    if (!serviceId || !slotId || !durationMinutes || !fullName || !email) {
      return { success: false, message: 'Missing required booking fields.', booking: null };
    }

    const services = this._getFromStorage('services', []);
    const service = this._findById(services, serviceId);
    if (!service || !service.is_active) {
      return { success: false, message: 'Service not available.', booking: null };
    }

    const slots = this._getFromStorage('availability_slots', []);
    const slot = this._findById(slots, slotId);
    if (!slot || slot.service_id !== serviceId) {
      return { success: false, message: 'Slot not found for service.', booking: null };
    }

    if (slot.is_booked) {
      return { success: false, message: 'Slot already booked.', booking: null };
    }

    const lockResult = this._lockAndMarkSlotAsBooked(slotId);
    if (!lockResult.success) {
      return { success: false, message: 'Slot could not be booked.', booking: null };
    }

    const booking = {
      id: this._generateId('booking'),
      service_id: serviceId,
      slot_id: slotId,
      service_name_snapshot: service.name,
      duration_minutes: durationMinutes,
      start_datetime: slot.start_datetime,
      end_datetime: slot.end_datetime,
      client_full_name: fullName,
      client_email: email,
      client_company: company || null,
      status: 'confirmed',
      created_at: this._now()
    };

    const bookings = this._getFromStorage('bookings', []);
    bookings.push(booking);
    this._saveToStorage('bookings', bookings);

    return {
      success: true,
      message: 'Booking confirmed.',
      booking
    };
  }

  // ----------------------
  // Case studies & saved items
  // ----------------------

  getCaseStudyFilterOptions() {
    return {
      industries: ['technology', 'healthcare', 'finance', 'manufacturing', 'professional_services', 'other'],
      budgetPresets: [
        { min: 0, max: 20000, label: 'Under $20k' },
        { min: 20000, max: 50000, label: '$20k–$50k' },
        { min: 50000, max: 1000000, label: '$50k+' }
      ],
      durationBuckets: [
        { value: 'less_than_6_months', label: 'Less than 6 months' },
        { value: 'between_6_12_months', label: '6–12 months' },
        { value: 'more_than_12_months', label: 'More than 12 months' }
      ],
      sortOptions: [
        { value: 'newest_first', label: 'Newest first' },
        { value: 'most_impactful', label: 'Most impactful' },
        { value: 'relevance', label: 'Relevance' }
      ]
    };
  }

  searchCaseStudies(filters, sort, page = 1, pageSize = 20) {
    let studies = this._getFromStorage('case_studies', []);

    if (filters && typeof filters === 'object') {
      if (filters.industry) {
        studies = studies.filter((c) => c.industry === filters.industry);
      }
      if (typeof filters.minBudget === 'number') {
        studies = studies.filter((c) => typeof c.budget === 'number' && c.budget >= filters.minBudget);
      }
      if (typeof filters.maxBudget === 'number') {
        studies = studies.filter((c) => typeof c.budget === 'number' && c.budget <= filters.maxBudget);
      }
      if (filters.durationBucket) {
        studies = studies.filter((c) => c.duration_bucket === filters.durationBucket);
      }
      if (filters.onlyPublished) {
        studies = studies.filter((c) => c.status === 'published');
      }
    }

    if (sort) {
      if (sort === 'newest_first') {
        studies.sort((a, b) => {
          const da = a.published_date ? Date.parse(a.published_date) : 0;
          const db = b.published_date ? Date.parse(b.published_date) : 0;
          return db - da;
        });
      } else if (sort === 'most_impactful') {
        studies.sort((a, b) => (b.is_featured ? 1 : 0) - (a.is_featured ? 1 : 0));
      }
    }

    const totalCount = studies.length;
    const start = (page - 1) * pageSize;
    const items = studies.slice(start, start + pageSize);

    return { items, totalCount, page, pageSize };
  }

  getCaseStudyDetails(caseStudyId) {
    const studies = this._getFromStorage('case_studies', []);
    return this._findById(studies, caseStudyId) || null;
  }

  saveCaseStudy(caseStudyId) {
    const studies = this._getFromStorage('case_studies', []);
    const caseStudy = this._findById(studies, caseStudyId);
    if (!caseStudy) {
      return { success: false, savedItem: null };
    }

    const savedItems = this._getFromStorage('saved_items', []);
    let savedItem = savedItems.find(
      (s) => s.content_type === 'case_study' && s.content_id === caseStudyId
    );

    if (!savedItem) {
      savedItem = {
        id: this._generateId('saved'),
        content_type: 'case_study',
        content_id: caseStudyId,
        title_snapshot: caseStudy.title,
        saved_at: this._now()
      };
      savedItems.push(savedItem);
      this._saveToStorage('saved_items', savedItems);
    }

    return { success: true, savedItem };
  }

  getSavedItems() {
    const savedItems = this._getFromStorage('saved_items', []);
    const caseStudies = this._getFromStorage('case_studies', []);

    const items = savedItems.map((savedItem) => {
      let caseStudy = null;
      if (savedItem.content_type === 'case_study') {
        caseStudy = caseStudies.find((c) => c.id === savedItem.content_id) || null;
      }
      return { savedItem, caseStudy };
    });

    return { items };
  }

  removeSavedItem(savedItemId) {
    const savedItems = this._getFromStorage('saved_items', []);
    const idx = savedItems.findIndex((s) => s.id === savedItemId);
    if (idx !== -1) {
      savedItems.splice(idx, 1);
      this._saveToStorage('saved_items', savedItems);
    }
    return { success: true };
  }

  // ----------------------
  // Articles & newsletter
  // ----------------------

  getArticleFilterOptions() {
    const articles = this._getFromStorage('articles', []);
    const tagSet = new Set();
    articles.forEach((a) => {
      if (Array.isArray(a.tags)) {
        a.tags.forEach((t) => tagSet.add(t));
      }
    });

    return {
      tags: Array.from(tagSet),
      sortOptions: [
        { value: 'most_popular', label: 'Most popular' },
        { value: 'newest_first', label: 'Newest first' },
        { value: 'relevance', label: 'Relevance' }
      ]
    };
  }

  searchArticles(query, filters, sort, page = 1, pageSize = 20) {
    let articles = this._getFromStorage('articles', []);

    const q = (query || '').trim().toLowerCase();
    if (q) {
      articles = articles.filter((a) => {
        const haystack = [a.title, a.excerpt, a.content].filter(Boolean).join(' ');
        return haystack.toLowerCase().includes(q);
      });
    }

    if (filters && typeof filters === 'object') {
      if (filters.tags && Array.isArray(filters.tags) && filters.tags.length > 0) {
        articles = articles.filter((a) => {
          if (!Array.isArray(a.tags)) return false;
          return filters.tags.some((t) => a.tags.includes(t));
        });
      }
      if (filters.onlyPublished) {
        articles = articles.filter((a) => a.status === 'published');
      }
    }

    if (sort) {
      if (sort === 'most_popular') {
        articles.sort((a, b) => (b.popularity_score || b.views || 0) - (a.popularity_score || a.views || 0));
      } else if (sort === 'newest_first') {
        articles.sort((a, b) => {
          const da = a.published_date ? Date.parse(a.published_date) : 0;
          const db = b.published_date ? Date.parse(b.published_date) : 0;
          return db - da;
        });
      }
      // 'relevance' can default to current ordering after filtering
    }

    const totalCount = articles.length;
    const start = (page - 1) * pageSize;
    const items = articles.slice(start, start + pageSize);

    return { items, totalCount, page, pageSize };
  }

  getArticleDetails(articleId) {
    const articles = this._getFromStorage('articles', []);
    return this._findById(articles, articleId) || null;
  }

  createNewsletterSubscription(email, topics, frequency, source, articleId) {
    if (!email || !frequency) {
      return { success: false, message: 'Email and frequency are required.', subscription: null };
    }

    const subscriptions = this._getFromStorage('newsletter_subscriptions', []);
    const subscription = {
      id: this._generateId('nls'),
      email: email,
      topics: Array.isArray(topics) ? topics : [],
      frequency: frequency,
      source: source || (articleId ? 'blog_article' : null),
      article_id: articleId || null,
      created_at: this._now()
    };

    subscriptions.push(subscription);
    this._saveToStorage('newsletter_subscriptions', subscriptions);

    return {
      subscription,
      success: true,
      message: 'Subscription created.'
    };
  }

  // ----------------------
  // Pricing & custom training calculator
  // ----------------------

  getPricingOverview() {
    const workshops = this._getFromStorage('workshops', []);
    const consultingPackages = this._getFromStorage('consulting_packages', []);
    const settingsList = this._getFromStorage('pricing_calculator_settings', []);
    const calculatorSettings = settingsList.length > 0 ? settingsList[0] : null;

    let minWorkshopPrice = null;
    let workshopCurrency = 'usd';
    workshops.forEach((w) => {
      if (typeof w.price_per_session === 'number') {
        if (minWorkshopPrice === null || w.price_per_session < minWorkshopPrice) {
          minWorkshopPrice = w.price_per_session;
          workshopCurrency = w.currency || workshopCurrency;
        }
      }
    });

    let minConsultingPrice = null;
    let consultingCurrency = 'usd';
    consultingPackages.forEach((p) => {
      if (typeof p.monthly_price === 'number') {
        if (minConsultingPrice === null || p.monthly_price < minConsultingPrice) {
          minConsultingPrice = p.monthly_price;
          consultingCurrency = p.currency || consultingCurrency;
        }
      }
    });

    const trainingTiers = [
      {
        name: 'Workshops & Programs',
        description: 'In-person and virtual leadership and change programs.',
        startingFrom: minWorkshopPrice || 0,
        currency: workshopCurrency
      }
    ];

    const consultingTiers = [
      {
        name: 'Consulting Packages',
        description: 'Ongoing advisory and coaching support.',
        startingFrom: minConsultingPrice || 0,
        currency: consultingCurrency
      }
    ];

    return {
      trainingTiers,
      consultingTiers,
      calculatorSettings
    };
  }

  getCurrentCustomTrainingConfiguration() {
    const config = this._getOrCreateCustomTrainingConfiguration();
    const settingsList = this._getFromStorage('pricing_calculator_settings', []);
    const calculatorSettings = settingsList.length > 0 ? settingsList[0] : null;

    return {
      configuration: config,
      calculatorSettings
    };
  }

  updateCustomTrainingConfiguration(
    deliveryFormat,
    numParticipants,
    workshopLengthDays,
    workshopLengthLabel,
    includeFollowupGroupCoaching,
    followupGroupCoachingSessions,
    includeOnlinePreworkModules,
    budgetLimit
  ) {
    const configs = this._getFromStorage('custom_training_configurations', []);
    let config = configs.length > 0 ? configs[0] : this._getOrCreateCustomTrainingConfiguration();

    config.delivery_format = deliveryFormat;
    config.num_participants = numParticipants;
    config.workshop_length_days = workshopLengthDays;
    if (workshopLengthLabel) {
      config.workshop_length_label = workshopLengthLabel;
    }
    config.include_followup_group_coaching = !!includeFollowupGroupCoaching;
    config.followup_group_coaching_sessions = includeFollowupGroupCoaching
      ? (followupGroupCoachingSessions || 0)
      : 0;
    config.include_online_prework_modules = !!includeOnlinePreworkModules;

    if (typeof budgetLimit === 'number') {
      config.budget_limit = budgetLimit;
    }

    const settingsList = this._getFromStorage('pricing_calculator_settings', []);
    const calculatorSettings = settingsList.length > 0 ? settingsList[0] : null;

    if (calculatorSettings) {
      this._calculateTrainingEstimateFromSettings(config, calculatorSettings, budgetLimit);
    }

    if (configs.length === 0) {
      configs.push(config);
    } else {
      configs[0] = config;
    }

    this._saveToStorage('custom_training_configurations', configs);

    return {
      configuration: config
    };
  }

  // ----------------------
  // Consultants directory & contact
  // ----------------------

  getConsultantFilterOptions() {
    const consultants = this._getFromStorage('consultants', []);
    const expertiseSet = new Set();
    consultants.forEach((c) => {
      if (Array.isArray(c.expertise_areas)) {
        c.expertise_areas.forEach((e) => expertiseSet.add(e));
      }
    });

    const regions = [
      { value: 'north_america', label: 'North America' },
      { value: 'europe', label: 'Europe' },
      { value: 'asia_pacific', label: 'Asia-Pacific' },
      { value: 'latin_america', label: 'Latin America' },
      { value: 'middle_east_africa', label: 'Middle East & Africa' }
    ];

    const sortOptions = [
      { value: 'experience_desc', label: 'Experience: High to Low' },
      { value: 'name_asc', label: 'Name: A to Z' },
      { value: 'relevance', label: 'Relevance' }
    ];

    return {
      expertiseAreas: Array.from(expertiseSet),
      regions,
      sortOptions
    };
  }

  searchConsultants(filters, sort, page = 1, pageSize = 20) {
    let consultants = this._getFromStorage('consultants', []);

    if (filters && typeof filters === 'object') {
      if (filters.expertiseAreas && Array.isArray(filters.expertiseAreas) && filters.expertiseAreas.length > 0) {
        consultants = consultants.filter((c) => {
          if (!Array.isArray(c.expertise_areas)) return false;
          return filters.expertiseAreas.some((e) => c.expertise_areas.includes(e));
        });
      }
      if (filters.region) {
        consultants = consultants.filter((c) => c.region === filters.region);
      }
      if (typeof filters.minYearsExperience === 'number') {
        consultants = consultants.filter(
          (c) => typeof c.years_experience === 'number' && c.years_experience >= filters.minYearsExperience
        );
      }
      if (filters.onlyActive) {
        consultants = consultants.filter((c) => c.status === 'active');
      }
    }

    if (sort) {
      if (sort === 'experience_desc') {
        consultants.sort((a, b) => (b.years_experience || 0) - (a.years_experience || 0));
      } else if (sort === 'name_asc') {
        consultants.sort((a, b) => {
          const na = (a.full_name || '').toLowerCase();
          const nb = (b.full_name || '').toLowerCase();
          if (na < nb) return -1;
          if (na > nb) return 1;
          return 0;
        });
      }
    }

    const totalCount = consultants.length;
    const start = (page - 1) * pageSize;
    const items = consultants.slice(start, start + pageSize);

    return { items, totalCount, page, pageSize };
  }

  getConsultantDetails(consultantId) {
    const consultants = this._getFromStorage('consultants', []);
    return this._findById(consultants, consultantId) || null;
  }

  submitConsultantContactRequest(consultantId, subject, preferredContactMethod, message) {
    if (!consultantId || !subject || !preferredContactMethod) {
      return {
        contactRequest: null,
        success: false,
        message: 'Missing required fields.'
      };
    }

    const consultants = this._getFromStorage('consultants', []);
    const consultant = this._findById(consultants, consultantId);
    if (!consultant) {
      return {
        contactRequest: null,
        success: false,
        message: 'Consultant not found.'
      };
    }

    const allowedMethods = ['video_call', 'phone_call', 'email'];
    if (!allowedMethods.includes(preferredContactMethod)) {
      return {
        contactRequest: null,
        success: false,
        message: 'Invalid preferred contact method.'
      };
    }

    const requests = this._getFromStorage('consultant_contact_requests', []);
    const contactRequest = {
      id: this._generateId('ccr'),
      consultant_id: consultantId,
      subject: subject,
      preferred_contact_method: preferredContactMethod,
      message: message || '',
      created_at: this._now(),
      status: 'submitted'
    };

    requests.push(contactRequest);
    this._saveToStorage('consultant_contact_requests', requests);

    return {
      contactRequest,
      success: true,
      message: 'Contact request submitted.'
    };
  }

  // ----------------------
  // About & Contact & Legal (static content)
  // ----------------------

  getAboutPageContent() {
    return {
      mission: 'We help organizations build confident leaders, engaged teams, and resilient cultures.',
      values: [
        'Practical, evidence-based development',
        'Partnership with our clients',
        'Inclusive leadership at every level'
      ],
      philosophy:
        'We combine experiential learning with coaching and consulting support to drive real behavior change, not just event-based training.',
      leadershipTeam: [],
      impactMetrics: [],
      testimonials: []
    };
  }

  getContactPageContent() {
    return {
      email: 'info@example.com',
      phone: '+1 (555) 000-0000',
      mailingAddress: '123 Example Street, Suite 100, Sample City, Country',
      responseTimeInfo: 'We aim to respond to all inquiries within 2 business days.',
      inquiryTypes: [
        { value: 'general_question', label: 'General question' },
        { value: 'sales', label: 'Sales / new project' },
        { value: 'support', label: 'Existing client support' },
        { value: 'media', label: 'Media / press' },
        { value: 'other', label: 'Other' }
      ]
    };
  }

  submitContactForm(fullName, email, inquiryType, subject, message) {
    if (!fullName || !email || !subject || !message) {
      return { success: false, message: 'Missing required fields.' };
    }

    const submissions = this._getFromStorage('contact_form_submissions', []);
    const submission = {
      id: this._generateId('contact'),
      full_name: fullName,
      email: email,
      inquiry_type: inquiryType || null,
      subject: subject,
      message: message,
      created_at: this._now()
    };

    submissions.push(submission);
    this._saveToStorage('contact_form_submissions', submissions);

    return { success: true, message: 'Your message has been sent.' };
  }

  getLegalContent(page) {
    if (page === 'privacy_policy') {
      return {
        title: 'Privacy Policy',
        lastUpdated: '2024-01-01',
        sections: [
          {
            heading: 'Introduction',
            bodyHtml:
              '<p>This Privacy Policy explains how we collect, use, and protect your personal information.</p>'
          }
        ],
        contactForPrivacy: 'privacy@example.com'
      };
    }

    if (page === 'terms_of_service') {
      return {
        title: 'Terms of Service',
        lastUpdated: '2024-01-01',
        sections: [
          {
            heading: 'Overview',
            bodyHtml:
              '<p>These Terms govern your use of our website, products, and services.</p>'
          }
        ],
        contactForPrivacy: 'legal@example.com'
      };
    }

    return {
      title: '',
      lastUpdated: '',
      sections: [],
      contactForPrivacy: ''
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
