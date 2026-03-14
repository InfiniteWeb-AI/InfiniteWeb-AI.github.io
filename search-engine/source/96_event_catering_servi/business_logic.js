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

  // ----------------------
  // Storage helpers
  // ----------------------

  _initStorage() {
    const keys = [
      'package_categories',
      'packages',
      'package_menu_sections',
      'package_menu_items',
      'dishes',
      'add_ons',
      'custom_menus',
      'cart',
      'cart_items',
      'promo_codes',
      'availability_slots',
      'bookings',
      'quote_requests',
      'tasting_lists',
      'tasting_list_items',
      'contact_inquiries',
      'faq_items',
      'policy_pages',
      'menu_filter_states',
      'package_filter_states'
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

  _getFromStorage(key, defaultValue) {
    const raw = localStorage.getItem(key);
    if (raw === null || raw === undefined) {
      return defaultValue !== undefined ? defaultValue : [];
    }
    try {
      return JSON.parse(raw);
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

  // ----------------------
  // Core internal helpers
  // ----------------------

  // Internal helper to get or create the single cart
  _getOrCreateCart() {
    let carts = this._getFromStorage('cart');
    if (!Array.isArray(carts)) {
      carts = [];
    }
    if (carts.length > 0) {
      return carts[0];
    }
    const now = new Date().toISOString();
    const newCart = {
      id: this._generateId('cart'),
      items: [], // array of CartItem IDs
      appliedPromoCode: null,
      promoDiscountAmount: 0,
      subtotal: 0,
      totalBeforeDiscount: 0,
      totalAfterDiscount: 0,
      currency: 'USD',
      createdAt: now,
      updatedAt: now
    };
    this._saveToStorage('cart', [newCart]);
    return newCart;
  }

  // Internal helper to recalculate cart totals and persist
  _recalculateCartTotals(cart, allCartItems) {
    if (!cart) {
      return null;
    }
    let carts = this._getFromStorage('cart');
    if (!Array.isArray(carts) || carts.length === 0) {
      carts = [cart];
    }

    const itemsForCart = (allCartItems || this._getFromStorage('cart_items')).filter(
      function (ci) {
        return ci.cartId === cart.id;
      }
    );

    let subtotal = 0;
    for (let i = 0; i < itemsForCart.length; i++) {
      const line = itemsForCart[i];
      const lineSubtotal = Number(line.lineSubtotal) || 0;
      subtotal += lineSubtotal;
    }

    cart.subtotal = subtotal;
    cart.totalBeforeDiscount = subtotal;

    let discountAmount = 0;
    let appliedPromoCode = cart.appliedPromoCode || null;

    if (appliedPromoCode) {
      const validation = this._validatePromoCode(appliedPromoCode, subtotal);
      if (validation.success) {
        discountAmount = validation.discountAmount;
      } else {
        // promo no longer valid; clear it
        appliedPromoCode = null;
        cart.appliedPromoCode = null;
      }
    }

    cart.promoDiscountAmount = discountAmount;
    cart.totalAfterDiscount = subtotal - discountAmount;
    if (cart.totalAfterDiscount < 0) {
      cart.totalAfterDiscount = 0;
    }
    cart.updatedAt = new Date().toISOString();

    const idx = carts.findIndex(function (c) { return c.id === cart.id; });
    if (idx >= 0) {
      carts[idx] = cart;
    } else {
      carts.push(cart);
    }
    this._saveToStorage('cart', carts);

    return cart;
  }

  // Internal helper to get or create tasting/favorites list
  _getOrCreateTastingList(listType) {
    const type = listType || 'tasting';
    let lists = this._getFromStorage('tasting_lists');
    if (!Array.isArray(lists)) {
      lists = [];
    }
    let existing = null;
    for (let i = 0; i < lists.length; i++) {
      if (lists[i].type === type) {
        existing = lists[i];
        break;
      }
    }
    if (existing) {
      return existing;
    }
    const now = new Date().toISOString();
    const newList = {
      id: this._generateId('tasting_list'),
      name: type === 'favorites' ? 'Favorites' : 'Tasting List',
      type: type,
      createdAt: now,
      updatedAt: now
    };
    lists.push(newList);
    this._saveToStorage('tasting_lists', lists);
    return newList;
  }

  // Internal helper to get/create booking draft for a slot
  _getOrCreateBookingDraft(availabilitySlotId, guestCount) {
    let bookings = this._getFromStorage('bookings');
    if (!Array.isArray(bookings)) {
      bookings = [];
    }
    let booking = null;
    for (let i = 0; i < bookings.length; i++) {
      const b = bookings[i];
      if (b.availabilitySlotId === availabilitySlotId && b.status === 'draft') {
        booking = b;
        break;
      }
    }

    const slots = this._getFromStorage('availability_slots');
    const slot = slots.find(function (s) { return s.id === availabilitySlotId; }) || null;
    if (!slot) {
      return null;
    }

    const now = new Date().toISOString();

    if (!booking) {
      booking = {
        id: this._generateId('booking'),
        availabilitySlotId: availabilitySlotId,
        eventDate: slot.date,
        startTime: slot.startTime,
        endTime: slot.endTime,
        guestCount: guestCount,
        eventName: '',
        eventType: 'other',
        contactName: '',
        contactPhone: '',
        contactEmail: '',
        status: 'draft',
        createdAt: now,
        updatedAt: now
      };
      bookings.push(booking);
    } else {
      booking.guestCount = guestCount;
      booking.updatedAt = now;
    }

    this._saveToStorage('bookings', bookings);
    return booking;
  }

  // Internal helper to compute custom menu pricing
  _calculateCustomMenuPriceInternal(
    mealType,
    selectedAppetizerIds,
    selectedMainIds,
    selectedDessertIds,
    selectedOtherDishIds,
    guestCount,
    budgetPerPerson
  ) {
    const allSelectedIds = [];
    if (Array.isArray(selectedAppetizerIds)) {
      for (let i = 0; i < selectedAppetizerIds.length; i++) {
        allSelectedIds.push(selectedAppetizerIds[i]);
      }
    }
    if (Array.isArray(selectedMainIds)) {
      for (let i = 0; i < selectedMainIds.length; i++) {
        allSelectedIds.push(selectedMainIds[i]);
      }
    }
    if (Array.isArray(selectedDessertIds)) {
      for (let i = 0; i < selectedDessertIds.length; i++) {
        allSelectedIds.push(selectedDessertIds[i]);
      }
    }
    if (Array.isArray(selectedOtherDishIds)) {
      for (let i = 0; i < selectedOtherDishIds.length; i++) {
        allSelectedIds.push(selectedOtherDishIds[i]);
      }
    }

    const dishes = this._getFromStorage('dishes');
    let perPerson = 0;

    for (let i = 0; i < allSelectedIds.length; i++) {
      const id = allSelectedIds[i];
      const dish = dishes.find(function (d) { return d.id === id; });
      if (dish && typeof dish.pricePerPerson === 'number') {
        perPerson += dish.pricePerPerson;
      }
    }

    const gc = typeof guestCount === 'number' && guestCount > 0 ? guestCount : 0;
    const totalPrice = perPerson * gc;
    const withinBudget = typeof budgetPerPerson === 'number'
      ? perPerson <= budgetPerPerson
      : true;

    return {
      pricePerPerson: perPerson,
      totalPrice: totalPrice,
      budgetPerPerson: budgetPerPerson,
      withinBudget: withinBudget
    };
  }

  // Internal helper to validate promo code and compute discount
  _validatePromoCode(promoCode, cartSubtotal) {
    const code = (promoCode || '').trim();
    if (!code) {
      return { success: false, promo: null, discountAmount: 0, message: 'Empty promo code' };
    }

    const promoCodes = this._getFromStorage('promo_codes');
    const normalized = code.toLowerCase();

    let promo = null;
    for (let i = 0; i < promoCodes.length; i++) {
      const p = promoCodes[i];
      if ((p.code || '').toLowerCase() === normalized) {
        promo = p;
        break;
      }
    }

    if (!promo) {
      return { success: false, promo: null, discountAmount: 0, message: 'Promo code not found' };
    }
    if (promo.isActive === false) {
      return { success: false, promo: promo, discountAmount: 0, message: 'Promo code inactive' };
    }

    const now = new Date();
    if (promo.validFrom) {
      const from = new Date(promo.validFrom);
      if (now < from) {
        return { success: false, promo: promo, discountAmount: 0, message: 'Promo not yet valid' };
      }
    }
    if (promo.validTo) {
      const to = new Date(promo.validTo);
      if (now > to) {
        return { success: false, promo: promo, discountAmount: 0, message: 'Promo expired' };
      }
    }

    const subtotal = Number(cartSubtotal) || 0;
    if (typeof promo.minimumOrderTotal === 'number' && subtotal < promo.minimumOrderTotal) {
      return {
        success: false,
        promo: promo,
        discountAmount: 0,
        message: 'Minimum order total not met'
      };
    }

    let discountAmount = 0;
    if (promo.discountType === 'percentage') {
      discountAmount = subtotal * (promo.discountValue / 100);
    } else if (promo.discountType === 'fixed_amount') {
      discountAmount = promo.discountValue;
    }

    if (typeof promo.maximumDiscountAmount === 'number' && discountAmount > promo.maximumDiscountAmount) {
      discountAmount = promo.maximumDiscountAmount;
    }

    if (discountAmount > subtotal) {
      discountAmount = subtotal;
    }

    return { success: true, promo: promo, discountAmount: discountAmount, message: 'OK' };
  }

  // ----------------------
  // Interface implementations
  // ----------------------

  // getHomePageData()
  getHomePageData() {
    const categories = this._getFromStorage('package_categories');
    const packages = this._getFromStorage('packages');

    const activeCategories = categories.filter(function (c) { return c.isActive !== false; });
    activeCategories.sort(function (a, b) {
      const ao = typeof a.displayOrder === 'number' ? a.displayOrder : 0;
      const bo = typeof b.displayOrder === 'number' ? b.displayOrder : 0;
      return ao - bo;
    });

    const categoryMap = {};
    for (let i = 0; i < activeCategories.length; i++) {
      const c = activeCategories[i];
      categoryMap[c.code] = c;
    }

    const activePackages = packages.filter(function (p) { return p.isActive !== false; });

    const featuredPackages = activePackages.slice(0, 6).map(function (p) {
      const category = categoryMap[p.categoryCode] || null;
      const displayPrice = typeof p.basePricePerPerson === 'number'
        ? p.basePricePerPerson
        : (typeof p.minPricePerPerson === 'number' ? p.minPricePerPerson : 0);
      return {
        package: p,
        categoryName: category ? category.name : '',
        displayPricePerPerson: displayPrice,
        displayTagline: p.description || ''
      };
    });

    const quickActions = [
      { type: 'browse_corporate_packages', label: 'Corporate Events', categoryCode: 'corporate_events' },
      { type: 'browse_wedding_packages', label: 'Weddings', categoryCode: 'weddings' },
      { type: 'browse_party_packages', label: 'Parties & Birthdays', categoryCode: 'parties_birthdays' },
      { type: 'browse_coffee_breaks', label: 'Coffee Breaks', categoryCode: 'coffee_breaks' },
      { type: 'custom_menu_builder', label: 'Build a Custom Menu', categoryCode: 'all_events' },
      { type: 'check_availability', label: 'Check Availability', categoryCode: 'all_events' },
      { type: 'request_quote', label: 'Request a Quote', categoryCode: 'all_events' }
    ];

    return {
      heroTitle: 'Premium catering for unforgettable events',
      heroSubtitle: 'Corporate lunches, weddings, parties, and conferences – tailored to your guests.',
      primaryCategories: activeCategories.map(function (c) {
        return {
          category: c,
          highlightText: c.description || ''
        };
      }),
      featuredPackages: featuredPackages,
      quickActions: quickActions
    };
  }

  // getPackageCategoriesForNavigation()
  getPackageCategoriesForNavigation() {
    let categories = this._getFromStorage('package_categories');
    categories = categories.filter(function (c) { return c.isActive !== false; });
    categories.sort(function (a, b) {
      const ao = typeof a.displayOrder === 'number' ? a.displayOrder : 0;
      const bo = typeof b.displayOrder === 'number' ? b.displayOrder : 0;
      return ao - bo;
    });
    return categories;
  }

  // getPackageFilterOptions(categoryCode)
  getPackageFilterOptions(categoryCode) {
    const allPackages = this._getFromStorage('packages');
    let filtered = allPackages.filter(function (p) {
      return p.isActive !== false;
    });

    if (categoryCode && categoryCode !== 'all_events') {
      filtered = filtered.filter(function (p) { return p.categoryCode === categoryCode; });
    }

    const guestPresetSet = new Set();
    const mealTypeSet = new Set();
    const serviceStyleSet = new Set();
    const courseSet = new Set();
    let minPrice = null;
    let maxPrice = null;

    for (let i = 0; i < filtered.length; i++) {
      const p = filtered[i];
      if (typeof p.minGuests === 'number') {
        guestPresetSet.add(p.minGuests);
      }
      if (typeof p.maxGuests === 'number') {
        guestPresetSet.add(p.maxGuests);
      }
      if (p.mealType) {
        mealTypeSet.add(p.mealType);
      }
      if (p.serviceStyle) {
        serviceStyleSet.add(p.serviceStyle);
      }
      if (typeof p.courseCount === 'number') {
        courseSet.add(p.courseCount);
      }
      const priceBase = typeof p.basePricePerPerson === 'number'
        ? p.basePricePerPerson
        : (typeof p.minPricePerPerson === 'number' ? p.minPricePerPerson : null);
      if (priceBase !== null) {
        if (minPrice === null || priceBase < minPrice) {
          minPrice = priceBase;
        }
        if (maxPrice === null || priceBase > maxPrice) {
          maxPrice = priceBase;
        }
      }
    }

    const guestCountPresets = Array.from(guestPresetSet).sort(function (a, b) { return a - b; });

    const mealTypes = Array.from(mealTypeSet);
    const serviceStyles = Array.from(serviceStyleSet);
    const courseCounts = Array.from(courseSet).sort(function (a, b) { return a - b; });

    const pricePerPersonRange = {
      min: minPrice !== null ? minPrice : 0,
      max: maxPrice !== null ? maxPrice : 0,
      step: 1
    };

    const supportsIncludesDessertFilter = filtered.some(function (p) { return typeof p.includesDessert === 'boolean'; });
    const supportsVegetarianFilter = filtered.some(function (p) { return typeof p.vegetarianFriendly === 'boolean'; });
    const supportsGlutenFreeFilter = filtered.some(function (p) { return typeof p.glutenFreeFriendly === 'boolean'; });

    const sortOptions = [
      'price_low_to_high',
      'price_high_to_low',
      'rating',
      'name'
    ];

    return {
      guestCountPresets: guestCountPresets,
      pricePerPersonRange: pricePerPersonRange,
      mealTypes: mealTypes,
      serviceStyles: serviceStyles,
      courseCounts: courseCounts,
      supportsIncludesDessertFilter: supportsIncludesDessertFilter,
      supportsVegetarianFilter: supportsVegetarianFilter,
      supportsGlutenFreeFilter: supportsGlutenFreeFilter,
      sortOptions: sortOptions
    };
  }

  // listPackages(...)
  listPackages(
    categoryCode,
    guestCount,
    pricePerPersonMin,
    pricePerPersonMax,
    mealType,
    serviceStyle,
    includesDessert,
    courseCount,
    vegetarianOnly,
    glutenFreeFriendly,
    sortBy
  ) {
    const allPackages = this._getFromStorage('packages');
    const categories = this._getFromStorage('package_categories');
    const categoryMap = {};
    for (let i = 0; i < categories.length; i++) {
      categoryMap[categories[i].code] = categories[i];
    }

    let filtered = allPackages.filter(function (p) { return p.isActive !== false; });

    if (categoryCode && categoryCode !== 'all_events') {
      filtered = filtered.filter(function (p) { return p.categoryCode === categoryCode; });
    }

    if (mealType) {
      filtered = filtered.filter(function (p) { return p.mealType === mealType; });
    }

    if (serviceStyle) {
      filtered = filtered.filter(function (p) { return p.serviceStyle === serviceStyle; });
    }

    if (includesDessert === true) {
      filtered = filtered.filter(function (p) { return p.includesDessert === true; });
    }

    if (typeof courseCount === 'number') {
      filtered = filtered.filter(function (p) { return p.courseCount === courseCount; });
    }

    if (vegetarianOnly === true) {
      filtered = filtered.filter(function (p) { return p.vegetarianFriendly === true; });
    }

    if (glutenFreeFriendly === true) {
      filtered = filtered.filter(function (p) { return p.glutenFreeFriendly === true; });
    }

    if (typeof pricePerPersonMin === 'number') {
      filtered = filtered.filter(function (p) {
        const base = typeof p.basePricePerPerson === 'number'
          ? p.basePricePerPerson
          : (typeof p.minPricePerPerson === 'number' ? p.minPricePerPerson : 0);
        return base >= pricePerPersonMin;
      });
    }

    if (typeof pricePerPersonMax === 'number') {
      filtered = filtered.filter(function (p) {
        const base = typeof p.basePricePerPerson === 'number'
          ? p.basePricePerPerson
          : (typeof p.minPricePerPerson === 'number' ? p.minPricePerPerson : 0);
        return base <= pricePerPersonMax;
      });
    }

    if (sortBy === 'price_low_to_high' || sortBy === 'price_high_to_low') {
      filtered.sort(function (a, b) {
        const aPrice = typeof a.basePricePerPerson === 'number'
          ? a.basePricePerPerson
          : (typeof a.minPricePerPerson === 'number' ? a.minPricePerPerson : 0);
        const bPrice = typeof b.basePricePerPerson === 'number'
          ? b.basePricePerPerson
          : (typeof b.minPricePerPerson === 'number' ? b.minPricePerPerson : 0);
        if (sortBy === 'price_low_to_high') {
          return aPrice - bPrice;
        }
        return bPrice - aPrice;
      });
    } else if (sortBy === 'rating') {
      filtered.sort(function (a, b) {
        const ar = typeof a.rating === 'number' ? a.rating : 0;
        const br = typeof b.rating === 'number' ? b.rating : 0;
        return br - ar;
      });
    } else if (sortBy === 'name') {
      filtered.sort(function (a, b) {
        const an = (a.name || '').toLowerCase();
        const bn = (b.name || '').toLowerCase();
        if (an < bn) return -1;
        if (an > bn) return 1;
        return 0;
      });
    }

    const gc = typeof guestCount === 'number' && guestCount > 0 ? guestCount : null;

    return filtered.map(function (p) {
      const category = categoryMap[p.categoryCode] || null;
      const basePrice = typeof p.basePricePerPerson === 'number'
        ? p.basePricePerPerson
        : (typeof p.minPricePerPerson === 'number' ? p.minPricePerPerson : 0);
      return {
        package: p,
        categoryName: category ? category.name : '',
        displayPricePerPerson: basePrice,
        estimatedTotalForGuestCount: gc ? basePrice * gc : null
      };
    });
  }

  // getPackageDetail(packageId, guestCountPreview)
  getPackageDetail(packageId, guestCountPreview) {
    const packages = this._getFromStorage('packages');
    const pkg = packages.find(function (p) { return p.id === packageId; }) || null;

    if (!pkg) {
      return {
        package: null,
        guestCountPreview: guestCountPreview || null,
        effectivePricePerPerson: 0,
        estimatedTotalPrice: 0,
        menuSections: [],
        availableAddOns: [],
        allowsMenuCustomization: false,
        allowsDateSelection: false,
        allowsAddOns: false
      };
    }

    const sections = this._getFromStorage('package_menu_sections').filter(function (s) {
      return s.packageId === pkg.id;
    });
    const menuItemsAll = this._getFromStorage('package_menu_items');
    const dishes = this._getFromStorage('dishes');

    let defaultAdditionalPerPerson = 0;
    const menuSections = [];

    for (let i = 0; i < sections.length; i++) {
      const section = sections[i];
      const sectionItems = menuItemsAll.filter(function (mi) {
        return mi.packageMenuSectionId === section.id;
      });

      const menuItems = [];
      for (let j = 0; j < sectionItems.length; j++) {
        const mi = sectionItems[j];
        const dish = dishes.find(function (d) { return d.id === mi.dishId; }) || null;
        if (mi.isDefault === true && typeof mi.additionalPricePerPerson === 'number') {
          defaultAdditionalPerPerson += mi.additionalPricePerPerson;
        }
        const enrichedMenuItem = Object.assign({}, mi, {
          dish: dish
        });
        menuItems.push({
          menuItem: enrichedMenuItem,
          dish: dish
        });
      }

      menuSections.push({
        section: section,
        menuItems: menuItems
      });
    }

    const basePrice = typeof pkg.basePricePerPerson === 'number'
      ? pkg.basePricePerPerson
      : (typeof pkg.minPricePerPerson === 'number' ? pkg.minPricePerPerson : 0);

    const effectivePricePerPerson = basePrice + defaultAdditionalPerPerson;
    const previewCount = typeof guestCountPreview === 'number' && guestCountPreview > 0
      ? guestCountPreview
      : (typeof pkg.minGuests === 'number' ? pkg.minGuests : 1);
    const estimatedTotalPrice = effectivePricePerPerson * previewCount;

    const addOns = this._getFromStorage('add_ons').filter(function (a) {
      if (a.isActive === false) return false;
      if (!a.applicablePackageCategoryCode) return true;
      if (a.applicablePackageCategoryCode === 'all_events') return true;
      return a.applicablePackageCategoryCode === pkg.categoryCode;
    });

    // Instrumentation for task completion tracking (task_3)
    try {
      if (pkg && pkg.categoryCode === 'parties_birthdays' && pkg.includesDessert === true) {
        const key = 'task3_comparedPackageIds';
        let existing = localStorage.getItem(key);
        let arr;
        if (existing) {
          try {
            const parsed = JSON.parse(existing);
            arr = Array.isArray(parsed) ? parsed : [];
          } catch (e) {
            arr = [];
          }
        } else {
          arr = [];
        }
        if (arr.indexOf(packageId) === -1) {
          arr.push(packageId);
          localStorage.setItem(key, JSON.stringify(arr));
        }
      }
    } catch (e) {
      console.error('Instrumentation error (task_3):', e);
    }

    return {
      package: pkg,
      guestCountPreview: previewCount,
      effectivePricePerPerson: effectivePricePerPerson,
      estimatedTotalPrice: estimatedTotalPrice,
      menuSections: menuSections,
      availableAddOns: addOns,
      allowsMenuCustomization: pkg.allowsMenuCustomization === true,
      allowsDateSelection: pkg.allowsDateSelection === true,
      allowsAddOns: pkg.allowsAddOns === true
    };
  }

  // addPackageToCart(...)
  addPackageToCart(packageId, guestCount, eventDate, selectedDishIds, selectedAddonIds, customDisplayName) {
    const packages = this._getFromStorage('packages');
    const pkg = packages.find(function (p) { return p.id === packageId; }) || null;
    if (!pkg) {
      return { success: false, cart: null, addedItem: null, message: 'Package not found' };
    }

    const gc = typeof guestCount === 'number' && guestCount > 0 ? guestCount : 0;
    if (gc <= 0) {
      return { success: false, cart: null, addedItem: null, message: 'Invalid guest count' };
    }

    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items');

    const sections = this._getFromStorage('package_menu_sections').filter(function (s) {
      return s.packageId === pkg.id;
    });
    const menuItemsAll = this._getFromStorage('package_menu_items');

    let additionalPerPersonFromDishes = 0;
    const dishIdSet = new Set(Array.isArray(selectedDishIds) ? selectedDishIds : []);

    if (dishIdSet.size > 0) {
      for (let i = 0; i < sections.length; i++) {
        const section = sections[i];
        const sectionItems = menuItemsAll.filter(function (mi) {
          return mi.packageMenuSectionId === section.id;
        });
        for (let j = 0; j < sectionItems.length; j++) {
          const mi = sectionItems[j];
          if (dishIdSet.has(mi.dishId) && typeof mi.additionalPricePerPerson === 'number') {
            additionalPerPersonFromDishes += mi.additionalPricePerPerson;
          }
        }
      }
    }

    const addOns = this._getFromStorage('add_ons');
    const selectedAddOns = Array.isArray(selectedAddonIds)
      ? addOns.filter(function (a) { return selectedAddonIds.indexOf(a.id) !== -1; })
      : [];

    let perPersonPrice = typeof pkg.basePricePerPerson === 'number'
      ? pkg.basePricePerPerson
      : (typeof pkg.minPricePerPerson === 'number' ? pkg.minPricePerPerson : 0);

    perPersonPrice += additionalPerPersonFromDishes;

    let fixedFeeTotal = 0;
    for (let i = 0; i < selectedAddOns.length; i++) {
      const ao = selectedAddOns[i];
      if (ao.isPaid === false) continue;
      if (ao.priceType === 'per_person') {
        perPersonPrice += ao.price || 0;
      } else if (ao.priceType === 'fixed_fee') {
        fixedFeeTotal += ao.price || 0;
      }
    }

    const lineSubtotal = perPersonPrice * gc + fixedFeeTotal;

    const now = new Date().toISOString();
    const cartItem = {
      id: this._generateId('cart_item'),
      cartId: cart.id,
      itemType: 'package',
      packageId: pkg.id,
      customMenuId: null,
      name: customDisplayName || pkg.name || 'Package',
      guestCount: gc,
      eventDate: eventDate ? new Date(eventDate).toISOString() : null,
      perPersonPrice: perPersonPrice,
      lineSubtotal: lineSubtotal,
      selectedDishIds: Array.isArray(selectedDishIds) ? selectedDishIds.slice() : [],
      selectedAddonIds: Array.isArray(selectedAddonIds) ? selectedAddonIds.slice() : [],
      notes: '',
      createdAt: now,
      updatedAt: now
    };

    cartItems.push(cartItem);

    const carts = this._getFromStorage('cart');
    let updatedCart = cart;
    if (!Array.isArray(carts) || carts.length === 0) {
      this._saveToStorage('cart', [cart]);
    } else {
      const idx = carts.findIndex(function (c) { return c.id === cart.id; });
      if (idx >= 0) {
        if (!Array.isArray(carts[idx].items)) {
          carts[idx].items = [];
        }
        carts[idx].items.push(cartItem.id);
        carts[idx].updatedAt = now;
        updatedCart = carts[idx];
        this._saveToStorage('cart', carts);
      } else {
        cart.items = [cartItem.id];
        this._saveToStorage('cart', [cart]);
      }
    }

    this._saveToStorage('cart_items', cartItems);
    updatedCart = this._recalculateCartTotals(updatedCart, cartItems);

    return {
      success: true,
      cart: updatedCart,
      addedItem: cartItem,
      message: 'Package added to cart'
    };
  }

  // initQuoteRequestFromPackage(...)
  initQuoteRequestFromPackage(packageId, guestCount, selectedAddonIds, eventDate) {
    const packages = this._getFromStorage('packages');
    const pkg = packages.find(function (p) { return p.id === packageId; }) || null;
    const addOns = this._getFromStorage('add_ons');
    const selectedAddOns = Array.isArray(selectedAddonIds)
      ? addOns.filter(function (a) { return selectedAddonIds.indexOf(a.id) !== -1; })
      : [];

    let minPer = 0;
    let maxPer = 0;
    if (pkg) {
      minPer = typeof pkg.minPricePerPerson === 'number'
        ? pkg.minPricePerPerson
        : (typeof pkg.basePricePerPerson === 'number' ? pkg.basePricePerPerson : 0);
      maxPer = typeof pkg.maxPricePerPerson === 'number'
        ? pkg.maxPricePerPerson
        : minPer;
    }

    for (let i = 0; i < selectedAddOns.length; i++) {
      const ao = selectedAddOns[i];
      if (ao.priceType === 'per_person') {
        minPer += ao.price || 0;
        maxPer += ao.price || 0;
      }
    }

    return {
      package: pkg,
      guestCount: guestCount,
      selectedAddOns: selectedAddOns,
      eventDate: eventDate || null,
      estimatedPricePerPersonMin: minPer,
      estimatedPricePerPersonMax: maxPer
    };
  }

  // submitQuoteRequest(...)
  submitQuoteRequest(
    packageId,
    guestCount,
    selectedAddonIds,
    eventDate,
    contactName,
    contactEmail,
    contactPhone,
    additionalNotes
  ) {
    const packages = this._getFromStorage('packages');
    const pkg = packages.find(function (p) { return p.id === packageId; }) || null;
    if (!pkg) {
      return { success: false, quoteRequest: null, message: 'Package not found' };
    }

    const gc = typeof guestCount === 'number' && guestCount > 0 ? guestCount : 0;
    if (gc <= 0) {
      return { success: false, quoteRequest: null, message: 'Invalid guest count' };
    }

    if (!eventDate) {
      return { success: false, quoteRequest: null, message: 'Event date is required' };
    }

    if (!contactName || !contactEmail) {
      return { success: false, quoteRequest: null, message: 'Contact name and email are required' };
    }

    let quoteRequests = this._getFromStorage('quote_requests');
    if (!Array.isArray(quoteRequests)) {
      quoteRequests = [];
    }

    const now = new Date().toISOString();
    const qr = {
      id: this._generateId('quote_request'),
      packageId: pkg.id,
      packageName: pkg.name || '',
      guestCount: gc,
      selectedAddonIds: Array.isArray(selectedAddonIds) ? selectedAddonIds.slice() : [],
      eventDate: new Date(eventDate).toISOString(),
      contactName: contactName,
      contactEmail: contactEmail,
      contactPhone: contactPhone || '',
      additionalNotes: additionalNotes || '',
      status: 'submitted',
      createdAt: now,
      updatedAt: now
    };

    quoteRequests.push(qr);
    this._saveToStorage('quote_requests', quoteRequests);

    return {
      success: true,
      quoteRequest: qr,
      message: 'Quote request submitted'
    };
  }

  // getCartSummary()
  getCartSummary() {
    let carts = this._getFromStorage('cart');
    if (!Array.isArray(carts) || carts.length === 0) {
      return {
        cart: null,
        items: [],
        appliedPromoCode: null
      };
    }
    let cart = carts[0];
    let cartItems = this._getFromStorage('cart_items');

    // Ensure totals are up to date
    cart = this._recalculateCartTotals(cart, cartItems) || cart;
    carts = this._getFromStorage('cart');
    cart = carts.find(function (c) { return c.id === cart.id; }) || cart;
    cartItems = this._getFromStorage('cart_items');

    const packages = this._getFromStorage('packages');
    const customMenus = this._getFromStorage('custom_menus');

    const itemsForCart = cartItems.filter(function (ci) { return ci.cartId === cart.id; });

    const items = itemsForCart.map(function (ci) {
      const pkg = ci.itemType === 'package'
        ? (packages.find(function (p) { return p.id === ci.packageId; }) || null)
        : null;
      const cm = ci.itemType === 'custom_menu'
        ? (customMenus.find(function (m) { return m.id === ci.customMenuId; }) || null)
        : null;

      // Enrich CartItem with resolved foreign keys as per requirement
      const enrichedItem = Object.assign({}, ci, {
        cart: cart,
        package: pkg,
        customMenu: cm
      });

      return {
        item: enrichedItem,
        package: pkg,
        customMenu: cm
      };
    });

    let appliedPromoCode = null;
    if (cart.appliedPromoCode) {
      const promoCodes = this._getFromStorage('promo_codes');
      appliedPromoCode = promoCodes.find(function (p) {
        return (p.code || '').toLowerCase() === cart.appliedPromoCode.toLowerCase();
      }) || null;
    }

    return {
      cart: cart,
      items: items,
      appliedPromoCode: appliedPromoCode
    };
  }

  // updateCartItemGuestCount(cartItemId, guestCount)
  updateCartItemGuestCount(cartItemId, guestCount) {
    const gc = typeof guestCount === 'number' && guestCount > 0 ? guestCount : 0;
    if (gc <= 0) {
      return { success: false, cart: null, updatedItem: null };
    }

    let cartItems = this._getFromStorage('cart_items');
    const idx = cartItems.findIndex(function (ci) { return ci.id === cartItemId; });
    if (idx < 0) {
      return { success: false, cart: null, updatedItem: null };
    }

    const ci = cartItems[idx];

    let perPersonPrice = ci.perPersonPrice;
    let fixedFeeTotal = 0;

    if (ci.itemType === 'package' && ci.packageId) {
      const packages = this._getFromStorage('packages');
      const pkg = packages.find(function (p) { return p.id === ci.packageId; }) || null;
      if (pkg) {
        const basePrice = typeof pkg.basePricePerPerson === 'number'
          ? pkg.basePricePerPerson
          : (typeof pkg.minPricePerPerson === 'number' ? pkg.minPricePerPerson : 0);
        perPersonPrice = basePrice;

        const addOns = this._getFromStorage('add_ons');
        const selectedAddOns = Array.isArray(ci.selectedAddonIds)
          ? addOns.filter(function (a) { return ci.selectedAddonIds.indexOf(a.id) !== -1; })
          : [];

        for (let i = 0; i < selectedAddOns.length; i++) {
          const ao = selectedAddOns[i];
          if (ao.isPaid === false) continue;
          if (ao.priceType === 'per_person') {
            perPersonPrice += ao.price || 0;
          } else if (ao.priceType === 'fixed_fee') {
            fixedFeeTotal += ao.price || 0;
          }
        }
      }
    } else if (ci.itemType === 'custom_menu' && ci.customMenuId) {
      const customMenus = this._getFromStorage('custom_menus');
      const cm = customMenus.find(function (m) { return m.id === ci.customMenuId; }) || null;
      if (cm && typeof cm.pricePerPerson === 'number') {
        perPersonPrice = cm.pricePerPerson;
      }
    }

    const lineSubtotal = perPersonPrice * gc + fixedFeeTotal;

    ci.guestCount = gc;
    ci.perPersonPrice = perPersonPrice;
    ci.lineSubtotal = lineSubtotal;
    ci.updatedAt = new Date().toISOString();

    cartItems[idx] = ci;
    this._saveToStorage('cart_items', cartItems);

    const carts = this._getFromStorage('cart');
    const cart = carts.find(function (c) { return c.id === ci.cartId; }) || null;
    const updatedCart = this._recalculateCartTotals(cart, cartItems);

    return {
      success: true,
      cart: updatedCart,
      updatedItem: ci
    };
  }

  // removeCartItem(cartItemId)
  removeCartItem(cartItemId) {
    let cartItems = this._getFromStorage('cart_items');
    const idx = cartItems.findIndex(function (ci) { return ci.id === cartItemId; });
    if (idx < 0) {
      return { success: false, cart: null };
    }

    const ci = cartItems[idx];
    cartItems.splice(idx, 1);
    this._saveToStorage('cart_items', cartItems);

    let carts = this._getFromStorage('cart');
    let cart = carts.find(function (c) { return c.id === ci.cartId; }) || null;

    if (cart) {
      if (Array.isArray(cart.items)) {
        cart.items = cart.items.filter(function (id) { return id !== cartItemId; });
      }
      cart = this._recalculateCartTotals(cart, cartItems);
    }

    return {
      success: true,
      cart: cart
    };
  }

  // applyPromoCodeToCart(promoCode)
  applyPromoCodeToCart(promoCode) {
    let carts = this._getFromStorage('cart');
    if (!Array.isArray(carts) || carts.length === 0) {
      return { success: false, cart: null, appliedPromo: null, message: 'Cart not found' };
    }

    let cart = carts[0];
    const cartItems = this._getFromStorage('cart_items');

    const subtotal = cartItems
      .filter(function (ci) { return ci.cartId === cart.id; })
      .reduce(function (sum, ci) { return sum + (Number(ci.lineSubtotal) || 0); }, 0);

    const validation = this._validatePromoCode(promoCode, subtotal);
    if (!validation.success) {
      cart.appliedPromoCode = null;
      cart.promoDiscountAmount = 0;
      this._recalculateCartTotals(cart, cartItems);
      return {
        success: false,
        cart: cart,
        appliedPromo: null,
        message: validation.message
      };
    }

    cart.appliedPromoCode = validation.promo.code;
    carts[0] = cart;
    this._saveToStorage('cart', carts);

    cart = this._recalculateCartTotals(cart, cartItems);

    return {
      success: true,
      cart: cart,
      appliedPromo: validation.promo,
      message: 'Promo code applied'
    };
  }

  // getAvailabilityCalendar(month, year)
  getAvailabilityCalendar(month, year) {
    const slots = this._getFromStorage('availability_slots');
    const filtered = [];
    for (let i = 0; i < slots.length; i++) {
      const slot = slots[i];
      if (!slot.date) continue;
      const d = new Date(slot.date);
      if (d.getUTCFullYear() === year && (d.getUTCMonth() + 1) === month) {
        filtered.push(slot);
      }
    }
    return {
      month: month,
      year: year,
      slots: filtered
    };
  }

  // initBookingFromAvailabilitySlot(availabilitySlotId, guestCount)
  initBookingFromAvailabilitySlot(availabilitySlotId, guestCount) {
    const booking = this._getOrCreateBookingDraft(availabilitySlotId, guestCount);
    if (!booking) {
      return { booking: null };
    }
    const slots = this._getFromStorage('availability_slots');
    const slot = slots.find(function (s) { return s.id === booking.availabilitySlotId; }) || null;
    const enrichedBooking = Object.assign({}, booking, { availabilitySlot: slot });
    return { booking: enrichedBooking };
  }

  // getBookingDetailsForReview(bookingId)
  getBookingDetailsForReview(bookingId) {
    const bookings = this._getFromStorage('bookings');
    const booking = bookings.find(function (b) { return b.id === bookingId; }) || null;
    if (!booking) {
      return null;
    }
    const slots = this._getFromStorage('availability_slots');
    const slot = slots.find(function (s) { return s.id === booking.availabilitySlotId; }) || null;
    return Object.assign({}, booking, { availabilitySlot: slot });
  }

  // submitBookingDetails(...)
  submitBookingDetails(bookingId, eventName, eventType, contactName, contactPhone, contactEmail) {
    let bookings = this._getFromStorage('bookings');
    const idx = bookings.findIndex(function (b) { return b.id === bookingId; });
    if (idx < 0) {
      return { success: false, booking: null, message: 'Booking not found' };
    }

    const booking = bookings[idx];

    if (!eventName || !eventType || !contactName || !contactPhone) {
      return { success: false, booking: null, message: 'Missing required booking details' };
    }

    booking.eventName = eventName;
    booking.eventType = eventType;
    booking.contactName = contactName;
    booking.contactPhone = contactPhone;
    booking.contactEmail = contactEmail || '';
    booking.status = 'pending_review';
    booking.updatedAt = new Date().toISOString();

    bookings[idx] = booking;
    this._saveToStorage('bookings', bookings);

    return {
      success: true,
      booking: booking,
      message: 'Booking details submitted'
    };
  }

  // getBookingSummary(bookingId)
  getBookingSummary(bookingId) {
    const bookings = this._getFromStorage('bookings');
    const booking = bookings.find(function (b) { return b.id === bookingId; }) || null;
    if (!booking) {
      return null;
    }
    const slots = this._getFromStorage('availability_slots');
    const slot = slots.find(function (s) { return s.id === booking.availabilitySlotId; }) || null;
    return Object.assign({}, booking, { availabilitySlot: slot });
  }

  // getCustomMenuBuilderOptions(mealType)
  getCustomMenuBuilderOptions(mealType) {
    const dishes = this._getFromStorage('dishes');
    const active = dishes.filter(function (d) { return d.isActive !== false; });

    const appetizerOptions = active.filter(function (d) { return d.dishType === 'appetizer'; });
    const mainOptions = active.filter(function (d) { return d.dishType === 'main'; });
    const dessertOptions = active.filter(function (d) { return d.dishType === 'dessert'; });

    function getMinMax(list) {
      let min = null;
      let max = null;
      for (let i = 0; i < list.length; i++) {
        const price = typeof list[i].pricePerPerson === 'number' ? list[i].pricePerPerson : null;
        if (price === null) continue;
        if (min === null || price < min) min = price;
        if (max === null || price > max) max = price;
      }
      return { min: min, max: max };
    }

    const appRange = getMinMax(appetizerOptions);
    const mainRange = getMinMax(mainOptions);
    const desRange = getMinMax(dessertOptions);

    let suggestedMin = 0;
    let suggestedMax = 0;

    if (appRange.min !== null) suggestedMin += appRange.min;
    if (mainRange.min !== null) suggestedMin += mainRange.min;
    if (desRange.min !== null) suggestedMin += desRange.min;

    if (appRange.max !== null) suggestedMax += appRange.max;
    if (mainRange.max !== null) suggestedMax += mainRange.max;
    if (desRange.max !== null) suggestedMax += desRange.max;

    const suggestedBudgetPerPersonRange = {
      min: suggestedMin,
      max: suggestedMax
    };

    return {
      mealType: mealType,
      appetizerOptions: appetizerOptions,
      mainOptions: mainOptions,
      dessertOptions: dessertOptions,
      suggestedBudgetPerPersonRange: suggestedBudgetPerPersonRange
    };
  }

  // calculateCustomMenuPrice(...)
  calculateCustomMenuPrice(
    mealType,
    selectedAppetizerIds,
    selectedMainIds,
    selectedDessertIds,
    selectedOtherDishIds,
    guestCount,
    budgetPerPerson
  ) {
    return this._calculateCustomMenuPriceInternal(
      mealType,
      selectedAppetizerIds,
      selectedMainIds,
      selectedDessertIds,
      selectedOtherDishIds,
      guestCount,
      budgetPerPerson
    );
  }

  // addCustomMenuToCart(...)
  addCustomMenuToCart(
    name,
    mealType,
    selectedAppetizerIds,
    selectedMainIds,
    selectedDessertIds,
    selectedOtherDishIds,
    guestCount,
    budgetPerPerson,
    notes
  ) {
    const gc = typeof guestCount === 'number' && guestCount > 0 ? guestCount : 0;
    if (gc <= 0) {
      return { success: false, cart: null, addedItem: null, customMenu: null, message: 'Invalid guest count' };
    }

    const pricing = this._calculateCustomMenuPriceInternal(
      mealType,
      selectedAppetizerIds,
      selectedMainIds,
      selectedDessertIds,
      selectedOtherDishIds,
      gc,
      budgetPerPerson
    );

    let customMenus = this._getFromStorage('custom_menus');
    if (!Array.isArray(customMenus)) {
      customMenus = [];
    }

    const now = new Date().toISOString();
    const menuName = name || ('Custom ' + (mealType || 'Menu'));

    const customMenu = {
      id: this._generateId('custom_menu'),
      name: menuName,
      mealType: mealType,
      budgetPerPerson: budgetPerPerson,
      selectedAppetizerIds: Array.isArray(selectedAppetizerIds) ? selectedAppetizerIds.slice() : [],
      selectedMainIds: Array.isArray(selectedMainIds) ? selectedMainIds.slice() : [],
      selectedDessertIds: Array.isArray(selectedDessertIds) ? selectedDessertIds.slice() : [],
      selectedOtherDishIds: Array.isArray(selectedOtherDishIds) ? selectedOtherDishIds.slice() : [],
      guestCount: gc,
      pricePerPerson: pricing.pricePerPerson,
      totalPrice: pricing.totalPrice,
      notes: notes || '',
      createdAt: now,
      updatedAt: now
    };

    customMenus.push(customMenu);
    this._saveToStorage('custom_menus', customMenus);

    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items');

    const cartItem = {
      id: this._generateId('cart_item'),
      cartId: cart.id,
      itemType: 'custom_menu',
      packageId: null,
      customMenuId: customMenu.id,
      name: menuName,
      guestCount: gc,
      eventDate: null,
      perPersonPrice: pricing.pricePerPerson,
      lineSubtotal: pricing.totalPrice,
      selectedDishIds: [],
      selectedAddonIds: [],
      notes: notes || '',
      createdAt: now,
      updatedAt: now
    };

    cartItems.push(cartItem);
    this._saveToStorage('cart_items', cartItems);

    let carts = this._getFromStorage('cart');
    let updatedCart = cart;
    if (!Array.isArray(carts) || carts.length === 0) {
      customMenu.items = [cartItem.id];
      this._saveToStorage('cart', [cart]);
    } else {
      const idx = carts.findIndex(function (c) { return c.id === cart.id; });
      if (idx >= 0) {
        if (!Array.isArray(carts[idx].items)) {
          carts[idx].items = [];
        }
        carts[idx].items.push(cartItem.id);
        carts[idx].updatedAt = now;
        updatedCart = carts[idx];
        this._saveToStorage('cart', carts);
      } else {
        cart.items = [cartItem.id];
        this._saveToStorage('cart', [cart]);
      }
    }

    updatedCart = this._recalculateCartTotals(updatedCart, cartItems);

    return {
      success: true,
      cart: updatedCart,
      addedItem: cartItem,
      customMenu: customMenu,
      message: 'Custom menu added to cart'
    };
  }

  // getDishFilterOptions()
  getDishFilterOptions() {
    const dishes = this._getFromStorage('dishes');
    const ratingSet = new Set();
    for (let i = 0; i < dishes.length; i++) {
      if (typeof dishes[i].rating === 'number') {
        const floor = Math.floor(dishes[i].rating);
        ratingSet.add(floor);
      }
    }
    ratingSet.add(4); // ensure 4+ is always an option
    const ratingThresholds = Array.from(ratingSet).sort(function (a, b) { return a - b; });

    const dietaryFilters = ['none', 'gluten_free', 'vegetarian', 'vegan', 'other'];
    const dishTypes = ['any', 'appetizer', 'main', 'dessert', 'side', 'beverage', 'snack', 'other'];

    return {
      dietaryFilters: dietaryFilters,
      ratingThresholds: ratingThresholds,
      dishTypes: dishTypes
    };
  }

  // listDishes(...)
  listDishes(dietaryFilter, minRating, dishTypeFilter, searchQuery) {
    let dishes = this._getFromStorage('dishes');
    dishes = dishes.filter(function (d) { return d.isActive !== false; });

    if (dietaryFilter && dietaryFilter !== 'none') {
      if (dietaryFilter === 'gluten_free') {
        dishes = dishes.filter(function (d) { return d.isGlutenFree === true; });
      } else if (dietaryFilter === 'vegetarian') {
        dishes = dishes.filter(function (d) { return d.isVegetarian === true; });
      } else if (dietaryFilter === 'vegan') {
        dishes = dishes.filter(function (d) { return d.isVegan === true; });
      }
    }

    if (typeof minRating === 'number') {
      dishes = dishes.filter(function (d) {
        return typeof d.rating === 'number' ? d.rating >= minRating : false;
      });
    }

    if (dishTypeFilter && dishTypeFilter !== 'any') {
      dishes = dishes.filter(function (d) { return d.dishType === dishTypeFilter; });
    }

    if (searchQuery && searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      dishes = dishes.filter(function (d) {
        const name = (d.name || '').toLowerCase();
        const desc = (d.description || '').toLowerCase();
        return name.indexOf(q) !== -1 || desc.indexOf(q) !== -1;
      });
    }

    return dishes;
  }

  // getDishDetail(dishId)
  getDishDetail(dishId) {
    const dishes = this._getFromStorage('dishes');
    return dishes.find(function (d) { return d.id === dishId; }) || null;
  }

  // addDishToTastingList(dishId, listType)
  addDishToTastingList(dishId, listType) {
    const dishes = this._getFromStorage('dishes');
    const dish = dishes.find(function (d) { return d.id === dishId; }) || null;
    if (!dish) {
      return {
        tastingList: null,
        items: []
      };
    }

    const list = this._getOrCreateTastingList(listType || 'tasting');

    let items = this._getFromStorage('tasting_list_items');
    if (!Array.isArray(items)) {
      items = [];
    }

    const now = new Date().toISOString();
    const newItem = {
      id: this._generateId('tasting_list_item'),
      tastingListId: list.id,
      dishId: dishId,
      addedAt: now,
      notes: ''
    };
    items.push(newItem);
    this._saveToStorage('tasting_list_items', items);

    // Build enriched items for this list
    const listItems = items.filter(function (li) { return li.tastingListId === list.id; });
    const enriched = listItems.map(function (li) {
      const d = dishes.find(function (x) { return x.id === li.dishId; }) || null;
      const enrichedItem = Object.assign({}, li, {
        tastingList: list,
        dish: d
      });
      return {
        listItem: enrichedItem,
        dish: d
      };
    });

    return {
      tastingList: list,
      items: enriched
    };
  }

  // getTastingListContents(listType)
  getTastingListContents(listType) {
    const list = this._getOrCreateTastingList(listType || 'tasting');
    const items = this._getFromStorage('tasting_list_items');
    const dishes = this._getFromStorage('dishes');

    const listItems = items.filter(function (li) { return li.tastingListId === list.id; });
    const enriched = listItems.map(function (li) {
      const d = dishes.find(function (x) { return x.id === li.dishId; }) || null;
      const enrichedItem = Object.assign({}, li, {
        tastingList: list,
        dish: d
      });
      return {
        listItem: enrichedItem,
        dish: d
      };
    });

    return {
      tastingList: list,
      items: enriched
    };
  }

  // removeTastingListItem(tastingListItemId)
  removeTastingListItem(tastingListItemId) {
    let items = this._getFromStorage('tasting_list_items');
    const idx = items.findIndex(function (li) { return li.id === tastingListItemId; });
    if (idx < 0) {
      return {
        tastingList: null,
        items: []
      };
    }

    const listId = items[idx].tastingListId;
    items.splice(idx, 1);
    this._saveToStorage('tasting_list_items', items);

    const lists = this._getFromStorage('tasting_lists');
    const list = lists.find(function (l) { return l.id === listId; }) || null;
    const dishes = this._getFromStorage('dishes');

    if (!list) {
      return {
        tastingList: null,
        items: []
      };
    }

    const listItems = items.filter(function (li) { return li.tastingListId === list.id; });
    const enriched = listItems.map(function (li) {
      const d = dishes.find(function (x) { return x.id === li.dishId; }) || null;
      const enrichedItem = Object.assign({}, li, {
        tastingList: list,
        dish: d
      });
      return {
        listItem: enrichedItem,
        dish: d
      };
    });

    return {
      tastingList: list,
      items: enriched
    };
  }

  // getAboutPageContent()
  getAboutPageContent() {
    const raw = localStorage.getItem('about_page_content');
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        return parsed;
      } catch (e) {}
    }
    return {
      heading: '',
      subheading: '',
      body: '',
      specializations: [],
      awardsAndCertifications: [],
      serviceHighlights: []
    };
  }

  // getContactPageContent()
  getContactPageContent() {
    const raw = localStorage.getItem('contact_page_content');
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        return parsed;
      } catch (e) {}
    }
    return {
      phoneNumbers: [],
      emailAddresses: [],
      address: '',
      businessHours: '',
      expectedResponseTime: ''
    };
  }

  // submitContactInquiry(...)
  submitContactInquiry(name, email, phone, subject, message) {
    if (!message) {
      return { success: false, contactInquiry: null, message: 'Message is required' };
    }

    let inquiries = this._getFromStorage('contact_inquiries');
    if (!Array.isArray(inquiries)) {
      inquiries = [];
    }

    const now = new Date().toISOString();
    const inquiry = {
      id: this._generateId('contact_inquiry'),
      name: name || '',
      email: email || '',
      phone: phone || '',
      subject: subject || '',
      message: message,
      status: 'new',
      createdAt: now,
      respondedAt: null
    };

    inquiries.push(inquiry);
    this._saveToStorage('contact_inquiries', inquiries);

    return {
      success: true,
      contactInquiry: inquiry,
      message: 'Inquiry submitted'
    };
  }

  // getFAQItems(category)
  getFAQItems(category) {
    let faqs = this._getFromStorage('faq_items');
    faqs = faqs.filter(function (f) { return f.isActive !== false; });
    if (category) {
      faqs = faqs.filter(function (f) { return f.category === category; });
    }
    faqs.sort(function (a, b) {
      const ao = typeof a.displayOrder === 'number' ? a.displayOrder : 0;
      const bo = typeof b.displayOrder === 'number' ? b.displayOrder : 0;
      return ao - bo;
    });
    return faqs;
  }

  // listPolicyPages()
  listPolicyPages() {
    const policies = this._getFromStorage('policy_pages');
    const active = policies.filter(function (p) { return p.isActive !== false; });
    return active.map(function (p) {
      const content = p.content || '';
      const summary = content.length > 200 ? (content.slice(0, 197) + '...') : content;
      return {
        policy: p,
        summary: summary
      };
    });
  }

  // getPolicyPage(policyId, type)
  getPolicyPage(policyId, type) {
    const policies = this._getFromStorage('policy_pages');
    let policy = null;
    if (policyId) {
      policy = policies.find(function (p) { return p.id === policyId; }) || null;
    } else if (type) {
      policy = policies.find(function (p) { return p.type === type; }) || null;
    }
    return policy;
  }
}

// Expose for browser and Node.js
if (typeof globalThis !== 'undefined') {
  globalThis.BusinessLogic = BusinessLogic;
  globalThis.WebsiteSDK = new BusinessLogic();
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = BusinessLogic;
}