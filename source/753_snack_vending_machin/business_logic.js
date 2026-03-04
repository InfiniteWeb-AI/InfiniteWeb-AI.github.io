'use strict';

// localStorage polyfill for Node.js and environments without localStorage
const localStorage = (function () {
  try {
    if (typeof globalThis !== 'undefined' && globalThis.localStorage) {
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

  // -------------------------
  // Storage helpers
  // -------------------------

  _initStorage() {
    // Entity tables
    const tableKeys = [
      'snack_items',
      'machine_models',
      'service_plans',
      'service_area_locations',
      'promotions',
      'machine_configurations',
      'snack_selection_items',
      'maintenance_requests',
      'revenue_estimates',
      'plan_quote_requests',
      'machine_requests',
      'configuration_quote_requests',
      'contact_messages',
      'promotion_requests'
    ];

    tableKeys.forEach((key) => {
      if (localStorage.getItem(key) === null) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    });

    // Simple CMS / config content
    if (localStorage.getItem('homepage_content') === null) {
      const defaultHomepage = {
        hero_title: 'Smart snack vending for offices & schools',
        hero_subtitle: 'Cashless-ready machines, curated snacks, and full-service maintenance.',
        value_props: [],
        featured_sections: []
      };
      localStorage.setItem('homepage_content', JSON.stringify(defaultHomepage));
    }

    if (localStorage.getItem('support_overview') === null) {
      const supportOverview = {
        intro_text: 'Need help with a machine? Our maintenance team is ready to assist.',
        options: [
          {
            key: 'request_maintenance',
            title: 'Request Maintenance',
            description: 'Schedule a technician visit for any vending machine issue.'
          }
        ],
        response_time_summary: 'Most issues are resolved within 1–2 business days.',
        maintenance_policy_summary: 'Maintenance is included for full-service and rental plans.',
        support_contact_phone: '',
        support_contact_email: ''
      };
      localStorage.setItem('support_overview', JSON.stringify(supportOverview));
    }

    if (localStorage.getItem('revenue_calculator_defaults') === null) {
      const revDefaults = {
        default_number_of_machines: 2,
        default_average_daily_users: 100,
        default_average_vend_price: 1.5,
        default_commission_percentage: 20,
        ranges: {
          machines_min: 1,
          machines_max: 20,
          users_min: 20,
          users_max: 1000,
          vend_price_min: 0.5,
          vend_price_max: 5,
          commission_min: 0,
          commission_max: 50
        }
      };
      localStorage.setItem('revenue_calculator_defaults', JSON.stringify(revDefaults));
    }

    if (localStorage.getItem('about_page_content') === null) {
      const about = {
        mission_statement: 'To make great snacks and drinks effortlessly available in every breakroom.',
        history: '',
        experience_summary: '',
        client_types: ['offices', 'schools', 'warehouses', 'gyms'],
        certifications: []
      };
      localStorage.setItem('about_page_content', JSON.stringify(about));
    }

    if (localStorage.getItem('faq_entries') === null) {
      localStorage.setItem('faq_entries', JSON.stringify([]));
    }

    if (localStorage.getItem('privacy_policy_content') === null) {
      const privacy = {
        last_updated: new Date().toISOString().slice(0, 10),
        content_html: ''
      };
      localStorage.setItem('privacy_policy_content', JSON.stringify(privacy));
    }

    if (localStorage.getItem('terms_and_conditions_content') === null) {
      const terms = {
        last_updated: new Date().toISOString().slice(0, 10),
        content_html: ''
      };
      localStorage.setItem('terms_and_conditions_content', JSON.stringify(terms));
    }

    if (localStorage.getItem('idCounter') === null) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, defaultValue) {
    const data = localStorage.getItem(key);
    if (!data) {
      return defaultValue !== undefined ? defaultValue : [];
    }
    try {
      return JSON.parse(data);
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

  // Utility: shallow clone + sort helper
  _sortArray(arr, compareFn) {
    return arr.slice().sort(compareFn);
  }

  // -------------------------
  // Helper functions required by spec
  // -------------------------

  // Internal helper to fetch or create the current MachineConfiguration
  _getOrCreateActiveMachineConfiguration() {
    let configs = this._getFromStorage('machine_configurations', []);
    let activeId = localStorage.getItem('active_machine_configuration_id');
    let config = null;

    if (activeId) {
      config = configs.find((c) => c.id === activeId) || null;
    }

    if (!config) {
      const newConfig = {
        id: this._generateId('config'),
        name: null,
        total_items: 0,
        max_price_per_item: null,
        is_vegan_only: false,
        min_required_healthy_items: null,
        min_required_nut_free_items: null,
        status: 'draft',
        notes: null,
        created_at: new Date().toISOString()
      };
      configs.push(newConfig);
      this._saveToStorage('machine_configurations', configs);
      localStorage.setItem('active_machine_configuration_id', newConfig.id);
      config = newConfig;
    }

    return config;
  }

  // Internal helper to calculate whether a MachineModel can be installed in a ZIP
  _validateServiceZipCoverage(machine, zip) {
    if (!zip) {
      return { canInstall: true, locations: [] };
    }
    const locations = this._getFromStorage('service_area_locations', []);
    const matchedLocations = [];

    if (Array.isArray(machine.service_area_ids)) {
      machine.service_area_ids.forEach((locId) => {
        const loc = locations.find((l) => l.id === locId);
        if (!loc) return;
        if (Array.isArray(loc.postal_codes) && loc.postal_codes.indexOf(zip) !== -1) {
          matchedLocations.push(loc);
        }
      });
    }

    return { canInstall: matchedLocations.length > 0, locations: matchedLocations };
  }

  // Internal helper to compute revenue fields
  _calculateRevenueFromInputs(numberOfMachines, averageDailyUsers, averageVendPrice, commissionPercentage) {
    // Treat averageDailyUsers as total users across all machines
    const estimatedDailyVends = Math.max(0, Number(averageDailyUsers) || 0);
    const daysPerMonth = 30;
    const estimatedMonthlyGrossRevenue = estimatedDailyVends * daysPerMonth * (Number(averageVendPrice) || 0);
    const commissionRate = (Number(commissionPercentage) || 0) / 100;
    const estimatedMonthlyCommissionAmount = estimatedMonthlyGrossRevenue * commissionRate;

    return {
      estimatedDailyVends,
      estimatedMonthlyGrossRevenue,
      estimatedMonthlyCommissionAmount
    };
  }

  // Internal helper used by getAvailableMaintenanceTimeSlots
  _getEarliestAvailableMaintenanceSlot(dates) {
    for (let i = 0; i < dates.length; i += 1) {
      const day = dates[i];
      if (!Array.isArray(day.time_slots)) continue;
      for (let j = 0; j < day.time_slots.length; j += 1) {
        const slot = day.time_slots[j];
        if (slot.is_available && slot.is_morning) {
          return { date: day.date, label: slot.label };
        }
      }
    }
    return { date: null, label: null };
  }

  // Internal helper to recompute configuration summary and persist total_items
  _recalculateConfigurationSummary(config) {
    const selectionItems = this._getFromStorage('snack_selection_items', []).filter(
      (s) => s.configuration_id === config.id
    );
    const snacks = this._getFromStorage('snack_items', []);

    let totalItems = 0;
    let healthyCount = 0;
    let nutFreeCount = 0;
    let veganCount = 0;
    let maxPrice = null;

    selectionItems.forEach((sel) => {
      const snack = snacks.find((s) => s.id === sel.snack_id);
      const qty = Number(sel.quantity) || 0;
      totalItems += qty;
      if (snack) {
        if (snack.price != null) {
          if (maxPrice === null || snack.price > maxPrice) {
            maxPrice = snack.price;
          }
        }
        if (snack.is_healthy) healthyCount += qty;
        if (snack.is_nut_free) nutFreeCount += qty;
        if (snack.is_vegan) veganCount += qty;
      }
    });

    config.total_items = totalItems;
    if (maxPrice !== null) {
      config.max_price_per_item = maxPrice;
    }

    const configs = this._getFromStorage('machine_configurations', []);
    const idx = configs.findIndex((c) => c.id === config.id);
    if (idx !== -1) {
      configs[idx] = config;
      this._saveToStorage('machine_configurations', configs);
    }

    return {
      total_items: totalItems,
      healthy_item_count: healthyCount,
      nut_free_item_count: nutFreeCount,
      vegan_item_count: veganCount,
      max_price_per_item: maxPrice
    };
  }

  // Resolve foreign keys for machine models -> service areas
  _attachServiceAreasToMachine(machine) {
    const locations = this._getFromStorage('service_area_locations', []);
    const serviceAreas = Array.isArray(machine.service_area_ids)
      ? machine.service_area_ids
          .map((id) => locations.find((l) => l.id === id) || null)
          .filter((x) => x !== null)
      : [];
    return Object.assign({}, machine, { service_areas: serviceAreas });
  }

  // -------------------------
  // Core interface implementations
  // -------------------------

  // getHomepageContent
  getHomepageContent() {
    const content = this._getFromStorage('homepage_content', {
      hero_title: '',
      hero_subtitle: '',
      value_props: [],
      featured_sections: []
    });
    return content;
  }

  // getPlanFilterOptions
  getPlanFilterOptions() {
    const plans = this._getFromStorage('service_plans', []);

    const rangesMap = new Map();
    plans.forEach((p) => {
      if (p.employee_min != null || p.employee_max != null || p.employee_range_label) {
        const key = (p.employee_min || 0) + '-' + (p.employee_max || 0) + '-' + (p.employee_range_label || '');
        if (!rangesMap.has(key)) {
          rangesMap.set(key, {
            min: p.employee_min || 0,
            max: p.employee_max || 0,
            label: p.employee_range_label || ((p.employee_min || 0) + '-' + (p.employee_max || '+'))
          });
        }
      }
    });

    const employee_ranges = Array.from(rangesMap.values()).sort((a, b) => a.min - b.min);

    const feature_filters = {
      supports_card_payments_label: 'Card / cashless payments',
      supports_mobile_payments_label: 'Mobile wallets (Apple Pay, Google Pay)',
      includes_maintenance_label: 'Includes maintenance',
      includes_restocking_label: 'Includes restocking service'
    };

    const plan_types_values = ['full_service', 'rental_only', 'commission_only', 'subsidized', 'free_placement'];
    const plan_types = plan_types_values.map((val) => ({
      value: val,
      label: val
        .split('_')
        .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
        .join(' ')
    }));

    const sort_options = [
      { value: 'price_asc', label: 'Price: Low to High' },
      { value: 'price_desc', label: 'Price: High to Low' },
      { value: 'employee_range_asc', label: 'Employee range: Small to Large' },
      { value: 'employee_range_desc', label: 'Employee range: Large to Small' }
    ];

    return {
      employee_ranges,
      feature_filters,
      plan_types,
      sort_options
    };
  }

  // listServicePlans
  listServicePlans(
    employeeCount,
    maxMonthlyPrice,
    requiresCardPayments,
    planTypes,
    recommendedMachineType,
    sortBy
  ) {
    let plans = this._getFromStorage('service_plans', []).filter((p) => p.status === 'active');

    if (employeeCount != null) {
      plans = plans.filter((p) => {
        const min = p.employee_min != null ? p.employee_min : -Infinity;
        const max = p.employee_max != null ? p.employee_max : Infinity;
        return employeeCount >= min && employeeCount <= max;
      });
    }

    if (maxMonthlyPrice != null) {
      plans = plans.filter((p) => p.monthly_price != null && p.monthly_price <= maxMonthlyPrice);
    }

    if (requiresCardPayments) {
      plans = plans.filter((p) => !!p.supports_card_payments);
    }

    if (Array.isArray(planTypes) && planTypes.length > 0) {
      plans = plans.filter((p) => p.plan_type && planTypes.indexOf(p.plan_type) !== -1);
    }

    if (recommendedMachineType) {
      plans = plans.filter((p) => p.recommended_machine_type === recommendedMachineType);
    }

    const effectiveSortBy = sortBy || 'price_asc';

    plans = this._sortArray(plans, (a, b) => {
      const aPrice = a.monthly_price != null ? a.monthly_price : 0;
      const bPrice = b.monthly_price != null ? b.monthly_price : 0;
      const aMin = a.employee_min != null ? a.employee_min : 0;
      const bMin = b.employee_min != null ? b.employee_min : 0;

      if (effectiveSortBy === 'price_desc') {
        if (bPrice !== aPrice) return bPrice - aPrice;
        return aMin - bMin;
      }
      if (effectiveSortBy === 'employee_range_asc') {
        if (aMin !== bMin) return aMin - bMin;
        return aPrice - bPrice;
      }
      if (effectiveSortBy === 'employee_range_desc') {
        if (aMin !== bMin) return bMin - aMin;
        return aPrice - bPrice;
      }
      // default price_asc
      if (aPrice !== bPrice) return aPrice - bPrice;
      return aMin - bMin;
    });

    return {
      plans,
      applied_filters: {
        employeeCount: employeeCount != null ? employeeCount : null,
        maxMonthlyPrice: maxMonthlyPrice != null ? maxMonthlyPrice : null,
        requiresCardPayments: !!requiresCardPayments,
        planTypes: Array.isArray(planTypes) ? planTypes : [],
        recommendedMachineType: recommendedMachineType || null,
        sortBy: effectiveSortBy
      },
      total_results: plans.length
    };
  }

  // getServicePlanDetails
  getServicePlanDetails(planId) {
    const plans = this._getFromStorage('service_plans', []);
    const plan = plans.find((p) => p.id === planId) || null;

    if (!plan) {
      return {
        plan: null,
        supported_payment_methods: [],
        recommended_machine_types: []
      };
    }

    const supported_payment_methods = [];
    if (plan.supports_cash_payments) supported_payment_methods.push('cash');
    if (plan.supports_card_payments) supported_payment_methods.push('card');
    if (plan.supports_mobile_payments) supported_payment_methods.push('mobile_pay');

    const recommended_machine_types = plan.recommended_machine_type
      ? [plan.recommended_machine_type]
      : [];

    return {
      plan,
      supported_payment_methods,
      recommended_machine_types
    };
  }

  // submitPlanQuoteRequest
  submitPlanQuoteRequest(
    planId,
    numberOfMachines,
    locationZip,
    locationAddress,
    contactName,
    contactPhone,
    contactEmail,
    companyName,
    notes
  ) {
    if (!planId || !contactName) {
      return {
        success: false,
        requestId: null,
        message: 'planId and contactName are required.',
        status: null
      };
    }

    const requests = this._getFromStorage('plan_quote_requests', []);
    const id = this._generateId('plan_quote');
    const now = new Date().toISOString();

    const request = {
      id,
      plan_id: planId,
      number_of_machines: numberOfMachines != null ? Number(numberOfMachines) : null,
      location_zip: locationZip || null,
      location_address: locationAddress || null,
      contact_name: contactName,
      contact_phone: contactPhone || null,
      contact_email: contactEmail || null,
      company_name: companyName || null,
      notes: notes || null,
      status: 'submitted',
      created_at: now,
      updated_at: null
    };

    requests.push(request);
    this._saveToStorage('plan_quote_requests', requests);

    return {
      success: true,
      requestId: id,
      message: 'Plan quote request submitted.',
      status: 'submitted'
    };
  }

  // getSnackFilterOptions
  getSnackFilterOptions() {
    const price_ranges = [
      { max_price: 1, label: 'Up to $1.00' },
      { max_price: 2, label: 'Up to $2.00' },
      { max_price: 3, label: 'Up to $3.00' }
    ];

    const rating_thresholds = [3, 4, 4.5];

    const health_tags = [
      { key: 'healthy', label: 'Healthy' },
      { key: 'low_calorie', label: 'Low calorie' }
    ];

    const dietary_tags = [{ key: 'vegan', label: 'Vegan' }];

    const allergy_tags = [{ key: 'nut_free', label: 'Nut-free' }];

    const categoryValues = [
      'chips',
      'candy',
      'nuts',
      'granola_bars',
      'cookies',
      'crackers',
      'gum_mints',
      'pastries',
      'drinks',
      'other_snacks'
    ];

    const categories = categoryValues.map((val) => ({
      value: val,
      label: val
        .split('_')
        .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
        .join(' ')
    }));

    const sort_options = [
      { value: 'price_asc', label: 'Price: Low to High' },
      { value: 'price_desc', label: 'Price: High to Low' },
      { value: 'rating_desc', label: 'Rating: High to Low' },
      { value: 'name_asc', label: 'Name: A to Z' }
    ];

    return {
      price_ranges,
      rating_thresholds,
      health_tags,
      dietary_tags,
      allergy_tags,
      categories,
      sort_options
    };
  }

  // listSnackItems
  listSnackItems(
    maxPrice,
    minRating,
    isHealthy,
    isLowCalorie,
    isVegan,
    isNutFree,
    categories,
    searchQuery,
    sortBy,
    page,
    pageSize
  ) {
    let items = this._getFromStorage('snack_items', []);

    if (maxPrice != null) {
      items = items.filter((s) => s.price != null && s.price <= maxPrice);
    }

    if (minRating != null) {
      items = items.filter((s) => s.rating != null && s.rating >= minRating);
    }

    if (isHealthy === true) {
      items = items.filter((s) => !!s.is_healthy);
    }

    if (isLowCalorie === true) {
      items = items.filter((s) => !!s.is_low_calorie);
    }

    if (isVegan === true) {
      items = items.filter((s) => !!s.is_vegan);
    }

    if (isNutFree === true) {
      items = items.filter((s) => !!s.is_nut_free);
    }

    if (Array.isArray(categories) && categories.length > 0) {
      items = items.filter((s) => s.category && categories.indexOf(s.category) !== -1);
    }

    if (searchQuery) {
      const q = String(searchQuery).toLowerCase();
      items = items.filter((s) => {
        const name = (s.name || '').toLowerCase();
        const brand = (s.brand || '').toLowerCase();
        return name.indexOf(q) !== -1 || brand.indexOf(q) !== -1;
      });
    }

    const effectiveSortBy = sortBy || 'price_asc';

    items = this._sortArray(items, (a, b) => {
      const aPrice = a.price != null ? a.price : 0;
      const bPrice = b.price != null ? b.price : 0;
      const aRating = a.rating != null ? a.rating : 0;
      const bRating = b.rating != null ? b.rating : 0;
      const aName = (a.name || '').toLowerCase();
      const bName = (b.name || '').toLowerCase();

      if (effectiveSortBy === 'price_desc') return bPrice - aPrice;
      if (effectiveSortBy === 'rating_desc') return bRating - aRating;
      if (effectiveSortBy === 'name_asc') return aName.localeCompare(bName);
      // default price_asc
      return aPrice - bPrice;
    });

    const effectivePageSize = pageSize && pageSize > 0 ? pageSize : 20;
    const effectivePage = page && page > 0 ? page : 1;
    const totalItems = items.length;
    const totalPages = totalItems === 0 ? 1 : Math.ceil(totalItems / effectivePageSize);
    const start = (effectivePage - 1) * effectivePageSize;
    const end = start + effectivePageSize;
    const pageItems = items.slice(start, end);

    return {
      items: pageItems,
      pagination: {
        page: effectivePage,
        pageSize: effectivePageSize,
        totalItems,
        totalPages
      },
      applied_filters: {
        maxPrice: maxPrice != null ? maxPrice : null,
        minRating: minRating != null ? minRating : null,
        isHealthy: !!isHealthy,
        isLowCalorie: !!isLowCalorie,
        isVegan: !!isVegan,
        isNutFree: !!isNutFree,
        categories: Array.isArray(categories) ? categories : [],
        searchQuery: searchQuery || null,
        sortBy: effectiveSortBy
      }
    };
  }

  // getActiveMachineConfiguration
  getActiveMachineConfiguration() {
    const config = this._getOrCreateActiveMachineConfiguration();
    const selectionItems = this._getFromStorage('snack_selection_items', []).filter(
      (s) => s.configuration_id === config.id
    );
    const snacks = this._getFromStorage('snack_items', []);

    const items = selectionItems.map((sel) => {
      const snack = snacks.find((s) => s.id === sel.snack_id) || null;
      return {
        selection_item_id: sel.id,
        snack_id: sel.snack_id,
        snack_name: snack ? snack.name : null,
        brand: snack ? snack.brand : null,
        price: snack ? snack.price : null,
        rating: snack ? snack.rating : null,
        is_healthy: snack ? !!snack.is_healthy : false,
        is_low_calorie: snack ? !!snack.is_low_calorie : false,
        is_vegan: snack ? !!snack.is_vegan : false,
        is_nut_free: snack ? !!snack.is_nut_free : false,
        category: snack ? snack.category : null,
        image_url: snack ? snack.image_url : null,
        quantity: sel.quantity,
        // Foreign key resolution (snack_id -> snack)
        snack: snack
      };
    });

    const summaryPartial = this._recalculateConfigurationSummary(config);

    const isVeganOnlyFlag =
      config.is_vegan_only != null
        ? !!config.is_vegan_only
        : items.length > 0
        ? items.every((i) => i.is_vegan)
        : false;

    const summary = {
      total_items: summaryPartial.total_items,
      total_unique_snacks: items.length,
      healthy_item_count: summaryPartial.healthy_item_count,
      nut_free_item_count: summaryPartial.nut_free_item_count,
      vegan_item_count: summaryPartial.vegan_item_count,
      max_price_per_item:
        config.max_price_per_item != null
          ? config.max_price_per_item
          : summaryPartial.max_price_per_item,
      min_required_healthy_items: config.min_required_healthy_items || 0,
      min_required_nut_free_items: config.min_required_nut_free_items || 0,
      is_vegan_only: isVeganOnlyFlag
    };

    return {
      configuration: config,
      items,
      summary
    };
  }

  // addSnackToActiveConfiguration
  addSnackToActiveConfiguration(snackId, quantity) {
    const qty = quantity != null ? Number(quantity) : 1;
    if (!snackId || qty <= 0) {
      return {
        success: false,
        configuration_id: null,
        total_items: 0,
        healthy_item_count: 0,
        nut_free_item_count: 0,
        vegan_item_count: 0,
        message: 'snackId and positive quantity are required.'
      };
    }

    const snacks = this._getFromStorage('snack_items', []);
    const snack = snacks.find((s) => s.id === snackId);
    if (!snack) {
      return {
        success: false,
        configuration_id: null,
        total_items: 0,
        healthy_item_count: 0,
        nut_free_item_count: 0,
        vegan_item_count: 0,
        message: 'Snack not found.'
      };
    }

    const config = this._getOrCreateActiveMachineConfiguration();
    const selectionItems = this._getFromStorage('snack_selection_items', []);
    const existing = selectionItems.find(
      (s) => s.configuration_id === config.id && s.snack_id === snackId
    );

    if (existing) {
      existing.quantity = (Number(existing.quantity) || 0) + qty;
    } else {
      const newSel = {
        id: this._generateId('snack_sel'),
        configuration_id: config.id,
        snack_id: snackId,
        quantity: qty
      };
      selectionItems.push(newSel);
    }

    this._saveToStorage('snack_selection_items', selectionItems);

    const summary = this._recalculateConfigurationSummary(config);

    return {
      success: true,
      configuration_id: config.id,
      total_items: summary.total_items,
      healthy_item_count: summary.healthy_item_count,
      nut_free_item_count: summary.nut_free_item_count,
      vegan_item_count: summary.vegan_item_count,
      message: 'Snack added to configuration.'
    };
  }

  // removeSnackFromActiveConfiguration
  removeSnackFromActiveConfiguration(snackId) {
    const config = this._getOrCreateActiveMachineConfiguration();
    let selectionItems = this._getFromStorage('snack_selection_items', []);

    const beforeCount = selectionItems.length;
    selectionItems = selectionItems.filter(
      (s) => !(s.configuration_id === config.id && s.snack_id === snackId)
    );

    this._saveToStorage('snack_selection_items', selectionItems);

    const summary = this._recalculateConfigurationSummary(config);

    const removed = beforeCount !== selectionItems.length;

    return {
      success: removed,
      configuration_id: config.id,
      total_items: summary.total_items,
      message: removed ? 'Snack removed from configuration.' : 'Snack not found in configuration.'
    };
  }

  // updateSnackQuantityInActiveConfiguration
  updateSnackQuantityInActiveConfiguration(snackId, quantity) {
    const config = this._getOrCreateActiveMachineConfiguration();
    let selectionItems = this._getFromStorage('snack_selection_items', []);
    const item = selectionItems.find(
      (s) => s.configuration_id === config.id && s.snack_id === snackId
    );

    if (!item) {
      return {
        success: false,
        configuration_id: config.id,
        total_items: config.total_items || 0,
        message: 'Snack not found in configuration.'
      };
    }

    const qty = Number(quantity) || 0;
    if (qty <= 0) {
      selectionItems = selectionItems.filter((s) => s !== item);
    } else {
      item.quantity = qty;
    }

    this._saveToStorage('snack_selection_items', selectionItems);

    const summary = this._recalculateConfigurationSummary(config);

    return {
      success: true,
      configuration_id: config.id,
      total_items: summary.total_items,
      message: 'Snack quantity updated.'
    };
  }

  // saveActiveMachineConfiguration
  saveActiveMachineConfiguration(
    name,
    maxPricePerItem,
    isVeganOnly,
    minRequiredHealthyItems,
    minRequiredNutFreeItems,
    notes
  ) {
    const config = this._getOrCreateActiveMachineConfiguration();
    const configs = this._getFromStorage('machine_configurations', []);
    const idx = configs.findIndex((c) => c.id === config.id);
    if (name !== undefined) config.name = name;
    if (maxPricePerItem !== undefined && maxPricePerItem !== null) {
      config.max_price_per_item = maxPricePerItem;
    }
    if (isVeganOnly !== undefined) config.is_vegan_only = !!isVeganOnly;
    if (minRequiredHealthyItems !== undefined && minRequiredHealthyItems !== null) {
      config.min_required_healthy_items = Number(minRequiredHealthyItems);
    }
    if (minRequiredNutFreeItems !== undefined && minRequiredNutFreeItems !== null) {
      config.min_required_nut_free_items = Number(minRequiredNutFreeItems);
    }
    if (notes !== undefined) config.notes = notes;
    config.status = 'saved';

    if (idx !== -1) {
      configs[idx] = config;
    } else {
      configs.push(config);
    }
    this._saveToStorage('machine_configurations', configs);

    return {
      success: true,
      configuration_id: config.id,
      status: 'saved',
      message: 'Configuration saved.'
    };
  }

  // requestQuoteForActiveConfiguration
  requestQuoteForActiveConfiguration(
    numberOfMachines,
    locationZip,
    locationAddress,
    contactName,
    contactPhone,
    contactEmail,
    companyName,
    notes
  ) {
    const config = this._getOrCreateActiveMachineConfiguration();
    if (!contactName) {
      return {
        success: false,
        configuration_id: config.id,
        quoteRequestId: null,
        status: null,
        message: 'contactName is required.'
      };
    }

    const requests = this._getFromStorage('configuration_quote_requests', []);
    const id = this._generateId('config_quote');
    const now = new Date().toISOString();

    const req = {
      id,
      configuration_id: config.id,
      number_of_machines: numberOfMachines != null ? Number(numberOfMachines) : null,
      location_zip: locationZip || null,
      location_address: locationAddress || null,
      contact_name: contactName,
      contact_phone: contactPhone || null,
      contact_email: contactEmail || null,
      company_name: companyName || null,
      notes: notes || null,
      status: 'submitted',
      created_at: now,
      updated_at: null
    };

    requests.push(req);
    this._saveToStorage('configuration_quote_requests', requests);

    // Update configuration status
    const configs = this._getFromStorage('machine_configurations', []);
    const idx = configs.findIndex((c) => c.id === config.id);
    if (idx !== -1) {
      configs[idx].status = 'quoted';
      this._saveToStorage('machine_configurations', configs);
    }

    return {
      success: true,
      configuration_id: config.id,
      quoteRequestId: id,
      status: 'submitted',
      message: 'Quote request submitted for configuration.'
    };
  }

  // getMachineFilterOptions
  getMachineFilterOptions() {
    const machine_types_values = ['snack', 'drink', 'combo'];
    const machine_types = machine_types_values.map((v) => ({
      value: v,
      label: v.charAt(0).toUpperCase() + v.slice(1) + ' machines'
    }));

    const capacity_ranges = [
      { min: 0, max: 249, label: 'Up to 250 items' },
      { min: 250, max: 349, label: '250–349 items' },
      { min: 350, max: Infinity, label: '350+ items' }
    ];

    const width_ranges = [
      { max_width_inches: 30, label: 'Up to 30" wide' },
      { max_width_inches: 36, label: 'Up to 36" wide' },
      { max_width_inches: 40, label: 'Up to 40" wide' }
    ];

    const sort_options = [
      { value: 'capacity_desc', label: 'Capacity: High to Low' },
      { value: 'capacity_asc', label: 'Capacity: Low to High' },
      { value: 'width_asc', label: 'Width: Narrow to Wide' },
      { value: 'name_asc', label: 'Name: A to Z' }
    ];

    return {
      machine_types,
      capacity_ranges,
      width_ranges,
      sort_options
    };
  }

  // listMachineModels
  listMachineModels(
    machineType,
    minCapacityTotal,
    maxWidthInches,
    serviceZip,
    sortBy,
    page,
    pageSize
  ) {
    let machines = this._getFromStorage('machine_models', []).filter((m) => m.is_active);

    if (machineType) {
      machines = machines.filter((m) => m.machine_type === machineType);
    }

    if (minCapacityTotal != null) {
      machines = machines.filter(
        (m) => m.capacity_total != null && m.capacity_total >= minCapacityTotal
      );
    }

    if (maxWidthInches != null) {
      machines = machines.filter(
        (m) => m.width_inches != null && m.width_inches <= maxWidthInches
      );
    }

    if (serviceZip) {
      machines = machines.filter((m) => this._validateServiceZipCoverage(m, serviceZip).canInstall);
    }

    const effectiveSortBy = sortBy || 'capacity_desc';

    machines = this._sortArray(machines, (a, b) => {
      const aCap = a.capacity_total != null ? a.capacity_total : 0;
      const bCap = b.capacity_total != null ? b.capacity_total : 0;
      const aWidth = a.width_inches != null ? a.width_inches : 0;
      const bWidth = b.width_inches != null ? b.width_inches : 0;
      const aName = (a.name || '').toLowerCase();
      const bName = (b.name || '').toLowerCase();

      if (effectiveSortBy === 'capacity_asc') return aCap - bCap;
      if (effectiveSortBy === 'width_asc') return aWidth - bWidth;
      if (effectiveSortBy === 'name_asc') return aName.localeCompare(bName);
      // default capacity_desc
      return bCap - aCap;
    });

    const effectivePageSize = pageSize && pageSize > 0 ? pageSize : 20;
    const effectivePage = page && page > 0 ? page : 1;
    const totalItems = machines.length;
    const totalPages = totalItems === 0 ? 1 : Math.ceil(totalItems / effectivePageSize);
    const start = (effectivePage - 1) * effectivePageSize;
    const end = start + effectivePageSize;
    const pageMachines = machines.slice(start, end).map((m) =>
      // Foreign key resolution: service_area_ids -> service_areas
      this._attachServiceAreasToMachine(m)
    );

    return {
      machines: pageMachines,
      pagination: {
        page: effectivePage,
        pageSize: effectivePageSize,
        totalItems,
        totalPages
      },
      applied_filters: {
        machineType: machineType || null,
        minCapacityTotal: minCapacityTotal != null ? minCapacityTotal : null,
        maxWidthInches: maxWidthInches != null ? maxWidthInches : null,
        serviceZip: serviceZip || null,
        sortBy: effectiveSortBy
      }
    };
  }

  // getMachineModelDetails
  getMachineModelDetails(machineId, lastCheckedZip) {
    const machines = this._getFromStorage('machine_models', []);
    const machineRaw = machines.find((m) => m.id === machineId) || null;

    if (!machineRaw) {
      return {
        machine: null,
        supported_payment_methods: [],
        coverage: {
          zip: lastCheckedZip || null,
          can_install_in_zip: false,
          notes: 'Machine not found.'
        }
      };
    }

    const machine = this._attachServiceAreasToMachine(machineRaw);

    const supported_payment_methods = [];
    if (machine.supports_cash_payments) supported_payment_methods.push('cash');
    if (machine.supports_card_payments) supported_payment_methods.push('card');
    if (machine.supports_mobile_payments) supported_payment_methods.push('mobile_pay');

    let coverage;
    if (lastCheckedZip) {
      const result = this._validateServiceZipCoverage(machine, lastCheckedZip);
      coverage = {
        zip: lastCheckedZip,
        can_install_in_zip: result.canInstall,
        notes: result.canInstall
          ? 'Service available in this ZIP.'
          : 'This machine cannot be installed in the specified ZIP based on current service areas.'
      };
    } else {
      coverage = {
        zip: null,
        can_install_in_zip: true,
        notes: 'ZIP not provided; coverage not checked.'
      };
    }

    // Instrumentation for task completion tracking (task_6)
    try {
      if (
        machine &&
        machine.machine_type === 'snack' &&
        machine.width_inches != null &&
        machine.width_inches <= 40
      ) {
        let existingIds = [];
        const existing = localStorage.getItem('task6_comparedMachineIds');
        if (existing) {
          try {
            const parsed = JSON.parse(existing);
            if (parsed && Array.isArray(parsed.ids)) {
              existingIds = parsed.ids;
            }
          } catch (e2) {
            // Swallow JSON parse errors for instrumentation
          }
        }
        if (existingIds.indexOf(machine.id) === -1) {
          existingIds.push(machine.id);
        }
        // Value to set: { ids: [ ... ] }
        localStorage.setItem(
          'task6_comparedMachineIds',
          JSON.stringify({ ids: existingIds })
        );
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      machine,
      supported_payment_methods,
      coverage
    };
  }

  // submitMachineRequest
  submitMachineRequest(
    machineId,
    requestType,
    machineType,
    numberOfMachines,
    preferredInstallationDate,
    locationZip,
    locationAddress,
    contactName,
    contactPhone,
    contactEmail,
    companyName,
    notes
  ) {
    if (!machineId || !requestType || !contactName || !numberOfMachines) {
      return {
        success: false,
        requestId: null,
        status: null,
        message: 'machineId, requestType, contactName, and numberOfMachines are required.'
      };
    }

    const requests = this._getFromStorage('machine_requests', []);
    const id = this._generateId('machine_req');
    const now = new Date().toISOString();

    const req = {
      id,
      machine_id: machineId,
      request_type: requestType,
      machine_type: machineType || null,
      number_of_machines: Number(numberOfMachines),
      preferred_installation_date: preferredInstallationDate || null,
      location_zip: locationZip || null,
      location_address: locationAddress || null,
      contact_name: contactName,
      contact_phone: contactPhone || null,
      contact_email: contactEmail || null,
      company_name: companyName || null,
      notes: notes || null,
      status: 'submitted',
      created_at: now,
      updated_at: null
    };

    requests.push(req);
    this._saveToStorage('machine_requests', requests);

    return {
      success: true,
      requestId: id,
      status: 'submitted',
      message: 'Machine request submitted.'
    };
  }

  // getSupportOverview
  getSupportOverview() {
    const overview = this._getFromStorage('support_overview', {
      intro_text: '',
      options: [],
      response_time_summary: '',
      maintenance_policy_summary: '',
      support_contact_phone: '',
      support_contact_email: ''
    });
    return overview;
  }

  // getMaintenanceIssueTypes
  getMaintenanceIssueTypes() {
    return [
      {
        value: 'coin_jam',
        label: 'Coin jam',
        description: 'Coins are stuck or not passing through the coin mechanism.'
      },
      {
        value: 'cash_payment_issue',
        label: 'Cash payment issue',
        description: 'Bills or coins are not being accepted correctly.'
      },
      {
        value: 'card_reader_issue',
        label: 'Card reader issue',
        description: 'Problems processing card or mobile payments.'
      },
      {
        value: 'product_jam',
        label: 'Product jam',
        description: 'Items are stuck and not dispensing.'
      },
      {
        value: 'other',
        label: 'Other',
        description: 'Any other issue not listed.'
      }
    ];
  }

  // getAvailableMaintenanceTimeSlots
  getAvailableMaintenanceTimeSlots(startDate, locationZip) {
    // Simulate availability based on today/startDate; ignore ZIP for now but keep parameter for future use
    const baseDate = startDate ? new Date(startDate) : new Date();

    const dates = [];
    for (let i = 0; i < 7; i += 1) {
      const d = new Date(baseDate.getTime());
      d.setDate(baseDate.getDate() + i);
      const isoDate = d.toISOString().slice(0, 10);

      const time_slots = [
        { label: '8:00–10:00 AM', is_morning: true, is_available: true },
        { label: '10:00 AM–12:00 PM', is_morning: true, is_available: true },
        { label: '1:00–3:00 PM', is_morning: false, is_available: true },
        { label: '3:00–5:00 PM', is_morning: false, is_available: true }
      ];

      dates.push({ date: isoDate, time_slots });
    }

    const earliestSlot = this._getEarliestAvailableMaintenanceSlot(dates);

    // Instrumentation for task completion tracking (task_4)
    try {
      // Value to set:
      // {
      //   "earliest_available_date": dates.length > 0 ? dates[0].date : null,
      //   "earliest_morning_slot": { "date": earliestSlot.date, "label": earliestSlot.label }
      // }
      localStorage.setItem(
        'task4_availableSlotsContext',
        JSON.stringify({
          earliest_available_date: dates.length > 0 ? dates[0].date : null,
          earliest_morning_slot: {
            date: earliestSlot.date,
            label: earliestSlot.label
          }
        })
      );
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      dates,
      earliest_available_date: dates.length > 0 ? dates[0].date : null,
      earliest_morning_slot: earliestSlot
    };
  }

  // submitMaintenanceRequest
  submitMaintenanceRequest(
    issueType,
    issueDescription,
    machineLocationAddress,
    additionalLocationDetails,
    preferredDate,
    preferredTimeSlotLabel,
    preferredTimeOfDay,
    contactName,
    contactPhone,
    contactEmail
  ) {
    if (!issueType || !machineLocationAddress || !contactName || !contactPhone) {
      return {
        success: false,
        maintenanceRequestId: null,
        status: null,
        message:
          'issueType, machineLocationAddress, contactName, and contactPhone are required.'
      };
    }

    const requests = this._getFromStorage('maintenance_requests', []);
    const id = this._generateId('maint');
    const now = new Date().toISOString();

    const req = {
      id,
      issue_type: issueType,
      issue_description: issueDescription || null,
      machine_location_address: machineLocationAddress,
      additional_location_details: additionalLocationDetails || null,
      preferred_date: preferredDate || null,
      preferred_time_slot_label: preferredTimeSlotLabel || null,
      preferred_time_of_day: preferredTimeOfDay || null,
      contact_name: contactName,
      contact_phone: contactPhone,
      contact_email: contactEmail || null,
      status: 'submitted',
      created_at: now,
      updated_at: null
    };

    requests.push(req);
    this._saveToStorage('maintenance_requests', requests);

    return {
      success: true,
      maintenanceRequestId: id,
      status: 'submitted',
      message: 'Maintenance request submitted.'
    };
  }

  // getRevenueCalculatorDefaults
  getRevenueCalculatorDefaults() {
    const defaults = this._getFromStorage('revenue_calculator_defaults', null);
    if (defaults) return defaults;

    // Fallback (should normally be initialized in _initStorage)
    const fallback = {
      default_number_of_machines: 2,
      default_average_daily_users: 100,
      default_average_vend_price: 1.5,
      default_commission_percentage: 20,
      ranges: {
        machines_min: 1,
        machines_max: 20,
        users_min: 20,
        users_max: 1000,
        vend_price_min: 0.5,
        vend_price_max: 5,
        commission_min: 0,
        commission_max: 50
      }
    };
    this._saveToStorage('revenue_calculator_defaults', fallback);
    return fallback;
  }

  // calculateRevenueEstimate
  calculateRevenueEstimate(numberOfMachines, averageDailyUsers, averageVendPrice, commissionPercentage) {
    const id = this._generateId('rev');
    const now = new Date().toISOString();

    const calc = this._calculateRevenueFromInputs(
      numberOfMachines,
      averageDailyUsers,
      averageVendPrice,
      commissionPercentage
    );

    const estimate = {
      id,
      number_of_machines: Number(numberOfMachines) || 0,
      average_daily_users: Number(averageDailyUsers) || 0,
      average_vend_price: Number(averageVendPrice) || 0,
      commission_percentage: Number(commissionPercentage) || 0,
      estimated_daily_vends: calc.estimatedDailyVends,
      estimated_monthly_gross_revenue: calc.estimatedMonthlyGrossRevenue,
      estimated_monthly_commission_amount: calc.estimatedMonthlyCommissionAmount,
      notes: null,
      created_at: now
    };

    const estimates = this._getFromStorage('revenue_estimates', []);
    estimates.push(estimate);
    this._saveToStorage('revenue_estimates', estimates);

    const summary_text =
      'Estimate for ' +
      estimate.number_of_machines +
      ' machines, ' +
      estimate.average_daily_users +
      ' daily users, $' +
      estimate.average_vend_price.toFixed(2) +
      ' per vend, ' +
      estimate.commission_percentage +
      '% commission.';

    return {
      estimate,
      summary_text
    };
  }

  // getContactFormOptions
  getContactFormOptions(context, officeId, relatedRevenueEstimateId, relatedPromotionId) {
    const offices = this.listServiceAreas(null, null, null, true);

    let default_office_id = officeId || null;
    if (!default_office_id && offices.length === 1) {
      default_office_id = offices[0].id;
    }

    let suggested_subjects = [];
    if (context === 'revenue_calculator') {
      suggested_subjects = ['Revenue share proposal', 'Revenue estimate questions'];
    } else if (context === 'service_areas_page' || context === 'location_detail_page') {
      suggested_subjects = ['Service availability inquiry'];
    } else if (context === 'promotion_detail_page') {
      suggested_subjects = ['Promotion inquiry'];
    } else {
      suggested_subjects = ['General question'];
    }

    return {
      offices,
      default_office_id,
      suggested_subjects
    };
  }

  // submitContactMessage
  submitContactMessage(
    source,
    officeId,
    subject,
    messageBody,
    contactName,
    contactEmail,
    contactPhone,
    companyName,
    relatedRevenueEstimateId,
    relatedPromotionId
  ) {
    if (!messageBody || !contactName) {
      return {
        success: false,
        contactMessageId: null,
        message: 'messageBody and contactName are required.'
      };
    }

    const messages = this._getFromStorage('contact_messages', []);
    const id = this._generateId('contact');
    const now = new Date().toISOString();

    const msg = {
      id,
      source: source || null,
      office_id: officeId || null,
      subject: subject || null,
      message_body: messageBody,
      contact_name: contactName,
      contact_email: contactEmail || null,
      contact_phone: contactPhone || null,
      company_name: companyName || null,
      related_revenue_estimate_id: relatedRevenueEstimateId || null,
      related_promotion_id: relatedPromotionId || null,
      created_at: now
    };

    messages.push(msg);
    this._saveToStorage('contact_messages', messages);

    return {
      success: true,
      contactMessageId: id,
      message: 'Contact message submitted.'
    };
  }

  // listServiceAreas
  listServiceAreas(city, state, postalCode, onlyActive) {
    const onlyActiveFlag = onlyActive === undefined ? true : !!onlyActive;
    let locations = this._getFromStorage('service_area_locations', []);

    if (onlyActiveFlag) {
      locations = locations.filter((l) => l.is_active);
    }

    if (city) {
      const cLower = city.toLowerCase();
      locations = locations.filter((l) => (l.city || '').toLowerCase() === cLower);
    }

    if (state) {
      const sLower = state.toLowerCase();
      locations = locations.filter((l) => (l.state || '').toLowerCase() === sLower);
    }

    if (postalCode) {
      locations = locations.filter((l) => {
        if (!Array.isArray(l.postal_codes)) return false;
        return l.postal_codes.indexOf(postalCode) !== -1;
      });
    }

    return locations;
  }

  // getServiceAreaDetails
  getServiceAreaDetails(slug) {
    const locations = this._getFromStorage('service_area_locations', []);
    const location = locations.find((l) => l.slug === slug) || null;

    if (!location) {
      return {
        location: null,
        coverage_summary: 'Location not found.',
        getting_started_instructions: ''
      };
    }

    const coverage_summary = location.city
      ? 'We provide vending services in and around ' + location.city + '.'
      : 'Service area details.';

    const getting_started_instructions =
      'To get started in this service area, submit a contact form and our local team will follow up.';

    return {
      location,
      coverage_summary,
      getting_started_instructions
    };
  }

  // listPromotions
  listPromotions(promotionType, isNewCustomer, status) {
    const desiredStatus = status || 'active';
    let promotions = this._getFromStorage('promotions', []).filter(
      (p) => !desiredStatus || p.status === desiredStatus
    );

    if (promotionType) {
      promotions = promotions.filter((p) => p.promotion_type === promotionType);
    }

    if (isNewCustomer !== undefined && isNewCustomer !== null) {
      promotions = promotions.filter((p) => !!p.is_new_customer === !!isNewCustomer);
    }

    return promotions;
  }

  // getPromotionDetails
  getPromotionDetails(promotionId) {
    const promotions = this._getFromStorage('promotions', []);
    const promotion = promotions.find((p) => p.id === promotionId) || null;
    return { promotion };
  }

  // submitPromotionRequest
  submitPromotionRequest(
    promotionId,
    businessType,
    contactName,
    contactEmail,
    contactPhone,
    companyName,
    notes
  ) {
    if (!promotionId || !contactName) {
      return {
        success: false,
        promotionRequestId: null,
        status: null,
        message: 'promotionId and contactName are required.'
      };
    }

    const requests = this._getFromStorage('promotion_requests', []);
    const id = this._generateId('promo_req');
    const now = new Date().toISOString();

    const req = {
      id,
      promotion_id: promotionId,
      business_type: businessType || null,
      contact_name: contactName,
      contact_email: contactEmail || null,
      contact_phone: contactPhone || null,
      company_name: companyName || null,
      notes: notes || null,
      status: 'submitted',
      created_at: now,
      updated_at: null
    };

    requests.push(req);
    this._saveToStorage('promotion_requests', requests);

    return {
      success: true,
      promotionRequestId: id,
      status: 'submitted',
      message: 'Promotion request submitted.'
    };
  }

  // getAboutPageContent
  getAboutPageContent() {
    const about = this._getFromStorage('about_page_content', {
      mission_statement: '',
      history: '',
      experience_summary: '',
      client_types: [],
      certifications: []
    });
    return about;
  }

  // getFAQEntries
  getFAQEntries() {
    const faqs = this._getFromStorage('faq_entries', []);
    return faqs;
  }

  // getPrivacyPolicyContent
  getPrivacyPolicyContent() {
    const policy = this._getFromStorage('privacy_policy_content', {
      last_updated: new Date().toISOString().slice(0, 10),
      content_html: ''
    });
    return policy;
  }

  // getTermsAndConditionsContent
  getTermsAndConditionsContent() {
    const terms = this._getFromStorage('terms_and_conditions_content', {
      last_updated: new Date().toISOString().slice(0, 10),
      content_html: ''
    });
    return terms;
  }

  // -------------------------
  // NO test methods in this class
  // -------------------------
}

// Browser global + Node.js export
if (typeof window !== 'undefined') {
  window.BusinessLogic = BusinessLogic;
  window.WebsiteSDK = new BusinessLogic();
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = BusinessLogic;
}
