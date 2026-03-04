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

  // ---------------------
  // Storage helpers
  // ---------------------

  _initStorage() {
    const keys = [
      'recipes',
      'ingredients',
      'recipe_ingredients',
      'shopping_lists',
      'shopping_list_items',
      'articles',
      'comments',
      'saved_items',
      'tags',
      'recipe_tags',
      'collections',
      'collection_recipes',
      'meal_plans',
      'meal_plan_slots',
      'contact_messages',
      'meal_plan_summaries'
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

  _getFromStorage(key) {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
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

  _safeNumber(value, fallback) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  _parseDate(value) {
    if (!value) return 0;
    const t = Date.parse(value);
    return Number.isNaN(t) ? 0 : t;
  }

  // ---------------------
  // Private helper functions (from spec)
  // ---------------------

  // Internal helper to fetch/create active shopping list
  _getOrCreateActiveShoppingList() {
    let shoppingLists = this._getFromStorage('shopping_lists');
    let active = shoppingLists.find(sl => sl.status === 'active');
    if (!active) {
      active = {
        id: this._generateId('shopping_list'),
        status: 'active',
        created_at: this._nowIso(),
        updated_at: this._nowIso()
      };
      shoppingLists.push(active);
      this._saveToStorage('shopping_lists', shoppingLists);
    }
    return active;
  }

  // Internal helper to merge shopping list items by ingredient
  _mergeShoppingListItemsByIngredient(shopping_list_id, existingItems, recipeId, recipeIngredients) {
    const now = this._nowIso();
    const addedItems = [];
    const updatedItems = [];

    for (const ri of recipeIngredients) {
      if (!ri) continue;
      const ingredientName = (ri.ingredient_name || '').trim();
      if (!ingredientName) continue;

      const unit = (ri.unit || '').trim().toLowerCase();
      const quantityToAdd = this._safeNumber(ri.quantity, 0);

      // Prefer matching by ingredient_id when present
      let existing = null;
      if (ri.ingredient_id) {
        existing = existingItems.find(it => it.shopping_list_id === shopping_list_id && it.ingredient_id === ri.ingredient_id);
      }
      if (!existing) {
        const lowerName = ingredientName.toLowerCase();
        existing = existingItems.find(it => {
          if (it.shopping_list_id !== shopping_list_id) return false;
          const sameName = (it.ingredient_name || '').toLowerCase() === lowerName;
          const sameUnit = (it.unit || '').trim().toLowerCase() === unit;
          return sameName && sameUnit;
        });
      }

      if (existing) {
        const currentQty = this._safeNumber(existing.quantity, 0);
        existing.quantity = currentQty + quantityToAdd;
        existing.last_updated = now;
        if (!Array.isArray(existing.source_recipe_ids)) {
          existing.source_recipe_ids = [];
        }
        if (!existing.source_recipe_ids.includes(recipeId)) {
          existing.source_recipe_ids.push(recipeId);
        }
        updatedItems.push(existing);
      } else {
        const newItem = {
          id: this._generateId('shopping_list_item'),
          shopping_list_id,
          ingredient_id: ri.ingredient_id || null,
          ingredient_name: ingredientName,
          quantity: quantityToAdd || null,
          unit: ri.unit || null,
          notes: ri.notes || ri.preparation || null,
          is_checked: false,
          source_recipe_ids: [recipeId],
          last_updated: now
        };
        existingItems.push(newItem);
        addedItems.push(newItem);
      }
    }

    return { addedItems, updatedItems, allItems: existingItems };
  }

  // Internal helper to get/create tag by name
  _getOrCreateTagByName(tagName) {
    const name = (tagName || '').trim();
    if (!name) {
      throw new Error('Tag name is required');
    }
    let tags = this._getFromStorage('tags');
    let tag = tags.find(t => t.name.toLowerCase() === name.toLowerCase());
    if (!tag) {
      tag = {
        id: this._generateId('tag'),
        name,
        created_at: this._nowIso()
      };
      tags.push(tag);
      this._saveToStorage('tags', tags);
    }
    return tag;
  }

  // Internal helper to manage SavedItem records
  _setSavedItemState(content_type, content_id, save_type, is_enabled) {
    let savedItems = this._getFromStorage('saved_items');
    const idx = savedItems.findIndex(si => si.content_type === content_type && si.content_id === content_id && si.save_type === save_type);

    let savedItem = null;
    if (is_enabled) {
      if (idx === -1) {
        savedItem = {
          id: this._generateId('saved_item'),
          content_type,
          content_id,
          save_type,
          created_at: this._nowIso()
        };
        savedItems.push(savedItem);
      } else {
        savedItem = savedItems[idx];
      }
    } else {
      if (idx !== -1) {
        savedItem = savedItems[idx];
        savedItems.splice(idx, 1);
        savedItem = null;
      }
    }

    this._saveToStorage('saved_items', savedItems);

    return {
      is_saved: !!is_enabled && !!savedItem,
      saved_item: savedItem
    };
  }

  // Internal helper to recalc meal plan summaries (cached)
  _recalculateMealPlanSummaries() {
    const mealPlans = this._getFromStorage('meal_plans');
    const slots = this._getFromStorage('meal_plan_slots');

    const summaries = mealPlans.map(mp => {
      const mpSlots = slots.filter(s => s.meal_plan_id === mp.id);
      const recipeCount = mpSlots.length;
      const daySet = new Set(mpSlots.map(s => s.day_of_week));
      return {
        meal_plan_id: mp.id,
        recipe_count: recipeCount,
        day_count: daySet.size
      };
    });

    this._saveToStorage('meal_plan_summaries', summaries);
    return summaries;
  }

  // ---------------------
  // Core interface implementations
  // ---------------------

  // getHomePageContent()
  getHomePageContent() {
    const recipes = this._getFromStorage('recipes');
    const collections = this._getFromStorage('collections');
    const articles = this._getFromStorage('articles');

    // Featured recipes: top by rating then reviews
    const featured_recipes = recipes
      .slice()
      .sort((a, b) => {
        const ar = this._safeNumber(a.average_rating, 0);
        const br = this._safeNumber(b.average_rating, 0);
        if (br !== ar) return br - ar;
        const ac = this._safeNumber(a.review_count, 0);
        const bc = this._safeNumber(b.review_count, 0);
        return bc - ac;
      })
      .slice(0, 6);

    // Seasonal collections: return all user collections (no mock)
    const seasonal_collections = collections;

    // Popular articles: top by rating and comment count
    const popular_articles = articles
      .slice()
      .sort((a, b) => {
        const ar = this._safeNumber(a.average_rating, 0);
        const br = this._safeNumber(b.average_rating, 0);
        if (br !== ar) return br - ar;
        const ac = this._safeNumber(a.comment_count, 0);
        const bc = this._safeNumber(b.comment_count, 0);
        return bc - ac;
      })
      .slice(0, 5);

    // Highlight season based on most frequent season in recipes
    const seasonCounts = {};
    for (const r of recipes) {
      if (Array.isArray(r.seasons)) {
        for (const s of r.seasons) {
          if (!seasonCounts[s]) seasonCounts[s] = 0;
          seasonCounts[s] += 1;
        }
      }
    }
    let highlight_season = 'general';
    let maxCount = 0;
    for (const s in seasonCounts) {
      if (seasonCounts[s] > maxCount) {
        maxCount = seasonCounts[s];
        highlight_season = s;
      }
    }

    const hero_message = 'Cook something delicious tonight with what you have on hand.';

    return {
      featured_recipes,
      seasonal_collections,
      popular_articles,
      highlight_season,
      hero_message
    };
  }

  // getRecipeFilterOptions(context)
  getRecipeFilterOptions(context) { // context is currently unused but kept for API compatibility
    const courses = [
      { value: 'main_dish', label: 'Main Dish' },
      { value: 'dessert', label: 'Dessert' },
      { value: 'lunch', label: 'Lunch' },
      { value: 'breakfast_brunch', label: 'Breakfast & Brunch' },
      { value: 'appetizer', label: 'Appetizer' },
      { value: 'side_dish', label: 'Side Dish' },
      { value: 'beverage', label: 'Beverage' },
      { value: 'snack', label: 'Snack' },
      { value: 'other', label: 'Other' }
    ];

    const dietary_labels = [
      { value: 'vegetarian', label: 'Vegetarian' },
      { value: 'vegan', label: 'Vegan' },
      { value: 'nut_free', label: 'Nut-free' },
      { value: 'dairy_free', label: 'Dairy-free' },
      { value: 'gluten_free', label: 'Gluten-free' },
      { value: 'egg_free', label: 'Egg-free' }
    ];

    const seasons = [
      { value: 'spring', label: 'Spring' },
      { value: 'summer', label: 'Summer' },
      { value: 'fall', label: 'Fall' },
      { value: 'winter', label: 'Winter' }
    ];

    const time_ranges = [
      { min_minutes: 0, max_minutes: 15, label: 'Up to 15 minutes' },
      { min_minutes: 0, max_minutes: 30, label: 'Up to 30 minutes' },
      { min_minutes: 0, max_minutes: 45, label: 'Up to 45 minutes' },
      { min_minutes: 0, max_minutes: 60, label: 'Up to 60 minutes' }
    ];

    const serving_options = [2, 4, 6, 8, 10, 12].map(n => ({ value: n, label: String(n) + ' servings' }));

    const cost_ranges = [
      { max_cost_per_serving: 3, label: 'Up to $3 per serving' },
      { max_cost_per_serving: 5, label: 'Up to $5 per serving' },
      { max_cost_per_serving: 10, label: 'Up to $10 per serving' }
    ];

    const calorie_ranges = [
      { max_calories_per_serving: 300, label: 'Up to 300 calories' },
      { max_calories_per_serving: 400, label: 'Up to 400 calories' },
      { max_calories_per_serving: 600, label: 'Up to 600 calories' }
    ];

    return {
      courses,
      dietary_labels,
      seasons,
      time_ranges,
      serving_options,
      cost_ranges,
      calorie_ranges
    };
  }

  // listRecipes(filters, sort_by, page, page_size)
  listRecipes(filters, sort_by, page, page_size) {
    const f = filters || {};
    const sortBy = sort_by || null;
    const pageNum = page && page > 0 ? page : 1;
    const size = page_size && page_size > 0 ? page_size : 20;

    let recipes = this._getFromStorage('recipes');

    recipes = recipes.filter(r => {
      if (f.keyword) {
        const kw = f.keyword.toLowerCase();
        const inTitle = (r.title || '').toLowerCase().includes(kw);
        const inDesc = (r.description || '').toLowerCase().includes(kw);
        const inIngredients = Array.isArray(r.ingredient_keywords)
          ? r.ingredient_keywords.some(k => (k || '').toLowerCase().includes(kw))
          : false;
        if (!inTitle && !inDesc && !inIngredients) return false;
      }

      if (f.course && r.course !== f.course) return false;

      if (typeof f.min_total_time_minutes === 'number' && this._safeNumber(r.total_time_minutes, Infinity) < f.min_total_time_minutes) {
        return false;
      }
      if (typeof f.max_total_time_minutes === 'number' && this._safeNumber(r.total_time_minutes, 0) > f.max_total_time_minutes) {
        return false;
      }

      if (typeof f.min_servings === 'number' && this._safeNumber(r.servings, 0) < f.min_servings) return false;
      if (typeof f.max_servings === 'number' && this._safeNumber(r.servings, Infinity) > f.max_servings) return false;

      if (typeof f.max_calories_per_serving === 'number') {
        const cals = this._safeNumber(r.calories_per_serving, Infinity);
        if (cals > f.max_calories_per_serving) return false;
      }

      if (typeof f.max_cost_per_serving === 'number') {
        const cost = this._safeNumber(r.cost_per_serving, Infinity);
        if (cost > f.max_cost_per_serving) return false;
      }

      if (Array.isArray(f.dietary_labels) && f.dietary_labels.length > 0) {
        const labels = Array.isArray(r.dietary_labels) ? r.dietary_labels : [];
        const hasAll = f.dietary_labels.every(lbl => labels.includes(lbl));
        if (!hasAll) return false;
      }

      if (Array.isArray(f.seasons) && f.seasons.length > 0) {
        const recipeSeasons = Array.isArray(r.seasons) ? r.seasons : [];
        const hasAny = f.seasons.some(s => recipeSeasons.includes(s));
        if (!hasAny) return false;
      }

      if (f.primary_ingredient) {
        const pi = (f.primary_ingredient || '').toLowerCase();
        const rpi = (r.primary_ingredient || '').toLowerCase();
        if (pi && rpi !== pi) return false;
      }

      if (Array.isArray(f.ingredient_keywords) && f.ingredient_keywords.length > 0) {
        const rik = Array.isArray(r.ingredient_keywords) ? r.ingredient_keywords.map(k => (k || '').toLowerCase()) : [];
        const ok = f.ingredient_keywords.every(k => rik.includes((k || '').toLowerCase()));
        if (!ok) return false;
      }

      if (typeof f.min_average_rating === 'number') {
        const rating = this._safeNumber(r.average_rating, 0);
        if (rating < f.min_average_rating) return false;
      }

      if (typeof f.min_review_count === 'number') {
        const rc = this._safeNumber(r.review_count, 0);
        if (rc < f.min_review_count) return false;
      }

      if (typeof f.min_comment_count === 'number') {
        const cc = this._safeNumber(r.comment_count, 0);
        if (cc < f.min_comment_count) return false;
      }

      return true;
    });

    // Sorting
    if (sortBy === 'rating_desc') {
      recipes.sort((a, b) => {
        const ar = this._safeNumber(a.average_rating, 0);
        const br = this._safeNumber(b.average_rating, 0);
        if (br !== ar) return br - ar;
        const ac = this._safeNumber(a.review_count, 0);
        const bc = this._safeNumber(b.review_count, 0);
        return bc - ac;
      });
    } else if (sortBy === 'popularity_desc') {
      recipes.sort((a, b) => {
        const ap = this._safeNumber(a.popularity_score, 0);
        const bp = this._safeNumber(b.popularity_score, 0);
        if (bp !== ap) return bp - ap;
        const ac = this._safeNumber(a.review_count, 0);
        const bc = this._safeNumber(b.review_count, 0);
        return bc - ac;
      });
    } else if (sortBy === 'time_asc') {
      recipes.sort((a, b) => this._safeNumber(a.total_time_minutes, Infinity) - this._safeNumber(b.total_time_minutes, Infinity));
    } else if (sortBy === 'time_desc') {
      recipes.sort((a, b) => this._safeNumber(b.total_time_minutes, 0) - this._safeNumber(a.total_time_minutes, 0));
    } else if (sortBy === 'cost_asc') {
      recipes.sort((a, b) => this._safeNumber(a.cost_per_serving, Infinity) - this._safeNumber(b.cost_per_serving, Infinity));
    } else if (sortBy === 'newest_first') {
      recipes.sort((a, b) => this._parseDate(b.created_at) - this._parseDate(a.created_at));
    }

    const total_results = recipes.length;
    const total_pages = Math.max(1, Math.ceil(total_results / size));
    const start = (pageNum - 1) * size;
    const end = start + size;
    const results = recipes.slice(start, end);

    return {
      results,
      total_results,
      page: pageNum,
      page_size: size,
      total_pages
    };
  }

  // getRecipeDetails(recipeId)
  getRecipeDetails(recipeId) {
    const recipes = this._getFromStorage('recipes');
    const recipe = recipes.find(r => r.id === recipeId) || null;

    const recipeIngredients = this._getFromStorage('recipe_ingredients')
      .filter(ri => ri.recipe_id === recipeId)
      .sort((a, b) => this._safeNumber(a.display_order, 0) - this._safeNumber(b.display_order, 0));

    const savedItems = this._getFromStorage('saved_items');
    const is_favorite = !!savedItems.find(si => si.content_type === 'recipe' && si.content_id === recipeId && si.save_type === 'favorite');

    const recipeTags = this._getFromStorage('recipe_tags').filter(rt => rt.recipe_id === recipeId);
    const tagsAll = this._getFromStorage('tags');
    const tags = recipeTags
      .map(rt => tagsAll.find(t => t.id === rt.tag_id))
      .filter(Boolean);

    const collectionRecipes = this._getFromStorage('collection_recipes').filter(cr => cr.recipe_id === recipeId);
    const collectionsAll = this._getFromStorage('collections');
    const collections = collectionRecipes
      .map(cr => collectionsAll.find(c => c.id === cr.collection_id))
      .filter(Boolean);

    const nutrition = {
      calories_per_serving: recipe ? this._safeNumber(recipe.calories_per_serving, null) : null
    };

    return {
      recipe,
      ingredients: recipeIngredients,
      is_favorite,
      tags,
      collections,
      nutrition
    };
  }

  // getRecipeComments(recipeId, page, page_size)
  getRecipeComments(recipeId, page, page_size) {
    const pageNum = page && page > 0 ? page : 1;
    const size = page_size && page_size > 0 ? page_size : 20;

    let comments = this._getFromStorage('comments').filter(c => c.parent_type === 'recipe' && c.parent_id === recipeId);
    comments.sort((a, b) => this._parseDate(a.created_at) - this._parseDate(b.created_at));

    const total_results = comments.length;
    const total_pages = Math.max(1, Math.ceil(total_results / size));
    const start = (pageNum - 1) * size;
    const end = start + size;
    const pageComments = comments.slice(start, end);

    return {
      comments: pageComments,
      total_results,
      page: pageNum,
      page_size: size
    };
  }

  // postRecipeComment(recipeId, text, author_name)
  postRecipeComment(recipeId, text, author_name) {
    if (!text || !text.trim()) {
      return { success: false, comment: null, message: 'Comment text is required.' };
    }

    const comments = this._getFromStorage('comments');
    const comment = {
      id: this._generateId('comment'),
      parent_type: 'recipe',
      parent_id: recipeId,
      text: text.trim(),
      author_name: author_name || null,
      created_at: this._nowIso()
    };
    comments.push(comment);
    this._saveToStorage('comments', comments);

    // Update recipe comment_count if exists
    const recipes = this._getFromStorage('recipes');
    const recipe = recipes.find(r => r.id === recipeId);
    if (recipe) {
      const current = this._safeNumber(recipe.comment_count, 0);
      recipe.comment_count = current + 1;
      this._saveToStorage('recipes', recipes);
    }

    return { success: true, comment, message: 'Comment posted.' };
  }

  // toggleRecipeFavorite(recipeId, is_favorite)
  toggleRecipeFavorite(recipeId, is_favorite) {
    const state = this._setSavedItemState('recipe', recipeId, 'favorite', !!is_favorite);
    return {
      success: true,
      is_favorite: state.is_saved,
      saved_item: state.saved_item
    };
  }

  // getRecipeTags(recipeId)
  getRecipeTags(recipeId) {
    const recipeTags = this._getFromStorage('recipe_tags').filter(rt => rt.recipe_id === recipeId);
    const tagsAll = this._getFromStorage('tags');
    const tags = recipeTags
      .map(rt => tagsAll.find(t => t.id === rt.tag_id))
      .filter(Boolean);
    return { tags };
  }

  // addTagToRecipe(recipeId, tagName)
  addTagToRecipe(recipeId, tagName) {
    let recipeTags = this._getFromStorage('recipe_tags');
    const tag = this._getOrCreateTagByName(tagName);

    const existing = recipeTags.find(rt => rt.recipe_id === recipeId && rt.tag_id === tag.id);
    if (!existing) {
      recipeTags.push({
        id: this._generateId('recipe_tag'),
        recipe_id: recipeId,
        tag_id: tag.id,
        added_at: this._nowIso()
      });
      this._saveToStorage('recipe_tags', recipeTags);
    }

    // Return updated tags list for this recipe
    recipeTags = this._getFromStorage('recipe_tags').filter(rt => rt.recipe_id === recipeId);
    const tagsAll = this._getFromStorage('tags');
    const tags = recipeTags
      .map(rt => tagsAll.find(t => t.id === rt.tag_id))
      .filter(Boolean);

    return {
      success: true,
      tag,
      recipe_tags: tags
    };
  }

  // getTagsOverview()
  getTagsOverview() {
    const tags = this._getFromStorage('tags');
    const recipeTags = this._getFromStorage('recipe_tags');

    const overview = tags.map(tag => {
      const recipe_count = recipeTags.filter(rt => rt.tag_id === tag.id).length;
      return { tag, recipe_count };
    });

    return { tags: overview };
  }

  // listRecipesByTag(tagId)
  listRecipesByTag(tagId) {
    const tags = this._getFromStorage('tags');
    const tag = tags.find(t => t.id === tagId) || null;

    const recipeTags = this._getFromStorage('recipe_tags').filter(rt => rt.tag_id === tagId);
    const recipesAll = this._getFromStorage('recipes');
    const recipes = recipeTags
      .map(rt => recipesAll.find(r => r.id === rt.recipe_id))
      .filter(Boolean);

    return { tag, recipes };
  }

  // listCollections()
  listCollections() {
    const collections = this._getFromStorage('collections');
    const collectionRecipes = this._getFromStorage('collection_recipes');

    const result = collections.map(collection => {
      const recipe_count = collectionRecipes.filter(cr => cr.collection_id === collection.id).length;
      return { collection, recipe_count };
    });

    return { collections: result };
  }

  // getCollectionDetails(collectionId)
  getCollectionDetails(collectionId) {
    const collections = this._getFromStorage('collections');
    const collection = collections.find(c => c.id === collectionId) || null;

    const collectionRecipes = this._getFromStorage('collection_recipes').filter(cr => cr.collection_id === collectionId);
    const recipesAll = this._getFromStorage('recipes');
    const recipes = collectionRecipes
      .map(cr => recipesAll.find(r => r.id === cr.recipe_id))
      .filter(Boolean);

    return { collection, recipes };
  }

  // addRecipeToCollection(recipeId, collectionId)
  addRecipeToCollection(recipeId, collectionId) {
    const collections = this._getFromStorage('collections');
    const collection = collections.find(c => c.id === collectionId) || null;
    if (!collection) {
      return { success: false, collection: null };
    }

    const recipes = this._getFromStorage('recipes');
    const recipe = recipes.find(r => r.id === recipeId) || null;
    if (!recipe) {
      return { success: false, collection: null };
    }

    let collectionRecipes = this._getFromStorage('collection_recipes');
    const exists = collectionRecipes.find(cr => cr.collection_id === collectionId && cr.recipe_id === recipeId);
    if (!exists) {
      collectionRecipes.push({
        id: this._generateId('collection_recipe'),
        collection_id: collectionId,
        recipe_id: recipeId,
        added_at: this._nowIso()
      });
      this._saveToStorage('collection_recipes', collectionRecipes);
    }

    return { success: true, collection };
  }

  // createCollectionAndAddRecipe(recipeId, name, description)
  createCollectionAndAddRecipe(recipeId, name, description) {
    const collections = this._getFromStorage('collections');
    const collection = {
      id: this._generateId('collection'),
      name: (name || '').trim() || 'Untitled Collection',
      description: description || null,
      created_at: this._nowIso()
    };
    collections.push(collection);
    this._saveToStorage('collections', collections);

    this.addRecipeToCollection(recipeId, collection.id);

    return { success: true, collection };
  }

  // renameCollection(collectionId, new_name)
  renameCollection(collectionId, new_name) {
    const collections = this._getFromStorage('collections');
    const collection = collections.find(c => c.id === collectionId) || null;
    if (!collection) {
      return { success: false, collection: null };
    }
    collection.name = (new_name || '').trim() || collection.name;
    collection.updated_at = this._nowIso();
    this._saveToStorage('collections', collections);
    return { success: true, collection };
  }

  // deleteCollection(collectionId)
  deleteCollection(collectionId) {
    const collections = this._getFromStorage('collections');
    const idx = collections.findIndex(c => c.id === collectionId);
    if (idx === -1) {
      return { success: false };
    }
    collections.splice(idx, 1);
    this._saveToStorage('collections', collections);

    const collectionRecipes = this._getFromStorage('collection_recipes').filter(cr => cr.collection_id !== collectionId);
    this._saveToStorage('collection_recipes', collectionRecipes);

    return { success: true };
  }

  // getArticleFilterOptions()
  getArticleFilterOptions() {
    const categories = [
      { value: 'knife_skills', label: 'Knife Skills' },
      { value: 'baking', label: 'Baking' },
      { value: 'sauces', label: 'Sauces' },
      { value: 'substitutions', label: 'Substitutions' },
      { value: 'equipment', label: 'Equipment' },
      { value: 'general', label: 'General' }
    ];

    const content_types = [
      { value: 'tips_substitutions', label: 'Tips & Substitutions' },
      { value: 'technique', label: 'Technique' },
      { value: 'general', label: 'General' }
    ];

    const reading_time_ranges = [
      { min_minutes: 0, max_minutes: 5, label: 'Up to 5 minutes' },
      { min_minutes: 5, max_minutes: 10, label: '5–10 minutes' },
      { min_minutes: 10, max_minutes: 20, label: '10–20 minutes' },
      { min_minutes: 20, max_minutes: null, label: '20+ minutes' }
    ];

    return {
      categories,
      content_types,
      reading_time_ranges
    };
  }

  // listArticles(filters, sort_by, page, page_size)
  listArticles(filters, sort_by, page, page_size) {
    const f = filters || {};
    const sortBy = sort_by || null;
    const pageNum = page && page > 0 ? page : 1;
    const size = page_size && page_size > 0 ? page_size : 20;

    let articles = this._getFromStorage('articles');

    articles = articles.filter(a => {
      if (f.keyword) {
        const kw = f.keyword.toLowerCase();
        const inTitle = (a.title || '').toLowerCase().includes(kw);
        const inSummary = (a.summary || '').toLowerCase().includes(kw);
        const inContent = (a.content || '').toLowerCase().includes(kw);
        if (!inTitle && !inSummary && !inContent) return false;
      }

      if (f.content_type && a.content_type !== f.content_type) return false;
      if (f.category && a.category !== f.category) return false;

      if (typeof f.min_reading_time_minutes === 'number') {
        const rt = this._safeNumber(a.reading_time_minutes, 0);
        if (rt < f.min_reading_time_minutes) return false;
      }
      if (typeof f.max_reading_time_minutes === 'number') {
        const rt = this._safeNumber(a.reading_time_minutes, Infinity);
        if (rt > f.max_reading_time_minutes) return false;
      }

      if (Array.isArray(f.topic_keywords) && f.topic_keywords.length > 0) {
        const atk = Array.isArray(a.topic_keywords) ? a.topic_keywords.map(k => (k || '').toLowerCase()) : [];
        const ok = f.topic_keywords.every(k => atk.includes((k || '').toLowerCase()));
        if (!ok) return false;
      }

      if (typeof f.min_average_rating === 'number') {
        const rating = this._safeNumber(a.average_rating, 0);
        if (rating < f.min_average_rating) return false;
      }

      if (typeof f.min_comment_count === 'number') {
        const cc = this._safeNumber(a.comment_count, 0);
        if (cc < f.min_comment_count) return false;
      }

      return true;
    });

    if (sortBy === 'rating_desc') {
      articles.sort((a, b) => {
        const ar = this._safeNumber(a.average_rating, 0);
        const br = this._safeNumber(b.average_rating, 0);
        if (br !== ar) return br - ar;
        const ac = this._safeNumber(a.comment_count, 0);
        const bc = this._safeNumber(b.comment_count, 0);
        return bc - ac;
      });
    } else if (sortBy === 'most_recent') {
      articles.sort((a, b) => this._parseDate(b.created_at) - this._parseDate(a.created_at));
    } else if (sortBy === 'most_commented') {
      articles.sort((a, b) => this._safeNumber(b.comment_count, 0) - this._safeNumber(a.comment_count, 0));
    } else if (sortBy === 'popularity_desc') {
      articles.sort((a, b) => {
        const ar = this._safeNumber(a.average_rating, 0);
        const br = this._safeNumber(b.average_rating, 0);
        const ac = this._safeNumber(a.comment_count, 0);
        const bc = this._safeNumber(b.comment_count, 0);
        const ap = ar * Math.log(ac + 2);
        const bp = br * Math.log(bc + 2);
        return bp - ap;
      });
    }

    const total_results = articles.length;
    const total_pages = Math.max(1, Math.ceil(total_results / size));
    const start = (pageNum - 1) * size;
    const end = start + size;
    const results = articles.slice(start, end);

    // Instrumentation for task completion tracking
    try {
      if (
        filters &&
        filters.category === 'knife_skills' &&
        typeof filters.min_reading_time_minutes === 'number' &&
        filters.min_reading_time_minutes >= 10
      ) {
        localStorage.setItem(
          'task8_articleFilterParams',
          JSON.stringify({ filters: filters, sort_by: sort_by })
        );
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      results,
      total_results,
      page: pageNum,
      page_size: size,
      total_pages
    };
  }

  // getArticleDetails(articleId)
  getArticleDetails(articleId) {
    const articles = this._getFromStorage('articles');
    const article = articles.find(a => a.id === articleId) || null;

    const savedItems = this._getFromStorage('saved_items');
    const is_bookmarked = !!savedItems.find(si => si.content_type === 'article' && si.content_id === articleId && si.save_type === 'bookmark');

    // Instrumentation for task completion tracking
    try {
      if (
        article &&
        article.category === 'knife_skills' &&
        typeof article.reading_time_minutes === 'number' &&
        article.reading_time_minutes >= 10
      ) {
        localStorage.setItem('task8_openedArticleId', String(articleId));
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return { article, is_bookmarked };
  }

  // getArticleComments(articleId, page, page_size)
  getArticleComments(articleId, page, page_size) {
    const pageNum = page && page > 0 ? page : 1;
    const size = page_size && page_size > 0 ? page_size : 20;

    let comments = this._getFromStorage('comments').filter(c => c.parent_type === 'article' && c.parent_id === articleId);
    comments.sort((a, b) => this._parseDate(a.created_at) - this._parseDate(b.created_at));

    const total_results = comments.length;
    const total_pages = Math.max(1, Math.ceil(total_results / size));
    const start = (pageNum - 1) * size;
    const end = start + size;
    const pageComments = comments.slice(start, end);

    return {
      comments: pageComments,
      total_results,
      page: pageNum,
      page_size: size
    };
  }

  // postArticleComment(articleId, text, author_name)
  postArticleComment(articleId, text, author_name) {
    if (!text || !text.trim()) {
      return { success: false, comment: null, message: 'Comment text is required.' };
    }

    const comments = this._getFromStorage('comments');
    const comment = {
      id: this._generateId('comment'),
      parent_type: 'article',
      parent_id: articleId,
      text: text.trim(),
      author_name: author_name || null,
      created_at: this._nowIso()
    };
    comments.push(comment);
    this._saveToStorage('comments', comments);

    // Update article comment_count if exists
    const articles = this._getFromStorage('articles');
    const article = articles.find(a => a.id === articleId);
    if (article) {
      const current = this._safeNumber(article.comment_count, 0);
      article.comment_count = current + 1;
      this._saveToStorage('articles', articles);
    }

    return { success: true, comment, message: 'Comment posted.' };
  }

  // toggleArticleBookmark(articleId, is_bookmarked)
  toggleArticleBookmark(articleId, is_bookmarked) {
    const state = this._setSavedItemState('article', articleId, 'bookmark', !!is_bookmarked);
    return {
      success: true,
      is_bookmarked: state.is_saved,
      saved_item: state.saved_item
    };
  }

  // getPrintFriendlyArticle(articleId)
  getPrintFriendlyArticle(articleId) {
    const articles = this._getFromStorage('articles');
    const article = articles.find(a => a.id === articleId) || null;

    if (!article) {
      return { article: null, content_html: '' };
    }

    // Instrumentation for task completion tracking
    try {
      if (
        article.category === 'knife_skills' &&
        typeof article.reading_time_minutes === 'number' &&
        article.reading_time_minutes >= 10
      ) {
        localStorage.setItem('task8_printFriendlyArticleId', String(articleId));
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    const title = article.title || '';
    const content = article.content || article.summary || '';
    const escapedTitle = title.replace(/</g, '&lt;').replace(/>/g, '&gt;');

    // Very simple HTML wrapper, metadata only (no heavy layout)
    const content_html = '<html><head><meta charset="utf-8"></head><body>' +
      '<h1>' + escapedTitle + '</h1>' +
      '<div>' + content + '</div>' +
      '</body></html>';

    return { article, content_html };
  }

  // searchAllContent(query, filters, page, page_size)
  searchAllContent(query, filters, page, page_size) {
    const q = (query || '').trim().toLowerCase();
    const f = filters || {};
    const includeRecipes = f.include_recipes !== false; // default true
    const includeArticles = f.include_articles !== false; // default true

    const pageNum = page && page > 0 ? page : 1;
    const size = page_size && page_size > 0 ? page_size : 10;

    let recipes = [];
    let articles = [];

    if (includeRecipes) {
      const allRecipes = this._getFromStorage('recipes');
      recipes = allRecipes.filter(r => {
        if (!q) return true;
        const inTitle = (r.title || '').toLowerCase().includes(q);
        const inDesc = (r.description || '').toLowerCase().includes(q);
        const inIngredients = Array.isArray(r.ingredient_keywords)
          ? r.ingredient_keywords.some(k => (k || '').toLowerCase().includes(q))
          : false;
        return inTitle || inDesc || inIngredients;
      });
    }

    if (includeArticles) {
      const allArticles = this._getFromStorage('articles');
      articles = allArticles.filter(a => {
        if (!q) return true;
        const inTitle = (a.title || '').toLowerCase().includes(q);
        const inSummary = (a.summary || '').toLowerCase().includes(q);
        const inContent = (a.content || '').toLowerCase().includes(q);
        return inTitle || inSummary || inContent;
      });
    }

    // Simple pagination applied separately to each type
    const start = (pageNum - 1) * size;
    const end = start + size;

    return {
      recipes: recipes.slice(start, end),
      articles: articles.slice(start, end)
    };
  }

  // getSavedItems(filters)
  getSavedItems(filters) {
    const f = filters || {};
    const savedItems = this._getFromStorage('saved_items');
    const recipes = this._getFromStorage('recipes');
    const articles = this._getFromStorage('articles');

    let items = savedItems.filter(si => {
      if (f.content_type && si.content_type !== f.content_type) return false;
      if (f.save_type && si.save_type !== f.save_type) return false;
      return true;
    });

    const sortBy = f.sort_by || null;
    if (sortBy === 'most_recent') {
      items.sort((a, b) => this._parseDate(b.created_at) - this._parseDate(a.created_at));
    } else if (sortBy === 'title_asc') {
      items.sort((a, b) => {
        const ra = a.content_type === 'recipe' ? recipes.find(r => r.id === a.content_id) : articles.find(ar => ar.id === a.content_id);
        const rb = b.content_type === 'recipe' ? recipes.find(r => r.id === b.content_id) : articles.find(ar => ar.id === b.content_id);
        const ta = ra ? (ra.title || '').toLowerCase() : '';
        const tb = rb ? (rb.title || '').toLowerCase() : '';
        if (ta < tb) return -1;
        if (ta > tb) return 1;
        return 0;
      });
    }

    const result = items.map(si => {
      const obj = { saved_item: si };
      if (si.content_type === 'recipe') {
        obj.recipe = recipes.find(r => r.id === si.content_id) || null;
      } else if (si.content_type === 'article') {
        obj.article = articles.find(a => a.id === si.content_id) || null;
      }
      return obj;
    });

    return { saved_items: result };
  }

  // getActiveShoppingList()
  getActiveShoppingList() {
    const shopping_list = this._getOrCreateActiveShoppingList();
    const itemsAll = this._getFromStorage('shopping_list_items');
    const ingredients = this._getFromStorage('ingredients');

    const items = itemsAll
      .filter(it => it.shopping_list_id === shopping_list.id)
      .map(it => {
        const ingredient = it.ingredient_id ? (ingredients.find(ing => ing.id === it.ingredient_id) || null) : null;
        return Object.assign({}, it, {
          ingredient,
          shopping_list: shopping_list
        });
      });

    return { shopping_list, items };
  }

  // addAllRecipeIngredientsToShoppingList(recipeId)
  addAllRecipeIngredientsToShoppingList(recipeId) {
    const shopping_list = this._getOrCreateActiveShoppingList();

    const recipeIngredients = this._getFromStorage('recipe_ingredients').filter(ri => ri.recipe_id === recipeId);
    if (recipeIngredients.length === 0) {
      return {
        success: true,
        shopping_list,
        added_items: [],
        updated_items: [],
        message: 'No ingredients to add.'
      };
    }

    let items = this._getFromStorage('shopping_list_items');

    const mergeResult = this._mergeShoppingListItemsByIngredient(shopping_list.id, items, recipeId, recipeIngredients);
    items = mergeResult.allItems;
    this._saveToStorage('shopping_list_items', items);

    return {
      success: true,
      shopping_list,
      added_items: mergeResult.addedItems,
      updated_items: mergeResult.updatedItems,
      message: 'Ingredients added to shopping list.'
    };
  }

  // updateShoppingListItemQuantity(itemId, quantity)
  updateShoppingListItemQuantity(itemId, quantity) {
    let items = this._getFromStorage('shopping_list_items');
    const item = items.find(it => it.id === itemId) || null;
    if (!item) {
      return { success: false, item: null };
    }
    item.quantity = this._safeNumber(quantity, null);
    item.last_updated = this._nowIso();
    this._saveToStorage('shopping_list_items', items);
    return { success: true, item };
  }

  // toggleShoppingListItemChecked(itemId, is_checked)
  toggleShoppingListItemChecked(itemId, is_checked) {
    let items = this._getFromStorage('shopping_list_items');
    const item = items.find(it => it.id === itemId) || null;
    if (!item) {
      return { success: false, item: null };
    }
    item.is_checked = !!is_checked;
    item.last_updated = this._nowIso();
    this._saveToStorage('shopping_list_items', items);
    return { success: true, item };
  }

  // removeShoppingListItem(itemId)
  removeShoppingListItem(itemId) {
    const items = this._getFromStorage('shopping_list_items');
    const idx = items.findIndex(it => it.id === itemId);
    if (idx === -1) {
      return { success: false };
    }
    items.splice(idx, 1);
    this._saveToStorage('shopping_list_items', items);
    return { success: true };
  }

  // listMealPlans()
  listMealPlans() {
    const meal_plans = this._getFromStorage('meal_plans');
    const slots = this._getFromStorage('meal_plan_slots');

    const result = meal_plans.map(mp => {
      const mpSlots = slots.filter(s => s.meal_plan_id === mp.id);
      const recipe_count = mpSlots.length;
      const daySet = new Set(mpSlots.map(s => s.day_of_week));
      const day_count = daySet.size;
      return { meal_plan: mp, recipe_count, day_count };
    });

    return { meal_plans: result };
  }

  // createMealPlan(name, description, plan_type, day_range)
  createMealPlan(name, description, plan_type, day_range) {
    const meal_plans = this._getFromStorage('meal_plans');
    const meal_plan = {
      id: this._generateId('meal_plan'),
      name: (name || '').trim() || 'Untitled Plan',
      description: description || null,
      plan_type: plan_type || 'custom',
      day_range: Array.isArray(day_range) ? day_range.slice() : [],
      created_at: this._nowIso(),
      updated_at: this._nowIso()
    };
    meal_plans.push(meal_plan);
    this._saveToStorage('meal_plans', meal_plans);
    this._recalculateMealPlanSummaries();

    return { success: true, meal_plan };
  }

  // getMealPlanDetails(mealPlanId)
  getMealPlanDetails(mealPlanId) {
    const meal_plans = this._getFromStorage('meal_plans');
    const meal_plan = meal_plans.find(mp => mp.id === mealPlanId) || null;

    const slotsAll = this._getFromStorage('meal_plan_slots');
    const recipes = this._getFromStorage('recipes');

    const slots = slotsAll
      .filter(s => s.meal_plan_id === mealPlanId)
      .map(s => ({
        slot: s,
        recipe: recipes.find(r => r.id === s.recipe_id) || null
      }));

    return { meal_plan, slots };
  }

  // updateMealPlanSlotRecipe(mealPlanId, day_of_week, meal_type, recipeId)
  updateMealPlanSlotRecipe(mealPlanId, day_of_week, meal_type, recipeId) {
    const slots = this._getFromStorage('meal_plan_slots');
    let slot = slots.find(s => s.meal_plan_id === mealPlanId && s.day_of_week === day_of_week && s.meal_type === meal_type) || null;

    if (slot) {
      slot.recipe_id = recipeId;
    } else {
      slot = {
        id: this._generateId('meal_plan_slot'),
        meal_plan_id: mealPlanId,
        day_of_week,
        meal_type,
        recipe_id: recipeId,
        position: 0,
        notes: null
      };
      slots.push(slot);
    }

    this._saveToStorage('meal_plan_slots', slots);

    const meal_plans = this._getFromStorage('meal_plans');
    const meal_plan = meal_plans.find(mp => mp.id === mealPlanId);
    if (meal_plan) {
      meal_plan.updated_at = this._nowIso();
      this._saveToStorage('meal_plans', meal_plans);
    }

    this._recalculateMealPlanSummaries();

    return { success: true, slot };
  }

  // deleteMealPlan(mealPlanId)
  deleteMealPlan(mealPlanId) {
    const meal_plans = this._getFromStorage('meal_plans');
    const idx = meal_plans.findIndex(mp => mp.id === mealPlanId);
    if (idx === -1) {
      return { success: false };
    }
    meal_plans.splice(idx, 1);
    this._saveToStorage('meal_plans', meal_plans);

    const slots = this._getFromStorage('meal_plan_slots').filter(s => s.meal_plan_id !== mealPlanId);
    this._saveToStorage('meal_plan_slots', slots);

    this._recalculateMealPlanSummaries();

    return { success: true };
  }

  // getAboutPageContent()
  getAboutPageContent() {
    const html = '<h1>About</h1><p>This site helps you discover recipes, plan meals, and learn cooking techniques.</p>';
    const last_updated = '2024-01-01';
    return { html, last_updated };
  }

  // getContactPageContent()
  getContactPageContent() {
    const contact_email = 'support@example-culinary-site.com';
    const contact_form_intro = 'Have feedback or a question about a recipe or article? Send us a message.';
    const issue_categories = [
      'general_feedback',
      'recipe_issue',
      'article_issue',
      'other'
    ];
    return { contact_email, contact_form_intro, issue_categories };
  }

  // submitContactMessage(name, email, category, subject, message)
  submitContactMessage(name, email, category, subject, message) {
    if (!name || !name.trim() || !email || !email.trim() || !subject || !subject.trim() || !message || !message.trim()) {
      return { success: false, message_id: null, message: 'All required fields must be provided.' };
    }

    const msgs = this._getFromStorage('contact_messages');
    const msg = {
      id: this._generateId('contact_msg'),
      name: name.trim(),
      email: email.trim(),
      category: category || null,
      subject: subject.trim(),
      message: message.trim(),
      created_at: this._nowIso()
    };
    msgs.push(msg);
    this._saveToStorage('contact_messages', msgs);

    return { success: true, message_id: msg.id, message: 'Message received.' };
  }

  // getHelpFaqContent()
  getHelpFaqContent() {
    const faqs = [
      {
        question: 'How do I add a recipe to my shopping list?',
        answer: 'Open the recipe and click the “Add all ingredients to shopping list” button in the ingredients section.',
        category: 'shopping_list'
      },
      {
        question: 'How do I create a meal plan?',
        answer: 'Go to the Meal Plans section, click “Create New Plan”, choose your days and meals, then add recipes into each slot.',
        category: 'meal_plans'
      },
      {
        question: 'What are tags and collections?',
        answer: 'Tags let you label recipes (for example, “Budget Lunch”). Collections group recipes together for occasions like holidays or weekly menus.',
        category: 'organization'
      }
    ];
    return { faqs };
  }

  // getTermsAndPrivacyContent()
  getTermsAndPrivacyContent() {
    const terms_html = '<h1>Terms of Use</h1><p>Use this site for personal, non-commercial culinary planning and learning.</p>';
    const privacy_html = '<h1>Privacy Policy</h1><p>We store your preferences and saved items locally in your browser using localStorage.</p>';
    const last_updated = '2024-01-01';
    return { terms_html, privacy_html, last_updated };
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