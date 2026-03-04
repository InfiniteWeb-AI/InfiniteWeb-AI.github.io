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

  _initStorage() {
    const ensure = (key, defaultVal) => {
      if (localStorage.getItem(key) === null) {
        localStorage.setItem(key, JSON.stringify(defaultVal));
      }
    };

    // Core entity tables
    ensure('resources', []);
    ensure('videos', []);
    ensure('blog_posts', []);
    ensure('comments', []);
    ensure('topics', []);
    ensure('collections', []);
    ensure('collection_items', []);
    ensure('saved_list_items', []);
    ensure('study_plans', []);
    ensure('study_plan_days', []);
    ensure('study_plan_day_items', []);
    ensure('questions', []);
    ensure('quizzes', []);
    ensure('tags', []);

    // Single notification settings object (or null)
    if (localStorage.getItem('notification_settings') === null) {
      localStorage.setItem('notification_settings', JSON.stringify(null));
    }

    // CMS / config
    ensure('static_pages', {});
    ensure('contact_config', {
      supportEmail: '',
      socialLinks: [],
      expectedResponseTimeText: ''
    });

    // Internal contact messages log
    ensure('contact_messages', []);

    if (localStorage.getItem('idCounter') === null) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, defaultValue = []) {
    const data = localStorage.getItem(key);
    if (data === null || data === undefined) {
      return defaultValue;
    }
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
    let current = parseInt(localStorage.getItem('idCounter') || '1000', 10);
    if (Number.isNaN(current)) current = 1000;
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

  // ---------- Helper: Saved lists ----------

  _getOrCreateSavedList(listType) {
    const all = this._getFromStorage('saved_list_items', []);
    return all.filter(item => item.listType === listType);
  }

  // ---------- Helper: Foreign key resolution ----------

  _resolveResource(resource) {
    if (!resource) return null;
    const topics = this._getFromStorage('topics', []);
    const topic = topics.find(t => t.id === resource.topicId) || null;
    return { ...resource, topic };
  }

  _resolveVideo(video) {
    if (!video) return null;
    const topics = this._getFromStorage('topics', []);
    const topic = topics.find(t => t.id === video.topicId) || null;
    return { ...video, topic };
  }

  _resolveComment(comment) {
    if (!comment) return null;
    const posts = this._getFromStorage('blog_posts', []);
    const allComments = this._getFromStorage('comments', []);
    const blogPost = posts.find(p => p.id === comment.blogPostId) || null;
    const parentComment = comment.parentCommentId
      ? allComments.find(c => c.id === comment.parentCommentId) || null
      : null;
    return { ...comment, blogPost, parentComment };
  }

  _resolveStudyPlanDay(day) {
    if (!day) return null;
    const plans = this._getFromStorage('study_plans', []);
    const studyPlan = plans.find(sp => sp.id === day.studyPlanId) || null;
    return { ...day, studyPlan };
  }

  _resolvePolymorphicContent(contentType, contentId) {
    if (!contentType || !contentId) return null;
    switch (contentType) {
      case 'resource': {
        const resources = this._getFromStorage('resources', []);
        return resources.find(r => r.id === contentId) || null;
      }
      case 'video': {
        const videos = this._getFromStorage('videos', []);
        return videos.find(v => v.id === contentId) || null;
      }
      case 'blog_post': {
        const posts = this._getFromStorage('blog_posts', []);
        return posts.find(p => p.id === contentId) || null;
      }
      case 'quiz': {
        const quizzes = this._getFromStorage('quizzes', []);
        return quizzes.find(q => q.id === contentId) || null;
      }
      case 'study_plan': {
        const plans = this._getFromStorage('study_plans', []);
        return plans.find(sp => sp.id === contentId) || null;
      }
      case 'collection': {
        const collections = this._getFromStorage('collections', []);
        return collections.find(c => c.id === contentId) || null;
      }
      default:
        return null;
    }
  }

  _resolveStudyPlanDayItem(item) {
    if (!item) return null;
    const plans = this._getFromStorage('study_plans', []);
    const studyPlan = plans.find(sp => sp.id === item.studyPlanId) || null;
    const content = this._resolvePolymorphicContent(item.contentType, item.contentId);
    return { ...item, studyPlan, content };
  }

  _resolveCollectionItemContent(collectionItem) {
    const collections = this._getFromStorage('collections', []);
    const collection = collections.find(c => c.id === collectionItem.collectionId) || null;
    const content = this._resolvePolymorphicContent(collectionItem.contentType, collectionItem.contentId);

    let title = '';
    let descriptionSnippet = '';
    const contentType = collectionItem.contentType;

    if (content) {
      if (contentType === 'resource' || contentType === 'video' || contentType === 'quiz' || contentType === 'study_plan' || contentType === 'collection') {
        title = content.title || '';
        const desc = content.description || content.excerpt || '';
        descriptionSnippet = typeof desc === 'string' ? desc.slice(0, 200) : '';
      } else if (contentType === 'blog_post') {
        title = content.title || '';
        const desc = content.excerpt || content.body || '';
        descriptionSnippet = typeof desc === 'string' ? desc.slice(0, 200) : '';
      }
    }

    return {
      collectionItem: { ...collectionItem, collection, content },
      title,
      descriptionSnippet,
      contentType,
      content
    };
  }

  // ---------- Helper: Resource filtering & sorting ----------

  _applyResourceFiltersAndSorting(resources, filters = {}, sortBy = 'most_popular', sortDirection = 'desc') {
    let items = Array.isArray(resources) ? [...resources] : [];

    const {
      primaryGradeLevel,
      gradeLevels,
      subject,
      subtopic,
      resourceTypes,
      resourceCategory,
      resourceSubcategory,
      difficulty,
      pacing,
      level,
      minRating,
      tags,
      textQuery
    } = filters || {};

    const hasGradeFilter = !!primaryGradeLevel || (Array.isArray(gradeLevels) && gradeLevels.length > 0);

    if (hasGradeFilter) {
      const gradeSet = new Set();
      if (primaryGradeLevel) gradeSet.add(primaryGradeLevel);
      if (Array.isArray(gradeLevels)) gradeLevels.forEach(g => gradeSet.add(g));

      items = items.filter(r => {
        const rGrades = new Set();
        if (r.primaryGradeLevel) rGrades.add(r.primaryGradeLevel);
        if (Array.isArray(r.gradeLevels)) r.gradeLevels.forEach(g => rGrades.add(g));
        for (const g of gradeSet) {
          if (rGrades.has(g)) return true;
        }
        return false;
      });
    }

    if (subject) {
      items = items.filter(r => r.subject === subject);
    }

    if (subtopic) {
      items = items.filter(r => r.subtopic === subtopic);
    }

    if (Array.isArray(resourceTypes) && resourceTypes.length > 0) {
      const typeSet = new Set(resourceTypes);
      items = items.filter(r => typeSet.has(r.resourceType));
    }

    if (resourceCategory) {
      items = items.filter(r => r.resourceCategory === resourceCategory);
    }

    if (resourceSubcategory) {
      items = items.filter(r => r.resourceSubcategory === resourceSubcategory);
    }

    if (difficulty) {
      items = items.filter(r => r.difficulty === difficulty);
    }

    if (Array.isArray(pacing) && pacing.length > 0) {
      const pSet = new Set(pacing);
      items = items.filter(r => r.pacing && pSet.has(r.pacing));
    }

    if (level) {
      items = items.filter(r => r.level === level);
    }

    if (typeof minRating === 'number') {
      items = items.filter(r => typeof r.rating === 'number' && r.rating >= minRating);
    }

    if (Array.isArray(tags) && tags.length > 0) {
      const tagSet = new Set(tags);
      items = items.filter(r => {
        if (!Array.isArray(r.tags) || r.tags.length === 0) return false;
        const rTagSet = new Set(r.tags);
        for (const t of tagSet) {
          if (!rTagSet.has(t)) return false; // require all tags
        }
        return true;
      });
    }

    if (textQuery && typeof textQuery === 'string' && textQuery.trim()) {
      const q = textQuery.toLowerCase();
      items = items.filter(r => {
        const title = (r.title || '').toLowerCase();
        const desc = (r.description || '').toLowerCase();
        return title.includes(q) || desc.includes(q);
      });
    }

    // Sorting
    const dir = sortDirection === 'asc' ? 1 : -1;
    const difficultyRank = {
      very_easy: 1,
      easy: 2,
      medium: 3,
      hard: 4,
      very_hard: 5
    };

    items.sort((a, b) => {
      if (sortBy === 'newest') {
        const aT = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bT = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        if (aT === bT) return 0;
        return aT < bT ? dir : -dir;
      }
      if (sortBy === 'difficulty') {
        const aD = difficultyRank[a.difficulty] || 0;
        const bD = difficultyRank[b.difficulty] || 0;
        if (aD === bD) return 0;
        return aD < bD ? dir : -dir;
      }
      if (sortBy === 'rating') {
        const aR = typeof a.rating === 'number' ? a.rating : 0;
        const bR = typeof b.rating === 'number' ? b.rating : 0;
        if (aR === bR) return 0;
        return aR < bR ? dir : -dir;
      }
      // default: most_popular
      const aP = typeof a.popularityScore === 'number' ? a.popularityScore : 0;
      const bP = typeof b.popularityScore === 'number' ? b.popularityScore : 0;
      if (aP === bP) return 0;
      return aP < bP ? dir : -dir;
    });

    return items;
  }

  // ---------- Helper: Video filtering & sorting ----------

  _applyVideoFiltersAndSorting(videos, filters = {}, sortBy = 'duration', sortDirection = 'asc') {
    let items = Array.isArray(videos) ? [...videos] : [];

    const {
      primaryGradeLevel,
      gradeLevels,
      subject,
      subtopic,
      minDurationSeconds,
      maxDurationSeconds,
      minRating,
      tags,
      textQuery
    } = filters || {};

    const hasGradeFilter = !!primaryGradeLevel || (Array.isArray(gradeLevels) && gradeLevels.length > 0);

    if (hasGradeFilter) {
      const gradeSet = new Set();
      if (primaryGradeLevel) gradeSet.add(primaryGradeLevel);
      if (Array.isArray(gradeLevels)) gradeLevels.forEach(g => gradeSet.add(g));

      items = items.filter(v => {
        const vGrades = new Set();
        if (v.primaryGradeLevel) vGrades.add(v.primaryGradeLevel);
        if (Array.isArray(v.gradeLevels)) v.gradeLevels.forEach(g => vGrades.add(g));
        for (const g of gradeSet) {
          if (vGrades.has(g)) return true;
        }
        return false;
      });
    }

    if (subject) {
      items = items.filter(v => v.subject === subject);
    }

    if (subtopic) {
      items = items.filter(v => v.subtopic === subtopic);
    }

    if (typeof minDurationSeconds === 'number') {
      items = items.filter(v => typeof v.durationSeconds === 'number' && v.durationSeconds >= minDurationSeconds);
    }

    if (typeof maxDurationSeconds === 'number') {
      items = items.filter(v => typeof v.durationSeconds === 'number' && v.durationSeconds <= maxDurationSeconds);
    }

    if (typeof minRating === 'number') {
      items = items.filter(v => typeof v.rating === 'number' && v.rating >= minRating);
    }

    if (Array.isArray(tags) && tags.length > 0) {
      const tagSet = new Set(tags);
      items = items.filter(v => {
        if (!Array.isArray(v.tags) || v.tags.length === 0) return false;
        const vTagSet = new Set(v.tags);
        for (const t of tagSet) {
          if (!vTagSet.has(t)) return false;
        }
        return true;
      });
    }

    if (textQuery && typeof textQuery === 'string' && textQuery.trim()) {
      const q = textQuery.toLowerCase();
      items = items.filter(v => {
        const title = (v.title || '').toLowerCase();
        const desc = (v.description || '').toLowerCase();
        return title.includes(q) || desc.includes(q);
      });
    }

    const dir = sortDirection === 'desc' ? -1 : 1;

    items.sort((a, b) => {
      if (sortBy === 'popularity') {
        const aP = typeof a.popularityScore === 'number' ? a.popularityScore : 0;
        const bP = typeof b.popularityScore === 'number' ? b.popularityScore : 0;
        if (aP === bP) return 0;
        return aP < bP ? dir : -dir;
      }
      if (sortBy === 'rating') {
        const aR = typeof a.rating === 'number' ? a.rating : 0;
        const bR = typeof b.rating === 'number' ? b.rating : 0;
        if (aR === bR) return 0;
        return aR < bR ? dir : -dir;
      }
      // default: duration
      const aD = typeof a.durationSeconds === 'number' ? a.durationSeconds : 0;
      const bD = typeof b.durationSeconds === 'number' ? b.durationSeconds : 0;
      if (aD === bD) return 0;
      return aD < bD ? dir : -dir;
    });

    return items;
  }

  // ---------- Helper: Question filtering ----------

  _applyQuestionFilters(questions, filters = {}) {
    let items = Array.isArray(questions) ? [...questions] : [];
    const { topic, subtopic, difficulty, isWordProblem, tags, textQuery } = filters;

    if (topic) {
      items = items.filter(q => q.topic === topic);
    }

    if (subtopic) {
      items = items.filter(q => q.subtopic === subtopic);
    }

    if (difficulty) {
      items = items.filter(q => q.difficulty === difficulty);
    }

    if (typeof isWordProblem === 'boolean') {
      items = items.filter(q => q.isWordProblem === isWordProblem);
    }

    if (Array.isArray(tags) && tags.length > 0) {
      const tagSet = new Set(tags);
      items = items.filter(q => {
        if (!Array.isArray(q.tags) || q.tags.length === 0) return false;
        const qTagSet = new Set(q.tags);
        for (const t of tagSet) {
          if (!qTagSet.has(t)) return false;
        }
        return true;
      });
    }

    if (textQuery && typeof textQuery === 'string' && textQuery.trim()) {
      const qStr = textQuery.toLowerCase();
      items = items.filter(q => (q.prompt || '').toLowerCase().includes(qStr));
    }

    return items;
  }

  // ---------- Helper: Study plan days initialization ----------

  _initializeStudyPlanDays(studyPlan) {
    const studyPlanDays = this._getFromStorage('study_plan_days', []);
    const newDays = [];

    let startDateObj = null;
    if (studyPlan.startDate) {
      const d = new Date(studyPlan.startDate);
      if (!Number.isNaN(d.getTime())) startDateObj = d;
    }

    for (let i = 1; i <= studyPlan.totalDays; i++) {
      let dateIso = null;
      if (startDateObj) {
        const d = new Date(startDateObj.getTime());
        d.setDate(d.getDate() + (i - 1));
        dateIso = d.toISOString();
      }
      const day = {
        id: this._generateId('study_plan_day'),
        studyPlanId: studyPlan.id,
        dayIndex: i,
        date: dateIso,
        notes: '',
        createdAt: this._now(),
        updatedAt: null
      };
      studyPlanDays.push(day);
      newDays.push(day);
    }

    this._saveToStorage('study_plan_days', studyPlanDays);
    return newDays;
  }

  // ---------- Helper: Static pages CMS loader ----------

  _loadStaticPageFromCMS(slug) {
    const pages = this._getFromStorage('static_pages', {});
    if (pages && Object.prototype.hasOwnProperty.call(pages, slug)) {
      return pages[slug];
    }
    return { title: '', body: '' };
  }

  // ==========================================================
  // Interface implementations
  // ==========================================================

  // getHomePageSummary()
  getHomePageSummary() {
    const resources = this._getFromStorage('resources', []);
    const blogPosts = this._getFromStorage('blog_posts', []);
    const topics = this._getFromStorage('topics', []);

    const featuredResources = [...resources]
      .sort((a, b) => {
        const aP = typeof a.popularityScore === 'number' ? a.popularityScore : 0;
        const bP = typeof b.popularityScore === 'number' ? b.popularityScore : 0;
        return bP - aP;
      })
      .slice(0, 5)
      .map(r => this._resolveResource(r));

    const popularBlogPosts = [...blogPosts]
      .sort((a, b) => {
        const aC = typeof a.commentCount === 'number' ? a.commentCount : 0;
        const bC = typeof b.commentCount === 'number' ? b.commentCount : 0;
        return bC - aC;
      })
      .slice(0, 5);

    const keyTopics = [...topics].slice(0, 10);

    return { featuredResources, popularBlogPosts, keyTopics };
  }

  // searchAllContent(query, filters)
  searchAllContent(query, filters = {}) {
    const q = (query || '').toLowerCase();
    const {
      contentTypes,
      gradeLevels,
      subjects,
      tags,
      sortBy
      // page, pageSize are ignored for simplicity; callers can paginate client-side
    } = filters || {};

    const typeSet = Array.isArray(contentTypes) && contentTypes.length > 0 ? new Set(contentTypes) : null;
    const gradeSet = Array.isArray(gradeLevels) && gradeLevels.length > 0 ? new Set(gradeLevels) : null;
    const subjectSet = Array.isArray(subjects) && subjects.length > 0 ? new Set(subjects) : null;
    const tagSet = Array.isArray(tags) && tags.length > 0 ? new Set(tags) : null;

    const matchesText = (text) => {
      if (!q) return true;
      return (text || '').toLowerCase().includes(q);
    };

    const matchesTags = (itemTags) => {
      if (!tagSet) return true;
      if (!Array.isArray(itemTags) || itemTags.length === 0) return false;
      const s = new Set(itemTags);
      for (const t of tagSet) {
        if (!s.has(t)) return false;
      }
      return true;
    };

    // Resources
    let resources = [];
    if (!typeSet || typeSet.has('resource')) {
      const allResources = this._getFromStorage('resources', []);
      resources = allResources.filter(r => {
        if (gradeSet) {
          const rGrades = new Set();
          if (r.primaryGradeLevel) rGrades.add(r.primaryGradeLevel);
          if (Array.isArray(r.gradeLevels)) r.gradeLevels.forEach(g => rGrades.add(g));
          let ok = false;
          for (const g of gradeSet) {
            if (rGrades.has(g)) {
              ok = true;
              break;
            }
          }
          if (!ok) return false;
        }
        if (subjectSet && !subjectSet.has(r.subject)) return false;
        if (!matchesTags(r.tags)) return false;
        if (!matchesText(r.title) && !matchesText(r.description)) return false;
        return true;
      }).map(r => this._resolveResource(r));
    }

    // Videos
    let videos = [];
    if (!typeSet || typeSet.has('video')) {
      const allVideos = this._getFromStorage('videos', []);
      videos = allVideos.filter(v => {
        if (gradeSet) {
          const vGrades = new Set();
          if (v.primaryGradeLevel) vGrades.add(v.primaryGradeLevel);
          if (Array.isArray(v.gradeLevels)) v.gradeLevels.forEach(g => vGrades.add(g));
          let ok = false;
          for (const g of gradeSet) {
            if (vGrades.has(g)) {
              ok = true;
              break;
            }
          }
          if (!ok) return false;
        }
        if (subjectSet && !subjectSet.has(v.subject)) return false;
        if (!matchesTags(v.tags)) return false;
        if (!matchesText(v.title) && !matchesText(v.description)) return false;
        return true;
      }).map(v => this._resolveVideo(v));
    }

    // Blog posts
    let blogPosts = [];
    if (!typeSet || typeSet.has('blog_post')) {
      const allPosts = this._getFromStorage('blog_posts', []);
      blogPosts = allPosts.filter(p => {
        if (gradeSet) {
          if (!Array.isArray(p.tags) || p.tags.length === 0) return false;
          const pTagSet = new Set(p.tags);
          let ok = false;
          for (const g of gradeSet) {
            if (pTagSet.has(g)) {
              ok = true;
              break;
            }
          }
          if (!ok) return false;
        }
        if (subjectSet) {
          if (!Array.isArray(p.tags)) return false;
          let ok = false;
          for (const subj of subjectSet) {
            if (p.tags.includes(subj)) {
              ok = true;
              break;
            }
          }
          if (!ok) return false;
        }
        if (!matchesTags(p.tags)) return false;
        if (!matchesText(p.title) && !matchesText(p.excerpt) && !matchesText(p.body)) return false;
        return true;
      });
    }

    // Quizzes
    let quizzes = [];
    if (!typeSet || typeSet.has('quiz')) {
      const allQuizzes = this._getFromStorage('quizzes', []);
      quizzes = allQuizzes.filter(qz => matchesText(qz.title) || matchesText(qz.description));
    }

    // Study plans
    let studyPlans = [];
    if (!typeSet || typeSet.has('study_plan')) {
      const allPlans = this._getFromStorage('study_plans', []);
      studyPlans = allPlans.filter(sp => matchesText(sp.title) || matchesText(sp.description));
    }

    // Collections
    let collections = [];
    if (!typeSet || typeSet.has('collection')) {
      const allCollections = this._getFromStorage('collections', []);
      collections = allCollections.filter(c => matchesText(c.title) || matchesText(c.description));
    }

    // Optional overall sorting by 'newest'
    if (sortBy === 'newest') {
      const sortByDateDesc = (a, b, field) => {
        const aT = a[field] ? new Date(a[field]).getTime() : 0;
        const bT = b[field] ? new Date(b[field]).getTime() : 0;
        return bT - aT;
      };
      resources.sort((a, b) => sortByDateDesc(a, b, 'createdAt'));
      videos.sort((a, b) => sortByDateDesc(a, b, 'createdAt'));
      blogPosts.sort((a, b) => sortByDateDesc(a, b, 'publishedAt'));
      quizzes.sort((a, b) => sortByDateDesc(a, b, 'createdAt'));
      studyPlans.sort((a, b) => sortByDateDesc(a, b, 'createdAt'));
      collections.sort((a, b) => sortByDateDesc(a, b, 'createdAt'));
    }

    const result = {
      resources,
      videos,
      blogPosts,
      quizzes,
      studyPlans,
      collections,
      totalCounts: {
        resources: resources.length,
        videos: videos.length,
        blogPosts: blogPosts.length,
        quizzes: quizzes.length,
        studyPlans: studyPlans.length,
        collections: collections.length
      }
    };

    return result;
  }

  // getResourceFilterOptions()
  getResourceFilterOptions() {
    const gradeLevels = [
      { code: 'kindergarten', label: 'Kindergarten' },
      { code: 'grade_1', label: 'Grade 1' },
      { code: 'grade_2', label: 'Grade 2' },
      { code: 'grade_3', label: 'Grade 3' },
      { code: 'grade_4', label: 'Grade 4' },
      { code: 'grade_5', label: 'Grade 5' },
      { code: 'grade_6', label: 'Grade 6' },
      { code: 'grade_7', label: 'Grade 7' },
      { code: 'grade_8', label: 'Grade 8' },
      { code: 'grade_9', label: 'Grade 9' },
      { code: 'grade_10', label: 'Grade 10' },
      { code: 'grade_11', label: 'Grade 11' },
      { code: 'grade_12', label: 'Grade 12' },
      { code: 'test_prep', label: 'Test Prep' }
    ];

    const subjects = [
      { code: 'algebra', label: 'Algebra' },
      { code: 'geometry', label: 'Geometry' },
      { code: 'arithmetic', label: 'Arithmetic' },
      { code: 'fractions', label: 'Fractions' },
      { code: 'multiplication', label: 'Multiplication' },
      { code: 'statistics', label: 'Statistics' },
      { code: 'calculus', label: 'Calculus' },
      { code: 'number_theory', label: 'Number Theory' },
      { code: 'general_math', label: 'General Math' },
      { code: 'test_prep', label: 'Test Prep' }
    ];

    const subtopics = [
      { code: 'area_and_perimeter', label: 'Area & Perimeter', subjectCode: 'geometry' },
      { code: 'multiplication_tables', label: 'Multiplication Tables', subjectCode: 'multiplication' },
      { code: 'quadratic_equations', label: 'Quadratic Equations', subjectCode: 'algebra' },
      { code: 'linear_equations', label: 'Linear Equations', subjectCode: 'algebra' },
      { code: 'pythagorean_theorem', label: 'Pythagorean Theorem', subjectCode: 'geometry' },
      { code: 'sat_algebra', label: 'SAT Algebra', subjectCode: 'test_prep' },
      { code: 'fractions_basics', label: 'Fractions Basics', subjectCode: 'fractions' }
    ];

    const difficulties = ['very_easy', 'easy', 'medium', 'hard', 'very_hard'];
    const pacingOptions = ['self_paced', 'no_timer', 'timed'];
    const levels = ['introductory', 'standard', 'challenge'];

    return { gradeLevels, subjects, subtopics, difficulties, pacingOptions, levels };
  }

  // searchResources(filters, sortBy, sortDirection, page, pageSize)
  searchResources(filters = {}, sortBy = 'most_popular', sortDirection = 'desc', page = 1, pageSize = 20) {
    const allResources = this._getFromStorage('resources', []);
    const filtered = this._applyResourceFiltersAndSorting(allResources, filters, sortBy, sortDirection);

    const total = filtered.length;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const pageItems = filtered.slice(start, end).map(r => this._resolveResource(r));

    return { items: pageItems, total };
  }

  // getResourceDetails(resourceId)
  getResourceDetails(resourceId) {
    const resources = this._getFromStorage('resources', []);
    const resource = resources.find(r => r.id === resourceId) || null;
    if (!resource) {
      return { resource: null, relatedResources: [] };
    }

    const resolvedResource = this._resolveResource(resource);

    const relatedResources = resources
      .filter(r => r.id !== resource.id && (r.subject === resource.subject || r.topicId === resource.topicId))
      .sort((a, b) => {
        const aP = typeof a.popularityScore === 'number' ? a.popularityScore : 0;
        const bP = typeof b.popularityScore === 'number' ? b.popularityScore : 0;
        return bP - aP;
      })
      .slice(0, 5)
      .map(r => this._resolveResource(r));

    return { resource: resolvedResource, relatedResources };
  }

  // getVideoFilterOptions()
  getVideoFilterOptions() {
    const gradeLevels = [
      { code: 'kindergarten', label: 'Kindergarten' },
      { code: 'grade_1', label: 'Grade 1' },
      { code: 'grade_2', label: 'Grade 2' },
      { code: 'grade_3', label: 'Grade 3' },
      { code: 'grade_4', label: 'Grade 4' },
      { code: 'grade_5', label: 'Grade 5' },
      { code: 'grade_6', label: 'Grade 6' },
      { code: 'grade_7', label: 'Grade 7' },
      { code: 'grade_8', label: 'Grade 8' },
      { code: 'grade_9', label: 'Grade 9' },
      { code: 'grade_10', label: 'Grade 10' },
      { code: 'grade_11', label: 'Grade 11' },
      { code: 'grade_12', label: 'Grade 12' },
      { code: 'test_prep', label: 'Test Prep' }
    ];

    const subjects = [
      { code: 'algebra', label: 'Algebra' },
      { code: 'geometry', label: 'Geometry' },
      { code: 'arithmetic', label: 'Arithmetic' },
      { code: 'fractions', label: 'Fractions' },
      { code: 'multiplication', label: 'Multiplication' },
      { code: 'statistics', label: 'Statistics' },
      { code: 'calculus', label: 'Calculus' },
      { code: 'number_theory', label: 'Number Theory' },
      { code: 'general_math', label: 'General Math' },
      { code: 'test_prep', label: 'Test Prep' }
    ];

    const subtopics = [
      { code: 'area_and_perimeter', label: 'Area & Perimeter', subjectCode: 'geometry' },
      { code: 'multiplication_tables', label: 'Multiplication Tables', subjectCode: 'multiplication' },
      { code: 'quadratic_equations', label: 'Quadratic Equations', subjectCode: 'algebra' },
      { code: 'linear_equations', label: 'Linear Equations', subjectCode: 'algebra' },
      { code: 'pythagorean_theorem', label: 'Pythagorean Theorem', subjectCode: 'geometry' },
      { code: 'sat_algebra', label: 'SAT Algebra', subjectCode: 'test_prep' },
      { code: 'fractions_basics', label: 'Fractions Basics', subjectCode: 'fractions' }
    ];

    const ratingBuckets = [
      { min: 4.5, label: '4.5 stars & up' },
      { min: 4.0, label: '4.0 stars & up' },
      { min: 3.0, label: '3.0 stars & up' }
    ];

    const durationOptionsMinutes = [
      { maxMinutes: 5, label: 'Up to 5 minutes' },
      { maxMinutes: 10, label: 'Up to 10 minutes' },
      { maxMinutes: 15, label: 'Up to 15 minutes' },
      { maxMinutes: 30, label: 'Up to 30 minutes' }
    ];

    return { gradeLevels, subjects, subtopics, ratingBuckets, durationOptionsMinutes };
  }

  // searchVideos(filters, sortBy, sortDirection, page, pageSize)
  searchVideos(filters = {}, sortBy = 'duration', sortDirection = 'asc', page = 1, pageSize = 20) {
    const allVideos = this._getFromStorage('videos', []);
    const filtered = this._applyVideoFiltersAndSorting(allVideos, filters, sortBy, sortDirection);

    const total = filtered.length;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const pageItems = filtered.slice(start, end).map(v => this._resolveVideo(v));

    return { items: pageItems, total };
  }

  // getVideoDetails(videoId)
  getVideoDetails(videoId) {
    const videos = this._getFromStorage('videos', []);
    const video = videos.find(v => v.id === videoId) || null;
    if (!video) return null;
    return this._resolveVideo(video);
  }

  // getBlogFilterOptions()
  getBlogFilterOptions() {
    const categories = [
      { code: 'parent_guide', label: 'Parent Guides' },
      { code: 'teacher_guide', label: 'Teacher Guides' },
      { code: 'student_guide', label: 'Student Guides' },
      { code: 'site_update', label: 'Site Updates' },
      { code: 'general', label: 'General' }
    ];

    const popularTags = this._getFromStorage('tags', []);

    const sortOptions = ['newest_first', 'most_popular', 'comment_count'];

    return { categories, popularTags, sortOptions };
  }

  // searchBlogPosts(query, category, tagSlugs, sortBy, page, pageSize)
  searchBlogPosts(query = '', category, tagSlugs = [], sortBy = 'newest_first', page = 1, pageSize = 10) {
    const allPosts = this._getFromStorage('blog_posts', []);
    const q = (query || '').toLowerCase();
    const tagSet = Array.isArray(tagSlugs) && tagSlugs.length > 0 ? new Set(tagSlugs) : null;

    let items = allPosts.filter(p => {
      if (category && p.category !== category) return false;
      if (tagSet) {
        if (!Array.isArray(p.tags) || p.tags.length === 0) return false;
        const pTagSet = new Set(p.tags);
        for (const t of tagSet) {
          if (!pTagSet.has(t)) return false;
        }
        return true;
      }
      return true;
    });

    if (q) {
      items = items.filter(p => {
        const title = (p.title || '').toLowerCase();
        const ex = (p.excerpt || '').toLowerCase();
        const body = (p.body || '').toLowerCase();
        return title.includes(q) || ex.includes(q) || body.includes(q);
      });
    }

    items.sort((a, b) => {
      if (sortBy === 'comment_count') {
        const aC = typeof a.commentCount === 'number' ? a.commentCount : 0;
        const bC = typeof b.commentCount === 'number' ? b.commentCount : 0;
        return bC - aC;
      }
      if (sortBy === 'most_popular') {
        const aF = a.isFeatured ? 1 : 0;
        const bF = b.isFeatured ? 1 : 0;
        if (aF !== bF) return bF - aF;
        const aC = typeof a.commentCount === 'number' ? a.commentCount : 0;
        const bC = typeof b.commentCount === 'number' ? b.commentCount : 0;
        return bC - aC;
      }
      // default newest_first
      const aT = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
      const bT = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
      return bT - aT;
    });

    const total = items.length;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const pageItems = items.slice(start, end);

    return { items: pageItems, total };
  }

  // getBlogPostDetails(blogPostId)
  getBlogPostDetails(blogPostId) {
    const posts = this._getFromStorage('blog_posts', []);
    const post = posts.find(p => p.id === blogPostId) || null;
    if (!post) {
      return { post: null, tags: [], commentCount: 0 };
    }

    const allTags = this._getFromStorage('tags', []);
    const tagObjs = Array.isArray(post.tags)
      ? allTags.filter(t => post.tags.includes(t.slug))
      : [];

    const comments = this._getFromStorage('comments', []);
    const commentCount = comments.filter(c => c.blogPostId === blogPostId).length;

    return { post, tags: tagObjs, commentCount };
  }

  // getCommentsForBlogPost(blogPostId)
  getCommentsForBlogPost(blogPostId) {
    const comments = this._getFromStorage('comments', []);
    const filtered = comments
      .filter(c => c.blogPostId === blogPostId)
      .sort((a, b) => {
        const aT = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bT = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return aT - bT;
      });

    return filtered.map(c => this._resolveComment(c));
  }

  // addCommentToBlogPost(blogPostId, parentCommentId, body, notifyRepliesOnSite, notifyRepliesEmail)
  addCommentToBlogPost(blogPostId, parentCommentId, body, notifyRepliesOnSite = false, notifyRepliesEmail = false) {
    const comments = this._getFromStorage('comments', []);

    const comment = {
      id: this._generateId('comment'),
      blogPostId,
      parentCommentId: parentCommentId || null,
      body,
      createdAt: this._now(),
      updatedAt: null,
      notifyRepliesOnSite: !!notifyRepliesOnSite,
      notifyRepliesEmail: !!notifyRepliesEmail,
      isByAuthor: false
    };

    comments.push(comment);
    this._saveToStorage('comments', comments);

    // Optionally update denormalized commentCount on blog post
    const posts = this._getFromStorage('blog_posts', []);
    const idx = posts.findIndex(p => p.id === blogPostId);
    if (idx !== -1) {
      const old = posts[idx];
      const newCount = (typeof old.commentCount === 'number' ? old.commentCount : 0) + 1;
      posts[idx] = { ...old, commentCount: newCount };
      this._saveToStorage('blog_posts', posts);
    }

    return { comment: this._resolveComment(comment), success: true };
  }

  // addToSavedList(listType, contentType, contentId, notes)
  addToSavedList(listType, contentType, contentId, notes) {
    const items = this._getFromStorage('saved_list_items', []);

    const savedItem = {
      id: this._generateId('saved_item'),
      listType,
      contentType,
      contentId,
      addedAt: this._now(),
      notes: notes || ''
    };

    items.push(savedItem);
    this._saveToStorage('saved_list_items', items);

    return { savedItem, success: true };
  }

  // getSavedListItems(listType)
  getSavedListItems(listType) {
    const itemsAll = this._getFromStorage('saved_list_items', []);
    const filtered = itemsAll.filter(i => i.listType === listType);

    const resultItems = filtered.map(savedListItem => {
      const content = this._resolvePolymorphicContent(savedListItem.contentType, savedListItem.contentId);

      let title = '';
      let descriptionSnippet = '';
      let primaryGradeLevel = null;
      let resourceType = null;

      if (content) {
        if (savedListItem.contentType === 'resource') {
          title = content.title || '';
          descriptionSnippet = (content.description || '').slice(0, 200);
          primaryGradeLevel = content.primaryGradeLevel || null;
          resourceType = content.resourceType || null;
        } else if (savedListItem.contentType === 'video') {
          title = content.title || '';
          descriptionSnippet = (content.description || '').slice(0, 200);
          primaryGradeLevel = content.primaryGradeLevel || null;
        } else if (savedListItem.contentType === 'blog_post') {
          title = content.title || '';
          descriptionSnippet = (content.excerpt || content.body || '').slice(0, 200);
        } else if (savedListItem.contentType === 'quiz' || savedListItem.contentType === 'study_plan' || savedListItem.contentType === 'collection') {
          title = content.title || '';
          descriptionSnippet = (content.description || '').slice(0, 200);
        }
      }

      return {
        savedListItem: { ...savedListItem, content },
        title,
        descriptionSnippet,
        contentType: savedListItem.contentType,
        primaryGradeLevel,
        resourceType,
        content
      };
    });

    return { listType, items: resultItems };
  }

  // removeSavedListItem(savedListItemId)
  removeSavedListItem(savedListItemId) {
    const items = this._getFromStorage('saved_list_items', []);
    const newItems = items.filter(i => i.id !== savedListItemId);
    const success = newItems.length !== items.length;
    if (success) {
      this._saveToStorage('saved_list_items', newItems);
    }
    return { success };
  }

  // getStudyPlannerOverview()
  getStudyPlannerOverview() {
    const plans = this._getFromStorage('study_plans', []);
    return plans;
  }

  // createStudyPlan(title, totalDays, startDate)
  createStudyPlan(title, totalDays, startDate) {
    const plans = this._getFromStorage('study_plans', []);

    let startDateIso = null;
    if (startDate) {
      const d = new Date(startDate);
      if (!Number.isNaN(d.getTime())) {
        startDateIso = d.toISOString();
      }
    }

    let endDateIso = null;
    if (startDateIso) {
      const d = new Date(startDateIso);
      d.setDate(d.getDate() + (totalDays - 1));
      endDateIso = d.toISOString();
    }

    const studyPlan = {
      id: this._generateId('study_plan'),
      title,
      description: '',
      status: 'draft',
      startDate: startDateIso,
      endDate: endDateIso,
      totalDays,
      createdAt: this._now(),
      updatedAt: null
    };

    plans.push(studyPlan);
    this._saveToStorage('study_plans', plans);

    const days = this._initializeStudyPlanDays(studyPlan).map(d => this._resolveStudyPlanDay(d));

    return { studyPlan, days };
  }

  // getStudyPlanDetails(studyPlanId)
  getStudyPlanDetails(studyPlanId) {
    const plans = this._getFromStorage('study_plans', []);
    const studyPlan = plans.find(sp => sp.id === studyPlanId) || null;
    if (!studyPlan) {
      return { studyPlan: null, days: [] };
    }

    const allDays = this._getFromStorage('study_plan_days', []);
    const allItems = this._getFromStorage('study_plan_day_items', []);

    const days = allDays
      .filter(d => d.studyPlanId === studyPlanId)
      .sort((a, b) => a.dayIndex - b.dayIndex)
      .map(day => {
        const extendedDay = this._resolveStudyPlanDay(day);
        const items = allItems
          .filter(i => i.studyPlanId === studyPlanId && i.dayIndex === day.dayIndex)
          .sort((a, b) => a.orderIndex - b.orderIndex)
          .map(i => this._resolveStudyPlanDayItem(i));
        return { day: extendedDay, items };
      });

    return { studyPlan, days };
  }

  // addItemToStudyPlanDay(studyPlanId, dayIndex, contentType, contentId, orderIndex)
  addItemToStudyPlanDay(studyPlanId, dayIndex, contentType, contentId, orderIndex) {
    const items = this._getFromStorage('study_plan_day_items', []);

    let finalOrderIndex = typeof orderIndex === 'number' ? orderIndex : null;
    if (finalOrderIndex === null) {
      const existingForDay = items.filter(i => i.studyPlanId === studyPlanId && i.dayIndex === dayIndex);
      if (existingForDay.length === 0) {
        finalOrderIndex = 0;
      } else {
        const maxIndex = Math.max(...existingForDay.map(i => typeof i.orderIndex === 'number' ? i.orderIndex : 0));
        finalOrderIndex = maxIndex + 1;
      }
    }

    const dayItem = {
      id: this._generateId('study_plan_day_item'),
      studyPlanId,
      dayIndex,
      contentType,
      contentId,
      orderIndex: finalOrderIndex,
      addedAt: this._now()
    };

    items.push(dayItem);
    this._saveToStorage('study_plan_day_items', items);

    return { dayItem: this._resolveStudyPlanDayItem(dayItem), success: true };
  }

  // updateStudyPlanStatus(studyPlanId, status)
  updateStudyPlanStatus(studyPlanId, status) {
    const plans = this._getFromStorage('study_plans', []);
    const idx = plans.findIndex(sp => sp.id === studyPlanId);
    if (idx === -1) {
      return { studyPlan: null, success: false };
    }

    const updated = { ...plans[idx], status, updatedAt: this._now() };
    plans[idx] = updated;
    this._saveToStorage('study_plans', plans);

    return { studyPlan: updated, success: true };
  }

  // getQuizList()
  getQuizList() {
    const quizzes = this._getFromStorage('quizzes', []);
    return quizzes;
  }

  // getQuizDetails(quizId)
  getQuizDetails(quizId) {
    const quizzes = this._getFromStorage('quizzes', []);
    const questions = this._getFromStorage('questions', []);

    const quiz = quizzes.find(q => q.id === quizId) || null;
    if (!quiz) {
      return { quiz: null, questions: [] };
    }

    const questionIds = Array.isArray(quiz.questionIds) ? quiz.questionIds : [];
    const quizQuestions = questionIds
      .map(id => questions.find(q => q.id === id) || null)
      .filter(q => q !== null);

    return { quiz, questions: quizQuestions };
  }

  // getQuestionFilterOptions()
  getQuestionFilterOptions() {
    const topics = ['algebra', 'geometry', 'arithmetic', 'fractions', 'multiplication', 'statistics', 'calculus', 'number_theory', 'general_math'];
    const subtopics = ['linear_equations', 'quadratic_equations', 'fractions_basics', 'percentages', 'inequalities', 'systems_of_equations'];
    const difficulties = ['very_easy', 'easy', 'medium', 'hard', 'very_hard'];

    const questions = this._getFromStorage('questions', []);
    const tagSet = new Set();
    questions.forEach(q => {
      if (Array.isArray(q.tags)) {
        q.tags.forEach(t => tagSet.add(t));
      }
    });
    // Ensure word_problem exists as an option
    tagSet.add('word_problem');
    const tags = Array.from(tagSet);

    return { topics, subtopics, difficulties, tags };
  }

  // searchQuestions(filters, page, pageSize)
  searchQuestions(filters = {}, page = 1, pageSize = 50) {
    const allQuestions = this._getFromStorage('questions', []);
    const filtered = this._applyQuestionFilters(allQuestions, filters);

    const total = filtered.length;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const pageItems = filtered.slice(start, end);

    return { items: pageItems, total };
  }

  // createQuiz(title, questionIds, description)
  createQuiz(title, questionIds, description) {
    const quizzes = this._getFromStorage('quizzes', []);

    const quiz = {
      id: this._generateId('quiz'),
      title,
      description: description || '',
      questionIds: Array.isArray(questionIds) ? questionIds : [],
      createdAt: this._now(),
      updatedAt: null
    };

    quizzes.push(quiz);
    this._saveToStorage('quizzes', quizzes);

    return quiz;
  }

  // getTopicMap(defaultGradeLevel, query)
  getTopicMap(defaultGradeLevel, query) {
    const topics = this._getFromStorage('topics', []);
    const q = (query || '').toLowerCase();

    let items = topics;

    if (defaultGradeLevel) {
      items = items.filter(t => t.defaultGradeLevel === defaultGradeLevel);
    }

    if (q) {
      items = items.filter(t => {
        const name = (t.name || '').toLowerCase();
        const altNames = Array.isArray(t.altNames) ? t.altNames.join(' ').toLowerCase() : '';
        return name.includes(q) || altNames.includes(q);
      });
    }

    return items;
  }

  // getTopicResources(topicId, resourceTypes, level)
  getTopicResources(topicId, resourceTypes, level) {
    const topics = this._getFromStorage('topics', []);
    const topic = topics.find(t => t.id === topicId) || null;

    const allResources = this._getFromStorage('resources', []);
    let resources = allResources.filter(r => r.topicId === topicId);

    if (Array.isArray(resourceTypes) && resourceTypes.length > 0) {
      const typeSet = new Set(resourceTypes);
      resources = resources.filter(r => typeSet.has(r.resourceType));
    }

    if (level) {
      resources = resources.filter(r => r.level === level);
    }

    const resolvedResources = resources.map(r => this._resolveResource(r));

    return { topic, resources: resolvedResources };
  }

  // createCollection(title, description)
  createCollection(title, description) {
    const collections = this._getFromStorage('collections', []);

    const collection = {
      id: this._generateId('collection'),
      title,
      description: description || '',
      createdAt: this._now(),
      updatedAt: null
    };

    collections.push(collection);
    this._saveToStorage('collections', collections);

    return collection;
  }

  // addItemToCollection(collectionId, contentType, contentId, orderIndex)
  addItemToCollection(collectionId, contentType, contentId, orderIndex) {
    const items = this._getFromStorage('collection_items', []);

    let finalOrderIndex = typeof orderIndex === 'number' ? orderIndex : null;
    if (finalOrderIndex === null) {
      const existing = items.filter(i => i.collectionId === collectionId);
      if (existing.length === 0) {
        finalOrderIndex = 0;
      } else {
        const maxIndex = Math.max(...existing.map(i => typeof i.orderIndex === 'number' ? i.orderIndex : 0));
        finalOrderIndex = maxIndex + 1;
      }
    }

    const collectionItem = {
      id: this._generateId('collection_item'),
      collectionId,
      contentType,
      contentId,
      orderIndex: finalOrderIndex,
      addedAt: this._now()
    };

    items.push(collectionItem);
    this._saveToStorage('collection_items', items);

    return collectionItem;
  }

  // getCollectionsList()
  getCollectionsList() {
    const collections = this._getFromStorage('collections', []);
    return collections;
  }

  // getCollectionDetails(collectionId)
  getCollectionDetails(collectionId) {
    const collections = this._getFromStorage('collections', []);
    const collection = collections.find(c => c.id === collectionId) || null;

    const allItems = this._getFromStorage('collection_items', []);
    const items = allItems
      .filter(i => i.collectionId === collectionId)
      .sort((a, b) => a.orderIndex - b.orderIndex)
      .map(i => this._resolveCollectionItemContent(i));

    return { collection, items };
  }

  // reorderCollectionItems(collectionId, orderedCollectionItemIds)
  reorderCollectionItems(collectionId, orderedCollectionItemIds) {
    const items = this._getFromStorage('collection_items', []);
    const idToIndex = new Map();
    orderedCollectionItemIds.forEach((id, idx) => {
      idToIndex.set(id, idx);
    });

    let changed = false;
    const newItems = items.map(item => {
      if (item.collectionId === collectionId && idToIndex.has(item.id)) {
        const newOrderIndex = idToIndex.get(item.id);
        if (item.orderIndex !== newOrderIndex) {
          changed = true;
          return { ...item, orderIndex: newOrderIndex };
        }
      }
      return item;
    });

    if (changed) {
      this._saveToStorage('collection_items', newItems);
    }

    // Treat operation as successful as long as a reorder request was made,
    // even if the resulting order is identical to the previous one.
    return { success: Array.isArray(orderedCollectionItemIds) && orderedCollectionItemIds.length > 0 };
  }

  // getNotificationSettings()
  getNotificationSettings() {
    const raw = localStorage.getItem('notification_settings');
    let settings = null;
    if (raw !== null) {
      try {
        settings = JSON.parse(raw);
      } catch (e) {
        settings = null;
      }
    }

    if (!settings) {
      settings = {
        id: this._generateId('notification_settings'),
        followedTags: [],
        onSiteForFollowedTags: false,
        emailForFollowedTags: false,
        createdAt: this._now(),
        updatedAt: null
      };
      localStorage.setItem('notification_settings', JSON.stringify(settings));
    }

    return settings;
  }

  // updateNotificationSettings(followedTagSlugs, onSiteForFollowedTags, emailForFollowedTags)
  updateNotificationSettings(followedTagSlugs, onSiteForFollowedTags, emailForFollowedTags) {
    let settings = this.getNotificationSettings();

    const updated = { ...settings };
    if (Array.isArray(followedTagSlugs)) {
      updated.followedTags = followedTagSlugs;
    }
    if (typeof onSiteForFollowedTags === 'boolean') {
      updated.onSiteForFollowedTags = onSiteForFollowedTags;
    }
    if (typeof emailForFollowedTags === 'boolean') {
      updated.emailForFollowedTags = emailForFollowedTags;
    }
    updated.updatedAt = this._now();

    localStorage.setItem('notification_settings', JSON.stringify(updated));

    return updated;
  }

  // searchTags(query)
  searchTags(query) {
    const tags = this._getFromStorage('tags', []);
    const q = (query || '').toLowerCase();
    if (!q) return tags;
    return tags.filter(t => (t.name || '').toLowerCase().includes(q) || (t.slug || '').toLowerCase().includes(q));
  }

  // getStaticPageContent(slug)
  getStaticPageContent(slug) {
    return this._loadStaticPageFromCMS(slug);
  }

  // getContactConfig()
  getContactConfig() {
    const cfg = this._getFromStorage('contact_config', {
      supportEmail: '',
      socialLinks: [],
      expectedResponseTimeText: ''
    });
    return cfg;
  }

  // submitContactMessage(name, email, subject, message)
  submitContactMessage(name, email, subject, message) {
    const messages = this._getFromStorage('contact_messages', []);
    const msg = {
      id: this._generateId('contact_message'),
      name,
      email,
      subject,
      message,
      createdAt: this._now()
    };
    messages.push(msg);
    this._saveToStorage('contact_messages', messages);
    return { success: true };
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
