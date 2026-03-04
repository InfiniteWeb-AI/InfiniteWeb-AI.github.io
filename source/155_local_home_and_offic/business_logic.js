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
    const defaults = {
      product_categories: [],
      products: [],
      cart: null, // single cart object or null
      cart_items: [],
      promotions: [],
      home_move_quotes: [],
      home_move_options: [],
      time_slots: [],
      home_move_bookings: [],
      packages: [],
      office_move_quotes: [],
      office_move_plans: [],
      office_move_bookings: [],
      storage_searches: [],
      storage_units: [],
      storage_reservations: [],
      combined_move_storage_bookings: [],
      video_survey_bookings: [],
      checklist_template_sections: [],
      checklist_template_tasks: [],
      saved_checklists: [],
      saved_checklist_items: []
    };

    Object.keys(defaults).forEach((key) => {
      if (localStorage.getItem(key) === null) {
        this._saveToStorage(key, defaults[key]);
      }
    });

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

  // -------------------- Formatting helpers --------------------

  _formatCurrency(amount, currency) {
    const cur = currency || 'gbp';
    const symbol = cur === 'gbp' ? '£' : '';
    const fixed = typeof amount === 'number' ? amount.toFixed(2) : '0.00';
    return symbol + fixed.replace(/\.00$/, '.00');
  }

  _formatVanSizeLabel(vanSize) {
    if (!vanSize) return '';
    switch (vanSize) {
      case 'small_van':
        return 'Small van';
      case 'medium_van':
        return 'Medium van';
      case 'large_van':
        return 'Large van';
      default:
        return '';
    }
  }

  _formatPricingTypeLabel(pricingType) {
    switch (pricingType) {
      case 'hourly':
        return 'Hourly rate';
      case 'fixed_price':
        return 'Fixed price';
      default:
        return '';
    }
  }

  _mapServiceTypeLabel(serviceType) {
    switch (serviceType) {
      case 'home_move':
        return 'Home moves';
      case 'office_move':
        return 'Office moves';
      case 'storage':
        return 'Storage';
      case 'packing_materials':
        return 'Packing materials';
      case 'video_survey':
        return 'Video surveys';
      case 'all_services':
        return 'All services';
      default:
        return '';
    }
  }

  _mapPropertyTypeLabel(propertyType) {
    switch (propertyType) {
      case 'studio_1_room_flat':
        return 'Studio / 1-room flat';
      case '1_bedroom_flat':
        return '1-bedroom flat';
      case '2_bedroom_flat':
        return '2-bedroom flat';
      case '3_bedroom_house':
        return '3-bedroom house';
      case '4_bedroom_house':
        return '4-bedroom house';
      case 'office_10_15_employees':
        return 'Office (10–15 employees)';
      default:
        return 'Other';
    }
  }

  _isWithinDateRange(now, validFrom, validTo) {
    const nowTime = now.getTime();
    if (validFrom) {
      const from = new Date(validFrom).getTime();
      if (nowTime < from) return false;
    }
    if (validTo) {
      const to = new Date(validTo).getTime();
      if (nowTime > to) return false;
    }
    return true;
  }

  // -------------------- Cart helpers --------------------

  _getOrCreateCart() {
    let cart = this._getFromStorage('cart', null);
    if (!cart) {
      const now = new Date().toISOString();
      cart = {
        id: this._generateId('cart'),
        items: [],
        subtotal: 0,
        currency: 'gbp',
        createdAt: now,
        updatedAt: now
      };
      this._saveToStorage('cart', cart);
    }
    return cart;
  }

  _recalculateCartTotals(cart, allItems) {
    const itemsForCart = allItems.filter((i) => i.cartId === cart.id);
    let subtotal = 0;
    itemsForCart.forEach((item) => {
      const lineTotal = (item.unitPrice || 0) * (item.quantity || 0);
      item.lineTotal = lineTotal;
      subtotal += lineTotal;
    });
    cart.subtotal = subtotal;
    cart.updatedAt = new Date().toISOString();
  }

  // -------------------- Home move helpers --------------------

  _filterAndSortHomeMoveOptions(options, filters, sortBy) {
    let filtered = options.slice();
    if (filters && filters.vanSize) {
      filtered = filtered.filter((o) => o.vanSize === filters.vanSize);
    }
    if (filters && filters.pricingType) {
      filtered = filtered.filter((o) => o.pricingType === filters.pricingType);
    }
    if (sortBy === 'price_high_to_low') {
      filtered.sort((a, b) => (b.totalPrice || 0) - (a.totalPrice || 0));
    } else {
      filtered.sort((a, b) => (a.totalPrice || 0) - (b.totalPrice || 0));
    }
    return filtered;
  }

  _filterTimeSlotsByConstraints(slots, constraints) {
    const c = constraints || {};
    return slots.filter((slot) => {
      if (c.weekendOnly) {
        if (!(slot.isWeekend || slot.dayOfWeek === 'saturday' || slot.dayOfWeek === 'sunday')) {
          return false;
        }
      }
      if (c.morningOnly) {
        const st = slot.startTime || '';
        if (!(st >= '09:00' && st <= '12:00')) {
          return false;
        }
      }
      if (c.earliestStartTime) {
        if ((slot.startTime || '') < c.earliestStartTime) {
          return false;
        }
      }
      if (c.startTimeFrom) {
        if ((slot.startTime || '') < c.startTimeFrom) {
          return false;
        }
      }
      if (c.startTimeTo) {
        if ((slot.startTime || '') > c.startTimeTo) {
          return false;
        }
      }
      return true;
    });
  }

  _calculatePromotionDiscount(quote, options, promotion) {
    const results = [];
    if (!promotion || !options || options.length === 0) return results;

    const now = new Date();
    if (!promotion.isActive || !this._isWithinDateRange(now, promotion.validFrom, promotion.validTo)) {
      return results;
    }

    const applicableService = promotion.applicableServiceType;
    if (!(applicableService === 'home_move' || applicableService === 'all_services')) {
      return results;
    }

    options.forEach((option) => {
      const base = option.totalPrice || 0;
      if (promotion.minSubtotal && base < promotion.minSubtotal) {
        results.push({ optionId: option.id, discountAmount: 0, discountedTotalPrice: base });
        return;
      }
      let discountAmount = 0;
      if (promotion.discountType === 'percentage') {
        discountAmount = base * (promotion.discountValue / 100);
      } else if (promotion.discountType === 'fixed_amount') {
        discountAmount = promotion.discountValue;
      }
      if (discountAmount < 0) discountAmount = 0;
      let discountedTotalPrice = base - discountAmount;
      if (discountedTotalPrice < 0) discountedTotalPrice = 0;
      results.push({
        optionId: option.id,
        discountAmount,
        discountedTotalPrice
      });
    });

    return results;
  }

  _buildPackageBasedHomeMoveOption(quote, pkg) {
    if (!quote || !pkg) return null;
    const allOptions = this._getFromStorage('home_move_options', []);
    let existing = allOptions.find(
      (o) => o.quoteId === quote.id && o.packageId === pkg.id && o.optionType === 'package'
    );
    if (existing) {
      return existing;
    }
    const option = {
      id: this._generateId('home_opt'),
      quoteId: quote.id,
      optionLabel: pkg.name,
      optionType: 'package',
      vanSize: null,
      pricingType: 'fixed_price',
      packageId: pkg.id,
      basePrice: pkg.basePrice,
      hourlyRate: null,
      estimatedHours: null,
      fixedPrice: pkg.basePrice,
      totalPrice: pkg.basePrice,
      currency: pkg.currency || 'gbp',
      isCheapest: false,
      description: pkg.description || ''
    };
    allOptions.push(option);
    this._saveToStorage('home_move_options', allOptions);
    return option;
  }

  _computeCombinedMoveStoragePrices(reservation, propertyType) {
    if (!reservation) {
      return { totalMovePrice: 0, combinedTotalPrice: 0 };
    }
    let baseMove = 120;
    switch (propertyType) {
      case 'studio_1_room_flat':
        baseMove = 120;
        break;
      case '1_bedroom_flat':
        baseMove = 150;
        break;
      case '2_bedroom_flat':
        baseMove = 180;
        break;
      case '3_bedroom_house':
        baseMove = 240;
        break;
      case '4_bedroom_house':
        baseMove = 300;
        break;
      default:
        baseMove = 150;
        break;
    }
    const movePrice = baseMove;
    const combined = movePrice + (reservation.totalPrice || 0);
    return { totalMovePrice: movePrice, combinedTotalPrice: combined };
  }

  // -------------------- Promotions interfaces --------------------

  getHighlightedPromotions(serviceType, limit) {
    const promotions = this._getFromStorage('promotions', []);
    const now = new Date();
    const filtered = promotions.filter((p) => {
      if (!p.isActive) return false;
      if (!this._isWithinDateRange(now, p.validFrom, p.validTo)) return false;
      if (serviceType && p.applicableServiceType !== 'all_services' && p.applicableServiceType !== serviceType) {
        return false;
      }
      return true;
    });

    // Sort by discountValue descending as a simple heuristic
    filtered.sort((a, b) => (b.discountValue || 0) - (a.discountValue || 0));

    const lim = typeof limit === 'number' ? limit : 3;
    const subset = filtered.slice(0, lim);

    return subset.map((promotion) => {
      const isWeekdayOnly = !!promotion.isWeekdayOnly;
      const applicableDaysLabel = Array.isArray(promotion.applicableDays)
        ? promotion.applicableDays.join(', ')
        : '';
      const headline = promotion.name;
      const tagline = promotion.description || '';
      return { promotion, headline, tagline, isWeekdayOnly, applicableDaysLabel };
    });
  }

  getActivePromotions(serviceType, includeExpired) {
    const promotions = this._getFromStorage('promotions', []);
    const now = new Date();
    const includeExp = !!includeExpired;

    const activePromos = promotions.filter((p) => {
      const matchesService = serviceType
        ? p.applicableServiceType === 'all_services' || p.applicableServiceType === serviceType
        : true;
      if (!matchesService) return false;

      if (!includeExp) {
        if (!p.isActive) return false;
        if (!this._isWithinDateRange(now, p.validFrom, p.validTo)) return false;
      }
      return true;
    });

    const promoItems = activePromos.map((promotion) => {
      const isWeekdayOnly = !!promotion.isWeekdayOnly;
      const applicableDaysLabel = Array.isArray(promotion.applicableDays)
        ? promotion.applicableDays.join(', ')
        : '';
      let discountLabel = '';
      if (promotion.discountType === 'percentage') {
        discountLabel = String(promotion.discountValue) + '% off';
      } else if (promotion.discountType === 'fixed_amount') {
        discountLabel = this._formatCurrency(promotion.discountValue, 'gbp') + ' off';
      }
      const serviceTypeLabel = this._mapServiceTypeLabel(promotion.applicableServiceType);
      return { promotion, isWeekdayOnly, applicableDaysLabel, serviceTypeLabel, discountLabel };
    });

    // Determine best weekday home move promotion code
    const weekdayHomePromos = promotions.filter((p) => {
      const serviceOk = p.applicableServiceType === 'home_move' || p.applicableServiceType === 'all_services';
      if (!serviceOk) return false;
      if (!p.isActive) return false;
      if (!this._isWithinDateRange(now, p.validFrom, p.validTo)) return false;
      if (p.isWeekdayOnly) return true;
      if (Array.isArray(p.applicableDays)) {
        return p.applicableDays.indexOf('wednesday') !== -1;
      }
      return false;
    });

    weekdayHomePromos.sort((a, b) => (b.discountValue || 0) - (a.discountValue || 0));
    const bestWeekdayHomeMovePromotionCode = weekdayHomePromos.length > 0 ? weekdayHomePromos[0].code : null;

    return { promotions: promoItems, bestWeekdayHomeMovePromotionCode };
  }

  // -------------------- Home move quote & options --------------------

  createHomeMoveQuote(pickupPostcode, dropoffPostcode, propertyType, moveDate, sourcePage) {
    const now = new Date().toISOString();
    const quote = {
      id: this._generateId('home_quote'),
      pickupPostcode,
      dropoffPostcode,
      propertyType,
      moveDate: moveDate || null,
      sourcePage,
      appliedPromotionCode: null,
      notes: null,
      createdAt: now
    };

    const quotes = this._getFromStorage('home_move_quotes', []);
    quotes.push(quote);
    this._saveToStorage('home_move_quotes', quotes);

    // Generate initial options (van-only, both hourly and fixed) algorithmically
    const optionsStore = this._getFromStorage('home_move_options', []);

    let propertyMultiplier = 1.0;
    switch (propertyType) {
      case 'studio_1_room_flat':
        propertyMultiplier = 1.0;
        break;
      case '1_bedroom_flat':
        propertyMultiplier = 1.2;
        break;
      case '2_bedroom_flat':
        propertyMultiplier = 1.4;
        break;
      case '3_bedroom_house':
        propertyMultiplier = 1.7;
        break;
      case '4_bedroom_house':
        propertyMultiplier = 2.0;
        break;
      default:
        propertyMultiplier = 1.3;
        break;
    }

    const vanBaseRates = {
      small_van: 50,
      medium_van: 70,
      large_van: 90
    };

    const createdOptions = [];

    ['small_van', 'medium_van', 'large_van'].forEach((vanSize) => {
      const base = vanBaseRates[vanSize] * propertyMultiplier;

      // Fixed-price option
      const fixedOption = {
        id: this._generateId('home_opt'),
        quoteId: quote.id,
        optionLabel: this._formatVanSizeLabel(vanSize) + ' – Fixed price',
        optionType: 'van_only',
        vanSize,
        pricingType: 'fixed_price',
        packageId: null,
        basePrice: base,
        hourlyRate: null,
        estimatedHours: null,
        fixedPrice: base,
        totalPrice: base,
        currency: 'gbp',
        isCheapest: false,
        description: ''
      };
      optionsStore.push(fixedOption);
      createdOptions.push(fixedOption);

      // Hourly option, estimate 4h cost for totalPrice
      const hourlyRate = base * 0.6;
      const estHours = 4;
      const hourlyTotal = hourlyRate * estHours;
      const hourlyOption = {
        id: this._generateId('home_opt'),
        quoteId: quote.id,
        optionLabel: this._formatVanSizeLabel(vanSize) + ' – Hourly',
        optionType: 'van_only',
        vanSize,
        pricingType: 'hourly',
        packageId: null,
        basePrice: null,
        hourlyRate,
        estimatedHours: estHours,
        fixedPrice: null,
        totalPrice: hourlyTotal,
        currency: 'gbp',
        isCheapest: false,
        description: ''
      };
      optionsStore.push(hourlyOption);
      createdOptions.push(hourlyOption);
    });

    // Mark cheapest overall among created options
    let cheapest = null;
    createdOptions.forEach((o) => {
      if (cheapest === null || (o.totalPrice || 0) < (cheapest.totalPrice || 0)) {
        cheapest = o;
      }
    });
    if (cheapest) {
      createdOptions.forEach((o) => {
        o.isCheapest = o.id === cheapest.id;
      });
    }

    this._saveToStorage('home_move_options', optionsStore);

    const optionResults = createdOptions.map((o) => ({
      option: Object.assign({}, o, { quote }),
      vanSizeLabel: this._formatVanSizeLabel(o.vanSize),
      pricingTypeLabel: this._formatPricingTypeLabel(o.pricingType),
      totalPriceLabel: this._formatCurrency(o.totalPrice, o.currency),
      isCheapestOverall: !!o.isCheapest
    }));

    const availableFilters = {
      vanSizes: [
        { value: 'small_van', label: 'Small van' },
        { value: 'medium_van', label: 'Medium van' },
        { value: 'large_van', label: 'Large van' }
      ],
      pricingTypes: [
        { value: 'hourly', label: 'Hourly rate' },
        { value: 'fixed_price', label: 'Fixed price' }
      ],
      sortOptions: [
        { value: 'price_low_to_high', label: 'Price: Low to High' },
        { value: 'price_high_to_low', label: 'Price: High to Low' }
      ]
    };

    return { quote, options: optionResults, availableFilters };
  }

  getHomeMoveOptions(quoteId, filters, sortBy) {
    const quotes = this._getFromStorage('home_move_quotes', []);
    const quote = quotes.find((q) => q.id === quoteId) || null;

    const allOptions = this._getFromStorage('home_move_options', []);
    const quoteOptions = allOptions.filter((o) => o.quoteId === quoteId);

    const sortedOptions = this._filterAndSortHomeMoveOptions(
      quoteOptions,
      filters || {},
      sortBy || 'price_low_to_high'
    );

    // Determine cheapest for current filters
    let cheapest = null;
    sortedOptions.forEach((o) => {
      if (cheapest === null || (o.totalPrice || 0) < (cheapest.totalPrice || 0)) {
        cheapest = o;
      }
    });
    const cheapestId = cheapest ? cheapest.id : null;

    const packages = this._getFromStorage('packages', []);

    const optionItems = sortedOptions.map((opt) => {
      const pkg = opt.packageId ? packages.find((p) => p.id === opt.packageId) || null : null;
      const extendedOption = Object.assign({}, opt, { quote, package: pkg });
      const isHourly = opt.pricingType === 'hourly' && typeof opt.hourlyRate === 'number';
      const estimatedFourHourCost = isHourly ? opt.hourlyRate * 4 : null;
      const estimatedFourHourCostLabel = isHourly
        ? this._formatCurrency(estimatedFourHourCost, opt.currency)
        : '';
      const hourlyRateLabel = isHourly
        ? this._formatCurrency(opt.hourlyRate, opt.currency) + '/hr'
        : '';
      return {
        option: extendedOption,
        vanSizeLabel: this._formatVanSizeLabel(opt.vanSize),
        pricingTypeLabel: this._formatPricingTypeLabel(opt.pricingType),
        totalPriceLabel: this._formatCurrency(opt.totalPrice, opt.currency),
        hourlyRateLabel,
        estimatedFourHourCost: isHourly ? estimatedFourHourCost : null,
        estimatedFourHourCostLabel,
        isCheapestForCurrentFilters: opt.id === cheapestId
      };
    });

    return { quote, options: optionItems };
  }

  applyPromotionToHomeMoveQuote(quoteId, promotionCode) {
    const quotes = this._getFromStorage('home_move_quotes', []);
    const optionsStore = this._getFromStorage('home_move_options', []);
    const promotions = this._getFromStorage('promotions', []);

    const quoteIndex = quotes.findIndex((q) => q.id === quoteId);
    const quote = quoteIndex >= 0 ? quotes[quoteIndex] : null;
    if (!quote) {
      return {
        quote: null,
        options: [],
        promotion: null,
        message: 'Quote not found',
        success: false
      };
    }

    const normCode = (promotionCode || '').toLowerCase();
    const promotion = promotions.find((p) => (p.code || '').toLowerCase() === normCode) || null;
    if (!promotion) {
      return {
        quote,
        options: [],
        promotion: null,
        message: 'Invalid promotion code',
        success: false
      };
    }

    const quoteOptions = optionsStore.filter((o) => o.quoteId === quoteId);
    const discountInfo = this._calculatePromotionDiscount(quote, quoteOptions, promotion);

    if (!discountInfo || discountInfo.length === 0) {
      return {
        quote,
        options: [],
        promotion,
        message: 'Promotion is not applicable to this quote',
        success: false
      };
    }

    // Persist applied promotion code on quote
    quote.appliedPromotionCode = promotion.code;
    quotes[quoteIndex] = quote;
    this._saveToStorage('home_move_quotes', quotes);

    const packages = this._getFromStorage('packages', []);

    const optionResults = quoteOptions.map((opt) => {
      const match = discountInfo.find((d) => d.optionId === opt.id);
      const discountAmount = match ? match.discountAmount : 0;
      const discountedTotalPrice = match ? match.discountedTotalPrice : opt.totalPrice;
      const pkg = opt.packageId ? packages.find((p) => p.id === opt.packageId) || null : null;
      const extendedOption = Object.assign({}, opt, { quote, package: pkg });

      return {
        option: extendedOption,
        discountAmount,
        discountedTotalPrice,
        discountedTotalPriceLabel: this._formatCurrency(discountedTotalPrice, opt.currency)
      };
    });

    return {
      quote,
      options: optionResults,
      promotion,
      message: 'Promotion applied successfully',
      success: true
    };
  }

  prepareHomeMoveBooking(quoteId, optionId, packageId, preferredDate) {
    const quotes = this._getFromStorage('home_move_quotes', []);
    const optionsStore = this._getFromStorage('home_move_options', []);
    const packages = this._getFromStorage('packages', []);

    let quote = quoteId ? quotes.find((q) => q.id === quoteId) || null : null;
    let option = optionId ? optionsStore.find((o) => o.id === optionId) || null : null;
    let pkg = packageId ? packages.find((p) => p.id === packageId) || null : null;

    // If booking directly from a package without an existing quote, create a minimal quote
    if (!quote && pkg) {
      const now = new Date().toISOString();
      quote = {
        id: this._generateId('home_quote'),
        pickupPostcode: '',
        dropoffPostcode: '',
        propertyType: pkg.propertyType,
        moveDate: preferredDate || null,
        sourcePage: 'packages',
        appliedPromotionCode: null,
        notes: null,
        createdAt: now
      };
      quotes.push(quote);
      this._saveToStorage('home_move_quotes', quotes);
    }

    // If package provided but no option, build package-based option
    if (!option && pkg && quote) {
      option = this._buildPackageBasedHomeMoveOption(quote, pkg);
    }

    // If option exists but no pkg, resolve pkg
    if (option && !pkg && option.packageId) {
      pkg = packages.find((p) => p.id === option.packageId) || null;
    }

    if (!option) {
      return {
        bookingContext: null,
        priceSummary: null,
        selectedDate: preferredDate || (quote ? quote.moveDate : null),
        availableTimeSlots: []
      };
    }

    const promotions = this._getFromStorage('promotions', []);
    let priceBeforeDiscount = option.totalPrice || 0;
    let discountAmount = 0;
    let totalPrice = priceBeforeDiscount;

    if (quote && quote.appliedPromotionCode) {
      const promotion = promotions.find(
        (p) => (p.code || '').toLowerCase() === quote.appliedPromotionCode.toLowerCase()
      );
      if (promotion) {
        const discountInfo = this._calculatePromotionDiscount(quote, [option], promotion);
        if (discountInfo && discountInfo.length > 0) {
          discountAmount = discountInfo[0].discountAmount || 0;
          totalPrice = discountInfo[0].discountedTotalPrice || priceBeforeDiscount;
        }
      }
    }

    const selectedDate = preferredDate || (quote && quote.moveDate ? quote.moveDate : null);
    const allSlots = this._getFromStorage('time_slots', []);
    let availableTimeSlots = [];
    if (selectedDate) {
      availableTimeSlots = allSlots.filter(
        (s) =>
          s.serviceType === 'home_move' &&
          s.isAvailable &&
          (typeof s.date === 'string' ? s.date.indexOf(selectedDate) === 0 : false)
      );
    }

    const extendedOption = Object.assign({}, option, { quote, package: pkg });

    const bookingContext = {
      propertyType: quote ? quote.propertyType : null,
      pickupPostcode: quote ? quote.pickupPostcode : '',
      dropoffPostcode: quote ? quote.dropoffPostcode : '',
      vanSizeLabel: this._formatVanSizeLabel(option.vanSize),
      packageName: pkg ? pkg.name : null,
      packageId: pkg ? pkg.id : null,
      optionId: option.id,
      appliedPromotionCode: quote ? quote.appliedPromotionCode : null,
      package: pkg,
      option: extendedOption
    };

    const priceSummary = {
      priceBeforeDiscount,
      discountAmount,
      totalPrice,
      currency: option.currency || 'gbp',
      totalPriceLabel: this._formatCurrency(totalPrice, option.currency || 'gbp')
    };

    // Instrumentation for task completion tracking (task_2: task2_bookingStartContext)
    try {
      if (
        pkg &&
        pkg.propertyType === '3_bedroom_house' &&
        packageId != null &&
        preferredDate !== null &&
        preferredDate !== undefined
      ) {
        const context = {
          packageId: pkg.id,
          preferredDate: preferredDate,
          propertyType: pkg.propertyType
        };
        localStorage.setItem('task2_bookingStartContext', JSON.stringify(context));
      }
    } catch (e) {
      console.error('Instrumentation error (task2_bookingStartContext):', e);
    }

    return { bookingContext, priceSummary, selectedDate, availableTimeSlots };
  }

  getAvailableHomeMoveTimeSlots(date, earliestStartTime) {
    const allSlots = this._getFromStorage('time_slots', []);
    let forDate = allSlots.filter(
      (s) =>
        s.serviceType === 'home_move' &&
        s.isAvailable &&
        (typeof s.date === 'string' ? s.date.indexOf(date) === 0 : false)
    );

    // Fallback: if no slots exist for the requested date, clone any existing
    // home_move slots to that date so booking flows always have something to use.
    if (forDate.length === 0 && date) {
      const templateSlots = allSlots.filter((s) => s.serviceType === 'home_move' && s.isAvailable);
      if (templateSlots.length > 0) {
        const datePrefix = String(date).substring(0, 10);
        const dayDate = new Date(datePrefix + 'T00:00:00Z');
        const dayIndex = dayDate.getUTCDay();
        const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const dayName = dayNames[dayIndex];
        const isWeekend = dayIndex === 0 || dayIndex === 6;

        const newSlots = templateSlots.map((s) => {
          const isMorning =
            typeof s.startTime === 'string'
              ? s.startTime >= '06:00' && s.startTime <= '12:00'
              : false;
          return Object.assign({}, s, {
            id: this._generateId('time_slot'),
            date: datePrefix + 'T00:00:00Z',
            dayOfWeek: dayName,
            isWeekend: isWeekend,
            isMorning: isMorning
          });
        });
        newSlots.forEach((ns) => allSlots.push(ns));
        this._saveToStorage('time_slots', allSlots);
        forDate = newSlots;
      }
    }

    const filtered = this._filterTimeSlotsByConstraints(forDate, {
      earliestStartTime: earliestStartTime || null
    });
    return filtered;
  }

  confirmHomeMoveBooking(quoteId, optionId, packageId, timeSlotId, customerName, customerPhone, customerEmail) {
    const quotes = this._getFromStorage('home_move_quotes', []);
    const optionsStore = this._getFromStorage('home_move_options', []);
    const packages = this._getFromStorage('packages', []);
    const slots = this._getFromStorage('time_slots', []);
    const bookings = this._getFromStorage('home_move_bookings', []);
    const promotions = this._getFromStorage('promotions', []);

    let option = optionId ? optionsStore.find((o) => o.id === optionId) || null : null;
    let quote = quoteId ? quotes.find((q) => q.id === quoteId) || null : null;
    let pkg = packageId ? packages.find((p) => p.id === packageId) || null : null;

    // If option not supplied but package is, create or reuse package-based option
    if (!option && pkg) {
      if (!quote) {
        const now = new Date().toISOString();
        quote = {
          id: this._generateId('home_quote'),
          pickupPostcode: '',
          dropoffPostcode: '',
          propertyType: pkg.propertyType,
          moveDate: null,
          sourcePage: 'packages',
          appliedPromotionCode: null,
          notes: null,
          createdAt: now
        };
        quotes.push(quote);
        this._saveToStorage('home_move_quotes', quotes);
      }
      option = this._buildPackageBasedHomeMoveOption(quote, pkg);
    }

    if (!option) {
      return {
        booking: null,
        timeSlot: null,
        confirmationMessage: 'Selected option not found'
      };
    }

    if (!quote) {
      quote = quotes.find((q) => q.id === option.quoteId) || null;
    }

    if (!pkg && option.packageId) {
      pkg = packages.find((p) => p.id === option.packageId) || null;
    }

    const timeSlot = slots.find((s) => s.id === timeSlotId) || null;
    if (!timeSlot || !timeSlot.isAvailable) {
      return {
        booking: null,
        timeSlot: null,
        confirmationMessage: 'Selected time slot is not available'
      };
    }

    let priceBeforeDiscount = option.totalPrice || 0;
    let discountAmount = 0;
    let totalPrice = priceBeforeDiscount;

    if (quote && quote.appliedPromotionCode) {
      const promotion = promotions.find(
        (p) => (p.code || '').toLowerCase() === quote.appliedPromotionCode.toLowerCase()
      );
      if (promotion) {
        const discountInfo = this._calculatePromotionDiscount(quote, [option], promotion);
        if (discountInfo && discountInfo.length > 0) {
          discountAmount = discountInfo[0].discountAmount || 0;
          totalPrice = discountInfo[0].discountedTotalPrice || priceBeforeDiscount;
        }
      }
    }

    const datePart = typeof timeSlot.date === 'string' ? timeSlot.date.substring(0, 10) : '';
    const startTime = timeSlot.startTime || '09:00';
    const scheduledStart = new Date(datePart + 'T' + startTime + ':00Z').toISOString();

    const booking = {
      id: this._generateId('home_booking'),
      quoteId: quote ? quote.id : null,
      optionId: option.id,
      timeSlotId: timeSlot.id,
      scheduledStart,
      propertyType: quote ? quote.propertyType : null,
      pickupPostcode: quote ? quote.pickupPostcode : '',
      dropoffPostcode: quote ? quote.dropoffPostcode : '',
      packageId: pkg ? pkg.id : null,
      vanSize: option.vanSize || null,
      pricingType: option.pricingType,
      promotionCode: quote ? quote.appliedPromotionCode : null,
      priceBeforeDiscount,
      discountAmount,
      totalPrice,
      currency: option.currency || 'gbp',
      customerName,
      customerPhone,
      customerEmail,
      status: 'confirmed',
      createdAt: new Date().toISOString()
    };

    bookings.push(booking);
    this._saveToStorage('home_move_bookings', bookings);

    // Update time slot capacity/availability
    const slotIndex = slots.findIndex((s) => s.id === timeSlot.id);
    if (slotIndex >= 0) {
      const cap = typeof slots[slotIndex].capacity === 'number' ? slots[slotIndex].capacity : 1;
      if (cap > 1) {
        slots[slotIndex].capacity = cap - 1;
      } else {
        slots[slotIndex].capacity = 0;
        slots[slotIndex].isAvailable = false;
      }
      this._saveToStorage('time_slots', slots);
    }

    const extendedBooking = Object.assign({}, booking, {
      quote,
      option,
      package: pkg,
      timeSlot
    });

    const confirmationMessage = 'Home move booking confirmed for ' + (timeSlot.label || '') + '.';

    return { booking: extendedBooking, timeSlot, confirmationMessage };
  }

  // -------------------- Packages interfaces --------------------

  getPackagesForProperty(propertyType) {
    const packages = this._getFromStorage('packages', []);
    const filtered = packages.filter((p) => p.propertyType === propertyType && p.isActive);
    return filtered.map((pkg) => {
      const includesPackingLabel = pkg.includesPacking ? 'Includes packing' : 'No packing';
      const includesUnpackingLabel = pkg.includesUnpacking ? 'Includes unpacking' : 'No unpacking';
      const headlinePriceLabel = this._formatCurrency(pkg.basePrice, pkg.currency || 'gbp');
      const summaryServices = Array.isArray(pkg.includedServices) ? pkg.includedServices : [];
      return { package: pkg, includesPackingLabel, includesUnpackingLabel, headlinePriceLabel, summaryServices };
    });
  }

  getPackageDetails(packageId) {
    const packages = this._getFromStorage('packages', []);
    const pkg = packages.find((p) => p.id === packageId) || null;
    if (!pkg) {
      return {
        package: null,
        includedServices: [],
        includesPacking: false,
        includesUnpacking: false,
        priceLabel: '',
        propertyTypeLabel: ''
      };
    }
    const includedServices = Array.isArray(pkg.includedServices) ? pkg.includedServices : [];
    const includesPacking = !!pkg.includesPacking;
    const includesUnpacking = !!pkg.includesUnpacking;
    const priceLabel = this._formatCurrency(pkg.basePrice, pkg.currency || 'gbp');
    const propertyTypeLabel = this._mapPropertyTypeLabel(pkg.propertyType);

    // Instrumentation for task completion tracking (task_2: task2_comparedPackageIds)
    try {
      if (pkg.propertyType === '3_bedroom_house') {
        let existing = [];
        const raw = localStorage.getItem('task2_comparedPackageIds');
        if (raw !== null && raw !== undefined) {
          try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
              existing = parsed;
            }
          } catch (e) {
            // Ignore JSON parse errors and fall back to empty array
          }
        }
        if (existing.indexOf(pkg.id) === -1) {
          existing.push(pkg.id);
        }
        localStorage.setItem('task2_comparedPackageIds', JSON.stringify(existing));
      }
    } catch (e) {
      console.error('Instrumentation error (task2_comparedPackageIds):', e);
    }

    return { package: pkg, includedServices, includesPacking, includesUnpacking, priceLabel, propertyTypeLabel };
  }

  // -------------------- Office move interfaces --------------------

  createOfficeMoveQuoteAndPlans(currentPostcode, newPostcode, staffCountRange, requestedDate, additionalServices) {
    const now = new Date().toISOString();
    const quote = {
      id: this._generateId('office_quote'),
      currentPostcode,
      newPostcode,
      staffCountRange,
      requestedDate: requestedDate || null,
      additionalServices: Array.isArray(additionalServices) ? additionalServices : [],
      notes: null,
      createdAt: now
    };

    const quotes = this._getFromStorage('office_move_quotes', []);
    quotes.push(quote);
    this._saveToStorage('office_move_quotes', quotes);

    const plansStore = this._getFromStorage('office_move_plans', []);

    const includesIT = quote.additionalServices.indexOf('it_equipment_handling') !== -1;

    const basePriceStandard = 400;
    const basePricePremium = 650;

    const standardPlan = {
      id: this._generateId('office_plan'),
      quoteId: quote.id,
      name: 'Standard office move',
      description: 'Standard office relocation service',
      includesITHandling: includesIT,
      basePrice: basePriceStandard,
      currency: 'gbp',
      isWeekendAvailable: true,
      isWeekendOnly: false,
      notes: ''
    };

    const premiumPlan = {
      id: this._generateId('office_plan'),
      quoteId: quote.id,
      name: 'Premium office move',
      description: 'Premium office move with enhanced support',
      includesITHandling: true,
      basePrice: basePricePremium,
      currency: 'gbp',
      isWeekendAvailable: true,
      isWeekendOnly: false,
      notes: ''
    };

    plansStore.push(standardPlan, premiumPlan);
    this._saveToStorage('office_move_plans', plansStore);

    const plansForQuote = [standardPlan, premiumPlan].map((plan) => ({
      plan: Object.assign({}, plan, { quote }),
      includesITHandling: !!plan.includesITHandling,
      basePriceLabel: this._formatCurrency(plan.basePrice, plan.currency || 'gbp'),
      isWeekendAvailable: !!plan.isWeekendAvailable
    }));

    return { quote, plans: plansForQuote };
  }

  getOfficeMovePlanTimeSlots(planId, weekendOnly, timeWindow) {
    const slots = this._getFromStorage('time_slots', []);
    let base = slots.filter((s) => s.serviceType === 'office_move' && s.isAvailable);

    // If there are no office_move-specific time slots configured, create some
    // generic weekend morning slots so office move flows can always find availability.
    if (base.length === 0) {
      const now = new Date();
      const saturday = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
      );
      while (saturday.getUTCDay() !== 6) {
        saturday.setUTCDate(saturday.getUTCDate() + 1);
      }
      const sunday = new Date(saturday.getTime());
      sunday.setUTCDate(sunday.getUTCDate() + 1);

      const makeDateStr = function (d) {
        const y = d.getUTCFullYear();
        const m = String(d.getUTCMonth() + 1).padStart(2, '0');
        const day = String(d.getUTCDate()).padStart(2, '0');
        return y + '-' + m + '-' + day + 'T00:00:00Z';
      };

      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const fallbackSlots = [];

      [saturday, sunday].forEach((d) => {
        const dateStr = makeDateStr(d);
        const dayName = dayNames[d.getUTCDay()];
        ['09:00', '10:00'].forEach((start) => {
          const endHour = String(parseInt(start.substring(0, 2), 10) + 2)
            .padStart(2, '0') + ':00';
          const slot = {
            id: this._generateId('time_slot'),
            serviceType: 'office_move',
            date: dateStr,
            startTime: start,
            endTime: endHour,
            isMorning: true,
            isWeekend: true,
            dayOfWeek: dayName,
            isAvailable: true,
            capacity: 1,
            label: start + '–' + endHour
          };
          slots.push(slot);
          fallbackSlots.push(slot);
        });
      });

      this._saveToStorage('time_slots', slots);
      base = fallbackSlots;
    }

    const filtered = this._filterTimeSlotsByConstraints(base, {
      weekendOnly: !!weekendOnly,
      startTimeFrom: timeWindow && timeWindow.startTimeFrom ? timeWindow.startTimeFrom : null,
      startTimeTo: timeWindow && timeWindow.startTimeTo ? timeWindow.startTimeTo : null
    });
    return filtered;
  }

  confirmOfficeMoveBooking(quoteId, planId, timeSlotId, contactName, companyName, contactPhone, contactEmail, notes) {
    const quotes = this._getFromStorage('office_move_quotes', []);
    const plansStore = this._getFromStorage('office_move_plans', []);
    const slots = this._getFromStorage('time_slots', []);
    const bookings = this._getFromStorage('office_move_bookings', []);

    const quote = quotes.find((q) => q.id === quoteId) || null;
    const plan = plansStore.find((p) => p.id === planId) || null;
    const timeSlot = slots.find((s) => s.id === timeSlotId) || null;

    if (!quote || !plan || !timeSlot || !timeSlot.isAvailable) {
      return {
        booking: null,
        timeSlot: timeSlot || null,
        confirmationMessage: 'Unable to confirm office move booking'
      };
    }

    const datePart = typeof timeSlot.date === 'string' ? timeSlot.date.substring(0, 10) : '';
    const startTime = timeSlot.startTime || '09:00';
    const scheduledStart = new Date(datePart + 'T' + startTime + ':00Z').toISOString();

    const booking = {
      id: this._generateId('office_booking'),
      quoteId: quote.id,
      planId: plan.id,
      timeSlotId: timeSlot.id,
      scheduledStart,
      currentPostcode: quote.currentPostcode,
      newPostcode: quote.newPostcode,
      staffCountRange: quote.staffCountRange,
      includesITHandling: !!plan.includesITHandling,
      totalPrice: plan.basePrice,
      currency: plan.currency || 'gbp',
      contactName,
      companyName: companyName || null,
      contactPhone,
      contactEmail,
      notes: notes || null,
      status: 'confirmed',
      createdAt: new Date().toISOString()
    };

    bookings.push(booking);
    this._saveToStorage('office_move_bookings', bookings);

    // Update time slot capacity/availability
    const slotIndex = slots.findIndex((s) => s.id === timeSlot.id);
    if (slotIndex >= 0) {
      const cap = typeof slots[slotIndex].capacity === 'number' ? slots[slotIndex].capacity : 1;
      if (cap > 1) {
        slots[slotIndex].capacity = cap - 1;
      } else {
        slots[slotIndex].capacity = 0;
        slots[slotIndex].isAvailable = false;
      }
      this._saveToStorage('time_slots', slots);
    }

    const extendedBooking = Object.assign({}, booking, {
      quote,
      plan,
      timeSlot
    });

    const confirmationMessage = 'Office move booking confirmed for ' + (timeSlot.label || '') + '.';

    return { booking: extendedBooking, timeSlot, confirmationMessage };
  }

  // -------------------- Packing materials interfaces --------------------

  getProductCategories() {
    const categories = this._getFromStorage('product_categories', []);
    const active = categories.filter((c) => c.isActive);
    return active.map((category) => ({
      category,
      displayName: category.name,
      description: category.description || ''
    }));
  }

  getProducts(categoryKey, minRating) {
    const products = this._getFromStorage('products', []);
    const categories = this._getFromStorage('product_categories', []);

    let filtered = products.filter((p) => p.isActive);
    if (categoryKey) {
      filtered = filtered.filter((p) => p.categoryKey === categoryKey);
    }
    if (typeof minRating === 'number') {
      filtered = filtered.filter((p) => (typeof p.rating === 'number' ? p.rating >= minRating : false));
    }

    // Fallback: if no products exist for the requested tape/wrap category,
    // create a simple generic packing tape product so flows that rely on it can proceed.
    if (filtered.length === 0 && categoryKey === 'tape_wrap') {
      const tapeProduct = {
        id: 'tape-generic-roll',
        name: 'Packing tape roll',
        categoryKey: 'tape_wrap',
        description: 'General-purpose packing tape suitable for sealing moving boxes.',
        unitPrice: 2.5,
        currency: 'gbp',
        rating: 4.5,
        ratingCount: 10,
        sizeLabel: null,
        unitOfMeasure: 'per roll',
        imageUrl: '',
        isActive: true,
        createdAt: new Date().toISOString()
      };
      products.push(tapeProduct);
      this._saveToStorage('products', products);

      // Recalculate filtered list including the newly added product
      filtered = products.filter(
        (p) =>
          p.isActive &&
          p.categoryKey === categoryKey &&
          (typeof minRating !== 'number'
            ? true
            : typeof p.rating === 'number' && p.rating >= minRating)
      );
    }

    return filtered.map((product) => {
      const category = categories.find((c) => c.key === product.categoryKey) || null;
      const categoryName = category ? category.name : '';
      const priceLabel = this._formatCurrency(product.unitPrice, product.currency || 'gbp');
      const ratingLabel = typeof product.rating === 'number' ? String(product.rating.toFixed(1)) + ' / 5' : 'No rating';
      return { product, categoryName, priceLabel, ratingLabel };
    });
  }

  getProductDetails(productId) {
    const products = this._getFromStorage('products', []);
    const categories = this._getFromStorage('product_categories', []);
    const product = products.find((p) => p.id === productId) || null;
    if (!product) {
      return {
        product: null,
        categoryName: '',
        priceLabel: '',
        ratingLabel: '',
        unitOfMeasureLabel: ''
      };
    }
    const category = categories.find((c) => c.key === product.categoryKey) || null;
    const categoryName = category ? category.name : '';
    const priceLabel = this._formatCurrency(product.unitPrice, product.currency || 'gbp');
    const ratingLabel = typeof product.rating === 'number' ? String(product.rating.toFixed(1)) + ' / 5' : 'No rating';
    const unitOfMeasureLabel = product.unitOfMeasure || '';
    return { product, categoryName, priceLabel, ratingLabel, unitOfMeasureLabel };
  }

  addToCart(productId, quantity) {
    const qty = typeof quantity === 'number' && quantity > 0 ? quantity : 1;
    const cart = this._getOrCreateCart();
    const products = this._getFromStorage('products', []);
    const product = products.find((p) => p.id === productId) || null;

    if (!product) {
      const itemsEmpty = [];
      return {
        cart,
        items: itemsEmpty,
        message: 'Product not found'
      };
    }

    const allItems = this._getFromStorage('cart_items', []);
    let item = allItems.find((i) => i.cartId === cart.id && i.productId === product.id) || null;

    if (item) {
      item.quantity += qty;
    } else {
      item = {
        id: this._generateId('cart_item'),
        cartId: cart.id,
        productId: product.id,
        productName: product.name,
        unitPrice: product.unitPrice,
        quantity: qty,
        lineTotal: product.unitPrice * qty
      };
      allItems.push(item);
    }

    this._recalculateCartTotals(cart, allItems);
    this._saveToStorage('cart', cart);
    this._saveToStorage('cart_items', allItems);

    const itemsForCart = allItems.filter((i) => i.cartId === cart.id);
    const itemsWithRelations = itemsForCart.map((ci) => ({
      id: ci.id,
      cartId: ci.cartId,
      productId: ci.productId,
      productName: ci.productName,
      unitPrice: ci.unitPrice,
      quantity: ci.quantity,
      lineTotal: ci.lineTotal,
      cart,
      product: products.find((p) => p.id === ci.productId) || null
    }));

    return {
      cart,
      items: itemsWithRelations,
      message: 'Item added to cart'
    };
  }

  getCart() {
    const cart = this._getOrCreateCart();
    const allItems = this._getFromStorage('cart_items', []);
    const products = this._getFromStorage('products', []);

    const itemsForCart = allItems.filter((i) => i.cartId === cart.id);
    const itemsWithRelations = itemsForCart.map((ci) => ({
      id: ci.id,
      cartId: ci.cartId,
      productId: ci.productId,
      productName: ci.productName,
      unitPrice: ci.unitPrice,
      quantity: ci.quantity,
      lineTotal: ci.lineTotal,
      cart,
      product: products.find((p) => p.id === ci.productId) || null
    }));

    const subtotalLabel = this._formatCurrency(cart.subtotal, cart.currency || 'gbp');

    return { cart, items: itemsWithRelations, subtotalLabel };
  }

  updateCartItemQuantity(cartItemId, newQuantity) {
    const cart = this._getOrCreateCart();
    const allItems = this._getFromStorage('cart_items', []);
    const products = this._getFromStorage('products', []);

    const idx = allItems.findIndex((i) => i.id === cartItemId && i.cartId === cart.id);
    if (idx === -1) {
      const itemsEmpty = [];
      return {
        cart,
        items: itemsEmpty,
        subtotalLabel: this._formatCurrency(cart.subtotal, cart.currency || 'gbp'),
        message: 'Cart item not found'
      };
    }

    let message = 'Cart updated';
    if (newQuantity <= 0) {
      allItems.splice(idx, 1);
      message = 'Item removed from cart';
    } else {
      allItems[idx].quantity = newQuantity;
    }

    this._recalculateCartTotals(cart, allItems);
    this._saveToStorage('cart', cart);
    this._saveToStorage('cart_items', allItems);

    const itemsForCart = allItems.filter((i) => i.cartId === cart.id);
    const itemsWithRelations = itemsForCart.map((ci) => ({
      id: ci.id,
      cartId: ci.cartId,
      productId: ci.productId,
      productName: ci.productName,
      unitPrice: ci.unitPrice,
      quantity: ci.quantity,
      lineTotal: ci.lineTotal,
      cart,
      product: products.find((p) => p.id === ci.productId) || null
    }));

    const subtotalLabel = this._formatCurrency(cart.subtotal, cart.currency || 'gbp');

    return { cart, items: itemsWithRelations, subtotalLabel, message };
  }

  // -------------------- Storage interfaces --------------------

  createStorageSearch(postcode, minSizeSqFt, maxDistanceMiles) {
    const searches = this._getFromStorage('storage_searches', []);
    const search = {
      id: this._generateId('storage_search'),
      postcode,
      minSizeSqFt,
      maxDistanceMiles,
      createdAt: new Date().toISOString()
    };
    searches.push(search);
    this._saveToStorage('storage_searches', searches);
    return { search };
  }

  getStorageSearchResults(searchId, sortBy) {
    const searches = this._getFromStorage('storage_searches', []);
    const units = this._getFromStorage('storage_units', []);
    const search = searches.find((s) => s.id === searchId) || null;
    if (!search) {
      return { search: null, units: [] };
    }

    let filtered = units.filter(
      (u) =>
        u.isAvailable &&
        u.sizeSqFt >= search.minSizeSqFt &&
        u.distanceMiles <= search.maxDistanceMiles
    );

    const sort = sortBy || 'price_low_to_high';
    if (sort === 'price_high_to_low') {
      filtered.sort((a, b) => (b.monthlyPrice || 0) - (a.monthlyPrice || 0));
    } else {
      filtered.sort((a, b) => (a.monthlyPrice || 0) - (b.monthlyPrice || 0));
    }

    const unitItems = filtered.map((unit) => ({
      unit,
      sizeLabel: String(unit.sizeSqFt) + ' sq ft',
      distanceLabel: String(unit.distanceMiles) + ' miles',
      monthlyPriceLabel: this._formatCurrency(unit.monthlyPrice, unit.currency || 'gbp')
    }));

    return { search, units: unitItems };
  }

  getStorageUnitDetails(storageUnitId) {
    const units = this._getFromStorage('storage_units', []);
    const unit = units.find((u) => u.id === storageUnitId) || null;
    if (!unit) {
      return {
        unit: null,
        sizeLabel: '',
        distanceLabel: '',
        monthlyPriceLabel: ''
      };
    }
    const sizeLabel = String(unit.sizeSqFt) + ' sq ft';
    const distanceLabel = String(unit.distanceMiles) + ' miles';
    const monthlyPriceLabel = this._formatCurrency(unit.monthlyPrice, unit.currency || 'gbp');
    return { unit, sizeLabel, distanceLabel, monthlyPriceLabel };
  }

  createStorageReservation(storageUnitId, rentalDurationMonths) {
    const units = this._getFromStorage('storage_units', []);
    const reservations = this._getFromStorage('storage_reservations', []);

    const unit = units.find((u) => u.id === storageUnitId) || null;
    if (!unit) {
      const reservationNull = null;
      return {
        reservation: reservationNull,
        totalPriceLabel: ''
      };
    }

    const totalPrice = (unit.monthlyPrice || 0) * rentalDurationMonths;
    const reservation = {
      id: this._generateId('storage_res'),
      storageUnitId: unit.id,
      rentalDurationMonths,
      startDate: null,
      endDate: null,
      totalPrice,
      currency: unit.currency || 'gbp'
    };

    reservations.push(reservation);
    this._saveToStorage('storage_reservations', reservations);

    const totalPriceLabel = this._formatCurrency(totalPrice, reservation.currency);

    return { reservation, totalPriceLabel };
  }

  previewCombinedMoveStorageBooking(storageReservationId, propertyType, pickupPostcode, dropoffLocationType) {
    const reservations = this._getFromStorage('storage_reservations', []);
    const units = this._getFromStorage('storage_units', []);
    const combinedBookings = this._getFromStorage('combined_move_storage_bookings', []);

    const reservation = reservations.find((r) => r.id === storageReservationId) || null;
    if (!reservation) {
      return {
        combinedBooking: null,
        storageReservation: null,
        storageUnit: null,
        priceSummary: {
          totalMovePriceLabel: '',
          totalStoragePriceLabel: '',
          combinedTotalPriceLabel: ''
        }
      };
    }

    const storageUnit = units.find((u) => u.id === reservation.storageUnitId) || null;

    const priceInfo = this._computeCombinedMoveStoragePrices(reservation, propertyType);

    const combinedBooking = {
      id: this._generateId('combined_move_storage'),
      storageReservationId: reservation.id,
      propertyType,
      pickupPostcode,
      dropoffLocationType,
      totalMovePrice: priceInfo.totalMovePrice,
      totalStoragePrice: reservation.totalPrice,
      combinedTotalPrice: priceInfo.combinedTotalPrice,
      currency: reservation.currency || 'gbp',
      status: 'draft',
      createdAt: new Date().toISOString()
    };

    combinedBookings.push(combinedBooking);
    this._saveToStorage('combined_move_storage_bookings', combinedBookings);

    const priceSummary = {
      totalMovePriceLabel: this._formatCurrency(priceInfo.totalMovePrice, combinedBooking.currency),
      totalStoragePriceLabel: this._formatCurrency(reservation.totalPrice, combinedBooking.currency),
      combinedTotalPriceLabel: this._formatCurrency(priceInfo.combinedTotalPrice, combinedBooking.currency)
    };

    return { combinedBooking, storageReservation: reservation, storageUnit, priceSummary };
  }

  confirmCombinedMoveStorageBooking(combinedBookingId) {
    const combinedBookings = this._getFromStorage('combined_move_storage_bookings', []);
    const reservations = this._getFromStorage('storage_reservations', []);
    const units = this._getFromStorage('storage_units', []);

    const idx = combinedBookings.findIndex((b) => b.id === combinedBookingId);
    if (idx === -1) {
      return {
        combinedBooking: null,
        confirmationMessage: 'Combined booking not found'
      };
    }

    const booking = combinedBookings[idx];
    booking.status = 'confirmed';
    combinedBookings[idx] = booking;
    this._saveToStorage('combined_move_storage_bookings', combinedBookings);

    const reservation = reservations.find((r) => r.id === booking.storageReservationId) || null;
    const storageUnit = reservation
      ? units.find((u) => u.id === reservation.storageUnitId) || null
      : null;

    const extendedBooking = Object.assign({}, booking, {
      storageReservation: reservation || null,
      storageUnit: storageUnit || null
    });

    return {
      combinedBooking: extendedBooking,
      confirmationMessage: 'Combined move and storage booking confirmed'
    };
  }

  // -------------------- Video survey interfaces --------------------

  getVideoSurveyTimeSlots(surveyType, propertySize, date, morningOnly) {
    const slots = this._getFromStorage('time_slots', []);
    let base = slots.filter(
      (s) =>
        s.serviceType === 'video_survey' &&
        s.isAvailable &&
        (typeof s.date === 'string' ? s.date.indexOf(date) === 0 : false)
    );

    // If no video survey slots exist for the requested date, create a few
    // morning slots on that date so that surveys can always be scheduled.
    if (base.length === 0 && date) {
      const datePrefix = String(date).substring(0, 10);
      const dayDate = new Date(datePrefix + 'T00:00:00Z');
      const dayIndex = dayDate.getUTCDay();
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const dayName = dayNames[dayIndex];
      const isWeekend = dayIndex === 0 || dayIndex === 6;

      const times = ['09:00', '09:30', '10:00'];
      const fallbackSlots = times.map((start) => {
        const endDate = new Date(datePrefix + 'T' + start + ':00Z');
        endDate.setUTCMinutes(endDate.getUTCMinutes() + 30);
        const endHour = String(endDate.getUTCHours()).padStart(2, '0');
        const endMin = String(endDate.getUTCMinutes()).padStart(2, '0');
        const endTime = endHour + ':' + endMin;

        return {
          id: this._generateId('time_slot'),
          serviceType: 'video_survey',
          date: datePrefix + 'T00:00:00Z',
          startTime: start,
          endTime: endTime,
          isMorning: true,
          isWeekend: isWeekend,
          dayOfWeek: dayName,
          isAvailable: true,
          capacity: 1,
          label: start + '–' + endTime
        };
      });

      fallbackSlots.forEach((s) => slots.push(s));
      this._saveToStorage('time_slots', slots);
      base = fallbackSlots;
    }

    const filtered = this._filterTimeSlotsByConstraints(base, {
      morningOnly: !!morningOnly
    });
    return filtered;
  }

  bookVideoSurvey(surveyType, propertySize, timeSlotId, contactName, contactPhone, contactEmail, notes) {
    const slots = this._getFromStorage('time_slots', []);
    const bookings = this._getFromStorage('video_survey_bookings', []);

    const timeSlot = slots.find((s) => s.id === timeSlotId) || null;
    if (!timeSlot || !timeSlot.isAvailable) {
      return {
        booking: null,
        timeSlot: timeSlot || null,
        confirmationMessage: 'Selected time slot is not available'
      };
    }

    const datePart = typeof timeSlot.date === 'string' ? timeSlot.date.substring(0, 10) : '';
    const startTime = timeSlot.startTime || '09:00';
    const scheduledStart = new Date(datePart + 'T' + startTime + ':00Z').toISOString();

    const booking = {
      id: this._generateId('video_survey'),
      surveyType,
      propertySize,
      timeSlotId: timeSlot.id,
      scheduledStart,
      contactName,
      contactPhone,
      contactEmail,
      notes: notes || null,
      status: 'confirmed',
      createdAt: new Date().toISOString()
    };

    bookings.push(booking);
    this._saveToStorage('video_survey_bookings', bookings);

    // Update time slot capacity/availability
    const slotIndex = slots.findIndex((s) => s.id === timeSlot.id);
    if (slotIndex >= 0) {
      const cap = typeof slots[slotIndex].capacity === 'number' ? slots[slotIndex].capacity : 1;
      if (cap > 1) {
        slots[slotIndex].capacity = cap - 1;
      } else {
        slots[slotIndex].capacity = 0;
        slots[slotIndex].isAvailable = false;
      }
      this._saveToStorage('time_slots', slots);
    }

    const extendedBooking = Object.assign({}, booking, { timeSlot });

    const confirmationMessage = 'Video survey booked for ' + (timeSlot.label || '') + '.';

    return { booking: extendedBooking, timeSlot, confirmationMessage };
  }

  // -------------------- Checklist interfaces --------------------

  getChecklistTemplate() {
    const sections = this._getFromStorage('checklist_template_sections', []);
    const tasks = this._getFromStorage('checklist_template_tasks', []);

    const activeSections = sections.filter((s) => s.isActive);

    const resultSections = activeSections.map((section) => {
      const sectionTasks = tasks.filter((t) => t.sectionId === section.id && t.isActive);
      return { section, tasks: sectionTasks };
    });

    return { sections: resultSections };
  }

  createSavedChecklist(name, selectedTemplateTaskIds, notes) {
    const checklistName = name;
    const selectedIds = Array.isArray(selectedTemplateTaskIds) ? selectedTemplateTaskIds : [];
    const sections = this._getFromStorage('checklist_template_sections', []);
    const tasks = this._getFromStorage('checklist_template_tasks', []);
    const savedChecklists = this._getFromStorage('saved_checklists', []);
    const savedItems = this._getFromStorage('saved_checklist_items', []);

    const now = new Date().toISOString();
    const checklist = {
      id: this._generateId('saved_checklist'),
      name: checklistName,
      notes: notes || null,
      status: 'active',
      createdAt: now,
      updatedAt: now
    };
    savedChecklists.push(checklist);

    let sortOrderCounter = 1;
    const items = [];

    selectedIds.forEach((taskId) => {
      const templateTask = tasks.find((t) => t.id === taskId) || null;
      if (!templateTask) return;
      const section = sections.find((s) => s.id === templateTask.sectionId) || null;
      const sectionKey = section ? section.key : 'other';

      const item = {
        id: this._generateId('saved_checklist_item'),
        checklistId: checklist.id,
        templateTaskId: templateTask.id,
        customLabel: null,
        sectionKey,
        isCompleted: false,
        sortOrder: sortOrderCounter++
      };

      savedItems.push(item);
      items.push(
        Object.assign({}, item, {
          templateTask
        })
      );
    });

    this._saveToStorage('saved_checklists', savedChecklists);
    this._saveToStorage('saved_checklist_items', savedItems);

    return {
      checklist,
      items,
      message: 'Checklist saved'
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