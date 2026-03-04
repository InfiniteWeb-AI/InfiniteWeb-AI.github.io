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

  // -------------------- Initialization & Storage Helpers --------------------

  _initStorage() {
    const tableKeys = [
      // Legacy/example keys (unused but kept for compatibility)
      'users',
      'products',
      'carts',
      'cartItems',
      // Domain entities
      'genotyping_panels',
      'sequencing_services',
      'software_products',
      'software_modules',
      'software_plans',
      'software_subscription_configs',
      'cart',
      'cart_items',
      'quotes',
      'quote_items',
      'training_courses',
      'learning_plans',
      'learning_plan_items',
      'content_items',
      'saved_resources',
      'reading_lists',
      'reading_list_items',
      'breeding_projects',
      'traits',
      'breeding_project_traits',
      'locations',
      'breeding_project_locations',
      'custom_assay_requests',
      'roi_analyses',
      'roi_scenarios',
      'comparison_sets',
      'library_state',
      'contact_form_submissions'
    ];

    for (const key of tableKeys) {
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

  _textMatch(haystack, needle) {
    if (!needle) return true;
    if (!haystack) return false;
    const h = String(haystack).toLowerCase();
    const terms = String(needle).toLowerCase().split(/\s+/).filter(Boolean);
    return terms.every(term => h.includes(term));
  }

  _arrayIncludesCaseInsensitive(arr, value) {
    if (!Array.isArray(arr) || value == null) return false;
    const v = String(value).toLowerCase();
    return arr.some(x => String(x).toLowerCase() === v);
  }

  // -------------------- Private helpers required by spec --------------------

  // Internal helper to load the current Cart or create one if none exists
  _getOrCreateCart() {
    const carts = this._getFromStorage('cart');
    const now = this._now();
    let cart = carts[0] || null;
    if (!cart) {
      cart = {
        id: this._generateId('cart'),
        created_at: now,
        updated_at: now
      };
      carts.push(cart);
      this._saveToStorage('cart', carts);
    }
    return cart;
  }

  // Internal helper to load or create a draft Quote for the quote builder
  _getOrCreateQuoteDraft() {
    const quotes = this._getFromStorage('quotes');
    const now = this._now();
    let quote = quotes.find(q => q.status === 'draft') || null;
    if (!quote) {
      quote = {
        id: this._generateId('quote'),
        name: 'Draft Quote',
        status: 'draft',
        total_amount: 0,
        currency: 'usd',
        created_at: now,
        updated_at: now
      };
      quotes.push(quote);
      this._saveToStorage('quotes', quotes);
    }
    return quote;
  }

  // Internal helper to load or create the user's default LearningPlan
  _getOrCreateLearningPlan() {
    const plans = this._getFromStorage('learning_plans');
    const now = this._now();
    let plan = plans[0] || null;
    if (!plan) {
      plan = {
        id: this._generateId('lp'),
        name: 'My Learning Plan',
        created_at: now,
        updated_at: now
      };
      plans.push(plan);
      this._saveToStorage('learning_plans', plans);
    }
    return plan;
  }

  // Compute effective monthly price for a SoftwarePlan given user_count and billing_frequency
  _calculateSoftwarePlanTotalPrice(plan, user_count, billing_frequency) {
    const users = Number(user_count) || 0;
    if (!plan || !billing_frequency) return 0;
    let totalMonthly = 0;
    if (billing_frequency === 'monthly') {
      const base = Number(plan.base_price_monthly || 0);
      const perUser = Number(plan.price_per_user_monthly || 0);
      totalMonthly = base + perUser * users;
    } else if (billing_frequency === 'annual') {
      const base = Number(plan.base_price_annual || 0);
      const perUser = Number(plan.price_per_user_annual || 0);
      const annualTotal = base + perUser * users;
      totalMonthly = annualTotal / 12;
    }
    return totalMonthly;
  }

  // Internal ROI calculation helper: monotonic with yield gain (up) and costs (down)
  _calculateRoiPercentage(annual_genotyping_cost, annual_phenotyping_cost, expected_yield_gain_percent, time_horizon_years) {
    const ag = Number(annual_genotyping_cost) || 0;
    const ap = Number(annual_phenotyping_cost) || 0;
    const gainPct = Number(expected_yield_gain_percent) || 0;
    const years = Number(time_horizon_years) || 0;

    const totalCost = (ag + ap) * years;
    if (totalCost <= 0 || years <= 0) {
      return 0;
    }

    // Assume annual economic benefit proportional to total costs and yield gain
    const baselineRevenue = (ag + ap) * 2; // arbitrary scaling factor
    const annualBenefit = baselineRevenue * (gainPct / 100);
    const totalBenefit = annualBenefit * years;

    const roi = ((totalBenefit - totalCost) / totalCost) * 100;
    return roi;
  }

  // Internal helper to manage LibraryState
  _getOrCreateLibraryState() {
    const states = this._getFromStorage('library_state');
    const now = this._now();
    let state = states[0] || null;
    if (!state) {
      state = {
        id: this._generateId('libstate'),
        active_tab: 'learning_plan',
        updated_at: now
      };
      states.push(state);
      this._saveToStorage('library_state', states);
    }
    return state;
  }

  // -------------------- Core interface implementations --------------------

  // 1. getHomeOverview
  getHomeOverview() {
    const genotyping_panels = this._getFromStorage('genotyping_panels');
    const content_items = this._getFromStorage('content_items');
    const training_courses = this._getFromStorage('training_courses');

    const solution_tiles = [
      {
        category_id: 'genotyping_panels',
        category_name: 'Genotyping Panels',
        description: 'High-density SNP panels for key crops.'
      },
      {
        category_id: 'sequencing_services',
        category_name: 'Sequencing Services',
        description: 'Targeted and whole-genome sequencing for crop improvement.'
      },
      {
        category_id: 'software',
        category_name: 'Breeding Software',
        description: 'Integrated breeding management platforms.'
      },
      {
        category_id: 'training',
        category_name: 'Training & Education',
        description: 'Courses on genomic selection, trial design, and more.'
      },
      {
        category_id: 'resources',
        category_name: 'Protocols & Resources',
        description: 'Protocols, guides, and knowledge base articles.'
      },
      {
        category_id: 'case_studies',
        category_name: 'Case Studies',
        description: 'Impact stories from breeding programs worldwide.'
      },
      {
        category_id: 'tools',
        category_name: 'Tools & Calculators',
        description: 'ROI calculators and planning tools.'
      },
      {
        category_id: 'projects',
        category_name: 'Breeding Projects',
        description: 'Manage and track your breeding trials.'
      }
    ];

    const featured_panels = genotyping_panels
      .filter(p => p.is_active)
      .sort((a, b) => (b.average_rating || 0) - (a.average_rating || 0))
      .slice(0, 3);

    const featured_case_studies = content_items
      .filter(ci => ci.section === 'case_studies' && ci.content_type === 'case_study')
      .sort((a, b) => {
        const aDate = a.published_at || a.created_at || '';
        const bDate = b.published_at || b.created_at || '';
        return bDate.localeCompare(aDate);
      })
      .slice(0, 3);

    const upcoming_training = training_courses
      .filter(c => c.is_active)
      .sort((a, b) => (b.average_rating || 0) - (a.average_rating || 0))
      .slice(0, 3);

    return {
      solution_tiles,
      featured_panels,
      featured_case_studies,
      upcoming_training
    };
  }

  // 2. searchAllContentAndOfferings
  searchAllContentAndOfferings(query, limit = 20) {
    const q = (query || '').trim();
    const genotyping_panels = this._getFromStorage('genotyping_panels');
    const sequencing_services = this._getFromStorage('sequencing_services');
    const software_products = this._getFromStorage('software_products');
    const training_courses = this._getFromStorage('training_courses');
    const content_items = this._getFromStorage('content_items');

    const matchPanel = p =>
      this._textMatch(p.name, q) ||
      this._textMatch(p.description, q) ||
      this._textMatch(p.crop, q);

    const matchService = s =>
      this._textMatch(s.name, q) ||
      this._textMatch(s.description, q) ||
      this._textMatch(s.crop, q) ||
      this._textMatch(s.application_type, q);

    const matchSoftware = s =>
      this._textMatch(s.name, q) || this._textMatch(s.description, q);

    const matchCourse = c =>
      this._textMatch(c.title, q) ||
      this._textMatch(c.description, q) ||
      (Array.isArray(c.topics) && c.topics.some(t => this._textMatch(t, q)));

    const matchContent = c =>
      this._textMatch(c.title, q) ||
      this._textMatch(c.short_description, q) ||
      this._textMatch(c.body, q) ||
      (Array.isArray(c.tags) && c.tags.some(t => this._textMatch(t, q)));

    return {
      genotyping_panels: genotyping_panels.filter(matchPanel).slice(0, limit),
      sequencing_services: sequencing_services.filter(matchService).slice(0, limit),
      software_products: software_products.filter(matchSoftware).slice(0, limit),
      training_courses: training_courses.filter(matchCourse).slice(0, limit),
      resources: content_items.filter(ci => ci.section === 'resources').filter(matchContent).slice(0, limit),
      case_studies: content_items.filter(ci => ci.section === 'case_studies').filter(matchContent).slice(0, limit)
    };
  }

  // 3. getSolutionsCatalogFilterOptions
  getSolutionsCatalogFilterOptions(category_id) {
    const cropEnums = [
      { value: 'maize', label: 'Maize' },
      { value: 'wheat', label: 'Wheat' },
      { value: 'rice', label: 'Rice' },
      { value: 'sorghum', label: 'Sorghum' },
      { value: 'chickpea', label: 'Chickpea' },
      { value: 'barley', label: 'Barley' },
      { value: 'soybean', label: 'Soybean' },
      { value: 'other', label: 'Other' }
    ];

    let price_range = null;
    let rating_thresholds = [4, 4.5, 5];
    let marker_density_categories = [];
    let application_types = [];
    let sample_batch_sizes = [];
    let training_levels = [];
    let duration_options_days = [];
    let sort_options = [];

    if (category_id === 'genotyping_panels') {
      const panels = this._getFromStorage('genotyping_panels');
      const prices = panels.map(p => p.price_per_sample || 0);
      const min_price = prices.length ? Math.min(...prices) : 0;
      const max_price = prices.length ? Math.max(...prices) : 0;
      price_range = { min_price, max_price, currency: 'usd' };
      marker_density_categories = [
        { value: 'lt_10k', label: '< 10K markers' },
        { value: 'between_10k_50k', label: '10K–50K markers' },
        { value: 'gte_50k', label: '\u2265 50K markers' }
      ];
      sort_options = [
        { value: 'rating_desc', label: 'Rating: High to Low' },
        { value: 'price_asc', label: 'Price: Low to High' },
        { value: 'price_desc', label: 'Price: High to Low' },
        { value: 'relevance', label: 'Relevance' }
      ];
    } else if (category_id === 'sequencing_services') {
      const services = this._getFromStorage('sequencing_services');
      const prices = services.map(s => s.price_per_sample || 0);
      const min_price = prices.length ? Math.min(...prices) : 0;
      const max_price = prices.length ? Math.max(...prices) : 0;
      price_range = { min_price, max_price, currency: 'usd' };
      application_types = [
        { value: 'targeted_sequencing', label: 'Targeted Sequencing' },
        { value: 'whole_genome_sequencing', label: 'Whole Genome Sequencing' },
        { value: 'exome_sequencing', label: 'Exome Sequencing' },
        { value: 'rnaseq', label: 'RNA-Seq' },
        { value: 'other', label: 'Other' }
      ];
      const allBatchSizes = new Set();
      services.forEach(s => {
        if (Array.isArray(s.sample_batch_sizes)) {
          s.sample_batch_sizes.forEach(sz => allBatchSizes.add(sz));
        }
      });
      sample_batch_sizes = Array.from(allBatchSizes).sort((a, b) => a - b);
      sort_options = [
        { value: 'rating_desc', label: 'Rating: High to Low' },
        { value: 'price_asc', label: 'Price: Low to High' },
        { value: 'price_desc', label: 'Price: High to Low' },
        { value: 'relevance', label: 'Relevance' }
      ];
    } else if (category_id === 'training') {
      const courses = this._getFromStorage('training_courses');
      training_levels = [
        { value: 'beginner', label: 'Beginner' },
        { value: 'intermediate', label: 'Intermediate' },
        { value: 'advanced', label: 'Advanced' }
      ];
      const durations = new Set();
      courses.forEach(c => {
        if (c.duration_days != null) durations.add(c.duration_days);
      });
      duration_options_days = Array.from(durations).sort((a, b) => a - b);
      sort_options = [
        { value: 'rating_desc', label: 'Rating: High to Low' },
        { value: 'relevance', label: 'Relevance' }
      ];
    } else if (category_id === 'software') {
      sort_options = [
        { value: 'relevance', label: 'Relevance' },
        { value: 'rating_desc', label: 'Rating: High to Low' }
      ];
    }

    return {
      category_id,
      crop_options: cropEnums,
      price_range,
      rating_thresholds,
      marker_density_categories,
      application_types,
      sample_batch_sizes,
      training_levels,
      duration_options_days,
      sort_options
    };
  }

  // 4. listSolutionsCatalogItems
  listSolutionsCatalogItems(category_id, query, filters = {}, sort = 'relevance', page = 1, page_size = 20) {
    const q = (query || '').trim();
    filters = filters || {};
    let source = [];

    if (category_id === 'genotyping_panels') {
      source = this._getFromStorage('genotyping_panels').filter(p => p.is_active);
    } else if (category_id === 'sequencing_services') {
      source = this._getFromStorage('sequencing_services').filter(s => s.is_active);
    } else if (category_id === 'software') {
      source = this._getFromStorage('software_products').filter(p => p.is_active);
    } else if (category_id === 'training') {
      source = this._getFromStorage('training_courses').filter(c => c.is_active);
    } else {
      return {
        category_id,
        total_results: 0,
        page,
        page_size,
        items: []
      };
    }

    const filtered = source.filter(item => {
      // keyword search
      if (q) {
        if (category_id === 'genotyping_panels') {
          if (!(
            this._textMatch(item.name, q) ||
            this._textMatch(item.description, q) ||
            this._textMatch(item.crop, q)
          )) return false;
        } else if (category_id === 'sequencing_services') {
          if (!(
            this._textMatch(item.name, q) ||
            this._textMatch(item.description, q) ||
            this._textMatch(item.crop, q) ||
            this._textMatch(item.application_type, q)
          )) return false;
        } else if (category_id === 'software') {
          if (!(this._textMatch(item.name, q) || this._textMatch(item.description, q))) return false;
        } else if (category_id === 'training') {
          if (
            !(
              this._textMatch(item.title, q) ||
              this._textMatch(item.description, q) ||
              (Array.isArray(item.topics) && item.topics.some(t => this._textMatch(t, q)))
            )
          ) return false;
        }
      }

      // Filters
      if (filters.crop) {
        if (category_id === 'training') {
          if (!this._arrayIncludesCaseInsensitive(item.crop_focus || [], filters.crop)) return false;
        } else if (item.crop && item.crop !== filters.crop) {
          return false;
        }
      }

      if (category_id === 'genotyping_panels') {
        if (filters.min_markers != null && item.marker_count != null && item.marker_count < filters.min_markers) {
          return false;
        }
        if (filters.marker_density_category && item.marker_density_category !== filters.marker_density_category) {
          return false;
        }
        if (filters.max_price_per_sample != null && item.price_per_sample != null && item.price_per_sample > filters.max_price_per_sample) {
          return false;
        }
        if (filters.min_rating != null && item.average_rating != null && item.average_rating < filters.min_rating) {
          return false;
        }
      }

      if (category_id === 'sequencing_services') {
        if (filters.application_type && item.application_type !== filters.application_type) {
          return false;
        }
        if (filters.sample_batch_size != null) {
          const sizes = item.sample_batch_sizes || [];
          if (!sizes.includes(filters.sample_batch_size)) return false;
        }
        if (filters.max_price_per_sample != null && item.price_per_sample != null && item.price_per_sample > filters.max_price_per_sample) {
          return false;
        }
        if (filters.min_rating != null && item.average_rating != null && item.average_rating < filters.min_rating) {
          return false;
        }
      }

      if (category_id === 'training') {
        if (Array.isArray(filters.training_level_included) && filters.training_level_included.length > 0) {
          if (!filters.training_level_included.includes(item.level)) return false;
        }
        if (filters.max_duration_days != null && item.duration_days != null && item.duration_days > filters.max_duration_days) {
          return false;
        }
      }

      return true;
    });

    // Sorting
    const sorted = [...filtered];
    if (sort === 'rating_desc') {
      sorted.sort((a, b) => (b.average_rating || 0) - (a.average_rating || 0));
    } else if (sort === 'price_asc') {
      sorted.sort((a, b) => (a.price_per_sample || 0) - (b.price_per_sample || 0));
    } else if (sort === 'price_desc') {
      sorted.sort((a, b) => (b.price_per_sample || 0) - (a.price_per_sample || 0));
    } else if (sort === 'relevance') {
      // Leave as-is; could enhance with relevance scoring in future
    }

    const total_results = sorted.length;
    const start = (page - 1) * page_size;
    const paged = sorted.slice(start, start + page_size);

    const items = paged.map(item => {
      if (category_id === 'genotyping_panels') {
        return {
          id: item.id,
          name: item.name,
          category_id: 'genotyping_panels',
          crop: item.crop,
          short_description: item.description,
          price_per_sample: item.price_per_sample,
          currency: item.currency,
          marker_count: item.marker_count,
          marker_density_category: item.marker_density_category,
          average_rating: item.average_rating,
          rating_count: item.rating_count,
          image_url: item.image_url
        };
      }
      if (category_id === 'sequencing_services') {
        return {
          id: item.id,
          name: item.name,
          category_id: 'sequencing_services',
          crop: item.crop,
          short_description: item.description,
          price_per_sample: item.price_per_sample,
          currency: item.currency,
          application_type: item.application_type,
          sample_batch_sizes: item.sample_batch_sizes,
          average_rating: item.average_rating,
          rating_count: item.rating_count,
          image_url: item.image_url
        };
      }
      if (category_id === 'software') {
        return {
          id: item.id,
          name: item.name,
          category_id: 'software',
          short_description: item.description,
          image_url: item.image_url,
          average_rating: item.average_rating,
          rating_count: item.rating_count
        };
      }
      // training
      return {
        id: item.id,
        name: item.title,
        category_id: 'training',
        crop: (item.crop_focus && item.crop_focus[0]) || null,
        short_description: item.description,
        level: item.level,
        duration_days: item.duration_days,
        average_rating: item.average_rating,
        rating_count: item.rating_count,
        image_url: item.image_url
      };
    });

    return {
      category_id,
      total_results,
      page,
      page_size,
      items
    };
  }

  // 5. getGenotypingPanelDetails
  getGenotypingPanelDetails(panel_id) {
    const panels = this._getFromStorage('genotyping_panels');
    const panel = panels.find(p => p.id === panel_id) || null;
    let related_panels = [];
    if (panel) {
      related_panels = panels
        .filter(p => p.id !== panel.id && p.is_active && p.crop === panel.crop)
        .slice(0, 4);
    }
    return {
      panel,
      related_panels
    };
  }

  // 6. addGenotypingPanelToCart
  addGenotypingPanelToCart(panel_id, quantity) {
    const qty = Number(quantity) || 0;
    const panels = this._getFromStorage('genotyping_panels');
    const panel = panels.find(p => p.id === panel_id && p.is_active);
    if (!panel) {
      return { success: false, cart: null, cart_items: [], message: 'Panel not found or inactive' };
    }
    if (qty <= 0) {
      return { success: false, cart: null, cart_items: [], message: 'Quantity must be positive' };
    }

    const cart = this._getOrCreateCart();
    const cart_items = this._getFromStorage('cart_items');

    const now = this._now();
    let item = cart_items.find(
      ci => ci.cart_id === cart.id && ci.item_type === 'genotyping_panel' && ci.item_id === panel_id
    );

    if (item) {
      item.quantity += qty;
      item.price_per_unit = panel.price_per_sample;
      item.currency = panel.currency || 'usd';
      item.line_total = item.quantity * item.price_per_unit;
    } else {
      item = {
        id: this._generateId('cartitem'),
        cart_id: cart.id,
        item_type: 'genotyping_panel',
        item_id: panel.id,
        name_snapshot: panel.name,
        quantity: qty,
        price_per_unit: panel.price_per_sample,
        currency: panel.currency || 'usd',
        line_total: qty * (panel.price_per_sample || 0),
        added_at: now
      };
      cart_items.push(item);
    }

    // Recalculate cart totals
    const itemsForCart = cart_items.filter(ci => ci.cart_id === cart.id);
    let total_items = 0;
    let total_amount = 0;
    let currency = 'usd';
    itemsForCart.forEach(ci => {
      total_items += ci.quantity || 0;
      total_amount += ci.line_total || 0;
      currency = ci.currency || currency;
    });

    cart.total_items = total_items;
    cart.total_amount = total_amount;
    cart.currency = currency;
    cart.updated_at = now;

    // Persist
    const carts = this._getFromStorage('cart');
    const idx = carts.findIndex(c => c.id === cart.id);
    if (idx >= 0) {
      carts[idx] = cart;
    } else {
      carts.push(cart);
    }
    this._saveToStorage('cart', carts);
    this._saveToStorage('cart_items', cart_items);

    return {
      success: true,
      cart: {
        id: cart.id,
        total_items,
        total_amount,
        currency
      },
      cart_items: itemsForCart,
      message: 'Panel added to cart'
    };
  }

  // 7. getSequencingServiceDetails
  getSequencingServiceDetails(service_id) {
    const services = this._getFromStorage('sequencing_services');
    const service = services.find(s => s.id === service_id) || null;
    return { service };
  }

  // 8. getSoftwareProductDetails
  getSoftwareProductDetails(product_id) {
    const products = this._getFromStorage('software_products');
    const product = products.find(p => p.id === product_id) || null;
    return { product };
  }

  // 9. getSoftwareConfigurationOptions
  getSoftwareConfigurationOptions(product_id) {
    const products = this._getFromStorage('software_products');
    const product = products.find(p => p.id === product_id);
    const allModules = this._getFromStorage('software_modules');
    const allPlans = this._getFromStorage('software_plans');

    let modules = [];
    if (product && Array.isArray(product.available_module_ids) && product.available_module_ids.length > 0) {
      modules = allModules.filter(m => product.available_module_ids.includes(m.id));
    } else {
      modules = allModules;
    }

    const plans = allPlans.filter(p => p.product_id === product_id && p.is_active);

    return { modules, plans };
  }

  // 10. getEligibleSoftwarePlans
  getEligibleSoftwarePlans(product_id, user_count, selected_module_ids, billing_frequency) {
    const plans = this._getFromStorage('software_plans').filter(
      p => p.product_id === product_id && p.is_active
    );
    const selectedModules = Array.isArray(selected_module_ids) ? selected_module_ids : [];
    const eligible_plans = [];

    plans.forEach(plan => {
      const supportsFrequency = Array.isArray(plan.billing_frequency_options)
        ? plan.billing_frequency_options.includes(billing_frequency)
        : true;

      const minUsers = plan.min_users != null ? plan.min_users : 0;
      const maxUsers = plan.max_users != null ? plan.max_users : Infinity;
      const supports_user_count = user_count >= minUsers && user_count <= maxUsers;

      const included = Array.isArray(plan.included_module_ids) ? plan.included_module_ids : [];
      const supports_selected_modules = selectedModules.every(m => included.includes(m));

      if (!supportsFrequency) return;
      if (!supports_user_count) return;
      if (!supports_selected_modules) return;

      const total_price_per_month = this._calculateSoftwarePlanTotalPrice(
        plan,
        user_count,
        billing_frequency
      );

      eligible_plans.push({
        plan: {
          id: plan.id,
          name: plan.name,
          description: plan.description,
          min_users: plan.min_users,
          max_users: plan.max_users,
          currency: plan.currency,
          included_module_ids: plan.included_module_ids
        },
        total_price_per_month,
        currency: plan.currency,
        supports_selected_modules,
        supports_user_count
      });
    });

    return { eligible_plans };
  }

  // 11. createSoftwareSubscriptionConfig
  createSoftwareSubscriptionConfig(product_id, selected_plan_id, user_count, selected_module_ids, billing_frequency) {
    const plans = this._getFromStorage('software_plans');
    const configs = this._getFromStorage('software_subscription_configs');
    const plan = plans.find(p => p.id === selected_plan_id);

    if (!plan) {
      return { config: null, message: 'Selected plan not found' };
    }

    const total_price_per_month = this._calculateSoftwarePlanTotalPrice(
      plan,
      user_count,
      billing_frequency
    );

    const now = this._now();
    const config = {
      id: this._generateId('softcfg'),
      product_id,
      selected_plan_id,
      user_count,
      selected_module_ids: Array.isArray(selected_module_ids) ? selected_module_ids : [],
      billing_frequency,
      total_price_per_month,
      currency: plan.currency || 'usd',
      label: null,
      created_at: now
    };

    configs.push(config);
    this._saveToStorage('software_subscription_configs', configs);

    return {
      config,
      message: 'Software subscription configuration created'
    };
  }

  // 12. getSoftwareSubscriptionConfig (with FK resolution for product & plan)
  getSoftwareSubscriptionConfig(config_id) {
    const configs = this._getFromStorage('software_subscription_configs');
    const products = this._getFromStorage('software_products');
    const plans = this._getFromStorage('software_plans');

    const config = configs.find(c => c.id === config_id) || null;
    let product = null;
    let plan = null;

    if (config) {
      product = products.find(p => p.id === config.product_id) || null;
      plan = plans.find(p => p.id === config.selected_plan_id) || null;
    }

    return {
      config,
      product: product
        ? { id: product.id, name: product.name, description: product.description }
        : null,
      plan: plan ? { id: plan.id, name: plan.name, description: plan.description } : null
    };
  }

  // 13. finalizeSoftwareSubscriptionConfig
  finalizeSoftwareSubscriptionConfig(config_id, label) {
    const configs = this._getFromStorage('software_subscription_configs');
    const idx = configs.findIndex(c => c.id === config_id);
    if (idx === -1) {
      return { success: false, config: null, message: 'Configuration not found' };
    }
    if (label) {
      configs[idx].label = label;
    }
    // created_at already set; keep as is
    this._saveToStorage('software_subscription_configs', configs);

    return {
      success: true,
      config: {
        id: configs[idx].id,
        label: configs[idx].label,
        created_at: configs[idx].created_at
      },
      message: 'Configuration saved'
    };
  }

  // 14. getTrainingCourseDetails
  getTrainingCourseDetails(course_id) {
    const courses = this._getFromStorage('training_courses');
    const course = courses.find(c => c.id === course_id) || null;
    const related_courses = course
      ? courses
          .filter(
            c =>
              c.id !== course.id &&
              c.is_active &&
              ((Array.isArray(course.crop_focus) &&
                Array.isArray(c.crop_focus) &&
                c.crop_focus.some(cf => course.crop_focus.includes(cf))) ||
                c.level === course.level)
          )
          .slice(0, 4)
      : [];
    return { course, related_courses };
  }

  // 15. addCourseToLearningPlan
  addCourseToLearningPlan(course_id) {
    const courses = this._getFromStorage('training_courses');
    const course = courses.find(c => c.id === course_id && c.is_active);
    if (!course) {
      return { learning_plan: null, items: [], message: 'Course not found or inactive' };
    }

    const plan = this._getOrCreateLearningPlan();
    const items = this._getFromStorage('learning_plan_items');

    const existing = items.find(i => i.learning_plan_id === plan.id && i.course_id === course_id);
    if (existing) {
      return { learning_plan: plan, items: items.filter(i => i.learning_plan_id === plan.id), message: 'Course already in learning plan' };
    }

    const planItems = items.filter(i => i.learning_plan_id === plan.id);
    const maxPosition = planItems.reduce((max, i) => Math.max(max, i.position || 0), 0);
    const now = this._now();

    const newItem = {
      id: this._generateId('lpitem'),
      learning_plan_id: plan.id,
      course_id: course.id,
      position: maxPosition + 1,
      added_at: now
    };

    items.push(newItem);
    plan.updated_at = now;

    const plans = this._getFromStorage('learning_plans');
    const idx = plans.findIndex(p => p.id === plan.id);
    if (idx >= 0) plans[idx] = plan;
    this._saveToStorage('learning_plans', plans);
    this._saveToStorage('learning_plan_items', items);

    return {
      learning_plan: {
        id: plan.id,
        name: plan.name,
        created_at: plan.created_at
      },
      items: items.filter(i => i.learning_plan_id === plan.id),
      message: 'Course added to learning plan'
    };
  }

  // 16. getCartSummary (with FK resolution)
  getCartSummary() {
    const cart = this._getOrCreateCart();
    const cart_items = this._getFromStorage('cart_items').filter(ci => ci.cart_id === cart.id);

    // Recalculate totals
    let total_items = 0;
    let total_amount = 0;
    let currency = 'usd';
    cart_items.forEach(ci => {
      total_items += ci.quantity || 0;
      total_amount += ci.line_total || 0;
      currency = ci.currency || currency;
    });

    cart.total_items = total_items;
    cart.total_amount = total_amount;
    cart.currency = currency;

    const carts = this._getFromStorage('cart');
    const idx = carts.findIndex(c => c.id === cart.id);
    if (idx >= 0) carts[idx] = cart;
    this._saveToStorage('cart', carts);

    // Resolve foreign keys for each cart_item
    const panels = this._getFromStorage('genotyping_panels');
    const services = this._getFromStorage('sequencing_services');
    const configs = this._getFromStorage('software_subscription_configs');
    const courses = this._getFromStorage('training_courses');

    const items = cart_items.map(ci => {
      let resolvedItem = null;
      if (ci.item_type === 'genotyping_panel') {
        resolvedItem = panels.find(p => p.id === ci.item_id) || null;
      } else if (ci.item_type === 'sequencing_service') {
        resolvedItem = services.find(s => s.id === ci.item_id) || null;
      } else if (ci.item_type === 'software_subscription') {
        resolvedItem = configs.find(cfg => cfg.id === ci.item_id) || null;
      } else if (ci.item_type === 'training_course') {
        resolvedItem = courses.find(c => c.id === ci.item_id) || null;
      }
      const cart_item = { ...ci, item: resolvedItem };
      return { cart_item };
    });

    return {
      cart: {
        id: cart.id,
        created_at: cart.created_at,
        updated_at: cart.updated_at,
        total_items,
        total_amount,
        currency
      },
      items
    };
  }

  // 17. updateCartItemQuantity
  updateCartItemQuantity(cart_item_id, quantity) {
    const cart = this._getOrCreateCart();
    const cart_items = this._getFromStorage('cart_items');
    const idx = cart_items.findIndex(ci => ci.id === cart_item_id && ci.cart_id === cart.id);
    if (idx === -1) {
      return {
        success: false,
        cart: {
          id: cart.id,
          total_items: cart.total_items || 0,
          total_amount: cart.total_amount || 0,
          currency: cart.currency || 'usd'
        },
        items: cart_items,
        message: 'Cart item not found'
      };
    }

    const qty = Number(quantity) || 0;
    if (qty <= 0) {
      cart_items.splice(idx, 1);
    } else {
      cart_items[idx].quantity = qty;
      cart_items[idx].line_total = qty * (cart_items[idx].price_per_unit || 0);
    }

    // Recalculate for this cart
    const itemsForCart = cart_items.filter(ci => ci.cart_id === cart.id);
    let total_items = 0;
    let total_amount = 0;
    let currency = 'usd';
    itemsForCart.forEach(ci => {
      total_items += ci.quantity || 0;
      total_amount += ci.line_total || 0;
      currency = ci.currency || currency;
    });

    cart.total_items = total_items;
    cart.total_amount = total_amount;
    cart.currency = currency;
    cart.updated_at = this._now();

    const carts = this._getFromStorage('cart');
    const cIdx = carts.findIndex(c => c.id === cart.id);
    if (cIdx >= 0) carts[cIdx] = cart;

    this._saveToStorage('cart', carts);
    this._saveToStorage('cart_items', cart_items);

    return {
      success: true,
      cart: {
        id: cart.id,
        total_items,
        total_amount,
        currency
      },
      items: itemsForCart,
      message: 'Cart updated'
    };
  }

  // 18. removeCartItem
  removeCartItem(cart_item_id) {
    const cart = this._getOrCreateCart();
    const cart_items = this._getFromStorage('cart_items');
    const idx = cart_items.findIndex(ci => ci.id === cart_item_id && ci.cart_id === cart.id);
    if (idx !== -1) {
      cart_items.splice(idx, 1);
    }

    const itemsForCart = cart_items.filter(ci => ci.cart_id === cart.id);
    let total_items = 0;
    let total_amount = 0;
    let currency = 'usd';
    itemsForCart.forEach(ci => {
      total_items += ci.quantity || 0;
      total_amount += ci.line_total || 0;
      currency = ci.currency || currency;
    });

    cart.total_items = total_items;
    cart.total_amount = total_amount;
    cart.currency = currency;
    cart.updated_at = this._now();

    const carts = this._getFromStorage('cart');
    const cIdx = carts.findIndex(c => c.id === cart.id);
    if (cIdx >= 0) carts[cIdx] = cart;

    this._saveToStorage('cart', carts);
    this._saveToStorage('cart_items', cart_items);

    return {
      success: true,
      cart: {
        id: cart.id,
        total_items,
        total_amount,
        currency
      },
      items: itemsForCart
    };
  }

  // 19. createSequencingComparisonSet
  createSequencingComparisonSet(service_ids) {
    const ids = Array.isArray(service_ids) ? service_ids : [];
    const servicesAll = this._getFromStorage('sequencing_services');
    const services = servicesAll.filter(s => ids.includes(s.id));

    const comparison_sets = this._getFromStorage('comparison_sets');
    const now = this._now();
    const comparison_set = {
      id: this._generateId('cmp'),
      category_id: 'sequencing_services',
      item_ids: ids,
      created_at: now
    };
    comparison_sets.push(comparison_set);
    this._saveToStorage('comparison_sets', comparison_sets);

    return {
      comparison_set,
      services
    };
  }

  // 20. addSequencingServiceToQuoteBuilder
  addSequencingServiceToQuoteBuilder(service_id, sample_quantity) {
    const services = this._getFromStorage('sequencing_services');
    const service = services.find(s => s.id === service_id && s.is_active);
    if (!service) {
      return { quote: null, items: [], message: 'Service not found or inactive' };
    }

    const quote = this._getOrCreateQuoteDraft();
    const quote_items = this._getFromStorage('quote_items');
    const now = this._now();
    const qty = Number(sample_quantity) || 0;

    let item = quote_items.find(
      qi => qi.quote_id === quote.id && qi.item_type === 'sequencing_service' && qi.item_id === service_id
    );

    if (!item) {
      item = {
        id: this._generateId('qitem'),
        quote_id: quote.id,
        item_type: 'sequencing_service',
        item_id: service.id,
        description: service.name,
        sample_quantity: qty,
        unit_price: service.price_per_sample,
        currency: service.currency || 'usd',
        line_total: qty * (service.price_per_sample || 0),
        added_at: now
      };
      quote_items.push(item);
    } else {
      item.sample_quantity = qty;
      item.unit_price = service.price_per_sample;
      item.currency = service.currency || 'usd';
      item.line_total = qty * (service.price_per_sample || 0);
    }

    const itemsForQuote = quote_items.filter(qi => qi.quote_id === quote.id);
    let total_amount = 0;
    let currency = 'usd';
    itemsForQuote.forEach(qi => {
      total_amount += qi.line_total || 0;
      currency = qi.currency || currency;
    });

    quote.total_amount = total_amount;
    quote.currency = currency;
    quote.updated_at = now;

    const quotes = this._getFromStorage('quotes');
    const idx = quotes.findIndex(q => q.id === quote.id);
    if (idx >= 0) quotes[idx] = quote;

    this._saveToStorage('quotes', quotes);
    this._saveToStorage('quote_items', quote_items);

    return {
      quote: {
        id: quote.id,
        name: quote.name,
        status: quote.status,
        total_amount,
        currency
      },
      items: itemsForQuote,
      message: 'Service added to quote builder'
    };
  }

  // 21. getQuoteBuilderSummary (with FK resolution)
  getQuoteBuilderSummary() {
    const quote = this._getOrCreateQuoteDraft();
    const quote_items = this._getFromStorage('quote_items').filter(qi => qi.quote_id === quote.id);

    let total_amount = 0;
    let currency = 'usd';
    quote_items.forEach(qi => {
      total_amount += qi.line_total || 0;
      currency = qi.currency || currency;
    });

    quote.total_amount = total_amount;
    quote.currency = currency;

    const quotes = this._getFromStorage('quotes');
    const idx = quotes.findIndex(q => q.id === quote.id);
    if (idx >= 0) quotes[idx] = quote;
    this._saveToStorage('quotes', quotes);

    const panels = this._getFromStorage('genotyping_panels');
    const services = this._getFromStorage('sequencing_services');

    const items = quote_items.map(qi => {
      let resolvedItem = null;
      if (qi.item_type === 'sequencing_service') {
        resolvedItem = services.find(s => s.id === qi.item_id) || null;
      } else if (qi.item_type === 'genotyping_panel') {
        resolvedItem = panels.find(p => p.id === qi.item_id) || null;
      }
      return { ...qi, item: resolvedItem };
    });

    return {
      quote: {
        id: quote.id,
        name: quote.name,
        status: quote.status,
        total_amount,
        currency,
        created_at: quote.created_at,
        updated_at: quote.updated_at
      },
      items
    };
  }

  // 22. updateQuoteItemSampleQuantity
  updateQuoteItemSampleQuantity(quote_item_id, sample_quantity) {
    const quote_items = this._getFromStorage('quote_items');
    const item = quote_items.find(qi => qi.id === quote_item_id);
    if (!item) {
      return {
        quote: null,
        items: [],
        message: 'Quote item not found'
      };
    }

    const qty = Number(sample_quantity) || 0;
    if (qty <= 0) {
      // Remove item
      const idx = quote_items.findIndex(qi => qi.id === quote_item_id);
      if (idx !== -1) quote_items.splice(idx, 1);
    } else {
      item.sample_quantity = qty;
      item.line_total = qty * (item.unit_price || 0);
    }

    // Recalculate quote totals
    const quotes = this._getFromStorage('quotes');
    const quote = quotes.find(q => q.id === item.quote_id) || this._getOrCreateQuoteDraft();
    const itemsForQuote = quote_items.filter(qi => qi.quote_id === quote.id);

    let total_amount = 0;
    let currency = 'usd';
    itemsForQuote.forEach(qi => {
      total_amount += qi.line_total || 0;
      currency = qi.currency || currency;
    });

    quote.total_amount = total_amount;
    quote.currency = currency;
    quote.updated_at = this._now();

    const qIdx = quotes.findIndex(q => q.id === quote.id);
    if (qIdx >= 0) quotes[qIdx] = quote;

    this._saveToStorage('quotes', quotes);
    this._saveToStorage('quote_items', quote_items);

    return {
      quote: {
        id: quote.id,
        total_amount,
        currency
      },
      items: itemsForQuote,
      message: 'Quote item updated'
    };
  }

  // 23. getContentFilterOptions
  getContentFilterOptions(section) {
    const content_items = this._getFromStorage('content_items').filter(
      ci => ci.section === section
    );

    const content_types_set = new Set(content_items.map(ci => ci.content_type));
    const content_types = Array.from(content_types_set).map(ct => ({
      value: ct,
      label: ct
        .split('_')
        .map(s => s.charAt(0).toUpperCase() + s.slice(1))
        .join(' ')
    }));

    const crop_set = new Set();
    content_items.forEach(ci => {
      (ci.crop_tags || []).forEach(c => crop_set.add(c));
    });
    const crop_options = Array.from(crop_set).map(c => ({
      value: c,
      label: c.charAt(0).toUpperCase() + c.slice(1)
    }));

    const region_set = new Set(content_items.map(ci => ci.region).filter(Boolean));
    const region_options = Array.from(region_set).map(r => ({
      value: r,
      label: r
        .split('_')
        .map(s => s.charAt(0).toUpperCase() + s.slice(1))
        .join(' ')
    }));

    let yield_increase_filter = null;
    if (section === 'case_studies') {
      const values = content_items
        .map(ci => ci.yield_increase_percent)
        .filter(v => typeof v === 'number');
      const min_value = values.length ? Math.min(...values) : 0;
      const max_value = values.length ? Math.max(...values) : 0;
      yield_increase_filter = { min_value, max_value };
    }

    return {
      section,
      content_types,
      crop_options,
      region_options,
      yield_increase_filter
    };
  }

  // 24. searchContentItems
  searchContentItems(section, query, filters = {}, page = 1, page_size = 20) {
    const q = (query || '').trim();
    const all = this._getFromStorage('content_items').filter(ci => ci.section === section);

    const itemsFiltered = all.filter(ci => {
      if (q) {
        const matches =
          this._textMatch(ci.title, q) ||
          this._textMatch(ci.short_description, q) ||
          this._textMatch(ci.body, q) ||
          (Array.isArray(ci.tags) && ci.tags.some(t => this._textMatch(t, q)));
        if (!matches) return false;
      }

      if (filters.content_types_included && filters.content_types_included.length > 0) {
        if (!filters.content_types_included.includes(ci.content_type)) return false;
      }

      if (filters.crop) {
        if (!this._arrayIncludesCaseInsensitive(ci.crop_tags || [], filters.crop)) return false;
      }

      if (filters.region && ci.region && ci.region !== filters.region) {
        return false;
      }

      if (
        typeof filters.min_yield_increase_percent === 'number' &&
        section === 'case_studies'
      ) {
        if (
          typeof ci.yield_increase_percent !== 'number' ||
          ci.yield_increase_percent < filters.min_yield_increase_percent
        ) {
          return false;
        }
      }

      return true;
    });

    const total_results = itemsFiltered.length;
    const start = (page - 1) * page_size;
    const pageItems = itemsFiltered.slice(start, start + page_size);

    return {
      total_results,
      page,
      page_size,
      items: pageItems
    };
  }

  // 25. getContentItemDetails
  getContentItemDetails(content_item_id) {
    const items = this._getFromStorage('content_items');
    const content_item = items.find(ci => ci.id === content_item_id) || null;
    return { content_item };
  }

  // 26. saveResource
  saveResource(content_item_id) {
    const content_items = this._getFromStorage('content_items');
    const item = content_items.find(ci => ci.id === content_item_id);
    if (!item) {
      return { saved_resource: null, message: 'Content item not found' };
    }

    const saved_resources = this._getFromStorage('saved_resources');
    const now = this._now();
    const saved_resource = {
      id: this._generateId('svres'),
      content_item_id,
      saved_at: now
    };
    saved_resources.push(saved_resource);
    this._saveToStorage('saved_resources', saved_resources);

    return { saved_resource, message: 'Resource saved' };
  }

  // 27. getSavedResources (with FK resolution)
  getSavedResources() {
    const saved_resources_raw = this._getFromStorage('saved_resources');
    const content_items_all = this._getFromStorage('content_items');

    const saved_resources = saved_resources_raw.map(sr => ({
      ...sr,
      content_item: content_items_all.find(ci => ci.id === sr.content_item_id) || null
    }));

    const content_items = saved_resources
      .map(sr => sr.content_item)
      .filter(ci => ci != null);

    return {
      saved_resources,
      content_items
    };
  }

  // 28. addContentItemToReadingList
  addContentItemToReadingList(content_item_id, reading_list_name) {
    const content_items = this._getFromStorage('content_items');
    const item = content_items.find(ci => ci.id === content_item_id);
    if (!item) {
      return { reading_list: null, reading_list_item: null, message: 'Content item not found' };
    }

    const reading_lists = this._getFromStorage('reading_lists');
    const reading_list_items = this._getFromStorage('reading_list_items');

    let rl = reading_lists.find(
      r => r.name === reading_list_name
    );

    const now = this._now();

    if (!rl) {
      rl = {
        id: this._generateId('rlist'),
        name: reading_list_name,
        created_at: now
      };
      reading_lists.push(rl);
      this._saveToStorage('reading_lists', reading_lists);
    }

    const reading_list_item = {
      id: this._generateId('rlitem'),
      reading_list_id: rl.id,
      content_item_id,
      added_at: now,
      notes: null
    };

    reading_list_items.push(reading_list_item);
    this._saveToStorage('reading_list_items', reading_list_items);

    return {
      reading_list: rl,
      reading_list_item,
      message: 'Item added to reading list'
    };
  }

  // 29. getReadingLists
  getReadingLists() {
    const reading_lists = this._getFromStorage('reading_lists');
    return { reading_lists };
  }

  // 30. getReadingListDetails (with FK resolution for items)
  getReadingListDetails(reading_list_id) {
    const reading_lists = this._getFromStorage('reading_lists');
    const reading_list = reading_lists.find(r => r.id === reading_list_id) || null;

    const reading_list_items_raw = this._getFromStorage('reading_list_items').filter(
      rli => rli.reading_list_id === reading_list_id
    );
    const content_items_all = this._getFromStorage('content_items');

    const items = reading_list_items_raw.map(rli => ({
      ...rli,
      content_item: content_items_all.find(ci => ci.id === rli.content_item_id) || null
    }));

    const content_items = items
      .map(i => i.content_item)
      .filter(ci => ci != null);

    return {
      reading_list,
      items,
      content_items
    };
  }

  // 31. getLibraryState
  getLibraryState() {
    const library_state = this._getOrCreateLibraryState();
    return { library_state };
  }

  // 32. setLibraryActiveTab
  setLibraryActiveTab(active_tab) {
    const allowed = ['learning_plan', 'saved_resources', 'reading_lists', 'saved_analyses'];
    const tab = allowed.includes(active_tab) ? active_tab : 'learning_plan';
    const states = this._getFromStorage('library_state');
    let state = states[0] || null;
    const now = this._now();

    if (!state) {
      state = {
        id: this._generateId('libstate'),
        active_tab: tab,
        updated_at: now
      };
      states.push(state);
    } else {
      state.active_tab = tab;
      state.updated_at = now;
      states[0] = state;
    }

    this._saveToStorage('library_state', states);
    return { library_state: state };
  }

  // 33. getLearningPlan (with FK resolution)
  getLearningPlan() {
    const plan = this._getOrCreateLearningPlan();
    const itemsAll = this._getFromStorage('learning_plan_items');
    const coursesAll = this._getFromStorage('training_courses');

    const items = itemsAll
      .filter(i => i.learning_plan_id === plan.id)
      .sort((a, b) => (a.position || 0) - (b.position || 0))
      .map(i => ({
        ...i,
        course: coursesAll.find(c => c.id === i.course_id) || null
      }));

    const courses = items.map(i => i.course).filter(c => c != null);

    return {
      learning_plan: plan,
      items,
      courses
    };
  }

  // 34. reorderLearningPlanItem
  reorderLearningPlanItem(learning_plan_item_id, new_position) {
    const items = this._getFromStorage('learning_plan_items');
    const item = items.find(i => i.id === learning_plan_item_id);
    if (!item) {
      return { items: [] };
    }

    const planId = item.learning_plan_id;
    const planItems = items.filter(i => i.learning_plan_id === planId);
    const otherItems = items.filter(i => i.learning_plan_id !== planId);

    const sorted = planItems.sort((a, b) => (a.position || 0) - (b.position || 0));
    const idx = sorted.findIndex(i => i.id === learning_plan_item_id);
    if (idx === -1) {
      return { items };
    }

    const target = sorted.splice(idx, 1)[0];
    const pos = Math.max(1, Math.min(new_position, sorted.length + 1));
    sorted.splice(pos - 1, 0, target);

    sorted.forEach((i, index) => {
      i.position = index + 1;
    });

    const newAll = [...otherItems, ...sorted];
    this._saveToStorage('learning_plan_items', newAll);

    return {
      items: sorted
    };
  }

  // 35. removeLearningPlanItem
  removeLearningPlanItem(learning_plan_item_id) {
    const items = this._getFromStorage('learning_plan_items');
    const item = items.find(i => i.id === learning_plan_item_id);
    if (!item) {
      return { items: [] };
    }

    const planId = item.learning_plan_id;
    const remaining = items.filter(i => i.id !== learning_plan_item_id);
    const planItems = remaining.filter(i => i.learning_plan_id === planId);

    planItems.sort((a, b) => (a.position || 0) - (b.position || 0));
    planItems.forEach((i, index) => {
      i.position = index + 1;
    });

    const otherItems = remaining.filter(i => i.learning_plan_id !== planId);
    const newAll = [...otherItems, ...planItems];

    this._saveToStorage('learning_plan_items', newAll);

    return {
      items: planItems
    };
  }

  // 36. getBreedingProjects
  getBreedingProjects(filters = {}, sort = 'year_desc') {
    let projects = this._getFromStorage('breeding_projects');

    filters = filters || {};
    if (filters.crop) {
      projects = projects.filter(p => p.crop === filters.crop);
    }
    if (filters.year != null) {
      projects = projects.filter(p => p.year === filters.year);
    }
    if (filters.status) {
      projects = projects.filter(p => p.status === filters.status);
    }

    if (sort === 'year_desc') {
      projects.sort((a, b) => (b.year || 0) - (a.year || 0));
    } else if (sort === 'year_asc') {
      projects.sort((a, b) => (a.year || 0) - (b.year || 0));
    } else if (sort === 'name_asc') {
      projects.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    } else if (sort === 'name_desc') {
      projects.sort((a, b) => (b.name || '').localeCompare(a.name || ''));
    }

    const project_locations = this._getFromStorage('breeding_project_locations');
    const countsMap = {};
    project_locations.forEach(pl => {
      countsMap[pl.project_id] = (countsMap[pl.project_id] || 0) + 1;
    });

    const project_location_counts = projects.map(p => ({
      project_id: p.id,
      location_count: countsMap[p.id] || 0
    }));

    return {
      projects,
      project_location_counts
    };
  }

  // 37. getBreedingProjectDetails
  getBreedingProjectDetails(project_id) {
    const projects = this._getFromStorage('breeding_projects');
    const project = projects.find(p => p.id === project_id) || null;

    const bTraits = this._getFromStorage('breeding_project_traits').filter(
      bt => bt.project_id === project_id
    );
    const traitsAll = this._getFromStorage('traits');
    const traits = bTraits
      .map(bt => traitsAll.find(t => t.id === bt.trait_id))
      .filter(t => t != null);

    const bLocs = this._getFromStorage('breeding_project_locations').filter(
      bl => bl.project_id === project_id
    );
    const locsAll = this._getFromStorage('locations');
    const locations = bLocs
      .map(bl => locsAll.find(l => l.id === bl.location_id))
      .filter(l => l != null);

    return {
      project,
      traits,
      locations
    };
  }

  // 38. searchTraits
  searchTraits(query, limit = 20) {
    const q = (query || '').trim();
    const traits = this._getFromStorage('traits');
    const filtered = traits.filter(t => this._textMatch(t.name, q));
    return filtered.slice(0, limit);
  }

  // 39. getAvailableLocations
  getAvailableLocations() {
    return this._getFromStorage('locations');
  }

  // 40. createBreedingProject
  createBreedingProject(name, crop, year, start_date, trait_ids, location_ids) {
    const projects = this._getFromStorage('breeding_projects');
    const project_traits = this._getFromStorage('breeding_project_traits');
    const project_locations = this._getFromStorage('breeding_project_locations');

    const now = this._now();
    const project = {
      id: this._generateId('proj'),
      name,
      crop,
      description: null,
      year: year != null ? year : null,
      start_date: start_date || null,
      status: 'planning',
      created_at: now,
      updated_at: now
    };

    projects.push(project);

    const traitIdsArr = Array.isArray(trait_ids) ? trait_ids : [];
    traitIdsArr.forEach(tid => {
      project_traits.push({
        id: this._generateId('pjtrait'),
        project_id: project.id,
        trait_id: tid
      });
    });

    const locIdsArr = Array.isArray(location_ids) ? location_ids : [];
    locIdsArr.forEach(lid => {
      project_locations.push({
        id: this._generateId('pjloc'),
        project_id: project.id,
        location_id: lid
      });
    });

    this._saveToStorage('breeding_projects', projects);
    this._saveToStorage('breeding_project_traits', project_traits);
    this._saveToStorage('breeding_project_locations', project_locations);

    const traitsAll = this._getFromStorage('traits');
    const locationsAll = this._getFromStorage('locations');

    const traits = traitIdsArr
      .map(tid => traitsAll.find(t => t.id === tid))
      .filter(t => t != null);
    const locations = locIdsArr
      .map(lid => locationsAll.find(l => l.id === lid))
      .filter(l => l != null);

    return {
      project: {
        id: project.id,
        name: project.name,
        crop: project.crop,
        year: project.year,
        status: project.status
      },
      traits,
      locations,
      message: 'Breeding project created'
    };
  }

  // 41. updateBreedingProject
  updateBreedingProject(project_id, name, crop, year, start_date, status, trait_ids, location_ids) {
    const projects = this._getFromStorage('breeding_projects');
    const project_traits = this._getFromStorage('breeding_project_traits');
    const project_locations = this._getFromStorage('breeding_project_locations');

    const idx = projects.findIndex(p => p.id === project_id);
    if (idx === -1) {
      return {
        project: null,
        traits: [],
        locations: []
      };
    }

    const project = projects[idx];
    if (name !== undefined) project.name = name;
    if (crop !== undefined) project.crop = crop;
    if (year !== undefined) project.year = year;
    if (start_date !== undefined) project.start_date = start_date;
    if (status !== undefined) project.status = status;
    project.updated_at = this._now();

    // Update traits if provided
    if (trait_ids !== undefined) {
      const traitIdsArr = Array.isArray(trait_ids) ? trait_ids : [];
      const remaining = project_traits.filter(pt => pt.project_id !== project_id);
      traitIdsArr.forEach(tid => {
        remaining.push({
          id: this._generateId('pjtrait'),
          project_id: project_id,
          trait_id: tid
        });
      });
      this._saveToStorage('breeding_project_traits', remaining);
    }

    // Update locations if provided
    if (location_ids !== undefined) {
      const locIdsArr = Array.isArray(location_ids) ? location_ids : [];
      const remainingLocs = project_locations.filter(pl => pl.project_id !== project_id);
      locIdsArr.forEach(lid => {
        remainingLocs.push({
          id: this._generateId('pjloc'),
          project_id: project_id,
          location_id: lid
        });
      });
      this._saveToStorage('breeding_project_locations', remainingLocs);
    }

    projects[idx] = project;
    this._saveToStorage('breeding_projects', projects);

    const traitsAll = this._getFromStorage('traits');
    const locationsAll = this._getFromStorage('locations');
    const bt = this._getFromStorage('breeding_project_traits').filter(
      pt => pt.project_id === project_id
    );
    const bl = this._getFromStorage('breeding_project_locations').filter(
      pl => pl.project_id === project_id
    );

    const traits = bt
      .map(pt => traitsAll.find(t => t.id === pt.trait_id))
      .filter(t => t != null);
    const locations = bl
      .map(pl => locationsAll.find(l => l.id === pl.location_id))
      .filter(l => l != null);

    return {
      project: {
        id: project.id,
        name: project.name,
        status: project.status
      },
      traits,
      locations
    };
  }

  // 42. submitCustomAssayRequest
  submitCustomAssayRequest(
    crop,
    min_markers,
    max_markers,
    desired_turnaround_days,
    expected_annual_sample_volume,
    contact_name,
    contact_email,
    terms_accepted
  ) {
    if (!terms_accepted) {
      return {
        request: null,
        message: 'Terms must be accepted to submit the request'
      };
    }

    const requests = this._getFromStorage('custom_assay_requests');
    const now = this._now();
    const request = {
      id: this._generateId('cassay'),
      crop,
      min_markers,
      max_markers,
      desired_turnaround_days,
      expected_annual_sample_volume,
      contact_name,
      contact_email,
      terms_accepted: true,
      status: 'submitted',
      created_at: now,
      updated_at: now
    };

    requests.push(request);
    this._saveToStorage('custom_assay_requests', requests);

    return {
      request,
      message: 'Custom assay request submitted'
    };
  }

  // 43. calculateRoiScenarios
  calculateRoiScenarios(scenarios) {
    const input = Array.isArray(scenarios) ? scenarios : [];
    return input.map(sc => {
      const roi_percentage = this._calculateRoiPercentage(
        sc.annual_genotyping_cost,
        sc.annual_phenotyping_cost,
        sc.expected_yield_gain_percent,
        sc.time_horizon_years
      );
      return {
        label: sc.label,
        annual_genotyping_cost: sc.annual_genotyping_cost,
        annual_phenotyping_cost: sc.annual_phenotyping_cost,
        expected_yield_gain_percent: sc.expected_yield_gain_percent,
        time_horizon_years: sc.time_horizon_years,
        roi_percentage
      };
    });
  }

  // 44. saveRoiAnalysisWithPreferredScenario
  saveRoiAnalysisWithPreferredScenario(analysis_name, scenarios, preferred_scenario_label) {
    const roi_analyses = this._getFromStorage('roi_analyses');
    const roi_scenarios = this._getFromStorage('roi_scenarios');
    const now = this._now();

    const analysis = {
      id: this._generateId('roia'),
      name: analysis_name,
      description: null,
      preferred_scenario_id: null,
      created_at: now
    };

    const createdScenarios = [];
    let preferredId = null;

    (Array.isArray(scenarios) ? scenarios : []).forEach(sc => {
      const scenario = {
        id: this._generateId('roisc'),
        analysis_id: analysis.id,
        label: sc.label,
        annual_genotyping_cost: sc.annual_genotyping_cost,
        annual_phenotyping_cost: sc.annual_phenotyping_cost,
        expected_yield_gain_percent: sc.expected_yield_gain_percent,
        time_horizon_years: sc.time_horizon_years,
        roi_percentage: sc.roi_percentage,
        is_preferred: sc.label === preferred_scenario_label
      };
      if (scenario.is_preferred) {
        preferredId = scenario.id;
      }
      roi_scenarios.push(scenario);
      createdScenarios.push(scenario);
    });

    analysis.preferred_scenario_id = preferredId;
    roi_analyses.push(analysis);

    this._saveToStorage('roi_analyses', roi_analyses);
    this._saveToStorage('roi_scenarios', roi_scenarios);

    return {
      analysis,
      scenarios: createdScenarios
    };
  }

  // 45. getSavedRoiAnalyses
  getSavedRoiAnalyses() {
    const analyses = this._getFromStorage('roi_analyses');
    return { analyses };
  }

  // 46. renameRoiAnalysis
  renameRoiAnalysis(analysis_id, new_name) {
    const analyses = this._getFromStorage('roi_analyses');
    const idx = analyses.findIndex(a => a.id === analysis_id);
    if (idx === -1) {
      return { analysis: null };
    }
    analyses[idx].name = new_name;
    this._saveToStorage('roi_analyses', analyses);
    return { analysis: analyses[idx] };
  }

  // 47. deleteRoiAnalysis
  deleteRoiAnalysis(analysis_id) {
    const analyses = this._getFromStorage('roi_analyses');
    const scenarios = this._getFromStorage('roi_scenarios');

    const newAnalyses = analyses.filter(a => a.id !== analysis_id);
    const newScenarios = scenarios.filter(s => s.analysis_id !== analysis_id);

    this._saveToStorage('roi_analyses', newAnalyses);
    this._saveToStorage('roi_scenarios', newScenarios);

    return { success: true };
  }

  // 48. submitContactForm
  submitContactForm(name, email, subject, message) {
    const submissions = this._getFromStorage('contact_form_submissions');
    const now = this._now();
    const submission = {
      id: this._generateId('contact'),
      name,
      email,
      subject,
      message,
      created_at: now
    };
    submissions.push(submission);
    this._saveToStorage('contact_form_submissions', submissions);

    return {
      success: true,
      message: 'Contact form submitted'
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
