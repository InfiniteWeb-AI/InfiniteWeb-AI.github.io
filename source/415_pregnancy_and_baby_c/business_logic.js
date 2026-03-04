// localStorage polyfill for Node.js and environments without localStorage
const localStorage = (function () {
  try {
    if (typeof globalThis !== 'undefined' && globalThis.localStorage) {
      return globalThis.localStorage;
    }
  } catch (e) {}
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

  // -------------------------
  // Storage helpers
  // -------------------------
  _initStorage() {
    const arrayKeys = [
      // Core content
      'articles',
      'reading_lists',
      'reading_list_items',
      // Birth plan
      'birth_preference_options',
      'birth_plans',
      'birth_plan_preference_selections',
      // Due date & pregnancy weeks
      'due_date_calculations',
      'pregnancy_week_guides',
      // Baby health planner
      'health_event_templates',
      'baby_health_planner_schedules',
      'baby_health_appointments',
      // Products & comparison
      'product_departments',
      'products',
      'product_comparison_sets',
      'product_comparison_items',
      // Hospital bag
      'hospital_bag_item_templates',
      'hospital_bag_checklists',
      'hospital_bag_checklist_item_selections',
      // Forums
      'forum_categories',
      'forum_subcategories',
      'forum_tags',
      'forum_topics',
      // Newsletter
      'newsletter_subscriptions',
      // Informational pages
      'informational_pages'
    ];

    for (let i = 0; i < arrayKeys.length; i++) {
      const key = arrayKeys[i];
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
    if (!localStorage.getItem('current_due_date_calculation_id')) {
      localStorage.setItem('current_due_date_calculation_id', '');
    }
    if (!localStorage.getItem('active_product_comparison_set_id')) {
      localStorage.setItem('active_product_comparison_set_id', '');
    }
  }

  _getFromStorage(key) {
    const data = localStorage.getItem(key);
    if (!data) return [];
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

  // -------------------------
  // Private helpers (spec-defined)
  // -------------------------

  // Internal helper to retrieve the single-user ReadingList or create it if it does not exist.
  _getOrCreateReadingList(readingListName) {
    let lists = this._getFromStorage('reading_lists');
    let list = null;

    if (lists.length > 0) {
      list = lists[0];
      if (readingListName && list.name !== readingListName) {
        list.name = readingListName;
        list.updated_at = this._now();
        this._saveToStorage('reading_lists', lists);
      }
      return list;
    }

    const now = this._now();
    list = {
      id: this._generateId('readinglist'),
      name: readingListName || 'Reading list',
      created_at: now,
      updated_at: now
    };
    lists.push(list);
    this._saveToStorage('reading_lists', lists);
    return list;
  }

  // Internal helper to get or create the active ProductComparisonSet for the current user context.
  _getOrCreateProductComparisonSet() {
    let sets = this._getFromStorage('product_comparison_sets');
    let activeId = localStorage.getItem('active_product_comparison_set_id') || '';
    let activeSet = null;

    if (activeId) {
      for (let i = 0; i < sets.length; i++) {
        if (sets[i].id === activeId) {
          activeSet = sets[i];
          break;
        }
      }
    }

    if (!activeSet) {
      for (let i = 0; i < sets.length; i++) {
        if (sets[i].is_active) {
          activeSet = sets[i];
          activeId = activeSet.id;
          break;
        }
      }
    }

    const now = this._now();

    if (!activeSet) {
      activeSet = {
        id: this._generateId('productcomparisonset'),
        name: 'Current comparison',
        is_active: true,
        created_at: now,
        updated_at: now
      };
      // Deactivate any existing sets just in case
      for (let i = 0; i < sets.length; i++) {
        sets[i].is_active = false;
      }
      sets.push(activeSet);
      this._saveToStorage('product_comparison_sets', sets);
      localStorage.setItem('active_product_comparison_set_id', activeSet.id);
    }

    return activeSet;
  }

  // Internal helper to persist a DueDateCalculation and mark it as the current calculation.
  _saveDueDateCalculationInternal(calculation) {
    const calculations = this._getFromStorage('due_date_calculations');
    calculations.push(calculation);
    this._saveToStorage('due_date_calculations', calculations);
    localStorage.setItem('current_due_date_calculation_id', calculation.id);
  }

  // Internal helper to create or update the single-user NewsletterSubscription object.
  _saveNewsletterSubscriptionInternal(subscriptionData) {
    const subscriptions = this._getFromStorage('newsletter_subscriptions');
    const now = this._now();
    let subscription = null;
    let foundIndex = -1;

    for (let i = 0; i < subscriptions.length; i++) {
      if (subscriptions[i].email === subscriptionData.email) {
        subscription = subscriptions[i];
        foundIndex = i;
        break;
      }
    }

    if (!subscription) {
      subscription = {
        id: this._generateId('newsletter'),
        email: subscriptionData.email,
        pregnancy_status: subscriptionData.pregnancy_status,
        pregnancy_week: subscriptionData.pregnancy_week != null ? Number(subscriptionData.pregnancy_week) : null,
        frequency: subscriptionData.frequency,
        topics: subscriptionData.topics || [],
        expected_due_date: subscriptionData.expected_due_date || null,
        created_at: now,
        updated_at: now,
        is_active: true
      };
      subscriptions.push(subscription);
    } else {
      subscription.pregnancy_status = subscriptionData.pregnancy_status;
      subscription.pregnancy_week = subscriptionData.pregnancy_week != null ? Number(subscriptionData.pregnancy_week) : null;
      subscription.frequency = subscriptionData.frequency;
      subscription.topics = subscriptionData.topics || [];
      subscription.expected_due_date = subscriptionData.expected_due_date || null;
      subscription.updated_at = now;
      subscription.is_active = true;
      subscriptions[foundIndex] = subscription;
    }

    this._saveToStorage('newsletter_subscriptions', subscriptions);
    return subscription;
  }

  // Internal helper to translate UI filter parameters into Article query conditions.
  _mapArticleFilters(filters) {
    // For now this just normalizes and passes through the filters object.
    if (!filters) return {};
    const mapped = {};
    if (filters.category) mapped.category = filters.category;
    if (filters.subcategory) mapped.subcategory = filters.subcategory;
    if (filters.trimester) mapped.trimester = filters.trimester;
    if (filters.baby_age_range) mapped.baby_age_range = filters.baby_age_range;
    if (typeof filters.min_rating === 'number') mapped.min_rating = filters.min_rating;
    if (filters.tags && Array.isArray(filters.tags)) mapped.tags = filters.tags;
    return mapped;
  }

  // -------------------------
  // Misc helpers
  // -------------------------

  _parseMMDDYYYY(dateStr) {
    // Expected format 'MM/DD/YYYY'
    if (!dateStr) return null;
    const parts = dateStr.split('/');
    if (parts.length !== 3) return null;
    const month = parseInt(parts[0], 10) - 1;
    const day = parseInt(parts[1], 10);
    const year = parseInt(parts[2], 10);
    if (isNaN(month) || isNaN(day) || isNaN(year)) return null;
    return new Date(Date.UTC(year, month, day));
  }

  _addDays(date, days) {
    const result = new Date(date.getTime());
    result.setUTCDate(result.getUTCDate() + days);
    return result;
  }

  _calculateCurrentPregnancyWeek(lmpDate) {
    const now = new Date();
    const start = new Date(Date.UTC(lmpDate.getUTCFullYear(), lmpDate.getUTCMonth(), lmpDate.getUTCDate()));
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const diffMs = today.getTime() - start.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return 1;
    const week = Math.floor(diffDays / 7) + 1;
    return week < 1 ? 1 : week;
  }

  _getDepartmentMap() {
    const departments = this._getFromStorage('product_departments');
    const map = {};
    for (let i = 0; i < departments.length; i++) {
      const d = departments[i];
      map[d.id] = d;
    }
    return map;
  }

  _resolveComparisonItemsWithProducts(comparisonItems) {
    const products = this._getFromStorage('products');
    const productMap = {};
    for (let i = 0; i < products.length; i++) {
      productMap[products[i].id] = products[i];
    }
    return comparisonItems.map(function (item) {
      return Object.assign({}, item, {
        product: productMap[item.product_id] || null
      });
    });
  }

  _resolveForumTopicRelations(topic) {
    const categories = this._getFromStorage('forum_categories');
    const subcategories = this._getFromStorage('forum_subcategories');
    const tags = this._getFromStorage('forum_tags');

    let category = null;
    for (let i = 0; i < categories.length; i++) {
      if (categories[i].id === topic.category_id) {
        category = categories[i];
        break;
      }
    }

    let subcategory = null;
    for (let i = 0; i < subcategories.length; i++) {
      if (subcategories[i].id === topic.subcategory_id) {
        subcategory = subcategories[i];
        break;
      }
    }

    const tagMap = {};
    for (let i = 0; i < tags.length; i++) {
      tagMap[tags[i].id] = tags[i];
    }

    const resolvedTags = [];
    if (Array.isArray(topic.tag_ids)) {
      for (let i = 0; i < topic.tag_ids.length; i++) {
        const tag = tagMap[topic.tag_ids[i]];
        if (tag) resolvedTags.push(tag);
      }
    }

    return Object.assign({}, topic, {
      category: category,
      subcategory: subcategory,
      tags: resolvedTags
    });
  }

  // -------------------------
  // Core interface implementations
  // -------------------------

  // getHomePageHighlights()
  getHomePageHighlights() {
    const articles = this._getFromStorage('articles').filter(function (a) {
      return a && a.is_published;
    });

    const featuredArticles = articles
      .slice()
      .sort(function (a, b) {
        const aScore = typeof a.helpful_score === 'number' ? a.helpful_score : 0;
        const bScore = typeof b.helpful_score === 'number' ? b.helpful_score : 0;
        if (bScore !== aScore) return bScore - aScore;
        const aPop = typeof a.popularity_score === 'number' ? a.popularity_score : 0;
        const bPop = typeof b.popularity_score === 'number' ? b.popularity_score : 0;
        return bPop - aPop;
      })
      .slice(0, 5);

    const featuredTools = [
      {
        code: 'due_date_calculator',
        name: 'Due Date Calculator',
        short_description: 'Estimate your due date and see your current pregnancy week.'
      },
      {
        code: 'birth_plan_builder',
        name: 'Birth Plan Builder',
        short_description: 'Create a personalized hospital or home birth plan.'
      },
      {
        code: 'hospital_bag_checklist',
        name: 'Hospital Bag Checklist',
        short_description: 'Customize your hospital bag packing list.'
      },
      {
        code: 'baby_health_planner',
        name: 'Baby Health Planner',
        short_description: 'Plan vaccines and check-ups for your baby.'
      }
    ];

    const popularCategories = [
      {
        key: 'pregnancy',
        label: 'Pregnancy',
        description: 'Week-by-week guides, symptoms, nutrition, and birth planning.'
      },
      {
        key: 'baby',
        label: 'Baby',
        description: 'Newborn care, sleep, feeding, and development.'
      },
      {
        key: 'products',
        label: 'Products',
        description: 'Expert reviews and recommendations for baby gear.'
      },
      {
        key: 'tools',
        label: 'Tools',
        description: 'Interactive tools like due date calculators and planners.'
      },
      {
        key: 'community',
        label: 'Community',
        description: 'Forums to connect with other parents and parents-to-be.'
      }
    ];

    return {
      featured_articles: featuredArticles,
      featured_tools: featuredTools,
      popular_categories: popularCategories
    };
  }

  // getArticleFilterOptions()
  getArticleFilterOptions() {
    const categories = [
      { value: 'pregnancy', label: 'Pregnancy' },
      { value: 'baby', label: 'Baby' }
    ];

    const subcategories = [
      { category_value: 'pregnancy', value: 'vitamins_supplements', label: 'Vitamins & supplements' },
      { category_value: 'pregnancy', value: 'nutrition', label: 'Nutrition' },
      { category_value: 'pregnancy', value: 'exercise', label: 'Exercise & fitness' },
      { category_value: 'baby', value: 'sleep', label: 'Sleep' },
      { category_value: 'baby', value: 'feeding', label: 'Feeding' }
    ];

    const trimester_options = [
      { value: 'preconception', label: 'Preconception' },
      { value: 'first_trimester', label: 'First trimester' },
      { value: 'second_trimester', label: 'Second trimester' },
      { value: 'third_trimester', label: 'Third trimester' },
      { value: 'postpartum', label: 'Postpartum' }
    ];

    const baby_age_range_options = [
      { value: '0_3_months', label: '0–3 months' },
      { value: '3_6_months', label: '3–6 months' },
      { value: '6_12_months', label: '6–12 months' },
      { value: '12_24_months', label: '12–24 months' },
      { value: '24_plus_months', label: '24+ months' }
    ];

    const rating_threshold_options = [
      { min_rating: 3.0, label: '3.0+ stars' },
      { min_rating: 4.0, label: '4.0+ stars' },
      { min_rating: 4.5, label: '4.5+ stars' }
    ];

    const sort_options = [
      { value: 'most_helpful', label: 'Most helpful' },
      { value: 'most_popular', label: 'Most popular' },
      { value: 'highest_rated', label: 'Highest rated' },
      { value: 'newest', label: 'Newest' }
    ];

    return {
      categories: categories,
      subcategories: subcategories,
      trimester_options: trimester_options,
      baby_age_range_options: baby_age_range_options,
      rating_threshold_options: rating_threshold_options,
      sort_options: sort_options
    };
  }

  // searchArticles(query, filters, sort_by, page, page_size)
  searchArticles(query, filters, sort_by, page, page_size) {
    const allArticles = this._getFromStorage('articles').filter(function (a) {
      return a && a.is_published;
    });

    const mappedFilters = this._mapArticleFilters(filters || {});
    const q = (query || '').trim().toLowerCase();

    let results = allArticles.filter(function (article) {
      if (q) {
        const haystack = [article.title || '', article.summary || '', article.content || '']
          .join(' ')
          .toLowerCase();
        const terms = q.split(/\s+/).filter(function (t) { return t.length > 0; });
        if (terms.length > 0) {
          for (let i = 0; i < terms.length; i++) {
            if (haystack.indexOf(terms[i]) === -1) return false;
          }
        }
      }

      if (mappedFilters.category && article.category !== mappedFilters.category) return false;
      if (mappedFilters.subcategory && article.subcategory !== mappedFilters.subcategory) return false;
      if (mappedFilters.trimester && article.trimester !== mappedFilters.trimester) return false;
      if (mappedFilters.baby_age_range && article.baby_age_range !== mappedFilters.baby_age_range) return false;

      if (typeof mappedFilters.min_rating === 'number') {
        const rating = typeof article.rating === 'number' ? article.rating : 0;
        if (rating < mappedFilters.min_rating) return false;
      }

      if (mappedFilters.tags && mappedFilters.tags.length > 0) {
        const tags = Array.isArray(article.tags) ? article.tags : [];
        for (let i = 0; i < mappedFilters.tags.length; i++) {
          if (tags.indexOf(mappedFilters.tags[i]) === -1) return false;
        }
      }

      return true;
    });

    const sortBy = sort_by || 'most_helpful';
    results.sort(function (a, b) {
      if (sortBy === 'most_popular') {
        const aScore = typeof a.popularity_score === 'number' ? a.popularity_score : 0;
        const bScore = typeof b.popularity_score === 'number' ? b.popularity_score : 0;
        return bScore - aScore;
      } else if (sortBy === 'highest_rated') {
        const aRating = typeof a.rating === 'number' ? a.rating : 0;
        const bRating = typeof b.rating === 'number' ? b.rating : 0;
        if (bRating !== aRating) return bRating - aRating;
        const aCount = typeof a.rating_count === 'number' ? a.rating_count : 0;
        const bCount = typeof b.rating_count === 'number' ? b.rating_count : 0;
        return bCount - aCount;
      } else if (sortBy === 'newest') {
        const aDate = a.published_at ? Date.parse(a.published_at) : 0;
        const bDate = b.published_at ? Date.parse(b.published_at) : 0;
        return bDate - aDate;
      } else {
        // most_helpful default
        const aScore = typeof a.helpful_score === 'number' ? a.helpful_score : 0;
        const bScore = typeof b.helpful_score === 'number' ? b.helpful_score : 0;
        if (bScore !== aScore) return bScore - aScore;
        const aDate = a.published_at ? Date.parse(a.published_at) : 0;
        const bDate = b.published_at ? Date.parse(b.published_at) : 0;
        return bDate - aDate;
      }
    });

    const pg = page && page > 0 ? page : 1;
    const size = page_size && page_size > 0 ? page_size : 20;
    const start = (pg - 1) * size;
    const paged = results.slice(start, start + size);

    return {
      total_results: results.length,
      page: pg,
      page_size: size,
      results: paged
    };
  }

  // getArticleDetail(articleId)
  getArticleDetail(articleId) {
    const articles = this._getFromStorage('articles');
    let article = null;
    for (let i = 0; i < articles.length; i++) {
      if (articles[i].id === articleId) {
        article = articles[i];
        break;
      }
    }

    const readingListItems = this._getFromStorage('reading_list_items');
    let isInReadingList = false;
    for (let i = 0; i < readingListItems.length; i++) {
      if (readingListItems[i].article_id === articleId) {
        isInReadingList = true;
        break;
      }
    }

    let related = [];
    if (article) {
      related = articles
        .filter(function (a) {
          return (
            a.id !== article.id &&
            a.is_published &&
            a.category === article.category &&
            a.subcategory === article.subcategory
          );
        })
        .sort(function (a, b) {
          const aScore = typeof a.popularity_score === 'number' ? a.popularity_score : 0;
          const bScore = typeof b.popularity_score === 'number' ? b.popularity_score : 0;
          return bScore - aScore;
        })
        .slice(0, 5);
    }

    // Instrumentation for task completion tracking
    try {
      const currentCalcId = localStorage.getItem('current_due_date_calculation_id') || '';
      if (currentCalcId) {
        const calculations = this._getFromStorage('due_date_calculations');
        let currentCalc = null;
        for (let i = 0; i < calculations.length; i++) {
          if (calculations[i] && calculations[i].id === currentCalcId) {
            currentCalc = calculations[i];
            break;
          }
        }

        if (currentCalc && typeof currentCalc.current_pregnancy_week === 'number') {
          const guides = this._getFromStorage('pregnancy_week_guides');
          for (let i = 0; i < guides.length; i++) {
            const g = guides[i];
            if (
              g &&
              g.article_id === articleId &&
              g.week_number === currentCalc.current_pregnancy_week
            ) {
              localStorage.setItem('task3_openedWeekGuideArticleId', articleId);
              break;
            }
          }
        }
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      article: article,
      is_in_reading_list: isInReadingList,
      related_articles: related
    };
  }

  // saveArticleToReadingList(articleId, reading_list_name)
  saveArticleToReadingList(articleId, reading_list_name) {
    const articles = this._getFromStorage('articles');
    let articleExists = false;
    for (let i = 0; i < articles.length; i++) {
      if (articles[i].id === articleId) {
        articleExists = true;
        break;
      }
    }

    if (!articleExists) {
      return {
        success: false,
        message: 'Article not found.',
        reading_list: null,
        saved_item: null
      };
    }

    const readingList = this._getOrCreateReadingList(reading_list_name);
    const items = this._getFromStorage('reading_list_items');

    for (let i = 0; i < items.length; i++) {
      if (items[i].reading_list_id === readingList.id && items[i].article_id === articleId) {
        return {
          success: true,
          message: 'Article already in reading list.',
          reading_list: readingList,
          saved_item: items[i]
        };
      }
    }

    const now = this._now();
    const newItem = {
      id: this._generateId('readinglistitem'),
      reading_list_id: readingList.id,
      article_id: articleId,
      saved_at: now
    };
    items.push(newItem);
    this._saveToStorage('reading_list_items', items);

    readingList.updated_at = now;
    const lists = this._getFromStorage('reading_lists');
    for (let j = 0; j < lists.length; j++) {
      if (lists[j].id === readingList.id) {
        lists[j] = readingList;
        break;
      }
    }
    this._saveToStorage('reading_lists', lists);

    return {
      success: true,
      message: 'Article saved to reading list.',
      reading_list: readingList,
      saved_item: newItem
    };
  }

  // removeArticleFromReadingList(articleId)
  removeArticleFromReadingList(articleId) {
    const items = this._getFromStorage('reading_list_items');
    let removed = false;
    const remaining = [];

    for (let i = 0; i < items.length; i++) {
      if (items[i].article_id === articleId) {
        removed = true;
      } else {
        remaining.push(items[i]);
      }
    }

    this._saveToStorage('reading_list_items', remaining);

    return {
      success: removed,
      message: removed ? 'Article removed from reading list.' : 'Article not found in reading list.'
    };
  }

  // getReadingListItems()
  getReadingListItems() {
    const readingList = this._getOrCreateReadingList();
    const items = this._getFromStorage('reading_list_items');
    const articles = this._getFromStorage('articles');

    const articleMap = {};
    for (let i = 0; i < articles.length; i++) {
      articleMap[articles[i].id] = articles[i];
    }

    const listItems = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].reading_list_id === readingList.id) {
        listItems.push({
          reading_list_item: items[i],
          article: articleMap[items[i].article_id] || null
        });
      }
    }

    return {
      reading_list: readingList,
      items: listItems
    };
  }

  // getToolsOverview()
  getToolsOverview() {
    const tools = [
      {
        code: 'birth_plan_builder',
        name: 'Birth Plan Builder',
        description: 'Set your preferences for labor, delivery, and postpartum care.',
        recommended_for: 'second_trimester'
      },
      {
        code: 'due_date_calculator',
        name: 'Due Date Calculator',
        description: 'Estimate your due date from your last period or conception date.',
        recommended_for: 'trying_to_conceive'
      },
      {
        code: 'hospital_bag_checklist',
        name: 'Hospital Bag Checklist',
        description: 'Customize a packing checklist for your hospital or birth center stay.',
        recommended_for: 'third_trimester'
      },
      {
        code: 'baby_health_planner',
        name: 'Baby Health Planner',
        description: 'Plan vaccines, check-ups, and growth visits for your baby.',
        recommended_for: 'newborn_parents'
      }
    ];

    return { tools: tools };
  }

  // getBirthPlanBuilderOptions()
  getBirthPlanBuilderOptions() {
    const parent_types = [
      { value: 'first_time_parent', label: 'First-time parent' },
      { value: 'experienced_parent', label: 'Experienced parent' },
      { value: 'surrogate', label: 'Surrogate' },
      { value: 'partner', label: 'Partner' }
    ];

    const birth_settings = [
      { value: 'hospital_birth', label: 'Hospital birth' },
      { value: 'birth_center', label: 'Birth center' },
      { value: 'home_birth', label: 'Home birth' },
      { value: 'unspecified', label: 'Not sure yet' }
    ];

    const options = this._getFromStorage('birth_preference_options');

    const groupsMap = {};
    for (let i = 0; i < options.length; i++) {
      const opt = options[i];
      if (!groupsMap[opt.category]) {
        let label = '';
        if (opt.category === 'pain_management') label = 'Pain management';
        else if (opt.category === 'labor_environment') label = 'Labor environment';
        else if (opt.category === 'postpartum_care') label = 'Postpartum care';
        else if (opt.category === 'newborn_care') label = 'Newborn care';
        groupsMap[opt.category] = { category: opt.category, label: label, options: [] };
      }
      groupsMap[opt.category].options.push(opt);
    }

    // Ensure core preference groups exist even if not preloaded in storage
    const coreCategories = ['pain_management', 'labor_environment', 'postpartum_care', 'newborn_care'];
    for (let i = 0; i < coreCategories.length; i++) {
      const cat = coreCategories[i];
      if (!groupsMap[cat]) {
        let label = '';
        if (cat === 'pain_management') label = 'Pain management';
        else if (cat === 'labor_environment') label = 'Labor environment';
        else if (cat === 'postpartum_care') label = 'Postpartum care';
        else if (cat === 'newborn_care') label = 'Newborn care';
        groupsMap[cat] = { category: cat, label: label, options: [] };
      }
    }

    // If there are no labor_environment options, synthesize a few defaults so the builder remains usable
    if (groupsMap['labor_environment'].options.length === 0) {
      const synthesized = [
        {
          id: 'birth_pref_labor_dim_lighting',
          label: 'Dim lighting',
          description: 'Keep the lights low for a calmer atmosphere during labor.',
          category: 'labor_environment',
          is_default_selected: false,
          sort_order: 1
        },
        {
          id: 'birth_pref_labor_music',
          label: 'Soothing music',
          description: 'Play relaxing music or sounds during labor.',
          category: 'labor_environment',
          is_default_selected: false,
          sort_order: 2
        },
        {
          id: 'birth_pref_labor_limited_staff',
          label: 'Limit number of staff in room',
          description: 'Keep the room as quiet and private as possible.',
          category: 'labor_environment',
          is_default_selected: false,
          sort_order: 3
        }
      ];
      for (let i = 0; i < synthesized.length; i++) {
        groupsMap['labor_environment'].options.push(synthesized[i]);
        options.push(synthesized[i]);
      }
      this._saveToStorage('birth_preference_options', options);
    }

    const preference_groups = Object.keys(groupsMap)
      .map(function (key) { return groupsMap[key]; })
      .sort(function (a, b) {
        return a.category.localeCompare(b.category);
      });

    return {
      parent_types: parent_types,
      birth_settings: birth_settings,
      preference_groups: preference_groups
    };
  }

  // saveBirthPlan(name, parent_type, birth_setting, selected_preferences)
  saveBirthPlan(name, parent_type, birth_setting, selected_preferences) {
    const now = this._now();
    const birthPlans = this._getFromStorage('birth_plans');

    const birthPlan = {
      id: this._generateId('birthplan'),
      name: name,
      parent_type: parent_type,
      birth_setting: birth_setting,
      created_at: now,
      updated_at: now
    };

    birthPlans.push(birthPlan);
    this._saveToStorage('birth_plans', birthPlans);

    const selectionsStorage = this._getFromStorage('birth_plan_preference_selections');
    const selections = [];

    const categories = ['pain_management', 'labor_environment', 'postpartum_care', 'newborn_care'];
    for (let c = 0; c < categories.length; c++) {
      const cat = categories[c];
      const ids = (selected_preferences && selected_preferences[cat]) || [];
      if (!Array.isArray(ids)) continue;
      for (let i = 0; i < ids.length; i++) {
        const selection = {
          id: this._generateId('birthprefsel'),
          birth_plan_id: birthPlan.id,
          preference_option_id: ids[i],
          category: cat,
          selected: true,
          created_at: now
        };
        selections.push(selection);
        selectionsStorage.push(selection);
      }
    }

    this._saveToStorage('birth_plan_preference_selections', selectionsStorage);

    return {
      success: true,
      message: 'Birth plan saved.',
      birth_plan: birthPlan,
      preference_selections: selections
    };
  }

  // calculateDueDateFromLastPeriod(last_period_start_date, cycle_length_days)
  calculateDueDateFromLastPeriod(last_period_start_date, cycle_length_days) {
    const lmpDate = this._parseMMDDYYYY(last_period_start_date);
    const cycleLen = Number(cycle_length_days) || 28;

    if (!lmpDate) {
      return { calculation: null };
    }

    const adjustment = cycleLen - 28;
    const totalDays = 280 + adjustment;
    const dueDate = this._addDays(lmpDate, totalDays);

    const currentWeek = this._calculateCurrentPregnancyWeek(lmpDate);
    const now = this._now();

    const calculation = {
      id: this._generateId('duedatecalc'),
      method: 'last_menstrual_period',
      last_period_start_date: lmpDate.toISOString(),
      cycle_length_days: cycleLen,
      input_due_date: null,
      calculated_due_date: dueDate.toISOString(),
      current_pregnancy_week: currentWeek,
      calculation_timestamp: now
    };

    this._saveDueDateCalculationInternal(calculation);

    return { calculation: calculation };
  }

  // getCurrentDueDateCalculation()
  getCurrentDueDateCalculation() {
    const calculations = this._getFromStorage('due_date_calculations');
    const currentId = localStorage.getItem('current_due_date_calculation_id') || '';

    let calculation = null;
    if (currentId) {
      for (let i = 0; i < calculations.length; i++) {
        if (calculations[i].id === currentId) {
          calculation = calculations[i];
          break;
        }
      }
    }

    if (!calculation && calculations.length > 0) {
      calculations.sort(function (a, b) {
        const aTs = a.calculation_timestamp ? Date.parse(a.calculation_timestamp) : 0;
        const bTs = b.calculation_timestamp ? Date.parse(b.calculation_timestamp) : 0;
        return bTs - aTs;
      });
      calculation = calculations[0];
    }

    return { calculation: calculation };
  }

  // getPregnancyWeekGuideIndex(highlight_week_number)
  getPregnancyWeekGuideIndex(highlight_week_number) {
    const guides = this._getFromStorage('pregnancy_week_guides').filter(function (g) {
      return g && g.is_published;
    });
    let articles = this._getFromStorage('articles');
    const articleMap = {};
    for (let i = 0; i < articles.length; i++) {
      articleMap[articles[i].id] = articles[i];
    }

    // Ensure each published week guide has a corresponding article; synthesize minimal ones if missing
    let created = false;
    for (let i = 0; i < guides.length; i++) {
      const g = guides[i];
      if (!g || !g.article_id || articleMap[g.article_id]) continue;
      const weekNum = typeof g.week_number === 'number' ? g.week_number : null;
      let trimester = null;
      if (weekNum != null) {
        if (weekNum <= 13) trimester = 'first_trimester';
        else if (weekNum <= 27) trimester = 'second_trimester';
        else trimester = 'third_trimester';
      }
      const newArticle = {
        id: g.article_id,
        title: g.title || (weekNum != null ? 'Week ' + weekNum + ' of Pregnancy' : ''),
        summary: g.summary || '',
        content: '',
        category: 'pregnancy',
        subcategory: 'week_by_week',
        trimester: trimester,
        tags: [],
        rating: 0,
        rating_count: 0,
        helpful_score: 0,
        published_at: this._now(),
        updated_at: this._now(),
        is_published: true,
        popularity_score: 0
      };
      articles.push(newArticle);
      articleMap[newArticle.id] = newArticle;
      created = true;
    }
    if (created) {
      this._saveToStorage('articles', articles);
    }

    const weeks = guides
      .slice()
      .sort(function (a, b) {
        return (a.week_number || 0) - (b.week_number || 0);
      })
      .map(function (g) {
        return Object.assign({}, g, {
          article: articleMap[g.article_id] || null
        });
      });

    // highlight_week_number is accepted but not mutated into return shape per spec
    void highlight_week_number;

    return { weeks: weeks };
  }

  // getBabyHealthPlannerTemplates(age_range, event_type)
  getBabyHealthPlannerTemplates(age_range, event_type) {
    const templates = this._getFromStorage('health_event_templates').filter(function (t) {
      if (!t) return false;
      if (age_range && t.age_range && t.age_range !== age_range) return false;
      if (event_type && t.event_type !== event_type) return false;
      return true;
    });

    return { templates: templates };
  }

  // saveBabyHealthPlannerSchedule(name, age_range, appointments)
  saveBabyHealthPlannerSchedule(name, age_range, appointments) {
    const schedules = this._getFromStorage('baby_health_planner_schedules');
    const apptsStorage = this._getFromStorage('baby_health_appointments');
    const now = this._now();

    const schedule = {
      id: this._generateId('babyhealthschedule'),
      name: name,
      age_range: age_range,
      created_at: now,
      updated_at: now
    };
    schedules.push(schedule);
    this._saveToStorage('baby_health_planner_schedules', schedules);

    const createdAppointments = [];
    const templates = this._getFromStorage('health_event_templates');
    const templateMap = {};
    for (let i = 0; i < templates.length; i++) {
      templateMap[templates[i].id] = templates[i];
    }

    if (Array.isArray(appointments)) {
      for (let i = 0; i < appointments.length; i++) {
        const apptInput = appointments[i];
        const appt = {
          id: this._generateId('babyhealthappt'),
          schedule_id: schedule.id,
          health_event_template_id: apptInput.health_event_template_id,
          appointment_date: apptInput.appointment_date ? this._parseMMDDYYYY(apptInput.appointment_date)?.toISOString() || apptInput.appointment_date : null,
          notes: apptInput.notes || null,
          created_at: now
        };
        apptsStorage.push(appt);
        createdAppointments.push(Object.assign({}, appt, {
          schedule: schedule,
          health_event_template: templateMap[appt.health_event_template_id] || null
        }));
      }
    }

    this._saveToStorage('baby_health_appointments', apptsStorage);

    return {
      success: true,
      message: 'Baby health planner schedule saved.',
      schedule: schedule,
      appointments: createdAppointments
    };
  }

  // getHospitalBagChecklistTemplates(birth_type, pregnancy_stage)
  getHospitalBagChecklistTemplates(birth_type, pregnancy_stage) {
    const templates = this._getFromStorage('hospital_bag_item_templates');
    const sectionsMap = {};

    function sectionLabel(section) {
      if (section === 'for_mom') return 'For Mom';
      if (section === 'for_baby') return 'For Baby';
      if (section === 'for_partner') return 'For Partner';
      if (section === 'documents') return 'Documents';
      return section;
    }

    for (let i = 0; i < templates.length; i++) {
      const item = templates[i];
      if (!item) continue;

      const birthMatches = item.default_birth_type === 'any' || item.default_birth_type === birth_type;
      const stageMatches = item.default_pregnancy_stage === 'any' || item.default_pregnancy_stage === pregnancy_stage;
      if (!birthMatches || !stageMatches) continue;

      if (!sectionsMap[item.section]) {
        sectionsMap[item.section] = {
          section: item.section,
          label: sectionLabel(item.section),
          items: []
        };
      }
      sectionsMap[item.section].items.push(item);
    }

    const sections = Object.keys(sectionsMap)
      .map(function (k) { return sectionsMap[k]; })
      .sort(function (a, b) { return a.section.localeCompare(b.section); });

    return { sections: sections };
  }

  // saveHospitalBagChecklist(name, birth_type, pregnancy_stage, item_selections)
  saveHospitalBagChecklist(name, birth_type, pregnancy_stage, item_selections) {
    const checklists = this._getFromStorage('hospital_bag_checklists');
    const selectionsStorage = this._getFromStorage('hospital_bag_checklist_item_selections');
    const templates = this._getFromStorage('hospital_bag_item_templates');
    const templateMap = {};
    for (let i = 0; i < templates.length; i++) {
      templateMap[templates[i].id] = templates[i];
    }

    const now = this._now();
    const checklist = {
      id: this._generateId('hospitalbag'),
      name: name,
      birth_type: birth_type,
      pregnancy_stage: pregnancy_stage,
      created_at: now,
      updated_at: now
    };
    checklists.push(checklist);
    this._saveToStorage('hospital_bag_checklists', checklists);

    const createdSelections = [];
    if (Array.isArray(item_selections)) {
      for (let i = 0; i < item_selections.length; i++) {
        const selInput = item_selections[i];
        const sel = {
          id: this._generateId('hospitalbagitemsel'),
          checklist_id: checklist.id,
          item_template_id: selInput.item_template_id,
          is_selected: !!selInput.is_selected,
          created_at: now
        };
        selectionsStorage.push(sel);
        createdSelections.push(Object.assign({}, sel, {
          item_template: templateMap[sel.item_template_id] || null
        }));
      }
    }

    this._saveToStorage('hospital_bag_checklist_item_selections', selectionsStorage);

    return {
      success: true,
      message: 'Hospital bag checklist saved.',
      checklist: checklist,
      item_selections: createdSelections
    };
  }

  // getProductFilterOptions()
  getProductFilterOptions() {
    const departments = this._getFromStorage('product_departments');

    const product_types = [
      { department_code: 'feeding_nursing', value: 'breast_pumps', label: 'Breast pumps' },
      { department_code: 'feeding_nursing', value: 'bottles', label: 'Bottles' },
      { department_code: 'feeding_nursing', value: 'formula', label: 'Formula' },
      { department_code: 'feeding_nursing', value: 'nursing_pads', label: 'Nursing pads' },
      { department_code: 'feeding_nursing', value: 'breastfeeding_accessories', label: 'Breastfeeding accessories' },
      { department_code: 'health_safety', value: 'baby_monitors', label: 'Baby monitors' },
      { department_code: 'travel_gear', value: 'strollers', label: 'Strollers' }
    ];

    const price_filter_presets = [
      { max_price: 50, label: 'Up to $50' },
      { max_price: 100, label: 'Up to $100' },
      { max_price: 200, label: 'Up to $200' }
    ];

    const rating_threshold_options = [
      { min_rating: 3.0, label: '3.0+ stars' },
      { min_rating: 4.0, label: '4.0+ stars' },
      { min_rating: 4.5, label: '4.5+ stars' }
    ];

    const sort_options = [
      { value: 'price_low_to_high', label: 'Price: low to high' },
      { value: 'price_high_to_low', label: 'Price: high to low' },
      { value: 'rating_high_to_low', label: 'Rating: high to low' },
      { value: 'most_popular', label: 'Most popular' }
    ];

    return {
      departments: departments,
      product_types: product_types,
      price_filter_presets: price_filter_presets,
      rating_threshold_options: rating_threshold_options,
      sort_options: sort_options
    };
  }

  // getProductList(filters, sort_by, page, page_size)
  getProductList(filters, sort_by, page, page_size) {
    const allProducts = this._getFromStorage('products');
    const departments = this._getFromStorage('product_departments');
    const deptMap = {};
    for (let i = 0; i < departments.length; i++) {
      deptMap[departments[i].id] = departments[i];
    }

    const f = filters || {};

    let products = allProducts.filter(function (p) {
      if (!p) return false;
      if (f.product_type && p.product_type !== f.product_type) return false;
      if (typeof f.max_price === 'number' && p.price > f.max_price) return false;
      if (typeof f.min_rating === 'number') {
        const rating = typeof p.rating === 'number' ? p.rating : 0;
        if (rating < f.min_rating) return false;
      }
      if (f.only_available && !p.is_available) return false;

      if (f.department_code) {
        const dept = deptMap[p.department_id];
        if (!dept || dept.code !== f.department_code) return false;
      }

      return true;
    });

    const sortBy = sort_by || 'most_popular';
    products.sort(function (a, b) {
      if (sortBy === 'price_low_to_high') {
        return a.price - b.price;
      } else if (sortBy === 'price_high_to_low') {
        return b.price - a.price;
      } else if (sortBy === 'rating_high_to_low') {
        const aRating = typeof a.rating === 'number' ? a.rating : 0;
        const bRating = typeof b.rating === 'number' ? b.rating : 0;
        if (bRating !== aRating) return bRating - aRating;
        const aCount = typeof a.rating_count === 'number' ? a.rating_count : 0;
        const bCount = typeof b.rating_count === 'number' ? b.rating_count : 0;
        return bCount - aCount;
      } else {
        // most_popular fallback: use rating_count as proxy
        const aCount = typeof a.rating_count === 'number' ? a.rating_count : 0;
        const bCount = typeof b.rating_count === 'number' ? b.rating_count : 0;
        return bCount - aCount;
      }
    });

    const pg = page && page > 0 ? page : 1;
    const size = page_size && page_size > 0 ? page_size : 20;
    const start = (pg - 1) * size;
    const paged = products.slice(start, start + size).map(function (p) {
      return Object.assign({}, p, {
        department: deptMap[p.department_id] || null
      });
    });

    return {
      total_results: products.length,
      page: pg,
      page_size: size,
      products: paged
    };
  }

  // getProductDetail(productId)
  getProductDetail(productId) {
    const products = this._getFromStorage('products');
    const departments = this._getFromStorage('product_departments');
    const deptMap = {};
    for (let i = 0; i < departments.length; i++) {
      deptMap[departments[i].id] = departments[i];
    }

    let product = null;
    for (let i = 0; i < products.length; i++) {
      if (products[i].id === productId) {
        product = products[i];
        break;
      }
    }

    if (product) {
      product = Object.assign({}, product, {
        department: deptMap[product.department_id] || null
      });
    }

    const comparisonSet = this._getOrCreateProductComparisonSet();
    const comparisonItems = this._getFromStorage('product_comparison_items');
    let isInComparison = false;
    for (let i = 0; i < comparisonItems.length; i++) {
      if (
        comparisonItems[i].comparison_set_id === comparisonSet.id &&
        comparisonItems[i].product_id === productId
      ) {
        isInComparison = true;
        break;
      }
    }

    return {
      product: product,
      is_in_comparison: isInComparison
    };
  }

  // addProductToComparison(productId)
  addProductToComparison(productId) {
    const comparisonSet = this._getOrCreateProductComparisonSet();
    const items = this._getFromStorage('product_comparison_items');
    const now = this._now();

    for (let i = 0; i < items.length; i++) {
      if (items[i].comparison_set_id === comparisonSet.id && items[i].product_id === productId) {
        const resolvedItemsAlready = this._resolveComparisonItemsWithProducts(
          items.filter(function (it) { return it.comparison_set_id === comparisonSet.id; })
        );
        return {
          success: true,
          message: 'Product already in comparison.',
          comparison_set: comparisonSet,
          items: resolvedItemsAlready
        };
      }
    }

    let maxPosition = 0;
    for (let i = 0; i < items.length; i++) {
      if (items[i].comparison_set_id === comparisonSet.id && typeof items[i].position === 'number') {
        if (items[i].position > maxPosition) maxPosition = items[i].position;
      }
    }

    const newItem = {
      id: this._generateId('productcompitem'),
      comparison_set_id: comparisonSet.id,
      product_id: productId,
      position: maxPosition + 1,
      added_at: now
    };

    items.push(newItem);
    this._saveToStorage('product_comparison_items', items);

    const sets = this._getFromStorage('product_comparison_sets');
    for (let j = 0; j < sets.length; j++) {
      if (sets[j].id === comparisonSet.id) {
        sets[j].updated_at = now;
        break;
      }
    }
    this._saveToStorage('product_comparison_sets', sets);

    const resolvedItems = this._resolveComparisonItemsWithProducts(
      items.filter(function (it) { return it.comparison_set_id === comparisonSet.id; })
    );

    return {
      success: true,
      message: 'Product added to comparison.',
      comparison_set: comparisonSet,
      items: resolvedItems
    };
  }

  // removeProductFromComparison(productId)
  removeProductFromComparison(productId) {
    const comparisonSet = this._getOrCreateProductComparisonSet();
    const items = this._getFromStorage('product_comparison_items');
    const remaining = [];
    let removed = false;

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (it.comparison_set_id === comparisonSet.id && it.product_id === productId) {
        removed = true;
      } else {
        remaining.push(it);
      }
    }

    this._saveToStorage('product_comparison_items', remaining);

    const resolvedItems = this._resolveComparisonItemsWithProducts(
      remaining.filter(function (it) { return it.comparison_set_id === comparisonSet.id; })
    );

    return {
      success: removed,
      message: removed ? 'Product removed from comparison.' : 'Product not in comparison.',
      comparison_set: comparisonSet,
      items: resolvedItems
    };
  }

  // getActiveProductComparison()
  getActiveProductComparison() {
    const sets = this._getFromStorage('product_comparison_sets');
    let activeSet = null;
    let activeId = localStorage.getItem('active_product_comparison_set_id') || '';

    if (activeId) {
      for (let i = 0; i < sets.length; i++) {
        if (sets[i].id === activeId) {
          activeSet = sets[i];
          break;
        }
      }
    }

    if (!activeSet && sets.length > 0) {
      sets.sort(function (a, b) {
        const aTs = a.updated_at ? Date.parse(a.updated_at) : 0;
        const bTs = b.updated_at ? Date.parse(b.updated_at) : 0;
        return bTs - aTs;
      });
      activeSet = sets[0];
      localStorage.setItem('active_product_comparison_set_id', activeSet.id);
    }

    if (!activeSet) {
      return {
        comparison_set: null,
        items: [],
        products: []
      };
    }

    const items = this._getFromStorage('product_comparison_items').filter(function (it) {
      return it.comparison_set_id === activeSet.id;
    });

    const resolvedItems = this._resolveComparisonItemsWithProducts(items);
    const products = resolvedItems.map(function (it) { return it.product; }).filter(function (p) { return !!p; });

    return {
      comparison_set: activeSet,
      items: resolvedItems,
      products: products
    };
  }

  // getForumOverview()
  getForumOverview() {
    const categories = this._getFromStorage('forum_categories');
    return { categories: categories };
  }

  // getForumSubcategories(categoryId)
  getForumSubcategories(categoryId) {
    const categories = this._getFromStorage('forum_categories');
    const subcategoriesAll = this._getFromStorage('forum_subcategories');

    let category = null;
    for (let i = 0; i < categories.length; i++) {
      if (categories[i].id === categoryId) {
        category = categories[i];
        break;
      }
    }

    const subcategories = [];
    for (let i = 0; i < subcategoriesAll.length; i++) {
      const sub = subcategoriesAll[i];
      if (sub.category_id === categoryId) {
        subcategories.push(Object.assign({}, sub, { category: category }));
      }
    }

    return {
      category: category,
      subcategories: subcategories
    };
  }

  // getForumTopics(categoryId, subcategoryId, tagId, page, page_size)
  getForumTopics(categoryId, subcategoryId, tagId, page, page_size) {
    const categories = this._getFromStorage('forum_categories');
    const subcategories = this._getFromStorage('forum_subcategories');
    const topicsAll = this._getFromStorage('forum_topics');

    let category = null;
    for (let i = 0; i < categories.length; i++) {
      if (categories[i].id === categoryId) {
        category = categories[i];
        break;
      }
    }

    let subcategory = null;
    for (let i = 0; i < subcategories.length; i++) {
      if (subcategories[i].id === subcategoryId) {
        subcategory = subcategories[i];
        break;
      }
    }

    const filtered = topicsAll.filter(function (t) {
      if (!t) return false;
      if (t.status === 'deleted') return false;
      if (t.category_id !== categoryId) return false;
      if (t.subcategory_id !== subcategoryId) return false;
      if (tagId && Array.isArray(t.tag_ids) && t.tag_ids.indexOf(tagId) === -1) return false;
      return true;
    });

    const pg = page && page > 0 ? page : 1;
    const size = page_size && page_size > 0 ? page_size : 20;
    const start = (pg - 1) * size;
    const pageTopics = filtered.slice(start, start + size);

    const resolvedTopics = pageTopics.map(this._resolveForumTopicRelations.bind(this));

    const availableTags = this.getForumTags(categoryId).tags;

    return {
      category: category,
      subcategory: subcategory,
      topics: resolvedTopics,
      available_tags: availableTags
    };
  }

  // getForumTags(categoryId)
  getForumTags(categoryId) {
    // categoryId is accepted but ForumTag has its own category enum; there is no FK to ForumCategory.
    // We return all tags; caller may filter by ForumTag.category if desired.
    void categoryId;
    const tags = this._getFromStorage('forum_tags');
    return { tags: tags };
  }

  // createForumTopic(categoryId, subcategoryId, title, display_name, body, tagIds, post_as_guest)
  createForumTopic(categoryId, subcategoryId, title, display_name, body, tagIds, post_as_guest) {
    const topics = this._getFromStorage('forum_topics');
    const now = this._now();

    const isGuest = post_as_guest === false ? false : true;
    const tagsArray = Array.isArray(tagIds) ? tagIds : [];

    const topic = {
      id: this._generateId('forumtopic'),
      category_id: categoryId,
      subcategory_id: subcategoryId,
      title: title,
      display_name: display_name,
      body: body,
      tag_ids: tagsArray,
      created_at: now,
      is_guest: isGuest,
      status: 'published'
    };

    topics.push(topic);
    this._saveToStorage('forum_topics', topics);

    const resolvedTopic = this._resolveForumTopicRelations(topic);

    return {
      success: true,
      message: 'Forum topic created.',
      topic: resolvedTopic
    };
  }

  // getNewsletterSignupOptions()
  getNewsletterSignupOptions() {
    const pregnancy_status_options = [
      { value: 'currently_pregnant', label: 'Currently pregnant' },
      { value: 'trying_to_conceive', label: 'Trying to conceive' },
      { value: 'had_baby', label: 'Already had my baby' },
      { value: 'not_pregnant', label: 'Not pregnant' }
    ];

    const frequency_options = [
      { value: 'weekly_updates', label: 'Weekly updates' },
      { value: 'daily_updates', label: 'Daily updates' },
      { value: 'monthly_updates', label: 'Monthly updates' }
    ];

    const topic_options = [
      { value: 'nutrition', label: 'Nutrition' },
      { value: 'exercise_fitness', label: 'Exercise & fitness' },
      { value: 'symptoms', label: 'Symptoms & relief' },
      { value: 'baby_development', label: 'Baby development' },
      { value: 'mental_health', label: 'Mental health' }
    ];

    return {
      pregnancy_status_options: pregnancy_status_options,
      frequency_options: frequency_options,
      topic_options: topic_options
    };
  }

  // saveNewsletterSubscription(email, pregnancy_status, pregnancy_week, frequency, topics, expected_due_date)
  saveNewsletterSubscription(email, pregnancy_status, pregnancy_week, frequency, topics, expected_due_date) {
    const expectedDateIso = expected_due_date ? this._parseMMDDYYYY(expected_due_date)?.toISOString() || expected_due_date : null;
    const subscription = this._saveNewsletterSubscriptionInternal({
      email: email,
      pregnancy_status: pregnancy_status,
      pregnancy_week: pregnancy_week != null ? Number(pregnancy_week) : null,
      frequency: frequency,
      topics: Array.isArray(topics) ? topics : [],
      expected_due_date: expectedDateIso
    });

    return {
      success: true,
      message: 'Newsletter subscription saved.',
      subscription: subscription
    };
  }

  // getInformationalPage(page_code)
  getInformationalPage(page_code) {
    const pages = this._getFromStorage('informational_pages');
    let page = null;
    for (let i = 0; i < pages.length; i++) {
      if (pages[i].page_code === page_code) {
        page = pages[i];
        break;
      }
    }

    if (!page) {
      return {
        title: '',
        body_html: '',
        last_updated: ''
      };
    }

    return {
      title: page.title || '',
      body_html: page.body_html || '',
      last_updated: page.last_updated || ''
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