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

  // -------------------------
  // Storage helpers
  // -------------------------
  _initStorage() {
    const tables = [
      'articles',
      'reading_lists',
      'reading_list_items',
      'communities',
      'bookmarked_communities',
      'educator_resources',
      'lesson_plans',
      'lesson_plan_items',
      'timelines',
      'timeline_events',
      'notes',
      'note_items',
      'media_items',
      'playlists',
      'playlist_items',
      'glossary_terms',
      'study_sets',
      'study_set_items',
      'events',
      'my_events',
      'my_event_items',
      'quizzes',
      'quiz_questions',
      'quiz_attempts',
      'quiz_answers',
      'quiz_recommended_readings',
      'person_profiles'
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

  _now() {
    return new Date().toISOString();
  }

  // -------------------------
  // Label helpers
  // -------------------------
  _regionLabel(region) {
    const map = {
      north_america: 'North America',
      south_america: 'South America',
      oceania: 'Oceania',
      europe: 'Europe',
      africa: 'Africa',
      asia: 'Asia',
      arctic: 'Arctic',
      global: 'Global'
    };
    return map[region] || null;
  }

  _readingLevelLabel(level) {
    const map = {
      beginner: 'Beginner',
      intermediate: 'Intermediate',
      advanced: 'Advanced'
    };
    return map[level] || null;
  }

  _gradeBandLabel(band) {
    const map = {
      k_2: 'K–2',
      3_5: '3–5',
      6_8: '6–8',
      9_12: '9–12',
      higher_ed: 'Higher Ed',
      general: 'General'
    };
    return map[band] || null;
  }

  _resourceTypeLabel(type) {
    const map = {
      classroom_activity: 'Classroom Activity',
      lesson_plan: 'Lesson Plan',
      worksheet: 'Worksheet',
      reading: 'Reading',
      multimedia: 'Multimedia'
    };
    return map[type] || null;
  }

  _eventCategoryLabel(category) {
    const map = {
      art_culture: 'Art & Culture',
      language: 'Language',
      governance: 'Governance',
      education: 'Education',
      history: 'History',
      community: 'Community',
      festival: 'Festival',
      workshop: 'Workshop',
      other: 'Other'
    };
    return map[category] || null;
  }

  _eventTypeLabel(type) {
    const map = {
      virtual_online: 'Virtual / Online',
      in_person: 'In Person',
      hybrid: 'Hybrid'
    };
    return map[type] || null;
  }

  _mediaTopicLabel(topic) {
    const map = {
      oral_histories: 'Oral Histories',
      music: 'Music',
      ceremony: 'Ceremony',
      language_lessons: 'Language Lessons',
      art: 'Art',
      governance: 'Governance',
      other: 'Other'
    };
    return map[topic] || null;
  }

  _contentTypeBadge(entityType) {
    const map = {
      article: 'Article',
      person_profile: 'Profile',
      media_item: 'Media',
      educator_resource: 'Educator Resource',
      event: 'Event',
      glossary_term: 'Term'
    };
    return map[entityType] || 'Item';
  }

  // -------------------------
  // Entity creation helpers (single-user containers)
  // -------------------------
  _getOrCreateDefaultReadingList() {
    const key = 'reading_lists';
    let lists = this._getFromStorage(key);
    let list = lists.find(l => l.name === 'Default Reading List');
    if (!list) {
      list = {
        id: this._generateId('reading_list'),
        name: 'Default Reading List',
        description: 'Saved articles',
        created_at: this._now(),
        updated_at: this._now()
      };
      lists.push(list);
      this._saveToStorage(key, lists);
    }
    return list;
  }

  _findDefaultReadingList() {
    const lists = this._getFromStorage('reading_lists');
    return lists.find(l => l.name === 'Default Reading List') || lists[0] || null;
  }

  _getOrCreateNotesContainer() {
    const key = 'notes';
    let notesArr = this._getFromStorage(key);
    let notes = notesArr[0] || null;
    if (!notes) {
      notes = {
        id: this._generateId('notes'),
        name: 'My Notes',
        description: 'Personal notes collection',
        created_at: this._now(),
        updated_at: this._now()
      };
      notesArr.push(notes);
      this._saveToStorage(key, notesArr);
    }
    return notes;
  }

  _getOrCreateMyEventsContainer() {
    const key = 'my_events';
    let arr = this._getFromStorage(key);
    let container = arr[0] || null;
    if (!container) {
      container = {
        id: this._generateId('my_events'),
        name: 'My Events',
        description: 'Saved events',
        created_at: this._now(),
        updated_at: this._now()
      };
      arr.push(container);
      this._saveToStorage(key, arr);
    }
    return container;
  }

  _getOrCreatePlaylistByName(name) {
    const key = 'playlists';
    let playlists = this._getFromStorage(key);
    let pl = playlists.find(p => p.name === name);
    if (!pl) {
      const now = this._now();
      pl = {
        id: this._generateId('playlist'),
        name: name,
        description: '',
        created_at: now,
        updated_at: now
      };
      playlists.push(pl);
      this._saveToStorage(key, playlists);
    }
    return pl;
  }

  _getOrCreateStudySetByName(name) {
    const key = 'study_sets';
    let sets = this._getFromStorage(key);
    let set = sets.find(s => s.name === name);
    if (!set) {
      const now = this._now();
      set = {
        id: this._generateId('study_set'),
        name: name,
        description: '',
        created_at: now,
        updated_at: now
      };
      sets.push(set);
      this._saveToStorage(key, sets);
    }
    return set;
  }

  _getOrCreateLessonPlan(lessonPlanId, newLessonPlanName) {
    const key = 'lesson_plans';
    let plans = this._getFromStorage(key);
    let plan = null;

    if (lessonPlanId) {
      plan = plans.find(p => p.id === lessonPlanId) || null;
    }

    if (!plan && newLessonPlanName) {
      const now = this._now();
      plan = {
        id: this._generateId('lesson_plan'),
        name: newLessonPlanName,
        description: '',
        total_planned_duration_minutes: 0,
        notes: '',
        created_at: now,
        updated_at: now
      };
      plans.push(plan);
      this._saveToStorage(key, plans);
      return plan;
    }

    if (!plan) {
      // Fallback: first plan or create a default one
      plan = plans[0] || null;
      if (!plan) {
        const now = this._now();
        plan = {
          id: this._generateId('lesson_plan'),
          name: 'Untitled Lesson Plan',
          description: '',
          total_planned_duration_minutes: 0,
          notes: '',
          created_at: now,
          updated_at: now
        };
        plans.push(plan);
        this._saveToStorage(key, plans);
      }
    }

    return plan;
  }

  _recalculateLessonPlanDuration(lessonPlanId) {
    const plans = this._getFromStorage('lesson_plans');
    const items = this._getFromStorage('lesson_plan_items');
    const plan = plans.find(p => p.id === lessonPlanId);
    if (!plan) return 0;

    const total = items
      .filter(i => i.lesson_plan_id === lessonPlanId)
      .reduce((sum, i) => sum + (Number(i.planned_duration_minutes) || 0), 0);

    plan.total_planned_duration_minutes = total;
    plan.updated_at = this._now();
    this._saveToStorage('lesson_plans', plans);
    return total;
  }

  // -------------------------
  // 1) Homepage featured content
  // -------------------------
  getHomepageFeaturedContent() {
    const articles = this._getFromStorage('articles');
    const educatorResources = this._getFromStorage('educator_resources');
    const mediaItems = this._getFromStorage('media_items');
    const events = this._getFromStorage('events');

    const byPopularityDesc = (a, b) => (b.popularity_score || 0) - (a.popularity_score || 0);
    const byStartDateAsc = (a, b) => {
      const da = a.start_datetime ? new Date(a.start_datetime).getTime() : Infinity;
      const db = b.start_datetime ? new Date(b.start_datetime).getTime() : Infinity;
      return da - db;
    };

    const now = Date.now();

    const upcomingEvents = events
      .filter(e => e.start_datetime && new Date(e.start_datetime).getTime() >= now)
      .sort(byStartDateAsc)
      .slice(0, 10);

    return {
      featuredArticles: [...articles].sort(byPopularityDesc).slice(0, 10),
      featuredEducatorResources: [...educatorResources].sort(byPopularityDesc).slice(0, 10),
      featuredMediaItems: [...mediaItems].sort(byPopularityDesc).slice(0, 10),
      upcomingEvents
    };
  }

  // -------------------------
  // 2) Global search
  // -------------------------
  getGlobalSearchFilterOptions() {
    const articles = this._getFromStorage('articles');
    const personProfiles = this._getFromStorage('person_profiles');
    const mediaItems = this._getFromStorage('media_items');
    const educatorResources = this._getFromStorage('educator_resources');
    const events = this._getFromStorage('events');
    const glossaryTerms = this._getFromStorage('glossary_terms');

    const contentTypes = [
      { value: 'article', label: 'Articles', count: articles.length },
      { value: 'person_profile', label: 'People & Artist Profiles', count: personProfiles.length },
      { value: 'media_item', label: 'Media Items', count: mediaItems.length },
      { value: 'educator_resource', label: 'Educator Resources', count: educatorResources.length },
      { value: 'event', label: 'Events', count: events.length },
      { value: 'glossary_term', label: 'Glossary Terms', count: glossaryTerms.length }
    ];

    const regionCounts = {};
    const countRegion = item => {
      if (item && item.region) {
        regionCounts[item.region] = (regionCounts[item.region] || 0) + 1;
      }
    };
    articles.forEach(countRegion);
    personProfiles.forEach(countRegion);
    mediaItems.forEach(countRegion);
    events.forEach(countRegion);

    const regions = Object.keys(regionCounts).map(value => ({
      value,
      label: this._regionLabel(value) || value,
      count: regionCounts[value]
    }));

    const readingLevelCounts = {};
    for (const a of articles) {
      if (a.reading_level) {
        readingLevelCounts[a.reading_level] = (readingLevelCounts[a.reading_level] || 0) + 1;
      }
    }
    const readingLevels = Object.keys(readingLevelCounts).map(value => ({
      value,
      label: this._readingLevelLabel(value) || value,
      count: readingLevelCounts[value]
    }));

    const topicCounts = {};
    for (const a of articles) {
      if (Array.isArray(a.topics)) {
        for (const t of a.topics) {
          if (!t) continue;
          topicCounts[t] = (topicCounts[t] || 0) + 1;
        }
      }
    }
    for (const m of mediaItems) {
      if (m.topic) {
        const label = this._mediaTopicLabel(m.topic) || m.topic;
        topicCounts[label] = (topicCounts[label] || 0) + 1;
      }
    }
    const topics = Object.keys(topicCounts).map(value => ({
      value,
      label: value,
      count: topicCounts[value]
    }));

    const sortOptions = [
      { value: 'relevance', label: 'Relevance' },
      { value: 'most_popular', label: 'Most Popular' },
      { value: 'shortest_reading_time', label: 'Shortest Reading Time' },
      { value: 'shortest_length', label: 'Shortest Length' }
    ];

    return { contentTypes, regions, readingLevels, topics, sortOptions };
  }

  searchContent(query, filters, sortBy, page, pageSize) {
    query = (query || '').trim().toLowerCase();
    filters = filters || {};
    sortBy = sortBy || 'relevance';
    page = page || 1;
    pageSize = pageSize || 20;

    const articles = this._getFromStorage('articles');
    const personProfiles = this._getFromStorage('person_profiles');
    const mediaItems = this._getFromStorage('media_items');
    const educatorResources = this._getFromStorage('educator_resources');
    const events = this._getFromStorage('events');
    const glossaryTerms = this._getFromStorage('glossary_terms');

    const includedTypes = filters.contentTypes && filters.contentTypes.length
      ? new Set(filters.contentTypes)
      : new Set(['article', 'person_profile', 'media_item', 'educator_resource', 'event', 'glossary_term']);

    const results = [];

    const matchesQuery = (text) => {
      if (!query) return true;
      if (!text) return false;
      const haystack = String(text).toLowerCase();
      const terms = query.split(/\s+/).filter(Boolean);
      return terms.every(term => haystack.includes(term));
    };

    const regionFilter = filters.region || null;
    const readingLevelFilter = filters.readingLevel || null;
    const minRead = typeof filters.minEstimatedReadingTimeMinutes === 'number' ? filters.minEstimatedReadingTimeMinutes : null;
    const maxRead = typeof filters.maxEstimatedReadingTimeMinutes === 'number' ? filters.maxEstimatedReadingTimeMinutes : null;
    const personDiscipline = filters.personDiscipline || null;

    // Articles
    if (includedTypes.has('article')) {
      for (const a of articles) {
        if (regionFilter && a.region !== regionFilter) continue;
        if (readingLevelFilter && a.reading_level !== readingLevelFilter) continue;
        if (minRead !== null && (a.estimated_reading_time_minutes || 0) < minRead) continue;
        if (maxRead !== null && (a.estimated_reading_time_minutes || 0) > maxRead) continue;

        const textForSearch = [
          a.title,
          a.summary,
          (a.topics || []).join(' '),
          a.region,
          this._regionLabel(a.region)
        ].join(' ');
        if (!matchesQuery(textForSearch)) continue;

        results.push({
          id: a.id,
          entityType: 'article',
          title: a.title,
          snippet: (a.summary || '').slice(0, 200),
          regionLabel: this._regionLabel(a.region) || null,
          readingLevelLabel: this._readingLevelLabel(a.reading_level) || null,
          estimatedReadingTimeMinutes: a.estimated_reading_time_minutes || null,
          lengthSeconds: null,
          averageRating: null,
          badge: this._contentTypeBadge('article'),
          _popularity: a.popularity_score || 0
        });
      }
    }

    // Person profiles
    if (includedTypes.has('person_profile')) {
      for (const p of personProfiles) {
        if (regionFilter && p.region !== regionFilter) continue;
        if (personDiscipline && !(Array.isArray(p.disciplines) && p.disciplines.some(d => String(d).toLowerCase() === personDiscipline.toLowerCase()))) continue;
        const textForSearch = [p.name, p.short_description, p.biography, (p.disciplines || []).join(' ')].join(' ');
        if (!matchesQuery(textForSearch)) continue;
        results.push({
          id: p.id,
          entityType: 'person_profile',
          title: p.name,
          snippet: (p.short_description || p.biography || '').slice(0, 200),
          regionLabel: this._regionLabel(p.region) || null,
          readingLevelLabel: null,
          estimatedReadingTimeMinutes: null,
          lengthSeconds: null,
          averageRating: null,
          badge: this._contentTypeBadge('person_profile'),
          _popularity: 0
        });
      }
    }

    // Media items
    if (includedTypes.has('media_item')) {
      for (const m of mediaItems) {
        if (regionFilter && m.region !== regionFilter) continue;
        const textForSearch = [m.title, m.description, (m.creators || []).join(' ')].join(' ');
        if (!matchesQuery(textForSearch)) continue;
        results.push({
          id: m.id,
          entityType: 'media_item',
          title: m.title,
          snippet: (m.description || '').slice(0, 200),
          regionLabel: this._regionLabel(m.region) || null,
          readingLevelLabel: null,
          estimatedReadingTimeMinutes: null,
          lengthSeconds: m.length_seconds || null,
          averageRating: null,
          badge: this._contentTypeBadge('media_item'),
          _popularity: m.popularity_score || 0
        });
      }
    }

    // Educator resources
    if (includedTypes.has('educator_resource')) {
      for (const r of educatorResources) {
        const textForSearch = [r.title, r.description, (r.subject_areas || []).join(' '), r.theme].join(' ');
        if (!matchesQuery(textForSearch)) continue;
        results.push({
          id: r.id,
          entityType: 'educator_resource',
          title: r.title,
          snippet: (r.description || '').slice(0, 200),
          regionLabel: null,
          readingLevelLabel: null,
          estimatedReadingTimeMinutes: r.duration_minutes || null,
          lengthSeconds: null,
          averageRating: r.average_rating || null,
          badge: this._contentTypeBadge('educator_resource'),
          _popularity: r.rating_count || 0
        });
      }
    }

    // Events
    if (includedTypes.has('event')) {
      for (const e of events) {
        if (regionFilter && e.region !== regionFilter) continue;
        const textForSearch = [e.title, e.description].join(' ');
        if (!matchesQuery(textForSearch)) continue;
        results.push({
          id: e.id,
          entityType: 'event',
          title: e.title,
          snippet: (e.description || '').slice(0, 200),
          regionLabel: this._regionLabel(e.region) || null,
          readingLevelLabel: null,
          estimatedReadingTimeMinutes: null,
          lengthSeconds: null,
          averageRating: null,
          badge: this._contentTypeBadge('event'),
          _popularity: 0
        });
      }
    }

    // Glossary terms
    if (includedTypes.has('glossary_term')) {
      for (const t of glossaryTerms) {
        const textForSearch = [t.term, t.definition, t.usage_notes].join(' ');
        if (!matchesQuery(textForSearch)) continue;
        results.push({
          id: t.id,
          entityType: 'glossary_term',
          title: t.term,
          snippet: (t.definition || '').slice(0, 200),
          regionLabel: null,
          readingLevelLabel: null,
          estimatedReadingTimeMinutes: null,
          lengthSeconds: null,
          averageRating: null,
          badge: this._contentTypeBadge('glossary_term'),
          _popularity: 0
        });
      }
    }

    // Sorting
    if (sortBy === 'most_popular') {
      results.sort((a, b) => (b._popularity || 0) - (a._popularity || 0));
    } else if (sortBy === 'shortest_reading_time') {
      results.sort((a, b) => {
        const av = a.estimatedReadingTimeMinutes != null ? a.estimatedReadingTimeMinutes : Infinity;
        const bv = b.estimatedReadingTimeMinutes != null ? b.estimatedReadingTimeMinutes : Infinity;
        return av - bv;
      });
    } else if (sortBy === 'shortest_length') {
      results.sort((a, b) => {
        const av = a.lengthSeconds != null ? a.lengthSeconds : Infinity;
        const bv = b.lengthSeconds != null ? b.lengthSeconds : Infinity;
        return av - bv;
      });
    } else {
      // relevance: keep insertion order (approximate)
    }

    const totalResults = results.length;
    const start = (page - 1) * pageSize;
    const paged = results.slice(start, start + pageSize).map(r => {
      const copy = { ...r };
      delete copy._popularity;
      return copy;
    });

    // Instrumentation for task completion tracking
    try {
      if (
        query.includes('language') &&
        query.includes('revitalization') &&
        Array.isArray(filters.contentTypes) &&
        filters.contentTypes.includes('article') &&
        filters.region === 'north_america' &&
        filters.readingLevel === 'beginner' &&
        sortBy === 'most_popular'
      ) {
        localStorage.setItem(
          'task1_searchParams',
          JSON.stringify({
            query,
            contentTypes: Array.from(includedTypes),
            region: filters.region || null,
            readingLevel: filters.readingLevel || null,
            sortBy,
            timestamp: this._now()
          })
        );
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      results: paged,
      totalResults,
      page,
      pageSize
    };
  }

  // -------------------------
  // 3) Articles & reading list
  // -------------------------
  getArticleDetail(articleId) {
    const articles = this._getFromStorage('articles');
    const article = articles.find(a => a.id === articleId) || null;

    const readingList = this._findDefaultReadingList();
    const readingListItems = this._getFromStorage('reading_list_items');
    const isInReadingList = !!(readingList && readingListItems.some(item => item.reading_list_id === readingList.id && item.article_id === articleId));

    let relatedArticles = [];
    if (article) {
      relatedArticles = articles
        .filter(a => a.id !== article.id && (a.region === article.region || (Array.isArray(a.topics) && Array.isArray(article.topics) && a.topics.some(t => article.topics.includes(t)))))
        .slice(0, 10);
    }

    const quizzes = this._getFromStorage('quizzes');
    const relatedQuizzes = quizzes.filter(q => q.topic === 'indigenous_governance' || q.topic === 'traditional_ecological_knowledge');

    return {
      article,
      regionLabel: article ? this._regionLabel(article.region) : null,
      topicLabels: article && Array.isArray(article.topics) ? article.topics.slice() : [],
      readingLevelLabel: article ? this._readingLevelLabel(article.reading_level) : null,
      estimatedReadingTimeDisplay: article && article.estimated_reading_time_minutes
        ? article.estimated_reading_time_minutes + ' min read'
        : null,
      isInReadingList,
      relatedArticles,
      relatedQuizzes
    };
  }

  addArticleToReadingList(articleId, source) {
    const list = this._getOrCreateDefaultReadingList();
    const items = this._getFromStorage('reading_list_items');

    let existing = items.find(i => i.reading_list_id === list.id && i.article_id === articleId);
    if (existing) {
      return {
        success: true,
        readingList: list,
        readingListItem: existing,
        message: 'Article already in reading list.'
      };
    }

    const item = {
      id: this._generateId('reading_list_item'),
      reading_list_id: list.id,
      article_id: articleId,
      source: source || 'manual',
      added_at: this._now()
    };

    items.push(item);
    this._saveToStorage('reading_list_items', items);

    return {
      success: true,
      readingList: list,
      readingListItem: item,
      message: 'Article added to reading list.'
    };
  }

  getReadingListSummary() {
    const list = this._getOrCreateDefaultReadingList();
    const items = this._getFromStorage('reading_list_items').filter(i => i.reading_list_id === list.id);
    const articles = this._getFromStorage('articles');

    let totalEstimatedReadingTimeMinutes = 0;

    const enrichedItems = items.map(item => {
      const article = articles.find(a => a.id === item.article_id) || null;
      const est = article && article.estimated_reading_time_minutes ? article.estimated_reading_time_minutes : 0;
      totalEstimatedReadingTimeMinutes += est;
      return {
        readingListItem: item,
        article,
        estimatedReadingTimeMinutes: est
      };
    });

    return {
      readingList: list,
      items: enrichedItems,
      totalEstimatedReadingTimeMinutes
    };
  }

  // -------------------------
  // 4) World Cultures Map & communities
  // -------------------------
  getMapRegionOptions() {
    const regions = ['north_america', 'south_america', 'oceania', 'europe', 'africa', 'asia', 'arctic', 'global'];
    return regions.map(value => ({
      value,
      label: this._regionLabel(value) || value
    }));
  }

  getMapCommunities(region) {
    const communities = this._getFromStorage('communities');
    if (region) {
      return communities.filter(c => c.region === region);
    }
    return communities;
  }

  getCommunityDetail(communityId) {
    const communities = this._getFromStorage('communities');
    const community = communities.find(c => c.id === communityId) || null;
    const bookmarks = this._getFromStorage('bookmarked_communities');
    const isBookmarked = !!bookmarks.find(b => b.community_id === communityId);

    return {
      community,
      regionLabel: community ? this._regionLabel(community.region) : null,
      languageFamilyLabel: community && community.language_family ? community.language_family : null,
      isBookmarked
    };
  }

  bookmarkCommunity(communityId, label) {
    const bookmarks = this._getFromStorage('bookmarked_communities');
    let existing = bookmarks.find(b => b.community_id === communityId);
    if (existing) {
      return {
        success: false,
        bookmarkedCommunity: existing,
        message: 'Community already bookmarked.'
      };
    }

    const bookmark = {
      id: this._generateId('bookmarked_community'),
      community_id: communityId,
      label: label || '',
      added_at: this._now()
    };

    bookmarks.push(bookmark);
    this._saveToStorage('bookmarked_communities', bookmarks);

    return {
      success: true,
      bookmarkedCommunity: bookmark,
      message: 'Community bookmarked.'
    };
  }

  getBookmarkedCommunities() {
    const bookmarks = this._getFromStorage('bookmarked_communities');
    const communities = this._getFromStorage('communities');
    return bookmarks.map(bookmark => ({
      bookmark,
      community: communities.find(c => c.id === bookmark.community_id) || null
    }));
  }

  // -------------------------
  // 5) Educator resources & lesson plans
  // -------------------------
  getEducatorResourceFilterOptions() {
    const resources = this._getFromStorage('educator_resources');
    const gradeBands = [
      'k_2',
      '3_5',
      '6_8',
      '9_12',
      'higher_ed',
      'general'
    ].map(value => ({ value, label: this._gradeBandLabel(value) || value }));

    const themeSet = new Set();
    resources.forEach(r => { if (r.theme) themeSet.add(r.theme); });
    const themes = Array.from(themeSet).map(value => ({ value, label: value }));

    const resourceTypes = [
      'classroom_activity',
      'lesson_plan',
      'worksheet',
      'reading',
      'multimedia'
    ].map(value => ({ value, label: this._resourceTypeLabel(value) || value }));

    const ratingOptions = [
      { value: '4_plus', label: '4 stars and up' },
      { value: '3_plus', label: '3 stars and up' }
    ];

    const sortOptions = [
      { value: 'duration_shortest_first', label: 'Duration (Shortest First)' },
      { value: 'rating_highest_first', label: 'Rating (Highest First)' },
      { value: 'popularity', label: 'Popularity' }
    ];

    return { gradeBands, themes, resourceTypes, ratingOptions, sortOptions };
  }

  listEducatorResources(filters, sortBy, page, pageSize) {
    filters = filters || {};
    sortBy = sortBy || 'duration_shortest_first';
    page = page || 1;
    pageSize = pageSize || 20;

    let list = this._getFromStorage('educator_resources');

    if (filters.gradeBand) {
      list = list.filter(r => r.grade_band === filters.gradeBand);
    }
    if (filters.theme) {
      list = list.filter(r => r.theme === filters.theme);
    }
    if (filters.resourceType) {
      list = list.filter(r => r.resource_type === filters.resourceType);
    }
    if (typeof filters.minRating === 'number') {
      list = list.filter(r => (r.average_rating || 0) >= filters.minRating);
    }
    if (typeof filters.maxDurationMinutes === 'number') {
      list = list.filter(r => (r.duration_minutes || 0) <= filters.maxDurationMinutes);
    }
    if (typeof filters.minDurationMinutes === 'number') {
      list = list.filter(r => (r.duration_minutes || 0) >= filters.minDurationMinutes);
    }

    if (sortBy === 'duration_shortest_first') {
      list.sort((a, b) => (a.duration_minutes || 0) - (b.duration_minutes || 0));
    } else if (sortBy === 'rating_highest_first') {
      list.sort((a, b) => (b.average_rating || 0) - (a.average_rating || 0));
    } else if (sortBy === 'popularity') {
      list.sort((a, b) => (b.rating_count || 0) - (a.rating_count || 0));
    }

    const totalResults = list.length;
    const start = (page - 1) * pageSize;
    const pageItems = list.slice(start, start + pageSize);

    return {
      resources: pageItems,
      totalResults,
      page,
      pageSize
    };
  }

  getEducatorResourceDetail(educatorResourceId) {
    const resources = this._getFromStorage('educator_resources');
    const resource = resources.find(r => r.id === educatorResourceId) || null;
    return {
      resource,
      gradeBandLabel: resource ? this._gradeBandLabel(resource.grade_band) : null,
      themeLabel: resource ? resource.theme || null : null,
      resourceTypeLabel: resource ? this._resourceTypeLabel(resource.resource_type) : null,
      durationDisplay: resource && resource.duration_minutes ? resource.duration_minutes + ' minutes' : null,
      averageRating: resource ? resource.average_rating || null : null
    };
  }

  addResourceToLessonPlan(educatorResourceId, plannedDurationMinutes, lessonPlanId, newLessonPlanName) {
    const plan = this._getOrCreateLessonPlan(lessonPlanId, newLessonPlanName);
    const items = this._getFromStorage('lesson_plan_items');

    const orderIndex = items.filter(i => i.lesson_plan_id === plan.id).length;

    const item = {
      id: this._generateId('lesson_plan_item'),
      lesson_plan_id: plan.id,
      educator_resource_id: educatorResourceId,
      planned_duration_minutes: Number(plannedDurationMinutes) || 0,
      order_index: orderIndex,
      added_at: this._now()
    };

    items.push(item);
    this._saveToStorage('lesson_plan_items', items);

    const totalPlannedDurationMinutes = this._recalculateLessonPlanDuration(plan.id);
    const plans = this._getFromStorage('lesson_plans');
    const updatedPlan = plans.find(p => p.id === plan.id) || plan;

    return {
      lessonPlan: updatedPlan,
      lessonPlanItem: item,
      totalPlannedDurationMinutes
    };
  }

  getLessonPlanDetail(lessonPlanId) {
    const plans = this._getFromStorage('lesson_plans');
    let plan = null;
    if (lessonPlanId) {
      plan = plans.find(p => p.id === lessonPlanId) || null;
    } else {
      plan = plans[0] || null;
    }
    if (!plan) {
      return {
        lessonPlan: null,
        items: [],
        totalPlannedDurationMinutes: 0
      };
    }

    const items = this._getFromStorage('lesson_plan_items').filter(i => i.lesson_plan_id === plan.id);
    const resources = this._getFromStorage('educator_resources');

    const enrichedItems = items.map(item => ({
      lessonPlanItem: item,
      educatorResource: resources.find(r => r.id === item.educator_resource_id) || null
    }));

    const totalPlannedDurationMinutes = items.reduce((sum, i) => sum + (Number(i.planned_duration_minutes) || 0), 0);

    return {
      lessonPlan: plan,
      items: enrichedItems,
      totalPlannedDurationMinutes
    };
  }

  // -------------------------
  // 6) Timelines & notes (timeline events)
  // -------------------------
  getTimelineFilterOptions() {
    const themes = [
      { value: 'colonial_contact', label: 'Colonial Contact' },
      { value: 'language_revival', label: 'Language Revival' },
      { value: 'resistance_movements', label: 'Resistance Movements' },
      { value: 'environmental_stewardship', label: 'Environmental Stewardship' },
      { value: 'other', label: 'Other' }
    ];

    const regions = ['north_america', 'south_america', 'oceania', 'europe', 'africa', 'asia', 'arctic', 'global'].map(value => ({
      value,
      label: this._regionLabel(value) || value
    }));

    return { themes, regions };
  }

  listTimelines(filters, page, pageSize) {
    filters = filters || {};
    page = page || 1;
    pageSize = pageSize || 20;

    let timelines = this._getFromStorage('timelines');

    if (filters.theme) {
      timelines = timelines.filter(t => t.theme === filters.theme);
    }
    if (filters.region) {
      timelines = timelines.filter(t => t.region === filters.region);
    }

    const totalResults = timelines.length;
    const start = (page - 1) * pageSize;
    const pageItems = timelines.slice(start, start + pageSize);

    return {
      timelines: pageItems,
      totalResults,
      page,
      pageSize
    };
  }

  getTimelineDetail(timelineId) {
    const timelines = this._getFromStorage('timelines');
    const events = this._getFromStorage('timeline_events');
    const timeline = timelines.find(t => t.id === timelineId) || null;
    const timelineEvents = events
      .filter(e => e.timeline_id === timelineId)
      .sort((a, b) => {
        if (typeof a.order_index === 'number' && typeof b.order_index === 'number') {
          return a.order_index - b.order_index;
        }
        return (a.year || 0) - (b.year || 0);
      });

    return {
      timeline,
      events: timelineEvents
    };
  }

  addItemToNotes(targetType, targetId, targetUrl, title, content) {
    const notes = this._getOrCreateNotesContainer();
    const items = this._getFromStorage('note_items');

    const item = {
      id: this._generateId('note_item'),
      notes_id: notes.id,
      title: title || '',
      content: content || '',
      target_type: targetType,
      target_id: targetId || null,
      target_url: targetUrl || null,
      created_at: this._now()
    };

    items.push(item);
    this._saveToStorage('note_items', items);

    return {
      notes,
      noteItem: item
    };
  }

  getNotesDetail() {
    const notesList = this._getFromStorage('notes');
    const notes = notesList[0] || null;
    const items = this._getFromStorage('note_items');

    if (!notes) {
      return { notes: null, items: [] };
    }

    const filteredItems = items.filter(i => i.notes_id === notes.id);

    const timelineEvents = this._getFromStorage('timeline_events');
    const profiles = this._getFromStorage('person_profiles');
    const articles = this._getFromStorage('articles');
    const communities = this._getFromStorage('communities');
    const mediaItems = this._getFromStorage('media_items');
    const events = this._getFromStorage('events');

    const enrichedItems = filteredItems.map(i => {
      let target = null;
      if (i.target_type === 'timeline_event') {
        target = timelineEvents.find(e => e.id === i.target_id) || null;
      } else if (i.target_type === 'profile') {
        target = profiles.find(p => p.id === i.target_id) || null;
      } else if (i.target_type === 'article') {
        target = articles.find(a => a.id === i.target_id) || null;
      } else if (i.target_type === 'community') {
        target = communities.find(c => c.id === i.target_id) || null;
      } else if (i.target_type === 'media_item') {
        target = mediaItems.find(m => m.id === i.target_id) || null;
      } else if (i.target_type === 'event') {
        target = events.find(e => e.id === i.target_id) || null;
      }
      return { ...i, target };
    });

    return {
      notes,
      items: enrichedItems
    };
  }

  // -------------------------
  // 7) Media library & playlists
  // -------------------------
  getMediaFilterOptions() {
    const contentTypes = [
      { value: 'audio', label: 'Audio' },
      { value: 'video', label: 'Video' },
      { value: 'image', label: 'Images' },
      { value: 'document', label: 'Documents' },
      { value: 'other', label: 'Other' }
    ];

    const topics = [
      'oral_histories',
      'music',
      'ceremony',
      'language_lessons',
      'art',
      'governance',
      'other'
    ].map(value => ({ value, label: this._mediaTopicLabel(value) || value }));

    const regions = ['north_america', 'south_america', 'oceania', 'europe', 'africa', 'asia', 'arctic', 'global'].map(value => ({
      value,
      label: this._regionLabel(value) || value
    }));

    const sortOptions = [
      { value: 'length_shortest_first', label: 'Length (Shortest First)' },
      { value: 'date_newest_first', label: 'Date Recorded (Newest First)' },
      { value: 'popularity', label: 'Popularity' }
    ];

    return { contentTypes, topics, regions, sortOptions };
  }

  listMediaItems(filters, sortBy, page, pageSize) {
    filters = filters || {};
    sortBy = sortBy || 'length_shortest_first';
    page = page || 1;
    pageSize = pageSize || 20;

    let list = this._getFromStorage('media_items');

    if (filters.contentType) {
      list = list.filter(m => m.content_type === filters.contentType);
    }
    if (filters.topic) {
      list = list.filter(m => m.topic === filters.topic);
    }
    if (filters.region) {
      list = list.filter(m => m.region === filters.region);
    }
    if (typeof filters.minYearRecorded === 'number') {
      list = list.filter(m => (m.year_recorded || 0) >= filters.minYearRecorded);
    }
    if (typeof filters.maxYearRecorded === 'number') {
      list = list.filter(m => (m.year_recorded || 0) <= filters.maxYearRecorded);
    }

    if (sortBy === 'length_shortest_first') {
      list.sort((a, b) => (a.length_seconds || 0) - (b.length_seconds || 0));
    } else if (sortBy === 'date_newest_first') {
      list.sort((a, b) => {
        const ay = a.year_recorded || (a.date_recorded ? new Date(a.date_recorded).getFullYear() : 0);
        const by = b.year_recorded || (b.date_recorded ? new Date(b.date_recorded).getFullYear() : 0);
        return by - ay;
      });
    } else if (sortBy === 'popularity') {
      list.sort((a, b) => (b.popularity_score || 0) - (a.popularity_score || 0));
    }

    const totalResults = list.length;
    const start = (page - 1) * pageSize;
    const pageItems = list.slice(start, start + pageSize);

    return {
      mediaItems: pageItems,
      totalResults,
      page,
      pageSize
    };
  }

  getMediaItemDetail(mediaItemId) {
    const mediaItems = this._getFromStorage('media_items');
    const mediaItem = mediaItems.find(m => m.id === mediaItemId) || null;
    const playlistItems = this._getFromStorage('playlist_items');
    const isInAnyPlaylist = !!playlistItems.find(pi => pi.media_item_id === mediaItemId);

    let lengthDisplay = null;
    if (mediaItem && typeof mediaItem.length_seconds === 'number') {
      const total = mediaItem.length_seconds;
      const minutes = Math.floor(total / 60);
      const seconds = total % 60;
      lengthDisplay = minutes + ':' + String(seconds).padStart(2, '0');
    }

    return {
      mediaItem,
      regionLabel: mediaItem ? this._regionLabel(mediaItem.region) : null,
      topicLabel: mediaItem ? this._mediaTopicLabel(mediaItem.topic) : null,
      lengthDisplay,
      isInAnyPlaylist
    };
  }

  getPlaylists() {
    return this._getFromStorage('playlists');
  }

  addMediaItemToPlaylist(mediaItemId, playlistId, newPlaylistName) {
    let playlist = null;
    const playlists = this._getFromStorage('playlists');

    if (playlistId) {
      playlist = playlists.find(p => p.id === playlistId) || null;
    }

    if (!playlist) {
      const name = newPlaylistName || 'Default Playlist';
      playlist = this._getOrCreatePlaylistByName(name);
    }

    const playlistItems = this._getFromStorage('playlist_items');
    const orderIndex = playlistItems.filter(i => i.playlist_id === playlist.id).length;

    const playlistItem = {
      id: this._generateId('playlist_item'),
      playlist_id: playlist.id,
      media_item_id: mediaItemId,
      order_index: orderIndex,
      added_at: this._now()
    };

    playlistItems.push(playlistItem);
    this._saveToStorage('playlist_items', playlistItems);

    return {
      playlist,
      playlistItem
    };
  }

  getPlaylistDetail(playlistId) {
    const playlists = this._getFromStorage('playlists');
    const playlist = playlists.find(p => p.id === playlistId) || null;
    if (!playlist) {
      return {
        playlist: null,
        items: []
      };
    }

    const playlistItems = this._getFromStorage('playlist_items').filter(i => i.playlist_id === playlist.id);
    const mediaItems = this._getFromStorage('media_items');

    const items = playlistItems
      .sort((a, b) => (a.order_index || 0) - (b.order_index || 0))
      .map(playlistItem => ({
        playlistItem,
        mediaItem: mediaItems.find(m => m.id === playlistItem.media_item_id) || null
      }));

    return {
      playlist,
      items
    };
  }

  // -------------------------
  // 8) Glossary & study sets
  // -------------------------
  searchGlossaryTerms(query) {
    query = (query || '').trim().toLowerCase();
    const terms = this._getFromStorage('glossary_terms');
    if (!query) return terms;
    return terms.filter(t => {
      const text = [t.term, t.definition, t.usage_notes].join(' ').toLowerCase();
      return text.includes(query);
    });
  }

  getGlossaryBrowseOptions() {
    const terms = this._getFromStorage('glossary_terms');

    const categoryCounts = {};
    const letterCounts = {};

    for (const t of terms) {
      if (t.category) {
        categoryCounts[t.category] = (categoryCounts[t.category] || 0) + 1;
      }
      if (t.term && t.term.length > 0) {
        const letter = t.term[0].toUpperCase();
        letterCounts[letter] = (letterCounts[letter] || 0) + 1;
      }
    }

    const categories = Object.keys(categoryCounts).map(category => ({
      category,
      label: category,
      count: categoryCounts[category]
    }));

    const letters = Object.keys(letterCounts).sort().map(letter => ({
      letter,
      count: letterCounts[letter]
    }));

    return { categories, letters };
  }

  getGlossaryTermDetail(glossaryTermId) {
    const terms = this._getFromStorage('glossary_terms');
    const term = terms.find(t => t.id === glossaryTermId) || null;

    let relatedTerms = [];
    if (term && Array.isArray(term.related_terms)) {
      relatedTerms = term.related_terms
        .map(ref => terms.find(t => t.id === ref || t.term === ref))
        .filter(Boolean);
    }

    return {
      term,
      relatedTerms
    };
  }

  getStudySets() {
    return this._getFromStorage('study_sets');
  }

  addGlossaryTermToStudySet(glossaryTermId, studySetId, newStudySetName) {
    let studySet = null;
    const sets = this._getFromStorage('study_sets');

    if (studySetId) {
      studySet = sets.find(s => s.id === studySetId) || null;
    }

    if (!studySet) {
      const name = newStudySetName || 'Default Study Set';
      studySet = this._getOrCreateStudySetByName(name);
    }

    const items = this._getFromStorage('study_set_items');

    let existing = items.find(i => i.study_set_id === studySet.id && i.glossary_term_id === glossaryTermId);
    if (existing) {
      return {
        studySet,
        studySetItem: existing
      };
    }

    const item = {
      id: this._generateId('study_set_item'),
      study_set_id: studySet.id,
      glossary_term_id: glossaryTermId,
      added_at: this._now()
    };

    items.push(item);
    this._saveToStorage('study_set_items', items);

    return {
      studySet,
      studySetItem: item
    };
  }

  getStudySetDetail(studySetId) {
    const sets = this._getFromStorage('study_sets');
    const set = sets.find(s => s.id === studySetId) || null;
    if (!set) {
      return {
        studySet: null,
        items: []
      };
    }

    const items = this._getFromStorage('study_set_items').filter(i => i.study_set_id === set.id);
    const terms = this._getFromStorage('glossary_terms');

    const enriched = items.map(studySetItem => ({
      studySetItem,
      glossaryTerm: terms.find(t => t.id === studySetItem.glossary_term_id) || null
    }));

    return {
      studySet: set,
      items: enriched
    };
  }

  // -------------------------
  // 9) Events & My Events
  // -------------------------
  getEventFilterOptions() {
    const categories = [
      'art_culture',
      'language',
      'governance',
      'education',
      'history',
      'community',
      'festival',
      'workshop',
      'other'
    ].map(value => ({ value, label: this._eventCategoryLabel(value) || value }));

    const eventTypes = [
      'virtual_online',
      'in_person',
      'hybrid'
    ].map(value => ({ value, label: this._eventTypeLabel(value) || value }));

    const regions = ['north_america', 'south_america', 'oceania', 'europe', 'africa', 'asia', 'arctic', 'global'].map(value => ({
      value,
      label: this._regionLabel(value) || value
    }));

    const daysOfWeek = [
      { value: 'monday', label: 'Monday' },
      { value: 'tuesday', label: 'Tuesday' },
      { value: 'wednesday', label: 'Wednesday' },
      { value: 'thursday', label: 'Thursday' },
      { value: 'friday', label: 'Friday' },
      { value: 'saturday', label: 'Saturday' },
      { value: 'sunday', label: 'Sunday' }
    ];

    return { categories, eventTypes, regions, daysOfWeek };
  }

  listEvents(filters, page, pageSize) {
    filters = filters || {};
    page = page || 1;
    pageSize = pageSize || 50;

    let list = this._getFromStorage('events');

    if (filters.category) {
      list = list.filter(e => e.category === filters.category);
    }
    if (filters.eventType) {
      list = list.filter(e => e.event_type === filters.eventType);
    }
    if (filters.region) {
      list = list.filter(e => e.region === filters.region);
    }

    if (filters.startDate || filters.endDate) {
      const startTime = filters.startDate ? new Date(filters.startDate).getTime() : null;
      const endTime = filters.endDate ? new Date(filters.endDate).getTime() : null;
      list = list.filter(e => {
        if (!e.start_datetime) return false;
        const t = new Date(e.start_datetime).getTime();
        if (startTime !== null && t < startTime) return false;
        if (endTime !== null && t > endTime) return false;
        return true;
      });
    }

    if (Array.isArray(filters.daysOfWeek) && filters.daysOfWeek.length) {
      const allowed = new Set(filters.daysOfWeek);
      list = list.filter(e => {
        if (!e.start_datetime) return false;
        const d = new Date(e.start_datetime);
        const day = d.getUTCDay(); // 0-6
        const map = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const val = map[day];
        return allowed.has(val);
      });
    }

    const totalResults = list.length;
    const start = (page - 1) * pageSize;
    const pageItems = list.slice(start, start + pageSize);

    return {
      events: pageItems,
      totalResults,
      page,
      pageSize
    };
  }

  getEventDetail(eventId) {
    const events = this._getFromStorage('events');
    const event = events.find(e => e.id === eventId) || null;
    const myEventsContainer = this._getFromStorage('my_events')[0] || null;
    const myEventItems = this._getFromStorage('my_event_items');
    const isInMyEvents = !!(myEventsContainer && myEventItems.find(i => i.my_events_id === myEventsContainer.id && i.event_id === eventId));

    let dateDisplay = null;
    let timeDisplay = null;
    if (event && event.start_datetime) {
      const d = new Date(event.start_datetime);
      dateDisplay = d.toISOString().slice(0, 10);
      timeDisplay = d.toISOString().slice(11, 16) + ' ' + (event.timezone || 'UTC');
    }

    return {
      event,
      categoryLabel: event ? this._eventCategoryLabel(event.category) : null,
      eventTypeLabel: event ? this._eventTypeLabel(event.event_type) : null,
      dateDisplay,
      timeDisplay,
      isInMyEvents
    };
  }

  saveEventToMyEvents(eventId) {
    const myEvents = this._getOrCreateMyEventsContainer();
    const items = this._getFromStorage('my_event_items');

    let existing = items.find(i => i.my_events_id === myEvents.id && i.event_id === eventId);
    if (existing) {
      return {
        myEvents,
        myEventItem: existing
      };
    }

    const myEventItem = {
      id: this._generateId('my_event_item'),
      my_events_id: myEvents.id,
      event_id: eventId,
      added_at: this._now()
    };

    items.push(myEventItem);
    this._saveToStorage('my_event_items', items);

    return {
      myEvents,
      myEventItem
    };
  }

  getMyEventsDetail() {
    const containers = this._getFromStorage('my_events');
    const myEvents = containers[0] || null;
    if (!myEvents) {
      return { myEvents: null, items: [] };
    }

    const items = this._getFromStorage('my_event_items').filter(i => i.my_events_id === myEvents.id);
    const events = this._getFromStorage('events');

    const enriched = items.map(myEventItem => ({
      myEventItem,
      event: events.find(e => e.id === myEventItem.event_id) || null
    }));

    return {
      myEvents,
      items: enriched
    };
  }

  // -------------------------
  // 10) Quizzes
  // -------------------------
  getQuizFilterOptions() {
    const topics = [
      { value: 'indigenous_governance', label: 'Indigenous Governance' },
      { value: 'language_revival', label: 'Language Revival' },
      { value: 'traditional_ecological_knowledge', label: 'Traditional Ecological Knowledge' },
      { value: 'indigenous_art', label: 'Indigenous Art' },
      { value: 'colonial_history', label: 'Colonial History' },
      { value: 'other', label: 'Other' }
    ];

    const difficulties = [
      { value: 'beginner', label: 'Beginner' },
      { value: 'intermediate', label: 'Intermediate' },
      { value: 'advanced', label: 'Advanced' }
    ];

    return { topics, difficulties };
  }

  listQuizzes(filters, page, pageSize) {
    filters = filters || {};
    page = page || 1;
    pageSize = pageSize || 20;

    let quizzes = this._getFromStorage('quizzes');

    if (filters.topic) {
      quizzes = quizzes.filter(q => q.topic === filters.topic);
    }
    if (filters.difficulty) {
      quizzes = quizzes.filter(q => q.difficulty === filters.difficulty);
    }

    const totalResults = quizzes.length;
    const start = (page - 1) * pageSize;
    const pageItems = quizzes.slice(start, start + pageSize);

    return {
      quizzes: pageItems,
      totalResults,
      page,
      pageSize
    };
  }

  getQuizDetail(quizId) {
    const quizzes = this._getFromStorage('quizzes');
    const quiz = quizzes.find(q => q.id === quizId) || null;
    let estimatedDurationDisplay = null;
    if (quiz && quiz.estimated_duration_minutes) {
      estimatedDurationDisplay = '~' + quiz.estimated_duration_minutes + ' minutes';
    }
    return {
      quiz,
      estimatedDurationDisplay
    };
  }

  startQuizAttempt(quizId) {
    const quizzes = this._getFromStorage('quizzes');
    const quiz = quizzes.find(q => q.id === quizId) || null;
    if (!quiz) {
      return {
        quizAttempt: null,
        question: null,
        questionIndex: 0,
        totalQuestions: 0
      };
    }

    const allQuestions = this._getFromStorage('quiz_questions').filter(q => q.quiz_id === quizId);
    allQuestions.sort((a, b) => {
      if (typeof a.order_index === 'number' && typeof b.order_index === 'number') {
        return a.order_index - b.order_index;
      }
      return 0;
    });

    const quizAttempts = this._getFromStorage('quiz_attempts');
    const attempt = {
      id: this._generateId('quiz_attempt'),
      quiz_id: quizId,
      score: null,
      total_questions: allQuestions.length,
      correct_answers: 0,
      started_at: this._now(),
      completed_at: null
    };

    quizAttempts.push(attempt);
    this._saveToStorage('quiz_attempts', quizAttempts);

    const firstQuestion = allQuestions[0] || null;

    return {
      quizAttempt: attempt,
      question: firstQuestion,
      questionIndex: firstQuestion ? 1 : 0,
      totalQuestions: allQuestions.length
    };
  }

  submitQuizAnswer(quizAttemptId, quizQuestionId, selectedOptionIndex) {
    const quizAttempts = this._getFromStorage('quiz_attempts');
    const attempt = quizAttempts.find(a => a.id === quizAttemptId) || null;
    if (!attempt) {
      return {
        quizAttempt: null,
        isCompleted: true,
        nextQuestion: null,
        nextQuestionIndex: 0,
        totalQuestions: 0
      };
    }

    const questions = this._getFromStorage('quiz_questions').filter(q => q.quiz_id === attempt.quiz_id);
    questions.sort((a, b) => {
      if (typeof a.order_index === 'number' && typeof b.order_index === 'number') {
        return a.order_index - b.order_index;
      }
      return 0;
    });

    const quizAnswers = this._getFromStorage('quiz_answers');

    let existing = quizAnswers.find(a => a.quiz_attempt_id === quizAttemptId && a.quiz_question_id === quizQuestionId);
    const question = questions.find(q => q.id === quizQuestionId) || null;
    const isCorrect = question ? (selectedOptionIndex === question.correct_option_index) : false;

    if (existing) {
      existing.selected_option_index = selectedOptionIndex;
      existing.is_correct = isCorrect;
    } else {
      const answer = {
        id: this._generateId('quiz_answer'),
        quiz_attempt_id: quizAttemptId,
        quiz_question_id: quizQuestionId,
        selected_option_index: selectedOptionIndex,
        is_correct: isCorrect
      };
      quizAnswers.push(answer);
    }

    this._saveToStorage('quiz_answers', quizAnswers);

    // Recalculate correctness and completion
    const answersForAttempt = quizAnswers.filter(a => a.quiz_attempt_id === quizAttemptId);
    const totalQuestions = questions.length;
    const answeredQuestionIds = new Set(answersForAttempt.map(a => a.quiz_question_id));

    const correctAnswers = answersForAttempt.filter(a => a.is_correct).length;
    attempt.correct_answers = correctAnswers;

    let isCompleted = false;
    let nextQuestion = null;
    let nextQuestionIndex = 0;

    if (answeredQuestionIds.size >= totalQuestions) {
      isCompleted = true;
      attempt.completed_at = this._now();
      attempt.total_questions = totalQuestions;
      attempt.score = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;
    } else {
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        if (!answeredQuestionIds.has(q.id)) {
          nextQuestion = q;
          nextQuestionIndex = i + 1;
          break;
        }
      }
    }

    this._saveToStorage('quiz_attempts', quizAttempts);

    return {
      quizAttempt: attempt,
      isCompleted,
      nextQuestion,
      nextQuestionIndex,
      totalQuestions
    };
  }

  getQuizResults(quizAttemptId) {
    const quizAttempts = this._getFromStorage('quiz_attempts');
    const attempt = quizAttempts.find(a => a.id === quizAttemptId) || null;
    if (!attempt) {
      return {
        quizAttempt: null,
        scorePercentage: 0,
        recommendedReadings: []
      };
    }

    const quizzes = this._getFromStorage('quizzes');
    const quiz = quizzes.find(q => q.id === attempt.quiz_id) || null;

    const recs = this._getFromStorage('quiz_recommended_readings').filter(r => r.quiz_id === attempt.quiz_id);
    recs.sort((a, b) => (a.order_index || 0) - (b.order_index || 0));

    const articles = this._getFromStorage('articles');
    let articlesChanged = false;
    const recommendedReadings = recs.map(quizRecommendedReading => {
      let article = articles.find(a => a.id === quizRecommendedReading.article_id) || null;
      if (!article) {
        // Create a minimal placeholder article so that recommended readings
        // always have a backing article object that can be viewed and saved.
        const now = this._now();
        article = {
          id: quizRecommendedReading.article_id,
          title: (quiz && quiz.title ? quiz.title + ' - Recommended Reading' : 'Recommended Reading'),
          summary: quiz && quiz.description ? quiz.description : 'Recommended article related to this quiz.',
          region: 'global',
          topics: [quiz && quiz.topic ? quiz.topic.replace(/_/g, ' ') : 'indigenous governance'],
          reading_level: quiz && quiz.difficulty ? quiz.difficulty : 'beginner',
          estimated_reading_time_minutes: quiz && quiz.estimated_duration_minutes ? quiz.estimated_duration_minutes : null,
          popularity_score: 0,
          published_at: now,
          thumbnail_image: null,
          author_names: []
        };
        articles.push(article);
        articlesChanged = true;
      }
      return {
        quizRecommendedReading,
        article
      };
    });
    if (articlesChanged) {
      this._saveToStorage('articles', articles);
    }

    let scorePercentage = attempt.score;
    if (scorePercentage == null && attempt.total_questions) {
      scorePercentage = Math.round((attempt.correct_answers / attempt.total_questions) * 100);
    }

    return {
      quizAttempt: { ...attempt, quiz },
      scorePercentage: scorePercentage || 0,
      recommendedReadings
    };
  }

  // -------------------------
  // 11) Person / artist profiles
  // -------------------------
  getPersonProfileDetail(personProfileId) {
    const profiles = this._getFromStorage('person_profiles');
    const profile = profiles.find(p => p.id === personProfileId) || null;
    return {
      profile,
      regionLabel: profile ? this._regionLabel(profile.region) : null,
      disciplineLabels: profile && Array.isArray(profile.disciplines) ? profile.disciplines.slice() : []
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