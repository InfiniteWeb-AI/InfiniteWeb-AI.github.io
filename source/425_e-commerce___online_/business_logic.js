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

  // -----------------------------
  // Storage helpers
  // -----------------------------

  _initStorage() {
    const ensure = (key, defaultValue) => {
      if (localStorage.getItem(key) === null) {
        localStorage.setItem(key, JSON.stringify(defaultValue));
      }
    };

    // Core entity tables
    ensure('categories', []); // Category
    ensure('products', []); // Product
    ensure('shipping_methods', []); // ShippingMethod
    ensure('gift_options', []); // GiftOption
    ensure('coupons', []); // Coupon

    ensure('carts', []); // Cart
    ensure('cart_items', []); // CartItem

    ensure('wishlists', []); // Wishlist
    ensure('wishlist_items', []); // WishlistItem

    ensure('compare_lists', []); // CompareList
    ensure('compare_items', []); // CompareItem

    ensure('checkout_sessions', []); // CheckoutSession

    // CMS / content-style tables (empty/default, no mocked real content)
    if (localStorage.getItem('homepage_featured_content') === null) {
      localStorage.setItem(
        'homepage_featured_content',
        JSON.stringify({
          featured_products: [],
          sale_highlights: [],
          promotions: [],
          free_shipping_message: ''
        })
      );
    }
    if (localStorage.getItem('about_us_content') === null) {
      localStorage.setItem(
        'about_us_content',
        JSON.stringify({ title: '', body: '', highlights: [] })
      );
    }
    if (localStorage.getItem('contact_info_content') === null) {
      localStorage.setItem(
        'contact_info_content',
        JSON.stringify({
          support_email: '',
          support_phone: '',
          support_hours: '',
          additional_notes: ''
        })
      );
    }
    ensure('faq_content', []);
    if (localStorage.getItem('shipping_returns_content') === null) {
      localStorage.setItem(
        'shipping_returns_content',
        JSON.stringify({
          shipping_policies: '',
          returns_policies: '',
          warranty_policies: ''
        })
      );
    }
    if (localStorage.getItem('privacy_policy_content') === null) {
      localStorage.setItem(
        'privacy_policy_content',
        JSON.stringify({ effective_date: '', body: '' })
      );
    }
    if (localStorage.getItem('terms_content') === null) {
      localStorage.setItem(
        'terms_content',
        JSON.stringify({ effective_date: '', body: '' })
      );
    }

    // Misc tables
    ensure('users', []); // not used, but kept from skeleton
    ensure('contact_form_submissions', []);

    if (localStorage.getItem('idCounter') === null) {
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

  _nowIso() {
    return new Date().toISOString();
  }

  // -----------------------------
  // Internal entity helpers
  // -----------------------------

  _getOrCreateCart() {
    let carts = this._getFromStorage('carts');
    let cart = carts.find(c => c.status === 'open');
    if (!cart) {
      cart = {
        id: this._generateId('cart'),
        items: [], // array of CartItem.id
        subtotal: 0,
        discount_total: 0,
        shipping_cost: 0,
        tax_total: 0,
        total: 0,
        currency: 'usd',
        applied_coupon_code: null,
        shipping_method_id: null,
        gift_message: '',
        status: 'open',
        created_at: this._nowIso(),
        updated_at: this._nowIso()
      };
      carts.push(cart);
      this._saveToStorage('carts', carts);
    }
    return cart;
  }

  _getCartItemsForCart(cartId) {
    const items = this._getFromStorage('cart_items');
    return items.filter(i => i.cart_id === cartId);
  }

  _saveCartAndItems(cart, itemsForCart) {
    // Update carts
    const carts = this._getFromStorage('carts');
    const idx = carts.findIndex(c => c.id === cart.id);
    if (idx >= 0) {
      carts[idx] = cart;
    } else {
      carts.push(cart);
    }
    this._saveToStorage('carts', carts);

    // Update cart_items (keep other carts' items)
    let allItems = this._getFromStorage('cart_items');
    allItems = allItems.filter(i => i.cart_id !== cart.id).concat(itemsForCart);
    this._saveToStorage('cart_items', allItems);
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

  _getWishlistItemsForWishlist(wishlistId) {
    const items = this._getFromStorage('wishlist_items');
    return items.filter(i => i.wishlist_id === wishlistId);
  }

  _saveWishlistAndItems(wishlist, itemsForWishlist) {
    let wishlists = this._getFromStorage('wishlists');
    const idx = wishlists.findIndex(w => w.id === wishlist.id);
    if (idx >= 0) {
      wishlists[idx] = wishlist;
    } else {
      wishlists.push(wishlist);
    }
    this._saveToStorage('wishlists', wishlists);

    let allItems = this._getFromStorage('wishlist_items');
    allItems = allItems.filter(i => i.wishlist_id !== wishlist.id).concat(itemsForWishlist);
    this._saveToStorage('wishlist_items', allItems);
  }

  _getOrCreateCompareList() {
    let lists = this._getFromStorage('compare_lists');
    let list = lists[0];
    if (!list) {
      list = {
        id: this._generateId('compare'),
        items: [],
        created_at: this._nowIso(),
        updated_at: this._nowIso()
      };
      lists.push(list);
      this._saveToStorage('compare_lists', lists);
    }
    return list;
  }

  _getCompareItemsForList(compareListId) {
    const items = this._getFromStorage('compare_items');
    return items.filter(i => i.compare_list_id === compareListId);
  }

  _saveCompareListAndItems(list, itemsForList) {
    let lists = this._getFromStorage('compare_lists');
    const idx = lists.findIndex(l => l.id === list.id);
    if (idx >= 0) {
      lists[idx] = list;
    } else {
      lists.push(list);
    }
    this._saveToStorage('compare_lists', lists);

    let allItems = this._getFromStorage('compare_items');
    allItems = allItems.filter(i => i.compare_list_id !== list.id).concat(itemsForList);
    this._saveToStorage('compare_items', allItems);
  }

  _getOrCreateCheckoutSession(cartIdOptional) {
    const cart = cartIdOptional ? this._getFromStorage('carts').find(c => c.id === cartIdOptional) || this._getOrCreateCart() : this._getOrCreateCart();
    const cartId = cart.id;
    let sessions = this._getFromStorage('checkout_sessions');
    let session = sessions.find(s => s.cart_id === cartId && s.payment_status !== 'completed');
    if (!session) {
      session = {
        id: this._generateId('chk'),
        cart_id: cartId,
        started_at: this._nowIso(),
        updated_at: this._nowIso(),
        contact_email: '',
        contact_phone: '',
        contact_full_name: '',
        shipping_address_line1: '',
        shipping_address_line2: '',
        shipping_city: '',
        shipping_state: '',
        shipping_postal_code: '',
        shipping_country: '',
        shipping_method_id: cart.shipping_method_id || null,
        promo_code_entered: null,
        promo_code_applied: false,
        current_step: 'cart_review',
        payment_method: 'none',
        payment_status: 'not_started',
        order_notes: ''
      };
      sessions.push(session);
      this._saveToStorage('checkout_sessions', sessions);
    }
    return session;
  }

  // Recalculate cart totals based on items, coupon, and shipping
  _recalculateCartTotals(cart) {
    let items = this._getCartItemsForCart(cart.id);
    const giftOptions = this._getFromStorage('gift_options');
    const shippingMethods = this._getFromStorage('shipping_methods');
    const coupons = this._getFromStorage('coupons');

    let subtotal = 0;
    items = items.map(item => {
      let line = item.unit_price * item.quantity;
      if (item.is_gift_wrapped && item.gift_option_id) {
        const giftOption = giftOptions.find(g => g.id === item.gift_option_id && g.active);
        if (giftOption) {
          line += giftOption.price * item.quantity;
        }
      }
      item.line_total = line;
      subtotal += line;
      return item;
    });

    let discountTotal = 0;
    let appliedCoupon = null;
    if (cart.applied_coupon_code) {
      appliedCoupon = coupons.find(
        c => c.code === cart.applied_coupon_code && c.active
      );
      if (appliedCoupon) {
        if (
          (!appliedCoupon.valid_from || new Date(appliedCoupon.valid_from) <= new Date()) &&
          (!appliedCoupon.valid_to || new Date(appliedCoupon.valid_to) >= new Date())
        ) {
          if (!appliedCoupon.min_order_subtotal || subtotal >= appliedCoupon.min_order_subtotal) {
            if (appliedCoupon.discount_type === 'percentage') {
              discountTotal = (subtotal * appliedCoupon.discount_value) / 100;
            } else if (appliedCoupon.discount_type === 'fixed_amount') {
              discountTotal = appliedCoupon.discount_value;
            }
          }
        }
      }
    }

    let shippingCost = 0;
    let shippingMethod = null;
    if (shippingMethods.length > 0) {
      // Resolve selected or default method
      shippingMethod =
        shippingMethods.find(m => m.id === cart.shipping_method_id && m.active) ||
        shippingMethods.find(m => m.is_default && m.active) ||
        shippingMethods.find(m => m.active) ||
        null;
      if (shippingMethod) {
        shippingCost = shippingMethod.base_cost || 0;
        if (
          typeof shippingMethod.free_shipping_min_subtotal === 'number' &&
          subtotal >= shippingMethod.free_shipping_min_subtotal
        ) {
          shippingCost = 0;
        }
      }
    }

    const taxTotal = 0; // Business rules for tax not defined; keep at 0
    let total = subtotal - discountTotal + shippingCost + taxTotal;
    if (total < 0) total = 0;

    cart.subtotal = subtotal;
    cart.discount_total = discountTotal;
    cart.shipping_cost = shippingCost;
    cart.tax_total = taxTotal;
    cart.total = total;
    cart.shipping_method_id = shippingMethod ? shippingMethod.id : cart.shipping_method_id;
    cart.updated_at = this._nowIso();

    this._saveCartAndItems(cart, items);

    return cart;
  }

  _validateAndApplyCoupon(promoCode) {
    const code = (promoCode || '').trim();
    if (!code) {
      return { success: false, message: 'Promo code is required.' };
    }

    const coupons = this._getFromStorage('coupons');
    const coupon = coupons.find(c => c.code === code && c.active);
    if (!coupon) {
      return { success: false, message: 'Invalid promo code.' };
    }

    const now = new Date();
    if (
      (coupon.valid_from && new Date(coupon.valid_from) > now) ||
      (coupon.valid_to && new Date(coupon.valid_to) < now)
    ) {
      return { success: false, message: 'Promo code is not currently valid.' };
    }

    const cart = this._getOrCreateCart();
    const items = this._getCartItemsForCart(cart.id);
    let subtotal = 0;
    const giftOptions = this._getFromStorage('gift_options');
    items.forEach(item => {
      let line = item.unit_price * item.quantity;
      if (item.is_gift_wrapped && item.gift_option_id) {
        const giftOption = giftOptions.find(g => g.id === item.gift_option_id && g.active);
        if (giftOption) {
          line += giftOption.price * item.quantity;
        }
      }
      subtotal += line;
    });

    if (coupon.min_order_subtotal && subtotal < coupon.min_order_subtotal) {
      return {
        success: false,
        message: 'Order subtotal does not meet the minimum required for this promo code.'
      };
    }

    cart.applied_coupon_code = coupon.code;
    this._recalculateCartTotals(cart);

    return {
      success: true,
      message: 'Promo code applied successfully.',
      coupon
    };
  }

  _estimateDeliveryDateForProduct(product, shippingMethod) {
    // Use product.earliest_delivery_date as baseline; adjust slightly for express vs standard
    if (!product || !product.earliest_delivery_date) {
      return null;
    }
    const baseDate = new Date(product.earliest_delivery_date);
    if (!shippingMethod) return baseDate.toISOString();

    // If express, assume 2 days faster where possible
    if (shippingMethod.code === 'express_shipping') {
      baseDate.setDate(baseDate.getDate() - 2);
    }
    return baseDate.toISOString();
  }

  // -----------------------------
  // Interface implementations
  // -----------------------------

  // getCategories(): Category[]
  getCategories() {
    return this._getFromStorage('categories');
  }

  // getHomepageFeaturedContent(): object
  getHomepageFeaturedContent() {
    const stored = localStorage.getItem('homepage_featured_content');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        // fall through
      }
    }
    const fallback = {
      featured_products: [],
      sale_highlights: [],
      promotions: [],
      free_shipping_message: ''
    };
    localStorage.setItem('homepage_featured_content', JSON.stringify(fallback));
    return fallback;
  }

  // getQuickAccessSummary(): {cart_item_count, wishlist_item_count, compare_item_count}
  getQuickAccessSummary() {
    const cart = this._getOrCreateCart();
    const cartItems = this._getCartItemsForCart(cart.id);

    const wishlist = this._getOrCreateWishlist();
    const wishlistItems = this._getWishlistItemsForWishlist(wishlist.id);

    const compareList = this._getOrCreateCompareList();
    const compareItems = this._getCompareItemsForList(compareList.id);

    return {
      cart_item_count: cartItems.length,
      wishlist_item_count: wishlistItems.length,
      compare_item_count: compareItems.length
    };
  }

  // getProductFilterOptions(context, categorySlug?)
  getProductFilterOptions(context, categorySlug) {
    const products = this._getFromStorage('products').filter(p => p.status === 'active');

    let relevant = products;
    if (context === 'category') {
      if (categorySlug && categorySlug !== 'sale') {
        relevant = products.filter(p => p.product_type === categorySlug);
      } else if (categorySlug === 'sale') {
        relevant = products.filter(p => p.on_sale);
      }
    } else if (context === 'sale') {
      relevant = products.filter(p => p.on_sale);
    }
    // context === 'search' => all active products

    let minPrice = null;
    let maxPrice = null;
    relevant.forEach(p => {
      if (typeof p.price === 'number') {
        if (minPrice === null || p.price < minPrice) minPrice = p.price;
        if (maxPrice === null || p.price > maxPrice) maxPrice = p.price;
      }
    });
    if (minPrice === null) minPrice = 0;
    if (maxPrice === null) maxPrice = 0;

    const uniq = arr => Array.from(new Set(arr.filter(v => v !== null && v !== undefined && v !== 'none')));

    const metal_types = uniq(relevant.map(p => p.metal_type));
    const styles = uniq(relevant.map(p => p.style));
    const gemstone_colors = uniq(relevant.map(p => p.gemstone_color));
    const strap_materials = uniq(relevant.map(p => p.strap_material));
    const genders = uniq(relevant.map(p => p.gender));

    const feature_flags = uniq(
      relevant.reduce((acc, p) => {
        if (Array.isArray(p.features)) {
          acc.push(...p.features);
        }
        return acc;
      }, [])
    );

    const hasFreeShipping = relevant.some(p => p.free_shipping_eligible);
    const shipping_options = hasFreeShipping
      ? [{ code: 'free_shipping_only', label: 'Free Shipping' }]
      : [];

    const deliverDatesSet = new Set();
    relevant.forEach(p => {
      if (p.earliest_delivery_date) {
        const d = new Date(p.earliest_delivery_date);
        if (!isNaN(d.getTime())) {
          deliverDatesSet.add(d.toISOString().slice(0, 10));
        }
      }
    });
    const deliver_by_options = Array.from(deliverDatesSet)
      .sort()
      .map(dateStr => ({ date: dateStr, label: 'Deliver by ' + dateStr }));

    let sale_category_product_types = [];
    if (categorySlug === 'sale' || context === 'sale') {
      sale_category_product_types = uniq(relevant.map(p => p.product_type));
    }

    return {
      price: {
        min_allowed: minPrice,
        max_allowed: maxPrice
      },
      rating_options: [3.5, 4.0, 4.5],
      metal_types,
      styles,
      gemstone_colors,
      strap_materials,
      genders,
      feature_flags,
      shipping_options,
      deliver_by_options,
      sale_category_product_types
    };
  }

  // listCategoryProducts(categorySlug, filters?, sort?, page?, pageSize?)
  listCategoryProducts(categorySlug, filters, sort, page = 1, pageSize = 20) {
    const productsAll = this._getFromStorage('products').filter(p => p.status === 'active');
    const categories = this._getFromStorage('categories');

    let products = [];
    if (categorySlug === 'sale') {
      products = productsAll.filter(p => p.on_sale);
    } else {
      products = productsAll.filter(p => p.product_type === categorySlug);
    }

    const f = filters || {};

    products = products.filter(p => {
      if (typeof f.minPrice === 'number' && p.price < f.minPrice) return false;
      if (typeof f.maxPrice === 'number' && p.price > f.maxPrice) return false;
      if (typeof f.minRating === 'number' && typeof p.average_rating === 'number' && p.average_rating < f.minRating) return false;
      if (Array.isArray(f.metalTypes) && f.metalTypes.length && !f.metalTypes.includes(p.metal_type)) return false;
      if (Array.isArray(f.styles) && f.styles.length && !f.styles.includes(p.style)) return false;
      if (Array.isArray(f.gemstoneColors) && f.gemstoneColors.length && !f.gemstoneColors.includes(p.gemstone_color)) return false;
      if (Array.isArray(f.strapMaterials) && f.strapMaterials.length && !f.strapMaterials.includes(p.strap_material)) return false;
      if (Array.isArray(f.genders) && f.genders.length && !f.genders.includes(p.gender)) return false;
      if (f.freeShippingOnly && !p.free_shipping_eligible) return false;
      if (Array.isArray(f.features) && f.features.length) {
        if (!Array.isArray(p.features)) return false;
        const hasAll = f.features.every(ft => p.features.includes(ft));
        if (!hasAll) return false;
      }
      if (f.deliverByDate) {
        if (!p.earliest_delivery_date) return false;
        const prodDate = new Date(p.earliest_delivery_date);
        const cutoff = new Date(f.deliverByDate);
        if (isNaN(prodDate.getTime()) || prodDate > cutoff) return false;
      }
      if (Array.isArray(f.productTypes) && f.productTypes.length && !f.productTypes.includes(p.product_type)) return false;
      return true;
    });

    const cmp = (a, b) => {
      if (sort === 'price_low_to_high') return a.price - b.price;
      if (sort === 'price_high_to_low') return b.price - a.price;
      if (sort === 'rating_high_to_low') {
        const ar = a.average_rating || 0;
        const br = b.average_rating || 0;
        return br - ar;
      }
      if (sort === 'newest') {
        const ad = new Date(a.created_at || 0).getTime();
        const bd = new Date(b.created_at || 0).getTime();
        return bd - ad;
      }
      // best_sellers or unspecified: keep insertion order
      return 0;
    };
    if (sort) {
      products.sort(cmp);
    }

    const total = products.length;
    const start = (page - 1) * pageSize;
    const paged = products.slice(start, start + pageSize);

    const resultProducts = paged.map(p => {
      const category = categories.find(c => c.id === p.category_id) || categories.find(c => c.slug === p.product_type) || null;
      return {
        id: p.id,
        name: p.name,
        price: p.price,
        original_price: p.original_price,
        currency: p.currency,
        product_type: p.product_type,
        category_name: category ? category.name : '',
        on_sale: p.on_sale,
        average_rating: p.average_rating,
        rating_count: p.rating_count,
        metal_type: p.metal_type,
        gemstone_color: p.gemstone_color,
        has_gemstone: p.has_gemstone,
        style: p.style,
        shape: p.shape,
        gender: p.gender,
        strap_material: p.strap_material,
        default_color: p.default_color,
        free_shipping_eligible: p.free_shipping_eligible,
        earliest_delivery_date: p.earliest_delivery_date,
        features: p.features || [],
        thumbnail_image: p.thumbnail_image
      };
    });

    return {
      total,
      page,
      pageSize,
      products: resultProducts
    };
  }

  // searchProducts(query, filters?, sort?, page?, pageSize?)
  searchProducts(query, filters, sort = 'relevance', page = 1, pageSize = 20) {
    const q = (query || '').toLowerCase();
    const productsAll = this._getFromStorage('products').filter(p => p.status === 'active');
    const categories = this._getFromStorage('categories');

    let products = productsAll.filter(p => {
      const text = (
        (p.name || '') + ' ' +
        (p.description || '') + ' ' +
        ((Array.isArray(p.tags) ? p.tags.join(' ') : ''))
      ).toLowerCase();
      return text.includes(q);
    });

    const f = filters || {};

    products = products.filter(p => {
      if (Array.isArray(f.categoryProductTypes) && f.categoryProductTypes.length && !f.categoryProductTypes.includes(p.product_type)) return false;
      if (typeof f.minPrice === 'number' && p.price < f.minPrice) return false;
      if (typeof f.maxPrice === 'number' && p.price > f.maxPrice) return false;
      if (typeof f.minRating === 'number' && typeof p.average_rating === 'number' && p.average_rating < f.minRating) return false;
      if (Array.isArray(f.metalTypes) && f.metalTypes.length && !f.metalTypes.includes(p.metal_type)) return false;
      if (Array.isArray(f.styles) && f.styles.length && !f.styles.includes(p.style)) return false;
      if (Array.isArray(f.gemstoneColors) && f.gemstoneColors.length && !f.gemstoneColors.includes(p.gemstone_color)) return false;
      if (Array.isArray(f.strapMaterials) && f.strapMaterials.length && !f.strapMaterials.includes(p.strap_material)) return false;
      if (f.freeShippingOnly && !p.free_shipping_eligible) return false;
      if (Array.isArray(f.features) && f.features.length) {
        if (!Array.isArray(p.features)) return false;
        const hasAll = f.features.every(ft => p.features.includes(ft));
        if (!hasAll) return false;
      }
      if (f.deliverByDate) {
        if (!p.earliest_delivery_date) return false;
        const prodDate = new Date(p.earliest_delivery_date);
        const cutoff = new Date(f.deliverByDate);
        if (isNaN(prodDate.getTime()) || prodDate > cutoff) return false;
      }
      return true;
    });

    const cmp = (a, b) => {
      if (sort === 'price_low_to_high') return a.price - b.price;
      if (sort === 'price_high_to_low') return b.price - a.price;
      if (sort === 'rating_high_to_low') {
        const ar = a.average_rating || 0;
        const br = b.average_rating || 0;
        return br - ar;
      }
      if (sort === 'newest') {
        const ad = new Date(a.created_at || 0).getTime();
        const bd = new Date(b.created_at || 0).getTime();
        return bd - ad;
      }
      // relevance / best_sellers: keep selection order (already filtered by text)
      return 0;
    };

    if (sort && sort !== 'relevance') {
      products.sort(cmp);
    }

    const total = products.length;
    const start = (page - 1) * pageSize;
    const paged = products.slice(start, start + pageSize);

    const resultProducts = paged.map(p => {
      const category = categories.find(c => c.id === p.category_id) || categories.find(c => c.slug === p.product_type) || null;
      return {
        id: p.id,
        name: p.name,
        price: p.price,
        original_price: p.original_price,
        currency: p.currency,
        product_type: p.product_type,
        category_name: category ? category.name : '',
        on_sale: p.on_sale,
        average_rating: p.average_rating,
        rating_count: p.rating_count,
        metal_type: p.metal_type,
        gemstone_color: p.gemstone_color,
        has_gemstone: p.has_gemstone,
        style: p.style,
        shape: p.shape,
        gender: p.gender,
        strap_material: p.strap_material,
        default_color: p.default_color,
        free_shipping_eligible: p.free_shipping_eligible,
        earliest_delivery_date: p.earliest_delivery_date,
        features: p.features || [],
        thumbnail_image: p.thumbnail_image
      };
    });

    return {
      total,
      page,
      pageSize,
      products: resultProducts
    };
  }

  // getProductDetails(productId)
  getProductDetails(productId) {
    const products = this._getFromStorage('products');
    const categories = this._getFromStorage('categories');
    const p = products.find(pr => pr.id === productId);
    if (!p) {
      return { product: null, shipping_summary: null, policy_summary: null, related_products: [] };
    }

    const category = categories.find(c => c.id === p.category_id) || categories.find(c => c.slug === p.product_type) || null;

    const product = {
      id: p.id,
      name: p.name,
      description: p.description,
      product_type: p.product_type,
      category_name: category ? category.name : '',
      price: p.price,
      original_price: p.original_price,
      currency: p.currency,
      on_sale: p.on_sale,
      average_rating: p.average_rating,
      rating_count: p.rating_count,
      metal_type: p.metal_type,
      gemstone_color: p.gemstone_color,
      has_gemstone: p.has_gemstone,
      style: p.style,
      shape: p.shape,
      gender: p.gender,
      strap_material: p.strap_material,
      default_color: p.default_color,
      color_options: p.color_options || [],
      size_options: p.size_options || [],
      warranty_period_months: p.warranty_period_months,
      warranty_description: p.warranty_description,
      supports_engraving: p.supports_engraving,
      engraving_max_length: p.engraving_max_length,
      engraving_style_options: p.engraving_style_options || [],
      free_shipping_eligible: p.free_shipping_eligible,
      earliest_delivery_date: p.earliest_delivery_date,
      features: p.features || [],
      images: p.images || [],
      thumbnail_image: p.thumbnail_image,
      status: p.status
    };

    const shippingMethods = this._getFromStorage('shipping_methods');
    const defaultShippingMethod =
      shippingMethods.find(m => m.is_default && m.active) || shippingMethods.find(m => m.active) || null;

    const estimateDateIso = this._estimateDeliveryDateForProduct(product, defaultShippingMethod);
    const shipping_summary = {
      is_free_shipping: !!product.free_shipping_eligible,
      delivery_estimate_text: estimateDateIso ? 'Estimated delivery by ' + estimateDateIso.slice(0, 10) : ''
    };

    const policy_summary = {
      return_policy_highlight: '',
      warranty_highlight: product.warranty_description || ''
    };

    const related_products = products
      .filter(rp => rp.id !== p.id && rp.product_type === p.product_type && rp.status === 'active')
      .slice(0, 4);

    return {
      product,
      shipping_summary,
      policy_summary,
      related_products
    };
  }

  // addToCart(productId, quantity=1, selectedSize?, selectedColor?, engravingText?, engravingStyle?, giftOptionId?)
  addToCart(
    productId,
    quantity = 1,
    selectedSize,
    selectedColor,
    engravingText,
    engravingStyle,
    giftOptionId
  ) {
    const products = this._getFromStorage('products');
    const product = products.find(p => p.id === productId && p.status === 'active');
    if (!product) {
      return { success: false, message: 'Product not found or inactive.' };
    }

    if (quantity <= 0) quantity = 1;

    // Validate size
    if (selectedSize && Array.isArray(product.size_options) && product.size_options.length) {
      if (!product.size_options.includes(selectedSize)) {
        return { success: false, message: 'Selected size is not available for this product.' };
      }
    }

    // Validate color
    if (selectedColor && Array.isArray(product.color_options) && product.color_options.length) {
      if (!product.color_options.includes(selectedColor)) {
        return { success: false, message: 'Selected color is not available for this product.' };
      }
    }

    // Validate engraving
    if (engravingText) {
      // Only enforce engraving rules when the product explicitly supports engraving.
      if (product.supports_engraving) {
        if (
          typeof product.engraving_max_length === 'number' &&
          engravingText.length > product.engraving_max_length
        ) {
          return { success: false, message: 'Engraving text exceeds maximum length.' };
        }
        if (!engravingStyle) {
          engravingStyle = 'block';
        }
        if (
          Array.isArray(product.engraving_style_options) &&
          product.engraving_style_options.length &&
          !product.engraving_style_options.includes(engravingStyle)
        ) {
          return { success: false, message: 'Selected engraving style is not available.' };
        }
      } else {
        // For products that do not support engraving, accept text as free-form personalization.
        if (!engravingStyle) {
          engravingStyle = 'block';
        }
      }
    }

    // Validate gift option
    let giftOption = null;
    if (giftOptionId) {
      const giftOptions = this._getFromStorage('gift_options');
      giftOption = giftOptions.find(g => g.id === giftOptionId && g.active);
      if (!giftOption) {
        return { success: false, message: 'Invalid gift option.' };
      }
    }

    const cart = this._getOrCreateCart();
    let items = this._getCartItemsForCart(cart.id);

    const cartItem = {
      id: this._generateId('cartitem'),
      cart_id: cart.id,
      product_id: product.id,
      product_name: product.name,
      product_type: product.product_type,
      unit_price: product.price,
      quantity: quantity,
      line_total: product.price * quantity,
      selected_size: selectedSize || null,
      selected_color: selectedColor || null,
      engraving_text: engravingText || null,
      engraving_style: engravingText ? engravingStyle || 'block' : 'none',
      gift_option_id: giftOption ? giftOption.id : null,
      is_gift_wrapped: !!giftOption,
      added_at: this._nowIso()
    };

    items.push(cartItem);
    cart.items = items.map(i => i.id);

    this._saveCartAndItems(cart, items);
    const updatedCart = this._recalculateCartTotals(cart);

    const cartItemsAfter = this._getCartItemsForCart(cart.id);
    const itemCount = cartItemsAfter.reduce((acc, it) => acc + (it.quantity || 0), 0);

    return {
      success: true,
      message: 'Item added to cart.',
      cart_summary: {
        cart_id: updatedCart.id,
        item_count: itemCount,
        subtotal: updatedCart.subtotal,
        discount_total: updatedCart.discount_total,
        shipping_cost: updatedCart.shipping_cost,
        tax_total: updatedCart.tax_total,
        total: updatedCart.total,
        currency: updatedCart.currency
      },
      added_item: {
        cart_item_id: cartItem.id,
        product_id: cartItem.product_id,
        product_name: cartItem.product_name,
        product_type: cartItem.product_type,
        unit_price: cartItem.unit_price,
        quantity: cartItem.quantity,
        line_total: cartItem.line_total,
        selected_size: cartItem.selected_size,
        selected_color: cartItem.selected_color,
        engraving_text: cartItem.engraving_text,
        engraving_style: cartItem.engraving_style,
        gift_option_id: cartItem.gift_option_id,
        is_gift_wrapped: cartItem.is_gift_wrapped
      }
    };
  }

  // getCartSummary()
  getCartSummary() {
    const cart = this._getOrCreateCart();
    const updatedCart = this._recalculateCartTotals(cart);

    const cartItems = this._getCartItemsForCart(updatedCart.id);
    const products = this._getFromStorage('products');
    const giftOptions = this._getFromStorage('gift_options');
    const shippingMethods = this._getFromStorage('shipping_methods');

    const shippingMethod = shippingMethods.find(m => m.id === updatedCart.shipping_method_id) || null;

    const items = cartItems.map(ci => {
      const product = products.find(p => p.id === ci.product_id) || null;
      const giftOption = ci.gift_option_id
        ? giftOptions.find(g => g.id === ci.gift_option_id) || null
        : null;
      return {
        cart_item_id: ci.id,
        product_id: ci.product_id,
        product_name: ci.product_name,
        product_type: ci.product_type,
        unit_price: ci.unit_price,
        quantity: ci.quantity,
        line_total: ci.line_total,
        selected_size: ci.selected_size,
        selected_color: ci.selected_color,
        engraving_text: ci.engraving_text,
        engraving_style: ci.engraving_style,
        gift_option: giftOption
          ? {
              id: giftOption.id,
              code: giftOption.code,
              name: giftOption.name,
              price: giftOption.price
            }
          : null,
        is_gift_wrapped: !!ci.is_gift_wrapped,
        thumbnail_image: product ? product.thumbnail_image : null,
        // Foreign key resolution
        product: product
      };
    });

    return {
      cart_id: updatedCart.id,
      status: updatedCart.status,
      currency: updatedCart.currency,
      subtotal: updatedCart.subtotal,
      discount_total: updatedCart.discount_total,
      shipping_cost: updatedCart.shipping_cost,
      tax_total: updatedCart.tax_total,
      total: updatedCart.total,
      applied_coupon_code: updatedCart.applied_coupon_code || null,
      shipping_method: shippingMethod
        ? {
            id: shippingMethod.id,
            code: shippingMethod.code,
            name: shippingMethod.name,
            calculated_cost: updatedCart.shipping_cost
          }
        : null,
      items
    };
  }

  // updateCartItemQuantity(cartItemId, quantity)
  updateCartItemQuantity(cartItemId, quantity) {
    let allItems = this._getFromStorage('cart_items');
    const idx = allItems.findIndex(i => i.id === cartItemId);
    if (idx === -1) {
      return { success: false, message: 'Cart item not found.' };
    }
    if (quantity <= 0) quantity = 1;

    const item = allItems[idx];
    item.quantity = quantity;
    // line_total recalculated by _recalculateCartTotals
    allItems[idx] = item;
    this._saveToStorage('cart_items', allItems);

    const carts = this._getFromStorage('carts');
    const cart = carts.find(c => c.id === item.cart_id);
    if (!cart) {
      return { success: false, message: 'Associated cart not found.' };
    }

    const updatedCart = this._recalculateCartTotals(cart);

    return {
      success: true,
      message: 'Cart item quantity updated.',
      cart: {
        subtotal: updatedCart.subtotal,
        discount_total: updatedCart.discount_total,
        shipping_cost: updatedCart.shipping_cost,
        tax_total: updatedCart.tax_total,
        total: updatedCart.total
      }
    };
  }

  // removeCartItem(cartItemId)
  removeCartItem(cartItemId) {
    let allItems = this._getFromStorage('cart_items');
    const item = allItems.find(i => i.id === cartItemId);
    if (!item) {
      return { success: false, message: 'Cart item not found.' };
    }
    const cartId = item.cart_id;

    // Snapshot of cart items for this cart before removal
    const itemsInCartBefore = allItems.filter(i => i.cart_id === cartId);
    const cartSizeBefore = itemsInCartBefore.length;
    const removedWasMostExpensive = itemsInCartBefore.every(i => i.unit_price <= item.unit_price);

    allItems = allItems.filter(i => i.id !== cartItemId);
    this._saveToStorage('cart_items', allItems);

    let carts = this._getFromStorage('carts');
    const cartIdx = carts.findIndex(c => c.id === cartId);
    if (cartIdx === -1) {
      return { success: false, message: 'Associated cart not found.' };
    }
    const cart = carts[cartIdx];
    cart.items = (cart.items || []).filter(id => id !== cartItemId);
    carts[cartIdx] = cart;
    this._saveToStorage('carts', carts);

    const updatedCart = this._recalculateCartTotals(cart);
    const remainingItems = this._getCartItemsForCart(cart.id);
    const itemCount = remainingItems.reduce((acc, it) => acc + (it.quantity || 0), 0);

    // Instrumentation for task completion tracking
    try {
      const remaining_cart_item_ids = remainingItems.map(it => it.id);
      const remaining_product_ids = remainingItems.map(it => it.product_id);
      const snapshot = {
        cart_id: cart.id,
        cart_size_before: cartSizeBefore,
        removed_cart_item_id: cartItemId,
        removed_product_id: item.product_id,
        removed_unit_price: item.unit_price,
        remaining_cart_item_ids,
        remaining_product_ids,
        removed_was_most_expensive: removedWasMostExpensive,
        timestamp: new Date().toISOString()
      };
      localStorage.setItem('task8_lastRemovalSnapshot', JSON.stringify(snapshot));
    } catch (e) {
      try {
        console.error('Instrumentation error:', e);
      } catch (e2) {}
    }

    return {
      success: true,
      message: 'Cart item removed.',
      cart: {
        item_count: itemCount,
        subtotal: updatedCart.subtotal,
        discount_total: updatedCart.discount_total,
        shipping_cost: updatedCart.shipping_cost,
        tax_total: updatedCart.tax_total,
        total: updatedCart.total
      }
    };
  }

  // getGiftOptions()
  getGiftOptions() {
    const giftOptions = this._getFromStorage('gift_options');
    return giftOptions.filter(g => g.active);
  }

  // setCartItemGiftOption(cartItemId, giftOptionId, isGiftWrapped=true)
  setCartItemGiftOption(cartItemId, giftOptionId, isGiftWrapped = true) {
    let allItems = this._getFromStorage('cart_items');
    const idx = allItems.findIndex(i => i.id === cartItemId);
    if (idx === -1) {
      return { success: false, message: 'Cart item not found.' };
    }

    const giftOptions = this._getFromStorage('gift_options');
    const giftOption = giftOptions.find(g => g.id === giftOptionId && g.active);
    if (!giftOption) {
      return { success: false, message: 'Invalid gift option.' };
    }

    const item = allItems[idx];
    item.gift_option_id = giftOptionId;
    item.is_gift_wrapped = !!isGiftWrapped;
    allItems[idx] = item;
    this._saveToStorage('cart_items', allItems);

    const carts = this._getFromStorage('carts');
    const cart = carts.find(c => c.id === item.cart_id);
    if (!cart) {
      return { success: false, message: 'Associated cart not found.' };
    }

    const updatedCart = this._recalculateCartTotals(cart);

    return {
      success: true,
      message: 'Gift option updated for cart item.',
      cart: {
        subtotal: updatedCart.subtotal,
        discount_total: updatedCart.discount_total,
        shipping_cost: updatedCart.shipping_cost,
        tax_total: updatedCart.tax_total,
        total: updatedCart.total
      }
    };
  }

  // setCartGiftMessage(giftMessage)
  setCartGiftMessage(giftMessage) {
    let carts = this._getFromStorage('carts');
    let cart = carts.find(c => c.status === 'open');
    if (!cart) {
      cart = this._getOrCreateCart();
      carts = this._getFromStorage('carts');
    }
    cart.gift_message = giftMessage || '';
    cart.updated_at = this._nowIso();
    const idx = carts.findIndex(c => c.id === cart.id);
    if (idx >= 0) carts[idx] = cart;
    this._saveToStorage('carts', carts);
    return { success: true };
  }

  // getAvailableShippingMethods()
  getAvailableShippingMethods() {
    const methods = this._getFromStorage('shipping_methods').filter(m => m.active);
    const cart = this._getOrCreateCart();
    const recalced = this._recalculateCartTotals(cart);

    return methods.map(m => {
      let cost = m.base_cost || 0;
      if (
        typeof m.free_shipping_min_subtotal === 'number' &&
        recalced.subtotal >= m.free_shipping_min_subtotal
      ) {
        cost = 0;
      }
      return {
        id: m.id,
        code: m.code,
        name: m.name,
        description: m.description,
        estimated_days_min: m.estimated_days_min,
        estimated_days_max: m.estimated_days_max,
        base_cost: m.base_cost,
        calculated_cost: cost,
        is_default: m.is_default,
        active: m.active
      };
    });
  }

  // startCheckoutFromCart()
  startCheckoutFromCart() {
    const cart = this._getOrCreateCart();
    const updatedCart = this._recalculateCartTotals(cart);
    const session = this._getOrCreateCheckoutSession(updatedCart.id);

    const cartItems = this._getCartItemsForCart(updatedCart.id);
    const subtotal = updatedCart.subtotal;
    const discount_total = updatedCart.discount_total;
    const shipping_cost = updatedCart.shipping_cost;
    const tax_total = updatedCart.tax_total;
    const total = updatedCart.total;

    const order_summary = {
      subtotal,
      discount_total,
      shipping_cost,
      tax_total,
      total,
      currency: updatedCart.currency
    };

    const shippingMethods = this._getFromStorage('shipping_methods');
    const shippingMethod = shippingMethods.find(m => m.id === session.shipping_method_id) || null;

    return {
      checkout_session: {
        ...session,
        // Foreign key resolution for convenience
        cart: updatedCart,
        shipping_method: shippingMethod
      },
      order_summary
    };
  }

  // getCheckoutSession()
  getCheckoutSession() {
    const cart = this._getOrCreateCart();
    const updatedCart = this._recalculateCartTotals(cart);
    const session = this._getOrCreateCheckoutSession(updatedCart.id);

    const cartItems = this._getCartItemsForCart(updatedCart.id);

    const items = cartItems.map(ci => ({
      cart_item_id: ci.id,
      product_name: ci.product_name,
      product_type: ci.product_type,
      unit_price: ci.unit_price,
      quantity: ci.quantity,
      line_total: ci.line_total
    }));

    const order_summary = {
      items,
      subtotal: updatedCart.subtotal,
      discount_total: updatedCart.discount_total,
      shipping_cost: updatedCart.shipping_cost,
      tax_total: updatedCart.tax_total,
      total: updatedCart.total,
      currency: updatedCart.currency,
      applied_coupon_code: updatedCart.applied_coupon_code || null
    };

    const shippingMethods = this._getFromStorage('shipping_methods');
    const shippingMethod = shippingMethods.find(m => m.id === session.shipping_method_id) || null;

    return {
      checkout_session: {
        ...session,
        cart: updatedCart,
        shipping_method: shippingMethod
      },
      order_summary
    };
  }

  // updateCheckoutContactInfo(email, phone, fullName?)
  updateCheckoutContactInfo(email, phone, fullName) {
    const cart = this._getOrCreateCart();
    let sessions = this._getFromStorage('checkout_sessions');
    let session = sessions.find(s => s.cart_id === cart.id && s.payment_status !== 'completed');
    if (!session) {
      session = this._getOrCreateCheckoutSession(cart.id);
      sessions = this._getFromStorage('checkout_sessions');
      session = sessions.find(s => s.cart_id === cart.id && s.payment_status !== 'completed');
    }

    session.contact_email = email;
    session.contact_phone = phone;
    session.contact_full_name = fullName || session.contact_full_name;
    if (session.current_step === 'cart_review') {
      session.current_step = 'contact_info';
    }
    session.updated_at = this._nowIso();

    const idx = sessions.findIndex(s => s.id === session.id);
    if (idx >= 0) sessions[idx] = session;
    this._saveToStorage('checkout_sessions', sessions);

    return { checkout_session: session };
  }

  // updateCheckoutShippingAddress({ line1, line2, city, state, postalCode, country })
  updateCheckoutShippingAddress(shippingAddress) {
    const cart = this._getOrCreateCart();
    let sessions = this._getFromStorage('checkout_sessions');
    let session = sessions.find(s => s.cart_id === cart.id && s.payment_status !== 'completed');
    if (!session) {
      session = this._getOrCreateCheckoutSession(cart.id);
      sessions = this._getFromStorage('checkout_sessions');
      session = sessions.find(s => s.cart_id === cart.id && s.payment_status !== 'completed');
    }

    session.shipping_address_line1 = shippingAddress.line1 || '';
    session.shipping_address_line2 = shippingAddress.line2 || '';
    session.shipping_city = shippingAddress.city || '';
    session.shipping_state = shippingAddress.state || '';
    session.shipping_postal_code = shippingAddress.postalCode || '';
    session.shipping_country = shippingAddress.country || '';
    session.updated_at = this._nowIso();

    const idx = sessions.findIndex(s => s.id === session.id);
    if (idx >= 0) sessions[idx] = session;
    this._saveToStorage('checkout_sessions', sessions);

    return { checkout_session: session };
  }

  // selectCheckoutShippingMethod(shippingMethodId)
  selectCheckoutShippingMethod(shippingMethodId) {
    const shippingMethods = this._getFromStorage('shipping_methods');
    const method = shippingMethods.find(m => m.id === shippingMethodId && m.active);
    if (!method) {
      return { checkout_session: null, order_summary: { shipping_cost: 0, total: 0 } };
    }

    const cart = this._getOrCreateCart();
    cart.shipping_method_id = method.id;
    const updatedCart = this._recalculateCartTotals(cart);

    let sessions = this._getFromStorage('checkout_sessions');
    let session = sessions.find(s => s.cart_id === cart.id && s.payment_status !== 'completed');
    if (!session) {
      session = this._getOrCreateCheckoutSession(cart.id);
      sessions = this._getFromStorage('checkout_sessions');
      session = sessions.find(s => s.cart_id === cart.id && s.payment_status !== 'completed');
    }

    session.shipping_method_id = method.id;
    if (session.current_step === 'contact_info') {
      session.current_step = 'shipping_method';
    }
    session.updated_at = this._nowIso();
    const idx = sessions.findIndex(s => s.id === session.id);
    if (idx >= 0) sessions[idx] = session;
    this._saveToStorage('checkout_sessions', sessions);

    return {
      checkout_session: {
        ...session,
        cart: updatedCart,
        shipping_method: method
      },
      order_summary: {
        shipping_cost: updatedCart.shipping_cost,
        total: updatedCart.total
      }
    };
  }

  // applyPromoCode(promoCode)
  applyPromoCode(promoCode) {
    const validation = this._validateAndApplyCoupon(promoCode);
    const cart = this._getOrCreateCart();
    const updatedCart = this._recalculateCartTotals(cart);

    let sessions = this._getFromStorage('checkout_sessions');
    let session = sessions.find(s => s.cart_id === cart.id && s.payment_status !== 'completed');
    if (!session) {
      session = this._getOrCreateCheckoutSession(cart.id);
      sessions = this._getFromStorage('checkout_sessions');
      session = sessions.find(s => s.cart_id === cart.id && s.payment_status !== 'completed');
    }

    session.promo_code_entered = promoCode;
    session.promo_code_applied = validation.success;
    session.updated_at = this._nowIso();

    const idx = sessions.findIndex(s => s.id === session.id);
    if (idx >= 0) sessions[idx] = session;
    this._saveToStorage('checkout_sessions', sessions);

    return {
      success: validation.success,
      message: validation.message,
      checkout_session: session,
      order_summary: {
        subtotal: updatedCart.subtotal,
        discount_total: updatedCart.discount_total,
        shipping_cost: updatedCart.shipping_cost,
        tax_total: updatedCart.tax_total,
        total: updatedCart.total,
        currency: updatedCart.currency
      }
    };
  }

  // proceedToNextCheckoutStep()
  proceedToNextCheckoutStep() {
    const cart = this._getOrCreateCart();
    let sessions = this._getFromStorage('checkout_sessions');
    let session = sessions.find(s => s.cart_id === cart.id && s.payment_status !== 'completed');
    if (!session) {
      session = this._getOrCreateCheckoutSession(cart.id);
      sessions = this._getFromStorage('checkout_sessions');
      session = sessions.find(s => s.cart_id === cart.id && s.payment_status !== 'completed');
    }

    const order = ['cart_review', 'contact_info', 'shipping_method', 'payment', 'review', 'complete'];
    const idx = order.indexOf(session.current_step);
    if (idx >= 0 && idx < order.length - 1) {
      session.current_step = order[idx + 1];
    }
    if (session.current_step === 'payment' && session.payment_status === 'not_started') {
      session.payment_status = 'pending';
    }
    session.updated_at = this._nowIso();

    const idxSession = sessions.findIndex(s => s.id === session.id);
    if (idxSession >= 0) sessions[idxSession] = session;
    this._saveToStorage('checkout_sessions', sessions);

    return { checkout_session: session };
  }

  // getWishlist()
  getWishlist() {
    const wishlist = this._getOrCreateWishlist();
    const wishlistItems = this._getWishlistItemsForWishlist(wishlist.id);
    const products = this._getFromStorage('products');

    const items = wishlistItems.map(wi => {
      const product = products.find(p => p.id === wi.product_id) || null;
      return {
        wishlist_item_id: wi.id,
        product_id: wi.product_id,
        product_name: wi.product_name,
        product_type: wi.product_type,
        price: product ? product.price : null,
        currency: product ? product.currency : 'usd',
        metal_type: product ? product.metal_type : null,
        gemstone_color: product ? product.gemstone_color : null,
        average_rating: product ? product.average_rating : null,
        rating_count: product ? product.rating_count : null,
        thumbnail_image: product ? product.thumbnail_image : null,
        notes: wi.notes || '',
        // Foreign key resolution
        product
      };
    });

    return {
      wishlist_id: wishlist.id,
      items
    };
  }

  // addProductToWishlist(productId)
  addProductToWishlist(productId) {
    const products = this._getFromStorage('products');
    const product = products.find(p => p.id === productId && p.status === 'active');
    if (!product) {
      return {
        wishlist: { wishlist_id: null, item_count: 0 },
        added_item: null
      };
    }

    const wishlist = this._getOrCreateWishlist();
    let items = this._getWishlistItemsForWishlist(wishlist.id);

    let item = items.find(i => i.product_id === product.id);
    if (!item) {
      item = {
        id: this._generateId('wishlistitem'),
        wishlist_id: wishlist.id,
        product_id: product.id,
        product_name: product.name,
        product_type: product.product_type,
        added_at: this._nowIso(),
        notes: ''
      };
      items.push(item);
      wishlist.items = items.map(i => i.id);
      wishlist.updated_at = this._nowIso();
      this._saveWishlistAndItems(wishlist, items);
    }

    return {
      wishlist: {
        wishlist_id: wishlist.id,
        item_count: items.length
      },
      added_item: item
    };
  }

  // removeWishlistItem(wishlistItemId)
  removeWishlistItem(wishlistItemId) {
    const wishlist = this._getOrCreateWishlist();
    let items = this._getWishlistItemsForWishlist(wishlist.id);
    const before = items.length;
    items = items.filter(i => i.id !== wishlistItemId);
    wishlist.items = items.map(i => i.id);
    wishlist.updated_at = this._nowIso();
    this._saveWishlistAndItems(wishlist, items);

    const success = items.length < before;
    return {
      wishlist: {
        wishlist_id: wishlist.id,
        item_count: items.length
      },
      success
    };
  }

  // moveWishlistItemToCart(wishlistItemId, quantity=1, selectedSize?, selectedColor?, engravingText?, engravingStyle?, giftOptionId?)
  moveWishlistItemToCart(
    wishlistItemId,
    quantity = 1,
    selectedSize,
    selectedColor,
    engravingText,
    engravingStyle,
    giftOptionId
  ) {
    const wishlist = this._getOrCreateWishlist();
    let items = this._getWishlistItemsForWishlist(wishlist.id);
    const wi = items.find(i => i.id === wishlistItemId);
    if (!wi) {
      return {
        cart: { cart_id: null, item_count: 0 },
        wishlist: { wishlist_id: wishlist.id, item_count: items.length },
        success: false
      };
    }

    // Add to cart
    const addResult = this.addToCart(
      wi.product_id,
      quantity,
      selectedSize,
      selectedColor,
      engravingText,
      engravingStyle,
      giftOptionId
    );
    if (!addResult.success) {
      return {
        cart: { cart_id: null, item_count: 0 },
        wishlist: { wishlist_id: wishlist.id, item_count: items.length },
        success: false
      };
    }

    // Remove from wishlist
    items = items.filter(i => i.id !== wishlistItemId);
    wishlist.items = items.map(i => i.id);
    wishlist.updated_at = this._nowIso();
    this._saveWishlistAndItems(wishlist, items);

    const cart = this._getOrCreateCart();
    const cartItems = this._getCartItemsForCart(cart.id);
    const itemCount = cartItems.reduce((acc, it) => acc + (it.quantity || 0), 0);

    return {
      cart: {
        cart_id: cart.id,
        item_count: itemCount
      },
      wishlist: {
        wishlist_id: wishlist.id,
        item_count: items.length
      },
      success: true
    };
  }

  // getCompareList()
  getCompareList() {
    const list = this._getOrCreateCompareList();
    const compareItems = this._getCompareItemsForList(list.id);
    const products = this._getFromStorage('products');

    const items = compareItems.map(ci => {
      const product = products.find(p => p.id === ci.product_id) || null;
      return {
        compare_item_id: ci.id,
        product_id: ci.product_id,
        product_name: ci.product_name,
        product_type: ci.product_type,
        price: product ? product.price : null,
        currency: product ? product.currency : 'usd',
        metal_type: product ? product.metal_type : null,
        gemstone_color: product ? product.gemstone_color : null,
        style: product ? product.style : null,
        average_rating: product ? product.average_rating : null,
        rating_count: product ? product.rating_count : null,
        warranty_period_months: product ? product.warranty_period_months : null,
        warranty_description: product ? product.warranty_description : null,
        free_shipping_eligible: product ? product.free_shipping_eligible : null,
        features: product ? product.features || [] : [],
        thumbnail_image: product ? product.thumbnail_image : null,
        // Foreign key resolution
        product
      };
    });

    return {
      compare_list_id: list.id,
      items
    };
  }

  // addProductToCompareList(productId)
  addProductToCompareList(productId) {
    const products = this._getFromStorage('products');
    const product = products.find(p => p.id === productId && p.status === 'active');
    if (!product) {
      const list = this._getOrCreateCompareList();
      const items = this._getCompareItemsForList(list.id);
      return {
        compare_list: {
          compare_list_id: list.id,
          item_count: items.length
        }
      };
    }

    const list = this._getOrCreateCompareList();
    let items = this._getCompareItemsForList(list.id);

    let item = items.find(i => i.product_id === product.id);
    if (!item) {
      item = {
        id: this._generateId('compareitem'),
        compare_list_id: list.id,
        product_id: product.id,
        product_name: product.name,
        product_type: product.product_type,
        added_at: this._nowIso()
      };
      items.push(item);
      list.items = items.map(i => i.id);
      list.updated_at = this._nowIso();
      this._saveCompareListAndItems(list, items);
    }

    return {
      compare_list: {
        compare_list_id: list.id,
        item_count: items.length
      }
    };
  }

  // removeCompareItem(compareItemId)
  removeCompareItem(compareItemId) {
    const list = this._getOrCreateCompareList();
    let items = this._getCompareItemsForList(list.id);
    const before = items.length;
    items = items.filter(i => i.id !== compareItemId);
    list.items = items.map(i => i.id);
    list.updated_at = this._nowIso();
    this._saveCompareListAndItems(list, items);

    const success = items.length < before;
    return {
      compare_list: {
        compare_list_id: list.id,
        item_count: items.length
      },
      success
    };
  }

  // clearCompareList()
  clearCompareList() {
    const list = this._getOrCreateCompareList();
    let allItems = this._getFromStorage('compare_items');
    allItems = allItems.filter(i => i.compare_list_id !== list.id);
    this._saveToStorage('compare_items', allItems);

    list.items = [];
    list.updated_at = this._nowIso();
    let lists = this._getFromStorage('compare_lists');
    const idx = lists.findIndex(l => l.id === list.id);
    if (idx >= 0) lists[idx] = list;
    this._saveToStorage('compare_lists', lists);

    return {
      compare_list_id: list.id,
      item_count: 0
    };
  }

  // getAboutUsContent()
  getAboutUsContent() {
    const stored = localStorage.getItem('about_us_content');
    return stored ? JSON.parse(stored) : { title: '', body: '', highlights: [] };
  }

  // getContactInfo()
  getContactInfo() {
    const stored = localStorage.getItem('contact_info_content');
    return stored
      ? JSON.parse(stored)
      : { support_email: '', support_phone: '', support_hours: '', additional_notes: '' };
  }

  // submitContactForm(name, email, phone?, topic?, message)
  submitContactForm(name, email, phone, topic, message) {
    const submissions = this._getFromStorage('contact_form_submissions');
    submissions.push({
      id: this._generateId('contact'),
      name,
      email,
      phone: phone || '',
      topic: topic || '',
      message,
      submitted_at: this._nowIso()
    });
    this._saveToStorage('contact_form_submissions', submissions);
    return {
      success: true,
      message: 'Your message has been received.'
    };
  }

  // getHelpFaqContent()
  getHelpFaqContent() {
    return this._getFromStorage('faq_content');
  }

  // getShippingAndReturnsContent()
  getShippingAndReturnsContent() {
    const stored = localStorage.getItem('shipping_returns_content');
    return stored
      ? JSON.parse(stored)
      : { shipping_policies: '', returns_policies: '', warranty_policies: '' };
  }

  // getPrivacyPolicyContent()
  getPrivacyPolicyContent() {
    const stored = localStorage.getItem('privacy_policy_content');
    return stored ? JSON.parse(stored) : { effective_date: '', body: '' };
  }

  // getTermsAndConditionsContent()
  getTermsAndConditionsContent() {
    const stored = localStorage.getItem('terms_content');
    return stored ? JSON.parse(stored) : { effective_date: '', body: '' };
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