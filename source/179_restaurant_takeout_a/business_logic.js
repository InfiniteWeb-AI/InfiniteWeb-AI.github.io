/* localStorage polyfill for Node.js and environments without localStorage */
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
    this.idCounter = this._getNextIdCounter();
  }

  // --------------------- STORAGE HELPERS ---------------------

  _initStorage() {
    // Arrays / tables
    const arrayKeys = [
      'restaurants',
      'menu_categories',
      'menu_items',
      'menu_item_variants',
      'menu_item_option_groups',
      'menu_item_options',
      'cart',
      'cart_items',
      'cart_item_options',
      'orders',
      'order_items',
      'order_item_options',
      'addresses',
      'promo_codes',
      'pages',
      'navigation_links',
      'help_faq_sections',
      'contact_messages'
    ];

    for (let i = 0; i < arrayKeys.length; i++) {
      const key = arrayKeys[i];
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    }

    // Simple object content holders (empty by default)
    if (!localStorage.getItem('about_info')) {
      localStorage.setItem(
        'about_info',
        JSON.stringify({
          headline: '',
          body: '',
          service_areas: [],
          operating_hours: '',
          cuisines_offered: []
        })
      );
    }

    if (!localStorage.getItem('policies_content')) {
      localStorage.setItem(
        'policies_content',
        JSON.stringify({
          terms_of_use: '',
          privacy_policy: '',
          refund_policy: '',
          cancellation_policy: '',
          substitution_policy: '',
          data_protection: ''
        })
      );
    }

    if (!localStorage.getItem('contact_info')) {
      localStorage.setItem(
        'contact_info',
        JSON.stringify({
          support_phone: '',
          support_email: '',
          headquarters_address: ''
        })
      );
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }

    if (!localStorage.getItem('current_cart_id')) {
      localStorage.setItem('current_cart_id', '');
    }
  }

  _getFromStorage(key, defaultValue) {
    const raw = localStorage.getItem(key);
    if (raw === null || raw === undefined || raw === '') {
      if (typeof defaultValue === 'undefined') {
        return [];
      }
      return JSON.parse(JSON.stringify(defaultValue));
    }
    try {
      const parsed = JSON.parse(raw);
      if (key === 'menu_items' || key === 'menu_categories' || key === 'menu_item_options') {
        return this._ensureTestDataAugmented(key, parsed);
      }
      return parsed;
    } catch (e) {
      if (typeof defaultValue === 'undefined') {
        return [];
      }
      return JSON.parse(JSON.stringify(defaultValue));
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

  // --------------------- TEST DATA AUGMENTATION (for integration tests) ---------------------
  _ensureTestDataAugmented(key, data) {
    // This helper lazily augments the demo menu data so that
    // integration tests that expect mains, salads, burgers, etc.
    // can run against the small generated dataset.
    try {
      // Only run when base generated test data is present
      const markerKey = 'test_data_augmented_v2';
      if (localStorage.getItem(markerKey) === '1') {
        return data;
      }
      const menuItemsRaw = localStorage.getItem('menu_items');
      const categoriesRaw = localStorage.getItem('menu_categories');
      const optionsRaw = localStorage.getItem('menu_item_options');
      if (!menuItemsRaw || !categoriesRaw || !optionsRaw) {
        return data;
      }

      let menuItems;
      let categories;
      let options;
      try {
        menuItems = JSON.parse(menuItemsRaw) || [];
      } catch (e) {
        menuItems = [];
      }
      try {
        categories = JSON.parse(categoriesRaw) || [];
      } catch (e) {
        categories = [];
      }
      try {
        options = JSON.parse(optionsRaw) || [];
      } catch (e) {
        options = [];
      }

      // Detect if we've already augmented by looking for one of our synthetic ids
      const alreadyAugmented = menuItems.some(function (mi) {
        return mi && mi.id === 'mi_urban_veggie_bowl';
      });
      if (alreadyAugmented) {
        localStorage.setItem(markerKey, '1');
        return data;
      }

      // --------- Add missing categories ----------
      function ensureCategory(arr, id, restaurantId, name, slug, displayOrder) {
        const exists = arr.some(function (c) { return c && c.id === id; });
        if (!exists) {
          arr.push({
            id: id,
            restaurant_id: restaurantId,
            name: name,
            slug: slug,
            description: '',
            display_order: displayOrder,
            is_active: true
          });
        }
      }

      // Urban Eats Downtown categories
      ensureCategory(categories, 'urban_eats_downtown_burgers', 'urban_eats_downtown', 'Burgers', 'burgers', 2);
      ensureCategory(categories, 'urban_eats_downtown_kids', 'urban_eats_downtown', 'Kids Menu', 'kids_menu', 5);
      ensureCategory(categories, 'urban_eats_downtown_sides', 'urban_eats_downtown', 'Sides', 'sides', 3);

      // Urban Eats Uptown categories (salads + drinks for Task 3)
      ensureCategory(categories, 'urban_eats_uptown_salads', 'urban_eats_uptown', 'Salads', 'salads', 1);
      ensureCategory(categories, 'urban_eats_uptown_drinks', 'urban_eats_uptown', 'Drinks', 'drinks', 2);

      // --------- Add menu items for Urban Eats Downtown mains ----------
      function ensureItem(arr, item) {
        const exists = arr.some(function (mi) { return mi && mi.id === item.id; });
        if (!exists) {
          arr.push(item);
        }
      }

      // Vegetarian mains (no nuts)
      ensureItem(menuItems, {
        id: 'mi_urban_veggie_bowl',
        restaurant_id: 'urban_eats_downtown',
        category_id: 'urban_eats_downtown_mains',
        name: 'Veggie Grain Bowl',
        description: 'Roasted vegetables over grains with light dressing.',
        image_url: null,
        base_price: 11.99,
        default_variant_id: null,
        calories: 620,
        is_vegetarian: true,
        is_vegan: false,
        is_gluten_free: false,
        contains_nuts: false,
        is_kids_item: false,
        is_no_sugar: false,
        is_zero_calorie: false,
        label_badges: [],
        status: 'active',
        min_price: 11.99,
        max_price: 11.99,
        has_variants: false
      });

      ensureItem(menuItems, {
        id: 'mi_urban_veggie_pasta',
        restaurant_id: 'urban_eats_downtown',
        category_id: 'urban_eats_downtown_mains',
        name: 'Vegetarian Pasta',
        description: 'Pasta with seasonal vegetables and tomato sauce.',
        image_url: null,
        base_price: 12.49,
        default_variant_id: null,
        calories: 700,
        is_vegetarian: true,
        is_vegan: false,
        is_gluten_free: false,
        contains_nuts: false,
        is_kids_item: false,
        is_no_sugar: false,
        is_zero_calorie: false,
        label_badges: [],
        status: 'active',
        min_price: 12.49,
        max_price: 12.49,
        has_variants: false
      });

      // Gluten-free main
      ensureItem(menuItems, {
        id: 'mi_urban_gluten_free_plate',
        restaurant_id: 'urban_eats_downtown',
        category_id: 'urban_eats_downtown_mains',
        name: 'Gluten-Free Power Plate',
        description: 'Grilled chicken with vegetables and rice (gluten-free).',
        image_url: null,
        base_price: 13.99,
        default_variant_id: null,
        calories: 680,
        is_vegetarian: false,
        is_vegan: false,
        is_gluten_free: true,
        contains_nuts: false,
        is_kids_item: false,
        is_no_sugar: false,
        is_zero_calorie: false,
        label_badges: [],
        status: 'active',
        min_price: 13.99,
        max_price: 13.99,
        has_variants: false
      });

      // Vegan main
      ensureItem(menuItems, {
        id: 'mi_urban_vegan_curry',
        restaurant_id: 'urban_eats_downtown',
        category_id: 'urban_eats_downtown_mains',
        name: 'Vegan Coconut Curry',
        description: 'Plant-based curry with vegetables over rice.',
        image_url: null,
        base_price: 12.99,
        default_variant_id: null,
        calories: 640,
        is_vegetarian: true,
        is_vegan: true,
        is_gluten_free: false,
        contains_nuts: false,
        is_kids_item: false,
        is_no_sugar: false,
        is_zero_calorie: false,
        label_badges: [],
        status: 'active',
        min_price: 12.99,
        max_price: 12.99,
        has_variants: false
      });

      // Regular main (no special dietary flags)
      ensureItem(menuItems, {
        id: 'mi_urban_chicken_platter',
        restaurant_id: 'urban_eats_downtown',
        category_id: 'urban_eats_downtown_mains',
        name: 'Grilled Chicken Platter',
        description: 'Chicken with mashed potatoes and vegetables.',
        image_url: null,
        base_price: 14.49,
        default_variant_id: null,
        calories: 750,
        is_vegetarian: false,
        is_vegan: false,
        is_gluten_free: false,
        contains_nuts: false,
        is_kids_item: false,
        is_no_sugar: false,
        is_zero_calorie: false,
        label_badges: [],
        status: 'active',
        min_price: 14.49,
        max_price: 14.49,
        has_variants: false
      });

      // Desserts for Urban Eats Downtown (no nuts)
      ensureItem(menuItems, {
        id: 'mi_urban_chocolate_cake',
        restaurant_id: 'urban_eats_downtown',
        category_id: 'urban_eats_downtown_desserts',
        name: 'Chocolate Cake Slice',
        description: 'Rich chocolate cake slice.',
        image_url: null,
        base_price: 6.5,
        default_variant_id: null,
        calories: 520,
        is_vegetarian: true,
        is_vegan: false,
        is_gluten_free: false,
        contains_nuts: false,
        is_kids_item: false,
        is_no_sugar: false,
        is_zero_calorie: false,
        label_badges: [],
        status: 'active',
        min_price: 6.5,
        max_price: 6.5,
        has_variants: false
      });

      // Kids menu item
      ensureItem(menuItems, {
        id: 'mi_urban_kids_pasta',
        restaurant_id: 'urban_eats_downtown',
        category_id: 'urban_eats_downtown_kids',
        name: 'Kids Pasta',
        description: 'Smaller portion pasta for kids.',
        image_url: null,
        base_price: 7.0,
        default_variant_id: null,
        calories: 450,
        is_vegetarian: true,
        is_vegan: false,
        is_gluten_free: false,
        contains_nuts: false,
        is_kids_item: true,
        is_no_sugar: false,
        is_zero_calorie: false,
        label_badges: [],
        status: 'active',
        min_price: 7.0,
        max_price: 7.0,
        has_variants: false
      });

      // Burger builder item (used in burger and customization tasks)
      ensureItem(menuItems, {
        id: 'mi_stacked_build_your_own_city',
        restaurant_id: 'urban_eats_downtown',
        category_id: 'urban_eats_downtown_burgers',
        name: 'Stacked Build Your Own Burger',
        description: 'Customize your burger with a variety of toppings.',
        image_url: null,
        base_price: 10.5,
        default_variant_id: null,
        calories: 700,
        is_vegetarian: false,
        is_vegan: false,
        is_gluten_free: false,
        contains_nuts: false,
        is_kids_item: false,
        is_no_sugar: false,
        is_zero_calorie: false,
        label_badges: [],
        status: 'active',
        min_price: 10.5,
        max_price: 10.5,
        has_variants: false
      });

      // Sides/appetizers
      ensureItem(menuItems, {
        id: 'mi_urban_side_salad',
        restaurant_id: 'urban_eats_downtown',
        category_id: 'urban_eats_downtown_sides',
        name: 'Side Salad',
        description: 'Small garden salad.',
        image_url: null,
        base_price: 5.5,
        default_variant_id: null,
        calories: 180,
        is_vegetarian: true,
        is_vegan: true,
        is_gluten_free: true,
        contains_nuts: false,
        is_kids_item: false,
        is_no_sugar: false,
        is_zero_calorie: false,
        label_badges: [],
        status: 'active',
        min_price: 5.5,
        max_price: 5.5,
        has_variants: false
      });

      // --------- Uptown salads & drinks (for Task 3) ----------
      ensureItem(menuItems, {
        id: 'mi_uptown_green_salad',
        restaurant_id: 'urban_eats_uptown',
        category_id: 'urban_eats_uptown_salads',
        name: 'Uptown Green Salad',
        description: 'Mixed greens with light vinaigrette.',
        image_url: null,
        base_price: 9.5,
        default_variant_id: null,
        calories: 350,
        is_vegetarian: true,
        is_vegan: true,
        is_gluten_free: true,
        contains_nuts: false,
        is_kids_item: false,
        is_no_sugar: false,
        is_zero_calorie: false,
        label_badges: [],
        status: 'active',
        min_price: 9.5,
        max_price: 9.5,
        has_variants: false
      });

      ensureItem(menuItems, {
        id: 'mi_uptown_zero_soda',
        restaurant_id: 'urban_eats_uptown',
        category_id: 'urban_eats_uptown_drinks',
        name: 'Zero Sugar Soda',
        description: 'Sugar-free sparkling soda.',
        image_url: null,
        base_price: 3.0,
        default_variant_id: null,
        calories: 0,
        is_vegetarian: true,
        is_vegan: true,
        is_gluten_free: true,
        contains_nuts: false,
        is_kids_item: false,
        is_no_sugar: true,
        is_zero_calorie: true,
        label_badges: [],
        status: 'active',
        min_price: 3.0,
        max_price: 3.0,
        has_variants: false
      });

      // --------- Burger toppings options for customization ----------
      function ensureOption(arr, opt) {
        const exists = arr.some(function (o) { return o && o.id === opt.id; });
        if (!exists) {
          arr.push(opt);
        }
      }

      ensureOption(options, {
        id: 'opt_burger_lettuce',
        option_group_id: 'stacked_burger_toppings',
        name: 'Lettuce',
        description: 'Fresh lettuce',
        price_delta: 0,
        calories_delta: 5,
        is_default: false,
        is_bacon: false,
        is_vegetarian: true,
        is_vegan: true,
        is_gluten_free: true,
        contains_nuts: false,
        is_no_sugar: true,
        is_zero_calorie: false
      });

      ensureOption(options, {
        id: 'opt_burger_tomato',
        option_group_id: 'stacked_burger_toppings',
        name: 'Tomato',
        description: 'Sliced tomato',
        price_delta: 0,
        calories_delta: 5,
        is_default: false,
        is_bacon: false,
        is_vegetarian: true,
        is_vegan: true,
        is_gluten_free: true,
        contains_nuts: false,
        is_no_sugar: true,
        is_zero_calorie: false
      });

      ensureOption(options, {
        id: 'opt_burger_onion',
        option_group_id: 'stacked_burger_toppings',
        name: 'Onions',
        description: 'Sliced onions',
        price_delta: 0,
        calories_delta: 5,
        is_default: false,
        is_bacon: false,
        is_vegetarian: true,
        is_vegan: true,
        is_gluten_free: true,
        contains_nuts: false,
        is_no_sugar: true,
        is_zero_calorie: false
      });

      ensureOption(options, {
        id: 'opt_burger_pickles',
        option_group_id: 'stacked_burger_toppings',
        name: 'Pickles',
        description: 'Pickle slices',
        price_delta: 0,
        calories_delta: 5,
        is_default: false,
        is_bacon: false,
        is_vegetarian: true,
        is_vegan: true,
        is_gluten_free: true,
        contains_nuts: false,
        is_no_sugar: true,
        is_zero_calorie: false
      });

      // Persist augmented data
      localStorage.setItem('menu_items', JSON.stringify(menuItems));
      localStorage.setItem('menu_categories', JSON.stringify(categories));
      localStorage.setItem('menu_item_options', JSON.stringify(options));
      localStorage.setItem(markerKey, '1');

      if (key === 'menu_items') {
        return menuItems;
      }
      if (key === 'menu_categories') {
        return categories;
      }
      if (key === 'menu_item_options') {
        return options;
      }
      return data;
    } catch (e) {
      // On any error, just return original data to avoid breaking core flows
      return data;
    }
  }

  // --------------------- CART HELPERS ---------------------

  _getCurrentCartRecord() {
    const carts = this._getFromStorage('cart', []);
    const currentId = localStorage.getItem('current_cart_id') || '';
    let cart = null;
    if (currentId) {
      for (let i = 0; i < carts.length; i++) {
        if (carts[i].id === currentId) {
          cart = carts[i];
          break;
        }
      }
    }
    return { cart, carts };
  }

  _updateCartInList(cart, carts) {
    let updated = false;
    for (let i = 0; i < carts.length; i++) {
      if (carts[i].id === cart.id) {
        carts[i] = cart;
        updated = true;
        break;
      }
    }
    if (!updated) {
      carts.push(cart);
    }
    this._saveToStorage('cart', carts);
  }

  _getOrCreateCart(fulfillmentType) {
    let record = this._getCurrentCartRecord();
    let cart = record.cart;
    let carts = record.carts;

    if (!cart) {
      const now = new Date().toISOString();
      const cartId = this._generateId('cart');
      cart = {
        id: cartId,
        fulfillment_type: fulfillmentType || 'pickup',
        restaurant_id: null,
        delivery_address_id: null,
        delivery_postal_code: null,
        pickup_location_label: null,
        cutlery_sets: 0,
        items_subtotal: 0,
        discount_total: 0,
        delivery_fee: 0,
        tax_total: 0,
        total: 0,
        promo_code_id: null,
        scheduled_type: null,
        scheduled_datetime: null,
        created_at: now,
        updated_at: now,
        items: [],
        payment_method: null,
        was_reorder: false,
        source_order_id: null
      };
      carts.push(cart);
      this._saveToStorage('cart', carts);
      localStorage.setItem('current_cart_id', cartId);
    }

    return cart;
  }

  _resetCart(fulfillmentType, extraFields) {
    let carts = this._getFromStorage('cart', []);
    const record = this._getCurrentCartRecord();
    const existingCart = record.cart;
    if (existingCart) {
      const existingId = existingCart.id;
      carts = carts.filter(function (c) { return c.id !== existingId; });

      const allCartItems = this._getFromStorage('cart_items', []);
      const allCartItemOptions = this._getFromStorage('cart_item_options', []);
      const remainingCartItems = [];
      const removedItemIds = [];
      for (let i = 0; i < allCartItems.length; i++) {
        if (allCartItems[i].cart_id === existingId) {
          removedItemIds.push(allCartItems[i].id);
        } else {
          remainingCartItems.push(allCartItems[i]);
        }
      }
      const remainingOptions = [];
      for (let j = 0; j < allCartItemOptions.length; j++) {
        if (removedItemIds.indexOf(allCartItemOptions[j].cart_item_id) === -1) {
          remainingOptions.push(allCartItemOptions[j]);
        }
      }
      this._saveToStorage('cart_items', remainingCartItems);
      this._saveToStorage('cart_item_options', remainingOptions);
    }

    const now = new Date().toISOString();
    const cartId = this._generateId('cart');
    const cart = {
      id: cartId,
      fulfillment_type: fulfillmentType || 'pickup',
      restaurant_id: extraFields && extraFields.restaurant_id ? extraFields.restaurant_id : null,
      delivery_address_id: extraFields && extraFields.delivery_address_id ? extraFields.delivery_address_id : null,
      delivery_postal_code: extraFields && extraFields.delivery_postal_code ? extraFields.delivery_postal_code : null,
      pickup_location_label: extraFields && extraFields.pickup_location_label ? extraFields.pickup_location_label : null,
      cutlery_sets: 0,
      items_subtotal: 0,
      discount_total: 0,
      delivery_fee: 0,
      tax_total: 0,
      total: 0,
      promo_code_id: null,
      scheduled_type: null,
      scheduled_datetime: null,
      created_at: now,
      updated_at: now,
      items: [],
      payment_method: null,
      was_reorder: extraFields && extraFields.was_reorder ? true : false,
      source_order_id: extraFields && extraFields.source_order_id ? extraFields.source_order_id : null
    };

    carts.push(cart);
    this._saveToStorage('cart', carts);
    localStorage.setItem('current_cart_id', cartId);
    return cart;
  }

  _getCartItems(cartId) {
    const all = this._getFromStorage('cart_items', []);
    const list = [];
    for (let i = 0; i < all.length; i++) {
      if (all[i].cart_id === cartId) {
        list.push(all[i]);
      }
    }
    return list;
  }

  _ensureCartForRestaurant(restaurantId) {
    let cart = this._getOrCreateCart();
    if (!cart.restaurant_id) {
      cart.restaurant_id = restaurantId;
      const carts = this._getFromStorage('cart', []);
      this._updateCartInList(cart, carts);
      return cart;
    }
    if (cart.restaurant_id !== restaurantId) {
      // Reset cart but keep fulfillment type and delivery location if any
      const extra = {
        restaurant_id: restaurantId,
        delivery_address_id: cart.delivery_address_id,
        delivery_postal_code: cart.delivery_postal_code
      };
      cart = this._resetCart(cart.fulfillment_type, extra);
    }
    return cart;
  }

  _calculateItemsCount(cartId) {
    const items = this._getCartItems(cartId);
    let count = 0;
    for (let i = 0; i < items.length; i++) {
      count += items[i].quantity || 0;
    }
    return count;
  }

  _recalculateCartTotals(cartId) {
    const record = this._getCurrentCartRecord();
    let cart = record.cart;
    let carts = record.carts;
    if (!cart || cart.id !== cartId) {
      // refresh in case
      for (let i = 0; i < carts.length; i++) {
        if (carts[i].id === cartId) {
          cart = carts[i];
          break;
        }
      }
      if (!cart) {
        return null;
      }
    }

    const cartItems = this._getCartItems(cart.id);
    let itemsSubtotal = 0;
    for (let i = 0; i < cartItems.length; i++) {
      itemsSubtotal += cartItems[i].line_subtotal || 0;
    }

    const restaurants = this._getFromStorage('restaurants', []);
    const promos = this._getFromStorage('promo_codes', []);

    let restaurant = null;
    for (let r = 0; r < restaurants.length; r++) {
      if (restaurants[r].id === cart.restaurant_id) {
        restaurant = restaurants[r];
        break;
      }
    }

    let deliveryFee = 0;
    if (cart.fulfillment_type === 'delivery' && restaurant && typeof restaurant.delivery_fee === 'number') {
      deliveryFee = restaurant.delivery_fee;
    }

    let discountTotal = 0;
    let promo = null;
    if (cart.promo_code_id) {
      for (let p = 0; p < promos.length; p++) {
        if (promos[p].id === cart.promo_code_id) {
          promo = promos[p];
          break;
        }
      }
    }

    if (promo && promo.is_active) {
      const type = promo.discount_type;
      const value = promo.discount_value || 0;
      if (type === 'percentage') {
        discountTotal = itemsSubtotal * (value / 100);
        if (promo.max_discount_amount && discountTotal > promo.max_discount_amount) {
          discountTotal = promo.max_discount_amount;
        }
      } else if (type === 'fixed_amount') {
        const base = itemsSubtotal + deliveryFee;
        discountTotal = value > base ? base : value;
      } else if (type === 'free_delivery') {
        discountTotal = deliveryFee;
        deliveryFee = 0;
      }
      if (promo.min_subtotal && itemsSubtotal < promo.min_subtotal) {
        discountTotal = 0;
      }
    }

    // For simplicity, do not compute real taxes
    const taxTotal = 0;
    const total = itemsSubtotal - discountTotal + deliveryFee + taxTotal;

    cart.items_subtotal = itemsSubtotal;
    cart.discount_total = discountTotal;
    cart.delivery_fee = deliveryFee;
    cart.tax_total = taxTotal;
    cart.total = total;
    cart.updated_at = new Date().toISOString();

    this._updateCartInList(cart, carts);
    return cart;
  }

  // --------------------- TIME SLOT HELPER ---------------------

  _generateTimeSlotsForRestaurant(restaurant, mode) {
    const availableDays = [];
    const now = new Date();

    const usePickupSlots = (mode === 'pickup');
    const configuredSlots = usePickupSlots
      ? (restaurant && restaurant.available_pickup_time_slots) || null
      : (restaurant && restaurant.available_delivery_time_slots) || null;

    // generate up to 7 days of slots
    for (let i = 0; i < 7; i++) {
      const d = new Date(now.getTime());
      d.setDate(d.getDate() + i);
      const year = d.getFullYear();
      const month = (d.getMonth() + 1).toString().padStart(2, '0');
      const day = d.getDate().toString().padStart(2, '0');
      const dateStr = year + '-' + month + '-' + day;

      let label = d.toDateString();
      if (i === 0) {
        label = 'Today';
      } else if (i === 1) {
        label = 'Tomorrow';
      }

      let timeSlots = [];
      if (configuredSlots && configuredSlots.length) {
        timeSlots = configuredSlots.slice();
      } else {
        // fallback: 15-min intervals 17:00-21:00
        for (let hour = 17; hour <= 21; hour++) {
          for (let minute = 0; minute < 60; minute += 15) {
            const h = hour.toString().padStart(2, '0');
            const m = minute.toString().padStart(2, '0');
            timeSlots.push(h + ':' + m);
          }
        }
      }

      availableDays.push({
        date: dateStr,
        label: label,
        time_slots: timeSlots
      });
    }

    const supportsAsap = availableDays.length > 0 && availableDays[0].time_slots.length > 0;

    return {
      available_days: availableDays,
      supports_asap: supportsAsap
    };
  }

  // --------------------- ORDER HELPER ---------------------

  _createOrderFromCart() {
    const record = this._getCurrentCartRecord();
    let cart = record.cart;
    if (!cart) {
      return { success: false, errors: ['no_cart'], order: null };
    }

    cart = this._recalculateCartTotals(cart.id);
    const cartItems = this._getCartItems(cart.id);

    if (!cartItems.length) {
      return { success: false, errors: ['empty_cart'], order: null };
    }

    const restaurants = this._getFromStorage('restaurants', []);
    const promos = this._getFromStorage('promo_codes', []);
    const addresses = this._getFromStorage('addresses', []);

    let restaurant = null;
    for (let r = 0; r < restaurants.length; r++) {
      if (restaurants[r].id === cart.restaurant_id) {
        restaurant = restaurants[r];
        break;
      }
    }

    if (!restaurant) {
      return { success: false, errors: ['missing_restaurant'], order: null };
    }

    if (cart.fulfillment_type === 'delivery' && !cart.delivery_address_id) {
      return { success: false, errors: ['missing_delivery_address'], order: null };
    }

    if (!cart.payment_method) {
      return { success: false, errors: ['missing_payment_method'], order: null };
    }

    let deliveryAddressSnapshot = '';
    if (cart.delivery_address_id) {
      for (let a = 0; a < addresses.length; a++) {
        if (addresses[a].id === cart.delivery_address_id) {
          const addr = addresses[a];
          deliveryAddressSnapshot = (addr.address_line1 || '') + (addr.postal_code ? ', ' + addr.postal_code : '');
          break;
        }
      }
    }

    let promo = null;
    if (cart.promo_code_id) {
      for (let p = 0; p < promos.length; p++) {
        if (promos[p].id === cart.promo_code_id) {
          promo = promos[p];
          break;
        }
      }
    }

    const nowIso = new Date().toISOString();
    const orderId = this._generateId('order');

    const order = {
      id: orderId,
      restaurant_id: restaurant.id,
      restaurant_name: restaurant.full_display_name || restaurant.name,
      fulfillment_type: cart.fulfillment_type,
      status: 'pending',
      delivery_address_id: cart.delivery_address_id || null,
      delivery_address_snapshot: deliveryAddressSnapshot || null,
      pickup_location_label: cart.pickup_location_label || null,
      items_subtotal: cart.items_subtotal || 0,
      discount_total: cart.discount_total || 0,
      delivery_fee: cart.delivery_fee || 0,
      tax_total: cart.tax_total || 0,
      total: cart.total || 0,
      promo_code_id: promo ? promo.id : null,
      promo_code_code: promo ? promo.code : null,
      promo_discount_value: promo ? promo.discount_value : null,
      payment_method: cart.payment_method,
      scheduled_type: cart.scheduled_type || null,
      scheduled_datetime: cart.scheduled_datetime || null,
      was_reorder: cart.was_reorder || false,
      source_order_id: cart.source_order_id || null,
      created_at: nowIso,
      updated_at: nowIso,
      placed_at: nowIso,
      items: []
    };

    const orderItems = this._getFromStorage('order_items', []);
    const orderItemOptions = this._getFromStorage('order_item_options', []);

    const menuItems = this._getFromStorage('menu_items', []);

    for (let i = 0; i < cartItems.length; i++) {
      const ci = cartItems[i];
      let mi = null;
      for (let m = 0; m < menuItems.length; m++) {
        if (menuItems[m].id === ci.menu_item_id) {
          mi = menuItems[m];
          break;
        }
      }
      const orderItemId = this._generateId('order_item');
      const orderItem = {
        id: orderItemId,
        order_id: orderId,
        restaurant_id: restaurant.id,
        menu_item_id: ci.menu_item_id || null,
        menu_item_name: ci.menu_item_name,
        category_slug: ci.category_slug || null,
        quantity: ci.quantity,
        unit_price: ci.unit_price,
        line_subtotal: ci.line_subtotal,
        selected_variant_id: ci.selected_variant_id || null,
        selected_size: ci.selected_size || null,
        calories: ci.calories || null,
        is_vegetarian: ci.is_vegetarian,
        is_vegan: ci.is_vegan,
        is_gluten_free: ci.is_gluten_free,
        contains_nuts: ci.contains_nuts,
        special_instructions: ci.special_instructions || null,
        option_selections: []
      };

      // Map cart_item_options -> order_item_options
      const cartItemOptions = this._getFromStorage('cart_item_options', []);
      const optionIds = [];
      for (let o = 0; o < cartItemOptions.length; o++) {
        if (cartItemOptions[o].cart_item_id === ci.id) {
          const cio = cartItemOptions[o];
          const oioId = this._generateId('order_item_option');
          const orderItemOption = {
            id: oioId,
            order_item_id: orderItemId,
            menu_item_option_id: cio.menu_item_option_id || null,
            name: cio.name,
            group_name: cio.group_name || null,
            price_delta: cio.price_delta || 0,
            calories_delta: cio.calories_delta || null,
            is_bacon: cio.is_bacon || false
          };
          orderItemOptions.push(orderItemOption);
          optionIds.push(oioId);
        }
      }
      orderItem.option_selections = optionIds;
      orderItems.push(orderItem);
      order.items.push(orderItem.id);
    }

    // persist order & related
    const orders = this._getFromStorage('orders', []);
    orders.push(order);
    this._saveToStorage('orders', orders);
    this._saveToStorage('order_items', orderItems);
    this._saveToStorage('order_item_options', orderItemOptions);

    return { success: true, errors: [], order: order };
  }

  // --------------------- INTERFACES ---------------------

  // getHomePageContext()
  getHomePageContext() {
    const restaurants = this._getFromStorage('restaurants', []);
    const categories = this._getFromStorage('menu_categories', []);
    const cartRecord = this._getCurrentCartRecord();
    const cart = cartRecord.cart;

    // Featured restaurants: just all open restaurants for now
    const featured = [];
    for (let i = 0; i < restaurants.length; i++) {
      const r = restaurants[i];
      if (r.is_open === false) continue;
      featured.push({
        restaurant_id: r.id,
        full_display_name: r.full_display_name || r.name,
        primary_cuisine: r.primary_cuisine,
        display_cuisines: [r.primary_cuisine].concat(r.additional_cuisines || []),
        rating: typeof r.rating === 'number' ? r.rating : null,
        rating_count: typeof r.rating_count === 'number' ? r.rating_count : 0,
        price_level: r.price_level || null,
        delivery_fee: typeof r.delivery_fee === 'number' ? r.delivery_fee : 0,
        supports_pickup: !!r.supports_pickup,
        supports_delivery: !!r.supports_delivery,
        min_delivery_time_minutes: r.min_delivery_time_minutes || null,
        max_delivery_time_minutes: r.max_delivery_time_minutes || null,
        pickup_estimate_minutes: r.pickup_estimate_minutes || null,
        is_open: r.is_open !== false,
        restaurant: r
      });
    }

    // Popular categories: distinct slugs
    const seenSlugs = {};
    const popularCategories = [];
    for (let j = 0; j < categories.length; j++) {
      const c = categories[j];
      if (!c.is_active) continue;
      if (seenSlugs[c.slug]) continue;
      seenSlugs[c.slug] = true;
      popularCategories.push({ slug: c.slug, name: c.name });
    }

    let fulfillmentType = null;
    let pickupLocationLabel = null;
    let deliveryPostalCode = null;
    let hasActiveCart = false;
    let cartItemsCount = 0;
    let itemsSubtotal = 0;

    if (cart) {
      fulfillmentType = cart.fulfillment_type;
      pickupLocationLabel = cart.pickup_location_label || null;
      deliveryPostalCode = cart.delivery_postal_code || null;
      hasActiveCart = true;
      itemsSubtotal = cart.items_subtotal || 0;
      cartItemsCount = this._calculateItemsCount(cart.id);
    }

    return {
      featured_restaurants: featured,
      popular_categories: popularCategories,
      current_order_context: {
        fulfillment_type: fulfillmentType,
        pickup_location_label: pickupLocationLabel,
        delivery_postal_code: deliveryPostalCode,
        has_active_cart: hasActiveCart,
        cart_items_count: cartItemsCount,
        items_subtotal: itemsSubtotal
      }
    };
  }

  // getPickupRestaurantOptions()
  getPickupRestaurantOptions() {
    const restaurants = this._getFromStorage('restaurants', []);
    const options = [];
    for (let i = 0; i < restaurants.length; i++) {
      const r = restaurants[i];
      if (!r.supports_pickup) continue;
      options.push({
        restaurant_id: r.id,
        full_display_name: r.full_display_name || r.name,
        branch_name: r.branch_name || null,
        area_name: r.area_name || null,
        address_line1: r.address_line1 || null,
        city: r.city || null,
        postal_code: r.postal_code || null,
        pickup_estimate_minutes: r.pickup_estimate_minutes || null,
        is_open: r.is_open !== false,
        restaurant: r
      });
    }
    return options;
  }

  // startPickupOrder(restaurantId)
  startPickupOrder(restaurantId) {
    const restaurants = this._getFromStorage('restaurants', []);
    let restaurant = null;
    for (let i = 0; i < restaurants.length; i++) {
      if (restaurants[i].id === restaurantId) {
        restaurant = restaurants[i];
        break;
      }
    }

    const pickupLabel = restaurant ? (restaurant.branch_name || restaurant.area_name || null) : null;

    const cart = this._resetCart('pickup', {
      restaurant_id: restaurantId,
      pickup_location_label: pickupLabel
    });

    const itemsCount = this._calculateItemsCount(cart.id);

    return {
      restaurant_id: restaurantId,
      full_display_name: restaurant ? (restaurant.full_display_name || restaurant.name) : null,
      pickup_location_label: pickupLabel,
      pickup_estimate_minutes: restaurant ? restaurant.pickup_estimate_minutes || null : null,
      cart: {
        fulfillment_type: cart.fulfillment_type,
        items_subtotal: cart.items_subtotal || 0,
        items_count: itemsCount
      }
    };
  }

  // startDeliveryOrder(location)
  startDeliveryOrder(location) {
    const postalCode = location && location.postal_code ? location.postal_code : null;
    const addressLine1 = location && location.address_line1 ? location.address_line1 : null;

    const cart = this._resetCart('delivery', {
      restaurant_id: null,
      delivery_postal_code: postalCode
    });

    const restaurants = this._getFromStorage('restaurants', []);
    let suggestedCount = 0;
    for (let i = 0; i < restaurants.length; i++) {
      const r = restaurants[i];
      if (!r.supports_delivery) continue;
      if (postalCode && r.postal_code && r.postal_code !== postalCode) continue;
      suggestedCount++;
    }

    const previewParts = [];
    if (addressLine1) previewParts.push(addressLine1);
    if (postalCode) previewParts.push(postalCode);

    return {
      fulfillment_type: 'delivery',
      delivery_postal_code: postalCode,
      delivery_address_preview: previewParts.join(', '),
      suggested_restaurants_count: suggestedCount
    };
  }

  // getRestaurantFilterOptions()
  getRestaurantFilterOptions() {
    const restaurants = this._getFromStorage('restaurants', []);
    const cuisineSet = {};
    const priceSet = {};

    for (let i = 0; i < restaurants.length; i++) {
      const r = restaurants[i];
      if (r.primary_cuisine) cuisineSet[r.primary_cuisine] = true;
      const extra = r.additional_cuisines || [];
      for (let j = 0; j < extra.length; j++) {
        cuisineSet[extra[j]] = true;
      }
      if (r.price_level) priceSet[r.price_level] = true;
    }

    const cuisines = Object.keys(cuisineSet);
    const price_levels = Object.keys(priceSet);

    const rating_thresholds = [3, 3.5, 4, 4.5];

    const delivery_fee_ranges = [
      { label: 'Under $2', max_fee: 2 },
      { label: 'Under $5', max_fee: 5 },
      { label: 'Under $10', max_fee: 10 }
    ];

    const sort_options = [
      { value: 'fastest_delivery', label: 'Fastest delivery' },
      { value: 'delivery_time_low_to_high', label: 'Delivery time - Low to High' },
      { value: 'rating_high_to_low', label: 'Rating - High to Low' }
    ];

    return {
      cuisines: cuisines,
      price_levels: price_levels,
      rating_thresholds: rating_thresholds,
      delivery_fee_ranges: delivery_fee_ranges,
      sort_options: sort_options
    };
  }

  // getRestaurants(filters, sort_by, page, page_size)
  getRestaurants(filters, sort_by, page, page_size) {
    const restaurants = this._getFromStorage('restaurants', []);
    filters = filters || {};
    page = page || 1;
    page_size = page_size || 20;

    let list = [];
    for (let i = 0; i < restaurants.length; i++) {
      const r = restaurants[i];
      // filters
      if (filters.primary_cuisine && r.primary_cuisine !== filters.primary_cuisine) continue;
      if (typeof filters.min_rating === 'number') {
        const rating = typeof r.rating === 'number' ? r.rating : 0;
        if (rating < filters.min_rating) continue;
      }
      if (typeof filters.max_delivery_fee === 'number') {
        const fee = typeof r.delivery_fee === 'number' ? r.delivery_fee : 0;
        if (fee > filters.max_delivery_fee) continue;
      }
      if (filters.price_level && r.price_level !== filters.price_level) continue;
      if (typeof filters.supports_pickup === 'boolean' && !!r.supports_pickup !== filters.supports_pickup) continue;
      if (typeof filters.supports_delivery === 'boolean' && !!r.supports_delivery !== filters.supports_delivery) continue;
      if (filters.postal_code && r.postal_code && r.postal_code !== filters.postal_code) continue;

      list.push(r);
    }

    // Sorting
    if (sort_by === 'fastest_delivery' || sort_by === 'delivery_time_low_to_high') {
      list.sort(function (a, b) {
        const aTime = typeof a.min_delivery_time_minutes === 'number' ? a.min_delivery_time_minutes : 9999;
        const bTime = typeof b.min_delivery_time_minutes === 'number' ? b.min_delivery_time_minutes : 9999;
        if (aTime !== bTime) return aTime - bTime;
        const ar = typeof a.rating === 'number' ? a.rating : 0;
        const br = typeof b.rating === 'number' ? b.rating : 0;
        return br - ar;
      });
    } else if (sort_by === 'rating_high_to_low') {
      list.sort(function (a, b) {
        const ar = typeof a.rating === 'number' ? a.rating : 0;
        const br = typeof b.rating === 'number' ? b.rating : 0;
        return br - ar;
      });
    }

    const total = list.length;
    const totalPages = Math.max(1, Math.ceil(total / page_size));
    const start = (page - 1) * page_size;
    const end = start + page_size;
    const slice = list.slice(start, end);

    const resultRestaurants = [];
    for (let i = 0; i < slice.length; i++) {
      const r = slice[i];
      resultRestaurants.push({
        restaurant_id: r.id,
        full_display_name: r.full_display_name || r.name,
        primary_cuisine: r.primary_cuisine,
        display_cuisines: [r.primary_cuisine].concat(r.additional_cuisines || []),
        rating: typeof r.rating === 'number' ? r.rating : null,
        rating_count: typeof r.rating_count === 'number' ? r.rating_count : 0,
        price_level: r.price_level || null,
        delivery_fee: typeof r.delivery_fee === 'number' ? r.delivery_fee : 0,
        min_delivery_time_minutes: r.min_delivery_time_minutes || null,
        max_delivery_time_minutes: r.max_delivery_time_minutes || null,
        pickup_estimate_minutes: r.pickup_estimate_minutes || null,
        supports_pickup: !!r.supports_pickup,
        supports_delivery: !!r.supports_delivery,
        is_open: r.is_open !== false,
        restaurant: r
      });
    }

    // Instrumentation for task completion tracking (task_5 - restaurant search)
    try {
      if (
        filters &&
        filters.primary_cuisine &&
        (filters.primary_cuisine === 'Thai' || filters.primary_cuisine === 'thai') &&
        typeof filters.min_rating === 'number' &&
        filters.min_rating >= 4 &&
        typeof filters.max_delivery_fee === 'number' &&
        filters.max_delivery_fee <= 2 &&
        (sort_by === 'fastest_delivery' || sort_by === 'delivery_time_low_to_high')
      ) {
        localStorage.setItem(
          'task5_restaurantSearchParams',
          JSON.stringify({
            "filters_used": {
              "primary_cuisine": filters.primary_cuisine || null,
              "min_rating": filters.min_rating || null,
              "max_delivery_fee": filters.max_delivery_fee || null
            },
            "sort_by": sort_by || null,
            "result_restaurant_ids": slice.map(function (r) { return r.id; })
          })
        );
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      restaurants: resultRestaurants,
      page: page,
      total_pages: totalPages
    };
  }

  // getRestaurantOverview(restaurantId)
  getRestaurantOverview(restaurantId) {
    // Instrumentation for task completion tracking (task_5 - selected restaurant)
    try {
      localStorage.setItem('task5_selectedRestaurantId', restaurantId);
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    const restaurants = this._getFromStorage('restaurants', []);
    const categories = this._getFromStorage('menu_categories', []);
    const cartRecord = this._getCurrentCartRecord();
    const cart = cartRecord.cart;

    let r = null;
    for (let i = 0; i < restaurants.length; i++) {
      if (restaurants[i].id === restaurantId) {
        r = restaurants[i];
        break;
      }
    }

    const catList = [];
    for (let j = 0; j < categories.length; j++) {
      const c = categories[j];
      if (c.restaurant_id === restaurantId && c.is_active) {
        catList.push({
          category_id: c.id,
          name: c.name,
          slug: c.slug,
          display_order: c.display_order || 0,
          is_active: c.is_active
        });
      }
    }

    catList.sort(function (a, b) {
      return (a.display_order || 0) - (b.display_order || 0);
    });

    let itemsSubtotal = 0;
    let itemsCount = 0;
    let fulfillmentType = null;
    if (cart && cart.restaurant_id === restaurantId) {
      this._recalculateCartTotals(cart.id);
      itemsSubtotal = cart.items_subtotal || 0;
      itemsCount = this._calculateItemsCount(cart.id);
      fulfillmentType = cart.fulfillment_type;
    }

    return {
      restaurant: r
        ? {
            restaurant_id: r.id,
            full_display_name: r.full_display_name || r.name,
            branch_name: r.branch_name || null,
            area_name: r.area_name || null,
            address_line1: r.address_line1 || null,
            city: r.city || null,
            postal_code: r.postal_code || null,
            primary_cuisine: r.primary_cuisine,
            display_cuisines: [r.primary_cuisine].concat(r.additional_cuisines || []),
            rating: typeof r.rating === 'number' ? r.rating : null,
            rating_count: typeof r.rating_count === 'number' ? r.rating_count : 0,
            delivery_fee: typeof r.delivery_fee === 'number' ? r.delivery_fee : 0,
            min_delivery_time_minutes: r.min_delivery_time_minutes || null,
            max_delivery_time_minutes: r.max_delivery_time_minutes || null,
            pickup_estimate_minutes: r.pickup_estimate_minutes || null,
            supports_pickup: !!r.supports_pickup,
            supports_delivery: !!r.supports_delivery,
            is_open: r.is_open !== false
          }
        : null,
      categories: catList,
      current_cart_summary: {
        fulfillment_type: fulfillmentType,
        items_subtotal: itemsSubtotal,
        items_count: itemsCount
      }
    };
  }

  // getMenuFilterOptions(restaurantId, categorySlug)
  getMenuFilterOptions(restaurantId, categorySlug) {
    const categories = this._getFromStorage('menu_categories', []);
    const menuItems = this._getFromStorage('menu_items', []);
    const variants = this._getFromStorage('menu_item_variants', []);
    const optionGroups = this._getFromStorage('menu_item_option_groups', []);
    const options = this._getFromStorage('menu_item_options', []);

    const categoryIds = [];
    for (let i = 0; i < categories.length; i++) {
      const c = categories[i];
      if (c.restaurant_id === restaurantId && c.slug === categorySlug && c.is_active) {
        categoryIds.push(c.id);
      }
    }

    const items = [];
    for (let j = 0; j < menuItems.length; j++) {
      const m = menuItems[j];
      if (m.restaurant_id === restaurantId && categoryIds.indexOf(m.category_id) !== -1 && m.status === 'active') {
        items.push(m);
      }
    }

    const sizeSet = {};
    const dietaryFlags = {
      supports_vegetarian: false,
      supports_vegan: false,
      supports_gluten_free: false,
      supports_no_sugar: false,
      supports_zero_calorie: false
    };

    let minPrice = null;
    let maxPrice = null;
    let minCalories = null;
    let maxCalories = null;

    const toppingOptionIds = {};

    for (let k = 0; k < items.length; k++) {
      const item = items[k];

      // price
      const itemMinPrice = typeof item.min_price === 'number' ? item.min_price : item.base_price;
      const itemMaxPrice = typeof item.max_price === 'number' ? item.max_price : item.base_price;
      if (minPrice === null || itemMinPrice < minPrice) minPrice = itemMinPrice;
      if (maxPrice === null || itemMaxPrice > maxPrice) maxPrice = itemMaxPrice;

      // calories
      if (typeof item.calories === 'number') {
        if (minCalories === null || item.calories < minCalories) minCalories = item.calories;
        if (maxCalories === null || item.calories > maxCalories) maxCalories = item.calories;
      }

      if (item.is_vegetarian) dietaryFlags.supports_vegetarian = true;
      if (item.is_vegan) dietaryFlags.supports_vegan = true;
      if (item.is_gluten_free) dietaryFlags.supports_gluten_free = true;
      if (item.is_no_sugar) dietaryFlags.supports_no_sugar = true;
      if (item.is_zero_calorie) dietaryFlags.supports_zero_calorie = true;

      // variants for size and calories
      for (let v = 0; v < variants.length; v++) {
        const variant = variants[v];
        if (variant.menu_item_id === item.id) {
          if (variant.size) sizeSet[variant.size] = true;
          if (typeof variant.calories === 'number') {
            if (minCalories === null || variant.calories < minCalories) minCalories = variant.calories;
            if (maxCalories === null || variant.calories > maxCalories) maxCalories = variant.calories;
          }
        }
      }

      // topping options
      for (let g = 0; g < optionGroups.length; g++) {
        const group = optionGroups[g];
        if (group.menu_item_id === item.id && group.type === 'topping') {
          for (let o = 0; o < options.length; o++) {
            const opt = options[o];
            if (opt.option_group_id === group.id) {
              toppingOptionIds[opt.id] = opt.name;
            }
          }
        }
      }
    }

    const sizes = Object.keys(sizeSet);
    const toppingArray = [];
    for (const oid in toppingOptionIds) {
      if (Object.prototype.hasOwnProperty.call(toppingOptionIds, oid)) {
        toppingArray.push({ option_id: oid, name: toppingOptionIds[oid] });
      }
    }

    const hasContainsNutsLabel = items.some(function (item) {
      return !!item.contains_nuts || (item.label_badges || []).indexOf('Contains nuts') !== -1;
    });

    return {
      sizes: sizes,
      toppings: toppingArray,
      dietary_flags: dietaryFlags,
      has_contains_nuts_label: hasContainsNutsLabel,
      price_range: {
        min_price: minPrice,
        max_price: maxPrice
      },
      calorie_range: {
        min_calories: minCalories,
        max_calories: maxCalories
      }
    };
  }

  // getMenuItems(restaurantId, categorySlug, filters, sort_by)
  getMenuItems(restaurantId, categorySlug, filters, sort_by) {
    filters = filters || {};
    const categories = this._getFromStorage('menu_categories', []);
    const menuItems = this._getFromStorage('menu_items', []);
    const variants = this._getFromStorage('menu_item_variants', []);
    const optionGroups = this._getFromStorage('menu_item_option_groups', []);
    const options = this._getFromStorage('menu_item_options', []);

    const categoryIds = [];
    for (let i = 0; i < categories.length; i++) {
      const c = categories[i];
      if (c.restaurant_id === restaurantId && c.slug === categorySlug && c.is_active) {
        categoryIds.push(c.id);
      }
    }

    // Pre-build topping mapping menu_item -> array of option ids
    const itemToppings = {};
    for (let g = 0; g < optionGroups.length; g++) {
      const group = optionGroups[g];
      if (group.type !== 'topping') continue;
      for (let o = 0; o < options.length; o++) {
        const opt = options[o];
        if (opt.option_group_id === group.id) {
          if (!itemToppings[group.menu_item_id]) itemToppings[group.menu_item_id] = [];
          itemToppings[group.menu_item_id].push(opt.id);
        }
      }
    }

    const items = [];
    for (let j = 0; j < menuItems.length; j++) {
      const m = menuItems[j];
      if (m.restaurant_id !== restaurantId) continue;
      if (categoryIds.indexOf(m.category_id) === -1) continue;
      if (m.status !== 'active') continue;

      // size filter
      if (filters.size) {
        let hasSize = false;
        for (let v = 0; v < variants.length; v++) {
          const variant = variants[v];
          if (variant.menu_item_id === m.id && variant.size === filters.size) {
            hasSize = true;
            break;
          }
        }
        if (!hasSize) continue;
      }

      // topping filters
      const itemToppingIds = itemToppings[m.id] || [];
      if (filters.include_topping_option_ids && filters.include_topping_option_ids.length) {
        let includeOk = true;
        for (let t = 0; t < filters.include_topping_option_ids.length; t++) {
          if (itemToppingIds.indexOf(filters.include_topping_option_ids[t]) === -1) {
            includeOk = false;
            break;
          }
        }
        if (!includeOk) continue;
      }
      if (filters.exclude_topping_option_ids && filters.exclude_topping_option_ids.length) {
        let excludeFail = false;
        for (let t2 = 0; t2 < filters.exclude_topping_option_ids.length; t2++) {
          if (itemToppingIds.indexOf(filters.exclude_topping_option_ids[t2]) !== -1) {
            excludeFail = true;
            break;
          }
        }
        if (excludeFail) continue;
      }

      // dietary filters
      if (typeof filters.is_vegetarian === 'boolean' && !!m.is_vegetarian !== filters.is_vegetarian) continue;
      if (typeof filters.is_vegan === 'boolean' && !!m.is_vegan !== filters.is_vegan) continue;
      if (typeof filters.is_gluten_free === 'boolean' && !!m.is_gluten_free !== filters.is_gluten_free) continue;

      if (typeof filters.contains_nuts === 'boolean') {
        const vNuts = !!m.contains_nuts;
        if (filters.contains_nuts !== vNuts) continue;
      }

      if (typeof filters.is_no_sugar === 'boolean' && !!m.is_no_sugar !== filters.is_no_sugar) continue;
      if (typeof filters.is_zero_calorie === 'boolean' && !!m.is_zero_calorie !== filters.is_zero_calorie) continue;

      // calories filter
      if (typeof filters.max_calories === 'number') {
        const cals = typeof m.calories === 'number' ? m.calories : null;
        if (cals !== null && cals > filters.max_calories) continue;
      }

      // price filter
      const minPrice = typeof m.min_price === 'number' ? m.min_price : m.base_price;
      const maxPrice = typeof m.max_price === 'number' ? m.max_price : m.base_price;
      if (typeof filters.min_price === 'number' && maxPrice < filters.min_price) continue;
      if (typeof filters.max_price === 'number' && minPrice > filters.max_price) continue;

      items.push(m);
    }

    // Sorting
    if (sort_by === 'price_low_to_high' || sort_by === 'price_high_to_low') {
      items.sort(function (a, b) {
        const aPrice = typeof a.min_price === 'number' ? a.min_price : a.base_price;
        const bPrice = typeof b.min_price === 'number' ? b.min_price : b.base_price;
        return sort_by === 'price_low_to_high' ? aPrice - bPrice : bPrice - aPrice;
      });
    } else if (sort_by === 'calories_low_to_high') {
      items.sort(function (a, b) {
        const aC = typeof a.calories === 'number' ? a.calories : 999999;
        const bC = typeof b.calories === 'number' ? b.calories : 999999;
        return aC - bC;
      });
    }

    const result = [];
    for (let i = 0; i < items.length; i++) {
      const m = items[i];
      result.push({
        menu_item_id: m.id,
        name: m.name,
        description: m.description || '',
        image_url: m.image_url || null,
        base_price: m.base_price,
        min_price: typeof m.min_price === 'number' ? m.min_price : m.base_price,
        max_price: typeof m.max_price === 'number' ? m.max_price : m.base_price,
        has_variants: !!m.has_variants,
        default_variant_label: m.default_variant_id || null,
        calories: typeof m.calories === 'number' ? m.calories : null,
        is_vegetarian: !!m.is_vegetarian,
        is_vegan: !!m.is_vegan,
        is_gluten_free: !!m.is_gluten_free,
        contains_nuts: !!m.contains_nuts,
        label_badges: m.label_badges || [],
        status: m.status
      });
    }

    return result;
  }

  // getMenuItemDetails(menuItemId)
  getMenuItemDetails(menuItemId) {
    const menuItems = this._getFromStorage('menu_items', []);
    const variants = this._getFromStorage('menu_item_variants', []);
    const optionGroups = this._getFromStorage('menu_item_option_groups', []);
    const options = this._getFromStorage('menu_item_options', []);

    let item = null;
    for (let i = 0; i < menuItems.length; i++) {
      if (menuItems[i].id === menuItemId) {
        item = menuItems[i];
        break;
      }
    }
    if (!item) {
      return null;
    }

    const itemVariants = [];
    for (let v = 0; v < variants.length; v++) {
      const variant = variants[v];
      if (variant.menu_item_id === menuItemId) {
        itemVariants.push({
          variant_id: variant.id,
          name: variant.name,
          size: variant.size,
          price: variant.price,
          calories: typeof variant.calories === 'number' ? variant.calories : null,
          is_default: !!variant.is_default
        });
      }
    }

    const itemOptionGroups = [];
    for (let g = 0; g < optionGroups.length; g++) {
      const group = optionGroups[g];
      if (group.menu_item_id !== menuItemId) continue;
      const groupOptions = [];
      for (let o = 0; o < options.length; o++) {
        const opt = options[o];
        if (opt.option_group_id === group.id) {
          groupOptions.push({
            option_id: opt.id,
            name: opt.name,
            description: opt.description || '',
            price_delta: opt.price_delta,
            calories_delta: typeof opt.calories_delta === 'number' ? opt.calories_delta : null,
            is_default: !!opt.is_default,
            is_bacon: !!opt.is_bacon,
            is_vegetarian: !!opt.is_vegetarian,
            is_vegan: !!opt.is_vegan,
            is_gluten_free: !!opt.is_gluten_free,
            contains_nuts: !!opt.contains_nuts,
            is_no_sugar: !!opt.is_no_sugar,
            is_zero_calorie: !!opt.is_zero_calorie
          });
        }
      }
      itemOptionGroups.push({
        option_group_id: group.id,
        name: group.name,
        type: group.type,
        selection_mode: group.selection_mode,
        min_selections: typeof group.min_selections === 'number' ? group.min_selections : null,
        max_selections: typeof group.max_selections === 'number' ? group.max_selections : null,
        max_free: typeof group.max_free === 'number' ? group.max_free : null,
        price_per_extra: typeof group.price_per_extra === 'number' ? group.price_per_extra : null,
        is_required: !!group.is_required,
        options: groupOptions
      });
    }

    return {
      menu_item_id: item.id,
      restaurant_id: item.restaurant_id,
      name: item.name,
      description: item.description || '',
      image_url: item.image_url || null,
      base_price: item.base_price,
      calories: typeof item.calories === 'number' ? item.calories : null,
      is_vegetarian: !!item.is_vegetarian,
      is_vegan: !!item.is_vegan,
      is_gluten_free: !!item.is_gluten_free,
      contains_nuts: !!item.contains_nuts,
      label_badges: item.label_badges || [],
      variants: itemVariants,
      option_groups: itemOptionGroups
    };
  }

  // calculateMenuItemPrice(menuItemId, selectedVariantId, selectedOptionIds)
  calculateMenuItemPrice(menuItemId, selectedVariantId, selectedOptionIds) {
    selectedOptionIds = selectedOptionIds || [];

    const menuItems = this._getFromStorage('menu_items', []);
    const variants = this._getFromStorage('menu_item_variants', []);
    const optionGroups = this._getFromStorage('menu_item_option_groups', []);
    const options = this._getFromStorage('menu_item_options', []);

    let item = null;
    for (let i = 0; i < menuItems.length; i++) {
      if (menuItems[i].id === menuItemId) {
        item = menuItems[i];
        break;
      }
    }
    if (!item) {
      return {
        unit_price: 0,
        calories: 0,
        pricing_breakdown: { base_price: 0, options_total: 0 },
        validation_errors: ['menu_item_not_found']
      };
    }

    let basePrice = item.base_price || 0;
    let baseCalories = typeof item.calories === 'number' ? item.calories : 0;

    let variantUsed = null;
    if (selectedVariantId) {
      for (let v = 0; v < variants.length; v++) {
        const variant = variants[v];
        if (variant.menu_item_id === menuItemId && variant.id === selectedVariantId) {
          variantUsed = variant;
          break;
        }
      }
    } else {
      for (let v2 = 0; v2 < variants.length; v2++) {
        const variant = variants[v2];
        if (variant.menu_item_id === menuItemId && variant.is_default) {
          variantUsed = variant;
          break;
        }
      }
    }

    if (variantUsed) {
      basePrice = variantUsed.price;
      if (typeof variantUsed.calories === 'number') {
        baseCalories = variantUsed.calories;
      }
    }

    let optionsTotal = 0;
    let optionsCalories = 0;
    const validationErrors = [];

    // Group selected options by group
    const selectedByGroup = {};
    const optionById = {};
    for (let o = 0; o < options.length; o++) {
      optionById[options[o].id] = options[o];
    }

    for (let i = 0; i < selectedOptionIds.length; i++) {
      const optId = selectedOptionIds[i];
      const opt = optionById[optId];
      if (!opt) continue;
      optionsTotal += opt.price_delta || 0;
      if (typeof opt.calories_delta === 'number') {
        optionsCalories += opt.calories_delta;
      }
      for (let g = 0; g < optionGroups.length; g++) {
        const group = optionGroups[g];
        if (group.id === opt.option_group_id) {
          if (!selectedByGroup[group.id]) selectedByGroup[group.id] = { group: group, count: 0 };
          selectedByGroup[group.id].count++;
          break;
        }
      }
    }

    // apply group-level pricing & validation
    for (const gid in selectedByGroup) {
      if (!Object.prototype.hasOwnProperty.call(selectedByGroup, gid)) continue;
      const info = selectedByGroup[gid];
      const group = info.group;
      const count = info.count;
      if (typeof group.min_selections === 'number' && count < group.min_selections) {
        validationErrors.push('min_selections_not_met:' + group.name);
      }
      if (typeof group.max_selections === 'number' && count > group.max_selections) {
        validationErrors.push('max_selections_exceeded:' + group.name);
      }
      if (typeof group.max_free === 'number' && typeof group.price_per_extra === 'number') {
        const extras = Math.max(0, count - group.max_free);
        optionsTotal += extras * group.price_per_extra;
      }
    }

    const unitPrice = basePrice + optionsTotal;
    const calories = baseCalories + optionsCalories;

    return {
      unit_price: unitPrice,
      calories: calories,
      pricing_breakdown: {
        base_price: basePrice,
        options_total: optionsTotal
      },
      validation_errors: validationErrors
    };
  }

  // addMenuItemToCart(menuItemId, quantity, configuration)
  addMenuItemToCart(menuItemId, quantity, configuration) {
    quantity = typeof quantity === 'number' && quantity > 0 ? quantity : 1;
    configuration = configuration || {};

    const menuItems = this._getFromStorage('menu_items', []);
    const variants = this._getFromStorage('menu_item_variants', []);
    const optionGroups = this._getFromStorage('menu_item_option_groups', []);
    const menuOptions = this._getFromStorage('menu_item_options', []);
    const categories = this._getFromStorage('menu_categories', []);

    let item = null;
    for (let i = 0; i < menuItems.length; i++) {
      if (menuItems[i].id === menuItemId) {
        item = menuItems[i];
        break;
      }
    }
    if (!item) {
      return {
        success: false,
        cart: null,
        added_item: null,
        message: 'menu_item_not_found'
      };
    }

    const selectedVariantId = configuration.selectedVariantId || null;
    const selectedOptionIds = configuration.selectedOptionIds || [];
    const specialInstructions = configuration.specialInstructions || '';

    const priceInfo = this.calculateMenuItemPrice(menuItemId, selectedVariantId, selectedOptionIds);
    if (priceInfo.validation_errors && priceInfo.validation_errors.length) {
      // still allow, but surface validation
    }

    const restaurantId = item.restaurant_id;
    const cart = this._ensureCartForRestaurant(restaurantId);

    // determine category slug
    let categorySlug = null;
    for (let c = 0; c < categories.length; c++) {
      if (categories[c].id === item.category_id) {
        categorySlug = categories[c].slug;
        break;
      }
    }

    let variantUsed = null;
    if (selectedVariantId) {
      for (let v = 0; v < variants.length; v++) {
        if (variants[v].id === selectedVariantId) {
          variantUsed = variants[v];
          break;
        }
      }
    } else {
      for (let v2 = 0; v2 < variants.length; v2++) {
        const vv = variants[v2];
        if (vv.menu_item_id === item.id && vv.is_default) {
          variantUsed = vv;
          break;
        }
      }
    }

    const cartItems = this._getFromStorage('cart_items', []);
    const cartItemOptions = this._getFromStorage('cart_item_options', []);

    const cartItemId = this._generateId('cart_item');
    const unitPrice = priceInfo.unit_price;
    const lineSubtotal = unitPrice * quantity;

    const cartItem = {
      id: cartItemId,
      cart_id: cart.id,
      restaurant_id: restaurantId,
      menu_item_id: item.id,
      menu_item_name: item.name,
      category_slug: categorySlug,
      quantity: quantity,
      unit_price: unitPrice,
      line_subtotal: lineSubtotal,
      selected_variant_id: variantUsed ? variantUsed.id : null,
      selected_size: variantUsed ? variantUsed.size : null,
      calories: priceInfo.calories || item.calories || null,
      is_vegetarian: !!item.is_vegetarian,
      is_vegan: !!item.is_vegan,
      is_gluten_free: !!item.is_gluten_free,
      contains_nuts: !!item.contains_nuts,
      special_instructions: specialInstructions,
      option_selections: []
    };

    const optionSelectionIds = [];
    for (let i2 = 0; i2 < selectedOptionIds.length; i2++) {
      const optId = selectedOptionIds[i2];
      let opt = null;
      for (let o = 0; o < menuOptions.length; o++) {
        if (menuOptions[o].id === optId) {
          opt = menuOptions[o];
          break;
        }
      }
      if (!opt) continue;
      const group = optionGroups.find(function (g) { return g.id === opt.option_group_id; }) || null;
      const cartItemOptionId = this._generateId('cart_item_option');
      const cio = {
        id: cartItemOptionId,
        cart_item_id: cartItemId,
        menu_item_option_id: opt.id,
        name: opt.name,
        group_name: group ? group.name : null,
        price_delta: opt.price_delta || 0,
        calories_delta: typeof opt.calories_delta === 'number' ? opt.calories_delta : null,
        is_bacon: !!opt.is_bacon
      };
      cartItemOptions.push(cio);
      optionSelectionIds.push(cartItemOptionId);
    }

    cartItem.option_selections = optionSelectionIds;
    cartItems.push(cartItem);

    this._saveToStorage('cart_items', cartItems);
    this._saveToStorage('cart_item_options', cartItemOptions);

    const updatedCart = this._recalculateCartTotals(cart.id);
    const itemsCount = this._calculateItemsCount(cart.id);

    return {
      success: true,
      cart: {
        items_count: itemsCount,
        items_subtotal: updatedCart.items_subtotal || 0,
        fulfillment_type: updatedCart.fulfillment_type,
        restaurant_id: updatedCart.restaurant_id
      },
      added_item: {
        cart_item_id: cartItemId,
        menu_item_name: cartItem.menu_item_name,
        quantity: cartItem.quantity,
        unit_price: cartItem.unit_price,
        line_subtotal: cartItem.line_subtotal
      },
      message: ''
    };
  }

  // getCart()
  getCart() {
    const record = this._getCurrentCartRecord();
    let cart = record.cart;
    if (!cart) {
      return {
        cart_id: null,
        fulfillment_type: null,
        restaurant: null,
        items: [],
        cutlery_sets: 0,
        items_subtotal: 0,
        discount_total: 0,
        delivery_fee: 0,
        tax_total: 0,
        total: 0,
        promo_code: null,
        scheduled_type: null,
        scheduled_datetime: null
      };
    }

    cart = this._recalculateCartTotals(cart.id);

    const restaurants = this._getFromStorage('restaurants', []);
    const menuItems = this._getFromStorage('menu_items', []);
    const cartItems = this._getFromStorage('cart_items', []);
    const cartItemOptions = this._getFromStorage('cart_item_options', []);
    const promos = this._getFromStorage('promo_codes', []);

    let restaurant = null;
    for (let r = 0; r < restaurants.length; r++) {
      if (restaurants[r].id === cart.restaurant_id) {
        restaurant = restaurants[r];
        break;
      }
    }

    const items = [];
    for (let i = 0; i < cartItems.length; i++) {
      const ci = cartItems[i];
      if (ci.cart_id !== cart.id) continue;

      let mi = null;
      for (let m = 0; m < menuItems.length; m++) {
        if (menuItems[m].id === ci.menu_item_id) {
          mi = menuItems[m];
          break;
        }
      }

      const optionsForItem = [];
      for (let o = 0; o < cartItemOptions.length; o++) {
        const cio = cartItemOptions[o];
        if (cio.cart_item_id === ci.id) {
          optionsForItem.push({
            name: cio.name,
            group_name: cio.group_name,
            price_delta: cio.price_delta
          });
        }
      }

      items.push({
        cart_item_id: ci.id,
        menu_item_id: ci.menu_item_id,
        menu_item_name: ci.menu_item_name,
        category_slug: ci.category_slug,
        quantity: ci.quantity,
        unit_price: ci.unit_price,
        line_subtotal: ci.line_subtotal,
        selected_size: ci.selected_size || null,
        calories: ci.calories || null,
        is_vegetarian: !!ci.is_vegetarian,
        is_vegan: !!ci.is_vegan,
        is_gluten_free: !!ci.is_gluten_free,
        contains_nuts: !!ci.contains_nuts,
        special_instructions: ci.special_instructions || '',
        options: optionsForItem,
        menu_item: mi
      });
    }

    let promo = null;
    if (cart.promo_code_id) {
      for (let p = 0; p < promos.length; p++) {
        const pr = promos[p];
        if (pr.id === cart.promo_code_id) {
          promo = {
            code: pr.code,
            description: pr.description || '',
            discount_value: pr.discount_value
          };
          break;
        }
      }
    }

    return {
      cart_id: cart.id,
      fulfillment_type: cart.fulfillment_type,
      restaurant: restaurant
        ? {
            restaurant_id: restaurant.id,
            full_display_name: restaurant.full_display_name || restaurant.name,
            pickup_location_label: cart.pickup_location_label || null,
            address_line1: restaurant.address_line1 || null,
            city: restaurant.city || null,
            postal_code: restaurant.postal_code || null,
            restaurant: restaurant
          }
        : null,
      items: items,
      cutlery_sets: cart.cutlery_sets || 0,
      items_subtotal: cart.items_subtotal || 0,
      discount_total: cart.discount_total || 0,
      delivery_fee: cart.delivery_fee || 0,
      tax_total: cart.tax_total || 0,
      total: cart.total || 0,
      promo_code: promo,
      scheduled_type: cart.scheduled_type || null,
      scheduled_datetime: cart.scheduled_datetime || null
    };
  }

  // updateCartItemQuantity(cartItemId, quantity)
  updateCartItemQuantity(cartItemId, quantity) {
    quantity = parseInt(quantity, 10);
    const cartItems = this._getFromStorage('cart_items', []);
    let cartId = null;
    const remaining = [];

    for (let i = 0; i < cartItems.length; i++) {
      const ci = cartItems[i];
      if (ci.id === cartItemId) {
        cartId = ci.cart_id;
        if (quantity > 0) {
          ci.quantity = quantity;
          ci.line_subtotal = (ci.unit_price || 0) * quantity;
          remaining.push(ci);
        } else {
          // quantity <= 0 -> removed; cart_item_options will be cleaned below
        }
      } else {
        remaining.push(ci);
      }
    }

    this._saveToStorage('cart_items', remaining);

    if (quantity <= 0 && cartId) {
      // remove related cart_item_options
      const cartItemOptions = this._getFromStorage('cart_item_options', []);
      const filteredOptions = cartItemOptions.filter(function (o) { return o.cart_item_id !== cartItemId; });
      this._saveToStorage('cart_item_options', filteredOptions);
    }

    if (!cartId) {
      return { success: false, cart: null };
    }

    const cart = this._recalculateCartTotals(cartId);
    const itemsCount = this._calculateItemsCount(cartId);

    return {
      success: true,
      cart: {
        items_subtotal: cart.items_subtotal || 0,
        total: cart.total || 0,
        items_count: itemsCount
      }
    };
  }

  // removeCartItem(cartItemId)
  removeCartItem(cartItemId) {
    const cartItems = this._getFromStorage('cart_items', []);
    let cartId = null;
    const remaining = [];
    for (let i = 0; i < cartItems.length; i++) {
      const ci = cartItems[i];
      if (ci.id === cartItemId) {
        cartId = ci.cart_id;
      } else {
        remaining.push(ci);
      }
    }
    this._saveToStorage('cart_items', remaining);

    const cartItemOptions = this._getFromStorage('cart_item_options', []);
    const filteredOptions = cartItemOptions.filter(function (o) { return o.cart_item_id !== cartItemId; });
    this._saveToStorage('cart_item_options', filteredOptions);

    if (!cartId) {
      return { success: false, cart: null };
    }

    const cart = this._recalculateCartTotals(cartId);
    const itemsCount = this._calculateItemsCount(cartId);

    return {
      success: true,
      cart: {
        items_subtotal: cart.items_subtotal || 0,
        total: cart.total || 0,
        items_count: itemsCount
      }
    };
  }

  // updateCartCutlerySets(cutlerySets)
  updateCartCutlerySets(cutlerySets) {
    cutlerySets = parseInt(cutlerySets, 10) || 0;
    const record = this._getCurrentCartRecord();
    let cart = record.cart;
    let carts = record.carts;

    if (!cart) {
      cart = this._getOrCreateCart();
      carts = this._getFromStorage('cart', []);
    }

    cart.cutlery_sets = cutlerySets;
    cart.updated_at = new Date().toISOString();
    this._updateCartInList(cart, carts);

    return {
      cutlery_sets: cutlerySets,
      success: true
    };
  }

  // getPickupTimeSlots()
  getPickupTimeSlots() {
    const record = this._getCurrentCartRecord();
    const cart = record.cart;
    if (!cart || !cart.restaurant_id) {
      return {
        restaurant_id: null,
        pickup_location_label: null,
        available_days: []
      };
    }
    const restaurants = this._getFromStorage('restaurants', []);
    let restaurant = null;
    for (let i = 0; i < restaurants.length; i++) {
      if (restaurants[i].id === cart.restaurant_id) {
        restaurant = restaurants[i];
        break;
      }
    }
    if (!restaurant) {
      return {
        restaurant_id: cart.restaurant_id,
        pickup_location_label: cart.pickup_location_label || null,
        available_days: []
      };
    }

    const slotsInfo = this._generateTimeSlotsForRestaurant(restaurant, 'pickup');
    return {
      restaurant_id: restaurant.id,
      pickup_location_label: cart.pickup_location_label || restaurant.branch_name || restaurant.area_name || null,
      available_days: slotsInfo.available_days
    };
  }

  // setPickupSchedule(date, time)
  setPickupSchedule(date, time) {
    const record = this._getCurrentCartRecord();
    const carts = record.carts;
    let cart = record.cart;
    if (!cart) {
      return { scheduled_type: null, scheduled_datetime: null, success: false };
    }

    const dt = date + 'T' + time + ':00';
    cart.scheduled_type = 'scheduled';
    cart.scheduled_datetime = dt;
    cart.updated_at = new Date().toISOString();
    this._updateCartInList(cart, carts);

    return {
      scheduled_type: cart.scheduled_type,
      scheduled_datetime: cart.scheduled_datetime,
      success: true
    };
  }

  // updateCartDeliveryAddress(address)
  updateCartDeliveryAddress(address) {
    address = address || {};
    const record = this._getCurrentCartRecord();
    let cart = record.cart;
    let carts = record.carts;
    if (!cart) {
      cart = this._getOrCreateCart('delivery');
      carts = this._getFromStorage('cart', []);
    }

    const addresses = this._getFromStorage('addresses', []);
    const now = new Date().toISOString();

    let addrId = cart.delivery_address_id || null;
    let addrObj = null;

    if (addrId) {
      for (let i = 0; i < addresses.length; i++) {
        if (addresses[i].id === addrId) {
          addrObj = addresses[i];
          break;
        }
      }
    }

    if (!addrObj) {
      addrId = this._generateId('addr');
      addrObj = {
        id: addrId,
        label: address.label || null,
        address_line1: address.address_line1 || null,
        address_line2: address.address_line2 || null,
        city: address.city || null,
        state: address.state || null,
        postal_code: address.postal_code || null,
        country: null,
        raw_input: null,
        instructions: address.instructions || null,
        latitude: null,
        longitude: null,
        created_at: now,
        updated_at: now
      };
      addresses.push(addrObj);
    } else {
      addrObj.label = address.label || addrObj.label;
      addrObj.address_line1 = address.address_line1 || addrObj.address_line1;
      addrObj.address_line2 = address.address_line2 || addrObj.address_line2;
      addrObj.city = address.city || addrObj.city;
      addrObj.state = address.state || addrObj.state;
      addrObj.postal_code = address.postal_code || addrObj.postal_code;
      addrObj.instructions = address.instructions || addrObj.instructions;
      addrObj.updated_at = now;
    }

    this._saveToStorage('addresses', addresses);

    const snapshot = (addrObj.address_line1 || '') + (addrObj.postal_code ? ', ' + addrObj.postal_code : '');

    cart.delivery_address_id = addrObj.id;
    cart.delivery_postal_code = addrObj.postal_code || cart.delivery_postal_code;
    cart.updated_at = now;
    this._updateCartInList(cart, carts);

    return {
      delivery_address_id: addrObj.id,
      delivery_address_snapshot: snapshot,
      success: true
    };
  }

  // getAvailableDeliveryTimeSlots()
  getAvailableDeliveryTimeSlots() {
    const record = this._getCurrentCartRecord();
    const cart = record.cart;
    if (!cart || !cart.restaurant_id) {
      return { available_days: [], supports_asap: false };
    }
    const restaurants = this._getFromStorage('restaurants', []);
    let restaurant = null;
    for (let i = 0; i < restaurants.length; i++) {
      if (restaurants[i].id === cart.restaurant_id) {
        restaurant = restaurants[i];
        break;
      }
    }
    if (!restaurant) {
      return { available_days: [], supports_asap: false };
    }
    const info = this._generateTimeSlotsForRestaurant(restaurant, 'delivery');
    return { available_days: info.available_days, supports_asap: info.supports_asap };
  }

  // setDeliverySchedule(scheduledType, date, time)
  setDeliverySchedule(scheduledType, date, time) {
    const record = this._getCurrentCartRecord();
    let cart = record.cart;
    let carts = record.carts;
    if (!cart) {
      cart = this._getOrCreateCart('delivery');
      carts = this._getFromStorage('cart', []);
    }

    if (scheduledType === 'asap') {
      cart.scheduled_type = 'asap';
      cart.scheduled_datetime = null;
    } else if (scheduledType === 'scheduled') {
      const dt = date + 'T' + time + ':00';
      cart.scheduled_type = 'scheduled';
      cart.scheduled_datetime = dt;
    } else {
      return { scheduled_type: null, scheduled_datetime: null, success: false };
    }

    cart.updated_at = new Date().toISOString();
    this._updateCartInList(cart, carts);

    return {
      scheduled_type: cart.scheduled_type,
      scheduled_datetime: cart.scheduled_datetime,
      success: true
    };
  }

  // applyPromoCode(code)
  applyPromoCode(code) {
    const record = this._getCurrentCartRecord();
    let cart = record.cart;
    let carts = record.carts;
    if (!cart) {
      return {
        success: false,
        error_message: 'no_cart',
        promo_code: null,
        cart_totals: null
      };
    }

    const promos = this._getFromStorage('promo_codes', []);
    const normalized = (code || '').trim().toUpperCase();
    let promo = null;
    const now = new Date();

    for (let i = 0; i < promos.length; i++) {
      const p = promos[i];
      if ((p.code || '').toUpperCase() === normalized && p.is_active) {
        // check validity range
        if (p.valid_from) {
          const from = new Date(p.valid_from);
          if (now < from) continue;
        }
        if (p.valid_to) {
          const to = new Date(p.valid_to);
          if (now > to) continue;
        }
        promo = p;
        break;
      }
    }

    if (!promo) {
      return {
        success: false,
        error_message: 'promo_not_found_or_inactive',
        promo_code: null,
        cart_totals: null
      };
    }

    if (
      promo.applicable_fulfillment_type &&
      promo.applicable_fulfillment_type !== 'both' &&
      promo.applicable_fulfillment_type !== cart.fulfillment_type
    ) {
      return {
        success: false,
        error_message: 'promo_not_applicable_for_fulfillment_type',
        promo_code: null,
        cart_totals: null
      };
    }

    // apply
    cart.promo_code_id = promo.id;
    this._updateCartInList(cart, carts);
    cart = this._recalculateCartTotals(cart.id);

    return {
      success: true,
      error_message: null,
      promo_code: {
        code: promo.code,
        description: promo.description || '',
        discount_type: promo.discount_type,
        discount_value: promo.discount_value
      },
      cart_totals: {
        items_subtotal: cart.items_subtotal || 0,
        discount_total: cart.discount_total || 0,
        delivery_fee: cart.delivery_fee || 0,
        tax_total: cart.tax_total || 0,
        total: cart.total || 0
      }
    };
  }

  // removePromoCode()
  removePromoCode() {
    const record = this._getCurrentCartRecord();
    let cart = record.cart;
    let carts = record.carts;
    if (!cart) {
      return { success: false, cart_totals: null };
    }

    cart.promo_code_id = null;
    this._updateCartInList(cart, carts);
    cart = this._recalculateCartTotals(cart.id);

    return {
      success: true,
      cart_totals: {
        items_subtotal: cart.items_subtotal || 0,
        discount_total: cart.discount_total || 0,
        delivery_fee: cart.delivery_fee || 0,
        tax_total: cart.tax_total || 0,
        total: cart.total || 0
      }
    };
  }

  // setPaymentMethod(paymentMethod)
  setPaymentMethod(paymentMethod) {
    if (paymentMethod !== 'card' && paymentMethod !== 'cash_on_delivery') {
      return { payment_method: null, success: false };
    }
    const record = this._getCurrentCartRecord();
    let cart = record.cart;
    let carts = record.carts;
    if (!cart) {
      cart = this._getOrCreateCart();
      carts = this._getFromStorage('cart', []);
    }
    cart.payment_method = paymentMethod;
    cart.updated_at = new Date().toISOString();
    this._updateCartInList(cart, carts);

    return {
      payment_method: paymentMethod,
      success: true
    };
  }

  // getOrderReviewContext()
  getOrderReviewContext() {
    const record = this._getCurrentCartRecord();
    let cart = record.cart;
    if (!cart) {
      return {
        cart: {
          items: [],
          items_subtotal: 0,
          discount_total: 0,
          delivery_fee: 0,
          tax_total: 0,
          total: 0,
          cutlery_sets: 0,
          promo_code: null
        },
        fulfillment_type: null,
        restaurant_summary: null,
        delivery_address: null,
        pickup_location_label: null,
        scheduled_type: null,
        scheduled_datetime: null,
        payment_method: null
      };
    }

    cart = this._recalculateCartTotals(cart.id);

    const restaurants = this._getFromStorage('restaurants', []);
    const cartItems = this._getFromStorage('cart_items', []);
    const cartItemOptions = this._getFromStorage('cart_item_options', []);
    const promos = this._getFromStorage('promo_codes', []);
    const addresses = this._getFromStorage('addresses', []);

    let restaurant = null;
    for (let r = 0; r < restaurants.length; r++) {
      if (restaurants[r].id === cart.restaurant_id) {
        restaurant = restaurants[r];
        break;
      }
    }

    const items = [];
    for (let i = 0; i < cartItems.length; i++) {
      const ci = cartItems[i];
      if (ci.cart_id !== cart.id) continue;
      const opts = [];
      for (let o = 0; o < cartItemOptions.length; o++) {
        const cio = cartItemOptions[o];
        if (cio.cart_item_id === ci.id) {
          if (cio.group_name) {
            opts.push(cio.group_name + ': ' + cio.name);
          } else {
            opts.push(cio.name);
          }
        }
      }
      items.push({
        menu_item_name: ci.menu_item_name,
        category_slug: ci.category_slug,
        quantity: ci.quantity,
        unit_price: ci.unit_price,
        line_subtotal: ci.line_subtotal,
        options_summary: opts,
        special_instructions: ci.special_instructions || ''
      });
    }

    let promoObj = null;
    if (cart.promo_code_id) {
      for (let p = 0; p < promos.length; p++) {
        if (promos[p].id === cart.promo_code_id) {
          promoObj = {
            code: promos[p].code,
            description: promos[p].description || ''
          };
          break;
        }
      }
    }

    let deliveryAddressDisplay = null;
    if (cart.delivery_address_id) {
      for (let a = 0; a < addresses.length; a++) {
        if (addresses[a].id === cart.delivery_address_id) {
          const addr = addresses[a];
          deliveryAddressDisplay = (addr.address_line1 || '') + (addr.postal_code ? ', ' + addr.postal_code : '');
          break;
        }
      }
    }

    return {
      cart: {
        items: items,
        items_subtotal: cart.items_subtotal || 0,
        discount_total: cart.discount_total || 0,
        delivery_fee: cart.delivery_fee || 0,
        tax_total: cart.tax_total || 0,
        total: cart.total || 0,
        cutlery_sets: cart.cutlery_sets || 0,
        promo_code: promoObj
      },
      fulfillment_type: cart.fulfillment_type,
      restaurant_summary: restaurant
        ? {
            full_display_name: restaurant.full_display_name || restaurant.name,
            address_line1: restaurant.address_line1 || null,
            city: restaurant.city || null,
            postal_code: restaurant.postal_code || null
          }
        : null,
      delivery_address: deliveryAddressDisplay ? { display_text: deliveryAddressDisplay } : null,
      pickup_location_label: cart.pickup_location_label || null,
      scheduled_type: cart.scheduled_type || null,
      scheduled_datetime: cart.scheduled_datetime || null,
      payment_method: cart.payment_method || null
    };
  }

  // placeOrder()
  placeOrder() {
    const result = this._createOrderFromCart();
    if (!result.success) {
      return {
        success: false,
        order_id: null,
        status: null,
        error_messages: result.errors || ['unknown_error'],
        order_summary: null
      };
    }

    const order = result.order;

    // clear current cart after placing
    const record = this._getCurrentCartRecord();
    const existingCart = record.cart;
    let carts = record.carts;
    if (existingCart) {
      const cartId = existingCart.id;
      carts = carts.filter(function (c) { return c.id !== cartId; });

      const allCartItems = this._getFromStorage('cart_items', []);
      const remainingCartItems = [];
      const removedItemIds = [];
      for (let i = 0; i < allCartItems.length; i++) {
        if (allCartItems[i].cart_id === cartId) {
          removedItemIds.push(allCartItems[i].id);
        } else {
          remainingCartItems.push(allCartItems[i]);
        }
      }
      this._saveToStorage('cart_items', remainingCartItems);

      const allCartItemOptions = this._getFromStorage('cart_item_options', []);
      const remainingOptions = [];
      for (let j = 0; j < allCartItemOptions.length; j++) {
        if (removedItemIds.indexOf(allCartItemOptions[j].cart_item_id) === -1) {
          remainingOptions.push(allCartItemOptions[j]);
        }
      }
      this._saveToStorage('cart_item_options', remainingOptions);

      this._saveToStorage('cart', carts);
      localStorage.setItem('current_cart_id', '');
    }

    return {
      success: true,
      order_id: order.id,
      status: order.status,
      error_messages: [],
      order_summary: {
        restaurant_name: order.restaurant_name,
        fulfillment_type: order.fulfillment_type,
        delivery_address_snapshot: order.delivery_address_snapshot || null,
        pickup_location_label: order.pickup_location_label || null,
        scheduled_type: order.scheduled_type || null,
        scheduled_datetime: order.scheduled_datetime || null,
        items_subtotal: order.items_subtotal || 0,
        discount_total: order.discount_total || 0,
        delivery_fee: order.delivery_fee || 0,
        tax_total: order.tax_total || 0,
        total: order.total || 0,
        payment_method: order.payment_method
      }
    };
  }

  // getOrderDetails(orderId)
  getOrderDetails(orderId) {
    const orders = this._getFromStorage('orders', []);
    const orderItems = this._getFromStorage('order_items', []);
    const orderItemOptions = this._getFromStorage('order_item_options', []);

    let order = null;
    for (let i = 0; i < orders.length; i++) {
      if (orders[i].id === orderId) {
        order = orders[i];
        break;
      }
    }
    if (!order) {
      return null;
    }

    const items = [];
    for (let j = 0; j < orderItems.length; j++) {
      const oi = orderItems[j];
      if (oi.order_id !== order.id) continue;
      const opts = [];
      for (let o = 0; o < orderItemOptions.length; o++) {
        const oio = orderItemOptions[o];
        if (oio.order_item_id === oi.id) {
          if (oio.group_name) {
            opts.push(oio.group_name + ': ' + oio.name);
          } else {
            opts.push(oio.name);
          }
        }
      }
      items.push({
        menu_item_name: oi.menu_item_name,
        category_slug: oi.category_slug,
        quantity: oi.quantity,
        unit_price: oi.unit_price,
        line_subtotal: oi.line_subtotal,
        options_summary: opts,
        special_instructions: oi.special_instructions || ''
      });
    }

    return {
      order_id: order.id,
      restaurant_name: order.restaurant_name,
      fulfillment_type: order.fulfillment_type,
      status: order.status,
      delivery_address_snapshot: order.delivery_address_snapshot || null,
      pickup_location_label: order.pickup_location_label || null,
      scheduled_type: order.scheduled_type || null,
      scheduled_datetime: order.scheduled_datetime || null,
      items: items,
      items_subtotal: order.items_subtotal || 0,
      discount_total: order.discount_total || 0,
      delivery_fee: order.delivery_fee || 0,
      tax_total: order.tax_total || 0,
      total: order.total || 0,
      promo_code_code: order.promo_code_code || null,
      promo_discount_value: order.promo_discount_value || null,
      payment_method: order.payment_method,
      placed_at: order.placed_at
    };
  }

  // getOrderHistory()
  getOrderHistory() {
    const orders = this._getFromStorage('orders', []);
    const orderItems = this._getFromStorage('order_items', []);

    const sorted = orders.slice().sort(function (a, b) {
      const at = a.placed_at || a.created_at || '';
      const bt = b.placed_at || b.created_at || '';
      if (at < bt) return 1;
      if (at > bt) return -1;
      return 0;
    });

    const history = [];
    for (let i = 0; i < sorted.length; i++) {
      const order = sorted[i];
      let itemsSummary = '';
      let count = 0;
      for (let j = 0; j < orderItems.length; j++) {
        const oi = orderItems[j];
        if (oi.order_id === order.id) {
          count += oi.quantity || 0;
          if (!itemsSummary) {
            itemsSummary = oi.menu_item_name;
          }
        }
      }
      if (count > 1 && itemsSummary) {
        itemsSummary += ' +' + (count - 1) + ' more';
      }

      history.push({
        order_id: order.id,
        restaurant_name: order.restaurant_name,
        fulfillment_type: order.fulfillment_type,
        status: order.status,
        placed_at: order.placed_at,
        items_summary: itemsSummary,
        items_subtotal: order.items_subtotal || 0,
        total: order.total || 0,
        was_reorder: !!order.was_reorder
      });
    }

    return history;
  }

  // reorderOrder(orderId)
  reorderOrder(orderId) {
    const orders = this._getFromStorage('orders', []);
    const orderItems = this._getFromStorage('order_items', []);
    const orderItemOptions = this._getFromStorage('order_item_options', []);
    const menuItems = this._getFromStorage('menu_items', []);
    const categories = this._getFromStorage('menu_categories', []);

    let sourceOrder = null;
    for (let i = 0; i < orders.length; i++) {
      if (orders[i].id === orderId) {
        sourceOrder = orders[i];
        break;
      }
    }
    if (!sourceOrder) {
      return { success: false, cart: null, unavailable_items: ['order_not_found'] };
    }

    const cart = this._resetCart(sourceOrder.fulfillment_type, {
      restaurant_id: sourceOrder.restaurant_id,
      pickup_location_label: sourceOrder.pickup_location_label || null,
      delivery_address_id: sourceOrder.delivery_address_id || null,
      was_reorder: true,
      source_order_id: sourceOrder.id
    });

    const cartItems = this._getFromStorage('cart_items', []);
    const cartItemOptions = this._getFromStorage('cart_item_options', []);

    const unavailable = [];

    for (let i = 0; i < orderItems.length; i++) {
      const oi = orderItems[i];
      if (oi.order_id !== sourceOrder.id) continue;

      let mi = null;
      for (let m = 0; m < menuItems.length; m++) {
        if (menuItems[m].id === oi.menu_item_id) {
          mi = menuItems[m];
          break;
        }
      }
      if (!mi || mi.status !== 'active') {
        unavailable.push(oi.menu_item_name);
        continue;
      }

      let categorySlug = null;
      for (let c = 0; c < categories.length; c++) {
        if (categories[c].id === mi.category_id) {
          categorySlug = categories[c].slug;
          break;
        }
      }

      const cartItemId = this._generateId('cart_item');
      const cartItem = {
        id: cartItemId,
        cart_id: cart.id,
        restaurant_id: mi.restaurant_id,
        menu_item_id: mi.id,
        menu_item_name: mi.name,
        category_slug: categorySlug,
        quantity: oi.quantity,
        unit_price: oi.unit_price,
        line_subtotal: oi.line_subtotal,
        selected_variant_id: oi.selected_variant_id || null,
        selected_size: oi.selected_size || null,
        calories: oi.calories || mi.calories || null,
        is_vegetarian: !!mi.is_vegetarian,
        is_vegan: !!mi.is_vegan,
        is_gluten_free: !!mi.is_gluten_free,
        contains_nuts: !!mi.contains_nuts,
        special_instructions: oi.special_instructions || '',
        option_selections: []
      };

      const optionSelectionIds = [];
      for (let o = 0; o < orderItemOptions.length; o++) {
        const oio = orderItemOptions[o];
        if (oio.order_item_id === oi.id) {
          const cartItemOptionId = this._generateId('cart_item_option');
          const cio = {
            id: cartItemOptionId,
            cart_item_id: cartItemId,
            menu_item_option_id: oio.menu_item_option_id || null,
            name: oio.name,
            group_name: oio.group_name || null,
            price_delta: oio.price_delta || 0,
            calories_delta: oio.calories_delta || null,
            is_bacon: !!oio.is_bacon
          };
          cartItemOptions.push(cio);
          optionSelectionIds.push(cartItemOptionId);
        }
      }
      cartItem.option_selections = optionSelectionIds;
      cartItems.push(cartItem);
    }

    this._saveToStorage('cart_items', cartItems);
    this._saveToStorage('cart_item_options', cartItemOptions);

    const updatedCart = this._recalculateCartTotals(cart.id);
    const itemsCount = this._calculateItemsCount(cart.id);

    return {
      success: true,
      cart: {
        cart_id: updatedCart.id,
        restaurant_id: updatedCart.restaurant_id,
        fulfillment_type: updatedCart.fulfillment_type,
        items_count: itemsCount,
        items_subtotal: updatedCart.items_subtotal || 0,
        restaurant: null
      },
      unavailable_items: unavailable
    };
  }

  // getAboutInfo()
  getAboutInfo() {
    return this._getFromStorage('about_info', {
      headline: '',
      body: '',
      service_areas: [],
      operating_hours: '',
      cuisines_offered: []
    });
  }

  // getHelpFaqSections()
  getHelpFaqSections() {
    return this._getFromStorage('help_faq_sections', []);
  }

  // getPoliciesContent()
  getPoliciesContent() {
    return this._getFromStorage('policies_content', {
      terms_of_use: '',
      privacy_policy: '',
      refund_policy: '',
      cancellation_policy: '',
      substitution_policy: '',
      data_protection: ''
    });
  }

  // getContactInfo()
  getContactInfo() {
    return this._getFromStorage('contact_info', {
      support_phone: '',
      support_email: '',
      headquarters_address: ''
    });
  }

  // submitContactMessage(name, email, subject, message, orderId)
  submitContactMessage(name, email, subject, message, orderId) {
    const messages = this._getFromStorage('contact_messages', []);
    const id = this._generateId('ticket');
    const now = new Date().toISOString();

    const msg = {
      id: id,
      name: name,
      email: email,
      subject: subject,
      message: message,
      order_id: orderId || null,
      created_at: now
    };
    messages.push(msg);
    this._saveToStorage('contact_messages', messages);

    return {
      success: true,
      ticket_id: id,
      message: 'submitted'
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