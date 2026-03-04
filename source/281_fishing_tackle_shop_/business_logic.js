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

  _initStorage() {
    // Initialize all data tables in localStorage if not exist
    const keysWithEmptyArray = [
      'products',
      'product_categories',
      'blog_posts',
      'blog_categories',
      'carts',
      'cart_items',
      'wishlists',
      'wishlist_items',
      'promo_codes',
      'checkout_sessions',
      'size_guide_entries',
      'contact_messages'
    ];

    for (const key of keysWithEmptyArray) {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    }

    // static pages stored as an object map
    if (!localStorage.getItem('static_pages')) {
      localStorage.setItem('static_pages', JSON.stringify({}));
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }

    // Seed additional demo catalog data used in flow tests
    this._seedDemoCatalog();
  }

  _getFromStorage(key, defaultValue = []) {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : defaultValue;
  }

  _seedDemoCatalog() {
    // Populate additional demo products and categories used in flow tests
    let products = this._getFromStorage('products', []);
    let categories = this._getFromStorage('product_categories', []);

    const existingProductIds = new Set(products.map(p => p && p.id));
    const existingCategoryIds = new Set(categories.map(c => c && c.id));

    const addCategory = cat => {
      if (!cat || !cat.id || existingCategoryIds.has(cat.id)) return;
      categories.push(cat);
      existingCategoryIds.add(cat.id);
    };

    const addProduct = prod => {
      if (!prod || !prod.id || existingProductIds.has(prod.id)) return;
      products.push(prod);
      existingProductIds.add(prod.id);
    };

    // Ensure nav has saltwater, deals, line, and apparel categories
    addCategory({
      id: 'saltwater',
      name: 'Saltwater',
      description: 'Inshore and surf rods, reels, and lures.',
      url: 'category.html?categoryId=saltwater',
      sort_order: 4
    });

    addCategory({
      id: 'deals',
      name: 'Deals',
      description: 'Clearance and sale tackle.',
      url: 'category.html?categoryId=deals',
      sort_order: 5
    });

    addCategory({
      id: 'line',
      name: 'Line',
      description: 'Braided, fluorocarbon, and monofilament fishing line.',
      url: 'category.html?categoryId=line',
      sort_order: 6
    });

    addCategory({
      id: 'apparel',
      name: 'Apparel',
      description: 'Waders and fishing clothing.',
      url: 'category.html?categoryId=apparel',
      sort_order: 7
    });

    // Braided line 300-yd spool used in Task 3
    addProduct({
      id: 'prod_line_braid_300yd_1',
      name: '8x Braided Line 300 Yard Spool',
      slug: '8x-braided-line-300-yard-spool',
      status: 'active',
      category_id: 'line',
      product_sub_type: 'line',
      short_description: '300 yard spool of 8x braided line for bass, walleye, and inshore fishing.',
      description: 'Durable 8-carrier braided line on a 300 yard spool. Ideal as a main line for casting distance and sensitivity.',
      image_url: '',
      thumbnail_url: '',
      price: 34.99,
      original_price: 39.99,
      currency: 'USD',
      rating: 4.5,
      review_count: 112,
      is_clearance: false,
      is_on_sale: true,
      discount_percent: 12,
      water_type: 'freshwater',
      target_species: ['bass', 'walleye', 'multi_species'],
      tags: ['braided', 'braid', 'braided line 300 yard'],
      rod_style: 'none',
      rod_power: 'none',
      rod_length_feet: 0,
      rod_pieces: 0,
      reel_style: 'none',
      line_type: 'braided',
      spool_length_yards: 300,
      lb_test_options: [15, 20, 30],
      max_lb_test: 30,
      lure_type: 'none',
      color_options: ['Moss Green'],
      size_options: [],
      number_of_trays: 0,
      number_of_compartments: 0,
      available_sizes: [],
      default_size: '',
      gender: 'none',
      size_guide_type: 'none',
      created_at: this._now(),
      updated_at: this._now()
    });

    // Winter trout spoon lure used in trout blog post (Task 4)
    addProduct({
      id: 'prod_lure_trout_winter_1',
      name: 'WinterGlow Trout Spoon 1/8 oz',
      slug: 'winterglow-trout-spoon-18oz',
      status: 'active',
      category_id: 'lures',
      product_sub_type: 'lure',
      short_description: 'Subtle 1/8 oz spoon designed for cold-water trout.',
      description: 'A compact spoon with a slow, fluttering wobble that excels for winter trout in clear water.',
      image_url: '',
      thumbnail_url: '',
      price: 5.99,
      original_price: 7.99,
      currency: 'USD',
      rating: 4.7,
      review_count: 54,
      is_clearance: false,
      is_on_sale: true,
      discount_percent: 25,
      water_type: 'freshwater',
      target_species: ['trout'],
      tags: ['trout', 'winter', 'spoon', 'lure'],
      rod_style: 'none',
      rod_power: 'none',
      rod_length_feet: 0,
      rod_pieces: 0,
      reel_style: 'none',
      line_type: 'none',
      spool_length_yards: 0,
      lb_test_options: [],
      max_lb_test: 0,
      lure_type: 'spoon',
      color_options: ['Silver/Glow'],
      size_options: [],
      number_of_trays: 0,
      number_of_compartments: 0,
      available_sizes: [],
      default_size: '',
      gender: 'none',
      size_guide_type: 'none',
      created_at: this._now(),
      updated_at: this._now()
    });

    // Trout fluorocarbon line used in trout blog post (Task 4)
    addProduct({
      id: 'prod_line_trout_fluoro_1',
      name: 'ClearCreek Trout Fluorocarbon Line',
      slug: 'clearcreek-trout-fluorocarbon-line',
      status: 'active',
      category_id: 'line',
      product_sub_type: 'line',
      short_description: 'Low-visibility fluorocarbon designed for trout fishing.',
      description: 'Clear fluorocarbon line in trout-friendly diameters ideal for winter and clear-water scenarios.',
      image_url: '',
      thumbnail_url: '',
      price: 19.99,
      original_price: 24.99,
      currency: 'USD',
      rating: 4.6,
      review_count: 73,
      is_clearance: false,
      is_on_sale: true,
      discount_percent: 20,
      water_type: 'freshwater',
      target_species: ['trout'],
      tags: ['trout', 'fluorocarbon', 'line'],
      rod_style: 'none',
      rod_power: 'none',
      rod_length_feet: 0,
      rod_pieces: 0,
      reel_style: 'none',
      line_type: 'fluorocarbon',
      spool_length_yards: 200,
      lb_test_options: [4, 6],
      max_lb_test: 6,
      lure_type: 'none',
      color_options: ['Clear'],
      size_options: [],
      number_of_trays: 0,
      number_of_compartments: 0,
      available_sizes: [],
      default_size: '',
      gender: 'none',
      size_guide_type: 'none',
      created_at: this._now(),
      updated_at: this._now()
    });

    // Saltwater spinning reel for starter kit (Task 2)
    addProduct({
      id: 'prod_sw_reel_1',
      name: 'TideRunner 3000 Saltwater Spinning Reel',
      slug: 'tiderunner-3000-saltwater-spinning-reel',
      status: 'active',
      category_id: 'reels',
      product_sub_type: 'reel',
      short_description: 'Corrosion-resistant 3000-size reel ideal for inshore saltwater use.',
      description: 'Features a sealed drag and aluminum body, perfect for pairing with a 7 ft inshore rod.',
      image_url: '',
      thumbnail_url: '',
      price: 79.99,
      original_price: 99.99,
      currency: 'USD',
      rating: 4.4,
      review_count: 61,
      is_clearance: false,
      is_on_sale: true,
      discount_percent: 20,
      water_type: 'saltwater',
      target_species: ['redfish', 'snook', 'sea_trout', 'flounder'],
      tags: ['saltwater', 'reel', 'spinning', 'starter_kit'],
      rod_style: 'none',
      rod_power: 'none',
      rod_length_feet: 0,
      rod_pieces: 0,
      reel_style: 'spinning',
      line_type: 'none',
      spool_length_yards: 0,
      lb_test_options: [],
      max_lb_test: 0,
      lure_type: 'none',
      color_options: ['Silver/Blue'],
      size_options: [],
      number_of_trays: 0,
      number_of_compartments: 0,
      available_sizes: [],
      default_size: '',
      gender: 'none',
      size_guide_type: 'none',
      created_at: this._now(),
      updated_at: this._now()
    });

    // Premium reel over $100 used in Task 9
    addProduct({
      id: 'prod_reel_premium_1',
      name: 'ProMax 2500 Spinning Reel',
      slug: 'promax-2500-spinning-reel',
      status: 'active',
      category_id: 'reels',
      product_sub_type: 'reel',
      short_description: 'Lightweight magnesium-frame spinning reel with smooth drag.',
      description: 'A premium 2500-size spinning reel ideal for finesse techniques and all-around use.',
      image_url: '',
      thumbnail_url: '',
      price: 149.99,
      original_price: 189.99,
      currency: 'USD',
      rating: 4.8,
      review_count: 132,
      is_clearance: false,
      is_on_sale: true,
      discount_percent: 21,
      water_type: 'fresh_and_saltwater',
      target_species: ['bass', 'walleye', 'trout'],
      tags: ['reel', 'spinning', 'premium'],
      rod_style: 'none',
      rod_power: 'none',
      rod_length_feet: 0,
      rod_pieces: 0,
      reel_style: 'spinning',
      line_type: 'none',
      spool_length_yards: 0,
      lb_test_options: [],
      max_lb_test: 0,
      lure_type: 'none',
      color_options: ['Black/Gold'],
      size_options: [],
      number_of_trays: 0,
      number_of_compartments: 0,
      available_sizes: [],
      default_size: '',
      gender: 'none',
      size_guide_type: 'none',
      created_at: this._now(),
      updated_at: this._now()
    });

    // Saltwater soft plastic, jig, and spoon lures for starter kit (Task 2)
    addProduct({
      id: 'prod_sw_lure_soft_1',
      name: 'SaltShad Paddle Tail 4\" Soft Plastics (5-pack)',
      slug: 'saltshad-paddle-tail-4-soft-plastics',
      status: 'active',
      category_id: 'lures',
      product_sub_type: 'lure',
      short_description: '4\" paddle-tail swimbaits for inshore redfish and trout.',
      description: 'Soft plastic paddle-tail baits that can be rigged on jig heads or swimbait hooks.',
      image_url: '',
      thumbnail_url: '',
      price: 6.99,
      original_price: 8.99,
      currency: 'USD',
      rating: 4.5,
      review_count: 48,
      is_clearance: false,
      is_on_sale: true,
      discount_percent: 22,
      water_type: 'saltwater',
      target_species: ['redfish', 'sea_trout', 'flounder'],
      tags: ['saltwater', 'soft_plastic', 'paddle_tail'],
      rod_style: 'none',
      rod_power: 'none',
      rod_length_feet: 0,
      rod_pieces: 0,
      reel_style: 'none',
      line_type: 'none',
      spool_length_yards: 0,
      lb_test_options: [],
      max_lb_test: 0,
      lure_type: 'soft_plastic',
      color_options: ['Glow/Chartreuse'],
      size_options: [],
      number_of_trays: 0,
      number_of_compartments: 0,
      available_sizes: [],
      default_size: '',
      gender: 'none',
      size_guide_type: 'none',
      created_at: this._now(),
      updated_at: this._now()
    });

    addProduct({
      id: 'prod_sw_lure_jig_1',
      name: 'ReefFlash Inshore Jig 1/2 oz',
      slug: 'reefflash-inshore-jig-12oz',
      status: 'active',
      category_id: 'lures',
      product_sub_type: 'lure',
      short_description: '1/2 oz jig for probing deeper inshore channels and structure.',
      description: 'A versatile inshore jig with durable finish and strong hook for redfish and snook.',
      image_url: '',
      thumbnail_url: '',
      price: 4.99,
      original_price: 6.99,
      currency: 'USD',
      rating: 4.3,
      review_count: 37,
      is_clearance: false,
      is_on_sale: true,
      discount_percent: 29,
      water_type: 'saltwater',
      target_species: ['redfish', 'snook', 'sea_trout'],
      tags: ['saltwater', 'jig'],
      rod_style: 'none',
      rod_power: 'none',
      rod_length_feet: 0,
      rod_pieces: 0,
      reel_style: 'none',
      line_type: 'none',
      spool_length_yards: 0,
      lb_test_options: [],
      max_lb_test: 0,
      lure_type: 'jig',
      color_options: ['Chartreuse'],
      size_options: [],
      number_of_trays: 0,
      number_of_compartments: 0,
      available_sizes: [],
      default_size: '',
      gender: 'none',
      size_guide_type: 'none',
      created_at: this._now(),
      updated_at: this._now()
    });

    addProduct({
      id: 'prod_sw_lure_spoon_1',
      name: 'SurfGlide Casting Spoon 1 oz',
      slug: 'surfglide-casting-spoon-1oz',
      status: 'active',
      category_id: 'lures',
      product_sub_type: 'lure',
      short_description: 'Long-casting 1 oz spoon for surf and jetty fishing.',
      description: 'Heavy casting spoon that covers water quickly and triggers reaction bites.',
      image_url: '',
      thumbnail_url: '',
      price: 7.49,
      original_price: 9.99,
      currency: 'USD',
      rating: 4.4,
      review_count: 29,
      is_clearance: false,
      is_on_sale: true,
      discount_percent: 25,
      water_type: 'saltwater',
      target_species: ['bluefish', 'mackerel', 'redfish'],
      tags: ['saltwater', 'spoon'],
      rod_style: 'none',
      rod_power: 'none',
      rod_length_feet: 0,
      rod_pieces: 0,
      reel_style: 'none',
      line_type: 'none',
      spool_length_yards: 0,
      lb_test_options: [],
      max_lb_test: 0,
      lure_type: 'spoon',
      color_options: ['Silver'],
      size_options: [],
      number_of_trays: 0,
      number_of_compartments: 0,
      available_sizes: [],
      default_size: '',
      gender: 'none',
      size_guide_type: 'none',
      created_at: this._now(),
      updated_at: this._now()
    });

    // Clearance freshwater crankbaits used in Tasks 6 and 8
    const clearanceCranks = [
      {
        id: 'prod_clear_crank_1',
        name: 'RiverRattler Squarebill Crankbait 1.5',
        slug: 'riverrattler-squarebill-crankbait-15',
        price: 5.49
      },
      {
        id: 'prod_clear_crank_2',
        name: 'RiverRattler Squarebill Crankbait 2.5',
        slug: 'riverrattler-squarebill-crankbait-25',
        price: 5.99
      },
      {
        id: 'prod_clear_crank_3',
        name: 'DeepCreep Medium Diver Crankbait',
        slug: 'deepcreep-medium-diver-crankbait',
        price: 6.49
      },
      {
        id: 'prod_clear_crank_4',
        name: 'ShadFlash Lipless Crankbait 1/2 oz',
        slug: 'shadflash-lipless-crankbait-12oz',
        price: 4.99
      },
      {
        id: 'prod_clear_crank_5',
        name: 'CrawChaser Flat-Side Crankbait',
        slug: 'crawchaser-flat-side-crankbait',
        price: 5.79
      }
    ];

    clearanceCranks.forEach((base, index) => {
      addProduct({
        id: base.id,
        name: base.name,
        slug: base.slug,
        status: 'active',
        category_id: 'lures',
        product_sub_type: 'lure',
        short_description: 'Clearance freshwater crankbait for bass fishing.',
        description: 'Discounted crankbait ideal for covering water and triggering reaction strikes.',
        image_url: '',
        thumbnail_url: '',
        price: base.price,
        original_price: base.price + 2,
        currency: 'USD',
        rating: 4.3 + (index % 3) * 0.1,
        review_count: 25 + index * 5,
        is_clearance: true,
        is_on_sale: true,
        discount_percent: 25,
        water_type: 'freshwater',
        target_species: ['bass'],
        tags: ['bass', 'crankbait', 'clearance'],
        rod_style: 'none',
        rod_power: 'none',
        rod_length_feet: 0,
        rod_pieces: 0,
        reel_style: 'none',
        line_type: 'none',
        spool_length_yards: 0,
        lb_test_options: [],
        max_lb_test: 0,
        lure_type: 'crankbait',
        color_options: ['Assorted'],
        size_options: [],
        number_of_trays: 0,
        number_of_compartments: 0,
        available_sizes: [],
        default_size: '',
        gender: 'none',
        size_guide_type: 'none',
        created_at: this._now(),
        updated_at: this._now()
      });
    });

    // Tackle box with 3+ trays for Task 5
    addProduct({
      id: 'prod_tackle_box_1',
      name: 'LakeMaster 3-Tray Tackle Box',
      slug: 'lakemaster-3-tray-tackle-box',
      status: 'active',
      category_id: 'tackle',
      product_sub_type: 'tackle_box',
      short_description: 'Durable tackle box with three cantilever trays.',
      description: 'A classic hard tackle box featuring three trays and ample bottom storage.',
      image_url: '',
      thumbnail_url: '',
      price: 49.99,
      original_price: 59.99,
      currency: 'USD',
      rating: 4.7,
      review_count: 89,
      is_clearance: false,
      is_on_sale: true,
      discount_percent: 17,
      water_type: 'freshwater',
      target_species: ['multi_species'],
      tags: ['tackle box', 'storage'],
      rod_style: 'none',
      rod_power: 'none',
      rod_length_feet: 0,
      rod_pieces: 0,
      reel_style: 'none',
      line_type: 'none',
      spool_length_yards: 0,
      lb_test_options: [],
      max_lb_test: 0,
      lure_type: 'none',
      color_options: ['Green'],
      size_options: [],
      number_of_trays: 3,
      number_of_compartments: 20,
      available_sizes: [],
      default_size: '',
      gender: 'none',
      size_guide_type: 'none',
      created_at: this._now(),
      updated_at: this._now()
    });

    // Waders product using size guide for Task 7
    addProduct({
      id: 'prod_waders_1',
      name: 'CreekStride Breathable Chest Waders',
      slug: 'creekstride-breathable-chest-waders',
      status: 'active',
      category_id: 'apparel',
      product_sub_type: 'waders',
      short_description: 'Breathable stockingfoot chest waders with reinforced knees.',
      description: 'Lightweight waders designed for all-day comfort in rivers and streams.',
      image_url: '',
      thumbnail_url: '',
      price: 169.99,
      original_price: 199.99,
      currency: 'USD',
      rating: 4.4,
      review_count: 41,
      is_clearance: false,
      is_on_sale: true,
      discount_percent: 15,
      water_type: 'freshwater',
      target_species: ['trout', 'multi_species'],
      tags: ['waders', 'apparel'],
      rod_style: 'none',
      rod_power: 'none',
      rod_length_feet: 0,
      rod_pieces: 0,
      reel_style: 'none',
      line_type: 'none',
      spool_length_yards: 0,
      lb_test_options: [],
      max_lb_test: 0,
      lure_type: 'none',
      color_options: ['Slate Gray'],
      size_options: [],
      number_of_trays: 0,
      number_of_compartments: 0,
      available_sizes: ['Small Short', 'Medium Short', 'Medium Regular'],
      default_size: 'Medium Short',
      gender: 'unisex',
      size_guide_type: 'waders',
      created_at: this._now(),
      updated_at: this._now()
    });

    this._saveToStorage('products', products);
    this._saveToStorage('product_categories', categories);
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

  _now() {
    return new Date().toISOString();
  }

  // =========================
  // Private helpers: Cart
  // =========================

  _getOrCreateCart() {
    const carts = this._getFromStorage('carts', []);
    let cart = null;

    if (carts.length > 0) {
      // Use the last cart as the active one
      cart = carts[carts.length - 1];
    }

    if (!cart) {
      cart = {
        id: this._generateId('cart'),
        items: [], // cart_item ids
        subtotal: 0,
        discount_total: 0,
        total: 0,
        applied_promo_code: null,
        created_at: this._now(),
        updated_at: this._now()
      };
      carts.push(cart);
      this._saveToStorage('carts', carts);
    }

    return cart;
  }

  _updateCartInStorage(cart) {
    const carts = this._getFromStorage('carts', []);
    const index = carts.findIndex(c => c.id === cart.id);
    if (index !== -1) {
      carts[index] = cart;
    } else {
      carts.push(cart);
    }
    this._saveToStorage('carts', carts);
  }

  _recalculateCartTotals(cart) {
    const cartItems = this._getFromStorage('cart_items', []);
    let subtotal = 0;

    for (let i = 0; i < cartItems.length; i++) {
      const item = cartItems[i];
      if (item.cart_id === cart.id) {
        const quantity = typeof item.quantity === 'number' ? item.quantity : 0;
        const unitPrice = typeof item.unit_price === 'number' ? item.unit_price : 0;
        item.line_subtotal = quantity * unitPrice;
        subtotal += item.line_subtotal;
        cartItems[i] = item;
      }
    }

    this._saveToStorage('cart_items', cartItems);

    cart.subtotal = subtotal;
    cart.discount_total = 0;
    cart.total = subtotal;

    if (cart.applied_promo_code) {
      const promoResult = this._validateAndApplyPromoCode(cart, subtotal);
      if (promoResult.valid) {
        cart.discount_total = promoResult.discountTotal;
        cart.total = subtotal - promoResult.discountTotal;
        cart.applied_promo_code = promoResult.appliedCode;
      } else {
        cart.discount_total = 0;
        cart.total = subtotal;
        cart.applied_promo_code = null;
      }
    }

    cart.updated_at = this._now();
    this._updateCartInStorage(cart);

    return cart;
  }

  _validateAndApplyPromoCode(cart, subtotal) {
    const promoCodes = this._getFromStorage('promo_codes', []);
    const codeRaw = cart.applied_promo_code;
    if (!codeRaw || !codeRaw.trim()) {
      return { valid: false, discountTotal: 0, appliedCode: null };
    }
    const normalized = codeRaw.toLowerCase();

    const nowTs = Date.now();

    const promo = promoCodes.find(p => {
      if (!p || typeof p.code !== 'string') return false;
      if (p.code.toLowerCase() !== normalized) return false;
      if (!p.is_active) return false;

      if (p.starts_at) {
        const start = Date.parse(p.starts_at);
        if (!Number.isNaN(start) && nowTs < start) return false;
      }
      if (p.ends_at) {
        const end = Date.parse(p.ends_at);
        if (!Number.isNaN(end) && nowTs > end) return false;
      }

      if (typeof p.minimum_subtotal === 'number' && subtotal < p.minimum_subtotal) {
        return false;
      }

      return true;
    });

    if (!promo) {
      return { valid: false, discountTotal: 0, appliedCode: null };
    }

    let discountTotal = 0;
    if (promo.discount_type === 'percent') {
      discountTotal = subtotal * (promo.discount_value / 100);
    } else if (promo.discount_type === 'fixed_amount') {
      discountTotal = Math.min(subtotal, promo.discount_value);
    } else if (promo.discount_type === 'free_shipping') {
      // No shipping model here; treat as 0 discount on subtotal
      discountTotal = 0;
    }

    return {
      valid: true,
      discountTotal: discountTotal,
      appliedCode: promo.code
    };
  }

  // =========================
  // Private helpers: Wishlist
  // =========================

  _getOrCreateWishlist() {
    const wishlists = this._getFromStorage('wishlists', []);
    let wishlist = null;

    if (wishlists.length > 0) {
      wishlist = wishlists[wishlists.length - 1];
    }

    if (!wishlist) {
      wishlist = {
        id: this._generateId('wishlist'),
        items: [],
        created_at: this._now(),
        updated_at: this._now()
      };
      wishlists.push(wishlist);
      this._saveToStorage('wishlists', wishlists);
    }

    return wishlist;
  }

  _updateWishlistInStorage(wishlist) {
    const wishlists = this._getFromStorage('wishlists', []);
    const index = wishlists.findIndex(w => w.id === wishlist.id);
    if (index !== -1) {
      wishlists[index] = wishlist;
    } else {
      wishlists.push(wishlist);
    }
    this._saveToStorage('wishlists', wishlists);
  }

  // =========================
  // Private helpers: Category / product filtering
  // =========================

  _filterProductsByCategoryAndSubcategory(allProducts, categoryId, subCategory) {
    let products = Array.isArray(allProducts) ? allProducts.slice() : [];
    const sub = subCategory || '';

    if (!categoryId) {
      return products;
    }

    if (categoryId === 'saltwater') {
      // Saltwater section: filter by water_type first
      products = products.filter(p => p && (p.water_type === 'saltwater' || p.water_type === 'fresh_and_saltwater'));

      const s = sub.toLowerCase();
      if (s === 'rods' || s === 'saltwater_rods') {
        products = products.filter(p => p.product_sub_type === 'rod');
      } else if (s === 'reels' || s === 'saltwater_reels') {
        products = products.filter(p => p.product_sub_type === 'reel');
      } else if (s === 'lures' || s === 'saltwater_lures') {
        products = products.filter(p => p.product_sub_type === 'lure');
      }

      return products;
    }

    if (categoryId === 'deals') {
      // Deals / clearance: any product that is clearance / on sale or in deals category
      products = products.filter(p => p && (p.category_id === 'deals' || p.is_clearance === true || p.is_on_sale === true));

      const s = sub.toLowerCase();
      if (s === 'clearance_lures') {
        products = products.filter(p => p.product_sub_type === 'lure' && p.is_clearance === true);
      }

      return products;
    }

    // Default: strict category match
    products = products.filter(p => p && p.category_id === categoryId);

    const s = sub.toLowerCase();

    if (categoryId === 'rods') {
      if (s === 'spinning_rods') {
        products = products.filter(p => p.rod_style === 'spinning');
      } else if (s === 'baitcasting_rods') {
        products = products.filter(p => p.rod_style === 'casting');
      }
    }

    if (categoryId === 'apparel' && s === 'waders') {
      products = products.filter(p => p.product_sub_type === 'waders');
    }

    if (categoryId === 'lures' && s === 'clearance_lures') {
      products = products.filter(p => p.is_clearance === true);
    }

    return products;
  }

  _applyProductFilters(products, filters) {
    if (!filters || typeof filters !== 'object') {
      return products.slice();
    }

    let result = products.slice();

    if (typeof filters.minPrice === 'number') {
      result = result.filter(p => typeof p.price === 'number' && p.price >= filters.minPrice);
    }

    if (typeof filters.maxPrice === 'number') {
      result = result.filter(p => typeof p.price === 'number' && p.price <= filters.maxPrice);
    }

    if (typeof filters.minRating === 'number') {
      result = result.filter(p => typeof p.rating === 'number' && p.rating >= filters.minRating);
    }

    if (filters.waterType) {
      result = result.filter(p => p.water_type === filters.waterType);
    }

    if (Array.isArray(filters.targetSpecies) && filters.targetSpecies.length > 0) {
      const targets = filters.targetSpecies;
      result = result.filter(p => {
        if (!Array.isArray(p.target_species)) return false;
        return p.target_species.some(ts => targets.includes(ts));
      });
    }

    if (filters.rodStyle) {
      result = result.filter(p => p.rod_style === filters.rodStyle);
    }

    if (filters.rodPower) {
      result = result.filter(p => p.rod_power === filters.rodPower);
    }

    if (filters.lineType) {
      result = result.filter(p => p.line_type === filters.lineType);
    }

    if (typeof filters.spoolLengthYardsMin === 'number') {
      result = result.filter(p => typeof p.spool_length_yards === 'number' && p.spool_length_yards >= filters.spoolLengthYardsMin);
    }

    if (typeof filters.spoolLengthYardsMax === 'number') {
      result = result.filter(p => typeof p.spool_length_yards === 'number' && p.spool_length_yards <= filters.spoolLengthYardsMax);
    }

    if (filters.lureType) {
      result = result.filter(p => p.lure_type === filters.lureType);
    }

    if (filters.isClearanceOnly) {
      result = result.filter(p => p.is_clearance === true);
    }

    if (filters.isOnSaleOnly) {
      result = result.filter(p => p.is_on_sale === true);
    }

    if (typeof filters.discountPercentMin === 'number') {
      result = result.filter(p => typeof p.discount_percent === 'number' && p.discount_percent >= filters.discountPercentMin);
    }

    if (typeof filters.minNumberOfTrays === 'number') {
      result = result.filter(p => typeof p.number_of_trays === 'number' && p.number_of_trays >= filters.minNumberOfTrays);
    }

    if (typeof filters.minNumberOfCompartments === 'number') {
      result = result.filter(p => typeof p.number_of_compartments === 'number' && p.number_of_compartments >= filters.minNumberOfCompartments);
    }

    if (filters.sizeLabel) {
      result = result.filter(p => Array.isArray(p.available_sizes) && p.available_sizes.includes(filters.sizeLabel));
    }

    return result;
  }

  _sortProducts(products, sortBy, queryForRelevance) {
    const items = products.slice();
    const sortKey = sortBy || 'relevance';

    if (sortKey === 'price_low_to_high') {
      items.sort((a, b) => {
        const pa = typeof a.price === 'number' ? a.price : Infinity;
        const pb = typeof b.price === 'number' ? b.price : Infinity;
        if (pa === pb) return 0;
        return pa < pb ? -1 : 1;
      });
    } else if (sortKey === 'price_high_to_low') {
      items.sort((a, b) => {
        const pa = typeof a.price === 'number' ? a.price : -Infinity;
        const pb = typeof b.price === 'number' ? b.price : -Infinity;
        if (pa === pb) return 0;
        return pa > pb ? -1 : 1;
      });
    } else if (sortKey === 'rating_high_to_low') {
      items.sort((a, b) => {
        const ra = typeof a.rating === 'number' ? a.rating : 0;
        const rb = typeof b.rating === 'number' ? b.rating : 0;
        if (ra === rb) return 0;
        return ra > rb ? -1 : 1;
      });
    } else if (sortKey === 'most_reviewed') {
      items.sort((a, b) => {
        const ra = typeof a.review_count === 'number' ? a.review_count : 0;
        const rb = typeof b.review_count === 'number' ? b.review_count : 0;
        if (ra === rb) return 0;
        return ra > rb ? -1 : 1;
      });
    } else if (sortKey === 'relevance' && queryForRelevance) {
      const q = queryForRelevance.toLowerCase();
      items.sort((a, b) => {
        const scoreA = this._computeProductRelevanceScore(a, q);
        const scoreB = this._computeProductRelevanceScore(b, q);
        if (scoreA === scoreB) {
          const ra = typeof a.rating === 'number' ? a.rating : 0;
          const rb = typeof b.rating === 'number' ? b.rating : 0;
          if (ra === rb) return 0;
          return ra > rb ? -1 : 1;
        }
        return scoreA > scoreB ? -1 : 1;
      });
    }

    return items;
  }

  _computeProductRelevanceScore(product, lowerQuery) {
    let score = 0;
    if (!product) return 0;

    const fields = [
      { value: product.name, weight: 4 },
      { value: product.short_description, weight: 3 },
      { value: product.description, weight: 2 }
    ];

    for (const f of fields) {
      if (typeof f.value === 'string' && f.value.toLowerCase().includes(lowerQuery)) {
        score += f.weight;
      }
    }

    if (Array.isArray(product.tags)) {
      const joined = product.tags.join(' ').toLowerCase();
      if (joined.includes(lowerQuery)) score += 1;
    }

    if (Array.isArray(product.target_species)) {
      const joinedTs = product.target_species.join(' ').toLowerCase();
      if (joinedTs.includes(lowerQuery)) score += 1;
    }

    return score;
  }

  // =========================
  // Private helpers: Size guide
  // =========================

  _matchSizeGuideEntry(guideType, waistInches, inseamInches) {
    const entries = this.getSizeGuideEntries(guideType);
    if (!entries || entries.length === 0) {
      return { suggestedSizeLabel: null, matchedEntry: null };
    }

    const w = typeof waistInches === 'number' ? waistInches : null;
    const i = typeof inseamInches === 'number' ? inseamInches : null;

    // First try exact range match
    let exactMatches = entries.filter(entry => {
      let waistOk = true;
      let inseamOk = true;
      if (w !== null) {
        if (typeof entry.waist_min_inches === 'number' && w < entry.waist_min_inches) waistOk = false;
        if (typeof entry.waist_max_inches === 'number' && w > entry.waist_max_inches) waistOk = false;
      }
      if (i !== null) {
        if (typeof entry.inseam_min_inches === 'number' && i < entry.inseam_min_inches) inseamOk = false;
        if (typeof entry.inseam_max_inches === 'number' && i > entry.inseam_max_inches) inseamOk = false;
      }
      return waistOk && inseamOk;
    });

    if (exactMatches.length > 0) {
      const chosen = exactMatches[0];
      return {
        suggestedSizeLabel: chosen.size_label,
        matchedEntry: chosen
      };
    }

    // Fallback: closest by distance to midpoints
    let bestEntry = null;
    let bestDistance = Infinity;

    for (const entry of entries) {
      let waistMid = null;
      let inseamMid = null;

      if (typeof entry.waist_min_inches === 'number' && typeof entry.waist_max_inches === 'number') {
        waistMid = (entry.waist_min_inches + entry.waist_max_inches) / 2;
      } else if (typeof entry.waist_min_inches === 'number') {
        waistMid = entry.waist_min_inches;
      } else if (typeof entry.waist_max_inches === 'number') {
        waistMid = entry.waist_max_inches;
      }

      if (typeof entry.inseam_min_inches === 'number' && typeof entry.inseam_max_inches === 'number') {
        inseamMid = (entry.inseam_min_inches + entry.inseam_max_inches) / 2;
      } else if (typeof entry.inseam_min_inches === 'number') {
        inseamMid = entry.inseam_min_inches;
      } else if (typeof entry.inseam_max_inches === 'number') {
        inseamMid = entry.inseam_max_inches;
      }

      let distance = 0;
      if (w !== null && waistMid !== null) {
        distance += Math.pow(w - waistMid, 2);
      }
      if (i !== null && inseamMid !== null) {
        distance += Math.pow(i - inseamMid, 2);
      }

      if (distance < bestDistance) {
        bestDistance = distance;
        bestEntry = entry;
      }
    }

    if (!bestEntry) {
      bestEntry = entries[0];
    }

    return {
      suggestedSizeLabel: bestEntry.size_label,
      matchedEntry: bestEntry
    };
  }

  // ======================================================
  // Interface implementations
  // ======================================================

  // 1. getProductCategoriesForNav()
  getProductCategoriesForNav() {
    const categories = this._getFromStorage('product_categories', []);
    return categories
      .slice()
      .sort((a, b) => {
        const sa = typeof a.sort_order === 'number' ? a.sort_order : 0;
        const sb = typeof b.sort_order === 'number' ? b.sort_order : 0;
        if (sa === sb) {
          const na = a.name || '';
          const nb = b.name || '';
          return na.localeCompare(nb);
        }
        return sa - sb;
      });
  }

  // 2. getHomepageContentBlocks(maxFeaturedProductsPerGroup, maxBlogPosts)
  getHomepageContentBlocks(maxFeaturedProductsPerGroup, maxBlogPosts) {
    const maxProducts = typeof maxFeaturedProductsPerGroup === 'number' ? maxFeaturedProductsPerGroup : 8;
    const maxPosts = typeof maxBlogPosts === 'number' ? maxBlogPosts : 3;

    const featuredCategories = this.getProductCategoriesForNav();
    const allProducts = this._getFromStorage('products', []);

    const groups = [];

    // Group: Bass gear
    const bassProducts = allProducts.filter(p => Array.isArray(p.target_species) && p.target_species.includes('bass'));
    if (bassProducts.length > 0) {
      groups.push({
        title: 'Bass Essentials',
        description: 'Popular gear for bass fishing',
        context: 'bass_gear',
        products: bassProducts.slice(0, maxProducts)
      });
    }

    // Group: Saltwater starter
    const saltProducts = allProducts.filter(p => p.water_type === 'saltwater' || p.water_type === 'fresh_and_saltwater');
    if (saltProducts.length > 0) {
      groups.push({
        title: 'Saltwater Starter Picks',
        description: 'Rods, reels, and lures ready for the surf and bay',
        context: 'saltwater_starter',
        products: saltProducts.slice(0, maxProducts)
      });
    }

    // Group: Clearance crankbaits
    const clearanceCranks = allProducts.filter(p => p.is_clearance === true && p.lure_type === 'crankbait');
    if (clearanceCranks.length > 0) {
      groups.push({
        title: 'Clearance Crankbaits',
        description: 'Discounted freshwater crankbaits on clearance',
        context: 'clearance_crankbaits',
        products: clearanceCranks.slice(0, maxProducts)
      });
    }

    const quickLinks = [];
    const contextsAdded = new Set();
    for (const g of groups) {
      if (!contextsAdded.has(g.context)) {
        quickLinks.push({ label: g.title, context: g.context });
        contextsAdded.add(g.context);
      }
    }
    if (!contextsAdded.has('saltwater_kit') && saltProducts.length > 0) {
      quickLinks.push({ label: 'Build a Saltwater Starter Kit', context: 'saltwater_kit' });
      contextsAdded.add('saltwater_kit');
    }

    const recentBlogPosts = this.getRecentBlogPosts(maxPosts);

    return {
      featuredCategories,
      featuredProductGroups: groups,
      quickLinks,
      recentBlogPosts
    };
  }

  // 3. getRecentBlogPosts(limit)
  getRecentBlogPosts(limit) {
    const max = typeof limit === 'number' ? limit : 5;
    const posts = this._getFromStorage('blog_posts', []);
    const published = posts.filter(p => p.status === 'published');
    published.sort((a, b) => {
      const da = Date.parse(a.publish_date || '') || 0;
      const db = Date.parse(b.publish_date || '') || 0;
      return db - da;
    });
    return published.slice(0, max);
  }

  // 4. getCategoryFilterOptions(categoryId, subCategory)
  getCategoryFilterOptions(categoryId, subCategory) {
    const allProducts = this._getFromStorage('products', []);
    const products = this._filterProductsByCategoryAndSubcategory(allProducts, categoryId, subCategory);

    if (!products || products.length === 0) {
      return {
        price: { min: null, max: null, currency: 'USD', step: 1 },
        ratingOptions: [],
        waterTypes: [],
        targetSpecies: [],
        rodStyles: [],
        rodPowers: [],
        lineTypes: [],
        spoolLengthYardsRanges: [],
        lureTypes: [],
        discountRanges: [],
        trayCountOptions: [],
        sizeLabels: [],
        sizeGuideAvailable: false
      };
    }

    const prices = products.map(p => p.price).filter(v => typeof v === 'number');
    const minPrice = prices.length ? Math.min.apply(null, prices) : null;
    const maxPrice = prices.length ? Math.max.apply(null, prices) : null;

    const ratingSet = new Set();
    const waterTypeSet = new Set();
    const speciesSet = new Set();
    const rodStyleSet = new Set();
    const rodPowerSet = new Set();
    const lineTypeSet = new Set();
    const spoolSet = new Set();
    const lureTypeSet = new Set();
    const traySet = new Set();
    const sizeLabelSet = new Set();

    let maxDiscount = 0;
    let sizeGuideAvailable = false;

    for (const p of products) {
      if (typeof p.rating === 'number') ratingSet.add(p.rating);
      if (p.water_type) waterTypeSet.add(p.water_type);
      if (Array.isArray(p.target_species)) {
        for (const ts of p.target_species) speciesSet.add(ts);
      }
      if (p.rod_style && p.rod_style !== 'none') rodStyleSet.add(p.rod_style);
      if (p.rod_power && p.rod_power !== 'none') rodPowerSet.add(p.rod_power);
      if (p.line_type && p.line_type !== 'none') lineTypeSet.add(p.line_type);
      if (typeof p.spool_length_yards === 'number') spoolSet.add(p.spool_length_yards);
      if (p.lure_type && p.lure_type !== 'none') lureTypeSet.add(p.lure_type);
      if (typeof p.number_of_trays === 'number') traySet.add(p.number_of_trays);
      if (Array.isArray(p.available_sizes)) {
        for (const s of p.available_sizes) sizeLabelSet.add(s);
      }
      if (typeof p.discount_percent === 'number' && p.discount_percent > maxDiscount) {
        maxDiscount = p.discount_percent;
      }
      if (p.size_guide_type && p.size_guide_type !== 'none') {
        sizeGuideAvailable = true;
      }
    }

    const ratingOptions = Array.from(ratingSet).sort((a, b) => a - b);

    const spoolRanges = Array.from(spoolSet).sort((a, b) => a - b).map(v => ({
      label: v + ' yd',
      minYards: v,
      maxYards: v
    }));

    const discountRanges = [];
    if (maxDiscount >= 20) {
      discountRanges.push({ label: '20_percent_or_more', minPercent: 20 });
    }
    if (maxDiscount >= 40) {
      discountRanges.push({ label: '40_percent_or_more', minPercent: 40 });
    }

    return {
      price: {
        min: minPrice,
        max: maxPrice,
        currency: 'USD',
        step: 1
      },
      ratingOptions,
      waterTypes: Array.from(waterTypeSet),
      targetSpecies: Array.from(speciesSet),
      rodStyles: Array.from(rodStyleSet),
      rodPowers: Array.from(rodPowerSet),
      lineTypes: Array.from(lineTypeSet),
      spoolLengthYardsRanges: spoolRanges,
      lureTypes: Array.from(lureTypeSet),
      discountRanges,
      trayCountOptions: Array.from(traySet).sort((a, b) => a - b),
      sizeLabels: Array.from(sizeLabelSet),
      sizeGuideAvailable
    };
  }

  // 5. listCategoryProducts(categoryId, subCategory, filters, sortBy, page, pageSize)
  listCategoryProducts(categoryId, subCategory, filters, sortBy, page, pageSize) {
    const allProducts = this._getFromStorage('products', []);
    const categories = this._getFromStorage('product_categories', []);

    let products = this._filterProductsByCategoryAndSubcategory(allProducts, categoryId, subCategory);
    products = this._applyProductFilters(products, filters);

    const sortKey = sortBy || 'relevance';
    products = this._sortProducts(products, sortKey, null);

    const currentPage = typeof page === 'number' && page > 0 ? page : 1;
    const size = typeof pageSize === 'number' && pageSize > 0 ? pageSize : 24;

    const totalItems = products.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / size));
    const startIndex = (currentPage - 1) * size;
    const pageItems = products.slice(startIndex, startIndex + size);

    const items = pageItems.map(p => {
      const category = categories.find(c => c.id === p.category_id) || null;
      return {
        product: p,
        category_name: category ? category.name : null
      };
    });

    return {
      items,
      page: currentPage,
      pageSize: size,
      totalItems,
      totalPages,
      appliedSort: sortKey
    };
  }

  // 6. getSearchFilterOptions(query)
  getSearchFilterOptions(query) {
    const allProducts = this._getFromStorage('products', []);
    const q = (query || '').trim().toLowerCase();

    let products = allProducts;
    if (q) {
      products = products.filter(p => {
        if (!p) return false;
        if (typeof p.name === 'string' && p.name.toLowerCase().includes(q)) return true;
        if (typeof p.short_description === 'string' && p.short_description.toLowerCase().includes(q)) return true;
        if (typeof p.description === 'string' && p.description.toLowerCase().includes(q)) return true;
        if (Array.isArray(p.tags) && p.tags.join(' ').toLowerCase().includes(q)) return true;
        if (Array.isArray(p.target_species) && p.target_species.join(' ').toLowerCase().includes(q)) return true;
        return false;
      });
    }

    if (!products || products.length === 0) {
      return {
        price: { min: null, max: null, currency: 'USD', step: 1 },
        ratingOptions: [],
        waterTypes: [],
        lineTypes: [],
        spoolLengthYardsRanges: [],
        lureTypes: [],
        trayCountOptions: [],
        sizeLabels: [],
        discountRanges: []
      };
    }

    const prices = products.map(p => p.price).filter(v => typeof v === 'number');
    const minPrice = prices.length ? Math.min.apply(null, prices) : null;
    const maxPrice = prices.length ? Math.max.apply(null, prices) : null;

    const ratingSet = new Set();
    const waterTypeSet = new Set();
    const lineTypeSet = new Set();
    const spoolSet = new Set();
    const lureTypeSet = new Set();
    const traySet = new Set();
    const sizeLabelSet = new Set();

    let maxDiscount = 0;

    for (const p of products) {
      if (typeof p.rating === 'number') ratingSet.add(p.rating);
      if (p.water_type) waterTypeSet.add(p.water_type);
      if (p.line_type && p.line_type !== 'none') lineTypeSet.add(p.line_type);
      if (typeof p.spool_length_yards === 'number') spoolSet.add(p.spool_length_yards);
      if (p.lure_type && p.lure_type !== 'none') lureTypeSet.add(p.lure_type);
      if (typeof p.number_of_trays === 'number') traySet.add(p.number_of_trays);
      if (Array.isArray(p.available_sizes)) {
        for (const s of p.available_sizes) sizeLabelSet.add(s);
      }
      if (typeof p.discount_percent === 'number' && p.discount_percent > maxDiscount) {
        maxDiscount = p.discount_percent;
      }
    }

    const spoolRanges = Array.from(spoolSet).sort((a, b) => a - b).map(v => ({
      label: v + ' yd',
      minYards: v,
      maxYards: v
    }));

    const discountRanges = [];
    if (maxDiscount >= 20) {
      discountRanges.push({ label: '20_percent_or_more', minPercent: 20 });
    }
    if (maxDiscount >= 40) {
      discountRanges.push({ label: '40_percent_or_more', minPercent: 40 });
    }

    return {
      price: {
        min: minPrice,
        max: maxPrice,
        currency: 'USD',
        step: 1
      },
      ratingOptions: Array.from(ratingSet).sort((a, b) => a - b),
      waterTypes: Array.from(waterTypeSet),
      lineTypes: Array.from(lineTypeSet),
      spoolLengthYardsRanges: spoolRanges,
      lureTypes: Array.from(lureTypeSet),
      trayCountOptions: Array.from(traySet).sort((a, b) => a - b),
      sizeLabels: Array.from(sizeLabelSet),
      discountRanges
    };
  }

  // 7. searchProducts(query, filters, sortBy, page, pageSize)
  searchProducts(query, filters, sortBy, page, pageSize) {
    const allProducts = this._getFromStorage('products', []);
    const categories = this._getFromStorage('product_categories', []);

    const q = (query || '').trim().toLowerCase();

    let products = allProducts;
    if (q) {
      products = products.filter(p => {
        if (!p) return false;
        if (typeof p.name === 'string' && p.name.toLowerCase().includes(q)) return true;
        if (typeof p.short_description === 'string' && p.short_description.toLowerCase().includes(q)) return true;
        if (typeof p.description === 'string' && p.description.toLowerCase().includes(q)) return true;
        if (Array.isArray(p.tags) && p.tags.join(' ').toLowerCase().includes(q)) return true;
        if (Array.isArray(p.target_species) && p.target_species.join(' ').toLowerCase().includes(q)) return true;
        return false;
      });
    }

    products = this._applyProductFilters(products, filters);

    const sortKey = sortBy || 'relevance';
    products = this._sortProducts(products, sortKey, q || null);

    const currentPage = typeof page === 'number' && page > 0 ? page : 1;
    const size = typeof pageSize === 'number' && pageSize > 0 ? pageSize : 24;

    const totalItems = products.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / size));
    const startIndex = (currentPage - 1) * size;
    const pageItems = products.slice(startIndex, startIndex + size);

    const items = pageItems.map(p => {
      const category = categories.find(c => c.id === p.category_id) || null;
      return {
        product: p,
        category_name: category ? category.name : null
      };
    });

    return {
      items,
      page: currentPage,
      pageSize: size,
      totalItems,
      totalPages,
      appliedSort: sortKey
    };
  }

  // 8. getProductDetails(productId)
  getProductDetails(productId) {
    const products = this._getFromStorage('products', []);
    const categories = this._getFromStorage('product_categories', []);

    const product = products.find(p => p.id === productId) || null;
    if (!product) {
      return {
        product: null,
        category_name: null,
        sizeGuideAvailable: false,
        sizeGuideType: 'none',
        availablePowers: [],
        availableLbTests: [],
        availableColors: [],
        availableSizes: [],
        relatedProducts: []
      };
    }

    const category = categories.find(c => c.id === product.category_id) || null;

    const availablePowers = product.rod_power && product.rod_power !== 'none' ? [product.rod_power] : [];

    const availableLbTests = Array.isArray(product.lb_test_options)
      ? product.lb_test_options
      : typeof product.max_lb_test === 'number'
        ? [product.max_lb_test]
        : [];

    const availableColors = Array.isArray(product.color_options) ? product.color_options : [];

    const availableSizes = Array.isArray(product.available_sizes) ? product.available_sizes : [];

    const relatedProducts = this.getRelatedProducts(product.id, 6);

    return {
      product,
      category_name: category ? category.name : null,
      sizeGuideAvailable: !!(product.size_guide_type && product.size_guide_type !== 'none'),
      sizeGuideType: product.size_guide_type || 'none',
      availablePowers,
      availableLbTests,
      availableColors,
      availableSizes,
      relatedProducts
    };
  }

  // 9. getRelatedProducts(productId, maxResults)
  getRelatedProducts(productId, maxResults) {
    const products = this._getFromStorage('products', []);
    const max = typeof maxResults === 'number' ? maxResults : 6;

    const base = products.find(p => p.id === productId);
    if (!base) return [];

    const candidates = products.filter(p => p.id !== productId);

    candidates.sort((a, b) => {
      let scoreA = 0;
      let scoreB = 0;

      if (a.category_id === base.category_id) scoreA += 3;
      if (b.category_id === base.category_id) scoreB += 3;

      if (a.water_type && base.water_type && a.water_type === base.water_type) scoreA += 2;
      if (b.water_type && base.water_type && b.water_type === base.water_type) scoreB += 2;

      if (Array.isArray(a.target_species) && Array.isArray(base.target_species)) {
        if (a.target_species.some(ts => base.target_species.includes(ts))) scoreA += 2;
      }
      if (Array.isArray(b.target_species) && Array.isArray(base.target_species)) {
        if (b.target_species.some(ts => base.target_species.includes(ts))) scoreB += 2;
      }

      const ra = typeof a.rating === 'number' ? a.rating : 0;
      const rb = typeof b.rating === 'number' ? b.rating : 0;
      scoreA += ra * 0.1;
      scoreB += rb * 0.1;

      if (scoreA === scoreB) return 0;
      return scoreA > scoreB ? -1 : 1;
    });

    return candidates.slice(0, max);
  }

  // 10. addToCart(productId, quantity, options)
  addToCart(productId, quantity, options) {
    const products = this._getFromStorage('products', []);
    const product = products.find(p => p.id === productId);
    if (!product) {
      return { success: false, cart: null, addedItem: null, message: 'Product not found' };
    }

    const qty = typeof quantity === 'number' && quantity > 0 ? quantity : 1;
    const opts = options || {};

    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items', []);

    let existingItem = cartItems.find(ci =>
      ci.cart_id === cart.id &&
      ci.product_id === productId &&
      ci.selected_size === (opts.selectedSize || null) &&
      ci.selected_power === (opts.selectedPower || null) &&
      ci.selected_lb_test === (typeof opts.selectedLbTest === 'number' ? opts.selectedLbTest : null) &&
      ci.selected_color === (opts.selectedColor || null)
    );

    if (existingItem) {
      existingItem.quantity = (existingItem.quantity || 0) + qty;
      existingItem.line_subtotal = existingItem.quantity * (existingItem.unit_price || 0);
      existingItem.updated_at = this._now();
    } else {
      existingItem = {
        id: this._generateId('cartitem'),
        cart_id: cart.id,
        product_id: productId,
        quantity: qty,
        unit_price: product.price,
        line_subtotal: qty * product.price,
        selected_size: opts.selectedSize || null,
        selected_power: opts.selectedPower || null,
        selected_lb_test: typeof opts.selectedLbTest === 'number' ? opts.selectedLbTest : null,
        selected_color: opts.selectedColor || null,
        created_at: this._now()
      };
      cartItems.push(existingItem);
      if (!Array.isArray(cart.items)) cart.items = [];
      if (!cart.items.includes(existingItem.id)) cart.items.push(existingItem.id);
    }

    this._saveToStorage('cart_items', cartItems);
    const updatedCart = this._recalculateCartTotals(cart);

    return {
      success: true,
      cart: updatedCart,
      addedItem: existingItem,
      message: 'Added to cart'
    };
  }

  // 11. getCart()
  getCart() {
    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items', []);
    const products = this._getFromStorage('products', []);
    const categories = this._getFromStorage('product_categories', []);

    const updatedCart = this._recalculateCartTotals(cart);

    const items = cartItems
      .filter(ci => ci.cart_id === updatedCart.id)
      .map(ci => {
        const product = products.find(p => p.id === ci.product_id) || null;
        const category = product ? (categories.find(c => c.id === product.category_id) || null) : null;
        const lineItemTotal = ci.line_subtotal || 0;
        return {
          cartItem: ci,
          product,
          category_name: category ? category.name : null,
          lineItemTotal
        };
      });

    return {
      cart: updatedCart,
      items
    };
  }

  // 12. updateCartItemQuantity(cartItemId, quantity)
  updateCartItemQuantity(cartItemId, quantity) {
    const newQty = typeof quantity === 'number' ? quantity : 0;
    const cartItems = this._getFromStorage('cart_items', []);
    const idx = cartItems.findIndex(ci => ci.id === cartItemId);
    if (idx === -1) {
      return { success: false, cart: null, updatedItem: null, message: 'Cart item not found' };
    }

    const item = cartItems[idx];

    if (newQty <= 0) {
      // Remove item
      const cartId = item.cart_id;
      cartItems.splice(idx, 1);
      this._saveToStorage('cart_items', cartItems);
      const carts = this._getFromStorage('carts', []);
      const cart = carts.find(c => c.id === cartId) || this._getOrCreateCart();

      if (cart && Array.isArray(cart.items)) {
        cart.items = cart.items.filter(id => id !== cartItemId);
      }
      this._updateCartInStorage(cart);
      const updatedCart = this._recalculateCartTotals(cart);

      return {
        success: true,
        cart: updatedCart,
        updatedItem: null,
        message: 'Cart item removed'
      };
    }

    item.quantity = newQty;
    item.line_subtotal = newQty * (item.unit_price || 0);
    item.updated_at = this._now();
    cartItems[idx] = item;
    this._saveToStorage('cart_items', cartItems);

    const carts = this._getFromStorage('carts', []);
    const cart = carts.find(c => c.id === item.cart_id) || this._getOrCreateCart();
    const updatedCart = this._recalculateCartTotals(cart);

    return {
      success: true,
      cart: updatedCart,
      updatedItem: item,
      message: 'Cart item quantity updated'
    };
  }

  // 13. removeCartItem(cartItemId)
  removeCartItem(cartItemId) {
    const cartItems = this._getFromStorage('cart_items', []);
    const idx = cartItems.findIndex(ci => ci.id === cartItemId);
    if (idx === -1) {
      return { success: false, cart: null, message: 'Cart item not found' };
    }

    const item = cartItems[idx];
    const cartId = item.cart_id;

    cartItems.splice(idx, 1);
    this._saveToStorage('cart_items', cartItems);

    const carts = this._getFromStorage('carts', []);
    const cart = carts.find(c => c.id === cartId) || this._getOrCreateCart();

    if (cart && Array.isArray(cart.items)) {
      cart.items = cart.items.filter(id => id !== cartItemId);
    }
    this._updateCartInStorage(cart);
    const updatedCart = this._recalculateCartTotals(cart);

    return {
      success: true,
      cart: updatedCart,
      message: 'Cart item removed'
    };
  }

  // 14. applyPromoCodeToCart(promoCode)
  applyPromoCodeToCart(promoCode) {
    const code = (promoCode || '').trim();
    const cart = this._getOrCreateCart();
    cart.applied_promo_code = code || null;
    this._updateCartInStorage(cart);

    const updatedCart = this._recalculateCartTotals(cart);

    const success = !!updatedCart.applied_promo_code;
    return {
      success,
      cart: updatedCart,
      appliedPromoCode: updatedCart.applied_promo_code,
      message: success ? 'Promo code applied' : 'Promo code invalid or not applicable'
    };
  }

  // 15. createOrUpdateCheckoutSession(shipping, promoCode)
  createOrUpdateCheckoutSession(shipping, promoCode) {
    const shippingInfo = shipping || {};
    const cart = this._getOrCreateCart();

    if (promoCode) {
      cart.applied_promo_code = promoCode;
      this._updateCartInStorage(cart);
      this._recalculateCartTotals(cart);
    }

    const sessions = this._getFromStorage('checkout_sessions', []);
    let session = sessions.find(s => s.status === 'in_progress');

    if (!session) {
      session = {
        id: this._generateId('checkout'),
        cart_id: cart.id,
        shipping_full_name: shippingInfo.fullName || '',
        shipping_address_line1: shippingInfo.addressLine1 || '',
        shipping_address_line2: shippingInfo.addressLine2 || '',
        shipping_city: shippingInfo.city || '',
        shipping_state: shippingInfo.state || '',
        shipping_postal_code: shippingInfo.postalCode || '',
        shipping_phone: shippingInfo.phone || '',
        promo_code: promoCode || cart.applied_promo_code || null,
        status: 'in_progress',
        created_at: this._now(),
        updated_at: this._now()
      };
      sessions.push(session);
    } else {
      session.cart_id = cart.id;
      if (Object.prototype.hasOwnProperty.call(shippingInfo, 'fullName')) session.shipping_full_name = shippingInfo.fullName;
      if (Object.prototype.hasOwnProperty.call(shippingInfo, 'addressLine1')) session.shipping_address_line1 = shippingInfo.addressLine1;
      if (Object.prototype.hasOwnProperty.call(shippingInfo, 'addressLine2')) session.shipping_address_line2 = shippingInfo.addressLine2;
      if (Object.prototype.hasOwnProperty.call(shippingInfo, 'city')) session.shipping_city = shippingInfo.city;
      if (Object.prototype.hasOwnProperty.call(shippingInfo, 'state')) session.shipping_state = shippingInfo.state;
      if (Object.prototype.hasOwnProperty.call(shippingInfo, 'postalCode')) session.shipping_postal_code = shippingInfo.postalCode;
      if (Object.prototype.hasOwnProperty.call(shippingInfo, 'phone')) session.shipping_phone = shippingInfo.phone;

      if (promoCode) {
        session.promo_code = promoCode;
      } else if (cart.applied_promo_code) {
        session.promo_code = cart.applied_promo_code;
      }

      session.updated_at = this._now();
    }

    this._saveToStorage('checkout_sessions', sessions);
    return session;
  }

  // 16. getCheckoutSession()
  getCheckoutSession() {
    const sessions = this._getFromStorage('checkout_sessions', []);
    const cartRecords = this._getFromStorage('carts', []);
    const cartItems = this._getFromStorage('cart_items', []);
    const products = this._getFromStorage('products', []);

    const session = sessions.find(s => s.status === 'in_progress') || null;
    if (!session) {
      return { checkoutSession: null, cart: null, items: [] };
    }

    let cart = cartRecords.find(c => c.id === session.cart_id) || null;
    if (!cart) {
      cart = this._getOrCreateCart();
    }
    const updatedCart = this._recalculateCartTotals(cart);

    const items = cartItems
      .filter(ci => ci.cart_id === updatedCart.id)
      .map(ci => {
        const product = products.find(p => p.id === ci.product_id) || null;
        return {
          cartItem: ci,
          product
        };
      });

    return {
      checkoutSession: session,
      cart: updatedCart,
      items
    };
  }

  // 17. addToWishlist(productId, options)
  addToWishlist(productId, options) {
    const products = this._getFromStorage('products', []);
    const product = products.find(p => p.id === productId);
    if (!product) {
      return { wishlist: null, addedItem: null, success: false, message: 'Product not found' };
    }

    const opts = options || {};
    const wishlist = this._getOrCreateWishlist();
    const wishlistItems = this._getFromStorage('wishlist_items', []);

    let existingItem = wishlistItems.find(wi =>
      wi.wishlist_id === wishlist.id &&
      wi.product_id === productId &&
      wi.selected_size === (opts.selectedSize || null) &&
      wi.selected_power === (opts.selectedPower || null) &&
      wi.selected_lb_test === (typeof opts.selectedLbTest === 'number' ? opts.selectedLbTest : null) &&
      wi.selected_color === (opts.selectedColor || null)
    );

    if (!existingItem) {
      existingItem = {
        id: this._generateId('wishlistitem'),
        wishlist_id: wishlist.id,
        product_id: productId,
        selected_size: opts.selectedSize || null,
        selected_power: opts.selectedPower || null,
        selected_lb_test: typeof opts.selectedLbTest === 'number' ? opts.selectedLbTest : null,
        selected_color: opts.selectedColor || null,
        created_at: this._now()
      };
      wishlistItems.push(existingItem);

      if (!Array.isArray(wishlist.items)) wishlist.items = [];
      if (!wishlist.items.includes(existingItem.id)) wishlist.items.push(existingItem.id);

      wishlist.updated_at = this._now();
      this._updateWishlistInStorage(wishlist);
      this._saveToStorage('wishlist_items', wishlistItems);

      return {
        wishlist,
        addedItem: existingItem,
        success: true,
        message: 'Added to wishlist'
      };
    }

    // Already exists
    return {
      wishlist,
      addedItem: existingItem,
      success: true,
      message: 'Already in wishlist'
    };
  }

  // 18. removeWishlistItem(wishlistItemId)
  removeWishlistItem(wishlistItemId) {
    const wishlistItems = this._getFromStorage('wishlist_items', []);
    const idx = wishlistItems.findIndex(wi => wi.id === wishlistItemId);
    if (idx === -1) {
      return { wishlist: null, success: false, message: 'Wishlist item not found' };
    }

    const item = wishlistItems[idx];
    const wishlistId = item.wishlist_id;

    wishlistItems.splice(idx, 1);
    this._saveToStorage('wishlist_items', wishlistItems);

    const wishlists = this._getFromStorage('wishlists', []);
    const wishlist = wishlists.find(w => w.id === wishlistId) || this._getOrCreateWishlist();

    if (Array.isArray(wishlist.items)) {
      wishlist.items = wishlist.items.filter(id => id !== wishlistItemId);
    }
    wishlist.updated_at = this._now();
    this._updateWishlistInStorage(wishlist);

    return {
      wishlist,
      success: true,
      message: 'Wishlist item removed'
    };
  }

  // 19. getWishlist()
  getWishlist() {
    const wishlist = this._getOrCreateWishlist();
    const wishlistItems = this._getFromStorage('wishlist_items', []);
    const products = this._getFromStorage('products', []);

    const items = wishlistItems
      .filter(wi => wi.wishlist_id === wishlist.id)
      .map(wi => {
        const product = products.find(p => p.id === wi.product_id) || null;
        return {
          wishlistItem: wi,
          product
        };
      });

    return {
      wishlist,
      items
    };
  }

  // 20. getBlogCategoriesAndTags()
  getBlogCategoriesAndTags() {
    const categories = this._getFromStorage('blog_categories', []);
    const posts = this._getFromStorage('blog_posts', []);

    const tagSet = new Set();
    for (const p of posts) {
      if (Array.isArray(p.tags)) {
        for (const t of p.tags) tagSet.add(t);
      }
    }

    return {
      categories,
      tags: Array.from(tagSet)
    };
  }

  // 21. listBlogPosts(searchQuery, blogCategoryId, tagSlugs, year, month, sortBy, page, pageSize)
  listBlogPosts(searchQuery, blogCategoryId, tagSlugs, year, month, sortBy, page, pageSize) {
    const posts = this._getFromStorage('blog_posts', []);

    const q = (searchQuery || '').trim().toLowerCase();
    const tagList = Array.isArray(tagSlugs) ? tagSlugs : [];
    const yearNum = typeof year === 'number' ? year : null;
    const monthNum = typeof month === 'number' ? month : null;

    let result = posts.filter(p => p.status === 'published');

    if (q) {
      result = result.filter(p => {
        if ((p.title || '').toLowerCase().includes(q)) return true;
        if ((p.excerpt || '').toLowerCase().includes(q)) return true;
        if ((p.content_html || '').toLowerCase().includes(q)) return true;
        return false;
      });
    }

    if (blogCategoryId) {
      result = result.filter(p => Array.isArray(p.category_ids) && p.category_ids.includes(blogCategoryId));
    }

    if (tagList.length > 0) {
      result = result.filter(p => {
        if (!Array.isArray(p.tags)) return false;
        return p.tags.some(t => tagList.includes(t));
      });
    }

    if (yearNum || monthNum) {
      result = result.filter(p => {
        const ts = Date.parse(p.publish_date || '');
        if (Number.isNaN(ts)) return false;
        const d = new Date(ts);
        if (yearNum && d.getUTCFullYear() !== yearNum) return false;
        if (monthNum && (d.getUTCMonth() + 1) !== monthNum) return false;
        return true;
      });
    }

    const sortKey = sortBy || 'publish_date_desc';
    if (sortKey === 'publish_date_asc') {
      result.sort((a, b) => {
        const da = Date.parse(a.publish_date || '') || 0;
        const db = Date.parse(b.publish_date || '') || 0;
        return da - db;
      });
    } else {
      // default: publish_date_desc
      result.sort((a, b) => {
        const da = Date.parse(a.publish_date || '') || 0;
        const db = Date.parse(b.publish_date || '') || 0;
        return db - da;
      });
    }

    const currentPage = typeof page === 'number' && page > 0 ? page : 1;
    const size = typeof pageSize === 'number' && pageSize > 0 ? pageSize : 10;

    const totalItems = result.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / size));
    const startIndex = (currentPage - 1) * size;
    const pageItems = result.slice(startIndex, startIndex + size);

    return {
      items: pageItems,
      page: currentPage,
      pageSize: size,
      totalItems,
      totalPages
    };
  }

  // 22. getBlogPostDetails(slug)
  getBlogPostDetails(slug) {
    const posts = this._getFromStorage('blog_posts', []);
    const categories = this._getFromStorage('blog_categories', []);

    const post = posts.find(p => p.slug === slug && p.status === 'published') || null;
    if (!post) {
      return {
        post: null,
        categories: [],
        tagNames: []
      };
    }

    const postCategories = Array.isArray(post.category_ids)
      ? categories.filter(c => post.category_ids.includes(c.id))
      : [];

    const tagNames = Array.isArray(post.tags) ? post.tags.slice() : [];

    return {
      post,
      categories: postCategories,
      tagNames
    };
  }

  // 23. getBlogPostFeaturedProducts(blogPostId)
  getBlogPostFeaturedProducts(blogPostId) {
    const posts = this._getFromStorage('blog_posts', []);
    const products = this._getFromStorage('products', []);

    const post = posts.find(p => p.id === blogPostId) || null;
    if (!post || !Array.isArray(post.featured_product_refs)) {
      return [];
    }

    const refs = post.featured_product_refs.map(ref => {
      const productId = ref.productId || ref.product_id;
      const orderIndex = typeof ref.orderIndex === 'number' ? ref.orderIndex : ref.order_index;
      const product = products.find(pr => pr.id === productId) || null;
      return {
        orderIndex: typeof orderIndex === 'number' ? orderIndex : 0,
        product
      };
    });

    refs.sort((a, b) => a.orderIndex - b.orderIndex);
    return refs;
  }

  // 24. getSizeGuideEntries(guideType)
  getSizeGuideEntries(guideType) {
    const entries = this._getFromStorage('size_guide_entries', []);
    return entries.filter(e => e.guide_type === guideType);
  }

  // 25. suggestSizeForMeasurements(guideType, waistInches, inseamInches)
  suggestSizeForMeasurements(guideType, waistInches, inseamInches) {
    const result = this._matchSizeGuideEntry(guideType, waistInches, inseamInches);

    // Instrumentation for task completion tracking (Task 7)
    try {
      if (guideType === 'waders') {
        localStorage.setItem(
          'task7_sizeGuideUsage',
          JSON.stringify({
            guideType,
            waistInches,
            inseamInches,
            suggestedSizeLabel: result.suggestedSizeLabel,
            timestamp: this._now()
          })
        );
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return result;
  }

  // 26. getStaticPageContent(pageSlug)
  getStaticPageContent(pageSlug) {
    const pages = this._getFromStorage('static_pages', {});
    const key = pageSlug || '';
    const entry = pages[key] || null;
    if (!entry) {
      return {
        title: '',
        contentHtml: ''
      };
    }
    return {
      title: entry.title || '',
      contentHtml: entry.contentHtml || ''
    };
  }

  // 27. submitContactForm(name, email, subject, message)
  submitContactForm(name, email, subject, message) {
    const messages = this._getFromStorage('contact_messages', []);
    const record = {
      id: this._generateId('contact'),
      name: name || '',
      email: email || '',
      subject: subject || '',
      message: message || '',
      created_at: this._now()
    };

    messages.push(record);
    this._saveToStorage('contact_messages', messages);

    return {
      success: true,
      message: 'Contact form submitted'
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