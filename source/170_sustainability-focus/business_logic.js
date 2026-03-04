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
    this.idCounter = this._getNextIdCounter();
  }

  // ------------------------
  // Storage helpers
  // ------------------------

  _initStorage() {
    const ensureArrayKey = (key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, '[]');
      }
    };

    const ensureNullableKey = (key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, 'null');
      }
    };

    // Core entity tables
    ensureArrayKey('articles');
    ensureArrayKey('reading_list_items');
    ensureArrayKey('bookmark_items');
    ensureArrayKey('reading_plan_items');
    ensureNullableKey('newsletter_subscriptions');
    ensureArrayKey('comments');
    ensureArrayKey('comment_upvotes');
    ensureArrayKey('article_checklist_states');
    ensureArrayKey('challenges');
    ensureArrayKey('joined_challenges');
    ensureNullableKey('feed_preferences');
    ensureArrayKey('directory_brands');
    ensureArrayKey('favorite_brands');
    ensureArrayKey('static_pages');
    ensureArrayKey('contact_messages');

    // ID counter
    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _ensureSeedArticles(existing) {
    const articles = Array.isArray(existing) ? existing.slice() : [];
    const ensure = (article) => {
      if (!article || !article.id) return;
      if (!articles.find((a) => a && a.id === article.id)) {
        articles.push(article);
      }
    };

    // Seed climate policy article that matches existing comments/tests
    ensure({
      id: 'article_climate_policy_2026_bill',
      title: 'What the 2026 Climate Policy Bill Means for Your City',
      slug: 'climate-policy-2026-bill-breakdown',
      topic: 'climate',
      tags: ['policy', 'transit', 'buildings'],
      difficulty: 'intermediate',
      content_type: 'article',
      publish_date: '2026-02-20T09:00:00Z',
      popularity_score: 90,
      rating: 4.6,
      rating_count: 540,
      estimated_reading_time_minutes: 12,
      author_name: 'Riley Thompson',
      summary: 'A plain-language breakdown of the 2026 climate policy bill, funding, and timelines for cities.',
      body: 'The 2026 climate policy bill packages transit upgrades, building efficiency programs, and resilience funding...',
      hero_image_url: '',
      is_active: true,
      created_at: '2026-02-18T10:00:00Z',
      updated_at: '2026-02-22T10:00:00Z'
    });

    // Seed at least two sustainable fashion guides
    ensure({
      id: 'article_sustainable_capsule_wardrobe_guide',
      title: 'Build a Sustainable Capsule Wardrobe on a Budget',
      slug: 'sustainable-capsule-wardrobe-guide',
      topic: 'fashion',
      tags: ['capsule_wardrobe', 'budget', 'guide'],
      difficulty: 'beginner',
      content_type: 'guide',
      publish_date: '2024-06-10T09:00:00Z',
      popularity_score: 80,
      rating: 4.8,
      rating_count: 420,
      estimated_reading_time_minutes: 10,
      author_name: 'Leah Park',
      summary: 'Step-by-step guide to creating a versatile, sustainable wardrobe with fewer, better pieces.',
      body: 'Creating a sustainable capsule wardrobe starts with...',
      hero_image_url: '',
      is_active: true,
      created_at: '2024-06-05T09:00:00Z',
      updated_at: '2024-06-12T09:00:00Z'
    });

    ensure({
      id: 'article_thrift_store_pro_sourcing_guide',
      title: 'Thrift Store Pro: Sourcing Quality Secondhand Clothes',
      slug: 'thrift-store-pro-sourcing-guide',
      topic: 'fashion',
      tags: ['thrifting', 'secondhand', 'guide'],
      difficulty: 'beginner',
      content_type: 'guide',
      publish_date: '2024-04-15T09:00:00Z',
      popularity_score: 75,
      rating: 4.7,
      rating_count: 310,
      estimated_reading_time_minutes: 11,
      author_name: 'Sam Rivera',
      summary: 'Learn how to quickly spot high-quality pieces at thrift and consignment shops.',
      body: 'Secondhand shopping can be overwhelming, but with a few techniques...',
      hero_image_url: '',
      is_active: true,
      created_at: '2024-04-10T09:00:00Z',
      updated_at: '2024-04-18T09:00:00Z'
    });

    // Seed vinegar-based DIY cleaning spray recipe
    ensure({
      id: 'article_vinegar_citrus_all_purpose_spray',
      title: 'DIY Natural Cleaning Spray Vinegar Recipe',
      slug: 'diy-vinegar-citrus-all-purpose-spray',
      topic: 'home_garden',
      tags: ['cleaning', 'vinegar', 'natural_cleaning'],
      difficulty: 'beginner',
      content_type: 'diy_recipe',
      publish_date: '2024-02-01T09:00:00Z',
      popularity_score: 70,
      rating: 4.5,
      rating_count: 150,
      estimated_reading_time_minutes: 8,
      estimated_ingredient_cost: 4.5,
      author_name: 'Jordan Lee',
      summary: 'Low-cost natural cleaning spray vinegar recipe for all-purpose home cleaning.',
      body: 'This all-purpose spray works on most sealed surfaces...',
      hero_image_url: '',
      ingredients: [
        'White vinegar',
        'Citrus peels',
        'Water',
        'Spray bottles (16oz glass)'
      ],
      is_active: true,
      created_at: '2024-01-25T09:00:00Z',
      updated_at: '2024-02-05T09:00:00Z'
    });

    // Seed beginner energy article
    ensure({
      id: 'article_home_energy_saving_basics',
      title: 'Home Energy Saving Basics for Beginners',
      slug: 'home-energy-saving-basics-beginners',
      topic: 'energy',
      tags: ['efficiency', 'beginner'],
      difficulty: 'beginner',
      content_type: 'article',
      publish_date: '2024-03-05T09:00:00Z',
      popularity_score: 65,
      rating: 4.4,
      rating_count: 200,
      estimated_reading_time_minutes: 9,
      author_name: 'Alex Chen',
      summary: 'Simple steps to cut your home energy use and lower emissions.',
      body: 'Small changes in how you heat, cool, and power your home can add up...',
      hero_image_url: '',
      is_active: true,
      created_at: '2024-03-01T09:00:00Z',
      updated_at: '2024-03-10T09:00:00Z'
    });

    // Seed beginner food & recipes article
    ensure({
      id: 'article_low_waste_meal_prep_beginners',
      title: 'Low-Waste Meal Prep for Beginners',
      slug: 'low-waste-meal-prep-beginners',
      topic: 'food_recipes',
      tags: ['meal_prep', 'beginner'],
      difficulty: 'beginner',
      content_type: 'article',
      publish_date: '2024-01-20T09:00:00Z',
      popularity_score: 60,
      rating: 4.3,
      rating_count: 180,
      estimated_reading_time_minutes: 10,
      author_name: 'Priya Patel',
      summary: 'Plan meals that save time, money, and reduce food waste.',
      body: 'Meal prep can dramatically cut food waste when done thoughtfully...',
      hero_image_url: '',
      is_active: true,
      created_at: '2024-01-15T09:00:00Z',
      updated_at: '2024-01-25T09:00:00Z'
    });

    // Seed a zero waste article to support feed preferences
    ensure({
      id: 'article_zero_waste_starter_kit',
      title: 'Zero Waste Starter Kit: 5 Swaps to Begin With',
      slug: 'zero-waste-starter-kit-5-swaps',
      topic: 'zero_waste',
      tags: ['zero_waste', 'beginner'],
      difficulty: 'beginner',
      content_type: 'article',
      publish_date: '2024-02-10T09:00:00Z',
      popularity_score: 68,
      rating: 4.5,
      rating_count: 260,
      estimated_reading_time_minutes: 7,
      author_name: 'Nia Gomez',
      summary: 'Get started with five easy zero-waste swaps you can make this month.',
      body: 'Going zero waste does not mean fitting a year of trash into a jar...',
      hero_image_url: '',
      is_active: true,
      created_at: '2024-02-05T09:00:00Z',
      updated_at: '2024-02-12T09:00:00Z'
    });

    if (articles.length !== (Array.isArray(existing) ? existing.length : 0)) {
      // Persist seeded articles so subsequent reads are consistent
      localStorage.setItem('articles', JSON.stringify(articles));
    }

    return articles;
  }

  _getFromStorage(key, fallback = []) {
    const raw = localStorage.getItem(key);
    if (raw === null || typeof raw === 'undefined') {
      return fallback !== undefined ? fallback : [];
    }
    try {
      const parsed = JSON.parse(raw);
      if (parsed === null && fallback !== undefined) {
        return fallback;
      }
      if (key === 'articles' && Array.isArray(parsed)) {
        return this._ensureSeedArticles(parsed);
      }
      return parsed;
    } catch (e) {
      return fallback !== undefined ? fallback : [];
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

  // ------------------------
  // Internal helpers (from spec)
  // ------------------------

  _getOrInitializeFeedPreferences() {
    let prefs = this._getFromStorage('feed_preferences', null);
    if (!prefs) {
      prefs = {
        id: this._generateId('feedpref'),
        selected_topics: [],
        deprioritized_topics: [],
        content_mix: 'balanced',
        article_length_preference: 'all_lengths',
        updated_at: new Date().toISOString()
      };
      this._saveToStorage('feed_preferences', prefs);
    }
    return prefs;
  }

  _getOrInitializeReadingList() {
    let list = this._getFromStorage('reading_list_items', null);
    if (!Array.isArray(list)) {
      list = [];
      this._saveToStorage('reading_list_items', list);
    }
    return list;
  }

  _getOrInitializeReadingPlan() {
    let list = this._getFromStorage('reading_plan_items', null);
    if (!Array.isArray(list)) {
      list = [];
      this._saveToStorage('reading_plan_items', list);
    }
    return list;
  }

  _getOrInitializeFavorites() {
    let list = this._getFromStorage('favorite_brands', null);
    if (!Array.isArray(list)) {
      list = [];
      this._saveToStorage('favorite_brands', list);
    }
    return list;
  }

  _getOrInitializeNewsletterSubscription() {
    let sub = this._getFromStorage('newsletter_subscriptions', null);
    if (!sub) {
      sub = null;
    }
    return sub;
  }

  _getOrInitializeJoinedChallenges() {
    let list = this._getFromStorage('joined_challenges', null);
    if (!Array.isArray(list)) {
      list = [];
      this._saveToStorage('joined_challenges', list);
    }
    return list;
  }

  // Utility: categorize article length
  _getArticleLengthCategory(article) {
    const minutes = article && typeof article.estimated_reading_time_minutes === 'number'
      ? article.estimated_reading_time_minutes
      : null;
    if (minutes === null) {
      return 'medium';
    }
    if (minutes <= 7) return 'short';
    if (minutes <= 15) return 'medium';
    return 'long';
  }

  _computeArticleMatchScore(article, feedPrefs) {
    if (!article || !feedPrefs) return { score: 0, reasons: [] };
    let score = 0;
    const reasons = [];

    const selected = Array.isArray(feedPrefs.selected_topics) ? feedPrefs.selected_topics : [];
    const deprioritized = Array.isArray(feedPrefs.deprioritized_topics) ? feedPrefs.deprioritized_topics : [];

    const inSelected = selected.includes(article.topic);
    const inDeprioritized = deprioritized.includes(article.topic);

    if (inSelected) {
      score += 3;
      reasons.push('topic_match');
    }
    if (inDeprioritized) {
      score -= 2;
      reasons.push('deprioritized_topic');
    }

    if (feedPrefs.content_mix === 'more_from_my_topics') {
      if (inSelected) {
        score += 2;
        reasons.push('content_mix_more_from_my_topics');
      }
    } else if (feedPrefs.content_mix === 'more_variety') {
      if (!inSelected) {
        score += 1;
        reasons.push('content_mix_more_variety');
      }
    }

    const lengthPref = feedPrefs.article_length_preference || 'all_lengths';
    const lengthCat = this._getArticleLengthCategory(article);

    if (lengthPref === 'short_only') {
      if (lengthCat === 'short') {
        score += 1;
        reasons.push('length_short');
      } else {
        score -= 1;
      }
    } else if (lengthPref === 'medium_only') {
      if (lengthCat === 'medium') {
        score += 1;
        reasons.push('length_medium');
      } else {
        score -= 1;
      }
    } else if (lengthPref === 'short_and_medium') {
      if (lengthCat === 'short' || lengthCat === 'medium') {
        score += 1;
        reasons.push('length_short_or_medium');
      } else {
        score -= 1;
      }
    } else if (lengthPref === 'long_only') {
      if (lengthCat === 'long') {
        score += 1;
        reasons.push('length_long');
      } else {
        score -= 1;
      }
    }

    if (typeof article.popularity_score === 'number') {
      score += article.popularity_score / 1000;
      reasons.push('popularity_signal');
    }

    return { score, reasons };
  }

  // ------------------------
  // Interface implementations
  // ------------------------

  // getHomepageContent(recommended_limit = 10, include_recommendations = true)
  getHomepageContent(recommended_limit = 10, include_recommendations = true) {
    const articles = this._getFromStorage('articles', []);
    const challenges = this._getFromStorage('challenges', []);

    const activeArticles = articles.filter((a) => a && a.is_active);

    const featured_articles = activeArticles
      .slice()
      .sort((a, b) => {
        const pa = typeof a.popularity_score === 'number' ? a.popularity_score : 0;
        const pb = typeof b.popularity_score === 'number' ? b.popularity_score : 0;
        return pb - pa;
      })
      .slice(0, 3);

    const latest_articles = activeArticles
      .slice()
      .sort((a, b) => {
        const da = a.publish_date ? Date.parse(a.publish_date) : 0;
        const db = b.publish_date ? Date.parse(b.publish_date) : 0;
        return db - da;
      })
      .slice(0, 10);

    const highlighted_challenges = challenges
      .filter((c) => c && c.status === 'published' && c.is_featured)
      .slice()
      .sort((a, b) => {
        const da = a.start_date ? Date.parse(a.start_date) : 0;
        const db = b.start_date ? Date.parse(b.start_date) : 0;
        return da - db;
      })
      .slice(0, 5);

    let recommended_articles = [];
    if (include_recommendations) {
      const feedPrefs = this._getOrInitializeFeedPreferences();
      const scored = activeArticles.map((article) => {
        const { score, reasons } = this._computeArticleMatchScore(article, feedPrefs);
        return { article, match_score: score, reasons };
      });
      scored.sort((a, b) => {
        if (b.match_score !== a.match_score) {
          return b.match_score - a.match_score;
        }
        const da = a.article.publish_date ? Date.parse(a.article.publish_date) : 0;
        const db = b.article.publish_date ? Date.parse(b.article.publish_date) : 0;
        return db - da;
      });
      recommended_articles = scored.slice(0, recommended_limit);
    }

    return {
      featured_articles,
      latest_articles,
      highlighted_challenges,
      recommended_articles
    };
  }

  // getRecommendedFeed(page = 1, page_size = 10)
  getRecommendedFeed(page = 1, page_size = 10) {
    const articles = this._getFromStorage('articles', []);
    const activeArticles = articles.filter((a) => a && a.is_active);
    const feedPrefs = this._getOrInitializeFeedPreferences();

    const scored = activeArticles.map((article) => {
      const { score } = this._computeArticleMatchScore(article, feedPrefs);
      return { article, score };
    });

    scored.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const da = a.article.publish_date ? Date.parse(a.article.publish_date) : 0;
      const db = b.article.publish_date ? Date.parse(b.article.publish_date) : 0;
      return db - da;
    });

    const start = (page - 1) * page_size;
    const end = start + page_size;
    const slice = scored.slice(start, end).map((s) => s.article);

    return {
      items: slice,
      page,
      page_size,
      has_more: end < scored.length
    };
  }

  // getTopicsOverview()
  getTopicsOverview() {
    return [
      {
        topic_id: 'climate',
        name: 'Climate',
        slug: 'climate',
        description: 'Climate science, impacts, and policy.',
        is_popular: true,
        recommended_for_beginners: true
      },
      {
        topic_id: 'home_garden',
        name: 'Home & Garden',
        slug: 'home-garden',
        description: 'Sustainable living, composting, and gardening at home.',
        is_popular: true,
        recommended_for_beginners: true
      },
      {
        topic_id: 'fashion',
        name: 'Fashion',
        slug: 'fashion',
        description: 'Sustainable fashion and ethical style.',
        is_popular: true,
        recommended_for_beginners: false
      },
      {
        topic_id: 'energy',
        name: 'Energy',
        slug: 'energy',
        description: 'Renewable energy and efficiency.',
        is_popular: false,
        recommended_for_beginners: true
      },
      {
        topic_id: 'food_recipes',
        name: 'Food & Recipes',
        slug: 'food-recipes',
        description: 'Low-waste cooking and sustainable food.',
        is_popular: true,
        recommended_for_beginners: true
      },
      {
        topic_id: 'zero_waste',
        name: 'Zero Waste',
        slug: 'zero-waste',
        description: 'Reduce waste and live more lightly.',
        is_popular: true,
        recommended_for_beginners: true
      },
      {
        topic_id: 'travel',
        name: 'Travel',
        slug: 'travel',
        description: 'Lower impact travel and transport.',
        is_popular: false,
        recommended_for_beginners: false
      },
      {
        topic_id: 'lifestyle',
        name: 'Lifestyle',
        slug: 'lifestyle',
        description: 'Everyday sustainable living.',
        is_popular: false,
        recommended_for_beginners: true
      },
      {
        topic_id: 'other',
        name: 'Other',
        slug: 'other',
        description: 'Miscellaneous sustainability topics.',
        is_popular: false,
        recommended_for_beginners: false
      }
    ];
  }

  // getTopicFilterOptions(topic)
  getTopicFilterOptions(topic) {
    const articles = this._getFromStorage('articles', []);
    const topicArticles = articles.filter((a) => a && a.topic === topic && a.is_active);

    const tagSet = new Set();
    topicArticles.forEach((a) => {
      if (Array.isArray(a.tags)) {
        a.tags.forEach((t) => tagSet.add(t));
      }
    });

    let minDate = null;
    let maxDate = null;
    topicArticles.forEach((a) => {
      if (a.publish_date) {
        const d = Date.parse(a.publish_date);
        if (!minDate || d < minDate) minDate = d;
        if (!maxDate || d > maxDate) maxDate = d;
      }
    });

    const now = Date.now();
    const default_date_from = minDate ? new Date(minDate).toISOString() : new Date(now - 365 * 24 * 60 * 60 * 1000).toISOString();
    const default_date_to = maxDate ? new Date(maxDate).toISOString() : new Date(now).toISOString();

    return {
      available_tags: Array.from(tagSet),
      difficulties: ['beginner', 'intermediate', 'advanced'],
      content_types: ['article', 'guide', 'diy_recipe'],
      default_date_from,
      default_date_to,
      sorting_options: ['most_popular', 'most_recent', 'highest_rated']
    };
  }

  // getTopicArticles(topic, filters = {}, sort = 'most_recent', page = 1, page_size = 20)
  getTopicArticles(topic, filters = {}, sort = 'most_recent', page = 1, page_size = 20) {
    const articles = this._getFromStorage('articles', []);
    let list = articles.filter((a) => a && a.topic === topic && a.is_active);

    if (filters) {
      if (filters.tags && Array.isArray(filters.tags) && filters.tags.length > 0) {
        list = list.filter((a) => {
          const articleTags = Array.isArray(a.tags) ? a.tags : [];
          return filters.tags.every((t) => articleTags.includes(t));
        });
      }
      if (filters.difficulty) {
        list = list.filter((a) => a.difficulty === filters.difficulty);
      }
      if (filters.content_type) {
        list = list.filter((a) => a.content_type === filters.content_type);
      }
      if (filters.date_from) {
        const df = Date.parse(filters.date_from);
        list = list.filter((a) => !a.publish_date || Date.parse(a.publish_date) >= df);
      }
      if (filters.date_to) {
        const dt = Date.parse(filters.date_to);
        list = list.filter((a) => !a.publish_date || Date.parse(a.publish_date) <= dt);
      }
    }

    if (sort === 'most_popular') {
      list.sort((a, b) => {
        const pa = typeof a.popularity_score === 'number' ? a.popularity_score : 0;
        const pb = typeof b.popularity_score === 'number' ? b.popularity_score : 0;
        return pb - pa;
      });
    } else if (sort === 'highest_rated') {
      list.sort((a, b) => {
        const ra = typeof a.rating === 'number' ? a.rating : 0;
        const rb = typeof b.rating === 'number' ? b.rating : 0;
        if (rb !== ra) return rb - ra;
        const ca = typeof a.rating_count === 'number' ? a.rating_count : 0;
        const cb = typeof b.rating_count === 'number' ? b.rating_count : 0;
        return cb - ca;
      });
    } else {
      list.sort((a, b) => {
        const da = a.publish_date ? Date.parse(a.publish_date) : 0;
        const db = b.publish_date ? Date.parse(b.publish_date) : 0;
        return db - da;
      });
    }

    const total = list.length;
    const start = (page - 1) * page_size;
    const end = start + page_size;
    const paged = list.slice(start, end);

    return {
      articles: paged,
      page,
      page_size,
      total
    };
  }

  // getArticleDetail(articleId)
  getArticleDetail(articleId) {
    const articles = this._getFromStorage('articles', []);
    const article = articles.find((a) => a && a.id === articleId) || null;

    let related_articles = [];
    if (article) {
      const sameTopic = articles.filter((a) => a && a.id !== article.id && a.topic === article.topic && a.is_active);
      sameTopic.sort((a, b) => {
        let scoreA = 0;
        let scoreB = 0;
        const tagsA = Array.isArray(a.tags) ? a.tags : [];
        const tagsB = Array.isArray(b.tags) ? b.tags : [];
        const baseTags = Array.isArray(article.tags) ? article.tags : [];
        baseTags.forEach((t) => {
          if (tagsA.includes(t)) scoreA += 1;
          if (tagsB.includes(t)) scoreB += 1;
        });
        const pa = typeof a.popularity_score === 'number' ? a.popularity_score : 0;
        const pb = typeof b.popularity_score === 'number' ? b.popularity_score : 0;
        scoreA += pa / 1000;
        scoreB += pb / 1000;
        return scoreB - scoreA;
      });
      related_articles = sameTopic.slice(0, 5);
    }

    return { article, related_articles };
  }

  // getArticleChecklistState(articleId)
  getArticleChecklistState(articleId) {
    const states = this._getFromStorage('article_checklist_states', []);
    const articles = this._getFromStorage('articles', []);
    const state = states.find((s) => s && s.article_id === articleId) || null;
    if (!state) return null;
    const article = articles.find((a) => a && a.id === articleId) || null;
    return Object.assign({}, state, { article });
  }

  // saveArticleChecklistState(articleId, checked_items, spray_bottles_quantity)
  saveArticleChecklistState(articleId, checked_items, spray_bottles_quantity) {
    let states = this._getFromStorage('article_checklist_states', []);
    const now = new Date().toISOString();
    const idx = states.findIndex((s) => s && s.article_id === articleId);

    if (idx >= 0) {
      const existing = states[idx];
      states[idx] = Object.assign({}, existing, {
        checked_items: Array.isArray(checked_items) ? checked_items : existing.checked_items,
        spray_bottles_quantity: typeof spray_bottles_quantity === 'number'
          ? spray_bottles_quantity
          : existing.spray_bottles_quantity,
        saved_at: now
      });
    } else {
      const newState = {
        id: this._generateId('acs'),
        article_id: articleId,
        checked_items: Array.isArray(checked_items) ? checked_items : [],
        spray_bottles_quantity: typeof spray_bottles_quantity === 'number' ? spray_bottles_quantity : undefined,
        saved_at: now
      };
      states.push(newState);
    }

    this._saveToStorage('article_checklist_states', states);
    const saved = states.find((s) => s && s.article_id === articleId) || null;
    return { success: !!saved, checklist_state: saved };
  }

  // getArticleComments(articleId, sort = 'newest_first')
  getArticleComments(articleId, sort = 'newest_first') {
    const comments = this._getFromStorage('comments', []);
    const articles = this._getFromStorage('articles', []);

    let list = comments.filter((c) => c && c.article_id === articleId);

    if (sort === 'oldest_first') {
      list.sort((a, b) => {
        const da = a.created_at ? Date.parse(a.created_at) : 0;
        const db = b.created_at ? Date.parse(b.created_at) : 0;
        return da - db;
      });
    } else if (sort === 'top_upvoted') {
      list.sort((a, b) => {
        const ua = typeof a.upvote_count === 'number' ? a.upvote_count : 0;
        const ub = typeof b.upvote_count === 'number' ? b.upvote_count : 0;
        if (ub !== ua) return ub - ua;
        const da = a.created_at ? Date.parse(a.created_at) : 0;
        const db = b.created_at ? Date.parse(b.created_at) : 0;
        return db - da;
      });
    } else {
      list.sort((a, b) => {
        const da = a.created_at ? Date.parse(a.created_at) : 0;
        const db = b.created_at ? Date.parse(b.created_at) : 0;
        return db - da;
      });
    }

    const article = articles.find((a) => a && a.id === articleId) || null;
    return list.map((c) => Object.assign({}, c, { article }));
  }

  // postArticleComment(articleId, text, author_display_name)
  postArticleComment(articleId, text, author_display_name) {
    const comments = this._getFromStorage('comments', []);
    const now = new Date().toISOString();
    const comment = {
      id: this._generateId('cmt'),
      article_id: articleId,
      text: text,
      author_display_name: author_display_name || null,
      created_at: now,
      upvote_count: 0,
      is_by_site_author: false
    };
    comments.push(comment);
    this._saveToStorage('comments', comments);
    return { success: true, comment };
  }

  // upvoteComment(commentId)
  upvoteComment(commentId) {
    const comments = this._getFromStorage('comments', []);
    const upvotes = this._getFromStorage('comment_upvotes', []);

    const comment = comments.find((c) => c && c.id === commentId) || null;
    if (!comment) {
      return { success: false, upvote: null, updated_upvote_count: 0 };
    }

    const existing = upvotes.find((u) => u && u.comment_id === commentId) || null;
    if (existing) {
      return {
        success: true,
        upvote: existing,
        updated_upvote_count: typeof comment.upvote_count === 'number' ? comment.upvote_count : 0
      };
    }

    const now = new Date().toISOString();
    const upvote = {
      id: this._generateId('cup'),
      comment_id: commentId,
      created_at: now
    };
    upvotes.push(upvote);

    comment.upvote_count = (typeof comment.upvote_count === 'number' ? comment.upvote_count : 0) + 1;

    this._saveToStorage('comment_upvotes', upvotes);
    this._saveToStorage('comments', comments);

    return {
      success: true,
      upvote,
      updated_upvote_count: comment.upvote_count
    };
  }

  // saveArticleToReadingList(articleId, source)
  saveArticleToReadingList(articleId, source) {
    const articles = this._getFromStorage('articles', []);
    const article = articles.find((a) => a && a.id === articleId) || null;
    if (!article) {
      return { success: false, reading_list_item: null, total_saved: this._getOrInitializeReadingList().length };
    }

    let list = this._getOrInitializeReadingList();
    const existing = list.find((i) => i && i.article_id === articleId) || null;
    if (existing) {
      return { success: true, reading_list_item: existing, total_saved: list.length };
    }

    const now = new Date().toISOString();
    const item = {
      id: this._generateId('rli'),
      article_id: articleId,
      saved_at: now,
      source: source || 'other'
    };
    list.push(item);
    this._saveToStorage('reading_list_items', list);

    return { success: true, reading_list_item: item, total_saved: list.length };
  }

  // removeArticleFromReadingList(articleId)
  removeArticleFromReadingList(articleId) {
    let list = this._getOrInitializeReadingList();
    list = list.filter((i) => i && i.article_id !== articleId);
    this._saveToStorage('reading_list_items', list);
    return { success: true, total_saved: list.length };
  }

  // getReadingList(filters)
  getReadingList(filters = {}) {
    const list = this._getOrInitializeReadingList();
    const articles = this._getFromStorage('articles', []);

    return list
      .map((item) => {
        const article = articles.find((a) => a && a.id === item.article_id) || null;
        return { item, article };
      })
      .filter(({ article }) => {
        if (!article) return false;
        if (filters.topic && article.topic !== filters.topic) return false;
        if (filters.content_type && article.content_type !== filters.content_type) return false;
        return true;
      })
      .map(({ item, article }) => ({
        article,
        saved_at: item.saved_at,
        source: item.source
      }));
  }

  // bookmarkArticle(articleId, source)
  bookmarkArticle(articleId, source) {
    const articles = this._getFromStorage('articles', []);
    const article = articles.find((a) => a && a.id === articleId) || null;
    if (!article) {
      return { success: false, bookmark: null, total_bookmarks: this._getFromStorage('bookmark_items', []).length };
    }

    let list = this._getFromStorage('bookmark_items', []);
    const existing = list.find((b) => b && b.article_id === articleId) || null;
    if (existing) {
      return { success: true, bookmark: existing, total_bookmarks: list.length };
    }

    const now = new Date().toISOString();
    const bookmark = {
      id: this._generateId('bm'),
      article_id: articleId,
      bookmarked_at: now,
      source: source || 'other'
    };
    list.push(bookmark);
    this._saveToStorage('bookmark_items', list);

    return { success: true, bookmark, total_bookmarks: list.length };
  }

  // removeBookmark(articleId)
  removeBookmark(articleId) {
    let list = this._getFromStorage('bookmark_items', []);
    list = list.filter((b) => b && b.article_id !== articleId);
    this._saveToStorage('bookmark_items', list);
    return { success: true, total_bookmarks: list.length };
  }

  // getBookmarks()
  getBookmarks() {
    const list = this._getFromStorage('bookmark_items', []);
    const articles = this._getFromStorage('articles', []);

    return list.map((b) => {
      const article = articles.find((a) => a && a.id === b.article_id) || null;
      return {
        article,
        bookmarked_at: b.bookmarked_at,
        source: b.source
      };
    });
  }

  // addArticleToReadingPlan(articleId, order_index)
  addArticleToReadingPlan(articleId, order_index) {
    const articles = this._getFromStorage('articles', []);
    const article = articles.find((a) => a && a.id === articleId) || null;
    if (!article) {
      return { success: false, reading_plan_item: null, total_items: this._getOrInitializeReadingPlan().length };
    }

    let list = this._getOrInitializeReadingPlan();
    const existing = list.find((i) => i && i.article_id === articleId) || null;
    if (existing) {
      return { success: true, reading_plan_item: existing, total_items: list.length };
    }

    let nextOrder = order_index;
    if (typeof nextOrder !== 'number') {
      const maxExisting = list.reduce((max, item) => {
        if (item && typeof item.order_index === 'number' && item.order_index > max) {
          return item.order_index;
        }
        return max;
      }, 0);
      nextOrder = maxExisting + 1;
    }

    const item = {
      id: this._generateId('rpi'),
      article_id: articleId,
      added_at: new Date().toISOString(),
      order_index: nextOrder,
      status: 'not_started'
    };

    list.push(item);
    this._saveToStorage('reading_plan_items', list);

    return { success: true, reading_plan_item: item, total_items: list.length };
  }

  // removeArticleFromReadingPlan(articleId)
  removeArticleFromReadingPlan(articleId) {
    let list = this._getOrInitializeReadingPlan();
    list = list.filter((i) => i && i.article_id !== articleId);
    this._saveToStorage('reading_plan_items', list);
    return { success: true, total_items: list.length };
  }

  // getReadingPlan()
  getReadingPlan() {
    const list = this._getOrInitializeReadingPlan();
    const articles = this._getFromStorage('articles', []);

    return list.map((plan_item) => {
      const article = articles.find((a) => a && a.id === plan_item.article_id) || null;
      return { article, plan_item };
    });
  }

  // updateReadingPlanItemStatus(articleId, status)
  updateReadingPlanItemStatus(articleId, status) {
    let list = this._getOrInitializeReadingPlan();
    const idx = list.findIndex((i) => i && i.article_id === articleId);
    if (idx === -1) {
      return { success: false, plan_item: null };
    }
    const item = list[idx];
    item.status = status;
    this._saveToStorage('reading_plan_items', list);
    return { success: true, plan_item: item };
  }

  // reorderReadingPlanItems(orders)
  reorderReadingPlanItems(orders) {
    let list = this._getOrInitializeReadingPlan();
    if (!Array.isArray(orders)) return list;

    const orderMap = new Map();
    orders.forEach((o) => {
      if (o && o.article_id && typeof o.order_index === 'number') {
        orderMap.set(o.article_id, o.order_index);
      }
    });

    list.forEach((item) => {
      if (item && orderMap.has(item.article_id)) {
        item.order_index = orderMap.get(item.article_id);
      }
    });

    this._saveToStorage('reading_plan_items', list);
    return list;
  }

  // getNewsletterOptions()
  getNewsletterOptions() {
    return {
      topics: [
        { id: 'zero_waste', label: 'Zero Waste' },
        { id: 'climate_news', label: 'Climate News' },
        { id: 'energy', label: 'Energy' },
        { id: 'food_recipes', label: 'Food & Recipes' },
        { id: 'home_garden', label: 'Home & Garden' },
        { id: 'plastic_free', label: 'Plastic-Free' },
        { id: 'food_waste', label: 'Food Waste' }
      ],
      email_frequencies: ['instant', 'daily', 'weekly_digest', 'monthly'],
      preferred_send_days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    };
  }

  // createOrUpdateNewsletterSubscription(full_name, email, topics, email_frequency, preferred_send_day)
  createOrUpdateNewsletterSubscription(full_name, email, topics, email_frequency, preferred_send_day) {
    let sub = this._getOrInitializeNewsletterSubscription();
    const now = new Date().toISOString();

    if (!sub) {
      sub = {
        id: this._generateId('nsub'),
        full_name,
        email,
        topics: Array.isArray(topics) ? topics : [],
        email_frequency,
        preferred_send_day: preferred_send_day || null,
        is_active: true,
        created_at: now,
        updated_at: now
      };
    } else {
      sub.full_name = full_name;
      sub.email = email;
      sub.topics = Array.isArray(topics) ? topics : sub.topics || [];
      sub.email_frequency = email_frequency;
      sub.preferred_send_day = preferred_send_day || sub.preferred_send_day || null;
      sub.is_active = true;
      sub.updated_at = now;
    }

    this._saveToStorage('newsletter_subscriptions', sub);
    return sub;
  }

  // getChallengesFilterOptions()
  getChallengesFilterOptions() {
    const durations_days = [7, 14, 21, 30];
    const difficulties = ['beginner', 'intermediate', 'advanced'];
    const focus_tags = ['plastic_free', 'food_waste', 'zero_waste', 'climate', 'energy', 'home_garden', 'fashion', 'travel', 'other'];
    const sorting_options = ['starting_soon', 'most_popular', 'newest'];

    return {
      durations_days,
      difficulties,
      focus_tags,
      sorting_options
    };
  }

  // getChallenges(filters = {}, sort = 'starting_soon', page = 1, page_size = 20)
  getChallenges(filters = {}, sort = 'starting_soon', page = 1, page_size = 20) {
    const challenges = this._getFromStorage('challenges', []);

    let list = challenges.filter((c) => c && c.status === 'published');

    if (filters) {
      if (typeof filters.duration_days === 'number') {
        list = list.filter((c) => c.duration_days === filters.duration_days);
      }
      if (filters.difficulty) {
        list = list.filter((c) => c.difficulty === filters.difficulty);
      }
      if (filters.focus_tags && Array.isArray(filters.focus_tags) && filters.focus_tags.length > 0) {
        list = list.filter((c) => {
          const tags = [];
          if (c.focus_tag_primary) tags.push(c.focus_tag_primary);
          if (c.focus_tag_secondary) tags.push(c.focus_tag_secondary);
          const tagSet = new Set(tags);
          return filters.focus_tags.every((t) => tagSet.has(t));
        });
      }
      if (filters.start_date_from) {
        const from = Date.parse(filters.start_date_from);
        list = list.filter((c) => !c.start_date || Date.parse(c.start_date) >= from);
      }
      if (filters.start_date_to) {
        const to = Date.parse(filters.start_date_to);
        list = list.filter((c) => !c.start_date || Date.parse(c.start_date) <= to);
      }
    }

    if (sort === 'most_popular') {
      list.sort((a, b) => {
        const pa = typeof a.popularity_score === 'number' ? a.popularity_score : 0;
        const pb = typeof b.popularity_score === 'number' ? b.popularity_score : 0;
        return pb - pa;
      });
    } else if (sort === 'newest') {
      list.sort((a, b) => {
        const da = a.start_date ? Date.parse(a.start_date) : 0;
        const db = b.start_date ? Date.parse(b.start_date) : 0;
        return db - da;
      });
    } else {
      list.sort((a, b) => {
        const da = a.start_date ? Date.parse(a.start_date) : 0;
        const db = b.start_date ? Date.parse(b.start_date) : 0;
        return da - db;
      });
    }

    const total = list.length;
    const start = (page - 1) * page_size;
    const end = start + page_size;
    const paged = list.slice(start, end);

    return {
      challenges: paged,
      page,
      page_size,
      total
    };
  }

  // getChallengeDetail(challengeId)
  getChallengeDetail(challengeId) {
    const challenges = this._getFromStorage('challenges', []);
    return challenges.find((c) => c && c.id === challengeId) || null;
  }

  // joinChallenge(challengeId, reminder_time, show_in_dashboard)
  joinChallenge(challengeId, reminder_time, show_in_dashboard) {
    const challenges = this._getFromStorage('challenges', []);
    const challenge = challenges.find((c) => c && c.id === challengeId) || null;
    if (!challenge) {
      return null;
    }

    let joined = this._getOrInitializeJoinedChallenges();
    const now = new Date().toISOString();
    const idx = joined.findIndex((j) => j && j.challenge_id === challengeId);

    if (idx >= 0) {
      const existing = joined[idx];
      existing.reminder_time = reminder_time || existing.reminder_time || null;
      existing.show_in_dashboard = !!show_in_dashboard;
      if (!existing.completion_status) existing.completion_status = 'not_started';
    } else {
      const record = {
        id: this._generateId('jch'),
        challenge_id: challengeId,
        joined_at: now,
        reminder_time: reminder_time || null,
        show_in_dashboard: !!show_in_dashboard,
        completion_status: 'not_started'
      };
      joined.push(record);
    }

    this._saveToStorage('joined_challenges', joined);
    return joined.find((j) => j && j.challenge_id === challengeId) || null;
  }

  // getCustomizeFeedOptions()
  getCustomizeFeedOptions() {
    const topics = [
      { id: 'climate', label: 'Climate' },
      { id: 'home_garden', label: 'Home & Garden' },
      { id: 'fashion', label: 'Fashion' },
      { id: 'energy', label: 'Energy' },
      { id: 'food_recipes', label: 'Food & Recipes' },
      { id: 'zero_waste', label: 'Zero Waste' },
      { id: 'travel', label: 'Travel' },
      { id: 'lifestyle', label: 'Lifestyle' },
      { id: 'other', label: 'Other' }
    ];

    const content_mix_options = ['more_from_my_topics', 'balanced', 'more_variety'];
    const article_length_options = ['short_only', 'medium_only', 'short_and_medium', 'long_only', 'all_lengths'];

    return {
      topics,
      content_mix_options,
      article_length_options
    };
  }

  // getFeedPreferences()
  getFeedPreferences() {
    return this._getOrInitializeFeedPreferences();
  }

  // updateFeedPreferences(selected_topics, deprioritized_topics, content_mix, article_length_preference)
  updateFeedPreferences(selected_topics, deprioritized_topics, content_mix, article_length_preference) {
    let prefs = this._getOrInitializeFeedPreferences();

    if (Array.isArray(selected_topics)) {
      prefs.selected_topics = selected_topics;
    }
    if (Array.isArray(deprioritized_topics)) {
      prefs.deprioritized_topics = deprioritized_topics;
    }
    if (content_mix) {
      prefs.content_mix = content_mix;
    }
    if (article_length_preference) {
      prefs.article_length_preference = article_length_preference;
    }
    prefs.updated_at = new Date().toISOString();

    this._saveToStorage('feed_preferences', prefs);
    return prefs;
  }

  // searchContent(query, filters = {}, sort = 'newest_first', page = 1, page_size = 20)
  searchContent(query, filters = {}, sort = 'newest_first', page = 1, page_size = 20) {
    const q = (query || '').toLowerCase().trim();
    const articles = this._getFromStorage('articles', []);

    let list = articles.filter((a) => a && a.is_active);

    if (q) {
      list = list.filter((a) => {
        const haystack = [a.title, a.summary, a.body]
          .filter(Boolean)
          .join(' ') + ' ' + (Array.isArray(a.tags) ? a.tags.join(' ') : '');
        return haystack.toLowerCase().includes(q);
      });
    }

    if (filters) {
      if (filters.content_types && Array.isArray(filters.content_types) && filters.content_types.length > 0) {
        list = list.filter((a) => filters.content_types.includes(a.content_type));
      }
      if (filters.topics && Array.isArray(filters.topics) && filters.topics.length > 0) {
        list = list.filter((a) => filters.topics.includes(a.topic));
      }
      if (filters.difficulty) {
        list = list.filter((a) => a.difficulty === filters.difficulty);
      }
      if (typeof filters.estimated_ingredient_cost_max === 'number') {
        list = list.filter((a) => {
          if (typeof a.estimated_ingredient_cost !== 'number') return false;
          return a.estimated_ingredient_cost <= filters.estimated_ingredient_cost_max;
        });
      }
    }

    if (sort === 'most_popular') {
      list.sort((a, b) => {
        const pa = typeof a.popularity_score === 'number' ? a.popularity_score : 0;
        const pb = typeof b.popularity_score === 'number' ? b.popularity_score : 0;
        return pb - pa;
      });
    } else if (sort === 'highest_rated') {
      list.sort((a, b) => {
        const ra = typeof a.rating === 'number' ? a.rating : 0;
        const rb = typeof b.rating === 'number' ? b.rating : 0;
        if (rb !== ra) return rb - ra;
        const ca = typeof a.rating_count === 'number' ? a.rating_count : 0;
        const cb = typeof b.rating_count === 'number' ? b.rating_count : 0;
        return cb - ca;
      });
    } else {
      list.sort((a, b) => {
        const da = a.publish_date ? Date.parse(a.publish_date) : 0;
        const db = b.publish_date ? Date.parse(b.publish_date) : 0;
        return db - da;
      });
    }

    const total = list.length;
    const start = (page - 1) * page_size;
    const end = start + page_size;
    const results = list.slice(start, end);

    const available_filters = {
      content_types: ['article', 'guide', 'diy_recipe'],
      topics: ['climate', 'home_garden', 'fashion', 'energy', 'food_recipes', 'zero_waste', 'travel', 'lifestyle', 'other'],
      difficulties: ['beginner', 'intermediate', 'advanced']
    };

    return {
      results,
      page,
      page_size,
      total,
      available_filters
    };
  }

  // getDirectoryFilterOptions()
  getDirectoryFilterOptions() {
    const brands = this._getFromStorage('directory_brands', []);
    const categorySet = new Set();
    const countrySet = new Set();
    const stateSet = new Set();

    brands.forEach((b) => {
      if (!b || b.is_active === false) return;
      if (b.category) categorySet.add(b.category);
      if (Array.isArray(b.ships_to_countries)) {
        b.ships_to_countries.forEach((c) => countrySet.add(c));
      }
      if (Array.isArray(b.ships_to_states)) {
        b.ships_to_states.forEach((s) => stateSet.add(s));
      }
    });

    const rating_thresholds = [0, 1, 2, 3, 4];

    return {
      categories: Array.from(categorySet),
      countries: Array.from(countrySet),
      states: Array.from(stateSet),
      rating_thresholds
    };
  }

  // searchDirectoryBrands(query, filters = {}, sort = 'rating_high_to_low', page = 1, page_size = 20)
  searchDirectoryBrands(query, filters = {}, sort = 'rating_high_to_low', page = 1, page_size = 20) {
    const brands = this._getFromStorage('directory_brands', []);
    const q = (query || '').toLowerCase().trim();

    let list = brands.filter((b) => b && b.is_active !== false);

    if (q) {
      list = list.filter((b) => {
        const haystack = [b.name, b.description]
          .filter(Boolean)
          .join(' ') + ' ' + (Array.isArray(b.tags) ? b.tags.join(' ') : '');
        const normalizedHaystack = haystack.toLowerCase().replace(/_/g, ' ');
        return normalizedHaystack.includes(q);
      });
    }

    if (filters) {
      if (filters.category) {
        list = list.filter((b) => b.category === filters.category);
      }
      if (typeof filters.max_price === 'number') {
        list = list.filter((b) => {
          const minp = typeof b.min_price === 'number' ? b.min_price : null;
          const maxp = typeof b.max_price === 'number' ? b.max_price : null;
          if (minp === null && maxp === null) return false;
          if (minp !== null && minp <= filters.max_price) return true;
          if (maxp !== null && maxp <= filters.max_price) return true;
          return false;
        });
      }
      if (filters.country) {
        const countryFilter = String(filters.country).toLowerCase();
        list = list.filter((b) => {
          if (!Array.isArray(b.ships_to_countries)) return false;
          const countries = b.ships_to_countries.map((c) => String(c).toLowerCase());
          if (countries.includes(countryFilter)) return true;
          const normalizedFilter = countryFilter.replace(/\s+/g, '_');
          return countries.includes(normalizedFilter);
        });
      }
      if (filters.state) {
        list = list.filter((b) => Array.isArray(b.ships_to_states) && b.ships_to_states.includes(filters.state));
      }
      if (typeof filters.min_rating === 'number') {
        list = list.filter((b) => typeof b.average_rating === 'number' && b.average_rating >= filters.min_rating);
      }
    }

    if (sort === 'price_low_to_high') {
      list.sort((a, b) => {
        const pa = typeof a.min_price === 'number' ? a.min_price : (typeof a.max_price === 'number' ? a.max_price : Number.MAX_VALUE);
        const pb = typeof b.min_price === 'number' ? b.min_price : (typeof b.max_price === 'number' ? b.max_price : Number.MAX_VALUE);
        return pa - pb;
      });
    } else if (sort === 'most_popular') {
      list.sort((a, b) => {
        const ca = typeof a.rating_count === 'number' ? a.rating_count : 0;
        const cb = typeof b.rating_count === 'number' ? b.rating_count : 0;
        return cb - ca;
      });
    } else {
      list.sort((a, b) => {
        const ra = typeof a.average_rating === 'number' ? a.average_rating : 0;
        const rb = typeof b.average_rating === 'number' ? b.average_rating : 0;
        if (rb !== ra) return rb - ra;
        const ca = typeof a.rating_count === 'number' ? a.rating_count : 0;
        const cb = typeof b.rating_count === 'number' ? b.rating_count : 0;
        return cb - ca;
      });
    }

    const total = list.length;
    const start = (page - 1) * page_size;
    const end = start + page_size;
    const results = list.slice(start, end);

    return {
      results,
      page,
      page_size,
      total
    };
  }

  // favoriteBrand(brandId)
  favoriteBrand(brandId) {
    const brands = this._getFromStorage('directory_brands', []);
    const brand = brands.find((b) => b && b.id === brandId) || null;
    if (!brand) {
      return { success: false, favorite: null, total_favorites: this._getOrInitializeFavorites().length };
    }

    let favorites = this._getOrInitializeFavorites();
    const existing = favorites.find((f) => f && f.brand_id === brandId) || null;
    if (existing) {
      return { success: true, favorite: existing, total_favorites: favorites.length };
    }

    const fav = {
      id: this._generateId('favb'),
      brand_id: brandId,
      favorited_at: new Date().toISOString()
    };
    favorites.push(fav);
    this._saveToStorage('favorite_brands', favorites);

    return { success: true, favorite: fav, total_favorites: favorites.length };
  }

  // removeFavoriteBrand(brandId)
  removeFavoriteBrand(brandId) {
    let favorites = this._getOrInitializeFavorites();
    favorites = favorites.filter((f) => f && f.brand_id !== brandId);
    this._saveToStorage('favorite_brands', favorites);
    return { success: true, total_favorites: favorites.length };
  }

  // getFavoriteBrands()
  getFavoriteBrands() {
    const favorites = this._getOrInitializeFavorites();
    const brands = this._getFromStorage('directory_brands', []);

    return favorites.map((f) => {
      const brand = brands.find((b) => b && b.id === f.brand_id) || null;
      return {
        brand,
        favorited_at: f.favorited_at
      };
    });
  }

  // getStaticPageContent(page_slug)
  getStaticPageContent(page_slug) {
    const pages = this._getFromStorage('static_pages', []);
    const page = pages.find((p) => p && p.page_slug === page_slug) || null;
    if (page) return page;
    return {
      page_slug: page_slug,
      title: '',
      body_html: ''
    };
  }

  // submitContactForm(name, email, subject, message)
  submitContactForm(name, email, subject, message) {
    const messages = this._getFromStorage('contact_messages', []);
    const id = this._generateId('msg');
    const record = {
      id,
      name,
      email,
      subject,
      message,
      created_at: new Date().toISOString()
    };
    messages.push(record);
    this._saveToStorage('contact_messages', messages);

    return {
      success: true,
      message_id: id,
      confirmation_text: 'Your message has been received.'
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
