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

  // ---------------------- Storage helpers ----------------------

  _initStorage() {
    const tableKeys = [
      'users',
      'brands',
      'categories',
      'products',
      'product_variants',
      'reviews',
      'cart',
      'cart_items',
      'wishlist',
      'wishlist_items',
      'coupons',
      'shipping_methods',
      'checkout_sessions',
      'static_pages',
      'faq_entries',
      'contact_info',
      'contact_requests',
      'recently_viewed_products'
    ];

    for (let i = 0; i < tableKeys.length; i++) {
      const key = tableKeys[i];
      if (localStorage.getItem(key) === null) {
        // cart, wishlist, checkout_sessions etc. start empty (null or [])
        if (key === 'cart' || key === 'wishlist' || key === 'contact_info') {
          localStorage.setItem(key, 'null');
        } else if (key === 'checkout_sessions') {
          localStorage.setItem(key, JSON.stringify([]));
        } else {
          localStorage.setItem(key, JSON.stringify([]));
        }
      }
    }

    if (localStorage.getItem('idCounter') === null) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, defaultValue) {
    const data = localStorage.getItem(key);
    if (data === null || data === undefined) {
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

  // ---------------------- Generic helpers ----------------------

  _findById(array, id) {
    if (!array || !id) return null;
    for (let i = 0; i < array.length; i++) {
      if (array[i] && array[i].id === id) return array[i];
    }
    return null;
  }

  _getCategories() {
    return this._getFromStorage('categories', []);
  }

  _getBrands() {
    return this._getFromStorage('brands', []);
  }

  _getProducts() {
    return this._getFromStorage('products', []);
  }

  _getProductVariants() {
    return this._getFromStorage('product_variants', []);
  }

  _getReviews() {
    return this._getFromStorage('reviews', []);
  }

  _getCoupons() {
    return this._getFromStorage('coupons', []);
  }

  _getShippingMethods() {
    return this._getFromStorage('shipping_methods', []);
  }

  _getTopLevelCategoryIdsBySlug(slug) {
    const categories = this._getCategories();
    const roots = [];
    for (let i = 0; i < categories.length; i++) {
      const c = categories[i];
      if (c && c.slug === slug && !c.parent_category_id) {
        roots.push(c.id);
      }
    }
    return roots;
  }

  _getDescendantCategoryIds(rootIds) {
    const categories = this._getCategories();
    const result = [];
    const queue = [];
    for (let i = 0; i < rootIds.length; i++) {
      queue.push(rootIds[i]);
      result.push(rootIds[i]);
    }
    while (queue.length) {
      const currentId = queue.shift();
      for (let j = 0; j < categories.length; j++) {
        const cat = categories[j];
        if (cat && cat.parent_category_id === currentId) {
          result.push(cat.id);
          queue.push(cat.id);
        }
      }
    }
    return result;
  }

  _getAllCategoryIdsForSlugHierarchy(slug) {
    const roots = this._getTopLevelCategoryIdsBySlug(slug);
    if (!roots.length) return [];
    return this._getDescendantCategoryIds(roots);
  }

  _getCategoryById(id) {
    const categories = this._getCategories();
    return this._findById(categories, id);
  }

  _getBrandById(id) {
    const brands = this._getBrands();
    return this._findById(brands, id);
  }

  _getProductById(productId) {
    const products = this._getProducts();
    return this._findById(products, productId);
  }

  _getVariantsForProduct(productId) {
    const all = this._getProductVariants();
    const result = [];
    for (let i = 0; i < all.length; i++) {
      if (all[i].product_id === productId) {
        result.push(all[i]);
      }
    }
    return result;
  }

  _buildProductCard(product) {
    if (!product) return null;
    const category = this._getCategoryById(product.category_id);
    const brand = this._getBrandById(product.brand_id);
    const variants = this._getVariantsForProduct(product.id);
    let minPrice = null;
    let maxPrice = null;
    for (let i = 0; i < variants.length; i++) {
      const v = variants[i];
      if (typeof v.price === 'number') {
        if (minPrice === null || v.price < minPrice) minPrice = v.price;
        if (maxPrice === null || v.price > maxPrice) maxPrice = v.price;
      }
    }
    if (minPrice === null) {
      minPrice = typeof product.min_variant_price === 'number' ? product.min_variant_price : 0;
      maxPrice = minPrice;
    } else if (maxPrice === null) {
      maxPrice = minPrice;
    }

    return {
      product_id: product.id,
      name: product.name,
      short_description: product.description || '',
      category_name: category ? category.name : '',
      category_slug: category ? category.slug : '',
      subcategory: product.subcategory || 'other',
      product_type: product.product_type || 'other',
      brand_id: product.brand_id,
      brand_name: brand ? brand.name : '',
      pet_types: product.pet_types || [],
      life_stage: product.life_stage || null,
      breed_size: product.breed_size || null,
      average_rating: typeof product.average_rating === 'number' ? product.average_rating : 0,
      rating_count: typeof product.rating_count === 'number' ? product.rating_count : 0,
      min_price: minPrice,
      max_price: maxPrice,
      free_shipping_eligible: !!product.free_shipping_eligible,
      subscription_eligible: !!product.subscription_eligible,
      main_image_url: product.image_url || '',
      badges: this._buildProductBadges(product)
    };
  }

  _buildProductBadges(product) {
    const badges = [];
    if (!product) return badges;
    if (product.special_diets && product.special_diets.indexOf('grain_free') !== -1) {
      badges.push('grain_free');
    }
    if (product.eco_attributes && product.eco_attributes.indexOf('eco_friendly') !== -1) {
      badges.push('eco_friendly');
    }
    if (product.formula_type === 'hypoallergenic') {
      badges.push('hypoallergenic');
    }
    if (product.power_type === 'cordless') {
      badges.push('cordless');
    }
    if (product.is_toy_pack) {
      badges.push('toy_pack');
    }
    if (product.is_flea_tick_treatment) {
      badges.push('flea_tick_treatment');
    }
    return badges;
  }

  _resolveForeignKeysForCartItems(rawItems) {
    const products = this._getProducts();
    const variants = this._getProductVariants();
    const resolved = [];
    for (let i = 0; i < rawItems.length; i++) {
      const item = rawItems[i];
      const product = this._findById(products, item.product_id);
      let variant = null;
      if (item.variant_id) {
        variant = this._findById(variants, item.variant_id);
      }
      const imageUrl = product && product.image_url ? product.image_url : '';
      resolved.push({
        cart_item_id: item.id,
        product_id: item.product_id,
        variant_id: item.variant_id || null,
        product_name: item.product_name,
        variant_name: item.variant_name || '',
        subcategory: item.subcategory || 'other',
        unit_price: item.unit_price,
        quantity: item.quantity,
        line_subtotal: item.line_subtotal,
        purchase_type: item.purchase_type,
        subscription_frequency: item.subscription_frequency || null,
        is_free_shipping: !!item.is_free_shipping,
        image_url: imageUrl,
        product: product || null,
        variant: variant || null
      });
    }
    return resolved;
  }

  _serializeCartWithItems(cart) {
    if (!cart) {
      return {
        cart_id: null,
        items: [],
        subtotal: 0,
        discount_total: 0,
        shipping_total: 0,
        total: 0,
        applied_coupon_codes: []
      };
    }
    const allItems = this._getFromStorage('cart_items', []);
    const itemsInCart = [];
    for (let i = 0; i < allItems.length; i++) {
      const item = allItems[i];
      if (item.cart_id === cart.id) {
        itemsInCart.push(item);
      }
    }
    const resolvedItems = this._resolveForeignKeysForCartItems(itemsInCart);
    return {
      cart_id: cart.id,
      items: resolvedItems,
      subtotal: cart.subtotal || 0,
      discount_total: cart.discount_total || 0,
      shipping_total: cart.shipping_total || 0,
      total: cart.total || 0,
      applied_coupon_codes: cart.applied_coupon_codes || []
    };
  }

  _resolveForeignKeysForWishlistItems(rawItems) {
    const products = this._getProducts();
    const variants = this._getProductVariants();
    const resolved = [];
    for (let i = 0; i < rawItems.length; i++) {
      const item = rawItems[i];
      const product = this._findById(products, item.product_id);
      let variant = null;
      if (item.variant_id) {
        variant = this._findById(variants, item.variant_id);
      }
      const price = variant && typeof variant.price === 'number'
        ? variant.price
        : (product && typeof product.min_variant_price === 'number' ? product.min_variant_price : 0);
      const avgRating = product && typeof product.average_rating === 'number' ? product.average_rating : 0;
      const imageUrl = product && product.image_url ? product.image_url : '';
      resolved.push({
        wishlist_item_id: item.id,
        product_id: item.product_id,
        variant_id: item.variant_id || null,
        added_at: item.added_at,
        product_name: product ? product.name : '',
        main_image_url: imageUrl,
        price: price,
        average_rating: avgRating,
        product: product || null,
        variant: variant || null
      });
    }
    return resolved;
  }

  _getOrCreateCart() {
    let cart = this._getFromStorage('cart', null);
    if (!cart || !cart.id) {
      cart = {
        id: this._generateId('cart'),
        items: [],
        subtotal: 0,
        discount_total: 0,
        shipping_total: 0,
        total: 0,
        applied_coupon_codes: [],
        created_at: this._now(),
        updated_at: this._now()
      };
      this._saveToStorage('cart', cart);
    }
    return cart;
  }

  _saveCart(cart) {
    cart.updated_at = this._now();
    this._saveToStorage('cart', cart);
  }

  _recalculateCartTotals(cart) {
    const allItems = this._getFromStorage('cart_items', []);
    let subtotal = 0;
    let shippingTotal = 0; // base shipping before coupons/shipping methods

    for (let i = 0; i < allItems.length; i++) {
      const item = allItems[i];
      if (item.cart_id !== cart.id) continue;
      item.line_subtotal = item.unit_price * item.quantity;
      subtotal += item.line_subtotal;
    }

    this._saveToStorage('cart_items', allItems);

    cart.subtotal = subtotal;
    cart.shipping_total = shippingTotal;

    // Apply coupons to set discount_total (and possibly adjust shipping_total)
    this._applyCouponsToCart(cart);

    cart.total = cart.subtotal + cart.shipping_total - cart.discount_total;
    this._saveCart(cart);
  }

  _getOrCreateWishlist() {
    let wishlist = this._getFromStorage('wishlist', null);
    if (!wishlist || !wishlist.id) {
      wishlist = {
        id: this._generateId('wishlist'),
        items: [],
        created_at: this._now(),
        updated_at: this._now()
      };
      this._saveToStorage('wishlist', wishlist);
    }
    return wishlist;
  }

  _saveWishlist(wishlist) {
    wishlist.updated_at = this._now();
    this._saveToStorage('wishlist', wishlist);
  }

  _getOrCreateCheckoutSession() {
    const sessions = this._getFromStorage('checkout_sessions', []);
    const cart = this._getOrCreateCart();
    let session = null;
    for (let i = 0; i < sessions.length; i++) {
      const s = sessions[i];
      if (s.status === 'in_progress' && s.cart_id === cart.id) {
        session = s;
        break;
      }
    }

    if (!session) {
      session = {
        id: this._generateId('checkout'),
        cart_id: cart.id,
        status: 'in_progress',
        current_step: 'shipping_address',
        shipping_first_name: '',
        shipping_last_name: '',
        shipping_address_line1: '',
        shipping_address_line2: '',
        shipping_city: '',
        shipping_state: '',
        shipping_zip: '',
        selected_shipping_method_id: null,
        created_at: this._now(),
        updated_at: this._now()
      };
      sessions.push(session);
      this._saveToStorage('checkout_sessions', sessions);
    }

    return session;
  }

  _saveCheckoutSession(session) {
    const sessions = this._getFromStorage('checkout_sessions', []);
    let found = false;
    for (let i = 0; i < sessions.length; i++) {
      if (sessions[i].id === session.id) {
        sessions[i] = session;
        found = true;
        break;
      }
    }
    if (!found) {
      sessions.push(session);
    }
    session.updated_at = this._now();
    this._saveToStorage('checkout_sessions', sessions);
  }

  _applyCouponsToCart(cart) {
    const coupons = this._getCoupons();
    const appliedCodes = cart.applied_coupon_codes || [];
    const products = this._getProducts();
    const categories = this._getCategories();
    const allItems = this._getFromStorage('cart_items', []);

    let discountTotal = 0;
    let shippingTotal = cart.shipping_total || 0;

    const now = new Date();

    function getCategoryByIdLocal(id) {
      for (let i = 0; i < categories.length; i++) {
        if (categories[i].id === id) return categories[i];
      }
      return null;
    }

    function getTopLevelSlugForCategory(cat) {
      if (!cat) return null;
      let current = cat;
      const byId = {};
      for (let i = 0; i < categories.length; i++) {
        byId[categories[i].id] = categories[i];
      }
      while (current.parent_category_id) {
        current = byId[current.parent_category_id] || current;
        if (!byId[current.id]) break;
      }
      return current.slug || null;
    }

    for (let cIndex = 0; cIndex < appliedCodes.length; cIndex++) {
      const code = appliedCodes[cIndex];
      let coupon = null;
      for (let i = 0; i < coupons.length; i++) {
        if (coupons[i].code === code) {
          coupon = coupons[i];
          break;
        }
      }
      if (!coupon || !coupon.is_active) continue;

      if (coupon.valid_from) {
        const fromDate = new Date(coupon.valid_from);
        if (now < fromDate) continue;
      }
      if (coupon.valid_to) {
        const toDate = new Date(coupon.valid_to);
        if (now > toDate) continue;
      }

      const applicableSlugs = coupon.applicable_category_slugs || [];
      let eligibleSubtotal = 0;

      for (let i = 0; i < allItems.length; i++) {
        const item = allItems[i];
        if (item.cart_id !== cart.id) continue;
        let eligible = true;
        if (applicableSlugs.length) {
          const product = this._findById(products, item.product_id);
          if (product) {
            const category = getCategoryByIdLocal(product.category_id);
            const topSlug = getTopLevelSlugForCategory(category);
            const catSlug = category ? category.slug : null;
            eligible = false;
            for (let s = 0; s < applicableSlugs.length; s++) {
              const slug = applicableSlugs[s];
              if (slug === topSlug || slug === catSlug) {
                eligible = true;
                break;
              }
            }
          }
        }
        if (eligible) {
          eligibleSubtotal += item.line_subtotal;
        }
      }

      const minSubtotal = typeof coupon.min_subtotal === 'number' ? coupon.min_subtotal : 0;
      if (eligibleSubtotal < minSubtotal) continue;

      if (coupon.discount_type === 'percentage' && typeof coupon.discount_value === 'number') {
        const d = (coupon.discount_value / 100) * eligibleSubtotal;
        discountTotal += d;
      } else if (coupon.discount_type === 'fixed_amount' && typeof coupon.discount_value === 'number') {
        const d = coupon.discount_value <= eligibleSubtotal ? coupon.discount_value : eligibleSubtotal;
        discountTotal += d;
      } else if (coupon.discount_type === 'free_shipping') {
        shippingTotal = 0;
      }
    }

    cart.discount_total = discountTotal;
    cart.shipping_total = shippingTotal;
  }

  _buildOrderSummaryFromCart(cart) {
    const serialized = this._serializeCartWithItems(cart);
    return {
      items: serialized.items.map(function (item) {
        return {
          product_name: item.product_name,
          variant_name: item.variant_name,
          purchase_type: item.purchase_type,
          subscription_frequency: item.subscription_frequency,
          quantity: item.quantity,
          unit_price: item.unit_price,
          line_subtotal: item.line_subtotal
        };
      }),
      subtotal: serialized.subtotal,
      discount_total: serialized.discount_total,
      shipping_total: serialized.shipping_total,
      total: serialized.total,
      applied_coupon_codes: serialized.applied_coupon_codes
    };
  }

  _getAvailableShippingMethodsForCart(cart) {
    const methods = this._getShippingMethods();
    const result = [];
    for (let i = 0; i < methods.length; i++) {
      const m = methods[i];
      if (!m.active) continue;
      let allowed = true;
      if (typeof m.min_cart_total_for_free === 'number' && m.min_cart_total_for_free > 0) {
        if (cart.total < m.min_cart_total_for_free) {
          // if method is free only above threshold, but we can still include it with cost if is_free false
          // For simplicity, we just include if active, ignoring threshold for non-free types.
          // For free types, enforce threshold.
          if (m.is_free || m.type === 'free_standard') {
            allowed = false;
          }
        }
      }
      if (!allowed) continue;
      result.push({
        shipping_method_id: m.id,
        name: m.name,
        type: m.type,
        cost: m.cost,
        estimated_min_days: m.estimated_min_days || null,
        estimated_max_days: m.estimated_max_days || null,
        is_free: !!m.is_free
      });
    }
    return result;
  }

  // ---------------------- Interface implementations ----------------------

  // getHomePageData()
  getHomePageData() {
    const categories = this._getCategories();
    const products = this._getProducts();
    const productVariants = this._getProductVariants();
    const brands = this._getBrands();
    const coupons = this._getCoupons();
    const recentlyViewed = this._getFromStorage('recently_viewed_products', []);

    const featured_categories = [];
    for (let i = 0; i < categories.length; i++) {
      const c = categories[i];
      if (!c || !c.active) continue;
      if (!c.parent_category_id) {
        featured_categories.push({
          category_id: c.id,
          slug: c.slug,
          name: c.name,
          description: c.description || '',
          display_order: typeof c.display_order === 'number' ? c.display_order : i,
          category: c
        });
      }
    }

    const popular_subcategories = [];
    for (let i = 0; i < categories.length; i++) {
      const c = categories[i];
      if (!c || !c.active || !c.parent_category_id) continue;
      const parent = this._getCategoryById(c.parent_category_id);
      popular_subcategories.push({
        category_id: c.id,
        parent_slug: parent ? parent.slug : null,
        slug: c.slug,
        name: c.name
      });
    }

    const featured_promotions = [];
    const now = new Date();
    for (let i = 0; i < coupons.length; i++) {
      const coupon = coupons[i];
      if (!coupon || !coupon.is_active) continue;
      if (coupon.valid_from && now < new Date(coupon.valid_from)) continue;
      if (coupon.valid_to && now > new Date(coupon.valid_to)) continue;
      featured_promotions.push({
        promotion_id: coupon.id,
        title: coupon.code,
        description: coupon.description || '',
        promotion_type: 'coupon',
        coupon_code: coupon.code,
        discount_type: coupon.discount_type,
        discount_value: coupon.discount_value || 0,
        min_subtotal: coupon.min_subtotal || 0,
        applicable_category_slugs: coupon.applicable_category_slugs || []
      });
    }

    const activeProducts = [];
    for (let i = 0; i < products.length; i++) {
      if (products[i].status === 'active') {
        activeProducts.push(products[i]);
      }
    }
    activeProducts.sort(function (a, b) {
      const ar = typeof a.average_rating === 'number' ? a.average_rating : 0;
      const br = typeof b.average_rating === 'number' ? b.average_rating : 0;
      return br - ar;
    });

    const featured_products = [];
    const limit = activeProducts.length < 10 ? activeProducts.length : 10;
    for (let i = 0; i < limit; i++) {
      const card = this._buildProductCard(activeProducts[i]);
      if (card) featured_products.push(card);
    }

    const recently_viewed_products = [];
    if (recentlyViewed && recentlyViewed.length && typeof recentlyViewed[0] === 'object' && recentlyViewed[0].product_id) {
      // Assume already in desired shape
      for (let i = 0; i < recentlyViewed.length; i++) {
        recently_viewed_products.push(recentlyViewed[i]);
      }
    } else if (Array.isArray(recentlyViewed)) {
      // Assume array of product_ids
      for (let i = 0; i < recentlyViewed.length; i++) {
        const p = this._getProductById(recentlyViewed[i]);
        if (!p) continue;
        const cat = this._getCategoryById(p.category_id);
        recently_viewed_products.push({
          product_id: p.id,
          name: p.name,
          category_name: cat ? cat.name : '',
          category_slug: cat ? cat.slug : '',
          main_image_url: p.image_url || '',
          min_price: typeof p.min_variant_price === 'number' ? p.min_variant_price : 0,
          average_rating: typeof p.average_rating === 'number' ? p.average_rating : 0
        });
      }
    }

    return {
      featured_categories: featured_categories,
      popular_subcategories: popular_subcategories,
      featured_promotions: featured_promotions,
      featured_products: featured_products,
      recently_viewed_products: recently_viewed_products
    };
  }

  // getCategoryHierarchy()
  getCategoryHierarchy() {
    const categories = this._getCategories();
    const result = [];
    for (let i = 0; i < categories.length; i++) {
      const c = categories[i];
      result.push({
        category_id: c.id,
        slug: c.slug,
        name: c.name,
        description: c.description || '',
        display_order: typeof c.display_order === 'number' ? c.display_order : i,
        active: !!c.active,
        parent_category_id: c.parent_category_id || null
      });
    }
    return result;
  }

  // getCategoryFilterOptions(categorySlug, subcategory)
  getCategoryFilterOptions(categorySlug, subcategory) {
    const categoryIds = this._getAllCategoryIdsForSlugHierarchy(categorySlug);
    const products = this._getProducts();

    const relevant = [];
    for (let i = 0; i < products.length; i++) {
      const p = products[i];
      if (p.status !== 'active') continue;
      if (categoryIds.length && categoryIds.indexOf(p.category_id) === -1) continue;
      if (subcategory && p.subcategory !== subcategory) continue;
      relevant.push(p);
    }

    const lifeStageSet = {};
    const breedSizeSet = {};
    const specialDietSet = {};
    const litterTypeSet = {};
    const ecoAttrSet = {};
    const petTypeSet = {};
    const ratingSet = {};
    const priceValues = [];
    const brandMap = {};

    const variants = this._getProductVariants();

    function collectPriceForProduct(product, variantsList) {
      let minPrice = null;
      for (let i = 0; i < variantsList.length; i++) {
        const v = variantsList[i];
        if (v.product_id !== product.id) continue;
        if (typeof v.price === 'number') {
          if (minPrice === null || v.price < minPrice) minPrice = v.price;
        }
      }
      if (minPrice === null && typeof product.min_variant_price === 'number') {
        minPrice = product.min_variant_price;
      }
      if (minPrice !== null) priceValues.push(minPrice);
    }

    const weightRangeSet = {};
    const volumeRangeSet = {};
    const bagCountSet = {};
    const doseCountSet = {};
    const toyPackSet = {};
    const petWeightRangeSet = {};
    const powerTypeSet = {};

    for (let i = 0; i < relevant.length; i++) {
      const p = relevant[i];
      if (p.life_stage) lifeStageSet[p.life_stage] = true;
      if (p.breed_size) breedSizeSet[p.breed_size] = true;
      if (p.special_diets && p.special_diets.length) {
        for (let j = 0; j < p.special_diets.length; j++) {
          specialDietSet[p.special_diets[j]] = true;
        }
      }
      if (p.litter_type) litterTypeSet[p.litter_type] = true;
      if (p.eco_attributes && p.eco_attributes.length) {
        for (let j = 0; j < p.eco_attributes.length; j++) {
          ecoAttrSet[p.eco_attributes[j]] = true;
        }
      }
      if (p.pet_types && p.pet_types.length) {
        for (let j = 0; j < p.pet_types.length; j++) {
          petTypeSet[p.pet_types[j]] = true;
        }
      }
      if (typeof p.average_rating === 'number') ratingSet[p.average_rating] = true;
      if (p.brand_id) brandMap[p.brand_id] = true;
      if (p.pet_weight_ranges && p.pet_weight_ranges.length) {
        for (let j = 0; j < p.pet_weight_ranges.length; j++) {
          petWeightRangeSet[p.pet_weight_ranges[j]] = true;
        }
      }
      if (p.power_type) powerTypeSet[p.power_type] = true;

      collectPriceForProduct(p, variants);
    }

    const life_stage_options = Object.keys(lifeStageSet);
    const breed_size_options = Object.keys(breedSizeSet);
    const special_diet_options = Object.keys(specialDietSet);
    const litter_type_options = Object.keys(litterTypeSet);
    const eco_attribute_options = Object.keys(ecoAttrSet);
    const pet_type_options = Object.keys(petTypeSet);

    // Simple static rating thresholds; real ratings available in ratingSet
    const rating_thresholds = [3, 4, 4.5, 5];

    priceValues.sort(function (a, b) { return a - b; });
    const price_ranges = [];
    if (priceValues.length) {
      const minPrice = priceValues[0];
      const maxPrice = priceValues[priceValues.length - 1];
      const step = (maxPrice - minPrice) / 3 || 10;
      let start = minPrice;
      for (let i = 0; i < 3; i++) {
        const end = i === 2 ? maxPrice : (start + step);
        price_ranges.push({
          min_price: Math.round(start * 100) / 100,
          max_price: Math.round(end * 100) / 100,
          label: '$' + (Math.round(start * 100) / 100) + ' - $' + (Math.round(end * 100) / 100)
        });
        start = end;
      }
    }

    const brands = this._getBrands();
    const brand_options = [];
    for (let i = 0; i < brands.length; i++) {
      const b = brands[i];
      if (brandMap[b.id]) {
        brand_options.push({
          brand_id: b.id,
          brand_name: b.name,
          is_featured: !!b.is_featured
        });
      }
    }

    // For simplicity, provide generic weight & volume ranges; they may not align exactly with variants
    const weight_range_options = [
      { min_weight_lb: 0, max_weight_lb: 10, label: 'Up to 10 lb' },
      { min_weight_lb: 10, max_weight_lb: 20, label: '10 - 20 lb' },
      { min_weight_lb: 20, max_weight_lb: 40, label: '20 - 40 lb' },
      { min_weight_lb: 40, max_weight_lb: 1000, label: '40+ lb' }
    ];

    const volume_range_options = [
      { min_volume_oz: 0, max_volume_oz: 8, label: 'Up to 8 oz' },
      { min_volume_oz: 8, max_volume_oz: 16, label: '8 - 16 oz' },
      { min_volume_oz: 16, max_volume_oz: 32, label: '16 - 32 oz' },
      { min_volume_oz: 32, max_volume_oz: 1000, label: '32+ oz' }
    ];

    const bag_count_options = [
      { min_bag_count: 50, label: '50+ bags' },
      { min_bag_count: 100, label: '100+ bags' },
      { min_bag_count: 200, label: '200+ bags' }
    ];

    const dose_count_options = [
      { min_dose_count: 3, label: '3+ doses' },
      { min_dose_count: 6, label: '6+ doses' }
    ];

    const toy_pack_options = ['all', 'toy_packs_only'];

    const pet_weight_range_options = Object.keys(petWeightRangeSet);

    const power_type_options = Object.keys(powerTypeSet);

    return {
      life_stage_options: life_stage_options,
      breed_size_options: breed_size_options,
      special_diet_options: special_diet_options,
      litter_type_options: litter_type_options,
      eco_attribute_options: eco_attribute_options,
      pet_type_options: pet_type_options,
      rating_thresholds: rating_thresholds,
      price_ranges: price_ranges,
      brand_options: brand_options,
      weight_range_options: weight_range_options,
      volume_range_options: volume_range_options,
      bag_count_options: bag_count_options,
      dose_count_options: dose_count_options,
      toy_pack_options: toy_pack_options,
      pet_weight_range_options: pet_weight_range_options,
      power_type_options: power_type_options
    };
  }

  // getCategoryProducts(categorySlug, subcategory, filters, sortBy, page, pageSize)
  getCategoryProducts(categorySlug, subcategory, filters, sortBy, page, pageSize) {
    filters = filters || {};
    sortBy = sortBy || 'relevance';
    page = page || 1;
    pageSize = pageSize || 20;

    const categoryIds = this._getAllCategoryIdsForSlugHierarchy(categorySlug);
    const products = this._getProducts();

    const filtered = [];

    for (let i = 0; i < products.length; i++) {
      const p = products[i];
      if (p.status !== 'active') continue;
      if (categoryIds.length && categoryIds.indexOf(p.category_id) === -1) {
        const catIdStr = String(p.category_id || '');
        const slugStr = String(categorySlug || '');
        if (!(catIdStr === slugStr || catIdStr.indexOf(slugStr + '_') === 0)) continue;
      }
      if (subcategory && p.subcategory !== subcategory) continue;

      if (filters.life_stage && p.life_stage && p.life_stage !== filters.life_stage) continue;
      if (filters.breed_size && p.breed_size && p.breed_size !== filters.breed_size) continue;

      if (filters.special_diets && filters.special_diets.length) {
        const diets = p.special_diets || [];
        let allMatch = true;
        for (let d = 0; d < filters.special_diets.length; d++) {
          if (diets.indexOf(filters.special_diets[d]) === -1) {
            allMatch = false;
            break;
          }
        }
        if (!allMatch) continue;
      }

      if (filters.litter_type && p.litter_type && p.litter_type !== filters.litter_type) continue;

      if (filters.eco_attributes && filters.eco_attributes.length) {
        const eco = p.eco_attributes || [];
        let allMatch = true;
        for (let e = 0; e < filters.eco_attributes.length; e++) {
          if (eco.indexOf(filters.eco_attributes[e]) === -1) {
            allMatch = false;
            break;
          }
        }
        if (!allMatch) continue;
      }

      if (filters.pet_types && filters.pet_types.length) {
        const pt = p.pet_types || [];
        let intersects = false;
        for (let t = 0; t < filters.pet_types.length; t++) {
          if (pt.indexOf(filters.pet_types[t]) !== -1) {
            intersects = true;
            break;
          }
        }
        if (!intersects) continue;
      }

      if (typeof filters.rating_min === 'number') {
        if (typeof p.average_rating !== 'number' || p.average_rating < filters.rating_min) continue;
      }

      if (filters.brand_ids && filters.brand_ids.length) {
        if (!p.brand_id || filters.brand_ids.indexOf(p.brand_id) === -1) continue;
      }

      if (filters.product_types && filters.product_types.length) {
        if (!p.product_type || filters.product_types.indexOf(p.product_type) === -1) continue;
      }

      if (filters.pet_weight_range && p.pet_weight_ranges && p.pet_weight_ranges.length) {
        if (p.pet_weight_ranges.indexOf(filters.pet_weight_range) === -1) continue;
      }

      if (filters.power_type && p.power_type && p.power_type !== filters.power_type) continue;

      if (filters.is_toy_pack === true && !p.is_toy_pack) continue;

      if (filters.free_shipping_only) {
        if (!p.free_shipping_eligible) continue;
      }

      // Price and variant-based filters
      const variants = this._getVariantsForProduct(p.id);
      let minVariantPrice = null;
      let anyWeightMatch = !(filters.weight_min_lb || filters.weight_max_lb);
      let anyVolumeMatch = !(filters.volume_min_oz || filters.volume_max_oz);
      let anyBagCountMatch = !filters.bag_count_min;
      let anyDoseCountMatch = !filters.dose_count_min;

      for (let v = 0; v < variants.length; v++) {
        const variant = variants[v];
        if (typeof variant.price === 'number') {
          if (minVariantPrice === null || variant.price < minVariantPrice) minVariantPrice = variant.price;
        }
        if (filters.weight_min_lb || filters.weight_max_lb) {
          const w = typeof variant.weight_lb === 'number' ? variant.weight_lb : null;
          if (w !== null) {
            if ((filters.weight_min_lb ? w >= filters.weight_min_lb : true) &&
                (filters.weight_max_lb ? w <= filters.weight_max_lb : true)) {
              anyWeightMatch = true;
            }
          }
        }
        if (filters.volume_min_oz || filters.volume_max_oz) {
          const vol = typeof variant.volume_oz === 'number' ? variant.volume_oz : null;
          if (vol !== null) {
            if ((filters.volume_min_oz ? vol >= filters.volume_min_oz : true) &&
                (filters.volume_max_oz ? vol <= filters.volume_max_oz : true)) {
              anyVolumeMatch = true;
            }
          }
        }
        if (filters.bag_count_min) {
          const bc = typeof variant.bag_count === 'number' ? variant.bag_count : null;
          if (bc !== null && bc >= filters.bag_count_min) {
            anyBagCountMatch = true;
          }
        }
        if (filters.dose_count_min) {
          const dc = typeof variant.dose_count === 'number' ? variant.dose_count : null;
          if (dc !== null && dc >= filters.dose_count_min) {
            anyDoseCountMatch = true;
          }
        }
      }

      if (minVariantPrice === null && typeof p.min_variant_price === 'number') {
        minVariantPrice = p.min_variant_price;
      }

      if (!anyWeightMatch || !anyVolumeMatch || !anyBagCountMatch || !anyDoseCountMatch) continue;

      if (typeof filters.price_min === 'number' && minVariantPrice !== null && minVariantPrice < filters.price_min) {
        continue;
      }
      if (typeof filters.price_max === 'number' && minVariantPrice !== null && minVariantPrice > filters.price_max) {
        continue;
      }

      const card = this._buildProductCard(p);
      if (card) {
        filtered.push(card);
      }
    }

    // Sorting
    filtered.sort((a, b) => {
      if (sortBy === 'price_low_to_high') {
        return a.min_price - b.min_price;
      } else if (sortBy === 'price_high_to_low') {
        return b.min_price - a.min_price;
      } else if (sortBy === 'rating_high_to_low') {
        const ra = typeof a.average_rating === 'number' ? a.average_rating : 0;
        const rb = typeof b.average_rating === 'number' ? b.average_rating : 0;
        return rb - ra;
      } else if (sortBy === 'best_selling') {
        const ca = typeof a.rating_count === 'number' ? a.rating_count : 0;
        const cb = typeof b.rating_count === 'number' ? b.rating_count : 0;
        return cb - ca;
      }
      // relevance or unknown: keep as-is
      return 0;
    });

    const totalItems = filtered.length;
    const totalPages = Math.ceil(totalItems / pageSize) || 1;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const pageItems = filtered.slice(start, end);

    const breadcrumb = [];
    const cats = this._getCategories();
    const slugsVisited = {};
    for (let i = 0; i < cats.length; i++) {
      if (cats[i].slug === categorySlug && !slugsVisited[cats[i].slug]) {
        breadcrumb.push({ label: cats[i].name, category_slug: cats[i].slug, subcategory: null });
        slugsVisited[cats[i].slug] = true;
        break;
      }
    }
    if (subcategory) {
      breadcrumb.push({ label: subcategory, category_slug: categorySlug, subcategory: subcategory });
    }

    return {
      products: pageItems,
      pagination: {
        page: page,
        page_size: pageSize,
        total_items: totalItems,
        total_pages: totalPages
      },
      applied_filters: {
        life_stage: filters.life_stage || null,
        breed_size: filters.breed_size || null,
        special_diets: filters.special_diets || [],
        litter_type: filters.litter_type || null,
        eco_attributes: filters.eco_attributes || [],
        pet_types: filters.pet_types || [],
        rating_min: typeof filters.rating_min === 'number' ? filters.rating_min : null,
        price_min: typeof filters.price_min === 'number' ? filters.price_min : null,
        price_max: typeof filters.price_max === 'number' ? filters.price_max : null,
        free_shipping_only: !!filters.free_shipping_only,
        brand_ids: filters.brand_ids || [],
        weight_min_lb: typeof filters.weight_min_lb === 'number' ? filters.weight_min_lb : null,
        weight_max_lb: typeof filters.weight_max_lb === 'number' ? filters.weight_max_lb : null,
        volume_min_oz: typeof filters.volume_min_oz === 'number' ? filters.volume_min_oz : null,
        volume_max_oz: typeof filters.volume_max_oz === 'number' ? filters.volume_max_oz : null,
        bag_count_min: typeof filters.bag_count_min === 'number' ? filters.bag_count_min : null,
        dose_count_min: typeof filters.dose_count_min === 'number' ? filters.dose_count_min : null,
        is_toy_pack: !!filters.is_toy_pack,
        pet_weight_range: filters.pet_weight_range || null,
        power_type: filters.power_type || null
      },
      available_sort_options: ['relevance', 'price_low_to_high', 'price_high_to_low', 'rating_high_to_low', 'best_selling'],
      breadcrumb: breadcrumb
    };
  }

  // getSearchFilterOptions(query)
  getSearchFilterOptions(query) {
    const products = this._searchRawProducts(query);
    const petTypeSet = {};
    const petWeightRangeSet = {};
    const ratingSet = {};
    const priceValues = [];
    const brandMap = {};
    const bagCountSet = {};
    const doseCountSet = {};

    const variants = this._getProductVariants();

    function collectPriceAndCounts(product, variantsList, priceArr, bagSet, doseSet) {
      let minPrice = null;
      for (let i = 0; i < variantsList.length; i++) {
        const v = variantsList[i];
        if (v.product_id !== product.id) continue;
        if (typeof v.price === 'number') {
          if (minPrice === null || v.price < minPrice) minPrice = v.price;
        }
        if (typeof v.bag_count === 'number') {
          bagSet[v.bag_count] = true;
        }
        if (typeof v.dose_count === 'number') {
          doseSet[v.dose_count] = true;
        }
      }
      if (minPrice === null && typeof product.min_variant_price === 'number') {
        minPrice = product.min_variant_price;
      }
      if (minPrice !== null) priceArr.push(minPrice);
    }

    let freeShippingAvailable = false;

    for (let i = 0; i < products.length; i++) {
      const p = products[i];
      if (p.pet_types && p.pet_types.length) {
        for (let j = 0; j < p.pet_types.length; j++) {
          petTypeSet[p.pet_types[j]] = true;
        }
      }
      if (p.pet_weight_ranges && p.pet_weight_ranges.length) {
        for (let j = 0; j < p.pet_weight_ranges.length; j++) {
          petWeightRangeSet[p.pet_weight_ranges[j]] = true;
        }
      }
      if (typeof p.average_rating === 'number') ratingSet[p.average_rating] = true;
      if (p.brand_id) brandMap[p.brand_id] = true;
      if (p.free_shipping_eligible) freeShippingAvailable = true;

      collectPriceAndCounts(p, variants, priceValues, bagCountSet, doseCountSet);
    }

    const pet_type_options = Object.keys(petTypeSet);
    const pet_weight_range_options = Object.keys(petWeightRangeSet);
    const rating_thresholds = [3, 4, 4.5, 5];

    priceValues.sort(function (a, b) { return a - b; });
    const price_ranges = [];
    if (priceValues.length) {
      const minPrice = priceValues[0];
      const maxPrice = priceValues[priceValues.length - 1];
      const step = (maxPrice - minPrice) / 3 || 10;
      let start = minPrice;
      for (let i = 0; i < 3; i++) {
        const end = i === 2 ? maxPrice : (start + step);
        price_ranges.push({
          min_price: Math.round(start * 100) / 100,
          max_price: Math.round(end * 100) / 100,
          label: '$' + (Math.round(start * 100) / 100) + ' - $' + (Math.round(end * 100) / 100)
        });
        start = end;
      }
    }

    const brands = this._getBrands();
    const brand_options = [];
    for (let i = 0; i < brands.length; i++) {
      const b = brands[i];
      if (brandMap[b.id]) {
        brand_options.push({ brand_id: b.id, brand_name: b.name });
      }
    }

    const pack_size_or_doses_options = [];
    const doseCounts = Object.keys(doseCountSet).map(function (v) { return parseInt(v, 10); });
    doseCounts.sort(function (a, b) { return a - b; });
    if (doseCounts.length) {
      pack_size_or_doses_options.push({ min_dose_count: 3, label: '3+ doses' });
      pack_size_or_doses_options.push({ min_dose_count: 6, label: '6+ doses' });
    }

    const bag_count_options = [];
    const bagCounts = Object.keys(bagCountSet).map(function (v) { return parseInt(v, 10); });
    bagCounts.sort(function (a, b) { return a - b; });
    if (bagCounts.length) {
      bag_count_options.push({ min_bag_count: 50, label: '50+ bags' });
      bag_count_options.push({ min_bag_count: 100, label: '100+ bags' });
      bag_count_options.push({ min_bag_count: 200, label: '200+ bags' });
    }

    return {
      pet_type_options: pet_type_options,
      pet_weight_range_options: pet_weight_range_options,
      rating_thresholds: rating_thresholds,
      price_ranges: price_ranges,
      free_shipping_available: freeShippingAvailable,
      brand_options: brand_options,
      pack_size_or_doses_options: pack_size_or_doses_options,
      bag_count_options: bag_count_options
    };
  }

  _searchRawProducts(query) {
    const q = (query || '').toLowerCase();
    const products = this._getProducts();
    if (!q) return products.slice();
    const result = [];
    for (let i = 0; i < products.length; i++) {
      const p = products[i];
      const name = (p.name || '').toLowerCase();
      const desc = (p.description || '').toLowerCase();
      if (name.indexOf(q) !== -1 || desc.indexOf(q) !== -1) {
        result.push(p);
      }
    }
    return result;
  }

  // searchProducts(query, filters, sortBy, page, pageSize)
  searchProducts(query, filters, sortBy, page, pageSize) {
    filters = filters || {};
    sortBy = sortBy || 'relevance';
    page = page || 1;
    pageSize = pageSize || 20;

    const rawProducts = this._searchRawProducts(query);
    const filtered = [];

    for (let i = 0; i < rawProducts.length; i++) {
      const p = rawProducts[i];
      if (p.status !== 'active') continue;

      if (filters.pet_types && filters.pet_types.length) {
        const pt = p.pet_types || [];
        let intersects = false;
        for (let t = 0; t < filters.pet_types.length; t++) {
          if (pt.indexOf(filters.pet_types[t]) !== -1) {
            intersects = true;
            break;
          }
        }
        if (!intersects) continue;
      }

      if (filters.pet_weight_range && p.pet_weight_ranges && p.pet_weight_ranges.length) {
        if (p.pet_weight_ranges.indexOf(filters.pet_weight_range) === -1) continue;
      }

      if (typeof filters.rating_min === 'number') {
        if (typeof p.average_rating !== 'number' || p.average_rating < filters.rating_min) continue;
      }

      if (filters.brand_ids && filters.brand_ids.length) {
        if (!p.brand_id || filters.brand_ids.indexOf(p.brand_id) === -1) continue;
      }

      if (filters.free_shipping_only && !p.free_shipping_eligible) continue;

      const variants = this._getVariantsForProduct(p.id);
      let minPrice = null;
      let anyDoseOk = !filters.dose_count_min;
      let anyBagOk = !filters.bag_count_min;

      for (let v = 0; v < variants.length; v++) {
        const variant = variants[v];
        if (typeof variant.price === 'number') {
          if (minPrice === null || variant.price < minPrice) minPrice = variant.price;
        }
        if (filters.dose_count_min) {
          const dc = typeof variant.dose_count === 'number' ? variant.dose_count : null;
          if (dc !== null && dc >= filters.dose_count_min) anyDoseOk = true;
        }
        if (filters.bag_count_min) {
          const bc = typeof variant.bag_count === 'number' ? variant.bag_count : null;
          if (bc !== null && bc >= filters.bag_count_min) anyBagOk = true;
        }
      }

      if (minPrice === null && typeof p.min_variant_price === 'number') {
        minPrice = p.min_variant_price;
      }

      if (!anyDoseOk || !anyBagOk) continue;

      if (typeof filters.price_min === 'number' && minPrice !== null && minPrice < filters.price_min) continue;
      if (typeof filters.price_max === 'number' && minPrice !== null && minPrice > filters.price_max) continue;

      const card = this._buildProductCard(p);
      if (card) filtered.push(card);
    }

    filtered.sort((a, b) => {
      if (sortBy === 'price_low_to_high') return a.min_price - b.min_price;
      if (sortBy === 'price_high_to_low') return b.min_price - a.min_price;
      if (sortBy === 'rating_high_to_low') {
        const ra = typeof a.average_rating === 'number' ? a.average_rating : 0;
        const rb = typeof b.average_rating === 'number' ? b.average_rating : 0;
        return rb - ra;
      }
      return 0; // relevance default
    });

    const totalItems = filtered.length;
    const totalPages = Math.ceil(totalItems / pageSize) || 1;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const pageItems = filtered.slice(start, end);

    return {
      products: pageItems,
      pagination: {
        page: page,
        page_size: pageSize,
        total_items: totalItems,
        total_pages: totalPages
      },
      applied_filters: {
        pet_types: filters.pet_types || [],
        pet_weight_range: filters.pet_weight_range || null,
        rating_min: typeof filters.rating_min === 'number' ? filters.rating_min : null,
        price_min: typeof filters.price_min === 'number' ? filters.price_min : null,
        price_max: typeof filters.price_max === 'number' ? filters.price_max : null,
        free_shipping_only: !!filters.free_shipping_only,
        brand_ids: filters.brand_ids || [],
        dose_count_min: typeof filters.dose_count_min === 'number' ? filters.dose_count_min : null,
        bag_count_min: typeof filters.bag_count_min === 'number' ? filters.bag_count_min : null
      },
      available_sort_options: ['relevance', 'price_low_to_high', 'price_high_to_low', 'rating_high_to_low']
    };
  }

  // getProductDetails(productId)
  getProductDetails(productId) {
    const product = this._getProductById(productId);
    if (!product) return null;

    const category = this._getCategoryById(product.category_id);
    const brand = this._getBrandById(product.brand_id);
    const variantsRaw = this._getVariantsForProduct(product.id);

    const variants = [];
    for (let i = 0; i < variantsRaw.length; i++) {
      const v = variantsRaw[i];
      variants.push({
        variant_id: v.id,
        name: v.name,
        sku: v.sku || null,
        flavor: v.flavor || null,
        size_label: v.size_label || null,
        weight_lb: typeof v.weight_lb === 'number' ? v.weight_lb : null,
        volume_oz: typeof v.volume_oz === 'number' ? v.volume_oz : null,
        unit_count: typeof v.unit_count === 'number' ? v.unit_count : null,
        bag_count: typeof v.bag_count === 'number' ? v.bag_count : null,
        dose_count: typeof v.dose_count === 'number' ? v.dose_count : null,
        pet_weight_range: v.pet_weight_range || null,
        price: v.price,
        list_price: typeof v.list_price === 'number' ? v.list_price : null,
        free_shipping_eligible: !!v.free_shipping_eligible,
        subscription_eligible: !!v.subscription_eligible,
        allowed_subscription_frequencies: v.allowed_subscription_frequencies || [],
        is_default: !!v.is_default,
        in_stock: !!v.in_stock
      });
    }

    const allReviews = this._getReviews();
    let count = 0;
    let total = 0;
    const dist = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };
    for (let i = 0; i < allReviews.length; i++) {
      const r = allReviews[i];
      if (r.product_id === product.id) {
        const rating = r.rating || 0;
        count++;
        total += rating;
        const key = String(rating);
        if (dist[key] !== undefined) dist[key]++;
      }
    }
    const avgRating = count ? total / count : (typeof product.average_rating === 'number' ? product.average_rating : 0);
    const rating_summary = {
      average_rating: avgRating,
      rating_count: count,
      rating_distribution: dist
    };

    const breadcrumb = [];
    if (category) {
      const cats = this._getCategories();
      const byId = {};
      for (let i = 0; i < cats.length; i++) byId[cats[i].id] = cats[i];
      let current = category;
      const reversed = [];
      while (current) {
        reversed.push(current);
        if (!current.parent_category_id) break;
        current = byId[current.parent_category_id];
      }
      for (let i = reversed.length - 1; i >= 0; i--) {
        const c = reversed[i];
        breadcrumb.push({ label: c.name, category_slug: c.slug, subcategory: null });
      }
      breadcrumb.push({ label: product.subcategory || 'details', category_slug: category.slug, subcategory: product.subcategory || 'other' });
    }

    const shipping_badges = [];
    if (product.free_shipping_eligible) shipping_badges.push('free_shipping');

    // Instrumentation for task completion tracking (task_5)
    try {
      const powerType = product.power_type;
      const productType = product.product_type || '';
      const isClipperProductType =
        typeof productType === 'string' &&
        (productType.toLowerCase() === 'clipper' ||
         productType.toLowerCase() === 'clippers' ||
         productType.toLowerCase().indexOf('clipper') !== -1);

      const categorySlug = category && category.slug ? String(category.slug).toLowerCase() : '';
      const isClipperCategory =
        categorySlug.indexOf('clipper') !== -1 ||
        categorySlug.indexOf('grooming') !== -1;

      if ((powerType === 'corded' || powerType === 'cordless') && (isClipperProductType || isClipperCategory)) {
        let stored = { cordedProductId: null, cordlessProductId: null };
        const existingRaw = localStorage.getItem('task5_comparedClipperIds');
        if (existingRaw) {
          try {
            const parsed = JSON.parse(existingRaw);
            if (parsed && typeof parsed === 'object') {
              if (Object.prototype.hasOwnProperty.call(parsed, 'cordedProductId')) {
                stored.cordedProductId = parsed.cordedProductId || null;
              }
              if (Object.prototype.hasOwnProperty.call(parsed, 'cordlessProductId')) {
                stored.cordlessProductId = parsed.cordlessProductId || null;
              }
            }
          } catch (e2) {
            // Ignore parse errors and fall back to default
          }
        }

        if (powerType === 'corded') {
          stored.cordedProductId = product.id;
        } else if (powerType === 'cordless') {
          stored.cordlessProductId = product.id;
        }

        localStorage.setItem('task5_comparedClipperIds', JSON.stringify(stored));
      }
    } catch (e) {
      console.error('Instrumentation error (task_5):', e);
    }

    return {
      product_id: product.id,
      name: product.name,
      description: product.description || '',
      category_id: product.category_id,
      category_name: category ? category.name : '',
      category_slug: category ? category.slug : '',
      subcategory: product.subcategory || 'other',
      product_type: product.product_type || 'other',
      brand_id: product.brand_id,
      brand_name: brand ? brand.name : '',
      brand: brand || null,
      category: category || null,
      pet_types: product.pet_types || [],
      life_stage: product.life_stage || null,
      breed_size: product.breed_size || null,
      special_diets: product.special_diets || [],
      litter_type: product.litter_type || null,
      eco_attributes: product.eco_attributes || [],
      formula_type: product.formula_type || null,
      power_type: product.power_type || null,
      is_flea_tick_treatment: !!product.is_flea_tick_treatment,
      is_toy_pack: !!product.is_toy_pack,
      average_rating: typeof product.average_rating === 'number' ? product.average_rating : avgRating,
      rating_count: typeof product.rating_count === 'number' ? product.rating_count : count,
      pet_weight_ranges: product.pet_weight_ranges || [],
      min_variant_price: typeof product.min_variant_price === 'number' ? product.min_variant_price : null,
      free_shipping_eligible: !!product.free_shipping_eligible,
      subscription_eligible: !!product.subscription_eligible,
      allowed_subscription_frequencies: product.allowed_subscription_frequencies || [],
      max_bag_count: typeof product.max_bag_count === 'number' ? product.max_bag_count : null,
      max_dose_count: typeof product.max_dose_count === 'number' ? product.max_dose_count : null,
      image_url: product.image_url || '',
      status: product.status,
      variants: variants,
      shipping_badges: shipping_badges,
      rating_summary: rating_summary,
      breadcrumb: breadcrumb
    };
  }

  // getProductReviews(productId, page, pageSize, sortBy)
  getProductReviews(productId, page, pageSize, sortBy) {
    page = page || 1;
    pageSize = pageSize || 10;
    sortBy = sortBy || 'newest';

    const allReviews = this._getReviews();
    const filtered = [];

    for (let i = 0; i < allReviews.length; i++) {
      const r = allReviews[i];
      if (r.product_id === productId) filtered.push(r);
    }

    filtered.sort(function (a, b) {
      if (sortBy === 'highest_rating') {
        return b.rating - a.rating;
      }
      if (sortBy === 'lowest_rating') {
        return a.rating - b.rating;
      }
      // newest
      const da = new Date(a.created_at);
      const db = new Date(b.created_at);
      return db - da;
    });

    let count = 0;
    let total = 0;
    const dist = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };
    for (let i = 0; i < filtered.length; i++) {
      const rating = filtered[i].rating || 0;
      count++;
      total += rating;
      const key = String(rating);
      if (dist[key] !== undefined) dist[key]++;
    }
    const avgRating = count ? total / count : 0;

    const totalItems = filtered.length;
    const totalPages = Math.ceil(totalItems / pageSize) || 1;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const pageItems = filtered.slice(start, end).map(function (r) {
      return {
        id: r.id,
        rating: r.rating,
        title: r.title || '',
        body: r.body,
        author_display_name: r.author_display_name || '',
        created_at: r.created_at
      };
    });

    return {
      rating_summary: {
        average_rating: avgRating,
        rating_count: count,
        rating_distribution: dist
      },
      reviews: pageItems,
      pagination: {
        page: page,
        page_size: pageSize,
        total_items: totalItems,
        total_pages: totalPages
      }
    };
  }

  // addToCart(productId, variantId, quantity, purchaseType, subscriptionFrequency)
  addToCart(productId, variantId, quantity, purchaseType, subscriptionFrequency) {
    quantity = typeof quantity === 'number' && quantity > 0 ? quantity : 1;
    purchaseType = purchaseType || 'one_time';

    const product = this._getProductById(productId);
    if (!product) {
      return { success: false, message: 'Product not found', cart: this._serializeCartWithItems(this._getOrCreateCart()) };
    }

    const allVariants = this._getProductVariants();
    let variant = null;
    if (variantId) {
      variant = this._findById(allVariants, variantId);
    }
    if (!variant) {
      // choose default variant or cheapest
      const variants = this._getVariantsForProduct(product.id);
      for (let i = 0; i < variants.length; i++) {
        if (variants[i].is_default) {
          variant = variants[i];
          break;
        }
      }
      if (!variant && variants.length) {
        variant = variants[0];
        for (let i = 1; i < variants.length; i++) {
          if (variants[i].price < variant.price) variant = variants[i];
        }
      }
    }

    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items', []);

    const unitPrice = variant ? variant.price : (typeof product.min_variant_price === 'number' ? product.min_variant_price : 0);
    const isFreeShipping = (variant && variant.free_shipping_eligible) || product.free_shipping_eligible || false;

    // Validate subscription
    if (purchaseType === 'subscription') {
      const allowed = (variant && variant.subscription_eligible) || product.subscription_eligible;
      if (!allowed) {
        return { success: false, message: 'Product not eligible for subscription', cart: this._serializeCartWithItems(cart) };
      }
      const allowedFreqs = (variant && variant.allowed_subscription_frequencies && variant.allowed_subscription_frequencies.length)
        ? variant.allowed_subscription_frequencies
        : (product.allowed_subscription_frequencies || []);
      if (allowedFreqs.length && (!subscriptionFrequency || allowedFreqs.indexOf(subscriptionFrequency) === -1)) {
        return { success: false, message: 'Invalid subscription frequency', cart: this._serializeCartWithItems(cart) };
      }
    }

    // Find existing matching cart item
    let existingItem = null;
    for (let i = 0; i < cartItems.length; i++) {
      const ci = cartItems[i];
      if (ci.cart_id === cart.id &&
          ci.product_id === product.id &&
          ci.variant_id === (variant ? variant.id : null) &&
          ci.purchase_type === purchaseType &&
          (ci.subscription_frequency || null) === (subscriptionFrequency || null)) {
        existingItem = ci;
        break;
      }
    }

    if (existingItem) {
      existingItem.quantity += quantity;
      existingItem.line_subtotal = existingItem.unit_price * existingItem.quantity;
    } else {
      const newItem = {
        id: this._generateId('cart_item'),
        cart_id: cart.id,
        product_id: product.id,
        variant_id: variant ? variant.id : null,
        product_name: product.name,
        variant_name: variant ? (variant.name || variant.size_label || '') : '',
        subcategory: product.subcategory || 'other',
        unit_price: unitPrice,
        quantity: quantity,
        line_subtotal: unitPrice * quantity,
        purchase_type: purchaseType,
        subscription_frequency: purchaseType === 'subscription' ? (subscriptionFrequency || null) : null,
        is_free_shipping: isFreeShipping
      };
      cartItems.push(newItem);
      if (!cart.items) cart.items = [];
      cart.items.push(newItem.id);
    }

    this._saveToStorage('cart_items', cartItems);
    this._recalculateCartTotals(cart);

    return {
      success: true,
      message: 'Added to cart',
      cart: this._serializeCartWithItems(cart)
    };
  }

  // getCart()
  getCart() {
    const cart = this._getFromStorage('cart', null);
    return this._serializeCartWithItems(cart);
  }

  // updateCartItemQuantity(cartItemId, quantity)
  updateCartItemQuantity(cartItemId, quantity) {
    quantity = quantity || 0;
    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items', []);

    let found = false;
    for (let i = 0; i < cartItems.length; i++) {
      const ci = cartItems[i];
      if (ci.id === cartItemId && ci.cart_id === cart.id) {
        found = true;
        if (quantity <= 0) {
          cartItems.splice(i, 1);
          if (cart.items) {
            const idx = cart.items.indexOf(cartItemId);
            if (idx !== -1) cart.items.splice(idx, 1);
          }
        } else {
          ci.quantity = quantity;
          ci.line_subtotal = ci.unit_price * ci.quantity;
        }
        break;
      }
    }

    if (!found) {
      return { success: false, message: 'Cart item not found', cart: this._serializeCartWithItems(cart) };
    }

    this._saveToStorage('cart_items', cartItems);
    this._recalculateCartTotals(cart);

    return {
      success: true,
      message: 'Cart updated',
      cart: this._serializeCartWithItems(cart)
    };
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
    if (cart.items && removed) {
      const idx = cart.items.indexOf(cartItemId);
      if (idx !== -1) cart.items.splice(idx, 1);
    }

    this._saveToStorage('cart_items', cartItems);
    this._recalculateCartTotals(cart);

    return {
      success: removed,
      message: removed ? 'Cart item removed' : 'Cart item not found',
      cart: this._serializeCartWithItems(cart)
    };
  }

  // clearCart()
  clearCart() {
    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items', []);

    cartItems = cartItems.filter(function (ci) {
      return ci.cart_id !== cart.id;
    });

    cart.items = [];
    cart.subtotal = 0;
    cart.discount_total = 0;
    cart.shipping_total = 0;
    cart.total = 0;
    cart.applied_coupon_codes = [];

    this._saveToStorage('cart_items', cartItems);
    this._saveCart(cart);

    return {
      success: true,
      cart: this._serializeCartWithItems(cart)
    };
  }

  // applyCouponCode(code)
  applyCouponCode(code) {
    code = (code || '').trim();
    if (!code) {
      return { success: false, message: 'Coupon code is required', cart: this._serializeCartWithItems(this._getOrCreateCart()) };
    }

    const coupons = this._getCoupons();
    let coupon = null;
    for (let i = 0; i < coupons.length; i++) {
      if (coupons[i].code === code) {
        coupon = coupons[i];
        break;
      }
    }

    const cart = this._getOrCreateCart();

    if (!coupon || !coupon.is_active) {
      return { success: false, message: 'Coupon not valid', cart: this._serializeCartWithItems(cart) };
    }

    const now = new Date();
    if (coupon.valid_from && now < new Date(coupon.valid_from)) {
      return { success: false, message: 'Coupon not yet active', cart: this._serializeCartWithItems(cart) };
    }
    if (coupon.valid_to && now > new Date(coupon.valid_to)) {
      return { success: false, message: 'Coupon expired', cart: this._serializeCartWithItems(cart) };
    }

    if (!cart.applied_coupon_codes) cart.applied_coupon_codes = [];
    if (cart.applied_coupon_codes.indexOf(code) === -1) {
      cart.applied_coupon_codes.push(code);
    }

    this._recalculateCartTotals(cart);

    const serialized = this._serializeCartWithItems(cart);

    return {
      success: true,
      message: 'Coupon applied',
      cart: serialized
    };
  }

  // getActivePromotions()
  getActivePromotions() {
    const coupons = this._getCoupons();
    const now = new Date();
    const result = [];
    for (let i = 0; i < coupons.length; i++) {
      const c = coupons[i];
      if (!c.is_active) continue;
      if (c.valid_from && now < new Date(c.valid_from)) continue;
      if (c.valid_to && now > new Date(c.valid_to)) continue;
      result.push({
        coupon_id: c.id,
        code: c.code,
        description: c.description || '',
        discount_type: c.discount_type,
        discount_value: c.discount_value || 0,
        min_subtotal: c.min_subtotal || 0,
        applicable_category_slugs: c.applicable_category_slugs || [],
        is_active: !!c.is_active
      });
    }
    return result;
  }

  // getCouponDetails(code)
  getCouponDetails(code) {
    code = (code || '').trim();
    const coupons = this._getCoupons();
    let coupon = null;
    for (let i = 0; i < coupons.length; i++) {
      if (coupons[i].code === code) {
        coupon = coupons[i];
        break;
      }
    }
    if (!coupon) {
      return { exists: false, coupon: null };
    }
    return {
      exists: true,
      coupon: {
        coupon_id: coupon.id,
        code: coupon.code,
        description: coupon.description || '',
        discount_type: coupon.discount_type,
        discount_value: coupon.discount_value || 0,
        min_subtotal: coupon.min_subtotal || 0,
        applicable_category_slugs: coupon.applicable_category_slugs || [],
        valid_from: coupon.valid_from || null,
        valid_to: coupon.valid_to || null,
        is_active: !!coupon.is_active
      }
    };
  }

  // addToWishlist(productId, variantId)
  addToWishlist(productId, variantId) {
    const product = this._getProductById(productId);
    if (!product) {
      return { success: false, message: 'Product not found', wishlist: { wishlist_id: null, items: [] } };
    }
    const variants = this._getProductVariants();
    let variant = null;
    if (variantId) {
      variant = this._findById(variants, variantId);
    }

    const wishlist = this._getOrCreateWishlist();
    let items = this._getFromStorage('wishlist_items', []);

    // prevent duplicates of same product+variant
    for (let i = 0; i < items.length; i++) {
      const wi = items[i];
      if (wi.wishlist_id === wishlist.id && wi.product_id === product.id && (wi.variant_id || null) === (variant ? variant.id : null)) {
        return {
          success: true,
          message: 'Already in wishlist',
          wishlist: {
            wishlist_id: wishlist.id,
            items: this._resolveForeignKeysForWishlistItems(items.filter(function (w) { return w.wishlist_id === wishlist.id; }))
          }
        };
      }
    }

    const newItem = {
      id: this._generateId('wishlist_item'),
      wishlist_id: wishlist.id,
      product_id: product.id,
      variant_id: variant ? variant.id : null,
      added_at: this._now()
    };
    items.push(newItem);
    if (!wishlist.items) wishlist.items = [];
    wishlist.items.push(newItem.id);

    this._saveToStorage('wishlist_items', items);
    this._saveWishlist(wishlist);

    const resolvedItems = this._resolveForeignKeysForWishlistItems(items.filter(function (w) { return w.wishlist_id === wishlist.id; }));

    return {
      success: true,
      message: 'Added to wishlist',
      wishlist: {
        wishlist_id: wishlist.id,
        items: resolvedItems
      }
    };
  }

  // getWishlist()
  getWishlist() {
    const wishlist = this._getOrCreateWishlist();
    const items = this._getFromStorage('wishlist_items', []);
    const ownItems = items.filter(function (w) { return w.wishlist_id === wishlist.id; });
    return {
      wishlist_id: wishlist.id,
      items: this._resolveForeignKeysForWishlistItems(ownItems)
    };
  }

  // removeWishlistItem(wishlistItemId)
  removeWishlistItem(wishlistItemId) {
    const wishlist = this._getOrCreateWishlist();
    let items = this._getFromStorage('wishlist_items', []);

    let removed = false;
    for (let i = 0; i < items.length; i++) {
      if (items[i].id === wishlistItemId && items[i].wishlist_id === wishlist.id) {
        items.splice(i, 1);
        removed = true;
        break;
      }
    }

    if (wishlist.items && removed) {
      const idx = wishlist.items.indexOf(wishlistItemId);
      if (idx !== -1) wishlist.items.splice(idx, 1);
    }

    this._saveToStorage('wishlist_items', items);
    this._saveWishlist(wishlist);

    const ownItems = items.filter(function (w) { return w.wishlist_id === wishlist.id; });

    return {
      success: removed,
      message: removed ? 'Wishlist item removed' : 'Wishlist item not found',
      wishlist: {
        wishlist_id: wishlist.id,
        items: this._resolveForeignKeysForWishlistItems(ownItems)
      }
    };
  }

  // moveWishlistItemToCart(wishlistItemId, quantity, purchaseType, subscriptionFrequency)
  moveWishlistItemToCart(wishlistItemId, quantity, purchaseType, subscriptionFrequency) {
    quantity = quantity || 1;
    purchaseType = purchaseType || 'one_time';

    const wishlist = this._getOrCreateWishlist();
    let items = this._getFromStorage('wishlist_items', []);

    let target = null;
    for (let i = 0; i < items.length; i++) {
      if (items[i].id === wishlistItemId && items[i].wishlist_id === wishlist.id) {
        target = items[i];
        break;
      }
    }
    if (!target) {
      return { success: false, message: 'Wishlist item not found', cart: this.getCart(), wishlist: this.getWishlist() };
    }

    const addResult = this.addToCart(target.product_id, target.variant_id || null, quantity, purchaseType, subscriptionFrequency);

    // Remove from wishlist after adding to cart
    items = items.filter(function (w) { return w.id !== wishlistItemId; });
    if (wishlist.items) {
      const idx = wishlist.items.indexOf(wishlistItemId);
      if (idx !== -1) wishlist.items.splice(idx, 1);
    }

    this._saveToStorage('wishlist_items', items);
    this._saveWishlist(wishlist);

    const ownItems = items.filter(function (w) { return w.wishlist_id === wishlist.id; });

    return {
      success: addResult.success,
      message: addResult.message,
      cart: addResult.cart,
      wishlist: {
        wishlist_id: wishlist.id,
        items: this._resolveForeignKeysForWishlistItems(ownItems)
      }
    };
  }

  // beginCheckout()
  beginCheckout() {
    const cart = this._getOrCreateCart();
    const session = this._getOrCreateCheckoutSession();
    // Refresh order summary based on latest cart
    const orderSummary = this._buildOrderSummaryFromCart(cart);

    const availableShippingMethods = [];
    if (session.current_step === 'shipping_method') {
      const methods = this._getAvailableShippingMethodsForCart(cart);
      for (let i = 0; i < methods.length; i++) availableShippingMethods.push(methods[i]);
    }

    return {
      status: session.status,
      current_step: session.current_step,
      shipping_address: {
        first_name: session.shipping_first_name || '',
        last_name: session.shipping_last_name || '',
        address_line1: session.shipping_address_line1 || '',
        address_line2: session.shipping_address_line2 || '',
        city: session.shipping_city || '',
        state: session.shipping_state || '',
        zip: session.shipping_zip || ''
      },
      available_shipping_methods: availableShippingMethods,
      selected_shipping_method_id: session.selected_shipping_method_id || null,
      order_summary: orderSummary
    };
  }

  // updateShippingAddress(shippingAddress)
  updateShippingAddress(shippingAddress) {
    shippingAddress = shippingAddress || {};
    const cart = this._getOrCreateCart();
    const session = this._getOrCreateCheckoutSession();

    session.shipping_first_name = shippingAddress.firstName || '';
    session.shipping_last_name = shippingAddress.lastName || '';
    session.shipping_address_line1 = shippingAddress.addressLine1 || '';
    session.shipping_address_line2 = shippingAddress.addressLine2 || '';
    session.shipping_city = shippingAddress.city || '';
    session.shipping_state = shippingAddress.state || '';
    session.shipping_zip = shippingAddress.zip || '';
    session.current_step = 'shipping_method';

    const methods = this._getAvailableShippingMethodsForCart(cart);
    this._saveCheckoutSession(session);

    return {
      success: true,
      message: 'Shipping address updated',
      checkout_state: {
        status: session.status,
        current_step: session.current_step,
        shipping_address: {
          first_name: session.shipping_first_name,
          last_name: session.shipping_last_name,
          address_line1: session.shipping_address_line1,
          address_line2: session.shipping_address_line2,
          city: session.shipping_city,
          state: session.shipping_state,
          zip: session.shipping_zip
        },
        available_shipping_methods: methods
      }
    };
  }

  // getAvailableShippingMethods()
  getAvailableShippingMethods() {
    const cart = this._getOrCreateCart();
    return this._getAvailableShippingMethodsForCart(cart);
  }

  // selectShippingMethod(shippingMethodId)
  selectShippingMethod(shippingMethodId) {
    const cart = this._getOrCreateCart();
    const session = this._getOrCreateCheckoutSession();
    const methods = this._getAvailableShippingMethodsForCart(cart);
    let chosen = null;
    for (let i = 0; i < methods.length; i++) {
      if (methods[i].shipping_method_id === shippingMethodId) {
        chosen = methods[i];
        break;
      }
    }
    if (!chosen) {
      return {
        success: false,
        message: 'Shipping method not found',
        checkout_state: {
          status: session.status,
          current_step: session.current_step,
          selected_shipping_method_id: session.selected_shipping_method_id || null,
          order_summary: this._buildOrderSummaryFromCart(cart)
        }
      };
    }

    session.selected_shipping_method_id = shippingMethodId;

    // Update cart shipping_total and total based on chosen method
    cart.shipping_total = chosen.cost || 0;
    cart.total = cart.subtotal + cart.shipping_total - cart.discount_total;
    this._saveCart(cart);

    // Optionally move to next step; but keep as shipping_method per requirements
    session.current_step = 'shipping_method';
    this._saveCheckoutSession(session);

    const orderSummary = this._buildOrderSummaryFromCart(cart);

    return {
      success: true,
      message: 'Shipping method selected',
      checkout_state: {
        status: session.status,
        current_step: session.current_step,
        selected_shipping_method_id: session.selected_shipping_method_id,
        order_summary: orderSummary
      }
    };
  }

  // getCheckoutState()
  getCheckoutState() {
    const cart = this._getOrCreateCart();
    const session = this._getOrCreateCheckoutSession();
    const methods = this._getAvailableShippingMethodsForCart(cart);
    const orderSummary = this._buildOrderSummaryFromCart(cart);

    return {
      status: session.status,
      current_step: session.current_step,
      shipping_address: {
        first_name: session.shipping_first_name || '',
        last_name: session.shipping_last_name || '',
        address_line1: session.shipping_address_line1 || '',
        address_line2: session.shipping_address_line2 || '',
        city: session.shipping_city || '',
        state: session.shipping_state || '',
        zip: session.shipping_zip || ''
      },
      selected_shipping_method_id: session.selected_shipping_method_id || null,
      available_shipping_methods: methods,
      order_summary: orderSummary
    };
  }

  // getStaticPageContent(pageSlug)
  getStaticPageContent(pageSlug) {
    const pages = this._getFromStorage('static_pages', []);
    let page = null;
    for (let i = 0; i < pages.length; i++) {
      if (pages[i].slug === pageSlug) {
        page = pages[i];
        break;
      }
    }
    if (!page) {
      return {
        title: '',
        body_html: '',
        last_updated: null
      };
    }
    return {
      title: page.title || '',
      body_html: page.body_html || '',
      last_updated: page.last_updated || null
    };
  }

  // getFaqEntries(topic)
  getFaqEntries(topic) {
    const entries = this._getFromStorage('faq_entries', []);
    const result = [];
    for (let i = 0; i < entries.length; i++) {
      const e = entries[i];
      if (topic) {
        const topics = e.topics || [];
        if (topics.indexOf(topic) === -1) continue;
      }
      result.push({
        faq_id: e.id,
        question: e.question,
        answer_html: e.answer_html,
        topics: e.topics || []
      });
    }
    return result;
  }

  // getContactInfo()
  getContactInfo() {
    const info = this._getFromStorage('contact_info', null);
    if (!info) {
      return {
        support_email: '',
        support_phone: '',
        support_hours: ''
      };
    }
    return {
      support_email: info.support_email || '',
      support_phone: info.support_phone || '',
      support_hours: info.support_hours || ''
    };
  }

  // submitContactRequest(name, email, subject, message)
  submitContactRequest(name, email, subject, message) {
    const requests = this._getFromStorage('contact_requests', []);
    const ticketId = this._generateId('ticket');
    requests.push({
      id: ticketId,
      name: name,
      email: email,
      subject: subject,
      message: message,
      created_at: this._now()
    });
    this._saveToStorage('contact_requests', requests);
    return {
      success: true,
      message: 'Request submitted',
      ticket_id: ticketId
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