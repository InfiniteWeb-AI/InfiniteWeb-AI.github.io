/*
  BusinessLogic for holistic wellness and nutrition blog
  - Uses localStorage for persistence (with Node.js polyfill)
  - Pure business logic, no DOM access
*/

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
    this._initStorage();
  }

  // -------------------- Storage helpers --------------------

  _initStorage() {
    const arrayKeys = [
      'recipes',
      'meal_plans',
      'meal_plan_items',
      'saved_recipes',
      'movement_sessions',
      'playlists',
      'playlist_items',
      'newsletter_topics',
      'newsletter_subscriptions',
      'articles',
      'article_comments',
      'reading_lists',
      'reading_list_items',
      'courses',
      'carts',
      'cart_items',
      'stress_assessment_questions',
      'stress_assessment_submissions',
      'meditation_programs',
      'meditation_collections',
      'meditation_collection_items',
      'contact_form_submissions'
    ];

    for (const key of arrayKeys) {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    }

    if (!localStorage.getItem('about_content')) {
      const about = {
        missionHtml: '<p>Our mission is to make holistic wellness, plant-centric nutrition, and mindful living feel doable and grounded in everyday life.</p>',
        editorialGuidelinesHtml: '<p>All content is reviewed for accuracy and balance, favoring evidence-based recommendations and practical, compassionate guidance.</p>',
        contributors: []
      };
      localStorage.setItem('about_content', JSON.stringify(about));
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }

    // Seed minimal static reference data where it makes sense
    this._seedNewsletterTopicsIfEmpty();
    this._seedStressQuestionsIfEmpty();
  }

  _getFromStorage(key, defaultValue) {
    const raw = localStorage.getItem(key);
    if (!raw) {
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

  _now() {
    return new Date().toISOString();
  }

  _stringContains(text, query) {
    if (!query) return true;
    if (!text) return false;
    return String(text).toLowerCase().indexOf(String(query).toLowerCase()) !== -1;
  }

  _seedNewsletterTopicsIfEmpty() {
    const topics = this._getFromStorage('newsletter_topics', []);
    if (topics && topics.length > 0) return;
    const now = this._now();
    const seeded = [
      {
        id: this._generateId('newsletter_topic'),
        key: 'plant_based_nutrition',
        label: 'Plant-based nutrition',
        description: 'Recipes, tips, and guidance for eating more plants',
        is_active: true,
        created_at: now,
        updated_at: now
      },
      {
        id: this._generateId('newsletter_topic'),
        key: 'mindfulness_meditation',
        label: 'Mindfulness & meditation',
        description: 'Mindfulness practices, meditations, and stress support',
        is_active: true,
        created_at: now,
        updated_at: now
      },
      {
        id: this._generateId('newsletter_topic'),
        key: 'general_wellness',
        label: 'General wellness',
        description: 'Holistic wellness and lifestyle',
        is_active: true,
        created_at: now,
        updated_at: now
      },
      {
        id: this._generateId('newsletter_topic'),
        key: 'movement_fitness',
        label: 'Movement & fitness',
        description: 'Gentle fitness, yoga, and movement tips',
        is_active: true,
        created_at: now,
        updated_at: now
      },
      {
        id: this._generateId('newsletter_topic'),
        key: 'sleep',
        label: 'Sleep',
        description: 'Healthy sleep routines and science-backed tips',
        is_active: true,
        created_at: now,
        updated_at: now
      }
    ];
    this._saveToStorage('newsletter_topics', seeded);
  }

  _seedStressQuestionsIfEmpty() {
    const questions = this._getFromStorage('stress_assessment_questions', []);
    if (questions && questions.length > 0) return;
    const now = this._now();
    const seeded = [
      {
        id: this._generateId('stress_q'),
        text: 'How often do you feel overwhelmed by your to-do list?',
        order: 1,
        scale: 'frequency',
        options: ['Never', 'Sometimes', 'Often', 'Almost always'],
        created_at: now,
        updated_at: now
      },
      {
        id: this._generateId('stress_q'),
        text: 'How intense does your stress feel in your body (e.g., tension, racing heart)?',
        order: 2,
        scale: 'intensity',
        options: ['Not at all', 'Mild', 'Moderate', 'Severe'],
        created_at: now,
        updated_at: now
      },
      {
        id: this._generateId('stress_q'),
        text: 'How much does stress interfere with your sleep or ability to wind down?',
        order: 3,
        scale: 'impact',
        options: ['Not at all', 'A little', 'Quite a bit', 'A lot'],
        created_at: now,
        updated_at: now
      }
    ];
    this._saveToStorage('stress_assessment_questions', seeded);
  }

  // -------------------- Private domain helpers --------------------

  _getOrCreateCart() {
    let carts = this._getFromStorage('carts', []);
    if (carts.length === 0) {
      const cart = {
        id: this._generateId('cart'),
        created_at: this._now(),
        updated_at: this._now(),
        total_price: 0
      };
      carts.push(cart);
      this._saveToStorage('carts', carts);
      return cart;
    }
    return carts[0];
  }

  _recalculateCartTotal(cartId) {
    let carts = this._getFromStorage('carts', []);
    let cartItems = this._getFromStorage('cart_items', []);
    const cart = carts.find(c => c.id === cartId);
    if (!cart) return null;
    const itemsForCart = cartItems.filter(ci => ci.cart_id === cartId);
    let total = 0;
    for (const item of itemsForCart) {
      const qty = item.quantity || 1;
      const priceEach = item.price_each || 0;
      total += qty * priceEach;
    }
    cart.total_price = total;
    cart.updated_at = this._now();
    this._saveToStorage('carts', carts);
    return cart;
  }

  _getOrCreateMealPlanForDate(date) {
    const normalizedDate = String(date).slice(0, 10); // YYYY-MM-DD
    let mealPlans = this._getFromStorage('meal_plans', []);
    let mealPlan = mealPlans.find(mp => (mp.date || '').slice(0, 10) === normalizedDate);
    if (!mealPlan) {
      mealPlan = {
        id: this._generateId('meal_plan'),
        date: normalizedDate,
        name: null,
        total_calories: 0,
        created_at: this._now(),
        updated_at: this._now()
      };
      mealPlans.push(mealPlan);
      this._saveToStorage('meal_plans', mealPlans);
    }
    return mealPlan;
  }

  _recalculateMealPlanNutrition(mealPlanId) {
    let mealPlans = this._getFromStorage('meal_plans', []);
    let items = this._getFromStorage('meal_plan_items', []);
    const recipes = this._getFromStorage('recipes', []);
    const mealPlan = mealPlans.find(mp => mp.id === mealPlanId);
    if (!mealPlan) return null;

    const planItems = items.filter(i => i.meal_plan_id === mealPlanId);
    let totalCalories = 0;

    for (const item of planItems) {
      const recipe = recipes.find(r => r.id === item.recipe_id);
      if (recipe) {
        const servings = item.servings || 1;
        totalCalories += (recipe.calories_per_serving || 0) * servings;
      }
    }

    mealPlan.total_calories = totalCalories;
    mealPlan.updated_at = this._now();
    this._saveToStorage('meal_plans', mealPlans);
    return mealPlan;
  }

  _recalculatePlaylistDuration(playlistId) {
    let playlists = this._getFromStorage('playlists', []);
    let playlistItems = this._getFromStorage('playlist_items', []);
    const sessions = this._getFromStorage('movement_sessions', []);
    const playlist = playlists.find(p => p.id === playlistId);
    if (!playlist) return null;

    const itemsForPlaylist = playlistItems.filter(i => i.playlist_id === playlistId);
    let total = 0;
    for (const item of itemsForPlaylist) {
      const session = sessions.find(s => s.id === item.session_id);
      if (session) {
        total += session.duration_minutes || 0;
      }
    }

    playlist.total_duration_minutes = total;
    playlist.updated_at = this._now();
    this._saveToStorage('playlists', playlists);
    return playlist;
  }

  _getOrCreateMeditationCollectionByName(name) {
    const trimmed = String(name || '').trim();
    if (!trimmed) return null;
    let collections = this._getFromStorage('meditation_collections', []);
    let collection = collections.find(c => (c.name || '').toLowerCase() === trimmed.toLowerCase());
    if (!collection) {
      collection = {
        id: this._generateId('med_collection'),
        name: trimmed,
        description: null,
        created_at: this._now(),
        updated_at: this._now()
      };
      collections.push(collection);
      this._saveToStorage('meditation_collections', collections);
    }
    return collection;
  }

  _getOrCreateReadingListByName(name) {
    const trimmed = String(name || '').trim();
    if (!trimmed) return null;
    let lists = this._getFromStorage('reading_lists', []);
    let list = lists.find(l => (l.name || '').toLowerCase() === trimmed.toLowerCase());
    if (!list) {
      list = {
        id: this._generateId('reading_list'),
        name: trimmed,
        description: null,
        created_at: this._now(),
        updated_at: this._now()
      };
      lists.push(list);
      this._saveToStorage('reading_lists', lists);
    }
    return list;
  }

  // -------------------- 1. Homepage overview --------------------

  getHomeOverview() {
    const recipes = this._getFromStorage('recipes', []);
    const articles = this._getFromStorage('articles', []);
    const movementSessions = this._getFromStorage('movement_sessions', []);
    const courses = this._getFromStorage('courses', []);

    const featuredRecipes = recipes
      .slice()
      .sort((a, b) => {
        const aDate = a.created_at || a.updated_at || '';
        const bDate = b.created_at || b.updated_at || '';
        return (bDate > aDate) ? 1 : (bDate < aDate ? -1 : 0);
      })
      .slice(0, 5);

    const featuredArticles = articles
      .slice()
      .sort((a, b) => {
        const aFeat = a.is_featured ? 1 : 0;
        const bFeat = b.is_featured ? 1 : 0;
        if (aFeat !== bFeat) return bFeat - aFeat;
        const aDate = a.published_at || '';
        const bDate = b.published_at || '';
        return (bDate > aDate) ? 1 : (bDate < aDate ? -1 : 0);
      })
      .slice(0, 5);

    const featuredMovementSessions = movementSessions
      .slice()
      .sort((a, b) => {
        const aPop = a.popularity_score || 0;
        const bPop = b.popularity_score || 0;
        return bPop - aPop;
      })
      .slice(0, 5);

    const featuredCourses = courses
      .slice()
      .sort((a, b) => {
        const aPop = a.popularity_score || 0;
        const bPop = b.popularity_score || 0;
        return bPop - aPop;
      })
      .slice(0, 5);

    const today = new Date().toISOString().slice(0, 10);
    const planData = this.getMealPlanForDate(today);
    const hasMealPlan = !!(planData && planData.mealPlan && planData.mealPlan.id);
    const todaySummary = {
      hasMealPlan,
      date: today,
      mealPlan: planData.mealPlan || null,
      totalCalories: planData.nutritionSummary ? planData.nutritionSummary.totalCalories : 0,
      mealsCount: (planData.itemsWithRecipes || []).length,
      mealTypesPresent: Array.from(
        new Set((planData.itemsWithRecipes || []).map(ir => ir.item.meal_type))
      )
    };

    return {
      featuredRecipes,
      featuredArticles,
      featuredMovementSessions,
      featuredCourses,
      todaySummary
    };
  }

  // -------------------- 2. Global search --------------------

  globalSearch(query, types, page, pageSize) {
    const q = (query || '').trim();
    const pageNum = page && page > 0 ? page : 1;
    const size = pageSize && pageSize > 0 ? pageSize : 10;
    const start = (pageNum - 1) * size;

    const typeSet = (types && types.length) ? types : [
      'recipes',
      'articles',
      'movement_sessions',
      'courses',
      'meditation_programs'
    ];

    const result = {
      recipes: [],
      articles: [],
      movementSessions: [],
      courses: [],
      meditationPrograms: []
    };

    if (typeSet.includes('recipes')) {
      const all = this._getFromStorage('recipes', []);
      const filtered = all.filter(r =>
        this._stringContains(r.title, q) ||
        this._stringContains(r.description, q) ||
        (Array.isArray(r.ingredients) && r.ingredients.some(ing => this._stringContains(ing, q)))
      );
      result.recipes = filtered.slice(start, start + size);
    }

    if (typeSet.includes('articles')) {
      const all = this._getFromStorage('articles', []);
      const filtered = all.filter(a =>
        this._stringContains(a.title, q) ||
        this._stringContains(a.content, q) ||
        this._stringContains(a.excerpt, q)
      );
      result.articles = filtered.slice(start, start + size);
    }

    if (typeSet.includes('movement_sessions')) {
      const all = this._getFromStorage('movement_sessions', []);
      const filtered = all.filter(s =>
        this._stringContains(s.title, q) ||
        this._stringContains(s.description, q)
      );
      result.movementSessions = filtered.slice(start, start + size);
    }

    if (typeSet.includes('courses')) {
      const all = this._getFromStorage('courses', []);
      const filtered = all.filter(c =>
        this._stringContains(c.title, q) ||
        this._stringContains(c.description, q)
      );
      result.courses = filtered.slice(start, start + size);
    }

    if (typeSet.includes('meditation_programs')) {
      const all = this._getFromStorage('meditation_programs', []);
      const filtered = all.filter(p =>
        this._stringContains(p.title, q) ||
        this._stringContains(p.description, q)
      );
      result.meditationPrograms = filtered.slice(start, start + size);
    }

    return result;
  }

  // -------------------- 3. Recipes & meal planner --------------------

  getRecipeFilterOptions() {
    const mealTypes = [
      { value: 'breakfast', label: 'Breakfast' },
      { value: 'lunch', label: 'Lunch' },
      { value: 'dinner', label: 'Dinner' },
      { value: 'snack', label: 'Snack' }
    ];

    const categories = [
      { value: 'main_dish', label: 'Main dish' },
      { value: 'dessert', label: 'Dessert' },
      { value: 'side', label: 'Side' },
      { value: 'snack', label: 'Snack' },
      { value: 'drink', label: 'Drink' },
      { value: 'appetizer', label: 'Appetizer' },
      { value: 'salad', label: 'Salad' },
      { value: 'soup', label: 'Soup' },
      { value: 'breakfast', label: 'Breakfast category' }
    ];

    const diets = [
      { value: 'omnivore', label: 'Omnivore' },
      { value: 'vegetarian', label: 'Vegetarian' },
      { value: 'vegan', label: 'Vegan' },
      { value: 'pescatarian', label: 'Pescatarian' },
      { value: 'plant_based', label: 'Plant-based' },
      { value: 'keto', label: 'Keto' },
      { value: 'low_carb', label: 'Low carb' }
    ];

    const dietaryTags = [
      { value: 'nut_free', label: 'Nut-free' },
      { value: 'gluten_free', label: 'Gluten-free' },
      { value: 'dairy_free', label: 'Dairy-free' },
      { value: 'soy_free', label: 'Soy-free' }
    ];

    const ratingThresholds = [3, 3.5, 4, 4.5, 5];

    const sortOptions = [
      { value: 'relevance', label: 'Relevance' },
      { value: 'calories_asc', label: 'Calories: Low to High' },
      { value: 'calories_desc', label: 'Calories: High to Low' },
      { value: 'time_asc', label: 'Time: Short to Long' },
      { value: 'time_desc', label: 'Time: Long to Short' },
      { value: 'rating_desc', label: 'Rating: High to Low' },
      { value: 'created_at_desc', label: 'Newest first' },
      { value: 'created_at_asc', label: 'Oldest first' }
    ];

    return { mealTypes, categories, diets, dietaryTags, ratingThresholds, sortOptions };
  }

  searchRecipes(
    query,
    mealType,
    category,
    diet,
    dietaryTags,
    minCalories,
    maxCalories,
    minTimeMinutes,
    maxTimeMinutes,
    minRating,
    sortBy,
    sortDirection,
    page,
    pageSize
  ) {
    const q = (query || '').trim();
    const recipes = this._getFromStorage('recipes', []);

    let filtered = recipes.filter(r => {
      if (mealType && r.meal_type !== mealType) return false;
      if (category && r.category !== category) return false;
      if (diet && r.diet !== diet) return false;

      if (Array.isArray(dietaryTags) && dietaryTags.length > 0) {
        const tags = r.dietary_tags || [];
        for (const tag of dietaryTags) {
          if (!tags.includes(tag)) return false;
        }
      }

      if (minCalories != null && r.calories_per_serving != null && r.calories_per_serving < minCalories) {
        return false;
      }
      if (maxCalories != null && r.calories_per_serving != null && r.calories_per_serving > maxCalories) {
        return false;
      }

      if (minTimeMinutes != null && r.total_time_minutes != null && r.total_time_minutes < minTimeMinutes) {
        return false;
      }
      if (maxTimeMinutes != null && r.total_time_minutes != null && r.total_time_minutes > maxTimeMinutes) {
        return false;
      }

      if (minRating != null && r.rating != null && r.rating < minRating) return false;

      if (q) {
        const inText = this._stringContains(r.title, q) || this._stringContains(r.description, q);
        const inIngredients = Array.isArray(r.ingredients) && r.ingredients.some(ing => this._stringContains(ing, q));
        if (!inText && !inIngredients) return false;
      }

      return true;
    });

    // Sorting
    const sortKey = sortBy || 'relevance';
    const dir = (sortDirection || 'asc').toLowerCase() === 'desc' ? -1 : 1;

    if (sortKey !== 'relevance') {
      filtered = filtered.slice();
      filtered.sort((a, b) => {
        let av, bv;
        if (sortKey === 'calories') {
          av = a.calories_per_serving || 0;
          bv = b.calories_per_serving || 0;
        } else if (sortKey === 'time') {
          av = a.total_time_minutes || 0;
          bv = b.total_time_minutes || 0;
        } else if (sortKey === 'rating') {
          av = a.rating || 0;
          bv = b.rating || 0;
        } else if (sortKey === 'created_at') {
          av = a.created_at || '';
          bv = b.created_at || '';
        } else {
          // fallback: title
          av = a.title || '';
          bv = b.title || '';
        }
        if (av < bv) return -1 * dir;
        if (av > bv) return 1 * dir;
        return 0;
      });
    }

    const pageNum = page && page > 0 ? page : 1;
    const size = pageSize && pageSize > 0 ? pageSize : 20;
    const start = (pageNum - 1) * size;
    const results = filtered.slice(start, start + size);

    return {
      results,
      total: filtered.length,
      page: pageNum,
      pageSize: size,
      appliedFilters: {
        mealType: mealType || null,
        category: category || null,
        diet: diet || null,
        dietaryTags: dietaryTags || [],
        minCalories: minCalories != null ? minCalories : null,
        maxCalories: maxCalories != null ? maxCalories : null,
        minTimeMinutes: minTimeMinutes != null ? minTimeMinutes : null,
        maxTimeMinutes: maxTimeMinutes != null ? maxTimeMinutes : null,
        minRating: minRating != null ? minRating : null,
        sortBy: sortKey,
        sortDirection: sortDirection || 'asc'
      }
    };
  }

  getRecipeDetail(recipeId) {
    const recipes = this._getFromStorage('recipes', []);
    const savedRecipes = this._getFromStorage('saved_recipes', []);
    const recipe = recipes.find(r => r.id === recipeId) || null;
    const isSaved = !!savedRecipes.find(s => s.recipe_id === recipeId);

    let relatedRecipes = [];
    if (recipe) {
      relatedRecipes = recipes
        .filter(r => r.id !== recipe.id && (r.category === recipe.category || r.meal_type === recipe.meal_type))
        .slice(0, 6);
    }

    return { recipe, isSaved, relatedRecipes };
  }

  saveRecipe(recipeId, notes) {
    const recipes = this._getFromStorage('recipes', []);
    const recipe = recipes.find(r => r.id === recipeId);
    if (!recipe) {
      return { success: false, savedRecipe: null, message: 'Recipe not found.' };
    }

    let savedRecipes = this._getFromStorage('saved_recipes', []);
    let saved = savedRecipes.find(s => s.recipe_id === recipeId);
    const now = this._now();

    if (saved) {
      saved.notes = notes != null ? notes : saved.notes;
      saved.saved_at = now;
    } else {
      saved = {
        id: this._generateId('saved_recipe'),
        recipe_id: recipeId,
        saved_at: now,
        notes: notes != null ? notes : null
      };
      savedRecipes.push(saved);
    }

    this._saveToStorage('saved_recipes', savedRecipes);
    return { success: true, savedRecipe: saved, message: 'Recipe saved.' };
  }

  removeSavedRecipe(recipeId) {
    let savedRecipes = this._getFromStorage('saved_recipes', []);
    const before = savedRecipes.length;
    savedRecipes = savedRecipes.filter(s => s.recipe_id !== recipeId);
    this._saveToStorage('saved_recipes', savedRecipes);
    const removed = before !== savedRecipes.length;
    return { success: removed, message: removed ? 'Saved recipe removed.' : 'Saved recipe not found.' };
  }

  getSavedRecipes() {
    const savedRecipes = this._getFromStorage('saved_recipes', []);
    const recipes = this._getFromStorage('recipes', []);

    const saved = savedRecipes.map(s => {
      const recipe = recipes.find(r => r.id === s.recipe_id) || null;
      return { saved: s, recipe };
    });

    return { savedRecipes: saved };
  }

  addRecipeToMealPlan(recipeId, date, mealType, position, servings) {
    const recipes = this._getFromStorage('recipes', []);
    const recipe = recipes.find(r => r.id === recipeId);
    if (!recipe) {
      return { success: false, mealPlan: null, items: [], totalCalories: 0, message: 'Recipe not found.' };
    }

    const mealPlan = this._getOrCreateMealPlanForDate(date);
    let items = this._getFromStorage('meal_plan_items', []);

    const itemsForType = items.filter(i => i.meal_plan_id === mealPlan.id && i.meal_type === mealType);
    let pos;
    if (position != null) {
      pos = position;
    } else {
      const maxPos = itemsForType.reduce((max, i) => Math.max(max, i.position || 0), 0);
      pos = maxPos + 1;
    }

    const item = {
      id: this._generateId('meal_plan_item'),
      meal_plan_id: mealPlan.id,
      recipe_id: recipeId,
      meal_type: mealType,
      position: pos,
      servings: servings != null ? servings : 1,
      added_at: this._now()
    };

    items.push(item);
    this._saveToStorage('meal_plan_items', items);
    const updatedPlan = this._recalculateMealPlanNutrition(mealPlan.id) || mealPlan;

    const allItemsForPlan = items.filter(i => i.meal_plan_id === mealPlan.id);
    return {
      success: true,
      mealPlan: updatedPlan,
      items: allItemsForPlan,
      totalCalories: updatedPlan.total_calories || 0,
      message: 'Recipe added to meal plan.'
    };
  }

  getMealPlanForDate(date) {
    const normalizedDate = String(date).slice(0, 10);
    const mealPlans = this._getFromStorage('meal_plans', []);
    const items = this._getFromStorage('meal_plan_items', []);
    const recipes = this._getFromStorage('recipes', []);

    const mealPlan = mealPlans.find(mp => (mp.date || '').slice(0, 10) === normalizedDate) || null;
    if (!mealPlan) {
      return {
        mealPlan: null,
        itemsWithRecipes: [],
        nutritionSummary: {
          totalCalories: 0,
          totalProteinGrams: 0,
          totalCarbsGrams: 0,
          totalFatGrams: 0
        }
      };
    }

    const itemsForPlan = items.filter(i => i.meal_plan_id === mealPlan.id);
    let totalCalories = 0;
    let totalProtein = 0;
    let totalCarbs = 0;
    let totalFat = 0;

    const itemsWithRecipes = itemsForPlan.map(i => {
      const recipe = recipes.find(r => r.id === i.recipe_id) || null;
      const servings = i.servings || 1;
      if (recipe) {
        totalCalories += (recipe.calories_per_serving || 0) * servings;
        totalProtein += (recipe.nutrition_protein_grams || 0) * servings;
        totalCarbs += (recipe.nutrition_carbs_grams || 0) * servings;
        totalFat += (recipe.nutrition_fat_grams || 0) * servings;
      }
      return { item: i, recipe };
    });

    const nutritionSummary = {
      totalCalories,
      totalProteinGrams: totalProtein,
      totalCarbsGrams: totalCarbs,
      totalFatGrams: totalFat
    };

    return { mealPlan, itemsWithRecipes, nutritionSummary };
  }

  updateMealPlanName(date, name) {
    const mealPlan = this._getOrCreateMealPlanForDate(date);
    let mealPlans = this._getFromStorage('meal_plans', []);
    const existing = mealPlans.find(mp => mp.id === mealPlan.id);
    if (existing) {
      existing.name = name;
      existing.updated_at = this._now();
      this._saveToStorage('meal_plans', mealPlans);
      return { success: true, mealPlan: existing, message: 'Meal plan name updated.' };
    }
    return { success: false, mealPlan: null, message: 'Meal plan not found.' };
  }

  removeMealFromPlan(mealPlanItemId) {
    let items = this._getFromStorage('meal_plan_items', []);
    const item = items.find(i => i.id === mealPlanItemId);
    if (!item) {
      return { success: false, mealPlan: null, items: [], totalCalories: 0, message: 'Meal plan item not found.' };
    }

    const mealPlanId = item.meal_plan_id;
    items = items.filter(i => i.id !== mealPlanItemId);
    this._saveToStorage('meal_plan_items', items);

    const mealPlan = this._recalculateMealPlanNutrition(mealPlanId);
    const remainingItems = items.filter(i => i.meal_plan_id === mealPlanId);

    return {
      success: true,
      mealPlan,
      items: remainingItems,
      totalCalories: mealPlan ? mealPlan.total_calories || 0 : 0,
      message: 'Meal removed from plan.'
    };
  }

  // -------------------- 4. Movement & playlists --------------------

  getMovementFilterOptions() {
    const categories = [
      { value: 'yoga', label: 'Yoga' },
      { value: 'pilates', label: 'Pilates' },
      { value: 'strength', label: 'Strength' },
      { value: 'cardio', label: 'Cardio' },
      { value: 'stretching', label: 'Stretching' },
      { value: 'meditation', label: 'Meditation' }
    ];

    const levels = [
      { value: 'beginner', label: 'Beginner' },
      { value: 'intermediate', label: 'Intermediate' },
      { value: 'advanced', label: 'Advanced' },
      { value: 'all_levels', label: 'All levels' }
    ];

    const durationRangesMinutes = [
      { min: 0, max: 10, label: 'Up to 10 minutes' },
      { min: 10, max: 20, label: '10–20 minutes' },
      { min: 20, max: 40, label: '20–40 minutes' },
      { min: 40, max: 999, label: '40+ minutes' }
    ];

    const sortOptions = [
      { value: 'duration_asc', label: 'Duration: Short to Long' },
      { value: 'duration_desc', label: 'Duration: Long to Short' },
      { value: 'popularity_desc', label: 'Most popular' },
      { value: 'created_at_desc', label: 'Newest first' }
    ];

    return { categories, levels, durationRangesMinutes, sortOptions };
  }

  searchMovementSessions(
    query,
    category,
    level,
    minDurationMinutes,
    maxDurationMinutes,
    sortBy,
    sortDirection,
    page,
    pageSize
  ) {
    const q = (query || '').trim();
    const sessions = this._getFromStorage('movement_sessions', []);

    let filtered = sessions.filter(s => {
      if (category && s.category !== category) return false;
      if (level && s.level !== level) return false;

      if (minDurationMinutes != null && s.duration_minutes != null && s.duration_minutes < minDurationMinutes) {
        return false;
      }
      if (maxDurationMinutes != null && s.duration_minutes != null && s.duration_minutes > maxDurationMinutes) {
        return false;
      }

      if (q) {
        if (!this._stringContains(s.title, q) && !this._stringContains(s.description, q)) return false;
      }

      return true;
    });

    const key = sortBy || 'duration';
    const dir = (sortDirection || 'asc').toLowerCase() === 'desc' ? -1 : 1;

    filtered = filtered.slice().sort((a, b) => {
      let av, bv;
      if (key === 'duration') {
        av = a.duration_minutes || 0;
        bv = b.duration_minutes || 0;
      } else if (key === 'popularity') {
        av = a.popularity_score || 0;
        bv = b.popularity_score || 0;
      } else if (key === 'created_at') {
        av = a.created_at || '';
        bv = b.created_at || '';
      } else {
        av = a.title || '';
        bv = b.title || '';
      }
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });

    const pageNum = page && page > 0 ? page : 1;
    const size = pageSize && pageSize > 0 ? pageSize : 20;
    const start = (pageNum - 1) * size;
    const results = filtered.slice(start, start + size);

    return { results, total: filtered.length, page: pageNum, pageSize: size };
  }

  getMovementSessionDetail(sessionId) {
    const sessions = this._getFromStorage('movement_sessions', []);
    const session = sessions.find(s => s.id === sessionId) || null;
    return { session };
  }

  addSessionToPlaylist(sessionId, playlistId, newPlaylistName) {
    const sessions = this._getFromStorage('movement_sessions', []);
    const session = sessions.find(s => s.id === sessionId);
    if (!session) {
      return { success: false, playlist: null, totalDurationMinutes: 0, message: 'Session not found.' };
    }

    let playlists = this._getFromStorage('playlists', []);
    let playlistItems = this._getFromStorage('playlist_items', []);

    let playlist = null;
    if (playlistId) {
      playlist = playlists.find(p => p.id === playlistId) || null;
    } else if (newPlaylistName) {
      playlist = {
        id: this._generateId('playlist'),
        name: String(newPlaylistName).trim(),
        description: null,
        total_duration_minutes: 0,
        created_at: this._now(),
        updated_at: this._now()
      };
      playlists.push(playlist);
      this._saveToStorage('playlists', playlists);
    }

    if (!playlist) {
      return { success: false, playlist: null, totalDurationMinutes: 0, message: 'Playlist not found or name not provided.' };
    }

    const itemsForPlaylist = playlistItems.filter(i => i.playlist_id === playlist.id);
    const maxPos = itemsForPlaylist.reduce((max, i) => Math.max(max, i.position || 0), 0);
    const playlistItem = {
      id: this._generateId('playlist_item'),
      playlist_id: playlist.id,
      session_id: sessionId,
      position: maxPos + 1,
      added_at: this._now()
    };

    playlistItems.push(playlistItem);
    this._saveToStorage('playlist_items', playlistItems);
    const updatedPlaylist = this._recalculatePlaylistDuration(playlist.id) || playlist;

    return {
      success: true,
      playlist: updatedPlaylist,
      totalDurationMinutes: updatedPlaylist.total_duration_minutes || 0,
      message: 'Session added to playlist.'
    };
  }

  getPlaylists() {
    const playlists = this._getFromStorage('playlists', []);
    return { playlists };
  }

  getPlaylistDetail(playlistId) {
    const playlists = this._getFromStorage('playlists', []);
    const playlistItems = this._getFromStorage('playlist_items', []);
    const sessions = this._getFromStorage('movement_sessions', []);

    const playlist = playlists.find(p => p.id === playlistId) || null;
    if (!playlist) {
      return { playlist: null, items: [], totalDurationMinutes: 0 };
    }

    const itemsForPlaylist = playlistItems
      .filter(i => i.playlist_id === playlist.id)
      .sort((a, b) => (a.position || 0) - (b.position || 0));

    let total = 0;
    const items = itemsForPlaylist.map(pi => {
      const session = sessions.find(s => s.id === pi.session_id) || null;
      if (session) total += session.duration_minutes || 0;
      return { playlistItem: pi, session };
    });

    return { playlist, items, totalDurationMinutes: total };
  }

  renamePlaylist(playlistId, newName) {
    let playlists = this._getFromStorage('playlists', []);
    const playlist = playlists.find(p => p.id === playlistId);
    if (!playlist) {
      return { success: false, playlist: null, message: 'Playlist not found.' };
    }
    playlist.name = String(newName || '').trim();
    playlist.updated_at = this._now();
    this._saveToStorage('playlists', playlists);
    return { success: true, playlist, message: 'Playlist renamed.' };
  }

  deletePlaylist(playlistId) {
    let playlists = this._getFromStorage('playlists', []);
    let playlistItems = this._getFromStorage('playlist_items', []);

    const exists = playlists.some(p => p.id === playlistId);
    playlists = playlists.filter(p => p.id !== playlistId);
    playlistItems = playlistItems.filter(i => i.playlist_id !== playlistId);

    this._saveToStorage('playlists', playlists);
    this._saveToStorage('playlist_items', playlistItems);

    return { success: exists, message: exists ? 'Playlist deleted.' : 'Playlist not found.' };
  }

  reorderPlaylistSessions(playlistId, orderedPlaylistItemIds) {
    let playlistItems = this._getFromStorage('playlist_items', []);
    const playlists = this._getFromStorage('playlists', []);
    const playlist = playlists.find(p => p.id === playlistId) || null;
    if (!playlist) {
      return { success: false, playlist: null, items: [], message: 'Playlist not found.' };
    }

    const idOrder = orderedPlaylistItemIds || [];
    let pos = 1;
    for (const id of idOrder) {
      const item = playlistItems.find(pi => pi.id === id && pi.playlist_id === playlistId);
      if (item) {
        item.position = pos++;
      }
    }

    this._saveToStorage('playlist_items', playlistItems);
    const updatedItems = playlistItems.filter(i => i.playlist_id === playlistId);
    return { success: true, playlist, items: updatedItems };
  }

  removeSessionFromPlaylist(playlistItemId) {
    let playlistItems = this._getFromStorage('playlist_items', []);
    const item = playlistItems.find(pi => pi.id === playlistItemId);
    if (!item) {
      return { success: false, playlist: null, items: [], message: 'Playlist item not found.' };
    }

    const playlistId = item.playlist_id;
    playlistItems = playlistItems.filter(pi => pi.id !== playlistItemId);
    this._saveToStorage('playlist_items', playlistItems);

    const playlist = this._recalculatePlaylistDuration(playlistId);
    const items = playlistItems.filter(pi => pi.playlist_id === playlistId);

    return { success: true, playlist, items };
  }

  // -------------------- 5. Newsletter --------------------

  getNewsletterTopics() {
    const topics = this._getFromStorage('newsletter_topics', []);
    return { topics };
  }

  getCurrentNewsletterSubscription() {
    const subs = this._getFromStorage('newsletter_subscriptions', []);
    const subscription = subs.length > 0 ? subs[subs.length - 1] : null;
    return { subscription };
  }

  createOrUpdateNewsletterSubscription(
    email,
    firstName,
    topics,
    frequency,
    preferredSendDay,
    receiveRecipeRoundups,
    receiveOtherPromos
  ) {
    let subs = this._getFromStorage('newsletter_subscriptions', []);
    const now = this._now();
    const normEmail = String(email || '').trim().toLowerCase();

    let sub = subs.find(s => (s.email || '').toLowerCase() === normEmail);
    if (sub) {
      sub.first_name = firstName || null;
      sub.topics = Array.isArray(topics) ? topics : [];
      sub.frequency = frequency;
      sub.preferred_send_day = preferredSendDay || null;
      sub.receive_recipe_roundups = !!receiveRecipeRoundups;
      sub.receive_other_promos = !!receiveOtherPromos;
      sub.updated_at = now;
    } else {
      sub = {
        id: this._generateId('newsletter_sub'),
        email: normEmail,
        first_name: firstName || null,
        topics: Array.isArray(topics) ? topics : [],
        frequency,
        preferred_send_day: preferredSendDay || null,
        receive_recipe_roundups: !!receiveRecipeRoundups,
        receive_other_promos: !!receiveOtherPromos,
        created_at: now,
        updated_at: now
      };
      subs.push(sub);
    }

    this._saveToStorage('newsletter_subscriptions', subs);
    return { success: true, subscription: sub, message: 'Subscription saved.' };
  }

  // -------------------- 6. Articles & reading lists --------------------

  getArticleFilterOptions() {
    const categories = [
      { value: 'sleep', label: 'Sleep' },
      { value: 'mindful_eating', label: 'Mindful eating' },
      { value: 'nutrition', label: 'Nutrition' },
      { value: 'movement', label: 'Movement' },
      { value: 'stress', label: 'Stress' },
      { value: 'general_wellness', label: 'General wellness' }
    ];

    const sortOptions = [
      { value: 'published_at_desc', label: 'Newest first' },
      { value: 'published_at_asc', label: 'Oldest first' },
      { value: 'popularity_desc', label: 'Most popular' }
    ];

    const today = new Date();
    const thisYear = today.getFullYear();
    const startOfYear = new Date(thisYear, 0, 1).toISOString().slice(0, 10);
    const sevenDaysAgo = new Date(today.getTime() - 7 * 86400000).toISOString().slice(0, 10);
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 86400000).toISOString().slice(0, 10);

    const dateRangePresets = [
      { fromDate: sevenDaysAgo, toDate: today.toISOString().slice(0, 10), label: 'Last 7 days' },
      { fromDate: thirtyDaysAgo, toDate: today.toISOString().slice(0, 10), label: 'Last 30 days' },
      { fromDate: startOfYear, toDate: today.toISOString().slice(0, 10), label: 'This year' }
    ];

    return { categories, sortOptions, dateRangePresets };
  }

  searchArticles(
    category,
    query,
    fromDate,
    toDate,
    sortBy,
    sortDirection,
    page,
    pageSize
  ) {
    const q = (query || '').trim();
    const articles = this._getFromStorage('articles', []);

    let filtered = articles.filter(a => {
      if (category && a.category !== category) return false;
      if (fromDate && (a.published_at || '') < fromDate) return false;
      if (toDate && (a.published_at || '') > toDate) return false;

      if (q) {
        const terms = q.split(/\s+/).filter(Boolean);
        const haystacks = [a.title, a.content, a.excerpt];
        const matches = terms.some(term =>
          haystacks.some(text => this._stringContains(text, term))
        );
        if (!matches) {
          return false;
        }
      }

      return true;
    });

    const key = sortBy || 'published_at';
    const dir = (sortDirection || 'desc').toLowerCase() === 'asc' ? 1 : -1;

    filtered = filtered.slice().sort((a, b) => {
      let av, bv;
      if (key === 'published_at') {
        av = a.published_at || '';
        bv = b.published_at || '';
      } else if (key === 'popularity') {
        const aPop = (a.likes_count || 0) + (a.comment_count || 0);
        const bPop = (b.likes_count || 0) + (b.comment_count || 0);
        av = aPop;
        bv = bPop;
      } else {
        av = a.title || '';
        bv = b.title || '';
      }
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });

    const pageNum = page && page > 0 ? page : 1;
    const size = pageSize && pageSize > 0 ? pageSize : 20;
    const start = (pageNum - 1) * size;

    const results = filtered.slice(start, start + size);
    return { results, total: filtered.length, page: pageNum, pageSize: size };
  }

  getArticleDetail(articleId) {
    const articles = this._getFromStorage('articles', []);
    const listItems = this._getFromStorage('reading_list_items', []);

    const article = articles.find(a => a.id === articleId) || null;
    if (!article) {
      return { article: null, isLiked: false, readingListIdsContaining: [], relatedArticles: [] };
    }

    const isLiked = !!article.liked_by_user;
    const readingListIdsContaining = listItems
      .filter(item => item.article_id === articleId)
      .map(item => item.reading_list_id);

    const relatedArticles = articles
      .filter(a => a.id !== article.id && a.category === article.category)
      .sort((a, b) => ((b.published_at || '') > (a.published_at || '') ? 1 : -1))
      .slice(0, 6);

    return { article, isLiked, readingListIdsContaining, relatedArticles };
  }

  getArticleComments(articleId) {
    const comments = this._getFromStorage('article_comments', []);
    const filtered = comments.filter(c => c.article_id === articleId);
    return { comments: filtered };
  }

  postArticleComment(articleId, name, email, body) {
    const articles = this._getFromStorage('articles', []);
    const article = articles.find(a => a.id === articleId);
    if (!article) {
      return { success: false, comment: null, requiresModeration: false, message: 'Article not found.' };
    }

    let comments = this._getFromStorage('article_comments', []);
    const now = this._now();
    const comment = {
      id: this._generateId('article_comment'),
      article_id: articleId,
      name,
      email,
      body,
      created_at: now,
      is_approved: false
    };
    comments.push(comment);
    this._saveToStorage('article_comments', comments);

    article.comment_count = (article.comment_count || 0) + 1;
    this._saveToStorage('articles', articles);

    return {
      success: true,
      comment,
      requiresModeration: true,
      message: 'Comment submitted and pending moderation.'
    };
  }

  setArticleLikeStatus(articleId, liked) {
    let articles = this._getFromStorage('articles', []);
    const article = articles.find(a => a.id === articleId);
    if (!article) {
      return { success: false, article: null, message: 'Article not found.' };
    }

    const currentlyLiked = !!article.liked_by_user;
    const desired = !!liked;

    if (currentlyLiked !== desired) {
      let likes = article.likes_count || 0;
      if (desired) {
        likes += 1;
      } else {
        likes = Math.max(0, likes - 1);
      }
      article.likes_count = likes;
      article.liked_by_user = desired;
      article.updated_at = this._now();
      this._saveToStorage('articles', articles);
    }

    return { success: true, article, message: desired ? 'Article liked.' : 'Like removed.' };
  }

  getReadingLists() {
    const readingLists = this._getFromStorage('reading_lists', []);
    return { readingLists };
  }

  getReadingListDetail(readingListId) {
    const readingLists = this._getFromStorage('reading_lists', []);
    const itemsAll = this._getFromStorage('reading_list_items', []);
    const articles = this._getFromStorage('articles', []);

    const readingList = readingLists.find(l => l.id === readingListId) || null;
    if (!readingList) {
      return { readingList: null, items: [] };
    }

    const itemsForList = itemsAll
      .filter(i => i.reading_list_id === readingListId)
      .sort((a, b) => (a.position || 0) - (b.position || 0));

    const items = itemsForList.map(ri => {
      const article = articles.find(a => a.id === ri.article_id) || null;
      return { readingListItem: ri, article };
    });

    return { readingList, items };
  }

  addArticleToReadingList(articleId, readingListId, newListName) {
    const articles = this._getFromStorage('articles', []);
    const article = articles.find(a => a.id === articleId);
    if (!article) {
      return { success: false, readingList: null, message: 'Article not found.' };
    }

    let readingLists = this._getFromStorage('reading_lists', []);
    let listItems = this._getFromStorage('reading_list_items', []);

    let readingList = null;
    if (readingListId) {
      readingList = readingLists.find(l => l.id === readingListId) || null;
    } else if (newListName) {
      readingList = this._getOrCreateReadingListByName(newListName);
      readingLists = this._getFromStorage('reading_lists', []); // refresh
    }

    if (!readingList) {
      return { success: false, readingList: null, message: 'Reading list not found or name not provided.' };
    }

    const itemsForList = listItems.filter(i => i.reading_list_id === readingList.id);
    const maxPos = itemsForList.reduce((max, i) => Math.max(max, i.position || 0), 0);

    const item = {
      id: this._generateId('reading_list_item'),
      reading_list_id: readingList.id,
      article_id: articleId,
      position: maxPos + 1,
      added_at: this._now()
    };

    listItems.push(item);
    readingList.updated_at = this._now();

    this._saveToStorage('reading_list_items', listItems);
    this._saveToStorage('reading_lists', readingLists);

    return { success: true, readingList, message: 'Article added to reading list.' };
  }

  renameReadingList(readingListId, newName) {
    let readingLists = this._getFromStorage('reading_lists', []);
    const list = readingLists.find(l => l.id === readingListId);
    if (!list) {
      return { success: false, readingList: null, message: 'Reading list not found.' };
    }
    list.name = String(newName || '').trim();
    list.updated_at = this._now();
    this._saveToStorage('reading_lists', readingLists);
    return { success: true, readingList: list, message: 'Reading list renamed.' };
  }

  deleteReadingList(readingListId) {
    let readingLists = this._getFromStorage('reading_lists', []);
    let listItems = this._getFromStorage('reading_list_items', []);

    const exists = readingLists.some(l => l.id === readingListId);
    readingLists = readingLists.filter(l => l.id !== readingListId);
    listItems = listItems.filter(i => i.reading_list_id !== readingListId);

    this._saveToStorage('reading_lists', readingLists);
    this._saveToStorage('reading_list_items', listItems);

    return { success: exists, message: exists ? 'Reading list deleted.' : 'Reading list not found.' };
  }

  removeArticleFromReadingList(readingListItemId) {
    let listItems = this._getFromStorage('reading_list_items', []);
    const exists = listItems.some(i => i.id === readingListItemId);
    listItems = listItems.filter(i => i.id !== readingListItemId);
    this._saveToStorage('reading_list_items', listItems);
    return { success: exists, message: exists ? 'Article removed from reading list.' : 'Reading list item not found.' };
  }

  // -------------------- 7. Courses & cart --------------------

  getCourseFilterOptions() {
    const categories = [
      { value: 'nutrition_eating_habits', label: 'Nutrition & eating habits' },
      { value: 'meditation', label: 'Meditation' },
      { value: 'stress_management', label: 'Stress management' },
      { value: 'movement_fitness', label: 'Movement & fitness' },
      { value: 'sleep', label: 'Sleep' }
    ];

    const formats = [
      { value: 'video_only', label: 'Video only' },
      { value: 'text_only', label: 'Text only' },
      { value: 'video_and_text', label: 'Video + text' }
    ];

    const priceRanges = [
      { min: 0, max: 50, label: 'Under $50' },
      { min: 50, max: 100, label: '$50–$100' },
      { min: 100, max: 5000, label: '$100+' }
    ];

    const durationRangesDays = [
      { min: 0, max: 7, label: 'Up to 1 week' },
      { min: 8, max: 21, label: '8–21 days' },
      { min: 21, max: 60, label: '21–60 days' },
      { min: 60, max: 365, label: '60+ days' }
    ];

    const sortOptions = [
      { value: 'price_asc', label: 'Price: Low to High' },
      { value: 'price_desc', label: 'Price: High to Low' },
      { value: 'popularity_desc', label: 'Most popular' },
      { value: 'created_at_desc', label: 'Newest first' }
    ];

    return { categories, formats, priceRanges, durationRangesDays, sortOptions };
  }

  searchCourses(
    category,
    minPrice,
    maxPrice,
    hasVideoLessons,
    minDurationDays,
    maxDurationDays,
    sortBy,
    sortDirection,
    page,
    pageSize
  ) {
    const courses = this._getFromStorage('courses', []);

    let filtered = courses.filter(c => {
      if (category && c.category !== category) return false;
      if (minPrice != null && c.price != null && c.price < minPrice) return false;
      if (maxPrice != null && c.price != null && c.price > maxPrice) return false;
      if (hasVideoLessons != null && c.has_video_lessons !== hasVideoLessons) return false;

      if (minDurationDays != null && c.duration_days != null && c.duration_days < minDurationDays) return false;
      if (maxDurationDays != null && c.duration_days != null && c.duration_days > maxDurationDays) return false;

      return true;
    });

    const key = sortBy || 'price';
    const dir = (sortDirection || 'asc').toLowerCase() === 'desc' ? -1 : 1;

    filtered = filtered.slice().sort((a, b) => {
      let av, bv;
      if (key === 'price') {
        av = a.price || 0;
        bv = b.price || 0;
      } else if (key === 'popularity') {
        av = a.popularity_score || 0;
        bv = b.popularity_score || 0;
      } else if (key === 'created_at') {
        av = a.created_at || '';
        bv = b.created_at || '';
      } else {
        av = a.title || '';
        bv = b.title || '';
      }
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });

    const pageNum = page && page > 0 ? page : 1;
    const size = pageSize && pageSize > 0 ? pageSize : 20;
    const start = (pageNum - 1) * size;

    const results = filtered.slice(start, start + size);
    return { results, total: filtered.length, page: pageNum, pageSize: size };
  }

  getCourseDetail(courseId) {
    const courses = this._getFromStorage('courses', []);
    const course = courses.find(c => c.id === courseId) || null;
    const relatedCourses = course
      ? courses.filter(c => c.id !== course.id && c.category === course.category).slice(0, 6)
      : [];
    return { course, relatedCourses };
  }

  addCourseToCart(courseId, quantity) {
    const courses = this._getFromStorage('courses', []);
    const course = courses.find(c => c.id === courseId);
    if (!course) {
      return { success: false, cart: null, items: [], message: 'Course not found.' };
    }

    const qty = quantity != null ? quantity : 1;
    if (qty <= 0) {
      return { success: false, cart: null, items: [], message: 'Quantity must be positive.' };
    }

    const cart = this._getOrCreateCart();
    let carts = this._getFromStorage('carts', []); // refresh
    let cartItems = this._getFromStorage('cart_items', []);

    let item = cartItems.find(ci => ci.cart_id === cart.id && ci.course_id === courseId);
    if (item) {
      item.quantity = (item.quantity || 1) + qty;
      item.added_at = this._now();
    } else {
      item = {
        id: this._generateId('cart_item'),
        cart_id: cart.id,
        course_id: courseId,
        quantity: qty,
        price_each: course.price || 0,
        added_at: this._now()
      };
      cartItems.push(item);
    }

    this._saveToStorage('cart_items', cartItems);
    const updatedCart = this._recalculateCartTotal(cart.id) || cart;
    carts = this._getFromStorage('carts', []);

    const items = cartItems
      .filter(ci => ci.cart_id === updatedCart.id)
      .map(ci => ({
        cartItem: ci,
        course: courses.find(c => c.id === ci.course_id) || null
      }));

    return { success: true, cart: updatedCart, items, message: 'Course added to cart.' };
  }

  getCart() {
    const carts = this._getFromStorage('carts', []);
    const cart = carts.length > 0 ? carts[0] : null;
    const cartItems = this._getFromStorage('cart_items', []);
    const courses = this._getFromStorage('courses', []);

    if (!cart) {
      return { cart: null, items: [] };
    }

    const items = cartItems
      .filter(ci => ci.cart_id === cart.id)
      .map(ci => ({
        cartItem: ci,
        course: courses.find(c => c.id === ci.course_id) || null
      }));

    return { cart, items };
  }

  updateCartItemQuantity(cartItemId, quantity) {
    let cartItems = this._getFromStorage('cart_items', []);
    const item = cartItems.find(ci => ci.id === cartItemId);
    if (!item) {
      return { success: false, cart: null, items: [] };
    }

    const cartId = item.cart_id;
    if (quantity <= 0) {
      cartItems = cartItems.filter(ci => ci.id !== cartItemId);
    } else {
      item.quantity = quantity;
    }
    this._saveToStorage('cart_items', cartItems);

    const cart = this._recalculateCartTotal(cartId);
    const courses = this._getFromStorage('courses', []);
    const items = cartItems
      .filter(ci => ci.cart_id === cartId)
      .map(ci => ({ cartItem: ci, course: courses.find(c => c.id === ci.course_id) || null }));

    return { success: true, cart, items };
  }

  removeCartItem(cartItemId) {
    let cartItems = this._getFromStorage('cart_items', []);
    const item = cartItems.find(ci => ci.id === cartItemId);
    if (!item) {
      return { success: false, cart: null, items: [] };
    }

    const cartId = item.cart_id;
    cartItems = cartItems.filter(ci => ci.id !== cartItemId);
    this._saveToStorage('cart_items', cartItems);

    const cart = this._recalculateCartTotal(cartId);
    const courses = this._getFromStorage('courses', []);
    const items = cartItems
      .filter(ci => ci.cart_id === cartId)
      .map(ci => ({ cartItem: ci, course: courses.find(c => c.id === ci.course_id) || null }));

    return { success: true, cart, items };
  }

  // -------------------- 8. Tools & stress assessment --------------------

  getAvailableTools() {
    // Static tool metadata; no large data persisted
    const tools = [
      {
        key: 'stress_assessment',
        name: 'Stress Level Self-Assessment',
        description: 'Quickly gauge your current stress level and get meditation recommendations.',
        category: 'stress'
      }
    ];
    return { tools };
  }

  getStressAssessmentQuestions() {
    const questions = this._getFromStorage('stress_assessment_questions', []);
    return { questions };
  }

  submitStressAssessment(answers) {
    const questions = this._getFromStorage('stress_assessment_questions', []);
    const programs = this._getFromStorage('meditation_programs', []);
    const now = this._now();

    // Compute per-answer score (higher index = higher stress)
    const scoredAnswers = (answers || []).map(ans => {
      const q = questions.find(q => q.id === ans.questionId);
      const maxIndex = q && Array.isArray(q.options) ? q.options.length - 1 : 0;
      let idx = ans.optionIndex != null ? ans.optionIndex : 0;
      if (idx < 0) idx = 0;
      if (idx > maxIndex) idx = maxIndex;
      const score = idx + 1;
      return {
        questionId: ans.questionId,
        optionIndex: idx,
        score
      };
    });

    const totalScore = scoredAnswers.reduce((sum, a) => sum + (a.score || 0), 0);

    // Determine stress level thresholds relative to max possible
    const maxPerQuestion = 4; // since we seeded with 4 options; adjust safely
    const maxPossible = (questions.length || 1) * maxPerQuestion;
    const ratio = maxPossible > 0 ? totalScore / maxPossible : 0;

    let stressLevel = 'low';
    let stressLevelLabel = 'Low';
    let message = 'Your stress level appears to be on the lower side.';

    if (ratio >= 0.75) {
      stressLevel = 'very_high';
      stressLevelLabel = 'Very high';
      message = 'Your responses suggest a very high stress load. Consider prioritizing recovery and support.';
    } else if (ratio >= 0.5) {
      stressLevel = 'high';
      stressLevelLabel = 'High';
      message = 'Your stress level seems high. Short, regular calming practices may be especially helpful.';
    } else if (ratio >= 0.3) {
      stressLevel = 'moderate';
      stressLevelLabel = 'Moderate';
      message = 'You are experiencing moderate stress. Gentle daily practices can help keep it in check.';
    }

    // Pick recommended meditation programs based on popularity
    const sortedPrograms = programs
      .slice()
      .sort((a, b) => (b.popularity_score || 0) - (a.popularity_score || 0));
    const recommended = sortedPrograms.slice(0, 10);
    const recommendedIds = recommended.map(p => p.id);

    let submissions = this._getFromStorage('stress_assessment_submissions', []);
    const submission = {
      id: this._generateId('stress_submission'),
      submitted_at: now,
      answers: scoredAnswers,
      total_score: totalScore,
      stress_level: stressLevel,
      recommended_program_ids: recommendedIds
    };
    submissions.push(submission);
    this._saveToStorage('stress_assessment_submissions', submissions);

    const summary = { stressLevelLabel, message };
    return { submission, summary, recommendedPrograms: recommended };
  }

  getRecommendedMeditationPrograms() {
    const submissions = this._getFromStorage('stress_assessment_submissions', []);
    const programs = this._getFromStorage('meditation_programs', []);

    const submission = submissions.length > 0 ? submissions[submissions.length - 1] : null;
    if (!submission) {
      return { submission: null, programs: [] };
    }

    const recommended = (submission.recommended_program_ids || []).map(id =>
      programs.find(p => p.id === id) || null
    ).filter(p => p);

    return { submission, programs: recommended };
  }

  getMeditationFilterOptions() {
    const sessionLengthRangesMinutes = [
      { min: 0, max: 10, label: 'Up to 10 minutes' },
      { min: 10, max: 15, label: '10–15 minutes' },
      { min: 15, max: 30, label: '15–30 minutes' },
      { min: 30, max: 60, label: '30–60 minutes' }
    ];

    const sortOptions = [
      { value: 'popularity_desc', label: 'Most popular' },
      { value: 'session_length_asc', label: 'Session length: Short to Long' },
      { value: 'session_length_desc', label: 'Session length: Long to Short' },
      { value: 'created_at_desc', label: 'Newest first' }
    ];

    return { sessionLengthRangesMinutes, sortOptions };
  }

  searchMeditationPrograms(
    minSessionLengthMinutes,
    maxSessionLengthMinutes,
    sortBy,
    sortDirection,
    onlyRecommended,
    page,
    pageSize
  ) {
    const programs = this._getFromStorage('meditation_programs', []);

    let allowedIds = null;
    if (onlyRecommended) {
      const submissions = this._getFromStorage('stress_assessment_submissions', []);
      const last = submissions.length > 0 ? submissions[submissions.length - 1] : null;
      if (last) {
        allowedIds = new Set(last.recommended_program_ids || []);
      } else {
        allowedIds = new Set();
      }
    }

    let filtered = programs.filter(p => {
      if (allowedIds && !allowedIds.has(p.id)) return false;
      if (minSessionLengthMinutes != null && p.session_length_minutes < minSessionLengthMinutes) return false;
      if (maxSessionLengthMinutes != null && p.session_length_minutes > maxSessionLengthMinutes) return false;
      return true;
    });

    const key = sortBy || 'popularity';
    const dir = (sortDirection || 'desc').toLowerCase() === 'asc' ? 1 : -1;

    filtered = filtered.slice().sort((a, b) => {
      let av, bv;
      if (key === 'popularity') {
        av = a.popularity_score || 0;
        bv = b.popularity_score || 0;
      } else if (key === 'session_length') {
        av = a.session_length_minutes || 0;
        bv = b.session_length_minutes || 0;
      } else if (key === 'created_at') {
        av = a.created_at || '';
        bv = b.created_at || '';
      } else {
        av = a.title || '';
        bv = b.title || '';
      }
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });

    const pageNum = page && page > 0 ? page : 1;
    const size = pageSize && pageSize > 0 ? pageSize : 20;
    const start = (pageNum - 1) * size;

    const results = filtered.slice(start, start + size);
    return { results, total: filtered.length, page: pageNum, pageSize: size };
  }

  getMeditationProgramDetail(programId) {
    const programs = this._getFromStorage('meditation_programs', []);
    const program = programs.find(p => p.id === programId) || null;
    return { program };
  }

  getMeditationCollections() {
    const collections = this._getFromStorage('meditation_collections', []);
    return { collections };
  }

  saveMeditationProgramToCollection(programId, collectionId, newCollectionName) {
    const programs = this._getFromStorage('meditation_programs', []);
    const program = programs.find(p => p.id === programId);
    if (!program) {
      return { success: false, collection: null, message: 'Meditation program not found.' };
    }

    let collections = this._getFromStorage('meditation_collections', []);
    let items = this._getFromStorage('meditation_collection_items', []);

    let collection = null;
    if (collectionId) {
      collection = collections.find(c => c.id === collectionId) || null;
    } else if (newCollectionName) {
      collection = this._getOrCreateMeditationCollectionByName(newCollectionName);
      collections = this._getFromStorage('meditation_collections', []); // refresh
    }

    if (!collection) {
      return { success: false, collection: null, message: 'Collection not found or name not provided.' };
    }

    const itemsForCollection = items.filter(i => i.collection_id === collection.id);
    const maxPos = itemsForCollection.reduce((max, i) => Math.max(max, i.position || 0), 0);

    const item = {
      id: this._generateId('med_collection_item'),
      collection_id: collection.id,
      program_id: programId,
      position: maxPos + 1,
      added_at: this._now()
    };

    items.push(item);
    collection.updated_at = this._now();

    this._saveToStorage('meditation_collection_items', items);
    this._saveToStorage('meditation_collections', collections);

    return { success: true, collection, message: 'Program saved to collection.' };
  }

  // -------------------- 9. About & contact --------------------

  getAboutContent() {
    const about = this._getFromStorage('about_content', {
      missionHtml: '',
      editorialGuidelinesHtml: '',
      contributors: []
    });
    return {
      missionHtml: about.missionHtml || '',
      editorialGuidelinesHtml: about.editorialGuidelinesHtml || '',
      contributors: Array.isArray(about.contributors) ? about.contributors : []
    };
  }

  submitContactForm(name, email, topic, subject, message) {
    const submissions = this._getFromStorage('contact_form_submissions', []);
    const id = this._generateId('contact');
    const now = this._now();

    const submission = {
      id,
      name,
      email,
      topic: topic || null,
      subject,
      message,
      created_at: now
    };

    submissions.push(submission);
    this._saveToStorage('contact_form_submissions', submissions);

    return { success: true, message: 'Your message has been sent.', ticketId: id };
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
