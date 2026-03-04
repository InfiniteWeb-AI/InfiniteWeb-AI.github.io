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

  // -------------------- Storage helpers --------------------

  _initStorage() {
    const keys = [
      // Core entities
      'recipes',
      'saved_recipes',
      'recipe_collections',
      'recipe_collection_items',
      'workouts',
      'workout_plans',
      'workout_plan_days',
      'authors',
      'author_follows',
      'content_items',
      'content_ratings',
      'comments',
      'reading_lists',
      'reading_list_items',
      'calorie_calculator_entries',
      'meal_plans',
      'meal_plan_days',
      'meal_plan_compare_sets',
      'started_meal_plans',
      'grocery_lists',
      'grocery_list_recipe_items',
      'fitness_quiz_results',
      'profile_settings',
      // Additional internal keys
      'currentWorkoutPlan',
      // Legacy/sample keys (harmless if unused)
      'users',
      'products',
      'carts',
      'cartItems'
    ];

    for (const key of keys) {
      if (localStorage.getItem(key) === null) {
        // For currentWorkoutPlan we want null, for others default to []
        if (key === 'currentWorkoutPlan') {
          localStorage.setItem(key, 'null');
        } else {
          localStorage.setItem(key, JSON.stringify([]));
        }
      }
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, defaultValue = []) {
    const raw = localStorage.getItem(key);
    if (raw === null || typeof raw === 'undefined') {
      return defaultValue;
    }
    try {
      const parsed = JSON.parse(raw);
      if (parsed === null && defaultValue !== undefined) {
        return defaultValue;
      }
      return parsed;
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

  _nowIso() {
    return new Date().toISOString();
  }

  // Generic helper: find entity by id
  _findById(collection, id) {
    return collection.find(item => item.id === id) || null;
  }

  // -------------------- Private helpers from spec --------------------

  // MealPlanCompareSet helper
  _getOrCreateMealPlanCompareSet() {
    const sets = this._getFromStorage('meal_plan_compare_sets');
    let compareSet = sets[0] || null;
    if (!compareSet) {
      compareSet = {
        id: this._generateId('meal_plan_compare_set'),
        meal_plan_ids: [],
        created_at: this._nowIso()
      };
      sets.push(compareSet);
      this._saveToStorage('meal_plan_compare_sets', sets);
    }
    return compareSet;
  }

  // ProfileSettings helper (single-user)
  _getOrCreateProfileSettings() {
    const list = this._getFromStorage('profile_settings');
    let settings = list[0] || null;
    if (!settings) {
      settings = {
        id: this._generateId('profile_settings'),
        primary_goal: null,
        email_notifications_enabled: false,
        newsletter_subscribed: false,
        created_at: this._nowIso(),
        updated_at: this._nowIso()
      };
      const newList = [settings];
      this._saveToStorage('profile_settings', newList);
      return settings;
    }
    return settings;
  }

  // GroceryList helper
  _getOrCreateGroceryListForAdd(groceryListId, newGroceryListName) {
    let groceryLists = this._getFromStorage('grocery_lists');
    let groceryList = null;

    if (groceryListId) {
      groceryList = this._findById(groceryLists, groceryListId);
    }

    if (!groceryList) {
      groceryList = {
        id: this._generateId('grocery_list'),
        name: newGroceryListName || 'Grocery List',
        created_at: this._nowIso(),
        updated_at: this._nowIso()
      };
      groceryLists.push(groceryList);
      this._saveToStorage('grocery_lists', groceryLists);
    }

    return groceryList;
  }

  // Internal helper to persist WorkoutPlan and WorkoutPlanDay records
  _saveWorkoutPlanWithDays(planData, daysAssignments) {
    let workoutPlans = this._getFromStorage('workout_plans');
    let workoutPlanDays = this._getFromStorage('workout_plan_days');

    const workoutPlan = {
      id: this._generateId('workout_plan'),
      name: planData.name,
      description: planData.description || null,
      plan_type: 'custom',
      experience_level: planData.experienceLevel || null,
      goal: planData.goal || null,
      total_weeks: planData.totalWeeks || 1,
      created_at: this._nowIso(),
      updated_at: this._nowIso(),
      is_active: true
    };

    workoutPlans.push(workoutPlan);

    const planDays = [];
    for (const day of daysAssignments) {
      const dayOfWeek = day.dayOfWeek;
      const workoutIds = Array.isArray(day.workoutIds) ? day.workoutIds : [];
      workoutIds.forEach((workoutId, idx) => {
        const planDay = {
          id: this._generateId('workout_plan_day'),
          workout_plan_id: workoutPlan.id,
          day_of_week: dayOfWeek,
          workout_id: workoutId,
          order_in_day: idx + 1,
          notes: null
        };
        workoutPlanDays.push(planDay);
        planDays.push(planDay);
      });
    }

    this._saveToStorage('workout_plans', workoutPlans);
    this._saveToStorage('workout_plan_days', workoutPlanDays);

    return { workoutPlan, planDays };
  }

  // Calorie calculation helper using Mifflin-St Jeor
  _calculateMaintenanceCaloriesInternal(age, gender, height, heightUnit, weight, weightUnit, activityLevel) {
    let heightCm = height;
    let weightKg = weight;

    if (heightUnit === 'inches') {
      heightCm = height * 2.54;
    }
    if (weightUnit === 'pounds') {
      weightKg = weight * 0.45359237;
    }

    // Mifflin-St Jeor BMR
    let s;
    if (gender === 'male') {
      s = 5;
    } else if (gender === 'female') {
      s = -161;
    } else {
      s = -78; // average between male and female constants
    }

    const bmr = 10 * weightKg + 6.25 * heightCm - 5 * age + s;

    let factor = 1.2; // default sedentary
    switch (activityLevel) {
      case 'sedentary':
        factor = 1.2;
        break;
      case 'lightly_active':
        factor = 1.375;
        break;
      case 'moderately_active_3_5_days':
        factor = 1.55;
        break;
      case 'very_active':
        factor = 1.725;
        break;
      case 'extra_active':
        factor = 1.9;
        break;
      default:
        factor = 1.2;
        break;
    }

    const maintenance = Math.round(bmr * factor);
    return maintenance;
  }

  // Helper: compute next position in a reading list
  _getNextReadingListPosition(readingListId) {
    const items = this._getFromStorage('reading_list_items');
    const forList = items.filter(i => i.reading_list_id === readingListId);
    if (forList.length === 0) return 1;
    const maxPos = forList.reduce((max, item) => {
      return item.position && item.position > max ? item.position : max;
    }, 0);
    return maxPos + 1;
  }

  // -------------------- Core interface implementations --------------------

  // 1. getHomeOverview
  getHomeOverview() {
    const recipes = this._getFromStorage('recipes');
    const workoutPlans = this._getFromStorage('workout_plans');
    const contentItems = this._getFromStorage('content_items');
    const savedRecipes = this._getFromStorage('saved_recipes');
    const startedMealPlans = this._getFromStorage('started_meal_plans');
    const mealPlans = this._getFromStorage('meal_plans');

    // Featured recipes: top 5 by rating_average
    const featuredRecipes = [...recipes]
      .filter(r => r.is_active !== false)
      .sort((a, b) => (b.rating_average || 0) - (a.rating_average || 0))
      .slice(0, 5);

    // Featured workout plans: top 5 by created_at (most recent)
    const featuredWorkoutPlans = [...workoutPlans]
      .filter(p => p.is_active !== false)
      .sort((a, b) => {
        const ad = a.created_at ? Date.parse(a.created_at) : 0;
        const bd = b.created_at ? Date.parse(b.created_at) : 0;
        return bd - ad;
      })
      .slice(0, 5);

    // Featured articles/videos: top 5 by view_count
    const featuredArticlesAndVideos = [...contentItems]
      .sort((a, b) => (b.view_count || 0) - (a.view_count || 0))
      .slice(0, 5);

    // Recent saved recipes joined to recipe
    const recipesById = new Map(recipes.map(r => [r.id, r]));
    const recentSavedRecipes = [...savedRecipes]
      .sort((a, b) => {
        const ad = a.saved_at ? Date.parse(a.saved_at) : 0;
        const bd = b.saved_at ? Date.parse(b.saved_at) : 0;
        return bd - ad;
      })
      .slice(0, 10)
      .map(saved => ({
        savedRecipe: saved,
        recipe: recipesById.get(saved.recipe_id) || null
      }));

    // Active meal plans: join StartedMealPlan + MealPlan
    const mealPlansById = new Map(mealPlans.map(p => [p.id, p]));
    const activeMealPlans = startedMealPlans
      .filter(sp => sp.status === 'active' || sp.status === 'planned')
      .map(sp => ({
        startedMealPlan: sp,
        mealPlan: mealPlansById.get(sp.meal_plan_id) || null
      }));

    return {
      featuredRecipes,
      featuredWorkoutPlans,
      featuredArticlesAndVideos,
      recentSavedRecipes,
      activeMealPlans
    };
  }

  // 2. Recipe filters
  getRecipeFilterOptions() {
    const mealTypes = ['breakfast', 'lunch', 'dinner', 'snack', 'dessert'];
    const diets = ['none', 'vegetarian', 'vegan', 'pescatarian', 'omnivore', 'gluten_free', 'keto'];
    const sortOptions = [
      { value: 'relevance', label: 'Relevance' },
      { value: 'rating_high_to_low', label: 'Rating: High to Low' },
      { value: 'prep_time_short_to_long', label: 'Preparation Time: Short to Long' },
      { value: 'newest', label: 'Newest' }
    ];

    return { mealTypes, diets, sortOptions };
  }

  // 3. searchRecipes
  searchRecipes(
    query,
    mealType,
    diet,
    maxCaloriesPerServing,
    minProteinGramsPerServing,
    maxCostPerServing,
    maxIngredientsCount,
    maxPrepTimeMinutes,
    sortBy,
    page,
    pageSize
  ) {
    const recipes = this._getFromStorage('recipes');
    const savedRecipes = this._getFromStorage('saved_recipes');
    const savedIds = new Set(savedRecipes.map(s => s.recipe_id));

    let results = recipes.filter(r => r.is_active !== false);

    if (query && typeof query === 'string') {
      const q = query.toLowerCase();
      results = results.filter(r => {
        const title = (r.title || '').toLowerCase();
        const desc = (r.description || '').toLowerCase();
        return title.includes(q) || desc.includes(q);
      });
    }

    if (mealType) {
      results = results.filter(r => r.meal_type === mealType);
    }

    if (diet) {
      results = results.filter(r => r.diet === diet);
    }

    if (typeof maxCaloriesPerServing === 'number') {
      results = results.filter(r => typeof r.calories_per_serving === 'number' && r.calories_per_serving <= maxCaloriesPerServing);
    }

    if (typeof minProteinGramsPerServing === 'number') {
      results = results.filter(r => typeof r.protein_grams_per_serving === 'number' && r.protein_grams_per_serving >= minProteinGramsPerServing);
    }

    if (typeof maxCostPerServing === 'number') {
      results = results.filter(r => typeof r.cost_per_serving === 'number' && r.cost_per_serving <= maxCostPerServing);
    }

    if (typeof maxIngredientsCount === 'number') {
      results = results.filter(r => typeof r.ingredients_count === 'number' && r.ingredients_count <= maxIngredientsCount);
    }

    if (typeof maxPrepTimeMinutes === 'number') {
      results = results.filter(r => typeof r.prep_time_minutes === 'number' && r.prep_time_minutes <= maxPrepTimeMinutes);
    }

    const sortKey = sortBy || 'relevance';
    if (sortKey === 'rating_high_to_low' || sortKey === 'relevance') {
      results.sort((a, b) => (b.rating_average || 0) - (a.rating_average || 0));
    } else if (sortKey === 'prep_time_short_to_long') {
      results.sort((a, b) => (a.prep_time_minutes || 0) - (b.prep_time_minutes || 0));
    } else if (sortKey === 'newest') {
      results.sort((a, b) => {
        const ad = a.created_at ? Date.parse(a.created_at) : 0;
        const bd = b.created_at ? Date.parse(b.created_at) : 0;
        return bd - ad;
      });
    }

    const totalResults = results.length;
    const currentPage = page && page > 0 ? page : 1;
    const size = pageSize && pageSize > 0 ? pageSize : 20;
    const start = (currentPage - 1) * size;
    const paged = results.slice(start, start + size);

    const mappedResults = paged.map(recipe => ({
      recipe,
      isSaved: savedIds.has(recipe.id)
    }));

    return {
      results: mappedResults,
      totalResults,
      page: currentPage,
      pageSize: size
    };
  }

  // 4. getRecipeDetail
  getRecipeDetail(recipeId) {
    const recipes = this._getFromStorage('recipes');
    const savedRecipes = this._getFromStorage('saved_recipes');

    const recipe = this._findById(recipes, recipeId);
    const isSaved = !!savedRecipes.find(s => s.recipe_id === recipeId);

    return { recipe, isSaved };
  }

  // 5. toggleRecipeSaved
  toggleRecipeSaved(recipeId) {
    let savedRecipes = this._getFromStorage('saved_recipes');
    const existingIndex = savedRecipes.findIndex(s => s.recipe_id === recipeId);

    if (existingIndex !== -1) {
      // Unsave
      savedRecipes.splice(existingIndex, 1);
      this._saveToStorage('saved_recipes', savedRecipes);
      return { isSaved: false, savedRecipe: null };
    }

    const savedRecipe = {
      id: this._generateId('saved_recipe'),
      recipe_id: recipeId,
      saved_at: this._nowIso()
    };
    savedRecipes.push(savedRecipe);
    this._saveToStorage('saved_recipes', savedRecipes);

    return { isSaved: true, savedRecipe };
  }

  // 6. getSavedRecipesOverview
  getSavedRecipesOverview() {
    const savedRecipes = this._getFromStorage('saved_recipes');
    const recipes = this._getFromStorage('recipes');
    const collections = this._getFromStorage('recipe_collections');
    const collectionItems = this._getFromStorage('recipe_collection_items');

    const recipesById = new Map(recipes.map(r => [r.id, r]));

    const resultSavedRecipes = savedRecipes.map(sr => {
      const collectionIds = collectionItems
        .filter(ci => ci.recipe_id === sr.recipe_id)
        .map(ci => ci.collection_id);
      return {
        savedRecipe: sr,
        recipe: recipesById.get(sr.recipe_id) || null,
        collectionIds
      };
    });

    return {
      savedRecipes: resultSavedRecipes,
      collections
    };
  }

  // 7. createRecipeCollection
  createRecipeCollection(name, description, recipeIds) {
    let collections = this._getFromStorage('recipe_collections');
    let collectionItems = this._getFromStorage('recipe_collection_items');

    const collection = {
      id: this._generateId('recipe_collection'),
      name,
      description: description || null,
      created_at: this._nowIso(),
      updated_at: this._nowIso()
    };

    collections.push(collection);

    const items = [];
    if (Array.isArray(recipeIds)) {
      for (const recipeId of recipeIds) {
        const item = {
          id: this._generateId('recipe_collection_item'),
          collection_id: collection.id,
          recipe_id: recipeId,
          added_at: this._nowIso()
        };
        collectionItems.push(item);
        items.push(item);
      }
    }

    this._saveToStorage('recipe_collections', collections);
    this._saveToStorage('recipe_collection_items', collectionItems);

    return { collection, items };
  }

  // 8. renameRecipeCollection
  renameRecipeCollection(collectionId, newName) {
    let collections = this._getFromStorage('recipe_collections');
    const collection = this._findById(collections, collectionId);
    if (!collection) return null;

    collection.name = newName;
    collection.updated_at = this._nowIso();

    this._saveToStorage('recipe_collections', collections);
    return collection;
  }

  // 9. deleteRecipeCollection
  deleteRecipeCollection(collectionId) {
    let collections = this._getFromStorage('recipe_collections');
    let collectionItems = this._getFromStorage('recipe_collection_items');

    const beforeLen = collections.length;
    collections = collections.filter(c => c.id !== collectionId);
    const afterLen = collections.length;

    collectionItems = collectionItems.filter(ci => ci.collection_id !== collectionId);

    this._saveToStorage('recipe_collections', collections);
    this._saveToStorage('recipe_collection_items', collectionItems);

    return { success: beforeLen !== afterLen };
  }

  // 10. assignRecipeToCollection
  assignRecipeToCollection(collectionId, recipeId) {
    let collectionItems = this._getFromStorage('recipe_collection_items');

    const item = {
      id: this._generateId('recipe_collection_item'),
      collection_id: collectionId,
      recipe_id: recipeId,
      added_at: this._nowIso()
    };

    collectionItems.push(item);
    this._saveToStorage('recipe_collection_items', collectionItems);

    return item;
  }

  // 11. removeRecipeFromCollection
  removeRecipeFromCollection(collectionItemId) {
    let collectionItems = this._getFromStorage('recipe_collection_items');
    const beforeLen = collectionItems.length;
    collectionItems = collectionItems.filter(ci => ci.id !== collectionItemId);
    const afterLen = collectionItems.length;
    this._saveToStorage('recipe_collection_items', collectionItems);

    return { success: beforeLen !== afterLen };
  }

  // 12. addRecipeToGroceryList
  addRecipeToGroceryList(recipeId, groceryListId, newGroceryListName, servings) {
    const effectiveServings = typeof servings === 'number' && servings > 0 ? servings : 1;
    const groceryList = this._getOrCreateGroceryListForAdd(groceryListId, newGroceryListName);

    let items = this._getFromStorage('grocery_list_recipe_items');
    const groceryListRecipeItem = {
      id: this._generateId('grocery_list_recipe_item'),
      grocery_list_id: groceryList.id,
      recipe_id: recipeId,
      servings: effectiveServings,
      added_at: this._nowIso()
    };

    items.push(groceryListRecipeItem);
    this._saveToStorage('grocery_list_recipe_items', items);

    // Update list updated_at
    let lists = this._getFromStorage('grocery_lists');
    const listRef = this._findById(lists, groceryList.id);
    if (listRef) {
      listRef.updated_at = this._nowIso();
      this._saveToStorage('grocery_lists', lists);
    }

    return { groceryList, groceryListRecipeItem };
  }

  // 13. getGroceryListsSummary
  getGroceryListsSummary() {
    const lists = this._getFromStorage('grocery_lists');
    const items = this._getFromStorage('grocery_list_recipe_items');

    return lists.map(list => {
      const count = items.filter(i => i.grocery_list_id === list.id).length;
      return { groceryList: list, recipeItemCount: count };
    });
  }

  // 14. getGroceryListDetail
  getGroceryListDetail(groceryListId) {
    const lists = this._getFromStorage('grocery_lists');
    const items = this._getFromStorage('grocery_list_recipe_items');
    const recipes = this._getFromStorage('recipes');

    const groceryList = this._findById(lists, groceryListId);
    const recipesById = new Map(recipes.map(r => [r.id, r]));

    const detailItems = items
      .filter(i => i.grocery_list_id === groceryListId)
      .map(i => ({
        groceryListRecipeItem: i,
        recipe: recipesById.get(i.recipe_id) || null
      }));

    return { groceryList, items: detailItems };
  }

  // 15. updateGroceryListRecipeServings
  updateGroceryListRecipeServings(groceryListRecipeItemId, servings) {
    let items = this._getFromStorage('grocery_list_recipe_items');
    const item = items.find(i => i.id === groceryListRecipeItemId);
    if (!item) return null;

    item.servings = servings;
    this._saveToStorage('grocery_list_recipe_items', items);
    return item;
  }

  // 16. removeRecipeFromGroceryList
  removeRecipeFromGroceryList(groceryListRecipeItemId) {
    let items = this._getFromStorage('grocery_list_recipe_items');
    const beforeLen = items.length;
    items = items.filter(i => i.id !== groceryListRecipeItemId);
    const afterLen = items.length;
    this._saveToStorage('grocery_list_recipe_items', items);
    return { success: beforeLen !== afterLen };
  }

  // 17. renameGroceryList
  renameGroceryList(groceryListId, newName) {
    let lists = this._getFromStorage('grocery_lists');
    const list = this._findById(lists, groceryListId);
    if (!list) return null;
    list.name = newName;
    list.updated_at = this._nowIso();
    this._saveToStorage('grocery_lists', lists);
    return list;
  }

  // 18. deleteGroceryList
  deleteGroceryList(groceryListId) {
    let lists = this._getFromStorage('grocery_lists');
    let items = this._getFromStorage('grocery_list_recipe_items');

    const beforeLen = lists.length;
    lists = lists.filter(l => l.id !== groceryListId);
    const afterLen = lists.length;

    items = items.filter(i => i.grocery_list_id !== groceryListId);

    this._saveToStorage('grocery_lists', lists);
    this._saveToStorage('grocery_list_recipe_items', items);

    return { success: beforeLen !== afterLen };
  }

  // 19. getWorkoutPlanFilterOptions
  getWorkoutPlanFilterOptions() {
    const experienceLevels = ['beginner', 'intermediate', 'advanced'];
    const goals = ['general_fitness', 'improve_endurance', 'weight_loss', 'build_muscle', 'increase_flexibility'];
    const sortOptions = [
      { value: 'popularity', label: 'Most Popular' },
      { value: 'newest', label: 'Newest' }
    ];

    return { experienceLevels, goals, sortOptions };
  }

  // 20. searchWorkoutPlans
  searchWorkoutPlans(experienceLevel, goal, maxTotalWeeks, sortBy, page, pageSize) {
    const plans = this._getFromStorage('workout_plans');

    let results = plans.filter(p => p.is_active !== false);

    if (experienceLevel) {
      results = results.filter(p => p.experience_level === experienceLevel);
    }

    if (goal) {
      results = results.filter(p => p.goal === goal);
    }

    if (typeof maxTotalWeeks === 'number') {
      results = results.filter(p => typeof p.total_weeks === 'number' && p.total_weeks <= maxTotalWeeks);
    }

    const sortKey = sortBy || 'popularity';
    if (sortKey === 'newest' || sortKey === 'popularity') {
      results.sort((a, b) => {
        const ad = a.created_at ? Date.parse(a.created_at) : 0;
        const bd = b.created_at ? Date.parse(b.created_at) : 0;
        return bd - ad;
      });
    }

    const totalResults = results.length;
    const currentPage = page && page > 0 ? page : 1;
    const size = pageSize && pageSize > 0 ? pageSize : 20;
    const start = (currentPage - 1) * size;
    const paged = results.slice(start, start + size);

    return {
      results: paged,
      totalResults,
      page: currentPage,
      pageSize: size
    };
  }

  // 21. getWorkoutPlanDetail
  getWorkoutPlanDetail(workoutPlanId) {
    const workoutPlans = this._getFromStorage('workout_plans');
    const planDays = this._getFromStorage('workout_plan_days');
    const workouts = this._getFromStorage('workouts');

    const workoutPlan = this._findById(workoutPlans, workoutPlanId);
    const workoutsById = new Map(workouts.map(w => [w.id, w]));

    const days = planDays
      .filter(d => d.workout_plan_id === workoutPlanId)
      .map(d => ({
        planDay: d,
        workout: workoutsById.get(d.workout_id) || null
      }));

    return { workoutPlan, days };
  }

  // 22. startWorkoutPlan
  startWorkoutPlan(workoutPlanId) {
    const plans = this._getFromStorage('workout_plans');
    const plan = this._findById(plans, workoutPlanId);
    if (!plan) {
      return { success: false, message: 'Workout plan not found' };
    }

    const state = {
      workout_plan_id: workoutPlanId,
      started_at: this._nowIso()
    };
    localStorage.setItem('currentWorkoutPlan', JSON.stringify(state));

    return { success: true, message: 'Workout plan started' };
  }

  // 23. getWorkoutCatalogForBuilder
  getWorkoutCatalogForBuilder(workoutType, minDurationMinutes, maxDurationMinutes, intensityLevel) {
    const workouts = this._getFromStorage('workouts');

    let results = [...workouts];

    if (workoutType) {
      results = results.filter(w => w.workout_type === workoutType);
    }

    if (typeof minDurationMinutes === 'number') {
      results = results.filter(w => w.duration_minutes >= minDurationMinutes);
    }

    if (typeof maxDurationMinutes === 'number') {
      results = results.filter(w => w.duration_minutes <= maxDurationMinutes);
    }

    if (intensityLevel) {
      results = results.filter(w => w.intensity_level === intensityLevel);
    }

    return results;
  }

  // 24. saveCustomWorkoutPlan
  saveCustomWorkoutPlan(name, experienceLevel, goal, days) {
    const planData = {
      name,
      description: null,
      experienceLevel: experienceLevel || null,
      goal: goal || null,
      totalWeeks: 1
    };

    const daysAssignments = Array.isArray(days)
      ? days.map(d => ({ dayOfWeek: d.dayOfWeek, workoutIds: d.workoutIds || [] }))
      : [];

    return this._saveWorkoutPlanWithDays(planData, daysAssignments);
  }

  // 25. searchContentItems
  searchContentItems(
    query,
    contentTypes,
    tag,
    dateFrom,
    dateTo,
    category,
    minRating,
    sortBy,
    page,
    pageSize
  ) {
    const items = this._getFromStorage('content_items');
    const authors = this._getFromStorage('authors');
    const authorsById = new Map(authors.map(a => [a.id, a]));

    let results = [...items];

    if (query && typeof query === 'string') {
      const q = query.toLowerCase();
      const tokens = q.split(/\s+/).filter(Boolean);
      results = results.filter(ci => {
        const t = (ci.title || '').toLowerCase();
        const s = (ci.summary || '').toLowerCase();
        const b = (ci.body || '').toLowerCase();
        const haystack = t + ' ' + s + ' ' + b;
        // Match if the full query appears, or if all tokens appear individually
        if (haystack.includes(q)) {
          return true;
        }
        return tokens.every(token => haystack.includes(token));
      });
    }

    if (Array.isArray(contentTypes) && contentTypes.length > 0) {
      const set = new Set(contentTypes);
      results = results.filter(ci => set.has(ci.content_type));
    }

    if (tag && typeof tag === 'string') {
      const t = tag.toLowerCase();
      results = results.filter(ci => {
        if (!Array.isArray(ci.tags)) return false;
        return ci.tags.some(x => String(x).toLowerCase() === t);
      });
    }

    if (category) {
      const cat = category.toLowerCase();
      if (cat === 'nutrition') {
        results = results.filter(ci => ci.content_type === 'nutrition_articles');
      } else if (cat === 'workouts' || cat === 'exercise') {
        results = results.filter(ci => ci.content_type === 'exercise_articles' || ci.content_type === 'workout_video');
      }
    }

    if (dateFrom) {
      const fromTs = Date.parse(dateFrom);
      if (!isNaN(fromTs)) {
        results = results.filter(ci => {
          if (!ci.published_at) return false;
          const ts = Date.parse(ci.published_at);
          return !isNaN(ts) && ts >= fromTs;
        });
      }
    }

    if (dateTo) {
      const toTs = Date.parse(dateTo);
      if (!isNaN(toTs)) {
        results = results.filter(ci => {
          if (!ci.published_at) return false;
          const ts = Date.parse(ci.published_at);
          return !isNaN(ts) && ts <= toTs;
        });
      }
    }

    if (typeof minRating === 'number') {
      results = results.filter(ci => typeof ci.rating_average === 'number' && ci.rating_average >= minRating);
    }

    const sortKey = sortBy || 'relevance';
    if (sortKey === 'most_read') {
      results.sort((a, b) => (b.view_count || 0) - (a.view_count || 0));
    } else if (sortKey === 'rating_high_to_low') {
      results.sort((a, b) => (b.rating_average || 0) - (a.rating_average || 0));
    } else if (sortKey === 'newest') {
      results.sort((a, b) => {
        const ad = a.published_at ? Date.parse(a.published_at) : 0;
        const bd = b.published_at ? Date.parse(b.published_at) : 0;
        return bd - ad;
      });
    } else if (sortKey === 'relevance') {
      results.sort((a, b) => (b.view_count || 0) - (a.view_count || 0));
    }

    const totalResults = results.length;
    const currentPage = page && page > 0 ? page : 1;
    const size = pageSize && pageSize > 0 ? pageSize : 20;
    const start = (currentPage - 1) * size;
    const paged = results.slice(start, start + size);

    // Foreign key resolution: include author object
    const mapped = paged.map(ci => ({
      ...ci,
      author: ci.author_id ? authorsById.get(ci.author_id) || null : null
    }));

    return {
      results: mapped,
      totalResults,
      page: currentPage,
      pageSize: size
    };
  }

  // 26. getContentItemDetail
  getContentItemDetail(contentItemId) {
    const items = this._getFromStorage('content_items');
    const authors = this._getFromStorage('authors');
    const ratings = this._getFromStorage('content_ratings');
    const comments = this._getFromStorage('comments');

    const contentItem = this._findById(items, contentItemId);
    let author = contentItem && contentItem.author_id
      ? this._findById(authors, contentItem.author_id)
      : null;

    // Fallback: if no explicit author_id is set on the content item, try to infer
    // an appropriate author based on expertise topics matching the item's topic,
    // tags, or text. This helps attach author info for seeded demo content.
    if (!author && contentItem) {
      const topic = (contentItem.topic || '').toLowerCase();
      const tags = Array.isArray(contentItem.tags)
        ? contentItem.tags.map(t => String(t).toLowerCase())
        : [];
      const textBlob = ((contentItem.title || '') + ' ' + (contentItem.summary || '') + ' ' + (contentItem.body || '')).toLowerCase();

      author = authors.find(a => {
        const expertise = Array.isArray(a.expertise_topics)
          ? a.expertise_topics.map(t => String(t).toLowerCase())
          : [];
        return expertise.some(exp => {
          return (
            exp && (
              (topic && topic.includes(exp)) ||
              tags.some(tag => tag.includes(exp) || exp.includes(tag)) ||
              textBlob.includes(exp)
            )
          );
        });
      }) || null;
    }

    const itemRatings = ratings.filter(r => r.content_item_id === contentItemId);
    // For single-user context, assume last rating is current user rating
    const userRating = itemRatings.length > 0
      ? itemRatings.sort((a, b) => {
          const ad = a.created_at ? Date.parse(a.created_at) : 0;
          const bd = b.created_at ? Date.parse(b.created_at) : 0;
          return bd - ad;
        })[0]
      : null;

    const recentComments = comments
      .filter(c => c.content_item_id === contentItemId)
      .sort((a, b) => {
        const ad = a.created_at ? Date.parse(a.created_at) : 0;
        const bd = b.created_at ? Date.parse(b.created_at) : 0;
        return bd - ad;
      });

    return { contentItem, author, userRating, recentComments };
  }

  // 27. rateContentItem
  rateContentItem(contentItemId, ratingValue) {
    let ratings = this._getFromStorage('content_ratings');
    let items = this._getFromStorage('content_items');

    const contentRating = {
      id: this._generateId('content_rating'),
      content_item_id: contentItemId,
      rating_value: ratingValue,
      created_at: this._nowIso()
    };

    ratings.push(contentRating);

    // Recalculate average and count
    const itemRatings = ratings.filter(r => r.content_item_id === contentItemId);
    const newRatingCount = itemRatings.length;
    const sum = itemRatings.reduce((acc, r) => acc + (r.rating_value || 0), 0);
    const newAverageRating = newRatingCount > 0 ? sum / newRatingCount : null;

    const contentItem = this._findById(items, contentItemId);
    if (contentItem) {
      contentItem.rating_average = newAverageRating;
      contentItem.rating_count = newRatingCount;
    }

    this._saveToStorage('content_ratings', ratings);
    this._saveToStorage('content_items', items);

    return { contentRating, newAverageRating, newRatingCount };
  }

  // 28. postContentComment
  postContentComment(contentItemId, commenterName, commenterEmail, text) {
    let comments = this._getFromStorage('comments');

    const comment = {
      id: this._generateId('comment'),
      content_item_id: contentItemId,
      commenter_name: commenterName,
      commenter_email: commenterEmail,
      text,
      created_at: this._nowIso()
    };

    comments.push(comment);
    this._saveToStorage('comments', comments);

    return comment;
  }

  // 29. saveContentItemToReadingList
  saveContentItemToReadingList(contentItemId, readingListId, newReadingListName) {
    let readingLists = this._getFromStorage('reading_lists');
    let readingListItems = this._getFromStorage('reading_list_items');

    let readingList = null;
    if (readingListId) {
      readingList = this._findById(readingLists, readingListId);
    }

    if (!readingList) {
      readingList = {
        id: this._generateId('reading_list'),
        name: newReadingListName || 'Reading List',
        description: null,
        created_at: this._nowIso(),
        updated_at: this._nowIso()
      };
      readingLists.push(readingList);
    }

    const position = this._getNextReadingListPosition(readingList.id);

    const readingListItem = {
      id: this._generateId('reading_list_item'),
      reading_list_id: readingList.id,
      content_item_id: contentItemId,
      added_at: this._nowIso(),
      position
    };

    readingListItems.push(readingListItem);

    this._saveToStorage('reading_lists', readingLists);
    this._saveToStorage('reading_list_items', readingListItems);

    return { readingList, readingListItem };
  }

  // 30. getAuthorProfile
  getAuthorProfile(authorId) {
    const authors = this._getFromStorage('authors');
    const authorFollows = this._getFromStorage('author_follows');
    const contentItems = this._getFromStorage('content_items');

    const author = this._findById(authors, authorId);
    const follow = authorFollows.find(f => f.author_id === authorId) || null;

    const featuredContent = contentItems
      .filter(ci => ci.author_id === authorId)
      .sort((a, b) => (b.view_count || 0) - (a.view_count || 0))
      .slice(0, 10);

    return {
      author,
      isFollowing: follow ? !!follow.is_following : false,
      emailUpdatesEnabled: follow ? !!follow.email_updates_enabled : false,
      featuredContent
    };
  }

  // 31. setAuthorFollowState
  setAuthorFollowState(authorId, isFollowing, emailUpdatesEnabled) {
    let authorFollows = this._getFromStorage('author_follows');
    let follow = authorFollows.find(f => f.author_id === authorId) || null;

    if (!follow) {
      follow = {
        id: this._generateId('author_follow'),
        author_id: authorId,
        is_following: !!isFollowing,
        email_updates_enabled: !!emailUpdatesEnabled,
        created_at: this._nowIso(),
        updated_at: this._nowIso()
      };
      authorFollows.push(follow);
    } else {
      follow.is_following = !!isFollowing;
      follow.email_updates_enabled = !!emailUpdatesEnabled;
      follow.updated_at = this._nowIso();
    }

    this._saveToStorage('author_follows', authorFollows);
    return follow;
  }

  // 32. getToolsOverview
  getToolsOverview() {
    const tools = [
      {
        toolKey: 'calorie_calculator',
        name: 'Calorie Calculator',
        description: 'Estimate your daily maintenance calories based on personal data and activity.',
        integrationNote: 'Saved results appear in your profile as calorie calculator entries and can guide meal plan suggestions.'
      },
      {
        toolKey: 'fitness_level_quiz',
        name: 'Fitness Level Quiz',
        description: 'Answer a few questions to get a recommended primary fitness goal.',
        integrationNote: 'The recommended goal can be applied to your profile primary goal to personalize content and plans.'
      }
    ];

    return { tools };
  }

  // 33. calculateMaintenanceCalories
  calculateMaintenanceCalories(age, gender, height, heightUnit, weight, weightUnit, activityLevel) {
    const maintenanceCalories = this._calculateMaintenanceCaloriesInternal(
      age,
      gender,
      height,
      heightUnit,
      weight,
      weightUnit,
      activityLevel
    );

    const calculationNotes = 'Estimated using the Mifflin-St Jeor equation adjusted for activity level.';

    return { maintenanceCalories, calculationNotes };
  }

  // 34. saveCalorieCalculatorResult
  saveCalorieCalculatorResult(
    label,
    age,
    gender,
    height,
    heightUnit,
    weight,
    weightUnit,
    activityLevel,
    maintenanceCalories
  ) {
    let entries = this._getFromStorage('calorie_calculator_entries');

    const entry = {
      id: this._generateId('calorie_calculator_entry'),
      label,
      age,
      gender,
      height,
      height_unit: heightUnit,
      weight,
      weight_unit: weightUnit,
      activity_level: activityLevel,
      maintenance_calories: maintenanceCalories,
      created_at: this._nowIso()
    };

    entries.push(entry);
    this._saveToStorage('calorie_calculator_entries', entries);

    return entry;
  }

  // 35. getFitnessQuizConfig
  getFitnessQuizConfig() {
    const frequencyOptions = [
      { value: 'zero_one_per_week', label: '0–1 times per week' },
      { value: 'two_three_per_week', label: '2–3 times per week' },
      { value: 'four_plus_per_week', label: '4+ times per week' }
    ];

    const intensityOptions = [
      { value: 'light', label: 'Light' },
      { value: 'moderate', label: 'Moderate' },
      { value: 'vigorous', label: 'Vigorous' }
    ];

    const goalOptions = [
      { value: 'improve_endurance', label: 'Improve endurance' },
      { value: 'general_fitness', label: 'General fitness' },
      { value: 'weight_loss', label: 'Weight loss' },
      { value: 'build_muscle', label: 'Build muscle' },
      { value: 'increase_flexibility', label: 'Increase flexibility' }
    ];

    return { frequencyOptions, intensityOptions, goalOptions };
  }

  // 36. submitFitnessQuiz
  submitFitnessQuiz(workoutFrequencyAnswer, intensityAnswer, goalAnswer) {
    let results = this._getFromStorage('fitness_quiz_results');

    // For simplicity, recommended goal equals chosen goal
    const recommended_goal = goalAnswer;

    const result = {
      id: this._generateId('fitness_quiz_result'),
      workout_frequency_answer: workoutFrequencyAnswer,
      intensity_answer: intensityAnswer,
      goal_answer: goalAnswer,
      recommended_goal,
      created_at: this._nowIso()
    };

    results.push(result);
    this._saveToStorage('fitness_quiz_results', results);

    return result;
  }

  // 37. applyFitnessQuizRecommendation
  applyFitnessQuizRecommendation(fitnessQuizResultId) {
    const results = this._getFromStorage('fitness_quiz_results');
    const quizResult = this._findById(results, fitnessQuizResultId);
    if (!quizResult) {
      return this._getOrCreateProfileSettings();
    }

    let settingsList = this._getFromStorage('profile_settings');
    let settings = settingsList[0] || this._getOrCreateProfileSettings();

    settings.primary_goal = quizResult.recommended_goal;
    settings.updated_at = this._nowIso();

    if (settingsList.length === 0) {
      settingsList = [settings];
    }

    this._saveToStorage('profile_settings', settingsList);
    return settings;
  }

  // 38. getProfileSettingsSummary
  getProfileSettingsSummary() {
    const settings = this._getOrCreateProfileSettings();
    const entries = this._getFromStorage('calorie_calculator_entries');
    return {
      profileSettings: settings,
      calorieCalculatorEntries: entries
    };
  }

  // 39. updateProfileSettings
  updateProfileSettings(primaryGoal, emailNotificationsEnabled, newsletterSubscribed) {
    let settingsList = this._getFromStorage('profile_settings');
    let settings = settingsList[0] || this._getOrCreateProfileSettings();

    if (typeof primaryGoal !== 'undefined') {
      settings.primary_goal = primaryGoal;
    }
    if (typeof emailNotificationsEnabled !== 'undefined') {
      settings.email_notifications_enabled = !!emailNotificationsEnabled;
    }
    if (typeof newsletterSubscribed !== 'undefined') {
      settings.newsletter_subscribed = !!newsletterSubscribed;
    }

    settings.updated_at = this._nowIso();

    if (settingsList.length === 0) {
      settingsList = [settings];
    }

    this._saveToStorage('profile_settings', settingsList);
    return settings;
  }

  // 40. getReadingListsSummary
  getReadingListsSummary() {
    const readingLists = this._getFromStorage('reading_lists');
    const readingListItems = this._getFromStorage('reading_list_items');

    return readingLists.map(list => ({
      readingList: list,
      itemCount: readingListItems.filter(i => i.reading_list_id === list.id).length
    }));
  }

  // 41. getReadingListDetail
  getReadingListDetail(readingListId) {
    const readingLists = this._getFromStorage('reading_lists');
    const readingListItems = this._getFromStorage('reading_list_items');
    const contentItems = this._getFromStorage('content_items');

    const readingList = this._findById(readingLists, readingListId);
    const itemsById = new Map(contentItems.map(ci => [ci.id, ci]));

    const items = readingListItems
      .filter(i => i.reading_list_id === readingListId)
      .sort((a, b) => (a.position || 0) - (b.position || 0))
      .map(i => ({
        readingListItem: i,
        contentItem: itemsById.get(i.content_item_id) || null
      }));

    return { readingList, items };
  }

  // 42. createReadingList
  createReadingList(name, description) {
    let readingLists = this._getFromStorage('reading_lists');

    const list = {
      id: this._generateId('reading_list'),
      name,
      description: description || null,
      created_at: this._nowIso(),
      updated_at: this._nowIso()
    };

    readingLists.push(list);
    this._saveToStorage('reading_lists', readingLists);

    return list;
  }

  // 43. renameReadingList
  renameReadingList(readingListId, newName) {
    let readingLists = this._getFromStorage('reading_lists');
    const list = this._findById(readingLists, readingListId);
    if (!list) return null;

    list.name = newName;
    list.updated_at = this._nowIso();

    this._saveToStorage('reading_lists', readingLists);
    return list;
  }

  // 44. deleteReadingList
  deleteReadingList(readingListId) {
    let readingLists = this._getFromStorage('reading_lists');
    let readingListItems = this._getFromStorage('reading_list_items');

    const beforeLen = readingLists.length;
    readingLists = readingLists.filter(l => l.id !== readingListId);
    const afterLen = readingLists.length;

    readingListItems = readingListItems.filter(i => i.reading_list_id !== readingListId);

    this._saveToStorage('reading_lists', readingLists);
    this._saveToStorage('reading_list_items', readingListItems);

    return { success: beforeLen !== afterLen };
  }

  // 45. addItemToReadingList
  addItemToReadingList(readingListId, contentItemId) {
    let readingListItems = this._getFromStorage('reading_list_items');

    const position = this._getNextReadingListPosition(readingListId);

    const readingListItem = {
      id: this._generateId('reading_list_item'),
      reading_list_id: readingListId,
      content_item_id: contentItemId,
      added_at: this._nowIso(),
      position
    };

    readingListItems.push(readingListItem);
    this._saveToStorage('reading_list_items', readingListItems);

    return readingListItem;
  }

  // 46. removeItemFromReadingList
  removeItemFromReadingList(readingListItemId) {
    let readingListItems = this._getFromStorage('reading_list_items');
    const beforeLen = readingListItems.length;
    readingListItems = readingListItems.filter(i => i.id !== readingListItemId);
    const afterLen = readingListItems.length;
    this._saveToStorage('reading_list_items', readingListItems);
    return { success: beforeLen !== afterLen };
  }

  // 47. reorderReadingListItems
  reorderReadingListItems(readingListId, orderedReadingListItemIds) {
    let readingListItems = this._getFromStorage('reading_list_items');

    const idToItem = new Map(readingListItems.map(i => [i.id, i]));

    orderedReadingListItemIds.forEach((id, index) => {
      const item = idToItem.get(id);
      if (item && item.reading_list_id === readingListId) {
        item.position = index + 1;
      }
    });

    this._saveToStorage('reading_list_items', readingListItems);

    const updatedItems = readingListItems
      .filter(i => i.reading_list_id === readingListId)
      .sort((a, b) => (a.position || 0) - (b.position || 0));

    return updatedItems;
  }

  // 48. getMealPlanFilterOptions
  getMealPlanFilterOptions() {
    const focusOptions = ['general', 'breakfast_focused', 'weight_loss', 'muscle_gain'];
    const goalOptions = ['general_fitness', 'weight_loss', 'muscle_gain'];
    const sortOptions = [
      { value: 'popularity', label: 'Most Popular' },
      { value: 'newest', label: 'Newest' },
      { value: 'calories_low_to_high', label: 'Calories: Low to High' }
    ];

    return { focusOptions, goalOptions, sortOptions };
  }

  // 49. searchMealPlans
  searchMealPlans(focus, minAverageDailyCalories, maxAverageDailyCalories, goal, sortBy, page, pageSize) {
    const mealPlans = this._getFromStorage('meal_plans');

    let results = [...mealPlans];

    if (focus) {
      results = results.filter(mp => mp.focus === focus);
    }

    if (typeof minAverageDailyCalories === 'number') {
      results = results.filter(mp => mp.average_daily_calories >= minAverageDailyCalories);
    }

    if (typeof maxAverageDailyCalories === 'number') {
      results = results.filter(mp => mp.average_daily_calories <= maxAverageDailyCalories);
    }

    // 'goal' parameter has no direct field in MealPlan; ignore or map if custom field exists

    const sortKey = sortBy || 'popularity';
    if (sortKey === 'calories_low_to_high') {
      results.sort((a, b) => (a.average_daily_calories || 0) - (b.average_daily_calories || 0));
    } else if (sortKey === 'newest') {
      results.sort((a, b) => {
        const ad = a.created_at ? Date.parse(a.created_at) : 0;
        const bd = b.created_at ? Date.parse(b.created_at) : 0;
        return bd - ad;
      });
    } else if (sortKey === 'popularity') {
      results.sort((a, b) => (b.popularity_score || 0) - (a.popularity_score || 0));
    }

    const totalResults = results.length;
    const currentPage = page && page > 0 ? page : 1;
    const size = pageSize && pageSize > 0 ? pageSize : 20;
    const start = (currentPage - 1) * size;
    const paged = results.slice(start, start + size);

    return {
      results: paged,
      totalResults,
      page: currentPage,
      pageSize: size
    };
  }

  // 50. getMealPlanDetail
  getMealPlanDetail(mealPlanId) {
    const mealPlans = this._getFromStorage('meal_plans');
    const mealPlanDays = this._getFromStorage('meal_plan_days');

    const mealPlan = this._findById(mealPlans, mealPlanId);
    const days = mealPlanDays
      .filter(d => d.meal_plan_id === mealPlanId)
      .sort((a, b) => (a.day_number || 0) - (b.day_number || 0));

    return { mealPlan, days };
  }

  // 51. addMealPlanToCompareSet
  addMealPlanToCompareSet(mealPlanId) {
    const compareSet = this._getOrCreateMealPlanCompareSet();
    let sets = this._getFromStorage('meal_plan_compare_sets');

    const idx = sets.findIndex(s => s.id === compareSet.id);

    if (!compareSet.meal_plan_ids.includes(mealPlanId)) {
      compareSet.meal_plan_ids.push(mealPlanId);
    }

    if (idx !== -1) {
      sets[idx] = compareSet;
    } else {
      sets.push(compareSet);
    }

    this._saveToStorage('meal_plan_compare_sets', sets);
    return compareSet;
  }

  // 52. getMealPlanCompareSet
  getMealPlanCompareSet() {
    const sets = this._getFromStorage('meal_plan_compare_sets');
    const mealPlans = this._getFromStorage('meal_plans');

    const compareSet = sets[0] || null;

    if (!compareSet) {
      return { compareSet: null, plans: [] };
    }

    const planSet = new Set(compareSet.meal_plan_ids || []);
    const plans = mealPlans.filter(mp => planSet.has(mp.id));

    return { compareSet, plans };
  }

  // 53. clearMealPlanCompareSet
  clearMealPlanCompareSet() {
    this._saveToStorage('meal_plan_compare_sets', []);
    return { success: true };
  }

  // 54. startMealPlan
  startMealPlan(mealPlanId, startDate) {
    let startedMealPlans = this._getFromStorage('started_meal_plans');

    const startedMealPlan = {
      id: this._generateId('started_meal_plan'),
      meal_plan_id: mealPlanId,
      start_date: startDate,
      status: 'planned',
      created_at: this._nowIso(),
      updated_at: this._nowIso()
    };

    startedMealPlans.push(startedMealPlan);
    this._saveToStorage('started_meal_plans', startedMealPlans);

    return startedMealPlan;
  }

  // -------------------- Sample legacy method (unused) --------------------
  // Included from template but not used for this domain. Left minimal.
  addToCart(userId, productId, quantity) {
    // No-op for this domain; provided only to preserve template structure.
    return { success: false, cartId: null };
  }

  _findOrCreateCart(userId) {
    // No-op placeholder.
    return null;
  }

  // NO test methods in this class
}

// Browser global + Node.js export
if (typeof window !== 'undefined') {
  window.BusinessLogic = BusinessLogic;
  window.WebsiteSDK = new BusinessLogic();
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = BusinessLogic;
}
