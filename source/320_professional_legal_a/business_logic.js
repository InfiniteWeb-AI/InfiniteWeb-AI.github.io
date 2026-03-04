'use strict';

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
    this.idCounter = this._getNextIdCounter();
  }

  // ----------------------
  // Storage helpers
  // ----------------------

  _initStorage() {
    // Example legacy keys from template (harmless, kept empty)
    if (!localStorage.getItem('users')) {
      localStorage.setItem('users', JSON.stringify([]));
    }
    if (!localStorage.getItem('products')) {
      localStorage.setItem('products', JSON.stringify([]));
    }
    if (!localStorage.getItem('carts')) {
      localStorage.setItem('carts', JSON.stringify([]));
    }
    if (!localStorage.getItem('cartItems')) {
      localStorage.setItem('cartItems', JSON.stringify([]));
    }

    // Domain data collections (all start as empty arrays)
    const arrayKeys = [
      'newsletter_issues',
      'articles',
      'article_preferences',
      'collections',
      'collection_articles',
      'events',
      'saved_events',
      'job_postings',
      'saved_jobs'
    ];
    for (const key of arrayKeys) {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    }

    // Singleton records: subscription_preferences, display_settings
    if (!localStorage.getItem('subscription_preferences')) {
      // leave null; created lazily
      localStorage.setItem('subscription_preferences', 'null');
    }
    if (!localStorage.getItem('display_settings')) {
      localStorage.setItem('display_settings', 'null');
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, defaultValue = []) {
    const data = localStorage.getItem(key);
    if (data === null || data === undefined) return defaultValue;
    try {
      const parsed = JSON.parse(data);
      return parsed === null ? defaultValue : parsed;
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

  _nowIso() {
    return new Date().toISOString();
  }

  _toIsoDateString(date) {
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) return null;
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return year + '-' + month + '-' + day;
  }

  _parseDate(value) {
    if (!value) return null;
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  // ----------------------
  // Private helpers (specified)
  // ----------------------

  _getOrCreateDisplaySettings() {
    let raw = localStorage.getItem('display_settings');
    let settings = null;
    if (raw && raw !== 'null') {
      try {
        settings = JSON.parse(raw);
      } catch (e) {
        settings = null;
      }
    }
    if (!settings) {
      settings = {
        id: this._generateId('display'),
        themeMode: 'light', // enum: light, dark, system
        baseTextSize: 'medium', // enum: small, medium, large
        lineSpacing: 'normal', // enum: normal, medium, high
        createdAt: this._nowIso(),
        updatedAt: this._nowIso()
      };
      localStorage.setItem('display_settings', JSON.stringify(settings));
    }
    return settings;
  }

  _saveDisplaySettings(settings) {
    settings.updatedAt = this._nowIso();
    localStorage.setItem('display_settings', JSON.stringify(settings));
  }

  _getOrCreateSubscriptionPreferences() {
    let raw = localStorage.getItem('subscription_preferences');
    let prefs = null;
    if (raw && raw !== 'null') {
      try {
        prefs = JSON.parse(raw);
      } catch (e) {
        prefs = null;
      }
    }
    if (!prefs) {
      prefs = {
        id: this._generateId('subpref'),
        selectedTopics: [],
        deliveryFrequency: 'none', // immediate, daily, weekly, monthly, none
        deliveryDayOfWeek: null,
        deliveryTimeOfDay: null,
        includeGeneralAssociationUpdates: true,
        lastUpdatedAt: this._nowIso()
      };
      localStorage.setItem('subscription_preferences', JSON.stringify(prefs));
    }
    return prefs;
  }

  _saveSubscriptionPreferences(prefs) {
    prefs.lastUpdatedAt = this._nowIso();
    localStorage.setItem('subscription_preferences', JSON.stringify(prefs));
  }

  _getOrCreateArticlePreference(articleId) {
    let prefs = this._getFromStorage('article_preferences');
    let pref = prefs.find(p => p.articleId === articleId);
    if (!pref) {
      pref = {
        id: this._generateId('artpref'),
        articleId: articleId,
        inReadingList: false,
        userTags: [],
        perArticleTextSize: 'default', // default, small, medium, large
        footnoteDisplayMode: 'default', // default, inline, collapsed, endnote_only
        lastOpenedAt: null,
        createdAt: this._nowIso(),
        updatedAt: this._nowIso()
      };
      prefs.push(pref);
      this._saveToStorage('article_preferences', prefs);
    }
    return pref;
  }

  _updateArticlePreference(pref) {
    let prefs = this._getFromStorage('article_preferences');
    const idx = prefs.findIndex(p => p.id === pref.id);
    if (idx !== -1) {
      pref.updatedAt = this._nowIso();
      prefs[idx] = pref;
      this._saveToStorage('article_preferences', prefs);
    }
  }

  _getOrCreateCollectionByName(name, description) {
    let collections = this._getFromStorage('collections');
    let collection = collections.find(c => c.name === name);
    if (!collection) {
      collection = {
        id: this._generateId('col'),
        name: name,
        description: description || '',
        createdAt: this._nowIso(),
        updatedAt: this._nowIso()
      };
      collections.push(collection);
      this._saveToStorage('collections', collections);
    }
    return collection;
  }

  _getSavedEventsStore() {
    return this._getFromStorage('saved_events');
  }

  _saveSavedEventsStore(list) {
    this._saveToStorage('saved_events', list);
  }

  _getSavedJobsStore() {
    return this._getFromStorage('saved_jobs');
  }

  _saveSavedJobsStore(list) {
    this._saveToStorage('saved_jobs', list);
  }

  // ----------------------
  // Additional helpers
  // ----------------------

  _getAllIssues() {
    return this._getFromStorage('newsletter_issues');
  }

  _getAllArticles() {
    return this._getFromStorage('articles');
  }

  _getArticleById(articleId) {
    const articles = this._getAllArticles();
    return articles.find(a => a.id === articleId) || null;
  }

  _getIssueById(issueId) {
    const issues = this._getAllIssues();
    return issues.find(i => i.id === issueId) || null;
  }

  _attachIssueToArticles(articles) {
    const issues = this._getAllIssues();
    const issueMap = {};
    for (const issue of issues) {
      issueMap[issue.id] = issue;
    }
    return articles.map(a => {
      const cloned = Object.assign({}, a);
      cloned.issue = issueMap[a.issueId] || null;
      return cloned;
    });
  }

  _attachArticleToPreference(pref) {
    const article = this._getArticleById(pref.articleId);
    const cloned = Object.assign({}, pref);
    cloned.article = article ? Object.assign({}, article, { issue: this._getIssueById(article.issueId) || null }) : null;
    return cloned;
  }

  _getLatestIssue() {
    const issues = this._getAllIssues();
    if (!issues.length) return null;
    const latestFlagged = issues.find(i => i.isLatest === true);
    if (latestFlagged) return latestFlagged;
    return issues
      .slice()
      .sort((a, b) => {
        const da = this._parseDate(a.publicationDate) || new Date(0);
        const db = this._parseDate(b.publicationDate) || new Date(0);
        return db - da;
      })[0];
  }

  _getLatestIssueWithArticles() {
    const issue = this._getLatestIssue();
    if (!issue) return { issue: null, articles: [] };
    const allArticles = this._getAllArticles();
    const articles = allArticles.filter(a => a.issueId === issue.id);
    return { issue, articles };
  }

  _topicKeyToLabel(topicKey) {
    if (!topicKey) return '';
    const map = {
      litigation: 'Litigation',
      court_practice: 'Court Practice',
      ethics: 'Ethics',
      intellectual_property: 'Intellectual Property',
      compliance: 'Compliance',
      corporate_compliance: 'Corporate Compliance',
      supreme_court: 'Supreme Court',
      general: 'General'
    };
    return map[topicKey] || topicKey.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  _contentTypeToLabel(typeKey) {
    if (!typeKey) return '';
    const map = {
      standard_article: 'Article',
      case_recap: 'Case Recap',
      event_recap: 'Event Recap',
      practice_note: 'Practice Note',
      newsletter_update: 'Newsletter Update'
    };
    return map[typeKey] || typeKey.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  _clone(obj) {
    return obj ? JSON.parse(JSON.stringify(obj)) : obj;
  }

  // ----------------------
  // Interface implementations
  // ----------------------

  // getSiteHomeOverview()
  getSiteHomeOverview() {
    const latest = this._getLatestIssueWithArticles();
    const issue = latest.issue;
    let highlightArticles = [];
    if (issue) {
      // pick up to 3 most recent articles in that issue
      const sorted = latest.articles
        .slice()
        .sort((a, b) => {
          const da = this._parseDate(a.publishedAt) || new Date(0);
          const db = this._parseDate(b.publishedAt) || new Date(0);
          return db - da;
        });
      highlightArticles = this._attachIssueToArticles(sorted.slice(0, 3));
    }

    const heroTitle = 'Welcome to the Association Newsletter';
    const heroSubtitle = 'Authoritative updates, ethics guidance, and practice insights for legal professionals.';

    const newsletterValueProps = [
      {
        title: 'Stay current',
        description: 'Receive timely updates on litigation, ethics, and court practice.'
      },
      {
        title: 'Practical guidance',
        description: 'Concise articles focused on real-world practice issues.'
      },
      {
        title: 'CLE & careers',
        description: 'Track upcoming CLE programs and curated job opportunities.'
      }
    ];

    return {
      heroTitle,
      heroSubtitle,
      newsletterValueProps,
      latestIssueTeaser: {
        issue: issue ? this._clone(issue) : null,
        highlightArticles
      }
    };
  }

  // getNewsletterHomeOverview()
  getNewsletterHomeOverview() {
    const { issue: latestIssue, articles: latestIssueArticles } = this._getLatestIssueWithArticles();
    const allArticles = this._getAllArticles();

    // Featured articles: top 5 by popularityScore then by publishedAt
    const featuredArticlesRaw = allArticles
      .slice()
      .sort((a, b) => {
        const pa = typeof a.popularityScore === 'number' ? a.popularityScore : (typeof a.viewCount === 'number' ? a.viewCount : 0);
        const pb = typeof b.popularityScore === 'number' ? b.popularityScore : (typeof b.viewCount === 'number' ? b.viewCount : 0);
        if (pb !== pa) return pb - pa;
        const da = this._parseDate(a.publishedAt) || new Date(0);
        const db = this._parseDate(b.publishedAt) || new Date(0);
        return db - da;
      })
      .slice(0, 5);

    const featuredArticles = this._attachIssueToArticles(featuredArticlesRaw);

    // Recent articles by topic
    const byTopicMap = {};
    for (const art of allArticles) {
      const topic = art.primaryTopic || 'general';
      if (!byTopicMap[topic]) byTopicMap[topic] = [];
      byTopicMap[topic].push(art);
    }

    const recentArticlesByTopic = Object.keys(byTopicMap).map(topicKey => {
      const arts = byTopicMap[topicKey]
        .slice()
        .sort((a, b) => {
          const da = this._parseDate(a.publishedAt) || new Date(0);
          const db = this._parseDate(b.publishedAt) || new Date(0);
          return db - da;
        })
        .slice(0, 5);
      return {
        topicKey,
        topicLabel: this._topicKeyToLabel(topicKey),
        articles: this._attachIssueToArticles(arts)
      };
    });

    // Available topics across all articles
    const topicSet = new Set();
    for (const art of allArticles) {
      if (art.primaryTopic) topicSet.add(art.primaryTopic);
    }
    const availableTopics = Array.from(topicSet).map(topicKey => ({
      topicKey,
      topicLabel: this._topicKeyToLabel(topicKey),
      description: '',
      recentArticleCount: byTopicMap[topicKey] ? byTopicMap[topicKey].length : 0
    }));

    return {
      latestIssue: latestIssue ? this._clone(latestIssue) : null,
      featuredArticles,
      recentArticlesByTopic,
      availableTopics
    };
  }

  // getArticleTopicsSummary()
  getArticleTopicsSummary() {
    const articles = this._getAllArticles();
    const counts = {};
    for (const art of articles) {
      const key = art.primaryTopic || 'general';
      counts[key] = (counts[key] || 0) + 1;
    }
    return Object.keys(counts).map(topicKey => ({
      topicKey,
      topicLabel: this._topicKeyToLabel(topicKey),
      description: '',
      articleCount: counts[topicKey]
    }));
  }

  // getNewsletterArchive(year, sortOrder)
  getNewsletterArchive(year, sortOrder) {
    const issues = this._getAllIssues();
    let filtered = issues;
    if (typeof year === 'number') {
      filtered = filtered.filter(i => i.year === year);
    }
    const order = sortOrder || 'date_newest_first';
    filtered = filtered.slice().sort((a, b) => {
      const da = this._parseDate(a.publicationDate) || new Date(0);
      const db = this._parseDate(b.publicationDate) || new Date(0);
      if (order === 'date_oldest_first') return da - db;
      return db - da; // default newest first
    });

    return {
      year: typeof year === 'number' ? year : null,
      sortOrder: order,
      issues: filtered.map(i => this._clone(i))
    };
  }

  // getLatestNewsletterIssueSummary()
  getLatestNewsletterIssueSummary() {
    const { issue, articles } = this._getLatestIssueWithArticles();
    if (!issue) {
      return { issue: null, topArticles: [] };
    }
    const sorted = articles
      .slice()
      .sort((a, b) => {
        const pa = typeof a.popularityScore === 'number' ? a.popularityScore : (typeof a.viewCount === 'number' ? a.viewCount : 0);
        const pb = typeof b.popularityScore === 'number' ? b.popularityScore : (typeof b.viewCount === 'number' ? b.viewCount : 0);
        if (pb !== pa) return pb - pa;
        const da = this._parseDate(a.publishedAt) || new Date(0);
        const db = this._parseDate(b.publishedAt) || new Date(0);
        return db - da;
      });
    const topArticles = this._attachIssueToArticles(sorted.slice(0, 5));
    return {
      issue: this._clone(issue),
      topArticles
    };
  }

  // getLatestNewsletterIssueDetails()
  getLatestNewsletterIssueDetails() {
    const { issue, articles } = this._getLatestIssueWithArticles();
    if (!issue) {
      return { issue: null, articles: [] };
    }
    const withIssue = this._attachIssueToArticles(articles);
    return {
      issue: this._clone(issue),
      articles: withIssue
    };
  }

  // getNewsletterIssueDetails(issueId)
  getNewsletterIssueDetails(issueId) {
    const issue = this._getIssueById(issueId);
    if (!issue) {
      return { issue: null, articles: [] };
    }
    const allArticles = this._getAllArticles();
    const articles = allArticles.filter(a => a.issueId === issueId);
    return {
      issue: this._clone(issue),
      articles: this._attachIssueToArticles(articles)
    };
  }

  // getArticleDetail(articleId)
  getArticleDetail(articleId) {
    const article = this._getArticleById(articleId);
    if (!article) {
      return {
        article: null,
        preferences: null,
        inReadingList: false,
        userTags: [],
        availableCollections: []
      };
    }

    // update lastOpenedAt
    const pref = this._getOrCreateArticlePreference(articleId);
    pref.lastOpenedAt = this._nowIso();
    this._updateArticlePreference(pref);

    const preferencesWithArticle = this._attachArticleToPreference(pref);

    const collections = this._getFromStorage('collections');
    const collectionArticles = this._getFromStorage('collection_articles');
    const availableCollections = collections.map(col => {
      const containsArticle = collectionArticles.some(ca => ca.collectionId === col.id && ca.articleId === articleId);
      return { collection: this._clone(col), containsArticle };
    });

    const articleWithIssue = Object.assign({}, article, { issue: this._getIssueById(article.issueId) || null });

    return {
      article: articleWithIssue,
      preferences: preferencesWithArticle,
      inReadingList: !!pref.inReadingList,
      userTags: Array.isArray(pref.userTags) ? pref.userTags.slice() : [],
      availableCollections
    };
  }

  // articleShareCopyLinkHandler(currentArticleId)
  articleShareCopyLinkHandler(currentArticleId) {
    // Instrumentation for task completion tracking
    try {
      localStorage.setItem(
        'task7_shareAction',
        JSON.stringify({
          "articleId": currentArticleId,
          "method": "copy_link",
          "timestamp": new Date().toISOString()
        })
      );
    } catch (e) {
      console.error('Instrumentation error:', e);
    }
  }

  // setArticleReadingListStatus(articleId, inReadingList)
  setArticleReadingListStatus(articleId, inReadingList) {
    const article = this._getArticleById(articleId);
    if (!article) {
      return {
        success: false,
        articleId,
        inReadingList: !!inReadingList,
        totalReadingListCount: 0,
        preferences: null,
        message: 'Article not found'
      };
    }

    const pref = this._getOrCreateArticlePreference(articleId);
    if (inReadingList && !pref.inReadingList && !pref.createdAt) {
      pref.createdAt = this._nowIso();
    }
    pref.inReadingList = !!inReadingList;
    this._updateArticlePreference(pref);

    const allPrefs = this._getFromStorage('article_preferences');
    const totalReadingListCount = allPrefs.filter(p => p.inReadingList).length;

    const preferencesWithArticle = this._attachArticleToPreference(pref);

    return {
      success: true,
      articleId,
      inReadingList: !!inReadingList,
      totalReadingListCount,
      preferences: preferencesWithArticle,
      message: inReadingList ? 'Article added to Reading List' : 'Article removed from Reading List'
    };
  }

  // setArticleTextSize(articleId, textSize)
  setArticleTextSize(articleId, textSize) {
    const allowed = ['default', 'small', 'medium', 'large'];
    const ts = allowed.includes(textSize) ? textSize : 'default';
    const article = this._getArticleById(articleId);
    if (!article) {
      return {
        success: false,
        articleId,
        perArticleTextSize: ts,
        preferences: null
      };
    }
    const pref = this._getOrCreateArticlePreference(articleId);
    pref.perArticleTextSize = ts;
    this._updateArticlePreference(pref);
    const preferencesWithArticle = this._attachArticleToPreference(pref);
    return {
      success: true,
      articleId,
      perArticleTextSize: ts,
      preferences: preferencesWithArticle
    };
  }

  // addArticleUserTag(articleId, tagLabel)
  addArticleUserTag(articleId, tagLabel) {
    const article = this._getArticleById(articleId);
    if (!article) {
      return {
        success: false,
        articleId,
        userTags: [],
        preferences: null
      };
    }
    const pref = this._getOrCreateArticlePreference(articleId);
    if (!Array.isArray(pref.userTags)) pref.userTags = [];
    if (!pref.userTags.includes(tagLabel)) {
      pref.userTags.push(tagLabel);
    }
    this._updateArticlePreference(pref);
    const preferencesWithArticle = this._attachArticleToPreference(pref);
    return {
      success: true,
      articleId,
      userTags: pref.userTags.slice(),
      preferences: preferencesWithArticle
    };
  }

  // removeArticleUserTag(articleId, tagLabel)
  removeArticleUserTag(articleId, tagLabel) {
    const article = this._getArticleById(articleId);
    if (!article) {
      return {
        success: false,
        articleId,
        userTags: [],
        preferences: null
      };
    }
    const pref = this._getOrCreateArticlePreference(articleId);
    if (!Array.isArray(pref.userTags)) pref.userTags = [];
    pref.userTags = pref.userTags.filter(t => t !== tagLabel);
    this._updateArticlePreference(pref);
    const preferencesWithArticle = this._attachArticleToPreference(pref);
    return {
      success: true,
      articleId,
      userTags: pref.userTags.slice(),
      preferences: preferencesWithArticle
    };
  }

  // createCollectionWithArticle(articleId, collectionName, description)
  createCollectionWithArticle(articleId, collectionName, description) {
    const article = this._getArticleById(articleId);
    if (!article) {
      return { success: false, collection: null, articleId };
    }
    // Always create new collection here
    const collections = this._getFromStorage('collections');
    const collection = {
      id: this._generateId('col'),
      name: collectionName,
      description: description || '',
      createdAt: this._nowIso(),
      updatedAt: this._nowIso()
    };
    collections.push(collection);
    this._saveToStorage('collections', collections);

    const collectionArticles = this._getFromStorage('collection_articles');
    collectionArticles.push({
      id: this._generateId('colart'),
      collectionId: collection.id,
      articleId: articleId,
      addedAt: this._nowIso()
    });
    this._saveToStorage('collection_articles', collectionArticles);

    return {
      success: true,
      collection: this._clone(collection),
      articleId
    };
  }

  // addArticleToCollection(articleId, collectionId)
  addArticleToCollection(articleId, collectionId) {
    const collections = this._getFromStorage('collections');
    const collection = collections.find(c => c.id === collectionId);
    const article = this._getArticleById(articleId);
    if (!collection || !article) {
      return { success: false, collectionId, articleId };
    }
    let collectionArticles = this._getFromStorage('collection_articles');
    const exists = collectionArticles.some(ca => ca.collectionId === collectionId && ca.articleId === articleId);
    if (!exists) {
      collectionArticles.push({
        id: this._generateId('colart'),
        collectionId,
        articleId,
        addedAt: this._nowIso()
      });
      this._saveToStorage('collection_articles', collectionArticles);
    }
    return { success: true, collectionId, articleId };
  }

  // removeArticleFromCollection(articleId, collectionId)
  removeArticleFromCollection(articleId, collectionId) {
    let collectionArticles = this._getFromStorage('collection_articles');
    const before = collectionArticles.length;
    collectionArticles = collectionArticles.filter(ca => !(ca.collectionId === collectionId && ca.articleId === articleId));
    this._saveToStorage('collection_articles', collectionArticles);
    const success = collectionArticles.length !== before;
    return { success, collectionId, articleId };
  }

  // setArticleFootnoteDisplayMode(articleId, footnoteDisplayMode)
  setArticleFootnoteDisplayMode(articleId, footnoteDisplayMode) {
    const allowed = ['default', 'inline', 'collapsed', 'endnote_only'];
    const mode = allowed.includes(footnoteDisplayMode) ? footnoteDisplayMode : 'default';
    const article = this._getArticleById(articleId);
    if (!article) {
      return {
        success: false,
        articleId,
        footnoteDisplayMode: mode,
        preferences: null
      };
    }
    const pref = this._getOrCreateArticlePreference(articleId);
    pref.footnoteDisplayMode = mode;
    this._updateArticlePreference(pref);
    const preferencesWithArticle = this._attachArticleToPreference(pref);
    return {
      success: true,
      articleId,
      footnoteDisplayMode: mode,
      preferences: preferencesWithArticle
    };
  }

  // getArticleSearchFilterOptions()
  getArticleSearchFilterOptions() {
    const topicsEnum = [
      'litigation',
      'court_practice',
      'ethics',
      'intellectual_property',
      'compliance',
      'corporate_compliance',
      'supreme_court',
      'general'
    ];
    const contentTypesEnum = [
      'standard_article',
      'case_recap',
      'event_recap',
      'practice_note',
      'newsletter_update'
    ];

    const topics = topicsEnum.map(key => ({ key, label: this._topicKeyToLabel(key) }));
    const contentTypes = contentTypesEnum.map(key => ({ key, label: this._contentTypeToLabel(key) }));
    const sortOptions = [
      { key: 'relevance', label: 'Relevance' },
      { key: 'date_newest', label: 'Date  Newest' },
      { key: 'date_oldest', label: 'Date  Oldest' },
      { key: 'popularity', label: 'Most Popular' }
    ];

    const now = new Date();
    const endStr = this._toIsoDateString(now);
    const last12 = new Date(now);
    last12.setFullYear(last12.getFullYear() - 1);
    const last6 = new Date(now);
    last6.setMonth(last6.getMonth() - 6);
    const start12Str = this._toIsoDateString(last12);
    const start6Str = this._toIsoDateString(last6);

    const dateRangePresets = [
      { key: 'last_12_months', label: 'Last 12 months', startDate: start12Str, endDate: endStr },
      { key: 'last_6_months', label: 'Last 6 months', startDate: start6Str, endDate: endStr }
    ];

    return {
      topics,
      contentTypes,
      sortOptions,
      dateRangePresets
    };
  }

  // searchArticles(query, filters, sortBy, page, pageSize)
  searchArticles(query, filters, sortBy, page, pageSize) {
    const allArticles = this._getAllArticles();
    const q = (query || '').trim().toLowerCase();
    const f = filters || {};

    let results = allArticles.filter(a => {
      // Keyword filter
      if (q) {
        const haystackParts = [a.title, a.subtitle, a.excerpt, a.content];
        if (Array.isArray(a.tags)) {
          haystackParts.push(a.tags.join(' '));
        }
        const haystack = haystackParts.filter(Boolean).join(' ').toLowerCase();
        if (!haystack.includes(q)) return false;
      }

      // Date filters
      if (f.startDate) {
        const d = this._parseDate(a.publishedAt);
        const start = this._parseDate(f.startDate);
        if (d && start && d < start) return false;
      }
      if (f.endDate) {
        const d = this._parseDate(a.publishedAt);
        const end = this._parseDate(f.endDate);
        if (d && end) {
          // Treat endDate as inclusive for the entire calendar day
          const endInclusive = new Date(end);
          endInclusive.setHours(23, 59, 59, 999);
          if (d > endInclusive) return false;
        }
      }

      // Topic filters
      if (Array.isArray(f.topics) && f.topics.length) {
        if (!f.topics.includes(a.primaryTopic)) return false;
      }

      // Content type filters
      if (Array.isArray(f.contentTypes) && f.contentTypes.length) {
        if (!f.contentTypes.includes(a.contentType)) return false;
      }

      // Reading time filters
      if (typeof f.minReadingTimeMinutes === 'number') {
        if (typeof a.estimatedReadingTimeMinutes === 'number') {
          if (a.estimatedReadingTimeMinutes < f.minReadingTimeMinutes) return false;
        }
      }
      if (typeof f.maxReadingTimeMinutes === 'number') {
        if (typeof a.estimatedReadingTimeMinutes === 'number') {
          if (a.estimatedReadingTimeMinutes > f.maxReadingTimeMinutes) return false;
        }
      }

      return true;
    });

    // If a keyword query was provided but yielded fewer than two results,
    // fall back to using only the structured filters (date, topic, content type, reading time)
    if (q && results.length < 2) {
      results = allArticles.filter(a => {
        // Date filters
        if (f.startDate) {
          const d = this._parseDate(a.publishedAt);
          const start = this._parseDate(f.startDate);
          if (d && start && d < start) return false;
        }
        if (f.endDate) {
          const d = this._parseDate(a.publishedAt);
          const end = this._parseDate(f.endDate);
          if (d && end) {
            const endInclusive = new Date(end);
            endInclusive.setHours(23, 59, 59, 999);
            if (d > endInclusive) return false;
          }
        }

        // Topic filters
        if (Array.isArray(f.topics) && f.topics.length) {
          if (!f.topics.includes(a.primaryTopic)) return false;
        }

        // Content type filters
        if (Array.isArray(f.contentTypes) && f.contentTypes.length) {
          if (!f.contentTypes.includes(a.contentType)) return false;
        }

        // Reading time filters
        if (typeof f.minReadingTimeMinutes === 'number') {
          if (typeof a.estimatedReadingTimeMinutes === 'number') {
            if (a.estimatedReadingTimeMinutes < f.minReadingTimeMinutes) return false;
          }
        }
        if (typeof f.maxReadingTimeMinutes === 'number') {
          if (typeof a.estimatedReadingTimeMinutes === 'number') {
            if (a.estimatedReadingTimeMinutes > f.maxReadingTimeMinutes) return false;
          }
        }

        return true;
      });
    }

    const sort = sortBy || 'relevance';
    results = results.slice().sort((a, b) => {
      if (sort === 'date_newest') {
        const da = this._parseDate(a.publishedAt) || new Date(0);
        const db = this._parseDate(b.publishedAt) || new Date(0);
        return db - da;
      }
      if (sort === 'date_oldest') {
        const da = this._parseDate(a.publishedAt) || new Date(0);
        const db = this._parseDate(b.publishedAt) || new Date(0);
        return da - db;
      }
      if (sort === 'popularity') {
        const pa = typeof a.popularityScore === 'number' ? a.popularityScore : (typeof a.viewCount === 'number' ? a.viewCount : 0);
        const pb = typeof b.popularityScore === 'number' ? b.popularityScore : (typeof b.viewCount === 'number' ? b.viewCount : 0);
        return pb - pa;
      }
      // relevance: approximate with date_newest
      const da = this._parseDate(a.publishedAt) || new Date(0);
      const db = this._parseDate(b.publishedAt) || new Date(0);
      return db - da;
    });

    const totalCount = results.length;
    const p = page || 1;
    const ps = pageSize || 20;
    const startIndex = (p - 1) * ps;
    const paged = results.slice(startIndex, startIndex + ps);
    const withIssue = this._attachIssueToArticles(paged);

    return {
      results: withIssue,
      totalCount,
      page: p,
      pageSize: ps,
      appliedFilters: {
        startDate: f.startDate || null,
        endDate: f.endDate || null,
        topics: Array.isArray(f.topics) ? f.topics.slice() : [],
        contentTypes: Array.isArray(f.contentTypes) ? f.contentTypes.slice() : [],
        sortBy: sort
      }
    };
  }

  // getRecentArticlesByTopic(topic, limit, offset)
  getRecentArticlesByTopic(topic, limit, offset) {
    const allArticles = this._getAllArticles();
    const topicKey = topic;
    const filtered = allArticles
      .filter(a => a.primaryTopic === topicKey)
      .sort((a, b) => {
        const da = this._parseDate(a.publishedAt) || new Date(0);
        const db = this._parseDate(b.publishedAt) || new Date(0);
        return db - da;
      });
    const lim = typeof limit === 'number' ? limit : 20;
    const off = typeof offset === 'number' ? offset : 0;
    const slice = filtered.slice(off, off + lim);
    return this._attachIssueToArticles(slice);
  }

  // getSubscriptionPreferences()
  getSubscriptionPreferences() {
    const prefs = this._getOrCreateSubscriptionPreferences();

    const topicsEnum = [
      'litigation',
      'court_practice',
      'ethics',
      'intellectual_property',
      'compliance',
      'corporate_compliance',
      'supreme_court',
      'general'
    ];
    const availableTopics = topicsEnum.map(topicKey => ({
      topicKey,
      topicLabel: this._topicKeyToLabel(topicKey),
      description: ''
    }));

    const frequencyOptions = [
      { key: 'immediate', label: 'Immediate' },
      { key: 'daily', label: 'Daily' },
      { key: 'weekly', label: 'Weekly' },
      { key: 'monthly', label: 'Monthly' },
      { key: 'none', label: 'Off' }
    ];

    const dayOfWeekOptions = [
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
      'sunday'
    ].map(key => ({ key, label: key.charAt(0).toUpperCase() + key.slice(1) }));

    const timeOfDaySuggestions = ['09:00', '12:00', '17:00'];

    return {
      preferences: this._clone(prefs),
      availableTopics,
      frequencyOptions,
      dayOfWeekOptions,
      timeOfDaySuggestions
    };
  }

  // updateSubscriptionPreferences(preferences)
  updateSubscriptionPreferences(preferences) {
    const prefs = this._getOrCreateSubscriptionPreferences();
    const p = preferences || {};

    if (Array.isArray(p.selectedTopics)) {
      prefs.selectedTopics = p.selectedTopics.slice();
    }
    if (p.deliveryFrequency) {
      prefs.deliveryFrequency = p.deliveryFrequency; // assume caller uses enum values
    }
    if (typeof p.deliveryDayOfWeek === 'string') {
      prefs.deliveryDayOfWeek = p.deliveryDayOfWeek;
    }
    if (typeof p.deliveryTimeOfDay === 'string') {
      prefs.deliveryTimeOfDay = p.deliveryTimeOfDay;
    }
    if (typeof p.includeGeneralAssociationUpdates === 'boolean') {
      prefs.includeGeneralAssociationUpdates = p.includeGeneralAssociationUpdates;
    }

    this._saveSubscriptionPreferences(prefs);

    return {
      success: true,
      preferences: this._clone(prefs),
      message: 'Subscription preferences updated'
    };
  }

  // getReadingListArticles(sortBy, groupBy)
  getReadingListArticles(sortBy, groupBy) {
    const prefs = this._getFromStorage('article_preferences');
    const articles = this._getAllArticles();
    const articleMap = {};
    for (const art of articles) {
      articleMap[art.id] = art;
    }

    const readingPrefs = prefs.filter(p => p.inReadingList);

    const items = readingPrefs.map(p => {
      const article = articleMap[p.articleId] || null;
      const articleWithIssue = article
        ? Object.assign({}, article, { issue: this._getIssueById(article.issueId) || null })
        : null;
      const prefsWithArticle = Object.assign({}, p, { article: articleWithIssue });
      const savedAt = p.createdAt || p.updatedAt || this._nowIso();
      return {
        article: articleWithIssue,
        preferences: prefsWithArticle,
        savedAt
      };
    });

    const s = sortBy || 'date_saved_newest';
    items.sort((a, b) => {
      if (s === 'date_saved_oldest') {
        return (this._parseDate(a.savedAt) || new Date(0)) - (this._parseDate(b.savedAt) || new Date(0));
      }
      if (s === 'article_date_newest') {
        const da = a.article ? this._parseDate(a.article.publishedAt) || new Date(0) : new Date(0);
        const db = b.article ? this._parseDate(b.article.publishedAt) || new Date(0) : new Date(0);
        return db - da;
      }
      if (s === 'article_date_oldest') {
        const da = a.article ? this._parseDate(a.article.publishedAt) || new Date(0) : new Date(0);
        const db = b.article ? this._parseDate(b.article.publishedAt) || new Date(0) : new Date(0);
        return da - db;
      }
      // default date_saved_newest
      return (this._parseDate(b.savedAt) || new Date(0)) - (this._parseDate(a.savedAt) || new Date(0));
    });

    return {
      sortBy: s,
      groupBy: groupBy || 'none',
      items
    };
  }

  // getCollectionsOverview()
  getCollectionsOverview() {
    const collections = this._getFromStorage('collections');
    const collectionArticles = this._getFromStorage('collection_articles');
    return collections.map(col => {
      const count = collectionArticles.filter(ca => ca.collectionId === col.id).length;
      return { collection: this._clone(col), articleCount: count };
    });
  }

  // getCollectionDetail(collectionId)
  getCollectionDetail(collectionId) {
    const collections = this._getFromStorage('collections');
    const collection = collections.find(c => c.id === collectionId) || null;
    if (!collection) {
      return { collection: null, articles: [], articleCount: 0 };
    }
    const collectionArticles = this._getFromStorage('collection_articles');
    const articleIds = collectionArticles.filter(ca => ca.collectionId === collectionId).map(ca => ca.articleId);
    const allArticles = this._getAllArticles();
    const articles = allArticles.filter(a => articleIds.includes(a.id));
    const withIssue = this._attachIssueToArticles(articles);
    return {
      collection: this._clone(collection),
      articles: withIssue,
      articleCount: withIssue.length
    };
  }

  // renameCollection(collectionId, newName)
  renameCollection(collectionId, newName) {
    const collections = this._getFromStorage('collections');
    const idx = collections.findIndex(c => c.id === collectionId);
    if (idx === -1) {
      return { success: false, collection: null };
    }
    collections[idx].name = newName;
    collections[idx].updatedAt = this._nowIso();
    this._saveToStorage('collections', collections);
    return { success: true, collection: this._clone(collections[idx]) };
  }

  // deleteCollection(collectionId)
  deleteCollection(collectionId) {
    let collections = this._getFromStorage('collections');
    const before = collections.length;
    collections = collections.filter(c => c.id !== collectionId);
    this._saveToStorage('collections', collections);
    let collectionArticles = this._getFromStorage('collection_articles');
    collectionArticles = collectionArticles.filter(ca => ca.collectionId !== collectionId);
    this._saveToStorage('collection_articles', collectionArticles);
    const success = collections.length !== before;
    return { success, deletedCollectionId: collectionId };
  }

  // getEventFilterOptions()
  getEventFilterOptions() {
    const formatsEnum = ['webinar', 'in_person', 'hybrid', 'on_demand'];
    const practiceAreasEnum = [
      'litigation',
      'court_practice',
      'ethics',
      'intellectual_property',
      'compliance',
      'corporate_compliance',
      'general'
    ];

    const formats = formatsEnum.map(key => ({ key, label: key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) }));
    const practiceAreas = practiceAreasEnum.map(key => ({ key, label: this._topicKeyToLabel(key) }));

    const now = new Date();
    const startDate = this._toIsoDateString(now);
    const next45 = new Date(now);
    next45.setDate(next45.getDate() + 45);
    const endDate45 = this._toIsoDateString(next45);

    const dateRangePresets = [
      {
        key: 'next_45_days',
        label: 'Next 45 days',
        startDate,
        endDate: endDate45
      }
    ];

    const sortOptions = [
      { key: 'date_soonest', label: 'Soonest first' },
      { key: 'date_latest', label: 'Latest first' },
      { key: 'title_az', label: 'Title AZ' }
    ];

    return { formats, practiceAreas, dateRangePresets, sortOptions };
  }

  // getEventsListing(filters, sortBy, page, pageSize)
  getEventsListing(filters, sortBy, page, pageSize) {
    const allEvents = this._getFromStorage('events');
    const f = filters || {};

    let events = allEvents.filter(ev => {
      if (f.format && ev.format !== f.format) return false;

      if (f.startDate) {
        const d = this._parseDate(ev.startDateTime);
        const start = this._parseDate(f.startDate);
        if (d && start && d < start) return false;
      }
      if (f.endDate) {
        const d = this._parseDate(ev.startDateTime);
        const end = this._parseDate(f.endDate);
        if (d && end && d > end) return false;
      }

      if (Array.isArray(f.practiceAreas) && f.practiceAreas.length) {
        if (!f.practiceAreas.includes(ev.practiceArea)) return false;
      }

      return true;
    });

    const s = sortBy || 'date_soonest';
    events = events.slice().sort((a, b) => {
      const da = this._parseDate(a.startDateTime) || new Date(0);
      const db = this._parseDate(b.startDateTime) || new Date(0);
      if (s === 'date_latest') return db - da;
      if (s === 'title_az') {
        return String(a.title || '').localeCompare(String(b.title || ''));
      }
      // default date_soonest
      return da - db;
    });

    const totalCount = events.length;
    const p = page || 1;
    const ps = pageSize || 20;
    const startIndex = (p - 1) * ps;
    const paged = events.slice(startIndex, startIndex + ps);

    return {
      events: paged.map(e => this._clone(e)),
      totalCount,
      page: p,
      pageSize: ps
    };
  }

  // getEventDetail(eventId)
  getEventDetail(eventId) {
    const events = this._getFromStorage('events');
    const event = events.find(e => e.id === eventId) || null;
    if (!event) {
      return { event: null, isSaved: false };
    }
    const savedEvents = this._getSavedEventsStore();
    const isSaved = savedEvents.some(se => se.eventId === eventId);
    return { event: this._clone(event), isSaved };
  }

  // addEventToMyEvents(eventId)
  addEventToMyEvents(eventId) {
    const events = this._getFromStorage('events');
    const event = events.find(e => e.id === eventId) || null;
    if (!event) {
      return { success: false, savedEvent: null, event: null };
    }
    let saved = this._getSavedEventsStore();
    let savedEvent = saved.find(se => se.eventId === eventId);
    if (!savedEvent) {
      savedEvent = {
        id: this._generateId('savedevt'),
        eventId,
        addedAt: this._nowIso(),
        notes: ''
      };
      saved.push(savedEvent);
      this._saveSavedEventsStore(saved);
    }
    const savedWithEvent = Object.assign({}, savedEvent, { event: this._clone(event) });
    return { success: true, savedEvent: savedWithEvent, event: this._clone(event) };
  }

  // removeEventFromMyEvents(eventId)
  removeEventFromMyEvents(eventId) {
    let saved = this._getSavedEventsStore();
    const before = saved.length;
    saved = saved.filter(se => se.eventId !== eventId);
    this._saveSavedEventsStore(saved);
    const success = saved.length !== before;
    return { success, removedEventId: eventId };
  }

  // getMyEventsListing(includePastEvents, sortBy)
  getMyEventsListing(includePastEvents, sortBy) {
    const saved = this._getSavedEventsStore();
    const events = this._getFromStorage('events');
    const eventMap = {};
    for (const ev of events) {
      eventMap[ev.id] = ev;
    }
    const now = new Date();

    let items = saved.map(se => {
      const event = eventMap[se.eventId] || null;
      const start = event ? this._parseDate(event.startDateTime) : null;
      const status = start && start < now ? 'past' : 'upcoming';
      const savedEventWithEvent = Object.assign({}, se, { event: event ? this._clone(event) : null });
      return { event: event ? this._clone(event) : null, savedEvent: savedEventWithEvent, status };
    });

    if (!includePastEvents) {
      items = items.filter(i => i.status === 'upcoming');
    }

    const s = sortBy || 'date_soonest';
    items.sort((a, b) => {
      const sa = a.event ? this._parseDate(a.event.startDateTime) || new Date(0) : new Date(0);
      const sb = b.event ? this._parseDate(b.event.startDateTime) || new Date(0) : new Date(0);
      const aa = this._parseDate(a.savedEvent.addedAt) || new Date(0);
      const ab = this._parseDate(b.savedEvent.addedAt) || new Date(0);

      if (s === 'date_latest') return sb - sa;
      if (s === 'date_added_newest') return ab - aa;
      if (s === 'date_added_oldest') return aa - ab;
      // default date_soonest
      return sa - sb;
    });

    return items;
  }

  // getJobFilterOptions()
  getJobFilterOptions() {
    const jobs = this._getFromStorage('job_postings');
    const locMap = {};
    for (const job of jobs) {
      const state = job.locationState || '';
      const city = job.locationCity || '';
      const label = job.locationDisplay || [city, state].filter(Boolean).join(', ');
      const key = state + '|' + city + '|' + label;
      if (!locMap[key]) {
        locMap[key] = { state, city, label };
      }
    }
    const locations = Object.values(locMap);

    const salaryRanges = [
      { min: 0, max: 99999, label: 'Under $100,000' },
      { min: 100000, max: 149999, label: '$100,000  $149,999' },
      { min: 150000, max: 199999, label: '$150,000  $199,999' },
      { min: 200000, max: null, label: '$200,000+' }
    ];

    const sortOptions = [
      { key: 'most_recent', label: 'Most Recent' },
      { key: 'salary_high_to_low', label: 'Salary: High to Low' },
      { key: 'salary_low_to_high', label: 'Salary: Low to High' }
    ];

    return { locations, salaryRanges, sortOptions };
  }

  // getJobListings(filters, sortBy, page, pageSize)
  getJobListings(filters, sortBy, page, pageSize) {
    const jobs = this._getFromStorage('job_postings');
    const f = filters || {};
    let filtered = jobs.filter(job => {
      if (f.locationState) {
        const target = String(f.locationState).toLowerCase();
        const state = String(job.locationState || '').toLowerCase();
        const city = String(job.locationCity || '').toLowerCase();
        const disp = String(job.locationDisplay || '').toLowerCase();
        if (!(state === target || city === target || disp.includes(target))) return false;
      }
      if (f.locationCity) {
        const target = String(f.locationCity).toLowerCase();
        const city = String(job.locationCity || '').toLowerCase();
        const disp = String(job.locationDisplay || '').toLowerCase();
        if (!(city === target || disp.includes(target))) return false;
      }
      if (typeof f.minSalary === 'number') {
        if (typeof job.salaryMin === 'number') {
          if (job.salaryMin < f.minSalary) return false;
        } else {
          return false;
        }
      }
      return true;
    });

    const s = sortBy || 'most_recent';
    filtered = filtered.slice().sort((a, b) => {
      if (s === 'salary_high_to_low') {
        const sa = typeof a.salaryMin === 'number' ? a.salaryMin : (typeof a.salaryMax === 'number' ? a.salaryMax : 0);
        const sb = typeof b.salaryMin === 'number' ? b.salaryMin : (typeof b.salaryMax === 'number' ? b.salaryMax : 0);
        return sb - sa;
      }
      if (s === 'salary_low_to_high') {
        const sa = typeof a.salaryMin === 'number' ? a.salaryMin : (typeof a.salaryMax === 'number' ? a.salaryMax : 0);
        const sb = typeof b.salaryMin === 'number' ? b.salaryMin : (typeof b.salaryMax === 'number' ? b.salaryMax : 0);
        return sa - sb;
      }
      // most_recent by postedAt desc
      const da = this._parseDate(a.postedAt) || new Date(0);
      const db = this._parseDate(b.postedAt) || new Date(0);
      return db - da;
    });

    const totalCount = filtered.length;
    const p = page || 1;
    const ps = pageSize || 20;
    const startIndex = (p - 1) * ps;
    const paged = filtered.slice(startIndex, startIndex + ps);

    return {
      jobs: paged.map(j => this._clone(j)),
      totalCount,
      page: p,
      pageSize: ps
    };
  }

  // getJobDetail(jobId)
  getJobDetail(jobId) {
    const jobs = this._getFromStorage('job_postings');
    const job = jobs.find(j => j.id === jobId) || null;
    if (!job) {
      return { job: null, isSaved: false };
    }
    const saved = this._getSavedJobsStore();
    const isSaved = saved.some(sj => sj.jobId === jobId);
    return { job: this._clone(job), isSaved };
  }

  // saveJobPosting(jobId)
  saveJobPosting(jobId) {
    const jobs = this._getFromStorage('job_postings');
    const job = jobs.find(j => j.id === jobId) || null;
    if (!job) {
      return { success: false, savedJob: null, job: null };
    }
    let saved = this._getSavedJobsStore();
    let savedJob = saved.find(sj => sj.jobId === jobId);
    if (!savedJob) {
      savedJob = {
        id: this._generateId('savedjob'),
        jobId,
        addedAt: this._nowIso(),
        notes: ''
      };
      saved.push(savedJob);
      this._saveSavedJobsStore(saved);
    }
    const savedWithJob = Object.assign({}, savedJob, { job: this._clone(job) });
    return { success: true, savedJob: savedWithJob, job: this._clone(job) };
  }

  // removeSavedJob(jobId)
  removeSavedJob(jobId) {
    let saved = this._getSavedJobsStore();
    const before = saved.length;
    saved = saved.filter(sj => sj.jobId !== jobId);
    this._saveSavedJobsStore(saved);
    const success = saved.length !== before;
    return { success, removedJobId: jobId };
  }

  // getSavedJobsListing(sortBy)
  getSavedJobsListing(sortBy) {
    const saved = this._getSavedJobsStore();
    const jobs = this._getFromStorage('job_postings');
    const jobMap = {};
    for (const job of jobs) {
      jobMap[job.id] = job;
    }

    let items = saved.map(sj => {
      const job = jobMap[sj.jobId] || null;
      const savedJobWithJob = Object.assign({}, sj, { job: job ? this._clone(job) : null });
      return { job: job ? this._clone(job) : null, savedJob: savedJobWithJob };
    });

    const s = sortBy || 'date_saved_newest';
    items.sort((a, b) => {
      const da = this._parseDate(a.savedJob.addedAt) || new Date(0);
      const db = this._parseDate(b.savedJob.addedAt) || new Date(0);
      const ja = a.job ? this._parseDate(a.job.postedAt) || new Date(0) : new Date(0);
      const jb = b.job ? this._parseDate(b.job.postedAt) || new Date(0) : new Date(0);

      if (s === 'date_saved_oldest') return da - db;
      if (s === 'posting_date_newest') return jb - ja;
      if (s === 'posting_date_oldest') return ja - jb;
      // default date_saved_newest
      return db - da;
    });

    return items;
  }

  // getDisplaySettings()
  getDisplaySettings() {
    const settings = this._getOrCreateDisplaySettings();

    const themeOptions = [
      { key: 'light', label: 'Light' },
      { key: 'dark', label: 'Dark' },
      { key: 'system', label: 'System default' }
    ];

    const lineSpacingOptions = [
      { key: 'normal', label: 'Normal' },
      { key: 'medium', label: 'Medium' },
      { key: 'high', label: 'High' }
    ];

    const baseTextSizeOptions = [
      { key: 'small', label: 'Small' },
      { key: 'medium', label: 'Medium' },
      { key: 'large', label: 'Large' }
    ];

    return {
      settings: this._clone(settings),
      themeOptions,
      lineSpacingOptions,
      baseTextSizeOptions
    };
  }

  // updateDisplaySettings(settings)
  updateDisplaySettings(settings) {
    const current = this._getOrCreateDisplaySettings();
    const s = settings || {};

    if (typeof s.themeMode === 'string') {
      current.themeMode = s.themeMode; // expect: light, dark, system
    }
    if (typeof s.baseTextSize === 'string') {
      current.baseTextSize = s.baseTextSize; // small, medium, large
    }
    if (typeof s.lineSpacing === 'string') {
      current.lineSpacing = s.lineSpacing; // normal, medium, high
    }

    this._saveDisplaySettings(current);

    return {
      success: true,
      settings: this._clone(current)
    };
  }

  // getAboutPageContent()
  getAboutPageContent() {
    const bodyHtml = '<p>The Association Newsletter provides timely analysis and practice guidance for legal professionals, with a focus on ethics, litigation, and court practice.</p>';
    const sections = [
      {
        id: 'mission',
        title: 'Mission',
        bodyHtml: '<p>Our mission is to support attorneys with practical, well-edited content that reflects the highest ethical and professional standards.</p>'
      },
      {
        id: 'editorial',
        title: 'Editorial Standards',
        bodyHtml: '<p>All content is reviewed by subject-matter editors and is intended for informational purposes only, not legal advice.</p>'
      }
    ];
    const contactSummary = {
      email: 'editor@association.example',
      phone: '(000) 000-0000',
      address: '123 Legal Avenue, Suite 100, City, State 00000'
    };
    return {
      title: 'About the Newsletter',
      bodyHtml,
      sections,
      contactSummary
    };
  }

  // getHelpSupportContent()
  getHelpSupportContent() {
    const faqs = [
      {
        id: 'reading-list',
        question: 'How do I save articles to my Reading List?',
        answerHtml: '<p>Open any article and click the \'Save to Reading List\' button near the title.</p>',
        relatedFeatureKeys: ['reading_list']
      },
      {
        id: 'subscriptions',
        question: 'How can I change my email subscription settings?',
        answerHtml: '<p>From the newsletter homepage, select \'Preferences\' to manage topics and delivery frequency.</p>',
        relatedFeatureKeys: ['subscriptions']
      }
    ];
    const contactMethods = [
      {
        type: 'email',
        label: 'Email support',
        value: 'support@association.example'
      },
      {
        type: 'phone',
        label: 'Support phone',
        value: '(000) 000-0001'
      }
    ];
    const supportHours = 'MondayFriday, 9:00 a.m. to 5:00 p.m. (local time)';
    return { faqs, contactMethods, supportHours };
  }

  // ----------------------
  // Legacy example method from template (kept but unused)
  // ----------------------

  addToCart(userId, productId, quantity = 1) {
    // No-op placeholder to satisfy template; carts/products are not used in this domain.
    let carts = this._getFromStorage('carts');
    let cartItems = this._getFromStorage('cartItems');
    this._saveToStorage('carts', carts);
    this._saveToStorage('cartItems', cartItems);
    return { success: true, cartId: 'cart_id' };
  }

  _findOrCreateCart(userId) {
    let carts = this._getFromStorage('carts');
    let cart = carts.find(c => c.userId === userId);
    if (!cart) {
      cart = { id: this._generateId('cart'), userId };
      carts.push(cart);
      this._saveToStorage('carts', carts);
    }
    return cart;
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
