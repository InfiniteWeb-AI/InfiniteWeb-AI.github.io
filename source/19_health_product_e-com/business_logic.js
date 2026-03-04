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
  }

  // =====================
  // Initialization & Storage
  // =====================

  _initStorage() {
    // Core entity tables based on data model
    const keys = [
      'products',
      'bundle_items',
      'categories',
      'recipes',
      'recipe_ingredients',
      'recipe_steps',
      'cart',
      'cart_items',
      'shipping_methods',
      'checkout_sessions',
      'site_configs',
      'static_pages',
      'faq_entries',
      'contact_requests',
      // legacy / extra
      'users',
      'carts',
      'cartItems'
    ];

    for (const key of keys) {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, defaultValue = []) {
    const data = localStorage.getItem(key);
    if (data === null || data === undefined) {
      return defaultValue;
    }
    try {
      return JSON.parse(data);
    } catch (e) {
      // If corrupted, reset to default
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

  _nowISO() {
    return new Date().toISOString();
  }

  _clone(obj) {
    return obj == null ? obj : JSON.parse(JSON.stringify(obj));
  }

  // =====================
  // Cart helpers
  // =====================

  _getOrCreateCart() {
    let carts = this._getFromStorage('cart', []);
    if (!Array.isArray(carts)) carts = [];

    let cart = carts[0];
    if (!cart) {
      const siteConfigs = this._getFromStorage('site_configs', []);
      const currency = siteConfigs[0] ? siteConfigs[0].currency : 'usd';
      cart = {
        id: this._generateId('cart'),
        created_at: this._nowISO(),
        updated_at: this._nowISO(),
        subtotal: 0,
        item_count: 0,
        currency: currency
      };
      carts.push(cart);
      this._saveToStorage('cart', carts);
    }
    return cart;
  }

  _recalculateCartTotals(cartId) {
    let carts = this._getFromStorage('cart', []);
    if (!Array.isArray(carts)) carts = [];
    const cartIndex = carts.findIndex(c => c.id === cartId);
    if (cartIndex === -1) {
      return null;
    }

    let cartItems = this._getFromStorage('cart_items', []);
    if (!Array.isArray(cartItems)) cartItems = [];

    const itemsForCart = cartItems.filter(ci => ci.cart_id === cartId);
    let subtotal = 0;
    let itemCount = 0;

    for (const item of itemsForCart) {
      subtotal += Number(item.line_subtotal) || 0;
      itemCount += Number(item.quantity) || 0;
    }

    carts[cartIndex].subtotal = Number(subtotal.toFixed(2));
    carts[cartIndex].item_count = itemCount;
    carts[cartIndex].updated_at = this._nowISO();

    this._saveToStorage('cart', carts);

    return carts[cartIndex];
  }

  _addProductToCartWithSource(productId, quantity, unitPriceOverride, sourceType, sourceReference) {
    const products = this._getFromStorage('products', []);
    const product = products.find(p => p.id === productId);
    if (!product || product.is_available === false) {
      return {
        success: false,
        message: 'Product not found or unavailable',
        cart: null,
        cartItem: null
      };
    }

    const qty = Number(quantity) || 0;
    if (qty <= 0) {
      return {
        success: false,
        message: 'Quantity must be greater than zero',
        cart: null,
        cartItem: null
      };
    }

    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items', []);
    if (!Array.isArray(cartItems)) cartItems = [];

    const unitPrice = unitPriceOverride != null ? Number(unitPriceOverride) : Number(product.price) || 0;

    const normalizedSourceReference = sourceReference == null ? null : String(sourceReference);

    const existingIndex = cartItems.findIndex(ci =>
      ci.cart_id === cart.id &&
      ci.product_id === productId &&
      ci.source_type === sourceType &&
      (ci.source_reference || null) === normalizedSourceReference
    );

    const now = this._nowISO();
    let cartItem;

    if (existingIndex !== -1) {
      cartItem = cartItems[existingIndex];
      const newQty = Number(cartItem.quantity) + qty;
      cartItem.quantity = newQty;
      cartItem.line_subtotal = Number((newQty * unitPrice).toFixed(2));
      cartItem.added_at = now;
      cartItems[existingIndex] = cartItem;
    } else {
      cartItem = {
        id: this._generateId('cartitem'),
        cart_id: cart.id,
        product_id: productId,
        quantity: qty,
        unit_price: unitPrice,
        line_subtotal: Number((qty * unitPrice).toFixed(2)),
        added_at: now,
        source_type: sourceType,
        source_reference: normalizedSourceReference
      };
      cartItems.push(cartItem);
    }

    this._saveToStorage('cart_items', cartItems);
    const updatedCart = this._recalculateCartTotals(cart.id);

    return {
      success: true,
      message: 'Added to cart',
      cart: this._clone(updatedCart),
      cartItem: {
        cartItem: this._clone(cartItem),
        product: this._clone(product)
      }
    };
  }

  // =====================
  // Checkout helpers
  // =====================

  _getCurrentCheckoutSessionOrNull() {
    const cart = this._getOrCreateCart();
    let sessions = this._getFromStorage('checkout_sessions', []);
    if (!Array.isArray(sessions)) sessions = [];
    const session = sessions.find(s => s.cart_id === cart.id && s.status === 'in_progress');
    return session || null;
  }

  _createCheckoutSession() {
    const cart = this._getOrCreateCart();
    let sessions = this._getFromStorage('checkout_sessions', []);
    if (!Array.isArray(sessions)) sessions = [];

    const now = this._nowISO();
    const session = {
      id: this._generateId('checkout'),
      cart_id: cart.id,
      status: 'in_progress',
      checkout_mode: 'guest',
      current_step: 'shipping_address',
      shipping_full_name: null,
      shipping_address_line1: null,
      shipping_address_line2: null,
      shipping_city: null,
      shipping_state: null,
      shipping_postal_code: null,
      shipping_country: null,
      contact_email: null,
      contact_phone: null,
      shipping_method_id: null,
      created_at: now,
      updated_at: now
    };

    sessions.push(session);
    this._saveToStorage('checkout_sessions', sessions);
    return session;
  }

  _attachCheckoutSessionRelations(session) {
    if (!session) return null;
    const carts = this._getFromStorage('cart', []);
    const shippingMethods = this._getFromStorage('shipping_methods', []);
    const cart = carts.find(c => c.id === session.cart_id) || null;

    let shippingMethod = null;
    if (session.shipping_method_id) {
      shippingMethod = shippingMethods.find(sm => sm.id === session.shipping_method_id) || null;
    }

    return Object.assign({}, session, {
      cart: this._clone(cart),
      shippingMethod: this._clone(shippingMethod)
    });
  }

  // =====================
  // Recipe helpers
  // =====================

  _calculateRecipeIngredientCartLines(recipeId, servings, selectedIngredientIds, addMode) {
    const recipeIdStr = String(recipeId);
    const recipes = this._getFromStorage('recipes', []);
    const recipe = recipes.find(r => r.id === recipeIdStr) || null;
    const defaultServings = recipe && recipe.servings_default ? Number(recipe.servings_default) : 1;
    const desiredServings = Number(servings) || defaultServings || 1;
    const scaleFactor = defaultServings > 0 ? desiredServings / defaultServings : 1;

    let ingredients = this._getFromStorage('recipe_ingredients', []);
    if (!Array.isArray(ingredients)) ingredients = [];
    ingredients = ingredients.filter(ing => String(ing.recipe_id) === recipeIdStr);

    if (addMode === 'selected' && Array.isArray(selectedIngredientIds) && selectedIngredientIds.length > 0) {
      const idSet = new Set(selectedIngredientIds.map(id => String(id)));
      ingredients = ingredients.filter(ing => idSet.has(String(ing.id)));
    }

    const products = this._getFromStorage('products', []);
    const lines = [];

    // Determine a sensible fallback product so recipe ingredients
    // without a direct product mapping can still contribute to the cart.
    const availableProducts = Array.isArray(products)
      ? products.filter(p => p && p.is_available !== false)
      : [];
    // Use the cheapest available product as a generic fallback
    const fallbackProduct =
      availableProducts.length > 0
        ? availableProducts.reduce((best, p) => {
            const bestPrice = Number(best.price) || 0;
            const price = Number(p.price) || 0;
            return price < bestPrice ? p : best;
          })
        : null;

    for (const ing of ingredients) {
      let product = null;
      if (ing.product_id) {
        product = products.find(p => p.id === ing.product_id) || null;
      }
      if (!product && fallbackProduct) {
        product = fallbackProduct;
      }
      if (!product) continue;

      // Integer quantity to buy, scaled by servings vs default
      const qtyToBuy = Math.max(1, Math.round(scaleFactor));
      const unitPrice = Number(product.price) || 0;
      const lineSubtotal = Number((qtyToBuy * unitPrice).toFixed(2));

      lines.push({
        ingredient: this._clone(ing),
        product: this._clone(product),
        quantityToBuy: qtyToBuy,
        unitPrice: unitPrice,
        lineSubtotal: lineSubtotal
      });
    }

    return lines;
  }

  // =====================
  // Homepage helpers
  // =====================

  _getFeaturedEntityIds() {
    const categories = this._getFromStorage('categories', []);
    const products = this._getFromStorage('products', []);
    const recipes = this._getFromStorage('recipes', []);

    const activeCategories = categories.filter(c => c.is_active !== false);

    const featuredCategories = activeCategories.slice(0, 6).map(c => c.id);

    const productSections = [];

    const addSection = (sectionKey, title, predicate) => {
      const sectionProducts = products.filter(p => p.is_available !== false && predicate(p)).slice(0, 8);
      if (sectionProducts.length > 0) {
        productSections.push({
          section_key: sectionKey,
          title,
          productIds: sectionProducts.map(p => p.id)
        });
      }
    };

    addSection('breakfast_cereals', 'Breakfast & Cereals', p => p.category === 'breakfast_cereal');
    addSection('immune_support', 'Immune Support', p => p.is_immune_support === true || p.subcategory === 'immune_support');
    addSection('bundles', 'Value Bundles', p => p.product_type === 'bundle' || p.category === 'bundles');

    const sortedRecipes = recipes
      .slice()
      .sort((a, b) => {
        const ra = a.rating || 0;
        const rb = b.rating || 0;
        if (rb !== ra) return rb - ra;
        const rca = a.review_count || 0;
        const rcb = b.review_count || 0;
        return rcb - rca;
      });

    const featuredRecipes = sortedRecipes.slice(0, 6).map(r => r.id);

    return { featuredCategories, productSections, featuredRecipes };
  }

  // =====================
  // Interface implementations
  // =====================

  // --- getSiteConfig ---
  getSiteConfig() {
    let configs = this._getFromStorage('site_configs', []);
    if (!Array.isArray(configs)) configs = [];

    if (configs.length === 0) {
      // Create a minimal default config if none exists
      const now = this._nowISO();
      const cfg = {
        id: this._generateId('sitecfg'),
        currency: 'usd',
        free_shipping_threshold: 50,
        max_cart_value: null,
        support_email: null,
        created_at: now,
        updated_at: now
      };
      configs.push(cfg);
      this._saveToStorage('site_configs', configs);
      return this._clone(cfg);
    }

    return this._clone(configs[0]);
  }

  // --- getMainCategories ---
  getMainCategories() {
    let categories = this._getFromStorage('categories', []);
    if (!Array.isArray(categories)) categories = [];

    const mains = categories.filter(c => (!c.parent_slug || c.parent_slug === null) && c.is_active !== false);
    return this._clone(mains);
  }

  // --- getCategoryTree ---
  getCategoryTree() {
    let categories = this._getFromStorage('categories', []);
    if (!Array.isArray(categories)) categories = [];

    const parents = categories.filter(c => (!c.parent_slug || c.parent_slug === null) && c.is_active !== false);
    const result = parents.map(parent => {
      const children = categories.filter(c => c.parent_slug === parent.slug && c.is_active !== false);
      return {
        parent: this._clone(parent),
        children: this._clone(children)
      };
    });

    return result;
  }

  // --- getHomeHighlights ---
  getHomeHighlights() {
    const categories = this._getFromStorage('categories', []);
    const products = this._getFromStorage('products', []);
    const recipes = this._getFromStorage('recipes', []);

    const featuredConfig = this._getFeaturedEntityIds();

    const featuredCategories = categories.filter(c => featuredConfig.featuredCategories.includes(c.id));

    const featuredProductSections = featuredConfig.productSections.map(sec => {
      const sectionProducts = products.filter(p => sec.productIds.includes(p.id));
      return {
        section_key: sec.section_key,
        title: sec.title,
        products: this._clone(sectionProducts)
      };
    });

    const featuredRecipes = recipes.filter(r => featuredConfig.featuredRecipes.includes(r.id));

    return {
      featuredCategories: this._clone(featuredCategories),
      featuredProductSections,
      featuredRecipes: this._clone(featuredRecipes)
    };
  }

  // --- searchProducts ---
  searchProducts(query, filters, sort, page = 1, pageSize = 24) {
    const q = (query || '').toLowerCase().trim();
    const f = filters || {};

    let products = this._getFromStorage('products', []);
    if (!Array.isArray(products)) products = [];

    let results = products.filter(p => p.is_available !== false);

    if (q) {
      const normalizedQuery = q.replace(/[\s_-]+/g, '');
      results = results.filter(p => {
        const name = (p.name || '').toLowerCase();
        const desc = (p.description || '').toLowerCase();
        const inName = name.includes(q);
        const inDesc = desc.includes(q);
        const inTags =
          Array.isArray(p.tags) &&
          p.tags.some(t => {
            const tag = String(t).toLowerCase();
            const normalizedTag = tag.replace(/[\s_-]+/g, '');
            return tag.includes(q) || normalizedTag.includes(normalizedQuery);
          });
        return inName || inDesc || inTags;
      });
    }

    // Apply filters
    if (Array.isArray(f.categorySlugs) && f.categorySlugs.length > 0) {
      const set = new Set(f.categorySlugs);
      results = results.filter(p => set.has(p.category));
    }
    if (typeof f.minPrice === 'number') {
      results = results.filter(p => Number(p.price) >= f.minPrice);
    }
    if (typeof f.maxPrice === 'number') {
      results = results.filter(p => Number(p.price) <= f.maxPrice);
    }
    if (typeof f.minRating === 'number') {
      results = results.filter(p => (p.rating || 0) >= f.minRating);
    }
    if (typeof f.minReviewCount === 'number') {
      results = results.filter(p => (p.review_count || 0) >= f.minReviewCount);
    }
    if (f.isGlutenFree === true) {
      results = results.filter(p => p.is_gluten_free === true);
    }
    if (f.isVegan === true) {
      results = results.filter(p => p.is_vegan === true);
    }
    if (f.isNaturalIngredients === true) {
      results = results.filter(p => p.is_natural_ingredients === true);
    }
    if (f.isNoAddedSugar === true) {
      results = results.filter(p => p.is_no_added_sugar === true);
    }
    if (f.isImmuneSupport === true) {
      results = results.filter(p => p.is_immune_support === true);
    }
    if (f.isHealthySnack === true) {
      results = results.filter(p => p.is_healthy_snack === true);
    }
    if (typeof f.minSpf === 'number') {
      results = results.filter(p => typeof p.spf_value === 'number' && p.spf_value >= f.minSpf);
    }
    if (typeof f.flavor === 'string' && f.flavor) {
      results = results.filter(p => p.flavor === f.flavor);
    }
    if (typeof f.strengthValue === 'number') {
      results = results.filter(p => typeof p.strength_value === 'number' && p.strength_value === f.strengthValue);
    }
    if (typeof f.strengthUnit === 'string' && f.strengthUnit) {
      results = results.filter(p => p.strength_unit === f.strengthUnit);
    }

    // Sorting
    const s = sort || 'best_match';
    results = results.slice();
    if (s === 'price_low_to_high') {
      results.sort((a, b) => (a.price || 0) - (b.price || 0));
    } else if (s === 'price_high_to_low') {
      results.sort((a, b) => (b.price || 0) - (a.price || 0));
    } else if (s === 'rating_high_to_low') {
      results.sort((a, b) => {
        const ra = a.rating || 0;
        const rb = b.rating || 0;
        if (rb !== ra) return rb - ra;
        const rca = a.review_count || 0;
        const rcb = b.review_count || 0;
        return rcb - rca;
      });
    } else if (s === 'best_selling') {
      results.sort((a, b) => (b.review_count || 0) - (a.review_count || 0));
    } else {
      // best_match: prioritize rating then review_count
      results.sort((a, b) => {
        const ra = a.rating || 0;
        const rb = b.rating || 0;
        if (rb !== ra) return rb - ra;
        const rca = a.review_count || 0;
        const rcb = b.review_count || 0;
        return rcb - rca;
      });
    }

    const totalCount = results.length;
    const currentPage = Math.max(1, Number(page) || 1);
    const size = Math.max(1, Number(pageSize) || 24);
    const start = (currentPage - 1) * size;
    const paged = results.slice(start, start + size);

    return {
      products: this._clone(paged),
      totalCount,
      page: currentPage,
      pageSize: size
    };
  }

  // --- getSearchFilterOptionsForProducts ---
  getSearchFilterOptionsForProducts(query) {
    const q = (query || '').toLowerCase().trim();
    let products = this._getFromStorage('products', []);
    if (!Array.isArray(products)) products = [];
    products = products.filter(p => p.is_available !== false);

    if (q) {
      products = products.filter(p => {
        const inName = (p.name || '').toLowerCase().includes(q);
        const inDesc = (p.description || '').toLowerCase().includes(q);
        const inTags = Array.isArray(p.tags) && p.tags.some(t => String(t).toLowerCase().includes(q));
        return inName || inDesc || inTags;
      });
    }

    const categoriesTable = this._getFromStorage('categories', []);

    const categorySlugSet = new Set(products.map(p => p.category));
    const categories = categoriesTable.filter(c => categorySlugSet.has(c.slug));

    let minPrice = null;
    let maxPrice = null;
    let availableFlavors = new Set();
    let availableSpfValues = new Set();

    for (const p of products) {
      const price = Number(p.price) || 0;
      if (minPrice === null || price < minPrice) minPrice = price;
      if (maxPrice === null || price > maxPrice) maxPrice = price;

      if (p.flavor && p.flavor !== 'none') {
        availableFlavors.add(p.flavor);
      }
      if (typeof p.spf_value === 'number') {
        availableSpfValues.add(p.spf_value);
      }
    }

    const ratingThresholds = [4.5, 4, 3, 0];
    const ratingBuckets = ratingThresholds.map(th => ({
      minRating: th,
      count: products.filter(p => (p.rating || 0) >= th).length
    })).filter(b => b.count > 0);

    const reviewThresholds = [100, 50, 10, 1];
    const reviewCountBuckets = reviewThresholds.map(th => ({
      minReviewCount: th,
      count: products.filter(p => (p.review_count || 0) >= th).length
    })).filter(b => b.count > 0);

    const dietaryFlags = {
      hasGlutenFree: products.some(p => p.is_gluten_free === true),
      hasVegan: products.some(p => p.is_vegan === true),
      hasNaturalIngredients: products.some(p => p.is_natural_ingredients === true),
      hasNoAddedSugar: products.some(p => p.is_no_added_sugar === true)
    };

    return {
      categories: this._clone(categories),
      priceRange: {
        min: minPrice,
        max: maxPrice
      },
      ratingBuckets,
      reviewCountBuckets,
      dietaryFlags,
      availableFlavors: Array.from(availableFlavors),
      availableSpfValues: Array.from(availableSpfValues)
    };
  }

  // --- searchRecipes ---
  searchRecipes(query, filters, sort, page = 1, pageSize = 24) {
    const q = (query || '').toLowerCase().trim();
    const f = filters || {};

    let recipes = this._getFromStorage('recipes', []);
    if (!Array.isArray(recipes)) recipes = [];

    let results = recipes;

    if (q) {
      results = results.filter(r => {
        const inTitle = (r.title || '').toLowerCase().includes(q);
        const inDesc = (r.description || '').toLowerCase().includes(q);
        return inTitle || inDesc;
      });
    }

    if (typeof f.mealType === 'string' && f.mealType) {
      results = results.filter(r => r.meal_type === f.mealType);
    }
    if (f.isVegan === true) {
      results = results.filter(r => r.is_vegan === true);
    }
    if (f.isGlutenFree === true) {
      results = results.filter(r => r.is_gluten_free === true);
    }
    if (typeof f.maxCaloriesPerServing === 'number') {
      results = results.filter(r => (r.calories_per_serving || 0) <= f.maxCaloriesPerServing);
    }
    if (f.isGreenSmoothie === true) {
      results = results.filter(r => r.is_green_smoothie === true);
    }

    const s = sort || 'best_match';
    results = results.slice();
    if (s === 'rating_high_to_low') {
      results.sort((a, b) => {
        const ra = a.rating || 0;
        const rb = b.rating || 0;
        if (rb !== ra) return rb - ra;
        const rca = a.review_count || 0;
        const rcb = b.review_count || 0;
        return rcb - rca;
      });
    } else {
      // best_match
      results.sort((a, b) => {
        const ra = a.rating || 0;
        const rb = b.rating || 0;
        if (rb !== ra) return rb - ra;
        const rca = a.review_count || 0;
        const rcb = b.review_count || 0;
        return rcb - rca;
      });
    }

    const totalCount = results.length;
    const currentPage = Math.max(1, Number(page) || 1);
    const size = Math.max(1, Number(pageSize) || 24);
    const start = (currentPage - 1) * size;
    const paged = results.slice(start, start + size);

    return {
      recipes: this._clone(paged),
      totalCount,
      page: currentPage,
      pageSize: size
    };
  }

  // --- getCategoryOverview ---
  getCategoryOverview(categorySlug) {
    const slug = categorySlug;
    let categories = this._getFromStorage('categories', []);
    if (!Array.isArray(categories)) categories = [];

    const category = categories.find(c => c.slug === slug) || null;
    const subcategories = categories.filter(c => c.parent_slug === slug);

    return {
      category: this._clone(category),
      subcategories: this._clone(subcategories)
    };
  }

  // --- getCategoryFilterOptions ---
  getCategoryFilterOptions(categorySlug, subcategory) {
    const slug = categorySlug;
    const sub = subcategory || null;

    let products = this._getFromStorage('products', []);
    if (!Array.isArray(products)) products = [];

    products = products.filter(p => p.category === slug && p.is_available !== false);
    if (sub) {
      products = products.filter(p => p.subcategory === sub);
    }

    let minPrice = null;
    let maxPrice = null;
    let minSpf = null;
    let maxSpf = null;
    let minProtein = null;
    let maxProtein = null;
    let minSugar = null;
    let maxSugar = null;

    const availableFlavors = new Set();

    for (const p of products) {
      const price = Number(p.price) || 0;
      if (minPrice === null || price < minPrice) minPrice = price;
      if (maxPrice === null || price > maxPrice) maxPrice = price;

      if (typeof p.spf_value === 'number') {
        if (minSpf === null || p.spf_value < minSpf) minSpf = p.spf_value;
        if (maxSpf === null || p.spf_value > maxSpf) maxSpf = p.spf_value;
      }

      if (typeof p.protein_per_serving_grams === 'number') {
        if (minProtein === null || p.protein_per_serving_grams < minProtein) minProtein = p.protein_per_serving_grams;
        if (maxProtein === null || p.protein_per_serving_grams > maxProtein) maxProtein = p.protein_per_serving_grams;
      }

      if (typeof p.sugar_added_grams === 'number') {
        if (minSugar === null || p.sugar_added_grams < minSugar) minSugar = p.sugar_added_grams;
        if (maxSugar === null || p.sugar_added_grams > maxSugar) maxSugar = p.sugar_added_grams;
      }

      if (p.flavor && p.flavor !== 'none') {
        availableFlavors.add(p.flavor);
      }
    }

    const ratingThresholds = [4.5, 4, 3, 0];
    const ratingBuckets = ratingThresholds.map(th => ({
      minRating: th,
      count: products.filter(p => (p.rating || 0) >= th).length
    })).filter(b => b.count > 0);

    const reviewThresholds = [100, 50, 10, 1];
    const reviewCountBuckets = reviewThresholds.map(th => ({
      minReviewCount: th,
      count: products.filter(p => (p.review_count || 0) >= th).length
    })).filter(b => b.count > 0);

    const dietaryFiltersAvailable = {
      hasGlutenFree: products.some(p => p.is_gluten_free === true),
      hasVegan: products.some(p => p.is_vegan === true),
      hasOrganic: products.some(p => p.is_organic === true),
      hasNaturalIngredients: products.some(p => p.is_natural_ingredients === true),
      hasNoAddedSugar: products.some(p => p.is_no_added_sugar === true)
    };

    return {
      priceRange: {
        min: minPrice,
        max: maxPrice
      },
      ratingBuckets,
      reviewCountBuckets,
      dietaryFiltersAvailable,
      availableFlavors: Array.from(availableFlavors),
      spfRange: {
        min: minSpf,
        max: maxSpf
      },
      proteinPerServingRange: {
        min: minProtein,
        max: maxProtein
      },
      sugarAddedPerServingRange: {
        min: minSugar,
        max: maxSugar
      }
    };
  }

  // --- getCategoryProducts ---
  getCategoryProducts(categorySlug, subcategory, filters, sort, page = 1, pageSize = 24) {
    const slug = categorySlug;
    const sub = subcategory || null;
    const f = filters || {};

    let products = this._getFromStorage('products', []);
    if (!Array.isArray(products)) products = [];

    let results = products.filter(p => p.category === slug && p.is_available !== false);
    if (sub) {
      results = results.filter(p => p.subcategory === sub);
    }

    if (typeof f.minPrice === 'number') {
      results = results.filter(p => Number(p.price) >= f.minPrice);
    }
    if (typeof f.maxPrice === 'number') {
      results = results.filter(p => Number(p.price) <= f.maxPrice);
    }
    if (typeof f.minRating === 'number') {
      results = results.filter(p => (p.rating || 0) >= f.minRating);
    }
    if (typeof f.minReviewCount === 'number') {
      results = results.filter(p => (p.review_count || 0) >= f.minReviewCount);
    }
    if (f.isGlutenFree === true) {
      results = results.filter(p => p.is_gluten_free === true);
    }
    if (f.isVegan === true) {
      results = results.filter(p => p.is_vegan === true);
    }
    if (f.isNaturalIngredients === true) {
      results = results.filter(p => p.is_natural_ingredients === true);
    }
    if (f.isNoAddedSugar === true) {
      results = results.filter(p => p.is_no_added_sugar === true);
    }
    if (f.isHealthySnack === true) {
      results = results.filter(p => p.is_healthy_snack === true);
    }
    if (f.isImmuneSupport === true) {
      results = results.filter(p => p.is_immune_support === true);
    }
    if (typeof f.minSpf === 'number') {
      results = results.filter(p => typeof p.spf_value === 'number' && p.spf_value >= f.minSpf);
    }
    if (typeof f.minProteinPerServing === 'number') {
      results = results.filter(p => (p.protein_per_serving_grams || 0) >= f.minProteinPerServing);
    }
    if (typeof f.maxSugarAddedPerServing === 'number') {
      results = results.filter(p => (p.sugar_added_grams || 0) <= f.maxSugarAddedPerServing);
    }
    if (typeof f.flavor === 'string' && f.flavor) {
      results = results.filter(p => p.flavor === f.flavor);
    }
    if (typeof f.productType === 'string' && f.productType) {
      results = results.filter(p => p.product_type === f.productType);
    }

    const s = sort || 'price_low_to_high';
    results = results.slice();

    if (s === 'price_high_to_low') {
      results.sort((a, b) => (b.price || 0) - (a.price || 0));
    } else if (s === 'best_selling') {
      results.sort((a, b) => (b.review_count || 0) - (a.review_count || 0));
    } else if (s === 'rating_high_to_low') {
      results.sort((a, b) => {
        const ra = a.rating || 0;
        const rb = b.rating || 0;
        if (rb !== ra) return rb - ra;
        const rca = a.review_count || 0;
        const rcb = b.review_count || 0;
        return rcb - rca;
      });
    } else {
      // price_low_to_high default
      results.sort((a, b) => (a.price || 0) - (b.price || 0));
    }

    const totalCount = results.length;
    const currentPage = Math.max(1, Number(page) || 1);
    const size = Math.max(1, Number(pageSize) || 24);
    const start = (currentPage - 1) * size;
    const paged = results.slice(start, start + size);

    return {
      products: this._clone(paged),
      totalCount,
      page: currentPage,
      pageSize: size
    };
  }

  // --- getProductDetails ---
  getProductDetails(productId) {
    const products = this._getFromStorage('products', []);
    const categories = this._getFromStorage('categories', []);
    const bundleItems = this._getFromStorage('bundle_items', []);

    const product = products.find(p => p.id === productId) || null;
    if (!product) {
      return {
        product: null,
        category: null,
        dietaryLabels: [],
        nutritionFacts: null,
        variantOptions: [],
        bundleContents: [],
        bundleSavingsPercent: null
      };
    }

    const category = categories.find(c => c.slug === product.category) || null;

    const dietaryLabels = [];
    if (product.is_gluten_free) dietaryLabels.push('Gluten-Free');
    if (product.is_vegan) dietaryLabels.push('Vegan');
    if (product.is_organic) dietaryLabels.push('Organic');
    if (product.is_natural_ingredients) dietaryLabels.push('Natural Ingredients');
    if (product.is_no_added_sugar) dietaryLabels.push('No Added Sugar');

    const nutritionFacts = {
      caloriesPerServing: null,
      proteinPerServingGrams: product.protein_per_serving_grams || null,
      sugarAddedGrams: product.sugar_added_grams || null
    };

    const variantOptions = products.filter(p => p.slug === product.slug && p.id !== product.id);

    let bundleContents = [];
    let bundleSavingsPercent = product.bundle_savings_percent || null;

    if (product.product_type === 'bundle') {
      const relatedBundleItems = bundleItems.filter(bi => bi.bundle_product_id === product.id);
      bundleContents = relatedBundleItems.map(bi => {
        const includedProduct = products.find(p => p.id === bi.included_product_id) || null;
        const bundleItem = this._clone(bi);
        // foreign key resolution for bundle_item
        const resolved = Object.assign({}, bundleItem, {
          bundle_product: this._clone(product),
          included_product: this._clone(includedProduct)
        });
        return {
          bundleItem: resolved,
          product: this._clone(includedProduct)
        };
      });

      // If savings not provided, estimate based on included products
      if (bundleSavingsPercent == null && bundleContents.length > 0) {
        let sum = 0;
        for (const bc of bundleContents) {
          if (bc.product) {
            const price = Number(bc.product.price) || 0;
            sum += price * (bc.bundleItem.quantity || 1);
          }
        }
        const bundlePrice = Number(product.price) || 0;
        if (sum > 0) {
          const savings = (sum - bundlePrice) / sum * 100;
          bundleSavingsPercent = Number(savings.toFixed(2));
        }
      }
    }

    return {
      product: this._clone(product),
      category: this._clone(category),
      dietaryLabels,
      nutritionFacts,
      variantOptions: this._clone(variantOptions),
      bundleContents,
      bundleSavingsPercent
    };
  }

  // --- addToCart ---
  addToCart(productId, quantity = 1) {
    return this._addProductToCartWithSource(productId, quantity, null, 'manual_product', null);
  }

  // --- getCartSummary ---
  getCartSummary() {
    const cart = this._getOrCreateCart();
    const siteConfig = this.getSiteConfig();
    const threshold = siteConfig.free_shipping_threshold || 0;
    const amountUntil = Math.max(0, Number((threshold - cart.subtotal).toFixed(2)));
    const hasReached = cart.subtotal >= threshold && threshold > 0;

    return {
      cart: this._clone(cart),
      freeShippingThreshold: threshold,
      amountUntilFreeShipping: hasReached ? 0 : amountUntil,
      hasReachedFreeShipping: hasReached
    };
  }

  // --- getCartItemsDetailed ---
  getCartItemsDetailed() {
    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items', []);
    if (!Array.isArray(cartItems)) cartItems = [];
    const products = this._getFromStorage('products', []);
    const recipes = this._getFromStorage('recipes', []);

    const itemsForCart = cartItems.filter(ci => ci.cart_id === cart.id);

    const items = itemsForCart.map(ci => {
      const product = products.find(p => p.id === ci.product_id) || null;
      let sourceLabel = 'Added item';
      if (ci.source_type === 'manual_product') {
        sourceLabel = 'Added from product page';
      } else if (ci.source_type === 'bundle') {
        sourceLabel = 'Bundle item';
      } else if (ci.source_type === 'recipe_ingredients') {
        const recipe = recipes.find(r => String(r.id) === String(ci.source_reference));
        if (recipe) {
          sourceLabel = 'Ingredients for ' + (recipe.title || 'recipe');
        } else {
          sourceLabel = 'Ingredients for recipe';
        }
      }

      const cartItem = this._clone(ci);
      // foreign key resolution on cartItem
      const resolvedCartItem = Object.assign({}, cartItem, {
        cart: this._clone(cart),
        product: this._clone(product)
      });

      return {
        cartItem: resolvedCartItem,
        product: this._clone(product),
        sourceLabel
      };
    });

    return {
      cart: this._clone(cart),
      items
    };
  }

  // --- updateCartItemQuantity ---
  updateCartItemQuantity(cartItemId, quantity) {
    let cartItems = this._getFromStorage('cart_items', []);
    if (!Array.isArray(cartItems)) cartItems = [];

    const idx = cartItems.findIndex(ci => ci.id === cartItemId);
    if (idx === -1) {
      return { success: false, cart: null, updatedItem: null };
    }

    const cartItem = cartItems[idx];
    const cartId = cartItem.cart_id;

    const qty = Number(quantity) || 0;
    if (qty <= 0) {
      // remove item
      cartItems.splice(idx, 1);
      this._saveToStorage('cart_items', cartItems);
      const cart = this._recalculateCartTotals(cartId);
      return {
        success: true,
        cart: this._clone(cart),
        updatedItem: null
      };
    }

    cartItem.quantity = qty;
    cartItem.line_subtotal = Number((qty * (cartItem.unit_price || 0)).toFixed(2));
    cartItems[idx] = cartItem;
    this._saveToStorage('cart_items', cartItems);

    const cart = this._recalculateCartTotals(cartId);
    const products = this._getFromStorage('products', []);
    const product = products.find(p => p.id === cartItem.product_id) || null;

    const updatedCartItem = this._clone(cartItem);
    const resolvedCartItem = Object.assign({}, updatedCartItem, {
      cart: this._clone(cart),
      product: this._clone(product)
    });

    return {
      success: true,
      cart: this._clone(cart),
      updatedItem: {
        cartItem: resolvedCartItem,
        product: this._clone(product)
      }
    };
  }

  // --- removeCartItem ---
  removeCartItem(cartItemId) {
    let cartItems = this._getFromStorage('cart_items', []);
    if (!Array.isArray(cartItems)) cartItems = [];

    const idx = cartItems.findIndex(ci => ci.id === cartItemId);
    if (idx === -1) {
      const cart = this._getOrCreateCart();
      return { success: false, cart: this._clone(cart) };
    }

    const cartItem = cartItems[idx];
    const cartId = cartItem.cart_id;
    const currentQty = Number(cartItem.quantity) || 0;

    if (currentQty > 1) {
      cartItem.quantity = currentQty - 1;
      cartItem.line_subtotal = Number((cartItem.quantity * (cartItem.unit_price || 0)).toFixed(2));
      cartItems[idx] = cartItem;
    } else {
      cartItems.splice(idx, 1);
    }

    this._saveToStorage('cart_items', cartItems);
    const cart = this._recalculateCartTotals(cartId);

    return {
      success: true,
      cart: this._clone(cart)
    };
  }

  // --- clearCart ---
  clearCart() {
    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items', []);
    if (!Array.isArray(cartItems)) cartItems = [];

    cartItems = cartItems.filter(ci => ci.cart_id !== cart.id);
    this._saveToStorage('cart_items', cartItems);

    cart.subtotal = 0;
    cart.item_count = 0;
    cart.updated_at = this._nowISO();

    let carts = this._getFromStorage('cart', []);
    if (!Array.isArray(carts)) carts = [];
    const idx = carts.findIndex(c => c.id === cart.id);
    if (idx !== -1) {
      carts[idx] = cart;
      this._saveToStorage('cart', carts);
    }

    return {
      success: true,
      cart: this._clone(cart)
    };
  }

  // --- getRecipeFilterOptions ---
  getRecipeFilterOptions() {
    let recipes = this._getFromStorage('recipes', []);
    if (!Array.isArray(recipes)) recipes = [];

    const mealTypesSet = new Set(recipes.map(r => r.meal_type).filter(Boolean));

    let minCalories = null;
    let maxCalories = null;
    for (const r of recipes) {
      const cal = Number(r.calories_per_serving) || 0;
      if (minCalories === null || cal < minCalories) minCalories = cal;
      if (maxCalories === null || cal > maxCalories) maxCalories = cal;
    }

    const ratingThresholds = [4.5, 4, 3, 0];
    const ratingBuckets = ratingThresholds.map(th => ({
      minRating: th,
      count: recipes.filter(r => (r.rating || 0) >= th).length
    })).filter(b => b.count > 0);

    const dietaryOptions = {
      hasVegan: recipes.some(r => r.is_vegan === true),
      hasGlutenFree: recipes.some(r => r.is_gluten_free === true)
    };

    return {
      mealTypes: Array.from(mealTypesSet),
      dietaryOptions,
      caloriesPerServingRange: {
        min: minCalories,
        max: maxCalories
      },
      ratingBuckets
    };
  }

  // --- getRecipes ---
  getRecipes(filters, sort, page = 1, pageSize = 24) {
    const f = filters || {};

    let recipes = this._getFromStorage('recipes', []);
    if (!Array.isArray(recipes)) recipes = [];

    let results = recipes;

    if (typeof f.mealType === 'string' && f.mealType) {
      results = results.filter(r => r.meal_type === f.mealType);
    }
    if (f.isVegan === true) {
      results = results.filter(r => r.is_vegan === true);
    }
    if (f.isGlutenFree === true) {
      results = results.filter(r => r.is_gluten_free === true);
    }
    if (typeof f.maxCaloriesPerServing === 'number') {
      results = results.filter(r => (r.calories_per_serving || 0) <= f.maxCaloriesPerServing);
    }

    const s = sort || 'best_match';
    results = results.slice();
    if (s === 'rating_high_to_low') {
      results.sort((a, b) => {
        const ra = a.rating || 0;
        const rb = b.rating || 0;
        if (rb !== ra) return rb - ra;
        const rca = a.review_count || 0;
        const rcb = b.review_count || 0;
        return rcb - rca;
      });
    } else {
      results.sort((a, b) => {
        const ra = a.rating || 0;
        const rb = b.rating || 0;
        if (rb !== ra) return rb - ra;
        const rca = a.review_count || 0;
        const rcb = b.review_count || 0;
        return rcb - rca;
      });
    }

    const totalCount = results.length;
    const currentPage = Math.max(1, Number(page) || 1);
    const size = Math.max(1, Number(pageSize) || 24);
    const start = (currentPage - 1) * size;
    const paged = results.slice(start, start + size);

    return {
      recipes: this._clone(paged),
      totalCount,
      page: currentPage,
      pageSize: size
    };
  }

  // --- getRecipeDetails ---
  getRecipeDetails(recipeId) {
    const recipes = this._getFromStorage('recipes', []);
    const recipe = recipes.find(r => r.id === recipeId) || null;

    let ingredientsTable = this._getFromStorage('recipe_ingredients', []);
    if (!Array.isArray(ingredientsTable)) ingredientsTable = [];
    const products = this._getFromStorage('products', []);
    let stepsTable = this._getFromStorage('recipe_steps', []);
    if (!Array.isArray(stepsTable)) stepsTable = [];

    const ingredients = ingredientsTable
      .filter(ing => String(ing.recipe_id) === String(recipeId))
      .map(ing => {
        const product = products.find(p => p.id === ing.product_id) || null;
        return {
          ingredient: this._clone(ing),
          product: this._clone(product)
        };
      });

    const steps = stepsTable
      .filter(st => String(st.recipe_id) === String(recipeId))
      .sort((a, b) => (a.step_number || 0) - (b.step_number || 0));

    const nutritionPerServing = {
      calories: recipe ? recipe.calories_per_serving || 0 : 0
    };

    return {
      recipe: this._clone(recipe),
      ingredients,
      steps: this._clone(steps),
      nutritionPerServing
    };
  }

  // --- estimateRecipeIngredientsCost ---
  estimateRecipeIngredientsCost(recipeId, servings, selectedIngredientIds) {
    const addMode = Array.isArray(selectedIngredientIds) && selectedIngredientIds.length > 0 ? 'selected' : 'all';
    const lines = this._calculateRecipeIngredientCartLines(recipeId, servings, selectedIngredientIds, addMode);

    const estimatedTotal = lines.reduce((sum, l) => sum + (l.lineSubtotal || 0), 0);

    const recipes = this._getFromStorage('recipes', []);
    const recipe = recipes.find(r => r.id === recipeId) || null;

    const cart = this._getOrCreateCart();

    return {
      recipeId: String(recipeId),
      servings: Number(servings) || (recipe ? recipe.servings_default || 1 : 1),
      estimatedTotal: Number(estimatedTotal.toFixed(2)),
      currency: cart.currency || 'usd',
      lines
    };
  }

  // --- addRecipeIngredientsToCart ---
  addRecipeIngredientsToCart(recipeId, servings, selectedIngredientIds, addMode) {
    const mode = addMode || 'all';
    const lines = this._calculateRecipeIngredientCartLines(recipeId, servings, selectedIngredientIds, mode);

    const addedItems = [];
    let addedSubtotal = 0;
    let lastCart = null;

    for (const line of lines) {
      const res = this._addProductToCartWithSource(
        line.product.id,
        line.quantityToBuy,
        line.unitPrice,
        'recipe_ingredients',
        String(recipeId)
      );
      if (res.success) {
        lastCart = res.cart;
        addedSubtotal += line.lineSubtotal || 0;
        addedItems.push({
          cartItem: this._clone(res.cartItem.cartItem),
          product: this._clone(line.product),
          ingredient: this._clone(line.ingredient)
        });
      }
    }

    // Instrumentation for task completion tracking
    try {
      if (addedItems.length > 0) {
        const existingRaw = localStorage.getItem('task2_recipeIngredientsAdds');
        let actions = [];
        if (existingRaw) {
          try { actions = JSON.parse(existingRaw) || []; } catch (e) { actions = []; }
        }

        const recipes = this._getFromStorage('recipes', []);
        const recipe = recipes.find(r => r.id === String(recipeId)) || null;
        const effectiveServings = Number(servings) || (recipe ? recipe.servings_default || 1 : 1);

        actions.push({
          recipeId: String(recipeId),
          servings: effectiveServings,
          addMode: mode,              // 'all' or 'selected'
          addedSubtotal: Number(addedSubtotal.toFixed(2)),
          timestamp: this._nowISO()
        });

        localStorage.setItem('task2_recipeIngredientsAdds', JSON.stringify(actions));
      }
    } catch (e) {
      // Swallow instrumentation errors to avoid impacting core functionality
    }

    return {
      success: addedItems.length > 0,
      message: addedItems.length > 0 ? 'Ingredients added to cart' : 'No ingredients added',
      cart: this._clone(lastCart || this._getOrCreateCart()),
      addedItems,
      addedSubtotal: Number(addedSubtotal.toFixed(2))
    };
  }

  // --- startGuestCheckout ---
  startGuestCheckout() {
    let session = this._getCurrentCheckoutSessionOrNull();
    if (!session) {
      session = this._createCheckoutSession();
    }
    return this._attachCheckoutSessionRelations(session);
  }

  // --- getCheckoutSession ---
  getCheckoutSession() {
    const session = this._getCurrentCheckoutSessionOrNull();
    return this._attachCheckoutSessionRelations(session);
  }

  // --- updateCheckoutShippingAddress ---
  updateCheckoutShippingAddress(
    shippingFullName,
    shippingAddressLine1,
    shippingAddressLine2,
    shippingCity,
    shippingState,
    shippingPostalCode,
    shippingCountry,
    contactEmail,
    contactPhone
  ) {
    let session = this._getCurrentCheckoutSessionOrNull();
    if (!session) {
      session = this._createCheckoutSession();
    }

    let sessions = this._getFromStorage('checkout_sessions', []);
    if (!Array.isArray(sessions)) sessions = [];
    const idx = sessions.findIndex(s => s.id === session.id);
    if (idx === -1) {
      return null;
    }

    const now = this._nowISO();
    sessions[idx].shipping_full_name = shippingFullName;
    sessions[idx].shipping_address_line1 = shippingAddressLine1;
    sessions[idx].shipping_address_line2 = shippingAddressLine2 || null;
    sessions[idx].shipping_city = shippingCity;
    sessions[idx].shipping_state = shippingState || null;
    sessions[idx].shipping_postal_code = shippingPostalCode;
    sessions[idx].shipping_country = shippingCountry;
    sessions[idx].contact_email = contactEmail;
    sessions[idx].contact_phone = contactPhone || null;
    sessions[idx].updated_at = now;

    this._saveToStorage('checkout_sessions', sessions);

    return this._attachCheckoutSessionRelations(sessions[idx]);
  }

  // --- getAvailableShippingMethods ---
  getAvailableShippingMethods() {
    let methods = this._getFromStorage('shipping_methods', []);
    if (!Array.isArray(methods)) methods = [];
    return this._clone(methods);
  }

  // --- selectShippingMethod ---
  selectShippingMethod(shippingMethodId) {
    let session = this._getCurrentCheckoutSessionOrNull();
    if (!session) {
      session = this._createCheckoutSession();
    }

    const methods = this._getFromStorage('shipping_methods', []);
    const method = methods.find(m => m.id === shippingMethodId) || null;

    let sessions = this._getFromStorage('checkout_sessions', []);
    if (!Array.isArray(sessions)) sessions = [];
    const idx = sessions.findIndex(s => s.id === session.id);
    if (idx === -1) {
      return null;
    }

    sessions[idx].shipping_method_id = method ? method.id : null;
    sessions[idx].updated_at = this._nowISO();
    this._saveToStorage('checkout_sessions', sessions);

    return this._attachCheckoutSessionRelations(sessions[idx]);
  }

  // --- advanceCheckoutStep ---
  advanceCheckoutStep() {
    let session = this._getCurrentCheckoutSessionOrNull();
    if (!session) {
      session = this._createCheckoutSession();
    }

    let sessions = this._getFromStorage('checkout_sessions', []);
    if (!Array.isArray(sessions)) sessions = [];
    const idx = sessions.findIndex(s => s.id === session.id);
    if (idx === -1) {
      return null;
    }

    const current = sessions[idx].current_step;
    let next = current;
    if (current === 'shipping_address') {
      next = 'shipping_method';
    } else if (current === 'shipping_method') {
      next = 'payment';
    } else {
      next = 'payment';
    }

    sessions[idx].current_step = next;
    sessions[idx].updated_at = this._nowISO();
    this._saveToStorage('checkout_sessions', sessions);

    return this._attachCheckoutSessionRelations(sessions[idx]);
  }

  // --- getCheckoutSummary ---
  getCheckoutSummary() {
    const rawSession = this._getCurrentCheckoutSessionOrNull();
    const session = this._attachCheckoutSessionRelations(rawSession);
    const cart = session && session.cart ? session.cart : this._getOrCreateCart();

    let cartItems = this._getFromStorage('cart_items', []);
    if (!Array.isArray(cartItems)) cartItems = [];
    const products = this._getFromStorage('products', []);

    const itemsForCart = cartItems.filter(ci => ci.cart_id === cart.id);
    const items = itemsForCart.map(ci => {
      const product = products.find(p => p.id === ci.product_id) || null;
      const cartItem = this._clone(ci);
      const resolvedCartItem = Object.assign({}, cartItem, {
        cart: this._clone(cart),
        product: this._clone(product)
      });
      return {
        cartItem: resolvedCartItem,
        product: this._clone(product)
      };
    });

    const shippingMethod = session ? session.shippingMethod : null;
    const shippingCost = shippingMethod ? Number(shippingMethod.price) || 0 : 0;
    const total = Number(((cart.subtotal || 0) + shippingCost).toFixed(2));

    return {
      checkoutSession: session,
      cart: this._clone(cart),
      items,
      shippingMethod: this._clone(shippingMethod),
      shippingCost,
      total,
      currency: cart.currency || 'usd'
    };
  }

  // --- getStaticPageContent ---
  getStaticPageContent(pageSlug) {
    const slug = pageSlug;
    let pages = this._getFromStorage('static_pages', []);
    if (!Array.isArray(pages)) pages = [];

    let page = pages.find(p => p.pageSlug === slug) || null;

    if (!page) {
      // create minimal placeholder
      page = {
        pageSlug: slug,
        title: slug,
        sections: []
      };
      pages.push(page);
      this._saveToStorage('static_pages', pages);
    }

    return this._clone(page);
  }

  // --- getFaqEntries ---
  getFaqEntries() {
    let faqs = this._getFromStorage('faq_entries', []);
    if (!Array.isArray(faqs)) faqs = [];
    return this._clone(faqs);
  }

  // --- submitContactRequest ---
  submitContactRequest(name, email, subject, message, topic) {
    let requests = this._getFromStorage('contact_requests', []);
    if (!Array.isArray(requests)) requests = [];

    const now = this._nowISO();
    const req = {
      id: this._generateId('contact'),
      name,
      email,
      subject,
      message,
      topic: topic || null,
      created_at: now
    };

    requests.push(req);
    this._saveToStorage('contact_requests', requests);

    return {
      success: true,
      message: 'Contact request submitted.'
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