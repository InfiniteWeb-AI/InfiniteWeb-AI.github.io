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
  }

  // ------------------------
  // Storage helpers / init
  // ------------------------
  _initStorage() {
    // Core entity tables
    const arrayTables = [
      'users',
      'categories',
      'products',
      'services',
      'product_service_links',
      'carts',
      'cart_items',
      'wishlists',
      'wishlist_items',
      'compare_lists',
      'compare_items',
      'promotion_codes',
      'shipping_methods',
      'checkout_sessions',
      // CMS / misc
      'faq_list',
      'contact_tickets',
      'available_payment_methods'
    ];

    const objectTables = [
      'about_us_content',
      'contact_info',
      'shipping_and_delivery_info',
      'returns_and_warranty_info',
      'privacy_policy_content',
      'terms_and_conditions_content'
    ];

    arrayTables.forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    });

    objectTables.forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify({}));
      }
    });

    // ID counter
    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }

    // Seed default shipping methods if none exist (structure only; not mocking products)
    const shippingMethods = this._getFromStorage('shipping_methods', []);
    if (!shippingMethods || shippingMethods.length === 0) {
      const seeded = [
        {
          id: 'ship_standard',
          code: 'standard_shipping',
          name: 'Standard Shipping',
          description: 'Standard ground shipping',
          base_cost: 25,
          estimated_min_days: 5,
          estimated_max_days: 7,
          is_default: true
        },
        {
          id: 'ship_express',
          code: 'express_shipping',
          name: 'Express Shipping',
          description: 'Faster delivery',
          base_cost: 50,
          estimated_min_days: 2,
          estimated_max_days: 3,
          is_default: false
        },
        {
          id: 'ship_next_day',
          code: 'next_day_shipping',
          name: 'Next Day Shipping',
          description: 'Next business day delivery',
          base_cost: 80,
          estimated_min_days: 1,
          estimated_max_days: 1,
          is_default: false
        },
        {
          id: 'ship_pickup',
          code: 'pickup',
          name: 'Store Pickup',
          description: 'Pick up in store',
          base_cost: 0,
          estimated_min_days: 1,
          estimated_max_days: 3,
          is_default: false
        }
      ];
      this._saveToStorage('shipping_methods', seeded);
    }

    // Seed payment methods if none exist
    const paymentMethods = this._getFromStorage('available_payment_methods', []);
    if (!paymentMethods || paymentMethods.length === 0) {
      const seededPayments = [
        { code: 'credit_card', name: 'Credit Card', description: 'Pay with major credit cards', is_default: true },
        { code: 'paypal', name: 'PayPal', description: 'Pay using PayPal account', is_default: false },
        { code: 'bank_transfer', name: 'Bank Transfer', description: 'Direct bank transfer', is_default: false },
        { code: 'cash_on_delivery', name: 'Cash on Delivery', description: 'Pay on delivery', is_default: false },
        { code: 'gift_card', name: 'Gift Card', description: 'Redeem gift card', is_default: false }
      ];
      this._saveToStorage('available_payment_methods', seededPayments);
    }

    // Seed shipping & delivery page structure if missing
    const shippingInfo = this._getSingletonFromStorage('shipping_and_delivery_info', null);
    if (!shippingInfo || Object.keys(shippingInfo).length === 0) {
      const sm = this._getFromStorage('shipping_methods', []);
      const info = {
        body_html: '',
        shipping_methods: sm.map((m) => ({
          code: m.code,
          name: m.name,
          description: m.description,
          base_cost: m.base_cost,
          estimated_min_days: m.estimated_min_days,
          estimated_max_days: m.estimated_max_days,
          free_shipping_threshold: 0
        })),
        regional_limitations_html: ''
      };
      this._saveToStorage('shipping_and_delivery_info', info);
    }

    // Seed returns & warranty structure if missing
    const returnsInfo = this._getSingletonFromStorage('returns_and_warranty_info', null);
    if (!returnsInfo || Object.keys(returnsInfo).length === 0) {
      const info = {
        body_html: '',
        return_window_days: 30,
        warranty_overview_html: ''
      };
      this._saveToStorage('returns_and_warranty_info', info);
    }

    // Seed privacy & terms skeleton if missing
    const privacy = this._getSingletonFromStorage('privacy_policy_content', null);
    if (!privacy || Object.keys(privacy).length === 0) {
      this._saveToStorage('privacy_policy_content', {
        title: 'Privacy Policy',
        body_html: '',
        last_updated: ''
      });
    }
    const terms = this._getSingletonFromStorage('terms_and_conditions_content', null);
    if (!terms || Object.keys(terms).length === 0) {
      this._saveToStorage('terms_and_conditions_content', {
        title: 'Terms & Conditions',
        body_html: '',
        last_updated: ''
      });
    }
  }

  _getFromStorage(key, defaultValue) {
    const data = localStorage.getItem(key);
    if (!data) return defaultValue !== undefined ? defaultValue : [];
    try {
      return JSON.parse(data);
    } catch (e) {
      return defaultValue !== undefined ? defaultValue : [];
    }
  }

  _getSingletonFromStorage(key, defaultValue) {
    const data = localStorage.getItem(key);
    if (!data) return defaultValue !== undefined ? defaultValue : {};
    try {
      return JSON.parse(data);
    } catch (e) {
      return defaultValue !== undefined ? defaultValue : {};
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

  // ------------------------
  // Private helpers for domain
  // ------------------------

  _getOrCreateCart() {
    let carts = this._getFromStorage('carts', []);
    let cart = carts[0] || null;
    if (!cart) {
      cart = {
        id: this._generateId('cart'),
        items: [],
        subtotal: 0,
        discount_total: 0,
        shipping_estimate: 0,
        total: 0,
        applied_promo_code: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      carts.push(cart);
      this._saveToStorage('carts', carts);
    }
    return cart;
  }

  _getOrCreateWishlist() {
    let wishlists = this._getFromStorage('wishlists', []);
    let wishlist = wishlists[0] || null;
    if (!wishlist) {
      wishlist = {
        id: this._generateId('wishlist'),
        name: 'Default Wishlist',
        items: [],
        created_at: new Date().toISOString()
      };
      wishlists.push(wishlist);
      this._saveToStorage('wishlists', wishlists);
    }
    return wishlist;
  }

  _getOrCreateCompareList() {
    let compareLists = this._getFromStorage('compare_lists', []);
    let compareList = compareLists[0] || null;
    if (!compareList) {
      compareList = {
        id: this._generateId('compare'),
        name: 'Current Compare List',
        items: [],
        created_at: new Date().toISOString()
      };
      compareLists.push(compareList);
      this._saveToStorage('compare_lists', compareLists);
    }
    return compareList;
  }

  _getOrCreateCheckoutSession() {
    const cart = this._getOrCreateCart();
    let sessions = this._getFromStorage('checkout_sessions', []);
    let session = sessions.find(
      (s) => s.cart_id === cart.id && s.checkout_mode === 'guest' && s.status === 'in_progress'
    );
    if (!session) {
      session = {
        id: this._generateId('checkout'),
        cart_id: cart.id,
        checkout_mode: 'guest',
        shipping_full_name: '',
        shipping_address_line1: '',
        shipping_address_line2: '',
        shipping_city: '',
        shipping_state: '',
        shipping_postal_code: '',
        shipping_country: '',
        shipping_phone: '',
        shipping_method_code: null,
        payment_method: null,
        order_items_snapshot: [],
        shipping_cost: 0,
        discount_total: 0,
        total: 0,
        status: 'in_progress',
        created_at: new Date().toISOString()
      };
      sessions.push(session);
      this._saveToStorage('checkout_sessions', sessions);
    }
    return session;
  }

  _loadProductById(productId) {
    const products = this._getFromStorage('products', []);
    const categories = this._getFromStorage('categories', []);
    const product = products.find((p) => p.id === productId) || null;
    if (!product) return null;
    const category = categories.find((c) => c.code === product.category_code) || null;
    return {
      ...product,
      category_name: category ? category.name : null
    };
  }

  _calculateCartItemCount(cart, cartItems) {
    const itemsForCart = cartItems.filter((ci) => ci.cart_id === cart.id);
    return itemsForCart.reduce((sum, ci) => sum + (ci.quantity || 0), 0);
  }

  _findApplicablePromotion(code, cart, cartItems, products, promotions) {
    if (!code) return null;
    const trimmed = String(code).trim();
    if (!trimmed) return null;
    const promo = promotions.find(
      (p) => p.code && String(p.code).toLowerCase() === trimmed.toLowerCase()
    );
    if (!promo || promo.is_active === false) return null;

    // Date window checks
    const nowMs = Date.now();
    if (promo.start_date) {
      const start = new Date(promo.start_date).getTime();
      if (!isNaN(start) && nowMs < start) return null;
    }
    if (promo.end_date) {
      const end = new Date(promo.end_date).getTime();
      if (!isNaN(end) && nowMs > end) return null;
    }

    // Compute subtotal to check min_order_value and for eligible items
    const itemsForCart = cartItems.filter((ci) => ci.cart_id === cart.id);

    const hasProductRestrictions = Array.isArray(promo.applicable_product_ids) &&
      promo.applicable_product_ids.length > 0;
    const hasCategoryRestrictions = Array.isArray(promo.applicable_category_codes) &&
      promo.applicable_category_codes.length > 0;

    let eligibleSubtotal = 0;
    itemsForCart.forEach((ci) => {
      if (ci.item_type === 'product' && ci.product_id) {
        const product = products.find((p) => p.id === ci.product_id);
        if (!product) return;
        let eligible = false;
        if (!hasProductRestrictions && !hasCategoryRestrictions) {
          eligible = true;
        } else if (hasProductRestrictions) {
          eligible = promo.applicable_product_ids.includes(product.id);
        } else if (hasCategoryRestrictions) {
          eligible = promo.applicable_category_codes.includes(product.category_code);
        }
        if (eligible) {
          eligibleSubtotal += (ci.unit_price || 0) * (ci.quantity || 0);
        }
      } else if (!hasProductRestrictions && !hasCategoryRestrictions) {
        // Services only eligible when no product/category restrictions
        eligibleSubtotal += (ci.unit_price || 0) * (ci.quantity || 0);
      }
    });

    const fullSubtotal = itemsForCart.reduce(
      (sum, ci) => sum + (ci.unit_price || 0) * (ci.quantity || 0),
      0
    );

    if (promo.min_order_value && fullSubtotal < promo.min_order_value) {
      return null;
    }

    if (eligibleSubtotal <= 0) return null;

    return {
      promo,
      eligibleSubtotal
    };
  }

  _calculateShippingEstimate(cart, cartItems, products, shippingMethods, selectedCode) {
    const itemsForCart = cartItems.filter((ci) => ci.cart_id === cart.id);
    if (itemsForCart.length === 0) return 0;

    const productItems = itemsForCart.filter((ci) => ci.item_type === 'product');
    if (productItems.length === 0) return 0;

    const allFree = productItems.every((ci) => {
      const product = products.find((p) => p.id === ci.product_id);
      return product && product.shipping_free === true;
    });
    if (allFree) return 0;

    let method = null;
    if (selectedCode) {
      method = shippingMethods.find((m) => m.code === selectedCode) || null;
    }
    if (!method) {
      method = shippingMethods.find((m) => m.is_default) ||
        shippingMethods.find((m) => m.code === 'standard_shipping') ||
        shippingMethods[0] || null;
    }
    return method ? method.base_cost || 0 : 0;
  }

  _recalculateCartTotals() {
    const carts = this._getFromStorage('carts', []);
    const cartItems = this._getFromStorage('cart_items', []);
    const products = this._getFromStorage('products', []);
    const shippingMethods = this._getFromStorage('shipping_methods', []);
    const promotions = this._getFromStorage('promotion_codes', []);

    carts.forEach((cart) => {
      const itemsForCart = cartItems.filter((ci) => ci.cart_id === cart.id);
      const subtotal = itemsForCart.reduce(
        (sum, ci) => sum + (ci.unit_price || 0) * (ci.quantity || 0),
        0
      );

      let discountTotal = 0;
      if (cart.applied_promo_code) {
        const result = this._findApplicablePromotion(
          cart.applied_promo_code,
          cart,
          cartItems,
          products,
          promotions
        );
        if (result) {
          const { promo, eligibleSubtotal } = result;
          if (promo.discount_type === 'percentage') {
            discountTotal = (eligibleSubtotal * (promo.discount_value || 0)) / 100;
          } else if (promo.discount_type === 'fixed_amount') {
            discountTotal = Math.min(promo.discount_value || 0, eligibleSubtotal);
          }
        } else {
          // Invalid or not applicable any more
          cart.applied_promo_code = null;
        }
      }

      const shippingEstimate = this._calculateShippingEstimate(
        cart,
        cartItems,
        products,
        shippingMethods,
        null
      );

      cart.subtotal = Number(subtotal.toFixed(2));
      cart.discount_total = Number(discountTotal.toFixed(2));
      cart.shipping_estimate = Number(shippingEstimate.toFixed(2));
      cart.total = Number(Math.max(0, subtotal - discountTotal + shippingEstimate).toFixed(2));
      cart.updated_at = new Date().toISOString();
    });

    this._saveToStorage('carts', carts);
  }

  _buildCartSummary(cart) {
    const cartItems = this._getFromStorage('cart_items', []);
    const itemCount = this._calculateCartItemCount(cart, cartItems);
    return {
      item_count: itemCount,
      subtotal: cart.subtotal || 0,
      discount_total: cart.discount_total || 0,
      shipping_estimate: cart.shipping_estimate || 0,
      total: cart.total || 0,
      applied_promo_code: cart.applied_promo_code || null
    };
  }

  // ------------------------
  // Interface implementations
  // ------------------------

  // getMainCategories()
  getMainCategories() {
    const categories = this._getFromStorage('categories', []);
    // Main categories: no parent_category_id
    return categories.filter((c) => !c.parent_category_id);
  }

  // getHomePageContent()
  getHomePageContent() {
    const categories = this._getFromStorage('categories', []);
    const products = this._getFromStorage('products', []);
    const promotions = this._getFromStorage('homepage_promotions', []);

    const activeProducts = products.filter((p) => p.status === 'active');

    // featured_categories: categories that have at least one product
    const categoryCounts = {};
    activeProducts.forEach((p) => {
      if (!categoryCounts[p.category_code]) categoryCounts[p.category_code] = 0;
      categoryCounts[p.category_code] += 1;
    });

    const featuredCategories = Object.keys(categoryCounts)
      .map((code) => {
        const cat = categories.find((c) => c.code === code);
        return cat
          ? {
              category_id: cat.id,
              category_code: cat.code,
              category_name: cat.name,
              description: cat.description || ''
            }
          : null;
      })
      .filter(Boolean)
      .slice(0, 6);

    // featured_products: simple heuristic: high rating / most efficient
    const featuredProducts = activeProducts
      .slice()
      .sort((a, b) => {
        const ar = a.average_rating || 0;
        const br = b.average_rating || 0;
        const ac = a.rating_count || 0;
        const bc = b.rating_count || 0;
        if (br !== ar) return br - ar;
        return bc - ac;
      })
      .slice(0, 12)
      .map((p) => {
        const cat = categories.find((c) => c.code === p.category_code);
        let tag = '';
        if (p.energy_rating_class === 'a_plus_plus' || p.energy_rating_class === 'most_efficient') {
          tag = 'most_efficient';
        } else if ((p.rating_count || 0) >= 50) {
          tag = 'bestseller';
        } else if (p.created_at) {
          const created = new Date(p.created_at).getTime();
          const now = Date.now();
          const days = (now - created) / (1000 * 60 * 60 * 24);
          if (!isNaN(days) && days <= 30) tag = 'new_arrival';
        }
        return {
          product_id: p.id,
          name: p.name,
          appliance_type: p.appliance_type,
          category_name: cat ? cat.name : null,
          price: p.price,
          original_price: p.original_price || null,
          currency: p.currency || 'usd',
          average_rating: p.average_rating || 0,
          rating_count: p.rating_count || 0,
          image_url: (p.image_urls && p.image_urls[0]) || null,
          energy_rating_class: p.energy_rating_class || 'unknown',
          tag
        };
      });

    // bestsellers_by_category
    const bestsellersByCategoryMap = {};
    activeProducts.forEach((p) => {
      const code = p.category_code;
      if (!bestsellersByCategoryMap[code]) bestsellersByCategoryMap[code] = [];
      bestsellersByCategoryMap[code].push(p);
    });

    const bestsellers_by_category = Object.keys(bestsellersByCategoryMap).map((code) => {
      const cat = categories.find((c) => c.code === code);
      const list = bestsellersByCategoryMap[code]
        .slice()
        .sort((a, b) => {
          const ac = a.rating_count || 0;
          const bc = b.rating_count || 0;
          if (bc !== ac) return bc - ac;
          const ar = a.average_rating || 0;
          const br = b.average_rating || 0;
          return br - ar;
        })
        .slice(0, 6)
        .map((p) => ({
          product_id: p.id,
          name: p.name,
          price: p.price,
          currency: p.currency || 'usd',
          average_rating: p.average_rating || 0,
          rating_count: p.rating_count || 0,
          image_url: (p.image_urls && p.image_urls[0]) || null
        }));
      return {
        category_code: code,
        category_name: cat ? cat.name : code,
        products: list
      };
    });

    return {
      featured_categories: featuredCategories,
      featured_products: featuredProducts,
      bestsellers_by_category,
      promotions
    };
  }

  // getProductFilterOptions(context)
  getProductFilterOptions(context) {
    const ctx = context || {};
    const products = this._getFromStorage('products', []);
    const filtered = products.filter((p) => {
      if (p.status && p.status !== 'active') return false;
      if (ctx.category_code && p.category_code !== ctx.category_code) return false;
      if (ctx.subcategory && p.subcategory !== ctx.subcategory) return false;
      if (ctx.appliance_type && p.appliance_type !== ctx.appliance_type) return false;
      if (ctx.q) {
        const q = String(ctx.q).toLowerCase();
        const text = [p.name, p.description, p.brand, p.subcategory, p.appliance_type]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!text.includes(q)) return false;
      }
      return true;
    });

    const numFieldRange = (field) => {
      let min = null;
      let max = null;
      filtered.forEach((p) => {
        const v = p[field];
        if (typeof v === 'number' && !isNaN(v)) {
          if (min === null || v < min) min = v;
          if (max === null || v > max) max = v;
        }
      });
      if (min === null || max === null) return { min: 0, max: 0, step: 1 };
      return { min, max, step: 1 };
    };

    const uniqueValues = (field) => {
      const set = new Set();
      filtered.forEach((p) => {
        const v = p[field];
        if (v !== undefined && v !== null) set.add(v);
      });
      return Array.from(set);
    };

    const collectFeatures = () => {
      const set = new Set();
      filtered.forEach((p) => {
        if (Array.isArray(p.features)) {
          p.features.forEach((f) => set.add(f));
        }
      });
      return Array.from(set);
    };

    const priceRange = numFieldRange('price');
    const ratingRange = numFieldRange('average_rating');
    const capacityLitersRange = numFieldRange('capacity_liters');
    const capacityGallonsRange = numFieldRange('capacity_gallons');
    const roomCoverageRange = numFieldRange('room_coverage_sq_ft');
    const widthRange = numFieldRange('width_in');
    const energyClasses = uniqueValues('energy_rating_class');
    const heaterTypes = uniqueValues('heater_type');
    const fuelTypes = uniqueValues('fuel_type');
    const colors = uniqueValues('color');
    const finishes = uniqueValues('finish');
    const features = collectFeatures();
    const burnerCounts = uniqueValues('burners_count').filter((v) => typeof v === 'number');
    const cookingZoneCounts = uniqueValues('cooking_zones_count').filter((v) => typeof v === 'number');
    const shippingHasFree = filtered.some((p) => p.shipping_free === true);

    const deliveryRangesMap = {};
    filtered.forEach((p) => {
      if (typeof p.delivery_max_days === 'number') {
        const label = 'Up to ' + p.delivery_max_days + ' days';
        if (!deliveryRangesMap[p.delivery_max_days]) {
          deliveryRangesMap[p.delivery_max_days] = { label, max_days: p.delivery_max_days };
        }
      }
    });
    const delivery_time_ranges = Object.values(deliveryRangesMap).sort(
      (a, b) => a.max_days - b.max_days
    );

    const warrantyYearsRange = numFieldRange('warranty_years');
    if (warrantyYearsRange.min === 0 && warrantyYearsRange.max === 0) {
      warrantyYearsRange.min = 0;
      warrantyYearsRange.max = 0;
    }

    return {
      price: priceRange,
      rating: ratingRange,
      capacity_liters: capacityLitersRange,
      capacity_gallons: capacityGallonsRange,
      room_coverage_sq_ft: roomCoverageRange,
      energy_rating_classes: energyClasses,
      heater_types: heaterTypes,
      fuel_types: fuelTypes,
      colors,
      finishes,
      features,
      burner_counts: burnerCounts,
      cooking_zone_counts: cookingZoneCounts,
      width_in: widthRange,
      shipping: { has_free_shipping_option: shippingHasFree },
      delivery_time_ranges,
      warranty_years: {
        min: warrantyYearsRange.min,
        max: warrantyYearsRange.max
      }
    };
  }

  // searchProducts(q, category_code, subcategory, appliance_type, page, page_size, sort_by, filters)
  searchProducts(
    q,
    category_code,
    subcategory,
    appliance_type,
    page,
    page_size,
    sort_by,
    filters
  ) {
    const products = this._getFromStorage('products', []);
    const categories = this._getFromStorage('categories', []);
    const wishlist = this._getOrCreateWishlist();
    const wishlistItems = this._getFromStorage('wishlist_items', []);
    const compareList = this._getOrCreateCompareList();
    const compareItems = this._getFromStorage('compare_items', []);

    const pageNum = page && page > 0 ? page : 1;
    const size = page_size && page_size > 0 ? page_size : 20;
    const f = filters || {};

    const qLower = q ? String(q).toLowerCase() : null;

    let result = products.filter((p) => p.status === 'active');

    if (qLower) {
      result = result.filter((p) => {
        const text = [p.name, p.description, p.brand, p.subcategory, p.appliance_type]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return text.includes(qLower);
      });
    }

    if (category_code) {
      result = result.filter((p) => p.category_code === category_code);
    }
    if (subcategory) {
      result = result.filter((p) => p.subcategory === subcategory);
    }
    if (appliance_type) {
      result = result.filter((p) => p.appliance_type === appliance_type);
    }

    // Apply filters
    result = result.filter((p) => {
      if (f.min_price !== undefined && p.price < f.min_price) return false;
      if (f.max_price !== undefined && p.price > f.max_price) return false;
      if (f.min_rating !== undefined && (p.average_rating || 0) < f.min_rating) return false;
      if (f.min_capacity_liters !== undefined && (p.capacity_liters || 0) < f.min_capacity_liters)
        return false;
      if (
        f.min_capacity_gallons !== undefined &&
        (p.capacity_gallons || 0) < f.min_capacity_gallons
      )
        return false;
      if (
        f.min_room_coverage_sq_ft !== undefined &&
        (p.room_coverage_sq_ft || 0) < f.min_room_coverage_sq_ft
      )
        return false;
      if (
        f.max_room_coverage_sq_ft !== undefined &&
        (p.room_coverage_sq_ft || 0) > f.max_room_coverage_sq_ft
      )
        return false;
      if (Array.isArray(f.energy_rating_classes) && f.energy_rating_classes.length) {
        if (!f.energy_rating_classes.includes(p.energy_rating_class)) return false;
      }
      if (
        f.min_energy_efficiency_score !== undefined &&
        (p.energy_efficiency_score || 0) < f.min_energy_efficiency_score
      )
        return false;
      if (Array.isArray(f.heater_types) && f.heater_types.length) {
        if (!f.heater_types.includes(p.heater_type)) return false;
      }
      if (Array.isArray(f.fuel_types) && f.fuel_types.length) {
        if (!f.fuel_types.includes(p.fuel_type)) return false;
      }
      if (f.min_burners_count !== undefined && (p.burners_count || 0) < f.min_burners_count)
        return false;
      if (
        f.min_cooking_zones_count !== undefined &&
        (p.cooking_zones_count || 0) < f.min_cooking_zones_count
      )
        return false;
      if (f.min_width_in !== undefined && (p.width_in || 0) < f.min_width_in) return false;
      if (f.max_width_in !== undefined && (p.width_in || 0) > f.max_width_in) return false;
      if (Array.isArray(f.colors) && f.colors.length) {
        if (!f.colors.includes(p.color)) return false;
      }
      if (Array.isArray(f.finishes) && f.finishes.length) {
        if (!f.finishes.includes(p.finish)) return false;
      }
      if (Array.isArray(f.required_features) && f.required_features.length) {
        const feat = Array.isArray(p.features) ? p.features : [];
        const allRequired = f.required_features.every((req) => feat.includes(req));
        if (!allRequired) return false;
      }
      if (Array.isArray(f.any_features) && f.any_features.length) {
        const feat = Array.isArray(p.features) ? p.features : [];
        const hasAny = f.any_features.some((req) => feat.includes(req));
        if (!hasAny) return false;
      }
      if (f.shipping_free_only) {
        if (!p.shipping_free) return false;
      }
      if (
        f.max_delivery_days !== undefined &&
        typeof p.delivery_max_days === 'number' &&
        p.delivery_max_days > f.max_delivery_days
      )
        return false;
      if (f.min_warranty_years !== undefined && (p.warranty_years || 0) < f.min_warranty_years)
        return false;
      if (f.min_rating_count !== undefined && (p.rating_count || 0) < f.min_rating_count)
        return false;
      return true;
    });

    // Sorting
    const sortBy = sort_by || 'price_low_to_high';
    const sorted = result.slice();
    if (sortBy === 'price_low_to_high') {
      sorted.sort((a, b) => (a.price || 0) - (b.price || 0));
    } else if (sortBy === 'price_high_to_low') {
      sorted.sort((a, b) => (b.price || 0) - (a.price || 0));
    } else if (sortBy === 'rating_high_to_low') {
      sorted.sort((a, b) => {
        const ar = a.average_rating || 0;
        const br = b.average_rating || 0;
        if (br !== ar) return br - ar;
        const ac = a.rating_count || 0;
        const bc = b.rating_count || 0;
        return bc - ac;
      });
    } else if (sortBy === 'energy_efficiency_high_to_low') {
      sorted.sort((a, b) => (b.energy_efficiency_score || 0) - (a.energy_efficiency_score || 0));
    } else if (sortBy === 'newest') {
      sorted.sort((a, b) => {
        const at = a.created_at ? new Date(a.created_at).getTime() : 0;
        const bt = b.created_at ? new Date(b.created_at).getTime() : 0;
        return bt - at;
      });
    } else if (sortBy === 'bestselling') {
      sorted.sort((a, b) => (b.rating_count || 0) - (a.rating_count || 0));
    }

    const totalResults = sorted.length;
    const totalPages = Math.ceil(totalResults / size) || 1;
    const start = (pageNum - 1) * size;
    const pageItems = sorted.slice(start, start + size);

    const wishlistProductIds = wishlistItems
      .filter((wi) => wi.wishlist_id === wishlist.id)
      .map((wi) => wi.product_id);
    const compareProductIds = compareItems
      .filter((ci) => ci.compare_list_id === compareList.id)
      .map((ci) => ci.product_id);

    const productsOut = pageItems.map((p) => {
      const cat = categories.find((c) => c.code === p.category_code);
      return {
        product_id: p.id,
        name: p.name,
        appliance_type: p.appliance_type,
        category_name: cat ? cat.name : null,
        subcategory: p.subcategory || null,
        brand: p.brand || null,
        price: p.price,
        original_price: p.original_price || null,
        currency: p.currency || 'usd',
        average_rating: p.average_rating || 0,
        rating_count: p.rating_count || 0,
        image_url: (p.image_urls && p.image_urls[0]) || null,
        capacity_liters: p.capacity_liters || null,
        capacity_gallons: p.capacity_gallons || null,
        room_coverage_sq_ft: p.room_coverage_sq_ft || null,
        fuel_type: p.fuel_type || null,
        width_in: p.width_in || null,
        burners_count: p.burners_count || null,
        cooking_zones_count: p.cooking_zones_count || null,
        energy_rating_class: p.energy_rating_class || 'unknown',
        energy_efficiency_score: p.energy_efficiency_score || null,
        shipping_free: p.shipping_free || false,
        delivery_min_days: p.delivery_min_days || null,
        delivery_max_days: p.delivery_max_days || null,
        warranty_years: p.warranty_years || null,
        is_in_wishlist: wishlistProductIds.includes(p.id),
        is_in_compare_list: compareProductIds.includes(p.id)
      };
    });

    return {
      products: productsOut,
      pagination: {
        page: pageNum,
        page_size: size,
        total_results: totalResults,
        total_pages: totalPages
      },
      applied_sort_by: sortBy,
      available_sort_options: [
        'price_low_to_high',
        'price_high_to_low',
        'rating_high_to_low',
        'energy_efficiency_high_to_low',
        'newest',
        'bestselling'
      ],
      breadcrumb: []
    };
  }

  // getProductDetails(productId)
  getProductDetails(productId) {
    const product = this._loadProductById(productId);
    if (!product) {
      return {
        product: null,
        shipping_summary: { has_free_shipping: false, estimated_min_days: null, estimated_max_days: null },
        is_in_wishlist: false,
        is_in_compare_list: false
      };
    }

    const wishlist = this._getOrCreateWishlist();
    const wishlistItems = this._getFromStorage('wishlist_items', []);
    const compareList = this._getOrCreateCompareList();
    const compareItems = this._getFromStorage('compare_items', []);

    const isInWishlist = wishlistItems.some(
      (wi) => wi.wishlist_id === wishlist.id && wi.product_id === product.id
    );
    const isInCompare = compareItems.some(
      (ci) => ci.compare_list_id === compareList.id && ci.product_id === product.id
    );

    const shipping_summary = {
      has_free_shipping: product.shipping_free === true,
      estimated_min_days:
        typeof product.delivery_min_days === 'number' ? product.delivery_min_days : null,
      estimated_max_days:
        typeof product.delivery_max_days === 'number' ? product.delivery_max_days : null
    };

    return {
      product,
      shipping_summary,
      is_in_wishlist: isInWishlist,
      is_in_compare_list: isInCompare
    };
  }

  // getInstallationServicesForProduct(productId)
  getInstallationServicesForProduct(productId) {
    const links = this._getFromStorage('product_service_links', []);
    const services = this._getFromStorage('services', []);
    const product = this._loadProductById(productId);

    const results = [];
    const linked = links.filter((l) => l.product_id === productId);
    const seenIds = new Set();

    // First, include any explicitly linked services
    linked.forEach((l) => {
      const svc = services.find((s) => s.id === l.service_id);
      if (!svc) return;
      if (seenIds.has(svc.id)) return;
      seenIds.add(svc.id);
      results.push({
        service_id: svc.id,
        name: svc.name,
        description: svc.description || '',
        service_type: svc.service_type,
        installation_level: svc.installation_level || 'none',
        price: svc.price,
        currency: svc.currency || 'usd',
        is_recommended: false,
        service: svc // foreign key resolution
      });
    });

    // Fallback: derive services based on applicable_category_codes
    if (product && product.category_code) {
      services.forEach((svc) => {
        if (svc.is_active === false) return;
        if (svc.service_type !== 'installation') return;
        if (
          Array.isArray(svc.applicable_category_codes) &&
          svc.applicable_category_codes.includes(product.category_code) &&
          !seenIds.has(svc.id)
        ) {
          seenIds.add(svc.id);
          results.push({
            service_id: svc.id,
            name: svc.name,
            description: svc.description || '',
            service_type: svc.service_type,
            installation_level: svc.installation_level || 'none',
            price: svc.price,
            currency: svc.currency || 'usd',
            is_recommended: false,
            service: svc
          });
        }
      });
    }

    return results;
  }

  // addServiceToCart(serviceId, associatedProductId)
  addServiceToCart(serviceId, associatedProductId) {
    const services = this._getFromStorage('services', []);
    const service = services.find((s) => s.id === serviceId);
    if (!service || !service.is_active) {
      return { success: false, message: 'Service not available', cart_summary: null };
    }

    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items', []);

    const existing = cartItems.find(
      (ci) =>
        ci.cart_id === cart.id &&
        ci.item_type === 'service' &&
        ci.service_id === service.id &&
        ci.associated_product_id === (associatedProductId || null)
    );

    if (existing) {
      existing.quantity += 1;
      existing.line_subtotal = existing.unit_price * existing.quantity;
    } else {
      const newItem = {
        id: this._generateId('cart_item'),
        cart_id: cart.id,
        item_type: 'service',
        product_id: null,
        service_id: service.id,
        associated_product_id: associatedProductId || null,
        name: service.name,
        unit_price: service.price,
        quantity: 1,
        line_subtotal: service.price
      };
      cartItems.push(newItem);
      cart.items = cart.items || [];
      cart.items.push(newItem.id);
    }

    this._saveToStorage('cart_items', cartItems);
    const carts = this._getFromStorage('carts', []);
    const idx = carts.findIndex((c) => c.id === cart.id);
    if (idx >= 0) {
      carts[idx] = cart;
      this._saveToStorage('carts', carts);
    }

    this._recalculateCartTotals();
    const updatedCarts = this._getFromStorage('carts', []);
    const updatedCart = updatedCarts.find((c) => c.id === cart.id) || cart;
    const summary = this._buildCartSummary(updatedCart);

    return {
      success: true,
      message: 'Service added to cart',
      cart_summary: summary
    };
  }

  // addProductToCart(productId, quantity)
  addProductToCart(productId, quantity) {
    const qty = quantity && quantity > 0 ? quantity : 1;
    const product = this._loadProductById(productId);
    if (!product || product.status !== 'active') {
      return { success: false, message: 'Product not available', cart_summary: null };
    }

    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items', []);

    const existing = cartItems.find(
      (ci) => ci.cart_id === cart.id && ci.item_type === 'product' && ci.product_id === product.id
    );

    if (existing) {
      existing.quantity += qty;
      existing.line_subtotal = existing.unit_price * existing.quantity;
    } else {
      const newItem = {
        id: this._generateId('cart_item'),
        cart_id: cart.id,
        item_type: 'product',
        product_id: product.id,
        service_id: null,
        associated_product_id: null,
        name: product.name,
        unit_price: product.price,
        quantity: qty,
        line_subtotal: product.price * qty
      };
      cartItems.push(newItem);
      cart.items = cart.items || [];
      cart.items.push(newItem.id);
    }

    this._saveToStorage('cart_items', cartItems);
    const carts = this._getFromStorage('carts', []);
    const idx = carts.findIndex((c) => c.id === cart.id);
    if (idx >= 0) {
      carts[idx] = cart;
      this._saveToStorage('carts', carts);
    }

    this._recalculateCartTotals();
    const updatedCarts = this._getFromStorage('carts', []);
    const updatedCart = updatedCarts.find((c) => c.id === cart.id) || cart;
    const summary = this._buildCartSummary(updatedCart);

    return {
      success: true,
      message: 'Product added to cart',
      cart_summary: summary
    };
  }

  // updateCartItemQuantityByProduct(productId, quantity)
  updateCartItemQuantityByProduct(productId, quantity) {
    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items', []);
    const item = cartItems.find(
      (ci) => ci.cart_id === cart.id && ci.item_type === 'product' && ci.product_id === productId
    );
    if (!item) {
      return { success: false, message: 'Item not found in cart', cart_summary: null };
    }

    const qty = quantity || 0;
    if (qty <= 0) {
      // Remove item and any associated services
      cartItems = cartItems.filter((ci) => {
        if (ci.id === item.id) return false;
        if (ci.associated_product_id === productId) return false;
        return true;
      });
      cart.items = (cart.items || []).filter((id) => id !== item.id);
    } else {
      item.quantity = qty;
      item.line_subtotal = item.unit_price * item.quantity;
    }

    this._saveToStorage('cart_items', cartItems);
    const carts = this._getFromStorage('carts', []);
    const idx = carts.findIndex((c) => c.id === cart.id);
    if (idx >= 0) {
      carts[idx] = cart;
      this._saveToStorage('carts', carts);
    }

    this._recalculateCartTotals();
    const updatedCarts = this._getFromStorage('carts', []);
    const updatedCart = updatedCarts.find((c) => c.id === cart.id) || cart;
    const summary = this._buildCartSummary(updatedCart);

    return {
      success: true,
      message: 'Cart updated',
      cart_summary: summary
    };
  }

  // removeProductFromCart(productId)
  removeProductFromCart(productId) {
    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items', []);

    const removedAny = cartItems.some(
      (ci) =>
        ci.cart_id === cart.id &&
        ((ci.item_type === 'product' && ci.product_id === productId) ||
          ci.associated_product_id === productId)
    );

    cartItems = cartItems.filter(
      (ci) =>
        !(
          ci.cart_id === cart.id &&
          ((ci.item_type === 'product' && ci.product_id === productId) ||
            ci.associated_product_id === productId)
        )
    );

    cart.items = (cart.items || []).filter((id) => {
      const stillExists = cartItems.some((ci) => ci.id === id && ci.cart_id === cart.id);
      return stillExists;
    });

    this._saveToStorage('cart_items', cartItems);
    const carts = this._getFromStorage('carts', []);
    const idx = carts.findIndex((c) => c.id === cart.id);
    if (idx >= 0) {
      carts[idx] = cart;
      this._saveToStorage('carts', carts);
    }

    this._recalculateCartTotals();
    const updatedCarts = this._getFromStorage('carts', []);
    const updatedCart = updatedCarts.find((c) => c.id === cart.id) || cart;
    const summary = this._buildCartSummary(updatedCart);

    return {
      success: removedAny,
      message: removedAny ? 'Product removed from cart' : 'Product not found in cart',
      cart_summary: summary
    };
  }

  // getCart()
  getCart() {
    this._recalculateCartTotals();
    const carts = this._getFromStorage('carts', []);
    const cart = carts[0];
    if (!cart) {
      return {
        items: [],
        summary: {
          item_count: 0,
          subtotal: 0,
          discount_total: 0,
          shipping_estimate: 0,
          total: 0,
          applied_promo_code: null
        }
      };
    }

    const cartItems = this._getFromStorage('cart_items', []);
    const products = this._getFromStorage('products', []);
    const services = this._getFromStorage('services', []);

    const itemsForCart = cartItems.filter((ci) => ci.cart_id === cart.id);

    const itemsOut = itemsForCart.map((ci) => {
      const product = ci.product_id
        ? products.find((p) => p.id === ci.product_id) || null
        : null;
      const service = ci.service_id ? services.find((s) => s.id === ci.service_id) || null : null;
      const associatedProduct = ci.associated_product_id
        ? products.find((p) => p.id === ci.associated_product_id) || null
        : null;

      const description =
        (product && product.description) || (service && service.description) || '';

      return {
        item_id: ci.id,
        item_type: ci.item_type,
        product_id: ci.product_id,
        service_id: ci.service_id,
        associated_product_id: ci.associated_product_id,
        name: ci.name,
        description,
        thumbnail_url: product && product.image_urls ? product.image_urls[0] || null : null,
        unit_price: ci.unit_price,
        quantity: ci.quantity,
        line_subtotal: ci.line_subtotal,
        is_installation_service: service ? service.service_type === 'installation' : false,
        associated_product_name: associatedProduct ? associatedProduct.name : null,
        product,
        service,
        associated_product: associatedProduct
      };
    });

    const summary = this._buildCartSummary(cart);
    return { items: itemsOut, summary };
  }

  // applyPromotionCode(code)
  applyPromotionCode(code) {
    const trimmed = (code || '').trim();
    const carts = this._getFromStorage('carts', []);
    if (!carts.length) {
      return {
        success: false,
        message: 'Cart is empty',
        cart: {
          item_count: 0,
          subtotal: 0,
          discount_total: 0,
          shipping_estimate: 0,
          total: 0,
          applied_promo_code: null
        }
      };
    }
    const cart = carts[0];

    cart.applied_promo_code = trimmed || null;
    this._saveToStorage('carts', carts);

    // Recalculate with this code
    this._recalculateCartTotals();

    // Validate if truly applicable
    const updatedCarts = this._getFromStorage('carts', []);
    const updatedCart = updatedCarts[0];
    const cartItems = this._getFromStorage('cart_items', []);
    const products = this._getFromStorage('products', []);
    const promotions = this._getFromStorage('promotion_codes', []);

    const result = this._findApplicablePromotion(
      updatedCart.applied_promo_code,
      updatedCart,
      cartItems,
      products,
      promotions
    );

    let success = false;
    let message = '';
    if (updatedCart.applied_promo_code && result) {
      success = true;
      message = 'Promotion code applied';
    } else if (updatedCart.applied_promo_code) {
      // Clear invalid promo
      updatedCart.applied_promo_code = null;
      this._saveToStorage('carts', updatedCarts);
      this._recalculateCartTotals();
      message = 'Promotion code invalid or not applicable';
    } else {
      message = 'Promotion code cleared';
    }

    const finalCarts = this._getFromStorage('carts', []);
    const finalCart = finalCarts[0];
    const summary = this._buildCartSummary(finalCart);

    return {
      success,
      message,
      cart: summary
    };
  }

  // clearPromotionCode()
  clearPromotionCode() {
    const carts = this._getFromStorage('carts', []);
    if (!carts.length) {
      return {
        success: false,
        cart: {
          item_count: 0,
          subtotal: 0,
          discount_total: 0,
          shipping_estimate: 0,
          total: 0,
          applied_promo_code: null
        }
      };
    }
    const cart = carts[0];
    cart.applied_promo_code = null;
    this._saveToStorage('carts', carts);
    this._recalculateCartTotals();
    const updatedCarts = this._getFromStorage('carts', []);
    const updatedCart = updatedCarts[0];
    const summary = this._buildCartSummary(updatedCart);
    return {
      success: true,
      cart: summary
    };
  }

  // addProductToWishlist(productId)
  addProductToWishlist(productId) {
    const product = this._loadProductById(productId);
    if (!product) {
      return { success: false, message: 'Product not found', is_in_wishlist: false, wishlist_count: 0 };
    }

    const wishlist = this._getOrCreateWishlist();
    let wishlistItems = this._getFromStorage('wishlist_items', []);

    const existing = wishlistItems.find(
      (wi) => wi.wishlist_id === wishlist.id && wi.product_id === product.id
    );
    if (existing) {
      const count = wishlistItems.filter((wi) => wi.wishlist_id === wishlist.id).length;
      return {
        success: true,
        message: 'Product already in wishlist',
        is_in_wishlist: true,
        wishlist_count: count
      };
    }

    const newItem = {
      id: this._generateId('wishlist_item'),
      wishlist_id: wishlist.id,
      product_id: product.id,
      added_at: new Date().toISOString()
    };
    wishlistItems.push(newItem);
    wishlist.items = wishlist.items || [];
    wishlist.items.push(newItem.id);

    this._saveToStorage('wishlist_items', wishlistItems);
    const wishlists = this._getFromStorage('wishlists', []);
    const idx = wishlists.findIndex((w) => w.id === wishlist.id);
    if (idx >= 0) {
      wishlists[idx] = wishlist;
      this._saveToStorage('wishlists', wishlists);
    }

    const count = wishlistItems.filter((wi) => wi.wishlist_id === wishlist.id).length;
    return {
      success: true,
      message: 'Product added to wishlist',
      is_in_wishlist: true,
      wishlist_count: count
    };
  }

  // removeProductFromWishlist(productId)
  removeProductFromWishlist(productId) {
    const wishlist = this._getOrCreateWishlist();
    let wishlistItems = this._getFromStorage('wishlist_items', []);

    const existed = wishlistItems.some(
      (wi) => wi.wishlist_id === wishlist.id && wi.product_id === productId
    );

    wishlistItems = wishlistItems.filter(
      (wi) => !(wi.wishlist_id === wishlist.id && wi.product_id === productId)
    );
    wishlist.items = (wishlist.items || []).filter((id) =>
      wishlistItems.some((wi) => wi.id === id && wi.wishlist_id === wishlist.id)
    );

    this._saveToStorage('wishlist_items', wishlistItems);
    const wishlists = this._getFromStorage('wishlists', []);
    const idx = wishlists.findIndex((w) => w.id === wishlist.id);
    if (idx >= 0) {
      wishlists[idx] = wishlist;
      this._saveToStorage('wishlists', wishlists);
    }

    const count = wishlistItems.filter((wi) => wi.wishlist_id === wishlist.id).length;
    return {
      success: existed,
      message: existed ? 'Product removed from wishlist' : 'Product not found in wishlist',
      wishlist_count: count
    };
  }

  // getWishlistItems()
  getWishlistItems() {
    const wishlist = this._getOrCreateWishlist();
    const wishlistItems = this._getFromStorage('wishlist_items', []);
    const products = this._getFromStorage('products', []);
    const categories = this._getFromStorage('categories', []);

    const itemsForWishlist = wishlistItems.filter((wi) => wi.wishlist_id === wishlist.id);

    return itemsForWishlist.map((wi) => {
      const product = products.find((p) => p.id === wi.product_id) || null;
      const category = product
        ? categories.find((c) => c.code === product.category_code) || null
        : null;
      return {
        product_id: wi.product_id,
        name: product ? product.name : null,
        appliance_type: product ? product.appliance_type : null,
        category_name: category ? category.name : null,
        price: product ? product.price : null,
        currency: product ? product.currency || 'usd' : 'usd',
        average_rating: product ? product.average_rating || 0 : 0,
        rating_count: product ? product.rating_count || 0 : 0,
        image_url: product && product.image_urls ? product.image_urls[0] || null : null,
        added_at: wi.added_at,
        product // foreign key resolution
      };
    });
  }

  // moveWishlistItemToCart(productId, quantity, removeFromWishlist)
  moveWishlistItemToCart(productId, quantity, removeFromWishlist) {
    const qty = quantity && quantity > 0 ? quantity : 1;
    const removeFlag = removeFromWishlist !== false; // default true

    const addResult = this.addProductToCart(productId, qty);

    const wishlist = this._getOrCreateWishlist();
    let wishlistItems = this._getFromStorage('wishlist_items', []);

    if (removeFlag) {
      const existed = wishlistItems.some(
        (wi) => wi.wishlist_id === wishlist.id && wi.product_id === productId
      );
      if (existed) {
        wishlistItems = wishlistItems.filter(
          (wi) => !(wi.wishlist_id === wishlist.id && wi.product_id === productId)
        );
        wishlist.items = (wishlist.items || []).filter((id) =>
          wishlistItems.some((wi) => wi.id === id && wi.wishlist_id === wishlist.id)
        );
        this._saveToStorage('wishlist_items', wishlistItems);
        const wishlists = this._getFromStorage('wishlists', []);
        const idx = wishlists.findIndex((w) => w.id === wishlist.id);
        if (idx >= 0) {
          wishlists[idx] = wishlist;
          this._saveToStorage('wishlists', wishlists);
        }
      }
    }

    const wishlist_count = wishlistItems.filter((wi) => wi.wishlist_id === wishlist.id).length;

    return {
      success: addResult.success,
      message: addResult.message,
      cart_summary: addResult.cart_summary,
      wishlist_count
    };
  }

  // addProductToCompare(productId)
  addProductToCompare(productId) {
    const product = this._loadProductById(productId);
    if (!product) {
      return { success: false, message: 'Product not found', compare_count: 0, max_items_allowed: 4 };
    }

    const MAX_ITEMS = 4;
    const compareList = this._getOrCreateCompareList();
    let compareItems = this._getFromStorage('compare_items', []);

    const itemsForList = compareItems.filter((ci) => ci.compare_list_id === compareList.id);
    if (itemsForList.length >= MAX_ITEMS) {
      return {
        success: false,
        message: 'Compare list is full',
        compare_count: itemsForList.length,
        max_items_allowed: MAX_ITEMS
      };
    }

    const existing = itemsForList.find((ci) => ci.product_id === product.id);
    if (existing) {
      return {
        success: true,
        message: 'Product already in compare list',
        compare_count: itemsForList.length,
        max_items_allowed: MAX_ITEMS
      };
    }

    const newItem = {
      id: this._generateId('compare_item'),
      compare_list_id: compareList.id,
      product_id: product.id,
      added_at: new Date().toISOString()
    };
    compareItems.push(newItem);
    compareList.items = compareList.items || [];
    compareList.items.push(newItem.id);

    this._saveToStorage('compare_items', compareItems);
    const compareLists = this._getFromStorage('compare_lists', []);
    const idx = compareLists.findIndex((cl) => cl.id === compareList.id);
    if (idx >= 0) {
      compareLists[idx] = compareList;
      this._saveToStorage('compare_lists', compareLists);
    }

    const count = compareItems.filter((ci) => ci.compare_list_id === compareList.id).length;
    return {
      success: true,
      message: 'Product added to compare list',
      compare_count: count,
      max_items_allowed: MAX_ITEMS
    };
  }

  // removeProductFromCompare(productId)
  removeProductFromCompare(productId) {
    const compareList = this._getOrCreateCompareList();
    let compareItems = this._getFromStorage('compare_items', []);

    const existed = compareItems.some(
      (ci) => ci.compare_list_id === compareList.id && ci.product_id === productId
    );

    compareItems = compareItems.filter(
      (ci) => !(ci.compare_list_id === compareList.id && ci.product_id === productId)
    );
    compareList.items = (compareList.items || []).filter((id) =>
      compareItems.some((ci) => ci.id === id && ci.compare_list_id === compareList.id)
    );

    this._saveToStorage('compare_items', compareItems);
    const compareLists = this._getFromStorage('compare_lists', []);
    const idx = compareLists.findIndex((cl) => cl.id === compareList.id);
    if (idx >= 0) {
      compareLists[idx] = compareList;
      this._saveToStorage('compare_lists', compareLists);
    }

    const count = compareItems.filter((ci) => ci.compare_list_id === compareList.id).length;
    return {
      success: existed,
      message: existed ? 'Product removed from compare list' : 'Product not found in compare list',
      compare_count: count
    };
  }

  // getCompareView()
  getCompareView() {
    const compareList = this._getOrCreateCompareList();
    const compareItems = this._getFromStorage('compare_items', []);
    const products = this._getFromStorage('products', []);

    const itemsForList = compareItems.filter((ci) => ci.compare_list_id === compareList.id);

    const items = itemsForList
      .map((ci) => {
        const p = products.find((prod) => prod.id === ci.product_id);
        if (!p) return null;
        return {
          product_id: p.id,
          name: p.name,
          image_url: p.image_urls ? p.image_urls[0] || null : null,
          appliance_type: p.appliance_type,
          price: p.price,
          currency: p.currency || 'usd',
          average_rating: p.average_rating || 0,
          rating_count: p.rating_count || 0,
          warranty_years: p.warranty_years || 0,
          warranty_months: p.warranty_months || 0,
          width_in: p.width_in || null,
          height_in: p.height_in || null,
          depth_in: p.depth_in || null,
          capacity_liters: p.capacity_liters || null,
          capacity_gallons: p.capacity_gallons || null,
          energy_rating_class: p.energy_rating_class || 'unknown',
          energy_efficiency_score: p.energy_efficiency_score || null,
          burners_count: p.burners_count || null,
          cooking_zones_count: p.cooking_zones_count || null,
          features: Array.isArray(p.features) ? p.features : [],
          product: p // foreign key resolution
        };
      })
      .filter(Boolean);

    const attributes = [
      { attribute_key: 'price', label: 'Price' },
      { attribute_key: 'average_rating', label: 'Average Rating' },
      { attribute_key: 'rating_count', label: 'Rating Count' },
      { attribute_key: 'warranty_years', label: 'Warranty (Years)' },
      { attribute_key: 'warranty_months', label: 'Warranty (Months)' },
      { attribute_key: 'width_in', label: 'Width (in)' },
      { attribute_key: 'height_in', label: 'Height (in)' },
      { attribute_key: 'depth_in', label: 'Depth (in)' },
      { attribute_key: 'capacity_liters', label: 'Capacity (L)' },
      { attribute_key: 'capacity_gallons', label: 'Capacity (Gallons)' },
      { attribute_key: 'energy_rating_class', label: 'Energy Rating' },
      { attribute_key: 'energy_efficiency_score', label: 'Energy Efficiency Score' },
      { attribute_key: 'burners_count', label: 'Burners' },
      { attribute_key: 'cooking_zones_count', label: 'Cooking Zones' },
      { attribute_key: 'features', label: 'Features' }
    ];

    const comparison_attributes = attributes.map((attr) => {
      const key = attr.attribute_key;
      const values = items.map((item) => {
        const v = item[key];
        if (Array.isArray(v)) {
          return v.slice().sort().join('|');
        }
        return v;
      });
      const unique = Array.from(new Set(values.map((v) => String(v))));
      return {
        attribute_key: key,
        label: attr.label,
        is_different_across_products: unique.length > 1
      };
    });

    return {
      items,
      comparison_attributes,
      max_items_allowed: 4
    };
  }

  // startGuestCheckout()
  startGuestCheckout() {
    const cart = this._getOrCreateCart();
    this._recalculateCartTotals();
    const updatedCarts = this._getFromStorage('carts', []);
    const updatedCart = updatedCarts.find((c) => c.id === cart.id) || cart;
    const cartItems = this._getFromStorage('cart_items', []);

    const session = this._getOrCreateCheckoutSession();
    const shippingMethods = this._getFromStorage('shipping_methods', []);
    const paymentMethods = this._getFromStorage('available_payment_methods', []);

    const itemsForCart = cartItems.filter((ci) => ci.cart_id === updatedCart.id);

    const orderItems = itemsForCart.map((ci) => ({
      name: ci.name,
      is_service: ci.item_type === 'service',
      quantity: ci.quantity,
      unit_price: ci.unit_price,
      line_subtotal: ci.line_subtotal
    }));

    const defaultShippingCost = updatedCart.shipping_estimate || 0;

    const shipping_details = {
      full_name: session.shipping_full_name || '',
      address_line1: session.shipping_address_line1 || '',
      address_line2: session.shipping_address_line2 || '',
      city: session.shipping_city || '',
      state: session.shipping_state || '',
      postal_code: session.shipping_postal_code || '',
      country: session.shipping_country || '',
      phone: session.shipping_phone || ''
    };

    return {
      checkout_session_id: session.id,
      status: session.status,
      shipping_details,
      available_shipping_methods: shippingMethods,
      available_payment_methods: paymentMethods,
      order_summary: {
        items: orderItems,
        subtotal: updatedCart.subtotal || 0,
        discount_total: updatedCart.discount_total || 0,
        shipping_cost: defaultShippingCost,
        total: updatedCart.total || 0,
        applied_promo_code: updatedCart.applied_promo_code || null
      }
    };
  }

  // setGuestShippingDetails(shippingDetails)
  setGuestShippingDetails(shippingDetails) {
    const details = shippingDetails || {};
    const cart = this._getOrCreateCart();
    this._recalculateCartTotals();
    const carts = this._getFromStorage('carts', []);
    const updatedCart = carts.find((c) => c.id === cart.id) || cart;
    const cartItems = this._getFromStorage('cart_items', []);
    const products = this._getFromStorage('products', []);
    const shippingMethods = this._getFromStorage('shipping_methods', []);

    const sessions = this._getFromStorage('checkout_sessions', []);
    const session = this._getOrCreateCheckoutSession();

    session.shipping_full_name = details.full_name || '';
    session.shipping_address_line1 = details.address_line1 || '';
    session.shipping_address_line2 = details.address_line2 || '';
    session.shipping_city = details.city || '';
    session.shipping_state = details.state || '';
    session.shipping_postal_code = details.postal_code || '';
    session.shipping_country = details.country || '';
    session.shipping_phone = details.phone || '';

    const shippingCost = this._calculateShippingEstimate(
      updatedCart,
      cartItems,
      products,
      shippingMethods,
      session.shipping_method_code || null
    );

    session.shipping_cost = shippingCost;
    session.discount_total = updatedCart.discount_total || 0;
    session.total = Number(
      Math.max(0, (updatedCart.subtotal || 0) - (updatedCart.discount_total || 0) + shippingCost).toFixed(2)
    );

    const idx = sessions.findIndex((s) => s.id === session.id);
    if (idx >= 0) {
      sessions[idx] = session;
      this._saveToStorage('checkout_sessions', sessions);
    }

    const checkout_summary = {
      status: session.status,
      shipping_details: {
        full_name: session.shipping_full_name,
        address_line1: session.shipping_address_line1,
        address_line2: session.shipping_address_line2,
        city: session.shipping_city,
        state: session.shipping_state,
        postal_code: session.shipping_postal_code,
        country: session.shipping_country,
        phone: session.shipping_phone
      },
      subtotal: updatedCart.subtotal || 0,
      discount_total: updatedCart.discount_total || 0,
      shipping_cost: shippingCost,
      total: session.total || 0
    };

    return {
      success: true,
      message: 'Shipping details updated',
      checkout_summary
    };
  }

  // getAvailableShippingMethods()
  getAvailableShippingMethods() {
    return this._getFromStorage('shipping_methods', []);
  }

  // setCheckoutShippingMethod(shipping_method_code)
  setCheckoutShippingMethod(shipping_method_code) {
    const code = shipping_method_code;
    const shippingMethods = this._getFromStorage('shipping_methods', []);
    const method = shippingMethods.find((m) => m.code === code);
    if (!method) {
      return {
        success: false,
        message: 'Invalid shipping method',
        checkout_summary: null
      };
    }

    const cart = this._getOrCreateCart();
    this._recalculateCartTotals();
    const carts = this._getFromStorage('carts', []);
    const updatedCart = carts.find((c) => c.id === cart.id) || cart;
    const cartItems = this._getFromStorage('cart_items', []);
    const products = this._getFromStorage('products', []);

    const sessions = this._getFromStorage('checkout_sessions', []);
    const session = this._getOrCreateCheckoutSession();

    const shippingCost = this._calculateShippingEstimate(
      updatedCart,
      cartItems,
      products,
      shippingMethods,
      method.code
    );

    session.shipping_method_code = method.code;
    session.shipping_cost = shippingCost;
    session.discount_total = updatedCart.discount_total || 0;
    session.total = Number(
      Math.max(0, (updatedCart.subtotal || 0) - (updatedCart.discount_total || 0) + shippingCost).toFixed(2)
    );

    const idx = sessions.findIndex((s) => s.id === session.id);
    if (idx >= 0) {
      sessions[idx] = session;
      this._saveToStorage('checkout_sessions', sessions);
    }

    const checkout_summary = {
      shipping_method: {
        code: method.code,
        name: method.name,
        description: method.description,
        estimated_min_days: method.estimated_min_days,
        estimated_max_days: method.estimated_max_days
      },
      shipping_cost: shippingCost,
      subtotal: updatedCart.subtotal || 0,
      discount_total: updatedCart.discount_total || 0,
      total: session.total || 0
    };

    return {
      success: true,
      message: 'Shipping method selected',
      checkout_summary
    };
  }

  // getAvailablePaymentMethods()
  getAvailablePaymentMethods() {
    return this._getFromStorage('available_payment_methods', []);
  }

  // setCheckoutPaymentMethod(payment_method)
  setCheckoutPaymentMethod(payment_method) {
    const code = payment_method;
    const methods = this._getFromStorage('available_payment_methods', []);
    const method = methods.find((m) => m.code === code);
    if (!method) {
      return {
        success: false,
        message: 'Invalid payment method',
        checkout_summary: null
      };
    }

    const cart = this._getOrCreateCart();
    this._recalculateCartTotals();
    const carts = this._getFromStorage('carts', []);
    const updatedCart = carts.find((c) => c.id === cart.id) || cart;

    const sessions = this._getFromStorage('checkout_sessions', []);
    const session = this._getOrCreateCheckoutSession();

    session.payment_method = method.code;
    session.discount_total = updatedCart.discount_total || 0;
    session.total = Number(
      Math.max(
        0,
        (updatedCart.subtotal || 0) - (updatedCart.discount_total || 0) + (session.shipping_cost || 0)
      ).toFixed(2)
    );

    const idx = sessions.findIndex((s) => s.id === session.id);
    if (idx >= 0) {
      sessions[idx] = session;
      this._saveToStorage('checkout_sessions', sessions);
    }

    const checkout_summary = {
      payment_method: {
        code: method.code,
        name: method.name
      },
      subtotal: updatedCart.subtotal || 0,
      discount_total: updatedCart.discount_total || 0,
      shipping_cost: session.shipping_cost || 0,
      total: session.total || 0
    };

    return {
      success: true,
      message: 'Payment method selected',
      checkout_summary
    };
  }

  // getCheckoutSummary()
  getCheckoutSummary() {
    const cart = this._getOrCreateCart();
    this._recalculateCartTotals();
    const carts = this._getFromStorage('carts', []);
    const updatedCart = carts.find((c) => c.id === cart.id) || cart;
    const cartItems = this._getFromStorage('cart_items', []);
    const services = this._getFromStorage('services', []);
    const shippingMethods = this._getFromStorage('shipping_methods', []);
    const paymentMethods = this._getFromStorage('available_payment_methods', []);

    const sessions = this._getFromStorage('checkout_sessions', []);
    const session = this._getOrCreateCheckoutSession();

    const itemsForCart = cartItems.filter((ci) => ci.cart_id === updatedCart.id);
    const items = itemsForCart.map((ci) => {
      const service = ci.service_id ? services.find((s) => s.id === ci.service_id) || null : null;
      return {
        name: ci.name,
        is_service: ci.item_type === 'service',
        is_installation_service: service ? service.service_type === 'installation' : false,
        quantity: ci.quantity,
        unit_price: ci.unit_price,
        line_subtotal: ci.line_subtotal
      };
    });

    const shippingMethod = shippingMethods.find((m) => m.code === session.shipping_method_code);
    const paymentMethod = paymentMethods.find((m) => m.code === session.payment_method);

    const shipping_cost = session.shipping_cost || updatedCart.shipping_estimate || 0;
    const subtotal = updatedCart.subtotal || 0;
    const discount_total = updatedCart.discount_total || 0;
    const total = Number(Math.max(0, subtotal - discount_total + shipping_cost).toFixed(2));

    return {
      status: session.status,
      items,
      shipping_details: {
        full_name: session.shipping_full_name || '',
        address_line1: session.shipping_address_line1 || '',
        address_line2: session.shipping_address_line2 || '',
        city: session.shipping_city || '',
        state: session.shipping_state || '',
        postal_code: session.shipping_postal_code || '',
        country: session.shipping_country || '',
        phone: session.shipping_phone || ''
      },
      shipping_method: shippingMethod
        ? {
            code: shippingMethod.code,
            name: shippingMethod.name,
            description: shippingMethod.description,
            estimated_min_days: shippingMethod.estimated_min_days,
            estimated_max_days: shippingMethod.estimated_max_days
          }
        : null,
      payment_method: paymentMethod
        ? {
            code: paymentMethod.code,
            name: paymentMethod.name
          }
        : null,
      subtotal,
      discount_total,
      shipping_cost,
      total,
      applied_promo_code: updatedCart.applied_promo_code || null
    };
  }

  // getAboutUsContent()
  getAboutUsContent() {
    return this._getSingletonFromStorage('about_us_content', {
      title: '',
      body_html: '',
      highlights: [],
      certifications: []
    });
  }

  // getContactInfo()
  getContactInfo() {
    return this._getSingletonFromStorage('contact_info', {
      phone_numbers: [],
      email_addresses: [],
      address: {
        line1: '',
        line2: '',
        city: '',
        state: '',
        postal_code: '',
        country: ''
      },
      support_hours: '',
      expected_response_time: ''
    });
  }

  // submitContactForm(name, email, phone, topic, subject, message)
  submitContactForm(name, email, phone, topic, subject, message) {
    const tickets = this._getFromStorage('contact_tickets', []);
    const ticket = {
      id: this._generateId('ticket'),
      name,
      email,
      phone: phone || '',
      topic: topic || 'other',
      subject,
      message,
      created_at: new Date().toISOString(),
      status: 'open'
    };
    tickets.push(ticket);
    this._saveToStorage('contact_tickets', tickets);

    return {
      success: true,
      message: 'Your request has been submitted',
      ticket_id: ticket.id,
      expected_response_time: '24-48 hours'
    };
  }

  // getFaqList(category)
  getFaqList(category) {
    const faqs = this._getFromStorage('faq_list', []);
    if (category) {
      return faqs.filter((f) => f.category === category);
    }
    return faqs;
  }

  // getShippingAndDeliveryInfo()
  getShippingAndDeliveryInfo() {
    return this._getSingletonFromStorage('shipping_and_delivery_info', {
      body_html: '',
      shipping_methods: [],
      regional_limitations_html: ''
    });
  }

  // getReturnsAndWarrantyInfo()
  getReturnsAndWarrantyInfo() {
    return this._getSingletonFromStorage('returns_and_warranty_info', {
      body_html: '',
      return_window_days: 30,
      warranty_overview_html: ''
    });
  }

  // getPrivacyPolicyContent()
  getPrivacyPolicyContent() {
    return this._getSingletonFromStorage('privacy_policy_content', {
      title: 'Privacy Policy',
      body_html: '',
      last_updated: ''
    });
  }

  // getTermsAndConditionsContent()
  getTermsAndConditionsContent() {
    return this._getSingletonFromStorage('terms_and_conditions_content', {
      title: 'Terms & Conditions',
      body_html: '',
      last_updated: ''
    });
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
