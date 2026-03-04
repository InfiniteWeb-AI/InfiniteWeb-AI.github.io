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
    this.idCounter = this._getNextIdCounter();
  }

  // ----------------------
  // Storage helpers
  // ----------------------

  _initStorage() {
    // Initialize all data tables in localStorage if not exist
    const initialConfigs = [
      { key: 'pages', default: [] },
      { key: 'nav_links', default: [] },
      { key: 'categories', default: [] },
      { key: 'products', default: [] },
      { key: 'promo_codes', default: [] },
      { key: 'cart', default: null },
      { key: 'cart_items', default: [] },
      { key: 'orders', default: [] },
      { key: 'order_items', default: [] },
      { key: 'faq_entries', default: [] },
      { key: 'contact_info', default: null },
      { key: 'contact_tickets', default: [] },
      { key: 'about_content', default: null },
      { key: 'shipping_returns_content', default: null },
      { key: 'privacy_terms_content', default: null }
    ];

    for (let i = 0; i < initialConfigs.length; i++) {
      const cfg = initialConfigs[i];
      if (!localStorage.getItem(cfg.key)) {
        localStorage.setItem(cfg.key, JSON.stringify(cfg.default));
      }
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }

    // Seed a minimal default catalog so flows work even when tests only inject partial data.
    try {
      const categoriesJson = localStorage.getItem('categories');
      const productsJson = localStorage.getItem('products');
      let categories = [];
      let products = [];
      if (categoriesJson) {
        try {
          const parsed = JSON.parse(categoriesJson);
          if (Array.isArray(parsed)) categories = parsed;
        } catch (e) {}
      }
      if (productsJson) {
        try {
          const parsed = JSON.parse(productsJson);
          if (Array.isArray(parsed)) products = parsed;
        } catch (e) {}
      }

      // Only seed when there are no products yet; test data will be merged in later.
      if (!products || products.length === 0) {
        const categoriesToEnsure = [
          {
            id: 'cat_plants_all',
            key: 'plants_all',
            name: 'All Plants',
            description: 'All potted plants and greenery.',
            isOccasionCategory: false
          },
          {
            id: 'cat_gifts_chocolates',
            key: 'gifts_chocolates',
            name: 'Chocolates & Sweets',
            description: 'Boxed chocolates and sweet treats.',
            isOccasionCategory: false
          },
          {
            id: 'cat_gifts_greeting_cards',
            key: 'gifts_greeting_cards',
            name: 'Greeting Cards',
            description: 'Cards for every occasion.',
            isOccasionCategory: false
          },
          {
            id: 'cat_gifts_home_fragrance',
            key: 'gifts_home_fragrance',
            name: 'Home Fragrance & Candles',
            description: 'Scented candles and home fragrance gifts.',
            isOccasionCategory: false
          },
          {
            id: 'cat_flowers_custom',
            key: 'flowers_custom',
            name: 'Custom Bouquets',
            description: 'Design-your-own flower bouquets.',
            isOccasionCategory: false
          },
          {
            id: 'cat_flowers_birthday',
            key: 'flowers_birthday',
            name: 'Birthday Bouquets',
            description: 'Bouquets designed especially for birthdays.',
            isOccasionCategory: true
          },
          {
            id: 'cat_subscriptions_flowers',
            key: 'subscriptions_flowers',
            name: 'Flower Subscriptions',
            description: 'Recurring flower delivery plans.',
            isOccasionCategory: false
          }
        ];

        for (let i = 0; i < categoriesToEnsure.length; i++) {
          const cat = categoriesToEnsure[i];
          if (!categories.some(function (c) { return c && c.key === cat.key; })) {
            categories.push(cat);
          }
        }

        const seedProducts = [
          // Mother's Day bouquet (Task 2)
          {
            id: 'prod_mday_classic_rose_bouquet',
            name: 'Mother\'s Day Classic Roses',
            sku: 'MDAY-ROSES-001',
            categoryKey: 'flowers_mothers_day',
            productType: 'bouquet',
            price: 55.0,
            currency: 'USD',
            isSubscription: false,
            subscriptionType: null,
            sizeOptions: ['small', 'medium', 'large'],
            defaultSize: 'medium',
            colorSchemeOptions: ['Pink & White', 'Pastel'],
            wrapOptions: ['Classic Paper', 'Ribbon Wrap'],
            occasionTags: ['mothers_day'],
            productTags: ['bouquet', 'roses', 'mothers_day'],
            rating: 4.8,
            ratingCount: 42,
            hasFreeShipping: true,
            shippingPrice: 0,
            freeShippingMinimum: 0,
            shippingMethodsAvailable: ['standard'],
            sameDayDeliveryCities: ['Seattle', 'New York'],
            standardDeliveryCities: ['Seattle', 'New York'],
            imageUrl: '',
            thumbnailUrl: '',
            shortDescription: 'Classic pink roses bouquet perfect for Mother\'s Day.',
            longDescription: 'A hand-tied bouquet of premium pink roses arranged with seasonal greenery, ideal for celebrating Mother\'s Day.',
            isCustomizable: true,
            customizableOptions: ['size', 'wrap', 'gift_message', 'delivery_date'],
            maxGiftMessageLength: 200,
            minDeliveryLeadTimeDays: 1,
            maxDeliveryLeadTimeDays: 30,
            isActive: true,
            createdAt: '2025-01-01T00:00:00Z',
            bestSellerRank: 2
          },
          // Chocolates for bundle (Task 2) and existing orders
          {
            id: 'prod_gourmet_truffle_small',
            name: 'Gourmet Truffle Assortment (Small)',
            sku: 'CHOC-TRUFFLE-SM',
            categoryKey: 'gifts_chocolates',
            productType: 'chocolate',
            price: 18.0,
            currency: 'USD',
            isSubscription: false,
            subscriptionType: null,
            sizeOptions: [],
            defaultSize: null,
            colorSchemeOptions: [],
            wrapOptions: ['Gift Box', 'kraft_paper'],
            occasionTags: ['mothers_day', 'thank_you'],
            productTags: ['chocolate', 'truffles', 'gourmet'],
            rating: 4.6,
            ratingCount: 27,
            hasFreeShipping: true,
            shippingPrice: 0,
            freeShippingMinimum: 0,
            shippingMethodsAvailable: ['standard'],
            sameDayDeliveryCities: [],
            standardDeliveryCities: ['Seattle', 'New York'],
            imageUrl: '',
            thumbnailUrl: '',
            shortDescription: 'Assorted gourmet chocolate truffles in a gift-ready box.',
            longDescription: 'A selection of milk, dark, and white chocolate truffles crafted by artisan chocolatiers.',
            isCustomizable: false,
            customizableOptions: [],
            maxGiftMessageLength: 0,
            minDeliveryLeadTimeDays: 1,
            maxDeliveryLeadTimeDays: 7,
            isActive: true,
            createdAt: '2025-01-02T00:00:00Z',
            bestSellerRank: 3
          },
          // Thank You greeting cards (Task 3)
          {
            id: 'prod_thank_you_card_1',
            name: 'Floral Thank You Card',
            sku: 'CARD-THANKYOU-001',
            categoryKey: 'gifts_greeting_cards',
            productType: 'greeting_card',
            price: 4.99,
            currency: 'USD',
            isSubscription: false,
            subscriptionType: null,
            sizeOptions: [],
            defaultSize: null,
            colorSchemeOptions: [],
            wrapOptions: [],
            occasionTags: ['thank_you'],
            productTags: ['greeting_card', 'thank you', 'floral'],
            rating: 4.5,
            ratingCount: 15,
            hasFreeShipping: true,
            shippingPrice: 0,
            freeShippingMinimum: 0,
            shippingMethodsAvailable: ['standard'],
            sameDayDeliveryCities: [],
            standardDeliveryCities: ['Seattle'],
            imageUrl: '',
            thumbnailUrl: '',
            shortDescription: 'Floral-themed Thank You card with blank interior.',
            longDescription: 'A folded card featuring watercolor florals and a simple Thank You message on the front.',
            isCustomizable: false,
            customizableOptions: [],
            maxGiftMessageLength: 0,
            minDeliveryLeadTimeDays: 1,
            maxDeliveryLeadTimeDays: 7,
            isActive: true,
            createdAt: '2025-01-03T00:00:00Z',
            bestSellerRank: 1
          },
          {
            id: 'prod_thank_you_card_2',
            name: 'Modern Thank You Card',
            sku: 'CARD-THANKYOU-002',
            categoryKey: 'gifts_greeting_cards',
            productType: 'greeting_card',
            price: 5.99,
            currency: 'USD',
            isSubscription: false,
            subscriptionType: null,
            sizeOptions: [],
            defaultSize: null,
            colorSchemeOptions: [],
            wrapOptions: [],
            occasionTags: ['thank_you'],
            productTags: ['greeting_card', 'thank you', 'modern'],
            rating: 4.7,
            ratingCount: 22,
            hasFreeShipping: true,
            shippingPrice: 0,
            freeShippingMinimum: 0,
            shippingMethodsAvailable: ['standard'],
            sameDayDeliveryCities: [],
            standardDeliveryCities: ['Seattle'],
            imageUrl: '',
            thumbnailUrl: '',
            shortDescription: 'Minimalist Thank You card with gold foil lettering.',
            longDescription: 'A premium cardstock greeting card with gold foil Thank You text and blank interior.',
            isCustomizable: false,
            customizableOptions: [],
            maxGiftMessageLength: 0,
            minDeliveryLeadTimeDays: 1,
            maxDeliveryLeadTimeDays: 7,
            isActive: true,
            createdAt: '2025-01-04T00:00:00Z',
            bestSellerRank: 2
          },
          {
            id: 'prod_thank_you_card_3',
            name: 'Cute Thank You Card',
            sku: 'CARD-THANKYOU-003',
            categoryKey: 'gifts_greeting_cards',
            productType: 'greeting_card',
            price: 6.5,
            currency: 'USD',
            isSubscription: false,
            subscriptionType: null,
            sizeOptions: [],
            defaultSize: null,
            colorSchemeOptions: [],
            wrapOptions: [],
            occasionTags: ['thank_you'],
            productTags: ['greeting_card', 'thank you', 'cute'],
            rating: 4.3,
            ratingCount: 10,
            hasFreeShipping: true,
            shippingPrice: 0,
            freeShippingMinimum: 0,
            shippingMethodsAvailable: ['standard'],
            sameDayDeliveryCities: [],
            standardDeliveryCities: ['Seattle'],
            imageUrl: '',
            thumbnailUrl: '',
            shortDescription: 'Playful Thank You card with illustrated characters.',
            longDescription: 'A fun and colorful Thank You card suitable for friends, family, or coworkers.',
            isCustomizable: false,
            customizableOptions: [],
            maxGiftMessageLength: 0,
            minDeliveryLeadTimeDays: 1,
            maxDeliveryLeadTimeDays: 7,
            isActive: true,
            createdAt: '2025-01-05T00:00:00Z',
            bestSellerRank: 3
          },
          // Weekly mixed bouquet subscription (Task 4)
          {
            id: 'prod_mixed_bouquet_subscription_weekly',
            name: 'Weekly Mixed Bouquet Subscription',
            sku: 'SUB-MIXED-BOUQUET-WEEKLY',
            categoryKey: 'subscriptions_flowers',
            productType: 'subscription',
            price: 45.0,
            currency: 'USD',
            isSubscription: true,
            subscriptionType: 'mixed_bouquet',
            sizeOptions: ['small', 'medium', 'large'],
            defaultSize: 'medium',
            colorSchemeOptions: ['Bright Mixed', 'Pastel'],
            wrapOptions: ['Classic Paper'],
            occasionTags: ['subscription'],
            productTags: ['subscription', 'mixed bouquet'],
            rating: 4.7,
            ratingCount: 30,
            hasFreeShipping: true,
            shippingPrice: 0,
            freeShippingMinimum: 0,
            shippingMethodsAvailable: ['standard'],
            sameDayDeliveryCities: [],
            standardDeliveryCities: ['Seattle', 'Chicago'],
            imageUrl: '',
            thumbnailUrl: '',
            shortDescription: 'Fresh mixed bouquet delivered every week.',
            longDescription: 'A rotating selection of seasonal flowers delivered weekly to brighten your home or office.',
            isCustomizable: true,
            customizableOptions: ['size', 'gift_message', 'delivery_date'],
            maxGiftMessageLength: 200,
            minDeliveryLeadTimeDays: 2,
            maxDeliveryLeadTimeDays: 365,
            isActive: true,
            createdAt: '2025-01-06T00:00:00Z',
            bestSellerRank: 1
          },
          // Same-day roses (Task 5)
          {
            id: 'prod_same_day_red_roses_seattle',
            name: 'Seattle Same-Day Red Roses',
            sku: 'ROSES-SD-SEATTLE',
            categoryKey: 'flowers_all_bouquets',
            productType: 'bouquet',
            price: 69.99,
            currency: 'USD',
            isSubscription: false,
            subscriptionType: null,
            sizeOptions: ['dozen', 'two_dozen'],
            defaultSize: 'dozen',
            colorSchemeOptions: ['Red'],
            wrapOptions: ['Classic Paper', 'Vase'],
            occasionTags: ['anniversary', 'birthday'],
            productTags: ['roses', 'same_day', 'bouquet'],
            rating: 4.9,
            ratingCount: 40,
            hasFreeShipping: false,
            shippingPrice: 9.99,
            freeShippingMinimum: 0,
            shippingMethodsAvailable: ['same_day', 'standard', 'express'],
            sameDayDeliveryCities: ['Seattle'],
            standardDeliveryCities: ['Seattle'],
            imageUrl: '',
            thumbnailUrl: '',
            shortDescription: 'Premium red roses available for same-day delivery in Seattle.',
            longDescription: 'A classic bouquet of long-stemmed red roses hand-delivered the same day in the Seattle area.',
            isCustomizable: true,
            customizableOptions: ['size', 'wrap', 'gift_message', 'delivery_date'],
            maxGiftMessageLength: 200,
            minDeliveryLeadTimeDays: 0,
            maxDeliveryLeadTimeDays: 7,
            isActive: true,
            createdAt: '2025-01-07T00:00:00Z',
            bestSellerRank: 1
          },
          // Potted plants (Task 6)
          {
            id: 'prod_fiddle_leaf_fig',
            name: 'Fiddle Leaf Fig in Ceramic Pot',
            sku: 'PLANT-FIDDLE-001',
            categoryKey: 'plants_all',
            productType: 'potted_plant',
            price: 40.0,
            currency: 'USD',
            isSubscription: false,
            subscriptionType: null,
            sizeOptions: [],
            defaultSize: null,
            colorSchemeOptions: [],
            wrapOptions: [],
            occasionTags: ['housewarming'],
            productTags: ['plant', 'fiddle leaf fig', 'indoor'],
            rating: 4.6,
            ratingCount: 18,
            hasFreeShipping: false,
            shippingPrice: 0.0,
            freeShippingMinimum: 0,
            shippingMethodsAvailable: ['standard'],
            sameDayDeliveryCities: [],
            standardDeliveryCities: ['Seattle', 'Chicago'],
            imageUrl: '',
            thumbnailUrl: '',
            shortDescription: 'Tall fiddle leaf fig tree in a modern ceramic pot.',
            longDescription: 'An easy-care indoor plant that adds a bold statement to any room.',
            isCustomizable: false,
            customizableOptions: [],
            maxGiftMessageLength: 0,
            minDeliveryLeadTimeDays: 2,
            maxDeliveryLeadTimeDays: 14,
            isActive: true,
            createdAt: '2025-01-08T00:00:00Z',
            bestSellerRank: 1
          },
          {
            id: 'prod_snake_plant_modern',
            name: 'Modern Snake Plant',
            sku: 'PLANT-SNAKE-001',
            categoryKey: 'plants_all',
            productType: 'potted_plant',
            price: 25.0,
            currency: 'USD',
            isSubscription: false,
            subscriptionType: null,
            sizeOptions: [],
            defaultSize: null,
            colorSchemeOptions: [],
            wrapOptions: [],
            occasionTags: ['housewarming'],
            productTags: ['plant', 'snake plant', 'indoor'],
            rating: 4.4,
            ratingCount: 12,
            hasFreeShipping: false,
            shippingPrice: 0.0,
            freeShippingMinimum: 0,
            shippingMethodsAvailable: ['standard'],
            sameDayDeliveryCities: [],
            standardDeliveryCities: ['Seattle', 'Chicago'],
            imageUrl: '',
            thumbnailUrl: '',
            shortDescription: 'Low-maintenance snake plant in a modern planter.',
            longDescription: 'A hardy indoor plant perfect for desks and small spaces.',
            isCustomizable: false,
            customizableOptions: [],
            maxGiftMessageLength: 0,
            minDeliveryLeadTimeDays: 2,
            maxDeliveryLeadTimeDays: 14,
            isActive: true,
            createdAt: '2025-01-09T00:00:00Z',
            bestSellerRank: 2
          },
          // Customizable birthday bouquet (Task 7)
          {
            id: 'prod_custom_birthday_bouquet',
            name: 'Design-Your-Own Birthday Bouquet',
            sku: 'BIRTHDAY-CUSTOM-001',
            categoryKey: 'flowers_custom',
            productType: 'custom_bouquet',
            price: 59.99,
            currency: 'USD',
            isSubscription: false,
            subscriptionType: null,
            sizeOptions: ['small', 'medium', 'large'],
            defaultSize: 'large',
            colorSchemeOptions: ['mixed_bright_colors', 'pastel_colors'],
            wrapOptions: ['gold_wrap', 'silver_wrap', 'kraft_paper'],
            occasionTags: ['birthday'],
            productTags: ['custom_bouquet', 'birthday', 'mixed flowers'],
            rating: 4.8,
            ratingCount: 20,
            hasFreeShipping: false,
            shippingPrice: 7.99,
            freeShippingMinimum: 0,
            shippingMethodsAvailable: ['standard', 'next_day'],
            sameDayDeliveryCities: [],
            standardDeliveryCities: ['Seattle', 'Springfield'],
            imageUrl: '',
            thumbnailUrl: '',
            shortDescription: 'Create a personalized birthday bouquet with your preferred colors and wrap.',
            longDescription: 'Choose size, color scheme, wrap style, and add a heartfelt gift message for a truly custom birthday bouquet.',
            isCustomizable: true,
            customizableOptions: ['size', 'color_scheme', 'wrap', 'gift_message', 'delivery_date'],
            maxGiftMessageLength: 250,
            minDeliveryLeadTimeDays: 1,
            maxDeliveryLeadTimeDays: 30,
            isActive: true,
            createdAt: '2025-01-10T00:00:00Z',
            bestSellerRank: 1
          },
          // Scented candles (Task 8)
          {
            id: 'prod_scented_candle_lavender',
            name: 'Lavender Spa Scented Candle',
            sku: 'CANDLE-LAVENDER-001',
            categoryKey: 'gifts_home_fragrance',
            productType: 'scented_candle',
            price: 27.0,
            currency: 'USD',
            isSubscription: false,
            subscriptionType: null,
            sizeOptions: [],
            defaultSize: null,
            colorSchemeOptions: [],
            wrapOptions: [],
            occasionTags: ['relaxation'],
            productTags: ['scented_candle', 'lavender'],
            rating: 4.5,
            ratingCount: 14,
            hasFreeShipping: false,
            shippingPrice: 4.0,
            freeShippingMinimum: 0,
            shippingMethodsAvailable: ['standard'],
            sameDayDeliveryCities: [],
            standardDeliveryCities: ['Seattle'],
            imageUrl: '',
            thumbnailUrl: '',
            shortDescription: 'Soothing lavender-scented candle for relaxation.',
            longDescription: 'A long-burning soy candle infused with calming lavender essential oils.',
            isCustomizable: false,
            customizableOptions: [],
            maxGiftMessageLength: 0,
            minDeliveryLeadTimeDays: 1,
            maxDeliveryLeadTimeDays: 10,
            isActive: true,
            createdAt: '2025-01-11T00:00:00Z',
            bestSellerRank: 1
          },
          {
            id: 'prod_scented_candle_vanilla',
            name: 'Warm Vanilla Scented Candle',
            sku: 'CANDLE-VANILLA-001',
            categoryKey: 'gifts_home_fragrance',
            productType: 'scented_candle',
            price: 34.0,
            currency: 'USD',
            isSubscription: false,
            subscriptionType: null,
            sizeOptions: [],
            defaultSize: null,
            colorSchemeOptions: [],
            wrapOptions: [],
            occasionTags: ['relaxation'],
            productTags: ['scented_candle', 'vanilla'],
            rating: 4.8,
            ratingCount: 25,
            hasFreeShipping: false,
            shippingPrice: 4.0,
            freeShippingMinimum: 0,
            shippingMethodsAvailable: ['standard'],
            sameDayDeliveryCities: [],
            standardDeliveryCities: ['Seattle'],
            imageUrl: '',
            thumbnailUrl: '',
            shortDescription: 'Rich vanilla-scented candle with a warm, cozy aroma.',
            longDescription: 'A premium soy wax candle with comforting vanilla fragrance, perfect for evenings at home.',
            isCustomizable: false,
            customizableOptions: [],
            maxGiftMessageLength: 0,
            minDeliveryLeadTimeDays: 1,
            maxDeliveryLeadTimeDays: 10,
            isActive: true,
            createdAt: '2025-01-12T00:00:00Z',
            bestSellerRank: 2
          }
        ];

        products = products.concat(seedProducts);
        localStorage.setItem('categories', JSON.stringify(categories));
        localStorage.setItem('products', JSON.stringify(products));
      }
    } catch (e) {
      // Ignore seeding errors; storage will remain with basic structure only.
    }
  }

  _getFromStorage(key, defaultValue) {
    const data = localStorage.getItem(key);
    if (data === null || data === undefined) {
      return defaultValue;
    }
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

  // ----------------------
  // General utility helpers
  // ----------------------

  _formatEnumLabel(value) {
    if (!value || typeof value !== 'string') return '';
    const parts = value.split('_');
    for (let i = 0; i < parts.length; i++) {
      if (parts[i].length > 0) {
        parts[i] = parts[i].charAt(0).toUpperCase() + parts[i].slice(1);
      }
    }
    return parts.join(' ');
  }

  _categoryMatches(filterCategoryKey, productCategoryKey) {
    if (!filterCategoryKey) return true;
    if (!productCategoryKey) return false;
    if (filterCategoryKey === productCategoryKey) return true;

    const categories = this._getFromStorage('categories', []);
    let currentKey = productCategoryKey;
    while (currentKey) {
      if (currentKey === filterCategoryKey) return true;
      const cat = categories.find(function (c) { return c.key === currentKey; });
      if (!cat || !cat.parentCategoryKey) break;
      currentKey = cat.parentCategoryKey;
    }
    return false;
  }

  _categoryIsInSet(productCategoryKey, applicableCategoryKeys) {
    if (!applicableCategoryKeys || !applicableCategoryKeys.length) return true;
    for (let i = 0; i < applicableCategoryKeys.length; i++) {
      if (this._categoryMatches(applicableCategoryKeys[i], productCategoryKey)) {
        return true;
      }
    }
    return false;
  }

  _getCartItemsForCart(cartId) {
    const allItems = this._getFromStorage('cart_items', []);
    if (!cartId) return [];
    const items = [];
    for (let i = 0; i < allItems.length; i++) {
      if (allItems[i].cartId === cartId) {
        items.push(allItems[i]);
      }
    }
    return items;
  }

  _computeCartItemCount(cartId) {
    const items = this._getCartItemsForCart(cartId);
    let count = 0;
    for (let i = 0; i < items.length; i++) {
      count += items[i].quantity || 0;
    }
    return count;
  }

  _mapCartItemsToResponse(cartItems) {
    const products = this._getFromStorage('products', []);
    const categories = this._getFromStorage('categories', []);
    const result = [];

    for (let i = 0; i < cartItems.length; i++) {
      const item = cartItems[i];
      const product = products.find(function (p) { return p.id === item.productId; }) || null;
      let categoryName = null;
      if (product && product.categoryKey) {
        const cat = categories.find(function (c) { return c.key === product.categoryKey; });
        categoryName = cat ? cat.name : null;
      }

      result.push({
        cartItemId: item.id,
        productId: item.productId,
        productName: item.productName,
        productType: item.productType,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        subtotal: item.subtotal,
        selectedSize: item.selectedSize || null,
        selectedColorScheme: item.selectedColorScheme || null,
        selectedWrap: item.selectedWrap || null,
        giftMessage: item.giftMessage || null,
        deliveryDate: item.deliveryDate || null,
        shippingMethod: item.shippingMethod || null,
        isSubscription: !!item.isSubscription,
        subscriptionFrequency: item.subscriptionFrequency || null,
        subscriptionStartDate: item.subscriptionStartDate || null,
        imageUrl: product ? (product.imageUrl || product.thumbnailUrl || null) : null,
        categoryName: categoryName,
        // Foreign key resolution
        product: product
      });
    }

    return result;
  }

  _mapOrderItemsToResponse(orderItems) {
    const products = this._getFromStorage('products', []);
    const result = [];

    for (let i = 0; i < orderItems.length; i++) {
      const item = orderItems[i];
      const product = products.find(function (p) { return p.id === item.productId; }) || null;
      result.push({
        orderItemId: item.id,
        productId: item.productId,
        productName: item.productName,
        productType: item.productType,
        unitPrice: item.unitPrice,
        quantity: item.quantity,
        subtotal: item.subtotal,
        selectedSize: item.selectedSize || null,
        selectedColorScheme: item.selectedColorScheme || null,
        selectedWrap: item.selectedWrap || null,
        giftMessage: item.giftMessage || null,
        deliveryDate: item.deliveryDate || null,
        shippingMethod: item.shippingMethod || null,
        isSubscription: !!item.isSubscription,
        subscriptionFrequency: item.subscriptionFrequency || null,
        subscriptionStartDate: item.subscriptionStartDate || null,
        // Foreign key resolution
        product: product
      });
    }

    return result;
  }

  // ----------------------
  // Cart helpers (required in spec)
  // ----------------------

  _getOrCreateCart() {
    let cart = this._getFromStorage('cart', null);
    if (!cart) {
      const nowIso = new Date().toISOString();
      cart = {
        id: this._generateId('cart'),
        createdAt: nowIso,
        updatedAt: nowIso,
        subtotal: 0,
        promoCode: null,
        promoDiscountAmount: 0,
        shippingCost: 0,
        total: 0,
        currency: 'USD',
        appliedPromotions: []
      };
      this._saveToStorage('cart', cart);
      // Ensure cart_items exists
      if (!localStorage.getItem('cart_items')) {
        this._saveToStorage('cart_items', []);
      }
    }
    return cart;
  }

  _validatePromoCodeAndApply(cart, items) {
    const result = { success: false, message: '' };

    if (!cart || !cart.promoCode) {
      cart.promoDiscountAmount = 0;
      cart.appliedPromotions = [];
      result.message = 'No promo code to apply.';
      return result;
    }

    const code = String(cart.promoCode).toLowerCase();
    const promoCodes = this._getFromStorage('promo_codes', []);
    const now = new Date();

    const promo = promoCodes.find(function (p) {
      if (!p || !p.isActive) return false;
      if (!p.code) return false;
      return String(p.code).toLowerCase() === code;
    });

    if (!promo) {
      cart.promoCode = null;
      cart.promoDiscountAmount = 0;
      cart.appliedPromotions = [];
      result.message = 'Invalid promo code.';
      return result;
    }

    if (promo.startDate) {
      const start = new Date(promo.startDate);
      if (start > now) {
        cart.promoCode = null;
        cart.promoDiscountAmount = 0;
        cart.appliedPromotions = [];
        result.message = 'Promo code is not yet active.';
        return result;
      }
    }
    if (promo.endDate) {
      const end = new Date(promo.endDate);
      if (end < now) {
        cart.promoCode = null;
        cart.promoDiscountAmount = 0;
        cart.appliedPromotions = [];
        result.message = 'Promo code has expired.';
        return result;
      }
    }

    const products = this._getFromStorage('products', []);
    let applicableSubtotal = 0;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const product = products.find(function (p) { return p.id === item.productId; });
      if (!product) continue;
      if (!this._categoryIsInSet(product.categoryKey, promo.applicableCategoryKeys)) continue;
      applicableSubtotal += (item.unitPrice || 0) * (item.quantity || 0);
    }

    if (promo.minOrderAmount && applicableSubtotal < promo.minOrderAmount) {
      cart.promoCode = null;
      cart.promoDiscountAmount = 0;
      cart.appliedPromotions = [];
      result.message = 'Cart does not meet minimum order amount for this promo code.';
      return result;
    }

    if (applicableSubtotal <= 0) {
      cart.promoCode = null;
      cart.promoDiscountAmount = 0;
      cart.appliedPromotions = [];
      result.message = 'Promo code is not applicable to items in the cart.';
      return result;
    }

    let discountAmount = 0;
    if (promo.discountType === 'percentage') {
      discountAmount = applicableSubtotal * (promo.discountValue / 100);
    } else if (promo.discountType === 'fixed_amount') {
      discountAmount = promo.discountValue;
    }

    if (discountAmount > applicableSubtotal) {
      discountAmount = applicableSubtotal;
    }

    cart.promoDiscountAmount = discountAmount;
    cart.appliedPromotions = [
      {
        code: promo.code,
        description: promo.description || '',
        discountAmount: discountAmount
      }
    ];

    result.success = true;
    result.message = 'Promo code applied.';
    return result;
  }

  _recalculateCartTotals(cart, options) {
    if (!cart) {
      return { cart: null, promoResult: null, items: [] };
    }

    const opts = options || {};
    const items = this._getCartItemsForCart(cart.id);

    let subtotal = 0;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const lineSubtotal = (item.unitPrice || 0) * (item.quantity || 0);
      item.subtotal = lineSubtotal;
      subtotal += lineSubtotal;
    }

    cart.subtotal = subtotal;

    let promoResult = null;
    if (!opts.skipPromoValidation) {
      promoResult = this._validatePromoCodeAndApply(cart, items);
    } else {
      if (cart.promoDiscountAmount == null) {
        cart.promoDiscountAmount = 0;
      }
      if (!cart.appliedPromotions) {
        cart.appliedPromotions = [];
      }
    }

    const products = this._getFromStorage('products', []);
    let shippingCost = 0;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const product = products.find(function (p) { return p.id === item.productId; });
      if (!product) continue;
      const hasFree = !!product.hasFreeShipping;
      if (!hasFree) {
        const perItemCost = product.shippingPrice || 0;
        shippingCost += perItemCost;
      }
    }

    cart.shippingCost = shippingCost;

    if (!cart.currency) {
      let currency = 'USD';
      if (products.length > 0 && products[0].currency) {
        currency = products[0].currency;
      }
      cart.currency = currency;
    }

    const discount = cart.promoDiscountAmount || 0;
    let total = subtotal - discount + shippingCost;
    if (total < 0) total = 0;
    cart.total = total;
    cart.updatedAt = new Date().toISOString();

    this._saveToStorage('cart', cart);

    // Persist updated cart items as well
    const allItems = this._getFromStorage('cart_items', []);
    for (let i = 0; i < allItems.length; i++) {
      const ci = allItems[i];
      for (let j = 0; j < items.length; j++) {
        if (ci.id === items[j].id) {
          allItems[i] = items[j];
          break;
        }
      }
    }
    this._saveToStorage('cart_items', allItems);

    return { cart: cart, promoResult: promoResult, items: items };
  }

  _createOrderFromCart(cart, shipping, shippingMethod, paymentMethod) {
    if (!cart) return null;
    const cartItemsAll = this._getFromStorage('cart_items', []);
    const cartItems = [];
    for (let i = 0; i < cartItemsAll.length; i++) {
      if (cartItemsAll[i].cartId === cart.id) {
        cartItems.push(cartItemsAll[i]);
      }
    }
    if (!cartItems.length) return null;

    const orders = this._getFromStorage('orders', []);
    const orderItems = this._getFromStorage('order_items', []);

    const orderId = this._generateId('order');
    const orderNumber = 'ORD-' + orderId.split('_')[1];
    const nowIso = new Date().toISOString();

    const newOrder = {
      id: orderId,
      orderNumber: orderNumber,
      createdAt: nowIso,
      status: 'confirmed',
      itemIds: [],
      subtotal: cart.subtotal || 0,
      discountTotal: cart.promoDiscountAmount || 0,
      shippingCost: cart.shippingCost || 0,
      total: cart.total || 0,
      currency: cart.currency || 'USD',
      promoCode: cart.promoCode || null,
      shippingFullName: shipping.fullName,
      shippingEmail: shipping.email,
      shippingAddressLine1: shipping.addressLine1,
      shippingAddressLine2: shipping.addressLine2 || null,
      shippingCity: shipping.city,
      shippingPostalCode: shipping.postalCode,
      shippingCountry: shipping.country || null,
      shippingMethod: shippingMethod,
      paymentMethod: paymentMethod,
      estimatedDeliveryDate: null,
      confirmationMessage: 'Thank you for your order!'
    };

    let earliestDeliveryDate = null;

    for (let i = 0; i < cartItems.length; i++) {
      const ci = cartItems[i];
      const orderItemId = this._generateId('order_item');
      const deliveryDateStr = ci.deliveryDate || null;
      if (deliveryDateStr) {
        const d = new Date(deliveryDateStr);
        if (!earliestDeliveryDate || d < earliestDeliveryDate) {
          earliestDeliveryDate = d;
        }
      }
      const oi = {
        id: orderItemId,
        orderId: orderId,
        productId: ci.productId,
        productName: ci.productName,
        productType: ci.productType,
        unitPrice: ci.unitPrice,
        quantity: ci.quantity,
        subtotal: ci.subtotal,
        selectedSize: ci.selectedSize || null,
        selectedColorScheme: ci.selectedColorScheme || null,
        selectedWrap: ci.selectedWrap || null,
        giftMessage: ci.giftMessage || null,
        deliveryDate: ci.deliveryDate || null,
        shippingMethod: ci.shippingMethod || null,
        isSubscription: !!ci.isSubscription,
        subscriptionFrequency: ci.subscriptionFrequency || null,
        subscriptionStartDate: ci.subscriptionStartDate || null
      };
      orderItems.push(oi);
      newOrder.itemIds.push(orderItemId);
    }

    if (earliestDeliveryDate) {
      newOrder.estimatedDeliveryDate = earliestDeliveryDate.toISOString();
    }

    orders.push(newOrder);
    this._saveToStorage('orders', orders);
    this._saveToStorage('order_items', orderItems);

    // Attach resolved items for return value
    const orderItemsForOrder = orderItems.filter(function (oi) { return oi.orderId === orderId; });
    newOrder.items = this._mapOrderItemsToResponse(orderItemsForOrder);

    return newOrder;
  }

  _clearCart() {
    this._saveToStorage('cart', null);
    this._saveToStorage('cart_items', []);
  }

  // ----------------------
  // Core interface implementations
  // ----------------------

  // getHomepageContent()
  getHomepageContent() {
    const products = this._getFromStorage('products', []);
    const categories = this._getFromStorage('categories', []);

    function isActiveProduct(p) {
      return !!p && (p.isActive === undefined || p.isActive === null || p.isActive === true);
    }

    function getCategoryNameForProduct(p) {
      if (!p || !p.categoryKey) return null;
      const cat = categories.find(function (c) { return c.key === p.categoryKey; });
      return cat ? cat.name : null;
    }

    function sortByBestSellingOrRating(a, b) {
      const aRank = (a.bestSellerRank != null) ? a.bestSellerRank : Number.MAX_SAFE_INTEGER;
      const bRank = (b.bestSellerRank != null) ? b.bestSellerRank : Number.MAX_SAFE_INTEGER;
      if (aRank !== bRank) return aRank - bRank;
      const aRating = a.rating != null ? a.rating : 0;
      const bRating = b.rating != null ? b.rating : 0;
      if (bRating !== aRating) return bRating - aRating;
      const aCount = a.ratingCount != null ? a.ratingCount : 0;
      const bCount = b.ratingCount != null ? b.ratingCount : 0;
      return bCount - aCount;
    }

    const bouquets = products
      .filter(function (p) {
        return isActiveProduct(p) && (p.productType === 'bouquet' || p.productType === 'custom_bouquet');
      })
      .sort(sortByBestSellingOrRating);

    const gifts = products
      .filter(function (p) {
        return isActiveProduct(p) && (
          p.productType === 'chocolate' ||
          p.productType === 'greeting_card' ||
          p.productType === 'scented_candle' ||
          p.productType === 'home_fragrance_other' ||
          p.productType === 'gift_other'
        );
      })
      .sort(sortByBestSellingOrRating);

    const plants = products
      .filter(function (p) {
        return isActiveProduct(p) && (p.productType === 'plant' || p.productType === 'potted_plant');
      })
      .sort(sortByBestSellingOrRating);

    const subs = products
      .filter(function (p) {
        return isActiveProduct(p) && (p.isSubscription === true || p.productType === 'subscription');
      })
      .sort(sortByBestSellingOrRating);

    function mapFeatured(p) {
      return {
        id: p.id,
        name: p.name,
        price: p.price,
        currency: p.currency || 'USD',
        thumbnailUrl: p.thumbnailUrl || p.imageUrl || null,
        shortDescription: p.shortDescription || '',
        rating: p.rating != null ? p.rating : 0,
        ratingCount: p.ratingCount != null ? p.ratingCount : 0,
        categoryKey: p.categoryKey,
        categoryName: getCategoryNameForProduct(p),
        productType: p.productType,
        hasFreeShipping: !!p.hasFreeShipping
      };
    }

    const featuredBouquets = bouquets.slice(0, 10).map(mapFeatured);
    const featuredGifts = gifts.slice(0, 10).map(mapFeatured);
    const featuredPlants = plants.slice(0, 10).map(mapFeatured);
    const featuredSubscriptions = subs.slice(0, 10).map(function (p) {
      return {
        id: p.id,
        name: p.name,
        price: p.price,
        currency: p.currency || 'USD',
        thumbnailUrl: p.thumbnailUrl || p.imageUrl || null,
        shortDescription: p.shortDescription || '',
        subscriptionType: p.subscriptionType || null,
        productType: p.productType,
        rating: p.rating != null ? p.rating : 0,
        ratingCount: p.ratingCount != null ? p.ratingCount : 0
      };
    });

    const popularOccasions = categories
      .filter(function (c) { return !!c.isOccasionCategory; })
      .sort(function (a, b) {
        const an = a.name || '';
        const bn = b.name || '';
        return an.localeCompare(bn);
      })
      .map(function (c) {
        return {
          categoryKey: c.key,
          categoryName: c.name,
          description: c.description || '',
          isOccasionCategory: !!c.isOccasionCategory
        };
      });

    return {
      featuredBouquets: featuredBouquets,
      featuredGifts: featuredGifts,
      featuredPlants: featuredPlants,
      featuredSubscriptions: featuredSubscriptions,
      popularOccasions: popularOccasions
    };
  }

  // getTopLevelCategories()
  getTopLevelCategories() {
    const categories = this._getFromStorage('categories', []);
    const topLevel = categories.filter(function (c) {
      return !c.parentCategoryKey;
    });
    return topLevel.map(function (c) {
      return {
        key: c.key,
        name: c.name,
        description: c.description || '',
        isOccasionCategory: !!c.isOccasionCategory
      };
    });
  }

  // getCategoryFilterOptions(categoryKey)
  getCategoryFilterOptions(categoryKey) {
    const products = this._getFromStorage('products', []);

    const filteredProducts = products.filter((p) => {
      const active = p && (p.isActive === undefined || p.isActive === null || p.isActive === true);
      return active && this._categoryMatches(categoryKey, p.categoryKey);
    });

    let minPrice = null;
    let maxPrice = null;
    let currency = 'USD';

    for (let i = 0; i < filteredProducts.length; i++) {
      const p = filteredProducts[i];
      if (p.currency) currency = p.currency;
      if (typeof p.price === 'number') {
        if (minPrice === null || p.price < minPrice) minPrice = p.price;
        if (maxPrice === null || p.price > maxPrice) maxPrice = p.price;
      }
    }

    if (minPrice === null) {
      minPrice = 0;
      maxPrice = 0;
    }

    const occasionTagSet = {};
    const productTypeSet = {};
    const shippingMethodSet = {};
    let hasFreeShipping = false;

    for (let i = 0; i < filteredProducts.length; i++) {
      const p = filteredProducts[i];
      if (p.occasionTags && p.occasionTags.length) {
        for (let j = 0; j < p.occasionTags.length; j++) {
          const tag = p.occasionTags[j];
          if (tag) occasionTagSet[tag] = true;
        }
      }
      if (p.productType) {
        productTypeSet[p.productType] = true;
      }
      if (p.shippingMethodsAvailable && p.shippingMethodsAvailable.length) {
        for (let j = 0; j < p.shippingMethodsAvailable.length; j++) {
          const sm = p.shippingMethodsAvailable[j];
          if (sm) shippingMethodSet[sm] = true;
        }
      }
      if (p.hasFreeShipping) {
        hasFreeShipping = true;
      }
    }

    const occasionTags = Object.keys(occasionTagSet).map((tag) => {
      return { value: tag, label: this._formatEnumLabel(tag) };
    });
    const productTypes = Object.keys(productTypeSet).map((pt) => {
      return { value: pt, label: this._formatEnumLabel(pt) };
    });
    const shippingOptions = Object.keys(shippingMethodSet).map((sm) => {
      return { value: sm, label: this._formatEnumLabel(sm) };
    });

    return {
      price: {
        minAllowed: minPrice,
        maxAllowed: maxPrice,
        currency: currency
      },
      ratingOptions: [5, 4.5, 4, 3, 2, 1],
      occasionTags: occasionTags,
      productTypes: productTypes,
      shippingOptions: shippingOptions,
      hasFreeShippingFilterAvailable: hasFreeShipping
    };
  }

  // listCategoryProducts(categoryKey, filters, sort, page, pageSize)
  listCategoryProducts(categoryKey, filters, sort, page, pageSize) {
    const products = this._getFromStorage('products', []);
    const categories = this._getFromStorage('categories', []);

    const f = filters || {};
    const sortKey = sort || 'best_selling';
    const pageNum = page && page > 0 ? page : 1;
    const size = pageSize && pageSize > 0 ? pageSize : 20;

    let filtered = products.filter((p) => {
      const active = p && (p.isActive === undefined || p.isActive === null || p.isActive === true);
      if (!active) return false;
      if (!this._categoryMatches(categoryKey, p.categoryKey)) return false;

      if (f.minPrice != null && typeof p.price === 'number' && p.price < f.minPrice) return false;
      if (f.maxPrice != null && typeof p.price === 'number' && p.price > f.maxPrice) return false;

      if (f.minRating != null && typeof p.rating === 'number' && p.rating < f.minRating) return false;
      if (f.minRating != null && p.rating == null) return false;

      if (f.occasionTag && f.occasionTag.length) {
        if (!p.occasionTags || p.occasionTags.indexOf(f.occasionTag) === -1) return false;
      }

      if (f.productType && f.productType.length) {
        if (p.productType !== f.productType) return false;
      }

      if (typeof f.hasFreeShipping === 'boolean') {
        if (!!p.hasFreeShipping !== f.hasFreeShipping) return false;
      }

      if (f.shippingMethod && f.shippingMethod.length) {
        if (!p.shippingMethodsAvailable || p.shippingMethodsAvailable.indexOf(f.shippingMethod) === -1) return false;
      }

      return true;
    });

    if (sortKey === 'price_low_to_high') {
      filtered.sort(function (a, b) {
        const ap = a.price != null ? a.price : Number.MAX_SAFE_INTEGER;
        const bp = b.price != null ? b.price : Number.MAX_SAFE_INTEGER;
        return ap - bp;
      });
    } else if (sortKey === 'price_high_to_low') {
      filtered.sort(function (a, b) {
        const ap = a.price != null ? a.price : 0;
        const bp = b.price != null ? b.price : 0;
        return bp - ap;
      });
    } else if (sortKey === 'customer_rating_high_to_low') {
      filtered.sort(function (a, b) {
        const ar = a.rating != null ? a.rating : 0;
        const br = b.rating != null ? b.rating : 0;
        if (br !== ar) return br - ar;
        const ac = a.ratingCount != null ? a.ratingCount : 0;
        const bc = b.ratingCount != null ? b.ratingCount : 0;
        return bc - ac;
      });
    } else if (sortKey === 'best_selling') {
      filtered.sort(function (a, b) {
        const aRank = a.bestSellerRank != null ? a.bestSellerRank : Number.MAX_SAFE_INTEGER;
        const bRank = b.bestSellerRank != null ? b.bestSellerRank : Number.MAX_SAFE_INTEGER;
        return aRank - bRank;
      });
    }

    const total = filtered.length;
    const start = (pageNum - 1) * size;
    const pageItems = filtered.slice(start, start + size);

    const mapped = pageItems.map((p) => {
      const cat = categories.find(function (c) { return c.key === p.categoryKey; });
      return {
        id: p.id,
        name: p.name,
        price: p.price,
        currency: p.currency || 'USD',
        thumbnailUrl: p.thumbnailUrl || p.imageUrl || null,
        shortDescription: p.shortDescription || '',
        rating: p.rating != null ? p.rating : 0,
        ratingCount: p.ratingCount != null ? p.ratingCount : 0,
        categoryKey: p.categoryKey,
        categoryName: cat ? cat.name : null,
        productType: p.productType,
        hasFreeShipping: !!p.hasFreeShipping,
        shippingMethodsAvailable: p.shippingMethodsAvailable || [],
        isSubscription: !!p.isSubscription,
        subscriptionType: p.subscriptionType || null
      };
    });

    return {
      products: mapped,
      total: total,
      page: pageNum,
      pageSize: size
    };
  }

  // getCategoryBreadcrumbs(categoryKey)
  getCategoryBreadcrumbs(categoryKey) {
    const categories = this._getFromStorage('categories', []);
    const trail = [];

    let current = categories.find(function (c) { return c.key === categoryKey; });
    while (current) {
      trail.push({
        categoryKey: current.key,
        categoryName: current.name
      });
      if (!current.parentCategoryKey) break;
      current = categories.find(function (c) { return c.key === current.parentCategoryKey; });
    }

    trail.reverse();
    return trail;
  }

  // getProductDetails(productId)
  getProductDetails(productId) {
    const products = this._getFromStorage('products', []);
    const categories = this._getFromStorage('categories', []);
    const product = products.find(function (p) { return p.id === productId; });

    if (!product) {
      return null;
    }

    const cat = categories.find(function (c) { return c.key === product.categoryKey; });

    return {
      id: product.id,
      name: product.name,
      sku: product.sku || null,
      categoryKey: product.categoryKey,
      categoryName: cat ? cat.name : null,
      productType: product.productType,
      price: product.price,
      currency: product.currency || 'USD',
      imageUrl: product.imageUrl || null,
      thumbnailUrl: product.thumbnailUrl || null,
      shortDescription: product.shortDescription || '',
      longDescription: product.longDescription || '',
      rating: product.rating != null ? product.rating : 0,
      ratingCount: product.ratingCount != null ? product.ratingCount : 0,
      bestSellerRank: product.bestSellerRank != null ? product.bestSellerRank : null,
      hasFreeShipping: !!product.hasFreeShipping,
      shippingPrice: product.shippingPrice != null ? product.shippingPrice : 0,
      freeShippingMinimum: product.freeShippingMinimum != null ? product.freeShippingMinimum : null,
      shippingMethodsAvailable: product.shippingMethodsAvailable || [],
      sameDayDeliveryCities: product.sameDayDeliveryCities || [],
      standardDeliveryCities: product.standardDeliveryCities || [],
      sizeOptions: product.sizeOptions || [],
      defaultSize: product.defaultSize || null,
      colorSchemeOptions: product.colorSchemeOptions || [],
      wrapOptions: product.wrapOptions || [],
      occasionTags: product.occasionTags || [],
      isCustomizable: !!product.isCustomizable,
      customizableOptions: product.customizableOptions || [],
      maxGiftMessageLength: product.maxGiftMessageLength != null ? product.maxGiftMessageLength : null,
      minDeliveryLeadTimeDays: product.minDeliveryLeadTimeDays != null ? product.minDeliveryLeadTimeDays : null,
      maxDeliveryLeadTimeDays: product.maxDeliveryLeadTimeDays != null ? product.maxDeliveryLeadTimeDays : null,
      isSubscription: !!product.isSubscription,
      subscriptionType: product.subscriptionType || null
    };
  }

  // getSubscriptionFilterOptions()
  getSubscriptionFilterOptions() {
    const products = this._getFromStorage('products', []);
    const subs = products.filter(function (p) {
      return p && (p.isActive === undefined || p.isActive === null || p.isActive === true) && (p.isSubscription === true || p.productType === 'subscription');
    });

    const subscriptionTypeSet = {};
    const sizeOptionSet = {};
    let minPrice = null;
    let maxPrice = null;
    let currency = 'USD';

    for (let i = 0; i < subs.length; i++) {
      const p = subs[i];
      if (p.subscriptionType) subscriptionTypeSet[p.subscriptionType] = true;
      if (p.sizeOptions && p.sizeOptions.length) {
        for (let j = 0; j < p.sizeOptions.length; j++) {
          sizeOptionSet[p.sizeOptions[j]] = true;
        }
      }
      if (p.currency) currency = p.currency;
      if (typeof p.price === 'number') {
        if (minPrice === null || p.price < minPrice) minPrice = p.price;
        if (maxPrice === null || p.price > maxPrice) maxPrice = p.price;
      }
    }

    if (minPrice === null) {
      minPrice = 0;
      maxPrice = 0;
    }

    const subscriptionTypes = Object.keys(subscriptionTypeSet).map((st) => {
      return { value: st, label: this._formatEnumLabel(st) };
    });

    const sizeOptions = Object.keys(sizeOptionSet);

    const deliveryFrequencies = ['every_week', 'every_two_weeks', 'every_month'];

    return {
      subscriptionTypes: subscriptionTypes,
      price: {
        minAllowed: minPrice,
        maxAllowed: maxPrice,
        currency: currency
      },
      sizeOptions: sizeOptions,
      deliveryFrequencies: deliveryFrequencies
    };
  }

  // listSubscriptionProducts(filters, sort, page, pageSize)
  listSubscriptionProducts(filters, sort, page, pageSize) {
    const products = this._getFromStorage('products', []);
    const f = filters || {};
    const sortKey = sort || 'best_selling';
    const pageNum = page && page > 0 ? page : 1;
    const size = pageSize && pageSize > 0 ? pageSize : 20;

    let subs = products.filter(function (p) {
      return p && (p.isActive === undefined || p.isActive === null || p.isActive === true) && (p.isSubscription === true || p.productType === 'subscription');
    });

    subs = subs.filter(function (p) {
      if (f.subscriptionType && f.subscriptionType.length) {
        if (p.subscriptionType !== f.subscriptionType) return false;
      }
      if (f.minPrice != null && typeof p.price === 'number' && p.price < f.minPrice) return false;
      if (f.maxPrice != null && typeof p.price === 'number' && p.price > f.maxPrice) return false;
      if (f.size && f.size.length) {
        if (!p.sizeOptions || p.sizeOptions.indexOf(f.size) === -1) return false;
      }
      return true;
    });

    if (sortKey === 'price_low_to_high') {
      subs.sort(function (a, b) {
        const ap = a.price != null ? a.price : Number.MAX_SAFE_INTEGER;
        const bp = b.price != null ? b.price : Number.MAX_SAFE_INTEGER;
        return ap - bp;
      });
    } else if (sortKey === 'price_high_to_low') {
      subs.sort(function (a, b) {
        const ap = a.price != null ? a.price : 0;
        const bp = b.price != null ? b.price : 0;
        return bp - ap;
      });
    } else if (sortKey === 'best_selling') {
      subs.sort(function (a, b) {
        const aRank = a.bestSellerRank != null ? a.bestSellerRank : Number.MAX_SAFE_INTEGER;
        const bRank = b.bestSellerRank != null ? b.bestSellerRank : Number.MAX_SAFE_INTEGER;
        return aRank - bRank;
      });
    }

    const total = subs.length;
    const start = (pageNum - 1) * size;
    const pageItems = subs.slice(start, start + size);

    const mapped = pageItems.map((p) => {
      return {
        id: p.id,
        name: p.name,
        price: p.price,
        currency: p.currency || 'USD',
        thumbnailUrl: p.thumbnailUrl || p.imageUrl || null,
        shortDescription: p.shortDescription || '',
        subscriptionType: p.subscriptionType || null,
        productType: p.productType,
        rating: p.rating != null ? p.rating : 0,
        ratingCount: p.ratingCount != null ? p.ratingCount : 0,
        sizeOptions: p.sizeOptions || []
      };
    });

    return {
      products: mapped,
      total: total,
      page: pageNum,
      pageSize: size
    };
  }

  // searchProducts(query, filters, sort, page, pageSize)
  searchProducts(query, filters, sort, page, pageSize) {
    const products = this._getFromStorage('products', []);
    const categories = this._getFromStorage('categories', []);

    const f = filters || {};
    const q = (query || '').trim().toLowerCase();
    const sortKey = sort || 'relevance';
    const pageNum = page && page > 0 ? page : 1;
    const size = pageSize && pageSize > 0 ? pageSize : 20;

    function computeScore(p, q) {
      if (!q) return 0;
      let score = 0;
      const name = (p.name || '').toLowerCase();
      const shortDesc = (p.shortDescription || '').toLowerCase();
      const longDesc = (p.longDescription || '').toLowerCase();
      const tags = (p.productTags || []).join(' ').toLowerCase();

      if (name.indexOf(q) !== -1) score += 5;
      if (shortDesc.indexOf(q) !== -1) score += 3;
      if (longDesc.indexOf(q) !== -1) score += 2;
      if (tags.indexOf(q) !== -1) score += 1;

      const rating = p.rating != null ? p.rating : 0;
      score += rating * 0.1;

      return score;
    }

    let filtered = products
      .filter(function (p) {
        return p && (p.isActive === undefined || p.isActive === null || p.isActive === true);
      })
      .map(function (p) {
        return p;
      });

    filtered = filtered.filter(function (p) {
      if (q) {
        const name = (p.name || '').toLowerCase();
        const shortDesc = (p.shortDescription || '').toLowerCase();
        const longDesc = (p.longDescription || '').toLowerCase();
        const tags = (p.productTags || []).join(' ').toLowerCase();
        const combined = name + ' ' + shortDesc + ' ' + longDesc + ' ' + tags;
        if (combined.indexOf(q) === -1) return false;
      }

      if (f.minPrice != null && typeof p.price === 'number' && p.price < f.minPrice) return false;
      if (f.maxPrice != null && typeof p.price === 'number' && p.price > f.maxPrice) return false;

      if (f.minRating != null && typeof p.rating === 'number' && p.rating < f.minRating) return false;
      if (f.minRating != null && p.rating == null) return false;

      if (f.productType && f.productType.length) {
        if (p.productType !== f.productType) return false;
      }

      if (typeof f.hasFreeShipping === 'boolean') {
        if (!!p.hasFreeShipping !== f.hasFreeShipping) return false;
      }

      if (f.shippingMethod && f.shippingMethod.length) {
        if (!p.shippingMethodsAvailable || p.shippingMethodsAvailable.indexOf(f.shippingMethod) === -1) return false;
      }

      if (f.locationCity && f.locationCity.length) {
        const cityLower = f.locationCity.toLowerCase();
        const sameDayCities = (p.sameDayDeliveryCities || []).map(function (c) { return String(c).toLowerCase(); });
        const standardCities = (p.standardDeliveryCities || []).map(function (c) { return String(c).toLowerCase(); });
        let supportsCity = true;

        if (f.shippingMethod === 'same_day') {
          supportsCity = sameDayCities.indexOf(cityLower) !== -1;
        } else if (f.shippingMethod === 'standard' || f.shippingMethod === 'express') {
          supportsCity = standardCities.indexOf(cityLower) !== -1;
        } else {
          supportsCity = sameDayCities.indexOf(cityLower) !== -1 || standardCities.indexOf(cityLower) !== -1;
        }

        if (!supportsCity) return false;
      }

      return true;
    });

    for (let i = 0; i < filtered.length; i++) {
      const p = filtered[i];
      p.__searchScore = computeScore(p, q);
    }

    if (sortKey === 'price_low_to_high') {
      filtered.sort(function (a, b) {
        const ap = a.price != null ? a.price : Number.MAX_SAFE_INTEGER;
        const bp = b.price != null ? b.price : Number.MAX_SAFE_INTEGER;
        return ap - bp;
      });
    } else if (sortKey === 'price_high_to_low') {
      filtered.sort(function (a, b) {
        const ap = a.price != null ? a.price : 0;
        const bp = b.price != null ? b.price : 0;
        return bp - ap;
      });
    } else if (sortKey === 'customer_rating_high_to_low') {
      filtered.sort(function (a, b) {
        const ar = a.rating != null ? a.rating : 0;
        const br = b.rating != null ? b.rating : 0;
        if (br !== ar) return br - ar;
        const ac = a.ratingCount != null ? a.ratingCount : 0;
        const bc = b.ratingCount != null ? b.ratingCount : 0;
        return bc - ac;
      });
    } else if (sortKey === 'best_selling') {
      filtered.sort(function (a, b) {
        const aRank = a.bestSellerRank != null ? a.bestSellerRank : Number.MAX_SAFE_INTEGER;
        const bRank = b.bestSellerRank != null ? b.bestSellerRank : Number.MAX_SAFE_INTEGER;
        return aRank - bRank;
      });
    } else {
      filtered.sort(function (a, b) {
        const as = a.__searchScore != null ? a.__searchScore : 0;
        const bs = b.__searchScore != null ? b.__searchScore : 0;
        return bs - as;
      });
    }

    const total = filtered.length;
    const start = (pageNum - 1) * size;
    const pageItems = filtered.slice(start, start + size);

    const mapped = pageItems.map((p) => {
      const cat = categories.find(function (c) { return c.key === p.categoryKey; });
      return {
        id: p.id,
        name: p.name,
        price: p.price,
        currency: p.currency || 'USD',
        thumbnailUrl: p.thumbnailUrl || p.imageUrl || null,
        shortDescription: p.shortDescription || '',
        rating: p.rating != null ? p.rating : 0,
        ratingCount: p.ratingCount != null ? p.ratingCount : 0,
        categoryKey: p.categoryKey,
        categoryName: cat ? cat.name : null,
        productType: p.productType,
        hasFreeShipping: !!p.hasFreeShipping,
        shippingMethodsAvailable: p.shippingMethodsAvailable || []
      };
    });

    for (let i = 0; i < filtered.length; i++) {
      delete filtered[i].__searchScore;
    }

    return {
      products: mapped,
      total: total,
      page: pageNum,
      pageSize: size
    };
  }

  // addItemToCart(productId, quantity, options)
  addItemToCart(productId, quantity, options) {
    const qty = quantity != null ? quantity : 1;
    if (qty <= 0) {
      return { success: false, message: 'Quantity must be at least 1.', cart: null };
    }

    const products = this._getFromStorage('products', []);
    const product = products.find(function (p) { return p.id === productId; });
    if (!product || (product.isActive === false)) {
      return { success: false, message: 'Product not found or inactive.', cart: null };
    }

    const cart = this._getOrCreateCart();
    const opts = options || {};

    const cartItem = {
      id: this._generateId('cart_item'),
      cartId: cart.id,
      productId: product.id,
      productName: product.name,
      productType: product.productType,
      unitPrice: product.price,
      quantity: qty,
      subtotal: product.price * qty,
      selectedSize: opts.selectedSize || product.defaultSize || null,
      selectedColorScheme: opts.selectedColorScheme || null,
      selectedWrap: opts.selectedWrap || null,
      giftMessage: opts.giftMessage || null,
      deliveryDate: opts.deliveryDate || null,
      shippingMethod: opts.shippingMethod || null,
      isSubscription: !!product.isSubscription,
      subscriptionFrequency: opts.subscriptionFrequency || null,
      subscriptionStartDate: opts.subscriptionStartDate || null,
      isGift: !!opts.isGift,
      createdAt: new Date().toISOString()
    };

    const cartItems = this._getFromStorage('cart_items', []);
    cartItems.push(cartItem);
    this._saveToStorage('cart_items', cartItems);

    const recalcResult = this._recalculateCartTotals(cart, {});
    const updatedCart = recalcResult.cart;
    const itemsForCart = this._getCartItemsForCart(updatedCart.id);
    const itemCount = this._computeCartItemCount(updatedCart.id);
    const itemsResponse = this._mapCartItemsToResponse(itemsForCart);

    const responseCart = {
      id: updatedCart.id,
      itemCount: itemCount,
      subtotal: updatedCart.subtotal,
      promoCode: updatedCart.promoCode,
      promoDiscountAmount: updatedCart.promoDiscountAmount,
      shippingCost: updatedCart.shippingCost,
      total: updatedCart.total,
      currency: updatedCart.currency,
      items: itemsResponse
    };

    return {
      success: true,
      message: 'Item added to cart.',
      cart: responseCart
    };
  }

  // getCartSummary()
  getCartSummary() {
    const cart = this._getFromStorage('cart', null);
    if (!cart || !cart.id) {
      return {
        id: null,
        itemCount: 0,
        subtotal: 0,
        promoCode: null,
        promoDiscountAmount: 0,
        shippingCost: 0,
        total: 0,
        currency: 'USD'
      };
    }

    const items = this._getCartItemsForCart(cart.id);
    const itemCount = this._computeCartItemCount(cart.id);

    return {
      id: cart.id,
      itemCount: itemCount,
      subtotal: cart.subtotal || 0,
      promoCode: cart.promoCode || null,
      promoDiscountAmount: cart.promoDiscountAmount || 0,
      shippingCost: cart.shippingCost || 0,
      total: cart.total || 0,
      currency: cart.currency || 'USD'
    };
  }

  // getCartDetails()
  getCartDetails() {
    let cart = this._getFromStorage('cart', null);
    if (!cart || !cart.id) {
      return {
        cart: {
          id: null,
          itemCount: 0,
          subtotal: 0,
          promoCode: null,
          promoDiscountAmount: 0,
          shippingCost: 0,
          total: 0,
          currency: 'USD',
          appliedPromotions: []
        },
        items: []
      };
    }

    const recalcResult = this._recalculateCartTotals(cart, {});
    cart = recalcResult.cart;

    const itemsForCart = this._getCartItemsForCart(cart.id);
    const itemCount = this._computeCartItemCount(cart.id);
    const itemsResponse = this._mapCartItemsToResponse(itemsForCart);

    const responseCart = {
      id: cart.id,
      itemCount: itemCount,
      subtotal: cart.subtotal || 0,
      promoCode: cart.promoCode || null,
      promoDiscountAmount: cart.promoDiscountAmount || 0,
      shippingCost: cart.shippingCost || 0,
      total: cart.total || 0,
      currency: cart.currency || 'USD',
      appliedPromotions: cart.appliedPromotions || []
    };

    return {
      cart: responseCart,
      items: itemsResponse
    };
  }

  // updateCartItemQuantity(cartItemId, quantity)
  updateCartItemQuantity(cartItemId, quantity) {
    if (quantity == null) {
      return { success: false, message: 'Quantity is required.', cart: null, updatedItem: null };
    }

    const cart = this._getFromStorage('cart', null);
    if (!cart || !cart.id) {
      return { success: false, message: 'Cart not found.', cart: null, updatedItem: null };
    }

    const cartItems = this._getFromStorage('cart_items', []);
    let itemIndex = -1;
    for (let i = 0; i < cartItems.length; i++) {
      if (cartItems[i].id === cartItemId && cartItems[i].cartId === cart.id) {
        itemIndex = i;
        break;
      }
    }

    if (itemIndex === -1) {
      return { success: false, message: 'Cart item not found.', cart: null, updatedItem: null };
    }

    let updatedItem = cartItems[itemIndex];

    if (quantity <= 0) {
      cartItems.splice(itemIndex, 1);
      updatedItem = null;
    } else {
      updatedItem.quantity = quantity;
      updatedItem.subtotal = (updatedItem.unitPrice || 0) * quantity;
      cartItems[itemIndex] = updatedItem;
    }

    this._saveToStorage('cart_items', cartItems);

    const recalcResult = this._recalculateCartTotals(cart, {});
    const updatedCart = recalcResult.cart;
    const itemCount = this._computeCartItemCount(updatedCart.id);

    const responseCart = {
      id: updatedCart.id,
      itemCount: itemCount,
      subtotal: updatedCart.subtotal || 0,
      promoCode: updatedCart.promoCode || null,
      promoDiscountAmount: updatedCart.promoDiscountAmount || 0,
      shippingCost: updatedCart.shippingCost || 0,
      total: updatedCart.total || 0,
      currency: updatedCart.currency || 'USD'
    };

    let updatedItemResponse = null;
    if (updatedItem) {
      updatedItemResponse = {
        cartItemId: updatedItem.id,
        productId: updatedItem.productId,
        productName: updatedItem.productName,
        quantity: updatedItem.quantity,
        unitPrice: updatedItem.unitPrice,
        subtotal: updatedItem.subtotal
      };
    }

    return {
      success: true,
      message: quantity <= 0 ? 'Item removed from cart.' : 'Cart item updated.',
      cart: responseCart,
      updatedItem: updatedItemResponse
    };
  }

  // removeCartItem(cartItemId)
  removeCartItem(cartItemId) {
    const cart = this._getFromStorage('cart', null);
    if (!cart || !cart.id) {
      return { success: false, message: 'Cart not found.', cart: null };
    }

    const cartItems = this._getFromStorage('cart_items', []);
    let itemIndex = -1;
    for (let i = 0; i < cartItems.length; i++) {
      if (cartItems[i].id === cartItemId && cartItems[i].cartId === cart.id) {
        itemIndex = i;
        break;
      }
    }

    if (itemIndex === -1) {
      return { success: false, message: 'Cart item not found.', cart: null };
    }

    cartItems.splice(itemIndex, 1);
    this._saveToStorage('cart_items', cartItems);

    const recalcResult = this._recalculateCartTotals(cart, {});
    const updatedCart = recalcResult.cart;
    const itemCount = this._computeCartItemCount(updatedCart.id);

    const responseCart = {
      id: updatedCart.id,
      itemCount: itemCount,
      subtotal: updatedCart.subtotal || 0,
      promoCode: updatedCart.promoCode || null,
      promoDiscountAmount: updatedCart.promoDiscountAmount || 0,
      shippingCost: updatedCart.shippingCost || 0,
      total: updatedCart.total || 0,
      currency: updatedCart.currency || 'USD'
    };

    return {
      success: true,
      message: 'Item removed from cart.',
      cart: responseCart
    };
  }

  // applyPromoCode(code)
  applyPromoCode(code) {
    let cart = this._getFromStorage('cart', null);
    if (!cart || !cart.id) {
      return { success: false, message: 'Cart not found.', cart: null };
    }

    const items = this._getCartItemsForCart(cart.id);
    if (!items.length) {
      return { success: false, message: 'Cart is empty.', cart: null };
    }

    cart.promoCode = code;
    const recalcResult = this._recalculateCartTotals(cart, {});
    cart = recalcResult.cart;
    const promoResult = recalcResult.promoResult;
    const itemCount = this._computeCartItemCount(cart.id);

    const responseCart = {
      id: cart.id,
      itemCount: itemCount,
      subtotal: cart.subtotal || 0,
      promoCode: cart.promoCode || null,
      promoDiscountAmount: cart.promoDiscountAmount || 0,
      shippingCost: cart.shippingCost || 0,
      total: cart.total || 0,
      currency: cart.currency || 'USD',
      appliedPromotions: cart.appliedPromotions || []
    };

    const success = promoResult ? promoResult.success : !!(cart.promoCode && cart.promoDiscountAmount > 0);
    const message = promoResult ? promoResult.message : (success ? 'Promo code applied.' : 'Unable to apply promo code.');

    // Instrumentation for task completion tracking
    try {
      localStorage.setItem(
        'task6_promoAttempt',
        JSON.stringify({
          code: code,
          normalizedCode: String(code || '').toUpperCase(),
          success: success,
          message: message
        })
      );
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      success: success,
      message: message,
      cart: responseCart
    };
  }

  // getCheckoutSummary()
  getCheckoutSummary() {
    let cart = this._getFromStorage('cart', null);
    if (!cart || !cart.id) {
      return {
        cart: {
          id: null,
          itemCount: 0,
          subtotal: 0,
          promoCode: null,
          promoDiscountAmount: 0,
          shippingCost: 0,
          total: 0,
          currency: 'USD'
        },
        items: [],
        guestCheckoutAllowed: true,
        shippingMethods: [],
        paymentMethods: [
          { value: 'cash_on_delivery', label: 'Cash On Delivery' },
          { value: 'credit_card', label: 'Credit Card' },
          { value: 'paypal', label: 'Paypal' }
        ]
      };
    }

    const recalcResult = this._recalculateCartTotals(cart, {});
    cart = recalcResult.cart;

    const cartItems = this._getCartItemsForCart(cart.id);
    const itemCount = this._computeCartItemCount(cart.id);

    const itemsResponse = cartItems.map((ci) => {
      return {
        productName: ci.productName,
        productType: ci.productType,
        quantity: ci.quantity,
        unitPrice: ci.unitPrice,
        subtotal: ci.subtotal,
        selectedSize: ci.selectedSize || null,
        selectedColorScheme: ci.selectedColorScheme || null,
        selectedWrap: ci.selectedWrap || null,
        giftMessage: ci.giftMessage || null,
        deliveryDate: ci.deliveryDate || null,
        shippingMethod: ci.shippingMethod || null,
        isSubscription: !!ci.isSubscription,
        subscriptionFrequency: ci.subscriptionFrequency || null,
        subscriptionStartDate: ci.subscriptionStartDate || null
      };
    });

    const products = this._getFromStorage('products', []);
    let availableMethodsSet = null; // intersection of per-product methods

    for (let i = 0; i < cartItems.length; i++) {
      const ci = cartItems[i];
      const product = products.find(function (p) { return p.id === ci.productId; });
      let methods = null;
      if (product && product.shippingMethodsAvailable && product.shippingMethodsAvailable.length) {
        methods = product.shippingMethodsAvailable.slice();
      } else {
        methods = ['standard'];
      }
      const methodsSet = {};
      for (let j = 0; j < methods.length; j++) {
        methodsSet[methods[j]] = true;
      }
      if (availableMethodsSet === null) {
        availableMethodsSet = methodsSet;
      } else {
        const newSet = {};
        const currentKeys = Object.keys(availableMethodsSet);
        for (let k = 0; k < currentKeys.length; k++) {
          const key = currentKeys[k];
          if (methodsSet[key]) newSet[key] = true;
        }
        availableMethodsSet = newSet;
      }
    }

    if (availableMethodsSet === null) {
      availableMethodsSet = { standard: true };
    }

    const availableMethods = Object.keys(availableMethodsSet);
    const shippingMethods = availableMethods.map((m) => {
      let estimatedCost = cart.shippingCost || 0;
      if (m === 'express') estimatedCost += 10;
      if (m === 'same_day') estimatedCost += 15;
      return {
        value: m,
        label: this._formatEnumLabel(m),
        estimatedCost: estimatedCost
      };
    });

    const responseCart = {
      id: cart.id,
      itemCount: itemCount,
      subtotal: cart.subtotal || 0,
      promoCode: cart.promoCode || null,
      promoDiscountAmount: cart.promoDiscountAmount || 0,
      shippingCost: cart.shippingCost || 0,
      total: cart.total || 0,
      currency: cart.currency || 'USD'
    };

    const paymentMethods = [
      { value: 'cash_on_delivery', label: 'Cash On Delivery' },
      { value: 'credit_card', label: 'Credit Card' },
      { value: 'paypal', label: 'Paypal' }
    ];

    return {
      cart: responseCart,
      items: itemsResponse,
      guestCheckoutAllowed: true,
      shippingMethods: shippingMethods,
      paymentMethods: paymentMethods
    };
  }

  // placeOrderAsGuest(shipping, shippingMethod, paymentMethod)
  placeOrderAsGuest(shipping, shippingMethod, paymentMethod) {
    const allowedShippingMethods = ['standard', 'same_day', 'express'];
    const allowedPaymentMethods = ['cash_on_delivery', 'credit_card', 'paypal'];

    if (!shipping || typeof shipping !== 'object') {
      return { success: false, message: 'Shipping details are required.', order: null };
    }

    if (allowedShippingMethods.indexOf(shippingMethod) === -1) {
      return { success: false, message: 'Invalid shipping method.', order: null };
    }

    if (allowedPaymentMethods.indexOf(paymentMethod) === -1) {
      return { success: false, message: 'Invalid payment method.', order: null };
    }

    const cart = this._getFromStorage('cart', null);
    if (!cart || !cart.id) {
      return { success: false, message: 'Cart not found.', order: null };
    }

    const cartItems = this._getCartItemsForCart(cart.id);
    if (!cartItems.length) {
      return { success: false, message: 'Cart is empty.', order: null };
    }

    const recalcResult = this._recalculateCartTotals(cart, {});
    const updatedCart = recalcResult.cart;

    const order = this._createOrderFromCart(updatedCart, shipping, shippingMethod, paymentMethod);
    if (!order) {
      return { success: false, message: 'Unable to create order.', order: null };
    }

    this._clearCart();

    return {
      success: true,
      message: 'Order placed successfully.',
      order: order
    };
  }

  // getOrderConfirmation(orderId)
  getOrderConfirmation(orderId) {
    const orders = this._getFromStorage('orders', []);
    const orderItemsAll = this._getFromStorage('order_items', []);
    const order = orders.find(function (o) { return o.id === orderId; });

    if (!order) {
      return null;
    }

    const orderItems = orderItemsAll.filter(function (oi) { return oi.orderId === orderId; });
    const itemsResponse = this._mapOrderItemsToResponse(orderItems).map(function (item) {
      return {
        productName: item.productName,
        productType: item.productType,
        unitPrice: item.unitPrice,
        quantity: item.quantity,
        subtotal: item.subtotal,
        selectedSize: item.selectedSize,
        selectedColorScheme: item.selectedColorScheme,
        selectedWrap: item.selectedWrap,
        giftMessage: item.giftMessage,
        deliveryDate: item.deliveryDate,
        shippingMethod: item.shippingMethod,
        isSubscription: item.isSubscription,
        subscriptionFrequency: item.subscriptionFrequency,
        subscriptionStartDate: item.subscriptionStartDate,
        productId: item.productId,
        product: item.product
      };
    });

    return {
      orderNumber: order.orderNumber,
      createdAt: order.createdAt,
      status: order.status,
      confirmationMessage: order.confirmationMessage || '',
      subtotal: order.subtotal,
      discountTotal: order.discountTotal || 0,
      shippingCost: order.shippingCost || 0,
      total: order.total,
      currency: order.currency || 'USD',
      promoCode: order.promoCode || null,
      shippingFullName: order.shippingFullName,
      shippingEmail: order.shippingEmail,
      shippingAddressLine1: order.shippingAddressLine1,
      shippingAddressLine2: order.shippingAddressLine2 || null,
      shippingCity: order.shippingCity,
      shippingPostalCode: order.shippingPostalCode,
      shippingCountry: order.shippingCountry || null,
      shippingMethod: order.shippingMethod,
      paymentMethod: order.paymentMethod,
      estimatedDeliveryDate: order.estimatedDeliveryDate || null,
      items: itemsResponse
    };
  }

  // getAboutContent()
  getAboutContent() {
    const stored = this._getFromStorage('about_content', null);
    if (stored && typeof stored === 'object') {
      return stored;
    }

    const pages = this._getFromStorage('pages', []);
    const aboutPage = pages.find(function (p) { return p.pageType === 'about'; });

    if (aboutPage) {
      return {
        title: aboutPage.name || 'About',
        bodySections: [
          {
            heading: aboutPage.name || 'About',
            content: aboutPage.description || ''
          }
        ],
        highlights: []
      };
    }

    return {
      title: '',
      bodySections: [],
      highlights: []
    };
  }

  // getContactInfo()
  getContactInfo() {
    const stored = this._getFromStorage('contact_info', null);
    if (stored && typeof stored === 'object') {
      return stored;
    }

    return {
      email: '',
      phone: '',
      address: '',
      supportHours: '',
      contactFormFields: [
        { name: 'name', label: 'Name', type: 'text', required: true },
        { name: 'email', label: 'Email', type: 'email', required: true },
        { name: 'subject', label: 'Subject', type: 'text', required: true },
        { name: 'message', label: 'Message', type: 'textarea', required: true }
      ]
    };
  }

  // submitContactRequest(name, email, subject, message)
  submitContactRequest(name, email, subject, message) {
    const tickets = this._getFromStorage('contact_tickets', []);
    const ticketId = this._generateId('ticket');

    const ticket = {
      id: ticketId,
      name: name,
      email: email,
      subject: subject,
      message: message,
      createdAt: new Date().toISOString()
    };

    tickets.push(ticket);
    this._saveToStorage('contact_tickets', tickets);

    return {
      success: true,
      message: 'Your request has been submitted.',
      ticketId: ticketId
    };
  }

  // getFaqEntries(category)
  getFaqEntries(category) {
    const faqs = this._getFromStorage('faq_entries', []);
    let filtered = faqs;
    if (category && category.length) {
      filtered = faqs.filter(function (f) { return f.category === category; });
    }
    return {
      faqs: filtered
    };
  }

  // getShippingReturnsContent()
  getShippingReturnsContent() {
    const stored = this._getFromStorage('shipping_returns_content', null);
    if (stored && typeof stored === 'object') {
      return stored;
    }

    return {
      shippingOptions: [],
      sameDayDeliveryInfo: {
        cutoffTime: '',
        coverageDescription: ''
      },
      returnsPolicySections: []
    };
  }

  // getPrivacyTermsContent()
  getPrivacyTermsContent() {
    const stored = this._getFromStorage('privacy_terms_content', null);
    if (stored && typeof stored === 'object') {
      return stored;
    }

    return {
      privacy: {
        lastUpdated: '',
        contentSections: []
      },
      terms: {
        lastUpdated: '',
        contentSections: []
      }
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
