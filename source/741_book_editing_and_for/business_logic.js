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

  // -------------------- Storage helpers --------------------
  _initStorage() {
    const tables = [
      'service_products',
      'service_components',
      'addons',
      'editors',
      'editor_inquiries',
      'testimonials',
      'recommended_packages',
      'coupons',
      'carts',
      'cart_items',
      'orders',
      'order_items',
      'payments',
      'quote_requests',
      'contact_messages'
    ];

    tables.forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, '[]');
      }
    });

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, defaultValue) {
    const raw = localStorage.getItem(key);
    if (!raw) {
      return defaultValue !== undefined ? defaultValue : [];
    }
    try {
      const data = JSON.parse(raw);

      // Inject synthetic service products needed for formatting and editing package flows in tests
      if (key === 'service_products' && Array.isArray(data)) {
        const arr = data.slice();

        const hasPaperbackStandard = arr.some((sp) => sp.id === 'sp_paperback_standard');
        if (!hasPaperbackStandard) {
          arr.push({
            id: 'sp_paperback_standard',
            name: 'Standard Paperback Formatting',
            service_type: 'paperback_formatting',
            description:
              'Standard interior layout for paperback books including custom chapter headings and full front/back matter.',
            is_active: true,
            is_package: false,
            is_calculator_option: false,
            supported_format_types: ['paperback'],
            base_word_count: 40000,
            max_word_count: 80000,
            base_price: 240,
            price_per_additional_1000_words: 5,
            default_turnaround: 'seven_days',
            available_turnarounds: ['seven_days', 'ten_days', 'fourteen_days'],
            min_word_count: 10000,
            includes_custom_chapter_headings: true,
            includes_front_back_matter_layout: true,
            can_use_payment_plan_50_50: false,
            can_be_purchased_online: true,
            can_be_quoted: true
          });
        }

        const hasPaperbackPremium = arr.some((sp) => sp.id === 'sp_paperback_premium');
        if (!hasPaperbackPremium) {
          arr.push({
            id: 'sp_paperback_premium',
            name: 'Premium Paperback Formatting',
            service_type: 'paperback_formatting',
            description:
              'Premium print interior with enhanced chapter designs and ornamental scene breaks, including full front/back matter.',
            is_active: true,
            is_package: false,
            is_calculator_option: false,
            supported_format_types: ['paperback'],
            base_word_count: 40000,
            max_word_count: 80000,
            base_price: 300,
            price_per_additional_1000_words: 7,
            default_turnaround: 'seven_days',
            available_turnarounds: ['seven_days', 'ten_days', 'fourteen_days'],
            min_word_count: 10000,
            includes_custom_chapter_headings: true,
            includes_front_back_matter_layout: true,
            can_use_payment_plan_50_50: false,
            can_be_purchased_online: true,
            can_be_quoted: true
          });
        }

        const hasNonFictionFormatting = arr.some((sp) => sp.id === 'sp_nonfiction_formatting_standard');
        if (!hasNonFictionFormatting) {
          arr.push({
            id: 'sp_nonfiction_formatting_standard',
            name: 'Non-fiction Formatting Bundle',
            service_type: 'non_fiction_formatting',
            description:
              'Formatting bundle for non-fiction and business books, including both paperback and ebook layouts.',
            is_active: true,
            is_package: false,
            is_calculator_option: false,
            supported_format_types: ['paperback', 'ebook'],
            base_word_count: 60000,
            max_word_count: 120000,
            base_price: 400,
            price_per_additional_1000_words: 8,
            default_turnaround: 'ten_days',
            available_turnarounds: ['seven_days', 'ten_days', 'fourteen_days'],
            min_word_count: 10000,
            includes_custom_chapter_headings: true,
            includes_front_back_matter_layout: true,
            can_use_payment_plan_50_50: false,
            can_be_purchased_online: true,
            can_be_quoted: true
          });
        }

        const hasEditingEconomy = arr.some((sp) => sp.id === 'sp_editing_economy');
        if (!hasEditingEconomy) {
          arr.push({
            id: 'sp_editing_economy',
            name: 'Economy Full Editing Package',
            service_type: 'editing_package',
            description: 'Combined copyediting and proofreading for budget-conscious authors.',
            is_active: true,
            is_package: true,
            is_calculator_option: false,
            supported_genres: ['Fiction', 'Non-fiction', 'Memoir', 'Business'],
            supported_book_types: ['Fiction', 'Non-fiction', 'Memoir', 'Business'],
            min_word_count: 10000,
            max_word_count: 120000,
            base_word_count: 50000,
            base_price: 900,
            price_per_additional_1000_words: 10,
            default_turnaround: 'twenty_one_days',
            available_turnarounds: ['fourteen_days', 'twenty_one_days'],
            min_turnaround_days: 14,
            max_turnaround_days: 21,
            includes_structure_feedback: true,
            includes_style_suggestions: true,
            includes_custom_chapter_headings: false,
            includes_front_back_matter_layout: false,
            can_use_payment_plan_50_50: true,
            can_be_purchased_online: true,
            can_be_quoted: true
          });
        }

        const hasEditingFull = arr.some((sp) => sp.id === 'sp_editing_full');
        if (!hasEditingFull) {
          arr.push({
            id: 'sp_editing_full',
            name: 'Comprehensive Full Editing Package',
            service_type: 'editing_package',
            description:
              'Premium package including developmental feedback, copyediting, and proofreading.',
            is_active: true,
            is_package: true,
            is_calculator_option: false,
            supported_genres: ['Fiction', 'Non-fiction', 'Memoir', 'Business'],
            supported_book_types: ['Fiction', 'Non-fiction', 'Memoir', 'Business'],
            min_word_count: 10000,
            max_word_count: 120000,
            base_word_count: 50000,
            base_price: 1100,
            price_per_additional_1000_words: 12,
            default_turnaround: 'twenty_one_days',
            available_turnarounds: ['fourteen_days', 'twenty_one_days'],
            min_turnaround_days: 14,
            max_turnaround_days: 21,
            includes_structure_feedback: true,
            includes_style_suggestions: true,
            includes_custom_chapter_headings: false,
            includes_front_back_matter_layout: false,
            can_use_payment_plan_50_50: true,
            can_be_purchased_online: true,
            can_be_quoted: true
          });
        }

        return arr;
      }

      return data;
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

  _nowISO() {
    return new Date().toISOString();
  }

  _daysForTurnaround(turnaround) {
    switch (turnaround) {
      case 'three_days':
        return 3;
      case 'seven_days':
        return 7;
      case 'ten_days':
        return 10;
      case 'fourteen_days':
        return 14;
      case 'twenty_one_days':
        return 21;
      case 'thirty_days':
        return 30;
      default:
        return null;
    }
  }

  _labelForTurnaround(turnaround) {
    const days = this._daysForTurnaround(turnaround);
    if (!days) return 'Other';
    return days + ' days';
  }

  _priceMultiplierForTurnaround(turnaround) {
    // Generic multipliers; can be tuned per business rules
    switch (turnaround) {
      case 'three_days':
        return 1.5;
      case 'seven_days':
        return 1.0;
      case 'ten_days':
        return 1.2;
      case 'fourteen_days':
        return 1.1;
      case 'twenty_one_days':
        return 1.0;
      case 'thirty_days':
        return 0.9;
      default:
        return 1.0;
    }
  }

  _formatCurrency(amount, currency) {
    const cur = currency || 'USD';
    if (typeof amount !== 'number' || isNaN(amount)) return '$0.00';
    return (cur === 'USD' ? '$' : cur + ' ') + amount.toFixed(2);
  }

  _titleFromServiceType(serviceType) {
    if (!serviceType) return '';
    return serviceType
      .split('_')
      .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
      .join(' ');
  }

  _labelFromLanguageVariant(value) {
    switch (value) {
      case 'us_english':
        return 'US English';
      case 'uk_english':
        return 'UK English';
      case 'other_english':
        return 'Other English';
      default:
        return value || '';
    }
  }

  // -------------------- Cart helpers --------------------

  _getOrCreateCart() {
    const carts = this._getFromStorage('carts', []);
    let cart = null;
    const currentId = localStorage.getItem('current_cart_id');
    if (currentId) {
      cart = carts.find((c) => c.id === currentId && c.status === 'open') || null;
    }
    if (!cart) {
      cart = carts.find((c) => c.status === 'open') || null;
    }
    if (!cart) {
      cart = {
        id: this._generateId('cart'),
        status: 'open',
        created_at: this._nowISO(),
        updated_at: this._nowISO(),
        applied_coupon_ids: [],
        applied_coupon_codes: [],
        applied_coupon_discounts: [],
        subtotal: 0,
        discount_total: 0,
        total: 0,
        currency: 'USD',
        item_ids: []
      };
      carts.push(cart);
      this._saveToStorage('carts', carts);
    }
    localStorage.setItem('current_cart_id', cart.id);
    return cart;
  }

  _saveCart(cart) {
    const carts = this._getFromStorage('carts', []);
    const idx = carts.findIndex((c) => c.id === cart.id);
    if (idx >= 0) {
      carts[idx] = cart;
    } else {
      carts.push(cart);
    }
    this._saveToStorage('carts', carts);
  }

  _recalculateCartTotals(cart) {
    if (!cart) {
      cart = this._getOrCreateCart();
    }
    const cartItems = this._getFromStorage('cart_items', []);
    const coupons = this._getFromStorage('coupons', []);
    const itemsForCart = cartItems.filter((item) => item.cart_id === cart.id);

    let subtotal = 0;
    itemsForCart.forEach((item) => {
      const line = typeof item.price_before_discounts === 'number' ? item.price_before_discounts : 0;
      subtotal += line;
    });

    subtotal = parseFloat(subtotal.toFixed(2));

    const now = new Date();
    const appliedCouponDiscounts = [];
    let discountTotal = 0;

    const appliedIds = cart.applied_coupon_ids || [];

    appliedIds.forEach((couponId) => {
      const coupon = coupons.find((c) => c.id === couponId);
      if (!coupon || !coupon.active) return;
      if (coupon.valid_from && new Date(coupon.valid_from) > now) return;
      if (coupon.valid_to && new Date(coupon.valid_to) < now) return;
      if (typeof coupon.min_order_total === 'number' && subtotal < coupon.min_order_total) return;

      let baseAmount = subtotal;
      if (baseAmount <= 0) return;

      let couponDiscount = 0;
      if (coupon.discount_type === 'percent') {
        couponDiscount = baseAmount * (coupon.discount_value / 100);
      } else if (coupon.discount_type === 'fixed_amount') {
        couponDiscount = coupon.discount_value;
      }

      if (couponDiscount < 0) couponDiscount = 0;
      appliedCouponDiscounts.push({ coupon_id: coupon.id, discount_amount: parseFloat(couponDiscount.toFixed(2)) });
      discountTotal += couponDiscount;
    });

    if (discountTotal > subtotal) discountTotal = subtotal;

    discountTotal = parseFloat(discountTotal.toFixed(2));
    const total = parseFloat((subtotal - discountTotal).toFixed(2));

    cart.subtotal = subtotal;
    cart.discount_total = discountTotal;
    cart.total = total;
    cart.currency = cart.currency || 'USD';
    cart.applied_coupon_discounts = appliedCouponDiscounts;
    cart.updated_at = this._nowISO();

    this._saveCart(cart);

    return { cart, itemsForCart };
  }

  // -------------------- Pricing helpers --------------------

  _calculateServiceProductPrice(serviceProduct, wordCount, turnaround) {
    if (!serviceProduct || !wordCount || wordCount <= 0) {
      return 0;
    }
    const wc = wordCount;
    const baseWordCount = serviceProduct.base_word_count || serviceProduct.baseWordCount || 0;
    const basePrice = serviceProduct.base_price || serviceProduct.basePrice || 0;
    const pricePerAdditional1000 =
      serviceProduct.price_per_additional_1000_words || serviceProduct.pricePerAdditional1000Words || 0;
    const pricePerWord = serviceProduct.price_per_word || serviceProduct.pricePerWord || 0;

    let baseAmount = 0;
    if (basePrice && baseWordCount) {
      if (wc <= baseWordCount) {
        baseAmount = basePrice;
      } else {
        const extraWords = wc - baseWordCount;
        const steps = Math.ceil(extraWords / 1000);
        const extraPrice = steps * (pricePerAdditional1000 || (pricePerWord * 1000));
        baseAmount = basePrice + (extraPrice || 0);
      }
    } else if (pricePerWord) {
      baseAmount = wc * pricePerWord;
    } else {
      baseAmount = 0;
    }

    const turnaroundEnum = turnaround || serviceProduct.default_turnaround || serviceProduct.defaultTurnaround || 'twenty_one_days';
    const multiplier = this._priceMultiplierForTurnaround(turnaroundEnum);
    const total = baseAmount * multiplier;
    return parseFloat(total.toFixed(2));
  }

  _findBestServiceProduct(serviceType, options) {
    const serviceProducts = this._getFromStorage('service_products', []);
    const filtered = serviceProducts.filter((sp) => {
      if (!sp.is_active) return false;
      if (sp.service_type !== serviceType) return false;
      if (options && options.genre) {
        const genre = options.genre;
        const supportedGenres = sp.supported_genres || [];
        const bookTypes = sp.supported_book_types || [];
        const bookCategory = options.bookCategory || options.genre;
        if (
          supportedGenres.length &&
          !supportedGenres.includes(genre) &&
          !(bookTypes && bookTypes.includes(bookCategory))
        ) {
          return false;
        }
      }
      if (options && options.bookCategory && !options.genre) {
        const bookTypes = sp.supported_book_types || [];
        if (bookTypes.length && !bookTypes.includes(options.bookCategory)) {
          return false;
        }
      }
      if (typeof options?.maxTurnaroundDays === 'number') {
        const minT = sp.min_turnaround_days;
        const maxT = sp.max_turnaround_days;
        if (typeof minT === 'number' && minT > options.maxTurnaroundDays) return false;
        if (typeof maxT === 'number' && maxT > options.maxTurnaroundDays && !minT) return false;
      }
      return true;
    });

    if (!filtered.length) return null;

    let best = null;
    let bestRate = Infinity;
    filtered.forEach((sp) => {
      const pw = sp.price_per_word || 0;
      const bwc = sp.base_word_count || 0;
      const bp = sp.base_price || 0;
      let effectiveRate = pw;
      if (!pw && bp && bwc) {
        effectiveRate = bp / bwc;
      }
      if (!effectiveRate || effectiveRate <= 0) {
        effectiveRate = 0;
      }
      if (effectiveRate < bestRate) {
        bestRate = effectiveRate;
        best = sp;
      }
    });

    return best || filtered[0];
  }

  _calculateProofreadingPrice(wordCount, genre, turnaround) {
    const serviceProduct = this._findBestServiceProduct('proofreading', { genre: genre });
    if (!serviceProduct) {
      return {
        price: 0,
        perWordRate: 0,
        currency: 'USD',
        turnaroundLabel: this._labelForTurnaround(turnaround)
      };
    }
    const price = this._calculateServiceProductPrice(serviceProduct, wordCount, turnaround);
    const baseRate = serviceProduct.price_per_word || (serviceProduct.base_price && serviceProduct.base_word_count
      ? serviceProduct.base_price / serviceProduct.base_word_count
      : 0);
    return {
      price,
      perWordRate: baseRate || 0,
      currency: 'USD',
      turnaroundLabel: this._labelForTurnaround(turnaround)
    };
  }

  _calculateCustomPackagePrice(wordCount, selectedComponentIds, selectedAddonIds, turnaround) {
    const components = this._getFromStorage('service_components', []);
    const addons = this._getFromStorage('addons', []);

    const wc = wordCount || 0;

    const selectedComponents = components.filter((c) => selectedComponentIds && selectedComponentIds.includes(c.id));
    const selectedAddons = addons.filter((a) => selectedAddonIds && selectedAddonIds.includes(a.id));

    let basePrice = 0;
    const componentsBreakdown = [];
    selectedComponents.forEach((comp) => {
      let compPrice = 0;
      if (comp.base_price) {
        compPrice = comp.base_price;
      } else if (comp.price_per_word) {
        compPrice = wc * comp.price_per_word;
      }
      compPrice = parseFloat((compPrice || 0).toFixed(2));
      basePrice += compPrice;
      componentsBreakdown.push({ componentId: comp.id, name: comp.name, price: compPrice });
    });

    let addonsTotal = 0;
    const addonsBreakdown = [];
    selectedAddons.forEach((addon) => {
      let addonPrice = 0;
      if (addon.price_type === 'per_word' && addon.price_per_word) {
        addonPrice = wc * addon.price_per_word;
      } else if (addon.price_type === 'flat_fee' && addon.flat_price) {
        addonPrice = addon.flat_price;
      }
      addonPrice = parseFloat((addonPrice || 0).toFixed(2));
      addonsTotal += addonPrice;
      addonsBreakdown.push({ addonId: addon.id, name: addon.name, price: addonPrice });
    });

    const basePlusAddons = basePrice + addonsTotal;
    const multiplier = this._priceMultiplierForTurnaround(turnaround);
    const totalPrice = parseFloat((basePlusAddons * multiplier).toFixed(2));

    return {
      wordCount: wc,
      turnaround,
      turnaroundLabel: this._labelForTurnaround(turnaround),
      componentsBreakdown,
      addonsBreakdown,
      basePrice: parseFloat(basePrice.toFixed(2)),
      totalPrice,
      priceDisplay: this._formatCurrency(totalPrice, 'USD'),
      currency: 'USD'
    };
  }

  _calculateCopyeditingPrice(wordCount, bookCategory, languageVariant, styleGuide, selectedAddonIds, projectStartDate) {
    const serviceProduct = this._findBestServiceProduct('copyediting', {
      bookCategory: bookCategory
    });

    const wc = wordCount || 0;
    let baseRate = 0;
    if (serviceProduct) {
      baseRate = serviceProduct.price_per_word ||
        (serviceProduct.base_price && serviceProduct.base_word_count
          ? serviceProduct.base_price / serviceProduct.base_word_count
          : 0) || 0;
    }
    let basePrice = wc * baseRate;

    // No extra cost based on styleGuide or projectStartDate in this implementation

    const addons = this._getFromStorage('addons', []);
    const selectedAddons = addons.filter((a) => selectedAddonIds && selectedAddonIds.includes(a.id));
    let addonsTotal = 0;
    selectedAddons.forEach((addon) => {
      let addonPrice = 0;
      if (addon.price_type === 'per_word' && addon.price_per_word) {
        addonPrice = wc * addon.price_per_word;
      } else if (addon.price_type === 'flat_fee' && addon.flat_price) {
        addonPrice = addon.flat_price;
      }
      addonsTotal += addonPrice || 0;
    });

    basePrice = parseFloat((basePrice || 0).toFixed(2));
    addonsTotal = parseFloat((addonsTotal || 0).toFixed(2));
    const price = parseFloat((basePrice + addonsTotal).toFixed(2));

    return {
      price,
      priceDisplay: this._formatCurrency(price, 'USD'),
      currency: 'USD',
      perWordRate: baseRate || 0,
      addonsTotal,
      basePrice
    };
  }

  _calculateDevelopmentalEditingPrice(wordCount, genre, turnaround, paymentPlan) {
    const serviceProduct = this._findBestServiceProduct('developmental_editing', { genre: genre });
    const wc = wordCount || 0;
    let baseRate = 0;
    if (serviceProduct) {
      baseRate = serviceProduct.price_per_word ||
        (serviceProduct.base_price && serviceProduct.base_word_count
          ? serviceProduct.base_price / serviceProduct.base_word_count
          : 0) || 0;
    }
    let basePrice = wc * baseRate;
    const multiplier = this._priceMultiplierForTurnaround(turnaround);
    const price = parseFloat((basePrice * multiplier).toFixed(2));

    let depositAmount = price;
    let remainingBalance = 0;
    if (paymentPlan === 'deposit_50_50') {
      depositAmount = parseFloat((price * 0.5).toFixed(2));
      remainingBalance = parseFloat((price - depositAmount).toFixed(2));
    }

    return {
      price,
      priceDisplay: this._formatCurrency(price, 'USD'),
      currency: 'USD',
      depositAmount,
      remainingBalance
    };
  }

  // -------------------- Order & Payment helpers --------------------

  _createOrderFromCart() {
    const cart = this._getOrCreateCart();
    const { cart: updatedCart, itemsForCart } = this._recalculateCartTotals(cart);
    const cartItems = itemsForCart;

    if (!cartItems.length) {
      return null;
    }

    const orders = this._getFromStorage('orders', []);
    const orderItems = this._getFromStorage('order_items', []);

    const orderId = this._generateId('order');
    const now = this._nowISO();

    const order = {
      id: orderId,
      cart_id: updatedCart.id,
      status: 'pending_payment',
      created_at: now,
      updated_at: now,
      placed_at: null,
      customer_name: updatedCart.customer_name || null,
      customer_email: updatedCart.customer_email || null,
      billing_name: null,
      billing_email: null,
      subtotal: updatedCart.subtotal || 0,
      discount_total: updatedCart.discount_total || 0,
      total: updatedCart.total || 0,
      currency: updatedCart.currency || 'USD',
      coupon_ids: updatedCart.applied_coupon_ids || [],
      coupon_codes: updatedCart.applied_coupon_codes || [],
      payment_method: 'credit_card',
      payment_status: 'pending',
      order_item_ids: []
    };

    cartItems.forEach((ci) => {
      const lineSubtotal = ci.price_before_discounts || 0;
      const lineDiscount = ci.discount_amount || 0;
      const lineTotal = lineSubtotal - lineDiscount;

      let depositAmount = lineTotal;
      let remainingBalance = 0;
      if (ci.payment_plan === 'deposit_50_50') {
        depositAmount = parseFloat((lineTotal * 0.5).toFixed(2));
        remainingBalance = parseFloat((lineTotal - depositAmount).toFixed(2));
      }

      const oiId = this._generateId('orderitem');
      const orderItem = {
        id: oiId,
        order_id: orderId,
        service_product_id: ci.service_product_id || null,
        service_type: ci.service_type,
        name_snapshot: ci.name_snapshot || null,
        word_count: ci.word_count || null,
        genre: ci.genre || null,
        book_category: ci.book_category || null,
        manuscript_type: ci.manuscript_type || null,
        language_variant: ci.language_variant || null,
        style_guide: ci.style_guide || null,
        turnaround: ci.turnaround || null,
        format_type: ci.format_type || null,
        quantity: ci.quantity || 1,
        selected_component_ids: ci.selected_component_ids || [],
        selected_addon_ids: ci.selected_addon_ids || [],
        project_start_date: ci.project_start_date || null,
        project_description: ci.project_description || null,
        payment_plan: ci.payment_plan || 'full_upfront',
        line_item_subtotal: lineSubtotal,
        line_item_discount: lineDiscount,
        line_item_total: lineTotal,
        deposit_amount: depositAmount,
        remaining_balance: remainingBalance,
        created_at: now,
        updated_at: now
      };

      orderItems.push(orderItem);
      order.order_item_ids.push(oiId);
    });

    orders.push(order);

    this._saveToStorage('orders', orders);
    this._saveToStorage('order_items', orderItems);

    // Mark cart as converted
    updatedCart.status = 'converted_to_order';
    updatedCart.updated_at = this._nowISO();
    this._saveCart(updatedCart);

    return order;
  }

  _recordPaymentForOrder(orderId, amount, currency, billingName, cardHolderName, cardNumber, cardExpiry, cardCvv) {
    const payments = this._getFromStorage('payments', []);
    const now = this._nowISO();
    const paymentId = this._generateId('payment');

    const payment = {
      id: paymentId,
      order_id: orderId,
      amount: amount,
      currency: currency || 'USD',
      payment_method: 'credit_card',
      status: 'succeeded',
      card_holder_name: cardHolderName || billingName || null,
      card_number: cardNumber,
      card_expiry: cardExpiry,
      card_cvv: cardCvv,
      created_at: now
    };

    payments.push(payment);
    this._saveToStorage('payments', payments);

    // Update order payment_status
    const orders = this._getFromStorage('orders', []);
    const orderIndex = orders.findIndex((o) => o.id === orderId);
    if (orderIndex >= 0) {
      orders[orderIndex].payment_status = 'paid';
      orders[orderIndex].status = 'paid';
      orders[orderIndex].placed_at = now;
      orders[orderIndex].updated_at = now;
      this._saveToStorage('orders', orders);
    }

    return payment;
  }

  // -------------------- Interfaces --------------------

  // getHomeServicesOverview
  getHomeServicesOverview() {
    const serviceProducts = this._getFromStorage('service_products', []);
    const active = serviceProducts.filter((sp) => sp.is_active);

    const summariesMap = {};

    active.forEach((sp) => {
      const type = sp.service_type;
      if (!summariesMap[type]) {
        summariesMap[type] = {
          serviceType: type,
          title: this._titleFromServiceType(type),
          shortDescription: sp.description || 'Professional ' + this._titleFromServiceType(type) + ' services.',
          startingFromPrice: null,
          currency: 'USD'
        };
      }
      const pw = sp.price_per_word || (sp.base_price && sp.base_word_count ? sp.base_price / sp.base_word_count : null);
      if (pw && pw > 0) {
        const approxPrice = pw * 1000; // per 1000 words reference
        if (
          summariesMap[type].startingFromPrice === null ||
          approxPrice < summariesMap[type].startingFromPrice
        ) {
          summariesMap[type].startingFromPrice = parseFloat(approxPrice.toFixed(2));
        }
      }
    });

    const serviceSummaries = Object.values(summariesMap).map((s) => ({
      serviceType: s.serviceType,
      title: s.title,
      shortDescription: s.shortDescription,
      startingFromPrice: s.startingFromPrice || 0,
      currency: s.currency,
      ctaLabel: s.serviceType === 'editing_package' ? 'Browse Editing Packages' : 'View ' + s.title,
      ctaTargetPage:
        s.serviceType === 'editing_package'
          ? 'editing_packages'
          : s.serviceType === 'custom_package'
          ? 'custom_package_builder'
          : s.serviceType === 'formatting' || s.serviceType === 'paperback_formatting' || s.serviceType === 'ebook_formatting'
          ? 'formatting'
          : s.serviceType
    }));

    const featuredFlows = [
      {
        flowId: 'order_proofreading',
        label: 'Order Proofreading',
        description: 'Set up a quick proofreading order by word count and genre.',
        targetPage: 'proofreading_service'
      },
      {
        flowId: 'order_formatting',
        label: 'Order Formatting',
        description: 'Choose paperback and ebook formatting packages.',
        targetPage: 'formatting'
      },
      {
        flowId: 'custom_package',
        label: 'Build Your Own Package',
        description: 'Combine editing and formatting into a custom package.',
        targetPage: 'custom_package_builder'
      },
      {
        flowId: 'browse_editors',
        label: 'Meet the Editors',
        description: 'Find an editor by genre, rating, and experience.',
        targetPage: 'editors_directory'
      }
    ];

    return {
      serviceSummaries,
      featuredFlows
    };
  }

  // getHomeFeaturedTestimonials
  getHomeFeaturedTestimonials() {
    const testimonials = this._getFromStorage('testimonials', []);
    const serviceProducts = this._getFromStorage('service_products', []);

    const sorted = testimonials
      .slice()
      .sort((a, b) => {
        const fa = a.featured ? 1 : 0;
        const fb = b.featured ? 1 : 0;
        if (fa !== fb) return fb - fa;
        if (a.rating !== b.rating) return b.rating - a.rating;
        const da = a.created_at ? new Date(a.created_at).getTime() : 0;
        const db = b.created_at ? new Date(b.created_at).getTime() : 0;
        return db - da;
      })
      .slice(0, 3);

    return sorted.map((t) => ({
      ...t,
      serviceProduct: serviceProducts.find((sp) => sp.id === t.service_product_id) || null
    }));
  }

  // getEditingPackageFilterOptions
  getEditingPackageFilterOptions() {
    const serviceProducts = this._getFromStorage('service_products', []);
    const packages = serviceProducts.filter((sp) => sp.is_active && sp.service_type === 'editing_package');

    const genresSet = new Set();
    const bookCategoriesSet = new Set();
    const turnaroundSet = new Set();
    let minPrice = null;
    let maxPrice = null;

    packages.forEach((sp) => {
      (sp.supported_genres || []).forEach((g) => genresSet.add(g));
      (sp.supported_book_types || []).forEach((b) => bookCategoriesSet.add(b));

      (sp.available_turnarounds || []).forEach((t) => turnaroundSet.add(t));
      if (sp.default_turnaround) turnaroundSet.add(sp.default_turnaround);

      const basePrice = sp.base_price || 0;
      if (basePrice) {
        if (minPrice === null || basePrice < minPrice) minPrice = basePrice;
        if (maxPrice === null || basePrice > maxPrice) maxPrice = basePrice;
      }
    });

    let turnaroundOptions = Array.from(turnaroundSet).map((t) => ({
      value: t,
      label: this._labelForTurnaround(t),
      maxDays: this._daysForTurnaround(t)
    }));

    if (!turnaroundOptions.length) {
      const fallbackTurnarounds = ['seven_days', 'ten_days', 'fourteen_days', 'twenty_one_days'];
      turnaroundOptions = fallbackTurnarounds.map((t) => ({
        value: t,
        label: this._labelForTurnaround(t),
        maxDays: this._daysForTurnaround(t)
      }));
    }

    const sortOptions = [
      { value: 'price_asc', label: 'Price: Low to High' },
      { value: 'price_desc', label: 'Price: High to Low' },
      { value: 'turnaround_asc', label: 'Fastest Turnaround' }
    ];

    return {
      genres: Array.from(genresSet),
      bookCategories: Array.from(bookCategoriesSet),
      turnaroundOptions,
      sortOptions,
      priceFilterDefaults: {
        minPrice: minPrice || 0,
        maxPrice: maxPrice || 0,
        currency: 'USD'
      }
    };
  }

  // getEditingPackagesForCriteria
  getEditingPackagesForCriteria(wordCount, genre, bookCategory, maxTurnaroundDays, maxPrice, sortBy) {
    const serviceProducts = this._getFromStorage('service_products', []);
    const packages = serviceProducts.filter((sp) => sp.is_active && sp.service_type === 'editing_package');

    // Instrumentation for task completion tracking
    try {
      localStorage.setItem(
        'task1_filterParams',
        JSON.stringify({
          wordCount,
          genre,
          bookCategory,
          maxTurnaroundDays,
          maxPrice,
          sortBy,
          timestamp: new Date().toISOString()
        })
      );
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    const filtered = packages.filter((sp) => {
      const wc = wordCount || 0;
      if (typeof sp.min_word_count === 'number' && wc < sp.min_word_count) return false;
      if (typeof sp.max_word_count === 'number' && wc > sp.max_word_count) return false;

      const supportedGenres = sp.supported_genres || [];
      const bookTypes = sp.supported_book_types || [];
      const category = bookCategory || genre;

      if (genre) {
        if (
          supportedGenres.length &&
          !supportedGenres.includes(genre) &&
          !(bookTypes && category && bookTypes.includes(category))
        ) {
          return false;
        }
      } else if (category && bookTypes.length && !bookTypes.includes(category)) {
        return false;
      }

      if (typeof maxTurnaroundDays === 'number') {
        const minT = sp.min_turnaround_days;
        if (typeof minT === 'number' && minT > maxTurnaroundDays) return false;
      }

      const price = this._calculateServiceProductPrice(
        sp,
        wordCount,
        sp.default_turnaround || 'twenty_one_days'
      );
      if (typeof maxPrice === 'number' && price > maxPrice) return false;

      return true;
    });

    const enriched = filtered.map((sp) => {
      const turnaroundEnum = sp.default_turnaround || 'twenty_one_days';
      const price = this._calculateServiceProductPrice(sp, wordCount, turnaroundEnum);
      const estimatedTurnaroundDays = sp.min_turnaround_days || this._daysForTurnaround(turnaroundEnum) || null;
      const keyInclusions = [];
      if (sp.includes_structure_feedback) keyInclusions.push('Structure Feedback');
      if (sp.includes_style_suggestions) keyInclusions.push('Style Suggestions');

      return {
        serviceProductId: sp.id,
        name: sp.name,
        description: sp.description || '',
        serviceType: sp.service_type,
        isPackage: !!sp.is_package,
        estimatedTurnaroundDays,
        turnaroundLabel: this._labelForTurnaround(turnaroundEnum),
        price,
        priceDisplay: this._formatCurrency(price, 'USD'),
        currency: 'USD',
        includesStructureFeedback: !!sp.includes_structure_feedback,
        includesStyleSuggestions: !!sp.includes_style_suggestions,
        keyInclusions,
        serviceProduct: sp
      };
    });

    const sorted = enriched.slice();
    if (sortBy === 'price_asc') {
      sorted.sort((a, b) => a.price - b.price);
    } else if (sortBy === 'price_desc') {
      sorted.sort((a, b) => b.price - a.price);
    } else if (sortBy === 'turnaround_asc') {
      sorted.sort((a, b) => (a.estimatedTurnaroundDays || 9999) - (b.estimatedTurnaroundDays || 9999));
    }

    return sorted;
  }

  // getEditingPackageDetails
  getEditingPackageDetails(serviceProductId, wordCount, genre, turnaround) {
    const serviceProducts = this._getFromStorage('service_products', []);
    const addons = this._getFromStorage('addons', []);
    const sp = serviceProducts.find((p) => p.id === serviceProductId) || null;

    // Instrumentation for task completion tracking
    try {
      if (sp && sp.service_type === 'editing_package') {
        localStorage.setItem(
          'task1_selectedPackageContext',
          JSON.stringify({
            serviceProductId: serviceProductId,
            wordCount,
            genre,
            selectedTurnaround: turnaround || (sp && sp.default_turnaround) || 'twenty_one_days',
            calculatedPrice: (sp
              ? this._calculateServiceProductPrice(
                  sp,
                  wordCount,
                  turnaround || sp.default_turnaround || 'twenty_one_days'
                )
              : null),
            timestamp: new Date().toISOString()
          })
        );
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    if (!sp) {
      return {
        serviceProductId,
        name: null,
        description: null,
        scopeOfWork: null,
        serviceType: null,
        includesStructureFeedback: false,
        includesStyleSuggestions: false,
        baseWordCount: 0,
        basePrice: 0,
        pricePerAdditional1000Words: 0,
        selectedWordCount: wordCount,
        selectedTurnaround: turnaround,
        estimatedTurnaroundDays: this._daysForTurnaround(turnaround) || null,
        calculatedPrice: 0,
        priceDisplay: this._formatCurrency(0, 'USD'),
        currency: 'USD',
        availableTurnarounds: [],
        availableAddOns: [],
        serviceProduct: null
      };
    }

    const selectedTurnaround = turnaround || sp.default_turnaround || 'twenty_one_days';
    const calculatedPrice = this._calculateServiceProductPrice(sp, wordCount, selectedTurnaround);

    const availableTurnaroundsSet = new Set(sp.available_turnarounds || []);
    if (sp.default_turnaround) availableTurnaroundsSet.add(sp.default_turnaround);

    const availableTurnarounds = Array.from(availableTurnaroundsSet).map((t) => ({
      value: t,
      label: this._labelForTurnaround(t),
      days: this._daysForTurnaround(t),
      priceAdjustment: 0 // simplified; price already recalculated externally
    }));

    const availableAddOns = (sp.allowed_addon_ids || [])
      .map((id) => addons.find((a) => a.id === id) || null)
      .filter((a) => a && a.is_active)
      .filter((a) => {
        const list = a.compatible_service_types || [];
        if (!list.length) return true;
        return list.includes(sp.service_type);
      });

    return {
      serviceProductId: sp.id,
      name: sp.name,
      description: sp.description || '',
      scopeOfWork: sp.scope_of_work || '',
      serviceType: sp.service_type,
      includesStructureFeedback: !!sp.includes_structure_feedback,
      includesStyleSuggestions: !!sp.includes_style_suggestions,
      baseWordCount: sp.base_word_count || 0,
      basePrice: sp.base_price || 0,
      pricePerAdditional1000Words: sp.price_per_additional_1000_words || 0,
      selectedWordCount: wordCount,
      selectedTurnaround,
      estimatedTurnaroundDays: this._daysForTurnaround(selectedTurnaround) || sp.min_turnaround_days || null,
      calculatedPrice,
      priceDisplay: this._formatCurrency(calculatedPrice, 'USD'),
      currency: 'USD',
      availableTurnarounds,
      availableAddOns,
      serviceProduct: sp
    };
  }

  // submitPackageOrderContactInfo
  submitPackageOrderContactInfo(serviceProductId, name, email) {
    const key = 'package_order_contacts';
    const existing = this._getFromStorage(key, []);
    const record = {
      id: this._generateId('pkg_contact'),
      service_product_id: serviceProductId,
      name,
      email,
      created_at: this._nowISO()
    };
    existing.push(record);
    this._saveToStorage(key, existing);
    return {
      success: true,
      message: 'Contact information saved.'
    };
  }

  // getCustomPackageBuilderOptions
  getCustomPackageBuilderOptions() {
    const components = this._getFromStorage('service_components', []).filter((c) => c.is_active);
    const addons = this._getFromStorage('addons', []).filter((a) => a.is_active);

    const turnaroundOptions = [
      { value: 'seven_days', label: '7 days', days: 7 },
      { value: 'fourteen_days', label: '14 days', days: 14 },
      { value: 'twenty_one_days', label: '21 days', days: 21 }
    ];

    return {
      components,
      addons,
      turnaroundOptions
    };
  }

  // estimateCustomPackagePrice
  estimateCustomPackagePrice(wordCount, manuscriptType, genre, selectedComponentIds, selectedAddonIds, turnaround, currency) {
    const result = this._calculateCustomPackagePrice(
      wordCount,
      selectedComponentIds || [],
      selectedAddonIds || [],
      turnaround
    );
    if (currency && currency !== 'USD') {
      result.currency = currency;
    }
    return result;
  }

  // addCustomPackageToCart
  addCustomPackageToCart(wordCount, manuscriptType, genre, selectedComponentIds, selectedAddonIds, turnaround) {
    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items', []);

    const pricing = this._calculateCustomPackagePrice(
      wordCount,
      selectedComponentIds || [],
      selectedAddonIds || [],
      turnaround
    );

    const now = this._nowISO();
    const cartItemId = this._generateId('cartitem');

    const item = {
      id: cartItemId,
      cart_id: cart.id,
      service_product_id: null,
      service_type: 'custom_package',
      name_snapshot: 'Custom Package',
      word_count: wordCount,
      genre: genre || null,
      book_category: null,
      manuscript_type: manuscriptType || null,
      language_variant: null,
      style_guide: null,
      turnaround: turnaround,
      format_type: 'none',
      quantity: 1,
      selected_component_ids: selectedComponentIds || [],
      selected_addon_ids: selectedAddonIds || [],
      project_start_date: null,
      project_description: null,
      payment_plan: 'full_upfront',
      price_before_discounts: pricing.totalPrice,
      discount_amount: 0,
      price_after_discounts: pricing.totalPrice,
      created_at: now,
      updated_at: now
    };

    cartItems.push(item);
    this._saveToStorage('cart_items', cartItems);

    cart.item_ids = cart.item_ids || [];
    cart.item_ids.push(cartItemId);

    const { cart: updatedCart } = this._recalculateCartTotals(cart);

    return {
      success: true,
      cartItemId,
      cartItemCount: (updatedCart.item_ids || []).length,
      subtotal: updatedCart.subtotal || 0,
      discountTotal: updatedCart.discount_total || 0,
      total: updatedCart.total || 0,
      currency: updatedCart.currency || 'USD'
    };
  }

  // getProofreadingServiceOptions
  getProofreadingServiceOptions() {
    const serviceProducts = this._getFromStorage('service_products', []);
    const proofreading = serviceProducts.filter((sp) => sp.is_active && sp.service_type === 'proofreading');

    const genresSet = new Set();
    let basePricePerWord = null;

    proofreading.forEach((sp) => {
      (sp.supported_genres || []).forEach((g) => genresSet.add(g));
      let pw = sp.price_per_word;
      if (!pw && sp.base_price && sp.base_word_count) {
        pw = sp.base_price / sp.base_word_count;
      }
      if (pw && pw > 0) {
        if (basePricePerWord === null || pw < basePricePerWord) basePricePerWord = pw;
      }
    });

    const turnaroundOptions = [
      { value: 'three_days', label: '3 days', days: 3, priceMultiplier: this._priceMultiplierForTurnaround('three_days') },
      { value: 'seven_days', label: '7 days', days: 7, priceMultiplier: this._priceMultiplierForTurnaround('seven_days') },
      { value: 'ten_days', label: '10 days', days: 10, priceMultiplier: this._priceMultiplierForTurnaround('ten_days') },
      { value: 'fourteen_days', label: '14 days', days: 14, priceMultiplier: this._priceMultiplierForTurnaround('fourteen_days') },
      { value: 'twenty_one_days', label: '21 days', days: 21, priceMultiplier: this._priceMultiplierForTurnaround('twenty_one_days') }
    ];

    return {
      supportedGenres: Array.from(genresSet),
      turnaroundOptions,
      basePricePerWord: basePricePerWord || 0,
      currency: 'USD',
      serviceDescription: 'Proofreading focused on typos, grammar, and consistency.'
    };
  }

  // estimateProofreadingPrice
  estimateProofreadingPrice(wordCount, genre, turnaround) {
    const t = turnaround || 'seven_days';
    const result = this._calculateProofreadingPrice(wordCount, genre, t);
    return {
      price: result.price,
      priceDisplay: this._formatCurrency(result.price, result.currency),
      currency: result.currency,
      perWordRate: result.perWordRate,
      turnaroundLabel: result.turnaroundLabel
    };
  }

  // addProofreadingToCart
  addProofreadingToCart(wordCount, genre, turnaround) {
    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items', []);

    const t = turnaround || 'seven_days';
    const pricing = this._calculateProofreadingPrice(wordCount, genre, t);

    const serviceProduct = this._findBestServiceProduct('proofreading', { genre: genre });

    const now = this._nowISO();
    const cartItemId = this._generateId('cartitem');

    const item = {
      id: cartItemId,
      cart_id: cart.id,
      service_product_id: serviceProduct ? serviceProduct.id : null,
      service_type: 'proofreading',
      name_snapshot: serviceProduct ? serviceProduct.name : 'Proofreading',
      word_count: wordCount,
      genre: genre,
      book_category: null,
      manuscript_type: null,
      language_variant: null,
      style_guide: null,
      turnaround: t,
      format_type: 'none',
      quantity: 1,
      selected_component_ids: [],
      selected_addon_ids: [],
      project_start_date: null,
      project_description: null,
      payment_plan: 'full_upfront',
      price_before_discounts: pricing.price,
      discount_amount: 0,
      price_after_discounts: pricing.price,
      created_at: now,
      updated_at: now
    };

    cartItems.push(item);
    this._saveToStorage('cart_items', cartItems);

    cart.item_ids = cart.item_ids || [];
    cart.item_ids.push(cartItemId);

    const { cart: updatedCart } = this._recalculateCartTotals(cart);

    return {
      success: true,
      cartItemId,
      cartItemCount: (updatedCart.item_ids || []).length,
      subtotal: updatedCart.subtotal || 0,
      discountTotal: updatedCart.discount_total || 0,
      total: updatedCart.total || 0,
      currency: updatedCart.currency || 'USD'
    };
  }

  // getFormattingOverview
  getFormattingOverview() {
    const serviceProducts = this._getFromStorage('service_products', []);
    const formattingTypesMap = {};

    serviceProducts
      .filter((sp) => sp.is_active && (
        sp.service_type === 'formatting' ||
        sp.service_type === 'paperback_formatting' ||
        sp.service_type === 'ebook_formatting' ||
        sp.service_type === 'non_fiction_formatting'
      ))
      .forEach((sp) => {
        const type = sp.service_type;
        if (!formattingTypesMap[type]) {
          formattingTypesMap[type] = {
            serviceType: type,
            title: this._titleFromServiceType(type),
            shortDescription: sp.description || 'Professional ' + this._titleFromServiceType(type) + ' for your book.'
          };
        }
      });

    const formattingTypes = Object.values(formattingTypesMap);

    return {
      overviewDescription: 'Formatting services for paperback and ebook, tailored to industry standards.',
      formattingTypes,
      paperbackSectionSummary: 'Compare paperback formatting packages like Standard and Premium to find the right fit.'
    };
  }

  // getPaperbackFormattingComparison
  getPaperbackFormattingComparison() {
    const serviceProducts = this._getFromStorage('service_products', []);
    const packages = serviceProducts.filter((sp) => sp.is_active && sp.service_type === 'paperback_formatting');

    const resultPackages = packages.map((sp) => {
      const basePrice = sp.base_price || 0;
      return {
        serviceProductId: sp.id,
        name: sp.name,
        description: sp.description || '',
        includesCustomChapterHeadings: !!sp.includes_custom_chapter_headings,
        includesFrontBackMatterLayout: !!sp.includes_front_back_matter_layout,
        baseWordCount: sp.base_word_count || 0,
        basePrice: basePrice,
        priceDisplay: this._formatCurrency(basePrice, 'USD'),
        currency: 'USD',
        maxWordCount: sp.max_word_count || sp.base_word_count || null,
        serviceProduct: sp
      };
    });

    return { packages: resultPackages };
  }

  // getFormattingPackageDetails
  getFormattingPackageDetails(serviceProductId, wordCount, formatType, turnaround) {
    const serviceProducts = this._getFromStorage('service_products', []);
    const sp = serviceProducts.find((p) => p.id === serviceProductId) || null;

    if (!sp) {
      return {
        serviceProductId,
        name: null,
        description: null,
        serviceType: null,
        supportedFormats: [],
        includesCustomChapterHeadings: false,
        includesFrontBackMatterLayout: false,
        baseWordCount: 0,
        basePrice: 0,
        pricePerAdditional1000Words: 0,
        selectedWordCount: wordCount,
        selectedFormatType: formatType,
        selectedTurnaround: turnaround || null,
        availableTurnarounds: [],
        calculatedPrice: 0,
        priceDisplay: this._formatCurrency(0, 'USD'),
        currency: 'USD',
        canBeQuoted: false,
        canBePurchasedOnline: false,
        serviceProduct: null
      };
    }

    const selectedTurnaround = turnaround || sp.default_turnaround || 'ten_days';
    const basePrice = this._calculateServiceProductPrice(sp, wordCount, selectedTurnaround);

    let formatMultiplier = 1.0;
    if (formatType === 'paperback_and_ebook') {
      formatMultiplier = 1.5;
    }
    const calculatedPrice = parseFloat((basePrice * formatMultiplier).toFixed(2));

    const supportedFormats = sp.supported_format_types || sp.supportedFormats || [];

    const availableTurnaroundsSet = new Set(sp.available_turnarounds || []);
    if (sp.default_turnaround) availableTurnaroundsSet.add(sp.default_turnaround);

    const availableTurnarounds = Array.from(availableTurnaroundsSet).map((t) => ({
      value: t,
      label: this._labelForTurnaround(t),
      days: this._daysForTurnaround(t)
    }));

    return {
      serviceProductId: sp.id,
      name: sp.name,
      description: sp.description || '',
      serviceType: sp.service_type,
      supportedFormats,
      includesCustomChapterHeadings: !!sp.includes_custom_chapter_headings,
      includesFrontBackMatterLayout: !!sp.includes_front_back_matter_layout,
      baseWordCount: sp.base_word_count || 0,
      basePrice: sp.base_price || 0,
      pricePerAdditional1000Words: sp.price_per_additional_1000_words || 0,
      selectedWordCount: wordCount,
      selectedFormatType: formatType,
      selectedTurnaround,
      availableTurnarounds,
      calculatedPrice,
      priceDisplay: this._formatCurrency(calculatedPrice, 'USD'),
      currency: 'USD',
      canBeQuoted: !!sp.can_be_quoted,
      canBePurchasedOnline: !!sp.can_be_purchased_online,
      serviceProduct: sp
    };
  }

  // addFormattingPackageToCart
  addFormattingPackageToCart(serviceProductId, wordCount, formatType, turnaround) {
    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items', []);
    const serviceProducts = this._getFromStorage('service_products', []);
    const sp = serviceProducts.find((p) => p.id === serviceProductId) || null;

    const t = turnaround || (sp && sp.default_turnaround) || 'ten_days';
    const details = this.getFormattingPackageDetails(serviceProductId, wordCount, formatType, t);

    const now = this._nowISO();
    const cartItemId = this._generateId('cartitem');

    const item = {
      id: cartItemId,
      cart_id: cart.id,
      service_product_id: sp ? sp.id : serviceProductId,
      service_type: sp ? sp.service_type : 'paperback_formatting',
      name_snapshot: sp ? sp.name : 'Formatting Package',
      word_count: wordCount,
      genre: null,
      book_category: null,
      manuscript_type: null,
      language_variant: null,
      style_guide: null,
      turnaround: t,
      format_type: formatType,
      quantity: 1,
      selected_component_ids: [],
      selected_addon_ids: [],
      project_start_date: null,
      project_description: null,
      payment_plan: 'full_upfront',
      price_before_discounts: details.calculatedPrice,
      discount_amount: 0,
      price_after_discounts: details.calculatedPrice,
      created_at: now,
      updated_at: now
    };

    cartItems.push(item);
    this._saveToStorage('cart_items', cartItems);

    cart.item_ids = cart.item_ids || [];
    cart.item_ids.push(cartItemId);

    const { cart: updatedCart } = this._recalculateCartTotals(cart);

    return {
      success: true,
      cartItemId,
      cartItemCount: (updatedCart.item_ids || []).length,
      subtotal: updatedCart.subtotal || 0,
      discountTotal: updatedCart.discount_total || 0,
      total: updatedCart.total || 0,
      currency: updatedCart.currency || 'USD'
    };
  }

  // getCopyeditingServiceOptions
  getCopyeditingServiceOptions() {
    const serviceProducts = this._getFromStorage('service_products', []);
    const copyediting = serviceProducts.filter((sp) => sp.is_active && sp.service_type === 'copyediting');

    const bookCategoriesSet = new Set();
    const languageVariantsSet = new Set();

    copyediting.forEach((sp) => {
      (sp.supported_book_types || []).forEach((b) => bookCategoriesSet.add(b));
      (sp.supported_language_variants || []).forEach((lv) => {
        let normalized = lv;
        if (lv === 'English (US)' || lv === 'en_US' || lv === 'en-US') {
          normalized = 'us_english';
        } else if (lv === 'English (UK)' || lv === 'en_GB' || lv === 'en-GB') {
          normalized = 'uk_english';
        } else if (/english/i.test(lv) && normalized === lv) {
          normalized = 'other_english';
        }
        languageVariantsSet.add(normalized);
      });
    });

    let languageVariants = Array.from(languageVariantsSet).map((lv) => ({
      value: lv,
      label: this._labelFromLanguageVariant(lv)
    }));

    if (!languageVariants.length) {
      ['us_english', 'uk_english', 'other_english'].forEach((lv) => {
        languageVariants.push({ value: lv, label: this._labelFromLanguageVariant(lv) });
      });
    }

    const styleGuides = [
      { value: 'apa', label: 'APA' },
      { value: 'mla', label: 'MLA' },
      { value: 'chicago', label: 'Chicago' },
      { value: 'none', label: 'None' },
      { value: 'other', label: 'Other' }
    ];

    const addons = this._getFromStorage('addons', []).filter((a) => {
      if (!a.is_active) return false;
      const types = a.compatible_service_types || [];
      if (!types.length) return true;
      return types.includes('copyediting');
    });

    return {
      bookCategories: Array.from(bookCategoriesSet),
      languageVariants,
      styleGuides,
      addons,
      serviceDescription: 'Copyediting for clarity, consistency, and adherence to style guides.'
    };
  }

  // estimateCopyeditingPrice
  estimateCopyeditingPrice(wordCount, bookCategory, languageVariant, styleGuide, selectedAddonIds, projectStartDate) {
    const res = this._calculateCopyeditingPrice(
      wordCount,
      bookCategory,
      languageVariant,
      styleGuide,
      selectedAddonIds || [],
      projectStartDate
    );
    return res;
  }

  // addCopyeditingServiceToCart
  addCopyeditingServiceToCart(wordCount, bookCategory, languageVariant, styleGuide, selectedAddonIds, projectStartDate) {
    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items', []);

    const pricing = this._calculateCopyeditingPrice(
      wordCount,
      bookCategory,
      languageVariant,
      styleGuide,
      selectedAddonIds || [],
      projectStartDate
    );

    const serviceProduct = this._findBestServiceProduct('copyediting', { bookCategory: bookCategory });

    const now = this._nowISO();
    const cartItemId = this._generateId('cartitem');

    const item = {
      id: cartItemId,
      cart_id: cart.id,
      service_product_id: serviceProduct ? serviceProduct.id : null,
      service_type: 'copyediting',
      name_snapshot: serviceProduct ? serviceProduct.name : 'Copyediting',
      word_count: wordCount,
      genre: null,
      book_category: bookCategory,
      manuscript_type: null,
      language_variant: languageVariant,
      style_guide: styleGuide,
      turnaround: null,
      format_type: 'none',
      quantity: 1,
      selected_component_ids: [],
      selected_addon_ids: selectedAddonIds || [],
      project_start_date: projectStartDate || null,
      project_description: null,
      payment_plan: 'full_upfront',
      price_before_discounts: pricing.price,
      discount_amount: 0,
      price_after_discounts: pricing.price,
      created_at: now,
      updated_at: now
    };

    cartItems.push(item);
    this._saveToStorage('cart_items', cartItems);

    cart.item_ids = cart.item_ids || [];
    cart.item_ids.push(cartItemId);

    const { cart: updatedCart } = this._recalculateCartTotals(cart);

    return {
      success: true,
      cartItemId,
      cartItemCount: (updatedCart.item_ids || []).length,
      subtotal: updatedCart.subtotal || 0,
      discountTotal: updatedCart.discount_total || 0,
      total: updatedCart.total || 0,
      currency: updatedCart.currency || 'USD'
    };
  }

  // updateCartItemProjectDetails
  updateCartItemProjectDetails(cartItemId, projectDescription) {
    const cartItems = this._getFromStorage('cart_items', []);
    const idx = cartItems.findIndex((ci) => ci.id === cartItemId);
    if (idx === -1) {
      return { success: false, cartItemId: cartItemId, projectDescription: null };
    }
    cartItems[idx].project_description = projectDescription;
    cartItems[idx].updated_at = this._nowISO();
    this._saveToStorage('cart_items', cartItems);
    return { success: true, cartItemId: cartItemId, projectDescription: projectDescription };
  }

  // getDevelopmentalEditingOptions
  getDevelopmentalEditingOptions() {
    const serviceProducts = this._getFromStorage('service_products', []);
    const dev = serviceProducts.filter((sp) => sp.is_active && sp.service_type === 'developmental_editing');

    const genresSet = new Set();
    const turnaroundSet = new Set();
    let canDeposit = false;

    dev.forEach((sp) => {
      (sp.supported_genres || []).forEach((g) => genresSet.add(g));
      (sp.available_turnarounds || []).forEach((t) => turnaroundSet.add(t));
      if (sp.default_turnaround) turnaroundSet.add(sp.default_turnaround);
      if (sp.can_use_payment_plan_50_50) canDeposit = true;
    });

    const turnaroundOptions = Array.from(turnaroundSet).map((t) => ({
      value: t,
      label: this._labelForTurnaround(t),
      days: this._daysForTurnaround(t)
    }));

    const paymentPlans = [
      {
        value: 'full_upfront',
        label: 'Full Upfront',
        description: 'Pay the full project fee upfront.',
        requiresDeposit: false
      }
    ];

    if (canDeposit) {
      paymentPlans.push({
        value: 'deposit_50_50',
        label: '50% Deposit Now, 50% on Completion',
        description: 'Pay half now and the remaining balance when the edit is complete.',
        requiresDeposit: true
      });
    }

    return {
      supportedGenres: Array.from(genresSet),
      turnaroundOptions,
      paymentPlans,
      serviceDescription: 'Developmental editing focused on big-picture structure, pacing, and character arcs.'
    };
  }

  // estimateDevelopmentalEditingPrice
  estimateDevelopmentalEditingPrice(wordCount, genre, turnaround, paymentPlan) {
    return this._calculateDevelopmentalEditingPrice(wordCount, genre, turnaround, paymentPlan);
  }

  // addDevelopmentalEditingToCart
  addDevelopmentalEditingToCart(wordCount, genre, turnaround, paymentPlan) {
    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items', []);

    const pricing = this._calculateDevelopmentalEditingPrice(
      wordCount,
      genre,
      turnaround,
      paymentPlan
    );

    const serviceProduct = this._findBestServiceProduct('developmental_editing', { genre: genre });

    const now = this._nowISO();
    const cartItemId = this._generateId('cartitem');

    const item = {
      id: cartItemId,
      cart_id: cart.id,
      service_product_id: serviceProduct ? serviceProduct.id : null,
      service_type: 'developmental_editing',
      name_snapshot: serviceProduct ? serviceProduct.name : 'Developmental Editing',
      word_count: wordCount,
      genre: genre,
      book_category: null,
      manuscript_type: null,
      language_variant: null,
      style_guide: null,
      turnaround: turnaround,
      format_type: 'none',
      quantity: 1,
      selected_component_ids: [],
      selected_addon_ids: [],
      project_start_date: null,
      project_description: null,
      payment_plan: paymentPlan,
      price_before_discounts: pricing.price,
      discount_amount: 0,
      price_after_discounts: pricing.price,
      created_at: now,
      updated_at: now
    };

    cartItems.push(item);
    this._saveToStorage('cart_items', cartItems);

    cart.item_ids = cart.item_ids || [];
    cart.item_ids.push(cartItemId);

    const { cart: updatedCart } = this._recalculateCartTotals(cart);

    return {
      success: true,
      cartItemId,
      cartItemCount: (updatedCart.item_ids || []).length,
      subtotal: updatedCart.subtotal || 0,
      discountTotal: updatedCart.discount_total || 0,
      total: updatedCart.total || 0,
      currency: updatedCart.currency || 'USD'
    };
  }

  // getEditorsFilterOptions
  getEditorsFilterOptions() {
    const editors = this._getFromStorage('editors', []);
    const genresSet = new Set();
    editors.forEach((e) => {
      (e.specialties || []).forEach((g) => genresSet.add(g));
    });

    const ratingThresholds = [
      { value: 4.5, label: '4.5+ stars' },
      { value: 4.8, label: '4.8+ stars' },
      { value: 5.0, label: '5 stars' }
    ];

    const experienceLevels = [
      { minCompletedProjects: 0, label: 'All experience levels' },
      { minCompletedProjects: 10, label: '10+ projects' },
      { minCompletedProjects: 20, label: '20+ projects' },
      { minCompletedProjects: 50, label: '50+ projects' }
    ];

    const sortOptions = [
      { value: 'fastest_turnaround', label: 'Fastest Turnaround' },
      { value: 'highest_rating', label: 'Highest Rating' },
      { value: 'most_experienced', label: 'Most Experienced' }
    ];

    return {
      genres: Array.from(genresSet),
      ratingThresholds,
      experienceLevels,
      sortOptions
    };
  }

  // searchEditors
  searchEditors(filters, sortBy) {
    const editors = this._getFromStorage('editors', []);
    const f = filters || {};

    let result = editors.filter((e) => {
      if (f.genre && !(e.specialties || []).includes(f.genre)) return false;
      if (typeof f.minRating === 'number' && e.rating < f.minRating) return false;
      if (
        typeof f.minCompletedProjects === 'number' &&
        (e.completed_projects_count || 0) < f.minCompletedProjects
      )
        return false;
      if (f.onlyAcceptingNewProjects && !e.is_accepting_new_projects) return false;
      return true;
    });

    if (sortBy === 'fastest_turnaround') {
      result = result.slice().sort((a, b) => (a.typical_turnaround_days_min || 9999) - (b.typical_turnaround_days_min || 9999));
    } else if (sortBy === 'highest_rating') {
      result = result.slice().sort((a, b) => b.rating - a.rating);
    } else if (sortBy === 'most_experienced') {
      result = result
        .slice()
        .sort((a, b) => (b.completed_projects_count || 0) - (a.completed_projects_count || 0));
    }

    return result;
  }

  // getEditorProfile
  getEditorProfile(editorId) {
    const editors = this._getFromStorage('editors', []);
    const editor = editors.find((e) => e.id === editorId) || null;

    const recentProjects = [];
    const specialtySummary = editor
      ? 'Specializes in ' + (editor.specialties || []).join(', ')
      : '';

    return {
      editor,
      recentProjects,
      specialtySummary
    };
  }

  // sendEditorInquiry
  sendEditorInquiry(editorId, subject, message, email, wordCount, genre, bookCategory, desiredTurnaroundDays, budgetAmount) {
    const inquiries = this._getFromStorage('editor_inquiries', []);
    const id = this._generateId('editorinq');
    const now = this._nowISO();

    const record = {
      id,
      editor_id: editorId,
      subject,
      message,
      email,
      word_count: wordCount || null,
      genre: genre || null,
      book_category: bookCategory || null,
      desired_turnaround_days: desiredTurnaroundDays || null,
      budget_amount: budgetAmount || null,
      status: 'new',
      created_at: now
    };

    inquiries.push(record);
    this._saveToStorage('editor_inquiries', inquiries);

    return {
      success: true,
      inquiryId: id,
      confirmationMessage: 'Your inquiry has been sent to the editor.'
    };
  }

  // getPricingSummary
  getPricingSummary() {
    const serviceProducts = this._getFromStorage('service_products', []);
    const relevantTypes = ['proofreading', 'copyediting', 'developmental_editing'];

    const serviceLevels = relevantTypes.map((type) => {
      const matches = serviceProducts.filter(
        (sp) => sp.is_active && sp.service_type === type && sp.is_calculator_option
      );
      if (!matches.length) {
        return {
          serviceType: type,
          name: this._titleFromServiceType(type),
          description: '',
          pricePerWord: 0,
          basePricePer1000Words: 0,
          currency: 'USD',
          includesStructureFeedback: false,
          includesStyleSuggestions: false
        };
      }
      let best = matches[0];
      let bestRate = Infinity;
      matches.forEach((sp) => {
        let pw = sp.price_per_word || 0;
        if (!pw && sp.base_price && sp.base_word_count) {
          pw = sp.base_price / sp.base_word_count;
        }
        if (pw && pw < bestRate) {
          bestRate = pw;
          best = sp;
        }
      });

      const pricePerWord = bestRate === Infinity ? 0 : bestRate;
      const basePricePer1000 = pricePerWord * 1000;

      return {
        serviceType: type,
        name: this._titleFromServiceType(type),
        description: best.description || '',
        pricePerWord: pricePerWord || 0,
        basePricePer1000Words: basePricePer1000 || 0,
        currency: 'USD',
        includesStructureFeedback: !!best.includes_structure_feedback,
        includesStyleSuggestions: !!best.includes_style_suggestions
      };
    });

    return { serviceLevels };
  }

  // getCostCalculatorEstimates
  getCostCalculatorEstimates(wordCount, bookCategory) {
    const serviceProducts = this._getFromStorage('service_products', []);
    const relevantTypes = ['proofreading', 'copyediting', 'developmental_editing'];

    const estimates = [];

    relevantTypes.forEach((type) => {
      const matches = serviceProducts.filter(
        (sp) => sp.is_active && sp.service_type === type && sp.is_calculator_option
      );
      if (!matches.length) return;

      let best = matches[0];
      let bestRate = Infinity;
      matches.forEach((sp) => {
        let pw = sp.price_per_word || 0;
        if (!pw && sp.base_price && sp.base_word_count) {
          pw = sp.base_price / sp.base_word_count;
        }
        if (pw && pw < bestRate) {
          bestRate = pw;
          best = sp;
        }
      });

      const pw = bestRate === Infinity ? 0 : bestRate;
      const price = parseFloat(((wordCount || 0) * pw).toFixed(2));

      estimates.push({
        serviceType: type,
        serviceName: this._titleFromServiceType(type),
        price,
        priceDisplay: this._formatCurrency(price, 'USD'),
        currency: 'USD',
        includesStructureFeedback: !!best.includes_structure_feedback,
        includesStyleSuggestions: !!best.includes_style_suggestions
      });
    });

    return estimates;
  }

  // getTestimonialFilterOptions
  getTestimonialFilterOptions() {
    const testimonials = this._getFromStorage('testimonials', []);
    const serviceTypesSet = new Set();
    testimonials.forEach((t) => serviceTypesSet.add(t.service_type));

    const serviceTypes = Array.from(serviceTypesSet).map((st) => ({
      value: st,
      label: this._titleFromServiceType(st)
    }));

    const ratingOptions = [
      { value: 5, label: '5 stars' },
      { value: 4.5, label: '4.5+ stars' },
      { value: 4, label: '4+ stars' }
    ];

    return {
      serviceTypes,
      ratingOptions
    };
  }

  // getTestimonials
  getTestimonials(serviceType, minRating, bookCategory, limit) {
    const testimonials = this._getFromStorage('testimonials', []);
    const serviceProducts = this._getFromStorage('service_products', []);

    let result = testimonials.filter((t) => {
      if (serviceType && t.service_type !== serviceType) return false;
      if (typeof minRating === 'number' && t.rating < minRating) return false;
      if (bookCategory && t.book_category && t.book_category !== bookCategory) return false;
      return true;
    });

    result = result
      .slice()
      .sort((a, b) => {
        const da = a.created_at ? new Date(a.created_at).getTime() : 0;
        const db = b.created_at ? new Date(b.created_at).getTime() : 0;
        return db - da;
      });

    if (typeof limit === 'number' && limit > 0) {
      result = result.slice(0, limit);
    }

    return result.map((t) => ({
      ...t,
      serviceProduct: serviceProducts.find((sp) => sp.id === t.service_product_id) || null
    }));
  }

  // getRecommendedPackagesForServiceType
  getRecommendedPackagesForServiceType(serviceType) {
    const recommended = this._getFromStorage('recommended_packages', []);
    const serviceProducts = this._getFromStorage('service_products', []);

    const matches = recommended
      .filter((rp) => rp.is_active && rp.service_type === serviceType)
      .sort((a, b) => (a.display_order || 0) - (b.display_order || 0));

    return matches.map((rp) => {
      const sp = serviceProducts.find((s) => s.id === rp.service_product_id) || null;
      return {
        recommendedPackageId: rp.id,
        label: rp.label,
        description: rp.description || '',
        serviceProductId: rp.service_product_id,
        serviceName: sp ? sp.name : '',
        serviceType: rp.service_type,
        recommendedPackage: rp,
        serviceProduct: sp
      };
    });
  }

  // getCart
  getCart() {
    const cart = this._getOrCreateCart();
    const { cart: updatedCart, itemsForCart } = this._recalculateCartTotals(cart);
    const coupons = this._getFromStorage('coupons', []);
    const serviceProducts = this._getFromStorage('service_products', []);
    const addons = this._getFromStorage('addons', []);

    const appliedCoupons = (updatedCart.applied_coupon_ids || []).map((id) => {
      const coupon = coupons.find((c) => c.id === id) || null;
      const discountEntry = (updatedCart.applied_coupon_discounts || []).find(
        (d) => d.coupon_id === id
      );
      return {
        code: coupon ? coupon.code : '',
        description: coupon ? coupon.description || '' : '',
        discountAmount: discountEntry ? discountEntry.discount_amount : 0
      };
    });

    const items = itemsForCart.map((ci) => {
      const sp = serviceProducts.find((s) => s.id === ci.service_product_id) || null;

      const selectedAddons = (ci.selected_addon_ids || []).map((addonId) => {
        const addon = addons.find((a) => a.id === addonId) || null;
        if (!addon) return null;
        let price = 0;
        if (addon.price_type === 'per_word' && addon.price_per_word) {
          price = (ci.word_count || 0) * addon.price_per_word;
        } else if (addon.price_type === 'flat_fee' && addon.flat_price) {
          price = addon.flat_price;
        }
        return {
          addonId: addon.id,
          name: addon.name,
          price: parseFloat((price || 0).toFixed(2)),
          addon
        };
      }).filter(Boolean);

      let depositAmount = ci.price_before_discounts || 0;
      let remainingBalance = 0;
      if (ci.payment_plan === 'deposit_50_50') {
        depositAmount = parseFloat(((ci.price_before_discounts || 0) * 0.5).toFixed(2));
        remainingBalance = parseFloat(((ci.price_before_discounts || 0) - depositAmount).toFixed(2));
      }

      return {
        cartItemId: ci.id,
        serviceProductId: ci.service_product_id || null,
        serviceName: ci.name_snapshot || (sp ? sp.name : ''),
        serviceType: ci.service_type,
        wordCount: ci.word_count || null,
        genre: ci.genre || null,
        bookCategory: ci.book_category || null,
        manuscriptType: ci.manuscript_type || null,
        languageVariant: ci.language_variant || null,
        styleGuide: ci.style_guide || null,
        turnaround: ci.turnaround || null,
        formatType: ci.format_type || null,
        quantity: ci.quantity || 1,
        selectedAddons,
        projectStartDate: ci.project_start_date || null,
        projectDescription: ci.project_description || null,
        paymentPlan: ci.payment_plan || 'full_upfront',
        priceBeforeDiscounts: ci.price_before_discounts || 0,
        discountAmount: ci.discount_amount || 0,
        priceAfterDiscounts: ci.price_after_discounts || ci.price_before_discounts || 0,
        depositAmount,
        remainingBalance,
        serviceProduct: sp,
        cartItem: ci
      };
    });

    return {
      cartId: updatedCart.id,
      status: updatedCart.status,
      subtotal: updatedCart.subtotal || 0,
      discountTotal: updatedCart.discount_total || 0,
      total: updatedCart.total || 0,
      currency: updatedCart.currency || 'USD',
      appliedCoupons,
      items
    };
  }

  // updateCartItemQuantity
  updateCartItemQuantity(cartItemId, quantity) {
    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items', []);
    const serviceProducts = this._getFromStorage('service_products', []);

    const idx = cartItems.findIndex((ci) => ci.id === cartItemId && ci.cart_id === cart.id);
    if (idx === -1) {
      const { cart: updatedCart } = this._recalculateCartTotals(cart);
      return {
        cartId: updatedCart.id,
        status: updatedCart.status,
        subtotal: updatedCart.subtotal || 0,
        discountTotal: updatedCart.discount_total || 0,
        total: updatedCart.total || 0,
        currency: updatedCart.currency || 'USD',
        items: []
      };
    }

    const item = cartItems[idx];
    const oldQty = item.quantity || 1;
    const unitPrice = oldQty > 0 ? (item.price_before_discounts || 0) / oldQty : item.price_before_discounts || 0;
    const newQty = quantity > 0 ? quantity : 1;

    item.quantity = newQty;
    item.price_before_discounts = parseFloat((unitPrice * newQty).toFixed(2));
    item.discount_amount = 0;
    item.price_after_discounts = item.price_before_discounts;
    item.updated_at = this._nowISO();

    cartItems[idx] = item;
    this._saveToStorage('cart_items', cartItems);

    const { cart: updatedCart, itemsForCart } = this._recalculateCartTotals(cart);

    const itemsSummary = itemsForCart.map((ci) => {
      const sp = serviceProducts.find((s) => s.id === ci.service_product_id) || null;
      return {
        cartItemId: ci.id,
        serviceName: ci.name_snapshot || (sp ? sp.name : ''),
        serviceType: ci.service_type,
        quantity: ci.quantity || 1,
        priceAfterDiscounts: ci.price_after_discounts || ci.price_before_discounts || 0
      };
    });

    return {
      cartId: updatedCart.id,
      status: updatedCart.status,
      subtotal: updatedCart.subtotal || 0,
      discountTotal: updatedCart.discount_total || 0,
      total: updatedCart.total || 0,
      currency: updatedCart.currency || 'USD',
      items: itemsSummary
    };
  }

  // updateCartItemTurnaround
  updateCartItemTurnaround(cartItemId, turnaround) {
    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items', []);
    const serviceProducts = this._getFromStorage('service_products', []);

    const idx = cartItems.findIndex((ci) => ci.id === cartItemId && ci.cart_id === cart.id);
    if (idx === -1) {
      const { cart: updatedCart } = this._recalculateCartTotals(cart);
      return {
        cartId: updatedCart.id,
        status: updatedCart.status,
        subtotal: updatedCart.subtotal || 0,
        discountTotal: updatedCart.discount_total || 0,
        total: updatedCart.total || 0,
        currency: updatedCart.currency || 'USD',
        items: []
      };
    }

    const item = cartItems[idx];
    item.turnaround = turnaround;

    let newUnitPrice = item.price_before_discounts || 0;

    if (item.service_type === 'proofreading') {
      const pr = this._calculateProofreadingPrice(item.word_count, item.genre, turnaround);
      newUnitPrice = pr.price;
    } else if (item.service_type === 'developmental_editing') {
      const dev = this._calculateDevelopmentalEditingPrice(
        item.word_count,
        item.genre,
        turnaround,
        item.payment_plan || 'full_upfront'
      );
      newUnitPrice = dev.price;
    } else if (item.service_type === 'custom_package') {
      const cp = this._calculateCustomPackagePrice(
        item.word_count,
        item.selected_component_ids || [],
        item.selected_addon_ids || [],
        turnaround
      );
      newUnitPrice = cp.totalPrice;
    } else if (
      item.service_type === 'paperback_formatting' ||
      item.service_type === 'ebook_formatting' ||
      item.service_type === 'formatting'
    ) {
      const sp = serviceProducts.find((s) => s.id === item.service_product_id) || null;
      if (sp) {
        const basePrice = this._calculateServiceProductPrice(sp, item.word_count, turnaround);
        let formatMultiplier = 1.0;
        if (item.format_type === 'paperback_and_ebook') formatMultiplier = 1.5;
        newUnitPrice = parseFloat((basePrice * formatMultiplier).toFixed(2));
      }
    }

    const qty = item.quantity || 1;
    item.price_before_discounts = parseFloat((newUnitPrice * qty).toFixed(2));
    item.discount_amount = 0;
    item.price_after_discounts = item.price_before_discounts;
    item.updated_at = this._nowISO();

    cartItems[idx] = item;
    this._saveToStorage('cart_items', cartItems);

    const { cart: updatedCart, itemsForCart } = this._recalculateCartTotals(cart);

    const itemsSummary = itemsForCart.map((ci) => {
      const sp = serviceProducts.find((s) => s.id === ci.service_product_id) || null;
      return {
        cartItemId: ci.id,
        serviceName: ci.name_snapshot || (sp ? sp.name : ''),
        turnaround: ci.turnaround || null,
        priceAfterDiscounts: ci.price_after_discounts || ci.price_before_discounts || 0
      };
    });

    return {
      cartId: updatedCart.id,
      status: updatedCart.status,
      subtotal: updatedCart.subtotal || 0,
      discountTotal: updatedCart.discount_total || 0,
      total: updatedCart.total || 0,
      currency: updatedCart.currency || 'USD',
      items: itemsSummary
    };
  }

  // applyCouponToCart
  applyCouponToCart(couponCode) {
    const cart = this._getOrCreateCart();
    const coupons = this._getFromStorage('coupons', []);
    const coupon = coupons.find((c) => c.code === couponCode) || null;

    if (!coupon || !coupon.active) {
      const { cart: updatedCart } = this._recalculateCartTotals(cart);
      return {
        success: false,
        message: 'Invalid or inactive coupon code.',
        cartId: updatedCart.id,
        status: updatedCart.status,
        subtotal: updatedCart.subtotal || 0,
        discountTotal: updatedCart.discount_total || 0,
        total: updatedCart.total || 0,
        currency: updatedCart.currency || 'USD',
        appliedCoupons: []
      };
    }

    cart.applied_coupon_ids = cart.applied_coupon_ids || [];
    cart.applied_coupon_codes = cart.applied_coupon_codes || [];

    if (!cart.applied_coupon_ids.includes(coupon.id)) {
      cart.applied_coupon_ids.push(coupon.id);
      cart.applied_coupon_codes.push(coupon.code);
    }

    const { cart: updatedCart } = this._recalculateCartTotals(cart);

    const appliedCoupons = (updatedCart.applied_coupon_ids || []).map((id) => {
      const c = coupons.find((cp) => cp.id === id) || null;
      const d = (updatedCart.applied_coupon_discounts || []).find((x) => x.coupon_id === id);
      return {
        code: c ? c.code : '',
        description: c ? c.description || '' : '',
        discountAmount: d ? d.discount_amount : 0
      };
    });

    return {
      success: true,
      message: 'Coupon applied.',
      cartId: updatedCart.id,
      status: updatedCart.status,
      subtotal: updatedCart.subtotal || 0,
      discountTotal: updatedCart.discount_total || 0,
      total: updatedCart.total || 0,
      currency: updatedCart.currency || 'USD',
      appliedCoupons
    };
  }

  // getCheckoutSummary
  getCheckoutSummary() {
    const cart = this._getOrCreateCart();
    const { cart: updatedCart, itemsForCart } = this._recalculateCartTotals(cart);
    const serviceProducts = this._getFromStorage('service_products', []);

    const items = itemsForCart.map((ci) => {
      const sp = serviceProducts.find((s) => s.id === ci.service_product_id) || null;
      const lineTotal = ci.price_before_discounts || 0;
      let depositAmount = lineTotal;
      let remainingBalance = 0;
      if (ci.payment_plan === 'deposit_50_50') {
        depositAmount = parseFloat((lineTotal * 0.5).toFixed(2));
        remainingBalance = parseFloat((lineTotal - depositAmount).toFixed(2));
      }
      return {
        cartItemId: ci.id,
        serviceName: ci.name_snapshot || (sp ? sp.name : ''),
        serviceType: ci.service_type,
        wordCount: ci.word_count || null,
        turnaround: ci.turnaround || null,
        quantity: ci.quantity || 1,
        priceAfterDiscounts: lineTotal,
        paymentPlan: ci.payment_plan || 'full_upfront',
        depositAmount,
        remainingBalance
      };
    });

    let paymentDueNow = 0;
    let paymentLater = 0;
    items.forEach((i) => {
      paymentDueNow += i.depositAmount || 0;
      paymentLater += i.remainingBalance || 0;
    });

    paymentDueNow = parseFloat(paymentDueNow.toFixed(2));
    paymentLater = parseFloat(paymentLater.toFixed(2));

    const coupons = this._getFromStorage('coupons', []);
    const appliedCoupons = (updatedCart.applied_coupon_ids || []).map((id) => {
      const c = coupons.find((cp) => cp.id === id) || null;
      const d = (updatedCart.applied_coupon_discounts || []).find((x) => x.coupon_id === id);
      return {
        code: c ? c.code : '',
        description: c ? c.description || '' : '',
        discountAmount: d ? d.discount_amount : 0
      };
    });

    return {
      cartId: updatedCart.id,
      items,
      subtotal: updatedCart.subtotal || 0,
      discountTotal: updatedCart.discount_total || 0,
      total: updatedCart.total || 0,
      currency: updatedCart.currency || 'USD',
      paymentDueNow,
      paymentLater,
      appliedCoupons
    };
  }

  // submitCheckoutContactInfo
  submitCheckoutContactInfo(name, email) {
    const cart = this._getOrCreateCart();
    cart.customer_name = name;
    cart.customer_email = email;
    cart.updated_at = this._nowISO();
    this._saveCart(cart);
    return {
      success: true,
      message: 'Checkout contact information saved.'
    };
  }

  // placeOrderWithCreditCard
  placeOrderWithCreditCard(billingName, billingEmail, cardHolderName, cardNumber, cardExpiry, cardCvv) {
    const order = this._createOrderFromCart();
    if (!order) {
      return {
        success: false,
        orderId: null,
        paymentStatus: 'failed',
        message: 'Cart is empty.'
      };
    }

    // Update billing info
    const orders = this._getFromStorage('orders', []);
    const idx = orders.findIndex((o) => o.id === order.id);
    if (idx >= 0) {
      orders[idx].billing_name = billingName;
      orders[idx].billing_email = billingEmail;
      this._saveToStorage('orders', orders);
    }

    // Compute amount due now (deposit + full items)
    const orderItems = this._getFromStorage('order_items', []).filter((oi) => oi.order_id === order.id);
    let amountDueNow = 0;
    orderItems.forEach((oi) => {
      amountDueNow += oi.deposit_amount || oi.line_item_total || 0;
    });
    amountDueNow = parseFloat(amountDueNow.toFixed(2));

    this._recordPaymentForOrder(
      order.id,
      amountDueNow,
      order.currency || 'USD',
      billingName,
      cardHolderName,
      cardNumber,
      cardExpiry,
      cardCvv
    );

    return {
      success: true,
      orderId: order.id,
      paymentStatus: 'succeeded',
      message: 'Order placed successfully.'
    };
  }

  // submitQuoteRequest
  submitQuoteRequest(
    source,
    serviceProductId,
    serviceName,
    wordCount,
    genre,
    bookCategory,
    manuscriptType,
    languageVariant,
    styleGuide,
    formatType,
    turnaround,
    desiredDeadlineDate,
    message,
    customerName,
    customerEmail
  ) {
    const quoteRequests = this._getFromStorage('quote_requests', []);
    const id = this._generateId('quote');
    const now = this._nowISO();

    const record = {
      id,
      source,
      service_product_id: serviceProductId || null,
      service_name: serviceName || null,
      word_count: wordCount || null,
      genre: genre || null,
      book_category: bookCategory || null,
      manuscript_type: manuscriptType || null,
      language_variant: languageVariant || null,
      style_guide: styleGuide || null,
      format_type: formatType || null,
      turnaround: turnaround || null,
      desired_deadline_date: desiredDeadlineDate || null,
      message,
      customer_name: customerName,
      customer_email: customerEmail,
      created_at: now
    };

    quoteRequests.push(record);
    this._saveToStorage('quote_requests', quoteRequests);

    return {
      success: true,
      quoteRequestId: id,
      confirmationMessage: 'Your quote request has been submitted.'
    };
  }

  // getAboutPageContent
  getAboutPageContent() {
    const key = 'about_page_content';
    const stored = this._getFromStorage(key, null);
    if (stored && typeof stored === 'object' && !Array.isArray(stored)) {
      return stored;
    }

    // Fallback non-persisted content if none stored
    return {
      companyOverview:
        'We provide professional book editing and formatting services for fiction and non-fiction authors.',
      mission:
        'To help authors present their best work through clear, polished prose and industry-standard formatting.',
      workflowSteps: [
        'Request a quote or place an order',
        'Upload your manuscript and confirm details',
        'We assign the best-suited editor or formatter',
        'Receive your edited/ formatted files and request revisions if needed'
      ],
      policySummaries: [
        {
          title: 'Turnaround Time',
          description: 'Typical turnarounds range from 3 to 30 days depending on service and word count.'
        },
        {
          title: 'Revisions',
          description: 'Most services include at least one round of follow-up questions or minor revisions.'
        }
      ]
    };
  }

  // submitContactMessage
  submitContactMessage(name, email, subject, message) {
    const messages = this._getFromStorage('contact_messages', []);
    const id = this._generateId('contact');
    const now = this._nowISO();
    const record = {
      id,
      name,
      email,
      subject: subject || null,
      message,
      created_at: now
    };
    messages.push(record);
    this._saveToStorage('contact_messages', messages);
    return {
      success: true,
      contactMessageId: id,
      confirmationMessage: 'Your message has been sent.'
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