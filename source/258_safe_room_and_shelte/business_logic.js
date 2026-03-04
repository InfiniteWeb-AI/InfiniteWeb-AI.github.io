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
    // Core tables
    const tables = [
      'users',
      'products',
      'categories',
      'carts',
      'cart_items',
      'wishlists',
      'wishlist_items',
      'consultation_requests',
      'custom_quote_requests',
      'installers',
      'installer_contact_requests',
      'articles',
      'orders',
      'shipping_methods',
      'general_contact_requests'
    ];

    for (const key of tables) {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    }

    // Global id counter
    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key) {
    const data = localStorage.getItem(key);
    if (!data) return [];
    try {
      return JSON.parse(data);
    } catch (e) {
      return [];
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

  // ---------- Helper: labels ----------

  _buildCapacityLabel(minPeople, maxPeople) {
    if (minPeople && maxPeople) {
      return minPeople + '-' + maxPeople + ' people';
    }
    if (minPeople && (!maxPeople || maxPeople === 0)) {
      return minPeople + '+ people';
    }
    return '';
  }

  _buildRatingLabel(rating, reviewCount) {
    if (rating == null) return 'No reviews';
    const r = Number(rating).toFixed(1).replace(/\.0$/, '');
    const rc = reviewCount || 0;
    const reviewWord = rc === 1 ? 'review' : 'reviews';
    return r + ' (' + rc + ' ' + reviewWord + ')';
  }

  _installationTypeLabel(value) {
    switch (value) {
      case 'indoor':
        return 'Indoor';
      case 'above_ground':
        return 'Above-Ground';
      case 'underground':
        return 'Underground';
      case 'garage':
        return 'Garage';
      case 'inside_building':
        return 'Inside Building';
      case 'outdoor':
        return 'Outdoor';
      default:
        return '';
    }
  }

  _subcategoryLabel(value) {
    switch (value) {
      case 'lighting':
        return 'Lighting';
      case 'first_aid':
        return 'First Aid';
      case 'other_accessory':
        return 'Other Accessory';
      default:
        return '';
    }
  }

  _categoryNameFromId(categoryId) {
    if (!categoryId) return '';
    const categories = this._getFromStorage('categories');
    const cat = categories.find(c => c.id === categoryId);
    if (cat && cat.name) return cat.name;
    // Fallback from enum id
    const parts = String(categoryId).split('_');
    return parts
      .map(p => p.charAt(0).toUpperCase() + p.slice(1))
      .join(' ');
  }

  // ---------- Helper: cart / wishlist / order ----------

  _getOrCreateCart() {
    let carts = this._getFromStorage('carts');
    let cart = carts[0];
    if (!cart) {
      cart = {
        id: this._generateId('cart'),
        items: [],
        subtotal: 0,
        tax_estimate: 0,
        shipping_estimate: 0,
        total: 0,
        created_at: this._nowIso(),
        updated_at: this._nowIso()
      };
      carts.push(cart);
      this._saveToStorage('carts', carts);
    }
    return cart;
  }

  _saveCart(updatedCart) {
    const carts = this._getFromStorage('carts');
    const index = carts.findIndex(c => c.id === updatedCart.id);
    if (index >= 0) {
      carts[index] = updatedCart;
    } else {
      carts.push(updatedCart);
    }
    this._saveToStorage('carts', carts);
  }

  _getOrCreateWishlist() {
    let wishlists = this._getFromStorage('wishlists');
    let wishlist = wishlists[0];
    if (!wishlist) {
      wishlist = {
        id: this._generateId('wishlist'),
        items: [],
        created_at: this._nowIso(),
        updated_at: this._nowIso()
      };
      wishlists.push(wishlist);
      this._saveToStorage('wishlists', wishlists);
    }
    return wishlist;
  }

  _saveWishlist(updatedWishlist) {
    const wishlists = this._getFromStorage('wishlists');
    const index = wishlists.findIndex(w => w.id === updatedWishlist.id);
    if (index >= 0) {
      wishlists[index] = updatedWishlist;
    } else {
      wishlists.push(updatedWishlist);
    }
    this._saveToStorage('wishlists', wishlists);
  }

  _getOrCreateDraftOrder() {
    const cart = this._getOrCreateCart();
    let orders = this._getFromStorage('orders');
    let order = orders.find(o => o.status === 'draft' && o.cart_id === cart.id);
    if (!order) {
      order = {
        id: this._generateId('order'),
        cart_id: cart.id,
        order_items: [],
        shipping_method: null,
        delivery_date: null,
        shipping_name: null,
        shipping_email: null,
        shipping_phone: null,
        shipping_address_line1: null,
        shipping_address_line2: null,
        shipping_city: null,
        shipping_state: null,
        shipping_postal_code: null,
        subtotal: cart.subtotal || 0,
        shipping_cost: 0,
        tax: cart.tax_estimate || 0,
        total: cart.total || 0,
        status: 'draft',
        created_at: this._nowIso(),
        updated_at: this._nowIso()
      };
      orders.push(order);
      this._saveToStorage('orders', orders);
    }
    return order;
  }

  _saveOrder(updatedOrder) {
    const orders = this._getFromStorage('orders');
    const index = orders.findIndex(o => o.id === updatedOrder.id);
    if (index >= 0) {
      orders[index] = updatedOrder;
    } else {
      orders.push(updatedOrder);
    }
    this._saveToStorage('orders', orders);
  }

  _recalculateCartTotals(cart) {
    const cartItems = this._getFromStorage('cart_items');
    const itemsForCart = cartItems.filter(ci => ci.cart_id === cart.id);
    let subtotal = 0;
    for (const item of itemsForCart) {
      const line = (item.unit_price || 0) * (item.quantity || 0);
      item.line_subtotal = Number(line.toFixed(2));
      subtotal += item.line_subtotal;
    }
    const taxRate = 0.08; // simple flat tax
    const tax = Number((subtotal * taxRate).toFixed(2));
    const shippingEstimate = cart.shipping_estimate || 0;
    const total = Number((subtotal + tax + shippingEstimate).toFixed(2));

    cart.subtotal = Number(subtotal.toFixed(2));
    cart.tax_estimate = tax;
    cart.total = total;
    cart.updated_at = this._nowIso();

    this._saveToStorage('cart_items', cartItems);
    this._saveCart(cart);

    return { cart, itemsForCart };
  }

  // ---------- Helper: financing ----------

  _calculateFinancingMonthlyPayment(principal, aprPercent, termMonths) {
    const P = Number(principal) || 0;
    const n = Number(termMonths) || 0;
    const apr = Number(aprPercent) || 0;
    if (P <= 0 || n <= 0) {
      return {
        monthlyPayment: 0,
        totalPayment: 0,
        totalInterest: 0
      };
    }
    if (!apr) {
      const mp = P / n;
      const monthlyPayment = Number(mp.toFixed(2));
      const totalPayment = Number((monthlyPayment * n).toFixed(2));
      return {
        monthlyPayment,
        totalPayment,
        totalInterest: Number((totalPayment - P).toFixed(2))
      };
    }
    const r = apr / 100 / 12;
    const monthlyPayment = Number(
      (P * r / (1 - Math.pow(1 + r, -n))).toFixed(2)
    );
    const totalPayment = Number((monthlyPayment * n).toFixed(2));
    const totalInterest = Number((totalPayment - P).toFixed(2));
    return { monthlyPayment, totalPayment, totalInterest };
  }

  // ---------- Helper: delivery date & appointment ----------

  _validateDeliveryDate(deliveryDateStr) {
    if (!deliveryDateStr) {
      return { valid: false, message: 'Delivery date is required.' };
    }
    const date = new Date(deliveryDateStr + 'T00:00:00');
    if (isNaN(date.getTime())) {
      return { valid: false, message: 'Invalid delivery date.' };
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (date < today) {
      return { valid: false, message: 'Delivery date cannot be in the past.' };
    }
    return { valid: true, message: 'ok' };
  }

  _combineAppointmentDateTime(appointmentDate, appointmentTime) {
    // appointmentDate expected 'YYYY-MM-DD', appointmentTime like '11:00 AM'
    if (!appointmentDate || !appointmentTime) return null;
    const timeParts = appointmentTime.trim().split(/\s+/);
    let time = timeParts[0] || '';
    const ampm = (timeParts[1] || '').toUpperCase();
    const hm = time.split(':');
    let hour = parseInt(hm[0] || '0', 10);
    const minute = parseInt(hm[1] || '0', 10);
    if (ampm === 'PM' && hour < 12) hour += 12;
    if (ampm === 'AM' && hour === 12) hour = 0;
    const hh = hour.toString().padStart(2, '0');
    const mm = minute.toString().padStart(2, '0');
    const iso = appointmentDate + 'T' + hh + ':' + mm + ':00';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return null;
    return d.toISOString();
  }

  // ---------- Core interfaces ----------

  // getProductCategories()
  getProductCategories() {
    const categories = this._getFromStorage('categories');
    return categories.filter(c => c.is_active !== false);
  }

  // searchProducts(query, categoryId, minPrice, maxPrice, capacityMinPeople, capacityMaxPeople,
  //                ratingMin, installationTypes, subcategory, financingAvailable,
  //                isGarageShelter, sortBy, page, pageSize)
  searchProducts(
    query,
    categoryId,
    minPrice,
    maxPrice,
    capacityMinPeople,
    capacityMaxPeople,
    ratingMin,
    installationTypes,
    subcategory,
    financingAvailable,
    isGarageShelter,
    sortBy,
    page,
    pageSize
  ) {
    const productsAll = this._getFromStorage('products');
    const categories = this._getFromStorage('categories');
    const q = (query || '').trim().toLowerCase();
    const instTypes = Array.isArray(installationTypes) ? installationTypes : [];
    const sort = sortBy || 'featured';
    const p = page && page > 0 ? page : 1;
    const ps = pageSize && pageSize > 0 ? pageSize : 20;

    let filtered = productsAll.filter(pr => pr.status === 'active');

    if (categoryId) {
      filtered = filtered.filter(pr => pr.category_id === categoryId);
    }

    if (q) {
      filtered = filtered.filter(pr => {
        const name = (pr.name || '').toLowerCase();
        const desc = (pr.description || '').toLowerCase();
        return name.includes(q) || desc.includes(q);
      });
    }

    if (typeof minPrice === 'number') {
      filtered = filtered.filter(pr => pr.price >= minPrice);
    }

    if (typeof maxPrice === 'number') {
      filtered = filtered.filter(pr => pr.price <= maxPrice);
    }

    if (typeof ratingMin === 'number') {
      filtered = filtered.filter(pr => (pr.rating || 0) >= ratingMin);
    }

    if (typeof capacityMinPeople === 'number') {
      filtered = filtered.filter(pr => {
        const minCap = pr.capacity_min_people || 0;
        const maxCap = pr.capacity_max_people || 0;
        if (maxCap && maxCap > 0) {
          return maxCap >= capacityMinPeople;
        }
        return minCap >= capacityMinPeople;
      });
    }

    if (typeof capacityMaxPeople === 'number') {
      filtered = filtered.filter(pr => {
        const minCap = pr.capacity_min_people || 0;
        return minCap <= capacityMaxPeople;
      });
    }

    if (instTypes.length) {
      filtered = filtered.filter(pr => instTypes.includes(pr.installation_type));
    }

    if (subcategory) {
      filtered = filtered.filter(pr => pr.subcategory === subcategory);
    }

    if (financingAvailable === true) {
      filtered = filtered.filter(pr => pr.financing_available === true);
    }

    if (isGarageShelter === true) {
      filtered = filtered.filter(pr => pr.is_garage_shelter === true);
    }

    // Sorting
    filtered.sort((a, b) => {
      if (sort === 'rating_high_to_low') {
        const ra = a.rating || 0;
        const rb = b.rating || 0;
        if (rb !== ra) return rb - ra;
        const rca = a.review_count || 0;
        const rcb = b.review_count || 0;
        return rcb - rca;
      }
      if (sort === 'price_low_to_high') {
        return (a.price || 0) - (b.price || 0);
      }
      if (sort === 'price_high_to_low') {
        return (b.price || 0) - (a.price || 0);
      }
      if (sort === 'newest') {
        const da = a.created_at ? new Date(a.created_at).getTime() : 0;
        const db = b.created_at ? new Date(b.created_at).getTime() : 0;
        return db - da;
      }
      // featured: sort by sort_order from category if present, otherwise created_at desc
      const da = a.created_at ? new Date(a.created_at).getTime() : 0;
      const db = b.created_at ? new Date(b.created_at).getTime() : 0;
      return db - da;
    });

    const total = filtered.length;
    const start = (p - 1) * ps;
    const end = start + ps;
    const pageItems = filtered.slice(start, end);

    const products = pageItems.map(pr => {
      const category = categories.find(c => c.id === pr.category_id);
      const categoryName = category && category.name ? category.name : this._categoryNameFromId(pr.category_id);
      const capacityLabel = this._buildCapacityLabel(pr.capacity_min_people, pr.capacity_max_people);
      const ratingLabel = this._buildRatingLabel(pr.rating, pr.review_count);
      const instLabel = this._installationTypeLabel(pr.installation_type);
      return {
        product: pr,
        category_name: categoryName,
        capacity_label: capacityLabel,
        rating_label: ratingLabel,
        installation_type_label: instLabel
      };
    });

    return {
      products,
      total,
      page: p,
      pageSize: ps
    };
  }

  // getProductFilterOptions(categoryId)
  getProductFilterOptions(categoryId) {
    let products = this._getFromStorage('products').filter(pr => pr.status === 'active');
    if (categoryId) {
      products = products.filter(pr => pr.category_id === categoryId);
    }

    // Capacity options
    const capMap = {};
    for (const pr of products) {
      const min = pr.capacity_min_people || 0;
      const max = pr.capacity_max_people || 0;
      if (!min && !max) continue;
      const key = min + '-' + max;
      if (!capMap[key]) {
        capMap[key] = {
          minPeople: min,
          maxPeople: max,
          label: this._buildCapacityLabel(min, max)
        };
      }
    }
    const capacityOptions = Object.values(capMap);

    // Price range
    let minPrice = 0;
    let maxPrice = 0;
    if (products.length) {
      minPrice = products.reduce((m, pr) => (pr.price < m ? pr.price : m), products[0].price);
      maxPrice = products.reduce((m, pr) => (pr.price > m ? pr.price : m), products[0].price);
    }

    const priceRange = {
      minPrice: Number((minPrice || 0).toFixed(2)),
      maxPrice: Number((maxPrice || 0).toFixed(2)),
      currency: 'usd'
    };

    // Rating options - static common thresholds
    const ratingOptions = [
      { minRating: 4.0, label: '4 stars & up' },
      { minRating: 4.5, label: '4.5 stars & up' }
    ];

    // Installation type options
    const instSet = new Set();
    for (const pr of products) {
      if (pr.installation_type) instSet.add(pr.installation_type);
    }
    const installationTypeOptions = Array.from(instSet).map(v => ({
      value: v,
      label: this._installationTypeLabel(v)
    }));

    // Subcategory options (for accessories)
    const subcatSet = new Set();
    for (const pr of products) {
      if (pr.subcategory) subcatSet.add(pr.subcategory);
    }
    const subcategoryOptions = Array.from(subcatSet).map(v => ({
      value: v,
      label: this._subcategoryLabel(v)
    }));

    return {
      capacityOptions,
      priceRange,
      ratingOptions,
      installationTypeOptions,
      subcategoryOptions
    };
  }

  // getProductDetails(productId)
  getProductDetails(productId) {
    const products = this._getFromStorage('products');
    const categories = this._getFromStorage('categories');
    const product = products.find(p => p.id === productId) || null;
    if (!product) {
      return {
        product: null,
        category_name: '',
        capacity_label: '',
        installation_type_label: '',
        rating_label: 'No reviews',
        specifications: {
          square_footage: null,
          length_ft: null,
          width_ft: null,
          height_ft: null,
          dimensions_label: ''
        },
        financing: {
          financing_available: false,
          apr_percent: null
        },
        related_article_ids: []
      };
    }

    const category = categories.find(c => c.id === product.category_id);
    const categoryName = category && category.name ? category.name : this._categoryNameFromId(product.category_id);
    const capacityLabel = this._buildCapacityLabel(product.capacity_min_people, product.capacity_max_people);
    const instLabel = this._installationTypeLabel(product.installation_type);
    const ratingLabel = this._buildRatingLabel(product.rating, product.review_count);

    let squareFootage = product.square_footage || null;
    if (!squareFootage && product.length_ft && product.width_ft) {
      squareFootage = Number((product.length_ft * product.width_ft).toFixed(2));
    }

    const lengthFt = product.length_ft || null;
    const widthFt = product.width_ft || null;
    const heightFt = product.height_ft || null;
    let dimensionsLabel = '';
    if (lengthFt && widthFt && heightFt) {
      dimensionsLabel = lengthFt + ' ft  d ' + widthFt + ' ft  d ' + heightFt + ' ft';
    } else if (lengthFt && widthFt) {
      dimensionsLabel = lengthFt + ' ft  d ' + widthFt + ' ft';
    }

    const financing = {
      financing_available: !!product.financing_available,
      apr_percent: product.financing_apr_percent != null ? product.financing_apr_percent : null
    };

    // Related articles referencing this product in recommended_product_ids
    const articles = this._getFromStorage('articles');
    const relatedArticleIds = [];
    for (const art of articles) {
      const ids = art.recommended_product_ids || [];
      if (Array.isArray(ids) && ids.includes(product.id)) {
        relatedArticleIds.push(art.id);
      }
    }

    return {
      product,
      category_name: categoryName,
      capacity_label: capacityLabel,
      installation_type_label: instLabel,
      rating_label: ratingLabel,
      specifications: {
        square_footage: squareFootage,
        length_ft: lengthFt,
        width_ft: widthFt,
        height_ft: heightFt,
        dimensions_label: dimensionsLabel
      },
      financing,
      related_article_ids: relatedArticleIds
    };
  }

  // addToCart(productId, quantity)
  addToCart(productId, quantity = 1) {
    const qty = quantity && quantity > 0 ? quantity : 1;
    const products = this._getFromStorage('products');
    const product = products.find(p => p.id === productId && p.status === 'active');
    if (!product) {
      return {
        success: false,
        cart: null,
        cartItem: null,
        message: 'Product not found or inactive.'
      };
    }

    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items');

    let cartItem = cartItems.find(
      ci => ci.cart_id === cart.id && ci.product_id === product.id
    );

    if (cartItem) {
      cartItem.quantity = (cartItem.quantity || 0) + qty;
      cartItem.unit_price = cartItem.unit_price != null ? cartItem.unit_price : product.price;
      cartItem.added_at = cartItem.added_at || this._nowIso();
    } else {
      cartItem = {
        id: this._generateId('cart_item'),
        cart_id: cart.id,
        product_id: product.id,
        quantity: qty,
        unit_price: product.price,
        line_subtotal: Number((product.price * qty).toFixed(2)),
        added_at: this._nowIso()
      };
      cartItems.push(cartItem);
      if (!Array.isArray(cart.items)) cart.items = [];
      if (!cart.items.includes(cartItem.id)) {
        cart.items.push(cartItem.id);
      }
    }

    this._saveToStorage('cart_items', cartItems);
    this._recalculateCartTotals(cart);

    return {
      success: true,
      cart,
      cartItem,
      message: 'Item added to cart.'
    };
  }

  // getCart()
  getCart() {
    const cart = this._getOrCreateCart();
    this._recalculateCartTotals(cart);
    const cartItems = this._getFromStorage('cart_items').filter(
      ci => ci.cart_id === cart.id
    );
    const products = this._getFromStorage('products');

    const items = cartItems.map(ci => {
      const product = products.find(p => p.id === ci.product_id) || null;
      const lineSubtotal = ci.line_subtotal != null
        ? ci.line_subtotal
        : Number(((ci.unit_price || 0) * (ci.quantity || 0)).toFixed(2));
      return {
        cartItem: ci,
        product,
        line_subtotal: lineSubtotal
      };
    });

    return { cart, items };
  }

  // updateCartItemQuantity(cartItemId, quantity)
  updateCartItemQuantity(cartItemId, quantity) {
    const newQty = Number(quantity);
    const cartItems = this._getFromStorage('cart_items');
    const index = cartItems.findIndex(ci => ci.id === cartItemId);
    if (index === -1) {
      const current = this.getCart();
      return {
        cart: current.cart,
        items: current.items,
        success: false,
        message: 'Cart item not found.'
      };
    }
    const cartItem = cartItems[index];
    const cartId = cartItem.cart_id;

    if (!newQty || newQty <= 0) {
      // Remove item
      cartItems.splice(index, 1);
      this._saveToStorage('cart_items', cartItems);
      const carts = this._getFromStorage('carts');
      const cart = carts.find(c => c.id === cartId) || this._getOrCreateCart();
      if (Array.isArray(cart.items)) {
        cart.items = cart.items.filter(id => id !== cartItemId);
      }
      this._recalculateCartTotals(cart);
      const updated = this.getCart();
      return {
        cart: updated.cart,
        items: updated.items,
        success: true,
        message: 'Item removed from cart.'
      };
    }

    cartItem.quantity = newQty;
    cartItem.line_subtotal = Number(((cartItem.unit_price || 0) * newQty).toFixed(2));
    cartItems[index] = cartItem;
    this._saveToStorage('cart_items', cartItems);

    const carts = this._getFromStorage('carts');
    const cart = carts.find(c => c.id === cartId) || this._getOrCreateCart();
    this._recalculateCartTotals(cart);

    const products = this._getFromStorage('products');
    const items = cartItems
      .filter(ci => ci.cart_id === cart.id)
      .map(ci => {
        const product = products.find(p => p.id === ci.product_id) || null;
        const lineSubtotal = ci.line_subtotal != null
          ? ci.line_subtotal
          : Number(((ci.unit_price || 0) * (ci.quantity || 0)).toFixed(2));
        return {
          cartItem: ci,
          product,
          line_subtotal: lineSubtotal
        };
      });

    return {
      cart,
      items,
      success: true,
      message: 'Cart item updated.'
    };
  }

  // removeCartItem(cartItemId)
  removeCartItem(cartItemId) {
    const cartItems = this._getFromStorage('cart_items');
    const index = cartItems.findIndex(ci => ci.id === cartItemId);
    if (index === -1) {
      const current = this.getCart();
      return {
        cart: current.cart,
        items: current.items,
        success: false,
        message: 'Cart item not found.'
      };
    }

    const cartId = cartItems[index].cart_id;
    cartItems.splice(index, 1);
    this._saveToStorage('cart_items', cartItems);

    const carts = this._getFromStorage('carts');
    const cart = carts.find(c => c.id === cartId) || this._getOrCreateCart();
    if (Array.isArray(cart.items)) {
      cart.items = cart.items.filter(id => id !== cartItemId);
    }
    this._recalculateCartTotals(cart);

    const products = this._getFromStorage('products');
    const items = cartItems
      .filter(ci => ci.cart_id === cart.id)
      .map(ci => {
        const product = products.find(p => p.id === ci.product_id) || null;
        const lineSubtotal = ci.line_subtotal != null
          ? ci.line_subtotal
          : Number(((ci.unit_price || 0) * (ci.quantity || 0)).toFixed(2));
        return {
          cartItem: ci,
          product,
          line_subtotal: lineSubtotal
        };
      });

    return {
      cart,
      items,
      success: true,
      message: 'Item removed from cart.'
    };
  }

  // getCartSummary()
  getCartSummary() {
    const cart = this._getOrCreateCart();
    this._recalculateCartTotals(cart);
    const cartItems = this._getFromStorage('cart_items').filter(
      ci => ci.cart_id === cart.id
    );
    const itemCount = cartItems.reduce((sum, ci) => sum + (ci.quantity || 0), 0);
    return {
      itemCount,
      subtotal: cart.subtotal || 0,
      total: cart.total || 0
    };
  }

  // getWishlist()
  getWishlist() {
    const wishlist = this._getOrCreateWishlist();
    const wishlistItems = this._getFromStorage('wishlist_items').filter(
      wi => wi.wishlist_id === wishlist.id
    );
    const products = this._getFromStorage('products');

    const items = wishlistItems.map(wi => {
      const product = products.find(p => p.id === wi.product_id) || null;
      const categoryName = product
        ? this._categoryNameFromId(product.category_id)
        : '';
      const capacityLabel = product
        ? this._buildCapacityLabel(
            product.capacity_min_people,
            product.capacity_max_people
          )
        : '';
      const instLabel = product
        ? this._installationTypeLabel(product.installation_type)
        : '';
      return {
        wishlistItem: wi,
        product,
        category_name: categoryName,
        capacity_label: capacityLabel,
        installation_type_label: instLabel
      };
    });

    return { wishlist, items };
  }

  // addToWishlist(productId)
  addToWishlist(productId) {
    const products = this._getFromStorage('products');
    const product = products.find(p => p.id === productId && p.status === 'active');
    if (!product) {
      return {
        wishlist: this._getOrCreateWishlist(),
        wishlistItem: null,
        success: false,
        message: 'Product not found or inactive.'
      };
    }

    const wishlist = this._getOrCreateWishlist();
    const wishlistItems = this._getFromStorage('wishlist_items');
    let wishlistItem = wishlistItems.find(
      wi => wi.wishlist_id === wishlist.id && wi.product_id === product.id
    );
    if (wishlistItem) {
      return {
        wishlist,
        wishlistItem,
        success: true,
        message: 'Product already in wishlist.'
      };
    }

    wishlistItem = {
      id: this._generateId('wishlist_item'),
      wishlist_id: wishlist.id,
      product_id: product.id,
      added_at: this._nowIso()
    };
    wishlistItems.push(wishlistItem);
    this._saveToStorage('wishlist_items', wishlistItems);

    if (!Array.isArray(wishlist.items)) wishlist.items = [];
    if (!wishlist.items.includes(wishlistItem.id)) {
      wishlist.items.push(wishlistItem.id);
    }
    wishlist.updated_at = this._nowIso();
    this._saveWishlist(wishlist);

    return {
      wishlist,
      wishlistItem,
      success: true,
      message: 'Product added to wishlist.'
    };
  }

  // removeWishlistItem(wishlistItemId)
  removeWishlistItem(wishlistItemId) {
    const wishlist = this._getOrCreateWishlist();
    const wishlistItems = this._getFromStorage('wishlist_items');
    const index = wishlistItems.findIndex(wi => wi.id === wishlistItemId);
    if (index === -1) {
      return {
        wishlist,
        items: wishlistItems.filter(wi => wi.wishlist_id === wishlist.id),
        success: false,
        message: 'Wishlist item not found.'
      };
    }

    wishlistItems.splice(index, 1);
    this._saveToStorage('wishlist_items', wishlistItems);

    if (Array.isArray(wishlist.items)) {
      wishlist.items = wishlist.items.filter(id => id !== wishlistItemId);
    }
    wishlist.updated_at = this._nowIso();
    this._saveWishlist(wishlist);

    const remaining = wishlistItems.filter(wi => wi.wishlist_id === wishlist.id);
    return {
      wishlist,
      items: remaining,
      success: true,
      message: 'Wishlist item removed.'
    };
  }

  // moveWishlistItemToCart(wishlistItemId, quantity, removeFromWishlist)
  moveWishlistItemToCart(wishlistItemId, quantity = 1, removeFromWishlist = true) {
    const wishlist = this._getOrCreateWishlist();
    const wishlistItems = this._getFromStorage('wishlist_items');
    const wi = wishlistItems.find(w => w.id === wishlistItemId && w.wishlist_id === wishlist.id);
    if (!wi) {
      return {
        cart: this._getOrCreateCart(),
        cartItem: null,
        wishlist,
        success: false,
        message: 'Wishlist item not found.'
      };
    }

    const addResult = this.addToCart(wi.product_id, quantity || 1);
    if (!addResult.success) {
      return {
        cart: addResult.cart,
        cartItem: addResult.cartItem,
        wishlist,
        success: false,
        message: addResult.message || 'Unable to add product to cart.'
      };
    }

    if (removeFromWishlist) {
      this.removeWishlistItem(wishlistItemId);
    }

    const updatedWishlist = this._getOrCreateWishlist();
    return {
      cart: addResult.cart,
      cartItem: addResult.cartItem,
      wishlist: updatedWishlist,
      success: true,
      message: 'Moved wishlist item to cart.'
    };
  }

  // getShippingMethods()
  getShippingMethods() {
    const methods = this._getFromStorage('shipping_methods');
    return methods.filter(m => m.is_active !== false).sort((a, b) => {
      const sa = a.sort_order != null ? a.sort_order : 0;
      const sb = b.sort_order != null ? b.sort_order : 0;
      return sa - sb;
    });
  }

  // getCheckoutState()
  getCheckoutState() {
    const cart = this._getOrCreateCart();
    this._recalculateCartTotals(cart);
    const cartItems = this._getFromStorage('cart_items').filter(
      ci => ci.cart_id === cart.id
    );
    const products = this._getFromStorage('products');
    const items = cartItems.map(ci => {
      const product = products.find(p => p.id === ci.product_id) || null;
      const lineSubtotal = ci.line_subtotal != null
        ? ci.line_subtotal
        : Number(((ci.unit_price || 0) * (ci.quantity || 0)).toFixed(2));
      return {
        cartItem: ci,
        product,
        line_subtotal: lineSubtotal
      };
    });

    const order = this._getOrCreateDraftOrder();
    const shippingMethods = this.getShippingMethods();

    const shippingContactInfo = {
      name: order.shipping_name || '',
      email: order.shipping_email || '',
      phone: order.shipping_phone || '',
      address_line1: order.shipping_address_line1 || '',
      address_line2: order.shipping_address_line2 || '',
      city: order.shipping_city || '',
      state: order.shipping_state || '',
      postal_code: order.shipping_postal_code || ''
    };

    return {
      order,
      cart,
      items,
      shippingMethods,
      selectedShippingMethodId: order.shipping_method || null,
      deliveryDate: order.delivery_date || null,
      shippingContactInfo
    };
  }

  // setCheckoutShippingMethod(shippingMethodId)
  setCheckoutShippingMethod(shippingMethodId) {
    const methods = this._getFromStorage('shipping_methods');
    const method = methods.find(m => m.id === shippingMethodId && m.is_active !== false);
    if (!method) {
      return {
        order: this._getOrCreateDraftOrder(),
        success: false,
        message: 'Shipping method not found.'
      };
    }

    const order = this._getOrCreateDraftOrder();
    const cart = this._getOrCreateCart();
    this._recalculateCartTotals(cart);

    order.shipping_method = method.id;
    const shippingCost = method.base_cost != null ? method.base_cost : 0;
    order.shipping_cost = Number(shippingCost.toFixed(2));
    order.subtotal = cart.subtotal || 0;
    order.tax = cart.tax_estimate || 0;
    order.total = Number((order.subtotal + order.tax + order.shipping_cost).toFixed(2));
    order.updated_at = this._nowIso();
    this._saveOrder(order);

    return {
      order,
      success: true,
      message: 'Shipping method updated.'
    };
  }

  // setCheckoutDeliveryDate(deliveryDate)
  setCheckoutDeliveryDate(deliveryDate) {
    const validation = this._validateDeliveryDate(deliveryDate);
    const order = this._getOrCreateDraftOrder();
    if (!validation.valid) {
      return {
        order,
        success: false,
        message: validation.message
      };
    }
    order.delivery_date = deliveryDate;
    order.updated_at = this._nowIso();
    this._saveOrder(order);
    return {
      order,
      success: true,
      message: 'Delivery date updated.'
    };
  }

  // setCheckoutShippingContactInfo(name, email, phone, addressLine1, addressLine2, city, state, postalCode)
  setCheckoutShippingContactInfo(
    name,
    email,
    phone,
    addressLine1,
    addressLine2,
    city,
    state,
    postalCode
  ) {
    const order = this._getOrCreateDraftOrder();
    order.shipping_name = name;
    order.shipping_email = email;
    order.shipping_phone = phone || null;
    order.shipping_address_line1 = addressLine1;
    order.shipping_address_line2 = addressLine2 || null;
    order.shipping_city = city;
    order.shipping_state = state;
    order.shipping_postal_code = postalCode;
    order.updated_at = this._nowIso();
    this._saveOrder(order);

    return {
      order,
      success: true,
      message: 'Shipping contact info updated.'
    };
  }

  // placeOrder()
  placeOrder() {
    const cart = this._getOrCreateCart();
    this._recalculateCartTotals(cart);
    const order = this._getOrCreateDraftOrder();

    if (!order.shipping_method) {
      return {
        order,
        success: false,
        confirmationNumber: null,
        message: 'Shipping method is required before placing order.'
      };
    }

    if (!order.delivery_date) {
      return {
        order,
        success: false,
        confirmationNumber: null,
        message: 'Delivery date is required before placing order.'
      };
    }

    if (!order.shipping_name || !order.shipping_email || !order.shipping_address_line1) {
      return {
        order,
        success: false,
        confirmationNumber: null,
        message: 'Shipping contact information is incomplete.'
      };
    }

    const cartItems = this._getFromStorage('cart_items').filter(
      ci => ci.cart_id === cart.id
    );
    const orderItems = cartItems.map(ci => ({
      product_id: ci.product_id,
      quantity: ci.quantity,
      unit_price: ci.unit_price,
      line_subtotal: ci.line_subtotal
    }));

    order.order_items = orderItems;
    order.subtotal = cart.subtotal || 0;
    order.tax = cart.tax_estimate || 0;
    if (order.shipping_cost == null) order.shipping_cost = 0;
    order.total = Number((order.subtotal + order.tax + order.shipping_cost).toFixed(2));
    order.status = 'placed';
    order.updated_at = this._nowIso();
    this._saveOrder(order);

    const confirmationNumber = order.id;

    return {
      order,
      success: true,
      confirmationNumber,
      message: 'Order placed successfully.'
    };
  }

  // getFinancingOptionsForProduct(productId)
  getFinancingOptionsForProduct(productId) {
    const products = this._getFromStorage('products');
    const product = products.find(p => p.id === productId && p.status === 'active');
    if (!product || !product.financing_available) {
      return {
        financing_available: false,
        apr_percent: null,
        termOptionsMonths: [],
        minAmount: 0,
        maxAmount: 0
      };
    }

    const apr = product.financing_apr_percent != null ? product.financing_apr_percent : 0;
    const price = product.price || 0;
    return {
      financing_available: true,
      apr_percent: apr,
      termOptionsMonths: [12, 24, 36, 48, 60],
      minAmount: Number((price * 0.5).toFixed(2)),
      maxAmount: Number((price * 1.5).toFixed(2))
    };
  }

  // calculateFinancingEstimate(productId, purchasePrice, termMonths)
  calculateFinancingEstimate(productId, purchasePrice, termMonths) {
    const products = this._getFromStorage('products');
    const product = products.find(p => p.id === productId && p.status === 'active');
    const price = purchasePrice != null ? purchasePrice : product ? product.price : 0;
    const apr = product && product.financing_apr_percent != null
      ? product.financing_apr_percent
      : 0;
    const calc = this._calculateFinancingMonthlyPayment(price, apr, termMonths);

    // Instrumentation for task completion tracking
    try {
      const instrumentationValue = {
        productId: product ? product.id : null,
        purchasePrice: price,
        termMonths: termMonths,
        monthlyPayment: calc.monthlyPayment,
        totalPayment: calc.totalPayment,
        totalInterest: calc.totalInterest,
        timestamp: this._nowIso()
      };
      localStorage.setItem(
        'task6_financingEstimate',
        JSON.stringify(instrumentationValue)
      );
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      monthlyPayment: calc.monthlyPayment,
      totalPayment: calc.totalPayment,
      totalInterest: calc.totalInterest,
      apr_percent: apr,
      termMonths
    };
  }

  // submitConsultationRequest(appointmentDate, appointmentTime, zipCode, name, email, phone, notes)
  submitConsultationRequest(
    appointmentDate,
    appointmentTime,
    zipCode,
    name,
    email,
    phone,
    notes
  ) {
    const appointmentDatetime = this._combineAppointmentDateTime(
      appointmentDate,
      appointmentTime
    );
    if (!appointmentDatetime) {
      return {
        consultationRequest: null,
        success: false,
        confirmationMessage: 'Invalid appointment date or time.'
      };
    }

    const requests = this._getFromStorage('consultation_requests');
    const request = {
      id: this._generateId('consultation'),
      appointment_datetime: appointmentDatetime,
      zip_code: zipCode,
      name,
      email,
      phone: phone || null,
      notes: notes || null,
      status: 'pending',
      created_at: this._nowIso()
    };
    requests.push(request);
    this._saveToStorage('consultation_requests', requests);

    return {
      consultationRequest: request,
      success: true,
      confirmationMessage: 'Consultation request submitted.'
    };
  }

  // submitCustomQuoteRequest(shelterType, lengthFt, widthFt, heightFt, material,
  //                          hasVentilationSystem, hasEmergencyLadder, budgetMax,
  //                          name, email, projectDescription)
  submitCustomQuoteRequest(
    shelterType,
    lengthFt,
    widthFt,
    heightFt,
    material,
    hasVentilationSystem,
    hasEmergencyLadder,
    budgetMax,
    name,
    email,
    projectDescription
  ) {
    const requests = this._getFromStorage('custom_quote_requests');
    const request = {
      id: this._generateId('custom_quote'),
      shelter_type: shelterType,
      length_ft: Number(lengthFt),
      width_ft: Number(widthFt),
      height_ft: Number(heightFt),
      material,
      has_ventilation_system: !!hasVentilationSystem,
      has_emergency_ladder: !!hasEmergencyLadder,
      budget_max: Number(budgetMax),
      name,
      email,
      project_description: projectDescription || null,
      status: 'submitted',
      created_at: this._nowIso()
    };
    requests.push(request);
    this._saveToStorage('custom_quote_requests', requests);

    return {
      customQuoteRequest: request,
      success: true,
      confirmationMessage: 'Custom quote request submitted.'
    };
  }

  // searchInstallers(zipCode, radiusMiles, sortBy, minReviewCount, page, pageSize)
  searchInstallers(
    zipCode,
    radiusMiles,
    sortBy,
    minReviewCount,
    page,
    pageSize
  ) {
    const installersAll = this._getFromStorage('installers').filter(
      ins => ins.is_active !== false
    );
    const radius = Number(radiusMiles) || 0;
    const sort = sortBy || 'rating_high_to_low';
    const p = page && page > 0 ? page : 1;
    const ps = pageSize && pageSize > 0 ? pageSize : 20;
    const minReviews = typeof minReviewCount === 'number' ? minReviewCount : 0;

    function approxDistanceMiles(zip1, zip2) {
      const z1 = parseInt(String(zip1).slice(0, 5) || '0', 10);
      const z2 = parseInt(String(zip2).slice(0, 5) || '0', 10);
      if (isNaN(z1) || isNaN(z2)) return radius; // fallback
      const diff = Math.abs(z1 - z2);
      return diff / 10; // arbitrary simple distance approximation
    }

    let matches = installersAll
      .map(ins => {
        const distance = approxDistanceMiles(zipCode, ins.base_zip_code);
        return { installer: ins, distance_miles: distance };
      })
      .filter(r => r.distance_miles <= radius && r.installer.service_radius_miles >= r.distance_miles);

    if (minReviews > 0) {
      matches = matches.filter(r => (r.installer.review_count || 0) >= minReviews);
    }

    matches.sort((a, b) => {
      if (sort === 'distance_nearest_first') {
        return a.distance_miles - b.distance_miles;
      }
      // default rating_high_to_low
      const ra = a.installer.rating || 0;
      const rb = b.installer.rating || 0;
      if (rb !== ra) return rb - ra;
      const rca = a.installer.review_count || 0;
      const rcb = b.installer.review_count || 0;
      if (rcb !== rca) return rcb - rca;
      return a.distance_miles - b.distance_miles;
    });

    const total = matches.length;
    const start = (p - 1) * ps;
    const end = start + ps;
    const pageItems = matches.slice(start, end);

    return {
      installers: pageItems,
      total,
      page: p,
      pageSize: ps
    };
  }

  // getInstallerDetails(installerId)
  getInstallerDetails(installerId) {
    const installers = this._getFromStorage('installers');
    const installer = installers.find(i => i.id === installerId) || null;
    if (!installer) {
      return {
        installer: null,
        reviews_summary: {
          rating: null,
          review_count: 0
        }
      };
    }
    return {
      installer,
      reviews_summary: {
        rating: installer.rating != null ? installer.rating : null,
        review_count: installer.review_count || 0
      }
    };
  }

  // submitInstallerContactRequest(installerId, name, email, phone, message)
  submitInstallerContactRequest(installerId, name, email, phone, message) {
    const installers = this._getFromStorage('installers');
    const installer = installers.find(i => i.id === installerId);
    if (!installer) {
      return {
        installerContactRequest: null,
        success: false,
        confirmationMessage: 'Installer not found.'
      };
    }

    const requests = this._getFromStorage('installer_contact_requests');
    const request = {
      id: this._generateId('installer_contact'),
      installer_id: installerId,
      name,
      email,
      phone: phone || null,
      message,
      status: 'submitted',
      created_at: this._nowIso()
    };
    requests.push(request);
    this._saveToStorage('installer_contact_requests', requests);

    return {
      installerContactRequest: request,
      success: true,
      confirmationMessage: 'Message sent to installer.'
    };
  }

  // listArticles(tag, sortBy, page, pageSize)
  listArticles(tag, sortBy, page, pageSize) {
    const all = this._getFromStorage('articles').filter(a => a.status === 'published');
    const t = (tag || '').trim();
    let articles = all;
    if (t) {
      articles = articles.filter(a => {
        const tags = Array.isArray(a.tags) ? a.tags : [];
        return tags.includes(t);
      });
    }

    const sort = sortBy || 'newest_first';
    articles.sort((a, b) => {
      const da = a.published_at ? new Date(a.published_at).getTime() : 0;
      const db = b.published_at ? new Date(b.published_at).getTime() : 0;
      if (sort === 'oldest_first') return da - db;
      // newest_first
      return db - da;
    });

    const p = page && page > 0 ? page : 1;
    const ps = pageSize && pageSize > 0 ? pageSize : 20;
    const total = articles.length;
    const start = (p - 1) * ps;
    const end = start + ps;
    const pageItems = articles.slice(start, end);

    return {
      articles: pageItems,
      total,
      page: p,
      pageSize: ps
    };
  }

  // getArticleDetails(articleId)
  getArticleDetails(articleId) {
    const articles = this._getFromStorage('articles');
    const article = articles.find(a => a.id === articleId) || null;
    if (!article) {
      return {
        article: null,
        recommendedProducts: []
      };
    }

    const products = this._getFromStorage('products');
    const recommendedIds = Array.isArray(article.recommended_product_ids)
      ? article.recommended_product_ids
      : [];

    const recommendedProducts = recommendedIds
      .map(id => products.find(p => p.id === id))
      .filter(p => !!p)
      .map(pr => ({
        product: pr,
        category_name: this._categoryNameFromId(pr.category_id),
        capacity_label: this._buildCapacityLabel(
          pr.capacity_min_people,
          pr.capacity_max_people
        ),
        rating_label: this._buildRatingLabel(pr.rating, pr.review_count)
      }));

    return {
      article,
      recommendedProducts
    };
  }

  // submitGeneralContactForm(name, email, phone, topic, message)
  submitGeneralContactForm(name, email, phone, topic, message) {
    const requests = this._getFromStorage('general_contact_requests');
    const request = {
      id: this._generateId('contact'),
      name,
      email,
      phone: phone || null,
      topic: topic || null,
      message,
      created_at: this._nowIso()
    };
    requests.push(request);
    this._saveToStorage('general_contact_requests', requests);

    return {
      success: true,
      requestId: request.id,
      confirmationMessage: 'Your message has been received.'
    };
  }

  // NO test methods in this class
}

// Browser global + Node.js export
if (typeof window !== 'undefined') {
  window.BusinessLogic = BusinessLogic;
  window.WebsiteSDK = new BusinessLogic();
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = BusinessLogic;
}