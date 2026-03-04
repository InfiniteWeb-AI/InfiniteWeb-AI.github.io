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
  }

  _initStorage() {
    // Initialize all data tables in localStorage if not exist
    const keys = [
      'products',
      'categories',
      'subcategories',
      'carts',
      'cart_items',
      'favorites',
      'product_comparisons',
      'teacher_profiles',
      'shipping_addresses',
      'shipping_methods',
      'promo_codes',
      'checkout_sessions',
      'membership_plans',
      'membership_signups',
      'contact_tickets'
    ];

    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    }

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

  // ---------------------- Private helpers ----------------------

  _getOrCreateCart() {
    const carts = this._getFromStorage('carts');
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
        items: [], // optional list of cartItemIds
        status: 'active',
        subtotal: 0,
        discountTotal: 0,
        shippingCost: 0,
        taxTotal: 0,
        total: 0,
        createdAt: this._now(),
        updatedAt: this._now()
      };
      carts.push(cart);
      this._saveToStorage('carts', carts);
    }
    return cart;
  }

  _recalculateCartTotals(cart, cartItems) {
    const products = this._getFromStorage('products');
    let subtotal = 0;
    const activeItems = [];
    for (let i = 0; i < cartItems.length; i++) {
      const item = cartItems[i];
      if (item.cartId === cart.id && item.status === 'active') {
        subtotal += item.lineSubtotal || 0;
        activeItems.push(item);
      }
    }

    cart.subtotal = subtotal;
    // Discount, shipping, and tax at cart level are kept simple here;
    // detailed promo/shipping is handled in checkout session.
    if (typeof cart.discountTotal !== 'number') cart.discountTotal = 0;
    if (typeof cart.shippingCost !== 'number') cart.shippingCost = 0;
    if (typeof cart.taxTotal !== 'number') cart.taxTotal = 0;
    cart.total = cart.subtotal - cart.discountTotal + cart.shippingCost + cart.taxTotal;
    cart.updatedAt = this._now();

    // keep optional items array in sync with active & saved items
    const relatedIds = [];
    for (let i = 0; i < cartItems.length; i++) {
      if (cartItems[i].cartId === cart.id && cartItems[i].status !== 'removed') {
        relatedIds.push(cartItems[i].id);
      }
    }
    cart.items = relatedIds;

    // persist carts array
    const carts = this._getFromStorage('carts');
    for (let i = 0; i < carts.length; i++) {
      if (carts[i].id === cart.id) {
        carts[i] = cart;
        break;
      }
    }
    this._saveToStorage('carts', carts);

    return cart;
  }

  _getOrCreateCheckoutSession() {
    const cart = this._getOrCreateCart();
    let sessions = this._getFromStorage('checkout_sessions');
    let session = null;
    for (let i = 0; i < sessions.length; i++) {
      const s = sessions[i];
      if (s.cartId === cart.id && s.status === 'in_progress') {
        session = s;
        break;
      }
    }
    if (!session) {
      session = {
        id: this._generateId('checkout'),
        cartId: cart.id,
        shippingAddressId: null,
        shippingMethodId: null,
        promoCodeIds: [],
        status: 'in_progress',
        subtotal: cart.subtotal || 0,
        discountTotal: 0,
        shippingCost: 0,
        taxTotal: 0,
        total: cart.subtotal || 0,
        step: 'shipping_promo',
        createdAt: this._now(),
        updatedAt: this._now()
      };
      sessions.push(session);
      this._saveToStorage('checkout_sessions', sessions);
    }
    return session;
  }

  _applyPromoCode(session, promoCodeEntity, cartSubtotal) {
    if (!promoCodeEntity || promoCodeEntity.isActive !== true) {
      return { applied: false, reason: 'invalid_code' };
    }
    const now = new Date();
    if (promoCodeEntity.validFrom) {
      const from = new Date(promoCodeEntity.validFrom);
      if (now < from) {
        return { applied: false, reason: 'not_yet_valid' };
      }
    }
    if (promoCodeEntity.validTo) {
      const to = new Date(promoCodeEntity.validTo);
      if (now > to) {
        return { applied: false, reason: 'expired' };
      }
    }
    if (typeof promoCodeEntity.minOrderAmount === 'number') {
      if (cartSubtotal < promoCodeEntity.minOrderAmount) {
        return { applied: false, reason: 'min_order_not_met' };
      }
    }

    if (!session.promoCodeIds) session.promoCodeIds = [];
    const already = session.promoCodeIds.indexOf(promoCodeEntity.id) !== -1;
    if (!already) {
      session.promoCodeIds.push(promoCodeEntity.id);
    }
    return { applied: true };
  }

  _recalculateCheckoutTotals(session, cart) {
    const promoCodes = this._getFromStorage('promo_codes');
    const shippingMethods = this._getFromStorage('shipping_methods');

    const subtotal = cart.subtotal || 0;
    let shippingCost = 0;
    let discountTotal = 0;

    // Determine base shipping cost from selected method
    let selectedShipping = null;
    if (session.shippingMethodId) {
      for (let i = 0; i < shippingMethods.length; i++) {
        if (shippingMethods[i].id === session.shippingMethodId) {
          selectedShipping = shippingMethods[i];
          break;
        }
      }
    }
    if (selectedShipping) {
      shippingCost = selectedShipping.baseCost || 0;
    }

    // Apply promo codes
    if (session.promoCodeIds && session.promoCodeIds.length > 0) {
      for (let i = 0; i < session.promoCodeIds.length; i++) {
        const codeId = session.promoCodeIds[i];
        let promo = null;
        for (let j = 0; j < promoCodes.length; j++) {
          if (promoCodes[j].id === codeId && promoCodes[j].isActive === true) {
            promo = promoCodes[j];
            break;
          }
        }
        if (!promo) continue;
        // simple re-validation of minOrderAmount
        if (typeof promo.minOrderAmount === 'number' && subtotal < promo.minOrderAmount) {
          continue;
        }
        if (promo.discountType === 'percentage') {
          const value = typeof promo.discountValue === 'number' ? promo.discountValue : 0;
          discountTotal += subtotal * (value / 100);
        } else if (promo.discountType === 'fixed_amount') {
          const value = typeof promo.discountValue === 'number' ? promo.discountValue : 0;
          discountTotal += value;
        } else if (promo.discountType === 'free_shipping') {
          shippingCost = 0;
        }
      }
    }

    if (discountTotal > subtotal) {
      discountTotal = subtotal;
    }

    const taxTotal = 0; // tax simulation omitted
    const total = subtotal - discountTotal + shippingCost + taxTotal;

    session.subtotal = subtotal;
    session.discountTotal = discountTotal;
    session.shippingCost = shippingCost;
    session.taxTotal = taxTotal;
    session.total = total;
    session.updatedAt = this._now();

    // persist
    const sessions = this._getFromStorage('checkout_sessions');
    for (let i = 0; i < sessions.length; i++) {
      if (sessions[i].id === session.id) {
        sessions[i] = session;
        break;
      }
    }
    this._saveToStorage('checkout_sessions', sessions);

    return session;
  }

  _getCurrentTeacherProfile() {
    const profiles = this._getFromStorage('teacher_profiles');
    if (profiles.length > 0) return profiles[0];
    return null;
  }

  _getCurrentMembershipSignup() {
    const signups = this._getFromStorage('membership_signups');
    if (signups.length === 0) return null;
    // Prefer last created/confirmed
    let latest = null;
    for (let i = 0; i < signups.length; i++) {
      const s = signups[i];
      if (!latest) {
        latest = s;
      } else {
        const t1 = new Date(latest.createdAt || 0).getTime();
        const t2 = new Date(s.createdAt || 0).getTime();
        if (t2 > t1) latest = s;
      }
    }
    return latest;
  }

  _resolveProductListItemView(product) {
    const categories = this._getFromStorage('categories');
    const subcategories = this._getFromStorage('subcategories');
    let categoryName = null;
    let subcategoryName = null;
    for (let i = 0; i < categories.length; i++) {
      if (categories[i].id === product.categoryId) {
        categoryName = categories[i].name;
        break;
      }
    }
    for (let j = 0; j < subcategories.length; j++) {
      if (subcategories[j].id === product.subcategoryId) {
        subcategoryName = subcategories[j].name;
        break;
      }
    }

    const isInStock = product.status === 'active' && (
      typeof product.stockQuantity !== 'number' || product.stockQuantity > 0
    );

    return {
      productId: product.id,
      name: product.name,
      shortDescription: product.shortDescription || '',
      price: product.price,
      currency: product.currency,
      gradeLevel: product.gradeLevel || null,
      subject: product.subject || null,
      resourceType: product.resourceType || null,
      format: product.format || null,
      licenseType: product.licenseType || null,
      isFreeShipping: product.isFreeShipping || false,
      shippingType: product.shippingType || null,
      ratingAverage: typeof product.ratingAverage === 'number' ? product.ratingAverage : 0,
      reviewCount: typeof product.reviewCount === 'number' ? product.reviewCount : 0,
      totalSales: typeof product.totalSales === 'number' ? product.totalSales : 0,
      thumbnailImage: product.thumbnailImage || null,
      categoryName: categoryName,
      subcategoryName: subcategoryName,
      stockQuantity: typeof product.stockQuantity === 'number' ? product.stockQuantity : null,
      isInStock: isInStock,
      tags: product.tags || []
    };
  }

  _filterAndSortProducts(products, filters, sortBy, query) {
    let result = products.slice();
    const q = (query || '').trim().toLowerCase();

    if (q) {
      const terms = q.split(/\s+/).filter(Boolean);
      result = result.filter(function (p) {
        const haystack = [
          p.name || '',
          p.shortDescription || '',
          p.longDescription || '',
          p.subject || '',
          (p.tags || []).join(' ')
        ].join(' ').toLowerCase();
        // Match when all search terms are present somewhere in the combined text
        return terms.every(function (term) {
          return haystack.indexOf(term) !== -1;
        });
      });
    }

    filters = filters || {};

    if (filters.gradeLevels && filters.gradeLevels.length > 0) {
      result = result.filter(function (p) {
        return p.gradeLevel && filters.gradeLevels.indexOf(p.gradeLevel) !== -1;
      });
    }

    if (filters.subjects && filters.subjects.length > 0) {
      result = result.filter(function (p) {
        return p.subject && filters.subjects.indexOf(p.subject) !== -1;
      });
    }

    if (filters.resourceTypes && filters.resourceTypes.length > 0) {
      result = result.filter(function (p) {
        return p.resourceType && filters.resourceTypes.indexOf(p.resourceType) !== -1;
      });
    }

    if (typeof filters.minPrice === 'number') {
      result = result.filter(function (p) {
        return typeof p.price === 'number' && p.price >= filters.minPrice;
      });
    }

    if (typeof filters.maxPrice === 'number') {
      result = result.filter(function (p) {
        return typeof p.price === 'number' && p.price <= filters.maxPrice;
      });
    }

    if (typeof filters.minRating === 'number') {
      result = result.filter(function (p) {
        return typeof p.ratingAverage === 'number' && p.ratingAverage >= filters.minRating;
      });
    }

    if (filters.onlyFreeShipping) {
      result = result.filter(function (p) {
        return p.isFreeShipping === true;
      });
    }

    if (filters.formats && filters.formats.length > 0) {
      result = result.filter(function (p) {
        return p.format && filters.formats.indexOf(p.format) !== -1;
      });
    }

    if (filters.licenseTypes && filters.licenseTypes.length > 0) {
      result = result.filter(function (p) {
        return p.licenseType && filters.licenseTypes.indexOf(p.licenseType) !== -1;
      });
    }

    if (filters.theme) {
      const themeLower = filters.theme.toLowerCase();
      result = result.filter(function (p) {
        return p.theme && p.theme.toLowerCase() === themeLower;
      });
    }

    if (filters.tags && filters.tags.length > 0) {
      result = result.filter(function (p) {
        if (!p.tags || !p.tags.length) return false;
        for (let i = 0; i < filters.tags.length; i++) {
          if (p.tags.indexOf(filters.tags[i]) !== -1) return true;
        }
        return false;
      });
    }

    const sortKey = sortBy || 'relevance';

    result.sort(function (a, b) {
      if (sortKey === 'price_asc') {
        return (a.price || 0) - (b.price || 0);
      }
      if (sortKey === 'price_desc') {
        return (b.price || 0) - (a.price || 0);
      }
      if (sortKey === 'rating_desc') {
        const ra = typeof a.ratingAverage === 'number' ? a.ratingAverage : 0;
        const rb = typeof b.ratingAverage === 'number' ? b.ratingAverage : 0;
        if (rb !== ra) return rb - ra;
        const rca = typeof a.reviewCount === 'number' ? a.reviewCount : 0;
        const rcb = typeof b.reviewCount === 'number' ? b.reviewCount : 0;
        return rcb - rca;
      }
      if (sortKey === 'best_selling') {
        const sa = typeof a.totalSales === 'number' ? a.totalSales : 0;
        const sb = typeof b.totalSales === 'number' ? b.totalSales : 0;
        return sb - sa;
      }
      // relevance: keep as-is; if query present, we could tweak based on rating/sales
      return 0;
    });

    return result;
  }

  _calculateEffectiveMembershipCosts(plans) {
    if (!plans || !plans.length) return [];
    // Clone
    const cloned = [];
    for (let i = 0; i < plans.length; i++) {
      const p = plans[i];
      const c = {};
      for (const k in p) {
        if (Object.prototype.hasOwnProperty.call(p, k)) c[k] = p[k];
      }
      let effective = 0;
      if (p.billingFrequency === 'monthly') {
        effective = typeof p.monthlyPrice === 'number' ? p.monthlyPrice : 0;
      } else if (p.billingFrequency === 'yearly') {
        if (typeof p.yearlyPrice === 'number') {
          effective = p.yearlyPrice / 12;
        }
      }
      c.effectiveMonthlyCost = effective;
      cloned.push(c);
    }

    // Compute savingsPercentage vs the most expensive effective monthly cost
    let maxEffective = 0;
    for (let i = 0; i < cloned.length; i++) {
      if (cloned[i].effectiveMonthlyCost > maxEffective) {
        maxEffective = cloned[i].effectiveMonthlyCost;
      }
    }
    for (let i = 0; i < cloned.length; i++) {
      const eff = cloned[i].effectiveMonthlyCost;
      if (!maxEffective || !eff) {
        cloned[i].savingsPercentage = 0;
      } else {
        cloned[i].savingsPercentage = Math.round((1 - eff / maxEffective) * 100);
      }
    }

    return cloned;
  }

  _buildProductComparisonHighlight(products) {
    if (!products || !products.length) {
      return {
        bestByRatingProductId: null,
        bestByReviewsProductId: null,
        tieBreakRule: 'higher_rating_then_review_count'
      };
    }

    let bestRating = null;
    let bestRatingId = null;
    let bestReviews = null;
    let bestReviewsId = null;

    for (let i = 0; i < products.length; i++) {
      const p = products[i];
      const r = typeof p.ratingAverage === 'number' ? p.ratingAverage : 0;
      const rc = typeof p.reviewCount === 'number' ? p.reviewCount : 0;

      if (bestRating === null || r > bestRating || (r === bestRating && rc > (typeof products.find(function (x) { return x.productId === bestRatingId; })?.reviewCount === 'number' ? products.find(function (x) { return x.productId === bestRatingId; }).reviewCount : 0))) {
        bestRating = r;
        bestRatingId = p.productId;
      }

      if (bestReviews === null || rc > bestReviews) {
        bestReviews = rc;
        bestReviewsId = p.productId;
      }
    }

    return {
      bestByRatingProductId: bestRatingId,
      bestByReviewsProductId: bestReviewsId,
      tieBreakRule: 'higher_rating_then_review_count'
    };
  }

  _buildHeaderSummary() {
    const cartItems = this._getFromStorage('cart_items');
    const carts = this._getFromStorage('carts');
    const favorites = this._getFromStorage('favorites');
    const profiles = this._getFromStorage('teacher_profiles');
    const signups = this._getFromStorage('membership_signups');

    let activeCart = null;
    for (let i = 0; i < carts.length; i++) {
      if (carts[i].status === 'active') {
        activeCart = carts[i];
        break;
      }
    }

    let cartItemCount = 0;
    let savedForLaterCount = 0;
    if (activeCart) {
      for (let i = 0; i < cartItems.length; i++) {
        const item = cartItems[i];
        if (item.cartId === activeCart.id) {
          if (item.status === 'active') cartItemCount += item.quantity || 0;
          if (item.status === 'saved_for_later') savedForLaterCount += item.quantity || 0;
        }
      }
    }

    let hasActiveMembership = false;
    for (let i = 0; i < signups.length; i++) {
      if (signups[i].status === 'confirmed') {
        hasActiveMembership = true;
        break;
      }
    }

    return {
      cartItemCount: cartItemCount,
      savedForLaterCount: savedForLaterCount,
      favoritesCount: favorites.length,
      hasTeacherProfile: profiles.length > 0,
      hasActiveMembership: hasActiveMembership
    };
  }

  _resolveForeignKeysInCartView(cart, cartItems) {
    const products = this._getFromStorage('products');
    const activeItems = [];
    const savedItems = [];

    for (let i = 0; i < cartItems.length; i++) {
      const item = cartItems[i];
      if (item.cartId !== cart.id) continue;
      if (item.status === 'removed') continue;

      let product = null;
      for (let j = 0; j < products.length; j++) {
        if (products[j].id === item.productId) {
          product = products[j];
          break;
        }
      }

      const viewItem = {
        cartItemId: item.id,
        productId: item.productId,
        productName: product ? product.name : null,
        productThumbnail: product ? product.thumbnailImage : null,
        unitPrice: item.unitPrice,
        currency: product ? product.currency : 'usd',
        quantity: item.quantity,
        lineSubtotal: item.lineSubtotal,
        status: item.status,
        isDigital: product ? product.format === 'instant_digital_download' : false,
        isFreeShipping: product ? !!product.isFreeShipping : false,
        shippingType: product ? product.shippingType || null : null,
        product: product || null
      };

      if (item.status === 'active') {
        activeItems.push(viewItem);
      } else if (item.status === 'saved_for_later') {
        savedItems.push(viewItem);
      }
    }

    const itemCount = activeItems.reduce(function (acc, it) { return acc + (it.quantity || 0); }, 0);

    return {
      cartId: cart.id,
      status: cart.status,
      items: activeItems,
      savedForLaterItems: savedItems,
      subtotal: cart.subtotal || 0,
      discountTotal: cart.discountTotal || 0,
      shippingCost: cart.shippingCost || 0,
      taxTotal: cart.taxTotal || 0,
      total: cart.total || 0,
      itemCount: itemCount,
      lastUpdated: cart.updatedAt || cart.createdAt || this._now()
    };
  }

  _resolveShippingAddress(shippingAddressId) {
    if (!shippingAddressId) return null;
    const addresses = this._getFromStorage('shipping_addresses');
    for (let i = 0; i < addresses.length; i++) {
      if (addresses[i].id === shippingAddressId) {
        return {
          firstName: addresses[i].firstName,
          lastName: addresses[i].lastName,
          streetAddress: addresses[i].streetAddress,
          city: addresses[i].city,
          state: addresses[i].state,
          zipCode: addresses[i].zipCode
        };
      }
    }
    return null;
  }

  _buildCheckoutSessionView(session) {
    const cartItems = this._getFromStorage('cart_items');
    const carts = this._getFromStorage('carts');
    const shippingMethods = this._getFromStorage('shipping_methods');
    const promoCodes = this._getFromStorage('promo_codes');

    let cart = null;
    for (let i = 0; i < carts.length; i++) {
      if (carts[i].id === session.cartId) {
        cart = carts[i];
        break;
      }
    }
    if (!cart) {
      cart = this._getOrCreateCart();
    }

    const cartView = this._resolveForeignKeysInCartView(cart, cartItems);

    // available shipping methods
    const availableShippingMethods = [];
    let selectedShippingMethodId = session.shippingMethodId || null;

    for (let i = 0; i < shippingMethods.length; i++) {
      const sm = shippingMethods[i];
      const id = sm.id;
      if (!selectedShippingMethodId && sm.isDefault) {
        selectedShippingMethodId = id;
      }
      availableShippingMethods.push({
        shippingMethodId: id,
        name: sm.name,
        code: sm.code,
        description: sm.description || '',
        deliveryMinDays: sm.deliveryMinDays || null,
        deliveryMaxDays: sm.deliveryMaxDays || null,
        cost: sm.baseCost || 0,
        isDefault: !!sm.isDefault,
        isSelected: session.shippingMethodId === id
      });
    }

    // if no explicit selection but we have a default, update session
    if (!session.shippingMethodId && selectedShippingMethodId) {
      session.shippingMethodId = selectedShippingMethodId;
      this._recalculateCheckoutTotals(session, cart);
    }

    const appliedPromoCodes = [];
    if (session.promoCodeIds && session.promoCodeIds.length > 0) {
      for (let i = 0; i < session.promoCodeIds.length; i++) {
        const codeId = session.promoCodeIds[i];
        for (let j = 0; j < promoCodes.length; j++) {
          const pc = promoCodes[j];
          if (pc.id === codeId) {
            appliedPromoCodes.push({
              code: pc.code,
              description: pc.description || '',
              discountType: pc.discountType,
              discountValue: pc.discountValue || 0
            });
            break;
          }
        }
      }
    }

    const shippingAddress = this._resolveShippingAddress(session.shippingAddressId);

    const selectedShippingMethod = (function () {
      for (let i = 0; i < shippingMethods.length; i++) {
        if (shippingMethods[i].id === session.shippingMethodId) return shippingMethods[i];
      }
      return null;
    })();

    return {
      checkoutSessionId: session.id,
      status: session.status,
      step: session.step || 'shipping_promo',
      cart: cartView,
      shippingAddress: shippingAddress,
      availableShippingMethods: availableShippingMethods,
      selectedShippingMethodId: session.shippingMethodId,
      selectedShippingMethod: selectedShippingMethod,
      appliedPromoCodes: appliedPromoCodes,
      pricingSummary: {
        subtotal: session.subtotal || cartView.subtotal || 0,
        discountTotal: session.discountTotal || 0,
        shippingCost: session.shippingCost || 0,
        taxTotal: session.taxTotal || 0,
        total: session.total || cartView.total || 0
      }
    };
  }

  // ---------------------- Core interface implementations ----------------------

  // getHomepageData
  getHomepageData() {
    const categories = this._getFromStorage('categories');
    const products = this._getFromStorage('products');

    const activeProducts = products.filter(function (p) { return p.status === 'active'; });

    // Featured products: highest rating
    const featuredSorted = activeProducts.slice().sort(function (a, b) {
      const ra = typeof a.ratingAverage === 'number' ? a.ratingAverage : 0;
      const rb = typeof b.ratingAverage === 'number' ? b.ratingAverage : 0;
      if (rb !== ra) return rb - ra;
      const rca = typeof a.reviewCount === 'number' ? a.reviewCount : 0;
      const rcb = typeof b.reviewCount === 'number' ? b.reviewCount : 0;
      return rcb - rca;
    });

    const featuredProducts = [];
    for (let i = 0; i < featuredSorted.length && i < 8; i++) {
      const view = this._resolveProductListItemView(featuredSorted[i]);
      // add badgeLabels (simple example)
      const badges = [];
      if ((view.ratingAverage || 0) >= 4.5) badges.push('Top Rated');
      if ((view.totalSales || 0) > 100) badges.push('Best Seller');
      view.badgeLabels = badges;
      featuredProducts.push(view);
    }

    // Best selling products
    const bestSorted = activeProducts.slice().sort(function (a, b) {
      const sa = typeof a.totalSales === 'number' ? a.totalSales : 0;
      const sb = typeof b.totalSales === 'number' ? b.totalSales : 0;
      return sb - sa;
    });
    const bestSellingProducts = [];
    for (let i = 0; i < bestSorted.length && i < 8; i++) {
      const view = this._resolveProductListItemView(bestSorted[i]);
      const badges = [];
      if ((view.ratingAverage || 0) >= 4.5) badges.push('Top Rated');
      if ((view.totalSales || 0) > 100) badges.push('Best Seller');
      view.badgeLabels = badges;
      bestSellingProducts.push(view);
    }

    // Seasonal highlights: left empty unless some custom logic wanted
    const seasonalHighlights = [];

    const headerSummary = this._buildHeaderSummary();

    return {
      categories: categories,
      featuredProducts: featuredProducts,
      bestSellingProducts: bestSellingProducts,
      seasonalHighlights: seasonalHighlights,
      headerSummary: headerSummary
    };
  }

  // getHeaderSummary
  getHeaderSummary() {
    return this._buildHeaderSummary();
  }

  // getCategories
  getCategories() {
    return this._getFromStorage('categories');
  }

  // getCategoryLandingPageData(categorySlug)
  getCategoryLandingPageData(categorySlug) {
    const categories = this._getFromStorage('categories');
    const subcategories = this._getFromStorage('subcategories');
    const products = this._getFromStorage('products');

    let category = null;
    for (let i = 0; i < categories.length; i++) {
      if (categories[i].slug === categorySlug) {
        category = categories[i];
        break;
      }
    }

    if (!category) {
      return {
        category: null,
        subcategories: [],
        featuredProducts: [],
        bestSellingProducts: []
      };
    }

    const categorySubcats = [];
    for (let i = 0; i < subcategories.length; i++) {
      if (subcategories[i].categoryId === category.id) {
        categorySubcats.push(Object.assign({}, subcategories[i], { category: category }));
      }
    }

    const activeProducts = products.filter(function (p) {
      return p.status === 'active' && p.categoryId === category.id;
    });

    const featuredSorted = activeProducts.slice().sort(function (a, b) {
      const ra = typeof a.ratingAverage === 'number' ? a.ratingAverage : 0;
      const rb = typeof b.ratingAverage === 'number' ? b.ratingAverage : 0;
      if (rb !== ra) return rb - ra;
      const rca = typeof a.reviewCount === 'number' ? a.reviewCount : 0;
      const rcb = typeof b.reviewCount === 'number' ? b.reviewCount : 0;
      return rcb - rca;
    });

    const featuredProducts = [];
    for (let i = 0; i < featuredSorted.length && i < 8; i++) {
      const view = this._resolveProductListItemView(featuredSorted[i]);
      featuredProducts.push(view);
    }

    const bestSorted = activeProducts.slice().sort(function (a, b) {
      const sa = typeof a.totalSales === 'number' ? a.totalSales : 0;
      const sb = typeof b.totalSales === 'number' ? b.totalSales : 0;
      return sb - sa;
    });
    const bestSellingProducts = [];
    for (let i = 0; i < bestSorted.length && i < 8; i++) {
      const view = this._resolveProductListItemView(bestSorted[i]);
      bestSellingProducts.push(view);
    }

    return {
      category: {
        id: category.id,
        name: category.name,
        slug: category.slug,
        description: category.description || ''
      },
      subcategories: categorySubcats,
      featuredProducts: featuredProducts,
      bestSellingProducts: bestSellingProducts
    };
  }

  // getFilterOptions(context, categorySlug, subcategorySlug, baseQuery)
  getFilterOptions(context, categorySlug, subcategorySlug, baseQuery) {
    // Static + data-driven options where sensible
    const gradeLevels = [
      { value: 'pre_k', label: 'Pre-K' },
      { value: 'kindergarten', label: 'Kindergarten' },
      { value: '1st_grade', label: '1st Grade' },
      { value: '2nd_grade', label: '2nd Grade' },
      { value: '3rd_grade', label: '3rd Grade' },
      { value: '4th_grade', label: '4th Grade' },
      { value: '5th_grade', label: '5th Grade' },
      { value: '6th_grade', label: '6th Grade' },
      { value: '7th_grade', label: '7th Grade' },
      { value: '8th_grade', label: '8th Grade' },
      { value: '9th_grade', label: '9th Grade' },
      { value: '10th_grade', label: '10th Grade' },
      { value: '11th_grade', label: '11th Grade' },
      { value: '12th_grade', label: '12th Grade' },
      { value: 'mixed_grades', label: 'Mixed Grades' }
    ];

    const resourceTypes = [
      { value: 'worksheet', label: 'Worksheets' },
      { value: 'bundle', label: 'Bundles' },
      { value: 'digital_activity', label: 'Digital Activities' },
      { value: 'bulletin_board_set', label: 'Bulletin Board Sets' },
      { value: 'poster', label: 'Posters' },
      { value: 'classroom_supply', label: 'Classroom Supplies' }
    ];

    const formats = [
      { value: 'instant_digital_download', label: 'Instant Digital Download' },
      { value: 'physical_product', label: 'Physical Product' },
      { value: 'mixed', label: 'Mixed Format' }
    ];

    const licenseTypes = [
      { value: 'single_classroom_use', label: 'Single Classroom Use' },
      { value: 'multiple_classroom_use', label: 'Multiple Classroom Use' },
      { value: 'schoolwide_license', label: 'School-wide License' },
      { value: 'other', label: 'Other License' }
    ];

    const ratingOptions = [
      { minRating: 4, label: '4 stars & up' },
      { minRating: 3, label: '3 stars & up' },
      { minRating: 2, label: '2 stars & up' },
      { minRating: 1, label: '1 star & up' }
    ];

    const shippingOptions = [
      { key: 'free_shipping', label: 'Free shipping', description: 'Only show items with free shipping' }
    ];

    const sortOptions = [
      { value: 'relevance', label: 'Relevance' },
      { value: 'rating_desc', label: 'Rating: High to Low' },
      { value: 'price_asc', label: 'Price: Low to High' },
      { value: 'price_desc', label: 'Price: High to Low' },
      { value: 'best_selling', label: 'Best Selling' }
    ];

    // priceRange based on current products in context
    const products = this._getFromStorage('products');
    const categories = this._getFromStorage('categories');
    const subcategories = this._getFromStorage('subcategories');

    let filtered = products.filter(function (p) { return p.status === 'active'; });

    if (categorySlug) {
      let categoryId = null;
      for (let i = 0; i < categories.length; i++) {
        if (categories[i].slug === categorySlug) {
          categoryId = categories[i].id;
          break;
        }
      }
      if (categoryId) {
        filtered = filtered.filter(function (p) { return p.categoryId === categoryId; });
      }
    }

    if (subcategorySlug) {
      let subcategoryId = null;
      for (let i = 0; i < subcategories.length; i++) {
        if (subcategories[i].slug === subcategorySlug) {
          subcategoryId = subcategories[i].id;
          break;
        }
      }
      if (subcategoryId) {
        filtered = filtered.filter(function (p) { return p.subcategoryId === subcategoryId; });
      }
    }

    let minPrice = null;
    let maxPrice = null;
    for (let i = 0; i < filtered.length; i++) {
      const price = filtered[i].price;
      if (typeof price !== 'number') continue;
      if (minPrice === null || price < minPrice) minPrice = price;
      if (maxPrice === null || price > maxPrice) maxPrice = price;
    }

    if (minPrice === null) minPrice = 0;
    if (maxPrice === null) maxPrice = 0;

    // themes from products
    const themeSet = {};
    for (let i = 0; i < filtered.length; i++) {
      const t = filtered[i].theme;
      if (t) themeSet[t] = true;
    }
    const themes = Object.keys(themeSet);

    // subjects from products
    const subjectSet = {};
    for (let i = 0; i < filtered.length; i++) {
      const s = filtered[i].subject;
      if (s) subjectSet[s] = true;
    }
    const subjects = Object.keys(subjectSet).map(function (s) { return { value: s, label: s }; });

    return {
      gradeLevels: gradeLevels,
      subjects: subjects,
      resourceTypes: resourceTypes,
      formats: formats,
      licenseTypes: licenseTypes,
      priceRange: {
        minAllowed: minPrice,
        maxAllowed: maxPrice,
        currency: 'usd',
        suggestedBuckets: [
          { label: 'Under $5', min: 0, max: 5 },
          { label: '$5 - $10', min: 5, max: 10 },
          { label: '$10 - $20', min: 10, max: 20 },
          { label: '$20 - $50', min: 20, max: 50 }
        ]
      },
      ratingOptions: ratingOptions,
      shippingOptions: shippingOptions,
      themes: themes,
      sortOptions: sortOptions
    };
  }

  // searchProducts
  searchProducts(query, categorySlug, subcategorySlug, page, pageSize, filters, sortBy) {
    const products = this._getFromStorage('products');
    const categories = this._getFromStorage('categories');
    const subcategories = this._getFromStorage('subcategories');

    let filtered = products.filter(function (p) { return p.status === 'active'; });

    if (categorySlug) {
      let categoryId = null;
      for (let i = 0; i < categories.length; i++) {
        if (categories[i].slug === categorySlug) {
          categoryId = categories[i].id;
          break;
        }
      }
      if (categoryId) {
        filtered = filtered.filter(function (p) { return p.categoryId === categoryId; });
      }
    }

    if (subcategorySlug) {
      let subcategoryId = null;
      for (let i = 0; i < subcategories.length; i++) {
        if (subcategories[i].slug === subcategorySlug) {
          subcategoryId = subcategories[i].id;
          break;
        }
      }
      if (subcategoryId) {
        filtered = filtered.filter(function (p) { return p.subcategoryId === subcategoryId; });
      }
    }

    filtered = this._filterAndSortProducts(filtered, filters || {}, sortBy, query);

    const totalCount = filtered.length;
    const currentPage = typeof page === 'number' && page > 0 ? page : 1;
    const size = typeof pageSize === 'number' && pageSize > 0 ? pageSize : 20;
    const start = (currentPage - 1) * size;
    const end = start + size;

    const pageItems = filtered.slice(start, end).map(this._resolveProductListItemView.bind(this));

    return {
      totalCount: totalCount,
      page: currentPage,
      pageSize: size,
      products: pageItems
    };
  }

  // getProductDetails(productId)
  getProductDetails(productId) {
    const products = this._getFromStorage('products');
    const categories = this._getFromStorage('categories');
    const subcategories = this._getFromStorage('subcategories');

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
        previewImages: [],
        previewDescription: '',
        ratingBreakdown: {
          fiveStarCount: 0,
          fourStarCount: 0,
          threeStarCount: 0,
          twoStarCount: 0,
          oneStarCount: 0
        },
        relatedProducts: []
      };
    }

    let category = null;
    let subcategory = null;

    for (let i = 0; i < categories.length; i++) {
      if (categories[i].id === product.categoryId) {
        category = categories[i];
        break;
      }
    }
    for (let j = 0; j < subcategories.length; j++) {
      if (subcategories[j].id === product.subcategoryId) {
        subcategory = subcategories[j];
        break;
      }
    }

    const previewImages = product.imageGallery && product.imageGallery.length
      ? product.imageGallery
      : (product.thumbnailImage ? [product.thumbnailImage] : []);

    const previewDescription = product.longDescription || product.shortDescription || '';

    // ratingBreakdown is not stored; return zeros.
    const ratingBreakdown = {
      fiveStarCount: 0,
      fourStarCount: 0,
      threeStarCount: 0,
      twoStarCount: 0,
      oneStarCount: 0
    };

    const relatedProductsRaw = products.filter(function (p) {
      if (p.id === product.id) return false;
      if (p.status !== 'active') return false;
      if (product.subject && p.subject !== product.subject) return false;
      if (product.gradeLevel && p.gradeLevel !== product.gradeLevel) return false;
      return true;
    });

    const relatedProducts = [];
    for (let i = 0; i < relatedProductsRaw.length && i < 8; i++) {
      const rp = relatedProductsRaw[i];
      relatedProducts.push({
        productId: rp.id,
        name: rp.name,
        shortDescription: rp.shortDescription || '',
        price: rp.price,
        currency: rp.currency,
        gradeLevel: rp.gradeLevel || null,
        subject: rp.subject || null,
        resourceType: rp.resourceType || null,
        format: rp.format || null,
        ratingAverage: typeof rp.ratingAverage === 'number' ? rp.ratingAverage : 0,
        reviewCount: typeof rp.reviewCount === 'number' ? rp.reviewCount : 0,
        thumbnailImage: rp.thumbnailImage || null
      });
    }

    const shippingDisplayText = (function () {
      if (product.shippingType === 'digital_delivery') return 'Instant digital download';
      if (product.isFreeShipping) return 'Free shipping';
      if (typeof product.estimatedShippingCost === 'number') {
        return 'Estimated shipping: $' + product.estimatedShippingCost.toFixed(2);
      }
      return '';
    })();

    const detailedProduct = {
      id: product.id,
      name: product.name,
      shortDescription: product.shortDescription || '',
      longDescription: product.longDescription || '',
      categoryId: product.categoryId || null,
      subcategoryId: product.subcategoryId || null,
      categoryName: category ? category.name : null,
      subcategoryName: subcategory ? subcategory.name : null,
      categorySlug: category ? category.slug : null,
      subcategorySlug: subcategory ? subcategory.slug : null,
      gradeLevel: product.gradeLevel || null,
      subject: product.subject || null,
      resourceType: product.resourceType || null,
      format: product.format || null,
      licenseType: product.licenseType || null,
      theme: product.theme || null,
      price: product.price,
      currency: product.currency,
      isFreeShipping: !!product.isFreeShipping,
      shippingType: product.shippingType || null,
      estimatedShippingCost: typeof product.estimatedShippingCost === 'number' ? product.estimatedShippingCost : null,
      shippingDisplayText: shippingDisplayText,
      ratingAverage: typeof product.ratingAverage === 'number' ? product.ratingAverage : 0,
      reviewCount: typeof product.reviewCount === 'number' ? product.reviewCount : 0,
      totalSales: typeof product.totalSales === 'number' ? product.totalSales : 0,
      thumbnailImage: product.thumbnailImage || null,
      imageGallery: product.imageGallery || [],
      tags: product.tags || [],
      stockQuantity: typeof product.stockQuantity === 'number' ? product.stockQuantity : null,
      status: product.status,
      category: category || null,
      subcategory: subcategory || null
    };

    return {
      product: detailedProduct,
      previewImages: previewImages,
      previewDescription: previewDescription,
      ratingBreakdown: ratingBreakdown,
      relatedProducts: relatedProducts
    };
  }

  // addToCart(productId, quantity = 1)
  addToCart(productId, quantity) {
    const qty = typeof quantity === 'number' && quantity > 0 ? quantity : 1;
    const products = this._getFromStorage('products');
    const cartItems = this._getFromStorage('cart_items');

    let product = null;
    for (let i = 0; i < products.length; i++) {
      if (products[i].id === productId) {
        product = products[i];
        break;
      }
    }
    if (!product || product.status !== 'active') {
      return { success: false, message: 'Product not available', cart: null };
    }

    const cart = this._getOrCreateCart();

    let existingItem = null;
    for (let i = 0; i < cartItems.length; i++) {
      if (cartItems[i].cartId === cart.id && cartItems[i].productId === productId && cartItems[i].status === 'active') {
        existingItem = cartItems[i];
        break;
      }
    }

    if (existingItem) {
      existingItem.quantity += qty;
      existingItem.lineSubtotal = existingItem.quantity * existingItem.unitPrice;
    } else {
      const newItem = {
        id: this._generateId('cartItem'),
        cartId: cart.id,
        productId: productId,
        quantity: qty,
        unitPrice: product.price,
        lineSubtotal: product.price * qty,
        status: 'active',
        addedAt: this._now()
      };
      cartItems.push(newItem);
    }

    this._saveToStorage('cart_items', cartItems);
    const updatedCart = this._recalculateCartTotals(cart, cartItems);
    const cartView = this._resolveForeignKeysInCartView(updatedCart, cartItems);

    return {
      success: true,
      message: 'Item added to cart',
      cart: cartView
    };
  }

  // getCart
  getCart() {
    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items');
    const cartView = this._resolveForeignKeysInCartView(cart, cartItems);
    return cartView;
  }

  // updateCartItemQuantity(cartItemId, quantity)
  updateCartItemQuantity(cartItemId, quantity) {
    if (typeof quantity !== 'number' || quantity <= 0) {
      return { success: false, message: 'Quantity must be positive', cart: null };
    }
    const cartItems = this._getFromStorage('cart_items');
    let item = null;
    for (let i = 0; i < cartItems.length; i++) {
      if (cartItems[i].id === cartItemId) {
        item = cartItems[i];
        break;
      }
    }
    if (!item) {
      return { success: false, message: 'Cart item not found', cart: null };
    }

    item.quantity = quantity;
    item.lineSubtotal = item.unitPrice * quantity;

    this._saveToStorage('cart_items', cartItems);

    const carts = this._getFromStorage('carts');
    let cart = null;
    for (let i = 0; i < carts.length; i++) {
      if (carts[i].id === item.cartId) {
        cart = carts[i];
        break;
      }
    }
    if (!cart) {
      cart = this._getOrCreateCart();
    }

    const updatedCart = this._recalculateCartTotals(cart, cartItems);
    const cartView = this._resolveForeignKeysInCartView(updatedCart, cartItems);

    return {
      success: true,
      message: 'Cart item updated',
      cart: cartView
    };
  }

  // removeCartItem(cartItemId)
  removeCartItem(cartItemId) {
    const cartItems = this._getFromStorage('cart_items');
    let item = null;
    for (let i = 0; i < cartItems.length; i++) {
      if (cartItems[i].id === cartItemId) {
        item = cartItems[i];
        break;
      }
    }
    if (!item) {
      return { success: false, message: 'Cart item not found', cart: null };
    }

    item.status = 'removed';

    this._saveToStorage('cart_items', cartItems);

    const carts = this._getFromStorage('carts');
    let cart = null;
    for (let i = 0; i < carts.length; i++) {
      if (carts[i].id === item.cartId) {
        cart = carts[i];
        break;
      }
    }
    if (!cart) {
      cart = this._getOrCreateCart();
    }

    const updatedCart = this._recalculateCartTotals(cart, cartItems);
    const cartView = this._resolveForeignKeysInCartView(updatedCart, cartItems);

    return {
      success: true,
      message: 'Cart item removed',
      cart: cartView
    };
  }

  // saveCartItemForLater(cartItemId)
  saveCartItemForLater(cartItemId) {
    const cartItems = this._getFromStorage('cart_items');
    let item = null;
    for (let i = 0; i < cartItems.length; i++) {
      if (cartItems[i].id === cartItemId) {
        item = cartItems[i];
        break;
      }
    }
    if (!item) {
      return { success: false, message: 'Cart item not found', cart: null };
    }

    item.status = 'saved_for_later';
    this._saveToStorage('cart_items', cartItems);

    const carts = this._getFromStorage('carts');
    let cart = null;
    for (let i = 0; i < carts.length; i++) {
      if (carts[i].id === item.cartId) {
        cart = carts[i];
        break;
      }
    }
    if (!cart) {
      cart = this._getOrCreateCart();
    }

    const updatedCart = this._recalculateCartTotals(cart, cartItems);
    const cartView = this._resolveForeignKeysInCartView(updatedCart, cartItems);

    return {
      success: true,
      message: 'Item saved for later',
      cart: cartView
    };
  }

  // moveSavedItemToCart(cartItemId)
  moveSavedItemToCart(cartItemId) {
    const cartItems = this._getFromStorage('cart_items');
    let item = null;
    for (let i = 0; i < cartItems.length; i++) {
      if (cartItems[i].id === cartItemId) {
        item = cartItems[i];
        break;
      }
    }
    if (!item) {
      return { success: false, message: 'Cart item not found', cart: null };
    }

    item.status = 'active';
    this._saveToStorage('cart_items', cartItems);

    const carts = this._getFromStorage('carts');
    let cart = null;
    for (let i = 0; i < carts.length; i++) {
      if (carts[i].id === item.cartId) {
        cart = carts[i];
        break;
      }
    }
    if (!cart) {
      cart = this._getOrCreateCart();
    }

    const updatedCart = this._recalculateCartTotals(cart, cartItems);
    const cartView = this._resolveForeignKeysInCartView(updatedCart, cartItems);

    return {
      success: true,
      message: 'Item moved to cart',
      cart: cartView
    };
  }

  // getCheckoutSession
  getCheckoutSession() {
    const cart = this._getOrCreateCart();
    let session = this._getOrCreateCheckoutSession();
    session = this._recalculateCheckoutTotals(session, cart);
    return this._buildCheckoutSessionView(session);
  }

  // updateCheckoutShippingAddress
  updateCheckoutShippingAddress(firstName, lastName, streetAddress, city, state, zipCode) {
    if (!firstName || !lastName || !streetAddress || !city || !state || !zipCode) {
      return { success: false, message: 'All address fields are required', shippingAddressId: null, checkoutSession: null };
    }

    const cart = this._getOrCreateCart();
    const session = this._getOrCreateCheckoutSession();

    const addresses = this._getFromStorage('shipping_addresses');
    const address = {
      id: this._generateId('shipaddr'),
      firstName: firstName,
      lastName: lastName,
      streetAddress: streetAddress,
      city: city,
      state: state,
      zipCode: zipCode,
      createdAt: this._now()
    };
    addresses.push(address);
    this._saveToStorage('shipping_addresses', addresses);

    session.shippingAddressId = address.id;
    session.updatedAt = this._now();

    const sessions = this._getFromStorage('checkout_sessions');
    for (let i = 0; i < sessions.length; i++) {
      if (sessions[i].id === session.id) {
        sessions[i] = session;
        break;
      }
    }
    this._saveToStorage('checkout_sessions', sessions);

    this._recalculateCheckoutTotals(session, cart);
    const view = this._buildCheckoutSessionView(session);

    return {
      success: true,
      message: 'Shipping address updated',
      shippingAddressId: address.id,
      checkoutSession: view
    };
  }

  // updateCheckoutShippingMethod(shippingMethodId)
  updateCheckoutShippingMethod(shippingMethodId) {
    const shippingMethods = this._getFromStorage('shipping_methods');
    let method = null;
    for (let i = 0; i < shippingMethods.length; i++) {
      if (shippingMethods[i].id === shippingMethodId) {
        method = shippingMethods[i];
        break;
      }
    }
    if (!method) {
      return { success: false, message: 'Shipping method not found', checkoutSession: null };
    }

    const cart = this._getOrCreateCart();
    const session = this._getOrCreateCheckoutSession();

    session.shippingMethodId = shippingMethodId;

    const sessions = this._getFromStorage('checkout_sessions');
    for (let i = 0; i < sessions.length; i++) {
      if (sessions[i].id === session.id) {
        sessions[i] = session;
        break;
      }
    }
    this._saveToStorage('checkout_sessions', sessions);

    this._recalculateCheckoutTotals(session, cart);
    const view = this._buildCheckoutSessionView(session);

    return {
      success: true,
      message: 'Shipping method updated',
      checkoutSession: view
    };
  }

  // applyPromoCodeToCheckout(promoCode)
  applyPromoCodeToCheckout(promoCode) {
    const codeText = (promoCode || '').trim();
    if (!codeText) {
      return { success: false, message: 'Promo code is required', checkoutSession: null };
    }

    const promoCodes = this._getFromStorage('promo_codes');
    let promoEntity = null;
    for (let i = 0; i < promoCodes.length; i++) {
      if (String(promoCodes[i].code).toUpperCase() === codeText.toUpperCase()) {
        promoEntity = promoCodes[i];
        break;
      }
    }

    const cart = this._getOrCreateCart();
    const session = this._getOrCreateCheckoutSession();

    if (!promoEntity) {
      return { success: false, message: 'Promo code not found', checkoutSession: this._buildCheckoutSessionView(session) };
    }

    const result = this._applyPromoCode(session, promoEntity, cart.subtotal || 0);
    if (!result.applied) {
      let msg = 'Unable to apply promo code';
      if (result.reason === 'min_order_not_met') msg = 'Minimum order amount not met for this promo code';
      if (result.reason === 'invalid_code') msg = 'Invalid promo code';
      if (result.reason === 'expired') msg = 'Promo code has expired';
      if (result.reason === 'not_yet_valid') msg = 'Promo code is not yet valid';
      return { success: false, message: msg, checkoutSession: this._buildCheckoutSessionView(session) };
    }

    // persist updated session
    const sessions = this._getFromStorage('checkout_sessions');
    for (let i = 0; i < sessions.length; i++) {
      if (sessions[i].id === session.id) {
        sessions[i] = session;
        break;
      }
    }
    this._saveToStorage('checkout_sessions', sessions);

    this._recalculateCheckoutTotals(session, cart);
    const view = this._buildCheckoutSessionView(session);

    return {
      success: true,
      message: 'Promo code applied',
      checkoutSession: view
    };
  }

  // proceedToPaymentStep
  proceedToPaymentStep() {
    const cart = this._getOrCreateCart();
    const session = this._getOrCreateCheckoutSession();

    session.step = 'payment';

    const sessions = this._getFromStorage('checkout_sessions');
    for (let i = 0; i < sessions.length; i++) {
      if (sessions[i].id === session.id) {
        sessions[i] = session;
        break;
      }
    }
    this._saveToStorage('checkout_sessions', sessions);

    this._recalculateCheckoutTotals(session, cart);
    const view = this._buildCheckoutSessionView(session);

    return {
      success: true,
      message: 'Proceeded to payment step',
      checkoutSession: view
    };
  }

  // createOrUpdateTeacherProfile
  createOrUpdateTeacherProfile(name, email, password, confirmPassword, primaryGradeLevel) {
    if (!name || !email || !password || !confirmPassword || !primaryGradeLevel) {
      return { success: false, message: 'All fields are required', teacherProfile: null };
    }
    if (password !== confirmPassword) {
      return { success: false, message: 'Passwords do not match', teacherProfile: null };
    }

    const profiles = this._getFromStorage('teacher_profiles');
    let profile = null;

    if (profiles.length > 0) {
      profile = profiles[0];
      profile.name = name;
      profile.email = email;
      profile.password = password;
      profile.primaryGradeLevel = primaryGradeLevel;
      profile.updatedAt = this._now();
      profiles[0] = profile;
    } else {
      profile = {
        id: this._generateId('teacher'),
        name: name,
        email: email,
        password: password,
        primaryGradeLevel: primaryGradeLevel,
        createdAt: this._now(),
        updatedAt: this._now()
      };
      profiles.push(profile);
    }

    this._saveToStorage('teacher_profiles', profiles);

    return {
      success: true,
      message: 'Teacher profile saved',
      teacherProfile: profile
    };
  }

  // getTeacherProfile
  getTeacherProfile() {
    const profile = this._getCurrentTeacherProfile();
    if (!profile) {
      return {
        profileExists: false,
        teacherProfile: null
      };
    }
    return {
      profileExists: true,
      teacherProfile: profile
    };
  }

  // addProductToFavorites
  addProductToFavorites(productId) {
    const products = this._getFromStorage('products');
    let product = null;
    for (let i = 0; i < products.length; i++) {
      if (products[i].id === productId) {
        product = products[i];
        break;
      }
    }
    if (!product) {
      return { success: false, message: 'Product not found', favoriteItem: null, favoritesCount: 0 };
    }

    const favorites = this._getFromStorage('favorites');
    let existing = null;
    for (let i = 0; i < favorites.length; i++) {
      if (favorites[i].productId === productId) {
        existing = favorites[i];
        break;
      }
    }

    let favEntity = existing;
    if (!existing) {
      favEntity = {
        id: this._generateId('favorite'),
        productId: productId,
        addedAt: this._now(),
        notes: null
      };
      favorites.push(favEntity);
      this._saveToStorage('favorites', favorites);
    }

    const favoriteItem = {
      favoriteItemId: favEntity.id,
      productId: product.id,
      productName: product.name,
      gradeLevel: product.gradeLevel || null,
      price: product.price,
      currency: product.currency,
      ratingAverage: typeof product.ratingAverage === 'number' ? product.ratingAverage : 0,
      thumbnailImage: product.thumbnailImage || null,
      addedAt: favEntity.addedAt,
      product: product
    };

    return {
      success: true,
      message: 'Added to favorites',
      favoriteItem: favoriteItem,
      favoritesCount: favorites.length
    };
  }

  // removeFavoriteItem
  removeFavoriteItem(favoriteItemId) {
    const favorites = this._getFromStorage('favorites');
    const filtered = favorites.filter(function (f) { return f.id !== favoriteItemId; });
    this._saveToStorage('favorites', filtered);
    return {
      success: true,
      message: 'Favorite removed',
      favoritesCount: filtered.length
    };
  }

  // getFavorites
  getFavorites() {
    const favorites = this._getFromStorage('favorites');
    const products = this._getFromStorage('products');

    return favorites.map(function (fav) {
      let product = null;
      for (let i = 0; i < products.length; i++) {
        if (products[i].id === fav.productId) {
          product = products[i];
          break;
        }
      }
      return {
        favoriteItemId: fav.id,
        productId: fav.productId,
        productName: product ? product.name : null,
        gradeLevel: product ? product.gradeLevel : null,
        price: product ? product.price : null,
        currency: product ? product.currency : 'usd',
        ratingAverage: product && typeof product.ratingAverage === 'number' ? product.ratingAverage : 0,
        reviewCount: product && typeof product.reviewCount === 'number' ? product.reviewCount : 0,
        thumbnailImage: product ? product.thumbnailImage : null,
        addedAt: fav.addedAt,
        product: product
      };
    });
  }

  // getMembershipPlans
  getMembershipPlans() {
    const plansRaw = this._getFromStorage('membership_plans');
    const active = plansRaw.filter(function (p) { return p.status === 'active'; });
    const plans = this._calculateEffectiveMembershipCosts(active);

    return plans.map(function (p) {
      return {
        planId: p.id,
        name: p.name,
        slug: p.slug,
        description: p.description || '',
        billingFrequency: p.billingFrequency,
        monthlyPrice: typeof p.monthlyPrice === 'number' ? p.monthlyPrice : null,
        yearlyPrice: typeof p.yearlyPrice === 'number' ? p.yearlyPrice : null,
        effectiveMonthlyCost: typeof p.effectiveMonthlyCost === 'number' ? p.effectiveMonthlyCost : 0,
        savingsPercentage: typeof p.savingsPercentage === 'number' ? p.savingsPercentage : 0,
        isRecommended: !!p.isRecommended,
        status: p.status
      };
    });
  }

  // startMembershipSignup(membershipPlanId)
  startMembershipSignup(membershipPlanId) {
    const plans = this._getFromStorage('membership_plans');
    let plan = null;
    for (let i = 0; i < plans.length; i++) {
      if (plans[i].id === membershipPlanId) {
        plan = plans[i];
        break;
      }
    }
    if (!plan || plan.status !== 'active') {
      return { success: false, message: 'Membership plan not found', membershipSignup: null };
    }

    const signups = this._getFromStorage('membership_signups');
    const signup = {
      id: this._generateId('membershipSignup'),
      membershipPlanId: plan.id,
      email: '',
      password: '',
      status: 'created',
      createdAt: this._now()
    };
    signups.push(signup);
    this._saveToStorage('membership_signups', signups);

    const [planWithCost] = this._calculateEffectiveMembershipCosts([plan]);

    return {
      success: true,
      message: 'Membership signup started',
      membershipSignup: {
        membershipSignupId: signup.id,
        status: signup.status,
        email: signup.email,
        selectedPlan: {
          planId: planWithCost.id,
          name: planWithCost.name,
          slug: planWithCost.slug,
          billingFrequency: planWithCost.billingFrequency,
          monthlyPrice: typeof planWithCost.monthlyPrice === 'number' ? planWithCost.monthlyPrice : null,
          yearlyPrice: typeof planWithCost.yearlyPrice === 'number' ? planWithCost.yearlyPrice : null,
          effectiveMonthlyCost: planWithCost.effectiveMonthlyCost || 0,
          description: planWithCost.description || ''
        }
      }
    };
  }

  // getCurrentMembershipSignup
  getCurrentMembershipSignup() {
    const signup = this._getCurrentMembershipSignup();
    if (!signup) {
      return { hasSignup: false, membershipSignup: null };
    }

    const plans = this._getFromStorage('membership_plans');
    let plan = null;
    for (let i = 0; i < plans.length; i++) {
      if (plans[i].id === signup.membershipPlanId) {
        plan = plans[i];
        break;
      }
    }

    const planWithCostArr = plan ? this._calculateEffectiveMembershipCosts([plan]) : [];
    const planWithCost = planWithCostArr.length ? planWithCostArr[0] : null;

    return {
      hasSignup: true,
      membershipSignup: {
        membershipSignupId: signup.id,
        status: signup.status,
        email: signup.email,
        selectedPlan: planWithCost ? {
          planId: planWithCost.id,
          name: planWithCost.name,
          slug: planWithCost.slug,
          billingFrequency: planWithCost.billingFrequency,
          monthlyPrice: typeof planWithCost.monthlyPrice === 'number' ? planWithCost.monthlyPrice : null,
          yearlyPrice: typeof planWithCost.yearlyPrice === 'number' ? planWithCost.yearlyPrice : null,
          effectiveMonthlyCost: planWithCost.effectiveMonthlyCost || 0,
          description: planWithCost.description || ''
        } : null,
        createdAt: signup.createdAt,
        membershipPlan: plan || null
      }
    };
  }

  // completeMembershipSignup(email, password)
  completeMembershipSignup(email, password) {
    if (!email || !password) {
      return { success: false, message: 'Email and password are required', membershipSignup: null };
    }

    const signups = this._getFromStorage('membership_signups');
    if (!signups.length) {
      return { success: false, message: 'No membership signup in progress', membershipSignup: null };
    }

    // Use last signup as current
    let signupIndex = signups.length - 1;
    let signup = signups[signupIndex];
    if (signup.status !== 'created') {
      return { success: false, message: 'Membership signup already completed or cancelled', membershipSignup: null };
    }

    signup.email = email;
    signup.password = password;
    signup.status = 'confirmed';
    signups[signupIndex] = signup;
    this._saveToStorage('membership_signups', signups);

    const plans = this._getFromStorage('membership_plans');
    let plan = null;
    for (let i = 0; i < plans.length; i++) {
      if (plans[i].id === signup.membershipPlanId) {
        plan = plans[i];
        break;
      }
    }
    const planWithCostArr = plan ? this._calculateEffectiveMembershipCosts([plan]) : [];
    const planWithCost = planWithCostArr.length ? planWithCostArr[0] : null;

    return {
      success: true,
      message: 'Membership signup completed',
      membershipSignup: {
        membershipSignupId: signup.id,
        status: signup.status,
        email: signup.email,
        selectedPlan: planWithCost ? {
          planId: planWithCost.id,
          name: planWithCost.name,
          slug: planWithCost.slug,
          billingFrequency: planWithCost.billingFrequency,
          monthlyPrice: typeof planWithCost.monthlyPrice === 'number' ? planWithCost.monthlyPrice : null,
          yearlyPrice: typeof planWithCost.yearlyPrice === 'number' ? planWithCost.yearlyPrice : null,
          effectiveMonthlyCost: planWithCost.effectiveMonthlyCost || 0
        } : null,
        membershipPlan: plan || null
      }
    };
  }

  // getProductComparisonView(productIds)
  getProductComparisonView(productIds) {
    const ids = Array.isArray(productIds) ? productIds : [];
    const products = this._getFromStorage('products');

    const views = [];
    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      for (let j = 0; j < products.length; j++) {
        if (products[j].id === id) {
          const p = products[j];
          views.push({
            productId: p.id,
            name: p.name,
            gradeLevel: p.gradeLevel || null,
            subject: p.subject || null,
            resourceType: p.resourceType || null,
            shortDescription: p.shortDescription || '',
            contentsOverview: p.longDescription || '',
            price: p.price,
            currency: p.currency,
            format: p.format || null,
            licenseType: p.licenseType || null,
            ratingAverage: typeof p.ratingAverage === 'number' ? p.ratingAverage : 0,
            reviewCount: typeof p.reviewCount === 'number' ? p.reviewCount : 0,
            totalSales: typeof p.totalSales === 'number' ? p.totalSales : 0,
            isFreeShipping: !!p.isFreeShipping,
            shippingType: p.shippingType || null,
            thumbnailImage: p.thumbnailImage || null
          });
          break;
        }
      }
    }

    // store comparison metadata
    if (views.length) {
      const comparisons = this._getFromStorage('product_comparisons');
      comparisons.push({
        id: this._generateId('comparison'),
        productIds: views.map(function (v) { return v.productId; }),
        createdAt: this._now()
      });
      this._saveToStorage('product_comparisons', comparisons);
    }

    const highlight = this._buildProductComparisonHighlight(views);

    return {
      products: views,
      highlight: highlight
    };
  }

  // getAboutContent
  getAboutContent() {
    return {
      title: 'About Our Teacher Resources Marketplace',
      mission: 'To empower educators with high-quality, affordable teaching resources and classroom tools.',
      values: [
        'Teacher-first design',
        'Affordable, flexible resources',
        'Support for diverse classrooms',
        'Continuous improvement based on feedback'
      ],
      background: 'This marketplace was created to help busy teachers quickly find classroom-ready materials, from printable worksheets to digital learning activities and decor.',
      highlights: [
        'Curated teaching resources across all core subjects',
        'Digital downloads for instant classroom use',
        'Flexible licensing options for single classrooms and schools'
      ],
      ctaText: 'Start exploring resources tailored to your grade level and subject today.'
    };
  }

  // getContactConfig
  getContactConfig() {
    return {
      supportEmail: 'support@example.com',
      supportPhone: '+1 (555) 123-4567',
      supportHours: 'Monday–Friday, 9:00 AM – 5:00 PM (PT)',
      expectedResponseTime: 'We typically respond within 1–2 business days.',
      contactReasons: [
        { value: 'general_question', label: 'General question' },
        { value: 'order_issue', label: 'Issue with an order' },
        { value: 'technical_support', label: 'Technical support' },
        { value: 'content_request', label: 'Request a resource' }
      ]
    };
  }

  // submitContactRequest
  submitContactRequest(name, email, subject, message, reason) {
    if (!name || !email || !subject || !message) {
      return { success: false, message: 'All fields are required', ticketId: null };
    }

    const tickets = this._getFromStorage('contact_tickets');
    const ticket = {
      id: this._generateId('ticket'),
      name: name,
      email: email,
      subject: subject,
      message: message,
      reason: reason || null,
      createdAt: this._now()
    };

    tickets.push(ticket);
    this._saveToStorage('contact_tickets', tickets);

    return {
      success: true,
      message: 'Contact request submitted',
      ticketId: ticket.id
    };
  }

  // getHelpContent(sectionSlug)
  getHelpContent(sectionSlug) {
    const sections = [
      {
        slug: 'search_filtering',
        title: 'Searching & Filtering Resources',
        faqs: [
          {
            question: 'How do I find resources for a specific grade and subject?',
            answer: 'Use the search bar with keywords (e.g., "4th grade math"), then filter by grade level, subject, resource type, price, and rating.'
          },
          {
            question: 'Can I filter by digital downloads only?',
            answer: 'Yes. In the Format filter, choose "Instant digital download" to show only digital resources.'
          }
        ]
      },
      {
        slug: 'digital_downloads',
        title: 'Digital Downloads',
        faqs: [
          {
            question: 'When will I receive my digital resources?',
            answer: 'Digital resources marked as instant digital downloads are available immediately after purchase in your account downloads or via the order confirmation email.'
          },
          {
            question: 'What file formats are used?',
            answer: 'Most resources are provided as PDF or common document formats that can be printed or projected.'
          }
        ]
      },
      {
        slug: 'cart_checkout',
        title: 'Cart & Checkout',
        faqs: [
          {
            question: 'Can I save items for later?',
            answer: 'Yes. In the cart, use the "Save for later" option to move items out of your active cart while keeping them handy.'
          },
          {
            question: 'Where do I enter a promo code?',
            answer: 'During checkout, you can enter and apply a promo code in the Promo Code field before proceeding to payment.'
          }
        ]
      },
      {
        slug: 'accounts_membership',
        title: 'Accounts & Membership',
        faqs: [
          {
            question: 'Do I need an account to favorite items?',
            answer: 'Creating a teacher account lets you save favorites, track orders, and access membership benefits.'
          },
          {
            question: 'What is the worksheet membership?',
            answer: 'The membership provides ongoing access to a library of worksheets at a discounted monthly rate compared to individual purchases.'
          }
        ]
      }
    ];

    if (sectionSlug) {
      const filtered = sections.filter(function (s) { return s.slug === sectionSlug; });
      return { sections: filtered };
    }
    return { sections: sections };
  }

  // getLegalPageContent(pageSlug)
  getLegalPageContent(pageSlug) {
    const now = new Date().toISOString().substring(0, 10);
    if (pageSlug === 'terms_of_use') {
      return {
        title: 'Terms of Use',
        lastUpdatedDate: now,
        contentHtml: '<h1>Terms of Use</h1><p>These Terms of Use govern your use of this teacher resources website. By accessing or using the site, you agree to these terms.</p>'
      };
    }
    if (pageSlug === 'privacy_policy') {
      return {
        title: 'Privacy Policy',
        lastUpdatedDate: now,
        contentHtml: '<h1>Privacy Policy</h1><p>We respect your privacy and are committed to protecting your personal information. This policy describes what data we collect and how we use it.</p>'
      };
    }
    return {
      title: 'Legal Information',
      lastUpdatedDate: now,
      contentHtml: '<h1>Legal</h1><p>Details about this page are not available.</p>'
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
