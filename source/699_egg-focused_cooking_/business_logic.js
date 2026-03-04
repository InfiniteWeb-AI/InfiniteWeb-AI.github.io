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

  _initStorage() {
    // Core entity tables
    const keysWithEmptyArray = [
      'users', // not used but kept from template
      'recipes',
      'ingredients',
      'recipe_ingredients',
      'recipe_steps',
      'recipe_timers',
      'favorite_recipes',
      'meal_plan_entries',
      'pantry_items',
      'shopping_lists',
      'shopping_list_items',
      'product_categories',
      'products',
      'carts',
      'cart_items',
      'cartItems', // legacy from template, not used in new logic
      'reviews',
      'contact_messages'
    ];

    keysWithEmptyArray.forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    });

    // Static content tables (About, Help, Legal)
    if (!localStorage.getItem('about_content')) {
      const about = {
        title: 'About Our Egg-Centric Kitchen',
        sections: [
          {
            heading: 'Our Mission',
            body: 'We focus on egg-based recipes that are well-tested, approachable, and delicious, from breakfast to dessert.'
          },
          {
            heading: 'Curation',
            body: 'Recipes are curated based on rating, reliability, and clarity of instructions. Filters help you find exactly what you need.'
          }
        ]
      };
      localStorage.setItem('about_content', JSON.stringify(about));
    }

    if (!localStorage.getItem('help_faqs')) {
      const faqs = [
        {
          category: 'recipe_search',
          question: 'How do I find quick egg breakfasts?',
          answer: 'Use the Recipes page filters to select Breakfast and set a maximum total time.'
        },
        {
          category: 'pantry_and_shopping_list',
          question: 'How do pantry items affect shopping lists?',
          answer: 'Items marked as In pantry (like salt or olive oil) are automatically excluded from new shopping lists when you choose to exclude pantry items.'
        },
        {
          category: 'meal_planner',
          question: 'How do I schedule recipes in the meal planner?',
          answer: 'Open a recipe and click Add to Meal Planner, then choose a date and meal slot.'
        },
        {
          category: 'favorites_and_reviews',
          question: 'Can I bookmark recipes and leave reviews?',
          answer: 'Yes, use Save to Favorites on any recipe, and scroll to the reviews section to submit a rating and comment.'
        },
        {
          category: 'timers',
          question: 'How do cooking timers work?',
          answer: 'On steps that support timers, click the Start timer button to track stovetop and oven times while cooking.'
        }
      ];
      localStorage.setItem('help_faqs', JSON.stringify(faqs));
    }

    if (!localStorage.getItem('legal_pages')) {
      const now = new Date().toISOString();
      const legal = {
        privacy_policy: {
          title: 'Privacy Policy',
          body: 'This is a sample privacy policy. In a real deployment, replace this text with your actual policy.',
          lastUpdated: now
        },
        terms_of_use: {
          title: 'Terms of Use',
          body: 'These are sample terms of use. In a real deployment, replace this text with your actual terms.',
          lastUpdated: now
        }
      };
      localStorage.setItem('legal_pages', JSON.stringify(legal));
    }

    if (!localStorage.getItem('idCounter')) {
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
    localStorage.setItem('idCounter', next.toString());
    return next;
  }

  _generateId(prefix) {
    return prefix + '_' + this._getNextIdCounter();
  }

  // ---------- Internal helpers ----------

  _getOrCreateShoppingList() {
    const shoppingLists = this._getFromStorage('shopping_lists');
    const shoppingListItems = this._getFromStorage('shopping_list_items');
    let active = shoppingLists.find((l) => l.status === 'active');

    if (!active) {
      active = {
        id: this._generateId('shopping_list'),
        title: 'Active Shopping List',
        status: 'active',
        notes: '',
        createdAt: new Date().toISOString(),
        updatedAt: null
      };
      shoppingLists.push(active);
      this._saveToStorage('shopping_lists', shoppingLists);
    }

    const items = shoppingListItems.filter((it) => it.shoppingListId === active.id);
    return { shoppingList: active, items };
  }

  _getOrCreateCart() {
    const carts = this._getFromStorage('carts');
    const cartItems = this._getFromStorage('cart_items');
    let cart = carts.find((c) => c.status === 'active');

    if (!cart) {
      cart = {
        id: this._generateId('cart'),
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: null
      };
      carts.push(cart);
      this._saveToStorage('carts', carts);
    }

    const items = cartItems.filter((ci) => ci.cartId === cart.id);
    return { cart, items };
  }

  _applyRecipeScaling(recipe, targetServings, quantity) {
    const baseServings = recipe && recipe.defaultServings ? recipe.defaultServings : 1;
    const target = targetServings && targetServings > 0 ? targetServings : baseServings;
    const factor = target / baseServings;
    if (typeof quantity === 'number') {
      const scaled = quantity * factor;
      // round to 2 decimal places for display/persistence
      return Math.round((scaled + Number.EPSILON) * 100) / 100;
    }
    return factor;
  }

  _filterOutPantryItems(ingredientEntries) {
    // ingredientEntries: [{ recipeIngredient, ingredient }]
    const pantryItems = this._getFromStorage('pantry_items');
    const inPantryByIngredientId = new Set(
      pantryItems
        .filter((pi) => pi.isInPantry && pi.ingredientId)
        .map((pi) => pi.ingredientId)
    );
    const inPantryByName = new Set(
      pantryItems
        .filter((pi) => pi.isInPantry && !pi.ingredientId && pi.name)
        .map((pi) => pi.name.toLowerCase())
    );

    const kept = [];
    const excluded = [];

    ingredientEntries.forEach((entry) => {
      const ing = entry.ingredient || {};
      const ingId = ing.id;
      const name = (ing.name || '').toLowerCase();
      if (inPantryByIngredientId.has(ingId) || (name && inPantryByName.has(name))) {
        excluded.push(entry);
      } else {
        kept.push(entry);
      }
    });

    return { kept, excluded };
  }

  _computeMealPlanNutritionSummary(entries, recipes) {
    // Returns [{ date: 'YYYY-MM-DD', totalCalories, totalSugarGrams }]
    const byDate = {};
    entries.forEach((entry) => {
      const dateKey = (entry.date || '').split('T')[0] || entry.date;
      const recipe = recipes.find((r) => r.id === entry.recipeId);
      if (!recipe) return;
      const calories = recipe.caloriesPerServing || 0;
      const sugar = recipe.sugarPerServingGrams || 0;
      if (!byDate[dateKey]) {
        byDate[dateKey] = {
          date: dateKey,
          totalCalories: 0,
          totalSugarGrams: 0
        };
      }
      byDate[dateKey].totalCalories += calories;
      byDate[dateKey].totalSugarGrams += sugar;
    });
    return Object.values(byDate);
  }

  _resolveShoppingListItemForeignKeys(item) {
    const shoppingLists = this._getFromStorage('shopping_lists');
    const ingredients = this._getFromStorage('ingredients');
    const recipes = this._getFromStorage('recipes');
    const products = this._getFromStorage('products');

    const shoppingList = shoppingLists.find((l) => l.id === item.shoppingListId) || null;
    const ingredient = item.ingredientId
      ? ingredients.find((ing) => ing.id === item.ingredientId) || null
      : null;

    let recipe = null;
    let product = null;
    if (item.sourceType === 'recipe' && item.sourceId) {
      recipe = recipes.find((r) => r.id === item.sourceId) || null;
    } else if (item.sourceType === 'product' && item.sourceId) {
      product = products.find((p) => p.id === item.sourceId) || null;
    }

    const enriched = { ...item };
    if (shoppingList) enriched.shoppingList = shoppingList;
    if (ingredient) enriched.ingredient = ingredient;
    if (recipe) enriched.recipe = recipe;
    if (product) enriched.product = product;

    return enriched;
  }

  _resolveCartItemForeignKeys(item) {
    const products = this._getFromStorage('products');
    const product = products.find((p) => p.id === item.productId) || null;
    const enriched = { ...item };
    if (product) enriched.product = product;
    return enriched;
  }

  _resolveMealPlanEntryForeignKeys(entry) {
    const recipes = this._getFromStorage('recipes');
    const recipe = recipes.find((r) => r.id === entry.recipeId) || null;
    const enriched = { ...entry };
    if (recipe) enriched.recipe = recipe;
    return enriched;
  }

  _resolveTimerForeignKeys(timer) {
    const recipes = this._getFromStorage('recipes');
    const steps = this._getFromStorage('recipe_steps');
    const recipe = recipes.find((r) => r.id === timer.recipeId) || null;
    const step = steps.find((s) => s.id === timer.stepId) || null;
    const enriched = { ...timer };
    if (recipe) enriched.recipe = recipe;
    if (step) enriched.step = step;
    return enriched;
  }

  _resolveFavoriteForeignKeys(favorite) {
    const recipes = this._getFromStorage('recipes');
    const recipe = recipes.find((r) => r.id === favorite.recipeId) || null;
    const enriched = { ...favorite };
    if (recipe) enriched.recipe = recipe;
    return enriched;
  }

  _resolveReviewForeignKeys(review) {
    const recipes = this._getFromStorage('recipes');
    const products = this._getFromStorage('products');
    const enriched = { ...review };
    if (review.targetType === 'recipe') {
      enriched.recipe = recipes.find((r) => r.id === review.targetId) || null;
    } else if (review.targetType === 'product') {
      enriched.product = products.find((p) => p.id === review.targetId) || null;
    }
    return enriched;
  }

  _resolvePantryItemForeignKeys(pantryItem) {
    const ingredients = this._getFromStorage('ingredients');
    const ingredient = pantryItem.ingredientId
      ? ingredients.find((ing) => ing.id === pantryItem.ingredientId) || null
      : null;
    const enriched = { ...pantryItem };
    if (ingredient) enriched.ingredient = ingredient;
    return enriched;
  }

  _resolveProductForeignKeys(product) {
    const categories = this._getFromStorage('product_categories');
    const category = categories.find((c) => c.slug === product.categorySlug) || null;
    const enriched = { ...product };
    if (category) enriched.category = category;
    return enriched;
  }

  _normalizeDateOnly(dateStr) {
    if (!dateStr) return null;
    // Expecting 'YYYY-MM-DD' or ISO; we will return 'YYYY-MM-DD'
    // Use UTC-based parsing to avoid timezone-related off-by-one errors.
    if (typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
      return dateStr.substring(0, 10);
    }
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;
    const year = d.getUTCFullYear();
    const month = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return year + '-' + month + '-' + day;
  }

  // ---------- Interface implementations ----------

  // 1) getHomeFeaturedRecipes
  getHomeFeaturedRecipes() {
    const recipes = this._getFromStorage('recipes');
    const eggRecipes = recipes.filter((r) => r.isEggBased !== false);

    // Featured: recipes marked isFeatured or top rated
    const featuredCandidates = eggRecipes
      .filter((r) => r.isFeatured || (r.ratingAverage || 0) >= 4.5)
      .sort((a, b) => (b.ratingAverage || 0) - (a.ratingAverage || 0));

    const featured = featuredCandidates.slice(0, 6).map((r) => ({
      recipe: r,
      highlightReason: r.isFeatured ? 'editor_pick' : 'top_rated'
    }));

    // Quick breakfasts: mealType breakfast and <= 20 minutes total
    const quickBreakfasts = eggRecipes
      .filter((r) => r.mealType === 'breakfast' && r.totalTimeMinutes <= 20)
      .sort((a, b) => (b.ratingAverage || 0) - (a.ratingAverage || 0));

    // Kid-friendly snacks
    const kidFriendlySnacks = eggRecipes
      .filter(
        (r) =>
          (r.mealType === 'snack' || r.course === 'snack') &&
          (r.kidFriendly === true || (Array.isArray(r.tags) && r.tags.includes('kid_friendly_snack')))
      )
      .sort((a, b) => (b.ratingAverage || 0) - (a.ratingAverage || 0));

    return {
      featured,
      quickBreakfasts,
      kidFriendlySnacks
    };
  }

  // 2) getHomeUpcomingMeals
  getHomeUpcomingMeals(daysAhead) {
    const days = typeof daysAhead === 'number' ? daysAhead : 7;
    const now = new Date();
    const end = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    const mealPlanEntries = this._getFromStorage('meal_plan_entries');
    const recipes = this._getFromStorage('recipes');

    const upcoming = mealPlanEntries
      .filter((entry) => {
        if (!entry.date) return false;
        const d = new Date(entry.date);
        return d >= now && d <= end;
      })
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    return upcoming.map((entry) => {
      const recipe = recipes.find((r) => r.id === entry.recipeId) || null;
      const calories = recipe ? recipe.caloriesPerServing || 0 : 0;
      const imageUrl = recipe ? recipe.imageUrl || null : null;

      const enrichedEntry = this._resolveMealPlanEntryForeignKeys(entry);

      return {
        entry: enrichedEntry,
        recipeTitle: recipe ? recipe.title : null,
        recipeImageUrl: imageUrl,
        caloriesPerServing: calories
      };
    });
  }

  // 3) getHomeFeaturedProducts
  getHomeFeaturedProducts() {
    const productsRaw = this._getFromStorage('products');
    const products = productsRaw
      .filter((p) => p.isAvailable !== false)
      .sort((a, b) => (b.ratingAverage || 0) - (a.ratingAverage || 0));

    // Prefer egg pans or pans & skillets
    const eggOrPans = products.filter(
      (p) => p.isEggPan === true || p.categorySlug === 'pans_skillets'
    );

    const list = (eggOrPans.length ? eggOrPans : products).slice(0, 8);
    return list.map((p) => this._resolveProductForeignKeys(p));
  }

  // 4) getRecipeFilterOptions
  getRecipeFilterOptions() {
    const recipes = this._getFromStorage('recipes');

    const mealTypes = [
      { value: 'breakfast', label: 'Breakfast' },
      { value: 'lunch', label: 'Lunch' },
      { value: 'dinner', label: 'Dinner' },
      { value: 'snack', label: 'Snack' },
      { value: 'dessert', label: 'Dessert' },
      { value: 'other', label: 'Other' }
    ];

    const courses = [
      { value: 'main', label: 'Main' },
      { value: 'side', label: 'Side' },
      { value: 'dessert', label: 'Dessert' },
      { value: 'appetizer', label: 'Appetizer' },
      { value: 'snack', label: 'Snack' },
      { value: 'drink', label: 'Drink' },
      { value: 'breakfast', label: 'Breakfast' },
      { value: 'other', label: 'Other' }
    ];

    const dietaryPreferences = [
      { value: 'none', label: 'None' },
      { value: 'vegetarian', label: 'Vegetarian' },
      { value: 'vegan', label: 'Vegan' },
      { value: 'dairy_free', label: 'Dairy-free' },
      { value: 'gluten_free', label: 'Gluten-free' }
    ];

    const nums = (arr, prop) => arr.map((r) => (typeof r[prop] === 'number' ? r[prop] : null)).filter((v) => v !== null);

    const totalTimes = nums(recipes, 'totalTimeMinutes');
    const prepTimes = nums(recipes, 'prepTimeMinutes');
    const ratings = nums(recipes, 'ratingAverage');
    const calories = nums(recipes, 'caloriesPerServing');
    const sugars = nums(recipes, 'sugarPerServingGrams');
    const servings = nums(recipes, 'defaultServings');
    const ingredientCounts = nums(recipes, 'ingredientCount');

    const minMax = (arr) => {
      if (!arr.length) return { min: 0, max: 0 };
      return { min: Math.min.apply(null, arr), max: Math.max.apply(null, arr) };
    };

    const timeRangeMinutes = {
      minTotal: totalTimes.length ? Math.min.apply(null, totalTimes) : 0,
      maxTotal: totalTimes.length ? Math.max.apply(null, totalTimes) : 0,
      minPrep: prepTimes.length ? Math.min.apply(null, prepTimes) : 0,
      maxPrep: prepTimes.length ? Math.max.apply(null, prepTimes) : 0
    };

    const ratingRange = minMax(ratings);
    const caloriesRange = minMax(calories);
    const sugarRangeGrams = minMax(sugars);
    const servingsRange = minMax(servings);
    const ingredientCountRange = minMax(ingredientCounts);

    const sortOptions = [
      { value: 'relevance', label: 'Relevance' },
      { value: 'rating_desc', label: 'Rating: High to Low' },
      { value: 'popularity_desc', label: 'Most Popular' },
      { value: 'most_reviewed', label: 'Most Reviewed' },
      { value: 'time_asc', label: 'Time: Low to High' },
      { value: 'time_desc', label: 'Time: High to Low' }
    ];

    return {
      mealTypes,
      courses,
      dietaryPreferences,
      timeRangeMinutes,
      ratingRange,
      caloriesRange,
      sugarRangeGrams,
      servingsRange,
      ingredientCountRange,
      sortOptions
    };
  }

  // 5) searchRecipes
  searchRecipes(query, filters, sortBy, page, pageSize) {
    const q = (query || '').trim().toLowerCase();
    const f = filters || {};
    const sort = sortBy || 'relevance';
    const pg = page && page > 0 ? page : 1;
    const size = pageSize && pageSize > 0 ? pageSize : 20;

    const recipes = this._getFromStorage('recipes');
    const recipeIngredients = this._getFromStorage('recipe_ingredients');

    // Build recipe -> ingredients map for include/exclude filters
    const recipeToIngredientIds = {};
    recipeIngredients.forEach((ri) => {
      if (!recipeToIngredientIds[ri.recipeId]) recipeToIngredientIds[ri.recipeId] = new Set();
      recipeToIngredientIds[ri.recipeId].add(ri.ingredientId);
    });

    let results = recipes.filter((r) => {
      if (f.isEggBasedOnly !== false && r.isEggBased === false) return false;

      if (q) {
        const haystack = ((r.title || '') + ' ' + (r.description || '')).toLowerCase();
        if (!haystack.includes(q)) return false;
      }

      if (f.mealType && r.mealType !== f.mealType) return false;
      if (f.course && r.course !== f.course) return false;
      if (f.dietaryPreference && r.dietaryPreference !== f.dietaryPreference) return false;

      if (typeof f.kidFriendly === 'boolean') {
        if ((r.kidFriendly === true) !== (f.kidFriendly === true)) return false;
      }

      if (typeof f.maxTotalTimeMinutes === 'number') {
        if (typeof r.totalTimeMinutes === 'number' && r.totalTimeMinutes > f.maxTotalTimeMinutes) return false;
      }

      if (typeof f.maxPrepTimeMinutes === 'number') {
        const prep = typeof r.prepTimeMinutes === 'number' ? r.prepTimeMinutes : r.totalTimeMinutes;
        if (typeof prep === 'number' && prep > f.maxPrepTimeMinutes) return false;
      }

      if (typeof f.minRating === 'number') {
        const rating = r.ratingAverage || 0;
        if (rating < f.minRating) return false;
      }

      if (typeof f.maxCaloriesPerServing === 'number') {
        if (
          typeof r.caloriesPerServing === 'number' &&
          r.caloriesPerServing > f.maxCaloriesPerServing
        ) {
          return false;
        }
      }

      if (typeof f.maxSugarPerServingGrams === 'number') {
        if (
          typeof r.sugarPerServingGrams === 'number' &&
          r.sugarPerServingGrams > f.maxSugarPerServingGrams
        ) {
          return false;
        }
      }

      if (typeof f.minDefaultServings === 'number') {
        if (typeof r.defaultServings === 'number' && r.defaultServings < f.minDefaultServings) {
          return false;
        }
      }

      if (typeof f.maxIngredientCount === 'number') {
        if (
          typeof r.ingredientCount === 'number' &&
          r.ingredientCount > f.maxIngredientCount
        ) {
          return false;
        }
      }

      // Include / exclude ingredients
      const set = recipeToIngredientIds[r.id] || new Set();

      if (Array.isArray(f.includeIngredientIds) && f.includeIngredientIds.length) {
        for (let i = 0; i < f.includeIngredientIds.length; i++) {
          if (!set.has(f.includeIngredientIds[i])) return false;
        }
      }

      if (Array.isArray(f.excludeIngredientIds) && f.excludeIngredientIds.length) {
        for (let i = 0; i < f.excludeIngredientIds.length; i++) {
          if (set.has(f.excludeIngredientIds[i])) return false;
        }
      }

      return true;
    });

    // Sorting
    results.sort((a, b) => {
      const ratingA = a.ratingAverage || 0;
      const ratingB = b.ratingAverage || 0;
      const popA = a.popularityScore || a.ratingCount || 0;
      const popB = b.popularityScore || b.ratingCount || 0;
      const reviewsA = a.reviewCount || a.ratingCount || 0;
      const reviewsB = b.reviewCount || b.ratingCount || 0;
      const timeA = a.totalTimeMinutes || 0;
      const timeB = b.totalTimeMinutes || 0;

      switch (sort) {
        case 'rating_desc':
          if (ratingB !== ratingA) return ratingB - ratingA;
          return reviewsB - reviewsA;
        case 'popularity_desc':
          if (popB !== popA) return popB - popA;
          return ratingB - ratingA;
        case 'most_reviewed':
          if (reviewsB !== reviewsA) return reviewsB - reviewsA;
          return ratingB - ratingA;
        case 'time_asc':
          if (timeA !== timeB) return timeA - timeB;
          return ratingB - ratingA;
        case 'time_desc':
          if (timeA !== timeB) return timeB - timeA;
          return ratingB - ratingA;
        case 'relevance':
        default:
          // Basic relevance: rating then popularity
          if (ratingB !== ratingA) return ratingB - ratingA;
          return popB - popA;
      }
    });

    const totalCount = results.length;
    const startIndex = (pg - 1) * size;
    const pageResults = results.slice(startIndex, startIndex + size);

    const mapped = pageResults.map((recipe) => ({
      recipe,
      display: {
        title: recipe.title,
        imageUrl: recipe.imageUrl || null,
        totalTimeMinutes: recipe.totalTimeMinutes || null,
        prepTimeMinutes: recipe.prepTimeMinutes || null,
        caloriesPerServing: recipe.caloriesPerServing || null,
        defaultServings: recipe.defaultServings || null,
        ratingAverage: recipe.ratingAverage || null,
        ratingCount: recipe.ratingCount || 0,
        mealTypeLabel: recipe.mealType || null,
        dietaryLabel: recipe.dietaryPreference || null
      }
    }));

    // Instrumentation for task completion tracking (Task 6 - filter params)
    try {
      const matchesTask6 =
        q.includes('egg snack') &&
        f &&
        f.kidFriendly === true &&
        typeof f.maxIngredientCount === 'number' &&
        f.maxIngredientCount <= 5 &&
        typeof f.maxPrepTimeMinutes === 'number' &&
        f.maxPrepTimeMinutes <= 15 &&
        sort === 'rating_desc';

      if (matchesTask6) {
        localStorage.setItem(
          'task6_filterParams',
          JSON.stringify({
            query,
            filters: {
              kidFriendly: f.kidFriendly,
              maxIngredientCount: f.maxIngredientCount,
              maxPrepTimeMinutes: f.maxPrepTimeMinutes
            },
            sortBy: sort,
            topResultRecipeId: (mapped[0] && mapped[0].recipe && mapped[0].recipe.id) || null,
            timestamp: new Date().toISOString()
          })
        );
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      results: mapped,
      totalCount,
      page: pg,
      pageSize: size
    };
  }

  // 6) getRecipeDetail
  getRecipeDetail(recipeId, targetServings) {
    const recipes = this._getFromStorage('recipes');
    const recipe = recipes.find((r) => r.id === recipeId) || null;
    if (!recipe) {
      return null;
    }

    const allRecipeIngredients = this._getFromStorage('recipe_ingredients');
    let recipeIngredients = allRecipeIngredients.filter((ri) => ri.recipeId === recipeId);
    const ingredientsCatalog = this._getFromStorage('ingredients');
    const pantryItems = this._getFromStorage('pantry_items');
    // Fallback: if no stored recipe_ingredients exist for this recipe but ingredientCount is set,
    // synthesize generic ingredients from the master ingredients catalog so callers still see
    // at least some ingredients.
    if (
      !recipeIngredients.length &&
      recipe &&
      typeof recipe.ingredientCount === 'number' &&
      recipe.ingredientCount > 0 &&
      Array.isArray(ingredientsCatalog) &&
      ingredientsCatalog.length
    ) {
      const fallbackIngredients = ingredientsCatalog.slice(0, recipe.ingredientCount);
      recipeIngredients = fallbackIngredients.map((ing, index) => ({
        id: 'auto_' + recipeId + '_' + ing.id,
        recipeId,
        ingredientId: ing.id,
        quantity: null,
        unit: ing.defaultUnit || null,
        preparation: '',
        isOptional: false,
        displayOrder: index + 1
      }));
    }
    const steps = this._getFromStorage('recipe_steps')
      .filter((s) => s.recipeId === recipeId)
      .sort((a, b) => (a.stepNumber || 0) - (b.stepNumber || 0));

    const factor = this._applyRecipeScaling(recipe, targetServings);

    const ingredients = recipeIngredients
      .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
      .map((ri) => {
        let ingredient =
          ingredientsCatalog.find((ing) => ing.id === ri.ingredientId) || null;
        // Fallback: if ingredient is not in the main catalog, try to derive it from pantry items
        if (!ingredient && ri.ingredientId) {
          const pantryMatch = pantryItems.find((pi) => pi.ingredientId === ri.ingredientId);
          if (pantryMatch) {
            ingredient = {
              id: pantryMatch.ingredientId || pantryMatch.id,
              name: pantryMatch.name,
              category: 'pantry',
              isStaple: false,
              defaultUnit: ri.unit || null,
              notes: pantryMatch.notes || ''
            };
          }
        }
        const scaledQuantity =
          typeof ri.quantity === 'number'
            ? this._applyRecipeScaling(recipe, targetServings, ri.quantity)
            : null;
        return {
          recipeIngredient: ri,
          ingredient,
          scaledQuantity,
          unit: ri.unit || (ingredient ? ingredient.defaultUnit || null : null),
          isOptional: ri.isOptional || false
        };
      });

    const allReviews = this._getFromStorage('reviews').filter(
      (rev) => rev.targetType === 'recipe' && rev.targetId === recipeId
    );
    const reviewCount = allReviews.length;
    const sumRatings = allReviews.reduce((sum, r) => sum + (r.rating || 0), 0);
    const ratingAverage = reviewCount ? sumRatings / reviewCount : recipe.ratingAverage || 0;

    const favorites = this._getFromStorage('favorite_recipes');
    const isFavorite = favorites.some((fav) => fav.recipeId === recipeId);

    const nutrition = {
      caloriesPerServing: recipe.caloriesPerServing || null,
      sugarPerServingGrams: recipe.sugarPerServingGrams || null
    };

    const reviewSummary = {
      ratingAverage,
      ratingCount: reviewCount,
      reviewCount
    };

    return {
      recipe,
      ingredients,
      steps,
      nutrition,
      reviewSummary,
      isFavorite
    };
  }

  // 7) addRecipeIngredientsToShoppingList
  addRecipeIngredientsToShoppingList(recipeId, servings, ingredientIds, excludePantryItems) {
    const recipes = this._getFromStorage('recipes');
    const recipe = recipes.find((r) => r.id === recipeId) || null;
    if (!recipe) {
      return {
        shoppingList: null,
        addedItems: [],
        excludedPantryItems: [],
        message: 'Recipe not found.'
      };
    }

    const { shoppingList, items: existingItems } = this._getOrCreateShoppingList();
    const allRecipeIngredients = this._getFromStorage('recipe_ingredients');
    let recipeIngredients = allRecipeIngredients.filter((ri) => ri.recipeId === recipeId);
    const ingredientsCatalog = this._getFromStorage('ingredients');
    const pantryItems = this._getFromStorage('pantry_items');

    // Fallback: if this recipe has no stored recipe_ingredients but declares an ingredientCount,
    // synthesize generic ingredients from the master ingredients catalog.
    if (
      !recipeIngredients.length &&
      recipe &&
      typeof recipe.ingredientCount === 'number' &&
      recipe.ingredientCount > 0 &&
      Array.isArray(ingredientsCatalog) &&
      ingredientsCatalog.length
    ) {
      const fallbackIngredients = ingredientsCatalog.slice(0, recipe.ingredientCount);
      recipeIngredients = fallbackIngredients.map((ing, index) => ({
        id: 'auto_' + recipeId + '_' + ing.id,
        recipeId,
        ingredientId: ing.id,
        quantity: null,
        unit: ing.defaultUnit || null,
        preparation: '',
        isOptional: false,
        displayOrder: index + 1
      }));
    }

    let entries = recipeIngredients.map((ri) => {
      let ingredient =
        ingredientsCatalog.find((ing) => ing.id === ri.ingredientId) || null;
      if (!ingredient && ri.ingredientId) {
        const pantryMatch = pantryItems.find((pi) => pi.ingredientId === ri.ingredientId);
        if (pantryMatch) {
          ingredient = {
            id: pantryMatch.ingredientId || pantryMatch.id,
            name: pantryMatch.name,
            category: 'pantry',
            isStaple: false,
            defaultUnit: ri.unit || null,
            notes: pantryMatch.notes || ''
          };
        }
      }
      return {
        recipeIngredient: ri,
        ingredient
      };
    });

    if (Array.isArray(ingredientIds) && ingredientIds.length) {
      const setIds = new Set(ingredientIds);
      entries = entries.filter((e) => setIds.has(e.recipeIngredient.ingredientId));
    }

    let excluded = [];
    const shouldExcludePantry = excludePantryItems !== false; // default true
    if (shouldExcludePantry) {
      const filtered = this._filterOutPantryItems(entries);
      entries = filtered.kept;
      excluded = filtered.excluded;
    }

    const factor = this._applyRecipeScaling(recipe, servings);

    const shoppingListItems = this._getFromStorage('shopping_list_items');
    const newItems = [];

    entries.forEach((entry) => {
      const ri = entry.recipeIngredient;
      const ingredient = entry.ingredient;

      const baseQuantity = typeof ri.quantity === 'number' ? ri.quantity : null;
      const quantity = baseQuantity !== null ? this._applyRecipeScaling(recipe, servings, baseQuantity) : null;

      const dbItem = {
        id: this._generateId('shopping_list_item'),
        shoppingListId: shoppingList.id,
        sourceType: 'recipe',
        sourceId: recipeId,
        ingredientId: ingredient ? ingredient.id : null,
        name: ingredient ? ingredient.name : (ri.unit || 'Ingredient'),
        quantity,
        unit: ri.unit || (ingredient ? ingredient.defaultUnit || null : null),
        category: ingredient ? ingredient.category || 'other' : 'other',
        isChecked: false,
        notes: ''
      };

      shoppingListItems.push(dbItem);
      newItems.push(dbItem);
    });

    // Update shopping list updatedAt
    const shoppingLists = this._getFromStorage('shopping_lists');
    const idx = shoppingLists.findIndex((l) => l.id === shoppingList.id);
    if (idx !== -1) {
      shoppingLists[idx] = { ...shoppingList, updatedAt: new Date().toISOString() };
      this._saveToStorage('shopping_lists', shoppingLists);
    }

    this._saveToStorage('shopping_list_items', shoppingListItems);

    // Prepare return items with foreign keys resolved
    const enrichedAdded = newItems.map((item) => this._resolveShoppingListItemForeignKeys(item));

    const enrichedExcluded = excluded.map((entry) => {
      const base = {
        id: null,
        shoppingListId: shoppingList.id,
        sourceType: 'recipe',
        sourceId: recipeId,
        ingredientId: entry.ingredient ? entry.ingredient.id : null,
        name: entry.ingredient ? entry.ingredient.name : 'Ingredient',
        quantity: entry.recipeIngredient.quantity || null,
        unit: entry.recipeIngredient.unit || null,
        category: entry.ingredient ? entry.ingredient.category || 'other' : 'other',
        isChecked: false,
        notes: ''
      };
      return this._resolveShoppingListItemForeignKeys(base);
    });

    return {
      shoppingList,
      addedItems: enrichedAdded,
      excludedPantryItems: enrichedExcluded,
      message: enrichedAdded.length
        ? 'Ingredients added to shopping list.'
        : 'No ingredients were added to the shopping list.'
    };
  }

  // 8) saveRecipeToFavorites
  saveRecipeToFavorites(recipeId, savedServings, notes) {
    const recipes = this._getFromStorage('recipes');
    const recipe = recipes.find((r) => r.id === recipeId) || null;
    if (!recipe) {
      return {
        favorite: null,
        message: 'Recipe not found.'
      };
    }

    const favorites = this._getFromStorage('favorite_recipes');
    const now = new Date().toISOString();
    const isScaledFromDefault =
      typeof savedServings === 'number' && savedServings > 0 && savedServings !== recipe.defaultServings;

    const favorite = {
      id: this._generateId('favorite_recipe'),
      recipeId,
      savedServings: typeof savedServings === 'number' ? savedServings : null,
      isScaledFromDefault,
      notes: notes || '',
      createdAt: now,
      updatedAt: null
    };

    favorites.push(favorite);
    this._saveToStorage('favorite_recipes', favorites);

    const enrichedFavorite = this._resolveFavoriteForeignKeys(favorite);

    return {
      favorite: enrichedFavorite,
      message: 'Recipe saved to favorites.'
    };
  }

  // 9) addRecipeToMealPlanner
  addRecipeToMealPlanner(recipeId, date, mealSlot, plannedServings) {
    const recipes = this._getFromStorage('recipes');
    const recipe = recipes.find((r) => r.id === recipeId) || null;
    if (!recipe) {
      return {
        entry: null,
        message: 'Recipe not found.'
      };
    }

    const normalizedDate = this._normalizeDateOnly(date) || date;
    const mealPlanEntries = this._getFromStorage('meal_plan_entries');
    const now = new Date().toISOString();

    const entry = {
      id: this._generateId('meal_plan_entry'),
      recipeId,
      date: normalizedDate,
      mealSlot,
      plannedServings: typeof plannedServings === 'number' ? plannedServings : null,
      createdAt: now,
      updatedAt: null
    };

    mealPlanEntries.push(entry);
    this._saveToStorage('meal_plan_entries', mealPlanEntries);

    const enrichedEntry = this._resolveMealPlanEntryForeignKeys(entry);

    return {
      entry: enrichedEntry,
      message: 'Recipe added to meal planner.'
    };
  }

  // 10) startRecipeTimer
  startRecipeTimer(recipeId, stepId, durationSeconds, label) {
    const recipes = this._getFromStorage('recipes');
    const steps = this._getFromStorage('recipe_steps');
    const recipe = recipes.find((r) => r.id === recipeId) || null;
    const step = steps.find((s) => s.id === stepId) || null;

    if (!recipe || !step) {
      return { timer: null };
    }

    const duration =
      typeof durationSeconds === 'number' && durationSeconds > 0
        ? durationSeconds
        : step.defaultTimerSeconds || 0;

    const now = new Date().toISOString();

    const timer = {
      id: this._generateId('recipe_timer'),
      recipeId,
      stepId,
      label: label || 'Recipe timer',
      durationSeconds: duration,
      remainingSeconds: duration,
      status: 'running',
      startedAt: now,
      pausedAt: null,
      completedAt: null
    };

    const timers = this._getFromStorage('recipe_timers');
    timers.push(timer);
    this._saveToStorage('recipe_timers', timers);

    const enrichedTimer = this._resolveTimerForeignKeys(timer);
    return { timer: enrichedTimer };
  }

  // 11) getActiveRecipeTimers
  getActiveRecipeTimers(recipeId) {
    const timers = this._getFromStorage('recipe_timers');
    const activeTimers = timers.filter(
      (t) => t.recipeId === recipeId && t.status !== 'cancelled'
    );
    return activeTimers.map((t) => this._resolveTimerForeignKeys(t));
  }

  // 12) updateRecipeTimer
  updateRecipeTimer(timerId, action) {
    const timers = this._getFromStorage('recipe_timers');
    const idx = timers.findIndex((t) => t.id === timerId);
    if (idx === -1) {
      return {
        timer: null,
        message: 'Timer not found.'
      };
    }

    const now = new Date();
    let timer = { ...timers[idx] };

    const computeRemaining = () => {
      if (timer.status === 'running' && timer.startedAt) {
        const started = new Date(timer.startedAt);
        const elapsedSec = Math.max(0, (now.getTime() - started.getTime()) / 1000);
        const remaining = Math.max(0, timer.durationSeconds - elapsedSec);
        return Math.round(remaining);
      }
      return timer.remainingSeconds || timer.durationSeconds;
    };

    if (action === 'pause') {
      if (timer.status === 'running') {
        timer.remainingSeconds = computeRemaining();
        timer.status = 'paused';
        timer.pausedAt = now.toISOString();
      }
    } else if (action === 'resume') {
      if (timer.status === 'paused') {
        timer.status = 'running';
        // Set startedAt so remainingSeconds counts down from current remaining
        const remaining = timer.remainingSeconds || timer.durationSeconds;
        const startedAtMs = now.getTime() - (timer.durationSeconds - remaining) * 1000;
        timer.startedAt = new Date(startedAtMs).toISOString();
        timer.pausedAt = null;
      }
    } else if (action === 'cancel') {
      timer.status = 'cancelled';
      timer.remainingSeconds = computeRemaining();
      timer.completedAt = now.toISOString();
    }

    // Auto-complete if time has elapsed
    if (timer.status === 'running') {
      const remaining = computeRemaining();
      timer.remainingSeconds = remaining;
      if (remaining <= 0) {
        timer.status = 'completed';
        timer.completedAt = now.toISOString();
      }
    }

    timers[idx] = timer;
    this._saveToStorage('recipe_timers', timers);

    const enrichedTimer = this._resolveTimerForeignKeys(timer);

    return {
      timer: enrichedTimer,
      message: 'Timer updated.'
    };
  }

  // 13) getRecipeReviews
  getRecipeReviews(recipeId, page, pageSize) {
    const pg = page && page > 0 ? page : 1;
    const size = pageSize && pageSize > 0 ? pageSize : 10;

    const reviews = this._getFromStorage('reviews').filter(
      (r) => r.targetType === 'recipe' && r.targetId === recipeId
    );

    reviews.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const totalCount = reviews.length;
    const startIndex = (pg - 1) * size;
    const pageReviews = reviews.slice(startIndex, startIndex + size);

    const enriched = pageReviews.map((r) => this._resolveReviewForeignKeys(r));

    return {
      reviews: enriched,
      totalCount
    };
  }

  // 14) submitRecipeReview
  submitRecipeReview(recipeId, rating, comment, wouldCookAgain) {
    const recipes = this._getFromStorage('recipes');
    const recipeIdx = recipes.findIndex((r) => r.id === recipeId);
    if (recipeIdx === -1) {
      return {
        review: null,
        message: 'Recipe not found.'
      };
    }

    const text = (comment || '').trim();
    if (text.length < 20) {
      return {
        review: null,
        message: 'Comment must be at least 20 characters.'
      };
    }

    const reviews = this._getFromStorage('reviews');
    const now = new Date().toISOString();

    const review = {
      id: this._generateId('review'),
      targetType: 'recipe',
      targetId: recipeId,
      rating: typeof rating === 'number' ? rating : 0,
      comment: text,
      wouldCookAgain: typeof wouldCookAgain === 'boolean' ? wouldCookAgain : null,
      createdAt: now,
      updatedAt: null
    };

    reviews.push(review);
    this._saveToStorage('reviews', reviews);

    // Recompute rating stats for recipe
    const recipeReviews = reviews.filter(
      (r) => r.targetType === 'recipe' && r.targetId === recipeId
    );
    const reviewCount = recipeReviews.length;
    const sumRatings = recipeReviews.reduce((sum, r) => sum + (r.rating || 0), 0);
    const ratingAverage = reviewCount ? sumRatings / reviewCount : 0;

    const recipe = { ...recipes[recipeIdx] };
    recipe.ratingAverage = ratingAverage;
    recipe.ratingCount = reviewCount;
    recipe.reviewCount = reviewCount;
    recipe.updatedAt = now;
    recipes[recipeIdx] = recipe;
    this._saveToStorage('recipes', recipes);

    const enrichedReview = this._resolveReviewForeignKeys(review);

    return {
      review: enrichedReview,
      message: 'Review submitted.'
    };
  }

  // Helper for Task 6: record when a recipe link is copied/shared
  shareRecipeLink(recipeId) {
    // Instrumentation for task completion tracking (Task 6 - share recipe)
    try {
      localStorage.setItem(
        'task6_sharedRecipe',
        JSON.stringify({
          recipeId,
          copiedAt: new Date().toISOString()
        })
      );
    } catch (e) {
      console.error('Instrumentation error:', e);
    }
  }

  // 15) getPantrySummary
  getPantrySummary() {
    const pantryItems = this._getFromStorage('pantry_items');
    const ingredients = this._getFromStorage('ingredients');

    let lastUpdated = null;
    const staples = pantryItems.map((pi) => {
      const ingredient = ingredients.find((ing) => ing.id === pi.ingredientId) || null;
      const isStaple = ingredient ? !!ingredient.isStaple : false;
      const ingredientName = ingredient ? ingredient.name : pi.name;

      if (pi.lastUpdated) {
        if (!lastUpdated || new Date(pi.lastUpdated) > new Date(lastUpdated)) {
          lastUpdated = pi.lastUpdated;
        }
      }

      const enrichedPantryItem = this._resolvePantryItemForeignKeys(pi);

      return {
        pantryItem: enrichedPantryItem,
        isStaple,
        ingredientName
      };
    });

    return {
      staples,
      lastUpdated
    };
  }

  // 16) searchPantryItems
  searchPantryItems(query) {
    const q = (query || '').trim().toLowerCase();
    const pantryItems = this._getFromStorage('pantry_items');
    const filtered = pantryItems.filter((item) => {
      if (!q) return true;
      return (item.name || '').toLowerCase().includes(q);
    });
    return filtered.map((pi) => this._resolvePantryItemForeignKeys(pi));
  }

  // 17) searchIngredientsForPantry
  searchIngredientsForPantry(query) {
    const q = (query || '').trim().toLowerCase();
    const ingredients = this._getFromStorage('ingredients');
    return ingredients.filter((ing) => {
      if (!q) return true;
      return (ing.name || '').toLowerCase().includes(q);
    });
  }

  // 18) upsertPantryItem
  upsertPantryItem(pantryItemId, ingredientId, name, isInPantry, quantity, unit, notes) {
    const pantryItems = this._getFromStorage('pantry_items');
    const now = new Date().toISOString();

    let pantryItem;
    if (pantryItemId) {
      const idx = pantryItems.findIndex((pi) => pi.id === pantryItemId);
      if (idx === -1) {
        // If not found, create new
        pantryItem = {
          id: pantryItemId,
          ingredientId: ingredientId || null,
          name,
          isInPantry: !!isInPantry,
          quantity: typeof quantity === 'number' ? quantity : null,
          unit: unit || null,
          notes: notes || '',
          lastUpdated: now
        };
        pantryItems.push(pantryItem);
      } else {
        pantryItem = {
          ...pantryItems[idx],
          ingredientId: ingredientId || pantryItems[idx].ingredientId || null,
          name: name || pantryItems[idx].name,
          isInPantry: !!isInPantry,
          quantity:
            typeof quantity === 'number' ? quantity : pantryItems[idx].quantity || null,
          unit: unit || pantryItems[idx].unit || null,
          notes: notes !== undefined ? notes : pantryItems[idx].notes || '',
          lastUpdated: now
        };
        pantryItems[idx] = pantryItem;
      }
    } else {
      pantryItem = {
        id: this._generateId('pantry_item'),
        ingredientId: ingredientId || null,
        name,
        isInPantry: !!isInPantry,
        quantity: typeof quantity === 'number' ? quantity : null,
        unit: unit || null,
        notes: notes || '',
        lastUpdated: now
      };
      pantryItems.push(pantryItem);
    }

    this._saveToStorage('pantry_items', pantryItems);

    const enrichedPantryItem = this._resolvePantryItemForeignKeys(pantryItem);

    return {
      pantryItem: enrichedPantryItem,
      message: 'Pantry item saved.'
    };
  }

  // 19) togglePantryItemAvailability
  togglePantryItemAvailability(pantryItemId, isInPantry) {
    const pantryItems = this._getFromStorage('pantry_items');
    const idx = pantryItems.findIndex((pi) => pi.id === pantryItemId);
    if (idx === -1) {
      return { pantryItem: null };
    }

    const now = new Date().toISOString();
    const pantryItem = {
      ...pantryItems[idx],
      isInPantry: !!isInPantry,
      lastUpdated: now
    };
    pantryItems[idx] = pantryItem;
    this._saveToStorage('pantry_items', pantryItems);

    const enrichedPantryItem = this._resolvePantryItemForeignKeys(pantryItem);

    return { pantryItem: enrichedPantryItem };
  }

  // 20) removePantryItem
  removePantryItem(pantryItemId) {
    const pantryItems = this._getFromStorage('pantry_items');
    const newItems = pantryItems.filter((pi) => pi.id !== pantryItemId);
    const success = newItems.length !== pantryItems.length;
    if (success) {
      this._saveToStorage('pantry_items', newItems);
    }
    return {
      success,
      message: success ? 'Pantry item removed.' : 'Pantry item not found.'
    };
  }

  // 21) getActiveShoppingList
  getActiveShoppingList() {
    const { shoppingList, items } = this._getOrCreateShoppingList();

    const categories = {
      produce: 'Produce',
      dairy: 'Dairy',
      pantry: 'Pantry',
      meat: 'Meat',
      baking: 'Baking',
      spices: 'Spices',
      oils: 'Oils',
      other: 'Other'
    };

    const itemsByCategoryMap = {};
    items.forEach((item) => {
      const cat = item.category || 'other';
      if (!itemsByCategoryMap[cat]) {
        itemsByCategoryMap[cat] = [];
      }
      itemsByCategoryMap[cat].push(this._resolveShoppingListItemForeignKeys(item));
    });

    const itemsByCategory = Object.keys(itemsByCategoryMap).map((cat) => ({
      category: cat,
      categoryLabel: categories[cat] || 'Other',
      items: itemsByCategoryMap[cat]
    }));

    return {
      shoppingList,
      itemsByCategory
    };
  }

  // 22) updateShoppingListItem
  updateShoppingListItem(shoppingListItemId, quantity, unit, notes, isChecked) {
    const shoppingListItems = this._getFromStorage('shopping_list_items');
    const idx = shoppingListItems.findIndex((it) => it.id === shoppingListItemId);
    if (idx === -1) {
      return { item: null };
    }

    const item = { ...shoppingListItems[idx] };
    if (quantity !== undefined) {
      item.quantity = typeof quantity === 'number' ? quantity : item.quantity;
    }
    if (unit !== undefined) {
      item.unit = unit;
    }
    if (notes !== undefined) {
      item.notes = notes;
    }
    if (typeof isChecked === 'boolean') {
      item.isChecked = isChecked;
    }

    shoppingListItems[idx] = item;
    this._saveToStorage('shopping_list_items', shoppingListItems);

    const enrichedItem = this._resolveShoppingListItemForeignKeys(item);

    return { item: enrichedItem };
  }

  // 23) removeShoppingListItem
  removeShoppingListItem(shoppingListItemId) {
    const shoppingListItems = this._getFromStorage('shopping_list_items');
    const newItems = shoppingListItems.filter((it) => it.id !== shoppingListItemId);
    const success = newItems.length !== shoppingListItems.length;
    if (success) {
      this._saveToStorage('shopping_list_items', newItems);
    }
    return {
      success,
      message: success ? 'Shopping list item removed.' : 'Shopping list item not found.'
    };
  }

  // 24) generateShoppingListExport
  generateShoppingListExport(format) {
    const fmt = format === 'csv' ? 'csv' : 'plain_text';
    const { shoppingList, itemsByCategory } = this.getActiveShoppingList();

    if (fmt === 'csv') {
      const lines = ['Category,Item,Quantity,Unit,Notes'];
      itemsByCategory.forEach((group) => {
        group.items.forEach((item) => {
          const name = (item.name || '').replace(/"/g, '""');
          const notes = (item.notes || '').replace(/"/g, '""');
          lines.push(
            [
              '"' + (group.categoryLabel || '') + '"',
              '"' + name + '"',
              item.quantity != null ? item.quantity : '',
              '"' + (item.unit || '') + '"',
              '"' + notes + '"'
            ].join(',')
          );
        });
      });
      return {
        format: 'csv',
        content: lines.join('\n')
      };
    }

    // plain text
    const lines = [];
    lines.push(shoppingList.title || 'Shopping List');
    lines.push('');
    itemsByCategory.forEach((group) => {
      lines.push('[' + (group.categoryLabel || group.category) + ']');
      group.items.forEach((item) => {
        const qtyPart = item.quantity != null ? item.quantity + (item.unit ? ' ' + item.unit : '') + ' ' : '';
        const notesPart = item.notes ? ' (' + item.notes + ')' : '';
        lines.push('- ' + qtyPart + item.name + notesPart);
      });
      lines.push('');
    });

    return {
      format: 'plain_text',
      content: lines.join('\n')
    };
  }

  // 25) getMealPlanForRange
  getMealPlanForRange(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return [];
    }

    const entries = this._getFromStorage('meal_plan_entries');
    const recipes = this._getFromStorage('recipes');

    const filtered = entries.filter((entry) => {
      const d = new Date(entry.date);
      return d >= start && d <= end;
    });

    return filtered.map((entry) => {
      const recipe = recipes.find((r) => r.id === entry.recipeId) || null;
      const calories = recipe ? recipe.caloriesPerServing || 0 : 0;
      const sugar = recipe ? recipe.sugarPerServingGrams || 0 : 0;
      const imageUrl = recipe ? recipe.imageUrl || null : null;

      const enrichedEntry = this._resolveMealPlanEntryForeignKeys(entry);

      return {
        entry: enrichedEntry,
        recipeTitle: recipe ? recipe.title : null,
        recipeImageUrl: imageUrl,
        caloriesPerServing: calories,
        sugarPerServingGrams: sugar
      };
    });
  }

  // 26) updateMealPlanEntry
  updateMealPlanEntry(mealPlanEntryId, date, mealSlot, plannedServings) {
    const entries = this._getFromStorage('meal_plan_entries');
    const idx = entries.findIndex((e) => e.id === mealPlanEntryId);
    if (idx === -1) {
      return { entry: null };
    }

    const entry = { ...entries[idx] };
    if (date !== undefined) {
      entry.date = this._normalizeDateOnly(date) || date;
    }
    if (mealSlot !== undefined) {
      entry.mealSlot = mealSlot;
    }
    if (plannedServings !== undefined) {
      entry.plannedServings = typeof plannedServings === 'number' ? plannedServings : entry.plannedServings;
    }
    entry.updatedAt = new Date().toISOString();

    entries[idx] = entry;
    this._saveToStorage('meal_plan_entries', entries);

    const enrichedEntry = this._resolveMealPlanEntryForeignKeys(entry);

    return { entry: enrichedEntry };
  }

  // 27) removeMealPlanEntry
  removeMealPlanEntry(mealPlanEntryId) {
    const entries = this._getFromStorage('meal_plan_entries');
    const newEntries = entries.filter((e) => e.id !== mealPlanEntryId);
    const success = newEntries.length !== entries.length;
    if (success) {
      this._saveToStorage('meal_plan_entries', newEntries);
    }
    return {
      success,
      message: success ? 'Meal plan entry removed.' : 'Meal plan entry not found.'
    };
  }

  // 28) getProductFilterOptions
  getProductFilterOptions() {
    const categories = this._getFromStorage('product_categories');
    const products = this._getFromStorage('products');

    const surfaceTypes = [
      { value: 'non_stick', label: 'Non-stick' },
      { value: 'stainless_steel', label: 'Stainless steel' },
      { value: 'cast_iron', label: 'Cast iron' },
      { value: 'ceramic', label: 'Ceramic' },
      { value: 'other', label: 'Other' }
    ];

    const nums = (arr, getter) =>
      arr
        .map(getter)
        .filter((v) => typeof v === 'number' && !isNaN(v));

    const allSizes = [];
    products.forEach((p) => {
      if (typeof p.diameterInches === 'number') {
        allSizes.push(p.diameterInches);
      }
      if (typeof p.sizeMinInches === 'number') {
        allSizes.push(p.sizeMinInches);
      }
      if (typeof p.sizeMaxInches === 'number') {
        allSizes.push(p.sizeMaxInches);
      }
    });

    const prices = nums(products, (p) => p.price);
    const ratings = nums(products, (p) => p.ratingAverage);

    const minMaxFromArray = (arr) => {
      if (!arr.length) return { min: 0, max: 0 };
      return { min: Math.min.apply(null, arr), max: Math.max.apply(null, arr) };
    };

    const sizeRangeInches = minMaxFromArray(allSizes);
    const priceRange = minMaxFromArray(prices);
    const ratingRange = minMaxFromArray(ratings);

    const sortOptions = [
      { value: 'relevance', label: 'Relevance' },
      { value: 'price_asc', label: 'Price: Low to High' },
      { value: 'price_desc', label: 'Price: High to Low' },
      { value: 'rating_desc', label: 'Rating: High to Low' },
      { value: 'popularity_desc', label: 'Most Popular' }
    ];

    return {
      categories,
      surfaceTypes,
      sizeRangeInches,
      priceRange,
      ratingRange,
      sortOptions
    };
  }

  // 29) searchProducts
  searchProducts(filters, sortBy, page, pageSize) {
    const f = filters || {};
    const sort = sortBy || 'relevance';
    const pg = page && page > 0 ? page : 1;
    const size = pageSize && pageSize > 0 ? pageSize : 20;

    const products = this._getFromStorage('products');

    let results = products.filter((p) => {
      if (f.categorySlug && p.categorySlug !== f.categorySlug) return false;
      if (typeof f.minPrice === 'number' && p.price < f.minPrice) return false;
      if (typeof f.maxPrice === 'number' && p.price > f.maxPrice) return false;
      if (typeof f.minRating === 'number' && (p.ratingAverage || 0) < f.minRating) return false;
      if (typeof f.isAvailable === 'boolean' && (p.isAvailable === true) !== (f.isAvailable === true)) return false;
      if (typeof f.isEggPan === 'boolean' && (p.isEggPan === true) !== (f.isEggPan === true)) return false;
      if (f.surfaceType && p.surfaceType !== f.surfaceType) return false;

      // size range overlap check
      const sizes = {
        min: typeof p.sizeMinInches === 'number' ? p.sizeMinInches : p.diameterInches,
        max: typeof p.sizeMaxInches === 'number' ? p.sizeMaxInches : p.diameterInches
      };

      if (typeof f.minSizeInches === 'number') {
        if (sizes.max != null && sizes.max < f.minSizeInches) return false;
      }

      if (typeof f.maxSizeInches === 'number') {
        if (sizes.min != null && sizes.min > f.maxSizeInches) return false;
      }

      return true;
    });

    results.sort((a, b) => {
      const priceA = a.price || 0;
      const priceB = b.price || 0;
      const ratingA = a.ratingAverage || 0;
      const ratingB = b.ratingAverage || 0;
      const popA = a.ratingCount || 0;
      const popB = b.ratingCount || 0;

      switch (sort) {
        case 'price_asc':
          if (priceA !== priceB) return priceA - priceB;
          return ratingB - ratingA;
        case 'price_desc':
          if (priceA !== priceB) return priceB - priceA;
          return ratingB - ratingA;
        case 'rating_desc':
          if (ratingB !== ratingA) return ratingB - ratingA;
          return popB - popA;
        case 'popularity_desc':
          if (popB !== popA) return popB - popA;
          return ratingB - ratingA;
        case 'relevance':
        default:
          if (ratingB !== ratingA) return ratingB - ratingA;
          if (popB !== popA) return popB - popA;
          return priceA - priceB;
      }
    });

    const totalCount = results.length;
    const startIndex = (pg - 1) * size;
    const pageResults = results.slice(startIndex, startIndex + size);

    const enrichedResults = pageResults.map((p) => this._resolveProductForeignKeys(p));

    return {
      results: enrichedResults,
      totalCount,
      page: pg,
      pageSize: size
    };
  }

  // 30) getProductDetail
  getProductDetail(productId) {
    const products = this._getFromStorage('products');
    const product = products.find((p) => p.id === productId) || null;
    if (!product) {
      return {
        product: null,
        reviewSummary: {
          ratingAverage: 0,
          ratingCount: 0
        },
        relatedProducts: []
      };
    }

    const reviews = this._getFromStorage('reviews').filter(
      (r) => r.targetType === 'product' && r.targetId === productId
    );
    const ratingCount = reviews.length;
    const sumRatings = reviews.reduce((sum, r) => sum + (r.rating || 0), 0);
    const ratingAverage = ratingCount ? sumRatings / ratingCount : product.ratingAverage || 0;

    const relatedProductsRaw = products
      .filter((p) => p.id !== productId && p.categorySlug === product.categorySlug)
      .slice(0, 6);
    const relatedProducts = relatedProductsRaw.map((p) => this._resolveProductForeignKeys(p));

    const enrichedProduct = this._resolveProductForeignKeys(product);

    return {
      product: enrichedProduct,
      reviewSummary: {
        ratingAverage,
        ratingCount
      },
      relatedProducts
    };
  }

  // 31) addProductToCart
  addProductToCart(productId, quantity) {
    const qty = typeof quantity === 'number' && quantity > 0 ? quantity : 1;
    const products = this._getFromStorage('products');
    const product = products.find((p) => p.id === productId) || null;
    if (!product) {
      return {
        cart: null,
        cartItems: [],
        message: 'Product not found.'
      };
    }

    const { cart, items } = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items');

    let cartItem = items.find((ci) => ci.productId === productId);
    if (cartItem) {
      // update quantity
      const idx = cartItems.findIndex((ci) => ci.id === cartItem.id);
      cartItem = {
        ...cartItem,
        quantity: cartItem.quantity + qty
      };
      if (idx !== -1) {
        cartItems[idx] = cartItem;
      }
    } else {
      cartItem = {
        id: this._generateId('cart_item'),
        cartId: cart.id,
        productId,
        quantity: qty,
        unitPrice: product.price,
        currency: product.currency || 'usd',
        addedAt: new Date().toISOString()
      };
      cartItems.push(cartItem);
    }

    // update cart updatedAt
    const carts = this._getFromStorage('carts');
    const cIdx = carts.findIndex((c) => c.id === cart.id);
    if (cIdx !== -1) {
      carts[cIdx] = {
        ...carts[cIdx],
        updatedAt: new Date().toISOString()
      };
      this._saveToStorage('carts', carts);
    }

    this._saveToStorage('cart_items', cartItems);

    const newItems = cartItems
      .filter((ci) => ci.cartId === cart.id)
      .map((ci) => this._resolveCartItemForeignKeys(ci));

    return {
      cart,
      cartItems: newItems,
      message: 'Product added to cart.'
    };
  }

  // 32) getCart
  getCart() {
    const { cart, items } = this._getOrCreateCart();
    const enrichedItems = items.map((ci) => {
      const enriched = this._resolveCartItemForeignKeys(ci);
      const lineSubtotal = (enriched.unitPrice || 0) * (enriched.quantity || 0);
      return {
        cartItem: enriched,
        product: enriched.product || null,
        lineSubtotal
      };
    });

    const subtotal = enrichedItems.reduce((sum, line) => sum + line.lineSubtotal, 0);
    const estimatedTotal = subtotal; // no tax/shipping in this logic

    return {
      cart,
      items: enrichedItems,
      currency: 'usd',
      subtotal,
      estimatedTotal
    };
  }

  // 33) updateCartItemQuantity
  updateCartItemQuantity(cartItemId, quantity) {
    const cartItems = this._getFromStorage('cart_items');
    const idx = cartItems.findIndex((ci) => ci.id === cartItemId);
    if (idx === -1) {
      return {
        cart: null,
        items: []
      };
    }

    if (quantity <= 0) {
      cartItems.splice(idx, 1);
    } else {
      cartItems[idx] = {
        ...cartItems[idx],
        quantity
      };
    }

    this._saveToStorage('cart_items', cartItems);

    const { cart, items } = this._getOrCreateCart();
    const enrichedItems = items.map((ci) => this._resolveCartItemForeignKeys(ci));

    return {
      cart,
      items: enrichedItems
    };
  }

  // 34) removeCartItem
  removeCartItem(cartItemId) {
    const cartItems = this._getFromStorage('cart_items');
    const newItems = cartItems.filter((ci) => ci.id !== cartItemId);
    this._saveToStorage('cart_items', newItems);

    const { cart, items } = this._getOrCreateCart();
    const enrichedItems = items.map((ci) => this._resolveCartItemForeignKeys(ci));

    return {
      cart,
      items: enrichedItems
    };
  }

  // 35) checkoutCart
  checkoutCart() {
    const carts = this._getFromStorage('carts');
    const idx = carts.findIndex((c) => c.status === 'active');
    if (idx === -1) {
      return {
        success: false,
        cart: null,
        message: 'No active cart to checkout.'
      };
    }

    const cart = {
      ...carts[idx],
      status: 'checked_out',
      updatedAt: new Date().toISOString()
    };
    carts[idx] = cart;
    this._saveToStorage('carts', carts);

    return {
      success: true,
      cart,
      message: 'Cart checked out successfully.'
    };
  }

  // 36) getAboutContent
  getAboutContent() {
    const about = this._getFromStorage('about_content', null);
    return about;
  }

  // 37) getHelpFaqs
  getHelpFaqs() {
    const faqs = this._getFromStorage('help_faqs', []);
    return faqs;
  }

  // 38) getLegalPageContent
  getLegalPageContent(pageSlug) {
    const legal = this._getFromStorage('legal_pages', {});
    const page = legal[pageSlug] || null;
    if (!page) {
      return {
        title: '',
        body: '',
        lastUpdated: null
      };
    }
    return page;
  }

  // 39) submitContactMessage
  submitContactMessage(name, email, subject, message) {
    const text = (message || '').trim();
    if (!text) {
      return {
        contactMessage: null,
        message: 'Message is required.'
      };
    }

    const contactMessages = this._getFromStorage('contact_messages');
    const now = new Date().toISOString();

    const contactMessage = {
      id: this._generateId('contact_message'),
      name: name || null,
      email: email || null,
      subject: subject || null,
      message: text,
      status: 'new',
      createdAt: now
    };

    contactMessages.push(contactMessage);
    this._saveToStorage('contact_messages', contactMessages);

    return {
      contactMessage,
      message: 'Contact message submitted.'
    };
  }

  // ---------- Legacy/template methods (wrappers) ----------

  // Provided by template; delegate to addProductToCart for compatibility
  addToCart(userId, productId, quantity) {
    return this.addProductToCart(productId, quantity);
  }

  _findOrCreateCart(userId) {
    // Kept for backward compatibility; delegate to _getOrCreateCart
    return this._getOrCreateCart();
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