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
  }

  _initStorage() {
    // Initialize all data tables in localStorage if not exist
    const keys = [
      'articles',
      'journals',
      'journal_issues',
      'datasets',
      'dataset_files',
      'reading_lists',
      'reading_list_items',
      'collections',
      'collection_items',
      'saved_search_alerts',
      'submission_guidelines',
      'article_fulltexts'
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

  _findById(arr, id) {
    return arr.find((item) => item.id === id) || null;
  }

  // Helper to apply article search filters and sorting
  _applyArticleSearchFilters(articles, options) {
    const {
      queryString,
      publicationYearMin,
      publicationYearMax,
      subjectAreas,
      articleTypes,
      accessTypes,
      licenses,
      hasOpenData,
      sortOption
    } = options || {};

    let results = Array.isArray(articles) ? articles.slice() : [];

    const journals = this._getFromStorage('journals', []);
    const journalById = {};
    journals.forEach((j) => {
      journalById[j.id] = j;
    });

    const q = (queryString || '').trim().toLowerCase();
    const hasQuery = q.length > 0;
    const qTokens = hasQuery ? q.split(/\s+/).filter(Boolean) : [];

    results = results.filter((article) => {
      if (!article || typeof article !== 'object') return false;

      // Query string relevance filter (basic substring check)
      if (hasQuery) {
        const textParts = [];
        if (article.title) textParts.push(article.title);
        if (article.abstract) textParts.push(article.abstract);
        if (Array.isArray(article.keywords)) textParts.push(article.keywords.join(' '));
        // Also search in subject areas and journal metadata so that domain
        // terms like "neuroscience" match even if not in title/abstract.
        if (Array.isArray(article.subjectAreas)) textParts.push(article.subjectAreas.join(' '));
        if (article.journalTitle) textParts.push(article.journalTitle);
        const journal = journalById[article.journalId];
        if (journal) {
          if (journal.title) textParts.push(journal.title);
          if (Array.isArray(journal.subjectAreas)) textParts.push(journal.subjectAreas.join(' '));
        }
        const text = textParts.join(' ').toLowerCase();
        if (!qTokens.every((token) => text.includes(token))) {
          return false;
        }
      }

      // Publication year range
      if (typeof publicationYearMin === 'number' && article.publicationYear < publicationYearMin) {
        return false;
      }
      if (typeof publicationYearMax === 'number' && article.publicationYear > publicationYearMax) {
        return false;
      }

      // Subject areas with hierarchical consideration (article + journal)
      if (Array.isArray(subjectAreas) && subjectAreas.length > 0) {
        const articleSubjects = Array.isArray(article.subjectAreas) ? article.subjectAreas : [];
        const journal = journalById[article.journalId];
        const journalSubjects = journal && Array.isArray(journal.subjectAreas) ? journal.subjectAreas : [];
        const combinedSubjects = Array.from(new Set([...articleSubjects, ...journalSubjects]));
        const matchesSubject = subjectAreas.some((sa) => combinedSubjects.includes(sa));
        if (!matchesSubject) return false;
      }

      // Article types
      if (Array.isArray(articleTypes) && articleTypes.length > 0) {
        if (!articleTypes.includes(article.articleType)) {
          return false;
        }
      }

      // Access types
      if (Array.isArray(accessTypes) && accessTypes.length > 0) {
        if (!accessTypes.includes(article.accessType)) {
          return false;
        }
      }

      // Licenses
      if (Array.isArray(licenses) && licenses.length > 0) {
        if (!licenses.includes(article.license)) {
          return false;
        }
      }

      // Open data flag
      if (typeof hasOpenData === 'boolean') {
        if (hasOpenData && !article.hasOpenData) return false;
        if (!hasOpenData && article.hasOpenData) return false;
      }

      return true;
    });

    // Sorting
    const sortKey = sortOption || 'relevance';

    if (sortKey === 'citations_desc') {
      results.sort((a, b) => (b.citationCount || 0) - (a.citationCount || 0));
    } else if (sortKey === 'publication_date_newest') {
      results.sort((a, b) => {
        const da = a.publicationDate ? Date.parse(a.publicationDate) : 0;
        const db = b.publicationDate ? Date.parse(b.publicationDate) : 0;
        return db - da;
      });
    } else if (sortKey === 'sample_size_desc') {
      results.sort((a, b) => (b.sampleSize || 0) - (a.sampleSize || 0));
    } else {
      // 'relevance' or default: simple relevance score based on query tokens, then citations, then date
      if (hasQuery) {
        results = results
          .map((article) => {
            const textParts = [];
            if (article.title) textParts.push(article.title);
            if (article.abstract) textParts.push(article.abstract);
            if (Array.isArray(article.keywords)) textParts.push(article.keywords.join(' '));
            const text = textParts.join(' ').toLowerCase();
            let score = 0;
            qTokens.forEach((token) => {
              if (text.includes(token)) score += 1;
            });
            return { article, score };
          })
          .sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score;
            const bc = b.article.citationCount || 0;
            const ac = a.article.citationCount || 0;
            if (bc !== ac) return bc - ac;
            const da = a.article.publicationDate ? Date.parse(a.article.publicationDate) : 0;
            const db = b.article.publicationDate ? Date.parse(b.article.publicationDate) : 0;
            return db - da;
          })
          .map((x) => x.article);
      } else {
        // No query; default to most recent by publication date
        results.sort((a, b) => {
          const da = a.publicationDate ? Date.parse(a.publicationDate) : 0;
          const db = b.publicationDate ? Date.parse(b.publicationDate) : 0;
          return db - da;
        });
      }
    }

    return results;
  }

  // Helper to paginate arrays
  _paginateResults(items, pageNumber, pageSize) {
    const totalCount = Array.isArray(items) ? items.length : 0;
    const page = Math.max(1, pageNumber || 1);
    const size = Math.max(1, pageSize || 20);
    const start = (page - 1) * size;
    const results = (items || []).slice(start, start + size);
    return {
      totalCount,
      pageNumber: page,
      pageSize: size,
      results
    };
  }

  // Helper: resolve Article foreign keys (journalId, issueId)
  _resolveArticleRelations(article) {
    if (!article) return null;
    const journals = this._getFromStorage('journals', []);
    const issues = this._getFromStorage('journal_issues', []);
    const journal = journals.find((j) => j.id === article.journalId) || null;
    const issue = article.issueId ? issues.find((i) => i.id === article.issueId) || null : null;
    return Object.assign({}, article, { journal, issue });
  }

  // Helper: resolve JournalIssue foreign keys (journalId)
  _resolveIssueRelations(issue) {
    if (!issue) return null;
    const journals = this._getFromStorage('journals', []);
    const journal = journals.find((j) => j.id === issue.journalId) || null;
    return Object.assign({}, issue, { journal });
  }

  // Helper: get or create ReadingList by name (private)
  _getOrCreateReadingListByName(name) {
    const trimmedName = (name || '').trim() || 'Reading List';
    let lists = this._getFromStorage('reading_lists', []);
    let existing = lists.find((l) => l.name === trimmedName);
    if (existing) return existing;

    const now = this._now();
    const newList = {
      id: this._generateId('rl'),
      name: trimmedName,
      description: '',
      createdAt: now,
      updatedAt: now
    };
    lists.push(newList);
    this._saveToStorage('reading_lists', lists);
    return newList;
  }

  // Helper: get or create Collection by name (private)
  _getOrCreateCollectionByName(name) {
    const trimmedName = (name || '').trim() || 'Collection';
    let collections = this._getFromStorage('collections', []);
    let existing = collections.find((c) => c.name === trimmedName);
    if (existing) return existing;

    const now = this._now();
    const newCollection = {
      id: this._generateId('col'),
      name: trimmedName,
      description: '',
      exportNotes: '',
      createdAt: now,
      updatedAt: now
    };
    collections.push(newCollection);
    this._saveToStorage('collections', collections);
    return newCollection;
  }

  // Helper: persist or update SavedSearchAlert
  _persistSavedSearchAlert(alert) {
    let alerts = this._getFromStorage('saved_search_alerts', []);
    const index = alerts.findIndex((a) => a.id === alert.id);
    if (index >= 0) {
      alerts[index] = alert;
    } else {
      alerts.push(alert);
    }
    this._saveToStorage('saved_search_alerts', alerts);
    return alert;
  }

  // =========================
  // Core interface implementations
  // =========================

  // getHomePageHighlights
  getHomePageHighlights() {
    const articles = this._getFromStorage('articles', []);
    const journals = this._getFromStorage('journals', []);
    const issues = this._getFromStorage('journal_issues', []);

    const featuredArticlesRaw = articles
      .slice()
      .sort((a, b) => (b.citationCount || 0) - (a.citationCount || 0))
      .slice(0, 5);
    const featuredArticles = featuredArticlesRaw.map((a) => this._resolveArticleRelations(a));

    const featuredJournals = journals
      .slice()
      .sort((a, b) => (b.impactFactor || 0) - (a.impactFactor || 0))
      .slice(0, 5);

    const recentIssuesRaw = issues
      .slice()
      .sort((a, b) => {
        const da = a.publicationDate ? Date.parse(a.publicationDate) : 0;
        const db = b.publicationDate ? Date.parse(b.publicationDate) : 0;
        if (db !== da) return db - da;
        return (b.year || 0) - (a.year || 0);
      })
      .slice(0, 5);
    const recentIssues = recentIssuesRaw.map((i) => this._resolveIssueRelations(i));

    return { featuredArticles, featuredJournals, recentIssues };
  }

  // getSearchFilterOptions
  getSearchFilterOptions() {
    const subjectAreas = [
      { key: 'neuroscience', label: 'Neuroscience' },
      { key: 'environmental_science', label: 'Environmental Science' },
      { key: 'public_health', label: 'Public Health' },
      { key: 'medicine', label: 'Medicine' },
      { key: 'computer_science', label: 'Computer Science' },
      { key: 'cardiology', label: 'Cardiology' }
    ];

    const articleTypes = [
      { key: 'research_article', label: 'Research Article' },
      { key: 'clinical_trial', label: 'Clinical Trial' },
      { key: 'review_article', label: 'Review Article' },
      { key: 'editorial', label: 'Editorial' },
      { key: 'commentary', label: 'Commentary' },
      { key: 'other', label: 'Other' }
    ];

    const accessTypes = [
      { key: 'open_access', label: 'Open Access' },
      { key: 'subscription', label: 'Subscription' },
      { key: 'restricted', label: 'Restricted' }
    ];

    const licenses = [
      { key: 'cc_by', label: 'CC BY' },
      { key: 'cc_by_nc', label: 'CC BY-NC' },
      { key: 'cc_by_sa', label: 'CC BY-SA' },
      { key: 'cc_by_nd', label: 'CC BY-ND' },
      { key: 'cc0', label: 'CC0' },
      { key: 'other_open_license', label: 'Other Open License' }
    ];

    const sortOptions = [
      { key: 'relevance', label: 'Relevance', isDefault: true },
      { key: 'citations_desc', label: 'Citations - High to Low', isDefault: false },
      { key: 'publication_date_newest', label: 'Publication Date - Newest First', isDefault: false },
      { key: 'sample_size_desc', label: 'Sample Size - High to Low', isDefault: false }
    ];

    return { subjectAreas, articleTypes, accessTypes, licenses, sortOptions };
  }

  // searchArticles
  searchArticles(
    queryString,
    publicationYearMin,
    publicationYearMax,
    subjectAreas,
    articleTypes,
    accessTypes,
    licenses,
    hasOpenData,
    sortOption,
    pageNumber,
    pageSize
  ) {
    const articles = this._getFromStorage('articles', []);

    const filtered = this._applyArticleSearchFilters(articles, {
      queryString,
      publicationYearMin,
      publicationYearMax,
      subjectAreas,
      articleTypes,
      accessTypes,
      licenses,
      hasOpenData,
      sortOption
    });

    // Determine if this search matches the task 1 neuroscience search criteria
    const isTask1NeuroscienceSearch =
      (queryString || '').toLowerCase().includes('neuroscience') &&
      publicationYearMin === 2021 &&
      publicationYearMax === 2022 &&
      Array.isArray(accessTypes) &&
      accessTypes.includes('open_access') &&
      Array.isArray(licenses) &&
      licenses.includes('cc_by') &&
      sortOption === 'citations_desc';

    // Instrumentation for task completion tracking: task1_searchParams
    try {
      if (isTask1NeuroscienceSearch) {
        const value = {
          queryString,
          publicationYearMin,
          publicationYearMax,
          accessTypes,
          licenses,
          sortOption,
          timestamp: this._now()
        };
        localStorage.setItem('task1_searchParams', JSON.stringify(value));
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    const paginated = this._paginateResults(filtered, pageNumber, pageSize);
    paginated.results = paginated.results.map((a) => this._resolveArticleRelations(a));

    // Instrumentation for task completion tracking: task1_topArticleId
    try {
      if (isTask1NeuroscienceSearch) {
        const topArticleId =
          paginated && Array.isArray(paginated.results) && paginated.results[0]
            ? paginated.results[0].id || ''
            : '';
        localStorage.setItem('task1_topArticleId', topArticleId || '');
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return paginated;
  }

  // getArticleDetails
  getArticleDetails(articleId) {
    const articles = this._getFromStorage('articles', []);
    const journals = this._getFromStorage('journals', []);
    const issues = this._getFromStorage('journal_issues', []);

    const article = articles.find((a) => a.id === articleId) || null;

    // Instrumentation for task completion tracking: task1_openedArticleIds
    try {
      if (article) {
        let existing = localStorage.getItem('task1_openedArticleIds');
        let ids;
        if (existing) {
          try {
            ids = JSON.parse(existing);
          } catch (e2) {
            ids = [];
          }
        } else {
          ids = [];
        }
        if (!Array.isArray(ids)) {
          ids = [];
        }
        if (ids.indexOf(articleId) === -1) {
          ids.push(articleId);
        }
        localStorage.setItem('task1_openedArticleIds', JSON.stringify(ids));
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    let journal = null;
    let issue = null;
    if (article) {
      journal = journals.find((j) => j.id === article.journalId) || null;
      issue = article.issueId ? issues.find((i) => i.id === article.issueId) || null : null;
    }

    const articleWithRelations = article ? Object.assign({}, article, { journal, issue }) : null;

    return { article: articleWithRelations, journal, issue };
  }

  // getArticleFullTextHtml
  getArticleFullTextHtml(articleId) {
    const articles = this._getFromStorage('articles', []);
    const article = articles.find((a) => a.id === articleId) || null;

    const htmlStore = this._getFromStorage('article_fulltexts', []);
    const entry = htmlStore.find((e) => e.articleId === articleId) || null;
    let htmlContent = entry && entry.htmlContent ? entry.htmlContent : '';
    if (!htmlContent && article) {
      // Generate a basic HTML full text stub from article metadata when no stored content exists
      const title = article.title || '';
      const abstract = article.abstract || '';
      const authors = Array.isArray(article.authors) ? article.authors.join(', ') : '';
      const sourceUrl = article.htmlUrl || article.pdfUrl || '';
      htmlContent =
        '<article>' +
        (title ? `<h1>${title}</h1>` : '') +
        (authors ? `<p><strong>Authors:</strong> ${authors}</p>` : '') +
        (abstract ? `<p>${abstract}</p>` : '') +
        (sourceUrl ? `<p><a href="${sourceUrl}">View original article</a></p>` : '') +
        '</article>';
    }

    const articleWithRelations = this._resolveArticleRelations(article);

    // Instrumentation for task completion tracking: task5_fullTextArticleIds
    try {
      if (article) {
        let existing = localStorage.getItem('task5_fullTextArticleIds');
        let ids;
        if (existing) {
          try {
            ids = JSON.parse(existing);
          } catch (e2) {
            ids = [];
          }
        } else {
          ids = [];
        }
        if (!Array.isArray(ids)) {
          ids = [];
        }
        if (ids.indexOf(articleId) === -1) {
          ids.push(articleId);
        }
        localStorage.setItem('task5_fullTextArticleIds', JSON.stringify(ids));
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      article: articleWithRelations,
      htmlContent
    };
  }

  // getArticleCitation
  getArticleCitation(articleId, style) {
    const articles = this._getFromStorage('articles', []);
    const journals = this._getFromStorage('journals', []);

    const article = articles.find((a) => a.id === articleId) || null;
    if (!article) {
      return { style, formattedCitation: '' };
    }

    const journal = journals.find((j) => j.id === article.journalId) || null;
    const normalizedStyle = (style || '').toLowerCase();

    let formattedCitation = '';
    const year = article.publicationYear || (article.publicationDate ? new Date(article.publicationDate).getFullYear() : 'n.d.');
    const authors = Array.isArray(article.authors) && article.authors.length > 0 ? article.authors.join(', ') : '';
    const title = article.title || '';
    const journalTitle = journal && journal.title ? journal.title : article.journalTitle || '';
    const doi = article.doi || '';

    if (normalizedStyle === 'apa') {
      // Very simplified APA-like citation
      // Author(s). (Year). Title. Journal Title. DOI
      formattedCitation = `${authors}${authors ? '. ' : ''}(${year}). ${title}. ${journalTitle}.${doi ? ' https://doi.org/' + doi : ''}`;
    } else {
      // Fallback generic format
      formattedCitation = `${authors} (${year}). ${title}. ${journalTitle}.`;
    }

    // Instrumentation for task completion tracking: task4_apaCitationArticleIds
    try {
      if (normalizedStyle === 'apa') {
        let existing = localStorage.getItem('task4_apaCitationArticleIds');
        let ids;
        if (existing) {
          try {
            ids = JSON.parse(existing);
          } catch (e2) {
            ids = [];
          }
        } else {
          ids = [];
        }
        if (!Array.isArray(ids)) {
          ids = [];
        }
        if (ids.indexOf(articleId) === -1) {
          ids.push(articleId);
        }
        localStorage.setItem('task4_apaCitationArticleIds', JSON.stringify(ids));
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return { style: normalizedStyle, formattedCitation };
  }

  // getArticleDatasets
  getArticleDatasets(articleId) {
    const datasets = this._getFromStorage('datasets', []);
    const articles = this._getFromStorage('articles', []);
    const article = articles.find((a) => a.id === articleId) || null;
    const filtered = datasets.filter((d) => d.articleId === articleId);
    return filtered.map((d) => Object.assign({}, d, { article }));
  }

  // addArticleToReadingList
  addArticleToReadingList(articleId, readingListId, newReadingListName) {
    const articles = this._getFromStorage('articles', []);
    let readingLists = this._getFromStorage('reading_lists', []);
    let items = this._getFromStorage('reading_list_items', []);

    const article = articles.find((a) => a.id === articleId) || null;
    if (!article) {
      return { success: false, readingListId: null, readingListName: null, message: 'Article not found.' };
    }

    let readingList = null;
    if (readingListId) {
      readingList = readingLists.find((l) => l.id === readingListId) || null;
      if (!readingList) {
        return { success: false, readingListId: null, readingListName: null, message: 'Reading list not found.' };
      }
    } else {
      readingList = this._getOrCreateReadingListByName(newReadingListName || 'Reading List');
      readingLists = this._getFromStorage('reading_lists', []); // refresh after potential creation
    }

    const now = this._now();
    const newItem = {
      id: this._generateId('rli'),
      readingListId: readingList.id,
      articleId: article.id,
      articleTitle: article.title,
      journalTitle: article.journalTitle || '',
      publicationYear: article.publicationYear || null,
      addedAt: now
    };

    items.push(newItem);
    this._saveToStorage('reading_list_items', items);

    // Update updatedAt on reading list
    readingList.updatedAt = now;
    this._saveToStorage('reading_lists', readingLists);

    return {
      success: true,
      readingListId: readingList.id,
      readingListName: readingList.name,
      message: 'Article added to reading list.'
    };
  }

  // removeArticleFromReadingList
  removeArticleFromReadingList(readingListItemId) {
    let items = this._getFromStorage('reading_list_items', []);
    const index = items.findIndex((i) => i.id === readingListItemId);
    if (index === -1) {
      return { success: false, message: 'Reading list item not found.' };
    }
    items.splice(index, 1);
    this._saveToStorage('reading_list_items', items);
    return { success: true, message: 'Reading list item removed.' };
  }

  // createReadingList
  createReadingList(name, description) {
    const lists = this._getFromStorage('reading_lists', []);
    const now = this._now();
    const list = {
      id: this._generateId('rl'),
      name: (name || '').trim() || 'Reading List',
      description: description || '',
      createdAt: now,
      updatedAt: now
    };
    lists.push(list);
    this._saveToStorage('reading_lists', lists);
    return list;
  }

  // renameReadingList
  renameReadingList(readingListId, newName) {
    const lists = this._getFromStorage('reading_lists', []);
    const list = lists.find((l) => l.id === readingListId) || null;
    if (!list) return null;
    list.name = (newName || '').trim() || list.name;
    list.updatedAt = this._now();
    this._saveToStorage('reading_lists', lists);
    return list;
  }

  // deleteReadingList
  deleteReadingList(readingListId) {
    let lists = this._getFromStorage('reading_lists', []);
    let items = this._getFromStorage('reading_list_items', []);
    const before = lists.length;
    lists = lists.filter((l) => l.id !== readingListId);
    const removed = before !== lists.length;
    items = items.filter((i) => i.readingListId !== readingListId);
    this._saveToStorage('reading_lists', lists);
    this._saveToStorage('reading_list_items', items);
    return {
      success: removed,
      message: removed ? 'Reading list deleted.' : 'Reading list not found.'
    };
  }

  // getReadingListsSummary
  getReadingListsSummary() {
    const lists = this._getFromStorage('reading_lists', []);
    const items = this._getFromStorage('reading_list_items', []);
    return lists.map((list) => {
      const itemCount = items.filter((i) => i.readingListId === list.id).length;
      return { readingList: list, itemCount };
    });
  }

  // getReadingListItems
  getReadingListItems(readingListId) {
    const lists = this._getFromStorage('reading_lists', []);
    const items = this._getFromStorage('reading_list_items', []);
    const articles = this._getFromStorage('articles', []);

    const readingList = lists.find((l) => l.id === readingListId) || null;

    const filteredItems = items
      .filter((i) => i.readingListId === readingListId)
      .map((item) => {
        const article = articles.find((a) => a.id === item.articleId) || null;
        return Object.assign({}, item, {
          readingList,
          article: this._resolveArticleRelations(article)
        });
      });

    return { readingList, items: filteredItems };
  }

  // addArticleToCollection
  addArticleToCollection(articleId, collectionId, newCollectionName) {
    const articles = this._getFromStorage('articles', []);
    let collections = this._getFromStorage('collections', []);
    let items = this._getFromStorage('collection_items', []);

    const article = articles.find((a) => a.id === articleId) || null;
    if (!article) {
      return { success: false, collectionId: null, collectionName: null, message: 'Article not found.' };
    }

    let collection = null;
    if (collectionId) {
      collection = collections.find((c) => c.id === collectionId) || null;
      if (!collection) {
        return { success: false, collectionId: null, collectionName: null, message: 'Collection not found.' };
      }
    } else {
      collection = this._getOrCreateCollectionByName(newCollectionName || 'Collection');
      collections = this._getFromStorage('collections', []); // refresh
    }

    const now = this._now();
    const newItem = {
      id: this._generateId('ci'),
      collectionId: collection.id,
      articleId: article.id,
      articleTitle: article.title,
      journalTitle: article.journalTitle || '',
      publicationYear: article.publicationYear || null,
      addedAt: now
    };

    items.push(newItem);
    this._saveToStorage('collection_items', items);

    collection.updatedAt = now;
    this._saveToStorage('collections', collections);

    return {
      success: true,
      collectionId: collection.id,
      collectionName: collection.name,
      message: 'Article added to collection.'
    };
  }

  // removeArticleFromCollection
  removeArticleFromCollection(collectionItemId) {
    let items = this._getFromStorage('collection_items', []);
    const index = items.findIndex((i) => i.id === collectionItemId);
    if (index === -1) {
      return { success: false, message: 'Collection item not found.' };
    }
    items.splice(index, 1);
    this._saveToStorage('collection_items', items);
    return { success: true, message: 'Collection item removed.' };
  }

  // createCollection
  createCollection(name, description, exportNotes) {
    const collections = this._getFromStorage('collections', []);
    const now = this._now();
    const collection = {
      id: this._generateId('col'),
      name: (name || '').trim() || 'Collection',
      description: description || '',
      exportNotes: exportNotes || '',
      createdAt: now,
      updatedAt: now
    };
    collections.push(collection);
    this._saveToStorage('collections', collections);
    return collection;
  }

  // renameCollection
  renameCollection(collectionId, newName) {
    const collections = this._getFromStorage('collections', []);
    const collection = collections.find((c) => c.id === collectionId) || null;
    if (!collection) return null;
    collection.name = (newName || '').trim() || collection.name;
    collection.updatedAt = this._now();
    this._saveToStorage('collections', collections);
    return collection;
  }

  // deleteCollection
  deleteCollection(collectionId) {
    let collections = this._getFromStorage('collections', []);
    let items = this._getFromStorage('collection_items', []);
    const before = collections.length;
    collections = collections.filter((c) => c.id !== collectionId);
    const removed = before !== collections.length;
    items = items.filter((i) => i.collectionId !== collectionId);
    this._saveToStorage('collections', collections);
    this._saveToStorage('collection_items', items);
    return {
      success: removed,
      message: removed ? 'Collection deleted.' : 'Collection not found.'
    };
  }

  // getCollectionsSummary
  getCollectionsSummary() {
    const collections = this._getFromStorage('collections', []);
    const items = this._getFromStorage('collection_items', []);
    const articles = this._getFromStorage('articles', []);

    return collections.map((collection) => {
      const colItems = items.filter((i) => i.collectionId === collection.id);
      const itemCount = colItems.length;
      const journalIds = new Set();
      colItems.forEach((ci) => {
        const article = articles.find((a) => a.id === ci.articleId);
        if (article && article.journalId) {
          journalIds.add(article.journalId);
        }
      });
      const distinctJournalCount = journalIds.size;
      return { collection, itemCount, distinctJournalCount };
    });
  }

  // getCollectionItems
  getCollectionItems(collectionId) {
    const collections = this._getFromStorage('collections', []);
    const items = this._getFromStorage('collection_items', []);
    const articles = this._getFromStorage('articles', []);

    const collection = collections.find((c) => c.id === collectionId) || null;

    const filteredItems = items
      .filter((i) => i.collectionId === collectionId)
      .map((item) => {
        const article = articles.find((a) => a.id === item.articleId) || null;
        return Object.assign({}, item, {
          collection,
          article: this._resolveArticleRelations(article)
        });
      });

    return { collection, items: filteredItems };
  }

  // exportCollectionBibliography
  exportCollectionBibliography(collectionId, format) {
    const collections = this._getFromStorage('collections', []);
    const items = this._getFromStorage('collection_items', []);
    const articles = this._getFromStorage('articles', []);
    const journals = this._getFromStorage('journals', []);

    const collection = collections.find((c) => c.id === collectionId) || null;
    if (!collection) {
      return { format, contentText: '' };
    }

    const colItems = items.filter((i) => i.collectionId === collectionId);
    const lines = [];
    const fmt = (format || '').toLowerCase();

    colItems.forEach((ci) => {
      const article = articles.find((a) => a.id === ci.articleId) || null;
      if (!article) return;
      const journal = journals.find((j) => j.id === article.journalId) || null;

      if (fmt === 'apa_plain_text') {
        const citationObj = this.getArticleCitation(article.id, 'apa');
        lines.push(citationObj.formattedCitation);
      } else if (fmt === 'ris') {
        // Minimal RIS-like entry
        const year = article.publicationYear || (article.publicationDate ? new Date(article.publicationDate).getFullYear() : '');
        lines.push('TY  - JOUR');
        (article.authors || []).forEach((author) => {
          lines.push('AU  - ' + author);
        });
        lines.push('TI  - ' + (article.title || ''));
        if (journal && journal.title) lines.push('JO  - ' + journal.title);
        if (year) lines.push('PY  - ' + year);
        if (article.doi) lines.push('DO  - ' + article.doi);
        lines.push('ER  - ');
        lines.push('');
      } else if (fmt === 'bibtex') {
        // Minimal BibTeX-like entry
        const key = article.id || ('article' + Math.random().toString(36).substring(2));
        const year = article.publicationYear || (article.publicationDate ? new Date(article.publicationDate).getFullYear() : '');
        const authors = Array.isArray(article.authors) ? article.authors.join(' and ') : '';
        const journalTitle = journal && journal.title ? journal.title : article.journalTitle || '';
        lines.push(`@article{${key},`);
        if (authors) lines.push(`  author = {${authors}},`);
        lines.push(`  title = {${article.title || ''}},`);
        if (journalTitle) lines.push(`  journal = {${journalTitle}},`);
        if (year) lines.push(`  year = {${year}},`);
        if (article.doi) lines.push(`  doi = {${article.doi}},`);
        lines.push('}');
        lines.push('');
      } else {
        // Generic plain text
        const year = article.publicationYear || (article.publicationDate ? new Date(article.publicationDate).getFullYear() : '');
        const authors = Array.isArray(article.authors) ? article.authors.join(', ') : '';
        const journalTitle = journal && journal.title ? journal.title : article.journalTitle || '';
        lines.push(`${authors} (${year}). ${article.title || ''}. ${journalTitle}.`);
      }
    });

    const contentText = lines.join('\n');
    return { format: fmt, contentText };
  }

  // getDatasetDetails
  getDatasetDetails(datasetId) {
    const datasets = this._getFromStorage('datasets', []);
    const articles = this._getFromStorage('articles', []);
    const dataset = datasets.find((d) => d.id === datasetId) || null;
    const article = dataset ? (articles.find((a) => a.id === dataset.articleId) || null) : null;
    const datasetWithArticle = dataset ? Object.assign({}, dataset, { article }) : null;

    // Instrumentation for task completion tracking: task7_openedDatasetIds
    try {
      if (dataset) {
        let existing = localStorage.getItem('task7_openedDatasetIds');
        let ids;
        if (existing) {
          try {
            ids = JSON.parse(existing);
          } catch (e2) {
            ids = [];
          }
        } else {
          ids = [];
        }
        if (!Array.isArray(ids)) {
          ids = [];
        }
        if (ids.indexOf(datasetId) === -1) {
          ids.push(datasetId);
        }
        localStorage.setItem('task7_openedDatasetIds', JSON.stringify(ids));
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return { dataset: datasetWithArticle, article };
  }

  // getDatasetFiles
  getDatasetFiles(datasetId) {
    const files = this._getFromStorage('dataset_files', []);
    const datasets = this._getFromStorage('datasets', []);
    const articles = this._getFromStorage('articles', []);

    const dataset = datasets.find((d) => d.id === datasetId) || null;
    const article = dataset ? (articles.find((a) => a.id === dataset.articleId) || null) : null;
    const datasetWithArticle = dataset ? Object.assign({}, dataset, { article }) : null;

    // Instrumentation for task completion tracking: task7_viewedFileListDatasetIds
    try {
      if (dataset) {
        let existing = localStorage.getItem('task7_viewedFileListDatasetIds');
        let ids;
        if (existing) {
          try {
            ids = JSON.parse(existing);
          } catch (e2) {
            ids = [];
          }
        } else {
          ids = [];
        }
        if (!Array.isArray(ids)) {
          ids = [];
        }
        if (ids.indexOf(datasetId) === -1) {
          ids.push(datasetId);
        }
        localStorage.setItem('task7_viewedFileListDatasetIds', JSON.stringify(ids));
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    const filteredFiles = files
      .filter((f) => f.datasetId === datasetId)
      .map((f) => Object.assign({}, f, { dataset: datasetWithArticle }));

    if (filteredFiles.length === 0 && dataset && Array.isArray(dataset.fileIds) && dataset.fileIds.length > 0) {
      // Fallback: construct basic file entries from dataset metadata when no separate dataset_files records exist.
      return dataset.fileIds.map((fileId, index) => {
        return {
          id: fileId,
          datasetId: dataset.id,
          filename: fileId,
          format: dataset.primaryFormat || 'other',
          sizeBytes: null,
          downloadUrl: (article && (article.pdfUrl || article.htmlUrl)) || '',
          isPrimary: index === 0,
          createdAt: dataset.createdAt || this._now(),
          dataset: datasetWithArticle
        };
      });
    }

    return filteredFiles;
  }

  // getJournalSearchFilterOptions
  getJournalSearchFilterOptions() {
    const subjectAreas = [
      { key: 'neuroscience', label: 'Neuroscience' },
      { key: 'environmental_science', label: 'Environmental Science' },
      { key: 'public_health', label: 'Public Health' },
      { key: 'medicine', label: 'Medicine' },
      { key: 'computer_science', label: 'Computer Science' },
      { key: 'cardiology', label: 'Cardiology' }
    ];

    const sortOptions = [
      { key: 'impact_factor_desc', label: 'Impact Factor - High to Low', isDefault: false },
      { key: 'median_review_time_asc', label: 'Median Review Time - Low to High', isDefault: false },
      { key: 'apc_asc', label: 'APC - Low to High', isDefault: false },
      { key: 'title_asc', label: 'Title - A to Z', isDefault: true }
    ];

    return { subjectAreas, sortOptions };
  }

  // searchJournals
  searchJournals(queryString, subjectAreas, sortOption, pageNumber, pageSize) {
    let journals = this._getFromStorage('journals', []);

    const q = (queryString || '').trim().toLowerCase();
    if (q) {
      journals = journals.filter((j) => {
        const textParts = [];
        if (j.title) textParts.push(j.title);
        if (j.aimsScope) textParts.push(j.aimsScope);
        const text = textParts.join(' ').toLowerCase();
        return text.includes(q);
      });
    }

    if (Array.isArray(subjectAreas) && subjectAreas.length > 0) {
      journals = journals.filter((j) => {
        const s = Array.isArray(j.subjectAreas) ? j.subjectAreas : [];
        return subjectAreas.some((sa) => s.includes(sa));
      });
    }

    const sortKey = sortOption || 'title_asc';
    if (sortKey === 'impact_factor_desc') {
      journals.sort((a, b) => (b.impactFactor || 0) - (a.impactFactor || 0));
    } else if (sortKey === 'median_review_time_asc') {
      journals.sort((a, b) => (a.medianReviewTimeDays || Infinity) - (b.medianReviewTimeDays || Infinity));
    } else if (sortKey === 'apc_asc') {
      journals.sort((a, b) => (a.apcAmount || Infinity) - (b.apcAmount || Infinity));
    } else {
      journals.sort((a, b) => {
        const ta = (a.title || '').toLowerCase();
        const tb = (b.title || '').toLowerCase();
        if (ta < tb) return -1;
        if (ta > tb) return 1;
        return 0;
      });
    }

    return this._paginateResults(journals, pageNumber, pageSize);
  }

  // getJournalDetails
  getJournalDetails(journalId) {
    const journals = this._getFromStorage('journals', []);
    const issues = this._getFromStorage('journal_issues', []);
    const guidelines = this._getFromStorage('submission_guidelines', []);

    const journal = journals.find((j) => j.id === journalId) || null;

    // Instrumentation for task completion tracking: task3_comparedJournalIds
    try {
      if (journal) {
        let existing = localStorage.getItem('task3_comparedJournalIds');
        let ids;
        if (existing) {
          try {
            ids = JSON.parse(existing);
          } catch (e2) {
            ids = [];
          }
        } else {
          ids = [];
        }
        if (!Array.isArray(ids)) {
          ids = [];
        }
        if (ids.indexOf(journalId) === -1) {
          ids.push(journalId);
        }
        localStorage.setItem('task3_comparedJournalIds', JSON.stringify(ids));
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    const latestIssuesRaw = issues
      .filter((i) => i.journalId === journalId)
      .sort((a, b) => {
        const da = a.publicationDate ? Date.parse(a.publicationDate) : 0;
        const db = b.publicationDate ? Date.parse(b.publicationDate) : 0;
        if (db !== da) return db - da;
        return (b.year || 0) - (a.year || 0);
      })
      .slice(0, 5);
    const latestIssues = latestIssuesRaw.map((i) => this._resolveIssueRelations(i));

    const hasSubmissionGuidelines = guidelines.some((g) => g.journalId === journalId);

    return { journal, latestIssues, hasSubmissionGuidelines };
  }

  // getJournalIssuesByYear
  getJournalIssuesByYear(journalId, year) {
    const issues = this._getFromStorage('journal_issues', []);
    const filtered = issues.filter((i) => i.journalId === journalId && i.year === year);

    // Sort by publicationDate then issueNumber
    filtered.sort((a, b) => {
      const da = a.publicationDate ? Date.parse(a.publicationDate) : 0;
      const db = b.publicationDate ? Date.parse(b.publicationDate) : 0;
      if (db !== da) return db - da;
      const ia = parseInt(a.issueNumber, 10) || 0;
      const ib = parseInt(b.issueNumber, 10) || 0;
      return ia - ib;
    });

    return filtered.map((i) => this._resolveIssueRelations(i));
  }

  // getIssueContents
  getIssueContents(issueId) {
    const issues = this._getFromStorage('journal_issues', []);
    const articles = this._getFromStorage('articles', []);

    const issue = issues.find((i) => i.id === issueId) || null;
    const issueWithJournal = this._resolveIssueRelations(issue);

    const issueArticles = articles
      .filter((a) => a.issueId === issueId)
      .map((a) => this._resolveArticleRelations(a));

    return { issue: issueWithJournal, articles: issueArticles };
  }

  // getSubmissionGuidelines
  getSubmissionGuidelines(journalId) {
    const guidelines = this._getFromStorage('submission_guidelines', []);
    const journals = this._getFromStorage('journals', []);

    // Instrumentation for task completion tracking: task3_selectedJournalId
    try {
      localStorage.setItem('task3_selectedJournalId', String(journalId));
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    const sg = guidelines.find((g) => g.journalId === journalId) || null;
    if (!sg) return null;
    const journal = journals.find((j) => j.id === journalId) || null;
    return Object.assign({}, sg, { journal });
  }

  // createSavedSearchAlert
  createSavedSearchAlert(
    name,
    queryString,
    publicationYearMin,
    publicationYearMax,
    subjectAreas,
    articleTypes,
    accessTypes,
    licenses,
    hasOpenData,
    sortOption,
    frequency
  ) {
    const now = this._now();
    const alert = {
      id: this._generateId('alert'),
      name: (name || '').trim() || 'Saved Search',
      queryString: queryString || '',
      publicationYearMin: typeof publicationYearMin === 'number' ? publicationYearMin : undefined,
      publicationYearMax: typeof publicationYearMax === 'number' ? publicationYearMax : undefined,
      subjectAreas: Array.isArray(subjectAreas) ? subjectAreas.slice() : undefined,
      articleTypes: Array.isArray(articleTypes) ? articleTypes.slice() : undefined,
      accessTypes: Array.isArray(accessTypes) ? accessTypes.slice() : undefined,
      licenses: Array.isArray(licenses) ? licenses.slice() : undefined,
      hasOpenData: typeof hasOpenData === 'boolean' ? hasOpenData : undefined,
      sortOption: sortOption || 'publication_date_newest',
      frequency: frequency || 'weekly',
      isActive: true,
      createdAt: now,
      lastRunAt: null
    };

    this._persistSavedSearchAlert(alert);
    return alert;
  }

  // getSavedSearchAlerts
  getSavedSearchAlerts() {
    return this._getFromStorage('saved_search_alerts', []);
  }

  // updateSavedSearchAlert
  updateSavedSearchAlert(alertId, name, frequency, isActive) {
    let alerts = this._getFromStorage('saved_search_alerts', []);
    const alert = alerts.find((a) => a.id === alertId) || null;
    if (!alert) return null;

    if (typeof name === 'string' && name.trim()) {
      alert.name = name.trim();
    }
    if (typeof frequency === 'string' && frequency.trim()) {
      alert.frequency = frequency.trim();
    }
    if (typeof isActive === 'boolean') {
      alert.isActive = isActive;
    }

    this._persistSavedSearchAlert(alert);
    return alert;
  }

  // deleteSavedSearchAlert
  deleteSavedSearchAlert(alertId) {
    let alerts = this._getFromStorage('saved_search_alerts', []);
    const before = alerts.length;
    alerts = alerts.filter((a) => a.id !== alertId);
    const removed = alerts.length !== before;
    this._saveToStorage('saved_search_alerts', alerts);
    return {
      success: removed,
      message: removed ? 'Saved search alert deleted.' : 'Saved search alert not found.'
    };
  }

  // runSavedSearchAlert
  runSavedSearchAlert(alertId, pageNumber, pageSize) {
    const alerts = this._getFromStorage('saved_search_alerts', []);
    const alert = alerts.find((a) => a.id === alertId) || null;
    const page = pageNumber || 1;
    const size = pageSize || 20;

    if (!alert) {
      return {
        alert: null,
        results: {
          totalCount: 0,
          pageNumber: page,
          pageSize: size,
          articles: []
        }
      };
    }

    const searchResult = this.searchArticles(
      alert.queryString,
      alert.publicationYearMin,
      alert.publicationYearMax,
      alert.subjectAreas,
      alert.articleTypes,
      alert.accessTypes,
      alert.licenses,
      alert.hasOpenData,
      alert.sortOption,
      page,
      size
    );

    // Update lastRunAt
    alert.lastRunAt = this._now();
    this._persistSavedSearchAlert(alert);

    return {
      alert,
      results: {
        totalCount: searchResult.totalCount,
        pageNumber: searchResult.pageNumber,
        pageSize: searchResult.pageSize,
        articles: searchResult.results
      }
    };
  }

  // getBrowseOverview
  getBrowseOverview() {
    const articles = this._getFromStorage('articles', []);
    const journals = this._getFromStorage('journals', []);
    const issues = this._getFromStorage('journal_issues', []);

    const subjectAreaDefs = [
      { key: 'neuroscience', label: 'Neuroscience' },
      { key: 'environmental_science', label: 'Environmental Science' },
      { key: 'public_health', label: 'Public Health' },
      { key: 'medicine', label: 'Medicine' },
      { key: 'computer_science', label: 'Computer Science' },
      { key: 'cardiology', label: 'Cardiology' }
    ];

    const subjectAreas = subjectAreaDefs.map((sa) => {
      const count = articles.filter((a) => Array.isArray(a.subjectAreas) && a.subjectAreas.includes(sa.key)).length;
      return Object.assign({}, sa, { articleCount: count });
    });

    const popularJournals = journals
      .slice()
      .sort((a, b) => (b.impactFactor || 0) - (a.impactFactor || 0))
      .slice(0, 5);

    const recentIssuesRaw = issues
      .slice()
      .sort((a, b) => {
        const da = a.publicationDate ? Date.parse(a.publicationDate) : 0;
        const db = b.publicationDate ? Date.parse(b.publicationDate) : 0;
        if (db !== da) return db - da;
        return (b.year || 0) - (a.year || 0);
      })
      .slice(0, 5);
    const recentIssues = recentIssuesRaw.map((i) => this._resolveIssueRelations(i));

    const topCitedArticlesRaw = articles
      .slice()
      .sort((a, b) => (b.citationCount || 0) - (a.citationCount || 0))
      .slice(0, 5);
    const topCitedArticles = topCitedArticlesRaw.map((a) => this._resolveArticleRelations(a));

    return { subjectAreas, popularJournals, recentIssues, topCitedArticles };
  }

  // getAboutPageContent
  getAboutPageContent() {
    const stored = this._getFromStorage('about_page_content', null);
    if (stored && typeof stored === 'object') {
      return stored;
    }
    return {
      heading: '',
      bodyHtml: '',
      editorialBoardHtml: '',
      institutionsHtml: ''
    };
  }

  // getHelpFaqContent
  getHelpFaqContent() {
    const stored = this._getFromStorage('help_faq_content', null);
    if (stored && typeof stored === 'object') {
      return stored;
    }
    return { sections: [] };
  }

  // getPoliciesPageContent
  getPoliciesPageContent() {
    const stored = this._getFromStorage('policies_page_content', null);
    if (stored && typeof stored === 'object') {
      return stored;
    }
    return { sections: [] };
  }

  // getContactPageInfo
  getContactPageInfo() {
    const stored = this._getFromStorage('contact_page_info', null);
    if (stored && typeof stored === 'object') {
      return stored;
    }
    return {
      generalEmail: '',
      editorialEmail: '',
      mailingAddress: '',
      additionalInfoHtml: ''
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
