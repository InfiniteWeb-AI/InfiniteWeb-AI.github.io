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

  // ----------------------
  // Internal storage utils
  // ----------------------

  _initStorage() {
    const keysToInitAsArray = [
      'categories',
      'content_items',
      'saved_content_lists',
      'saved_content_list_items',
      'favorite_content_items',
      'newsletter_subscriptions',
      'wellness_activities',
      'self_care_plans',
      'self_care_plan_activities',
      'quizzes',
      'quiz_questions',
      'quiz_answer_options',
      'quiz_result_definitions',
      'style_profiles',
      'products',
      'product_collections',
      'product_collection_items',
      'comments',
      'contact_form_submissions'
    ];

    keysToInitAsArray.forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    });

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, defaultValue) {
    const data = localStorage.getItem(key);
    if (data == null) {
      return typeof defaultValue !== 'undefined' ? defaultValue : [];
    }
    try {
      return JSON.parse(data);
    } catch (e) {
      return typeof defaultValue !== 'undefined' ? defaultValue : [];
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

  // Attach Category to ContentItem
  _attachCategoryToContentItem(item, categoriesCache) {
    if (!item) return null;
    const categories = categoriesCache || this._getFromStorage('categories');
    const category = categories.find((c) => c.id === item.category_id) || null;
    return Object.assign({}, item, { category });
  }

  // Attach Category to Product
  _attachCategoryToProduct(product, categoriesCache) {
    if (!product) return null;
    const categories = categoriesCache || this._getFromStorage('categories');
    const category = categories.find((c) => c.id === product.category_id) || null;
    return Object.assign({}, product, { category });
  }

  // Attach Article (ContentItem) to WellnessActivity
  _attachArticleToWellnessActivity(activity, contentItemsCache, categoriesCache) {
    if (!activity) return null;
    const contentItems = contentItemsCache || this._getFromStorage('content_items');
    const articleRaw = contentItems.find((ci) => ci.id === activity.article_id) || null;
    const article = articleRaw ? this._attachCategoryToContentItem(articleRaw, categoriesCache) : null;
    return Object.assign({}, activity, { article });
  }

  // --------------
  // Helper methods
  // --------------

  // Internal helper to find or create a SavedContentList by name and type
  _getOrCreateSavedContentList(listName, listType) {
    let lists = this._getFromStorage('saved_content_lists');
    let existing = lists.find(
      (l) => l.name === listName && l.list_type === listType
    );
    const now = new Date().toISOString();
    if (!existing) {
      existing = {
        id: this._generateId('scl'),
        name: listName,
        list_type: listType,
        created_at: now,
        updated_at: now
      };
      lists.push(existing);
      this._saveToStorage('saved_content_lists', lists);
      this._persistSingleUserState();
    } else {
      existing.updated_at = now;
      this._saveToStorage('saved_content_lists', lists);
    }
    return existing;
  }

  // Internal helper to find or create a ProductCollection with given name
  _getOrCreateProductCollectionByName(collectionName) {
    let collections = this._getFromStorage('product_collections');
    let existing = collections.find((c) => c.name === collectionName);
    const now = new Date().toISOString();
    if (!existing) {
      existing = {
        id: this._generateId('pc'),
        name: collectionName,
        created_at: now
      };
      collections.push(existing);
      this._saveToStorage('product_collections', collections);
      this._persistSingleUserState();
    }
    return existing;
  }

  // Persist single-user state (placeholder for extensibility)
  _persistSingleUserState() {
    // All persistence is already handled via _saveToStorage.
    // This is a hook for potential future cross-entity persistence logic.
  }

  // Aggregate quiz answers and map to a QuizResultDefinition
  _calculateQuizResultFromAnswers(quizId, answers) {
    const answerOptions = this._getFromStorage('quiz_answer_options');
    const resultDefs = this._getFromStorage('quiz_result_definitions').filter(
      (r) => r.quiz_id === quizId
    );

    const optionById = {};
    answerOptions.forEach((opt) => {
      optionById[opt.id] = opt;
    });

    let rawScore = 0;
    const styleScores = {}; // key: value_key, value: score

    (answers || []).forEach((ans) => {
      (ans.selected_option_ids || []).forEach((optId) => {
        const opt = optionById[optId];
        if (!opt) return;
        const score = typeof opt.score === 'number' ? opt.score : 1;
        rawScore += score;
        const key = opt.value_key || 'default';
        if (!styleScores[key]) styleScores[key] = 0;
        styleScores[key] += score;
      });
    });

    // Pick the style key with highest score
    let bestKey = null;
    let bestScore = -Infinity;
    Object.keys(styleScores).forEach((key) => {
      if (styleScores[key] > bestScore) {
        bestScore = styleScores[key];
        bestKey = key;
      }
    });

    let quizResult = null;
    if (bestKey != null) {
      quizResult = resultDefs.find((r) => r.result_key === bestKey) || null;
    }

    // Fallback to first definition if none found
    if (!quizResult && resultDefs.length > 0) {
      quizResult = resultDefs[0];
    }

    return {
      quiz_result: quizResult,
      raw_score: rawScore
    };
  }

  // Generate SelfCarePlanActivity records from schedule
  _generateSelfCarePlanActivities(planId, schedule) {
    const activities = [];
    (schedule || []).forEach((entry) => {
      if (!entry || !entry.activity_id || !entry.day_of_week || !entry.time) {
        return;
      }
      activities.push({
        id: this._generateId('scpa'),
        plan_id: planId,
        activity_id: entry.activity_id,
        day_of_week: entry.day_of_week,
        time: entry.time
      });
    });
    return activities;
  }

  // -----------------------------
  // Core interface implementations
  // -----------------------------

  // getContentCategories
  getContentCategories() {
    const categories = this._getFromStorage('categories');
    return Array.isArray(categories) ? categories : [];
  }

  // getHomePageContent
  getHomePageContent() {
    const categories = this.getContentCategories();
    const contentItemsRaw = this._getFromStorage('content_items');
    const productsRaw = this._getFromStorage('products');
    const categoriesCache = categories;

    // Featured content: newest few items by publish_date or created_at
    const sortedContent = [...contentItemsRaw].sort((a, b) => {
      const da = new Date(a.publish_date || a.created_at || 0).getTime();
      const db = new Date(b.publish_date || b.created_at || 0).getTime();
      return db - da;
    });
    const featuredContentRaw = sortedContent.slice(0, 6);

    // Featured products: highest rated few
    const sortedProducts = [...productsRaw].sort((a, b) => {
      const ra = typeof a.rating === 'number' ? a.rating : 0;
      const rb = typeof b.rating === 'number' ? b.rating : 0;
      if (rb !== ra) return rb - ra;
      const ca = typeof a.rating_count === 'number' ? a.rating_count : 0;
      const cb = typeof b.rating_count === 'number' ? b.rating_count : 0;
      return cb - ca;
    });
    const featuredProductsRaw = sortedProducts.slice(0, 6);

    // Quick start routines: items marked as routines
    const quickStartRoutinesRaw = contentItemsRaw.filter((ci) => ci.is_routine === true).slice(0, 6);

    const featured_content = featuredContentRaw.map((ci) =>
      this._attachCategoryToContentItem(ci, categoriesCache)
    );
    const featured_products = featuredProductsRaw.map((p) =>
      this._attachCategoryToProduct(p, categoriesCache)
    );
    const quick_start_routines = quickStartRoutinesRaw.map((ci) =>
      this._attachCategoryToContentItem(ci, categoriesCache)
    );

    const spotlight_tools = [
      {
        tool_key: 'self_care_planner',
        title: 'Self-care Planner',
        description: 'Plan your weekly skincare, movement, and mindfulness routines.',
        cta_label: 'Open Planner'
      },
      {
        tool_key: 'wardrobe_style_quiz',
        title: 'Find Your Wardrobe Style',
        description: 'Take the quiz to discover your everyday style profile.',
        cta_label: 'Start Quiz'
      }
    ];

    const last_updated = new Date().toISOString();

    return {
      categories,
      featured_content,
      featured_products,
      quick_start_routines,
      spotlight_tools,
      last_updated
    };
  }

  // getCategoryFilterOptions
  getCategoryFilterOptions(categoryId) {
    const categories = this.getContentCategories();
    const category = categories.find((c) => c.id === categoryId) || null;
    const category_name = category ? category.name : categoryId;

    const items = this._getFromStorage('content_items').filter(
      (ci) => ci.category_id === categoryId
    );

    const uniq = (arr) => Array.from(new Set(arr.filter((v) => v != null)));

    const skin_type_options = uniq(
      items.reduce((acc, ci) => {
        if (Array.isArray(ci.skin_type_tags)) {
          return acc.concat(ci.skin_type_tags);
        }
        return acc;
      }, [])
    );

    const routine_time_of_day_options = uniq(
      items.map((ci) => ci.routine_time_of_day).filter((v) => !!v)
    );

    const hair_type_options = uniq(
      items.reduce((acc, ci) => {
        if (Array.isArray(ci.hair_type_tags)) {
          return acc.concat(ci.hair_type_tags);
        }
        return acc;
      }, [])
    );

    const meal_type_options = uniq(items.map((ci) => ci.meal_type).filter((v) => !!v));

    const dietary_preferences_options = uniq(
      items.reduce((acc, ci) => {
        if (Array.isArray(ci.dietary_preferences)) {
          return acc.concat(ci.dietary_preferences);
        }
        return acc;
      }, [])
    );

    const caloriesValues = items
      .map((ci) => ci.calories_per_serving)
      .filter((v) => typeof v === 'number');
    let calories_range = { min: null, max: null };
    if (caloriesValues.length > 0) {
      calories_range = {
        min: Math.min.apply(null, caloriesValues),
        max: Math.max.apply(null, caloriesValues)
      };
    }

    const tutorial_type_options = uniq(
      items.map((ci) => ci.tutorial_type).filter((v) => !!v && v !== 'none')
    );

    const eye_color_options = uniq(
      items.reduce((acc, ci) => {
        if (Array.isArray(ci.eye_color_targets)) {
          return acc.concat(ci.eye_color_targets);
        }
        return acc;
      }, [])
    );

    const sort_options = [
      { value: 'newest_first', label: 'Newest first' },
      { value: 'most_popular', label: 'Most popular' },
      { value: 'shortest_video_first', label: 'Shortest video first' },
      { value: 'relevance', label: 'Relevance' }
    ];

    return {
      category_id: categoryId,
      category_name,
      skin_type_options,
      routine_time_of_day_options,
      hair_type_options,
      meal_type_options,
      dietary_preferences_options,
      calories_range,
      tutorial_type_options,
      eye_color_options,
      sort_options
    };
  }

  // getCategoryContentListing
  getCategoryContentListing(categoryId, page = 1, pageSize = 20, filters = {}, sortBy = 'newest_first') {
    filters = filters || {};
    const categories = this.getContentCategories();
    const category = categories.find((c) => c.id === categoryId) || null;
    const category_name = category ? category.name : categoryId;

    let items = this._getFromStorage('content_items').filter(
      (ci) => ci.category_id === categoryId
    );

    // Apply filters
    if (filters.skin_type_tags && filters.skin_type_tags.length > 0) {
      const required = filters.skin_type_tags;
      items = items.filter((ci) => {
        const tags = Array.isArray(ci.skin_type_tags) ? ci.skin_type_tags : [];
        return required.some((t) => tags.includes(t));
      });
    }

    if (filters.routine_time_of_day) {
      items = items.filter((ci) => ci.routine_time_of_day === filters.routine_time_of_day);
    }

    if (filters.hair_type_tags && filters.hair_type_tags.length > 0) {
      const requiredHair = filters.hair_type_tags;
      items = items.filter((ci) => {
        const tags = Array.isArray(ci.hair_type_tags) ? ci.hair_type_tags : [];
        return requiredHair.some((t) => tags.includes(t));
      });
    }

    if (typeof filters.is_routine === 'boolean') {
      items = items.filter((ci) => ci.is_routine === filters.is_routine);
    }

    if (filters.meal_type) {
      items = items.filter((ci) => ci.meal_type === filters.meal_type);
    }

    if (filters.dietary_preferences && filters.dietary_preferences.length > 0) {
      const reqDiet = filters.dietary_preferences;
      items = items.filter((ci) => {
        const diet = Array.isArray(ci.dietary_preferences) ? ci.dietary_preferences : [];
        return reqDiet.every((d) => diet.includes(d));
      });
    }

    if (typeof filters.max_calories_per_serving === 'number') {
      const maxCal = filters.max_calories_per_serving;
      items = items.filter(
        (ci) => typeof ci.calories_per_serving === 'number' && ci.calories_per_serving <= maxCal
      );
    }

    if (filters.tutorial_type) {
      items = items.filter((ci) => ci.tutorial_type === filters.tutorial_type);
    }

    if (filters.eye_color_targets && filters.eye_color_targets.length > 0) {
      const reqEyes = filters.eye_color_targets;
      items = items.filter((ci) => {
        const eyes = Array.isArray(ci.eye_color_targets) ? ci.eye_color_targets : [];
        return reqEyes.some((e) => eyes.includes(e));
      });
    }

    if (typeof filters.max_video_duration_seconds === 'number') {
      const maxDur = filters.max_video_duration_seconds;
      items = items.filter(
        (ci) => typeof ci.video_duration_seconds === 'number' && ci.video_duration_seconds <= maxDur
      );
    }

    // Sorting
    const sortKey = sortBy || 'newest_first';
    items.sort((a, b) => {
      if (sortKey === 'most_popular') {
        const pa = typeof a.popularity_score === 'number' ? a.popularity_score : 0;
        const pb = typeof b.popularity_score === 'number' ? b.popularity_score : 0;
        return pb - pa;
      }
      if (sortKey === 'shortest_video_first') {
        const da = typeof a.video_duration_seconds === 'number' ? a.video_duration_seconds : Infinity;
        const db = typeof b.video_duration_seconds === 'number' ? b.video_duration_seconds : Infinity;
        return da - db;
      }
      if (sortKey === 'relevance') {
        // Fallback relevance: most recent popular
        const pa = typeof a.popularity_score === 'number' ? a.popularity_score : 0;
        const pb = typeof b.popularity_score === 'number' ? b.popularity_score : 0;
        if (pb !== pa) return pb - pa;
      }
      // newest_first or default
      const da = new Date(a.publish_date || a.created_at || 0).getTime();
      const db = new Date(b.publish_date || b.created_at || 0).getTime();
      return db - da;
    });

    const total_items = items.length;
    const safePage = page && page > 0 ? page : 1;
    const safePageSize = pageSize && pageSize > 0 ? pageSize : 20;
    const start = (safePage - 1) * safePageSize;
    const paged = items.slice(start, start + safePageSize);

    const itemsWithCategory = paged.map((ci) =>
      this._attachCategoryToContentItem(ci, categories)
    );

    return {
      category_id: categoryId,
      category_name,
      total_items,
      page: safePage,
      page_size: safePageSize,
      items: itemsWithCategory
    };
  }

  // getCategoryHighlightTools
  getCategoryHighlightTools(categoryId) {
    const categories = this.getContentCategories();
    const category = categories.find((c) => c.id === categoryId) || null;
    const category_name = category ? category.name : categoryId;

    const tools = [];
    if (categoryId === 'wellness') {
      tools.push({
        tool_key: 'self_care_planner',
        title: 'Self-care Planner',
        description: 'Drag-and-drop your weekly self-care activities.',
        cta_label: 'Create Plan'
      });
    }
    if (categoryId === 'style') {
      tools.push({
        tool_key: 'wardrobe_style_quiz',
        title: 'Find Your Wardrobe Style',
        description: 'Discover your core wardrobe style with a quick quiz.',
        cta_label: 'Start Quiz'
      });
    }

    return {
      category_id: categoryId,
      category_name,
      tools
    };
  }

  // getContentItemDetail
  getContentItemDetail(contentItemId) {
    const categories = this.getContentCategories();
    const contentItems = this._getFromStorage('content_items');
    const favorites = this._getFromStorage('favorite_content_items');
    const savedListItems = this._getFromStorage('saved_content_list_items');
    const savedLists = this._getFromStorage('saved_content_lists');
    const productsRaw = this._getFromStorage('products');

    const rawItem = contentItems.find((ci) => ci.id === contentItemId) || null;
    const item = rawItem ? this._attachCategoryToContentItem(rawItem, categories) : null;
    const category_name = item && item.category ? item.category.name : null;

    // Instrumentation for task completion tracking (task4_comparedRoutineIds)
    try {
      if (
        item &&
        item.category_id === 'hair' &&
        item.is_routine === true &&
        Array.isArray(item.hair_type_tags) &&
        item.hair_type_tags.includes('Curly') &&
        item.routine_time_of_day === 'Morning'
      ) {
        let existingObj = { ids: [] };
        const existingRaw = localStorage.getItem('task4_comparedRoutineIds');
        if (existingRaw) {
          try {
            const parsed = JSON.parse(existingRaw);
            if (parsed && Array.isArray(parsed.ids)) {
              existingObj = parsed;
            }
          } catch (e2) {
            // Ignore parse errors and fall back to default
          }
        }
        if (
          item.id &&
          !existingObj.ids.includes(item.id) &&
          existingObj.ids.length < 2
        ) {
          existingObj.ids.push(item.id);
          localStorage.setItem('task4_comparedRoutineIds', JSON.stringify(existingObj));
        }
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    const is_favorited = favorites.some((f) => f.content_item_id === contentItemId);

    const saved_to_lists = savedListItems
      .filter((li) => li.content_item_id === contentItemId)
      .map((li) => {
        const list = savedLists.find((l) => l.id === li.list_id);
        if (!list) return null;
        return {
          list_id: list.id,
          list_name: list.name,
          list_type: list.list_type
        };
      })
      .filter((v) => v != null);

    // No structured routine steps or recipe details are modeled, so return null/empty
    const routine_steps = [];

    const recipe_details = null;

    const video_details = rawItem && rawItem.video_url
      ? {
          video_url: rawItem.video_url,
          duration_seconds: rawItem.video_duration_seconds || null
        }
      : null;

    // Related content: other items in same category
    let related_content = [];
    if (rawItem) {
      related_content = contentItems
        .filter((ci) => ci.id !== rawItem.id && ci.category_id === rawItem.category_id)
        .slice(0, 6)
        .map((ci) => this._attachCategoryToContentItem(ci, categories));
    }

    // Related products: products in same category
    let related_products = [];
    if (rawItem) {
      related_products = productsRaw
        .filter((p) => p.category_id === rawItem.category_id)
        .slice(0, 6)
        .map((p) => this._attachCategoryToProduct(p, categories));
    }

    return {
      item,
      category_name,
      routine_steps,
      recipe_details,
      video_details,
      is_favorited,
      saved_to_lists,
      related_content,
      related_products
    };
  }

  // saveContentItemToList
  saveContentItemToList(contentItemId, listName, listType) {
    const contentItems = this._getFromStorage('content_items');
    const contentItem = contentItems.find((ci) => ci.id === contentItemId);
    if (!contentItem) {
      return {
        success: false,
        list: null,
        added_item: null,
        message: 'Content item not found.'
      };
    }

    const list = this._getOrCreateSavedContentList(listName, listType);
    let listItems = this._getFromStorage('saved_content_list_items');

    const existing = listItems.find(
      (li) => li.list_id === list.id && li.content_item_id === contentItemId
    );
    if (existing) {
      return {
        success: true,
        list,
        added_item: existing,
        message: 'Item already in list.'
      };
    }

    const now = new Date().toISOString();
    const newItem = {
      id: this._generateId('scli'),
      list_id: list.id,
      content_item_id: contentItemId,
      added_at: now
    };
    listItems.push(newItem);
    this._saveToStorage('saved_content_list_items', listItems);
    this._persistSingleUserState();

    return {
      success: true,
      list,
      added_item: newItem,
      message: 'Item added to list.'
    };
  }

  // toggleFavoriteContentItem
  toggleFavoriteContentItem(contentItemId) {
    const contentItems = this._getFromStorage('content_items');
    const ci = contentItems.find((c) => c.id === contentItemId);
    if (!ci) {
      return {
        success: false,
        is_favorited: false,
        favorite_id: '',
        message: 'Content item not found.'
      };
    }

    let favorites = this._getFromStorage('favorite_content_items');
    const existingIndex = favorites.findIndex((f) => f.content_item_id === contentItemId);

    if (existingIndex !== -1) {
      const removed = favorites.splice(existingIndex, 1)[0];
      this._saveToStorage('favorite_content_items', favorites);
      this._persistSingleUserState();
      return {
        success: true,
        is_favorited: false,
        favorite_id: removed.id,
        message: 'Favorite removed.'
      };
    }

    const now = new Date().toISOString();
    const favorite = {
      id: this._generateId('fav'),
      content_item_id: contentItemId,
      favorited_at: now
    };
    favorites.push(favorite);
    this._saveToStorage('favorite_content_items', favorites);
    this._persistSingleUserState();

    // Instrumentation for task completion tracking (task4_favoritedRoutineId)
    try {
      if (
        ci &&
        ci.category_id === 'hair' &&
        ci.is_routine === true &&
        Array.isArray(ci.hair_type_tags) &&
        ci.hair_type_tags.includes('Curly') &&
        ci.routine_time_of_day === 'Morning'
      ) {
        localStorage.setItem('task4_favoritedRoutineId', contentItemId);
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      success: true,
      is_favorited: true,
      favorite_id: favorite.id,
      message: 'Item favorited.'
    };
  }

  // getCommentsForContentItem
  getCommentsForContentItem(contentItemId, page = 1, pageSize = 20) {
    const commentsAll = this._getFromStorage('comments');
    const filtered = commentsAll.filter((c) => c.content_item_id === contentItemId);

    filtered.sort((a, b) => {
      const da = new Date(a.created_at || 0).getTime();
      const db = new Date(b.created_at || 0).getTime();
      return da - db;
    });

    const total_comments = filtered.length;
    const safePage = page && page > 0 ? page : 1;
    const safePageSize = pageSize && pageSize > 0 ? pageSize : 20;
    const start = (safePage - 1) * safePageSize;
    const paged = filtered.slice(start, start + safePageSize);

    const contentItems = this._getFromStorage('content_items');
    const categories = this.getContentCategories();
    const contentItem = contentItems.find((ci) => ci.id === contentItemId) || null;
    const enrichedContentItem = contentItem
      ? this._attachCategoryToContentItem(contentItem, categories)
      : null;

    const comments = paged.map((c) => Object.assign({}, c, { content_item: enrichedContentItem }));

    return {
      content_item_id: contentItemId,
      total_comments,
      page: safePage,
      page_size: safePageSize,
      comments
    };
  }

  // postCommentOnContentItem
  postCommentOnContentItem(contentItemId, author_name, author_email, text) {
    const contentItems = this._getFromStorage('content_items');
    const contentItem = contentItems.find((ci) => ci.id === contentItemId);
    if (!contentItem) {
      return {
        success: false,
        comment: null,
        message: 'Content item not found.'
      };
    }

    let comments = this._getFromStorage('comments');
    const now = new Date().toISOString();
    const comment = {
      id: this._generateId('cmt'),
      content_item_id: contentItemId,
      author_name,
      author_email,
      text,
      created_at: now,
      status: 'pending'
    };
    comments.push(comment);
    this._saveToStorage('comments', comments);

    return {
      success: true,
      comment,
      message: 'Comment submitted.'
    };
  }

  // searchContentItems
  searchContentItems(query, page = 1, pageSize = 20, filters = {}, sortBy = 'relevance') {
    const q = (query || '').toLowerCase().trim();
    const allItems = this._getFromStorage('content_items');

    let items = allItems.filter((ci) => {
      if (!q) return true;
      const inTitle = (ci.title || '').toLowerCase().includes(q);
      const inDesc = (ci.description || '').toLowerCase().includes(q);
      const inBody = (ci.body || '').toLowerCase().includes(q);
      return inTitle || inDesc || inBody;
    });

    if (filters.tags && filters.tags.length > 0) {
      const reqTags = filters.tags;
      items = items.filter((ci) => {
        const tags = Array.isArray(ci.tags) ? ci.tags : [];
        return reqTags.every((t) => tags.includes(t));
      });
    }

    if (typeof filters.max_reading_time_minutes === 'number') {
      const maxRt = filters.max_reading_time_minutes;
      items = items.filter(
        (ci) => typeof ci.reading_time_minutes === 'number' && ci.reading_time_minutes <= maxRt
      );
    }

    if (filters.category_id) {
      items = items.filter((ci) => ci.category_id === filters.category_id);
    }

    if (filters.content_types && filters.content_types.length > 0) {
      const allowedTypes = filters.content_types;
      items = items.filter((ci) => allowedTypes.includes(ci.content_type));
    }

    // Scoring for relevance
    const scoredItems = items.map((ci) => {
      let score = 0;
      if (q) {
        const title = (ci.title || '').toLowerCase();
        const desc = (ci.description || '').toLowerCase();
        const body = (ci.body || '').toLowerCase();
        if (title.includes(q)) score += 3;
        if (desc.includes(q)) score += 2;
        if (body.includes(q)) score += 1;
      }
      if (typeof ci.popularity_score === 'number') {
        score += ci.popularity_score / 1000;
      }
      return { item: ci, score };
    });

    const sortMode = sortBy || 'relevance';
    scoredItems.sort((a, b) => {
      if (sortMode === 'newest_first') {
        const da = new Date(a.item.publish_date || a.item.created_at || 0).getTime();
        const db = new Date(b.item.publish_date || b.item.created_at || 0).getTime();
        return db - da;
      }
      // relevance or default
      if (b.score !== a.score) return b.score - a.score;
      const da = new Date(a.item.publish_date || a.item.created_at || 0).getTime();
      const db = new Date(b.item.publish_date || b.item.created_at || 0).getTime();
      return db - da;
    });

    const categories = this.getContentCategories();

    const total_items = scoredItems.length;
    const safePage = page && page > 0 ? page : 1;
    const safePageSize = pageSize && pageSize > 0 ? pageSize : 20;
    const start = (safePage - 1) * safePageSize;
    const paged = scoredItems.slice(start, start + safePageSize).map((si) =>
      this._attachCategoryToContentItem(si.item, categories)
    );

    return {
      total_items,
      page: safePage,
      page_size: safePageSize,
      items: paged
    };
  }

  // getNewsletterSubscriptionOptions
  getNewsletterSubscriptionOptions() {
    const available_topics = ['skincare', 'hair', 'makeup', 'wellness', 'style', 'food'];

    const email_frequencies = [
      { value: 'daily', label: 'Daily' },
      { value: 'weekly', label: 'Weekly' },
      { value: 'monthly', label: 'Monthly' }
    ];

    const subs = this._getFromStorage('newsletter_subscriptions');
    // Use the most recently created subscription if any
    let existing_subscription = null;
    if (subs.length > 0) {
      existing_subscription = subs[subs.length - 1];
    }

    return {
      available_topics,
      email_frequencies,
      existing_subscription
    };
  }

  // submitNewsletterSubscription
  submitNewsletterSubscription(email, first_name, topics, email_frequency) {
    const allowedFreq = ['daily', 'weekly', 'monthly'];
    if (!email || !allowedFreq.includes(email_frequency)) {
      return {
        success: false,
        subscription: null,
        message: 'Invalid email or email frequency.'
      };
    }

    let subs = this._getFromStorage('newsletter_subscriptions');
    const now = new Date().toISOString();

    let subscription = subs.length > 0 ? subs[subs.length - 1] : null;
    if (!subscription) {
      subscription = {
        id: this._generateId('nlsub'),
        email,
        first_name: first_name || null,
        topics: Array.isArray(topics) ? topics : [],
        email_frequency,
        created_at: now,
        is_confirmed: false
      };
      subs.push(subscription);
    } else {
      subscription.email = email;
      subscription.first_name = first_name || null;
      subscription.topics = Array.isArray(topics) ? topics : [];
      subscription.email_frequency = email_frequency;
    }

    this._saveToStorage('newsletter_subscriptions', subs);
    this._persistSingleUserState();

    return {
      success: true,
      subscription,
      message: 'Subscription saved.'
    };
  }

  // getSelfCarePlannerInitData
  getSelfCarePlannerInitData() {
    const activitiesRaw = this._getFromStorage('wellness_activities');
    const contentItems = this._getFromStorage('content_items');
    const categories = this.getContentCategories();

    const suggested_activities = activitiesRaw.map((a) =>
      this._attachArticleToWellnessActivity(a, contentItems, categories)
    );

    const default_time_slots = ['07:00', '09:00', '12:00', '18:00', '20:00', '21:00'];

    const existing_plans = this._getFromStorage('self_care_plans');
    const last_opened_plan_id = localStorage.getItem('last_opened_self_care_plan_id') || null;

    return {
      suggested_activities,
      default_time_slots,
      existing_plans,
      last_opened_plan_id
    };
  }

  // saveSelfCarePlan
  saveSelfCarePlan(name, schedule, overwrite_existing = true) {
    if (!name) {
      return {
        success: false,
        plan: null,
        activities: [],
        message: 'Plan name is required.'
      };
    }

    let plans = this._getFromStorage('self_care_plans');
    let activitiesAll = this._getFromStorage('self_care_plan_activities');
    const now = new Date().toISOString();

    let existing = plans.find((p) => p.name === name) || null;

    if (existing && !overwrite_existing) {
      return {
        success: false,
        plan: existing,
        activities: [],
        message: 'Plan with this name already exists and overwrite is false.'
      };
    }

    let plan;
    if (existing) {
      // Remove old activities
      activitiesAll = activitiesAll.filter((a) => a.plan_id !== existing.id);
      plan = existing;
      plan.updated_at = now;
    } else {
      plan = {
        id: this._generateId('scp'),
        name,
        created_at: now,
        updated_at: now
      };
      plans.push(plan);
    }

    const newActivities = this._generateSelfCarePlanActivities(plan.id, schedule || []);
    activitiesAll = activitiesAll.concat(newActivities);

    this._saveToStorage('self_care_plans', plans);
    this._saveToStorage('self_care_plan_activities', activitiesAll);
    localStorage.setItem('last_opened_self_care_plan_id', plan.id);
    this._persistSingleUserState();

    return {
      success: true,
      plan,
      activities: newActivities,
      message: 'Plan saved.'
    };
  }

  // getSelfCarePlanDetail
  getSelfCarePlanDetail(planId) {
    const plans = this._getFromStorage('self_care_plans');
    const activitiesAll = this._getFromStorage('self_care_plan_activities');
    const wellnessActivities = this._getFromStorage('wellness_activities');
    const contentItems = this._getFromStorage('content_items');
    const categories = this.getContentCategories();

    const plan = plans.find((p) => p.id === planId) || null;
    const activities = activitiesAll.filter((a) => a.plan_id === planId);

    const resolved_activities = activities.map((pa) => {
      const waRaw = wellnessActivities.find((wa) => wa.id === pa.activity_id) || null;
      const wellness_activity = waRaw
        ? this._attachArticleToWellnessActivity(waRaw, contentItems, categories)
        : null;
      return {
        plan_activity_id: pa.id,
        day_of_week: pa.day_of_week,
        time: pa.time,
        wellness_activity
      };
    });

    return {
      plan,
      activities,
      resolved_activities
    };
  }

  // getSelfCarePlansOverview
  getSelfCarePlansOverview() {
    return this._getFromStorage('self_care_plans');
  }

  // getQuizOverview
  getQuizOverview(quizSlug) {
    const quizzes = this._getFromStorage('quizzes');
    const quiz = quizzes.find((q) => q.slug === quizSlug) || null;
    if (!quiz) return null;
    const categories = this.getContentCategories();
    const category = categories.find((c) => c.id === quiz.category_id) || null;
    return Object.assign({}, quiz, { category });
  }

  // getQuizWithQuestions
  getQuizWithQuestions(quizId) {
    const quizzes = this._getFromStorage('quizzes');
    const quizRaw = quizzes.find((q) => q.id === quizId) || null;
    if (!quizRaw) {
      return {
        quiz: null,
        questions: []
      };
    }
    const categories = this.getContentCategories();
    const category = categories.find((c) => c.id === quizRaw.category_id) || null;
    const quiz = Object.assign({}, quizRaw, { category });

    const questionsAll = this._getFromStorage('quiz_questions');
    const answerOptionsAll = this._getFromStorage('quiz_answer_options');

    const questionsRaw = questionsAll.filter((qq) => qq.quiz_id === quizId);
    questionsRaw.sort((a, b) => a.order - b.order);

    const questions = questionsRaw.map((q) => {
      const answer_options = answerOptionsAll.filter((ao) => ao.question_id === q.id);
      return {
        id: q.id,
        order: q.order,
        text: q.text,
        question_type: q.question_type,
        answer_options
      };
    });

    return {
      quiz,
      questions
    };
  }

  // submitQuizResponses
  submitQuizResponses(quizId, answers) {
    const { quiz_result, raw_score } = this._calculateQuizResultFromAnswers(quizId, answers || []);

    if (!quiz_result) {
      return {
        success: false,
        quiz_result: null,
        raw_score,
        message: 'No result definition found for quiz.'
      };
    }

    // Instrumentation for task completion tracking (task6_quizSubmission)
    try {
      const payload = {
        quiz_id: quizId,
        answers: answers,
        computed_result_key: quiz_result ? quiz_result.result_key : null,
        raw_score: raw_score,
        submitted_at: new Date().toISOString()
      };
      localStorage.setItem('task6_quizSubmission', JSON.stringify(payload));
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      success: true,
      quiz_result,
      raw_score,
      message: 'Quiz evaluated successfully.'
    };
  }

  // saveStyleProfileFromQuiz
  saveStyleProfileFromQuiz(quizId, resultKey, profileName) {
    const resultDefs = this._getFromStorage('quiz_result_definitions');
    const result = resultDefs.find(
      (r) => r.quiz_id === quizId && r.result_key === resultKey
    );
    if (!result) {
      return {
        success: false,
        style_profile: null,
        message: 'Quiz result definition not found.'
      };
    }

    let profiles = this._getFromStorage('style_profiles');
    const summaryParts = [];
    if (result.title) summaryParts.push(result.title);
    if (result.description) summaryParts.push(result.description);
    const summary = summaryParts.join(' - ');

    const now = new Date().toISOString();
    const style_profile = {
      id: this._generateId('sp'),
      name: profileName,
      quiz_id: quizId,
      result_key: resultKey,
      summary,
      created_at: now
    };

    profiles.push(style_profile);
    this._saveToStorage('style_profiles', profiles);
    this._persistSingleUserState();

    return {
      success: true,
      style_profile,
      message: 'Style profile saved.'
    };
  }

  // getStyleProfilesOverview
  getStyleProfilesOverview() {
    return this._getFromStorage('style_profiles');
  }

  // getStyleProfileDetail
  getStyleProfileDetail(styleProfileId) {
    const profiles = this._getFromStorage('style_profiles');
    return profiles.find((sp) => sp.id === styleProfileId) || null;
  }

  // getShopFilterOptions
  getShopFilterOptions(categoryId) {
    const categories = this.getContentCategories();
    const category = categories.find((c) => c.id === categoryId) || null;
    const category_name = category ? category.name : categoryId;

    const products = this._getFromStorage('products').filter(
      (p) => p.category_id === categoryId
    );

    const prices = products.map((p) => p.price).filter((v) => typeof v === 'number');
    let price_range = { min_price: null, max_price: null };
    if (prices.length > 0) {
      price_range = {
        min_price: Math.min.apply(null, prices),
        max_price: Math.max.apply(null, prices)
      };
    }

    const rating_options = [
      { value: 0, label: 'Any rating' },
      { value: 3, label: '3 stars & up' },
      { value: 4, label: '4 stars & up' },
      { value: 4.5, label: '4.5 stars & up' }
    ];

    const tag_options = Array.from(
      new Set(
        products.reduce((acc, p) => {
          if (Array.isArray(p.tags)) {
            return acc.concat(p.tags);
          }
          return acc;
        }, [])
      )
    );

    return {
      category_id: categoryId,
      category_name,
      price_range,
      rating_options,
      tag_options
    };
  }

  // getShopProducts
  getShopProducts(categoryId, page = 1, pageSize = 20, filters = {}, sortBy = 'relevance') {
    const categories = this.getContentCategories();
    const category = categories.find((c) => c.id === categoryId) || null;
    const category_name = category ? category.name : categoryId;

    let products = this._getFromStorage('products').filter(
      (p) => p.category_id === categoryId
    );

    if (typeof filters.min_price === 'number') {
      products = products.filter((p) => typeof p.price === 'number' && p.price >= filters.min_price);
    }

    if (typeof filters.max_price === 'number') {
      products = products.filter((p) => typeof p.price === 'number' && p.price <= filters.max_price);
    }

    if (typeof filters.min_rating === 'number') {
      products = products.filter(
        (p) => typeof p.rating === 'number' && p.rating >= filters.min_rating
      );
    }

    if (filters.tags && filters.tags.length > 0) {
      const reqTags = filters.tags;
      products = products.filter((p) => {
        const tags = Array.isArray(p.tags) ? p.tags : [];
        return reqTags.every((t) => tags.includes(t));
      });
    }

    const sortMode = sortBy || 'relevance';
    products.sort((a, b) => {
      if (sortMode === 'price_low_to_high') {
        const pa = typeof a.price === 'number' ? a.price : Infinity;
        const pb = typeof b.price === 'number' ? b.price : Infinity;
        return pa - pb;
      }
      if (sortMode === 'rating_high_to_low') {
        const ra = typeof a.rating === 'number' ? a.rating : 0;
        const rb = typeof b.rating === 'number' ? b.rating : 0;
        if (rb !== ra) return rb - ra;
        const ca = typeof a.rating_count === 'number' ? a.rating_count : 0;
        const cb = typeof b.rating_count === 'number' ? b.rating_count : 0;
        return cb - ca;
      }
      // relevance: highest rating then count
      const ra = typeof a.rating === 'number' ? a.rating : 0;
      const rb = typeof b.rating === 'number' ? b.rating : 0;
      if (rb !== ra) return rb - ra;
      const ca = typeof a.rating_count === 'number' ? a.rating_count : 0;
      const cb = typeof b.rating_count === 'number' ? b.rating_count : 0;
      return cb - ca;
    });

    const total_items = products.length;
    const safePage = page && page > 0 ? page : 1;
    const safePageSize = pageSize && pageSize > 0 ? pageSize : 20;
    const start = (safePage - 1) * safePageSize;
    const paged = products.slice(start, start + safePageSize);

    const items = paged.map((p) => this._attachCategoryToProduct(p, categories));

    return {
      category_id: categoryId,
      category_name,
      total_items,
      page: safePage,
      page_size: safePageSize,
      items
    };
  }

  // addProductToNamedCollection
  addProductToNamedCollection(productId, collectionName) {
    const products = this._getFromStorage('products');
    const product = products.find((p) => p.id === productId);
    if (!product) {
      return {
        success: false,
        collection: null,
        added_item: null,
        message: 'Product not found.'
      };
    }

    const collection = this._getOrCreateProductCollectionByName(collectionName);
    let items = this._getFromStorage('product_collection_items');

    const existing = items.find(
      (it) => it.collection_id === collection.id && it.product_id === productId
    );
    if (existing) {
      return {
        success: true,
        collection,
        added_item: existing,
        message: 'Product already in collection.'
      };
    }

    const now = new Date().toISOString();
    const added_item = {
      id: this._generateId('pci'),
      collection_id: collection.id,
      product_id: productId,
      added_at: now
    };
    items.push(added_item);
    this._saveToStorage('product_collection_items', items);
    this._persistSingleUserState();

    return {
      success: true,
      collection,
      added_item,
      message: 'Product added to collection.'
    };
  }

  // getProductCollectionsOverview
  getProductCollectionsOverview() {
    return this._getFromStorage('product_collections');
  }

  // getProductCollectionDetail
  getProductCollectionDetail(collectionId) {
    const collections = this._getFromStorage('product_collections');
    const itemsAll = this._getFromStorage('product_collection_items');
    const products = this._getFromStorage('products');
    const categories = this.getContentCategories();

    const collection = collections.find((c) => c.id === collectionId) || null;
    const filteredItems = itemsAll.filter((it) => it.collection_id === collectionId);

    const items = filteredItems.map((it) => {
      const productRaw = products.find((p) => p.id === it.product_id) || null;
      const product = productRaw ? this._attachCategoryToProduct(productRaw, categories) : null;
      return {
        collection_item_id: it.id,
        added_at: it.added_at,
        product
      };
    });

    return {
      collection,
      total_items: items.length,
      items
    };
  }

  // updateProductCollectionName
  updateProductCollectionName(collectionId, newName) {
    let collections = this._getFromStorage('product_collections');
    const collection = collections.find((c) => c.id === collectionId);
    if (!collection) {
      return {
        success: false,
        collection: null,
        message: 'Collection not found.'
      };
    }
    collection.name = newName;
    this._saveToStorage('product_collections', collections);
    this._persistSingleUserState();
    return {
      success: true,
      collection,
      message: 'Collection renamed.'
    };
  }

  // deleteProductCollection
  deleteProductCollection(collectionId) {
    let collections = this._getFromStorage('product_collections');
    const beforeLen = collections.length;
    collections = collections.filter((c) => c.id !== collectionId);
    this._saveToStorage('product_collections', collections);

    let items = this._getFromStorage('product_collection_items');
    items = items.filter((it) => it.collection_id !== collectionId);
    this._saveToStorage('product_collection_items', items);
    this._persistSingleUserState();

    const success = collections.length < beforeLen;
    return {
      success,
      message: success ? 'Collection deleted.' : 'Collection not found.'
    };
  }

  // getSavedItemsOverview
  getSavedItemsOverview() {
    const lists = this._getFromStorage('saved_content_lists');
    const favorites = this._getFromStorage('favorite_content_items');
    const product_collections = this._getFromStorage('product_collections');
    const style_profiles = this._getFromStorage('style_profiles');
    const self_care_plans = this._getFromStorage('self_care_plans');

    const reading_lists = lists.filter((l) => l.list_type === 'reading_list');
    const recipe_lists = lists.filter((l) => l.list_type === 'recipe_list');
    const generic_lists = lists.filter((l) => l.list_type === 'generic_list');

    return {
      reading_lists,
      recipe_lists,
      generic_lists,
      favorites_count: favorites.length,
      product_collections,
      style_profiles,
      self_care_plans
    };
  }

  // getSavedContentListDetail
  getSavedContentListDetail(listId) {
    const lists = this._getFromStorage('saved_content_lists');
    const listItems = this._getFromStorage('saved_content_list_items');
    const contentItems = this._getFromStorage('content_items');
    const categories = this.getContentCategories();

    const list = lists.find((l) => l.id === listId) || null;
    const filtered = listItems.filter((li) => li.list_id === listId);

    const items = filtered.map((li) => {
      const ciRaw = contentItems.find((ci) => ci.id === li.content_item_id) || null;
      const content_item = ciRaw ? this._attachCategoryToContentItem(ciRaw, categories) : null;
      return {
        list_item_id: li.id,
        added_at: li.added_at,
        content_item
      };
    });

    return {
      list,
      items
    };
  }

  // updateSavedContentListName
  updateSavedContentListName(listId, newName) {
    let lists = this._getFromStorage('saved_content_lists');
    const list = lists.find((l) => l.id === listId);
    if (!list) {
      return {
        success: false,
        list: null,
        message: 'List not found.'
      };
    }
    list.name = newName;
    list.updated_at = new Date().toISOString();
    this._saveToStorage('saved_content_lists', lists);
    this._persistSingleUserState();
    return {
      success: true,
      list,
      message: 'List renamed.'
    };
  }

  // deleteSavedContentList
  deleteSavedContentList(listId) {
    let lists = this._getFromStorage('saved_content_lists');
    const beforeLen = lists.length;
    lists = lists.filter((l) => l.id !== listId);
    this._saveToStorage('saved_content_lists', lists);

    let items = this._getFromStorage('saved_content_list_items');
    items = items.filter((li) => li.list_id !== listId);
    this._saveToStorage('saved_content_list_items', items);
    this._persistSingleUserState();

    const success = lists.length < beforeLen;
    return {
      success,
      message: success ? 'List deleted.' : 'List not found.'
    };
  }

  // getFavoritesList
  getFavoritesList() {
    const favorites = this._getFromStorage('favorite_content_items');
    const contentItems = this._getFromStorage('content_items');
    const categories = this.getContentCategories();

    const items = favorites.map((f) => {
      const ciRaw = contentItems.find((ci) => ci.id === f.content_item_id) || null;
      const content_item = ciRaw ? this._attachCategoryToContentItem(ciRaw, categories) : null;
      return {
        favorite_id: f.id,
        favorited_at: f.favorited_at,
        content_item
      };
    });

    return {
      total_items: items.length,
      items
    };
  }

  // getAboutPageContent
  getAboutPageContent() {
    const stored = this._getFromStorage('about_page_content', null);
    if (stored && typeof stored === 'object') {
      return stored;
    }
    // No mocked content: return empty structure
    return {
      title: '',
      body: '',
      focus_areas: [],
      editorial_guidelines: []
    };
  }

  // getContactPageContent
  getContactPageContent() {
    const stored = this._getFromStorage('contact_page_content', null);
    if (stored && typeof stored === 'object') {
      return stored;
    }
    return {
      intro_text: '',
      support_email: '',
      response_time_message: ''
    };
  }

  // submitContactForm
  submitContactForm(name, email, subject, message) {
    if (!name || !email || !subject || !message) {
      return {
        success: false,
        ticket_id: null,
        message: 'All fields are required.'
      };
    }
    let submissions = this._getFromStorage('contact_form_submissions');
    const ticket_id = this._generateId('ticket');
    const now = new Date().toISOString();
    submissions.push({
      id: ticket_id,
      name,
      email,
      subject,
      message,
      created_at: now
    });
    this._saveToStorage('contact_form_submissions', submissions);
    return {
      success: true,
      ticket_id,
      message: 'Contact form submitted.'
    };
  }

  // getPrivacyPolicyContent
  getPrivacyPolicyContent() {
    const stored = this._getFromStorage('privacy_policy_content', null);
    if (stored && typeof stored === 'object') {
      return stored;
    }
    return {
      last_updated: '',
      sections: []
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