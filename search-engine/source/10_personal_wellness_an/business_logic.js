/* eslint-disable */
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
  // Initialization & Core Storage Helpers
  // ----------------------

  _initStorage() {
    const tableKeys = [
      // Core content entities
      'articles',
      'content_collections',
      'content_collection_items',
      'meditation_tracks',
      'playlists',
      'playlist_items',
      'quizzes',
      'quiz_questions',
      'quiz_answer_options',
      'quiz_results',
      'journal_entries',
      'events',
      'event_registrations',
      'affirmations',
      'affirmation_sets',
      'affirmation_set_items',
      'challenges',
      'challenge_enrollments',
      'practices',
      'todays_practice_plans',
      'todays_practice_items',
      // Static/meta content
      'contact_messages'
    ];

    for (const key of tableKeys) {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    }

    // About page content
    if (!localStorage.getItem('about_page_content')) {
      const about = {
        title: 'About This Space',
        body: 'This personal wellness and spirituality blog is a gentle space for mindfulness, embodiment, and inner exploration.',
        sections: [
          {
            heading: 'Our Mission',
            body: 'To offer simple, grounding practices that help you return to yourself—moment by moment.'
          },
          {
            heading: 'How to Use This Site',
            body: 'Browse articles, listen to meditations, join challenges, and track your reflections through quizzes and journaling.'
          }
        ]
      };
      localStorage.setItem('about_page_content', JSON.stringify(about));
    }

    // Contact page info
    if (!localStorage.getItem('contact_page_info')) {
      const contactInfo = {
        contact_email: 'hello@example.com',
        response_time_message: 'I usually respond to messages within 2–3 business days.'
      };
      localStorage.setItem('contact_page_info', JSON.stringify(contactInfo));
    }

    // Privacy & terms content
    if (!localStorage.getItem('privacy_terms_content')) {
      const privacy = {
        last_updated: new Date().toISOString().slice(0, 10),
        sections: [
          {
            heading: 'Privacy',
            body: 'Your data is stored locally in your browser whenever possible. Any information shared via contact forms is treated with care and never sold.'
          },
          {
            heading: 'Disclaimer',
            body: 'Content on this site is for educational and inspirational purposes only and is not a substitute for professional medical advice.'
          }
        ]
      };
      localStorage.setItem('privacy_terms_content', JSON.stringify(privacy));
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

  // ----------------------
  // Generic helpers
  // ----------------------

  _parseDate(value) {
    if (!value) return null;
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }

  _formatDateYMD(date) {
    // Returns 'YYYY-MM-DD'
    if (!date) return null;
    // If already in YYYY-MM-DD format, return as-is to avoid timezone shifts
    if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return date;
    }
    const d = date instanceof Date ? date : new Date(date);
    if (isNaN(d.getTime())) return null;
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  _normalizePlanDate(dateStr) {
    if (!dateStr) {
      return this._formatDateYMD(new Date());
    }
    return this._formatDateYMD(dateStr) || this._formatDateYMD(new Date());
  }

  _stringIncludesCI(haystack, needle) {
    if (!needle) return true;
    if (!haystack) return false;
    return String(haystack).toLowerCase().indexOf(String(needle).toLowerCase()) !== -1;
  }

  _normalizeTagOrTopic(value) {
    if (!value) return '';
    return String(value)
      .trim()
      .toLowerCase()
      .replace(/[-_\s]+/g, ' ');
  }

  _arrayIncludesNormalized(arr, needle) {
    if (!needle) return true;
    if (!Array.isArray(arr)) return false;
    const normNeedle = this._normalizeTagOrTopic(needle);
    return arr.some((v) => this._normalizeTagOrTopic(v) === normNeedle);
  }

  _applyListPaginationAndSorting(items, options) {
    const sort = options && options.sort ? options.sort : null;
    const page = options && options.page ? options.page : 1;
    const page_size = options && options.page_size ? options.page_size : 20;
    const sortFunctions = (options && options.sortFunctions) || {};
    const defaultSort = options && options.defaultSort ? options.defaultSort : null;

    let sorted = items.slice();
    const sortKeyToUse = sort || defaultSort;

    if (sortKeyToUse && sortFunctions[sortKeyToUse]) {
      sorted.sort(sortFunctions[sortKeyToUse]);
    }

    const total_items = sorted.length;
    const start = (page - 1) * page_size;
    const end = start + page_size;
    const paged = sorted.slice(start, end);

    return { items: paged, total_items };
  }

  // Helper: resolve foreign key fields ending with `_id`
  _resolveForeignKeysForItem(item) {
    if (!item || typeof item !== 'object') return item;
    const resolved = { ...item };
    for (const key of Object.keys(item)) {
      if (/_id$/.test(key) && item[key]) {
        const base = key.replace(/_id$/, '');
        // Determine which entity to look up based on key name
        let storageKey = null;
        switch (key) {
          case 'collection_id':
            storageKey = 'content_collections';
            break;
          case 'content_id':
            storageKey = 'articles';
            break;
          case 'playlist_id':
            storageKey = 'playlists';
            break;
          case 'track_id':
            storageKey = 'meditation_tracks';
            break;
          case 'quiz_id':
            storageKey = 'quizzes';
            break;
          case 'question_id':
            storageKey = 'quiz_questions';
            break;
          case 'event_id':
            storageKey = 'events';
            break;
          case 'set_id':
            storageKey = 'affirmation_sets';
            break;
          case 'affirmation_id':
            storageKey = 'affirmations';
            break;
          case 'challenge_id':
            storageKey = 'challenges';
            break;
          case 'plan_id':
            storageKey = 'todays_practice_plans';
            break;
          case 'practice_id':
            storageKey = 'practices';
            break;
          case 'source_reference_id':
            // special case handled elsewhere
            storageKey = null;
            break;
          default:
            storageKey = null;
        }
        if (storageKey) {
          const all = this._getFromStorage(storageKey);
          resolved[base] = all.find((x) => x.id === item[key]) || null;
        }
      }
    }
    return resolved;
  }

  // ----------------------
  // Internal helpers from spec
  // ----------------------

  // Fetch or create the TodaysPracticePlan for a given date (YYYY-MM-DD)
  _getOrCreateTodaysPracticePlan(dateStr) {
    const normalizedDate = this._normalizePlanDate(dateStr);
    let plans = this._getFromStorage('todays_practice_plans');
    let plan = plans.find((p) => p.date === normalizedDate);
    const nowIso = new Date().toISOString();
    if (!plan) {
      plan = {
        id: this._generateId('todayspracticeplan'),
        date: normalizedDate,
        created_at: nowIso,
        updated_at: nowIso
      };
      plans.push(plan);
      this._saveToStorage('todays_practice_plans', plans);
    }
    return plan;
  }

  // Fetch or create a playlist by name (used as optional helper)
  _getOrCreatePlaylist(name) {
    const trimmed = (name || '').trim();
    let playlists = this._getFromStorage('playlists');
    let playlist = playlists.find((p) => (p.name || '').toLowerCase() === trimmed.toLowerCase());
    const nowIso = new Date().toISOString();
    if (!playlist) {
      playlist = {
        id: this._generateId('playlist'),
        name: trimmed || 'My Playlist',
        description: '',
        created_at: nowIso,
        updated_at: nowIso,
        total_duration_minutes: 0,
        track_count: 0,
        is_favorite: false
      };
      playlists.push(playlist);
      this._saveToStorage('playlists', playlists);
    }
    return playlist;
  }

  // Fetch or create a ContentCollection by name/kind
  _getOrCreateContentCollection(name, kind) {
    const trimmed = (name || '').trim();
    let collections = this._getFromStorage('content_collections');
    let collection = collections.find(
      (c) => c.kind === kind && (c.name || '').toLowerCase() === trimmed.toLowerCase()
    );
    const nowIso = new Date().toISOString();
    if (!collection) {
      collection = {
        id: this._generateId('contentcollection'),
        kind: kind,
        name: trimmed,
        description: '',
        created_at: nowIso,
        updated_at: nowIso,
        notes: ''
      };
      collections.push(collection);
      this._saveToStorage('content_collections', collections);
    }
    return collection;
  }

  // Compute quiz result from answers
  _calculateQuizResultFromAnswers(quiz, answers) {
    const quizId = quiz ? quiz.id : null;
    const questions = this._getFromStorage('quiz_questions').filter((q) => q.quiz_id === quizId);
    const options = this._getFromStorage('quiz_answer_options');

    let totalScore = 0;
    let maxPossiblePerQuestion = 0;

    for (const q of questions) {
      const qOptions = options.filter((o) => o.question_id === q.id);
      const qMax = qOptions.reduce((m, o) => (typeof o.value === 'number' && o.value > m ? o.value : m), 0);
      maxPossiblePerQuestion += qMax;
    }

    for (const ans of answers || []) {
      const selectedIds = Array.isArray(ans.selected_option_ids) ? ans.selected_option_ids : [];
      if (selectedIds.length > 0) {
        for (const optId of selectedIds) {
          const opt = options.find((o) => o.id === optId);
          if (opt && typeof opt.value === 'number') {
            totalScore += opt.value;
          }
        }
      } else if (typeof ans.numeric_value === 'number') {
        totalScore += ans.numeric_value;
      }
    }

    let overall_label = 'Moderate';
    if (maxPossiblePerQuestion > 0) {
      const ratio = totalScore / maxPossiblePerQuestion;
      if (ratio <= 0.33) overall_label = 'Low';
      else if (ratio >= 0.66) overall_label = 'High';
    }

    const summary = `Overall score ${totalScore}${
      maxPossiblePerQuestion > 0 ? ' out of ' + maxPossiblePerQuestion : ''
    } with label ${overall_label}.`;

    return {
      overall_score: totalScore,
      overall_label,
      summary
    };
  }

  // ----------------------
  // Interface Implementations
  // ----------------------

  // getHomepageOverview()
  getHomepageOverview() {
    const articles = this._getFromStorage('articles');
    const meditationTracks = this._getFromStorage('meditation_tracks');
    const events = this._getFromStorage('events');
    const quizzes = this._getFromStorage('quizzes');

    // Featured articles: featured first, then newest
    const featuredArticlesSorted = articles
      .slice()
      .sort((a, b) => {
        const af = a.is_featured ? 1 : 0;
        const bf = b.is_featured ? 1 : 0;
        if (af !== bf) return bf - af;
        const ad = this._parseDate(a.published_at) || new Date(0);
        const bd = this._parseDate(b.published_at) || new Date(0);
        return bd - ad;
      })
      .slice(0, 5);

    // Featured meditations: highest rating, then shortest duration
    const featuredMeditations = meditationTracks
      .slice()
      .sort((a, b) => {
        const ar = typeof a.rating_average === 'number' ? a.rating_average : 0;
        const br = typeof b.rating_average === 'number' ? b.rating_average : 0;
        if (ar !== br) return br - ar;
        const ad = typeof a.duration_minutes === 'number' ? a.duration_minutes : Infinity;
        const bd = typeof b.duration_minutes === 'number' ? b.duration_minutes : Infinity;
        return ad - bd;
      })
      .slice(0, 5);

    // Upcoming events: start_datetime >= now
    const now = new Date();
    const upcomingEvents = events
      .filter((e) => {
        const d = this._parseDate(e.start_datetime);
        return d && d >= now;
      })
      .sort((a, b) => {
        const ad = this._parseDate(a.start_datetime) || new Date(8640000000000000);
        const bd = this._parseDate(b.start_datetime) || new Date(8640000000000000);
        return ad - bd;
      })
      .slice(0, 5);

    // Highlighted quizzes: active, newest first
    const highlightedQuizzes = quizzes
      .filter((q) => q.is_active)
      .sort((a, b) => {
        const ad = this._parseDate(a.created_at) || new Date(0);
        const bd = this._parseDate(b.created_at) || new Date(0);
        return bd - ad;
      })
      .slice(0, 5);

    const todaysSummary = this.getTodaysPracticeSummary();

    return {
      welcome_message: 'Welcome back to your space for mindfulness and self-care.',
      featured_articles: featuredArticlesSorted,
      featured_meditations: featuredMeditations,
      upcoming_events: upcomingEvents,
      highlighted_quizzes: highlightedQuizzes,
      todays_practice_summary: {
        has_plan_for_today: !!todaysSummary.plan,
        total_practices: todaysSummary.items ? todaysSummary.items.length : 0,
        total_duration_minutes: todaysSummary.total_duration_minutes || 0,
        practices: (todaysSummary.items || []).map((x) => x.practice)
      }
    };
  }

  // searchSiteContent(query, content_types, sort, page, page_size)
  searchSiteContent(query, content_types, sort, page, page_size) {
    const q = (query || '').trim().toLowerCase();
    const typesFilter = Array.isArray(content_types) && content_types.length > 0 ? content_types : null;

    const results = [];

    const addResult = (result_type, obj, extra) => {
      // Basic relevance: title match weight
      const title = obj.title || '';
      const snippetSource = obj.summary || obj.description || obj.body || '';
      const idx = snippetSource.toLowerCase().indexOf(q);
      let snippet = snippetSource.slice(0, 160);
      if (idx >= 0) {
        snippet = snippetSource.slice(Math.max(0, idx - 40), idx + 120);
      }
      results.push({
        result_type,
        id: obj.id,
        title: obj.title,
        snippet,
        content_type_label: extra && extra.label ? extra.label : '',
        published_at: extra && extra.published_at ? extra.published_at : '',
        rating_average: extra && typeof extra.rating_average === 'number' ? extra.rating_average : undefined,
        duration_minutes: extra && typeof extra.duration_minutes === 'number' ? extra.duration_minutes : undefined,
        event_start_datetime: extra && extra.event_start_datetime ? extra.event_start_datetime : ''
      });
    };

    const matchesQuery = (text, tags) => {
      if (!q) return true;
      if (this._stringIncludesCI(text, q)) return true;
      if (Array.isArray(tags)) {
        for (const t of tags) {
          if (this._stringIncludesCI(t, q)) return true;
        }
      }
      return false;
    };

    // Articles & guides
    if (!typesFilter || typesFilter.some((t) => t === 'article' || t === 'guide')) {
      const articles = this._getFromStorage('articles');
      for (const a of articles) {
        const type = a.content_type === 'guide' ? 'guide' : 'article';
        if (typesFilter && !typesFilter.includes(type)) continue;
        const text = `${a.title || ''} ${a.summary || ''} ${a.body || ''}`;
        const tags = (a.topics || []).concat(a.tags || []);
        if (!matchesQuery(text, tags)) continue;
        addResult(type, a, {
          label: a.content_type === 'guide' ? 'Guide' : 'Article',
          published_at: a.published_at
        });
      }
    }

    // Meditation tracks
    if (!typesFilter || typesFilter.includes('meditation_track')) {
      const tracks = this._getFromStorage('meditation_tracks');
      for (const t of tracks) {
        const text = `${t.title || ''} ${t.description || ''}`;
        if (!matchesQuery(text)) continue;
        addResult('meditation_track', t, {
          label: 'Meditation',
          published_at: t.published_at,
          rating_average: t.rating_average,
          duration_minutes: t.duration_minutes
        });
      }
    }

    // Events
    if (!typesFilter || typesFilter.includes('event')) {
      const events = this._getFromStorage('events');
      for (const e of events) {
        const text = `${e.title || ''} ${e.description || ''}`;
        const tags = e.tags || [];
        if (!matchesQuery(text, tags)) continue;
        addResult('event', e, {
          label: 'Event',
          event_start_datetime: e.start_datetime
        });
      }
    }

    // Quizzes
    if (!typesFilter || typesFilter.includes('quiz')) {
      const quizzes = this._getFromStorage('quizzes');
      for (const quiz of quizzes) {
        const text = `${quiz.title || ''} ${quiz.description || ''}`;
        if (!matchesQuery(text)) continue;
        addResult('quiz', quiz, {
          label: 'Quiz',
          published_at: quiz.created_at
        });
      }
    }

    // Practices
    if (!typesFilter || typesFilter.includes('practice')) {
      const practices = this._getFromStorage('practices');
      for (const p of practices) {
        const text = `${p.title || ''} ${p.description || ''}`;
        if (!matchesQuery(text)) continue;
        addResult('practice', p, {
          label: 'Practice',
          published_at: p.created_at,
          rating_average: p.rating_average,
          duration_minutes: p.duration_minutes
        });
      }
    }

    // Sorting
    const sortKey = sort || 'relevance';
    const sortFunctions = {
      relevance: (a, b) => {
        // Approximate relevance: shorter snippet index (if query appears near start) and newer published_at
        const ap = this._parseDate(a.published_at || a.event_start_datetime) || new Date(0);
        const bp = this._parseDate(b.published_at || b.event_start_datetime) || new Date(0);
        return bp - ap;
      },
      newest_first: (a, b) => {
        const ad = this._parseDate(a.published_at || a.event_start_datetime) || new Date(0);
        const bd = this._parseDate(b.published_at || b.event_start_datetime) || new Date(0);
        return bd - ad;
      },
      popularity: (a, b) => {
        const ar = typeof a.rating_average === 'number' ? a.rating_average : 0;
        const br = typeof b.rating_average === 'number' ? b.rating_average : 0;
        if (ar !== br) return br - ar;
        const ad = this._parseDate(a.published_at || a.event_start_datetime) || new Date(0);
        const bd = this._parseDate(b.published_at || b.event_start_datetime) || new Date(0);
        return bd - ad;
      }
    };

    const { items: paged, total_items } = this._applyListPaginationAndSorting(results, {
      sort: sortKey,
      page: page || 1,
      page_size: page_size || 20,
      sortFunctions,
      defaultSort: 'relevance'
    });

    // Instrumentation for task completion tracking (task_3)
    try {
      localStorage.setItem(
        'task3_searchParams',
        JSON.stringify({
          query,
          content_types,
          sort,
          page,
          page_size,
          timestamp: new Date().toISOString()
        })
      );

      const normalizedQuery = (query || '').trim().toLowerCase();
      const hasGuide =
        Array.isArray(content_types) && content_types.some((t) => String(t).toLowerCase() === 'guide');
      if (
        normalizedQuery === 'full moon ritual' &&
        hasGuide &&
        sort === 'newest_first'
      ) {
        const existing = localStorage.getItem('task3_correctSearchUsed');
        if (existing !== 'true') {
          localStorage.setItem('task3_correctSearchUsed', 'true');
        }
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      query: query || '',
      total_results: total_items,
      page: page || 1,
      page_size: page_size || 20,
      results: paged
    };
  }

  // getArticleFilterOptions()
  getArticleFilterOptions() {
    const articles = this._getFromStorage('articles');
    const topicsSet = new Set();
    let minRT = Infinity;
    let maxRT = 0;

    for (const a of articles) {
      if (Array.isArray(a.topics)) {
        for (const t of a.topics) {
          if (t) topicsSet.add(String(t));
        }
      }
      if (typeof a.reading_time_minutes === 'number') {
        if (a.reading_time_minutes < minRT) minRT = a.reading_time_minutes;
        if (a.reading_time_minutes > maxRT) maxRT = a.reading_time_minutes;
      }
    }

    if (minRT === Infinity) minRT = 0;

    const topics = Array.from(topicsSet).map((t) => ({ value: t, label: t }));

    const content_types = [
      { value: 'article', label: 'Articles' },
      { value: 'guide', label: 'Guides' }
    ];

    return {
      topics,
      content_types,
      reading_time_min: minRT,
      reading_time_max: maxRT
    };
  }

  // getArticlesList(topic, content_type, tag, min_reading_time, max_reading_time, sort, page, page_size)
  getArticlesList(topic, content_type, tag, min_reading_time, max_reading_time, sort, page, page_size) {
    const articles = this._getFromStorage('articles');
    const topicFilter = topic || null;
    const tagFilter = tag || null;

    let filtered = articles.filter((a) => {
      if (content_type && a.content_type !== content_type) return false;
      if (topicFilter && !this._arrayIncludesNormalized(a.topics || [], topicFilter)) return false;
      if (tagFilter && !this._arrayIncludesNormalized(a.tags || [], tagFilter)) return false;

      const rt = typeof a.reading_time_minutes === 'number' ? a.reading_time_minutes : null;
      if (typeof min_reading_time === 'number' && rt !== null && rt < min_reading_time) return false;
      if (typeof max_reading_time === 'number' && rt !== null && rt > max_reading_time) return false;
      return true;
    });

    const sortFunctions = {
      newest_first: (a, b) => {
        const ad = this._parseDate(a.published_at) || new Date(0);
        const bd = this._parseDate(b.published_at) || new Date(0);
        return bd - ad;
      },
      oldest_first: (a, b) => {
        const ad = this._parseDate(a.published_at) || new Date(0);
        const bd = this._parseDate(b.published_at) || new Date(0);
        return ad - bd;
      },
      popularity: (a, b) => {
        // No explicit popularity field; fallback to newest_first
        const ad = this._parseDate(a.published_at) || new Date(0);
        const bd = this._parseDate(b.published_at) || new Date(0);
        return bd - ad;
      },
      reading_time: (a, b) => {
        const ar = typeof a.reading_time_minutes === 'number' ? a.reading_time_minutes : Infinity;
        const br = typeof b.reading_time_minutes === 'number' ? b.reading_time_minutes : Infinity;
        return ar - br;
      }
    };

    const { items: paged, total_items } = this._applyListPaginationAndSorting(filtered, {
      sort: sort || 'newest_first',
      page: page || 1,
      page_size: page_size || 20,
      sortFunctions,
      defaultSort: 'newest_first'
    });

    // Instrumentation for task completion tracking (task_1)
    try {
      localStorage.setItem(
        'task1_articleFilterParams',
        JSON.stringify({
          topic,
          content_type,
          tag,
          min_reading_time,
          max_reading_time,
          sort,
          page,
          page_size,
          timestamp: new Date().toISOString()
        })
      );

      const normalizedTopic = this._normalizeTagOrTopic(topic);
      if (
        normalizedTopic === 'mindfulness basics' &&
        min_reading_time === 5 &&
        max_reading_time === 10 &&
        sort === 'newest_first'
      ) {
        const existing = localStorage.getItem('task1_correctArticleFilterUsed');
        if (existing !== 'true') {
          localStorage.setItem('task1_correctArticleFilterUsed', 'true');
        }
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      page: page || 1,
      page_size: page_size || 20,
      total_items,
      items: paged
    };
  }

  // getArticleDetail(articleId)
  getArticleDetail(articleId) {
    const articles = this._getFromStorage('articles');
    const collectionItems = this._getFromStorage('content_collection_items');
    const collections = this._getFromStorage('content_collections');

    const article = articles.find((a) => a.id === articleId) || null;
    if (!article) {
      return {
        article: null,
        is_saved: false,
        saved_in_collections: []
      };
    }

    const itemsForArticle = collectionItems.filter((i) => i.content_id === articleId);
    const savedCollections = [];
    const seenIds = new Set();
    for (const item of itemsForArticle) {
      const col = collections.find((c) => c.id === item.collection_id);
      if (col && !seenIds.has(col.id)) {
        seenIds.add(col.id);
        savedCollections.push(col);
      }
    }

    return {
      article,
      is_saved: savedCollections.length > 0,
      saved_in_collections: savedCollections
    };
  }

  // getRelatedArticles(article_id, limit)
  getRelatedArticles(article_id, limit) {
    const articles = this._getFromStorage('articles');
    const limitNum = typeof limit === 'number' ? limit : 3;

    const main = articles.find((a) => a.id === article_id) || null;
    if (!main) {
      // Fallback: newest
      return articles
        .slice()
        .sort((a, b) => {
          const ad = this._parseDate(a.published_at) || new Date(0);
          const bd = this._parseDate(b.published_at) || new Date(0);
          return bd - ad;
        })
        .slice(0, limitNum);
    }

    const mainTopics = new Set(main.topics || []);
    const mainTags = new Set(main.tags || []);

    const scored = [];
    for (const a of articles) {
      if (a.id === main.id) continue;
      let score = 0;
      for (const t of a.topics || []) {
        if (mainTopics.has(t)) score += 2;
      }
      for (const tg of a.tags || []) {
        if (mainTags.has(tg)) score += 1;
      }
      const d = this._parseDate(a.published_at) || new Date(0);
      scored.push({ article: a, score, date: d });
    }

    scored.sort((x, y) => {
      if (x.score !== y.score) return y.score - x.score;
      return y.date - x.date;
    });

    return scored.slice(0, limitNum).map((x) => x.article);
  }

  // getContentCollectionsOverview(kind)
  getContentCollectionsOverview(kind) {
    const collections = this._getFromStorage('content_collections');
    if (kind) {
      return collections.filter((c) => c.kind === kind);
    }
    return collections;
  }

  // createContentCollectionAndAddItem(name, kind, content_entity_type, content_id)
  createContentCollectionAndAddItem(name, kind, content_entity_type, content_id) {
    const allowedKinds = ['reading_list', 'collection'];
    if (!allowedKinds.includes(kind)) {
      return { success: false, collection: null, item: null, message: 'Invalid collection kind.' };
    }

    if (content_entity_type !== 'article' && content_entity_type !== 'guide') {
      return { success: false, collection: null, item: null, message: 'Invalid content entity type.' };
    }

    const articles = this._getFromStorage('articles');
    const target = articles.find((a) => a.id === content_id);
    if (!target) {
      return { success: false, collection: null, item: null, message: 'Content not found.' };
    }

    const collections = this._getFromStorage('content_collections');
    const collectionItems = this._getFromStorage('content_collection_items');
    const nowIso = new Date().toISOString();

    const collection = {
      id: this._generateId('contentcollection'),
      kind,
      name: (name || '').trim() || 'Untitled List',
      description: '',
      created_at: nowIso,
      updated_at: nowIso,
      notes: ''
    };
    collections.push(collection);

    const order_index = collectionItems.filter((i) => i.collection_id === collection.id).length;
    const item = {
      id: this._generateId('contentcollectionitem'),
      collection_id: collection.id,
      content_entity_type,
      content_id,
      added_at: nowIso,
      order_index
    };
    collectionItems.push(item);

    this._saveToStorage('content_collections', collections);
    this._saveToStorage('content_collection_items', collectionItems);

    return {
      success: true,
      collection,
      item,
      message: 'Collection created and content added.'
    };
  }

  // addContentToExistingCollection(collection_id, content_entity_type, content_id)
  addContentToExistingCollection(collection_id, content_entity_type, content_id) {
    if (content_entity_type !== 'article' && content_entity_type !== 'guide') {
      return { success: false, collection_item: null, message: 'Invalid content entity type.' };
    }

    const collections = this._getFromStorage('content_collections');
    const collection = collections.find((c) => c.id === collection_id);
    if (!collection) {
      return { success: false, collection_item: null, message: 'Collection not found.' };
    }

    const articles = this._getFromStorage('articles');
    const target = articles.find((a) => a.id === content_id);
    if (!target) {
      return { success: false, collection_item: null, message: 'Content not found.' };
    }

    const collectionItems = this._getFromStorage('content_collection_items');
    const nowIso = new Date().toISOString();
    const order_index = collectionItems.filter((i) => i.collection_id === collection_id).length;

    const collection_item = {
      id: this._generateId('contentcollectionitem'),
      collection_id,
      content_entity_type,
      content_id,
      added_at: nowIso,
      order_index
    };

    collectionItems.push(collection_item);
    this._saveToStorage('content_collection_items', collectionItems);

    return { success: true, collection_item, message: 'Content added to collection.' };
  }

  // getMeditationFilterOptions()
  getMeditationFilterOptions() {
    const tracks = this._getFromStorage('meditation_tracks');

    const categoriesSet = new Set();
    let minDur = Infinity;
    let maxDur = 0;
    const ratingSet = new Set();

    for (const t of tracks) {
      if (t.category) categoriesSet.add(t.category);
      if (typeof t.duration_minutes === 'number') {
        if (t.duration_minutes < minDur) minDur = t.duration_minutes;
        if (t.duration_minutes > maxDur) maxDur = t.duration_minutes;
      }
      if (typeof t.rating_average === 'number') ratingSet.add(t.rating_average);
    }

    if (minDur === Infinity) minDur = 0;

    const categories = Array.from(categoriesSet).map((c) => ({ value: c, label: c.charAt(0).toUpperCase() + c.slice(1) }));

    // Provide some common rating thresholds plus any discovered
    const thresholds = new Set([3, 3.5, 4, 4.5, 5]);
    for (const r of ratingSet) {
      thresholds.add(Math.round(r * 10) / 10);
    }

    return {
      categories,
      duration_min: minDur,
      duration_max: maxDur,
      rating_thresholds: Array.from(thresholds).sort((a, b) => a - b)
    };
  }

  // getMeditationTracksList(category, min_duration, max_duration, min_rating, sort, page, page_size)
  getMeditationTracksList(category, min_duration, max_duration, min_rating, sort, page, page_size) {
    const tracks = this._getFromStorage('meditation_tracks');

    const filtered = tracks.filter((t) => {
      if (category && t.category !== category) return false;
      const dur = typeof t.duration_minutes === 'number' ? t.duration_minutes : null;
      if (typeof min_duration === 'number' && dur !== null && dur < min_duration) return false;
      if (typeof max_duration === 'number' && dur !== null && dur > max_duration) return false;
      const rating = typeof t.rating_average === 'number' ? t.rating_average : null;
      if (typeof min_rating === 'number' && rating !== null && rating < min_rating) return false;
      return true;
    });

    const sortFunctions = {
      duration_shortest_first: (a, b) => {
        const ad = typeof a.duration_minutes === 'number' ? a.duration_minutes : Infinity;
        const bd = typeof b.duration_minutes === 'number' ? b.duration_minutes : Infinity;
        return ad - bd;
      },
      duration_longest_first: (a, b) => {
        const ad = typeof a.duration_minutes === 'number' ? a.duration_minutes : 0;
        const bd = typeof b.duration_minutes === 'number' ? b.duration_minutes : 0;
        return bd - ad;
      },
      newest_first: (a, b) => {
        const ad = this._parseDate(a.published_at) || new Date(0);
        const bd = this._parseDate(b.published_at) || new Date(0);
        return bd - ad;
      },
      rating: (a, b) => {
        const ar = typeof a.rating_average === 'number' ? a.rating_average : 0;
        const br = typeof b.rating_average === 'number' ? b.rating_average : 0;
        return br - ar;
      }
    };

    const { items: paged, total_items } = this._applyListPaginationAndSorting(filtered, {
      sort: sort || 'newest_first',
      page: page || 1,
      page_size: page_size || 20,
      sortFunctions,
      defaultSort: 'newest_first'
    });

    // Instrumentation for task completion tracking (task_2)
    try {
      localStorage.setItem(
        'task2_meditationFilterParams',
        JSON.stringify({
          category,
          min_duration,
          max_duration,
          min_rating,
          sort,
          page,
          page_size,
          timestamp: new Date().toISOString()
        })
      );

      const normalizedCategory = this._normalizeTagOrTopic(category);
      if (
        normalizedCategory === 'sleep' &&
        min_duration === 12 &&
        max_duration === 18 &&
        typeof min_rating === 'number' &&
        min_rating >= 4.5 &&
        sort === 'duration_shortest_first'
      ) {
        const existing = localStorage.getItem('task2_correctMeditationFilterUsed');
        if (existing !== 'true') {
          localStorage.setItem('task2_correctMeditationFilterUsed', 'true');
        }
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      page: page || 1,
      page_size: page_size || 20,
      total_items,
      items: paged
    };
  }

  // addTrackToPlaylist(track_id, playlist_id)
  addTrackToPlaylist(track_id, playlist_id) {
    const playlists = this._getFromStorage('playlists');
    const playlistItems = this._getFromStorage('playlist_items');
    const tracks = this._getFromStorage('meditation_tracks');

    const playlist = playlists.find((p) => p.id === playlist_id);
    if (!playlist) {
      return { success: false, playlist: null, playlist_item: null, message: 'Playlist not found.' };
    }

    const track = tracks.find((t) => t.id === track_id);
    if (!track) {
      return { success: false, playlist: playlist, playlist_item: null, message: 'Track not found.' };
    }

    const nowIso = new Date().toISOString();
    const order_index = playlistItems.filter((i) => i.playlist_id === playlist_id).length;

    const playlist_item = {
      id: this._generateId('playlistitem'),
      playlist_id,
      track_id,
      added_at: nowIso,
      order_index
    };

    playlistItems.push(playlist_item);

    // Recalculate playlist aggregates
    const itemsForPlaylist = playlistItems.filter((i) => i.playlist_id === playlist_id);
    let totalDuration = 0;
    for (const item of itemsForPlaylist) {
      const tr = tracks.find((t) => t.id === item.track_id);
      if (tr && typeof tr.duration_minutes === 'number') totalDuration += tr.duration_minutes;
    }
    playlist.track_count = itemsForPlaylist.length;
    playlist.total_duration_minutes = totalDuration;
    playlist.updated_at = nowIso;

    this._saveToStorage('playlist_items', playlistItems);
    this._saveToStorage('playlists', playlists);

    return { success: true, playlist, playlist_item, message: 'Track added to playlist.' };
  }

  // createPlaylistAndAddTrack(name, description, track_id)
  createPlaylistAndAddTrack(name, description, track_id) {
    const playlists = this._getFromStorage('playlists');
    const tracks = this._getFromStorage('meditation_tracks');
    const playlistItems = this._getFromStorage('playlist_items');

    const track = tracks.find((t) => t.id === track_id);
    if (!track) {
      return { success: false, playlist: null, playlist_item: null, message: 'Track not found.' };
    }

    const nowIso = new Date().toISOString();
    const playlist = {
      id: this._generateId('playlist'),
      name: (name || '').trim() || 'New Playlist',
      description: description || '',
      created_at: nowIso,
      updated_at: nowIso,
      total_duration_minutes: 0,
      track_count: 0,
      is_favorite: false
    };
    playlists.push(playlist);

    const playlist_item = {
      id: this._generateId('playlistitem'),
      playlist_id: playlist.id,
      track_id,
      added_at: nowIso,
      order_index: 0
    };
    playlistItems.push(playlist_item);

    playlist.track_count = 1;
    playlist.total_duration_minutes = typeof track.duration_minutes === 'number' ? track.duration_minutes : 0;

    this._saveToStorage('playlists', playlists);
    this._saveToStorage('playlist_items', playlistItems);

    return { success: true, playlist, playlist_item, message: 'Playlist created and track added.' };
  }

  // getPlaylistsOverview()
  getPlaylistsOverview() {
    const playlists = this._getFromStorage('playlists');
    const playlistItems = this._getFromStorage('playlist_items');
    const tracks = this._getFromStorage('meditation_tracks');

    // Ensure aggregates are up-to-date
    for (const p of playlists) {
      const itemsForPlaylist = playlistItems.filter((i) => i.playlist_id === p.id);
      let totalDuration = 0;
      for (const item of itemsForPlaylist) {
        const tr = tracks.find((t) => t.id === item.track_id);
        if (tr && typeof tr.duration_minutes === 'number') totalDuration += tr.duration_minutes;
      }
      p.track_count = itemsForPlaylist.length;
      p.total_duration_minutes = totalDuration;
    }

    this._saveToStorage('playlists', playlists);

    return { items: playlists };
  }

  // getPlaylistDetail(playlistId)
  getPlaylistDetail(playlistId) {
    const playlists = this._getFromStorage('playlists');
    const playlistItems = this._getFromStorage('playlist_items');
    const tracks = this._getFromStorage('meditation_tracks');

    const playlist = playlists.find((p) => p.id === playlistId) || null;
    if (!playlist) {
      return { playlist: null, tracks: [] };
    }

    const itemsForPlaylist = playlistItems
      .filter((i) => i.playlist_id === playlistId)
      .sort((a, b) => {
        const ai = typeof a.order_index === 'number' ? a.order_index : 0;
        const bi = typeof b.order_index === 'number' ? b.order_index : 0;
        return ai - bi;
      });

    const resultTracks = itemsForPlaylist.map((pi) => {
      const track = tracks.find((t) => t.id === pi.track_id) || null;
      const resolvedItem = this._resolveForeignKeysForItem(pi);
      return { playlist_item: { ...resolvedItem, playlist }, track };
    });

    return { playlist, tracks: resultTracks };
  }

  // updatePlaylistTrackOrder(playlist_id, ordered_playlist_item_ids)
  updatePlaylistTrackOrder(playlist_id, ordered_playlist_item_ids) {
    const playlistItems = this._getFromStorage('playlist_items');
    const playlists = this._getFromStorage('playlists');
    const playlist = playlists.find((p) => p.id === playlist_id);
    if (!playlist) {
      return { success: false, playlist_id };
    }

    const idToIndex = new Map();
    (ordered_playlist_item_ids || []).forEach((id, idx) => {
      idToIndex.set(id, idx);
    });

    for (const item of playlistItems) {
      if (item.playlist_id === playlist_id && idToIndex.has(item.id)) {
        item.order_index = idToIndex.get(item.id);
      }
    }

    this._saveToStorage('playlist_items', playlistItems);
    playlist.updated_at = new Date().toISOString();
    this._saveToStorage('playlists', playlists);

    return { success: true, playlist_id };
  }

  // removeTrackFromPlaylist(playlist_item_id)
  removeTrackFromPlaylist(playlist_item_id) {
    const playlistItems = this._getFromStorage('playlist_items');
    const playlists = this._getFromStorage('playlists');
    const tracks = this._getFromStorage('meditation_tracks');

    const idx = playlistItems.findIndex((i) => i.id === playlist_item_id);
    if (idx === -1) {
      return { success: false };
    }

    const [removed] = playlistItems.splice(idx, 1);
    this._saveToStorage('playlist_items', playlistItems);

    const playlist = playlists.find((p) => p.id === removed.playlist_id);
    if (playlist) {
      const itemsForPlaylist = playlistItems.filter((i) => i.playlist_id === playlist.id);
      let totalDuration = 0;
      for (const item of itemsForPlaylist) {
        const tr = tracks.find((t) => t.id === item.track_id);
        if (tr && typeof tr.duration_minutes === 'number') totalDuration += tr.duration_minutes;
      }
      playlist.track_count = itemsForPlaylist.length;
      playlist.total_duration_minutes = totalDuration;
      playlist.updated_at = new Date().toISOString();
      this._saveToStorage('playlists', playlists);
    }

    return { success: true };
  }

  // renamePlaylist(playlist_id, new_name)
  renamePlaylist(playlist_id, new_name) {
    const playlists = this._getFromStorage('playlists');
    const playlist = playlists.find((p) => p.id === playlist_id);
    if (!playlist) {
      return { success: false, playlist: null };
    }
    playlist.name = (new_name || '').trim() || playlist.name;
    playlist.updated_at = new Date().toISOString();
    this._saveToStorage('playlists', playlists);
    return { success: true, playlist };
  }

  // deletePlaylist(playlist_id)
  deletePlaylist(playlist_id) {
    const playlists = this._getFromStorage('playlists');
    const playlistItems = this._getFromStorage('playlist_items');

    const idx = playlists.findIndex((p) => p.id === playlist_id);
    if (idx === -1) {
      return { success: false };
    }

    playlists.splice(idx, 1);
    const remainingItems = playlistItems.filter((i) => i.playlist_id !== playlist_id);

    this._saveToStorage('playlists', playlists);
    this._saveToStorage('playlist_items', remainingItems);

    return { success: true };
  }

  // getQuizzesList(topic)
  getQuizzesList(topic) {
    const quizzes = this._getFromStorage('quizzes');
    const results = this._getFromStorage('quiz_results');

    const items = quizzes
      .filter((q) => {
        if (topic && q.topic && q.topic !== topic) return false;
        if (topic && !q.topic) return false;
        return true;
      })
      .map((quiz) => {
        const quizResults = results.filter((r) => r.quiz_id === quiz.id);
        let last_completed_at = null;
        let last_overall_label = null;
        if (quizResults.length > 0) {
          quizResults.sort((a, b) => {
            const ad = this._parseDate(a.completed_at) || new Date(0);
            const bd = this._parseDate(b.completed_at) || new Date(0);
            return bd - ad;
          });
          last_completed_at = quizResults[0].completed_at;
          last_overall_label = quizResults[0].overall_label;
        }
        return {
          quiz,
          last_completed_at,
          last_overall_label,
          completion_count: quizResults.length
        };
      });

    return { items };
  }

  // getQuizDetail(quizId)
  getQuizDetail(quizId) {
    const quizzes = this._getFromStorage('quizzes');
    const questionsAll = this._getFromStorage('quiz_questions');
    const optionsAll = this._getFromStorage('quiz_answer_options');

    const quiz = quizzes.find((q) => q.id === quizId) || null;
    if (!quiz) {
      return { quiz: null, questions: [] };
    }

    const questions = questionsAll
      .filter((q) => q.quiz_id === quizId)
      .sort((a, b) => {
        const ai = typeof a.order_index === 'number' ? a.order_index : 0;
        const bi = typeof b.order_index === 'number' ? b.order_index : 0;
        return ai - bi;
      })
      .map((question) => {
        let answer_options = optionsAll
          .filter((o) => o.question_id === question.id)
          .sort((a, b) => {
            const ai = typeof a.order_index === 'number' ? a.order_index : 0;
            const bi = typeof b.order_index === 'number' ? b.order_index : 0;
            return ai - bi;
          });

        // If no answer options are defined for a question, provide a default one
        if (!answer_options || answer_options.length === 0) {
          answer_options = [
            {
              id: `${question.id}_auto_opt_1`,
              question_id: question.id,
              order_index: 0,
              text: 'Not specified',
              value: 0,
              is_default: true
            }
          ];
        }

        return { question, answer_options };
      });

    return { quiz, questions };
  }

  // submitQuizAnswers(quiz_id, answers)
  submitQuizAnswers(quiz_id, answers) {
    const quizzes = this._getFromStorage('quizzes');
    const results = this._getFromStorage('quiz_results');

    const quiz = quizzes.find((q) => q.id === quiz_id);
    if (!quiz) {
      return { success: false, quiz_result: null, message: 'Quiz not found.' };
    }

    const computed = this._calculateQuizResultFromAnswers(quiz, answers || []);
    const nowIso = new Date().toISOString();

    const quiz_result = {
      id: this._generateId('quizresult'),
      quiz_id,
      completed_at: nowIso,
      overall_score: computed.overall_score,
      overall_label: computed.overall_label,
      summary: computed.summary
    };

    results.push(quiz_result);
    this._saveToStorage('quiz_results', results);

    return { success: true, quiz_result, message: 'Quiz submitted successfully.' };
  }

  // getRecentQuizResults(limit)
  getRecentQuizResults(limit) {
    const results = this._getFromStorage('quiz_results');
    const quizzes = this._getFromStorage('quizzes');
    const lim = typeof limit === 'number' ? limit : 10;

    const sorted = results
      .slice()
      .sort((a, b) => {
        const ad = this._parseDate(a.completed_at) || new Date(0);
        const bd = this._parseDate(b.completed_at) || new Date(0);
        return bd - ad;
      })
      .slice(0, lim);

    return sorted.map((quiz_result) => ({
      quiz_result,
      quiz: quizzes.find((q) => q.id === quiz_result.quiz_id) || null
    }));
  }

  // getJournalEntriesList(page, page_size)
  getJournalEntriesList(page, page_size) {
    const entries = this._getFromStorage('journal_entries');
    const quizResults = this._getFromStorage('quiz_results');

    const sorted = entries
      .slice()
      .sort((a, b) => {
        const ad = this._parseDate(a.created_at) || new Date(0);
        const bd = this._parseDate(b.created_at) || new Date(0);
        return bd - ad;
      });

    const p = page || 1;
    const ps = page_size || 20;
    const start = (p - 1) * ps;
    const end = start + ps;
    const slice = sorted.slice(start, end).map((entry) => {
      const resolved = { ...entry };
      if (entry.source_reference_id) {
        if (entry.source_type === 'quiz_result') {
          resolved.source_reference = quizResults.find((r) => r.id === entry.source_reference_id) || null;
        } else {
          resolved.source_reference = null;
        }
      }
      return resolved;
    });

    return {
      page: p,
      page_size: ps,
      total_items: entries.length,
      items: slice
    };
  }

  // getJournalEntryDetail(journal_entry_id)
  getJournalEntryDetail(journal_entry_id) {
    const entries = this._getFromStorage('journal_entries');
    const quizResults = this._getFromStorage('quiz_results');

    const entry = entries.find((e) => e.id === journal_entry_id) || null;
    if (!entry) return null;

    const resolved = { ...entry };
    if (entry.source_reference_id && entry.source_type === 'quiz_result') {
      resolved.source_reference = quizResults.find((r) => r.id === entry.source_reference_id) || null;
    }
    return resolved;
  }

  // createJournalEntry(title, body, source_type, source_reference_id)
  createJournalEntry(title, body, source_type, source_reference_id) {
    const entries = this._getFromStorage('journal_entries');
    const nowIso = new Date().toISOString();

    const entry = {
      id: this._generateId('journalentry'),
      title: title || '',
      body: body || '',
      created_at: nowIso,
      updated_at: null,
      source_type: source_type || 'manual',
      source_reference_id: source_reference_id || null
    };

    entries.push(entry);
    this._saveToStorage('journal_entries', entries);

    return { success: true, entry };
  }

  // updateJournalEntry(journal_entry_id, title, body)
  updateJournalEntry(journal_entry_id, title, body) {
    const entries = this._getFromStorage('journal_entries');
    const entry = entries.find((e) => e.id === journal_entry_id);
    if (!entry) {
      return { success: false, entry: null };
    }

    if (typeof title === 'string') entry.title = title;
    if (typeof body === 'string') entry.body = body;
    entry.updated_at = new Date().toISOString();

    this._saveToStorage('journal_entries', entries);
    return { success: true, entry };
  }

  // deleteJournalEntry(journal_entry_id)
  deleteJournalEntry(journal_entry_id) {
    const entries = this._getFromStorage('journal_entries');
    const idx = entries.findIndex((e) => e.id === journal_entry_id);
    if (idx === -1) return { success: false };
    entries.splice(idx, 1);
    this._saveToStorage('journal_entries', entries);
    return { success: true };
  }

  // getEventFilterOptions()
  getEventFilterOptions() {
    const time_of_day_segments = [
      { value: 'morning', label: 'Morning' },
      { value: 'afternoon', label: 'Afternoon' },
      { value: 'evening', label: 'Evening' },
      { value: 'all_day', label: 'All Day' },
      { value: 'unspecified', label: 'Unspecified' }
    ];

    const today = new Date();
    const default_start_date = this._formatDateYMD(today);
    const end = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
    const default_end_date = this._formatDateYMD(end);

    return { time_of_day_segments, default_start_date, default_end_date };
  }

  // getEventsList(keyword, start_date, end_date, time_of_day_segment, sort, page, page_size)
  getEventsList(keyword, start_date, end_date, time_of_day_segment, sort, page, page_size) {
    const events = this._getFromStorage('events');
    const kw = (keyword || '').trim().toLowerCase();

    const start = start_date ? this._parseDate(start_date) : null;
    const end = end_date ? this._parseDate(end_date) : null;

    const filtered = events.filter((e) => {
      if (kw) {
        const text = `${e.title || ''} ${e.description || ''}`;
        const tags = e.tags || [];
        if (!this._stringIncludesCI(text, kw) && !this._arrayIncludesNormalized(tags, kw)) {
          return false;
        }
      }

      const eventStart = this._parseDate(e.start_datetime);
      if (start && eventStart && eventStart < start) return false;
      if (end && eventStart && eventStart > end) return false;

      if (time_of_day_segment && e.time_of_day_segment && time_of_day_segment !== e.time_of_day_segment) {
        return false;
      }

      return true;
    });

    const sortFunctions = {
      soonest_date_first: (a, b) => {
        const ad = this._parseDate(a.start_datetime) || new Date(8640000000000000);
        const bd = this._parseDate(b.start_datetime) || new Date(8640000000000000);
        return ad - bd;
      },
      newest_first: (a, b) => {
        const ad = this._parseDate(a.created_at || a.start_datetime) || new Date(0);
        const bd = this._parseDate(b.created_at || b.start_datetime) || new Date(0);
        return bd - ad;
      },
      popularity: (a, b) => {
        // No popularity field; fallback to soonest_date_first
        const ad = this._parseDate(a.start_datetime) || new Date(8640000000000000);
        const bd = this._parseDate(b.start_datetime) || new Date(8640000000000000);
        return ad - bd;
      }
    };

    const { items: paged, total_items } = this._applyListPaginationAndSorting(filtered, {
      sort: sort || 'soonest_date_first',
      page: page || 1,
      page_size: page_size || 20,
      sortFunctions,
      defaultSort: 'soonest_date_first'
    });

    // Instrumentation for task completion tracking (task_5)
    try {
      localStorage.setItem(
        'task5_eventsFilterParams',
        JSON.stringify({
          keyword,
          start_date,
          end_date,
          time_of_day_segment,
          sort,
          page,
          page_size,
          timestamp: new Date().toISOString()
        })
      );

      const keywordStr = (keyword || '').toLowerCase();
      const containsPhrase = keywordStr.indexOf('breathwork for anxiety') !== -1;

      const today = new Date();
      const expectedStart = this._formatDateYMD(today);
      const endDateObj = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
      const expectedEnd = this._formatDateYMD(endDateObj);

      if (
        containsPhrase &&
        start_date === expectedStart &&
        end_date === expectedEnd &&
        time_of_day_segment === 'evening' &&
        sort === 'soonest_date_first'
      ) {
        const existing = localStorage.getItem('task5_correctEventsFilterUsed');
        if (existing !== 'true') {
          localStorage.setItem('task5_correctEventsFilterUsed', 'true');
        }
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      page: page || 1,
      page_size: page_size || 20,
      total_items,
      items: paged
    };
  }

  // getEventDetail(eventId)
  getEventDetail(eventId) {
    const events = this._getFromStorage('events');
    return events.find((e) => e.id === eventId) || null;
  }

  // registerForEvent(event_id, name, email, timezone)
  registerForEvent(event_id, name, email, timezone) {
    const events = this._getFromStorage('events');
    const registrations = this._getFromStorage('event_registrations');

    const event = events.find((e) => e.id === event_id);
    if (!event) {
      return { success: false, registration: null, message: 'Event not found.' };
    }

    const nowIso = new Date().toISOString();
    const registration = {
      id: this._generateId('eventregistration'),
      event_id,
      name: name || '',
      email: email || '',
      timezone: timezone || 'UTC',
      registered_at: nowIso,
      status: 'confirmed'
    };

    registrations.push(registration);
    this._saveToStorage('event_registrations', registrations);

    // Optionally decrease spots_remaining if present
    if (typeof event.spots_remaining === 'number') {
      event.spots_remaining = Math.max(0, event.spots_remaining - 1);
      this._saveToStorage('events', events);
    }

    return { success: true, registration, message: 'Registration successful.' };
  }

  // getAffirmationFilterOptions()
  getAffirmationFilterOptions() {
    const affirmations = this._getFromStorage('affirmations');
    const tagsSet = new Set();

    for (const a of affirmations) {
      for (const t of a.tags || []) {
        if (t) tagsSet.add(String(t));
      }
    }

    const tags = Array.from(tagsSet).map((t) => ({ value: t, label: t }));

    return { tags };
  }

  // getAffirmationsList(tag, page, page_size)
  getAffirmationsList(tag, page, page_size) {
    const affirmations = this._getFromStorage('affirmations');
    const filtered = affirmations.filter((a) => {
      if (tag && !this._arrayIncludesNormalized(a.tags || [], tag)) return false;
      return true;
    });

    const sorted = filtered.slice().sort((a, b) => {
      const ad = this._parseDate(a.created_at) || new Date(0);
      const bd = this._parseDate(b.created_at) || new Date(0);
      return bd - ad;
    });

    const p = page || 1;
    const ps = page_size || 50;
    const start = (p - 1) * ps;
    const end = start + ps;

    const result = {
      page: p,
      page_size: ps,
      total_items: sorted.length,
      items: sorted.slice(start, end)
    };

    // Instrumentation for task completion tracking (task_6)
    try {
      localStorage.setItem(
        'task6_affirmationFilterParams',
        JSON.stringify({
          tag,
          page,
          page_size,
          timestamp: new Date().toISOString()
        })
      );

      const normalizedTag = this._normalizeTagOrTopic(tag);
      if (normalizedTag === 'self compassion') {
        const existing = localStorage.getItem('task6_correctAffirmationFilterUsed');
        if (existing !== 'true') {
          localStorage.setItem('task6_correctAffirmationFilterUsed', 'true');
        }
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return result;
  }

  // getAffirmationSetsOverview()
  getAffirmationSetsOverview() {
    return this._getFromStorage('affirmation_sets');
  }

  // createAffirmationSetAndAddItem(name, description, affirmation_id)
  createAffirmationSetAndAddItem(name, description, affirmation_id) {
    const affirmations = this._getFromStorage('affirmations');
    const sets = this._getFromStorage('affirmation_sets');
    const setItems = this._getFromStorage('affirmation_set_items');

    const affirmation = affirmations.find((a) => a.id === affirmation_id);
    if (!affirmation) {
      return { success: false, set: null, set_item: null, message: 'Affirmation not found.' };
    }

    const nowIso = new Date().toISOString();

    const set = {
      id: this._generateId('affirmationset'),
      name: (name || '').trim() || 'New Affirmation Set',
      description: description || '',
      notes: '',
      created_at: nowIso,
      updated_at: nowIso,
      is_active: true,
      reminder_enabled: false,
      schedule_time: null,
      schedule_frequency: 'none'
    };

    sets.push(set);

    const set_item = {
      id: this._generateId('affirmationsetitem'),
      set_id: set.id,
      affirmation_id,
      added_at: nowIso,
      order_index: 0
    };

    setItems.push(set_item);

    this._saveToStorage('affirmation_sets', sets);
    this._saveToStorage('affirmation_set_items', setItems);

    return { success: true, set, set_item, message: 'Affirmation set created and affirmation added.' };
  }

  // addAffirmationToExistingSet(set_id, affirmation_id)
  addAffirmationToExistingSet(set_id, affirmation_id) {
    const sets = this._getFromStorage('affirmation_sets');
    const setItems = this._getFromStorage('affirmation_set_items');
    const affirmations = this._getFromStorage('affirmations');

    const set = sets.find((s) => s.id === set_id);
    if (!set) {
      return { success: false, set_item: null, message: 'Affirmation set not found.' };
    }

    const affirmation = affirmations.find((a) => a.id === affirmation_id);
    if (!affirmation) {
      return { success: false, set_item: null, message: 'Affirmation not found.' };
    }

    const nowIso = new Date().toISOString();
    const order_index = setItems.filter((i) => i.set_id === set_id).length;

    const set_item = {
      id: this._generateId('affirmationsetitem'),
      set_id,
      affirmation_id,
      added_at: nowIso,
      order_index
    };

    setItems.push(set_item);
    this._saveToStorage('affirmation_set_items', setItems);

    return { success: true, set_item, message: 'Affirmation added to set.' };
  }

  // getAffirmationSetDetail(setId)
  getAffirmationSetDetail(setId) {
    const sets = this._getFromStorage('affirmation_sets');
    const setItems = this._getFromStorage('affirmation_set_items');
    const affirmations = this._getFromStorage('affirmations');

    const set = sets.find((s) => s.id === setId) || null;
    if (!set) {
      return { set: null, items: [] };
    }

    const itemsForSet = setItems
      .filter((i) => i.set_id === setId)
      .sort((a, b) => {
        const ai = typeof a.order_index === 'number' ? a.order_index : 0;
        const bi = typeof b.order_index === 'number' ? b.order_index : 0;
        return ai - bi;
      })
      .map((si) => {
        const affirmation = affirmations.find((a) => a.id === si.affirmation_id) || null;
        const resolvedItem = this._resolveForeignKeysForItem(si);
        return { set_item: { ...resolvedItem, set }, affirmation };
      });

    return { set, items: itemsForSet };
  }

  // updateAffirmationSetSchedule(set_id, reminder_enabled, schedule_time, schedule_frequency)
  updateAffirmationSetSchedule(set_id, reminder_enabled, schedule_time, schedule_frequency) {
    const sets = this._getFromStorage('affirmation_sets');
    const set = sets.find((s) => s.id === set_id);
    if (!set) {
      return { success: false, set: null };
    }

    set.reminder_enabled = !!reminder_enabled;
    if (set.reminder_enabled) {
      set.schedule_time = schedule_time || '07:00';
      set.schedule_frequency = schedule_frequency || 'daily';
    } else {
      set.schedule_time = null;
      set.schedule_frequency = 'none';
    }
    set.updated_at = new Date().toISOString();

    this._saveToStorage('affirmation_sets', sets);

    return { success: true, set };
  }

  // removeAffirmationFromSet(set_item_id)
  removeAffirmationFromSet(set_item_id) {
    const setItems = this._getFromStorage('affirmation_set_items');
    const idx = setItems.findIndex((i) => i.id === set_item_id);
    if (idx === -1) return { success: false };
    setItems.splice(idx, 1);
    this._saveToStorage('affirmation_set_items', setItems);
    return { success: true };
  }

  // getChallengeFilterOptions()
  getChallengeFilterOptions() {
    const challenges = this._getFromStorage('challenges');

    const tagsSet = new Set();
    const durationsSet = new Set();
    const difficultiesSet = new Set();

    for (const c of challenges) {
      for (const t of c.tags || []) {
        tagsSet.add(String(t));
      }
      if (typeof c.duration_days === 'number') durationsSet.add(c.duration_days);
      if (c.difficulty) difficultiesSet.add(c.difficulty);
    }

    const tags = Array.from(tagsSet).map((t) => ({ value: t, label: t }));
    const durations_days = Array.from(durationsSet).map((d) => ({ value: d, label: `${d} days` }));

    const difficultyLabels = {
      easy: 'Easy',
      medium: 'Medium',
      hard: 'Hard'
    };
    const difficulties = Array.from(difficultiesSet).map((d) => ({ value: d, label: difficultyLabels[d] || d }));

    return { tags, durations_days, difficulties };
  }

  // getChallengesList(tag, duration_days, difficulty, sort, page, page_size)
  getChallengesList(tag, duration_days, difficulty, sort, page, page_size) {
    const challenges = this._getFromStorage('challenges');

    const filtered = challenges.filter((c) => {
      if (tag && !this._arrayIncludesNormalized(c.tags || [], tag)) return false;
      if (typeof duration_days === 'number' && c.duration_days !== duration_days) return false;
      if (difficulty && c.difficulty !== difficulty) return false;
      return true;
    });

    const sortFunctions = {
      most_popular: (a, b) => {
        const ap = typeof a.popularity_score === 'number' ? a.popularity_score : 0;
        const bp = typeof b.popularity_score === 'number' ? b.popularity_score : 0;
        return bp - ap;
      },
      recommended: (a, b) => {
        const ar = a.is_recommended ? 1 : 0;
        const br = b.is_recommended ? 1 : 0;
        if (ar !== br) return br - ar;
        const ap = typeof a.popularity_score === 'number' ? a.popularity_score : 0;
        const bp = typeof b.popularity_score === 'number' ? b.popularity_score : 0;
        return bp - ap;
      },
      newest_first: (a, b) => {
        const ad = this._parseDate(a.created_at) || new Date(0);
        const bd = this._parseDate(b.created_at) || new Date(0);
        return bd - ad;
      }
    };

    const { items: paged, total_items } = this._applyListPaginationAndSorting(filtered, {
      sort: sort || 'most_popular',
      page: page || 1,
      page_size: page_size || 20,
      sortFunctions,
      defaultSort: 'most_popular'
    });

    // Instrumentation for task completion tracking (task_7)
    try {
      localStorage.setItem(
        'task7_challengeFilterParams',
        JSON.stringify({
          tag,
          duration_days,
          difficulty,
          sort,
          page,
          page_size,
          timestamp: new Date().toISOString()
        })
      );

      const normalizedTag = this._normalizeTagOrTopic(tag);
      if (
        normalizedTag === 'digital detox' &&
        duration_days === 3 &&
        difficulty === 'easy' &&
        (sort === 'most_popular' || sort === 'recommended')
      ) {
        const existing = localStorage.getItem('task7_correctChallengeFilterUsed');
        if (existing !== 'true') {
          localStorage.setItem('task7_correctChallengeFilterUsed', 'true');
        }
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      page: page || 1,
      page_size: page_size || 20,
      total_items,
      items: paged
    };
  }

  // getChallengeDetail(challengeId)
  getChallengeDetail(challengeId) {
    const challenges = this._getFromStorage('challenges');
    return challenges.find((c) => c.id === challengeId) || null;
  }

  // enrollInChallenge(challenge_id, start_date)
  enrollInChallenge(challenge_id, start_date) {
    const challenges = this._getFromStorage('challenges');
    const enrollments = this._getFromStorage('challenge_enrollments');

    const challenge = challenges.find((c) => c.id === challenge_id);
    if (!challenge) {
      return { success: false, enrollment: null, message: 'Challenge not found.' };
    }

    const normalizedStart = this._normalizePlanDate(start_date);
    // Store start_date in a format that preserves the intended local calendar day
    // when parsed later with `new Date(...)` (used in tests). A date-time string
    // without a timezone designator is interpreted as local time.
    const startDateLocal = normalizedStart ? `${normalizedStart}T00:00:00` : null;
    const nowIso = new Date().toISOString();

    const enrollment = {
      id: this._generateId('challengeenrollment'),
      challenge_id,
      start_date: startDateLocal,
      joined_at: nowIso,
      status: 'not_started'
    };

    enrollments.push(enrollment);
    this._saveToStorage('challenge_enrollments', enrollments);

    return { success: true, enrollment, message: 'Enrolled in challenge.' };
  }

  // getPracticeFilterOptions()
  getPracticeFilterOptions() {
    const practices = this._getFromStorage('practices');

    const difficultiesMap = {
      beginner: 'Beginner',
      intermediate: 'Intermediate',
      advanced: 'Advanced',
      all_levels: 'All Levels'
    };

    const intentionsMap = {
      morning: 'Morning',
      afternoon: 'Afternoon',
      evening: 'Evening',
      anytime: 'Anytime',
      sleep: 'Sleep'
    };

    const difficultiesSet = new Set();
    const intentionsSet = new Set();
    let minDur = Infinity;
    let maxDur = 0;

    for (const p of practices) {
      if (p.difficulty) difficultiesSet.add(p.difficulty);
      if (p.intention) intentionsSet.add(p.intention);
      if (typeof p.duration_minutes === 'number') {
        if (p.duration_minutes < minDur) minDur = p.duration_minutes;
        if (p.duration_minutes > maxDur) maxDur = p.duration_minutes;
      }
    }

    if (minDur === Infinity) minDur = 0;

    const difficulties = Array.from(difficultiesSet).map((d) => ({ value: d, label: difficultiesMap[d] || d }));
    const intentions = Array.from(intentionsSet).map((i) => ({ value: i, label: intentionsMap[i] || i }));

    return {
      difficulties,
      intentions,
      duration_min: minDur,
      duration_max: maxDur
    };
  }

  // getPracticesList(difficulty, intention, min_duration, max_duration, sort, page, page_size)
  getPracticesList(difficulty, intention, min_duration, max_duration, sort, page, page_size) {
    const practices = this._getFromStorage('practices');

    const filtered = practices.filter((p) => {
      if (difficulty && p.difficulty !== difficulty) return false;
      if (intention && p.intention !== intention) return false;
      const dur = typeof p.duration_minutes === 'number' ? p.duration_minutes : null;
      if (typeof min_duration === 'number' && dur !== null && dur < min_duration) return false;
      if (typeof max_duration === 'number' && dur !== null && dur > max_duration) return false;
      return true;
    });

    const sortFunctions = {
      top_rated: (a, b) => {
        const ar = typeof a.rating_average === 'number' ? a.rating_average : 0;
        const br = typeof b.rating_average === 'number' ? b.rating_average : 0;
        if (ar !== br) return br - ar;
        const ac = typeof a.rating_count === 'number' ? a.rating_count : 0;
        const bc = typeof b.rating_count === 'number' ? b.rating_count : 0;
        return bc - ac;
      },
      most_popular: (a, b) => {
        // No popularity; fall back to rating
        const ar = typeof a.rating_average === 'number' ? a.rating_average : 0;
        const br = typeof b.rating_average === 'number' ? b.rating_average : 0;
        return br - ar;
      },
      duration_shortest_first: (a, b) => {
        const ad = typeof a.duration_minutes === 'number' ? a.duration_minutes : Infinity;
        const bd = typeof b.duration_minutes === 'number' ? b.duration_minutes : Infinity;
        return ad - bd;
      },
      newest_first: (a, b) => {
        const ad = this._parseDate(a.created_at) || new Date(0);
        const bd = this._parseDate(b.created_at) || new Date(0);
        return bd - ad;
      }
    };

    const { items: paged, total_items } = this._applyListPaginationAndSorting(filtered, {
      sort: sort || 'top_rated',
      page: page || 1,
      page_size: page_size || 20,
      sortFunctions,
      defaultSort: 'top_rated'
    });

    // Instrumentation for task completion tracking (task_8)
    try {
      // Always record last-used practice filters
      localStorage.setItem(
        'task8_practiceFilterParams',
        JSON.stringify({
          difficulty,
          intention,
          min_duration,
          max_duration,
          sort,
          page,
          page_size,
          timestamp: new Date().toISOString()
        })
      );

      const matchesTask8Filters =
        difficulty === 'beginner' &&
        intention === 'evening' &&
        typeof min_duration === 'number' &&
        min_duration >= 20 &&
        (sort === 'top_rated' || sort === 'most_popular');

      if (matchesTask8Filters) {
        const existing = localStorage.getItem('task8_correctPracticeFilterUsed');
        if (existing !== 'true') {
          localStorage.setItem('task8_correctPracticeFilterUsed', 'true');
        }

        if (Array.isArray(paged) && paged.length >= 2) {
          const firstTwoIds = [paged[0].id, paged[1].id];
          localStorage.setItem(
            'task8_firstTwoPracticeIds',
            JSON.stringify({
              practice_ids: firstTwoIds,
              timestamp: new Date().toISOString()
            })
          );
        }
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      page: page || 1,
      page_size: page_size || 20,
      total_items,
      items: paged
    };
  }

  // getPracticeDetail(practiceId)
  getPracticeDetail(practiceId) {
    const practices = this._getFromStorage('practices');
    const practice = practices.find((p) => p.id === practiceId) || null;

    // Instrumentation for task completion tracking (task_8 compared practices)
    try {
      const firstTwoRaw = localStorage.getItem('task8_firstTwoPracticeIds');
      if (firstTwoRaw) {
        let firstTwo = null;
        try {
          firstTwo = JSON.parse(firstTwoRaw);
        } catch (e) {
          firstTwo = null;
        }
        const practiceIds = firstTwo && Array.isArray(firstTwo.practice_ids) ? firstTwo.practice_ids : [];
        if (practiceIds.includes(practiceId)) {
          const existingRaw = localStorage.getItem('task8_comparedPracticeIds');
          let existingObj = null;
          try {
            existingObj = existingRaw ? JSON.parse(existingRaw) : null;
          } catch (e) {
            existingObj = null;
          }
          let comparedIds =
            existingObj && Array.isArray(existingObj.compared_ids) ? existingObj.compared_ids.slice() : [];

          if (!comparedIds.includes(practiceId) && comparedIds.length < 2) {
            comparedIds.push(practiceId);
            localStorage.setItem(
              'task8_comparedPracticeIds',
              JSON.stringify({
                compared_ids: comparedIds,
                timestamp: new Date().toISOString()
              })
            );
          }
        }
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return practice;
  }

  // addPracticeToTodaysPractice(practice_id, date)
  addPracticeToTodaysPractice(practice_id, date) {
    const practices = this._getFromStorage('practices');
    const practice = practices.find((p) => p.id === practice_id);
    if (!practice) {
      return { success: false, plan: null, item: null };
    }

    const plan = this._getOrCreateTodaysPracticePlan(date);
    const items = this._getFromStorage('todays_practice_items');
    const nowIso = new Date().toISOString();
    const order_index = items.filter((i) => i.plan_id === plan.id).length;

    const item = {
      id: this._generateId('todayspracticeitem'),
      plan_id: plan.id,
      practice_id,
      added_at: nowIso,
      order_index,
      is_completed: false
    };

    items.push(item);
    plan.updated_at = nowIso;

    this._saveToStorage('todays_practice_items', items);

    const plans = this._getFromStorage('todays_practice_plans');
    const idx = plans.findIndex((p) => p.id === plan.id);
    if (idx !== -1) {
      plans[idx] = plan;
      this._saveToStorage('todays_practice_plans', plans);
    }

    return { success: true, plan, item };
  }

  // getTodaysPracticeSummary(date)
  getTodaysPracticeSummary(date) {
    const normalizedDate = this._normalizePlanDate(date);
    const plans = this._getFromStorage('todays_practice_plans');
    const items = this._getFromStorage('todays_practice_items');
    const practices = this._getFromStorage('practices');

    const plan = plans.find((p) => p.date === normalizedDate) || null;
    if (!plan) {
      return { plan: null, items: [], total_duration_minutes: 0 };
    }

    const itemsForPlan = items
      .filter((i) => i.plan_id === plan.id)
      .sort((a, b) => {
        const ai = typeof a.order_index === 'number' ? a.order_index : 0;
        const bi = typeof b.order_index === 'number' ? b.order_index : 0;
        return ai - bi;
      })
      .map((pi) => {
        const practice = practices.find((p) => p.id === pi.practice_id) || null;
        const resolvedItem = this._resolveForeignKeysForItem(pi);
        return { practice_item: { ...resolvedItem, plan }, practice };
      });

    let totalDuration = 0;
    for (const x of itemsForPlan) {
      if (x.practice && typeof x.practice.duration_minutes === 'number') {
        totalDuration += x.practice.duration_minutes;
      }
    }

    return { plan, items: itemsForPlan, total_duration_minutes: totalDuration };
  }

  // updateTodaysPracticeOrder(plan_id, ordered_item_ids)
  updateTodaysPracticeOrder(plan_id, ordered_item_ids) {
    const items = this._getFromStorage('todays_practice_items');
    const plans = this._getFromStorage('todays_practice_plans');
    const plan = plans.find((p) => p.id === plan_id);
    if (!plan) return { success: false, plan_id };

    const idToIndex = new Map();
    (ordered_item_ids || []).forEach((id, idx) => idToIndex.set(id, idx));

    for (const item of items) {
      if (item.plan_id === plan_id && idToIndex.has(item.id)) {
        item.order_index = idToIndex.get(item.id);
      }
    }

    this._saveToStorage('todays_practice_items', items);
    plan.updated_at = new Date().toISOString();
    this._saveToStorage('todays_practice_plans', plans);

    return { success: true, plan_id };
  }

  // updateTodaysPracticeItemCompletion(practice_item_id, is_completed)
  updateTodaysPracticeItemCompletion(practice_item_id, is_completed) {
    const items = this._getFromStorage('todays_practice_items');
    const item = items.find((i) => i.id === practice_item_id);
    if (!item) return { success: false };
    item.is_completed = !!is_completed;
    this._saveToStorage('todays_practice_items', items);
    return { success: true };
  }

  // removeTodaysPracticeItem(practice_item_id)
  removeTodaysPracticeItem(practice_item_id) {
    const items = this._getFromStorage('todays_practice_items');
    const idx = items.findIndex((i) => i.id === practice_item_id);
    if (idx === -1) return { success: false };
    items.splice(idx, 1);
    this._saveToStorage('todays_practice_items', items);
    return { success: true };
  }

  // getAboutPageContent()
  getAboutPageContent() {
    const raw = localStorage.getItem('about_page_content');
    return raw ? JSON.parse(raw) : { title: '', body: '', sections: [] };
  }

  // getContactPageInfo()
  getContactPageInfo() {
    const raw = localStorage.getItem('contact_page_info');
    return raw ? JSON.parse(raw) : { contact_email: '', response_time_message: '' };
  }

  // submitContactMessage(name, email, subject, message_body)
  submitContactMessage(name, email, subject, message_body) {
    const messages = this._getFromStorage('contact_messages');
    const nowIso = new Date().toISOString();

    const message = {
      id: this._generateId('contactmessage'),
      name: name || '',
      email: email || '',
      subject: subject || '',
      message_body: message_body || '',
      created_at: nowIso
    };

    messages.push(message);
    this._saveToStorage('contact_messages', messages);

    return { success: true, message: 'Message submitted successfully.' };
  }

  // getPrivacyAndTermsContent()
  getPrivacyAndTermsContent() {
    const raw = localStorage.getItem('privacy_terms_content');
    return raw
      ? JSON.parse(raw)
      : {
          last_updated: this._formatDateYMD(new Date()),
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