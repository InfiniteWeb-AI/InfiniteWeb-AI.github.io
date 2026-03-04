/* localStorage polyfill for Node.js and environments without localStorage */
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
    },
  };
})();

class BusinessLogic {
  constructor() {
    this._initStorage();
    this.idCounter = this._getNextIdCounter();
  }

  // ---------- Initialization & storage helpers ----------

  _initStorage() {
    // Arrays
    const arrayKeys = [
      'products',
      'categories',
      'carts',
      'cart_items',
      'profiles',
      'stores',
      'blog_articles',
      'article_bookmarks',
      'article_product_recommendations',
      'addresses',
      'shipping_methods',
      'orders',
      'order_items',
      'promotions',
      'contact_form_submissions',
      'help_faq_content',
    ];
    arrayKeys.forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, '[]');
      }
    });

    // Objects
    const objectKeys = [
      'about_page_content',
      'contact_page_info',
      'privacy_policy_content',
      'terms_conditions_content',
    ];
    objectKeys.forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify({}));
      }
    });

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

  _formatCurrency(amount) {
    let num = typeof amount === 'number' && !isNaN(amount) ? amount : 0;
    return '$' + num.toFixed(2);
  }

  _formatRatingDisplay(product) {
    if (!product || typeof product.rating_average !== 'number') {
      return 'No reviews';
    }
    const avg = product.rating_average.toFixed(1);
    if (typeof product.rating_count === 'number') {
      return avg + ' (' + product.rating_count + ')';
    }
    return avg;
  }

  _formatSubscriptionFrequency(freq) {
    if (!freq) return '';
    switch (freq) {
      case 'every_1_month':
        return 'Every 1 month';
      case 'every_2_months':
        return 'Every 2 months';
      case 'every_3_months':
        return 'Every 3 months';
      case 'every_30_days':
        return 'Every 30 days';
      default:
        return '';
    }
  }

  _getProductBadges(product) {
    const badges = [];
    if (!product) return badges;
    if (product.is_certified_organic) badges.push('Certified Organic');
    if (product.is_plant_based) badges.push('Plant-based');
    if (product.is_nut_free) badges.push('Nut-free');
    if (product.is_caffeine_free) badges.push('Caffeine-free');
    return badges;
  }

  // ---------- Cart helpers ----------

  _getOrCreateCart() {
    let carts = this._getFromStorage('carts');
    let cart = carts.find((c) => c.status === 'active');
    if (!cart) {
      cart = {
        id: this._generateId('cart'),
        status: 'active',
        cart_item_ids: [],
        created_at: this._now(),
        updated_at: this._now(),
      };
      carts.push(cart);
      this._saveToStorage('carts', carts);
    }
    return cart;
  }

  _saveCart(cart, allCartItems) {
    let carts = this._getFromStorage('carts');
    const idx = carts.findIndex((c) => c.id === cart.id);
    if (idx !== -1) {
      carts[idx] = cart;
    } else {
      carts.push(cart);
    }
    this._recalculateCartTotals(cart, allCartItems);
    this._saveToStorage('carts', carts);
    this._saveToStorage('cart_items', allCartItems);
  }

  _recalculateCartTotals(cart, allCartItems) {
    const products = this._getFromStorage('products');
    const itemsForCart = allCartItems.filter((ci) => ci.cart_id === cart.id);
    let itemsSubtotal = 0;
    let discountTotal = 0;

    itemsForCart.forEach((item) => {
      const product = products.find((p) => p.id === item.product_id);
      const basePrice = product && typeof product.price === 'number' ? product.price : 0;
      item.unit_price = basePrice;
      const lineFull = basePrice * item.quantity;
      let discount = 0;
      let discountPercent = 0;
      if (item.purchase_type === 'subscription') {
        discountPercent =
          typeof item.subscription_discount_percent === 'number'
            ? item.subscription_discount_percent
            : product && typeof product.subscription_discount_percent === 'number'
            ? product.subscription_discount_percent
            : 0;
        item.subscription_discount_percent = discountPercent;
        discount = lineFull * (discountPercent / 100);
      }
      item.line_subtotal = lineFull - discount;
      itemsSubtotal += lineFull;
      discountTotal += discount;
    });

    // We do not persist totals on the cart itself; they are computed on demand in getCartSummary.
    return { itemsSubtotal, discountTotal };
  }

  // ---------- Profile / store credit helpers ----------

  _getOrCreateProfile() {
    let profiles = this._getFromStorage('profiles');
    let profile = profiles[0];
    if (!profile) {
      profile = {
        id: this._generateId('profile'),
        full_name: '',
        email: '',
        password: '',
        default_phone: '',
        preferred_store_id: null,
        store_credit_balance: 0,
        communication_opt_in: false,
        created_at: this._now(),
        updated_at: this._now(),
      };
      profiles.push(profile);
      this._saveToStorage('profiles', profiles);
    }
    return profile;
  }

  _applyStoreCreditToOrder(order) {
    let profiles = this._getFromStorage('profiles');
    let profile = this._getOrCreateProfile();
    const idx = profiles.findIndex((p) => p.id === profile.id);
    if (idx === -1) {
      profiles.push(profile);
    }
    const before = typeof profile.store_credit_balance === 'number' ? profile.store_credit_balance : 0;
    const amountDue = typeof order.grand_total === 'number' ? order.grand_total : 0;
    const applied = Math.min(before, amountDue);
    const after = before - applied;

    profile.store_credit_balance = after;
    profile.updated_at = this._now();
    profiles[profiles.findIndex((p) => p.id === profile.id)] = profile;
    this._saveToStorage('profiles', profiles);

    order.discount_total = (order.discount_total || 0) + applied;
    order.grand_total = amountDue - applied;
    order.updated_at = this._now();

    return {
      profile,
      store_credit_balance_before: before,
      store_credit_balance_after: after,
      applied,
    };
  }

  // ---------- Order helpers ----------

  _generateOrderFromCart(cart, cartItems, shipping_address_input, billing_same_as_shipping, billing_address_input, shipping_method, payment_method) {
    const products = this._getFromStorage('products');

    // Addresses (not yet saved)
    const profile = this._getOrCreateProfile();

    const shippingAddress = {
      id: this._generateId('addr'),
      profile_id: profile.id,
      address_type: 'shipping',
      full_name: shipping_address_input.full_name,
      address_line1: shipping_address_input.address_line1,
      address_line2: shipping_address_input.address_line2 || '',
      city: shipping_address_input.city,
      state: shipping_address_input.state,
      zip_code: shipping_address_input.zip_code,
      email: shipping_address_input.email,
      phone: shipping_address_input.phone,
      is_default: true,
      created_at: this._now(),
    };

    let billingAddress;
    if (billing_same_as_shipping || !billing_address_input) {
      billingAddress = {
        id: this._generateId('addr'),
        profile_id: profile.id,
        address_type: 'billing',
        full_name: shippingAddress.full_name,
        address_line1: shippingAddress.address_line1,
        address_line2: shippingAddress.address_line2,
        city: shippingAddress.city,
        state: shippingAddress.state,
        zip_code: shippingAddress.zip_code,
        email: shippingAddress.email,
        phone: shippingAddress.phone,
        is_default: true,
        created_at: this._now(),
      };
    } else {
      billingAddress = {
        id: this._generateId('addr'),
        profile_id: profile.id,
        address_type: 'billing',
        full_name: billing_address_input.full_name,
        address_line1: billing_address_input.address_line1,
        address_line2: billing_address_input.address_line2 || '',
        city: billing_address_input.city,
        state: billing_address_input.state,
        zip_code: billing_address_input.zip_code,
        email: billing_address_input.email,
        phone: billing_address_input.phone,
        is_default: true,
        created_at: this._now(),
      };
    }

    // Order items
    const orderItems = [];
    let itemsSubtotal = 0;
    let afterDiscountSubtotal = 0;

    cartItems.forEach((ci) => {
      const product = products.find((p) => p.id === ci.product_id);
      const unitPrice = typeof ci.unit_price === 'number' ? ci.unit_price : product && typeof product.price === 'number' ? product.price : 0;
      const quantity = ci.quantity || 0;
      const lineFull = unitPrice * quantity;
      const discountPercent = ci.purchase_type === 'subscription' ? ci.subscription_discount_percent || 0 : 0;
      const lineSubtotal = ci.line_subtotal != null ? ci.line_subtotal : lineFull * (1 - discountPercent / 100);

      itemsSubtotal += lineFull;
      afterDiscountSubtotal += lineSubtotal;

      const orderItem = {
        id: this._generateId('order_item'),
        order_id: null, // filled after order created
        product_id: ci.product_id,
        product_name: product ? product.name : '',
        quantity: quantity,
        purchase_type: ci.purchase_type,
        subscription_frequency: ci.purchase_type === 'subscription' ? ci.subscription_frequency || null : null,
        unit_price: unitPrice,
        subscription_discount_percent: discountPercent,
        line_subtotal: lineSubtotal,
      };

      orderItems.push(orderItem);
    });

    const discountTotal = itemsSubtotal - afterDiscountSubtotal;
    const shippingCost = shipping_method && typeof shipping_method.cost === 'number' ? shipping_method.cost : 0;
    const taxTotal = 0; // tax simulation: 0 for simplicity
    const grandTotal = afterDiscountSubtotal + shippingCost + taxTotal;

    const order = {
      id: this._generateId('order'),
      cart_id: cart.id,
      order_item_ids: orderItems.map((oi) => oi.id),
      shipping_address_id: shippingAddress.id,
      billing_address_id: billingAddress.id,
      billing_same_as_shipping: !!billing_same_as_shipping,
      shipping_method_id: shipping_method ? shipping_method.id : null,
      payment_method: payment_method,
      items_subtotal: itemsSubtotal,
      discount_total: discountTotal,
      shipping_cost: shippingCost,
      tax_total: taxTotal,
      grand_total: grandTotal,
      status: 'draft',
      created_at: this._now(),
      updated_at: this._now(),
    };

    orderItems.forEach((oi) => {
      oi.order_id = order.id;
    });

    return {
      order,
      order_items: orderItems,
      shipping_address: shippingAddress,
      billing_address: billingAddress,
    };
  }

  // ---------- Store helpers ----------

  _updatePreferredStoreFlags(storeId) {
    let stores = this._getFromStorage('stores');
    stores = stores.map((s) => ({
      ...s,
      is_preferred: s.id === storeId,
    }));
    this._saveToStorage('stores', stores);
  }

  _searchStoresByLocation(zip_code, radius_miles) {
    let stores = this._getFromStorage('stores');
    const zipNum = parseInt(zip_code, 10);

    stores = stores.map((store) => {
      const storeZipNum = parseInt(store.zip_code, 10);
      let distance = store.distance_from_last_search || null;
      if (!isNaN(zipNum) && !isNaN(storeZipNum)) {
        // Simple distance heuristic based on zip difference
        distance = Math.abs(storeZipNum - zipNum) * 0.1;
      }
      return {
        ...store,
        distance_from_last_search: distance,
      };
    });

    if (!isNaN(zipNum)) {
      stores = stores.filter(
        (s) => typeof s.distance_from_last_search === 'number' && s.distance_from_last_search <= radius_miles
      );
    }

    stores.sort((a, b) => {
      const da = typeof a.distance_from_last_search === 'number' ? a.distance_from_last_search : Infinity;
      const db = typeof b.distance_from_last_search === 'number' ? b.distance_from_last_search : Infinity;
      return da - db;
    });

    this._saveToStorage('stores', stores);
    return stores;
  }

  // ---------- Article helpers ----------

  _getArticleRecommendations(articleId) {
    const recs = this._getFromStorage('article_product_recommendations');
    const products = this._getFromStorage('products');
    const filtered = recs.filter((r) => r.article_id === articleId);
    filtered.sort((a, b) => {
      const pa = typeof a.position === 'number' ? a.position : 0;
      const pb = typeof b.position === 'number' ? b.position : 0;
      return pa - pb;
    });
    return filtered.map((r) => ({
      product: products.find((p) => p.id === r.product_id) || null,
      call_to_action_label: r.call_to_action_label || '',
      position: r.position,
    }));
  }

  // ---------- Shipping helpers ----------

  _getAvailableShippingMethodsForCart(cart) {
    let methods = this._getFromStorage('shipping_methods');
    methods.sort((a, b) => {
      const sa = typeof a.sort_order === 'number' ? a.sort_order : 0;
      const sb = typeof b.sort_order === 'number' ? b.sort_order : 0;
      if (sa !== sb) return sa - sb;
      if (a.name && b.name) return a.name.localeCompare(b.name);
      return 0;
    });
    return methods;
  }

  // ---------- Category helpers ----------

  _getDescendantCategoryIds(categoryId, categories) {
    const ids = [];
    if (!categoryId) return ids;
    const queue = [categoryId];
    ids.push(categoryId);
    while (queue.length) {
      const currentId = queue.shift();
      categories.forEach((cat) => {
        if (cat.parent_category_id === currentId) {
          ids.push(cat.id);
          queue.push(cat.id);
        }
      });
    }
    return ids;
  }

  // =====================================================
  // Interface implementations
  // =====================================================

  // ---------- Navigation & homepage ----------

  getNavigationCategories() {
    // Return all categories; frontend can pick top-level and key subcategories
    const categories = this._getFromStorage('categories');
    return categories;
  }

  getHomePageContent() {
    const categories = this._getFromStorage('categories');
    const products = this._getFromStorage('products');
    const blogArticles = this._getFromStorage('blog_articles');
    const promotionsRaw = localStorage.getItem('promotions');
    const promotions = promotionsRaw ? JSON.parse(promotionsRaw) : [];

    return {
      featured_categories: categories.slice(0, 4),
      featured_products: products.slice(0, 8),
      featured_blog_articles: blogArticles.slice(0, 3),
      promotions: promotions,
    };
  }

  // ---------- Categories & filters ----------

  getCategoryDetails(categoryId) {
    const categories = this._getFromStorage('categories');
    const category = categories.find((c) => c.id === categoryId) || null;
    const parent_category =
      category && category.parent_category_id
        ? categories.find((c) => c.id === category.parent_category_id) || null
        : null;
    const child_categories = categories.filter((c) => c.parent_category_id === categoryId);

    return {
      category,
      parent_category,
      child_categories,
    };
  }

  getCategoryFilterOptions(categoryId) {
    const categories = this._getFromStorage('categories');
    const allProducts = this._getFromStorage('products');

    let products = allProducts;
    if (categoryId) {
      const ids = this._getDescendantCategoryIds(categoryId, categories);
      products = allProducts.filter(
        (p) => Array.isArray(p.category_ids) && p.category_ids.some((id) => ids.includes(id))
      );
    }

    let min_price = null;
    let max_price = null;
    const size_units_set = new Set();
    const size_values_set = new Set();
    const flavors_set = new Set();
    const function_tags_set = new Set();
    const product_subtypes_set = new Set();
    const rating_options_set = new Set();

    products.forEach((p) => {
      if (typeof p.price === 'number') {
        if (min_price === null || p.price < min_price) min_price = p.price;
        if (max_price === null || p.price > max_price) max_price = p.price;
      }
      if (p.size_unit) size_units_set.add(p.size_unit);
      if (typeof p.size_value === 'number') size_values_set.add(p.size_value);
      if (p.flavor) flavors_set.add(p.flavor);
      if (Array.isArray(p.function_tags)) {
        p.function_tags.forEach((t) => function_tags_set.add(t));
      }
      if (p.product_subtype) product_subtypes_set.add(p.product_subtype);
      if (typeof p.rating_average === 'number') {
        const rounded = Math.floor(p.rating_average);
        if (rounded >= 1 && rounded <= 5) rating_options_set.add(rounded);
      }
    });

    const price_range = {
      min_price: min_price === null ? 0 : min_price,
      max_price: max_price === null ? 0 : max_price,
    };

    const rating_options = Array.from(rating_options_set).sort((a, b) => b - a);
    const size_units = Array.from(size_units_set);
    const size_values = Array.from(size_values_set).sort((a, b) => a - b);
    const flavors = Array.from(flavors_set);
    const function_tags = Array.from(function_tags_set);
    const product_subtypes = Array.from(product_subtypes_set);

    const dietary_filters = [
      { key: 'is_certified_organic', label: 'Certified Organic' },
      { key: 'is_plant_based', label: 'Plant-based' },
      { key: 'is_nut_free', label: 'Nut-free' },
      { key: 'is_caffeine_free', label: 'Caffeine-free' },
    ];

    return {
      price_range,
      rating_options,
      size_units,
      size_values,
      flavors,
      function_tags,
      dietary_filters,
      product_subtypes,
    };
  }

  // ---------- Product listing & search ----------

  getProductList(query, categoryId, filters, sort_by, page, page_size) {
    const categories = this._getFromStorage('categories');
    let products = this._getFromStorage('products');

    // Search query
    if (query) {
      const q = String(query).toLowerCase();
      products = products.filter((p) => {
        const nameMatch = p.name && p.name.toLowerCase().includes(q);
        const descMatch = p.description && p.description.toLowerCase().includes(q);
        const dietMatch = Array.isArray(p.dietary_tags)
          ? p.dietary_tags.some((t) => t && t.toLowerCase().includes(q))
          : false;
        const funcMatch = Array.isArray(p.function_tags)
          ? p.function_tags.some((t) => t && t.toLowerCase().includes(q))
          : false;
        return nameMatch || descMatch || dietMatch || funcMatch;
      });
    }

    // Category & descendants
    if (categoryId) {
      const ids = this._getDescendantCategoryIds(categoryId, categories);
      products = products.filter(
        (p) => Array.isArray(p.category_ids) && p.category_ids.some((id) => ids.includes(id))
      );
    }

    // Filters
    filters = filters || {};

    if (typeof filters.is_certified_organic === 'boolean') {
      products = products.filter(
        (p) => !!p.is_certified_organic === filters.is_certified_organic
      );
    }
    if (typeof filters.is_plant_based === 'boolean') {
      products = products.filter((p) => !!p.is_plant_based === filters.is_plant_based);
    }
    if (typeof filters.is_nut_free === 'boolean') {
      products = products.filter((p) => !!p.is_nut_free === filters.is_nut_free);
    }
    if (typeof filters.is_caffeine_free === 'boolean') {
      products = products.filter((p) => !!p.is_caffeine_free === filters.is_caffeine_free);
    }
    if (typeof filters.min_capsules_per_bottle === 'number') {
      products = products.filter(
        (p) => typeof p.capsules_per_bottle === 'number' && p.capsules_per_bottle >= filters.min_capsules_per_bottle
      );
    }
    if (typeof filters.min_tea_bags_per_box === 'number') {
      products = products.filter(
        (p) => typeof p.tea_bags_per_box === 'number' && p.tea_bags_per_box >= filters.min_tea_bags_per_box
      );
    }
    if (typeof filters.min_price === 'number') {
      products = products.filter(
        (p) => typeof p.price === 'number' && p.price >= filters.min_price
      );
    }
    if (typeof filters.max_price === 'number') {
      products = products.filter(
        (p) => typeof p.price === 'number' && p.price <= filters.max_price
      );
    }
    if (typeof filters.min_rating === 'number') {
      products = products.filter(
        (p) => typeof p.rating_average === 'number' && p.rating_average >= filters.min_rating
      );
    }
    if (typeof filters.size_value === 'number') {
      products = products.filter((p) => p.size_value === filters.size_value);
    }
    if (filters.size_unit) {
      const unit = String(filters.size_unit).toLowerCase();
      products = products.filter(
        (p) => p.size_unit && String(p.size_unit).toLowerCase() === unit
      );
    }
    if (filters.flavor) {
      const fl = String(filters.flavor).toLowerCase();
      products = products.filter(
        (p) => p.flavor && String(p.flavor).toLowerCase() === fl
      );
    }
    if (filters.product_subtype) {
      products = products.filter(
        (p) => p.product_subtype === filters.product_subtype
      );
    }
    if (Array.isArray(filters.function_tags) && filters.function_tags.length) {
      products = products.filter((p) => {
        if (!Array.isArray(p.function_tags)) return false;
        return filters.function_tags.every((tag) => p.function_tags.includes(tag));
      });
    }

    // Sorting
    switch (sort_by) {
      case 'price_low_to_high':
        products.sort((a, b) => (a.price || 0) - (b.price || 0));
        break;
      case 'price_high_to_low':
        products.sort((a, b) => (b.price || 0) - (a.price || 0));
        break;
      case 'rating_high_to_low':
        products.sort(
          (a, b) => (b.rating_average || 0) - (a.rating_average || 0)
        );
        break;
      case 'newest':
        products.sort(
          (a, b) =>
            new Date(b.created_at || 0).getTime() -
            new Date(a.created_at || 0).getTime()
        );
        break;
      case 'relevance':
      default:
        // leave as-is (implicit relevance)
        break;
    }

    page = page || 1;
    page_size = page_size || 20;
    const total_results = products.length;
    const start = (page - 1) * page_size;
    const paginated = products.slice(start, start + page_size);

    const categoriesById = {};
    categories.forEach((c) => {
      categoriesById[c.id] = c;
    });

    const productItems = paginated.map((p) => {
      const primaryCategoryId = Array.isArray(p.category_ids) && p.category_ids.length ? p.category_ids[0] : null;
      const primaryCategory = primaryCategoryId ? categoriesById[primaryCategoryId] : null;
      const primary_category_name = primaryCategory ? primaryCategory.name : '';
      return {
        product: p,
        primary_category_name,
        price_formatted: this._formatCurrency(p.price || 0),
        rating_display: this._formatRatingDisplay(p),
        is_subscription_available: !!p.subscription_available,
      };
    });

    const applied_filters = {
      is_certified_organic: filters.is_certified_organic,
      is_plant_based: filters.is_plant_based,
      is_nut_free: filters.is_nut_free,
      is_caffeine_free: filters.is_caffeine_free,
      min_capsules_per_bottle: filters.min_capsules_per_bottle,
      min_tea_bags_per_box: filters.min_tea_bags_per_box,
      min_price: filters.min_price,
      max_price: filters.max_price,
      min_rating: filters.min_rating,
      size_value: filters.size_value,
      size_unit: filters.size_unit,
      flavor: filters.flavor,
      product_subtype: filters.product_subtype,
      function_tags: filters.function_tags || [],
    };

    return {
      products: productItems,
      total_results,
      page,
      page_size,
      applied_filters,
    };
  }

  // ---------- Product details ----------

  getProductDetails(productId) {
    const products = this._getFromStorage('products');
    const categories = this._getFromStorage('categories');
    const product = products.find((p) => p.id === productId) || null;

    const productCategories =
      product && Array.isArray(product.category_ids)
        ? categories.filter((c) => product.category_ids.includes(c.id))
        : [];

    const badges = this._getProductBadges(product);
    const ingredients = '';
       const nutrition_facts = '';
    const available_flavors = product && product.flavor ? [product.flavor] : [];

    const subscription_options = {
      subscription_available: !!(product && product.subscription_available),
      default_frequency: product ? product.subscription_default_frequency || null : null,
      discount_percent: product && typeof product.subscription_discount_percent === 'number' ? product.subscription_discount_percent : 0,
      available_frequencies: [
        'every_1_month',
        'every_2_months',
        'every_3_months',
        'every_30_days',
      ],
    };

    const rating_display = this._formatRatingDisplay(product);

    let related_products = [];
    if (product && product.product_subtype) {
      related_products = products
        .filter(
          (p) => p.id !== product.id && p.product_subtype === product.product_subtype
        )
        .slice(0, 4);
    }

    return {
      product,
      categories: productCategories,
      badges,
      ingredients,
      nutrition_facts,
      available_flavors,
      subscription_options,
      rating_display,
      related_products,
    };
  }

  // ---------- Cart & checkout: cart interfaces ----------

  addToCart(productId, quantity, purchase_type, subscription_frequency) {
    quantity = quantity == null ? 1 : quantity;
    if (quantity <= 0) quantity = 1;
    purchase_type = purchase_type || 'one_time';

    const products = this._getFromStorage('products');
    const product = products.find((p) => p.id === productId);
    if (!product) {
      return {
        success: false,
        cart: null,
        cart_items: [],
        message: 'Product not found',
      };
    }

    const cart = this._getOrCreateCart();
    let allCartItems = this._getFromStorage('cart_items');

    let existing = allCartItems.find(
      (ci) =>
        ci.cart_id === cart.id &&
        ci.product_id === productId &&
        ci.purchase_type === purchase_type &&
        (purchase_type !== 'subscription' || ci.subscription_frequency === subscription_frequency)
    );

    if (existing) {
      existing.quantity += quantity;
      existing.updated_at = this._now();
    } else {
      const discountPercent =
        purchase_type === 'subscription'
          ? product.subscription_discount_percent || 0
          : 0;
      const unit_price = product.price || 0;
      const lineFull = unit_price * quantity;
      const lineDiscount = lineFull * (discountPercent / 100);
      const lineSubtotal = lineFull - lineDiscount;

      const cartItem = {
        id: this._generateId('cart_item'),
        cart_id: cart.id,
        product_id: productId,
        quantity: quantity,
        purchase_type: purchase_type,
        subscription_frequency:
          purchase_type === 'subscription'
            ? subscription_frequency || product.subscription_default_frequency || 'every_1_month'
            : null,
        unit_price: unit_price,
        subscription_discount_percent: discountPercent,
        line_subtotal: lineSubtotal,
      };
      allCartItems.push(cartItem);
      cart.cart_item_ids = cart.cart_item_ids || [];
      cart.cart_item_ids.push(cartItem.id);
    }

    cart.updated_at = this._now();
    this._saveCart(cart, allCartItems);

    const cart_items_for_cart = allCartItems.filter((ci) => ci.cart_id === cart.id);

    return {
      success: true,
      cart,
      cart_items: cart_items_for_cart,
      message: 'Added to cart',
    };
  }

  getCartSummary() {
    const cart = this._getOrCreateCart();
    let allCartItems = this._getFromStorage('cart_items');
    this._recalculateCartTotals(cart, allCartItems);
    allCartItems = this._getFromStorage('cart_items');

    const products = this._getFromStorage('products');
    const itemsForCart = allCartItems.filter((ci) => ci.cart_id === cart.id);

    let items_subtotal = 0;
    let discount_total = 0;

    const items = itemsForCart.map((ci) => {
      const product = products.find((p) => p.id === ci.product_id) || null;
      const unit_price = typeof ci.unit_price === 'number' ? ci.unit_price : product && product.price ? product.price : 0;
      const lineFull = unit_price * (ci.quantity || 0);
      const lineSubtotal = ci.line_subtotal != null ? ci.line_subtotal : lineFull;
      items_subtotal += lineFull;
      discount_total += lineFull - lineSubtotal;

      return {
        cart_item: ci,
        product,
        product_name: product ? product.name : '',
        thumbnail_url: product ? product.image_url || '' : '',
        badges: this._getProductBadges(product),
        purchase_type_label:
          ci.purchase_type === 'subscription' ? 'Subscription' : 'One-time purchase',
        subscription_frequency_label: this._formatSubscriptionFrequency(
          ci.subscription_frequency
        ),
        line_subtotal_formatted: this._formatCurrency(lineSubtotal),
      };
    });

    const estimated_tax = 0;
    const estimated_total = items_subtotal - discount_total + estimated_tax;

    return {
      cart,
      items,
      items_subtotal,
      items_subtotal_formatted: this._formatCurrency(items_subtotal),
      discount_total,
      discount_total_formatted: this._formatCurrency(discount_total),
      estimated_tax,
      estimated_tax_formatted: this._formatCurrency(estimated_tax),
      estimated_total,
      estimated_total_formatted: this._formatCurrency(estimated_total),
    };
  }

  updateCartItemQuantity(cartItemId, quantity) {
    let allCartItems = this._getFromStorage('cart_items');
    const idxItem = allCartItems.findIndex((ci) => ci.id === cartItemId);
    if (idxItem === -1) {
      return {
        success: false,
        cart: null,
        items: [],
        message: 'Cart item not found',
      };
    }

    const cartItem = allCartItems[idxItem];
    const cart = this._getFromStorage('carts').find((c) => c.id === cartItem.cart_id) || this._getOrCreateCart();

    if (quantity <= 0) {
      allCartItems.splice(idxItem, 1);
    } else {
      cartItem.quantity = quantity;
      cartItem.updated_at = this._now();
    }

    cart.cart_item_ids = allCartItems
      .filter((ci) => ci.cart_id === cart.id)
      .map((ci) => ci.id);
    cart.updated_at = this._now();

    this._saveCart(cart, allCartItems);

    const products = this._getFromStorage('products');
    const itemsForCart = allCartItems.filter((ci) => ci.cart_id === cart.id);
    const itemsWithProduct = itemsForCart.map((ci) => ({
      ...ci,
      product: products.find((p) => p.id === ci.product_id) || null,
    }));

    return {
      success: true,
      cart,
      items: itemsWithProduct,
      message: 'Cart updated',
    };
  }

  removeCartItem(cartItemId) {
    let allCartItems = this._getFromStorage('cart_items');
    const idxItem = allCartItems.findIndex((ci) => ci.id === cartItemId);
    if (idxItem === -1) {
      return {
        success: false,
        cart: null,
        items: [],
        message: 'Cart item not found',
      };
    }

    const cartItem = allCartItems[idxItem];
    const cart = this._getFromStorage('carts').find((c) => c.id === cartItem.cart_id) || this._getOrCreateCart();

    allCartItems.splice(idxItem, 1);
    cart.cart_item_ids = allCartItems
      .filter((ci) => ci.cart_id === cart.id)
      .map((ci) => ci.id);
    cart.updated_at = this._now();

    this._saveCart(cart, allCartItems);

    const products = this._getFromStorage('products');
    const itemsForCart = allCartItems.filter((ci) => ci.cart_id === cart.id);
    const itemsWithProduct = itemsForCart.map((ci) => ({
      ...ci,
      product: products.find((p) => p.id === ci.product_id) || null,
    }));

    return {
      success: true,
      cart,
      items: itemsWithProduct,
      message: 'Cart item removed',
    };
  }

  clearCart() {
    const cart = this._getOrCreateCart();
    let allCartItems = this._getFromStorage('cart_items');
    allCartItems = allCartItems.filter((ci) => ci.cart_id !== cart.id);
    cart.cart_item_ids = [];
    cart.updated_at = this._now();
    this._saveCart(cart, allCartItems);
    return {
      success: true,
      message: 'Cart cleared',
    };
  }

  // ---------- Shipping methods ----------

  getShippingMethods() {
    const cart = this._getOrCreateCart();
    return this._getAvailableShippingMethodsForCart(cart);
  }

  // ---------- Checkout / orders ----------

  createDraftOrderFromCart(
    shipping_address,
    billing_same_as_shipping,
    billing_address,
    shipping_method_id,
    payment_method
  ) {
    const cart = this._getOrCreateCart();
    let allCartItems = this._getFromStorage('cart_items');
    this._recalculateCartTotals(cart, allCartItems);
    const cartItems = allCartItems.filter((ci) => ci.cart_id === cart.id);

    const shippingMethods = this._getFromStorage('shipping_methods');
    const shipping_method = shippingMethods.find((sm) => sm.id === shipping_method_id) || null;
    if (!shipping_method) {
      throw new Error('Shipping method not found');
    }

    const generated = this._generateOrderFromCart(
      cart,
      cartItems,
      shipping_address,
      billing_same_as_shipping !== false,
      billing_address,
      shipping_method,
      payment_method
    );

    let { order } = generated;
    let store_credit_before = null;
    let store_credit_after = null;

    if (payment_method === 'store_credit') {
      const scResult = this._applyStoreCreditToOrder(order);
      store_credit_before = scResult.store_credit_balance_before;
      store_credit_after = scResult.store_credit_balance_after;
    }

    // Persist addresses
    let addresses = this._getFromStorage('addresses');
    addresses.push(generated.shipping_address);
    if (generated.billing_address && generated.billing_address.id !== generated.shipping_address.id) {
      addresses.push(generated.billing_address);
    }
    this._saveToStorage('addresses', addresses);

    // Persist order
    let orders = this._getFromStorage('orders');
    const existingIdx = orders.findIndex((o) => o.id === order.id);
    if (existingIdx !== -1) {
      orders[existingIdx] = order;
    } else {
      orders.push(order);
    }
    this._saveToStorage('orders', orders);

    // Persist order items
    let orderItemsStorage = this._getFromStorage('order_items');
    orderItemsStorage = orderItemsStorage.concat(generated.order_items);
    this._saveToStorage('order_items', orderItemsStorage);

    // Track current draft order id for review
    localStorage.setItem('currentDraftOrderId', order.id);

    return {
      order,
      order_items: generated.order_items,
      shipping_address: generated.shipping_address,
      billing_address: generated.billing_address,
      shipping_method,
      items_subtotal_formatted: this._formatCurrency(order.items_subtotal),
      discount_total_formatted: this._formatCurrency(order.discount_total || 0),
      shipping_cost_formatted: this._formatCurrency(order.shipping_cost || 0),
      tax_total_formatted: this._formatCurrency(order.tax_total || 0),
      grand_total_formatted: this._formatCurrency(order.grand_total),
      store_credit_balance_before: store_credit_before,
      store_credit_balance_after: store_credit_after,
    };
  }

  getDraftOrderReview() {
    const orderId = localStorage.getItem('currentDraftOrderId');
    if (!orderId) {
      return {
        order: null,
        order_items: [],
        shipping_address: null,
        billing_address: null,
        shipping_method: null,
        items_subtotal_formatted: this._formatCurrency(0),
        discount_total_formatted: this._formatCurrency(0),
        shipping_cost_formatted: this._formatCurrency(0),
        tax_total_formatted: this._formatCurrency(0),
        grand_total_formatted: this._formatCurrency(0),
        payment_method_label: '',
      };
    }

    const orders = this._getFromStorage('orders');
    const order = orders.find((o) => o.id === orderId) || null;
    if (!order) {
      return {
        order: null,
        order_items: [],
        shipping_address: null,
        billing_address: null,
        shipping_method: null,
        items_subtotal_formatted: this._formatCurrency(0),
        discount_total_formatted: this._formatCurrency(0),
        shipping_cost_formatted: this._formatCurrency(0),
        tax_total_formatted: this._formatCurrency(0),
        grand_total_formatted: this._formatCurrency(0),
        payment_method_label: '',
      };
    }

    const orderItemsStorage = this._getFromStorage('order_items');
    const order_items = orderItemsStorage.filter((oi) => oi.order_id === order.id);

    const addresses = this._getFromStorage('addresses');
    const shipping_address = addresses.find((a) => a.id === order.shipping_address_id) || null;
    const billing_address = addresses.find((a) => a.id === order.billing_address_id) || null;

    const shippingMethods = this._getFromStorage('shipping_methods');
    const shipping_method = shippingMethods.find((sm) => sm.id === order.shipping_method_id) || null;

    let payment_method_label = '';
    switch (order.payment_method) {
      case 'store_credit':
        payment_method_label = 'Store Credit';
        break;
      case 'credit_card':
        payment_method_label = 'Credit Card';
        break;
      case 'paypal':
        payment_method_label = 'PayPal';
        break;
      case 'other':
        payment_method_label = 'Other';
        break;
      default:
        payment_method_label = '';
        break;
    }

    // Instrumentation for task completion tracking (task_7)
    try {
      if (
        order &&
        order.payment_method === 'store_credit' &&
        shipping_method &&
        typeof shipping_method.cost === 'number' &&
        shipping_method.cost === 0
      ) {
        localStorage.setItem(
          'task7_orderReviewAccessed',
          JSON.stringify({
            order_id: order.id,
            accessed_at: this._now(),
          })
        );
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      order,
      order_items,
      shipping_address,
      billing_address,
      shipping_method,
      items_subtotal_formatted: this._formatCurrency(order.items_subtotal || 0),
      discount_total_formatted: this._formatCurrency(order.discount_total || 0),
      shipping_cost_formatted: this._formatCurrency(order.shipping_cost || 0),
      tax_total_formatted: this._formatCurrency(order.tax_total || 0),
      grand_total_formatted: this._formatCurrency(order.grand_total || 0),
      payment_method_label,
    };
  }

  // ---------- Store locator & profile ----------

  searchStoresByZip(zip_code, radius_miles) {
    radius_miles = typeof radius_miles === 'number' ? radius_miles : 25;
    const stores = this._searchStoresByLocation(zip_code, radius_miles);

    // Instrumentation for task completion tracking (task_6)
    try {
      localStorage.setItem(
        'task6_storeSearchParams',
        JSON.stringify({
          zip_code,
          radius_miles,
          result_store_ids: stores.map((s) => s.id),
          nearest_store_id: stores.length ? stores[0].id : null,
        })
      );
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return stores;
  }

  getStoreDetails(storeId) {
    const stores = this._getFromStorage('stores');
    return stores.find((s) => s.id === storeId) || null;
  }

  setPreferredStore(storeId) {
    const stores = this._getFromStorage('stores');
    const store = stores.find((s) => s.id === storeId) || null;
    const profile = this._getOrCreateProfile();

    if (!store) {
      return {
        profile,
        preferred_store: null,
      };
    }

    profile.preferred_store_id = storeId;
    profile.updated_at = this._now();

    let profiles = this._getFromStorage('profiles');
    const idx = profiles.findIndex((p) => p.id === profile.id);
    if (idx !== -1) {
      profiles[idx] = profile;
    } else {
      profiles.push(profile);
    }
    this._saveToStorage('profiles', profiles);

    this._updatePreferredStoreFlags(storeId);
    const updatedStores = this._getFromStorage('stores');
    const preferred_store = updatedStores.find((s) => s.id === storeId) || store;

    return {
      profile,
      preferred_store,
    };
  }

  getProfile() {
    const profile = this._getOrCreateProfile();
    const stores = this._getFromStorage('stores');
    const preferred_store = profile.preferred_store_id
      ? stores.find((s) => s.id === profile.preferred_store_id) || null
      : null;

    const addresses = this._getFromStorage('addresses');
    const default_shipping_address =
      addresses.find(
        (a) => a.profile_id === profile.id && a.address_type === 'shipping' && a.is_default
      ) ||
      addresses.find((a) => a.profile_id === profile.id && a.address_type === 'shipping') ||
      null;

    const default_billing_address =
      addresses.find(
        (a) => a.profile_id === profile.id && a.address_type === 'billing' && a.is_default
      ) ||
      addresses.find((a) => a.profile_id === profile.id && a.address_type === 'billing') ||
      null;

    return {
      profile,
      preferred_store,
      default_shipping_address,
      default_billing_address,
    };
  }

  updateProfile(full_name, email, password, default_phone, communication_opt_in) {
    const profile = this._getOrCreateProfile();

    if (typeof full_name !== 'undefined') profile.full_name = full_name;
    if (typeof email !== 'undefined') profile.email = email;
    if (typeof password !== 'undefined') profile.password = password;
    if (typeof default_phone !== 'undefined') profile.default_phone = default_phone;
    if (typeof communication_opt_in !== 'undefined') {
      profile.communication_opt_in = !!communication_opt_in;
    }
    profile.updated_at = this._now();

    let profiles = this._getFromStorage('profiles');
    const idx = profiles.findIndex((p) => p.id === profile.id);
    if (idx !== -1) {
      profiles[idx] = profile;
    } else {
      profiles.push(profile);
    }
    this._saveToStorage('profiles', profiles);

    return profile;
  }

  getStoreCreditBalance() {
    const profile = this._getOrCreateProfile();
    const balance =
      typeof profile.store_credit_balance === 'number' ? profile.store_credit_balance : 0;
    return {
      store_credit_balance: balance,
      store_credit_balance_formatted: this._formatCurrency(balance),
    };
  }

  // ---------- Blog & bookmarks ----------

  listBlogArticles(
    search_query,
    tag,
    is_gut_health_related,
    sort_by,
    published_within_days,
    page,
    page_size
  ) {
    let articles = this._getFromStorage('blog_articles');

    if (search_query) {
      const q = String(search_query).toLowerCase();
      articles = articles.filter((a) => {
        const titleMatch = a.title && a.title.toLowerCase().includes(q);
        const excerptMatch = a.excerpt && a.excerpt.toLowerCase().includes(q);
        const contentMatch = a.content && a.content.toLowerCase().includes(q);
        return titleMatch || excerptMatch || contentMatch;
      });
    }

    if (tag) {
      const tagLower = String(tag).toLowerCase();
      articles = articles.filter((a) => {
        if (!Array.isArray(a.tags)) return false;
        return a.tags.some((t) => t && t.toLowerCase() === tagLower);
      });
    }

    if (typeof is_gut_health_related === 'boolean') {
      articles = articles.filter(
        (a) => !!a.is_gut_health_related === is_gut_health_related
      );
    }

    if (typeof published_within_days === 'number') {
      const now = new Date();
      const cutoff = new Date(now.getTime() - published_within_days * 24 * 60 * 60 * 1000);
      articles = articles.filter((a) => {
        const d = new Date(a.publish_date);
        return d >= cutoff;
      });
    }

    if (sort_by === 'oldest') {
      articles.sort(
        (a, b) => new Date(a.publish_date).getTime() - new Date(b.publish_date).getTime()
      );
    } else {
      // default newest
      articles.sort(
        (a, b) => new Date(b.publish_date).getTime() - new Date(a.publish_date).getTime()
      );
    }

    page = page || 1;
    page_size = page_size || 10;

    const total_results = articles.length;
    const start = (page - 1) * page_size;
    const paged = articles.slice(start, start + page_size);

    return {
      articles: paged,
      total_results,
      page,
      page_size,
    };
  }

  getBlogArticleDetails(articleId) {
    const articles = this._getFromStorage('blog_articles');
    const article = articles.find((a) => a.id === articleId) || null;

    const bookmarks = this._getFromStorage('article_bookmarks');
    const is_bookmarked = bookmarks.some((b) => b.article_id === articleId);

    const recommended_products = this._getArticleRecommendations(articleId);

    return {
      article,
      is_bookmarked,
      recommended_products,
    };
  }

  bookmarkArticle(articleId) {
    let bookmarks = this._getFromStorage('article_bookmarks');
    let existing = bookmarks.find((b) => b.article_id === articleId);
    if (existing) {
      return existing;
    }
    const bookmark = {
      id: this._generateId('bookmark'),
      article_id: articleId,
      bookmarked_at: this._now(),
    };
    bookmarks.push(bookmark);
    this._saveToStorage('article_bookmarks', bookmarks);
    return bookmark;
  }

  getBookmarkedArticles() {
    const bookmarks = this._getFromStorage('article_bookmarks');
    const articles = this._getFromStorage('blog_articles');

    const bookmarkByArticleId = {};
    bookmarks.forEach((b) => {
      bookmarkByArticleId[b.article_id] = b;
    });

    const result = articles.filter((a) => bookmarkByArticleId[a.id]);
    result.sort(
      (a, b) =>
        new Date(bookmarkByArticleId[b.id].bookmarked_at).getTime() -
        new Date(bookmarkByArticleId[a.id].bookmarked_at).getTime()
    );

    return result;
  }

  removeArticleBookmark(articleId) {
    let bookmarks = this._getFromStorage('article_bookmarks');
    const before = bookmarks.length;
    bookmarks = bookmarks.filter((b) => b.article_id !== articleId);
    this._saveToStorage('article_bookmarks', bookmarks);
    const after = bookmarks.length;
    return {
      success: after < before,
    };
  }

  // ---------- Static / content pages ----------

  getAboutPageContent() {
    const raw = localStorage.getItem('about_page_content');
    if (raw) {
      try {
        const obj = JSON.parse(raw);
        return {
          title: obj.title || '',
          body: obj.body || '',
          sections: Array.isArray(obj.sections) ? obj.sections : [],
        };
      } catch (e) {}
    }
    return {
      title: '',
      body: '',
      sections: [],
    };
  }

  getContactPageInfo() {
    const raw = localStorage.getItem('contact_page_info');
    if (raw) {
      try {
        const obj = JSON.parse(raw);
        return {
          support_email: obj.support_email || '',
          support_phone: obj.support_phone || '',
          customer_service_hours: obj.customer_service_hours || '',
          topics: Array.isArray(obj.topics) ? obj.topics : [],
        };
      } catch (e) {}
    }
    return {
      support_email: '',
      support_phone: '',
      customer_service_hours: '',
      topics: [],
    };
  }

  submitContactForm(name, email, topic, message) {
    const submissions = this._getFromStorage('contact_form_submissions');
    const id = this._generateId('contact');
    const submission = {
      id,
      name,
      email,
      topic: topic || 'other',
      message,
      created_at: this._now(),
    };
    submissions.push(submission);
    this._saveToStorage('contact_form_submissions', submissions);
    return {
      success: true,
      reference_id: id,
      message: 'Your message has been received.',
    };
  }

  getHelpFaqContent() {
    const raw = localStorage.getItem('help_faq_content');
    if (raw) {
      try {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) return arr;
      } catch (e) {}
    }
    return [];
  }

  getPrivacyPolicyContent() {
    const raw = localStorage.getItem('privacy_policy_content');
    if (raw) {
      try {
        const obj = JSON.parse(raw);
        return {
          title: obj.title || '',
          body: obj.body || '',
        };
      } catch (e) {}
    }
    return {
      title: '',
      body: '',
    };
  }

  getTermsAndConditionsContent() {
    const raw = localStorage.getItem('terms_conditions_content');
    if (raw) {
      try {
        const obj = JSON.parse(raw);
        return {
          title: obj.title || '',
          body: obj.body || '',
        };
      } catch (e) {}
    }
    return {
      title: '',
      body: '',
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