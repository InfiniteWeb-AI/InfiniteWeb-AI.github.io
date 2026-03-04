/*
  BusinessLogic implementation for supermarket grocery retail website
  - Uses localStorage (with Node.js polyfill) for persistence
  - Implements all specified interfaces and helper functions
  - Pure business logic: no DOM/window/document usage except localStorage
*/

// localStorage polyfill for Node.js and environments without localStorage
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

  // ---------------------- Storage Helpers ----------------------

  _initStorage() {
    // Core entity tables
    if (!localStorage.getItem('products')) {
      localStorage.setItem('products', JSON.stringify([]));
    }
    if (!localStorage.getItem('categories')) {
      localStorage.setItem('categories', JSON.stringify([]));
    }
    if (!localStorage.getItem('promotions')) {
      localStorage.setItem('promotions', JSON.stringify([]));
    }
    if (!localStorage.getItem('promo_codes')) {
      localStorage.setItem('promo_codes', JSON.stringify([]));
    }
    if (!localStorage.getItem('stores')) {
      localStorage.setItem('stores', JSON.stringify([]));
    }
    if (!localStorage.getItem('fulfillment_preferences')) {
      // Single-user: store a single object or null
      localStorage.setItem('fulfillment_preferences', JSON.stringify(null));
    }
    if (!localStorage.getItem('cart')) {
      // Single cart object or null
      localStorage.setItem('cart', JSON.stringify(null));
    }
    if (!localStorage.getItem('cart_items')) {
      localStorage.setItem('cart_items', JSON.stringify([]));
    }
    if (!localStorage.getItem('delivery_slots')) {
      localStorage.setItem('delivery_slots', JSON.stringify([]));
    }
    if (!localStorage.getItem('navigation_links')) {
      localStorage.setItem('navigation_links', JSON.stringify([]));
    }
    if (!localStorage.getItem('informational_pages')) {
      localStorage.setItem('informational_pages', JSON.stringify([]));
    }
    if (!localStorage.getItem('contact_requests')) {
      localStorage.setItem('contact_requests', JSON.stringify([]));
    }
    if (!localStorage.getItem('homepage_featured_product_ids')) {
      localStorage.setItem('homepage_featured_product_ids', JSON.stringify([]));
    }
    // Optional users table from skeleton (unused but harmless)
    if (!localStorage.getItem('users')) {
      localStorage.setItem('users', JSON.stringify([]));
    }
    // Id counter
    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, defaultValue = []) {
    const data = localStorage.getItem(key);
    if (data === null || data === undefined) return defaultValue;
    try {
      return JSON.parse(data);
    } catch (e) {
      return defaultValue;
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

  // ---------------------- Entity-specific Storage ----------------------

  _getCartFromStorage() {
    const raw = localStorage.getItem('cart');
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  _saveCartToStorage(cart) {
    this._saveToStorage('cart', cart);
  }

  _getCartItemsFromStorage() {
    return this._getFromStorage('cart_items', []);
  }

  _saveCartItemsToStorage(items) {
    this._saveToStorage('cart_items', items);
  }

  _getFulfillmentPreferenceRaw() {
    const raw = this._getFromStorage('fulfillment_preferences', null);
    return raw;
  }

  _saveFulfillmentPreferenceRaw(pref) {
    this._saveToStorage('fulfillment_preferences', pref);
  }

  // ---------------------- Hydration / Foreign-key helpers ----------------------

  _hydrateCategory(category, allCategories) {
    if (!category) return null;
    const parent = category.parentCategoryId
      ? allCategories.find(c => c.id === category.parentCategoryId) || null
      : null;
    return {
      ...category,
      parentCategory: parent || null
    };
  }

  _hydrateProduct(product, allCategories, allPromotions) {
    if (!product) return null;
    const category = allCategories.find(c => c.id === product.categoryId) || null;
    // Enum values and other fields are preserved as-is
    return {
      ...product,
      category: category || null
    };
  }

  _hydrateCart(cart) {
    if (!cart) return null;
    const stores = this._getFromStorage('stores', []);
    const promoCodes = this._getFromStorage('promo_codes', []);
    const deliverySlots = this._getFromStorage('delivery_slots', []);

    const selectedStore = cart.selectedStoreId
      ? (stores.find(s => s.id === cart.selectedStoreId) || null)
      : null;
    const appliedPromoCode = cart.appliedPromoCodeId
      ? (promoCodes.find(pc => pc.id === cart.appliedPromoCodeId) || null)
      : null;
    const selectedDeliverySlot = cart.selectedDeliverySlotId
      ? (deliverySlots.find(ds => ds.id === cart.selectedDeliverySlotId) || null)
      : null;

    return {
      ...cart,
      selectedStore,
      appliedPromoCode,
      selectedDeliverySlot
    };
  }

  _hydrateFulfillmentPreference(pref) {
    if (!pref) return null;
    const stores = this._getFromStorage('stores', []);
    const preferredStore = pref.preferredStoreId
      ? (stores.find(s => s.id === pref.preferredStoreId) || null)
      : null;
    return {
      ...pref,
      preferredStore
    };
  }

  _hydrateCartItems(cart, cartItems) {
    if (!cart) return [];
    const products = this._getFromStorage('products', []);
    const hydratedCart = this._hydrateCart(cart);
    return cartItems
      .filter(ci => ci.cartId === cart.id)
      .map(ci => {
        const product = products.find(p => p.id === ci.productId) || null;
        return {
          ...ci,
          product,
          cart: hydratedCart
        };
      });
  }

  // ---------------------- Cart / Fulfillment helpers ----------------------

  _getOrCreateCart() {
    let cart = this._getCartFromStorage();
    if (!cart) {
      const now = new Date().toISOString();
      const fpRaw = this._getFulfillmentPreferenceRaw();
      const defaultMethod = fpRaw && fpRaw.defaultFulfillmentMethod
        ? fpRaw.defaultFulfillmentMethod
        : 'delivery';
      cart = {
        id: this._generateId('cart'),
        itemIds: [],
        subtotal: 0,
        promotionDiscountTotal: 0,
        promoCodeDiscountTotal: 0,
        taxTotal: 0,
        total: 0,
        promoCodeInput: null,
        appliedPromoCodeId: null,
        appliedPromotionIds: [],
        fulfillmentMethod: defaultMethod,
        deliveryZip: fpRaw && fpRaw.deliveryZip ? fpRaw.deliveryZip : null,
        selectedDeliverySlotId: null,
        selectedStoreId: fpRaw && fpRaw.preferredStoreId ? fpRaw.preferredStoreId : null,
        createdAt: now,
        updatedAt: now
      };
      this._saveCartToStorage(cart);
    }
    return cart;
  }

  _getCurrentFulfillmentContext() {
    const fpRaw = this._getFulfillmentPreferenceRaw();
    const cart = this._getCartFromStorage();
    const stores = this._getFromStorage('stores', []);

    const preferredStore = fpRaw && fpRaw.preferredStoreId
      ? (stores.find(s => s.id === fpRaw.preferredStoreId) || null)
      : null;
    const selectedStore = cart && cart.selectedStoreId
      ? (stores.find(s => s.id === cart.selectedStoreId) || null)
      : null;

    const fulfillmentMethod = cart && cart.fulfillmentMethod
      ? cart.fulfillmentMethod
      : (fpRaw && fpRaw.defaultFulfillmentMethod) || 'delivery';

    const deliveryZip = cart && cart.deliveryZip
      ? cart.deliveryZip
      : (fpRaw && fpRaw.deliveryZip) || null;

    return {
      fulfillmentMethod,
      deliveryZip,
      preferredStore,
      selectedStore,
      fulfillmentPreference: this._hydrateFulfillmentPreference(fpRaw),
      cart: cart ? this._hydrateCart(cart) : null
    };
  }

  _roundMoney(value) {
    return Math.round((value || 0) * 100) / 100;
  }

  _recalculateCartTotals(cart, allCartItems) {
    if (!cart) return { cart: null, lineDiscountsByItemId: {}, appliedPromotionIdsByItemId: {} };

    const items = allCartItems.filter(ci => ci.cartId === cart.id);

    // Compute line subtotals
    let subtotal = 0;
    for (const item of items) {
      const lineSubtotal = this._roundMoney((item.unitPriceSnapshot || 0) * (item.quantity || 0));
      item.lineSubtotal = lineSubtotal;
      subtotal += lineSubtotal;
    }
    subtotal = this._roundMoney(subtotal);

    // Automatic promotions
    const {
      cartPromotionDiscountTotal,
      lineDiscountsByItemId,
      appliedPromotionIds,
      appliedPromotionIdsByItemId
    } = this._applyAutomaticPromotionsToCart(cart, items);

    // Promo code discounts
    let promoCodeDiscountTotal = 0;
    const promoCodes = this._getFromStorage('promo_codes', []);
    const appliedPromo = cart.appliedPromoCodeId
      ? promoCodes.find(pc => pc.id === cart.appliedPromoCodeId) || null
      : null;

    if (appliedPromo && appliedPromo.status === 'active') {
      const now = new Date();
      const validStart = appliedPromo.startDate ? new Date(appliedPromo.startDate) <= now : true;
      const validEnd = appliedPromo.endDate ? new Date(appliedPromo.endDate) >= now : true;
      if (validStart && validEnd) {
        const baseAmount = Math.max(0, subtotal - cartPromotionDiscountTotal);
        if (!appliedPromo.minOrderAmount || baseAmount >= appliedPromo.minOrderAmount) {
          if (appliedPromo.applicableScope === 'cart') {
            if (appliedPromo.discountType === 'percentage') {
              promoCodeDiscountTotal = this._roundMoney(baseAmount * (appliedPromo.discountValue / 100));
            } else if (appliedPromo.discountType === 'fixed_amount') {
              promoCodeDiscountTotal = this._roundMoney(Math.min(baseAmount, appliedPromo.discountValue));
            }
          }
        }
      }
    }

    const taxTotal = 0; // Tax logic could be added here if needed
    const total = this._roundMoney(subtotal - cartPromotionDiscountTotal - promoCodeDiscountTotal + taxTotal);

    const updatedCart = {
      ...cart,
      subtotal,
      promotionDiscountTotal: this._roundMoney(cartPromotionDiscountTotal),
      promoCodeDiscountTotal: this._roundMoney(promoCodeDiscountTotal),
      taxTotal,
      total,
      appliedPromotionIds,
      updatedAt: new Date().toISOString()
    };

    this._saveCartToStorage(updatedCart);
    this._saveCartItemsToStorage(allCartItems);

    return { cart: updatedCart, lineDiscountsByItemId, appliedPromotionIdsByItemId };
  }

  _applyAutomaticPromotionsToCart(cart, cartItemsForCart) {
    const promotions = this._getFromStorage('promotions', []);
    const products = this._getFromStorage('products', []);
    const now = new Date();

    let cartPromotionDiscountTotal = 0;
    const lineDiscountsByItemId = {};
    const appliedPromotionIdsByItemId = {};
    const cartPromotionIdsSet = new Set();

    if (!cart || !cartItemsForCart.length || !promotions.length) {
      return {
        cartPromotionDiscountTotal: 0,
        lineDiscountsByItemId,
        appliedPromotionIds: [],
        appliedPromotionIdsByItemId
      };
    }

    for (const promo of promotions) {
      if (promo.status !== 'active') continue;
      const validStart = promo.startDate ? new Date(promo.startDate) <= now : true;
      const validEnd = promo.endDate ? new Date(promo.endDate) >= now : true;
      if (!validStart || !validEnd) continue;

      if (promo.promotionType === 'buy_x_get_y') {
        const buyX = promo.requiredQuantity || 0;
        const freeY = promo.freeQuantity || 0;
        const groupSize = buyX + freeY;
        if (groupSize <= 0 || freeY <= 0) continue;

        // Determine eligible items
        const eligibleEntries = [];
        for (const item of cartItemsForCart) {
          const product = products.find(p => p.id === item.productId);
          if (!product) continue;

          // Scope checks
          let isEligible = false;
          if (promo.applicableScope === 'product') {
            if (promo.applicableProductIds && promo.applicableProductIds.includes(product.id)) {
              isEligible = true;
            }
          } else if (promo.applicableScope === 'category') {
            if (promo.applicableCategoryIds && promo.applicableCategoryIds.includes(product.categoryId)) {
              isEligible = true;
            }
          } else if (promo.applicableScope === 'department') {
            // Not explicitly modeled; treat as category-based as well
            if (promo.applicableCategoryIds && promo.applicableCategoryIds.includes(product.categoryId)) {
              isEligible = true;
            }
          }

          if (!isEligible) continue;

          // Prefer unit-based items for buy-x-get-y
          if (item.isWeightBased) continue;

          const unitPrice = item.unitPriceSnapshot || 0;
          const qty = item.quantity || 0;
          if (qty <= 0 || unitPrice <= 0) continue;

          eligibleEntries.push({
            item,
            product,
            unitPrice,
            quantity: qty
          });
        }

        if (!eligibleEntries.length) continue;

        let totalQty = 0;
        for (const e of eligibleEntries) {
          totalQty += e.quantity;
        }

        const groups = Math.floor(totalQty / groupSize);
        const freeUnits = groups * freeY;
        if (freeUnits <= 0) continue;

        // Allocate free units to cheapest eligible items
        eligibleEntries.sort((a, b) => a.unitPrice - b.unitPrice);
        let remainingFreeUnits = freeUnits;

        for (const e of eligibleEntries) {
          if (remainingFreeUnits <= 0) break;
          const availableQty = e.quantity;
          const discountQty = Math.min(availableQty, remainingFreeUnits);
          if (discountQty <= 0) continue;

          const discountAmount = this._roundMoney(discountQty * e.unitPrice);
          if (!lineDiscountsByItemId[e.item.id]) {
            lineDiscountsByItemId[e.item.id] = 0;
          }
          lineDiscountsByItemId[e.item.id] += discountAmount;

          if (!appliedPromotionIdsByItemId[e.item.id]) {
            appliedPromotionIdsByItemId[e.item.id] = [];
          }
          appliedPromotionIdsByItemId[e.item.id].push(promo.id);

          cartPromotionDiscountTotal += discountAmount;
          remainingFreeUnits -= discountQty;
        }

        if (cartPromotionDiscountTotal > 0) {
          cartPromotionIdsSet.add(promo.id);
        }
      }
      // Other promotion types (percentage_discount, fixed_amount_discount) could be implemented here
    }

    return {
      cartPromotionDiscountTotal: this._roundMoney(cartPromotionDiscountTotal),
      lineDiscountsByItemId,
      appliedPromotionIds: Array.from(cartPromotionIdsSet),
      appliedPromotionIdsByItemId
    };
  }

  _findNextAvailableFridaySlot() {
    const slots = this._getFromStorage('delivery_slots', []);
    if (!slots.length) return null;

    const now = new Date();
    const fridaySlots = slots.filter(slot => {
      if (!slot.isAvailable) return false;
      if (slot.fulfillmentMethod !== 'delivery') return false;
      const date = new Date(slot.date);
      if (isNaN(date.getTime())) return false;
      if (date < now) return false;
      const day = date.getDay(); // 0=Sun, 5=Fri
      return day === 5;
    });

    if (!fridaySlots.length) return null;

    // Prefer 18:00-20:00 if exists, else earliest Friday slot
    fridaySlots.sort((a, b) => {
      const da = new Date(a.date).getTime();
      const db = new Date(b.date).getTime();
      if (da !== db) return da - db;
      return (a.startTime || '').localeCompare(b.startTime || '');
    });

    const preferred = fridaySlots.find(s => (s.startTime === '18:00' && s.endTime === '20:00') ||
      (s.label && s.label.toLowerCase().includes('6:00 pm') && s.label.toLowerCase().includes('8:00 pm')));

    return preferred || fridaySlots[0];
  }

  // Helper: get all descendant category IDs including self
  _getDescendantCategoryIds(categoryId, allCategories) {
    const result = new Set([categoryId]);
    let changed = true;
    while (changed) {
      changed = false;
      for (const c of allCategories) {
        if (c.parentCategoryId && result.has(c.parentCategoryId) && !result.has(c.id)) {
          result.add(c.id);
          changed = true;
        }
      }
    }
    return Array.from(result);
  }

  _getProductsForCategory(categoryId) {
    const categories = this._getFromStorage('categories', []);
    const products = this._getFromStorage('products', []);
    if (!categoryId) return { category: null, products: [], categories };
    const category = categories.find(c => c.id === categoryId) || null;
    if (!category) return { category: null, products: [], categories };
    const descendantIds = this._getDescendantCategoryIds(categoryId, categories);

    const filteredProducts = products.filter(p => {
      if (descendantIds.includes(p.categoryId)) return true;
      if (Array.isArray(p.secondaryCategoryIds)) {
        return p.secondaryCategoryIds.some(id => descendantIds.includes(id));
      }
      return false;
    });

    return { category, products: filteredProducts, categories };
  }

  _filterProductsBase(products, filters) {
    if (!filters) return products.slice();
    const {
      minPrice,
      maxPrice,
      isOrganic,
      isVegetarian,
      dietaryTags,
      minRating,
      availability,
      sizeVolume,
      productType,
      isSameDayPickupEligible
    } = filters;

    return products.filter(p => {
      if (typeof minPrice === 'number' && p.price < minPrice) return false;
      if (typeof maxPrice === 'number' && p.price > maxPrice) return false;
      if (typeof isOrganic === 'boolean' && !!p.isOrganic !== isOrganic) return false;
      if (typeof isVegetarian === 'boolean') {
        const veg = !!p.isVegetarian || (Array.isArray(p.dietaryTags) && p.dietaryTags.includes('vegetarian'));
        if (veg !== isVegetarian) return false;
      }
      if (Array.isArray(dietaryTags) && dietaryTags.length) {
        const tags = Array.isArray(p.dietaryTags) ? p.dietaryTags : [];
        const hasAny = dietaryTags.some(t => tags.includes(t));
        if (!hasAny) return false;
      }
      if (typeof minRating === 'number') {
        if (typeof p.averageRating !== 'number' || p.averageRating < minRating) return false;
      }
      if (availability) {
        const methods = Array.isArray(p.availableFulfillmentMethods) ? p.availableFulfillmentMethods : [];
        if (availability === 'pickup_today') {
          if (!p.isSameDayPickupEligible) return false;
        } else if (availability === 'delivery') {
          if (!(p.isDeliveryEligible || methods.includes('delivery'))) return false;
        } else if (availability === 'pickup') {
          if (!methods.includes('pickup')) return false;
        }
      }
      if (typeof isSameDayPickupEligible === 'boolean') {
        if (!!p.isSameDayPickupEligible !== isSameDayPickupEligible) return false;
      }
      if (sizeVolume) {
        const sv = String(sizeVolume).toLowerCase();
        const sizeLabel = p.sizeLabel ? String(p.sizeLabel).toLowerCase() : '';
        let matched = false;
        if (sizeLabel && sizeLabel === sv) matched = true;
        if (!matched && p.volumeValue && p.volumeUnit) {
          const volStr = `${p.volumeValue}${p.volumeUnit}`.toLowerCase();
          if (volStr === sv) matched = true;
        }
        if (!matched && p.weightValue && p.weightUnit) {
          const wStr = `${p.weightValue}${p.weightUnit}`.toLowerCase();
          if (wStr === sv) matched = true;
        }
        if (!matched) return false;
      }
      if (productType && p.productType !== productType) return false;

      return true;
    });
  }

  _sortProducts(products, sort) {
    const arr = products.slice();
    if (!sort || sort === 'relevance') {
      return arr;
    }
    if (sort === 'price_low_to_high') {
      arr.sort((a, b) => (a.price || 0) - (b.price || 0));
    } else if (sort === 'price_high_to_low') {
      arr.sort((a, b) => (b.price || 0) - (a.price || 0));
    } else if (sort === 'customer_rating_high_to_low') {
      arr.sort((a, b) => {
        const ar = typeof a.averageRating === 'number' ? a.averageRating : 0;
        const br = typeof b.averageRating === 'number' ? b.averageRating : 0;
        if (br !== ar) return br - ar;
        return (a.price || 0) - (b.price || 0);
      });
    }
    return arr;
  }

  // ---------------------- Core Interface Implementations ----------------------

  // 1) getHomepageOverview()
  getHomepageOverview() {
    const categories = this._getFromStorage('categories', []);
    const promotions = this._getFromStorage('promotions', []);

    const topCategoriesRaw = categories.filter(c => !c.parentCategoryId);
    const topCategories = topCategoriesRaw.map(c => this._hydrateCategory(c, categories));

    const now = new Date();
    const featuredPromotions = promotions.filter(p => {
      if (p.status !== 'active') return false;
      const validStart = p.startDate ? new Date(p.startDate) <= now : true;
      const validEnd = p.endDate ? new Date(p.endDate) >= now : true;
      return validStart && validEnd;
    });

    const fpRaw = this._getFulfillmentPreferenceRaw();
    const fulfillmentPreference = this._hydrateFulfillmentPreference(fpRaw);
    const preferredStore = fulfillmentPreference ? fulfillmentPreference.preferredStore : null;

    const cart = this._getCartFromStorage();
    const cartItems = this._getCartItemsFromStorage();
    const hasActiveCart = !!(cart && Array.isArray(cart.itemIds) && cart.itemIds.length && cartItems.length);

    return {
      topCategories,
      featuredPromotions,
      fulfillmentPreference,
      preferredStore,
      hasActiveCart
    };
  }

  // 2) getTopLevelCategories()
  getTopLevelCategories() {
    const categories = this._getFromStorage('categories', []);
    const top = categories.filter(c => !c.parentCategoryId);
    return top.map(c => this._hydrateCategory(c, categories));
  }

  // 3) getCategoryFilterOptions(categoryId)
  getCategoryFilterOptions(categoryId) {
    const { category, products, categories } = this._getProductsForCategory(categoryId);

    let minPrice = null;
    let maxPrice = null;
    const dietaryTagSet = new Set();
    const ratingOptionsSet = new Set();
    let supportsOrganicFilter = false;
    let supportsVegetarianFilter = false;
    let supportsAvailabilityFilter = false;
    const availabilityOptionsSet = new Set();
    const sizeVolumeOptionsSet = new Set();
    const productTypeOptionsSet = new Set();

    for (const p of products) {
      if (typeof p.price === 'number') {
        if (minPrice === null || p.price < minPrice) minPrice = p.price;
        if (maxPrice === null || p.price > maxPrice) maxPrice = p.price;
      }
      if (Array.isArray(p.dietaryTags)) {
        for (const t of p.dietaryTags) dietaryTagSet.add(t);
      }
      if (typeof p.averageRating === 'number') {
        ratingOptionsSet.add(1);
        ratingOptionsSet.add(2);
        ratingOptionsSet.add(3);
        ratingOptionsSet.add(4);
      }
      if (p.isOrganic) supportsOrganicFilter = true;
      if (p.isVegetarian || (Array.isArray(p.dietaryTags) && p.dietaryTags.includes('vegetarian'))) {
        supportsVegetarianFilter = true;
      }
      if (Array.isArray(p.availableFulfillmentMethods) || p.isSameDayPickupEligible) {
        supportsAvailabilityFilter = true;
      }
      const methods = Array.isArray(p.availableFulfillmentMethods) ? p.availableFulfillmentMethods : [];
      methods.forEach(m => availabilityOptionsSet.add(m));
      if (p.isSameDayPickupEligible) availabilityOptionsSet.add('pickup_today');

      if (p.sizeLabel) sizeVolumeOptionsSet.add(String(p.sizeLabel));
      if (p.volumeValue && p.volumeUnit) {
        sizeVolumeOptionsSet.add(`${p.volumeValue}${p.volumeUnit}`);
      }
      if (typeof p.productType === 'string') productTypeOptionsSet.add(p.productType);
    }

    const ratingOptions = Array.from(ratingOptionsSet).sort((a, b) => a - b);

    return {
      category: category ? this._hydrateCategory(category, categories) : null,
      price: {
        minAllowed: minPrice === null ? 0 : minPrice,
        maxAllowed: maxPrice === null ? 0 : maxPrice,
        suggestedSteps: []
      },
      ratingOptions,
      dietaryTags: Array.from(dietaryTagSet),
      supportsOrganicFilter,
      supportsVegetarianFilter,
      supportsAvailabilityFilter,
      availabilityOptions: Array.from(availabilityOptionsSet),
      sizeVolumeOptions: Array.from(sizeVolumeOptionsSet),
      productTypeOptions: Array.from(productTypeOptionsSet)
    };
  }

  // 4) getCategoryProducts(categoryId, filters, sort, page = 1, pageSize = 24)
  getCategoryProducts(categoryId, filters, sort, page = 1, pageSize = 24) {
    const { category, products: baseProducts, categories } = this._getProductsForCategory(categoryId);
    const filtered = this._filterProductsBase(baseProducts, filters);
    const sorted = this._sortProducts(filtered, sort);

    const totalResults = sorted.length;
    const pageNum = page || 1;
    const size = pageSize || 24;
    const start = (pageNum - 1) * size;
    const end = start + size;
    const pageProducts = sorted.slice(start, end);

    const cart = this._getCartFromStorage();
    const cartItems = this._getCartItemsFromStorage();

    const items = pageProducts.map(p => {
      const hydratedProduct = this._hydrateProduct(p, categories, []);
      let isInCart = false;
      let currentCartQuantity = 0;
      if (cart) {
        for (const ci of cartItems) {
          if (ci.cartId === cart.id && ci.productId === p.id) {
            isInCart = true;
            currentCartQuantity += ci.quantity || 0;
          }
        }
      }
      const productCategory = categories.find(c => c.id === p.categoryId) || null;
      return {
        product: hydratedProduct,
        categoryName: productCategory ? productCategory.name : null,
        isInCart,
        currentCartQuantity,
        activePromotionNames: [] // could be populated by checking promotions if desired
      };
    });

    return {
      category: category ? this._hydrateCategory(category, categories) : null,
      page: pageNum,
      pageSize: size,
      totalResults,
      products: items
    };
  }

  // 5) getProductDetails(productId)
  getProductDetails(productId) {
    const products = this._getFromStorage('products', []);
    const categories = this._getFromStorage('categories', []);
    const promotions = this._getFromStorage('promotions', []);

    const product = products.find(p => p.id === productId) || null;
    if (!product) {
      return {
        product: null,
        primaryCategory: null,
        breadcrumbCategories: [],
        activePromotions: [],
        isInCart: false,
        currentCartQuantity: 0,
        fulfillmentEligibility: {
          deliveryEligible: false,
          pickupEligible: false,
          sameDayPickupEligible: false
        }
      };
    }

    const primaryCategory = categories.find(c => c.id === product.categoryId) || null;
    const breadcrumbCategories = [];
    let current = primaryCategory;
    while (current) {
      breadcrumbCategories.unshift(this._hydrateCategory(current, categories));
      current = current.parentCategoryId
        ? categories.find(c => c.id === current.parentCategoryId) || null
        : null;
    }

    const now = new Date();
    const activePromotions = promotions.filter(promo => {
      if (promo.status !== 'active') return false;
      const validStart = promo.startDate ? new Date(promo.startDate) <= now : true;
      const validEnd = promo.endDate ? new Date(promo.endDate) >= now : true;
      if (!validStart || !validEnd) return false;
      if (promo.applicableScope === 'product') {
        return Array.isArray(promo.applicableProductIds) && promo.applicableProductIds.includes(product.id);
      }
      if (promo.applicableScope === 'category') {
        return Array.isArray(promo.applicableCategoryIds) && promo.applicableCategoryIds.includes(product.categoryId);
      }
      return false;
    });

    const cart = this._getCartFromStorage();
    const cartItems = this._getCartItemsFromStorage();
    let isInCart = false;
    let currentCartQuantity = 0;
    if (cart) {
      for (const ci of cartItems) {
        if (ci.cartId === cart.id && ci.productId === product.id) {
          isInCart = true;
          currentCartQuantity += ci.quantity || 0;
        }
      }
    }

    const methods = Array.isArray(product.availableFulfillmentMethods) ? product.availableFulfillmentMethods : [];
    const fulfillmentEligibility = {
      deliveryEligible: !!product.isDeliveryEligible || methods.includes('delivery'),
      pickupEligible: methods.includes('pickup'),
      sameDayPickupEligible: !!product.isSameDayPickupEligible
    };

    // Instrumentation for task completion tracking
    try {
      const productIdStr = String(product.id);

      // Helper: detect breakfast cereal via breadcrumb categories
      let isBreakfastCereal = false;
      if (breadcrumbCategories && breadcrumbCategories.length) {
        const pathName = breadcrumbCategories
          .map(c => (c && c.name ? String(c.name).toLowerCase() : ''))
          .join(' > ');
        if (pathName.includes('breakfast') && pathName.includes('cereal')) {
          isBreakfastCereal = true;
        }
      }

      // task2_comparedProductIds: first two 4+ star breakfast cereals whose details were viewed
      if (isBreakfastCereal && typeof product.averageRating === 'number' && product.averageRating >= 4.0) {
        let arr = [];
        const raw = localStorage.getItem('task2_comparedProductIds');
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
              arr = parsed.map(id => String(id));
            }
          } catch (e2) {
            // ignore parse errors
          }
        }
        if (!arr.includes(productIdStr) && arr.length < 2) {
          arr.push(productIdStr);
          localStorage.setItem('task2_comparedProductIds', JSON.stringify(arr));
        }
      }

      // Helper: detect qualifying 1L olive oil under $15
      let isOliveOilCandidate = false;
      const nameLower = (product.name || '').toLowerCase();
      const descLower = (product.description || '').toLowerCase();
      const mentionsOliveOil = nameLower.includes('olive oil') || descLower.includes('olive oil');

      let approxOneLiter = false;
      if (product.volumeValue && product.volumeUnit) {
        const volValue = Number(product.volumeValue);
        const unitLower = String(product.volumeUnit).toLowerCase();
        if (volValue === 1 && (unitLower === 'l' || unitLower === 'liter' || unitLower === 'liters')) {
          approxOneLiter = true;
        }
      }
      if (!approxOneLiter && product.sizeLabel) {
        const sizeLower = String(product.sizeLabel).toLowerCase().replace(/\s+/g, '');
        if (sizeLower === '1l' || sizeLower === '1liter') {
          approxOneLiter = true;
        }
      }
      const priceOk = typeof product.price === 'number' && product.price <= 15;
      isOliveOilCandidate = mentionsOliveOil && approxOneLiter && priceOk;

      // task5_comparedProductIds: first two 1L olive oils under $15 whose details were viewed
      if (isOliveOilCandidate) {
        let arr5 = [];
        const raw5 = localStorage.getItem('task5_comparedProductIds');
        if (raw5) {
          try {
            const parsed5 = JSON.parse(raw5);
            if (Array.isArray(parsed5)) {
              arr5 = parsed5.map(id => String(id));
            }
          } catch (e3) {
            // ignore parse errors
          }
        }
        if (!arr5.includes(productIdStr) && arr5.length < 2) {
          arr5.push(productIdStr);
          localStorage.setItem('task5_comparedProductIds', JSON.stringify(arr5));
        }
      }
    } catch (e) {
      console.error('Instrumentation error in getProductDetails:', e);
    }

    return {
      product: this._hydrateProduct(product, categories, promotions),
      primaryCategory: primaryCategory ? this._hydrateCategory(primaryCategory, categories) : null,
      breadcrumbCategories,
      activePromotions,
      isInCart,
      currentCartQuantity,
      fulfillmentEligibility
    };
  }

  // 6) addToCart(productId, quantity = 1, measurementUnit, sizeLabel, optionTypeLabel)
  addToCart(productId, quantity = 1, measurementUnit, sizeLabel, optionTypeLabel) {
    const products = this._getFromStorage('products', []);
    const product = products.find(p => p.id === productId) || null;
    if (!product) {
      return { success: false, message: 'Product not found', cart: null, cartItems: [] };
    }

    const qty = typeof quantity === 'number' && quantity > 0 ? quantity : 1;

    // Determine default measurementUnit based on product.soldBy and unitOfMeasure
    let derivedMeasurementUnit = measurementUnit;
    if (!derivedMeasurementUnit) {
      if (product.soldBy === 'weight') {
        switch (product.unitOfMeasure) {
          case 'per_lb':
            derivedMeasurementUnit = 'lb';
            break;
          case 'per_kg':
            derivedMeasurementUnit = 'kg';
            break;
          case 'per_oz':
            derivedMeasurementUnit = 'oz';
            break;
          case 'per_g':
            derivedMeasurementUnit = 'g';
            break;
          default:
            derivedMeasurementUnit = 'lb';
        }
      } else {
        // soldBy = 'unit'
        switch (product.unitOfMeasure) {
          case 'per_box':
            derivedMeasurementUnit = 'box';
            break;
          case 'per_bottle':
            derivedMeasurementUnit = 'bottle';
            break;
          case 'per_can':
            derivedMeasurementUnit = 'can';
            break;
          case 'per_pack':
            derivedMeasurementUnit = 'pack';
            break;
          case 'per_item':
          default:
            derivedMeasurementUnit = 'unit';
        }
      }
    }

    const cart = this._getOrCreateCart();
    const cartItems = this._getCartItemsFromStorage();

    // Find existing line for same product + size + option
    let existingItem = null;
    for (const ci of cartItems) {
      if (
        ci.cartId === cart.id &&
        ci.productId === productId &&
        (ci.sizeLabel || null) === (sizeLabel || null) &&
        (ci.optionTypeLabel || null) === (optionTypeLabel || null)
      ) {
        existingItem = ci;
        break;
      }
    }

    if (existingItem) {
      existingItem.quantity = (existingItem.quantity || 0) + qty;
    } else {
      const newItem = {
        id: this._generateId('cartitem'),
        cartId: cart.id,
        productId: product.id,
        productNameSnapshot: product.name,
        unitPriceSnapshot: product.price,
        quantity: qty,
        isWeightBased: product.soldBy === 'weight',
        measurementUnit: derivedMeasurementUnit || 'unit',
        sizeLabel: sizeLabel || product.sizeLabel || null,
        optionTypeLabel: optionTypeLabel || product.defaultTypeOption || null,
        lineSubtotal: this._roundMoney(product.price * qty),
        appliedPromotionIds: []
      };
      cartItems.push(newItem);
      if (!Array.isArray(cart.itemIds)) {
        cart.itemIds = [];
      }
      cart.itemIds.push(newItem.id);
    }

    const { cart: updatedCart } = this._recalculateCartTotals(cart, cartItems);
    const hydratedCart = this._hydrateCart(updatedCart);
    const hydratedItems = this._hydrateCartItems(updatedCart, this._getCartItemsFromStorage());

    // Instrumentation for task completion tracking
    try {
      const productIdStr = String(product.id);

      // Read compared cereals for task 2
      let comparedTask2 = [];
      const rawTask2 = localStorage.getItem('task2_comparedProductIds');
      if (rawTask2) {
        try {
          const parsed2 = JSON.parse(rawTask2);
          if (Array.isArray(parsed2)) {
            comparedTask2 = parsed2.map(id => String(id));
          }
        } catch (e2) {
          // ignore parse errors
        }
      }

      // If user added >= 2 of a compared breakfast cereal, record selection
      if (typeof quantity === 'number' && quantity >= 2 && comparedTask2.includes(productIdStr)) {
        const categories = this._getFromStorage('categories', []);
        let category = categories.find(c => c.id === product.categoryId) || null;
        const names = [];
        while (category) {
          if (category.name) {
            names.unshift(String(category.name).toLowerCase());
          }
          if (!category.parentCategoryId) break;
          category = categories.find(c => c.id === category.parentCategoryId) || null;
        }
        const pathStr = names.join(' > ');
        const isBreakfastCereal = pathStr.includes('breakfast') && pathStr.includes('cereal');
        if (isBreakfastCereal) {
          localStorage.setItem('task2_selectedProductId', productIdStr);
        }
      }

      // Read compared olive oils for task 5
      let comparedTask5 = [];
      const rawTask5 = localStorage.getItem('task5_comparedProductIds');
      if (rawTask5) {
        try {
          const parsed5 = JSON.parse(rawTask5);
          if (Array.isArray(parsed5)) {
            comparedTask5 = parsed5.map(id => String(id));
          }
        } catch (e3) {
          // ignore parse errors
        }
      }

      // If user added >= 1 of a compared 1L olive oil under $15, record selection
      if (typeof quantity === 'number' && quantity >= 1 && comparedTask5.includes(productIdStr)) {
        const nameLower = (product.name || '').toLowerCase();
        const descLower = (product.description || '').toLowerCase();
        const mentionsOliveOil = nameLower.includes('olive oil') || descLower.includes('olive oil');

        let approxOneLiter = false;
        if (product.volumeValue && product.volumeUnit) {
          const volValue = Number(product.volumeValue);
          const unitLower = String(product.volumeUnit).toLowerCase();
          if (volValue === 1 && (unitLower === 'l' || unitLower === 'liter' || unitLower === 'liters')) {
            approxOneLiter = true;
          }
        }
        if (!approxOneLiter && product.sizeLabel) {
          const sizeLower = String(product.sizeLabel).toLowerCase().replace(/\s+/g, '');
          if (sizeLower === '1l' || sizeLower === '1liter') {
            approxOneLiter = true;
          }
        }
        const priceOk = typeof product.price === 'number' && product.price <= 15;

        if (mentionsOliveOil && approxOneLiter && priceOk) {
          localStorage.setItem('task5_selectedProductId', productIdStr);
        }
      }
    } catch (e) {
      console.error('Instrumentation error in addToCart:', e);
    }

    return {
      success: true,
      message: 'Added to cart',
      cart: hydratedCart,
      cartItems: hydratedItems
    };
  }

  // 7) getCart()
  getCart() {
    const cart = this._getCartFromStorage();
    const cartItems = this._getCartItemsFromStorage();
    if (!cart) {
      return {
        cart: null,
        items: []
      };
    }

    // Ensure totals up to date
    const { cart: updatedCart, lineDiscountsByItemId, appliedPromotionIdsByItemId } = this._recalculateCartTotals(cart, cartItems);

    const hydratedCart = this._hydrateCart(updatedCart);
    const products = this._getFromStorage('products', []);
    const promotions = this._getFromStorage('promotions', []);

    const items = cartItems
      .filter(ci => ci.cartId === updatedCart.id)
      .map(ci => {
        const product = products.find(p => p.id === ci.productId) || null;
        const lineDiscountTotal = lineDiscountsByItemId[ci.id] || 0;
        const lineTotalAfterDiscounts = this._roundMoney((ci.lineSubtotal || 0) - lineDiscountTotal);
        const promoIds = appliedPromotionIdsByItemId[ci.id] || [];
        const promotionNames = promoIds
          .map(id => promotions.find(p => p.id === id))
          .filter(p => !!p)
          .map(p => p.name);

        const hydratedCartItem = {
          ...ci,
          product,
          cart: hydratedCart
        };

        return {
          cartItem: hydratedCartItem,
          product,
          promotionNames,
          lineDiscountTotal,
          lineTotalAfterDiscounts
        };
      });

    return {
      cart: hydratedCart,
      items
    };
  }

  // 8) updateCartItemQuantity(cartItemId, quantity)
  updateCartItemQuantity(cartItemId, quantity) {
    const cart = this._getCartFromStorage();
    const cartItems = this._getCartItemsFromStorage();
    if (!cart) {
      return { success: false, message: 'No active cart', cart: null, cartItems: [] };
    }

    const targetIndex = cartItems.findIndex(ci => ci.id === cartItemId && ci.cartId === cart.id);
    if (targetIndex === -1) {
      return { success: false, message: 'Cart item not found', cart: this._hydrateCart(cart), cartItems: this._hydrateCartItems(cart, cartItems) };
    }

    const targetItem = cartItems[targetIndex];

    const newQty = typeof quantity === 'number' ? quantity : 0;
    if (newQty <= 0) {
      // Remove item entirely
      const removed = cartItems.splice(targetIndex, 1)[0];
      if (Array.isArray(cart.itemIds)) {
        cart.itemIds = cart.itemIds.filter(id => id !== removed.id);
      }
    } else {
      cartItems[targetIndex].quantity = newQty;
    }

    const { cart: updatedCart } = this._recalculateCartTotals(cart, cartItems);
    const hydratedCart = this._hydrateCart(updatedCart);
    const hydratedItems = this._hydrateCartItems(updatedCart, this._getCartItemsFromStorage());

    // Instrumentation for task completion tracking
    try {
      if (targetItem && newQty > 0) {
        const products = this._getFromStorage('products', []);
        const product = products.find(p => p.id === targetItem.productId) || null;
        if (product) {
          const productIdStr = String(product.id);

          // Read compared cereals for task 2
          let comparedTask2 = [];
          const rawTask2 = localStorage.getItem('task2_comparedProductIds');
          if (rawTask2) {
            try {
              const parsed2 = JSON.parse(rawTask2);
              if (Array.isArray(parsed2)) {
                comparedTask2 = parsed2.map(id => String(id));
              }
            } catch (e2) {
              // ignore parse errors
            }
          }

          // If quantity becomes >= 2 for a compared breakfast cereal, record selection
          if (newQty >= 2 && comparedTask2.includes(productIdStr)) {
            const categories = this._getFromStorage('categories', []);
            let category = categories.find(c => c.id === product.categoryId) || null;
            const names = [];
            while (category) {
              if (category.name) {
                names.unshift(String(category.name).toLowerCase());
              }
              if (!category.parentCategoryId) break;
              category = categories.find(c => c.id === category.parentCategoryId) || null;
            }
            const pathStr = names.join(' > ');
            const isBreakfastCereal = pathStr.includes('breakfast') && pathStr.includes('cereal');
            if (isBreakfastCereal) {
              localStorage.setItem('task2_selectedProductId', productIdStr);
            }
          }

          // Read compared olive oils for task 5
          let comparedTask5 = [];
          const rawTask5 = localStorage.getItem('task5_comparedProductIds');
          if (rawTask5) {
            try {
              const parsed5 = JSON.parse(rawTask5);
              if (Array.isArray(parsed5)) {
                comparedTask5 = parsed5.map(id => String(id));
              }
            } catch (e3) {
              // ignore parse errors
            }
          }

          // If quantity becomes >= 1 for a compared 1L olive oil under $15, record selection
          if (newQty >= 1 && comparedTask5.includes(productIdStr)) {
            const nameLower = (product.name || '').toLowerCase();
            const descLower = (product.description || '').toLowerCase();
            const mentionsOliveOil = nameLower.includes('olive oil') || descLower.includes('olive oil');

            let approxOneLiter = false;
            if (product.volumeValue && product.volumeUnit) {
              const volValue = Number(product.volumeValue);
              const unitLower = String(product.volumeUnit).toLowerCase();
              if (volValue === 1 && (unitLower === 'l' || unitLower === 'liter' || unitLower === 'liters')) {
                approxOneLiter = true;
              }
            }
            if (!approxOneLiter && product.sizeLabel) {
              const sizeLower = String(product.sizeLabel).toLowerCase().replace(/\s+/g, '');
              if (sizeLower === '1l' || sizeLower === '1liter') {
                approxOneLiter = true;
              }
            }
            const priceOk = typeof product.price === 'number' && product.price <= 15;

            if (mentionsOliveOil && approxOneLiter && priceOk) {
              localStorage.setItem('task5_selectedProductId', productIdStr);
            }
          }
        }
      }
    } catch (e) {
      console.error('Instrumentation error in updateCartItemQuantity:', e);
    }

    return {
      success: true,
      message: 'Cart item updated',
      cart: hydratedCart,
      cartItems: hydratedItems
    };
  }

  // 9) removeCartItem(cartItemId)
  removeCartItem(cartItemId) {
    const cart = this._getCartFromStorage();
    const cartItems = this._getCartItemsFromStorage();
    if (!cart) {
      return { success: false, message: 'No active cart', cart: null, cartItems: [] };
    }

    const index = cartItems.findIndex(ci => ci.id === cartItemId && ci.cartId === cart.id);
    if (index === -1) {
      return { success: false, message: 'Cart item not found', cart: this._hydrateCart(cart), cartItems: this._hydrateCartItems(cart, cartItems) };
    }

    const removed = cartItems.splice(index, 1)[0];
    if (Array.isArray(cart.itemIds)) {
      cart.itemIds = cart.itemIds.filter(id => id !== removed.id);
    }

    const { cart: updatedCart } = this._recalculateCartTotals(cart, cartItems);
    const hydratedCart = this._hydrateCart(updatedCart);
    const hydratedItems = this._hydrateCartItems(updatedCart, this._getCartItemsFromStorage());

    return {
      success: true,
      message: 'Cart item removed',
      cart: hydratedCart,
      cartItems: hydratedItems
    };
  }

  // 10) setCartFulfillmentMethod(fulfillmentMethod)
  setCartFulfillmentMethod(fulfillmentMethod) {
    if (fulfillmentMethod !== 'delivery' && fulfillmentMethod !== 'pickup') {
      const fpRaw = this._getFulfillmentPreferenceRaw();
      return {
        cart: this._hydrateCart(this._getCartFromStorage()),
        fulfillmentPreference: this._hydrateFulfillmentPreference(fpRaw)
      };
    }

    const cart = this._getOrCreateCart();
    const fpRaw = this._getFulfillmentPreferenceRaw();

    cart.fulfillmentMethod = fulfillmentMethod;
    if (fulfillmentMethod === 'delivery') {
      cart.selectedStoreId = null;
      cart.deliveryZip = fpRaw && fpRaw.deliveryZip ? fpRaw.deliveryZip : cart.deliveryZip || null;
    } else if (fulfillmentMethod === 'pickup') {
      cart.deliveryZip = null;
      cart.selectedStoreId = fpRaw && fpRaw.preferredStoreId ? fpRaw.preferredStoreId : cart.selectedStoreId || null;
    }

    const cartItems = this._getCartItemsFromStorage();
    const { cart: updatedCart } = this._recalculateCartTotals(cart, cartItems);

    // Sync fulfillment preference default method
    let newFpRaw = fpRaw;
    if (!newFpRaw) {
      newFpRaw = {
        id: this._generateId('fulfillment_pref'),
        defaultFulfillmentMethod: fulfillmentMethod,
        deliveryZip: fulfillmentMethod === 'delivery' ? cart.deliveryZip : null,
        preferredStoreId: fulfillmentMethod === 'pickup' ? cart.selectedStoreId : null,
        lastUpdated: new Date().toISOString()
      };
    } else {
      newFpRaw = {
        ...newFpRaw,
        defaultFulfillmentMethod: fulfillmentMethod,
        deliveryZip: fulfillmentMethod === 'delivery' ? cart.deliveryZip : newFpRaw.deliveryZip,
        lastUpdated: new Date().toISOString()
      };
    }
    this._saveFulfillmentPreferenceRaw(newFpRaw);

    return {
      cart: this._hydrateCart(updatedCart),
      fulfillmentPreference: this._hydrateFulfillmentPreference(newFpRaw)
    };
  }

  // 11) applyPromoCodeToCart(promoCode)
  applyPromoCodeToCart(promoCode) {
    const codeInput = (promoCode || '').trim();
    const cart = this._getOrCreateCart();
    const cartItems = this._getCartItemsFromStorage();

    cart.promoCodeInput = codeInput;
    cart.appliedPromoCodeId = null;
    cart.promoCodeDiscountTotal = 0;

    // Recalculate without any promo code first
    this._recalculateCartTotals(cart, cartItems);
    const promos = this._getFromStorage('promo_codes', []);

    if (!codeInput) {
      const updatedCart = this._getCartFromStorage();
      return {
        success: false,
        message: 'Promo code is empty',
        appliedPromoCode: null,
        cart: this._hydrateCart(updatedCart)
      };
    }

    const normalized = codeInput.toUpperCase();
    const promo = promos.find(pc => (pc.code || '').toUpperCase() === normalized) || null;
    if (!promo) {
      const updatedCart = this._getCartFromStorage();
      return {
        success: false,
        message: 'Promo code not found',
        appliedPromoCode: null,
        cart: this._hydrateCart(updatedCart)
      };
    }

    if (promo.status !== 'active') {
      const updatedCart = this._getCartFromStorage();
      return {
        success: false,
        message: 'Promo code is not active',
        appliedPromoCode: null,
        cart: this._hydrateCart(updatedCart)
      };
    }

    const now = new Date();
    const validStart = promo.startDate ? new Date(promo.startDate) <= now : true;
    const validEnd = promo.endDate ? new Date(promo.endDate) >= now : true;
    if (!validStart || !validEnd) {
      const updatedCart = this._getCartFromStorage();
      return {
        success: false,
        message: 'Promo code has expired or is not yet valid',
        appliedPromoCode: null,
        cart: this._hydrateCart(updatedCart)
      };
    }

    if (promo.applicableScope !== 'cart') {
      const updatedCart = this._getCartFromStorage();
      return {
        success: false,
        message: 'Promo code is not applicable to the entire cart',
        appliedPromoCode: null,
        cart: this._hydrateCart(updatedCart)
      };
    }

    // Check min order amount
    const currentCart = this._getCartFromStorage();
    const subtotalAfterPromos = (currentCart && typeof currentCart.subtotal === 'number')
      ? (currentCart.subtotal - (currentCart.promotionDiscountTotal || 0))
      : 0;

    if (promo.minOrderAmount && subtotalAfterPromos < promo.minOrderAmount) {
      return {
        success: false,
        message: `Order subtotal must be at least ${promo.minOrderAmount} to use this promo code`,
        appliedPromoCode: null,
        cart: this._hydrateCart(currentCart)
      };
    }

    // Apply promo
    currentCart.appliedPromoCodeId = promo.id;
    const { cart: updatedCart } = this._recalculateCartTotals(currentCart, cartItems);

    return {
      success: true,
      message: 'Promo code applied successfully',
      appliedPromoCode: promo,
      cart: this._hydrateCart(updatedCart)
    };
  }

  // 12) getAvailableDeliverySlots(startDate, endDate)
  getAvailableDeliverySlots(startDate, endDate) {
    const slots = this._getFromStorage('delivery_slots', []);
    if (!slots.length) return [];

    // If no explicit date range is provided, do not filter by current date.
    let start = startDate ? new Date(startDate) : null;
    let end = endDate ? new Date(endDate) : null;
    if (start && isNaN(start.getTime())) start = null;
    if (end && isNaN(end.getTime())) end = null;

    return slots.filter(slot => {
      if (slot.fulfillmentMethod !== 'delivery') return false;
      if (!slot.isAvailable) return false;
      const d = new Date(slot.date);
      if (isNaN(d.getTime())) return false;
      if (start && d < start) return false;
      if (end && d > end) return false;
      return true;
    });
  }

  // 13) setCartDeliverySlot(deliverySlotId)
  setCartDeliverySlot(deliverySlotId) {
    const slots = this._getFromStorage('delivery_slots', []);
    const slot = slots.find(s => s.id === deliverySlotId) || null;
    if (!slot) {
      return {
        success: false,
        message: 'Delivery slot not found',
        cart: this._hydrateCart(this._getCartFromStorage()),
        selectedSlot: null
      };
    }
    if (!slot.isAvailable || slot.fulfillmentMethod !== 'delivery') {
      return {
        success: false,
        message: 'Delivery slot is not available for delivery',
        cart: this._hydrateCart(this._getCartFromStorage()),
        selectedSlot: slot
      };
    }

    const cart = this._getOrCreateCart();
    const cartItems = this._getCartItemsFromStorage();

    cart.fulfillmentMethod = 'delivery';
    cart.selectedDeliverySlotId = slot.id;

    const { cart: updatedCart } = this._recalculateCartTotals(cart, cartItems);

    return {
      success: true,
      message: 'Delivery slot selected',
      cart: this._hydrateCart(updatedCart),
      selectedSlot: slot
    };
  }

  // 14) getFulfillmentPreference()
  getFulfillmentPreference() {
    let fpRaw = this._getFulfillmentPreferenceRaw();
    if (!fpRaw) {
      fpRaw = {
        id: this._generateId('fulfillment_pref'),
        defaultFulfillmentMethod: 'delivery',
        deliveryZip: null,
        preferredStoreId: null,
        lastUpdated: new Date().toISOString()
      };
      this._saveFulfillmentPreferenceRaw(fpRaw);
    }

    const hydrated = this._hydrateFulfillmentPreference(fpRaw);
    return {
      fulfillmentPreference: hydrated,
      preferredStore: hydrated.preferredStore || null
    };
  }

  // 15) updateFulfillmentPreference(defaultFulfillmentMethod, deliveryZip, preferredStoreId)
  updateFulfillmentPreference(defaultFulfillmentMethod, deliveryZip, preferredStoreId) {
    if (defaultFulfillmentMethod !== 'delivery' && defaultFulfillmentMethod !== 'pickup') {
      const existing = this._getFulfillmentPreferenceRaw();
      return {
        fulfillmentPreference: this._hydrateFulfillmentPreference(existing),
        preferredStore: existing && existing.preferredStoreId
          ? (this._getFromStorage('stores', []).find(s => s.id === existing.preferredStoreId) || null)
          : null,
        cart: this._hydrateCart(this._getCartFromStorage())
      };
    }

    const stores = this._getFromStorage('stores', []);
    const selectedStore = preferredStoreId
      ? (stores.find(s => s.id === preferredStoreId) || null)
      : null;

    let fpRaw = this._getFulfillmentPreferenceRaw();
    const now = new Date().toISOString();
    if (!fpRaw) {
      fpRaw = {
        id: this._generateId('fulfillment_pref'),
        defaultFulfillmentMethod,
        deliveryZip: defaultFulfillmentMethod === 'delivery' ? (deliveryZip || null) : null,
        preferredStoreId: defaultFulfillmentMethod === 'pickup' && selectedStore ? selectedStore.id : null,
        lastUpdated: now
      };
    } else {
      fpRaw = {
        ...fpRaw,
        defaultFulfillmentMethod,
        deliveryZip: defaultFulfillmentMethod === 'delivery' ? (deliveryZip || null) : fpRaw.deliveryZip,
        preferredStoreId: defaultFulfillmentMethod === 'pickup' && selectedStore ? selectedStore.id : fpRaw.preferredStoreId,
        lastUpdated: now
      };
    }
    this._saveFulfillmentPreferenceRaw(fpRaw);

    // Sync cart
    let cart = this._getCartFromStorage();
    const cartItems = this._getCartItemsFromStorage();
    if (cart) {
      cart.fulfillmentMethod = defaultFulfillmentMethod;
      if (defaultFulfillmentMethod === 'delivery') {
        cart.deliveryZip = fpRaw.deliveryZip;
        cart.selectedStoreId = null;
      } else {
        cart.deliveryZip = null;
        cart.selectedStoreId = fpRaw.preferredStoreId || null;
      }
      const res = this._recalculateCartTotals(cart, cartItems);
      cart = res.cart;
    }

    return {
      fulfillmentPreference: this._hydrateFulfillmentPreference(fpRaw),
      preferredStore: selectedStore,
      cart: this._hydrateCart(cart)
    };
  }

  // 16) getDeliveryAvailability(deliveryZip)
  getDeliveryAvailability(deliveryZip) {
    const zip = (deliveryZip || '').trim();
    const stores = this._getFromStorage('stores', []);
    if (!zip) {
      return {
        isAvailable: false,
        message: 'No ZIP code provided',
        estimatedFee: 0,
        typicalWindows: []
      };
    }

    // Delivery considered available if any store with supportsDelivery whose postalCode shares first 3 digits
    const prefix = zip.slice(0, 3);
    const eligibleStores = stores.filter(s => {
      if (!s.supportsDelivery) return false;
      if (!s.postalCode) return false;
      return String(s.postalCode).slice(0, 3) === prefix;
    });

    const isAvailable = eligibleStores.length > 0;

    const slots = this.getAvailableDeliverySlots();
    const typicalWindowsSet = new Set();
    for (const slot of slots) {
      if (slot.label) typicalWindowsSet.add(slot.label);
    }

    return {
      isAvailable,
      message: isAvailable ? 'Delivery is available in your area' : 'Delivery is not available in your area',
      estimatedFee: isAvailable ? 7.99 : 0,
      typicalWindows: Array.from(typicalWindowsSet)
    };
  }

  // 17) searchProducts(query, selectedCategoryId, filters, sort, page = 1, pageSize = 24)
  searchProducts(query, selectedCategoryId, filters, sort, page = 1, pageSize = 24) {
    const q = (query || '').trim().toLowerCase();
    const products = this._getFromStorage('products', []);
    const categories = this._getFromStorage('categories', []);

    let baseResults = products.filter(p => {
      if (!q) return true;
      const name = (p.name || '').toLowerCase();
      const desc = (p.description || '').toLowerCase();
      return name.includes(q) || desc.includes(q);
    });

    if (selectedCategoryId) {
      const descendantIds = this._getDescendantCategoryIds(selectedCategoryId, categories);
      baseResults = baseResults.filter(p => {
        if (descendantIds.includes(p.categoryId)) return true;
        if (Array.isArray(p.secondaryCategoryIds)) {
          return p.secondaryCategoryIds.some(id => descendantIds.includes(id));
        }
        return false;
      });
    }

    const filtered = this._filterProductsBase(baseResults, filters);
    const sorted = this._sortProducts(filtered, sort);

    const totalResults = sorted.length;
    const pageNum = page || 1;
    const size = pageSize || 24;
    const start = (pageNum - 1) * size;
    const end = start + size;
    const pageProducts = sorted.slice(start, end);

    const cart = this._getCartFromStorage();
    const cartItems = this._getCartItemsFromStorage();

    const resultProducts = pageProducts.map(p => {
      let isInCart = false;
      let currentCartQuantity = 0;
      if (cart) {
        for (const ci of cartItems) {
          if (ci.cartId === cart.id && ci.productId === p.id) {
            isInCart = true;
            currentCartQuantity += ci.quantity || 0;
          }
        }
      }
      const productCategory = categories.find(c => c.id === p.categoryId) || null;
      return {
        product: this._hydrateProduct(p, categories, []),
        categoryName: productCategory ? productCategory.name : null,
        isInCart,
        currentCartQuantity
      };
    });

    // Available categories within search results
    const categoryIdSet = new Set(sorted.map(p => p.categoryId));
    const availableCategories = categories.filter(c => categoryIdSet.has(c.id));

    return {
      query,
      page: pageNum,
      pageSize: size,
      totalResults,
      availableCategories,
      products: resultProducts
    };
  }

  // 18) getSearchFilterOptions(query)
  getSearchFilterOptions(query) {
    const q = (query || '').trim().toLowerCase();
    const products = this._getFromStorage('products', []);
    const categories = this._getFromStorage('categories', []);

    const matched = products.filter(p => {
      if (!q) return true;
      const name = (p.name || '').toLowerCase();
      const desc = (p.description || '').toLowerCase();
      return name.includes(q) || desc.includes(q);
    });

    let minPrice = null;
    let maxPrice = null;
    const ratingOptionsSet = new Set();
    const sizeVolumeOptionsSet = new Set();
    const dietaryTagSet = new Set();

    for (const p of matched) {
      if (typeof p.price === 'number') {
        if (minPrice === null || p.price < minPrice) minPrice = p.price;
        if (maxPrice === null || p.price > maxPrice) maxPrice = p.price;
      }
      if (typeof p.averageRating === 'number') {
        ratingOptionsSet.add(1);
        ratingOptionsSet.add(2);
        ratingOptionsSet.add(3);
        ratingOptionsSet.add(4);
      }
      if (p.sizeLabel) sizeVolumeOptionsSet.add(String(p.sizeLabel));
      if (p.volumeValue && p.volumeUnit) {
        sizeVolumeOptionsSet.add(`${p.volumeValue}${p.volumeUnit}`);
      }
      if (Array.isArray(p.dietaryTags)) {
        for (const t of p.dietaryTags) dietaryTagSet.add(t);
      }
    }

    const categoryIdSet = new Set(matched.map(p => p.categoryId));
    const availableCategories = categories.filter(c => categoryIdSet.has(c.id));

    return {
      availableCategories,
      price: {
        minAllowed: minPrice === null ? 0 : minPrice,
        maxAllowed: maxPrice === null ? 0 : maxPrice
      },
      ratingOptions: Array.from(ratingOptionsSet).sort((a, b) => a - b),
      sizeVolumeOptions: Array.from(sizeVolumeOptionsSet),
      dietaryTags: Array.from(dietaryTagSet)
    };
  }

  // 19) searchStoresByZip(postalCode)
  searchStoresByZip(postalCode) {
    const zip = (postalCode || '').trim();
    const stores = this._getFromStorage('stores', []);
    if (!zip) return stores.slice();

    const prefix = zip.slice(0, 5);
    const results = stores.filter(s => {
      if (!s.postalCode) return false;
      const storeZip = String(s.postalCode).slice(0, 5);
      return storeZip === prefix;
    });

    results.sort((a, b) => {
      const da = typeof a.distanceMiles === 'number' ? a.distanceMiles : Number.MAX_VALUE;
      const db = typeof b.distanceMiles === 'number' ? b.distanceMiles : Number.MAX_VALUE;
      return da - db;
    });

    return results;
  }

  // 20) setPreferredStore(storeId)
  setPreferredStore(storeId) {
    const stores = this._getFromStorage('stores', []);
    const store = stores.find(s => s.id === storeId) || null;
    if (!store) {
      const existing = this._getFulfillmentPreferenceRaw();
      return {
        fulfillmentPreference: this._hydrateFulfillmentPreference(existing),
        preferredStore: null,
        cart: this._hydrateCart(this._getCartFromStorage())
      };
    }

    let fpRaw = this._getFulfillmentPreferenceRaw();
    const now = new Date().toISOString();
    if (!fpRaw) {
      fpRaw = {
        id: this._generateId('fulfillment_pref'),
        defaultFulfillmentMethod: 'pickup',
        deliveryZip: null,
        preferredStoreId: store.id,
        lastUpdated: now
      };
    } else {
      fpRaw = {
        ...fpRaw,
        preferredStoreId: store.id,
        lastUpdated: now
      };
    }
    this._saveFulfillmentPreferenceRaw(fpRaw);

    // Update cart if using pickup
    let cart = this._getCartFromStorage();
    const cartItems = this._getCartItemsFromStorage();
    if (cart && cart.fulfillmentMethod === 'pickup') {
      cart.selectedStoreId = store.id;
      const res = this._recalculateCartTotals(cart, cartItems);
      cart = res.cart;
    }

    return {
      fulfillmentPreference: this._hydrateFulfillmentPreference(fpRaw),
      preferredStore: store,
      cart: this._hydrateCart(cart)
    };
  }

  // 21) setCartPickupStore(storeId)
  setCartPickupStore(storeId) {
    const stores = this._getFromStorage('stores', []);
    const store = stores.find(s => s.id === storeId) || null;
    if (!store) {
      return {
        cart: this._hydrateCart(this._getCartFromStorage()),
        pickupStore: null
      };
    }

    const cart = this._getOrCreateCart();
    const cartItems = this._getCartItemsFromStorage();

    cart.fulfillmentMethod = 'pickup';
    cart.selectedStoreId = store.id;
    cart.deliveryZip = null;

    const { cart: updatedCart } = this._recalculateCartTotals(cart, cartItems);

    return {
      cart: this._hydrateCart(updatedCart),
      pickupStore: store
    };
  }

  // 22) getActivePromotions()
  getActivePromotions() {
    const promotions = this._getFromStorage('promotions', []);
    const now = new Date();
    return promotions.filter(p => {
      if (p.status !== 'active') return false;
      const validStart = p.startDate ? new Date(p.startDate) <= now : true;
      const validEnd = p.endDate ? new Date(p.endDate) >= now : true;
      return validStart && validEnd;
    });
  }

  // 23) getPromotionDetails(promotionId)
  getPromotionDetails(promotionId) {
    const promotions = this._getFromStorage('promotions', []);
    return promotions.find(p => p.id === promotionId) || null;
  }

  // 24) getPromotionFilterOptions(promotionId)
  getPromotionFilterOptions(promotionId) {
    const promotions = this._getFromStorage('promotions', []);
    const products = this._getFromStorage('products', []);
    const promotion = promotions.find(p => p.id === promotionId) || null;

    if (!promotion) {
      return {
        promotion: null,
        price: {
          minAllowed: 0,
          maxAllowed: 0
        },
        productTypeOptions: [],
        sortOptions: []
      };
    }

    const applicableProducts = products.filter(p => {
      if (promotion.applicableScope === 'product') {
        return Array.isArray(promotion.applicableProductIds) && promotion.applicableProductIds.includes(p.id);
      }
      if (promotion.applicableScope === 'category') {
        return Array.isArray(promotion.applicableCategoryIds) && promotion.applicableCategoryIds.includes(p.categoryId);
      }
      if (Array.isArray(p.promotionIds) && p.promotionIds.includes(promotion.id)) {
        return true;
      }
      return false;
    });

    let minPrice = null;
    let maxPrice = null;
    const productTypeOptionsSet = new Set();

    for (const p of applicableProducts) {
      if (typeof p.price === 'number') {
        if (minPrice === null || p.price < minPrice) minPrice = p.price;
        if (maxPrice === null || p.price > maxPrice) maxPrice = p.price;
      }
      if (p.productType) productTypeOptionsSet.add(p.productType);
    }

    return {
      promotion,
      price: {
        minAllowed: minPrice === null ? 0 : minPrice,
        maxAllowed: maxPrice === null ? 0 : maxPrice
      },
      productTypeOptions: Array.from(productTypeOptionsSet),
      sortOptions: ['price_low_to_high', 'price_high_to_low', 'customer_rating_high_to_low']
    };
  }

  // 25) getPromotionProducts(promotionId, filters, sort, page = 1, pageSize = 24)
  getPromotionProducts(promotionId, filters, sort, page = 1, pageSize = 24) {
    const promotions = this._getFromStorage('promotions', []);
    const products = this._getFromStorage('products', []);
    const categories = this._getFromStorage('categories', []);
    const promotion = promotions.find(p => p.id === promotionId) || null;

    if (!promotion) {
      return {
        promotion: null,
        page: page || 1,
        pageSize: pageSize || 24,
        totalResults: 0,
        products: []
      };
    }

    let applicableProducts = products.filter(p => {
      if (promotion.applicableScope === 'product') {
        if (Array.isArray(promotion.applicableProductIds) && promotion.applicableProductIds.includes(p.id)) {
          return true;
        }
      }
      if (promotion.applicableScope === 'category') {
        if (Array.isArray(promotion.applicableCategoryIds) && promotion.applicableCategoryIds.includes(p.categoryId)) {
          return true;
        }
      }
      if (Array.isArray(p.promotionIds) && p.promotionIds.includes(promotion.id)) {
        return true;
      }
      return false;
    });

    applicableProducts = this._filterProductsBase(applicableProducts, filters);
    applicableProducts = this._sortProducts(applicableProducts, sort);

    const totalResults = applicableProducts.length;
    const pageNum = page || 1;
    const size = pageSize || 24;
    const start = (pageNum - 1) * size;
    const end = start + size;
    const pageProducts = applicableProducts.slice(start, end);

    const cart = this._getCartFromStorage();
    const cartItems = this._getCartItemsFromStorage();

    const result = pageProducts.map(p => {
      let isInCart = false;
      let currentCartQuantity = 0;
      if (cart) {
        for (const ci of cartItems) {
          if (ci.cartId === cart.id && ci.productId === p.id) {
            isInCart = true;
            currentCartQuantity += ci.quantity || 0;
          }
        }
      }
      return {
        product: this._hydrateProduct(p, categories, promotions),
        isInCart,
        currentCartQuantity
      };
    });

    return {
      promotion,
      page: pageNum,
      pageSize: size,
      totalResults,
      products: result
    };
  }

  // 26) getInformationalPage(pageKey)
  getInformationalPage(pageKey) {
    const pages = this._getFromStorage('informational_pages', []);
    const key = (pageKey || '').trim();
    const page = pages.find(p => p.pageKey === key) || null;

    if (!page) {
      return {
        title: '',
        bodyHtml: '',
        sections: [],
        contactDetails: {
          phone: '',
          email: '',
          hours: ''
        }
      };
    }

    return {
      title: page.title || '',
      bodyHtml: page.bodyHtml || '',
      sections: Array.isArray(page.sections) ? page.sections : [],
      contactDetails: page.contactDetails || { phone: '', email: '', hours: '' }
    };
  }

  // 27) submitContactRequest(name, email, subject, message, orderReference)
  submitContactRequest(name, email, subject, message, orderReference) {
    const requests = this._getFromStorage('contact_requests', []);
    const ticketId = this._generateId('ticket');
    const now = new Date().toISOString();

    const newReq = {
      id: ticketId,
      name,
      email,
      subject,
      message,
      orderReference: orderReference || null,
      createdAt: now
    };

    requests.push(newReq);
    this._saveToStorage('contact_requests', requests);

    return {
      success: true,
      message: 'Contact request submitted',
      ticketId
    };
  }

  // 28) getHomepageFeaturedProducts()
  getHomepageFeaturedProducts() {
    const products = this._getFromStorage('products', []);
    const categories = this._getFromStorage('categories', []);
    const featuredIds = this._getFromStorage('homepage_featured_product_ids', []);

    const featuredProducts = [];
    for (const id of featuredIds) {
      const p = products.find(prod => prod.id === id);
      if (p) {
        featuredProducts.push(this._hydrateProduct(p, categories, []));
      }
    }

    return featuredProducts;
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