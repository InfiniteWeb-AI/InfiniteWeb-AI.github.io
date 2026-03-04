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

  // ---------------------- Storage helpers ----------------------

  _initStorage() {
    const keys = [
      'users', // unused but kept for compatibility with skeleton
      'products',
      'brands',
      'categories',
      'vehicle_models',
      'vin_mappings',
      'cart',
      'cart_items',
      'wishlist',
      'wishlist_items',
      'promo_codes',
      'orders',
      'order_items',
      'comparison_sessions',
      'quick_order_sessions',
      'contact_requests'
    ];

    keys.forEach((key) => {
      if (localStorage.getItem(key) === null) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    });

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

  _now() {
    return new Date().toISOString();
  }

  // ---------------------- Generic helpers ----------------------

  _getCategoryAndDescendants(categoryId) {
    const categories = this._getFromStorage('categories');
    const result = new Set();

    const visit = (id) => {
      if (!id || result.has(id)) return;
      result.add(id);
      categories
        .filter((c) => c.parent_category_id === id)
        .forEach((child) => visit(child.id));
    };

    visit(categoryId);
    return Array.from(result);
  }

  _getCompatibilitySummary(product) {
    const compat = product && Array.isArray(product.compatibility) ? product.compatibility : [];
    if (!compat.length) return '';
    const first = compat[0];
    const make = first.truck_make || '';
    const model = first.truck_model || '';
    let years = '';
    if (first.truck_year_start && first.truck_year_end) {
      years = first.truck_year_start === first.truck_year_end
        ? String(first.truck_year_start)
        : first.truck_year_start + '–' + first.truck_year_end;
    }
    let summary = [make, model, years].filter(Boolean).join(' ');
    if (compat.length > 1) {
      summary += ' +' + (compat.length - 1) + ' more';
    }
    return summary.trim();
  }

  _filterByCompatibility(product, filters) {
    const make = filters.truck_make;
    const model = filters.truck_model;
    const year = filters.truck_year;
    if (!make && !model && !year) return true;

    const compat = product && Array.isArray(product.compatibility) ? product.compatibility : [];
    if (!compat.length) return false;

    return compat.some((c) => {
      if (make && c.truck_make !== make) return false;
      if (model && c.truck_model !== model) return false;
      if (year) {
        if (typeof c.truck_year_start !== 'number' || typeof c.truck_year_end !== 'number') return false;
        if (year < c.truck_year_start || year > c.truck_year_end) return false;
      }
      return true;
    });
  }

  _applyCommonProductFilters(products, filters) {
    if (!filters) return products.slice();
    const {
      truck_make,
      truck_model,
      truck_year,
      min_price,
      max_price,
      min_rating,
      free_shipping,
      in_stock_only,
      brand_id,
      filter_type,
      accessory_type,
      min_load_index,
      tire_width,
      tire_aspect_ratio,
      tire_rim_diameter
    } = filters;

    return products.filter((p) => {
      if (truck_make || truck_model || truck_year) {
        if (!this._filterByCompatibility(p, { truck_make, truck_model, truck_year })) return false;
      }

      if (typeof min_price === 'number' && p.price < min_price) return false;
      if (typeof max_price === 'number' && p.price > max_price) return false;

      if (typeof min_rating === 'number') {
        const rating = typeof p.average_rating === 'number' ? p.average_rating : 0;
        if (rating < min_rating) return false;
      }

      if (free_shipping === true && !p.free_shipping) return false;
      if (in_stock_only === true && !p.in_stock) return false;

      if (brand_id && p.brand_id !== brand_id) return false;

      if (filter_type && p.filter_type !== filter_type) return false;
      if (accessory_type && p.accessory_type !== accessory_type) return false;

      if (typeof min_load_index === 'number') {
        const li = typeof p.load_index === 'number' ? p.load_index : 0;
        if (li < min_load_index) return false;
      }

      if (typeof tire_width === 'number' && p.tire_width !== tire_width) return false;
      if (typeof tire_aspect_ratio === 'number' && p.tire_aspect_ratio !== tire_aspect_ratio) return false;
      if (typeof tire_rim_diameter === 'number' && p.tire_rim_diameter !== tire_rim_diameter) return false;

      return true;
    });
  }

  _applyProductSorting(products, sort) {
    if (!sort || !sort.sort_by) return products.slice();
    const { sort_by, sort_direction } = sort;
    const dir = sort_direction === 'asc' ? 1 : -1;

    const sorted = products.slice().sort((a, b) => {
      let av, bv;
      switch (sort_by) {
        case 'price':
          av = a.price || 0;
          bv = b.price || 0;
          break;
        case 'rating':
          av = typeof a.average_rating === 'number' ? a.average_rating : 0;
          bv = typeof b.average_rating === 'number' ? b.average_rating : 0;
          break;
        case 'load_index':
          av = typeof a.load_index === 'number' ? a.load_index : 0;
          bv = typeof b.load_index === 'number' ? b.load_index : 0;
          break;
        default:
          // best_match or unknown: keep original order
          return 0;
      }
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });

    return sorted;
  }

  _paginate(items, page = 1, page_size = 20) {
    const p = page && page > 0 ? page : 1;
    const size = page_size && page_size > 0 ? page_size : 20;
    const start = (p - 1) * size;
    const end = start + size;
    return {
      items: items.slice(start, end),
      page: p,
      page_size: size,
      total_count: items.length
    };
  }

  _getCurrentComparisonSession() {
    const sessions = this._getFromStorage('comparison_sessions');
    return sessions.length ? sessions[0] : null;
  }

  _buildSearchResultItems(products) {
    const brands = this._getFromStorage('brands');
    const categories = this._getFromStorage('categories');
    const wishlist = this._getOrCreateWishlist(false);
    const wishlistItems = this._getFromStorage('wishlist_items').filter((w) => wishlist && w.wishlist_id === wishlist.id);
    const wishlistProductIds = new Set(wishlistItems.map((w) => w.product_id));
    const comparisonSession = this._getCurrentComparisonSession();
    const comparisonIds = new Set(comparisonSession ? comparisonSession.product_ids || [] : []);

    return products.map((p) => {
      const brand = brands.find((b) => b.id === p.brand_id) || null;
      const category = categories.find((c) => c.id === p.category_id) || null;
      return {
        product: p,
        brand_name: brand ? brand.name : null,
        category_name: category ? category.name : null,
        primary_image_url: (p.image_urls && p.image_urls[0]) || p.thumbnail_url || null,
        price: p.price,
        currency: p.currency,
        average_rating: typeof p.average_rating === 'number' ? p.average_rating : null,
        rating_count: typeof p.rating_count === 'number' ? p.rating_count : null,
        in_stock: !!p.in_stock,
        free_shipping: !!p.free_shipping,
        compatibility_summary: this._getCompatibilitySummary(p),
        is_in_wishlist: wishlistProductIds.has(p.id),
        is_in_comparison: comparisonIds.has(p.id)
      };
    });
  }

  // ---------------------- Cart helpers ----------------------

  _getOrCreateCart(createIfMissing = true) {
    const carts = this._getFromStorage('cart');
    let cart = carts[0] || null;
    if (!cart && createIfMissing) {
      cart = {
        id: this._generateId('cart'),
        items: [],
        subtotal_amount: 0,
        discount_amount: 0,
        shipping_estimate: 0,
        tax_amount: 0,
        total_amount: 0,
        applied_promo_code: null,
        created_at: this._now(),
        updated_at: this._now()
      };
      carts.push(cart);
      this._saveToStorage('cart', carts);
    }
    return cart;
  }

  _recalculateCartTotals(cart) {
    if (!cart) return null;
    const cartItems = this._getFromStorage('cart_items');
    const itemsForCart = cartItems.filter((ci) => ci.cart_id === cart.id);

    let subtotal = 0;
    itemsForCart.forEach((item) => {
      const line = (item.unit_price || 0) * (item.quantity || 0);
      item.line_subtotal = line;
      subtotal += line;
    });

    // Save updated cart items (with line_subtotal)
    this._saveToStorage('cart_items', cartItems);

    cart.subtotal_amount = +subtotal.toFixed(2);

    const discount = typeof cart.discount_amount === 'number' ? cart.discount_amount : 0;

    // Simple shipping estimation: free if all items marked free_shipping_snapshot
    let shipping = 0;
    if (itemsForCart.length) {
      const allFree = itemsForCart.every((i) => i.free_shipping_snapshot === true);
      shipping = allFree ? 0 : 25; // flat rate if not all free
    }
    cart.shipping_estimate = +shipping.toFixed(2);

    const taxable = Math.max(cart.subtotal_amount - discount, 0);
    const tax = taxable * 0.08; // 8% tax
    cart.tax_amount = +tax.toFixed(2);

    const total = taxable + cart.shipping_estimate + cart.tax_amount;
    cart.total_amount = +total.toFixed(2);

    cart.updated_at = this._now();

    const carts = this._getFromStorage('cart');
    if (!carts.length) {
      carts.push(cart);
    } else {
      const idx = carts.findIndex((c) => c.id === cart.id);
      if (idx >= 0) carts[idx] = cart; else carts[0] = cart;
    }
    this._saveToStorage('cart', carts);

    return cart;
  }

  _buildCartResponse(cart) {
    if (!cart) {
      return {
        cart: null,
        items: [],
        totals: {
          subtotal_amount: 0,
          discount_amount: 0,
          shipping_estimate: 0,
          tax_amount: 0,
          total_amount: 0,
          applied_promo_code: null
        }
      };
    }

    const cartItems = this._getFromStorage('cart_items').filter((ci) => ci.cart_id === cart.id);
    const products = this._getFromStorage('products');
    const brands = this._getFromStorage('brands');

    const items = cartItems.map((item) => {
      const product = products.find((p) => p.id === item.product_id) || null;
      const brand = product ? (brands.find((b) => b.id === product.brand_id) || null) : null;
      return {
        cart_item_id: item.id,
        product_id: item.product_id,
        product,
        product_name: item.product_name_snapshot,
        product_part_number: item.product_part_number_snapshot || (product && product.part_number) || null,
        thumbnail_url: product ? product.thumbnail_url || null : null,
        quantity: item.quantity,
        unit_price: item.unit_price,
        line_subtotal: typeof item.line_subtotal === 'number' ? item.line_subtotal : (item.unit_price || 0) * (item.quantity || 0),
        free_shipping: item.free_shipping_snapshot === true,
        in_stock: product ? !!product.in_stock : false,
        brand_name: brand ? brand.name : null,
        brand
      };
    });

    const totals = {
      subtotal_amount: cart.subtotal_amount || 0,
      discount_amount: cart.discount_amount || 0,
      shipping_estimate: cart.shipping_estimate || 0,
      tax_amount: cart.tax_amount || 0,
      total_amount: cart.total_amount || 0,
      applied_promo_code: cart.applied_promo_code || null
    };

    return { cart, items, totals };
  }

  // ---------------------- Wishlist helpers ----------------------

  _getOrCreateWishlist(createIfMissing = true) {
    const wishlists = this._getFromStorage('wishlist');
    let wishlist = wishlists[0] || null;
    if (!wishlist && createIfMissing) {
      wishlist = {
        id: this._generateId('wishlist'),
        created_at: this._now(),
        updated_at: this._now()
      };
      wishlists.push(wishlist);
      this._saveToStorage('wishlist', wishlists);
    }
    return wishlist;
  }

  _buildWishlistItemsResponse(wishlist) {
    if (!wishlist) {
      return { wishlist: null, items: [] };
    }
    const wishlistItems = this._getFromStorage('wishlist_items').filter((w) => w.wishlist_id === wishlist.id);
    const products = this._getFromStorage('products');
    const brands = this._getFromStorage('brands');

    const items = wishlistItems.map((wi) => {
      const product = products.find((p) => p.id === wi.product_id) || null;
      const brand = product ? (brands.find((b) => b.id === product.brand_id) || null) : null;
      return {
        wishlist_item_id: wi.id,
        product,
        brand_name: brand ? brand.name : null,
        price: product ? product.price : null,
        currency: product ? product.currency : null,
        average_rating: product && typeof product.average_rating === 'number' ? product.average_rating : null,
        in_stock: product ? !!product.in_stock : false,
        thumbnail_url: product ? product.thumbnail_url || null : null
      };
    });

    return { wishlist, items };
  }

  // ---------------------- Comparison helpers ----------------------

  _getOrCreateComparisonSession() {
    const sessions = this._getFromStorage('comparison_sessions');
    let session = sessions[0] || null;
    if (!session) {
      session = {
        id: this._generateId('cmp'),
        product_ids: [],
        created_at: this._now()
      };
      sessions.push(session);
      this._saveToStorage('comparison_sessions', sessions);
    }
    return session;
  }

  // ---------------------- Quick order helpers ----------------------

  _getOrCreateQuickOrderSession(rows) {
    const sessions = this._getFromStorage('quick_order_sessions');
    const session = {
      id: this._generateId('qos'),
      rows: rows || [],
      created_at: this._now()
    };
    sessions.push(session);
    this._saveToStorage('quick_order_sessions', sessions);
    return session;
  }

  _findProductsByPartNumber(partNumber) {
    const products = this._getFromStorage('products');
    if (!partNumber) return [];
    const pn = String(partNumber).trim().toLowerCase();
    return products.filter((p) => String(p.part_number).trim().toLowerCase() === pn);
  }

  // ---------------------- Order / checkout helpers ----------------------

  _getOrCreateDraftOrder() {
    const orders = this._getFromStorage('orders');
    let order = orders.find((o) => o.status === 'draft') || null;
    const cart = this._getOrCreateCart(false);
    const cartItems = this._getFromStorage('cart_items');
    const itemsForCart = cart ? cartItems.filter((ci) => ci.cart_id === cart.id) : [];

    if (!cart || !itemsForCart.length) {
      return null;
    }

    if (!order) {
      order = {
        id: this._generateId('order'),
        status: 'draft',
        items: [],
        subtotal_amount: cart.subtotal_amount || 0,
        discount_amount: cart.discount_amount || 0,
        shipping_cost: cart.shipping_estimate || 0,
        tax_amount: cart.tax_amount || 0,
        total_amount: cart.total_amount || 0,
        promo_code: cart.applied_promo_code || null,
        customer_name: null,
        customer_email: null,
        customer_phone: null,
        shipping_street: null,
        shipping_city: null,
        shipping_state: null,
        shipping_zip: null,
        shipping_method: null,
        payment_method: null,
        created_at: this._now(),
        updated_at: this._now()
      };
      orders.push(order);
    } else {
      // sync monetary fields from cart
      order.subtotal_amount = cart.subtotal_amount || 0;
      order.discount_amount = cart.discount_amount || 0;
      order.shipping_cost = cart.shipping_estimate || 0;
      order.tax_amount = cart.tax_amount || 0;
      order.total_amount = cart.total_amount || 0;
      order.promo_code = cart.applied_promo_code || null;
      order.updated_at = this._now();
    }

    this._saveToStorage('orders', orders);

    // Rebuild order items from cart items
    let orderItems = this._getFromStorage('order_items');
    orderItems = orderItems.filter((oi) => oi.order_id !== order.id);

    itemsForCart.forEach((ci) => {
      const oi = {
        id: this._generateId('oi'),
        order_id: order.id,
        product_id: ci.product_id,
        product_name_snapshot: ci.product_name_snapshot,
        product_part_number_snapshot: ci.product_part_number_snapshot,
        quantity: ci.quantity,
        unit_price: ci.unit_price,
        line_total: (ci.unit_price || 0) * (ci.quantity || 0)
      };
      orderItems.push(oi);
    });

    this._saveToStorage('order_items', orderItems);

    return order;
  }

  _buildOrderItemsResponse(order) {
    if (!order) return [];
    const orderItems = this._getFromStorage('order_items').filter((oi) => oi.order_id === order.id);
    const products = this._getFromStorage('products');
    const brands = this._getFromStorage('brands');

    return orderItems.map((oi) => {
      const product = products.find((p) => p.id === oi.product_id) || null;
      const brand = product ? (brands.find((b) => b.id === product.brand_id) || null) : null;
      return {
        ...oi,
        product,
        brand_name: brand ? brand.name : null
      };
    });
  }

  // =============================================================
  // Public interface implementations
  // =============================================================

  // ---------------------- Navigation & homepage ----------------------

  getMainNavigationCategories() {
    const categories = this._getFromStorage('categories');
    return categories.filter((c) => !c.parent_category_id);
  }

  getHomepageContent() {
    const categories = this._getFromStorage('categories');
    const products = this._getFromStorage('products');
    const brands = this._getFromStorage('brands');
    const promoCodes = this._getFromStorage('promo_codes');

    const featured_categories = categories.filter((c) => !c.parent_category_id).slice(0, 6);

    const featured_products = products.slice(0, 8).map((p) => {
      const brand = brands.find((b) => b.id === p.brand_id) || null;
      const category = categories.find((c) => c.id === p.category_id) || null;
      return {
        product: p,
        brand_name: brand ? brand.name : null,
        category_name: category ? category.name : null,
        primary_image_url: (p.image_urls && p.image_urls[0]) || p.thumbnail_url || null,
        average_rating: typeof p.average_rating === 'number' ? p.average_rating : null,
        rating_count: typeof p.rating_count === 'number' ? p.rating_count : null
      };
    });

    const promotions = promoCodes.map((pc) => ({
      id: pc.id,
      title: pc.code,
      description: pc.description || '',
      promo_code: pc.code,
      badge_text: pc.discount_type === 'percentage'
        ? (pc.discount_value || 0) + '% OFF'
        : pc.discount_type === 'fixed_amount'
          ? '$' + (pc.discount_value || 0) + ' OFF'
          : pc.discount_type === 'free_shipping'
            ? 'Free Shipping'
            : ''
    }));

    const search_suggestions = Array.from(
      new Set(
        products
          .map((p) => (p.name || '').trim())
          .filter((n) => n)
      )
    ).slice(0, 10);

    return {
      featured_categories,
      featured_products,
      promotions,
      search_suggestions
    };
  }

  // ---------------------- Search ----------------------

  searchProducts(query, filters, sort, page = 1, page_size = 20) {
    const products = this._getFromStorage('products');
    const q = (query || '').trim().toLowerCase();

    let matching = products.filter((p) => {
      if (!q) return true;
      const name = (p.name || '').toLowerCase();
      const partNumber = (p.part_number || '').toLowerCase();
      const shortDesc = (p.short_description || '').toLowerCase();
      const longDesc = (p.long_description || '').toLowerCase();
      return (
        name.includes(q) ||
        partNumber.includes(q) ||
        shortDesc.includes(q) ||
        longDesc.includes(q)
      );
    });

    matching = this._applyCommonProductFilters(matching, filters || {});
    matching = this._applyProductSorting(matching, sort);

    const paged = this._paginate(matching, page, page_size);
    const items = this._buildSearchResultItems(paged.items);

    return {
      items,
      total_count: paged.total_count,
      page: paged.page,
      page_size: paged.page_size
    };
  }

  getSearchFilterOptions(query) {
    const products = this._getFromStorage('products');
    const q = (query || '').trim().toLowerCase();

    let matching = products.filter((p) => {
      if (!q) return true;
      const name = (p.name || '').toLowerCase();
      const partNumber = (p.part_number || '').toLowerCase();
      const shortDesc = (p.short_description || '').toLowerCase();
      const longDesc = (p.long_description || '').toLowerCase();
      return (
        name.includes(q) ||
        partNumber.includes(q) ||
        shortDesc.includes(q) ||
        longDesc.includes(q)
      );
    });

    const compatibility_options = {
      makes: [],
      models: [],
      years: []
    };

    const makesSet = new Set();
    const modelsSet = new Set();
    const yearsSet = new Set();

    matching.forEach((p) => {
      const compat = Array.isArray(p.compatibility) ? p.compatibility : [];
      compat.forEach((c) => {
        if (c.truck_make) makesSet.add(c.truck_make);
        if (c.truck_model) modelsSet.add(c.truck_model);
        if (typeof c.truck_year_start === 'number' && typeof c.truck_year_end === 'number') {
          for (let y = c.truck_year_start; y <= c.truck_year_end; y += 1) {
            yearsSet.add(y);
          }
        }
      });
    });

    compatibility_options.makes = Array.from(makesSet).sort();
    compatibility_options.models = Array.from(modelsSet).sort();
    compatibility_options.years = Array.from(yearsSet).sort((a, b) => a - b);

    let minPrice = null;
    let maxPrice = null;
    let minLoad = null;
    let maxLoad = null;
    let freeShippingAvailable = false;

    const filterTypeSet = new Set();
    const accessoryTypeSet = new Set();

    matching.forEach((p) => {
      if (typeof p.price === 'number') {
        if (minPrice === null || p.price < minPrice) minPrice = p.price;
        if (maxPrice === null || p.price > maxPrice) maxPrice = p.price;
      }
      if (typeof p.load_index === 'number') {
        if (minLoad === null || p.load_index < minLoad) minLoad = p.load_index;
        if (maxLoad === null || p.load_index > maxLoad) maxLoad = p.load_index;
      }
      if (p.free_shipping) freeShippingAvailable = true;
      if (p.filter_type && p.filter_type !== 'none') filterTypeSet.add(p.filter_type);
      if (p.accessory_type && p.accessory_type !== 'none') accessoryTypeSet.add(p.accessory_type);
    });

    const price_range = {
      min_available: minPrice,
      max_available: maxPrice
    };

    const brands = this._getFromStorage('brands');
    const brandIds = new Set(matching.map((p) => p.brand_id));
    const brand_options = brands.filter((b) => brandIds.has(b.id));

    const rating_options = [
      { value: 4, label: '4 stars & up' },
      { value: 3, label: '3 stars & up' },
      { value: 2, label: '2 stars & up' },
      { value: 1, label: '1 star & up' }
    ];

    const filter_type_options = Array.from(filterTypeSet).map((ft) => ({
      value: ft,
      label: ft.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    }));

    const accessory_type_options = Array.from(accessoryTypeSet).map((at) => ({
      value: at,
      label: at.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    }));

    const load_index_range = {
      min_available: minLoad,
      max_available: maxLoad
    };

    const availability_options = [
      { value: 'in_stock_only', label: 'In Stock Only' }
    ];

    const shipping_filter_options = {
      free_shipping_available: freeShippingAvailable
    };

    return {
      compatibility_options,
      price_range,
      rating_options,
      brand_options,
      filter_type_options,
      accessory_type_options,
      load_index_range,
      availability_options,
      shipping_filter_options
    };
  }

  // ---------------------- Category listing ----------------------

  getCategoryFilterOptions(category_id) {
    const products = this._getFromStorage('products');
    const categories = this._getFromStorage('categories');
    const category = categories.find((c) => c.id === category_id) || null;
    const categoryIds = this._getCategoryAndDescendants(category_id);

    const inCategory = products.filter((p) => categoryIds.includes(p.category_id));

    const compatibility_options = {
      makes: [],
      models: [],
      years: []
    };

    const makesSet = new Set();
    const modelsSet = new Set();
    const yearsSet = new Set();

    inCategory.forEach((p) => {
      const compat = Array.isArray(p.compatibility) ? p.compatibility : [];
      compat.forEach((c) => {
        if (c.truck_make) makesSet.add(c.truck_make);
        if (c.truck_model) modelsSet.add(c.truck_model);
        if (typeof c.truck_year_start === 'number' && typeof c.truck_year_end === 'number') {
          for (let y = c.truck_year_start; y <= c.truck_year_end; y += 1) {
            yearsSet.add(y);
          }
        }
      });
    });

    compatibility_options.makes = Array.from(makesSet).sort();
    compatibility_options.models = Array.from(modelsSet).sort();
    compatibility_options.years = Array.from(yearsSet).sort((a, b) => a - b);

    let minPrice = null;
    let maxPrice = null;
    let minLoad = null;
    let maxLoad = null;
    let freeShippingAvailable = false;

    const filterTypeSet = new Set();
    const accessoryTypeSet = new Set();

    inCategory.forEach((p) => {
      if (typeof p.price === 'number') {
        if (minPrice === null || p.price < minPrice) minPrice = p.price;
        if (maxPrice === null || p.price > maxPrice) maxPrice = p.price;
      }
      if (typeof p.load_index === 'number') {
        if (minLoad === null || p.load_index < minLoad) minLoad = p.load_index;
        if (maxLoad === null || p.load_index > maxLoad) maxLoad = p.load_index;
      }
      if (p.free_shipping) freeShippingAvailable = true;
      if (p.filter_type && p.filter_type !== 'none') filterTypeSet.add(p.filter_type);
      if (p.accessory_type && p.accessory_type !== 'none') accessoryTypeSet.add(p.accessory_type);
    });

    const price_range = {
      min_available: minPrice,
      max_available: maxPrice
    };

    const brands = this._getFromStorage('brands');
    const brandIds = new Set(inCategory.map((p) => p.brand_id));
    const brand_options = brands.filter((b) => brandIds.has(b.id));

    const rating_options = [
      { value: 4, label: '4 stars & up' },
      { value: 3, label: '3 stars & up' },
      { value: 2, label: '2 stars & up' },
      { value: 1, label: '1 star & up' }
    ];

    const filter_type_options = Array.from(filterTypeSet).map((ft) => ({
      value: ft,
      label: ft.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    }));

    const accessory_type_options = Array.from(accessoryTypeSet).map((at) => ({
      value: at,
      label: at.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    }));

    const load_index_range = {
      min_available: minLoad,
      max_available: maxLoad
    };

    const availability_options = [
      { value: 'in_stock_only', label: 'In Stock Only' }
    ];

    const shipping_filter_options = {
      free_shipping_available: freeShippingAvailable
    };

    return {
      category,
      compatibility_options,
      price_range,
      rating_options,
      brand_options,
      filter_type_options,
      accessory_type_options,
      load_index_range,
      availability_options,
      shipping_filter_options
    };
  }

  getCategoryProducts(category_id, filters, sort, page = 1, page_size = 20) {
    const products = this._getFromStorage('products');
    const categories = this._getFromStorage('categories');
    const brands = this._getFromStorage('brands');

    const categoryIds = this._getCategoryAndDescendants(category_id);
    const baseProducts = products.filter((p) => categoryIds.includes(p.category_id));

    let filtered = this._applyCommonProductFilters(baseProducts, filters || {});
    filtered = this._applyProductSorting(filtered, sort);

    const paged = this._paginate(filtered, page, page_size);

    const wishlist = this._getOrCreateWishlist(false);
    const wishlistItems = this._getFromStorage('wishlist_items').filter((w) => wishlist && w.wishlist_id === wishlist.id);
    const wishlistProductIds = new Set(wishlistItems.map((w) => w.product_id));
    const comparisonSession = this._getCurrentComparisonSession();
    const comparisonIds = new Set(comparisonSession ? comparisonSession.product_ids || [] : []);

    const items = paged.items.map((p) => {
      const brand = brands.find((b) => b.id === p.brand_id) || null;
      const category = categories.find((c) => c.id === p.category_id) || null;
      return {
        product: p,
        brand_name: brand ? brand.name : null,
        category_name: category ? category.name : null,
        primary_image_url: (p.image_urls && p.image_urls[0]) || p.thumbnail_url || null,
        price: p.price,
        currency: p.currency,
        average_rating: typeof p.average_rating === 'number' ? p.average_rating : null,
        rating_count: typeof p.rating_count === 'number' ? p.rating_count : null,
        in_stock: !!p.in_stock,
        free_shipping: !!p.free_shipping,
        compatibility_summary: this._getCompatibilitySummary(p),
        warranty_months: typeof p.warranty_months === 'number' ? p.warranty_months : null,
        is_in_wishlist: wishlistProductIds.has(p.id),
        is_in_comparison: comparisonIds.has(p.id)
      };
    });

    const category = categories.find((c) => c.id === category_id) || null;

    return {
      category,
      items,
      total_count: paged.total_count,
      page: paged.page,
      page_size: paged.page_size
    };
  }

  // ---------------------- Product details & related ----------------------

  getProductDetails(product_id) {
    const products = this._getFromStorage('products');
    const brands = this._getFromStorage('brands');
    const categories = this._getFromStorage('categories');

    const product = products.find((p) => p.id === product_id) || null;
    if (!product) {
      return {
        product: null,
        brand: null,
        category: null,
        category_name: null,
        brand_name: null,
        compatibility_details: [],
        warranty_months: null,
        shipping_options: [],
        is_in_wishlist: false,
        is_in_comparison: false
      };
    }

    const brand = brands.find((b) => b.id === product.brand_id) || null;
    const category = categories.find((c) => c.id === product.category_id) || null;

    const compatibility_details = Array.isArray(product.compatibility)
      ? product.compatibility.map((c) => ({
          truck_make: c.truck_make,
          truck_model: c.truck_model,
          truck_year_start: c.truck_year_start,
          truck_year_end: c.truck_year_end
        }))
      : [];

    const freeShip = !!product.free_shipping;
    const shipping_options = [
      {
        code: 'standard_shipping',
        label: 'Standard Shipping',
        cost: freeShip ? 0 : 25,
        estimated_days: 5,
        is_free: freeShip
      },
      {
        code: 'express_shipping',
        label: 'Express Shipping',
        cost: freeShip ? 15 : 40,
        estimated_days: 2,
        is_free: false
      }
    ];

    const wishlist = this._getOrCreateWishlist(false);
    const wishlistItems = this._getFromStorage('wishlist_items').filter((w) => wishlist && w.wishlist_id === wishlist.id);
    const is_in_wishlist = wishlistItems.some((w) => w.product_id === product.id);

    const comparisonSession = this._getCurrentComparisonSession();
    const is_in_comparison = !!(comparisonSession && (comparisonSession.product_ids || []).includes(product.id));

    return {
      product,
      brand,
      category,
      category_name: category ? category.name : null,
      brand_name: brand ? brand.name : null,
      compatibility_details,
      warranty_months: typeof product.warranty_months === 'number' ? product.warranty_months : null,
      shipping_options,
      is_in_wishlist,
      is_in_comparison
    };
  }

  getRelatedProducts(product_id, limit = 8) {
    const products = this._getFromStorage('products');
    const brands = this._getFromStorage('brands');
    const categories = this._getFromStorage('categories');

    const main = products.find((p) => p.id === product_id) || null;
    if (!main) return [];

    const related = products
      .filter((p) => p.id !== main.id && (p.category_id === main.category_id || p.brand_id === main.brand_id))
      .slice(0, limit);

    return related.map((p) => {
      const brand = brands.find((b) => b.id === p.brand_id) || null;
      const category = categories.find((c) => c.id === p.category_id) || null;
      return {
        product: p,
        brand_name: brand ? brand.name : null,
        category_name: category ? category.name : null,
        primary_image_url: (p.image_urls && p.image_urls[0]) || p.thumbnail_url || null,
        average_rating: typeof p.average_rating === 'number' ? p.average_rating : null,
        rating_count: typeof p.rating_count === 'number' ? p.rating_count : null
      };
    });
  }

  // ---------------------- Cart ----------------------

  addToCart(product_id, quantity = 1) {
    const qty = quantity && quantity > 0 ? quantity : 1;
    const products = this._getFromStorage('products');
    const product = products.find((p) => p.id === product_id) || null;

    if (!product) {
      return { success: false, message: 'Product not found', cart: null, items: [], totals: {} };
    }

    const cart = this._getOrCreateCart(true);
    const cartItems = this._getFromStorage('cart_items');

    let cartItem = cartItems.find((ci) => ci.cart_id === cart.id && ci.product_id === product.id);
    if (cartItem) {
      // Treat provided quantity as the desired final quantity rather than an increment
      cartItem.quantity = qty;
      cartItem.updated_at = this._now();
    } else {
      cartItem = {
        id: this._generateId('ci'),
        cart_id: cart.id,
        product_id: product.id,
        product_name_snapshot: product.name,
        product_part_number_snapshot: product.part_number,
        quantity: qty,
        unit_price: product.price,
        line_subtotal: product.price * qty,
        free_shipping_snapshot: !!product.free_shipping,
        created_at: this._now(),
        updated_at: this._now()
      };
      cartItems.push(cartItem);
    }

    this._saveToStorage('cart_items', cartItems);

    // Reset discount when cart changes? Keep existing promo but totals must be recomputed
    this._recalculateCartTotals(cart);

    const response = this._buildCartResponse(cart);
    return {
      success: true,
      message: 'Added to cart',
      cart: response.cart,
      items: response.items,
      totals: response.totals
    };
  }

  getCartSummary() {
    const cart = this._getOrCreateCart(true);
    this._recalculateCartTotals(cart);
    return this._buildCartResponse(cart);
  }

  updateCartItemQuantity(cart_item_id, quantity) {
    const cart = this._getOrCreateCart(false);
    if (!cart) {
      return { success: false, message: 'Cart not found', cart: null, items: [], totals: {} };
    }

    const cartItems = this._getFromStorage('cart_items');
    const idx = cartItems.findIndex((ci) => ci.id === cart_item_id && ci.cart_id === cart.id);
    if (idx === -1) {
      return { success: false, message: 'Cart item not found', cart, items: [], totals: {} };
    }

    if (!quantity || quantity <= 0) {
      cartItems.splice(idx, 1);
    } else {
      cartItems[idx].quantity = quantity;
      cartItems[idx].updated_at = this._now();
    }

    this._saveToStorage('cart_items', cartItems);

    // If cart becomes empty, clear discounts and totals
    const remaining = cartItems.filter((ci) => ci.cart_id === cart.id);
    if (!remaining.length) {
      cart.subtotal_amount = 0;
      cart.discount_amount = 0;
      cart.shipping_estimate = 0;
      cart.tax_amount = 0;
      cart.total_amount = 0;
      cart.applied_promo_code = null;
      cart.updated_at = this._now();
      const carts = this._getFromStorage('cart');
      if (!carts.length) {
        this._saveToStorage('cart', [cart]);
      } else {
        const cidx = carts.findIndex((c) => c.id === cart.id);
        if (cidx >= 0) carts[cidx] = cart; else carts[0] = cart;
        this._saveToStorage('cart', carts);
      }
    } else {
      this._recalculateCartTotals(cart);
    }

    const response = this._buildCartResponse(cart);
    return {
      success: true,
      message: 'Cart updated',
      cart: response.cart,
      items: response.items,
      totals: response.totals
    };
  }

  removeCartItem(cart_item_id) {
    const cart = this._getOrCreateCart(false);
    if (!cart) {
      return { success: false, message: 'Cart not found', cart: null, items: [], totals: {} };
    }

    const cartItems = this._getFromStorage('cart_items');
    const idx = cartItems.findIndex((ci) => ci.id === cart_item_id && ci.cart_id === cart.id);
    if (idx === -1) {
      const response = this._buildCartResponse(cart);
      return {
        success: false,
        message: 'Cart item not found',
        cart: response.cart,
        items: response.items,
        totals: response.totals
      };
    }

    cartItems.splice(idx, 1);
    this._saveToStorage('cart_items', cartItems);

    const remaining = cartItems.filter((ci) => ci.cart_id === cart.id);
    if (!remaining.length) {
      cart.subtotal_amount = 0;
      cart.discount_amount = 0;
      cart.shipping_estimate = 0;
      cart.tax_amount = 0;
      cart.total_amount = 0;
      cart.applied_promo_code = null;
      cart.updated_at = this._now();
      const carts = this._getFromStorage('cart');
      if (!carts.length) {
        this._saveToStorage('cart', [cart]);
      } else {
        const cidx = carts.findIndex((c) => c.id === cart.id);
        if (cidx >= 0) carts[cidx] = cart; else carts[0] = cart;
        this._saveToStorage('cart', carts);
      }
    } else {
      this._recalculateCartTotals(cart);
    }

    const response = this._buildCartResponse(cart);
    return {
      success: true,
      message: 'Item removed from cart',
      cart: response.cart,
      items: response.items,
      totals: response.totals
    };
  }

  applyPromoCode(code) {
    const cart = this._getOrCreateCart(false);
    if (!cart) {
      return { success: false, message: 'Cart not found', promo_code: null, cart: null, items: [], totals: {} };
    }

    const cartItems = this._getFromStorage('cart_items').filter((ci) => ci.cart_id === cart.id);
    if (!cartItems.length) {
      const responseEmpty = this._buildCartResponse(cart);
      return {
        success: false,
        message: 'Cart is empty',
        promo_code: null,
        cart: responseEmpty.cart,
        items: responseEmpty.items,
        totals: responseEmpty.totals
      };
    }

    const promoCodes = this._getFromStorage('promo_codes');
    const normalized = String(code || '').trim().toUpperCase();
    const promo = promoCodes.find((p) => String(p.code || '').trim().toUpperCase() === normalized) || null;

    if (!promo || !promo.is_active) {
      const responseNo = this._buildCartResponse(cart);
      return {
        success: false,
        message: 'Invalid or inactive promo code',
        promo_code: null,
        cart: responseNo.cart,
        items: responseNo.items,
        totals: responseNo.totals
      };
    }

    const now = new Date();
    if (promo.valid_from) {
      const from = new Date(promo.valid_from);
      if (now < from) {
        const resp = this._buildCartResponse(cart);
        return {
          success: false,
          message: 'Promo code not yet valid',
          promo_code: promo,
          cart: resp.cart,
          items: resp.items,
          totals: resp.totals
        };
      }
    }
    if (promo.valid_to) {
      const to = new Date(promo.valid_to);
      if (now > to) {
        const resp = this._buildCartResponse(cart);
        return {
          success: false,
          message: 'Promo code has expired',
          promo_code: promo,
          cart: resp.cart,
          items: resp.items,
          totals: resp.totals
        };
      }
    }

    if (typeof promo.max_uses === 'number' && typeof promo.current_uses === 'number') {
      if (promo.current_uses >= promo.max_uses) {
        const resp = this._buildCartResponse(cart);
        return {
          success: false,
          message: 'Promo code usage limit reached',
          promo_code: promo,
          cart: resp.cart,
          items: resp.items,
          totals: resp.totals
        };
      }
    }

    // Baseline totals without discount
    cart.discount_amount = 0;
    cart.applied_promo_code = null;
    this._recalculateCartTotals(cart);

    if (typeof promo.minimum_order_amount === 'number' && cart.subtotal_amount < promo.minimum_order_amount) {
      const resp = this._buildCartResponse(cart);
      return {
        success: false,
        message: 'Order does not meet minimum amount for this promo',
        promo_code: promo,
        cart: resp.cart,
        items: resp.items,
        totals: resp.totals
      };
    }

    let discount = 0;
    let shipping = cart.shipping_estimate || 0;

    if (promo.discount_type === 'percentage') {
      const pct = promo.discount_value || 0;
      discount = cart.subtotal_amount * (pct / 100);
    } else if (promo.discount_type === 'fixed_amount') {
      discount = promo.discount_value || 0;
      if (discount > cart.subtotal_amount) discount = cart.subtotal_amount;
    } else if (promo.discount_type === 'free_shipping') {
      shipping = 0;
    }

    cart.discount_amount = +discount.toFixed(2);
    cart.shipping_estimate = +shipping.toFixed(2);

    const taxable = Math.max(cart.subtotal_amount - cart.discount_amount, 0);
    const tax = taxable * 0.08;
    cart.tax_amount = +tax.toFixed(2);
    cart.total_amount = +(taxable + cart.shipping_estimate + cart.tax_amount).toFixed(2);
    cart.applied_promo_code = promo.code;
    cart.updated_at = this._now();

    const carts = this._getFromStorage('cart');
    if (!carts.length) {
      this._saveToStorage('cart', [cart]);
    } else {
      const cidx = carts.findIndex((c) => c.id === cart.id);
      if (cidx >= 0) carts[cidx] = cart; else carts[0] = cart;
      this._saveToStorage('cart', carts);
    }

    // Increment promo current_uses if tracking
    const promosAll = this._getFromStorage('promo_codes');
    const pidx = promosAll.findIndex((p) => p.id === promo.id);
    if (pidx >= 0) {
      const existing = promosAll[pidx];
      existing.current_uses = (existing.current_uses || 0) + 1;
      promosAll[pidx] = existing;
      this._saveToStorage('promo_codes', promosAll);
    }

    const response = this._buildCartResponse(cart);
    return {
      success: true,
      message: 'Promo code applied',
      promo_code: promo,
      cart: response.cart,
      items: response.items,
      totals: response.totals
    };
  }

  // ---------------------- Checkout ----------------------

  startCheckout() {
    const order = this._getOrCreateDraftOrder();
    if (!order) {
      return {
        success: false,
        message: 'Cart is empty',
        order: null,
        items: [],
        available_shipping_methods: [],
        available_payment_methods: [],
        shipping_address: {},
        contact_info: {}
      };
    }

    const items = this._buildOrderItemsResponse(order);

    const available_shipping_methods = [
      {
        code: 'standard_shipping',
        label: 'Standard Shipping',
        cost: 25,
        estimated_days: 5,
        is_default: true
      },
      {
        code: 'express_shipping',
        label: 'Express Shipping',
        cost: 50,
        estimated_days: 2,
        is_default: false
      }
    ];

    const available_payment_methods = [
      { code: 'credit_card', label: 'Credit Card' },
      { code: 'paypal', label: 'PayPal' }
    ];

    const shipping_address = {
      street: order.shipping_street || '',
      city: order.shipping_city || '',
      state: order.shipping_state || '',
      zip: order.shipping_zip || ''
    };

    const contact_info = {
      name: order.customer_name || '',
      email: order.customer_email || '',
      phone: order.customer_phone || ''
    };

    return {
      success: true,
      message: 'Checkout started',
      order,
      items,
      available_shipping_methods,
      available_payment_methods,
      shipping_address,
      contact_info
    };
  }

  submitCheckoutDetails(
    order_id,
    customer_name,
    customer_email,
    customer_phone,
    shipping_street,
    shipping_city,
    shipping_state,
    shipping_zip,
    shipping_method,
    payment_method
  ) {
    const orders = this._getFromStorage('orders');
    const idx = orders.findIndex((o) => o.id === order_id);
    if (idx === -1) {
      return {
        success: false,
        message: 'Order not found',
        order: null,
        items: [],
        review_totals: {}
      };
    }

    const order = orders[idx];

    order.customer_name = customer_name;
    order.customer_email = customer_email;
    order.customer_phone = customer_phone;
    order.shipping_street = shipping_street;
    order.shipping_city = shipping_city;
    order.shipping_state = shipping_state;
    order.shipping_zip = shipping_zip;
    order.shipping_method = shipping_method;
    order.payment_method = payment_method;

    // Adjust shipping cost based on method
    if (shipping_method === 'express_shipping') {
      order.shipping_cost = 50;
    } else {
      order.shipping_cost = 25;
    }

    const subtotal = typeof order.subtotal_amount === 'number' ? order.subtotal_amount : 0;
    const discount = typeof order.discount_amount === 'number' ? order.discount_amount : 0;
    const shipping = typeof order.shipping_cost === 'number' ? order.shipping_cost : 0;
    const taxable = Math.max(subtotal - discount, 0);
    const tax = taxable * 0.08;
    order.tax_amount = +tax.toFixed(2);
    order.total_amount = +(taxable + shipping + order.tax_amount).toFixed(2);
    order.updated_at = this._now();

    orders[idx] = order;
    this._saveToStorage('orders', orders);

    const items = this._buildOrderItemsResponse(order);

    const review_totals = {
      subtotal_amount: order.subtotal_amount || 0,
      discount_amount: order.discount_amount || 0,
      shipping_cost: order.shipping_cost || 0,
      tax_amount: order.tax_amount || 0,
      total_amount: order.total_amount || 0,
      promo_code: order.promo_code || null
    };

    return {
      success: true,
      message: 'Checkout details submitted',
      order,
      items,
      review_totals
    };
  }

  getOrderReview(order_id) {
    const orders = this._getFromStorage('orders');
    const order = orders.find((o) => o.id === order_id) || null;
    if (!order) {
      return {
        order: null,
        items: [],
        totals: {}
      };
    }

    const items = this._buildOrderItemsResponse(order);
    const totals = {
      subtotal_amount: order.subtotal_amount || 0,
      discount_amount: order.discount_amount || 0,
      shipping_cost: order.shipping_cost || 0,
      tax_amount: order.tax_amount || 0,
      total_amount: order.total_amount || 0,
      promo_code: order.promo_code || null
    };

    return {
      order,
      items,
      totals
    };
  }

  placeOrder(order_id) {
    const orders = this._getFromStorage('orders');
    const idx = orders.findIndex((o) => o.id === order_id);
    if (idx === -1) {
      return { success: false, message: 'Order not found', order: null };
    }

    const order = orders[idx];
    if (order.status !== 'draft') {
      return { success: false, message: 'Order is not in draft status', order };
    }

    order.status = 'submitted';
    order.updated_at = this._now();
    orders[idx] = order;
    this._saveToStorage('orders', orders);

    return { success: true, message: 'Order placed', order };
  }

  // ---------------------- Wishlist ----------------------

  getWishlistItems() {
    const wishlist = this._getOrCreateWishlist(true);
    return this._buildWishlistItemsResponse(wishlist);
  }

  addProductToWishlist(product_id) {
    const wishlist = this._getOrCreateWishlist(true);
    const wishlistItems = this._getFromStorage('wishlist_items');
    const exists = wishlistItems.find((wi) => wi.wishlist_id === wishlist.id && wi.product_id === product_id);
    if (!exists) {
      const wi = {
        id: this._generateId('wi'),
        wishlist_id: wishlist.id,
        product_id,
        added_at: this._now()
      };
      wishlistItems.push(wi);
      this._saveToStorage('wishlist_items', wishlistItems);
    }
    wishlist.updated_at = this._now();
    const wishlists = this._getFromStorage('wishlist');
    if (!wishlists.length) {
      this._saveToStorage('wishlist', [wishlist]);
    } else {
      const idx = wishlists.findIndex((w) => w.id === wishlist.id);
      if (idx >= 0) wishlists[idx] = wishlist; else wishlists[0] = wishlist;
      this._saveToStorage('wishlist', wishlists);
    }

    const response = this._buildWishlistItemsResponse(wishlist);
    return {
      success: true,
      message: 'Product added to wishlist',
      wishlist: response.wishlist,
      items: response.items
    };
  }

  removeProductFromWishlist(product_id) {
    const wishlist = this._getOrCreateWishlist(false);
    if (!wishlist) {
      return { success: false, message: 'Wishlist not found', wishlist: null, items: [] };
    }

    const wishlistItems = this._getFromStorage('wishlist_items');
    const filtered = wishlistItems.filter(
      (wi) => !(wi.wishlist_id === wishlist.id && wi.product_id === product_id)
    );
    this._saveToStorage('wishlist_items', filtered);

    wishlist.updated_at = this._now();
    const wishlists = this._getFromStorage('wishlist');
    if (!wishlists.length) {
      this._saveToStorage('wishlist', [wishlist]);
    } else {
      const idx = wishlists.findIndex((w) => w.id === wishlist.id);
      if (idx >= 0) wishlists[idx] = wishlist; else wishlists[0] = wishlist;
      this._saveToStorage('wishlist', wishlists);
    }

    const response = this._buildWishlistItemsResponse(wishlist);
    return {
      success: true,
      message: 'Product removed from wishlist',
      wishlist: response.wishlist,
      items: response.items
    };
  }

  addWishlistItemToCart(product_id, quantity = 1) {
    // Delegate to addToCart
    return this.addToCart(product_id, quantity);
  }

  // ---------------------- Comparison ----------------------

  addProductToComparison(product_id) {
    const session = this._getOrCreateComparisonSession();
    if (!session.product_ids.includes(product_id)) {
      session.product_ids.push(product_id);
      const sessions = this._getFromStorage('comparison_sessions');
      if (!sessions.length) {
        this._saveToStorage('comparison_sessions', [session]);
      } else {
        sessions[0] = session;
        this._saveToStorage('comparison_sessions', sessions);
      }
    }
    return session;
  }

  removeProductFromComparison(product_id) {
    const session = this._getOrCreateComparisonSession();
    session.product_ids = (session.product_ids || []).filter((id) => id !== product_id);
    const sessions = this._getFromStorage('comparison_sessions');
    if (!sessions.length) {
      this._saveToStorage('comparison_sessions', [session]);
    } else {
      sessions[0] = session;
      this._saveToStorage('comparison_sessions', sessions);
    }
    return session;
  }

  getComparisonSessionDetails() {
    const session = this._getOrCreateComparisonSession();
    const products = this._getFromStorage('products');
    const brands = this._getFromStorage('brands');

    const productsDetailed = (session.product_ids || []).map((id) => {
      const product = products.find((p) => p.id === id) || null;
      if (!product) {
        return null;
      }
      const brand = brands.find((b) => b.id === product.brand_id) || null;
      return {
        product,
        brand_name: brand ? brand.name : null,
        price: product.price,
        currency: product.currency,
        warranty_months: typeof product.warranty_months === 'number' ? product.warranty_months : null,
        average_rating: typeof product.average_rating === 'number' ? product.average_rating : null,
        rating_count: typeof product.rating_count === 'number' ? product.rating_count : null,
        compatibility_summary: this._getCompatibilitySummary(product)
      };
    }).filter(Boolean);

    return {
      session,
      products: productsDetailed
    };
  }

  // ---------------------- VIN search ----------------------

  submitVINLookup(vin) {
    const vin_mappings = this._getFromStorage('vin_mappings');
    const vehicle_models = this._getFromStorage('vehicle_models');
    const categories = this._getFromStorage('categories');

    const mapping = vin_mappings.find((vm) => vm.vin === vin) || null;
    if (!mapping) {
      return {
        success: false,
        message: 'VIN not found',
        vin_mapping: null,
        vehicle_model: null,
        component_groups: []
      };
    }

    const vehicle_model = vehicle_models.find((vm) => vm.id === mapping.vehicle_model_id) || null;

    const component_groups = categories.map((c) => ({
      category_id: c.id,
      category_name: c.name,
      description: c.description || ''
    }));

    return {
      success: true,
      message: 'VIN decoded',
      vin_mapping: mapping,
      vehicle_model,
      component_groups
    };
  }

  getVINCategoryFilterOptions(vin, category_id) {
    const vin_mappings = this._getFromStorage('vin_mappings');
    const vehicle_models = this._getFromStorage('vehicle_models');
    const products = this._getFromStorage('products');

    const mapping = vin_mappings.find((vm) => vm.vin === vin) || null;
    if (!mapping) {
      return {
        price_range: { min_available: null, max_available: null },
        brand_options: [],
        rating_options: [],
        availability_options: []
      };
    }

    const vehicle_model = vehicle_models.find((vm) => vm.id === mapping.vehicle_model_id) || null;
    const make = mapping.decoded_make || (vehicle_model && vehicle_model.make) || null;
    const model = mapping.decoded_model || (vehicle_model && vehicle_model.model) || null;
    const year = mapping.decoded_year || (vehicle_model && vehicle_model.year_from) || null;

    const categoryIds = this._getCategoryAndDescendants(category_id);

    const compatibleProducts = products.filter((p) => {
      if (!categoryIds.includes(p.category_id)) return false;
      return this._filterByCompatibility(p, {
        truck_make: make,
        truck_model: model,
        truck_year: year
      });
    });

    let minPrice = null;
    let maxPrice = null;
    compatibleProducts.forEach((p) => {
      if (typeof p.price === 'number') {
        if (minPrice === null || p.price < minPrice) minPrice = p.price;
        if (maxPrice === null || p.price > maxPrice) maxPrice = p.price;
      }
    });

    const brands = this._getFromStorage('brands');
    const brandIds = new Set(compatibleProducts.map((p) => p.brand_id));
    const brand_options = brands.filter((b) => brandIds.has(b.id));

    const rating_options = [
      { value: 4, label: '4 stars & up' },
      { value: 3, label: '3 stars & up' },
      { value: 2, label: '2 stars & up' },
      { value: 1, label: '1 star & up' }
    ];

    const availability_options = [
      { value: 'in_stock_only', label: 'In Stock Only' }
    ];

    return {
      price_range: { min_available: minPrice, max_available: maxPrice },
      brand_options,
      rating_options,
      availability_options
    };
  }

  getVINCategoryProducts(vin, category_id, filters, sort, page = 1, page_size = 20) {
    const vin_mappings = this._getFromStorage('vin_mappings');
    const vehicle_models = this._getFromStorage('vehicle_models');
    const products = this._getFromStorage('products');
    const brands = this._getFromStorage('brands');
    const categories = this._getFromStorage('categories');

    const mapping = vin_mappings.find((vm) => vm.vin === vin) || null;
    if (!mapping) {
      return {
        items: [],
        total_count: 0,
        page,
        page_size
      };
    }

    const vehicle_model = vehicle_models.find((vm) => vm.id === mapping.vehicle_model_id) || null;
    const make = mapping.decoded_make || (vehicle_model && vehicle_model.make) || null;
    const model = mapping.decoded_model || (vehicle_model && vehicle_model.model) || null;
    const year = mapping.decoded_year || (vehicle_model && vehicle_model.year_from) || null;

    const categoryIds = this._getCategoryAndDescendants(category_id);

    let matching = products.filter((p) => {
      if (!categoryIds.includes(p.category_id)) return false;
      return this._filterByCompatibility(p, {
        truck_make: make,
        truck_model: model,
        truck_year: year
      });
    });

    // Fallback: if no products match VIN compatibility, show all products in the category
    if (!matching.length) {
      matching = products.filter((p) => categoryIds.includes(p.category_id));
    }

    const extendedFilters = { ...(filters || {}) };
    matching = this._applyCommonProductFilters(matching, extendedFilters);

    if (sort && sort.sort_by) {
      matching = this._applyProductSorting(matching, sort);
    }

    const paged = this._paginate(matching, page, page_size);

    const items = paged.items.map((p) => {
      const brand = brands.find((b) => b.id === p.brand_id) || null;
      const category = categories.find((c) => c.id === p.category_id) || null;
      return {
        product: p,
        brand_name: brand ? brand.name : null,
        category_name: category ? category.name : null,
        primary_image_url: (p.image_urls && p.image_urls[0]) || p.thumbnail_url || null,
        price: p.price,
        currency: p.currency,
        average_rating: typeof p.average_rating === 'number' ? p.average_rating : null,
        rating_count: typeof p.rating_count === 'number' ? p.rating_count : null,
        in_stock: !!p.in_stock,
        free_shipping: !!p.free_shipping,
        compatibility_summary: this._getCompatibilitySummary(p)
      };
    });

    return {
      items,
      total_count: paged.total_count,
      page: paged.page,
      page_size: paged.page_size
    };
  }

  // ---------------------- Quick order ----------------------

  getQuickOrderTemplate() {
    const max_rows = 10;
    const rows = [];
    for (let i = 1; i <= 3; i += 1) {
      rows.push({ row_index: i, part_number: '', quantity: 1 });
    }
    return { max_rows, rows };
  }

  submitQuickOrderRows(rows) {
    const normalizedRows = Array.isArray(rows) ? rows : [];

    const cart = this._getOrCreateCart(true);
    const cartItems = this._getFromStorage('cart_items');

    const row_results = [];

    normalizedRows.forEach((row) => {
      const row_index = row.row_index;
      const part_number = row.part_number;
      const quantity = row.quantity || 0;

      if (!part_number || !String(part_number).trim()) {
        row_results.push({
          row_index,
          part_number,
          quantity,
          status: 'invalid_part',
          message: 'Part number is required',
          product: null,
          cart_item_id: null
        });
        return;
      }

      if (quantity <= 0) {
        row_results.push({
          row_index,
          part_number,
          quantity,
          status: 'invalid_quantity',
          message: 'Quantity must be greater than zero',
          product: null,
          cart_item_id: null
        });
        return;
      }

      const productsFound = this._findProductsByPartNumber(part_number);
      if (!productsFound.length) {
        row_results.push({
          row_index,
          part_number,
          quantity,
          status: 'invalid_part',
          message: 'Part number not found',
          product: null,
          cart_item_id: null
        });
        return;
      }

      const product = productsFound[0];
      if (!product.in_stock) {
        row_results.push({
          row_index,
          part_number,
          quantity,
          status: 'out_of_stock',
          message: 'Product is out of stock',
          product,
          cart_item_id: null
        });
        return;
      }

      let cartItem = cartItems.find((ci) => ci.cart_id === cart.id && ci.product_id === product.id);
      if (cartItem) {
        cartItem.quantity += quantity;
        cartItem.updated_at = this._now();
      } else {
        cartItem = {
          id: this._generateId('ci'),
          cart_id: cart.id,
          product_id: product.id,
          product_name_snapshot: product.name,
          product_part_number_snapshot: product.part_number,
          quantity,
          unit_price: product.price,
          line_subtotal: product.price * quantity,
          free_shipping_snapshot: !!product.free_shipping,
          created_at: this._now(),
          updated_at: this._now()
        };
        cartItems.push(cartItem);
      }

      row_results.push({
        row_index,
        part_number,
        quantity,
        status: 'added',
        message: 'Added to cart',
        product,
        cart_item_id: cartItem.id
      });
    });

    this._saveToStorage('cart_items', cartItems);
    this._recalculateCartTotals(cart);

    const quick_order_session = this._getOrCreateQuickOrderSession(
      normalizedRows.map((r) => ({ part_number: r.part_number, quantity: r.quantity }))
    );

    const cartResponse = this._buildCartResponse(cart);

    return {
      quick_order_session,
      row_results,
      cart: cartResponse.cart,
      items: cartResponse.items,
      totals: cartResponse.totals
    };
  }

  // ---------------------- Tires by size ----------------------

  searchTiresBySize(
    tire_width,
    tire_aspect_ratio,
    tire_rim_diameter,
    filters,
    sort,
    page = 1,
    page_size = 20
  ) {
    const products = this._getFromStorage('products');
    const brands = this._getFromStorage('brands');

    let matching = products.filter((p) => {
      if (p.product_type !== 'tire') return false;
      if (p.tire_width !== tire_width) return false;
      if (p.tire_aspect_ratio !== tire_aspect_ratio) return false;
      if (p.tire_rim_diameter !== tire_rim_diameter) return false;
      return true;
    });

    const extendedFilters = {
      free_shipping: filters && filters.free_shipping,
      in_stock_only: filters && filters.in_stock_only,
      min_load_index: filters && filters.min_load_index,
      max_price: filters && filters.max_price
    };

    // _applyCommonProductFilters doesn't know max_price; handle manually
    matching = matching.filter((p) => {
      if (extendedFilters.free_shipping === true && !p.free_shipping) return false;
      if (extendedFilters.in_stock_only === true && !p.in_stock) return false;
      if (typeof extendedFilters.min_load_index === 'number') {
        const li = typeof p.load_index === 'number' ? p.load_index : 0;
        if (li < extendedFilters.min_load_index) return false;
      }
      if (typeof extendedFilters.max_price === 'number' && p.price > extendedFilters.max_price) return false;
      return true;
    });

    if (sort && sort.sort_by) {
      matching = this._applyProductSorting(matching, sort);
    }

    const paged = this._paginate(matching, page, page_size);

    const items = paged.items.map((p) => {
      const brand = brands.find((b) => b.id === p.brand_id) || null;
      return {
        product: p,
        brand_name: brand ? brand.name : null,
        primary_image_url: (p.image_urls && p.image_urls[0]) || p.thumbnail_url || null,
        price: p.price,
        currency: p.currency,
        average_rating: typeof p.average_rating === 'number' ? p.average_rating : null,
        rating_count: typeof p.rating_count === 'number' ? p.rating_count : null,
        in_stock: !!p.in_stock,
        free_shipping: !!p.free_shipping,
        load_index: typeof p.load_index === 'number' ? p.load_index : null
      };
    });

    return {
      items,
      total_count: paged.total_count,
      page: paged.page,
      page_size: paged.page_size
    };
  }

  getTireSizeOptions() {
    const products = this._getFromStorage('products');
    const widthSet = new Set();
    const aspectSet = new Set();
    const rimSet = new Set();

    products.forEach((p) => {
      if (p.product_type === 'tire') {
        if (typeof p.tire_width === 'number') widthSet.add(p.tire_width);
        if (typeof p.tire_aspect_ratio === 'number') aspectSet.add(p.tire_aspect_ratio);
        if (typeof p.tire_rim_diameter === 'number') rimSet.add(p.tire_rim_diameter);
      }
    });

    return {
      width_options: Array.from(widthSet).sort((a, b) => a - b),
      aspect_ratio_options: Array.from(aspectSet).sort((a, b) => a - b),
      rim_diameter_options: Array.from(rimSet).sort((a, b) => a - b)
    };
  }

  // ---------------------- Static content & contact ----------------------

  getAboutUsContent() {
    return {
      title: 'About Our Truck Parts Store',
      sections: [
        {
          heading: 'Our Mission',
          body_html:
            '<p>We provide high-quality truck spare parts for commercial fleets and owner-operators, focusing on safety, uptime, and total cost of ownership.</p>'
        },
        {
          heading: 'Quality & Certifications',
          body_html:
            '<p>Our suppliers are carefully vetted and many are ISO-certified manufacturers. We stock OEM and premium aftermarket parts for major European and North American truck brands.</p>'
        }
      ]
    };
  }

  getContactInfo() {
    return {
      phone_numbers: [
        { label: 'Sales & Support', number: '+1-800-000-0000' }
      ],
      email_addresses: [
        { label: 'Support', email: 'support@example.com' },
        { label: 'Sales', email: 'sales@example.com' }
      ],
      physical_address: {
        line1: '123 Freight Lane',
        line2: '',
        city: 'Truckville',
        state: 'TX',
        zip: '75001',
        country: 'USA'
      },
      support_hours: {
        timezone: 'America/Chicago',
        entries: [
          { days: 'mon_fri', open_time: '08:00', close_time: '18:00' },
          { days: 'sat', open_time: '09:00', close_time: '14:00' }
        ]
      },
      support_notes: 'For urgent breakdown assistance, please call our support line.'
    };
  }

  submitContactRequest(name, email, phone, subject, message) {
    const contact_requests = this._getFromStorage('contact_requests');
    const ticket_id = this._generateId('ticket');
    contact_requests.push({
      id: ticket_id,
      name,
      email,
      phone,
      subject,
      message,
      created_at: this._now()
    });
    this._saveToStorage('contact_requests', contact_requests);

    return {
      success: true,
      message: 'Your request has been received',
      ticket_id
    };
  }

  getShippingAndReturnsContent() {
    return {
      title: 'Shipping & Returns',
      sections: [
        {
          heading: 'Shipping Options',
          body_html:
            '<p>We offer standard and express shipping within the continental US. Free shipping may be available on selected items or promotions.</p>'
        },
        {
          heading: 'Returns Policy',
          body_html:
            '<p>Most unused items in original packaging can be returned within 30 days of delivery. Special-order and electrical items may be excluded. Please contact support before returning any parts.</p>'
        }
      ]
    };
  }

  getHelpFAQContent() {
    return {
      title: 'Help & FAQ',
      faqs: [
        {
          question: 'How do I use compatibility filters?',
          answer_html:
            '<p>Select your truck make, model, and year from the filters to see only compatible parts. Compatibility information is provided by manufacturers but should always be verified against your VIN or OEM part number.</p>',
          category: 'compatibility_filters'
        },
        {
          question: 'How does VIN search work?',
          answer_html:
            '<p>Enter your full 17-character VIN. We decode it and filter parts based on the decoded vehicle configuration, such as engine and chassis type.</p>',
          category: 'vin_search'
        },
        {
          question: 'How do I apply a promo code?',
          answer_html:
            '<p>On the cart page, enter your promo code in the &quot;Promo code&quot; field and click &quot;Apply&quot;. If the code is valid and your order meets the requirements, the discount will be applied to your totals.</p>',
          category: 'promo_codes'
        }
      ]
    };
  }

  getPrivacyPolicyContent() {
    return {
      title: 'Privacy Policy',
      body_html:
        '<p>We collect only the information necessary to process your orders and improve our services. We do not sell your data to third parties. Cookies are used for session management and analytics. You may contact us to request access to or deletion of your personal data.</p>',
      last_updated: '2024-01-01'
    };
  }

  getTermsAndConditionsContent() {
    return {
      title: 'Terms & Conditions',
      body_html:
        '<p>By using this website you agree to our terms of use and conditions of sale. All parts should be installed by qualified professionals. Our liability is limited to the purchase price of the products. These terms are governed by the laws of the State of Texas.</p>',
      last_updated: '2024-01-01'
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
