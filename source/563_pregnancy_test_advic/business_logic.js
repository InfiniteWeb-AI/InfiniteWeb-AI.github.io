/*
  Pregnancy Test Advice & Information Website Business Logic
  - Uses localStorage (with Node-compatible polyfill)
  - No DOM/window/document usage except for attaching global in browser
  - All persistence via JSON-serializable data in localStorage
*/

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

  // ------------------------------
  // Storage initialization & utils
  // ------------------------------

  _initStorage() {
    const arrayKeys = [
      'users',                // legacy / unused but kept for compatibility
      'products',
      'brands',
      'product_comparisons',
      'favorite_products',
      'articles',
      'bookmarked_articles',
      'testing_plans',
      'reminders',
      'planner_settings',
      'symptom_checker_sessions',
      'qna_questions',
      'qna_answers',
      'stores',
      'store_inventories',
      'contact_messages'
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

  _getFromStorage(key, defaultValue = []) {
    const raw = localStorage.getItem(key);
    if (!raw) return defaultValue;
    try {
      return JSON.parse(raw);
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

  _addDays(date, days) {
    const d = new Date(date.getTime());
    d.setDate(d.getDate() + days);
    return d;
  }

  _toIsoDate(date) {
    return date.toISOString().slice(0, 10); // YYYY-MM-DD
  }

  // ------------------------------
  // Helper functions (private)
  // ------------------------------

  // Product comparison helper
  _getOrCreateComparisonSet() {
    const comparisons = this._getFromStorage('product_comparisons', []);
    let comparison = comparisons[0] || null;
    if (!comparison) {
      const now = new Date().toISOString();
      comparison = {
        id: this._generateId('comparison'),
        product_ids: [],
        created_at: now
      };
      comparisons.push(comparison);
      this._saveToStorage('product_comparisons', comparisons);
    }
    return { comparison, comparisons };
  }

  // Favorites helpers
  _getFavoriteProductIds() {
    const favorites = this._getFromStorage('favorite_products', []);
    return favorites.map((f) => f.product_id);
  }

  _persistFavoriteProductIds(productIds) {
    const existing = this._getFromStorage('favorite_products', []);
    const existingByProductId = {};
    existing.forEach((f) => {
      existingByProductId[f.product_id] = f;
    });
    const now = new Date().toISOString();
    const newFavorites = [];
    productIds.forEach((pid) => {
      let fav = existingByProductId[pid];
      if (!fav) {
        fav = {
          id: this._generateId('favorite'),
          product_id: pid,
          favorited_at: now
        };
      }
      newFavorites.push(fav);
    });
    this._saveToStorage('favorite_products', newFavorites);
  }

  // Bookmarks helper
  _getBookmarkedArticleIds() {
    const bookmarks = this._getFromStorage('bookmarked_articles', []);
    return bookmarks.map((b) => b.article_id);
  }

  // Planner settings helper
  _getOrCreatePlannerSettings() {
    const all = this._getFromStorage('planner_settings', []);
    let settings = all[0] || null;
    const now = new Date().toISOString();
    if (!settings) {
      settings = {
        id: this._generateId('planner_settings'),
        default_view_mode: 'week',
        created_at: now,
        updated_at: now
      };
      all.push(settings);
      this._saveToStorage('planner_settings', all);
    }
    return { settings, allSettings: all };
  }

  // When-to-test calculation helper
  _computeRecommendedTestDateFromCycle(lastPeriodDateIso, cycleLengthDays, reasonForTesting) {
    const msPerDay = 24 * 60 * 60 * 1000;
    const lastPeriodDate = new Date(lastPeriodDateIso);
    if (isNaN(lastPeriodDate.getTime())) {
      throw new Error('Invalid last_period_date');
    }

    const expectedPeriod = new Date(lastPeriodDate.getTime() + cycleLengthDays * msPerDay);
    let mainRecommendation = expectedPeriod;

    let interpretation = '';
    if (reasonForTesting === 'trying_to_conceive') {
      interpretation = 'With a roughly ' + cycleLengthDays + '-day cycle, most people can get a reliable result by testing on or after the day their period is due.';
    } else if (reasonForTesting === 'missed_period') {
      interpretation = 'Because your period timing is your main concern, testing around the day your period is due usually gives the clearest answer.';
    } else if (reasonForTesting === 'confirm_pregnancy') {
      interpretation = 'To confirm a suspected pregnancy, testing on or after the expected period date is recommended for the most accurate result.';
    } else if (reasonForTesting === 'fertility_treatment') {
      interpretation = 'After fertility treatment, testing too early can pick up medication hormones. Waiting until around your expected period helps avoid false positives.';
    } else {
      interpretation = 'In most cycles, home pregnancy tests are more reliable on or after the day your period is due.';
    }

    const additional1 = new Date(mainRecommendation.getTime() + 2 * msPerDay);
    const additional2 = new Date(mainRecommendation.getTime() + 7 * msPerDay);

    const notes = 'If you test on the recommended date and the result is negative but your period still has not started, you can repeat the test in 2–3 days. A blood test or a visit with a clinician can provide more definite answers.';

    return {
      recommendedDate: this._toIsoDate(mainRecommendation),
      additionalDates: [this._toIsoDate(additional1), this._toIsoDate(additional2)],
      interpretation,
      notes
    };
  }

  // Symptom checker recommendation helper
  _computeSymptomCheckerRecommendation(late_days, nausea_level, breast_tenderness_level, other_symptoms) {
    let recommended_action = 'wait_few_days';
    let recommended_test_timing = '';
    let explanation = '';

    const hasSymptoms = (nausea_level && nausea_level !== 'none') || (breast_tenderness_level && breast_tenderness_level !== 'none') || (other_symptoms && other_symptoms.length > 0);

    if (late_days <= 0) {
      recommended_action = 'wait_few_days';
      recommended_test_timing = 'Wait until at least the day your period is due before taking a home pregnancy test.';
      explanation = 'Most tests are designed to be used on or after the expected period date. Testing earlier can give false negatives even if pregnancy is starting.';
    } else if (late_days >= 1 && late_days <= 4) {
      recommended_action = 'test_now';
      recommended_test_timing = 'You are a few days late; using a sensitive home pregnancy test now, preferably with first-morning urine, is reasonable.';
      explanation = 'By 1–4 days after a missed period, many pregnancies will produce enough hCG to be detected. If you get a negative result but your period does not arrive, repeat the test in 2–3 days.';
    } else if (late_days >= 5 && late_days <= 7) {
      recommended_action = 'test_now';
      recommended_test_timing = 'You are about a week late; test now and consider repeating in a couple of days if the result is negative.';
      explanation = 'Most pregnancies will be detectable by this point. Persistent symptoms with negative tests may be a reason to speak with a clinician.';
    } else if (late_days > 7 && hasSymptoms) {
      recommended_action = 'see_doctor';
      recommended_test_timing = 'Test now if you have not already, and arrange a visit with a clinician as soon as practical.';
      explanation = 'Being more than a week late with pregnancy-type symptoms and negative tests deserves a professional assessment to rule out pregnancy or other causes.';
    } else {
      recommended_action = 'see_doctor';
      recommended_test_timing = 'Consider scheduling a visit with a clinician to discuss your cycle and symptoms.';
      explanation = 'Significant cycle changes, even without strong pregnancy symptoms, can have many causes. A clinician can help decide whether blood tests or further evaluation are needed.';
    }

    return { recommended_action, recommended_test_timing, explanation };
  }

  // Store search helper (very simple, uses existing data only)
  _geocodeZipAndSearchNearbyStores(zip_code, radius_miles) {
    const stores = this._getFromStorage('stores', []);
    // We do NOT call external geocoding; we only use stored zip_code and distance_miles if present.
    let filtered = stores.filter((s) => s.zip_code === zip_code);
    if (typeof radius_miles === 'number') {
      filtered = filtered.filter((s) => {
        if (typeof s.distance_miles === 'number') {
          return s.distance_miles <= radius_miles;
        }
        // If no distance data, keep it (cannot reliably exclude)
        return true;
      });
    }
    return filtered;
  }

  // Saved items aggregation helper
  _aggregateSavedItems() {
    const testing_plans = this._getFromStorage('testing_plans', []);
    const favorite_products = this.getFavoriteProducts();
    const bookmarked_articles = this.getBookmarkedArticles();
    const reminders = this._getFromStorage('reminders', []);

    const now = new Date();
    const weekFromNow = this._addDays(now, 7);

    const upcoming_reminders = reminders
      .filter((r) => {
        if (!r.reminder_datetime) return false;
        const dt = new Date(r.reminder_datetime);
        if (isNaN(dt.getTime())) return false;
        return (
          r.status === 'pending' &&
          dt.getTime() >= now.getTime() &&
          dt.getTime() <= weekFromNow.getTime()
        );
      })
      .map((r) => {
        const plan = testing_plans.find((p) => p.id === r.plan_id) || null;
        return { ...r, plan };
      });

    return { testing_plans, favorite_products, bookmarked_articles, upcoming_reminders };
  }

  // Attach related articles based on related_article_ids
  _attachRelatedArticles(article, allArticles) {
    const relatedIds = article.related_article_ids || [];
    const related_articles = relatedIds
      .map((id) => allArticles.find((a) => a.id === id))
      .filter((a) => !!a);
    return { ...article, related_articles };
  }

  // Attach brand to product
  _attachBrandToProduct(product, brands) {
    const brand = brands.find((b) => b.id === product.brand_id) || null;
    return { ...product, brand };
  }

  // ------------------------------
  // Core interface implementations
  // ------------------------------

  // 1) Homepage highlights
  getHomepageHighlights() {
    const products = this._getFromStorage('products', []);
    const brands = this._getFromStorage('brands', []);
    const articles = this._getFromStorage('articles', []);
    const questions = this._getFromStorage('qna_questions', []);
    const answers = this._getFromStorage('qna_answers', []);

    // Featured products: top rated active products
    const activeProducts = products.filter((p) => p.is_active !== false);
    activeProducts.sort((a, b) => {
      const ra = typeof a.rating_average === 'number' ? a.rating_average : 0;
      const rb = typeof b.rating_average === 'number' ? b.rating_average : 0;
      if (rb !== ra) return rb - ra;
      const ca = typeof a.rating_count === 'number' ? a.rating_count : 0;
      const cb = typeof b.rating_count === 'number' ? b.rating_count : 0;
      return cb - ca;
    });
    const featured_products = activeProducts.slice(0, 3).map((p) => this._attachBrandToProduct(p, brands));

    // Featured articles: is_featured first, then newest
    const featuredFlagged = articles.filter((a) => a.is_featured === true);
    const nonFeatured = articles.filter((a) => !a.is_featured);
    nonFeatured.sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime());
    let combinedArticles = featuredFlagged.concat(nonFeatured);
    const featured_articles = combinedArticles.slice(0, 3).map((a) => this._attachRelatedArticles(a, articles));

    // Featured questions: based on recent activity and number of answers
    const questionsWithStats = questions.map((q) => {
      const qAnswers = answers.filter((ans) => ans.question_id === q.id && ans.status === 'visible');
      const num_answers = qAnswers.length;
      let last_activity_at = q.last_activity_at || q.created_at;
      qAnswers.forEach((ans) => {
        if (ans.created_at && new Date(ans.created_at).getTime() > new Date(last_activity_at).getTime()) {
          last_activity_at = ans.created_at;
        }
      });
      return { ...q, num_answers, last_activity_at };
    });

    questionsWithStats.sort((a, b) => {
      const la = new Date(a.last_activity_at || a.created_at).getTime();
      const lb = new Date(b.last_activity_at || b.created_at).getTime();
      if (lb !== la) return lb - la;
      const na = typeof a.num_answers === 'number' ? a.num_answers : 0;
      const nb = typeof b.num_answers === 'number' ? b.num_answers : 0;
      return nb - na;
    });

    const featured_questions = questionsWithStats.slice(0, 3);

    const aggregated = this._aggregateSavedItems();

    const saved_items_summary = {
      testing_plans_count: aggregated.testing_plans.length,
      favorite_products_count: aggregated.favorite_products.length,
      bookmarked_articles_count: aggregated.bookmarked_articles.length,
      upcoming_reminders_count: aggregated.upcoming_reminders.length
    };

    return {
      featured_products,
      featured_articles,
      featured_questions,
      saved_items_summary
    };
  }

  // 2) Tools overview
  getToolsOverview() {
    return [
      {
        tool_id: 'when_to_test_calculator',
        name: 'When to Take a Pregnancy Test',
        short_description: 'Use your last period date and cycle length to find the most reliable test day.',
        primary_action_label: 'Open calculator',
        icon_name: 'calendar-check'
      },
      {
        tool_id: 'symptom_checker',
        name: 'Pregnancy Symptom Checker',
        short_description: 'Answer a few questions about your cycle and symptoms to see when to test.',
        primary_action_label: 'Start checker',
        icon_name: 'stethoscope'
      },
      {
        tool_id: 'testing_planner',
        name: 'Testing Planner & Reminders',
        short_description: 'Schedule reminders for multi-step testing plans over the coming days.',
        primary_action_label: 'Open planner',
        icon_name: 'alarm-clock'
      },
      {
        tool_id: 'store_locator',
        name: 'Where to Buy Tests Nearby',
        short_description: 'Find pharmacies near you that carry specific pregnancy test brands.',
        primary_action_label: 'Find a store',
        icon_name: 'map-pin'
      }
    ];
  }

  // 3) When-to-test calculator config
  getWhenToTestCalculatorConfig() {
    const today = new Date();
    const todayStr = this._toIsoDate(today);
    const minLastPeriodDate = this._toIsoDate(this._addDays(today, -365));
    const maxLastPeriodDate = todayStr;

    return {
      today_date: todayStr,
      min_cycle_length_days: 21,
      max_cycle_length_days: 45,
      default_cycle_length_days: 28,
      min_last_period_date: minLastPeriodDate,
      max_last_period_date: maxLastPeriodDate,
      reason_for_testing_options: [
        {
          value: 'trying_to_conceive',
          label: 'Trying to conceive',
          description: 'You are actively trying to get pregnant and want to know when to test.'
        },
        {
          value: 'missed_period',
          label: 'Missed or late period',
          description: 'Your period is late or has not arrived when expected.'
        },
        {
          value: 'confirm_pregnancy',
          label: 'Confirm a suspected pregnancy',
          description: 'You have signs of pregnancy and want to confirm with a test.'
        },
        {
          value: 'fertility_treatment',
          label: 'After fertility treatment',
          description: 'You recently had fertility treatment and want to avoid testing too early.'
        },
        {
          value: 'other',
          label: 'Other reasons',
          description: 'Any other reason you are considering taking a pregnancy test.'
        }
      ]
    };
  }

  // 4) When-to-test calculation
  calculateWhenToTest(last_period_date, cycle_length_days, reason_for_testing) {
    const allArticles = this._getFromStorage('articles', []);
    const calc = this._computeRecommendedTestDateFromCycle(last_period_date, cycle_length_days, reason_for_testing);

    // Find related articles: focus on test timing topics
    const related_articles_raw = allArticles
      .filter((a) => {
        const title = (a.title || '').toLowerCase();
        const keywords = (a.keywords || []).map((k) => (k || '').toLowerCase());
        const inCategory = a.category_id === 'test_results' || a.category_id === 'understanding_results';
        const mentionsWhenToTest =
          title.includes('when to take a pregnancy test') ||
          title.includes('when to test') ||
          keywords.some((k) => k.includes('when to test') || k.includes('pregnancy test timing'));
        return inCategory && mentionsWhenToTest;
      })
      .slice(0, 3)
      .map((a) => this._attachRelatedArticles(a, allArticles));

    return {
      recommended_test_date: calc.recommendedDate,
      additional_recommended_dates: calc.additionalDates,
      interpretation: calc.interpretation,
      notes: calc.notes,
      related_articles: related_articles_raw
    };
  }

  // 5) Save testing plan from calculator
  saveTestingPlanFromCalculator(plan_name, last_period_date, cycle_length_days, reason_for_testing, recommended_test_date, notes) {
    const plans = this._getFromStorage('testing_plans', []);
    const now = new Date().toISOString();

    const plan = {
      id: this._generateId('testing_plan'),
      name: plan_name || 'When to test plan',
      source: 'calculator_when_to_test',
      created_at: now,
      last_period_date,
      cycle_length_days,
      reason_for_testing: reason_for_testing || null,
      recommended_test_date,
      notes: notes || null,
      status: 'active'
    };

    plans.push(plan);
    this._saveToStorage('testing_plans', plans);

    return {
      success: true,
      testing_plan_id: plan.id,
      message: 'Testing plan saved successfully.'
    };
  }

  // 6) Symptom checker config
  getSymptomCheckerConfig() {
    return {
      max_late_days: 21,
      late_day_buckets: [
        { min_days: 0, max_days: 0, label: 'Period not late yet' },
        { min_days: 1, max_days: 3, label: '1–3 days late' },
        { min_days: 4, max_days: 7, label: '4–7 days late' },
        { min_days: 8, max_days: 14, label: '8–14 days late' },
        { min_days: 15, max_days: 21, label: 'More than 2 weeks late' }
      ],
      nausea_levels: [
        { value: 'none', label: 'No nausea' },
        { value: 'mild', label: 'Mild or occasional nausea' },
        { value: 'moderate', label: 'Moderate nausea' },
        { value: 'severe', label: 'Severe or frequent nausea' }
      ],
      breast_tenderness_levels: [
        { value: 'none', label: 'No breast tenderness' },
        { value: 'mild', label: 'Mild tenderness' },
        { value: 'moderate', label: 'Moderate tenderness' },
        { value: 'severe', label: 'Severe tenderness or pain' }
      ],
      other_symptom_suggestions: [
        'Fatigue or feeling unusually tired',
        'More frequent urination',
        'Spotting or light bleeding',
        'Mild cramping',
        'Food aversions or changes in appetite'
      ]
    };
  }

  // 7) Complete symptom checker
  completeSymptomChecker(late_days, nausea_level, breast_tenderness_level, other_symptoms) {
    const articles = this._getFromStorage('articles', []);
    const other = other_symptoms || [];

    const recommendation = this._computeSymptomCheckerRecommendation(
      late_days,
      nausea_level,
      breast_tenderness_level,
      other
    );

    // Recommended articles: focus on when-to-test / missed period topics
    const recommended_articles_raw = articles
      .filter((a) => {
        const title = (a.title || '').toLowerCase();
        const keywords = (a.keywords || []).map((k) => (k || '').toLowerCase());
        const categoryMatch = a.category_id === 'test_results' || a.category_id === 'understanding_results';
        const mentions =
          title.includes('when to take a pregnancy test') ||
          title.includes('when to test') ||
          title.includes('missed period') ||
          keywords.some(
            (k) =>
              k.includes('when to test') ||
              k.includes('pregnancy test timing') ||
              k.includes('missed period')
          );
        return categoryMatch && mentions;
      })
      .slice(0, 3)
      .map((a) => this._attachRelatedArticles(a, articles));

    const recommended_article_ids = recommended_articles_raw.map((a) => a.id);

    // Persist symptom checker session
    const sessions = this._getFromStorage('symptom_checker_sessions', []);
    const now = new Date().toISOString();
    const session = {
      id: this._generateId('symptom_session'),
      started_at: now,
      completed_at: now,
      late_days,
      nausea_level: nausea_level || null,
      breast_tenderness_level: breast_tenderness_level || null,
      other_symptoms: other,
      recommended_action: recommendation.recommended_action,
      recommended_test_timing: recommendation.recommended_test_timing,
      recommended_article_ids
    };
    sessions.push(session);
    this._saveToStorage('symptom_checker_sessions', sessions);

    return {
      recommended_action: recommendation.recommended_action,
      recommended_test_timing: recommendation.recommended_test_timing,
      explanation: recommendation.explanation,
      recommended_articles: recommended_articles_raw
    };
  }

  // 8) Products filter options
  getProductsFilterOptions() {
    const products = this._getFromStorage('products', []);
    const brands = this._getFromStorage('brands', []);

    let min_price = 0;
    let max_price = 0;
    let currency = 'USD';
    if (products.length > 0) {
      min_price = products.reduce(
        (min, p) => (typeof p.price === 'number' && p.price < min ? p.price : min),
        products[0].price || 0
      );
      max_price = products.reduce(
        (max, p) => (typeof p.price === 'number' && p.price > max ? p.price : max),
        products[0].price || 0
      );
      currency = products[0].currency || 'USD';
    }

    const types = [
      { value: 'digital', label: 'Digital tests' },
      { value: 'strip', label: 'Strip tests' },
      { value: 'midstream', label: 'Midstream tests' },
      { value: 'cassette', label: 'Cassette tests' }
    ];

    // Collect unique features
    const featureSet = new Set();
    products.forEach((p) => {
      (p.features || []).forEach((f) => {
        if (f) featureSet.add(f);
      });
    });
    const features = Array.from(featureSet);

    const rating_thresholds = [3, 3.5, 4, 4.5];

    return {
      price: {
        min_price,
        max_price,
        currency
      },
      rating_thresholds,
      types,
      features,
      brands,
      default_sort: 'best_match'
    };
  }

  // 9) Search products
  searchProducts(query, filters, sort, page, page_size) {
    const allProducts = this._getFromStorage('products', []);
    const brands = this._getFromStorage('brands', []);
    const brandMap = {};
    brands.forEach((b) => {
      brandMap[b.id] = b;
    });

    const q = (query || '').trim().toLowerCase();
    const f = filters || {};
    const min_price = typeof f.min_price === 'number' ? f.min_price : null;
    const max_price = typeof f.max_price === 'number' ? f.max_price : null;
    const min_rating = typeof f.min_rating === 'number' ? f.min_rating : null;
    const types = Array.isArray(f.types) ? f.types : null;
    const early_detection_only = f.early_detection_only === true;
    const brand_ids = Array.isArray(f.brand_ids) ? f.brand_ids : null;

    let results = allProducts.filter((p) => p.is_active !== false);

    if (q) {
      results = results.filter((p) => {
        const name = (p.name || '').toLowerCase();
        const description = (p.description || '').toLowerCase();
        const brandName = brandMap[p.brand_id] ? (brandMap[p.brand_id].name || '').toLowerCase() : '';
        const tokens = q.split(/\s+/).filter(Boolean);
        const matchesFull = name.includes(q) || description.includes(q) || brandName.includes(q);
        const matchesTokens = tokens.some((tok) => {
          return name.includes(tok) || description.includes(tok) || brandName.includes(tok);
        });
        return matchesFull || matchesTokens;
      });
    }

    if (min_price !== null) {
      results = results.filter((p) => typeof p.price === 'number' && p.price >= min_price);
    }
    if (max_price !== null) {
      results = results.filter((p) => typeof p.price === 'number' && p.price <= max_price);
    }

    if (min_rating !== null) {
      results = results.filter((p) => (typeof p.rating_average === 'number' ? p.rating_average : 0) >= min_rating);
    }

    if (types && types.length > 0) {
      results = results.filter((p) => types.includes(p.type));
    }

    if (early_detection_only) {
      results = results.filter((p) => p.early_detection === true || (p.features || []).some((fstr) => (fstr || '').toLowerCase().includes('early detection')));
    }

    if (brand_ids && brand_ids.length > 0) {
      results = results.filter((p) => brand_ids.includes(p.brand_id));
    }

    const sortKey = sort || 'best_match';
    if (sortKey === 'price_low_to_high') {
      results.sort((a, b) => (a.price || 0) - (b.price || 0));
    } else if (sortKey === 'price_high_to_low') {
      results.sort((a, b) => (b.price || 0) - (a.price || 0));
    } else if (sortKey === 'rating_high_to_low') {
      results.sort((a, b) => {
        const ra = typeof a.rating_average === 'number' ? a.rating_average : 0;
        const rb = typeof b.rating_average === 'number' ? b.rating_average : 0;
        if (rb !== ra) return rb - ra;
        const ca = typeof a.rating_count === 'number' ? a.rating_count : 0;
        const cb = typeof b.rating_count === 'number' ? b.rating_count : 0;
        return cb - ca;
      });
    } else if (sortKey === 'rating_low_to_high') {
      results.sort((a, b) => {
        const ra = typeof a.rating_average === 'number' ? a.rating_average : 0;
        const rb = typeof b.rating_average === 'number' ? b.rating_average : 0;
        return ra - rb;
      });
    } // 'best_match' leaves order as-is

    const currentPage = page && page > 0 ? page : 1;
    const size = page_size && page_size > 0 ? page_size : 20;
    const total_count = results.length;
    const start = (currentPage - 1) * size;
    const end = start + size;

    const pageItems = results.slice(start, end).map((p) => this._attachBrandToProduct(p, brands));

    return {
      products: pageItems,
      total_count,
      page: currentPage,
      page_size: size
    };
  }

  // 10) Product details
  getProductDetails(productId) {
    const products = this._getFromStorage('products', []);
    const brands = this._getFromStorage('brands', []);
    const favorites = this._getFromStorage('favorite_products', []);
    const { comparison } = this._getOrCreateComparisonSet();

    const product = products.find((p) => p.id === productId) || null;
    if (!product) {
      return {
        product: null,
        brand: null,
        is_favorited: false,
        is_in_comparison: false
      };
    }

    const brand = brands.find((b) => b.id === product.brand_id) || null;
    const is_favorited = favorites.some((f) => f.product_id === productId);
    const is_in_comparison = comparison.product_ids.includes(productId);

    const productWithBrand = { ...product, brand };

    return {
      product: productWithBrand,
      brand,
      is_favorited,
      is_in_comparison
    };
  }

  // 11) Add product to comparison
  addProductToComparison(productId) {
    const products = this._getFromStorage('products', []);
    const product = products.find((p) => p.id === productId);
    if (!product) {
      return {
        success: false,
        comparison_id: null,
        product_ids: [],
        message: 'Product not found.'
      };
    }

    const { comparison, comparisons } = this._getOrCreateComparisonSet();
    if (!comparison.product_ids.includes(productId)) {
      comparison.product_ids.push(productId);
      this._saveToStorage('product_comparisons', comparisons);
    }

    return {
      success: true,
      comparison_id: comparison.id,
      product_ids: comparison.product_ids.slice(),
      message: 'Product added to comparison.'
    };
  }

  // 12) Remove product from comparison
  removeProductFromComparison(productId) {
    const { comparison, comparisons } = this._getOrCreateComparisonSet();
    const before = comparison.product_ids.length;
    comparison.product_ids = comparison.product_ids.filter((id) => id !== productId);
    const after = comparison.product_ids.length;
    this._saveToStorage('product_comparisons', comparisons);

    return {
      success: true,
      comparison_id: comparison.id,
      product_ids: comparison.product_ids.slice(),
      message: before === after ? 'Product was not in comparison.' : 'Product removed from comparison.'
    };
  }

  // 13) Get current product comparison
  getCurrentProductComparison() {
    const { comparison } = this._getOrCreateComparisonSet();
    const products = this._getFromStorage('products', []);
    const brands = this._getFromStorage('brands', []);

    const comparisonProducts = comparison.product_ids
      .map((id) => products.find((p) => p.id === id))
      .filter((p) => !!p)
      .map((p) => this._attachBrandToProduct(p, brands));

    return {
      comparison_id: comparison.id,
      products: comparisonProducts
    };
  }

  // 14) Add product to favorites
  addProductToFavorites(productId) {
    const products = this._getFromStorage('products', []);
    const product = products.find((p) => p.id === productId);
    if (!product) {
      return { success: false, favorite_id: null, message: 'Product not found.' };
    }

    const currentIds = this._getFavoriteProductIds();
    if (!currentIds.includes(productId)) {
      currentIds.push(productId);
      this._persistFavoriteProductIds(currentIds);
    }

    const favorites = this._getFromStorage('favorite_products', []);
    const fav = favorites.find((f) => f.product_id === productId) || null;

    return {
      success: true,
      favorite_id: fav ? fav.id : null,
      message: 'Product added to favorites.'
    };
  }

  // 15) Remove favorite product
  removeFavoriteProduct(productId) {
    const currentIds = this._getFavoriteProductIds();
    const newIds = currentIds.filter((id) => id !== productId);
    this._persistFavoriteProductIds(newIds);

    return {
      success: true,
      message: 'Product removed from favorites.'
    };
  }

  // 16) Get favorite products (with brand)
  getFavoriteProducts() {
    const favorites = this._getFromStorage('favorite_products', []);
    const products = this._getFromStorage('products', []);
    const brands = this._getFromStorage('brands', []);

    const favoriteProducts = favorites
      .map((fav) => {
        const product = products.find((p) => p.id === fav.product_id);
        return product || null;
      })
      .filter((p) => !!p)
      .map((p) => this._attachBrandToProduct(p, brands));

    return favoriteProducts;
  }

  // 17) Articles filter options
  getArticlesFilterOptions() {
    return {
      categories: [
        { id: 'all_articles', label: 'All articles' },
        { id: 'test_results', label: 'Test results & interpretation' },
        { id: 'understanding_results', label: 'Understanding pregnancy test accuracy' }
      ],
      content_types: [
        { value: 'article', label: 'Article' },
        { value: 'guide', label: 'Guide' }
      ],
      medically_reviewed_only_default: true,
      reading_time_options: [
        { max_minutes: 5, label: 'Up to 5 minutes' },
        { max_minutes: 7, label: 'Up to 7 minutes' },
        { max_minutes: 10, label: 'Up to 10 minutes' }
      ],
      date_range_presets: [
        { value: 'last_12_months', label: 'Last 12 months' },
        { value: 'last_3_years', label: 'Last 3 years' },
        { value: 'all_time', label: 'All time' }
      ]
    };
  }

  // 18) Search articles
  searchArticles(query, filters, sort, page, page_size) {
    const allArticles = this._getFromStorage('articles', []);
    const q = (query || '').trim().toLowerCase();
    const f = filters || {};

    let results = allArticles.slice();

    if (q) {
      results = results.filter((a) => {
        const title = (a.title || '').toLowerCase();
        const summary = (a.summary || '').toLowerCase();
        const body = (a.body || '').toLowerCase();
        const tokens = q.split(/\s+/).filter(Boolean);
        const matchesFull = title.includes(q) || summary.includes(q) || body.includes(q);
        const matchesTokens = tokens.some((tok) => {
          return title.includes(tok) || summary.includes(tok) || body.includes(tok);
        });
        return matchesFull || matchesTokens;
      });
    }

    if (f.category_id && f.category_id !== 'all_articles') {
      results = results.filter((a) => a.category_id === f.category_id);
    }

    if (Array.isArray(f.content_types) && f.content_types.length > 0) {
      results = results.filter((a) => f.content_types.includes(a.content_type));
    }

    if (f.medically_reviewed_only) {
      results = results.filter((a) => a.medically_reviewed === true);
    }

    if (f.published_from) {
      const fromDate = new Date(f.published_from);
      results = results.filter((a) => new Date(a.published_at).getTime() >= fromDate.getTime());
    }

    if (f.published_to) {
      const toDate = new Date(f.published_to);
      results = results.filter((a) => new Date(a.published_at).getTime() <= toDate.getTime());
    }

    if (typeof f.max_reading_time_minutes === 'number') {
      results = results.filter(
        (a) => typeof a.reading_time_minutes === 'number' && a.reading_time_minutes <= f.max_reading_time_minutes
      );
    }

    const sortKey = sort || 'newest_first';
    if (sortKey === 'newest_first') {
      results.sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime());
    } else if (sortKey === 'oldest_first') {
      results.sort((a, b) => new Date(a.published_at).getTime() - new Date(b.published_at).getTime());
    } else if (sortKey === 'shortest_reading_time') {
      results.sort((a, b) => (a.reading_time_minutes || 0) - (b.reading_time_minutes || 0));
    }

    const currentPage = page && page > 0 ? page : 1;
    const size = page_size && page_size > 0 ? page_size : 20;
    const total_count = results.length;
    const start = (currentPage - 1) * size;
    const end = start + size;

    const pageItems = results.slice(start, end).map((a) => this._attachRelatedArticles(a, allArticles));

    return {
      articles: pageItems,
      total_count,
      page: currentPage,
      page_size: size
    };
  }

  // 19) Article details
  getArticleDetails(articleId) {
    const allArticles = this._getFromStorage('articles', []);
    const bookmarks = this._getFromStorage('bookmarked_articles', []);
    const article = allArticles.find((a) => a.id === articleId) || null;

    if (!article) {
      return {
        article: null,
        is_bookmarked: false,
        related_articles: []
      };
    }

    // Instrumentation for task completion tracking (task_6)
    try {
      const symptomSessions = this._getFromStorage('symptom_checker_sessions', []);
      if (symptomSessions && symptomSessions.length > 0) {
        const lastSession = symptomSessions[symptomSessions.length - 1];
        const recommendedIds = (lastSession && lastSession.recommended_article_ids) || [];
        if (recommendedIds.length > 0 && recommendedIds[0] === articleId) {
          localStorage.setItem(
            'task6_openedFirstRecommendedGuide',
            JSON.stringify({
              article_id: articleId,
              symptom_session_id: lastSession.id,
              opened_at: new Date().toISOString()
            })
          );
        }
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    const is_bookmarked = bookmarks.some((b) => b.article_id === articleId);

    const articleWithRelated = this._attachRelatedArticles(article, allArticles);

    return {
      article: articleWithRelated,
      is_bookmarked,
      related_articles: articleWithRelated.related_articles
    };
  }

  // 20) Bookmark article
  bookmarkArticle(articleId) {
    const articles = this._getFromStorage('articles', []);
    const article = articles.find((a) => a.id === articleId);
    if (!article) {
      return { success: false, bookmarked_article_id: null, message: 'Article not found.' };
    }

    const bookmarks = this._getFromStorage('bookmarked_articles', []);
    const existing = bookmarks.find((b) => b.article_id === articleId);
    if (existing) {
      return {
        success: true,
        bookmarked_article_id: existing.id,
        message: 'Article already bookmarked.'
      };
    }

    const now = new Date().toISOString();
    const bookmark = {
      id: this._generateId('bookmark'),
      article_id: articleId,
      saved_at: now
    };
    bookmarks.push(bookmark);
    this._saveToStorage('bookmarked_articles', bookmarks);

    return {
      success: true,
      bookmarked_article_id: bookmark.id,
      message: 'Article bookmarked.'
    };
  }

  // 21) Remove bookmarked article
  removeBookmarkedArticle(articleId) {
    const bookmarks = this._getFromStorage('bookmarked_articles', []);
    const filtered = bookmarks.filter((b) => b.article_id !== articleId);
    this._saveToStorage('bookmarked_articles', filtered);

    return {
      success: true,
      message: 'Article removed from reading list.'
    };
  }

  // 22) Get bookmarked articles
  getBookmarkedArticles() {
    const bookmarks = this._getFromStorage('bookmarked_articles', []);
    const allArticles = this._getFromStorage('articles', []);

    const articles = bookmarks
      .map((b) => allArticles.find((a) => a.id === b.article_id) || null)
      .filter((a) => !!a)
      .map((a) => this._attachRelatedArticles(a, allArticles));

    return articles;
  }

  // 23) Q&A categories
  getQnaCategories() {
    return [
      {
        value: 'test_results',
        label: 'Pregnancy test results',
        description: 'Questions about faint lines, negatives, positives, and test accuracy.'
      },
      {
        value: 'test_timing',
        label: 'When to test',
        description: 'Questions about how early you can test and cycle timing.'
      },
      {
        value: 'ovulation_and_fertility',
        label: 'Ovulation and fertility',
        description: 'Questions about fertile windows, ovulation tests, and timing intercourse.'
      },
      {
        value: 'product_questions',
        label: 'Pregnancy test products',
        description: 'Questions comparing brands, sensitivity, and how to use different test types.'
      },
      {
        value: 'general_support',
        label: 'General support',
        description: 'Emotional support and general questions around trying to conceive or unexpected results.'
      }
    ];
  }

  // 24) Q&A feed
  getQnaFeed(category, sort, page, page_size) {
    const questions = this._getFromStorage('qna_questions', []);
    const answers = this._getFromStorage('qna_answers', []);

    let filtered = questions.slice();
    if (category) {
      filtered = filtered.filter((q) => q.category === category);
    }

    const withStats = filtered.map((q) => {
      const qAnswers = answers.filter((a) => a.question_id === q.id && a.status === 'visible');
      const num_answers = qAnswers.length;
      let last_activity_at = q.last_activity_at || q.created_at;
      qAnswers.forEach((ans) => {
        if (ans.created_at && new Date(ans.created_at).getTime() > new Date(last_activity_at).getTime()) {
          last_activity_at = ans.created_at;
        }
      });
      return { ...q, num_answers, last_activity_at };
    });

    const sortKey = sort || 'most_recent';
    if (sortKey === 'most_recent') {
      withStats.sort((a, b) => {
        const la = new Date(a.last_activity_at || a.created_at).getTime();
        const lb = new Date(b.last_activity_at || b.created_at).getTime();
        return lb - la;
      });
    } else if (sortKey === 'most_answered' || sortKey === 'most_popular') {
      withStats.sort((a, b) => {
        const na = typeof a.num_answers === 'number' ? a.num_answers : 0;
        const nb = typeof b.num_answers === 'number' ? b.num_answers : 0;
        if (nb !== na) return nb - na;
        const la = new Date(a.last_activity_at || a.created_at).getTime();
        const lb = new Date(b.last_activity_at || b.created_at).getTime();
        return lb - la;
      });
    }

    const currentPage = page && page > 0 ? page : 1;
    const size = page_size && page_size > 0 ? page_size : 20;
    const total_count = withStats.length;
    const start = (currentPage - 1) * size;
    const end = start + size;

    const pageItems = withStats.slice(start, end);

    return {
      questions: pageItems,
      total_count
    };
  }

  // 25) Create Q&A question
  createQnaQuestion(category, title, body, is_anonymous) {
    const allowedCategories = [
      'test_results',
      'test_timing',
      'ovulation_and_fertility',
      'product_questions',
      'general_support'
    ];

    const finalCategory = allowedCategories.includes(category) ? category : 'general_support';
    const questions = this._getFromStorage('qna_questions', []);
    const now = new Date().toISOString();

    const question = {
      id: this._generateId('qna_question'),
      category: finalCategory,
      title,
      body,
      created_at: now,
      is_anonymous: !!is_anonymous,
      status: 'submitted',
      num_answers: 0,
      last_activity_at: now
    };

    questions.push(question);
    this._saveToStorage('qna_questions', questions);

    return {
      success: true,
      question_id: question.id,
      status: question.status,
      message: 'Question submitted successfully.'
    };
  }

  // 26) Planner overview
  getPlannerOverview() {
    const { settings } = this._getOrCreatePlannerSettings();
    const plans = this._getFromStorage('testing_plans', []);
    const reminders = this._getFromStorage('reminders', []);

    const activePlans = plans.filter((p) => p.status === 'active');

    const active_plans = activePlans.map((plan) => {
      const planReminders = reminders
        .filter((r) => r.plan_id === plan.id)
        .map((r) => ({ ...r, plan })); // foreign key resolution for plan_id
      return { plan, reminders: planReminders };
    });

    const now = new Date();
    const weekFromNow = this._addDays(now, 7);

    const upcoming_7_day_reminders = reminders
      .filter((r) => {
        if (!r.reminder_datetime) return false;
        const dt = new Date(r.reminder_datetime);
        if (isNaN(dt.getTime())) return false;
        return (
          r.status === 'pending' &&
          dt.getTime() >= now.getTime() &&
          dt.getTime() <= weekFromNow.getTime()
        );
      })
      .map((r) => {
        const plan = plans.find((p) => p.id === r.plan_id) || null;
        return { ...r, plan };
      });

    return {
      planner_settings: settings,
      active_plans,
      upcoming_7_day_reminders
    };
  }

  // 27) Create manual testing plan
  createManualTestingPlan(plan_name, notes) {
    const plans = this._getFromStorage('testing_plans', []);
    const now = new Date().toISOString();

    const plan = {
      id: this._generateId('testing_plan'),
      name: plan_name,
      source: 'planner_manual',
      created_at: now,
      last_period_date: null,
      cycle_length_days: null,
      reason_for_testing: null,
      recommended_test_date: null,
      notes: notes || null,
      status: 'active'
    };

    plans.push(plan);
    this._saveToStorage('testing_plans', plans);

    return {
      success: true,
      plan_id: plan.id,
      message: 'Testing plan created.'
    };
  }

  // 28) Add reminder to plan
  addReminderToPlan(planId, label, reminder_datetime, timezone) {
    const plans = this._getFromStorage('testing_plans', []);
    const plan = plans.find((p) => p.id === planId);
    if (!plan) {
      return { success: false, reminder_id: null, message: 'Plan not found.' };
    }

    const reminders = this._getFromStorage('reminders', []);
    const now = new Date().toISOString();

    const reminder = {
      id: this._generateId('reminder'),
      plan_id: planId,
      label,
      reminder_datetime,
      timezone: timezone || null,
      status: 'pending',
      created_at: now
    };

    reminders.push(reminder);
    this._saveToStorage('reminders', reminders);

    return {
      success: true,
      reminder_id: reminder.id,
      message: 'Reminder added to plan.'
    };
  }

  // 29) Update reminder
  updateReminder(reminderId, label, reminder_datetime, status) {
    const reminders = this._getFromStorage('reminders', []);
    const reminder = reminders.find((r) => r.id === reminderId);
    if (!reminder) {
      return { success: false, message: 'Reminder not found.' };
    }

    if (typeof label === 'string') {
      reminder.label = label;
    }
    if (typeof reminder_datetime === 'string') {
      reminder.reminder_datetime = reminder_datetime;
    }
    if (typeof status === 'string') {
      const allowed = ['pending', 'sent', 'missed', 'done'];
      if (allowed.includes(status)) {
        reminder.status = status;
      }
    }

    this._saveToStorage('reminders', reminders);

    return {
      success: true,
      message: 'Reminder updated.'
    };
  }

  // 30) Delete reminder
  deleteReminder(reminderId) {
    const reminders = this._getFromStorage('reminders', []);
    const filtered = reminders.filter((r) => r.id !== reminderId);
    this._saveToStorage('reminders', filtered);

    return {
      success: true,
      message: 'Reminder deleted.'
    };
  }

  // 31) Finalize testing plan
  finalizeTestingPlan(planId) {
    const plans = this._getFromStorage('testing_plans', []);
    const plan = plans.find((p) => p.id === planId);
    if (!plan) {
      return { success: false, message: 'Plan not found.' };
    }

    // For now, finalizing keeps the plan active; could be extended later.
    if (plan.status === 'cancelled') {
      return { success: false, message: 'Cancelled plans cannot be finalized.' };
    }

    plan.status = 'active';
    this._saveToStorage('testing_plans', plans);

    return {
      success: true,
      message: 'Testing plan finalized.'
    };
  }

  // 32) Update planner view settings
  updatePlannerViewSettings(default_view_mode) {
    const allowed = ['week', 'list', 'month'];
    if (!allowed.includes(default_view_mode)) {
      return {
        success: false,
        planner_settings_id: null,
        message: 'Invalid view mode.'
      };
    }

    const { settings, allSettings } = this._getOrCreatePlannerSettings();
    settings.default_view_mode = default_view_mode;
    settings.updated_at = new Date().toISOString();

    this._saveToStorage('planner_settings', allSettings);

    return {
      success: true,
      planner_settings_id: settings.id,
      message: 'Planner view settings updated.'
    };
  }

  // 33) Search stores
  searchStores(zip_code, radius_miles, brand_name, product_name) {
    const storesNearby = this._geocodeZipAndSearchNearbyStores(zip_code, radius_miles);
    const inventories = this._getFromStorage('store_inventories', []);
    const products = this._getFromStorage('products', []);
    const brands = this._getFromStorage('brands', []);

    const brandMap = {};
    brands.forEach((b) => {
      brandMap[b.id] = b;
    });

    const bQuery = (brand_name || '').trim().toLowerCase();
    const pQuery = (product_name || '').trim().toLowerCase();

    const results = [];

    storesNearby.forEach((store) => {
      const storeInv = inventories.filter((inv) => inv.store_id === store.id);
      storeInv.forEach((inv) => {
        const product = products.find((p) => p.id === inv.product_id);
        if (!product) return;
        const brand = brandMap[product.brand_id] || null;

        let matchesBrand = true;
        if (bQuery) {
          const productName = (product.name || '').toLowerCase();
          const brandName = brand ? (brand.name || '').toLowerCase() : '';
          matchesBrand = productName.includes(bQuery) || brandName.includes(bQuery);
        }

        let matchesProduct = true;
        if (pQuery) {
          const productName = (product.name || '').toLowerCase();
          matchesProduct = productName.includes(pQuery);
        }

        if (matchesBrand && matchesProduct) {
          const productWithBrand = { ...product, brand };
          results.push({
            store,
            availability_status: inv.availability_status,
            product_id: product.id,
            product_name: product.name,
            distance_miles: typeof store.distance_miles === 'number' ? store.distance_miles : null,
            product: productWithBrand
          });
        }
      });
    });

    // Instrumentation for task completion tracking (task_9 - search params)
    try {
      if (zip_code === '10001' && Number.isFinite(radius_miles)) {
        localStorage.setItem(
          'task9_storeSearchParams',
          JSON.stringify({
            zip_code: zip_code,
            radius_miles: radius_miles,
            brand_name: brand_name || null,
            product_name: product_name || null,
            result_store_ids: results.map((r) => r.store.id),
            searched_at: new Date().toISOString()
          })
        );
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      results,
      total_count: results.length
    };
  }

  // 34) Store details
  getStoreDetails(storeId) {
    const stores = this._getFromStorage('stores', []);
    const inventories = this._getFromStorage('store_inventories', []);
    const products = this._getFromStorage('products', []);
    const brands = this._getFromStorage('brands', []);

    const store = stores.find((s) => s.id === storeId) || null;
    if (!store) {
      return {
        store: null,
        inventory: []
      };
    }

    // Instrumentation for task completion tracking (task_9 - viewed store details)
    try {
      const raw = localStorage.getItem('task9_storeSearchParams');
      if (raw) {
        const params = JSON.parse(raw);
        const storeIds = (params && params.result_store_ids) || [];
        if (Array.isArray(storeIds) && storeIds.includes(storeId)) {
          localStorage.setItem(
            'task9_viewedStoreDetails',
            JSON.stringify({
              store_id: storeId,
              viewed_at: new Date().toISOString()
            })
          );
        }
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    const inventoryForStore = inventories
      .filter((inv) => inv.store_id === storeId)
      .map((inv) => {
        const product = products.find((p) => p.id === inv.product_id) || null;
        const brand = product ? brands.find((b) => b.id === product.brand_id) || null : null;
        const productWithBrand = product ? { ...product, brand } : null;
        return {
          ...inv,
          store,
          product: productWithBrand
        };
      });

    return {
      store,
      inventory: inventoryForStore
    };
  }

  // 35) Saved items dashboard
  getSavedItemsDashboard() {
    const aggregate = this._aggregateSavedItems();

    // Ensure foreign-key resolution for reminders (plan)
    const testing_plans = aggregate.testing_plans;
    const upcoming_reminders = aggregate.upcoming_reminders.map((r) => {
      const plan = testing_plans.find((p) => p.id === r.plan_id) || r.plan || null;
      return { ...r, plan };
    });

    return {
      testing_plans,
      favorite_products: aggregate.favorite_products,
      bookmarked_articles: aggregate.bookmarked_articles,
      upcoming_reminders
    };
  }

  // 36) Submit contact form
  submitContactForm(name, email, subject, message_type, message_body) {
    const contactMessages = this._getFromStorage('contact_messages', []);
    const now = new Date().toISOString();

    const ticket = {
      id: this._generateId('ticket'),
      name: name || null,
      email: email || null,
      subject,
      message_type,
      message_body,
      created_at: now
    };

    contactMessages.push(ticket);
    this._saveToStorage('contact_messages', contactMessages);

    return {
      success: true,
      ticket_id: ticket.id,
      message: 'Your message has been submitted.'
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
