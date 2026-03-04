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
    const keys = [
      'service_categories',
      'service_items',
      'service_addons',
      'subscription_plans',
      'subscriptions',
      'pickup_time_windows',
      'delivery_options',
      'locations',
      'user_preferences',
      'orders',
      'order_items',
      'order_addons',
      'price_calculator_items',
      'help_categories',
      'help_articles',
      'contact_messages',
      'policy_pages'
    ];

    keys.forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    });

    // Single-object contexts / meta keys are created lazily
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
    localStorage.setItem('idCounter', String(next));
    return next;
  }

  _generateId(prefix) {
    return prefix + '_' + this._getNextIdCounter();
  }

  _nowISO() {
    return new Date().toISOString();
  }

  _dateOnlyISO(date) {
    // Returns YYYY-MM-DD for a Date or ISO string
    const d = date instanceof Date ? date : new Date(date);
    return d.toISOString().slice(0, 10);
  }

  _clone(obj) {
    return obj == null ? obj : JSON.parse(JSON.stringify(obj));
  }

  _ensureCoreServiceItems() {
    let serviceItems = this._getFromStorage('service_items');
    let changed = false;
    const ensureItem = (item) => {
      if (!serviceItems.find((s) => s.id === item.id)) {
        serviceItems.push(item);
        changed = true;
      }
    };

    const currency = 'USD';

    // Dry cleaning items used in calculator and dry cleaning flows
    ensureItem({
      id: 'svc_dc_shirts_wash_press',
      category_id: 'dry_cleaning',
      product_code: 'dc_shirts_wash_press',
      name: 'Shirts (Wash & Press)',
      description: 'Shirts professionally washed and pressed on hangers.',
      base_service_type: 'dry_cleaning',
      clothing_type: 'shirts',
      price_type: 'per_item',
      unit_price: 3.0,
      currency,
      standard_turnaround_days: 2,
      express_available: true,
      express_turnaround_days: 1,
      same_day_available: true,
      min_items: 1,
      max_items: 30,
      eligible_for_subscription: false,
      available_as_calculator_item: true,
      notes: '',
      is_active: true
    });

    ensureItem({
      id: 'svc_dc_suits',
      category_id: 'dry_cleaning',
      product_code: 'dc_suits',
      name: 'Suits (Dry Clean)',
      description: 'Two-piece suits dry cleaned and pressed.',
      base_service_type: 'dry_cleaning',
      clothing_type: 'suits',
      price_type: 'per_item',
      unit_price: 15.0,
      currency,
      standard_turnaround_days: 2,
      express_available: true,
      express_turnaround_days: 1,
      same_day_available: true,
      min_items: 1,
      max_items: 10,
      eligible_for_subscription: false,
      available_as_calculator_item: true,
      notes: '',
      is_active: true
    });

    ensureItem({
      id: 'svc_dc_dresses',
      category_id: 'dry_cleaning',
      product_code: 'dc_dresses',
      name: 'Dresses (Dry Clean)',
      description: 'Day and cocktail dresses dry cleaned and gently pressed.',
      base_service_type: 'dry_cleaning',
      clothing_type: 'dresses',
      price_type: 'per_item',
      unit_price: 10.0,
      currency,
      standard_turnaround_days: 2,
      express_available: true,
      express_turnaround_days: 1,
      same_day_available: false,
      min_items: 1,
      max_items: 10,
      eligible_for_subscription: false,
      available_as_calculator_item: true,
      notes: '',
      is_active: true
    });

    // Coats & jackets (wool coat options)
    ensureItem({
      id: 'svc_coat_wool_basic',
      category_id: 'coats_jackets',
      product_code: 'coat_wool_basic',
      name: 'Wool Coat (Standard)',
      description: 'Standard cleaning for wool coats.',
      base_service_type: 'dry_cleaning',
      clothing_type: 'coats',
      price_type: 'per_item',
      unit_price: 18.0,
      currency,
      standard_turnaround_days: 3,
      express_available: true,
      express_turnaround_days: 2,
      same_day_available: false,
      min_items: 1,
      max_items: 5,
      eligible_for_subscription: false,
      available_as_calculator_item: false,
      notes: '',
      is_active: true
    });

    ensureItem({
      id: 'svc_coat_wool_premium',
      category_id: 'coats_jackets',
      product_code: 'coat_wool_premium',
      name: 'Wool Coat (Delicate)',
      description: 'Delicate care cleaning for wool coats.',
      base_service_type: 'dry_cleaning',
      clothing_type: 'coats',
      price_type: 'per_item',
      unit_price: 22.0,
      currency,
      standard_turnaround_days: 2,
      express_available: true,
      express_turnaround_days: 1,
      same_day_available: false,
      min_items: 1,
      max_items: 5,
      eligible_for_subscription: false,
      available_as_calculator_item: false,
      notes: '',
      is_active: true
    });

    // Ironing-only service
    ensureItem({
      id: 'svc_ironing_only_shirts',
      category_id: 'wash_fold',
      product_code: 'ironing_only_shirts',
      name: 'Ironing Only  Shirts',
      description: 'Shirts ironed/pressed only, no washing.',
      base_service_type: 'ironing_only',
      clothing_type: 'shirts',
      price_type: 'per_item',
      unit_price: 2.5,
      currency,
      standard_turnaround_days: 1,
      express_available: false,
      express_turnaround_days: null,
      same_day_available: false,
      min_items: 1,
      max_items: 20,
      eligible_for_subscription: false,
      available_as_calculator_item: false,
      notes: '',
      is_active: true
    });

    if (changed) {
      this._saveToStorage('service_items', serviceItems);
    }
  }

  // ----------------------
  // Current order helpers
  // ----------------------

  _getOrCreateCurrentOrder() {
    const orders = this._getFromStorage('orders');
    const prefs = this._getOrCreateUserPreferences();
    const currentOrderId = localStorage.getItem('current_order_id');

    if (currentOrderId) {
      const existing = orders.find((o) => o.id === currentOrderId);
      if (existing) {
        return existing;
      }
      localStorage.removeItem('current_order_id');
    }

    // Create a new draft order with minimal defaults
    const orderId = this._generateId('order');
    const now = this._nowISO();

    const newOrder = {
      id: orderId,
      order_number: 'ORD-' + orderId,
      created_at: now,
      updated_at: now,
      status: 'draft',
      base_service_type: 'wash_fold',
      pickup_date: '',
      pickup_time_window_id: '',
      pickup_time_window_label: '',
      pickup_time_start: '',
      pickup_time_end: '',
      pickup_fee: 0,
      delivery_option_id: '',
      delivery_option_label: '',
      delivery_turnaround_days: null,
      delivery_fee: 0,
      service_speed: 'standard',
      special_instructions: '',
      payment_method: prefs.preferred_payment_method || 'pay_on_pickup',
      payment_status: 'unpaid',
      subtotal_items: 0,
      subtotal_addons: 0,
      pickup_fee_total: 0,
      delivery_fee_total: 0,
      total_amount: 0,
      currency: 'USD',
      estimated_ready_date: null,
      location_id: prefs.preferred_location_id || null,
      is_subscription_order: false,
      created_from_estimate: false,
      source: 'schedule_pickup_flow'
    };

    orders.push(newOrder);
    this._saveToStorage('orders', orders);
    localStorage.setItem('current_order_id', newOrder.id);
    return newOrder;
  }

  _setCurrentOrder(updatedOrder) {
    const orders = this._getFromStorage('orders');
    const idx = orders.findIndex((o) => o.id === updatedOrder.id);
    if (idx >= 0) {
      orders[idx] = updatedOrder;
    } else {
      orders.push(updatedOrder);
    }
    this._saveToStorage('orders', orders);
    localStorage.setItem('current_order_id', updatedOrder.id);
  }

  _getOrderItems(orderId) {
    const orderItems = this._getFromStorage('order_items');
    return orderItems.filter((oi) => oi.order_id === orderId);
  }

  _getOrderAddons(orderId) {
    const orderAddons = this._getFromStorage('order_addons');
    return orderAddons.filter((oa) => oa.order_id === orderId);
  }

  _recalculateOrderTotals(orderId) {
    const orders = this._getFromStorage('orders');
    const orderItems = this._getFromStorage('order_items');
    const orderAddons = this._getFromStorage('order_addons');

    const order = orders.find((o) => o.id === orderId);
    if (!order) return null;

    const itemsForOrder = orderItems.filter((oi) => oi.order_id === orderId);
    const addonsForOrder = orderAddons.filter((oa) => oa.order_id === orderId);

    const subtotalItems = itemsForOrder.reduce((sum, item) => sum + (item.line_total || 0), 0);
    const subtotalAddons = addonsForOrder.reduce((sum, addon) => sum + (addon.line_total || 0), 0);

    const pickupFee = order.pickup_fee || 0;
    const deliveryFee = order.delivery_fee || 0;

    order.subtotal_items = subtotalItems;
    order.subtotal_addons = subtotalAddons;
    order.pickup_fee_total = pickupFee;
    order.delivery_fee_total = deliveryFee;
    order.total_amount = subtotalItems + subtotalAddons + pickupFee + deliveryFee;

    // Set currency from first item if not set
    if (!order.currency) {
      const serviceItems = this._getFromStorage('service_items');
      const firstItem = itemsForOrder[0];
      if (firstItem) {
        const si = serviceItems.find((s) => s.id === firstItem.service_item_id);
        if (si && si.currency) {
          order.currency = si.currency;
        }
      }
      if (!order.currency) order.currency = 'USD';
    }

    order.updated_at = this._nowISO();

    const idx = orders.findIndex((o) => o.id === order.id);
    if (idx >= 0) {
      orders[idx] = order;
      this._saveToStorage('orders', orders);
    }
    return order;
  }

  // ----------------------
  // Subscription helpers
  // ----------------------

  _getOrCreateSubscriptionDraft() {
    let draft = this._getFromStorage('subscription_draft', null);
    if (!draft) {
      const now = this._nowISO();
      draft = {
        id: this._generateId('subscription_draft'),
        plan_id: null, // references SubscriptionPlan.id
        plan_name_snapshot: '',
        status: 'draft',
        start_date: null,
        end_date: null,
        pickup_frequency: 'weekly',
        pickup_weekday: 'monday',
        pickup_time_window_id: null,
        pickup_time_window_label: '',
        pickup_time_start: '',
        pickup_time_end: '',
        customer_name: '',
        customer_email: '',
        customer_phone: '',
        address_line1: '',
        address_line2: '',
        city: '',
        state: '',
        postal_code: '',
        notes: '',
        payment_method: 'pay_on_pickup',
        created_at: now,
        updated_at: now
      };
      this._saveToStorage('subscription_draft', draft);
    }
    return draft;
  }

  _setSubscriptionDraft(draft) {
    draft.updated_at = this._nowISO();
    this._saveToStorage('subscription_draft', draft);
  }

  // ----------------------
  // User preferences helper
  // ----------------------

  _getOrCreateUserPreferences() {
    const prefsArr = this._getFromStorage('user_preferences');
    if (prefsArr.length > 0) {
      return prefsArr[0];
    }
    const now = this._nowISO();
    const newPrefs = {
      id: this._generateId('user_pref'),
      preferred_location_id: null,
      preferred_payment_method: null,
      default_pickup_weekday: null,
      default_pickup_time_window_id: null,
      created_at: now,
      updated_at: now
    };
    const arr = [newPrefs];
    this._saveToStorage('user_preferences', arr);
    return newPrefs;
  }

  _setUserPreferences(updatedPrefs) {
    let prefsArr = this._getFromStorage('user_preferences');
    if (prefsArr.length === 0) {
      prefsArr = [updatedPrefs];
    } else {
      prefsArr[0] = updatedPrefs;
    }
    updatedPrefs.updated_at = this._nowISO();
    this._saveToStorage('user_preferences', prefsArr);
  }

  // ----------------------
  // Price estimate context helper
  // ----------------------

  _getOrCreatePriceEstimateContext() {
    return this._getFromStorage('price_estimate_context', { items: [], estimated_total: 0, currency: 'USD' });
  }

  _setPriceEstimateContext(ctx) {
    this._saveToStorage('price_estimate_context', ctx);
  }

  // ----------------------
  // Foreign key resolution helpers
  // ----------------------

  _attachServiceItemToOrderItems(orderItems) {
    const serviceItems = this._getFromStorage('service_items');
    const orders = this._getFromStorage('orders');
    return orderItems.map((item) => {
      const serviceItem = serviceItems.find((s) => s.id === item.service_item_id) || null;
      const order = orders.find((o) => o.id === item.order_id) || null;
      return Object.assign({}, item, {
        service_item: serviceItem,
        order: order
      });
    });
  }

  _attachAddonAndOrderItemToOrderAddons(orderAddons) {
    const addons = this._getFromStorage('service_addons');
    const orderItems = this._getFromStorage('order_items');
    const orders = this._getFromStorage('orders');
    return orderAddons.map((oa) => {
      const addon = addons.find((a) => a.id === oa.addon_id) || null;
      const orderItem = oa.order_item_id ? orderItems.find((oi) => oi.id === oa.order_item_id) || null : null;
      const order = orders.find((o) => o.id === oa.order_id) || null;
      return Object.assign({}, oa, {
        addon: addon,
        order_item: orderItem,
        order: order
      });
    });
  }

  _attachServiceItemToCalculatorItems(items) {
    const serviceItems = this._getFromStorage('service_items');
    return items.map((it) => {
      const serviceItem = serviceItems.find((s) => s.id === it.service_item_id) || null;
      return Object.assign({}, it, { service_item: serviceItem });
    });
  }

  _attachPriceCalculatorItem(lineItems) {
    const calcItems = this._getFromStorage('price_calculator_items');
    return lineItems.map((li) => {
      const pci = calcItems.find((c) => c.id === li.price_calculator_item_id) || null;
      return Object.assign({}, li, { price_calculator_item: pci });
    });
  }

  // ----------------------
  // Interface implementations
  // ----------------------

  // 1. getHomePageData
  getHomePageData() {
    const serviceCategories = this._getFromStorage('service_categories');
    const serviceItems = this._getFromStorage('service_items');

    const service_overview = serviceCategories
      .sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
      .map((cat) => {
        const example = serviceItems.find((si) => si.category_id === cat.id && si.is_active);
        return {
          category_key: cat.key,
          category_name: cat.name,
          short_description: cat.description || '',
          primary_example_service: example ? example.name : ''
        };
      });

    const prefs = this._getOrCreateUserPreferences();
    const locations = this._getFromStorage('locations');
    let preferred_location = null;
    if (prefs.preferred_location_id) {
      const loc = locations.find((l) => l.id === prefs.preferred_location_id) || null;
      if (loc) {
        preferred_location = {
          location_id: loc.id,
          name: loc.name,
          address_line1: loc.address_line1,
          city: loc.city,
          state: loc.state,
          postal_code: loc.postal_code,
          weekday_open_time: loc.weekday_open_time,
          weekday_close_time: loc.weekday_close_time,
          is_preferred: !!loc.is_preferred
        };
      }
    }

    return { service_overview, preferred_location };
  }

  // 2. getServicesPageData
  getServicesPageData(categoryKey) {
    const categories = this._getFromStorage('service_categories');
    this._ensureCoreServiceItems();
    const serviceItems = this._getFromStorage('service_items');

    let filteredCategories = categories;
    if (categoryKey && categoryKey !== 'all_services') {
      filteredCategories = categories.filter((c) => c.key === categoryKey);
    }

    const categoryIdByKey = new Map();
    categories.forEach((c) => categoryIdByKey.set(c.id, c.key));

    let filteredServices = serviceItems.filter((s) => s.is_active);
    if (categoryKey && categoryKey !== 'all_services') {
      filteredServices = filteredServices.filter((s) => {
        const cat = categories.find((c) => c.id === s.category_id);
        const keyFromCat = cat ? cat.key : null;
        if (keyFromCat === categoryKey) return true;
        // Also allow filtering by base_service_type when categoryKey matches that
        if (s.base_service_type === categoryKey) return true;
        return false;
      });
    }

    const services = filteredServices.map((s) => {
      const cat = categories.find((c) => c.id === s.category_id);
      return {
        product_code: s.product_code,
        name: s.name,
        category_key: cat ? cat.key : null,
        category_name: cat ? cat.name : null,
        base_service_type: s.base_service_type,
        clothing_type: s.clothing_type || null,
        price_type: s.price_type,
        unit_price: s.unit_price,
        currency: s.currency,
        standard_turnaround_days: s.standard_turnaround_days,
        express_available: !!s.express_available,
        express_turnaround_days: s.express_turnaround_days,
        same_day_available: !!s.same_day_available,
        eligible_for_subscription: !!s.eligible_for_subscription
      };
    });

    const categoriesResult = filteredCategories
      .slice()
      .sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
      .map((c) => ({
        key: c.key,
        name: c.name,
        description: c.description || '',
        display_order: c.display_order || 0
      }));

    return {
      categories: categoriesResult,
      services
    };
  }

  // 3. getServiceDetail
  getServiceDetail(productId) {
    const serviceItems = this._getFromStorage('service_items');
    const categories = this._getFromStorage('service_categories');

    const service = serviceItems.find((s) => s.product_code === productId);
    if (!service) return null;

    const cat = categories.find((c) => c.id === service.category_id) || null;

    const related_services = serviceItems
      .filter((s) => s.id !== service.id && s.category_id === service.category_id && s.is_active)
      .map((s) => ({
        product_code: s.product_code,
        name: s.name,
        unit_price: s.unit_price,
        currency: s.currency,
        standard_turnaround_days: s.standard_turnaround_days
      }));

    return {
      product_code: service.product_code,
      name: service.name,
      description: service.description || '',
      category_key: cat ? cat.key : null,
      category_name: cat ? cat.name : null,
      base_service_type: service.base_service_type,
      clothing_type: service.clothing_type || null,
      price_type: service.price_type,
      unit_price: service.unit_price,
      currency: service.currency,
      standard_turnaround_days: service.standard_turnaround_days,
      express_available: !!service.express_available,
      express_turnaround_days: service.express_turnaround_days,
      same_day_available: !!service.same_day_available,
      eligible_for_subscription: !!service.eligible_for_subscription,
      available_as_calculator_item: !!service.available_as_calculator_item,
      notes: service.notes || '',
      related_services
    };
  }

  // 4. startOrderFromService
  startOrderFromService(productId, quantity = 1) {
    const serviceItems = this._getFromStorage('service_items');
    const service = serviceItems.find((s) => s.product_code === productId);
    if (!service) {
      return { success: false, message: 'Service not found', order_source: 'service_detail_flow', base_service_type: null, items: [], next_step: null };
    }

    if (quantity <= 0) quantity = 1;

    // Create new order, replacing any existing current order
    const prefs = this._getOrCreateUserPreferences();
    const now = this._nowISO();
    const orderId = this._generateId('order');
    const order = {
      id: orderId,
      order_number: 'ORD-' + orderId,
      created_at: now,
      updated_at: now,
      status: 'draft',
      base_service_type: service.base_service_type,
      pickup_date: '',
      pickup_time_window_id: '',
      pickup_time_window_label: '',
      pickup_time_start: '',
      pickup_time_end: '',
      pickup_fee: 0,
      delivery_option_id: '',
      delivery_option_label: '',
      delivery_turnaround_days: null,
      delivery_fee: 0,
      service_speed: 'standard',
      special_instructions: '',
      payment_method: prefs.preferred_payment_method || 'pay_on_pickup',
      payment_status: 'unpaid',
      subtotal_items: 0,
      subtotal_addons: 0,
      pickup_fee_total: 0,
      delivery_fee_total: 0,
      total_amount: 0,
      currency: service.currency || 'USD',
      estimated_ready_date: null,
      location_id: prefs.preferred_location_id || null,
      is_subscription_order: false,
      created_from_estimate: false,
      source: 'service_detail_flow'
    };

    // Replace orders and clear any previous current_order_id
    let orders = this._getFromStorage('orders');
    orders.push(order);
    this._saveToStorage('orders', orders);
    localStorage.setItem('current_order_id', order.id);

    // Create order item
    const category = this._getFromStorage('service_categories').find((c) => c.id === service.category_id);
    const orderItem = {
      id: this._generateId('order_item'),
      order_id: order.id,
      service_item_id: service.id,
      service_name_snapshot: service.name,
      category_key_snapshot: category ? category.key : null,
      quantity: quantity,
      unit_price: service.unit_price,
      line_total: service.unit_price * quantity,
      notes: ''
    };
    const orderItems = this._getFromStorage('order_items');
    orderItems.push(orderItem);
    this._saveToStorage('order_items', orderItems);

    // Recalculate totals
    const updatedOrder = this._recalculateOrderTotals(order.id);

    // Build items summary
    const itemsSummary = [{
      service_item_id: orderItem.service_item_id,
      service_name: orderItem.service_name_snapshot,
      quantity: orderItem.quantity,
      unit_price: orderItem.unit_price,
      line_total: orderItem.line_total
    }];

    return {
      success: true,
      message: 'Order started from service',
      order_source: 'service_detail_flow',
      base_service_type: updatedOrder ? updatedOrder.base_service_type : service.base_service_type,
      items: itemsSummary,
      next_step: 'schedule_pickup'
    };
  }

  // 5. startNewOrder
  startNewOrder(baseServiceType, source) {
    const prefs = this._getOrCreateUserPreferences();
    const now = this._nowISO();
    const orderId = this._generateId('order');

    const order = {
      id: orderId,
      order_number: 'ORD-' + orderId,
      created_at: now,
      updated_at: now,
      status: 'draft',
      base_service_type: baseServiceType,
      pickup_date: '',
      pickup_time_window_id: '',
      pickup_time_window_label: '',
      pickup_time_start: '',
      pickup_time_end: '',
      pickup_fee: 0,
      delivery_option_id: '',
      delivery_option_label: '',
      delivery_turnaround_days: null,
      delivery_fee: 0,
      service_speed: 'standard',
      special_instructions: '',
      payment_method: prefs.preferred_payment_method || 'pay_on_pickup',
      payment_status: 'unpaid',
      subtotal_items: 0,
      subtotal_addons: 0,
      pickup_fee_total: 0,
      delivery_fee_total: 0,
      total_amount: 0,
      currency: 'USD',
      estimated_ready_date: null,
      location_id: prefs.preferred_location_id || null,
      is_subscription_order: false,
      created_from_estimate: false,
      source: source
    };

    let orders = this._getFromStorage('orders');
    orders.push(order);
    this._saveToStorage('orders', orders);
    localStorage.setItem('current_order_id', order.id);

    // Available item types based on service_items
    this._ensureCoreServiceItems();
    const serviceItems = this._getFromStorage('service_items').filter(
      (s) => s.base_service_type === baseServiceType && s.is_active
    );

    const seen = new Set();
    const available_item_types = [];
    for (const s of serviceItems) {
      const ct = s.clothing_type || 'generic_item';
      if (seen.has(ct)) continue;
      seen.add(ct);
      const label = ct.replace(/_/g, ' ').replace(/^([a-z])/, (m) => m.toUpperCase());
      available_item_types.push({
        clothing_type: ct,
        label: label,
        service_item_id: s.id
      });
    }

    return {
      success: true,
      order_source: source,
      base_service_type: baseServiceType,
      available_item_types
    };
  }

  // 6. getSchedulePickupState
  getSchedulePickupState() {
    const order = this._getOrCreateCurrentOrder();
    const orderItemsRaw = this._getOrderItems(order.id);
    const orderAddonsRaw = this._getOrderAddons(order.id);

    const serviceItems = this._getFromStorage('service_items');
    const addonsConfig = this._getFromStorage('service_addons');

    const items = orderItemsRaw.map((oi) => {
      const serviceItem = serviceItems.find((s) => s.id === oi.service_item_id) || null;
      return {
        service_item_id: oi.service_item_id,
        service_name: oi.service_name_snapshot,
        clothing_type: serviceItem ? serviceItem.clothing_type : null,
        quantity: oi.quantity,
        unit_price: oi.unit_price,
        line_total: oi.line_total,
        service_item: serviceItem
      };
    });

    const addons = orderAddonsRaw.map((oa) => {
      const addon = addonsConfig.find((a) => a.id === oa.addon_id) || null;
      return {
        addon_id: oa.addon_id,
        addon_name: oa.addon_name_snapshot,
        is_stain_related: oa.is_stain_related,
        quantity: oa.quantity,
        line_total: oa.line_total,
        addon: addon
      };
    });

    const pickup = {
      pickup_date: order.pickup_date || '',
      pickup_time_window_label: order.pickup_time_window_label || '',
      pickup_time_start: order.pickup_time_start || '',
      pickup_time_end: order.pickup_time_end || '',
      pickup_fee: order.pickup_fee || 0
    };

    const delivery = {
      delivery_option_label: order.delivery_option_label || '',
      delivery_turnaround_days: order.delivery_turnaround_days,
      delivery_fee: order.delivery_fee || 0
    };

    const totals = {
      subtotal_items: order.subtotal_items || 0,
      subtotal_addons: order.subtotal_addons || 0,
      pickup_fee_total: order.pickup_fee_total || 0,
      delivery_fee_total: order.delivery_fee_total || 0,
      total_amount: order.total_amount || 0,
      currency: order.currency || 'USD'
    };

    return {
      status: order.status,
      base_service_type: order.base_service_type,
      order_source: order.source,
      items,
      addons,
      pickup,
      delivery,
      service_speed: order.service_speed,
      special_instructions: order.special_instructions || '',
      payment_method: order.payment_method,
      totals
    };
  }

  // 7. updateOrderItems
  updateOrderItems(items) {
    const order = this._getOrCreateCurrentOrder();
    let orderItems = this._getFromStorage('order_items');
    const serviceItems = this._getFromStorage('service_items');
    const categories = this._getFromStorage('service_categories');

    const incomingMap = new Map();
    (items || []).forEach((it) => {
      if (!it || !it.serviceItemId) return;
      const qty = typeof it.quantity === 'number' ? it.quantity : 0;
      incomingMap.set(it.serviceItemId, { quantity: qty, notes: it.notes || '' });
    });

    // Update or remove existing items
    orderItems = orderItems.filter((oi) => {
      if (oi.order_id !== order.id) return true;
      const incoming = incomingMap.get(oi.service_item_id);
      if (!incoming) {
        // Not present in new list -> remove
        return false;
      }
      if (incoming.quantity <= 0) {
        // Quantity zero -> remove
        return false;
      }
      oi.quantity = incoming.quantity;
      oi.notes = incoming.notes;
      oi.line_total = (oi.unit_price || 0) * oi.quantity;
      incomingMap.delete(oi.service_item_id);
      return true;
    });

    // Add new items
    incomingMap.forEach((val, serviceItemId) => {
      if (val.quantity <= 0) return;
      const service = serviceItems.find((s) => s.id === serviceItemId);
      if (!service) return;
      const category = categories.find((c) => c.id === service.category_id);
      const newItem = {
        id: this._generateId('order_item'),
        order_id: order.id,
        service_item_id: service.id,
        service_name_snapshot: service.name,
        category_key_snapshot: category ? category.key : null,
        quantity: val.quantity,
        unit_price: service.unit_price,
        line_total: service.unit_price * val.quantity,
        notes: val.notes
      };
      orderItems.push(newItem);
    });

    this._saveToStorage('order_items', orderItems);
    const updatedOrder = this._recalculateOrderTotals(order.id);

    const itemsForOrder = orderItems
      .filter((oi) => oi.order_id === order.id)
      .map((oi) => ({
        service_item_id: oi.service_item_id,
        service_name: oi.service_name_snapshot,
        quantity: oi.quantity,
        unit_price: oi.unit_price,
        line_total: oi.line_total
      }));

    return {
      items: itemsForOrder,
      subtotal_items: updatedOrder ? updatedOrder.subtotal_items : 0,
      currency: updatedOrder ? updatedOrder.currency : 'USD'
    };
  }

  // 8. getAvailablePickupDates
  getAvailablePickupDates() {
    const order = this._getOrCreateCurrentOrder();
    const orderItems = this._getOrderItems(order.id);
    const serviceItems = this._getFromStorage('service_items');

    let sameDayEligible = false;
    for (const oi of orderItems) {
      const si = serviceItems.find((s) => s.id === oi.service_item_id);
      if (si && si.same_day_available) {
        sameDayEligible = true;
        break;
      }
    }

    const today = new Date();
    const result = [];
    for (let i = 0; i < 14; i++) {
      const d = new Date(today.getTime());
      d.setDate(d.getDate() + i);
      const dateStr = this._dateOnlyISO(d);
      const isToday = i === 0;
      result.push({
        date: dateStr,
        is_today: isToday,
        same_day_available: sameDayEligible && isToday
      });
    }

    return result;
  }

  // 9. getPickupTimeWindowsForDate
  getPickupTimeWindowsForDate(pickupDate, partOfDay, sameDayOnly) {
    let windows = this._getFromStorage('pickup_time_windows').filter((w) => w.is_active);
    if (partOfDay) {
      windows = windows.filter((w) => w.part_of_day === partOfDay);
    }
    if (sameDayOnly) {
      windows = windows.filter((w) => w.is_available_for_same_day);
    }
    return windows;
  }

  // 10. selectPickupSlot
  selectPickupSlot(pickupDate, pickupTimeWindowId) {
    const order = this._getOrCreateCurrentOrder();
    const windows = this._getFromStorage('pickup_time_windows');
    const win = windows.find((w) => w.id === pickupTimeWindowId);
    if (!win) {
      return {
        pickup_date: order.pickup_date || '',
        pickup_time_window_label: order.pickup_time_window_label || '',
        pickup_time_start: order.pickup_time_start || '',
        pickup_time_end: order.pickup_time_end || '',
        pickup_fee: order.pickup_fee || 0,
        currency: order.currency || 'USD'
      };
    }

    order.pickup_date = pickupDate;
    order.pickup_time_window_id = win.id;
    order.pickup_time_window_label = win.label;
    order.pickup_time_start = win.start_time;
    order.pickup_time_end = win.end_time;
    order.pickup_fee = win.pickup_fee || 0;
    if (win.currency) order.currency = win.currency;
    order.updated_at = this._nowISO();

    this._setCurrentOrder(order);
    this._recalculateOrderTotals(order.id);

    return {
      pickup_date: order.pickup_date,
      pickup_time_window_label: order.pickup_time_window_label,
      pickup_time_start: order.pickup_time_start,
      pickup_time_end: order.pickup_time_end,
      pickup_fee: order.pickup_fee,
      currency: order.currency || 'USD'
    };
  }

  // 11. getAvailableDeliveryOptions
  getAvailableDeliveryOptions() {
    const options = this._getFromStorage('delivery_options').filter((o) => o.is_active);
    return options;
  }

  // 12. selectDeliveryOption
  selectDeliveryOption(deliveryOptionId) {
    const order = this._getOrCreateCurrentOrder();
    const options = this._getFromStorage('delivery_options');
    const opt = options.find((o) => o.id === deliveryOptionId);
    if (!opt) {
      return {
        delivery_option_label: order.delivery_option_label || '',
        delivery_turnaround_days: order.delivery_turnaround_days,
        delivery_fee: order.delivery_fee || 0,
        currency: order.currency || 'USD'
      };
    }

    order.delivery_option_id = opt.id;
    order.delivery_option_label = opt.label;
    order.delivery_turnaround_days = opt.turnaround_days;
    order.delivery_fee = opt.delivery_fee || 0;
    if (opt.currency) order.currency = opt.currency;
    order.updated_at = this._nowISO();

    this._setCurrentOrder(order);
    this._recalculateOrderTotals(order.id);

    return {
      delivery_option_label: order.delivery_option_label,
      delivery_turnaround_days: order.delivery_turnaround_days,
      delivery_fee: order.delivery_fee,
      currency: order.currency || 'USD'
    };
  }

  // 13. getOrderServiceSpeedOptions
  getOrderServiceSpeedOptions() {
    const order = this._getOrCreateCurrentOrder();
    const orderItems = this._getOrderItems(order.id);
    const serviceItems = this._getFromStorage('service_items');

    let maxStandardDays = 2;
    let expressAvailable = false;
    let sameDayAvailable = false;
    let minExpressDays = null;

    for (const oi of orderItems) {
      const si = serviceItems.find((s) => s.id === oi.service_item_id);
      if (!si) continue;
      if (typeof si.standard_turnaround_days === 'number') {
        if (si.standard_turnaround_days > maxStandardDays) maxStandardDays = si.standard_turnaround_days;
      }
      if (si.express_available) {
        expressAvailable = true;
        if (typeof si.express_turnaround_days === 'number') {
          if (minExpressDays == null || si.express_turnaround_days < minExpressDays) {
            minExpressDays = si.express_turnaround_days;
          }
        }
      }
      if (si.same_day_available) {
        sameDayAvailable = true;
      }
    }

    const options = [];

    options.push({
      code: 'standard',
      label: 'Standard',
      description: 'Standard turnaround service.',
      surcharge: 0,
      estimated_turnaround_days: maxStandardDays
    });

    if (expressAvailable) {
      options.push({
        code: 'express',
        label: 'Express',
        description: 'Faster express service.',
        surcharge: 0,
        estimated_turnaround_days: minExpressDays != null ? minExpressDays : Math.max(maxStandardDays - 1, 1)
      });
    }

    if (sameDayAvailable) {
      options.push({
        code: 'same_day',
        label: 'Same-Day',
        description: 'Same-day processing when eligible.',
        surcharge: 0,
        estimated_turnaround_days: 0
      });
    }

    return options;
  }

  // 14. selectOrderServiceSpeed
  selectOrderServiceSpeed(serviceSpeed) {
    const order = this._getOrCreateCurrentOrder();

    const options = this.getOrderServiceSpeedOptions();
    const opt = options.find((o) => o.code === serviceSpeed);

    order.service_speed = serviceSpeed;

    let estimatedReadyDate = null;
    if (order.pickup_date && opt) {
      const days = opt.estimated_turnaround_days || 0;
      const baseDate = new Date(order.pickup_date);
      baseDate.setDate(baseDate.getDate() + days);
      estimatedReadyDate = baseDate.toISOString();
    }

    order.estimated_ready_date = estimatedReadyDate;
    order.updated_at = this._nowISO();
    this._setCurrentOrder(order);

    return {
      service_speed: order.service_speed,
      estimated_ready_date: order.estimated_ready_date
    };
  }

  // 15. getAvailableAddons
  getAvailableAddons(addonType, stainRelatedOnly) {
    let addons = this._getFromStorage('service_addons').filter((a) => a.is_active);
    if (addonType) {
      addons = addons.filter((a) => a.addon_type === addonType);
    }
    if (stainRelatedOnly) {
      addons = addons.filter((a) => a.is_stain_related);
    }
    return addons;
  }

  // 16. updateOrderAddons
  updateOrderAddons(addons) {
    const order = this._getOrCreateCurrentOrder();
    let orderAddons = this._getFromStorage('order_addons');
    const addonsConfig = this._getFromStorage('service_addons');

    const incomingMap = new Map();
    (addons || []).forEach((ad) => {
      if (!ad || !ad.addonId) return;
      const qty = typeof ad.quantity === 'number' ? ad.quantity : 0;
      const key = ad.addonId + '|' + (ad.orderItemId || '');
      incomingMap.set(key, { quantity: qty, orderItemId: ad.orderItemId || null });
    });

    // Update or remove existing order_addons
    orderAddons = orderAddons.filter((oa) => {
      if (oa.order_id !== order.id) return true;
      const key = oa.addon_id + '|' + (oa.order_item_id || '');
      const incoming = incomingMap.get(key);
      if (!incoming) return false;
      if (incoming.quantity <= 0) return false;
      oa.quantity = incoming.quantity;
      oa.line_total = (oa.unit_price || 0) * oa.quantity;
      incomingMap.delete(key);
      return true;
    });

    // Add new
    incomingMap.forEach((val, key) => {
      if (val.quantity <= 0) return;
      const [addonId] = key.split('|');
      const config = addonsConfig.find((a) => a.id === addonId);
      if (!config) return;
      const newAddon = {
        id: this._generateId('order_addon'),
        order_id: order.id,
        order_item_id: val.orderItemId || null,
        addon_id: config.id,
        addon_name_snapshot: config.name,
        is_stain_related: !!config.is_stain_related,
        quantity: val.quantity,
        unit_price: config.unit_price,
        line_total: config.unit_price * val.quantity
      };
      orderAddons.push(newAddon);
    });

    this._saveToStorage('order_addons', orderAddons);
    const updatedOrder = this._recalculateOrderTotals(order.id);

    const addonsForOrder = orderAddons
      .filter((oa) => oa.order_id === order.id)
      .map((oa) => ({
        addon_id: oa.addon_id,
        addon_name: oa.addon_name_snapshot,
        is_stain_related: oa.is_stain_related,
        quantity: oa.quantity,
        line_total: oa.line_total
      }));

    return {
      addons: addonsForOrder,
      subtotal_addons: updatedOrder ? updatedOrder.subtotal_addons : 0,
      currency: updatedOrder ? updatedOrder.currency : 'USD'
    };
  }

  // 17. updateOrderSpecialInstructions
  updateOrderSpecialInstructions(specialInstructions) {
    const order = this._getOrCreateCurrentOrder();
    order.special_instructions = specialInstructions || '';
    order.updated_at = this._nowISO();
    this._setCurrentOrder(order);
    return { special_instructions: order.special_instructions };
  }

  // 18. selectOrderPaymentMethod
  selectOrderPaymentMethod(paymentMethod) {
    const order = this._getOrCreateCurrentOrder();
    order.payment_method = paymentMethod;
    order.updated_at = this._nowISO();
    this._setCurrentOrder(order);

    // Also update user preferences
    const prefs = this._getOrCreateUserPreferences();
    prefs.preferred_payment_method = paymentMethod;
    this._setUserPreferences(prefs);

    return { payment_method: order.payment_method };
  }

  // 19. getCurrentOrderSummary
  getCurrentOrderSummary() {
    const order = this._getOrCreateCurrentOrder();
    const orderItemsRaw = this._getOrderItems(order.id);
    const orderAddonsRaw = this._getOrderAddons(order.id);
    const serviceItems = this._getFromStorage('service_items');
    const addonsConfig = this._getFromStorage('service_addons');
    const locations = this._getFromStorage('locations');

    const items = orderItemsRaw.map((oi) => {
      const serviceItem = serviceItems.find((s) => s.id === oi.service_item_id) || null;
      return Object.assign({}, oi, { service_item: serviceItem });
    });

    const addons = orderAddonsRaw.map((oa) => {
      const addon = addonsConfig.find((a) => a.id === oa.addon_id) || null;
      const orderItem = oa.order_item_id ? orderItemsRaw.find((oi) => oi.id === oa.order_item_id) || null : null;
      return Object.assign({}, oa, { addon: addon, order_item: orderItem });
    });

    const pickup = {
      pickup_date: order.pickup_date || '',
      pickup_time_window_label: order.pickup_time_window_label || '',
      pickup_time_start: order.pickup_time_start || '',
      pickup_time_end: order.pickup_time_end || '',
      pickup_fee: order.pickup_fee || 0
    };

    const delivery = {
      delivery_option_label: order.delivery_option_label || '',
      delivery_turnaround_days: order.delivery_turnaround_days,
      delivery_fee: order.delivery_fee || 0
    };

    const totals = {
      subtotal_items: order.subtotal_items || 0,
      subtotal_addons: order.subtotal_addons || 0,
      pickup_fee_total: order.pickup_fee_total || 0,
      delivery_fee_total: order.delivery_fee_total || 0,
      total_amount: order.total_amount || 0,
      currency: order.currency || 'USD'
    };

    const location = order.location_id
      ? locations.find((l) => l.id === order.location_id) || null
      : null;

    return {
      status: order.status,
      order_source: order.source,
      base_service_type: order.base_service_type,
      location_name: location ? location.name : '',
      items,
      addons,
      pickup,
      delivery,
      service_speed: order.service_speed,
      special_instructions: order.special_instructions || '',
      payment_method: order.payment_method,
      totals
    };
  }

  // 20. confirmCurrentOrder
  confirmCurrentOrder() {
    const order = this._getOrCreateCurrentOrder();

    // Ensure totals up to date
    this._recalculateOrderTotals(order.id);

    order.status = 'confirmed';
    order.updated_at = this._nowISO();

    // If no estimated_ready_date yet, compute based on delivery_turnaround_days or service_speed
    if (!order.estimated_ready_date && order.pickup_date) {
      let days = 2;
      if (typeof order.delivery_turnaround_days === 'number') {
        days = order.delivery_turnaround_days;
      } else if (order.service_speed === 'same_day') {
        days = 0;
      } else if (order.service_speed === 'express') {
        days = 1;
      }
      const baseDate = new Date(order.pickup_date);
      baseDate.setDate(baseDate.getDate() + days);
      order.estimated_ready_date = baseDate.toISOString();
    }

    this._setCurrentOrder(order);

    return {
      success: true,
      order_number: order.order_number,
      status: order.status,
      total_amount: order.total_amount || 0,
      currency: order.currency || 'USD',
      estimated_ready_date: order.estimated_ready_date
    };
  }

  // 21. getPriceCalculatorItems
  getPriceCalculatorItems() {
    const calcItems = this._getFromStorage('price_calculator_items').filter((c) => c.is_visible);
    return this._attachServiceItemToCalculatorItems(calcItems);
  }

  // 22. calculatePriceEstimate
  calculatePriceEstimate(items) {
    const calcItems = this._getFromStorage('price_calculator_items');
    const serviceItems = this._getFromStorage('service_items');

    const line_items_raw = [];
    let total = 0;
    let currency = 'USD';

    (items || []).forEach((row) => {
      const pci = calcItems.find((c) => c.id === row.priceCalculatorItemId);
      if (!pci) return;
      const service = serviceItems.find((s) => s.id === pci.service_item_id);
      const qty = typeof row.quantity === 'number' ? row.quantity : 0;
      const unitPrice = typeof pci.unit_price_override === 'number' && pci.unit_price_override > 0
        ? pci.unit_price_override
        : service
          ? service.unit_price
          : 0;
      const lineTotal = unitPrice * qty;
      if (service && service.currency) {
        currency = service.currency;
      }
      total += lineTotal;
      line_items_raw.push({
        price_calculator_item_id: pci.id,
        label: pci.label,
        quantity: qty,
        unit_price: unitPrice,
        line_total: lineTotal
      });
    });

    const line_items = this._attachPriceCalculatorItem(line_items_raw);

    const ctx = { items: items || [], estimated_total: total, currency };
    this._setPriceEstimateContext(ctx);

    return {
      line_items,
      estimated_total: total,
      currency
    };
  }

  // 23. startOrderFromPriceEstimate
  startOrderFromPriceEstimate(items) {
    const calcItems = this._getFromStorage('price_calculator_items');
    const serviceItems = this._getFromStorage('service_items');
    const prefs = this._getOrCreateUserPreferences();

    const now = this._nowISO();
    const orderId = this._generateId('order');

    const order = {
      id: orderId,
      order_number: 'ORD-' + orderId,
      created_at: now,
      updated_at: now,
      status: 'draft',
      base_service_type: 'mixed',
      pickup_date: '',
      pickup_time_window_id: '',
      pickup_time_window_label: '',
      pickup_time_start: '',
      pickup_time_end: '',
      pickup_fee: 0,
      delivery_option_id: '',
      delivery_option_label: '',
      delivery_turnaround_days: null,
      delivery_fee: 0,
      service_speed: 'standard',
      special_instructions: '',
      payment_method: prefs.preferred_payment_method || 'pay_on_pickup',
      payment_status: 'unpaid',
      subtotal_items: 0,
      subtotal_addons: 0,
      pickup_fee_total: 0,
      delivery_fee_total: 0,
      total_amount: 0,
      currency: 'USD',
      estimated_ready_date: null,
      location_id: prefs.preferred_location_id || null,
      is_subscription_order: false,
      created_from_estimate: true,
      source: 'price_calculator_flow'
    };

    let orders = this._getFromStorage('orders');
    orders.push(order);
    this._saveToStorage('orders', orders);
    localStorage.setItem('current_order_id', order.id);

    const orderItems = this._getFromStorage('order_items');

    (items || []).forEach((row) => {
      const pci = calcItems.find((c) => c.id === row.priceCalculatorItemId);
      if (!pci) return;
      const service = serviceItems.find((s) => s.id === pci.service_item_id);
      if (!service) return;
      const qty = typeof row.quantity === 'number' ? row.quantity : 0;
      if (qty <= 0) return;

      const unitPrice = typeof pci.unit_price_override === 'number' && pci.unit_price_override > 0
        ? pci.unit_price_override
        : service.unit_price;

      const category = this._getFromStorage('service_categories').find((c) => c.id === service.category_id);

      const newItem = {
        id: this._generateId('order_item'),
        order_id: order.id,
        service_item_id: service.id,
        service_name_snapshot: service.name,
        category_key_snapshot: category ? category.key : null,
        quantity: qty,
        unit_price: unitPrice,
        line_total: unitPrice * qty,
        notes: ''
      };
      orderItems.push(newItem);
      if (service.currency && order.currency === 'USD') {
        order.currency = service.currency;
      }
    });

    this._saveToStorage('order_items', orderItems);
    const updatedOrder = this._recalculateOrderTotals(order.id);

    const itemsForOrder = this._getOrderItems(order.id);

    return {
      success: true,
      order_source: 'price_calculator_flow',
      items: itemsForOrder,
      totals: {
        subtotal_items: updatedOrder ? updatedOrder.subtotal_items : 0,
        total_amount: updatedOrder ? updatedOrder.total_amount : 0,
        currency: updatedOrder ? updatedOrder.currency : 'USD'
      },
      next_step: 'schedule_pickup'
    };
  }

  // 24. getSubscriptionPlans
  getSubscriptionPlans() {
    const plans = this._getFromStorage('subscription_plans').filter((p) => p.is_active);
    return plans;
  }

  // 25. getSubscriptionPlanDetail
  getSubscriptionPlanDetail(planId) {
    const plans = this._getFromStorage('subscription_plans');
    const plan = plans.find((p) => p.plan_id === planId);
    if (!plan) return null;
    return {
      plan_id: plan.plan_id,
      name: plan.name,
      description: plan.description || '',
      base_service_type: plan.base_service_type,
      max_weight_lbs: plan.max_weight_lbs,
      billing_period: plan.billing_period,
      monthly_price: plan.monthly_price,
      currency: plan.currency,
      default_pickup_frequency: plan.default_pickup_frequency,
      notes: plan.notes || ''
    };
  }

  // 26. startSubscriptionCheckout
  startSubscriptionCheckout(planId) {
    const plans = this._getFromStorage('subscription_plans');
    const plan = plans.find((p) => p.plan_id === planId);
    if (!plan) {
      return {
        success: false,
        plan_snapshot: null,
        available_frequencies: [],
        available_weekdays: [],
        available_time_windows: []
      };
    }

    const draft = this._getOrCreateSubscriptionDraft();
    draft.plan_id = plan.id; // reference by primary key
    draft.plan_name_snapshot = plan.name;
    draft.status = 'draft';
    this._setSubscriptionDraft(draft);

    const plan_snapshot = {
      plan_id: plan.plan_id,
      name: plan.name,
      description: plan.description || '',
      base_service_type: plan.base_service_type,
      max_weight_lbs: plan.max_weight_lbs,
      monthly_price: plan.monthly_price,
      currency: plan.currency
    };

    const available_frequencies = ['weekly', 'biweekly', 'monthly'];
    const available_weekdays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const available_time_windows = this._getFromStorage('pickup_time_windows').filter((w) => w.is_active);

    return {
      success: true,
      plan_snapshot,
      available_frequencies,
      available_weekdays,
      available_time_windows
    };
  }

  // 27. getSubscriptionPickupOptions
  getSubscriptionPickupOptions() {
    const pickup_frequencies = ['weekly', 'biweekly', 'monthly'];
    const weekdays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const time_windows = this._getFromStorage('pickup_time_windows').filter((w) => w.is_active);
    return {
      pickup_frequencies,
      weekdays,
      time_windows
    };
  }

  // 28. updateSubscriptionSchedule
  updateSubscriptionSchedule(pickupFrequency, pickupWeekday, pickupTimeWindowId) {
    const draft = this._getOrCreateSubscriptionDraft();
    const timeWindows = this._getFromStorage('pickup_time_windows');
    const win = timeWindows.find((w) => w.id === pickupTimeWindowId) || null;

    draft.pickup_frequency = pickupFrequency;
    draft.pickup_weekday = pickupWeekday;
    draft.pickup_time_window_id = win ? win.id : null;
    draft.pickup_time_window_label = win ? win.label : '';
    draft.pickup_time_start = win ? win.start_time : '';
    draft.pickup_time_end = win ? win.end_time : '';
    this._setSubscriptionDraft(draft);

    return {
      pickup_frequency: draft.pickup_frequency,
      pickup_weekday: draft.pickup_weekday,
      pickup_time_window_label: draft.pickup_time_window_label,
      pickup_time_start: draft.pickup_time_start,
      pickup_time_end: draft.pickup_time_end
    };
  }

  // 29. updateSubscriptionCustomerDetails
  updateSubscriptionCustomerDetails(customerDetails) {
    const draft = this._getOrCreateSubscriptionDraft();

    draft.customer_name = customerDetails.customerName || '';
    draft.customer_email = customerDetails.customerEmail || '';
    draft.customer_phone = customerDetails.customerPhone || '';
    draft.address_line1 = customerDetails.addressLine1 || '';
    draft.address_line2 = customerDetails.addressLine2 || '';
    draft.city = customerDetails.city || '';
    draft.state = customerDetails.state || '';
    draft.postal_code = customerDetails.postalCode || '';
    draft.notes = customerDetails.notes || '';

    this._setSubscriptionDraft(draft);

    return {
      customer_name: draft.customer_name,
      customer_email: draft.customer_email,
      customer_phone: draft.customer_phone,
      address_line1: draft.address_line1,
      address_line2: draft.address_line2,
      city: draft.city,
      state: draft.state,
      postal_code: draft.postal_code,
      notes: draft.notes
    };
  }

  // 30. updateSubscriptionPaymentMethod
  updateSubscriptionPaymentMethod(paymentMethod) {
    const draft = this._getOrCreateSubscriptionDraft();
    draft.payment_method = paymentMethod;
    this._setSubscriptionDraft(draft);
    return { payment_method: draft.payment_method };
  }

  // 31. getSubscriptionCheckoutSummary
  getSubscriptionCheckoutSummary() {
    const draft = this._getOrCreateSubscriptionDraft();
    const plans = this._getFromStorage('subscription_plans');
    const plan = draft.plan_id ? plans.find((p) => p.id === draft.plan_id) : null;

    const plan_snapshot = plan
      ? {
          plan_id: plan.plan_id,
          name: plan.name,
          description: plan.description || '',
          max_weight_lbs: plan.max_weight_lbs,
          monthly_price: plan.monthly_price,
          currency: plan.currency
        }
      : {
          plan_id: null,
          name: '',
          description: '',
          max_weight_lbs: null,
          monthly_price: 0,
          currency: 'USD'
        };

    const schedule_snapshot = {
      pickup_frequency: draft.pickup_frequency,
      pickup_weekday: draft.pickup_weekday,
      pickup_time_window_label: draft.pickup_time_window_label,
      pickup_time_start: draft.pickup_time_start,
      pickup_time_end: draft.pickup_time_end
    };

    const customer_snapshot = {
      customer_name: draft.customer_name,
      customer_email: draft.customer_email,
      customer_phone: draft.customer_phone,
      address_line1: draft.address_line1,
      address_line2: draft.address_line2,
      city: draft.city,
      state: draft.state,
      postal_code: draft.postal_code
    };

    // Estimate first pickup date based on next occurrence of weekday
    let estimated_first_pickup_date = null;
    if (draft.pickup_weekday) {
      const weekdays = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const targetIdx = weekdays.indexOf(draft.pickup_weekday);
      if (targetIdx >= 0) {
        const today = new Date();
        let d = new Date(today.getTime());
        for (let i = 0; i < 14; i++) {
          if (d.getDay() === targetIdx) {
            estimated_first_pickup_date = this._dateOnlyISO(d);
            break;
          }
          d.setDate(d.getDate() + 1);
        }
      }
    }

    return {
      plan_snapshot,
      schedule_snapshot,
      customer_snapshot,
      payment_method: draft.payment_method,
      estimated_first_pickup_date
    };
  }

  // 32. confirmSubscription
  confirmSubscription() {
    const draft = this._getOrCreateSubscriptionDraft();
    const plans = this._getFromStorage('subscription_plans');
    const plan = draft.plan_id ? plans.find((p) => p.id === draft.plan_id) : null;
    if (!plan) {
      return {
        success: false,
        subscription_id: null,
        status: null,
        plan_name: '',
        start_date: null
      };
    }

    const now = this._nowISO();
    const subId = this._generateId('sub');

    const subscription = {
      id: subId,
      plan_id: plan.id,
      plan_name_snapshot: plan.name,
      status: 'active',
      start_date: now,
      end_date: null,
      pickup_frequency: draft.pickup_frequency,
      pickup_weekday: draft.pickup_weekday,
      pickup_time_window_id: draft.pickup_time_window_id,
      pickup_time_window_label: draft.pickup_time_window_label,
      pickup_time_start: draft.pickup_time_start,
      pickup_time_end: draft.pickup_time_end,
      customer_name: draft.customer_name,
      customer_email: draft.customer_email,
      customer_phone: draft.customer_phone,
      address_line1: draft.address_line1,
      address_line2: draft.address_line2,
      city: draft.city,
      state: draft.state,
      postal_code: draft.postal_code,
      notes: draft.notes,
      payment_method: draft.payment_method,
      created_at: now,
      updated_at: now
    };

    const subscriptions = this._getFromStorage('subscriptions');
    subscriptions.push(subscription);
    this._saveToStorage('subscriptions', subscriptions);

    // Reset draft
    localStorage.removeItem('subscription_draft');

    return {
      success: true,
      subscription_id: subscription.id,
      status: subscription.status,
      plan_name: subscription.plan_name_snapshot,
      start_date: subscription.start_date
    };
  }

  // 33. searchLocations
  searchLocations(postalCode, radiusMiles, sortBy) {
    let locations = this._getFromStorage('locations');

    if (postalCode) {
      locations = locations.filter((l) => l.postal_code === postalCode);
    }

    if (typeof radiusMiles === 'number') {
      locations = locations.filter((l) => {
        if (typeof l.distance_miles !== 'number') return false;
        return l.distance_miles <= radiusMiles;
      });
    }

    if (!sortBy || sortBy === 'distance') {
      locations = locations.slice().sort((a, b) => {
        const da = typeof a.distance_miles === 'number' ? a.distance_miles : Number.POSITIVE_INFINITY;
        const db = typeof b.distance_miles === 'number' ? b.distance_miles : Number.POSITIVE_INFINITY;
        if (da === db) return 0;
        return da - db;
      });
    } else if (sortBy === 'name') {
      locations = locations.slice().sort((a, b) => {
        return (a.name || '').localeCompare(b.name || '');
      });
    }

    return locations;
  }

  // 34. getLocationDetail
  getLocationDetail(locationId) {
    const locations = this._getFromStorage('locations');
    const loc = locations.find((l) => l.id === locationId) || null;
    return { location: loc };
  }

  // 35. setPreferredLocation
  setPreferredLocation(locationId) {
    let locations = this._getFromStorage('locations');
    const loc = locations.find((l) => l.id === locationId);
    if (!loc) {
      return {
        success: false,
        preferred_location: null,
        user_preferences_snapshot: { preferred_location_id: null },
        message: 'Location not found'
      };
    }

    locations = locations.map((l) =>
      Object.assign({}, l, { is_preferred: l.id === locationId })
    );
    this._saveToStorage('locations', locations);

    const prefs = this._getOrCreateUserPreferences();
    prefs.preferred_location_id = locationId;
    this._setUserPreferences(prefs);

    const updatedLoc = locations.find((l) => l.id === locationId) || loc;

    return {
      success: true,
      preferred_location: updatedLoc,
      user_preferences_snapshot: {
        preferred_location_id: prefs.preferred_location_id
      },
      message: 'Preferred location updated.'
    };
  }

  // 36. getHelpCenterOverview
  getHelpCenterOverview() {
    const categories = this._getFromStorage('help_categories');
    const articles = this._getFromStorage('help_articles');

    const articles_by_category = categories
      .slice()
      .sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
      .map((cat) => {
        const catArticles = articles
          .filter((a) => a.category_id === cat.id && a.status === 'published')
          .map((a) => ({
            article_id: a.article_id,
            title: a.title,
            related_issue_type: a.related_issue_type || null
          }));
        return {
          category_key: cat.key,
          category_name: cat.name,
          articles: catArticles
        };
      });

    return {
      categories,
      articles_by_category
    };
  }

  // 37. getHelpArticleDetail
  getHelpArticleDetail(articleId) {
    const articles = this._getFromStorage('help_articles');
    const categories = this._getFromStorage('help_categories');

    const article = articles.find((a) => a.article_id === articleId);
    if (!article) return null;

    const cat = categories.find((c) => c.id === article.category_id) || null;

    return {
      article_id: article.article_id,
      title: article.title,
      content: article.content,
      category: cat
        ? {
            key: cat.key,
            name: cat.name
          }
        : { key: null, name: '' },
      related_issue_type: article.related_issue_type || null
    };
  }

  // 38. getContactFormConfig
  getContactFormConfig(issueType, relatedArticleId) {
    const articles = this._getFromStorage('help_articles');
    const article = relatedArticleId
      ? articles.find((a) => a.article_id === relatedArticleId) || null
      : null;

    let default_issue_type = issueType || (article ? article.related_issue_type : null) || 'general_question';
    let default_subject = '';

    if (default_issue_type === 'missing_item') {
      default_subject = 'Missing item from order';
    } else if (article) {
      default_subject = 'Question about: ' + article.title;
    } else {
      default_subject = 'Customer inquiry';
    }

    const issue_type_options = [
      { value: 'missing_item', label: 'Missing Item' },
      { value: 'order_problem', label: 'Order Problem' },
      { value: 'payment_issue', label: 'Payment Issue' },
      { value: 'general_question', label: 'General Question' }
    ];

    const related_article = article
      ? {
          article_id: article.article_id,
          title: article.title
        }
      : null;

    return {
      default_subject,
      default_issue_type,
      issue_type_options,
      related_article
    };
  }

  // 39. submitContactMessage
  submitContactMessage(subject, name, email, orderNumber, message, issueType, relatedArticleId) {
    const allowedIssues = ['missing_item', 'order_problem', 'payment_issue', 'general_question'];
    const finalIssueType = allowedIssues.includes(issueType) ? issueType : 'general_question';

    const helpArticles = this._getFromStorage('help_articles');
    let related_article_db_id = null;
    if (relatedArticleId) {
      const article = helpArticles.find((a) => a.article_id === relatedArticleId);
      if (article) related_article_db_id = article.article_id;
    }

    const messages = this._getFromStorage('contact_messages');
    const id = this._generateId('msg');
    const now = this._nowISO();

    const msg = {
      id: id,
      submitted_at: now,
      subject: subject,
      name: name,
      email: email,
      order_number: orderNumber || '',
      message: message,
      issue_type: finalIssueType,
      source: related_article_db_id ? 'help_article_context' : 'contact_page_direct',
      related_article_id: related_article_db_id,
      status: 'open'
    };

    messages.push(msg);
    this._saveToStorage('contact_messages', messages);

    return {
      message_id: id,
      status: msg.status,
      success: true
    };
  }

  // 40. getAboutPageContent
  getAboutPageContent() {
    // Optional custom storage, falls back to empty structure if not present
    const stored = this._getFromStorage('about_page_content', null);
    if (stored && typeof stored === 'object') {
      return stored;
    }
    return {
      headline: '',
      sections: [],
      highlights: []
    };
  }

  // 41. getPolicyPage
  getPolicyPage(key) {
    const policies = this._getFromStorage('policy_pages');
    const policy = policies.find((p) => p.key === key);
    if (!policy) {
      return {
        key: key,
        title: '',
        content: '',
        last_updated: ''
      };
    }
    return {
      key: policy.key,
      title: policy.title,
      content: policy.content,
      last_updated: policy.last_updated
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
