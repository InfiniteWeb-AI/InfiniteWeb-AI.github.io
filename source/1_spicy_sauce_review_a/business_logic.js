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

  // -------------------- Storage helpers --------------------

  _initStorage() {
    const keys = [
      'products',
      'product_variants',
      'carts',
      'cart_items',
      'favorites',
      'reviews',
      'orders',
      'order_items',
      'promo_codes',
      'shipping_methods',
      'navigation_links',
      'static_pages',
      'contact_messages'
    ];

    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    }

    // Checkout state is a single object, not an array
    if (!localStorage.getItem('checkout_state')) {
      localStorage.setItem('checkout_state', JSON.stringify(null));
    }

    if (!localStorage.getItem('idCounter')) {
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

  _now() {
    return new Date().toISOString();
  }

  // -------------------- Label / formatting helpers --------------------

  _heatLevelLabel(value) {
    switch (value) {
      case 'mild': return 'Mild';
      case 'medium': return 'Medium';
      case 'hot': return 'Hot';
      case 'extra_hot': return 'Extra Hot';
      default: return '';
    }
  }

  _cuisineLabel(value) {
    switch (value) {
      case 'mexican': return 'Mexican';
      case 'asian': return 'Asian';
      case 'american': return 'American';
      case 'caribbean': return 'Caribbean';
      case 'indian': return 'Indian';
      case 'mediterranean': return 'Mediterranean';
      case 'other': return 'Other';
      default: return '';
    }
  }

  _formatPrice(value) {
    if (typeof value !== 'number' || isNaN(value)) return '';
    return '$' + value.toFixed(2);
  }

  _formatPriceRange(minPrice, maxPrice) {
    if (typeof minPrice !== 'number') return '';
    if (typeof maxPrice !== 'number' || maxPrice === minPrice) {
      return this._formatPrice(minPrice);
    }
    return this._formatPrice(minPrice) + ' – ' + this._formatPrice(maxPrice);
  }

  _toTitleFromKey(key) {
    if (!key) return '';
    return key
      .replace(/_/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/(^|\s)\S/g, function (t) { return t.toUpperCase(); });
  }

  // -------------------- Cart helpers --------------------

  _getOrCreateCart() {
    let carts = this._getFromStorage('carts', []);
    let cart = null;
    for (let i = 0; i < carts.length; i++) {
      if (carts[i].status === 'active') {
        cart = carts[i];
        break;
      }
    }
    if (!cart) {
      cart = {
        id: this._generateId('cart'),
        status: 'active',
        cart_item_ids: [],
        currency: 'USD',
        created_at: this._now(),
        updated_at: this._now()
      };
      carts.push(cart);
      this._saveToStorage('carts', carts);
    }
    if (!Array.isArray(cart.cart_item_ids)) {
      cart.cart_item_ids = [];
    }
    return cart;
  }

  _saveCart(cart) {
    let carts = this._getFromStorage('carts', []);
    let found = false;
    for (let i = 0; i < carts.length; i++) {
      if (carts[i].id === cart.id) {
        carts[i] = cart;
        found = true;
        break;
      }
    }
    if (!found) {
      carts.push(cart);
    }
    this._saveToStorage('carts', carts);
  }

  _getCartItemsForCart(cartId) {
    const cartItems = this._getFromStorage('cart_items', []);
    const items = [];
    for (let i = 0; i < cartItems.length; i++) {
      if (cartItems[i].cart_id === cartId) {
        items.push(cartItems[i]);
      }
    }
    // Return most recently added items first so latest cart state is surfaced
    return items.reverse();
  }

  _calculateCartTotals(cart) {
    const items = this._getCartItemsForCart(cart.id);
    let subtotal = 0;
    let itemCount = 0;
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const qty = typeof it.quantity === 'number' ? it.quantity : 0;
      const total = typeof it.total_price === 'number' ? it.total_price : 0;
      subtotal += total;
      itemCount += qty;
    }
    return { subtotal: subtotal, itemCount: itemCount, items: items };
  }

  // For compatibility with spec: recalculate totals after cart changes
  _recalculateCartTotals(cart) {
    // We keep totals derived (not stored) to reduce localStorage usage.
    // This helper just wraps _calculateCartTotals to match interface description.
    return this._calculateCartTotals(cart);
  }

  _computeShippingCost(cart, shippingMethod) {
    const items = this._getCartItemsForCart(cart.id);
    let allFree = items.length > 0;
    for (let i = 0; i < items.length; i++) {
      if (!items[i].free_shipping) {
        allFree = false;
        break;
      }
    }
    if (items.length === 0) return 0;
    if (allFree) return 0;
    if (shippingMethod && typeof shippingMethod.base_cost === 'number') {
      return shippingMethod.base_cost;
    }
    // Fallback flat rate
    return 5;
  }

  _resolveCartItem(cartItem) {
    const products = this._getFromStorage('products', []);
    const variants = this._getFromStorage('product_variants', []);
    const cloned = Object.assign({}, cartItem);
    let product = null;
    for (let i = 0; i < products.length; i++) {
      if (products[i].id === cartItem.product_id) {
        product = products[i];
        break;
      }
    }
    cloned.product = product;
    let variant = null;
    if (cartItem.product_variant_id) {
      for (let j = 0; j < variants.length; j++) {
        if (variants[j].id === cartItem.product_variant_id) {
          variant = variants[j];
          break;
        }
      }
    }
    cloned.product_variant = variant;
    return cloned;
  }

  // -------------------- Favorites helpers --------------------

  _getOrCreateFavoritesList() {
    let lists = this._getFromStorage('favorites', []);
    let list = lists.length > 0 ? lists[0] : null;
    if (!list) {
      list = {
        id: this._generateId('fav'),
        name: 'My Favorites',
        product_ids: [],
        created_at: this._now(),
        updated_at: this._now()
      };
      lists.push(list);
      this._saveToStorage('favorites', lists);
    }
    if (!Array.isArray(list.product_ids)) {
      list.product_ids = [];
    }
    return list;
  }

  _saveFavoritesList(list) {
    let lists = this._getFromStorage('favorites', []);
    if (lists.length === 0) {
      lists.push(list);
    } else {
      lists[0] = list;
    }
    this._saveToStorage('favorites', lists);
  }

  // -------------------- Checkout helpers --------------------

  _getCheckoutStateRaw() {
    const raw = localStorage.getItem('checkout_state');
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  _setCheckoutStateRaw(state) {
    localStorage.setItem('checkout_state', JSON.stringify(state));
  }

  _getOrCreateCheckoutState() {
    const cart = this._getOrCreateCart();
    let state = this._getCheckoutStateRaw();
    if (!state || state.cart_id !== cart.id) {
      state = {
        cart_id: cart.id,
        shipping_address: {
          full_name: '',
          address_line1: '',
          address_line2: '',
          city: '',
          state: '',
          postal_code: '',
          country: 'US'
        },
        selected_shipping_method_id: null,
        applied_promo_code: null,
        subtotal: 0,
        shipping_cost: 0,
        discount_total: 0,
        tax_total: 0,
        total: 0,
        currency: cart.currency || 'USD',
        payment_method: null,
        payment_details: null
      };
      this._setCheckoutStateRaw(state);
    }
    return state;
  }

  _selectDefaultShippingMethod() {
    const shippingMethods = this._getFromStorage('shipping_methods', []);
    let available = [];
    for (let i = 0; i < shippingMethods.length; i++) {
      if (shippingMethods[i].is_available) {
        available.push(shippingMethods[i]);
      }
    }
    if (available.length === 0) return null;
    for (let i = 0; i < available.length; i++) {
      if (available[i].is_default) {
        return available[i];
      }
    }
    return available[0];
  }

  _validateAndApplyPromoCode(promoCode, subtotal, shippingCost) {
    const result = {
      success: false,
      message: '',
      applied_promo_code: null,
      discount_total: 0
    };
    if (!promoCode) {
      result.message = 'Promo code is required.';
      return result;
    }
    const promoCodes = this._getFromStorage('promo_codes', []);
    const entered = String(promoCode).trim();
    const enteredLower = entered.toLowerCase();
    let promo = null;
    for (let i = 0; i < promoCodes.length; i++) {
      if (String(promoCodes[i].code || '').toLowerCase() === enteredLower) {
        promo = promoCodes[i];
        break;
      }
    }
    if (!promo) {
      result.message = 'Promo code not found.';
      return result;
    }
    if (!promo.is_active) {
      result.message = 'Promo code is not active.';
      return result;
    }
    const now = new Date();
    if (promo.start_date) {
      const start = new Date(promo.start_date);
      if (now < start) {
        result.message = 'Promo code is not yet valid.';
        return result;
      }
    }
    if (promo.end_date) {
      const end = new Date(promo.end_date);
      if (now > end) {
        result.message = 'Promo code has expired.';
        return result;
      }
    }
    if (typeof promo.min_order_amount === 'number' && subtotal < promo.min_order_amount) {
      result.message = 'Order amount does not meet promo minimum.';
      return result;
    }

    let discount = 0;
    if (promo.discount_type === 'percentage') {
      discount = subtotal * (promo.discount_value / 100);
    } else if (promo.discount_type === 'fixed_amount') {
      discount = promo.discount_value;
      if (discount > subtotal) discount = subtotal;
    } else if (promo.discount_type === 'free_shipping') {
      discount = typeof shippingCost === 'number' ? shippingCost : 0;
    }

    result.success = true;
    result.message = 'Promo code applied.';
    result.applied_promo_code = promo.code;
    result.discount_total = discount;
    return result;
  }

  _collectCheckoutValidationErrors(state, cart, hasItems, shippingMethod) {
    const errors = [];
    const address = state.shipping_address || {};
    if (!hasItems) {
      errors.push({ field: 'cart', message: 'Cart is empty.' });
    }
    if (!address.full_name) {
      errors.push({ field: 'shipping_full_name', message: 'Full name is required.' });
    }
    if (!address.address_line1) {
      errors.push({ field: 'shipping_address_line1', message: 'Address is required.' });
    }
    if (!address.city) {
      errors.push({ field: 'shipping_city', message: 'City is required.' });
    }
    if (!address.state) {
      errors.push({ field: 'shipping_state', message: 'State is required.' });
    }
    if (!address.postal_code) {
      errors.push({ field: 'shipping_postal_code', message: 'Postal code is required.' });
    }
    if (!shippingMethod) {
      errors.push({ field: 'shipping_method', message: 'Shipping method is required.' });
    }
    if (!state.payment_method) {
      errors.push({ field: 'payment_method', message: 'Payment method is required.' });
    }
    return errors;
  }

  _canPlaceOrder(state, cart) {
    const totals = this._calculateCartTotals(cart);
    const hasItems = totals.itemCount > 0;
    const shippingMethods = this._getFromStorage('shipping_methods', []);
    let shippingMethod = null;
    if (state.selected_shipping_method_id) {
      for (let i = 0; i < shippingMethods.length; i++) {
        if (shippingMethods[i].id === state.selected_shipping_method_id) {
          shippingMethod = shippingMethods[i];
          break;
        }
      }
    }
    const errors = this._collectCheckoutValidationErrors(state, cart, hasItems, shippingMethod);
    return errors.length === 0;
  }

  // -------------------- Interface implementations --------------------

  // getHomePageContent
  getHomePageContent() {
    const products = this._getFromStorage('products', []);
    const promoCodes = this._getFromStorage('promo_codes', []);

    const activeProducts = [];
    for (let i = 0; i < products.length; i++) {
      if (products[i].status === 'active') {
        activeProducts.push(products[i]);
      }
    }

    const nonGift = [];
    const giftSets = [];
    for (let i = 0; i < activeProducts.length; i++) {
      if (activeProducts[i].is_gift_set) {
        giftSets.push(activeProducts[i]);
      } else {
        nonGift.push(activeProducts[i]);
      }
    }

    nonGift.sort(function (a, b) {
      return (b.rating_average || 0) - (a.rating_average || 0);
    });
    giftSets.sort(function (a, b) {
      return (b.rating_average || 0) - (a.rating_average || 0);
    });

    function mapProduct(p, ctx) {
      const self = ctx;
      return {
        product_id: p.id,
        name: p.name,
        heat_level: p.heat_level,
        heat_level_label: self._heatLevelLabel(p.heat_level),
        min_price: p.min_price,
        max_price: p.max_price,
        price_display: self._formatPriceRange(p.min_price, p.max_price),
        rating_average: p.rating_average,
        rating_count: p.rating_count,
        default_size_label: p.default_size_label || '',
        pack_type: p.pack_type || null,
        pack_item_count: typeof p.pack_item_count === 'number' ? p.pack_item_count : null,
        is_free_shipping: !!p.is_free_shipping,
        badge_texts: Array.isArray(p.badge_texts) ? p.badge_texts : [],
        image_url: p.image_url || '',
        cuisine_label: self._cuisineLabel(p.cuisine)
      };
    }

    const featuredProducts = [];
    for (let i = 0; i < nonGift.length && i < 8; i++) {
      featuredProducts.push(mapProduct(nonGift[i], this));
    }

    const featuredGiftSets = [];
    for (let i = 0; i < giftSets.length && i < 8; i++) {
      const p = giftSets[i];
      featuredGiftSets.push({
        product_id: p.id,
        name: p.name,
        min_price: p.min_price,
        price_display: this._formatPriceRange(p.min_price, p.max_price),
        rating_average: p.rating_average,
        rating_count: p.rating_count,
        pack_item_count: typeof p.pack_item_count === 'number' ? p.pack_item_count : null,
        is_free_shipping: !!p.is_free_shipping,
        badge_texts: Array.isArray(p.badge_texts) ? p.badge_texts : [],
        image_url: p.image_url || ''
      });
    }

    const promo_banners = [];
    for (let i = 0; i < promoCodes.length; i++) {
      const pc = promoCodes[i];
      if (!pc.is_active) continue;
      promo_banners.push({
        id: pc.id,
        title: pc.code,
        subtitle: pc.description || '',
        body: 'Use code ' + pc.code + ' at checkout.'
      });
    }

    const featured_sections = [
      {
        key: 'shop_by_heat',
        title: 'Shop by Heat Level',
        description: 'Browse mild to extra hot sauces tailored to your spice tolerance.'
      },
      {
        key: 'gift_sets',
        title: 'Gift Sets',
        description: 'Three-bottle sampler packs and spicy gift boxes for chili lovers.'
      },
      {
        key: 'dietary_picks',
        title: 'Vegan & Gluten-Free Picks',
        description: 'Curated sauces that fit your dietary preferences.'
      }
    ];

    return {
      search_placeholder: 'Search hot sauces, taco sauces, and more',
      featured_sections: featured_sections,
      featured_products: featuredProducts,
      featured_gift_sets: featuredGiftSets,
      promo_banners: promo_banners
    };
  }

  // getUserSessionSummary
  getUserSessionSummary() {
    const cart = this._getOrCreateCart();
    const totals = this._calculateCartTotals(cart);
    const favoritesList = this._getOrCreateFavoritesList();
    return {
      cart_item_count: totals.itemCount,
      cart_subtotal: totals.subtotal,
      currency: cart.currency || 'USD',
      favorites_count: favoritesList.product_ids.length
    };
  }

  // getProductFilterOptions(context, searchQuery)
  getProductFilterOptions(context, searchQuery) {
    // Use listProducts to determine relevant products for context
    const listing = this.listProducts(context, searchQuery);
    const products = listing.products || [];

    const heatSet = {};
    const cuisineSet = {};
    let minPrice = null;
    let maxPrice = null;
    let minScoville = null;
    let maxScoville = null;

    for (let i = 0; i < products.length; i++) {
      const p = products[i];
      if (p.heat_level) {
        heatSet[p.heat_level] = true;
      }
      if (p.cuisine_label) {
        cuisineSet[p.cuisine_label] = p.cuisine_label;
      }
      if (typeof p.min_price === 'number') {
        if (minPrice === null || p.min_price < minPrice) minPrice = p.min_price;
        if (maxPrice === null || p.min_price > maxPrice) maxPrice = p.min_price;
      }
      if (typeof p.scoville_rating === 'number') {
        if (minScoville === null || p.scoville_rating < minScoville) minScoville = p.scoville_rating;
        if (maxScoville === null || p.scoville_rating > maxScoville) maxScoville = p.scoville_rating;
      }
    }

    const heat_level_options = [];
    const heatLevels = ['mild', 'medium', 'hot', 'extra_hot'];
    for (let i = 0; i < heatLevels.length; i++) {
      const hl = heatLevels[i];
      if (heatSet[hl] || products.length === 0) {
        heat_level_options.push({ value: hl, label: this._heatLevelLabel(hl) });
      }
    }

    const rating_options = [
      { min_value: 4.0, label: '4 stars & up' },
      { min_value: 4.5, label: '4.5 stars & up' }
    ];

    const dietary_options = [
      { key: 'vegan', label: 'Vegan' },
      { key: 'gluten_free', label: 'Gluten-Free' }
    ];

    const cuisine_options = [];
    const cuisineKeys = ['mexican', 'asian', 'american', 'caribbean', 'indian', 'mediterranean', 'other'];
    for (let i = 0; i < cuisineKeys.length; i++) {
      const val = cuisineKeys[i];
      cuisine_options.push({ value: val, label: this._cuisineLabel(val) });
    }

    const sort_options = [
      { value: 'relevance', label: 'Relevance' },
      { value: 'price_low_to_high', label: 'Price: Low to High' },
      { value: 'price_high_to_low', label: 'Price: High to Low' },
      { value: 'rating_high_to_low', label: 'Rating: High to Low' },
      { value: 'rating_low_to_high', label: 'Rating: Low to High' },
      { value: 'newest', label: 'Newest' }
    ];

    return {
      heat_level_options: heat_level_options,
      rating_options: rating_options,
      dietary_options: dietary_options,
      cuisine_options: cuisine_options,
      price_range_suggestion: {
        min_price: minPrice === null ? 0 : minPrice,
        max_price: maxPrice === null ? 0 : maxPrice
      },
      scoville_range_suggestion: {
        min_scoville: minScoville === null ? 0 : minScoville,
        max_scoville: maxScoville === null ? 0 : maxScoville
      },
      sort_options: sort_options
    };
  }

  // listProducts(context, searchQuery, heatLevels, minPrice, maxPrice, minRating, isVegan, isGlutenFree, cuisine, minScoville, isFreeShipping, isGiftSet, sort, page, pageSize)
  listProducts(context, searchQuery, heatLevels, minPrice, maxPrice, minRating, isVegan, isGlutenFree, cuisine, minScoville, isFreeShipping, isGiftSet, sort, page, pageSize) {
    const allProducts = this._getFromStorage('products', []);
    let products = [];
    for (let i = 0; i < allProducts.length; i++) {
      if (allProducts[i].status === 'active') {
        products.push(allProducts[i]);
      }
    }

    const ctx = context || 'shop_all';

    // Context-level filtering
    if (ctx === 'search_results') {
      const q = (searchQuery || '').toLowerCase();
      if (q) {
        const filtered = [];
        for (let i = 0; i < products.length; i++) {
          const p = products[i];
          const name = (p.name || '').toLowerCase();
          const desc = (p.description || '').toLowerCase();
          if (name.indexOf(q) !== -1 || desc.indexOf(q) !== -1) {
            filtered.push(p);
          }
        }
        products = filtered;
      }
    } else if (ctx === 'by_cuisine' && cuisine) {
      const filtered = [];
      for (let i = 0; i < products.length; i++) {
        if (products[i].cuisine === cuisine) {
          filtered.push(products[i]);
        }
      }
      products = filtered;
    } else if (ctx === 'bundles_gift_sets') {
      const filtered = [];
      for (let i = 0; i < products.length; i++) {
        if (products[i].is_gift_set) {
          filtered.push(products[i]);
        }
      }
      products = filtered;
    } else if (ctx === 'top_rated') {
      // No additional implicit filter; rely on minRating if provided
    }

    // Parameter-based filters
    if (Array.isArray(heatLevels) && heatLevels.length > 0) {
      const set = {};
      for (let i = 0; i < heatLevels.length; i++) {
        set[heatLevels[i]] = true;
      }
      const filtered = [];
      for (let i = 0; i < products.length; i++) {
        if (set[products[i].heat_level]) {
          filtered.push(products[i]);
        }
      }
      products = filtered;
    }

    if (typeof minPrice === 'number') {
      const filtered = [];
      for (let i = 0; i < products.length; i++) {
        if (typeof products[i].min_price === 'number' && products[i].min_price >= minPrice) {
          filtered.push(products[i]);
        }
      }
      products = filtered;
    }

    if (typeof maxPrice === 'number') {
      const filtered = [];
      for (let i = 0; i < products.length; i++) {
        if (typeof products[i].min_price === 'number' && products[i].min_price <= maxPrice) {
          filtered.push(products[i]);
        }
      }
      products = filtered;
    }

    if (typeof minRating === 'number') {
      const filtered = [];
      for (let i = 0; i < products.length; i++) {
        const rating = typeof products[i].rating_average === 'number' ? products[i].rating_average : 0;
        if (rating >= minRating) {
          filtered.push(products[i]);
        }
      }
      products = filtered;
    }

    if (typeof isVegan === 'boolean') {
      const filtered = [];
      for (let i = 0; i < products.length; i++) {
        if (!!products[i].is_vegan === isVegan) {
          filtered.push(products[i]);
        }
      }
      products = filtered;
    }

    if (typeof isGlutenFree === 'boolean') {
      const filtered = [];
      for (let i = 0; i < products.length; i++) {
        if (!!products[i].is_gluten_free === isGlutenFree) {
          filtered.push(products[i]);
        }
      }
      products = filtered;
    }

    if (cuisine && ctx !== 'by_cuisine') {
      const filtered = [];
      for (let i = 0; i < products.length; i++) {
        if (products[i].cuisine === cuisine) {
          filtered.push(products[i]);
        }
      }
      products = filtered;
    }

    if (typeof minScoville === 'number') {
      const filtered = [];
      for (let i = 0; i < products.length; i++) {
        const s = products[i].scoville_rating;
        if (typeof s === 'number' && s >= minScoville) {
          filtered.push(products[i]);
        }
      }
      products = filtered;
    }

    if (typeof isFreeShipping === 'boolean') {
      const filtered = [];
      for (let i = 0; i < products.length; i++) {
        if (!!products[i].is_free_shipping === isFreeShipping) {
          filtered.push(products[i]);
        }
      }
      products = filtered;
    }

    if (typeof isGiftSet === 'boolean') {
      const filtered = [];
      for (let i = 0; i < products.length; i++) {
        if (!!products[i].is_gift_set === isGiftSet) {
          filtered.push(products[i]);
        }
      }
      products = filtered;
    }

    // Sorting
    const sortKey = sort || (ctx === 'search_results' ? 'relevance' : 'relevance');
    products.sort(function (a, b) {
      switch (sortKey) {
        case 'price_low_to_high':
          return (a.min_price || 0) - (b.min_price || 0);
        case 'price_high_to_low':
          return (b.min_price || 0) - (a.min_price || 0);
        case 'rating_high_to_low':
          return (b.rating_average || 0) - (a.rating_average || 0);
        case 'rating_low_to_high':
          return (a.rating_average || 0) - (b.rating_average || 0);
        case 'newest':
          return new Date(b.date_added || 0) - new Date(a.date_added || 0);
        case 'relevance':
        default:
          // For now, treat as rating high to low
          return (b.rating_average || 0) - (a.rating_average || 0);
      }
    });

    const totalResults = products.length;
    const currentPage = typeof page === 'number' && page > 0 ? page : 1;
    const size = typeof pageSize === 'number' && pageSize > 0 ? pageSize : 20;
    const start = (currentPage - 1) * size;
    const end = start + size;
    const pageProductsRaw = products.slice(start, end);

    const pageProducts = [];
    for (let i = 0; i < pageProductsRaw.length; i++) {
      const p = pageProductsRaw[i];
      pageProducts.push({
        product_id: p.id,
        name: p.name,
        description_snippet: (p.description || '').substring(0, 140),
        heat_level: p.heat_level,
        heat_level_label: this._heatLevelLabel(p.heat_level),
        scoville_rating: typeof p.scoville_rating === 'number' ? p.scoville_rating : null,
        cuisine_label: this._cuisineLabel(p.cuisine),
        is_vegan: !!p.is_vegan,
        is_gluten_free: !!p.is_gluten_free,
        rating_average: p.rating_average,
        rating_count: p.rating_count,
        min_price: p.min_price,
        max_price: p.max_price,
        price_display: this._formatPriceRange(p.min_price, p.max_price),
        is_free_shipping: !!p.is_free_shipping,
        pack_type: p.pack_type || null,
        pack_item_count: typeof p.pack_item_count === 'number' ? p.pack_item_count : null,
        default_size_label: p.default_size_label || '',
        image_url: p.image_url || '',
        badge_texts: Array.isArray(p.badge_texts) ? p.badge_texts : []
      });
    }

    return {
      products: pageProducts,
      total_results: totalResults,
      page: currentPage,
      page_size: size,
      applied_filters: {
        heat_levels: Array.isArray(heatLevels) ? heatLevels : [],
        min_price: typeof minPrice === 'number' ? minPrice : null,
        max_price: typeof maxPrice === 'number' ? maxPrice : null,
        min_rating: typeof minRating === 'number' ? minRating : null,
        is_vegan: typeof isVegan === 'boolean' ? isVegan : null,
        is_gluten_free: typeof isGlutenFree === 'boolean' ? isGlutenFree : null,
        cuisine: cuisine || null,
        min_scoville: typeof minScoville === 'number' ? minScoville : null,
        is_free_shipping: typeof isFreeShipping === 'boolean' ? isFreeShipping : null,
        is_gift_set: typeof isGiftSet === 'boolean' ? isGiftSet : null
      },
      applied_sort: sortKey
    };
  }

  // getProductDetails(productId)
  getProductDetails(productId) {
    const products = this._getFromStorage('products', []);
    const variants = this._getFromStorage('product_variants', []);
    const favoritesList = this._getOrCreateFavoritesList();

    let product = null;
    for (let i = 0; i < products.length; i++) {
      if (products[i].id === productId) {
        product = products[i];
        break;
      }
    }
    if (!product) {
      return {
        product: null,
        variants: [],
        price_display: '',
        heat_level_label: '',
        cuisine_label: '',
        dietary_labels: [],
        pack_type_label: '',
        is_favorited: false,
        review_summary: { rating_average: 0, rating_count: 0 },
        nutrition: {
          sodium_mg_per_serving: null,
          serving_size: '',
          additional_facts_html: ''
        },
        gift_options: {
          supports_gift_message: false,
          supports_gift_wrap: false,
          available_wrap_types: []
        }
      };
    }

    // Instrumentation for task completion tracking (task4_comparedProductIds)
    try {
      if (
        product &&
        product.heat_level === 'extra_hot' &&
        typeof product.scoville_rating === 'number' &&
        product.scoville_rating >= 50000 &&
        (product.cuisine === 'mexican' || product.cuisine === 'asian')
      ) {
        let comparedRaw = localStorage.getItem('task4_comparedProductIds');
        let compared;
        try {
          compared = comparedRaw ? JSON.parse(comparedRaw) : {};
        } catch (e) {
          compared = {};
        }
        if (typeof compared !== 'object' || compared === null) {
          compared = {};
        }

        if (product.cuisine === 'mexican') {
          if (typeof compared.mexicanProductId === 'undefined' || compared.mexicanProductId === null) {
            compared.mexicanProductId = productId;
          }
        } else if (product.cuisine === 'asian') {
          if (typeof compared.asianProductId === 'undefined' || compared.asianProductId === null) {
            compared.asianProductId = productId;
          }
        }

        localStorage.setItem('task4_comparedProductIds', JSON.stringify(compared));
      }
    } catch (e) {
      try {
        console.error('Instrumentation error for task4_comparedProductIds:', e);
      } catch (e2) {}
    }

    const productVariants = [];
    for (let i = 0; i < variants.length; i++) {
      if (variants[i].product_id === productId && variants[i].status === 'active') {
        productVariants.push(variants[i]);
      }
    }

    const price_display = this._formatPriceRange(product.min_price, product.max_price);
    const heat_level_label = this._heatLevelLabel(product.heat_level);
    const cuisine_label = this._cuisineLabel(product.cuisine);

    const dietary_labels = [];
    if (product.is_vegan) dietary_labels.push('Vegan');
    if (product.is_gluten_free) dietary_labels.push('Gluten-Free');

    let pack_type_label = '';
    if (product.pack_type === 'single_bottle') pack_type_label = 'Single Bottle';
    else if (product.pack_type === 'gift_set') pack_type_label = 'Gift Set';
    else if (product.pack_type === 'variety_pack') pack_type_label = 'Variety Pack';

    const is_favorited = favoritesList.product_ids.indexOf(product.id) !== -1;

    const review_summary = {
      rating_average: product.rating_average,
      rating_count: product.rating_count
    };

    const nutrition = {
      sodium_mg_per_serving: typeof product.nutrition_sodium_mg_per_serving === 'number'
        ? product.nutrition_sodium_mg_per_serving
        : null,
      serving_size: product.nutrition_serving_size || '',
      additional_facts_html: ''
    };

    const gift_options = {
      supports_gift_message: !!product.supports_gift_message,
      supports_gift_wrap: !!product.supports_gift_wrap,
      available_wrap_types: []
    };

    if (product.supports_gift_wrap) {
      gift_options.available_wrap_types.push({ value: 'standard', label: 'Standard' });
      gift_options.available_wrap_types.push({ value: 'premium', label: 'Premium' });
    }

    return {
      product: product,
      variants: productVariants,
      price_display: price_display,
      heat_level_label: heat_level_label,
      cuisine_label: cuisine_label,
      dietary_labels: dietary_labels,
      pack_type_label: pack_type_label,
      is_favorited: is_favorited,
      review_summary: review_summary,
      nutrition: nutrition,
      gift_options: gift_options
    };
  }

  // getProductReviews(productId, page, pageSize, sort)
  getProductReviews(productId, page, pageSize, sort) {
    const allReviews = this._getFromStorage('reviews', []);
    const products = this._getFromStorage('products', []);

    let product = null;
    for (let i = 0; i < products.length; i++) {
      if (products[i].id === productId) {
        product = products[i];
        break;
      }
    }

    const reviews = [];
    for (let i = 0; i < allReviews.length; i++) {
      if (allReviews[i].product_id === productId) {
        reviews.push(allReviews[i]);
      }
    }

    const sortKey = sort || 'most_recent';
    reviews.sort(function (a, b) {
      if (sortKey === 'highest_rating') {
        return (b.rating || 0) - (a.rating || 0);
      } else if (sortKey === 'lowest_rating') {
        return (a.rating || 0) - (b.rating || 0);
      } else { // most_recent
        return new Date(b.created_at || 0) - new Date(a.created_at || 0);
      }
    });

    const totalReviews = reviews.length;
    const currentPage = typeof page === 'number' && page > 0 ? page : 1;
    const size = typeof pageSize === 'number' && pageSize > 0 ? pageSize : 10;
    const start = (currentPage - 1) * size;
    const end = start + size;
    const pageReviewsRaw = reviews.slice(start, end);

    let sumRating = 0;
    for (let i = 0; i < reviews.length; i++) {
      sumRating += reviews[i].rating || 0;
    }
    const average_rating = totalReviews > 0 ? sumRating / totalReviews : 0;

    // Foreign key resolution (product)
    const pageReviews = [];
    for (let i = 0; i < pageReviewsRaw.length; i++) {
      const r = pageReviewsRaw[i];
      const cloned = Object.assign({}, r);
      cloned.product = product;
      pageReviews.push(cloned);
    }

    return {
      reviews: pageReviews,
      page: currentPage,
      page_size: size,
      total_reviews: totalReviews,
      average_rating: average_rating
    };
  }

  // submitProductReview(productId, reviewerName, rating, title, body)
  submitProductReview(productId, reviewerName, rating, title, body) {
    const products = this._getFromStorage('products', []);
    let product = null;
    for (let i = 0; i < products.length; i++) {
      if (products[i].id === productId) {
        product = products[i];
        break;
      }
    }
    if (!product) {
      return { success: false, message: 'Product not found.', review: null };
    }

    if (!reviewerName || typeof reviewerName !== 'string') {
      return { success: false, message: 'Reviewer name is required.', review: null };
    }
    const ratingNum = Number(rating);
    if (!(ratingNum >= 1 && ratingNum <= 5)) {
      return { success: false, message: 'Rating must be between 1 and 5.', review: null };
    }
    if (!title || typeof title !== 'string') {
      return { success: false, message: 'Title is required.', review: null };
    }
    if (!body || typeof body !== 'string') {
      return { success: false, message: 'Body is required.', review: null };
    }

    const reviews = this._getFromStorage('reviews', []);
    const review = {
      id: this._generateId('rev'),
      product_id: productId,
      reviewer_name: reviewerName,
      rating: ratingNum,
      title: title,
      body: body,
      created_at: this._now(),
      is_approved: false
    };
    reviews.push(review);
    this._saveToStorage('reviews', reviews);

    // Update product rating aggregates
    const oldCount = product.rating_count || 0;
    const oldAvg = product.rating_average || 0;
    const newCount = oldCount + 1;
    const newAvg = (oldAvg * oldCount + ratingNum) / newCount;
    product.rating_count = newCount;
    product.rating_average = newAvg;

    // Save updated product
    for (let i = 0; i < products.length; i++) {
      if (products[i].id === product.id) {
        products[i] = product;
        break;
      }
    }
    this._saveToStorage('products', products);

    return { success: true, message: 'Review submitted.', review: review };
  }

  // addToCart(productId, productVariantId, quantity, giftMessage, giftWrapType)
  addToCart(productId, productVariantId, quantity, giftMessage, giftWrapType) {
    const products = this._getFromStorage('products', []);
    const variants = this._getFromStorage('product_variants', []);

    let product = null;
    for (let i = 0; i < products.length; i++) {
      if (products[i].id === productId) {
        product = products[i];
        break;
      }
    }
    if (!product) {
      return { success: false, message: 'Product not found.', cart: null };
    }

    let variant = null;
    if (productVariantId) {
      for (let i = 0; i < variants.length; i++) {
        if (variants[i].id === productVariantId) {
          variant = variants[i];
          break;
        }
      }
    }
    if (!variant) {
      for (let i = 0; i < variants.length; i++) {
        if (variants[i].product_id === productId && variants[i].is_default && variants[i].status === 'active') {
          variant = variants[i];
          break;
        }
      }
    }

    const qty = quantity && quantity > 0 ? Math.floor(quantity) : 1;
    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items', []);

    const unitPrice = variant ? variant.price : product.min_price;

    // For this implementation, always create a new cart line item instead of merging.
    const cartItem = {
      id: this._generateId('ci'),
      cart_id: cart.id,
      product_id: productId,
      product_variant_id: variant ? variant.id : null,
      product_name: product.name,
      size_label: variant ? variant.size_label : (product.default_size_label || ''),
      pack_type: product.pack_type || null,
      pack_item_count: typeof product.pack_item_count === 'number' ? product.pack_item_count : null,
      quantity: qty,
      unit_price: unitPrice,
      total_price: unitPrice * qty,
      gift_message: giftMessage || null,
      gift_wrap_type: giftWrapType || 'none',
      free_shipping: !!product.is_free_shipping,
      added_at: this._now()
    };
    cartItems.push(cartItem);
    if (!Array.isArray(cart.cart_item_ids)) cart.cart_item_ids = [];
    cart.cart_item_ids.push(cartItem.id);

    cart.updated_at = this._now();

    this._saveToStorage('cart_items', cartItems);
    this._saveCart(cart);

    const totals = this._calculateCartTotals(cart);
    const itemsDetailed = [];
    for (let i = 0; i < totals.items.length; i++) {
      itemsDetailed.push(this._resolveCartItem(totals.items[i]));
    }

    return {
      success: true,
      message: 'Added to cart.',
      cart: {
        cart_id: cart.id,
        status: cart.status,
        currency: cart.currency || 'USD',
        item_count: totals.itemCount,
        subtotal: totals.subtotal,
        items: itemsDetailed
      }
    };
  }

  // getCart()
  getCart() {
    const cart = this._getOrCreateCart();
    const totals = this._calculateCartTotals(cart);

    const itemsDetailed = [];
    for (let i = 0; i < totals.items.length; i++) {
      itemsDetailed.push({
        cart_item: this._resolveCartItem(totals.items[i]),
        product: this._resolveCartItem(totals.items[i]).product,
        image_url: (this._resolveCartItem(totals.items[i]).product || {}).image_url || ''
      });
    }

    // Simple shipping estimate based on same logic as checkout
    const shippingMethods = this._getFromStorage('shipping_methods', []);
    const defaultMethod = this._selectDefaultShippingMethod() || (shippingMethods.length > 0 ? shippingMethods[0] : null);
    const shipping_estimate = this._computeShippingCost(cart, defaultMethod);

    const discount_total = 0;
    const tax_estimate = 0;
    const total = totals.subtotal + shipping_estimate - discount_total + tax_estimate;

    return {
      cart: cart,
      items: itemsDetailed,
      subtotal: totals.subtotal,
      shipping_estimate: shipping_estimate,
      discount_total: discount_total,
      tax_estimate: tax_estimate,
      total: total
    };
  }

  // updateCartItemQuantity(cartItemId, quantity)
  updateCartItemQuantity(cartItemId, quantity) {
    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items', []);
    const qty = Math.max(0, Math.floor(quantity));

    let found = false;
    for (let i = 0; i < cartItems.length; i++) {
      if (cartItems[i].id === cartItemId && cartItems[i].cart_id === cart.id) {
        found = true;
        if (qty <= 0) {
          // Remove
          cartItems.splice(i, 1);
          if (Array.isArray(cart.cart_item_ids)) {
            const idx = cart.cart_item_ids.indexOf(cartItemId);
            if (idx !== -1) cart.cart_item_ids.splice(idx, 1);
          }
        } else {
          cartItems[i].quantity = qty;
          cartItems[i].total_price = cartItems[i].unit_price * qty;
        }
        break;
      }
    }

    if (!found) {
      return { success: false, message: 'Cart item not found.', cart: cart };
    }

    cart.updated_at = this._now();
    this._saveToStorage('cart_items', cartItems);
    this._saveCart(cart);

    return { success: true, message: 'Cart updated.', cart: cart };
  }

  // removeCartItem(cartItemId)
  removeCartItem(cartItemId) {
    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items', []);

    let removed = false;
    for (let i = 0; i < cartItems.length; i++) {
      if (cartItems[i].id === cartItemId && cartItems[i].cart_id === cart.id) {
        cartItems.splice(i, 1);
        removed = true;
        break;
      }
    }

    if (!removed) {
      return { success: false, message: 'Cart item not found.', cart: cart };
    }

    if (Array.isArray(cart.cart_item_ids)) {
      const idx = cart.cart_item_ids.indexOf(cartItemId);
      if (idx !== -1) cart.cart_item_ids.splice(idx, 1);
    }
    cart.updated_at = this._now();

    this._saveToStorage('cart_items', cartItems);
    this._saveCart(cart);

    return { success: true, message: 'Item removed from cart.', cart: cart };
  }

  // getCheckoutSummary()
  getCheckoutSummary() {
    const cart = this._getOrCreateCart();
    const state = this._getOrCreateCheckoutState();
    const totals = this._calculateCartTotals(cart);

    const shippingMethods = this._getFromStorage('shipping_methods', []);
    let selectedMethod = null;
    if (state.selected_shipping_method_id) {
      for (let i = 0; i < shippingMethods.length; i++) {
        if (shippingMethods[i].id === state.selected_shipping_method_id) {
          selectedMethod = shippingMethods[i];
          break;
        }
      }
    }
    if (!selectedMethod && shippingMethods.length > 0) {
      selectedMethod = this._selectDefaultShippingMethod();
      if (selectedMethod) {
        state.selected_shipping_method_id = selectedMethod.id;
        this._setCheckoutStateRaw(state);
      }
    }

    let shipping_cost = this._computeShippingCost(cart, selectedMethod);

    // Re-evaluate promo discount based on latest subtotal and shipping
    let discount_total = 0;
    let appliedPromoCode = state.applied_promo_code;
    if (appliedPromoCode) {
      const promoResult = this._validateAndApplyPromoCode(appliedPromoCode, totals.subtotal, shipping_cost);
      if (promoResult.success) {
        discount_total = promoResult.discount_total;
        appliedPromoCode = promoResult.applied_promo_code;
      } else {
        // If invalid now, clear promo
        appliedPromoCode = null;
        discount_total = 0;
      }
    }

    const tax_total = 0;
    const total = totals.subtotal + shipping_cost + tax_total - discount_total;

    state.subtotal = totals.subtotal;
    state.shipping_cost = shipping_cost;
    state.discount_total = discount_total;
    state.tax_total = tax_total;
    state.total = total;
    state.applied_promo_code = appliedPromoCode;
    this._setCheckoutStateRaw(state);

    const itemsDetailed = [];
    for (let i = 0; i < totals.items.length; i++) {
      itemsDetailed.push(this._resolveCartItem(totals.items[i]));
    }

    const hasItems = totals.itemCount > 0;
    const errors = this._collectCheckoutValidationErrors(state, cart, hasItems, selectedMethod);
    const canPlaceOrder = errors.length === 0;

    return {
      cart: cart,
      items: itemsDetailed,
      shipping_address: state.shipping_address,
      available_shipping_methods: shippingMethods,
      selected_shipping_method_id: state.selected_shipping_method_id,
      applied_promo_code: appliedPromoCode,
      subtotal: totals.subtotal,
      shipping_cost: shipping_cost,
      discount_total: discount_total,
      tax_total: tax_total,
      total: total,
      currency: cart.currency || 'USD',
      payment_method: state.payment_method,
      can_place_order: canPlaceOrder,
      validation_errors: errors
    };
  }

  // updateCheckoutShippingAddress(shippingAddress)
  updateCheckoutShippingAddress(shippingAddress) {
    if (!shippingAddress) {
      return { success: false, message: 'Shipping address is required.', checkout_summary: null };
    }

    const cart = this._getOrCreateCart();
    const state = this._getOrCreateCheckoutState();

    state.shipping_address = {
      full_name: shippingAddress.fullName || '',
      address_line1: shippingAddress.addressLine1 || '',
      address_line2: shippingAddress.addressLine2 || '',
      city: shippingAddress.city || '',
      state: shippingAddress.state || '',
      postal_code: shippingAddress.postalCode || '',
      country: shippingAddress.country || 'US'
    };

    const shippingMethods = this._getFromStorage('shipping_methods', []);
    let selectedMethod = null;
    if (state.selected_shipping_method_id) {
      for (let i = 0; i < shippingMethods.length; i++) {
        if (shippingMethods[i].id === state.selected_shipping_method_id) {
          selectedMethod = shippingMethods[i];
          break;
        }
      }
    }
    if (!selectedMethod && shippingMethods.length > 0) {
      selectedMethod = this._selectDefaultShippingMethod();
      if (selectedMethod) state.selected_shipping_method_id = selectedMethod.id;
    }

    const totals = this._calculateCartTotals(cart);
    const shipping_cost = this._computeShippingCost(cart, selectedMethod);

    let discount_total = 0;
    if (state.applied_promo_code) {
      const promoResult = this._validateAndApplyPromoCode(state.applied_promo_code, totals.subtotal, shipping_cost);
      if (promoResult.success) {
        discount_total = promoResult.discount_total;
      } else {
        state.applied_promo_code = null;
      }
    }

    const tax_total = 0;
    const total = totals.subtotal + shipping_cost + tax_total - discount_total;

    state.subtotal = totals.subtotal;
    state.shipping_cost = shipping_cost;
    state.discount_total = discount_total;
    state.tax_total = tax_total;
    state.total = total;

    this._setCheckoutStateRaw(state);

    return {
      success: true,
      message: 'Shipping address updated.',
      checkout_summary: {
        subtotal: totals.subtotal,
        shipping_cost: shipping_cost,
        discount_total: discount_total,
        tax_total: tax_total,
        total: total,
        shipping_address: state.shipping_address
      }
    };
  }

  // selectCheckoutShippingMethod(shippingMethodId)
  selectCheckoutShippingMethod(shippingMethodId) {
    const cart = this._getOrCreateCart();
    const state = this._getOrCreateCheckoutState();
    const shippingMethods = this._getFromStorage('shipping_methods', []);

    let method = null;
    for (let i = 0; i < shippingMethods.length; i++) {
      if (shippingMethods[i].id === shippingMethodId && shippingMethods[i].is_available) {
        method = shippingMethods[i];
        break;
      }
    }
    if (!method) {
      return { success: false, message: 'Shipping method not found or unavailable.', checkout_summary: null };
    }

    state.selected_shipping_method_id = shippingMethodId;

    const totals = this._calculateCartTotals(cart);
    const shipping_cost = this._computeShippingCost(cart, method);

    let discount_total = 0;
    if (state.applied_promo_code) {
      const promoResult = this._validateAndApplyPromoCode(state.applied_promo_code, totals.subtotal, shipping_cost);
      if (promoResult.success) {
        discount_total = promoResult.discount_total;
      } else {
        state.applied_promo_code = null;
      }
    }

    const tax_total = 0;
    const total = totals.subtotal + shipping_cost + tax_total - discount_total;

    state.subtotal = totals.subtotal;
    state.shipping_cost = shipping_cost;
    state.discount_total = discount_total;
    state.tax_total = tax_total;
    state.total = total;

    this._setCheckoutStateRaw(state);

    return {
      success: true,
      message: 'Shipping method selected.',
      checkout_summary: {
        selected_shipping_method_id: state.selected_shipping_method_id,
        shipping_cost: shipping_cost,
        subtotal: totals.subtotal,
        discount_total: discount_total,
        tax_total: tax_total,
        total: total
      }
    };
  }

  // applyCheckoutPromoCode(promoCode)
  applyCheckoutPromoCode(promoCode) {
    const cart = this._getOrCreateCart();
    const state = this._getOrCreateCheckoutState();
    const totals = this._calculateCartTotals(cart);

    const shippingMethods = this._getFromStorage('shipping_methods', []);
    let selectedMethod = null;
    if (state.selected_shipping_method_id) {
      for (let i = 0; i < shippingMethods.length; i++) {
        if (shippingMethods[i].id === state.selected_shipping_method_id) {
          selectedMethod = shippingMethods[i];
          break;
        }
      }
    }
    if (!selectedMethod) {
      selectedMethod = this._selectDefaultShippingMethod();
    }
    const shipping_cost = this._computeShippingCost(cart, selectedMethod);

    const promoResult = this._validateAndApplyPromoCode(promoCode, totals.subtotal, shipping_cost);
    if (!promoResult.success) {
      // Clear any existing promo on failure
      state.applied_promo_code = null;
      state.discount_total = 0;
      const tax_total = 0;
      const total = totals.subtotal + shipping_cost + tax_total;
      state.subtotal = totals.subtotal;
      state.shipping_cost = shipping_cost;
      state.tax_total = tax_total;
      state.total = total;
      this._setCheckoutStateRaw(state);

      return {
        success: false,
        message: promoResult.message,
        checkout_summary: {
          applied_promo_code: null,
          discount_total: 0,
          subtotal: totals.subtotal,
          shipping_cost: shipping_cost,
          tax_total: tax_total,
          total: total
        }
      };
    }

    const discount_total = promoResult.discount_total;
    const tax_total = 0;
    const total = totals.subtotal + shipping_cost + tax_total - discount_total;

    state.applied_promo_code = promoResult.applied_promo_code;
    state.discount_total = discount_total;
    state.subtotal = totals.subtotal;
    state.shipping_cost = shipping_cost;
    state.tax_total = tax_total;
    state.total = total;

    this._setCheckoutStateRaw(state);

    return {
      success: true,
      message: promoResult.message,
      checkout_summary: {
        applied_promo_code: state.applied_promo_code,
        discount_total: discount_total,
        subtotal: totals.subtotal,
        shipping_cost: shipping_cost,
        tax_total: tax_total,
        total: total
      }
    };
  }

  // setCheckoutPaymentMethod(paymentMethod, paymentDetails)
  setCheckoutPaymentMethod(paymentMethod, paymentDetails) {
    const validMethods = ['credit_card', 'paypal', 'apple_pay', 'google_pay'];
    if (validMethods.indexOf(paymentMethod) === -1) {
      return { success: false, message: 'Invalid payment method.', checkout_summary: null };
    }

    const cart = this._getOrCreateCart();
    const state = this._getOrCreateCheckoutState();

    state.payment_method = paymentMethod;
    if (paymentDetails && typeof paymentDetails === 'object') {
      state.payment_details = {
        cardholderName: paymentDetails.cardholderName || null,
        cardLast4: paymentDetails.cardLast4 || null
      };
    } else {
      state.payment_details = null;
    }

    this._setCheckoutStateRaw(state);

    const canPlaceOrder = this._canPlaceOrder(state, cart);

    return {
      success: true,
      message: 'Payment method set.',
      checkout_summary: {
        payment_method: state.payment_method,
        can_place_order: canPlaceOrder
      }
    };
  }

  // placeOrder()
  placeOrder() {
    const cart = this._getOrCreateCart();
    const state = this._getOrCreateCheckoutState();
    const totals = this._calculateCartTotals(cart);
    const items = totals.items;

    if (items.length === 0) {
      return { success: false, message: 'Cart is empty.', order: null, order_items: [] };
    }

    const shippingMethods = this._getFromStorage('shipping_methods', []);
    let shippingMethod = null;
    if (state.selected_shipping_method_id) {
      for (let i = 0; i < shippingMethods.length; i++) {
        if (shippingMethods[i].id === state.selected_shipping_method_id) {
          shippingMethod = shippingMethods[i];
          break;
        }
      }
    }

    const canPlace = this._canPlaceOrder(state, cart);
    if (!canPlace) {
      return { success: false, message: 'Checkout is incomplete.', order: null, order_items: [] };
    }

    const shipping_cost = this._computeShippingCost(cart, shippingMethod);

    let discount_total = 0;
    if (state.applied_promo_code) {
      const promoResult = this._validateAndApplyPromoCode(state.applied_promo_code, totals.subtotal, shipping_cost);
      if (promoResult.success) {
        discount_total = promoResult.discount_total;
      } else {
        state.applied_promo_code = null;
      }
    }

    const tax_total = 0;
    const total = totals.subtotal + shipping_cost + tax_total - discount_total;

    const orderId = this._generateId('order');
    const orderNumber = 'SPC-' + orderId.split('_')[1];

    const orderItemsStorage = this._getFromStorage('order_items', []);

    const order_item_ids = [];
    for (let i = 0; i < items.length; i++) {
      const ci = items[i];
      const orderItem = {
        id: this._generateId('oi'),
        order_id: orderId,
        product_id: ci.product_id,
        product_variant_id: ci.product_variant_id,
        product_name: ci.product_name,
        size_label: ci.size_label,
        pack_type: ci.pack_type || null,
        pack_item_count: typeof ci.pack_item_count === 'number' ? ci.pack_item_count : null,
        quantity: ci.quantity,
        unit_price: ci.unit_price,
        total_price: ci.total_price,
        gift_message: ci.gift_message || null,
        gift_wrap_type: ci.gift_wrap_type || 'none',
        is_free_shipping: !!ci.free_shipping
      };
      orderItemsStorage.push(orderItem);
      order_item_ids.push(orderItem.id);
    }

    this._saveToStorage('order_items', orderItemsStorage);

    const order = {
      id: orderId,
      order_number: orderNumber,
      cart_id: cart.id,
      created_at: this._now(),
      status: 'paid',
      subtotal: totals.subtotal,
      shipping_cost: shipping_cost,
      discount_total: discount_total,
      tax_total: tax_total,
      total: total,
      shipping_full_name: state.shipping_address.full_name,
      shipping_address_line1: state.shipping_address.address_line1,
      shipping_address_line2: state.shipping_address.address_line2,
      shipping_city: state.shipping_address.city,
      shipping_state: state.shipping_address.state,
      shipping_postal_code: state.shipping_address.postal_code,
      shipping_country: state.shipping_address.country,
      shipping_method_code: shippingMethod ? shippingMethod.code : 'standard_shipping',
      promo_code: state.applied_promo_code || null,
      payment_method: state.payment_method,
      payment_status: 'captured',
      order_item_ids: order_item_ids
    };

    const orders = this._getFromStorage('orders', []);
    orders.push(order);
    this._saveToStorage('orders', orders);

    // Mark cart as checked out and clear its items
    cart.status = 'checked_out';
    cart.updated_at = this._now();
    cart.cart_item_ids = [];
    this._saveCart(cart);

    let cartItems = this._getFromStorage('cart_items', []);
    cartItems = cartItems.filter(function (ci) { return ci.cart_id !== cart.id; });
    this._saveToStorage('cart_items', cartItems);

    // Clear checkout state
    this._setCheckoutStateRaw(null);

    // Resolve foreign keys for returned order_items
    const products = this._getFromStorage('products', []);
    const variants = this._getFromStorage('product_variants', []);
    const order_items_detailed = [];
    for (let i = 0; i < order_item_ids.length; i++) {
      const id = order_item_ids[i];
      for (let j = 0; j < orderItemsStorage.length; j++) {
        if (orderItemsStorage[j].id === id) {
          const oi = orderItemsStorage[j];
          const cloned = Object.assign({}, oi);
          let prod = null;
          for (let k = 0; k < products.length; k++) {
            if (products[k].id === oi.product_id) { prod = products[k]; break; }
          }
          cloned.product = prod;
          let variant = null;
          if (oi.product_variant_id) {
            for (let k = 0; k < variants.length; k++) {
              if (variants[k].id === oi.product_variant_id) { variant = variants[k]; break; }
            }
          }
          cloned.product_variant = variant;
          order_items_detailed.push(cloned);
          break;
        }
      }
    }

    return { success: true, message: 'Order placed.', order: order, order_items: order_items_detailed };
  }

  // getOrderDetails(orderNumber)
  getOrderDetails(orderNumber) {
    const orders = this._getFromStorage('orders', []);
    const orderItems = this._getFromStorage('order_items', []);
    const shippingMethods = this._getFromStorage('shipping_methods', []);
    const promoCodes = this._getFromStorage('promo_codes', []);
    const products = this._getFromStorage('products', []);
    const variants = this._getFromStorage('product_variants', []);

    let order = null;
    for (let i = 0; i < orders.length; i++) {
      if (orders[i].order_number === orderNumber) {
        order = orders[i];
        break;
      }
    }
    if (!order) {
      return { order: null, items: [], shipping_method: null, promo: null };
    }

    const items = [];
    for (let i = 0; i < orderItems.length; i++) {
      if (orderItems[i].order_id === order.id) {
        const oi = orderItems[i];
        const cloned = Object.assign({}, oi);
        let prod = null;
        for (let k = 0; k < products.length; k++) {
          if (products[k].id === oi.product_id) { prod = products[k]; break; }
        }
        cloned.product = prod;
        let variant = null;
        if (oi.product_variant_id) {
          for (let k = 0; k < variants.length; k++) {
            if (variants[k].id === oi.product_variant_id) { variant = variants[k]; break; }
          }
        }
        cloned.product_variant = variant;
        items.push(cloned);
      }
    }

    let shipping_method = null;
    for (let i = 0; i < shippingMethods.length; i++) {
      if (shippingMethods[i].code === order.shipping_method_code) {
        shipping_method = shippingMethods[i];
        break;
      }
    }

    let promo = null;
    if (order.promo_code) {
      for (let i = 0; i < promoCodes.length; i++) {
        if (promoCodes[i].code === order.promo_code) {
          promo = promoCodes[i];
          break;
        }
      }
    }

    return {
      order: order,
      items: items,
      shipping_method: shipping_method,
      promo: promo
    };
  }

  // addProductToFavorites(productId)
  addProductToFavorites(productId) {
    const products = this._getFromStorage('products', []);
    let product = null;
    for (let i = 0; i < products.length; i++) {
      if (products[i].id === productId) {
        product = products[i];
        break;
      }
    }
    if (!product) {
      return { success: false, message: 'Product not found.', favorites: null };
    }

    const list = this._getOrCreateFavoritesList();
    if (list.product_ids.indexOf(productId) === -1) {
      list.product_ids.push(productId);
      list.updated_at = this._now();
      this._saveFavoritesList(list);
    }

    // Instrumentation for task completion tracking (task4_favoritedProductId)
    try {
      localStorage.setItem('task4_favoritedProductId', productId);
    } catch (e) {
      try {
        console.error('Instrumentation error for task4_favoritedProductId:', e);
      } catch (e2) {}
    }

    return { success: true, message: 'Added to favorites.', favorites: list };
  }

  // removeProductFromFavorites(productId)
  removeProductFromFavorites(productId) {
    const list = this._getOrCreateFavoritesList();
    const idx = list.product_ids.indexOf(productId);
    if (idx === -1) {
      return { success: false, message: 'Product not in favorites.', favorites: list };
    }
    list.product_ids.splice(idx, 1);
    list.updated_at = this._now();
    this._saveFavoritesList(list);
    return { success: true, message: 'Removed from favorites.', favorites: list };
  }

  // getFavoritesList()
  getFavoritesList() {
    const list = this._getOrCreateFavoritesList();
    const products = this._getFromStorage('products', []);

    const items = [];
    for (let i = 0; i < list.product_ids.length; i++) {
      const pid = list.product_ids[i];
      let product = null;
      for (let j = 0; j < products.length; j++) {
        if (products[j].id === pid) {
          product = products[j];
          break;
        }
      }
      if (!product) continue;
      items.push({
        product: product,
        price_display: this._formatPriceRange(product.min_price, product.max_price),
        heat_level_label: this._heatLevelLabel(product.heat_level),
        dietary_labels: (function (p) {
          const labels = [];
          if (p.is_vegan) labels.push('Vegan');
          if (p.is_gluten_free) labels.push('Gluten-Free');
          return labels;
        })(product),
        rating_average: product.rating_average,
        rating_count: product.rating_count,
        image_url: product.image_url || ''
      });
    }

    return {
      favorites: list,
      products: items
    };
  }

  // getStaticPageContent(pageKey)
  getStaticPageContent(pageKey) {
    const key = pageKey || '';
    const pages = this._getFromStorage('static_pages', []);
    for (let i = 0; i < pages.length; i++) {
      if (pages[i].pageKey === key) {
        return {
          title: pages[i].title || this._toTitleFromKey(key),
          body_sections: Array.isArray(pages[i].body_sections) ? pages[i].body_sections : []
        };
      }
    }
    // Fallback minimal content (no mocked domain data)
    return {
      title: this._toTitleFromKey(key),
      body_sections: []
    };
  }

  // getShippingMethods()
  getShippingMethods() {
    const methods = this._getFromStorage('shipping_methods', []);
    return methods;
  }

  // submitContactMessage(name, email, topic, orderNumber, message)
  submitContactMessage(name, email, topic, orderNumber, message) {
    if (!name || !email || !message) {
      return { success: false, message: 'Name, email, and message are required.' };
    }

    const contactMessages = this._getFromStorage('contact_messages', []);
    contactMessages.push({
      id: this._generateId('contact'),
      name: name,
      email: email,
      topic: topic || null,
      order_number: orderNumber || null,
      message: message,
      created_at: this._now()
    });
    this._saveToStorage('contact_messages', contactMessages);

    return { success: true, message: 'Message submitted.' };
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