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
    // Generic / legacy
    if (!localStorage.getItem('users')) {
      localStorage.setItem('users', JSON.stringify([]));
    }

    // Core entities based on storage_key
    const keys = [
      'products',
      'carts',
      'cart_items',
      'quote_lists',
      'quote_list_items',
      'comparison_lists',
      'comparison_items',
      'inspection_bookings',
      'installation_quote_requests',
      'maintenance_plans',
      'maintenance_plan_signups',
      'training_sessions',
      'training_enrollments',
      'blog_articles',
      'contact_messages'
    ];

    keys.forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
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

  _nowISO() {
    return new Date().toISOString();
  }

  _parseDateToISO(dateStr) {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;
    return d.toISOString();
  }

  // ---------- Label helpers ----------

  _getCategoryLabel(key) {
    const map = {
      fire_extinguishers: 'Fire Extinguishers',
      fire_alarm_control_panels: 'Fire Alarm Control Panels',
      accessories: 'Accessories',
      other_equipment: 'Other Equipment'
    };
    return map[key] || key;
  }

  _getTypeLabel(value) {
    const map = {
      abc_multi_purpose: 'ABC Multi-Purpose',
      class_k: 'Class K',
      water: 'Water',
      co2: 'CO2',
      class_d: 'Class D',
      fire_alarm_panel: 'Fire Alarm Panel',
      smoke_detector: 'Smoke Detector',
      sign: 'Sign',
      bracket: 'Bracket',
      cover: 'Cover',
      fire_blanket: 'Fire Blanket',
      other: 'Other'
    };
    return map[value] || value;
  }

  _getSizeWeightLabel(value) {
    const map = {
      '2_5_lb': '2.5 lb',
      '5_lb': '5 lb',
      '10_lb': '10 lb',
      '20_lb': '20 lb',
      other: 'Other'
    };
    return map[value] || value;
  }

  // ---------- Cart helpers ----------

  _getOrCreateCart() {
    let carts = this._getFromStorage('carts');
    let cart = carts[0] || null;
    if (!cart) {
      const now = this._nowISO();
      cart = {
        id: this._generateId('cart'),
        created_at: now,
        updated_at: now
      };
      carts.push(cart);
      this._saveToStorage('carts', carts);
    }
    return cart;
  }

  _saveCart(cart) {
    let carts = this._getFromStorage('carts');
    const idx = carts.findIndex((c) => c.id === cart.id);
    if (idx >= 0) {
      carts[idx] = cart;
    } else {
      carts.push(cart);
    }
    this._saveToStorage('carts', carts);
  }

  _buildCartTotals(cartId) {
    const cartItems = this._getFromStorage('cart_items').filter((ci) => ci.cart_id === cartId);
    const products = this._getFromStorage('products');

    let subtotal = 0;
    let currency = 'USD';

    cartItems.forEach((item) => {
      subtotal += Number(item.line_subtotal || 0);
      if (!currency) {
        const product = products.find((p) => p.id === item.product_id);
        if (product && product.currency) {
          currency = product.currency;
        }
      }
    });

    const estimated_tax = 0;
    const shipping = 0;
    const total = subtotal + estimated_tax + shipping;

    return {
      subtotal,
      estimated_tax,
      shipping,
      total,
      currency
    };
  }

  _buildCartResponse(cart) {
    const cartItems = this._getFromStorage('cart_items').filter((ci) => ci.cart_id === cart.id);
    const products = this._getFromStorage('products');
    const items = cartItems.map((item) => {
      const product = products.find((p) => p.id === item.product_id) || null;
      return {
        cart_item_id: item.id,
        product_id: item.product_id,
        product_name: product ? product.name : '',
        product_image_url: product ? product.image_url || null : null,
        unit_price: item.unit_price,
        quantity: item.quantity,
        line_subtotal: item.line_subtotal,
        can_edit_quantity: true,
        product // foreign key resolution
      };
    });

    const totals = this._buildCartTotals(cart.id);

    return {
      cart_id: cart.id,
      created_at: cart.created_at,
      updated_at: cart.updated_at,
      items,
      totals
    };
  }

  // ---------- Quote list helpers ----------

  _getOrCreateQuoteList() {
    let quoteLists = this._getFromStorage('quote_lists');
    let quoteList = quoteLists[0] || null;
    if (!quoteList) {
      const now = this._nowISO();
      quoteList = {
        id: this._generateId('ql'),
        title: '',
        created_at: now,
        updated_at: now
      };
      quoteLists.push(quoteList);
      this._saveToStorage('quote_lists', quoteLists);
    }
    return quoteList;
  }

  _saveQuoteList(list) {
    let quoteLists = this._getFromStorage('quote_lists');
    const idx = quoteLists.findIndex((l) => l.id === list.id);
    if (idx >= 0) {
      quoteLists[idx] = list;
    } else {
      quoteLists.push(list);
    }
    this._saveToStorage('quote_lists', quoteLists);
  }

  _buildQuoteListResponse(list) {
    const quoteListItems = this._getFromStorage('quote_list_items').filter(
      (i) => i.quote_list_id === list.id
    );
    const products = this._getFromStorage('products');

    const items = quoteListItems.map((item) => {
      const product = products.find((p) => p.id === item.product_id) || null;
      return {
        quote_list_item_id: item.id,
        product_id: item.product_id,
        product_name: product ? product.name : '',
        product_image_url: product ? product.image_url || null : null,
        unit_price: item.unit_price != null ? item.unit_price : product ? product.price : 0,
        quantity: item.quantity,
        added_at: item.added_at,
        product // foreign key resolution
      };
    });

    return {
      quote_list_id: list.id,
      title: list.title || '',
      created_at: list.created_at,
      updated_at: list.updated_at,
      items
    };
  }

  // ---------- Comparison list helpers ----------

  _getOrCreateComparisonList() {
    let comparisonLists = this._getFromStorage('comparison_lists');
    let list = comparisonLists[0] || null;
    if (!list) {
      const now = this._nowISO();
      list = {
        id: this._generateId('cl'),
        created_at: now,
        updated_at: now
      };
      comparisonLists.push(list);
      this._saveToStorage('comparison_lists', comparisonLists);
    }
    return list;
  }

  _saveComparisonList(list) {
    let comparisonLists = this._getFromStorage('comparison_lists');
    const idx = comparisonLists.findIndex((l) => l.id === list.id);
    if (idx >= 0) {
      comparisonLists[idx] = list;
    } else {
      comparisonLists.push(list);
    }
    this._saveToStorage('comparison_lists', comparisonLists);
  }

  _buildComparisonListResponse(list) {
    const comparisonItems = this._getFromStorage('comparison_items').filter(
      (i) => i.comparison_list_id === list.id
    );
    const products = this._getFromStorage('products');

    const items = comparisonItems.map((item) => {
      const product = products.find((p) => p.id === item.product_id) || null;
      return {
        comparison_item_id: item.id,
        product_id: item.product_id,
        product_name: product ? product.name : '',
        product_image_url: product ? product.image_url || null : null,
        brand: product ? product.brand || null : null,
        category: product ? product.category || null : null,
        product // foreign key resolution
      };
    });

    return {
      comparison_list_id: list.id,
      created_at: list.created_at,
      updated_at: list.updated_at,
      items
    };
  }

  _buildComparisonTable(list) {
    const comparisonItems = this._getFromStorage('comparison_items').filter(
      (i) => i.comparison_list_id === list.id
    );
    const products = this._getFromStorage('products');

    const items = comparisonItems
      .map((item) => {
        const product = products.find((p) => p.id === item.product_id);
        if (!product) return null;
        return {
          comparison_item_id: item.id,
          product_id: product.id,
          name: product.name,
          brand: product.brand || null,
          category: product.category || null,
          type: product.type || null,
          price: product.price,
          currency: product.currency || 'USD',
          zones_supported: product.zones_supported || null,
          warranty_months: product.warranty_months || null,
          average_rating: product.average_rating || null,
          image_url: product.image_url || null,
          product // foreign key resolution
        };
      })
      .filter(Boolean);

    return {
      comparison_list_id: list.id,
      products: items
    };
  }

  // =============================================
  // Interface implementations
  // =============================================

  // --------------------
  // getHomePageData
  // --------------------
  getHomePageData() {
    const products = this._getFromStorage('products');
    const trainingSessions = this._getFromStorage('training_sessions');
    const blogArticles = this._getFromStorage('blog_articles');

    const main_product_categories = [
      {
        key: 'fire_extinguishers',
        display_name: 'Fire Extinguishers',
        description: 'Portable extinguishers for homes, offices, kitchens, and industrial spaces.',
        primary_image_url: ''
      },
      {
        key: 'fire_alarm_control_panels',
        display_name: 'Fire Alarm Control Panels',
        description: 'Addressable and conventional control panels for commercial systems.',
        primary_image_url: ''
      },
      {
        key: 'accessories',
        display_name: 'Accessories',
        description: 'Signs, brackets, covers, blankets, and more.',
        primary_image_url: ''
      },
      {
        key: 'other_equipment',
        display_name: 'Other Equipment',
        description: 'Additional fire and life safety equipment.',
        primary_image_url: ''
      }
    ];

    const featured_products = products
      .filter((p) => p.in_stock !== false)
      .sort((a, b) => {
        const da = a.created_at ? new Date(a.created_at).getTime() : 0;
        const db = b.created_at ? new Date(b.created_at).getTime() : 0;
        return db - da;
      })
      .slice(0, 8)
      .map((p) => ({
        product_id: p.id,
        name: p.name,
        category: p.category,
        category_label: this._getCategoryLabel(p.category),
        type: p.type || null,
        price: p.price,
        currency: p.currency || 'USD',
        average_rating: p.average_rating || null,
        rating_count: p.rating_count || 0,
        free_shipping: !!p.free_shipping,
        shipping_label: p.shipping_label || null,
        image_url: p.image_url || null,
        can_add_to_cart: p.can_add_to_cart !== false
      }));

    const service_highlights = [
      {
        service_key: 'inspections',
        title: 'Fire Extinguisher Inspections',
        summary: 'Annual and semi-annual extinguisher inspections to keep you compliant.',
        primary_cta_label: 'Schedule Inspection',
        target_page: 'inspection_services'
      },
      {
        service_key: 'installations',
        title: 'System Installations',
        summary: 'Design and installation of alarm, detection, and suppression systems.',
        primary_cta_label: 'Request Installation Quote',
        target_page: 'installation_services'
      },
      {
        service_key: 'maintenance_plans',
        title: 'Maintenance Plans',
        summary: 'Ongoing service plans for extinguishers and life safety equipment.',
        primary_cta_label: 'View Maintenance Plans',
        target_page: 'maintenance_plans_listing'
      }
    ];

    const now = new Date();

    const training_highlights = trainingSessions
      .filter((s) => new Date(s.session_start) >= now)
      .sort((a, b) => new Date(a.session_start) - new Date(b.session_start))
      .slice(0, 4)
      .map((s) => ({
        training_session_id: s.id,
        title: s.title,
        session_start: s.session_start,
        city: s.city || '',
        state: s.state || '',
        price_per_attendee: s.price_per_attendee,
        duration_hours: s.duration_hours,
        duration_type: s.duration_type
      }));

    const recent_articles = blogArticles
      .filter((a) => a.status === 'published')
      .sort((a, b) => new Date(b.publication_date) - new Date(a.publication_date))
      .slice(0, 5)
      .map((a) => ({
        article_id: a.id,
        title: a.title,
        summary: a.summary || '',
        publication_date: a.publication_date
      }));

    return {
      main_product_categories,
      featured_products,
      service_highlights,
      training_highlights,
      recent_articles
    };
  }

  // --------------------
  // getProductCategoriesForNav
  // --------------------
  getProductCategoriesForNav() {
    return [
      {
        key: 'fire_extinguishers',
        display_name: 'Fire Extinguishers',
        description: 'Portable fire extinguishers for multiple hazards.'
      },
      {
        key: 'fire_alarm_control_panels',
        display_name: 'Fire Alarm Control Panels',
        description: 'Conventional and addressable alarm control panels.'
      },
      {
        key: 'accessories',
        display_name: 'Accessories',
        description: 'Signs, brackets, covers, and other accessories.'
      },
      {
        key: 'other_equipment',
        display_name: 'Other Equipment',
        description: 'Additional fire and life safety equipment.'
      }
    ];
  }

  // --------------------
  // getProductsFilterOptions
  // --------------------
  getProductsFilterOptions(category_key) {
    const products = this._getFromStorage('products').filter(
      (p) => p.category === category_key
    );

    const typeSet = new Set();
    const sizeSet = new Set();
    let minPrice = Infinity;
    let maxPrice = 0;
    let minZones = Infinity;
    let maxZones = 0;

    products.forEach((p) => {
      if (p.type) typeSet.add(p.type);
      if (p.size_weight) sizeSet.add(p.size_weight);
      if (typeof p.price === 'number') {
        if (p.price < minPrice) minPrice = p.price;
        if (p.price > maxPrice) maxPrice = p.price;
      }
      if (typeof p.zones_supported === 'number') {
        if (p.zones_supported < minZones) minZones = p.zones_supported;
        if (p.zones_supported > maxZones) maxZones = p.zones_supported;
      }
    });

    if (!isFinite(minPrice)) minPrice = 0;
    if (!isFinite(minZones)) minZones = 0;

    const type_options = Array.from(typeSet).map((t) => ({
      value: t,
      label: this._getTypeLabel(t)
    }));

    const size_weight_options = Array.from(sizeSet).map((s) => ({
      value: s,
      label: this._getSizeWeightLabel(s)
    }));

    const zones_supported_range = {
      min: minZones,
      max: maxZones
    };

    const price_range = {
      min: minPrice,
      max: maxPrice,
      currency: 'USD'
    };

    const rating_options = [
      { min_value: 4.5, label: '4.5 stars & up' },
      { min_value: 4.0, label: '4 stars & up' },
      { min_value: 3.0, label: '3 stars & up' }
    ];

    const shipping_options = [
      { value: 'free_shipping_only', label: 'Free Shipping Only' },
      { value: 'all_shipping_options', label: 'All Shipping Options' }
    ];

    const sort_options = [
      { value: 'price_asc', label: 'Price: Low to High' },
      { value: 'price_desc', label: 'Price: High to Low' },
      { value: 'rating_desc', label: 'Customer Rating' },
      { value: 'most_popular', label: 'Most Popular' }
    ];

    return {
      type_options,
      size_weight_options,
      zones_supported_range,
      price_range,
      rating_options,
      shipping_options,
      sort_options
    };
  }

  // --------------------
  // listProductsByCategory
  // --------------------
  listProductsByCategory(category_key, filters = undefined, sort = undefined, page = 1, page_size = 20) {
    const allProducts = this._getFromStorage('products');
    let products = allProducts.filter((p) => p.category === category_key);

    if (filters) {
      if (filters.type) {
        products = products.filter((p) => p.type === filters.type);
      }
      if (filters.size_weight) {
        products = products.filter((p) => p.size_weight === filters.size_weight);
      }
      if (typeof filters.min_price === 'number') {
        products = products.filter((p) => typeof p.price === 'number' && p.price >= filters.min_price);
      }
      if (typeof filters.max_price === 'number') {
        products = products.filter((p) => typeof p.price === 'number' && p.price <= filters.max_price);
      }
      if (typeof filters.min_rating === 'number') {
        products = products.filter(
          (p) => typeof p.average_rating === 'number' && p.average_rating >= filters.min_rating
        );
      }
      if (filters.free_shipping_only) {
        products = products.filter((p) => p.free_shipping === true);
      }
      if (typeof filters.zones_supported_min === 'number') {
        products = products.filter(
          (p) => typeof p.zones_supported === 'number' && p.zones_supported >= filters.zones_supported_min
        );
      }
      if (filters.in_stock_only) {
        products = products.filter((p) => p.in_stock !== false);
      }
    }

    if (sort === 'price_asc') {
      products.sort((a, b) => (a.price || 0) - (b.price || 0));
    } else if (sort === 'price_desc') {
      products.sort((a, b) => (b.price || 0) - (a.price || 0));
    } else if (sort === 'rating_desc') {
      products.sort((a, b) => (b.average_rating || 0) - (a.average_rating || 0));
    } else if (sort === 'most_popular') {
      products.sort((a, b) => (b.rating_count || 0) - (a.rating_count || 0));
    }

    const total_count = products.length;
    const start = (page - 1) * page_size;
    const end = start + page_size;

    const pageItems = products.slice(start, end).map((p) => ({
      product_id: p.id,
      name: p.name,
      sku: p.sku || '',
      category: p.category,
      category_label: this._getCategoryLabel(p.category),
      type: p.type || null,
      size_weight: p.size_weight || null,
      price: p.price,
      currency: p.currency || 'USD',
      average_rating: p.average_rating || null,
      rating_count: p.rating_count || 0,
      free_shipping: !!p.free_shipping,
      shipping_label: p.shipping_label || null,
      zones_supported: p.zones_supported || null,
      warranty_months: p.warranty_months || null,
      brand: p.brand || null,
      image_url: p.image_url || null,
      in_stock: p.in_stock !== false,
      can_add_to_cart: p.can_add_to_cart !== false,
      can_add_to_quote: p.can_add_to_quote !== false,
      can_add_to_compare: p.can_add_to_compare !== false
    }));

    return {
      products: pageItems,
      total_count,
      page,
      page_size
    };
  }

  // --------------------
  // getProductDetails
  // --------------------
  getProductDetails(productId) {
    const products = this._getFromStorage('products');
    const p = products.find((prod) => prod.id === productId);
    if (!p) return null;

    return {
      product_id: p.id,
      name: p.name,
      sku: p.sku || '',
      category: p.category,
      category_label: this._getCategoryLabel(p.category),
      type: p.type || null,
      size_weight: p.size_weight || null,
      weight_lbs: p.weight_lbs || null,
      description: p.description || '',
      price: p.price,
      currency: p.currency || 'USD',
      average_rating: p.average_rating || null,
      rating_count: p.rating_count || 0,
      free_shipping: !!p.free_shipping,
      shipping_label: p.shipping_label || null,
      shipping_cost: p.shipping_cost || 0,
      zones_supported: p.zones_supported || null,
      warranty_months: p.warranty_months || null,
      brand: p.brand || null,
      image_url: p.image_url || null,
      in_stock: p.in_stock !== false,
      can_add_to_cart: p.can_add_to_cart !== false,
      can_add_to_quote: p.can_add_to_quote !== false,
      can_add_to_compare: p.can_add_to_compare !== false,
      created_at: p.created_at || null,
      updated_at: p.updated_at || null
    };
  }

  // --------------------
  // addToCart
  // --------------------
  addToCart(productId, quantity) {
    if (typeof quantity !== 'number' || quantity <= 0) {
      quantity = 1;
    }

    const products = this._getFromStorage('products');
    const product = products.find((p) => p.id === productId);
    if (!product) {
      return { success: false, message: 'Product not found', cart: null };
    }
    if (product.can_add_to_cart === false) {
      return { success: false, message: 'Product cannot be added to cart', cart: null };
    }

    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items');

    let item = cartItems.find((ci) => ci.cart_id === cart.id && ci.product_id === productId);
    const now = this._nowISO();

    if (item) {
      item.quantity += quantity;
      item.unit_price = product.price;
      item.line_subtotal = item.unit_price * item.quantity;
    } else {
      item = {
        id: this._generateId('ci'),
        cart_id: cart.id,
        product_id: productId,
        quantity,
        unit_price: product.price,
        line_subtotal: product.price * quantity,
        added_at: now
      };
      cartItems.push(item);
    }

    cart.updated_at = now;

    this._saveToStorage('cart_items', cartItems);
    this._saveCart(cart);

    const cartResponse = this._buildCartResponse(cart);

    return {
      success: true,
      message: 'Item added to cart',
      cart: cartResponse
    };
  }

  // --------------------
  // getCart
  // --------------------
  getCart() {
    const cart = this._getOrCreateCart();
    return this._buildCartResponse(cart);
  }

  // --------------------
  // updateCartItemQuantity
  // --------------------
  updateCartItemQuantity(cartItemId, quantity) {
    let cartItems = this._getFromStorage('cart_items');
    const itemIndex = cartItems.findIndex((ci) => ci.id === cartItemId);
    if (itemIndex === -1) {
      return { success: false, cart: null };
    }

    const item = cartItems[itemIndex];
    const cartId = item.cart_id;
    const products = this._getFromStorage('products');
    const product = products.find((p) => p.id === item.product_id) || null;

    if (quantity <= 0) {
      // Remove item if quantity is zero or less
      cartItems.splice(itemIndex, 1);
    } else {
      item.quantity = quantity;
      item.unit_price = product ? product.price : item.unit_price;
      item.line_subtotal = item.unit_price * item.quantity;
      cartItems[itemIndex] = item;
    }

    this._saveToStorage('cart_items', cartItems);

    let carts = this._getFromStorage('carts');
    const cart = carts.find((c) => c.id === cartId) || this._getOrCreateCart();
    cart.updated_at = this._nowISO();
    this._saveCart(cart);

    return {
      success: true,
      cart: this._buildCartResponse(cart)
    };
  }

  // --------------------
  // removeCartItem
  // --------------------
  removeCartItem(cartItemId) {
    let cartItems = this._getFromStorage('cart_items');
    const itemIndex = cartItems.findIndex((ci) => ci.id === cartItemId);
    if (itemIndex === -1) {
      return { success: false, cart: null };
    }

    const cartId = cartItems[itemIndex].cart_id;
    cartItems.splice(itemIndex, 1);
    this._saveToStorage('cart_items', cartItems);

    let carts = this._getFromStorage('carts');
    const cart = carts.find((c) => c.id === cartId) || this._getOrCreateCart();
    cart.updated_at = this._nowISO();
    this._saveCart(cart);

    return {
      success: true,
      cart: this._buildCartResponse(cart)
    };
  }

  // --------------------
  // getServicesOverview
  // --------------------
  getServicesOverview() {
    const service_categories = [
      {
        service_key: 'inspections',
        title: 'Inspection Services',
        summary: 'On-site fire extinguisher and system inspections for all facility types.',
        primary_cta_label: 'Schedule Inspection',
        target_page: 'inspection_services'
      },
      {
        service_key: 'installations',
        title: 'Installation Services',
        summary: 'Design and installation of smoke detectors, alarms, and suppression systems.',
        primary_cta_label: 'Request Installation Quote',
        target_page: 'installation_services'
      },
      {
        service_key: 'maintenance_plans',
        title: 'Maintenance Plans',
        summary: 'Subscription-style maintenance plans covering your extinguishers and systems.',
        primary_cta_label: 'View Maintenance Plans',
        target_page: 'maintenance_plans_listing'
      }
    ];

    const compliance_highlights = [
      {
        title: 'NFPA & Local Code Compliance',
        description: 'Services are aligned with NFPA standards and local fire code requirements.'
      },
      {
        title: 'Certified Technicians',
        description: 'All field technicians are certified and experienced in fire protection services.'
      }
    ];

    return { service_categories, compliance_highlights };
  }

  // --------------------
  // getInspectionServicesInfo
  // --------------------
  getInspectionServicesInfo() {
    const packages = [
      {
        package_key: 'standard_annual_inspection',
        name: 'Standard Annual Inspection',
        description: 'Annual inspection of portable fire extinguishers and basic documentation.',
        includes: 'Visual inspection, pressure check, tamper seals, tagging, and inspection report.',
        typical_duration_hours: 2,
        location_types_supported: ['office', 'warehouse', 'restaurant', 'retail', 'industrial']
      },
      {
        package_key: 'semi_annual_inspection',
        name: 'Semi-Annual Inspection',
        description: 'Twice-yearly inspection for higher-risk environments.',
        includes: 'All checks from Standard Annual plus mid-year follow-up.',
        typical_duration_hours: 3,
        location_types_supported: ['restaurant', 'industrial', 'warehouse']
      },
      {
        package_key: 'full_system_inspection',
        name: 'Full System Inspection',
        description: 'Comprehensive inspection of extinguishers, alarms, and detection devices.',
        includes: 'Extinguishers, alarms, detectors, panels, and full system test.',
        typical_duration_hours: 4,
        location_types_supported: ['office', 'warehouse', 'industrial', 'retail']
      }
    ];

    const location_type_options = [
      { value: 'office', label: 'Office' },
      { value: 'warehouse', label: 'Warehouse' },
      { value: 'restaurant', label: 'Restaurant' },
      { value: 'retail', label: 'Retail' },
      { value: 'industrial', label: 'Industrial' },
      { value: 'residential', label: 'Residential' },
      { value: 'other', label: 'Other' }
    ];

    const time_slot_examples = ['08:00-10:00', '10:00-12:00', '12:00-14:00', '14:00-16:00'];

    return { packages, location_type_options, time_slot_examples };
  }

  // --------------------
  // getInspectionBookingOptions
  // --------------------
  getInspectionBookingOptions() {
    const location_type_options = [
      { value: 'office', label: 'Office' },
      { value: 'warehouse', label: 'Warehouse' },
      { value: 'restaurant', label: 'Restaurant' },
      { value: 'retail', label: 'Retail' },
      { value: 'industrial', label: 'Industrial' },
      { value: 'residential', label: 'Residential' },
      { value: 'other', label: 'Other' }
    ];

    const service_package_options = [
      { value: 'standard_annual_inspection', label: 'Standard Annual Inspection' },
      { value: 'semi_annual_inspection', label: 'Semi-Annual Inspection' },
      { value: 'full_system_inspection', label: 'Full System Inspection' },
      { value: 'other', label: 'Other / Custom' }
    ];

    const time_slot_options = [
      { value: '08_00_10_00', label: '08:00 AM – 10:00 AM' },
      { value: '10_00_12_00', label: '10:00 AM – 12:00 PM' },
      { value: '12_00_14_00', label: '12:00 PM – 2:00 PM' },
      { value: '14_00_16_00', label: '2:00 PM – 4:00 PM' }
    ];

    const today = new Date();
    const earliest = new Date(today.getTime() + 24 * 60 * 60 * 1000); // +1 day
    const latest = new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000); // +90 days

    const earliest_available_date = earliest.toISOString().slice(0, 10);
    const latest_bookable_date = latest.toISOString().slice(0, 10);
    const timezone = 'UTC';

    return {
      location_type_options,
      service_package_options,
      time_slot_options,
      earliest_available_date,
      latest_bookable_date,
      timezone
    };
  }

  // --------------------
  // createInspectionBooking
  // --------------------
  createInspectionBooking(
    location_type,
    service_date,
    time_slot,
    service_package,
    company_name,
    address_line1,
    city,
    postal_code,
    address_line2 = undefined,
    state = undefined,
    contact_phone,
    contact_email
  ) {
    const bookings = this._getFromStorage('inspection_bookings');
    const id = this._generateId('ib');
    const created_at = this._nowISO();

    const record = {
      id,
      location_type,
      service_date: this._parseDateToISO(service_date) || service_date,
      time_slot,
      service_package,
      company_name,
      address_line1,
      address_line2: address_line2 || '',
      city,
      state: state || '',
      postal_code,
      contact_phone,
      contact_email,
      booking_status: 'pending',
      created_at
    };

    bookings.push(record);
    this._saveToStorage('inspection_bookings', bookings);

    return {
      success: true,
      booking: {
        booking_id: record.id,
        location_type: record.location_type,
        service_date: record.service_date,
        time_slot: record.time_slot,
        service_package: record.service_package,
        company_name: record.company_name,
        city: record.city,
        postal_code: record.postal_code,
        contact_phone: record.contact_phone,
        contact_email: record.contact_email,
        booking_status: record.booking_status,
        created_at: record.created_at
      },
      confirmation_message: 'Inspection booking submitted and is pending confirmation.'
    };
  }

  // --------------------
  // getInstallationServicesInfo
  // --------------------
  getInstallationServicesInfo() {
    const service_types = [
      {
        service_type_key: 'smoke_detector_installation',
        name: 'Smoke Detector Installation',
        description: 'Design and installation of hardwired and networked smoke detectors.',
        building_types_suitable: ['office', 'warehouse', 'restaurant', 'industrial', 'residential']
      },
      {
        service_type_key: 'fire_alarm_system_installation',
        name: 'Fire Alarm System Installation',
        description: 'Complete fire alarm systems including panels, notification, and detection.',
        building_types_suitable: ['office', 'warehouse', 'industrial', 'retail']
      },
      {
        service_type_key: 'sprinkler_system_installation',
        name: 'Sprinkler System Installation',
        description: 'Wet and dry pipe sprinkler systems for commercial and industrial spaces.',
        building_types_suitable: ['warehouse', 'industrial', 'retail']
      }
    ];

    const primary_cta_label = 'Request Quote';

    return { service_types, primary_cta_label };
  }

  // --------------------
  // getInstallationQuoteOptions
  // --------------------
  getInstallationQuoteOptions() {
    const service_type_options = [
      { value: 'smoke_detector_installation', label: 'Smoke Detector Installation' },
      { value: 'fire_alarm_system_installation', label: 'Fire Alarm System Installation' },
      { value: 'sprinkler_system_installation', label: 'Sprinkler System Installation' },
      { value: 'other', label: 'Other / Custom Installation' }
    ];

    const budget_range_options = [
      { value: 'under_5000', label: 'Under $5,000' },
      { value: '5000_10000', label: '$5,000–$10,000' },
      { value: '10000_25000', label: '$10,000–$25,000' },
      { value: 'over_25000', label: 'Over $25,000' }
    ];

    const preferred_contact_method_options = [
      { value: 'phone', label: 'Phone' },
      { value: 'email', label: 'Email' }
    ];

    const today = new Date();
    const earliest = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000); // +7 days
    const latest = new Date(today.getTime() + 365 * 24 * 60 * 60 * 1000); // +1 year

    const earliest_target_date = earliest.toISOString().slice(0, 10);
    const latest_target_date = latest.toISOString().slice(0, 10);

    return {
      service_type_options,
      budget_range_options,
      preferred_contact_method_options,
      earliest_target_date,
      latest_target_date
    };
  }

  // --------------------
  // submitInstallationQuoteRequest
  // --------------------
  submitInstallationQuoteRequest(
    service_type,
    building_type,
    number_of_devices,
    target_installation_date,
    budget_range,
    company_name,
    address_line1,
    city,
    postal_code,
    address_line2 = undefined,
    state = undefined,
    contact_name,
    contact_phone,
    contact_email,
    preferred_contact_method,
    project_description = ''
  ) {
    const requests = this._getFromStorage('installation_quote_requests');
    const id = this._generateId('iqr');
    const created_at = this._nowISO();

    const record = {
      id,
      service_type,
      building_type,
      number_of_devices,
      target_installation_date: this._parseDateToISO(target_installation_date) || target_installation_date,
      budget_range,
      company_name,
      address_line1,
      address_line2: address_line2 || '',
      city,
      state: state || '',
      postal_code,
      contact_name,
      contact_phone,
      contact_email,
      preferred_contact_method,
      project_description: project_description || '',
      request_status: 'submitted',
      created_at
    };

    requests.push(record);
    this._saveToStorage('installation_quote_requests', requests);

    return {
      success: true,
      quote_request: {
        quote_request_id: record.id,
        service_type: record.service_type,
        building_type: record.building_type,
        number_of_devices: record.number_of_devices,
        target_installation_date: record.target_installation_date,
        budget_range: record.budget_range,
        company_name: record.company_name,
        city: record.city,
        postal_code: record.postal_code,
        contact_name: record.contact_name,
        contact_phone: record.contact_phone,
        contact_email: record.contact_email,
        preferred_contact_method: record.preferred_contact_method,
        request_status: record.request_status,
        created_at: record.created_at
      },
      confirmation_message: 'Installation quote request submitted successfully.'
    };
  }

  // --------------------
  // getMaintenancePlansFilterOptions
  // --------------------
  getMaintenancePlansFilterOptions() {
    const plans = this._getFromStorage('maintenance_plans');

    let minCoverage = Infinity;
    let maxCoverage = 0;
    let minPrice = Infinity;
    let maxPrice = 0;

    plans.forEach((p) => {
      if (typeof p.coverage_min_extinguishers === 'number') {
        if (p.coverage_min_extinguishers < minCoverage) minCoverage = p.coverage_min_extinguishers;
      }
      if (typeof p.coverage_max_extinguishers === 'number') {
        if (p.coverage_max_extinguishers > maxCoverage) maxCoverage = p.coverage_max_extinguishers;
      }
      if (typeof p.price_annual === 'number') {
        if (p.price_annual < minPrice) minPrice = p.price_annual;
        if (p.price_annual > maxPrice) maxPrice = p.price_annual;
      }
    });

    if (!isFinite(minCoverage)) minCoverage = 0;
    if (!isFinite(minPrice)) minPrice = 0;

    const coverage_options = [
      {
        min_extinguishers: minCoverage,
        max_extinguishers: maxCoverage || null,
        label: 'All available plans'
      }
    ];

    const price_range = {
      min_annual_price: minPrice,
      max_annual_price: maxPrice,
      currency: 'USD'
    };

    const billing_options = [
      { value: 'monthly', label: 'Monthly Billing' },
      { value: 'annual', label: 'Annual Billing' }
    ];

    const sort_options = [
      { value: 'price_asc', label: 'Price: Low to High' },
      { value: 'price_desc', label: 'Price: High to Low' }
    ];

    return { coverage_options, price_range, billing_options, sort_options };
  }

  // --------------------
  // listMaintenancePlans
  // --------------------
  listMaintenancePlans(filters = undefined, sort = undefined, page = 1, page_size = 20) {
    let plans = this._getFromStorage('maintenance_plans');

    if (filters) {
      if (typeof filters.coverage_min_extinguishers === 'number') {
        const requiredCount = filters.coverage_min_extinguishers;
        plans = plans.filter((p) => {
          const min =
            typeof p.coverage_min_extinguishers === 'number'
              ? p.coverage_min_extinguishers
              : 0;
          const max =
            typeof p.coverage_max_extinguishers === 'number'
              ? p.coverage_max_extinguishers
              : Infinity;
          return requiredCount >= min && requiredCount <= max;
        });
      }
      if (typeof filters.coverage_max_extinguishers === 'number') {
        plans = plans.filter((p) => {
          if (typeof p.coverage_max_extinguishers !== 'number') return true; // open upper bound
          return p.coverage_max_extinguishers <= filters.coverage_max_extinguishers;
        });
      }
      if (typeof filters.max_annual_price === 'number') {
        plans = plans.filter((p) => p.price_annual <= filters.max_annual_price);
      }
      if (filters.monthly_billing_only) {
        plans = plans.filter((p) => p.monthly_billing_available === true);
      }
      if (filters.status) {
        plans = plans.filter((p) => p.status === filters.status);
      }
    }

    if (sort === 'price_asc') {
      plans.sort((a, b) => (a.price_annual || 0) - (b.price_annual || 0));
    } else if (sort === 'price_desc') {
      plans.sort((a, b) => (b.price_annual || 0) - (a.price_annual || 0));
    }

    const total_count = plans.length;
    const start = (page - 1) * page_size;
    const end = start + page_size;

    const pageItems = plans.slice(start, end).map((p) => ({
      maintenance_plan_id: p.id,
      name: p.name,
      short_description: p.description || '',
      coverage_min_extinguishers: p.coverage_min_extinguishers,
      coverage_max_extinguishers: p.coverage_max_extinguishers || null,
      price_annual: p.price_annual,
      currency: 'USD',
      monthly_billing_available: !!p.monthly_billing_available,
      annual_billing_available: !!p.annual_billing_available,
      status: p.status
    }));

    return { plans: pageItems, total_count, page, page_size };
  }

  // --------------------
  // getMaintenancePlanDetails
  // --------------------
  getMaintenancePlanDetails(maintenancePlanId) {
    const plans = this._getFromStorage('maintenance_plans');
    const p = plans.find((plan) => plan.id === maintenancePlanId);
    if (!p) return null;

    return {
      maintenance_plan_id: p.id,
      name: p.name,
      description: p.description || '',
      coverage_min_extinguishers: p.coverage_min_extinguishers,
      coverage_max_extinguishers: p.coverage_max_extinguishers || null,
      price_annual: p.price_annual,
      currency: 'USD',
      monthly_billing_available: !!p.monthly_billing_available,
      annual_billing_available: !!p.annual_billing_available,
      service_intervals_description: p.service_intervals_description || '',
      included_services: Array.isArray(p.included_services) ? p.included_services : []
    };
  }

  // --------------------
  // startMaintenancePlanSignup
  // --------------------
  startMaintenancePlanSignup(
    maintenancePlanId,
    billing_frequency,
    company_name,
    address_line1,
    city,
    postal_code,
    address_line2 = undefined,
    state = undefined,
    extinguisher_count,
    contact_phone,
    contact_email
  ) {
    const plans = this._getFromStorage('maintenance_plans');
    const plan = plans.find((p) => p.id === maintenancePlanId);
    if (!plan) {
      return { success: false, signup: null, confirmation_message: 'Maintenance plan not found.' };
    }

    // Ensure coverage relationships are respected
    if (typeof plan.coverage_min_extinguishers === 'number' &&
        extinguisher_count < plan.coverage_min_extinguishers) {
      return {
        success: false,
        signup: null,
        confirmation_message: 'Extinguisher count is below the minimum coverage for this plan.'
      };
    }
    if (typeof plan.coverage_max_extinguishers === 'number' &&
        extinguisher_count > plan.coverage_max_extinguishers) {
      return {
        success: false,
        signup: null,
        confirmation_message: 'Extinguisher count exceeds the maximum coverage for this plan.'
      };
    }

    if (billing_frequency === 'monthly' && !plan.monthly_billing_available) {
      return {
        success: false,
        signup: null,
        confirmation_message: 'Monthly billing is not available for this plan.'
      };
    }
    if (billing_frequency === 'annual' && !plan.annual_billing_available) {
      return {
        success: false,
        signup: null,
        confirmation_message: 'Annual billing is not available for this plan.'
      };
    }

    const signups = this._getFromStorage('maintenance_plan_signups');
    const id = this._generateId('mps');
    const created_at = this._nowISO();

    const record = {
      id,
      maintenance_plan_id: maintenancePlanId,
      billing_frequency,
      company_name,
      address_line1,
      address_line2: address_line2 || '',
      city,
      state: state || '',
      postal_code,
      extinguisher_count,
      contact_phone,
      contact_email,
      signup_status: 'submitted',
      created_at
    };

    signups.push(record);
    this._saveToStorage('maintenance_plan_signups', signups);

    return {
      success: true,
      signup: {
        signup_id: record.id,
        maintenance_plan_id: record.maintenance_plan_id,
        maintenance_plan: plan, // foreign key resolution
        billing_frequency: record.billing_frequency,
        company_name: record.company_name,
        extinguisher_count: record.extinguisher_count,
        contact_phone: record.contact_phone,
        contact_email: record.contact_email,
        signup_status: record.signup_status,
        created_at: record.created_at
      },
      confirmation_message: 'Maintenance plan signup submitted.'
    };
  }

  // --------------------
  // getTrainingFilterOptions
  // --------------------
  getTrainingFilterOptions() {
    const mode_options = [
      { value: 'in_person', label: 'In-Person' },
      { value: 'online', label: 'Online' },
      { value: 'webinar', label: 'Webinar' }
    ];

    const radius_options_miles = [10, 25, 30, 50, 100];

    const date_range_options = [
      { value: 'next_30_days', label: 'Next 30 days' },
      { value: 'next_60_days', label: 'Next 60 days' },
      { value: 'all_future', label: 'All future sessions' }
    ];

    const duration_options = [
      { value: 'half_day', label: 'Half Day (approx. 4 hours)' },
      { value: 'full_day', label: 'Full Day' },
      { value: 'multi_day', label: 'Multi-Day' }
    ];

    const sort_options = [
      { value: 'price_asc', label: 'Price: Low to High' },
      { value: 'price_desc', label: 'Price: High to Low' },
      { value: 'date_asc', label: 'Soonest First' }
    ];

    return { mode_options, radius_options_miles, date_range_options, duration_options, sort_options };
  }

  // --------------------
  // searchTrainingSessions
  // --------------------
  searchTrainingSessions(
    mode = undefined,
    zip_code = undefined,
    radius_miles = undefined,
    date_range = undefined,
    duration_type = undefined,
    sort = undefined,
    page = 1,
    page_size = 20
  ) {
    let sessions = this._getFromStorage('training_sessions');
    const now = new Date();

    if (mode) {
      sessions = sessions.filter((s) => s.mode === mode);
    }

    if (zip_code) {
      // Without geocoding we approximate by matching the same ZIP code
      sessions = sessions.filter((s) => s.postal_code === zip_code);
    }

    if (date_range === 'next_30_days' || date_range === 'next_60_days' || date_range === 'all_future') {
      let endDate = null;
      if (date_range === 'next_30_days') {
        endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      } else if (date_range === 'next_60_days') {
        endDate = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);
      }

      sessions = sessions.filter((s) => {
        const start = new Date(s.session_start);
        if (isNaN(start.getTime())) return false;
        if (start < now) return false;
        if (endDate && start > endDate) return false;
        return true;
      });
    }

    if (duration_type) {
      sessions = sessions.filter((s) => s.duration_type === duration_type);
    }

    if (sort === 'price_asc') {
      sessions.sort((a, b) => (a.price_per_attendee || 0) - (b.price_per_attendee || 0));
    } else if (sort === 'price_desc') {
      sessions.sort((a, b) => (b.price_per_attendee || 0) - (a.price_per_attendee || 0));
    } else if (sort === 'date_asc') {
      sessions.sort((a, b) => new Date(a.session_start) - new Date(b.session_start));
    }

    const total_count = sessions.length;
    const startIdx = (page - 1) * page_size;
    const endIdx = startIdx + page_size;

    const pageItems = sessions.slice(startIdx, endIdx).map((s) => ({
      training_session_id: s.id,
      title: s.title,
      description_short: s.description || '',
      mode: s.mode,
      session_start: s.session_start,
      session_end: s.session_end,
      duration_hours: s.duration_hours,
      duration_type: s.duration_type,
      price_per_attendee: s.price_per_attendee,
      location_name: s.location_name || '',
      city: s.city || '',
      state: s.state || '',
      postal_code: s.postal_code || '',
      distance_miles: null,
      seats_available: s.seats_available
    }));

    return { sessions: pageItems, total_count, page, page_size };
  }

  // --------------------
  // getTrainingSessionDetails
  // --------------------
  getTrainingSessionDetails(trainingSessionId) {
    const sessions = this._getFromStorage('training_sessions');
    const s = sessions.find((session) => session.id === trainingSessionId);
    if (!s) return null;

    return {
      training_session_id: s.id,
      title: s.title,
      description: s.description || '',
      mode: s.mode,
      topic: s.topic || '',
      location_name: s.location_name || '',
      address_line1: s.address_line1 || '',
      city: s.city || '',
      state: s.state || '',
      postal_code: s.postal_code || '',
      session_start: s.session_start,
      session_end: s.session_end,
      duration_hours: s.duration_hours,
      duration_type: s.duration_type,
      price_per_attendee: s.price_per_attendee,
      max_attendees: s.max_attendees || null,
      seats_available: s.seats_available || null
    };
  }

  // --------------------
  // enrollInTrainingSession
  // --------------------
  enrollInTrainingSession(trainingSessionId, attendees_count, primary_contact_name, primary_contact_email) {
    const sessions = this._getFromStorage('training_sessions');
    const sessionIndex = sessions.findIndex((s) => s.id === trainingSessionId);
    if (sessionIndex === -1) {
      return { success: false, enrollment: null, confirmation_message: 'Training session not found.' };
    }

    const session = sessions[sessionIndex];

    if (typeof session.seats_available === 'number' && attendees_count > session.seats_available) {
      return {
        success: false,
        enrollment: null,
        confirmation_message: 'Not enough seats available for this training session.'
      };
    }

    // Update available seats hierarchically
    if (typeof session.seats_available === 'number') {
      session.seats_available = session.seats_available - attendees_count;
      sessions[sessionIndex] = session;
      this._saveToStorage('training_sessions', sessions);
    }

    const enrollments = this._getFromStorage('training_enrollments');
    const id = this._generateId('te');
    const created_at = this._nowISO();

    const record = {
      id,
      training_session_id: trainingSessionId,
      attendees_count,
      primary_contact_name,
      primary_contact_email,
      enrollment_status: 'pending',
      created_at
    };

    enrollments.push(record);
    this._saveToStorage('training_enrollments', enrollments);

    return {
      success: true,
      enrollment: {
        enrollment_id: record.id,
        training_session_id: record.training_session_id,
        training_session: session, // foreign key resolution
        attendees_count: record.attendees_count,
        primary_contact_name: record.primary_contact_name,
        primary_contact_email: record.primary_contact_email,
        enrollment_status: record.enrollment_status,
        created_at: record.created_at
      },
      confirmation_message: 'Training enrollment submitted.'
    };
  }

  // --------------------
  // addProductToQuoteList
  // --------------------
  addProductToQuoteList(productId, quantity = 1) {
    if (typeof quantity !== 'number' || quantity <= 0) {
      quantity = 1;
    }

    const products = this._getFromStorage('products');
    const product = products.find((p) => p.id === productId);
    if (!product) {
      return { success: false, quote_list: null };
    }

    const list = this._getOrCreateQuoteList();
    let items = this._getFromStorage('quote_list_items');

    let item = items.find((i) => i.quote_list_id === list.id && i.product_id === productId);
    const now = this._nowISO();

    if (item) {
      item.quantity += quantity;
      item.unit_price = product.price;
      items = items.map((it) => (it.id === item.id ? item : it));
    } else {
      item = {
        id: this._generateId('qli'),
        quote_list_id: list.id,
        product_id: productId,
        quantity,
        unit_price: product.price,
        added_at: now
      };
      items.push(item);
    }

    list.updated_at = now;

    this._saveToStorage('quote_list_items', items);
    this._saveQuoteList(list);

    return {
      success: true,
      quote_list: this._buildQuoteListResponse(list)
    };
  }

  // --------------------
  // getQuoteList
  // --------------------
  getQuoteList() {
    const list = this._getOrCreateQuoteList();
    return this._buildQuoteListResponse(list);
  }

  // --------------------
  // updateQuoteListItemQuantity
  // --------------------
  updateQuoteListItemQuantity(quoteListItemId, quantity) {
    let items = this._getFromStorage('quote_list_items');
    const idx = items.findIndex((i) => i.id === quoteListItemId);
    if (idx === -1) {
      return { success: false, quote_list: null };
    }

    const item = items[idx];
    const listId = item.quote_list_id;

    if (quantity <= 0) {
      items.splice(idx, 1);
    } else {
      item.quantity = quantity;
      items[idx] = item;
    }

    this._saveToStorage('quote_list_items', items);

    const quoteLists = this._getFromStorage('quote_lists');
    const list = quoteLists.find((l) => l.id === listId) || this._getOrCreateQuoteList();
    list.updated_at = this._nowISO();
    this._saveQuoteList(list);

    return {
      success: true,
      quote_list: this._buildQuoteListResponse(list)
    };
  }

  // --------------------
  // removeQuoteListItem
  // --------------------
  removeQuoteListItem(quoteListItemId) {
    let items = this._getFromStorage('quote_list_items');
    const idx = items.findIndex((i) => i.id === quoteListItemId);
    if (idx === -1) {
      return { success: false, quote_list: null };
    }

    const listId = items[idx].quote_list_id;
    items.splice(idx, 1);
    this._saveToStorage('quote_list_items', items);

    const quoteLists = this._getFromStorage('quote_lists');
    const list = quoteLists.find((l) => l.id === listId) || this._getOrCreateQuoteList();
    list.updated_at = this._nowISO();
    this._saveQuoteList(list);

    return {
      success: true,
      quote_list: this._buildQuoteListResponse(list)
    };
  }

  // --------------------
  // saveQuoteList
  // --------------------
  saveQuoteList(title = undefined) {
    const list = this._getOrCreateQuoteList();
    if (typeof title === 'string') {
      list.title = title;
    }
    list.updated_at = this._nowISO();
    this._saveQuoteList(list);

    return {
      success: true,
      quote_list: this._buildQuoteListResponse(list)
    };
  }

  // --------------------
  // addProductToComparisonList
  // --------------------
  addProductToComparisonList(productId) {
    const products = this._getFromStorage('products');
    const product = products.find((p) => p.id === productId);
    if (!product) {
      return { success: false, comparison_list: null };
    }

    const list = this._getOrCreateComparisonList();
    let items = this._getFromStorage('comparison_items');

    const existing = items.find((i) => i.comparison_list_id === list.id && i.product_id === productId);
    const now = this._nowISO();

    if (!existing) {
      const item = {
        id: this._generateId('cmpi'),
        comparison_list_id: list.id,
        product_id: productId,
        added_at: now
      };
      items.push(item);
      this._saveToStorage('comparison_items', items);
      list.updated_at = now;
      this._saveComparisonList(list);
    }

    return {
      success: true,
      comparison_list: this._buildComparisonListResponse(list)
    };
  }

  // --------------------
  // getComparisonTable
  // --------------------
  getComparisonTable() {
    const list = this._getOrCreateComparisonList();
    return this._buildComparisonTable(list);
  }

  // --------------------
  // removeComparisonItem
  // --------------------
  removeComparisonItem(comparisonItemId) {
    let items = this._getFromStorage('comparison_items');
    const idx = items.findIndex((i) => i.id === comparisonItemId);
    if (idx === -1) {
      return { success: false, comparison_list_id: null, products: [] };
    }

    const listId = items[idx].comparison_list_id;
    items.splice(idx, 1);
    this._saveToStorage('comparison_items', items);

    const comparisonLists = this._getFromStorage('comparison_lists');
    const list = comparisonLists.find((l) => l.id === listId) || this._getOrCreateComparisonList();
    list.updated_at = this._nowISO();
    this._saveComparisonList(list);

    const table = this._buildComparisonTable(list);

    return {
      success: true,
      comparison_list_id: table.comparison_list_id,
      products: table.products
    };
  }

  // --------------------
  // clearComparisonList
  // --------------------
  clearComparisonList() {
    const list = this._getOrCreateComparisonList();
    let items = this._getFromStorage('comparison_items');
    items = items.filter((i) => i.comparison_list_id !== list.id);
    this._saveToStorage('comparison_items', items);

    list.updated_at = this._nowISO();
    this._saveComparisonList(list);

    return {
      success: true,
      comparison_list_id: list.id,
      products: []
    };
  }

  // --------------------
  // getBlogFilterOptions
  // --------------------
  getBlogFilterOptions() {
    const articles = this._getFromStorage('blog_articles');
    const yearSet = new Set();
    articles.forEach((a) => {
      if (a.publication_date) {
        const year = new Date(a.publication_date).getFullYear();
        if (!isNaN(year)) yearSet.add(year);
      }
    });

    const year_options = Array.from(yearSet).sort((a, b) => b - a);

    const date_range_options = [
      { value: 'last_12_months', label: 'Last 12 months' },
      { value: 'last_2_years', label: 'Last 2 years' }
    ];

    const sort_options = [
      { value: 'most_recent', label: 'Most Recent' },
      { value: 'oldest_first', label: 'Oldest First' }
    ];

    return { year_options, date_range_options, sort_options };
  }

  // --------------------
  // searchBlogArticles
  // --------------------
  searchBlogArticles(query = undefined, filters = undefined, sort = 'most_recent', page = 1, page_size = 20) {
    let articles = this._getFromStorage('blog_articles');

    if (!filters || !filters.status) {
      articles = articles.filter((a) => a.status === 'published');
    } else if (filters.status) {
      articles = articles.filter((a) => a.status === filters.status);
    }

    if (query) {
      const q = query.toLowerCase();
      articles = articles.filter((a) => {
        const title = (a.title || '').toLowerCase();
        const summary = (a.summary || '').toLowerCase();
        const content = (a.content || '').toLowerCase();
        return title.includes(q) || summary.includes(q) || content.includes(q);
      });
    }

    if (filters) {
      const now = new Date();
      if (typeof filters.year_from === 'number') {
        articles = articles.filter((a) => {
          const year = new Date(a.publication_date).getFullYear();
          return year >= filters.year_from;
        });
      }
      if (typeof filters.year_to === 'number') {
        articles = articles.filter((a) => {
          const year = new Date(a.publication_date).getFullYear();
          return year <= filters.year_to;
        });
      }
      if (filters.date_range === 'last_2_years' || filters.date_range === 'last_12_months') {
        let fromDate;
        if (filters.date_range === 'last_2_years') {
          fromDate = new Date(now.getFullYear() - 2, now.getMonth(), now.getDate());
        } else {
          fromDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        }
        articles = articles.filter((a) => new Date(a.publication_date) >= fromDate);
      }
    }

    if (sort === 'most_recent') {
      articles.sort((a, b) => new Date(b.publication_date) - new Date(a.publication_date));
    } else if (sort === 'oldest_first') {
      articles.sort((a, b) => new Date(a.publication_date) - new Date(b.publication_date));
    }

    const total_count = articles.length;
    const startIdx = (page - 1) * page_size;
    const endIdx = startIdx + page_size;

    const pageItems = articles.slice(startIdx, endIdx).map((a) => ({
      article_id: a.id,
      title: a.title,
      slug: a.slug,
      summary: a.summary || '',
      publication_date: a.publication_date,
      author_name: a.author_name || '',
      url: a.url
    }));

    return { articles: pageItems, total_count, page, page_size };
  }

  // --------------------
  // getBlogArticleDetails
  // --------------------
  getBlogArticleDetails(articleId) {
    const articles = this._getFromStorage('blog_articles');
    const a = articles.find((art) => art.id === articleId);
    if (!a) return null;

    const year = a.publication_date ? new Date(a.publication_date).getFullYear() : 0;
    const is_recent = year >= 2023;

    return {
      article_id: a.id,
      title: a.title,
      slug: a.slug,
      content: a.content || '',
      summary: a.summary || '',
      publication_date: a.publication_date,
      author_name: a.author_name || '',
      topic_tags: Array.isArray(a.topic_tags) ? a.topic_tags : [],
      url: a.url,
      is_recent
    };
  }

  // --------------------
  // getAboutPageContent
  // --------------------
  getAboutPageContent() {
    // Static company information (configuration-level, not mocked product data)
    return {
      company_name: 'Guardian Fire Safety Services',
      tagline: 'Protecting people, property, and peace of mind.',
      description:
        'Guardian Fire Safety Services provides fire extinguishers, alarm systems, inspections, and training for homes and businesses.',
      expertise_areas: [
        'Portable fire extinguishers',
        'Fire alarm systems',
        'Smoke and heat detection',
        'Code-compliant inspections',
        'Fire safety training'
      ],
      certifications: [
        'NFPA-compliant service provider',
        'Factory-trained technicians',
        'Licensed & insured in applicable jurisdictions'
      ],
      service_areas: ['Local metro region and surrounding areas'],
      contact_phone: '+1 (555) 000-0000',
      contact_email: 'info@guardianfiresafety.example.com',
      physical_address: {
        address_line1: '100 Safety Way',
        address_line2: '',
        city: 'Safetyville',
        state: 'ST',
        postal_code: '00000'
      }
    };
  }

  // --------------------
  // submitContactMessage
  // --------------------
  submitContactMessage(name, email, phone = undefined, message) {
    const messages = this._getFromStorage('contact_messages');
    const id = this._generateId('cm');
    const created_at = this._nowISO();

    const record = {
      id,
      name,
      email,
      phone: phone || '',
      message,
      status: 'new',
      created_at
    };

    messages.push(record);
    this._saveToStorage('contact_messages', messages);

    return {
      success: true,
      contact_message: {
        contact_message_id: record.id,
        status: record.status,
        created_at: record.created_at
      },
      confirmation_message: 'Your message has been sent. We will contact you soon.'
    };
  }

  // --------------------
  // onCopyArticleLinkClick
  // --------------------
  onCopyArticleLinkClick(currentArticleId, currentArticleUrl) {
    // Instrumentation for task completion tracking
    try {
      localStorage.setItem(
        'task9_copiedArticleInfo',
        JSON.stringify({
          article_id: currentArticleId,
          url: currentArticleUrl,
          copied_at: new Date().toISOString()
        })
      );
    } catch (e) {
      console.error('Instrumentation error:', e);
    }
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