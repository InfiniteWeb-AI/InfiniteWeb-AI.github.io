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

  // ------------------------
  // Storage helpers
  // ------------------------

  _initStorage() {
    // Core entity tables (arrays)
    const arrayKeys = [
      'product_categories',
      'products',
      'system_modules',
      'robot_throughput_profiles',
      'quote_cart',
      'quote_cart_items',
      'shopping_cart',
      'shopping_cart_items',
      'shortlist',
      'shortlist_items',
      'demo_availability_slots',
      'demo_requests',
      'resources',
      'my_library_items',
      'support_articles',
      'my_support_docs',
      'product_comparison_lists',
      'product_comparison_items',
      'events',
      'event_sessions',
      'event_registrations',
      'contact_inquiries',
      // legacy keys from template (unused, kept for compatibility)
      'users',
      'carts',
      'cartItems'
    ];

    for (const key of arrayKeys) {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    }

    // Seed a minimal set of consumables compatible with AutoPipette X100 if none exist yet
    try {
      const productsRaw = localStorage.getItem('products');
      const products = productsRaw ? JSON.parse(productsRaw) : [];
      const hasConsumables = Array.isArray(products) && products.some((p) => p && p.product_type === 'consumable');
      if (!hasConsumables) {
        const seedConsumables = [
          {
            id: 'consumable_autopipette_x100_tips',
            name: 'AutoPipette X100 Filter Pipette Tips',
            sku: 'APX100-TIPS',
            product_type: 'consumable',
            category_slug: 'consumables',
            short_description: 'Filter pipette tips optimized for AutoPipette X100.',
            long_description: 'Box of filter pipette tips validated for use with AutoPipette X100 benchtop robots.',
            image_url: '',
            status: 'active',
            price_usd: 120,
            currency: 'USD',
            consumable_category: 'pipette_tips',
            compatible_robot_model_names: ['AutoPipette X100'],
            compatible_robot_product_ids: ['prod_autopipette_x100'],
            pack_size: 960,
            unit_of_measure: 'tips',
            default_quantity_step: 1
          },
          {
            id: 'consumable_autopipette_x100_reservoirs',
            name: 'AutoPipette X100 Reagent Reservoirs',
            sku: 'APX100-RES',
            product_type: 'consumable',
            category_slug: 'consumables',
            short_description: 'Reagent reservoirs compatible with AutoPipette X100.',
            long_description: 'Pack of reagent reservoirs validated for use with AutoPipette X100 workflows.',
            image_url: '',
            status: 'active',
            price_usd: 80,
            currency: 'USD',
            consumable_category: 'reservoirs',
            compatible_robot_model_names: ['AutoPipette X100'],
            compatible_robot_product_ids: ['prod_autopipette_x100'],
            pack_size: 50,
            unit_of_measure: 'reservoirs',
            default_quantity_step: 1
          },
          {
            id: 'consumable_autopipette_x100_plates',
            name: 'AutoPipette X100 96-well Microplates',
            sku: 'APX100-MP96',
            product_type: 'consumable',
            category_slug: 'consumables',
            short_description: '96-well microplates suitable for AutoPipette X100 workflows.',
            long_description: 'Pack of 96-well microplates tested for compatibility with AutoPipette X100 assays.',
            image_url: '',
            status: 'active',
            price_usd: 150,
            currency: 'USD',
            consumable_category: 'microplates',
            compatible_robot_model_names: ['AutoPipette X100'],
            compatible_robot_product_ids: ['prod_autopipette_x100'],
            pack_size: 50,
            unit_of_measure: 'plates',
            default_quantity_step: 1
          }
        ];
        const updatedProducts = Array.isArray(products) ? products.concat(seedConsumables) : seedConsumables;
        localStorage.setItem('products', JSON.stringify(updatedProducts));
      }
    } catch (e) {}

    // Company info singleton object
    if (!localStorage.getItem('company_info')) {
      localStorage.setItem(
        'company_info',
        JSON.stringify({
          mission: '',
          overview: '',
          contact_email: '',
          contact_phone: ''
        })
      );
    }

    // Global id counter
    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, defaultValue) {
    const data = localStorage.getItem(key);
    if (data === null || data === undefined) {
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

  _nowIso() {
    return new Date().toISOString();
  }

  // ------------------------
  // Internal helpers (private)
  // ------------------------

  _getOrCreateQuoteCart() {
    const carts = this._getFromStorage('quote_cart', []);
    let cart = carts[0] || null;
    if (!cart) {
      cart = {
        id: this._generateId('qc'),
        status: 'open',
        created_at: this._nowIso(),
        updated_at: this._nowIso()
      };
      carts.push(cart);
      this._saveToStorage('quote_cart', carts);
    }
    return cart;
  }

  _getOrCreateShoppingCart() {
    const carts = this._getFromStorage('shopping_cart', []);
    let cart = carts[0] || null;
    if (!cart) {
      cart = {
        id: this._generateId('sc'),
        created_at: this._nowIso(),
        updated_at: this._nowIso()
      };
      carts.push(cart);
      this._saveToStorage('shopping_cart', carts);
    }
    return cart;
  }

  _getOrCreateShortlist() {
    const lists = this._getFromStorage('shortlist', []);
    let list = lists[0] || null;
    if (!list) {
      list = {
        id: this._generateId('sl'),
        created_at: this._nowIso(),
        updated_at: this._nowIso()
      };
      lists.push(list);
      this._saveToStorage('shortlist', lists);
    }
    return list;
  }

  _getOrCreateProductComparisonList() {
    const lists = this._getFromStorage('product_comparison_lists', []);
    let list = lists[0] || null;
    if (!list) {
      list = {
        id: this._generateId('pcl'),
        created_at: this._nowIso(),
        updated_at: this._nowIso()
      };
      lists.push(list);
      this._saveToStorage('product_comparison_lists', lists);
    }
    return list;
  }

  _getOrCreateMyLibrary() {
    // MyLibraryItem is the only persistent entity; this ensures the key exists
    const items = this._getFromStorage('my_library_items', []);
    if (!Array.isArray(items)) {
      this._saveToStorage('my_library_items', []);
      return [];
    }
    return items;
  }

  _getOrCreateMySupportDocs() {
    const items = this._getFromStorage('my_support_docs', []);
    if (!Array.isArray(items)) {
      this._saveToStorage('my_support_docs', []);
      return [];
    }
    return items;
  }

  _calculateRequiredRobotUnits(profile, number_of_samples, shift_length_hours) {
    if (!profile || !profile.samples_per_hour_per_unit || profile.samples_per_hour_per_unit <= 0) {
      return null;
    }
    const capacityPerUnit = profile.samples_per_hour_per_unit * shift_length_hours;
    if (capacityPerUnit <= 0) {
      return null;
    }
    return Math.ceil(number_of_samples / capacityPerUnit);
  }

  _findAvailableDemoSlots(productId, start_date, end_date) {
    const slots = this._getFromStorage('demo_availability_slots', []);
    const start = new Date(start_date);
    const end = new Date(end_date);
    return slots.filter((slot) => {
      if (!slot.is_available) return false;
      if (slot.product_id && slot.product_id !== productId) return false;
      const d = new Date(slot.date);
      return d >= start && d <= end;
    });
  }

  _filterEventsByDateRange(events, start_date_from, start_date_to, format) {
    const start = start_date_from ? new Date(start_date_from) : null;
    const end = start_date_to ? new Date(start_date_to) : null;
    return events.filter((evt) => {
      if (format && evt.format !== format) return false;
      if (!evt.start_date) return false;
      const d = new Date(evt.start_date);
      if (start && d < start) return false;
      if (end && d > end) return false;
      return true;
    });
  }

  // ------------------------
  // Interfaces implementation
  // ------------------------

  // getProductCategoriesForNavigation()
  getProductCategoriesForNavigation() {
    return this._getFromStorage('product_categories', []);
  }

  // getHomepageFeaturedContent()
  getHomepageFeaturedContent() {
    const products = this._getFromStorage('products', []);
    const resources = this._getFromStorage('resources', []);
    const events = this._getFromStorage('events', []);

    const activeProducts = products.filter((p) => p.status === 'active');

    const featured_robots = activeProducts
      .filter((p) => p.product_type === 'robot')
      .slice(0, 5);

    const featured_consumables = activeProducts
      .filter((p) => p.product_type === 'consumable')
      .slice(0, 5);

    const featured_workflows = activeProducts
      .filter((p) => p.product_type === 'integrated_system')
      .slice(0, 5);

    const featured_resources = resources
      .slice()
      .sort((a, b) => {
        const da = a.publication_date ? new Date(a.publication_date).getTime() : 0;
        const db = b.publication_date ? new Date(b.publication_date).getTime() : 0;
        return db - da;
      })
      .slice(0, 5);

    const upcomingEvents = events
      .filter((e) => e.start_date)
      .slice()
      .sort((a, b) => {
        const da = new Date(a.start_date).getTime();
        const db = new Date(b.start_date).getTime();
        return da - db;
      })
      .slice(0, 5);

    return {
      featured_robots,
      featured_consumables,
      featured_workflows,
      featured_resources,
      featured_events: upcomingEvents
    };
  }

  // getProductFilterOptions(category_slug)
  getProductFilterOptions(category_slug) {
    const products = this._getFromStorage('products', []);
    const filtered = products.filter((p) => p.category_slug === category_slug);

    const plateSet = new Set();
    const appSet = new Set();
    const consumableCatSet = new Set();
    const compatibleRobotNameSet = new Set();

    let priceMin = null;
    let priceMax = null;
    let hasBenchtop = false;

    for (const p of filtered) {
      if (Array.isArray(p.plate_formats)) {
        p.plate_formats.forEach((f) => plateSet.add(f));
      }
      if (Array.isArray(p.applications)) {
        p.applications.forEach((a) => appSet.add(a));
      }
      if (p.consumable_category) {
        consumableCatSet.add(p.consumable_category);
      }
      if (Array.isArray(p.compatible_robot_model_names)) {
        p.compatible_robot_model_names.forEach((n) => compatibleRobotNameSet.add(n));
      }
      if (typeof p.price_usd === 'number') {
        if (priceMin === null || p.price_usd < priceMin) priceMin = p.price_usd;
        if (priceMax === null || p.price_usd > priceMax) priceMax = p.price_usd;
      }
      if (p.is_benchtop) {
        hasBenchtop = true;
      }
    }

    return {
      plate_formats: Array.from(plateSet),
      applications: Array.from(appSet),
      consumable_categories: Array.from(consumableCatSet),
      compatible_robot_model_names: Array.from(compatibleRobotNameSet),
      price_min_usd: priceMin,
      price_max_usd: priceMax,
      has_benchtop_option: hasBenchtop
    };
  }

  // listProducts(category_slug, filters, sort_by, page, page_size)
  listProducts(category_slug, filters, sort_by, page, page_size) {
    const products = this._getFromStorage('products', []);
    filters = filters || {};
    sort_by = sort_by || null;
    page = page || 1;
    page_size = page_size || 20;

    let list = products.filter((p) => p.category_slug === category_slug && p.status === 'active');

    // Apply filters
    if (filters.plate_formats && Array.isArray(filters.plate_formats) && filters.plate_formats.length) {
      const plateSet = new Set(filters.plate_formats);
      list = list.filter((p) => Array.isArray(p.plate_formats) && p.plate_formats.some((f) => plateSet.has(f)));
    }

    if (filters.applications && Array.isArray(filters.applications) && filters.applications.length) {
      const appSet = new Set(filters.applications);
      list = list.filter((p) => Array.isArray(p.applications) && p.applications.some((a) => appSet.has(a)));
    }

    if (typeof filters.min_price_usd === 'number') {
      list = list.filter((p) => typeof p.price_usd === 'number' && p.price_usd >= filters.min_price_usd);
    }

    if (typeof filters.max_price_usd === 'number') {
      list = list.filter((p) => typeof p.price_usd === 'number' && p.price_usd <= filters.max_price_usd);
    }

    if (typeof filters.is_benchtop === 'boolean') {
      list = list.filter((p) => !!p.is_benchtop === filters.is_benchtop);
    }

    if (filters.consumable_category) {
      list = list.filter((p) => p.consumable_category === filters.consumable_category);
    }

    if (filters.compatible_robot_model_name) {
      const name = filters.compatible_robot_model_name;
      list = list.filter(
        (p) => Array.isArray(p.compatible_robot_model_names) && p.compatible_robot_model_names.includes(name)
      );
    }

    if (filters.system_application) {
      list = list.filter((p) => p.system_application === filters.system_application);
    }

    if (filters.release_date_from) {
      const from = new Date(filters.release_date_from);
      list = list.filter((p) => p.release_date && new Date(p.release_date) >= from);
    }

    if (filters.release_date_to) {
      const to = new Date(filters.release_date_to);
      list = list.filter((p) => p.release_date && new Date(p.release_date) <= to);
    }

    // Sorting
    if (sort_by === 'price_low_to_high') {
      list.sort((a, b) => (a.price_usd || 0) - (b.price_usd || 0));
    } else if (sort_by === 'price_high_to_low') {
      list.sort((a, b) => (b.price_usd || 0) - (a.price_usd || 0));
    } else if (sort_by === 'newest') {
      list.sort((a, b) => {
        const da = a.release_date ? new Date(a.release_date).getTime() : 0;
        const db = b.release_date ? new Date(b.release_date).getTime() : 0;
        return db - da;
      });
    } else if (sort_by === 'throughput_high_to_low') {
      list.sort((a, b) => (b.throughput_score || 0) - (a.throughput_score || 0));
    }

    const total_count = list.length;
    const startIndex = (page - 1) * page_size;
    const endIndex = startIndex + page_size;
    const pageProducts = list.slice(startIndex, endIndex);

    return {
      products: pageProducts,
      total_count,
      page,
      page_size
    };
  }

  // searchProducts(query, category_slug, filters, sort_by, page, page_size)
  searchProducts(query, category_slug, filters, sort_by, page, page_size) {
    const products = this._getFromStorage('products', []);
    filters = filters || {};
    sort_by = sort_by || 'relevance';
    page = page || 1;
    page_size = page_size || 20;

    const q = (query || '').toLowerCase();

    let list = products.filter((p) => p.status === 'active');

    if (category_slug) {
      list = list.filter((p) => p.category_slug === category_slug);
    }

    if (q) {
      list = list.filter((p) => {
        const name = (p.name || '').toLowerCase();
        const sd = (p.short_description || '').toLowerCase();
        const ld = (p.long_description || '').toLowerCase();
        return name.includes(q) || sd.includes(q) || ld.includes(q);
      });
    }

    // Apply additional filters similar to listProducts, but on the already search-matched list
    if (filters.plate_formats && Array.isArray(filters.plate_formats) && filters.plate_formats.length) {
      const plateSet = new Set(filters.plate_formats);
      list = list.filter((p) => Array.isArray(p.plate_formats) && p.plate_formats.some((f) => plateSet.has(f)));
    }

    if (filters.applications && Array.isArray(filters.applications) && filters.applications.length) {
      const appSet = new Set(filters.applications);
      list = list.filter((p) => Array.isArray(p.applications) && p.applications.some((a) => appSet.has(a)));
    }

    if (typeof filters.min_price_usd === 'number') {
      list = list.filter((p) => typeof p.price_usd === 'number' && p.price_usd >= filters.min_price_usd);
    }

    if (typeof filters.max_price_usd === 'number') {
      list = list.filter((p) => typeof p.price_usd === 'number' && p.price_usd <= filters.max_price_usd);
    }

    if (typeof filters.is_benchtop === 'boolean') {
      list = list.filter((p) => !!p.is_benchtop === filters.is_benchtop);
    }

    if (filters.consumable_category) {
      list = list.filter((p) => p.consumable_category === filters.consumable_category);
    }

    if (filters.compatible_robot_model_name) {
      const name = filters.compatible_robot_model_name;
      list = list.filter(
        (p) => Array.isArray(p.compatible_robot_model_names) && p.compatible_robot_model_names.includes(name)
      );
    }

    if (filters.system_application) {
      list = list.filter((p) => p.system_application === filters.system_application);
    }

    if (filters.release_date_from) {
      const from = new Date(filters.release_date_from);
      list = list.filter((p) => p.release_date && new Date(p.release_date) >= from);
    }

    if (filters.release_date_to) {
      const to = new Date(filters.release_date_to);
      list = list.filter((p) => p.release_date && new Date(p.release_date) <= to);
    }

    if (sort_by === 'price_low_to_high') {
      list.sort((a, b) => (a.price_usd || 0) - (b.price_usd || 0));
    } else if (sort_by === 'price_high_to_low') {
      list.sort((a, b) => (b.price_usd || 0) - (a.price_usd || 0));
    } else if (sort_by === 'newest') {
      list.sort((a, b) => {
        const da = a.release_date ? new Date(a.release_date).getTime() : 0;
        const db = b.release_date ? new Date(b.release_date).getTime() : 0;
        return db - da;
      });
    } else if (sort_by === 'relevance' && q) {
      list.sort((a, b) => {
        const an = (a.name || '').toLowerCase().includes(q) ? 1 : 0;
        const bn = (b.name || '').toLowerCase().includes(q) ? 1 : 0;
        if (an !== bn) return bn - an;
        const asd = (a.short_description || '').toLowerCase().includes(q) ? 1 : 0;
        const bsd = (b.short_description || '').toLowerCase().includes(q) ? 1 : 0;
        return bsd - asd;
      });
    }

    const total_count = list.length;
    const startIndex = (page - 1) * page_size;
    const endIndex = startIndex + page_size;
    const pageProducts = list.slice(startIndex, endIndex);

    return {
      products: pageProducts,
      total_count,
      page,
      page_size
    };
  }

  // addProductsToComparison(product_ids)
  addProductsToComparison(product_ids) {
    const comparisonList = this._getOrCreateProductComparisonList();
    const items = this._getFromStorage('product_comparison_items', []);

    const existing = items.filter((i) => i.comparison_list_id === comparisonList.id);
    const existingIds = new Set(existing.map((i) => i.product_id));

    let position = existing.length;

    for (const pid of product_ids) {
      if (existingIds.has(pid)) continue;
      const item = {
        id: this._generateId('pci'),
        comparison_list_id: comparisonList.id,
        product_id: pid,
        position_index: position
      };
      position += 1;
      items.push(item);
    }

    this._saveToStorage('product_comparison_items', items);

    const resultItems = items.filter((i) => i.comparison_list_id === comparisonList.id);

    return {
      comparison_list_id: comparisonList.id,
      product_ids: resultItems.map((i) => i.product_id)
    };
  }

  // getCurrentProductComparison()
  getCurrentProductComparison() {
    const lists = this._getFromStorage('product_comparison_lists', []);
    if (!lists.length) {
      return { comparison_list_id: null, products: [] };
    }
    const list = lists[0];
    const items = this._getFromStorage('product_comparison_items', []).filter(
      (i) => i.comparison_list_id === list.id
    );
    const products = this._getFromStorage('products', []);

    const ordered = items
      .slice()
      .sort((a, b) => (a.position_index || 0) - (b.position_index || 0))
      .map((item) => products.find((p) => p.id === item.product_id))
      .filter(Boolean);

    return {
      comparison_list_id: list.id,
      products: ordered
    };
  }

  // clearCurrentProductComparison()
  clearCurrentProductComparison() {
    const lists = this._getFromStorage('product_comparison_lists', []);
    if (!lists.length) {
      return { success: true };
    }
    const list = lists[0];
    const items = this._getFromStorage('product_comparison_items', []);
    const remainingItems = items.filter((i) => i.comparison_list_id !== list.id);

    this._saveToStorage('product_comparison_items', remainingItems);
    this._saveToStorage('product_comparison_lists', []);

    return { success: true };
  }

  // getProductDetails(productId)
  getProductDetails(productId) {
    const products = this._getFromStorage('products', []);
    const categories = this._getFromStorage('product_categories', []);

    const product = products.find((p) => p.id === productId) || null;
    let category = null;
    if (product) {
      category = categories.find((c) => c.slug === product.category_slug) || null;
    }
    return { product, category };
  }

  // addProductToQuoteCart(productId, quantity = 1, configuration)
  addProductToQuoteCart(productId, quantity, configuration) {
    quantity = typeof quantity === 'number' && quantity > 0 ? quantity : 1;
    configuration = configuration || {};

    const cart = this._getOrCreateQuoteCart();
    const items = this._getFromStorage('quote_cart_items', []);
    const products = this._getFromStorage('products', []);
    const product = products.find((p) => p.id === productId) || null;

    const unit_price = product && typeof product.price_usd === 'number' ? product.price_usd : 0;
    const line_total = unit_price * quantity;

    const item = {
      id: this._generateId('qci'),
      quote_cart_id: cart.id,
      product_id: productId,
      quantity,
      unit_price_usd: unit_price,
      line_total_usd: line_total,
      selected_warranty_option: configuration.selected_warranty_option || null,
      deck_plate_positions: configuration.deck_plate_positions || null,
      deck_tip_rack_positions: configuration.deck_tip_rack_positions || null,
      configuration_summary: configuration.configuration_summary || null,
      added_at: this._nowIso()
    };

    items.push(item);
    this._saveToStorage('quote_cart_items', items);

    return {
      success: true,
      quote_cart_id: cart.id,
      quote_cart_item_id: item.id,
      message: 'Product added to quote cart.'
    };
  }

  // addProductToShoppingCart(productId, quantity)
  addProductToShoppingCart(productId, quantity) {
    quantity = typeof quantity === 'number' && quantity > 0 ? quantity : 1;

    const cart = this._getOrCreateShoppingCart();
    const items = this._getFromStorage('shopping_cart_items', []);
    const products = this._getFromStorage('products', []);
    const product = products.find((p) => p.id === productId) || null;

    const unit_price = product && typeof product.price_usd === 'number' ? product.price_usd : 0;
    const line_total = unit_price * quantity;

    const item = {
      id: this._generateId('sci'),
      shopping_cart_id: cart.id,
      product_id: productId,
      quantity,
      unit_price_usd: unit_price,
      line_total_usd: line_total,
      added_at: this._nowIso()
    };

    items.push(item);
    this._saveToStorage('shopping_cart_items', items);

    return {
      success: true,
      shopping_cart_id: cart.id,
      shopping_cart_item_id: item.id,
      message: 'Product added to shopping cart.'
    };
  }

  // saveProductToShortlist(productId)
  saveProductToShortlist(productId) {
    const shortlist = this._getOrCreateShortlist();
    const items = this._getFromStorage('shortlist_items', []);

    const existing = items.find(
      (i) => i.shortlist_id === shortlist.id && i.product_id === productId
    );
    if (existing) {
      return {
        success: true,
        shortlist_id: shortlist.id,
        shortlist_item_id: existing.id
      };
    }

    const item = {
      id: this._generateId('sli'),
      shortlist_id: shortlist.id,
      product_id: productId,
      added_at: this._nowIso()
    };

    items.push(item);
    this._saveToStorage('shortlist_items', items);

    return {
      success: true,
      shortlist_id: shortlist.id,
      shortlist_item_id: item.id
    };
  }

  // getShortlist()
  getShortlist() {
    const lists = this._getFromStorage('shortlist', []);
    if (!lists.length) {
      return { shortlist_id: null, items: [] };
    }
    const shortlist = lists[0];
    const items = this._getFromStorage('shortlist_items', []).filter(
      (i) => i.shortlist_id === shortlist.id
    );
    const products = this._getFromStorage('products', []);

    const mapped = items.map((i) => {
      const product = products.find((p) => p.id === i.product_id) || null;
      return {
        shortlist_item_id: i.id,
        product,
        added_at: i.added_at
      };
    });

    return {
      shortlist_id: shortlist.id,
      items: mapped
    };
  }

  // removeShortlistItem(shortlist_item_id)
  removeShortlistItem(shortlist_item_id) {
    const items = this._getFromStorage('shortlist_items', []);
    const newItems = items.filter((i) => i.id !== shortlist_item_id);
    this._saveToStorage('shortlist_items', newItems);
    return { success: true };
  }

  // getCompatibleConsumablesForRobot(robot_product_id)
  getCompatibleConsumablesForRobot(robot_product_id) {
    const products = this._getFromStorage('products', []);
    const robot = products.find((p) => p.id === robot_product_id) || null;
    if (!robot) return [];

    const result = products.filter((p) => {
      if (p.product_type !== 'consumable') return false;
      if (Array.isArray(p.compatible_robot_product_ids) && p.compatible_robot_product_ids.includes(robot_product_id)) {
        return true;
      }
      if (
        robot.name &&
        Array.isArray(p.compatible_robot_model_names) &&
        p.compatible_robot_model_names.includes(robot.name)
      ) {
        return true;
      }
      return false;
    });

    return result;
  }

  // getCompatibleInstrumentsForConsumable(consumable_product_id)
  getCompatibleInstrumentsForConsumable(consumable_product_id) {
    const products = this._getFromStorage('products', []);
    const consumable = products.find((p) => p.id === consumable_product_id) || null;
    if (!consumable) return [];

    const result = products.filter((p) => {
      if (p.product_type !== 'robot') return false;
      if (
        Array.isArray(consumable.compatible_robot_product_ids) &&
        consumable.compatible_robot_product_ids.includes(p.id)
      ) {
        return true;
      }
      if (
        p.name &&
        Array.isArray(consumable.compatible_robot_model_names) &&
        consumable.compatible_robot_model_names.includes(p.name)
      ) {
        return true;
      }
      return false;
    });

    return result;
  }

  // getQuoteCart()
  getQuoteCart() {
    const carts = this._getFromStorage('quote_cart', []);
    if (!carts.length) {
      return {
        quote_cart_id: null,
        status: 'open',
        items: [],
        cart_total_usd: 0
      };
    }
    const cart = carts[0];
    const items = this._getFromStorage('quote_cart_items', []).filter(
      (i) => i.quote_cart_id === cart.id
    );
    const products = this._getFromStorage('products', []);

    let total = 0;
    const mappedItems = items.map((i) => {
      const product = products.find((p) => p.id === i.product_id) || null;
      const unit_price = i.unit_price_usd != null ? i.unit_price_usd : product?.price_usd || 0;
      const line_total = i.line_total_usd != null ? i.line_total_usd : unit_price * (i.quantity || 0);
      total += line_total;
      return {
        quote_cart_item_id: i.id,
        product_id: i.product_id,
        product_name: product ? product.name : null,
        product_type: product ? product.product_type : null,
        quantity: i.quantity,
        unit_price_usd: unit_price,
        line_total_usd: line_total,
        selected_warranty_option: i.selected_warranty_option || null,
        deck_plate_positions: i.deck_plate_positions || null,
        deck_tip_rack_positions: i.deck_tip_rack_positions || null,
        configuration_summary: i.configuration_summary || null,
        // foreign key resolution
        product
      };
    });

    return {
      quote_cart_id: cart.id,
      status: cart.status,
      items: mappedItems,
      cart_total_usd: total
    };
  }

  // updateQuoteCartItem(quote_cart_item_id, quantity, configuration)
  updateQuoteCartItem(quote_cart_item_id, quantity, configuration) {
    const items = this._getFromStorage('quote_cart_items', []);
    const products = this._getFromStorage('products', []);

    const idx = items.findIndex((i) => i.id === quote_cart_item_id);
    if (idx === -1) return { success: false };

    const item = items[idx];
    if (typeof quantity === 'number' && quantity > 0) {
      item.quantity = quantity;
      const product = products.find((p) => p.id === item.product_id) || null;
      const unit_price = item.unit_price_usd != null ? item.unit_price_usd : product?.price_usd || 0;
      item.unit_price_usd = unit_price;
      item.line_total_usd = unit_price * quantity;
    }

    if (configuration) {
      if (configuration.selected_warranty_option !== undefined) {
        item.selected_warranty_option = configuration.selected_warranty_option;
      }
      if (configuration.deck_plate_positions !== undefined) {
        item.deck_plate_positions = configuration.deck_plate_positions;
      }
      if (configuration.deck_tip_rack_positions !== undefined) {
        item.deck_tip_rack_positions = configuration.deck_tip_rack_positions;
      }
      if (configuration.configuration_summary !== undefined) {
        item.configuration_summary = configuration.configuration_summary;
      }
    }

    items[idx] = item;
    this._saveToStorage('quote_cart_items', items);

    return { success: true };
  }

  // removeQuoteCartItem(quote_cart_item_id)
  removeQuoteCartItem(quote_cart_item_id) {
    const items = this._getFromStorage('quote_cart_items', []);
    const newItems = items.filter((i) => i.id !== quote_cart_item_id);
    this._saveToStorage('quote_cart_items', newItems);
    return { success: true };
  }

  // submitQuoteCartForQuote()
  submitQuoteCartForQuote() {
    const carts = this._getFromStorage('quote_cart', []);
    if (!carts.length) {
      return {
        success: false,
        quote_cart_id: null,
        message: 'No quote cart to submit.'
      };
    }
    const cart = carts[0];
    const items = this._getFromStorage('quote_cart_items', []).filter(
      (i) => i.quote_cart_id === cart.id
    );
    if (!items.length) {
      return {
        success: false,
        quote_cart_id: cart.id,
        message: 'Quote cart is empty.'
      };
    }

    cart.status = 'submitted';
    cart.updated_at = this._nowIso();
    this._saveToStorage('quote_cart', [cart]);

    return {
      success: true,
      quote_cart_id: cart.id,
      message: 'Quote cart submitted for quotation.'
    };
  }

  // getShoppingCart()
  getShoppingCart() {
    const carts = this._getFromStorage('shopping_cart', []);
    if (!carts.length) {
      return {
        shopping_cart_id: null,
        items: [],
        cart_subtotal_usd: 0
      };
    }
    const cart = carts[0];
    const items = this._getFromStorage('shopping_cart_items', []).filter(
      (i) => i.shopping_cart_id === cart.id
    );
    const products = this._getFromStorage('products', []);

    let subtotal = 0;
    const mappedItems = items.map((i) => {
      const product = products.find((p) => p.id === i.product_id) || null;
      const unit_price = i.unit_price_usd != null ? i.unit_price_usd : product?.price_usd || 0;
      const line_total = i.line_total_usd != null ? i.line_total_usd : unit_price * (i.quantity || 0);
      subtotal += line_total;
      return {
        shopping_cart_item_id: i.id,
        product_id: i.product_id,
        product_name: product ? product.name : null,
        quantity: i.quantity,
        unit_price_usd: unit_price,
        line_total_usd: line_total,
        // foreign key resolution
        product
      };
    });

    return {
      shopping_cart_id: cart.id,
      items: mappedItems,
      cart_subtotal_usd: subtotal
    };
  }

  // updateShoppingCartItem(shopping_cart_item_id, quantity)
  updateShoppingCartItem(shopping_cart_item_id, quantity) {
    const items = this._getFromStorage('shopping_cart_items', []);
    const products = this._getFromStorage('products', []);

    const idx = items.findIndex((i) => i.id === shopping_cart_item_id);
    if (idx === -1) return { success: false };

    const item = items[idx];
    if (typeof quantity === 'number' && quantity > 0) {
      item.quantity = quantity;
      const product = products.find((p) => p.id === item.product_id) || null;
      const unit_price = item.unit_price_usd != null ? item.unit_price_usd : product?.price_usd || 0;
      item.unit_price_usd = unit_price;
      item.line_total_usd = unit_price * quantity;
    }

    items[idx] = item;
    this._saveToStorage('shopping_cart_items', items);

    return { success: true };
  }

  // removeShoppingCartItem(shopping_cart_item_id)
  removeShoppingCartItem(shopping_cart_item_id) {
    const items = this._getFromStorage('shopping_cart_items', []);
    const newItems = items.filter((i) => i.id !== shopping_cart_item_id);
    this._saveToStorage('shopping_cart_items', newItems);
    return { success: true };
  }

  // submitShoppingCartForCheckout()
  submitShoppingCartForCheckout() {
    const carts = this._getFromStorage('shopping_cart', []);
    if (!carts.length) {
      return {
        success: false,
        shopping_cart_id: null,
        message: 'No shopping cart to submit.'
      };
    }
    const cart = carts[0];
    const items = this._getFromStorage('shopping_cart_items', []).filter(
      (i) => i.shopping_cart_id === cart.id
    );
    if (!items.length) {
      return {
        success: false,
        shopping_cart_id: cart.id,
        message: 'Shopping cart is empty.'
      };
    }

    // No checkout entity modeled; just acknowledge.
    return {
      success: true,
      shopping_cart_id: cart.id,
      message: 'Shopping cart submitted for checkout.'
    };
  }

  // getDemoEligibleProducts()
  getDemoEligibleProducts() {
    const products = this._getFromStorage('products', []);
    return products.filter((p) => p.status === 'active' && p.product_type === 'robot');
  }

  // getDemoAvailability(productId, start_date, end_date)
  getDemoAvailability(productId, start_date, end_date) {
    return this._findAvailableDemoSlots(productId, start_date, end_date);
  }

  // submitDemoRequest(productId, requested_date, requested_time_label, full_name, company, email, primary_application, region)
  submitDemoRequest(
    productId,
    requested_date,
    requested_time_label,
    full_name,
    company,
    email,
    primary_application,
    region
  ) {
    const products = this._getFromStorage('products', []);
    const demoRequests = this._getFromStorage('demo_requests', []);

    const product = products.find((p) => p.id === productId) || null;

    const requestedDateIso = new Date(requested_date).toISOString();

    let requestedDateTime = null;
    if (requested_time_label) {
      // Attempt to construct combined datetime in a simple way (no timezone handling)
      const datePart = requestedDateIso.split('T')[0];
      requestedDateTime = new Date(datePart + 'T00:00:00.000Z').toISOString();
    }

    const demoRequest = {
      id: this._generateId('dr'),
      product_id: productId,
      product_name: product ? product.name : null,
      requested_date: requestedDateIso,
      requested_time_label,
      requested_datetime: requestedDateTime,
      full_name,
      company,
      email,
      primary_application: primary_application || null,
      region,
      status: 'pending',
      created_at: this._nowIso()
    };

    demoRequests.push(demoRequest);
    this._saveToStorage('demo_requests', demoRequests);

    return {
      demo_request_id: demoRequest.id,
      status: demoRequest.status,
      success: true,
      message: 'Demo request submitted.'
    };
  }

  // getResourceFilterOptions()
  getResourceFilterOptions() {
    const resources = this._getFromStorage('resources', []);

    const typeSet = new Set();
    const formatSet = new Set();
    const topicSet = new Set();

    let minDate = null;
    let maxDate = null;

    for (const r of resources) {
      if (r.resource_type) typeSet.add(r.resource_type);
      if (r.format) formatSet.add(r.format);
      if (Array.isArray(r.topics)) {
        r.topics.forEach((t) => topicSet.add(t));
      }
      if (r.publication_date) {
        const d = new Date(r.publication_date).toISOString();
        if (!minDate || d < minDate) minDate = d;
        if (!maxDate || d > maxDate) maxDate = d;
      }
    }

    return {
      resource_types: Array.from(typeSet),
      formats: Array.from(formatSet),
      topics: Array.from(topicSet),
      publication_date_min: minDate,
      publication_date_max: maxDate
    };
  }

  // searchResources(query, filters, sort_by, page, page_size)
  searchResources(query, filters, sort_by, page, page_size) {
    const resources = this._getFromStorage('resources', []);
    filters = filters || {};
    sort_by = sort_by || 'relevance';
    page = page || 1;
    page_size = page_size || 20;

    const q = (query || '').toLowerCase();

    let list = resources.slice();

    if (q) {
      list = list.filter((r) => {
        const title = (r.title || '').toLowerCase();
        const abs = (r.abstract || '').toLowerCase();
        const content = (r.content || '').toLowerCase();
        const snippet = (r.snippet || '').toLowerCase();
        return (
          title.includes(q) ||
          abs.includes(q) ||
          content.includes(q) ||
          snippet.includes(q)
        );
      });
    }

    if (filters.publication_date_from) {
      const from = new Date(filters.publication_date_from);
      list = list.filter((r) => r.publication_date && new Date(r.publication_date) >= from);
    }

    if (filters.publication_date_to) {
      const to = new Date(filters.publication_date_to);
      list = list.filter((r) => r.publication_date && new Date(r.publication_date) <= to);
    }

    if (filters.resource_types && Array.isArray(filters.resource_types) && filters.resource_types.length) {
      const typeSet = new Set(filters.resource_types);
      list = list.filter((r) => typeSet.has(r.resource_type));
    }

    if (filters.formats && Array.isArray(filters.formats) && filters.formats.length) {
      const fmtSet = new Set(filters.formats);
      list = list.filter((r) => fmtSet.has(r.format));
    }

    if (filters.topics && Array.isArray(filters.topics) && filters.topics.length) {
      const topicSet = new Set(filters.topics);
      list = list.filter(
        (r) => Array.isArray(r.topics) && r.topics.some((t) => topicSet.has(t))
      );
    }

    if (sort_by === 'newest_first') {
      list.sort((a, b) => {
        const da = a.publication_date ? new Date(a.publication_date).getTime() : 0;
        const db = b.publication_date ? new Date(b.publication_date).getTime() : 0;
        return db - da;
      });
    } else if (sort_by === 'oldest_first') {
      list.sort((a, b) => {
        const da = a.publication_date ? new Date(a.publication_date).getTime() : 0;
        const db = b.publication_date ? new Date(b.publication_date).getTime() : 0;
        return da - db;
      });
    } else if (sort_by === 'relevance' && q) {
      list.sort((a, b) => {
        const at = (a.title || '').toLowerCase().includes(q) ? 1 : 0;
        const bt = (b.title || '').toLowerCase().includes(q) ? 1 : 0;
        if (at !== bt) return bt - at;
        const aa = (a.abstract || '').toLowerCase().includes(q) ? 1 : 0;
        const ba = (b.abstract || '').toLowerCase().includes(q) ? 1 : 0;
        return ba - aa;
      });
    }

    const total_count = list.length;
    const startIndex = (page - 1) * page_size;
    const endIndex = startIndex + page_size;
    const pageResources = list.slice(startIndex, endIndex);

    return {
      resources: pageResources,
      total_count,
      page,
      page_size
    };
  }

  // getResourceDetail(resource_id)
  getResourceDetail(resource_id) {
    const resources = this._getFromStorage('resources', []);
    return resources.find((r) => r.id === resource_id) || null;
  }

  // saveResourceToMyLibrary(resource_id)
  saveResourceToMyLibrary(resource_id) {
    const items = this._getOrCreateMyLibrary();
    const existing = items.find((i) => i.resource_id === resource_id);
    if (existing) {
      return {
        success: true,
        my_library_item_id: existing.id
      };
    }

    const item = {
      id: this._generateId('mli'),
      resource_id,
      saved_at: this._nowIso()
    };

    const newItems = items.concat([item]);
    this._saveToStorage('my_library_items', newItems);

    return {
      success: true,
      my_library_item_id: item.id
    };
  }

  // getMyLibraryItems()
  getMyLibraryItems() {
    const items = this._getFromStorage('my_library_items', []);
    const resources = this._getFromStorage('resources', []);

    return items.map((i) => {
      const resource = resources.find((r) => r.id === i.resource_id) || null;
      return {
        my_library_item_id: i.id,
        resource,
        saved_at: i.saved_at
      };
    });
  }

  // removeMyLibraryItem(my_library_item_id)
  removeMyLibraryItem(my_library_item_id) {
    const items = this._getFromStorage('my_library_items', []);
    const newItems = items.filter((i) => i.id !== my_library_item_id);
    this._saveToStorage('my_library_items', newItems);
    return { success: true };
  }

  // searchMyLibraryResources(query)
  searchMyLibraryResources(query) {
    const q = (query || '').toLowerCase();
    const items = this._getFromStorage('my_library_items', []);
    const resources = this._getFromStorage('resources', []);

    const mapped = items.map((i) => {
      const resource = resources.find((r) => r.id === i.resource_id) || null;
      return {
        my_library_item_id: i.id,
        resource,
        saved_at: i.saved_at
      };
    });

    if (!q) return mapped;

    return mapped.filter(({ resource }) => {
      if (!resource) return false;
      const title = (resource.title || '').toLowerCase();
      const abs = (resource.abstract || '').toLowerCase();
      const snippet = (resource.snippet || '').toLowerCase();
      return title.includes(q) || abs.includes(q) || snippet.includes(q);
    });
  }

  // getThroughputCalculatorOptions()
  getThroughputCalculatorOptions() {
    const profiles = this._getFromStorage('robot_throughput_profiles', []);
    const products = this._getFromStorage('products', []);

    const assaySet = new Set();
    const robotIdSet = new Set();

    for (const p of profiles) {
      if (p.assay_type) assaySet.add(p.assay_type);
      if (p.robot_product_id) robotIdSet.add(p.robot_product_id);
    }

    const robots = Array.from(robotIdSet).map((id) => {
      const prod = products.find((p) => p.id === id) || null;
      return {
        product_id: id,
        name: prod ? prod.name : id
      };
    });

    return {
      assay_types: Array.from(assaySet),
      robots,
      default_shift_length_hours: 8
    };
  }

  // calculateThroughputForRobotModel(robot_product_id, assay_type, number_of_samples, shift_length_hours)
  calculateThroughputForRobotModel(robot_product_id, assay_type, number_of_samples, shift_length_hours) {
    const profiles = this._getFromStorage('robot_throughput_profiles', []);
    const products = this._getFromStorage('products', []);

    const profile = profiles.find(
      (p) => p.robot_product_id === robot_product_id && p.assay_type === assay_type
    );
    const product = products.find((p) => p.id === robot_product_id) || null;

    const samplesPerHourPerUnit = profile ? profile.samples_per_hour_per_unit : 0;
    const requiredUnits = this._calculateRequiredRobotUnits(
      profile,
      number_of_samples,
      shift_length_hours
    );

    const meets = requiredUnits != null && requiredUnits <= 2;

    // Instrumentation for task completion tracking
    try {
      const existingRaw = localStorage.getItem('task6_throughputCalculations');
      let existingLog = [];
      if (existingRaw) {
        try {
          const parsed = JSON.parse(existingRaw);
          if (Array.isArray(parsed)) {
            existingLog = parsed;
          }
        } catch (e) {
          existingLog = [];
        }
      }
      const updatedLog = existingLog.concat([
        {
          robot_product_id,
          assay_type,
          number_of_samples,
          shift_length_hours,
          samples_per_hour_per_unit: samplesPerHourPerUnit || 0,
          required_units: requiredUnits,
          meets_target_units_threshold: !!meets
        }
      ]);
      localStorage.setItem('task6_throughputCalculations', JSON.stringify(updatedLog));
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      robot_product_id,
      robot_name: product ? product.name : null,
      assay_type,
      samples_per_hour_per_unit: samplesPerHourPerUnit || 0,
      required_units: requiredUnits,
      meets_target_units_threshold: !!meets
    };
  }

  // getSupportFilterOptions()
  getSupportFilterOptions() {
    const articles = this._getFromStorage('support_articles', []);

    const productLineSet = new Set();
    const articleTypeSet = new Set();
    const errorCodeSet = new Set();

    let minUpdated = null;
    let maxUpdated = null;

    for (const a of articles) {
      if (a.product_line) productLineSet.add(a.product_line);
      if (a.article_type) articleTypeSet.add(a.article_type);
      if (Array.isArray(a.error_codes)) {
        a.error_codes.forEach((c) => errorCodeSet.add(c));
      }
      if (a.updated_at) {
        const d = new Date(a.updated_at).toISOString();
        if (!minUpdated || d < minUpdated) minUpdated = d;
        if (!maxUpdated || d > maxUpdated) maxUpdated = d;
      }
    }

    return {
      product_lines: Array.from(productLineSet),
      article_types: Array.from(articleTypeSet),
      error_codes: Array.from(errorCodeSet),
      updated_date_min: minUpdated,
      updated_date_max: maxUpdated
    };
  }

  // searchSupportArticles(query, filters, sort_by, page, page_size)
  searchSupportArticles(query, filters, sort_by, page, page_size) {
    const articles = this._getFromStorage('support_articles', []);
    filters = filters || {};
    sort_by = sort_by || 'relevance';
    page = page || 1;
    page_size = page_size || 20;

    const q = (query || '').toLowerCase();

    let list = articles.slice();

    if (q) {
      const terms = q.split(/\s+/).filter(Boolean);
      list = list.filter((a) => {
        const haystack = [
          a.title || '',
          a.snippet || '',
          a.content || '',
          Array.isArray(a.tags) ? a.tags.join(' ') : ''
        ]
          .join(' ')
          .toLowerCase();
        // Match articles that contain all query terms somewhere in the aggregated text
        return terms.every((term) => haystack.includes(term));
      });
    }

    if (filters.product_line) {
      list = list.filter((a) => a.product_line === filters.product_line);
    }

    if (filters.article_type) {
      list = list.filter((a) => a.article_type === filters.article_type);
    }

    if (filters.error_code) {
      list = list.filter(
        (a) => Array.isArray(a.error_codes) && a.error_codes.includes(filters.error_code)
      );
    }

    if (typeof filters.updated_within_years === 'number' && filters.updated_within_years > 0) {
      const now = new Date();
      const cutoff = new Date(
        now.getFullYear() - filters.updated_within_years,
        now.getMonth(),
        now.getDate()
      );
      list = list.filter((a) => a.updated_at && new Date(a.updated_at) >= cutoff);
    }

    if (sort_by === 'newest_first') {
      list.sort((a, b) => {
        const da = a.updated_at ? new Date(a.updated_at).getTime() : 0;
        const db = b.updated_at ? new Date(b.updated_at).getTime() : 0;
        return db - da;
      });
    } else if (sort_by === 'relevance' && q) {
      list.sort((a, b) => {
        const at = (a.title || '').toLowerCase().includes(q) ? 1 : 0;
        const bt = (b.title || '').toLowerCase().includes(q) ? 1 : 0;
        if (at !== bt) return bt - at;
        const as = (a.snippet || '').toLowerCase().includes(q) ? 1 : 0;
        const bs = (b.snippet || '').toLowerCase().includes(q) ? 1 : 0;
        return bs - as;
      });
    }

    const total_count = list.length;
    const startIndex = (page - 1) * page_size;
    const endIndex = startIndex + page_size;
    const pageArticles = list.slice(startIndex, endIndex);

    return {
      articles: pageArticles,
      total_count,
      page,
      page_size
    };
  }

  // getSupportArticleDetail(support_article_id)
  getSupportArticleDetail(support_article_id) {
    const articles = this._getFromStorage('support_articles', []);
    return articles.find((a) => a.id === support_article_id) || null;
  }

  // saveSupportArticleToMySupportDocs(support_article_id)
  saveSupportArticleToMySupportDocs(support_article_id) {
    const items = this._getOrCreateMySupportDocs();
    const existing = items.find((i) => i.support_article_id === support_article_id);
    if (existing) {
      return {
        success: true,
        my_support_doc_item_id: existing.id
      };
    }

    const item = {
      id: this._generateId('msd'),
      support_article_id,
      saved_at: this._nowIso()
    };

    const newItems = items.concat([item]);
    this._saveToStorage('my_support_docs', newItems);

    return {
      success: true,
      my_support_doc_item_id: item.id
    };
  }

  // getMySupportDocs()
  getMySupportDocs() {
    const items = this._getFromStorage('my_support_docs', []);
    const articles = this._getFromStorage('support_articles', []);

    return items.map((i) => {
      const support_article = articles.find((a) => a.id === i.support_article_id) || null;
      return {
        my_support_doc_item_id: i.id,
        support_article,
        saved_at: i.saved_at
      };
    });
  }

  // removeMySupportDocItem(my_support_doc_item_id)
  removeMySupportDocItem(my_support_doc_item_id) {
    const items = this._getFromStorage('my_support_docs', []);
    const newItems = items.filter((i) => i.id !== my_support_doc_item_id);
    this._saveToStorage('my_support_docs', newItems);
    return { success: true };
  }

  // searchMySupportDocs(query, product_line)
  searchMySupportDocs(query, product_line) {
    const q = (query || '').toLowerCase();
    const items = this._getFromStorage('my_support_docs', []);
    const articles = this._getFromStorage('support_articles', []);

    const mapped = items.map((i) => {
      const support_article = articles.find((a) => a.id === i.support_article_id) || null;
      return {
        my_support_doc_item_id: i.id,
        support_article,
        saved_at: i.saved_at
      };
    });

    return mapped.filter(({ support_article }) => {
      if (!support_article) return false;
      if (product_line && support_article.product_line !== product_line) return false;
      if (!q) return true;
      const title = (support_article.title || '').toLowerCase();
      const snippet = (support_article.snippet || '').toLowerCase();
      const content = (support_article.content || '').toLowerCase();
      const tags = Array.isArray(support_article.tags)
        ? support_article.tags.join(' ').toLowerCase()
        : '';
      return (
        title.includes(q) ||
        snippet.includes(q) ||
        content.includes(q) ||
        tags.includes(q)
      );
    });
  }

  // getWorkflowIntegratorOptions()
  getWorkflowIntegratorOptions() {
    const products = this._getFromStorage('products', []);
    const modules = this._getFromStorage('system_modules', []);

    const appSet = new Set();
    const moduleTypeSet = new Set();

    for (const p of products) {
      if (p.product_type === 'integrated_system' && p.system_application) {
        appSet.add(p.system_application);
      }
    }

    for (const m of modules) {
      if (m.module_type) moduleTypeSet.add(m.module_type);
    }

    return {
      applications: Array.from(appSet),
      module_types: Array.from(moduleTypeSet),
      default_max_budget_usd: 250000,
      default_max_system_length_m: 3
    };
  }

  // generateIntegratedSystemConfigurations(application, required_modules, max_total_price_usd, max_system_length_m, sort_by)
  generateIntegratedSystemConfigurations(
    application,
    required_modules,
    max_total_price_usd,
    max_system_length_m,
    sort_by
  ) {
    let products = this._getFromStorage('products', []);
    const modules = this._getFromStorage('system_modules', []);

    // If no integrated system products exist but system modules are defined, synthesize a simple system product
    if (!products.some((p) => p.product_type === 'integrated_system') && modules.length) {
      const existingIds = new Set(products.map((p) => p.id));
      const parentIds = Array.from(
        new Set(modules.map((m) => m.parent_system_product_id).filter((id) => !!id))
      );

      for (const parentId of parentIds) {
        if (existingIds.has(parentId)) continue;
        const sysModules = modules.filter((m) => m.parent_system_product_id === parentId);
        const totalLength = sysModules.reduce((sum, m) => sum + (m.length_m || 0), 0);

        const systemProduct = {
          id: parentId,
          name: sysModules[0]?.name
            ? sysModules[0].name.replace(/ Liquid Handler.*/, ' Integrated System')
            : parentId,
          sku: parentId.toUpperCase(),
          product_type: 'integrated_system',
          category_slug: 'integrated_systems',
          short_description: 'Auto-generated integrated workflow system based on available modules.',
          long_description: 'This integrated system was auto-generated from system modules for workflow configuration.',
          status: 'active',
          price_usd: typeof max_total_price_usd === 'number' ? max_total_price_usd : 250000,
          currency: 'USD',
          system_application: application || null,
          system_length_m: totalLength || max_system_length_m || 3,
          throughput_score: 50
        };

        products.push(systemProduct);
      }

      this._saveToStorage('products', products);
    }

    const systems = products.filter(
      (p) =>
        p.product_type === 'integrated_system' &&
        p.system_application === application &&
        (typeof p.price_usd === 'number' ? p.price_usd <= max_total_price_usd : true) &&
        (typeof p.system_length_m === 'number' ? p.system_length_m <= max_system_length_m : true)
    );

    const requiredSet = new Set(required_modules || []);

    const configs = systems.filter((sys) => {
      const sysModules = modules.filter((m) => m.parent_system_product_id === sys.id);
      const moduleTypes = new Set(sysModules.map((m) => m.module_type));
      for (const req of requiredSet) {
        if (!moduleTypes.has(req)) return false;
      }
      return true;
    });

    const mapped = configs.map((sys) => ({
      system_product_id: sys.id,
      name: sys.name,
      price_usd: sys.price_usd,
      system_length_m: sys.system_length_m,
      throughput_score: sys.throughput_score || 0
    }));

    if (sort_by === 'throughput_high_to_low') {
      mapped.sort((a, b) => (b.throughput_score || 0) - (a.throughput_score || 0));
    } else if (sort_by === 'price_low_to_high') {
      mapped.sort((a, b) => (a.price_usd || 0) - (b.price_usd || 0));
    }

    return mapped;
  }

  // getEventFilterOptions()
  getEventFilterOptions() {
    const events = this._getFromStorage('events', []);
    const formatSet = new Set();
    const topicSet = new Set();

    for (const e of events) {
      if (e.format) formatSet.add(e.format);
      if (e.topic) topicSet.add(e.topic);
    }

    return {
      formats: Array.from(formatSet),
      topics: Array.from(topicSet)
    };
  }

  // listEvents(filters, sort_by, page, page_size)
  listEvents(filters, sort_by, page, page_size) {
    const events = this._getFromStorage('events', []);
    filters = filters || {};
    sort_by = sort_by || 'start_date_asc';
    page = page || 1;
    page_size = page_size || 20;

    let list = events.slice();

    if (filters.format) {
      list = list.filter((e) => e.format === filters.format);
    }

    if (filters.topic) {
      list = list.filter((e) => e.topic === filters.topic);
    }

    list = this._filterEventsByDateRange(
      list,
      filters.start_date_from || null,
      filters.start_date_to || null,
      null
    );

    if (sort_by === 'start_date_asc') {
      list.sort((a, b) => {
        const da = a.start_date ? new Date(a.start_date).getTime() : 0;
        const db = b.start_date ? new Date(b.start_date).getTime() : 0;
        return da - db;
      });
    } else if (sort_by === 'featured_first') {
      list.sort((a, b) => {
        const fa = a.is_featured ? 1 : 0;
        const fb = b.is_featured ? 1 : 0;
        if (fa !== fb) return fb - fa;
        const da = a.start_date ? new Date(a.start_date).getTime() : 0;
        const db = b.start_date ? new Date(b.start_date).getTime() : 0;
        return da - db;
      });
    }

    const total_count = list.length;
    const startIndex = (page - 1) * page_size;
    const endIndex = startIndex + page_size;
    const pageEvents = list.slice(startIndex, endIndex);

    return {
      events: pageEvents,
      total_count,
      page,
      page_size
    };
  }

  // getEventDetails(event_id)
  getEventDetails(event_id) {
    const events = this._getFromStorage('events', []);
    const sessions = this._getFromStorage('event_sessions', []);

    const event = events.find((e) => e.id === event_id) || null;
    const eventSessions = sessions
      .filter((s) => s.event_id === event_id)
      .map((s) => ({
        ...s,
        // foreign key resolution
        event
      }));

    return {
      event,
      sessions: eventSessions
    };
  }

  // registerForEventSession(event_id, session_id, name, email, organization, timezone)
  registerForEventSession(event_id, session_id, name, email, organization, timezone) {
    const events = this._getFromStorage('events', []);
    const sessions = this._getFromStorage('event_sessions', []);
    const registrations = this._getFromStorage('event_registrations', []);

    const event = events.find((e) => e.id === event_id) || null;
    const session = sessions.find((s) => s.id === session_id && s.event_id === event_id) || null;

    if (!event || !session) {
      return {
        event_registration_id: null,
        success: false,
        message: 'Event or session not found.'
      };
    }

    if (session.is_full) {
      return {
        event_registration_id: null,
        success: false,
        message: 'Session is full.'
      };
    }

    const registration = {
      id: this._generateId('reg'),
      event_id,
      session_id,
      name,
      email,
      organization: organization || null,
      timezone: timezone || null,
      registered_at: this._nowIso()
    };

    registrations.push(registration);
    this._saveToStorage('event_registrations', registrations);

    return {
      event_registration_id: registration.id,
      success: true,
      message: 'Registered for event session.'
    };
  }

  // getCompanyInfo()
  getCompanyInfo() {
    const info = this._getFromStorage('company_info', null);
    if (!info) {
      return {
        mission: '',
        overview: '',
        contact_email: '',
        contact_phone: ''
      };
    }
    return info;
  }

  // submitContactInquiry(name, email, organization, subject, message)
  submitContactInquiry(name, email, organization, subject, message) {
    const inquiries = this._getFromStorage('contact_inquiries', []);

    const inquiry = {
      id: this._generateId('ci'),
      name,
      email,
      organization: organization || null,
      subject: subject || null,
      message,
      created_at: this._nowIso()
    };

    inquiries.push(inquiry);
    this._saveToStorage('contact_inquiries', inquiries);

    return {
      success: true,
      message: 'Inquiry submitted.'
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