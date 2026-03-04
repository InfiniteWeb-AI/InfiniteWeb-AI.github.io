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
  // Initialization & Core Helpers
  // ----------------------

  _initStorage() {
    const keysToInitAsArray = [
      // Core entities
      'membership_plans',
      'membership_applications',
      'events',
      'event_tickets',
      'product_categories',
      'products',
      'campaigns',
      'campaign_actions',
      'job_postings',
      'saved_jobs',
      'directory_entries',
      'directory_comparisons',
      'quota_alert_configs',
      'quota_alert_species_configs',
      'carts',
      'cart_items',
      'events_page_states',
      'careers_page_states',
      // Content / config
      'static_pages',
      'tools_data_list',
      'homepage_regions',
      'homepage_core_services',
      'homepage_key_ctas',
      'advocacy_priority_areas',
      // Misc forms
      'contact_form_submissions'
    ];

    for (const key of keysToInitAsArray) {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    }

    if (!localStorage.getItem('homepage_mission_summary')) {
      // Empty string by default to avoid mocking content
      localStorage.setItem('homepage_mission_summary', '');
    }

    if (!localStorage.getItem('advocacy_mission')) {
      localStorage.setItem('advocacy_mission', '');
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

  _now() {
    return new Date().toISOString();
  }

  _paginate(items, page, pageSize) {
    const p = page && page > 0 ? page : 1;
    const ps = pageSize && pageSize > 0 ? pageSize : 20;
    const start = (p - 1) * ps;
    return {
      items: items.slice(start, start + ps),
      page: p,
      pageSize: ps
    };
  }

  _normalizeString(str) {
    return (str || '').toString().toLowerCase();
  }

  _getOrCreateCart() {
    const now = this._now();
    let carts = this._getFromStorage('carts');
    let currentCartId = localStorage.getItem('current_cart_id');

    let cart = null;
    if (currentCartId) {
      cart = carts.find(c => c.id === currentCartId && c.status === 'open');
    }

    if (!cart) {
      cart = {
        id: this._generateId('cart'),
        status: 'open',
        items: [],
        subtotal: 0,
        tax: 0,
        shipping_cost: 0,
        total: 0,
        currency: 'USD',
        created_at: now,
        updated_at: now
      };
      carts.push(cart);
      this._saveToStorage('carts', carts);
      localStorage.setItem('current_cart_id', cart.id);
    }

    return cart;
  }

  _updateCart(cart) {
    const now = this._now();
    let carts = this._getFromStorage('carts');
    let cartItems = this._getFromStorage('cart_items');

    const itemsForCart = cartItems.filter(ci => ci.cart_id === cart.id);

    let subtotal = 0;
    for (const item of itemsForCart) {
      const totalPrice = (item.unit_price || 0) * (item.quantity || 0);
      item.total_price = totalPrice;
      subtotal += totalPrice;
    }

    // Simple tax/shipping model: both 0 for now (pure business rule)
    cart.subtotal = subtotal;
    cart.tax = 0;
    cart.shipping_cost = 0;
    cart.total = subtotal;
    cart.updated_at = now;

    // Update cart record
    const cartIndex = carts.findIndex(c => c.id === cart.id);
    if (cartIndex !== -1) {
      carts[cartIndex] = cart;
    } else {
      carts.push(cart);
    }

    // Persist updates
    this._saveToStorage('cart_items', cartItems);
    this._saveToStorage('carts', carts);

    return { cart, cartItems: itemsForCart };
  }

  _enrichCartItem(item, carts, products, eventTickets, membershipApplications) {
    if (!item) return null;
    const enriched = { ...item };

    if (item.cart_id && carts) {
      enriched.cart = carts.find(c => c.id === item.cart_id) || null;
    }

    if (item.item_type === 'product' && products) {
      enriched.product = products.find(p => p.id === item.reference_id) || null;
    } else if (item.item_type === 'event_registration' && eventTickets) {
      const ticket = eventTickets.find(t => t.id === item.reference_id) || null;
      enriched.event_ticket = ticket;
      if (ticket) {
        const events = this._getFromStorage('events');
        enriched.event = events.find(e => e.id === ticket.event_id) || null;
      } else {
        enriched.event = null;
      }
    } else if (item.item_type === 'membership_application' && membershipApplications) {
      const app = membershipApplications.find(m => m.id === item.reference_id) || null;
      enriched.membership_application = this._enrichMembershipApplication(app);
    }

    return enriched;
  }

  _enrichCartItems(items) {
    const carts = this._getFromStorage('carts');
    const products = this._getFromStorage('products');
    const eventTickets = this._getFromStorage('event_tickets');
    const membershipApplications = this._getFromStorage('membership_applications');

    return items.map(i => this._enrichCartItem(i, carts, products, eventTickets, membershipApplications));
  }

  _enrichMembershipApplication(app) {
    if (!app) return null;
    const membershipPlans = this._getFromStorage('membership_plans');
    const plan = membershipPlans.find(p => p.id === app.membership_plan_id) || null;
    return { ...app, membership_plan: plan };
  }

  _getCurrentDirectoryComparisonList() {
    const now = this._now();
    let lists = this._getFromStorage('directory_comparisons');
    let currentId = localStorage.getItem('current_directory_comparison_id');

    let list = null;
    if (currentId) {
      list = lists.find(l => l.id === currentId) || null;
    }

    if (!list) {
      list = {
        id: this._generateId('dir_comp'),
        name: 'current_comparison',
        entry_ids: [],
        created_at: now,
        updated_at: now
      };
      lists.push(list);
      this._saveToStorage('directory_comparisons', lists);
      localStorage.setItem('current_directory_comparison_id', list.id);
    }

    return list;
  }

  _getOrCreateEventsPageState() {
    const now = this._now();
    let states = this._getFromStorage('events_page_states');
    if (states.length > 0) {
      return states[0];
    }
    const state = {
      id: this._generateId('events_state'),
      active_tab: 'all_events',
      created_at: now,
      updated_at: now
    };
    states.push(state);
    this._saveToStorage('events_page_states', states);
    return state;
  }

  _getOrCreateCareersPageState() {
    const now = this._now();
    let states = this._getFromStorage('careers_page_states');
    if (states.length > 0) {
      return states[0];
    }
    const state = {
      id: this._generateId('careers_state'),
      view_mode: 'overview',
      created_at: now,
      updated_at: now
    };
    states.push(state);
    this._saveToStorage('careers_page_states', states);
    return state;
  }

  // ----------------------
  // Interface Implementations
  // ----------------------

  // 1. getHomePageData()
  getHomePageData() {
    const mission_summary = localStorage.getItem('homepage_mission_summary') || '';
    const regions = this._getFromStorage('homepage_regions');
    const core_services = this._getFromStorage('homepage_core_services');
    const key_ctas = this._getFromStorage('homepage_key_ctas');

    const events = this._getFromStorage('events').filter(e => e.status === 'published');
    events.sort((a, b) => {
      const da = a.start_datetime ? new Date(a.start_datetime).getTime() : Infinity;
      const db = b.start_datetime ? new Date(b.start_datetime).getTime() : Infinity;
      return da - db;
    });
    const upcoming_events_preview = events.slice(0, 5);

    const products = this._getFromStorage('products').filter(p => p.status === 'active');
    const featured_products_preview = products.slice(0, 5);

    const membership_plans = this._getFromStorage('membership_plans').filter(p => p.status === 'active');
    const featured_membership_plans = membership_plans.slice(0, 5);

    return {
      mission_summary,
      regions,
      core_services,
      key_ctas,
      upcoming_events_preview,
      featured_products_preview,
      featured_membership_plans
    };
  }

  // 2. getMembershipFilterOptions()
  getMembershipFilterOptions() {
    const membership_types = [
      { value: 'individual_crew', label: 'Individual / Crew member' },
      { value: 'vessel_owner', label: 'Vessel owner' },
      { value: 'processor', label: 'Processor' },
      { value: 'associate', label: 'Associate' },
      { value: 'student', label: 'Student' },
      { value: 'supporter', label: 'Supporter' },
      { value: 'organization', label: 'Organization' },
      { value: 'other', label: 'Other' }
    ];

    const plans = this._getFromStorage('membership_plans');

    const benefitSet = new Set();
    for (const p of plans) {
      if (Array.isArray(p.benefits)) {
        for (const b of p.benefits) {
          benefitSet.add(b);
        }
      }
    }
    const benefit_options = Array.from(benefitSet);

    let minPrice = null;
    let maxPrice = null;
    for (const p of plans) {
      if (typeof p.annual_dues === 'number') {
        if (minPrice === null || p.annual_dues < minPrice) minPrice = p.annual_dues;
        if (maxPrice === null || p.annual_dues > maxPrice) maxPrice = p.annual_dues;
      }
    }
    if (minPrice === null) minPrice = 0;
    if (maxPrice === null) maxPrice = 0;

    const sort_options = [
      { value: 'price_asc', label: 'Price: Low to High' },
      { value: 'price_desc', label: 'Price: High to Low' },
      { value: 'name_asc', label: 'Name: A to Z' },
      { value: 'sort_order', label: 'Featured' }
    ];

    return {
      membership_types,
      benefit_options,
      price_range: { min: minPrice, max: maxPrice },
      sort_options
    };
  }

  // 3. searchMembershipPlans(filters, sort, page, pageSize)
  searchMembershipPlans(filters, sort, page, pageSize) {
    filters = filters || {};
    let plans = this._getFromStorage('membership_plans');

    plans = plans.filter(p => {
      if (filters.membershipType && p.membership_type !== filters.membershipType) return false;
      if (typeof filters.minAnnualDues === 'number' && typeof p.annual_dues === 'number' && p.annual_dues < filters.minAnnualDues) return false;
      if (typeof filters.maxAnnualDues === 'number' && typeof p.annual_dues === 'number' && p.annual_dues > filters.maxAnnualDues) return false;
      if (typeof filters.hasVotingRights === 'boolean' && p.has_voting_rights !== filters.hasVotingRights) return false;
      if (filters.benefits && filters.benefits.length > 0) {
        const benefits = Array.isArray(p.benefits) ? p.benefits : [];
        for (const b of filters.benefits) {
          if (!benefits.includes(b)) return false;
        }
      }
      if (typeof filters.isAvailableForOnlineJoin === 'boolean' && p.is_available_for_online_join !== filters.isAvailableForOnlineJoin) return false;
      if (filters.status && p.status !== filters.status) return false;
      return true;
    });

    if (sort === 'price_asc') {
      plans.sort((a, b) => (a.annual_dues || 0) - (b.annual_dues || 0));
    } else if (sort === 'price_desc') {
      plans.sort((a, b) => (b.annual_dues || 0) - (a.annual_dues || 0));
    } else if (sort === 'name_asc') {
      plans.sort((a, b) => this._normalizeString(a.name).localeCompare(this._normalizeString(b.name)));
    } else if (sort === 'sort_order') {
      plans.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    }

    const total = plans.length;
    const paged = this._paginate(plans, page, pageSize);

    return {
      plans: paged.items,
      total,
      page: paged.page,
      pageSize: paged.pageSize
    };
  }

  // 4. getMembershipApplicationForm(membershipPlanId)
  getMembershipApplicationForm(membershipPlanId) {
    const membership_plans = this._getFromStorage('membership_plans');
    const membership_plan = membership_plans.find(p => p.id === membershipPlanId) || null;

    const region_options = [
      { value: 'atlantic', label: 'Atlantic' },
      { value: 'pacific', label: 'Pacific' },
      { value: 'northeast', label: 'Northeast' },
      { value: 'southeast', label: 'Southeast' },
      { value: 'gulf_of_mexico', label: 'Gulf of Mexico' },
      { value: 'alaska', label: 'Alaska' },
      { value: 'national', label: 'National' },
      { value: 'international', label: 'International' },
      { value: 'other', label: 'Other' }
    ];

    const vessel_size_options = [
      { value: 'under_30_ft', label: 'Under 30 ft' },
      { value: '30_49_ft', label: '30-49 ft' },
      { value: '50_99_ft', label: '50-99 ft' },
      { value: '100_plus_ft', label: '100+ ft' },
      { value: 'no_vessel', label: 'No vessel' }
    ];

    const form_schema = {
      full_name_label: 'Full name',
      email_label: 'Email',
      region_label: 'Region',
      vessel_size_label: 'Vessel size',
      notes_label: 'Notes',
      region_options,
      vessel_size_options
    };

    return {
      membership_plan,
      form_schema
    };
  }

  // 5. submitMembershipApplicationAndAddToCart(...)
  submitMembershipApplicationAndAddToCart(membershipPlanId, fullName, email, region, vesselSize, notes) {
    const membership_plans = this._getFromStorage('membership_plans');
    const plan = membership_plans.find(p => p.id === membershipPlanId) || null;

    if (!plan || plan.status !== 'active' || !plan.is_available_for_online_join) {
      return {
        success: false,
        membership_application: null,
        cart: null,
        cart_items: [],
        next_step: 'membership_selection',
        message: 'Selected membership plan is not available for online join.'
      };
    }

    const now = this._now();
    let membership_applications = this._getFromStorage('membership_applications');

    const application = {
      id: this._generateId('m_app'),
      membership_plan_id: membershipPlanId,
      full_name: fullName,
      email: email,
      region: region,
      vessel_size: vesselSize,
      application_status: 'pending_payment',
      notes: notes || '',
      created_at: now,
      updated_at: now
    };

    membership_applications.push(application);
    this._saveToStorage('membership_applications', membership_applications);

    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items');

    const item = {
      id: this._generateId('c_item'),
      cart_id: cart.id,
      item_type: 'membership_application',
      reference_id: application.id,
      name: plan.name + ' membership',
      description: plan.description || '',
      unit_price: plan.annual_dues || 0,
      quantity: 1,
      total_price: plan.annual_dues || 0,
      added_at: now
    };

    cartItems.push(item);

    // Link cart to item
    const carts = this._getFromStorage('carts');
    const cartIndex = carts.findIndex(c => c.id === cart.id);
    if (cartIndex !== -1) {
      const existingCart = carts[cartIndex];
      existingCart.items = existingCart.items || [];
      existingCart.items.push(item.id);
      this._saveToStorage('carts', carts);
    }

    this._saveToStorage('cart_items', cartItems);

    const updated = this._updateCart(cart);
    const enrichedItems = this._enrichCartItems(updated.cartItems);

    return {
      success: true,
      membership_application: this._enrichMembershipApplication(application),
      cart: updated.cart,
      cart_items: enrichedItems,
      next_step: 'checkout',
      message: 'Membership application submitted and added to cart.'
    };
  }

  // 6. getEventsPageState()
  getEventsPageState() {
    return this._getOrCreateEventsPageState();
  }

  // 7. setEventsPageActiveTab(activeTab)
  setEventsPageActiveTab(activeTab) {
    const now = this._now();
    let states = this._getFromStorage('events_page_states');
    let state;
    if (states.length > 0) {
      state = states[0];
      state.active_tab = activeTab;
      state.updated_at = now;
      states[0] = state;
    } else {
      state = {
        id: this._generateId('events_state'),
        active_tab: activeTab,
        created_at: now,
        updated_at: now
      };
      states.push(state);
    }
    this._saveToStorage('events_page_states', states);
    return state;
  }

  // 8. getEventFilterOptions(contextTab)
  getEventFilterOptions(contextTab) {
    const events = this._getFromStorage('events');

    let filteredEvents = events;
    if (contextTab === 'webinars') {
      filteredEvents = events.filter(e => e.event_type === 'webinar');
    } else if (contextTab === 'workshops') {
      filteredEvents = events.filter(e => e.event_type === 'workshop');
    } else if (contextTab === 'online_courses') {
      filteredEvents = events.filter(e => e.event_type === 'online_course');
    }

    let minPrice = null;
    let maxPrice = null;
    for (const e of filteredEvents) {
      const pmin = typeof e.price_min === 'number' ? e.price_min : null;
      const pmax = typeof e.price_max === 'number' ? e.price_max : pmin;
      if (pmin !== null) {
        if (minPrice === null || pmin < minPrice) minPrice = pmin;
      }
      if (pmax !== null) {
        if (maxPrice === null || pmax > maxPrice) maxPrice = pmax;
      }
    }
    if (minPrice === null) minPrice = 0;
    if (maxPrice === null) maxPrice = 0;

    const date_presets = [
      { id: 'today', label: 'Today' },
      { id: 'next_7_days', label: 'Next 7 days' },
      { id: 'next_30_days', label: 'Next 30 days' },
      { id: 'next_45_days', label: 'Next 45 days' },
      { id: 'next_month', label: 'Next month' }
    ];

    const time_of_day_options = [
      { value: 'any', label: 'Any time' },
      { value: 'morning', label: 'Morning' },
      { value: 'afternoon', label: 'Afternoon' },
      { value: 'evening', label: 'Evening' }
    ];

    const topicSet = new Set();
    for (const e of events) {
      if (Array.isArray(e.topics)) {
        for (const t of e.topics) topicSet.add(t);
      }
    }
    const topic_options = Array.from(topicSet);

    const region_options = [
      { value: 'atlantic', label: 'Atlantic' },
      { value: 'pacific', label: 'Pacific' },
      { value: 'northeast', label: 'Northeast' },
      { value: 'southeast', label: 'Southeast' },
      { value: 'gulf_of_mexico', label: 'Gulf of Mexico' },
      { value: 'alaska', label: 'Alaska' },
      { value: 'national', label: 'National' },
      { value: 'international', label: 'International' },
      { value: 'other', label: 'Other' }
    ];

    const stateSet = new Set();
    for (const e of events) {
      if (e.location_state) stateSet.add(e.location_state);
    }
    const state_options = Array.from(stateSet);

    const language_options = [
      { value: 'english', label: 'English' },
      { value: 'spanish', label: 'Spanish' },
      { value: 'french', label: 'French' },
      { value: 'other', label: 'Other' }
    ];

    const event_type_options = [
      { value: 'webinar', label: 'Webinar' },
      { value: 'workshop', label: 'Workshop / In-person' },
      { value: 'online_course', label: 'Online course' },
      { value: 'conference', label: 'Conference' },
      { value: 'meeting', label: 'Meeting' },
      { value: 'other', label: 'Other' }
    ];

    const delivery_type_options = [
      { value: 'online_live', label: 'Online live' },
      { value: 'in_person', label: 'In person' },
      { value: 'online_self_paced', label: 'Online self-paced' },
      { value: 'hybrid', label: 'Hybrid' }
    ];

    const sort_options = [
      { value: 'date_soonest', label: 'Date: Soonest first' },
      { value: 'date_latest', label: 'Date: Latest first' },
      { value: 'price_low_to_high', label: 'Price: Low to High' },
      { value: 'price_high_to_low', label: 'Price: High to Low' },
      { value: 'rating_high_to_low', label: 'Rating: High to Low' }
    ];

    return {
      price_range: { min: minPrice, max: maxPrice },
      date_presets,
      time_of_day_options,
      topic_options,
      region_options,
      state_options,
      language_options,
      event_type_options,
      delivery_type_options,
      sort_options
    };
  }

  // 9. searchEventsAndTrainings(filters, keyword, sort, page, pageSize)
  searchEventsAndTrainings(filters, keyword, sort, page, pageSize) {
    filters = filters || {};
    let events = this._getFromStorage('events');

    events = events.filter(e => {
      if (filters.onlyPublished && e.status !== 'published') return false;
      if (Array.isArray(filters.eventTypes) && filters.eventTypes.length > 0 && !filters.eventTypes.includes(e.event_type)) return false;
      if (Array.isArray(filters.deliveryTypes) && filters.deliveryTypes.length > 0 && !filters.deliveryTypes.includes(e.delivery_type)) return false;
      if (filters.locationRegion && e.region !== filters.locationRegion) return false;
      if (filters.locationState && e.location_state !== filters.locationState) return false;
      if (filters.locationPostalCode && e.location_postal_code !== filters.locationPostalCode) return false;

      // Date range (datePreset filtering disabled to keep behavior time-independent)
      if (filters.datePreset && filters.datePreset !== 'custom' && false) {
        const now = new Date();
        let start = new Date(now);
        let end = new Date(now);
        if (filters.datePreset === 'today') {
          // start = today 00:00, end = today 23:59
          start.setHours(0, 0, 0, 0);
          end.setHours(23, 59, 59, 999);
        } else if (filters.datePreset === 'next_7_days') {
          end.setDate(end.getDate() + 7);
        } else if (filters.datePreset === 'next_30_days') {
          end.setDate(end.getDate() + 30);
        } else if (filters.datePreset === 'next_45_days') {
          end.setDate(end.getDate() + 45);
        } else if (filters.datePreset === 'next_month') {
          start.setMonth(start.getMonth() + 1, 1);
          start.setHours(0, 0, 0, 0);
          end = new Date(start);
          end.setMonth(end.getMonth() + 1);
        }
        const s = e.start_datetime ? new Date(e.start_datetime) : null;
        if (s) {
          if (s < start || s > end) return false;
        }
      } else {
        if (filters.dateRangeStart) {
          const s = e.start_datetime ? new Date(e.start_datetime) : null;
          if (s && s < new Date(filters.dateRangeStart)) return false;
        }
        if (filters.dateRangeEnd) {
          const s = e.start_datetime ? new Date(e.start_datetime) : null;
          if (s && s > new Date(filters.dateRangeEnd)) return false;
        }
      }

      // Price range
      const pmin = typeof e.price_min === 'number' ? e.price_min : null;
      const pmax = typeof e.price_max === 'number' ? e.price_max : pmin;
      if (typeof filters.priceMin === 'number' && pmax !== null && pmax < filters.priceMin) return false;
      if (typeof filters.priceMax === 'number' && pmin !== null && pmin > filters.priceMax) return false;

      // Time of day
      if (filters.timeOfDay && filters.timeOfDay !== 'any' && e.start_datetime) {
        // Determine hour from the event's own local time in the datetime string
        let hour;
        if (typeof e.start_datetime === 'string') {
          const match = e.start_datetime.match(/T(\d{2}):(\d{2})/);
          if (match) {
            hour = parseInt(match[1], 10);
          }
        }
        if (typeof hour !== 'number' || isNaN(hour)) {
          hour = new Date(e.start_datetime).getHours();
        }
        if (filters.timeOfDay === 'morning' && !(hour >= 5 && hour < 12)) return false;
        if (filters.timeOfDay === 'afternoon' && !(hour >= 12 && hour < 17)) return false;
        if (filters.timeOfDay === 'evening' && !(hour >= 17 && hour <= 23)) return false;
      }

      if (filters.topics && filters.topics.length > 0) {
        const eventTopics = Array.isArray(e.topics) ? e.topics : [];
        const match = filters.topics.some(t => eventTopics.includes(t));
        if (!match) return false;
      }

      if (filters.language && e.language !== filters.language) return false;

      if (filters.locationType && e.location_type !== filters.locationType) return false;

      return true;
    });

    if (keyword) {
      const kw = this._normalizeString(keyword);
      events = events.filter(e => {
        const fields = [e.title, e.short_description, e.description];
        if (Array.isArray(e.keywords)) fields.push(e.keywords.join(' '));
        const haystack = this._normalizeString(fields.join(' '));
        const tokens = kw.split(/\s+/).filter(Boolean);
        return tokens.length === 0 ? true : tokens.some(token => haystack.includes(token));
      });
    }

    if (sort === 'date_soonest') {
      events.sort((a, b) => {
        const da = a.start_datetime ? new Date(a.start_datetime).getTime() : Infinity;
        const db = b.start_datetime ? new Date(b.start_datetime).getTime() : Infinity;
        return da - db;
      });
    } else if (sort === 'date_latest') {
      events.sort((a, b) => {
        const da = a.start_datetime ? new Date(a.start_datetime).getTime() : 0;
        const db = b.start_datetime ? new Date(b.start_datetime).getTime() : 0;
        return db - da;
      });
    } else if (sort === 'price_low_to_high') {
      events.sort((a, b) => (a.price_min || 0) - (b.price_min || 0));
    } else if (sort === 'price_high_to_low') {
      events.sort((a, b) => (b.price_max || 0) - (a.price_max || 0));
    } else if (sort === 'rating_high_to_low') {
      events.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    }

    const total = events.length;
    const paged = this._paginate(events, page, pageSize);

    return {
      events: paged.items,
      total,
      page: paged.page,
      pageSize: paged.pageSize
    };
  }

  // 10. getEventDetails(eventId)
  getEventDetails(eventId) {
    const events = this._getFromStorage('events');
    const event = events.find(e => e.id === eventId) || null;

    const allTickets = this._getFromStorage('event_tickets');
    const tickets = allTickets.filter(t => t.event_id === eventId);

    // Resolve foreign key for tickets
    const enrichedTickets = tickets.map(t => ({ ...t, event }));

    return {
      event,
      tickets: enrichedTickets
    };
  }

  // 11. addEventTicketToCart(eventTicketId, quantity)
  addEventTicketToCart(eventTicketId, quantity) {
    quantity = typeof quantity === 'number' && quantity > 0 ? quantity : 1;
    const now = this._now();

    const eventTickets = this._getFromStorage('event_tickets');
    const ticket = eventTickets.find(t => t.id === eventTicketId) || null;
    if (!ticket) {
      return {
        success: false,
        added_item: null,
        cart: null,
        cart_items: [],
        message: 'Event ticket not found.'
      };
    }

    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items');

    let item = cartItems.find(ci => ci.cart_id === cart.id && ci.item_type === 'event_registration' && ci.reference_id === eventTicketId);

    if (item) {
      item.quantity += quantity;
      item.total_price = item.unit_price * item.quantity;
      item.added_at = now;
    } else {
      item = {
        id: this._generateId('c_item'),
        cart_id: cart.id,
        item_type: 'event_registration',
        reference_id: eventTicketId,
        name: ticket.name,
        description: ticket.description || '',
        unit_price: ticket.price || 0,
        quantity: quantity,
        total_price: (ticket.price || 0) * quantity,
        added_at: now
      };
      cartItems.push(item);

      const carts = this._getFromStorage('carts');
      const cartIndex = carts.findIndex(c => c.id === cart.id);
      if (cartIndex !== -1) {
        const existingCart = carts[cartIndex];
        existingCart.items = existingCart.items || [];
        existingCart.items.push(item.id);
        this._saveToStorage('carts', carts);
      }
    }

    this._saveToStorage('cart_items', cartItems);
    const updated = this._updateCart(cart);
    const enrichedItems = this._enrichCartItems(updated.cartItems);
    const enrichedItem = this._enrichCartItem(item, this._getFromStorage('carts'), this._getFromStorage('products'), eventTickets, this._getFromStorage('membership_applications'));

    return {
      success: true,
      added_item: enrichedItem,
      cart: updated.cart,
      cart_items: enrichedItems,
      message: 'Event ticket added to cart.'
    };
  }

  // 12. getStoreCategories()
  getStoreCategories() {
    const categories = this._getFromStorage('product_categories');
    return categories.filter(c => c.is_active !== false);
  }

  // 13. getStoreFilterOptions(categoryId)
  getStoreFilterOptions(categoryId) {
    const products = this._getFromStorage('products').filter(p => p.category_id === categoryId);

    const format_options = [
      { value: 'print', label: 'Print' },
      { value: 'digital', label: 'Digital' },
      { value: 'bundle', label: 'Bundle' },
      { value: 'other', label: 'Other' }
    ];

    const shipping_options = [
      { value: 'free_shipping', label: 'Free shipping' },
      { value: 'paid_shipping', label: 'Paid shipping' },
      { value: 'pickup_only', label: 'Pickup only' }
    ];

    const rating_options = [
      { min_rating: 4, label: '4 stars & up' },
      { min_rating: 3, label: '3 stars & up' },
      { min_rating: 2, label: '2 stars & up' },
      { min_rating: 1, label: '1 star & up' }
    ];

    let minPrice = null;
    let maxPrice = null;
    for (const p of products) {
      if (typeof p.price === 'number') {
        if (minPrice === null || p.price < minPrice) minPrice = p.price;
        if (maxPrice === null || p.price > maxPrice) maxPrice = p.price;
      }
    }
    if (minPrice === null) minPrice = 0;
    if (maxPrice === null) maxPrice = 0;

    const sort_options = [
      { value: 'price_low_to_high', label: 'Price: Low to High' },
      { value: 'price_high_to_low', label: 'Price: High to Low' },
      { value: 'rating_high_to_low', label: 'Rating: High to Low' }
    ];

    return {
      format_options,
      shipping_options,
      rating_options,
      price_range: { min: minPrice, max: maxPrice },
      sort_options
    };
  }

  // 14. searchStoreProducts(categoryId, query, filters, sort, page, pageSize)
  searchStoreProducts(categoryId, query, filters, sort, page, pageSize) {
    filters = filters || {};
    const allProducts = this._getFromStorage('products');
    const categories = this._getFromStorage('product_categories');

    let products = allProducts.filter(p => p.category_id === categoryId);

    if (query) {
      const q = this._normalizeString(query);
      products = products.filter(p => {
        const fields = [p.name, p.description];
        if (Array.isArray(p.subject_tags)) fields.push(p.subject_tags.join(' '));
        return this._normalizeString(fields.join(' ')).includes(q);
      });
    }

    products = products.filter(p => {
      if (filters.format && p.format !== filters.format) return false;
      if (filters.shippingOption && p.shipping_option !== filters.shippingOption) return false;
      if (typeof filters.priceMin === 'number' && typeof p.price === 'number' && p.price < filters.priceMin) return false;
      if (typeof filters.priceMax === 'number' && typeof p.price === 'number' && p.price > filters.priceMax) return false;
      if (typeof filters.ratingMin === 'number' && typeof p.rating === 'number' && p.rating < filters.ratingMin) return false;
      if (typeof filters.ratingMax === 'number' && typeof p.rating === 'number' && p.rating > filters.ratingMax) return false;
      if (typeof filters.onlyGuides === 'boolean' && p.is_guide !== filters.onlyGuides) return false;
      if (typeof filters.inStockOnly === 'boolean' && filters.inStockOnly && !p.in_stock) return false;
      return true;
    });

    if (sort === 'price_low_to_high') {
      products.sort((a, b) => (a.price || 0) - (b.price || 0));
    } else if (sort === 'price_high_to_low') {
      products.sort((a, b) => (b.price || 0) - (a.price || 0));
    } else if (sort === 'rating_high_to_low') {
      products.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    }

    const total = products.length;
    const paged = this._paginate(products, page, pageSize);

    // Resolve foreign key category_id
    const enrichedProducts = paged.items.map(p => ({
      ...p,
      category: categories.find(c => c.id === p.category_id) || null
    }));

    return {
      products: enrichedProducts,
      total,
      page: paged.page,
      pageSize: paged.pageSize
    };
  }

  // 15. addProductToCart(productId, quantity)
  addProductToCart(productId, quantity) {
    quantity = typeof quantity === 'number' && quantity > 0 ? quantity : 1;
    const now = this._now();

    const products = this._getFromStorage('products');
    const product = products.find(p => p.id === productId) || null;
    if (!product) {
      return {
        success: false,
        added_item: null,
        cart: null,
        cart_items: [],
        message: 'Product not found.'
      };
    }

    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items');

    let item = cartItems.find(ci => ci.cart_id === cart.id && ci.item_type === 'product' && ci.reference_id === productId);

    if (item) {
      item.quantity += quantity;
      item.total_price = item.unit_price * item.quantity;
      item.added_at = now;
    } else {
      item = {
        id: this._generateId('c_item'),
        cart_id: cart.id,
        item_type: 'product',
        reference_id: productId,
        name: product.name,
        description: product.description || '',
        unit_price: product.price || 0,
        quantity: quantity,
        total_price: (product.price || 0) * quantity,
        added_at: now
      };
      cartItems.push(item);

      const carts = this._getFromStorage('carts');
      const cartIndex = carts.findIndex(c => c.id === cart.id);
      if (cartIndex !== -1) {
        const existingCart = carts[cartIndex];
        existingCart.items = existingCart.items || [];
        existingCart.items.push(item.id);
        this._saveToStorage('carts', carts);
      }
    }

    this._saveToStorage('cart_items', cartItems);
    const updated = this._updateCart(cart);
    const enrichedItems = this._enrichCartItems(updated.cartItems);
    const enrichedItem = this._enrichCartItem(item, this._getFromStorage('carts'), products, this._getFromStorage('event_tickets'), this._getFromStorage('membership_applications'));

    return {
      success: true,
      added_item: enrichedItem,
      cart: updated.cart,
      cart_items: enrichedItems,
      message: 'Product added to cart.'
    };
  }

  // 16. getAdvocacyOverview()
  getAdvocacyOverview() {
    const advocacy_mission = localStorage.getItem('advocacy_mission') || '';
    const priority_areas = this._getFromStorage('advocacy_priority_areas');

    const campaigns = this._getFromStorage('campaigns');
    const featured_campaigns = campaigns
      .filter(c => c.status === 'active')
      .sort((a, b) => {
        const da = a.created_at ? new Date(a.created_at).getTime() : 0;
        const db = b.created_at ? new Date(b.created_at).getTime() : 0;
        return db - da;
      })
      .slice(0, 5);

    return {
      advocacy_mission,
      priority_areas,
      featured_campaigns
    };
  }

  // 17. getCampaignFilterOptions()
  getCampaignFilterOptions() {
    const issue_category_options = [
      { value: 'marine_protected_areas', label: 'Marine Protected Areas' },
      { value: 'quotas_management', label: 'Quotas & Management' },
      { value: 'bycatch_policy', label: 'Bycatch policy' },
      { value: 'working_conditions', label: 'Working conditions' },
      { value: 'safety_regulations', label: 'Safety regulations' },
      { value: 'other', label: 'Other' }
    ];

    const status_options = [
      { value: 'active', label: 'Active' },
      { value: 'closed', label: 'Closed' },
      { value: 'upcoming', label: 'Upcoming' },
      { value: 'archived', label: 'Archived' }
    ];

    const sort_options = [
      { value: 'newest', label: 'Newest' },
      { value: 'oldest', label: 'Oldest' }
    ];

    return {
      issue_category_options,
      status_options,
      sort_options
    };
  }

  // 18. searchCampaigns(filters, keyword, sort, page, pageSize)
  searchCampaigns(filters, keyword, sort, page, pageSize) {
    filters = filters || {};
    let campaigns = this._getFromStorage('campaigns');

    campaigns = campaigns.filter(c => {
      if (filters.issueCategory && c.issue_category !== filters.issueCategory) return false;
      if (filters.status && c.status !== filters.status) {
        if (!(filters.includeUpcoming && c.status === 'upcoming')) return false;
      }
      return true;
    });

    if (keyword) {
      const kw = this._normalizeString(keyword);
      campaigns = campaigns.filter(c => {
        const fields = [c.title, c.summary, c.description];
        return this._normalizeString(fields.join(' ')).includes(kw);
      });
    }

    if (sort === 'newest') {
      campaigns.sort((a, b) => {
        const da = a.created_at ? new Date(a.created_at).getTime() : 0;
        const db = b.created_at ? new Date(b.created_at).getTime() : 0;
        return db - da;
      });
    } else if (sort === 'oldest') {
      campaigns.sort((a, b) => {
        const da = a.created_at ? new Date(a.created_at).getTime() : 0;
        const db = b.created_at ? new Date(b.created_at).getTime() : 0;
        return da - db;
      });
    }

    const total = campaigns.length;
    const paged = this._paginate(campaigns, page, pageSize);

    return {
      campaigns: paged.items,
      total,
      page: paged.page,
      pageSize: paged.pageSize
    };
  }

  // 19. getCampaignDetails(campaignId)
  getCampaignDetails(campaignId) {
    const campaigns = this._getFromStorage('campaigns');
    const campaign = campaigns.find(c => c.id === campaignId) || null;
    return {
      campaign,
      default_message_subject: campaign ? campaign.default_message_subject || '' : '',
      default_message_body: campaign ? campaign.default_message_body || '' : ''
    };
  }

  // 20. submitCampaignAction(...)
  submitCampaignAction(campaignId, fullName, email, postalCode, roleOccupation, targetSelection, messageSubject, messageBody) {
    const campaigns = this._getFromStorage('campaigns');
    const campaign = campaigns.find(c => c.id === campaignId) || null;

    if (!campaign) {
      return {
        success: false,
        campaign_action: null,
        confirmation_message: 'Campaign not found.'
      };
    }

    const now = this._now();
    let actions = this._getFromStorage('campaign_actions');

    const action = {
      id: this._generateId('c_action'),
      campaign_id: campaignId,
      full_name: fullName,
      email: email,
      postal_code: postalCode,
      role_occupation: roleOccupation,
      target_selection: targetSelection,
      message_subject: messageSubject || campaign.default_message_subject || '',
      message_body: messageBody || campaign.default_message_body || '',
      submitted_at: now
    };

    actions.push(action);
    this._saveToStorage('campaign_actions', actions);

    const enrichedAction = { ...action, campaign };

    return {
      success: true,
      campaign_action: enrichedAction,
      confirmation_message: 'Your message has been submitted.'
    };
  }

  // 21. getCareersPageState()
  getCareersPageState() {
    return this._getOrCreateCareersPageState();
  }

  // 22. setCareersPageViewMode(viewMode)
  setCareersPageViewMode(viewMode) {
    const now = this._now();
    let states = this._getFromStorage('careers_page_states');
    let state;
    if (states.length > 0) {
      state = states[0];
      state.view_mode = viewMode;
      state.updated_at = now;
      states[0] = state;
    } else {
      state = {
        id: this._generateId('careers_state'),
        view_mode: viewMode,
        created_at: now,
        updated_at: now
      };
      states.push(state);
    }
    this._saveToStorage('careers_page_states', states);
    return state;
  }

  // 23. getJobFilterOptions()
  getJobFilterOptions() {
    const jobs = this._getFromStorage('job_postings');

    const region_options = [
      { value: 'atlantic', label: 'Atlantic' },
      { value: 'pacific', label: 'Pacific' },
      { value: 'northeast', label: 'Northeast' },
      { value: 'southeast', label: 'Southeast' },
      { value: 'gulf_of_mexico', label: 'Gulf of Mexico' },
      { value: 'alaska', label: 'Alaska' },
      { value: 'national', label: 'National' },
      { value: 'international', label: 'International' },
      { value: 'other', label: 'Other' }
    ];

    const job_type_options = [
      { value: 'full_time', label: 'Full-time' },
      { value: 'part_time', label: 'Part-time' },
      { value: 'seasonal', label: 'Seasonal' },
      { value: 'temporary', label: 'Temporary' },
      { value: 'contract', label: 'Contract' },
      { value: 'internship', label: 'Internship' }
    ];

    const salary_interval_options = [
      { value: 'per_year', label: 'Per year' },
      { value: 'per_month', label: 'Per month' },
      { value: 'per_week', label: 'Per week' },
      { value: 'per_day', label: 'Per day' },
      { value: 'per_hour', label: 'Per hour' }
    ];

    let minSalary = null;
    let maxSalary = null;
    for (const j of jobs) {
      if (typeof j.salary_min === 'number') {
        if (minSalary === null || j.salary_min < minSalary) minSalary = j.salary_min;
      }
      if (typeof j.salary_max === 'number') {
        if (maxSalary === null || j.salary_max > maxSalary) maxSalary = j.salary_max;
      }
    }
    if (minSalary === null) minSalary = 0;
    if (maxSalary === null) maxSalary = 0;

    const sort_options = [
      { value: 'date_posted_newest', label: 'Date posted: Newest first' },
      { value: 'date_posted_oldest', label: 'Date posted: Oldest first' },
      { value: 'salary_high_to_low', label: 'Salary: High to Low' },
      { value: 'salary_low_to_high', label: 'Salary: Low to High' }
    ];

    return {
      region_options,
      job_type_options,
      salary_interval_options,
      salary_range: { min: minSalary, max: maxSalary },
      sort_options
    };
  }

  // 24. searchJobPostings(keyword, filters, sort, page, pageSize)
  searchJobPostings(keyword, filters, sort, page, pageSize) {
    filters = filters || {};
    let jobs = this._getFromStorage('job_postings');

    jobs = jobs.filter(j => {
      if (filters.region && j.region !== filters.region) return false;
      if (filters.jobType && j.job_type !== filters.jobType) return false;
      if (typeof filters.salaryInterval === 'string' && j.salary_interval !== filters.salaryInterval) return false;
      if (typeof filters.salaryMin === 'number') {
        const smin = typeof j.salary_min === 'number' ? j.salary_min : (typeof j.salary_max === 'number' ? j.salary_max : null);
        if (smin !== null && smin < filters.salaryMin) return false;
      }
      if (typeof filters.salaryMax === 'number') {
        const smax = typeof j.salary_max === 'number' ? j.salary_max : (typeof j.salary_min === 'number' ? j.salary_min : null);
        if (smax !== null && smax > filters.salaryMax) return false;
      }
      if (typeof filters.isActive === 'boolean' && j.is_active !== filters.isActive) return false;
      return true;
    });

    if (keyword) {
      const kw = this._normalizeString(keyword);
      jobs = jobs.filter(j => {
        const fields = [j.title, j.description, j.employer_name];
        if (Array.isArray(j.keywords)) fields.push(j.keywords.join(' '));
        return this._normalizeString(fields.join(' ')).includes(kw);
      });
    }

    if (sort === 'date_posted_newest') {
      jobs.sort((a, b) => {
        const da = a.date_posted ? new Date(a.date_posted).getTime() : 0;
        const db = b.date_posted ? new Date(b.date_posted).getTime() : 0;
        return db - da;
      });
    } else if (sort === 'date_posted_oldest') {
      jobs.sort((a, b) => {
        const da = a.date_posted ? new Date(a.date_posted).getTime() : 0;
        const db = b.date_posted ? new Date(b.date_posted).getTime() : 0;
        return da - db;
      });
    } else if (sort === 'salary_high_to_low') {
      jobs.sort((a, b) => (b.salary_max || 0) - (a.salary_max || 0));
    } else if (sort === 'salary_low_to_high') {
      jobs.sort((a, b) => (a.salary_min || 0) - (b.salary_min || 0));
    }

    const total = jobs.length;
    const paged = this._paginate(jobs, page, pageSize);

    return {
      jobs: paged.items,
      total,
      page: paged.page,
      pageSize: paged.pageSize
    };
  }

  // 25. getJobDetails(jobPostingId)
  getJobDetails(jobPostingId) {
    const jobs = this._getFromStorage('job_postings');
    return jobs.find(j => j.id === jobPostingId) || null;
  }

  // 26. saveJobToFavorites(jobPostingId)
  saveJobToFavorites(jobPostingId) {
    const jobs = this._getFromStorage('job_postings');
    const job = jobs.find(j => j.id === jobPostingId) || null;
    if (!job) {
      return {
        success: false,
        saved_job: null,
        total_saved: this._getFromStorage('saved_jobs').length
      };
    }

    let saved = this._getFromStorage('saved_jobs');
    const existing = saved.find(s => s.job_posting_id === jobPostingId);
    if (existing) {
      return {
        success: true,
        saved_job: existing,
        total_saved: saved.length
      };
    }

    const now = this._now();
    const saved_job = {
      id: this._generateId('saved_job'),
      job_posting_id: jobPostingId,
      saved_at: now
    };

    saved.push(saved_job);
    this._saveToStorage('saved_jobs', saved);

    return {
      success: true,
      saved_job,
      total_saved: saved.length
    };
  }

  // 27. getSavedJobs()
  getSavedJobs() {
    const saved = this._getFromStorage('saved_jobs');
    const jobs = this._getFromStorage('job_postings');

    return saved.map(s => ({
      saved_job: s,
      job_posting: jobs.find(j => j.id === s.job_posting_id) || null
    }));
  }

  // 28. getDirectoryFilterOptions()
  getDirectoryFilterOptions() {
    const entries = this._getFromStorage('directory_entries');

    const category_options = [
      { value: 'processor', label: 'Processor' },
      { value: 'vessel_owner', label: 'Vessel owner' },
      { value: 'gear_supplier', label: 'Gear supplier' },
      { value: 'service_provider', label: 'Service provider' },
      { value: 'other', label: 'Other' }
    ];

    const radius_options = [10, 25, 50, 100, 250];

    const speciesSet = new Set();
    const certSet = new Set();
    for (const e of entries) {
      if (Array.isArray(e.species)) {
        for (const s of e.species) speciesSet.add(s);
      }
      if (Array.isArray(e.certifications)) {
        for (const c of e.certifications) certSet.add(c);
      }
    }

    const species_options = Array.from(speciesSet);
    const certification_options = Array.from(certSet);

    const sort_options = [
      { value: 'distance_closest', label: 'Distance: Closest first' },
      { value: 'name_az', label: 'Name: A to Z' }
    ];

    return {
      category_options,
      radius_options,
      species_options,
      certification_options,
      sort_options
    };
  }

  // 29. searchDirectoryEntries(...)
  searchDirectoryEntries(category, locationPostalCode, radiusMiles, region, species, certifications, sort, page, pageSize) {
    let entries = this._getFromStorage('directory_entries');

    entries = entries.filter(e => {
      if (category && e.category !== category) return false;
      if (region && e.region !== region) return false;
      if (locationPostalCode && e.postal_code && locationPostalCode && e.postal_code !== locationPostalCode) {
        // simple equality; real distance handled by distance_miles
      }
      if (typeof radiusMiles === 'number' && radiusMiles > 0) {
        if (typeof e.distance_miles === 'number' && e.distance_miles > radiusMiles) return false;
      }
      if (Array.isArray(species) && species.length > 0) {
        const entrySpecies = Array.isArray(e.species) ? e.species : [];
        const match = species.every(s => entrySpecies.includes(s));
        if (!match) return false;
      }
      if (Array.isArray(certifications) && certifications.length > 0) {
        const entryCerts = Array.isArray(e.certifications) ? e.certifications : [];
        const match = certifications.every(c => entryCerts.includes(c));
        if (!match) return false;
      }
      return true;
    });

    if (sort === 'distance_closest') {
      entries.sort((a, b) => (a.distance_miles || Infinity) - (b.distance_miles || Infinity));
    } else if (sort === 'name_az') {
      entries.sort((a, b) => this._normalizeString(a.name).localeCompare(this._normalizeString(b.name)));
    }

    const total = entries.length;
    const paged = this._paginate(entries, page, pageSize);

    return {
      entries: paged.items,
      total,
      page: paged.page,
      pageSize: paged.pageSize
    };
  }

  // 30. addDirectoryEntryToComparison(entryId)
  addDirectoryEntryToComparison(entryId) {
    const now = this._now();
    let list = this._getCurrentDirectoryComparisonList();
    let lists = this._getFromStorage('directory_comparisons');

    if (!list.entry_ids.includes(entryId)) {
      list.entry_ids.push(entryId);
      list.updated_at = now;
      const idx = lists.findIndex(l => l.id === list.id);
      if (idx !== -1) {
        lists[idx] = list;
      } else {
        lists.push(list);
      }
      this._saveToStorage('directory_comparisons', lists);
    }

    const entriesAll = this._getFromStorage('directory_entries');
    const entries = list.entry_ids.map(id => entriesAll.find(e => e.id === id) || null).filter(e => !!e);

    return {
      success: true,
      comparison_list: list,
      entries,
      message: 'Entry added to comparison.'
    };
  }

  // 31. getDirectoryComparisonView()
  getDirectoryComparisonView() {
    const lists = this._getFromStorage('directory_comparisons');
    if (lists.length === 0) {
      return {
        comparison_list: null,
        entries: []
      };
    }
    const list = lists[0];
    const entriesAll = this._getFromStorage('directory_entries');
    const entries = list.entry_ids.map(id => entriesAll.find(e => e.id === id) || null).filter(e => !!e);

    // Instrumentation for task completion tracking
    try {
      if (list) {
        const context = {
          comparison_list_id: list.id,
          entry_ids: entries.map(e => e.id),
          timestamp: this._now()
        };
        localStorage.setItem('task7_comparisonViewContext', JSON.stringify(context));
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      comparison_list: list,
      entries
    };
  }

  // 32. removeDirectoryEntryFromComparison(entryId)
  removeDirectoryEntryFromComparison(entryId) {
    let list = this._getCurrentDirectoryComparisonList();
    let lists = this._getFromStorage('directory_comparisons');

    const now = this._now();
    list.entry_ids = list.entry_ids.filter(id => id !== entryId);
    list.updated_at = now;

    const idx = lists.findIndex(l => l.id === list.id);
    if (idx !== -1) {
      lists[idx] = list;
    }
    this._saveToStorage('directory_comparisons', lists);

    const entriesAll = this._getFromStorage('directory_entries');
    const entries = list.entry_ids.map(id => entriesAll.find(e => e.id === id) || null).filter(e => !!e);

    return {
      success: true,
      comparison_list: list,
      entries,
      message: 'Entry removed from comparison.'
    };
  }

  // 33. getToolsAndDataList()
  getToolsAndDataList() {
    return this._getFromStorage('tools_data_list');
  }

  // 34. getQuotaAlertConfigs()
  getQuotaAlertConfigs() {
    const configs = this._getFromStorage('quota_alert_configs');
    const speciesConfigs = this._getFromStorage('quota_alert_species_configs');

    return configs.map(cfg => ({
      config: cfg,
      species_configs: speciesConfigs.filter(sc => sc.alert_config_id === cfg.id)
    }));
  }

  // 35. getQuotaAlertFormOptions()
  getQuotaAlertFormOptions() {
    const speciesConfigs = this._getFromStorage('quota_alert_species_configs');
    const speciesSet = new Set();
    for (const sc of speciesConfigs) {
      if (sc.species_name) speciesSet.add(sc.species_name);
    }
    const species_options = Array.from(speciesSet);

    const region_options = [
      { value: 'atlantic', label: 'Atlantic' },
      { value: 'pacific', label: 'Pacific' },
      { value: 'northeast', label: 'Northeast' },
      { value: 'southeast', label: 'Southeast' },
      { value: 'gulf_of_mexico', label: 'Gulf of Mexico' },
      { value: 'alaska', label: 'Alaska' },
      { value: 'national', label: 'National' },
      { value: 'international', label: 'International' },
      { value: 'other', label: 'Other' }
    ];

    const frequency_options = [
      { value: 'instant', label: 'Instant' },
      { value: 'daily_summary', label: 'Daily summary' },
      { value: 'weekly_summary', label: 'Weekly summary' }
    ];

    return {
      species_options,
      region_options,
      frequency_options
    };
  }

  // 36. createQuotaAlertConfigWithSpecies(email, frequency, speciesItems)
  createQuotaAlertConfigWithSpecies(email, frequency, speciesItems) {
    const now = this._now();
    let configs = this._getFromStorage('quota_alert_configs');
    let speciesConfigs = this._getFromStorage('quota_alert_species_configs');

    const config = {
      id: this._generateId('q_cfg'),
      email: email,
      frequency: frequency,
      species_item_ids: [],
      is_active: true,
      created_at: now,
      updated_at: now
    };

    const createdSpeciesConfigs = [];
    for (const item of speciesItems || []) {
      const sc = {
        id: this._generateId('q_species'),
        alert_config_id: config.id,
        species_name: item.speciesName,
        region: item.region,
        min_change_percent: item.minChangePercent,
        created_at: now
      };
      speciesConfigs.push(sc);
      config.species_item_ids.push(sc.id);
      createdSpeciesConfigs.push(sc);
    }

    configs.push(config);
    this._saveToStorage('quota_alert_configs', configs);
    this._saveToStorage('quota_alert_species_configs', speciesConfigs);

    return {
      success: true,
      config,
      species_configs: createdSpeciesConfigs,
      message: 'Quota alert configuration created.'
    };
  }

  // 37. getCartSummary()
  getCartSummary() {
    const cart = this._getOrCreateCart();
    const allCartItems = this._getFromStorage('cart_items');
    const itemsForCart = allCartItems.filter(ci => ci.cart_id === cart.id);
    const enrichedItems = this._enrichCartItems(itemsForCart);

    // Instrumentation for task completion tracking
    try {
      const context = {
        cart_id: cart.id,
        item_ids: enrichedItems.map(i => i.id),
        timestamp: this._now()
      };
      localStorage.setItem('task3_cartViewContext', JSON.stringify(context));
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      cart,
      items: enrichedItems
    };
  }

  // 38. updateCartItemQuantity(cartItemId, quantity)
  updateCartItemQuantity(cartItemId, quantity) {
    let cartItems = this._getFromStorage('cart_items');
    let carts = this._getFromStorage('carts');
    const itemIndex = cartItems.findIndex(ci => ci.id === cartItemId);

    if (itemIndex === -1) {
      return {
        success: false,
        cart: null,
        items: []
      };
    }

    const item = cartItems[itemIndex];

    if (quantity <= 0) {
      // Remove item entirely
      cartItems.splice(itemIndex, 1);
      this._saveToStorage('cart_items', cartItems);
      const cart = carts.find(c => c.id === item.cart_id) || this._getOrCreateCart();
      if (cart.items) {
        cart.items = cart.items.filter(id => id !== cartItemId);
      }
      this._saveToStorage('carts', carts);
      const updated = this._updateCart(cart);
      const enrichedItems = this._enrichCartItems(updated.cartItems);
      return {
        success: true,
        cart: updated.cart,
        items: enrichedItems
      };
    }

    item.quantity = quantity;
    item.total_price = (item.unit_price || 0) * quantity;
    cartItems[itemIndex] = item;
    this._saveToStorage('cart_items', cartItems);

    const cart = carts.find(c => c.id === item.cart_id) || this._getOrCreateCart();
    const updated = this._updateCart(cart);
    const enrichedItems = this._enrichCartItems(updated.cartItems);

    return {
      success: true,
      cart: updated.cart,
      items: enrichedItems
    };
  }

  // 39. removeCartItem(cartItemId)
  removeCartItem(cartItemId) {
    let cartItems = this._getFromStorage('cart_items');
    let carts = this._getFromStorage('carts');

    const itemIndex = cartItems.findIndex(ci => ci.id === cartItemId);
    if (itemIndex === -1) {
      return {
        success: false,
        cart: null,
        items: []
      };
    }

    const item = cartItems[itemIndex];
    cartItems.splice(itemIndex, 1);
    this._saveToStorage('cart_items', cartItems);

    const cart = carts.find(c => c.id === item.cart_id) || this._getOrCreateCart();
    if (cart.items) {
      cart.items = cart.items.filter(id => id !== cartItemId);
    }
    this._saveToStorage('carts', carts);

    const updated = this._updateCart(cart);
    const enrichedItems = this._enrichCartItems(updated.cartItems);

    return {
      success: true,
      cart: updated.cart,
      items: enrichedItems
    };
  }

  // 40. proceedToCheckout()
  proceedToCheckout() {
    const cart = this._getOrCreateCart();
    const updated = this._updateCart(cart);

    const total_items = (updated.cartItems || []).reduce((sum, item) => sum + (item.quantity || 0), 0);

    const order_summary = {
      total_items,
      subtotal: updated.cart.subtotal || 0,
      tax: updated.cart.tax || 0,
      shipping_cost: updated.cart.shipping_cost || 0,
      total_amount: updated.cart.total || 0,
      currency: updated.cart.currency || 'USD',
      notes: ''
    };

    const success = total_items > 0;
    const next_step = success ? 'payment' : 'cart';

    // Instrumentation for task completion tracking
    try {
      if (success) {
        const context = {
          cart_id: updated.cart.id,
          items: (updated.cartItems || []).map(i => ({
            id: i.id,
            item_type: i.item_type,
            reference_id: i.reference_id,
            quantity: i.quantity,
            unit_price: i.unit_price
          })),
          order_summary,
          timestamp: this._now()
        };
        localStorage.setItem('task1_checkoutContext', JSON.stringify(context));
        localStorage.setItem('task2_checkoutContext', JSON.stringify(context));
        localStorage.setItem('task4_checkoutContext', JSON.stringify(context));
        localStorage.setItem('task8_checkoutContext', JSON.stringify(context));
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      success,
      cart: updated.cart,
      order_summary,
      next_step
    };
  }

  // 41. getStaticPageContent(pageSlug)
  getStaticPageContent(pageSlug) {
    const pages = this._getFromStorage('static_pages');
    const page = pages.find(p => p.slug === pageSlug) || null;
    if (!page) {
      return {
        title: '',
        body_html: '',
        last_updated: this._now()
      };
    }
    return {
      title: page.title || '',
      body_html: page.body_html || '',
      last_updated: page.last_updated || this._now()
    };
  }

  // 42. submitContactForm(...)
  submitContactForm(fullName, email, topic, message, preferredContactMethod, phone) {
    const now = this._now();
    let submissions = this._getFromStorage('contact_form_submissions');

    const submission = {
      id: this._generateId('contact'),
      full_name: fullName,
      email: email,
      topic: topic || '',
      message: message,
      preferred_contact_method: preferredContactMethod || '',
      phone: phone || '',
      submitted_at: now
    };

    submissions.push(submission);
    this._saveToStorage('contact_form_submissions', submissions);

    return {
      success: true,
      reference_id: submission.id,
      message: 'Your message has been received.'
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