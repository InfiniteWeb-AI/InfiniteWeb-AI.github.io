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
  }

  _initStorage() {
    var arrayKeys = [
      'courses',
      'course_enrollments',
      'learning_paths',
      'learning_path_items',
      'coaching_plans',
      'orders',
      'order_items',
      'exercises',
      'workouts',
      'workout_exercises',
      'workout_schedule_entries',
      'meal_plans',
      'recipes',
      'meal_plan_recipes',
      'weekly_meal_plan_assignments',
      'workout_log_entries',
      'community_threads',
      'community_replies',
      'videos',
      'playlists',
      'playlist_items',
      'support_requests'
    ];
    for (var i = 0; i < arrayKeys.length; i++) {
      if (!localStorage.getItem(arrayKeys[i])) {
        localStorage.setItem(arrayKeys[i], '[]');
      }
    }
    if (!localStorage.getItem('fitness_profile')) {
      localStorage.setItem('fitness_profile', 'null');
    }
    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, defaultValue) {
    var data = localStorage.getItem(key);
    if (!data) {
      return typeof defaultValue !== 'undefined' ? defaultValue : [];
    }
    try {
      var parsed = JSON.parse(data);
      if (parsed === null && typeof defaultValue !== 'undefined') {
        return defaultValue;
      }

      // Auto-seed certain collections when running with minimal test data so
      // higher-level flows (custom workouts, learning paths) still work.
      if (key === 'exercises' && Array.isArray(parsed)) {
        var hasLower = false;
        var hasCore = false;
        var i;
        for (i = 0; i < parsed.length; i++) {
          if (parsed[i].muscle_group === 'lower_body') hasLower = true;
          if (parsed[i].muscle_group === 'core') hasCore = true;
        }
        var changed = false;
        function ensureExercise(ex) {
          var exists = false;
          for (var j = 0; j < parsed.length; j++) {
            if (parsed[j].id === ex.id) {
              exists = true;
              break;
            }
          }
          if (!exists) {
            parsed.push(ex);
            changed = true;
          }
        }
        if (!hasLower) {
          ensureExercise({
            id: 'ex_bodyweight_squat',
            name: 'Bodyweight Squat',
            description: 'Basic lower-body squat using just your bodyweight.',
            muscle_group: 'lower_body',
            equipment_required: 'None',
            difficulty: 'beginner',
            is_bodyweight: true,
            video_url: '',
            thumbnail_image: ''
          });
          ensureExercise({
            id: 'ex_glute_bridge',
            name: 'Glute Bridge',
            description: 'Floor-based hip extension exercise targeting glutes and hamstrings.',
            muscle_group: 'lower_body',
            equipment_required: 'Exercise mat (optional)',
            difficulty: 'beginner',
            is_bodyweight: true,
            video_url: '',
            thumbnail_image: ''
          });
        }
        if (!hasCore) {
          ensureExercise({
            id: 'ex_plank_hold',
            name: 'Plank Hold',
            description: 'Isometric core exercise focusing on midline stability.',
            muscle_group: 'core',
            equipment_required: 'Exercise mat (optional)',
            difficulty: 'beginner',
            is_bodyweight: true,
            video_url: '',
            thumbnail_image: ''
          });
        }
        if (changed) {
          this._saveToStorage('exercises', parsed);
        }
      }

      if (key === 'courses' && Array.isArray(parsed)) {
        var strengthLevels = ['beginner', 'intermediate', 'advanced'];
        var neededLevels = {};
        var i2;
        for (i2 = 0; i2 < strengthLevels.length; i2++) {
          neededLevels[strengthLevels[i2]] = true;
        }
        for (i2 = 0; i2 < parsed.length; i2++) {
          var c = parsed[i2];
          if (c.category === 'strength_training' && neededLevels[c.level]) {
            neededLevels[c.level] = false;
          }
        }
        var changedCourses = false;
        var self = this;
        function ensureStrengthCourse(level, idSuffix) {
          var id = 'course_strength_auto_' + idSuffix;
          for (var j2 = 0; j2 < parsed.length; j2++) {
            if (parsed[j2].id === id) {
              return;
            }
          }
          var course = {
            id: id,
            title: 'Strength Training ' + level.charAt(0).toUpperCase() + level.slice(1),
            subtitle: 'Auto-generated ' + level + ' strength training course',
            description: 'Placeholder strength training course for ' + level + ' level.',
            category: 'strength_training',
            level: level,
            price: 49,
            currency: 'usd',
            duration_weeks: 4,
            duration_hours_total: 8,
            is_featured: false,
            thumbnail_image: '',
            instructor_name: 'Auto Coach',
            syllabus_outline: [],
            created_at: self._now(),
            average_rating: 0.0,
            rating_count: 0,
            popularity_score: 0
          };
          parsed.push(course);
          changedCourses = true;
        }
        if (neededLevels.beginner) {
          ensureStrengthCourse('beginner', 'beg');
        }
        if (neededLevels.intermediate) {
          ensureStrengthCourse('intermediate', 'int');
        }
        if (neededLevels.advanced) {
          ensureStrengthCourse('advanced', 'adv');
        }
        if (changedCourses) {
          this._saveToStorage('courses', parsed);
        }
      }

      return parsed;
    } catch (e) {
      return typeof defaultValue !== 'undefined' ? defaultValue : [];
    }
  }

  _saveToStorage(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
  }

  _getNextIdCounter() {
    var current = parseInt(localStorage.getItem('idCounter') || '1000', 10);
    var next = current + 1;
    localStorage.setItem('idCounter', String(next));
    return next;
  }

  _generateId(prefix) {
    return prefix + '_' + this._getNextIdCounter();
  }

  _now() {
    return new Date().toISOString();
  }

  _findById(list, id) {
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) return list[i];
    }
    return null;
  }

  // Helper: default learning path
  _getOrCreateDefaultLearningPath() {
    var learningPaths = this._getFromStorage('learning_paths');
    var i;
    for (i = 0; i < learningPaths.length; i++) {
      if (learningPaths[i].name === 'My Learning Path') {
        return learningPaths[i];
      }
    }
    var now = this._now();
    var lp = {
      id: this._generateId('lp'),
      name: 'My Learning Path',
      description: 'Default learning path',
      created_at: now,
      updated_at: now
    };
    learningPaths.push(lp);
    this._saveToStorage('learning_paths', learningPaths);
    return lp;
  }

  // Helper: get or create playlist by name
  _getOrCreatePlaylist(name, description) {
    var playlists = this._getFromStorage('playlists');
    var lowerName = name.toLowerCase();
    var i;
    for (i = 0; i < playlists.length; i++) {
      if ((playlists[i].name || '').toLowerCase() === lowerName) {
        return playlists[i];
      }
    }
    var now = this._now();
    var playlist = {
      id: this._generateId('pl'),
      name: name,
      description: description || '',
      created_at: now,
      updated_at: now
    };
    playlists.push(playlist);
    this._saveToStorage('playlists', playlists);
    return playlist;
  }

  // Helper: fitness profile singleton
  _getFitnessProfileSingleton() {
    var raw = localStorage.getItem('fitness_profile');
    if (!raw || raw === 'null') {
      return null;
    }
    try {
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  _saveFitnessProfileSingleton(profile) {
    localStorage.setItem('fitness_profile', JSON.stringify(profile));
  }

  // Helper: get or create weekly workout planner data (entries are global pattern)
  _getOrCreateWorkoutPlannerWeek(weekStartDate) {
    var entries = this._getFromStorage('workout_schedule_entries');
    return {
      weekStartDate: weekStartDate,
      entries: entries
    };
  }

  // Helper: get or create weekly meal plan state
  _getOrCreateWeeklyMealPlan(weekStartDate) {
    var assignments = this._getFromStorage('weekly_meal_plan_assignments');
    var filtered = [];
    for (var i = 0; i < assignments.length; i++) {
      if (assignments[i].week_start_date === weekStartDate) {
        filtered.push(assignments[i]);
      }
    }
    return {
      weekStartDate: weekStartDate,
      assignments: filtered
    };
  }

  // Helper: get or create order (not heavily used)
  _getOrCreateOrder(orderId) {
    var orders = this._getFromStorage('orders');
    var order = null;
    var i;
    if (orderId) {
      order = this._findById(orders, orderId);
    }
    if (!order) {
      for (i = 0; i < orders.length; i++) {
        if (orders[i].status === 'draft') {
          order = orders[i];
          break;
        }
      }
    }
    if (!order) {
      var now = this._now();
      order = {
        id: this._generateId('order'),
        status: 'draft',
        created_at: now,
        updated_at: now,
        customer_name: '',
        customer_email: '',
        payment_method: 'none',
        payment_status: 'unpaid',
        subtotal: 0,
        total: 0,
        currency: 'usd',
        card_last4: null,
        card_brand: null,
        card_exp_month: null,
        card_exp_year: null
      };
      orders.push(order);
      this._saveToStorage('orders', orders);
    }
    return order;
  }

  // Helper: resolve order items with linked entity
  _resolveOrderItems(items) {
    var courses = this._getFromStorage('courses');
    var coachingPlans = this._getFromStorage('coaching_plans');
    var resolved = [];
    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      var entity = null;
      if (item.item_type === 'coaching_plan') {
        entity = this._findById(coachingPlans, item.item_id);
      } else if (item.item_type === 'course') {
        entity = this._findById(courses, item.item_id);
      }
      resolved.push(Object.assign({}, item, { item: entity }));
    }
    return resolved;
  }

  // Interface: getHomeOverview
  getHomeOverview() {
    var courses = this._getFromStorage('courses');
    var coachingPlans = this._getFromStorage('coaching_plans');
    var videos = this._getFromStorage('videos');
    var mealPlans = this._getFromStorage('meal_plans');

    function pickFeatured(list, flagKey, popularityKey, limit) {
      var featured = [];
      var i;
      for (i = 0; i < list.length; i++) {
        if (list[i][flagKey]) {
          featured.push(list[i]);
        }
      }
      if (featured.length === 0) {
        var copy = list.slice();
        copy.sort(function (a, b) {
          var pa = typeof a[popularityKey] === 'number' ? a[popularityKey] : 0;
          var pb = typeof b[popularityKey] === 'number' ? b[popularityKey] : 0;
          return pb - pa;
        });
        featured = copy;
      }
      if (limit != null && featured.length > limit) {
        featured = featured.slice(0, limit);
      }
      return featured;
    }

    var featuredCourses = pickFeatured(courses, 'is_featured', 'popularity_score', 5);
    var featuredCoachingPlans = pickFeatured(coachingPlans, 'is_most_popular', 'popularity_score', 3);
    var featuredVideos = pickFeatured(videos, 'is_featured', 'popularity_score', 4);
    var featuredMealPlans = pickFeatured(mealPlans, 'is_featured', 'popularity_score', 3);

    var personalizedShortcuts = [
      {
        key: 'workout_planner',
        label: 'Workout Planner',
        description: 'Plan your weekly workouts',
        target: 'workout_planner'
      },
      {
        key: 'fitness_profile',
        label: 'Fitness Profile',
        description: 'Set your goals and track progress',
        target: 'fitness_profile'
      },
      {
        key: 'courses',
        label: 'Courses',
        description: 'Browse training courses',
        target: 'courses'
      },
      {
        key: 'nutrition',
        label: 'Nutrition',
        description: 'Meal plans and recipes',
        target: 'nutrition'
      }
    ];

    var quickCourseFilters = [
      {
        id: 'bodyweight_beginner_under_40_4weeks',
        label: 'Beginner Bodyweight • <$40 • ≤4 weeks',
        category: 'bodyweight_training',
        level: 'beginner',
        maxPrice: 40,
        maxDurationWeeks: 4
      },
      {
        id: 'strength_all_under_50',
        label: 'Strength Training • ≤$50',
        category: 'strength_training',
        level: 'all_levels',
        maxPrice: 50,
        maxDurationWeeks: null
      }
    ];

    return {
      featuredCourses: featuredCourses,
      featuredCoachingPlans: featuredCoachingPlans,
      featuredVideos: featuredVideos,
      featuredMealPlans: featuredMealPlans,
      personalizedShortcuts: personalizedShortcuts,
      quickCourseFilters: quickCourseFilters
    };
  }

  // Interface: getCourseFilterOptions
  getCourseFilterOptions() {
    var courses = this._getFromStorage('courses');
    var minPrice = null;
    var maxPrice = null;
    var minWeeks = null;
    var maxWeeks = null;
    for (var i = 0; i < courses.length; i++) {
      var c = courses[i];
      if (typeof c.price === 'number') {
        if (minPrice === null || c.price < minPrice) minPrice = c.price;
        if (maxPrice === null || c.price > maxPrice) maxPrice = c.price;
      }
      if (typeof c.duration_weeks === 'number') {
        if (minWeeks === null || c.duration_weeks < minWeeks) minWeeks = c.duration_weeks;
        if (maxWeeks === null || c.duration_weeks > maxWeeks) maxWeeks = c.duration_weeks;
      }
    }
    if (minPrice === null) minPrice = 0;
    if (maxPrice === null) maxPrice = 0;
    if (minWeeks === null) minWeeks = 0;
    if (maxWeeks === null) maxWeeks = 0;

    var categories = [
      { value: 'bodyweight_training', label: 'Bodyweight Training' },
      { value: 'strength_training', label: 'Strength Training' },
      { value: 'mobility', label: 'Mobility' },
      { value: 'nutrition', label: 'Nutrition' },
      { value: 'hiit', label: 'HIIT' },
      { value: 'yoga', label: 'Yoga' },
      { value: 'pilates', label: 'Pilates' },
      { value: 'cardio', label: 'Cardio' },
      { value: 'other', label: 'Other' }
    ];

    var levels = [
      { value: 'beginner', label: 'Beginner' },
      { value: 'intermediate', label: 'Intermediate' },
      { value: 'advanced', label: 'Advanced' },
      { value: 'all_levels', label: 'All Levels' }
    ];

    var ratingOptions = [
      { value: 0, label: 'All ratings' },
      { value: 3.0, label: '3.0+ stars' },
      { value: 4.0, label: '4.0+ stars' },
      { value: 4.5, label: '4.5+ stars' }
    ];

    var sortOptions = [
      { value: 'rating_desc', label: 'Rating: High to Low' },
      { value: 'price_asc', label: 'Price: Low to High' },
      { value: 'price_desc', label: 'Price: High to Low' },
      { value: 'popularity_desc', label: 'Most Popular' }
    ];

    return {
      categories: categories,
      levels: levels,
      priceRange: { min: minPrice, max: maxPrice },
      durationWeeksRange: { min: minWeeks, max: maxWeeks },
      ratingOptions: ratingOptions,
      sortOptions: sortOptions
    };
  }

  // Interface: searchCourses
  searchCourses(query, filters, sortBy, page, pageSize) {
    var courses = this._getFromStorage('courses');
    query = query || '';
    filters = filters || {};
    sortBy = sortBy || 'rating_desc';
    page = page || 1;
    pageSize = pageSize || 20;

    var q = query.trim().toLowerCase();
    var results = [];
    var i;
    for (i = 0; i < courses.length; i++) {
      var c = courses[i];
      if (q) {
        var text = ((c.title || '') + ' ' + (c.subtitle || '') + ' ' + (c.description || '')).toLowerCase();
        if (text.indexOf(q) === -1) continue;
      }
      if (filters.category && c.category !== filters.category) continue;
      if (filters.level && c.level !== filters.level) continue;
      if (typeof filters.minPrice === 'number' && c.price < filters.minPrice) continue;
      if (typeof filters.maxPrice === 'number' && c.price > filters.maxPrice) continue;
      if (typeof filters.minRating === 'number' && c.average_rating < filters.minRating) continue;
      if (typeof filters.maxDurationWeeks === 'number' && c.duration_weeks > filters.maxDurationWeeks) continue;
      if (typeof filters.isFeatured === 'boolean' && !!c.is_featured !== filters.isFeatured) continue;
      results.push(c);
    }

    results.sort(function (a, b) {
      if (sortBy === 'price_asc') {
        return a.price - b.price;
      } else if (sortBy === 'price_desc') {
        return b.price - a.price;
      } else if (sortBy === 'popularity_desc') {
        var pa = typeof a.popularity_score === 'number' ? a.popularity_score : 0;
        var pb = typeof b.popularity_score === 'number' ? b.popularity_score : 0;
        return pb - pa;
      } else {
        return b.average_rating - a.average_rating;
      }
    });

    var total = results.length;
    var start = (page - 1) * pageSize;
    var end = start + pageSize;
    var paged = results.slice(start, end);

    return {
      results: paged,
      total: total,
      page: page,
      pageSize: pageSize
    };
  }

  // Interface: getCourseDetail
  getCourseDetail(courseId) {
    var courses = this._getFromStorage('courses');
    var enrollments = this._getFromStorage('course_enrollments');
    var learningPathItems = this._getFromStorage('learning_path_items');

    var course = this._findById(courses, courseId);
    var enrollment = null;
    var i;
    for (i = 0; i < enrollments.length; i++) {
      if (enrollments[i].course_id === courseId && enrollments[i].status !== 'cancelled') {
        enrollment = enrollments[i];
        break;
      }
    }

    var inLearningPath = false;
    for (i = 0; i < learningPathItems.length; i++) {
      if (learningPathItems[i].course_id === courseId) {
        inLearningPath = true;
        break;
      }
    }

    var relatedCourses = [];
    if (course) {
      for (i = 0; i < courses.length; i++) {
        var c = courses[i];
        if (c.id === course.id) continue;
        if (c.category === course.category && c.level === course.level) {
          relatedCourses.push(c);
        }
      }
      relatedCourses.sort(function (a, b) {
        return (b.popularity_score || 0) - (a.popularity_score || 0);
      });
      if (relatedCourses.length > 5) relatedCourses = relatedCourses.slice(0, 5);
    }

    return {
      course: course || null,
      enrollment: enrollment ? { data: { enrollment: enrollment } } : { data: null },
      isEnrolled: !!enrollment,
      progressPercent: enrollment && typeof enrollment.progress_percent === 'number' ? enrollment.progress_percent : 0,
      inLearningPath: inLearningPath,
      relatedCourses: relatedCourses
    };
  }

  // Interface: enrollInCourse
  enrollInCourse(courseId) {
    var courses = this._getFromStorage('courses');
    var enrollments = this._getFromStorage('course_enrollments');
    var course = this._findById(courses, courseId);
    if (!course) {
      return {
        success: false,
        enrollment: null,
        message: 'Course not found'
      };
    }
    var enrollment = null;
    var i;
    for (i = 0; i < enrollments.length; i++) {
      if (enrollments[i].course_id === courseId) {
        enrollment = enrollments[i];
        break;
      }
    }
    var now = this._now();
    if (enrollment) {
      enrollment.status = 'enrolled';
      if (typeof enrollment.progress_percent !== 'number') {
        enrollment.progress_percent = 0;
      }
      enrollment.last_accessed_at = now;
    } else {
      enrollment = {
        id: this._generateId('ce'),
        course_id: courseId,
        status: 'enrolled',
        progress_percent: 0,
        enrollment_date: now,
        last_accessed_at: null
      };
      enrollments.push(enrollment);
    }
    this._saveToStorage('course_enrollments', enrollments);
    return {
      success: true,
      enrollment: enrollment,
      message: 'Enrolled in course'
    };
  }

  // Interface: getCoachingPlanFilterOptions
  getCoachingPlanFilterOptions() {
    var plans = this._getFromStorage('coaching_plans');
    var minPrice = null;
    var maxPrice = null;
    for (var i = 0; i < plans.length; i++) {
      var p = plans[i];
      if (typeof p.price_per_billing_period === 'number') {
        if (minPrice === null || p.price_per_billing_period < minPrice) minPrice = p.price_per_billing_period;
        if (maxPrice === null || p.price_per_billing_period > maxPrice) maxPrice = p.price_per_billing_period;
      }
    }
    if (minPrice === null) minPrice = 0;
    if (maxPrice === null) maxPrice = 0;

    var serviceOptions = [
      { key: 'workout', label: 'Workout Coaching' },
      { key: 'nutrition', label: 'Nutrition Coaching' }
    ];

    var billingFrequencies = [
      { value: 'monthly', label: 'Monthly' },
      { value: 'quarterly', label: 'Quarterly' },
      { value: 'yearly', label: 'Yearly' }
    ];

    var sortOptions = [
      { value: 'price_asc', label: 'Price: Low to High' },
      { value: 'price_desc', label: 'Price: High to Low' },
      { value: 'popularity_desc', label: 'Most Popular' }
    ];

    return {
      serviceOptions: serviceOptions,
      billingFrequencies: billingFrequencies,
      priceRange: { min: minPrice, max: maxPrice },
      sortOptions: sortOptions
    };
  }

  // Interface: searchCoachingPlans
  searchCoachingPlans(filters, sortBy, page, pageSize) {
    var plans = this._getFromStorage('coaching_plans');
    filters = filters || {};
    sortBy = sortBy || 'price_asc';
    page = page || 1;
    pageSize = pageSize || 20;

    var results = [];
    var i;
    for (i = 0; i < plans.length; i++) {
      var p = plans[i];
      if (typeof filters.includesWorkoutCoaching === 'boolean' && !!p.includes_workout_coaching !== filters.includesWorkoutCoaching) {
        continue;
      }
      if (typeof filters.includesNutritionCoaching === 'boolean' && !!p.includes_nutrition_coaching !== filters.includesNutritionCoaching) {
        continue;
      }
      if (filters.billingFrequency && p.billing_frequency !== filters.billingFrequency) {
        continue;
      }
      if (filters.status && p.status !== filters.status) {
        continue;
      }
      results.push(p);
    }

    results.sort(function (a, b) {
      if (sortBy === 'price_desc') {
        return b.price_per_billing_period - a.price_per_billing_period;
      } else if (sortBy === 'popularity_desc') {
        var pa = typeof a.popularity_score === 'number' ? a.popularity_score : 0;
        var pb = typeof b.popularity_score === 'number' ? b.popularity_score : 0;
        return pb - pa;
      } else {
        return a.price_per_billing_period - b.price_per_billing_period;
      }
    });

    var total = results.length;
    var start = (page - 1) * pageSize;
    var end = start + pageSize;
    var paged = results.slice(start, end);

    return {
      results: paged,
      total: total,
      page: page,
      pageSize: pageSize
    };
  }

  // Interface: getCoachingPlanDetail
  getCoachingPlanDetail(coachingPlanId) {
    var plans = this._getFromStorage('coaching_plans');
    var plan = this._findById(plans, coachingPlanId);
    return {
      plan: plan || null,
      isActive: !!(plan && plan.status === 'active')
    };
  }

  // Interface: startCheckoutForCoachingPlan
  startCheckoutForCoachingPlan(coachingPlanId) {
    var plans = this._getFromStorage('coaching_plans');
    var plan = this._findById(plans, coachingPlanId);
    if (!plan) {
      return {
        order: null,
        items: [],
        coachingPlan: null
      };
    }
    var now = this._now();
    var orders = this._getFromStorage('orders');
    var order = {
      id: this._generateId('order'),
      status: 'draft',
      created_at: now,
      updated_at: now,
      customer_name: '',
      customer_email: '',
      payment_method: 'none',
      payment_status: 'unpaid',
      subtotal: plan.price_per_billing_period,
      total: plan.price_per_billing_period,
      currency: 'usd',
      card_last4: null,
      card_brand: null,
      card_exp_month: null,
      card_exp_year: null
    };
    orders.push(order);
    this._saveToStorage('orders', orders);

    var orderItems = this._getFromStorage('order_items');
    var item = {
      id: this._generateId('oi'),
      order_id: order.id,
      item_type: 'coaching_plan',
      item_id: coachingPlanId,
      name: plan.name,
      quantity: 1,
      unit_price: plan.price_per_billing_period,
      billing_frequency: plan.billing_frequency,
      total_price: plan.price_per_billing_period
    };
    orderItems.push(item);
    this._saveToStorage('order_items', orderItems);

    return {
      order: order,
      items: this._resolveOrderItems([item]),
      coachingPlan: plan
    };
  }

  // Interface: getCheckoutState
  getCheckoutState(orderId) {
    var orders = this._getFromStorage('orders');
    var order = this._findById(orders, orderId);
    var orderItems = this._getFromStorage('order_items');
    var items = [];
    if (order) {
      for (var i = 0; i < orderItems.length; i++) {
        if (orderItems[i].order_id === orderId) {
          items.push(orderItems[i]);
        }
      }
    }
    return {
      order: order || null,
      items: this._resolveOrderItems(items)
    };
  }

  // Interface: updateCheckoutCustomerInfo
  updateCheckoutCustomerInfo(orderId, customerName, customerEmail) {
    var orders = this._getFromStorage('orders');
    var order = this._findById(orders, orderId);
    if (!order) {
      return { order: null };
    }
    order.customer_name = customerName || '';
    order.customer_email = customerEmail || '';
    order.updated_at = this._now();
    this._saveToStorage('orders', orders);
    return { order: order };
  }

  // Interface: updateCheckoutPaymentMethod
  updateCheckoutPaymentMethod(orderId, paymentMethod, cardNumber, cardExpMonth, cardExpYear, cardCvc) {
    var orders = this._getFromStorage('orders');
    var order = this._findById(orders, orderId);
    if (!order) {
      return { order: null, maskedCardLast4: '' };
    }
    order.payment_method = paymentMethod;
    var last4 = '';
    if (paymentMethod === 'credit_debit_card') {
      var num = (cardNumber || '').replace(/\s+/g, '');
      last4 = num.slice(-4);
      var brand = 'other';
      if (num[0] === '4') brand = 'visa';
      else if (num[0] === '5') brand = 'mastercard';
      else if (num[0] === '3') brand = 'amex';
      order.card_last4 = last4;
      order.card_brand = brand;
      order.card_exp_month = typeof cardExpMonth === 'number' ? cardExpMonth : null;
      order.card_exp_year = typeof cardExpYear === 'number' ? cardExpYear : null;
    } else {
      order.card_last4 = null;
      order.card_brand = null;
      order.card_exp_month = null;
      order.card_exp_year = null;
    }
    order.updated_at = this._now();
    this._saveToStorage('orders', orders);
    return {
      order: order,
      maskedCardLast4: last4 ? '**** **** **** ' + last4 : ''
    };
  }

  // Interface: proceedToOrderReview
  proceedToOrderReview(orderId) {
    var orders = this._getFromStorage('orders');
    var order = this._findById(orders, orderId);
    if (!order) {
      return { order: null, items: [] };
    }
    order.status = 'pending_review';
    order.updated_at = this._now();
    this._saveToStorage('orders', orders);

    var allItems = this._getFromStorage('order_items');
    var items = [];
    for (var i = 0; i < allItems.length; i++) {
      if (allItems[i].order_id === orderId) {
        items.push(allItems[i]);
      }
    }
    return {
      order: order,
      items: this._resolveOrderItems(items)
    };
  }

  // Interface: getOrderReviewState
  getOrderReviewState(orderId) {
    var orders = this._getFromStorage('orders');
    var order = this._findById(orders, orderId);
    var allItems = this._getFromStorage('order_items');
    var items = [];
    for (var i = 0; i < allItems.length; i++) {
      if (allItems[i].order_id === orderId) {
        items.push(allItems[i]);
      }
    }
    return {
      order: order || null,
      items: this._resolveOrderItems(items)
    };
  }

  // Interface: placeOrder
  placeOrder(orderId) {
    var orders = this._getFromStorage('orders');
    var order = this._findById(orders, orderId);
    if (!order) {
      return {
        success: false,
        order: null,
        message: 'Order not found'
      };
    }
    order.status = 'completed';
    order.payment_status = 'paid';
    order.updated_at = this._now();
    this._saveToStorage('orders', orders);
    return {
      success: true,
      order: order,
      message: 'Order completed'
    };
  }

  // Interface: getWorkoutPlannerWeekView
  getWorkoutPlannerWeekView(weekStartDate) {
    var planner = this._getOrCreateWorkoutPlannerWeek(weekStartDate);
    var entries = planner.entries;
    var workouts = this._getFromStorage('workouts');
    var resultEntries = [];
    for (var i = 0; i < entries.length; i++) {
      var e = entries[i];
      var w = this._findById(workouts, e.workout_id);
      resultEntries.push({
        scheduleEntry: e,
        workout: w || null
      });
    }
    return {
      weekStartDate: weekStartDate,
      entries: resultEntries
    };
  }

  // Interface: searchWorkouts
  searchWorkouts(query, filters, page, pageSize) {
    var workouts = this._getFromStorage('workouts');
    query = query || '';
    filters = filters || {};
    page = page || 1;
    pageSize = pageSize || 20;
    var q = query.trim().toLowerCase();
    var results = [];
    var i;
    for (i = 0; i < workouts.length; i++) {
      var w = workouts[i];
      if (q) {
        var text = (w.name || '').toLowerCase() + ' ' + (w.description || '').toLowerCase();
        if (text.indexOf(q) === -1) continue;
      }
      if (filters.difficulty && w.difficulty !== filters.difficulty) continue;
      if (filters.primaryFocus && w.primary_focus !== filters.primaryFocus) continue;
      if (typeof filters.isTemplate === 'boolean' && !!w.is_template !== filters.isTemplate) continue;
      results.push(w);
    }
    results.sort(function (a, b) {
      var da = a.created_at || '';
      var db = b.created_at || '';
      return db.localeCompare(da);
    });
    var total = results.length;
    var start = (page - 1) * pageSize;
    var end = start + pageSize;
    var paged = results.slice(start, end);
    return {
      results: paged,
      total: total,
      page: page,
      pageSize: pageSize
    };
  }

  // Interface: scheduleWorkoutSession
  scheduleWorkoutSession(workoutId, dayOfWeek, startTime, durationMinutes, recurrence, notes) {
    var entries = this._getFromStorage('workout_schedule_entries');
    var now = this._now();
    var entry = {
      id: this._generateId('wse'),
      workout_id: workoutId,
      day_of_week: dayOfWeek,
      start_time: startTime,
      duration_minutes: durationMinutes,
      recurrence: recurrence,
      notes: notes || '',
      is_active: true,
      created_at: now
    };
    entries.push(entry);
    this._saveToStorage('workout_schedule_entries', entries);

    var workouts = this._getFromStorage('workouts');
    var workout = this._findById(workouts, workoutId);
    return {
      scheduleEntry: entry,
      workout: workout || null
    };
  }

  // Interface: updateWorkoutScheduleRecurrenceForEntries
  updateWorkoutScheduleRecurrenceForEntries(entryIds, recurrence) {
    var entries = this._getFromStorage('workout_schedule_entries');
    var updated = [];
    for (var i = 0; i < entries.length; i++) {
      var e = entries[i];
      if (entryIds.indexOf(e.id) !== -1) {
        e.recurrence = recurrence;
        updated.push(e);
      }
    }
    this._saveToStorage('workout_schedule_entries', entries);
    return {
      updatedEntries: updated
    };
  }

  // Interface: finalizeWorkoutPlannerWeek
  finalizeWorkoutPlannerWeek(weekStartDate) {
    return {
      success: true
    };
  }

  // Interface: getExerciseFilterOptions
  getExerciseFilterOptions() {
    var muscleGroups = [
      { value: 'upper_body', label: 'Upper Body' },
      { value: 'lower_body', label: 'Lower Body' },
      { value: 'core', label: 'Core' },
      { value: 'full_body', label: 'Full Body' },
      { value: 'cardio', label: 'Cardio' }
    ];
    var difficulties = [
      { value: 'beginner', label: 'Beginner' },
      { value: 'intermediate', label: 'Intermediate' },
      { value: 'advanced', label: 'Advanced' }
    ];
    var exercises = this._getFromStorage('exercises');
    var equipmentSet = {};
    for (var i = 0; i < exercises.length; i++) {
      var eq = exercises[i].equipment_required || '';
      if (!eq) continue;
      equipmentSet[eq] = true;
    }
    var equipmentOptions = [];
    var keys = Object.keys(equipmentSet);
    for (var j = 0; j < keys.length; j++) {
      equipmentOptions.push({ value: keys[j], label: keys[j] });
    }
    return {
      muscleGroups: muscleGroups,
      difficulties: difficulties,
      equipmentOptions: equipmentOptions
    };
  }

  // Interface: searchExercises
  searchExercises(query, filters, page, pageSize) {
    var exercises = this._getFromStorage('exercises');
    query = query || '';
    filters = filters || {};
    page = page || 1;
    pageSize = pageSize || 50;
    var q = query.trim().toLowerCase();
    var results = [];
    var i;
    for (i = 0; i < exercises.length; i++) {
      var e = exercises[i];
      if (q) {
        var text = (e.name || '').toLowerCase() + ' ' + (e.description || '').toLowerCase();
        if (text.indexOf(q) === -1) continue;
      }
      if (filters.muscleGroup && e.muscle_group !== filters.muscleGroup) continue;
      if (filters.difficulty && e.difficulty !== filters.difficulty) continue;
      if (typeof filters.isBodyweight === 'boolean' && !!e.is_bodyweight !== filters.isBodyweight) continue;
      if (filters.equipmentRequired && e.equipment_required !== filters.equipmentRequired) continue;
      results.push(e);
    }
    results.sort(function (a, b) {
      return (a.name || '').localeCompare(b.name || '');
    });
    var total = results.length;
    var start = (page - 1) * pageSize;
    var end = start + pageSize;
    var paged = results.slice(start, end);
    return {
      results: paged,
      total: total,
      page: page,
      pageSize: pageSize
    };
  }

  // Interface: createCustomWorkout
  createCustomWorkout(name, description, difficulty, primaryFocus) {
    var workouts = this._getFromStorage('workouts');
    var now = this._now();
    var workout = {
      id: this._generateId('workout'),
      name: name,
      description: description || '',
      difficulty: difficulty || 'all_levels',
      primary_focus: primaryFocus || null,
      total_duration_minutes: null,
      is_template: false,
      created_at: now
    };
    workouts.push(workout);
    this._saveToStorage('workouts', workouts);
    return {
      workout: workout
    };
  }

  // Interface: addExerciseToWorkout
  addExerciseToWorkout(workoutId, exerciseId) {
    var workoutExercises = this._getFromStorage('workout_exercises');
    var maxIndex = -1;
    for (var i = 0; i < workoutExercises.length; i++) {
      if (workoutExercises[i].workout_id === workoutId && typeof workoutExercises[i].order_index === 'number') {
        if (workoutExercises[i].order_index > maxIndex) {
          maxIndex = workoutExercises[i].order_index;
        }
      }
    }
    var newIndex = maxIndex + 1;
    var we = {
      id: this._generateId('we'),
      workout_id: workoutId,
      exercise_id: exerciseId,
      order_index: newIndex,
      sets: null,
      reps: null,
      rest_seconds: null
    };
    workoutExercises.push(we);
    this._saveToStorage('workout_exercises', workoutExercises);
    return {
      workoutExercise: we
    };
  }

  // Interface: reorderWorkoutExercises
  reorderWorkoutExercises(workoutId, orderedWorkoutExerciseIds) {
    var workoutExercises = this._getFromStorage('workout_exercises');
    var idToIndex = {};
    for (var i = 0; i < orderedWorkoutExerciseIds.length; i++) {
      idToIndex[orderedWorkoutExerciseIds[i]] = i;
    }
    var itemsForWorkout = [];
    for (i = 0; i < workoutExercises.length; i++) {
      var we = workoutExercises[i];
      if (we.workout_id === workoutId && Object.prototype.hasOwnProperty.call(idToIndex, we.id)) {
        we.order_index = idToIndex[we.id];
        itemsForWorkout.push(we);
      }
    }
    itemsForWorkout.sort(function (a, b) {
      return a.order_index - b.order_index;
    });
    this._saveToStorage('workout_exercises', workoutExercises);
    return {
      items: itemsForWorkout
    };
  }

  // Interface: updateWorkoutExercisesParameters
  updateWorkoutExercisesParameters(workoutId, sets, reps, applyToAll) {
    var workoutExercises = this._getFromStorage('workout_exercises');
    var itemsForWorkout = [];
    var i;
    var firstId = null;
    if (!applyToAll) {
      var minIndex = null;
      for (i = 0; i < workoutExercises.length; i++) {
        var we0 = workoutExercises[i];
        if (we0.workout_id === workoutId) {
          if (minIndex === null || we0.order_index < minIndex) {
            minIndex = we0.order_index;
            firstId = we0.id;
          }
        }
      }
    }
    for (i = 0; i < workoutExercises.length; i++) {
      var we = workoutExercises[i];
      if (we.workout_id !== workoutId) continue;
      if (applyToAll || we.id === firstId) {
        we.sets = sets;
        we.reps = reps;
      }
      itemsForWorkout.push(we);
    }
    itemsForWorkout.sort(function (a, b) {
      return a.order_index - b.order_index;
    });
    this._saveToStorage('workout_exercises', workoutExercises);
    return {
      items: itemsForWorkout
    };
  }

  // Interface: updateWorkoutTotalDuration
  updateWorkoutTotalDuration(workoutId, totalDurationMinutes) {
    var workouts = this._getFromStorage('workouts');
    var workout = this._findById(workouts, workoutId);
    if (!workout) {
      return { workout: null };
    }
    workout.total_duration_minutes = totalDurationMinutes;
    this._saveToStorage('workouts', workouts);
    return {
      workout: workout
    };
  }

  // Interface: finalizeCustomWorkout
  finalizeCustomWorkout(workoutId) {
    var workouts = this._getFromStorage('workouts');
    var workout = this._findById(workouts, workoutId);
    if (!workout) {
      return { success: false, workout: null };
    }
    return {
      success: true,
      workout: workout
    };
  }

  // Interface: getMealPlanFilterOptions
  getMealPlanFilterOptions() {
    var mealPlans = this._getFromStorage('meal_plans');
    var minCal = null;
    var maxCal = null;
    for (var i = 0; i < mealPlans.length; i++) {
      var p = mealPlans[i];
      if (typeof p.daily_calories_min === 'number') {
        if (minCal === null || p.daily_calories_min < minCal) minCal = p.daily_calories_min;
      }
      if (typeof p.daily_calories_max === 'number') {
        if (maxCal === null || p.daily_calories_max > maxCal) maxCal = p.daily_calories_max;
      }
    }
    if (minCal === null) minCal = 0;
    if (maxCal === null) maxCal = 0;

    var dietTypes = [
      { value: 'vegetarian', label: 'Vegetarian' },
      { value: 'vegan', label: 'Vegan' },
      { value: 'omnivore', label: 'Omnivore' },
      { value: 'keto', label: 'Keto' },
      { value: 'paleo', label: 'Paleo' },
      { value: 'other', label: 'Other' }
    ];

    var sortOptions = [
      { value: 'popularity_desc', label: 'Most Popular' }
    ];

    return {
      dietTypes: dietTypes,
      calorieRange: { min: minCal, max: maxCal },
      sortOptions: sortOptions
    };
  }

  // Interface: searchMealPlans
  searchMealPlans(filters, sortBy, page, pageSize) {
    var mealPlans = this._getFromStorage('meal_plans');
    filters = filters || {};
    sortBy = sortBy || 'popularity_desc';
    page = page || 1;
    pageSize = pageSize || 20;

    var results = [];
    var i;
    for (i = 0; i < mealPlans.length; i++) {
      var p = mealPlans[i];
      if (filters.dietType && p.diet_type !== filters.dietType) continue;
      if (typeof filters.minDailyCalories === 'number' && p.daily_calories_min < filters.minDailyCalories) continue;
      if (typeof filters.maxDailyCalories === 'number' && p.daily_calories_max > filters.maxDailyCalories) continue;
      if (filters.status && p.status !== filters.status) continue;
      results.push(p);
    }

    results.sort(function (a, b) {
      if (sortBy === 'popularity_desc') {
        return (b.popularity_score || 0) - (a.popularity_score || 0);
      }
      return 0;
    });

    var total = results.length;
    var start = (page - 1) * pageSize;
    var end = start + pageSize;
    var paged = results.slice(start, end);

    return {
      results: paged,
      total: total,
      page: page,
      pageSize: pageSize
    };
  }

  // Interface: getMealPlanDetailWithRecipes
  getMealPlanDetailWithRecipes(mealPlanId) {
    var mealPlans = this._getFromStorage('meal_plans');
    var mealPlanRecipes = this._getFromStorage('meal_plan_recipes');
    var recipes = this._getFromStorage('recipes');
    var mealPlan = this._findById(mealPlans, mealPlanId);
    var grouped = {
      breakfast: [],
      lunch: [],
      dinner: [],
      snack: []
    };
    var filtered = [];
    for (var i = 0; i < mealPlanRecipes.length; i++) {
      if (mealPlanRecipes[i].meal_plan_id === mealPlanId) {
        filtered.push(mealPlanRecipes[i]);
      }
    }
    filtered.sort(function (a, b) {
      return a.display_order - b.display_order;
    });
    for (i = 0; i < filtered.length; i++) {
      var mpr = filtered[i];
      var recipe = this._findById(recipes, mpr.recipe_id);
      if (!recipe) continue;
      if (!grouped[mpr.meal_type]) {
        grouped[mpr.meal_type] = [];
      }
      grouped[mpr.meal_type].push(recipe);
    }
    return {
      mealPlan: mealPlan || null,
      recipesByMealType: grouped
    };
  }

  // Interface: getWeeklyMealPlannerState
  getWeeklyMealPlannerState(weekStartDate) {
    var planner = this._getOrCreateWeeklyMealPlan(weekStartDate);
    var assignments = planner.assignments;
    var recipes = this._getFromStorage('recipes');
    var resultAssignments = [];
    for (var i = 0; i < assignments.length; i++) {
      var a = assignments[i];
      var recipe = this._findById(recipes, a.recipe_id);
      resultAssignments.push({
        assignment: a,
        recipe: recipe || null
      });
    }
    return {
      weekStartDate: weekStartDate,
      assignments: resultAssignments
    };
  }

  // Interface: assignRecipeToWeeklyMealSlot
  assignRecipeToWeeklyMealSlot(weekStartDate, dayOfWeek, mealType, recipeId, mealPlanId) {
    var assignments = this._getFromStorage('weekly_meal_plan_assignments');
    var existing = null;
    var i;
    for (i = 0; i < assignments.length; i++) {
      var a = assignments[i];
      if (a.week_start_date === weekStartDate && a.day_of_week === dayOfWeek && a.meal_type === mealType) {
        existing = a;
        break;
      }
    }
    var now = this._now();
    if (existing) {
      existing.recipe_id = recipeId;
      existing.meal_plan_id = mealPlanId || null;
    } else {
      existing = {
        id: this._generateId('wmpa'),
        week_start_date: weekStartDate,
        day_of_week: dayOfWeek,
        meal_type: mealType,
        recipe_id: recipeId,
        meal_plan_id: mealPlanId || null,
        created_at: now
      };
      assignments.push(existing);
    }
    this._saveToStorage('weekly_meal_plan_assignments', assignments);

    var recipes = this._getFromStorage('recipes');
    var recipe = this._findById(recipes, recipeId);
    return {
      assignment: existing,
      recipe: recipe || null
    };
  }

  // Interface: finalizeWeeklyMealPlan
  finalizeWeeklyMealPlan(weekStartDate) {
    return {
      success: true
    };
  }

  // Interface: getFitnessProfile
  getFitnessProfile() {
    var profile = this._getFitnessProfileSingleton();
    return {
      profile: profile
    };
  }

  // Interface: updateFitnessProfile
  updateFitnessProfile(currentWeight, goalWeight, weightUnit, goalDurationWeeks, goalTags) {
    var profile = this._getFitnessProfileSingleton();
    var now = this._now();
    if (!profile) {
      profile = {
        id: 'fitness_profile_singleton',
        current_weight: currentWeight,
        goal_weight: goalWeight,
        weight_unit: weightUnit,
        goal_duration_weeks: goalDurationWeeks,
        goal_start_date: now,
        goal_tags: goalTags || [],
        last_updated_at: now
      };
    } else {
      profile.current_weight = currentWeight;
      profile.goal_weight = goalWeight;
      profile.weight_unit = weightUnit;
      profile.goal_duration_weeks = goalDurationWeeks;
      profile.goal_tags = goalTags || [];
      if (!profile.goal_start_date) {
        profile.goal_start_date = now;
      }
      profile.last_updated_at = now;
    }
    this._saveFitnessProfileSingleton(profile);
    return {
      profile: profile
    };
  }

  // Interface: getWorkoutLogHistory
  getWorkoutLogHistory(dateFrom, dateTo) {
    var entries = this._getFromStorage('workout_log_entries');
    var workouts = this._getFromStorage('workouts');
    var filtered = [];
    var i;
    for (i = 0; i < entries.length; i++) {
      var e = entries[i];
      var dateStr = e.date.slice(0, 10);
      if (dateFrom && dateStr < dateFrom) continue;
      if (dateTo && dateStr > dateTo) continue;
      filtered.push(e);
    }
    filtered.sort(function (a, b) {
      return b.date.localeCompare(a.date);
    });
    var resolved = [];
    for (i = 0; i < filtered.length; i++) {
      var entry = filtered[i];
      var workout = entry.workout_id ? this._findById(workouts, entry.workout_id) : null;
      resolved.push(Object.assign({}, entry, { workout: workout || null }));
    }
    return {
      entries: resolved
    };
  }

  // Interface: logWorkoutEntry
  logWorkoutEntry(date, workoutId, workoutName, durationMinutes, caloriesBurned, notes) {
    var entries = this._getFromStorage('workout_log_entries');
    var entry = {
      id: this._generateId('wlog'),
      date: date,
      workout_id: workoutId || null,
      workout_name: workoutName,
      duration_minutes: durationMinutes,
      calories_burned: caloriesBurned,
      notes: notes || '',
      created_at: this._now()
    };
    entries.push(entry);
    this._saveToStorage('workout_log_entries', entries);
    return {
      entry: entry
    };
  }

  // Interface: updateWorkoutLogEntry
  updateWorkoutLogEntry(entryId, durationMinutes, caloriesBurned, notes) {
    var entries = this._getFromStorage('workout_log_entries');
    var entry = this._findById(entries, entryId);
    if (!entry) {
      return { entry: null };
    }
    if (typeof durationMinutes === 'number') {
      entry.duration_minutes = durationMinutes;
    }
    if (typeof caloriesBurned === 'number') {
      entry.calories_burned = caloriesBurned;
    }
    if (typeof notes === 'string') {
      entry.notes = notes;
    }
    this._saveToStorage('workout_log_entries', entries);
    return {
      entry: entry
    };
  }

  // Interface: deleteWorkoutLogEntry
  deleteWorkoutLogEntry(entryId) {
    var entries = this._getFromStorage('workout_log_entries');
    var index = -1;
    for (var i = 0; i < entries.length; i++) {
      if (entries[i].id === entryId) {
        index = i;
        break;
      }
    }
    if (index !== -1) {
      entries.splice(index, 1);
      this._saveToStorage('workout_log_entries', entries);
      return { success: true };
    }
    return { success: false };
  }

  // Interface: searchCommunityThreads
  searchCommunityThreads(query, filters, sortBy, page, pageSize) {
    var threads = this._getFromStorage('community_threads');
    query = query || '';
    filters = filters || {};
    sortBy = sortBy || 'most_recent';
    page = page || 1;
    pageSize = pageSize || 20;
    var q = query.trim().toLowerCase();
    var results = [];
    var i;
    for (i = 0; i < threads.length; i++) {
      var t = threads[i];
      if (q) {
        var text = (t.title || '').toLowerCase() + ' ' + (t.body || '').toLowerCase();
        var tagsText = (Array.isArray(t.tags) ? t.tags.join(' ') : '').toLowerCase();
        if (text.indexOf(q) === -1 && tagsText.indexOf(q) === -1) continue;
      }
      if (typeof filters.minReplyCount === 'number' && t.reply_count < filters.minReplyCount) continue;
      results.push(t);
    }
    results.sort(function (a, b) {
      if (sortBy === 'most_popular') {
        return (b.reply_count || 0) - (a.reply_count || 0);
      } else {
        var la = a.last_activity_at || '';
        var lb = b.last_activity_at || '';
        return lb.localeCompare(la);
      }
    });
    var total = results.length;
    var start = (page - 1) * pageSize;
    var end = start + pageSize;
    var paged = results.slice(start, end);
    return {
      results: paged,
      total: total,
      page: page,
      pageSize: pageSize
    };
  }

  // Interface: getCommunityThreadDetail
  getCommunityThreadDetail(threadId) {
    var threads = this._getFromStorage('community_threads');
    var replies = this._getFromStorage('community_replies');
    var thread = this._findById(threads, threadId);
    var threadReplies = [];
    for (var i = 0; i < replies.length; i++) {
      if (replies[i].thread_id === threadId) {
        threadReplies.push(replies[i]);
      }
    }
    threadReplies.sort(function (a, b) {
      return (a.created_at || '').localeCompare(b.created_at || '');
    });
    return {
      thread: thread || null,
      replies: threadReplies
    };
  }

  // Interface: followCommunityThread
  followCommunityThread(threadId, follow) {
    var threads = this._getFromStorage('community_threads');
    var thread = this._findById(threads, threadId);
    if (!thread) {
      return { thread: null };
    }
    thread.is_following = !!follow;
    if (follow) {
      thread.is_bookmarked = true;
    }
    this._saveToStorage('community_threads', threads);
    return {
      thread: thread
    };
  }

  // Interface: postCommunityReply
  postCommunityReply(threadId, body) {
    var threads = this._getFromStorage('community_threads');
    var thread = this._findById(threads, threadId);
    if (!thread) {
      return { reply: null, thread: null };
    }
    var replies = this._getFromStorage('community_replies');
    var now = this._now();
    var reply = {
      id: this._generateId('cr'),
      thread_id: threadId,
      body: body,
      author_display_name: 'Anonymous',
      created_at: now
    };
    replies.push(reply);
    this._saveToStorage('community_replies', replies);

    thread.reply_count = (thread.reply_count || 0) + 1;
    thread.last_activity_at = now;
    this._saveToStorage('community_threads', threads);

    return {
      reply: reply,
      thread: thread
    };
  }

  // Interface: getVideoFilterOptions
  getVideoFilterOptions() {
    var categories = [
      { value: 'hiit', label: 'HIIT' },
      { value: 'strength_training', label: 'Strength Training' },
      { value: 'yoga', label: 'Yoga' },
      { value: 'mobility', label: 'Mobility' },
      { value: 'cardio', label: 'Cardio' },
      { value: 'other', label: 'Other' }
    ];
    var durationOptions = [
      { maxMinutes: 10, label: 'Up to 10 minutes' },
      { maxMinutes: 15, label: 'Up to 15 minutes' },
      { maxMinutes: 20, label: 'Up to 20 minutes' },
      { maxMinutes: 30, label: 'Up to 30 minutes' }
    ];
    var ratingOptions = [
      { minRating: 0, label: 'All ratings' },
      { minRating: 3.0, label: '3.0+ stars' },
      { minRating: 4.0, label: '4.0+ stars' },
      { minRating: 4.5, label: '4.5+ stars' }
    ];
    var sortOptions = [
      { value: 'most_popular', label: 'Most Popular' },
      { value: 'top_rated', label: 'Top Rated' }
    ];
    return {
      categories: categories,
      durationOptions: durationOptions,
      ratingOptions: ratingOptions,
      sortOptions: sortOptions
    };
  }

  // Interface: searchVideos
  searchVideos(query, filters, sortBy, page, pageSize) {
    var videos = this._getFromStorage('videos');
    query = query || '';
    filters = filters || {};
    sortBy = sortBy || 'most_popular';
    page = page || 1;
    pageSize = pageSize || 20;
    var q = query.trim().toLowerCase();
    var results = [];
    var i;
    for (i = 0; i < videos.length; i++) {
      var v = videos[i];
      if (q) {
        var text = (v.title || '').toLowerCase() + ' ' + (v.description || '').toLowerCase();
        if (text.indexOf(q) === -1) continue;
      }
      if (filters.category && v.category !== filters.category) continue;
      if (typeof filters.maxDurationMinutes === 'number' && v.duration_minutes > filters.maxDurationMinutes) continue;
      if (typeof filters.minRating === 'number' && v.rating < filters.minRating) continue;
      results.push(v);
    }
    results.sort(function (a, b) {
      if (sortBy === 'top_rated') {
        return (b.rating || 0) - (a.rating || 0);
      } else {
        var pa = typeof a.popularity_score === 'number' ? a.popularity_score : 0;
        var pb = typeof b.popularity_score === 'number' ? b.popularity_score : 0;
        return pb - pa;
      }
    });
    var total = results.length;
    var start = (page - 1) * pageSize;
    var end = start + pageSize;
    var paged = results.slice(start, end);
    return {
      results: paged,
      total: total,
      page: page,
      pageSize: pageSize
    };
  }

  // Interface: createPlaylist
  createPlaylist(name, description) {
    var playlists = this._getFromStorage('playlists');
    var now = this._now();
    var playlist = {
      id: this._generateId('pl'),
      name: name,
      description: description || '',
      created_at: now,
      updated_at: now
    };
    playlists.push(playlist);
    this._saveToStorage('playlists', playlists);
    return {
      playlist: playlist
    };
  }

  // Interface: getPlaylistsOverview
  getPlaylistsOverview() {
    var playlists = this._getFromStorage('playlists');
    playlists.sort(function (a, b) {
      return (b.created_at || '').localeCompare(a.created_at || '');
    });
    return {
      playlists: playlists
    };
  }

  // Interface: getPlaylistDetail
  getPlaylistDetail(playlistId) {
    var playlists = this._getFromStorage('playlists');
    var playlistItems = this._getFromStorage('playlist_items');
    var videos = this._getFromStorage('videos');
    var playlist = this._findById(playlists, playlistId);
    var items = [];
    for (var i = 0; i < playlistItems.length; i++) {
      var pi = playlistItems[i];
      if (pi.playlist_id === playlistId) {
        items.push(pi);
      }
    }
    items.sort(function (a, b) {
      return a.order_index - b.order_index;
    });
    var combined = [];
    for (i = 0; i < items.length; i++) {
      var item = items[i];
      var video = this._findById(videos, item.video_id);
      combined.push({
        playlistItem: item,
        video: video || null
      });
    }
    return {
      playlist: playlist || null,
      items: combined
    };
  }

  // Interface: addVideoToPlaylist
  addVideoToPlaylist(playlistId, videoId) {
    var playlistItems = this._getFromStorage('playlist_items');
    var maxIndex = -1;
    for (var i = 0; i < playlistItems.length; i++) {
      if (playlistItems[i].playlist_id === playlistId && typeof playlistItems[i].order_index === 'number') {
        if (playlistItems[i].order_index > maxIndex) {
          maxIndex = playlistItems[i].order_index;
        }
      }
    }
    var newIndex = maxIndex + 1;
    var now = this._now();
    var item = {
      id: this._generateId('pli'),
      playlist_id: playlistId,
      video_id: videoId,
      order_index: newIndex,
      added_at: now
    };
    playlistItems.push(item);
    this._saveToStorage('playlist_items', playlistItems);
    return {
      playlistItem: item
    };
  }

  // Interface: reorderPlaylistItems
  reorderPlaylistItems(playlistId, orderedPlaylistItemIds) {
    var playlistItems = this._getFromStorage('playlist_items');
    var idToIndex = {};
    for (var i = 0; i < orderedPlaylistItemIds.length; i++) {
      idToIndex[orderedPlaylistItemIds[i]] = i;
    }
    var itemsForPlaylist = [];
    for (i = 0; i < playlistItems.length; i++) {
      var pi = playlistItems[i];
      if (pi.playlist_id === playlistId && Object.prototype.hasOwnProperty.call(idToIndex, pi.id)) {
        pi.order_index = idToIndex[pi.id];
        itemsForPlaylist.push(pi);
      }
    }
    itemsForPlaylist.sort(function (a, b) {
      return a.order_index - b.order_index;
    });
    this._saveToStorage('playlist_items', playlistItems);
    return {
      items: itemsForPlaylist
    };
  }

  // Interface: removeVideoFromPlaylist
  removeVideoFromPlaylist(playlistItemId) {
    var playlistItems = this._getFromStorage('playlist_items');
    var index = -1;
    for (var i = 0; i < playlistItems.length; i++) {
      if (playlistItems[i].id === playlistItemId) {
        index = i;
        break;
      }
    }
    if (index !== -1) {
      playlistItems.splice(index, 1);
      this._saveToStorage('playlist_items', playlistItems);
      return {
        success: true
      };
    }
    return {
      success: false
    };
  }

  // Interface: getLearningPathsOverview
  getLearningPathsOverview() {
    var learningPaths = this._getFromStorage('learning_paths');
    learningPaths.sort(function (a, b) {
      return (b.created_at || '').localeCompare(a.created_at || '');
    });
    return {
      learningPaths: learningPaths
    };
  }

  // Interface: getLearningPathDetail
  getLearningPathDetail(learningPathId) {
    var learningPaths = this._getFromStorage('learning_paths');
    var items = this._getFromStorage('learning_path_items');
    var courses = this._getFromStorage('courses');
    var path = this._findById(learningPaths, learningPathId);
    var filteredItems = [];
    for (var i = 0; i < items.length; i++) {
      if (items[i].learning_path_id === learningPathId) {
        filteredItems.push(items[i]);
      }
    }
    filteredItems.sort(function (a, b) {
      return a.order_index - b.order_index;
    });
    var combined = [];
    for (i = 0; i < filteredItems.length; i++) {
      var it = filteredItems[i];
      var course = this._findById(courses, it.course_id);
      combined.push({
        learningPathItem: it,
        course: course || null
      });
    }
    return {
      learningPath: path || null,
      items: combined
    };
  }

  // Interface: addCourseToLearningPath
  addCourseToLearningPath(courseId, learningPathId) {
    var learningPath;
    if (learningPathId) {
      var paths = this._getFromStorage('learning_paths');
      learningPath = this._findById(paths, learningPathId);
      if (!learningPath) {
        learningPath = this._getOrCreateDefaultLearningPath();
      }
    } else {
      learningPath = this._getOrCreateDefaultLearningPath();
    }
    var items = this._getFromStorage('learning_path_items');
    var maxIndex = -1;
    for (var i = 0; i < items.length; i++) {
      if (items[i].learning_path_id === learningPath.id && typeof items[i].order_index === 'number') {
        if (items[i].order_index > maxIndex) maxIndex = items[i].order_index;
      }
    }
    var now = this._now();
    var item = {
      id: this._generateId('lpi'),
      learning_path_id: learningPath.id,
      course_id: courseId,
      order_index: maxIndex + 1,
      added_at: now
    };
    items.push(item);
    this._saveToStorage('learning_path_items', items);
    return {
      learningPath: learningPath,
      item: item
    };
  }

  // Interface: removeCourseFromLearningPath
  removeCourseFromLearningPath(learningPathItemId) {
    var items = this._getFromStorage('learning_path_items');
    var index = -1;
    for (var i = 0; i < items.length; i++) {
      if (items[i].id === learningPathItemId) {
        index = i;
        break;
      }
    }
    if (index !== -1) {
      items.splice(index, 1);
      this._saveToStorage('learning_path_items', items);
      return { success: true };
    }
    return { success: false };
  }

  // Interface: reorderLearningPathItems
  reorderLearningPathItems(learningPathId, orderedLearningPathItemIds) {
    var items = this._getFromStorage('learning_path_items');
    var idToIndex = {};
    for (var i = 0; i < orderedLearningPathItemIds.length; i++) {
      idToIndex[orderedLearningPathItemIds[i]] = i;
    }
    var itemsForPath = [];
    for (i = 0; i < items.length; i++) {
      var it = items[i];
      if (it.learning_path_id === learningPathId && Object.prototype.hasOwnProperty.call(idToIndex, it.id)) {
        it.order_index = idToIndex[it.id];
        itemsForPath.push(it);
      }
    }
    itemsForPath.sort(function (a, b) {
      return a.order_index - b.order_index;
    });
    this._saveToStorage('learning_path_items', items);
    return {
      items: itemsForPath
    };
  }

  // Interface: getAboutAndSupportContent
  getAboutAndSupportContent() {
    var aboutText = 'This platform helps you combine workouts, courses, and nutrition into a single simple plan.';
    var coachingPhilosophy = 'We focus on sustainable progress with safe, scalable training and practical nutrition.';
    var coaches = [
      {
        name: 'Coach Alex',
        bio: 'Strength and conditioning specialist with experience coaching beginners to advanced athletes.',
        credentials: 'CSCS, ACE-CPT'
      },
      {
        name: 'Coach Mia',
        bio: 'Nutrition coach focusing on simple, habit-based strategies.',
        credentials: 'RD, Precision Nutrition L1'
      }
    ];
    var faqEntries = [
      {
        question: 'Can I follow both workout and nutrition plans here?',
        answer: 'Yes. You can enroll in courses, schedule workouts, and follow meal plans all in one place.'
      },
      {
        question: 'Do I need equipment?',
        answer: 'Many of our programs are bodyweight-only. Equipment-based options are clearly labeled.'
      }
    ];
    var contactEmail = 'support@example.com';
    var legalSections = [
      {
        type: 'terms',
        title: 'Terms of Service',
        summary: 'Use this site at your own risk and consult a physician before beginning any exercise program.'
      },
      {
        type: 'privacy',
        title: 'Privacy Policy',
        summary: 'We store only the data needed to run your account and never sell your personal information.'
      }
    ];
    return {
      aboutText: aboutText,
      coachingPhilosophy: coachingPhilosophy,
      coaches: coaches,
      faqEntries: faqEntries,
      contactEmail: contactEmail,
      legalSections: legalSections
    };
  }

  // Interface: submitSupportRequest
  submitSupportRequest(name, email, subject, message) {
    var requests = this._getFromStorage('support_requests');
    var id = this._generateId('ticket');
    var now = this._now();
    var ticket = {
      id: id,
      name: name,
      email: email,
      subject: subject,
      message: message,
      status: 'open',
      created_at: now
    };
    requests.push(ticket);
    this._saveToStorage('support_requests', requests);
    return {
      success: true,
      ticketId: id,
      message: 'Support request submitted'
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
