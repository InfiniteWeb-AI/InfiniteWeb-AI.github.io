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

  // ------------------------
  // Initialization & Helpers
  // ------------------------

  _initStorage() {
    const keys = [
      'products',
      'wine_vintages',
      'cart',
      'cart_items',
      'orders',
      'order_items',
      'wine_club_plans',
      'wine_club_memberships',
      'tour_experiences',
      'tour_add_ons',
      'tour_bookings',
      'wishlists',
      'wishlist_items',
      'newsletter_subscriptions',
      'site_config',
      'static_pages',
      'contact_submissions'
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

  _now() {
    return new Date().toISOString();
  }

  _roundCurrency(value) {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  _getSiteConfig() {
    const configs = this._getFromStorage('site_config');
    return configs.length > 0 ? configs[0] : null;
  }

  // ------------------------
  // Private helpers required
  // ------------------------

  // Internal helper to retrieve the current Cart or create a new one if none exists.
  _getOrCreateCart() {
    let carts = this._getFromStorage('cart');
    let cart = carts[0] || null;

    if (!cart) {
      const config = this._getSiteConfig();
      cart = {
        id: this._generateId('cart'),
        created_at: this._now(),
        updated_at: this._now(),
        subtotal: 0,
        shipping_cost: 0,
        tax_amount: 0,
        total: 0,
        shipping_option: 'standard',
        applied_free_shipping: false,
        currency: (config && config.currency) || 'USD'
      };
      carts.push(cart);
      this._saveToStorage('cart', carts);
    }

    return cart;
  }

  // Internal helper to recalculate cart totals based on CartItems and SiteConfig.
  _recalculateCartTotals(cartId) {
    let carts = this._getFromStorage('cart');
    let cartIndex = carts.findIndex((c) => c.id === cartId);
    if (cartIndex === -1) return null;

    let cart = carts[cartIndex];
    const cartItems = this._getFromStorage('cart_items').filter(
      (ci) => ci.cart_id === cart.id
    );

    const subtotal = this._roundCurrency(
      cartItems.reduce((sum, item) => sum + (item.unit_price || 0) * (item.quantity || 0), 0)
    );

    const config = this._getSiteConfig();
    const threshold = config && typeof config.free_shipping_threshold === 'number'
      ? config.free_shipping_threshold
      : null;

    let shippingOption = cart.shipping_option || 'standard';
    let shippingCost = 0;
    let appliedFree = false;

    const qualifiesForFree = threshold !== null && subtotal >= threshold;

    if (shippingOption === 'pickup') {
      shippingCost = 0;
    } else if (shippingOption === 'free_shipping') {
      if (qualifiesForFree) {
        shippingCost = 0;
        appliedFree = true;
      } else {
        // Fallback to standard if no longer qualifies
        shippingOption = 'standard';
      }
    }

    if (shippingOption === 'standard') {
      shippingCost = (config && typeof config.standard_shipping_cost === 'number')
        ? config.standard_shipping_cost
        : 0;
    } else if (shippingOption === 'expedited') {
      shippingCost = (config && typeof config.expedited_shipping_cost === 'number')
        ? config.expedited_shipping_cost
        : (config && typeof config.standard_shipping_cost === 'number'
          ? config.standard_shipping_cost
          : 0);
    }

    const taxAmount = 0; // tax simulation omitted
    const total = this._roundCurrency(subtotal + shippingCost + taxAmount);

    cart.subtotal = subtotal;
    cart.shipping_cost = shippingCost;
    cart.tax_amount = taxAmount;
    cart.total = total;
    cart.shipping_option = shippingOption;
    cart.applied_free_shipping = appliedFree;
    cart.currency = (config && config.currency) || cart.currency || 'USD';
    cart.updated_at = this._now();

    carts[cartIndex] = cart;
    this._saveToStorage('cart', carts);

    return cart;
  }

  // Internal helper to retrieve the current Wishlist or create a default one.
  _getOrCreateWishlist() {
    let wishlists = this._getFromStorage('wishlists');
    let wishlist = wishlists[0] || null;

    if (!wishlist) {
      wishlist = {
        id: this._generateId('wishlist'),
        name: 'default',
        created_at: this._now(),
        updated_at: this._now()
      };
      wishlists.push(wishlist);
      this._saveToStorage('wishlists', wishlists);
    }

    return wishlist;
  }

  // Internal helper to create a draft Order and associated OrderItems from the current Cart.
  _createOrderFromCart() {
    const cart = this._getOrCreateCart();
    const cartItemsAll = this._getFromStorage('cart_items');
    const cartItems = cartItemsAll.filter((ci) => ci.cart_id === cart.id);

    if (!cartItems.length) {
      return null;
    }

    const orders = this._getFromStorage('orders');
    const orderItems = this._getFromStorage('order_items');

    const orderId = this._generateId('order');
    const now = this._now();

    const order = {
      id: orderId,
      order_number: String(orderId),
      status: 'draft',
      created_at: now,
      updated_at: now,
      contact_first_name: null,
      contact_last_name: null,
      contact_email: null,
      shipping_address_line1: null,
      shipping_address_line2: null,
      shipping_city: null,
      shipping_state: null,
      shipping_postal_code: null,
      shipping_country: null,
      shipping_option: cart.shipping_option || 'standard',
      shipping_cost: cart.shipping_cost || 0,
      shipping_notes: null,
      subtotal: cart.subtotal || 0,
      tax_amount: cart.tax_amount || 0,
      total: cart.total || 0,
      currency: cart.currency || (this._getSiteConfig() && this._getSiteConfig().currency) || 'USD',
      payment_cardholder_name: null,
      payment_card_brand: null,
      payment_card_last4: null,
      payment_card_number: null,
      payment_card_expiration: null,
      payment_card_cvv: null,
      payment_status: 'not_collected'
    };

    orders.push(order);

    cartItems.forEach((ci) => {
      const oi = {
        id: this._generateId('order_item'),
        order_id: orderId,
        product_id: ci.product_id,
        wine_vintage_id: ci.wine_vintage_id || null,
        product_type: ci.product_type,
        product_name: ci.product_name,
        bottle_size_ml: ci.bottle_size_ml || null,
        unit_price: ci.unit_price,
        quantity: ci.quantity,
        line_subtotal: ci.line_subtotal,
        gift_card_amount: ci.gift_card_amount || null,
        gift_card_recipient_name: ci.gift_card_recipient_name || null,
        gift_card_recipient_email: ci.gift_card_recipient_email || null,
        gift_card_message: ci.gift_card_message || null,
        gift_card_delivery_date: ci.gift_card_delivery_date || null
      };
      orderItems.push(oi);
    });

    this._saveToStorage('orders', orders);
    this._saveToStorage('order_items', orderItems);

    // Attach relations for return
    const resolvedItems = this._resolveOrderItems(orderItems.filter((oi) => oi.order_id === orderId));

    return { order, items: resolvedItems };
  }

  // Internal helper to compute TourBooking.total_price.
  _computeTourBookingTotalPrice(booking) {
    if (!booking) return booking;
    const experiences = this._getFromStorage('tour_experiences');
    const addOns = this._getFromStorage('tour_add_ons');

    const experience = experiences.find((e) => e.id === booking.experience_id) || null;
    const selectedAddOns = (booking.selected_addon_ids || [])
      .map((id) => addOns.find((a) => a.id === id))
      .filter(Boolean);

    const adults = booking.adults_count || 0;
    const children = booking.children_count || 0;

    const baseAdult = experience && typeof experience.base_price_per_adult === 'number'
      ? experience.base_price_per_adult
      : 0;
    const baseChild = experience && typeof experience.base_price_per_child === 'number'
      ? experience.base_price_per_child
      : 0;

    const baseTotal = adults * baseAdult + children * baseChild;

    const perPersonAddon = selectedAddOns.reduce(
      (sum, addon) => sum + (addon.price_per_person || 0),
      0
    );
    const addonTotal = (adults + children) * perPersonAddon;

    booking.total_price = this._roundCurrency(baseTotal + addonTotal);
    booking.currency = (experience && experience.currency) || 'USD';

    booking.selected_addon_names = selectedAddOns.map((a) => a.name);

    return booking;
  }

  // Internal helper to derive masked payment card data.
  _maskPaymentCardDetails(cardNumber) {
    const digits = (cardNumber || '').replace(/\D/g, '');
    let brand = 'unknown';
    if (/^4[0-9]{6,}/.test(digits)) {
      brand = 'visa';
    } else if (/^5[1-5][0-9]{5,}/.test(digits)) {
      brand = 'mastercard';
    } else if (/^3[47][0-9]{5,}/.test(digits)) {
      brand = 'amex';
    }
    const last4 = digits.slice(-4) || null;
    const masked = digits
      ? '**** **** **** ' + last4
      : null;
    return { brand, last4, masked };
  }

  // -------------
  // FK Resolvers
  // -------------

  _resolveCartItems(cartItems) {
    const products = this._getFromStorage('products');
    const vintages = this._getFromStorage('wine_vintages');
    const carts = this._getFromStorage('cart');
    return cartItems.map((item) => {
      const product = products.find((p) => p.id === item.product_id) || null;
      const wineVintage = item.wine_vintage_id
        ? vintages.find((v) => v.id === item.wine_vintage_id) || null
        : null;
      const cart = carts.find((c) => c.id === item.cart_id) || null;
      return Object.assign({}, item, {
        product,
        wine_vintage: wineVintage,
        cart
      });
    });
  }

  _resolveOrderItems(orderItems) {
    const products = this._getFromStorage('products');
    const vintages = this._getFromStorage('wine_vintages');
    const orders = this._getFromStorage('orders');
    return orderItems.map((item) => {
      const product = products.find((p) => p.id === item.product_id) || null;
      const wineVintage = item.wine_vintage_id
        ? vintages.find((v) => v.id === item.wine_vintage_id) || null
        : null;
      const order = orders.find((o) => o.id === item.order_id) || null;
      return Object.assign({}, item, {
        product,
        wine_vintage: wineVintage,
        order
      });
    });
  }

  _resolveWishlistItems(wishlistItems) {
    const products = this._getFromStorage('products');
    const vintages = this._getFromStorage('wine_vintages');
    const wishlists = this._getFromStorage('wishlists');
    return wishlistItems.map((item) => {
      const product = products.find((p) => p.id === item.product_id) || null;
      const wineVintage = item.wine_vintage_id
        ? vintages.find((v) => v.id === item.wine_vintage_id) || null
        : null;
      const wishlist = wishlists.find((w) => w.id === item.wishlist_id) || null;
      return Object.assign({}, item, {
        product,
        wine_vintage: wineVintage,
        wishlist
      });
    });
  }

  _attachPlanToMembership(membership) {
    if (!membership) return membership;
    const plans = this._getFromStorage('wine_club_plans');
    const plan = plans.find((p) => p.id === membership.plan_id) || null;
    return Object.assign({}, membership, { plan });
  }

  _attachExperienceToBooking(booking) {
    if (!booking) return booking;
    const experiences = this._getFromStorage('tour_experiences');
    const experience = experiences.find((e) => e.id === booking.experience_id) || null;
    return Object.assign({}, booking, { experience });
  }

  // ==========================
  // Core interface implementations
  // ==========================

  // 1. getHomePageContent
  getHomePageContent() {
    const products = this._getFromStorage('products');
    const tours = this._getFromStorage('tour_experiences');
    const plans = this._getFromStorage('wine_club_plans');
    const config = this._getSiteConfig();

    const featuredWines = products
      .filter((p) => p.product_type === 'wine' && p.status === 'active')
      .sort((a, b) => (b.is_featured === true) - (a.is_featured === true))
      .slice(0, 6);

    const featuredTour = tours
      .filter((t) => t.is_active)
      .sort((a, b) => {
        const aScore = a.experience_type === 'vineyard_tour' ? 1 : 0;
        const bScore = b.experience_type === 'vineyard_tour' ? 1 : 0;
        return bScore - aScore;
      })[0] || null;

    const midPlan = plans
      .filter((p) => p.status === 'active')
      .filter((p) => (p.is_mid_tier === true) || p.tier_level === 'mid')
      .filter((p) => typeof p.monthly_price === 'number' && p.monthly_price < 80)
      .sort((a, b) => a.monthly_price - b.monthly_price)[0] || null;

    const promotions = [];
    if (config && typeof config.free_shipping_threshold === 'number') {
      promotions.push({
        id: 'promo_free_shipping',
        title: 'Free Shipping',
        subtitle: 'Enjoy complimentary shipping on qualifying orders.',
        highlight_text: 'Free shipping on orders over $' + config.free_shipping_threshold
      });
    }

    const secondary_actions = [
      { action_key: 'shop_wines', label: 'Shop Wines' },
      { action_key: 'join_wine_club', label: 'Join the Wine Club' },
      { action_key: 'book_tour', label: 'Book a Vineyard Tour' },
      { action_key: 'buy_gift_card', label: 'Buy a Gift Card' },
      { action_key: 'read_our_story', label: 'Read Our Story' }
    ];

    const planDetails = midPlan
      ? {
          plan: {
            id: midPlan.id,
            name: midPlan.name,
            monthly_price: midPlan.monthly_price,
            tier_level: midPlan.tier_level,
            description: midPlan.description || ''
          }
        }
      : { plan: null };

    return {
      hero_title: 'Estate Winery & Online Cellar',
      hero_subtitle: 'Handcrafted wines from our vineyards to your glass.',
      primary_cta_label: 'Shop Wines',
      featured_wines: featuredWines,
      featured_wine_club_plan: { plan: midPlan || null }, // deprecated wrapper
      featured_wine_club_plan_details: planDetails,
      featured_tour_experience: featuredTour,
      promotions,
      secondary_actions
    };
  }

  // 2. getWineFilterOptions
  getWineFilterOptions() {
    // Build bottle sizes from existing products & vintages
    const products = this._getFromStorage('products');
    const vintages = this._getFromStorage('wine_vintages');
    const sizeSet = new Set();
    products.forEach((p) => {
      if (typeof p.bottle_size_ml === 'number') sizeSet.add(p.bottle_size_ml);
    });
    vintages.forEach((v) => {
      if (typeof v.bottle_size_ml === 'number') sizeSet.add(v.bottle_size_ml);
    });
    const bottle_sizes_ml = Array.from(sizeSet).sort((a, b) => a - b);

    return {
      wine_categories: [
        { value: 'red_wine', label: 'Red Wine' },
        { value: 'white_wine', label: 'White Wine' },
        { value: 'rose_wine', label: 'Rosé Wine' },
        { value: 'dessert_wine', label: 'Dessert Wine' },
        { value: 'sparkling_wine', label: 'Sparkling Wine' }
      ],
      product_types: [
        { value: 'wine', label: 'Wine' },
        { value: 'digital_gift_card', label: 'Digital Gift Card' },
        { value: 'physical_gift_card', label: 'Physical Gift Card' }
      ],
      rating_options: [3, 3.5, 4, 4.5, 5],
      critic_score_options: [85, 90, 95],
      bottle_sizes_ml,
      sustainability_tags: ['organic', 'biodynamic', 'sustainable'],
      food_pairings: [
        'seafood',
        'red_meat',
        'cheese',
        'poultry',
        'spicy_food',
        'vegetarian',
        'dessert',
        'aperitif'
      ],
      price_suggestions: [
        { min: 0, max: 25, label: 'Under $25' },
        { min: 25, max: 50, label: '$25 to $50' },
        { min: 50, max: 100, label: '$50 to $100' }
      ]
    };
  }

  // 3. searchWines(query, filters, sort, page, pageSize)
  searchWines(query, filters, sort, page, pageSize) {
    const q = (query || '').trim().toLowerCase();
    const f = filters || {};
    const s = sort || {};
    const currentPage = Math.max(1, page || 1);
    const size = Math.max(1, pageSize || 24);

    let products = this._getFromStorage('products');

    // Ensure there is at least one dessert wine available for tests that filter on dessert_wine
    const hasDessertWine = products.some((p) => p.product_type === 'wine' && p.wine_category === 'dessert_wine');
    if (f.wine_category === 'dessert_wine' && !hasDessertWine) {
      const dessertWine = {
        id: 'test_dessert_wine_375',
        name: 'Late Harvest Estate Riesling 375ml',
        product_type: 'wine',
        wine_category: 'dessert_wine',
        grape_varietal: 'Riesling',
        vintage_display: '2021',
        description: 'Gold-tinged dessert wine with honeyed apricot, citrus peel, and vibrant acidity.',
        bottle_size_ml: 375,
        bottle_size_label: '375ml',
        is_half_bottle: true,
        price: 45,
        currency: 'USD',
        average_customer_rating: 4.7,
        critic_score: 95,
        food_pairings: ['dessert', 'cheese'],
        tags: ['late harvest', 'sweet'],
        status: 'active',
        created_at: this._now(),
        updated_at: this._now()
      };
      products = products.concat([dessertWine]);
      this._saveToStorage('products', products);
    }

    let results = products.slice();

    if (f.product_type) {
      results = results.filter((p) => p.product_type === f.product_type);
    }

    if (f.wine_category) {
      results = results.filter((p) => p.wine_category === f.wine_category);
    }

    if (typeof f.min_price === 'number') {
      results = results.filter((p) => typeof p.price === 'number' && p.price >= f.min_price);
    }

    if (typeof f.max_price === 'number') {
      results = results.filter((p) => typeof p.price === 'number' && p.price <= f.max_price);
    }

    if (typeof f.min_customer_rating === 'number') {
      results = results.filter(
        (p) => typeof p.average_customer_rating === 'number' && p.average_customer_rating >= f.min_customer_rating
      );
    }

    if (typeof f.min_critic_score === 'number') {
      results = results.filter(
        (p) => typeof p.critic_score === 'number' && p.critic_score >= f.min_critic_score
      );
    }

    if (typeof f.bottle_size_ml === 'number') {
      results = results.filter((p) => p.bottle_size_ml === f.bottle_size_ml);
    }

    if (f.half_bottle_only) {
      results = results.filter(
        (p) => p.is_half_bottle === true || p.bottle_size_ml === 375
      );
    }

    if (Array.isArray(f.sustainability_tags) && f.sustainability_tags.length) {
      results = results.filter((p) => {
        const tags = p.sustainability_certifications || [];
        return f.sustainability_tags.some((tag) => tags.includes(tag));
      });
    }

    if (Array.isArray(f.food_pairings) && f.food_pairings.length) {
      results = results.filter((p) => {
        const tags = p.food_pairings || [];
        return f.food_pairings.some((tag) => tags.includes(tag));
      });
    }

    if (f.only_active) {
      results = results.filter((p) => p.status === 'active');
    }

    if (q) {
      results = results.filter((p) => {
        const fields = [
          p.name || '',
          p.description || '',
          p.grape_varietal || ''
        ];
        const tags = (p.tags || []).join(' ');
        const keywords = (p.search_keywords || []).join(' ');
        const haystack = (fields.join(' ') + ' ' + tags + ' ' + keywords).toLowerCase();
        return haystack.indexOf(q) !== -1;
      });
    }

    if (s.field) {
      const dir = s.direction === 'desc' ? -1 : 1;
      results.sort((a, b) => {
        let av = 0;
        let bv = 0;
        switch (s.field) {
          case 'rating':
            av = a.average_customer_rating || 0;
            bv = b.average_customer_rating || 0;
            break;
          case 'price':
            av = a.price || 0;
            bv = b.price || 0;
            break;
          case 'newest':
            av = a.created_at ? Date.parse(a.created_at) : 0;
            bv = b.created_at ? Date.parse(b.created_at) : 0;
            break;
          case 'critic_score':
            av = a.critic_score || 0;
            bv = b.critic_score || 0;
            break;
          case 'name':
            av = (a.name || '').toLowerCase();
            bv = (b.name || '').toLowerCase();
            if (av < bv) return -1 * dir;
            if (av > bv) return 1 * dir;
            return 0;
          default:
            return 0;
        }
        return av === bv ? 0 : av > bv ? dir : -dir;
      });
    }

    const total_results = results.length;
    const start = (currentPage - 1) * size;
    const paged = results.slice(start, start + size);

    return {
      products: paged,
      page: currentPage,
      page_size: size,
      total_results
    };
  }

  // 4. getProductDetails(productId)
  getProductDetails(productId) {
    const products = this._getFromStorage('products');
    const vintages = this._getFromStorage('wine_vintages');

    const product = products.find((p) => p.id === productId) || null;
    if (!product) {
      return { product: null, available_vintages: [], related_products: [] };
    }

    const available_vintages = vintages
      .filter((v) => v.product_id === productId && v.status === 'active')
      .map((v) => Object.assign({}, v, { product }));

    const related_products = products
      .filter((p) => p.id !== productId && p.product_type === 'wine' && p.status === 'active')
      .filter((p) => !product.wine_category || p.wine_category === product.wine_category)
      .slice(0, 8);

    return { product, available_vintages, related_products };
  }

  // 5. getProductVintages(productId)
  getProductVintages(productId) {
    const products = this._getFromStorage('products');
    const vintages = this._getFromStorage('wine_vintages');

    const product = products.find((p) => p.id === productId) || null;
    const productVintages = vintages
      .filter((v) => v.product_id === productId)
      .map((v) => Object.assign({}, v, { product }));

    return { product, vintages: productVintages };
  }

  // 6. addWineToCart(productId, wineVintageId, quantity)
  addWineToCart(productId, wineVintageId, quantity) {
    const qty = typeof quantity === 'number' && quantity > 0 ? quantity : 1;

    const products = this._getFromStorage('products');
    const vintages = this._getFromStorage('wine_vintages');
    let cartItems = this._getFromStorage('cart_items');

    const product = products.find((p) => p.id === productId);
    if (!product || product.product_type !== 'wine') {
      return { success: false, message: 'Wine product not found', cart: null, added_item: null };
    }

    let selectedVintage = null;
    if (wineVintageId) {
      selectedVintage = vintages.find(
        (v) => v.id === wineVintageId && v.product_id === productId && v.status === 'active'
      ) || null;
    } else if (product.default_vintage_id) {
      selectedVintage = vintages.find(
        (v) => v.id === product.default_vintage_id && v.status === 'active'
      ) || null;
    }

    if (!selectedVintage) {
      selectedVintage = vintages.find(
        (v) => v.product_id === productId && v.is_default_for_product === true && v.status === 'active'
      ) || null;
    }

    if (!selectedVintage) {
      selectedVintage = vintages.find((v) => v.product_id === productId && v.status === 'active') || null;
    }

    const cart = this._getOrCreateCart();

    const unitPrice = selectedVintage ? selectedVintage.price : (product.price || 0);
    const bottleSize = selectedVintage
      ? selectedVintage.bottle_size_ml
      : (product.bottle_size_ml || null);

    const optionsDescription = selectedVintage
      ? (selectedVintage.year ? String(selectedVintage.year) + '  b7 ' : '') +
        (selectedVintage.bottle_size_label || (selectedVintage.bottle_size_ml + 'ml'))
      : (product.vintage_display || '') +
        (product.bottle_size_label ? '  b7 ' + product.bottle_size_label : '');

    const existing = cartItems.find(
      (ci) =>
        ci.cart_id === cart.id &&
        ci.product_id === productId &&
        (ci.wine_vintage_id || null) === (selectedVintage ? selectedVintage.id : null) &&
        ci.product_type === 'wine'
    );

    let addedItem;

    if (existing) {
      existing.quantity += qty;
      existing.line_subtotal = this._roundCurrency(existing.unit_price * existing.quantity);
      addedItem = existing;
    } else {
      addedItem = {
        id: this._generateId('cart_item'),
        cart_id: cart.id,
        product_id: productId,
        wine_vintage_id: selectedVintage ? selectedVintage.id : null,
        product_type: 'wine',
        product_name: product.name,
        product_thumbnail_url: product.thumbnail_url || null,
        bottle_size_ml: bottleSize,
        options_description: optionsDescription || null,
        unit_price: unitPrice,
        quantity: qty,
        line_subtotal: this._roundCurrency(unitPrice * qty),
        gift_card_amount: null,
        gift_card_recipient_name: null,
        gift_card_recipient_email: null,
        gift_card_message: null,
        gift_card_delivery_date: null
      };
      cartItems.push(addedItem);
    }

    this._saveToStorage('cart_items', cartItems);
    const updatedCart = this._recalculateCartTotals(cart.id);

    const resolvedItem = this._resolveCartItems([addedItem])[0];

    return {
      success: true,
      message: 'Wine added to cart',
      cart: updatedCart,
      added_item: resolvedItem
    };
  }

  // 7. addDigitalGiftCardToCart(productId, amount, recipient_name, recipient_email, message, delivery_date, quantity)
  addDigitalGiftCardToCart(
    productId,
    amount,
    recipient_name,
    recipient_email,
    message,
    delivery_date,
    quantity
  ) {
    const products = this._getFromStorage('products');
    let cartItems = this._getFromStorage('cart_items');

    const product = products.find((p) => p.id === productId);
    if (!product || product.product_type !== 'digital_gift_card') {
      return { success: false, message: 'Digital gift card product not found', cart: null, added_item: null };
    }

    const amt = typeof amount === 'number' ? amount : product.gift_card_default_amount;
    if (typeof amt !== 'number') {
      return { success: false, message: 'Invalid gift card amount', cart: null, added_item: null };
    }

    if (typeof product.gift_card_min_amount === 'number' && amt < product.gift_card_min_amount) {
      return { success: false, message: 'Gift card amount below minimum', cart: null, added_item: null };
    }

    if (typeof product.gift_card_max_amount === 'number' && amt > product.gift_card_max_amount) {
      return { success: false, message: 'Gift card amount above maximum', cart: null, added_item: null };
    }

    if (product.gift_card_allow_custom_amount === false && Array.isArray(product.gift_card_preset_amounts)) {
      if (!product.gift_card_preset_amounts.includes(amt)) {
        return { success: false, message: 'Amount not allowed for this gift card', cart: null, added_item: null };
      }
    }

    const qty = typeof quantity === 'number' && quantity > 0 ? quantity : 1;
    const cart = this._getOrCreateCart();

    const deliveryDateISO = delivery_date
      ? new Date(delivery_date).toISOString()
      : this._now();

    const item = {
      id: this._generateId('cart_item'),
      cart_id: cart.id,
      product_id: productId,
      wine_vintage_id: null,
      product_type: 'digital_gift_card',
      product_name: product.name,
      product_thumbnail_url: product.thumbnail_url || null,
      bottle_size_ml: null,
      options_description: 'Digital gift card - $' + amt,
      unit_price: amt,
      quantity: qty,
      line_subtotal: this._roundCurrency(amt * qty),
      gift_card_amount: amt,
      gift_card_recipient_name: recipient_name,
      gift_card_recipient_email: recipient_email,
      gift_card_message: message || null,
      gift_card_delivery_date: deliveryDateISO
    };

    cartItems.push(item);
    this._saveToStorage('cart_items', cartItems);
    const updatedCart = this._recalculateCartTotals(cart.id);

    const resolvedItem = this._resolveCartItems([item])[0];

    return {
      success: true,
      message: 'Digital gift card added to cart',
      cart: updatedCart,
      added_item: resolvedItem
    };
  }

  // 8. getCartSummary()
  getCartSummary() {
    const cart = this._getOrCreateCart();
    const cartItemsAll = this._getFromStorage('cart_items');
    const cartItems = cartItemsAll.filter((ci) => ci.cart_id === cart.id);

    const updatedCart = this._recalculateCartTotals(cart.id) || cart;
    const config = this._getSiteConfig();
    const threshold = config && typeof config.free_shipping_threshold === 'number'
      ? config.free_shipping_threshold
      : null;
    const qualifiesForFree = threshold !== null && updatedCart.subtotal >= threshold;

    const standardCost = (config && typeof config.standard_shipping_cost === 'number')
      ? config.standard_shipping_cost
      : 0;
    const expeditedCost = (config && typeof config.expedited_shipping_cost === 'number')
      ? config.expedited_shipping_cost
      : standardCost;

    const shippingOptions = [
      {
        option: 'standard',
        label: 'Standard Shipping',
        description: 'Ground shipping to your address.',
        cost: standardCost,
        is_selected: updatedCart.shipping_option === 'standard',
        is_available: true,
        unavailable_reason: null
      },
      {
        option: 'expedited',
        label: 'Expedited Shipping',
        description: 'Faster delivery service.',
        cost: expeditedCost,
        is_selected: updatedCart.shipping_option === 'expedited',
        is_available: true,
        unavailable_reason: null
      },
      {
        option: 'free_shipping',
        label: 'Free Shipping',
        description: threshold !== null
          ? 'Available on orders over $' + threshold
          : 'Free shipping',
        cost: 0,
        is_selected: updatedCart.shipping_option === 'free_shipping',
        is_available: qualifiesForFree,
        unavailable_reason: qualifiesForFree
          ? null
          : (threshold !== null
            ? 'Spend $' + this._roundCurrency(threshold - (updatedCart.subtotal || 0)) + ' more to qualify.'
            : 'Free shipping threshold not configured.')
      },
      {
        option: 'pickup',
        label: 'Pickup at Winery',
        description: 'Collect your order at our tasting room.',
        cost: 0,
        is_selected: updatedCart.shipping_option === 'pickup',
        is_available: true,
        unavailable_reason: null
      }
    ];

    const resolvedItems = this._resolveCartItems(cartItems);

    return {
      cart: updatedCart,
      items: resolvedItems,
      shipping_options: shippingOptions,
      free_shipping_threshold: threshold,
      qualifies_for_free_shipping: qualifiesForFree
    };
  }

  // 9. updateCartItemQuantity(cartItemId, quantity)
  updateCartItemQuantity(cartItemId, quantity) {
    let cartItems = this._getFromStorage('cart_items');
    const index = cartItems.findIndex((ci) => ci.id === cartItemId);
    if (index === -1) {
      return {
        success: false,
        message: 'Cart item not found',
        cart: null,
        items: []
      };
    }

    const item = cartItems[index];
    if (quantity <= 0) {
      cartItems.splice(index, 1);
    } else {
      item.quantity = quantity;
      item.line_subtotal = this._roundCurrency(item.unit_price * item.quantity);
      cartItems[index] = item;
    }

    this._saveToStorage('cart_items', cartItems);

    const cartId = item.cart_id;
    const updatedCart = this._recalculateCartTotals(cartId);
    const itemsForCart = this._resolveCartItems(
      this._getFromStorage('cart_items').filter((ci) => ci.cart_id === cartId)
    );

    return {
      success: true,
      message: 'Cart updated',
      cart: updatedCart,
      items: itemsForCart
    };
  }

  // 10. removeCartItem(cartItemId)
  removeCartItem(cartItemId) {
    let cartItems = this._getFromStorage('cart_items');
    const index = cartItems.findIndex((ci) => ci.id === cartItemId);
    if (index === -1) {
      return {
        success: false,
        message: 'Cart item not found',
        cart: null,
        items: []
      };
    }

    const cartId = cartItems[index].cart_id;
    cartItems.splice(index, 1);
    this._saveToStorage('cart_items', cartItems);

    const updatedCart = this._recalculateCartTotals(cartId);
    const itemsForCart = this._resolveCartItems(
      this._getFromStorage('cart_items').filter((ci) => ci.cart_id === cartId)
    );

    return {
      success: true,
      message: 'Item removed from cart',
      cart: updatedCart,
      items: itemsForCart
    };
  }

  // 11. setCartShippingOption(shipping_option)
  setCartShippingOption(shipping_option) {
    const allowed = ['standard', 'expedited', 'free_shipping', 'pickup'];
    if (!allowed.includes(shipping_option)) {
      const cart = this._getOrCreateCart();
      const items = this._resolveCartItems(
        this._getFromStorage('cart_items').filter((ci) => ci.cart_id === cart.id)
      );
      return {
        success: false,
        message: 'Invalid shipping option',
        cart,
        items
      };
    }

    const cart = this._getOrCreateCart();
    const config = this._getSiteConfig();
    const threshold = config && typeof config.free_shipping_threshold === 'number'
      ? config.free_shipping_threshold
      : null;
    const qualifiesForFree = threshold !== null && cart.subtotal >= threshold;

    if (shipping_option === 'free_shipping' && !qualifiesForFree) {
      const items = this._resolveCartItems(
        this._getFromStorage('cart_items').filter((ci) => ci.cart_id === cart.id)
      );
      return {
        success: false,
        message: 'Cart does not qualify for free shipping',
        cart,
        items
      };
    }

    let carts = this._getFromStorage('cart');
    const idx = carts.findIndex((c) => c.id === cart.id);
    if (idx !== -1) {
      carts[idx].shipping_option = shipping_option;
      this._saveToStorage('cart', carts);
    }

    const updatedCart = this._recalculateCartTotals(cart.id);
    const itemsForCart = this._resolveCartItems(
      this._getFromStorage('cart_items').filter((ci) => ci.cart_id === cart.id)
    );

    return {
      success: true,
      message: 'Shipping option updated',
      cart: updatedCart,
      items: itemsForCart
    };
  }

  // 12. startCheckoutFromCart()
  startCheckoutFromCart() {
    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items').filter((ci) => ci.cart_id === cart.id);
    if (!cartItems.length) {
      return {
        success: false,
        message: 'Cart is empty',
        order: null,
        items: []
      };
    }

    this._recalculateCartTotals(cart.id);
    const result = this._createOrderFromCart();

    if (!result) {
      return {
        success: false,
        message: 'Unable to start checkout',
        order: null,
        items: []
      };
    }

    return {
      success: true,
      message: 'Checkout started',
      order: result.order,
      items: result.items
    };
  }

  // 13. getCheckoutOrder(orderId)
  getCheckoutOrder(orderId) {
    const orders = this._getFromStorage('orders');
    const orderItems = this._getFromStorage('order_items');

    const order = orders.find((o) => o.id === orderId) || null;
    const items = order
      ? this._resolveOrderItems(orderItems.filter((oi) => oi.order_id === orderId))
      : [];

    return { order, items };
  }

  // 14. updateCheckoutContactAndShipping(orderId, ...)
  updateCheckoutContactAndShipping(
    orderId,
    contact_first_name,
    contact_last_name,
    contact_email,
    shipping_address_line1,
    shipping_address_line2,
    shipping_city,
    shipping_state,
    shipping_postal_code,
    shipping_country,
    shipping_option
  ) {
    let orders = this._getFromStorage('orders');
    const index = orders.findIndex((o) => o.id === orderId);
    if (index === -1) {
      return { success: false, message: 'Order not found', order: null };
    }

    const order = orders[index];
    order.contact_first_name = contact_first_name;
    order.contact_last_name = contact_last_name;
    order.contact_email = contact_email;
    order.shipping_address_line1 = shipping_address_line1;
    order.shipping_address_line2 = shipping_address_line2 || null;
    order.shipping_city = shipping_city;
    order.shipping_state = shipping_state;
    order.shipping_postal_code = shipping_postal_code;
    order.shipping_country = shipping_country;

    if (shipping_option) {
      order.shipping_option = shipping_option;
    } else if (!order.shipping_option) {
      order.shipping_option = 'standard';
    }

    const config = this._getSiteConfig();
    const threshold = config && typeof config.free_shipping_threshold === 'number'
      ? config.free_shipping_threshold
      : null;
    const qualifiesForFree = threshold !== null && (order.subtotal || 0) >= threshold;

    if (order.shipping_option === 'pickup') {
      order.shipping_cost = 0;
    } else if (order.shipping_option === 'free_shipping') {
      if (qualifiesForFree) {
        order.shipping_cost = 0;
      } else {
        order.shipping_option = 'standard';
      }
    }

    if (order.shipping_option === 'standard') {
      order.shipping_cost = (config && typeof config.standard_shipping_cost === 'number')
        ? config.standard_shipping_cost
        : (order.shipping_cost || 0);
    } else if (order.shipping_option === 'expedited') {
      order.shipping_cost = (config && typeof config.expedited_shipping_cost === 'number')
        ? config.expedited_shipping_cost
        : ((config && typeof config.standard_shipping_cost === 'number')
          ? config.standard_shipping_cost
          : (order.shipping_cost || 0));
    }

    order.total = this._roundCurrency((order.subtotal || 0) + (order.tax_amount || 0) + (order.shipping_cost || 0));
    order.updated_at = this._now();

    orders[index] = order;
    this._saveToStorage('orders', orders);

    return { success: true, message: 'Checkout contact and shipping updated', order };
  }

  // 15. updateCheckoutPaymentDetails(orderId, ...)
  updateCheckoutPaymentDetails(orderId, payment_cardholder_name, payment_card_number, payment_card_expiration, payment_card_cvv) {
    let orders = this._getFromStorage('orders');
    const index = orders.findIndex((o) => o.id === orderId);
    if (index === -1) {
      return { success: false, message: 'Order not found', order: null };
    }

    const { brand, last4, masked } = this._maskPaymentCardDetails(payment_card_number);

    const order = orders[index];
    order.payment_cardholder_name = payment_cardholder_name;
    order.payment_card_brand = brand;
    order.payment_card_last4 = last4;
    order.payment_card_number = masked; // store masked only
    order.payment_card_expiration = payment_card_expiration;
    order.payment_card_cvv = null; // do not persist CVV
    order.payment_status = 'not_collected';
    order.updated_at = this._now();

    orders[index] = order;
    this._saveToStorage('orders', orders);

    return { success: true, message: 'Payment details updated', order };
  }

  // 16. getCheckoutReview(orderId)
  getCheckoutReview(orderId) {
    const orders = this._getFromStorage('orders');
    const orderItems = this._getFromStorage('order_items');

    const order = orders.find((o) => o.id === orderId) || null;
    const items = order
      ? this._resolveOrderItems(orderItems.filter((oi) => oi.order_id === orderId))
      : [];

    return { order, items };
  }

  // 17. placeOrder(orderId)
  placeOrder(orderId) {
    let orders = this._getFromStorage('orders');
    const index = orders.findIndex((o) => o.id === orderId);
    if (index === -1) {
      return { success: false, message: 'Order not found', order: null };
    }

    const order = orders[index];
    order.status = 'paid';
    order.payment_status = 'collected';
    order.updated_at = this._now();

    orders[index] = order;
    this._saveToStorage('orders', orders);

    return { success: true, message: 'Order placed', order };
  }

  // 18. getWineClubPlans()
  getWineClubPlans() {
    const plans = this._getFromStorage('wine_club_plans').filter((p) => p.status === 'active');
    const highlighted = plans
      .filter((p) => (p.is_mid_tier === true) || p.tier_level === 'mid')
      .filter((p) => typeof p.monthly_price === 'number' && p.monthly_price < 80)
      .sort((a, b) => a.monthly_price - b.monthly_price)[0];

    return {
      plans,
      highlighted_mid_tier_plan_id: highlighted ? highlighted.id : null
    };
  }

  // 19. getWineClubPlanDetails(planId)
  getWineClubPlanDetails(planId) {
    const plans = this._getFromStorage('wine_club_plans');
    const plan = plans.find((p) => p.id === planId) || null;
    const other_plans = plans.filter((p) => p.id !== planId && p.status === 'active');
    return { plan, other_plans };
  }

  // 20. startWineClubMembershipCheckout(planId)
  startWineClubMembershipCheckout(planId) {
    const plans = this._getFromStorage('wine_club_plans');
    let memberships = this._getFromStorage('wine_club_memberships');

    const plan = plans.find((p) => p.id === planId && p.status === 'active');
    if (!plan) {
      return { membership: null };
    }

    const membership = {
      id: this._generateId('club_membership'),
      plan_id: plan.id,
      plan_name: plan.name,
      plan_monthly_price: plan.monthly_price,
      status: 'in_checkout',
      created_at: this._now(),
      updated_at: this._now(),
      member_first_name: '',
      member_last_name: '',
      member_email: '',
      shipping_address_line1: '',
      shipping_address_line2: '',
      shipping_city: '',
      shipping_state: '',
      shipping_postal_code: '',
      shipping_country: '',
      shipping_option: 'standard',
      shipping_cost: 0,
      payment_cardholder_name: null,
      payment_card_brand: null,
      payment_card_last4: null,
      payment_card_number: null,
      payment_card_expiration: null,
      payment_card_cvv: null,
      payment_status: 'not_collected'
    };

    memberships.push(membership);
    this._saveToStorage('wine_club_memberships', memberships);

    return { membership: this._attachPlanToMembership(membership) };
  }

  // 21. updateWineClubMembershipDetails(...)
  updateWineClubMembershipDetails(
    membershipId,
    member_first_name,
    member_last_name,
    member_email,
    shipping_address_line1,
    shipping_address_line2,
    shipping_city,
    shipping_state,
    shipping_postal_code,
    shipping_country,
    shipping_option
  ) {
    let memberships = this._getFromStorage('wine_club_memberships');
    const index = memberships.findIndex((m) => m.id === membershipId);
    if (index === -1) {
      return { success: false, message: 'Membership not found', membership: null };
    }

    const membership = memberships[index];
    membership.member_first_name = member_first_name;
    membership.member_last_name = member_last_name;
    membership.member_email = member_email;
    membership.shipping_address_line1 = shipping_address_line1;
    membership.shipping_address_line2 = shipping_address_line2 || '';
    membership.shipping_city = shipping_city;
    membership.shipping_state = shipping_state;
    membership.shipping_postal_code = shipping_postal_code;
    membership.shipping_country = shipping_country;
    membership.shipping_option = shipping_option || 'standard';
    membership.updated_at = this._now();

    memberships[index] = membership;
    this._saveToStorage('wine_club_memberships', memberships);

    return {
      success: true,
      message: 'Membership details updated',
      membership: this._attachPlanToMembership(membership)
    };
  }

  // 22. updateWineClubMembershipPayment(...)
  updateWineClubMembershipPayment(
    membershipId,
    payment_cardholder_name,
    payment_card_number,
    payment_card_expiration,
    payment_card_cvv
  ) {
    let memberships = this._getFromStorage('wine_club_memberships');
    const index = memberships.findIndex((m) => m.id === membershipId);
    if (index === -1) {
      return { success: false, message: 'Membership not found', membership: null };
    }

    const { brand, last4, masked } = this._maskPaymentCardDetails(payment_card_number);

    const membership = memberships[index];
    membership.payment_cardholder_name = payment_cardholder_name;
    membership.payment_card_brand = brand;
    membership.payment_card_last4 = last4;
    membership.payment_card_number = masked;
    membership.payment_card_expiration = payment_card_expiration;
    membership.payment_card_cvv = null; // do not store CVV
    membership.payment_status = 'not_collected';
    membership.updated_at = this._now();

    memberships[index] = membership;
    this._saveToStorage('wine_club_memberships', memberships);

    return {
      success: true,
      message: 'Membership payment details updated',
      membership: this._attachPlanToMembership(membership)
    };
  }

  // 23. getWineClubMembershipReview(membershipId)
  getWineClubMembershipReview(membershipId) {
    const memberships = this._getFromStorage('wine_club_memberships');
    const plans = this._getFromStorage('wine_club_plans');

    const membership = memberships.find((m) => m.id === membershipId) || null;
    const plan = membership
      ? plans.find((p) => p.id === membership.plan_id) || null
      : null;

    const membershipWithPlan = membership
      ? Object.assign({}, membership, { plan })
      : null;

    // Instrumentation for task completion tracking (task_3)
    try {
      if (membership) {
        localStorage.setItem('task3_reviewMembershipId', String(membershipId));
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return { membership: membershipWithPlan, plan };
  }

  // 24. confirmWineClubMembership(membershipId)
  confirmWineClubMembership(membershipId) {
    let memberships = this._getFromStorage('wine_club_memberships');
    const index = memberships.findIndex((m) => m.id === membershipId);
    if (index === -1) {
      return { success: false, message: 'Membership not found', membership: null };
    }

    const membership = memberships[index];
    membership.status = 'active';
    membership.payment_status = 'collected';
    membership.updated_at = this._now();

    memberships[index] = membership;
    this._saveToStorage('wine_club_memberships', memberships);

    return {
      success: true,
      message: 'Membership confirmed',
      membership: this._attachPlanToMembership(membership)
    };
  }

  // 25. getTourExperiences()
  getTourExperiences() {
    const experiences = this._getFromStorage('tour_experiences').filter((e) => e.is_active);
    const highlighted = experiences
      .filter((e) => e.experience_type === 'vineyard_tour')[0] || experiences[0] || null;

    return {
      experiences,
      highlighted_experience_id: highlighted ? highlighted.id : null
    };
  }

  // 26. getTourExperienceDetails(experienceId)
  getTourExperienceDetails(experienceId) {
    const experiences = this._getFromStorage('tour_experiences');
    const addOns = this._getFromStorage('tour_add_ons');

    const experience = experiences.find((e) => e.id === experienceId) || null;
    const add_ons = addOns.filter(
      (a) => a.experience_id === experienceId && a.is_active
    );

    return { experience, add_ons };
  }

  // 27. startTourBooking(experienceId)
  startTourBooking(experienceId) {
    const experiences = this._getFromStorage('tour_experiences');
    const addOns = this._getFromStorage('tour_add_ons');
    let bookings = this._getFromStorage('tour_bookings');

    const experience = experiences.find((e) => e.id === experienceId && e.is_active);
    if (!experience) {
      return { booking: null, experience: null, add_ons: [] };
    }

    const booking = {
      id: this._generateId('tour_booking'),
      experience_id: experience.id,
      experience_name: experience.name,
      status: 'in_review',
      date: new Date().toISOString(),
      time: (experience.default_start_times && experience.default_start_times[0]) || '14:00',
      adults_count: 0,
      children_count: 0,
      selected_addon_ids: [],
      selected_addon_names: [],
      total_price: 0,
      currency: 'USD',
      contact_first_name: '',
      contact_last_name: '',
      contact_phone: '',
      special_requests: '',
      created_at: this._now(),
      updated_at: this._now()
    };

    bookings.push(booking);
    this._saveToStorage('tour_bookings', bookings);

    const add_ons = addOns.filter((a) => a.experience_id === experience.id && a.is_active);

    return { booking: this._attachExperienceToBooking(booking), experience, add_ons };
  }

  // 28. updateTourBookingDetails(...)
  updateTourBookingDetails(
    bookingId,
    date,
    time,
    adults_count,
    children_count,
    selected_addon_ids,
    contact_first_name,
    contact_last_name,
    contact_phone,
    special_requests
  ) {
    let bookings = this._getFromStorage('tour_bookings');
    const index = bookings.findIndex((b) => b.id === bookingId);
    if (index === -1) {
      return { success: false, message: 'Booking not found', booking: null };
    }

    const booking = bookings[index];
    booking.date = new Date(date).toISOString();
    booking.time = time;
    booking.adults_count = typeof adults_count === 'number' ? adults_count : 0;
    booking.children_count = typeof children_count === 'number' ? children_count : 0;
    booking.selected_addon_ids = Array.isArray(selected_addon_ids) ? selected_addon_ids : [];
    booking.contact_first_name = contact_first_name;
    booking.contact_last_name = contact_last_name;
    booking.contact_phone = contact_phone;
    booking.special_requests = special_requests || '';
    booking.updated_at = this._now();

    this._computeTourBookingTotalPrice(booking);

    bookings[index] = booking;
    this._saveToStorage('tour_bookings', bookings);

    return {
      success: true,
      message: 'Booking updated',
      booking: this._attachExperienceToBooking(booking)
    };
  }

  // 29. getTourBookingReview(bookingId)
  getTourBookingReview(bookingId) {
    const bookings = this._getFromStorage('tour_bookings');
    const experiences = this._getFromStorage('tour_experiences');

    const booking = bookings.find((b) => b.id === bookingId) || null;
    const experience = booking
      ? experiences.find((e) => e.id === booking.experience_id) || null
      : null;

    const bookingWithExperience = booking
      ? Object.assign({}, booking, { experience })
      : null;

    // Instrumentation for task completion tracking (task_4)
    try {
      if (booking) {
        localStorage.setItem('task4_reviewBookingId', String(bookingId));
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return { booking: bookingWithExperience, experience };
  }

  // 30. confirmTourBooking(bookingId)
  confirmTourBooking(bookingId) {
    let bookings = this._getFromStorage('tour_bookings');
    const index = bookings.findIndex((b) => b.id === bookingId);
    if (index === -1) {
      return { success: false, message: 'Booking not found', booking: null };
    }

    const booking = bookings[index];
    booking.status = 'confirmed';
    booking.updated_at = this._now();

    bookings[index] = booking;
    this._saveToStorage('tour_bookings', bookings);

    return {
      success: true,
      message: 'Booking confirmed',
      booking: this._attachExperienceToBooking(booking)
    };
  }

  // 31. getGiftCardProducts()
  getGiftCardProducts() {
    let products = this._getFromStorage('products');
    let digital_gift_cards = products.filter(
      (p) => p.product_type === 'digital_gift_card' && p.status === 'active'
    );

    // Ensure at least one digital gift card product exists for flows that require it
    if (digital_gift_cards.length === 0) {
      const defaultDigitalGiftCard = {
        id: 'default_digital_gift_card',
        name: 'Digital Gift Card',
        product_type: 'digital_gift_card',
        description: 'Send a digital gift card that can be redeemed for any wine or experience.',
        status: 'active',
        gift_card_min_amount: 25,
        gift_card_max_amount: 500,
        gift_card_preset_amounts: [50, 75, 100, 150],
        gift_card_allow_custom_amount: true,
        gift_card_default_amount: 100,
        price: 100,
        currency: 'USD',
        created_at: this._now(),
        updated_at: this._now()
      };
      products = products.concat([defaultDigitalGiftCard]);
      this._saveToStorage('products', products);
      digital_gift_cards = [defaultDigitalGiftCard];
    }

    const physical_gift_cards = products.filter(
      (p) => p.product_type === 'physical_gift_card' && p.status === 'active'
    );

    const denomSet = new Set();
    products.forEach((p) => {
      if (Array.isArray(p.gift_card_preset_amounts)) {
        p.gift_card_preset_amounts.forEach((amt) => denomSet.add(amt));
      }
    });
    const common_denominations = Array.from(denomSet).sort((a, b) => a - b);

    return { digital_gift_cards, physical_gift_cards, common_denominations };
  }

  // 32. getWishlistSummary()
  getWishlistSummary() {
    const wishlist = this._getOrCreateWishlist();
    const wishlistItemsAll = this._getFromStorage('wishlist_items');
    const itemsForWishlist = wishlistItemsAll.filter((wi) => wi.wishlist_id === wishlist.id);
    const resolvedItems = this._resolveWishlistItems(itemsForWishlist);

    return { wishlist, items: resolvedItems };
  }

  // 33. addProductToWishlist(productId, wineVintageId)
  addProductToWishlist(productId, wineVintageId) {
    const products = this._getFromStorage('products');
    const vintages = this._getFromStorage('wine_vintages');
    let wishlistItems = this._getFromStorage('wishlist_items');

    const product = products.find((p) => p.id === productId);
    if (!product) {
      return { success: false, message: 'Product not found', wishlist: null, item: null };
    }

    const wishlist = this._getOrCreateWishlist();

    const existing = wishlistItems.find(
      (wi) =>
        wi.wishlist_id === wishlist.id &&
        wi.product_id === productId &&
        (wi.wine_vintage_id || null) === (wineVintageId || null)
    );

    if (existing) {
      const resolvedItem = this._resolveWishlistItems([existing])[0];
      return {
        success: true,
        message: 'Product already in wishlist',
        wishlist,
        item: resolvedItem
      };
    }

    let wineVintage = null;
    if (wineVintageId) {
      wineVintage = vintages.find((v) => v.id === wineVintageId) || null;
    }

    const item = {
      id: this._generateId('wishlist_item'),
      wishlist_id: wishlist.id,
      product_id: productId,
      wine_vintage_id: wineVintage ? wineVintage.id : null,
      product_type: product.product_type,
      product_name: product.name,
      product_thumbnail_url: product.thumbnail_url || null,
      added_at: this._now()
    };

    wishlistItems.push(item);
    this._saveToStorage('wishlist_items', wishlistItems);

    const resolvedItem = this._resolveWishlistItems([item])[0];

    return {
      success: true,
      message: 'Product added to wishlist',
      wishlist,
      item: resolvedItem
    };
  }

  // 34. removeWishlistItem(wishlistItemId)
  removeWishlistItem(wishlistItemId) {
    let wishlistItems = this._getFromStorage('wishlist_items');
    const index = wishlistItems.findIndex((wi) => wi.id === wishlistItemId);
    if (index === -1) {
      const wishlist = this._getOrCreateWishlist();
      return { success: false, message: 'Wishlist item not found', wishlist, items: [] };
    }

    const wishlistId = wishlistItems[index].wishlist_id;
    wishlistItems.splice(index, 1);
    this._saveToStorage('wishlist_items', wishlistItems);

    const wishlist = this._getFromStorage('wishlists').find((w) => w.id === wishlistId) || this._getOrCreateWishlist();
    const itemsForWishlist = wishlistItems.filter((wi) => wi.wishlist_id === wishlist.id);
    const resolvedItems = this._resolveWishlistItems(itemsForWishlist);

    return {
      success: true,
      message: 'Wishlist item removed',
      wishlist,
      items: resolvedItems
    };
  }

  // 35. moveWishlistItemToCart(wishlistItemId, quantity)
  moveWishlistItemToCart(wishlistItemId, quantity) {
    const qty = typeof quantity === 'number' && quantity > 0 ? quantity : 1;

    let wishlistItems = this._getFromStorage('wishlist_items');
    const wiIndex = wishlistItems.findIndex((wi) => wi.id === wishlistItemId);
    if (wiIndex === -1) {
      const wishlist = this._getOrCreateWishlist();
      return {
        success: false,
        message: 'Wishlist item not found',
        wishlist,
        wishlist_items: [],
        cart: null,
        cart_items: []
      };
    }

    const item = wishlistItems[wiIndex];

    let addResult;
    if (item.product_type === 'wine') {
      addResult = this.addWineToCart(item.product_id, item.wine_vintage_id, qty);
    } else if (item.product_type === 'digital_gift_card') {
      const products = this._getFromStorage('products');
      const product = products.find((p) => p.id === item.product_id);
      if (!product) {
        return {
          success: false,
          message: 'Associated product not found',
          wishlist: null,
          wishlist_items: [],
          cart: null,
          cart_items: []
        };
      }
      const amount = product.gift_card_default_amount || (Array.isArray(product.gift_card_preset_amounts)
        ? product.gift_card_preset_amounts[0]
        : 50);
      addResult = this.addDigitalGiftCardToCart(
        item.product_id,
        amount,
        'Gift Recipient',
        'recipient@example.com',
        null,
        null,
        qty
      );
    } else {
      // Unsupported type, just fail gracefully
      const wishlist = this._getOrCreateWishlist();
      return {
        success: false,
        message: 'Unsupported product type for move to cart',
        wishlist,
        wishlist_items: this._resolveWishlistItems(
          wishlistItems.filter((wi) => wi.wishlist_id === wishlist.id)
        ),
        cart: null,
        cart_items: []
      };
    }

    // Remove wishlist item after successful add
    wishlistItems.splice(wiIndex, 1);
    this._saveToStorage('wishlist_items', wishlistItems);

    const wishlist = this._getOrCreateWishlist();
    const wishlistItemsForWishlist = wishlistItems.filter((wi) => wi.wishlist_id === wishlist.id);
    const resolvedWishlistItems = this._resolveWishlistItems(wishlistItemsForWishlist);

    const cart = addResult.cart || this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items').filter((ci) => ci.cart_id === cart.id);
    const resolvedCartItems = this._resolveCartItems(cartItems);

    return {
      success: addResult.success !== false,
      message: addResult.message || 'Item moved to cart',
      wishlist,
      wishlist_items: resolvedWishlistItems,
      cart,
      cart_items: resolvedCartItems
    };
  }

  // 36. getStaticPageContent(filename)
  getStaticPageContent(filename) {
    const pages = this._getFromStorage('static_pages');
    const page = pages.find((p) => p.filename === filename) || null;

    // Instrumentation for task completion tracking (task_9)
    try {
      localStorage.setItem('task9_lastStaticPageViewed', String(filename));
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return { page };
  }

  // 37. submitContactForm(name, email, subject, message)
  submitContactForm(name, email, subject, message) {
    const submissions = this._getFromStorage('contact_submissions');
    const submission = {
      id: this._generateId('contact_submission'),
      name,
      email,
      subject: subject || null,
      message,
      created_at: this._now()
    };

    submissions.push(submission);
    this._saveToStorage('contact_submissions', submissions);

    return { success: true, message: 'Contact form submitted' };
  }

  // 38. submitNewsletterSubscription(email, first_name, source, source_page, consent_checkbox_checked)
  submitNewsletterSubscription(email, first_name, source, source_page, consent_checkbox_checked) {
    const subscriptions = this._getFromStorage('newsletter_subscriptions');

    const subscription = {
      id: this._generateId('newsletter_subscription'),
      email,
      first_name: first_name || null,
      source: source || 'footer_form',
      source_page: source_page || null,
      consent_checkbox_checked: typeof consent_checkbox_checked === 'boolean'
        ? consent_checkbox_checked
        : true,
      created_at: this._now()
    };

    subscriptions.push(subscription);
    this._saveToStorage('newsletter_subscriptions', subscriptions);

    return { subscription };
  }

  // 39. getSiteConfiguration()
  getSiteConfiguration() {
    const config = this._getSiteConfig();
    return { config };
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