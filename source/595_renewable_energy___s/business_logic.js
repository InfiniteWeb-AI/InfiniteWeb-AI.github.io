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
    this._getNextIdCounter(); // ensure idCounter initialized
  }

  // -------------------- Storage helpers --------------------

  _initStorage() {
    // Initialize all data tables in localStorage if not exist
    const tableKeys = [
      // core commerce
      'products',
      'product_categories',
      'cart',
      'cart_items',
      'solar_packages',
      // calculators
      'calculator_scenarios',
      'calculator_recommendations',
      'savings_comparison_options',
      'calculator_leads',
      // consultations
      'consultation_appointments',
      // maintenance
      'maintenance_plans',
      'maintenance_subscription_checkouts',
      // site assessments
      'site_assessment_requests',
      // bundles
      'bundle_configurations',
      'financing_options',
      'bundle_orders',
      // content / navigation
      'articles',
      'reading_lists',
      'pages',
      'nav_links',
      // shop filter state
      'shop_filter_states',
      // legacy/demo keys (if any external code expects them)
      'users',
      'carts',
      'cartItems'
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

  _findById(collectionKey, id) {
    const items = this._getFromStorage(collectionKey);
    return items.find((item) => item.id === id) || null;
  }

  _updateById(collectionKey, id, updater) {
    const items = this._getFromStorage(collectionKey);
    const index = items.findIndex((item) => item.id === id);
    if (index === -1) return null;
    items[index] = updater(items[index]);
    this._saveToStorage(collectionKey, items);
    return items[index];
  }

  // -------------------- Cart helpers --------------------

  _getOrCreateCart() {
    let carts = this._getFromStorage('cart'); // array of Cart
    let cart = carts[0] || null;
    if (!cart) {
      cart = {
        id: this._generateId('cart'),
        items: [],
        createdAt: new Date().toISOString()
      };
      carts.push(cart);
      this._saveToStorage('cart', carts);
    }
    return cart;
  }

  _recalculateCartTotals(cartItemsForCart) {
    let subtotal = 0;
    let totalItems = 0;
    for (const ci of cartItemsForCart) {
      const lineTotal = ci.unit_price * ci.quantity;
      subtotal += lineTotal;
      totalItems += ci.quantity;
    }
    const taxRate = 0; // can be adjusted if needed
    const tax = subtotal * taxRate;
    const grand_total = subtotal + tax;
    return {
      subtotal,
      tax,
      grand_total,
      total_items: totalItems
    };
  }

  // -------------------- Reading list helper --------------------

  _getOrCreateReadingList() {
    let lists = this._getFromStorage('reading_lists');
    let list = lists[0] || null;
    if (!list) {
      list = {
        id: this._generateId('reading_list'),
        name: 'My Reading List',
        article_ids: [],
        createdAt: new Date().toISOString()
      };
      lists.push(list);
      this._saveToStorage('reading_lists', lists);
    }
    return list;
  }

  // -------------------- Calculator helpers --------------------

  _selectBestSavingsOption(options) {
    if (!options || options.length === 0) return { best: null, options: [] };
    let best = options[0];
    for (const opt of options) {
      if (opt.total_savings > best.total_savings) {
        best = opt;
      }
    }
    const updated = options.map((opt) => ({
      ...opt,
      is_best: opt.id === best.id
    }));
    return { best, options: updated };
  }

  // -------------------- Bundle helpers --------------------

  _generateBundleFinancingOptions(bundleConfiguration) {
    const financingOptions = this._getFromStorage('financing_options');
    const basePrice = bundleConfiguration.base_price || 0;

    // Simple example set of options
    const optionsToCreate = [
      {
        name: 'Solar Loan - 10 years',
        plan_type: 'loan',
        term_months: 120,
        monthly_multiplier: 0.009,
        down_payment: 0
      },
      {
        name: 'Solar Loan - 20 years',
        plan_type: 'loan',
        term_months: 240,
        monthly_multiplier: 0.006,
        down_payment: 0
      },
      {
        name: 'Solar Lease',
        plan_type: 'lease',
        term_months: 300,
        monthly_multiplier: 0.005,
        down_payment: 0
      }
    ];

    const created = optionsToCreate.map((def) => {
      const monthly_payment = Math.round(basePrice * def.monthly_multiplier * 100) / 100;
      const option = {
        id: this._generateId('financing_option'),
        bundleConfigurationId: bundleConfiguration.id,
        name: def.name,
        plan_type: def.plan_type,
        term_months: def.term_months,
        monthly_payment,
        down_payment: def.down_payment,
        is_selected: false
      };
      financingOptions.push(option);
      return option;
    });

    this._saveToStorage('financing_options', financingOptions);
    return created;
  }

  // -------------------- Consultation helpers --------------------

  _findAvailableConsultationSlots(consultation_type, property_type, duration_minutes, startDate, endDate) {
    const appointments = this._getFromStorage('consultation_appointments');

    const intervalMinutes = 30; // time slot granularity
    const slots = [];

    const startMs = startDate.getTime();
    const endMs = endDate.getTime();

    const durationMs = duration_minutes * 60 * 1000;

    for (let t = startMs; t + durationMs <= endMs; t += intervalMinutes * 60 * 1000) {
      const slotStart = new Date(t);
      const slotEnd = new Date(t + durationMs);

      // Business hours: 9:00-17:00 local time, Monday-Friday
      const day = slotStart.getDay(); // 0=Sun
      const hour = slotStart.getHours();
      if (day === 0 || day === 6) continue; // skip weekends
      if (hour < 9 || hour >= 17) continue;

      // Check conflicts
      const hasConflict = appointments.some((appt) => {
        if (appt.consultation_type !== consultation_type) return false;
        if (appt.property_type !== property_type) return false;
        const apptStart = new Date(appt.appointment_start).getTime();
        const apptEnd = apptStart + appt.duration_minutes * 60 * 1000;
        return t < apptEnd && t + durationMs > apptStart;
      });

      slots.push({
        start: slotStart.toISOString(),
        end: slotEnd.toISOString(),
        is_available: !hasConflict
      });
    }

    return {
      timezone: 'local',
      slots
    };
  }

  // -------------------- HOME & OVERVIEW CONTENT --------------------

  getHomePageContent() {
    const products = this._getFromStorage('products').filter((p) => p.is_active);
    const solarPackages = this._getFromStorage('solar_packages').filter((p) => p.is_active);
    const articles = this._getFromStorage('articles').filter((a) => a.is_published);

    // Featured products: first 4 active
    const featured_products = products.slice(0, 4);

    // Featured bundles (solar packages): first 3 active
    const featured_bundles = solarPackages.slice(0, 3);

    // Featured articles: newest 3
    const featured_articles = articles
      .slice()
      .sort((a, b) => new Date(b.publication_date) - new Date(a.publication_date))
      .slice(0, 3);

    const calculator_promos = [
      {
        mode: 'residential_sizing',
        title: 'Estimate your home solar savings',
        description: 'Use our residential solar calculator to size a system based on your bill.'
      },
      {
        mode: 'buy_vs_lease',
        title: 'Compare buying vs leasing solar',
        description: 'See 20-year savings projections for different ownership options.'
      }
    ];

    return {
      calculator_promos,
      featured_bundles,
      featured_articles,
      featured_products
    };
  }

  getResidentialSolarOverview() {
    const solarPackages = this._getFromStorage('solar_packages').filter(
      (p) => p.is_active && p.segment === 'residential'
    );

    const featured_packages = solarPackages.slice(0, 3);

    const calculator_promos = [
      {
        mode: 'residential_sizing',
        title: 'Right-size a system for your home',
        description: 'Estimate system size and savings from your monthly bill.'
      },
      {
        mode: 'buy_vs_lease',
        title: 'Decide whether to buy or lease',
        description: 'Compare long-term savings across financing options.'
      }
    ];

    return {
      intro_html:
        '<p>Residential rooftop solar can offset a large portion of your electricity bill. Explore typical system sizes and packages tailored for homes like yours.</p>',
      typical_system_sizes_kw: [4, 6, 8, 10],
      featured_packages,
      calculator_promos
    };
  }

  getCommercialSolarOverview() {
    const solarPackages = this._getFromStorage('solar_packages').filter(
      (p) => p.is_active && p.segment === 'commercial'
    );

    const featured_packages = solarPackages.slice(0, 3);

    const industry_examples = [
      {
        industry: 'retail',
        description: 'Lower operating costs and attract eco-conscious customers with rooftop solar.'
      },
      {
        industry: 'office',
        description: 'Stabilize long-term energy costs for your office portfolio.'
      },
      {
        industry: 'manufacturing',
        description: 'Offset high daytime loads with onsite solar generation.'
      }
    ];

    return {
      intro_html:
        '<p>Commercial solar solutions for retail, office, industrial and more, tailored to your load profile and roof or carport space.</p>',
      industry_examples,
      featured_packages
    };
  }

  getServicesOverviewContent() {
    const plans = this._getFromStorage('maintenance_plans').filter((p) => p.is_active);
    const highlighted_plans = plans.slice(0, 3);

    const other_services = [
      {
        name: 'System Monitoring',
        description: 'Remote performance monitoring to catch issues early.'
      },
      {
        name: 'Repair & Troubleshooting',
        description: 'Onsite diagnosis and repair for existing solar systems.'
      }
    ];

    return {
      intro_html:
        '<p>Protect your solar investment with flexible maintenance and monitoring services designed for long-term performance.</p>',
      highlighted_plans,
      other_services
    };
  }

  getAboutUsContent() {
    return {
      company_name: 'SunPath Renewables',
      mission_html:
        '<p>SunPath Renewables is dedicated to making clean energy simple, affordable, and reliable for homeowners and businesses.</p>',
      certifications: ['NABCEP Certified PV Installation Professionals', 'Licensed & Insured Electrical Contractors'],
      service_areas: ['California', 'Colorado', 'Texas', 'Georgia'],
      contact_summary: {
        phone: '+1 (800) 555-0199',
        email: 'info@sunpathrenewables.com'
      }
    };
  }

  // -------------------- CALCULATORS --------------------

  runResidentialSizingCalculator(zip_code, monthly_bill_amount, target_coverage_pct) {
    const now = new Date().toISOString();

    const scenarios = this._getFromStorage('calculator_scenarios');
    const recommendations = this._getFromStorage('calculator_recommendations');
    const solarPackages = this._getFromStorage('solar_packages').filter(
      (p) => p.is_active && p.segment === 'residential'
    );

    const scenario = {
      id: this._generateId('calc_scenario'),
      mode: 'residential_sizing',
      zip_code,
      monthly_bill_amount,
      target_coverage_pct,
      time_horizon_years: 25,
      createdAt: now
    };
    scenarios.push(scenario);
    this._saveToStorage('calculator_scenarios', scenarios);

    // Simple sizing heuristic: each kW offsets ~$20/month
    const targetOffset = monthly_bill_amount * (target_coverage_pct / 100);
    let system_size_kw = targetOffset / 20;
    system_size_kw = Math.max(1, Math.round(system_size_kw * 10) / 10);

    // Map to nearest larger residential package if available
    let matchedPackage = null;
    if (solarPackages.length > 0) {
      const candidates = solarPackages
        .filter((p) => p.system_size_kw >= system_size_kw)
        .sort((a, b) => a.system_size_kw - b.system_size_kw);
      matchedPackage = candidates[0] || solarPackages[0];
      system_size_kw = matchedPackage.system_size_kw;
    }

    const estimated_coverage_pct = target_coverage_pct;
    const estimated_upfront_cost = Math.round(system_size_kw * 2500);
    const estimated_monthly_savings = Math.round(targetOffset * 100) / 100;

    const recommendation = {
      id: this._generateId('calc_rec'),
      scenarioId: scenario.id,
      system_name: matchedPackage ? matchedPackage.name : `${system_size_kw} kW Home Solar`,
      system_size_kw,
      estimated_coverage_pct,
      estimated_upfront_cost,
      estimated_monthly_savings,
      packageId: matchedPackage ? matchedPackage.id : null,
      description: 'Recommended system based on your monthly bill and target coverage.'
    };

    recommendations.push(recommendation);
    this._saveToStorage('calculator_recommendations', recommendations);

    // Foreign key resolution: include scenario on each recommendation
    const recommendationsWithScenario = [
      {
        ...recommendation,
        scenario
      }
    ];

    return {
      scenario,
      recommendations: recommendationsWithScenario,
      primary_recommendation_id: recommendation.id
    };
  }

  runBuyVsLeaseComparison(zip_code, monthly_bill_amount, time_horizon_years) {
    const now = new Date().toISOString();

    const scenarios = this._getFromStorage('calculator_scenarios');
    const optionsStorage = this._getFromStorage('savings_comparison_options');

    const scenario = {
      id: this._generateId('calc_scenario'),
      mode: 'buy_vs_lease',
      zip_code,
      monthly_bill_amount,
      target_coverage_pct: null,
      time_horizon_years,
      createdAt: now
    };
    scenarios.push(scenario);
    this._saveToStorage('calculator_scenarios', scenarios);

    // Very simple model: buying usually yields higher total savings
    const years = time_horizon_years;
    const baseAnnualBill = monthly_bill_amount * 12;

    const buySavings = baseAnnualBill * 0.6 * years; // 60% reduction over horizon
    const leaseSavings = baseAnnualBill * 0.4 * years; // 40% reduction

    const buyOption = {
      id: this._generateId('savings_option'),
      scenarioId: scenario.id,
      option_type: 'buy',
      total_savings: Math.round(buySavings),
      net_cost: null,
      monthly_payment: null,
      is_best: false
    };

    const leaseOption = {
      id: this._generateId('savings_option'),
      scenarioId: scenario.id,
      option_type: 'lease',
      total_savings: Math.round(leaseSavings),
      net_cost: null,
      monthly_payment: null,
      is_best: false
    };

    let { best, options } = this._selectBestSavingsOption([buyOption, leaseOption]);

    // Persist options
    optionsStorage.push(...options);
    this._saveToStorage('savings_comparison_options', optionsStorage);

    // Attach scenario for foreign key
    const optionsWithScenario = options.map((opt) => ({
      ...opt,
      scenario
    }));

    return {
      scenario,
      options: optionsWithScenario,
      best_option_type: best ? best.option_type : null,
      best_option_id: best ? best.id : null
    };
  }

  submitResidentialQuoteRequest(scenarioId, recommendationId, name, email, phone) {
    const scenarios = this._getFromStorage('calculator_scenarios');
    const scenario = scenarios.find((s) => s.id === scenarioId) || null;

    const recommendations = this._getFromStorage('calculator_recommendations');
    const recommendation = recommendations.find((r) => r.id === recommendationId) || null;

    if (!scenario || !recommendation) {
      return {
        success: false,
        lead: null,
        message: 'Invalid scenario or recommendation ID.'
      };
    }

    const leads = this._getFromStorage('calculator_leads');

    const lead = {
      id: this._generateId('calc_lead'),
      lead_type: 'residential_quote',
      scenarioId,
      recommendationId,
      option_type: 'none',
      name,
      email,
      phone,
      createdAt: new Date().toISOString()
    };

    leads.push(lead);
    this._saveToStorage('calculator_leads', leads);

    // Foreign key resolution
    const leadWithRefs = {
      ...lead,
      scenario,
      recommendation
    };

    return {
      success: true,
      lead: leadWithRefs,
      message: 'Quote request submitted successfully.'
    };
  }

  submitBuyVsLeaseContact(scenarioId, option_type, name, email) {
    if (option_type !== 'buy' && option_type !== 'lease') {
      return {
        success: false,
        lead: null,
        message: 'option_type must be "buy" or "lease".'
      };
    }

    const scenarios = this._getFromStorage('calculator_scenarios');
    const scenario = scenarios.find((s) => s.id === scenarioId) || null;
    if (!scenario) {
      return {
        success: false,
        lead: null,
        message: 'Invalid scenario ID.'
      };
    }

    const options = this._getFromStorage('savings_comparison_options');
    const option = options.find((o) => o.scenarioId === scenarioId && o.option_type === option_type) || null;

    const leads = this._getFromStorage('calculator_leads');

    const lead = {
      id: this._generateId('calc_lead'),
      lead_type: 'buy_vs_lease_contact',
      scenarioId,
      recommendationId: null,
      option_type,
      name,
      email,
      phone: null,
      createdAt: new Date().toISOString()
    };

    leads.push(lead);
    this._saveToStorage('calculator_leads', leads);

    const leadWithRefs = {
      ...lead,
      scenario,
      savings_option: option || null
    };

    return {
      success: true,
      lead: leadWithRefs,
      message: 'Contact request submitted successfully.'
    };
  }

  // -------------------- SOLAR PACKAGES --------------------

  getSolarPackageFilterOptions(segment) {
    let packages = this._getFromStorage('solar_packages').filter((p) => p.is_active);
    if (segment) {
      packages = packages.filter((p) => p.segment === segment);
    }

    let min_price = null;
    let max_price = null;
    let min_system_size_kw = null;
    let max_system_size_kw = null;

    for (const p of packages) {
      if (min_price === null || p.price < min_price) min_price = p.price;
      if (max_price === null || p.price > max_price) max_price = p.price;
      if (min_system_size_kw === null || p.system_size_kw < min_system_size_kw) {
        min_system_size_kw = p.system_size_kw;
      }
      if (max_system_size_kw === null || p.system_size_kw > max_system_size_kw) {
        max_system_size_kw = p.system_size_kw;
      }
    }

    const sort_orders = [
      { key: 'price_low_to_high', label: 'Price: Low to High' },
      { key: 'price_high_to_low', label: 'Price: High to Low' },
      { key: 'size_low_to_high', label: 'System Size: Small to Large' },
      { key: 'size_high_to_low', label: 'System Size: Large to Small' },
      { key: 'warranty_high_to_low', label: 'Warranty: Longest First' }
    ];

    return {
      price_range: {
        min_price,
        max_price
      },
      system_size_range: {
        min_system_size_kw,
        max_system_size_kw
      },
      sort_orders
    };
  }

  listSolarPackages(segment, max_price, min_system_size_kw, max_system_size_kw, sort_order, limit, offset) {
    let items = this._getFromStorage('solar_packages').filter((p) => p.is_active);

    if (segment) {
      items = items.filter((p) => p.segment === segment);
    }
    if (typeof max_price === 'number') {
      items = items.filter((p) => p.price <= max_price);
    }
    if (typeof min_system_size_kw === 'number') {
      items = items.filter((p) => p.system_size_kw >= min_system_size_kw);
    }
    if (typeof max_system_size_kw === 'number') {
      items = items.filter((p) => p.system_size_kw <= max_system_size_kw);
    }

    const sortKey = sort_order || 'price_low_to_high';
    items = items.slice();

    if (sortKey === 'price_low_to_high') {
      items.sort((a, b) => a.price - b.price);
    } else if (sortKey === 'price_high_to_low') {
      items.sort((a, b) => b.price - a.price);
    } else if (sortKey === 'size_low_to_high') {
      items.sort((a, b) => a.system_size_kw - b.system_size_kw);
    } else if (sortKey === 'size_high_to_low') {
      items.sort((a, b) => b.system_size_kw - a.system_size_kw);
    } else if (sortKey === 'warranty_high_to_low') {
      items.sort((a, b) => b.warranty_years - a.warranty_years);
    }

    const total_count = items.length;

    const start = typeof offset === 'number' ? offset : 0;
    const end = typeof limit === 'number' ? start + limit : undefined;
    const pagedItems = items.slice(start, end);

    return {
      items: pagedItems,
      total_count,
      applied_filters: {
        segment: segment || null,
        max_price: typeof max_price === 'number' ? max_price : null,
        min_system_size_kw: typeof min_system_size_kw === 'number' ? min_system_size_kw : null,
        max_system_size_kw: typeof max_system_size_kw === 'number' ? max_system_size_kw : null,
        sort_order: sortKey,
        limit: typeof limit === 'number' ? limit : null,
        offset: typeof offset === 'number' ? offset : null
      }
    };
  }

  getSolarPackageDetail(packageId) {
    const packages = this._getFromStorage('solar_packages');
    const pkg = packages.find((p) => p.id === packageId) || null;
    if (!pkg) {
      return {
        package: null,
        related_packages: []
      };
    }

    const related_packages = packages
      .filter((p) => p.id !== pkg.id && p.segment === pkg.segment && p.is_active)
      .slice(0, 3);

    return {
      package: pkg,
      related_packages
    };
  }

  addSolarPackageToCart(packageId, quantity) {
    const pkg = this._findById('solar_packages', packageId);
    if (!pkg || !pkg.is_active) {
      return {
        success: false,
        cartId: null,
        added_item: null,
        message: 'Invalid or inactive solar package.'
      };
    }

    const qty = typeof quantity === 'number' && quantity > 0 ? quantity : 1;

    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items');

    let cartItem = cartItems.find(
      (ci) => ci.cartId === cart.id && ci.itemType === 'solar_package' && ci.itemId === packageId
    );

    if (cartItem) {
      cartItem.quantity += qty;
      cartItem.addedAt = new Date().toISOString();
    } else {
      cartItem = {
        id: this._generateId('cart_item'),
        cartId: cart.id,
        itemType: 'solar_package',
        itemId: packageId,
        name: pkg.name,
        unit_price: pkg.price,
        quantity: qty,
        addedAt: new Date().toISOString()
      };
      cartItems.push(cartItem);
    }

    this._saveToStorage('cart_items', cartItems);

    const added_item = {
      cart_item_id: cartItem.id,
      item_type: cartItem.itemType,
      item_id: cartItem.itemId,
      name: cartItem.name,
      unit_price: cartItem.unit_price,
      quantity: cartItem.quantity,
      line_total: cartItem.unit_price * cartItem.quantity
    };

    return {
      success: true,
      cartId: cart.id,
      added_item,
      message: 'Solar package added to cart.'
    };
  }

  submitSiteAssessmentRequest(packageId, system_size_kw, business_name, industry, zip_code, contact_email) {
    const requests = this._getFromStorage('site_assessment_requests');
    const pkg = packageId ? this._findById('solar_packages', packageId) : null;

    const request = {
      id: this._generateId('site_assessment'),
      packageId: packageId || null,
      system_size_kw: typeof system_size_kw === 'number' ? system_size_kw : pkg ? pkg.system_size_kw : null,
      business_name,
      industry,
      zip_code,
      contact_email,
      status: 'submitted',
      createdAt: new Date().toISOString()
    };

    requests.push(request);
    this._saveToStorage('site_assessment_requests', requests);

    const requestWithRefs = {
      ...request,
      package: pkg || null
    };

    return {
      request: requestWithRefs,
      success: true,
      message: 'Site assessment request submitted.'
    };
  }

  // -------------------- SHOP / PRODUCTS --------------------

  _getCategoryDescendantIds(categoryId, categories) {
    const result = [categoryId];
    const queue = [categoryId];
    while (queue.length > 0) {
      const current = queue.shift();
      const children = categories.filter((c) => c.parent_category_id === current);
      for (const child of children) {
        if (!result.includes(child.id)) {
          result.push(child.id);
          queue.push(child.id);
        }
      }
    }
    return result;
  }

  getShopFilterOptions() {
    const products = this._getFromStorage('products').filter((p) => p.is_active);
    const categories = this._getFromStorage('product_categories');

    let min_price = null;
    let max_price = null;
    for (const p of products) {
      if (min_price === null || p.price < min_price) min_price = p.price;
      if (max_price === null || p.price > max_price) max_price = p.price;
    }

    const rating_options = [
      { min_rating: 4.5, label: '4.5 stars & up' },
      { min_rating: 4.0, label: '4.0 stars & up' },
      { min_rating: 3.0, label: '3.0 stars & up' }
    ];

    const sort_orders = [
      { key: 'price_low_to_high', label: 'Price: Low to High' },
      { key: 'price_high_to_low', label: 'Price: High to Low' },
      { key: 'rating_high_to_low', label: 'Rating: High to Low' },
      { key: 'newest', label: 'Newest' }
    ];

    return {
      categories,
      price_range: {
        min_price,
        max_price
      },
      rating_options,
      sort_orders
    };
  }

  listShopProducts(categoryId, max_price, min_rating, sort_order, page, page_size) {
    const allProducts = this._getFromStorage('products').filter((p) => p.is_active);
    const categories = this._getFromStorage('product_categories');

    let items = allProducts;

    if (categoryId && categoryId !== 'all_products') {
      const category = categories.find((c) => c.id === categoryId) || null;
      if (category) {
        const ids = this._getCategoryDescendantIds(categoryId, categories);
        items = items.filter((p) => ids.includes(p.categoryId));
      } else {
        // unknown category -> no items
        items = [];
      }
    }

    if (typeof max_price === 'number') {
      items = items.filter((p) => p.price <= max_price);
    }
    if (typeof min_rating === 'number') {
      items = items.filter((p) => p.rating >= min_rating);
    }

    const sortKey = sort_order || 'price_low_to_high';
    items = items.slice();

    if (sortKey === 'price_low_to_high') {
      items.sort((a, b) => a.price - b.price);
    } else if (sortKey === 'price_high_to_low') {
      items.sort((a, b) => b.price - a.price);
    } else if (sortKey === 'rating_high_to_low') {
      items.sort((a, b) => b.rating - a.rating);
    } else if (sortKey === 'newest') {
      // As we don't have createdAt on products, approximate by idCounter (lexicographic)
      items.sort((a, b) => {
        const aid = parseInt((a.id || '').split('_').pop() || '0', 10);
        const bid = parseInt((b.id || '').split('_').pop() || '0', 10);
        return bid - aid;
      });
    }

    const total_count = items.length;
    const currentPage = page && page > 0 ? page : 1;
    const size = page_size && page_size > 0 ? page_size : 20;
    const start = (currentPage - 1) * size;
    const end = start + size;

    const pagedItems = items.slice(start, end).map((p) => ({
      ...p,
      category: categories.find((c) => c.id === p.categoryId) || null
    }));

    return {
      items: pagedItems,
      total_count,
      applied_filters: {
        categoryId: categoryId || null,
        max_price: typeof max_price === 'number' ? max_price : null,
        min_rating: typeof min_rating === 'number' ? min_rating : null,
        sort_order: sortKey,
        page: currentPage,
        page_size: size
      }
    };
  }

  getProductDetail(productId) {
    const products = this._getFromStorage('products');
    const product = products.find((p) => p.id === productId) || null;

    if (!product) {
      return {
        product: null,
        category: null,
        reviews: [],
        faqs: [],
        related_products: []
      };
    }

    const categories = this._getFromStorage('product_categories');
    const category = categories.find((c) => c.id === product.categoryId) || null;

    // We have no explicit review/FAQ storage, so return empty arrays
    const reviews = [];
    const faqs = [];

    const related_products = products
      .filter((p) => p.id !== product.id && p.categoryId === product.categoryId && p.is_active)
      .slice(0, 4);

    return {
      product,
      category,
      reviews,
      faqs,
      related_products
    };
  }

  addProductToCart(productId, quantity) {
    const product = this._findById('products', productId);
    if (!product || !product.is_active) {
      return {
        success: false,
        cartId: null,
        added_item: null,
        message: 'Invalid or inactive product.'
      };
    }

    const qty = typeof quantity === 'number' && quantity > 0 ? quantity : 1;

    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items');

    let cartItem = cartItems.find(
      (ci) => ci.cartId === cart.id && ci.itemType === 'product' && ci.itemId === productId
    );

    if (cartItem) {
      cartItem.quantity += qty;
      cartItem.addedAt = new Date().toISOString();
    } else {
      cartItem = {
        id: this._generateId('cart_item'),
        cartId: cart.id,
        itemType: 'product',
        itemId: productId,
        name: product.name,
        unit_price: product.price,
        quantity: qty,
        addedAt: new Date().toISOString()
      };
      cartItems.push(cartItem);
    }

    this._saveToStorage('cart_items', cartItems);

    const added_item = {
      cart_item_id: cartItem.id,
      item_type: cartItem.itemType,
      item_id: cartItem.itemId,
      name: cartItem.name,
      unit_price: cartItem.unit_price,
      quantity: cartItem.quantity,
      line_total: cartItem.unit_price * cartItem.quantity
    };

    return {
      success: true,
      cartId: cart.id,
      added_item,
      message: 'Product added to cart.'
    };
  }

  getCartContents() {
    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items');
    const products = this._getFromStorage('products');
    const solarPackages = this._getFromStorage('solar_packages');

    const itemsForCart = cartItems.filter((ci) => ci.cartId === cart.id);

    const items = itemsForCart.map((ci) => {
      let resolvedItem = null;
      let image_url = null;

      if (ci.itemType === 'product') {
        const product = products.find((p) => p.id === ci.itemId) || null;
        resolvedItem = product;
        image_url = product ? product.image_url || null : null;
      } else if (ci.itemType === 'solar_package') {
        const pkg = solarPackages.find((p) => p.id === ci.itemId) || null;
        resolvedItem = pkg;
        image_url = null;
      }

      return {
        cart_item_id: ci.id,
        item_type: ci.itemType,
        item_id: ci.itemId,
        name: ci.name,
        image_url,
        unit_price: ci.unit_price,
        quantity: ci.quantity,
        line_total: ci.unit_price * ci.quantity,
        // Foreign key resolution for generic itemId
        item: resolvedItem
      };
    });

    const totals = this._recalculateCartTotals(itemsForCart);

    return {
      cart: {
        id: cart.id,
        createdAt: cart.createdAt
      },
      items,
      totals
    };
  }

  updateCartItemQuantity(cartItemId, quantity) {
    const cartItems = this._getFromStorage('cart_items');
    const index = cartItems.findIndex((ci) => ci.id === cartItemId);
    if (index === -1) {
      return {
        success: false,
        cart: null,
        items: [],
        totals: null,
        message: 'Cart item not found.'
      };
    }

    if (quantity <= 0) {
      cartItems.splice(index, 1);
    } else {
      cartItems[index].quantity = quantity;
      cartItems[index].addedAt = new Date().toISOString();
    }

    this._saveToStorage('cart_items', cartItems);

    const cart = this._getOrCreateCart();
    const products = this._getFromStorage('products');
    const solarPackages = this._getFromStorage('solar_packages');

    const itemsForCart = cartItems.filter((ci) => ci.cartId === cart.id);

    const items = itemsForCart.map((ci) => {
      let resolvedItem = null;
      let image_url = null;
      if (ci.itemType === 'product') {
        const p = products.find((pr) => pr.id === ci.itemId) || null;
        resolvedItem = p;
        image_url = p ? p.image_url || null : null;
      } else if (ci.itemType === 'solar_package') {
        const pkg = solarPackages.find((sp) => sp.id === ci.itemId) || null;
        resolvedItem = pkg;
      }
      return {
        cart_item_id: ci.id,
        item_type: ci.itemType,
        item_id: ci.itemId,
        name: ci.name,
        image_url,
        unit_price: ci.unit_price,
        quantity: ci.quantity,
        line_total: ci.unit_price * ci.quantity,
        item: resolvedItem
      };
    });

    const totals = this._recalculateCartTotals(itemsForCart);

    return {
      success: true,
      cart: {
        id: cart.id,
        createdAt: cart.createdAt
      },
      items,
      totals,
      message: 'Cart item quantity updated.'
    };
  }

  removeCartItem(cartItemId) {
    const cartItems = this._getFromStorage('cart_items');
    const index = cartItems.findIndex((ci) => ci.id === cartItemId);
    if (index === -1) {
      return {
        success: false,
        cart: null,
        items: [],
        totals: null,
        message: 'Cart item not found.'
      };
    }

    cartItems.splice(index, 1);
    this._saveToStorage('cart_items', cartItems);

    const cart = this._getOrCreateCart();
    const products = this._getFromStorage('products');
    const solarPackages = this._getFromStorage('solar_packages');

    const itemsForCart = cartItems.filter((ci) => ci.cartId === cart.id);

    const items = itemsForCart.map((ci) => {
      let resolvedItem = null;
      let image_url = null;
      if (ci.itemType === 'product') {
        const p = products.find((pr) => pr.id === ci.itemId) || null;
        resolvedItem = p;
        image_url = p ? p.image_url || null : null;
      } else if (ci.itemType === 'solar_package') {
        const pkg = solarPackages.find((sp) => sp.id === ci.itemId) || null;
        resolvedItem = pkg;
      }
      return {
        cart_item_id: ci.id,
        item_type: ci.itemType,
        item_id: ci.itemId,
        name: ci.name,
        image_url,
        unit_price: ci.unit_price,
        quantity: ci.quantity,
        line_total: ci.unit_price * ci.quantity,
        item: resolvedItem
      };
    });

    const totals = this._recalculateCartTotals(itemsForCart);

    return {
      success: true,
      cart: {
        id: cart.id,
        createdAt: cart.createdAt
      },
      items,
      totals,
      message: 'Cart item removed.'
    };
  }

  // -------------------- CONSULTATIONS --------------------

  getConsultationBookingConfig() {
    return {
      consultation_types: [
        {
          value: 'virtual',
          label: 'Virtual Consultation',
          description: 'Meet with a solar consultant via video or phone.'
        },
        {
          value: 'in_person',
          label: 'In-Person Consultation',
          description: 'Onsite evaluation of your property by a solar consultant.'
        }
      ],
      property_types: [
        {
          value: 'one_story_home',
          label: '1-story home',
          description: 'Single-story residential home.'
        },
        {
          value: 'two_story_home',
          label: '2-story home',
          description: 'Two-story residential home.'
        },
        {
          value: 'multi_story_home',
          label: 'Multi-story home',
          description: 'Three or more stories.'
        },
        {
          value: 'townhouse',
          label: 'Townhouse',
          description: 'Attached residential townhouse.'
        },
        {
          value: 'commercial_property',
          label: 'Commercial property',
          description: 'Retail, office, or other commercial building.'
        },
        {
          value: 'other',
          label: 'Other',
          description: 'Other property type.'
        }
      ],
      default_duration_minutes: 30,
      time_slot_interval_minutes: 30
    };
  }

  getAvailableConsultationSlots(consultation_type, property_type, duration_minutes, start_date, end_date) {
    const startDate = new Date(start_date);
    const endDate = new Date(end_date);
    return this._findAvailableConsultationSlots(
      consultation_type,
      property_type,
      duration_minutes,
      startDate,
      endDate
    );
  }

  bookConsultationAppointment(consultation_type, property_type, appointment_start, duration_minutes, name, email, timezone) {
    const appointments = this._getFromStorage('consultation_appointments');

    const appointment = {
      id: this._generateId('consult_appt'),
      consultation_type,
      property_type,
      duration_minutes,
      appointment_start,
      timezone: timezone || 'local',
      name,
      email,
      status: 'scheduled',
      createdAt: new Date().toISOString()
    };

    appointments.push(appointment);
    this._saveToStorage('consultation_appointments', appointments);

    return {
      appointment,
      success: true,
      message: 'Consultation appointment booked.'
    };
  }

  // -------------------- MAINTENANCE PLANS --------------------

  listMaintenancePlans(coverage_type, max_monthly_price, include_inactive) {
    let plans = this._getFromStorage('maintenance_plans');

    if (!include_inactive) {
      plans = plans.filter((p) => p.is_active);
    }

    if (coverage_type) {
      plans = plans.filter((p) => p.coverage_type === coverage_type);
    }

    if (typeof max_monthly_price === 'number') {
      plans = plans.filter((p) => p.monthly_price <= max_monthly_price);
    }

    return {
      plans,
      total_count: plans.length
    };
  }

  getMaintenancePlanDetail(planId) {
    const plans = this._getFromStorage('maintenance_plans');
    const plan = plans.find((p) => p.id === planId) || null;

    return {
      plan
    };
  }

  startMaintenanceSubscriptionCheckout(planId, email, zip_code) {
    const plan = this._findById('maintenance_plans', planId);
    if (!plan) {
      return {
        checkout: null,
        success: false,
        message: 'Invalid maintenance plan ID.'
      };
    }

    const checkouts = this._getFromStorage('maintenance_subscription_checkouts');

    const checkout = {
      id: this._generateId('maint_checkout'),
      planId: plan.id,
      plan_name: plan.name,
      plan_monthly_price: plan.monthly_price,
      email,
      zip_code,
      status: 'proceed_to_payment',
      createdAt: new Date().toISOString()
    };

    checkouts.push(checkout);
    this._saveToStorage('maintenance_subscription_checkouts', checkouts);

    const checkoutWithPlan = {
      ...checkout,
      plan
    };

    return {
      checkout: checkoutWithPlan,
      success: true,
      message: 'Maintenance subscription checkout started.'
    };
  }

  // -------------------- BUNDLE CONFIGURATOR --------------------

  runBundleConfigurator(solar_size_kw, battery_capacity_kwh) {
    const configs = this._getFromStorage('bundle_configurations');
    const now = new Date().toISOString();

    // Simple pricing model
    const base_price = Math.round((solar_size_kw * 2500 + battery_capacity_kwh * 500) * 100) / 100;
    const estimated_monthly_savings = Math.round(solar_size_kw * 20 * 100) / 100;

    const bundle_configuration = {
      id: this._generateId('bundle_config'),
      name: `${solar_size_kw} kW Solar + ${battery_capacity_kwh} kWh Storage`,
      solar_size_kw,
      battery_capacity_kwh,
      base_price,
      estimated_monthly_savings,
      createdAt: now
    };

    configs.push(bundle_configuration);
    this._saveToStorage('bundle_configurations', configs);

    const summary_text = `Configured bundle with ${solar_size_kw} kW of solar and ${battery_capacity_kwh} kWh of storage.`;

    return {
      bundle_configuration,
      estimated_base_price: base_price,
      summary_text
    };
  }

  getFinancingOptionsForBundle(bundleConfigurationId) {
    const bundle = this._findById('bundle_configurations', bundleConfigurationId);
    if (!bundle) {
      return {
        bundle_configuration_id: bundleConfigurationId,
        base_price: null,
        financing_options: [],
        lowest_monthly_payment: null
      };
    }

    let options = this._getFromStorage('financing_options').filter(
      (o) => o.bundleConfigurationId === bundleConfigurationId
    );

    if (options.length === 0) {
      options = this._generateBundleFinancingOptions(bundle);
    }

    // Attach bundle configuration for foreign key resolution
    const optionsWithBundle = options.map((opt) => ({
      ...opt,
      bundle_configuration: bundle
    }));

    let lowest = null;
    for (const opt of options) {
      if (lowest === null || opt.monthly_payment < lowest) {
        lowest = opt.monthly_payment;
      }
    }

    return {
      bundle_configuration_id: bundleConfigurationId,
      base_price: bundle.base_price,
      financing_options: optionsWithBundle,
      lowest_monthly_payment: lowest
    };
  }

  selectFinancingOption(financingOptionId) {
    const options = this._getFromStorage('financing_options');
    const option = options.find((o) => o.id === financingOptionId) || null;
    if (!option) {
      return {
        financing_option: null,
        bundle_configuration_id: null
      };
    }

    // Set selected for this option, unselect others for same bundle
    const updatedOptions = options.map((o) => ({
      ...o,
      is_selected: o.id === financingOptionId ? true : o.bundleConfigurationId === option.bundleConfigurationId ? false : o.is_selected
    }));

    this._saveToStorage('financing_options', updatedOptions);

    const bundle = this._findById('bundle_configurations', option.bundleConfigurationId);

    return {
      financing_option: {
        ...option,
        is_selected: true,
        bundle_configuration: bundle || null
      },
      bundle_configuration_id: option.bundleConfigurationId
    };
  }

  createBundleOrder(bundleConfigurationId, financingOptionId) {
    const bundle = this._findById('bundle_configurations', bundleConfigurationId);
    const option = this._findById('financing_options', financingOptionId);

    if (!bundle || !option || option.bundleConfigurationId !== bundleConfigurationId) {
      return {
        order: null,
        summary: null
      };
    }

    const orders = this._getFromStorage('bundle_orders');

    const order = {
      id: this._generateId('bundle_order'),
      bundleConfigurationId,
      financingOptionId,
      status: 'configured',
      createdAt: new Date().toISOString()
    };

    orders.push(order);
    this._saveToStorage('bundle_orders', orders);

    const summary = {
      solar_size_kw: bundle.solar_size_kw,
      battery_capacity_kwh: bundle.battery_capacity_kwh,
      monthly_payment: option.monthly_payment,
      down_payment: option.down_payment,
      base_price: bundle.base_price
    };

    return {
      order,
      summary
    };
  }

  getBundleOrderSummary(orderId) {
    const order = this._findById('bundle_orders', orderId);
    if (!order) {
      return {
        order: null,
        bundle_configuration: null,
        financing_option: null
      };
    }

    const bundle = this._findById('bundle_configurations', order.bundleConfigurationId);
    const option = this._findById('financing_options', order.financingOptionId);

    return {
      order,
      bundle_configuration: bundle || null,
      financing_option: option || null
    };
  }

  updateBundleOrderStatus(orderId, status) {
    const allowed = ['configured', 'reviewed', 'submitted'];
    if (!allowed.includes(status)) {
      return {
        order: null,
        success: false,
        message: 'Invalid order status.'
      };
    }

    const updatedOrder = this._updateById('bundle_orders', orderId, (order) => ({
      ...order,
      status
    }));

    if (!updatedOrder) {
      return {
        order: null,
        success: false,
        message: 'Order not found.'
      };
    }

    return {
      order: updatedOrder,
      success: true,
      message: 'Order status updated.'
    };
  }

  // -------------------- ARTICLES & READING LIST --------------------

  getArticleFilterOptions() {
    const articles = this._getFromStorage('articles');
    const tagSet = new Set();

    for (const a of articles) {
      if (Array.isArray(a.tags)) {
        for (const t of a.tags) {
          if (t) tagSet.add(String(t));
        }
      }
      if (a.primary_tag) tagSet.add(String(a.primary_tag));
    }

    const tags = Array.from(tagSet).map((t) => ({ value: t, label: t }));

    const sort_orders = [
      { key: 'newest', label: 'Newest first' },
      { key: 'oldest', label: 'Oldest first' }
    ];

    return {
      tags,
      sort_orders
    };
  }

  listArticles(tag, published_after, sort_order, limit, offset) {
    let items = this._getFromStorage('articles').filter((a) => a.is_published);

    if (tag) {
      const lowerTag = String(tag).toLowerCase();
      items = items.filter((a) => {
        const tags = (a.tags || []).map((t) => String(t).toLowerCase());
        const primary = a.primary_tag ? String(a.primary_tag).toLowerCase() : null;
        return tags.includes(lowerTag) || primary === lowerTag;
      });
    }

    if (published_after) {
      const afterDate = new Date(published_after).getTime();
      if (!isNaN(afterDate)) {
        items = items.filter((a) => new Date(a.publication_date).getTime() > afterDate);
      }
    }

    const sortKey = sort_order || 'newest';
    items = items.slice();
    if (sortKey === 'newest') {
      items.sort((a, b) => new Date(b.publication_date) - new Date(a.publication_date));
    } else if (sortKey === 'oldest') {
      items.sort((a, b) => new Date(a.publication_date) - new Date(b.publication_date));
    }

    const total_count = items.length;
    const start = typeof offset === 'number' ? offset : 0;
    const end = typeof limit === 'number' ? start + limit : undefined;
    const pagedItems = items.slice(start, end);

    return {
      items: pagedItems,
      total_count,
      applied_filters: {
        tag: tag || null,
        published_after: published_after || null,
        sort_order: sortKey,
        limit: typeof limit === 'number' ? limit : null,
        offset: typeof offset === 'number' ? offset : null
      }
    };
  }

  getArticleDetail(articleId) {
    const article = this._findById('articles', articleId);
    if (!article) {
      return {
        article: null,
        is_saved: false
      };
    }

    const readingList = this._getOrCreateReadingList();
    const is_saved = readingList.article_ids.includes(articleId);

    return {
      article,
      is_saved
    };
  }

  getReadingList() {
    const reading_list = this._getOrCreateReadingList();
    const allArticles = this._getFromStorage('articles');
    const articles = allArticles.filter((a) => reading_list.article_ids.includes(a.id));

    return {
      reading_list,
      articles
    };
  }

  addArticleToReadingList(articleId) {
    const article = this._findById('articles', articleId);
    if (!article) {
      return {
        success: false,
        reading_list: null,
        message: 'Article not found.'
      };
    }

    const lists = this._getFromStorage('reading_lists');
    let reading_list = lists[0] || null;

    if (!reading_list) {
      reading_list = this._getOrCreateReadingList();
    }

    if (!Array.isArray(reading_list.article_ids)) {
      reading_list.article_ids = [];
    }

    if (!reading_list.article_ids.includes(articleId)) {
      reading_list.article_ids.push(articleId);
    }

    // Save back
    const updatedLists = lists.length > 0 ? lists.map((l) => (l.id === reading_list.id ? reading_list : l)) : [reading_list];
    this._saveToStorage('reading_lists', updatedLists);

    return {
      success: true,
      reading_list,
      message: 'Article added to reading list.'
    };
  }

  // -------------------- Legacy example method from skeleton --------------------
  // Not part of main interfaces, but kept for compatibility.
  addToCart(userId, productId, quantity = 1) {
    return this.addProductToCart(productId, quantity);
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
