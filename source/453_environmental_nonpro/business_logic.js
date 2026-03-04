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

  _initStorage() {
    const keys = [
      'projects',
      'carts',
      'cart_items',
      'donation_intents',
      'donation_allocations',
      'donation_orders',
      'donation_order_items',
      'volunteer_events',
      'event_registrations',
      'saved_events',
      'articles',
      'saved_articles',
      'saved_projects',
      'company_teams',
      'team_departments',
      'carbon_calculations',
      // additional internal tables
      'contact_submissions',
      'newsletter_subscriptions'
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
    return data ? JSON.parse(data) : [];
  }

  _saveToStorage(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
  }

  _getNextIdCounter() {
    const current = parseInt(localStorage.getItem('idCounter') || '1000', 10);
    const next = current + 1;
    localStorage.setItem('idCounter', next.toString());
    return next;
  }

  _generateId(prefix) {
    return prefix + '_' + this._getNextIdCounter();
  }

  _now() {
    return new Date().toISOString();
  }

  _parseDate(value) {
    return value ? new Date(value) : null;
  }

  // Helper: get or create single active cart
  _getOrCreateCart() {
    let carts = this._getFromStorage('carts');
    let cart = carts.find(c => c.status === 'open');
    if (!cart) {
      cart = {
        id: this._generateId('cart'),
        status: 'open',
        created_at: this._now(),
        updated_at: this._now()
      };
      carts.push(cart);
      this._saveToStorage('carts', carts);
    }
    return cart;
  }

  // Helper: get active donation intent (donate_page, in_progress) or create one
  _getActiveDonationIntent() {
    let intents = this._getFromStorage('donation_intents');
    let intent = intents.find(i => i.source === 'donate_page' && i.status === 'in_progress');
    if (!intent) {
      intent = {
        id: this._generateId('donation_intent'),
        cart_id: null,
        total_amount: 0,
        currency: 'usd',
        frequency: 'one_time',
        is_recurring: false,
        status: 'in_progress',
        source: 'donate_page',
        donor_name: null,
        donor_email: null,
        donor_password: null,
        note: null,
        created_at: this._now(),
        updated_at: this._now()
      };
      intents.push(intent);
      this._saveToStorage('donation_intents', intents);
    }
    return intent;
  }

  // Helper: get latest donation intent by updated_at
  _getLatestDonationIntent() {
    const intents = this._getFromStorage('donation_intents');
    if (!intents.length) return null;
    let latest = intents[0];
    for (const i of intents) {
      const latestTime = this._parseDate(latest.updated_at || latest.created_at).getTime();
      const time = this._parseDate(i.updated_at || i.created_at).getTime();
      if (time > latestTime) {
        latest = i;
      }
    }
    return latest;
  }

  // Helper: compute distance sort (here we just sort by date; no real geo)
  _calculateEventProximityAndSort(events, postalCode) {
    // We ignore postalCode for distance due to lack of geo data and just sort by start_datetime.
    return events.slice().sort((a, b) => {
      const da = this._parseDate(a.start_datetime || a.startDatetime || a.startDateTime) || new Date(0);
      const db = this._parseDate(b.start_datetime || b.startDatetime || b.startDateTime) || new Date(0);
      return da - db;
    });
  }

  // Helper: enrich cart items with foreign key entities
  _enrichCartItems(cart, cartItems) {
    const projects = this._getFromStorage('projects');
    const calcs = this._getFromStorage('carbon_calculations');
    return cartItems.map(item => ({
      ...item,
      cart: cart || null,
      project: item.project_id ? (projects.find(p => p.id === item.project_id) || null) : null,
      carbon_calculation: item.carbon_calculation_id ? (calcs.find(c => c.id === item.carbon_calculation_id) || null) : null
    }));
  }

  // Helper: map project -> allocation_category enum
  _mapProjectToAllocationCategory(project) {
    if (!project) return 'other';
    if (project.ecosystem_type === 'mangrove_forests') return 'mangrove_forests';
    if (project.ecosystem_type === 'rainforest') return 'rainforest';
    if (project.project_setting === 'urban_trees' || project.project_setting === 'city_planting') return 'urban_trees';
    return 'other';
  }

  // ============================
  // Interface implementations
  // ============================

  // getHomePageOverview()
  getHomePageOverview() {
    const projects = this._getFromStorage('projects');
    const volunteerEvents = this._getFromStorage('volunteer_events');
    const articles = this._getFromStorage('articles');

    const featured_projects = projects.slice(0, 3);

    const now = new Date();
    const upcomingEvents = volunteerEvents
      .filter(e => {
        const d = this._parseDate(e.start_datetime);
        return d && d >= now;
      })
      .sort((a, b) => this._parseDate(a.start_datetime) - this._parseDate(b.start_datetime));

    const featured_events = upcomingEvents.slice(0, 3);

    const sortedArticles = articles
      .slice()
      .sort((a, b) => this._parseDate(b.published_at) - this._parseDate(a.published_at));
    const featured_articles = sortedArticles.slice(0, 3);

    const impact_areas = [
      {
        key: 'urban_trees',
        title: 'Urban Trees',
        description: 'Cool cities, fight urban heat, and improve air quality by planting trees where people live.',
        icon_key: 'city_trees'
      },
      {
        key: 'rainforest',
        title: 'Rainforests',
        description: 'Protect biodiverse rainforests that store vast amounts of carbon and support communities.',
        icon_key: 'rainforest'
      },
      {
        key: 'mangrove_forests',
        title: 'Mangrove Forests',
        description: 'Restore coastal mangroves that shield shorelines and store blue carbon.',
        icon_key: 'mangroves'
      }
    ];

    const quick_start_actions = [
      {
        id: 'qs_donate',
        label: 'Plant 10 trees now',
        description: 'Start a quick tree donation in under a minute.',
        target_page: 'donate',
        preset_type: 'donate_trees',
        preset_label: '10 trees',
        preset_value: 10
      },
      {
        id: 'qs_projects',
        label: 'Explore projects',
        description: 'Browse our global tree-planting projects.',
        target_page: 'projects',
        preset_type: 'browse_projects',
        preset_label: 'All projects',
        preset_value: 0
      },
      {
        id: 'qs_volunteer',
        label: 'Find a volunteer event',
        description: 'Join a local tree planting near you.',
        target_page: 'volunteer',
        preset_type: 'find_events',
        preset_label: 'Near me',
        preset_value: 0
      },
      {
        id: 'qs_gift',
        label: 'Gift trees',
        description: 'Send a digital tree gift for someone special.',
        target_page: 'gifts',
        preset_type: 'gift_trees',
        preset_label: 'Gift a tree',
        preset_value: 1
      }
    ];

    return {
      mission_summary: 'We are an environmental nonprofit restoring forests and planting trees to cool cities, protect biodiversity, and stabilize the climate.',
      impact_areas,
      featured_projects,
      featured_events,
      featured_articles,
      quick_start_actions
    };
  }

  // getProjectsPageContent()
  getProjectsPageContent() {
    return {
      intro_title: 'Tree-Planting Projects',
      intro_body: 'Browse vetted tree-planting projects around the world. Filter by ecosystem, region, and impact focus to find the projects that matter most to you.',
      highlighted_messages: [
        'Every project is vetted for ecological integrity and community benefits.',
        'You can support projects by funding trees, sending gifts, or creating a monthly pledge.'
      ]
    };
  }

  // getProjectFilterOptions()
  getProjectFilterOptions() {
    const projects = this._getFromStorage('projects');
    let minPrice = null;
    let maxPrice = null;
    for (const p of projects) {
      if (typeof p.price_per_tree === 'number') {
        if (minPrice === null || p.price_per_tree < minPrice) minPrice = p.price_per_tree;
        if (maxPrice === null || p.price_per_tree > maxPrice) maxPrice = p.price_per_tree;
      }
    }

    const ecosystem_types = [
      { value: 'mangrove_forests', label: 'Mangrove forests', description: 'Coastal mangrove restoration' },
      { value: 'rainforest', label: 'Rainforests', description: 'Tropical rainforest restoration' },
      { value: 'temperate_forest', label: 'Temperate forests', description: 'Temperate and boreal forests' },
      { value: 'urban_forest', label: 'Urban forests', description: 'City and town tree planting' },
      { value: 'other', label: 'Other', description: 'Other forest types and agroforestry' }
    ];

    const regions = [
      { value: 'south_america', label: 'South America' },
      { value: 'north_america', label: 'North America' },
      { value: 'europe', label: 'Europe' },
      { value: 'africa', label: 'Africa' },
      { value: 'asia', label: 'Asia' },
      { value: 'oceania', label: 'Oceania' },
      { value: 'global', label: 'Global' }
    ];

    const countries = [];
    const seenCountries = new Set();
    for (const p of projects) {
      if (p.country && !seenCountries.has(p.country)) {
        seenCountries.add(p.country);
        countries.push({ code: p.country, name: p.country, region_value: p.region || null });
      }
    }

    const project_settings = [
      { value: 'urban_trees', label: 'Urban trees' },
      { value: 'city_planting', label: 'City planting' },
      { value: 'rural', label: 'Rural' },
      { value: 'mixed', label: 'Mixed settings' }
    ];

    const rating_options = [
      { min_value: 4.5, label: '4.5 stars and up' },
      { min_value: 4.0, label: '4.0 stars and up' },
      { min_value: 3.0, label: '3.0 stars and up' }
    ];

    const price_per_tree_range = {
      min: minPrice === null ? 0 : minPrice,
      max: maxPrice === null ? 0 : maxPrice,
      currency_options: ['usd', 'eur', 'gbp', 'local']
    };

    const sort_options = [
      { value: 'price_per_tree_low_to_high', label: 'Price per tree: Low to High' },
      { value: 'biodiversity_high_to_low', label: 'Species diversity: High to Low' },
      { value: 'rating_high_to_low', label: 'Rating: High to Low' },
      { value: 'newest', label: 'Newest projects' }
    ];

    return {
      ecosystem_types,
      regions,
      countries,
      project_settings,
      rating_options,
      price_per_tree_range,
      sort_options
    };
  }

  // searchProjects(query, filters, sort, page, page_size)
  searchProjects(query, filters, sort, page, page_size) {
    const allProjects = this._getFromStorage('projects');
    let projects = allProjects.slice();

    query = query || '';
    filters = filters || {};
    sort = sort || null;
    page = page || 1;
    page_size = page_size || 20;

    const q = query.trim().toLowerCase();
    if (q) {
      projects = projects.filter(p => {
        const haystack = [p.name, p.short_description, p.long_description]
          .filter(Boolean)
          .join(' ') 
          .toLowerCase();
        return haystack.includes(q);
      });
    }

    if (filters.ecosystem_type) {
      projects = projects.filter(p => p.ecosystem_type === filters.ecosystem_type);
    }
    if (filters.region) {
      projects = projects.filter(p => p.region === filters.region);
    }
    if (filters.country) {
      projects = projects.filter(p => p.country === filters.country);
    }
    if (filters.project_setting) {
      projects = projects.filter(p => p.project_setting === filters.project_setting);
    }
    if (typeof filters.rating_min === 'number') {
      projects = projects.filter(p => typeof p.rating === 'number' && p.rating >= filters.rating_min);
    }
    if (typeof filters.price_min === 'number') {
      projects = projects.filter(p => typeof p.price_per_tree === 'number' && p.price_per_tree >= filters.price_min);
    }
    if (typeof filters.price_max === 'number') {
      projects = projects.filter(p => typeof p.price_per_tree === 'number' && p.price_per_tree <= filters.price_max);
    }
    if (typeof filters.is_giftable === 'boolean') {
      projects = projects.filter(p => !!p.is_giftable === filters.is_giftable);
    }

    if (sort === 'price_per_tree_low_to_high') {
      projects.sort((a, b) => (a.price_per_tree || 0) - (b.price_per_tree || 0));
    } else if (sort === 'biodiversity_high_to_low') {
      projects.sort((a, b) => (b.tree_species_count || 0) - (a.tree_species_count || 0));
    } else if (sort === 'rating_high_to_low') {
      projects.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (sort === 'newest') {
      projects.sort((a, b) => this._parseDate(b.created_at) - this._parseDate(a.created_at));
    }

    const total_count = projects.length;
    const start = (page - 1) * page_size;
    const end = start + page_size;

    return {
      total_count,
      page,
      page_size,
      projects: projects.slice(start, end),
      applied_filters: {
        ecosystem_type: filters.ecosystem_type || null,
        region: filters.region || null,
        country: filters.country || null,
        project_setting: filters.project_setting || null,
        rating_min: typeof filters.rating_min === 'number' ? filters.rating_min : null,
        price_min: typeof filters.price_min === 'number' ? filters.price_min : null,
        price_max: typeof filters.price_max === 'number' ? filters.price_max : null,
        is_giftable: typeof filters.is_giftable === 'boolean' ? filters.is_giftable : null
      }
    };
  }

  // getProjectDetails(projectId)
  getProjectDetails(projectId) {
    const projects = this._getFromStorage('projects');
    const savedProjects = this._getFromStorage('saved_projects');

    const project = projects.find(p => p.id === projectId) || null;
    if (!project) {
      return {
        project: null,
        is_favorite: false,
        donation_options: null,
        gift_options: null,
        related_projects: []
      };
    }

    const is_favorite = !!savedProjects.find(sp => sp.project_id === projectId);

    const donation_options = {
      min_trees: project.min_tree_donation || 1,
      max_trees: project.max_tree_donation || null,
      default_trees: project.min_tree_donation || 1,
      currency: project.currency || 'usd',
      price_per_tree: project.price_per_tree || 0
    };

    const now = new Date();
    const oneYearLater = new Date(now.getTime());
    oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);

    const gift_options = {
      is_giftable: !!project.is_giftable,
      min_trees: project.min_tree_donation || 1,
      max_trees: project.max_tree_donation || null,
      default_trees: project.min_tree_donation || 1,
      supported_delivery_methods: ['email', 'printable_certificate'],
      delivery_date_range: {
        earliest: now.toISOString().slice(0, 10),
        latest: oneYearLater.toISOString().slice(0, 10)
      }
    };

    const related_projects = projects
      .filter(p => p.id !== project.id && (p.ecosystem_type === project.ecosystem_type || p.region === project.region))
      .slice(0, 4);

    return {
      project,
      is_favorite,
      donation_options,
      gift_options,
      related_projects
    };
  }

  // addProjectTreesToCart(projectId, numberOfTrees, source)
  addProjectTreesToCart(projectId, numberOfTrees, source) {
    source = source || 'manual';
    const projects = this._getFromStorage('projects');
    const project = projects.find(p => p.id === projectId) || null;
    if (!project) {
      return { success: false, cart: null, cart_items: [], added_item: null, message: 'Project not found.' };
    }

    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items');

    const unitPrice = project.price_per_tree || 0;
    const trees = Number(numberOfTrees) || 0;

    const newItem = {
      id: this._generateId('cart_item'),
      cart_id: cart.id,
      project_id: project.id,
      item_type: 'project_donation',
      source: source,
      number_of_trees: trees,
      unit_price: unitPrice,
      total_price: unitPrice * trees,
      allocation_category: this._mapProjectToAllocationCategory(project),
      is_recurring: false,
      frequency: 'one_time',
      is_gift: false,
      gift_recipient_name: null,
      gift_message: null,
      gift_delivery_date: null,
      gift_occasion: null,
      carbon_calculation_id: null,
      created_at: this._now()
    };

    cartItems.push(newItem);
    this._saveToStorage('cart_items', cartItems);

    // Update cart timestamp
    let carts = this._getFromStorage('carts');
    const cartIndex = carts.findIndex(c => c.id === cart.id);
    if (cartIndex >= 0) {
      carts[cartIndex].updated_at = this._now();
      this._saveToStorage('carts', carts);
    }

    cartItems = this._getFromStorage('cart_items');

    return {
      success: true,
      cart,
      cart_items: cartItems,
      added_item: newItem,
      message: 'Trees added to cart.'
    };
  }

  // addProjectGiftToCart(projectId, numberOfTrees, recipientName, deliveryDate, message, occasion)
  addProjectGiftToCart(projectId, numberOfTrees, recipientName, deliveryDate, message, occasion) {
    const projects = this._getFromStorage('projects');
    const project = projects.find(p => p.id === projectId) || null;
    if (!project) {
      return { success: false, cart: null, cart_items: [], gift_item: null, message: 'Project not found.' };
    }
    if (!project.is_giftable) {
      return { success: false, cart: null, cart_items: [], gift_item: null, message: 'Project is not giftable.' };
    }

    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items');

    const unitPrice = project.price_per_tree || 0;
    const trees = Number(numberOfTrees) || 0;

    const deliveryIso = new Date(deliveryDate).toISOString();

    const giftItem = {
      id: this._generateId('cart_item'),
      cart_id: cart.id,
      project_id: project.id,
      item_type: 'gift',
      source: 'gift_flow',
      number_of_trees: trees,
      unit_price: unitPrice,
      total_price: unitPrice * trees,
      allocation_category: this._mapProjectToAllocationCategory(project),
      is_recurring: false,
      frequency: 'one_time',
      is_gift: true,
      gift_recipient_name: recipientName,
      gift_message: message,
      gift_delivery_date: deliveryIso,
      gift_occasion: occasion || null,
      carbon_calculation_id: null,
      created_at: this._now()
    };

    cartItems.push(giftItem);
    this._saveToStorage('cart_items', cartItems);

    let carts = this._getFromStorage('carts');
    const cartIndex = carts.findIndex(c => c.id === cart.id);
    if (cartIndex >= 0) {
      carts[cartIndex].updated_at = this._now();
      this._saveToStorage('carts', carts);
    }

    cartItems = this._getFromStorage('cart_items');

    return {
      success: true,
      cart,
      cart_items: cartItems,
      gift_item: giftItem,
      message: 'Gift added to cart.'
    };
  }

  // saveProjectToFavorites(projectId)
  saveProjectToFavorites(projectId) {
    const projects = this._getFromStorage('projects');
    const project = projects.find(p => p.id === projectId);
    if (!project) {
      return { success: false, saved_project: null, message: 'Project not found.' };
    }

    let savedProjects = this._getFromStorage('saved_projects');
    let existing = savedProjects.find(sp => sp.project_id === projectId);
    if (existing) {
      return { success: true, saved_project: existing, message: 'Project already in favorites.' };
    }

    const saved = {
      id: this._generateId('saved_project'),
      project_id: projectId,
      note: null,
      added_at: this._now()
    };

    savedProjects.push(saved);
    this._saveToStorage('saved_projects', savedProjects);

    return { success: true, saved_project: saved, message: 'Project added to favorites.' };
  }

  // removeProjectFromFavorites(projectId)
  removeProjectFromFavorites(projectId) {
    let savedProjects = this._getFromStorage('saved_projects');
    const before = savedProjects.length;
    savedProjects = savedProjects.filter(sp => sp.project_id !== projectId);
    this._saveToStorage('saved_projects', savedProjects);

    const removed = savedProjects.length < before;
    return {
      success: removed,
      message: removed ? 'Project removed from favorites.' : 'Project was not in favorites.'
    };
  }

  // getCartSummary()
  getCartSummary() {
    const carts = this._getFromStorage('carts');
    const cart = carts.find(c => c.status === 'open') || null;
    const allCartItems = this._getFromStorage('cart_items');

    if (!cart) {
      return {
        cart: null,
        cart_entity: null,
        items: [],
        totals: {
          currency: 'usd',
          subtotal: 0,
          estimated_fees: 0,
          total: 0,
          total_trees: 0,
          has_recurring: false,
          recurring_amount: 0
        },
        notes: []
      };
    }

    const cartItems = allCartItems.filter(ci => ci.cart_id === cart.id);

    if (!cartItems.length) {
      return {
        cart: null,
        cart_entity: null,
        items: [],
        totals: {
          currency: 'usd',
          subtotal: 0,
          estimated_fees: 0,
          total: 0,
          total_trees: 0,
          has_recurring: false,
          recurring_amount: 0
        },
        notes: []
      };
    }

    const projects = this._getFromStorage('projects');

    let currency = 'usd';
    let subtotal = 0;
    let total_trees = 0;
    let has_recurring = false;
    let recurring_amount = 0;

    for (const item of cartItems) {
      const project = item.project_id ? projects.find(p => p.id === item.project_id) : null;
      const itemCurrency = project && project.currency ? project.currency : 'usd';
      currency = itemCurrency; // assume single currency
      const price = typeof item.total_price === 'number' ? item.total_price : 0;
      subtotal += price;
      total_trees += Number(item.number_of_trees) || 0;
      if (item.is_recurring) {
        has_recurring = true;
        recurring_amount += price;
      }
    }

    const estimated_fees = subtotal * 0.03;
    const total = subtotal + estimated_fees;

    const itemsEnriched = this._enrichCartItems(cart, cartItems);

    const notes = [];
    if (has_recurring) {
      notes.push({ type: 'recurring', message: 'Your cart contains recurring monthly items.' });
    }

    return {
      cart: cart,
      cart_entity: cart,
      items: itemsEnriched,
      totals: {
        currency,
        subtotal,
        estimated_fees,
        total,
        total_trees,
        has_recurring,
        recurring_amount
      },
      notes
    };
  }

  // updateCartItemTrees(cartItemId, numberOfTrees)
  updateCartItemTrees(cartItemId, numberOfTrees) {
    let cartItems = this._getFromStorage('cart_items');
    const idx = cartItems.findIndex(ci => ci.id === cartItemId);
    if (idx === -1) {
      return { success: false, updated_item: null, cart: null, cart_items: cartItems, message: 'Cart item not found.' };
    }

    const item = { ...cartItems[idx] };
    const projects = this._getFromStorage('projects');
    const project = item.project_id ? projects.find(p => p.id === item.project_id) : null;
    const unitPrice = typeof item.unit_price === 'number' ? item.unit_price : (project ? project.price_per_tree || 0 : 0);
    const trees = Number(numberOfTrees) || 0;

    item.number_of_trees = trees;
    item.unit_price = unitPrice;
    item.total_price = unitPrice * trees;

    cartItems[idx] = item;
    this._saveToStorage('cart_items', cartItems);

    const carts = this._getFromStorage('carts');
    const cart = carts.find(c => c.id === item.cart_id) || null;

    return {
      success: true,
      updated_item: item,
      cart,
      cart_items: cartItems,
      message: 'Cart item updated.'
    };
  }

  // removeCartItem(cartItemId)
  removeCartItem(cartItemId) {
    let cartItems = this._getFromStorage('cart_items');
    const before = cartItems.length;
    const item = cartItems.find(ci => ci.id === cartItemId) || null;
    cartItems = cartItems.filter(ci => ci.id !== cartItemId);
    this._saveToStorage('cart_items', cartItems);

    const carts = this._getFromStorage('carts');
    const cart = item ? (carts.find(c => c.id === item.cart_id) || null) : null;

    return {
      success: cartItems.length < before,
      cart,
      cart_items: cartItems,
      message: cartItems.length < before ? 'Cart item removed.' : 'Cart item not found.'
    };
  }

  // beginCheckoutFromCart()
  beginCheckoutFromCart() {
    const carts = this._getFromStorage('carts');
    const cart = carts.find(c => c.status === 'open') || null;
    const allCartItems = this._getFromStorage('cart_items');
    const cartItems = cart ? allCartItems.filter(ci => ci.cart_id === cart.id) : [];

    let total_amount = 0;
    const projects = this._getFromStorage('projects');

    for (const item of cartItems) {
      const project = item.project_id ? projects.find(p => p.id === item.project_id) : null;
      const amount = typeof item.total_price === 'number' ? item.total_price : ((project ? project.price_per_tree || 0 : 0) * (item.number_of_trees || 0));
      total_amount += amount;
    }

    const currency = (cartItems.length && projects.find(p => p.id === cartItems[0].project_id)?.currency) || 'usd';
    const has_recurring = cartItems.some(i => i.is_recurring);

    let intents = this._getFromStorage('donation_intents');

    const donation_intent = {
      id: this._generateId('donation_intent'),
      cart_id: cart ? cart.id : null,
      total_amount,
      currency,
      frequency: has_recurring ? 'monthly' : 'one_time',
      is_recurring: has_recurring,
      status: 'ready_for_checkout',
      source: 'cart_checkout',
      donor_name: null,
      donor_email: null,
      donor_password: null,
      note: null,
      created_at: this._now(),
      updated_at: this._now()
    };

    intents.push(donation_intent);
    this._saveToStorage('donation_intents', intents);

    // Build allocations from cart items by allocation_category
    const allocMap = {};
    for (const item of cartItems) {
      const cat = item.allocation_category || 'other';
      const project = item.project_id ? projects.find(p => p.id === item.project_id) : null;
      const amount = typeof item.total_price === 'number' ? item.total_price : ((project ? project.price_per_tree || 0 : 0) * (item.number_of_trees || 0));
      if (!allocMap[cat]) allocMap[cat] = 0;
      allocMap[cat] += amount;
    }

    const donation_allocations = this._getFromStorage('donation_allocations');
    const allocations = [];

    const totalForAlloc = Object.values(allocMap).reduce((sum, v) => sum + v, 0);
    if (totalForAlloc > 0) {
      for (const cat of Object.keys(allocMap)) {
        const percentage = (allocMap[cat] / totalForAlloc) * 100;
        const alloc = {
          id: this._generateId('donation_allocation'),
          donation_intent_id: donation_intent.id,
          allocation_category: cat,
          percentage
        };
        donation_allocations.push(alloc);
        allocations.push(alloc);
      }
      this._saveToStorage('donation_allocations', donation_allocations);
    }

    return {
      donation_intent,
      allocations,
      cart,
      cart_items: cartItems
    };
  }

  // getDonatePageConfig()
  getDonatePageConfig() {
    const allocation_categories = [
      {
        value: 'urban_trees',
        label: 'Urban trees',
        description: 'Plant trees in cities to cool neighborhoods and improve air quality.',
        default_percentage: 40
      },
      {
        value: 'rainforest',
        label: 'Rainforests',
        description: 'Protect tropical forests and biodiversity hotspots.',
        default_percentage: 40
      },
      {
        value: 'mangrove_forests',
        label: 'Mangrove forests',
        description: 'Restore coastal mangroves that store blue carbon.',
        default_percentage: 20
      },
      {
        value: 'general_fund',
        label: 'General fund',
        description: 'Let us direct your gift to the highest priority needs.',
        default_percentage: 0
      },
      {
        value: 'other',
        label: 'Other',
        description: 'Other tree and forest programs.',
        default_percentage: 0
      }
    ];

    return {
      default_currency: 'usd',
      allowed_currencies: ['usd', 'eur', 'gbp', 'local'],
      suggested_amounts: [10, 25, 50, 100],
      min_amount: 1,
      max_amount: 10000,
      allocation_categories
    };
  }

  // createOrUpdateDonationIntentFromDonatePage(totalAmount, currency, frequency, allocations)
  createOrUpdateDonationIntentFromDonatePage(totalAmount, currency, frequency, allocations) {
    const errors = [];

    if (!(totalAmount > 0)) {
      errors.push({ field: 'totalAmount', message: 'Total amount must be greater than 0.' });
    }

    const allowedCurrencies = ['usd', 'eur', 'gbp', 'local'];
    if (!allowedCurrencies.includes(currency)) {
      errors.push({ field: 'currency', message: 'Unsupported currency.' });
    }

    const allowedFrequencies = ['one_time', 'monthly', 'annual'];
    if (!allowedFrequencies.includes(frequency)) {
      errors.push({ field: 'frequency', message: 'Invalid frequency.' });
    }

    allocations = allocations || [];
    const allowedCategories = ['urban_trees', 'rainforest', 'mangrove_forests', 'general_fund', 'other'];

    let sumPercent = 0;
    for (const alloc of allocations) {
      if (!allowedCategories.includes(alloc.allocation_category)) {
        errors.push({ field: 'allocations', message: 'Invalid allocation category: ' + alloc.allocation_category });
      }
      if (!(alloc.percentage >= 0)) {
        errors.push({ field: 'allocations', message: 'Allocation percentage must be >= 0.' });
      }
      sumPercent += alloc.percentage || 0;
    }

    if (allocations.length && Math.abs(sumPercent - 100) > 0.01) {
      errors.push({ field: 'allocations', message: 'Allocation percentages must sum to 100.' });
    }

    if (errors.length) {
      return {
        success: false,
        donation_intent: null,
        allocations: [],
        validation_errors: errors
      };
    }

    const intent = this._getActiveDonationIntent();
    const intents = this._getFromStorage('donation_intents');
    const idx = intents.findIndex(i => i.id === intent.id);

    intent.total_amount = totalAmount;
    intent.currency = currency;
    intent.frequency = frequency;
    intent.is_recurring = frequency !== 'one_time';
    intent.status = 'in_progress';
    intent.updated_at = this._now();

    if (idx >= 0) {
      intents[idx] = intent;
    } else {
      intents.push(intent);
    }
    this._saveToStorage('donation_intents', intents);

    // Replace allocations for this intent
    let allAllocations = this._getFromStorage('donation_allocations');
    allAllocations = allAllocations.filter(a => a.donation_intent_id !== intent.id);

    const newAllocations = allocations.map(a => ({
      id: this._generateId('donation_allocation'),
      donation_intent_id: intent.id,
      allocation_category: a.allocation_category,
      percentage: a.percentage
    }));

    allAllocations.push(...newAllocations);
    this._saveToStorage('donation_allocations', allAllocations);

    return {
      success: true,
      donation_intent: intent,
      allocations: newAllocations,
      validation_errors: []
    };
  }

  // updateDonationIntentAccountDetails(donorName, donorEmail, createPassword)
  updateDonationIntentAccountDetails(donorName, donorEmail, createPassword) {
    const intent = this._getActiveDonationIntent();
    const intents = this._getFromStorage('donation_intents');
    const idx = intents.findIndex(i => i.id === intent.id);

    intent.donor_name = donorName;
    intent.donor_email = donorEmail;
    if (createPassword) {
      intent.donor_password = createPassword;
    }
    intent.updated_at = this._now();

    if (idx >= 0) {
      intents[idx] = intent;
    } else {
      intents.push(intent);
    }
    this._saveToStorage('donation_intents', intents);

    return { donation_intent: intent };
  }

  // getCheckoutDetails()
  getCheckoutDetails() {
    const donation_intent = this._getLatestDonationIntent();
    const allAllocations = this._getFromStorage('donation_allocations');
    const carts = this._getFromStorage('carts');
    const allCartItems = this._getFromStorage('cart_items');

    let cart = null;
    let cartItems = [];

    if (donation_intent && donation_intent.cart_id) {
      cart = carts.find(c => c.id === donation_intent.cart_id) || null;
    }
    if (!cart) {
      cart = carts.find(c => c.status === 'open') || null;
    }
    if (cart) {
      cartItems = allCartItems.filter(ci => ci.cart_id === cart.id);
    }

    const allocations = donation_intent
      ? allAllocations.filter(a => a.donation_intent_id === donation_intent.id)
      : [];

    const itemsEnriched = cart ? this._enrichCartItems(cart, cartItems) : [];

    let total_trees = 0;
    let gift_item_count = 0;
    let carbon_offset_item_count = 0;

    for (const item of cartItems) {
      total_trees += Number(item.number_of_trees) || 0;
      if (item.item_type === 'gift') gift_item_count += 1;
      if (item.item_type === 'carbon_offset') carbon_offset_item_count += 1;
    }

    const summary = donation_intent
      ? {
          currency: donation_intent.currency,
          total_amount: donation_intent.total_amount,
          is_recurring: donation_intent.is_recurring,
          frequency: donation_intent.frequency,
          total_trees,
          gift_item_count,
          carbon_offset_item_count
        }
      : {
          currency: 'usd',
          total_amount: 0,
          is_recurring: false,
          frequency: 'one_time',
          total_trees,
          gift_item_count,
          carbon_offset_item_count
        };

    return {
      donation_intent,
      allocations,
      cart,
      cart_items: itemsEnriched,
      summary
    };
  }

  // submitDonationCheckout(donorName, donorEmail, password, paymentMethod, paymentDetails)
  submitDonationCheckout(donorName, donorEmail, password, paymentMethod, paymentDetails) {
    const donation_intent = this._getLatestDonationIntent();
    const carts = this._getFromStorage('carts');
    const allCartItems = this._getFromStorage('cart_items');
    const projects = this._getFromStorage('projects');
    const allAllocations = this._getFromStorage('donation_allocations');

    if (!donation_intent) {
      return { success: false, donation_order: null, order_items: [], message: 'No donation intent found.' };
    }

    const intents = this._getFromStorage('donation_intents');
    const intentIdx = intents.findIndex(i => i.id === donation_intent.id);

    if (donorName) donation_intent.donor_name = donorName;
    if (donorEmail) donation_intent.donor_email = donorEmail;
    if (password) donation_intent.donor_password = password;
    donation_intent.status = 'completed';
    donation_intent.updated_at = this._now();

    if (intentIdx >= 0) {
      intents[intentIdx] = donation_intent;
      this._saveToStorage('donation_intents', intents);
    }

    const cart = donation_intent.cart_id ? (carts.find(c => c.id === donation_intent.cart_id) || null) : null;
    const cartItems = cart ? allCartItems.filter(ci => ci.cart_id === cart.id) : [];

    let total_amount = 0;
    for (const item of cartItems) {
      const project = item.project_id ? projects.find(p => p.id === item.project_id) : null;
      const amount = typeof item.total_price === 'number' ? item.total_price : ((project ? project.price_per_tree || 0 : 0) * (item.number_of_trees || 0));
      total_amount += amount;
    }
    if (!total_amount) {
      total_amount = donation_intent.total_amount || 0;
    }

    let orders = this._getFromStorage('donation_orders');
    const orderId = this._generateId('donation_order');
    const confirmation_number = 'DN-' + Date.now() + '-' + this._getNextIdCounter();

    const donation_order = {
      id: orderId,
      donation_intent_id: donation_intent.id,
      total_amount,
      currency: donation_intent.currency,
      frequency: donation_intent.frequency,
      is_recurring: donation_intent.is_recurring,
      status: 'completed',
      payment_method: paymentMethod,
      donor_name: donation_intent.donor_name || donorName || null,
      donor_email: donation_intent.donor_email || donorEmail || null,
      confirmation_number,
      created_at: this._now(),
      completed_at: this._now()
    };

    orders.push(donation_order);
    this._saveToStorage('donation_orders', orders);

    let orderItems = this._getFromStorage('donation_order_items');
    const newOrderItems = [];

    for (const item of cartItems) {
      const project = item.project_id ? projects.find(p => p.id === item.project_id) : null;
      const amount = typeof item.total_price === 'number' ? item.total_price : ((project ? project.price_per_tree || 0 : 0) * (item.number_of_trees || 0));
      const orderItem = {
        id: this._generateId('donation_order_item'),
        donation_order_id: orderId,
        project_id: item.project_id || null,
        item_type: item.item_type,
        number_of_trees: item.number_of_trees || null,
        amount,
        allocation_category: item.allocation_category || null,
        is_gift: !!item.is_gift,
        gift_recipient_name: item.gift_recipient_name || null,
        gift_message: item.gift_message || null,
        gift_delivery_date: item.gift_delivery_date || null
      };
      orderItems.push(orderItem);
      newOrderItems.push(orderItem);
    }

    const allocations = allAllocations.filter(a => a.donation_intent_id === donation_intent.id);
    for (const alloc of allocations) {
      const allocAmount = (donation_intent.total_amount || 0) * (alloc.percentage || 0) / 100;
      const orderItem = {
        id: this._generateId('donation_order_item'),
        donation_order_id: orderId,
        project_id: null,
        item_type: 'allocation',
        number_of_trees: null,
        amount: allocAmount,
        allocation_category: alloc.allocation_category,
        is_gift: false,
        gift_recipient_name: null,
        gift_message: null,
        gift_delivery_date: null
      };
      orderItems.push(orderItem);
      newOrderItems.push(orderItem);
    }

    this._saveToStorage('donation_order_items', orderItems);

    // Mark cart as checked_out
    if (cart) {
      const cartsAll = this._getFromStorage('carts');
      const cartIdx = cartsAll.findIndex(c => c.id === cart.id);
      if (cartIdx >= 0) {
        cartsAll[cartIdx].status = 'checked_out';
        cartsAll[cartIdx].updated_at = this._now();
        this._saveToStorage('carts', cartsAll);
      }
    }

    return {
      success: true,
      donation_order,
      order_items: newOrderItems,
      message: 'Donation completed.'
    };
  }

  // getVolunteerPageContent()
  getVolunteerPageContent() {
    return {
      intro_title: 'Volunteer with Us',
      intro_body: 'Join local tree-planting and stewardship events to restore nature in your community.',
      guidelines_summary: 'All volunteers must follow on-site safety instructions and respect local communities and ecosystems.',
      what_to_expect: 'Most events are 2–4 hours, outdoors, and family-friendly. Tools and basic training are provided.'
    };
  }

  // getVolunteerFilterOptions()
  getVolunteerFilterOptions() {
    const event_types = [
      { value: 'tree_planting', label: 'Tree planting' },
      { value: 'workshop', label: 'Workshops and trainings' },
      { value: 'webinar', label: 'Webinars' },
      { value: 'cleanup', label: 'Cleanups' },
      { value: 'fundraiser', label: 'Fundraisers' },
      { value: 'other', label: 'Other events' }
    ];

    const date_ranges = [
      { value: 'weekends', label: 'Weekends', description: 'Upcoming Saturdays and Sundays only.' },
      { value: 'next_month', label: 'Next month', description: 'Events happening next calendar month.' },
      { value: 'all_future', label: 'All future dates', description: 'Any upcoming event.' }
    ];

    const accessibility_tags = [
      { value: 'family_friendly', label: 'Family-friendly' },
      { value: 'kids_welcome', label: 'Kids welcome' }
    ];

    const age_options = [
      { min_age: 10, label: 'Ages 10+' },
      { min_age: 13, label: 'Ages 13+' },
      { min_age: 16, label: 'Ages 16+' },
      { min_age: 18, label: 'Adults only (18+)' }
    ];

    const radius_options = [
      { miles: 10, label: 'Within 10 miles' },
      { miles: 25, label: 'Within 25 miles' },
      { miles: 50, label: 'Within 50 miles' }
    ];

    return { event_types, date_ranges, accessibility_tags, age_options, radius_options };
  }

  // searchVolunteerEvents(location, date_filter, start_date, end_date, event_type, is_family_friendly, min_age, max_age, page, page_size)
  searchVolunteerEvents(location, date_filter, start_date, end_date, event_type, is_family_friendly, min_age, max_age, page, page_size) {
    let events = this._getFromStorage('volunteer_events').slice();

    location = location || {};
    page = page || 1;
    page_size = page_size || 20;

    if (location && location.postal_code) {
      // Approximation: filter by exact postal_code match when provided
      events = events.filter(e => !e.postal_code || e.postal_code === location.postal_code);
    }

    const now = new Date();

    if (date_filter === 'weekends') {
      events = events.filter(e => {
        const d = this._parseDate(e.start_datetime);
        if (!d || d < now) return false;
        const day = d.getUTCDay();
        return day === 0 || day === 6; // Sunday or Saturday
      });
    } else if (date_filter === 'next_month') {
      const currentMonth = now.getUTCMonth();
      const currentYear = now.getUTCFullYear();
      const nextMonth = (currentMonth + 1) % 12;
      const yearOfNextMonth = currentMonth === 11 ? currentYear + 1 : currentYear;
      const start = new Date(Date.UTC(yearOfNextMonth, nextMonth, 1));
      const end = new Date(Date.UTC(yearOfNextMonth, nextMonth + 1, 0, 23, 59, 59));
      events = events.filter(e => {
        const d = this._parseDate(e.start_datetime);
        return d && d >= start && d <= end;
      });
    } else if (start_date && end_date) {
      const start = new Date(start_date);
      const end = new Date(end_date);
      events = events.filter(e => {
        const d = this._parseDate(e.start_datetime);
        return d && d >= start && d <= end;
      });
    }

    if (event_type) {
      events = events.filter(e => e.event_type === event_type);
    }

    if (typeof is_family_friendly === 'boolean') {
      events = events.filter(e => !!e.is_family_friendly === is_family_friendly);
    }

    if (typeof min_age === 'number') {
      events = events.filter(e => (typeof e.min_age === 'number' ? e.min_age : 0) <= min_age);
    }

    if (typeof max_age === 'number') {
      events = events.filter(e => (typeof e.max_age === 'number' ? e.max_age : 999) >= max_age);
    }

    events = this._calculateEventProximityAndSort(events, location.postal_code || null);

    const total_count = events.length;
    const startIndex = (page - 1) * page_size;
    const endIndex = startIndex + page_size;

    return {
      total_count,
      page,
      page_size,
      events: events.slice(startIndex, endIndex)
    };
  }

  // getVolunteerEventDetails(eventId)
  getVolunteerEventDetails(eventId) {
    const events = this._getFromStorage('volunteer_events');
    const savedEvents = this._getFromStorage('saved_events');
    const regs = this._getFromStorage('event_registrations');

    const event = events.find(e => e.id === eventId) || null;
    if (!event) {
      return {
        event: null,
        is_saved: false,
        registration_status: 'not_registered',
        guidelines_text: '',
        what_to_bring: '',
        organizer_contact: ''
      };
    }

    const is_saved = !!savedEvents.find(se => se.event_id === eventId);

    let registration_status = 'not_registered';
    const hasRegistration = regs.find(r => r.event_id === eventId && r.registration_status === 'registered');
    if (typeof event.spots_remaining === 'number' && event.spots_remaining <= 0) {
      registration_status = 'full';
    } else if (hasRegistration) {
      registration_status = 'registered';
    }

    return {
      event,
      is_saved,
      registration_status,
      guidelines_text: 'Please arrive on time, wear weather-appropriate clothing and sturdy shoes, and follow the guidance of event leads.',
      what_to_bring: 'Refillable water bottle, sun protection, and any personal medications you may need.',
      organizer_contact: 'events@trees-example.org'
    };
  }

  // registerForVolunteerEvent(eventId, fullName, email, phone, agreedToGuidelines)
  registerForVolunteerEvent(eventId, fullName, email, phone, agreedToGuidelines) {
    const events = this._getFromStorage('volunteer_events');
    const event = events.find(e => e.id === eventId) || null;
    if (!event) {
      return { success: false, registration: null, saved_event: null, message: 'Event not found.' };
    }
    if (!agreedToGuidelines) {
      return { success: false, registration: null, saved_event: null, message: 'You must agree to the volunteer guidelines.' };
    }

    let registration_status = 'registered';
    if (typeof event.spots_remaining === 'number' && event.spots_remaining <= 0) {
      registration_status = 'waitlisted';
    }

    const registration = {
      id: this._generateId('event_registration'),
      event_id: eventId,
      full_name: fullName,
      email,
      phone: phone || null,
      agreed_to_guidelines: !!agreedToGuidelines,
      registration_status,
      registered_at: this._now(),
      notes: null
    };

    const regs = this._getFromStorage('event_registrations');
    regs.push(registration);
    this._saveToStorage('event_registrations', regs);

    // Update spots_remaining if applicable
    const eventsAll = this._getFromStorage('volunteer_events');
    const idx = eventsAll.findIndex(e => e.id === eventId);
    if (idx >= 0 && typeof eventsAll[idx].spots_remaining === 'number' && eventsAll[idx].spots_remaining > 0 && registration_status === 'registered') {
      eventsAll[idx].spots_remaining = eventsAll[idx].spots_remaining - 1;
      this._saveToStorage('volunteer_events', eventsAll);
    }

    // Save to calendar
    let savedEvents = this._getFromStorage('saved_events');
    let saved = savedEvents.find(se => se.event_id === eventId && se.source === 'registration');
    if (!saved) {
      saved = {
        id: this._generateId('saved_event'),
        event_id: eventId,
        source: 'registration',
        added_at: this._now()
      };
      savedEvents.push(saved);
      this._saveToStorage('saved_events', savedEvents);
    }

    return {
      success: true,
      registration,
      saved_event: saved,
      message: registration_status === 'registered' ? 'You are registered for the event.' : 'The event is full; you have been added to the waitlist.'
    };
  }

  // saveEventToMyCalendar(eventId)
  saveEventToMyCalendar(eventId) {
    const events = this._getFromStorage('volunteer_events');
    const event = events.find(e => e.id === eventId);
    if (!event) {
      return { success: false, saved_event: null, message: 'Event not found.' };
    }

    let savedEvents = this._getFromStorage('saved_events');
    let existing = savedEvents.find(se => se.event_id === eventId && se.source === 'manual_save');
    if (existing) {
      return { success: true, saved_event: existing, message: 'Event already in your calendar.' };
    }

    const saved = {
      id: this._generateId('saved_event'),
      event_id: eventId,
      source: 'manual_save',
      added_at: this._now()
    };
    savedEvents.push(saved);
    this._saveToStorage('saved_events', savedEvents);

    return { success: true, saved_event: saved, message: 'Event added to your calendar.' };
  }

  // getGiftsPageContent()
  getGiftsPageContent() {
    return {
      intro_title: 'Gift Trees',
      intro_body: 'Send digital tree gifts that support real-world planting projects and share a meaningful climate-friendly gesture.',
      how_it_works: 'Choose a project, pick the number of trees, add a personal message, and select a delivery date. We will email a beautiful digital certificate to your recipient.',
      common_occasions: ['Birthdays', 'Holidays', 'Weddings', 'Thank you', 'Memorial gifts']
    };
  }

  // getGiftFilterOptions()
  getGiftFilterOptions() {
    const projects = this._getFromStorage('projects');

    const countries = [];
    const seen = new Set();
    for (const p of projects) {
      if (p.is_giftable && p.country && !seen.has(p.country)) {
        seen.add(p.country);
        countries.push({ code: p.country, name: p.country });
      }
    }

    const project_settings = [
      { value: 'urban_trees', label: 'Urban trees' },
      { value: 'city_planting', label: 'City planting' },
      { value: 'rural', label: 'Rural' },
      { value: 'mixed', label: 'Mixed settings' }
    ];

    const rating_options = [
      { min_value: 4.5, label: '4.5 stars and up' },
      { min_value: 4.0, label: '4.0 stars and up' },
      { min_value: 3.0, label: '3.0 stars and up' }
    ];

    return { countries, project_settings, rating_options };
  }

  // searchGiftableProjects(filters, sort, page, page_size)
  searchGiftableProjects(filters, sort, page, page_size) {
    filters = filters || {};
    sort = sort || 'rating_high_to_low';
    page = page || 1;
    page_size = page_size || 20;

    let projects = this._getFromStorage('projects').filter(p => !!p.is_giftable);

    if (filters.country) {
      projects = projects.filter(p => p.country === filters.country);
    }
    if (filters.project_setting) {
      projects = projects.filter(p => p.project_setting === filters.project_setting);
    }
    if (typeof filters.rating_min === 'number') {
      projects = projects.filter(p => typeof p.rating === 'number' && p.rating >= filters.rating_min);
    }

    if (sort === 'rating_high_to_low') {
      projects.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (sort === 'price_per_tree_low_to_high') {
      projects.sort((a, b) => (a.price_per_tree || 0) - (b.price_per_tree || 0));
    }

    const total_count = projects.length;
    const start = (page - 1) * page_size;
    const end = start + page_size;

    return {
      total_count,
      page,
      page_size,
      projects: projects.slice(start, end)
    };
  }

  // getCarbonCalculatorConfig()
  getCarbonCalculatorConfig() {
    const activity_types = [
      {
        value: 'flights',
        label: 'Flights',
        description: 'Estimate emissions from air travel and offset them with trees.'
      },
      {
        value: 'driving',
        label: 'Driving',
        description: 'Estimate emissions from car travel.'
      },
      {
        value: 'home_energy',
        label: 'Home energy',
        description: 'Roughly estimate emissions from home electricity and heating.'
      },
      {
        value: 'other',
        label: 'Other',
        description: 'Other activities not listed above.'
      }
    ];

    return {
      activity_types,
      default_activity_type: 'flights',
      info_text: 'Our carbon calculator provides simple, conservative estimates and converts them into recommended numbers of trees to plant.'
    };
  }

  // calculateCarbonImpact(activityType, numberOfFlights, distanceTravelledKm, notes)
  calculateCarbonImpact(activityType, numberOfFlights, distanceTravelledKm, notes) {
    activityType = activityType || 'flights';
    numberOfFlights = Number(numberOfFlights) || 0;
    distanceTravelledKm = Number(distanceTravelledKm) || 0;

    let estimated_emissions_tonnes = 0;
    let recommended_trees = 0;

    if (activityType === 'flights') {
      // Simple heuristic: 0.25 tCO2e per average flight, 10 trees per flight
      estimated_emissions_tonnes = numberOfFlights * 0.25;
      recommended_trees = Math.max(0, Math.round(numberOfFlights * 10));
    } else if (activityType === 'driving') {
      // Assume 0.0002 tCO2e per km, 1 tree per 100km
      estimated_emissions_tonnes = distanceTravelledKm * 0.0002;
      recommended_trees = Math.max(0, Math.round(distanceTravelledKm / 100));
    } else if (activityType === 'home_energy') {
      // Generic placeholder
      estimated_emissions_tonnes = 1;
      recommended_trees = 12;
    } else {
      estimated_emissions_tonnes = 0;
      recommended_trees = 0;
    }

    const calculation = {
      id: this._generateId('carbon_calculation'),
      activity_type: activityType,
      number_of_flights: activityType === 'flights' ? numberOfFlights : null,
      distance_travelled_km: distanceTravelledKm || null,
      estimated_emissions_tonnes,
      recommended_trees,
      created_at: this._now(),
      notes: notes || null
    };

    const calcs = this._getFromStorage('carbon_calculations');
    calcs.push(calculation);
    this._saveToStorage('carbon_calculations', calcs);

    return {
      calculation,
      message: 'Carbon impact estimated.'
    };
  }

  // addRecommendedTreesToCart(carbonCalculationId)
  addRecommendedTreesToCart(carbonCalculationId) {
    const calcs = this._getFromStorage('carbon_calculations');
    const calc = calcs.find(c => c.id === carbonCalculationId) || null;
    if (!calc) {
      return { success: false, cart: null, cart_items: [], added_item: null, message: 'Calculation not found.' };
    }

    const projects = this._getFromStorage('projects');
    let avgPrice = 1;
    const priced = projects.filter(p => typeof p.price_per_tree === 'number' && p.price_per_tree > 0);
    if (priced.length) {
      const sum = priced.reduce((s, p) => s + p.price_per_tree, 0);
      avgPrice = sum / priced.length;
    }

    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items');

    const trees = calc.recommended_trees || 0;

    const item = {
      id: this._generateId('cart_item'),
      cart_id: cart.id,
      project_id: null,
      item_type: 'carbon_offset',
      source: 'carbon_calculator',
      number_of_trees: trees,
      unit_price: avgPrice,
      total_price: avgPrice * trees,
      allocation_category: 'other',
      is_recurring: false,
      frequency: 'one_time',
      is_gift: false,
      gift_recipient_name: null,
      gift_message: null,
      gift_delivery_date: null,
      gift_occasion: null,
      carbon_calculation_id: calc.id,
      created_at: this._now()
    };

    cartItems.push(item);
    this._saveToStorage('cart_items', cartItems);

    let carts = this._getFromStorage('carts');
    const cartIdx = carts.findIndex(c => c.id === cart.id);
    if (cartIdx >= 0) {
      carts[cartIdx].updated_at = this._now();
      this._saveToStorage('carts', carts);
    }

    cartItems = this._getFromStorage('cart_items');

    return {
      success: true,
      cart,
      cart_items: cartItems,
      added_item: item,
      message: 'Recommended trees added to cart.'
    };
  }

  // getLearnPageOverview()
  getLearnPageOverview() {
    const articles = this._getFromStorage('articles');
    const featured_articles = articles
      .slice()
      .sort((a, b) => this._parseDate(b.published_at) - this._parseDate(a.published_at))
      .slice(0, 3);

    return {
      intro_title: 'Learn About Trees and Climate',
      intro_body: 'Explore articles and resources about urban forests, climate science, biodiversity, and community-led reforestation.',
      featured_articles
    };
  }

  // getArticleFilterOptions()
  getArticleFilterOptions() {
    const topics = [
      { value: 'urban_forestry', label: 'Urban forestry' },
      { value: 'cities', label: 'Cities' },
      { value: 'climate_science', label: 'Climate science' },
      { value: 'biodiversity', label: 'Biodiversity' },
      { value: 'reforestation', label: 'Reforestation' },
      { value: 'community_stories', label: 'Community stories' },
      { value: 'policy', label: 'Policy and advocacy' },
      { value: 'other', label: 'Other topics' }
    ];

    const date_ranges = [
      { value: 'past_year', label: 'Past year', description: 'Articles published in the last 12 months.' },
      { value: 'past_3_months', label: 'Past 3 months', description: 'Recent articles from the last 90 days.' },
      { value: 'any', label: 'Any time', description: 'All available articles.' }
    ];

    return { topics, date_ranges };
  }

  // searchArticles(query, filters, page, page_size)
  searchArticles(query, filters, page, page_size) {
    let articles = this._getFromStorage('articles').slice();

    query = query || '';
    filters = filters || {};
    page = page || 1;
    page_size = page_size || 20;

    const q = query.trim().toLowerCase();
    if (q) {
      articles = articles.filter(a => {
        const text = [a.title, a.summary, a.content].filter(Boolean).join(' ').toLowerCase();
        return text.includes(q);
      });
    }

    const now = new Date();

    if (filters.date_range && filters.date_range !== 'any') {
      let cutoff = null;
      if (filters.date_range === 'past_year') {
        cutoff = new Date(now.getTime());
        cutoff.setFullYear(cutoff.getFullYear() - 1);
      } else if (filters.date_range === 'past_3_months') {
        cutoff = new Date(now.getTime());
        cutoff.setMonth(cutoff.getMonth() - 3);
      }
      if (cutoff) {
        articles = articles.filter(a => {
          const d = this._parseDate(a.published_at);
          return d && d >= cutoff;
        });
      }
    }

    if (filters.start_date && filters.end_date) {
      const start = new Date(filters.start_date);
      const end = new Date(filters.end_date);
      articles = articles.filter(a => {
        const d = this._parseDate(a.published_at);
        return d && d >= start && d <= end;
      });
    }

    if (filters.topic) {
      articles = articles.filter(a => a.topic === filters.topic);
    }

    const total_count = articles.length;
    const startIndex = (page - 1) * page_size;
    const endIndex = startIndex + page_size;

    return {
      total_count,
      page,
      page_size,
      articles: articles.slice(startIndex, endIndex)
    };
  }

  // getArticleDetails(articleId)
  getArticleDetails(articleId) {
    const articles = this._getFromStorage('articles');
    const savedArticles = this._getFromStorage('saved_articles');

    const article = articles.find(a => a.id === articleId) || null;
    if (!article) {
      return { article: null, is_saved: false, related_articles: [] };
    }

    const is_saved = !!savedArticles.find(sa => sa.article_id === articleId);
    const related_articles = articles
      .filter(a => a.id !== articleId && a.topic === article.topic)
      .slice(0, 3);

    return { article, is_saved, related_articles };
  }

  // saveArticleToReadingList(articleId)
  saveArticleToReadingList(articleId) {
    const articles = this._getFromStorage('articles');
    const article = articles.find(a => a.id === articleId);
    if (!article) {
      return { success: false, saved_article: null, message: 'Article not found.' };
    }

    let savedArticles = this._getFromStorage('saved_articles');
    let existing = savedArticles.find(sa => sa.article_id === articleId);
    if (existing) {
      return { success: true, saved_article: existing, message: 'Article already in reading list.' };
    }

    const saved = {
      id: this._generateId('saved_article'),
      article_id: articleId,
      source: 'manual_save',
      added_at: this._now()
    };

    savedArticles.push(saved);
    this._saveToStorage('saved_articles', savedArticles);

    return { success: true, saved_article: saved, message: 'Article saved to reading list.' };
  }

  // getForCompaniesPageContent()
  getForCompaniesPageContent() {
    return {
      intro_title: 'For Companies and Teams',
      intro_body: 'Engage your employees and customers by planting trees together. Create a team page, set a tree goal, and track your progress.',
      benefits: [
        {
          id: 'engagement',
          title: 'Employee engagement',
          description: 'Give employees a tangible way to contribute to climate solutions.'
        },
        {
          id: 'impact_reporting',
          title: 'Impact reporting',
          description: 'Share transparent metrics on trees planted and areas restored.'
        },
        {
          id: 'brand_alignment',
          title: 'Brand alignment',
          description: 'Show your commitment to climate and community resilience.'
        }
      ],
      team_form_defaults: {
        min_goal_trees: 100,
        default_deadline_days_from_now: 90
      }
    };
  }

  // createCompanyTeamWithDepartments(companyName, teamName, goalTreeCount, deadlineDate, departments)
  createCompanyTeamWithDepartments(companyName, teamName, goalTreeCount, deadlineDate, departments) {
    const team = {
      id: this._generateId('company_team'),
      company_name: companyName,
      team_name: teamName,
      description: null,
      goal_tree_count: goalTreeCount,
      deadline_date: new Date(deadlineDate).toISOString(),
      created_at: this._now(),
      updated_at: this._now()
    };

    const teams = this._getFromStorage('company_teams');
    teams.push(team);
    this._saveToStorage('company_teams', teams);

    departments = departments || [];
    let depsAll = this._getFromStorage('team_departments');
    const createdDepartments = [];

    for (const d of departments) {
      const dep = {
        id: this._generateId('team_department'),
        team_id: team.id,
        name: d.name,
        goal_tree_count: typeof d.goal_tree_count === 'number' ? d.goal_tree_count : null,
        trees_planted: 0
      };
      depsAll.push(dep);
      createdDepartments.push(dep);
    }

    this._saveToStorage('team_departments', depsAll);

    return {
      success: true,
      team,
      departments: createdDepartments,
      message: 'Company team created.'
    };
  }

  // getCompanyTeamDetails(teamId)
  getCompanyTeamDetails(teamId) {
    const teams = this._getFromStorage('company_teams');
    const depsAll = this._getFromStorage('team_departments');

    const team = teams.find(t => t.id === teamId) || null;
    if (!team) {
      return {
        team: null,
        departments: [],
        progress: { total_trees_planted: 0, percent_complete: 0, trees_remaining: 0 },
        shareable_summary: ''
      };
    }

    const departments = depsAll.filter(d => d.team_id === teamId);
    const total_trees_planted = departments.reduce((sum, d) => sum + (d.trees_planted || 0), 0);
    const goal = team.goal_tree_count || 0;
    const percent_complete = goal > 0 ? (total_trees_planted / goal) * 100 : 0;
    const trees_remaining = goal > 0 ? Math.max(0, goal - total_trees_planted) : 0;

    const progress = { total_trees_planted, percent_complete, trees_remaining };

    const shareable_summary = `${team.company_name} – ${team.team_name} has pledged ${goal} trees and has planted ${total_trees_planted} so far.`;

    return {
      team,
      departments,
      progress,
      shareable_summary
    };
  }

  // getMyImpactOverview()
  getMyImpactOverview() {
    const savedProjects = this._getFromStorage('saved_projects');
    const projects = this._getFromStorage('projects');
    const savedArticles = this._getFromStorage('saved_articles');
    const articles = this._getFromStorage('articles');
    const savedEvents = this._getFromStorage('saved_events');
    const events = this._getFromStorage('volunteer_events');
    const donationOrders = this._getFromStorage('donation_orders');
    const donationOrderItems = this._getFromStorage('donation_order_items');

    const saved_projects = savedProjects.map(sp => ({
      saved: sp,
      project: projects.find(p => p.id === sp.project_id) || null
    }));

    const reading_list = savedArticles.map(sa => ({
      saved: sa,
      article: articles.find(a => a.id === sa.article_id) || null
    }));

    const my_events = savedEvents.map(se => ({
      saved: se,
      event: events.find(e => e.id === se.event_id) || null
    }));

    let total_trees_funded = 0;
    for (const item of donationOrderItems) {
      if (item.item_type === 'project_donation' || item.item_type === 'gift' || item.item_type === 'carbon_offset') {
        total_trees_funded += Number(item.number_of_trees) || 0;
      }
    }

    const total_donations_count = donationOrders.length;

    const now = new Date();
    let upcoming_events_count = 0;
    for (const se of savedEvents) {
      const ev = events.find(e => e.id === se.event_id);
      if (!ev) continue;
      const d = this._parseDate(ev.start_datetime);
      if (d && d >= now) upcoming_events_count += 1;
    }

    let last_activity_at = null;
    const timestamps = [];
    donationOrders.forEach(o => timestamps.push(o.completed_at || o.created_at));
    savedProjects.forEach(sp => timestamps.push(sp.added_at));
    savedArticles.forEach(sa => timestamps.push(sa.added_at));
    savedEvents.forEach(se => timestamps.push(se.added_at));
    timestamps.forEach(ts => {
      if (!ts) return;
      const d = this._parseDate(ts);
      if (!d) return;
      if (!last_activity_at || d > this._parseDate(last_activity_at)) {
        last_activity_at = d.toISOString();
      }
    });

    const stats = {
      total_trees_funded,
      total_donations_count,
      upcoming_events_count,
      last_activity_at
    };

    return {
      saved_projects,
      reading_list,
      my_events,
      stats
    };
  }

  // getAboutPageContent()
  getAboutPageContent() {
    return {
      mission: 'We restore forests and plant trees in partnership with local communities to tackle climate change, biodiversity loss, and urban heat.',
      history: 'Founded by environmental advocates and community organizers, our nonprofit has supported tree-planting initiatives across multiple continents.',
      programs: [
        {
          key: 'urban_trees',
          title: 'Urban Trees',
          description: 'Planting and caring for trees in cities to cool neighborhoods and improve public health.'
        },
        {
          key: 'rainforest',
          title: 'Rainforest Protection',
          description: 'Supporting community-led rainforest restoration and protection efforts.'
        },
        {
          key: 'mangrove_forests',
          title: 'Mangrove Restoration',
          description: 'Restoring coastal mangroves to protect shorelines and store blue carbon.'
        }
      ],
      impact_metrics: [
        { label: 'Trees planted', value: 0, unit: 'trees', description: 'Total trees planted to date (tracked via our projects and partners).' },
        { label: 'Countries', value: 0, unit: 'countries', description: 'Countries where we support tree-planting programs.' },
        { label: 'Volunteer events', value: 0, unit: 'events', description: 'Community events organized with local partners.' }
      ],
      leadership: [],
      partners: []
    };
  }

  // getContactPageContent()
  getContactPageContent() {
    return {
      contact_email: 'support@trees-example.org',
      mailing_address: '123 Forest Lane, Suite 100, Green City, Earth',
      phone: '+1 (555) 555-1234',
      inquiry_types: [
        { value: 'general', label: 'General inquiry', description: 'Questions about our work and programs.' },
        { value: 'donor_support', label: 'Donor support', description: 'Help with donations, receipts, or tax letters.' },
        { value: 'volunteer_support', label: 'Volunteer support', description: 'Questions about events and volunteering.' },
        { value: 'corporate_partnerships', label: 'Corporate partnerships', description: 'Explore company giving and team campaigns.' },
        { value: 'media', label: 'Media', description: 'Press and media inquiries.' }
      ],
      support_links: [
        { type: 'donor_support', label: 'Donor FAQ' },
        { type: 'volunteer_support', label: 'Volunteer FAQ' }
      ]
    };
  }

  // submitContactForm(name, email, inquiryType, message)
  submitContactForm(name, email, inquiryType, message) {
    const submissions = this._getFromStorage('contact_submissions');
    const entry = {
      id: this._generateId('contact_submission'),
      name,
      email,
      inquiry_type: inquiryType,
      message,
      submitted_at: this._now()
    };
    submissions.push(entry);
    this._saveToStorage('contact_submissions', submissions);

    return {
      success: true,
      message: 'Your message has been received. We will follow up as needed.'
    };
  }

  // subscribeToNewsletter(email, source)
  subscribeToNewsletter(email, source) {
    let subs = this._getFromStorage('newsletter_subscriptions');
    const existing = subs.find(s => s.email === email);
    if (existing) {
      return { success: true, message: 'This email is already subscribed.' };
    }

    const sub = {
      id: this._generateId('newsletter_subscription'),
      email,
      source: source || null,
      subscribed_at: this._now()
    };

    subs.push(sub);
    this._saveToStorage('newsletter_subscriptions', subs);

    return { success: true, message: 'Subscription successful.' };
  }
}

// Global export for browser & Node.js
if (typeof globalThis !== 'undefined') {
  globalThis.BusinessLogic = BusinessLogic;
  globalThis.WebsiteSDK = new BusinessLogic();
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = BusinessLogic;
}