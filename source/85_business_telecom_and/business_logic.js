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

  // -------------------- Storage helpers --------------------

  _initStorage() {
    // Generic helper to ensure a key exists
    const ensureArrayKey = (key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    };

    // Legacy example keys from template (kept for compatibility, unused)
    ensureArrayKey('users');
    ensureArrayKey('products');
    ensureArrayKey('carts');
    ensureArrayKey('cartItems');

    // Domain storage based on data models
    ensureArrayKey('solution_categories');
    ensureArrayKey('internet_plans');
    ensureArrayKey('mobile_plans');
    ensureArrayKey('voip_plans');
    ensureArrayKey('voip_plan_terms');
    ensureArrayKey('managed_firewall_tiers');
    ensureArrayKey('add_ons');
    ensureArrayKey('devices');
    ensureArrayKey('sdwan_access_types');
    ensureArrayKey('sdwan_price_options');
    ensureArrayKey('sdwan_configurations');
    ensureArrayKey('sdwan_sites');
    ensureArrayKey('coverage_entries');
    ensureArrayKey('branches');
    ensureArrayKey('support_tickets');
    ensureArrayKey('service_subscriptions');
    ensureArrayKey('mobile_plan_configurations');
    ensureArrayKey('voip_configurations');
    ensureArrayKey('firewall_selections');
    ensureArrayKey('cart'); // array of Cart
    ensureArrayKey('cart_items'); // array of CartItem
    ensureArrayKey('installation_options');
    ensureArrayKey('checkout_orders');

    // Page content / settings (single-object keys; not pre-populated with data)
    if (!localStorage.getItem('about_page_content')) {
      localStorage.setItem('about_page_content', JSON.stringify(null));
    }
    if (!localStorage.getItem('contact_page_content')) {
      localStorage.setItem('contact_page_content', JSON.stringify(null));
    }
    if (!localStorage.getItem('policies_page_content')) {
      localStorage.setItem('policies_page_content', JSON.stringify(null));
    }
    if (!localStorage.getItem('support_hub_options')) {
      localStorage.setItem('support_hub_options', JSON.stringify(null));
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, defaultValue = []) {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : defaultValue;
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

  _nowIso() {
    return new Date().toISOString();
  }

  _findById(list, id) {
    return list.find((item) => item.id === id) || null;
  }

  // -------------------- Cart helpers --------------------

  _getOrCreateCart() {
    let carts = this._getFromStorage('cart');
    let cart;
    if (Array.isArray(carts) && carts.length > 0) {
      cart = carts[0];
    } else {
      cart = {
        id: this._generateId('cart'),
        items: [],
        created_at: this._nowIso(),
        updated_at: this._nowIso()
      };
      carts = [cart];
      this._saveToStorage('cart', carts);
    }
    return cart;
  }

  _saveCart(cart) {
    let carts = this._getFromStorage('cart');
    const idx = carts.findIndex((c) => c.id === cart.id);
    if (idx >= 0) {
      carts[idx] = cart;
    } else {
      carts.push(cart);
    }
    this._saveToStorage('cart', carts);
  }

  _recalculateCartTotals(cart, items) {
    const cartItems = items || this._getFromStorage('cart_items').filter((ci) => ci.cart_id === cart.id);
    let totalMonthly = 0;
    let totalOneTime = 0;
    for (const item of cartItems) {
      const qty = item.quantity || 1;
      if (typeof item.monthly_price === 'number') {
        totalMonthly += item.monthly_price * qty;
      }
      if (typeof item.one_time_price === 'number') {
        totalOneTime += item.one_time_price * qty;
      }
    }
    return { total_monthly_price: totalMonthly, total_one_time_price: totalOneTime };
  }

  _populateCartItems(cartItems) {
    const internetPlans = this._getFromStorage('internet_plans');
    const mobileConfigs = this._getFromStorage('mobile_plan_configurations');
    const sdwanConfigs = this._getFromStorage('sdwan_configurations');
    const voipConfigs = this._getFromStorage('voip_configurations');
    const firewallSelections = this._getFromStorage('firewall_selections');

    return cartItems.map((item) => {
      const enriched = { ...item };
      if (item.item_type === 'internet_plan' || item.item_type === 'wireless_plan') {
        enriched.internet_plan = this._findById(internetPlans, item.reference_id);
      } else if (item.item_type === 'mobile_plan') {
        enriched.mobile_plan_configuration = this._findById(mobileConfigs, item.reference_id);
      } else if (item.item_type === 'sdwan_configuration') {
        enriched.sdwan_configuration = this._findById(sdwanConfigs, item.reference_id);
      } else if (item.item_type === 'voip_configuration') {
        enriched.voip_configuration = this._findById(voipConfigs, item.reference_id);
      } else if (item.item_type === 'firewall_service') {
        enriched.firewall_selection = this._findById(firewallSelections, item.reference_id);
      }
      return enriched;
    });
  }

  // -------------------- Pricing helpers --------------------

  _calculateSdwanConfigurationPrice(sites, hasAdvancedAnalytics, hasPerformanceOptimization) {
    const addOns = this._getFromStorage('add_ons');
    const managedRouterAddon = addOns.find((a) => a.code === 'managed_router');
    const advancedAnalyticsAddon = addOns.find((a) => a.code === 'advanced_analytics');
    const performanceOptimizationAddon = addOns.find((a) => a.code === 'performance_optimization');

    let total = 0;
    for (const site of sites) {
      const accessPrice = site.selected_access_monthly_price || 0;
      let siteTotal = accessPrice;
      if (site.has_managed_router && managedRouterAddon && typeof managedRouterAddon.monthly_price === 'number') {
        siteTotal += managedRouterAddon.monthly_price;
      }
      total += siteTotal;
    }

    if (hasAdvancedAnalytics && advancedAnalyticsAddon && typeof advancedAnalyticsAddon.monthly_price === 'number') {
      total += advancedAnalyticsAddon.monthly_price;
    }
    if (hasPerformanceOptimization && performanceOptimizationAddon && typeof performanceOptimizationAddon.monthly_price === 'number') {
      total += performanceOptimizationAddon.monthly_price;
    }

    return total;
  }

  _calculateMobilePlanConfigurationPrice(plan, input, device) {
    if (!plan) return 0;
    const addOns = this._getFromStorage('add_ons');
    const roamingAddon = addOns.find((a) => a.code === 'international_roaming');

    let total = 0;
    // Base plan price
    total += plan.base_monthly_price || 0;

    // Per-line price if defined
    if (typeof plan.price_per_line === 'number') {
      total += plan.price_per_line * (input.total_lines || 0);
    }

    // Roaming cost per roaming line
    if (input.international_roaming_lines && roamingAddon && typeof roamingAddon.monthly_price === 'number') {
      total += roamingAddon.monthly_price * input.international_roaming_lines;
    }

    // Device monthly cost approximation
    if (device && typeof device.price === 'number') {
      if (input.device_payment_option === 'monthly_installments') {
        // Approximate 24-month installment
        const perLineMonthly = device.price / 24;
        total += perLineMonthly * (input.total_lines || 0);
      } else {
        // full_price: no monthly device cost, handled as one-time at cart level
      }
    }

    return total;
  }

  _calculateVoipConfigurationPrice(plan, term, input, device) {
    // Allow pricing even when a specific term record is not available.
    // When term is missing, fall back to the plan's base_price_per_user
    // and assume a 24-month amortization period for devices.
    if (!plan) return 0;
    const addOns = this._getFromStorage('add_ons');
    const callRecordingAddon = addOns.find((a) => a.code === 'call_recording');

    let total = 0;

    // Base per-user price for the chosen term (or plan default)
    const perUser = (term && typeof term.monthly_price_per_user === 'number')
      ? term.monthly_price_per_user
      : (plan.base_price_per_user || 0);
    total += perUser * (input.total_users || 0);

    // Call center agent surcharge
    if (plan.call_center_agent_surcharge && input.call_center_agents) {
      total += plan.call_center_agent_surcharge * input.call_center_agents;
    }

    // Call recording cost per agent
    if (input.call_recording_for_agents && callRecordingAddon && typeof callRecordingAddon.monthly_price === 'number') {
      total += callRecordingAddon.monthly_price * (input.call_center_agents || 0);
    }

    // Desk phone device amortized over term (or default 24 months)
    if (device && typeof device.price === 'number') {
      const months = (term && typeof term.term_months === 'number') ? term.term_months : 24;
      const perUserDeviceMonthly = device.price / months;
      total += perUserDeviceMonthly * (input.total_users || 0);
    }

    return total;
  }

  _calculateFirewallSelectionPrice(tier, protectedSites) {
    if (!tier) return 0;
    const sites = protectedSites || 0;
    return (tier.monthly_price || 0) * sites;
  }

  _findInternetUpgradeOptions(subscription, maxMonthlyPrice) {
    const internetPlans = this._getFromStorage('internet_plans');
    if (!subscription) return [];

    const currentPlan = this._findById(internetPlans, subscription.product_reference_id);
    const currentSpeed = currentPlan ? currentPlan.download_speed_mbps : subscription.download_speed_mbps || 0;

    let upgrades = internetPlans.filter((p) => {
      if (p.status !== 'active') return false;
      if (p.service_type !== 'business_internet') return false;
      if (typeof p.download_speed_mbps !== 'number') return false;
      if (p.download_speed_mbps <= currentSpeed) return false;
      if (typeof maxMonthlyPrice === 'number' && p.base_monthly_price > maxMonthlyPrice) return false;
      return true;
    });

    upgrades.sort((a, b) => a.download_speed_mbps - b.download_speed_mbps);
    return upgrades;
  }

  // -------------------- Home / Solutions --------------------

  getHomePageData() {
    const solutionCategories = this._getFromStorage('solution_categories');
    const internetPlans = this._getFromStorage('internet_plans').filter((p) => p.status === 'active');
    const mobilePlans = this._getFromStorage('mobile_plans').filter((p) => p.status === 'active');
    const firewallTiers = this._getFromStorage('managed_firewall_tiers');
    const coverageEntries = this._getFromStorage('coverage_entries');

    const featured_internet_plans = [...internetPlans]
      .sort((a, b) => (a.base_monthly_price || 0) - (b.base_monthly_price || 0))
      .slice(0, 3);

    const featured_mobile_plans = [...mobilePlans]
      .sort((a, b) => (a.base_monthly_price || 0) - (b.base_monthly_price || 0))
      .slice(0, 3);

    const featured_security_tiers = [...firewallTiers]
      .sort((a, b) => (a.monthly_price || 0) - (b.monthly_price || 0))
      .slice(0, 3);

    const show_coverage_checker_cta = coverageEntries.length > 0 || internetPlans.length > 0;
    const show_contact_sales_cta = internetPlans.length > 0 || mobilePlans.length > 0 || firewallTiers.length > 0;

    return {
      solution_categories: solutionCategories,
      featured_internet_plans,
      featured_mobile_plans,
      featured_security_tiers,
      show_coverage_checker_cta,
      show_contact_sales_cta
    };
  }

  getSolutionCategories() {
    return this._getFromStorage('solution_categories');
  }

  getSolutionCategoryFeaturedItems(category_code) {
    const categories = this._getFromStorage('solution_categories');
    const category = categories.find((c) => c.code === category_code) || null;

    const internetPlans = this._getFromStorage('internet_plans').filter(
      (p) => p.category_code === category_code && p.status === 'active'
    );
    const mobilePlans = this._getFromStorage('mobile_plans').filter(
      (p) => p.category_code === category_code && p.status === 'active'
    );
    const voipPlans = this._getFromStorage('voip_plans').filter(
      (p) => p.category_code === category_code && p.status === 'active'
    );
    const firewallTiers = this._getFromStorage('managed_firewall_tiers').filter(
      (p) => p.category_code === category_code
    );

    const featured_plans = [];

    for (const p of internetPlans.slice(0, 3)) {
      featured_plans.push({ plan_type: 'internet_plan', internet_plan: p });
    }
    for (const p of mobilePlans.slice(0, 3)) {
      featured_plans.push({ plan_type: 'mobile_plan', mobile_plan: p });
    }
    for (const p of voipPlans.slice(0, 3)) {
      featured_plans.push({ plan_type: 'voip_plan', voip_plan: p });
    }
    for (const p of firewallTiers.slice(0, 3)) {
      featured_plans.push({ plan_type: 'firewall_tier', firewall_tier: p });
    }

    return {
      category: category
        ? {
            id: category.id,
            code: category.code,
            name: category.name,
            description: category.description
          }
        : null,
      featured_plans
    };
  }

  // -------------------- Internet plans --------------------

  getInternetPlanFilterOptions(service_type, connection_type) {
    let plans = this._getFromStorage('internet_plans').filter((p) => p.status === 'active');
    if (service_type) {
      plans = plans.filter((p) => p.service_type === service_type);
    }
    if (connection_type) {
      plans = plans.filter((p) => p.connection_type === connection_type);
    }

    let minSpeed = null;
    let maxSpeed = null;
    let minPrice = null;
    let maxPrice = null;
    let supportsStaticIp = false;

    for (const p of plans) {
      if (typeof p.download_speed_mbps === 'number') {
        if (minSpeed === null || p.download_speed_mbps < minSpeed) minSpeed = p.download_speed_mbps;
        if (maxSpeed === null || p.download_speed_mbps > maxSpeed) maxSpeed = p.download_speed_mbps;
      }
      if (typeof p.base_monthly_price === 'number') {
        if (minPrice === null || p.base_monthly_price < minPrice) minPrice = p.base_monthly_price;
        if (maxPrice === null || p.base_monthly_price > maxPrice) maxPrice = p.base_monthly_price;
      }
      if (p.static_ip_included || p.static_ip_available) {
        supportsStaticIp = true;
      }
    }

    const sla_tiers = [
      { value: 'none', label: 'No SLA' },
      { value: 'standard_99_0', label: '99.0% Standard SLA' },
      { value: 'enhanced_99_5', label: '99.5% Enhanced SLA' },
      { value: 'premium_99_9', label: '99.9% Premium SLA' }
    ];

    const sort_options = [
      { value: 'price_asc', label: 'Price: Low to High' },
      { value: 'price_desc', label: 'Price: High to Low' },
      { value: 'bandwidth_desc', label: 'Speed: High to Low' },
      { value: 'featured', label: 'Featured' }
    ];

    return {
      min_download_speed_mbps: minSpeed || 0,
      max_download_speed_mbps: maxSpeed || 0,
      sla_tiers,
      supports_static_ip: supportsStaticIp,
      price_range: {
        min_price: minPrice || 0,
        max_price: maxPrice || 0
      },
      sort_options
    };
  }

  listInternetPlans(service_type, connection_type, filters, sort_by, limit, offset) {
    let plans = this._getFromStorage('internet_plans').filter((p) => p.status === 'active');

    if (service_type) {
      plans = plans.filter((p) => p.service_type === service_type);
    }
    if (connection_type) {
      plans = plans.filter((p) => p.connection_type === connection_type);
    }

    const slaRank = {
      none: 0,
      standard_99_0: 1,
      enhanced_99_5: 2,
      premium_99_9: 3
    };

    if (filters && typeof filters === 'object') {
      if (typeof filters.min_download_speed_mbps === 'number') {
        plans = plans.filter((p) => (p.download_speed_mbps || 0) >= filters.min_download_speed_mbps);
      }
      if (typeof filters.max_download_speed_mbps === 'number') {
        plans = plans.filter((p) => (p.download_speed_mbps || 0) <= filters.max_download_speed_mbps);
      }
      if (filters.require_static_ip_included) {
        plans = plans.filter((p) => p.static_ip_included === true);
      }
      if (filters.require_static_ip_available) {
        plans = plans.filter((p) => p.static_ip_available === true || p.static_ip_included === true);
      }
      if (filters.min_sla_tier) {
        const minRank = slaRank[filters.min_sla_tier] || 0;
        plans = plans.filter((p) => (slaRank[p.sla_tier] || 0) >= minRank);
      }
      if (typeof filters.max_base_monthly_price === 'number') {
        plans = plans.filter((p) => (p.base_monthly_price || 0) <= filters.max_base_monthly_price);
      }
      if (typeof filters.is_primary_service === 'boolean') {
        plans = plans.filter((p) => (p.is_primary_service || false) === filters.is_primary_service);
      }
      if (typeof filters.is_backup_service === 'boolean') {
        plans = plans.filter((p) => (p.is_backup_service || false) === filters.is_backup_service);
      }
    }

    if (sort_by === 'price_asc') {
      plans.sort((a, b) => (a.base_monthly_price || 0) - (b.base_monthly_price || 0));
    } else if (sort_by === 'price_desc') {
      plans.sort((a, b) => (b.base_monthly_price || 0) - (a.base_monthly_price || 0));
    } else if (sort_by === 'bandwidth_desc') {
      plans.sort((a, b) => (b.download_speed_mbps || 0) - (a.download_speed_mbps || 0));
    }

    const total_count = plans.length;
    const start = typeof offset === 'number' ? offset : 0;
    const end = typeof limit === 'number' ? start + limit : undefined;
    const paged = plans.slice(start, end);

    return { plans: paged, total_count };
  }

  getInternetPlanDetails(internet_plan_id) {
    const internetPlans = this._getFromStorage('internet_plans');
    const plan = internetPlans.find((p) => p.id === internet_plan_id) || null;
    if (!plan) {
      return {
        plan: null,
        category_name: null,
        sla_label: null,
        static_ip_available_as_add_on: false,
        estimated_total_monthly_price: 0
      };
    }

    const categories = this._getFromStorage('solution_categories');
    const category = categories.find((c) => c.code === plan.category_code) || null;

    let sla_label = 'No SLA';
    if (plan.sla_tier === 'standard_99_0') sla_label = '99.0% Standard SLA';
    else if (plan.sla_tier === 'enhanced_99_5') sla_label = '99.5% Enhanced SLA';
    else if (plan.sla_tier === 'premium_99_9') sla_label = '99.9% Premium SLA';

    const static_ip_available_as_add_on = !!plan.static_ip_available && !plan.static_ip_included;

    const estimated_total_monthly_price = plan.base_monthly_price || 0;

    return {
      plan,
      category_name: category ? category.name : null,
      sla_label,
      static_ip_available_as_add_on,
      estimated_total_monthly_price
    };
  }

  addInternetPlanToCart(internet_plan_id, quantity, add_on_codes) {
    const qty = typeof quantity === 'number' && quantity > 0 ? quantity : 1;
    const internetPlans = this._getFromStorage('internet_plans');
    const plan = internetPlans.find((p) => p.id === internet_plan_id) || null;
    if (!plan) {
      return { success: false, cart: null, added_item: null, message: 'Internet plan not found' };
    }

    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items');
    const addOns = this._getFromStorage('add_ons');

    const codes = Array.isArray(add_on_codes) ? add_on_codes : [];
    let addOnMonthlyTotal = 0;
    const appliedAddOns = [];
    for (const code of codes) {
      const addOn = addOns.find((a) => a.code === code);
      if (addOn) {
        appliedAddOns.push(addOn.code);
        if (addOn.is_recurring && typeof addOn.monthly_price === 'number') {
          addOnMonthlyTotal += addOn.monthly_price;
        }
      }
    }

    const itemMonthly = (plan.base_monthly_price || 0) + addOnMonthlyTotal;

    const cartItem = {
      id: this._generateId('cart_item'),
      cart_id: cart.id,
      item_type: plan.connection_type === 'wireless' ? 'wireless_plan' : 'internet_plan',
      reference_id: plan.id,
      name: plan.name,
      description: appliedAddOns.length ? 'Add-ons: ' + appliedAddOns.join(', ') : '',
      quantity: qty,
      monthly_price: itemMonthly,
      one_time_price: 0
    };

    cartItems.push(cartItem);
    this._saveToStorage('cart_items', cartItems);

    if (!Array.isArray(cart.items)) cart.items = [];
    cart.items.push(cartItem.id);
    cart.updated_at = this._nowIso();
    this._saveCart(cart);

    return { success: true, cart, added_item: cartItem, message: 'Internet plan added to cart' };
  }

  // -------------------- Mobile plans --------------------

  getMobilePlanFilterOptions() {
    const plans = this._getFromStorage('mobile_plans').filter((p) => p.status === 'active');

    let minLines = null;
    let maxLines = null;
    let minData = null;
    let maxData = null;

    for (const p of plans) {
      if (typeof p.min_lines === 'number') {
        if (minLines === null || p.min_lines < minLines) minLines = p.min_lines;
      }
      if (typeof p.max_lines === 'number') {
        if (maxLines === null || p.max_lines > maxLines) maxLines = p.max_lines;
      }
      if (typeof p.min_shared_data_gb === 'number') {
        if (minData === null || p.min_shared_data_gb < minData) minData = p.min_shared_data_gb;
      }
      if (typeof p.max_shared_data_gb === 'number') {
        if (maxData === null || p.max_shared_data_gb > maxData) maxData = p.max_shared_data_gb;
      }
    }

    const plan_families = [
      { value: 'basic', label: 'Basic' },
      { value: 'standard', label: 'Standard' },
      { value: 'premium', label: 'Premium' }
    ];

    const sort_options = [
      { value: 'price_asc', label: 'Price: Low to High' },
      { value: 'price_desc', label: 'Price: High to Low' },
      { value: 'lines_desc', label: 'Max Lines: High to Low' },
      { value: 'featured', label: 'Featured' }
    ];

    return {
      min_lines: minLines || 0,
      max_lines: maxLines || 0,
      min_shared_data_gb: minData || 0,
      max_shared_data_gb: maxData || 0,
      plan_families,
      sort_options
    };
  }

  listMobilePlans(filters, sort_by) {
    let plans = this._getFromStorage('mobile_plans').filter((p) => p.status === 'active');

    if (filters && typeof filters === 'object') {
      if (typeof filters.min_lines === 'number') {
        const lines = filters.min_lines;
        plans = plans.filter((p) => (p.max_lines == null || p.max_lines >= lines));
      }
      if (typeof filters.max_lines === 'number') {
        const lines = filters.max_lines;
        plans = plans.filter((p) => (p.min_lines == null || p.min_lines <= lines));
      }
      if (typeof filters.min_shared_data_gb === 'number') {
        const data = filters.min_shared_data_gb;
        plans = plans.filter((p) => (p.max_shared_data_gb == null || p.max_shared_data_gb >= data));
      }
      if (typeof filters.max_shared_data_gb === 'number') {
        const data = filters.max_shared_data_gb;
        plans = plans.filter((p) => (p.min_shared_data_gb == null || p.min_shared_data_gb <= data));
      }
      if (filters.plan_family) {
        plans = plans.filter((p) => p.plan_family === filters.plan_family);
      }
      if (typeof filters.supports_shared_data === 'boolean') {
        plans = plans.filter((p) => !!p.supports_shared_data === filters.supports_shared_data);
      }
      if (typeof filters.supports_international_roaming === 'boolean') {
        plans = plans.filter(
          (p) => !!p.supports_international_roaming === filters.supports_international_roaming
        );
      }
      if (typeof filters.max_base_monthly_price === 'number') {
        plans = plans.filter((p) => (p.base_monthly_price || 0) <= filters.max_base_monthly_price);
      }
    }

    if (sort_by === 'price_asc') {
      plans.sort((a, b) => (a.base_monthly_price || 0) - (b.base_monthly_price || 0));
    } else if (sort_by === 'price_desc') {
      plans.sort((a, b) => (b.base_monthly_price || 0) - (a.base_monthly_price || 0));
    } else if (sort_by === 'lines_desc') {
      plans.sort((a, b) => (b.max_lines || 0) - (a.max_lines || 0));
    }

    return { plans, total_count: plans.length };
  }

  getMobilePlanDetails(mobile_plan_id) {
    const plans = this._getFromStorage('mobile_plans');
    const plan = plans.find((p) => p.id === mobile_plan_id) || null;
    if (!plan) {
      return {
        plan: null,
        max_supported_lines: 0,
        max_supported_shared_data_gb: 0,
        supports_international_roaming: false,
        base_price_description: ''
      };
    }

    const max_supported_lines = plan.max_lines || plan.min_lines || 0;
    const max_supported_shared_data_gb = plan.max_shared_data_gb || plan.min_shared_data_gb || 0;
    const supports_international_roaming = !!plan.supports_international_roaming;

    let base_price_description = '';
    if (typeof plan.base_monthly_price === 'number') {
      base_price_description = `$${plan.base_monthly_price.toFixed(2)} base per month`;
      if (typeof plan.price_per_line === 'number') {
        base_price_description += ` + $${plan.price_per_line.toFixed(2)} per line`;
      }
    }

    return {
      plan,
      max_supported_lines,
      max_supported_shared_data_gb,
      supports_international_roaming,
      base_price_description
    };
  }

  getDeviceFilterOptions(device_category) {
    const devices = this._getFromStorage('devices').filter((d) => d.device_category === device_category);

    let minPrice = null;
    let maxPrice = null;
    const platformSet = new Set();
    let showMidTier = false;

    for (const d of devices) {
      if (typeof d.price === 'number') {
        if (minPrice === null || d.price < minPrice) minPrice = d.price;
        if (maxPrice === null || d.price > maxPrice) maxPrice = d.price;
      }
      if (d.platform) platformSet.add(d.platform);
      if (d.is_mid_tier) showMidTier = true;
    }

    const platforms = Array.from(platformSet).map((p) => ({ value: p, label: p.toUpperCase() }));

    return {
      price_range: {
        min_price: minPrice || 0,
        max_price: maxPrice || 0
      },
      platforms,
      show_mid_tier_filter: showMidTier
    };
  }

  listDevices(device_category, filters, sort_by) {
    let devices = this._getFromStorage('devices').filter((d) => d.device_category === device_category);

    if (filters && typeof filters === 'object') {
      if (typeof filters.max_price === 'number') {
        devices = devices.filter((d) => (d.price || 0) <= filters.max_price);
      }
      if (typeof filters.is_mid_tier === 'boolean') {
        devices = devices.filter((d) => !!d.is_mid_tier === filters.is_mid_tier);
      }
      if (filters.platform) {
        devices = devices.filter((d) => d.platform === filters.platform);
      }
    }

    if (sort_by === 'price_asc') {
      devices.sort((a, b) => (a.price || 0) - (b.price || 0));
    } else if (sort_by === 'price_desc') {
      devices.sort((a, b) => (b.price || 0) - (a.price || 0));
    } else if (sort_by === 'name_asc') {
      devices.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }

    return { devices, total_count: devices.length };
  }

  createMobilePlanConfiguration(
    mobile_plan_id,
    total_lines,
    shared_data_gb,
    international_roaming_lines,
    device_id,
    device_payment_option,
    configuration_id
  ) {
    const plans = this._getFromStorage('mobile_plans');
    const plan = plans.find((p) => p.id === mobile_plan_id) || null;
    if (!plan) {
      return { configuration: null, plan: null };
    }

    const devices = this._getFromStorage('devices');
    const device = device_id ? devices.find((d) => d.id === device_id) || null : null;

    let configs = this._getFromStorage('mobile_plan_configurations');
    let config;
    const now = this._nowIso();

    if (configuration_id) {
      const idx = configs.findIndex((c) => c.id === configuration_id);
      if (idx >= 0) {
        config = configs[idx];
      }
    }

    const input = {
      total_lines: total_lines || 0,
      shared_data_gb: shared_data_gb || 0,
      international_roaming_lines: international_roaming_lines || 0,
      device_payment_option: device_payment_option || 'monthly_installments'
    };

    const totalMonthly = this._calculateMobilePlanConfigurationPrice(plan, input, device);

    if (!config) {
      config = {
        id: this._generateId('mobile_config'),
        mobile_plan_id: mobile_plan_id,
        total_lines: input.total_lines,
        shared_data_gb: input.shared_data_gb,
        international_roaming_lines: input.international_roaming_lines,
        device_id: device ? device.id : null,
        device_payment_option: input.device_payment_option,
        total_monthly_cost: totalMonthly,
        created_at: now
      };
      configs.push(config);
    } else {
      config.mobile_plan_id = mobile_plan_id;
      config.total_lines = input.total_lines;
      config.shared_data_gb = input.shared_data_gb;
      config.international_roaming_lines = input.international_roaming_lines;
      config.device_id = device ? device.id : null;
      config.device_payment_option = input.device_payment_option;
      config.total_monthly_cost = totalMonthly;
    }

    this._saveToStorage('mobile_plan_configurations', configs);

    return { configuration: config, plan };
  }

  getMobilePlanConfiguration(configuration_id) {
    const configs = this._getFromStorage('mobile_plan_configurations');
    const config = configs.find((c) => c.id === configuration_id) || null;
    if (!config) {
      return { configuration: null, plan: null, device: null };
    }

    const plans = this._getFromStorage('mobile_plans');
    const devices = this._getFromStorage('devices');

    const plan = plans.find((p) => p.id === config.mobile_plan_id) || null;
    const device = config.device_id ? devices.find((d) => d.id === config.device_id) || null : null;

    return { configuration: config, plan, device };
  }

  addMobilePlanConfigurationToCart(configuration_id) {
    const configs = this._getFromStorage('mobile_plan_configurations');
    const config = configs.find((c) => c.id === configuration_id) || null;
    if (!config) {
      return { success: false, cart: null, added_item: null, message: 'Configuration not found' };
    }

    const plans = this._getFromStorage('mobile_plans');
    const plan = plans.find((p) => p.id === config.mobile_plan_id) || null;

    const devices = this._getFromStorage('devices');
    const device = config.device_id ? devices.find((d) => d.id === config.device_id) || null : null;

    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items');

    let oneTime = 0;
    if (device && config.device_payment_option === 'full_price') {
      oneTime = (device.price || 0) * (config.total_lines || 0);
    }

    const name = plan
      ? `${plan.name} - ${config.total_lines || 0} lines`
      : `Mobile Plan - ${config.total_lines || 0} lines`;

    const cartItem = {
      id: this._generateId('cart_item'),
      cart_id: cart.id,
      item_type: 'mobile_plan',
      reference_id: config.id,
      name,
      description: device ? `Device: ${device.name}` : '',
      quantity: 1,
      monthly_price: config.total_monthly_cost || 0,
      one_time_price: oneTime
    };

    cartItems.push(cartItem);
    this._saveToStorage('cart_items', cartItems);

    if (!Array.isArray(cart.items)) cart.items = [];
    cart.items.push(cartItem.id);
    cart.updated_at = this._nowIso();
    this._saveCart(cart);

    return { success: true, cart, added_item: cartItem, message: 'Mobile configuration added to cart' };
  }

  // -------------------- SD-WAN --------------------

  getSdwanConfiguratorInitData() {
    const access_types = this._getFromStorage('sdwan_access_types');
    const addOns = this._getFromStorage('add_ons');
    const optional_feature_add_ons = addOns.filter((a) =>
      a.code === 'advanced_analytics' || a.code === 'performance_optimization'
    );

    return { access_types, optional_feature_add_ons };
  }

  getSdwanAccessPricing(city, bandwidth_mbps) {
    const options = this._getFromStorage('sdwan_price_options');
    const bw = bandwidth_mbps || 0;
    return options.filter((o) => {
      if (o.city && city && o.city.toLowerCase() !== city.toLowerCase()) return false;
      if (typeof o.min_bandwidth_mbps === 'number' && bw < o.min_bandwidth_mbps) return false;
      if (typeof o.max_bandwidth_mbps === 'number' && bw > o.max_bandwidth_mbps) return false;
      return true;
    });
  }

  createOrUpdateSdwanConfiguration(
    configuration_id,
    name,
    sites,
    has_advanced_analytics,
    has_performance_optimization
  ) {
    let configs = this._getFromStorage('sdwan_configurations');
    let existingSites = this._getFromStorage('sdwan_sites');

    let config;
    const now = this._nowIso();

    if (configuration_id) {
      const idx = configs.findIndex((c) => c.id === configuration_id);
      if (idx >= 0) config = configs[idx];
    }

    if (!config) {
      config = {
        id: this._generateId('sdwan_config'),
        name: name || null,
        total_sites: 0,
        total_monthly_cost: 0,
        has_advanced_analytics: !!has_advanced_analytics,
        has_performance_optimization: !!has_performance_optimization,
        site_ids: [],
        created_at: now,
        updated_at: now
      };
      configs.push(config);
    } else {
      config.name = name || config.name || null;
      config.has_advanced_analytics = !!has_advanced_analytics;
      config.has_performance_optimization = !!has_performance_optimization;
      config.updated_at = now;
    }

    // Upsert sites for this configuration
    const newSiteIds = [];
    const sitesOutput = [];

    if (Array.isArray(sites)) {
      for (const inputSite of sites) {
        let site;
        if (inputSite.site_id) {
          const idx = existingSites.findIndex((s) => s.id === inputSite.site_id);
          if (idx >= 0) site = existingSites[idx];
        }

        if (!site) {
          site = {
            id: this._generateId('sdwan_site'),
            configuration_id: config.id,
            city: inputSite.city,
            bandwidth_mbps: inputSite.bandwidth_mbps,
            selected_access_type_code: inputSite.selected_access_type_code,
            selected_access_monthly_price: inputSite.selected_access_monthly_price,
            has_managed_router: !!inputSite.has_managed_router
          };
          existingSites.push(site);
        } else {
          site.configuration_id = config.id;
          site.city = inputSite.city;
          site.bandwidth_mbps = inputSite.bandwidth_mbps;
          site.selected_access_type_code = inputSite.selected_access_type_code;
          site.selected_access_monthly_price = inputSite.selected_access_monthly_price;
          site.has_managed_router = !!inputSite.has_managed_router;
        }

        newSiteIds.push(site.id);
        sitesOutput.push(site);
      }
    }

    config.site_ids = newSiteIds;
    config.total_sites = newSiteIds.length;
    config.total_monthly_cost = this._calculateSdwanConfigurationPrice(
      sitesOutput,
      config.has_advanced_analytics,
      config.has_performance_optimization
    );

    this._saveToStorage('sdwan_configurations', configs);
    this._saveToStorage('sdwan_sites', existingSites);

    return { configuration: config, sites: sitesOutput, total_monthly_cost: config.total_monthly_cost };
  }

  getSdwanConfiguration(configuration_id) {
    const configs = this._getFromStorage('sdwan_configurations');
    const config = configs.find((c) => c.id === configuration_id) || null;
    if (!config) {
      return { configuration: null, sites: [] };
    }

    const allSites = this._getFromStorage('sdwan_sites');
    const accessTypes = this._getFromStorage('sdwan_access_types');

    const sites = allSites
      .filter((s) => s.configuration_id === config.id)
      .map((s) => ({
        ...s,
        selected_access_type: accessTypes.find((a) => a.code === s.selected_access_type_code) || null
      }));

    return { configuration: config, sites };
  }

  addSdwanConfigurationToCart(configuration_id) {
    const configs = this._getFromStorage('sdwan_configurations');
    const config = configs.find((c) => c.id === configuration_id) || null;
    if (!config) {
      return { success: false, cart: null, added_item: null, message: 'SD-WAN configuration not found' };
    }

    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items');

    const name = config.name || `SD-WAN (${config.total_sites || 0} sites)`;

    const cartItem = {
      id: this._generateId('cart_item'),
      cart_id: cart.id,
      item_type: 'sdwan_configuration',
      reference_id: config.id,
      name,
      description: '',
      quantity: 1,
      monthly_price: config.total_monthly_cost || 0,
      one_time_price: 0
    };

    cartItems.push(cartItem);
    this._saveToStorage('cart_items', cartItems);

    if (!Array.isArray(cart.items)) cart.items = [];
    cart.items.push(cartItem.id);
    cart.updated_at = this._nowIso();
    this._saveCart(cart);

    return { success: true, cart, added_item: cartItem, message: 'SD-WAN configuration added to cart' };
  }

  // -------------------- VoIP --------------------

  getVoipConfiguratorInitData() {
    const voip_plans = this._getFromStorage('voip_plans').filter((p) => p.status === 'active');
    const voip_plan_terms = this._getFromStorage('voip_plan_terms');

    const deskPhones = this._getFromStorage('devices').filter((d) => d.device_category === 'desk_phone');
    let minPrice = null;
    let maxPrice = null;
    for (const d of deskPhones) {
      if (typeof d.price === 'number') {
        if (minPrice === null || d.price < minPrice) minPrice = d.price;
        if (maxPrice === null || d.price > maxPrice) maxPrice = d.price;
      }
    }

    const desk_phone_filter_options = {
      price_range: {
        min_price: minPrice || 0,
        max_price: maxPrice || 0
      }
    };

    return { voip_plans, voip_plan_terms, desk_phone_filter_options };
  }

  createVoipConfiguration(
    voip_plan_id,
    total_users,
    call_center_agents,
    call_recording_for_agents,
    desk_phone_device_id,
    contract_term_code,
    configuration_id
  ) {
    const voipPlans = this._getFromStorage('voip_plans');
    const plan = voipPlans.find((p) => p.id === voip_plan_id) || null;
    if (!plan) {
      return { configuration: null, plan: null, term: null, desk_phone: null };
    }

    const terms = this._getFromStorage('voip_plan_terms');
    const term = terms.find(
      (t) => t.voip_plan_id === voip_plan_id && t.term_code === contract_term_code
    ) || null;

    const devices = this._getFromStorage('devices');
    const desk_phone = desk_phone_device_id
      ? devices.find((d) => d.id === desk_phone_device_id) || null
      : null;

    let configs = this._getFromStorage('voip_configurations');
    let config;
    const now = this._nowIso();

    if (configuration_id) {
      const idx = configs.findIndex((c) => c.id === configuration_id);
      if (idx >= 0) config = configs[idx];
    }

    const input = {
      total_users: total_users || 0,
      call_center_agents: call_center_agents || 0,
      call_recording_for_agents: !!call_recording_for_agents
    };

    const monthly = this._calculateVoipConfigurationPrice(plan, term, input, desk_phone);

    if (!config) {
      config = {
        id: this._generateId('voip_config'),
        voip_plan_id,
        total_users: input.total_users,
        call_center_agents: input.call_center_agents,
        call_recording_for_agents: input.call_recording_for_agents,
        desk_phone_device_id: desk_phone ? desk_phone.id : null,
        contract_term_code,
        monthly_price_total: monthly,
        created_at: now
      };
      configs.push(config);
    } else {
      config.voip_plan_id = voip_plan_id;
      config.total_users = input.total_users;
      config.call_center_agents = input.call_center_agents;
      config.call_recording_for_agents = input.call_recording_for_agents;
      config.desk_phone_device_id = desk_phone ? desk_phone.id : null;
      config.contract_term_code = contract_term_code;
      config.monthly_price_total = monthly;
    }

    this._saveToStorage('voip_configurations', configs);

    return { configuration: config, plan, term, desk_phone };
  }

  getVoipConfiguration(configuration_id) {
    const configs = this._getFromStorage('voip_configurations');
    const config = configs.find((c) => c.id === configuration_id) || null;
    if (!config) {
      return { configuration: null, plan: null, term: null, desk_phone: null };
    }

    const voipPlans = this._getFromStorage('voip_plans');
    const plan = voipPlans.find((p) => p.id === config.voip_plan_id) || null;

    const terms = this._getFromStorage('voip_plan_terms');
    const term = terms.find(
      (t) => t.voip_plan_id === config.voip_plan_id && t.term_code === config.contract_term_code
    ) || null;

    const devices = this._getFromStorage('devices');
    const desk_phone = config.desk_phone_device_id
      ? devices.find((d) => d.id === config.desk_phone_device_id) || null
      : null;

    return { configuration: config, plan, term, desk_phone };
  }

  addVoipConfigurationToCart(configuration_id) {
    const configs = this._getFromStorage('voip_configurations');
    const config = configs.find((c) => c.id === configuration_id) || null;
    if (!config) {
      return { success: false, cart: null, added_item: null, message: 'VoIP configuration not found' };
    }

    const voipPlans = this._getFromStorage('voip_plans');
    const plan = voipPlans.find((p) => p.id === config.voip_plan_id) || null;

    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items');

    const name = plan
      ? `${plan.name} VoIP - ${config.total_users || 0} users`
      : `VoIP - ${config.total_users || 0} users`;

    const cartItem = {
      id: this._generateId('cart_item'),
      cart_id: cart.id,
      item_type: 'voip_configuration',
      reference_id: config.id,
      name,
      description: '',
      quantity: 1,
      monthly_price: config.monthly_price_total || 0,
      one_time_price: 0
    };

    cartItems.push(cartItem);
    this._saveToStorage('cart_items', cartItems);

    if (!Array.isArray(cart.items)) cart.items = [];
    cart.items.push(cartItem.id);
    cart.updated_at = this._nowIso();
    this._saveCart(cart);

    return { success: true, cart, added_item: cartItem, message: 'VoIP configuration added to cart' };
  }

  // -------------------- Firewall --------------------

  getFirewallTiersComparison() {
    return this._getFromStorage('managed_firewall_tiers');
  }

  createFirewallSelection(firewall_tier_id, protected_sites, selection_id) {
    const tiers = this._getFromStorage('managed_firewall_tiers');
    const tier = tiers.find((t) => t.id === firewall_tier_id) || null;
    if (!tier) {
      return { selection: null, tier: null };
    }

    let selections = this._getFromStorage('firewall_selections');
    let selection;
    const now = this._nowIso();

    if (selection_id) {
      const idx = selections.findIndex((s) => s.id === selection_id);
      if (idx >= 0) selection = selections[idx];
    }

    const sites = protected_sites || 0;
    const monthly = this._calculateFirewallSelectionPrice(tier, sites);

    if (!selection) {
      selection = {
        id: this._generateId('firewall_sel'),
        firewall_tier_id,
        protected_sites: sites,
        monthly_price_total: monthly,
        created_at: now
      };
      selections.push(selection);
    } else {
      selection.firewall_tier_id = firewall_tier_id;
      selection.protected_sites = sites;
      selection.monthly_price_total = monthly;
    }

    this._saveToStorage('firewall_selections', selections);

    return { selection, tier };
  }

  addFirewallSelectionToCart(selection_id) {
    const selections = this._getFromStorage('firewall_selections');
    const selection = selections.find((s) => s.id === selection_id) || null;
    if (!selection) {
      return { success: false, cart: null, added_item: null, message: 'Firewall selection not found' };
    }

    const tiers = this._getFromStorage('managed_firewall_tiers');
    const tier = tiers.find((t) => t.id === selection.firewall_tier_id) || null;

    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items');

    const name = tier
      ? `${tier.name} Firewall x${selection.protected_sites || 0}`
      : `Firewall x${selection.protected_sites || 0}`;

    const cartItem = {
      id: this._generateId('cart_item'),
      cart_id: cart.id,
      item_type: 'firewall_service',
      reference_id: selection.id,
      name,
      description: '',
      quantity: 1,
      monthly_price: selection.monthly_price_total || 0,
      one_time_price: 0
    };

    cartItems.push(cartItem);
    this._saveToStorage('cart_items', cartItems);

    if (!Array.isArray(cart.items)) cart.items = [];
    cart.items.push(cartItem.id);
    cart.updated_at = this._nowIso();
    this._saveCart(cart);

    return { success: true, cart, added_item: cartItem, message: 'Firewall service added to cart' };
  }

  // -------------------- Coverage --------------------

  checkCoverage(street, city, state, zip) {
    const entries = this._getFromStorage('coverage_entries');
    const normalize = (s) => (s || '').toString().trim().toLowerCase();

    const entry = entries.find(
      (e) =>
        normalize(e.street) === normalize(street) &&
        normalize(e.city) === normalize(city) &&
        normalize(e.state) === normalize(state) &&
        normalize(e.zip) === normalize(zip)
    ) || null;

    const fiber_available = entry ? !!entry.fiber_available : false;
    const wireless_available = entry ? !!entry.wireless_available : false;

    let recommended_primary_service_type = null;
    let recommended_backup_service_type = null;

    if (fiber_available) {
      recommended_primary_service_type = 'fiber';
      if (wireless_available) {
        recommended_backup_service_type = 'wireless';
      }
    } else if (wireless_available) {
      recommended_primary_service_type = 'wireless';
    }

    // Instrumentation for task completion tracking
    try {
      const existingRaw = localStorage.getItem('task7_coverageChecks');
      let data;
      if (existingRaw) {
        try {
          data = JSON.parse(existingRaw);
        } catch (e) {
          data = { checks: [] };
        }
      } else {
        data = { checks: [] };
      }
      if (!data || typeof data !== 'object') {
        data = { checks: [] };
      }
      if (!Array.isArray(data.checks)) {
        data.checks = [];
      }

      data.checks.push({
        street,
        city,
        state,
        zip,
        fiber_available,
        wireless_available,
        checked_at: this._nowIso()
      });

      localStorage.setItem('task7_coverageChecks', JSON.stringify(data));
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      coverage_entry: entry,
      fiber_available,
      wireless_available,
      recommended_primary_service_type,
      recommended_backup_service_type
    };
  }

  // -------------------- Cart & Checkout --------------------

  getCartSummary() {
    const cart = this._getOrCreateCart();
    const allItems = this._getFromStorage('cart_items');
    const itemsForCart = allItems.filter((ci) => ci.cart_id === cart.id);
    const enrichedItems = this._populateCartItems(itemsForCart);
    const totals = this._recalculateCartTotals(cart, itemsForCart);

    return {
      cart,
      items: enrichedItems,
      total_monthly_price: totals.total_monthly_price,
      total_one_time_price: totals.total_one_time_price
    };
  }

  updateCartItemQuantity(cart_item_id, quantity) {
    const qty = quantity > 0 ? quantity : 1;
    let cartItems = this._getFromStorage('cart_items');
    const idx = cartItems.findIndex((ci) => ci.id === cart_item_id);
    if (idx >= 0) {
      cartItems[idx].quantity = qty;
      this._saveToStorage('cart_items', cartItems);
    }

    const cart = this._getOrCreateCart();
    const itemsForCart = cartItems.filter((ci) => ci.cart_id === cart.id);
    const enrichedItems = this._populateCartItems(itemsForCart);

    return {
      cart,
      items: enrichedItems
    };
  }

  removeCartItem(cart_item_id) {
    let cartItems = this._getFromStorage('cart_items');
    const item = cartItems.find((ci) => ci.id === cart_item_id) || null;
    cartItems = cartItems.filter((ci) => ci.id !== cart_item_id);
    this._saveToStorage('cart_items', cartItems);

    const cart = this._getOrCreateCart();
    if (item && Array.isArray(cart.items)) {
      cart.items = cart.items.filter((id) => id !== cart_item_id);
      cart.updated_at = this._nowIso();
      this._saveCart(cart);
    }

    const itemsForCart = cartItems.filter((ci) => ci.cart_id === cart.id);
    const enrichedItems = this._populateCartItems(itemsForCart);

    return {
      cart,
      items: enrichedItems
    };
  }

  getCheckoutSummary() {
    // Same as cart summary; kept as separate interface for clarity
    return this.getCartSummary();
  }

  getInstallationOptions() {
    return this._getFromStorage('installation_options');
  }

  createOrUpdateCheckoutOrder(
    order_id,
    business_name,
    contact_email,
    contact_phone,
    service_address_street,
    service_address_city,
    service_address_state,
    service_address_zip,
    installation_option_id,
    installation_type,
    time_window_code,
    installation_date
  ) {
    let orders = this._getFromStorage('checkout_orders');
    const cart = this._getOrCreateCart();
    let order;
    const now = this._nowIso();

    if (order_id) {
      const idx = orders.findIndex((o) => o.id === order_id);
      if (idx >= 0) order = orders[idx];
    }

    const isoDate = new Date(installation_date).toISOString();

    if (!order) {
      order = {
        id: this._generateId('order'),
        cart_id: cart.id,
        business_name,
        contact_email,
        contact_phone,
        service_address_street,
        service_address_city,
        service_address_state,
        service_address_zip,
        installation_option_id: installation_option_id || null,
        installation_type,
        time_window_code,
        installation_date: isoDate,
        status: 'draft',
        created_at: now
      };
      orders.push(order);
    } else {
      order.cart_id = cart.id;
      order.business_name = business_name;
      order.contact_email = contact_email;
      order.contact_phone = contact_phone;
      order.service_address_street = service_address_street;
      order.service_address_city = service_address_city;
      order.service_address_state = service_address_state;
      order.service_address_zip = service_address_zip;
      order.installation_option_id = installation_option_id || null;
      order.installation_type = installation_type;
      order.time_window_code = time_window_code;
      order.installation_date = isoDate;
      // keep status as is (draft/submitted/etc.)
    }

    this._saveToStorage('checkout_orders', orders);

    return { order };
  }

  submitCheckoutOrder(order_id) {
    let orders = this._getFromStorage('checkout_orders');
    const idx = orders.findIndex((o) => o.id === order_id);
    if (idx === -1) {
      return { order: null, success: false, message: 'Order not found' };
    }

    const order = orders[idx];
    order.status = 'submitted';
    orders[idx] = order;
    this._saveToStorage('checkout_orders', orders);

    return { order, success: true, message: 'Order submitted' };
  }

  // -------------------- Support --------------------

  getSupportHubOptions() {
    const stored = this._getFromStorage('support_hub_options', null);
    if (stored) {
      return stored;
    }

    // Default minimal structure, no mocked contact details
    return {
      can_create_ticket: true,
      support_phone: '',
      support_email: '',
      urgent_ticket_hint: ''
    };
  }

  getSupportTicketFormOptions() {
    const categories = [
      { value: 'network_internet', label: 'Network / Internet' },
      { value: 'voice_collaboration', label: 'Voice & Collaboration' },
      { value: 'business_mobile', label: 'Business Mobile' },
      { value: 'security_services', label: 'Security Services' },
      { value: 'billing', label: 'Billing' },
      { value: 'other', label: 'Other' }
    ];

    const priorities = [
      { value: 'low', label: 'Low' },
      { value: 'medium', label: 'Medium' },
      { value: 'high', label: 'High' },
      { value: 'critical', label: 'Critical' }
    ];

    const branches = this._getFromStorage('branches');

    return { categories, priorities, branches };
  }

  createSupportTicket(
    category,
    affected_location_id,
    priority,
    subject,
    description,
    contact_name,
    callback_phone
  ) {
    let tickets = this._getFromStorage('support_tickets');
    const now = this._nowIso();

    const ticket = {
      id: this._generateId('ticket'),
      category,
      affected_location_id: affected_location_id || null,
      priority,
      subject,
      description,
      contact_name,
      callback_phone,
      status: 'open',
      created_at: now,
      updated_at: now
    };

    tickets.push(ticket);
    this._saveToStorage('support_tickets', tickets);

    return { ticket, success: true, message: 'Support ticket created' };
  }

  // -------------------- My Services / Upgrades --------------------

  getMyServicesOverview() {
    const subscriptions = this._getFromStorage('service_subscriptions');
    const internetPlans = this._getFromStorage('internet_plans');
    const mobilePlans = this._getFromStorage('mobile_plans');
    const voipPlans = this._getFromStorage('voip_plans');
    const firewallTiers = this._getFromStorage('managed_firewall_tiers');
    const sdwanConfigs = this._getFromStorage('sdwan_configurations');
    const addOns = this._getFromStorage('add_ons');

    return subscriptions.map((sub) => {
      const enriched = { ...sub };

      if (sub.product_type === 'internet_plan') {
        enriched.internet_plan = internetPlans.find((p) => p.id === sub.product_reference_id) || null;
      } else if (sub.product_type === 'mobile_plan') {
        enriched.mobile_plan = mobilePlans.find((p) => p.id === sub.product_reference_id) || null;
      } else if (sub.product_type === 'voip_plan') {
        enriched.voip_plan = voipPlans.find((p) => p.id === sub.product_reference_id) || null;
      } else if (sub.product_type === 'firewall_tier') {
        enriched.firewall_tier = firewallTiers.find((p) => p.id === sub.product_reference_id) || null;
      } else if (sub.product_type === 'sdwan_configuration') {
        enriched.sdwan_configuration = sdwanConfigs.find((p) => p.id === sub.product_reference_id) || null;
      }

      if (Array.isArray(sub.add_on_codes)) {
        enriched.add_ons = sub.add_on_codes
          .map((code) => addOns.find((a) => a.code === code) || null)
          .filter((a) => a);
      } else {
        enriched.add_ons = [];
      }

      return enriched;
    });
  }

  getServiceChangeOptions(service_subscription_id) {
    const subscriptions = this._getFromStorage('service_subscriptions');
    const subscription = subscriptions.find((s) => s.id === service_subscription_id) || null;
    if (!subscription) {
      return {
        subscription: null,
        current_internet_plan: null,
        upgrade_internet_plans: [],
        available_add_ons: [],
        available_terms_months: []
      };
    }

    const internetPlans = this._getFromStorage('internet_plans');
    const addOns = this._getFromStorage('add_ons');

    let current_internet_plan = null;
    let upgrade_internet_plans = [];

    if (subscription.service_type === 'business_internet') {
      current_internet_plan = internetPlans.find((p) => p.id === subscription.product_reference_id) || null;
      upgrade_internet_plans = this._findInternetUpgradeOptions(subscription);
    }

    const available_add_ons = addOns.filter((a) => {
      const applies = Array.isArray(a.applies_to_service_types) ? a.applies_to_service_types : [];
      return applies.includes('internet') || applies.includes('generic');
    });

    // Available terms derived from internet plans' contract_term_months
    const termSet = new Set();
    for (const p of internetPlans) {
      if (typeof p.contract_term_months === 'number') {
        termSet.add(p.contract_term_months);
      }
    }
    const available_terms_months = Array.from(termSet).sort((a, b) => a - b);

    // Enrich subscription as in overview
    const overviewArr = this.getMyServicesOverview();
    const enrichedSub = overviewArr.find((s) => s.id === service_subscription_id) || subscription;

    return {
      subscription: enrichedSub,
      current_internet_plan,
      upgrade_internet_plans,
      available_add_ons,
      available_terms_months
    };
  }

  updateInternetServiceSubscription(service_subscription_id, new_internet_plan_id, add_on_codes, term_months) {
    let subscriptions = this._getFromStorage('service_subscriptions');
    const idx = subscriptions.findIndex((s) => s.id === service_subscription_id);
    if (idx === -1) {
      return { subscription: null, new_internet_plan: null };
    }

    const subscription = subscriptions[idx];
    const internetPlans = this._getFromStorage('internet_plans');
    const plan = internetPlans.find((p) => p.id === new_internet_plan_id) || null;
    if (!plan) {
      return { subscription: null, new_internet_plan: null };
    }

    const addOns = this._getFromStorage('add_ons');
    const codes = Array.isArray(add_on_codes) ? add_on_codes : [];
    let addOnMonthlyTotal = 0;
    for (const code of codes) {
      const addOn = addOns.find((a) => a.code === code);
      if (addOn && addOn.is_recurring && typeof addOn.monthly_price === 'number') {
        addOnMonthlyTotal += addOn.monthly_price;
      }
    }

    subscription.product_reference_id = plan.id;
    subscription.product_type = 'internet_plan';
    subscription.service_type = 'business_internet';
    subscription.download_speed_mbps = plan.download_speed_mbps;
    subscription.upload_speed_mbps = plan.upload_speed_mbps;
    subscription.monthly_price = (plan.base_monthly_price || 0) + addOnMonthlyTotal;
    if (typeof term_months === 'number') {
      subscription.term_months = term_months;
    }
    subscription.add_on_codes = codes;

    subscriptions[idx] = subscription;
    this._saveToStorage('service_subscriptions', subscriptions);

    return { subscription, new_internet_plan: plan };
  }

  // -------------------- Static content --------------------

  getAboutPageContent() {
    const stored = this._getFromStorage('about_page_content', null);
    if (stored) return stored;

    return {
      mission: '',
      history: '',
      network_strengths: '',
      sla_summary: '',
      testimonials: []
    };
  }

  getContactPageContent() {
    const stored = this._getFromStorage('contact_page_content', null);
    if (stored) return stored;

    return {
      sales_phone: '',
      sales_email: '',
      support_phone: '',
      support_email: '',
      business_hours: '',
      contact_form_hint: ''
    };
  }

  getPoliciesPageContent() {
    const stored = this._getFromStorage('policies_page_content', null);
    if (stored) return stored;

    return {
      documents: [],
      sla_summaries: [],
      regulatory_disclosures: ''
    };
  }

  // -------------------- Legacy example from template (unused) --------------------

  // Kept only to satisfy template; not used in current domain logic
  addToCart(userId, productId, quantity = 1) {
    // This method is not used by the telecom business logic.
    // Implemented minimally to avoid breaking existing callers.
    let carts = this._getFromStorage('carts');
    let cartItems = this._getFromStorage('cartItems');

    let cart = carts.find((c) => c.userId === userId);
    if (!cart) {
      cart = { id: this._generateId('legacy_cart'), userId, items: [] };
      carts.push(cart);
    }

    const cartItem = {
      id: this._generateId('legacy_cart_item'),
      cartId: cart.id,
      productId,
      quantity
    };

    cart.items.push(cartItem.id);
    cartItems.push(cartItem);

    this._saveToStorage('carts', carts);
    this._saveToStorage('cartItems', cartItems);

    return { success: true, cartId: cart.id };
  }

  _findOrCreateCart(userId) {
    // Legacy helper, unused by main domain logic
    let carts = this._getFromStorage('carts');
    let cart = carts.find((c) => c.userId === userId);
    if (!cart) {
      cart = { id: this._generateId('legacy_cart'), userId, items: [] };
      carts.push(cart);
      this._saveToStorage('carts', carts);
    }
    return cart;
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