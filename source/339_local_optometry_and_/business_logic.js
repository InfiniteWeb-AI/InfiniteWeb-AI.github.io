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
    // Initialize localStorage with default data structures
    this._initStorage();
    this.idCounter = this._getNextIdCounter();
  }

  _initStorage() {
    // Initialize all data tables in localStorage if not exist
    const ensureArrayKey = (key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    };

    // Legacy/example keys
    ensureArrayKey('users');
    ensureArrayKey('products');
    ensureArrayKey('carts');
    // Legacy camelCase key (not used by core logic, but preserved)
    ensureArrayKey('cartItems');

    // Schema-based storage keys
    ensureArrayKey('categories');
    ensureArrayKey('cart_items');
    ensureArrayKey('wishlist_lists');
    ensureArrayKey('wishlist_items');
    ensureArrayKey('locations');
    ensureArrayKey('location_hours');
    ensureArrayKey('doctors');
    ensureArrayKey('available_appointment_slots');
    ensureArrayKey('appointments');
    ensureArrayKey('promotions');
    ensureArrayKey('insurance_plans');
    ensureArrayKey('insurance_benefits_requests');
    ensureArrayKey('contact_messages');
    ensureArrayKey('newsletter_subscriptions');

    // Config-type data can be absent; we'll compute defaults on the fly

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

  // ---------- Generic helpers ----------

  _findCategoryBySlug(slug) {
    const categories = this._getFromStorage('categories');
    return categories.find((c) => c.slug === slug) || null;
  }

  _attachCategoryToProduct(product) {
    if (!product) return null;
    const categories = this._getFromStorage('categories');
    const category = categories.find((c) => c.id === product.category_id) || null;
    return { ...product, category };
  }

  _parseDate(dateStr) {
    // dateStr: 'YYYY-MM-DD'
    if (!dateStr) return null;
    const [y, m, d] = dateStr.split('-').map((v) => parseInt(v, 10));
    if (!y || !m || !d) return null;
    return new Date(Date.UTC(y, m - 1, d));
  }

  _formatDateISO(date) {
    // Returns 'YYYY-MM-DD'
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, '0');
    const d = String(date.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  _timeFromISO(isoStr) {
    // Returns 'HH:MM' in UTC time to avoid timezone discrepancies
    const dt = new Date(isoStr);
    const h = String(dt.getUTCHours()).padStart(2, '0');
    const m = String(dt.getUTCMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  }

  _compareTimeStrings(t1, t2) {
    // 'HH:MM' lexical comparison works for same format, but be explicit
    const [h1, m1] = t1.split(':').map((v) => parseInt(v, 10));
    const [h2, m2] = t2.split(':').map((v) => parseInt(v, 10));
    if (h1 !== h2) return h1 - h2;
    return m1 - m2;
  }

  // ---------- Cart helpers ----------

  _getOrCreateCart() {
    let carts = this._getFromStorage('carts');
    let cart = carts[0] || null; // single active cart for this agent

    if (!cart) {
      cart = {
        id: this._generateId('cart'),
        items: [],
        created_at: this._now(),
        updated_at: this._now()
      };
      carts.push(cart);
      this._saveToStorage('carts', carts);
    }

    return cart;
  }

  // Backwards compatibility with example stub name (not used internally)
  _findOrCreateCart(userId) {
    return this._getOrCreateCart(userId);
  }

  _recalculateCartTotals(cart) {
    const cartItems = this._getFromStorage('cart_items');
    const itemsForCart = cartItems.filter((ci) => ci.cart_id === cart.id);
    let subtotal = 0;
    let totalItems = 0;
    for (const item of itemsForCart) {
      const lineSubtotal = (item.unit_price || 0) * (item.quantity || 0);
      item.line_subtotal = lineSubtotal;
      subtotal += lineSubtotal;
      totalItems += item.quantity || 0;
    }
    // Save updated cart_items back
    this._saveToStorage('cart_items', cartItems);
    cart.items = itemsForCart.map((ci) => ci.id);
    cart.updated_at = this._now();
    const carts = this._getFromStorage('carts').map((c) => (c.id === cart.id ? cart : c));
    this._saveToStorage('carts', carts);
    return {
      cart,
      subtotal,
      total_items: totalItems,
      items: itemsForCart
    };
  }

  _buildCartResponse(cart, items) {
    // Attach product to each CartItem
    const products = this._getFromStorage('products');
    const itemsWithProduct = items.map((item) => {
      const product = products.find((p) => p.id === item.product_id) || null;
      return { ...item, product: this._attachCategoryToProduct(product) };
    });
    const subtotal = itemsWithProduct.reduce((sum, i) => sum + (i.line_subtotal || 0), 0);
    const totalItems = itemsWithProduct.reduce((sum, i) => sum + (i.quantity || 0), 0);
    return {
      id: cart.id,
      items: itemsWithProduct,
      subtotal,
      total_items: totalItems
    };
  }

  // ---------- Wishlist helpers ----------

  _getDefaultWishlist() {
    let lists = this._getFromStorage('wishlist_lists');
    let def = lists.find((l) => l.is_default);
    if (!def) {
      def = {
        id: this._generateId('wishlist'),
        name: 'Favorites',
        description: 'Default wishlist',
        is_default: true,
        created_at: this._now()
      };
      lists.push(def);
      this._saveToStorage('wishlist_lists', lists);
    }
    return def;
  }

  // ---------- Appointment helpers ----------

  _reserveAppointmentSlot({
    slot,
    locationId,
    doctorId,
    visit_type,
    source,
    promotionId,
    patient_full_name,
    patient_phone,
    patient_email,
    notes
  }) {
    const appointments = this._getFromStorage('appointments');
    const slots = this._getFromStorage('available_appointment_slots');

    let slotId = null;
    let appointment_datetime = null;

    if (slot) {
      const slotIndex = slots.findIndex((s) => s.id === slot.id);
      if (slotIndex === -1) {
        return { success: false, error: 'slot_not_found' };
      }
      if (slots[slotIndex].is_booked || !slots[slotIndex].is_active) {
        return { success: false, error: 'slot_unavailable' };
      }
      slots[slotIndex].is_booked = true;
      slotId = slots[slotIndex].id;
      appointment_datetime = slots[slotIndex].start_datetime;
      // Persist slot update
      this._saveToStorage('available_appointment_slots', slots);
    }

    const appt = {
      id: this._generateId('appt'),
      location_id: locationId,
      doctor_id: doctorId || null,
      visit_type,
      source,
      promotion_id: promotionId || null,
      slot_id: slotId || null,
      appointment_datetime: appointment_datetime || new Date().toISOString(),
      status: 'pending',
      patient_full_name,
      patient_phone,
      patient_email,
      notes: notes || '',
      created_at: this._now()
    };

    appointments.push(appt);
    this._saveToStorage('appointments', appointments);

    // Attach foreign key references for return
    const locations = this._getFromStorage('locations');
    const doctors = this._getFromStorage('doctors');
    const promotions = this._getFromStorage('promotions');
    const location = locations.find((l) => l.id === appt.location_id) || null;
    const doctor = doctors.find((d) => d.id === appt.doctor_id) || null;
    const promotion = promotions.find((p) => p.id === appt.promotion_id) || null;
    const slotsLatest = this._getFromStorage('available_appointment_slots');
    const slotObj = slotId ? slotsLatest.find((s) => s.id === slotId) || null : null;

    const appointmentWithRefs = {
      ...appt,
      location,
      doctor,
      promotion,
      slot: slotObj
    };

    return { success: true, appointment: appointmentWithRefs };
  }

  // ---------- Insurance helpers ----------

  _matchInsurancePlanByName(name) {
    if (!name) return null;
    const normalized = name.trim().toLowerCase();
    const plans = this._getFromStorage('insurance_plans');
    return (
      plans.find((p) => (p.name || '').trim().toLowerCase() === normalized) || null
    );
  }

  // ============================================================
  // Core interface implementations
  // ============================================================

  // ------------------------------------------------------------
  // Shopping / Homepage
  // ------------------------------------------------------------

  getHomepageContent() {
    const categories = this._getFromStorage('categories');
    const featured_categories = categories.slice(0, 3).map((c) => ({
      category_id: c.id,
      category_name: c.name,
      category_slug: c.slug
    }));

    return {
      intro_heading: 'Local Eye Care & Quality Eyewear',
      intro_body:
        'Comprehensive eye exams, contact lens fittings, and a curated selection of eyeglass frames and sunglasses for the whole family.',
      featured_services: [
        {
          id: 'service_comprehensive_exam',
          title: 'Comprehensive Eye Exams',
          description: 'Thorough exams for clear, comfortable vision at every age.'
        },
        {
          id: 'service_contact_lens',
          title: 'Contact Lens Fittings',
          description: 'Custom fittings and training for new and experienced wearers.'
        },
        {
          id: 'service_eyewear',
          title: 'Eyeglasses & Sunglasses',
          description: 'Stylish, high-quality frames for men, women, and kids.'
        }
      ],
      featured_categories,
      primary_exam_cta_label: 'Book an Eye Exam'
    };
  }

  getShopCategories() {
    const categories = this._getFromStorage('categories');
    // No foreign keys here
    return categories;
  }

  getProductFilterOptions(categorySlug) {
    const category = this._findCategoryBySlug(categorySlug);
    if (!category) {
      return {
        genders: [],
        frame_shapes: [],
        colors: [],
        lens_features: [],
        rating_options: [],
        price_range: { min: 0, max: 0, step: 1 }
      };
    }

    const products = this._getFromStorage('products').filter(
      (p) => p.category_id === category.id && p.is_active
    );

    const genders = Array.from(new Set(products.map((p) => p.gender))).filter(Boolean);
    const frame_shapes = Array.from(
      new Set(products.map((p) => p.frame_shape))
    ).filter(Boolean);

    const colorValues = Array.from(
      new Set(products.map((p) => p.frame_color).filter(Boolean))
    );
    const colors = colorValues.map((value) => ({
      value,
      label: value.charAt(0).toUpperCase() + value.slice(1)
    }));

    const lensFeatureSet = new Set();
    for (const p of products) {
      if (Array.isArray(p.lens_features)) {
        for (const lf of p.lens_features) {
          lensFeatureSet.add(lf);
        }
      }
    }
    const lens_features = Array.from(lensFeatureSet);

    const ratings = products
      .map((p) => p.average_rating)
      .filter((r) => typeof r === 'number');
    const hasHighRatings = ratings.some((r) => r >= 4);

    const rating_options = hasHighRatings
      ? [
          { value: 4, label: '4 stars & up' },
          { value: 3, label: '3 stars & up' }
        ]
      : [];

    const prices = products.map((p) => p.price).filter((v) => typeof v === 'number');
    const min = prices.length ? Math.min(...prices) : 0;
    const max = prices.length ? Math.max(...prices) : 0;

    return {
      genders,
      frame_shapes,
      colors,
      lens_features,
      rating_options,
      price_range: { min, max, step: 1 }
    };
  }

  listProducts(categorySlug, filters = {}, sort_by = 'relevance', page = 1, page_size = 20) {
    const category = this._findCategoryBySlug(categorySlug);
    if (!category) {
      return {
        products: [],
        total: 0,
        page,
        page_size
      };
    }

    let products = this._getFromStorage('products').filter(
      (p) => p.category_id === category.id && p.is_active
    );

    // Apply filters
    if (filters.gender) {
      products = products.filter((p) => p.gender === filters.gender);
    }
    if (filters.frame_shape) {
      products = products.filter((p) => p.frame_shape === filters.frame_shape);
    }
    if (filters.frame_color) {
      products = products.filter((p) => p.frame_color === filters.frame_color);
    }
    if (filters.lens_feature) {
      products = products.filter((p) =>
        Array.isArray(p.lens_features)
          ? p.lens_features.includes(filters.lens_feature)
          : false
      );
    }
    if (typeof filters.price_min === 'number') {
      products = products.filter((p) => p.price >= filters.price_min);
    }
    if (typeof filters.price_max === 'number') {
      products = products.filter((p) => p.price <= filters.price_max);
    }
    if (typeof filters.rating_min === 'number') {
      products = products.filter((p) => (p.average_rating || 0) >= filters.rating_min);
    }
    if (typeof filters.is_kids_frame === 'boolean') {
      products = products.filter((p) => p.is_kids_frame === filters.is_kids_frame);
    }

    // Sorting
    if (sort_by === 'price_asc') {
      products.sort((a, b) => a.price - b.price);
    } else if (sort_by === 'price_desc') {
      products.sort((a, b) => b.price - a.price);
    } else if (sort_by === 'rating_desc') {
      products.sort((a, b) => (b.average_rating || 0) - (a.average_rating || 0));
    }
    // 'relevance' or unknown: keep existing order

    const total = products.length;
    const start = (page - 1) * page_size;
    const end = start + page_size;
    const pageProducts = products.slice(start, end);

    const categories = this._getFromStorage('categories');

    const resultProducts = pageProducts.map((p) => {
      const cat = categories.find((c) => c.id === p.category_id) || null;
      const productWithCategory = { ...p, category: cat };
      return {
        product: productWithCategory,
        category_name: cat ? cat.name : null
      };
    });

    return {
      products: resultProducts,
      total,
      page,
      page_size
    };
  }

  getProductDetails(productId) {
    const products = this._getFromStorage('products');
    const categories = this._getFromStorage('categories');
    const product = products.find((p) => p.id === productId) || null;
    if (!product) {
      return {
        product: null,
        category: null,
        available_lens_types: [],
        available_lens_add_ons: [],
        is_in_default_wishlist: false
      };
    }
    const category = categories.find((c) => c.id === product.category_id) || null;

    // Lens options - static capabilities
    const available_lens_types = [
      'single_vision_prescription',
      'progressive_prescription',
      'non_prescription',
      'no_lens'
    ];
    const available_lens_add_ons = [
      'blue_light_filter',
      'polarized',
      'anti_reflective',
      'scratch_resistant'
    ];

    // Wishlist membership
    const defaultWishlist = this._getDefaultWishlist();
    const wishlistItems = this._getFromStorage('wishlist_items');
    const is_in_default_wishlist = wishlistItems.some(
      (wi) => wi.wishlist_id === defaultWishlist.id && wi.product_id === productId
    );

    const productWithCategory = { ...product, category };

    return {
      product: productWithCategory,
      category,
      available_lens_types,
      available_lens_add_ons,
      is_in_default_wishlist
    };
  }

  // ------------------------------------------------------------
  // Cart interfaces
  // ------------------------------------------------------------

  addProductToCart(productId, quantity = 1, lensConfig = null) {
    const products = this._getFromStorage('products');
    const product = products.find((p) => p.id === productId && p.is_active);
    if (!product) {
      return {
        success: false,
        cart: null,
        message: 'product_not_found_or_inactive'
      };
    }

    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items');

    const lens_type = lensConfig && lensConfig.lens_type ? lensConfig.lens_type : 'no_lens';
    const lens_add_ons = lensConfig && Array.isArray(lensConfig.lens_add_ons)
      ? lensConfig.lens_add_ons
      : [];
    const is_prescription = lensConfig && typeof lensConfig.is_prescription === 'boolean'
      ? lensConfig.is_prescription
      : lens_type === 'single_vision_prescription' ||
        lens_type === 'progressive_prescription' ||
        lens_type === 'contact_lens';

    // Try to merge with existing line with same product & lens config
    let existing = cartItems.find(
      (ci) =>
        ci.cart_id === cart.id &&
        ci.product_id === product.id &&
        ci.lens_type === lens_type &&
        JSON.stringify(ci.lens_add_ons || []) === JSON.stringify(lens_add_ons || [])
    );

    if (existing) {
      existing.quantity += quantity;
      existing.line_subtotal = existing.unit_price * existing.quantity;
      existing.added_at = existing.added_at || this._now();
      cartItems = cartItems.map((ci) => (ci.id === existing.id ? existing : ci));
    } else {
      const newItem = {
        id: this._generateId('cart_item'),
        cart_id: cart.id,
        product_id: product.id,
        product_name: product.name,
        product_frame_color: product.frame_color,
        product_frame_shape: product.frame_shape,
        is_kids_frame: product.is_kids_frame,
        unit_price: product.price,
        quantity,
        lens_type,
        lens_add_ons,
        is_prescription,
        line_subtotal: product.price * quantity,
        added_at: this._now()
      };
      cartItems.push(newItem);
    }

    this._saveToStorage('cart_items', cartItems);
    const { cart: updatedCart, items } = this._recalculateCartTotals(cart);
    const responseCart = this._buildCartResponse(updatedCart, items);

    return {
      success: true,
      cart: responseCart,
      message: 'added_to_cart'
    };
  }

  // Backwards compatibility with original stub
  addToCart(userId, productId, quantity = 1) {
    // userId is ignored in this implementation (single-cart model)
    return this.addProductToCart(productId, quantity, null);
  }

  getCartSummary() {
    const carts = this._getFromStorage('carts');
    if (!carts.length) {
      return {
        cart_exists: false,
        cart_id: null,
        items: [],
        subtotal: 0,
        total_items: 0
      };
    }
    const cart = carts[0];
    const cartItemsAll = this._getFromStorage('cart_items');
    const items = cartItemsAll.filter((ci) => ci.cart_id === cart.id);
    const responseCart = this._buildCartResponse(cart, items);
    return {
      cart_exists: true,
      cart_id: responseCart.id,
      items: responseCart.items,
      subtotal: responseCart.subtotal,
      total_items: responseCart.total_items
    };
  }

  updateCartItem(cartItemId, quantity) {
    let cartItems = this._getFromStorage('cart_items');
    const item = cartItems.find((ci) => ci.id === cartItemId);
    if (!item) {
      return {
        success: false,
        cart: null,
        message: 'cart_item_not_found'
      };
    }

    if (quantity <= 0) {
      return this.removeCartItem(cartItemId);
    }

    item.quantity = quantity;
    item.line_subtotal = item.unit_price * item.quantity;
    cartItems = cartItems.map((ci) => (ci.id === item.id ? item : ci));
    this._saveToStorage('cart_items', cartItems);

    // Find cart
    const carts = this._getFromStorage('carts');
    const cart = carts.find((c) => c.id === item.cart_id) || this._getOrCreateCart();
    const { cart: updatedCart, items } = this._recalculateCartTotals(cart);
    const responseCart = this._buildCartResponse(updatedCart, items);

    return {
      success: true,
      cart: responseCart,
      message: 'cart_item_updated'
    };
  }

  removeCartItem(cartItemId) {
    let cartItems = this._getFromStorage('cart_items');
    const item = cartItems.find((ci) => ci.id === cartItemId);
    if (!item) {
      return {
        success: false,
        cart: null,
        message: 'cart_item_not_found'
      };
    }

    cartItems = cartItems.filter((ci) => ci.id !== cartItemId);
    this._saveToStorage('cart_items', cartItems);

    const carts = this._getFromStorage('carts');
    const cart = carts.find((c) => c.id === item.cart_id) || this._getOrCreateCart();
    const { cart: updatedCart, items } = this._recalculateCartTotals(cart);
    const responseCart = this._buildCartResponse(updatedCart, items);

    return {
      success: true,
      cart: responseCart,
      message: 'cart_item_removed'
    };
  }

  // ------------------------------------------------------------
  // Wishlist interfaces
  // ------------------------------------------------------------

  getWishlistLists() {
    const lists = this._getFromStorage('wishlist_lists');
    return lists;
  }

  getWishlistItems(wishlistId) {
    const lists = this._getFromStorage('wishlist_lists');
    const wishlist = lists.find((l) => l.id === wishlistId) || null;
    const itemsRaw = this._getFromStorage('wishlist_items').filter(
      (wi) => wi.wishlist_id === wishlistId
    );
    const products = this._getFromStorage('products');

    const items = itemsRaw.map((item) => {
      const product = products.find((p) => p.id === item.product_id) || null;
      return {
        ...item,
        product: this._attachCategoryToProduct(product)
      };
    });

    return {
      wishlist,
      items
    };
  }

  addProductToWishlist(productId, wishlistId = null) {
    const products = this._getFromStorage('products');
    const product = products.find((p) => p.id === productId);
    if (!product) {
      return {
        success: false,
        wishlist_item: null,
        is_default_wishlist: false,
        message: 'product_not_found'
      };
    }

    let targetWishlist = null;
    let isDefault = false;
    if (wishlistId) {
      const lists = this._getFromStorage('wishlist_lists');
      targetWishlist = lists.find((l) => l.id === wishlistId) || null;
    }
    if (!targetWishlist) {
      targetWishlist = this._getDefaultWishlist();
      isDefault = true;
    }

    let items = this._getFromStorage('wishlist_items');
    const newItem = {
      id: this._generateId('wishlist_item'),
      wishlist_id: targetWishlist.id,
      product_id: product.id,
      product_name: product.name,
      added_at: this._now()
    };
    items.push(newItem);
    this._saveToStorage('wishlist_items', items);

    const itemWithProduct = {
      ...newItem,
      product: this._attachCategoryToProduct(product)
    };

    return {
      success: true,
      wishlist_item: itemWithProduct,
      is_default_wishlist: isDefault,
      message: 'added_to_wishlist'
    };
  }

  removeWishlistItem(wishlistItemId) {
    let items = this._getFromStorage('wishlist_items');
    const exists = items.some((wi) => wi.id === wishlistItemId);
    if (!exists) {
      return { success: false, message: 'wishlist_item_not_found' };
    }
    items = items.filter((wi) => wi.id !== wishlistItemId);
    this._saveToStorage('wishlist_items', items);
    return { success: true, message: 'wishlist_item_removed' };
  }

  moveWishlistItemToCart(wishlistItemId, quantity = 1, lensConfig = null) {
    const items = this._getFromStorage('wishlist_items');
    const wi = items.find((item) => item.id === wishlistItemId);
    if (!wi) {
      return {
        success: false,
        cart: null,
        removed_from_wishlist: false,
        message: 'wishlist_item_not_found'
      };
    }

    const addResult = this.addProductToCart(wi.product_id, quantity, lensConfig || null);
    if (!addResult.success) {
      return {
        success: false,
        cart: addResult.cart,
        removed_from_wishlist: false,
        message: addResult.message || 'failed_to_add_to_cart'
      };
    }

    const removeResult = this.removeWishlistItem(wishlistItemId);

    return {
      success: true,
      cart: addResult.cart,
      removed_from_wishlist: removeResult.success,
      message: 'moved_to_cart'
    };
  }

  // ------------------------------------------------------------
  // Appointment booking interfaces
  // ------------------------------------------------------------

  getAppointmentBookingConfig(source = 'standard', promotionId = null, doctorId = null, locationId = null) {
    const locations = this._getFromStorage('locations').filter((l) => l.is_active);
    const visit_types = [
      {
        value: 'comprehensive_exam',
        label: 'Comprehensive Eye Exam',
        description: 'Full eye health and vision evaluation.'
      },
      {
        value: 'contact_lens_fitting',
        label: 'Contact Lens Fitting',
        description: 'Fitting and training for contact lenses.'
      },
      {
        value: 'bundle_eligible_exam',
        label: 'Bundle-Eligible Exam',
        description: 'Exam type used with select promotions and bundles.'
      },
      {
        value: 'follow_up',
        label: 'Follow-Up Visit',
        description: 'Follow-up check after recent exam or treatment.'
      },
      {
        value: 'other',
        label: 'Other Visit Type',
        description: 'Other eye care needs.'
      }
    ];

    let promotion = null;
    if (promotionId) {
      const promotions = this._getFromStorage('promotions');
      promotion = promotions.find((p) => p.id === promotionId) || null;
    }

    let preselected_location_id = locationId || null;
    let preselected_doctor_id = doctorId || null;
    let preselected_visit_type = null;

    if (promotion && promotion.required_exam_type) {
      preselected_visit_type = promotion.required_exam_type;
    }

    if (doctorId && !preselected_location_id) {
      const doctors = this._getFromStorage('doctors');
      const doc = doctors.find((d) => d.id === doctorId) || null;
      if (doc && doc.primary_location_id) {
        preselected_location_id = doc.primary_location_id;
      }
    }

    return {
      locations,
      visit_types,
      preselected_location_id,
      preselected_doctor_id,
      preselected_visit_type,
      promotion
    };
  }

  listAvailableAppointmentSlots(
    locationId = null,
    doctorId = null,
    visit_type,
    date = null,
    date_range = null,
    time_range_start = null,
    time_range_end = null,
    limit = null
  ) {
    let slots = this._getFromStorage('available_appointment_slots');
    const locations = this._getFromStorage('locations');
    const doctors = this._getFromStorage('doctors');

    // Augment available slots with exam-type appointments when explicit
    // slots are not present in the seed data. This makes it possible to
    // find comprehensive and bundle-eligible exam times based on existing
    // appointments (used as templates).
    const appointments = this._getFromStorage('appointments');
    let slotsAugmented = false;
    for (const appt of appointments) {
      if (!appt.slot_id) continue;
      if (appt.visit_type !== visit_type) continue;
      const existing = slots.find((s) => s.id === appt.slot_id);
      if (existing) continue;
      const start = new Date(appt.appointment_datetime);
      if (isNaN(start.getTime())) continue;
      const end = new Date(start.getTime() + 30 * 60 * 1000);
      slots.push({
        id: appt.slot_id,
        location_id: appt.location_id,
        doctor_id: appt.doctor_id,
        visit_types: [appt.visit_type],
        start_datetime: start.toISOString(),
        end_datetime: end.toISOString(),
        is_active: true,
        is_booked: false
      });
      slotsAugmented = true;
    }
    if (slotsAugmented) {
      this._saveToStorage('available_appointment_slots', slots);
    }

    // Base filters
    slots = slots.filter((s) => s.is_active && !s.is_booked);

    // Visit type must be supported
    slots = slots.filter((s) => Array.isArray(s.visit_types) && s.visit_types.includes(visit_type));

    if (locationId) {
      slots = slots.filter((s) => s.location_id === locationId);
    }

    if (doctorId) {
      slots = slots.filter((s) => s.doctor_id === doctorId);
    }

    // Date filtering
    if (date) {
      const targetDate = this._parseDate(date);
      if (targetDate) {
        const targetStr = this._formatDateISO(targetDate);
        slots = slots.filter((s) => {
          const d = new Date(s.start_datetime);
          const ds = this._formatDateISO(new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())));
          // Treat the provided date as the earliest acceptable date so that
          // flows like "next Wednesday" can still find real sample data.
          return ds >= targetStr;
        });
      }
    } else if (date_range && date_range.start_date && date_range.end_date) {
      const startDate = this._parseDate(date_range.start_date);
      const endDate = this._parseDate(date_range.end_date);
      if (startDate && endDate) {
        const startMs = startDate.getTime();
        const endMs = endDate.getTime();
        slots = slots.filter((s) => {
          const d = new Date(s.start_datetime);
          const d0 = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
          const ms = d0.getTime();
          return ms >= startMs && ms <= endMs;
        });
      }
    }

    // Time range filtering
    if (time_range_start || time_range_end) {
      slots = slots.filter((s) => {
        const t = this._timeFromISO(s.start_datetime);
        if (time_range_start && this._compareTimeStrings(t, time_range_start) < 0) return false;
        if (time_range_end && this._compareTimeStrings(t, time_range_end) > 0) return false;
        return true;
      });
    }

    // Sort by start time
    slots.sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime));

    if (typeof limit === 'number' && limit >= 0) {
      slots = slots.slice(0, limit);
    }

    // Compute earliest_available_date
    let earliest_available_date = null;
    if (slots.length) {
      const first = new Date(slots[0].start_datetime);
      const d0 = new Date(Date.UTC(first.getFullYear(), first.getMonth(), first.getDate()));
      earliest_available_date = this._formatDateISO(d0);
    }

    const slotsWithRefs = slots.map((slot) => {
      const location = locations.find((l) => l.id === slot.location_id) || null;
      const doctor = doctors.find((d) => d.id === slot.doctor_id) || null;
      const enrichedSlot = {
        ...slot,
        location,
        doctor
      };
      return {
        slot: enrichedSlot,
        location_name: location ? location.name : null,
        doctor_name: doctor ? doctor.full_name : null
      };
    });

    return {
      slots: slotsWithRefs,
      earliest_available_date
    };
  }

  bookAppointment(
    locationId,
    doctorId,
    visit_type,
    slotId = null,
    appointment_datetime = null,
    source = 'standard',
    promotionId = null,
    patient_full_name,
    patient_phone,
    patient_email,
    notes = ''
  ) {
    const locations = this._getFromStorage('locations');
    const location = locations.find((l) => l.id === locationId);
    if (!location) {
      return {
        success: false,
        appointment: null,
        message: 'location_not_found'
      };
    }

    let slot = null;
    if (slotId) {
      const slots = this._getFromStorage('available_appointment_slots');
      slot = slots.find((s) => s.id === slotId) || null;
      if (!slot) {
        return {
          success: false,
          appointment: null,
          message: 'slot_not_found'
        };
      }
      // Override location/doctor with slot data to respect hierarchy
      locationId = slot.location_id;
      doctorId = slot.doctor_id || doctorId || null;
    }

    let result;
    if (slot) {
      result = this._reserveAppointmentSlot({
        slot,
        locationId,
        doctorId,
        visit_type,
        source,
        promotionId,
        patient_full_name,
        patient_phone,
        patient_email,
        notes
      });
      if (!result.success) {
        return {
          success: false,
          appointment: null,
          message: result.error || 'failed_to_book_slot'
        };
      }
    } else {
      // No discrete slot, create appointment directly
      const appointments = this._getFromStorage('appointments');
      const appt = {
        id: this._generateId('appt'),
        location_id: locationId,
        doctor_id: doctorId || null,
        visit_type,
        source,
        promotion_id: promotionId || null,
        slot_id: null,
        appointment_datetime:
          appointment_datetime || new Date().toISOString(),
        status: 'pending',
        patient_full_name,
        patient_phone,
        patient_email,
        notes: notes || '',
        created_at: this._now()
      };
      appointments.push(appt);
      this._saveToStorage('appointments', appointments);

      const locs = this._getFromStorage('locations');
      const docs = this._getFromStorage('doctors');
      const promos = this._getFromStorage('promotions');
      const locationObj = locs.find((l) => l.id === appt.location_id) || null;
      const doctorObj = docs.find((d) => d.id === appt.doctor_id) || null;
      const promotionObj = promos.find((p) => p.id === appt.promotion_id) || null;

      const appointmentWithRefs = {
        ...appt,
        location: locationObj,
        doctor: doctorObj,
        promotion: promotionObj,
        slot: null
      };

      result = { success: true, appointment: appointmentWithRefs };
    }

    return {
      success: true,
      appointment: result.appointment,
      message: 'appointment_booked_pending_confirmation'
    };
  }

  // ------------------------------------------------------------
  // Promotions interfaces
  // ------------------------------------------------------------

  listPromotions(filters = {}) {
    let promotions = this._getFromStorage('promotions');

    if (filters.promotion_type) {
      promotions = promotions.filter((p) => p.promotion_type === filters.promotion_type);
    }

    if (filters.is_exam_plus_glasses_bundle_only) {
      promotions = promotions.filter((p) => p.is_exam_plus_glasses_bundle);
    }

    if (filters.active_only !== false) {
      promotions = promotions.filter((p) => p.is_active);
    }

    const locations = this._getFromStorage('locations');

    // Attach applicable_locations for hierarchical relation
    const result = promotions.map((p) => {
      const applicable_locations = Array.isArray(p.applicable_location_ids)
        ? p.applicable_location_ids
            .map((id) => locations.find((l) => l.id === id) || null)
            .filter(Boolean)
        : [];
      return { ...p, applicable_locations };
    });

    return result;
  }

  getPromotionDetails(promotionId) {
    const promotions = this._getFromStorage('promotions');
    const locations = this._getFromStorage('locations');
    const promo = promotions.find((p) => p.id === promotionId) || null;
    if (!promo) return null;

    const applicable_locations = Array.isArray(promo.applicable_location_ids)
      ? promo.applicable_location_ids
          .map((id) => locations.find((l) => l.id === id) || null)
          .filter(Boolean)
      : [];

    return { ...promo, applicable_locations };
  }

  // ------------------------------------------------------------
  // Doctors interfaces
  // ------------------------------------------------------------

  listDoctors(filters = {}) {
    const locations = this._getFromStorage('locations');
    let doctors = this._getFromStorage('doctors');

    if (filters.is_active !== undefined) {
      doctors = doctors.filter((d) => d.is_active === filters.is_active);
    }

    if (filters.accepts_contact_lens_patients !== undefined) {
      doctors = doctors.filter(
        (d) => d.accepts_contact_lens_patients === filters.accepts_contact_lens_patients
      );
    }

    if (filters.specialty_contains) {
      const needle = filters.specialty_contains.trim().toLowerCase();
      doctors = doctors.filter((d) => {
        if (!Array.isArray(d.specialties)) return false;
        return d.specialties.some((s) => (s || '').toLowerCase().includes(needle));
      });
    }

    if (filters.locationId) {
      const locId = filters.locationId;
      doctors = doctors.filter((d) => {
        if (d.primary_location_id === locId) return true;
        if (Array.isArray(d.location_ids)) {
          return d.location_ids.includes(locId);
        }
        return false;
      });
    }

    const total = doctors.length;

    const resultDoctors = doctors.map((doctor) => {
      const primary_location = locations.find((l) => l.id === doctor.primary_location_id) || null;
      const locIds = Array.isArray(doctor.location_ids) ? doctor.location_ids : [];
      const additional_locations = locIds
        .map((id) => locations.find((l) => l.id === id) || null)
        .filter((l) => l && (!primary_location || l.id !== primary_location.id));

      const doctorWithRefs = {
        ...doctor,
        primary_location,
        locations: primary_location
          ? [primary_location, ...additional_locations]
          : additional_locations
      };

      return {
        doctor: doctorWithRefs,
        primary_location_name: primary_location ? primary_location.name : null
      };
    });

    return {
      doctors: resultDoctors,
      total
    };
  }

  getDoctorProfile(doctorId) {
    const doctors = this._getFromStorage('doctors');
    const locations = this._getFromStorage('locations');

    const doctor = doctors.find((d) => d.id === doctorId) || null;
    if (!doctor) {
      return {
        doctor: null,
        primary_location: null,
        additional_locations: []
      };
    }

    const primary_location = locations.find((l) => l.id === doctor.primary_location_id) || null;
    const locIds = Array.isArray(doctor.location_ids) ? doctor.location_ids : [];
    const additional_locations = locIds
      .map((id) => locations.find((l) => l.id === id) || null)
      .filter((l) => l && (!primary_location || l.id !== primary_location.id));

    const doctorWithRefs = {
      ...doctor,
      primary_location,
      locations: primary_location
        ? [primary_location, ...additional_locations]
        : additional_locations
    };

    return {
      doctor: doctorWithRefs,
      primary_location,
      additional_locations
    };
  }

  // ------------------------------------------------------------
  // Locations interfaces
  // ------------------------------------------------------------

  listLocations() {
    const locations = this._getFromStorage('locations');
    const hours = this._getFromStorage('location_hours');

    const dayNames = [
      'sunday',
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday'
    ];
    const todayIndex = new Date().getDay();
    const todayName = dayNames[todayIndex];

    const results = locations.map((location) => {
      const todaysHours = hours.find(
        (h) => h.location_id === location.id && h.day_of_week === todayName
      );
      const today_hours = todaysHours
        ? {
            open_time: todaysHours.open_time || null,
            close_time: todaysHours.close_time || null,
            is_closed: todaysHours.is_closed
          }
        : { open_time: null, close_time: null, is_closed: true };

      const weekendHours = hours.filter(
        (h) =>
          h.location_id === location.id &&
          (h.day_of_week === 'saturday' || h.day_of_week === 'sunday')
      );
      const has_weekend_hours = weekendHours.some((h) => !h.is_closed);

      return {
        location,
        today_hours,
        has_weekend_hours
      };
    });

    return {
      locations: results
    };
  }

  getLocationDetails(locationId) {
    const locations = this._getFromStorage('locations');
    const hoursAll = this._getFromStorage('location_hours');
    const doctorsAll = this._getFromStorage('doctors');

    const location = locations.find((l) => l.id === locationId) || null;
    if (!location) {
      return {
        location: null,
        hours: [],
        services: [],
        primary_doctors: []
      };
    }

    const hours = hoursAll
      .filter((h) => h.location_id === location.id)
      .map((h) => ({ ...h, location }));

    const primary_doctors = doctorsAll
      .filter((d) => d.primary_location_id === location.id)
      .map((d) => ({
        ...d,
        primary_location: location
      }));

    const services = [
      'comprehensive eye exams',
      'contact lens fittings',
      'eyewear pickup'
    ];

    return {
      location,
      hours,
      services,
      primary_doctors
    };
  }

  // ------------------------------------------------------------
  // Contact interfaces
  // ------------------------------------------------------------

  getContactPageInfo() {
    const locations = this._getFromStorage('locations');

    const topics = [
      { value: 'store_hours', label: 'Store hours' },
      { value: 'insurance', label: 'Insurance & billing' },
      { value: 'appointments', label: 'Appointments' },
      { value: 'glasses_and_products', label: 'Glasses & products' },
      { value: 'billing', label: 'Billing questions' },
      { value: 'other', label: 'Other' }
    ];

    const phone_numbers = locations.map((loc) => ({
      location_name: loc.name,
      phone_number: loc.phone_number
    }));

    return {
      topics,
      default_email: 'info@example-eyecare.local',
      phone_numbers
    };
  }

  submitContactMessage(
    name,
    email,
    subject,
    topic = null,
    message_body,
    related_location_id = null
  ) {
    const messages = this._getFromStorage('contact_messages');
    const locations = this._getFromStorage('locations');

    const message = {
      id: this._generateId('contact'),
      name,
      email,
      subject,
      topic: topic || null,
      message_body,
      related_location_id: related_location_id || null,
      created_at: this._now()
    };

    messages.push(message);
    this._saveToStorage('contact_messages', messages);

    const related_location = message.related_location_id
      ? locations.find((l) => l.id === message.related_location_id) || null
      : null;

    const messageWithRef = {
      ...message,
      related_location
    };

    return {
      success: true,
      contact_message: messageWithRef,
      message: 'message_submitted'
    };
  }

  // ------------------------------------------------------------
  // Insurance interfaces
  // ------------------------------------------------------------

  getInsuranceOverview() {
    const plans = this._getFromStorage('insurance_plans');
    const accepted_plans = plans.filter((p) => p.is_accepted);
    const payment_overview_text =
      'We accept many vision insurance plans and also offer self-pay options, FSA/HSA payments, and major credit cards.';
    return {
      accepted_plans,
      payment_overview_text
    };
  }

  submitInsuranceBenefitsRequest(
    insurance_provider_name,
    is_plan_listed_answer,
    full_name,
    phone_number,
    email,
    insurance_plan_id = null
  ) {
    const requests = this._getFromStorage('insurance_benefits_requests');

    let matchedPlan = null;
    if (insurance_plan_id) {
      const plans = this._getFromStorage('insurance_plans');
      matchedPlan = plans.find((p) => p.id === insurance_plan_id) || null;
    }

    if (!matchedPlan) {
      matchedPlan = this._matchInsurancePlanByName(insurance_provider_name);
    }

    const request = {
      id: this._generateId('ins_req'),
      insurance_provider_name,
      is_plan_listed_answer,
      full_name,
      phone_number,
      email,
      status: 'submitted',
      created_at: this._now(),
      insurance_plan_id: matchedPlan ? matchedPlan.id : null
    };

    requests.push(request);
    this._saveToStorage('insurance_benefits_requests', requests);

    const requestWithPlan = {
      ...request,
      insurance_plan: matchedPlan || null
    };

    return {
      success: true,
      request: requestWithPlan,
      message: 'insurance_benefits_request_submitted'
    };
  }

  // ------------------------------------------------------------
  // Newsletter interfaces
  // ------------------------------------------------------------

  getNewsletterPreferencesOptions() {
    const interests = [
      {
        value: 'eye_health_tips',
        label: 'Eye health tips',
        description: 'Articles and advice to keep your eyes healthy.'
      },
      {
        value: 'new_frame_arrivals',
        label: 'New frame arrivals',
        description: 'Be first to know when new frames hit our shelves.'
      },
      {
        value: 'special_offers',
        label: 'Special offers',
        description: 'Occasional promotions and savings on exams and eyewear.'
      }
    ];

    const frequencies = [
      { value: 'weekly', label: 'Weekly' },
      { value: 'monthly', label: 'Monthly' },
      { value: 'quarterly', label: 'Quarterly' }
    ];

    return {
      interests,
      frequencies
    };
  }

  subscribeToNewsletter(name, email, interests, frequency = null) {
    if (!Array.isArray(interests) || !interests.length) {
      return {
        success: false,
        subscription: null,
        message: 'at_least_one_interest_required'
      };
    }

    const subs = this._getFromStorage('newsletter_subscriptions');
    const subscription = {
      id: this._generateId('nl_sub'),
      name,
      email,
      interests,
      frequency: frequency || null,
      created_at: this._now(),
      is_active: true
    };

    subs.push(subscription);
    this._saveToStorage('newsletter_subscriptions', subs);

    return {
      success: true,
      subscription,
      message: 'subscribed_to_newsletter'
    };
  }

  // ------------------------------------------------------------
  // About page interface
  // ------------------------------------------------------------

  getAboutPageContent() {
    return {
      heading: 'About Our Eye Care Practice',
      body:
        'We are a locally owned optometry practice and eyewear boutique dedicated to providing friendly, thorough care for the whole family. From your first eye exam to selecting the perfect pair of glasses, our team is here to help you see and look your best.',
      mission:
        'To deliver personalized, high-quality eye care and thoughtfully curated eyewear that fits each patient\'s life, style, and budget.',
      values: [
        'Patient-first care',
        'Clinical excellence',
        'Honest recommendations',
        'Friendly, neighborhood service'
      ],
      services_summary: [
        {
          title: 'Comprehensive Eye Exams',
          description:
            'Routine and medical eye exams for adults and children, including digital retinal imaging when appropriate.'
        },
        {
          title: 'Contact Lens Services',
          description:
            'Fittings for soft, toric, multifocal, and specialty lenses, plus training for new wearers.'
        },
        {
          title: 'Eyeglasses & Sunglasses',
          description:
            'A curated selection of men\'s, women\'s, and kids\' frames, with lens options for work, school, and play.'
        }
      ],
      differentiators: [
        {
          title: 'Locally Owned & Operated',
          description:
            'We live in the community we serve and take time to get to know our patients.'
        },
        {
          title: 'Modern Technology',
          description:
            'Our exams use up-to-date diagnostic equipment for more comfortable, precise visits.'
        },
        {
          title: 'Thoughtful Frame Styling',
          description:
            'Our opticians help you choose frames that fit your prescription, face shape, and personal style.'
        }
      ]
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
