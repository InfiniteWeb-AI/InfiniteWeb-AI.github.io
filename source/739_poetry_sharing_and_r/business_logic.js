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

  // ----------------------
  // Storage helpers
  // ----------------------
  _initStorage() {
    const now = this._nowISO();
    const defaults = [
      'poets',
      'poems',
      'reading_lists',
      'reading_list_items',
      'comments',
      'prompts',
      'poem_reports'
    ];

    defaults.forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    });

    // Single current-user notification settings object
    if (!localStorage.getItem('notification_settings')) {
      const settings = {
        id: 'notification_settings_1',
        in_app_new_comments: true,
        in_app_new_likes: true,
        in_app_new_followers: true,
        email_weekly_newsletter: false,
        email_new_prompt_available: true,
        created_at: now,
        updated_at: now
      };
      localStorage.setItem('notification_settings', JSON.stringify(settings));
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

  _nowISO() {
    return new Date().toISOString();
  }

  _computeLineCount(body) {
    if (!body || body.trim() === '') return 0;
    return body.split(/\r?\n/).length;
  }

  _getThemeLabel(theme) {
    const map = {
      love_romance: 'Love / Romance',
      nature: 'Nature',
      urban_life: 'Urban Life',
      friendship: 'Friendship',
      life: 'Life',
      other: 'Other'
    };
    return map[theme] || 'Other';
  }

  _getFormLabel(form) {
    const map = {
      haiku: 'Haiku',
      sonnet: 'Sonnet',
      free_verse: 'Free verse',
      spoken_word: 'Spoken word',
      other: 'Other'
    };
    return map[form] || 'Other';
  }

  _getLanguageLabel(lang) {
    const map = {
      english: 'English',
      spanish: 'Spanish',
      french: 'French',
      german: 'German',
      other: 'Other'
    };
    return map[lang] || 'Other';
  }

  // Resolve current user Poet record (create minimal one if missing)
  _getCurrentUserPoetRecord() {
    const poets = this._getFromStorage('poets');
    let current = poets.find((p) => p.is_current_user_poet);
    if (!current) {
      const now = this._nowISO();
      current = {
        id: this._generateId('poet'),
        display_name: 'You',
        bio: '',
        profile_image_url: '',
        follower_count: 0,
        is_followed_by_current_user: false,
        is_current_user_poet: true,
        created_at: now,
        updated_at: now
      };
      poets.push(current);
      this._saveToStorage('poets', poets);
    }
    return current;
  }

  // Attach related entities to a poem (foreign key resolution)
  _attachPoemRelations(poem) {
    if (!poem) return null;
    const poets = this._getFromStorage('poets');
    const prompts = this._getFromStorage('prompts');
    const poet = poets.find((p) => p.id === poem.poet_id) || null;
    const prompt = poem.prompt_id
      ? prompts.find((pr) => pr.id === poem.prompt_id) || null
      : null;
    return {
      ...poem,
      poet,
      prompt
    };
  }

  _attachCommentRelations(comment) {
    if (!comment) return null;
    const poems = this._getFromStorage('poems');
    const poem = poems.find((p) => p.id === comment.poem_id) || null;
    return {
      ...comment,
      poem: this._attachPoemRelations(poem)
    };
  }

  _getNotificationSettingsRaw() {
    const raw = localStorage.getItem('notification_settings');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // Support both object and array storage formats
    if (Array.isArray(parsed)) {
      return parsed[0] || null;
    }
    return parsed;
  }

  _setNotificationSettingsRaw(settings) {
    localStorage.setItem('notification_settings', JSON.stringify(settings));
  }

  _getCurrentWeeklyPrompt() {
    const prompts = this._getFromStorage('prompts');
    const weekly = prompts.filter(
      (p) => p.prompt_type === 'weekly' && p.status === 'active'
    );
    if (weekly.length === 0) return null;
    weekly.sort((a, b) => {
      const da = a.start_date || a.created_at;
      const db = b.start_date || b.created_at;
      return db.localeCompare(da);
    });
    return weekly[0];
  }

  // Apply filters and sorting for poems (used by searchPoems and browsePoems)
  _applyPoemFiltersAndSorting(poems, filters, sort, context) {
    let result = poems.slice();
    const f = filters || {};

    // Theme
    if (f.theme && f.theme !== 'all') {
      result = result.filter((p) => p.theme === f.theme);
    }

    // Form
    if (f.form && f.form !== 'all') {
      result = result.filter((p) => p.form === f.form);
    }

    // Content type
    if (f.content_type && f.content_type !== 'all') {
      result = result.filter((p) => p.content_type === f.content_type);
    }

    // Ratings
    if (typeof f.min_rating === 'number') {
      result = result.filter((p) => (p.average_rating || 0) >= f.min_rating);
    }
    if (typeof f.max_rating === 'number') {
      result = result.filter((p) => (p.average_rating || 0) <= f.max_rating);
    }

    // Likes
    if (typeof f.min_likes === 'number') {
      result = result.filter((p) => (p.like_count || 0) >= f.min_likes);
    }
    if (typeof f.max_likes === 'number') {
      result = result.filter((p) => (p.like_count || 0) <= f.max_likes);
    }

    // Line count
    if (typeof f.min_line_count === 'number') {
      result = result.filter((p) => (p.line_count || 0) >= f.min_line_count);
    }
    if (typeof f.max_line_count === 'number') {
      result = result.filter((p) => (p.line_count || 0) <= f.max_line_count);
    }

    // Publication dates
    if (f.published_before) {
      const before = new Date(f.published_before).getTime();
      result = result.filter((p) => {
        if (!p.published_at) return false;
        return new Date(p.published_at).getTime() < before;
      });
    }
    if (f.published_after) {
      const after = new Date(f.published_after).getTime();
      result = result.filter((p) => {
        if (!p.published_at) return false;
        return new Date(p.published_at).getTime() > after;
      });
    }

    // Duration (spoken word)
    if (typeof f.duration_seconds_min === 'number') {
      result = result.filter(
        (p) => (p.duration_seconds || 0) >= f.duration_seconds_min
      );
    }
    if (typeof f.duration_seconds_max === 'number') {
      result = result.filter(
        (p) => (p.duration_seconds || 0) <= f.duration_seconds_max
      );
    }

    // Timeframe (e.g., trending_this_week)
    if (f.timeframe === 'trending_this_week') {
      result = result.filter((p) => {
        return (
          (typeof p.trending_rank_week === 'number' && p.trending_rank_week > 0) ||
          (typeof p.trending_score_week === 'number' && p.trending_score_week > 0)
        );
      });
    }

    // Sorting
    const sortKey = sort || (context === 'spoken_word' ? 'trending_rank_week' : 'most_recent');

    result.sort((a, b) => {
      const key = sortKey;
      if (key === 'rating_high_to_low') {
        return (b.average_rating || 0) - (a.average_rating || 0);
      }
      if (key === 'most_recent' || key === 'newest') {
        const da = a.published_at || a.created_at;
        const db = b.published_at || b.created_at;
        return db.localeCompare(da);
      }
      if (key === 'oldest_first') {
        const da = a.published_at || a.created_at;
        const db = b.published_at || b.created_at;
        return da.localeCompare(db);
      }
      if (key === 'most_popular') {
        return (b.like_count || 0) - (a.like_count || 0);
      }
      if (key === 'trending_rank_week') {
        const ra = typeof a.trending_rank_week === 'number' && a.trending_rank_week > 0 ? a.trending_rank_week : Number.MAX_SAFE_INTEGER;
        const rb = typeof b.trending_rank_week === 'number' && b.trending_rank_week > 0 ? b.trending_rank_week : Number.MAX_SAFE_INTEGER;
        if (ra !== rb) return ra - rb;
        // tie-breaker by like_count
        return (b.like_count || 0) - (a.like_count || 0);
      }
      if (key === 'trending_score_week') {
        return (b.trending_score_week || 0) - (a.trending_score_week || 0);
      }
      return 0;
    });

    return result;
  }

  _updateReadingListOrderIndexes(readingListId) {
    const items = this._getFromStorage('reading_list_items');
    const related = items
      .filter((i) => i.reading_list_id === readingListId)
      .sort((a, b) => a.order_index - b.order_index);
    related.forEach((item, idx) => {
      item.order_index = idx;
    });
    this._saveToStorage('reading_list_items', items);
  }

  _persistNotificationSettings(newSettings) {
    const current = this._getNotificationSettingsRaw();
    const now = this._nowISO();
    const merged = {
      ...(current || {
        id: 'notification_settings_1',
        created_at: now
      }),
      ...newSettings,
      updated_at: now
    };
    this._setNotificationSettingsRaw(merged);
    return merged;
  }

  _computeTrendingScores() {
    // Simple heuristic: rank spoken word poems by like_count descending
    const poems = this._getFromStorage('poems');
    const spoken = poems
      .filter((p) => p.content_type === 'spoken_word' && p.status === 'published')
      .sort((a, b) => (b.like_count || 0) - (a.like_count || 0));

    spoken.forEach((p, idx) => {
      p.trending_rank_week = idx + 1;
      p.trending_score_week = p.like_count || 0;
    });

    this._saveToStorage('poems', poems);
  }

  _upsertPoemFromEditorState(params) {
    const {
      poemId,
      mode,
      title,
      body,
      tags,
      theme,
      form,
      language,
      visibility,
      commentsEnabled,
      contentType,
      scheduleAt,
      promptId
    } = params;

    const poems = this._getFromStorage('poems');
    const now = this._nowISO();
    const currentUser = this._getCurrentUserPoetRecord();

    let poem = poemId ? poems.find((p) => p.id === poemId) : null;
    const isNew = !poem;

    if (!poem) {
      poem = {
        id: this._generateId('poem'),
        title: '',
        body: '',
        poet_id: currentUser.id,
        theme: theme || 'other',
        form: form || 'free_verse',
        language: language || 'english',
        tags: Array.isArray(tags) ? tags.slice() : [],
        content_type: contentType || 'text',
        average_rating: 0,
        rating_count: 0,
        like_count: 0,
        liked_by_current_user: false,
        is_bookmarked: false,
        comment_count: 0,
        comments_enabled: commentsEnabled,
        line_count: this._computeLineCount(body),
        duration_seconds: 0,
        visibility: visibility || 'public',
        status: 'draft',
        is_prompt_response: !!promptId,
        prompt_id: promptId || null,
        trending_score_week: 0,
        trending_rank_week: 0,
        published_at: null,
        scheduled_publication_at: null,
        created_at: now,
        updated_at: now
      };
    } else {
      poem = { ...poem };
      poem.updated_at = now;
    }

    poem.title = title;
    poem.body = body;
    poem.tags = Array.isArray(tags) ? tags.slice() : [];
    poem.theme = theme || poem.theme || 'other';
    poem.form = form || poem.form || 'free_verse';
    poem.language = language;
    poem.visibility = visibility;
    poem.comments_enabled = commentsEnabled;
    poem.content_type = contentType;
    poem.line_count = this._computeLineCount(body);
    poem.is_prompt_response = !!promptId;
    poem.prompt_id = promptId || null;

    if (mode === 'save_draft') {
      poem.status = 'draft';
      poem.published_at = null;
      poem.scheduled_publication_at = null;
    } else if (mode === 'publish_now') {
      poem.status = 'published';
      poem.published_at = now;
      poem.scheduled_publication_at = null;
    } else if (mode === 'schedule') {
      poem.status = 'scheduled';
      poem.scheduled_publication_at = scheduleAt || null;
      poem.published_at = null;
    }

    if (isNew) {
      poems.push(poem);
    } else {
      const idx = poems.findIndex((p) => p.id === poem.id);
      if (idx !== -1) poems[idx] = poem;
    }

    this._saveToStorage('poems', poems);

    return poem;
  }

  // ----------------------
  // Core interface implementations
  // ----------------------

  // getHomeOverview()
  getHomeOverview() {
    const poems = this._getFromStorage('poems');
    const poets = this._getFromStorage('poets');

    const published = poems.filter(
      (p) => p.status === 'published' && p.visibility === 'public'
    );
    published.sort((a, b) => {
      const da = a.published_at || a.created_at;
      const db = b.published_at || b.created_at;
      return db.localeCompare(da);
    });

    const featured_poems = published.slice(0, 5).map((poem) => {
      const poet = poets.find((pt) => pt.id === poem.poet_id) || null;
      return {
        poem: this._attachPoemRelations(poem),
        poet
      };
    });

    const current_weekly_prompt = this._getCurrentWeeklyPrompt();

    return { featured_poems, current_weekly_prompt };
  }

  // getPoemFilterOptions(context)
  getPoemFilterOptions(context) {
    // Static metadata; not content data
    const themes = [
      { value: 'love_romance', label: 'Love / Romance' },
      { value: 'nature', label: 'Nature' },
      { value: 'urban_life', label: 'Urban Life' },
      { value: 'friendship', label: 'Friendship' },
      { value: 'life', label: 'Life' },
      { value: 'other', label: 'Other' }
    ];

    const forms = [
      { value: 'haiku', label: 'Haiku' },
      { value: 'sonnet', label: 'Sonnet' },
      { value: 'free_verse', label: 'Free verse' },
      { value: 'spoken_word', label: 'Spoken word' },
      { value: 'other', label: 'Other' }
    ];

    const ratings = [
      {
        value: 'four_point_five_and_up',
        label: '4.5 stars & up',
        min_rating: 4.5,
        max_rating: 5
      },
      {
        value: 'four_and_up',
        label: '4.0 stars & up',
        min_rating: 4.0,
        max_rating: 5
      },
      {
        value: 'under_four',
        label: 'Under 4 stars',
        min_rating: 0,
        max_rating: 3.9
      }
    ];

    const lengths = [
      {
        value: 'under_30_lines',
        label: 'Under 30 lines',
        min_line_count: 0,
        max_line_count: 30
      },
      {
        value: 'under_10_lines',
        label: 'Under 10 lines',
        min_line_count: 0,
        max_line_count: 10
      }
    ];

    const likes = [
      {
        value: 'min_50_likes',
        label: '50 likes & up',
        min_likes: 50
      }
    ];

    const date_ranges = [
      {
        value: 'before_2023',
        label: 'Before Jan 1, 2023',
        start_date: null,
        end_date: '2023-01-01T00:00:00.000Z'
      },
      {
        value: 'last_30_days',
        label: 'Last 30 days',
        start_date: null,
        end_date: null
      }
    ];

    const spoken_word_durations = [
      {
        value: 'one_to_three_minutes',
        label: '1–3 minutes',
        min_seconds: 60,
        max_seconds: 180
      }
    ];

    const timeframes = [
      { value: 'trending_this_week', label: 'Trending this week' },
      { value: 'all_time', label: 'All time' }
    ];

    const sort_options = [
      {
        value: 'most_recent',
        label: 'Most recent',
        default_for_contexts: ['browse', 'search', 'prompts']
      },
      {
        value: 'oldest_first',
        label: 'Oldest first',
        default_for_contexts: []
      },
      {
        value: 'rating_high_to_low',
        label: 'Rating: High to Low',
        default_for_contexts: ['search']
      },
      {
        value: 'most_popular',
        label: 'Most popular',
        default_for_contexts: []
      },
      {
        value: 'trending_rank_week',
        label: 'Trending rank (this week)',
        default_for_contexts: ['spoken_word']
      },
      {
        value: 'most_followed_poets',
        label: 'Most followed poets',
        default_for_contexts: []
      }
    ];

    return {
      themes,
      forms,
      ratings,
      lengths,
      likes,
      date_ranges,
      spoken_word_durations,
      timeframes,
      sort_options
    };
  }

  // searchPoems(query, filters, sort, page, page_size)
  searchPoems(query, filters, sort, page = 1, page_size = 20) {
    const poems = this._getFromStorage('poems');
    const poets = this._getFromStorage('poets');
    const q = (query || '').trim().toLowerCase();

    let base = poems.filter(
      (p) => p.status === 'published' && p.visibility !== 'private'
    );

    if (q) {
      base = base.filter((p) => {
        const text = (
          (p.title || '') +
          ' ' +
          (p.body || '') +
          ' ' +
          ((p.tags || []).join(' ') || '')
        ).toLowerCase();
        return text.includes(q);
      });
    }

    const filteredSorted = this._applyPoemFiltersAndSorting(
      base,
      filters,
      sort,
      'search'
    );

    const total_count = filteredSorted.length;
    const start = (page - 1) * page_size;
    const end = start + page_size;
    const slice = filteredSorted.slice(start, end);

    const results = slice.map((poem) => {
      const poet = poets.find((pt) => pt.id === poem.poet_id) || null;
      return {
        poem: this._attachPoemRelations(poem),
        poet_display_name: poet ? poet.display_name : null,
        poet_follower_count: poet ? poet.follower_count : 0,
        theme_label: this._getThemeLabel(poem.theme),
        form_label: this._getFormLabel(poem.form)
      };
    });

    return {
      total_count,
      page,
      page_size,
      results
    };
  }

  // browsePoems(filters, sort, page, page_size)
  browsePoems(filters, sort, page = 1, page_size = 20) {
    const poems = this._getFromStorage('poems');
    const poets = this._getFromStorage('poets');

    const base = poems.filter((p) => p.status === 'published' && p.visibility !== 'private');

    const context = filters && filters.content_type === 'spoken_word' ? 'spoken_word' : 'browse';
    const filteredSorted = this._applyPoemFiltersAndSorting(base, filters, sort, context);

    const total_count = filteredSorted.length;
    const start = (page - 1) * page_size;
    const end = start + page_size;
    const slice = filteredSorted.slice(start, end);

    const results = slice.map((poem) => {
      const poet = poets.find((pt) => pt.id === poem.poet_id) || null;
      return {
        poem: this._attachPoemRelations(poem),
        poet_display_name: poet ? poet.display_name : null,
        poet_follower_count: poet ? poet.follower_count : 0,
        theme_label: this._getThemeLabel(poem.theme),
        form_label: this._getFormLabel(poem.form)
      };
    });

    return {
      total_count,
      page,
      page_size,
      results
    };
  }

  // getPoemDetail(poemId)
  getPoemDetail(poemId) {
    const poems = this._getFromStorage('poems');
    const poets = this._getFromStorage('poets');
    const readingLists = this._getFromStorage('reading_lists');
    const readingListItems = this._getFromStorage('reading_list_items');
    const comments = this._getFromStorage('comments');

    const poem = poems.find((p) => p.id === poemId) || null;
    if (!poem) {
      return {
        poem: null,
        poet: null,
        theme_label: null,
        form_label: null,
        language_label: null,
        viewer_liked: false,
        viewer_bookmarked: false,
        can_edit: false,
        can_comment: false,
        in_reading_lists: [],
        comments_preview: [],
        comments_total_count: 0
      };
    }

    const poet = poets.find((pt) => pt.id === poem.poet_id) || null;
    const currentUser = this._getCurrentUserPoetRecord();

    const poemComments = comments.filter((c) => c.poem_id === poemId);
    poemComments.sort((a, b) => b.created_at.localeCompare(a.created_at));
    const comments_preview = poemComments.slice(0, 3).map((c) => this._attachCommentRelations(c));

    const comments_total_count = poemComments.length;

    const listIds = readingListItems
      .filter((item) => item.poem_id === poemId)
      .map((item) => item.reading_list_id);
    const uniqueListIds = Array.from(new Set(listIds));
    const in_reading_lists = uniqueListIds
      .map((id) => readingLists.find((rl) => rl.id === id))
      .filter((rl) => !!rl);

    const can_edit = poem.poet_id === currentUser.id;
    const can_comment = !!poem.comments_enabled && poem.visibility !== 'private';

    return {
      poem: this._attachPoemRelations(poem),
      poet,
      theme_label: this._getThemeLabel(poem.theme),
      form_label: this._getFormLabel(poem.form),
      language_label: this._getLanguageLabel(poem.language),
      viewer_liked: !!poem.liked_by_current_user,
      viewer_bookmarked: !!poem.is_bookmarked,
      can_edit,
      can_comment,
      in_reading_lists,
      comments_preview,
      comments_total_count
    };
  }

  // getPoemComments(poemId, page, page_size, sort)
  getPoemComments(poemId, page = 1, page_size = 20, sort) {
    const comments = this._getFromStorage('comments');
    let filtered = comments.filter((c) => c.poem_id === poemId);

    const sortKey = sort || 'newest';
    filtered.sort((a, b) => {
      if (sortKey === 'oldest') {
        return a.created_at.localeCompare(b.created_at);
      }
      // newest default
      return b.created_at.localeCompare(a.created_at);
    });

    const total_count = filtered.length;
    const start = (page - 1) * page_size;
    const end = start + page_size;
    const slice = filtered.slice(start, end).map((c) => this._attachCommentRelations(c));

    return {
      total_count,
      page,
      page_size,
      comments: slice
    };
  }

  // addCommentToPoem(poemId, body)
  addCommentToPoem(poemId, body) {
    const poems = this._getFromStorage('poems');
    const comments = this._getFromStorage('comments');
    const now = this._nowISO();

    const poem = poems.find((p) => p.id === poemId) || null;
    if (!poem) {
      return { success: false, comment: null, new_comment_count: 0 };
    }

    const currentUser = this._getCurrentUserPoetRecord();

    const comment = {
      id: this._generateId('comment'),
      poem_id: poemId,
      author_display_name: currentUser.display_name,
      body,
      created_at: now,
      updated_at: now
    };

    comments.push(comment);
    poem.comment_count = (poem.comment_count || 0) + 1;

    const idx = poems.findIndex((p) => p.id === poemId);
    if (idx !== -1) poems[idx] = poem;

    this._saveToStorage('comments', comments);
    this._saveToStorage('poems', poems);

    return {
      success: true,
      comment: this._attachCommentRelations(comment),
      new_comment_count: poem.comment_count
    };
  }

  // toggleLikePoem(poemId)
  toggleLikePoem(poemId) {
    const poems = this._getFromStorage('poems');
    const poem = poems.find((p) => p.id === poemId) || null;
    if (!poem) {
      return { success: false, liked: false, new_like_count: 0 };
    }

    const currentlyLiked = !!poem.liked_by_current_user;
    const newLiked = !currentlyLiked;
    poem.liked_by_current_user = newLiked;
    let likeCount = poem.like_count || 0;
    const likeCountBefore = likeCount;

    // Instrumentation for task completion tracking
    try {
      if (newLiked === true && poem.is_prompt_response === true) {
        const currentWeeklyPrompt = this._getCurrentWeeklyPrompt();
        const currentUser = this._getCurrentUserPoetRecord();
        if (
          currentWeeklyPrompt &&
          poem.prompt_id === currentWeeklyPrompt.id &&
          poem.poet_id !== currentUser.id &&
          likeCountBefore < 10
        ) {
          const raw = localStorage.getItem('task4_lowEngagementLikeEvents');
          let events = [];
          if (raw) {
            try {
              const parsed = JSON.parse(raw);
              if (Array.isArray(parsed)) {
                events = parsed;
              }
            } catch (e2) {
              // Ignore parse errors and start fresh
            }
          }
          events.push({
            poem_id: poemId,
            prompt_id: poem.prompt_id,
            like_count_before: likeCountBefore,
            timestamp: this._nowISO()
          });
          localStorage.setItem('task4_lowEngagementLikeEvents', JSON.stringify(events));
        }
      }
    } catch (e) {
      try {
        console.error('Instrumentation error:', e);
      } catch (e2) {
        // Swallow logging errors
      }
    }

    if (newLiked) likeCount += 1;
    else likeCount = Math.max(0, likeCount - 1);
    poem.like_count = likeCount;

    const idx = poems.findIndex((p) => p.id === poemId);
    if (idx !== -1) poems[idx] = poem;

    this._saveToStorage('poems', poems);

    // Update trending scores for spoken word
    this._computeTrendingScores();

    return {
      success: true,
      liked: newLiked,
      new_like_count: likeCount
    };
  }

  // toggleBookmarkPoem(poemId)
  toggleBookmarkPoem(poemId) {
    const poems = this._getFromStorage('poems');
    const poem = poems.find((p) => p.id === poemId) || null;
    if (!poem) {
      return { success: false, bookmarked: false };
    }

    const newBookmarked = !poem.is_bookmarked;
    poem.is_bookmarked = newBookmarked;

    const idx = poems.findIndex((p) => p.id === poemId);
    if (idx !== -1) poems[idx] = poem;

    this._saveToStorage('poems', poems);

    return { success: true, bookmarked: newBookmarked };
  }

  // getUserReadingLists()
  getUserReadingLists() {
    const readingLists = this._getFromStorage('reading_lists');
    const items = this._getFromStorage('reading_list_items');

    return readingLists.map((rl) => {
      const count = items.filter((i) => i.reading_list_id === rl.id).length;
      return {
        reading_list: rl,
        poem_count: count
      };
    });
  }

  // getReadingListDetail(readingListId)
  getReadingListDetail(readingListId) {
    const readingLists = this._getFromStorage('reading_lists');
    const items = this._getFromStorage('reading_list_items');
    const poems = this._getFromStorage('poems');
    const poets = this._getFromStorage('poets');

    const reading_list = readingLists.find((rl) => rl.id === readingListId) || null;
    const relatedItems = items
      .filter((i) => i.reading_list_id === readingListId)
      .sort((a, b) => a.order_index - b.order_index);

    const detailItems = relatedItems.map((reading_list_item) => {
      const poem = poems.find((p) => p.id === reading_list_item.poem_id) || null;
      const poet = poem ? poets.find((pt) => pt.id === poem.poet_id) || null : null;
      return {
        reading_list_item,
        poem: this._attachPoemRelations(poem),
        poet_display_name: poet ? poet.display_name : null,
        theme_label: poem ? this._getThemeLabel(poem.theme) : null,
        form_label: poem ? this._getFormLabel(poem.form) : null
      };
    });

    return {
      reading_list,
      items: detailItems
    };
  }

  // createReadingList(name, description)
  createReadingList(name, description) {
    const readingLists = this._getFromStorage('reading_lists');
    const now = this._nowISO();

    const reading_list = {
      id: this._generateId('reading_list'),
      name,
      description: description || '',
      created_at: now,
      updated_at: now
    };

    readingLists.push(reading_list);
    this._saveToStorage('reading_lists', readingLists);

    return { success: true, reading_list };
  }

  // createReadingListAndAddPoem(poemId, name, description)
  createReadingListAndAddPoem(poemId, name, description) {
    const poems = this._getFromStorage('poems');
    const poem = poems.find((p) => p.id === poemId) || null;
    if (!poem) {
      return { success: false, reading_list: null, reading_list_item: null };
    }

    const readingLists = this._getFromStorage('reading_lists');
    const items = this._getFromStorage('reading_list_items');
    const now = this._nowISO();

    const reading_list = {
      id: this._generateId('reading_list'),
      name,
      description: description || '',
      created_at: now,
      updated_at: now
    };

    readingLists.push(reading_list);

    const order_index = items.filter((i) => i.reading_list_id === reading_list.id).length;
    const reading_list_item = {
      id: this._generateId('reading_list_item'),
      reading_list_id: reading_list.id,
      poem_id: poemId,
      order_index,
      added_at: now
    };

    items.push(reading_list_item);

    this._saveToStorage('reading_lists', readingLists);
    this._saveToStorage('reading_list_items', items);

    return { success: true, reading_list, reading_list_item };
  }

  // addPoemToReadingList(poemId, readingListId)
  addPoemToReadingList(poemId, readingListId) {
    const poems = this._getFromStorage('poems');
    const readingLists = this._getFromStorage('reading_lists');
    const items = this._getFromStorage('reading_list_items');

    const poem = poems.find((p) => p.id === poemId) || null;
    const rl = readingLists.find((r) => r.id === readingListId) || null;
    if (!poem || !rl) {
      return { success: false, reading_list_item: null };
    }

    // Avoid duplicates
    const existing = items.find(
      (i) => i.reading_list_id === readingListId && i.poem_id === poemId
    );
    if (existing) {
      return { success: true, reading_list_item: existing };
    }

    const now = this._nowISO();
    const order_index = items.filter((i) => i.reading_list_id === readingListId).length;
    const reading_list_item = {
      id: this._generateId('reading_list_item'),
      reading_list_id: readingListId,
      poem_id: poemId,
      order_index,
      added_at: now
    };

    items.push(reading_list_item);
    this._saveToStorage('reading_list_items', items);

    return { success: true, reading_list_item };
  }

  // removePoemFromReadingList(readingListId, poemId)
  removePoemFromReadingList(readingListId, poemId) {
    let items = this._getFromStorage('reading_list_items');
    const beforeLen = items.length;
    items = items.filter(
      (i) => !(i.reading_list_id === readingListId && i.poem_id === poemId)
    );
    const removed = beforeLen !== items.length;

    this._saveToStorage('reading_list_items', items);
    if (removed) {
      this._updateReadingListOrderIndexes(readingListId);
    }

    return { success: removed };
  }

  // renameReadingList(readingListId, newName)
  renameReadingList(readingListId, newName) {
    const readingLists = this._getFromStorage('reading_lists');
    const rl = readingLists.find((r) => r.id === readingListId) || null;
    if (!rl) {
      return { success: false, reading_list: null };
    }

    rl.name = newName;
    rl.updated_at = this._nowISO();
    this._saveToStorage('reading_lists', readingLists);

    return { success: true, reading_list: rl };
  }

  // deleteReadingList(readingListId)
  deleteReadingList(readingListId) {
    let readingLists = this._getFromStorage('reading_lists');
    let items = this._getFromStorage('reading_list_items');

    const beforeLen = readingLists.length;
    readingLists = readingLists.filter((r) => r.id !== readingListId);
    const removed = beforeLen !== readingLists.length;

    items = items.filter((i) => i.reading_list_id !== readingListId);

    this._saveToStorage('reading_lists', readingLists);
    this._saveToStorage('reading_list_items', items);

    return { success: removed };
  }

  // getPoemEditorState(poemId, promptId)
  getPoemEditorState(poemId, promptId) {
    const poems = this._getFromStorage('poems');
    const prompts = this._getFromStorage('prompts');

    let mode = 'new';
    let poem = null;
    let prompt = null;

    if (poemId) {
      const existing = poems.find((p) => p.id === poemId) || null;
      if (existing) {
        mode = 'edit';
        poem = this._attachPoemRelations(existing);
        if (existing.prompt_id) {
          prompt = prompts.find((pr) => pr.id === existing.prompt_id) || null;
        }
      }
    }

    if (!poem && promptId) {
      prompt = prompts.find((pr) => pr.id === promptId) || null;
    }

    let default_values;
    if (poem) {
      default_values = {
        title: poem.title || '',
        body: poem.body || '',
        tags: poem.tags || [],
        theme: poem.theme || 'other',
        form: poem.form || 'free_verse',
        language: poem.language || 'english',
        visibility: poem.visibility || 'public',
        comments_enabled: !!poem.comments_enabled,
        content_type: poem.content_type || 'text'
      };
    } else {
      default_values = {
        title: '',
        body: '',
        tags: prompt ? [prompt.title] : [],
        theme: 'other',
        form: 'free_verse',
        language: 'english',
        visibility: 'public',
        comments_enabled: true,
        content_type: 'text'
      };
    }

    return {
      mode,
      poem,
      prompt,
      default_values
    };
  }

  // savePoemFromEditor(poemId, mode, title, body, tags, theme, form, language, visibility, commentsEnabled, contentType, scheduleAt, promptId)
  savePoemFromEditor(
    poemId,
    mode,
    title,
    body,
    tags,
    theme,
    form,
    language,
    visibility,
    commentsEnabled,
    contentType,
    scheduleAt,
    promptId
  ) {
    const poem = this._upsertPoemFromEditorState({
      poemId,
      mode,
      title,
      body,
      tags,
      theme,
      form,
      language,
      visibility,
      commentsEnabled,
      contentType,
      scheduleAt,
      promptId
    });

    return {
      success: true,
      poem
    };
  }

  // listDraftPoems()
  listDraftPoems() {
    const poems = this._getFromStorage('poems');
    const currentUser = this._getCurrentUserPoetRecord();

    const drafts = poems.filter(
      (p) => p.status === 'draft' && p.poet_id === currentUser.id
    );

    return drafts.map((p) => this._attachPoemRelations(p));
  }

  // getPoetProfile(poetId)
  getPoetProfile(poetId) {
    const poets = this._getFromStorage('poets');
    const poems = this._getFromStorage('poems');

    const poet = poets.find((p) => p.id === poetId) || null;
    const currentUser = this._getCurrentUserPoetRecord();

    const is_current_user = !!poet && poet.id === currentUser.id;
    const can_follow = !!poet && !is_current_user;

    const poetPoems = poems.filter((p) => p.poet_id === poetId);

    return {
      poet,
      is_current_user,
      can_follow,
      poems: poetPoems.map((p) => this._attachPoemRelations(p))
    };
  }

  // followPoet(poetId)
  followPoet(poetId) {
    const poets = this._getFromStorage('poets');
    const poet = poets.find((p) => p.id === poetId) || null;
    const currentUser = this._getCurrentUserPoetRecord();

    if (!poet || poet.id === currentUser.id) {
      return {
        success: false,
        is_followed: poet ? poet.is_followed_by_current_user : false,
        new_follower_count: poet ? poet.follower_count : 0
      };
    }

    if (!poet.is_followed_by_current_user) {
      poet.is_followed_by_current_user = true;
      poet.follower_count = (poet.follower_count || 0) + 1;
      poet.updated_at = this._nowISO();
      const idx = poets.findIndex((p) => p.id === poetId);
      if (idx !== -1) poets[idx] = poet;
      this._saveToStorage('poets', poets);
    }

    return {
      success: true,
      is_followed: poet.is_followed_by_current_user,
      new_follower_count: poet.follower_count
    };
  }

  // unfollowPoet(poetId)
  unfollowPoet(poetId) {
    const poets = this._getFromStorage('poets');
    const poet = poets.find((p) => p.id === poetId) || null;
    const currentUser = this._getCurrentUserPoetRecord();

    if (!poet || poet.id === currentUser.id) {
      return {
        success: false,
        is_followed: poet ? poet.is_followed_by_current_user : false,
        new_follower_count: poet ? poet.follower_count : 0
      };
    }

    if (poet.is_followed_by_current_user) {
      poet.is_followed_by_current_user = false;
      poet.follower_count = Math.max(0, (poet.follower_count || 0) - 1);
      poet.updated_at = this._nowISO();
      const idx = poets.findIndex((p) => p.id === poetId);
      if (idx !== -1) poets[idx] = poet;
      this._saveToStorage('poets', poets);
    }

    return {
      success: true,
      is_followed: poet.is_followed_by_current_user,
      new_follower_count: poet.follower_count
    };
  }

  // getPromptsOverview()
  getPromptsOverview() {
    const prompts = this._getFromStorage('prompts');

    const current_weekly_prompt = prompts.find(
      (p) => p.prompt_type === 'weekly' && p.status === 'active'
    ) || null;

    const past_prompts = prompts.filter(
      (p) => !(p.prompt_type === 'weekly' && p.status === 'active')
    );

    return {
      current_weekly_prompt,
      past_prompts
    };
  }

  // getPromptDetail(promptId, responsesSort, page, page_size)
  getPromptDetail(promptId, responsesSort, page = 1, page_size = 20) {
    const prompts = this._getFromStorage('prompts');
    const poems = this._getFromStorage('poems');
    const poets = this._getFromStorage('poets');

    const prompt = prompts.find((p) => p.id === promptId) || null;

    const allResponses = poems.filter(
      (p) => p.is_prompt_response && p.prompt_id === promptId && p.status === 'published'
    );

    const sortKey = responsesSort || 'newest';
    allResponses.sort((a, b) => {
      if (sortKey === 'most_liked') {
        return (b.like_count || 0) - (a.like_count || 0);
      }
      const da = a.published_at || a.created_at;
      const db = b.published_at || b.created_at;
      return db.localeCompare(da);
    });

    const total_count = allResponses.length;
    const start = (page - 1) * page_size;
    const end = start + page_size;
    const slice = allResponses.slice(start, end);

    const items = slice.map((poem) => {
      const poet = poets.find((pt) => pt.id === poem.poet_id) || null;
      return {
        poem: this._attachPoemRelations(poem),
        poet
      };
    });

    return {
      prompt,
      responses: {
        total_count,
        page,
        page_size,
        items
      }
    };
  }

  // submitPoemReport(poemId, reason, description)
  submitPoemReport(poemId, reason, description) {
    const poems = this._getFromStorage('poems');
    const poem = poems.find((p) => p.id === poemId) || null;
    if (!poem) {
      return { success: false, report: null };
    }

    const reports = this._getFromStorage('poem_reports');
    const now = this._nowISO();

    const report = {
      id: this._generateId('poem_report'),
      poem_id: poemId,
      reason,
      description,
      status: 'open',
      created_at: now
    };

    reports.push(report);
    this._saveToStorage('poem_reports', reports);

    return { success: true, report };
  }

  // getNotificationSettings()
  getNotificationSettings() {
    return this._getNotificationSettingsRaw();
  }

  // updateNotificationSettings(settings)
  updateNotificationSettings(settings) {
    const updated = this._persistNotificationSettings(settings || {});
    return {
      success: true,
      settings: updated
    };
  }

  // getStaticPageContent(pageKey)
  getStaticPageContent(pageKey) {
    // Simple static content; not persisted as data entities
    const key = pageKey || 'about';
    if (key === 'about') {
      return {
        page_key: 'about',
        title: 'About This Poetry Platform',
        sections: [
          {
            heading: 'Our Mission',
            body_html:
              '<p>A place to write, share, and discover poetry across forms and styles.</p>'
          }
        ]
      };
    }
    if (key === 'help_faq') {
      return {
        page_key: 'help_faq',
        title: 'Help & FAQ',
        sections: [
          {
            heading: 'Using the site',
            body_html:
              '<p>Browse, search, and respond to prompts, or create your own reading lists.</p>'
          }
        ]
      };
    }
    if (key === 'privacy_policy') {
      return {
        page_key: 'privacy_policy',
        title: 'Privacy Policy',
        sections: [
          {
            heading: 'Overview',
            body_html:
              '<p>Your poems and preferences are stored locally for this demo implementation.</p>'
          }
        ]
      };
    }
    if (key === 'terms_guidelines') {
      return {
        page_key: 'terms_guidelines',
        title: 'Terms & Guidelines',
        sections: [
          {
            heading: 'Community Guidelines',
            body_html:
              '<p>Please be respectful and avoid posting harmful or infringing content.</p>'
          }
        ]
      };
    }

    return {
      page_key: key,
      title: 'Page',
      sections: [
        {
          heading: 'Content',
          body_html: '<p>No content defined for this page key.</p>'
        }
      ]
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