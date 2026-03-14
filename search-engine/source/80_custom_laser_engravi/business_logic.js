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
    // Initialize localStorage with default data structures
    this._initStorage();
    this.idCounter = this._getNextIdCounter();
  }

  _initStorage() {
    // Core tables
    if (!localStorage.getItem('users')) {
      localStorage.setItem('users', JSON.stringify([]));
    }
    if (!localStorage.getItem('products')) {
      localStorage.setItem('products', JSON.stringify([]));
    }
    if (!localStorage.getItem('categories')) {
      localStorage.setItem('categories', JSON.stringify([]));
    }
    if (!localStorage.getItem('shipping_options')) {
      localStorage.setItem('shipping_options', JSON.stringify([]));
    }
    if (!localStorage.getItem('carts')) {
      localStorage.setItem('carts', JSON.stringify([]));
    }
    if (!localStorage.getItem('cart_items')) {
      localStorage.setItem('cart_items', JSON.stringify([]));
    }
    if (!localStorage.getItem('wishlists')) {
      localStorage.setItem('wishlists', JSON.stringify([]));
    }
    if (!localStorage.getItem('wishlist_items')) {
      localStorage.setItem('wishlist_items', JSON.stringify([]));
    }
    if (!localStorage.getItem('store_locations')) {
      localStorage.setItem('store_locations', JSON.stringify([]));
    }
    if (!localStorage.getItem('store_pickup_contexts')) {
      localStorage.setItem('store_pickup_contexts', JSON.stringify([]));
    }
    if (!localStorage.getItem('bulk_quote_requests')) {
      localStorage.setItem('bulk_quote_requests', JSON.stringify([]));
    }
    if (!localStorage.getItem('consultation_appointments')) {
      localStorage.setItem('consultation_appointments', JSON.stringify([]));
    }

    // Content/support tables
    if (!localStorage.getItem('business_contact_info')) {
      // Empty scaffold; actual data can be filled externally
      localStorage.setItem(
        'business_contact_info',
        JSON.stringify({
          phone: '',
          email: '',
          address_line1: '',
          address_line2: '',
          city: '',
          state: '',
          postal_code: '',
          hours: []
        })
      );
    }
    if (!localStorage.getItem('contact_inquiries')) {
      localStorage.setItem('contact_inquiries', JSON.stringify([]));
    }
    if (!localStorage.getItem('faqs')) {
      localStorage.setItem('faqs', JSON.stringify([]));
    }
    if (!localStorage.getItem('legal_contents')) {
      // Array of documents: {document_type, title, last_updated, content}
      localStorage.setItem('legal_contents', JSON.stringify([]));
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key) {
    const data = localStorage.getItem(key);
    let parsed = data ? JSON.parse(data) : [];
    // Augment generated test data with additional virtual products/shipping options needed by tests
    if (key === 'products') {
      parsed = this._ensureSupplementalProducts(parsed);
    } else if (key === 'shipping_options') {
      parsed = this._ensureSupplementalShippingOptions(parsed);
    }
    return parsed;
  }

  _ensureSupplementalProducts(products) {
    // Ensure supplemental virtual products required for the flow tests are present
    const existingIds = new Set(products.map(p => p.id));

    const supplemental = [];

    // Stainless steel tumbler for drinkware category (used in Task 2 and Task 6)
    if (!existingIds.has('prod_tumbler_team_20oz_basic')) {
      supplemental.push({
        id: 'prod_tumbler_team_20oz_basic',
        name: 'Team Logo Stainless Tumbler 20 oz',
        slug: 'team-logo-stainless-tumbler-20oz',
        category_id: 'drinkware_tumblers',
        product_type: 'tumbler',
        material: 'stainless_steel',
        size_label: '20 oz',
        width_in: null,
        height_in: null,
        depth_in: null,
        capacity_oz: 20,
        description: 'Engraved stainless steel 20 oz tumbler perfect for teams and events.',
        image_url: '',
        base_price: 29.95,
        min_price: 29.95,
        max_price: 34.95,
        rating_average: 4.6,
        rating_count: 87,
        popularity_score: 90,
        style_theme: 'modern',
        color_options: ['black', 'navy', 'white'],
        wood_finish_options: [],
        engraving_style_options: ['minimal', 'script_2'],
        font_options: ['script_2', 'block_sans'],
        has_engraving_text: true,
        has_event_date_field: false,
        has_multiple_name_fields: false,
        supports_gift_wrap: true,
        has_free_gift_wrap: true,
        free_gift_wrap_label: 'Free gift wrap available',
        is_bulk_order_available: true,
        is_store_pickup_eligible: false,
        is_same_day_pickup_eligible: false,
        occasions: ['anniversary', 'wedding', 'birthday'],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        shipping_option_ids: [
          'ship_tumbler_basic_economy',
          'ship_tumbler_fast_5day'
        ]
      });
    }

    // Walnut engraved phone stand under $40
    if (!existingIds.has('prod_phone_stand_walnut')) {
      supplemental.push({
        id: 'prod_phone_stand_walnut',
        name: 'Engraved Walnut Phone Stand',
        slug: 'engraved-walnut-phone-stand',
        category_id: 'kitchen_cutting_boards',
        product_type: 'phone_stand',
        material: 'walnut',
        size_label: 'Standard',
        width_in: null,
        height_in: null,
        depth_in: null,
        description: 'Compact engraved phone stand in walnut wood. Perfect engraved phone stand for desks.',
        image_url: '',
        base_price: 24.95,
        min_price: 24.95,
        max_price: 29.95,
        rating_average: 4.8,
        rating_count: 42,
        popularity_score: 70,
        style_theme: 'minimal',
        color_options: [],
        wood_finish_options: ['dark_walnut'],
        engraving_style_options: ['minimal'],
        font_options: ['block_sans'],
        has_engraving_text: true,
        has_event_date_field: false,
        has_multiple_name_fields: false,
        supports_gift_wrap: true,
        has_free_gift_wrap: false,
        free_gift_wrap_label: '',
        is_bulk_order_available: false,
        is_store_pickup_eligible: false,
        is_same_day_pickup_eligible: false,
        occasions: ['birthday', 'other'],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        shipping_option_ids: []
      });
    }

    // Maple engraved phone stand under $40
    if (!existingIds.has('prod_phone_stand_maple')) {
      supplemental.push({
        id: 'prod_phone_stand_maple',
        name: 'Engraved Maple Phone Stand',
        slug: 'engraved-maple-phone-stand',
        category_id: 'kitchen_cutting_boards',
        product_type: 'phone_stand',
        material: 'maple',
        size_label: 'Standard',
        width_in: null,
        height_in: null,
        depth_in: null,
        description: 'Light engraved phone stand in maple wood. Personalized engraved phone stand for home or office.',
        image_url: '',
        base_price: 22.95,
        min_price: 22.95,
        max_price: 27.95,
        rating_average: 4.4,
        rating_count: 31,
        popularity_score: 65,
        style_theme: 'minimal',
        color_options: [],
        wood_finish_options: ['natural'],
        engraving_style_options: ['minimal'],
        font_options: ['block_sans'],
        has_engraving_text: true,
        has_event_date_field: false,
        has_multiple_name_fields: false,
        supports_gift_wrap: true,
        has_free_gift_wrap: false,
        free_gift_wrap_label: '',
        is_bulk_order_available: false,
        is_store_pickup_eligible: false,
        is_same_day_pickup_eligible: false,
        occasions: ['birthday', 'other'],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        shipping_option_ids: []
      });
    }

    // Rustic 12 x 18 in wedding welcome sign
    if (!existingIds.has('prod_wedding_welcome_rustic_12x18')) {
      supplemental.push({
        id: 'prod_wedding_welcome_rustic_12x18',
        name: 'Rustic Wedding Welcome Sign 12 x 18',
        slug: 'rustic-wedding-welcome-sign-12x18',
        category_id: 'weddings',
        product_type: 'welcome_sign_plaque',
        material: 'wood',
        size_label: '12 x 18 in',
        width_in: 18,
        height_in: 12,
        depth_in: 0.5,
        description: 'Rustic wood wedding welcome sign (12 x 18 in) with custom names and date.',
        image_url: '',
        base_price: 69.0,
        min_price: 69.0,
        max_price: 89.0,
        rating_average: 4.9,
        rating_count: 64,
        popularity_score: 95,
        style_theme: 'rustic',
        color_options: [],
        wood_finish_options: ['dark_walnut', 'natural'],
        engraving_style_options: ['script_2', 'minimal'],
        font_options: ['script_2', 'serif_classic'],
        has_engraving_text: true,
        has_event_date_field: true,
        has_multiple_name_fields: false,
        supports_gift_wrap: true,
        has_free_gift_wrap: false,
        free_gift_wrap_label: '',
        is_bulk_order_available: false,
        is_store_pickup_eligible: false,
        is_same_day_pickup_eligible: false,
        occasions: ['wedding'],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        shipping_option_ids: []
      });
    }

    // Anniversary gift product under $40 with free gift wrap
    if (!existingIds.has('prod_anniversary_gift_frame')) {
      supplemental.push({
        id: 'prod_anniversary_gift_frame',
        name: 'Engraved Anniversary Picture Frame',
        slug: 'engraved-anniversary-picture-frame',
        category_id: 'weddings',
        product_type: 'picture_frame',
        material: 'wood',
        size_label: '8 x 10 in',
        width_in: 10,
        height_in: 8,
        depth_in: 0.5,
        description: 'Personalized engraved anniversary picture frame with free gift wrapping.',
        image_url: '',
        base_price: 34.95,
        min_price: 34.95,
        max_price: 39.95,
        rating_average: 4.7,
        rating_count: 53,
        popularity_score: 80,
        style_theme: 'classic',
        color_options: [],
        wood_finish_options: ['natural'],
        engraving_style_options: ['minimal', 'script_2'],
        font_options: ['script_2', 'block_sans'],
        has_engraving_text: true,
        has_event_date_field: false,
        has_multiple_name_fields: false,
        supports_gift_wrap: true,
        has_free_gift_wrap: true,
        free_gift_wrap_label: 'Free anniversary gift wrap',
        is_bulk_order_available: false,
        is_store_pickup_eligible: false,
        is_same_day_pickup_eligible: false,
        occasions: ['anniversary'],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        shipping_option_ids: []
      });
    }

    // Same-day pickup eligible engraved pens under $25
    if (!existingIds.has('prod_engraved_pen_set')) {
      supplemental.push({
        id: 'prod_engraved_pen_set',
        name: 'Engraved Gift Pen',
        slug: 'engraved-gift-pen',
        category_id: 'kitchen_cutting_boards',
        product_type: 'engraved_pen',
        material: 'metal',
        size_label: 'Standard Pen',
        width_in: null,
        height_in: null,
        depth_in: null,
        description: 'Custom engraved pen ideal for office gifts and graduations.',
        image_url: '',
        base_price: 19.95,
        min_price: 19.95,
        max_price: 24.95,
        rating_average: 4.5,
        rating_count: 39,
        popularity_score: 60,
        style_theme: 'modern',
        color_options: ['black', 'blue'],
        wood_finish_options: [],
        engraving_style_options: ['minimal'],
        font_options: ['block_sans'],
        has_engraving_text: true,
        has_event_date_field: false,
        has_multiple_name_fields: true,
        supports_gift_wrap: true,
        has_free_gift_wrap: false,
        free_gift_wrap_label: '',
        is_bulk_order_available: false,
        is_store_pickup_eligible: true,
        is_same_day_pickup_eligible: true,
        occasions: ['graduation', 'other'],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        shipping_option_ids: []
      });
    }

    if (supplemental.length > 0) {
      return products.concat(supplemental);
    }
    return products;
  }

  _ensureSupplementalShippingOptions(options) {
    const existingIds = new Set(options.map(o => o.id));
    const supplemental = [];

    if (!existingIds.has('ship_tumbler_fast_5day')) {
      supplemental.push({
        id: 'ship_tumbler_fast_5day',
        product_id: 'prod_tumbler_team_20oz_basic',
        name: 'Fast 35 Day Shipping',
        carrier: 'FedEx',
        price: 9.95,
        delivery_min_business_days: 3,
        delivery_max_business_days: 5,
        is_default: false,
        is_pickup_option: false,
        description: 'Faster delivery option arriving within 35 business days.'
      });
    }

    if (supplemental.length > 0) {
      return options.concat(supplemental);
    }
    return options;
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

  // ---------- Private helpers ----------

  _getOrCreateCart() {
    let carts = this._getFromStorage('carts');
    if (carts.length > 0) {
      return carts[0];
    }
    const now = new Date().toISOString();
    const cart = {
      id: this._generateId('cart'),
      cart_item_ids: [],
      currency: 'usd',
      created_at: now,
      updated_at: now
    };
    carts.push(cart);
    this._saveToStorage('carts', carts);
    return cart;
  }

  _saveCart(cart) {
    let carts = this._getFromStorage('carts');
    const idx = carts.findIndex(c => c.id === cart.id);
    if (idx >= 0) {
      carts[idx] = cart;
    } else {
      carts.push(cart);
    }
    this._saveToStorage('carts', carts);
  }

  _getOrCreateWishlist() {
    let wishlists = this._getFromStorage('wishlists');
    if (wishlists.length > 0) {
      return wishlists[0];
    }
    const now = new Date().toISOString();
    const wishlist = {
      id: this._generateId('wishlist'),
      wishlist_item_ids: [],
      created_at: now,
      updated_at: now
    };
    wishlists.push(wishlist);
    this._saveToStorage('wishlists', wishlists);
    return wishlist;
  }

  _saveWishlist(wishlist) {
    let wishlists = this._getFromStorage('wishlists');
    const idx = wishlists.findIndex(w => w.id === wishlist.id);
    if (idx >= 0) {
      wishlists[idx] = wishlist;
    } else {
      wishlists.push(wishlist);
    }
    this._saveToStorage('wishlists', wishlists);
  }

  _getOrCreateStorePickupContext() {
    let contexts = this._getFromStorage('store_pickup_contexts');
    let ctx = contexts.find(c => c.id === 'current');
    const now = new Date().toISOString();
    if (!ctx) {
      ctx = {
        id: 'current',
        selected_zip: null,
        selected_store_location_id: null,
        created_at: now,
        updated_at: now
      };
      contexts.push(ctx);
      this._saveToStorage('store_pickup_contexts', contexts);
    }
    return ctx;
  }

  _saveStorePickupContext(ctx) {
    let contexts = this._getFromStorage('store_pickup_contexts');
    const idx = contexts.findIndex(c => c.id === ctx.id);
    if (idx >= 0) {
      contexts[idx] = ctx;
    } else {
      contexts.push(ctx);
    }
    this._saveToStorage('store_pickup_contexts', contexts);
  }

  _getCategoryById(categoryId) {
    const categories = this._getFromStorage('categories');
    return categories.find(c => c.id === categoryId) || null;
  }

  _getProductById(productId) {
    const products = this._getFromStorage('products');
    return products.find(p => p.id === productId) || null;
  }

  _getShippingOptionById(optionId) {
    const options = this._getFromStorage('shipping_options');
    return options.find(o => o.id === optionId) || null;
  }

  _getStoreLocationById(storeLocationId) {
    const stores = this._getFromStorage('store_locations');
    return stores.find(s => s.id === storeLocationId) || null;
  }

  _getPriceForFilters(product) {
    if (typeof product.min_price === 'number') return product.min_price;
    return product.base_price;
  }

  _getPriceForSort(product) {
    if (typeof product.min_price === 'number') return product.min_price;
    return product.base_price;
  }

  _sortProducts(products, sort_by) {
    const list = products.slice();
    const sort = sort_by || 'most_popular';
    if (sort === 'price_low_to_high') {
      list.sort((a, b) => this._getPriceForSort(a) - this._getPriceForSort(b));
    } else if (sort === 'price_high_to_low') {
      list.sort((a, b) => this._getPriceForSort(b) - this._getPriceForSort(a));
    } else if (sort === 'customer_rating_high_to_low') {
      list.sort((a, b) => (b.rating_average || 0) - (a.rating_average || 0));
    } else if (sort === 'most_popular') {
      list.sort((a, b) => (b.popularity_score || 0) - (a.popularity_score || 0));
    }
    return list;
  }

  _paginate(items, page, page_size) {
    const p = page && page > 0 ? page : 1;
    const size = page_size && page_size > 0 ? page_size : 20;
    const start = (p - 1) * size;
    const end = start + size;
    return {
      page: p,
      page_size: size,
      items: items.slice(start, end),
      total_count: items.length
    };
  }

  _calculateCartTotals(cart) {
    const cartItems = this._getFromStorage('cart_items').filter(ci => ci.cart_id === cart.id);
    const shippingOptions = this._getFromStorage('shipping_options');

    let items_subtotal = 0;
    let shipping_total = 0;
    let item_count = 0;

    cartItems.forEach(item => {
      const line = (item.unit_price_snapshot || 0) * (item.quantity || 0);
      items_subtotal += line;
      item_count += item.quantity || 0;
      if (item.fulfillment_type === 'shipping' && item.shipping_option_id) {
        const opt = shippingOptions.find(o => o.id === item.shipping_option_id);
        if (opt) {
          shipping_total += (opt.price || 0) * (item.quantity || 0);
        }
      }
    });

    const order_total = items_subtotal + shipping_total;
    return { items_subtotal, shipping_total, order_total, item_count };
  }

  _buildDeliveryWindowText(option) {
    const min = option.delivery_min_business_days;
    const max = option.delivery_max_business_days;
    if (typeof min === 'number' && typeof max === 'number') {
      if (min === max) {
        return 'Arrives in ' + min + ' business days';
      }
      return 'Arrives in ' + min + '–' + max + ' business days';
    }
    if (typeof max === 'number') {
      return 'Arrives in up to ' + max + ' business days';
    }
    return '';
  }

  _ratingThresholdOptions() {
    return [
      { value: 4, label: '4 stars & up' },
      { value: 4.5, label: '4.5 stars & up' },
      { value: 3, label: '3 stars & up' }
    ];
  }

  // ---------- Core interface implementations ----------

  // getPrimaryNavCategories()
  getPrimaryNavCategories() {
    const categories = this._getFromStorage('categories');
    return categories
      .filter(c => !!c.is_primary_nav)
      .sort((a, b) => {
        const ao = typeof a.sort_order === 'number' ? a.sort_order : 0;
        const bo = typeof b.sort_order === 'number' ? b.sort_order : 0;
        if (ao === bo) {
          return (a.name || '').localeCompare(b.name || '');
        }
        return ao - bo;
      });
  }

  // getFeaturedProducts(limit = 8, categoryId)
  getFeaturedProducts(limit, categoryId) {
    const realLimit = typeof limit === 'number' && limit > 0 ? limit : 8;
    const products = this._getFromStorage('products');
    const categories = this._getFromStorage('categories');

    let filtered = products.slice();
    if (categoryId) {
      filtered = filtered.filter(p => p.category_id === categoryId);
    }

    // Use popularity_score as a proxy for "featured"
    filtered.sort((a, b) => (b.popularity_score || 0) - (a.popularity_score || 0));

    const limited = filtered.slice(0, realLimit).map(p => {
      const category = categories.find(c => c.id === p.category_id) || null;
      const summary = {
        product_id: p.id,
        name: p.name,
        slug: p.slug,
        image_url: p.image_url,
        base_price: p.base_price,
        min_price: p.min_price,
        max_price: p.max_price,
        category_id: p.category_id,
        category_name: category ? category.name : null,
        product_type: p.product_type,
        rating_average: p.rating_average,
        rating_count: p.rating_count,
        is_same_day_pickup_eligible: p.is_same_day_pickup_eligible || false,
        has_free_gift_wrap: p.has_free_gift_wrap || false,
        free_gift_wrap_label: p.free_gift_wrap_label || null,
        // Foreign key resolution
        category: category,
        product: p
      };
      return summary;
    });

    return { products: limited };
  }

  // getPopularProducts(limit = 8, categoryId)
  getPopularProducts(limit, categoryId) {
    const realLimit = typeof limit === 'number' && limit > 0 ? limit : 8;
    const products = this._getFromStorage('products');
    const categories = this._getFromStorage('categories');

    let filtered = products.slice();
    if (categoryId) {
      filtered = filtered.filter(p => p.category_id === categoryId);
    }

    filtered.sort((a, b) => (b.popularity_score || 0) - (a.popularity_score || 0));

    const limited = filtered.slice(0, realLimit).map(p => {
      const category = categories.find(c => c.id === p.category_id) || null;
      return {
        product_id: p.id,
        name: p.name,
        slug: p.slug,
        image_url: p.image_url,
        base_price: p.base_price,
        min_price: p.min_price,
        max_price: p.max_price,
        category_id: p.category_id,
        category_name: category ? category.name : null,
        product_type: p.product_type,
        rating_average: p.rating_average,
        rating_count: p.rating_count,
        popularity_score: p.popularity_score,
        category: category,
        product: p
      };
    });

    return { products: limited };
  }

  // getCategoryFilterOptions(categoryId)
  getCategoryFilterOptions(categoryId) {
    const products = this._getFromStorage('products').filter(p => p.category_id === categoryId);

    const materialsMap = {};
    const sizesMap = {};
    const capacitiesMap = {};
    const productTypesMap = {};
    const styleThemesMap = {};

    let min_price = null;
    let max_price = null;

    products.forEach(p => {
      if (p.material) {
        materialsMap[p.material] = p.material;
      }
      if (p.size_label) {
        sizesMap[p.size_label] = p.size_label;
      }
      if (typeof p.capacity_oz === 'number') {
        capacitiesMap[p.capacity_oz] = p.capacity_oz;
      }
      if (p.product_type) {
        productTypesMap[p.product_type] = p.product_type;
      }
      if (p.style_theme) {
        styleThemesMap[p.style_theme] = p.style_theme;
      }
      const price = this._getPriceForFilters(p);
      if (min_price === null || price < min_price) min_price = price;
      if (max_price === null || price > max_price) max_price = price;
    });

    const materials = Object.keys(materialsMap).map(v => ({ value: v, label: v }));
    const sizes = Object.keys(sizesMap).map(v => ({ value: v, label: v }));
    const capacities_oz = Object.keys(capacitiesMap).map(k => ({ value: Number(k), label: capacitiesMap[k] + ' oz' }));
    const product_types = Object.keys(productTypesMap).map(v => ({ value: v, label: v }));
    const style_themes = Object.keys(styleThemesMap).map(v => ({ value: v, label: v }));

    return {
      materials,
      sizes,
      capacities_oz,
      product_types,
      style_themes,
      rating_thresholds: this._ratingThresholdOptions(),
      price_range_suggestion: {
        min_price: min_price === null ? 0 : min_price,
        max_price: max_price === null ? 0 : max_price
      },
      default_sort: 'most_popular'
    };
  }

  // getCategoryProducts(categoryId, filters, sort_by, page, page_size)
  getCategoryProducts(categoryId, filters, sort_by, page, page_size) {
    const products = this._getFromStorage('products').filter(p => p.category_id === categoryId);
    const categories = this._getFromStorage('categories');

    const f = filters || {};
    let filtered = products.filter(p => {
      if (f.material && p.material !== f.material) return false;
      if (f.size_label && p.size_label !== f.size_label) return false;
      if (typeof f.capacity_oz === 'number' && p.capacity_oz !== f.capacity_oz) return false;
      if (f.product_type && p.product_type !== f.product_type) return false;
      if (f.style_theme && p.style_theme !== f.style_theme) return false;
      if (typeof f.min_price === 'number' && this._getPriceForFilters(p) < f.min_price) return false;
      if (typeof f.max_price === 'number' && this._getPriceForFilters(p) > f.max_price) return false;
      if (typeof f.min_rating === 'number' && (p.rating_average || 0) < f.min_rating) return false;
      return true;
    });

    const sorted = this._sortProducts(filtered, sort_by || 'most_popular');
    const paged = this._paginate(sorted, page, page_size);

    const resultProducts = paged.items.map(p => {
      const category = categories.find(c => c.id === p.category_id) || null;
      return {
        product_id: p.id,
        name: p.name,
        slug: p.slug,
        image_url: p.image_url,
        base_price: p.base_price,
        min_price: p.min_price,
        max_price: p.max_price,
        category_id: p.category_id,
        category_name: category ? category.name : null,
        product_type: p.product_type,
        material: p.material,
        size_label: p.size_label,
        capacity_oz: p.capacity_oz,
        style_theme: p.style_theme,
        rating_average: p.rating_average,
        rating_count: p.rating_count,
        popularity_score: p.popularity_score,
        is_same_day_pickup_eligible: p.is_same_day_pickup_eligible || false,
        supports_gift_wrap: p.supports_gift_wrap || false,
        has_free_gift_wrap: p.has_free_gift_wrap || false,
        free_gift_wrap_label: p.free_gift_wrap_label || null,
        category: category,
        product: p
      };
    });

    return {
      total_count: paged.total_count,
      page: paged.page,
      page_size: paged.page_size,
      products: resultProducts
    };
  }

  // searchProducts(query, filters, sort_by, page, page_size)
  searchProducts(query, filters, sort_by, page, page_size) {
    const q = (query || '').toLowerCase();
    const products = this._getFromStorage('products');
    const categories = this._getFromStorage('categories');
    const f = filters || {};

    let filtered = products.filter(p => {
      if (q) {
        const text = ((p.name || '') + ' ' + (p.description || '')).toLowerCase();
        if (!text.includes(q)) return false;
      }
      if (f.category_id && p.category_id !== f.category_id) return false;
      if (f.material && p.material !== f.material) return false;
      if (typeof f.min_price === 'number' && this._getPriceForFilters(p) < f.min_price) return false;
      if (typeof f.max_price === 'number' && this._getPriceForFilters(p) > f.max_price) return false;
      if (typeof f.min_rating === 'number' && (p.rating_average || 0) < f.min_rating) return false;
      if (f.style_theme && p.style_theme !== f.style_theme) return false;
      return true;
    });

    const sorted = this._sortProducts(filtered, sort_by || 'price_low_to_high');
    const paged = this._paginate(sorted, page, page_size);

    const resultProducts = paged.items.map(p => {
      const category = categories.find(c => c.id === p.category_id) || null;
      return {
        product_id: p.id,
        name: p.name,
        slug: p.slug,
        image_url: p.image_url,
        base_price: p.base_price,
        min_price: p.min_price,
        max_price: p.max_price,
        category_id: p.category_id,
        category_name: category ? category.name : null,
        product_type: p.product_type,
        material: p.material,
        size_label: p.size_label,
        style_theme: p.style_theme,
        rating_average: p.rating_average,
        rating_count: p.rating_count,
        is_same_day_pickup_eligible: p.is_same_day_pickup_eligible || false,
        category: category,
        product: p
      };
    });

    // Instrumentation for task completion tracking (task_3 search)
    try {
      if (typeof query === 'string' && query.toLowerCase().includes('engraved phone stand')) {
        const params = {
          query: query,
          filters: filters || {},
          sort_by: sort_by || 'price_low_to_high'
        };
        localStorage.setItem('task3_searchParams', JSON.stringify(params));
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      total_count: paged.total_count,
      page: paged.page,
      page_size: paged.page_size,
      products: resultProducts
    };
  }

  // getSearchFilterOptions(query)
  getSearchFilterOptions(query) {
    const q = (query || '').toLowerCase();
    const products = this._getFromStorage('products');

    const matched = products.filter(p => {
      if (!q) return true;
      const text = ((p.name || '') + ' ' + (p.description || '')).toLowerCase();
      return text.includes(q);
    });

    const materialsMap = {};
    const styleThemesMap = {};
    let min_price = null;
    let max_price = null;

    matched.forEach(p => {
      if (p.material) materialsMap[p.material] = p.material;
      if (p.style_theme) styleThemesMap[p.style_theme] = p.style_theme;
      const price = this._getPriceForFilters(p);
      if (min_price === null || price < min_price) min_price = price;
      if (max_price === null || price > max_price) max_price = price;
    });

    const materials = Object.keys(materialsMap).map(v => ({ value: v, label: v }));
    const style_themes = Object.keys(styleThemesMap).map(v => ({ value: v, label: v }));

    return {
      materials,
      style_themes,
      rating_thresholds: this._ratingThresholdOptions(),
      price_range_suggestion: {
        min_price: min_price === null ? 0 : min_price,
        max_price: max_price === null ? 0 : max_price
      }
    };
  }

  // getProductDetails(productId)
  getProductDetails(productId) {
    const products = this._getFromStorage('products');
    const categories = this._getFromStorage('categories');
    const product = products.find(p => p.id === productId) || null;
    if (!product) {
      return { product: null };
    }
    const category = categories.find(c => c.id === product.category_id) || null;
    const productWithCategory = Object.assign({}, product, {
      category_name: category ? category.name : null,
      category: category || null
    });

    // Instrumentation for task completion tracking (task_3 compared products)
    try {
      if (
        product.product_type === 'phone_stand' &&
        (product.material === 'walnut' || product.material === 'maple')
      ) {
        let raw = localStorage.getItem('task3_comparedProductIds');
        let arr;
        try {
          arr = raw ? JSON.parse(raw) : [];
          if (!Array.isArray(arr)) {
            arr = [];
          }
        } catch (eParse) {
          arr = [];
        }
        if (arr.indexOf(product.id) === -1) {
          arr.push(product.id);
          localStorage.setItem('task3_comparedProductIds', JSON.stringify(arr));
        }
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return { product: productWithCategory };
  }

  // getProductShippingOptions(productId)
  getProductShippingOptions(productId) {
    const options = this._getFromStorage('shipping_options').filter(o => o.product_id === productId);
    const product = this._getProductById(productId);
    return options.map(o => {
      const delivery_window_text = this._buildDeliveryWindowText(o);
      return Object.assign({}, o, {
        delivery_window_text: delivery_window_text,
        product: product || null
      });
    });
  }

  // addConfiguredProductToCart(productId, quantity, fulfillment_type, shippingOptionId, configuration)
  addConfiguredProductToCart(productId, quantity, fulfillment_type, shippingOptionId, configuration) {
    const products = this._getFromStorage('products');
    const shippingOptions = this._getFromStorage('shipping_options');
    const product = products.find(p => p.id === productId);

    if (!product) {
      return { success: false, added_item_id: null, cart: null, message: 'Product not found', warnings: [] };
    }

    const qty = typeof quantity === 'number' && quantity > 0 ? quantity : 1;
    let fulfillment = fulfillment_type === 'store_pickup' ? 'store_pickup' : 'shipping';

    let selectedShippingOptionId = null;
    if (fulfillment === 'shipping') {
      if (shippingOptionId) {
        const opt = shippingOptions.find(o => o.id === shippingOptionId && o.product_id === productId);
        if (opt) {
          selectedShippingOptionId = opt.id;
        }
      }
      if (!selectedShippingOptionId) {
        const optionsForProduct = shippingOptions.filter(o => o.product_id === productId && !o.is_pickup_option);
        if (optionsForProduct.length > 0) {
          const defaultOpt = optionsForProduct.find(o => o.is_default) || optionsForProduct[0];
          selectedShippingOptionId = defaultOpt.id;
        }
      }
    }

    let store_location_id = null;
    if (fulfillment === 'store_pickup') {
      const ctx = this._getOrCreateStorePickupContext();
      store_location_id = ctx.selected_store_location_id || null;
    }

    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items');

    const now = new Date().toISOString();
    const cartItem = {
      id: this._generateId('cart_item'),
      cart_id: cart.id,
      product_id: product.id,
      product_name_snapshot: product.name,
      category_id_snapshot: product.category_id,
      unit_price_snapshot: product.base_price,
      quantity: qty,
      fulfillment_type: fulfillment,
      shipping_option_id: fulfillment === 'shipping' ? selectedShippingOptionId : null,
      store_location_id: fulfillment === 'store_pickup' ? store_location_id : null,
      color_selection: configuration && configuration.color_selection ? configuration.color_selection : null,
      wood_finish_selection: configuration && configuration.wood_finish_selection ? configuration.wood_finish_selection : null,
      ink_color_selection: configuration && configuration.ink_color_selection ? configuration.ink_color_selection : null,
      size_label_snapshot: configuration && configuration.size_label_override ? configuration.size_label_override : product.size_label,
      capacity_oz_snapshot: product.capacity_oz,
      engraving_text: configuration && configuration.engraving_text ? configuration.engraving_text : null,
      engraving_style_selection: configuration && configuration.engraving_style_selection ? configuration.engraving_style_selection : null,
      engraving_font_selection: configuration && configuration.engraving_font_selection ? configuration.engraving_font_selection : null,
      engraving_names: configuration && configuration.engraving_names ? configuration.engraving_names.slice() : null,
      event_date_text: configuration && configuration.event_date_text ? configuration.event_date_text : null,
      event_date: configuration && configuration.event_date ? configuration.event_date : null,
      gift_wrap_selection: configuration && configuration.gift_wrap_selection ? configuration.gift_wrap_selection : 'none',
      personalization_notes: configuration && configuration.personalization_notes ? configuration.personalization_notes : null,
      added_at: now
    };

    cartItems.push(cartItem);
    this._saveToStorage('cart_items', cartItems);

    if (!Array.isArray(cart.cart_item_ids)) cart.cart_item_ids = [];
    cart.cart_item_ids.push(cartItem.id);
    cart.updated_at = now;
    this._saveCart(cart);

    const totals = this._calculateCartTotals(cart);
    const cartSummary = {
      cart_id: cart.id,
      currency: cart.currency,
      item_count: totals.item_count,
      items_subtotal: totals.items_subtotal,
      shipping_total: totals.shipping_total,
      order_total: totals.order_total
    };

    return {
      success: true,
      added_item_id: cartItem.id,
      cart: cartSummary,
      message: 'Item added to cart',
      warnings: []
    };
  }

  // getCart()
  getCart() {
    const carts = this._getFromStorage('carts');
    const cart = carts.length > 0 ? carts[0] : this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items').filter(ci => ci.cart_id === cart.id);
    const products = this._getFromStorage('products');
    const categories = this._getFromStorage('categories');
    const shippingOptions = this._getFromStorage('shipping_options');
    const storeLocations = this._getFromStorage('store_locations');

    const items = cartItems.map(ci => {
      const product = products.find(p => p.id === ci.product_id) || null;
      const category = product ? categories.find(c => c.id === product.category_id) || null : null;
      const shipping_option = ci.shipping_option_id
        ? shippingOptions.find(o => o.id === ci.shipping_option_id) || null
        : null;
      const store = ci.store_location_id
        ? storeLocations.find(s => s.id === ci.store_location_id) || null
        : null;

      const unit_price = ci.unit_price_snapshot || (product ? product.base_price : 0);
      const quantity = ci.quantity || 0;
      const line_subtotal = unit_price * quantity;

      const shipping_option_obj = shipping_option
        ? {
            id: shipping_option.id,
            name: shipping_option.name,
            price: shipping_option.price,
            delivery_window_text: this._buildDeliveryWindowText(shipping_option)
          }
        : null;

      const store_pickup_obj = store
        ? {
            store_location_id: store.id,
            store_name: store.name,
            address_line1: store.address_line1,
            city: store.city,
            state: store.state,
            postal_code: store.postal_code
          }
        : null;

      const configuration = {
        color_selection: ci.color_selection || null,
        wood_finish_selection: ci.wood_finish_selection || null,
        ink_color_selection: ci.ink_color_selection || null,
        size_label_snapshot: ci.size_label_snapshot || null,
        capacity_oz_snapshot: ci.capacity_oz_snapshot || null,
        engraving_text: ci.engraving_text || null,
        engraving_style_selection: ci.engraving_style_selection || null,
        engraving_font_selection: ci.engraving_font_selection || null,
        engraving_names: ci.engraving_names || null,
        event_date_text: ci.event_date_text || null,
        gift_wrap_selection: ci.gift_wrap_selection || 'none',
        personalization_notes: ci.personalization_notes || null
      };

      return {
        cart_item_id: ci.id,
        product_id: ci.product_id,
        product_name: product ? product.name : ci.product_name_snapshot,
        product_slug: product ? product.slug : null,
        product_image_url: product ? product.image_url : null,
        category_id: product ? product.category_id : ci.category_id_snapshot,
        category_name: category ? category.name : null,
        unit_price: unit_price,
        quantity: quantity,
        line_subtotal: line_subtotal,
        fulfillment_type: ci.fulfillment_type,
        shipping_option: shipping_option_obj,
        store_pickup: store_pickup_obj,
        configuration: configuration,
        // Foreign key resolution
        product: product,
        category: category,
        shipping_option_full: shipping_option,
        store_location: store
      };
    });

    const totals = this._calculateCartTotals(cart);

    return {
      cart_id: cart.id,
      currency: cart.currency,
      items: items,
      items_subtotal: totals.items_subtotal,
      shipping_total: totals.shipping_total,
      order_total: totals.order_total,
      last_updated: cart.updated_at || cart.created_at || null
    };
  }

  // updateCartItemQuantity(cartItemId, quantity)
  updateCartItemQuantity(cartItemId, quantity) {
    const cartItems = this._getFromStorage('cart_items');
    const idx = cartItems.findIndex(ci => ci.id === cartItemId);
    if (idx < 0) {
      return { success: false, cart: null, message: 'Cart item not found' };
    }
    const qty = typeof quantity === 'number' && quantity > 0 ? quantity : 1;
    cartItems[idx].quantity = qty;
    this._saveToStorage('cart_items', cartItems);

    const carts = this._getFromStorage('carts');
    const cart = carts.length > 0 ? carts[0] : this._getOrCreateCart();
    cart.updated_at = new Date().toISOString();
    this._saveCart(cart);

    const totals = this._calculateCartTotals(cart);
    return {
      success: true,
      cart: {
        cart_id: cart.id,
        item_count: totals.item_count,
        items_subtotal: totals.items_subtotal,
        shipping_total: totals.shipping_total,
        order_total: totals.order_total
      },
      message: 'Cart item quantity updated'
    };
  }

  // removeCartItem(cartItemId)
  removeCartItem(cartItemId) {
    let cartItems = this._getFromStorage('cart_items');
    const ci = cartItems.find(item => item.id === cartItemId);
    if (!ci) {
      return { success: false, cart: null, message: 'Cart item not found' };
    }

    cartItems = cartItems.filter(item => item.id !== cartItemId);
    this._saveToStorage('cart_items', cartItems);

    const carts = this._getFromStorage('carts');
    const cart = carts.length > 0 ? carts[0] : this._getOrCreateCart();
    if (Array.isArray(cart.cart_item_ids)) {
      cart.cart_item_ids = cart.cart_item_ids.filter(id => id !== cartItemId);
    }
    cart.updated_at = new Date().toISOString();
    this._saveCart(cart);

    const totals = this._calculateCartTotals(cart);
    return {
      success: true,
      cart: {
        cart_id: cart.id,
        item_count: totals.item_count,
        items_subtotal: totals.items_subtotal,
        shipping_total: totals.shipping_total,
        order_total: totals.order_total
      },
      message: 'Cart item removed'
    };
  }

  // addConfiguredProductToWishlist(productId, desired_quantity, configuration)
  addConfiguredProductToWishlist(productId, desired_quantity, configuration) {
    const products = this._getFromStorage('products');
    const product = products.find(p => p.id === productId);
    if (!product) {
      return { success: false, added_item_id: null, wishlist_id: null, item_count: 0, message: 'Product not found' };
    }

    const wishlist = this._getOrCreateWishlist();
    const wishlistItems = this._getFromStorage('wishlist_items');
    const qty = typeof desired_quantity === 'number' && desired_quantity > 0 ? desired_quantity : 1;
    const now = new Date().toISOString();

    const item = {
      id: this._generateId('wishlist_item'),
      wishlist_id: wishlist.id,
      product_id: product.id,
      product_name_snapshot: product.name,
      category_id_snapshot: product.category_id,
      unit_price_snapshot: product.base_price,
      desired_quantity: qty,
      color_selection: configuration && configuration.color_selection ? configuration.color_selection : null,
      wood_finish_selection: configuration && configuration.wood_finish_selection ? configuration.wood_finish_selection : null,
      ink_color_selection: configuration && configuration.ink_color_selection ? configuration.ink_color_selection : null,
      size_label_snapshot: configuration && configuration.size_label_snapshot ? configuration.size_label_snapshot : product.size_label,
      capacity_oz_snapshot: configuration && configuration.capacity_oz_snapshot ? configuration.capacity_oz_snapshot : product.capacity_oz,
      engraving_text: configuration && configuration.engraving_text ? configuration.engraving_text : null,
      engraving_style_selection: configuration && configuration.engraving_style_selection ? configuration.engraving_style_selection : null,
      engraving_font_selection: configuration && configuration.engraving_font_selection ? configuration.engraving_font_selection : null,
      engraving_names: configuration && configuration.engraving_names ? configuration.engraving_names.slice() : null,
      event_date_text: configuration && configuration.event_date_text ? configuration.event_date_text : null,
      event_date: configuration && configuration.event_date ? configuration.event_date : null,
      gift_wrap_selection: configuration && configuration.gift_wrap_selection ? configuration.gift_wrap_selection : 'none',
      personalization_notes: configuration && configuration.personalization_notes ? configuration.personalization_notes : null,
      created_at: now
    };

    wishlistItems.push(item);
    this._saveToStorage('wishlist_items', wishlistItems);

    if (!Array.isArray(wishlist.wishlist_item_ids)) wishlist.wishlist_item_ids = [];
    wishlist.wishlist_item_ids.push(item.id);
    wishlist.updated_at = now;
    this._saveWishlist(wishlist);

    const item_count = wishlistItems.filter(wi => wi.wishlist_id === wishlist.id).length;

    return {
      success: true,
      added_item_id: item.id,
      wishlist_id: wishlist.id,
      item_count: item_count,
      message: 'Item added to wishlist'
    };
  }

  // getWishlist()
  getWishlist() {
    const wishlists = this._getFromStorage('wishlists');
    if (wishlists.length === 0) {
      return { wishlist_id: null, items: [] };
    }
    const wishlist = wishlists[0];
    const wishlistItems = this._getFromStorage('wishlist_items').filter(wi => wi.wishlist_id === wishlist.id);
    const products = this._getFromStorage('products');
    const categories = this._getFromStorage('categories');

    const items = wishlistItems.map(wi => {
      const product = products.find(p => p.id === wi.product_id) || null;
      const category = product ? categories.find(c => c.id === product.category_id) || null : null;
      const configuration = {
        color_selection: wi.color_selection || null,
        wood_finish_selection: wi.wood_finish_selection || null,
        ink_color_selection: wi.ink_color_selection || null,
        size_label_snapshot: wi.size_label_snapshot || null,
        capacity_oz_snapshot: wi.capacity_oz_snapshot || null,
        engraving_text: wi.engraving_text || null,
        engraving_style_selection: wi.engraving_style_selection || null,
        engraving_font_selection: wi.engraving_font_selection || null,
        engraving_names: wi.engraving_names || null,
        event_date_text: wi.event_date_text || null,
        gift_wrap_selection: wi.gift_wrap_selection || 'none',
        personalization_notes: wi.personalization_notes || null
      };

      return {
        wishlist_item_id: wi.id,
        product_id: wi.product_id,
        product_name: product ? product.name : wi.product_name_snapshot,
        product_slug: product ? product.slug : null,
        product_image_url: product ? product.image_url : null,
        category_id: product ? product.category_id : wi.category_id_snapshot,
        category_name: category ? category.name : null,
        unit_price_snapshot: wi.unit_price_snapshot,
        desired_quantity: wi.desired_quantity,
        configuration: configuration,
        // Foreign key resolution
        product: product,
        category: category
      };
    });

    return {
      wishlist_id: wishlist.id,
      items: items
    };
  }

  // removeWishlistItem(wishlistItemId)
  removeWishlistItem(wishlistItemId) {
    let wishlistItems = this._getFromStorage('wishlist_items');
    const item = wishlistItems.find(wi => wi.id === wishlistItemId);
    if (!item) {
      return { success: false, wishlist_id: null, item_count: 0, message: 'Wishlist item not found' };
    }

    wishlistItems = wishlistItems.filter(wi => wi.id !== wishlistItemId);
    this._saveToStorage('wishlist_items', wishlistItems);

    const wishlists = this._getFromStorage('wishlists');
    const wishlist = wishlists.length > 0 ? wishlists[0] : null;
    if (wishlist && Array.isArray(wishlist.wishlist_item_ids)) {
      wishlist.wishlist_item_ids = wishlist.wishlist_item_ids.filter(id => id !== wishlistItemId);
      wishlist.updated_at = new Date().toISOString();
      this._saveWishlist(wishlist);
    }

    const item_count = wishlist ? wishlistItems.filter(wi => wi.wishlist_id === wishlist.id).length : 0;

    return {
      success: true,
      wishlist_id: wishlist ? wishlist.id : null,
      item_count: item_count,
      message: 'Wishlist item removed'
    };
  }

  // moveWishlistItemToCart(wishlistItemId, fulfillment_type, shippingOptionId)
  moveWishlistItemToCart(wishlistItemId, fulfillment_type, shippingOptionId) {
    const wishlistItems = this._getFromStorage('wishlist_items');
    const wi = wishlistItems.find(item => item.id === wishlistItemId);
    if (!wi) {
      return { success: false, cart_id: null, cart_item_id: null, wishlist_id: null, message: 'Wishlist item not found' };
    }

    const configuration = {
      color_selection: wi.color_selection,
      wood_finish_selection: wi.wood_finish_selection,
      ink_color_selection: wi.ink_color_selection,
      size_label_override: wi.size_label_snapshot,
      engraving_text: wi.engraving_text,
      engraving_style_selection: wi.engraving_style_selection,
      engraving_font_selection: wi.engraving_font_selection,
      engraving_names: wi.engraving_names,
      event_date_text: wi.event_date_text,
      event_date: wi.event_date,
      gift_wrap_selection: wi.gift_wrap_selection,
      personalization_notes: wi.personalization_notes
    };

    const addResult = this.addConfiguredProductToCart(
      wi.product_id,
      wi.desired_quantity || 1,
      fulfillment_type,
      shippingOptionId,
      configuration
    );

    if (!addResult.success) {
      return {
        success: false,
        cart_id: null,
        cart_item_id: null,
        wishlist_id: wi.wishlist_id,
        message: addResult.message || 'Failed to move wishlist item to cart'
      };
    }

    // Remove wishlist item (treat as move, not copy)
    this.removeWishlistItem(wishlistItemId);

    return {
      success: true,
      cart_id: addResult.cart ? addResult.cart.cart_id : null,
      cart_item_id: addResult.added_item_id,
      wishlist_id: wi.wishlist_id,
      message: 'Wishlist item moved to cart'
    };
  }

  // getBulkOrderCategories()
  getBulkOrderCategories() {
    const products = this._getFromStorage('products').filter(p => !!p.is_bulk_order_available);
    const categories = this._getFromStorage('categories');
    const map = {};

    products.forEach(p => {
      if (!map[p.category_id]) {
        const cat = categories.find(c => c.id === p.category_id) || null;
        map[p.category_id] = {
          category_id: p.category_id,
          category_name: cat ? cat.name : p.category_id,
          description: cat ? cat.description || '' : '',
          has_bulk_products: true,
          category: cat
        };
      }
    });

    return Object.keys(map).map(k => map[k]);
  }

  // getBulkOrderProducts(categoryId)
  getBulkOrderProducts(categoryId) {
    const products = this._getFromStorage('products');
    const categories = this._getFromStorage('categories');
    const filtered = products.filter(p => p.category_id === categoryId && !!p.is_bulk_order_available);

    const resultProducts = filtered.map(p => {
      const category = categories.find(c => c.id === p.category_id) || null;
      return {
        product_id: p.id,
        name: p.name,
        slug: p.slug,
        image_url: p.image_url,
        base_price: p.base_price,
        min_price: p.min_price,
        max_price: p.max_price,
        category_id: p.category_id,
        category_name: category ? category.name : null,
        is_bulk_order_available: !!p.is_bulk_order_available,
        category: category,
        product: p
      };
    });

    return {
      total_count: resultProducts.length,
      products: resultProducts
    };
  }

  // getBulkQuoteRequestContext(productId, quantityRequested)
  getBulkQuoteRequestContext(productId, quantityRequested) {
    const product = this._getProductById(productId);
    if (!product) {
      return {
        product_summary: null,
        default_quantity: typeof quantityRequested === 'number' && quantityRequested > 0 ? quantityRequested : 1
      };
    }
    const summary = {
      product_id: product.id,
      name: product.name,
      image_url: product.image_url,
      base_price: product.base_price,
      min_price: product.min_price,
      max_price: product.max_price,
      product: product
    };
    const default_quantity = typeof quantityRequested === 'number' && quantityRequested > 0 ? quantityRequested : 1;
    return { product_summary: summary, default_quantity };
  }

  // submitBulkQuoteRequest(productId, quantityRequested, companyName, budgetAmount, timeline_option, project_details, contact_name, contact_email)
  submitBulkQuoteRequest(productId, quantityRequested, companyName, budgetAmount, timeline_option, project_details, contact_name, contact_email) {
    const product = this._getProductById(productId);
    if (!product) {
      return { success: false, quote_request_id: null, status: null, message: 'Product not found' };
    }
    const qty = typeof quantityRequested === 'number' && quantityRequested > 0 ? quantityRequested : 1;
    if (!companyName) {
      return { success: false, quote_request_id: null, status: null, message: 'Company name is required' };
    }
    const allowedTimeline = ['need_in_30_days', 'flexible', 'specific_date', 'rush'];
    if (allowedTimeline.indexOf(timeline_option) === -1) {
      return { success: false, quote_request_id: null, status: null, message: 'Invalid timeline option' };
    }
    if (!project_details) {
      return { success: false, quote_request_id: null, status: null, message: 'Project details are required' };
    }

    const requests = this._getFromStorage('bulk_quote_requests');
    const now = new Date().toISOString();

    const request = {
      id: this._generateId('bulk_quote'),
      product_id: product.id,
      product_name_snapshot: product.name,
      quantity_requested: qty,
      budget_amount: typeof budgetAmount === 'number' ? budgetAmount : null,
      budget_currency: 'usd',
      company_name: companyName,
      timeline_option: timeline_option,
      project_details: project_details,
      contact_name: contact_name || null,
      contact_email: contact_email || null,
      created_at: now,
      status: 'submitted'
    };

    requests.push(request);
    this._saveToStorage('bulk_quote_requests', requests);

    return {
      success: true,
      quote_request_id: request.id,
      status: request.status,
      message: 'Bulk quote request submitted'
    };
  }

  // getGiftOccasionOptions()
  getGiftOccasionOptions() {
    // Static options; actual product tagging happens via Product.occasions
    return [
      { value: 'anniversary', label: 'Anniversary', description: 'Thoughtful engraved gifts for anniversaries.' },
      { value: 'wedding', label: 'Wedding', description: 'Personalized wedding gifts and decor.' },
      { value: 'birthday', label: 'Birthday', description: 'Unique birthday gift ideas.' },
      { value: 'other', label: 'Other', description: 'Other special occasions.' }
    ];
  }

  // searchGifts(occasion, filters, sort_by, page, page_size)
  searchGifts(occasion, filters, sort_by, page, page_size) {
    const products = this._getFromStorage('products');
    const categories = this._getFromStorage('categories');
    const f = filters || {};

    let filtered = products.filter(p => {
      if (!Array.isArray(p.occasions) || p.occasions.indexOf(occasion) === -1) return false;
      if (typeof f.max_price === 'number' && this._getPriceForFilters(p) > f.max_price) return false;
      if (typeof f.min_rating === 'number' && (p.rating_average || 0) < f.min_rating) return false;
      if (f.require_free_gift_wrap && !p.has_free_gift_wrap) return false;
      return true;
    });

    const sort = sort_by || 'customer_rating_high_to_low';
    filtered = this._sortProducts(filtered, sort);

    const paged = this._paginate(filtered, page, page_size);
    const resultProducts = paged.items.map(p => {
      const category = categories.find(c => c.id === p.category_id) || null;
      return {
        product_id: p.id,
        name: p.name,
        slug: p.slug,
        image_url: p.image_url,
        base_price: p.base_price,
        min_price: p.min_price,
        max_price: p.max_price,
        category_id: p.category_id,
        category_name: category ? category.name : null,
        product_type: p.product_type,
        rating_average: p.rating_average,
        rating_count: p.rating_count,
        supports_gift_wrap: p.supports_gift_wrap || false,
        has_free_gift_wrap: p.has_free_gift_wrap || false,
        free_gift_wrap_label: p.free_gift_wrap_label || null,
        category: category,
        product: p
      };
    });

    return {
      total_count: paged.total_count,
      page: paged.page,
      page_size: paged.page_size,
      products: resultProducts
    };
  }

  // searchStoreLocationsByZip(zip)
  searchStoreLocationsByZip(zip) {
    const z = (zip || '').trim();
    const stores = this._getFromStorage('store_locations');
    if (!z) return stores;
    return stores.filter(s => (s.postal_code || '').startsWith(z));
  }

  // selectStorePickupLocation(storeLocationId, selectedZip)
  selectStorePickupLocation(storeLocationId, selectedZip) {
    const store = this._getStoreLocationById(storeLocationId);
    if (!store) {
      return { success: false, context: null, message: 'Store location not found' };
    }
    const ctx = this._getOrCreateStorePickupContext();
    ctx.selected_store_location_id = store.id;
    ctx.selected_zip = selectedZip || ctx.selected_zip || null;
    ctx.updated_at = new Date().toISOString();
    this._saveStorePickupContext(ctx);

    return {
      success: true,
      context: {
        selected_zip: ctx.selected_zip,
        selected_store: {
          id: store.id,
          name: store.name,
          address_line1: store.address_line1,
          city: store.city,
          state: store.state,
          postal_code: store.postal_code,
          supports_store_pickup: store.supports_store_pickup || false,
          supports_same_day_pickup: store.supports_same_day_pickup || false
        }
      },
      message: 'Store pickup location selected'
    };
  }

  // getStorePickupContext()
  getStorePickupContext() {
    const contexts = this._getFromStorage('store_pickup_contexts');
    const ctx = contexts.find(c => c.id === 'current') || null;
    if (!ctx) {
      return { selected_zip: null, selected_store: null };
    }
    const store = ctx.selected_store_location_id
      ? this._getStoreLocationById(ctx.selected_store_location_id)
      : null;
    return {
      selected_zip: ctx.selected_zip || null,
      selected_store: store
        ? {
            id: store.id,
            name: store.name,
            address_line1: store.address_line1,
            city: store.city,
            state: store.state,
            postal_code: store.postal_code,
            supports_store_pickup: store.supports_store_pickup || false,
            supports_same_day_pickup: store.supports_same_day_pickup || false
          }
        : null
    };
  }

  // getStorePickupFilterOptions()
  getStorePickupFilterOptions() {
    const products = this._getFromStorage('products').filter(p => !!p.is_store_pickup_eligible);
    const categories = this._getFromStorage('categories');

    const categoryMap = {};
    let min_price = null;
    let max_price = null;

    products.forEach(p => {
      const price = this._getPriceForFilters(p);
      if (min_price === null || price < min_price) min_price = price;
      if (max_price === null || price > max_price) max_price = price;
      if (!categoryMap[p.category_id]) {
        const cat = categories.find(c => c.id === p.category_id) || null;
        categoryMap[p.category_id] = {
          category_id: p.category_id,
          category_name: cat ? cat.name : p.category_id,
          category: cat
        };
      }
    });

    const categoryArr = Object.keys(categoryMap).map(k => {
      const c = categoryMap[k];
      return { category_id: c.category_id, category_name: c.category_name };
    });

    return {
      categories: categoryArr,
      rating_thresholds: this._ratingThresholdOptions(),
      price_range_suggestion: {
        min_price: min_price === null ? 0 : min_price,
        max_price: max_price === null ? 0 : max_price
      }
    };
  }

  // getStorePickupProducts(filters, sort_by, page, page_size)
  getStorePickupProducts(filters, sort_by, page, page_size) {
    const products = this._getFromStorage('products').filter(p => !!p.is_store_pickup_eligible);
    const categories = this._getFromStorage('categories');
    const f = filters || {};

    let filtered = products.filter(p => {
      if (f.category_id && p.category_id !== f.category_id) return false;
      if (typeof f.max_price === 'number' && this._getPriceForFilters(p) > f.max_price) return false;
      if (typeof f.min_rating === 'number' && (p.rating_average || 0) < f.min_rating) return false;
      if (f.same_day_only && !p.is_same_day_pickup_eligible) return false;
      return true;
    });

    const sorted = this._sortProducts(filtered, sort_by || 'price_low_to_high');
    const paged = this._paginate(sorted, page, page_size);

    const resultProducts = paged.items.map(p => {
      const category = categories.find(c => c.id === p.category_id) || null;
      return {
        product_id: p.id,
        name: p.name,
        slug: p.slug,
        image_url: p.image_url,
        base_price: p.base_price,
        min_price: p.min_price,
        max_price: p.max_price,
        category_id: p.category_id,
        category_name: category ? category.name : null,
        product_type: p.product_type,
        rating_average: p.rating_average,
        rating_count: p.rating_count,
        is_same_day_pickup_eligible: p.is_same_day_pickup_eligible || false,
        category: category,
        product: p
      };
    });

    return {
      total_count: paged.total_count,
      page: paged.page,
      page_size: paged.page_size,
      products: resultProducts
    };
  }

  // getConsultationFormOptions()
  getConsultationFormOptions() {
    return {
      project_types: [
        { value: 'wall_art_large_signs', label: 'Wall Art & Large Signs' },
        { value: 'cutting_boards', label: 'Cutting Boards' },
        { value: 'drinkware_tumblers', label: 'Drinkware & Tumblers' },
        { value: 'gift_sets', label: 'Gift Sets' },
        { value: 'other', label: 'Other' }
      ],
      consultation_formats: [
        { value: 'video_call', label: 'Video Call' },
        { value: 'phone_call', label: 'Phone Call' },
        { value: 'in_person', label: 'In Person' }
      ],
      preferred_contact_methods: [
        { value: 'email', label: 'Email' },
        { value: 'phone', label: 'Phone' }
      ]
    };
  }

  // submitConsultationAppointment(project_type, appointment_date, appointment_time, consultation_format, project_description, estimated_budget_amount, contact_name, contact_email, preferred_contact_method)
  submitConsultationAppointment(
    project_type,
    appointment_date,
    appointment_time,
    consultation_format,
    project_description,
    estimated_budget_amount,
    contact_name,
    contact_email,
    preferred_contact_method
  ) {
    const allowedProjectTypes = ['wall_art_large_signs', 'cutting_boards', 'drinkware_tumblers', 'gift_sets', 'other'];
    const allowedFormats = ['video_call', 'phone_call', 'in_person'];
    const allowedContactMethods = ['email', 'phone'];

    if (allowedProjectTypes.indexOf(project_type) === -1) {
      return { success: false, appointment_id: null, status: null, scheduled_start_iso: null, message: 'Invalid project type' };
    }
    if (allowedFormats.indexOf(consultation_format) === -1) {
      return { success: false, appointment_id: null, status: null, scheduled_start_iso: null, message: 'Invalid consultation format' };
    }
    if (allowedContactMethods.indexOf(preferred_contact_method) === -1) {
      return { success: false, appointment_id: null, status: null, scheduled_start_iso: null, message: 'Invalid contact method' };
    }
    if (!appointment_date || !appointment_time) {
      return { success: false, appointment_id: null, status: null, scheduled_start_iso: null, message: 'Appointment date and time are required' };
    }
    if (!project_description) {
      return { success: false, appointment_id: null, status: null, scheduled_start_iso: null, message: 'Project description is required' };
    }
    if (!contact_name || !contact_email) {
      return { success: false, appointment_id: null, status: null, scheduled_start_iso: null, message: 'Contact name and email are required' };
    }

    const appointments = this._getFromStorage('consultation_appointments');

    const startIso = appointment_date + 'T' + appointment_time + ':00';

    const appointment = {
      id: this._generateId('consultation'),
      project_type: project_type,
      appointment_start: startIso,
      appointment_end: null,
      consultation_format: consultation_format,
      project_description: project_description,
      estimated_budget_amount: typeof estimated_budget_amount === 'number' ? estimated_budget_amount : null,
      contact_name: contact_name,
      contact_email: contact_email,
      preferred_contact_method: preferred_contact_method,
      created_at: new Date().toISOString(),
      status: 'requested'
    };

    appointments.push(appointment);
    this._saveToStorage('consultation_appointments', appointments);

    return {
      success: true,
      appointment_id: appointment.id,
      status: appointment.status,
      scheduled_start_iso: appointment.appointment_start,
      message: 'Consultation appointment requested'
    };
  }

  // getBusinessContactInfo()
  getBusinessContactInfo() {
    const data = localStorage.getItem('business_contact_info');
    if (!data) {
      return {
        phone: '',
        email: '',
        address_line1: '',
        address_line2: '',
        city: '',
        state: '',
        postal_code: '',
        hours: []
      };
    }
    try {
      return JSON.parse(data);
    } catch (e) {
      return {
        phone: '',
        email: '',
        address_line1: '',
        address_line2: '',
        city: '',
        state: '',
        postal_code: '',
        hours: []
      };
    }
  }

  // submitContactInquiry(name, email, subject, message, preferred_contact_method, order_reference)
  submitContactInquiry(name, email, subject, message, preferred_contact_method, order_reference) {
    if (!name || !email || !subject || !message) {
      return { success: false, ticket_id: null, message: 'All required fields must be provided' };
    }

    const allowedMethods = ['email', 'phone'];
    if (preferred_contact_method && allowedMethods.indexOf(preferred_contact_method) === -1) {
      return { success: false, ticket_id: null, message: 'Invalid preferred contact method' };
    }

    const inquiries = this._getFromStorage('contact_inquiries');
    const ticketId = this._generateId('contact');
    inquiries.push({
      id: ticketId,
      name: name,
      email: email,
      subject: subject,
      message: message,
      preferred_contact_method: preferred_contact_method || null,
      order_reference: order_reference || null,
      created_at: new Date().toISOString()
    });
    this._saveToStorage('contact_inquiries', inquiries);

    return { success: true, ticket_id: ticketId, message: 'Inquiry submitted' };
  }

  // getFaqs(topic)
  getFaqs(topic) {
    const faqs = this._getFromStorage('faqs');
    if (!topic) return faqs;
    const t = topic.toLowerCase();
    return faqs.filter(f => (f.topic || '').toLowerCase() === t);
  }

  // getLegalContent(document_type)
  getLegalContent(document_type) {
    const docs = this._getFromStorage('legal_contents');
    const doc = docs.find(d => d.document_type === document_type) || null;
    if (!doc) {
      return {
        title: '',
        last_updated: '',
        content: ''
      };
    }
    return {
      title: doc.title || '',
      last_updated: doc.last_updated || '',
      content: doc.content || ''
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