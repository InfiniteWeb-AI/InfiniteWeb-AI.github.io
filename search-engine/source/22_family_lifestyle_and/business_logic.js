// localStorage polyfill for Node.js and environments without localStorage
const localStorage = (function () {
  try {
    if (typeof globalThis !== "undefined" && globalThis.localStorage) {
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
    this.idCounter = this._getNextIdCounter(); // not strictly needed, but kept from template
  }

  // ------------------------------
  // Initialization & Basic Helpers
  // ------------------------------

  _initStorage() {
    const arrayKeys = [
      // Template/example tables (unused but kept for compatibility)
      'users',
      'products',
      'carts',
      'cartItems',
      // Domain tables from data model
      'recipes',
      'recipe_collections',
      'recipe_collection_items',
      'activities',
      'activity_lists',
      'activity_list_items',
      'articles',
      'reading_lists',
      'reading_list_items',
      'comments',
      'product_lists',
      'product_list_items',
      'planner_plans',
      'planner_plan_items',
      'wellness_budgets',
      'wellness_budget_categories',
      'newsletter_preferences',
      'contact_tickets'
    ];

    arrayKeys.forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    });

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key) {
    const data = localStorage.getItem(key);
    try {
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
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

  _compareDatesDesc(a, b) {
    const da = a ? new Date(a).getTime() : 0;
    const db = b ? new Date(b).getTime() : 0;
    return db - da;
  }

  _caseInsensitiveEquals(a, b) {
    if (typeof a !== 'string' || typeof b !== 'string') return false;
    return a.toLowerCase() === b.toLowerCase();
  }

  _normalizeString(str) {
    // Normalize for case-insensitive text search and treat underscores as spaces
    return (str || '')
      .toString()
      .toLowerCase()
      .replace(/_/g, ' ');
  }

  _containsText(haystack, needle) {
    if (!needle) return true;
    if (!haystack) return false;
    return this._normalizeString(haystack).includes(this._normalizeString(needle));
  }

  _paginate(items, page, pageSize) {
    const p = page && page > 0 ? page : 1;
    const ps = pageSize && pageSize > 0 ? pageSize : 20;
    const start = (p - 1) * ps;
    return items.slice(start, start + ps);
  }

  _persistSingleUserState() {
    // All state is written synchronously in each method, so nothing to do here.
    return true;
  }

  // ------------------------------
  // Private helpers: list/collection resolution
  // ------------------------------

  _getOrCreateRecipeCollectionByIdOrName(collectionId, collectionName) {
    let collections = this._getFromStorage('recipe_collections');
    const now = this._now();

    let collection = null;
    if (collectionId) {
      collection = collections.find((c) => c.id === collectionId) || null;
      return collection;
    }

    if (!collectionName) return null;

    const normalizedName = collectionName.trim();
    collection = collections.find((c) => this._caseInsensitiveEquals(c.name, normalizedName)) || null;
    if (!collection) {
      collection = {
        id: this._generateId('rc'),
        name: normalizedName,
        description: '',
        source: 'user_created',
        createdAt: now,
        updatedAt: now
      };
      collections.push(collection);
      this._saveToStorage('recipe_collections', collections);
    }
    return collection;
  }

  _getOrCreateActivityListByIdOrName(listId, listName) {
    let lists = this._getFromStorage('activity_lists');
    const now = this._now();

    let list = null;
    if (listId) {
      list = lists.find((l) => l.id === listId) || null;
      return list;
    }

    if (!listName) return null;

    const normalizedName = listName.trim();
    list = lists.find((l) => this._caseInsensitiveEquals(l.name, normalizedName)) || null;
    if (!list) {
      list = {
        id: this._generateId('al'),
        name: normalizedName,
        description: '',
        source: 'user_created',
        createdAt: now,
        updatedAt: now
      };
      lists.push(list);
      this._saveToStorage('activity_lists', lists);
    }
    return list;
  }

  _getOrCreateProductListByIdOrName(listId, listName) {
    let lists = this._getFromStorage('product_lists');
    const now = this._now();

    let list = null;
    if (listId) {
      list = lists.find((l) => l.id === listId) || null;
      return list;
    }

    if (!listName) return null;

    const normalizedName = listName.trim();
    list = lists.find((l) => this._caseInsensitiveEquals(l.name, normalizedName)) || null;
    if (!list) {
      list = {
        id: this._generateId('pl'),
        name: normalizedName,
        description: '',
        source: 'user_created',
        createdAt: now,
        updatedAt: now
      };
      lists.push(list);
      this._saveToStorage('product_lists', lists);
    }
    return list;
  }

  _getOrCreateReadingListByIdOrName(readingListId, readingListName) {
    let lists = this._getFromStorage('reading_lists');
    const now = this._now();

    let list = null;
    if (readingListId) {
      list = lists.find((l) => l.id === readingListId) || null;
      return list;
    }

    const nameToUse = (readingListName && readingListName.trim()) || 'Reading List';
    list = lists.find((l) => this._caseInsensitiveEquals(l.name, nameToUse)) || null;
    if (!list) {
      list = {
        id: this._generateId('rl'),
        name: nameToUse,
        description: '',
        source: 'system_default',
        createdAt: now,
        updatedAt: now
      };
      lists.push(list);
      this._saveToStorage('reading_lists', lists);
    }
    return list;
  }

  _getOrCreateWellnessBudgetForMonth(month, year) {
    let budgets = this._getFromStorage('wellness_budgets');
    let categories = this._getFromStorage('wellness_budget_categories');
    const now = this._now();

    let budget = budgets.find((b) => b.month === month && b.year === year) || null;
    if (!budget) {
      budget = {
        id: this._generateId('wb'),
        totalAmount: 0,
        month,
        year,
        notes: '',
        createdAt: now,
        updatedAt: now
      };
      budgets.push(budget);
      this._saveToStorage('wellness_budgets', budgets);
    }

    const relatedCategories = categories.filter((c) => c.budgetId === budget.id);

    return { budget, categories: relatedCategories };
  }

  // ------------------------------
  // Example method from template (kept but not used by domain)
  // ------------------------------

  addToCart(userId, productId, quantity = 1) {
    let carts = this._getFromStorage('carts');
    let cartItems = this._getFromStorage('cartItems');

    if (!userId || !productId || quantity <= 0) {
      return { success: false, message: 'Invalid parameters', cartId: null };
    }

    let cart = carts.find((c) => c.userId === userId);
    if (!cart) {
      cart = {
        id: this._generateId('cart'),
        userId,
        createdAt: this._now(),
        updatedAt: this._now()
      };
      carts.push(cart);
    } else {
      cart.updatedAt = this._now();
    }

    let item = cartItems.find((ci) => ci.cartId === cart.id && ci.productId === productId);
    if (item) {
      item.quantity += quantity;
    } else {
      item = {
        id: this._generateId('cart_item'),
        cartId: cart.id,
        productId,
        quantity,
        addedAt: this._now()
      };
      cartItems.push(item);
    }

    this._saveToStorage('carts', carts);
    this._saveToStorage('cartItems', cartItems);
    return { success: true, cartId: cart.id };
  }

  // ------------------------------
  // Homepage
  // ------------------------------

  getHomepageFeaturedContent() {
    const recipes = this._getFromStorage('recipes');
    const articles = this._getFromStorage('articles');
    const activities = this._getFromStorage('activities');

    const featuredRecipes = [...recipes]
      .sort((a, b) => {
        const ra = a.rating || 0;
        const rb = b.rating || 0;
        if (rb !== ra) return rb - ra;
        const rca = a.ratingCount || 0;
        const rcb = b.ratingCount || 0;
        if (rcb !== rca) return rcb - rca;
        return this._compareDatesDesc(a.createdAt, b.createdAt);
      })
      .slice(0, 6);

    const recentWellbeingArticles = articles
      .filter((a) => a.category === 'wellbeing')
      .sort((a, b) => this._compareDatesDesc(a.publishDate, b.publishDate))
      .slice(0, 6);

    const highlightedActivities = [...activities]
      .sort((a, b) => this._compareDatesDesc(a.createdAt, b.createdAt))
      .slice(0, 6);

    return { featuredRecipes, recentWellbeingArticles, highlightedActivities };
  }

  // ------------------------------
  // Recipes
  // ------------------------------

  listRecipes(
    mealType,
    maxCookTimeMinutes,
    maxPrepTimeMinutes,
    maxTotalTimeMinutes,
    maxCaloriesPerServing,
    minRating,
    servings,
    healthTag,
    sortBy,
    page,
    pageSize
  ) {
    const recipes = this._getFromStorage('recipes');
    let filtered = recipes.filter((r) => {
      if (mealType && r.mealType !== mealType) return false;
      if (typeof maxCookTimeMinutes === 'number') {
        if (typeof r.cookTimeMinutes !== 'number' || r.cookTimeMinutes > maxCookTimeMinutes) return false;
      }
      if (typeof maxPrepTimeMinutes === 'number') {
        if (typeof r.prepTimeMinutes !== 'number' || r.prepTimeMinutes > maxPrepTimeMinutes) return false;
      }
      if (typeof maxTotalTimeMinutes === 'number') {
        const t = typeof r.totalTimeMinutes === 'number' ? r.totalTimeMinutes : (typeof r.cookTimeMinutes === 'number' && typeof r.prepTimeMinutes === 'number') ? r.cookTimeMinutes + r.prepTimeMinutes : null;
        if (t === null || t > maxTotalTimeMinutes) return false;
      }
      if (typeof maxCaloriesPerServing === 'number') {
        if (typeof r.caloriesPerServing !== 'number' || r.caloriesPerServing > maxCaloriesPerServing) return false;
      }
      if (typeof minRating === 'number') {
        if (typeof r.rating !== 'number' || r.rating < minRating) return false;
      }
      if (typeof servings === 'number') {
        if (typeof r.servings !== 'number' || r.servings !== servings) return false;
      }
      if (healthTag) {
        const tags = Array.isArray(r.healthTags) ? r.healthTags : [];
        if (!tags.includes(healthTag)) return false;
      }
      return true;
    });

    const sb = sortBy || 'relevance';
    if (sb === 'rating_desc') {
      filtered.sort((a, b) => {
        const ra = a.rating || 0;
        const rb = b.rating || 0;
        if (rb !== ra) return rb - ra;
        const rca = a.ratingCount || 0;
        const rcb = b.ratingCount || 0;
        return rcb - rca;
      });
    } else if (sb === 'newest') {
      filtered.sort((a, b) => this._compareDatesDesc(a.createdAt || a.updatedAt, b.createdAt || b.updatedAt));
    } else if (sb === 'cook_time_asc') {
      filtered.sort((a, b) => {
        const ca = typeof a.cookTimeMinutes === 'number' ? a.cookTimeMinutes : Number.MAX_SAFE_INTEGER;
        const cb = typeof b.cookTimeMinutes === 'number' ? b.cookTimeMinutes : Number.MAX_SAFE_INTEGER;
        return ca - cb;
      });
    } else if (sb === 'calories_asc') {
      filtered.sort((a, b) => {
        const ca = typeof a.caloriesPerServing === 'number' ? a.caloriesPerServing : Number.MAX_SAFE_INTEGER;
        const cb = typeof b.caloriesPerServing === 'number' ? b.caloriesPerServing : Number.MAX_SAFE_INTEGER;
        return ca - cb;
      });
    }

    const totalCount = filtered.length;
    const paged = this._paginate(filtered, page, pageSize);

    return { recipes: paged, totalCount };
  }

  getRecipeFilterOptions() {
    const mealTypes = [
      { value: 'breakfast', label: 'Breakfast' },
      { value: 'lunch', label: 'Lunch' },
      { value: 'dinner', label: 'Dinner' },
      { value: 'snacks', label: 'Snacks' },
      { value: 'dessert', label: 'Dessert' },
      { value: 'drinks', label: 'Drinks' },
      { value: 'other', label: 'Other' }
    ];

    const servingOptions = [1, 2, 4, 6, 8, 10].map((v) => ({ value: v, label: `${v} servings` }));

    const ratingOptions = [
      { value: 4.5, label: '4.5 stars & up' },
      { value: 4.0, label: '4 stars & up' },
      { value: 3.0, label: '3 stars & up' }
    ];

    const cookTimeOptionsMinutes = [
      { value: 15, label: 'Up to 15 minutes' },
      { value: 30, label: 'Up to 30 minutes' },
      { value: 45, label: 'Up to 45 minutes' },
      { value: 60, label: 'Up to 60 minutes' }
    ];

    const calorieOptionsPerServing = [
      { value: 300, label: 'Up to 300 calories' },
      { value: 500, label: 'Up to 500 calories' },
      { value: 600, label: 'Up to 600 calories' },
      { value: 800, label: 'Up to 800 calories' }
    ];

    return {
      mealTypes,
      servingOptions,
      ratingOptions,
      cookTimeOptionsMinutes,
      calorieOptionsPerServing
    };
  }

  getRecipeDetail(recipeId) {
    const recipes = this._getFromStorage('recipes');
    const recipe = recipes.find((r) => r.id === recipeId) || null;

    if (!recipe) {
      return { recipe: null, relatedRecipes: [] };
    }

    const relatedRecipes = recipes
      .filter((r) => r.id !== recipe.id && r.mealType === recipe.mealType)
      .sort((a, b) => {
        const ra = a.rating || 0;
        const rb = b.rating || 0;
        return rb - ra;
      })
      .slice(0, 6);

    return { recipe, relatedRecipes };
  }

  getRecipeCollectionsOverview() {
    const collections = this._getFromStorage('recipe_collections');
    const items = this._getFromStorage('recipe_collection_items');

    return collections.map((collection) => {
      const itemCount = items.filter((i) => i.collectionId === collection.id).length;
      return { collection, itemCount };
    });
  }

  getRecipeCollectionDetail(collectionId) {
    const collections = this._getFromStorage('recipe_collections');
    const items = this._getFromStorage('recipe_collection_items');
    const recipes = this._getFromStorage('recipes');

    const collection = collections.find((c) => c.id === collectionId) || null;
    const collectionItems = items.filter((i) => i.collectionId === collectionId);

    const detailedItems = collectionItems.map((ci) => ({
      collectionItem: ci,
      recipe: recipes.find((r) => r.id === ci.recipeId) || null
    }));

    return { collection, items: detailedItems };
  }

  saveRecipeToCollection(recipeId, collectionId, collectionName) {
    const now = this._now();
    const recipes = this._getFromStorage('recipes');
    const recipe = recipes.find((r) => r.id === recipeId) || null;
    if (!recipe) {
      return { success: false, collection: null, item: null, collectionItemCount: 0, message: 'Recipe not found' };
    }

    const collection = this._getOrCreateRecipeCollectionByIdOrName(collectionId, collectionName);
    if (!collection) {
      return { success: false, collection: null, item: null, collectionItemCount: 0, message: 'Collection not found or name missing' };
    }

    let items = this._getFromStorage('recipe_collection_items');

    let existing = items.find((i) => i.collectionId === collection.id && i.recipeId === recipeId);
    if (existing) {
      const collectionItemCount = items.filter((i) => i.collectionId === collection.id).length;
      return { success: true, collection, item: existing, collectionItemCount, message: 'Recipe already in collection' };
    }

    const position = items.filter((i) => i.collectionId === collection.id).length + 1;
    const item = {
      id: this._generateId('rci'),
      collectionId: collection.id,
      recipeId,
      position,
      addedAt: now
    };

    items.push(item);
    collection.updatedAt = now;

    let collections = this._getFromStorage('recipe_collections');
    collections = collections.map((c) => (c.id === collection.id ? collection : c));

    this._saveToStorage('recipe_collection_items', items);
    this._saveToStorage('recipe_collections', collections);

    const collectionItemCount = items.filter((i) => i.collectionId === collection.id).length;

    return { success: true, collection, item, collectionItemCount, message: 'Recipe saved to collection' };
  }

  // ------------------------------
  // Activities
  // ------------------------------

  listActivities(ageGroup, location, costType, maxDurationMinutes, tags, sortBy, page, pageSize) {
    const activities = this._getFromStorage('activities');
    const tagFilter = Array.isArray(tags) ? tags : null;

    let filtered = activities.filter((a) => {
      if (ageGroup) {
        // Hierarchical: include all_ages in specific age-group filters
        if (a.ageGroup !== ageGroup && a.ageGroup !== 'all_ages') return false;
      }

      if (location) {
        if (location === 'indoors') {
          if (!(a.location === 'indoors' || a.location === 'mixed')) return false;
        } else if (location === 'outdoors') {
          if (!(a.location === 'outdoors' || a.location === 'mixed')) return false;
        } else {
          if (a.location !== location) return false;
        }
      }

      if (costType && a.costType !== costType) return false;

      if (typeof maxDurationMinutes === 'number') {
        if (typeof a.durationMinutes !== 'number' || a.durationMinutes > maxDurationMinutes) return false;
      }

      if (tagFilter && tagFilter.length > 0) {
        const atags = Array.isArray(a.tags) ? a.tags : [];
        const hasAll = tagFilter.every((t) => atags.includes(t));
        if (!hasAll) return false;
      }
      return true;
    });

    const sb = sortBy || 'relevance';
    if (sb === 'duration_asc') {
      filtered.sort((a, b) => {
        const da = typeof a.durationMinutes === 'number' ? a.durationMinutes : Number.MAX_SAFE_INTEGER;
        const db = typeof b.durationMinutes === 'number' ? b.durationMinutes : Number.MAX_SAFE_INTEGER;
        return da - db;
      });
    } else if (sb === 'newest') {
      filtered.sort((a, b) => this._compareDatesDesc(a.createdAt, b.createdAt));
    }

    const totalCount = filtered.length;
    const paged = this._paginate(filtered, page, pageSize);

    return { activities: paged, totalCount };
  }

  getActivityFilterOptions() {
    const ageGroups = [
      { value: 'years_0_2', label: '0–2 years' },
      { value: 'years_3_6', label: '3–6 years' },
      { value: 'years_5_8', label: '5–8 years' },
      { value: 'years_9_12', label: '9–12 years' },
      { value: 'years_13_18', label: '13–18 years' },
      { value: 'all_ages', label: 'All ages' },
      { value: 'parents_only', label: 'Parents only' }
    ];

    const locations = [
      { value: 'indoors', label: 'Indoors' },
      { value: 'outdoors', label: 'Outdoors' },
      { value: 'mixed', label: 'Indoors & Outdoors' }
    ];

    const costTypes = [
      { value: 'free', label: '$0 / Free' },
      { value: 'low_cost', label: 'Low cost' },
      { value: 'paid', label: 'Paid' },
      { value: 'variable', label: 'Variable cost' }
    ];

    const durationOptionsMinutes = [
      { value: 30, label: 'Up to 30 minutes' },
      { value: 60, label: 'Up to 60 minutes' },
      { value: 90, label: 'Up to 90 minutes' },
      { value: 120, label: 'Up to 2 hours' }
    ];

    return { ageGroups, locations, costTypes, durationOptionsMinutes };
  }

  getActivityDetail(activityId) {
    const activities = this._getFromStorage('activities');
    const activity = activities.find((a) => a.id === activityId) || null;

    if (!activity) {
      return { activity: null, relatedActivities: [] };
    }

    const relatedActivities = activities
      .filter((a) => a.id !== activity.id && a.location === activity.location)
      .sort((a, b) => this._compareDatesDesc(a.createdAt, b.createdAt))
      .slice(0, 6);

    return { activity, relatedActivities };
  }

  getActivityListsOverview() {
    const lists = this._getFromStorage('activity_lists');
    const items = this._getFromStorage('activity_list_items');

    return lists.map((list) => {
      const itemCount = items.filter((i) => i.listId === list.id).length;
      return { list, itemCount };
    });
  }

  getActivityListDetail(listId) {
    const lists = this._getFromStorage('activity_lists');
    const items = this._getFromStorage('activity_list_items');
    const activities = this._getFromStorage('activities');

    const list = lists.find((l) => l.id === listId) || null;
    const listItems = items.filter((i) => i.listId === listId);

    const detailedItems = listItems.map((li) => ({
      listItem: li,
      activity: activities.find((a) => a.id === li.activityId) || null
    }));

    return { list, items: detailedItems };
  }

  saveActivityToList(activityId, listId, listName) {
    const now = this._now();
    const activities = this._getFromStorage('activities');
    const activity = activities.find((a) => a.id === activityId) || null;
    if (!activity) {
      return { success: false, list: null, item: null, listItemCount: 0, message: 'Activity not found' };
    }

    const list = this._getOrCreateActivityListByIdOrName(listId, listName);
    if (!list) {
      return { success: false, list: null, item: null, listItemCount: 0, message: 'List not found or name missing' };
    }

    let items = this._getFromStorage('activity_list_items');
    let existing = items.find((i) => i.listId === list.id && i.activityId === activityId);
    if (existing) {
      const listItemCount = items.filter((i) => i.listId === list.id).length;
      return { success: true, list, item: existing, listItemCount, message: 'Activity already in list' };
    }

    const position = items.filter((i) => i.listId === list.id).length + 1;
    const item = {
      id: this._generateId('ali'),
      listId: list.id,
      activityId,
      position,
      addedAt: now
    };

    items.push(item);
    list.updatedAt = now;

    let lists = this._getFromStorage('activity_lists');
    lists = lists.map((l) => (l.id === list.id ? list : l));

    this._saveToStorage('activity_list_items', items);
    this._saveToStorage('activity_lists', lists);

    const listItemCount = items.filter((i) => i.listId === list.id).length;

    return { success: true, list, item, listItemCount, message: 'Activity saved to list' };
  }

  // ------------------------------
  // Articles, Search, Comments, Reading Lists
  // ------------------------------

  searchArticles(
    query,
    category,
    level,
    minPublishDate,
    maxPublishDate,
    ageGroup,
    minSessionLengthMinutes,
    maxSessionLengthMinutes,
    minCommentCount,
    sortBy,
    page,
    pageSize
  ) {
    const articles = this._getFromStorage('articles');
    let filtered = articles.filter((a) => {
      const q = query && query.trim();
      if (q) {
        const inTitle = this._containsText(a.title, q);
        const inSummary = this._containsText(a.summary, q);
        const inContent = this._containsText(a.content, q);
        const tags = Array.isArray(a.tags) ? a.tags : [];
        const inTags = tags.some((t) => this._containsText(t, q));
        if (!inTitle && !inSummary && !inContent && !inTags) return false;
      }

      if (category && a.category !== category) return false;

      if (level && a.level && a.level !== level) return false;

      if (minPublishDate) {
        const minDate = new Date(minPublishDate).getTime();
        const pub = a.publishDate ? new Date(a.publishDate).getTime() : 0;
        if (pub < minDate) return false;
      }

      if (maxPublishDate) {
        const maxDate = new Date(maxPublishDate).getTime();
        const pub = a.publishDate ? new Date(a.publishDate).getTime() : 0;
        if (pub > maxDate) return false;
      }

      if (ageGroup) {
        // Hierarchical: include all_ages and null ageGroup as broadly relevant
        if (a.ageGroup && a.ageGroup !== ageGroup && a.ageGroup !== 'all_ages') return false;
      }

      if (typeof minSessionLengthMinutes === 'number') {
        if (typeof a.sessionLengthMinutes !== 'number' || a.sessionLengthMinutes < minSessionLengthMinutes) return false;
      }

      if (typeof maxSessionLengthMinutes === 'number') {
        if (typeof a.sessionLengthMinutes !== 'number' || a.sessionLengthMinutes > maxSessionLengthMinutes) return false;
      }

      if (typeof minCommentCount === 'number') {
        const cc = typeof a.commentCount === 'number' ? a.commentCount : 0;
        if (cc < minCommentCount) return false;
      }

      return true;
    });

    const sb = sortBy || 'relevance';
    if (sb === 'newest') {
      filtered.sort((a, b) => this._compareDatesDesc(a.publishDate, b.publishDate));
    } else if (sb === 'comment_count_desc') {
      filtered.sort((a, b) => {
        const ca = typeof a.commentCount === 'number' ? a.commentCount : 0;
        const cb = typeof b.commentCount === 'number' ? b.commentCount : 0;
        return cb - ca;
      });
    }

    const totalCount = filtered.length;
    const paged = this._paginate(filtered, page, pageSize);

    return { articles: paged, totalCount };
  }

  getArticleDetail(articleId) {
    const articles = this._getFromStorage('articles');
    const article = articles.find((a) => a.id === articleId) || null;

    if (!article) {
      return { article: null, relatedArticles: [] };
    }

    const relatedArticles = articles
      .filter((a) => a.id !== article.id && a.category === article.category)
      .sort((a, b) => this._compareDatesDesc(a.publishDate, b.publishDate))
      .slice(0, 6);

    return { article, relatedArticles };
  }

  getArticleComments(articleId) {
    const comments = this._getFromStorage('comments');
    const filtered = comments.filter((c) => c.articleId === articleId && c.isApproved !== false);
    const commentCount = filtered.length;
    return { comments: filtered, commentCount };
  }

  addCommentToArticle(articleId, authorName, text) {
    const articles = this._getFromStorage('articles');
    const article = articles.find((a) => a.id === articleId) || null;
    if (!article) {
      return { success: false, comment: null, message: 'Article not found' };
    }

    if (!authorName || !text) {
      return { success: false, comment: null, message: 'Author name and text are required' };
    }

    const now = this._now();
    const comments = this._getFromStorage('comments');
    const comment = {
      id: this._generateId('cmt'),
      articleId,
      authorName,
      text,
      createdAt: now,
      isApproved: true
    };

    comments.push(comment);

    article.commentCount = (article.commentCount || 0) + 1;
    article.updatedAt = now;

    const updatedArticles = articles.map((a) => (a.id === article.id ? article : a));

    this._saveToStorage('comments', comments);
    this._saveToStorage('articles', updatedArticles);

    return { success: true, comment, message: 'Comment submitted' };
  }

  getReadingListsOverview() {
    const lists = this._getFromStorage('reading_lists');
    const items = this._getFromStorage('reading_list_items');

    return lists.map((list) => {
      const itemCount = items.filter((i) => i.readingListId === list.id).length;
      return { list, itemCount };
    });
  }

  getReadingListDetail(readingListId) {
    const lists = this._getFromStorage('reading_lists');
    const items = this._getFromStorage('reading_list_items');
    const articles = this._getFromStorage('articles');

    const readingList = lists.find((l) => l.id === readingListId) || null;
    const listItems = items.filter((i) => i.readingListId === readingListId);

    const detailedItems = listItems.map((li) => ({
      listItem: li,
      article: articles.find((a) => a.id === li.articleId) || null
    }));

    return { readingList, items: detailedItems };
  }

  saveArticleToReadingList(articleId, readingListId, readingListName) {
    const now = this._now();
    const articles = this._getFromStorage('articles');
    const article = articles.find((a) => a.id === articleId) || null;
    if (!article) {
      return { success: false, readingList: null, item: null, listItemCount: 0, message: 'Article not found' };
    }

    const list = this._getOrCreateReadingListByIdOrName(readingListId, readingListName);
    if (!list) {
      return { success: false, readingList: null, item: null, listItemCount: 0, message: 'Reading list not found or name missing' };
    }

    let items = this._getFromStorage('reading_list_items');
    let existing = items.find((i) => i.readingListId === list.id && i.articleId === articleId);
    if (existing) {
      const listItemCount = items.filter((i) => i.readingListId === list.id).length;
      return { success: true, readingList: list, item: existing, listItemCount, message: 'Article already bookmarked' };
    }

    const position = items.filter((i) => i.readingListId === list.id).length + 1;
    const item = {
      id: this._generateId('rli'),
      readingListId: list.id,
      articleId,
      position,
      addedAt: now
    };

    items.push(item);
    list.updatedAt = now;

    let lists = this._getFromStorage('reading_lists');
    lists = lists.map((l) => (l.id === list.id ? list : l));

    this._saveToStorage('reading_list_items', items);
    this._saveToStorage('reading_lists', lists);

    const listItemCount = items.filter((i) => i.readingListId === list.id).length;

    return { success: true, readingList: list, item, listItemCount, message: 'Article saved to reading list' };
  }

  // ------------------------------
  // Shop & Products
  // ------------------------------

  getShopCategories() {
    return [
      { value: 'fitness_and_yoga', label: 'Fitness & Yoga' },
      { value: 'toys', label: 'Toys' },
      { value: 'books', label: 'Books' },
      { value: 'kitchen', label: 'Kitchen' },
      { value: 'electronics', label: 'Electronics' },
      { value: 'subscriptions', label: 'Subscriptions' },
      { value: 'other', label: 'Other' }
    ];
  }

  listProducts(
    category,
    query,
    minPrice,
    maxPrice,
    minRating,
    tags,
    sortBy,
    page,
    pageSize
  ) {
    const products = this._getFromStorage('products');
    const tagFilter = Array.isArray(tags) ? tags : null;

    let filtered = products.filter((p) => {
      if (category && p.category !== category) return false;

      const q = query && query.trim();
      if (q) {
        const inName = this._containsText(p.name, q);
        const inDescription = this._containsText(p.description, q);
        const ptags = Array.isArray(p.tags) ? p.tags : [];
        const inTags = ptags.some((t) => this._containsText(t, q));
        if (!inName && !inDescription && !inTags) return false;
      }

      if (typeof minPrice === 'number') {
        if (typeof p.price !== 'number' || p.price < minPrice) return false;
      }

      if (typeof maxPrice === 'number') {
        if (typeof p.price !== 'number' || p.price > maxPrice) return false;
      }

      if (typeof minRating === 'number') {
        if (typeof p.rating !== 'number' || p.rating < minRating) return false;
      }

      if (tagFilter && tagFilter.length > 0) {
        const ptags = Array.isArray(p.tags) ? p.tags : [];
        const hasAll = tagFilter.every((t) => ptags.includes(t));
        if (!hasAll) return false;
      }

      return true;
    });

    const sb = sortBy || 'relevance';
    if (sb === 'price_asc') {
      filtered.sort((a, b) => {
        const pa = typeof a.price === 'number' ? a.price : Number.MAX_SAFE_INTEGER;
        const pb = typeof b.price === 'number' ? b.price : Number.MAX_SAFE_INTEGER;
        return pa - pb;
      });
    } else if (sb === 'price_desc') {
      filtered.sort((a, b) => {
        const pa = typeof a.price === 'number' ? a.price : 0;
        const pb = typeof b.price === 'number' ? b.price : 0;
        return pb - pa;
      });
    } else if (sb === 'rating_desc') {
      filtered.sort((a, b) => {
        const ra = typeof a.rating === 'number' ? a.rating : 0;
        const rb = typeof b.rating === 'number' ? b.rating : 0;
        if (rb !== ra) return rb - ra;
        const rca = typeof a.ratingCount === 'number' ? a.ratingCount : 0;
        const rcb = typeof b.ratingCount === 'number' ? b.ratingCount : 0;
        return rcb - rca;
      });
    }

    const totalCount = filtered.length;

    // Instrumentation for task completion tracking (task_4 filter params and compared products)
    try {
      const queryMatches = typeof query === 'string' && query.toLowerCase().includes('family yoga mat');
      const maxPriceValid = typeof maxPrice === 'number' && Number.isFinite(maxPrice) && maxPrice <= 60;
      const minRatingValid = typeof minRating === 'number' && minRating >= 4.5;

      if (category === 'fitness_and_yoga' && queryMatches && maxPriceValid && minRatingValid) {
        const paramsValue = { category, query, minPrice, maxPrice, minRating, sortBy, timestamp: this._now() };
        localStorage.setItem('task4_filterParams', JSON.stringify(paramsValue));

        if (filtered && filtered.length >= 2) {
          const ids = filtered.slice(0, 2).map(p => p.id);
          localStorage.setItem('task4_comparedProductIds', JSON.stringify(ids));
        }
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    const paged = this._paginate(filtered, page, pageSize);

    return { products: paged, totalCount };
  }

  getProductFilterOptions() {
    const priceRanges = [
      { min: 0, max: 25, label: 'Under $25' },
      { min: 25, max: 50, label: '$25 to $50' },
      { min: 50, max: 100, label: '$50 to $100' },
      { min: 100, max: 999999, label: '$100 & Above' }
    ];

    const ratingOptions = [
      { value: 4.5, label: '4.5 stars & up' },
      { value: 4.0, label: '4 stars & up' },
      { value: 3.0, label: '3 stars & up' }
    ];

    const products = this._getFromStorage('products');
    const tagSet = new Set();
    products.forEach((p) => {
      (p.tags || []).forEach((t) => tagSet.add(t));
    });
    const tagOptions = Array.from(tagSet).map((t) => ({ value: t, label: t.replace(/_/g, ' ') }));

    return { priceRanges, ratingOptions, tagOptions };
  }

  getProductDetail(productId) {
    const products = this._getFromStorage('products');
    const product = products.find((p) => p.id === productId) || null;

    if (!product) {
      return { product: null, relatedProducts: [] };
    }

    const relatedProducts = products
      .filter((p) => p.id !== product.id && p.category === product.category)
      .sort((a, b) => {
        const ra = a.rating || 0;
        const rb = b.rating || 0;
        return rb - ra;
      })
      .slice(0, 6);

    return { product, relatedProducts };
  }

  getProductListsOverview() {
    const lists = this._getFromStorage('product_lists');
    const items = this._getFromStorage('product_list_items');

    return lists.map((list) => {
      const itemCount = items.filter((i) => i.listId === list.id).length;
      return { list, itemCount };
    });
  }

  getProductListDetail(listId) {
    const lists = this._getFromStorage('product_lists');
    const items = this._getFromStorage('product_list_items');
    const products = this._getFromStorage('products');

    const list = lists.find((l) => l.id === listId) || null;
    const listItems = items.filter((i) => i.listId === listId);

    const detailedItems = listItems.map((li) => ({
      listItem: li,
      product: products.find((p) => p.id === li.productId) || null
    }));

    return { list, items: detailedItems };
  }

  saveProductToList(productId, listId, listName) {
    const now = this._now();
    const products = this._getFromStorage('products');
    const product = products.find((p) => p.id === productId) || null;
    if (!product) {
      return { success: false, list: null, item: null, listItemCount: 0, message: 'Product not found' };
    }

    const list = this._getOrCreateProductListByIdOrName(listId, listName);
    if (!list) {
      return { success: false, list: null, item: null, listItemCount: 0, message: 'Product list not found or name missing' };
    }

    let items = this._getFromStorage('product_list_items');
    let existing = items.find((i) => i.listId === list.id && i.productId === productId);
    if (existing) {
      const listItemCount = items.filter((i) => i.listId === list.id).length;

      // Instrumentation for task completion tracking (task_4 selected product in 'Home Gym' list)
      try {
        if (list && typeof list.name === 'string' && list.name.toLowerCase() === 'home gym') {
          localStorage.setItem('task4_selectedProductId', productId);
        }
      } catch (e) {
        console.error('Instrumentation error:', e);
      }

      return { success: true, list, item: existing, listItemCount, message: 'Product already in list' };
    }

    const position = items.filter((i) => i.listId === list.id).length + 1;
    const item = {
      id: this._generateId('pli'),
      listId: list.id,
      productId,
      position,
      addedAt: now
    };

    items.push(item);
    list.updatedAt = now;

    let lists = this._getFromStorage('product_lists');
    lists = lists.map((l) => (l.id === list.id ? list : l));

    this._saveToStorage('product_list_items', items);
    this._saveToStorage('product_lists', lists);

    const listItemCount = items.filter((i) => i.listId === list.id).length;

    // Instrumentation for task completion tracking (task_4 selected product in 'Home Gym' list)
    try {
      if (list && typeof list.name === 'string' && list.name.toLowerCase() === 'home gym') {
        localStorage.setItem('task4_selectedProductId', productId);
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return { success: true, list, item, listItemCount, message: 'Product saved to list' };
  }

  // ------------------------------
  // Planner
  // ------------------------------

  createPlannerPlan(name, description, startDate, endDate) {
    if (!name || !name.trim()) {
      return { success: false, plan: null, message: 'Name is required' };
    }

    const now = this._now();
    let plans = this._getFromStorage('planner_plans');

    const plan = {
      id: this._generateId('plan'),
      name: name.trim(),
      description: description || '',
      startDate: startDate ? new Date(startDate).toISOString() : null,
      endDate: endDate ? new Date(endDate).toISOString() : null,
      isTemplate: false,
      createdAt: now,
      updatedAt: now
    };

    plans.push(plan);
    this._saveToStorage('planner_plans', plans);

    return { success: true, plan, message: 'Planner plan created' };
  }

  getPlannerPlansOverview() {
    const plans = this._getFromStorage('planner_plans');
    const items = this._getFromStorage('planner_plan_items');

    return plans.map((plan) => {
      const itemCount = items.filter((i) => i.planId === plan.id).length;
      return { plan, itemCount };
    });
  }

  getPlannerPlanDetail(planId) {
    const plans = this._getFromStorage('planner_plans');
    const items = this._getFromStorage('planner_plan_items');
    const activities = this._getFromStorage('activities');
    const recipes = this._getFromStorage('recipes');

    const plan = plans.find((p) => p.id === planId) || null;
    const planItems = items.filter((i) => i.planId === planId);

    const detailedItems = planItems.map((pi) => ({
      ...pi,
      plan,
      activity: pi.activityId ? activities.find((a) => a.id === pi.activityId) || null : null,
      recipe: pi.recipeId ? recipes.find((r) => r.id === pi.recipeId) || null : null
    }));

    return { plan, items: detailedItems };
  }

  addItemToPlannerPlan(planId, itemType, activityId, recipeId, dayOfWeek, notes) {
    const plans = this._getFromStorage('planner_plans');
    const plan = plans.find((p) => p.id === planId) || null;
    if (!plan) {
      return { success: false, planItem: null, message: 'Plan not found' };
    }

    if (itemType !== 'activity' && itemType !== 'recipe') {
      return { success: false, planItem: null, message: 'Invalid itemType' };
    }

    if (!dayOfWeek) {
      return { success: false, planItem: null, message: 'dayOfWeek is required' };
    }

    const now = this._now();
    let items = this._getFromStorage('planner_plan_items');

    let activityIdToUse = null;
    let recipeIdToUse = null;

    if (itemType === 'activity') {
      if (!activityId) {
        return { success: false, planItem: null, message: 'activityId is required for activity items' };
      }
      activityIdToUse = activityId;
    } else {
      if (!recipeId) {
        return { success: false, planItem: null, message: 'recipeId is required for recipe items' };
      }
      recipeIdToUse = recipeId;
    }

    const position = items.filter((i) => i.planId === planId && i.dayOfWeek === dayOfWeek).length + 1;
    const planItem = {
      id: this._generateId('ppi'),
      planId,
      itemType,
      activityId: activityIdToUse,
      recipeId: recipeIdToUse,
      dayOfWeek,
      position,
      notes: notes || '',
      addedAt: now
    };

    items.push(planItem);
    plan.updatedAt = now;

    const updatedPlans = plans.map((p) => (p.id === plan.id ? plan : p));

    this._saveToStorage('planner_plan_items', items);
    this._saveToStorage('planner_plans', updatedPlans);

    return { success: true, planItem, message: 'Item added to plan' };
  }

  removeItemFromPlannerPlan(planItemId) {
    let items = this._getFromStorage('planner_plan_items');
    const existingLength = items.length;
    items = items.filter((i) => i.id !== planItemId);
    const removed = items.length !== existingLength;

    this._saveToStorage('planner_plan_items', items);

    return { success: removed, message: removed ? 'Plan item removed' : 'Plan item not found' };
  }

  getPlannerPlanSchedule(planId) {
    const plans = this._getFromStorage('planner_plans');
    const items = this._getFromStorage('planner_plan_items');
    const activities = this._getFromStorage('activities');
    const recipes = this._getFromStorage('recipes');

    const plan = plans.find((p) => p.id === planId) || null;
    const planItems = items.filter((i) => i.planId === planId);

    const daysMap = {};
    planItems.forEach((pi) => {
      if (!daysMap[pi.dayOfWeek]) {
        daysMap[pi.dayOfWeek] = [];
      }
      daysMap[pi.dayOfWeek].push({
        planItem: pi,
        activity: pi.activityId ? activities.find((a) => a.id === pi.activityId) || null : null,
        recipe: pi.recipeId ? recipes.find((r) => r.id === pi.recipeId) || null : null
      });
    });

    const dayOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const days = dayOrder
      .filter((d) => daysMap[d])
      .map((d) => ({ dayOfWeek: d, items: daysMap[d] }));

    return { plan, days };
  }

  // ------------------------------
  // Tools & Wellness Budget Planner
  // ------------------------------

  getToolsOverview() {
    return [
      {
        key: 'wellness_budget_planner',
        name: 'Wellness Budget Planner',
        description: 'Allocate your family\'s monthly wellness spending across key categories.',
        isRecommended: true
      }
    ];
  }

  getWellnessBudgetForMonth(month, year) {
    const budgets = this._getFromStorage('wellness_budgets');
    const categories = this._getFromStorage('wellness_budget_categories');

    const budget = budgets.find((b) => b.month === month && b.year === year) || null;

    if (!budget) {
      return { budget: null, categories: [] };
    }

    const relatedCategories = categories
      .filter((c) => c.budgetId === budget.id)
      .map((c) => ({ ...c, budget }));

    return { budget, categories: relatedCategories };
  }

  saveWellnessBudget(totalAmount, month, year, categories, notes) {
    if (typeof totalAmount !== 'number' || !month || typeof year !== 'number') {
      return { success: false, budget: null, categories: [], message: 'Invalid parameters' };
    }

    const now = this._now();
    let budgets = this._getFromStorage('wellness_budgets');
    let allCategories = this._getFromStorage('wellness_budget_categories');

    let budget = budgets.find((b) => b.month === month && b.year === year) || null;

    if (!budget) {
      budget = {
        id: this._generateId('wb'),
        totalAmount,
        month,
        year,
        notes: notes || '',
        createdAt: now,
        updatedAt: now
      };
      budgets.push(budget);
    } else {
      budget.totalAmount = totalAmount;
      budget.notes = notes || '';
      budget.updatedAt = now;
      budgets = budgets.map((b) => (b.id === budget.id ? budget : b));
    }

    // Remove existing categories for this budget
    allCategories = allCategories.filter((c) => c.budgetId !== budget.id);

    const newCategories = (categories || []).map((c, index) => ({
      id: this._generateId('wbc'),
      budgetId: budget.id,
      name: c.name,
      amount: c.amount,
      position: typeof c.position === 'number' ? c.position : index + 1
    }));

    allCategories = allCategories.concat(newCategories);

    this._saveToStorage('wellness_budgets', budgets);
    this._saveToStorage('wellness_budget_categories', allCategories);

    const categoriesWithBudget = newCategories.map((c) => ({ ...c, budget }));

    return { success: true, budget, categories: categoriesWithBudget, message: 'Wellness budget saved' };
  }

  // ------------------------------
  // Newsletter Preferences
  // ------------------------------

  getNewsletterPreferences() {
    const prefs = this._getFromStorage('newsletter_preferences');
    const preference = prefs[0] || null;
    return { preferences: preference };
  }

  updateNewsletterPreferences(frequency, dayOfWeek, timeOfDay, topics, email) {
    if (!frequency || !Array.isArray(topics) || !email) {
      return { success: false, preferences: null, message: 'Invalid parameters' };
    }

    if (frequency === 'weekly' && !dayOfWeek) {
      return { success: false, preferences: null, message: 'dayOfWeek is required for weekly frequency' };
    }

    const now = this._now();
    let prefs = this._getFromStorage('newsletter_preferences');

    let preference = prefs[0] || null;
    if (!preference) {
      preference = {
        id: this._generateId('np'),
        frequency,
        dayOfWeek: dayOfWeek || null,
        timeOfDay: timeOfDay || null,
        topics,
        email,
        createdAt: now,
        updatedAt: now
      };
      prefs = [preference];
    } else {
      preference.frequency = frequency;
      preference.dayOfWeek = dayOfWeek || null;
      preference.timeOfDay = timeOfDay || null;
      preference.topics = topics;
      preference.email = email;
      if (!preference.createdAt) preference.createdAt = now;
      preference.updatedAt = now;
      prefs[0] = preference;
    }

    this._saveToStorage('newsletter_preferences', prefs);

    return { success: true, preferences: preference, message: 'Newsletter preferences updated' };
  }

  // ------------------------------
  // Saved Lists & Collections (overview + generic ops)
  // ------------------------------

  getSavedListsAndCollectionsOverview() {
    const recipeCollections = this.getRecipeCollectionsOverview();
    const activityLists = this.getActivityListsOverview();
    const productLists = this.getProductListsOverview();
    const readingLists = this.getReadingListsOverview();

    return { recipeCollections, activityLists, productLists, readingLists };
  }

  createSavedListOrCollection(listType, name, description) {
    if (!listType || !name) {
      return { success: false, listType, listId: null, message: 'Invalid parameters' };
    }

    const now = this._now();
    let listId = null;

    if (listType === 'recipe_collection') {
      let collections = this._getFromStorage('recipe_collections');
      const collection = {
        id: this._generateId('rc'),
        name: name.trim(),
        description: description || '',
        source: 'user_created',
        createdAt: now,
        updatedAt: now
      };
      collections.push(collection);
      this._saveToStorage('recipe_collections', collections);
      listId = collection.id;
    } else if (listType === 'activity_list') {
      let lists = this._getFromStorage('activity_lists');
      const list = {
        id: this._generateId('al'),
        name: name.trim(),
        description: description || '',
        source: 'user_created',
        createdAt: now,
        updatedAt: now
      };
      lists.push(list);
      this._saveToStorage('activity_lists', lists);
      listId = list.id;
    } else if (listType === 'product_list') {
      let lists = this._getFromStorage('product_lists');
      const list = {
        id: this._generateId('pl'),
        name: name.trim(),
        description: description || '',
        source: 'user_created',
        createdAt: now,
        updatedAt: now
      };
      lists.push(list);
      this._saveToStorage('product_lists', lists);
      listId = list.id;
    } else if (listType === 'reading_list') {
      let lists = this._getFromStorage('reading_lists');
      const list = {
        id: this._generateId('rl'),
        name: name.trim(),
        description: description || '',
        source: 'user_created',
        createdAt: now,
        updatedAt: now
      };
      lists.push(list);
      this._saveToStorage('reading_lists', lists);
      listId = list.id;
    } else {
      return { success: false, listType, listId: null, message: 'Unknown listType' };
    }

    return { success: true, listType, listId, message: 'List/collection created' };
  }

  renameSavedListOrCollection(listType, listId, newName) {
    if (!listType || !listId || !newName) {
      return { success: false, message: 'Invalid parameters' };
    }

    const now = this._now();
    let updated = false;

    const updateList = (key, idFieldName) => {
      let lists = this._getFromStorage(key);
      const idx = lists.findIndex((l) => l[idFieldName || 'id'] === listId || l.id === listId);
      if (idx === -1) return false;
      lists[idx].name = newName.trim();
      lists[idx].updatedAt = now;
      this._saveToStorage(key, lists);
      return true;
    };

    if (listType === 'recipe_collection') {
      updated = updateList('recipe_collections');
    } else if (listType === 'activity_list') {
      updated = updateList('activity_lists');
    } else if (listType === 'product_list') {
      updated = updateList('product_lists');
    } else if (listType === 'reading_list') {
      updated = updateList('reading_lists');
    } else {
      return { success: false, message: 'Unknown listType' };
    }

    return { success: updated, message: updated ? 'List renamed' : 'List not found' };
  }

  deleteSavedListOrCollection(listType, listId) {
    if (!listType || !listId) {
      return { success: false, message: 'Invalid parameters' };
    }

    let success = false;

    if (listType === 'recipe_collection') {
      let collections = this._getFromStorage('recipe_collections');
      const before = collections.length;
      collections = collections.filter((c) => c.id !== listId);
      success = collections.length !== before;
      if (success) {
        this._saveToStorage('recipe_collections', collections);
        let items = this._getFromStorage('recipe_collection_items');
        items = items.filter((i) => i.collectionId !== listId);
        this._saveToStorage('recipe_collection_items', items);
      }
    } else if (listType === 'activity_list') {
      let lists = this._getFromStorage('activity_lists');
      const before = lists.length;
      lists = lists.filter((l) => l.id !== listId);
      success = lists.length !== before;
      if (success) {
        this._saveToStorage('activity_lists', lists);
        let items = this._getFromStorage('activity_list_items');
        items = items.filter((i) => i.listId !== listId);
        this._saveToStorage('activity_list_items', items);
      }
    } else if (listType === 'product_list') {
      let lists = this._getFromStorage('product_lists');
      const before = lists.length;
      lists = lists.filter((l) => l.id !== listId);
      success = lists.length !== before;
      if (success) {
        this._saveToStorage('product_lists', lists);
        let items = this._getFromStorage('product_list_items');
        items = items.filter((i) => i.listId !== listId);
        this._saveToStorage('product_list_items', items);
      }
    } else if (listType === 'reading_list') {
      let lists = this._getFromStorage('reading_lists');
      const before = lists.length;
      lists = lists.filter((l) => l.id !== listId);
      success = lists.length !== before;
      if (success) {
        this._saveToStorage('reading_lists', lists);
        let items = this._getFromStorage('reading_list_items');
        items = items.filter((i) => i.readingListId !== listId);
        this._saveToStorage('reading_list_items', items);
      }
    } else {
      return { success: false, message: 'Unknown listType' };
    }

    return { success, message: success ? 'List deleted' : 'List not found' };
  }

  removeItemFromSavedListOrCollection(listType, listId, savedItemId) {
    if (!listType || !listId || !savedItemId) {
      return { success: false, remainingItemCount: 0, message: 'Invalid parameters' };
    }

    let itemsKey = null;
    let parentIdField = null;

    if (listType === 'recipe_collection') {
      itemsKey = 'recipe_collection_items';
      parentIdField = 'collectionId';
    } else if (listType === 'activity_list') {
      itemsKey = 'activity_list_items';
      parentIdField = 'listId';
    } else if (listType === 'product_list') {
      itemsKey = 'product_list_items';
      parentIdField = 'listId';
    } else if (listType === 'reading_list') {
      itemsKey = 'reading_list_items';
      parentIdField = 'readingListId';
    } else {
      return { success: false, remainingItemCount: 0, message: 'Unknown listType' };
    }

    let items = this._getFromStorage(itemsKey);
    const before = items.length;
    items = items.filter((i) => !(i.id === savedItemId && i[parentIdField] === listId));
    const after = items.length;

    this._saveToStorage(itemsKey, items);

    const remainingItemCount = items.filter((i) => i[parentIdField] === listId).length;
    const success = before !== after;

    return { success, remainingItemCount, message: success ? 'Item removed from list' : 'Item not found' };
  }

  // ------------------------------
  // Static Pages & Contact Form
  // ------------------------------

  getStaticPageContent(pageKey) {
    const map = {
      about: { title: 'About', bodyHtml: '', lastUpdated: '' },
      contact: { title: 'Contact', bodyHtml: '', lastUpdated: '' },
      privacy_policy: { title: 'Privacy Policy', bodyHtml: '', lastUpdated: '' },
      terms_of_use: { title: 'Terms of Use', bodyHtml: '', lastUpdated: '' }
    };

    const content = map[pageKey] || { title: '', bodyHtml: '', lastUpdated: '' };
    return content;
  }

  submitContactForm(name, email, subject, message, topic) {
    if (!name || !email || !message) {
      return { success: false, ticketId: null, message: 'Name, email, and message are required' };
    }

    const now = this._now();
    const tickets = this._getFromStorage('contact_tickets');

    const ticketId = this._generateId('ticket');
    const ticket = {
      id: ticketId,
      name,
      email,
      subject: subject || '',
      message,
      topic: topic || 'other',
      createdAt: now
    };

    tickets.push(ticket);
    this._saveToStorage('contact_tickets', tickets);

    return { success: true, ticketId, message: 'Message submitted' };
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