// localStorage polyfill for Node.js and environments without localStorage
const localStorage = (function () {
  try {
    if (typeof globalThis !== 'undefined' && globalThis.localStorage) {
      return globalThis.localStorage;
    }
  } catch (e) {}
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
  }

  _initStorage() {
    var arrayKeys = [
      'products',
      'product_variants',
      'purchase_options',
      'ingredients',
      'product_ingredients',
      'bundles',
      'bundle_items',
      'cart',
      'cart_items',
      'shipping_addresses',
      'shipping_methods',
      'checkout_sessions',
      'quiz_questions',
      'quiz_answer_options',
      'quiz_responses',
      'quiz_response_answers',
      'quiz_recommendations',
      'studies',
      'study_products',
      'reviews',
      'regimens',
      'regimen_items',
      'blog_categories',
      'articles',
      'contact_requests',
      'newsletter_subscriptions'
    ];
    for (var i = 0; i < arrayKeys.length; i++) {
      var key = arrayKeys[i];
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, '[]');
      }
    }
    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key) {
    var data = localStorage.getItem(key);
    if (!data) {
      return [];
    }
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
    var raw = localStorage.getItem('idCounter');
    var current = raw ? parseInt(raw, 10) : 1000;
    if (isNaN(current)) {
      current = 1000;
    }
    var next = current + 1;
    localStorage.setItem('idCounter', String(next));
    return next;
  }

  _generateId(prefix) {
    return prefix + '_' + this._getNextIdCounter();
  }

  _now() {
    return new Date().toISOString();
  }

  _findById(list, id) {
    if (!list || !id) return null;
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) return list[i];
    }
    return null;
  }

  _getOrCreateCart() {
    var carts = this._getFromStorage('cart');
    var currentCartId = localStorage.getItem('current_cart_id');
    var cart = null;
    if (currentCartId) {
      cart = this._findById(carts, currentCartId);
    }
    if (!cart && carts.length > 0) {
      cart = carts[0];
      localStorage.setItem('current_cart_id', cart.id);
    }
    if (!cart) {
      cart = {
        id: this._generateId('cart'),
        created_at: this._now(),
        updated_at: this._now()
      };
      carts.push(cart);
      this._saveToStorage('cart', carts);
      localStorage.setItem('current_cart_id', cart.id);
    }
    return cart;
  }

  _calculateCartTotals(cartId) {
    var cartItems = this._getFromStorage('cart_items');
    var items = [];
    var subtotal = 0;
    var totalItems = 0;
    for (var i = 0; i < cartItems.length; i++) {
      var item = cartItems[i];
      if (item.cart_id === cartId) {
        items.push(item);
        var lineTotal = item.total_price || 0;
        subtotal += lineTotal;
        totalItems += item.quantity || 0;
      }
    }
    return {
      items: items,
      subtotal: subtotal,
      estimated_discounts: 0,
      total_items: totalItems
    };
  }

  _getOrCreateCheckoutSession() {
    var cart = this._getOrCreateCart();
    var sessions = this._getFromStorage('checkout_sessions');
    var currentSessionId = localStorage.getItem('current_checkout_session_id');
    var session = null;
    if (currentSessionId) {
      session = this._findById(sessions, currentSessionId);
    }
    if (!session) {
      for (var i = 0; i < sessions.length; i++) {
        if (sessions[i].cart_id === cart.id && sessions[i].status === 'in_progress') {
          session = sessions[i];
          break;
        }
      }
    }
    if (!session) {
      session = {
        id: this._generateId('checkout'),
        cart_id: cart.id,
        email: null,
        full_name: null,
        shipping_address_id: null,
        shipping_method_id: null,
        status: 'in_progress',
        stage: 'contact',
        created_at: this._now(),
        updated_at: this._now()
      };
      sessions.push(session);
      this._saveToStorage('checkout_sessions', sessions);
      localStorage.setItem('current_checkout_session_id', session.id);
    }
    return session;
  }

  _getProductVariants(productId) {
    var variants = this._getFromStorage('product_variants');
    var result = [];
    for (var i = 0; i < variants.length; i++) {
      if (variants[i].product_id === productId) {
        result.push(variants[i]);
      }
    }
    return result;
  }

  _getPurchaseOptionsForVariant(variantId) {
    var options = this._getFromStorage('purchase_options');
    var result = [];
    for (var i = 0; i < options.length; i++) {
      if (options[i].product_variant_id === variantId) {
        result.push(options[i]);
      }
    }
    return result;
  }

  _getUnitPriceForProductVariant(variantId, purchaseType, subscriptionFrequency) {
    var options = this._getPurchaseOptionsForVariant(variantId);
    var matched = [];
    for (var i = 0; i < options.length; i++) {
      var opt = options[i];
      if (opt.purchase_type !== purchaseType) continue;
      if (purchaseType === 'subscription') {
        if (subscriptionFrequency && opt.subscription_frequency === subscriptionFrequency) {
          matched.push(opt);
        }
      } else {
        matched.push(opt);
      }
    }
    if (matched.length === 0 && options.length > 0) {
      matched = options;
    }
    if (matched.length === 0) {
      return 0;
    }
    var best = matched[0];
    for (var j = 1; j < matched.length; j++) {
      if (matched[j].price < best.price) {
        best = matched[j];
      }
    }
    return best.price;
  }

  _formatAgeRangeLabel(ageRange) {
    if (!ageRange) return null;
    var map = {
      under_30: 'Under 30',
      '30_39': '30–39',
      '40_49': '40–49',
      '50_59': '50–59',
      '60_69': '60–69',
      '70_plus': '70+'
    };
    return map[ageRange] || null;
  }

  _formatGoalLabel(goal) {
    if (!goal) return null;
    var map = {
      fine_lines_wrinkles: 'Fine lines & wrinkles',
      skin_appearance: 'Skin appearance',
      low_energy: 'Low energy',
      fatigue: 'Fatigue',
      overall_health: 'Overall health',
      joint_health: 'Joint health',
      sleep_quality: 'Sleep quality',
      stress_support: 'Stress support',
      energy_and_focus: 'Energy & focus'
    };
    return map[goal] || null;
  }

  _formatSubscriptionFrequencyLabel(freq) {
    if (!freq) return null;
    var map = {
      every_30_days: 'Every 30 days',
      every_60_days: 'Every 60 days',
      every_90_days: 'Every 90 days'
    };
    return map[freq] || null;
  }

  _formatPurchaseTypeLabel(type) {
    if (type === 'subscription') return 'Subscription';
    return 'One-time purchase';
  }

  _mapAgeToRange(age) {
    if (typeof age !== 'number' || isNaN(age)) return null;
    if (age < 30) return 'under_30';
    if (age < 40) return '30_39';
    if (age < 50) return '40_49';
    if (age < 60) return '50_59';
    if (age < 70) return '60_69';
    return '70_plus';
  }

  _generateQuizRecommendations(quizResponse) {
    var recommendations = [];
    if (!quizResponse) return recommendations;
    var primaryConcerns = quizResponse.primary_concerns || [];
    var products = this._getFromStorage('products');
    var bundles = this._getFromStorage('bundles');
    var regimens = this._getFromStorage('regimens');
    var variants = this._getFromStorage('product_variants');
    var options = this._getFromStorage('purchase_options');

    function getProductPricing(productId) {
      var variantList = [];
      for (var i = 0; i < variants.length; i++) {
        if (variants[i].product_id === productId) {
          variantList.push(variants[i]);
        }
      }
      if (variantList.length === 0) {
        return {
          one_time_price: null,
          subscription_price: null,
          supply_months: null
        };
      }
      var bestOneTime = null;
      var bestSub = null;
      var supplyMonths = variantList[0].supply_months || null;
      for (var v = 0; v < variantList.length; v++) {
        var vId = variantList[v].id;
        for (var p = 0; p < options.length; p++) {
          var opt = options[p];
          if (opt.product_variant_id !== vId) continue;
          if (opt.purchase_type === 'one_time') {
            if (!bestOneTime || opt.price < bestOneTime.price) {
              bestOneTime = opt;
              supplyMonths = variantList[v].supply_months || supplyMonths;
            }
          } else if (opt.purchase_type === 'subscription') {
            if (!bestSub || opt.price < bestSub.price) {
              bestSub = opt;
            }
          }
        }
      }
      return {
        one_time_price: bestOneTime ? bestOneTime.price : null,
        subscription_price: bestSub ? bestSub.price : null,
        supply_months: supplyMonths
      };
    }

    // Product recommendations
    var matchingProducts = [];
    for (var i = 0; i < products.length; i++) {
      var p = products[i];
      if (p.status && p.status !== 'active') continue;
      var concerns = p.concerns || [];
      var overlap = false;
      for (var c = 0; c < primaryConcerns.length; c++) {
        if (concerns.indexOf(primaryConcerns[c]) !== -1) {
          overlap = true;
          break;
        }
      }
      if (overlap) {
        matchingProducts.push(p);
      }
    }
    if (matchingProducts.length === 0) {
      for (var j = 0; j < products.length; j++) {
        var p2 = products[j];
        if (p2.status && p2.status !== 'active') continue;
        matchingProducts.push(p2);
      }
    }
    for (var k = 0; k < matchingProducts.length && k < 3; k++) {
      var prod = matchingProducts[k];
      var priceInfo = getProductPricing(prod.id);
      var rec = {
        id: this._generateId('quizrec'),
        quiz_response_id: quizResponse.id,
        recommended_item_type: 'product',
        product_id: prod.id,
        bundle_id: null,
        regimen_id: null,
        one_time_price: priceInfo.one_time_price,
        subscription_price: priceInfo.subscription_price,
        supply_months: priceInfo.supply_months,
        goal_tags: prod.concerns || [],
        is_primary_recommendation: k === 0
      };
      recommendations.push(rec);
    }

    // Bundle recommendations (optional)
    for (var b = 0; b < bundles.length && recommendations.length < 5; b++) {
      var bundle = bundles[b];
      if (bundle.status && bundle.status !== 'active') continue;
      var recB = {
        id: this._generateId('quizrec'),
        quiz_response_id: quizResponse.id,
        recommended_item_type: 'bundle',
        product_id: null,
        bundle_id: bundle.id,
        regimen_id: null,
        one_time_price: bundle.discounted_price || null,
        subscription_price: null,
        supply_months: bundle.supply_months || null,
        goal_tags: primaryConcerns,
        is_primary_recommendation: false
      };
      recommendations.push(recB);
    }

    // Regimen recommendation (optional)
    for (var r = 0; r < regimens.length && recommendations.length < 6; r++) {
      var regimen = regimens[r];
      var recR = {
        id: this._generateId('quizrec'),
        quiz_response_id: quizResponse.id,
        recommended_item_type: 'regimen',
        product_id: null,
        bundle_id: null,
        regimen_id: regimen.id,
        one_time_price: null,
        subscription_price: null,
        supply_months: null,
        goal_tags: regimen.main_goal ? [regimen.main_goal] : [],
        is_primary_recommendation: false
      };
      recommendations.push(recR);
    }

    // Persist recommendations
    var allRecs = this._getFromStorage('quiz_recommendations');
    for (var x = 0; x < recommendations.length; x++) {
      allRecs.push(recommendations[x]);
    }
    this._saveToStorage('quiz_recommendations', allRecs);

    return recommendations;
  }

  // ================= Interface implementations =================

  getHomePageContent() {
    var products = this._getFromStorage('products');
    var bundles = this._getFromStorage('bundles');
    var productVariants = this._getFromStorage('product_variants');
    var purchaseOptions = this._getFromStorage('purchase_options');

    var mainProduct = null;
    for (var i = 0; i < products.length; i++) {
      var p = products[i];
      if (p.status === 'active' && p.is_main_product) {
        mainProduct = p;
        break;
      }
    }
    if (!mainProduct) {
      for (var j = 0; j < products.length; j++) {
        if (products[j].status === 'active') {
          mainProduct = products[j];
          break;
        }
      }
    }

    var startingPrice = null;
    var supplyMonths = null;
    if (mainProduct) {
      var variants = [];
      for (var v = 0; v < productVariants.length; v++) {
        if (productVariants[v].product_id === mainProduct.id) {
          variants.push(productVariants[v]);
        }
      }
      var bestPrice = null;
      var bestSupply = null;
      for (var v2 = 0; v2 < variants.length; v2++) {
        var variant = variants[v2];
        for (var o = 0; o < purchaseOptions.length; o++) {
          var opt = purchaseOptions[o];
          if (opt.product_variant_id !== variant.id) continue;
          if (opt.purchase_type !== 'one_time') continue;
          if (bestPrice === null || opt.price < bestPrice) {
            bestPrice = opt.price;
            bestSupply = variant.supply_months || mainProduct.default_supply_months || null;
          }
        }
      }
      startingPrice = bestPrice;
      supplyMonths = bestSupply;
    }

    var starterBundlesHighlight = [];
    for (var b = 0; b < bundles.length; b++) {
      var bundle = bundles[b];
      if (bundle.status === 'active' && bundle.is_starter) {
        starterBundlesHighlight.push({
          bundle: bundle,
          tagline: bundle.supply_months
            ? 'Approximately ' + bundle.supply_months + ' months of support'
            : 'Starter bundle'
        });
      }
    }

    return {
      brand_tagline: 'Targeted anti-aging support rooted in science.',
      hero_title: 'Support healthy aging from within',
      hero_subtitle: 'Clinically informed formulas to help you look and feel your best.',
      hero_cta_label: 'find_your_plan',
      main_product_highlight: mainProduct
        ? {
            product: mainProduct,
            headline: 'Our flagship anti-aging formula',
            key_benefits: mainProduct.concerns || [],
            starting_price: startingPrice,
            supply_months: supplyMonths
          }
        : null,
      starter_bundles_highlight: starterBundlesHighlight
    };
  }

  getHomeFeaturedProductsAndBundles() {
    var products = this._getFromStorage('products');
    var bundles = this._getFromStorage('bundles');

    products.sort(function (a, b) {
      var ap = typeof a.list_position === 'number' ? a.list_position : 9999;
      var bp = typeof b.list_position === 'number' ? b.list_position : 9999;
      return ap - bp;
    });
    bundles.sort(function (a, b) {
      var ap = typeof a.list_position === 'number' ? a.list_position : 9999;
      var bp = typeof b.list_position === 'number' ? b.list_position : 9999;
      return ap - bp;
    });

    var featuredProducts = [];
    for (var i = 0; i < products.length; i++) {
      var p = products[i];
      if (p.status && p.status !== 'active') continue;
      featuredProducts.push({
        product: p,
        is_main_product: !!p.is_main_product,
        highlight_text: p.short_description || 'Supports healthy aging.'
      });
    }

    var featuredBundles = [];
    for (var j = 0; j < bundles.length; j++) {
      var b = bundles[j];
      if (b.status && b.status !== 'active') continue;
      featuredBundles.push({
        bundle: b,
        highlight_text: b.description || 'Curated bundle for comprehensive support.'
      });
    }

    return {
      featured_products: featuredProducts,
      featured_bundles: featuredBundles
    };
  }

  getFooterNewsletterOptions() {
    return {
      available_topics: [
        {
          value: 'anti_aging_tips',
          label: 'Anti-aging tips',
          description: 'Evidence-based tips for healthy aging.'
        },
        {
          value: 'product_launches',
          label: 'Product launches',
          description: 'Be the first to know about new formulas.'
        },
        {
          value: 'general_wellness',
          label: 'General wellness',
          description: 'Broader nutrition & lifestyle insights.'
        }
      ],
      available_frequencies: [
        { value: 'daily', label: 'Daily' },
        { value: 'weekly', label: 'Weekly' },
        { value: 'monthly', label: 'Monthly' }
      ]
    };
  }

  submitNewsletterSubscription(email, name, topics, frequency) {
    if (!email) {
      return {
        subscription: null,
        success: false,
        message: 'Email is required.',
        show_thank_you_inline: false,
        blog_recommendation_category_id: null
      };
    }
    topics = topics || [];
    var allowedFreq = { daily: true, weekly: true, monthly: true };
    if (frequency && !allowedFreq[frequency]) {
      frequency = null;
    }

    var subs = this._getFromStorage('newsletter_subscriptions');
    var existing = null;
    for (var i = 0; i < subs.length; i++) {
      if (subs[i].email === email) {
        existing = subs[i];
        break;
      }
    }
    if (existing) {
      existing.name = name || existing.name || null;
      existing.topics = topics;
      existing.frequency = frequency || existing.frequency || null;
      existing.status = 'active';
      this._saveToStorage('newsletter_subscriptions', subs);
    } else {
      existing = {
        id: this._generateId('newsletter'),
        email: email,
        name: name || null,
        topics: topics,
        frequency: frequency || null,
        status: 'active',
        subscribed_at: this._now()
      };
      subs.push(existing);
      this._saveToStorage('newsletter_subscriptions', subs);
    }

    var recommendationCategory = null;
    if (topics.indexOf('anti_aging_tips') !== -1) {
      recommendationCategory = 'anti_aging_tips';
    } else if (topics.indexOf('product_launches') !== -1) {
      recommendationCategory = 'product_launches';
    }

    return {
      subscription: existing,
      success: true,
      message: 'Subscription saved.',
      show_thank_you_inline: true,
      blog_recommendation_category_id: recommendationCategory
    };
  }

  getProductFilterOptions() {
    var ingredientEntities = this._getFromStorage('ingredients');
    var products = this._getFromStorage('products');
    var ingredientFilters = [];

    for (var i = 0; i < ingredientEntities.length; i++) {
      var ing = ingredientEntities[i];
      var tag = ing.name ? ing.name.toLowerCase().replace(/[^a-z0-9]+/g, '_') : null;
      ingredientFilters.push({
        ingredient_id: ing.id,
        ingredient_name: ing.name,
        tag: tag
      });
    }

    var hasCaffeineFree = false;
    for (var j = 0; j < products.length; j++) {
      if (products[j].is_caffeine_free) {
        hasCaffeineFree = true;
        break;
      }
    }
    if (hasCaffeineFree) {
      ingredientFilters.push({
        ingredient_id: null,
        ingredient_name: 'Caffeine-free',
        tag: 'caffeine_free'
      });
    }

    var concernFilters = [
      { value: 'fine_lines_wrinkles', label: 'Fine lines & wrinkles' },
      { value: 'skin_appearance', label: 'Skin appearance' },
      { value: 'low_energy', label: 'Low energy' },
      { value: 'fatigue', label: 'Fatigue' },
      { value: 'overall_health', label: 'Overall health' },
      { value: 'joint_health', label: 'Joint health' },
      { value: 'sleep_quality', label: 'Sleep quality' },
      { value: 'stress_support', label: 'Stress support' },
      { value: 'energy_and_focus', label: 'Energy & focus' }
    ];

    var priceRanges = [
      { min_price: 0, max_price: 50, label: 'Under $50' },
      { min_price: 50, max_price: 100, label: '$50–$100' },
      { min_price: 100, max_price: null, label: '$100+' }
    ];

    var formatFilters = [
      { value: 'capsule', label: 'Capsules' },
      { value: 'tablet', label: 'Tablets' },
      { value: 'powder', label: 'Powders' },
      { value: 'liquid', label: 'Liquids' },
      { value: 'gummy', label: 'Gummies' },
      { value: 'other', label: 'Other' }
    ];

    var sortOptions = [
      { value: 'price_asc', label: 'Price: Low to High' },
      { value: 'price_desc', label: 'Price: High to Low' },
      { value: 'bestsellers', label: 'Bestsellers' },
      { value: 'newest', label: 'Newest' }
    ];

    return {
      concern_filters: concernFilters,
      ingredient_filters: ingredientFilters,
      price_ranges: priceRanges,
      format_filters: formatFilters,
      sort_options: sortOptions
    };
  }

  getProducts(filters, sort) {
    filters = filters || {};
    var products = this._getFromStorage('products');
    var variants = this._getFromStorage('product_variants');
    var purchaseOptions = this._getFromStorage('purchase_options');
    var productIngredients = this._getFromStorage('product_ingredients');
    var ingredients = this._getFromStorage('ingredients');

    var ingredientById = {};
    for (var i = 0; i < ingredients.length; i++) {
      ingredientById[ingredients[i].id] = ingredients[i];
    }
    var productIngredientTags = {};
    for (var pi = 0; pi < productIngredients.length; pi++) {
      var rel = productIngredients[pi];
      var ing = ingredientById[rel.ingredient_id];
      if (!ing) continue;
      var tag = ing.name ? ing.name.toLowerCase().replace(/[^a-z0-9]+/g, '_') : null;
      if (!tag) continue;
      if (!productIngredientTags[rel.product_id]) {
        productIngredientTags[rel.product_id] = [];
      }
      if (productIngredientTags[rel.product_id].indexOf(tag) === -1) {
        productIngredientTags[rel.product_id].push(tag);
      }
    }

    var filtered = [];
    for (var p = 0; p < products.length; p++) {
      var prod = products[p];

      if (filters.status && prod.status !== filters.status) continue;
      if (!filters.status && prod.status && prod.status !== 'active') continue;

      if (filters.only_main_product && !prod.is_main_product) continue;

      if (filters.concerns && filters.concerns.length) {
        var prodConcerns = prod.concerns || [];
        var hasConcern = false;
        for (var c = 0; c < filters.concerns.length; c++) {
          if (prodConcerns.indexOf(filters.concerns[c]) !== -1) {
            hasConcern = true;
            break;
          }
        }
        if (!hasConcern) continue;
      }

      if (filters.ingredient_tags && filters.ingredient_tags.length) {
        var tags = productIngredientTags[prod.id] ? productIngredientTags[prod.id].slice() : [];
        if (prod.is_caffeine_free) {
          if (tags.indexOf('caffeine_free') === -1) tags.push('caffeine_free');
        }
        var allMatch = true;
        for (var t = 0; t < filters.ingredient_tags.length; t++) {
          if (tags.indexOf(filters.ingredient_tags[t]) === -1) {
            allMatch = false;
            break;
          }
        }
        if (!allMatch) continue;
      }

      if (filters.formats && filters.formats.length) {
        if (!prod.format || filters.formats.indexOf(prod.format) === -1) continue;
      }

      var minPrice = null;
      var supplyMonths = null;
      for (var v = 0; v < variants.length; v++) {
        var variant = variants[v];
        if (variant.product_id !== prod.id) continue;
        for (var o = 0; o < purchaseOptions.length; o++) {
          var opt = purchaseOptions[o];
          if (opt.product_variant_id !== variant.id) continue;
          if (opt.purchase_type !== 'one_time') continue;
          if (minPrice === null || opt.price < minPrice) {
            minPrice = opt.price;
            supplyMonths = variant.supply_months || prod.default_supply_months || null;
          }
        }
      }

      if (typeof filters.min_price === 'number' && minPrice !== null && minPrice < filters.min_price) {
        continue;
      }
      if (typeof filters.max_price === 'number' && minPrice !== null && minPrice > filters.max_price) {
        continue;
      }

      filtered.push({
        product: prod,
        starting_price: minPrice,
        starting_supply_months: supplyMonths,
        primary_concerns: prod.concerns || [],
        is_quick_add_available: !!minPrice,
        quick_add_variant_id: null,
        quick_add_price: null
      });
    }

    for (var i2 = 0; i2 < filtered.length; i2++) {
      var prodEntry = filtered[i2];
      var prodId = prodEntry.product.id;
      var bestVariant = null;
      var bestOption = null;
      for (var v2 = 0; v2 < variants.length; v2++) {
        var variant2 = variants[v2];
        if (variant2.product_id !== prodId) continue;
        for (var o2 = 0; o2 < purchaseOptions.length; o2++) {
          var opt2 = purchaseOptions[o2];
          if (opt2.product_variant_id !== variant2.id) continue;
          if (opt2.purchase_type !== 'one_time') continue;
          if (!bestOption || opt2.price < bestOption.price) {
            bestOption = opt2;
            bestVariant = variant2;
          }
        }
      }
      if (bestVariant && bestOption) {
        prodEntry.is_quick_add_available = true;
        prodEntry.quick_add_variant_id = bestVariant.id;
        prodEntry.quick_add_price = bestOption.price;
      }
    }

    if (sort === 'price_asc' || sort === 'price_desc') {
      filtered.sort(function (a, b) {
        var pa = typeof a.starting_price === 'number' ? a.starting_price : Number.MAX_VALUE;
        var pb = typeof b.starting_price === 'number' ? b.starting_price : Number.MAX_VALUE;
        return sort === 'price_asc' ? pa - pb : pb - pa;
      });
    } else if (sort === 'newest') {
      filtered.sort(function (a, b) {
        var da = a.product.created_at || '';
        var db = b.product.created_at || '';
        return db.localeCompare(da);
      });
    } else if (sort === 'bestsellers') {
      filtered.sort(function (a, b) {
        var ap = typeof a.product.list_position === 'number' ? a.product.list_position : 9999;
        var bp = typeof b.product.list_position === 'number' ? b.product.list_position : 9999;
        return ap - bp;
      });
    }

    return filtered;
  }

  getProductDetail(productId) {
    var products = this._getFromStorage('products');
    var variantsAll = this._getFromStorage('product_variants');
    var purchaseOptions = this._getFromStorage('purchase_options');
    var productIngredients = this._getFromStorage('product_ingredients');
    var ingredients = this._getFromStorage('ingredients');
    var studies = this._getFromStorage('studies');
    var studyProducts = this._getFromStorage('study_products');
    var reviews = this._getFromStorage('reviews');

    var product = this._findById(products, productId);
    if (!product) {
      return {
        product: null,
        variants: [],
        base_price_per_bottle: null,
        benefits: [],
        ingredients_panel: [],
        is_caffeine_free: null,
        related_studies: [],
        reviews_summary: { average_rating: 0, total_reviews: 0 }
      };
    }

    // Instrumentation for task completion tracking (task_5: product from qualifying study)
    try {
      var lastStudyStr = localStorage.getItem('task5_lastQualifyingStudy');
      if (lastStudyStr) {
        var lastStudyObj = null;
        try {
          lastStudyObj = JSON.parse(lastStudyStr);
        } catch (e) {
          lastStudyObj = null;
        }
        if (lastStudyObj && lastStudyObj.studyId) {
          for (var _spi = 0; _spi < studyProducts.length; _spi++) {
            var _rel = studyProducts[_spi];
            if (_rel.study_id === lastStudyObj.studyId && _rel.product_id === productId) {
              localStorage.setItem(
                'task5_productFromStudyOpened',
                JSON.stringify({
                  studyId: lastStudyObj.studyId,
                  productId: productId
                })
              );
              break;
            }
          }
        }
      }
    } catch (e) {}

    var variants = [];
    var basePricePerBottle = null;
    for (var v = 0; v < variantsAll.length; v++) {
      var variant = variantsAll[v];
      if (variant.product_id !== product.id) continue;
      var opts = [];
      for (var o = 0; o < purchaseOptions.length; o++) {
        if (purchaseOptions[o].product_variant_id === variant.id) {
          opts.push(purchaseOptions[o]);
          if (purchaseOptions[o].purchase_type === 'one_time' && variant.bottle_count) {
            var ppb = purchaseOptions[o].price / variant.bottle_count;
            if (basePricePerBottle === null || ppb < basePricePerBottle) {
              basePricePerBottle = ppb;
            }
          }
        }
      }
      variants.push({
        variant: variant,
        supply_months: variant.supply_months || product.default_supply_months || null,
        is_default: !!variant.is_default,
        purchase_options: opts
      });
    }

    if (basePricePerBottle === null && typeof product.base_price === 'number' && product.default_supply_months) {
      basePricePerBottle = product.base_price;
    }

    var ingredientById = {};
    for (var i = 0; i < ingredients.length; i++) {
      ingredientById[ingredients[i].id] = ingredients[i];
    }

    var ingredientsPanel = [];
    for (var pi = 0; pi < productIngredients.length; pi++) {
      var rel = productIngredients[pi];
      if (rel.product_id !== product.id) continue;
      var ing = ingredientById[rel.ingredient_id];
      if (!ing) continue;
      ingredientsPanel.push({
        ingredient: ing,
        amount_per_serving: rel.amount_per_serving || null,
        is_key_ingredient: !!rel.is_key_ingredient
      });
    }

    var relatedStudies = [];
    for (var sp = 0; sp < studyProducts.length; sp++) {
      var sProd = studyProducts[sp];
      if (sProd.product_id !== product.id) continue;
      var study = this._findById(studies, sProd.study_id);
      if (!study) continue;
      relatedStudies.push({
        study: study,
        summary_short: study.summary_short || null
      });
    }

    var totalRating = 0;
    var count = 0;
    for (var r = 0; r < reviews.length; r++) {
      var rev = reviews[r];
      if (rev.product_id === product.id && typeof rev.rating === 'number') {
        totalRating += rev.rating;
        count += 1;
      }
    }
    var avg = count ? totalRating / count : 0;

    var benefits = [];
    if (product.concerns && product.concerns.length) {
      for (var c = 0; c < product.concerns.length; c++) {
        var label = this._formatGoalLabel(product.concerns[c]);
        if (label) benefits.push(label);
      }
    }

    return {
      product: product,
      variants: variants,
      base_price_per_bottle: basePricePerBottle,
      benefits: benefits,
      ingredients_panel: ingredientsPanel,
      is_caffeine_free: !!product.is_caffeine_free,
      related_studies: relatedStudies,
      reviews_summary: {
        average_rating: avg,
        total_reviews: count
      }
    };
  }

  addProductToCart(productId, productVariantId, purchaseType, subscriptionFrequency, quantity) {
    if (!productId || !productVariantId || !purchaseType) {
      return { success: false, message: 'Missing required parameters.', cart: null };
    }
    if (purchaseType === 'subscription' && !subscriptionFrequency) {
      return { success: false, message: 'Subscription frequency is required for subscriptions.', cart: null };
    }
    quantity = typeof quantity === 'number' && quantity > 0 ? quantity : 1;

    var cart = this._getOrCreateCart();
    var cartItems = this._getFromStorage('cart_items');

    var unitPrice = this._getUnitPriceForProductVariant(productVariantId, purchaseType, subscriptionFrequency);
    var totalPrice = unitPrice * quantity;

    var existing = null;
    for (var i = 0; i < cartItems.length; i++) {
      var item = cartItems[i];
      if (
        item.cart_id === cart.id &&
        item.item_type === 'product' &&
        item.product_id === productId &&
        item.product_variant_id === productVariantId &&
        item.purchase_type === purchaseType &&
        (purchaseType !== 'subscription' || item.subscription_frequency === subscriptionFrequency)
      ) {
        existing = item;
        break;
      }
    }

    if (existing) {
      existing.quantity += quantity;
      existing.total_price = existing.unit_price * existing.quantity;
    } else {
      var newItem = {
        id: this._generateId('cartitem'),
        cart_id: cart.id,
        item_type: 'product',
        product_id: productId,
        bundle_id: null,
        regimen_id: null,
        product_variant_id: productVariantId,
        purchase_type: purchaseType,
        subscription_frequency: purchaseType === 'subscription' ? subscriptionFrequency : null,
        quantity: quantity,
        unit_price: unitPrice,
        total_price: totalPrice
      };
      cartItems.push(newItem);
    }

    this._saveToStorage('cart_items', cartItems);

    var carts = this._getFromStorage('cart');
    for (var c = 0; c < carts.length; c++) {
      if (carts[c].id === cart.id) {
        carts[c].updated_at = this._now();
        break;
      }
    }
    this._saveToStorage('cart', carts);

    var totals = this._calculateCartTotals(cart.id);

    return {
      success: true,
      message: 'Product added to cart.',
      cart: {
        cart: cart,
        items: totals.items,
        subtotal: totals.subtotal,
        total_items: totals.total_items
      }
    };
  }

  getProductReviews(productId, filters, sort, page, pageSize) {
    filters = filters || {};
    page = page || 1;
    pageSize = pageSize || 10;

    // Instrumentation for task completion tracking (task_6: review filter params)
    var _task6ShouldInstrument = false;
    try {
      var goalMatch =
        filters.goal === 'fine_lines_wrinkles' || filters.goal === 'skin_appearance';
      if (filters.age_range === '50_59' && goalMatch && sort !== 'highest_rating') {
        _task6ShouldInstrument = true;
        localStorage.setItem(
          'task6_reviewFilterParams',
          JSON.stringify({
            productId: productId,
            filters: filters,
            sort: sort,
            page: page,
            pageSize: pageSize,
            timestamp: this._now()
          })
        );
      }
    } catch (e) {}

    var reviews = this._getFromStorage('reviews');
    var regimens = this._getFromStorage('regimens');

    var filtered = [];
    for (var i = 0; i < reviews.length; i++) {
      var rev = reviews[i];
      if (rev.product_id !== productId) continue;
      if (filters.age_range && rev.age_range !== filters.age_range) continue;
      if (filters.goal && rev.goal !== filters.goal) continue;
      if (typeof filters.min_rating === 'number') {
        if (typeof rev.rating !== 'number' || rev.rating < filters.min_rating) continue;
      }
      filtered.push(rev);
    }

    if (sort === 'highest_rating') {
      filtered.sort(function (a, b) {
        var ar = typeof a.rating === 'number' ? a.rating : 0;
        var br = typeof b.rating === 'number' ? b.rating : 0;
        return br - ar;
      });
    } else {
      filtered.sort(function (a, b) {
        var da = a.created_at || '';
        var db = b.created_at || '';
        return db.localeCompare(da);
      });
    }

    var totalReviews = filtered.length;
    var totalPages = Math.ceil(totalReviews / pageSize) || 1;
    if (page < 1) page = 1;
    if (page > totalPages) page = totalPages;

    var start = (page - 1) * pageSize;
    var end = start + pageSize;
    var pageItems = filtered.slice(start, end);

    // Instrumentation for task completion tracking (task_6: second review context)
    try {
      if (_task6ShouldInstrument && pageItems && pageItems.length >= 2) {
        var secondReview = pageItems[1];
        localStorage.setItem(
          'task6_secondReviewContext',
          JSON.stringify({
            productId: productId,
            second_review_id: secondReview.id,
            second_review_regimen_id: secondReview.regimen_id || null,
            age_range: filters.age_range,
            goal: filters.goal,
            sort: sort,
            page: page,
            page_size: pageSize,
            timestamp: this._now()
          })
        );
      }
    } catch (e) {}

    var resultReviews = [];
    for (var j = 0; j < pageItems.length; j++) {
      var r = pageItems[j];
      var regimen = r.regimen_id ? this._findById(regimens, r.regimen_id) : null;
      resultReviews.push({
        review: r,
        age_range_label: this._formatAgeRangeLabel(r.age_range),
        goal_label: this._formatGoalLabel(r.goal),
        regimen_name: regimen ? regimen.name : null,
        regimen: regimen
      });
    }

    return {
      reviews: resultReviews,
      pagination: {
        page: page,
        page_size: pageSize,
        total_pages: totalPages,
        total_reviews: totalReviews
      }
    };
  }

  getBundleFilterOptions() {
    var priceRanges = [
      { min_price: 0, max_price: 100, label: 'Under $100' },
      { min_price: 100, max_price: 200, label: '$100–$200' },
      { min_price: 200, max_price: null, label: '$200+' }
    ];
    var supplyFilters = [
      { min_months: 1, label: '1+ months' },
      { min_months: 2, label: '2+ months' },
      { min_months: 3, label: '3+ months' }
    ];
    var discountFilters = [
      { min_discount_percent: 10, label: 'Save 10% or more' },
      { min_discount_percent: 20, label: 'Save 20% or more' },
      { min_discount_percent: 30, label: 'Save 30% or more' }
    ];
    var sortOptions = [
      { value: 'discount_desc', label: 'Highest discount' },
      { value: 'price_asc', label: 'Price: Low to High' },
      { value: 'supply_desc', label: 'Longest supply' }
    ];
    return {
      price_ranges: priceRanges,
      supply_length_filters: supplyFilters,
      discount_filters: discountFilters,
      sort_options: sortOptions
    };
  }

  getBundles(filters, sort) {
    filters = filters || {};
    var bundles = this._getFromStorage('bundles');
    var bundleItems = this._getFromStorage('bundle_items');
    var products = this._getFromStorage('products');

    var filtered = [];
    for (var i = 0; i < bundles.length; i++) {
      var b = bundles[i];
      if (filters.status && b.status !== filters.status) continue;
      if (!filters.status && b.status && b.status !== 'active') continue;
      if (typeof filters.max_price === 'number' && typeof b.discounted_price === 'number' && b.discounted_price > filters.max_price) {
        continue;
      }
      if (typeof filters.min_supply_months === 'number' && typeof b.supply_months === 'number' && b.supply_months < filters.min_supply_months) {
        continue;
      }
      if (typeof filters.min_discount_percent === 'number' && typeof b.discount_percent === 'number' && b.discount_percent < filters.min_discount_percent) {
        continue;
      }
      if (filters.only_starter && !b.is_starter) continue;

      var included = [];
      for (var bi = 0; bi < bundleItems.length; bi++) {
        var item = bundleItems[bi];
        if (item.bundle_id !== b.id) continue;
        var product = this._findById(products, item.product_id);
        if (!product) continue;
        included.push({
          product: product,
          quantity: item.quantity
        });
      }

      filtered.push({
        bundle: b,
        included_products: included,
        display_price: b.discounted_price,
        original_price: b.original_price || null,
        discount_percent: b.discount_percent || null,
        discount_badge_text: b.discount_badge_text || null,
        supply_months: b.supply_months || null
      });
    }

    if (sort === 'discount_desc') {
      filtered.sort(function (a, b) {
        var ad = typeof a.discount_percent === 'number' ? a.discount_percent : 0;
        var bd = typeof b.discount_percent === 'number' ? b.discount_percent : 0;
        return bd - ad;
      });
    } else if (sort === 'price_asc') {
      filtered.sort(function (a, b) {
        var ap = typeof a.display_price === 'number' ? a.display_price : Number.MAX_VALUE;
        var bp = typeof b.display_price === 'number' ? b.display_price : Number.MAX_VALUE;
        return ap - bp;
      });
    } else if (sort === 'supply_desc') {
      filtered.sort(function (a, b) {
        var as = typeof a.supply_months === 'number' ? a.supply_months : 0;
        var bs = typeof b.supply_months === 'number' ? b.supply_months : 0;
        return bs - as;
      });
    }

    return filtered;
  }

  getBundleDetail(bundleId) {
    var bundles = this._getFromStorage('bundles');
    var bundleItems = this._getFromStorage('bundle_items');
    var products = this._getFromStorage('products');
    var variants = this._getFromStorage('product_variants');

    var bundle = this._findById(bundles, bundleId);
    if (!bundle) {
      return {
        bundle: null,
        items: [],
        included_products: [],
        original_price: null,
        discounted_price: null,
        discount_percent: null,
        per_month_cost: null,
        allow_subscription: false,
        default_purchase_type: 'one_time'
      };
    }

    var items = [];
    var includedProducts = [];
    for (var i = 0; i < bundleItems.length; i++) {
      var item = bundleItems[i];
      if (item.bundle_id !== bundle.id) continue;
      var product = this._findById(products, item.product_id);
      var variant = item.product_variant_id ? this._findById(variants, item.product_variant_id) : null;

      items.push({
        id: item.id,
        bundle_id: item.bundle_id,
        product_id: item.product_id,
        product_variant_id: item.product_variant_id,
        quantity: item.quantity,
        sort_order: item.sort_order,
        bundle: bundle,
        product: product,
        product_variant: variant
      });

      includedProducts.push({
        product: product,
        variant: variant,
        quantity: item.quantity
      });
    }

    var perMonthCost = null;
    if (bundle.discounted_price && bundle.supply_months) {
      perMonthCost = bundle.discounted_price / bundle.supply_months;
    }

    return {
      bundle: bundle,
      items: items,
      included_products: includedProducts,
      original_price: bundle.original_price || null,
      discounted_price: bundle.discounted_price || null,
      discount_percent: bundle.discount_percent || null,
      per_month_cost: perMonthCost,
      allow_subscription: !!bundle.allow_subscription,
      default_purchase_type: 'one_time'
    };
  }

  addBundleToCart(bundleId, purchaseType, subscriptionFrequency, quantity) {
    if (!bundleId || !purchaseType) {
      return { success: false, message: 'Missing required parameters.', cart: null };
    }
    if (purchaseType === 'subscription' && !subscriptionFrequency) {
      return { success: false, message: 'Subscription frequency is required for subscriptions.', cart: null };
    }
    quantity = typeof quantity === 'number' && quantity > 0 ? quantity : 1;

    var bundles = this._getFromStorage('bundles');
    var bundle = this._findById(bundles, bundleId);
    if (!bundle) {
      return { success: false, message: 'Bundle not found.', cart: null };
    }
    if (purchaseType === 'subscription' && bundle.allow_subscription === false) {
      return { success: false, message: 'This bundle is not available as a subscription.', cart: null };
    }

    var cart = this._getOrCreateCart();
    var cartItems = this._getFromStorage('cart_items');
    var unitPrice = bundle.discounted_price || 0;
    var totalPrice = unitPrice * quantity;

    var existing = null;
    for (var i = 0; i < cartItems.length; i++) {
      var item = cartItems[i];
      if (
        item.cart_id === cart.id &&
        item.item_type === 'bundle' &&
        item.bundle_id === bundleId &&
        item.purchase_type === purchaseType &&
        (purchaseType !== 'subscription' || item.subscription_frequency === subscriptionFrequency)
      ) {
        existing = item;
        break;
      }
    }

    if (existing) {
      existing.quantity += quantity;
      existing.total_price = existing.unit_price * existing.quantity;
    } else {
      var newItem = {
        id: this._generateId('cartitem'),
        cart_id: cart.id,
        item_type: 'bundle',
        product_id: null,
        bundle_id: bundleId,
        regimen_id: null,
        product_variant_id: null,
        purchase_type: purchaseType,
        subscription_frequency: purchaseType === 'subscription' ? subscriptionFrequency : null,
        quantity: quantity,
        unit_price: unitPrice,
        total_price: totalPrice
      };
      cartItems.push(newItem);
    }

    this._saveToStorage('cart_items', cartItems);

    var carts = this._getFromStorage('cart');
    for (var c = 0; c < carts.length; c++) {
      if (carts[c].id === cart.id) {
        carts[c].updated_at = this._now();
        break;
      }
    }
    this._saveToStorage('cart', carts);

    var totals = this._calculateCartTotals(cart.id);

    return {
      success: true,
      message: 'Bundle added to cart.',
      cart: {
        cart: cart,
        items: totals.items,
        subtotal: totals.subtotal,
        total_items: totals.total_items
      }
    };
  }

  getCartSummary() {
    var cart = this._getOrCreateCart();
    var totals = this._calculateCartTotals(cart.id);
    var products = this._getFromStorage('products');
    var bundles = this._getFromStorage('bundles');
    var regimens = this._getFromStorage('regimens');
    var variants = this._getFromStorage('product_variants');

    var itemsDetailed = [];
    for (var i = 0; i < totals.items.length; i++) {
      var item = totals.items[i];
      var product = item.product_id ? this._findById(products, item.product_id) : null;
      var bundle = item.bundle_id ? this._findById(bundles, item.bundle_id) : null;
      var regimen = item.regimen_id ? this._findById(regimens, item.regimen_id) : null;
      var variant = item.product_variant_id ? this._findById(variants, item.product_variant_id) : null;
      var name = null;
      if (item.item_type === 'product' && product) name = product.name;
      if (item.item_type === 'bundle' && bundle) name = bundle.name;
      if (item.item_type === 'regimen' && regimen) name = regimen.name;
      itemsDetailed.push({
        cart_item: item,
        product: product,
        bundle: bundle,
        regimen: regimen,
        product_variant: variant,
        display_name: name,
        purchase_type_label: this._formatPurchaseTypeLabel(item.purchase_type),
        subscription_frequency_label: this._formatSubscriptionFrequencyLabel(item.subscription_frequency)
      });
    }

    return {
      cart: cart,
      items_detailed: itemsDetailed,
      subtotal: totals.subtotal,
      estimated_discounts: totals.estimated_discounts,
      note_about_shipping: 'Shipping calculated at checkout.'
    };
  }

  updateCartItemQuantity(cartItemId, quantity) {
    quantity = typeof quantity === 'number' ? quantity : 0;
    var cartItems = this._getFromStorage('cart_items');
    var cartId = null;
    var updated = false;

    for (var i = 0; i < cartItems.length; i++) {
      var item = cartItems[i];
      if (item.id === cartItemId) {
        cartId = item.cart_id;
        if (quantity <= 0) {
          cartItems.splice(i, 1);
        } else {
          item.quantity = quantity;
          item.total_price = item.unit_price * quantity;
        }
        updated = true;
        break;
      }
    }

    if (!updated) {
      return { success: false, cart: null };
    }

    this._saveToStorage('cart_items', cartItems);

    var carts = this._getFromStorage('cart');
    var cart = null;
    for (var c = 0; c < carts.length; c++) {
      if (carts[c].id === cartId) {
        carts[c].updated_at = this._now();
        cart = carts[c];
        break;
      }
    }
    this._saveToStorage('cart', carts);

    var totals = this._calculateCartTotals(cartId);

    return {
      success: true,
      cart: {
        cart: cart,
        items: totals.items,
        subtotal: totals.subtotal
      }
    };
  }

  updateCartItemPurchaseType(cartItemId, purchaseType, subscriptionFrequency) {
    if (!purchaseType) {
      return { success: false, cart: null };
    }
    var cartItems = this._getFromStorage('cart_items');
    var cartId = null;
    var updatedItem = null;

    for (var i = 0; i < cartItems.length; i++) {
      var item = cartItems[i];
      if (item.id === cartItemId) {
        cartId = item.cart_id;
        item.purchase_type = purchaseType;
        item.subscription_frequency = purchaseType === 'subscription' ? subscriptionFrequency : null;
        if (item.item_type === 'product' && item.product_variant_id) {
          var newPrice = this._getUnitPriceForProductVariant(item.product_variant_id, purchaseType, subscriptionFrequency);
          item.unit_price = newPrice;
          item.total_price = newPrice * item.quantity;
        } else {
          item.total_price = item.unit_price * item.quantity;
        }
        updatedItem = item;
        break;
      }
    }

    if (!updatedItem) {
      return { success: false, cart: null };
    }

    this._saveToStorage('cart_items', cartItems);

    var carts = this._getFromStorage('cart');
    var cart = null;
    for (var c = 0; c < carts.length; c++) {
      if (carts[c].id === cartId) {
        carts[c].updated_at = this._now();
        cart = carts[c];
        break;
      }
    }
    this._saveToStorage('cart', carts);

    var totals = this._calculateCartTotals(cartId);

    return {
      success: true,
      cart: {
        cart: cart,
        items: totals.items,
        subtotal: totals.subtotal
      }
    };
  }

  removeCartItem(cartItemId) {
    var cartItems = this._getFromStorage('cart_items');
    var cartId = null;
    var removed = false;

    for (var i = 0; i < cartItems.length; i++) {
      var item = cartItems[i];
      if (item.id === cartItemId) {
        cartId = item.cart_id;
        cartItems.splice(i, 1);
        removed = true;
        break;
      }
    }

    if (!removed) {
      return { success: false, cart: null };
    }

    this._saveToStorage('cart_items', cartItems);

    var carts = this._getFromStorage('cart');
    var cart = null;
    for (var c = 0; c < carts.length; c++) {
      if (carts[c].id === cartId) {
        carts[c].updated_at = this._now();
        cart = carts[c];
        break;
      }
    }
    this._saveToStorage('cart', carts);

    var totals = this._calculateCartTotals(cartId);

    return {
      success: true,
      cart: {
        cart: cart,
        items: totals.items,
        subtotal: totals.subtotal
      }
    };
  }

  beginCheckout() {
    var cart = this._getOrCreateCart();
    var sessions = this._getFromStorage('checkout_sessions');
    var session = null;

    for (var i = 0; i < sessions.length; i++) {
      if (sessions[i].cart_id === cart.id && sessions[i].status === 'in_progress') {
        session = sessions[i];
        break;
      }
    }

    if (!session) {
      session = {
        id: this._generateId('checkout'),
        cart_id: cart.id,
        email: null,
        full_name: null,
        shipping_address_id: null,
        shipping_method_id: null,
        status: 'in_progress',
        stage: 'contact',
        created_at: this._now(),
        updated_at: this._now()
      };
      sessions.push(session);
    } else {
      session.stage = 'contact';
      session.status = 'in_progress';
      session.updated_at = this._now();
    }

    this._saveToStorage('checkout_sessions', sessions);
    localStorage.setItem('current_checkout_session_id', session.id);

    var totals = this._calculateCartTotals(cart.id);

    return {
      checkout_session: session,
      cart_summary: {
        cart: cart,
        items: totals.items,
        subtotal: totals.subtotal,
        estimated_discounts: totals.estimated_discounts
      }
    };
  }

  getCheckoutSession() {
    var cart = this._getOrCreateCart();
    var session = this._getOrCreateCheckoutSession();
    var shippingAddresses = this._getFromStorage('shipping_addresses');
    var shippingMethods = this._getFromStorage('shipping_methods');

    var shippingAddress = session.shipping_address_id ? this._findById(shippingAddresses, session.shipping_address_id) : null;
    var shippingMethod = session.shipping_method_id ? this._findById(shippingMethods, session.shipping_method_id) : null;

    var totals = this._calculateCartTotals(cart.id);
    var products = this._getFromStorage('products');
    var bundles = this._getFromStorage('bundles');
    var regimens = this._getFromStorage('regimens');

    var itemsDetailed = [];
    for (var i = 0; i < totals.items.length; i++) {
      var item = totals.items[i];
      itemsDetailed.push({
        cart_item: item,
        product: item.product_id ? this._findById(products, item.product_id) : null,
        bundle: item.bundle_id ? this._findById(bundles, item.bundle_id) : null,
        regimen: item.regimen_id ? this._findById(regimens, item.regimen_id) : null
      });
    }

    var shippingCost = shippingMethod && typeof shippingMethod.price === 'number' ? shippingMethod.price : 0;
    var total = totals.subtotal + shippingCost;

    return {
      checkout_session: session,
      shipping_address: shippingAddress,
      shipping_method: shippingMethod,
      cart_summary: {
        cart: cart,
        items_detailed: itemsDetailed,
        subtotal: totals.subtotal,
        shipping_cost: shippingCost,
        total: total
      }
    };
  }

  updateCheckoutContactAndAddress(contact, address) {
    contact = contact || {};
    address = address || {};

    var session = this._getOrCreateCheckoutSession();
    var shippingAddresses = this._getFromStorage('shipping_addresses');

    session.email = contact.email || session.email || null;
    session.full_name = contact.full_name || session.full_name || null;
    session.updated_at = this._now();
    session.stage = 'shipping';

    var shippingAddress = null;
    if (session.shipping_address_id) {
      shippingAddress = this._findById(shippingAddresses, session.shipping_address_id);
    }
    if (!shippingAddress) {
      shippingAddress = {
        id: this._generateId('shipaddr'),
        full_name: contact.full_name || session.full_name || '',
        email: contact.email || session.email || '',
        phone: contact.phone || null,
        line1: address.line1 || '',
        line2: address.line2 || null,
        city: address.city || '',
        state_region: address.state_region || '',
        postal_code: address.postal_code || '',
        country: address.country || ''
      };
      shippingAddresses.push(shippingAddress);
      session.shipping_address_id = shippingAddress.id;
    } else {
      shippingAddress.full_name = contact.full_name || shippingAddress.full_name;
      shippingAddress.email = contact.email || shippingAddress.email;
      shippingAddress.phone = contact.phone || shippingAddress.phone || null;
      shippingAddress.line1 = address.line1 || shippingAddress.line1;
      shippingAddress.line2 = typeof address.line2 === 'string' ? address.line2 : shippingAddress.line2;
      shippingAddress.city = address.city || shippingAddress.city;
      shippingAddress.state_region = address.state_region || shippingAddress.state_region;
      shippingAddress.postal_code = address.postal_code || shippingAddress.postal_code;
      shippingAddress.country = address.country || shippingAddress.country;
    }

    this._saveToStorage('shipping_addresses', shippingAddresses);

    var sessions = this._getFromStorage('checkout_sessions');
    for (var i = 0; i < sessions.length; i++) {
      if (sessions[i].id === session.id) {
        sessions[i] = session;
        break;
      }
    }
    this._saveToStorage('checkout_sessions', sessions);
    localStorage.setItem('current_checkout_session_id', session.id);

    return {
      checkout_session: session,
      shipping_address: shippingAddress
    };
  }

  getAvailableShippingMethods() {
    var methods = this._getFromStorage('shipping_methods');
    var active = [];
    for (var i = 0; i < methods.length; i++) {
      var m = methods[i];
      if (m.is_active === false) continue;
      active.push(m);
    }
    return active;
  }

  selectShippingMethod(shippingMethodId) {
    var session = this._getOrCreateCheckoutSession();
    var methods = this._getFromStorage('shipping_methods');
    var method = this._findById(methods, shippingMethodId);
    if (!method) {
      return {
        checkout_session: session,
        shipping_method: null,
        cart_summary: {
          subtotal: 0,
          shipping_cost: 0,
          total: 0
        }
      };
    }
    session.shipping_method_id = shippingMethodId;
    session.updated_at = this._now();

    var sessions = this._getFromStorage('checkout_sessions');
    for (var i = 0; i < sessions.length; i++) {
      if (sessions[i].id === session.id) {
        sessions[i] = session;
        break;
      }
    }
    this._saveToStorage('checkout_sessions', sessions);
    localStorage.setItem('current_checkout_session_id', session.id);

    var cart = this._getOrCreateCart();
    var totals = this._calculateCartTotals(cart.id);
    var shippingCost = typeof method.price === 'number' ? method.price : 0;
    var total = totals.subtotal + shippingCost;

    return {
      checkout_session: session,
      shipping_method: method,
      cart_summary: {
        subtotal: totals.subtotal,
        shipping_cost: shippingCost,
        total: total
      }
    };
  }

  advanceCheckoutToPayment() {
    var session = this._getOrCreateCheckoutSession();
    session.stage = 'payment';
    session.updated_at = this._now();

    var sessions = this._getFromStorage('checkout_sessions');
    for (var i = 0; i < sessions.length; i++) {
      if (sessions[i].id === session.id) {
        sessions[i] = session;
        break;
      }
    }
    this._saveToStorage('checkout_sessions', sessions);
    localStorage.setItem('current_checkout_session_id', session.id);

    return {
      checkout_session: session
    };
  }

  getQuizDefinition() {
    var questions = this._getFromStorage('quiz_questions');
    var answerOptions = this._getFromStorage('quiz_answer_options');

    questions.sort(function (a, b) {
      var ao = typeof a.order === 'number' ? a.order : 0;
      var bo = typeof b.order === 'number' ? b.order : 0;
      return ao - bo;
    });

    var result = [];
    for (var i = 0; i < questions.length; i++) {
      var q = questions[i];
      var opts = [];
      for (var j = 0; j < answerOptions.length; j++) {
        var opt = answerOptions[j];
        if (opt.question_id === q.id) {
          opts.push(opt);
        }
      }
      opts.sort(function (a, b) {
        var ao = typeof a.sort_order === 'number' ? a.sort_order : 0;
        var bo = typeof b.sort_order === 'number' ? b.sort_order : 0;
        return ao - bo;
      });
      result.push({
        question: q,
        answer_options: opts
      });
    }

    return {
      questions: result
    };
  }

  submitQuiz(answers) {
    answers = answers || [];
    var quizQuestions = this._getFromStorage('quiz_questions');
    var answerOptions = this._getFromStorage('quiz_answer_options');
    var quizResponses = this._getFromStorage('quiz_responses');
    var quizResponseAnswers = this._getFromStorage('quiz_response_answers');

    var questionById = {};
    for (var i = 0; i < quizQuestions.length; i++) {
      questionById[quizQuestions[i].id] = quizQuestions[i];
    }
    var optionById = {};
    for (var j = 0; j < answerOptions.length; j++) {
      optionById[answerOptions[j].id] = answerOptions[j];
    }

    var age = null;
    var ageRange = null;
    var primaryConcerns = [];

    for (var a = 0; a < answers.length; a++) {
      var ans = answers[a];
      var q = questionById[ans.questionId];
      if (!q) continue;

      if (q.topic === 'age') {
        if (typeof ans.numericAnswer === 'number') {
          age = ans.numericAnswer;
        }
        if (ans.selectedAnswerOptionIds && ans.selectedAnswerOptionIds.length) {
          var optAge = optionById[ans.selectedAnswerOptionIds[0]];
          if (optAge && optAge.age_range_tag) {
            ageRange = optAge.age_range_tag;
          }
        }
      }

      if (q.topic === 'concerns' || q.topic === 'goals') {
        if (ans.selectedAnswerOptionIds && ans.selectedAnswerOptionIds.length) {
          for (var s = 0; s < ans.selectedAnswerOptionIds.length; s++) {
            var opt = optionById[ans.selectedAnswerOptionIds[s]];
            if (opt && opt.concern_tag) {
              if (primaryConcerns.indexOf(opt.concern_tag) === -1) {
                primaryConcerns.push(opt.concern_tag);
              }
            }
          }
        }
      }
    }

    if (!ageRange && typeof age === 'number') {
      ageRange = this._mapAgeToRange(age);
    }

    var quizResponse = {
      id: this._generateId('quizresp'),
      started_at: this._now(),
      completed_at: this._now(),
      age: typeof age === 'number' ? age : null,
      age_range: ageRange || null,
      primary_concerns: primaryConcerns
    };
    quizResponses.push(quizResponse);
    this._saveToStorage('quiz_responses', quizResponses);

    for (var a2 = 0; a2 < answers.length; a2++) {
      var ans2 = answers[a2];
      var q2 = questionById[ans2.questionId];
      if (!q2) continue;

      if (ans2.selectedAnswerOptionIds && ans2.selectedAnswerOptionIds.length) {
        for (var s2 = 0; s2 < ans2.selectedAnswerOptionIds.length; s2++) {
          var ra = {
            id: this._generateId('quizans'),
            quiz_response_id: quizResponse.id,
            question_id: ans2.questionId,
            answer_option_id: ans2.selectedAnswerOptionIds[s2],
            free_text_answer: null,
            numeric_answer: null
          };
          quizResponseAnswers.push(ra);
        }
      } else {
        var ra2 = {
          id: this._generateId('quizans'),
          quiz_response_id: quizResponse.id,
          question_id: ans2.questionId,
          answer_option_id: null,
          free_text_answer: ans2.freeTextAnswer || null,
          numeric_answer: typeof ans2.numericAnswer === 'number' ? ans2.numericAnswer : null
        };
        quizResponseAnswers.push(ra2);
      }
    }
    this._saveToStorage('quiz_response_answers', quizResponseAnswers);

    var recommendations = this._generateQuizRecommendations(quizResponse);

    return {
      quiz_response: quizResponse,
      recommendations: recommendations
    };
  }

  getQuizResults(quizResponseId) {
    var quizResponses = this._getFromStorage('quiz_responses');
    var quizRecommendations = this._getFromStorage('quiz_recommendations');
    var products = this._getFromStorage('products');
    var bundles = this._getFromStorage('bundles');
    var regimens = this._getFromStorage('regimens');

    var quizResponse = this._findById(quizResponses, quizResponseId);
    if (!quizResponse) {
      return {
        quiz_response: null,
        recommendations_detailed: []
      };
    }

    var recs = [];
    for (var i = 0; i < quizRecommendations.length; i++) {
      var rec = quizRecommendations[i];
      if (rec.quiz_response_id !== quizResponse.id) continue;
      var product = rec.product_id ? this._findById(products, rec.product_id) : null;
      var bundle = rec.bundle_id ? this._findById(bundles, rec.bundle_id) : null;
      var regimen = rec.regimen_id ? this._findById(regimens, rec.regimen_id) : null;
      recs.push({
        recommendation: rec,
        product: product,
        bundle: bundle,
        regimen: regimen,
        one_time_price: rec.one_time_price || null,
        subscription_price: rec.subscription_price || null,
        supply_months: rec.supply_months || null,
        goal_tags: rec.goal_tags || []
      });
    }

    return {
      quiz_response: quizResponse,
      recommendations_detailed: recs
    };
  }

  getScienceOverviewContent() {
    var ingredients = this._getFromStorage('ingredients');
    return {
      overview_title: 'The science behind our anti-aging formulas',
      overview_body: 'We combine clinically studied ingredients at effective doses to support healthy aging across skin, energy, and overall wellness.',
      key_ingredients: ingredients
    };
  }

  getClinicalStudiesFilterOptions() {
    var ageFilters = [
      { min_age: 30, max_age: 50, label: 'Ages 30–50' },
      { min_age: 40, max_age: 60, label: 'Ages 40–60' },
      { min_age: 50, max_age: 70, label: 'Ages 50–70' }
    ];
    var durationFilters = [
      { min_weeks: 4, label: '4+ weeks' },
      { min_weeks: 8, label: '8+ weeks' },
      { min_weeks: 12, label: '12+ weeks' }
    ];
    return {
      age_range_filters: ageFilters,
      duration_filters: durationFilters
    };
  }

  getClinicalStudies(filters) {
    filters = filters || {};

    // Instrumentation for task completion tracking (task_5: clinical filter params)
    try {
      var minAge = filters.min_participant_age;
      var maxAge = filters.max_participant_age;
      var minDurationWeeks = filters.min_duration_weeks;
      if (
        typeof minAge === 'number' &&
        typeof maxAge === 'number' &&
        typeof minDurationWeeks === 'number' &&
        minAge <= 40 &&
        maxAge >= 60 &&
        minDurationWeeks >= 8
      ) {
        localStorage.setItem('task5_clinicalFilterParams', JSON.stringify(filters));
      }
    } catch (e) {}

    var studies = this._getFromStorage('studies');
    var studyProducts = this._getFromStorage('study_products');
    var products = this._getFromStorage('products');

    var result = [];
    for (var i = 0; i < studies.length; i++) {
      var s = studies[i];

      if (filters.type && s.type !== filters.type) continue;
      if (filters.only_published && s.is_published === false) continue;

      if (typeof filters.min_participant_age === 'number') {
        if (typeof s.participant_max_age === 'number' && s.participant_max_age < filters.min_participant_age) {
          continue;
        }
      }
      if (typeof filters.max_participant_age === 'number') {
        if (typeof s.participant_min_age === 'number' && s.participant_min_age > filters.max_participant_age) {
          continue;
        }
      }

      if (typeof filters.min_duration_weeks === 'number') {
        var durationWeeks = 0;
        if (typeof s.duration_weeks === 'number') {
          durationWeeks = s.duration_weeks;
        } else if (typeof s.duration_months === 'number') {
          durationWeeks = s.duration_months * 4;
        }
        if (durationWeeks < filters.min_duration_weeks) continue;
      }

      var primaryProduct = null;
      for (var sp = 0; sp < studyProducts.length; sp++) {
        var rel = studyProducts[sp];
        if (rel.study_id !== s.id) continue;
        if (rel.role === 'primary') {
          primaryProduct = this._findById(products, rel.product_id);
          break;
        }
      }
      if (!primaryProduct) {
        for (var sp2 = 0; sp2 < studyProducts.length; sp2++) {
          var rel2 = studyProducts[sp2];
          if (rel2.study_id === s.id) {
            primaryProduct = this._findById(products, rel2.product_id);
            if (primaryProduct) break;
          }
        }
      }

      var ageLabel = null;
      if (typeof s.participant_min_age === 'number' && typeof s.participant_max_age === 'number') {
        ageLabel = s.participant_min_age + '–' + s.participant_max_age;
      }

      var durationLabel = null;
      if (typeof s.duration_weeks === 'number') {
        durationLabel = s.duration_weeks + ' weeks';
      } else if (typeof s.duration_months === 'number') {
        durationLabel = s.duration_months + ' months';
      }

      result.push({
        study: s,
        participant_age_range_label: ageLabel,
        duration_label: durationLabel,
        primary_product: primaryProduct
      });
    }

    return result;
  }

  getStudyDetail(studyId) {
    var studies = this._getFromStorage('studies');
    var studyProducts = this._getFromStorage('study_products');
    var products = this._getFromStorage('products');

    var study = this._findById(studies, studyId);
    if (!study) {
      return {
        study: null,
        summary_full: null,
        participant_age_range_label: null,
        duration_label: null,
        products_used: []
      };
    }

    var ageLabel = null;
    if (typeof study.participant_min_age === 'number' && typeof study.participant_max_age === 'number') {
      ageLabel = study.participant_min_age + '–' + study.participant_max_age;
    }

    var durationLabel = null;
    if (typeof study.duration_weeks === 'number') {
      durationLabel = study.duration_weeks + ' weeks';
    } else if (typeof study.duration_months === 'number') {
      durationLabel = study.duration_months + ' months';
    }

    var productsUsed = [];
    for (var i = 0; i < studyProducts.length; i++) {
      var rel = studyProducts[i];
      if (rel.study_id !== study.id) continue;
      productsUsed.push({
        study_product: rel,
        product: this._findById(products, rel.product_id)
      });
    }

    // Instrumentation for task completion tracking (task_5: last qualifying study opened)
    try {
      var durationWeeksResolved = 0;
      if (typeof study.duration_weeks === 'number') {
        durationWeeksResolved = study.duration_weeks;
      } else if (typeof study.duration_months === 'number') {
        durationWeeksResolved = study.duration_months * 4;
      }
      var minAge = study.participant_min_age;
      var maxAge = study.participant_max_age;
      if (
        typeof minAge === 'number' &&
        typeof maxAge === 'number' &&
        durationWeeksResolved >= 8 &&
        minAge <= 40 &&
        maxAge >= 60
      ) {
        localStorage.setItem(
          'task5_lastQualifyingStudy',
          JSON.stringify({
            studyId: study.id,
            participant_min_age: minAge,
            participant_max_age: maxAge,
            duration_weeks_resolved: durationWeeksResolved
          })
        );
      }
    } catch (e) {}

    return {
      study: study,
      summary_full: study.summary_full || null,
      participant_age_range_label: ageLabel,
      duration_label: durationLabel,
      products_used: productsUsed
    };
  }

  getRegimenDetail(regimenId) {
    var regimens = this._getFromStorage('regimens');
    var regimenItemsAll = this._getFromStorage('regimen_items');
    var products = this._getFromStorage('products');
    var variants = this._getFromStorage('product_variants');

    // Instrumentation for task completion tracking (task_6: opened regimen from second review)
    try {
      var ctxStr = localStorage.getItem('task6_secondReviewContext');
      if (ctxStr) {
        var ctx = null;
        try {
          ctx = JSON.parse(ctxStr);
        } catch (e) {
          ctx = null;
        }
        if (ctx && ctx.second_review_regimen_id === regimenId) {
          localStorage.setItem(
            'task6_openedRegimenFromSecondReview',
            JSON.stringify({
              regimenId: regimenId,
              from_review_id: ctx.second_review_id,
              productId: ctx.productId,
              timestamp: this._now()
            })
          );
        }
      }
    } catch (e) {}

    var regimen = this._findById(regimens, regimenId);
    if (!regimen) {
      return {
        regimen: null,
        items: [],
        main_goal_label: null,
        suitable_age_range_label: null,
        can_add_entire_regimen_to_cart: false
      };
    }

    var items = [];
    for (var i = 0; i < regimenItemsAll.length; i++) {
      var ri = regimenItemsAll[i];
      if (ri.regimen_id !== regimen.id) continue;
      var product = this._findById(products, ri.product_id);
      var variant = ri.product_variant_id ? this._findById(variants, ri.product_variant_id) : null;
      items.push({
        regimen_item: ri,
        product: product,
        product_variant: variant
      });
    }
    items.sort(function (a, b) {
      var ao = typeof a.regimen_item.sort_order === 'number' ? a.regimen_item.sort_order : 0;
      var bo = typeof b.regimen_item.sort_order === 'number' ? b.regimen_item.sort_order : 0;
      return ao - bo;
    });

    var ageLabel = null;
    if (typeof regimen.suitable_age_min === 'number' && typeof regimen.suitable_age_max === 'number') {
      ageLabel = regimen.suitable_age_min + '–' + regimen.suitable_age_max;
    }

    return {
      regimen: regimen,
      items: items,
      main_goal_label: this._formatGoalLabel(regimen.main_goal),
      suitable_age_range_label: ageLabel,
      can_add_entire_regimen_to_cart: items.length > 0
    };
  }

  addRegimenToCart(regimenId, purchaseType, subscriptionFrequency, quantity) {
    if (!regimenId || !purchaseType) {
      return { success: false, cart: null };
    }
    if (purchaseType === 'subscription' && !subscriptionFrequency) {
      return { success: false, cart: null };
    }
    quantity = typeof quantity === 'number' && quantity > 0 ? quantity : 1;

    var regimens = this._getFromStorage('regimens');
    var regimenItems = this._getFromStorage('regimen_items');
    var regimen = this._findById(regimens, regimenId);
    if (!regimen) {
      return { success: false, cart: null };
    }

    var variants = this._getFromStorage('product_variants');
    var totalUnitPrice = 0;
    for (var i = 0; i < regimenItems.length; i++) {
      var ri = regimenItems[i];
      if (ri.regimen_id !== regimen.id) continue;
      var variantId = ri.product_variant_id;
      if (!variantId) {
        for (var v = 0; v < variants.length; v++) {
          if (variants[v].product_id === ri.product_id) {
            variantId = variants[v].id;
            break;
          }
        }
      }
      if (!variantId) continue;
      var price = this._getUnitPriceForProductVariant(variantId, purchaseType, subscriptionFrequency);
      totalUnitPrice += price;
    }

    var cart = this._getOrCreateCart();
    var cartItems = this._getFromStorage('cart_items');
    var unitPrice = totalUnitPrice;
    var totalPrice = unitPrice * quantity;

    var existing = null;
    for (var c = 0; c < cartItems.length; c++) {
      var item = cartItems[c];
      if (
        item.cart_id === cart.id &&
        item.item_type === 'regimen' &&
        item.regimen_id === regimenId &&
        item.purchase_type === purchaseType &&
        (purchaseType !== 'subscription' || item.subscription_frequency === subscriptionFrequency)
      ) {
        existing = item;
        break;
      }
    }

    if (existing) {
      existing.quantity += quantity;
      existing.total_price = existing.unit_price * existing.quantity;
    } else {
      var newItem = {
        id: this._generateId('cartitem'),
        cart_id: cart.id,
        item_type: 'regimen',
        product_id: null,
        bundle_id: null,
        regimen_id: regimenId,
        product_variant_id: null,
        purchase_type: purchaseType,
        subscription_frequency: purchaseType === 'subscription' ? subscriptionFrequency : null,
        quantity: quantity,
        unit_price: unitPrice,
        total_price: totalPrice
      };
      cartItems.push(newItem);
    }

    this._saveToStorage('cart_items', cartItems);

    var carts = this._getFromStorage('cart');
    for (var ci = 0; ci < carts.length; ci++) {
      if (carts[ci].id === cart.id) {
        carts[ci].updated_at = this._now();
        break;
      }
    }
    this._saveToStorage('cart', carts);

    var totals = this._calculateCartTotals(cart.id);

    return {
      success: true,
      cart: {
        cart: cart,
        items: totals.items,
        subtotal: totals.subtotal
      }
    };
  }

  getBlogCategories() {
    return this._getFromStorage('blog_categories');
  }

  getArticles(filters, page, pageSize) {
    filters = filters || {};
    page = page || 1;
    pageSize = pageSize || 10;

    var articles = this._getFromStorage('articles');
    var categories = this._getFromStorage('blog_categories');

    var filtered = [];
    for (var i = 0; i < articles.length; i++) {
      var a = articles[i];
      if (filters.category_id && a.category_id !== filters.category_id) continue;
      filtered.push(a);
    }

    filtered.sort(function (a, b) {
      var da = a.published_at || '';
      var db = b.published_at || '';
      return db.localeCompare(da);
    });

    var total = filtered.length;
    var totalPages = Math.ceil(total / pageSize) || 1;
    if (page < 1) page = 1;
    if (page > totalPages) page = totalPages;

    var start = (page - 1) * pageSize;
    var end = start + pageSize;
    var pageItems = filtered.slice(start, end);

    var resultArticles = [];
    for (var j = 0; j < pageItems.length; j++) {
      var art = pageItems[j];
      var cat = null;
      for (var c = 0; c < categories.length; c++) {
        if (categories[c].id === art.category_id) {
          cat = categories[c];
          break;
        }
      }
      resultArticles.push({
        article: art,
        category_name: cat ? cat.name : null,
        category: cat
      });
    }

    return {
      articles: resultArticles,
      pagination: {
        page: page,
        page_size: pageSize,
        total_pages: totalPages,
        total_articles: total
      }
    };
  }

  getArticleDetail(articleId) {
    var articles = this._getFromStorage('articles');
    var categories = this._getFromStorage('blog_categories');

    var article = this._findById(articles, articleId);
    if (!article) {
      return {
        article: null,
        category: null,
        related_articles: [],
        related_products: [],
        related_bundles: []
      };
    }

    var category = null;
    for (var c = 0; c < categories.length; c++) {
      if (categories[c].id === article.category_id) {
        category = categories[c];
        break;
      }
    }

    var relatedArticles = [];
    for (var i = 0; i < articles.length; i++) {
      var a = articles[i];
      if (a.id === article.id) continue;
      if (a.category_id === article.category_id) {
        relatedArticles.push(a);
      }
    }

    var relatedProducts = [];
    var relatedBundles = [];

    return {
      article: article,
      category: category,
      related_articles: relatedArticles,
      related_products: relatedProducts,
      related_bundles: relatedBundles
    };
  }

  getContactFormOptions() {
    return {
      topics: [
        { value: 'product_safety', label: 'Product safety' },
        { value: 'order_issue', label: 'Order issue' },
        { value: 'billing', label: 'Billing' },
        { value: 'general_question', label: 'General question' },
        { value: 'other', label: 'Other' }
      ],
      preferred_contact_methods: [
        { value: 'email', label: 'Email' },
        { value: 'phone', label: 'Phone' }
      ]
    };
  }

  submitContactRequest(topic, name, email, phone, preferred_contact_method, subject, message) {
    if (!topic || !name || !email || !subject || !message) {
      return {
        contact_request: null,
        success: false,
        confirmation_message: 'Missing required fields.'
      };
    }

    var requests = this._getFromStorage('contact_requests');
    var request = {
      id: this._generateId('contact'),
      topic: topic,
      name: name,
      email: email,
      phone: phone || null,
      subject: subject,
      message: message,
      preferred_contact_method: preferred_contact_method || null,
      status: 'new',
      created_at: this._now()
    };
    requests.push(request);
    this._saveToStorage('contact_requests', requests);

    return {
      contact_request: request,
      success: true,
      confirmation_message: 'Thank you for contacting us. Our team will respond soon.'
    };
  }

  getAboutPageContent() {
    return {
      mission_title: 'Our mission',
      mission_body: 'To make clinically informed, transparently formulated anti-aging supplements accessible to everyone.',
      quality_standards: 'Manufactured in GMP-certified facilities with rigorous third-party testing.',
      ingredient_sourcing: 'We prioritize clinically studied ingredients from trusted, traceable suppliers.',
      advisory_board: []
    };
  }

  getFaqEntries() {
    return [];
  }

  getPoliciesContent() {
    var shippingMethods = this._getFromStorage('shipping_methods');
    return {
      shipping_policy: 'Shipping options and costs are calculated at checkout based on your location and selected speed.',
      shipping_methods_reference: shippingMethods,
      returns_policy: 'If you are not satisfied, you may be eligible for a refund according to our returns guidelines.',
      privacy_policy: 'We respect your privacy and handle your data in accordance with applicable regulations.',
      terms_of_use: 'By using this site, you agree to our terms and conditions.'
    };
  }

  // Optional convenience method from skeleton (not part of core interfaces)
  addToCart(userId, productId, quantity) {
    quantity = typeof quantity === 'number' && quantity > 0 ? quantity : 1;
    var variants = this._getProductVariants(productId);
    if (!variants.length) {
      return { success: false, cartId: null };
    }
    var variant = variants[0];
    var options = this._getPurchaseOptionsForVariant(variant.id);
    var purchaseType = 'one_time';
    var subscriptionFrequency = null;
    for (var i = 0; i < options.length; i++) {
      if (options[i].purchase_type === 'one_time') {
        purchaseType = 'one_time';
        break;
      }
    }
    var res = this.addProductToCart(productId, variant.id, purchaseType, subscriptionFrequency, quantity);
    return {
      success: res.success,
      cartId: res.cart ? res.cart.cart.id : null
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