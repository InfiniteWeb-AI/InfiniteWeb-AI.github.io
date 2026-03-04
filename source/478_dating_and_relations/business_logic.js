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

  // ----------------------
  // Storage helpers
  // ----------------------

  _initStorage() {
    const keys = [
      'article_categories',
      'articles',
      'article_comments',
      'article_notes',
      'article_lists',
      'article_list_items',
      'reading_plans',
      'reading_plan_items',
      'quizzes',
      'quiz_questions',
      'quiz_results',
      'podcast_episodes',
      'playlists',
      'playlist_items',
      'advice_question_submissions',
      'static_pages',
      'contact_messages'
    ];

    keys.forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    });

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

  // ----------------------
  // Generic helpers
  // ----------------------

  _parseDate(value) {
    if (!value) return null;
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }

  _compareDatesDesc(a, b) {
    const da = this._parseDate(a) || new Date(0);
    const db = this._parseDate(b) || new Date(0);
    return db - da;
  }

  _filterArticlesBase(articles, filters) {
    const f = filters || {};
    return articles.filter((a) => {
      if (f.audience && a.audience !== f.audience) return false;
      if (f.age_group && a.age_group !== f.age_group) return false;
      if (f.relationship_stage && a.relationship_stage !== f.relationship_stage) return false;
      if (f.location_context && a.location_context !== f.location_context) return false;
      if (f.reading_length_category && a.reading_length_category !== f.reading_length_category) return false;
      if (typeof f.max_reading_time_minutes === 'number' && a.estimated_reading_time_minutes > f.max_reading_time_minutes) return false;
      if (typeof f.rating_min === 'number' && a.rating < f.rating_min) return false;
      if (f.date_published_from) {
        const from = this._parseDate(f.date_published_from);
        const pub = this._parseDate(a.published_at);
        if (from && pub && pub < from) return false;
      }
      if (f.date_published_to) {
        const to = this._parseDate(f.date_published_to);
        const pub = this._parseDate(a.published_at);
        if (to && pub && pub > to) return false;
      }
      if (Array.isArray(f.topic_tags) && f.topic_tags.length > 0) {
        const tags = Array.isArray(a.topic_tags) ? a.topic_tags : [];
        const hasAny = f.topic_tags.some((tag) => tags.includes(tag));
        if (!hasAny) return false;
      }
      return true;
    });
  }

  _sortArticles(articles, sort_by) {
    const list = articles.slice();
    switch (sort_by) {
      case 'most_popular':
        list.sort((a, b) => {
          const pa = typeof a.popularity_score === 'number' ? a.popularity_score : 0;
          const pb = typeof b.popularity_score === 'number' ? b.popularity_score : 0;
          if (pb !== pa) return pb - pa;
          return this._compareDatesDesc(a.published_at, b.published_at);
        });
        break;
      case 'top_rated':
      case 'rating_high_to_low':
        list.sort((a, b) => {
          if (b.rating !== a.rating) return b.rating - a.rating;
          const ca = typeof a.rating_count === 'number' ? a.rating_count : 0;
          const cb = typeof b.rating_count === 'number' ? b.rating_count : 0;
          if (cb !== ca) return cb - ca;
          return this._compareDatesDesc(a.published_at, b.published_at);
        });
        break;
      case 'newest_first':
        list.sort((a, b) => this._compareDatesDesc(a.published_at, b.published_at));
        break;
      case 'relevance':
      default:
        // default relevance: keep existing order
        break;
    }
    return list;
  }

  _resolveForeignKey(obj, allCollectionsMap) {
    // Generic FK resolver for fields ending with '_id' or 'Id'
    const resolved = Object.assign({}, obj);
    Object.keys(obj).forEach((key) => {
      if (key.endsWith('_id')) {
        const base = key.slice(0, -3); // remove '_id'
        const collectionKey = base + 's';
        const source = allCollectionsMap[collectionKey];
        if (Array.isArray(source)) {
          const value = source.find((item) => item.id === obj[key]) || null;
          resolved[base] = value;
        }
      } else if (key.endsWith('Id')) {
        const base = key.slice(0, -2); // remove 'Id'
        const collectionKey = base + 's';
        const source = allCollectionsMap[collectionKey];
        if (Array.isArray(source)) {
          const value = source.find((item) => item.id === obj[key]) || null;
          resolved[base] = value;
        }
      }
    });
    return resolved;
  }

  // ----------------------
  // Helper: Favorites list
  // ----------------------

  _getOrCreateDefaultFavoritesList() {
    const lists = this._getFromStorage('article_lists', []);
    const now = new Date().toISOString();
    let favorites = lists.find((l) => l.list_type === 'favorites' && l.is_default === true);
    if (!favorites) {
      favorites = {
        id: this._generateId('articlelist'),
        name: 'Favorites',
        list_type: 'favorites',
        description: '',
        is_default: true,
        created_at: now,
        updated_at: now
      };
      lists.push(favorites);
      this._saveToStorage('article_lists', lists);
    }
    return favorites;
  }

  // ----------------------
  // Helper: Reading plan
  // ----------------------

  _getOrCreateReadingPlan(planName, planType) {
    const reading_plans = this._getFromStorage('reading_plans', []);
    const now = new Date().toISOString();
    let plan = reading_plans.find((p) => p.name === planName && p.plan_type === planType);
    if (!plan) {
      plan = {
        id: this._generateId('readingplan'),
        name: planName,
        plan_type: planType,
        created_at: now,
        updated_at: now,
        is_active: true
      };
      // deactivate others
      reading_plans.forEach((p) => {
        if (p.id !== plan.id) p.is_active = false;
      });
      reading_plans.push(plan);
    } else {
      // activate this plan
      reading_plans.forEach((p) => {
        p.is_active = p.id === plan.id;
      });
      plan.updated_at = now;
    }
    this._saveToStorage('reading_plans', reading_plans);
    return plan;
  }

  // ----------------------
  // Helper: Playlist
  // ----------------------

  _getOrCreatePlaylist(name) {
    const playlists = this._getFromStorage('playlists', []);
    const now = new Date().toISOString();
    let playlist = playlists.find((p) => p.name === name);
    if (!playlist) {
      playlist = {
        id: this._generateId('playlist'),
        name: name,
        description: '',
        created_at: now,
        updated_at: now
      };
      playlists.push(playlist);
      this._saveToStorage('playlists', playlists);
    }
    return playlist;
  }

  // ----------------------
  // Helper: Advice validation
  // ----------------------

  _validateAdviceQuestionPayload(payload) {
    const errors = [];

    if (!payload.name || typeof payload.name !== 'string' || !payload.name.trim()) {
      errors.push({ field: 'name', message: 'Name is required.' });
    }

    const validStatuses = [
      'single',
      'in_relationship',
      'engaged',
      'married',
      'separated',
      'divorced',
      'its_complicated'
    ];
    if (!validStatuses.includes(payload.relationship_status)) {
      errors.push({ field: 'relationship_status', message: 'Invalid relationship status.' });
    }

    const validTopics = [
      'texting_communication',
      'online_dating',
      'first_dates',
      'long_distance_relationships',
      'breakups_healing',
      'conflict_arguments',
      'self_improvement',
      'general_dating'
    ];
    if (!validTopics.includes(payload.topic)) {
      errors.push({ field: 'topic', message: 'Invalid topic.' });
    }

    if (!payload.question_text || typeof payload.question_text !== 'string' || !payload.question_text.trim()) {
      errors.push({ field: 'question_text', message: 'Question text is required.' });
    }

    const validUrgencies = ['normal_3_5_days', 'urgent_1_2_days', 'low_7_plus_days'];
    if (!validUrgencies.includes(payload.urgency)) {
      errors.push({ field: 'urgency', message: 'Invalid urgency.' });
    }

    if (typeof payload.consent_to_publish !== 'boolean') {
      errors.push({ field: 'consent_to_publish', message: 'Consent to publish must be provided.' });
    }

    return errors;
  }

  // ----------------------
  // Interface: getMainArticleCategories
  // ----------------------

  getMainArticleCategories() {
    const categories = this._getFromStorage('article_categories', []);
    return categories.slice().sort((a, b) => {
      const pa = typeof a.position === 'number' ? a.position : 0;
      const pb = typeof b.position === 'number' ? b.position : 0;
      if (pa !== pb) return pa - pb;
      const na = a.name || '';
      const nb = b.name || '';
      return na.localeCompare(nb);
    });
  }

  // ----------------------
  // Interface: getHomeOverview
  // ----------------------

  getHomeOverview() {
    const articles = this._getFromStorage('articles', []).filter((a) => a.is_published);
    const quizzes = this._getFromStorage('quizzes', []).filter((q) => q.is_active);
    const podcastEpisodes = this._getFromStorage('podcast_episodes', []).filter((e) => e.is_published);
    const highlightCategories = this.getMainArticleCategories();

    const featured_articles = this._sortArticles(articles, 'newest_first').slice(0, 5);

    const popular_articles = articles
      .slice()
      .sort((a, b) => {
        const pa = typeof a.popularity_score === 'number' ? a.popularity_score : 0;
        const pb = typeof b.popularity_score === 'number' ? b.popularity_score : 0;
        if (pb !== pa) return pb - pa;
        return this._compareDatesDesc(a.published_at, b.published_at);
      })
      .slice(0, 5);

    const featured_quizzes = quizzes
      .slice()
      .sort((a, b) => this._compareDatesDesc(a.published_at, b.published_at))
      .slice(0, 3);

    const popular_podcast_episodes = podcastEpisodes
      .slice()
      .sort((a, b) => {
        const pa = typeof a.popularity_score === 'number' ? a.popularity_score : 0;
        const pb = typeof b.popularity_score === 'number' ? b.popularity_score : 0;
        if (pb !== pa) return pb - pa;
        const ca = typeof a.play_count === 'number' ? a.play_count : 0;
        const cb = typeof b.play_count === 'number' ? b.play_count : 0;
        return cb - ca;
      })
      .slice(0, 5);

    return {
      featured_articles,
      popular_articles,
      featured_quizzes,
      popular_podcast_episodes,
      highlight_categories: highlightCategories
    };
  }

  // ----------------------
  // Interface: searchArticles
  // ----------------------

  searchArticles(query, filters, sort_by = 'relevance', page = 1, page_size = 20) {
    const q = (query || '').toLowerCase().trim();
    const searchTerms = q ? q.split(/\s+/).filter(Boolean) : [];
    const allArticles = this._getFromStorage('articles', []).filter((a) => a.is_published);
    const f = filters || {};

    let filtered = allArticles.filter((a) => {
      if (f.category_key && f.category_key !== 'all_articles' && a.category_key !== f.category_key) {
        return false;
      }
      if (f.audience && a.audience !== f.audience) return false;
      if (f.age_group && a.age_group !== f.age_group) return false;
      if (f.relationship_stage && a.relationship_stage !== f.relationship_stage) return false;
      if (f.location_context && a.location_context !== f.location_context) return false;
      if (f.reading_length_category && a.reading_length_category !== f.reading_length_category) return false;
      if (typeof f.max_reading_time_minutes === 'number' && a.estimated_reading_time_minutes > f.max_reading_time_minutes) return false;
      if (typeof f.rating_min === 'number' && a.rating < f.rating_min) return false;

      if (f.date_published_from) {
        const from = this._parseDate(f.date_published_from);
        const pub = this._parseDate(a.published_at);
        if (from && pub && pub < from) return false;
      }
      if (f.date_published_to) {
        const to = this._parseDate(f.date_published_to);
        const pub = this._parseDate(a.published_at);
        if (to && pub && pub > to) return false;
      }

      if (Array.isArray(f.topic_tags) && f.topic_tags.length > 0) {
        const tags = Array.isArray(a.topic_tags) ? a.topic_tags : [];
        const hasAny = f.topic_tags.some((tag) => tags.includes(tag));
        if (!hasAny) return false;
      }

      if (!q || searchTerms.length === 0) return true;
      const title = (a.title || '').toLowerCase();
      const excerpt = (a.excerpt || '').toLowerCase();
      const content = (a.content || '').toLowerCase();
      const tags = Array.isArray(a.topic_tags) ? a.topic_tags.join(' ').toLowerCase() : '';
      const haystack = title + ' ' + excerpt + ' ' + content + ' ' + tags;
      return searchTerms.some((term) => haystack.includes(term));
    });

    if (sort_by === 'relevance' && q) {
      filtered = filtered
        .map((a) => {
          let score = 0;
          const title = (a.title || '').toLowerCase();
          const excerpt = (a.excerpt || '').toLowerCase();
          const content = (a.content || '').toLowerCase();
          const tags = Array.isArray(a.topic_tags) ? a.topic_tags.join(' ').toLowerCase() : '';
          if (title.includes(q)) score += 3;
          if (excerpt.includes(q)) score += 2;
          if (content.includes(q)) score += 1;
          if (tags.includes(q)) score += 1;
          const pop = typeof a.popularity_score === 'number' ? a.popularity_score : 0;
          score += pop / 1000;
          return { article: a, score };
        })
        .sort((x, y) => y.score - x.score)
        .map((x) => x.article);
    } else {
      filtered = this._sortArticles(filtered, sort_by);
    }

    const total = filtered.length;
    const start = (page - 1) * page_size;
    const results = filtered.slice(start, start + page_size);

    return {
      total,
      page,
      page_size,
      results
    };
  }

  // ----------------------
  // Interface: getArticleFilterOptions
  // ----------------------

  getArticleFilterOptions(category_key) {
    const articlesAll = this._getFromStorage('articles', []).filter((a) => a.is_published);
    const articles = category_key && category_key !== 'all_articles'
      ? articlesAll.filter((a) => a.category_key === category_key)
      : articlesAll;

    const audiencesEnum = [
      { value: 'men', label: 'Men' },
      { value: 'women', label: 'Women' },
      { value: 'couples', label: 'Couples' },
      { value: 'lgbtq_plus', label: 'LGBTQ+' },
      { value: 'all', label: 'All' }
    ];

    const ageGroupsEnum = [
      { value: 'teens_13_19', label: 'Teens (13–19)' },
      { value: 'twenties_20_29', label: '20–29' },
      { value: 'thirties_30_39', label: '30–39' },
      { value: 'forties_40_49', label: '40–49' },
      { value: 'fifties_plus_50_plus', label: '50+' }
    ];

    const relationshipStagesEnum = [
      { value: 'not_applicable', label: 'Not applicable' },
      { value: 'early_dating', label: 'Early dating' },
      { value: 'casual_dating', label: 'Casual dating' },
      { value: 'serious_relationship', label: 'Serious relationship' },
      { value: 'long_term_relationship', label: 'Long-term relationship' },
      { value: 'engaged', label: 'Engaged' },
      { value: 'married', label: 'Married' },
      { value: 'breakup_recovery', label: 'Breakup recovery' }
    ];

    const locationContextsEnum = [
      { value: 'not_applicable', label: 'Not applicable' },
      { value: 'big_city', label: 'Big city' },
      { value: 'urban', label: 'Urban' },
      { value: 'small_town', label: 'Small town' },
      { value: 'rural', label: 'Rural' },
      { value: 'long_distance', label: 'Long-distance' },
      { value: 'vacation', label: 'Vacation' },
      { value: 'at_home', label: 'At home' },
      { value: 'online_only', label: 'Online only' }
    ];

    const readingLengthEnum = [
      { value: 'short_0_7', label: 'Short (0–7 minutes)' },
      { value: 'medium_8_14', label: 'Medium (8–14 minutes)' },
      { value: 'long_15_plus', label: 'Long (15+ minutes)' }
    ];

    const ratingBuckets = [
      { min_value: 3, label: '3+ stars' },
      { min_value: 4, label: '4+ stars' },
      { min_value: 4.5, label: '4.5+ stars' }
    ];

    const readingTimeBuckets = [
      { max_minutes: 7, label: 'Up to 7 minutes' },
      { max_minutes: 10, label: 'Up to 10 minutes' },
      { max_minutes: 15, label: 'Up to 15 minutes' }
    ];

    const datePublishedRanges = [
      { value: 'last_7_days', label: 'Last 7 days' },
      { value: 'last_30_days', label: 'Last 30 days' },
      { value: 'last_12_months', label: 'Last 12 months' },
      { value: 'all_time', label: 'All time' }
    ];

    // Collect actual topic tags from existing articles
    const topicTagSet = new Set();
    articles.forEach((a) => {
      if (Array.isArray(a.topic_tags)) {
        a.topic_tags.forEach((t) => topicTagSet.add(t));
      }
    });

    return {
      audiences: audiencesEnum,
      age_groups: ageGroupsEnum,
      relationship_stages: relationshipStagesEnum,
      location_contexts: locationContextsEnum,
      reading_length_categories: readingLengthEnum,
      rating_buckets: ratingBuckets,
      reading_time_buckets: readingTimeBuckets,
      date_published_ranges: datePublishedRanges,
      topic_tags: Array.from(topicTagSet)
    };
  }

  // ----------------------
  // Interface: getArticlesByCategory
  // ----------------------

  getArticlesByCategory(category_key, filters, sort_by = 'newest_first', page = 1, page_size = 20) {
    const allCategories = this._getFromStorage('article_categories', []);
    const category = allCategories.find((c) => c.key === category_key) || null;

    const allArticles = this._getFromStorage('articles', []).filter((a) => a.is_published);
    const baseFiltered = category_key && category_key !== 'all_articles'
      ? allArticles.filter((a) => a.category_key === category_key)
      : allArticles;

    const filtered = this._filterArticlesBase(baseFiltered, filters || {});
    const sorted = this._sortArticles(filtered, sort_by);

    const total = sorted.length;
    const start = (page - 1) * page_size;
    const articles = sorted.slice(start, start + page_size);

    return {
      category,
      total,
      page,
      page_size,
      articles
    };
  }

  // ----------------------
  // Interface: getArticleDetail
  // ----------------------

  getArticleDetail(articleId) {
    const articles = this._getFromStorage('articles', []);
    const article = articles.find((a) => a.id === articleId) || null;

    const article_lists = this._getFromStorage('article_lists', []);
    const article_list_items = this._getFromStorage('article_list_items', []);
    const article_notes = this._getFromStorage('article_notes', []);
    const article_comments = this._getFromStorage('article_comments', []);

    const favorites = this._getOrCreateDefaultFavoritesList();
    const is_favorite = article_list_items.some(
      (item) => item.list_id === favorites.id && item.article_id === articleId
    );

    const listIdsWithArticle = article_list_items
      .filter((item) => item.article_id === articleId)
      .map((item) => item.list_id);

    const saved_lists = article_lists.filter((l) => listIdsWithArticle.includes(l.id));

    const user_notes = article_notes.filter((n) => n.article_id === articleId);

    const comments_preview = article_comments
      .filter((c) => c.article_id === articleId)
      .sort((a, b) => this._compareDatesDesc(a.created_at, b.created_at))
      .slice(0, 3);

    return {
      article,
      is_favorite,
      saved_lists,
      user_notes,
      comments_preview
    };
  }

  // ----------------------
  // Interface: saveArticleToFavorites
  // ----------------------

  saveArticleToFavorites(articleId) {
    const favoritesList = this._getOrCreateDefaultFavoritesList();
    const article_list_items = this._getFromStorage('article_list_items', []);
    const articles = this._getFromStorage('articles', []);
    const article = articles.find((a) => a.id === articleId) || null;

    if (!article) {
      return { success: false, message: 'Article not found.', favorites_count: 0 };
    }

    const exists = article_list_items.some(
      (item) => item.list_id === favoritesList.id && item.article_id === articleId
    );

    if (!exists) {
      const now = new Date().toISOString();
      const newItem = {
        id: this._generateId('articlelistitem'),
        list_id: favoritesList.id,
        article_id: articleId,
        added_at: now,
        source: 'manual'
      };
      article_list_items.push(newItem);
      this._saveToStorage('article_list_items', article_list_items);
    }

    const favorites_count = article_list_items.filter((i) => i.list_id === favoritesList.id).length;
    return { success: true, message: 'Article saved to Favorites.', favorites_count };
  }

  // ----------------------
  // Interface: saveArticleToList
  // ----------------------

  saveArticleToList(articleId, listId, newListName, listType = 'reading_list') {
    const now = new Date().toISOString();
    const article_lists = this._getFromStorage('article_lists', []);
    const article_list_items = this._getFromStorage('article_list_items', []);
    const articles = this._getFromStorage('articles', []);

    const article = articles.find((a) => a.id === articleId) || null;
    if (!article) {
      return { success: false, message: 'Article not found.', list: null, list_item: null };
    }

    let targetList = null;

    if (listId) {
      targetList = article_lists.find((l) => l.id === listId) || null;
      if (!targetList) {
        return { success: false, message: 'List not found.', list: null, list_item: null };
      }
    } else if (newListName) {
      targetList = {
        id: this._generateId('articlelist'),
        name: newListName,
        list_type: listType || 'reading_list',
        description: '',
        is_default: false,
        created_at: now,
        updated_at: now
      };
      article_lists.push(targetList);
      this._saveToStorage('article_lists', article_lists);
    } else {
      return { success: false, message: 'Either listId or newListName must be provided.', list: null, list_item: null };
    }

    let list_item = article_list_items.find(
      (item) => item.list_id === targetList.id && item.article_id === articleId
    );

    if (!list_item) {
      list_item = {
        id: this._generateId('articlelistitem'),
        list_id: targetList.id,
        article_id: articleId,
        added_at: now,
        source: 'manual'
      };
      article_list_items.push(list_item);
      this._saveToStorage('article_list_items', article_list_items);
    }

    return {
      success: true,
      list: targetList,
      list_item,
      message: 'Article saved to list.'
    };
  }

  // ----------------------
  // Interface: getUserArticleLists
  // ----------------------

  getUserArticleLists() {
    return this._getFromStorage('article_lists', []);
  }

  // ----------------------
  // Interface: addArticleNote
  // ----------------------

  addArticleNote(articleId, text) {
    const article_notes = this._getFromStorage('article_notes', []);
    const now = new Date().toISOString();
    const note = {
      id: this._generateId('articlenote'),
      article_id: articleId,
      text: text,
      created_at: now
    };
    article_notes.push(note);
    this._saveToStorage('article_notes', article_notes);

    // resolve FK
    const articles = this._getFromStorage('articles', []);
    const noteResolved = this._resolveForeignKey(note, { articles });
    return noteResolved;
  }

  // ----------------------
  // Interface: getArticleNotes
  // ----------------------

  getArticleNotes(articleId) {
    const notes = this._getFromStorage('article_notes', []).filter((n) => n.article_id === articleId);
    const articles = this._getFromStorage('articles', []);
    return notes.map((n) => this._resolveForeignKey(n, { articles }));
  }

  // ----------------------
  // Interface: postArticleComment
  // ----------------------

  postArticleComment(articleId, text, authorName) {
    const article_comments = this._getFromStorage('article_comments', []);
    const now = new Date().toISOString();
    const comment = {
      id: this._generateId('articlecomment'),
      article_id: articleId,
      text: text,
      author_name: authorName || null,
      created_at: now
    };
    article_comments.push(comment);
    this._saveToStorage('article_comments', article_comments);

    const articles = this._getFromStorage('articles', []);
    return this._resolveForeignKey(comment, { articles });
  }

  // ----------------------
  // Interface: getArticleComments
  // ----------------------

  getArticleComments(articleId, page = 1, page_size = 20) {
    const allComments = this._getFromStorage('article_comments', []); 
    const filtered = allComments
      .filter((c) => c.article_id === articleId)
      .sort((a, b) => this._compareDatesDesc(a.created_at, b.created_at));

    const total = filtered.length;
    const start = (page - 1) * page_size;
    const pageItems = filtered.slice(start, start + page_size);

    const articles = this._getFromStorage('articles', []);
    const comments = pageItems.map((c) => this._resolveForeignKey(c, { articles }));

    return {
      total,
      page,
      page_size,
      comments
    };
  }

  // ----------------------
  // Interface: addArticleToReadingPlanDay
  // ----------------------

  addArticleToReadingPlanDay(articleId, planName, planType = 'weekly', dayOfWeek) {
    const article = this._getFromStorage('articles', []).find((a) => a.id === articleId) || null;
    if (!article) {
      return { success: false, reading_plan: null, items: [] };
    }

    const plan = this._getOrCreateReadingPlan(planName, planType);
    const reading_plan_items = this._getFromStorage('reading_plan_items', []);
    const now = new Date().toISOString();

    const itemsForPlanAndDay = reading_plan_items.filter(
      (i) => i.reading_plan_id === plan.id && i.day_of_week === dayOfWeek
    );
    const nextPosition = itemsForPlanAndDay.length > 0
      ? Math.max.apply(null, itemsForPlanAndDay.map((i) => typeof i.position === 'number' ? i.position : 0)) + 1
      : 0;

    const newItem = {
      id: this._generateId('readingplanitem'),
      reading_plan_id: plan.id,
      article_id: articleId,
      day_of_week: dayOfWeek,
      position: nextPosition,
      added_at: now
    };

    reading_plan_items.push(newItem);
    this._saveToStorage('reading_plan_items', reading_plan_items);

    const articles = this._getFromStorage('articles', []);
    const itemsForPlan = reading_plan_items
      .filter((i) => i.reading_plan_id === plan.id)
      .map((i) => this._resolveForeignKey(i, { articles, reading_plans: [plan] }));

    return {
      success: true,
      reading_plan: plan,
      items: itemsForPlan
    };
  }

  // ----------------------
  // Interface: getActiveReadingPlan
  // ----------------------

  getActiveReadingPlan() {
    const reading_plans = this._getFromStorage('reading_plans', []);
    const reading_plan = reading_plans.find((p) => p.is_active) || null;

    if (!reading_plan) {
      return { reading_plan: null, days: [] };
    }

    const reading_plan_items = this._getFromStorage('reading_plan_items', []);
    const articles = this._getFromStorage('articles', []);

    const itemsForPlan = reading_plan_items
      .filter((i) => i.reading_plan_id === reading_plan.id)
      .sort((a, b) => {
        const pa = typeof a.position === 'number' ? a.position : 0;
        const pb = typeof b.position === 'number' ? b.position : 0;
        return pa - pb;
      });

    const grouped = {};
    itemsForPlan.forEach((item) => {
      const day = item.day_of_week;
      if (!grouped[day]) grouped[day] = [];
      const article = articles.find((a) => a.id === item.article_id) || null;
      grouped[day].push({
        reading_plan_item_id: item.id,
        article: article
      });
    });

    const dayOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const days = dayOrder
      .filter((d) => grouped[d] && grouped[d].length > 0)
      .map((d) => ({ day_of_week: d, articles: grouped[d] }));

    return {
      reading_plan,
      days
    };
  }

  // ----------------------
  // Interface: saveActiveReadingPlan
  // ----------------------

  saveActiveReadingPlan() {
    const reading_plans = this._getFromStorage('reading_plans', []);
    const reading_plan = reading_plans.find((p) => p.is_active) || null;
    return {
      success: true,
      reading_plan,
      message: reading_plan ? 'Active reading plan saved.' : 'No active reading plan to save.'
    };
  }

  // ----------------------
  // Interface: removeArticleFromReadingPlan
  // ----------------------

  removeArticleFromReadingPlan(readingPlanItemId) {
    const reading_plan_items = this._getFromStorage('reading_plan_items', []);
    const index = reading_plan_items.findIndex((i) => i.id === readingPlanItemId);
    if (index === -1) {
      return { success: false };
    }
    reading_plan_items.splice(index, 1);
    this._saveToStorage('reading_plan_items', reading_plan_items);
    return { success: true };
  }

  // ----------------------
  // Interface: updateReadingPlanName
  // ----------------------

  updateReadingPlanName(readingPlanId, newName) {
    const reading_plans = this._getFromStorage('reading_plans', []);
    const plan = reading_plans.find((p) => p.id === readingPlanId) || null;
    if (!plan) return null;
    plan.name = newName;
    plan.updated_at = new Date().toISOString();
    this._saveToStorage('reading_plans', reading_plans);
    return plan;
  }

  // ----------------------
  // Interface: switchActiveReadingPlan
  // ----------------------

  switchActiveReadingPlan(readingPlanId) {
    const reading_plans = this._getFromStorage('reading_plans', []);
    let target = null;
    reading_plans.forEach((p) => {
      if (p.id === readingPlanId) {
        p.is_active = true;
        target = p;
      } else {
        p.is_active = false;
      }
    });
    this._saveToStorage('reading_plans', reading_plans);
    return target;
  }

  // ----------------------
  // Interface: getQuizFilterOptions
  // ----------------------

  getQuizFilterOptions() {
    const audiences = [
      { value: 'singles', label: 'Singles' },
      { value: 'couples', label: 'Couples' },
      { value: 'men', label: 'Men' },
      { value: 'women', label: 'Women' },
      { value: 'all', label: 'All' }
    ];

    const topics = [
      { value: 'compatibility', label: 'Compatibility' },
      { value: 'communication', label: 'Communication' },
      { value: 'conflict', label: 'Conflict' },
      { value: 'attachment_style', label: 'Attachment style' },
      { value: 'love_language', label: 'Love language' },
      { value: 'self_awareness', label: 'Self-awareness' }
    ];

    const question_count_ranges = [
      { min: 1, max: 9, label: 'Under 10 questions' },
      { min: 10, max: 20, label: '10–20 questions' },
      { min: 21, max: 50, label: '21–50 questions' }
    ];

    return { audiences, topics, question_count_ranges };
  }

  // ----------------------
  // Interface: getQuizzes
  // ----------------------

  getQuizzes(filters, sort_by = 'newest_first', page = 1, page_size = 20) {
    const f = filters || {};
    let quizzes = this._getFromStorage('quizzes', []).filter((q) => q.is_active);

    quizzes = quizzes.filter((q) => {
      if (f.audience && q.audience !== f.audience) return false;
      if (f.topic && q.topic !== f.topic) return false;
      if (typeof f.question_count_min === 'number' && q.question_count < f.question_count_min) return false;
      if (typeof f.question_count_max === 'number' && q.question_count > f.question_count_max) return false;
      return true;
    });

    if (sort_by === 'newest_first') {
      quizzes.sort((a, b) => this._compareDatesDesc(a.published_at, b.published_at));
    } else if (sort_by === 'most_popular') {
      quizzes.sort((a, b) => {
        // no explicit popularity metric; approximate by question_count desc then newest
        if (b.question_count !== a.question_count) return b.question_count - a.question_count;
        return this._compareDatesDesc(a.published_at, b.published_at);
      });
    }

    const total = quizzes.length;
    const start = (page - 1) * page_size;
    const pageItems = quizzes.slice(start, start + page_size);

    return {
      total,
      page,
      page_size,
      quizzes: pageItems
    };
  }

  // ----------------------
  // Interface: getQuizDetail
  // ----------------------

  getQuizDetail(quizId) {
    const quizzes = this._getFromStorage('quizzes', []);
    const quiz = quizzes.find((q) => q.id === quizId) || null;
    const questionsAll = this._getFromStorage('quiz_questions', []);
    const questionsRaw = questionsAll
      .filter((q) => q.quiz_id === quizId)
      .sort((a, b) => a.order - b.order);

    const questions = questionsRaw.map((q) => this._resolveForeignKey(q, { quizzes }));

    return { quiz, questions };
  }

  // ----------------------
  // Interface: completeQuiz
  // ----------------------

  completeQuiz(quizId, respondentName, partnerName, answers) {
    const quizzes = this._getFromStorage('quizzes', []);
    const quiz = quizzes.find((q) => q.id === quizId) || null;
    const questions = this._getFromStorage('quiz_questions', []).filter((q) => q.quiz_id === quizId);

    const numQuestions = questions.length || 1;
    const maxPerQuestion = 3; // assume up to 4 options, for rough scoring
    const maxScore = numQuestions * maxPerQuestion;

    let rawScore = 0;
    if (Array.isArray(answers)) {
      answers.forEach((ans) => {
        const idx = typeof ans.selected_option_index === 'number' ? ans.selected_option_index : 0;
        if (idx > 0) rawScore += idx; // zero-based index
      });
    }
    const normalized = maxScore > 0 ? rawScore / maxScore : 0;

    let result_type = null;
    if (normalized <= 0.2) result_type = 'very_low';
    else if (normalized <= 0.4) result_type = 'low';
    else if (normalized <= 0.6) result_type = 'medium';
    else if (normalized <= 0.8) result_type = 'high';
    else result_type = 'very_high';

    const score = Math.round(normalized * 100);

    const now = new Date().toISOString();
    const quiz_results = this._getFromStorage('quiz_results', []);
    const result = {
      id: this._generateId('quizresult'),
      quiz_id: quizId,
      completed_at: now,
      respondent_name: respondentName || null,
      partner_name: partnerName || null,
      label: null,
      score: score,
      result_type: result_type,
      summary_text: '',
      saved_to_library: false
    };
    quiz_results.push(result);
    this._saveToStorage('quiz_results', quiz_results);

    // Instrumentation for task completion tracking
    try {
      localStorage.setItem('task5_quizAnswers', JSON.stringify({
        quizId: quizId,
        respondentName: respondentName,
        partnerName: partnerName,
        answers: answers
      }));
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return result;
  }

  // ----------------------
  // Interface: saveQuizResult
  // ----------------------

  saveQuizResult(resultId, label) {
    const quiz_results = this._getFromStorage('quiz_results', []);
    const result = quiz_results.find((r) => r.id === resultId) || null;
    if (!result) return null;
    result.label = label;
    result.saved_to_library = true;
    this._saveToStorage('quiz_results', quiz_results);
    return result;
  }

  // ----------------------
  // Interface: getQuizResult
  // ----------------------

  getQuizResult(resultId) {
    const quiz_results = this._getFromStorage('quiz_results', []);
    const result = quiz_results.find((r) => r.id === resultId) || null;
    if (!result) return null;
    const quizzes = this._getFromStorage('quizzes', []);
    return this._resolveForeignKey(result, { quizzes });
  }

  // ----------------------
  // Interface: getPodcastFilterOptions
  // ----------------------

  getPodcastFilterOptions() {
    const episodes = this._getFromStorage('podcast_episodes', []).filter((e) => e.is_published);
    const topicSet = new Set();
    episodes.forEach((e) => {
      if (Array.isArray(e.topics)) {
        e.topics.forEach((t) => topicSet.add(t));
      }
    });

    const duration_buckets = [
      { min_minutes: 0, max_minutes: 29, label: 'Under 30 minutes' },
      { min_minutes: 30, max_minutes: 59, label: '30–59 minutes' },
      { min_minutes: 60, max_minutes: 999, label: '60+ minutes' }
    ];

    const sort_options = ['most_played', 'most_popular', 'newest_first'];

    return {
      topics: Array.from(topicSet),
      duration_buckets,
      sort_options
    };
  }

  // ----------------------
  // Interface: getPodcastEpisodes
  // ----------------------

  getPodcastEpisodes(query, filters, sort_by = 'most_popular', page = 1, page_size = 20) {
    const q = (query || '').toLowerCase().trim();
    const f = filters || {};
    let episodes = this._getFromStorage('podcast_episodes', []).filter((e) => e.is_published);

    episodes = episodes.filter((e) => {
      if (q) {
        const title = (e.title || '').toLowerCase();
        const desc = (e.description || '').toLowerCase();
        if (!title.includes(q) && !desc.includes(q)) return false;
      }
      if (Array.isArray(f.topics) && f.topics.length > 0) {
        const topics = Array.isArray(e.topics) ? e.topics : [];
        const hasAny = f.topics.some((t) => topics.includes(t));
        if (!hasAny) return false;
      }
      if (typeof f.min_duration_minutes === 'number' && e.duration_minutes < f.min_duration_minutes) return false;
      if (typeof f.max_duration_minutes === 'number' && e.duration_minutes > f.max_duration_minutes) return false;
      return true;
    });

    if (sort_by === 'most_played') {
      episodes.sort((a, b) => {
        const ca = typeof a.play_count === 'number' ? a.play_count : 0;
        const cb = typeof b.play_count === 'number' ? b.play_count : 0;
        if (cb !== ca) return cb - ca;
        return this._compareDatesDesc(a.published_at, b.published_at);
      });
    } else if (sort_by === 'most_popular') {
      episodes.sort((a, b) => {
        const pa = typeof a.popularity_score === 'number' ? a.popularity_score : 0;
        const pb = typeof b.popularity_score === 'number' ? b.popularity_score : 0;
        if (pb !== pa) return pb - pa;
        const ca = typeof a.play_count === 'number' ? a.play_count : 0;
        const cb = typeof b.play_count === 'number' ? b.play_count : 0;
        return cb - ca;
      });
    } else if (sort_by === 'newest_first') {
      episodes.sort((a, b) => this._compareDatesDesc(a.published_at, b.published_at));
    }

    const total = episodes.length;
    const start = (page - 1) * page_size;
    const pageItems = episodes.slice(start, start + page_size);

    return {
      total,
      page,
      page_size,
      episodes: pageItems
    };
  }

  // ----------------------
  // Interface: getPodcastEpisodeDetail
  // ----------------------

  getPodcastEpisodeDetail(episodeId) {
    const episodes = this._getFromStorage('podcast_episodes', []);
    return episodes.find((e) => e.id === episodeId) || null;
  }

  // ----------------------
  // Interface: getUserPlaylists
  // ----------------------

  getUserPlaylists() {
    return this._getFromStorage('playlists', []);
  }

  // ----------------------
  // Interface: addEpisodeToPlaylist
  // ----------------------

  addEpisodeToPlaylist(episodeId, playlistId, newPlaylistName) {
    const episodes = this._getFromStorage('podcast_episodes', []);
    const episode = episodes.find((e) => e.id === episodeId) || null;
    if (!episode) {
      return { success: false, playlist: null, playlist_item: null, message: 'Episode not found.' };
    }

    let playlist = null;
    const now = new Date().toISOString();

    if (playlistId) {
      const playlists = this._getFromStorage('playlists', []);
      playlist = playlists.find((p) => p.id === playlistId) || null;
      if (!playlist) {
        return { success: false, playlist: null, playlist_item: null, message: 'Playlist not found.' };
      }
    } else if (newPlaylistName) {
      playlist = this._getOrCreatePlaylist(newPlaylistName);
    } else {
      return {
        success: false,
        playlist: null,
        playlist_item: null,
        message: 'Either playlistId or newPlaylistName must be provided.'
      };
    }

    const playlist_items = this._getFromStorage('playlist_items', []);
    const itemsForPlaylist = playlist_items.filter((i) => i.playlist_id === playlist.id);
    const nextPosition = itemsForPlaylist.length > 0
      ? Math.max.apply(null, itemsForPlaylist.map((i) => typeof i.position === 'number' ? i.position : 0)) + 1
      : 0;

    const playlist_item = {
      id: this._generateId('playlistitem'),
      playlist_id: playlist.id,
      podcast_episode_id: episodeId,
      added_at: now,
      position: nextPosition
    };

    playlist_items.push(playlist_item);
    this._saveToStorage('playlist_items', playlist_items);

    const playlist_item_resolved = this._resolveForeignKey(playlist_item, {
      playlists: [playlist],
      podcast_episodes: episodes
    });

    return {
      success: true,
      playlist,
      playlist_item: playlist_item_resolved,
      message: 'Episode added to playlist.'
    };
  }

  // ----------------------
  // Interface: updatePlaylistOrder
  // ----------------------

  updatePlaylistOrder(playlistId, orderedEpisodeIds) {
    const playlists = this._getFromStorage('playlists', []);
    const playlist = playlists.find((p) => p.id === playlistId) || null;
    if (!playlist) return null;

    const playlist_items = this._getFromStorage('playlist_items', []);
    const itemsForPlaylist = playlist_items.filter((i) => i.playlist_id === playlistId);

    let position = 0;
    if (Array.isArray(orderedEpisodeIds)) {
      orderedEpisodeIds.forEach((episodeId) => {
        const item = itemsForPlaylist.find((i) => i.podcast_episode_id === episodeId);
        if (item) {
          item.position = position++;
        }
      });
    }

    itemsForPlaylist.forEach((item) => {
      if (typeof item.position !== 'number') {
        item.position = position++;
      }
    });

    this._saveToStorage('playlist_items', playlist_items);

    playlist.updated_at = new Date().toISOString();
    this._saveToStorage('playlists', playlists);

    return playlist;
  }

  // ----------------------
  // Interface: removeEpisodeFromPlaylist
  // ----------------------

  removeEpisodeFromPlaylist(playlistItemId) {
    const playlist_items = this._getFromStorage('playlist_items', []);
    const index = playlist_items.findIndex((i) => i.id === playlistItemId);
    if (index === -1) {
      return { success: false };
    }
    playlist_items.splice(index, 1);
    this._saveToStorage('playlist_items', playlist_items);
    return { success: true };
  }

  // ----------------------
  // Interface: getAdviceFormOptions
  // ----------------------

  getAdviceFormOptions() {
    const relationship_status_options = [
      { value: 'single', label: 'Single' },
      { value: 'in_relationship', label: 'In a relationship' },
      { value: 'engaged', label: 'Engaged' },
      { value: 'married', label: 'Married' },
      { value: 'separated', label: 'Separated' },
      { value: 'divorced', label: 'Divorced' },
      { value: 'its_complicated', label: "It’s complicated" }
    ];

    const topic_options = [
      { value: 'texting_communication', label: 'Texting & Communication' },
      { value: 'online_dating', label: 'Online Dating' },
      { value: 'first_dates', label: 'First Dates' },
      { value: 'long_distance_relationships', label: 'Long-distance Relationships' },
      { value: 'breakups_healing', label: 'Breakups & Healing' },
      { value: 'conflict_arguments', label: 'Conflict & Arguments' },
      { value: 'self_improvement', label: 'Self-improvement' },
      { value: 'general_dating', label: 'General Dating' }
    ];

    const urgency_options = [
      { value: 'normal_3_5_days', label: 'Normal (3–5 days)' },
      { value: 'urgent_1_2_days', label: 'Urgent (1–2 days)' },
      { value: 'low_7_plus_days', label: 'Low priority (7+ days)' }
    ];

    return { relationship_status_options, topic_options, urgency_options };
  }

  // ----------------------
  // Interface: submitAdviceQuestion
  // ----------------------

  submitAdviceQuestion(name, relationship_status, topic, question_text, urgency, consent_to_publish) {
    const payload = {
      name,
      relationship_status,
      topic,
      question_text,
      urgency,
      consent_to_publish
    };

    const errors = this._validateAdviceQuestionPayload(payload);
    if (errors.length > 0) {
      return {
        success: false,
        submission: null,
        message: 'Validation failed.',
        errors
      };
    }

    const submissions = this._getFromStorage('advice_question_submissions', []);
    const now = new Date().toISOString();
    const submission = {
      id: this._generateId('advicequestion'),
      name,
      relationship_status,
      topic,
      question_text,
      urgency,
      consent_to_publish,
      submitted_at: now,
      status: 'received'
    };

    submissions.push(submission);
    this._saveToStorage('advice_question_submissions', submissions);

    return {
      success: true,
      submission,
      message: 'Question submitted successfully.',
      errors: []
    };
  }

  // ----------------------
  // Interface: getMyLibraryOverview
  // ----------------------

  getMyLibraryOverview() {
    const article_lists = this._getFromStorage('article_lists', []);
    const article_list_items = this._getFromStorage('article_list_items', []);
    const articles = this._getFromStorage('articles', []);

    const playlists = this._getFromStorage('playlists', []);
    const playlist_items = this._getFromStorage('playlist_items', []);
    const podcast_episodes = this._getFromStorage('podcast_episodes', []);

    const quiz_results = this._getFromStorage('quiz_results', []);
    const reading_plans = this._getFromStorage('reading_plans', []);

    const article_lists_overview = article_lists.map((list) => {
      const items = article_list_items.filter((i) => i.list_id === list.id);
      const arts = items
        .map((i) => articles.find((a) => a.id === i.article_id) || null)
        .filter((a) => a !== null);
      return { list, articles: arts };
    });

    const playlists_overview = playlists.map((playlist) => {
      const items = playlist_items
        .filter((i) => i.playlist_id === playlist.id)
        .sort((a, b) => {
          const pa = typeof a.position === 'number' ? a.position : 0;
          const pb = typeof b.position === 'number' ? b.position : 0;
          return pa - pb;
        });
      const episodes = items
        .map((i) => podcast_episodes.find((e) => e.id === i.podcast_episode_id) || null)
        .filter((e) => e !== null);
      return { playlist, episodes };
    });

    const saved_quiz_results = quiz_results.filter((r) => r.saved_to_library);

    const active_plan = reading_plans.find((p) => p.is_active) || null;
    const active_reading_plan_id = active_plan ? active_plan.id : null;

    return {
      article_lists: article_lists_overview,
      playlists: playlists_overview,
      saved_quiz_results,
      reading_plans,
      active_reading_plan_id
    };
  }

  // ----------------------
  // Interface: getStaticPageContent
  // ----------------------

  getStaticPageContent(pageKey) {
    const pages = this._getFromStorage('static_pages', []);
    const page = pages.find((p) => p.page_key === pageKey);
    if (page) return page;
    // Return empty shell if not found (no storage mutation)
    return {
      page_key: pageKey,
      title: '',
      content_html: ''
    };
  }

  // ----------------------
  // Interface: submitContactMessage
  // ----------------------

  submitContactMessage(name, email, subject, message) {
    const contact_messages = this._getFromStorage('contact_messages', []);
    const now = new Date().toISOString();
    const msg = {
      id: this._generateId('contactmsg'),
      name,
      email,
      subject,
      message,
      submitted_at: now
    };
    contact_messages.push(msg);
    this._saveToStorage('contact_messages', contact_messages);
    return {
      success: true,
      message: 'Message submitted successfully.'
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