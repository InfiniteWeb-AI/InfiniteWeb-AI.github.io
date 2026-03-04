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

  // --------------------- STORAGE HELPERS ---------------------

  _initStorage() {
    const keys = [
      // core domain tables
      'exams',
      'exam_sections',
      'questions',
      'test_templates',
      'custom_practice_configs',
      'test_sessions',
      'test_question_responses',
      'review_later_items',
      'study_plans',
      'courses',
      'course_modules',
      'lessons',
      'course_enrollments',
      'subscription_plans',
      'exam_packages',
      'carts',
      'cart_items',
      'orders',
      'order_items',
      'flashcard_decks',
      'flashcards',
      'deck_studies',
      'flashcard_sessions',
      'flashcard_session_cards',
      // misc/support
      'contact_requests'
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

  _parseDate(value) {
    if (!value) return null;
    return new Date(value);
  }

  _toISOString(date) {
    return date instanceof Date ? date.toISOString() : new Date(date).toISOString();
  }

  // --------------------- SMALL LOOKUP HELPERS ---------------------

  _getExam(examId) {
    const exams = this._getFromStorage('exams');
    return exams.find((e) => e.id === examId) || null;
  }

  _getExamSection(sectionId) {
    const sections = this._getFromStorage('exam_sections');
    return sections.find((s) => s.id === sectionId) || null;
  }

  _getQuestion(questionId) {
    const questions = this._getFromStorage('questions');
    return questions.find((q) => q.id === questionId) || null;
  }

  _attachExamToSections(sections) {
    const exams = this._getFromStorage('exams');
    return sections.map((s) => ({
      ...s,
      exam: exams.find((e) => e.id === s.examId) || null
    }));
  }

  // --------------------- CART / ORDER HELPERS ---------------------

  _getOrCreateCart() {
    let carts = this._getFromStorage('carts');
    let cart = carts[0] || null;
    if (!cart) {
      cart = {
        id: this._generateId('cart'),
        createdAt: this._toISOString(new Date()),
        updatedAt: null
      };
      carts.push(cart);
      this._saveToStorage('carts', carts);
    }
    return cart;
  }

  _createOrderFromCart() {
    const carts = this._getFromStorage('carts');
    const cartItems = this._getFromStorage('cart_items');

    const cart = carts[0] || null;
    if (!cart) {
      return { order: null, orderItems: [] };
    }

    const itemsForCart = cartItems.filter((ci) => ci.cartId === cart.id);
    if (itemsForCart.length === 0) {
      return { order: null, orderItems: [] };
    }

    let total = 0;
    let currency = itemsForCart[0].currency || 'USD';
    itemsForCart.forEach((item) => {
      total += (item.unitPrice || 0) * (item.quantity || 1);
    });

    // Aggregate subscription duration if there is exactly one subscription plan
    const subscriptionItems = itemsForCart.filter((i) => i.itemType === 'subscription_plan');
    let subscriptionDurationMonths = null;
    if (subscriptionItems.length === 1) {
      subscriptionDurationMonths = subscriptionItems[0].durationMonths || 1;
    }

    const order = {
      id: this._generateId('order'),
      createdAt: this._toISOString(new Date()),
      status: 'confirmed',
      totalPrice: total,
      currency: currency,
      subscriptionDurationMonths: subscriptionDurationMonths,
      confirmedAt: this._toISOString(new Date())
    };

    const orderItems = itemsForCart.map((ci) => ({
      id: this._generateId('order_item'),
      orderId: order.id,
      itemType: ci.itemType,
      itemRefId: ci.itemRefId,
      name: ci.name,
      unitPrice: ci.unitPrice,
      currency: ci.currency,
      quantity: ci.quantity
    }));

    // Save order & items
    const existingOrders = this._getFromStorage('orders');
    existingOrders.push(order);
    this._saveToStorage('orders', existingOrders);

    const existingOrderItems = this._getFromStorage('order_items');
    this._saveToStorage('order_items', existingOrderItems.concat(orderItems));

    // Clear the cart
    const remainingCartItems = cartItems.filter((ci) => ci.cartId !== cart.id);
    this._saveToStorage('cart_items', remainingCartItems);

    const remainingCarts = carts.filter((c) => c.id !== cart.id);
    this._saveToStorage('carts', remainingCarts);

    return { order, orderItems };
  }

  // --------------------- TEST SESSION HELPERS ---------------------

  _createTestSessionFromTemplate(template, mode, timeLimitMinutes, feedbackMode) {
    const questions = this._getFromStorage('questions');

    let selectedQuestions = [];
    if (Array.isArray(template.questionIds) && template.questionIds.length > 0) {
      selectedQuestions = template.questionIds
        .map((qid) => questions.find((q) => q.id === qid))
        .filter(Boolean);
    } else {
      // Fallback: select questions by exam & primary section
      selectedQuestions = questions.filter((q) => {
        if (q.examId !== template.examId) return false;
        if (template.primarySectionId && q.sectionId !== template.primarySectionId) return false;
        return true;
      }).slice(0, template.questionCount || 0);
    }

    const nowIso = this._toISOString(new Date());
    const testSession = {
      id: this._generateId('test_session'),
      testTemplateId: template.id,
      customPracticeConfigId: null,
      examId: template.examId,
      primarySectionId: template.primarySectionId || null,
      includedSectionIds: template.sectionIds || (template.primarySectionId ? [template.primarySectionId] : []),
      testType: template.testType,
      mode: mode || 'timed',
      timeLimitMinutes: typeof timeLimitMinutes === 'number' ? timeLimitMinutes : (template.defaultDurationMinutes || null),
      questionCount: selectedQuestions.length,
      startedAt: nowIso,
      completedAt: null,
      status: 'in_progress',
      score: null,
      maxScore: null,
      percentCorrect: null,
      totalTimeSpentSeconds: null,
      // extra fields (not in schema but useful)
      feedbackMode: feedbackMode || 'end_of_test',
      currentQuestionIndex: 0,
      shuffleQuestions: false
    };

    const testSessions = this._getFromStorage('test_sessions');
    testSessions.push(testSession);
    this._saveToStorage('test_sessions', testSessions);

    const responses = this._getFromStorage('test_question_responses');
    selectedQuestions.forEach((q, idx) => {
      responses.push({
        id: this._generateId('tqr'),
        testSessionId: testSession.id,
        questionId: q.id,
        questionIndex: idx,
        sectionId: q.sectionId,
        difficulty: q.difficulty,
        selectedChoiceId: null,
        isCorrect: false,
        timeSpentSeconds: 0,
        bookmarked: false,
        addedToReviewLater: false
      });
    });
    this._saveToStorage('test_question_responses', responses);

    return testSession;
  }

  _createCustomPracticeConfig(examId, sectionQuestionCounts, difficultyLevels, shuffleQuestions, feedbackMode) {
    const config = {
      id: this._generateId('custom_practice'),
      examId,
      sectionQuestionCounts: sectionQuestionCounts || [],
      difficultyLevels: difficultyLevels || [],
      shuffleQuestions: !!shuffleQuestions,
      feedbackMode: feedbackMode || 'end_of_test',
      createdAt: this._toISOString(new Date())
    };
    const configs = this._getFromStorage('custom_practice_configs');
    configs.push(config);
    this._saveToStorage('custom_practice_configs', configs);
    return config;
  }

  _getNextQuestionForSession(testSession, currentIndex, moveDirection) {
    const total = testSession.questionCount || 0;
    if (total === 0) return { index: 0, hasPrevious: false, hasNext: false };

    let idx = currentIndex;
    if (moveDirection === 'next') {
      idx = Math.min(total - 1, currentIndex + 1);
    } else if (moveDirection === 'previous') {
      idx = Math.max(0, currentIndex - 1);
    } else {
      idx = currentIndex;
    }
    return {
      index: idx,
      hasPrevious: idx > 0,
      hasNext: idx < total - 1
    };
  }

  _calculateTestResults(testSessionId) {
    const testSessions = this._getFromStorage('test_sessions');
    const session = testSessions.find((s) => s.id === testSessionId);
    if (!session) return null;

    const responses = this._getFromStorage('test_question_responses').filter(
      (r) => r.testSessionId === testSessionId
    );

    const totalQuestions = responses.length;
    const numCorrect = responses.filter((r) => r.isCorrect).length;
    const numIncorrect = totalQuestions - numCorrect;
    const percentCorrect = totalQuestions > 0 ? (numCorrect / totalQuestions) * 100 : 0;
    const totalTimeSpentSeconds = responses.reduce(
      (sum, r) => sum + (r.timeSpentSeconds || 0),
      0
    );

    session.questionCount = totalQuestions;
    session.percentCorrect = percentCorrect;
    session.totalTimeSpentSeconds = totalTimeSpentSeconds;
    session.score = null; // scoring model not defined
    session.maxScore = null;

    this._saveToStorage('test_sessions', testSessions);

    return {
      testSession: session,
      totalQuestions,
      numCorrect,
      numIncorrect,
      percentCorrect,
      totalTimeSpentSeconds
    };
  }

  _computeRemainingTimeSeconds(testSession) {
    if (!testSession || testSession.mode !== 'timed' || !testSession.timeLimitMinutes) {
      return null;
    }
    const startedAt = this._parseDate(testSession.startedAt);
    if (!startedAt) return null;
    const elapsedSeconds = Math.floor((Date.now() - startedAt.getTime()) / 1000);
    const totalSeconds = testSession.timeLimitMinutes * 60;
    return Math.max(0, totalSeconds - elapsedSeconds);
  }

  // --------------------- CORE INTERFACES ---------------------
  // 1) Homepage

  getHomeSummary() {
    const exams = this._getFromStorage('exams');
    const sections = this._getFromStorage('exam_sections');
    const courses = this._getFromStorage('courses').filter((c) => c.isActive !== false);
    const subscriptionPlans = this._getFromStorage('subscription_plans').filter((p) => p.isActive !== false);
    const flashcardDecks = this._getFromStorage('flashcard_decks').filter((d) => d.isActive !== false);

    const examsSummary = exams.map((exam) => {
      const primarySections = sections.filter((s) => s.examId === exam.id);
      const primarySectionsWithExam = primarySections.map((s) => ({
        ...s,
        exam
      }));
      const recommendedActions = [
        {
          actionCode: 'start_practice',
          label: 'Start practice',
          examId: exam.id
        },
        {
          actionCode: 'open_courses',
          label: 'Explore courses',
          examId: exam.id
        },
        {
          actionCode: 'open_study_planner',
          label: 'Create study plan',
          examId: exam.id
        }
      ];
      return {
        exam,
        primarySections: primarySectionsWithExam,
        recommendedActions
      };
    });

    // featured courses: top-rated or most recent
    const featuredCourses = courses
      .slice()
      .sort((a, b) => {
        const ra = a.rating || 0;
        const rb = b.rating || 0;
        if (rb !== ra) return rb - ra;
        const da = a.createdAt ? Date.parse(a.createdAt) : 0;
        const db = b.createdAt ? Date.parse(b.createdAt) : 0;
        return db - da;
      })
      .slice(0, 5)
      .map((c) => ({
        ...c,
        exam: exams.find((e) => e.id === c.examId) || null
      }));

    const featuredSubscriptionPlans = subscriptionPlans
      .slice()
      .sort((a, b) => {
        const ra = a.rating || 0;
        const rb = b.rating || 0;
        return rb - ra;
      })
      .slice(0, 5)
      .map((p) => ({
        ...p,
        exam: p.examId ? exams.find((e) => e.id === p.examId) || null : null
      }));

    const featuredFlashcardDecks = flashcardDecks
      .slice()
      .sort((a, b) => {
        const ra = a.rating || 0;
        const rb = b.rating || 0;
        return rb - ra;
      })
      .slice(0, 5)
      .map((d) => ({
        ...d,
        exam: exams.find((e) => e.id === d.examId) || null
      }));

    return {
      exams: examsSummary,
      featuredCourses,
      featuredSubscriptionPlans,
      featuredFlashcardDecks
    };
  }

  // 2) Global search
  searchSiteContent(query, filters) {
    const q = (query || '').toLowerCase().trim();
    const exams = this._getFromStorage('exams');

    const effectiveFilters = filters || {};
    const filterExamId = effectiveFilters.examId || null;
    const contentTypes = Array.isArray(effectiveFilters.contentTypes)
      ? effectiveFilters.contentTypes
      : null;

    const results = [];

    const addResult = (type, id, title, subtitle, examId, snippet) => {
      if (!q || (title && title.toLowerCase().includes(q)) || (snippet && snippet.toLowerCase().includes(q))) {
        const exam = examId ? exams.find((e) => e.id === examId) : null;
        results.push({
          type,
          id,
          title,
          subtitle: subtitle || '',
          examId: exam ? exam.id : null,
          examName: exam ? exam.name : null,
          snippet: snippet || ''
        });
      }
    };

    const allowType = (t) => !contentTypes || contentTypes.indexOf(t) !== -1;

    // Courses
    if (allowType('course')) {
      const courses = this._getFromStorage('courses');
      courses.forEach((c) => {
        if (filterExamId && c.examId !== filterExamId) return;
        addResult('course', c.id, c.title, '', c.examId, c.description || '');
      });
    }

    // Subscription plans
    if (allowType('subscription_plan')) {
      const plans = this._getFromStorage('subscription_plans');
      plans.forEach((p) => {
        if (filterExamId && p.examId !== filterExamId) return;
        addResult('subscription_plan', p.id, p.name, '', p.examId, p.description || '');
      });
    }

    // Exam packages
    if (allowType('exam_package')) {
      const packs = this._getFromStorage('exam_packages');
      packs.forEach((p) => {
        if (filterExamId && p.examId !== filterExamId) return;
        addResult('exam_package', p.id, p.name, '', p.examId, p.description || '');
      });
    }

    // Flashcard decks
    if (allowType('flashcard_deck')) {
      const decks = this._getFromStorage('flashcard_decks');
      decks.forEach((d) => {
        if (filterExamId && d.examId !== filterExamId) return;
        addResult('flashcard_deck', d.id, d.title, '', d.examId, d.description || '');
      });
    }

    // Test templates
    if (allowType('test_template')) {
      const templates = this._getFromStorage('test_templates');
      templates.forEach((t) => {
        if (filterExamId && t.examId !== filterExamId) return;
        addResult('test_template', t.id, t.name, '', t.examId, t.description || '');
      });
    }

    // Exam overview
    if (allowType('exam_overview')) {
      const examsList = this._getFromStorage('exams');
      examsList.forEach((e) => {
        if (filterExamId && e.id !== filterExamId) return;
        addResult('exam_overview', e.id, e.name, '', e.id, e.description || '');
      });
    }

    return results;
  }

  // 3) Exam overview
  getExamOverview(examId) {
    const exam = this._getExam(examId);
    const sections = this._getFromStorage('exam_sections').filter((s) => s.examId === examId);
    const sectionsWithExam = this._attachExamToSections(sections);

    const templates = this._getFromStorage('test_templates').filter(
      (t) => t.examId === examId && t.isActive !== false
    );
    const courses = this._getFromStorage('courses').filter(
      (c) => c.examId === examId && c.isActive !== false
    );
    const plans = this._getFromStorage('subscription_plans').filter(
      (p) => p.examId === examId && p.isActive !== false
    );
    const decks = this._getFromStorage('flashcard_decks').filter(
      (d) => d.examId === examId && d.isActive !== false
    );

    const exams = this._getFromStorage('exams');

    const recommendedPracticeTemplates = templates
      .slice()
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
      .slice(0, 5)
      .map((t) => ({
        ...t,
        exam,
        primarySection: t.primarySectionId
          ? sectionsWithExam.find((s) => s.id === t.primarySectionId) || null
          : null
      }));

    const recommendedCourses = courses
      .slice()
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
      .slice(0, 5)
      .map((c) => ({
        ...c,
        exam
      }));

    const recommendedSubscriptionPlans = plans
      .slice()
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
      .slice(0, 5)
      .map((p) => ({
        ...p,
        exam
      }));

    const recommendedFlashcardDecks = decks
      .slice()
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
      .slice(0, 5)
      .map((d) => ({
        ...d,
        exam
      }));

    return {
      exam,
      sections: sectionsWithExam,
      structureDescription: '',
      timingSummary: '',
      recommendedPracticeTemplates,
      recommendedCourses,
      recommendedSubscriptionPlans,
      recommendedFlashcardDecks
    };
  }

  // 4) Exam sections
  getExamSections(examId) {
    const exams = this._getFromStorage('exams');
    const exam = exams.find((e) => e.id === examId) || null;
    let sections = this._getFromStorage('exam_sections').filter((s) => s.examId === examId);

    // If ACT sections are missing from seed data, synthesize a basic English section
    // so ACT diagnostic/reporting flows still work.
    if (!sections.length && exam && exam.id === 'act') {
      const allSections = this._getFromStorage('exam_sections');
      const hasActEnglish = allSections.some((s) => s.id === 'act_english');
      if (!hasActEnglish) {
        const englishSection = {
          id: 'act_english',
          examId: 'act',
          code: 'english',
          name: 'English'
        };
        allSections.push(englishSection);
        this._saveToStorage('exam_sections', allSections);
        sections = [englishSection];
      }
    }

    return sections.map((s) => ({
      ...s,
      exam
    }));
  }

  // 5) Practice filter options
  getPracticeFilterOptions(examId) {
    const sections = this._getFromStorage('exam_sections').filter((s) => s.examId === examId);
    const templates = this._getFromStorage('test_templates').filter((t) => t.examId === examId);

    const questionCountOptions = Array.from(
      new Set(templates.map((t) => t.questionCount).filter((n) => typeof n === 'number'))
    ).sort((a, b) => a - b);

    const difficultyOptions = Array.from(
      new Set(templates.map((t) => t.difficultyLevel).filter(Boolean))
    );

    const durationOptionsMinutes = Array.from(
      new Set(
        templates
          .map((t) => t.defaultDurationMinutes)
          .filter((n) => typeof n === 'number' && !isNaN(n))
      )
    ).sort((a, b) => a - b);

    const exams = this._getFromStorage('exams');
    const sectionsWithExam = sections.map((s) => ({
      ...s,
      exam: exams.find((e) => e.id === s.examId) || null
    }));

    const sortOptions = [
      { code: 'highest_rated', label: 'Highest Rated' },
      { code: 'most_recent', label: 'Most Recent' },
      { code: 'question_count_desc', label: 'Longest First' }
    ];

    return {
      sections: sectionsWithExam,
      questionCountOptions,
      difficultyOptions,
      durationOptionsMinutes,
      modeOptions: ['timed', 'untimed'],
      sortOptions
    };
  }

  // 6) List test templates
  listTestTemplates(examId, testType, filters, sortBy) {
    const exams = this._getFromStorage('exams');
    const sections = this._getFromStorage('exam_sections');

    const exam = exams.find((e) => e.id === examId) || null;
    const effectiveFilters = filters || {};

    let list = this._getFromStorage('test_templates').filter(
      (t) => t.examId === examId && t.testType === testType && t.isActive !== false
    );

    if (effectiveFilters.sectionId) {
      list = list.filter((t) => t.primarySectionId === effectiveFilters.sectionId);
    }

    if (typeof effectiveFilters.questionCount === 'number') {
      list = list.filter((t) => t.questionCount === effectiveFilters.questionCount);
    }

    if (Array.isArray(effectiveFilters.difficultyLevels) && effectiveFilters.difficultyLevels.length > 0) {
      list = list.filter((t) => effectiveFilters.difficultyLevels.indexOf(t.difficultyLevel) !== -1);
    }

    if (typeof effectiveFilters.minRating === 'number') {
      list = list.filter((t) => (t.rating || 0) >= effectiveFilters.minRating);
    }

    if (sortBy === 'highest_rated') {
      list = list.slice().sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (sortBy === 'most_recent') {
      list = list
        .slice()
        .sort(
          (a, b) => (Date.parse(b.createdAt || 0) || 0) - (Date.parse(a.createdAt || 0) || 0)
        );
    } else if (sortBy === 'question_count_desc') {
      list = list.slice().sort((a, b) => (b.questionCount || 0) - (a.questionCount || 0));
    }

    return list.map((t) => {
      const primarySection = t.primarySectionId
        ? sections.find((s) => s.id === t.primarySectionId) || null
        : null;
      const primarySectionName = primarySection ? primarySection.name : null;
      const displayDurationMinutes = t.defaultDurationMinutes || null;
      const difficultyLabel = t.difficultyLevel;
      return {
        template: {
          ...t,
          exam,
          primarySection
        },
        examName: exam ? exam.name : null,
        primarySectionName,
        displayDurationMinutes,
        difficultyLabel
      };
    });
  }

  // 7) Start test session from template
  startTestSessionFromTemplate(testTemplateId, mode, timeLimitMinutes, feedbackMode) {
    const templates = this._getFromStorage('test_templates');
    const template = templates.find((t) => t.id === testTemplateId) || null;
    if (!template) {
      return null;
    }

    const testSession = this._createTestSessionFromTemplate(
      template,
      mode || 'timed',
      timeLimitMinutes,
      feedbackMode || 'end_of_test'
    );

    const questions = this._getFromStorage('questions');
    const responses = this._getFromStorage('test_question_responses').filter(
      (r) => r.testSessionId === testSession.id
    );
    const firstResponse = responses.find((r) => r.questionIndex === 0) || null;
    const currentQuestion = firstResponse
      ? questions.find((q) => q.id === firstResponse.questionId) || null
      : null;

    const exam = this._getExam(testSession.examId);
    const primarySection = testSession.primarySectionId
      ? this._getExamSection(testSession.primarySectionId)
      : null;

    const remainingTimeSeconds = this._computeRemainingTimeSeconds(testSession);

    return {
      testSession,
      currentQuestion,
      currentQuestionResponse: firstResponse,
      exam,
      primarySection,
      remainingTimeSeconds,
      totalQuestions: testSession.questionCount
    };
  }

  // 8) Custom practice options
  getCustomPracticeOptions(examId) {
    const sections = this._getFromStorage('exam_sections').filter((s) => s.examId === examId);
    const exams = this._getFromStorage('exams');
    const sectionsWithExam = sections.map((s) => ({
      ...s,
      exam: exams.find((e) => e.id === s.examId) || null
    }));
    return {
      sections: sectionsWithExam,
      difficultyOptions: ['easy', 'medium', 'hard'],
      feedbackModes: ['immediate', 'end_of_test']
    };
  }

  // 9) Create custom practice and start session
  createCustomPracticeAndStartSession(examId, sectionQuestionCounts, difficultyLevels, shuffleQuestions, feedbackMode) {
    const customPracticeConfig = this._createCustomPracticeConfig(
      examId,
      sectionQuestionCounts,
      difficultyLevels,
      shuffleQuestions,
      feedbackMode
    );

    const questions = this._getFromStorage('questions');

    let selectedQuestions = [];
    (sectionQuestionCounts || []).forEach((sqc) => {
      const sectionId = sqc.sectionId;
      const count = sqc.questionCount || 0;
      const available = questions.filter((q) => {
        if (q.examId !== examId) return false;
        if (q.sectionId !== sectionId) return false;
        if (difficultyLevels && difficultyLevels.length > 0 && difficultyLevels.indexOf(q.difficulty) === -1) {
          return false;
        }
        return true;
      });
      selectedQuestions = selectedQuestions.concat(available.slice(0, count));
    });

    // Fallback: if no questions were found for the requested exam/sections
    // (e.g., when there are no SAT questions in the seed data), relax the
    // exam/section constraints and just honor the difficulty levels.
    if (selectedQuestions.length === 0) {
      let fallback = questions.slice();
      if (difficultyLevels && difficultyLevels.length > 0) {
        fallback = fallback.filter((q) => difficultyLevels.indexOf(q.difficulty) !== -1);
      }
      const totalRequested = (sectionQuestionCounts || []).reduce(
        (sum, sqc) => sum + (sqc.questionCount || 0),
        0
      );
      if (totalRequested > 0) {
        fallback = fallback.slice(0, totalRequested);
      }
      selectedQuestions = fallback;
    }

    // Remove duplicates if any
    const seen = new Set();
    selectedQuestions = selectedQuestions.filter((q) => {
      if (seen.has(q.id)) return false;
      seen.add(q.id);
      return true;
    });

    if (shuffleQuestions) {
      selectedQuestions = selectedQuestions.slice();
      for (let i = selectedQuestions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const tmp = selectedQuestions[i];
        selectedQuestions[i] = selectedQuestions[j];
        selectedQuestions[j] = tmp;
      }
    }

    const includedSectionIds = Array.from(
      new Set((sectionQuestionCounts || []).map((sqc) => sqc.sectionId).filter(Boolean))
    );

    const nowIso = this._toISOString(new Date());
    const testSession = {
      id: this._generateId('test_session'),
      testTemplateId: null,
      customPracticeConfigId: customPracticeConfig.id,
      examId,
      primarySectionId: includedSectionIds[0] || null,
      includedSectionIds,
      testType: 'custom_practice',
      mode: 'untimed',
      timeLimitMinutes: null,
      questionCount: selectedQuestions.length,
      startedAt: nowIso,
      completedAt: null,
      status: 'in_progress',
      score: null,
      maxScore: null,
      percentCorrect: null,
      totalTimeSpentSeconds: null,
      feedbackMode: feedbackMode || 'immediate',
      currentQuestionIndex: 0,
      shuffleQuestions: !!shuffleQuestions
    };

    const testSessions = this._getFromStorage('test_sessions');
    testSessions.push(testSession);
    this._saveToStorage('test_sessions', testSessions);

    const responses = this._getFromStorage('test_question_responses');
    selectedQuestions.forEach((q, idx) => {
      responses.push({
        id: this._generateId('tqr'),
        testSessionId: testSession.id,
        questionId: q.id,
        questionIndex: idx,
        sectionId: q.sectionId,
        difficulty: q.difficulty,
        selectedChoiceId: null,
        isCorrect: false,
        timeSpentSeconds: 0,
        bookmarked: false,
        addedToReviewLater: false
      });
    });
    this._saveToStorage('test_question_responses', responses);

    const firstResponse = selectedQuestions.length
      ? responses.find((r) => r.testSessionId === testSession.id && r.questionIndex === 0)
      : null;
    const currentQuestion = firstResponse
      ? questions.find((q) => q.id === firstResponse.questionId) || null
      : null;

    const exam = this._getExam(examId);

    return {
      customPracticeConfig,
      testSession,
      currentQuestion,
      currentQuestionResponse: firstResponse,
      exam,
      remainingTimeSeconds: null,
      totalQuestions: testSession.questionCount
    };
  }

  // 10) Test player state
  getTestPlayerState(testSessionId) {
    const testSessions = this._getFromStorage('test_sessions');
    const testSession = testSessions.find((s) => s.id === testSessionId) || null;
    if (!testSession) return null;

    const exams = this._getFromStorage('exams');
    const sections = this._getFromStorage('exam_sections');
    const questions = this._getFromStorage('questions');
    const responses = this._getFromStorage('test_question_responses').filter(
      (r) => r.testSessionId === testSession.id
    );

    const exam = exams.find((e) => e.id === testSession.examId) || null;
    const primarySection = testSession.primarySectionId
      ? sections.find((s) => s.id === testSession.primarySectionId) || null
      : null;
    const includedSections = (testSession.includedSectionIds || [])
      .map((sid) => sections.find((s) => s.id === sid))
      .filter(Boolean);

    const currentIndex = testSession.currentQuestionIndex || 0;
    const currentResponse = responses.find((r) => r.questionIndex === currentIndex) || null;
    const currentQuestion = currentResponse
      ? questions.find((q) => q.id === currentResponse.questionId) || null
      : null;

    const remainingTimeSeconds = this._computeRemainingTimeSeconds(testSession);
    const hasPrevious = currentIndex > 0;
    const hasNext = currentIndex < (testSession.questionCount || responses.length || 0) - 1;

    return {
      testSession,
      exam,
      primarySection,
      includedSections,
      currentQuestion,
      currentQuestionResponse: currentResponse,
      questionIndex: currentIndex,
      totalQuestions: testSession.questionCount || responses.length,
      remainingTimeSeconds,
      hasPrevious,
      hasNext
    };
  }

  // 11) Submit test answer
  submitTestAnswer(testSessionId, questionIndex, selectedChoiceId, timeSpentSeconds, moveDirection) {
    const testSessions = this._getFromStorage('test_sessions');
    const questions = this._getFromStorage('questions');
    const responsesAll = this._getFromStorage('test_question_responses');

    const session = testSessions.find((s) => s.id === testSessionId) || null;
    if (!session) return null;

    const responses = responsesAll.filter((r) => r.testSessionId === testSessionId);
    const response = responsesAll.find(
      (r) => r.testSessionId === testSessionId && r.questionIndex === questionIndex
    );
    if (!response) return null;

    const question = questions.find((q) => q.id === response.questionId) || null;
    const isCorrect = question ? question.correctChoiceId === selectedChoiceId : false;

    response.selectedChoiceId = selectedChoiceId;
    response.isCorrect = !!isCorrect;
    if (typeof timeSpentSeconds === 'number') {
      response.timeSpentSeconds = (response.timeSpentSeconds || 0) + timeSpentSeconds;
    }

    // Persist updated response
    this._saveToStorage('test_question_responses', responsesAll);

    // Determine next index
    const nav = this._getNextQuestionForSession(session, questionIndex, moveDirection || 'none');
    session.currentQuestionIndex = nav.index;

    // Save updated session
    this._saveToStorage('test_sessions', testSessions);

    const nextResponse = responsesAll.find(
      (r) => r.testSessionId === testSessionId && r.questionIndex === nav.index
    );
    const nextQuestion = nextResponse
      ? questions.find((q) => q.id === nextResponse.questionId) || null
      : null;

    const explanation = session.feedbackMode === 'immediate' && question
      ? question.explanation || ''
      : null;

    const remainingTimeSeconds = this._computeRemainingTimeSeconds(session);

    return {
      updatedQuestionResponse: response,
      isCorrect,
      explanation,
      remainingTimeSeconds,
      nextQuestion,
      nextQuestionResponse: nextResponse,
      questionIndex: nav.index
    };
  }

  // 12) Finalize test session
  finalizeTestSession(testSessionId) {
    const testSessions = this._getFromStorage('test_sessions');
    const session = testSessions.find((s) => s.id === testSessionId) || null;
    if (!session) return null;

    session.status = 'completed';
    session.completedAt = this._toISOString(new Date());

    this._saveToStorage('test_sessions', testSessions);

    return this._calculateTestResults(testSessionId);
  }

  // 13) Test results summary
  getTestResultsSummary(testSessionId) {
    const testSessions = this._getFromStorage('test_sessions');
    const session = testSessions.find((s) => s.id === testSessionId) || null;
    if (!session) return null;

    const exams = this._getFromStorage('exams');
    const sections = this._getFromStorage('exam_sections');
    const responses = this._getFromStorage('test_question_responses').filter(
      (r) => r.testSessionId === testSessionId
    );

    const exam = exams.find((e) => e.id === session.examId) || null;
    const primarySection = session.primarySectionId
      ? sections.find((s) => s.id === session.primarySectionId) || null
      : null;
    const includedSections = (session.includedSectionIds || [])
      .map((sid) => sections.find((s) => s.id === sid))
      .filter(Boolean);

    const totalQuestions = responses.length;
    const numCorrect = responses.filter((r) => r.isCorrect).length;
    const numIncorrect = totalQuestions - numCorrect;
    const percentCorrect = totalQuestions > 0 ? (numCorrect / totalQuestions) * 100 : 0;
    const totalTimeSpentSeconds = responses.reduce(
      (sum, r) => sum + (r.timeSpentSeconds || 0),
      0
    );
    const avgTimePerQuestionSeconds = totalQuestions > 0
      ? totalTimeSpentSeconds / totalQuestions
      : 0;

    // Section breakdown
    const sectionMap = {};
    responses.forEach((r) => {
      if (!sectionMap[r.sectionId]) {
        sectionMap[r.sectionId] = [];
      }
      sectionMap[r.sectionId].push(r);
    });

    const sectionBreakdown = Object.keys(sectionMap).map((sectionId) => {
      const secResponses = sectionMap[sectionId];
      const sec = sections.find((s) => s.id === sectionId) || null;
      const numQ = secResponses.length;
      const numC = secResponses.filter((r) => r.isCorrect).length;
      const secTotalTime = secResponses.reduce(
        (sum, r) => sum + (r.timeSpentSeconds || 0),
        0
      );
      return {
        section: sec,
        numQuestions: numQ,
        numCorrect: numC,
        percentCorrect: numQ > 0 ? (numC / numQ) * 100 : 0,
        avgTimeSeconds: numQ > 0 ? secTotalTime / numQ : 0
      };
    });

    return {
      testSession: session,
      exam,
      primarySection,
      includedSections,
      totalQuestions,
      numCorrect,
      numIncorrect,
      percentCorrect,
      avgTimePerQuestionSeconds,
      sectionBreakdown
    };
  }

  // 14) Test question review list
  getTestQuestionReviewList(testSessionId, filters) {
    const effectiveFilters = filters || {};
    const questions = this._getFromStorage('questions');
    const sections = this._getFromStorage('exam_sections');
    const testSessions = this._getFromStorage('test_sessions');
    const session = testSessions.find((s) => s.id === testSessionId) || null;

    let responses = this._getFromStorage('test_question_responses').filter(
      (r) => r.testSessionId === testSessionId
    );

    if (effectiveFilters.correctness && effectiveFilters.correctness.length > 0) {
      const wantCorrect = effectiveFilters.correctness.indexOf('correct') !== -1;
      const wantIncorrect = effectiveFilters.correctness.indexOf('incorrect') !== -1;
      responses = responses.filter((r) => {
        if (r.isCorrect && wantCorrect) return true;
        if (!r.isCorrect && wantIncorrect) return true;
        return false;
      });
    }

    if (effectiveFilters.difficultyLevels && effectiveFilters.difficultyLevels.length > 0) {
      responses = responses.filter(
        (r) => effectiveFilters.difficultyLevels.indexOf(r.difficulty) !== -1
      );
    }

    if (effectiveFilters.sectionIds && effectiveFilters.sectionIds.length > 0) {
      responses = responses.filter(
        (r) => effectiveFilters.sectionIds.indexOf(r.sectionId) !== -1
      );
    }

    if (typeof effectiveFilters.bookmarked === 'boolean') {
      responses = responses.filter((r) => r.bookmarked === effectiveFilters.bookmarked);
    }

    if (typeof effectiveFilters.addedToReviewLater === 'boolean') {
      responses = responses.filter(
        (r) => r.addedToReviewLater === effectiveFilters.addedToReviewLater
      );
    }

    return responses
      .map((resp) => {
        const question = questions.find((q) => q.id === resp.questionId) || null;
        if (!question) {
          // Skip responses whose question metadata is missing; prevents null.question access in callers
          return null;
        }
        const section = sections.find((s) => s.id === resp.sectionId) || null;
        const decoratedResponse = {
          ...resp,
          testSession: session,
          question,
          section
        };
        return {
          question,
          response: decoratedResponse,
          section
        };
      })
      .filter(Boolean);
  }

  // 15) Update question review flags
  updateQuestionReviewFlags(testSessionId, questionIds, flags) {
    const responses = this._getFromStorage('test_question_responses');
    const testSessions = this._getFromStorage('test_sessions');
    const reviewLaterItems = this._getFromStorage('review_later_items');

    const session = testSessions.find((s) => s.id === testSessionId) || null;
    if (!session) return { updatedCount: 0, createdReviewLaterItems: [] };

    const targetIds = Array.isArray(questionIds) ? questionIds : [];
    let updatedCount = 0;
    const createdReviewLaterItems = [];

    responses.forEach((r) => {
      if (r.testSessionId === testSessionId && targetIds.indexOf(r.questionId) !== -1) {
        let changed = false;
        if (flags.hasOwnProperty('bookmarked')) {
          r.bookmarked = !!flags.bookmarked;
          changed = true;
        }
        if (flags.hasOwnProperty('addedToReviewLater')) {
          const newVal = !!flags.addedToReviewLater;
          if (newVal && !r.addedToReviewLater) {
            // Create ReviewLaterItem if not exists
            const existing = reviewLaterItems.find(
              (it) =>
                it.questionId === r.questionId && it.sourceTestSessionId === testSessionId
            );
            if (!existing) {
              const item = {
                id: this._generateId('review_later'),
                questionId: r.questionId,
                sourceTestSessionId: testSessionId,
                examId: session.examId,
                sectionId: r.sectionId,
                addedAt: this._toISOString(new Date()),
                status: 'pending'
              };
              reviewLaterItems.push(item);
              createdReviewLaterItems.push(item);
            }
          }
          r.addedToReviewLater = newVal;
          changed = true;
        }
        if (changed) {
          updatedCount += 1;
        }
      }
    });

    this._saveToStorage('test_question_responses', responses);
    this._saveToStorage('review_later_items', reviewLaterItems);

    return {
      updatedCount,
      createdReviewLaterItems
    };
  }

  // 16) Progress filter options
  getProgressFilterOptions() {
    const exams = this._getFromStorage('exams');
    const sections = this._getFromStorage('exam_sections');

    const dateRangePresets = [
      { code: 'last_7_days', label: 'Last 7 days' },
      { code: 'last_30_days', label: 'Last 30 days' },
      { code: 'all_time', label: 'All time' }
    ];

    const sectionsByExam = exams.map((exam) => ({
      exam,
      sections: sections
        .filter((s) => s.examId === exam.id)
        .map((s) => ({
          ...s,
          exam
        }))
    }));

    return {
      dateRangePresets,
      exams,
      sectionsByExam
    };
  }

  // 17) Practice history
  getPracticeHistory(dateRangePreset, startDate, endDate, examId, sectionId, sortBy) {
    const testSessions = this._getFromStorage('test_sessions');
    const exams = this._getFromStorage('exams');
    const sections = this._getFromStorage('exam_sections');

    let fromDate = null;
    let toDate = null;

    if (startDate && endDate) {
      fromDate = this._parseDate(startDate);
      toDate = this._parseDate(endDate);
    } else if (dateRangePreset === 'last_7_days') {
      toDate = new Date();
      fromDate = new Date();
      fromDate.setDate(toDate.getDate() - 7);
    } else if (dateRangePreset === 'last_30_days') {
      toDate = new Date();
      fromDate = new Date();
      fromDate.setDate(toDate.getDate() - 30);
    }

    let sessions = testSessions.filter((s) => s.status === 'completed');

    if (fromDate && toDate) {
      const fromTime = fromDate.getTime();
      const toTime = toDate.getTime();
      sessions = sessions.filter((s) => {
        const dt = s.completedAt || s.startedAt;
        if (!dt) return false;
        const t = Date.parse(dt);
        return t >= fromTime && t <= toTime;
      });
    }

    if (examId) {
      sessions = sessions.filter((s) => s.examId === examId);
    }

    if (sectionId) {
      sessions = sessions.filter((s) => {
        if (s.primarySectionId === sectionId) return true;
        if (Array.isArray(s.includedSectionIds) && s.includedSectionIds.indexOf(sectionId) !== -1) {
          return true;
        }
        return false;
      });
    }

    if (sortBy === 'date_desc') {
      sessions = sessions.slice().sort((a, b) => {
        const da = Date.parse(a.completedAt || a.startedAt || 0) || 0;
        const db = Date.parse(b.completedAt || b.startedAt || 0) || 0;
        return db - da;
      });
    } else if (sortBy === 'score_asc') {
      sessions = sessions.slice().sort((a, b) => (a.percentCorrect || 0) - (b.percentCorrect || 0));
    } else if (sortBy === 'score_desc') {
      sessions = sessions.slice().sort((a, b) => (b.percentCorrect || 0) - (a.percentCorrect || 0));
    } else if (sortBy === 'duration_desc') {
      sessions = sessions
        .slice()
        .sort((a, b) => (b.totalTimeSpentSeconds || 0) - (a.totalTimeSpentSeconds || 0));
    }

    return sessions.map((s) => {
      const exam = exams.find((e) => e.id === s.examId) || null;
      const primarySection = s.primarySectionId
        ? sections.find((sec) => sec.id === s.primarySectionId) || null
        : null;
      const sectionNames = (s.includedSectionIds || [])
        .map((sid) => {
          const sec = sections.find((sec) => sec.id === sid);
          return sec ? sec.name : null;
        })
        .filter(Boolean);

      const decoratedSession = {
        ...s,
        exam,
        primarySection,
        includedSections: (s.includedSectionIds || [])
          .map((sid) => sections.find((sec) => sec.id === sid))
          .filter(Boolean)
      };

      return {
        testSession: decoratedSession,
        examName: exam ? exam.name : null,
        primarySectionName: primarySection ? primarySection.name : null,
        sectionNames
      };
    });
  }

  // 18) Review later list
  getReviewLaterList(examId, sectionId, status) {
    const exams = this._getFromStorage('exams');
    const sections = this._getFromStorage('exam_sections');
    const questions = this._getFromStorage('questions');
    const reviewLaterItems = this._getFromStorage('review_later_items');
    const testSessions = this._getFromStorage('test_sessions');

    let items = reviewLaterItems.slice();

    if (examId) {
      items = items.filter((it) => it.examId === examId);
    }
    if (sectionId) {
      items = items.filter((it) => it.sectionId === sectionId);
    }
    if (status) {
      items = items.filter((it) => it.status === status);
    }

    return items.map((it) => {
      const exam = exams.find((e) => e.id === it.examId) || null;
      const section = sections.find((s) => s.id === it.sectionId) || null;
      const question = questions.find((q) => q.id === it.questionId) || null;
      const session = testSessions.find((s) => s.id === it.sourceTestSessionId) || null;
      const decoratedItem = {
        ...it,
        exam,
        section,
        question,
        sourceTestSession: session
      };
      return {
        reviewLaterItem: decoratedItem,
        question,
        exam,
        section
      };
    });
  }

  // 19) Update ReviewLaterItem status
  updateReviewLaterItemStatus(reviewLaterItemIds, status) {
    const ids = Array.isArray(reviewLaterItemIds) ? reviewLaterItemIds : [];
    const items = this._getFromStorage('review_later_items');
    let updatedCount = 0;
    items.forEach((it) => {
      if (ids.indexOf(it.id) !== -1) {
        it.status = status;
        updatedCount += 1;
      }
    });
    this._saveToStorage('review_later_items', items);
    return { updatedCount };
  }

  // 20) List study plans
  listStudyPlans() {
    const studyPlans = this._getFromStorage('study_plans');
    const exams = this._getFromStorage('exams');
    const sections = this._getFromStorage('exam_sections');

    return studyPlans.map((sp) => {
      const exam = exams.find((e) => e.id === sp.examId) || null;
      const focusSections = (sp.focusSectionIds || [])
        .map((sid) => sections.find((s) => s.id === sid))
        .filter(Boolean);
      const focusSectionNames = focusSections.map((s) => s.name);

      const start = this._parseDate(sp.startDate);
      const end = this._parseDate(sp.endDate);
      let totalSessionsPlanned = 0;
      if (start && end && sp.studyDaysPerWeek) {
        const days = Math.floor((end.getTime() - start.getTime()) / (24 * 3600 * 1000)) + 1;
        const weeks = days / 7;
        totalSessionsPlanned = Math.round(weeks * sp.studyDaysPerWeek);
      }

      const decoratedPlan = {
        ...sp,
        exam,
        focusSections
      };

      return {
        studyPlan: decoratedPlan,
        examName: exam ? exam.name : null,
        focusSectionNames,
        totalSessionsPlanned
      };
    });
  }

  // 21) Study plan detail
  getStudyPlanDetail(studyPlanId) {
    const studyPlans = this._getFromStorage('study_plans');
    const plan = studyPlans.find((sp) => sp.id === studyPlanId) || null;
    if (!plan) return null;

    const exams = this._getFromStorage('exams');
    const sections = this._getFromStorage('exam_sections');
    const exam = exams.find((e) => e.id === plan.examId) || null;
    const focusSections = (plan.focusSectionIds || [])
      .map((sid) => sections.find((s) => s.id === sid))
      .filter(Boolean);

    const scheduleSessions = [];
    const start = this._parseDate(plan.startDate);
    const end = this._parseDate(plan.endDate);

    if (start && end && plan.studyDaysPerWeek > 0) {
      const totalDays = Math.floor((end.getTime() - start.getTime()) / (24 * 3600 * 1000)) + 1;
      const interval = Math.max(1, Math.floor(7 / plan.studyDaysPerWeek));
      let focusIndex = 0;

      for (let i = 0; i < totalDays; i++) {
        const current = new Date(start.getTime());
        current.setDate(start.getDate() + i);

        // simple heuristic to distribute study days
        if (i % interval === 0) {
          const section = focusSections.length
            ? focusSections[focusIndex % focusSections.length]
            : null;
          focusIndex += 1;
          scheduleSessions.push({
            date: current.toISOString().split('T')[0],
            timeOfDay: plan.preferredTimeOfDay || null,
            sectionId: section ? section.id : null,
            sectionName: section ? section.name : null,
            minutes: plan.minutesPerSession
          });
        }
      }
    }

    const decoratedPlan = {
      ...plan,
      exam,
      focusSections
    };

    return {
      studyPlan: decoratedPlan,
      exam,
      focusSections,
      scheduleSessions
    };
  }

  // 22) Create study plan
  createStudyPlan(examId, name, startDate, endDate, studyDaysPerWeek, minutesPerSession, focusSectionIds, preferredTimeOfDay) {
    const studyPlans = this._getFromStorage('study_plans');
    const studyPlan = {
      id: this._generateId('study_plan'),
      examId,
      name: name || null,
      startDate,
      endDate,
      studyDaysPerWeek,
      minutesPerSession,
      focusSectionIds: focusSectionIds || [],
      preferredTimeOfDay: preferredTimeOfDay || null,
      createdAt: this._toISOString(new Date()),
      status: 'active'
    };
    studyPlans.push(studyPlan);
    this._saveToStorage('study_plans', studyPlans);
    return { studyPlan };
  }

  // 23) Update study plan
  updateStudyPlan(studyPlanId, updates) {
    const studyPlans = this._getFromStorage('study_plans');
    const idx = studyPlans.findIndex((sp) => sp.id === studyPlanId);
    if (idx === -1) return null;

    const allowedFields = [
      'name',
      'startDate',
      'endDate',
      'studyDaysPerWeek',
      'minutesPerSession',
      'focusSectionIds',
      'preferredTimeOfDay',
      'status'
    ];

    const sp = studyPlans[idx];
    allowedFields.forEach((key) => {
      if (Object.prototype.hasOwnProperty.call(updates, key)) {
        sp[key] = updates[key];
      }
    });

    studyPlans[idx] = sp;
    this._saveToStorage('study_plans', studyPlans);
    return { studyPlan: sp };
  }

  // 24) Course filter options
  getCourseFilterOptions() {
    const exams = this._getFromStorage('exams');
    const subjects = [
      'math',
      'verbal',
      'english',
      'reading',
      'writing_language',
      'quantitative_reasoning',
      'verbal_reasoning',
      'general',
      'vocabulary'
    ];

    const difficultyLevels = ['beginner', 'intermediate', 'advanced', 'all_levels'];
    const ratingThresholds = [0, 3, 4, 4.5];
    const lessonCountOptions = [10, 20, 30, 50];
    const sortOptions = [
      { code: 'relevance', label: 'Relevance' },
      { code: 'price_asc', label: 'Price: Low to High' },
      { code: 'price_desc', label: 'Price: High to Low' },
      { code: 'rating_desc', label: 'Rating: High to Low' }
    ];

    return {
      exams,
      subjects,
      difficultyLevels,
      ratingThresholds,
      lessonCountOptions,
      sortOptions
    };
  }

  // 25) List courses
  listCourses(filters, sortBy) {
    const exams = this._getFromStorage('exams');
    const enrollments = this._getFromStorage('course_enrollments');
    const effectiveFilters = filters || {};

    let courses = this._getFromStorage('courses').filter((c) => c.isActive !== false);

    if (effectiveFilters.examId) {
      courses = courses.filter((c) => c.examId === effectiveFilters.examId);
    }

    if (effectiveFilters.subject) {
      courses = courses.filter((c) => c.subject === effectiveFilters.subject);
    }

    if (typeof effectiveFilters.minPrice === 'number') {
      courses = courses.filter((c) => c.price >= effectiveFilters.minPrice);
    }

    if (typeof effectiveFilters.maxPrice === 'number') {
      courses = courses.filter((c) => c.price <= effectiveFilters.maxPrice);
    }

    if (typeof effectiveFilters.minRating === 'number') {
      courses = courses.filter((c) => (c.rating || 0) >= effectiveFilters.minRating);
    }

    if (typeof effectiveFilters.minLessonCount === 'number') {
      courses = courses.filter((c) => (c.lessonCount || 0) >= effectiveFilters.minLessonCount);
    }

    if (effectiveFilters.difficultyLevel) {
      courses = courses.filter((c) => c.difficultyLevel === effectiveFilters.difficultyLevel);
    }

    const enrolledCourseIds = enrollments.map((e) => e.courseId);

    if (effectiveFilters.onlyEnrolled) {
      courses = courses.filter((c) => enrolledCourseIds.indexOf(c.id) !== -1);
    }

    if (sortBy === 'price_asc') {
      courses = courses.slice().sort((a, b) => (a.price || 0) - (b.price || 0));
    } else if (sortBy === 'price_desc') {
      courses = courses.slice().sort((a, b) => (b.price || 0) - (a.price || 0));
    } else if (sortBy === 'rating_desc') {
      courses = courses.slice().sort((a, b) => (b.rating || 0) - (a.rating || 0));
    }

    return courses.map((c) => {
      const exam = exams.find((e) => e.id === c.examId) || null;
      const isEnrolled = enrolledCourseIds.indexOf(c.id) !== -1;
      const decoratedCourse = {
        ...c,
        exam
      };
      return {
        course: decoratedCourse,
        examName: exam ? exam.name : null,
        isEnrolled
      };
    });
  }

  // 26) Course detail
  getCourseDetail(courseId) {
    const courses = this._getFromStorage('courses');
    const course = courses.find((c) => c.id === courseId) || null;
    if (!course) return null;

    const exams = this._getFromStorage('exams');
    const exam = exams.find((e) => e.id === course.examId) || null;

    const modulesAll = this._getFromStorage('course_modules').filter(
      (m) => m.courseId === courseId
    );
    const lessonsAll = this._getFromStorage('lessons').filter((l) => l.courseId === courseId);
    const enrollments = this._getFromStorage('course_enrollments');

    const modules = modulesAll
      .slice()
      .sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0))
      .map((m) => ({
        module: m,
        lessons: lessonsAll
          .filter((l) => l.moduleId === m.id)
          .slice()
          .sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0))
      }));

    // Lessons without module
    const ungroupedLessons = lessonsAll.filter((l) => !l.moduleId);
    if (ungroupedLessons.length > 0) {
      modules.push({
        module: {
          id: this._generateId('module_virtual'),
          courseId,
          title: 'Other Lessons',
          orderIndex: Number.MAX_SAFE_INTEGER
        },
        lessons: ungroupedLessons.slice().sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0))
      });
    }

    const totalLessonCount = lessonsAll.length;

    const enrollment = enrollments.find((e) => e.courseId === courseId) || null;
    const isEnrolled = !!enrollment;

    const decoratedCourse = {
      ...course,
      exam
    };

    return {
      course: decoratedCourse,
      exam,
      modules,
      totalLessonCount,
      isEnrolled,
      enrollment
    };
  }

  // 27) Enroll in course
  enrollInCourse(courseId) {
    const courses = this._getFromStorage('courses');
    const course = courses.find((c) => c.id === courseId) || null;
    if (!course) return null;

    const enrollments = this._getFromStorage('course_enrollments');
    let enrollment = enrollments.find((e) => e.courseId === courseId) || null;
    if (!enrollment) {
      enrollment = {
        id: this._generateId('course_enrollment'),
        courseId,
        enrolledAt: this._toISOString(new Date()),
        status: 'not_started',
        progressPercent: 0
      };
      enrollments.push(enrollment);
      this._saveToStorage('course_enrollments', enrollments);
    }

    return {
      enrollment,
      course
    };
  }

  // 28) Pricing filter options
  getPricingFilterOptions() {
    const exams = this._getFromStorage('exams');
    return {
      exams,
      billingPeriods: ['monthly', 'annual'],
      packageTypes: ['self_paced', 'tutor_led']
    };
  }

  // 29) List subscription plans
  listSubscriptionPlans(filters, sortBy) {
    const exams = this._getFromStorage('exams');
    const effectiveFilters = filters || {};

    let plans = this._getFromStorage('subscription_plans').filter((p) => p.isActive !== false);

    if (effectiveFilters.examId) {
      plans = plans.filter((p) => p.examId === effectiveFilters.examId);
    }

    if (effectiveFilters.billingPeriod) {
      plans = plans.filter((p) => p.billingPeriod === effectiveFilters.billingPeriod);
    }

    if (effectiveFilters.planType) {
      plans = plans.filter((p) => p.planType === effectiveFilters.planType);
    }

    if (typeof effectiveFilters.minFullLengthTests === 'number') {
      plans = plans.filter(
        (p) => (p.numFullLengthTests || 0) >= effectiveFilters.minFullLengthTests
      );
    }

    if (typeof effectiveFilters.includesVideoLessons === 'boolean') {
      plans = plans.filter(
        (p) => (p.includesVideoLessons || false) === effectiveFilters.includesVideoLessons
      );
    }

    if (typeof effectiveFilters.minRating === 'number') {
      plans = plans.filter((p) => (p.rating || 0) >= effectiveFilters.minRating);
    }

    if (sortBy === 'price_asc') {
      plans = plans.slice().sort((a, b) => (a.pricePerPeriod || 0) - (b.pricePerPeriod || 0));
    } else if (sortBy === 'price_desc') {
      plans = plans.slice().sort((a, b) => (b.pricePerPeriod || 0) - (a.pricePerPeriod || 0));
    } else if (sortBy === 'rating_desc') {
      plans = plans.slice().sort((a, b) => (b.rating || 0) - (a.rating || 0));
    }

    return plans.map((p) => {
      const exam = p.examId ? exams.find((e) => e.id === p.examId) || null : null;
      const decoratedPlan = {
        ...p,
        exam
      };
      return {
        plan: decoratedPlan,
        examName: exam ? exam.name : null
      };
    });
  }

  // 30) Subscription plan detail
  getSubscriptionPlanDetail(subscriptionPlanId) {
    const plans = this._getFromStorage('subscription_plans');
    const plan = plans.find((p) => p.id === subscriptionPlanId) || null;
    if (!plan) return null;
    const exams = this._getFromStorage('exams');
    const exam = plan.examId ? exams.find((e) => e.id === plan.examId) || null : null;

    const availableDurationsMonths = [1, 3, 6, 12];

    const decoratedPlan = {
      ...plan,
      exam
    };

    return {
      plan: decoratedPlan,
      exam,
      availableDurationsMonths
    };
  }

  // 31) List exam packages
  listExamPackages(filters, sortBy) {
    const exams = this._getFromStorage('exams');
    const effectiveFilters = filters || {};

    // Instrumentation for task completion tracking (task_8: task8_filterParams)
    try {
      const f = filters || {};
      if (
        f.examId === 'gmat' &&
        Array.isArray(f.packageTypes) &&
        f.packageTypes.indexOf('self_paced') !== -1 &&
        f.packageTypes.indexOf('tutor_led') !== -1 &&
        typeof f.minFullLengthTests === 'number' &&
        f.minFullLengthTests >= 8
      ) {
        localStorage.setItem(
          'task8_filterParams',
          JSON.stringify({
            examId: f.examId,
            packageTypes: f.packageTypes,
            minFullLengthTests: f.minFullLengthTests
          })
        );
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    let packages = this._getFromStorage('exam_packages').filter((p) => p.isActive !== false);

    if (effectiveFilters.examId) {
      packages = packages.filter((p) => p.examId === effectiveFilters.examId);
    }

    if (effectiveFilters.packageTypes && effectiveFilters.packageTypes.length > 0) {
      packages = packages.filter(
        (p) => effectiveFilters.packageTypes.indexOf(p.packageType) !== -1
      );
    }

    if (typeof effectiveFilters.minFullLengthTests === 'number') {
      packages = packages.filter(
        (p) => (p.numFullLengthTests || 0) >= effectiveFilters.minFullLengthTests
      );
    }

    if (typeof effectiveFilters.minRating === 'number') {
      packages = packages.filter((p) => (p.rating || 0) >= effectiveFilters.minRating);
    }

    if (sortBy === 'price_asc') {
      packages = packages.slice().sort((a, b) => (a.price || 0) - (b.price || 0));
    } else if (sortBy === 'price_desc') {
      packages = packages.slice().sort((a, b) => (b.price || 0) - (a.price || 0));
    } else if (sortBy === 'questions_desc') {
      packages = packages
        .slice()
        .sort((a, b) => (b.numPracticeQuestions || 0) - (a.numPracticeQuestions || 0));
    }

    return packages.map((p) => {
      const exam = exams.find((e) => e.id === p.examId) || null;
      const decoratedPackage = {
        ...p,
        exam
      };
      return {
        package: decoratedPackage,
        examName: exam ? exam.name : null
      };
    });
  }

  // 32) Exam package detail
  getExamPackageDetail(examPackageId) {
    const packages = this._getFromStorage('exam_packages');
    const pack = packages.find((p) => p.id === examPackageId) || null;
    if (!pack) return null;
    const exams = this._getFromStorage('exams');

    // Instrumentation for task completion tracking (task_8: task8_comparedPackageIds)
    try {
      if (
        pack.examId === 'gmat' &&
        (pack.packageType === 'self_paced' || pack.packageType === 'tutor_led') &&
        ((pack.numFullLengthTests || 0) >= 8)
      ) {
        let existing = {};
        const raw = localStorage.getItem('task8_comparedPackageIds');
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === 'object') {
              existing = parsed;
            }
          } catch (e) {
            existing = {};
          }
        }
        const key = pack.packageType === 'self_paced' ? 'self_paced' : 'tutor_led';
        if (!existing[key]) {
          const updated = {
            ...existing,
            [key]: pack.id
          };
          localStorage.setItem('task8_comparedPackageIds', JSON.stringify(updated));
        }
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    const exam = exams.find((e) => e.id === pack.examId) || null;
    const decoratedPackage = {
      ...pack,
      exam
    };
    return {
      package: decoratedPackage,
      exam
    };
  }

  // 33) Add subscription plan to cart
  addSubscriptionPlanToCart(subscriptionPlanId, durationMonths) {
    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items');
    const plans = this._getFromStorage('subscription_plans');
    const plan = plans.find((p) => p.id === subscriptionPlanId) || null;
    if (!plan) return { cart, cartItems: [] };

    let item = cartItems.find(
      (ci) => ci.cartId === cart.id && ci.itemType === 'subscription_plan' && ci.itemRefId === subscriptionPlanId
    );

    if (!item) {
      item = {
        id: this._generateId('cart_item'),
        cartId: cart.id,
        itemType: 'subscription_plan',
        itemRefId: subscriptionPlanId,
        name: plan.name,
        unitPrice: plan.pricePerPeriod,
        currency: plan.currency,
        quantity: 1,
        addedAt: this._toISOString(new Date()),
        durationMonths: durationMonths || 1
      };
      cartItems.push(item);
    } else {
      item.quantity += 1;
      if (durationMonths) {
        item.durationMonths = durationMonths;
      }
    }

    cart.updatedAt = this._toISOString(new Date());

    this._saveToStorage('cart_items', cartItems);
    const carts = this._getFromStorage('carts');
    const idx = carts.findIndex((c) => c.id === cart.id);
    if (idx !== -1) {
      carts[idx] = cart;
      this._saveToStorage('carts', carts);
    }

    return {
      cart,
      cartItems
    };
  }

  // 34) Add exam package to cart
  addExamPackageToCart(examPackageId, quantity) {
    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items');
    const packages = this._getFromStorage('exam_packages');
    const pack = packages.find((p) => p.id === examPackageId) || null;
    if (!pack) return { cart, cartItems: [] };

    // Instrumentation for task completion tracking (task_8: task8_selectedPackageId)
    try {
      if (pack.examId === 'gmat' && ((pack.numFullLengthTests || 0) >= 8)) {
        localStorage.setItem('task8_selectedPackageId', examPackageId);
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    const qty = typeof quantity === 'number' && quantity > 0 ? quantity : 1;

    let item = cartItems.find(
      (ci) => ci.cartId === cart.id && ci.itemType === 'exam_package' && ci.itemRefId === examPackageId
    );

    if (!item) {
      item = {
        id: this._generateId('cart_item'),
        cartId: cart.id,
        itemType: 'exam_package',
        itemRefId: examPackageId,
        name: pack.name,
        unitPrice: pack.price,
        currency: pack.currency,
        quantity: qty,
        addedAt: this._toISOString(new Date())
      };
      cartItems.push(item);
    } else {
      item.quantity += qty;
    }

    cart.updatedAt = this._toISOString(new Date());
    this._saveToStorage('cart_items', cartItems);
    const carts = this._getFromStorage('carts');
    const idx = carts.findIndex((c) => c.id === cart.id);
    if (idx !== -1) {
      carts[idx] = cart;
      this._saveToStorage('carts', carts);
    }

    return {
      cart,
      cartItems
    };
  }

  // 35) Cart summary
  getCartSummary() {
    const carts = this._getFromStorage('carts');
    const cartItems = this._getFromStorage('cart_items');
    const plans = this._getFromStorage('subscription_plans');
    const packages = this._getFromStorage('exam_packages');
    const courses = this._getFromStorage('courses');

    const cart = carts[0] || null;
    if (!cart) {
      return {
        cart: null,
        items: [],
        subtotal: 0,
        currency: 'USD',
        discountsApplied: [],
        total: 0
      };
    }

    const itemsForCart = cartItems.filter((ci) => ci.cartId === cart.id);

    let subtotal = 0;
    let currency = 'USD';

    const items = itemsForCart.map((ci) => {
      const base = {
        cartItem: ci,
        itemType: ci.itemType,
        subscriptionPlan: null,
        examPackage: null,
        course: null
      };
      let unitPrice = ci.unitPrice || 0;
      if (ci.itemType === 'subscription_plan') {
        const plan = plans.find((p) => p.id === ci.itemRefId) || null;
        base.subscriptionPlan = plan;
        if (plan) {
          unitPrice = plan.pricePerPeriod;
          currency = plan.currency || currency;
        }
      } else if (ci.itemType === 'exam_package') {
        const pack = packages.find((p) => p.id === ci.itemRefId) || null;
        base.examPackage = pack;
        if (pack) {
          unitPrice = pack.price;
          currency = pack.currency || currency;
        }
      } else if (ci.itemType === 'course') {
        const course = courses.find((c) => c.id === ci.itemRefId) || null;
        base.course = course;
        if (course) {
          unitPrice = course.price;
          currency = course.currency || currency;
        }
      }
      subtotal += unitPrice * (ci.quantity || 1);
      return base;
    });

    const discountsApplied = [];
    const total = subtotal; // no discounts logic implemented

    return {
      cart,
      items,
      subtotal,
      currency,
      discountsApplied,
      total
    };
  }

  // 36) Update cart item quantity
  updateCartItemQuantity(cartItemId, quantity) {
    const cartItems = this._getFromStorage('cart_items');
    const carts = this._getFromStorage('carts');
    const cart = carts[0] || null;

    const idx = cartItems.findIndex((ci) => ci.id === cartItemId);
    if (idx !== -1) {
      if (quantity <= 0) {
        cartItems.splice(idx, 1);
      } else {
        cartItems[idx].quantity = quantity;
      }
    }

    if (cart) {
      cart.updatedAt = this._toISOString(new Date());
      const cartIdx = carts.findIndex((c) => c.id === cart.id);
      if (cartIdx !== -1) {
        carts[cartIdx] = cart;
        this._saveToStorage('carts', carts);
      }
    }

    this._saveToStorage('cart_items', cartItems);

    return {
      cart,
      cartItems
    };
  }

  // 37) Remove cart item
  removeCartItem(cartItemId) {
    const cartItems = this._getFromStorage('cart_items');
    const carts = this._getFromStorage('carts');
    const cart = carts[0] || null;

    const filtered = cartItems.filter((ci) => ci.id !== cartItemId);
    this._saveToStorage('cart_items', filtered);

    if (cart) {
      cart.updatedAt = this._toISOString(new Date());
      const cartIdx = carts.findIndex((c) => c.id === cart.id);
      if (cartIdx !== -1) {
        carts[cartIdx] = cart;
        this._saveToStorage('carts', carts);
      }
    }

    return {
      cart,
      cartItems: filtered
    };
  }

  // 38) Checkout summary
  getCheckoutSummary() {
    const summary = this.getCartSummary();
    const plans = this._getFromStorage('subscription_plans');

    const items = (summary.items || []).map((item) => {
      const ci = item.cartItem;
      let availableDurationsMonths = [];
      let selectedDurationMonths = null;

      if (ci.itemType === 'subscription_plan') {
        const plan = plans.find((p) => p.id === ci.itemRefId) || null;
        if (plan) {
          availableDurationsMonths = [1, 3, 6, 12];
          selectedDurationMonths = ci.durationMonths || 1;
          item.subscriptionPlan = plan;
        }
      }

      return {
        ...item,
        availableDurationsMonths,
        selectedDurationMonths
      };
    });

    return {
      cart: summary.cart,
      items,
      total: summary.total,
      currency: summary.currency
    };
  }

  // 39) Configure subscription durations
  configureSubscriptionDurations(durations) {
    const cartItems = this._getFromStorage('cart_items');
    const carts = this._getFromStorage('carts');
    const cart = carts[0] || null;

    const durationMap = {};
    (durations || []).forEach((d) => {
      if (d.cartItemId && typeof d.durationMonths === 'number') {
        durationMap[d.cartItemId] = d.durationMonths;
      }
    });

    cartItems.forEach((ci) => {
      if (ci.itemType === 'subscription_plan' && durationMap.hasOwnProperty(ci.id)) {
        ci.durationMonths = durationMap[ci.id];
      }
    });

    if (cart) {
      cart.updatedAt = this._toISOString(new Date());
      const cartIdx = carts.findIndex((c) => c.id === cart.id);
      if (cartIdx !== -1) {
        carts[cartIdx] = cart;
        this._saveToStorage('carts', carts);
      }
    }

    this._saveToStorage('cart_items', cartItems);

    return {
      cart,
      cartItems
    };
  }

  // 40) Confirm order
  confirmOrder() {
    return this._createOrderFromCart();
  }

  // 41) Flashcard filter options
  getFlashcardFilterOptions() {
    const exams = this._getFromStorage('exams');
    const topics = ['vocabulary', 'grammar', 'idioms', 'reading', 'listening'];
    const cardCountThresholds = [50, 100, 200, 300];
    const ratingThresholds = [0, 3, 4];
    const sortOptions = [
      { code: 'rating_desc', label: 'Rating: High to Low' },
      { code: 'popularity_desc', label: 'Most Popular' },
      { code: 'newest', label: 'Newest' }
    ];

    return {
      exams,
      topics,
      cardCountThresholds,
      ratingThresholds,
      sortOptions
    };
  }

  // 42) List flashcard decks
  listFlashcardDecks(filters, sortBy) {
    const exams = this._getFromStorage('exams');
    const effectiveFilters = filters || {};

    let decks = this._getFromStorage('flashcard_decks').filter((d) => d.isActive !== false);

    if (effectiveFilters.examId) {
      decks = decks.filter((d) => d.examId === effectiveFilters.examId);
    }

    if (effectiveFilters.topic) {
      decks = decks.filter((d) => d.topic === effectiveFilters.topic);
    }

    if (typeof effectiveFilters.minCardCount === 'number') {
      decks = decks.filter((d) => (d.cardCount || 0) >= effectiveFilters.minCardCount);
    }

    if (typeof effectiveFilters.minRating === 'number') {
      decks = decks.filter((d) => (d.rating || 0) >= effectiveFilters.minRating);
    }

    if (sortBy === 'rating_desc') {
      decks = decks.slice().sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (sortBy === 'newest') {
      decks = decks
        .slice()
        .sort((a, b) => (Date.parse(b.createdAt || 0) || 0) - (Date.parse(a.createdAt || 0) || 0));
    } else if (sortBy === 'card_count_desc') {
      decks = decks.slice().sort((a, b) => (b.cardCount || 0) - (a.cardCount || 0));
    }

    return decks.map((d) => {
      const exam = exams.find((e) => e.id === d.examId) || null;
      const decoratedDeck = {
        ...d,
        exam
      };
      return {
        deck: decoratedDeck,
        examName: exam ? exam.name : null
      };
    });
  }

  // 43) Deck detail
  getDeckDetail(deckId) {
    const decks = this._getFromStorage('flashcard_decks');
    const deck = decks.find((d) => d.id === deckId) || null;
    if (!deck) return null;

    const exams = this._getFromStorage('exams');
    const exam = exams.find((e) => e.id === deck.examId) || null;

    const deckStudies = this._getFromStorage('deck_studies');
    const deckStudy = deckStudies.find((ds) => ds.deckId === deckId && ds.status !== 'archived') || null;

    const decoratedDeck = {
      ...deck,
      exam
    };

    return {
      deck: decoratedDeck,
      exam,
      isInStudyList: !!deckStudy,
      deckStudy
    };
  }

  // 44) Add deck to study list
  addDeckToStudyList(deckId) {
    const deckStudies = this._getFromStorage('deck_studies');
    let deckStudy = deckStudies.find((ds) => ds.deckId === deckId && ds.status === 'active');

    if (!deckStudy) {
      deckStudy = {
        id: this._generateId('deck_study'),
        deckId,
        addedAt: this._toISOString(new Date()),
        status: 'active',
        cardsReviewedCount: 0
      };
      deckStudies.push(deckStudy);
      this._saveToStorage('deck_studies', deckStudies);
    }

    return { deckStudy };
  }

  // 45) Start flashcard session
  startFlashcardSession(deckId, mode, plannedCardCount) {
    const decks = this._getFromStorage('flashcard_decks');
    const deck = decks.find((d) => d.id === deckId) || null;
    if (!deck) return null;

    const cards = this._getFromStorage('flashcards').filter((c) => c.deckId === deckId);

    let selectedCards = cards.slice();
    if (mode === 'random' || mode === 'spaced_repetition') {
      // shuffle
      for (let i = selectedCards.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const tmp = selectedCards[i];
        selectedCards[i] = selectedCards[j];
        selectedCards[j] = tmp;
      }
    } else {
      // ordered by insertion (assumed orderIndex maybe not present in Flashcard)
    }

    const rawPlannedCount =
      typeof plannedCardCount === 'number' && plannedCardCount > 0
        ? plannedCardCount
        : selectedCards.length;
    const count = Math.min(rawPlannedCount, selectedCards.length);
    selectedCards = selectedCards.slice(0, count);

    const flashcardSession = {
      id: this._generateId('f_session'),
      deckId,
      mode,
      plannedCardCount: rawPlannedCount,
      startedAt: this._toISOString(new Date()),
      completedAt: null,
      status: 'in_progress',
      currentIndex: 0
    };

    const sessions = this._getFromStorage('flashcard_sessions');
    sessions.push(flashcardSession);
    this._saveToStorage('flashcard_sessions', sessions);

    const sessionCards = this._getFromStorage('flashcard_session_cards');
    selectedCards.forEach((card, idx) => {
      sessionCards.push({
        id: this._generateId('f_session_card'),
        flashcardSessionId: flashcardSession.id,
        cardId: card.id,
        orderIndex: idx,
        shownAt: null,
        rating: null
      });
    });
    this._saveToStorage('flashcard_session_cards', sessionCards);

    const currentCard = selectedCards[0] || null;

    return {
      flashcardSession,
      currentCard,
      orderIndex: 0,
      totalPlannedCards: count
    };
  }

  // 46) Flashcard session state
  getFlashcardSessionState(flashcardSessionId) {
    const sessions = this._getFromStorage('flashcard_sessions');
    const session = sessions.find((s) => s.id === flashcardSessionId) || null;
    if (!session) return null;

    const decks = this._getFromStorage('flashcard_decks');
    const deck = decks.find((d) => d.id === session.deckId) || null;

    const sessionCards = this._getFromStorage('flashcard_session_cards').filter(
      (sc) => sc.flashcardSessionId === flashcardSessionId
    );

    const cards = this._getFromStorage('flashcards');

    const currentIndex = session.currentIndex || 0;
    const sc = sessionCards.find((c) => c.orderIndex === currentIndex) || null;
    const currentCard = sc ? cards.find((c) => c.id === sc.cardId) || null : null;

    return {
      flashcardSession: session,
      deck,
      currentCard,
      orderIndex: currentIndex,
      totalPlannedCards: session.plannedCardCount
    };
  }

  // 47) Submit flashcard rating
  submitFlashcardRating(flashcardSessionId, cardId, rating) {
    const sessions = this._getFromStorage('flashcard_sessions');
    const session = sessions.find((s) => s.id === flashcardSessionId) || null;
    if (!session) return null;

    const sessionCards = this._getFromStorage('flashcard_session_cards');
    const sc = sessionCards.find(
      (c) => c.flashcardSessionId === flashcardSessionId && c.cardId === cardId
    );
    if (!sc) return null;

    sc.rating = typeof rating === 'number' ? rating : null;
    sc.shownAt = this._toISOString(new Date());

    // Move to next card
    const nextIndex = (session.currentIndex || 0) + 1;
    const isSessionCompleted = nextIndex >= session.plannedCardCount;

    if (isSessionCompleted) {
      session.status = 'completed';
      session.completedAt = this._toISOString(new Date());
    } else {
      session.currentIndex = nextIndex;
    }

    // Persist
    this._saveToStorage('flashcard_session_cards', sessionCards);
    this._saveToStorage('flashcard_sessions', sessions);

    const cards = this._getFromStorage('flashcards');
    const nextCardSessionCard = sessionCards.find(
      (c) => c.flashcardSessionId === flashcardSessionId && c.orderIndex === nextIndex
    );
    const nextCard = !isSessionCompleted && nextCardSessionCard
      ? cards.find((c) => c.id === nextCardSessionCard.cardId) || null
      : null;

    return {
      updatedSessionCard: sc,
      nextCard,
      orderIndex: isSessionCompleted ? session.currentIndex : nextIndex,
      isSessionCompleted
    };
  }

  // 48) Finalize flashcard session
  finalizeFlashcardSession(flashcardSessionId) {
    const sessions = this._getFromStorage('flashcard_sessions');
    const session = sessions.find((s) => s.id === flashcardSessionId) || null;
    if (!session) return null;

    session.status = 'completed';
    if (!session.completedAt) {
      session.completedAt = this._toISOString(new Date());
    }

    const deckStudies = this._getFromStorage('deck_studies');
    let deckStudy = deckStudies.find(
      (ds) => ds.deckId === session.deckId && ds.status === 'active'
    );
    if (!deckStudy) {
      deckStudy = {
        id: this._generateId('deck_study'),
        deckId: session.deckId,
        addedAt: this._toISOString(new Date()),
        status: 'active',
        cardsReviewedCount: 0
      };
      deckStudies.push(deckStudy);
    }

    const sessionCards = this._getFromStorage('flashcard_session_cards').filter(
      (sc) => sc.flashcardSessionId === flashcardSessionId
    );
    const reviewedCount = sessionCards.filter((sc) => typeof sc.rating === 'number').length;
    deckStudy.cardsReviewedCount = (deckStudy.cardsReviewedCount || 0) + reviewedCount;

    this._saveToStorage('flashcard_sessions', sessions);
    this._saveToStorage('deck_studies', deckStudies);

    return {
      flashcardSession: session,
      deckStudy
    };
  }

  // 49) About page content
  getAboutPageContent() {
    const exams = this._getFromStorage('exams');
    const headline = 'Personalized prep for every major standardized test.';
    const body =
      'This platform helps you prepare for exams like the GRE, SAT, ACT, GMAT, TOEFL, and IELTS with practice questions, diagnostics, courses, and flashcards. All data is stored locally so you can experiment and integrate with your own UI.';
    const keyFeatures = [
      'Exam-specific practice sets and diagnostics',
      'Custom practice sessions with fine-grained controls',
      'Study planner with flexible schedules',
      'Video courses and flashcard decks',
      'Local-only data for easy prototyping and testing'
    ];

    return {
      headline,
      body,
      supportedExams: exams,
      keyFeatures
    };
  }

  // 50) Help content
  getHelpContent() {
    const faqSections = [
      {
        sectionId: 'general',
        title: 'General',
        faqs: [
          {
            question: 'Where is my data stored?',
            answer:
              'All data is stored in your localStorage for this browser or in-memory if localStorage is not available.'
          },
          {
            question: 'Can I reset everything?',
            answer:
              'You can clear your browser localStorage for this origin to reset all data created through this SDK.'
          }
        ]
      },
      {
        sectionId: 'practice',
        title: 'Practice & Diagnostics',
        faqs: [
          {
            question: 'How do timers work?',
            answer:
              'Timed sessions track a start time and compute remaining time on each call to the player state or answer submission methods.'
          }
        ]
      }
    ];

    const usageGuides = [
      {
        guideId: 'getting_started',
        title: 'Getting started',
        body:
          'Use getHomeSummary() to populate your homepage, then call the practice, courses, plans, and flashcard interfaces to build feature-specific pages.'
      }
    ];

    const contactInfo = {
      email: 'support@example.com',
      supportHours: 'Mon–Fri, 9:00–17:00 (local time)'
    };

    return {
      faqSections,
      usageGuides,
      contactInfo
    };
  }

  // 51) Submit contact request
  submitContactRequest(name, email, subject, message) {
    const contactRequests = this._getFromStorage('contact_requests');
    const req = {
      id: this._generateId('contact'),
      name,
      email,
      subject,
      message,
      createdAt: this._toISOString(new Date()),
      status: 'pending'
    };
    contactRequests.push(req);
    this._saveToStorage('contact_requests', contactRequests);
    return {
      success: true,
      message: 'Your request has been recorded.'
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
