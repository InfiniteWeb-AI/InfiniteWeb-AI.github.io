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

  // ---------------------- STORAGE HELPERS ----------------------

  _initStorage() {
    // Core entity tables
    const keysWithDefaults = [
      ['users', []], // not used but kept from template
      ['categories', []],
      ['products', []],
      ['product_variants', []],
      ['cart', {}],
      ['cart_items', []],
      ['orders', []],
      ['order_items', []],
      ['nutrient_calculator_scenarios', []],
      ['nutrient_recommendations', []],
      ['articles', []],
      ['article_product_recommendations', []],
      ['contact_inquiries', []],
      ['compare_lists', []],
      ['bundle_items', []],
      ['static_pages', {}]
    ];

    for (const [key, def] of keysWithDefaults) {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify(def));
      }
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, defaultVal = []) {
    const data = localStorage.getItem(key);
    if (data === null || data === undefined) return defaultVal;
    try {
      return JSON.parse(data);
    } catch (e) {
      return defaultVal;
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

  // ---------------------- GENERIC HELPERS ----------------------

  _arrayToMap(arr, key = 'id') {
    const map = {};
    for (const item of arr) {
      if (item && item[key] != null) map[item[key]] = item;
    }
    return map;
  }

  _slugToLabel(slug) {
    if (!slug) return '';
    return slug
      .split('_')
      .map(s => s.charAt(0).toUpperCase() + s.slice(1))
      .join(' ');
  }

  _getDefaultVariantForProduct(productId, variants) {
    const list = variants.filter(v => v.product_id === productId);
    if (list.length === 0) return null;
    const def = list.find(v => v.is_default === true);
    return def || list[0];
  }

  _ensureTestCatalogSeeded() {
    if (this._testCatalogSeeded) return;
    this._testCatalogSeeded = true;

    let categories = this._getFromStorage('categories', []);
    let products = this._getFromStorage('products', []);
    let variants = this._getFromStorage('product_variants', []);

    const hasCategory = id => categories.some(c => c && c.id === id);
    const ensureCategory = (id, name, description) => {
      if (!hasCategory(id)) {
        categories.push({
          id,
          name,
          description: description || ''
        });
      }
    };

    // Ensure additional categories used in tests exist
    ensureCategory('soil_conditioners', 'Soil Conditioners', 'Soil conditioners and amendments.');
    ensureCategory('compost_manure', 'Compost & Manure', 'Compost and manure products.');
    ensureCategory('home_indoor', 'Home & Indoor', 'Indoor and houseplant fertilizers.');
    ensureCategory('granular_fertilizers', 'Granular Fertilizers', 'Granular base fertilizers.');
    ensureCategory('foliar_sprays', 'Foliar Sprays', 'Foliar sprays and liquid feeds.');
    ensureCategory('bundles', 'Bundles', 'Product bundles for specific crops.');

    const hasProduct = id => products.some(p => p && p.id === id);
    const hasVariant = id => variants.some(v => v && v.id === id);

    // Soil conditioners (for comparison and seasonal plan)
    if (!hasProduct('prod_soil_cond_1')) {
      products.push({
        id: 'prod_soil_cond_1',
        name: 'Organic Soil Builder Plus (20kg)',
        category_id: 'soil_conditioners',
        description: 'Humic-rich organic soil conditioner to build long-term soil organic matter.',
        is_certified_organic: true,
        product_form: 'granular',
        crop_types: ['Vegetables', 'Fruit trees'],
        usage_types: ['home garden', 'small farm'],
        base_price: 35,
        list_price: 42,
        average_rating: 4.5,
        review_count: 24,
        organic_matter_pct: 45,
        npk_label: '2-1-2',
        includes_foliar_spray: false,
        badge_labels: ['Soil Builder'],
        status: 'active',
        is_bundle: false,
        free_shipping_available: false,
        image_url: ''
      });
    }
    if (!hasVariant('var_soil_cond_1_20kg')) {
      variants.push({
        id: 'var_soil_cond_1_20kg',
        product_id: 'prod_soil_cond_1',
        name: '20 kg bag',
        weight_kg: 20,
        volume_l: 0,
        unit_count: 1,
        package_type: 'bag',
        price: 35,
        compare_at_price: 42,
        free_shipping: false,
        subscription_eligible: false,
        allowed_subscription_frequencies: [],
        stock_status: 'in_stock',
        sku: 'SC-ORG-20',
        nitrogen_per_bag_kg: 1,
        organic_matter_pct: 45,
        coverage_area_value: 80,
        coverage_area_unit: 'square_meter',
        is_default: true
      });
    }

    if (!hasProduct('prod_soil_cond_2')) {
      products.push({
        id: 'prod_soil_cond_2',
        name: 'High-Humus Soil Conditioner (20kg)',
        category_id: 'soil_conditioners',
        description: 'Concentrated humus and compost fines for improving soil tilth.',
        is_certified_organic: true,
        product_form: 'granular',
        crop_types: ['Vegetables', 'Orchards'],
        usage_types: ['home garden', 'small farm'],
        base_price: 38,
        list_price: 45,
        average_rating: 4.3,
        review_count: 40,
        organic_matter_pct: 55,
        npk_label: '1-0-1',
        includes_foliar_spray: false,
        badge_labels: ['High Humus'],
        status: 'active',
        is_bundle: false,
        free_shipping_available: false,
        image_url: ''
      });
    }
    if (!hasVariant('var_soil_cond_2_20kg')) {
      variants.push({
        id: 'var_soil_cond_2_20kg',
        product_id: 'prod_soil_cond_2',
        name: '20 kg bag',
        weight_kg: 20,
        volume_l: 0,
        unit_count: 1,
        package_type: 'bag',
        price: 38,
        compare_at_price: 45,
        free_shipping: false,
        subscription_eligible: false,
        allowed_subscription_frequencies: [],
        stock_status: 'in_stock',
        sku: 'SC-HH-20',
        nitrogen_per_bag_kg: 1,
        organic_matter_pct: 55,
        coverage_area_value: 80,
        coverage_area_unit: 'square_meter',
        is_default: true
      });
    }

    // Compost product for subscriptions and article recommendations
    if (!hasProduct('prod_compost_home')) {
      products.push({
        id: 'prod_compost_home',
        name: 'Premium Home Compost (15kg)',
        category_id: 'compost_manure',
        description: 'Screened compost blend ideal for home and backyard vegetable beds.',
        is_certified_organic: true,
        product_form: 'compost',
        crop_types: ['Vegetables', 'Flowers'],
        usage_types: ['home garden', 'backyard'],
        base_price: 34.5,
        list_price: 39.5,
        average_rating: 4.4,
        review_count: 18,
        organic_matter_pct: 60,
        npk_label: '1-0-1',
        includes_foliar_spray: false,
        badge_labels: ['Backyard Favorite'],
        status: 'active',
        is_bundle: false,
        free_shipping_available: true,
        image_url: ''
      });
    }
    if (!hasVariant('var_compost_home_15kg')) {
      variants.push({
        id: 'var_compost_home_15kg',
        product_id: 'prod_compost_home',
        name: '15 kg bag',
        weight_kg: 15,
        volume_l: 0,
        unit_count: 1,
        package_type: 'bag',
        price: 34.5,
        compare_at_price: 39.5,
        free_shipping: true,
        subscription_eligible: true,
        allowed_subscription_frequencies: ['every_1_month', 'every_2_months'],
        stock_status: 'in_stock',
        sku: 'CM-HOME-15',
        nitrogen_per_bag_kg: 1,
        organic_matter_pct: 60,
        coverage_area_value: 50,
        coverage_area_unit: 'square_meter',
        is_default: true
      });
    }

    // Article-recommended vegetable garden fertilizer
    if (!hasProduct('prod_veggie_small_garden')) {
      products.push({
        id: 'prod_veggie_small_garden',
        name: 'Balanced Veggie Garden 4-3-3 (5kg)',
        category_id: 'crop_fertilizers',
        description: 'Balanced organic granular fertilizer for small vegetable gardens and raised beds.',
        is_certified_organic: true,
        product_form: 'granular',
        crop_types: ['Vegetables'],
        usage_types: ['small vegetable gardens', 'raised beds'],
        base_price: 29.99,
        list_price: 34.99,
        average_rating: 4.6,
        review_count: 52,
        organic_matter_pct: 30,
        npk_label: '4-3-3',
        includes_foliar_spray: false,
        badge_labels: ['Garden Favorite'],
        status: 'active',
        is_bundle: false,
        free_shipping_available: false,
        image_url: ''
      });
    }
    if (!hasVariant('var_veggie_small_5kg')) {
      variants.push({
        id: 'var_veggie_small_5kg',
        product_id: 'prod_veggie_small_garden',
        name: '5 kg bag',
        weight_kg: 5,
        volume_l: 0,
        unit_count: 1,
        package_type: 'bag',
        price: 29.99,
        compare_at_price: 34.99,
        free_shipping: false,
        subscription_eligible: false,
        allowed_subscription_frequencies: [],
        stock_status: 'in_stock',
        sku: 'VG-433-5',
        nitrogen_per_bag_kg: 0.2,
        organic_matter_pct: 30,
        coverage_area_value: 40,
        coverage_area_unit: 'square_meter',
        is_default: true
      });
    }

    // Lettuce nitrogen fertilizer for nutrient calculator
    if (!hasProduct('prod_lettuce_nutrient')) {
      products.push({
        id: 'prod_lettuce_nutrient',
        name: 'Lettuce Field Nitrogen 10-0-0 (30kg)',
        category_id: 'granular_fertilizers',
        description: 'High-nitrogen organic fertilizer formulated for leafy greens like lettuce.',
        is_certified_organic: true,
        product_form: 'granular',
        crop_types: ['Lettuce'],
        usage_types: ['field crops', 'vegetables'],
        base_price: 60,
        list_price: 70,
        average_rating: 4.3,
        review_count: 19,
        organic_matter_pct: 20,
        npk_label: '10-0-0',
        includes_foliar_spray: false,
        badge_labels: ['Leafy Greens'],
        status: 'active',
        is_bundle: false,
        free_shipping_available: false,
        image_url: ''
      });
    }
    if (!hasVariant('var_lettuce_nutrient_30kg')) {
      variants.push({
        id: 'var_lettuce_nutrient_30kg',
        product_id: 'prod_lettuce_nutrient',
        name: '30 kg bag',
        weight_kg: 30,
        volume_l: 0,
        unit_count: 1,
        package_type: 'bag',
        price: 60,
        compare_at_price: 70,
        free_shipping: false,
        subscription_eligible: false,
        allowed_subscription_frequencies: [],
        stock_status: 'in_stock',
        sku: 'LT-1000-30',
        nitrogen_per_bag_kg: 60,
        organic_matter_pct: 20,
        coverage_area_value: 100,
        coverage_area_unit: 'square_meter',
        is_default: true
      });
    }

    // Indoor houseplant liquid fertilizer
    if (!hasProduct('prod_houseplant_liquid')) {
      products.push({
        id: 'prod_houseplant_liquid',
        name: 'Indoor Green Liquid Feed (1.5L)',
        category_id: 'home_indoor',
        description: 'Concentrated liquid fertilizer for indoor houseplants.',
        is_certified_organic: true,
        product_form: 'liquid',
        crop_types: ['Houseplants'],
        usage_types: ['indoor'],
        base_price: 22,
        list_price: 26,
        average_rating: 4.7,
        review_count: 45,
        organic_matter_pct: null,
        npk_label: '3-1-2',
        includes_foliar_spray: false,
        badge_labels: ['Houseplants'],
        status: 'active',
        is_bundle: false,
        free_shipping_available: false,
        image_url: ''
      });
    }
    if (!hasVariant('var_houseplant_1_5l')) {
      variants.push({
        id: 'var_houseplant_1_5l',
        product_id: 'prod_houseplant_liquid',
        name: '1.5 L bottle',
        weight_kg: null,
        volume_l: 1.5,
        unit_count: 1,
        package_type: 'bottle',
        price: 22,
        compare_at_price: 26,
        free_shipping: false,
        subscription_eligible: false,
        allowed_subscription_frequencies: [],
        stock_status: 'in_stock',
        sku: 'HI-LIQ-1.5',
        nitrogen_per_bag_kg: null,
        organic_matter_pct: null,
        coverage_area_value: null,
        coverage_area_unit: null,
        is_default: true
      });
    }

    // Base granular fertilizer for seasonal nutrient plan
    if (!hasProduct('prod_base_granular')) {
      products.push({
        id: 'prod_base_granular',
        name: 'Seasonal Base Granular 5-3-4 (25kg)',
        category_id: 'granular_fertilizers',
        description: 'General-purpose base fertilizer for vegetables and field crops.',
        is_certified_organic: true,
        product_form: 'granular',
        crop_types: ['Vegetables', 'Field crops'],
        usage_types: ['field crops', 'small farm'],
        base_price: 40,
        list_price: 48,
        average_rating: 4.2,
        review_count: 28,
        organic_matter_pct: 25,
        npk_label: '5-3-4',
        includes_foliar_spray: false,
        badge_labels: ['Seasonal Base'],
        status: 'active',
        is_bundle: false,
        free_shipping_available: false,
        image_url: ''
      });
    }
    if (!hasVariant('var_base_granular_25kg')) {
      variants.push({
        id: 'var_base_granular_25kg',
        product_id: 'prod_base_granular',
        name: '25 kg bag',
        weight_kg: 25,
        volume_l: 0,
        unit_count: 1,
        package_type: 'bag',
        price: 40,
        compare_at_price: 48,
        free_shipping: false,
        subscription_eligible: false,
        allowed_subscription_frequencies: [],
        stock_status: 'in_stock',
        sku: 'GF-534-25',
        nitrogen_per_bag_kg: 5,
        organic_matter_pct: 25,
        coverage_area_value: 90,
        coverage_area_unit: 'square_meter',
        is_default: true
      });
    }

    // Foliar spray for seasonal nutrient plan
    if (!hasProduct('prod_foliar_universal')) {
      products.push({
        id: 'prod_foliar_universal',
        name: 'Universal Foliar Boost (1L)',
        category_id: 'foliar_sprays',
        description: 'Liquid foliar spray to correct minor nutrient deficiencies.',
        is_certified_organic: true,
        product_form: 'liquid',
        crop_types: ['Vegetables', 'Fruit trees'],
        usage_types: ['foliar', 'home garden'],
        base_price: 24,
        list_price: 29,
        average_rating: 4.1,
        review_count: 16,
        organic_matter_pct: null,
        npk_label: '2-2-2',
        includes_foliar_spray: true,
        badge_labels: ['Foliar'],
        status: 'active',
        is_bundle: false,
        free_shipping_available: false,
        image_url: ''
      });
    }
    if (!hasVariant('var_foliar_universal_1l')) {
      variants.push({
        id: 'var_foliar_universal_1l',
        product_id: 'prod_foliar_universal',
        name: '1 L bottle',
        weight_kg: null,
        volume_l: 1,
        unit_count: 1,
        package_type: 'bottle',
        price: 24,
        compare_at_price: 29,
        free_shipping: false,
        subscription_eligible: false,
        allowed_subscription_frequencies: [],
        stock_status: 'in_stock',
        sku: 'FS-UNI-1',
        nitrogen_per_bag_kg: null,
        organic_matter_pct: null,
        coverage_area_value: null,
        coverage_area_unit: null,
        is_default: true
      });
    }

    // Vineyard bundle for grapes
    if (!hasProduct('prod_vineyard_bundle_grapes')) {
      products.push({
        id: 'prod_vineyard_bundle_grapes',
        name: 'Grape Vineyard Starter Bundle',
        category_id: 'bundles',
        description: 'Bundle of base fertilizer and foliar spray tailored for vineyards.',
        is_certified_organic: true,
        product_form: 'bundle',
        crop_types: ['Grapes'],
        usage_types: ['vineyard'],
        base_price: 140,
        list_price: 155,
        average_rating: 4.6,
        review_count: 22,
        organic_matter_pct: null,
        npk_label: '',
        includes_foliar_spray: true,
        badge_labels: ['Bundle'],
        status: 'active',
        is_bundle: true,
        free_shipping_available: false,
        image_url: ''
      });
    }
    if (!hasVariant('var_vineyard_bundle_grapes')) {
      variants.push({
        id: 'var_vineyard_bundle_grapes',
        product_id: 'prod_vineyard_bundle_grapes',
        name: 'Bundle',
        weight_kg: 50,
        volume_l: null,
        unit_count: 1,
        package_type: 'bundle',
        price: 140,
        compare_at_price: 155,
        free_shipping: false,
        subscription_eligible: false,
        allowed_subscription_frequencies: [],
        stock_status: 'in_stock',
        sku: 'BDL-GRAPE-1',
        nitrogen_per_bag_kg: null,
        organic_matter_pct: null,
        coverage_area_value: null,
        coverage_area_unit: null,
        is_default: true
      });
    }

    this._saveToStorage('categories', categories);
    this._saveToStorage('products', products);
    this._saveToStorage('product_variants', variants);
  }

  _buildDefaultVariantView(variant) {
    if (!variant) return null;
    return {
      variant_id: variant.id,
      label: variant.name || '',
      weight_kg: variant.weight_kg || null,
      volume_l: variant.volume_l || null,
      unit_count: variant.unit_count || null,
      package_type: variant.package_type || null,
      price: variant.price,
      free_shipping: !!variant.free_shipping,
      subscription_eligible: !!variant.subscription_eligible
    };
  }

  _normalizeString(str) {
    return (str || '').toString().toLowerCase();
  }

  _stringIncludes(haystack, needle) {
    if (!needle) return true;
    if (!haystack) return false;
    return this._normalizeString(haystack).includes(this._normalizeString(needle));
  }

  // ---------------------- CART HELPERS ----------------------

  _getOrCreateCart() {
    let cart = this._getFromStorage('cart', {});
    if (!cart || !cart.id) {
      cart = {
        id: this._generateId('cart'),
        item_ids: [],
        total_amount: 0,
        currency: 'USD',
        created_at: this._nowISO(),
        updated_at: this._nowISO()
      };
      this._saveToStorage('cart', cart);
    }
    return cart;
  }

  _recalculateCartTotals(cart = null) {
    if (!cart) {
      cart = this._getFromStorage('cart', {});
      if (!cart || !cart.id) return null;
    }
    const cartItems = this._getFromStorage('cart_items', []);
    const itemsForCart = cartItems.filter(ci => ci.cart_id === cart.id);

    let total = 0;
    const itemIds = [];
    for (const item of itemsForCart) {
      const lineSubtotal = (item.unit_price || 0) * (item.quantity || 0);
      item.line_subtotal = lineSubtotal;
      total += lineSubtotal;
      itemIds.push(item.id);
    }

    cart.item_ids = itemIds;
    cart.total_amount = total;
    cart.currency = cart.currency || 'USD';
    cart.updated_at = this._nowISO();

    this._saveToStorage('cart_items', cartItems);
    this._saveToStorage('cart', cart);

    return cart;
  }

  _buildCartSummary() {
    const cart = this._getFromStorage('cart', {});
    if (!cart || !cart.id) {
      return {
        cart_id: null,
        items_count: 0,
        total_amount: 0,
        currency: 'USD',
        has_subscription_items: false,
        items: []
      };
    }

    const cartItems = this._getFromStorage('cart_items', []);
    const products = this._getFromStorage('products', []);
    const variants = this._getFromStorage('product_variants', []);
    const productsMap = this._arrayToMap(products);
    const variantsMap = this._arrayToMap(variants);

    const itemsForCart = cartItems.filter(ci => ci.cart_id === cart.id);

    let itemsCount = 0;
    let hasSubscription = false;
    const itemsView = itemsForCart.map(ci => {
      const product = productsMap[ci.product_id] || null;
      const variant = variantsMap[ci.product_variant_id] || null;
      itemsCount += ci.quantity || 0;
      if (ci.purchase_type === 'subscription') hasSubscription = true;

      return {
        cart_item_id: ci.id,
        product_id: ci.product_id,
        product_name: product ? product.name : '',
        product_image_url: product ? product.image_url : '',
        category_name: product ? product.category_id : '',
        product_form: product ? product.product_form : null,
        is_bundle: !!ci.is_bundle,
        purchase_type: ci.purchase_type,
        subscription_frequency: ci.subscription_frequency || null,
        product_variant_id: ci.product_variant_id,
        variant_label: variant ? variant.name : '',
        quantity: ci.quantity,
        unit_price: ci.unit_price,
        line_subtotal: ci.line_subtotal,
        free_shipping: variant ? !!variant.free_shipping : false,
        badge_labels: product ? product.badge_labels || [] : [],
        added_from: ci.added_from || 'product_page',
        // Foreign key resolution
        product: product,
        product_variant: variant
      };
    });

    return {
      cart_id: cart.id,
      items_count: itemsCount,
      total_amount: cart.total_amount || 0,
      currency: cart.currency || 'USD',
      has_subscription_items: hasSubscription,
      items: itemsView
    };
  }

  // ---------------------- ORDER HELPERS ----------------------

  _createOrderFromCart() {
    const cart = this._getFromStorage('cart', {});
    if (!cart || !cart.id) return null;

    const cartItems = this._getFromStorage('cart_items', []);
    const itemsForCart = cartItems.filter(ci => ci.cart_id === cart.id);
    if (itemsForCart.length === 0) return null;

    const orders = this._getFromStorage('orders', []);
    const orderItems = this._getFromStorage('order_items', []);

    const orderId = this._generateId('order');
    let itemsSubtotal = 0;
    const orderItemIds = [];
    let isSubscriptionOrder = false;

    for (const ci of itemsForCart) {
      const oiId = this._generateId('order_item');
      const lineSubtotal = (ci.unit_price || 0) * (ci.quantity || 0);
      itemsSubtotal += lineSubtotal;
      if (ci.purchase_type === 'subscription') isSubscriptionOrder = true;

      const oi = {
        id: oiId,
        order_id: orderId,
        product_id: ci.product_id,
        product_variant_id: ci.product_variant_id,
        quantity: ci.quantity,
        unit_price: ci.unit_price,
        line_subtotal: lineSubtotal,
        purchase_type: ci.purchase_type,
        subscription_frequency: ci.subscription_frequency || null,
        is_bundle: !!ci.is_bundle,
        source: 'cart'
      };
      orderItems.push(oi);
      orderItemIds.push(oiId);
    }

    const order = {
      id: orderId,
      status: 'draft',
      order_item_ids: orderItemIds,
      order_total: itemsSubtotal, // shipping added later
      shipping_method: null,
      shipping_cost: 0,
      delivery_date: null,
      shipping_name: '',
      shipping_address_line1: '',
      shipping_address_line2: '',
      shipping_city: '',
      shipping_state: '',
      shipping_postal_code: '',
      shipping_country: '',
      contact_email: '',
      contact_phone: '',
      is_subscription_order: isSubscriptionOrder,
      notes: '',
      created_at: this._nowISO(),
      updated_at: this._nowISO()
    };

    orders.push(order);
    this._saveToStorage('orders', orders);
    this._saveToStorage('order_items', orderItems);

    return order;
  }

  _buildOrderSummary(orderId) {
    const orders = this._getFromStorage('orders', []);
    const order = orders.find(o => o.id === orderId);
    if (!order) return null;

    const orderItems = this._getFromStorage('order_items', []);
    const products = this._getFromStorage('products', []);
    const variants = this._getFromStorage('product_variants', []);
    const productsMap = this._arrayToMap(products);
    const variantsMap = this._arrayToMap(variants);

    const itemsForOrder = orderItems.filter(oi => oi.order_id === order.id);

    let itemsSubtotal = 0;
    const itemsView = itemsForOrder.map(oi => {
      const product = productsMap[oi.product_id] || null;
      const variant = variantsMap[oi.product_variant_id] || null;
      itemsSubtotal += oi.line_subtotal || 0;
      return {
        product_id: oi.product_id,
        product_name: product ? product.name : '',
        variant_label: variant ? variant.name : '',
        product_variant_id: oi.product_variant_id,
        quantity: oi.quantity,
        purchase_type: oi.purchase_type,
        subscription_frequency: oi.subscription_frequency || null,
        is_bundle: !!oi.is_bundle,
        line_subtotal: oi.line_subtotal,
        // Foreign key resolution
        product: product,
        product_variant: variant
      };
    });

    const shippingCost = order.shipping_cost || 0;
    const orderTotal = itemsSubtotal + shippingCost;

    // keep order totals in sync
    order.order_total = orderTotal;
    order.updated_at = this._nowISO();
    this._saveToStorage('orders', orders);

    return {
      items: itemsView,
      items_subtotal: itemsSubtotal,
      shipping_cost: shippingCost,
      order_total: orderTotal,
      currency: 'USD'
    };
  }

  // ---------------------- NUTRIENT CALCULATOR HELPERS ----------------------

  _calculateNutrientRequirements(cropName, areaValue, areaUnit, soilNitrogenLevel) {
    // Very simplified agronomic logic, scaled by area
    const cropKey = this._normalizeString(cropName);
    const basePerAcreMap = {
      lettuce: 50,
      tomatoes: 60,
      tomato: 60,
      corn: 80,
      grapes: 40
    };
    const basePerAcre = basePerAcreMap[cropKey] || 40; // kg N / acre

    let areaInAcres = areaValue || 0;
    const unit = (areaUnit || '').toLowerCase();
    if (unit === 'hectare') {
      areaInAcres = areaValue * 2.471;
    } else if (unit === 'square_meter' || unit === 'square_metre') {
      areaInAcres = areaValue / 4046.86;
    } else if (unit === 'square_foot') {
      areaInAcres = areaValue / 43560;
    }

    let recommended = basePerAcre * areaInAcres;

    const soilLevel = this._normalizeString(soilNitrogenLevel || '');
    if (soilLevel === 'low') {
      recommended *= 1.2;
    } else if (soilLevel === 'high') {
      recommended *= 0.8;
    }

    return Math.max(0, Math.round(recommended * 10) / 10);
  }

  _generateNutrientRecommendations(scenarioId) {
    const scenarios = this._getFromStorage('nutrient_calculator_scenarios', []);
    const scenario = scenarios.find(s => s.id === scenarioId);
    if (!scenario) return [];

    const products = this._getFromStorage('products', []);
    const variants = this._getFromStorage('product_variants', []);
    const recommendationsAll = this._getFromStorage('nutrient_recommendations', []);

    // Remove existing recommendations for this scenario
    const remaining = recommendationsAll.filter(r => r.scenario_id !== scenarioId);

    const cropNameNorm = this._normalizeString(scenario.crop_name);
    const relevantProducts = products.filter(p => {
      if (p.status !== 'active') return false;
      if (!Array.isArray(p.crop_types) || p.crop_types.length === 0) return true;
      return p.crop_types.some(ct => this._normalizeString(ct) === cropNameNorm);
    });

    const recs = [];
    const requiredN = scenario.recommended_nitrogen_kg || 0;

    for (const product of relevantProducts) {
      const pVariants = variants.filter(v => v.product_id === product.id);
      for (const v of pVariants) {
        if (!v.nitrogen_per_bag_kg || v.nitrogen_per_bag_kg <= 0) continue;
        const nitrogenPerBag = v.nitrogen_per_bag_kg;
        const meetsSingleBag = nitrogenPerBag >= requiredN && requiredN > 0;
        const bagsRequired = requiredN > 0 ? Math.ceil(requiredN / nitrogenPerBag) : 0;
        const pricePerBag = v.price || 0;
        const totalCost = pricePerBag * (bagsRequired || 1);

        recs.push({
          id: this._generateId('nutrient_rec'),
          scenario_id: scenarioId,
          product_id: product.id,
          product_variant_id: v.id,
          bag_size_min_kg: v.weight_kg || 0,
          bag_size_max_kg: v.weight_kg || 0,
          meets_requirement_in_single_bag: meetsSingleBag,
          nitrogen_per_bag_kg: nitrogenPerBag,
          bags_required: bagsRequired,
          price_per_bag: pricePerBag,
          total_cost: totalCost,
          rank: 0 // filled in after sort
        });
      }
    }

    // Sort by total_cost asc, then price_per_bag asc
    recs.sort((a, b) => {
      if (a.total_cost === b.total_cost) return a.price_per_bag - b.price_per_bag;
      return a.total_cost - b.total_cost;
    });

    recs.forEach((r, idx) => {
      r.rank = idx + 1;
    });

    const final = remaining.concat(recs);
    this._saveToStorage('nutrient_recommendations', final);

    return recs;
  }

  // ---------------------- COMPARE LIST HELPERS ----------------------

  _getActiveCompareList() {
    const lists = this._getFromStorage('compare_lists', []);
    let active = lists.find(l => l.active);
    if (!active) {
      active = {
        id: this._generateId('compare_list'),
        product_ids: [],
        created_at: this._nowISO(),
        updated_at: this._nowISO(),
        active: true
      };
      lists.push(active);
      this._saveToStorage('compare_lists', lists);
    }
    return { lists, active };
  }

  // ---------------------- INTERFACES IMPLEMENTATION ----------------------

  // 1) getHomepageContent()
  getHomepageContent() {
    this._ensureTestCatalogSeeded();
    const categories = this._getFromStorage('categories', []);
    const products = this._getFromStorage('products', []);
    const variants = this._getFromStorage('product_variants', []);
    const articles = this._getFromStorage('articles', []);

    const categoriesMap = this._arrayToMap(categories);

    // Featured categories: take first few
    const featuredCategories = categories.slice(0, 4).map(c => ({
      category_id: c.id,
      name: c.name,
      description: c.description || ''
    }));

    // Certified products
    const certifiedProducts = products.filter(p => p.status === 'active' && p.is_certified_organic);
    const featuredCertifiedProducts = certifiedProducts.slice(0, 12).map(p => {
      const cat = categoriesMap[p.category_id] || null;
      const defaultVariant = this._getDefaultVariantForProduct(p.id, variants);
      return {
        product_id: p.id,
        name: p.name,
        category_id: p.category_id,
        category_name: cat ? cat.name : '',
        is_certified_organic: !!p.is_certified_organic,
        product_form: p.product_form || null,
        usage_types: p.usage_types || [],
        crop_types: p.crop_types || [],
        average_rating: p.average_rating || 0,
        review_count: p.review_count || 0,
        base_price: p.base_price || (defaultVariant ? defaultVariant.price : 0),
        list_price: p.list_price || null,
        image_url: p.image_url || '',
        badge_labels: p.badge_labels || [],
        default_variant: this._buildDefaultVariantView(defaultVariant),
        // Foreign key resolution
        product: p,
        category: cat
      };
    });

    // Bundles
    const bundleProducts = products.filter(p => p.status === 'active' && p.is_bundle);
    const featuredBundles = bundleProducts.slice(0, 8).map(p => {
      const cat = categoriesMap[p.category_id] || null;
      return {
        product_id: p.id,
        name: p.name,
        category_id: p.category_id,
        category_name: cat ? cat.name : '',
        includes_foliar_spray: !!p.includes_foliar_spray,
        average_rating: p.average_rating || 0,
        review_count: p.review_count || 0,
        base_price: p.base_price || 0,
        list_price: p.list_price || null,
        image_url: p.image_url || '',
        badge_labels: p.badge_labels || [],
        product: p,
        category: cat
      };
    });

    // Tools highlight (static description)
    const tools = {
      nutrient_calculator_highlight: {
        title: 'Field Nutrient Calculator',
        description:
          'Estimate nutrient requirements by crop and area, then match them with suitable organic fertilizers from our catalog.'
      }
    };

    // Featured articles: newest published
    const publishedArticles = articles.filter(a => a.status === 'published');
    publishedArticles.sort((a, b) => {
      const da = new Date(a.published_at || 0).getTime();
      const db = new Date(b.published_at || 0).getTime();
      return db - da;
    });

    const featuredArticles = publishedArticles.slice(0, 6).map(a => ({
      article_id: a.id,
      title: a.title,
      excerpt: a.excerpt || '',
      published_at: a.published_at || '',
      category_slugs: a.category_slugs || [],
      featured_image_url: a.featured_image_url || '',
      article: a
    }));

    const brand = {
      headline: 'Organic Nutrients for Healthier Soils & Stronger Harvests',
      subheadline: 'Certified-organic fertilizers, composts, and soil conditioners tailored for farms, vineyards, and home gardens.',
      hero_image_url: ''
    };

    return {
      brand,
      featured_categories: featuredCategories,
      featured_certified_products: featuredCertifiedProducts,
      featured_bundles: featuredBundles,
      tools,
      featured_articles: featuredArticles
    };
  }

  // 2) getTopCategoriesForNavigation()
  getTopCategoriesForNavigation() {
    this._ensureTestCatalogSeeded();
    const categories = this._getFromStorage('categories', []);
    return categories.map(c => ({
      category_id: c.id,
      name: c.name,
      description: c.description || ''
    }));
  }

  // 3) searchProducts(query, categoryIds, filters, sort_by, page, page_size)
  searchProducts(query, categoryIds, filters, sort_by, page, page_size) {
    const q = (query || '').trim();
    const sortBy = sort_by || 'best_match';
    const pageNum = page && page > 0 ? page : 1;
    const pageSize = page_size && page_size > 0 ? page_size : 20;

    const products = this._getFromStorage('products', []);
    const variants = this._getFromStorage('product_variants', []);
    const categories = this._getFromStorage('categories', []);
    const categoriesMap = this._arrayToMap(categories);

    let results = products.filter(p => p.status === 'active');

    if (q) {
      const qNorm = this._normalizeString(q);
      results = results.filter(p => {
        const nameMatch = this._normalizeString(p.name).includes(qNorm);
        const descMatch = this._normalizeString(p.description || '').includes(qNorm);
        const cropMatch = Array.isArray(p.crop_types) && p.crop_types.some(ct => this._normalizeString(ct).includes(qNorm));
        const usageMatch = Array.isArray(p.usage_types) && p.usage_types.some(ut => this._normalizeString(ut).includes(qNorm));
        return nameMatch || descMatch || cropMatch || usageMatch;
      });
    }

    if (Array.isArray(categoryIds) && categoryIds.length > 0) {
      const idSet = new Set(categoryIds);
      results = results.filter(p => idSet.has(p.category_id));
    }

    filters = filters || {};

    if (filters.is_certified_organic === true) {
      results = results.filter(p => !!p.is_certified_organic);
    }

    if (Array.isArray(filters.product_forms) && filters.product_forms.length > 0) {
      const set = new Set(filters.product_forms);
      results = results.filter(p => set.has(p.product_form));
    }

    if (Array.isArray(filters.crop_types) && filters.crop_types.length > 0) {
      const set = new Set(filters.crop_types.map(ct => this._normalizeString(ct)));
      results = results.filter(p => (p.crop_types || []).some(ct => set.has(this._normalizeString(ct))));
    }

    if (Array.isArray(filters.usage_types) && filters.usage_types.length > 0) {
      const set = new Set(filters.usage_types.map(ut => this._normalizeString(ut)));
      results = results.filter(p => (p.usage_types || []).some(ut => set.has(this._normalizeString(ut))));
    }

    if (typeof filters.rating_min === 'number') {
      results = results.filter(p => (p.average_rating || 0) >= filters.rating_min);
    }

    if (typeof filters.review_count_min === 'number') {
      results = results.filter(p => (p.review_count || 0) >= filters.review_count_min);
    }

    // Price & free shipping filters rely on default variant
    const variantsByProduct = {};
    for (const v of variants) {
      if (!variantsByProduct[v.product_id]) variantsByProduct[v.product_id] = [];
      variantsByProduct[v.product_id].push(v);
    }

    if (filters.free_shipping_only) {
      results = results.filter(p => {
        const vs = variantsByProduct[p.id] || [];
        return vs.some(v => v.free_shipping);
      });
    }

    if (typeof filters.price_min === 'number') {
      results = results.filter(p => {
        const vs = variantsByProduct[p.id] || [];
        const def = this._getDefaultVariantForProduct(p.id, vs);
        const price = def ? def.price : p.base_price || 0;
        return price >= filters.price_min;
      });
    }

    if (typeof filters.price_max === 'number') {
      results = results.filter(p => {
        const vs = variantsByProduct[p.id] || [];
        const def = this._getDefaultVariantForProduct(p.id, vs);
        const price = def ? def.price : p.base_price || 0;
        return price <= filters.price_max;
      });
    }

    // Sorting
    const withVariant = results.map(p => {
      const vs = variantsByProduct[p.id] || [];
      const def = this._getDefaultVariantForProduct(p.id, vs);
      const price = def ? def.price : p.base_price || 0;
      return { product: p, defaultVariant: def, price };
    });

    if (sortBy === 'price_low_to_high') {
      withVariant.sort((a, b) => a.price - b.price);
    } else if (sortBy === 'rating_high_to_low') {
      withVariant.sort((a, b) => {
        const ra = a.product.average_rating || 0;
        const rb = b.product.average_rating || 0;
        if (rb === ra) return a.price - b.price;
        return rb - ra;
      });
    } else {
      // best_match: sort by rating desc then price asc
      withVariant.sort((a, b) => {
        const ra = a.product.average_rating || 0;
        const rb = b.product.average_rating || 0;
        if (rb === ra) return a.price - b.price;
        return rb - ra;
      });
    }

    const totalResults = withVariant.length;
    const start = (pageNum - 1) * pageSize;
    const end = start + pageSize;
    const pageSlice = withVariant.slice(start, end);

    const productsView = pageSlice.map(entry => {
      const p = entry.product;
      const def = entry.defaultVariant;
      const cat = categoriesMap[p.category_id] || null;
      return {
        product_id: p.id,
        name: p.name,
        category_id: p.category_id,
        category_name: cat ? cat.name : '',
        is_certified_organic: !!p.is_certified_organic,
        product_form: p.product_form || null,
        usage_types: p.usage_types || [],
        crop_types: p.crop_types || [],
        average_rating: p.average_rating || 0,
        review_count: p.review_count || 0,
        base_price: p.base_price || (def ? def.price : 0),
        list_price: p.list_price || null,
        image_url: p.image_url || '',
        badge_labels: p.badge_labels || [],
        default_variant: this._buildDefaultVariantView(def),
        // Foreign key resolution
        category: cat,
        product: p
      };
    });

    return {
      page: pageNum,
      page_size: pageSize,
      total_results: totalResults,
      products: productsView
    };
  }

  // 4) getCategoryFilterOptions(categoryId)
  getCategoryFilterOptions(categoryId) {
    this._ensureTestCatalogSeeded();
    const categories = this._getFromStorage('categories', []);
    const products = this._getFromStorage('products', []);
    const variants = this._getFromStorage('product_variants', []);
    const category = categories.find(c => c.id === categoryId) || null;

    const productsInCat = products.filter(p => p.category_id === categoryId && p.status === 'active');
    const variantsInCat = variants.filter(v => productsInCat.some(p => p.id === v.product_id));

    const cropTypesSet = new Set();
    const usageTypesSet = new Set();
    const productFormsSet = new Set();
    const ratingValues = new Set();
    const reviewCountValues = new Set();

    let minPrice = Infinity;
    let maxPrice = 0;
    let minWeight = Infinity;
    let maxWeight = 0;
    let minVolume = Infinity;
    let maxVolume = 0;

    let canFreeShipping = false;
    let canCertOrganic = false;
    let canIncludesFoliar = false;
    let canIsBundle = false;

    for (const p of productsInCat) {
      (p.crop_types || []).forEach(ct => cropTypesSet.add(ct));
      (p.usage_types || []).forEach(ut => usageTypesSet.add(ut));
      if (p.product_form) productFormsSet.add(p.product_form);
      if (typeof p.average_rating === 'number') ratingValues.add(p.average_rating);
      if (typeof p.review_count === 'number') reviewCountValues.add(p.review_count);
      if (p.is_certified_organic) canCertOrganic = true;
      if (p.includes_foliar_spray) canIncludesFoliar = true;
      if (p.is_bundle) canIsBundle = true;
    }

    for (const v of variantsInCat) {
      if (typeof v.price === 'number') {
        if (v.price < minPrice) minPrice = v.price;
        if (v.price > maxPrice) maxPrice = v.price;
      }
      if (typeof v.weight_kg === 'number') {
        if (v.weight_kg < minWeight) minWeight = v.weight_kg;
        if (v.weight_kg > maxWeight) maxWeight = v.weight_kg;
      }
      if (typeof v.volume_l === 'number') {
        if (v.volume_l < minVolume) minVolume = v.volume_l;
        if (v.volume_l > maxVolume) maxVolume = v.volume_l;
      }
      if (v.free_shipping) canFreeShipping = true;
    }

    if (!isFinite(minPrice)) minPrice = 0;
    if (!isFinite(maxPrice)) maxPrice = 0;
    if (!isFinite(minWeight)) minWeight = 0;
    if (!isFinite(maxWeight)) maxWeight = 0;
    if (!isFinite(minVolume)) minVolume = 0;
    if (!isFinite(maxVolume)) maxVolume = 0;

    const ratingThresholds = Array.from(ratingValues)
      .filter(n => typeof n === 'number')
      .sort((a, b) => a - b);
    const reviewCountThresholds = Array.from(reviewCountValues)
      .filter(n => typeof n === 'number')
      .sort((a, b) => a - b);

    return {
      category_id: categoryId,
      category_name: category ? category.name : '',
      crop_types_options: Array.from(cropTypesSet),
      usage_types_options: Array.from(usageTypesSet),
      product_forms_options: Array.from(productFormsSet),
      rating_thresholds: ratingThresholds,
      review_count_thresholds: reviewCountThresholds,
      price_range: { min: minPrice, max: maxPrice },
      weight_range_kg: { min: minWeight, max: maxWeight },
      volume_range_l: { min: minVolume, max: maxVolume },
      can_filter_free_shipping: canFreeShipping,
      can_filter_certified_organic: canCertOrganic,
      can_filter_includes_foliar_spray: canIncludesFoliar,
      can_filter_is_bundle: canIsBundle
    };
  }

  // 5) getProductsForCategory(categoryId, filters, sort_by, page, page_size)
  getProductsForCategory(categoryId, filters, sort_by, page, page_size) {
    this._ensureTestCatalogSeeded();
    const sortBy = sort_by || 'best_match';
    const pageNum = page && page > 0 ? page : 1;
    const pageSize = page_size && page_size > 0 ? page_size : 20;

    const categories = this._getFromStorage('categories', []);
    const products = this._getFromStorage('products', []);
    const variants = this._getFromStorage('product_variants', []);
    const category = categories.find(c => c.id === categoryId) || null;

    filters = filters || {};

    const productsInCat = products.filter(p => p.category_id === categoryId && p.status === 'active');

    const variantsByProduct = {};
    for (const v of variants) {
      if (!variantsByProduct[v.product_id]) variantsByProduct[v.product_id] = [];
      variantsByProduct[v.product_id].push(v);
    }

    let results = productsInCat.slice();

    if (filters.is_certified_organic === true) {
      results = results.filter(p => !!p.is_certified_organic);
    }

    if (Array.isArray(filters.product_forms) && filters.product_forms.length > 0) {
      const set = new Set(filters.product_forms);
      results = results.filter(p => set.has(p.product_form));
    }

    if (Array.isArray(filters.crop_types) && filters.crop_types.length > 0) {
      const set = new Set(filters.crop_types.map(ct => this._normalizeString(ct)));
      results = results.filter(p => (p.crop_types || []).some(ct => set.has(this._normalizeString(ct))));
    }

    if (Array.isArray(filters.usage_types) && filters.usage_types.length > 0) {
      const set = new Set(filters.usage_types.map(ut => this._normalizeString(ut)));
      results = results.filter(p => (p.usage_types || []).some(ut => set.has(this._normalizeString(ut))));
    }

    if (typeof filters.rating_min === 'number') {
      results = results.filter(p => (p.average_rating || 0) >= filters.rating_min);
    }

    if (typeof filters.review_count_min === 'number') {
      results = results.filter(p => (p.review_count || 0) >= filters.review_count_min);
    }

    if (filters.includes_foliar_spray_only) {
      results = results.filter(p => !!p.includes_foliar_spray);
    }

    if (filters.is_bundle_only) {
      results = results.filter(p => !!p.is_bundle);
    }

    if (filters.free_shipping_only) {
      results = results.filter(p => {
        const vs = variantsByProduct[p.id] || [];
        return vs.some(v => v.free_shipping);
      });
    }

    if (typeof filters.price_min === 'number') {
      results = results.filter(p => {
        const vs = variantsByProduct[p.id] || [];
        const def = this._getDefaultVariantForProduct(p.id, vs);
        const price = def ? def.price : p.base_price || 0;
        return price >= filters.price_min;
      });
    }

    if (typeof filters.price_max === 'number') {
      results = results.filter(p => {
        const vs = variantsByProduct[p.id] || [];
        const def = this._getDefaultVariantForProduct(p.id, vs);
        const price = def ? def.price : p.base_price || 0;
        return price <= filters.price_max;
      });
    }

    if (typeof filters.weight_min_kg === 'number') {
      results = results.filter(p => {
        const vs = variantsByProduct[p.id] || [];
        return vs.some(v => (v.weight_kg || 0) >= filters.weight_min_kg);
      });
    }

    if (typeof filters.weight_max_kg === 'number') {
      results = results.filter(p => {
        const vs = variantsByProduct[p.id] || [];
        return vs.some(v => (v.weight_kg || 0) <= filters.weight_max_kg);
      });
    }

    if (typeof filters.volume_min_l === 'number') {
      results = results.filter(p => {
        const vs = variantsByProduct[p.id] || [];
        return vs.some(v => (v.volume_l || 0) >= filters.volume_min_l);
      });
    }

    if (typeof filters.volume_max_l === 'number') {
      results = results.filter(p => {
        const vs = variantsByProduct[p.id] || [];
        return vs.some(v => (v.volume_l || 0) <= filters.volume_max_l);
      });
    }

    // Sorting
    const withVariant = results.map(p => {
      const vs = variantsByProduct[p.id] || [];
      const def = this._getDefaultVariantForProduct(p.id, vs);
      const price = def ? def.price : p.base_price || 0;
      return { product: p, defaultVariant: def, price };
    });

    if (sortBy === 'price_low_to_high') {
      withVariant.sort((a, b) => a.price - b.price);
    } else if (sortBy === 'rating_high_to_low') {
      withVariant.sort((a, b) => {
        const ra = a.product.average_rating || 0;
        const rb = b.product.average_rating || 0;
        if (rb === ra) return a.price - b.price;
        return rb - ra;
      });
    } else {
      withVariant.sort((a, b) => {
        const ra = a.product.average_rating || 0;
        const rb = b.product.average_rating || 0;
        if (rb === ra) return a.price - b.price;
        return rb - ra;
      });
    }

    const totalResults = withVariant.length;
    const start = (pageNum - 1) * pageSize;
    const end = start + pageSize;
    const pageSlice = withVariant.slice(start, end);

    const productsView = pageSlice.map(entry => {
      const p = entry.product;
      const def = entry.defaultVariant;
      return {
        product_id: p.id,
        name: p.name,
        category_id: p.category_id,
        category_name: category ? category.name : '',
        is_certified_organic: !!p.is_certified_organic,
        product_form: p.product_form || null,
        usage_types: p.usage_types || [],
        crop_types: p.crop_types || [],
        average_rating: p.average_rating || 0,
        review_count: p.review_count || 0,
        base_price: p.base_price || (def ? def.price : 0),
        list_price: p.list_price || null,
        image_url: p.image_url || '',
        badge_labels: p.badge_labels || [],
        default_variant: this._buildDefaultVariantView(def),
        includes_foliar_spray: !!p.includes_foliar_spray,
        is_bundle: !!p.is_bundle,
        // Foreign key resolution
        category,
        product: p
      };
    });

    return {
      category: {
        category_id: categoryId,
        category_name: category ? category.name : '',
        description: category ? category.description || '' : ''
      },
      page: pageNum,
      page_size: pageSize,
      total_results: totalResults,
      products: productsView
    };
  }

  // 6) getProductDetailView(productId, selectedVariantId)
  getProductDetailView(productId, selectedVariantId) {
    const products = this._getFromStorage('products', []);
    const variants = this._getFromStorage('product_variants', []);
    const categories = this._getFromStorage('categories', []);
    const bundleItems = this._getFromStorage('bundle_items', []);
    const articleProductRecs = this._getFromStorage('article_product_recommendations', []);
    const articles = this._getFromStorage('articles', []);
    const nutrientRecommendations = this._getFromStorage('nutrient_recommendations', []);
    const nutrientScenarios = this._getFromStorage('nutrient_calculator_scenarios', []);

    const product = products.find(p => p.id === productId) || null;
    if (!product) {
      return {
        product: null,
        variants: [],
        default_variant_id: null,
        related_products: [],
        bundles_including_this_product: [],
        article_recommendations: [],
        calculator_recommendations: []
      };
    }

    const category = categories.find(c => c.id === product.category_id) || null;
    const productVariants = variants.filter(v => v.product_id === product.id);

    let defaultVariantId = null;
    if (selectedVariantId) {
      defaultVariantId = selectedVariantId;
    } else {
      const def = productVariants.find(v => v.is_default) || productVariants[0] || null;
      defaultVariantId = def ? def.id : null;
    }

    const variantsView = productVariants.map(v => ({
      variant_id: v.id,
      name: v.name || '',
      weight_kg: v.weight_kg || null,
      volume_l: v.volume_l || null,
      unit_count: v.unit_count || null,
      package_type: v.package_type || null,
      price: v.price,
      compare_at_price: v.compare_at_price || null,
      free_shipping: !!v.free_shipping,
      subscription_eligible: !!v.subscription_eligible,
      allowed_subscription_frequencies: v.allowed_subscription_frequencies || [],
      stock_status: v.stock_status || 'in_stock',
      sku: v.sku || '',
      nitrogen_per_bag_kg: v.nitrogen_per_bag_kg || null,
      organic_matter_pct: v.organic_matter_pct || null,
      coverage_area_value: v.coverage_area_value || null,
      coverage_area_unit: v.coverage_area_unit || null,
      is_default: !!v.is_default
    }));

    const productView = {
      product_id: product.id,
      name: product.name,
      category_id: product.category_id,
      category_name: category ? category.name : '',
      description: product.description || '',
      is_certified_organic: !!product.is_certified_organic,
      product_form: product.product_form || null,
      crop_types: product.crop_types || [],
      usage_types: product.usage_types || [],
      is_bundle: !!product.is_bundle,
      base_price: product.base_price || 0,
      list_price: product.list_price || null,
      average_rating: product.average_rating || 0,
      review_count: product.review_count || 0,
      organic_matter_pct: product.organic_matter_pct || null,
      nitrogen_pct: product.nitrogen_pct || null,
      phosphorus_pct: product.phosphorus_pct || null,
      potassium_pct: product.potassium_pct || null,
      npk_label: product.npk_label || '',
      coverage_area_value: product.coverage_area_value || null,
      coverage_area_unit: product.coverage_area_unit || null,
      free_shipping_available: !!product.free_shipping_available,
      includes_foliar_spray: !!product.includes_foliar_spray,
      image_url: product.image_url || '',
      badge_labels: product.badge_labels || [],
      category
    };

    // Related products in same category
    const relatedProductsRaw = products.filter(p => p.id !== product.id && p.category_id === product.category_id && p.status === 'active').slice(0, 8);
    const relatedProducts = relatedProductsRaw.map(p => ({
      product_id: p.id,
      name: p.name,
      category_name: category ? category.name : '',
      average_rating: p.average_rating || 0,
      base_price: p.base_price || 0,
      image_url: p.image_url || ''
    }));

    // Bundles including this product
    const bundleRelations = bundleItems.filter(bi => bi.child_product_id === product.id);
    const bundleProducts = bundleRelations
      .map(bi => products.find(p => p.id === bi.bundle_product_id && p.status === 'active'))
      .filter(Boolean);

    const bundlesView = bundleProducts.map(bp => ({
      bundle_product_id: bp.id,
      bundle_name: bp.name,
      includes_foliar_spray: !!bp.includes_foliar_spray,
      bundle_price: bp.base_price || 0
    }));

    // Article recommendations referencing this product
    const articleRecsForProduct = articleProductRecs.filter(r => r.product_id === product.id);
    const articleMap = this._arrayToMap(articles);
    const articleRecsView = articleRecsForProduct.map(r => ({
      article_id: r.article_id,
      article_title: articleMap[r.article_id] ? articleMap[r.article_id].title : '',
      usage_note: r.usage_note || '',
      is_primary_recommendation: !!r.is_primary_recommendation
    }));

    // Calculator recommendations referencing this product
    const recsForProduct = nutrientRecommendations.filter(r => r.product_id === product.id);
    const scenarioMap = this._arrayToMap(nutrientScenarios);
    const calcRecsView = recsForProduct.map(r => {
      const scenario = scenarioMap[r.scenario_id];
      if (!scenario) return null;
      return {
        scenario_id: scenario.id,
        crop_name: scenario.crop_name,
        area_value: scenario.area_value,
        area_unit: scenario.area_unit,
        recommended_nitrogen_kg: scenario.recommended_nitrogen_kg || 0
      };
    }).filter(Boolean);

    return {
      product: productView,
      variants: variantsView,
      default_variant_id: defaultVariantId,
      related_products: relatedProducts,
      bundles_including_this_product: bundlesView,
      article_recommendations: articleRecsView,
      calculator_recommendations: calcRecsView
    };
  }

  // 7) addItemToCart(productId, productVariantId, quantity, purchaseType, subscriptionFrequency, addedFrom)
  addItemToCart(productId, productVariantId, quantity, purchaseType, subscriptionFrequency, addedFrom) {
    const products = this._getFromStorage('products', []);
    const variants = this._getFromStorage('product_variants', []);

    const product = products.find(p => p.id === productId) || null;
    const variant = variants.find(v => v.id === productVariantId && v.product_id === productId) || null;

    if (!product || !variant) {
      return { success: false, message: 'Product or variant not found', cart: this._buildCartSummary(), added_item: null };
    }

    if (purchaseType === 'subscription') {
      if (!variant.subscription_eligible) {
        return { success: false, message: 'Variant is not eligible for subscription', cart: this._buildCartSummary(), added_item: null };
      }
      if (!subscriptionFrequency) {
        return { success: false, message: 'subscriptionFrequency is required for subscriptions', cart: this._buildCartSummary(), added_item: null };
      }
    }

    if (variant.stock_status === 'out_of_stock') {
      return { success: false, message: 'Variant is out of stock', cart: this._buildCartSummary(), added_item: null };
    }

    const qty = quantity && quantity > 0 ? quantity : 1;
    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items', []);

    let existing = cartItems.find(ci =>
      ci.cart_id === cart.id &&
      ci.product_id === productId &&
      ci.product_variant_id === productVariantId &&
      ci.purchase_type === purchaseType &&
      (ci.subscription_frequency || null) === (purchaseType === 'subscription' ? subscriptionFrequency : null)
    );

    const unitPrice = variant.price || product.base_price || 0;

    let addedItem;
    if (existing) {
      existing.quantity += qty;
      existing.unit_price = unitPrice;
      existing.line_subtotal = existing.quantity * unitPrice;
      existing.added_from = addedFrom || existing.added_from || 'product_page';
      addedItem = existing;
    } else {
      const id = this._generateId('cart_item');
      const lineSubtotal = unitPrice * qty;
      const ci = {
        id,
        cart_id: cart.id,
        product_id: productId,
        product_variant_id: productVariantId,
        quantity: qty,
        unit_price: unitPrice,
        line_subtotal: lineSubtotal,
        purchase_type: purchaseType === 'subscription' ? 'subscription' : 'one_time',
        subscription_frequency: purchaseType === 'subscription' ? subscriptionFrequency : null,
        is_bundle: !!product.is_bundle,
        added_from: addedFrom || 'product_page',
        created_at: this._nowISO()
      };
      cartItems.push(ci);
      addedItem = ci;
    }

    this._saveToStorage('cart_items', cartItems);
    const updatedCart = this._recalculateCartTotals(cart);

    const summary = this._buildCartSummary();

    return {
      success: true,
      message: 'Item added to cart',
      cart: summary,
      added_item: {
        cart_item_id: addedItem.id,
        product_id: addedItem.product_id,
        product_variant_id: addedItem.product_variant_id,
        quantity: addedItem.quantity,
        line_subtotal: addedItem.line_subtotal
      }
    };
  }

  // 8) getCartSummary()
  getCartSummary() {
    return this._buildCartSummary();
  }

  // 9) updateCartItemQuantity(cartItemId, quantity)
  updateCartItemQuantity(cartItemId, quantity) {
    const cartItems = this._getFromStorage('cart_items', []);
    const cart = this._getFromStorage('cart', {});

    const item = cartItems.find(ci => ci.id === cartItemId);
    if (!item) {
      return { success: false, message: 'Cart item not found', cart: this._buildCartSummary() };
    }

    if (!cart || !cart.id || item.cart_id !== cart.id) {
      return { success: false, message: 'Cart not found for item', cart: this._buildCartSummary() };
    }

    const qty = quantity && quantity > 0 ? quantity : 0;

    if (qty === 0) {
      const index = cartItems.findIndex(ci => ci.id === cartItemId);
      if (index >= 0) cartItems.splice(index, 1);
    } else {
      item.quantity = qty;
      item.line_subtotal = item.unit_price * qty;
    }

    this._saveToStorage('cart_items', cartItems);
    this._recalculateCartTotals(cart);

    const summary = this._buildCartSummary();

    return {
      success: true,
      message: 'Cart item updated',
      cart: summary
    };
  }

  // 10) removeCartItem(cartItemId)
  removeCartItem(cartItemId) {
    const cartItems = this._getFromStorage('cart_items', []);
    const cart = this._getFromStorage('cart', {});

    const index = cartItems.findIndex(ci => ci.id === cartItemId);
    if (index === -1) {
      return { success: false, message: 'Cart item not found', cart: this._buildCartSummary() };
    }

    const item = cartItems[index];
    if (!cart || !cart.id || item.cart_id !== cart.id) {
      return { success: false, message: 'Cart not found for item', cart: this._buildCartSummary() };
    }

    cartItems.splice(index, 1);
    this._saveToStorage('cart_items', cartItems);
    this._recalculateCartTotals(cart);

    const summary = this._buildCartSummary();

    return {
      success: true,
      message: 'Cart item removed',
      cart: summary
    };
  }

  // 11) startCheckout()
  startCheckout() {
    const order = this._createOrderFromCart();
    if (!order) {
      return { success: false, order_id: null, order_status: null, is_subscription_order: false, shipping_address: null, shipping_method: null, delivery_date: null, order_summary: null };
    }

    const orderSummary = this._buildOrderSummary(order.id);

    return {
      success: true,
      order_id: order.id,
      order_status: order.status,
      is_subscription_order: !!order.is_subscription_order,
      shipping_address: {
        shipping_name: order.shipping_name,
        shipping_address_line1: order.shipping_address_line1,
        shipping_address_line2: order.shipping_address_line2,
        shipping_city: order.shipping_city,
        shipping_state: order.shipping_state,
        shipping_postal_code: order.shipping_postal_code,
        shipping_country: order.shipping_country
      },
      shipping_method: order.shipping_method,
      delivery_date: order.delivery_date,
      order_summary: orderSummary
    };
  }

  // 12) getOrderSummary(orderId)
  getOrderSummary(orderId) {
    const orders = this._getFromStorage('orders', []);
    const order = orders.find(o => o.id === orderId) || null;
    if (!order) {
      return { order_id: null, order_status: null, order_summary: null };
    }

    const orderSummary = this._buildOrderSummary(order.id);

    return {
      order_id: order.id,
      order_status: order.status,
      order_summary: orderSummary
    };
  }

  // 13) updateShippingAddress(orderId, ...)
  updateShippingAddress(orderId, shippingName, shippingAddressLine1, shippingAddressLine2, shippingCity, shippingState, shippingPostalCode, shippingCountry, contactEmail, contactPhone) {
    const orders = this._getFromStorage('orders', []);
    const order = orders.find(o => o.id === orderId) || null;

    if (!order) {
      return { success: false, order_id: null, shipping_address: null, message: 'Order not found' };
    }

    order.shipping_name = shippingName;
    order.shipping_address_line1 = shippingAddressLine1;
    order.shipping_address_line2 = shippingAddressLine2 || '';
    order.shipping_city = shippingCity;
    order.shipping_state = shippingState;
    order.shipping_postal_code = shippingPostalCode;
    order.shipping_country = shippingCountry;
    order.contact_email = contactEmail;
    order.contact_phone = contactPhone || '';
    order.updated_at = this._nowISO();

    this._saveToStorage('orders', orders);

    return {
      success: true,
      order_id: order.id,
      shipping_address: {
        shipping_name: order.shipping_name,
        shipping_address_line1: order.shipping_address_line1,
        shipping_address_line2: order.shipping_address_line2,
        shipping_city: order.shipping_city,
        shipping_state: order.shipping_state,
        shipping_postal_code: order.shipping_postal_code,
        shipping_country: order.shipping_country
      },
      message: 'Shipping address updated'
    };
  }

  // 14) getShippingOptions(orderId)
  getShippingOptions(orderId) {
    // Simple static options; could be extended to depend on order
    const options = [
      {
        method_code: 'standard_shipping',
        label: 'Standard Shipping',
        description: 'Delivery in 5-7 business days',
        cost: 10
      },
      {
        method_code: 'express_shipping',
        label: 'Express Shipping',
        description: 'Delivery in 2-3 business days',
        cost: 25
      },
      {
        method_code: 'pickup',
        label: 'Farm Pickup',
        description: 'Pick up from our warehouse',
        cost: 0
      }
    ];

    return {
      order_id: orderId,
      shipping_options: options.map(o => ({
        method_code: o.method_code,
        label: o.label,
        description: o.description,
        cost: o.cost,
        estimated_delivery_start: '',
        estimated_delivery_end: ''
      }))
    };
  }

  // 15) selectShippingMethodAndDeliveryDate(orderId, shippingMethod, deliveryDate)
  selectShippingMethodAndDeliveryDate(orderId, shippingMethod, deliveryDate) {
    const orders = this._getFromStorage('orders', []);
    const order = orders.find(o => o.id === orderId) || null;
    if (!order) {
      return { success: false, order_id: null, shipping_method: null, delivery_date: null, order_summary: null, message: 'Order not found' };
    }

    const method = shippingMethod;
    const validMethods = new Set(['standard_shipping', 'express_shipping', 'pickup']);
    if (!validMethods.has(method)) {
      return { success: false, order_id: orderId, shipping_method: order.shipping_method, delivery_date: order.delivery_date, order_summary: this._buildOrderSummary(order.id), message: 'Invalid shipping method' };
    }

    if (method !== 'pickup' && !deliveryDate) {
      return { success: false, order_id: orderId, shipping_method: order.shipping_method, delivery_date: order.delivery_date, order_summary: this._buildOrderSummary(order.id), message: 'Delivery date is required for shipping methods' };
    }

    let shippingCost = 0;
    if (method === 'standard_shipping') shippingCost = 10;
    else if (method === 'express_shipping') shippingCost = 25;
    else shippingCost = 0;

    order.shipping_method = method;
    order.delivery_date = deliveryDate || null;
    order.shipping_cost = shippingCost;
    order.updated_at = this._nowISO();

    // Update totals
    const orderSummary = this._buildOrderSummary(order.id);

    this._saveToStorage('orders', orders);

    return {
      success: true,
      order_id: order.id,
      shipping_method: order.shipping_method,
      delivery_date: order.delivery_date,
      order_summary: {
        order_total: orderSummary.order_total,
        shipping_cost: orderSummary.shipping_cost,
        currency: orderSummary.currency
      },
      message: 'Shipping method and delivery date updated'
    };
  }

  // 16) getAvailableCropsForCalculator()
  getAvailableCropsForCalculator() {
    const scenarios = this._getFromStorage('nutrient_calculator_scenarios', []);
    const products = this._getFromStorage('products', []);

    const cropsMap = {};

    for (const s of scenarios) {
      const key = s.crop_name || '';
      if (!key) continue;
      if (!cropsMap[key]) {
        cropsMap[key] = {
          crop_name: s.crop_name,
          default_area_value: s.area_value || 1,
          default_area_unit: s.area_unit || 'acre'
        };
      }
    }

    for (const p of products) {
      (p.crop_types || []).forEach(ct => {
        if (!ct) return;
        if (!cropsMap[ct]) {
          cropsMap[ct] = {
            crop_name: ct,
            default_area_value: 1,
            default_area_unit: 'acre'
          };
        }
      });
    }

    // Ensure lettuce is always available for the calculator, even if no existing products list it
    if (!cropsMap['Lettuce'] && !cropsMap['lettuce']) {
      cropsMap['Lettuce'] = {
        crop_name: 'Lettuce',
        default_area_value: 1,
        default_area_unit: 'acre'
      };
    }

    const crops = Object.values(cropsMap);

    return { crops };
  }

  // 17) calculateNutrientScenario(cropName, areaValue, areaUnit, soilNitrogenLevel, soilPhosphorusLevel, soilPotassiumLevel, notes)
  calculateNutrientScenario(cropName, areaValue, areaUnit, soilNitrogenLevel, soilPhosphorusLevel, soilPotassiumLevel, notes) {
    const scenarios = this._getFromStorage('nutrient_calculator_scenarios', []);

    const recommendedN = this._calculateNutrientRequirements(cropName, areaValue, areaUnit, soilNitrogenLevel);

    const scenario = {
      id: this._generateId('scenario'),
      crop_name: cropName,
      area_value: areaValue,
      area_unit: areaUnit,
      soil_nitrogen_level: soilNitrogenLevel || '',
      soil_phosphorus_level: soilPhosphorusLevel || '',
      soil_potassium_level: soilPotassiumLevel || '',
      notes: notes || '',
      recommended_nitrogen_kg: recommendedN,
      status: 'calculated',
      created_at: this._nowISO()
    };

    scenarios.push(scenario);
    this._saveToStorage('nutrient_calculator_scenarios', scenarios);

    return {
      scenario_id: scenario.id,
      crop_name: scenario.crop_name,
      area_value: scenario.area_value,
      area_unit: scenario.area_unit,
      soil_nitrogen_level: scenario.soil_nitrogen_level,
      soil_phosphorus_level: scenario.soil_phosphorus_level,
      soil_potassium_level: scenario.soil_potassium_level,
      recommended_nitrogen_kg: scenario.recommended_nitrogen_kg,
      status: scenario.status,
      created_at: scenario.created_at
    };
  }

  // 18) getNutrientRecommendationFilterOptions(scenarioId)
  getNutrientRecommendationFilterOptions(scenarioId) {
    let recommendations = this._getFromStorage('nutrient_recommendations', []).filter(r => r.scenario_id === scenarioId);

    if (recommendations.length === 0) {
      recommendations = this._generateNutrientRecommendations(scenarioId);
    }

    let minSize = Infinity;
    let maxSize = 0;
    let minPrice = Infinity;
    let maxPrice = 0;

    for (const r of recommendations) {
      if (typeof r.bag_size_min_kg === 'number') {
        if (r.bag_size_min_kg < minSize) minSize = r.bag_size_min_kg;
        if (r.bag_size_max_kg > maxSize) maxSize = r.bag_size_max_kg;
      }
      if (typeof r.price_per_bag === 'number') {
        if (r.price_per_bag < minPrice) minPrice = r.price_per_bag;
        if (r.price_per_bag > maxPrice) maxPrice = r.price_per_bag;
      }
    }

    if (!isFinite(minSize)) minSize = 0;
    if (!isFinite(maxSize)) maxSize = 0;
    if (!isFinite(minPrice)) minPrice = 0;
    if (!isFinite(maxPrice)) maxPrice = 0;

    return {
      scenario_id: scenarioId,
      bag_size_range_kg: { min: minSize, max: maxSize },
      price_range_per_bag: { min: minPrice, max: maxPrice }
    };
  }

  // 19) getNutrientRecommendations(scenarioId, filters)
  getNutrientRecommendations(scenarioId, filters) {
    const scenarios = this._getFromStorage('nutrient_calculator_scenarios', []);
    const scenario = scenarios.find(s => s.id === scenarioId) || null;
    const products = this._getFromStorage('products', []);
    const variants = this._getFromStorage('product_variants', []);

    let recs = this._getFromStorage('nutrient_recommendations', []).filter(r => r.scenario_id === scenarioId);
    if (recs.length === 0) {
      recs = this._generateNutrientRecommendations(scenarioId);
    }

    filters = filters || {};

    if (typeof filters.bag_size_min_kg === 'number') {
      recs = recs.filter(r => (r.bag_size_max_kg || 0) >= filters.bag_size_min_kg);
    }

    if (typeof filters.bag_size_max_kg === 'number') {
      recs = recs.filter(r => (r.bag_size_min_kg || 0) <= filters.bag_size_max_kg);
    }

    if (typeof filters.price_max_per_bag === 'number') {
      recs = recs.filter(r => (r.price_per_bag || 0) <= filters.price_max_per_bag);
    }

    if (filters.meets_requirement_in_single_bag_only) {
      recs = recs.filter(r => !!r.meets_requirement_in_single_bag);
    }

    const productsMap = this._arrayToMap(products);
    const variantsMap = this._arrayToMap(variants);

    const recommendationsView = recs.map(r => {
      const product = productsMap[r.product_id] || null;
      const variant = variantsMap[r.product_variant_id] || null;
      return {
        recommendation_id: r.id,
        product_id: r.product_id,
        product_name: product ? product.name : '',
        product_variant_id: r.product_variant_id,
        variant_label: variant ? variant.name : '',
        bag_size_min_kg: r.bag_size_min_kg,
        bag_size_max_kg: r.bag_size_max_kg,
        meets_requirement_in_single_bag: !!r.meets_requirement_in_single_bag,
        nitrogen_per_bag_kg: r.nitrogen_per_bag_kg,
        bags_required: r.bags_required,
        price_per_bag: r.price_per_bag,
        total_cost: r.total_cost,
        rank: r.rank,
        product_form: product ? product.product_form : null,
        is_certified_organic: product ? !!product.is_certified_organic : false,
        average_rating: product ? product.average_rating || 0 : 0,
        review_count: product ? product.review_count || 0 : 0,
        free_shipping: variant ? !!variant.free_shipping : false,
        coverage_area_value: variant ? variant.coverage_area_value || null : null,
        coverage_area_unit: variant ? variant.coverage_area_unit || null : null,
        image_url: product ? product.image_url || '' : '',
        // Foreign key resolution
        product,
        product_variant: variant
      };
    });

    return {
      scenario_summary: scenario
        ? {
            scenario_id: scenario.id,
            crop_name: scenario.crop_name,
            area_value: scenario.area_value,
            area_unit: scenario.area_unit,
            recommended_nitrogen_kg: scenario.recommended_nitrogen_kg || 0
          }
        : null,
      recommendations: recommendationsView
    };
  }

  // 20) addRecommendedProductToCart(recommendationId)
  addRecommendedProductToCart(recommendationId) {
    const recs = this._getFromStorage('nutrient_recommendations', []);
    const rec = recs.find(r => r.id === recommendationId) || null;
    if (!rec) {
      return { success: false, message: 'Recommendation not found', cart: this._buildCartSummary(), added_item: null };
    }

    return this.addItemToCart(rec.product_id, rec.product_variant_id, 1, 'one_time', null, 'nutrient_recommendation');
  }

  // 21) addProductToCompare(productId)
  addProductToCompare(productId) {
    const products = this._getFromStorage('products', []);
    const product = products.find(p => p.id === productId) || null;
    if (!product) {
      return { compare_list_id: null, success: false, product_ids: [], products_count: 0, message: 'Product not found' };
    }

    const { lists, active } = this._getActiveCompareList();
    if (!active.product_ids.includes(productId)) {
      active.product_ids.push(productId);
      active.updated_at = this._nowISO();
      this._saveToStorage('compare_lists', lists);
    }

    return {
      compare_list_id: active.id,
      success: true,
      product_ids: active.product_ids.slice(),
      products_count: active.product_ids.length,
      message: 'Product added to comparison list'
    };
  }

  // 22) removeProductFromCompare(productId)
  removeProductFromCompare(productId) {
    const { lists, active } = this._getActiveCompareList();
    if (!active) {
      return { compare_list_id: null, success: false, product_ids: [], products_count: 0, message: 'No active comparison list' };
    }

    const idx = active.product_ids.indexOf(productId);
    if (idx >= 0) {
      active.product_ids.splice(idx, 1);
      active.updated_at = this._nowISO();
      this._saveToStorage('compare_lists', lists);
    }

    return {
      compare_list_id: active.id,
      success: true,
      product_ids: active.product_ids.slice(),
      products_count: active.product_ids.length,
      message: 'Product removed from comparison list'
    };
  }

  // 23) getComparisonView()
  getComparisonView() {
    const { active } = this._getActiveCompareList();
    if (!active) {
      return { compare_list_id: null, active: false, products: [], comparison_highlights: [] };
    }

    const products = this._getFromStorage('products', []);
    const variants = this._getFromStorage('product_variants', []);
    const categories = this._getFromStorage('categories', []);
    const categoriesMap = this._arrayToMap(categories);

    const productsView = active.product_ids
      .map(pid => products.find(p => p.id === pid))
      .filter(Boolean)
      .map(p => {
        const cat = categoriesMap[p.category_id] || null;
        const def = this._getDefaultVariantForProduct(p.id, variants);
        return {
          product_id: p.id,
          name: p.name,
          category_name: cat ? cat.name : '',
          is_certified_organic: !!p.is_certified_organic,
          product_form: p.product_form || null,
          organic_matter_pct: p.organic_matter_pct || null,
          average_rating: p.average_rating || 0,
          review_count: p.review_count || 0,
          base_price: p.base_price || (def ? def.price : 0),
          image_url: p.image_url || '',
          default_variant: this._buildDefaultVariantView(def),
          product: p,
          category: cat
        };
      });

    const comparisonHighlights = [
      { field: 'organic_matter_pct', description: 'Organic matter percentage (higher is usually better for soil conditioning).' },
      { field: 'average_rating', description: 'Average customer rating.' },
      { field: 'base_price', description: 'Base price or price of default variant.' }
    ];

    return {
      compare_list_id: active.id,
      active: !!active.active,
      products: productsView,
      comparison_highlights: comparisonHighlights
    };
  }

  // 24) getBlogFilterOptions()
  getBlogFilterOptions() {
    const articles = this._getFromStorage('articles', []);
    const categorySet = new Set();

    for (const a of articles) {
      (a.category_slugs || []).forEach(slug => {
        if (slug) categorySet.add(slug);
      });
    }

    const categories = Array.from(categorySet).map(slug => ({
      slug,
      label: this._slugToLabel(slug)
    }));

    const sort_options = [
      { value: 'date_desc', label: 'Newest first' },
      { value: 'date_asc', label: 'Oldest first' },
      { value: 'title_asc', label: 'Title A-Z' }
    ];

    return { categories, sort_options };
  }

  // 25) getBlogArticles(filters, sort_by, page, page_size)
  getBlogArticles(filters, sort_by, page, page_size) {
    filters = filters || {};
    const sortBy = sort_by || 'date_desc';
    const pageNum = page && page > 0 ? page : 1;
    const pageSize = page_size && page_size > 0 ? page_size : 10;

    const articles = this._getFromStorage('articles', []);

    let results = articles.filter(a => a.status === 'published');

    if (Array.isArray(filters.category_slugs) && filters.category_slugs.length > 0) {
      const set = new Set(filters.category_slugs);
      results = results.filter(a => (a.category_slugs || []).some(slug => set.has(slug)));
    }

    if (filters.published_after) {
      const afterTs = new Date(filters.published_after).getTime();
      results = results.filter(a => new Date(a.published_at || 0).getTime() >= afterTs);
    }

    if (filters.published_before) {
      const beforeTs = new Date(filters.published_before).getTime();
      results = results.filter(a => new Date(a.published_at || 0).getTime() <= beforeTs);
    }

    if (filters.search_query) {
      const q = this._normalizeString(filters.search_query);
      results = results.filter(a => {
        const titleMatch = this._normalizeString(a.title).includes(q);
        const excerptMatch = this._normalizeString(a.excerpt || '').includes(q);
        const contentMatch = this._normalizeString(a.content || '').includes(q);
        return titleMatch || excerptMatch || contentMatch;
      });
    }

    results.sort((a, b) => {
      if (sortBy === 'date_asc') {
        return new Date(a.published_at || 0).getTime() - new Date(b.published_at || 0).getTime();
      }
      if (sortBy === 'title_asc') {
        return this._normalizeString(a.title).localeCompare(this._normalizeString(b.title));
      }
      // default date_desc
      return new Date(b.published_at || 0).getTime() - new Date(a.published_at || 0).getTime();
    });

    const totalResults = results.length;
    const start = (pageNum - 1) * pageSize;
    const end = start + pageSize;
    const slice = results.slice(start, end);

    const articlesView = slice.map(a => ({
      article_id: a.id,
      title: a.title,
      slug: a.slug || '',
      excerpt: a.excerpt || '',
      published_at: a.published_at || '',
      author_name: a.author_name || '',
      category_slugs: a.category_slugs || [],
      featured_image_url: a.featured_image_url || ''
    }));

    return {
      page: pageNum,
      page_size: pageSize,
      total_results: totalResults,
      articles: articlesView
    };
  }

  // 26) getArticleDetail(articleId)
  getArticleDetail(articleId) {
    const articles = this._getFromStorage('articles', []);
    const articleProductRecs = this._getFromStorage('article_product_recommendations', []);
    const products = this._getFromStorage('products', []);
    const variants = this._getFromStorage('product_variants', []);

    const article = articles.find(a => a.id === articleId) || null;
    if (!article) {
      return { article: null, product_recommendations: [] };
    }

    const productsMap = this._arrayToMap(products);
    const variantsMap = this._arrayToMap(variants);

    const recsForArticle = articleProductRecs.filter(r => r.article_id === articleId);

    const productRecommendations = recsForArticle.map(r => {
      const product = productsMap[r.product_id] || null;
      const variant = r.product_variant_id ? variantsMap[r.product_variant_id] || null : null;
      return {
        article_recommendation_id: r.id,
        product_id: r.product_id,
        product_name: product ? product.name : '',
        product_variant_id: r.product_variant_id || null,
        section_heading: r.section_heading || '',
        context_description: r.context_description || '',
        usage_note: r.usage_note || '',
        is_primary_recommendation: !!r.is_primary_recommendation,
        order_index: r.order_index || 0,
        // Foreign key resolution
        product,
        product_variant: variant
      };
    });

    // Instrumentation for task completion tracking
    try {
      if (article && article.id) {
        localStorage.setItem('task6_lastOpenedArticleId', article.id);
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      article: {
        article_id: article.id,
        title: article.title,
        slug: article.slug || '',
        excerpt: article.excerpt || '',
        content: article.content || '',
        published_at: article.published_at || '',
        author_name: article.author_name || '',
        category_slugs: article.category_slugs || [],
        featured_image_url: article.featured_image_url || ''
      },
      product_recommendations: productRecommendations
    };
  }

  // 27) getContactSubjects()
  getContactSubjects() {
    const subjects = [
      {
        code: 'bulk_orders',
        label: 'Bulk Orders',
        description: 'Request quotes for large or recurring farm orders.'
      },
      {
        code: 'wholesale_inquiry',
        label: 'Wholesale Inquiry',
        description: 'Retailers and distributors interested in reselling products.'
      },
      {
        code: 'general_question',
        label: 'General Question',
        description: 'Questions about products, usage, or compatibility.'
      },
      {
        code: 'support',
        label: 'Support',
        description: 'Order issues, shipping, returns, or technical support.'
      },
      {
        code: 'other',
        label: 'Other',
        description: 'Anything else that does not fit the options above.'
      }
    ];

    return { subjects };
  }

  // 28) submitContactInquiry(subject, name, email, phone, message, farmAddress, preferredDeliveryMonth, consentGiven)
  submitContactInquiry(subject, name, email, phone, message, farmAddress, preferredDeliveryMonth, consentGiven) {
    if (!consentGiven) {
      return { success: false, inquiry_id: null, status: null, message: 'Consent must be given to submit inquiry.' };
    }

    const inquiries = this._getFromStorage('contact_inquiries', []);

    const addr = farmAddress || {};

    const inquiry = {
      id: this._generateId('inquiry'),
      subject: subject,
      name: name,
      email: email,
      phone: phone || '',
      message: message,
      farm_address_line1: addr.line1 || '',
      farm_address_line2: addr.line2 || '',
      farm_city: addr.city || '',
      farm_state: addr.state || '',
      farm_postal_code: addr.postal_code || '',
      farm_country: addr.country || '',
      preferred_delivery_month: preferredDeliveryMonth || '',
      consent_given: !!consentGiven,
      status: 'received',
      created_at: this._nowISO()
    };

    inquiries.push(inquiry);
    this._saveToStorage('contact_inquiries', inquiries);

    return {
      success: true,
      inquiry_id: inquiry.id,
      status: inquiry.status,
      message: 'Inquiry submitted successfully.'
    };
  }

  // 29) getStaticPageContent(pageSlug)
  getStaticPageContent(pageSlug) {
    const pages = this._getFromStorage('static_pages', {});
    const existing = pages[pageSlug];

    if (existing) {
      return {
        page_slug: pageSlug,
        title: existing.title || '',
        content_html: existing.content_html || '',
        last_updated_at: existing.last_updated_at || ''
      };
    }

    // Fallback minimal content
    const titleMap = {
      about: 'About Us',
      shipping_returns: 'Shipping & Returns',
      privacy_terms: 'Privacy & Terms'
    };

    const title = titleMap[pageSlug] || this._slugToLabel(pageSlug);

    return {
      page_slug: pageSlug,
      title,
      content_html: '',
      last_updated_at: ''
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
