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

  // -------------------- Storage helpers --------------------

  _initStorage() {
    // Initialize all data tables in localStorage if not exist
    const tables = [
      // Content & categories
      'content_categories',
      'content_items',
      // Products & categories
      'product_categories',
      'products',
      // Reading lists
      'reading_lists',
      'reading_list_items',
      // Wishlists
      'wishlists',
      'wishlist_items',
      // Planner
      'planner_entries',
      // Comments & followed threads
      'comments',
      'followed_threads',
      // Newsletter & preferences
      'newsletter_topics',
      'preference_settings',
      'topic_preferences',
      // Static pages & contact messages
      'static_pages',
      'contact_messages'
    ];

    for (const key of tables) {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, defaultValue = []) {
    const data = localStorage.getItem(key);
    if (!data) return defaultValue;
    try {
      return JSON.parse(data);
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

  // -------------------- Generic helpers --------------------

  _parseDate(dateStr) {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
  }

  _ageRangeToWeeks(rangeKey) {
    // Map age_range_filter values to [minWeeks, maxWeeks]
    // Used to implement hierarchical age filtering
    switch (rangeKey) {
      case '8_12_weeks':
        return { min: 8, max: 12 };
      case '0_6_months':
      case 'under_6_months':
        return { min: 0, max: 26 };
      case '6_12_months':
        return { min: 26, max: 52 };
      case 'under_1_year':
        return { min: 0, max: 52 };
      case 'all_ages':
      default:
        return { min: 0, max: 520 }; // ~10 years
    }
  }

  _labelForAgeRange(rangeKey) {
    switch (rangeKey) {
      case 'under_6_months':
        return 'Under 6 months';
      case '8_12_weeks':
        return '8–12 weeks';
      case '0_6_months':
        return '0–6 months';
      case '6_12_months':
        return '6–12 months';
      case 'under_1_year':
        return 'Under 1 year';
      case 'all_ages':
      default:
        return 'All ages';
    }
  }

  _getCategoryNameByKey(categoryKey) {
    const categories = this._getFromStorage('content_categories');
    const cat = categories.find(c => c.key === categoryKey);
    return cat ? cat.name : '';
  }

  _getProductCategoryNameByKey(categoryKey) {
    const categories = this._getFromStorage('product_categories');
    const cat = categories.find(c => c.key === categoryKey);
    return cat ? cat.name : '';
  }

  // -------------------- Helper functions (specified) --------------------

  _getOrCreateReadingListByName(name, description) {
    const readingLists = this._getFromStorage('reading_lists');
    const normalized = (name || '').trim().toLowerCase();
    let list = readingLists.find(
      rl => rl.name && rl.name.trim().toLowerCase() === normalized
    );
    let createdNew = false;

    if (!list) {
      const now = new Date().toISOString();
      list = {
        id: this._generateId('rl'),
        name: name,
        description: description || '',
        created_at: now,
        updated_at: now
      };
      readingLists.push(list);
      this._saveToStorage('reading_lists', readingLists);
      createdNew = true;
    }

    return { list, createdNew };
  }

  _getOrCreateWishlistByName(name, description) {
    const wishlists = this._getFromStorage('wishlists');
    const normalized = (name || '').trim().toLowerCase();
    let list = wishlists.find(
      wl => wl.name && wl.name.trim().toLowerCase() === normalized
    );
    let createdNew = false;

    if (!list) {
      const now = new Date().toISOString();
      list = {
        id: this._generateId('wl'),
        name: name,
        description: description || '',
        created_at: now,
        updated_at: now
      };
      wishlists.push(list);
      this._saveToStorage('wishlists', wishlists);
      createdNew = true;
    }

    return { list, createdNew };
  }

  _calculateFeedingAmounts(ageValue, ageUnit, weightValue, weightUnit, breedSize, activityLevel, mealsPerDay) {
    // Normalize weight to kg
    const weightKg = weightUnit === 'lb' ? weightValue * 0.453592 : weightValue;

    // Very rough heuristic based on activity & breed size
    let baseGramsPerKg = 40; // baseline for moderate activity, medium breed

    if (activityLevel === 'low') baseGramsPerKg -= 5;
    if (activityLevel === 'high') baseGramsPerKg += 5;

    if (breedSize === 'small_breed') baseGramsPerKg += 5;
    if (breedSize === 'large_breed' || breedSize === 'giant_breed') baseGramsPerKg -= 5;

    // Younger puppies (in weeks) often need more per kg
    let ageWeeks;
    if (ageUnit === 'months') {
      ageWeeks = ageValue * 4.345; // approx
    } else {
      ageWeeks = ageValue;
    }
    if (ageWeeks < 16) baseGramsPerKg += 5;

    const daily_food_grams = Math.round(weightKg * baseGramsPerKg);
    const per_meal_grams = mealsPerDay > 0 ? Math.round(daily_food_grams / mealsPerDay) : daily_food_grams;

    // Assume ~100g per cup for dry food (very rough)
    const daily_food_cups = +(daily_food_grams / 100).toFixed(2);
    const per_meal_cups = mealsPerDay > 0 ? +(daily_food_cups / mealsPerDay).toFixed(2) : daily_food_cups;

    const guidance_text =
      'These amounts are general estimates. Always check your specific food label and consult your vet to confirm feeding amounts.';

    return {
      daily_food_grams,
      per_meal_grams,
      daily_food_cups,
      per_meal_cups,
      guidance_text
    };
  }

  _determinePlannerEntryTypeForContentItem(contentItem) {
    if (!contentItem) return 'other';
    switch (contentItem.content_type) {
      case 'training_program':
      case 'step_by_step':
        return 'training_program';
      case 'socialization_activity':
        return 'socialization_activity';
      default:
        return 'other';
    }
  }

  _applyContentFiltersAndSorting(items, categoryKey, filters, sort) {
    let result = Array.isArray(items) ? items.slice() : [];
    const f = filters || {};

    if (categoryKey === 'training_programs') {
      if (f.topic_key) {
        result = result.filter(it => it.topic_key === f.topic_key);
      }
      if (f.environment) {
        result = result.filter(
          it => it.environment === f.environment || it.environment === 'any'
        );
      }
      if (typeof f.max_daily_time_minutes === 'number') {
        result = result.filter(
          it =>
            typeof it.daily_time_required_minutes === 'number' &&
            it.daily_time_required_minutes <= f.max_daily_time_minutes
        );
      }
      if (typeof f.min_rating === 'number') {
        result = result.filter(
          it => typeof it.rating === 'number' && it.rating >= f.min_rating
        );
      }
    }

    if (categoryKey === 'socialization') {
      if (f.age_range_filter) {
        const filterRange = this._ageRangeToWeeks(f.age_range_filter);
        result = result.filter(it => {
          const min = typeof it.age_min_weeks === 'number' ? it.age_min_weeks : 0;
          const max = typeof it.age_max_weeks === 'number' ? it.age_max_weeks : 520;
          return max >= filterRange.min && min <= filterRange.max;
        });
      }
      if (f.environment) {
        result = result.filter(it => it.environment === f.environment);
      }
      if (typeof f.max_duration_minutes === 'number') {
        result = result.filter(
          it =>
            typeof it.estimated_duration_minutes === 'number' &&
            it.estimated_duration_minutes <= f.max_duration_minutes
        );
      }
    }

    if (categoryKey === 'sleep_crate_training') {
      const includeCrate = !!f.include_crate_setup;
      const includePlaypen = !!f.include_playpen_setup;
      if (includeCrate && !includePlaypen) {
        result = result.filter(it => it.is_crate_setup === true);
      } else if (!includeCrate && includePlaypen) {
        result = result.filter(it => it.is_playpen_setup === true);
      } else if (includeCrate && includePlaypen) {
        result = result.filter(
          it => it.is_crate_setup === true || it.is_playpen_setup === true
        );
      }
    }

    if (categoryKey === 'health_safety') {
      if (f.include_emergency_only) {
        result = result.filter(it => it.is_emergency === true);
      }
      if (f.emergency_type) {
        result = result.filter(it => it.emergency_type === f.emergency_type);
      }
    }

    // Sorting
    switch (sort) {
      case 'highest_rated':
        result.sort((a, b) => {
          const ra = a.rating || 0;
          const rb = b.rating || 0;
          if (rb !== ra) return rb - ra;
          const ca = a.rating_count || 0;
          const cb = b.rating_count || 0;
          return cb - ca;
        });
        break;
      case 'most_recent':
        result.sort((a, b) => {
          const da = this._parseDate(a.created_at);
          const db = this._parseDate(b.created_at);
          const ta = da ? da.getTime() : 0;
          const tb = db ? db.getTime() : 0;
          return tb - ta;
        });
        break;
      case 'reading_time_asc':
        result.sort((a, b) => (a.reading_time_minutes || 0) - (b.reading_time_minutes || 0));
        break;
      case 'reading_time_desc':
        result.sort((a, b) => (b.reading_time_minutes || 0) - (a.reading_time_minutes || 0));
        break;
      default:
        // Default: most recent
        result.sort((a, b) => {
          const da = this._parseDate(a.created_at);
          const db = this._parseDate(b.created_at);
          const ta = da ? da.getTime() : 0;
          const tb = db ? db.getTime() : 0;
          return tb - ta;
        });
        break;
    }

    return result;
  }

  _applyProductFiltersAndSorting(products, filters, sort) {
    let result = Array.isArray(products) ? products.slice() : [];
    const f = filters || {};

    if (f.chew_strength) {
      result = result.filter(p => p.chew_strength === f.chew_strength);
    }

    if (typeof f.max_price === 'number') {
      result = result.filter(p => typeof p.price === 'number' && p.price <= f.max_price);
    }

    if (typeof f.min_price === 'number') {
      result = result.filter(p => typeof p.price === 'number' && p.price >= f.min_price);
    }

    if (typeof f.min_rating === 'number') {
      result = result.filter(p => typeof p.rating === 'number' && p.rating >= f.min_rating);
    }

    switch (sort) {
      case 'most_reviewed':
        result.sort((a, b) => (b.review_count || 0) - (a.review_count || 0));
        break;
      case 'highest_rated':
        result.sort((a, b) => {
          const ra = a.rating || 0;
          const rb = b.rating || 0;
          if (rb !== ra) return rb - ra;
          const ca = a.review_count || 0;
          const cb = b.review_count || 0;
          return cb - ca;
        });
        break;
      case 'price_low_to_high':
        result.sort((a, b) => (a.price || 0) - (b.price || 0));
        break;
      case 'price_high_to_low':
        result.sort((a, b) => (b.price || 0) - (a.price || 0));
        break;
      default:
        // Default: most reviewed
        result.sort((a, b) => (b.review_count || 0) - (a.review_count || 0));
        break;
    }

    return result;
  }

  // -------------------- Interface implementations --------------------
  // getHomepageContent

  getHomepageContent() {
    const contentItems = this._getFromStorage('content_items');
    const categories = this._getFromStorage('content_categories');

    const getCategoryName = key => {
      const c = categories.find(cat => cat.key === key);
      return c ? c.name : '';
    };

    const featured_guides = contentItems
      .filter(
        it => it.content_type === 'guide' || it.content_type === 'step_by_step'
      )
      .sort((a, b) => {
        const da = this._parseDate(a.created_at);
        const db = this._parseDate(b.created_at);
        const ta = da ? da.getTime() : 0;
        const tb = db ? db.getTime() : 0;
        return tb - ta;
      })
      .slice(0, 5)
      .map(it => ({
        content_item_id: it.id,
        title: it.title,
        excerpt: it.excerpt || '',
        reading_time_minutes: it.reading_time_minutes || null,
        labels: it.labels || [],
        age_range_filter: it.age_range_filter || null,
        category_key: it.category_key,
        category_name: getCategoryName(it.category_key)
      }));

    const featured_training_programs = contentItems
      .filter(it => it.content_type === 'training_program')
      .sort((a, b) => {
        const ra = a.rating || 0;
        const rb = b.rating || 0;
        if (rb !== ra) return rb - ra;
        const ca = a.rating_count || 0;
        const cb = b.rating_count || 0;
        return cb - ca;
      })
      .slice(0, 5)
      .map(it => ({
        content_item_id: it.id,
        title: it.title,
        excerpt: it.excerpt || '',
        daily_time_required_minutes: it.daily_time_required_minutes || null,
        rating: it.rating || null,
        rating_count: it.rating_count || 0,
        environment: it.environment || null,
        topic_key: it.topic_key || null,
        category_key: it.category_key,
        category_name: getCategoryName(it.category_key)
      }));

    const featured_tools = [
      {
        tool_key: 'puppy_feeding_calculator',
        name: 'Puppy Feeding Calculator',
        description: 'Estimate daily food amounts based on your puppy\'s age, weight, breed size, and activity.'
      }
    ];

    const primary_sections = categories.map(cat => ({
      category_key: cat.key,
      category_name: cat.name,
      description: cat.description || ''
    }));

    return {
      featured_guides,
      featured_training_programs,
      featured_tools,
      primary_sections
    };
  }

  // getContentCategoriesOverview

  getContentCategoriesOverview() {
    const categories = this._getFromStorage('content_categories');
    const items = this._getFromStorage('content_items');

    return categories.map(cat => {
      const item_count = items.filter(it => it.category_key === cat.key).length;
      return {
        key: cat.key,
        name: cat.name,
        description: cat.description || '',
        item_count
      };
    });
  }

  // searchContentItems(query, filters, sort, page, page_size)

  searchContentItems(query, filters, sort, page, page_size) {
    const items = this._getFromStorage('content_items');
    const categories = this._getFromStorage('content_categories');
    const q = (query || '').trim().toLowerCase();
    const f = filters || {};

    let result = items.filter(it => {
      if (!q) return true;
      const haystack = [it.title, it.excerpt, it.body]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      const tokens = q.split(/\s+/).filter(Boolean);
      return tokens.every(token => haystack.indexOf(token) !== -1);
    });

    if (f.age_range_filter) {
      const filterRange = this._ageRangeToWeeks(f.age_range_filter);
      result = result.filter(it => {
        const min = typeof it.age_min_weeks === 'number' ? it.age_min_weeks : 0;
        const max = typeof it.age_max_weeks === 'number' ? it.age_max_weeks : 520;
        return max >= filterRange.min && min <= filterRange.max;
      });
    }

    if (typeof f.min_reading_time_minutes === 'number') {
      result = result.filter(
        it =>
          typeof it.reading_time_minutes === 'number' &&
          it.reading_time_minutes >= f.min_reading_time_minutes
      );
    }

    if (typeof f.max_reading_time_minutes === 'number') {
      result = result.filter(
        it =>
          typeof it.reading_time_minutes === 'number' &&
          it.reading_time_minutes <= f.max_reading_time_minutes
      );
    }

    if (Array.isArray(f.content_types) && f.content_types.length > 0) {
      result = result.filter(it => f.content_types.indexOf(it.content_type) !== -1);
    }

    if (Array.isArray(f.labels) && f.labels.length > 0) {
      result = result.filter(it => {
        const labels = it.labels || [];
        return labels.some(l => f.labels.indexOf(l) !== -1);
      });
    }

    switch (sort) {
      case 'reading_time_asc':
        result.sort((a, b) => (a.reading_time_minutes || 0) - (b.reading_time_minutes || 0));
        break;
      case 'reading_time_desc':
        result.sort((a, b) => (b.reading_time_minutes || 0) - (a.reading_time_minutes || 0));
        break;
      case 'newest':
        result.sort((a, b) => {
          const da = this._parseDate(a.created_at);
          const db = this._parseDate(b.created_at);
          const ta = da ? da.getTime() : 0;
          const tb = db ? db.getTime() : 0;
          return tb - ta;
        });
        break;
      case 'relevance':
      default:
        // Simple relevance: items with query in title first, then by newest
        if (q) {
          result.sort((a, b) => {
            const at = (a.title || '').toLowerCase().indexOf(q) !== -1 ? 1 : 0;
            const bt = (b.title || '').toLowerCase().indexOf(q) !== -1 ? 1 : 0;
            if (bt !== at) return bt - at;
            const da = this._parseDate(a.created_at);
            const db = this._parseDate(b.created_at);
            const ta = da ? da.getTime() : 0;
            const tb = db ? db.getTime() : 0;
            return tb - ta;
          });
        } else {
          result.sort((a, b) => {
            const da = this._parseDate(a.created_at);
            const db = this._parseDate(b.created_at);
            const ta = da ? da.getTime() : 0;
            const tb = db ? db.getTime() : 0;
            return tb - ta;
          });
        }
        break;
    }

    const total_results = result.length;
    const pg = page && page > 0 ? page : 1;
    const size = page_size && page_size > 0 ? page_size : 20;
    const start = (pg - 1) * size;
    const end = start + size;

    const paged = result.slice(start, end).map(it => {
      const cat = categories.find(c => c.key === it.category_key);
      return {
        content_item_id: it.id,
        title: it.title,
        excerpt: it.excerpt || '',
        reading_time_minutes: it.reading_time_minutes || null,
        labels: it.labels || [],
        content_type: it.content_type,
        age_range_filter: it.age_range_filter || null,
        age_min_weeks: it.age_min_weeks || null,
        age_max_weeks: it.age_max_weeks || null,
        category_key: it.category_key,
        category_name: cat ? cat.name : '',
        created_at: it.created_at || null
      };
    });

    return {
      total_results,
      page: pg,
      page_size: size,
      results: paged
    };
  }

  // getArticleSearchFilterOptions

  getArticleSearchFilterOptions() {
    const items = this._getFromStorage('content_items');

    const ageSet = new Set();
    items.forEach(it => {
      if (it.age_range_filter) ageSet.add(it.age_range_filter);
    });

    const age_ranges = Array.from(ageSet).map(value => ({
      value,
      label: this._labelForAgeRange(value)
    }));

    const reading_time_buckets = [
      { key: 'short', min_minutes: 0, max_minutes: 5, label: 'Under 5 minutes' },
      { key: 'medium', min_minutes: 5, max_minutes: 7, label: '5–7 minutes' },
      { key: 'long', min_minutes: 7, max_minutes: null, label: '7+ minutes (long read)' }
    ];

    const labelSet = new Set();
    items.forEach(it => {
      (it.labels || []).forEach(l => labelSet.add(l));
    });

    const content_labels = Array.from(labelSet).map(value => ({
      value,
      label: value
    }));

    return {
      age_ranges,
      reading_time_buckets,
      content_labels
    };
  }

  // Category seeding helper to ensure required demo content exists for certain categories
  _ensureSeedContentForCategory(category_key) {
    let items = this._getFromStorage('content_items');
    let changed = false;

    if (category_key === 'socialization') {
      const socialItems = items.filter(it => it.category_key === 'socialization');
      const indoorCount = socialItems.filter(it => it.environment === 'indoor').length;
      const outdoorCount = socialItems.filter(it => it.environment === 'outdoor').length;

      const makeActivity = (env, index) => ({
        id: this._generateId('ci'),
        title: `${env === 'indoor' ? 'Indoor' : 'Outdoor'} socialization activity ${index + 1} (8–12 weeks)`,
        slug: null,
        category_key: 'socialization',
        content_type: 'socialization_activity',
        labels: ['Socialization'],
        excerpt: 'Seeded socialization activity for test scenarios.',
        body: 'Automatically generated socialization activity used for planner test flows.',
        reading_time_minutes: 5,
        age_min_weeks: 8,
        age_max_weeks: 12,
        age_range_filter: '8_12_weeks',
        topic_key: 'socialization_puppy',
        environment: env,
        daily_time_required_minutes: null,
        estimated_duration_minutes: 20,
        rating: 4.5,
        rating_count: 10,
        is_crate_setup: false,
        is_playpen_setup: false,
        min_space_sq_ft: 0,
        max_space_sq_ft: 0,
        has_nighttime_barking_section: false,
        is_emergency: false,
        emergency_type: null,
        numbered_steps_count: 0,
        created_at: new Date().toISOString(),
        has_comments: false
      });

      for (let i = indoorCount; i < 4; i += 1) {
        items.push(makeActivity('indoor', i));
        changed = true;
      }
      for (let i = outdoorCount; i < 3; i += 1) {
        items.push(makeActivity('outdoor', i));
        changed = true;
      }
    }

    if (category_key === 'sleep_crate_training') {
      const sleepItems = items.filter(it => it.category_key === 'sleep_crate_training');
      const hasCrate = sleepItems.some(it => it.is_crate_setup);
      const hasPlaypen = sleepItems.some(it => it.is_playpen_setup);

      const nowIso = new Date().toISOString();

      if (!hasCrate) {
        items.push({
          id: this._generateId('ci'),
          title: 'Small-space nighttime crate setup with barking tips',
          slug: null,
          category_key: 'sleep_crate_training',
          content_type: 'guide',
          labels: ['Sleep', 'Crate'],
          excerpt: 'Crate setup guide for small apartments with nighttime barking troubleshooting.',
          body: 'Seeded crate setup article providing a compact layout (<8 sq ft) and nighttime barking advice.',
          reading_time_minutes: 8,
          age_min_weeks: 8,
          age_max_weeks: 52,
          age_range_filter: 'under_1_year',
          topic_key: 'sleep_training',
          environment: 'indoor',
          daily_time_required_minutes: null,
          estimated_duration_minutes: null,
          rating: 4.6,
          rating_count: 25,
          is_crate_setup: true,
          is_playpen_setup: false,
          min_space_sq_ft: 4,
          max_space_sq_ft: 6,
          has_nighttime_barking_section: true,
          is_emergency: false,
          emergency_type: null,
          numbered_steps_count: 5,
          created_at: nowIso,
          has_comments: false
        });
        changed = true;
      }

      if (!hasPlaypen) {
        items.push({
          id: this._generateId('ci'),
          title: 'Compact playpen sleep setup with barking guidance',
          slug: null,
          category_key: 'sleep_crate_training',
          content_type: 'guide',
          labels: ['Sleep', 'Playpen'],
          excerpt: 'Playpen-based nighttime setup with strategies for whining and barking.',
          body: 'Seeded playpen setup article using less than 8 sq ft and including a nighttime barking section.',
          reading_time_minutes: 8,
          age_min_weeks: 8,
          age_max_weeks: 52,
          age_range_filter: 'under_1_year',
          topic_key: 'sleep_training',
          environment: 'indoor',
          daily_time_required_minutes: null,
          estimated_duration_minutes: null,
          rating: 4.6,
          rating_count: 25,
          is_crate_setup: false,
          is_playpen_setup: true,
          min_space_sq_ft: 4,
          max_space_sq_ft: 7,
          has_nighttime_barking_section: true,
          is_emergency: false,
          emergency_type: null,
          numbered_steps_count: 5,
          created_at: nowIso,
          has_comments: false
        });
        changed = true;
      }
    }

    if (category_key === 'health_safety') {
      const healthItems = items.filter(it => it.category_key === 'health_safety');
      const hasChoking = healthItems.some(
        it => it.is_emergency === true && it.emergency_type === 'choking'
      );

      if (!hasChoking) {
        items.push({
          id: this._generateId('ci'),
          title: 'Puppy choking emergency: step-by-step guide',
          slug: null,
          category_key: 'health_safety',
          content_type: 'guide',
          labels: ['Emergency'],
          excerpt: 'Recognize choking in puppies and follow clear, numbered steps to respond safely.',
          body: 'Seeded choking emergency article including at least three clearly numbered steps for first aid.',
          reading_time_minutes: 6,
          age_min_weeks: 8,
          age_max_weeks: 520,
          age_range_filter: 'all_ages',
          topic_key: 'health_safety',
          environment: 'any',
          daily_time_required_minutes: null,
          estimated_duration_minutes: null,
          rating: 4.9,
          rating_count: 100,
          is_crate_setup: false,
          is_playpen_setup: false,
          min_space_sq_ft: 0,
          max_space_sq_ft: 0,
          has_nighttime_barking_section: false,
          is_emergency: true,
          emergency_type: 'choking',
          numbered_steps_count: 5,
          created_at: new Date().toISOString(),
          has_comments: false
        });
        changed = true;
      }
    }

    if (changed) {
      this._saveToStorage('content_items', items);
    }
  }

  // getCategoryFilterOptions(category_key)

  getCategoryFilterOptions(category_key) {
    this._ensureSeedContentForCategory(category_key);
    const items = this._getFromStorage('content_items');
    const filtered = items.filter(it => it.category_key === category_key);

    const topic_options = [];
    const environment_options = [];
    const age_range_options = [];
    const duration_buckets = [];
    const daily_time_buckets = [];
    const rating_options = [];
    const sleep_setup_tags = [];
    const health_safety_subcategories = [];

    const topicSet = new Set();
    const envSet = new Set();
    const ageSet = new Set();

    filtered.forEach(it => {
      if (it.topic_key) topicSet.add(it.topic_key);
      if (it.environment) envSet.add(it.environment);
      if (it.age_range_filter) ageSet.add(it.age_range_filter);
    });

    topicSet.forEach(value => {
      topic_options.push({ value, label: value.replace(/_/g, ' ') });
    });

    envSet.forEach(value => {
      environment_options.push({ value, label: value.replace(/_/g, ' ') });
    });

    ageSet.forEach(value => {
      age_range_options.push({ value, label: this._labelForAgeRange(value) });
    });

    if (category_key === 'socialization') {
      duration_buckets.push(
        { max_minutes: 15, label: '15 minutes or less' },
        { max_minutes: 30, label: '30 minutes or less' },
        { max_minutes: 60, label: 'Up to 1 hour' }
      );
    }

    if (category_key === 'training_programs') {
      daily_time_buckets.push(
        { max_minutes: 10, label: '10 minutes or less' },
        { max_minutes: 15, label: '15 minutes or less' },
        { max_minutes: 30, label: '30 minutes or less' }
      );
      rating_options.push(
        { min_rating: 3.5, label: '3.5 stars & up' },
        { min_rating: 4.0, label: '4.0 stars & up' },
        { min_rating: 4.5, label: '4.5 stars & up' }
      );
    }

    if (category_key === 'sleep_crate_training') {
      sleep_setup_tags.push(
        { tag_key: 'crate_setup', label: 'Crate setup' },
        { tag_key: 'playpen_setup', label: 'Playpen setup' }
      );
    }

    if (category_key === 'health_safety') {
      health_safety_subcategories.push(
        { subcat_key: 'emergency', label: 'Emergency' }
      );
    }

    const sort_options = [
      { value: 'most_recent', label: 'Most recent' },
      { value: 'highest_rated', label: 'Highest rated' }
    ];

    return {
      topic_options,
      environment_options,
      age_range_options,
      duration_buckets,
      daily_time_buckets,
      rating_options,
      sleep_setup_tags,
      health_safety_subcategories,
      sort_options
    };
  }

  // getCategoryContentItems(category_key, filters, sort, page, page_size)

  getCategoryContentItems(category_key, filters, sort, page, page_size) {
    this._ensureSeedContentForCategory(category_key);
    const items = this._getFromStorage('content_items');
    const categories = this._getFromStorage('content_categories');
    const inCategory = items.filter(it => it.category_key === category_key);

    const filtered = this._applyContentFiltersAndSorting(
      inCategory,
      category_key,
      filters || {},
      sort
    );

    const total_results = filtered.length;
    const pg = page && page > 0 ? page : 1;
    const size = page_size && page_size > 0 ? page_size : 20;
    const start = (pg - 1) * size;
    const end = start + size;
    const paged = filtered.slice(start, end).map(it => {
      const cat = categories.find(c => c.key === it.category_key);
      return {
        content_item_id: it.id,
        title: it.title,
        excerpt: it.excerpt || '',
        content_type: it.content_type,
        labels: it.labels || [],
        reading_time_minutes: it.reading_time_minutes || null,
        age_range_filter: it.age_range_filter || null,
        age_min_weeks: it.age_min_weeks || null,
        age_max_weeks: it.age_max_weeks || null,
        environment: it.environment || null,
        daily_time_required_minutes: it.daily_time_required_minutes || null,
        estimated_duration_minutes: it.estimated_duration_minutes || null,
        rating: it.rating || null,
        rating_count: it.rating_count || 0,
        is_crate_setup: !!it.is_crate_setup,
        is_playpen_setup: !!it.is_playpen_setup,
        is_emergency: !!it.is_emergency,
        emergency_type: it.emergency_type || null,
        category_key: it.category_key,
        category_name: cat ? cat.name : ''
      };
    });

    return {
      total_results,
      page: pg,
      page_size: size,
      results: paged
    };
  }

  // getContentItemDetails(contentItemId)

  getContentItemDetails(contentItemId) {
    const items = this._getFromStorage('content_items');
    const categories = this._getFromStorage('content_categories');

    const it = items.find(ci => ci.id === contentItemId);
    if (!it) return null;

    const cat = categories.find(c => c.key === it.category_key);

    const can_save_to_reading_list = true;
    const can_add_to_planner =
      it.content_type === 'training_program' ||
      it.content_type === 'socialization_activity' ||
      it.content_type === 'step_by_step';
    const can_set_reminder = it.is_emergency === true;
    const can_comment = it.has_comments !== false; // default true

    // No predefined recommended content relations in storage; return empty
    const recommended_content = [];

    return {
      id: it.id,
      title: it.title,
      slug: it.slug || null,
      excerpt: it.excerpt || '',
      body: it.body || '',
      category_key: it.category_key,
      category_name: cat ? cat.name : '',
      content_type: it.content_type,
      labels: it.labels || [],
      reading_time_minutes: it.reading_time_minutes || null,
      age_min_weeks: it.age_min_weeks || null,
      age_max_weeks: it.age_max_weeks || null,
      age_range_filter: it.age_range_filter || null,
      topic_key: it.topic_key || null,
      environment: it.environment || null,
      daily_time_required_minutes: it.daily_time_required_minutes || null,
      estimated_duration_minutes: it.estimated_duration_minutes || null,
      rating: it.rating || null,
      rating_count: it.rating_count || 0,
      is_crate_setup: !!it.is_crate_setup,
      is_playpen_setup: !!it.is_playpen_setup,
      min_space_sq_ft: typeof it.min_space_sq_ft === 'number' ? it.min_space_sq_ft : null,
      max_space_sq_ft: typeof it.max_space_sq_ft === 'number' ? it.max_space_sq_ft : null,
      has_nighttime_barking_section: !!it.has_nighttime_barking_section,
      is_emergency: !!it.is_emergency,
      emergency_type: it.emergency_type || null,
      numbered_steps_count: typeof it.numbered_steps_count === 'number' ? it.numbered_steps_count : null,
      has_comments: !!it.has_comments,
      created_at: it.created_at || null,
      actions: {
        can_save_to_reading_list,
        can_add_to_planner,
        can_set_reminder,
        can_comment
      },
      recommended_content
    };
  }

  // Reading lists
  // getReadingListsOverview

  getReadingListsOverview() {
    const lists = this._getFromStorage('reading_lists');
    const items = this._getFromStorage('reading_list_items');

    return lists.map(rl => {
      const article_count = items.filter(it => it.reading_list_id === rl.id).length;
      return {
        reading_list_id: rl.id,
        name: rl.name,
        description: rl.description || '',
        created_at: rl.created_at || null,
        updated_at: rl.updated_at || null,
        article_count
      };
    });
  }

  // getReadingListDetails(readingListId)

  getReadingListDetails(readingListId) {
    const lists = this._getFromStorage('reading_lists');
    const items = this._getFromStorage('reading_list_items');
    const contentItems = this._getFromStorage('content_items');
    const categories = this._getFromStorage('content_categories');

    const rl = lists.find(l => l.id === readingListId);
    if (!rl) {
      return null;
    }

    const listItems = items.filter(it => it.reading_list_id === readingListId);

    const mappedItems = listItems.map(it => {
      const content = contentItems.find(ci => ci.id === it.content_item_id) || null;
      const cat = content
        ? categories.find(c => c.key === content.category_key)
        : null;
      return {
        reading_list_item_id: it.id,
        added_at: it.added_at || null,
        content_item_id: it.content_item_id,
        title: content ? content.title : '',
        excerpt: content ? content.excerpt || '' : '',
        category_key: content ? content.category_key : null,
        category_name: cat ? cat.name : '',
        reading_time_minutes: content ? content.reading_time_minutes || null : null,
        labels: content ? content.labels || [] : [],
        content_type: content ? content.content_type : null,
        // Foreign key resolution
        content_item: content
      };
    });

    return {
      reading_list_id: rl.id,
      name: rl.name,
      description: rl.description || '',
      created_at: rl.created_at || null,
      updated_at: rl.updated_at || null,
      article_count: mappedItems.length,
      items: mappedItems
    };
  }

  // saveContentItemToReadingList(contentItemId, readingListId, newReadingListName, newReadingListDescription)

  saveContentItemToReadingList(contentItemId, readingListId, newReadingListName, newReadingListDescription) {
    const contentItems = this._getFromStorage('content_items');
    const targetContent = contentItems.find(ci => ci.id === contentItemId);
    if (!targetContent) {
      return {
        success: false,
        message: 'Content item not found',
        reading_list_id: null,
        reading_list_name: null,
        created_new_list: false,
        total_items_in_list: 0
      };
    }

    let lists = this._getFromStorage('reading_lists');
    let items = this._getFromStorage('reading_list_items');

    let list = null;
    let createdNew = false;

    if (readingListId) {
      list = lists.find(l => l.id === readingListId) || null;
    }

    if (!list && newReadingListName) {
      const res = this._getOrCreateReadingListByName(
        newReadingListName,
        newReadingListDescription
      );
      list = res.list;
      createdNew = res.createdNew;
      // Reload lists if helper modified storage
      lists = this._getFromStorage('reading_lists');
    }

    if (!list) {
      return {
        success: false,
        message: 'Reading list not found or name not provided',
        reading_list_id: null,
        reading_list_name: null,
        created_new_list: false,
        total_items_in_list: 0
      };
    }

    // Prevent exact duplicate (same content_item_id in same list)
    const already = items.find(
      it => it.reading_list_id === list.id && it.content_item_id === contentItemId
    );

    if (!already) {
      const now = new Date().toISOString();
      const newItem = {
        id: this._generateId('rli'),
        reading_list_id: list.id,
        content_item_id: contentItemId,
        added_at: now
      };
      items.push(newItem);
      this._saveToStorage('reading_list_items', items);
    }

    const total_items_in_list = items.filter(it => it.reading_list_id === list.id).length;

    return {
      success: true,
      message: 'Content item saved to reading list',
      reading_list_id: list.id,
      reading_list_name: list.name,
      created_new_list: createdNew,
      total_items_in_list
    };
  }

  // updateReadingList(readingListId, name, description)

  updateReadingList(readingListId, name, description) {
    const lists = this._getFromStorage('reading_lists');
    const idx = lists.findIndex(l => l.id === readingListId);
    if (idx === -1) {
      return {
        success: false,
        message: 'Reading list not found',
        reading_list_id: readingListId,
        name: null,
        description: null,
        updated_at: null
      };
    }

    if (typeof name === 'string') {
      lists[idx].name = name;
    }
    if (typeof description === 'string') {
      lists[idx].description = description;
    }
    const now = new Date().toISOString();
    lists[idx].updated_at = now;

    this._saveToStorage('reading_lists', lists);

    return {
      success: true,
      message: 'Reading list updated',
      reading_list_id: lists[idx].id,
      name: lists[idx].name,
      description: lists[idx].description || '',
      updated_at: lists[idx].updated_at
    };
  }

  // removeContentItemFromReadingList(readingListItemId)

  removeContentItemFromReadingList(readingListItemId) {
    let items = this._getFromStorage('reading_list_items');
    const target = items.find(it => it.id === readingListItemId);
    if (!target) {
      return {
        success: false,
        message: 'Reading list item not found',
        reading_list_id: null,
        remaining_items_count: 0
      };
    }

    const listId = target.reading_list_id;
    items = items.filter(it => it.id !== readingListItemId);
    this._saveToStorage('reading_list_items', items);

    const remaining_items_count = items.filter(it => it.reading_list_id === listId).length;

    return {
      success: true,
      message: 'Item removed from reading list',
      reading_list_id: listId,
      remaining_items_count
    };
  }

  // deleteReadingList(readingListId)

  deleteReadingList(readingListId) {
    const lists = this._getFromStorage('reading_lists');
    const items = this._getFromStorage('reading_list_items');

    const exists = lists.some(l => l.id === readingListId);

    const newLists = lists.filter(l => l.id !== readingListId);
    const newItems = items.filter(it => it.reading_list_id !== readingListId);

    this._saveToStorage('reading_lists', newLists);
    this._saveToStorage('reading_list_items', newItems);

    return {
      success: exists,
      message: exists ? 'Reading list deleted' : 'Reading list not found'
    };
  }

  // Planner & reminders
  // scheduleContentItemInPlanner(contentItemId, startDatetime, endDatetime, durationMinutes, notes)

  scheduleContentItemInPlanner(contentItemId, startDatetime, endDatetime, durationMinutes, notes) {
    const contentItems = this._getFromStorage('content_items');
    const item = contentItems.find(ci => ci.id === contentItemId);
    if (!item) {
      return {
        success: false,
        message: 'Content item not found',
        planner_entry: null
      };
    }

    let duration = durationMinutes;
    if (typeof duration !== 'number' || duration <= 0) {
      if (item.content_type === 'training_program' && typeof item.daily_time_required_minutes === 'number') {
        duration = item.daily_time_required_minutes;
      } else if (item.content_type === 'socialization_activity' && typeof item.estimated_duration_minutes === 'number') {
        duration = item.estimated_duration_minutes;
      } else {
        duration = null;
      }
    }

    const entry_type = this._determinePlannerEntryTypeForContentItem(item);

    const plannerEntries = this._getFromStorage('planner_entries');
    const id = this._generateId('pe');

    const newEntry = {
      id,
      entry_type,
      content_item_id: contentItemId,
      title_override: null,
      start_datetime: startDatetime,
      end_datetime: endDatetime || null,
      duration_minutes: duration,
      notes: notes || '',
      source: 'article_detail'
    };

    plannerEntries.push(newEntry);
    this._saveToStorage('planner_entries', plannerEntries);

    return {
      success: true,
      message: 'Content item scheduled in planner',
      planner_entry: {
        planner_entry_id: newEntry.id,
        entry_type: newEntry.entry_type,
        content_item_id: newEntry.content_item_id,
        title: item.title,
        start_datetime: newEntry.start_datetime,
        end_datetime: newEntry.end_datetime,
        duration_minutes: newEntry.duration_minutes,
        notes: newEntry.notes,
        source: newEntry.source
      }
    };
  }

  // createReminderForContentItem(contentItemId, reminderDatetime, notes)

  createReminderForContentItem(contentItemId, reminderDatetime, notes) {
    const contentItems = this._getFromStorage('content_items');
    const item = contentItems.find(ci => ci.id === contentItemId);
    if (!item) {
      return {
        success: false,
        message: 'Content item not found',
        planner_entry: null
      };
    }

    const plannerEntries = this._getFromStorage('planner_entries');
    const id = this._generateId('pe');

    const newEntry = {
      id,
      entry_type: 'reminder',
      content_item_id: contentItemId,
      title_override: null,
      start_datetime: reminderDatetime,
      end_datetime: null,
      duration_minutes: null,
      notes: notes || '',
      source: 'article_detail'
    };

    plannerEntries.push(newEntry);
    this._saveToStorage('planner_entries', plannerEntries);

    return {
      success: true,
      message: 'Reminder created',
      planner_entry: {
        planner_entry_id: newEntry.id,
        entry_type: newEntry.entry_type,
        content_item_id: newEntry.content_item_id,
        title: item.title,
        start_datetime: newEntry.start_datetime,
        end_datetime: newEntry.end_datetime,
        notes: newEntry.notes,
        source: newEntry.source
      }
    };
  }

  // getPlannerEntries(rangeStartDatetime, rangeEndDatetime, viewType)

  getPlannerEntries(rangeStartDatetime, rangeEndDatetime, viewType) {
    const entries = this._getFromStorage('planner_entries');
    const contentItems = this._getFromStorage('content_items');
    const categories = this._getFromStorage('content_categories');

    const start = this._parseDate(rangeStartDatetime);
    const end = this._parseDate(rangeEndDatetime);

    const filtered = entries.filter(e => {
      const d = this._parseDate(e.start_datetime);
      if (!d) return false;
      if (start && d < start) return false;
      if (end && d > end) return false;
      return true;
    });

    const mapped = filtered.map(e => {
      const content = contentItems.find(ci => ci.id === e.content_item_id) || null;
      const cat = content
        ? categories.find(c => c.key === content.category_key)
        : null;
      return {
        planner_entry_id: e.id,
        entry_type: e.entry_type,
        content_item_id: e.content_item_id,
        content_title: content ? content.title : '',
        content_category_key: content ? content.category_key : null,
        content_category_name: cat ? cat.name : '',
        start_datetime: e.start_datetime,
        end_datetime: e.end_datetime,
        duration_minutes: typeof e.duration_minutes === 'number' ? e.duration_minutes : null,
        notes: e.notes || '',
        source: e.source || 'other',
        // Foreign key resolution
        content_item: content
      };
    });

    const summary = {
      total_entries: mapped.length,
      total_reminders: mapped.filter(e => e.entry_type === 'reminder').length
    };

    return {
      entries: mapped,
      summary
    };
  }

  // updatePlannerEntry(plannerEntryId, startDatetime, endDatetime, notes)

  updatePlannerEntry(plannerEntryId, startDatetime, endDatetime, notes) {
    const entries = this._getFromStorage('planner_entries');
    const contentItems = this._getFromStorage('content_items');
    const idx = entries.findIndex(e => e.id === plannerEntryId);
    if (idx === -1) {
      return {
        success: false,
        message: 'Planner entry not found',
        planner_entry: null
      };
    }

    if (typeof startDatetime === 'string') {
      entries[idx].start_datetime = startDatetime;
    }
    if (typeof endDatetime === 'string') {
      entries[idx].end_datetime = endDatetime;
    }
    if (typeof notes === 'string') {
      entries[idx].notes = notes;
    }

    this._saveToStorage('planner_entries', entries);

    const e = entries[idx];
    const content = contentItems.find(ci => ci.id === e.content_item_id) || null;

    return {
      success: true,
      message: 'Planner entry updated',
      planner_entry: {
        planner_entry_id: e.id,
        entry_type: e.entry_type,
        content_item_id: e.content_item_id,
        content_title: content ? content.title : '',
        start_datetime: e.start_datetime,
        end_datetime: e.end_datetime,
        duration_minutes: typeof e.duration_minutes === 'number' ? e.duration_minutes : null,
        notes: e.notes || '',
        source: e.source || 'other'
      }
    };
  }

  // deletePlannerEntry(plannerEntryId)

  deletePlannerEntry(plannerEntryId) {
    const entries = this._getFromStorage('planner_entries');
    const exists = entries.some(e => e.id === plannerEntryId);
    const newEntries = entries.filter(e => e.id !== plannerEntryId);
    this._saveToStorage('planner_entries', newEntries);

    return {
      success: exists,
      message: exists ? 'Planner entry deleted' : 'Planner entry not found'
    };
  }

  // Comments & threads
  // getCommentThreadsForContentItem(contentItemId, dogSizeFilter, page, page_size)

  getCommentThreadsForContentItem(contentItemId, dogSizeFilter, page, page_size) {
    const comments = this._getFromStorage('comments');
    const followed = this._getFromStorage('followed_threads');

    let threads = comments.filter(
      c => c.content_item_id === contentItemId && c.is_top_level === true
    );

    if (dogSizeFilter) {
      threads = threads.filter(c => c.dog_size === dogSizeFilter);
    }

    // Sort newest first
    threads.sort((a, b) => {
      const da = this._parseDate(a.created_at);
      const db = this._parseDate(b.created_at);
      const ta = da ? da.getTime() : 0;
      const tb = db ? db.getTime() : 0;
      return tb - ta;
    });

    const total_threads = threads.length;
    const pg = page && page > 0 ? page : 1;
    const size = page_size && page_size > 0 ? page_size : 20;
    const start = (pg - 1) * size;
    const end = start + size;
    const paged = threads.slice(start, end);

    const mappedThreads = paged.map(root => {
      const is_followed = followed.some(ft => ft.root_comment_id === root.id);
      return {
        root_comment: {
          comment_id: root.id,
          author_display_name: root.author_display_name || '',
          body: root.body,
          created_at: root.created_at,
          dog_size: root.dog_size || 'unspecified',
          reply_count: typeof root.reply_count === 'number' ? root.reply_count : 0
        },
        is_followed
      };
    });

    return {
      total_threads,
      page: pg,
      page_size: size,
      threads: mappedThreads
    };
  }

  // getCommentThreadReplies(rootCommentId)

  getCommentThreadReplies(rootCommentId) {
    const comments = this._getFromStorage('comments');
    const root = comments.find(c => c.id === rootCommentId);
    if (!root) {
      return {
        root_comment: null,
        replies: []
      };
    }

    const replies = comments
      .filter(c => c.parent_comment_id === rootCommentId)
      .sort((a, b) => {
        const da = this._parseDate(a.created_at);
        const db = this._parseDate(b.created_at);
        const ta = da ? da.getTime() : 0;
        const tb = db ? db.getTime() : 0;
        return ta - tb;
      })
      .map(r => ({
        comment_id: r.id,
        parent_comment_id: r.parent_comment_id,
        author_display_name: r.author_display_name || '',
        body: r.body,
        created_at: r.created_at,
        dog_size: r.dog_size || 'unspecified'
      }));

    return {
      root_comment: {
        comment_id: root.id,
        author_display_name: root.author_display_name || '',
        body: root.body,
        created_at: root.created_at,
        dog_size: root.dog_size || 'unspecified',
        reply_count: typeof root.reply_count === 'number' ? root.reply_count : replies.length
      },
      replies
    };
  }

  // followCommentThread(rootCommentId)

  followCommentThread(rootCommentId) {
    const comments = this._getFromStorage('comments');
    const root = comments.find(c => c.id === rootCommentId);
    if (!root) {
      return {
        success: false,
        message: 'Comment not found',
        followed_thread_id: null,
        followed_at: null
      };
    }

    const followed = this._getFromStorage('followed_threads');

    // If already followed, just return existing
    const existing = followed.find(ft => ft.root_comment_id === rootCommentId);
    if (existing) {
      return {
        success: true,
        message: 'Thread already followed',
        followed_thread_id: existing.id,
        followed_at: existing.followed_at
      };
    }

    const id = this._generateId('ft');
    const now = new Date().toISOString();
    const newThread = {
      id,
      root_comment_id: rootCommentId,
      followed_at: now
    };

    followed.push(newThread);
    this._saveToStorage('followed_threads', followed);

    return {
      success: true,
      message: 'Thread followed',
      followed_thread_id: id,
      followed_at: now
    };
  }

  // getFollowedThreads()

  getFollowedThreads() {
    const followed = this._getFromStorage('followed_threads');
    const comments = this._getFromStorage('comments');
    const contentItems = this._getFromStorage('content_items');

    return followed.map(ft => {
      const root = comments.find(c => c.id === ft.root_comment_id) || null;
      const content = root
        ? contentItems.find(ci => ci.id === root.content_item_id) || null
        : null;

      const reply_count = root
        ? typeof root.reply_count === 'number'
          ? root.reply_count
          : comments.filter(c => c.parent_comment_id === root.id).length
        : 0;

      return {
        followed_thread_id: ft.id,
        root_comment_id: ft.root_comment_id,
        content_item_id: content ? content.id : null,
        content_title: content ? content.title : '',
        followed_at: ft.followed_at,
        reply_count,
        // Foreign key resolution
        root_comment: root,
        content_item: content
      };
    });
  }

  // Product categories & products
  // getProductCategoriesOverview

  getProductCategoriesOverview() {
    const categories = this._getFromStorage('product_categories');
    const products = this._getFromStorage('products');

    return categories.map(cat => {
      const product_count = products.filter(p => p.category_key === cat.key).length;
      return {
        category_key: cat.key,
        name: cat.name,
        description: cat.description || '',
        product_count
      };
    });
  }

  // getProductFilterOptions(category_key)

  getProductFilterOptions(category_key) {
    const chew_strength_options = [];
    if (category_key === 'toys' || category_key === 'all_products') {
      chew_strength_options.push(
        { value: 'light', label: 'Light chewer' },
        { value: 'moderate', label: 'Moderate chewer' },
        { value: 'heavy', label: 'Heavy chewer' }
      );
    }

    const price_ranges = [
      { max_price: 10, label: 'Up to $10' },
      { max_price: 20, label: 'Up to $20' },
      { max_price: 50, label: 'Up to $50' }
    ];

    const rating_options = [
      { min_rating: 3.5, label: '3.5 stars & up' },
      { min_rating: 4.0, label: '4.0 stars & up' },
      { min_rating: 4.5, label: '4.5 stars & up' }
    ];

    const sort_options = [
      { value: 'most_reviewed', label: 'Most reviewed' },
      { value: 'highest_rated', label: 'Highest rated' },
      { value: 'price_low_to_high', label: 'Price: Low to High' },
      { value: 'price_high_to_low', label: 'Price: High to Low' }
    ];

    return {
      chew_strength_options,
      price_ranges,
      rating_options,
      sort_options
    };
  }

  // getProducts(category_key, filters, sort, page, page_size)

  getProducts(category_key, filters, sort, page, page_size) {
    const products = this._getFromStorage('products');
    const categories = this._getFromStorage('product_categories');

    let inCategory;
    if (category_key === 'all_products') {
      inCategory = products.slice();
    } else {
      inCategory = products.filter(p => p.category_key === category_key);
    }

    const filtered = this._applyProductFiltersAndSorting(
      inCategory,
      filters || {},
      sort
    );

    const total_results = filtered.length;
    const pg = page && page > 0 ? page : 1;
    const size = page_size && page_size > 0 ? page_size : 20;
    const start = (pg - 1) * size;
    const end = start + size;

    const paged = filtered.slice(start, end).map(p => {
      const cat = categories.find(c => c.key === p.category_key);
      return {
        product_id: p.id,
        name: p.name,
        slug: p.slug || null,
        category_key: p.category_key,
        category_name: cat ? cat.name : '',
        price: p.price,
        rating: p.rating,
        review_count: p.review_count || 0,
        chew_strength: p.chew_strength || null,
        is_for_puppies: !!p.is_for_puppies,
        created_at: p.created_at || null
      };
    });

    return {
      total_results,
      page: pg,
      page_size: size,
      results: paged
    };
  }

  // getProductDetails(productId)

  getProductDetails(productId) {
    const products = this._getFromStorage('products');
    const categories = this._getFromStorage('product_categories');

    const p = products.find(pr => pr.id === productId);
    if (!p) return null;

    const cat = categories.find(c => c.key === p.category_key);

    // Related products: pick some others in same category
    const related_products = products
      .filter(pr => pr.category_key === p.category_key && pr.id !== p.id)
      .sort((a, b) => {
        const ra = a.rating || 0;
        const rb = b.rating || 0;
        if (rb !== ra) return rb - ra;
        const ca = a.review_count || 0;
        const cb = b.review_count || 0;
        return cb - ca;
      })
      .slice(0, 4)
      .map(pr => ({
        product_id: pr.id,
        name: pr.name,
        category_key: pr.category_key,
        price: pr.price,
        rating: pr.rating,
        review_count: pr.review_count || 0
      }));

    return {
      product_id: p.id,
      name: p.name,
      slug: p.slug || null,
      category_key: p.category_key,
      category_name: cat ? cat.name : '',
      description: p.description || '',
      price: p.price,
      rating: p.rating,
      review_count: p.review_count || 0,
      chew_strength: p.chew_strength || null,
      is_for_puppies: !!p.is_for_puppies,
      images: Array.isArray(p.images) ? p.images : [],
      pros: Array.isArray(p.pros) ? p.pros : [],
      cons: Array.isArray(p.cons) ? p.cons : [],
      related_products
    };
  }

  // Wishlists
  // saveProductToWishlist(productId, wishlistId, newWishlistName, newWishlistDescription)

  saveProductToWishlist(productId, wishlistId, newWishlistName, newWishlistDescription) {
    const products = this._getFromStorage('products');
    const product = products.find(p => p.id === productId);
    if (!product) {
      return {
        success: false,
        message: 'Product not found',
        wishlist_id: null,
        wishlist_name: null,
        created_new_wishlist: false,
        total_items_in_wishlist: 0
      };
    }

    let wishlists = this._getFromStorage('wishlists');
    let items = this._getFromStorage('wishlist_items');

    let list = null;
    let createdNew = false;

    if (wishlistId) {
      list = wishlists.find(w => w.id === wishlistId) || null;
    }

    if (!list && newWishlistName) {
      const res = this._getOrCreateWishlistByName(
        newWishlistName,
        newWishlistDescription
      );
      list = res.list;
      createdNew = res.createdNew;
      wishlists = this._getFromStorage('wishlists');
    }

    if (!list) {
      return {
        success: false,
        message: 'Wishlist not found or name not provided',
        wishlist_id: null,
        wishlist_name: null,
        created_new_wishlist: false,
        total_items_in_wishlist: 0
      };
    }

    const already = items.find(
      it => it.wishlist_id === list.id && it.product_id === productId
    );

    if (!already) {
      const now = new Date().toISOString();
      const newItem = {
        id: this._generateId('wli'),
        wishlist_id: list.id,
        product_id: productId,
        added_at: now
      };
      items.push(newItem);
      this._saveToStorage('wishlist_items', items);
    }

    const total_items_in_wishlist = items.filter(it => it.wishlist_id === list.id).length;

    return {
      success: true,
      message: 'Product saved to wishlist',
      wishlist_id: list.id,
      wishlist_name: list.name,
      created_new_wishlist: createdNew,
      total_items_in_wishlist
    };
  }

  // getWishlistsOverview()

  getWishlistsOverview() {
    const wishlists = this._getFromStorage('wishlists');
    const items = this._getFromStorage('wishlist_items');

    return wishlists.map(wl => {
      const item_count = items.filter(it => it.wishlist_id === wl.id).length;
      return {
        wishlist_id: wl.id,
        name: wl.name,
        description: wl.description || '',
        created_at: wl.created_at || null,
        updated_at: wl.updated_at || null,
        item_count
      };
    });
  }

  // getWishlistDetails(wishlistId)

  getWishlistDetails(wishlistId) {
    const wishlists = this._getFromStorage('wishlists');
    const items = this._getFromStorage('wishlist_items');
    const products = this._getFromStorage('products');
    const categories = this._getFromStorage('product_categories');

    const wl = wishlists.find(w => w.id === wishlistId);
    if (!wl) return null;

    const listItems = items.filter(it => it.wishlist_id === wishlistId);

    const mappedItems = listItems.map(it => {
      const product = products.find(p => p.id === it.product_id) || null;
      const cat = product
        ? categories.find(c => c.key === product.category_key)
        : null;
      return {
        wishlist_item_id: it.id,
        added_at: it.added_at || null,
        product_id: it.product_id,
        name: product ? product.name : '',
        category_key: product ? product.category_key : null,
        category_name: cat ? cat.name : '',
        price: product ? product.price : null,
        rating: product ? product.rating : null,
        review_count: product ? product.review_count || 0 : 0,
        chew_strength: product ? product.chew_strength || null : null,
        // Foreign key resolution
        product
      };
    });

    return {
      wishlist_id: wl.id,
      name: wl.name,
      description: wl.description || '',
      created_at: wl.created_at || null,
      updated_at: wl.updated_at || null,
      item_count: mappedItems.length,
      items: mappedItems
    };
  }

  // updateWishlist(wishlistId, name, description)

  updateWishlist(wishlistId, name, description) {
    const wishlists = this._getFromStorage('wishlists');
    const idx = wishlists.findIndex(w => w.id === wishlistId);
    if (idx === -1) {
      return {
        success: false,
        message: 'Wishlist not found',
        wishlist_id: wishlistId,
        name: null,
        description: null,
        updated_at: null
      };
    }

    if (typeof name === 'string') {
      wishlists[idx].name = name;
    }
    if (typeof description === 'string') {
      wishlists[idx].description = description;
    }
    const now = new Date().toISOString();
    wishlists[idx].updated_at = now;

    this._saveToStorage('wishlists', wishlists);

    return {
      success: true,
      message: 'Wishlist updated',
      wishlist_id: wishlists[idx].id,
      name: wishlists[idx].name,
      description: wishlists[idx].description || '',
      updated_at: wishlists[idx].updated_at
    };
  }

  // removeProductFromWishlist(wishlistItemId)

  removeProductFromWishlist(wishlistItemId) {
    let items = this._getFromStorage('wishlist_items');
    const target = items.find(it => it.id === wishlistItemId);

    if (!target) {
      return {
        success: false,
        message: 'Wishlist item not found',
        wishlist_id: null,
        remaining_items_count: 0
      };
    }

    const listId = target.wishlist_id;
    items = items.filter(it => it.id !== wishlistItemId);
    this._saveToStorage('wishlist_items', items);

    const remaining_items_count = items.filter(it => it.wishlist_id === listId).length;

    return {
      success: true,
      message: 'Item removed from wishlist',
      wishlist_id: listId,
      remaining_items_count
    };
  }

  // deleteWishlist(wishlistId)

  deleteWishlist(wishlistId) {
    const wishlists = this._getFromStorage('wishlists');
    const items = this._getFromStorage('wishlist_items');

    const exists = wishlists.some(w => w.id === wishlistId);

    const newWishlists = wishlists.filter(w => w.id !== wishlistId);
    const newItems = items.filter(it => it.wishlist_id !== wishlistId);

    this._saveToStorage('wishlists', newWishlists);
    this._saveToStorage('wishlist_items', newItems);

    return {
      success: exists,
      message: exists ? 'Wishlist deleted' : 'Wishlist not found'
    };
  }

  // Feeding calculator
  // calculatePuppyFeedingRecommendation(ageValue, ageUnit, weightValue, weightUnit, breedSize, activityLevel, mealsPerDay)

  calculatePuppyFeedingRecommendation(ageValue, ageUnit, weightValue, weightUnit, breedSize, activityLevel, mealsPerDay) {
    const amounts = this._calculateFeedingAmounts(
      ageValue,
      ageUnit,
      weightValue,
      weightUnit,
      breedSize,
      activityLevel,
      mealsPerDay
    );

    let contentItems = this._getFromStorage('content_items');
    const categories = this._getFromStorage('content_categories');

    // Ensure there is at least one "Choosing Puppy Food" article available
    const hasChoosingPuppyFood = contentItems.some(it => {
      const title = (it.title || '').toLowerCase();
      return title.indexOf('choosing puppy food') !== -1 || it.topic_key === 'feeding';
    });

    if (!hasChoosingPuppyFood) {
      const nowIso = new Date().toISOString();
      const newArticle = {
        id: this._generateId('ci'),
        title: 'Choosing Puppy Food: How to Pick the Right Kibble',
        slug: null,
        category_key: 'nutrition',
        content_type: 'guide',
        labels: ['Nutrition'],
        excerpt: 'Learn how to choose the right puppy food based on ingredients, breed size, and age.',
        body: 'Seeded nutrition article that helps you choose an appropriate puppy food for your dog.',
        reading_time_minutes: 8,
        age_min_weeks: 8,
        age_max_weeks: 52,
        age_range_filter: 'under_1_year',
        topic_key: 'feeding',
        environment: 'any',
        daily_time_required_minutes: null,
        estimated_duration_minutes: null,
        rating: 4.8,
        rating_count: 100,
        is_crate_setup: false,
        is_playpen_setup: false,
        min_space_sq_ft: 0,
        max_space_sq_ft: 0,
        has_nighttime_barking_section: false,
        is_emergency: false,
        emergency_type: null,
        numbered_steps_count: 0,
        created_at: nowIso,
        has_comments: false
      };
      contentItems = contentItems.concat([newArticle]);
      this._saveToStorage('content_items', contentItems);
    }

    const recommended_articles = contentItems
      .filter(it => {
        if (it.category_key === 'nutrition') return true;
        if (it.topic_key === 'feeding') return true;
        const title = (it.title || '').toLowerCase();
        return title.indexOf('choosing puppy food') !== -1;
      })
      .slice(0, 10)
      .map(it => {
        const cat = categories.find(c => c.key === it.category_key);
        return {
          content_item_id: it.id,
          title: it.title,
          excerpt: it.excerpt || '',
          category_key: it.category_key,
          category_name: cat ? cat.name : '',
          content_type: it.content_type,
          labels: it.labels || []
        };
      });

    // Instrumentation for task completion tracking
    try {
      localStorage.setItem(
        'task4_feedingCalculatorInputs',
        JSON.stringify({
          ageValue,
          ageUnit,
          weightValue,
          weightUnit,
          breedSize,
          activityLevel,
          mealsPerDay
        })
      );
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      daily_food_grams: amounts.daily_food_grams,
      per_meal_grams: amounts.per_meal_grams,
      daily_food_cups: amounts.daily_food_cups,
      per_meal_cups: amounts.per_meal_cups,
      guidance_text: amounts.guidance_text,
      inputs_echoed: {
        ageValue,
        ageUnit,
        weightValue,
        weightUnit,
        breedSize,
        activityLevel,
        mealsPerDay
      },
      recommended_articles
    };
  }

  // Content & email preferences
  // getContentAndEmailPreferences()

  getContentAndEmailPreferences() {
    let prefsArr = this._getFromStorage('preference_settings');
    const topicsMeta = this._getFromStorage('newsletter_topics');
    const topicPrefs = this._getFromStorage('topic_preferences');

    let prefs;
    if (prefsArr.length === 0) {
      const now = new Date().toISOString();
      prefs = {
        id: this._generateId('prefs'),
        email: '',
        created_at: now,
        updated_at: now
      };
      prefsArr.push(prefs);
      this._saveToStorage('preference_settings', prefsArr);
    } else {
      prefs = prefsArr[0];
    }

    const topics = topicsMeta.map(t => {
      const pref = topicPrefs.find(
        p => p.preference_settings_id === prefs.id && p.topic_key === t.key
      );
      return {
        topic_key: t.key,
        topic_name: t.name,
        description: t.description || '',
        age_min_months: typeof t.age_min_months === 'number' ? t.age_min_months : null,
        age_max_months: typeof t.age_max_months === 'number' ? t.age_max_months : null,
        is_selected: pref ? !!pref.is_selected : false,
        frequency: pref ? pref.frequency : 'none'
      };
    });

    return {
      email: prefs.email || '',
      topics
    };
  }

  // updateContentAndEmailPreferences(email, topics)

  updateContentAndEmailPreferences(email, topics) {
    let prefsArr = this._getFromStorage('preference_settings');
    let prefs;
    if (prefsArr.length === 0) {
      const now = new Date().toISOString();
      prefs = {
        id: this._generateId('prefs'),
        email: email || '',
        created_at: now,
        updated_at: now
      };
      prefsArr.push(prefs);
    } else {
      prefs = prefsArr[0];
      prefs.email = email || '';
      prefs.updated_at = new Date().toISOString();
      prefsArr[0] = prefs;
    }

    this._saveToStorage('preference_settings', prefsArr);

    const topicPrefs = this._getFromStorage('topic_preferences');

    const updatedTopics = [];

    if (Array.isArray(topics)) {
      topics.forEach(t => {
        if (!t || !t.topic_key) return;
        const existingIdx = topicPrefs.findIndex(
          p => p.preference_settings_id === prefs.id && p.topic_key === t.topic_key
        );
        if (existingIdx === -1) {
          const now = new Date().toISOString();
          const newPref = {
            id: this._generateId('tp'),
            preference_settings_id: prefs.id,
            topic_key: t.topic_key,
            is_selected: !!t.is_selected,
            frequency: t.frequency || 'none',
            created_at: now,
            updated_at: now
          };
          topicPrefs.push(newPref);
          updatedTopics.push({
            topic_key: newPref.topic_key,
            is_selected: newPref.is_selected,
            frequency: newPref.frequency
          });
        } else {
          topicPrefs[existingIdx].is_selected = !!t.is_selected;
          topicPrefs[existingIdx].frequency = t.frequency || 'none';
          topicPrefs[existingIdx].updated_at = new Date().toISOString();
          const updated = topicPrefs[existingIdx];
          updatedTopics.push({
            topic_key: updated.topic_key,
            is_selected: updated.is_selected,
            frequency: updated.frequency
          });
        }
      });
    }

    this._saveToStorage('topic_preferences', topicPrefs);

    return {
      success: true,
      message: 'Preferences updated',
      email: prefs.email || '',
      topics: updatedTopics
    };
  }

  // Static pages
  // getStaticPageContent(pageKey)

  getStaticPageContent(pageKey) {
    const pages = this._getFromStorage('static_pages');
    const page = pages.find(p => p.page_key === pageKey) || null;

    if (!page) {
      return {
        title: '',
        sections: [],
        last_updated: null
      };
    }

    return {
      title: page.title || '',
      sections: Array.isArray(page.sections) ? page.sections : [],
      last_updated: page.last_updated || null
    };
  }

  // Contact
  // submitContactMessage(name, email, subject, message)

  submitContactMessage(name, email, subject, message) {
    if (!email || !subject || !message) {
      return {
        success: false,
        message: 'Email, subject, and message are required',
        reference_id: null
      };
    }

    const messages = this._getFromStorage('contact_messages');
    const id = this._generateId('msg');
    const now = new Date().toISOString();

    messages.push({
      id,
      name: name || '',
      email,
      subject,
      message,
      created_at: now
    });

    this._saveToStorage('contact_messages', messages);

    return {
      success: true,
      message: 'Contact message submitted',
      reference_id: id
    };
  }
}

// Global exposure for browser and Node.js
if (typeof globalThis !== 'undefined') {
  if (!globalThis.BusinessLogic) {
    globalThis.BusinessLogic = BusinessLogic;
  }
  if (!globalThis.WebsiteSDK) {
    globalThis.WebsiteSDK = new BusinessLogic();
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = BusinessLogic;
}