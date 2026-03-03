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
    this._initStorage();
    this.idCounter = this._getNextIdCounter();
  }

  // ----------------------
  // Initialization & Utils
  // ----------------------

  _initStorage() {
    // Initialize all data tables in localStorage if not exist
    const arrayKeys = [
      'pages',
      'navigation_links',
      'articles',
      'favorite_articles',
      'checklists',
      'checklist_sections',
      'checklist_items',
      'checklist_progress',
      'tools',
      'trip_plans',
      'engine_maintenance_schedules',
      'engine_maintenance_tasks',
      'courses',
      'training_plan_entries',
      'learning_paths',
      'learning_path_items',
      'glossary_terms',
      'study_list_items',
      'contact_submissions'
    ];

    arrayKeys.forEach((key) => {
      if (localStorage.getItem(key) === null) {
        localStorage.setItem(key, '[]');
      }
    });

    // Single-user aggregated / transient state keys
    if (localStorage.getItem('lastBoatCapacityCalculation') === null) {
      localStorage.setItem('lastBoatCapacityCalculation', 'null');
    }
    if (localStorage.getItem('lastGeneratedMaintenanceSchedule') === null) {
      localStorage.setItem('lastGeneratedMaintenanceSchedule', 'null');
    }
    if (localStorage.getItem('single_user_state') === null) {
      localStorage.setItem('single_user_state', 'null');
    }

    if (localStorage.getItem('idCounter') === null) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, defaultValue = []) {
    const data = localStorage.getItem(key);
    if (data === null || data === undefined) return defaultValue;
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
    localStorage.setItem('idCounter', next.toString());
    return next;
  }

  _generateId(prefix) {
    return prefix + '_' + this._getNextIdCounter();
  }

  _nowIso() {
    return new Date().toISOString();
  }

  _parseIsoDate(dateStr) {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
  }

  _addMonths(date, months) {
    const d = new Date(date.getTime());
    const targetMonth = d.getMonth() + months;
    d.setMonth(targetMonth);
    return d;
  }

  _mapDifficultyToLabel(value) {
    switch (value) {
      case 'beginner': return 'Beginner';
      case 'intermediate': return 'Intermediate';
      case 'advanced': return 'Advanced';
      case 'all_levels': return 'All Levels';
      default: return '';
    }
  }

  _mapCategoryToName(value) {
    switch (value) {
      case 'safety_basics': return 'Safety Basics';
      case 'how_to_guides': return 'How-To Guides';
      case 'other': return 'Other';
      default: return '';
    }
  }

  _mapBoatSizeToLabel(value) {
    switch (value) {
      case 'up_to_26_ft': return 'Up to 26 ft';
      case 'between_26_40_ft': return '26–40 ft';
      case 'over_40_ft': return 'Over 40 ft';
      case 'all_sizes': return 'All Sizes';
      default: return '';
    }
  }

  _parseMonthLabelToDate(label) {
    // e.g., "June 2024" -> 2024-06-01T00:00:00Z (in local timezone then ISO)
    if (!label || typeof label !== 'string') return null;
    const parts = label.trim().split(/\s+/);
    if (parts.length !== 2) return null;
    const [monthName, yearStr] = parts;
    const date = new Date(`${monthName} 1, ${yearStr}`);
    if (isNaN(date.getTime())) return null;
    return date.toISOString();
  }

  // ----------------------
  // Helper functions (per spec)
  // ----------------------

  _getOrCreateFavoritesStore() {
    let favorites = this._getFromStorage('favorite_articles', []);
    if (!Array.isArray(favorites)) {
      favorites = [];
      this._saveToStorage('favorite_articles', favorites);
    }
    return favorites;
  }

  _getOrCreateLearningPath() {
    let learningPaths = this._getFromStorage('learning_paths', []);
    let learningPath = learningPaths[0] || null;

    if (!learningPath) {
      learningPath = {
        id: this._generateId('learning_path'),
        name: 'My Learning Path',
        created_at: this._nowIso(),
        updated_at: this._nowIso()
      };
      learningPaths.push(learningPath);
      this._saveToStorage('learning_paths', learningPaths);
      this._persistSingleUserState();
    }

    return learningPath;
  }

  _storeLastBoatCapacityCalculation(inputAndResult) {
    // inputAndResult should be plain JSON-serializable object
    localStorage.setItem('lastBoatCapacityCalculation', JSON.stringify(inputAndResult));
    this._persistSingleUserState();
  }

  _getLastBoatCapacityCalculation() {
    const data = localStorage.getItem('lastBoatCapacityCalculation');
    if (!data || data === 'null') return null;
    try {
      return JSON.parse(data);
    } catch (e) {
      return null;
    }
  }

  _storeLastGeneratedMaintenanceSchedule(schedule, tasks) {
    const payload = { schedule, tasks };
    localStorage.setItem('lastGeneratedMaintenanceSchedule', JSON.stringify(payload));
    this._persistSingleUserState();
  }

  _getLastGeneratedMaintenanceSchedule() {
    const data = localStorage.getItem('lastGeneratedMaintenanceSchedule');
    if (!data || data === 'null') return null;
    try {
      return JSON.parse(data);
    } catch (e) {
      return null;
    }
  }

  _persistSingleUserState() {
    // Aggregate high-level single-user state for convenience/debugging (duplicates underlying tables)
    const state = {
      favorite_articles: this._getFromStorage('favorite_articles', []),
      checklist_progress: this._getFromStorage('checklist_progress', []),
      trip_plans: this._getFromStorage('trip_plans', []),
      engine_maintenance_schedules: this._getFromStorage('engine_maintenance_schedules', []),
      engine_maintenance_tasks: this._getFromStorage('engine_maintenance_tasks', []),
      training_plan_entries: this._getFromStorage('training_plan_entries', []),
      learning_paths: this._getFromStorage('learning_paths', []),
      learning_path_items: this._getFromStorage('learning_path_items', []),
      study_list_items: this._getFromStorage('study_list_items', []),
      lastBoatCapacityCalculation: this._getLastBoatCapacityCalculation(),
      lastGeneratedMaintenanceSchedule: this._getLastGeneratedMaintenanceSchedule()
    };
    localStorage.setItem('single_user_state', JSON.stringify(state));
  }

  // ----------------------
  // Core interface implementations
  // ----------------------

  // 1. getHomePageContent
  getHomePageContent() {
    const articles = this._getFromStorage('articles', []);
    const tools = this._getFromStorage('tools', []);

    const featured_beginner_articles = articles
      .filter(a => a.category === 'safety_basics' && a.difficulty_level === 'beginner')
      .sort((a, b) => {
        // Highest rating, then newest publish_date
        const rDiff = (b.rating || 0) - (a.rating || 0);
        if (rDiff !== 0) return rDiff;
        const ad = this._parseIsoDate(a.publish_date) || new Date(0);
        const bd = this._parseIsoDate(b.publish_date) || new Date(0);
        return bd - ad;
      })
      .slice(0, 3);

    const featured_tools = tools.filter(t => t.is_featured === true);

    const quick_sections = [
      {
        key: 'safety_basics',
        title: 'Safety Basics',
        description: 'Learn core boating safety rules, life jacket use, and emergency procedures.'
      },
      {
        key: 'how_to_guides',
        title: 'How-To Guides',
        description: 'Step-by-step guides for navigation, docking, night boating, and more.'
      },
      {
        key: 'checklists',
        title: 'Checklists',
        description: 'Printable and saveable checklists for trips, maintenance, and emergencies.'
      },
      {
        key: 'tools',
        title: 'Tools',
        description: 'Capacity calculators, engine maintenance schedulers, and planning tools.'
      },
      {
        key: 'courses',
        title: 'Courses',
        description: 'Find local and online boating safety and navigation courses.'
      },
      {
        key: 'glossary',
        title: 'Glossary',
        description: 'Look up common boating and radio terms like Mayday, Pan-Pan, and S e9curit e9.'
      }
    ];

    const common_tasks = [
      {
        task_id: 'task_1',
        title: 'Save beginner safety articles',
        description: 'Filter Safety Basics articles for beginners and add favorites for later reading.'
      },
      {
        task_id: 'task_2',
        title: 'Prepare a pontoon day trip',
        description: 'Use a pontoon checklist and save your completion progress.'
      },
      {
        task_id: 'task_3',
        title: 'Check boat capacity',
        description: 'Calculate safe passenger limits and save a trip plan.'
      },
      {
        task_id: 'task_5',
        title: 'Find a safety course',
        description: 'Filter boating safety courses by distance and price and add to your training plan.'
      },
      {
        task_id: 'task_6',
        title: 'Plan engine maintenance',
        description: 'Generate a monthly schedule for your engine based on how and where you boat.'
      },
      {
        task_id: 'task_7',
        title: 'Build a night boating path',
        description: 'Create a 3-step learning path for night navigation, anchoring, and VHF radio.'
      },
      {
        task_id: 'task_8',
        title: 'Study radio distress calls',
        description: 'Save Mayday, Pan-Pan, and S e9curit e9 to your Study List.'
      }
    ];

    return {
      hero_title: 'Confident Boating Starts with Safety',
      hero_subtitle: 'Practical how-tos, checklists, and tools for safer days on the water.',
      intro_text: 'This site focuses on real-world boating safety and simple, actionable guidance. Explore beginner-friendly articles, use planning tools like the boat capacity calculator, and keep checklists and study terms saved for quick reference on every trip.',
      featured_beginner_articles,
      featured_tools,
      quick_sections,
      common_tasks
    };
  }

  // 2. searchArticles(query, filters, sort, page, page_size)
  searchArticles(query, filters, sort, page = 1, page_size = 20) {
    const q = (query || '').toLowerCase().trim();
    const allArticles = this._getFromStorage('articles', []);
    const f = filters || {};

    let results = allArticles.filter((a) => {
      // Text match
      if (q) {
        const haystack = [a.title, a.summary, a.content]
          .filter(Boolean)
          .join(' ') 
          .toLowerCase();
        if (!haystack.includes(q)) {
          return false;
        }
      }

      // category filter
      if (f.category && a.category !== f.category) return false;

      // boat size
      if (f.boat_size_category && a.boat_size_category && a.boat_size_category !== f.boat_size_category) {
        return false;
      }

      // publish date range
      const pubDate = this._parseIsoDate(a.publish_date);
      if (f.published_from) {
        const fromDate = this._parseIsoDate(f.published_from);
        if (fromDate && pubDate && pubDate < fromDate) return false;
      }
      if (f.published_to) {
        const toDate = this._parseIsoDate(f.published_to);
        if (toDate && pubDate && pubDate > toDate) return false;
      }

      // rating filter
      if (typeof f.min_rating === 'number' && (a.rating || 0) < f.min_rating) {
        return false;
      }

      return true;
    });

    // Sorting
    if (sort === 'newest_first') {
      results.sort((a, b) => {
        const ad = this._parseIsoDate(a.publish_date) || new Date(0);
        const bd = this._parseIsoDate(b.publish_date) || new Date(0);
        return bd - ad;
      });
    } else if (sort === 'highest_rated') {
      results.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (sort === 'shortest_read_time') {
      results.sort((a, b) => (a.read_time_minutes || 0) - (b.read_time_minutes || 0));
    }

    const total_results = results.length;
    const start = (page - 1) * page_size;
    const end = start + page_size;
    const pageItems = results.slice(start, end);

    const finalResults = pageItems.map((article) => {
      let matched_snippet = article.summary || '';
      if (!matched_snippet && article.content) {
        const lower = article.content.toLowerCase();
        const idx = q ? lower.indexOf(q) : -1;
        if (idx >= 0) {
          const startIdx = Math.max(0, idx - 40);
          const endIdx = Math.min(article.content.length, idx + q.length + 40);
          matched_snippet = article.content.substring(startIdx, endIdx).trim();
        } else {
          matched_snippet = article.content.substring(0, 160).trim();
        }
      }
      return { article, matched_snippet };
    });

    return {
      query,
      total_results,
      page,
      page_size,
      results: finalResults
    };
  }

  // 3. getSafetyBasicsFilterOptions
  getSafetyBasicsFilterOptions() {
    const difficulty_levels = [
      { value: 'beginner', label: 'Beginner' },
      { value: 'intermediate', label: 'Intermediate' },
      { value: 'advanced', label: 'Advanced' },
      { value: 'all_levels', label: 'All Levels' }
    ];

    const rating_options = [
      { value: 0, label: 'All ratings' },
      { value: 4.0, label: '4.0+ stars' },
      { value: 4.5, label: '4.5+ stars' }
    ];

    const sort_options = [
      { value: 'highest_rated', label: 'Highest Rated' },
      { value: 'newest_first', label: 'Newest First' },
      { value: 'shortest_read_time', label: 'Shortest Read Time' }
    ];

    return {
      difficulty_levels,
      rating_options,
      read_time_max_default: 30,
      sort_options
    };
  }

  // 4. listSafetyBasicsArticles(filters, sort, page, page_size)
  listSafetyBasicsArticles(filters, sort, page = 1, page_size = 20) {
    const f = filters || {};
    const allArticles = this._getFromStorage('articles', []);
    const favorites = this._getFromStorage('favorite_articles', []);
    const favoriteSet = new Set(favorites.map(fa => fa.article_id));

    let articles = allArticles.filter(a => a.category === 'safety_basics');

    if (Array.isArray(f.difficulty_levels) && f.difficulty_levels.length > 0) {
      const levelsSet = new Set(f.difficulty_levels);
      articles = articles.filter(a => {
        if (levelsSet.has(a.difficulty_level)) return true;
        // Also allow match via tags containing 'Beginner', etc.
        if (Array.isArray(a.tags)) {
          return a.tags.some(t => typeof t === 'string' && levelsSet.has(t.toLowerCase()));
        }
        return false;
      });
    }

    if (typeof f.max_read_time_minutes === 'number') {
      articles = articles.filter(a => (a.read_time_minutes || 0) <= f.max_read_time_minutes);
    }

    if (typeof f.min_rating === 'number') {
      articles = articles.filter(a => (a.rating || 0) >= f.min_rating);
    }

    if (sort === 'highest_rated') {
      articles.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (sort === 'newest_first') {
      articles.sort((a, b) => {
        const ad = this._parseIsoDate(a.publish_date) || new Date(0);
        const bd = this._parseIsoDate(b.publish_date) || new Date(0);
        return bd - ad;
      });
    } else if (sort === 'shortest_read_time') {
      articles.sort((a, b) => (a.read_time_minutes || 0) - (b.read_time_minutes || 0));
    }

    const total_results = articles.length;
    const start = (page - 1) * page_size;
    const end = start + page_size;
    const pageItems = articles.slice(start, end);

    const wrapped = pageItems.map(article => ({
      article,
      is_favorited: favoriteSet.has(article.id)
    }));

    return {
      total_results,
      page,
      page_size,
      articles: wrapped
    };
  }

  // 5. addArticleToFavorites(articleId)
  addArticleToFavorites(articleId) {
    const articles = this._getFromStorage('articles', []);
    const articleExists = articles.some(a => a.id === articleId);
    let favorites = this._getOrCreateFavoritesStore();

    if (!articleExists) {
      return {
        success: false,
        favorite: null,
        total_favorites: favorites.length,
        message: 'Article not found.'
      };
    }

    const already = favorites.find(f => f.article_id === articleId);
    if (already) {
      return {
        success: true,
        favorite: already,
        total_favorites: favorites.length,
        message: 'Article already in favorites.'
      };
    }

    const favorite = {
      id: this._generateId('favorite_article'),
      article_id: articleId,
      added_at: this._nowIso()
    };

    favorites.push(favorite);
    this._saveToStorage('favorite_articles', favorites);
    this._persistSingleUserState();

    return {
      success: true,
      favorite,
      total_favorites: favorites.length,
      message: 'Article added to favorites.'
    };
  }

  // 6. removeArticleFromFavorites(articleId)
  removeArticleFromFavorites(articleId) {
    let favorites = this._getFromStorage('favorite_articles', []);
    const before = favorites.length;
    favorites = favorites.filter(f => f.article_id !== articleId);
    const after = favorites.length;
    this._saveToStorage('favorite_articles', favorites);
    this._persistSingleUserState();

    const removed = before !== after;

    return {
      success: removed,
      total_favorites: after,
      message: removed ? 'Article removed from favorites.' : 'Article was not in favorites.'
    };
  }

  // 7. getArticleDetail(articleId)
  getArticleDetail(articleId) {
    const articles = this._getFromStorage('articles', []);
    const favorites = this._getFromStorage('favorite_articles', []);

    const article = articles.find(a => a.id === articleId) || null;
    if (!article) {
      return {
        article: null,
        is_favorited: false,
        category_name: '',
        difficulty_label: '',
        boat_size_label: '',
        related_articles: []
      };
    }

    const is_favorited = favorites.some(f => f.article_id === articleId);

    const related_articles = articles
      .filter(a => a.id !== article.id && a.category === article.category)
      .sort((a, b) => {
        // Prefer same difficulty level, then rating
        const aDiffMatch = a.difficulty_level === article.difficulty_level ? 1 : 0;
        const bDiffMatch = b.difficulty_level === article.difficulty_level ? 1 : 0;
        if (bDiffMatch !== aDiffMatch) return bDiffMatch - aDiffMatch;
        return (b.rating || 0) - (a.rating || 0);
      })
      .slice(0, 4);

    return {
      article,
      is_favorited,
      category_name: this._mapCategoryToName(article.category),
      difficulty_label: this._mapDifficultyToLabel(article.difficulty_level),
      boat_size_label: this._mapBoatSizeToLabel(article.boat_size_category),
      related_articles
    };
  }

  // 8. getArticlePrintView(articleId)
  getArticlePrintView(articleId) {
    const articles = this._getFromStorage('articles', []);
    const article = articles.find(a => a.id === articleId) || null;
    if (!article) {
      return {
        article_title: '',
        print_body_html: '',
        metadata: {
          read_time_minutes: 0,
          publish_date: '',
          tags: []
        }
      };
    }

    // Instrumentation for task completion tracking
    try {
      localStorage.setItem('task4_lastPrintArticleId', articleId);
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    const content = article.content || article.summary || '';
    const escaped = content
      .split(/\n+/)
      .map(p => p.trim())
      .filter(Boolean)
      .map(p => `<p>${p.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>`)
      .join('\n');

    const print_body_html = `<article>\n<h1>${(article.title || '').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</h1>\n${escaped}\n</article>`;

    return {
      article_title: article.title || '',
      print_body_html,
      metadata: {
        read_time_minutes: article.read_time_minutes || 0,
        publish_date: article.publish_date || '',
        tags: Array.isArray(article.tags) ? article.tags : []
      }
    };
  }

  // Helper to seed default How-To Guide articles when none exist
  _ensureDefaultHowToArticles() {
    const articles = this._getFromStorage('articles', []);
    const hasHowTo = articles.some(a => a && a.category === 'how_to_guides');
    if (hasHowTo) {
      return;
    }

    const now = this._nowIso();
    const seedArticles = [
      {
        id: 'howto_night_navigation_basics',
        title: 'Night Navigation Basics',
        slug: 'night-navigation-basics',
        category: 'how_to_guides',
        category_tab: 'navigation',
        summary: 'How to navigate safely after dark using lights and buoys.',
        content: 'Night navigation how-to content.',
        read_time_minutes: 8,
        rating: 4.6,
        difficulty_level: 'beginner',
        tags: ['navigation', 'night'],
        boat_size_category: 'all_sizes',
        publish_date: now
      },
      {
        id: 'howto_anchoring_basics',
        title: 'Anchoring Basics for Beginners',
        slug: 'anchoring-basics-beginners',
        category: 'how_to_guides',
        category_tab: 'anchoring_mooring',
        summary: 'Step-by-step anchoring techniques for new boaters.',
        content: 'Anchoring how-to content.',
        read_time_minutes: 7,
        rating: 4.5,
        difficulty_level: 'beginner',
        tags: ['anchoring', 'beginner'],
        boat_size_category: 'all_sizes',
        publish_date: now
      },
      {
        id: 'howto_vhf_radio_basics',
        title: 'VHF Radio Basics',
        slug: 'vhf-radio-basics',
        category: 'how_to_guides',
        category_tab: 'communication_electronics',
        summary: 'Using your VHF radio for routine calls and emergencies.',
        content: 'VHF radio how-to content.',
        read_time_minutes: 6,
        rating: 4.4,
        difficulty_level: 'beginner',
        tags: ['vhf', 'radio'],
        boat_size_category: 'all_sizes',
        publish_date: now
      }
    ];

    const updated = articles.concat(seedArticles);
    this._saveToStorage('articles', updated);
  }

  // 9. getHowToGuideCategories
  getHowToGuideCategories() {
    this._ensureDefaultHowToArticles();
    const articles = this._getFromStorage('articles', []);
    const howToArticles = articles.filter(a => a.category === 'how_to_guides');

    const tabs = ['navigation', 'anchoring_mooring', 'communication_electronics', 'other'];

    const counts = {
      navigation: 0,
      anchoring_mooring: 0,
      communication_electronics: 0,
      other: 0
    };

    howToArticles.forEach(a => {
      const key = a.category_tab || 'other';
      if (counts.hasOwnProperty(key)) {
        counts[key] += 1;
      } else {
        counts.other += 1;
      }
    });

    const result = tabs.map(key => {
      let label = '';
      let description = '';
      if (key === 'navigation') {
        label = 'Navigation';
        description = 'Charts, buoys, night navigation, and route planning.';
      } else if (key === 'anchoring_mooring') {
        label = 'Anchoring & Mooring';
        description = 'Anchoring techniques, scope, and tying up safely.';
      } else if (key === 'communication_electronics') {
        label = 'Communication & Electronics';
        description = 'VHF radio use, distress calls, and onboard electronics.';
      } else {
        label = 'Other How-To Guides';
        description = 'Additional skills and safety-related how-tos.';
      }
      return {
        key,
        label,
        description,
        article_count: counts[key] || 0
      };
    });

    return result;
  }

  // 10. listHowToArticles(category_tab, page, page_size)
  listHowToArticles(category_tab, page = 1, page_size = 20) {
    this._ensureDefaultHowToArticles();
    const articles = this._getFromStorage('articles', []);
    const learningPath = this._getOrCreateLearningPath();
    const learningPathItems = this._getFromStorage('learning_path_items', [])
      .filter(i => i.learning_path_id === learningPath.id);

    const articleIdSet = new Set(learningPathItems.map(i => i.article_id));

    let filtered = articles.filter(a => a.category === 'how_to_guides');

    filtered = filtered.filter(a => {
      const tab = a.category_tab || 'other';
      return tab === category_tab;
    });

    const total_results = filtered.length;
    const start = (page - 1) * page_size;
    const end = start + page_size;
    const pageItems = filtered.slice(start, end);

    const wrapped = pageItems.map(article => ({
      article,
      is_in_learning_path: articleIdSet.has(article.id)
    }));

    return {
      category_tab,
      total_results,
      page,
      page_size,
      articles: wrapped
    };
  }

  // 11. addArticleToLearningPath(articleId)
  addArticleToLearningPath(articleId) {
    const articles = this._getFromStorage('articles', []);
    const articleExists = articles.some(a => a.id === articleId);
    const learningPath = this._getOrCreateLearningPath();
    let items = this._getFromStorage('learning_path_items', []);

    if (!articleExists) {
      return {
        success: false,
        learning_path: learningPath,
        learning_path_item: null,
        total_steps: items.filter(i => i.learning_path_id === learningPath.id).length,
        message: 'Article not found.'
      };
    }

    const existing = items.find(i => i.learning_path_id === learningPath.id && i.article_id === articleId);
    if (existing) {
      const totalSteps = items.filter(i => i.learning_path_id === learningPath.id).length;
      return {
        success: true,
        learning_path: learningPath,
        learning_path_item: existing,
        total_steps: totalSteps,
        message: 'Article already in learning path.'
      };
    }

    const currentItems = items.filter(i => i.learning_path_id === learningPath.id);
    const order = currentItems.length + 1;

    const learning_path_item = {
      id: this._generateId('learning_path_item'),
      learning_path_id: learningPath.id,
      article_id: articleId,
      order,
      added_at: this._nowIso()
    };

    items.push(learning_path_item);
    this._saveToStorage('learning_path_items', items);

    // update learning path timestamp
    let learningPaths = this._getFromStorage('learning_paths', []);
    const idx = learningPaths.findIndex(lp => lp.id === learningPath.id);
    if (idx >= 0) {
      learningPaths[idx].updated_at = this._nowIso();
      this._saveToStorage('learning_paths', learningPaths);
    }

    this._persistSingleUserState();

    return {
      success: true,
      learning_path: learningPath,
      learning_path_item,
      total_steps: order,
      message: 'Article added to learning path.'
    };
  }

  // 12. removeLearningPathItem(learningPathItemId)
  removeLearningPathItem(learningPathItemId) {
    let items = this._getFromStorage('learning_path_items', []);
    const item = items.find(i => i.id === learningPathItemId);
    if (!item) {
      return {
        success: false,
        remaining_steps: items.length,
        message: 'Learning path item not found.'
      };
    }

    const learningPathId = item.learning_path_id;

    items = items.filter(i => i.id !== learningPathItemId);

    // Re-order remaining items for the same learning path
    const remainingForPath = items
      .filter(i => i.learning_path_id === learningPathId)
      .sort((a, b) => (a.order || 0) - (b.order || 0));

    remainingForPath.forEach((i, index) => {
      i.order = index + 1;
    });

    this._saveToStorage('learning_path_items', items);

    // update learning path timestamp
    let learningPaths = this._getFromStorage('learning_paths', []);
    const idx = learningPaths.findIndex(lp => lp.id === learningPathId);
    if (idx >= 0) {
      learningPaths[idx].updated_at = this._nowIso();
      this._saveToStorage('learning_paths', learningPaths);
    }

    this._persistSingleUserState();

    return {
      success: true,
      remaining_steps: remainingForPath.length,
      message: 'Learning path item removed.'
    };
  }

  // 13. getLearningPath()
  getLearningPath() {
    const learningPath = this._getOrCreateLearningPath();
    const items = this._getFromStorage('learning_path_items', [])
      .filter(i => i.learning_path_id === learningPath.id)
      .sort((a, b) => (a.order || 0) - (b.order || 0));

    const articles = this._getFromStorage('articles', []);

    const enrichedItems = items.map((item, index) => {
      const article = articles.find(a => a.id === item.article_id) || null;
      return {
        item,
        article,
        step_number: index + 1,
        category_tab: article ? (article.category_tab || 'other') : null,
        estimated_time_minutes: article ? (article.read_time_minutes || 0) : 0,
        difficulty_label: article ? this._mapDifficultyToLabel(article.difficulty_level) : ''
      };
    });

    return {
      learning_path: learningPath,
      items: enrichedItems
    };
  }

  // 14. updateLearningPathOrder(orderedItemIds)
  updateLearningPathOrder(orderedItemIds) {
    const ids = Array.isArray(orderedItemIds) ? orderedItemIds : [];
    let items = this._getFromStorage('learning_path_items', []);

    const idSet = new Set(ids);
    // Assume single learning path as per model
    const learningPath = this._getOrCreateLearningPath();

    // Update order for items in this learning path
    let order = 1;
    ids.forEach(id => {
      const item = items.find(i => i.id === id && i.learning_path_id === learningPath.id);
      if (item) {
        item.order = order++;
      }
    });

    // Items not included keep their relative order but come afterwards
    const remaining = items
      .filter(i => i.learning_path_id === learningPath.id && !idSet.has(i.id))
      .sort((a, b) => (a.order || 0) - (b.order || 0));

    remaining.forEach(i => {
      i.order = order++;
    });

    this._saveToStorage('learning_path_items', items);

    // Update learning path timestamp
    let learningPaths = this._getFromStorage('learning_paths', []);
    const idx = learningPaths.findIndex(lp => lp.id === learningPath.id);
    if (idx >= 0) {
      learningPaths[idx].updated_at = this._nowIso();
      this._saveToStorage('learning_paths', learningPaths);
    }

    const articles = this._getFromStorage('articles', []);
    const pathItems = items
      .filter(i => i.learning_path_id === learningPath.id)
      .sort((a, b) => (a.order || 0) - (b.order || 0));

    const enrichedItems = pathItems.map((item, index) => {
      const article = articles.find(a => a.id === item.article_id) || null;
      return {
        item,
        article,
        step_number: index + 1
      };
    });

    this._persistSingleUserState();

    return {
      success: true,
      items: enrichedItems,
      message: 'Learning path order updated.'
    };
  }

  // 15. getChecklistsFilterOptions
  getChecklistsFilterOptions() {
    const boat_types = [
      { value: 'pontoon', label: 'Pontoon' },
      { value: 'open_motorboat', label: 'Open Motorboat' },
      { value: 'sailboat', label: 'Sailboat' },
      { value: 'personal_watercraft', label: 'Personal Watercraft' },
      { value: 'other', label: 'Other' }
    ];

    const trip_lengths = [
      { value: 'half_day_under_4_hours', label: 'Half Day (under 4 hours)' },
      { value: 'day_trip_4_8_hours', label: 'Day Trip (4–8 hours)' },
      { value: 'overnight', label: 'Overnight' },
      { value: 'weekend', label: 'Weekend' },
      { value: 'multi_day', label: 'Multi-day' }
    ];

    const passenger_ranges = [
      { value: 'passengers_1_3', label: '1–3 people' },
      { value: 'passengers_4_6', label: '4–6 people' },
      { value: 'passengers_7_12', label: '7–12 people' },
      { value: 'passengers_13_plus', label: '13+ people' }
    ];

    return {
      boat_types,
      trip_lengths,
      passenger_ranges
    };
  }

  // 16. listChecklists(filters, page, page_size)
  listChecklists(filters, page = 1, page_size = 20) {
    const f = filters || {};
    let checklists = this._getFromStorage('checklists', []);

    if (f.boat_type) {
      checklists = checklists.filter(c => c.boat_type === f.boat_type);
    }

    if (f.trip_length) {
      checklists = checklists.filter(c => c.trip_length === f.trip_length);
    }

    if (f.passenger_range) {
      checklists = checklists.filter(c => c.passenger_range === f.passenger_range);
    }

    const total_results = checklists.length;
    const start = (page - 1) * page_size;
    const end = start + page_size;
    const pageItems = checklists.slice(start, end);

    return {
      total_results,
      page,
      page_size,
      checklists: pageItems
    };
  }

  // 17. getChecklistDetailWithProgress(checklistId)
  getChecklistDetailWithProgress(checklistId) {
    const checklists = this._getFromStorage('checklists', []);
    const sectionsAll = this._getFromStorage('checklist_sections', []);
    const itemsAll = this._getFromStorage('checklist_items', []);
    const progressAll = this._getFromStorage('checklist_progress', []);

    const checklist = checklists.find(c => c.id === checklistId) || null;
    if (!checklist) {
      return {
        checklist: null,
        sections: [],
        last_saved_at: null,
        is_saved: false
      };
    }

    const progress = progressAll.find(p => p.checklist_id === checklistId) || null;
    const completedSet = new Set(progress ? progress.completed_item_ids || [] : []);

    const sections = sectionsAll
      .filter(s => s.checklist_id === checklistId)
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .map(section => {
        const items = itemsAll
          .filter(i => i.checklist_id === checklistId && i.section_id === section.id)
          .sort((a, b) => (a.order || 0) - (b.order || 0))
          .map(item => ({
            item,
            is_completed: completedSet.has(item.id)
          }));
        return { section, items };
      });

    return {
      checklist,
      sections,
      last_saved_at: progress ? progress.last_saved_at : null,
      is_saved: !!progress
    };
  }

  // 18. saveChecklistProgress(checklistId, completedItemIds)
  saveChecklistProgress(checklistId, completedItemIds) {
    const items = Array.isArray(completedItemIds) ? completedItemIds : [];
    let progressAll = this._getFromStorage('checklist_progress', []);
    const now = this._nowIso();

    let progress = progressAll.find(p => p.checklist_id === checklistId);
    if (!progress) {
      progress = {
        id: this._generateId('checklist_progress'),
        checklist_id: checklistId,
        completed_item_ids: items,
        last_saved_at: now
      };
      progressAll.push(progress);
    } else {
      progress.completed_item_ids = items;
      progress.last_saved_at = now;
    }

    this._saveToStorage('checklist_progress', progressAll);
    this._persistSingleUserState();

    return {
      success: true,
      checklist_progress: progress,
      message: 'Checklist progress saved.'
    };
  }

  // 19. listTools()
  listTools() {
    const tools = this._getFromStorage('tools', []);
    const pages = this._getFromStorage('pages', []);

    // Foreign key resolution: add `page` for each tool
    const result = tools.map(tool => ({
      ...tool,
      page: pages.find(p => p.id === tool.page_id) || null
    }));

    return result;
  }

  // 20. calculateBoatCapacity(boat_length_ft, boat_width_ft, boat_type, water_type)
  calculateBoatCapacity(boat_length_ft, boat_width_ft, boat_type, water_type) {
    const length = Number(boat_length_ft) || 0;
    const width = Number(boat_width_ft) || 0;

    // Base USCG-style rule of thumb
    let baseCapacity = 0;
    if (length > 0 && width > 0) {
      baseCapacity = Math.floor((length * width) / 15);
    }

    let capacity = baseCapacity;
    const warnings = [];

    // Simple adjustments based on boat type / water type
    if (boat_type === 'pontoon') {
      capacity += 1; // pontoons often carry slightly more
    }
    if (water_type === 'offshore_ocean') {
      capacity = Math.max(1, capacity - 2); // more conservative offshore
      warnings.push('Capacity reduced for offshore use. Always follow manufacturer plate.');
    }

    if (capacity < 1) {
      capacity = 1;
      warnings.push('Calculated capacity was less than 1; set to minimum of 1 passenger.');
    }

    const calculation_method = 'Approximate rule: (length_ft × width_ft) / 15, adjusted for boat and water type.';

    const payload = {
      boat_length_ft: length,
      boat_width_ft: width,
      boat_type,
      water_type,
      calculated_max_passengers: capacity,
      calculation_method,
      warnings,
      calculated_at: this._nowIso()
    };

    this._storeLastBoatCapacityCalculation(payload);

    return {
      calculated_max_passengers: capacity,
      calculation_method,
      warnings
    };
  }

  // 21. addCurrentCapacityToTripPlan(trip_name, planned_passenger_count)
  addCurrentCapacityToTripPlan(trip_name, planned_passenger_count) {
    const last = this._getLastBoatCapacityCalculation();
    if (!last) {
      return {
        success: false,
        trip_plan: null,
        message: 'No boat capacity calculation found. Please calculate capacity first.'
      };
    }

    const tripPlans = this._getFromStorage('trip_plans', []);

    const trip_plan = {
      id: this._generateId('trip_plan'),
      name: trip_name,
      boat_length_ft: last.boat_length_ft,
      boat_width_ft: last.boat_width_ft,
      boat_type: last.boat_type,
      water_type: last.water_type,
      calculated_max_passengers: last.calculated_max_passengers,
      planned_passenger_count: typeof planned_passenger_count === 'number' ? planned_passenger_count : null,
      created_at: this._nowIso()
    };

    tripPlans.push(trip_plan);
    this._saveToStorage('trip_plans', tripPlans);
    this._persistSingleUserState();

    return {
      success: true,
      trip_plan,
      message: 'Trip plan saved from current capacity calculation.'
    };
  }

  // 22. generateEngineMaintenanceSchedule(engine_type, usage_frequency, water_type, start_date, reminder_frequency)
  generateEngineMaintenanceSchedule(engine_type, usage_frequency, water_type, start_date, reminder_frequency) {
    const start = this._parseIsoDate(start_date) || new Date();
    const nowIso = this._nowIso();

    // Preview schedule (not yet persisted in entity table)
    const preview_schedule = {
      id: this._generateId('engine_schedule_preview'),
      engine_type,
      usage_frequency,
      water_type,
      start_date: start.toISOString(),
      reminder_frequency,
      generated_at: nowIso,
      notes: ''
    };

    // Determine task intervals based on reminder_frequency
    let intervalMonths = 1;
    if (reminder_frequency === 'every_3_months') intervalMonths = 3;
    else if (reminder_frequency === 'every_6_months') intervalMonths = 6;
    else if (reminder_frequency === 'every_12_months') intervalMonths = 12;

    // Generate tasks for one year ahead at chosen interval
    const tasks = [];
    const totalMonths = 12;
    let month = 0;
    let taskIndex = 1;

    while (month < totalMonths) {
      const dueDate = this._addMonths(start, month);
      const title = `Engine maintenance #${taskIndex}`;
      const description = 'Inspect engine, check fluids, flush after use, and review manufacturer schedule.';

      tasks.push({
        id: this._generateId('engine_task_preview'),
        schedule_id: preview_schedule.id,
        due_date: dueDate.toISOString(),
        title,
        description,
        is_completed: false
      });

      taskIndex += 1;
      month += intervalMonths;
    }

    // Store preview in internal state (not in main EngineMaintenanceSchedule table yet)
    this._storeLastGeneratedMaintenanceSchedule(preview_schedule, tasks);

    // Foreign key resolution: each task gets a `schedule` property when returned
    const tasksWithSchedule = tasks.map(t => ({ ...t, schedule: preview_schedule }));

    return {
      preview_schedule,
      tasks: tasksWithSchedule
    };
  }

  // 23. saveGeneratedMaintenanceSchedule(notes)
  saveGeneratedMaintenanceSchedule(notes) {
    const preview = this._getLastGeneratedMaintenanceSchedule();
    if (!preview || !preview.schedule || !Array.isArray(preview.tasks)) {
      return {
        success: false,
        schedule: null,
        tasks: [],
        message: 'No generated maintenance schedule to save.'
      };
    }

    const schedules = this._getFromStorage('engine_maintenance_schedules', []);
    const tasksAll = this._getFromStorage('engine_maintenance_tasks', []);

    // Create persistent schedule based on preview
    const schedule = {
      id: this._generateId('engine_schedule'),
      engine_type: preview.schedule.engine_type,
      usage_frequency: preview.schedule.usage_frequency,
      water_type: preview.schedule.water_type,
      start_date: preview.schedule.start_date,
      reminder_frequency: preview.schedule.reminder_frequency,
      generated_at: this._nowIso(),
      notes: typeof notes === 'string' && notes.length ? notes : (preview.schedule.notes || '')
    };

    schedules.push(schedule);

    // Create persistent tasks
    const newTasks = preview.tasks.map(pt => ({
      id: this._generateId('engine_maintenance_task'),
      schedule_id: schedule.id,
      due_date: pt.due_date,
      title: pt.title,
      description: pt.description,
      is_completed: false
    }));

    Array.prototype.push.apply(tasksAll, newTasks);

    this._saveToStorage('engine_maintenance_schedules', schedules);
    this._saveToStorage('engine_maintenance_tasks', tasksAll);

    // Update internal cached lastGeneratedMaintenanceSchedule to persistent version
    this._storeLastGeneratedMaintenanceSchedule(schedule, newTasks);

    // Foreign key resolution for return value
    const tasksWithSchedule = newTasks.map(t => ({ ...t, schedule }));

    return {
      success: true,
      schedule,
      tasks: tasksWithSchedule,
      message: 'Engine maintenance schedule saved.'
    };
  }

  // 24. getCoursesFilterOptions
  getCoursesFilterOptions() {
    const course_types = [
      { value: 'basic_boating_safety', label: 'Basic Boating Safety' },
      { value: 'advanced_navigation', label: 'Advanced Navigation' },
      { value: 'vhf_radio_operation', label: 'VHF Radio Operation' },
      { value: 'first_aid', label: 'First Aid' },
      { value: 'other', label: 'Other' }
    ];

    const distance_units = [
      { value: 'miles', label: 'Miles' },
      { value: 'kilometers', label: 'Kilometers' }
    ];

    const sort_options = [
      { value: 'price_low_to_high', label: 'Price: Low to High' },
      { value: 'rating_high_to_low', label: 'Rating: High to Low' },
      { value: 'soonest_start_date', label: 'Soonest Start Date' }
    ];

    return {
      course_types,
      distance_units,
      sort_options,
      price_max_default: 500
    };
  }

  // 25. listCourses(filters, sort, page, page_size)
  listCourses(filters, sort, page = 1, page_size = 20) {
    const f = filters || {};
    let courses = this._getFromStorage('courses', []);

    if (f.course_type) {
      courses = courses.filter(c => c.type === f.course_type);
    }

    if (typeof f.max_distance_miles === 'number') {
      courses = courses.filter(c => (c.distance_miles || 0) <= f.max_distance_miles);
    }

    if (typeof f.max_price === 'number') {
      courses = courses.filter(c => (c.price || 0) <= f.max_price);
    }

    if (f.level) {
      courses = courses.filter(c => c.level === f.level);
    }

    if (sort === 'price_low_to_high') {
      courses.sort((a, b) => (a.price || 0) - (b.price || 0));
    } else if (sort === 'rating_high_to_low') {
      courses.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (sort === 'soonest_start_date') {
      courses.sort((a, b) => {
        const ad = this._parseIsoDate(a.soonest_start_date) || new Date(8640000000000000);
        const bd = this._parseIsoDate(b.soonest_start_date) || new Date(8640000000000000);
        return ad - bd;
      });
    }

    const total_results = courses.length;
    const start = (page - 1) * page_size;
    const end = start + page_size;

    const pageItems = courses.slice(start, end);

    return {
      total_results,
      page,
      page_size,
      courses: pageItems
    };
  }

  // 26. getCourseDetail(courseId)
  getCourseDetail(courseId) {
    const courses = this._getFromStorage('courses', []);
    const entries = this._getFromStorage('training_plan_entries', []);

    const course = courses.find(c => c.id === courseId) || null;
    if (!course) {
      return {
        course: null,
        is_in_training_plan: false
      };
    }

    const is_in_training_plan = entries.some(e => e.course_id === courseId && e.status !== 'cancelled');

    return {
      course,
      is_in_training_plan
    };
  }

  // 27. addCourseToTrainingPlan(courseId, planned_start_month_label, planned_start_month_date)
  addCourseToTrainingPlan(courseId, planned_start_month_label, planned_start_month_date) {
    const courses = this._getFromStorage('courses', []);
    const courseExists = courses.some(c => c.id === courseId);

    if (!courseExists) {
      return {
        success: false,
        training_plan_entry: null,
        message: 'Course not found.'
      };
    }

    const entries = this._getFromStorage('training_plan_entries', []);

    let normalizedDate = null;
    if (planned_start_month_date) {
      const d = this._parseIsoDate(planned_start_month_date);
      normalizedDate = d ? d.toISOString() : null;
    } else {
      normalizedDate = this._parseMonthLabelToDate(planned_start_month_label);
    }

    const training_plan_entry = {
      id: this._generateId('training_plan_entry'),
      course_id: courseId,
      planned_start_month_label,
      planned_start_month_date: normalizedDate,
      status: 'planned',
      added_at: this._nowIso()
    };

    entries.push(training_plan_entry);
    this._saveToStorage('training_plan_entries', entries);
    this._persistSingleUserState();

    return {
      success: true,
      training_plan_entry,
      message: 'Course added to training plan.'
    };
  }

  // 28. getTrainingPlanEntries()
  getTrainingPlanEntries() {
    const entries = this._getFromStorage('training_plan_entries', []);
    const courses = this._getFromStorage('courses', []);

    const result = entries.map(entry => ({
      entry,
      course: courses.find(c => c.id === entry.course_id) || null
    }));

    return result;
  }

  // 29. searchGlossaryTerms(query)
  searchGlossaryTerms(query) {
    const q = (query || '').toLowerCase().trim();
    const terms = this._getFromStorage('glossary_terms', []);

    let filtered = terms;
    if (q) {
      filtered = terms.filter(t => {
        const term = (t.term || '').toLowerCase();
        const def = (t.definition || '').toLowerCase();
        const slug = (t.slug || '').toLowerCase();
        const synonyms = Array.isArray(t.synonyms) ? t.synonyms.join(' ').toLowerCase() : '';
        return term.includes(q) || def.includes(q) || slug.includes(q) || synonyms.includes(q);
      });
    }

    return {
      query,
      total_results: filtered.length,
      terms: filtered
    };
  }

  // 30. addTermToStudyList(termId)
  addTermToStudyList(termId) {
    const terms = this._getFromStorage('glossary_terms', []);
    const termExists = terms.some(t => t.id === termId);
    let studyItems = this._getFromStorage('study_list_items', []);

    if (!termExists) {
      return {
        success: false,
        study_list_item: null,
        total_terms: studyItems.length,
        message: 'Glossary term not found.'
      };
    }

    const existing = studyItems.find(s => s.term_id === termId);
    if (existing) {
      return {
        success: true,
        study_list_item: existing,
        total_terms: studyItems.length,
        message: 'Term already in Study List.'
      };
    }

    const study_list_item = {
      id: this._generateId('study_list_item'),
      term_id: termId,
      added_at: this._nowIso()
    };

    studyItems.push(study_list_item);
    this._saveToStorage('study_list_items', studyItems);
    this._persistSingleUserState();

    return {
      success: true,
      study_list_item,
      total_terms: studyItems.length,
      message: 'Term added to Study List.'
    };
  }

  // 31. removeTermFromStudyList(termId)
  removeTermFromStudyList(termId) {
    let studyItems = this._getFromStorage('study_list_items', []);
    const before = studyItems.length;
    studyItems = studyItems.filter(s => s.term_id !== termId);
    const after = studyItems.length;
    this._saveToStorage('study_list_items', studyItems);
    this._persistSingleUserState();

    const removed = before !== after;

    return {
      success: removed,
      total_terms: after,
      message: removed ? 'Term removed from Study List.' : 'Term was not in Study List.'
    };
  }

  // 32. getStudyListTerms()
  getStudyListTerms() {
    const studyItems = this._getFromStorage('study_list_items', []);
    const terms = this._getFromStorage('glossary_terms', []);

    const result = studyItems.map(study_list_item => ({
      study_list_item,
      term: terms.find(t => t.id === study_list_item.term_id) || null
    }));

    return { terms: result };
  }

  // 33. getAboutPageContent()
  getAboutPageContent() {
    const title = 'About This Boating Safety Site';
    const mission_text = 'Our mission is to make safe, confident boating accessible to everyone. We focus on clear, practical guidance you can use on your next trip a04 whether you are on a small open motorboat, a pontoon, or a sailing cruiser.';
    const audience_text = 'This site is designed for new and intermediate recreational boaters who want to build good habits around trip planning, navigation, equipment checks, and emergency response.';
    const content_sources_text = 'Content is compiled from state and federal boating safety agencies, recognized training providers, and experienced captains. Always confirm local regulations with your state boating agency.';
    const safety_guidelines_text = 'Nothing on this site replaces official regulations, licensing requirements, or your vessel manufacturer e2 80 99s capacity and safety plates. Always wear a life jacket, boat sober, and check weather and equipment before leaving the dock.';

    const key_sections = [
      {
        key: 'articles',
        title: 'Articles & Guides',
        description: 'Beginner-friendly how-tos on safety basics, navigation, anchoring, communication, and more.'
      },
      {
        key: 'checklists',
        title: 'Checklists',
        description: 'Trip preparation and safety checklists you can save and reuse.'
      },
      {
        key: 'tools',
        title: 'Planning Tools',
        description: 'Interactive tools like the boat capacity calculator and engine maintenance scheduler.'
      },
      {
        key: 'courses',
        title: 'Courses Directory',
        description: 'Links to certified safety and navigation courses near you.'
      }
    ];

    return {
      title,
      mission_text,
      audience_text,
      content_sources_text,
      safety_guidelines_text,
      key_sections
    };
  }

  // 34. getContactPageContent()
  getContactPageContent() {
    const title = 'Contact Us';
    const intro_text = 'Have a question about boating safety topics on the site, or a suggestion for a new checklist or tool? Use the contact details below or submit the form on this page.';
    const contact_email = 'support@example-boatingsafety.local';
    const mailing_address = 'Boating Safety Guides\n123 Harbor Way\nSample City, ST 00000';
    const response_expectations_text = 'We aim to respond to most messages within 3–5 business days. For real-time emergencies on the water, contact local authorities or issue a proper VHF distress call (e.g., Mayday) instead of using this form.';

    return {
      title,
      intro_text,
      contact_email,
      mailing_address,
      response_expectations_text
    };
  }

  // 35. submitContactForm(name, email, topic, message)
  submitContactForm(name, email, topic, message) {
    const submissions = this._getFromStorage('contact_submissions', []);

    const ticket_id = this._generateId('contact');

    const submission = {
      id: ticket_id,
      name,
      email,
      topic: topic || '',
      message,
      submitted_at: this._nowIso()
    };

    submissions.push(submission);
    this._saveToStorage('contact_submissions', submissions);

    return {
      success: true,
      ticket_id,
      message: 'Your message has been received.'
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