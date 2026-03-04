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

  // -------------------- Storage helpers --------------------

  _initStorage() {
    const keysToInitAsArray = [
      'products',
      'product_variants',
      'product_categories',
      'favorite_products',
      'compare_list',
      'cart',
      'cart_items',
      'pet_profiles',
      'feeding_plans',
      'feeding_plan_items',
      'feeding_calculation_sessions',
      'stores',
      'store_product_availability',
      'preferred_store',
      'blog_articles',
      'newsletter_subscriptions',
      'help_articles',
      'contact_submissions',
      'product_finder_quiz_sessions'
    ];

    keysToInitAsArray.forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, '[]');
      }
    });

    // Meta keys for current/active records
    if (!localStorage.getItem('current_cart_id')) {
      localStorage.setItem('current_cart_id', '');
    }
    if (!localStorage.getItem('active_feeding_plan_id')) {
      localStorage.setItem('active_feeding_plan_id', '');
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, defaultValue = []) {
    const data = localStorage.getItem(key);
    if (data === null || data === undefined || data === '') {
      return defaultValue;
    }
    try {
      const parsed = JSON.parse(data);
      return parsed === null ? defaultValue : parsed;
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

  _now() {
    return new Date().toISOString();
  }

  // -------------------- Generic FK helpers --------------------

  _resolveProduct(productId) {
    const products = this._getFromStorage('products', []);
    return products.find((p) => p.id === productId) || null;
  }

  _resolveProducts(productIds) {
    const products = this._getFromStorage('products', []);
    const idSet = new Set(productIds || []);
    return products.filter((p) => idSet.has(p.id));
  }

  _resolveStore(storeId) {
    const stores = this._getFromStorage('stores', []);
    return stores.find((s) => s.id === storeId) || null;
  }

  _resolveHelpArticle(articleId) {
    if (!articleId) return null;
    const articles = this._getFromStorage('help_articles', []);
    return articles.find((a) => a.id === articleId) || null;
  }

  // -------------------- Cart helpers --------------------

  _getOrCreateCart() {
    const carts = this._getFromStorage('cart', []);
    let currentCartId = localStorage.getItem('current_cart_id');
    let cart = null;

    if (currentCartId) {
      cart = carts.find((c) => c.id === currentCartId) || null;
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

  _getCartItemsWithResolvedReferences(cartId) {
    const cartItems = this._getFromStorage('cart_items', []);
    const itemsForCart = cartItems.filter((ci) => ci.cart_id === cartId);
    const products = this._getFromStorage('products', []);
    const variants = this._getFromStorage('product_variants', []);

    return itemsForCart.map((item) => {
      const product = products.find((p) => p.id === item.product_id) || null;
      const variant = item.product_variant_id
        ? variants.find((v) => v.id === item.product_variant_id) || null
        : null;
      return {
        ...item,
        product,
        product_variant: variant
      };
    });
  }

  // -------------------- Compare list helper --------------------

  _getOrCreateCompareList() {
    const lists = this._getFromStorage('compare_list', []);
    if (lists.length > 0) {
      return lists[0];
    }
    const newList = {
      id: this._generateId('compare'),
      product_ids: [],
      last_updated_at: this._now()
    };
    lists.push(newList);
    this._saveToStorage('compare_list', lists);
    return newList;
  }

  // -------------------- Feeding plan helpers --------------------

  _getOrCreateActiveFeedingPlan() {
    const plans = this._getFromStorage('feeding_plans', []);
    let activeId = localStorage.getItem('active_feeding_plan_id');
    let plan = null;

    if (activeId) {
      plan = plans.find((p) => p.id === activeId) || null;
    }

    if (!plan) {
      plan = {
        id: this._generateId('feeding_plan'),
        pet_profile_id: null,
        feeding_mode: 'dry_only',
        pet_weight: null,
        weight_unit: null,
        notes: null,
        created_at: this._now(),
        updated_at: this._now()
      };
      plans.push(plan);
      this._saveToStorage('feeding_plans', plans);
      localStorage.setItem('active_feeding_plan_id', plan.id);
    }

    return plan;
  }

  _saveFeedingCalculationSession(session) {
    const sessions = this._getFromStorage('feeding_calculation_sessions', []);
    sessions.push(session);
    this._saveToStorage('feeding_calculation_sessions', sessions);
  }

  _saveProductFinderQuizSession(session) {
    const sessions = this._getFromStorage('product_finder_quiz_sessions', []);
    sessions.push(session);
    this._saveToStorage('product_finder_quiz_sessions', sessions);
  }

  _setPreferredStoreInternal(storeId) {
    const records = this._getFromStorage('preferred_store', []);
    const record = {
      id: this._generateId('preferred_store'),
      store_id: storeId,
      set_at: this._now()
    };
    records.push(record);
    this._saveToStorage('preferred_store', records);
    return record;
  }

  _getLatestPreferredStoreRecord() {
    const records = this._getFromStorage('preferred_store', []);
    if (!records.length) return null;
    // Assume last record is latest
    return records[records.length - 1];
  }

  _recalculateFeedingPlanItems(feedingPlan) {
    // Simple, generic recalculation based on pet weight and feeding mode.
    const items = this._getFromStorage('feeding_plan_items', []);
    const products = this._getFromStorage('products', []);
    const planItems = items.filter((i) => i.feeding_plan_id === feedingPlan.id && i.is_active);

    const weight = typeof feedingPlan.pet_weight === 'number' ? feedingPlan.pet_weight : 0;
    let weightKg;
    if (!feedingPlan.weight_unit || feedingPlan.weight_unit === 'kg') {
      weightKg = weight;
    } else {
      weightKg = weight * 0.453592; // lb -> kg
    }
    if (weightKg <= 0) {
      // If no weight, leave existing daily_amounts as-is.
      return;
    }

    planItems.forEach((item) => {
      const product = products.find((p) => p.id === item.product_id) || null;
      let role = item.product_role;
      let amountUnit = item.daily_amount_unit;
      if (!amountUnit) {
        if (role === 'dry_food') amountUnit = 'grams';
        else if (role === 'wet_food') amountUnit = 'cans';
        else amountUnit = 'pieces';
        item.daily_amount_unit = amountUnit;
      }

      // Basic formula: different multipliers for roles
      let dailyAmount = item.daily_amount || 0;
      if (role === 'dry_food') {
        // 12g per kg
        dailyAmount = Math.round(weightKg * 12);
      } else if (role === 'wet_food') {
        // 0.4 cans per kg, min 1
        const cans = weightKg * 0.4;
        dailyAmount = Math.max(1, Math.round(cans * 10) / 10);
      } else if (role === 'treat') {
        // 2 pieces per kg, min 1, max 10
        dailyAmount = Math.min(10, Math.max(1, Math.round(weightKg * 2)));
      }

      // Optionally adjust by product-specific hints (e.g., diet features)
      if (product && product.dietary_features && product.dietary_features.includes('high_protein')) {
        // Slightly less if high protein
        dailyAmount = Math.round(dailyAmount * 0.9);
      }

      item.daily_amount = dailyAmount;
    });

    // Save back modified items
    const updatedItems = items.map((i) => {
      const modified = planItems.find((pi) => pi.id === i.id);
      return modified || i;
    });
    this._saveToStorage('feeding_plan_items', updatedItems);
  }

  // -------------------- Homepage --------------------

  getHomepageFeaturedContent() {
    const categories = this._getFromStorage('product_categories', []);
    const products = this._getFromStorage('products', []);

    const dog_featured_categories = categories
      .filter((c) => !c.species || c.species === 'dog' || c.species === 'all_species')
      .sort((a, b) => {
        const ao = typeof a.sort_order === 'number' ? a.sort_order : 9999;
        const bo = typeof b.sort_order === 'number' ? b.sort_order : 9999;
        return ao - bo;
      })
      .slice(0, 5);

    const cat_featured_categories = categories
      .filter((c) => !c.species || c.species === 'cat' || c.species === 'all_species')
      .sort((a, b) => {
        const ao = typeof a.sort_order === 'number' ? a.sort_order : 9999;
        const bo = typeof b.sort_order === 'number' ? b.sort_order : 9999;
        return ao - bo;
      })
      .slice(0, 5);

    const byRatingDesc = (a, b) => {
      const ar = typeof a.average_rating === 'number' ? a.average_rating : 0;
      const br = typeof b.average_rating === 'number' ? b.average_rating : 0;
      if (br !== ar) return br - ar;
      return a.name.localeCompare(b.name);
    };

    const dog_featured_products = products
      .filter((p) => p.species === 'dog')
      .sort(byRatingDesc)
      .slice(0, 8);

    const cat_featured_products = products
      .filter((p) => p.species === 'cat')
      .sort(byRatingDesc)
      .slice(0, 8);

    return {
      dog_featured_categories,
      cat_featured_categories,
      dog_featured_products,
      cat_featured_products
    };
  }

  getHomepagePromotions() {
    const promotions = [];
    const products = this._getFromStorage('products', []);
    const articles = this._getFromStorage('blog_articles', []);

    const firstDog = products.find((p) => p.species === 'dog');
    if (firstDog) {
      promotions.push({
        id: this._generateId('promo'),
        title: 'Discover foods for your dog',
        subtitle: firstDog.name,
        image_url: firstDog.image_url || '',
        cta_label: 'View product',
        target_type: 'product_detail',
        target_context: {
          species: 'dog',
          food_type: firstDog.food_type,
          categoryId: (firstDog.category_ids && firstDog.category_ids[0]) || null,
          productId: firstDog.id,
          article_slug: null
        }
      });
    }

    const firstCatArticle = articles.find((a) => a.category_key === 'cat' || a.category_key === 'feeding_tips');
    if (firstCatArticle) {
      promotions.push({
        id: this._generateId('promo'),
        title: firstCatArticle.title,
        subtitle: firstCatArticle.summary || '',
        image_url: firstCatArticle.featured_image_url || '',
        cta_label: 'Read article',
        target_type: 'blog_article',
        target_context: {
          species: 'cat',
          food_type: null,
          categoryId: null,
          productId: null,
          article_slug: firstCatArticle.slug
        }
      });
    }

    return promotions;
  }

  // -------------------- Species Hubs --------------------

  getProductCategoriesForSpecies(species) {
    const categories = this._getFromStorage('product_categories', []);
    return categories
      .filter((c) => {
        if (!species) return true;
        if (!c.species) return true;
        return c.species === species;
      })
      .sort((a, b) => {
        const ao = typeof a.sort_order === 'number' ? a.sort_order : 9999;
        const bo = typeof b.sort_order === 'number' ? b.sort_order : 9999;
        return ao - bo;
      });
  }

  getDogHubContent() {
    const categories = this.getProductCategoriesForSpecies('dog');
    const products = this._getFromStorage('products', []).filter((p) => p.species === 'dog');
    const articles = this._getFromStorage('blog_articles', []).filter(
      (a) => a.is_published && (a.category_key === 'dog' || a.category_key === 'puppy' || a.category_key === 'feeding_tips')
    );

    // Build popular use cases from existing products
    const useCasesMap = new Map();
    products.forEach((p) => {
      const key = [p.food_type, p.life_stage, p.size_group || 'all_sizes', (p.dietary_features && p.dietary_features[0]) || ''].join('|');
      if (!useCasesMap.has(key)) {
        const titleParts = [];
        if (p.life_stage) titleParts.push(p.life_stage.charAt(0).toUpperCase() + p.life_stage.slice(1));
        titleParts.push('dog');
        if (p.food_type === 'dry_food') titleParts.push('dry food');
        else if (p.food_type === 'wet_food') titleParts.push('wet food');
        else if (p.food_type === 'treat') titleParts.push('treats');
        const title = titleParts.join(' ');
        const description = 'Browse ' + title + ' options.';
        useCasesMap.set(key, {
          id: 'dog_usecase_' + useCasesMap.size,
          title,
          description,
          context: {
            species: 'dog',
            food_type: p.food_type,
            life_stage: p.life_stage,
            size_group: p.size_group,
            dietary_feature: (p.dietary_features && p.dietary_features[0]) || null
          }
        });
      }
    });

    const popular_use_cases = Array.from(useCasesMap.values()).slice(0, 6);

    const featured_articles = articles
      .sort((a, b) => {
        const ad = a.published_at || '';
        const bd = b.published_at || '';
        if (ad === bd) return a.title.localeCompare(b.title);
        return ad > bd ? -1 : 1;
      })
      .slice(0, 5);

    return {
      primary_categories: categories,
      popular_use_cases,
      featured_articles
    };
  }

  getCatHubContent() {
    const categories = this.getProductCategoriesForSpecies('cat');
    const products = this._getFromStorage('products', []).filter((p) => p.species === 'cat');
    const articles = this._getFromStorage('blog_articles', []).filter(
      (a) => a.is_published && (a.category_key === 'cat' || a.category_key === 'feeding_tips')
    );

    const useCasesMap = new Map();
    products.forEach((p) => {
      const lifestyle = p.lifestyle || 'all_lifestyles';
      const health = (p.health_needs && p.health_needs[0]) || null;
      const key = [p.food_type, lifestyle, health || ''].join('|');
      if (!useCasesMap.has(key)) {
        let title = '';
        if (lifestyle === 'indoor') title = 'Indoor cats';
        else if (lifestyle === 'outdoor') title = 'Outdoor cats';
        else title = 'All cats';
        if (health === 'hairball_control') title += ' - hairball control';
        const description = 'Explore formulas tailored for ' + title.toLowerCase() + '.';
        useCasesMap.set(key, {
          id: 'cat_usecase_' + useCasesMap.size,
          title,
          description,
          context: {
            species: 'cat',
            food_type: p.food_type,
            life_stage: p.life_stage,
            lifestyle: p.lifestyle,
            health_need: health
          }
        });
      }
    });

    const popular_use_cases = Array.from(useCasesMap.values()).slice(0, 6);

    const featured_articles = articles
      .sort((a, b) => {
        const ad = a.published_at || '';
        const bd = b.published_at || '';
        if (ad === bd) return a.title.localeCompare(b.title);
        return ad > bd ? -1 : 1;
      })
      .slice(0, 5);

    return {
      primary_categories: categories,
      popular_use_cases,
      featured_articles
    };
  }

  // -------------------- About page --------------------

  getAboutPageContent() {
    // Optionally allow CMS-like data in localStorage key 'about_page_content'
    const stored = this._getFromStorage('about_page_content', null);
    if (stored && typeof stored === 'object' && !Array.isArray(stored)) {
      return {
        headline: stored.headline || '',
        body: stored.body || '',
        hero_image_url: stored.hero_image_url || '',
        sections: stored.sections || []
      };
    }
    // Default empty content (no mocked story text)
    return {
      headline: '',
      body: '',
      hero_image_url: '',
      sections: []
    };
  }

  // -------------------- Product listing & filters --------------------

  getProductFilterOptions(species, food_type, categoryId) {
    const productsAll = this._getFromStorage('products', []);
    let products = productsAll;
    if (species) {
      products = products.filter((p) => p.species === species);
    }
    if (food_type) {
      products = products.filter((p) => p.food_type === food_type);
    }
    if (categoryId) {
      products = products.filter((p) => Array.isArray(p.category_ids) && p.category_ids.includes(categoryId));
    }

    const collectEnumOptions = (getter) => {
      const set = new Set();
      products.forEach((p) => {
        const value = getter(p);
        if (value) set.add(value);
      });
      return Array.from(set).map((value) => ({
        value,
        label: value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
      }));
    };

    const life_stage_options = collectEnumOptions((p) => p.life_stage);
    const lifestyle_options = collectEnumOptions((p) => p.lifestyle);
    const size_group_options = collectEnumOptions((p) => p.size_group);

    const health_need_set = new Set();
    products.forEach((p) => {
      (p.health_needs || []).forEach((h) => health_need_set.add(h));
    });
    const health_need_options = Array.from(health_need_set).map((value) => ({
      value,
      label: value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    }));

    const dietary_feature_set = new Set();
    products.forEach((p) => {
      (p.dietary_features || []).forEach((d) => dietary_feature_set.add(d));
    });
    const dietary_feature_options = Array.from(dietary_feature_set).map((value) => ({
      value,
      label: value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    }));

    const primary_protein_options = collectEnumOptions((p) => p.primary_protein);

    let minPrice = Infinity;
    let maxPrice = -Infinity;
    products.forEach((p) => {
      if (typeof p.price === 'number') {
        if (p.price < minPrice) minPrice = p.price;
        if (p.price > maxPrice) maxPrice = p.price;
      }
    });

    let price_range_suggestions = [];
    if (isFinite(minPrice) && isFinite(maxPrice) && minPrice < maxPrice) {
      const steps = 4;
      const range = maxPrice - minPrice;
      price_range_suggestions = [];
      for (let i = 1; i <= steps; i++) {
        price_range_suggestions.push(Math.round((minPrice + (range * i) / steps) * 100) / 100);
      }
    }

    const rating_set = new Set();
    products.forEach((p) => {
      if (typeof p.average_rating === 'number') {
        rating_set.add(Math.floor(p.average_rating));
      }
    });
    const rating_options = Array.from(rating_set).sort((a, b) => a - b);

    const sort_options = [
      { value: 'price_low_to_high', label: 'Price: Low to High' },
      { value: 'price_high_to_low', label: 'Price: High to Low' },
      { value: 'rating_high_to_low', label: 'Customer Rating: High to Low' }
    ];

    return {
      life_stage_options,
      lifestyle_options,
      size_group_options,
      health_need_options,
      dietary_feature_options,
      primary_protein_options,
      price_range_suggestions,
      rating_options,
      sort_options
    };
  }

  listProducts(species, food_type, categoryId, filters, sort_by, page, page_size) {
    let products = this._getFromStorage('products', []);

    if (species) products = products.filter((p) => p.species === species);
    if (food_type) products = products.filter((p) => p.food_type === food_type);
    if (categoryId) {
      products = products.filter((p) => Array.isArray(p.category_ids) && p.category_ids.includes(categoryId));
    }

    const applied_filters = {
      life_stages: [],
      lifestyles: [],
      size_groups: [],
      health_needs: [],
      dietary_features: [],
      primary_proteins: [],
      price_range: { min_price: undefined, max_price: undefined },
      rating_range: { min_rating: undefined, max_rating: undefined }
    };

    if (filters && typeof filters === 'object') {
      const {
        life_stages,
        lifestyles,
        size_groups,
        health_needs,
        dietary_features,
        primary_proteins,
        min_price,
        max_price,
        min_rating,
        max_rating
      } = filters;

      if (Array.isArray(life_stages) && life_stages.length) {
        applied_filters.life_stages = life_stages.slice();
        products = products.filter((p) => life_stages.includes(p.life_stage));
      }

      if (Array.isArray(lifestyles) && lifestyles.length) {
        applied_filters.lifestyles = lifestyles.slice();
        products = products.filter((p) => lifestyles.includes(p.lifestyle));
      }

      if (Array.isArray(size_groups) && size_groups.length) {
        applied_filters.size_groups = size_groups.slice();
        products = products.filter((p) => size_groups.includes(p.size_group));
      }

      if (Array.isArray(health_needs) && health_needs.length) {
        applied_filters.health_needs = health_needs.slice();
        products = products.filter((p) => {
          const needs = p.health_needs || [];
          return needs.some((n) => health_needs.includes(n));
        });
      }

      if (Array.isArray(dietary_features) && dietary_features.length) {
        applied_filters.dietary_features = dietary_features.slice();
        products = products.filter((p) => {
          const feats = p.dietary_features || [];
          return feats.some((d) => dietary_features.includes(d));
        });
      }

      if (Array.isArray(primary_proteins) && primary_proteins.length) {
        applied_filters.primary_proteins = primary_proteins.slice();
        products = products.filter((p) => primary_proteins.includes(p.primary_protein));
      }

      if (typeof min_price === 'number') {
        applied_filters.price_range.min_price = min_price;
        products = products.filter((p) => typeof p.price === 'number' && p.price >= min_price);
      }

      if (typeof max_price === 'number') {
        applied_filters.price_range.max_price = max_price;
        products = products.filter((p) => typeof p.price === 'number' && p.price <= max_price);
      }

      if (typeof min_rating === 'number') {
        applied_filters.rating_range.min_rating = min_rating;
        products = products.filter((p) => {
          const r = typeof p.average_rating === 'number' ? p.average_rating : 0;
          return r >= min_rating;
        });
      }

      if (typeof max_rating === 'number') {
        applied_filters.rating_range.max_rating = max_rating;
        products = products.filter((p) => {
          const r = typeof p.average_rating === 'number' ? p.average_rating : 0;
          return r <= max_rating;
        });
      }
    }

    // Sorting
    if (sort_by === 'price_low_to_high') {
      products.sort((a, b) => {
        const ap = typeof a.price === 'number' ? a.price : Infinity;
        const bp = typeof b.price === 'number' ? b.price : Infinity;
        if (ap === bp) return a.name.localeCompare(b.name);
        return ap - bp;
      });
    } else if (sort_by === 'price_high_to_low') {
      products.sort((a, b) => {
        const ap = typeof a.price === 'number' ? a.price : -Infinity;
        const bp = typeof b.price === 'number' ? b.price : -Infinity;
        if (ap === bp) return a.name.localeCompare(b.name);
        return bp - ap;
      });
    } else if (sort_by === 'rating_high_to_low') {
      products.sort((a, b) => {
        const ar = typeof a.average_rating === 'number' ? a.average_rating : 0;
        const br = typeof b.average_rating === 'number' ? b.average_rating : 0;
        if (ar === br) return a.name.localeCompare(b.name);
        return br - ar;
      });
    } else {
      products.sort((a, b) => a.name.localeCompare(b.name));
    }

    // Instrumentation for task completion tracking (product listing contexts)
    try {
      if (species === 'dog' && food_type === 'dry_food') {
        const context1 = {
          species,
          food_type,
          categoryId,
          filters,
          sort_by,
          product_ids: products.map((p) => p.id)
        };
        localStorage.setItem('task1_lastProductListContext', JSON.stringify(context1));
      }
      if (species === 'cat' && food_type === 'wet_food') {
        const context2 = {
          species,
          food_type,
          categoryId,
          filters,
          sort_by,
          product_ids: products.map((p) => p.id)
        };
        localStorage.setItem('task2_lastProductListContext', JSON.stringify(context2));
      }
      if (species === 'dog' && food_type === 'treat') {
        const context4 = {
          species,
          food_type,
          categoryId,
          filters,
          sort_by,
          product_ids: products.map((p) => p.id)
        };
        localStorage.setItem('task4_lastProductListContext', JSON.stringify(context4));
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    const total_count = products.length;
    const pageNum = page && page > 0 ? page : 1;
    const size = page_size && page_size > 0 ? page_size : 20;
    const start = (pageNum - 1) * size;
    const pagedProducts = products.slice(start, start + size);

    return {
      products: pagedProducts,
      total_count,
      page: pageNum,
      page_size: size,
      applied_filters
    };
  }

  // -------------------- Product detail & favorites --------------------

  getProductDetails(productId) {
    const products = this._getFromStorage('products', []);
    const variants = this._getFromStorage('product_variants', []);
    const favorites = this._getFromStorage('favorite_products', []);
    const compareList = this._getOrCreateCompareList();
    const plan = this._getOrCreateActiveFeedingPlan();
    const planItems = this._getFromStorage('feeding_plan_items', []);

    const product = products.find((p) => p.id === productId) || null;
    const productVariants = variants
      .filter((v) => v.product_id === productId)
      .map((v) => ({ ...v, product })); // FK resolution

    let default_variant_id = null;
    const defaultVariant = productVariants.find((v) => v.is_default) || productVariants[0];
    if (defaultVariant) default_variant_id = defaultVariant.id;

    const is_favorited = favorites.some((f) => f.product_id === productId);
    const is_in_compare_list = (compareList.product_ids || []).includes(productId);
    const is_in_feeding_plan = planItems.some(
      (i) => i.feeding_plan_id === plan.id && i.product_id === productId && i.is_active
    );

    const nutrition = product
      ? {
          protein_min_percent: product.nutrition_protein_min_percent || null,
          fat_min_percent: product.nutrition_fat_min_percent || null,
          fiber_max_percent: product.nutrition_fiber_max_percent || null,
          moisture_max_percent: product.nutrition_moisture_max_percent || null,
          notes: product.guaranteed_analysis_notes || ''
        }
      : {
          protein_min_percent: null,
          fat_min_percent: null,
          fiber_max_percent: null,
          moisture_max_percent: null,
          notes: ''
        };

    const ingredients = (product && product.ingredients_list) || [];
    const ingredient_highlights = (product && product.ingredient_highlights) || [];

    let related_products = [];
    if (product) {
      related_products = products
        .filter((p) => p.id !== product.id && p.species === product.species && p.food_type === product.food_type)
        .filter((p) => !product.product_line || p.product_line === product.product_line)
        .slice(0, 8);
    }

    // Instrumentation for task completion tracking (viewed products & quiz recommendation)
    try {
      // task_2: track viewed wet cat food products
      if (product && product.species === 'cat' && product.food_type === 'wet_food') {
        const key = 'task2_viewedProductIds';
        let arr = [];
        const existing = localStorage.getItem(key);
        if (existing) {
          try {
            const parsed = JSON.parse(existing);
            if (Array.isArray(parsed)) arr = parsed;
          } catch (e) {
            // ignore parse error, use empty array
          }
        }
        if (!arr.includes(product.id)) {
          arr.push(product.id);
          localStorage.setItem(key, JSON.stringify(arr));
        }
      }

      // task_9: track if top quiz recommendation was viewed
      try {
        const ctxStr = localStorage.getItem('task9_quizSessionContext');
        if (ctxStr) {
          const ctx = JSON.parse(ctxStr);
          const recs = ctx && ctx.recommended_product_ids;
          if (Array.isArray(recs) && recs.length > 0) {
            if (String(recs[0]) === String(productId)) {
              localStorage.setItem('task9_viewedTopRecommendationProductId', String(productId));
            }
          }
        }
      } catch (e2) {
        // nested parse error, safely ignored
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      product,
      variants: productVariants,
      default_variant_id,
      is_favorited,
      is_in_compare_list,
      is_in_feeding_plan,
      nutrition,
      ingredients,
      ingredient_highlights,
      related_products
    };
  }

  addProductToFavorites(productId) {
    const favorites = this._getFromStorage('favorite_products', []);
    const existing = favorites.find((f) => f.product_id === productId);
    if (existing) {
      // Instrumentation for task completion tracking (dog dry favorited)
      try {
        const product = this._resolveProduct(productId);
        if (product && product.species === 'dog' && product.food_type === 'dry_food') {
          localStorage.setItem('task1_favoritedProductId', String(productId));
        }
      } catch (e) {
        console.error('Instrumentation error:', e);
      }

      return {
        favorite: existing,
        success: true,
        message: 'Product is already in favorites.'
      };
    }
    const favorite = {
      id: this._generateId('favorite'),
      product_id: productId,
      added_at: this._now()
    };
    favorites.push(favorite);
    this._saveToStorage('favorite_products', favorites);

    // Instrumentation for task completion tracking (dog dry favorited)
    try {
      const product = this._resolveProduct(productId);
      if (product && product.species === 'dog' && product.food_type === 'dry_food') {
        localStorage.setItem('task1_favoritedProductId', String(productId));
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      favorite,
      success: true,
      message: 'Product added to favorites.'
    };
  }

  removeProductFromFavorites(productId) {
    const favorites = this._getFromStorage('favorite_products', []);
    const newFavs = favorites.filter((f) => f.product_id !== productId);
    const removed = newFavs.length !== favorites.length;
    this._saveToStorage('favorite_products', newFavs);
    return {
      success: removed,
      message: removed ? 'Product removed from favorites.' : 'Product was not in favorites.'
    };
  }

  getFavoriteProducts() {
    const favorites = this._getFromStorage('favorite_products', []);
    const products = this._getFromStorage('products', []);
    const ids = favorites.map((f) => f.product_id);
    const idSet = new Set(ids);
    return products.filter((p) => idSet.has(p.id));
  }

  // -------------------- Compare list --------------------

  addProductToCompare(productId) {
    const lists = this._getFromStorage('compare_list', []);
    let list = this._getOrCreateCompareList();
    if (!list.product_ids.includes(productId)) {
      list.product_ids.push(productId);
      list.last_updated_at = this._now();
      const updatedLists = lists.length ? [list, ...lists.slice(1)] : [list];
      this._saveToStorage('compare_list', updatedLists);
    }

    // Instrumentation for task completion tracking (wet cat food compare added)
    try {
      const product = this._resolveProduct(productId);
      if (product && product.species === 'cat' && product.food_type === 'wet_food') {
        localStorage.setItem('task2_compareAddedProductId', String(productId));
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      compare_list: list,
      success: true,
      message: 'Product added to compare list.'
    };
  }

  removeProductFromCompare(productId) {
    const lists = this._getFromStorage('compare_list', []);
    let list = this._getOrCreateCompareList();
    const before = list.product_ids.length;
    list.product_ids = list.product_ids.filter((id) => id !== productId);
    const removed = list.product_ids.length !== before;
    list.last_updated_at = this._now();
    const updatedLists = lists.length ? [list, ...lists.slice(1)] : [list];
    this._saveToStorage('compare_list', updatedLists);
    return {
      compare_list: list,
      success: removed,
      message: removed ? 'Product removed from compare list.' : 'Product was not in compare list.'
    };
  }

  getCompareProducts() {
    const list = this._getOrCreateCompareList();
    const products = this._resolveProducts(list.product_ids || []);

    // Instrumentation for task completion tracking (compare page viewed)
    try {
      if (list && Array.isArray(list.product_ids) && list.product_ids.length > 0) {
        localStorage.setItem('task2_comparePageViewed', 'true');
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      compare_list: list,
      products
    };
  }

  // -------------------- Feeding plan & calculator --------------------

  addProductToFeedingPlan(productId, product_role) {
    const feedingPlan = this._getOrCreateActiveFeedingPlan();
    const items = this._getFromStorage('feeding_plan_items', []);
    let item = items.find(
      (i) => i.feeding_plan_id === feedingPlan.id && i.product_id === productId && i.product_role === product_role
    );

    if (!item) {
      let unit = null;
      if (product_role === 'dry_food') unit = 'grams';
      else if (product_role === 'wet_food') unit = 'cans';
      else unit = 'pieces';

      item = {
        id: this._generateId('feeding_plan_item'),
        feeding_plan_id: feedingPlan.id,
        product_id: productId,
        product_role,
        daily_amount: null,
        daily_amount_unit: unit,
        is_active: true
      };
      items.push(item);
    } else {
      item.is_active = true;
    }

    this._saveToStorage('feeding_plan_items', items);
    this._recalculateFeedingPlanItems(feedingPlan);

    const allItems = this._getFromStorage('feeding_plan_items', []);
    const activeItems = allItems
      .filter((i) => i.feeding_plan_id === feedingPlan.id && i.is_active)
      .map((i) => ({
        ...i,
        product: this._resolveProduct(i.product_id)
      }));

    return {
      feeding_plan: feedingPlan,
      items: activeItems,
      success: true,
      message: 'Product added to feeding plan.'
    };
  }

  getCurrentFeedingPlan() {
    const feeding_plan = this._getOrCreateActiveFeedingPlan();
    const itemsAll = this._getFromStorage('feeding_plan_items', []);
    const items = itemsAll
      .filter((i) => i.feeding_plan_id === feeding_plan.id && i.is_active)
      .map((i) => ({
        ...i,
        product: this._resolveProduct(i.product_id)
      }));

    const petProfiles = this._getFromStorage('pet_profiles', []);
    const linked_pet_profile = feeding_plan.pet_profile_id
      ? petProfiles.find((p) => p.id === feeding_plan.pet_profile_id) || null
      : null;

    return {
      feeding_plan,
      items,
      linked_pet_profile
    };
  }

  updateFeedingPlanSettings(feeding_plan_id, pet_weight, weight_unit, feeding_mode, notes) {
    const plans = this._getFromStorage('feeding_plans', []);
    const index = plans.findIndex((p) => p.id === feeding_plan_id);
    if (index === -1) {
      return {
        feeding_plan: null,
        items: []
      };
    }
    const plan = { ...plans[index] };

    if (typeof pet_weight === 'number') plan.pet_weight = pet_weight;
    if (weight_unit) plan.weight_unit = weight_unit;
    if (feeding_mode) plan.feeding_mode = feeding_mode;
    if (typeof notes === 'string') plan.notes = notes;

    plan.updated_at = this._now();
    plans[index] = plan;
    this._saveToStorage('feeding_plans', plans);

    this._recalculateFeedingPlanItems(plan);

    const itemsAll = this._getFromStorage('feeding_plan_items', []);
    const items = itemsAll
      .filter((i) => i.feeding_plan_id === plan.id && i.is_active)
      .map((i) => ({
        ...i,
        product: this._resolveProduct(i.product_id)
      }));

    return {
      feeding_plan: plan,
      items
    };
  }

  saveFeedingPlanForPetProfile(
    feeding_plan_id,
    pet_profile_id,
    pet_name,
    species,
    life_stage,
    age_years,
    activity_level,
    lifestyle
  ) {
    const plans = this._getFromStorage('feeding_plans', []);
    const planIndex = plans.findIndex((p) => p.id === feeding_plan_id);
    if (planIndex === -1) {
      return {
        pet_profile: null,
        feeding_plan: null
      };
    }
    let plan = { ...plans[planIndex] };

    const petProfiles = this._getFromStorage('pet_profiles', []);
    let profile = null;

    if (pet_profile_id) {
      const idx = petProfiles.findIndex((p) => p.id === pet_profile_id);
      if (idx !== -1) {
        profile = { ...petProfiles[idx] };
        if (pet_name) profile.name = pet_name;
        if (species) profile.species = species;
        if (life_stage) profile.life_stage = life_stage;
        if (typeof age_years === 'number') profile.age_years = age_years;
        if (activity_level) profile.activity_level = activity_level;
        if (lifestyle) profile.lifestyle = lifestyle;
        if (typeof plan.pet_weight === 'number') profile.weight = plan.pet_weight;
        if (plan.weight_unit) profile.weight_unit = plan.weight_unit;
        petProfiles[idx] = profile;
      }
    }

    if (!profile) {
      // Determine species from first product in plan if not provided
      let derivedSpecies = species || 'dog';
      const itemsAll = this._getFromStorage('feeding_plan_items', []);
      const firstItem = itemsAll.find((i) => i.feeding_plan_id === plan.id);
      if (!species && firstItem) {
        const prod = this._resolveProduct(firstItem.product_id);
        if (prod && prod.species) derivedSpecies = prod.species;
      }

      profile = {
        id: this._generateId('pet_profile'),
        name: pet_name || 'My Pet',
        species: derivedSpecies,
        life_stage: life_stage || null,
        age_years: typeof age_years === 'number' ? age_years : null,
        weight: typeof plan.pet_weight === 'number' ? plan.pet_weight : null,
        weight_unit: plan.weight_unit || null,
        activity_level: activity_level || null,
        lifestyle: lifestyle || null,
        notes: null,
        created_at: this._now()
      };
      petProfiles.push(profile);
    }

    this._saveToStorage('pet_profiles', petProfiles);

    plan.pet_profile_id = profile.id;
    plan.updated_at = this._now();
    plans[planIndex] = plan;
    this._saveToStorage('feeding_plans', plans);

    return {
      pet_profile: profile,
      feeding_plan: plan
    };
  }

  getFeedingCalculatorOptions(pet_type, feeding_type) {
    const productsAll = this._getFromStorage('products', []);
    let products = productsAll;
    if (pet_type) products = products.filter((p) => p.species === pet_type);
    if (feeding_type) products = products.filter((p) => p.food_type === feeding_type);

    const pet_type_options = [
      { value: 'dog', label: 'Dog' },
      { value: 'cat', label: 'Cat' }
    ];
    const feeding_type_options = [
      { value: 'dry_food', label: 'Dry Food' },
      { value: 'wet_food', label: 'Wet Food' }
    ];
    const activity_level_options = [
      { value: 'low', label: 'Low' },
      { value: 'moderately_active', label: 'Moderately active' },
      { value: 'high', label: 'High' }
    ];

    return {
      pet_type_options,
      feeding_type_options,
      activity_level_options,
      product_options: products
    };
  }

  calculateFeedingRecommendation(pet_type, feeding_type, productId, pet_weight, weight_unit, activity_level) {
    const product = this._resolveProduct(productId);
    const weight = typeof pet_weight === 'number' ? pet_weight : 0;
    let weightKg = weight;
    if (weight_unit === 'lb') {
      weightKg = weight * 0.453592;
    }

    let amount_unit = 'grams';
    let basePerKg;
    if (feeding_type === 'wet_food') {
      amount_unit = 'cups';
      basePerKg = 0.25; // cups per kg
    } else {
      amount_unit = 'grams';
      basePerKg = 12; // grams per kg
    }

    let activityFactor = 1;
    if (activity_level === 'low') activityFactor = 0.9;
    else if (activity_level === 'high') activityFactor = 1.1;

    let recommended_daily_amount = 0;
    if (weightKg > 0) {
      recommended_daily_amount = weightKg * basePerKg * activityFactor;
      if (amount_unit === 'grams') {
        recommended_daily_amount = Math.round(recommended_daily_amount);
      } else {
        recommended_daily_amount = Math.round(recommended_daily_amount * 10) / 10;
      }
    }

    const meals_per_day = 2;
    const per_meal_amount = meals_per_day > 0 ? Math.round((recommended_daily_amount / meals_per_day) * 10) / 10 : 0;

    const session = {
      id: this._generateId('feed_calc'),
      pet_type,
      feeding_type: feeding_type || null,
      product_id: productId,
      pet_weight: weight,
      weight_unit,
      activity_level,
      recommended_daily_amount,
      amount_unit,
      created_at: this._now()
    };

    this._saveFeedingCalculationSession(session);

    const display_text =
      recommended_daily_amount > 0
        ? 'Feed ' +
          recommended_daily_amount +
          ' ' +
          amount_unit +
          ' per day, about ' +
          per_meal_amount +
          ' ' +
          amount_unit +
          ' per meal (' +
          meals_per_day +
          ' meals per day).'
        : 'No recommendation available.';

    return {
      calculation_session: {
        ...session,
        product
      },
      recommended_daily_amount,
      amount_unit,
      per_meal_amount,
      meals_per_day,
      display_text
    };
  }

  saveFeedingPlanFromCalculation(calculation_session_id, pet_name, age_years) {
    const sessions = this._getFromStorage('feeding_calculation_sessions', []);
    const session = sessions.find((s) => s.id === calculation_session_id);
    if (!session) {
      return {
        pet_profile: null,
        feeding_plan: null,
        items: []
      };
    }

    const petProfiles = this._getFromStorage('pet_profiles', []);
    const plans = this._getFromStorage('feeding_plans', []);
    const planItems = this._getFromStorage('feeding_plan_items', []);

    const profile = {
      id: this._generateId('pet_profile'),
      name: pet_name,
      species: session.pet_type,
      life_stage: 'adult',
      age_years: typeof age_years === 'number' ? age_years : null,
      weight: session.pet_weight,
      weight_unit: session.weight_unit,
      activity_level: session.activity_level,
      lifestyle: null,
      notes: null,
      created_at: this._now()
    };
    petProfiles.push(profile);
    this._saveToStorage('pet_profiles', petProfiles);

    const feeding_mode = session.feeding_type === 'wet_food' ? 'wet_only' : 'dry_only';

    const feeding_plan = {
      id: this._generateId('feeding_plan'),
      pet_profile_id: profile.id,
      feeding_mode,
      pet_weight: session.pet_weight,
      weight_unit: session.weight_unit,
      notes: null,
      created_at: this._now(),
      updated_at: this._now()
    };
    plans.push(feeding_plan);
    this._saveToStorage('feeding_plans', plans);
    localStorage.setItem('active_feeding_plan_id', feeding_plan.id);

    const item = {
      id: this._generateId('feeding_plan_item'),
      feeding_plan_id: feeding_plan.id,
      product_id: session.product_id,
      product_role: session.feeding_type || 'dry_food',
      daily_amount: session.recommended_daily_amount,
      daily_amount_unit: session.amount_unit,
      is_active: true
    };
    planItems.push(item);
    this._saveToStorage('feeding_plan_items', planItems);

    const itemWithProduct = {
      ...item,
      product: this._resolveProduct(item.product_id)
    };

    return {
      pet_profile: profile,
      feeding_plan,
      items: [itemWithProduct]
    };
  }

  // -------------------- Cart --------------------

  addProductToCart(productId, product_variant_id, quantity) {
    const qty = typeof quantity === 'number' && quantity > 0 ? quantity : 1;
    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items', []);
    const products = this._getFromStorage('products', []);
    const variants = this._getFromStorage('product_variants', []);

    const product = products.find((p) => p.id === productId) || null;
    const variant = product_variant_id ? variants.find((v) => v.id === product_variant_id) || null : null;

    const unit_price = variant && typeof variant.price === 'number'
      ? variant.price
      : product && typeof product.price === 'number'
      ? product.price
      : 0;

    let existing = cartItems.find(
      (ci) =>
        ci.cart_id === cart.id &&
        ci.product_id === productId &&
        ((ci.product_variant_id || null) === (product_variant_id || null))
    );

    if (existing) {
      existing.quantity += qty;
      existing.unit_price = unit_price;
      existing.line_total = unit_price * existing.quantity;
    } else {
      existing = {
        id: this._generateId('cart_item'),
        cart_id: cart.id,
        product_id: productId,
        product_variant_id: product_variant_id || null,
        quantity: qty,
        unit_price,
        line_total: unit_price * qty,
        added_at: this._now()
      };
      cartItems.push(existing);
    }

    cart.updated_at = this._now();

    // Save
    const carts = this._getFromStorage('cart', []);
    const cartIndex = carts.findIndex((c) => c.id === cart.id);
    if (cartIndex === -1) {
      carts.push(cart);
    } else {
      carts[cartIndex] = cart;
    }
    this._saveToStorage('cart', carts);
    this._saveToStorage('cart_items', cartItems);

    const itemsResolved = this._getCartItemsWithResolvedReferences(cart.id);
    let subtotal = 0;
    let total_quantity = 0;
    itemsResolved.forEach((item) => {
      subtotal += item.line_total || 0;
      total_quantity += item.quantity || 0;
    });

    return {
      cart,
      items: itemsResolved,
      success: true,
      message: 'Product added to cart.',
      subtotal,
      total_quantity
    };
  }

  getCartSummary() {
    const cart = this._getOrCreateCart();
    const items = this._getCartItemsWithResolvedReferences(cart.id);
    let subtotal = 0;
    let total_quantity = 0;
    items.forEach((item) => {
      subtotal += item.line_total || 0;
      total_quantity += item.quantity || 0;
    });
    return {
      cart,
      items,
      subtotal,
      total_quantity
    };
  }

  updateCartItemQuantity(cart_item_id, quantity) {
    const cartItems = this._getFromStorage('cart_items', []);
    const index = cartItems.findIndex((ci) => ci.id === cart_item_id);
    if (index === -1) {
      return this.getCartSummary();
    }
    const cartItem = cartItems[index];

    if (quantity <= 0) {
      cartItems.splice(index, 1);
    } else {
      cartItem.quantity = quantity;
      cartItem.line_total = cartItem.unit_price * quantity;
    }

    this._saveToStorage('cart_items', cartItems);

    const cart = this._getOrCreateCart();
    cart.updated_at = this._now();
    const carts = this._getFromStorage('cart', []);
    const cartIndex = carts.findIndex((c) => c.id === cart.id);
    if (cartIndex === -1) {
      carts.push(cart);
    } else {
      carts[cartIndex] = cart;
    }
    this._saveToStorage('cart', carts);

    const items = this._getCartItemsWithResolvedReferences(cart.id);
    let subtotal = 0;
    let total_quantity = 0;
    items.forEach((item) => {
      subtotal += item.line_total || 0;
      total_quantity += item.quantity || 0;
    });

    return {
      cart,
      items,
      subtotal,
      total_quantity
    };
  }

  removeCartItem(cart_item_id) {
    const cartItems = this._getFromStorage('cart_items', []);
    const index = cartItems.findIndex((ci) => ci.id === cart_item_id);
    if (index !== -1) {
      cartItems.splice(index, 1);
      this._saveToStorage('cart_items', cartItems);
    }

    const cart = this._getOrCreateCart();
    cart.updated_at = this._now();
    const carts = this._getFromStorage('cart', []);
    const cartIndex = carts.findIndex((c) => c.id === cart.id);
    if (cartIndex === -1) {
      carts.push(cart);
    } else {
      carts[cartIndex] = cart;
    }
    this._saveToStorage('cart', carts);

    const items = this._getCartItemsWithResolvedReferences(cart.id);
    let subtotal = 0;
    let total_quantity = 0;
    items.forEach((item) => {
      subtotal += item.line_total || 0;
      total_quantity += item.quantity || 0;
    });

    return {
      cart,
      items,
      subtotal,
      total_quantity
    };
  }

  clearCart() {
    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items', []);
    const remaining = cartItems.filter((ci) => ci.cart_id !== cart.id);
    this._saveToStorage('cart_items', remaining);

    cart.updated_at = this._now();
    const carts = this._getFromStorage('cart', []);
    const cartIndex = carts.findIndex((c) => c.id === cart.id);
    if (cartIndex === -1) {
      carts.push(cart);
    } else {
      carts[cartIndex] = cart;
    }
    this._saveToStorage('cart', carts);

    return {
      cart,
      items: [],
      subtotal: 0,
      total_quantity: 0
    };
  }

  // -------------------- Store locator --------------------

  searchStores(postal_code, radius_miles, filters) {
    const stores = this._getFromStorage('stores', []).filter((s) => s.is_active);
    const availability = this._getFromStorage('store_product_availability', []);
    const products = this._getFromStorage('products', []);

    const carriesDryOnly = filters && filters.carries_dry_food_only;
    const serviceKeys = (filters && filters.service_keys) || [];
    const productNameQuery = filters && filters.product_name_query;
    const productIdFilter = filters && filters.productId;

    let requested_product = null;
    if (productIdFilter) {
      requested_product = products.find((p) => p.id === productIdFilter) || null;
    } else if (productNameQuery) {
      const q = productNameQuery.toLowerCase();
      requested_product = products.find((p) => p.name && p.name.toLowerCase().includes(q)) || null;
    }

    const nameMatchIds = [];
    if (productNameQuery) {
      const q = productNameQuery.toLowerCase();
      products.forEach((p) => {
        if (p.name && p.name.toLowerCase().includes(q)) nameMatchIds.push(p.id);
      });
    }

    const results = stores
      .filter((s) => {
        if (postal_code && s.postal_code !== postal_code) return false;
        if (carriesDryOnly && !s.carries_dry_food) return false;
        if (serviceKeys && serviceKeys.length) {
          const storeServices = s.services || [];
          const hasAny = serviceKeys.some((svc) => storeServices.includes(svc));
          if (!hasAny) return false;
        }
        return true;
      })
      .map((s) => {
        let carriesRequested = false;
        if (productIdFilter) {
          carriesRequested = availability.some(
            (a) => a.store_id === s.id && a.product_id === productIdFilter && a.is_available
          );
        } else if (nameMatchIds.length) {
          carriesRequested = availability.some(
            (a) => a.store_id === s.id && nameMatchIds.includes(a.product_id) && a.is_available
          );
        }
        return {
          store: s,
          distance_miles: 0,
          carries_requested_product: carriesRequested
        };
      });

    // Instrumentation for task completion tracking (store search params)
    try {
      if (postal_code) {
        const context5 = {
          postal_code,
          radius_miles,
          filters,
          result_store_ids: results.map((r) => r.store.id),
          requested_product_id: requested_product ? requested_product.id : null
        };
        localStorage.setItem('task5_searchParams', JSON.stringify(context5));
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    const preferredRecord = this._getLatestPreferredStoreRecord();
    const preferred_store = preferredRecord ? this._resolveStore(preferredRecord.store_id) : null;

    return {
      results,
      requested_product,
      preferred_store
    };
  }

  getStoreDetail(storeId) {
    const store = this._resolveStore(storeId);
    const preferredRecord = this._getLatestPreferredStoreRecord();
    const is_preferred = !!(preferredRecord && preferredRecord.store_id === storeId);

    const availability = this._getFromStorage('store_product_availability', []);
    const products = this._getFromStorage('products', []);

    const product_availability = availability
      .filter((a) => a.store_id === storeId && a.is_available)
      .map((a) => ({
        product: products.find((p) => p.id === a.product_id) || null,
        is_available: a.is_available
      }));

    return {
      store,
      is_preferred,
      product_availability
    };
  }

  setPreferredStore(storeId) {
    const store = this._resolveStore(storeId);
    if (!store) {
      return {
        preferred_store: null,
        store: null,
        success: false
      };
    }
    const preferred_store = this._setPreferredStoreInternal(storeId);

    // Instrumentation for task completion tracking (preferred store id)
    try {
      localStorage.setItem('task5_preferredStoreId', String(storeId));
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      preferred_store,
      store,
      success: true
    };
  }

  getPreferredStore() {
    const record = this._getLatestPreferredStoreRecord();
    const store = record ? this._resolveStore(record.store_id) : null;
    return { store };
  }

  // -------------------- Blog / Articles --------------------

  listBlogArticles(filters, page, page_size) {
    let articles = this._getFromStorage('blog_articles', []).filter((a) => a.is_published);
    const allArticles = articles.slice();

    if (filters && typeof filters === 'object') {
      const { category_key, tag, search_query } = filters;
      if (category_key) {
        articles = articles.filter((a) => a.category_key === category_key);
      }
      if (tag) {
        articles = articles.filter((a) => (a.tags || []).includes(tag));
      }
      if (search_query) {
        const q = search_query.toLowerCase();
        articles = articles.filter((a) => {
          const inTitle = a.title && a.title.toLowerCase().includes(q);
          const inSummary = a.summary && a.summary.toLowerCase().includes(q);
          const inContent = a.content && a.content.toLowerCase().includes(q);
          return inTitle || inSummary || inContent;
        });
      }
    }

    const total_count = articles.length;
    const pageNum = page && page > 0 ? page : 1;
    const size = page_size && page_size > 0 ? page_size : 10;
    const start = (pageNum - 1) * size;
    const paged = articles.slice(start, start + size);

    // Build category_filters based on all published articles
    const categoryMap = new Map();
    allArticles.forEach((a) => {
      const key = a.category_key || 'all_articles';
      if (!categoryMap.has(key)) {
        categoryMap.set(key, { category_key: key, label: '', article_count: 0 });
      }
      const entry = categoryMap.get(key);
      entry.article_count += 1;
    });

    const category_filters = Array.from(categoryMap.values()).map((entry) => {
      const label = entry.category_key
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());
      return {
        ...entry,
        label
      };
    });

    return {
      articles: paged,
      total_count,
      page: pageNum,
      page_size: size,
      category_filters
    };
  }

  getBlogArticleDetail(slug) {
    const articles = this._getFromStorage('blog_articles', []).filter((a) => a.is_published);
    const article = articles.find((a) => a.slug === slug) || null;

    let related_articles = [];
    if (article) {
      if (Array.isArray(article.related_article_ids) && article.related_article_ids.length) {
        const idSet = new Set(article.related_article_ids);
        related_articles = articles.filter((a) => idSet.has(a.id));
      }
      if (!related_articles.length) {
        related_articles = articles
          .filter((a) => a.id !== article.id && a.category_key === article.category_key)
          .slice(0, 5);
      }
    }

    // Instrumentation for task completion tracking (viewed puppy article)
    try {
      if (article && article.category_key === 'puppy') {
        localStorage.setItem('task6_viewedPuppyArticleSlug', slug);
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      article,
      related_articles
    };
  }

  subscribeToNewsletter(name, email, interests, source) {
    const subscriptions = this._getFromStorage('newsletter_subscriptions', []);
    const existingIndex = subscriptions.findIndex((s) => s.email === email);

    const now = this._now();
    let subscription;

    if (existingIndex !== -1) {
      subscription = { ...subscriptions[existingIndex] };
      if (name) subscription.name = name;
      if (Array.isArray(interests) && interests.length) {
        const existingInterests = new Set(subscription.interests || []);
        interests.forEach((i) => existingInterests.add(i));
        subscription.interests = Array.from(existingInterests);
      }
      if (source) subscription.source = source;
      subscription.subscribed_at = now;
      subscriptions[existingIndex] = subscription;
    } else {
      subscription = {
        id: this._generateId('newsletter_subscription'),
        name: name || null,
        email,
        interests: Array.isArray(interests) ? interests.slice() : [],
        source: source || null,
        subscribed_at: now
      };
      subscriptions.push(subscription);
    }

    this._saveToStorage('newsletter_subscriptions', subscriptions);

    return {
      subscription,
      success: true,
      message: 'Subscription saved.'
    };
  }

  // -------------------- Help Center --------------------

  getHelpCenterOverview() {
    const articles = this._getFromStorage('help_articles', []).filter((a) => a.is_published);

    const categoryMap = new Map();
    articles.forEach((a) => {
      const key = a.category_key || 'other_support';
      if (!categoryMap.has(key)) {
        categoryMap.set(key, {
          category_key: key,
          label: key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
          description: ''
        });
      }
    });

    const categories = Array.from(categoryMap.values());

    const popular_articles = articles
      .slice()
      .sort((a, b) => {
        const ad = a.published_at || '';
        const bd = b.published_at || '';
        if (ad === bd) return a.title.localeCompare(b.title);
        return ad > bd ? -1 : 1;
      })
      .slice(0, 5);

    return {
      categories,
      popular_articles
    };
  }

  searchHelpArticles(query, category_key) {
    let articles = this._getFromStorage('help_articles', []).filter((a) => a.is_published);
    if (category_key) {
      articles = articles.filter((a) => a.category_key === category_key);
    }

    const q = (query || '').toLowerCase();
    if (q) {
      articles = articles.filter((a) => {
        const inTitle = a.title && a.title.toLowerCase().includes(q);
        const inContent = a.content && a.content.toLowerCase().includes(q);
        const inKeywords = (a.keywords || []).some((k) => k.toLowerCase().includes(q));
        return inTitle || inContent || inKeywords;
      });
    }

    return {
      results: articles,
      total_count: articles.length
    };
  }

  getHelpArticleDetail(slug) {
    const articles = this._getFromStorage('help_articles', []).filter((a) => a.is_published);
    const article = articles.find((a) => a.slug === slug) || null;

    let related_articles = [];
    if (article) {
      if (Array.isArray(article.related_article_ids) && article.related_article_ids.length) {
        const idSet = new Set(article.related_article_ids);
        related_articles = articles.filter((a) => idSet.has(a.id));
      }
      if (!related_articles.length) {
        related_articles = articles
          .filter((a) => a.id !== article.id && a.category_key === article.category_key)
          .slice(0, 5);
      }
    }

    return {
      article,
      related_articles
    };
  }

  submitContactForm(topic, name, email, message, source_help_article_id) {
    const submissions = this._getFromStorage('contact_submissions', []);
    const submission = {
      id: this._generateId('contact_submission'),
      topic,
      name,
      email,
      message,
      source_help_article_id: source_help_article_id || null,
      submitted_at: this._now()
    };
    submissions.push(submission);
    this._saveToStorage('contact_submissions', submissions);

    const source_help_article = this._resolveHelpArticle(source_help_article_id);

    return {
      submission: {
        ...submission,
        source_help_article
      },
      success: true,
      message: 'Contact form submitted.'
    };
  }

  // -------------------- Product Finder Quiz --------------------

  getProductFinderQuizConfig() {
    const pet_type_options = [
      { value: 'dog', label: 'Dog' },
      { value: 'cat', label: 'Cat' }
    ];
    const age_group_options = [
      { value: 'puppy', label: 'Puppy / Kitten' },
      { value: 'adult', label: 'Adult' },
      { value: 'senior', label: 'Senior' }
    ];
    const size_group_options = [
      { value: 'toy', label: 'Toy' },
      { value: 'small', label: 'Small' },
      { value: 'medium', label: 'Medium' },
      { value: 'large', label: 'Large' },
      { value: 'giant', label: 'Giant' }
    ];
    const primary_health_concern_options = [
      { value: 'joint_health', label: 'Joint health' },
      { value: 'mobility', label: 'Mobility' },
      { value: 'weight_control', label: 'Weight control' },
      { value: 'hairball_control', label: 'Hairball control' },
      { value: 'digestive_health', label: 'Digestive health' },
      { value: 'skin_coat', label: 'Skin & coat' },
      { value: 'none', label: 'No specific concern' }
    ];
    const dietary_sensitivity_options = [
      { value: 'no_specific_sensitivities', label: 'No specific sensitivities' },
      { value: 'grain_allergy', label: 'Grain allergy' },
      { value: 'chicken_allergy', label: 'Chicken allergy' },
      { value: 'sensitive_stomach', label: 'Sensitive stomach' },
      { value: 'other', label: 'Other' }
    ];

    return {
      pet_type_options,
      age_group_options,
      size_group_options,
      primary_health_concern_options,
      dietary_sensitivity_options
    };
  }

  submitProductFinderQuizAnswers(
    pet_type,
    age_group,
    size_group,
    primary_health_concern,
    dietary_sensitivity
  ) {
    const productsAll = this._getFromStorage('products', []);
    let products = productsAll.filter((p) => p.species === pet_type);

    // Age group -> life_stage mapping
    products = products.filter((p) => {
      if (age_group === 'puppy') return p.life_stage === 'puppy' || p.life_stage === 'all_life_stages';
      if (age_group === 'adult') return p.life_stage === 'adult' || p.life_stage === 'all_life_stages';
      if (age_group === 'senior') return p.life_stage === 'senior' || p.life_stage === 'all_life_stages';
      return true;
    });

    // Size group filtering (if product has size_group)
    products = products.filter((p) => !p.size_group || p.size_group === size_group || p.size_group === 'all_sizes');

    // Primary health concern
    products = products.filter((p) => {
      const needs = p.health_needs || [];
      if (primary_health_concern === 'none') return true;
      if (primary_health_concern === 'mobility') {
        return needs.includes('mobility') || needs.includes('joint_health');
      }
      return needs.includes(primary_health_concern);
    });

    // Dietary sensitivity
    const ds = dietary_sensitivity || 'no_specific_sensitivities';
    products = products.filter((p) => {
      const feats = p.dietary_features || [];
      if (ds === 'grain_allergy') {
        return feats.includes('grain_free');
      }
      if (ds === 'chicken_allergy') {
        return p.primary_protein !== 'chicken';
      }
      if (ds === 'sensitive_stomach') {
        const needs = p.health_needs || [];
        return feats.includes('limited_ingredient') || needs.includes('digestive_health');
      }
      return true;
    });

    products.sort((a, b) => {
      const ar = typeof a.average_rating === 'number' ? a.average_rating : 0;
      const br = typeof b.average_rating === 'number' ? b.average_rating : 0;
      if (ar === br) {
        const ap = typeof a.price === 'number' ? a.price : Infinity;
        const bp = typeof b.price === 'number' ? b.price : Infinity;
        return ap - bp;
      }
      return br - ar;
    });

    const recommended_products = products.slice(0, 20);
    const recommended_product_ids = recommended_products.map((p) => p.id);

    const quiz_session = {
      id: this._generateId('product_finder_quiz'),
      pet_type,
      age_group,
      size_group,
      primary_health_concern,
      dietary_sensitivity: ds,
      recommended_product_ids,
      created_at: this._now()
    };

    this._saveProductFinderQuizSession(quiz_session);

    // Instrumentation for task completion tracking (quiz session context)
    try {
      const ctx9 = {
        quiz_session_id: quiz_session.id,
        pet_type,
        age_group,
        size_group,
        primary_health_concern,
        dietary_sensitivity: ds,
        recommended_product_ids
      };
      localStorage.setItem('task9_quizSessionContext', JSON.stringify(ctx9));
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      quiz_session,
      recommended_products
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