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
  // Storage & ID Utilities
  // ----------------------
  _initStorage() {
    const keys = [
      'articles',
      'issues',
      'authors',
      'article_authors',
      'subjects',
      'reading_lists',
      'reading_list_items',
      'folders',
      'folder_items',
      'alerts',
      'notes',
      'citation_styles',
      // CMS-like singletons
      'about_page_content',
      'contact_information',
      'editorial_policies_content',
      'help_content',
      // optional log storage
      'contact_messages'
    ];

    keys.forEach((key) => {
      if (localStorage.getItem(key) === null) {
        // For page content / contact info, initialize to minimal empty structures; for others, []
        if (key === 'about_page_content' || key === 'editorial_policies_content') {
          localStorage.setItem(key, JSON.stringify({
            title: '',
            body: '',
            sections: []
          }));
        } else if (key === 'contact_information') {
          localStorage.setItem(key, JSON.stringify({
            generalEmail: '',
            editorialOfficeEmail: '',
            technicalSupportEmail: '',
            mailingAddress: '',
            departmentContacts: []
          }));
        } else if (key === 'help_content') {
          localStorage.setItem(key, JSON.stringify({
            title: '',
            body: '',
            faqs: []
          }));
        } else if (key === 'contact_messages') {
          localStorage.setItem(key, JSON.stringify([]));
        } else {
          localStorage.setItem(key, JSON.stringify([]));
        }
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

  // --------------
  // Basic helpers
  // --------------
  _normalizeString(value) {
    return (value || '').toString().toLowerCase();
  }

  _ensureArray(value) {
    return Array.isArray(value) ? value : (value == null ? [] : [value]);
  }

  _clone(obj) {
    return obj == null ? obj : JSON.parse(JSON.stringify(obj));
  }

  _buildIdMap(arr) {
    const map = {};
    for (const item of arr) {
      if (item && item.id != null) {
        map[item.id] = item;
      }
    }
    return map;
  }

  // -----------------
  // User-state helpers
  // -----------------
  _loadUserState() {
    return {
      readingLists: this._getFromStorage('reading_lists'),
      readingListItems: this._getFromStorage('reading_list_items'),
      folders: this._getFromStorage('folders'),
      folderItems: this._getFromStorage('folder_items'),
      alerts: this._getFromStorage('alerts'),
      notes: this._getFromStorage('notes')
    };
  }

  _persistUserState(state) {
    if (state.readingLists) this._saveToStorage('reading_lists', state.readingLists);
    if (state.readingListItems) this._saveToStorage('reading_list_items', state.readingListItems);
    if (state.folders) this._saveToStorage('folders', state.folders);
    if (state.folderItems) this._saveToStorage('folder_items', state.folderItems);
    if (state.alerts) this._saveToStorage('alerts', state.alerts);
    if (state.notes) this._saveToStorage('notes', state.notes);
  }

  _getOrCreateReadingListByName(listName, description, forceNew = false) {
    const state = this._loadUserState();
    let readingList = null;

    if (!forceNew) {
      readingList = state.readingLists.find((rl) => rl.name === listName) || null;
    }

    if (!readingList) {
      const now = new Date().toISOString();
      readingList = {
        id: this._generateId('reading_list'),
        name: listName,
        description: description || '',
        created_at: now,
        updated_at: now
      };
      state.readingLists.push(readingList);
      this._persistUserState(state);
    }

    return readingList;
  }

  _getOrCreateFolderByName(folderName, description, forceNew = false) {
    const state = this._loadUserState();
    let folder = null;

    if (!forceNew) {
      folder = state.folders.find((f) => f.name === folderName) || null;
    }

    if (!folder) {
      const now = new Date().toISOString();
      folder = {
        id: this._generateId('folder'),
        name: folderName,
        description: description || '',
        created_at: now,
        updated_at: now
      };
      state.folders.push(folder);
      this._persistUserState(state);
    }

    return folder;
  }

  // ---------------
  // Article helpers
  // ---------------
  _getAllArticles() {
    return this._getFromStorage('articles');
  }

  _getAllIssues() {
    return this._getFromStorage('issues');
  }

  _getAllSubjects() {
    return this._getFromStorage('subjects');
  }

  _resolveArticleRelations(article, issuesMap, subjectsMap) {
    const a = this._clone(article);
    if (!a) return a;

    const issueId = a.issue_id || a.issueId;
    const subjectIds = this._ensureArray(a.subject_ids || a.subjectIds);

    a.issue = issueId ? (issuesMap[issueId] || null) : null;
    a.subjects = subjectIds.map((sid) => subjectsMap[sid]).filter(Boolean);

    return a;
  }

  _matchesQuery(article, query) {
    if (!query) return true;
    const q = this._normalizeString(query);
    if (!q) return true;

    const fields = [];
    if (article.title) fields.push(article.title);
    if (article.subtitle) fields.push(article.subtitle);
    if (article.abstract) fields.push(article.abstract);
    if (Array.isArray(article.keywords)) fields.push(article.keywords.join(' '));
    if (Array.isArray(article.subject_terms)) fields.push(article.subject_terms.join(' '));

    const haystack = this._normalizeString(fields.join(' '));
    return haystack.includes(q);
  }

  _matchesTitleContains(article, phrase) {
    if (!phrase) return true;
    const p = this._normalizeString(phrase);
    return this._normalizeString(article.title || '').includes(p);
  }

  _computeRelevanceScore(article, query) {
    if (!query) return 0;
    const q = this._normalizeString(query);
    if (!q) return 0;

    let score = 0;
    const title = this._normalizeString(article.title || '');
    const subtitle = this._normalizeString(article.subtitle || '');
    const abstract = this._normalizeString(article.abstract || '');
    const keywords = this._normalizeString((article.keywords || []).join(' '));

    if (title.includes(q)) score += 5;
    if (subtitle.includes(q)) score += 3;
    if (abstract.includes(q)) score += 2;
    if (keywords.includes(q)) score += 2;

    return score;
  }

  _sortArticles(articles, sort, query) {
    const list = [...articles];
    if (!sort || sort === 'relevance') {
      // Relevance sort: by score then newest date
      list.sort((a, b) => {
        const sa = this._computeRelevanceScore(a, query);
        const sb = this._computeRelevanceScore(b, query);
        if (sb !== sa) return sb - sa;

        const da = a.publication_date ? Date.parse(a.publication_date) : 0;
        const db = b.publication_date ? Date.parse(b.publication_date) : 0;
        if (db !== da) return db - da;
        return (b.publication_year || 0) - (a.publication_year || 0);
      });
    } else if (sort === 'date_newest') {
      list.sort((a, b) => {
        const da = a.publication_date ? Date.parse(a.publication_date) : 0;
        const db = b.publication_date ? Date.parse(b.publication_date) : 0;
        if (db !== da) return db - da;
        return (b.publication_year || 0) - (a.publication_year || 0);
      });
    } else if (sort === 'date_oldest') {
      list.sort((a, b) => {
        const da = a.publication_date ? Date.parse(a.publication_date) : 0;
        const db = b.publication_date ? Date.parse(b.publication_date) : 0;
        if (da !== db) return da - db;
        return (a.publication_year || 0) - (b.publication_year || 0);
      });
    } else if (sort === 'most_cited') {
      list.sort((a, b) => {
        const ca = a.total_citations || 0;
        const cb = b.total_citations || 0;
        return cb - ca;
      });
    }
    return list;
  }

  // -----------------------------
  // Interface: getHomeFeaturedContent
  // -----------------------------
  getHomeFeaturedContent() {
    const articles = this._getAllArticles();
    const issues = this._getAllIssues();
    const subjects = this._getAllSubjects();
    const issuesMap = this._buildIdMap(issues);
    const subjectsMap = this._buildIdMap(subjects);

    // Featured articles: latest 5 main articles (is_main_article true if available)
    const mainArticles = [...articles].filter((a) => {
      if (a.is_main_article === true) return true;
      // Fallback heuristic: section main_articles
      return a.section === 'main_articles';
    });

    mainArticles.sort((a, b) => {
      const da = a.publication_date ? Date.parse(a.publication_date) : 0;
      const db = b.publication_date ? Date.parse(b.publication_date) : 0;
      if (db !== da) return db - da;
      return (b.publication_year || 0) - (a.publication_year || 0);
    });

    const featuredArticles = mainArticles.slice(0, 5).map((a) =>
      this._resolveArticleRelations(a, issuesMap, subjectsMap)
    );

    // Latest issues: sort by publication_date/year desc
    const latestIssues = [...issues].sort((a, b) => {
      const da = a.publication_date ? Date.parse(a.publication_date) : 0;
      const db = b.publication_date ? Date.parse(b.publication_date) : 0;
      if (db !== da) return db - da;
      return (b.year || 0) - (a.year || 0);
    }).slice(0, 5);

    // Highlighted open access: newest 5 open_access
    const oaArticles = articles.filter((a) => a.access_type === 'open_access');
    const sortedOA = this._sortArticles(oaArticles, 'date_newest');
    const highlightedOpenAccessArticles = sortedOA.slice(0, 5).map((a) =>
      this._resolveArticleRelations(a, issuesMap, subjectsMap)
    );

    return {
      featuredArticles,
      latestIssues,
      highlightedOpenAccessArticles
    };
  }

  // ----------------------
  // Interface: searchArticles
  // ----------------------
  // Parameters are positional to stay consistent with spec metadata.
  searchArticles(
    query,
    titleContains,
    subjectId,
    authorName,
    articleType,
    accessType,
    categoryId,
    publicationYearStart,
    publicationYearEnd,
    reviewedBookYearStart,
    reviewedBookYearEnd,
    reviewedBookSubjectKeyword,
    subjectTerms,
    minPageCount,
    sort,
    page,
    pageSize
  ) {
    const allArticles = this._getAllArticles();
    const issues = this._getAllIssues();
    const subjects = this._getAllSubjects();
    const issuesMap = this._buildIdMap(issues);
    const subjectsMap = this._buildIdMap(subjects);

    const qAuthor = this._normalizeString(authorName);
    const qBookSubj = this._normalizeString(reviewedBookSubjectKeyword);
    const qSubjectTerms = this._normalizeString(subjectTerms);

    // If authorName filter is provided, we need ArticleAuthor + Author join
    const articleAuthors = this._getFromStorage('article_authors');
    const authors = this._getFromStorage('authors');
    const authorsMap = this._buildIdMap(authors);

    const authorMatchArticleIds = new Set();
    if (qAuthor) {
      for (const aa of articleAuthors) {
        const author = authorsMap[aa.author_id];
        if (!author) continue;
        const fullName = this._normalizeString(author.full_name || (author.first_name + ' ' + author.last_name));
        if (fullName.includes(qAuthor)) {
          authorMatchArticleIds.add(aa.article_id);
        }
      }
    }

    let filtered = allArticles.filter((article) => {
      // Basic query across title/abstract/keywords
      if (query && !this._matchesQuery(article, query)) return false;

      // Title contains
      if (titleContains && !this._matchesTitleContains(article, titleContains)) return false;

      // subjectId (controlled)
      if (subjectId) {
        const sids = this._ensureArray(article.subject_ids || article.subjectIds);
        if (!sids.includes(subjectId)) return false;
      }

      // authorName
      if (qAuthor) {
        if (!authorMatchArticleIds.has(article.id)) return false;
      }

      // article_type
      if (articleType && article.article_type !== articleType) return false;

      // access_type
      if (accessType && article.access_type !== accessType) return false;

      // categoryId
      if (categoryId && article.category_id !== categoryId) return false;

      // publication year range
      if (typeof publicationYearStart === 'number' && article.publication_year < publicationYearStart) return false;
      if (typeof publicationYearEnd === 'number' && article.publication_year > publicationYearEnd) return false;

      // reviewed book year range (for book_review articles)
      if (typeof reviewedBookYearStart === 'number') {
        if (typeof article.reviewed_book_year === 'number') {
          if (article.reviewed_book_year < reviewedBookYearStart) return false;
        } else {
          return false;
        }
      }
      if (typeof reviewedBookYearEnd === 'number') {
        if (typeof article.reviewed_book_year === 'number') {
          if (article.reviewed_book_year > reviewedBookYearEnd) return false;
        } else {
          return false;
        }
      }

      // reviewed book subject keyword
      if (qBookSubj) {
        const kws = this._ensureArray(article.reviewed_book_subject_keywords || []);
        const joined = this._normalizeString(kws.join(' '));
        if (!joined.includes(qBookSubj)) return false;
      }

      // free-form subject terms
      if (qSubjectTerms) {
        const terms = this._ensureArray(article.subject_terms || []);
        const joined = this._normalizeString(terms.join(' '));
        if (!joined.includes(qSubjectTerms)) return false;
      }

      // minPageCount
      if (typeof minPageCount === 'number') {
        const pc = typeof article.page_count === 'number' ? article.page_count : null;
        if (pc == null || pc < minPageCount) return false;
      }

      return true;
    });

    const effectiveSort = sort || 'relevance';
    const sorted = this._sortArticles(filtered, effectiveSort, query);

    const currentPage = page && page > 0 ? page : 1;
    const size = pageSize && pageSize > 0 ? pageSize : 20;
    const totalResults = sorted.length;
    const totalPages = Math.max(1, Math.ceil(totalResults / size));
    const start = (currentPage - 1) * size;
    const end = start + size;

    const pageSlice = sorted.slice(start, end).map((a) =>
      this._resolveArticleRelations(a, issuesMap, subjectsMap)
    );

    // Applied filters metadata
    let subjectName = null;
    if (subjectId) {
      const subj = subjectsMap[subjectId];
      subjectName = subj ? subj.name : null;
    }

    let articleTypeLabel = null;
    if (articleType) {
      // We don't have labels persisted; use simple mapping
      const map = {
        research_article: 'Research Article',
        review_essay: 'Review Essay',
        review: 'Review',
        book_review: 'Book Review',
        editorial: 'Editorial',
        front_matter: 'Front Matter',
        note: 'Note',
        other: 'Other'
      };
      articleTypeLabel = map[articleType] || articleType;
    }

    let accessTypeLabel = null;
    if (accessType) {
      const map = {
        open_access: 'Open Access',
        subscription: 'Subscription',
        embargoed: 'Embargoed'
      };
      accessTypeLabel = map[accessType] || accessType;
    }

    let categoryName = null;
    if (categoryId) {
      const map = {
        articles: 'Articles',
        book_reviews: 'Book Reviews',
        other: 'Other'
      };
      categoryName = map[categoryId] || categoryId;
    }

    return {
      results: pageSlice,
      pagination: {
        page: currentPage,
        pageSize: size,
        totalPages,
        totalResults
      },
      appliedFilters: {
        query: query || null,
        titleContains: titleContains || null,
        subjectName,
        articleTypeLabel,
        accessTypeLabel,
        categoryName,
        publicationYearStart: typeof publicationYearStart === 'number' ? publicationYearStart : null,
        publicationYearEnd: typeof publicationYearEnd === 'number' ? publicationYearEnd : null
      }
    };
  }

  // -----------------------------
  // Interface: getSearchFilterOptions
  // -----------------------------
  getSearchFilterOptions() {
    const articles = this._getAllArticles();

    let minYear = null;
    let maxYear = null;
    const articleTypeSet = new Set();
    const accessTypeSet = new Set();
    const categorySet = new Set();

    for (const a of articles) {
      if (typeof a.publication_year === 'number') {
        if (minYear == null || a.publication_year < minYear) minYear = a.publication_year;
        if (maxYear == null || a.publication_year > maxYear) maxYear = a.publication_year;
      }
      if (a.article_type) articleTypeSet.add(a.article_type);
      if (a.access_type) accessTypeSet.add(a.access_type);
      if (a.category_id) categorySet.add(a.category_id);
    }

    const articleTypes = Array.from(articleTypeSet).map((value) => ({
      value,
      label: value
        .split('_')
        .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
        .join(' ')
    }));

    const accessTypes = Array.from(accessTypeSet).map((value) => ({
      value,
      label: value
        .split('_')
        .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
        .join(' ')
    }));

    const categories = Array.from(categorySet).map((value) => ({
      value,
      label: value
        .split('_')
        .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
        .join(' ')
    }));

    const subjects = this._getAllSubjects();

    const sortOptions = [
      { value: 'relevance', label: 'Relevance' },
      { value: 'date_newest', label: 'Date: Newest First' },
      { value: 'date_oldest', label: 'Date: Oldest First' },
      { value: 'most_cited', label: 'Most Cited' }
    ];

    return {
      publicationYearRange: {
        minYear,
        maxYear
      },
      articleTypes,
      accessTypes,
      categories,
      subjects,
      sortOptions
    };
  }

  // -----------------------------
  // Interface: getAvailableIssueYears
  // -----------------------------
  getAvailableIssueYears() {
    const issues = this._getAllIssues();
    const yearsSet = new Set();
    for (const issue of issues) {
      if (typeof issue.year === 'number') {
        yearsSet.add(issue.year);
      }
    }
    return Array.from(yearsSet).sort((a, b) => a - b);
  }

  // -----------------------------
  // Interface: getIssuesByYear
  // -----------------------------
  getIssuesByYear(year) {
    const issues = this._getAllIssues();
    const filtered = issues.filter((issue) => issue.year === year);
    // Optionally sort by volume/issue_number
    filtered.sort((a, b) => {
      const va = a.volume || '';
      const vb = b.volume || '';
      if (va < vb) return -1;
      if (va > vb) return 1;
      const ia = a.issue_number || '';
      const ib = b.issue_number || '';
      if (ia < ib) return -1;
      if (ia > ib) return 1;
      return 0;
    });
    return filtered;
  }

  // -----------------------------
  // Interface: getIssueTableOfContents
  // -----------------------------
  getIssueTableOfContents(issueId) {
    const issues = this._getAllIssues();
    const issue = issues.find((i) => i.id === issueId) || null;

    const articles = this._getAllArticles().filter((a) => {
      const aid = a.issue_id || a.issueId;
      return aid === issueId;
    });

    const allSubjects = this._getAllSubjects();
    const subjectsMap = this._buildIdMap(allSubjects);
    const issuesMap = this._buildIdMap(issues);

    const enrichedArticles = articles.map((a) =>
      this._resolveArticleRelations(a, issuesMap, subjectsMap)
    );

    const sectionGroups = {};
    for (const article of enrichedArticles) {
      const section = article.section || 'other';
      if (!sectionGroups[section]) {
        sectionGroups[section] = [];
      }
      sectionGroups[section].push(article);
    }

    const sections = Object.keys(sectionGroups).map((sectionKey) => {
      const group = sectionGroups[sectionKey];
      group.sort((a, b) => {
        const oa = typeof a.order_in_issue === 'number' ? a.order_in_issue : Number.MAX_SAFE_INTEGER;
        const ob = typeof b.order_in_issue === 'number' ? b.order_in_issue : Number.MAX_SAFE_INTEGER;
        if (oa !== ob) return oa - ob;
        return this._normalizeString(a.title || '').localeCompare(this._normalizeString(b.title || ''));
      });
      return {
        section: sectionKey,
        label: sectionKey
          .split('_')
          .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
          .join(' '),
        articles: group
      };
    });

    return {
      // For backward compatibility we can store the issue directly here
      issue: issue,
      issueDetails: { issue: issue },
      issueInfo: { issue: issue },
      issueMetadata: { issue: issue },
      issueRecord: { issue: issue },
      issueObject: { issue: issue },
      issueModel: { issue: issue },
      issueEntity: { issue: issue },
      issueDetailsEntity: { issue: issue },
      // Actual useful structure
      sections
    };
  }

  // -----------------------------
  // Interface: getArticleDetail
  // -----------------------------
  getArticleDetail(articleId) {
    const articles = this._getAllArticles();
    const articleRaw = articles.find((a) => a.id === articleId) || null;

    if (!articleRaw) {
      return {
        article: null,
        authors: [],
        issue: null,
        hasReferencesSection: false,
        sectionLabels: []
      };
    }

    const issues = this._getAllIssues();
    const subjects = this._getAllSubjects();
    const issuesMap = this._buildIdMap(issues);
    const subjectsMap = this._buildIdMap(subjects);

    const article = this._resolveArticleRelations(articleRaw, issuesMap, subjectsMap);

    const articleAuthors = this._getFromStorage('article_authors').filter(
      (aa) => aa.article_id === articleId
    );
    articleAuthors.sort((a, b) => {
      const sa = typeof a.sequence === 'number' ? a.sequence : Number.MAX_SAFE_INTEGER;
      const sb = typeof b.sequence === 'number' ? b.sequence : Number.MAX_SAFE_INTEGER;
      return sa - sb;
    });

    const authorsAll = this._getFromStorage('authors');
    const authorsMap = this._buildIdMap(authorsAll);
    const authors = articleAuthors.map((aa) => authorsMap[aa.author_id]).filter(Boolean);

    const issueId = article.issue_id || article.issueId;
    const issue = issueId ? issuesMap[issueId] || null : null;

    const hasReferencesSection = !!(article.has_references_section || article.hasReferencesSection || (article.references && article.references.length > 0));

    const sectionLabels = ['article'];
    if (hasReferencesSection) sectionLabels.push('references');

    // Instrumentation for task completion tracking
    try {
      if (article && issue && issue.year === 2021) {
        const issueTitle = (issue.title || '').toString().toLowerCase();
        const issueTheme = (issue.theme || '').toString().toLowerCase();
        if (issueTitle.includes('digital humanities') || issueTheme.includes('digital humanities')) {
          localStorage.setItem('task3_openedArticleId', article.id);
        }
      }
    } catch (e) {}

    return {
      article,
      authors,
      issue,
      hasReferencesSection,
      sectionLabels
    };
  }

  // -----------------------------
  // Interface: getArticleReferences
  // -----------------------------
  getArticleReferences(articleId) {
    const articles = this._getAllArticles();
    const article = articles.find((a) => a.id === articleId) || null;

    if (!article) {
      return {
        hasReferencesSection: false,
        references: []
      };
    }

    const refs = this._ensureArray(article.references || []);
    const hasReferencesSection = !!(article.has_references_section || article.hasReferencesSection || refs.length);

    // Instrumentation for task completion tracking
    try {
      if (article && hasReferencesSection) {
        localStorage.setItem('task3_viewedReferencesForArticleId', articleId);
      }
    } catch (e) {}

    return {
      hasReferencesSection,
      references: refs
    };
  }

  // -----------------------------
  // Interface: getArticleCitationStyles
  // -----------------------------
  getArticleCitationStyles() {
    // Stored citation styles (if any) in localStorage
    return this._getFromStorage('citation_styles');
  }

  // -----------------------------
  // Interface: getArticleCitation
  // -----------------------------
  getArticleCitation(articleId, styleCode) {
    const articles = this._getAllArticles();
    const article = articles.find((a) => a.id === articleId) || null;
    const issues = this._getAllIssues();

    if (!article) {
      return {
        styleCode,
        styleLabel: styleCode,
        formattedCitation: ''
      };
    }

    const articleAuthors = this._getFromStorage('article_authors').filter(
      (aa) => aa.article_id === articleId
    );
    articleAuthors.sort((a, b) => {
      const sa = typeof a.sequence === 'number' ? a.sequence : Number.MAX_SAFE_INTEGER;
      const sb = typeof b.sequence === 'number' ? b.sequence : Number.MAX_SAFE_INTEGER;
      return sa - sb;
    });

    const authorsAll = this._getFromStorage('authors');
    const authorsMap = this._buildIdMap(authorsAll);
    const authors = articleAuthors.map((aa) => authorsMap[aa.author_id]).filter(Boolean);

    // Build basic fields
    const year = article.publication_year || '';
    const title = article.title || '';

    const issueId = article.issue_id || article.issueId;
    const issue = issues.find((i) => i.id === issueId) || null;
    const volume = issue ? (issue.volume || '') : '';
    const issueNumber = issue ? (issue.issue_number || '') : '';

    const pageStart = article.page_start;
    const pageEnd = article.page_end;
    const pages = pageStart && pageEnd ? `${pageStart}-${pageEnd}` : '';
    const doi = article.doi || '';

    const formatAuthorNameMLA = (author) => {
      if (!author) return '';
      if (author.last_name && author.first_name) {
        return `${author.last_name}, ${author.first_name}`;
      }
      if (author.full_name) {
        const parts = author.full_name.split(' ');
        if (parts.length > 1) {
          const last = parts.pop();
          const first = parts.join(' ');
          return `${last}, ${first}`;
        }
        return author.full_name;
      }
      return '';
    };

    const formatAuthorsMLA = () => {
      if (!authors.length) return '';
      if (authors.length === 1) return formatAuthorNameMLA(authors[0]);
      if (authors.length === 2) {
        return (
          formatAuthorNameMLA(authors[0]) +
          ' and ' +
          (authors[1].full_name || formatAuthorNameMLA(authors[1]))
        );
      }
      return formatAuthorNameMLA(authors[0]) + ', et al.';
    };

    const formatAuthorsAPA = () => {
      if (!authors.length) return '';
      const formatted = authors.map((author) => {
        if (author.last_name && author.first_name) {
          const initials = author.first_name
            .split(' ')
            .map((n) => n.charAt(0).toUpperCase() + '.')
            .join(' ');
          return `${author.last_name}, ${initials}`;
        }
        return author.full_name || '';
      });
      if (formatted.length === 1) return formatted[0];
      if (formatted.length === 2) return `${formatted[0]} & ${formatted[1]}`;
      return `${formatted.slice(0, -1).join(', ')}, & ${formatted[formatted.length - 1]}`;
    };

    let formattedCitation = '';
    const lowerStyle = (styleCode || '').toLowerCase();

    if (lowerStyle === 'mla_9' || lowerStyle === 'mla_8') {
      const authorsStr = formatAuthorsMLA();
      const journalName = ''; // journal name not stored; left blank intentionally
      let parts = [];
      if (authorsStr) parts.push(authorsStr + '.');
      if (title) parts.push(`"${title}."`);
      if (journalName) parts.push(journalName);
      if (volume) parts.push(`vol. ${volume}`);
      if (issueNumber) parts.push(`no. ${issueNumber}`);
      if (year) parts.push(year);
      if (pages) parts.push(`pp. ${pages}`);
      if (doi) parts.push(`doi:${doi}`);
      formattedCitation = parts.join(' ');
    } else if (lowerStyle === 'apa_7') {
      const authorsStr = formatAuthorsAPA();
      let parts = [];
      if (authorsStr) parts.push(authorsStr);
      if (year) parts.push(`(${year}).`);
      if (title) parts.push(`${title}.`);
      const journalName = '';
      if (journalName) parts.push(journalName);
      let volIssue = '';
      if (volume) volIssue += volume;
      if (issueNumber) volIssue += `(${issueNumber})`;
      if (volIssue) parts.push(volIssue + '.');
      if (pages) parts.push(pages + '.');
      if (doi) parts.push(`https://doi.org/${doi}`);
      formattedCitation = parts.join(' ');
    } else if (lowerStyle === 'chicago_17') {
      const authorsStr = formatAuthorsMLA();
      let parts = [];
      if (authorsStr) parts.push(authorsStr + '.');
      if (title) parts.push(`"${title}."`);
      const journalName = '';
      if (journalName) parts.push(journalName);
      let volIssueYear = '';
      if (volume) volIssueYear += volume;
      if (issueNumber) volIssueYear += `, no. ${issueNumber}`;
      if (year) volIssueYear += ` (${year})`;
      if (volIssueYear) parts.push(volIssueYear + ':');
      if (pages) parts.push(pages + '.');
      if (doi) parts.push(`https://doi.org/${doi}`);
      formattedCitation = parts.join(' ');
    } else {
      // Fallback simple format
      const authorsStr = authors.map((a) => a.full_name || '').filter(Boolean).join(', ');
      formattedCitation = `${authorsStr} (${year}). ${title}.`;
    }

    const styles = this._getFromStorage('citation_styles');
    const style = styles.find((s) => s.code === styleCode) || null;

    return {
      styleCode,
      styleLabel: style ? style.label : styleCode,
      formattedCitation
    };
  }

  // -----------------------------------------
  // Interfaces: Reading Lists (create/add/get)
  // -----------------------------------------
  createReadingListAndAddArticle(articleId, listName, description) {
    const state = this._loadUserState();
    const now = new Date().toISOString();

    // Always create a new list for this interface
    const readingList = {
      id: this._generateId('reading_list'),
      name: listName,
      description: description || '',
      created_at: now,
      updated_at: now
    };
    state.readingLists.push(readingList);

    const readingListItem = {
      id: this._generateId('rli'),
      reading_list_id: readingList.id,
      article_id: articleId,
      added_at: now,
      position: null,
      note: ''
    };
    state.readingListItems.push(readingListItem);

    this._persistUserState(state);

    return {
      readingList,
      readingListItem
    };
  }

  addArticleToReadingList(readingListId, articleId) {
    const state = this._loadUserState();
    const now = new Date().toISOString();

    // Prevent duplicate same-article entries in the same list
    let existingItem = state.readingListItems.find(
      (item) => item.reading_list_id === readingListId && item.article_id === articleId
    );

    if (!existingItem) {
      existingItem = {
        id: this._generateId('rli'),
        reading_list_id: readingListId,
        article_id: articleId,
        added_at: now,
        position: null,
        note: ''
      };
      state.readingListItems.push(existingItem);
      this._persistUserState(state);
    }

    return {
      readingListItem: existingItem
    };
  }

  getReadingListsOverview() {
    const state = this._loadUserState();
    const readingLists = state.readingLists;
    const items = state.readingListItems;

    const counts = {};
    for (const item of items) {
      const id = item.reading_list_id;
      counts[id] = (counts[id] || 0) + 1;
    }

    return readingLists.map((rl) => ({
      ...rl,
      item_count: counts[rl.id] || 0
    }));
  }

  getReadingListDetail(readingListId) {
    const state = this._loadUserState();
    const readingList = state.readingLists.find((rl) => rl.id === readingListId) || null;
    const readingListItems = state.readingListItems.filter(
      (item) => item.reading_list_id === readingListId
    );

    const articles = this._getAllArticles();
    const issues = this._getAllIssues();
    const subjects = this._getAllSubjects();
    const issuesMap = this._buildIdMap(issues);
    const subjectsMap = this._buildIdMap(subjects);
    const articlesMap = this._buildIdMap(articles);

    const items = readingListItems.map((item) => {
      const article = articlesMap[item.article_id] || null;
      const enrichedArticle = article
        ? this._resolveArticleRelations(article, issuesMap, subjectsMap)
        : null;

      return {
        readingListItem: {
          ...item,
          readingList: readingList // resolved foreign key for convenience
        },
        article: enrichedArticle
      };
    });

    return {
      readingList,
      items
    };
  }

  renameReadingList(readingListId, newName) {
    const state = this._loadUserState();
    const readingList = state.readingLists.find((rl) => rl.id === readingListId) || null;
    if (!readingList) {
      return { readingList: null };
    }
    readingList.name = newName;
    readingList.updated_at = new Date().toISOString();
    this._persistUserState(state);
    return { readingList };
  }

  deleteReadingList(readingListId) {
    const state = this._loadUserState();
    const beforeCount = state.readingLists.length;
    state.readingLists = state.readingLists.filter((rl) => rl.id !== readingListId);
    state.readingListItems = state.readingListItems.filter(
      (item) => item.reading_list_id !== readingListId
    );
    const afterCount = state.readingLists.length;
    this._persistUserState(state);
    return { success: beforeCount !== afterCount };
  }

  removeReadingListItem(readingListItemId) {
    const state = this._loadUserState();
    const beforeCount = state.readingListItems.length;
    state.readingListItems = state.readingListItems.filter(
      (item) => item.id !== readingListItemId
    );
    const afterCount = state.readingListItems.length;
    this._persistUserState(state);
    return { success: beforeCount !== afterCount };
  }

  updateReadingListItem(readingListItemId, position, note) {
    const state = this._loadUserState();
    const item = state.readingListItems.find((ri) => ri.id === readingListItemId) || null;
    if (!item) {
      return { readingListItem: null };
    }
    if (typeof position === 'number') item.position = position;
    if (typeof note === 'string') item.note = note;
    this._persistUserState(state);
    return { readingListItem: item };
  }

  // -----------------------------
  // Interfaces: Folders
  // -----------------------------
  createFolderAndAddArticle(articleId, folderName, description) {
    const state = this._loadUserState();
    const now = new Date().toISOString();

    const folder = {
      id: this._generateId('folder'),
      name: folderName,
      description: description || '',
      created_at: now,
      updated_at: now
    };
    state.folders.push(folder);

    const folderItem = {
      id: this._generateId('fli'),
      folder_id: folder.id,
      article_id: articleId,
      added_at: now,
      position: null
    };
    state.folderItems.push(folderItem);

    this._persistUserState(state);

    return {
      folder,
      folderItem
    };
  }

  addArticleToFolder(folderId, articleId) {
    const state = this._loadUserState();
    const now = new Date().toISOString();

    let existingItem = state.folderItems.find(
      (fi) => fi.folder_id === folderId && fi.article_id === articleId
    );

    if (!existingItem) {
      existingItem = {
        id: this._generateId('fli'),
        folder_id: folderId,
        article_id: articleId,
        added_at: now,
        position: null
      };
      state.folderItems.push(existingItem);
      this._persistUserState(state);
    }

    return {
      folderItem: existingItem
    };
  }

  getFoldersOverview() {
    const state = this._loadUserState();
    const folders = state.folders;
    const items = state.folderItems;

    const counts = {};
    for (const item of items) {
      const id = item.folder_id;
      counts[id] = (counts[id] || 0) + 1;
    }

    return folders.map((f) => ({
      ...f,
      item_count: counts[f.id] || 0
    }));
  }

  getFolderDetail(folderId) {
    const state = this._loadUserState();
    const folder = state.folders.find((f) => f.id === folderId) || null;
    const folderItems = state.folderItems.filter((fi) => fi.folder_id === folderId);

    const articles = this._getAllArticles();
    const issues = this._getAllIssues();
    const subjects = this._getAllSubjects();
    const issuesMap = this._buildIdMap(issues);
    const subjectsMap = this._buildIdMap(subjects);
    const articlesMap = this._buildIdMap(articles);

    const items = folderItems.map((item) => {
      const article = articlesMap[item.article_id] || null;
      const enrichedArticle = article
        ? this._resolveArticleRelations(article, issuesMap, subjectsMap)
        : null;

      return {
        folderItem: {
          ...item,
          folder // resolved foreign key
        },
        article: enrichedArticle
      };
    });

    return {
      folder,
      items
    };
  }

  renameFolder(folderId, newName) {
    const state = this._loadUserState();
    const folder = state.folders.find((f) => f.id === folderId) || null;
    if (!folder) {
      return { folder: null };
    }
    folder.name = newName;
    folder.updated_at = new Date().toISOString();
    this._persistUserState(state);
    return { folder };
  }

  deleteFolder(folderId) {
    const state = this._loadUserState();
    const beforeCount = state.folders.length;
    state.folders = state.folders.filter((f) => f.id !== folderId);
    state.folderItems = state.folderItems.filter((fi) => fi.folder_id !== folderId);
    const afterCount = state.folders.length;
    this._persistUserState(state);
    return { success: beforeCount !== afterCount };
  }

  removeFolderItem(folderItemId) {
    const state = this._loadUserState();
    const beforeCount = state.folderItems.length;
    state.folderItems = state.folderItems.filter((fi) => fi.id !== folderItemId);
    const afterCount = state.folderItems.length;
    this._persistUserState(state);
    return { success: beforeCount !== afterCount };
  }

  // -----------------------------
  // Interfaces: Alerts
  // -----------------------------
  getAlertsOverview() {
    const state = this._loadUserState();
    const alerts = state.alerts;
    const subjects = this._getAllSubjects();
    const subjectsMap = this._buildIdMap(subjects);

    return alerts.map((alert) => ({
      ...alert,
      subject: alert.subject_id ? subjectsMap[alert.subject_id] || null : null
    }));
  }

  getAlertSubjects(query) {
    const subjects = this._getAllSubjects();
    const q = this._normalizeString(query);
    if (!q) return subjects;
    return subjects.filter((s) => this._normalizeString(s.name).includes(q));
  }

  createAlert(alertType, subjectId, keywordQuery, frequency, contentTypeFilter, enabled, name) {
    const state = this._loadUserState();
    const now = new Date().toISOString();

    const alert = {
      id: this._generateId('alert'),
      alert_type: alertType,
      subject_id: alertType === 'subject' ? subjectId || null : null,
      keyword_query: alertType === 'keyword' ? keywordQuery || '' : '',
      frequency,
      content_type_filter: contentTypeFilter,
      enabled: typeof enabled === 'boolean' ? enabled : true,
      name: name || null,
      created_at: now,
      updated_at: now
    };

    // Derive name if not provided
    if (!alert.name) {
      if (alert.alert_type === 'subject' && alert.subject_id) {
        const subjects = this._getAllSubjects();
        const subj = subjects.find((s) => s.id === alert.subject_id) || null;
        alert.name = subj ? subj.name : 'Subject Alert';
      } else if (alert.alert_type === 'keyword' && alert.keyword_query) {
        alert.name = `Keyword: ${alert.keyword_query}`;
      } else {
        alert.name = 'Alert';
      }
    }

    state.alerts.push(alert);
    this._persistUserState(state);

    return { alert };
  }

  getAlertDetail(alertId) {
    const state = this._loadUserState();
    const alert = state.alerts.find((a) => a.id === alertId) || null;
    const subjects = this._getAllSubjects();
    const subject = alert && alert.subject_id
      ? subjects.find((s) => s.id === alert.subject_id) || null
      : null;

    return {
      alert,
      subject
    };
  }

  updateAlert(alertId, frequency, contentTypeFilter, enabled, name) {
    const state = this._loadUserState();
    const alert = state.alerts.find((a) => a.id === alertId) || null;
    if (!alert) {
      return { alert: null };
    }

    if (frequency) alert.frequency = frequency;
    if (contentTypeFilter) alert.content_type_filter = contentTypeFilter;
    if (typeof enabled === 'boolean') alert.enabled = enabled;
    if (typeof name === 'string') alert.name = name;
    alert.updated_at = new Date().toISOString();

    this._persistUserState(state);
    return { alert };
  }

  deleteAlert(alertId) {
    const state = this._loadUserState();
    const beforeCount = state.alerts.length;
    state.alerts = state.alerts.filter((a) => a.id !== alertId);
    const afterCount = state.alerts.length;
    this._persistUserState(state);
    return { success: beforeCount !== afterCount };
  }

  // -----------------------------
  // Interfaces: Notes
  // -----------------------------
  getNotesOverview() {
    const state = this._loadUserState();
    const notes = state.notes;
    const articles = this._getAllArticles();
    const issues = this._getAllIssues();
    const subjects = this._getAllSubjects();
    const issuesMap = this._buildIdMap(issues);
    const subjectsMap = this._buildIdMap(subjects);
    const articlesMap = this._buildIdMap(articles);

    return notes.map((note) => {
      const relatedArticle = note.related_article_id
        ? articlesMap[note.related_article_id] || null
        : null;
      const enrichedArticle = relatedArticle
        ? this._resolveArticleRelations(relatedArticle, issuesMap, subjectsMap)
        : null;

      return {
        ...note,
        relatedArticle: enrichedArticle
      };
    });
  }

  createNote(title, body, relatedArticleId) {
    const state = this._loadUserState();
    const now = new Date().toISOString();

    const note = {
      id: this._generateId('note'),
      title,
      body,
      related_article_id: relatedArticleId || null,
      created_at: now,
      updated_at: now
    };

    state.notes.push(note);
    this._persistUserState(state);

    return { note };
  }

  getNoteDetail(noteId) {
    const state = this._loadUserState();
    const note = state.notes.find((n) => n.id === noteId) || null;

    const articles = this._getAllArticles();
    const issues = this._getAllIssues();
    const subjects = this._getAllSubjects();
    const issuesMap = this._buildIdMap(issues);
    const subjectsMap = this._buildIdMap(subjects);
    const articlesMap = this._buildIdMap(articles);

    let enrichedNote = null;
    if (note) {
      const relatedArticle = note.related_article_id
        ? articlesMap[note.related_article_id] || null
        : null;
      const enrichedArticle = relatedArticle
        ? this._resolveArticleRelations(relatedArticle, issuesMap, subjectsMap)
        : null;

      enrichedNote = {
        ...note,
        relatedArticle: enrichedArticle
      };
    }

    return { note: enrichedNote };
  }

  updateNote(noteId, title, body) {
    const state = this._loadUserState();
    const note = state.notes.find((n) => n.id === noteId) || null;
    if (!note) {
      return { note: null };
    }

    if (typeof title === 'string') note.title = title;
    if (typeof body === 'string') note.body = body;
    note.updated_at = new Date().toISOString();
    this._persistUserState(state);
    return { note };
  }

  deleteNote(noteId) {
    const state = this._loadUserState();
    const beforeCount = state.notes.length;
    state.notes = state.notes.filter((n) => n.id !== noteId);
    const afterCount = state.notes.length;
    this._persistUserState(state);
    return { success: beforeCount !== afterCount };
  }

  // -----------------------------
  // Interface: getAuthorProfile
  // -----------------------------
  getAuthorProfile(authorId, publicationYearStart, publicationYearEnd, subjectId) {
    const authors = this._getFromStorage('authors');
    const author = authors.find((a) => a.id === authorId) || null;

    const articleAuthors = this._getFromStorage('article_authors').filter(
      (aa) => aa.author_id === authorId
    );

    const articleIds = articleAuthors.map((aa) => aa.article_id);
    const allArticles = this._getAllArticles();
    const issues = this._getAllIssues();
    const subjects = this._getAllSubjects();
    const issuesMap = this._buildIdMap(issues);
    const subjectsMap = this._buildIdMap(subjects);

    let publications = allArticles.filter((a) => articleIds.includes(a.id));

    if (typeof publicationYearStart === 'number') {
      publications = publications.filter((a) => a.publication_year >= publicationYearStart);
    }
    if (typeof publicationYearEnd === 'number') {
      publications = publications.filter((a) => a.publication_year <= publicationYearEnd);
    }
    if (subjectId) {
      publications = publications.filter((a) => {
        const sids = this._ensureArray(a.subject_ids || a.subjectIds);
        return sids.includes(subjectId);
      });
    }

    const enrichedPublications = publications.map((a) =>
      this._resolveArticleRelations(a, issuesMap, subjectsMap)
    );

    // Instrumentation for task completion tracking
    try {
      if (author) {
        localStorage.setItem('task9_openedAuthorProfileId', authorId);
      }
    } catch (e) {}

    return {
      author,
      publications: enrichedPublications
    };
  }

  // -----------------------------
  // Interfaces: Static / CMS Content
  // -----------------------------
  getAboutPageContent() {
    const raw = localStorage.getItem('about_page_content');
    return raw ? JSON.parse(raw) : { title: '', body: '', sections: [] };
  }

  getContactInformation() {
    const raw = localStorage.getItem('contact_information');
    return raw
      ? JSON.parse(raw)
      : {
          generalEmail: '',
          editorialOfficeEmail: '',
          technicalSupportEmail: '',
          mailingAddress: '',
          departmentContacts: []
        };
  }

  sendContactMessage(name, email, subject, message) {
    // Simulate sending by storing metadata only
    const messages = this._getFromStorage('contact_messages');
    messages.push({
      id: this._generateId('contact_msg'),
      name,
      email,
      subject,
      message,
      created_at: new Date().toISOString()
    });
    this._saveToStorage('contact_messages', messages);
    return {
      success: true,
      confirmationMessage: 'Your message has been recorded.'
    };
  }

  getEditorialPoliciesContent() {
    const raw = localStorage.getItem('editorial_policies_content');
    return raw ? JSON.parse(raw) : { title: '', body: '', sections: [] };
  }

  getHelpContent() {
    const raw = localStorage.getItem('help_content');
    return raw ? JSON.parse(raw) : { title: '', body: '', faqs: [] };
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