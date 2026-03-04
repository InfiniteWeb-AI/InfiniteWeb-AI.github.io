'use strict';

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

  // ---------------------- Storage Helpers ----------------------

  _initStorage() {
    // Arrays
    const arrayKeys = [
      'recipes',
      'recipe_ingredients',
      'recipe_instruction_steps',
      'recipe_reviews',
      'meal_plans',
      'meal_plan_items',
      'symptom_entries',
      'shopping_lists',
      'shopping_list_items',
      'articles',
      'notes',
      'food_products',
      'programs',
      'habits',
      'program_instances',
      'program_instance_habits',
      'program_habit_schedules',
      'contact_messages',
      'staged_meal_selection_recipe_ids'
    ];

    arrayKeys.forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    });

    // Objects / misc
    if (!localStorage.getItem('static_pages')) {
      localStorage.setItem('static_pages', JSON.stringify({}));
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }

    // active shopping list id (can be null / missing)
    if (!localStorage.getItem('active_shopping_list_id')) {
      localStorage.setItem('active_shopping_list_id', '');
    }
  }

  _getFromStorage(key, defaultValue = []) {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : defaultValue;
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

  _clone(obj) {
    return obj == null ? obj : JSON.parse(JSON.stringify(obj));
  }

  // ---------------------- Private Domain Helpers ----------------------

  // Shopping list helpers
  _getOrCreateActiveShoppingList(nameIfCreate) {
    let shoppingLists = this._getFromStorage('shopping_lists');
    let activeId = localStorage.getItem('active_shopping_list_id') || '';
    let activeList = shoppingLists.find((l) => l.id === activeId && l.status === 'active');

    if (!activeList) {
      activeList = {
        id: this._generateId('shoppingList'),
        name: nameIfCreate || 'Shopping List',
        status: 'active',
        created_at: this._nowIso(),
        updated_at: this._nowIso()
      };
      shoppingLists.push(activeList);
      this._saveToStorage('shopping_lists', shoppingLists);
      localStorage.setItem('active_shopping_list_id', activeList.id);
    }

    return this._clone(activeList);
  }

  _recalculateShoppingListTotals(shoppingListId) {
    const items = this._getFromStorage('shopping_list_items');
    const total = items
      .filter((i) => i.shopping_list_id === shoppingListId)
      .reduce((sum, i) => {
        const val = typeof i.estimated_total_price === 'number' ? i.estimated_total_price : 0;
        return sum + val;
      }, 0);
    return { total_estimated_price: total };
  }

  // Staged meal selection helpers
  _getOrCreateStagedMealSelection() {
    const ids = this._getFromStorage('staged_meal_selection_recipe_ids', []);
    return Array.isArray(ids) ? ids : [];
  }

  _saveStagedMealSelection(ids) {
    this._saveToStorage('staged_meal_selection_recipe_ids', ids || []);
  }

  // Meal plan nutrition aggregation
  _recalculateMealPlanNutrition(mealPlanId, day_index) {
    const items = this._getFromStorage('meal_plan_items');
    const recipes = this._getFromStorage('recipes');

    const relevant = items.filter((item) => {
      if (item.meal_plan_id !== mealPlanId) return false;
      if (typeof day_index === 'number') {
        return item.day_index === day_index;
      }
      return true;
    });

    let total_calories = 0;
    let total_fiber_g = 0;
    let total_sugar_g = 0;
    let total_protein_g = 0;
    let total_fat_g = 0;

    relevant.forEach((item) => {
      const recipe = recipes.find((r) => r.id === item.recipe_id);
      if (!recipe) return;
      const servings = typeof item.servings === 'number' ? item.servings : 1;
      total_calories += (recipe.nutrition_calories_per_serving || 0) * servings;
      total_fiber_g += (recipe.nutrition_fiber_g_per_serving || 0) * servings;
      total_sugar_g += (recipe.nutrition_sugar_g_per_serving || 0) * servings;
      total_protein_g += (recipe.nutrition_protein_g_per_serving || 0) * servings;
      total_fat_g += (recipe.nutrition_fat_g_per_serving || 0) * servings;
    });

    return {
      total_calories,
      total_fiber_g,
      total_sugar_g,
      total_protein_g,
      total_fat_g
    };
  }

  // Recipe rating helper
  _updateRecipeAverageRating(recipeId) {
    const reviews = this._getFromStorage('recipe_reviews');
    const recipes = this._getFromStorage('recipes');

    const recipe = recipes.find((r) => r.id === recipeId);
    if (!recipe) {
      return { average_rating: null, rating_count: 0 };
    }

    const related = reviews.filter((rev) => rev.recipe_id === recipeId);
    const rating_count = related.length;
    let average_rating = null;

    if (rating_count > 0) {
      const sum = related.reduce((s, r) => s + (r.rating || 0), 0);
      average_rating = sum / rating_count;
    }

    recipe.average_rating = average_rating;
    recipe.rating_count = rating_count;
    recipe.updated_at = this._nowIso();

    this._saveToStorage('recipes', recipes);
    return { average_rating, rating_count };
  }

  // Generic recipe filtering used by searchRecipes & searchRecipesForMealPlan
  _filterAndSortRecipes(allRecipes, query, filters, sort_by) {
    const ingredients = this._getFromStorage('recipe_ingredients');

    let results = allRecipes.slice();

    if (query && typeof query === 'string' && query.trim() !== '') {
      const q = query.trim().toLowerCase();
      results = results.filter((r) => {
        return (
          (r.title && r.title.toLowerCase().includes(q)) ||
          (r.description && r.description.toLowerCase().includes(q))
        );
      });
    }

    const f = filters || {};

    if (f.category) {
      results = results.filter((r) => r.category === f.category);
    }

    if (f.is_gut_friendly_only) {
      results = results.filter((r) => {
        const tags = (r.diet_tags || []).concat(r.health_tags || []);
        return r.is_gut_friendly === true || tags.includes('gut_friendly') || tags.includes('gut_health');
      });
    }

    if (f.is_low_fodmap_only) {
      results = results.filter((r) => {
        const tags = (r.diet_tags || []).concat(r.health_tags || []);
        return r.is_low_fodmap === true || tags.includes('low_fodmap');
      });
    }

    if (Array.isArray(f.diet_tags_any) && f.diet_tags_any.length > 0) {
      results = results.filter((r) => {
        const tags = (r.diet_tags || []).concat(r.health_tags || []);
        if (r.is_vegan) tags.push('vegan');
        if (r.is_dairy_free) tags.push('dairy_free');
        if (r.is_gluten_free) tags.push('gluten_free');
        return f.diet_tags_any.some((t) => tags.includes(t));
      });
    }

    if (Array.isArray(f.diet_tags_all) && f.diet_tags_all.length > 0) {
      results = results.filter((r) => {
        const tags = (r.diet_tags || []).concat(r.health_tags || []);
        if (r.is_vegan) tags.push('vegan');
        if (r.is_dairy_free) tags.push('dairy_free');
        if (r.is_gluten_free) tags.push('gluten_free');
        return f.diet_tags_all.every((t) => tags.includes(t));
      });
    }

    if (typeof f.min_calories === 'number') {
      results = results.filter((r) => (r.nutrition_calories_per_serving || 0) >= f.min_calories);
    }

    if (typeof f.max_calories === 'number') {
      results = results.filter((r) => (r.nutrition_calories_per_serving || 0) <= f.max_calories);
    }

    if (typeof f.min_fiber_g === 'number') {
      results = results.filter((r) => (r.nutrition_fiber_g_per_serving || 0) >= f.min_fiber_g);
    }

    if (typeof f.max_sugar_g === 'number') {
      results = results.filter((r) => (r.nutrition_sugar_g_per_serving || 0) <= f.max_sugar_g);
    }

    if (typeof f.max_total_time_minutes === 'number') {
      results = results.filter((r) => (r.total_time_minutes || 0) <= f.max_total_time_minutes);
    }

    if (typeof f.min_rating === 'number') {
      results = results.filter((r) => (r.average_rating || 0) >= f.min_rating);
    }

    if (Array.isArray(f.include_ingredients) && f.include_ingredients.length > 0) {
      const includeNames = f.include_ingredients.map((s) => String(s).toLowerCase());
      const recipeIdToIngredients = new Map();
      ingredients.forEach((ing) => {
        const arr = recipeIdToIngredients.get(ing.recipe_id) || [];
        arr.push(ing);
        recipeIdToIngredients.set(ing.recipe_id, arr);
      });
      results = results.filter((r) => {
        const ings = recipeIdToIngredients.get(r.id) || [];
        const names = ings.map((i) => i.name.toLowerCase());
        return includeNames.every((req) => names.some((n) => n.includes(req)));
      });
    }

    // Sorting
    const sb = sort_by || f.sort_by || '';
    if (sb === 'rating_desc') {
      results.sort((a, b) => (b.average_rating || 0) - (a.average_rating || 0));
    } else if (sb === 'popularity_desc') {
      results.sort((a, b) => (b.popularity_score || 0) - (a.popularity_score || 0));
    } else if (sb === 'time_asc') {
      results.sort((a, b) => (a.total_time_minutes || 0) - (b.total_time_minutes || 0));
    } else if (sb === 'calories_asc') {
      results.sort(
        (a, b) => (a.nutrition_calories_per_serving || 0) - (b.nutrition_calories_per_serving || 0)
      );
    }

    return results;
  }

  // Resolve foreign keys for shopping list items
  _resolveShoppingListItemFKs(item, shoppingList, recipes, foodProducts) {
    const resolved = this._clone(item);
    if (shoppingList) {
      resolved.shopping_list = this._clone(shoppingList);
    }
    if (resolved.source_type === 'recipe' && resolved.source_id) {
      const recipe = recipes.find((r) => r.id === resolved.source_id) || null;
      resolved.recipe = this._clone(recipe);
    } else if (resolved.source_type === 'food_product' && resolved.source_id) {
      const product = foodProducts.find((p) => p.id === resolved.source_id) || null;
      resolved.food_product = this._clone(product);
    }
    return resolved;
  }

  // Resolve foreign keys for meal plan items
  _resolveMealPlanItemFKs(item, mealPlan, recipes) {
    const resolved = this._clone(item);
    if (mealPlan) {
      resolved.meal_plan = this._clone(mealPlan);
    }
    const recipe = recipes.find((r) => r.id === resolved.recipe_id) || null;
    resolved.recipe = this._clone(recipe);
    return resolved;
  }

  // ---------------------- Core Interface Implementations ----------------------

  // 1. getHomeOverview()
  getHomeOverview() {
    const recipes = this._getFromStorage('recipes');
    const articles = this._getFromStorage('articles');
    const programInstances = this._getFromStorage('program_instances');
    const programs = this._getFromStorage('programs');

    const gutFriendlyFilter = (r) => {
      const tags = (r.diet_tags || []).concat(r.health_tags || []);
      return r.is_gut_friendly === true || tags.includes('gut_friendly') || tags.includes('gut_health');
    };

    const sortFeatured = (a, b) => {
      const pa = a.popularity_score || 0;
      const pb = b.popularity_score || 0;
      if (pb !== pa) return pb - pa;
      const ra = a.average_rating || 0;
      const rb = b.average_rating || 0;
      return rb - ra;
    };

    const featured_breakfast_recipes = recipes
      .filter((r) => r.category === 'breakfast' && gutFriendlyFilter(r))
      .sort(sortFeatured)
      .slice(0, 6);

    const featured_high_fiber_dinners = recipes
      .filter((r) => r.category === 'dinner' && (r.is_high_fiber || (r.diet_tags || []).includes('high_fiber')))
      .sort(sortFeatured)
      .slice(0, 6);

    const featured_snacks = recipes
      .filter((r) => r.category === 'snack' && gutFriendlyFilter(r))
      .sort(sortFeatured)
      .slice(0, 6);

    const recent_articles = articles
      .slice()
      .sort((a, b) => {
        const ad = a.published_at || a.created_at || '';
        const bd = b.published_at || b.created_at || '';
        return (bd || '').localeCompare(ad || '');
      })
      .slice(0, 6);

    const active_program_instances_raw = programInstances.filter((pi) => pi.status === 'active');
    const active_program_instances = active_program_instances_raw.map((pi) => {
      const baseProgram = programs.find((p) => p.id === pi.program_id) || null;
      const cloned = this._clone(pi);
      cloned.program = this._clone(baseProgram);
      return cloned;
    });

    const highlighted_programs = programs.filter((p) => p.status === 'active');

    return {
      featured_breakfast_recipes: this._clone(featured_breakfast_recipes),
      featured_high_fiber_dinners: this._clone(featured_high_fiber_dinners),
      featured_snacks: this._clone(featured_snacks),
      recent_articles: this._clone(recent_articles),
      active_program_instances,
      highlighted_programs: this._clone(highlighted_programs)
    };
  }

  // 2. getRecipeFilterOptions()
  getRecipeFilterOptions() {
    const categories = [
      { value: 'breakfast', label: 'Breakfast' },
      { value: 'lunch', label: 'Lunch' },
      { value: 'dinner', label: 'Dinner' },
      { value: 'snack', label: 'Snacks' },
      { value: 'soup', label: 'Soups' },
      { value: 'dessert', label: 'Desserts' },
      { value: 'salad', label: 'Salads' },
      { value: 'bowl', label: 'Bowls' },
      { value: 'drink', label: 'Drinks' },
      { value: 'side', label: 'Sides' },
      { value: 'other', label: 'Other' }
    ];

    const diet_tags = [
      { value: 'gut_friendly', label: 'Gut-friendly' },
      { value: 'gut_health', label: 'Gut health' },
      { value: 'low_fodmap', label: 'Low-FODMAP' },
      { value: 'vegan', label: 'Vegan' },
      { value: 'dairy_free', label: 'Dairy-free' },
      { value: 'gluten_free', label: 'Gluten-free' },
      { value: 'high_fiber', label: 'High fiber' },
      { value: 'low_sugar', label: 'Low sugar' }
    ];

    const time_ranges = [
      { min_minutes: 0, max_minutes: 30, label: 'Under 30 minutes' },
      { min_minutes: 30, max_minutes: 45, label: '30–45 minutes' },
      { min_minutes: 45, max_minutes: 60, label: '45–60 minutes' },
      { min_minutes: 60, max_minutes: null, label: 'Over 60 minutes' }
    ];

    const calorie_ranges = [
      { min_calories: 0, max_calories: 300, label: 'Up to 300 kcal' },
      { min_calories: 300, max_calories: 500, label: '300–500 kcal' },
      { min_calories: 500, max_calories: 800, label: '500–800 kcal' }
    ];

    const sugar_ranges = [
      { min_sugar_g: 0, max_sugar_g: 5, label: 'Up to 5g sugar' },
      { min_sugar_g: 0, max_sugar_g: 10, label: 'Up to 10g sugar' },
      { min_sugar_g: 0, max_sugar_g: 15, label: 'Up to 15g sugar' }
    ];

    const fiber_ranges = [
      { min_fiber_g: 3, max_fiber_g: null, label: 'At least 3g fiber' },
      { min_fiber_g: 5, max_fiber_g: null, label: 'At least 5g fiber' },
      { min_fiber_g: 8, max_fiber_g: null, label: 'At least 8g fiber' }
    ];

    const rating_options = [
      { min_rating: 3.0, label: '3.0+ stars' },
      { min_rating: 4.0, label: '4.0+ stars' },
      { min_rating: 4.5, label: '4.5+ stars' }
    ];

    const sort_options = [
      { value: 'rating_desc', label: 'Rating: High to Low' },
      { value: 'popularity_desc', label: 'Most Popular' },
      { value: 'time_asc', label: 'Time: Short to Long' },
      { value: 'calories_asc', label: 'Calories: Low to High' }
    ];

    return {
      categories,
      diet_tags,
      time_ranges,
      calorie_ranges,
      sugar_ranges,
      fiber_ranges,
      rating_options,
      sort_options
    };
  }

  // 3. searchRecipes(query, filters, sort_by, page, page_size)
  searchRecipes(query, filters, sort_by, page, page_size) {
    const allRecipes = this._getFromStorage('recipes');
    const pageNum = typeof page === 'number' && page > 0 ? page : 1;
    const sizeNum = typeof page_size === 'number' && page_size > 0 ? page_size : 20;

    const filtered = this._filterAndSortRecipes(allRecipes, query, filters || {}, sort_by);

    const total = filtered.length;
    const start = (pageNum - 1) * sizeNum;
    const end = start + sizeNum;

    const results = filtered.slice(start, end);

    return {
      results: this._clone(results),
      total,
      page: pageNum,
      page_size: sizeNum
    };
  }

  // 4. toggleFavoriteRecipe(recipeId)
  toggleFavoriteRecipe(recipeId) {
    const recipes = this._getFromStorage('recipes');
    const recipe = recipes.find((r) => r.id === recipeId);
    if (!recipe) {
      return { success: false, is_favorite: false, message: 'Recipe not found' };
    }

    recipe.is_favorite = !recipe.is_favorite;
    recipe.updated_at = this._nowIso();
    this._saveToStorage('recipes', recipes);

    return {
      success: true,
      is_favorite: !!recipe.is_favorite,
      message: recipe.is_favorite ? 'Recipe added to favorites' : 'Recipe removed from favorites'
    };
  }

  // 5. addRecipeToStagedMealSelection(recipeId)
  addRecipeToStagedMealSelection(recipeId) {
    const recipes = this._getFromStorage('recipes');
    const recipe = recipes.find((r) => r.id === recipeId);
    if (!recipe) {
      return { success: false, staged_recipes: [], message: 'Recipe not found' };
    }

    const ids = this._getOrCreateStagedMealSelection();
    if (!ids.includes(recipeId)) {
      ids.push(recipeId);
      this._saveStagedMealSelection(ids);
    }

    const staged_recipes = ids
      .map((id) => recipes.find((r) => r.id === id))
      .filter((r) => !!r);

    return {
      success: true,
      staged_recipes: this._clone(staged_recipes),
      message: 'Recipe added to staged meal selection'
    };
  }

  // 6. getStagedMealSelection()
  getStagedMealSelection() {
    const recipes = this._getFromStorage('recipes');
    const ids = this._getOrCreateStagedMealSelection();
    const staged_recipes = ids
      .map((id) => recipes.find((r) => r.id === id))
      .filter((r) => !!r);

    return { staged_recipes: this._clone(staged_recipes) };
  }

  // 7. clearStagedMealSelection()
  clearStagedMealSelection() {
    const ids = this._getOrCreateStagedMealSelection();
    const cleared_count = ids.length;
    this._saveStagedMealSelection([]);
    return { success: true, cleared_count };
  }

  // 8. getRecipeDetail(recipeId)
  getRecipeDetail(recipeId) {
    const recipes = this._getFromStorage('recipes');
    const ingredients = this._getFromStorage('recipe_ingredients');
    const instruction_steps = this._getFromStorage('recipe_instruction_steps');
    const reviews = this._getFromStorage('recipe_reviews');

    const recipe = recipes.find((r) => r.id === recipeId) || null;

    const recipeIngredients = ingredients
      .filter((ing) => ing.recipe_id === recipeId)
      .map((ing) => {
        const cloned = this._clone(ing);
        cloned.recipe = this._clone(recipe);
        return cloned;
      });

    const recipeSteps = instruction_steps
      .filter((s) => s.recipe_id === recipeId)
      .sort((a, b) => (a.step_number || 0) - (b.step_number || 0))
      .map((s) => {
        const cloned = this._clone(s);
        cloned.recipe = this._clone(recipe);
        return cloned;
      });

    const recent_reviews = reviews
      .filter((rev) => rev.recipe_id === recipeId)
      .sort((a, b) => {
        const ad = a.created_at || '';
        const bd = b.created_at || '';
        return (bd || '').localeCompare(ad || '');
      });

    const user_flags = {
      is_favorite: recipe ? !!recipe.is_favorite : false
    };

    return {
      recipe: this._clone(recipe),
      ingredients: recipeIngredients,
      instruction_steps: recipeSteps,
      recent_reviews: this._clone(recent_reviews),
      user_flags
    };
  }

  // 9. addRecipeIngredientsToShoppingList(recipeId, list_name)
  addRecipeIngredientsToShoppingList(recipeId, list_name) {
    const recipes = this._getFromStorage('recipes');
    const recipe = recipes.find((r) => r.id === recipeId);
    if (!recipe) {
      return { success: false, shopping_list: null, added_items: [], message: 'Recipe not found' };
    }

    const shoppingList = this._getOrCreateActiveShoppingList(list_name);
    const ingredients = this._getFromStorage('recipe_ingredients').filter(
      (ing) => ing.recipe_id === recipeId
    );

    const allItems = this._getFromStorage('shopping_list_items');

    const added_items_raw = ingredients.map((ing) => {
      const item = {
        id: this._generateId('shoppingListItem'),
        shopping_list_id: shoppingList.id,
        item_name: ing.name,
        quantity: typeof ing.quantity === 'number' ? ing.quantity : null,
        unit: ing.unit || null,
        is_purchased: false,
        source_type: 'recipe',
        source_id: recipeId,
        price_per_unit: null,
        estimated_total_price: null,
        notes: ing.notes || null
      };
      allItems.push(item);
      return item;
    });

    this._saveToStorage('shopping_list_items', allItems);

    // Update shopping list updated_at
    const shoppingLists = this._getFromStorage('shopping_lists');
    const listInStore = shoppingLists.find((l) => l.id === shoppingList.id);
    if (listInStore) {
      listInStore.updated_at = this._nowIso();
      this._saveToStorage('shopping_lists', shoppingLists);
    }

    const { total_estimated_price } = this._recalculateShoppingListTotals(shoppingList.id);

    const recipesAll = recipes;
    const foodProducts = this._getFromStorage('food_products');

    const added_items = added_items_raw.map((it) =>
      this._resolveShoppingListItemFKs(it, shoppingList, recipesAll, foodProducts)
    );

    return {
      success: true,
      shopping_list: shoppingList,
      added_items,
      message: 'Ingredients added to shopping list',
      total_estimated_price
    };
  }

  // 10. addRecipeToMealPlanSlot(mealPlanId, day_index, meal_type, recipeId, position)
  addRecipeToMealPlanSlot(mealPlanId, day_index, meal_type, recipeId, position) {
    const mealPlans = this._getFromStorage('meal_plans');
    const items = this._getFromStorage('meal_plan_items');
    const recipes = this._getFromStorage('recipes');

    const mealPlan = mealPlans.find((mp) => mp.id === mealPlanId);
    const recipe = recipes.find((r) => r.id === recipeId);

    if (!mealPlan || !recipe) {
      return {
        meal_plan_item: null,
        updated_nutrition_summary: {
          total_calories: 0,
          total_fiber_g: 0,
          total_sugar_g: 0,
          total_protein_g: 0,
          total_fat_g: 0
        }
      };
    }

    const item = {
      id: this._generateId('mealPlanItem'),
      meal_plan_id: mealPlanId,
      recipe_id: recipeId,
      meal_type,
      day_index,
      servings: 1,
      position: typeof position === 'number' ? position : items.length + 1,
      notes: null
    };

    items.push(item);
    this._saveToStorage('meal_plan_items', items);

    const updated_nutrition_summary = this._recalculateMealPlanNutrition(mealPlanId, day_index);

    const resolvedItem = this._resolveMealPlanItemFKs(item, mealPlan, recipes);

    return {
      meal_plan_item: resolvedItem,
      updated_nutrition_summary
    };
  }

  // 11. addRecipeToExistingMealPlan(recipeId, mealPlanId, day_index, meal_type)
  addRecipeToExistingMealPlan(recipeId, mealPlanId, day_index, meal_type) {
    const result = this.addRecipeToMealPlanSlot(mealPlanId, day_index, meal_type, recipeId, null);
    return {
      meal_plan_item: result.meal_plan_item,
      message: result.meal_plan_item ? 'Recipe added to meal plan' : 'Failed to add recipe to meal plan'
    };
  }

  // 12. submitRecipeReview(recipeId, rating, comment)
  submitRecipeReview(recipeId, rating, comment) {
    const recipes = this._getFromStorage('recipes');
    const recipe = recipes.find((r) => r.id === recipeId);
    if (!recipe) {
      return {
        review: null,
        new_average_rating: null,
        new_rating_count: 0
      };
    }

    const clampedRating = Math.max(1, Math.min(5, Number(rating)));

    const reviews = this._getFromStorage('recipe_reviews');
    const review = {
      id: this._generateId('recipeReview'),
      recipe_id: recipeId,
      rating: clampedRating,
      comment: comment || null,
      created_at: this._nowIso()
    };

    reviews.push(review);
    this._saveToStorage('recipe_reviews', reviews);

    const { average_rating, rating_count } = this._updateRecipeAverageRating(recipeId);

    const reviewWithFK = this._clone(review);
    reviewWithFK.recipe = this._clone(recipe);

    return {
      review: reviewWithFK,
      new_average_rating: average_rating,
      new_rating_count: rating_count
    };
  }

  // 13. getRelatedRecipes(recipeId, limit)
  getRelatedRecipes(recipeId, limit) {
    const recipes = this._getFromStorage('recipes');
    const base = recipes.find((r) => r.id === recipeId);
    const max = typeof limit === 'number' && limit > 0 ? limit : 4;

    let candidates = recipes.filter((r) => r.id !== recipeId);

    if (base) {
      const baseCategory = base.category;
      const baseTags = (base.diet_tags || []).concat(base.health_tags || []);
      candidates = candidates
        .map((r) => {
          let score = 0;
          if (r.category === baseCategory) score += 2;
          const tags = (r.diet_tags || []).concat(r.health_tags || []);
          const sharedTags = tags.filter((t) => baseTags.includes(t)).length;
          score += sharedTags;
          score += (r.average_rating || 0) * 0.1;
          return { r, score };
        })
        .sort((a, b) => b.score - a.score)
        .map((x) => x.r);
    }

    return this._clone(candidates.slice(0, max));
  }

  // 14. getFavoriteRecipes(filters, sort_by)
  getFavoriteRecipes(filters, sort_by) {
    const recipes = this._getFromStorage('recipes');
    let favorites = recipes.filter((r) => r.is_favorite);

    const f = filters || {};
    if (f.category) {
      favorites = favorites.filter((r) => r.category === f.category);
    }
    if (typeof f.min_rating === 'number') {
      favorites = favorites.filter((r) => (r.average_rating || 0) >= f.min_rating);
    }
    if (Array.isArray(f.diet_tags_any) && f.diet_tags_any.length > 0) {
      favorites = favorites.filter((r) => {
        const tags = (r.diet_tags || []).concat(r.health_tags || []);
        return f.diet_tags_any.some((t) => tags.includes(t));
      });
    }

    const sb = sort_by || '';
    if (sb === 'rating_desc') {
      favorites.sort((a, b) => (b.average_rating || 0) - (a.average_rating || 0));
    } else if (sb === 'time_asc') {
      favorites.sort((a, b) => (a.total_time_minutes || 0) - (b.total_time_minutes || 0));
    }

    return this._clone(favorites);
  }

  // 15. getMealPlansOverview()
  getMealPlansOverview() {
    const plans = this._getFromStorage('meal_plans');
    return this._clone(plans);
  }

  // 16. createMealPlan(name, plan_type, start_date, end_date, dietary_preferences, total_calories_target_min, total_calories_target_max)
  createMealPlan(
    name,
    plan_type,
    start_date,
    end_date,
    dietary_preferences,
    total_calories_target_min,
    total_calories_target_max
  ) {
    const mealPlans = this._getFromStorage('meal_plans');

    const now = this._nowIso();
    const plan = {
      id: this._generateId('mealPlan'),
      name,
      description: null,
      plan_type,
      start_date: start_date || null,
      end_date: end_date || null,
      total_calories_target_min: typeof total_calories_target_min === 'number'
        ? total_calories_target_min
        : null,
      total_calories_target_max: typeof total_calories_target_max === 'number'
        ? total_calories_target_max
        : null,
      dietary_preferences: Array.isArray(dietary_preferences) ? dietary_preferences : [],
      created_at: now,
      updated_at: now
    };

    mealPlans.push(plan);
    this._saveToStorage('meal_plans', mealPlans);

    return this._clone(plan);
  }

  // 17. getMealPlanDetail(mealPlanId)
  getMealPlanDetail(mealPlanId) {
    const mealPlans = this._getFromStorage('meal_plans');
    const items = this._getFromStorage('meal_plan_items');
    const recipes = this._getFromStorage('recipes');

    const meal_plan = mealPlans.find((mp) => mp.id === mealPlanId) || null;

    const planItemsRaw = items
      .filter((item) => item.meal_plan_id === mealPlanId)
      .sort((a, b) => {
        const da = a.day_index || 0;
        const db = b.day_index || 0;
        if (da !== db) return da - db;
        const ma = a.meal_type || '';
        const mb = b.meal_type || '';
        if (ma !== mb) return ma.localeCompare(mb);
        return (a.position || 0) - (b.position || 0);
      });

    const itemsResolved = planItemsRaw.map((it) => this._resolveMealPlanItemFKs(it, meal_plan, recipes));

    return {
      meal_plan: this._clone(meal_plan),
      items: itemsResolved
    };
  }

  // 18. updateMealPlanMeta(mealPlanId, name, start_date, end_date, dietary_preferences, total_calories_target_min, total_calories_target_max)
  updateMealPlanMeta(
    mealPlanId,
    name,
    start_date,
    end_date,
    dietary_preferences,
    total_calories_target_min,
    total_calories_target_max
  ) {
    const mealPlans = this._getFromStorage('meal_plans');
    const plan = mealPlans.find((mp) => mp.id === mealPlanId);
    if (!plan) {
      return null;
    }

    if (typeof name === 'string') plan.name = name;
    if (typeof start_date !== 'undefined') plan.start_date = start_date;
    if (typeof end_date !== 'undefined') plan.end_date = end_date;
    if (typeof total_calories_target_min !== 'undefined') {
      plan.total_calories_target_min = total_calories_target_min;
    }
    if (typeof total_calories_target_max !== 'undefined') {
      plan.total_calories_target_max = total_calories_target_max;
    }
    if (Array.isArray(dietary_preferences)) {
      plan.dietary_preferences = dietary_preferences;
    }

    plan.updated_at = this._nowIso();
    this._saveToStorage('meal_plans', mealPlans);

    return this._clone(plan);
  }

  // 19. removeMealPlanItem(mealPlanItemId)
  removeMealPlanItem(mealPlanItemId) {
    const items = this._getFromStorage('meal_plan_items');
    const index = items.findIndex((it) => it.id === mealPlanItemId);
    if (index === -1) {
      return { success: false };
    }
    items.splice(index, 1);
    this._saveToStorage('meal_plan_items', items);
    return { success: true };
  }

  // 20. getMealPlanNutritionSummary(mealPlanId, day_index)
  getMealPlanNutritionSummary(mealPlanId, day_index) {
    return this._recalculateMealPlanNutrition(mealPlanId, day_index);
  }

  // 21. searchRecipesForMealPlan(mealPlanId, meal_type, query, filters)
  searchRecipesForMealPlan(mealPlanId, meal_type, query, filters) {
    const mealPlans = this._getFromStorage('meal_plans');
    const allRecipes = this._getFromStorage('recipes');

    let planPreferences = [];
    if (mealPlanId) {
      const plan = mealPlans.find((mp) => mp.id === mealPlanId);
      if (plan && Array.isArray(plan.dietary_preferences)) {
        planPreferences = plan.dietary_preferences;
      }
    }

    const f = filters || {};

    // Map to general recipe filter structure
    const combinedFilters = {
      category: f.category || meal_type || undefined,
      min_calories: f.min_calories,
      max_calories: f.max_calories,
      max_total_time_minutes: f.max_total_time_minutes,
      diet_tags_any: Array.from(
        new Set([].concat(planPreferences || [], f.diet_tags_any || []))
      )
    };

    const results = this._filterAndSortRecipes(allRecipes, query, combinedFilters, null);

    return {
      results: this._clone(results),
      total: results.length
    };
  }

  // 22. getSymptomTrackerOverview(date_from, date_to)
  getSymptomTrackerOverview(date_from, date_to) {
    const entries = this._getFromStorage('symptom_entries');
    let filtered = entries.slice();

    let fromTs = null;
    let toTs = null;
    if (date_from) fromTs = Date.parse(date_from);
    if (date_to) toTs = Date.parse(date_to);

    if (fromTs || toTs) {
      filtered = filtered.filter((e) => {
        const ts = Date.parse(e.date);
        if (fromTs && ts < fromTs) return false;
        if (toTs && ts > toTs) return false;
        return true;
      });
    }

    filtered.sort((a, b) => {
      const ad = a.date || '';
      const bd = b.date || '';
      return (bd || '').localeCompare(ad || '');
    });

    return this._clone(filtered);
  }

  // 23. searchSymptomEntries(filters)
  searchSymptomEntries(filters) {
    const entries = this._getFromStorage('symptom_entries');
    const f = filters || {};

    let results = entries.slice();

    let fromTs = null;
    let toTs = null;
    if (f.date_from) fromTs = Date.parse(f.date_from);
    if (f.date_to) toTs = Date.parse(f.date_to);

    if (fromTs || toTs) {
      results = results.filter((e) => {
        const ts = Date.parse(e.date);
        if (fromTs && ts < fromTs) return false;
        if (toTs && ts > toTs) return false;
        return true;
      });
    }

    if (f.main_symptom) {
      results = results.filter((e) => e.main_symptom === f.main_symptom);
    }

    if (f.severity) {
      results = results.filter((e) => e.severity === f.severity);
    }

    if (Array.isArray(f.triggers_any) && f.triggers_any.length > 0) {
      results = results.filter((e) => {
        const trig = e.triggers || [];
        return f.triggers_any.some((t) => trig.includes(t));
      });
    }

    results.sort((a, b) => {
      const ad = a.date || '';
      const bd = b.date || '';
      return (bd || '').localeCompare(ad || '');
    });

    return this._clone(results);
  }

  // 24. createSymptomEntry(date, meal_timing, main_symptom, severity, triggers, notes)
  createSymptomEntry(date, meal_timing, main_symptom, severity, triggers, notes) {
    const entries = this._getFromStorage('symptom_entries');
    const now = this._nowIso();

    const entry = {
      id: this._generateId('symptomEntry'),
      date,
      meal_timing,
      main_symptom,
      severity,
      triggers: Array.isArray(triggers) ? triggers : [],
      notes: notes || null,
      created_at: now,
      updated_at: now
    };

    entries.push(entry);
    this._saveToStorage('symptom_entries', entries);

    return this._clone(entry);
  }

  // 25. updateSymptomEntry(symptomEntryId, meal_timing, main_symptom, severity, triggers, notes)
  updateSymptomEntry(symptomEntryId, meal_timing, main_symptom, severity, triggers, notes) {
    const entries = this._getFromStorage('symptom_entries');
    const entry = entries.find((e) => e.id === symptomEntryId);
    if (!entry) {
      return null;
    }

    if (typeof meal_timing === 'string') entry.meal_timing = meal_timing;
    if (typeof main_symptom === 'string') entry.main_symptom = main_symptom;
    if (typeof severity === 'string') entry.severity = severity;
    if (typeof notes !== 'undefined') entry.notes = notes;
    if (Array.isArray(triggers)) entry.triggers = triggers;

    entry.updated_at = this._nowIso();
    this._saveToStorage('symptom_entries', entries);

    return this._clone(entry);
  }

  // 26. deleteSymptomEntry(symptomEntryId)
  deleteSymptomEntry(symptomEntryId) {
    const entries = this._getFromStorage('symptom_entries');
    const index = entries.findIndex((e) => e.id === symptomEntryId);
    if (index === -1) {
      return { success: false };
    }
    entries.splice(index, 1);
    this._saveToStorage('symptom_entries', entries);
    return { success: true };
  }

  // 27. getActiveShoppingList()
  getActiveShoppingList() {
    const shoppingList = this._getOrCreateActiveShoppingList();
    const itemsAll = this._getFromStorage('shopping_list_items');
    const recipes = this._getFromStorage('recipes');
    const foodProducts = this._getFromStorage('food_products');

    const itemsForList = itemsAll.filter((it) => it.shopping_list_id === shoppingList.id);

    const itemsResolved = itemsForList.map((it) =>
      this._resolveShoppingListItemFKs(it, shoppingList, recipes, foodProducts)
    );

    const { total_estimated_price } = this._recalculateShoppingListTotals(shoppingList.id);

    return {
      shopping_list: shoppingList,
      items: itemsResolved,
      total_estimated_price
    };
  }

  // 28. addFoodProductToShoppingList(foodProductId, quantity)
  addFoodProductToShoppingList(foodProductId, quantity) {
    const qty = typeof quantity === 'number' && quantity > 0 ? quantity : 1;
    const products = this._getFromStorage('food_products');
    const product = products.find((p) => p.id === foodProductId);
    if (!product) {
      return null;
    }

    const shoppingList = this._getOrCreateActiveShoppingList();
    const items = this._getFromStorage('shopping_list_items');

    const pricePerUnit = typeof product.price === 'number' ? product.price : null;
    const estimated_total_price = pricePerUnit != null ? pricePerUnit * qty : null;

    const item = {
      id: this._generateId('shoppingListItem'),
      shopping_list_id: shoppingList.id,
      item_name: product.name,
      quantity: qty,
      unit: null,
      is_purchased: false,
      source_type: 'food_product',
      source_id: foodProductId,
      price_per_unit: pricePerUnit,
      estimated_total_price,
      notes: null
    };

    items.push(item);
    this._saveToStorage('shopping_list_items', items);

    // update list updated_at
    const lists = this._getFromStorage('shopping_lists');
    const listInStore = lists.find((l) => l.id === shoppingList.id);
    if (listInStore) {
      listInStore.updated_at = this._nowIso();
      this._saveToStorage('shopping_lists', lists);
    }

    const recipes = this._getFromStorage('recipes');
    const resolved = this._resolveShoppingListItemFKs(item, shoppingList, recipes, products);

    return resolved;
  }

  // 29. addManualItemToShoppingList(item_name, quantity, unit, estimated_total_price, notes)
  addManualItemToShoppingList(item_name, quantity, unit, estimated_total_price, notes) {
    const shoppingList = this._getOrCreateActiveShoppingList();
    const items = this._getFromStorage('shopping_list_items');

    const item = {
      id: this._generateId('shoppingListItem'),
      shopping_list_id: shoppingList.id,
      item_name,
      quantity: typeof quantity === 'number' ? quantity : null,
      unit: unit || null,
      is_purchased: false,
      source_type: 'manual',
      source_id: null,
      price_per_unit: null,
      estimated_total_price:
        typeof estimated_total_price === 'number' ? estimated_total_price : null,
      notes: notes || null
    };

    items.push(item);
    this._saveToStorage('shopping_list_items', items);

    const lists = this._getFromStorage('shopping_lists');
    const listInStore = lists.find((l) => l.id === shoppingList.id);
    if (listInStore) {
      listInStore.updated_at = this._nowIso();
      this._saveToStorage('shopping_lists', lists);
    }

    const recipes = this._getFromStorage('recipes');
    const foodProducts = this._getFromStorage('food_products');
    const resolved = this._resolveShoppingListItemFKs(item, shoppingList, recipes, foodProducts);

    return resolved;
  }

  // 30. updateShoppingListItem(shoppingListItemId, quantity, unit, estimated_total_price, notes)
  updateShoppingListItem(shoppingListItemId, quantity, unit, estimated_total_price, notes) {
    const items = this._getFromStorage('shopping_list_items');
    const item = items.find((it) => it.id === shoppingListItemId);
    if (!item) {
      return null;
    }

    if (typeof quantity === 'number') item.quantity = quantity;
    if (typeof unit !== 'undefined') item.unit = unit;
    if (typeof estimated_total_price === 'number') {
      item.estimated_total_price = estimated_total_price;
    }
    if (typeof notes !== 'undefined') item.notes = notes;

    this._saveToStorage('shopping_list_items', items);

    const shoppingLists = this._getFromStorage('shopping_lists');
    const shoppingList = shoppingLists.find((l) => l.id === item.shopping_list_id) || null;
    if (shoppingList) {
      shoppingList.updated_at = this._nowIso();
      this._saveToStorage('shopping_lists', shoppingLists);
    }

    const recipes = this._getFromStorage('recipes');
    const foodProducts = this._getFromStorage('food_products');
    const resolved = this._resolveShoppingListItemFKs(item, shoppingList, recipes, foodProducts);

    return resolved;
  }

  // 31. removeShoppingListItem(shoppingListItemId)
  removeShoppingListItem(shoppingListItemId) {
    const items = this._getFromStorage('shopping_list_items');
    const index = items.findIndex((it) => it.id === shoppingListItemId);
    if (index === -1) {
      return { success: false };
    }

    const [removed] = items.splice(index, 1);
    this._saveToStorage('shopping_list_items', items);

    // update list updated_at
    const shoppingLists = this._getFromStorage('shopping_lists');
    const shoppingList = shoppingLists.find((l) => l.id === removed.shopping_list_id);
    if (shoppingList) {
      shoppingList.updated_at = this._nowIso();
      this._saveToStorage('shopping_lists', shoppingLists);
    }

    return { success: true };
  }

  // 32. toggleShoppingListItemPurchased(shoppingListItemId)
  toggleShoppingListItemPurchased(shoppingListItemId) {
    const items = this._getFromStorage('shopping_list_items');
    const item = items.find((it) => it.id === shoppingListItemId);
    if (!item) {
      return null;
    }

    item.is_purchased = !item.is_purchased;
    this._saveToStorage('shopping_list_items', items);

    const shoppingLists = this._getFromStorage('shopping_lists');
    const shoppingList = shoppingLists.find((l) => l.id === item.shopping_list_id) || null;
    if (shoppingList) {
      shoppingList.updated_at = this._nowIso();
      this._saveToStorage('shopping_lists', shoppingLists);
    }

    const recipes = this._getFromStorage('recipes');
    const foodProducts = this._getFromStorage('food_products');
    const resolved = this._resolveShoppingListItemFKs(item, shoppingList, recipes, foodProducts);

    return resolved;
  }

  // 33. getArticleFilterOptions()
  getArticleFilterOptions() {
    const topic_tags = [
      { value: 'probiotics', label: 'Probiotics' },
      { value: 'fermented_foods', label: 'Fermented foods' },
      { value: 'low_fodmap', label: 'Low-FODMAP' },
      { value: 'fiber', label: 'Fiber' },
      { value: 'gut_health_basics', label: 'Gut health basics' },
      { value: 'recipes', label: 'Recipes' },
      { value: 'lifestyle', label: 'Lifestyle' }
    ];

    return { topic_tags };
  }

  // 34. searchArticles(query, tags_any)
  searchArticles(query, tags_any) {
    const articles = this._getFromStorage('articles');
    let results = articles.slice();

    if (query && typeof query === 'string' && query.trim() !== '') {
      const q = query.trim().toLowerCase();
      results = results.filter((a) => {
        return (
          (a.title && a.title.toLowerCase().includes(q)) ||
          (a.summary && a.summary.toLowerCase().includes(q)) ||
          (a.content && a.content.toLowerCase().includes(q))
        );
      });
    }

    if (Array.isArray(tags_any) && tags_any.length > 0) {
      results = results.filter((a) => {
        const tags = a.tags || [];
        return tags_any.some((t) => tags.includes(t));
      });
    }

    results.sort((a, b) => {
      const ad = a.published_at || a.created_at || '';
      const bd = b.published_at || b.created_at || '';
      return (bd || '').localeCompare(ad || '');
    });

    return this._clone(results);
  }

  // 35. getArticleDetail(articleId)
  getArticleDetail(articleId) {
    const articles = this._getFromStorage('articles');
    const article = articles.find((a) => a.id === articleId) || null;

    // Instrumentation for task completion tracking
    try {
      if (article) {
        const text = [
          article.title || '',
          article.summary || '',
          article.content || ''
        ].join(' ').toLowerCase();
        const tags = Array.isArray(article.tags) ? article.tags : [];
        const hasProbioticWord = text.includes('probiotic');
        const hasRelevantTag = tags.includes('probiotics') || tags.includes('fermented_foods');
        if (hasProbioticWord || hasRelevantTag) {
          let ids = JSON.parse(localStorage.getItem('task5_comparedArticleIds') || '[]');
          if (!ids.includes(articleId)) ids.push(articleId);
          localStorage.setItem('task5_comparedArticleIds', JSON.stringify(ids));
        }
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return this._clone(article);
  }

  // 36. getNotesOverview()
  getNotesOverview() {
    const notes = this._getFromStorage('notes');
    return this._clone(notes);
  }

  // 37. getNoteDetail(noteId)
  getNoteDetail(noteId) {
    const notes = this._getFromStorage('notes');
    const note = notes.find((n) => n.id === noteId) || null;
    return this._clone(note);
  }

  // 38. createOrUpdateNote(noteId, title, content, tags)
  createOrUpdateNote(noteId, title, content, tags) {
    const notes = this._getFromStorage('notes');
    const now = this._nowIso();

    if (noteId) {
      const note = notes.find((n) => n.id === noteId);
      if (!note) {
        return null;
      }
      note.title = title;
      note.content = content;
      if (Array.isArray(tags)) note.tags = tags;
      note.updated_at = now;
      this._saveToStorage('notes', notes);
      return this._clone(note);
    }

    const note = {
      id: this._generateId('note'),
      title,
      content,
      tags: Array.isArray(tags) ? tags : [],
      created_at: now,
      updated_at: now
    };

    notes.push(note);
    this._saveToStorage('notes', notes);

    return this._clone(note);
  }

  // 39. deleteNote(noteId)
  deleteNote(noteId) {
    const notes = this._getFromStorage('notes');
    const index = notes.findIndex((n) => n.id === noteId);
    if (index === -1) {
      return { success: false };
    }
    notes.splice(index, 1);
    this._saveToStorage('notes', notes);
    return { success: true };
  }

  // 40. getFoodFilterOptions()
  getFoodFilterOptions() {
    const categories = [
      { value: 'fermented', label: 'Fermented' },
      { value: 'beverage', label: 'Beverages' },
      { value: 'snack', label: 'Snacks' },
      { value: 'staple', label: 'Staples' },
      { value: 'supplement', label: 'Supplements' },
      { value: 'other', label: 'Other' }
    ];

    const price_ranges = [
      { max_price: 5, label: 'Up to $5' },
      { max_price: 8, label: 'Up to $8' },
      { max_price: 10, label: 'Up to $10' }
    ];

    const rating_options = [
      { min_rating: 3.0, label: '3.0+ stars' },
      { min_rating: 4.0, label: '4.0+ stars' },
      { min_rating: 4.5, label: '4.5+ stars' }
    ];

    const sort_options = [
      { value: 'price_asc', label: 'Price: Low to High' },
      { value: 'rating_desc', label: 'Rating: High to Low' },
      { value: 'popularity_desc', label: 'Most Popular' }
    ];

    return {
      categories,
      price_ranges,
      rating_options,
      sort_options
    };
  }

  // 41. searchFoodProducts(query, filters, sort_by)
  searchFoodProducts(query, filters, sort_by) {
    let products = this._getFromStorage('food_products');
    const f = filters || {};

    if (query && typeof query === 'string' && query.trim() !== '') {
      const q = query.trim().toLowerCase();
      products = products.filter((p) => {
        return (
          (p.name && p.name.toLowerCase().includes(q)) ||
          (p.description && p.description.toLowerCase().includes(q)) ||
          (p.brand && p.brand.toLowerCase().includes(q))
        );
      });
    }

    if (f.category) {
      products = products.filter((p) => p.category === f.category);
    }

    if (typeof f.max_price === 'number') {
      products = products.filter((p) => (p.price || 0) <= f.max_price);
    }

    if (typeof f.min_rating === 'number') {
      products = products.filter((p) => (p.average_rating || 0) >= f.min_rating);
    }

    if (f.is_gut_friendly_only) {
      products = products.filter((p) => p.is_gut_friendly === true);
    }

    const sb = sort_by || '';
    if (sb === 'price_asc') {
      products.sort((a, b) => (a.price || 0) - (b.price || 0));
    } else if (sb === 'rating_desc') {
      products.sort((a, b) => (b.average_rating || 0) - (a.average_rating || 0));
    }

    return this._clone(products);
  }

  // 42. getFoodProductDetail(foodProductId)
  getFoodProductDetail(foodProductId) {
    const products = this._getFromStorage('food_products');
    const product = products.find((p) => p.id === foodProductId) || null;
    return this._clone(product);
  }

  // 43. getProgramsOverview()
  getProgramsOverview() {
    const programs = this._getFromStorage('programs');
    const instances = this._getFromStorage('program_instances');

    const active_instances_raw = instances.filter((pi) => pi.status === 'active');
    const active_instances = active_instances_raw.map((pi) => {
      const program = programs.find((p) => p.id === pi.program_id) || null;
      const cloned = this._clone(pi);
      cloned.program = this._clone(program);
      return cloned;
    });

    return {
      programs: this._clone(programs),
      active_instances
    };
  }

  // 44. getProgramDetail(programId)
  getProgramDetail(programId) {
    const programs = this._getFromStorage('programs');
    const program = programs.find((p) => p.id === programId) || null;
    return this._clone(program);
  }

  // 45. getProgramHabitsOptions(programId)
  getProgramHabitsOptions(programId) {
    // For now, all active habits are available; programId is unused but kept for API shape.
    const habits = this._getFromStorage('habits').filter((h) => h.is_active);
    return this._clone(habits);
  }

  // 46. createProgramInstance(programId, name, start_date)
  createProgramInstance(programId, name, start_date) {
    const programs = this._getFromStorage('programs');
    const instances = this._getFromStorage('program_instances');
    const program = programs.find((p) => p.id === programId) || null;

    const now = this._nowIso();
    const instance = {
      id: this._generateId('programInstance'),
      program_id: programId,
      name: name || (program ? program.name : 'Program instance'),
      status: 'draft',
      start_date: start_date || null,
      end_date: null,
      created_at: now,
      updated_at: now
    };

    instances.push(instance);
    this._saveToStorage('program_instances', instances);

    const cloned = this._clone(instance);
    cloned.program = this._clone(program);
    return cloned;
  }

  // 47. updateProgramInstanceHabitsAndSchedule(programInstanceId, habit_ids, schedule, activate)
  updateProgramInstanceHabitsAndSchedule(programInstanceId, habit_ids, schedule, activate) {
    const instances = this._getFromStorage('program_instances');
    const habits = this._getFromStorage('habits');
    let instance = instances.find((pi) => pi.id === programInstanceId);
    if (!instance) {
      return {
        program_instance: null,
        instance_habits: [],
        habit_schedules: []
      };
    }

    // Remove existing instance habits and schedules
    let instanceHabits = this._getFromStorage('program_instance_habits');
    let schedules = this._getFromStorage('program_habit_schedules');

    const existingHabitIds = instanceHabits
      .filter((ih) => ih.program_instance_id === programInstanceId)
      .map((ih) => ih.id);

    instanceHabits = instanceHabits.filter((ih) => ih.program_instance_id !== programInstanceId);
    schedules = schedules.filter((s) => !existingHabitIds.includes(s.program_instance_habit_id));

    // Create new instance habits
    const habitIdSet = Array.isArray(habit_ids) ? habit_ids : [];
    const newInstanceHabits = habitIdSet.map((hid) => {
      return {
        id: this._generateId('programInstanceHabit'),
        program_instance_id: programInstanceId,
        habit_id: hid,
        notes: null
      };
    });

    instanceHabits = instanceHabits.concat(newInstanceHabits);

    // Map habit_id -> instanceHabit
    const habitIdToInstanceHabit = new Map();
    newInstanceHabits.forEach((ih) => {
      habitIdToInstanceHabit.set(ih.habit_id, ih);
    });

    // Create schedules based on provided schedule array
    const scheduleArray = Array.isArray(schedule) ? schedule : [];
    const newSchedules = [];

    scheduleArray.forEach((sch) => {
      const hid = sch.habit_id;
      const days = Array.isArray(sch.days_of_week) ? sch.days_of_week : [];
      const ih = habitIdToInstanceHabit.get(hid);
      if (!ih) return;
      days.forEach((day) => {
        const s = {
          id: this._generateId('programHabitSchedule'),
          program_instance_habit_id: ih.id,
          day_of_week: day
        };
        newSchedules.push(s);
      });
    });

    schedules = schedules.concat(newSchedules);

    // Save instance habits and schedules
    this._saveToStorage('program_instance_habits', instanceHabits);
    this._saveToStorage('program_habit_schedules', schedules);

    // Update instance status
    if (activate) {
      instance.status = 'active';
      if (!instance.start_date) {
        instance.start_date = this._nowIso();
      }
    }
    instance.updated_at = this._nowIso();
    this._saveToStorage('program_instances', instances);

    const program_instance = this._clone(instance);

    // Resolve FKs for instance habits
    const instance_habits = newInstanceHabits.map((ih) => {
      const habit = habits.find((h) => h.id === ih.habit_id) || null;
      const cloned = this._clone(ih);
      cloned.habit = this._clone(habit);
      cloned.program_instance = this._clone(program_instance);
      return cloned;
    });

    // Resolve FKs for schedules
    const habit_schedules = newSchedules.map((s) => {
      const ih = instance_habits.find((h) => h.id === s.program_instance_habit_id) || null;
      const cloned = this._clone(s);
      cloned.program_instance_habit = ih ? this._clone(ih) : null;
      return cloned;
    });

    return {
      program_instance,
      instance_habits,
      habit_schedules
    };
  }

  // 48. getProgramInstanceDetail(programInstanceId)
  getProgramInstanceDetail(programInstanceId) {
    const programs = this._getFromStorage('programs');
    const instances = this._getFromStorage('program_instances');
    const instanceHabits = this._getFromStorage('program_instance_habits');
    const schedules = this._getFromStorage('program_habit_schedules');
    const habits = this._getFromStorage('habits');

    const program_instance = instances.find((pi) => pi.id === programInstanceId) || null;
    if (!program_instance) {
      return {
        program_instance: null,
        base_program: null,
        instance_habits: [],
        habit_schedules: [],
        habits: []
      };
    }

    const base_program = programs.find((p) => p.id === program_instance.program_id) || null;

    const instanceHabitsForInstance = instanceHabits.filter(
      (ih) => ih.program_instance_id === programInstanceId
    );

    const instance_habits = instanceHabitsForInstance.map((ih) => {
      const habit = habits.find((h) => h.id === ih.habit_id) || null;
      const cloned = this._clone(ih);
      cloned.habit = this._clone(habit);
      cloned.program_instance = this._clone(program_instance);
      return cloned;
    });

    const schedulesForInstanceHabits = schedules.filter((s) =>
      instanceHabitsForInstance.some((ih) => ih.id === s.program_instance_habit_id)
    );

    const habit_schedules = schedulesForInstanceHabits.map((s) => {
      const ih = instance_habits.find((h) => h.id === s.program_instance_habit_id) || null;
      const cloned = this._clone(s);
      cloned.program_instance_habit = ih ? this._clone(ih) : null;
      return cloned;
    });

    const habitIds = Array.from(
      new Set(instanceHabitsForInstance.map((ih) => ih.habit_id))
    );
    const habitsUsed = habits.filter((h) => habitIds.includes(h.id));

    return {
      program_instance: this._clone(program_instance),
      base_program: this._clone(base_program),
      instance_habits,
      habit_schedules,
      habits: this._clone(habitsUsed)
    };
  }

  // 49. getStaticPageContent(page_slug)
  getStaticPageContent(page_slug) {
    const pagesRaw = localStorage.getItem('static_pages');
    const pages = pagesRaw ? JSON.parse(pagesRaw) : {};
    const page = pages[page_slug];
    if (page) {
      return this._clone(page);
    }
    return {
      title: page_slug,
      content_html: ''
    };
  }

  // 50. submitContactMessage(name, email, subject, message)
  submitContactMessage(name, email, subject, message) {
    const messages = this._getFromStorage('contact_messages');
    const entry = {
      id: this._generateId('contactMessage'),
      name,
      email,
      subject,
      message,
      created_at: this._nowIso()
    };
    messages.push(entry);
    this._saveToStorage('contact_messages', messages);

    return {
      success: true,
      message: 'Message submitted successfully'
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