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

  // -------------------- STORAGE SETUP --------------------

  _initStorage() {
    const keys = [
      'container_types',
      'move_quotes',
      'delivery_window_options',
      'protection_plans',
      'packing_supply_products',
      'packing_supply_selections',
      'move_orders',
      'cart',
      'cart_items',
      'storage_locations',
      'storage_units',
      'storage_unit_comparisons',
      'storage_unit_reservations',
      'space_calculator_configs',
      'space_calculator_rooms',
      'space_calculator_items',
      'space_calculator_recommendations',
      'promotions',
      'help_articles',
      'support_contact_options',
      'live_chat_sessions',
      'live_chat_messages',
      'portable_storage_bookings'
    ];

    keys.forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    });

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key) {
    const data = localStorage.getItem(key);
    try {
      return data ? JSON.parse(data) : [];
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

  // -------------------- HELPER: CART --------------------

  _getActiveCart() {
    const carts = this._getFromStorage('cart');
    return carts.find((c) => c.status === 'active') || null;
  }

  _getOrCreateCart() {
    let carts = this._getFromStorage('cart');
    let cart = carts.find((c) => c.status === 'active');
    if (!cart) {
      cart = {
        id: this._generateId('cart'),
        status: 'active',
        createdAt: this._now(),
        updatedAt: this._now()
      };
      carts.push(cart);
      this._saveToStorage('cart', carts);
    }
    return cart;
  }

  _buildCartSummary(cartId) {
    const carts = this._getFromStorage('cart');
    const cart = carts.find((c) => c.id === cartId) || null;
    if (!cart) {
      return {
        cartId: null,
        status: 'empty',
        itemCount: 0,
        totalPrice: 0,
        items: []
      };
    }
    const cartItems = this._getFromStorage('cart_items').filter((ci) => ci.cartId === cart.id);
    let total = 0;
    cartItems.forEach((ci) => {
      total += Number(ci.totalPrice || 0);
    });

    // Foreign key resolution for CartItem: cartId -> cart, itemId -> referenced item
    const moveOrders = this._getFromStorage('move_orders');
    const portableBookings = this._getFromStorage('portable_storage_bookings');
    const storageReservations = this._getFromStorage('storage_unit_reservations');

    const resolvedItems = cartItems.map((ci) => {
      let item = null;
      if (ci.itemType === 'move_order') {
        item = moveOrders.find((m) => m.id === ci.itemId) || null;
      } else if (ci.itemType === 'portable_storage_booking') {
        item = portableBookings.find((b) => b.id === ci.itemId) || null;
      } else if (ci.itemType === 'storage_unit_reservation') {
        item = storageReservations.find((r) => r.id === ci.itemId) || null;
      }
      return {
        ...ci,
        cart,
        item
      };
    });

    return {
      cartId: cart.id,
      status: cart.status,
      itemCount: resolvedItems.length,
      totalPrice: total,
      items: resolvedItems
    };
  }

  // -------------------- HELPER: MOVE QUOTE PRICING --------------------

  _recalculateMoveQuotePricing(moveQuote) {
    if (!moveQuote) return moveQuote;
    const containerTypes = this._getFromStorage('container_types');
    const protectionPlans = this._getFromStorage('protection_plans');

    const containerType = containerTypes.find((ct) => ct.id === moveQuote.containerTypeId) || null;
    const protectionPlan = moveQuote.protectionPlanId
      ? protectionPlans.find((p) => p.id === moveQuote.protectionPlanId) || null
      : null;

    const baseMoveFeePerContainer = containerType && typeof containerType.baseMoveFee === 'number'
      ? containerType.baseMoveFee
      : 0;

    const containerQty = Number(moveQuote.containerQuantity || 0);
    const basePrice = baseMoveFeePerContainer * containerQty;

    const suppliesSubtotal = Number(moveQuote.suppliesSubtotal || 0);

    const protectionPricePerContainer = protectionPlan && typeof protectionPlan.pricePerContainer === 'number'
      ? protectionPlan.pricePerContainer
      : 0;
    const protectionTotal = protectionPricePerContainer * containerQty;

    const discountAmount = Number(moveQuote.discountAmount || 0);

    moveQuote.basePrice = basePrice;
    const totalBeforeDiscount = basePrice + suppliesSubtotal + protectionTotal;
    moveQuote.totalPrice = Math.max(0, totalBeforeDiscount - discountAmount);

    return moveQuote;
  }

  // -------------------- HELPER: PORTABLE STORAGE PRICING --------------------

  _diffDays(startDateIso, endDateIso) {
    if (!startDateIso || !endDateIso) return 0;
    const start = new Date(startDateIso.split('T')[0]);
    const end = new Date(endDateIso.split('T')[0]);
    const msPerDay = 24 * 60 * 60 * 1000;
    return Math.max(0, Math.round((end - start) / msPerDay));
  }

  _recalculatePortableStoragePricing(booking) {
    if (!booking) return booking;

    const containerTypes = this._getFromStorage('container_types');
    const containerType = containerTypes.find((ct) => ct.id === booking.containerTypeId) || null;

    const monthlyFeeBase = containerType && typeof containerType.baseMonthlyStorageFee === 'number'
      ? containerType.baseMonthlyStorageFee
      : Number(booking.monthlyStorageFee || 0);

    const containerQty = Number(booking.containerQuantity || 1);

    // Determine duration in days, default to 30 if both dates exist and diff is 0
    const days = this._diffDays(booking.dropoffDate, booking.pickupDate) || 30;
    const monthsFraction = days / 30;

    const monthlyStorageForDuration = monthlyFeeBase * monthsFraction;

    // Base delivery fee (can vary by speed)
    let baseDeliveryFee = 0;
    if (typeof booking.baseDeliveryFee === 'number') {
      baseDeliveryFee = booking.baseDeliveryFee;
    } else {
      // simple default based on deliverySpeed
      if (booking.deliverySpeed === 'express_delivery_1_2_days') {
        baseDeliveryFee = 150;
      } else if (booking.deliverySpeed === 'economy_delivery_5_7_days') {
        baseDeliveryFee = 75;
      } else {
        baseDeliveryFee = 100;
      }
    }

    const totalPerContainer = monthlyStorageForDuration + baseDeliveryFee;
    const total = totalPerContainer * containerQty;

    booking.monthlyStorageFee = monthlyFeeBase;
    booking.baseDeliveryFee = baseDeliveryFee;
    booking.totalPrice = total;

    return booking;
  }

  // -------------------- HELPER: CHEAPEST DELIVERY WINDOW --------------------

  _findCheapestDeliveryWindow(options) {
    if (!Array.isArray(options) || options.length === 0) return options;
    let cheapestIndex = 0;
    let cheapestPrice = Number(options[0].totalPrice || options[0].price || 0);
    options.forEach((opt, idx) => {
      const price = Number(opt.totalPrice || opt.price || 0);
      if (price < cheapestPrice) {
        cheapestPrice = price;
        cheapestIndex = idx;
      }
    });
    return options.map((opt, idx) => ({
      ...opt,
      isCheapest: idx === cheapestIndex
    }));
  }

  // -------------------- HELPER: PROMO VALIDATION --------------------

  _validatePromoCodeForQuote(moveQuote, promoCode) {
    const promotions = this._getFromStorage('promotions');
    if (!promoCode) {
      return { success: false, message: 'No promo code provided.', promotion: null, discountAmount: 0 };
    }
    const codeUpper = String(promoCode).trim().toUpperCase();
    const promotion = promotions.find((p) => String(p.promoCode || '').toUpperCase() === codeUpper) || null;
    if (!promotion) {
      return { success: false, message: 'Promo code not found.', promotion: null, discountAmount: 0 };
    }

    if (promotion.status !== 'active') {
      return { success: false, message: 'Promo code is not active.', promotion: null, discountAmount: 0 };
    }

    const now = new Date();
    if (promotion.startDate) {
      const start = new Date(promotion.startDate);
      if (now < start) {
        return { success: false, message: 'Promo code is not yet valid.', promotion: null, discountAmount: 0 };
      }
    }
    if (promotion.endDate) {
      const end = new Date(promotion.endDate);
      if (now > end) {
        return { success: false, message: 'Promo code has expired.', promotion: null, discountAmount: 0 };
      }
    }

    const baseAmount = Number(moveQuote.basePrice || 0);
    if (promotion.minOrderAmount && baseAmount < promotion.minOrderAmount) {
      return { success: false, message: 'Order amount does not meet promotion minimum.', promotion: null, discountAmount: 0 };
    }

    let discountAmount = 0;
    if (promotion.discountType === 'percent') {
      discountAmount = (baseAmount * Number(promotion.discountValue || 0)) / 100;
    } else if (promotion.discountType === 'fixed_amount') {
      discountAmount = Number(promotion.discountValue || 0);
    }

    discountAmount = Math.min(discountAmount, baseAmount);

    return { success: true, message: 'Promo code applied.', promotion, discountAmount };
  }

  // -------------------- HELPER: SPACE CALCULATOR --------------------

  _getVolumeForItemType(itemType) {
    // Rough volume estimates in cubic feet
    const map = {
      twin_bed: 40,
      full_bed: 50,
      queen_bed: 60,
      king_bed: 70,
      dresser: 30,
      small_box: 2,
      medium_box: 3,
      large_box: 4,
      sofa: 60,
      table: 25,
      chair: 10
    };
    return map[itemType] || 5;
  }

  // =============================================================
  // INTERFACE IMPLEMENTATIONS
  // =============================================================

  // ------------- Homepage & Content -------------

  getHomePageContent() {
    const promotions = this._getFromStorage('promotions');
    const featuredPromotions = promotions.filter((p) => p.status === 'active');

    return {
      heroTitle: 'Flexible Moving & Portable Storage Solutions',
      heroSubtitle: 'Local moves, long-distance relocations, and secure storage — all with portable containers delivered to your door.',
      primaryServices: [
        {
          key: 'local_moves',
          title: 'Local Moves',
          description: 'Move across town with flexible delivery windows and portable containers you can load at your own pace.',
          callToActionLabel: 'Get a local move quote'
        },
        {
          key: 'long_distance_moves',
          title: 'Long-Distance Moves',
          description: 'Ship your container cross-country with transparent pricing and optional packing supplies.',
          callToActionLabel: 'Plan a long-distance move'
        },
        {
          key: 'portable_storage',
          title: 'Portable Storage',
          description: 'Keep a container at your home or at one of our secure facilities for as long as you need.',
          callToActionLabel: 'Schedule portable storage'
        },
        {
          key: 'storage_solutions',
          title: 'Storage Solutions',
          description: 'Choose from a variety of storage unit sizes with 24/7 access at select locations.',
          callToActionLabel: 'Find storage near you'
        }
      ],
      featuredPromotions
    };
  }

  getMovingServicesPageContent() {
    return {
      sections: [
        {
          id: 'local',
          title: 'Local Moving Services',
          body: 'Our local move containers are ideal for moves within the same city. Choose your move date, number of containers, and delivery window to fit your schedule.'
        },
        {
          id: 'long_distance',
          title: 'Long-Distance Moving Services',
          body: 'For cross-country or interstate moves, we provide door-to-door container delivery with optional packing supplies and flexible delivery dates.'
        }
      ]
    };
  }

  // ------------- Move Quote Form & Creation -------------

  getMoveQuoteFormConfig() {
    const containerTypes = this._getFromStorage('container_types').filter((ct) => ct.isActive !== false);
    return {
      availableMoveTypes: [
        {
          value: 'local',
          label: 'Local move (within the same city)',
          description: 'Perfect for moving across town or within the same metro area.'
        },
        {
          value: 'long_distance',
          label: 'Long-distance move',
          description: 'For cross-country or interstate moves with container delivery.'
        }
      ],
      defaultMoveDateOffsetDays: 7,
      containerTypeOptions: containerTypes
    };
  }

  createMoveQuoteFromForm(moveType, originZip, destinationZip, moveDate, containerTypeId, containerQuantity, existingMoveQuoteId) {
    const move_quotes = this._getFromStorage('move_quotes');
    const containerTypes = this._getFromStorage('container_types').filter((ct) => ct.isActive !== false);

    let containerTypeIdToUse = containerTypeId;
    if (!containerTypeIdToUse && containerTypes.length > 0) {
      containerTypeIdToUse = containerTypes[0].id;
    }

    const quantity = Number(containerQuantity || 0);
    let moveQuote;

    if (existingMoveQuoteId) {
      const idx = move_quotes.findIndex((mq) => mq.id === existingMoveQuoteId);
      if (idx === -1) {
        throw new Error('Move quote not found: ' + existingMoveQuoteId);
      }
      moveQuote = {
        ...move_quotes[idx],
        moveType,
        originZip,
        destinationZip,
        moveDate,
        containerTypeId: containerTypeIdToUse,
        containerQuantity: quantity,
        updatedAt: this._now()
      };
      this._recalculateMoveQuotePricing(moveQuote);
      move_quotes[idx] = moveQuote;
    } else {
      moveQuote = {
        id: this._generateId('mq'),
        moveType,
        originZip,
        destinationZip,
        moveDate,
        containerTypeId: containerTypeIdToUse,
        containerQuantity: quantity,
        containerDeliveryDate: null,
        basePrice: 0,
        suppliesSubtotal: 0,
        protectionPlanId: null,
        promoCode: null,
        promotionId: null,
        discountAmount: 0,
        totalPrice: 0,
        status: 'in_progress',
        createdAt: this._now(),
        updatedAt: this._now()
      };
      this._recalculateMoveQuotePricing(moveQuote);
      move_quotes.push(moveQuote);
    }

    this._saveToStorage('move_quotes', move_quotes);
    return moveQuote;
  }

  // ------------- Delivery Windows -------------

  getDeliveryWindowSortOptions() {
    return [
      {
        value: 'total_price_low_to_high',
        label: 'Total price: Low to High'
      },
      {
        value: 'time_earliest_first',
        label: 'Earliest arrival first'
      }
    ];
  }

  getDeliveryWindowOptionsForQuote(moveQuoteId, sortBy) {
    const move_quotes = this._getFromStorage('move_quotes');
    const moveQuote = move_quotes.find((mq) => mq.id === moveQuoteId) || null;
    if (!moveQuote) {
      return [];
    }

    let options = this._getFromStorage('delivery_window_options').filter((o) => o.moveQuoteId === moveQuoteId);

    if (options.length === 0) {
      const baseDate = moveQuote.moveDate || new Date().toISOString().split('T')[0];
      const dateOnly = baseDate.split('T')[0];

      const mkDateTime = (dateStr, timeStr) => `${dateStr}T${timeStr}:00.000Z`;

      const baseTotal = Number(moveQuote.totalPrice || moveQuote.basePrice || 0);

      options = [
        {
          id: this._generateId('dwo'),
          moveQuoteId,
          windowType: 'morning',
          startDateTime: mkDateTime(dateOnly, '08:00'),
          endDateTime: mkDateTime(dateOnly, '12:00'),
          price: 0,
          totalPrice: baseTotal,
          isCheapest: false,
          isSelected: false
        },
        {
          id: this._generateId('dwo'),
          moveQuoteId,
          windowType: 'afternoon',
          startDateTime: mkDateTime(dateOnly, '12:00'),
          endDateTime: mkDateTime(dateOnly, '16:00'),
          price: 20,
          totalPrice: baseTotal + 20,
          isCheapest: false,
          isSelected: false
        },
        {
          id: this._generateId('dwo'),
          moveQuoteId,
          windowType: 'evening',
          startDateTime: mkDateTime(dateOnly, '16:00'),
          endDateTime: mkDateTime(dateOnly, '20:00'),
          price: 30,
          totalPrice: baseTotal + 30,
          isCheapest: false,
          isSelected: false
        },
        {
          id: this._generateId('dwo'),
          moveQuoteId,
          windowType: 'full_day',
          startDateTime: mkDateTime(dateOnly, '08:00'),
          endDateTime: mkDateTime(dateOnly, '20:00'),
          price: 10,
          totalPrice: baseTotal + 10,
          isCheapest: false,
          isSelected: false
        }
      ];

      options = this._findCheapestDeliveryWindow(options);

      const allOptions = this._getFromStorage('delivery_window_options');
      const updatedAll = allOptions.concat(options);
      this._saveToStorage('delivery_window_options', updatedAll);
    } else {
      options = this._findCheapestDeliveryWindow(options);
      // persist cheapest flags
      const allOptions = this._getFromStorage('delivery_window_options');
      const updatedAll = allOptions.map((o) => {
        const updated = options.find((u) => u.id === o.id);
        return updated || o;
      });
      this._saveToStorage('delivery_window_options', updatedAll);
    }

    if (sortBy === 'total_price_low_to_high') {
      options.sort((a, b) => Number(a.totalPrice || 0) - Number(b.totalPrice || 0));
    } else if (sortBy === 'time_earliest_first') {
      options.sort((a, b) => new Date(a.startDateTime) - new Date(b.startDateTime));
    }

    // Foreign key resolution: moveQuoteId -> moveQuote
    return options.map((o) => ({
      ...o,
      moveQuote
    }));
  }

  chooseDeliveryWindowForQuote(moveQuoteId, deliveryWindowOptionId, addToCart) {
    const move_quotes = this._getFromStorage('move_quotes');
    const optionsAll = this._getFromStorage('delivery_window_options');

    const moveQuoteIdx = move_quotes.findIndex((mq) => mq.id === moveQuoteId);
    if (moveQuoteIdx === -1) {
      return { success: false, message: 'Move quote not found.', moveQuote: null, selectedDeliveryWindow: null, moveOrder: null };
    }
    const moveQuote = move_quotes[moveQuoteIdx];

    const relevantOptions = optionsAll.filter((o) => o.moveQuoteId === moveQuoteId);
    if (relevantOptions.length === 0) {
      return { success: false, message: 'No delivery window options available.', moveQuote: null, selectedDeliveryWindow: null, moveOrder: null };
    }

    let selectedOption = null;
    const updatedOptionsAll = optionsAll.map((o) => {
      if (o.moveQuoteId !== moveQuoteId) return o;
      const updated = { ...o, isSelected: o.id === deliveryWindowOptionId };
      if (updated.isSelected) {
        selectedOption = updated;
      }
      return updated;
    });

    if (!selectedOption) {
      return { success: false, message: 'Delivery window option not found.', moveQuote: null, selectedDeliveryWindow: null, moveOrder: null };
    }

    // Refresh cheapest flag for this quote's options
    const quoteOptions = updatedOptionsAll.filter((o) => o.moveQuoteId === moveQuoteId);
    const recalcedQuoteOptions = this._findCheapestDeliveryWindow(quoteOptions);
    const finalOptionsAll = updatedOptionsAll.map((o) => {
      if (o.moveQuoteId !== moveQuoteId) return o;
      const upd = recalcedQuoteOptions.find((x) => x.id === o.id);
      return upd || o;
    });

    this._saveToStorage('delivery_window_options', finalOptionsAll);

    // Create MoveOrder
    const move_orders = this._getFromStorage('move_orders');
    const moveOrder = {
      id: this._generateId('mo'),
      sourceMoveQuoteId: moveQuote.id,
      moveType: moveQuote.moveType,
      originZip: moveQuote.originZip,
      destinationZip: moveQuote.destinationZip,
      moveDate: moveQuote.moveDate,
      containerTypeId: moveQuote.containerTypeId,
      containerQuantity: moveQuote.containerQuantity,
      containerDeliveryDate: moveQuote.containerDeliveryDate || null,
      deliveryWindowId: selectedOption.id,
      protectionPlanId: moveQuote.protectionPlanId || null,
      promotionId: moveQuote.promotionId || null,
      basePrice: moveQuote.basePrice,
      suppliesSubtotal: moveQuote.suppliesSubtotal || 0,
      discountAmount: moveQuote.discountAmount || 0,
      totalPrice: Number(moveQuote.totalPrice || 0) + Number(selectedOption.price || 0),
      createdAt: this._now()
    };

    move_orders.push(moveOrder);
    this._saveToStorage('move_orders', move_orders);

    let cartSummary = null;
    if (addToCart) {
      const cart = this._getOrCreateCart();
      const cart_items = this._getFromStorage('cart_items');
      const description = `Move (${moveOrder.moveType}) ${moveOrder.originZip} to ${moveOrder.destinationZip} - ${moveOrder.containerQuantity} container(s)`;
      const cartItem = {
        id: this._generateId('ci'),
        cartId: cart.id,
        itemType: 'move_order',
        itemId: moveOrder.id,
        description,
        quantity: 1,
        unitPrice: moveOrder.totalPrice,
        totalPrice: moveOrder.totalPrice,
        createdAt: this._now()
      };
      cart_items.push(cartItem);
      this._saveToStorage('cart_items', cart_items);

      cart.updatedAt = this._now();
      const carts = this._getFromStorage('cart');
      const cartIdx = carts.findIndex((c) => c.id === cart.id);
      if (cartIdx !== -1) {
        carts[cartIdx] = cart;
        this._saveToStorage('cart', carts);
      }

      cartSummary = this._buildCartSummary(cart.id);
    }

    const finalSelected = finalOptionsAll.find((o) => o.id === selectedOption.id);

    return {
      success: true,
      message: 'Delivery window selected.',
      moveQuote,
      selectedDeliveryWindow: finalSelected,
      moveOrder,
      cartSummary
    };
  }

  // ------------- Packing Supplies -------------

  getPackingSuppliesSortOptions() {
    return [
      { value: 'price_low_to_high', label: 'Price: Low to High' },
      { value: 'price_high_to_low', label: 'Price: High to Low' },
      { value: 'name_a_to_z', label: 'Name: A to Z' }
    ];
  }

  getPackingSuppliesList(sortBy, productType, maxPrice) {
    let products = this._getFromStorage('packing_supply_products').filter((p) => p.isActive !== false);

    if (productType) {
      products = products.filter((p) => p.productType === productType);
    }
    if (typeof maxPrice === 'number') {
      products = products.filter((p) => Number(p.price || 0) <= maxPrice);
    }

    if (sortBy === 'price_low_to_high') {
      products.sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
    } else if (sortBy === 'price_high_to_low') {
      products.sort((a, b) => Number(b.price || 0) - Number(a.price || 0));
    } else if (sortBy === 'name_a_to_z') {
      products.sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
    }

    return products;
  }

  addPackingSupplyToMoveQuote(moveQuoteId, packingSupplyProductId, quantity) {
    const move_quotes = this._getFromStorage('move_quotes');
    const moveQuoteIdx = move_quotes.findIndex((mq) => mq.id === moveQuoteId);
    if (moveQuoteIdx === -1) {
      throw new Error('Move quote not found: ' + moveQuoteId);
    }
    const moveQuote = move_quotes[moveQuoteIdx];

    const products = this._getFromStorage('packing_supply_products');
    const product = products.find((p) => p.id === packingSupplyProductId) || null;
    if (!product) {
      throw new Error('Packing supply product not found: ' + packingSupplyProductId);
    }

    const selections = this._getFromStorage('packing_supply_selections');
    const qty = Number(quantity || 1);
    const linePrice = Number(product.price || 0) * qty;

    const selection = {
      id: this._generateId('pss'),
      packingSupplyProductId: product.id,
      moveQuoteId: moveQuote.id,
      moveOrderId: null,
      quantity: qty,
      linePrice
    };

    selections.push(selection);
    this._saveToStorage('packing_supply_selections', selections);

    const relatedSelections = selections.filter((s) => s.moveQuoteId === moveQuote.id);
    const suppliesSubtotal = relatedSelections.reduce((sum, s) => sum + Number(s.linePrice || 0), 0);
    moveQuote.suppliesSubtotal = suppliesSubtotal;
    this._recalculateMoveQuotePricing(moveQuote);
    move_quotes[moveQuoteIdx] = moveQuote;
    this._saveToStorage('move_quotes', move_quotes);

    const detailedSelections = relatedSelections.map((s) => ({
      selection: s,
      product: products.find((p) => p.id === s.packingSupplyProductId) || null
    }));

    return {
      moveQuote,
      selections: detailedSelections
    };
  }

  removePackingSupplyFromMoveQuote(packingSupplySelectionId) {
    const selections = this._getFromStorage('packing_supply_selections');
    const idx = selections.findIndex((s) => s.id === packingSupplySelectionId);
    if (idx === -1) {
      throw new Error('Packing supply selection not found: ' + packingSupplySelectionId);
    }
    const selection = selections[idx];
    const moveQuoteId = selection.moveQuoteId;

    selections.splice(idx, 1);
    this._saveToStorage('packing_supply_selections', selections);

    const move_quotes = this._getFromStorage('move_quotes');
    const mqIdx = move_quotes.findIndex((mq) => mq.id === moveQuoteId);
    if (mqIdx === -1) {
      throw new Error('Move quote not found: ' + moveQuoteId);
    }
    const moveQuote = move_quotes[mqIdx];

    const remainingSelections = selections.filter((s) => s.moveQuoteId === moveQuoteId);
    const suppliesSubtotal = remainingSelections.reduce((sum, s) => sum + Number(s.linePrice || 0), 0);
    moveQuote.suppliesSubtotal = suppliesSubtotal;
    this._recalculateMoveQuotePricing(moveQuote);
    move_quotes[mqIdx] = moveQuote;
    this._saveToStorage('move_quotes', move_quotes);

    const products = this._getFromStorage('packing_supply_products');
    const detailedRemaining = remainingSelections.map((s) => ({
      selection: s,
      product: products.find((p) => p.id === s.packingSupplyProductId) || null
    }));

    return {
      moveQuote,
      remainingSelections: detailedRemaining
    };
  }

  updateMoveQuoteContainerDeliveryDate(moveQuoteId, containerDeliveryDate) {
    const move_quotes = this._getFromStorage('move_quotes');
    const idx = move_quotes.findIndex((mq) => mq.id === moveQuoteId);
    if (idx === -1) {
      throw new Error('Move quote not found: ' + moveQuoteId);
    }
    const moveQuote = {
      ...move_quotes[idx],
      containerDeliveryDate,
      updatedAt: this._now()
    };
    move_quotes[idx] = moveQuote;
    this._saveToStorage('move_quotes', move_quotes);
    return moveQuote;
  }

  getMoveQuoteSummary(moveQuoteId) {
    const move_quotes = this._getFromStorage('move_quotes');
    const moveQuote = move_quotes.find((mq) => mq.id === moveQuoteId) || null;
    if (!moveQuote) {
      return {
        moveQuote: null,
        containerType: null,
        protectionPlan: null,
        appliedPromotion: null,
        packingSupplies: []
      };
    }

    const containerTypes = this._getFromStorage('container_types');
    const protectionPlans = this._getFromStorage('protection_plans');
    const promotions = this._getFromStorage('promotions');
    const selections = this._getFromStorage('packing_supply_selections');
    const products = this._getFromStorage('packing_supply_products');

    const containerType = containerTypes.find((ct) => ct.id === moveQuote.containerTypeId) || null;
    const protectionPlan = moveQuote.protectionPlanId
      ? protectionPlans.find((p) => p.id === moveQuote.protectionPlanId) || null
      : null;
    const appliedPromotion = moveQuote.promotionId
      ? promotions.find((p) => p.id === moveQuote.promotionId) || null
      : null;

    const quoteSelections = selections.filter((s) => s.moveQuoteId === moveQuote.id);
    const packingSupplies = quoteSelections.map((s) => ({
      selection: s,
      product: products.find((p) => p.id === s.packingSupplyProductId) || null
    }));

    return {
      moveQuote,
      containerType,
      protectionPlan,
      appliedPromotion,
      packingSupplies
    };
  }

  saveMoveQuote(moveQuoteId) {
    const move_quotes = this._getFromStorage('move_quotes');
    const idx = move_quotes.findIndex((mq) => mq.id === moveQuoteId);
    if (idx === -1) {
      throw new Error('Move quote not found: ' + moveQuoteId);
    }
    const moveQuote = {
      ...move_quotes[idx],
      status: 'saved',
      updatedAt: this._now()
    };
    move_quotes[idx] = moveQuote;
    this._saveToStorage('move_quotes', move_quotes);

    // Instrumentation for task completion tracking (task_5)
    try {
      if (
        moveQuote &&
        moveQuote.status === 'saved' &&
        moveQuote.moveType === 'local' &&
        moveQuote.originZip === '33101' &&
        moveQuote.destinationZip === '33133' &&
        Number(moveQuote.containerQuantity) === 1 &&
        typeof moveQuote.moveDate === 'string' &&
        moveQuote.moveDate.startsWith('2026-05-20') &&
        localStorage.getItem('task5_initialQuoteSnapshot') === null
      ) {
        const snapshot = {
          moveQuoteId: moveQuote.id,
          originZip: moveQuote.originZip,
          destinationZip: moveQuote.destinationZip,
          moveDate: moveQuote.moveDate,
          containerQuantity: moveQuote.containerQuantity,
          statusAtSave: moveQuote.status,
          createdAt: moveQuote.createdAt,
          savedAt: moveQuote.updatedAt
        };
        localStorage.setItem('task5_initialQuoteSnapshot', JSON.stringify(snapshot));
      }
    } catch (e) {
      try {
        console.error('Instrumentation error (task_5):', e);
      } catch (_) {}
    }

    return moveQuote;
  }

  getAvailableProtectionPlans() {
    return this._getFromStorage('protection_plans');
  }

  updateMoveQuoteDetails(moveQuoteId, moveDate, containerQuantity, protectionPlanId) {
    const move_quotes = this._getFromStorage('move_quotes');
    const idx = move_quotes.findIndex((mq) => mq.id === moveQuoteId);
    if (idx === -1) {
      throw new Error('Move quote not found: ' + moveQuoteId);
    }
    const existing = move_quotes[idx];

    const updated = { ...existing };
    if (typeof moveDate === 'string') {
      updated.moveDate = moveDate;
    }
    if (typeof containerQuantity === 'number') {
      updated.containerQuantity = containerQuantity;
    }
    if (typeof protectionPlanId === 'string') {
      updated.protectionPlanId = protectionPlanId;
    }
    updated.updatedAt = this._now();

    this._recalculateMoveQuotePricing(updated);
    move_quotes[idx] = updated;
    this._saveToStorage('move_quotes', move_quotes);

    return updated;
  }

  applyPromoCodeToMoveQuote(moveQuoteId, promoCode) {
    const move_quotes = this._getFromStorage('move_quotes');
    const idx = move_quotes.findIndex((mq) => mq.id === moveQuoteId);
    if (idx === -1) {
      return { success: false, message: 'Move quote not found.', moveQuote: null, appliedPromotion: null };
    }
    const moveQuote = move_quotes[idx];
    // Ensure basePrice is up to date before calculating discount
    this._recalculateMoveQuotePricing(moveQuote);

    const { success, message, promotion, discountAmount } = this._validatePromoCodeForQuote(moveQuote, promoCode);

    if (!success) {
      return { success, message, moveQuote, appliedPromotion: null };
    }

    moveQuote.promoCode = promoCode;
    moveQuote.promotionId = promotion.id;
    moveQuote.discountAmount = discountAmount;
    this._recalculateMoveQuotePricing(moveQuote);
    moveQuote.updatedAt = this._now();

    move_quotes[idx] = moveQuote;
    this._saveToStorage('move_quotes', move_quotes);

    return {
      success: true,
      message,
      moveQuote,
      appliedPromotion: promotion
    };
  }

  addMoveQuoteToCart(moveQuoteId) {
    const move_quotes = this._getFromStorage('move_quotes');
    const moveQuote = move_quotes.find((mq) => mq.id === moveQuoteId) || null;
    if (!moveQuote) {
      return { success: false, message: 'Move quote not found.', moveOrder: null, cartSummary: null };
    }

    const move_orders = this._getFromStorage('move_orders');
    const moveOrder = {
      id: this._generateId('mo'),
      sourceMoveQuoteId: moveQuote.id,
      moveType: moveQuote.moveType,
      originZip: moveQuote.originZip,
      destinationZip: moveQuote.destinationZip,
      moveDate: moveQuote.moveDate,
      containerTypeId: moveQuote.containerTypeId,
      containerQuantity: moveQuote.containerQuantity,
      containerDeliveryDate: moveQuote.containerDeliveryDate || null,
      deliveryWindowId: null,
      protectionPlanId: moveQuote.protectionPlanId || null,
      promotionId: moveQuote.promotionId || null,
      basePrice: moveQuote.basePrice,
      suppliesSubtotal: moveQuote.suppliesSubtotal || 0,
      discountAmount: moveQuote.discountAmount || 0,
      totalPrice: moveQuote.totalPrice,
      createdAt: this._now()
    };
    move_orders.push(moveOrder);
    this._saveToStorage('move_orders', move_orders);

    const cart = this._getOrCreateCart();
    const cart_items = this._getFromStorage('cart_items');
    const description = `Move (${moveOrder.moveType}) ${moveOrder.originZip} to ${moveOrder.destinationZip} - ${moveOrder.containerQuantity} container(s)`;

    const cartItem = {
      id: this._generateId('ci'),
      cartId: cart.id,
      itemType: 'move_order',
      itemId: moveOrder.id,
      description,
      quantity: 1,
      unitPrice: moveOrder.totalPrice,
      totalPrice: moveOrder.totalPrice,
      createdAt: this._now()
    };
    cart_items.push(cartItem);
    this._saveToStorage('cart_items', cart_items);

    cart.updatedAt = this._now();
    const carts = this._getFromStorage('cart');
    const cartIdx = carts.findIndex((c) => c.id === cart.id);
    if (cartIdx !== -1) {
      carts[cartIdx] = cart;
      this._saveToStorage('cart', carts);
    }

    const cartSummary = this._buildCartSummary(cart.id);

    return {
      success: true,
      message: 'Move added to cart.',
      moveOrder,
      cartSummary
    };
  }

  // ------------- Cart -------------

  getCartSummary() {
    const cart = this._getActiveCart();
    if (!cart) {
      return {
        cartId: null,
        status: 'empty',
        itemCount: 0,
        totalPrice: 0,
        items: []
      };
    }
    return this._buildCartSummary(cart.id);
  }

  updateCartItemQuantity(cartItemId, quantity) {
    const cart_items = this._getFromStorage('cart_items');
    const idx = cart_items.findIndex((ci) => ci.id === cartItemId);
    if (idx === -1) {
      throw new Error('Cart item not found: ' + cartItemId);
    }
    const item = { ...cart_items[idx] };
    const qty = Math.max(1, Number(quantity || 1));
    item.quantity = qty;
    item.totalPrice = Number(item.unitPrice || 0) * qty;
    cart_items[idx] = item;
    this._saveToStorage('cart_items', cart_items);

    const cartSummary = this._buildCartSummary(item.cartId);
    return { cartSummary };
  }

  removeCartItem(cartItemId) {
    const cart_items = this._getFromStorage('cart_items');
    const idx = cart_items.findIndex((ci) => ci.id === cartItemId);
    if (idx === -1) {
      throw new Error('Cart item not found: ' + cartItemId);
    }
    const cartId = cart_items[idx].cartId;
    cart_items.splice(idx, 1);
    this._saveToStorage('cart_items', cart_items);

    const cartSummary = this._buildCartSummary(cartId);
    return { cartSummary };
  }

  // ------------- Storage Locations & Units -------------

  searchStorageLocations(zip, categoryId, maxDistanceMiles, has247Access, minRating, sortBy) {
    let locations = this._getFromStorage('storage_locations');

    if (categoryId) {
      locations = locations.filter((loc) => loc.categoryId === categoryId);
    }
    if (typeof maxDistanceMiles === 'number') {
      locations = locations.filter((loc) => typeof loc.distanceMiles === 'number' && loc.distanceMiles <= maxDistanceMiles);
    }
    if (typeof has247Access === 'boolean') {
      locations = locations.filter((loc) => loc.has247Access === has247Access);
    }
    if (typeof minRating === 'number') {
      locations = locations.filter((loc) => Number(loc.ratingAverage || 0) >= minRating);
    }

    if (sortBy === 'distance_asc') {
      locations.sort((a, b) => Number(a.distanceMiles || Infinity) - Number(b.distanceMiles || Infinity));
    } else if (sortBy === 'rating_desc') {
      locations.sort((a, b) => Number(b.ratingAverage || 0) - Number(a.ratingAverage || 0));
    }

    return locations;
  }

  getLocationFilterOptions() {
    return {
      distanceOptions: [5, 10, 15, 25, 50],
      ratingThresholds: [3, 4, 4.5],
      amenities: ['climate control', 'drive-up access', '24/7 access', 'indoor access']
    };
  }

  getStorageLocationDetail(storageLocationId) {
    const locations = this._getFromStorage('storage_locations');
    const location = locations.find((loc) => loc.id === storageLocationId) || null;
    if (!location) {
      return { location: null, availableUnits: [] };
    }
    const unitsRaw = this._getFromStorage('storage_units').filter((u) => u.storageLocationId === storageLocationId && u.isAvailable !== false);

    // Foreign key resolution: storageLocationId -> storageLocation
    const availableUnits = unitsRaw.map((u) => ({
      ...u,
      storageLocation: location
    }));

    return { location, availableUnits };
  }

  getStorageUnitFilterOptions() {
    return {
      sizeCategories: [
        { value: 'small', label: 'Small', description: 'Good for boxes and small furniture.' },
        { value: 'medium', label: 'Medium', description: 'Fits 1–2 rooms of furniture.' },
        { value: 'large', label: 'Large', description: 'Fits 2–3 rooms of furniture.' },
        { value: 'extra_large', label: 'Extra Large', description: 'Whole-home storage.' }
      ],
      priceRangeSuggestions: [50, 100, 150, 200, 250, 500]
    };
  }

  getStorageUnitsForLocation(storageLocationId, maxMonthlyPrice, sizeCategories) {
    const unitsAll = this._getFromStorage('storage_units');
    const locations = this._getFromStorage('storage_locations');
    const location = locations.find((loc) => loc.id === storageLocationId) || null;

    let units = unitsAll.filter((u) => u.storageLocationId === storageLocationId && u.isAvailable !== false);

    if (typeof maxMonthlyPrice === 'number') {
      units = units.filter((u) => Number(u.monthlyPrice || 0) <= maxMonthlyPrice);
    }
    if (Array.isArray(sizeCategories) && sizeCategories.length > 0) {
      units = units.filter((u) => sizeCategories.includes(u.sizeCategory));
    }

    // Foreign key resolution: storageLocationId -> storageLocation
    return units.map((u) => ({
      ...u,
      storageLocation: location
    }));
  }

  createStorageUnitComparison(storageUnitIds) {
    const unitsAll = this._getFromStorage('storage_units');
    const locations = this._getFromStorage('storage_locations');

    const comparison = {
      id: this._generateId('suc'),
      storageUnitIds: Array.isArray(storageUnitIds) ? storageUnitIds : [],
      createdAt: this._now()
    };

    const comparisons = this._getFromStorage('storage_unit_comparisons');
    comparisons.push(comparison);
    this._saveToStorage('storage_unit_comparisons', comparisons);

    const units = comparison.storageUnitIds
      .map((id) => unitsAll.find((u) => u.id === id) || null)
      .filter((u) => !!u)
      .map((u) => ({
        ...u,
        storageLocation: locations.find((loc) => loc.id === u.storageLocationId) || null
      }));

    return { comparison, units };
  }

  getStorageUnitComparison(storageUnitComparisonId) {
    const comparisons = this._getFromStorage('storage_unit_comparisons');
    const comparison = comparisons.find((c) => c.id === storageUnitComparisonId) || null;
    if (!comparison) {
      return { comparison: null, units: [] };
    }

    const unitsAll = this._getFromStorage('storage_units');
    const locations = this._getFromStorage('storage_locations');

    const units = comparison.storageUnitIds
      .map((id) => unitsAll.find((u) => u.id === id) || null)
      .filter((u) => !!u)
      .map((u) => ({
        ...u,
        storageLocation: locations.find((loc) => loc.id === u.storageLocationId) || null
      }));

    return { comparison, units };
  }

  startStorageUnitReservation(storageUnitId) {
    const units = this._getFromStorage('storage_units');
    const unit = units.find((u) => u.id === storageUnitId) || null;
    if (!unit) {
      throw new Error('Storage unit not found: ' + storageUnitId);
    }

    const reservation = {
      id: this._generateId('sur'),
      storageUnitId: unit.id,
      storageLocationId: unit.storageLocationId,
      reservationStatus: 'in_progress',
      moveInDate: null,
      monthlyPrice: unit.monthlyPrice,
      createdAt: this._now()
    };

    const reservations = this._getFromStorage('storage_unit_reservations');
    reservations.push(reservation);
    this._saveToStorage('storage_unit_reservations', reservations);

    return reservation;
  }

  getStorageUnitReservationDetails(storageUnitReservationId) {
    const reservations = this._getFromStorage('storage_unit_reservations');
    const reservation = reservations.find((r) => r.id === storageUnitReservationId) || null;
    if (!reservation) {
      return { reservation: null, unit: null, location: null };
    }
    const units = this._getFromStorage('storage_units');
    const locations = this._getFromStorage('storage_locations');

    const unit = units.find((u) => u.id === reservation.storageUnitId) || null;
    const location = locations.find((loc) => loc.id === reservation.storageLocationId) || null;

    return { reservation, unit, location };
  }

  addStorageUnitReservationToCart(storageUnitReservationId) {
    const reservations = this._getFromStorage('storage_unit_reservations');
    const reservation = reservations.find((r) => r.id === storageUnitReservationId) || null;
    if (!reservation) {
      return { success: false, message: 'Reservation not found.', cartSummary: null };
    }

    const units = this._getFromStorage('storage_units');
    const locations = this._getFromStorage('storage_locations');
    const unit = units.find((u) => u.id === reservation.storageUnitId) || null;
    const location = locations.find((loc) => loc.id === reservation.storageLocationId) || null;

    const cart = this._getOrCreateCart();
    const cart_items = this._getFromStorage('cart_items');

    const descLocation = location ? `${location.city}, ${location.state}` : '';
    const description = unit
      ? `Storage unit ${unit.name} at ${descLocation}`
      : 'Storage unit reservation';

    const price = Number(reservation.monthlyPrice || 0);
    const cartItem = {
      id: this._generateId('ci'),
      cartId: cart.id,
      itemType: 'storage_unit_reservation',
      itemId: reservation.id,
      description,
      quantity: 1,
      unitPrice: price,
      totalPrice: price,
      createdAt: this._now()
    };

    cart_items.push(cartItem);
    this._saveToStorage('cart_items', cart_items);

    const carts = this._getFromStorage('cart');
    const idx = carts.findIndex((c) => c.id === cart.id);
    if (idx !== -1) {
      carts[idx] = { ...cart, updatedAt: this._now() };
      this._saveToStorage('cart', carts);
    }

    const cartSummary = this._buildCartSummary(cart.id);
    return { success: true, message: 'Storage reservation added to cart.', cartSummary };
  }

  // ------------- Portable Storage -------------

  getPortableStoragePageContent() {
    return {
      introHeading: 'Portable Storage Containers Delivered to Your Door',
      introBody: 'Schedule a container drop-off at your address, load on your schedule, and keep it on-site or at one of our secure storage centers.',
      benefits: [
        'No driving a rental truck',
        'Flexible delivery and pickup dates',
        'Secure, weather-resistant containers',
        'Keep at home or in our storage facilities'
      ]
    };
  }

  getPortableStorageContainerOptions(deliveryZip) {
    const containerTypes = this._getFromStorage('container_types').filter((ct) => ct.isActive !== false);
    return containerTypes.map((ct) => {
      const monthlyStorageFee = Number(ct.baseMonthlyStorageFee || 0);
      const baseDeliveryFee = 100;
      const estimatedFirstMonthTotal = monthlyStorageFee + baseDeliveryFee;
      return {
        containerType: ct,
        monthlyStorageFee,
        baseDeliveryFee,
        estimatedFirstMonthTotal
      };
    });
  }

  startPortableStorageBookingFromOption(containerTypeId, deliveryZip, containerQuantity) {
    const containerTypes = this._getFromStorage('container_types');
    const containerType = containerTypes.find((ct) => ct.id === containerTypeId) || null;
    if (!containerType) {
      throw new Error('Container type not found: ' + containerTypeId);
    }

    const qty = Number(containerQuantity || 1);
    const booking = {
      id: this._generateId('psb'),
      containerTypeId: containerType.id,
      containerQuantity: qty,
      deliveryZip,
      storageLocationId: null,
      dropoffDate: null,
      pickupDate: null,
      deliverySpeed: 'standard_delivery_3_5_days',
      monthlyStorageFee: containerType.baseMonthlyStorageFee,
      baseDeliveryFee: 100,
      totalPrice: 0,
      status: 'in_progress',
      createdAt: this._now()
    };

    this._recalculatePortableStoragePricing(booking);

    const bookings = this._getFromStorage('portable_storage_bookings');
    bookings.push(booking);
    this._saveToStorage('portable_storage_bookings', bookings);

    return booking;
  }

  startContainerReservationAtLocation(storageLocationId, containerTypeId, containerQuantity) {
    const locations = this._getFromStorage('storage_locations');
    const location = locations.find((loc) => loc.id === storageLocationId) || null;
    if (!location) {
      throw new Error('Storage location not found: ' + storageLocationId);
    }

    const containerTypes = this._getFromStorage('container_types').filter((ct) => ct.isActive !== false);
    let containerType = null;
    if (containerTypeId) {
      containerType = containerTypes.find((ct) => ct.id === containerTypeId) || null;
    }
    if (!containerType) {
      containerType = containerTypes[0] || null;
    }
    if (!containerType) {
      throw new Error('No container types available.');
    }

    const qty = Number(containerQuantity || 1);
    const booking = {
      id: this._generateId('psb'),
      containerTypeId: containerType.id,
      containerQuantity: qty,
      deliveryZip: location.zip,
      storageLocationId: location.id,
      dropoffDate: null,
      pickupDate: null,
      deliverySpeed: 'standard_delivery_3_5_days',
      monthlyStorageFee: containerType.baseMonthlyStorageFee,
      baseDeliveryFee: 100,
      totalPrice: 0,
      status: 'in_progress',
      createdAt: this._now()
    };

    this._recalculatePortableStoragePricing(booking);

    const bookings = this._getFromStorage('portable_storage_bookings');
    bookings.push(booking);
    this._saveToStorage('portable_storage_bookings', bookings);

    return booking;
  }

  getPortableStorageBookingDetails(portableStorageBookingId) {
    const bookings = this._getFromStorage('portable_storage_bookings');
    const booking = bookings.find((b) => b.id === portableStorageBookingId) || null;
    if (!booking) {
      return { booking: null, containerType: null, storageLocation: null };
    }
    const containerTypes = this._getFromStorage('container_types');
    const containerType = containerTypes.find((ct) => ct.id === booking.containerTypeId) || null;

    const locations = this._getFromStorage('storage_locations');
    const storageLocation = booking.storageLocationId
      ? locations.find((loc) => loc.id === booking.storageLocationId) || null
      : null;

    return { booking, containerType, storageLocation };
  }

  updatePortableStorageBookingDetails(portableStorageBookingId, deliveryZip, dropoffDate, pickupDate, deliverySpeed, containerTypeId, containerQuantity) {
    const bookings = this._getFromStorage('portable_storage_bookings');
    const idx = bookings.findIndex((b) => b.id === portableStorageBookingId);
    if (idx === -1) {
      throw new Error('Portable storage booking not found: ' + portableStorageBookingId);
    }
    const booking = { ...bookings[idx] };

    if (typeof deliveryZip === 'string') booking.deliveryZip = deliveryZip;
    if (typeof dropoffDate === 'string') booking.dropoffDate = dropoffDate;
    if (typeof pickupDate === 'string') booking.pickupDate = pickupDate;
    if (typeof deliverySpeed === 'string') booking.deliverySpeed = deliverySpeed;
    if (typeof containerTypeId === 'string') booking.containerTypeId = containerTypeId;
    if (typeof containerQuantity === 'number') booking.containerQuantity = containerQuantity;

    this._recalculatePortableStoragePricing(booking);

    bookings[idx] = booking;
    this._saveToStorage('portable_storage_bookings', bookings);

    return booking;
  }

  addPortableStorageBookingToCart(portableStorageBookingId) {
    const bookings = this._getFromStorage('portable_storage_bookings');
    const booking = bookings.find((b) => b.id === portableStorageBookingId) || null;
    if (!booking) {
      return { success: false, message: 'Booking not found.', cartSummary: null };
    }

    const containerTypes = this._getFromStorage('container_types');
    const containerType = containerTypes.find((ct) => ct.id === booking.containerTypeId) || null;

    const cart = this._getOrCreateCart();
    const cart_items = this._getFromStorage('cart_items');

    const description = containerType
      ? `Portable storage: ${booking.containerQuantity} x ${containerType.name} to ${booking.deliveryZip}`
      : `Portable storage booking to ${booking.deliveryZip}`;

    const price = Number(booking.totalPrice || 0);
    const cartItem = {
      id: this._generateId('ci'),
      cartId: cart.id,
      itemType: 'portable_storage_booking',
      itemId: booking.id,
      description,
      quantity: 1,
      unitPrice: price,
      totalPrice: price,
      createdAt: this._now()
    };

    cart_items.push(cartItem);
    this._saveToStorage('cart_items', cart_items);

    const carts = this._getFromStorage('cart');
    const idx = carts.findIndex((c) => c.id === cart.id);
    if (idx !== -1) {
      carts[idx] = { ...cart, updatedAt: this._now() };
      this._saveToStorage('cart', carts);
    }

    const cartSummary = this._buildCartSummary(cart.id);
    return { success: true, message: 'Portable storage booking added to cart.', cartSummary };
  }

  // ------------- Space Calculator -------------

  createSpaceCalculatorConfig(homeType) {
    const config = {
      id: this._generateId('scc'),
      homeType,
      createdAt: this._now(),
      updatedAt: this._now()
    };

    const configs = this._getFromStorage('space_calculator_configs');
    configs.push(config);
    this._saveToStorage('space_calculator_configs', configs);

    // Create a default room "Bedroom 1" so tasks can reference it
    const rooms = this._getFromStorage('space_calculator_rooms');
    const room = {
      id: this._generateId('scr'),
      spaceCalculatorConfigId: config.id,
      name: 'Bedroom 1',
      sortOrder: 1
    };
    rooms.push(room);
    this._saveToStorage('space_calculator_rooms', rooms);

    return {
      config,
      rooms: [room]
    };
  }

  getSpaceCalculatorConfigDetails(spaceCalculatorConfigId) {
    const configs = this._getFromStorage('space_calculator_configs');
    const config = configs.find((c) => c.id === spaceCalculatorConfigId) || null;
    if (!config) {
      return { config: null, rooms: [] };
    }

    const roomsAll = this._getFromStorage('space_calculator_rooms');
    const itemsAll = this._getFromStorage('space_calculator_items');

    const roomsForConfig = roomsAll
      .filter((r) => r.spaceCalculatorConfigId === config.id)
      .sort((a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0));

    const rooms = roomsForConfig.map((room) => ({
      room,
      items: itemsAll.filter((it) => it.spaceCalculatorRoomId === room.id)
    }));

    return { config, rooms };
  }

  addSpaceCalculatorRoom(spaceCalculatorConfigId, name) {
    const rooms = this._getFromStorage('space_calculator_rooms');
    const existingForConfig = rooms.filter((r) => r.spaceCalculatorConfigId === spaceCalculatorConfigId);
    const maxSortOrder = existingForConfig.reduce((max, r) => Math.max(max, Number(r.sortOrder || 0)), 0);

    const room = {
      id: this._generateId('scr'),
      spaceCalculatorConfigId,
      name,
      sortOrder: maxSortOrder + 1
    };

    rooms.push(room);
    this._saveToStorage('space_calculator_rooms', rooms);

    return room;
  }

  setSpaceCalculatorItemQuantity(spaceCalculatorRoomId, itemType, quantity) {
    const items = this._getFromStorage('space_calculator_items');
    const existingIdx = items.findIndex((it) => it.spaceCalculatorRoomId === spaceCalculatorRoomId && it.itemType === itemType);

    const qty = Number(quantity || 0);

    if (qty <= 0) {
      if (existingIdx !== -1) {
        items.splice(existingIdx, 1);
        this._saveToStorage('space_calculator_items', items);
      }
      return null;
    }

    const estimatedVolumeCuFt = this._getVolumeForItemType(itemType) * qty;

    let item;
    if (existingIdx === -1) {
      item = {
        id: this._generateId('sci'),
        spaceCalculatorRoomId,
        itemType,
        quantity: qty,
        estimatedVolumeCuFt
      };
      items.push(item);
    } else {
      item = {
        ...items[existingIdx],
        quantity: qty,
        estimatedVolumeCuFt
      };
      items[existingIdx] = item;
    }

    this._saveToStorage('space_calculator_items', items);
    return item;
  }

  calculateSpaceRecommendations(spaceCalculatorConfigId) {
    const configs = this._getFromStorage('space_calculator_configs');
    const config = configs.find((c) => c.id === spaceCalculatorConfigId) || null;
    if (!config) {
      return { totalEstimatedVolumeCuFt: 0, recommendations: [] };
    }

    const rooms = this._getFromStorage('space_calculator_rooms').filter((r) => r.spaceCalculatorConfigId === config.id);
    const roomIds = rooms.map((r) => r.id);
    const items = this._getFromStorage('space_calculator_items').filter((it) => roomIds.includes(it.spaceCalculatorRoomId));

    const totalEstimatedVolumeCuFt = items.reduce((sum, it) => sum + Number(it.estimatedVolumeCuFt || 0), 0);

    const containerTypes = this._getFromStorage('container_types').filter((ct) => ct.isActive !== false);

    // Remove existing recommendations for this config
    let recommendationsAll = this._getFromStorage('space_calculator_recommendations');
    recommendationsAll = recommendationsAll.filter((r) => r.spaceCalculatorConfigId !== config.id);

    const recommendations = [];

    containerTypes.forEach((ct, index) => {
      const capacity = Number(ct.capacitySqFt || 100);
      const recommendedContainerQuantity = Math.max(1, Math.ceil(totalEstimatedVolumeCuFt / capacity));
      const rec = {
        id: this._generateId('scrm'),
        spaceCalculatorConfigId: config.id,
        containerTypeId: ct.id,
        recommendedContainerQuantity,
        estimatedTotalVolumeCuFt: totalEstimatedVolumeCuFt,
        isPrimary: index === 0
      };
      recommendations.push(rec);
    });

    recommendationsAll = recommendationsAll.concat(recommendations);
    this._saveToStorage('space_calculator_recommendations', recommendationsAll);

    return {
      totalEstimatedVolumeCuFt,
      recommendations
    };
  }

  startContainerReservationFromSpaceCalculator(spaceCalculatorRecommendationId) {
    const recommendations = this._getFromStorage('space_calculator_recommendations');
    const rec = recommendations.find((r) => r.id === spaceCalculatorRecommendationId) || null;
    if (!rec) {
      throw new Error('Space calculator recommendation not found: ' + spaceCalculatorRecommendationId);
    }

    const containerTypes = this._getFromStorage('container_types');
    const containerType = containerTypes.find((ct) => ct.id === rec.containerTypeId) || null;
    if (!containerType) {
      throw new Error('Container type not found: ' + rec.containerTypeId);
    }

    const booking = {
      id: this._generateId('psb'),
      containerTypeId: containerType.id,
      containerQuantity: rec.recommendedContainerQuantity,
      deliveryZip: '',
      storageLocationId: null,
      dropoffDate: null,
      pickupDate: null,
      deliverySpeed: 'standard_delivery_3_5_days',
      monthlyStorageFee: containerType.baseMonthlyStorageFee,
      baseDeliveryFee: 100,
      totalPrice: 0,
      status: 'in_progress',
      createdAt: this._now()
    };

    this._recalculatePortableStoragePricing(booking);

    const bookings = this._getFromStorage('portable_storage_bookings');
    bookings.push(booking);
    this._saveToStorage('portable_storage_bookings', bookings);

    return booking;
  }

  // ------------- Promotions -------------

  getActivePromotions(isNewCustomerOnly, minDiscountPercent) {
    let promotions = this._getFromStorage('promotions');

    promotions = promotions.filter((p) => p.status === 'active');

    if (typeof isNewCustomerOnly === 'boolean') {
      promotions = promotions.filter((p) => p.isNewCustomerOnly === isNewCustomerOnly);
    }

    if (typeof minDiscountPercent === 'number') {
      promotions = promotions.filter((p) => {
        if (p.discountType === 'percent') {
          return Number(p.discountValue || 0) >= minDiscountPercent;
        }
        // For fixed_amount, we cannot reliably compare to percent threshold; keep or drop.
        return false;
      });
    }

    return promotions;
  }

  getPromotionDetail(promotionId) {
    const promotions = this._getFromStorage('promotions');
    return promotions.find((p) => p.id === promotionId) || null;
  }

  // ------------- Help Center & Support -------------

  searchHelpArticles(query, page, pageSize) {
    const q = String(query || '').trim().toLowerCase();
    const p = Number(page || 1);
    const size = Number(pageSize || 10);

    const articles = this._getFromStorage('help_articles');
    const filtered = q
      ? articles.filter((a) => {
          const rawText = (String(a.title || '') + ' ' + String(a.content || '')).toLowerCase();
          const normalizedText = rawText.replace(/[^a-z0-9\s]/g, ' ');
          const terms = q.split(/\s+/).filter(Boolean);
          if (terms.length === 0) return true;
          return terms.every((term) => normalizedText.includes(term));
        })
      : articles;

    const start = (p - 1) * size;
    const end = start + size;
    const pageItems = filtered.slice(start, end);

    return pageItems.map((a) => ({
      articleId: a.id,
      title: a.title,
      slug: a.slug,
      snippet: String(a.content || '').slice(0, 160)
    }));
  }

  getFeaturedHelpArticles() {
    const articles = this._getFromStorage('help_articles');
    return articles.filter((a) => a.isFeatured);
  }

  getHelpArticleDetail(articleId) {
    const articles = this._getFromStorage('help_articles');
    const article = articles.find((a) => a.id === articleId) || null;

    // Instrumentation for task completion tracking (task_8)
    try {
      if (
        article &&
        (
          (typeof article.title === 'string' && article.title.toLowerCase().includes('cancellation')) ||
          (typeof article.slug === 'string' && article.slug.toLowerCase().includes('cancellation'))
        )
      ) {
        const payload = {
          articleId: article.id,
          viewedAt: this._now()
        };
        localStorage.setItem('task8_cancellationArticleViewed', JSON.stringify(payload));
      }
    } catch (e) {
      try {
        console.error('Instrumentation error (task_8):', e);
      } catch (_) {}
    }

    return article;
  }

  getSupportContactOptions() {
    const options = this._getFromStorage('support_contact_options');
    return options.filter((opt) => opt.isActive !== false);
  }

  startLiveChatSession(subject) {
    const session = {
      id: this._generateId('lcs'),
      startedAt: this._now(),
      status: 'active',
      subject: subject || null,
      endedAt: null
    };

    const sessions = this._getFromStorage('live_chat_sessions');
    sessions.push(session);
    this._saveToStorage('live_chat_sessions', sessions);

    return session;
  }

  sendLiveChatMessage(chatSessionId, messageText) {
    const sessions = this._getFromStorage('live_chat_sessions');
    const session = sessions.find((s) => s.id === chatSessionId) || null;
    if (!session || session.status !== 'active') {
      throw new Error('Live chat session not found or not active: ' + chatSessionId);
    }

    const message = {
      id: this._generateId('lcm'),
      chatSessionId,
      senderType: 'user',
      messageText,
      sentAt: this._now()
    };

    const messages = this._getFromStorage('live_chat_messages');
    messages.push(message);
    this._saveToStorage('live_chat_messages', messages);

    return message;
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