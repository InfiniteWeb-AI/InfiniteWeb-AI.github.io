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
  }

  // ===== Storage helpers =====

  _initStorage() {
    // Ensure id counter exists
    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }

    // Helper to ensure a key exists with a default JSON value
    const ensureKey = (key, defaultValue) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify(defaultValue));
      }
    };

    // Entity storage initialization (no mock rows, just empty containers)
    ensureKey('hosting_plans', []);
    ensureKey('cart', null); // single cart object or null
    ensureKey('cart_items', []);
    ensureKey('orders', []);
    ensureKey('order_items', []);
    ensureKey('video_production_quote_requests', []);
    ensureKey('rmm_plans', []);
    ensureKey('rmm_trial_signups', []);
    ensureKey('seo_plans', []);
    ensureKey('social_media_plans', []);
    ensureKey('blog_content_plans', []);
    ensureKey('marketing_bundles', []);
    ensureKey('marketing_proposal_requests', []);
    ensureKey('consultation_slots', []);
    ensureKey('consultation_bookings', []);
    ensureKey('case_studies', []);
    ensureKey('case_study_contact_requests', []);
    ensureKey('help_articles', []);
    ensureKey('reading_lists', []);
    ensureKey('reading_list_items', []);
    ensureKey('support_tickets', []);
    ensureKey('navigation_links', []);
    ensureKey('legal_documents', []); // for getLegalDocument
  }

  _getFromStorage(key, defaultValue = []) {
    const raw = localStorage.getItem(key);
    if (raw === null || typeof raw === 'undefined') {
      return defaultValue;
    }
    try {
      const parsed = JSON.parse(raw);
      return parsed === null || typeof parsed === 'undefined' ? defaultValue : parsed;
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

  // ===== Cart helpers =====

  _getOrCreateCart() {
    let cart = this._getFromStorage('cart', null);
    if (!cart) {
      cart = {
        id: this._generateId('cart'),
        billing_cycle: 'monthly',
        currency: 'usd',
        subtotal: 0,
        total: 0,
        created_at: this._nowISO(),
        updated_at: this._nowISO()
      };
      this._saveToStorage('cart', cart);
    }
    return cart;
  }

  _recalculateCartTotals() {
    let cart = this._getFromStorage('cart', null);
    if (!cart) {
      cart = this._getOrCreateCart();
    }
    const allItems = this._getFromStorage('cart_items', []);
    const items = allItems.filter(i => i.cart_id === cart.id);

    const subtotal = items.reduce((sum, item) => sum + (item.subtotal || 0), 0);

    cart.subtotal = subtotal;
    cart.total = subtotal;
    cart.updated_at = this._nowISO();

    this._saveToStorage('cart', cart);
    this._saveToStorage('cart_items', allItems);

    return { cart, items };
  }

  _augmentCartItems(items) {
    const cart = this._getFromStorage('cart', null);
    const hostingPlans = this._getFromStorage('hosting_plans', []);
    const rmmPlans = this._getFromStorage('rmm_plans', []);

    return items.map(item => {
      let product = null;
      if (item.product_type === 'hosting_plan') {
        product = hostingPlans.find(p => p.id === item.product_id) || null;
      } else if (item.product_type === 'rmm_plan') {
        product = rmmPlans.find(p => p.id === item.product_id) || null;
      }
      return {
        ...item,
        cart: cart && item.cart_id === cart.id ? cart : null,
        product
      };
    });
  }

  _augmentOrderItems(orderItems) {
    const hostingPlans = this._getFromStorage('hosting_plans', []);
    const rmmPlans = this._getFromStorage('rmm_plans', []);

    return orderItems.map(item => {
      let product = null;
      if (item.product_type === 'hosting_plan') {
        product = hostingPlans.find(p => p.id === item.product_id) || null;
      } else if (item.product_type === 'rmm_plan') {
        product = rmmPlans.find(p => p.id === item.product_id) || null;
      }
      return {
        ...item,
        product
      };
    });
  }

  // ===== Marketing helpers =====

  _validateBudgetLimit(total, budget_limit) {
    if (typeof budget_limit !== 'number' || isNaN(budget_limit)) {
      return { is_within_budget: true, over_budget_amount: 0 };
    }
    if (total <= budget_limit) {
      return { is_within_budget: true, over_budget_amount: 0 };
    }
    return { is_within_budget: false, over_budget_amount: total - budget_limit };
  }

  _createMarketingBundleRecord(seoPlan, socialPlan, blogPlan, budget_limit) {
    const bundles = this._getFromStorage('marketing_bundles', []);
    const total = (seoPlan?.monthly_price || 0) + (socialPlan?.monthly_price || 0) + (blogPlan?.monthly_price || 0);

    const bundle = {
      id: this._generateId('marketing_bundle'),
      seo_plan_id: seoPlan.id,
      social_media_plan_id: socialPlan.id,
      blog_content_plan_id: blogPlan.id,
      total_monthly_price: total,
      budget_limit: typeof budget_limit === 'number' ? budget_limit : undefined,
      currency: 'usd',
      created_at: this._nowISO()
    };

    bundles.push(bundle);
    this._saveToStorage('marketing_bundles', bundles);

    return bundle;
  }

  _augmentMarketingBundle(bundle) {
    if (!bundle) return null;
    const seoPlans = this._getFromStorage('seo_plans', []);
    const socialPlans = this._getFromStorage('social_media_plans', []);
    const blogPlans = this._getFromStorage('blog_content_plans', []);

    const seo_plan = seoPlans.find(p => p.id === bundle.seo_plan_id) || null;
    const social_media_plan = socialPlans.find(p => p.id === bundle.social_media_plan_id) || null;
    const blog_content_plan = blogPlans.find(p => p.id === bundle.blog_content_plan_id) || null;

    return {
      ...bundle,
      seo_plan,
      social_media_plan,
      blog_content_plan
    };
  }

  // ===== Consultation helpers =====

  _reserveConsultationSlot(consultation_slot_id) {
    const slots = this._getFromStorage('consultation_slots', []);
    const idx = slots.findIndex(s => s.id === consultation_slot_id);
    if (idx !== -1) {
      slots[idx] = {
        ...slots[idx],
        is_available: false,
        updated_at: this._nowISO()
      };
      this._saveToStorage('consultation_slots', slots);
      return slots[idx];
    }
    return null;
  }

  _augmentConsultationBooking(booking) {
    if (!booking) return null;
    const slots = this._getFromStorage('consultation_slots', []);
    const slot = slots.find(s => s.id === booking.consultation_slot_id) || null;
    return {
      ...booking,
      consultation_slot: slot
    };
  }

  // ===== Reading list helpers =====

  _augmentReadingListItem(item) {
    if (!item) return null;
    const lists = this._getFromStorage('reading_lists', []);
    const articles = this._getFromStorage('help_articles', []);
    const reading_list = lists.find(l => l.id === item.reading_list_id) || null;
    const help_article = articles.find(a => a.id === item.help_article_id) || null;
    return {
      ...item,
      reading_list,
      help_article
    };
  }

  // ===== Case study helpers =====

  _augmentCaseStudyContactRequest(req) {
    if (!req) return null;
    const caseStudies = this._getFromStorage('case_studies', []);
    const case_study = caseStudies.find(c => c.id === req.case_study_id) || null;
    return {
      ...req,
      case_study
    };
  }

  // ===== RMM helpers =====

  _augmentRmmTrialSignup(trial) {
    if (!trial) return null;
    const plans = this._getFromStorage('rmm_plans', []);
    const rmm_plan = plans.find(p => p.id === trial.rmm_plan_id) || null;
    return {
      ...trial,
      rmm_plan
    };
  }

  // ===== Order helpers =====

  _augmentOrder(order) {
    if (!order) return null;
    const cart = this._getFromStorage('cart', null);
    return {
      ...order,
      cart: order.cart_id && cart && cart.id === order.cart_id ? cart : null
    };
  }

  // ===== Interface implementations =====

  // --- Home page content ---

  getHomePageContent() {
    const caseStudies = this._getFromStorage('case_studies', []);
    const helpArticles = this._getFromStorage('help_articles', []);

    const featured_case_studies = caseStudies
      .filter(cs => cs.is_featured)
      .sort((a, b) => {
        const da = a.published_at ? new Date(a.published_at).getTime() : 0;
        const db = b.published_at ? new Date(b.published_at).getTime() : 0;
        return db - da;
      });

    const topicMap = {
      cloud_services: 'Cloud Services',
      web_hosting: 'Web Hosting',
      email_collaboration: 'Email & Collaboration',
      remote_monitoring_management: 'Remote Monitoring & Management',
      video_production: 'Video Production',
      digital_marketing: 'Digital Marketing',
      general: 'General'
    };

    const topicDescriptions = {
      cloud_services: 'Guides for backups, storage, and disaster recovery in the cloud.',
      web_hosting: 'Learn how to manage your websites, domains, and DNS.',
      email_collaboration: 'Help with email, calendars, and collaboration tools.',
      remote_monitoring_management: 'RMM agent deployment and monitoring best practices.',
      video_production: 'Tips on planning and delivering professional video projects.',
      digital_marketing: 'SEO, social media, and content marketing resources.',
      general: 'General account and platform information.'
    };

    const distinctTopics = Array.from(
      new Set(
        helpArticles
          .filter(a => a.is_published)
          .map(a => a.topic)
          .filter(Boolean)
      )
    );

    const featured_help_topics = distinctTopics.map(topic => ({
      topic,
      label: topicMap[topic] || topic,
      description: topicDescriptions[topic] || ''
    }));

    const services_summary = [
      {
        key: 'web_hosting',
        name: 'Web Hosting',
        description: 'Reliable SSD hosting for business websites and apps.',
        category: 'it_services',
        primary_cta_label: 'View Hosting Plans',
        target_page_key: 'web_hosting_plans'
      },
      {
        key: 'video_production',
        name: 'Video Production',
        description: 'Corporate promos, explainers, and event coverage.',
        category: 'media_services',
        primary_cta_label: 'Request a Video Quote',
        target_page_key: 'video_production'
      },
      {
        key: 'digital_marketing',
        name: 'Digital Marketing',
        description: 'SEO, social media, and content bundles tailored to you.',
        category: 'marketing_services',
        primary_cta_label: 'Build a Marketing Bundle',
        target_page_key: 'marketing_bundle_builder'
      },
      {
        key: 'consultations',
        name: 'Consultations',
        description: 'Book strategy sessions with our IT and marketing experts.',
        category: 'it_services',
        primary_cta_label: 'Book a Consultation',
        target_page_key: 'consultations'
      },
      {
        key: 'support',
        name: 'Support',
        description: 'Get help from our support team or browse the help center.',
        category: 'it_services',
        primary_cta_label: 'Get Support',
        target_page_key: 'support'
      }
    ];

    return {
      services_summary,
      featured_case_studies,
      featured_help_topics
    };
  }

  // --- Hosting plans & cart ---

  getHostingFilterOptions() {
    const plans = this._getFromStorage('hosting_plans', []);

    const storageValues = Array.from(
      new Set(
        plans
          .map(p => p.storage_gb)
          .filter(v => typeof v === 'number' && !isNaN(v))
      )
    ).sort((a, b) => a - b);

    const supportTiersAll = ['basic', 'standard', 'premium', 'enterprise'];
    const support_tiers = supportTiersAll.filter(tier => plans.some(p => p.support_tier === tier));

    const prices = plans
      .map(p => p.monthly_price)
      .filter(v => typeof v === 'number' && !isNaN(v));

    let price_buckets_monthly = [];
    if (prices.length > 0) {
      const max = Math.max(...prices);
      const steps = [50, 100, 200, 500, 1000];
      price_buckets_monthly = steps
        .filter(step => step < max)
        .map(step => ({ min: 0, max: step, label: `Up to $${step}/mo` }));
      price_buckets_monthly.push({ min: 0, max, label: `Up to $${max}/mo` });
    }

    const sort_options = [
      { key: 'price_low_to_high', label: 'Price: Low to High' },
      { key: 'price_high_to_low', label: 'Price: High to Low' },
      { key: 'storage_high_to_low', label: 'Storage: High to Low' },
      { key: 'featured', label: 'Featured' }
    ];

    return {
      storage_gb_min_values: storageValues,
      billing_cycles: ['monthly', 'annual'],
      support_tiers,
      sort_options,
      price_buckets_monthly
    };
  }

  listHostingPlans(filters, sort_by) {
    const plansAll = this._getFromStorage('hosting_plans', []);
    const f = filters || {};

    let plans = plansAll.slice();

    if (f.status) {
      plans = plans.filter(p => p.status === f.status);
    } else {
      // default to active only
      plans = plans.filter(p => p.status === 'active');
    }

    if (typeof f.min_storage_gb === 'number') {
      plans = plans.filter(p => typeof p.storage_gb === 'number' && p.storage_gb >= f.min_storage_gb);
    }

    if (f.billing_cycle) {
      plans = plans.filter(p => p.billing_cycle_default === f.billing_cycle);
    }

    if (typeof f.max_monthly_price === 'number') {
      plans = plans.filter(p => typeof p.monthly_price === 'number' && p.monthly_price <= f.max_monthly_price);
    }

    if (f.support_tier) {
      plans = plans.filter(p => p.support_tier === f.support_tier);
    }

    if (f.search_term) {
      const term = String(f.search_term).toLowerCase();
      plans = plans.filter(p => {
        const name = (p.name || '').toLowerCase();
        const desc = (p.description || '').toLowerCase();
        return name.includes(term) || desc.includes(term);
      });
    }

    const sortKey = sort_by || 'price_low_to_high';

    plans.sort((a, b) => {
      if (sortKey === 'price_low_to_high') {
        return (a.monthly_price || 0) - (b.monthly_price || 0);
      }
      if (sortKey === 'price_high_to_low') {
        return (b.monthly_price || 0) - (a.monthly_price || 0);
      }
      if (sortKey === 'storage_high_to_low') {
        return (b.storage_gb || 0) - (a.storage_gb || 0);
      }
      if (sortKey === 'featured') {
        const af = a.is_featured ? 1 : 0;
        const bf = b.is_featured ? 1 : 0;
        return bf - af;
      }
      return 0;
    });

    // Instrumentation for task completion tracking
    try {
      if (
        filters &&
        typeof filters.min_storage_gb === 'number' &&
        filters.min_storage_gb >= 50 &&
        (typeof filters.billing_cycle === 'undefined' || filters.billing_cycle === 'monthly') &&
        sort_by === 'price_low_to_high'
      ) {
        const task1_hostingFilterParams = {
          min_storage_gb: filters.min_storage_gb,
          billing_cycle: filters.billing_cycle || null,
          max_monthly_price: (typeof filters.max_monthly_price === 'number' ? filters.max_monthly_price : null),
          sort_by: sort_by || 'price_low_to_high',
          set_at: this._nowISO()
        };
        localStorage.setItem('task1_hostingFilterParams', JSON.stringify(task1_hostingFilterParams));
      }
    } catch (e) {
      // Swallow instrumentation errors to avoid impacting main flow
    }

    return {
      plans,
      total_count: plans.length
    };
  }

  getHostingPlanDetails(hosting_plan_id) {
    const plans = this._getFromStorage('hosting_plans', []);
    const plan = plans.find(p => p.id === hosting_plan_id) || null;

    let configuration_options = {
      websites_options: [],
      support_tier_options: [],
      other_options: [],
      defaults: {
        websites: 1,
        support_tier: plan ? plan.support_tier || 'basic' : 'basic'
      }
    };

    if (plan) {
      const maxSites = plan.websites_included && plan.websites_included > 0 ? plan.websites_included : 1;
      const websites_options = [];
      for (let i = 1; i <= maxSites; i++) {
        websites_options.push(i);
      }

      const support_tier_options = plan.support_tier ? [plan.support_tier] : ['basic'];

      configuration_options = {
        websites_options,
        support_tier_options,
        other_options: [],
        defaults: {
          websites: 1,
          support_tier: support_tier_options[0]
        }
      };
    }

    return { plan, configuration_options };
  }

  addHostingPlanToCart(hosting_plan_id, billing_cycle, quantity, configuration_summary) {
    const plans = this._getFromStorage('hosting_plans', []);
    const plan = plans.find(p => p.id === hosting_plan_id) || null;

    if (!plan || plan.status !== 'active') {
      return { success: false, cart: null, items: [], message: 'Hosting plan not found or inactive.' };
    }

    const cycle = billing_cycle || 'monthly';
    const qty = typeof quantity === 'number' && quantity > 0 ? quantity : 1;

    let unit_price;
    if (cycle === 'monthly') {
      unit_price = plan.monthly_price || 0;
    } else {
      if (typeof plan.annual_price === 'number') {
        unit_price = plan.annual_price;
      } else {
        unit_price = (plan.monthly_price || 0) * 12;
      }
    }

    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items', []);

    // Merge with existing identical line if present
    const existingIndex = cartItems.findIndex(i =>
      i.cart_id === cart.id &&
      i.product_type === 'hosting_plan' &&
      i.product_id === hosting_plan_id &&
      i.billing_cycle === cycle &&
      (i.configuration_summary || '') === (configuration_summary || '')
    );

    if (existingIndex !== -1) {
      const existing = cartItems[existingIndex];
      const newQty = existing.quantity + qty;
      cartItems[existingIndex] = {
        ...existing,
        quantity: newQty,
        subtotal: unit_price * newQty
      };
    } else {
      const item = {
        id: this._generateId('cart_item'),
        cart_id: cart.id,
        product_type: 'hosting_plan',
        product_id: hosting_plan_id,
        name: plan.name,
        billing_cycle: cycle,
        unit_price,
        quantity: qty,
        subtotal: unit_price * qty,
        configuration_summary: configuration_summary || '',
        created_at: this._nowISO()
      };
      cartItems.push(item);
    }

    this._saveToStorage('cart_items', cartItems);

    const { cart: updatedCart, items } = this._recalculateCartTotals();
    const augmentedItems = this._augmentCartItems(items);

    return {
      success: true,
      cart: updatedCart,
      items: augmentedItems,
      message: 'Hosting plan added to cart.'
    };
  }

  getCartSummary() {
    const cart = this._getOrCreateCart();
    const allItems = this._getFromStorage('cart_items', []);
    const items = allItems.filter(i => i.cart_id === cart.id);
    const augmentedItems = this._augmentCartItems(items);

    // Compute recurring monthly total (annual items prorated over 12 months)
    const recurring_monthly_total = augmentedItems.reduce((sum, item) => {
      if (item.billing_cycle === 'monthly') {
        return sum + (item.unit_price || 0) * (item.quantity || 0);
      }
      if (item.billing_cycle === 'annual') {
        return sum + ((item.unit_price || 0) * (item.quantity || 0)) / 12;
      }
      return sum;
    }, 0);

    return {
      cart,
      items: augmentedItems,
      recurring_monthly_total
    };
  }

  updateCartItemQuantity(cart_item_id, quantity) {
    let cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items', []);
    const idx = cartItems.findIndex(i => i.id === cart_item_id && i.cart_id === cart.id);

    if (idx === -1) {
      return {
        success: false,
        cart,
        items: this._augmentCartItems(cartItems.filter(i => i.cart_id === cart.id)),
        message: 'Cart item not found.'
      };
    }

    if (quantity <= 0) {
      cartItems.splice(idx, 1);
    } else {
      const item = cartItems[idx];
      const newSubtotal = (item.unit_price || 0) * quantity;
      cartItems[idx] = { ...item, quantity, subtotal: newSubtotal };
    }

    this._saveToStorage('cart_items', cartItems);
    const { cart: updatedCart, items } = this._recalculateCartTotals();
    const augmentedItems = this._augmentCartItems(items);

    return {
      success: true,
      cart: updatedCart,
      items: augmentedItems,
      message: 'Cart updated.'
    };
  }

  removeCartItem(cart_item_id) {
    let cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items', []);
    const idx = cartItems.findIndex(i => i.id === cart_item_id && i.cart_id === cart.id);

    if (idx === -1) {
      return {
        success: false,
        cart,
        items: this._augmentCartItems(cartItems.filter(i => i.cart_id === cart.id)),
        message: 'Cart item not found.'
      };
    }

    cartItems.splice(idx, 1);
    this._saveToStorage('cart_items', cartItems);
    const { cart: updatedCart, items } = this._recalculateCartTotals();
    const augmentedItems = this._augmentCartItems(items);

    return {
      success: true,
      cart: updatedCart,
      items: augmentedItems,
      message: 'Cart item removed.'
    };
  }

  clearCart() {
    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items', []);
    cartItems = cartItems.filter(i => i.cart_id !== cart.id);
    this._saveToStorage('cart_items', cartItems);

    cart.subtotal = 0;
    cart.total = 0;
    cart.updated_at = this._nowISO();
    this._saveToStorage('cart', cart);

    return {
      success: true,
      cart,
      items: []
    };
  }

  getCheckoutSummary() {
    const cart = this._getOrCreateCart();
    const allItems = this._getFromStorage('cart_items', []);
    const items = allItems.filter(i => i.cart_id === cart.id);
    const augmentedItems = this._augmentCartItems(items);

    // Determine primary billing_cycle
    let billing_cycle = cart.billing_cycle || 'monthly';
    if (!billing_cycle && augmentedItems.length > 0) {
      const cycles = Array.from(new Set(augmentedItems.map(i => i.billing_cycle)));
      billing_cycle = cycles.length === 1 ? cycles[0] : 'monthly';
    }

    const recurring_total = augmentedItems.reduce((sum, item) => {
      if (item.billing_cycle === 'monthly') {
        return sum + (item.unit_price || 0) * (item.quantity || 0);
      }
      if (item.billing_cycle === 'annual') {
        return sum + ((item.unit_price || 0) * (item.quantity || 0)) / 12;
      }
      return sum;
    }, 0);

    // Instrumentation for task completion tracking
    try {
      if (Array.isArray(augmentedItems) && augmentedItems.length === 1) {
        const item = augmentedItems[0];
        if (
          item &&
          item.product_type === 'hosting_plan' &&
          item.billing_cycle === 'monthly' &&
          item.quantity === 1 &&
          item.product &&
          typeof item.product.storage_gb === 'number' &&
          item.product.storage_gb >= 50 &&
          typeof item.product.monthly_price === 'number' &&
          item.product.monthly_price <= 40
        ) {
          const hostingPlans = this._getFromStorage('hosting_plans', []);
          const eligiblePlans = hostingPlans.filter(p =>
            p &&
            p.status === 'active' &&
            typeof p.storage_gb === 'number' &&
            p.storage_gb >= 50 &&
            typeof p.monthly_price === 'number' &&
            p.monthly_price <= 40
          );
          if (eligiblePlans.length > 0) {
            const minPrice = Math.min.apply(null, eligiblePlans.map(p => p.monthly_price));
            const isCheapest = item.product.monthly_price === minPrice;
            const isEligible = eligiblePlans.some(p => p.id === item.product.id);
            if (isCheapest && isEligible) {
              const task1_checkoutCheapestPlan = {
                cart_id: cart.id,
                cart_item_id: item.id,
                hosting_plan_id: item.product_id,
                billing_cycle: item.billing_cycle,
                quantity: item.quantity,
                monthly_price: item.product.monthly_price,
                storage_gb: item.product.storage_gb,
                recurring_total: recurring_total,
                set_at: this._nowISO()
              };
              localStorage.setItem('task1_checkoutCheapestPlan', JSON.stringify(task1_checkoutCheapestPlan));
            }
          }
        }
      }
    } catch (e) {
      // Swallow instrumentation errors to avoid impacting main flow
    }

    return {
      cart,
      items: augmentedItems,
      billing_cycle,
      recurring_total,
      currency: cart.currency || 'usd'
    };
  }

  placeOrder(billing_name, billing_company, billing_email) {
    const cart = this._getOrCreateCart();
    const allCartItems = this._getFromStorage('cart_items', []);
    const cartItems = allCartItems.filter(i => i.cart_id === cart.id);

    if (cartItems.length === 0) {
      return {
        success: false,
        order: null,
        items: [],
        message: 'Cart is empty.'
      };
    }

    const orders = this._getFromStorage('orders', []);
    const orderItemsAll = this._getFromStorage('order_items', []);

    const total = cartItems.reduce((sum, item) => sum + (item.subtotal || 0), 0);

    const order = {
      id: this._generateId('order'),
      cart_id: cart.id,
      status: 'pending',
      billing_cycle: cart.billing_cycle,
      currency: cart.currency || 'usd',
      total,
      billing_name,
      billing_company: billing_company || undefined,
      billing_email,
      created_at: this._nowISO(),
      completed_at: null
    };

    const orderItems = cartItems.map(ci => ({
      id: this._generateId('order_item'),
      order_id: order.id,
      product_type: ci.product_type,
      product_id: ci.product_id,
      name: ci.name,
      billing_cycle: ci.billing_cycle,
      unit_price: ci.unit_price,
      quantity: ci.quantity,
      subtotal: ci.subtotal,
      configuration_summary: ci.configuration_summary || ''
    }));

    orders.push(order);
    Array.prototype.push.apply(orderItemsAll, orderItems);

    this._saveToStorage('orders', orders);
    this._saveToStorage('order_items', orderItemsAll);

    // Clear cart after placing order
    const remainingCartItems = allCartItems.filter(i => i.cart_id !== cart.id);
    this._saveToStorage('cart_items', remainingCartItems);
    cart.subtotal = 0;
    cart.total = 0;
    cart.updated_at = this._nowISO();
    this._saveToStorage('cart', cart);

    const augmentedOrder = this._augmentOrder(order);
    const augmentedItems = this._augmentOrderItems(orderItems);

    return {
      success: true,
      order: augmentedOrder,
      items: augmentedItems,
      message: 'Order placed successfully.'
    };
  }

  // --- RMM plans & trials ---

  getRmmFilterOptions() {
    const plans = this._getFromStorage('rmm_plans', []);

    const minDevicesValues = Array.from(
      new Set(
        plans
          .map(p => p.min_devices)
          .filter(v => typeof v === 'number' && !isNaN(v))
      )
    ).sort((a, b) => a - b);

    const prices = plans
      .map(p => p.monthly_price)
      .filter(v => typeof v === 'number' && !isNaN(v));

    let price_buckets_monthly = [];
    if (prices.length > 0) {
      const max = Math.max(...prices);
      const steps = [100, 200, 300, 500, 1000];
      price_buckets_monthly = steps
        .filter(step => step < max)
        .map(step => ({ min: 0, max: step, label: `Up to $${step}/mo` }));
      price_buckets_monthly.push({ min: 0, max, label: `Up to $${max}/mo` });
    }

    const sort_options = [
      { key: 'price_low_to_high', label: 'Price: Low to High' },
      { key: 'price_high_to_low', label: 'Price: High to Low' },
      { key: 'min_devices_low_to_high', label: 'Min Devices: Low to High' }
    ];

    return {
      min_devices_values: minDevicesValues,
      sort_options,
      price_buckets_monthly
    };
  }

  listRmmPlans(filters, sort_by) {
    const plansAll = this._getFromStorage('rmm_plans', []);
    const f = filters || {};
    let plans = plansAll.slice();

    if (f.status) {
      plans = plans.filter(p => p.status === f.status);
    } else {
      plans = plans.filter(p => p.status === 'active');
    }

    if (typeof f.min_devices === 'number') {
      const minReq = f.min_devices;
      plans = plans.filter(p => {
        const min = typeof p.min_devices === 'number' ? p.min_devices : 0;
        const max = typeof p.max_devices === 'number' ? p.max_devices : Infinity;
        return min <= minReq && max >= minReq;
      });
    }

    if (typeof f.max_monthly_price === 'number') {
      plans = plans.filter(p => typeof p.monthly_price === 'number' && p.monthly_price <= f.max_monthly_price);
    }

    if (f.trial_available_only) {
      plans = plans.filter(p => p.is_trial_available === true);
    }

    const sortKey = sort_by || 'price_low_to_high';
    plans.sort((a, b) => {
      if (sortKey === 'price_low_to_high') {
        return (a.monthly_price || 0) - (b.monthly_price || 0);
      }
      if (sortKey === 'price_high_to_low') {
        return (b.monthly_price || 0) - (a.monthly_price || 0);
      }
      if (sortKey === 'min_devices_low_to_high') {
        return (a.min_devices || 0) - (b.min_devices || 0);
      }
      return 0;
    });

    return {
      plans,
      total_count: plans.length
    };
  }

  getRmmPlanDetails(rmm_plan_id) {
    const plans = this._getFromStorage('rmm_plans', []);
    const plan = plans.find(p => p.id === rmm_plan_id) || null;
    return { plan };
  }

  startRmmFreeTrial(rmm_plan_id, full_name, company_name, business_email, estimated_devices) {
    const plans = this._getFromStorage('rmm_plans', []);
    const plan = plans.find(p => p.id === rmm_plan_id) || null;

    if (!plan || plan.status !== 'active' || !plan.is_trial_available) {
      return {
        success: false,
        trial: null,
        message: 'RMM plan not available for trial.'
      };
    }

    const trials = this._getFromStorage('rmm_trial_signups', []);

    const trial = {
      id: this._generateId('rmm_trial'),
      rmm_plan_id,
      full_name,
      company_name: company_name || undefined,
      business_email,
      estimated_devices: typeof estimated_devices === 'number' ? estimated_devices : undefined,
      status: 'submitted',
      created_at: this._nowISO()
    };

    trials.push(trial);
    this._saveToStorage('rmm_trial_signups', trials);

    const augmented = this._augmentRmmTrialSignup(trial);

    return {
      success: true,
      trial: augmented,
      message: 'RMM trial started.'
    };
  }

  // --- Media services / video production ---

  getMediaServicesOverview() {
    return {
      video_production_summary: {
        headline: 'End-to-end corporate video production',
        description: 'From concept and scripting to on-site filming and post-production, our team delivers polished corporate videos tailored to your brand.',
        use_cases: [
          '90-second promo videos',
          'Product launches and demos',
          'Customer testimonial videos',
          'Event highlight reels'
        ],
        quality_levels: [
          { key: 'sd', label: 'SD' },
          { key: 'hd_720p', label: 'HD 720p' },
          { key: 'hd_1080p', label: 'Full HD 1080p' },
          { key: 'ultra_hd_4k', label: 'Ultra HD 4K' }
        ]
      }
    };
  }

  submitVideoProductionQuoteRequest(
    project_title,
    project_description,
    location,
    onsite_filming,
    estimated_duration_seconds,
    max_budget,
    quality_preference,
    contact_name,
    company_name,
    contact_email
  ) {
    const requests = this._getFromStorage('video_production_quote_requests', []);

    const quote_request = {
      id: this._generateId('video_quote'),
      project_title: project_title || undefined,
      project_description: project_description || undefined,
      location: location || undefined,
      onsite_filming: typeof onsite_filming === 'boolean' ? onsite_filming : undefined,
      estimated_duration_seconds: typeof estimated_duration_seconds === 'number' ? estimated_duration_seconds : undefined,
      max_budget: typeof max_budget === 'number' ? max_budget : undefined,
      currency: typeof max_budget === 'number' ? 'usd' : undefined,
      quality_preference: quality_preference || undefined,
      service_key: 'video_production',
      contact_name,
      company_name: company_name || undefined,
      contact_email,
      status: 'submitted',
      created_at: this._nowISO()
    };

    requests.push(quote_request);
    this._saveToStorage('video_production_quote_requests', requests);

    return {
      success: true,
      quote_request,
      message: 'Video production quote request submitted.'
    };
  }

  // --- Marketing services / bundles ---

  getMarketingServicesOverview() {
    return {
      seo_summary: {
        headline: 'SEO services that grow organic traffic',
        description: 'From technical audits to content optimization, we help your site rank for the keywords that matter.'
      },
      social_media_summary: {
        headline: 'Social media management for modern brands',
        description: 'We plan, publish, and optimize content across your key social channels.'
      },
      blog_content_summary: {
        headline: 'Blog content that converts',
        description: 'Professionally written articles designed to educate your audience and support SEO.'
      }
    };
  }

  getMarketingPlanOptions() {
    const seo_plans = this._getFromStorage('seo_plans', []).filter(p => p.status === 'active');
    const social_media_plans = this._getFromStorage('social_media_plans', []).filter(p => p.status === 'active');
    const blog_content_plans = this._getFromStorage('blog_content_plans', []).filter(p => p.status === 'active');

    return {
      seo_plans,
      social_media_plans,
      blog_content_plans
    };
  }

  createMarketingBundle(seo_plan_id, social_media_plan_id, blog_content_plan_id, budget_limit) {
    const seoPlans = this._getFromStorage('seo_plans', []);
    const socialPlans = this._getFromStorage('social_media_plans', []);
    const blogPlans = this._getFromStorage('blog_content_plans', []);

    const seoPlan = seoPlans.find(p => p.id === seo_plan_id && p.status === 'active') || null;
    const socialPlan = socialPlans.find(p => p.id === social_media_plan_id && p.status === 'active') || null;
    const blogPlan = blogPlans.find(p => p.id === blog_content_plan_id && p.status === 'active') || null;

    if (!seoPlan || !socialPlan || !blogPlan) {
      return {
        bundle: null,
        seo_plan_name: seoPlan ? seoPlan.name : null,
        social_media_plan_name: socialPlan ? socialPlan.name : null,
        blog_content_plan_name: blogPlan ? blogPlan.name : null,
        is_within_budget: false,
        over_budget_amount: 0
      };
    }

    const bundleRecord = this._createMarketingBundleRecord(seoPlan, socialPlan, blogPlan, budget_limit);
    const augmentedBundle = this._augmentMarketingBundle(bundleRecord);

    const { is_within_budget, over_budget_amount } = this._validateBudgetLimit(
      bundleRecord.total_monthly_price,
      typeof budget_limit === 'number' ? budget_limit : undefined
    );

    return {
      bundle: augmentedBundle,
      seo_plan_name: seoPlan.name,
      social_media_plan_name: socialPlan.name,
      blog_content_plan_name: blogPlan.name,
      is_within_budget,
      over_budget_amount
    };
  }

  submitMarketingProposalRequest(marketing_bundle_id, contact_name, company_name, contact_email, additional_notes) {
    const bundles = this._getFromStorage('marketing_bundles', []);
    const bundle = bundles.find(b => b.id === marketing_bundle_id) || null;

    const requests = this._getFromStorage('marketing_proposal_requests', []);

    const proposal_request = {
      id: this._generateId('marketing_proposal'),
      marketing_bundle_id,
      contact_name,
      company_name: company_name || undefined,
      contact_email,
      additional_notes: additional_notes || undefined,
      status: 'submitted',
      created_at: this._nowISO()
    };

    requests.push(proposal_request);
    this._saveToStorage('marketing_proposal_requests', requests);

    const augmentedBundle = this._augmentMarketingBundle(bundle);

    const augmentedRequest = {
      ...proposal_request,
      marketing_bundle: augmentedBundle
    };

    return {
      success: true,
      proposal_request: augmentedRequest,
      message: 'Marketing proposal request submitted.'
    };
  }

  // --- Consultations ---

  getConsultationOptions() {
    return {
      topics: [
        { key: 'website_redesign', label: 'Website Redesign' },
        { key: 'it_infrastructure', label: 'IT Infrastructure' },
        { key: 'digital_marketing', label: 'Digital Marketing' },
        { key: 'general', label: 'General Consultation' }
      ],
      meeting_formats: [
        { key: 'online', label: 'Online / Virtual' },
        { key: 'in_person', label: 'In Person' },
        { key: 'phone', label: 'Phone Call' }
      ],
      company_sizes: [
        { key: '1_10', label: '1–10 employees' },
        { key: '11_50', label: '11–50 employees' },
        { key: '51_200', label: '51–200 employees' },
        { key: '201_500', label: '201–500 employees' },
        { key: '501_plus', label: '501+ employees' }
      ]
    };
  }

  getConsultationAvailability(topic, meeting_format, start_date, end_date) {
    const slots = this._getFromStorage('consultation_slots', []);

    const start = new Date(start_date + 'T00:00:00Z');
    const end = new Date(end_date + 'T23:59:59Z');

    const filtered = slots.filter(slot => {
      // Ignore stored is_available flag here; rely on topic/format/date filtering only.
      if (topic && slot.topic && slot.topic !== topic) return false;
      if (meeting_format && slot.meeting_format && slot.meeting_format !== meeting_format) return false;

      const slotStart = new Date(slot.start_datetime);
      return slotStart >= start && slotStart <= end;
    });

    return { slots: filtered };
  }

  bookConsultation(consultation_slot_id, topic, meeting_format, company_size, contact_name, contact_email) {
    const slots = this._getFromStorage('consultation_slots', []);
    const slot = slots.find(s => s.id === consultation_slot_id) || null;

    if (!slot) {
      return {
        success: false,
        booking: null,
        message: 'Selected consultation slot is not available.'
      };
    }

    const bookings = this._getFromStorage('consultation_bookings', []);

    const booking = {
      id: this._generateId('consultation_booking'),
      consultation_slot_id,
      topic,
      meeting_format,
      company_size,
      contact_name,
      contact_email,
      status: 'scheduled',
      created_at: this._nowISO()
    };

    bookings.push(booking);
    this._saveToStorage('consultation_bookings', bookings);

    this._reserveConsultationSlot(consultation_slot_id);

    const augmentedBooking = this._augmentConsultationBooking(booking);

    return {
      success: true,
      booking: augmentedBooking,
      message: 'Consultation booked.'
    };
  }

  // --- Case studies & sales contact ---

  getCaseStudyFilters() {
    const industryLabels = {
      retail: 'Retail',
      healthcare: 'Healthcare',
      finance: 'Finance',
      education: 'Education',
      manufacturing: 'Manufacturing',
      technology: 'Technology',
      other: 'Other'
    };

    const industries = Object.keys(industryLabels).map(value => ({
      value,
      label: industryLabels[value]
    }));

    const services = [
      { key: 'it_support', label: 'IT Support' },
      { key: 'video_production', label: 'Video Production' },
      { key: 'remote_monitoring_management', label: 'Remote Monitoring & Management' },
      { key: 'seo', label: 'SEO' },
      { key: 'social_media_management', label: 'Social Media Management' },
      { key: 'blog_content', label: 'Blog Content' },
      { key: 'web_hosting', label: 'Web Hosting' },
      { key: 'cloud_services', label: 'Cloud Services' },
      { key: 'email_collaboration', label: 'Email & Collaboration' }
    ];

    return { industries, services };
  }

  searchCaseStudies(industry, services, sort_by) {
    const all = this._getFromStorage('case_studies', []);
    const requestedServices = Array.isArray(services) ? services : [];
    let list = all.slice();

    if (industry) {
      list = list.filter(cs => cs.industry === industry);
    }

    if (requestedServices.length > 0) {
      list = list.filter(cs => {
        const svc = Array.isArray(cs.services) ? cs.services : [];
        // Require all requested services to be present
        return requestedServices.every(req => svc.includes(req));
      });
    }

    const sortKey = sort_by || 'most_recent';

    list.sort((a, b) => {
      if (sortKey === 'most_recent') {
        const da = a.published_at ? new Date(a.published_at).getTime() : 0;
        const db = b.published_at ? new Date(b.published_at).getTime() : 0;
        return db - da;
      }
      // relevance fallback: also use most recent
      if (sortKey === 'relevance') {
        const da = a.published_at ? new Date(a.published_at).getTime() : 0;
        const db = b.published_at ? new Date(b.published_at).getTime() : 0;
        return db - da;
      }
      return 0;
    });

    return {
      case_studies: list,
      total_count: list.length
    };
  }

  getCaseStudyDetails(case_study_id) {
    const all = this._getFromStorage('case_studies', []);
    const case_study = all.find(c => c.id === case_study_id) || null;
    return { case_study };
  }

  submitCaseStudyContactRequest(case_study_id, message, contact_name, contact_email) {
    const requests = this._getFromStorage('case_study_contact_requests', []);

    const contact_request = {
      id: this._generateId('case_study_contact'),
      case_study_id,
      message,
      contact_name,
      contact_email,
      status: 'submitted',
      created_at: this._nowISO()
    };

    requests.push(contact_request);
    this._saveToStorage('case_study_contact_requests', requests);

    const augmented = this._augmentCaseStudyContactRequest(contact_request);

    return {
      success: true,
      contact_request: augmented,
      message: 'Case study contact request submitted.'
    };
  }

  // --- Help center & reading lists ---

  searchHelpArticles(query, topic, sort_order) {
    const all = this._getFromStorage('help_articles', []);

    let articles = all.filter(a => a.is_published);

    if (topic) {
      articles = articles.filter(a => a.topic === topic);
    }

    if (query) {
      const q = String(query).toLowerCase();
      articles = articles.filter(a => {
        const title = (a.title || '').toLowerCase();
        const content = (a.content || '').toLowerCase();
        const tags = Array.isArray(a.tags) ? a.tags.join(' ').toLowerCase() : '';
        return title.includes(q) || content.includes(q) || tags.includes(q);
      });
    }

    const sort = sort_order || 'relevance';

    articles.sort((a, b) => {
      if (sort === 'most_recent' || sort === 'relevance') {
        const da = a.published_at ? new Date(a.published_at).getTime() : 0;
        const db = b.published_at ? new Date(b.published_at).getTime() : 0;
        return db - da;
      }
      if (sort === 'oldest_first') {
        const da = a.published_at ? new Date(a.published_at).getTime() : 0;
        const db = b.published_at ? new Date(b.published_at).getTime() : 0;
        return da - db;
      }
      if (sort === 'alphabetical') {
        const ta = (a.title || '').toLowerCase();
        const tb = (b.title || '').toLowerCase();
        if (ta < tb) return -1;
        if (ta > tb) return 1;
        return 0;
      }
      return 0;
    });

    return {
      articles,
      total_count: articles.length
    };
  }

  getHelpArticleDetails(help_article_id) {
    const all = this._getFromStorage('help_articles', []);
    const article = all.find(a => a.id === help_article_id) || null;
    return { article };
  }

  getReadingLists() {
    const reading_lists = this._getFromStorage('reading_lists', []);
    return { reading_lists };
  }

  saveHelpArticleToReadingList(help_article_id, mode, existing_reading_list_id, new_reading_list_name) {
    const articles = this._getFromStorage('help_articles', []);
    const article = articles.find(a => a.id === help_article_id) || null;

    if (!article) {
      return {
        success: false,
        reading_list: null,
        item: null,
        message: 'Help article not found.'
      };
    }

    let lists = this._getFromStorage('reading_lists', []);
    let items = this._getFromStorage('reading_list_items', []);

    let readingList = null;

    if (mode === 'existing') {
      readingList = lists.find(l => l.id === existing_reading_list_id) || null;
      if (!readingList) {
        return {
          success: false,
          reading_list: null,
          item: null,
          message: 'Reading list not found.'
        };
      }
    } else if (mode === 'new') {
      if (!new_reading_list_name) {
        return {
          success: false,
          reading_list: null,
          item: null,
          message: 'Reading list name is required for mode "new".'
        };
      }
      readingList = {
        id: this._generateId('reading_list'),
        name: new_reading_list_name,
        description: undefined,
        created_at: this._nowISO()
      };
      lists.push(readingList);
      this._saveToStorage('reading_lists', lists);
    } else {
      return {
        success: false,
        reading_list: null,
        item: null,
        message: 'Invalid mode. Use "existing" or "new".'
      };
    }

    // Check if item already exists
    let item = items.find(i => i.reading_list_id === readingList.id && i.help_article_id === help_article_id) || null;

    if (!item) {
      item = {
        id: this._generateId('reading_list_item'),
        reading_list_id: readingList.id,
        help_article_id,
        added_at: this._nowISO()
      };
      items.push(item);
      this._saveToStorage('reading_list_items', items);
    }

    const augmentedItem = this._augmentReadingListItem(item);

    return {
      success: true,
      reading_list: readingList,
      item: augmentedItem,
      message: 'Article saved to reading list.'
    };
  }

  // --- Support ---

  getSupportOverview() {
    return {
      channels: [
        {
          key: 'ticket',
          label: 'Support Ticket',
          description: 'Submit detailed technical issues to our support engineers.'
        },
        {
          key: 'email',
          label: 'Email Support',
          description: 'Reach us via email for non-urgent questions.'
        },
        {
          key: 'phone',
          label: 'Phone Support',
          description: 'Call our support line for urgent issues (availability may vary by plan).'
        },
        {
          key: 'help_center',
          label: 'Help Center',
          description: 'Browse step-by-step guides and FAQs.'
        }
      ],
      self_service_highlights: [
        {
          key: 'help_center',
          label: 'Help Center',
          description: 'Search articles for immediate answers to common questions.'
        },
        {
          key: 'status_page',
          label: 'Status Page',
          description: 'Check current system status and incident history.'
        }
      ]
    };
  }

  submitSupportTicket(customer_type, issue_category, subject, description, priority, contact_email) {
    const tickets = this._getFromStorage('support_tickets', []);

    const ticket = {
      id: this._generateId('support_ticket'),
      customer_type,
      issue_category,
      subject,
      description,
      priority,
      contact_email,
      status: 'open',
      created_at: this._nowISO()
    };

    tickets.push(ticket);
    this._saveToStorage('support_tickets', tickets);

    return {
      success: true,
      ticket,
      message: 'Support ticket submitted.'
    };
  }

  // --- About & legal ---

  getAboutPageContent() {
    // This is high-level company information; we generate it dynamically.
    const expertise_areas = [
      'Managed IT services and remote monitoring',
      'Business web hosting and cloud infrastructure',
      'Corporate video production and media services',
      'SEO, social media, and content marketing'
    ];

    return {
      headline: 'IT & Media Services for Growing Businesses',
      mission: 'To help organizations build reliable IT foundations, tell compelling stories, and grow through digital channels.',
      history: 'Founded to bridge the gap between IT operations and creative media, we support clients across industries with integrated technology and marketing services.',
      expertise_areas,
      team_highlights: [],
      client_logos: [],
      contact_summary: 'Reach out to our team to discuss how we can support your IT, media, or marketing initiatives.'
    };
  }

  getLegalDocument(document_key) {
    const docs = this._getFromStorage('legal_documents', []);
    const doc = docs.find(d => d.document_key === document_key) || null;

    if (doc) {
      return {
        title: doc.title || '',
        content: doc.content || '',
        last_updated: doc.last_updated || null
      };
    }

    return {
      title: '',
      content: '',
      last_updated: null
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