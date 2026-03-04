/*
  BusinessLogic for academic research website (economics and fraud)
  - Uses localStorage (with Node-compatible polyfill)
  - Implements all specified interfaces
  - No DOM/window/document usage except localStorage access and final export wiring
*/

// localStorage polyfill for Node.js and environments without localStorage
const localStorage = (function () {
  try {
    if (typeof globalThis !== "undefined" && globalThis.localStorage) {
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

  // ==========================
  // Storage helpers
  // ==========================

  _initStorage() {
    const keys = [
      // Core entities
      "articles",
      "journals",
      "authors",
      "article_authors",
      "datasets",
      "workspace",            // will store array of Workspace records (typically 0 or 1)
      "workspace_datasets",
      "followed_authors",
      "saved_lists",
      "saved_list_items",
      "tags",
      "saved_item_tags",
      "alerts",
      "visualizations",
      "learning_paths",
      "learning_path_modules",
      "learning_path_bookmarks",
      "learning_path_notes",
      "countries",
      // Misc
      "contact_tickets"
    ];

    for (const key of keys) {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    }

    if (!localStorage.getItem("idCounter")) {
      localStorage.setItem("idCounter", "1000");
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
    const current = parseInt(localStorage.getItem("idCounter") || "1000", 10);
    const next = current + 1;
    localStorage.setItem("idCounter", String(next));
    return next;
  }

  _generateId(prefix) {
    return prefix + "_" + this._getNextIdCounter();
  }

  _nowIso() {
    return new Date().toISOString();
  }

  _textMatches(haystack, query) {
    if (!query) return true;
    if (!haystack) return false;
    return String(haystack).toLowerCase().includes(String(query).toLowerCase());
  }

  _arrayTextMatches(arr, query) {
    if (!query) return true;
    if (!Array.isArray(arr)) return false;
    const q = String(query).toLowerCase();
    return arr.some(v => String(v).toLowerCase().includes(q));
  }

  _intersects(a, b) {
    if (!Array.isArray(a) || !Array.isArray(b) || !a.length || !b.length) return false;
    const setB = new Set(b);
    return a.some(x => setB.has(x));
  }

  // ==========================
  // Private helpers from spec
  // ==========================

  // Retrieve or create the single-user workspace
  _getOrCreateWorkspace() {
    let workspaces = this._getFromStorage("workspace");
    if (!Array.isArray(workspaces)) {
      workspaces = [];
    }
    let workspace = workspaces[0] || null;
    if (!workspace) {
      workspace = {
        id: this._generateId("workspace"),
        name: "My workspace",
        created_at: this._nowIso(),
        updated_at: this._nowIso()
      };
      workspaces.push(workspace);
      this._saveToStorage("workspace", workspaces);
    }
    return workspace;
  }

  // Ensure Tag records exist for given names
  _ensureTagRecords(tagNames) {
    let tags = this._getFromStorage("tags");
    if (!Array.isArray(tagNames)) tagNames = [];
    const result = [];
    for (const rawName of tagNames) {
      const name = String(rawName || "").trim();
      if (!name) continue;
      let tag = tags.find(t => t.name === name);
      if (!tag) {
        tag = {
          id: this._generateId("tag"),
          name,
          description: ""
        };
        tags.push(tag);
      }
      result.push(tag);
    }
    this._saveToStorage("tags", tags);
    return result;
  }

  // Validate visualization configuration before saving
  _validateVisualizationConfig(config) {
    const errors = [];
    const datasets = this._getFromStorage("datasets");
    const dataset = datasets.find(d => d.id === config.datasetId);
    if (!dataset) {
      errors.push("dataset_not_found");
    }

    const allowedChartTypes = ["line", "bar", "scatter", "area", "time_series"];
    if (!allowedChartTypes.includes(config.chartType)) {
      errors.push("invalid_chart_type");
    }

    if (!config.xField) {
      errors.push("missing_x_field");
    }
    if (!config.yField) {
      errors.push("missing_y_field");
    }

    if (config.yearStart != null && config.yearEnd != null && config.yearStart > config.yearEnd) {
      errors.push("invalid_year_range");
    }

    if (config.countrySelectionMode === "top_n_by_total") {
      if (config.topNCountries == null || config.topNCountries <= 0) {
        errors.push("invalid_top_n_countries");
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  _getDefaultCitationStyle() {
    return "apa_7";
  }

  // ==========================
  // Interface implementations
  // ==========================

  // ---------- Homepage ----------

  // getHomepageContent()
  getHomepageContent() {
    const articles = this._getFromStorage("articles");
    const articleAuthors = this._getFromStorage("article_authors");
    const authors = this._getFromStorage("authors");
    const datasets = this._getFromStorage("datasets");
    const learningPaths = this._getFromStorage("learning_paths");

    // Featured articles: top by citation_count
    const featuredArticlesRaw = [...articles]
      .sort((a, b) => (b.citation_count || 0) - (a.citation_count || 0))
      .slice(0, 5);

    const featuredArticles = featuredArticlesRaw.map(article => {
      const aAuthors = articleAuthors
        .filter(aa => aa.article_id === article.id)
        .sort((a, b) => (a.author_order || 0) - (b.author_order || 0))
        .slice(0, 3)
        .map(aa => {
          const author = authors.find(x => x.id === aa.author_id) || null;
          return author
            ? {
                authorId: author.id,
                fullName: author.full_name,
                affiliation: author.affiliation || ""
              }
            : null;
        })
        .filter(x => x !== null);

      return { article, primaryAuthors: aAuthors };
    });

    // Featured datasets: first few
    const featuredDatasets = datasets.slice(0, 5);

    // Featured learning paths: first few
    const featuredLearningPaths = learningPaths.slice(0, 5);

    const globalSearchScopes = [
      { value: "all", label: "All" },
      { value: "articles", label: "Articles" },
      { value: "datasets", label: "Datasets" },
      { value: "authors", label: "Authors" }
    ];

    const advancedSearchSupported = true;

    return {
      featuredArticles,
      featuredDatasets,
      featuredLearningPaths,
      globalSearchScopes,
      advancedSearchSupported
    };
  }

  // globalSearch(query, scope = 'all', limitPerType = 5)
  globalSearch(query, scope = "all", limitPerType = 5) {
    const q = String(query || "").trim();
    const scopeNorm = scope || "all";

    const articles = this._getFromStorage("articles");
    const datasets = this._getFromStorage("datasets");
    const authors = this._getFromStorage("authors");

    let articleResults = [];
    let datasetResults = [];
    let authorResults = [];

    if (scopeNorm === "all" || scopeNorm === "articles") {
      articleResults = articles.filter(a => {
        return (
          this._textMatches(a.title, q) ||
          this._textMatches(a.abstract, q) ||
          this._arrayTextMatches(a.keywords, q) ||
          this._arrayTextMatches(a.subject_areas, q)
        );
      }).slice(0, limitPerType);
    }

    if (scopeNorm === "all" || scopeNorm === "datasets") {
      datasetResults = datasets.filter(d => {
        return (
          this._textMatches(d.title, q) ||
          this._textMatches(d.description, q) ||
          this._arrayTextMatches(d.topic_keywords, q)
        );
      }).slice(0, limitPerType);
    }

    if (scopeNorm === "all" || scopeNorm === "authors") {
      authorResults = authors.filter(a => {
        return (
          this._textMatches(a.full_name, q) ||
          this._textMatches(a.affiliation, q) ||
          this._arrayTextMatches(a.research_areas, q)
        );
      }).slice(0, limitPerType);
    }

    return {
      articles: articleResults,
      datasets: datasetResults,
      authors: authorResults
    };
  }

  // ---------- Article search & details ----------

  // getArticleSearchFilterOptions()
  getArticleSearchFilterOptions() {
    const articles = this._getFromStorage("articles");
    const countries = this._getFromStorage("countries");

    let minYear = null;
    let maxYear = null;
    for (const a of articles) {
      if (typeof a.publication_year === "number") {
        if (minYear == null || a.publication_year < minYear) minYear = a.publication_year;
        if (maxYear == null || a.publication_year > maxYear) maxYear = a.publication_year;
      }
    }

    const methodologyTypesValues = [
      "empirical_qu e1ntitative", // note: weird accent in spec, kept verbatim
      "empirical_qualitative",
      "mixed_methods",
      "theoretical",
      "meta_analysis",
      "other"
    ];
    const methodologyTypes = methodologyTypesValues.map(v => ({ value: v, label: v.replace(/_/g, " ") }));

    // Build subjectAreas from articles
    const subjectSet = new Set();
    for (const a of articles) {
      if (Array.isArray(a.subject_areas)) {
        a.subject_areas.forEach(s => subjectSet.add(s));
      }
    }
    const subjectAreas = Array.from(subjectSet).map(s => ({ code: s, label: s }));

    const journalQuartilesEconomics = ["q1", "q2", "q3", "q4"].map(q => ({
      value: q,
      label: q.toUpperCase()
    }));

    const searchScopes = [
      { value: "full_text", label: "Full text" },
      { value: "title_abstract", label: "Title & abstract" }
    ];

    const sortOptions = [
      { value: "relevance", label: "Relevance" },
      { value: "citations_desc", label: "Citations (highest first)" },
      { value: "pub_date_desc", label: "Publication date (newest first)" }
    ];

    return {
      yearRange: { minYear, maxYear },
      methodologyTypes,
      countries,
      subjectAreas,
      journalQuartilesEconomics,
      searchScopes,
      sortOptions
    };
  }

  // searchArticles(query, searchScope = 'full_text', filters = {}, sortBy = 'relevance', page = 1, pageSize = 20)
  searchArticles(query, searchScope = "full_text", filters = {}, sortBy = "relevance", page = 1, pageSize = 20) {
    const q = String(query || "").trim();
    const articles = this._getFromStorage("articles");
    const journals = this._getFromStorage("journals");
    const articleAuthors = this._getFromStorage("article_authors");
    const authors = this._getFromStorage("authors");
    const savedListItems = this._getFromStorage("saved_list_items");

    const f = filters || {};

    let results = articles.filter(a => {
      // Text search
      let matchesText = true;
      if (q) {
        if (searchScope === "title_abstract") {
          matchesText = this._textMatches(a.title, q) || this._textMatches(a.abstract, q);
        } else {
          matchesText = (
            this._textMatches(a.title, q) ||
            this._textMatches(a.abstract, q) ||
            this._arrayTextMatches(a.keywords, q) ||
            this._textMatches(a.methods_summary, q)
          );
        }
      }
      if (!matchesText) return false;

      // Publication year
      if (f.publicationYearStart != null && typeof a.publication_year === "number" && a.publication_year < f.publicationYearStart) {
        return false;
      }
      if (f.publicationYearEnd != null && typeof a.publication_year === "number" && a.publication_year > f.publicationYearEnd) {
        return false;
      }

      // Methodology type
      if (f.methodologyType && a.methodology_type && a.methodology_type !== f.methodologyType) {
        return false;
      }

      // Country names (study_countries)
      if (Array.isArray(f.countryNames) && f.countryNames.length > 0) {
        if (!this._intersects(a.study_countries || [], f.countryNames)) {
          return false;
        }
      }

      // Subject areas
      if (Array.isArray(f.subjectAreas) && f.subjectAreas.length > 0) {
        const articleAreas = a.subject_areas || [];
        let ok = this._intersects(articleAreas, f.subjectAreas);
        if (!ok && a.journal_id) {
          const j = journals.find(jn => jn.id === a.journal_id);
          if (j && j.subject_area_primary && f.subjectAreas.includes(j.subject_area_primary)) {
            ok = true;
          }
        }
        if (!ok) return false;
      }

      // Journal quartile (economics)
      if (f.journalQuartileEconomics) {
        let quart = a.journal_quartile_economics;
        if (!quart && a.journal_id) {
          const j = journals.find(jn => jn.id === a.journal_id);
          if (j) quart = j.economics_quartile;
        }
        if (quart !== f.journalQuartileEconomics) return false;
      }

      return true;
    });

    // Sorting
    if (sortBy === "citations_desc") {
      results.sort((a, b) => (b.citation_count || 0) - (a.citation_count || 0));
    } else if (sortBy === "pub_date_desc") {
      results.sort((a, b) => {
        const ad = a.publication_date ? Date.parse(a.publication_date) : null;
        const bd = b.publication_date ? Date.parse(b.publication_date) : null;
        if (ad && bd) return bd - ad;
        if (ad && !bd) return -1;
        if (!ad && bd) return 1;
        return (b.publication_year || 0) - (a.publication_year || 0);
      });
    } else {
      // relevance: keep current order (could be original insertion order)
    }

    const totalResults = results.length;
    const p = Math.max(1, parseInt(page || 1, 10));
    const ps = Math.max(1, parseInt(pageSize || 20, 10));
    const start = (p - 1) * ps;
    const paged = results.slice(start, start + ps);

    const outputResults = paged.map(article => {
      const relAuthors = articleAuthors
        .filter(aa => aa.article_id === article.id)
        .sort((a, b) => (a.author_order || 0) - (b.author_order || 0))
        .map(aa => {
          const au = authors.find(x => x.id === aa.author_id);
          return au ? { authorId: au.id, fullName: au.full_name } : null;
        })
        .filter(x => x !== null);

      const isSaved = savedListItems.some(item => item.article_id === article.id);

      return {
        article,
        authors: relAuthors,
        isSaved
      };
    });

    return {
      results: outputResults,
      totalResults,
      page: p,
      pageSize: ps
    };
  }

  // getArticleDetails(articleId)
  getArticleDetails(articleId) {
    const articles = this._getFromStorage("articles");
    const journals = this._getFromStorage("journals");
    const articleAuthors = this._getFromStorage("article_authors");
    const authors = this._getFromStorage("authors");
    const savedListItems = this._getFromStorage("saved_list_items");

    const article = articles.find(a => a.id === articleId) || null;
    let journal = null;
    let relAuthors = [];
    let isSaved = false;
    let savedListIds = [];

    if (article) {
      if (article.journal_id) {
        journal = journals.find(j => j.id === article.journal_id) || null;
      }

      relAuthors = articleAuthors
        .filter(aa => aa.article_id === article.id)
        .sort((a, b) => (a.author_order || 0) - (b.author_order || 0))
        .map(aa => authors.find(x => x.id === aa.author_id))
        .filter(x => x != null);

      const items = savedListItems.filter(item => item.article_id === article.id);
      isSaved = items.length > 0;
      savedListIds = Array.from(new Set(items.map(i => i.list_id)));
    }

    const methods = {
      summary: article ? (article.methods_summary || "") : "",
      models: article ? (article.methods_models || []) : []
    };

    const availableCitationStyles = [
      { styleId: "apa_7", label: "APA 7th edition" },
      { styleId: "mla_9", label: "MLA 9th edition" },
      { styleId: "chicago", label: "Chicago" }
    ];

    return {
      article,
      journal,
      authors: relAuthors,
      methods,
      isSaved,
      savedListIds,
      availableCitationStyles
    };
  }

  // ---------- Saved lists & tags ----------

  // getSavedListsSummary()
  getSavedListsSummary() {
    return this._getFromStorage("saved_lists");
  }

  // createSavedList(name, type, description)
  createSavedList(name, type, description) {
    const trimmedName = String(name || "").trim();
    if (!trimmedName) {
      return { list: null, success: false, message: "List name is required" };
    }
    if (type !== "reading_list" && type !== "collection") {
      return { list: null, success: false, message: "Invalid list type" };
    }

    let lists = this._getFromStorage("saved_lists");
    const list = {
      id: this._generateId("list"),
      name: trimmedName,
      description: description || "",
      type,
      created_at: this._nowIso(),
      updated_at: this._nowIso()
    };
    lists.push(list);
    this._saveToStorage("saved_lists", lists);

    return { list, success: true, message: "List created" };
  }

  // addArticleToSavedList(articleId, listId, newListName, newListType = 'reading_list')
  addArticleToSavedList(articleId, listId, newListName, newListType = "reading_list") {
    const articles = this._getFromStorage("articles");
    const article = articles.find(a => a.id === articleId);
    if (!article) {
      return { list: null, listItem: null, createdNewList: false, success: false, message: "Article not found" };
    }

    let lists = this._getFromStorage("saved_lists");
    let list = null;
    let createdNewList = false;

    if (listId) {
      list = lists.find(l => l.id === listId) || null;
      if (!list) {
        return { list: null, listItem: null, createdNewList: false, success: false, message: "List not found" };
      }
    } else if (newListName) {
      const res = this.createSavedList(newListName, newListType || "reading_list");
      if (!res.success || !res.list) {
        return { list: null, listItem: null, createdNewList: false, success: false, message: res.message || "Unable to create list" };
      }
      list = res.list;
      lists = this._getFromStorage("saved_lists"); // reload after create
      createdNewList = true;
    } else {
      return { list: null, listItem: null, createdNewList: false, success: false, message: "listId or newListName is required" };
    }

    let items = this._getFromStorage("saved_list_items");
    let existing = items.find(i => i.list_id === list.id && i.article_id === articleId);
    if (existing) {
      return { list, listItem: existing, createdNewList, success: true, message: "Article already in list" };
    }

    const existingPositions = items.filter(i => i.list_id === list.id).map(i => i.position || 0);
    const nextPos = existingPositions.length ? Math.max(...existingPositions) + 1 : 1;

    const listItem = {
      id: this._generateId("listitem"),
      list_id: list.id,
      article_id: articleId,
      added_at: this._nowIso(),
      position: nextPos,
      notes: ""
    };

    items.push(listItem);
    this._saveToStorage("saved_list_items", items);

    return { list, listItem, createdNewList, success: true, message: "Article added to list" };
  }

  // getSavedListDetails(listId)
  getSavedListDetails(listId) {
    const lists = this._getFromStorage("saved_lists");
    const items = this._getFromStorage("saved_list_items");
    const articles = this._getFromStorage("articles");
    const savedItemTags = this._getFromStorage("saved_item_tags");
    const tags = this._getFromStorage("tags");

    const list = lists.find(l => l.id === listId) || null;

    const listItems = items
      .filter(i => i.list_id === listId)
      .sort((a, b) => (a.position || 0) - (b.position || 0));

    const detailedItems = listItems.map(listItem => {
      const article = articles.find(a => a.id === listItem.article_id) || null;
      const relTags = savedItemTags
        .filter(st => st.list_item_id === listItem.id)
        .map(st => tags.find(t => t.id === st.tag_id))
        .filter(t => t != null);

      return {
        listItem,
        article,
        tags: relTags
      };
    });

    return {
      list,
      items: detailedItems
    };
  }

  // updateSavedItemTags(listItemId, tagNames)
  updateSavedItemTags(listItemId, tagNames) {
    const listItems = this._getFromStorage("saved_list_items");
    const item = listItems.find(i => i.id === listItemId);
    if (!item) {
      return { tags: [], success: false };
    }

    const tags = this._ensureTagRecords(tagNames || []);

    let savedItemTags = this._getFromStorage("saved_item_tags");
    // Remove existing tags for this item
    savedItemTags = savedItemTags.filter(st => st.list_item_id !== listItemId);

    for (const tag of tags) {
      savedItemTags.push({
        id: this._generateId("saveditemtag"),
        list_item_id: listItemId,
        tag_id: tag.id,
        added_at: this._nowIso()
      });
    }

    this._saveToStorage("saved_item_tags", savedItemTags);

    return { tags, success: true };
  }

  // listSavedLists()
  listSavedLists() {
    return this._getFromStorage("saved_lists");
  }

  // renameSavedList(listId, newName)
  renameSavedList(listId, newName) {
    let lists = this._getFromStorage("saved_lists");
    const list = lists.find(l => l.id === listId) || null;
    if (!list) {
      return { list: null, success: false };
    }
    list.name = String(newName || "").trim();
    list.updated_at = this._nowIso();
    this._saveToStorage("saved_lists", lists);
    return { list, success: true };
  }

  // deleteSavedList(listId, confirm)
  deleteSavedList(listId, confirm) {
    if (!confirm) {
      return { success: false, message: "Confirmation required" };
    }

    let lists = this._getFromStorage("saved_lists");
    const listExists = lists.some(l => l.id === listId);
    if (!listExists) {
      return { success: false, message: "List not found" };
    }

    lists = lists.filter(l => l.id !== listId);
    this._saveToStorage("saved_lists", lists);

    // Remove items and tags for this list
    let items = this._getFromStorage("saved_list_items");
    const itemIdsToRemove = items.filter(i => i.list_id === listId).map(i => i.id);
    items = items.filter(i => i.list_id !== listId);
    this._saveToStorage("saved_list_items", items);

    let savedItemTags = this._getFromStorage("saved_item_tags");
    savedItemTags = savedItemTags.filter(st => !itemIdsToRemove.includes(st.list_item_id));
    this._saveToStorage("saved_item_tags", savedItemTags);

    return { success: true, message: "List deleted" };
  }

  // removeSavedListItem(listItemId)
  removeSavedListItem(listItemId) {
    let items = this._getFromStorage("saved_list_items");
    const exists = items.some(i => i.id === listItemId);
    if (!exists) {
      return { success: false };
    }
    items = items.filter(i => i.id !== listItemId);
    this._saveToStorage("saved_list_items", items);

    let savedItemTags = this._getFromStorage("saved_item_tags");
    savedItemTags = savedItemTags.filter(st => st.list_item_id !== listItemId);
    this._saveToStorage("saved_item_tags", savedItemTags);

    return { success: true };
  }

  // moveSavedListItem(listItemId, targetListId)
  moveSavedListItem(listItemId, targetListId) {
    let items = this._getFromStorage("saved_list_items");
    const lists = this._getFromStorage("saved_lists");

    const targetList = lists.find(l => l.id === targetListId) || null;
    if (!targetList) {
      return { newListItem: null, success: false };
    }

    const item = items.find(i => i.id === listItemId) || null;
    if (!item) {
      return { newListItem: null, success: false };
    }

    const existingPositions = items.filter(i => i.list_id === targetListId).map(i => i.position || 0);
    const nextPos = existingPositions.length ? Math.max(...existingPositions) + 1 : 1;

    item.list_id = targetListId;
    item.position = nextPos;

    this._saveToStorage("saved_list_items", items);

    return { newListItem: item, success: true };
  }

  // reorderSavedListItems(listId, orderedItemIds)
  reorderSavedListItems(listId, orderedItemIds) {
    if (!Array.isArray(orderedItemIds)) orderedItemIds = [];
    let items = this._getFromStorage("saved_list_items");

    const idToItem = new Map();
    items.forEach(item => {
      if (item.list_id === listId) {
        idToItem.set(item.id, item);
      }
    });

    orderedItemIds.forEach((id, index) => {
      const item = idToItem.get(id);
      if (item) {
        item.position = index + 1;
      }
    });

    this._saveToStorage("saved_list_items", items);
    return { success: true };
  }

  // ---------- Dataset search, details, workspace ----------

  // getDatasetSearchFilterOptions()
  getDatasetSearchFilterOptions() {
    const datasets = this._getFromStorage("datasets");

    let minYear = null;
    let maxYear = null;
    for (const d of datasets) {
      const s = d.coverage_start_year;
      const e = d.coverage_end_year;
      if (typeof s === "number") {
        if (minYear == null || s < minYear) minYear = s;
      }
      if (typeof e === "number") {
        if (maxYear == null || e > maxYear) maxYear = e;
      }
    }

    const formatsSet = new Set();
    for (const d of datasets) {
      if (Array.isArray(d.available_formats)) {
        d.available_formats.forEach(f => formatsSet.add(f));
      }
    }
    const fileFormats = Array.from(formatsSet).map(f => ({ value: f, label: String(f).toUpperCase() }));

    const sortOptions = [
      { value: "relevance", label: "Relevance" },
      { value: "num_variables_desc", label: "Number of variables (highest first)" },
      { value: "num_records_desc", label: "Number of records (largest first)" }
    ];

    return {
      yearRange: { minYear, maxYear },
      fileFormats,
      sortOptions
    };
  }

  // searchDatasets(query, filters = {}, sortBy = 'relevance', page = 1, pageSize = 20)
  searchDatasets(query, filters = {}, sortBy = "relevance", page = 1, pageSize = 20) {
    const q = String(query || "").trim();
    const datasets = this._getFromStorage("datasets");
    const f = filters || {};

    let results = datasets.filter(d => {
      // Text search
      let matchesText = true;
      if (q) {
        matchesText = (
          this._textMatches(d.title, q) ||
          this._textMatches(d.description, q) ||
          this._arrayTextMatches(d.topic_keywords, q)
        );
      }
      if (!matchesText) return false;

      // Year coverage: require dataset to fully cover range if specified
      if (f.coverageStartYear != null) {
        if (typeof d.coverage_start_year === "number" && typeof d.coverage_end_year === "number") {
          if (!(d.coverage_start_year <= f.coverageStartYear && d.coverage_end_year >= f.coverageStartYear)) {
            return false;
          }
        }
      }
      if (f.coverageEndYear != null) {
        if (typeof d.coverage_start_year === "number" && typeof d.coverage_end_year === "number") {
          if (!(d.coverage_start_year <= f.coverageEndYear && d.coverage_end_year >= f.coverageEndYear)) {
            return false;
          }
        }
      }

      // Minimum records
      if (f.minRecords != null && typeof d.num_records === "number" && d.num_records < f.minRecords) {
        return false;
      }

      // Required formats
      if (Array.isArray(f.requiredFormats) && f.requiredFormats.length > 0) {
        const formats = d.available_formats || [];
        const hasAll = f.requiredFormats.every(r => formats.includes(r));
        if (!hasAll) return false;
      }

      // Dataset type
      if (f.datasetType && d.dataset_type && d.dataset_type !== f.datasetType) {
        return false;
      }

      return true;
    });

    if (sortBy === "num_variables_desc") {
      results.sort((a, b) => (b.num_variables || 0) - (a.num_variables || 0));
    } else if (sortBy === "num_records_desc") {
      results.sort((a, b) => (b.num_records || 0) - (a.num_records || 0));
    } else {
      // relevance: keep current
    }

    const totalResults = results.length;
    const p = Math.max(1, parseInt(page || 1, 10));
    const ps = Math.max(1, parseInt(pageSize || 20, 10));
    const start = (p - 1) * ps;
    const paged = results.slice(start, start + ps);

    return {
      results: paged,
      totalResults,
      page: p,
      pageSize: ps
    };
  }

  // getDatasetDetails(datasetId)
  getDatasetDetails(datasetId) {
    const datasets = this._getFromStorage("datasets");
    const workspaceDatasets = this._getFromStorage("workspace_datasets");
    const articles = this._getFromStorage("articles");

    const dataset = datasets.find(d => d.id === datasetId) || null;
    const isInWorkspace = workspaceDatasets.some(wd => wd.dataset_id === datasetId);
    const availableFormats = dataset && Array.isArray(dataset.available_formats) ? dataset.available_formats : [];

    const relatedArticles = [];
    if (dataset && Array.isArray(dataset.related_article_ids)) {
      for (const aid of dataset.related_article_ids) {
        const article = articles.find(a => a.id === aid);
        if (article) relatedArticles.push(article);
      }
    }

    // variables are not persisted in this model; return empty array
    const variables = [];

    return {
      dataset,
      variables,
      isInWorkspace,
      availableFormats,
      relatedArticles
    };
  }

  // downloadDatasetFile(datasetId, format)
  downloadDatasetFile(datasetId, format) {
    const datasets = this._getFromStorage("datasets");
    const dataset = datasets.find(d => d.id === datasetId) || null;
    if (!dataset) {
      return { downloadUrl: "", success: false, message: "Dataset not found" };
    }
    const formats = dataset.available_formats || [];
    if (!formats.includes(format)) {
      return { downloadUrl: "", success: false, message: "Requested format not available" };
    }
    // Simulated download URL
    const downloadUrl = `/datasets/${encodeURIComponent(datasetId)}.${encodeURIComponent(format)}`;

    // Instrumentation for task completion tracking (task_2)
    try {
      if (format === "csv") {
        localStorage.setItem(
          "task2_lastCsvDownload",
          JSON.stringify({
            datasetId: datasetId,
            format: format,
            downloadedAt: this._nowIso()
          })
        );
      }
    } catch (e) {
      console.error("Instrumentation error (task_2):", e);
    }

    return { downloadUrl, success: true, message: "Download URL generated" };
  }

  // addDatasetToWorkspace(datasetId)
  addDatasetToWorkspace(datasetId) {
    const datasets = this._getFromStorage("datasets");
    const dataset = datasets.find(d => d.id === datasetId);
    if (!dataset) {
      return { workspace: null, workspaceDataset: null, success: false };
    }

    const workspace = this._getOrCreateWorkspace();
    let workspaceDatasets = this._getFromStorage("workspace_datasets");

    let existing = workspaceDatasets.find(wd => wd.workspace_id === workspace.id && wd.dataset_id === datasetId);
    if (existing) {
      return { workspace, workspaceDataset: existing, success: true };
    }

    const workspaceDataset = {
      id: this._generateId("workspacedataset"),
      workspace_id: workspace.id,
      dataset_id: datasetId,
      pinned_at: this._nowIso()
    };

    workspaceDatasets.push(workspaceDataset);
    this._saveToStorage("workspace_datasets", workspaceDatasets);

    return { workspace, workspaceDataset, success: true };
  }

  // getWorkspaceOverview()
  getWorkspaceOverview() {
    const workspace = this._getOrCreateWorkspace();
    const workspaceDatasets = this._getFromStorage("workspace_datasets");
    const datasets = this._getFromStorage("datasets");
    const followedAuthors = this._getFromStorage("followed_authors");
    const authors = this._getFromStorage("authors");
    const savedLists = this._getFromStorage("saved_lists");
    const alerts = this._getFromStorage("alerts");

    const datasetEntries = workspaceDatasets
      .filter(wd => wd.workspace_id === workspace.id)
      .map(wd => ({
        workspaceDataset: wd,
        dataset: datasets.find(d => d.id === wd.dataset_id) || null
      }));

    const followedAuthorEntries = followedAuthors.map(fa => ({
      followedAuthor: fa,
      author: authors.find(a => a.id === fa.author_id) || null
    }));

    const readingListsSummary = savedLists;
    const activeAlertsSummary = alerts.filter(a => a.status === "active");

    return {
      workspace,
      datasets: datasetEntries,
      followedAuthors: followedAuthorEntries,
      readingListsSummary,
      activeAlertsSummary
    };
  }

  // unpinDatasetFromWorkspace(workspaceDatasetId)
  unpinDatasetFromWorkspace(workspaceDatasetId) {
    let workspaceDatasets = this._getFromStorage("workspace_datasets");
    const exists = workspaceDatasets.some(wd => wd.id === workspaceDatasetId);
    if (!exists) {
      return { success: false };
    }
    workspaceDatasets = workspaceDatasets.filter(wd => wd.id !== workspaceDatasetId);
    this._saveToStorage("workspace_datasets", workspaceDatasets);
    return { success: true };
  }

  // ---------- Author search & follow ----------

  // getAuthorSearchFilterOptions()
  getAuthorSearchFilterOptions() {
    const authors = this._getFromStorage("authors");

    const areaSet = new Set();
    let minPubsSince2018 = null;

    for (const a of authors) {
      if (Array.isArray(a.research_areas)) {
        a.research_areas.forEach(r => areaSet.add(r));
      }
      if (typeof a.publications_since_2018 === "number") {
        if (minPubsSince2018 == null || a.publications_since_2018 < minPubsSince2018) {
          minPubsSince2018 = a.publications_since_2018;
        }
      }
    }

    const researchAreas = Array.from(areaSet).map(r => ({ code: r, label: r }));

    const sortOptions = [
      { value: "relevance", label: "Relevance" },
      { value: "pubs_since_2018_desc", label: "Publications since 2018 (highest first)" },
      { value: "total_citations_desc", label: "Total citations (highest first)" }
    ];

    return {
      researchAreas,
      minPublicationsSince2018: minPubsSince2018 || 0,
      sortOptions
    };
  }

  // searchAuthors(query, filters = {}, sortBy = 'relevance', page = 1, pageSize = 20)
  searchAuthors(query, filters = {}, sortBy = "relevance", page = 1, pageSize = 20) {
    const q = String(query || "").trim();
    const authors = this._getFromStorage("authors");
    const f = filters || {};

    let results = authors.filter(a => {
      // Text
      let matchesText = true;
      if (q) {
        const lowerQ = q.toLowerCase();
        matchesText = (
          this._textMatches(a.full_name, q) ||
          this._textMatches(a.affiliation, q) ||
          this._arrayTextMatches(a.research_areas, q) ||
          this._textMatches(a.profile_bio, q)
        );

        // If searching for crime-related work, also match common fraud-related synonyms
        if (!matchesText && lowerQ.includes("crime")) {
          const altTerms = ["fraud", "ponzi"];
          matchesText = altTerms.some(term => (
            this._textMatches(a.full_name, term) ||
            this._textMatches(a.affiliation, term) ||
            this._arrayTextMatches(a.research_areas, term) ||
            this._textMatches(a.profile_bio, term)
          ));
        }
      }
      if (!matchesText) return false;

      // Research areas filter
      if (Array.isArray(f.researchAreas) && f.researchAreas.length > 0) {
        if (!this._intersects(a.research_areas || [], f.researchAreas)) {
          return false;
        }
      }

      // Minimum publications since 2018
      if (f.minPublicationsSince2018 != null) {
        if (typeof a.publications_since_2018 === "number") {
          if (a.publications_since_2018 < f.minPublicationsSince2018) return false;
        }
      }

      return true;
    });

    if (sortBy === "pubs_since_2018_desc") {
      results.sort((a, b) => (b.publications_since_2018 || 0) - (a.publications_since_2018 || 0));
    } else if (sortBy === "total_citations_desc") {
      results.sort((a, b) => (b.total_citations || 0) - (a.total_citations || 0));
    } else {
      // relevance: sort by name
      results.sort((a, b) => String(a.full_name || "").localeCompare(String(b.full_name || "")));
    }

    const totalResults = results.length;
    const p = Math.max(1, parseInt(page || 1, 10));
    const ps = Math.max(1, parseInt(pageSize || 20, 10));
    const start = (p - 1) * ps;
    const paged = results.slice(start, start + ps);

    return {
      results: paged,
      totalResults,
      page: p,
      pageSize: ps
    };
  }

  // getAuthorProfile(authorId)
  getAuthorProfile(authorId) {
    // Instrumentation for task completion tracking (task_3 - compared authors)
    try {
      let raw = localStorage.getItem("task3_comparedAuthorIds");
      let ids = [];
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            ids = parsed;
          }
        } catch (e2) {
          ids = [];
        }
      }
      if (!ids.includes(authorId) && ids.length < 2) {
        ids.push(authorId);
        localStorage.setItem("task3_comparedAuthorIds", JSON.stringify(ids));
      }
    } catch (e) {
      console.error("Instrumentation error (task_3 - comparedAuthorIds):", e);
    }

    const authors = this._getFromStorage("authors");
    const articleAuthors = this._getFromStorage("article_authors");
    const articles = this._getFromStorage("articles");
    const followedAuthors = this._getFromStorage("followed_authors");

    const author = authors.find(a => a.id === authorId) || null;

    let metrics = { totalPublications: 0, totalCitations: 0, publicationsSince2018: 0 };
    let keyPublications = [];
    let isFollowed = false;

    if (author) {
      metrics = {
        totalPublications: author.total_publications || 0,
        totalCitations: author.total_citations || 0,
        publicationsSince2018: author.publications_since_2018 || 0
      };

      const aa = articleAuthors.filter(x => x.author_id === authorId);
      const articleIds = Array.from(new Set(aa.map(x => x.article_id)));
      keyPublications = articleIds
        .map(id => articles.find(a => a.id === id))
        .filter(a => a != null)
        .sort((a, b) => (b.citation_count || 0) - (a.citation_count || 0))
        .slice(0, 10);

      isFollowed = followedAuthors.some(fa => fa.author_id === authorId);
    }

    return {
      author,
      metrics,
      keyPublications,
      isFollowed
    };
  }

  // followAuthor(authorId, followSetting = 'default')
  followAuthor(authorId, followSetting = "default") {
    const authors = this._getFromStorage("authors");
    const author = authors.find(a => a.id === authorId);
    if (!author) {
      return { followedAuthor: null, success: false };
    }

    let followedAuthors = this._getFromStorage("followed_authors");
    let existing = followedAuthors.find(fa => fa.author_id === authorId);
    if (existing) {
      // Instrumentation for task completion tracking (task_3 - followed author)
      try {
        localStorage.setItem("task3_followedAuthorId", authorId);
      } catch (e) {
        console.error("Instrumentation error (task_3 - followedAuthorId existing):", e);
      }

      return { followedAuthor: existing, success: true };
    }

    const followedAuthor = {
      id: this._generateId("followedauthor"),
      author_id: authorId,
      followed_at: this._nowIso(),
      follow_setting: followSetting || "default"
    };

    followedAuthors.push(followedAuthor);
    this._saveToStorage("followed_authors", followedAuthors);

    // Instrumentation for task completion tracking (task_3 - followed author)
    try {
      localStorage.setItem("task3_followedAuthorId", authorId);
    } catch (e) {
      console.error("Instrumentation error (task_3 - followedAuthorId new):", e);
    }

    return { followedAuthor, success: true };
  }

  // unfollowAuthor(authorId)
  unfollowAuthor(authorId) {
    let followedAuthors = this._getFromStorage("followed_authors");
    const before = followedAuthors.length;
    followedAuthors = followedAuthors.filter(fa => fa.author_id !== authorId);
    const after = followedAuthors.length;
    this._saveToStorage("followed_authors", followedAuthors);
    return { success: after < before };
  }

  // ---------- Alerts ----------

  // listAlerts()
  listAlerts() {
    return this._getFromStorage("alerts");
  }

  // getAlertFormOptions()
  getAlertFormOptions() {
    const documentTypesValues = [
      "journal_article",
      "working_paper",
      "book_chapter",
      "report",
      "dataset_description",
      "other"
    ];
    const documentTypes = documentTypesValues.map(v => ({ value: v, label: v.replace(/_/g, " ") }));

    const journalQuartilesEconomics = ["q1", "q2", "q3", "q4"].map(q => ({
      value: q,
      label: q.toUpperCase()
    }));

    const frequenciesValues = ["immediate", "daily", "weekly", "monthly"];
    const frequencies = frequenciesValues.map(v => ({ value: v, label: v.replace(/_/g, " ") }));

    const deliveryMethodsValues = ["on_site_notifications", "email", "rss"];
    const deliveryMethods = deliveryMethodsValues.map(v => ({ value: v, label: v.replace(/_/g, " ") }));

    return {
      documentTypes,
      journalQuartilesEconomics,
      frequencies,
      deliveryMethods
    };
  }

  // createAlert(name, keywords, documentType, subjectAreaFilter, journalSubjectFilter, journalQuartileFilter, impactFactorMin, frequency, deliveryMethod)
  createAlert(name, keywords, documentType, subjectAreaFilter, journalSubjectFilter, journalQuartileFilter, impactFactorMin, frequency, deliveryMethod) {
    const trimmedName = String(name || "").trim();
    const trimmedKeywords = String(keywords || "").trim();
    if (!trimmedName || !trimmedKeywords) {
      return { alert: null, success: false };
    }

    const allowedFrequencies = ["immediate", "daily", "weekly", "monthly"];
    if (!allowedFrequencies.includes(frequency)) {
      return { alert: null, success: false };
    }

    const allowedDelivery = ["on_site_notifications", "email", "rss"];
    if (!allowedDelivery.includes(deliveryMethod)) {
      return { alert: null, success: false };
    }

    let alerts = this._getFromStorage("alerts");

    const alert = {
      id: this._generateId("alert"),
      name: trimmedName,
      keywords: trimmedKeywords,
      document_type: documentType || null,
      subject_area_filter: subjectAreaFilter || null,
      journal_subject_filter: journalSubjectFilter || null,
      journal_quartile_filter: journalQuartileFilter || null,
      impact_factor_min: impactFactorMin != null ? impactFactorMin : null,
      frequency,
      delivery_method: deliveryMethod,
      status: "active",
      created_at: this._nowIso(),
      updated_at: this._nowIso()
    };

    alerts.push(alert);
    this._saveToStorage("alerts", alerts);

    return { alert, success: true };
  }

  // updateAlertStatus(alertId, status)
  updateAlertStatus(alertId, status) {
    const allowed = ["active", "paused", "archived"];
    if (!allowed.includes(status)) {
      return { alert: null, success: false };
    }

    let alerts = this._getFromStorage("alerts");
    const alert = alerts.find(a => a.id === alertId) || null;
    if (!alert) {
      return { alert: null, success: false };
    }

    alert.status = status;
    alert.updated_at = this._nowIso();
    this._saveToStorage("alerts", alerts);

    return { alert, success: true };
  }

  // deleteAlert(alertId, confirm)
  deleteAlert(alertId, confirm) {
    if (!confirm) {
      return { success: false };
    }
    let alerts = this._getFromStorage("alerts");
    const before = alerts.length;
    alerts = alerts.filter(a => a.id !== alertId);
    this._saveToStorage("alerts", alerts);
    return { success: alerts.length < before };
  }

  // ---------- Learning paths ----------

  // getLearningPathFilterOptions()
  getLearningPathFilterOptions() {
    const learningPaths = this._getFromStorage("learning_paths");

    const difficultiesValues = ["beginner", "intermediate", "advanced"];
    const difficulties = difficultiesValues.map(v => ({ value: v, label: v.charAt(0).toUpperCase() + v.slice(1) }));

    let maxDurationMinutes = 0;
    for (const lp of learningPaths) {
      if (typeof lp.total_duration_minutes === "number" && lp.total_duration_minutes > maxDurationMinutes) {
        maxDurationMinutes = lp.total_duration_minutes;
      }
    }

    return {
      difficulties,
      maxDurationMinutes
    };
  }

  // searchLearningPaths(query, filters = {}, page = 1, pageSize = 20)
  searchLearningPaths(query, filters = {}, page = 1, pageSize = 20) {
    const q = String(query || "").trim();
    const learningPaths = this._getFromStorage("learning_paths");
    const f = filters || {};

    let results = learningPaths.filter(lp => {
      let matchesText = true;
      if (q) {
        const fields = [lp.title, lp.description, lp.subject_area];
        const lowerQ = q.toLowerCase();
        const words = lowerQ.split(/\s+/).filter(Boolean);

        // First try simple substring match on any field
        matchesText = fields.some(field => this._textMatches(field, q));

        // If that fails, require all query words to appear somewhere in the same field
        if (!matchesText && words.length > 1) {
          matchesText = fields.some(field => {
            const text = String(field || "").toLowerCase();
            return words.every(w => text.includes(w));
          });
        }
      }
      if (!matchesText) return false;

      if (f.difficulty && lp.difficulty && lp.difficulty !== f.difficulty) {
        return false;
      }

      if (f.maxTotalDurationMinutes != null && typeof lp.total_duration_minutes === "number") {
        if (lp.total_duration_minutes > f.maxTotalDurationMinutes) return false;
      }

      return true;
    });

    results.sort((a, b) => String(a.title || "").localeCompare(String(b.title || "")));

    const totalResults = results.length;
    const p = Math.max(1, parseInt(page || 1, 10));
    const ps = Math.max(1, parseInt(pageSize || 20, 10));
    const start = (p - 1) * ps;
    const paged = results.slice(start, start + ps);

    return {
      results: paged,
      totalResults,
      page: p,
      pageSize: ps
    };
  }

  // getLearningPathDetails(learningPathId)
  getLearningPathDetails(learningPathId) {
    const learningPaths = this._getFromStorage("learning_paths");
    const modulesAll = this._getFromStorage("learning_path_modules");
    const bookmarks = this._getFromStorage("learning_path_bookmarks");
    const notesAll = this._getFromStorage("learning_path_notes");

    const learningPath = learningPaths.find(lp => lp.id === learningPathId) || null;
    const modules = modulesAll
      .filter(m => m.learning_path_id === learningPathId)
      .sort((a, b) => (a.order_index || 0) - (b.order_index || 0));

    const bookmark = bookmarks.find(b => b.learning_path_id === learningPathId) || null;

    const notes = notesAll.filter(n => n.learning_path_id === learningPathId);

    return {
      learningPath,
      modules,
      bookmark,
      notes
    };
  }

  // bookmarkLearningPath(learningPathId)
  bookmarkLearningPath(learningPathId) {
    const learningPaths = this._getFromStorage("learning_paths");
    const lp = learningPaths.find(l => l.id === learningPathId) || null;
    if (!lp) {
      return { bookmark: null, createdNew: false, success: false };
    }

    let bookmarks = this._getFromStorage("learning_path_bookmarks");
    let existing = bookmarks.find(b => b.learning_path_id === learningPathId);
    if (existing) {
      return { bookmark: existing, createdNew: false, success: true };
    }

    const bookmark = {
      id: this._generateId("lpbookmark"),
      learning_path_id: learningPathId,
      bookmarked_at: this._nowIso(),
      completion_status: "not_started",
      progress_percent: 0
    };

    bookmarks.push(bookmark);
    this._saveToStorage("learning_path_bookmarks", bookmarks);

    return { bookmark, createdNew: true, success: true };
  }

  // saveLearningPathNote(learningPathId, text)
  saveLearningPathNote(learningPathId, text) {
    const learningPaths = this._getFromStorage("learning_paths");
    const lp = learningPaths.find(l => l.id === learningPathId) || null;
    if (!lp) {
      return { note: null, success: false };
    }

    const content = String(text || "").trim();
    if (!content) {
      return { note: null, success: false };
    }

    let notes = this._getFromStorage("learning_path_notes");
    let note = notes.find(n => n.learning_path_id === learningPathId) || null;

    if (note) {
      note.text = content;
      note.updated_at = this._nowIso();
    } else {
      note = {
        id: this._generateId("lpnote"),
        learning_path_id: learningPathId,
        text: content,
        created_at: this._nowIso(),
        updated_at: this._nowIso()
      };
      notes.push(note);
    }

    this._saveToStorage("learning_path_notes", notes);

    return { note, success: true };
  }

  // ---------- Visualizations ----------

  // getVisualizationTopics()
  getVisualizationTopics() {
    const datasets = this._getFromStorage("datasets");
    // Treat both dedicated visualization topics and general research datasets as available topics
    return datasets.filter(d =>
      d.dataset_type === "visualization_topic" ||
      d.dataset_type === "research_dataset"
    );
  }

  // loadVisualizationPreviewData(datasetId, filters = {})
  loadVisualizationPreviewData(datasetId, filters = {}) {
    // No actual row data is stored; comply with "do not mock data" by returning empty preview
    // UI can still show structure and configuration
    return { previewRows: [] };
  }

  // saveVisualization(title, datasetId, chartType, xField, yField, yearStart, yearEnd, countrySelectionMode, selectedCountryIds, topNCountries, savedDestination = 'my_dashboards')
  saveVisualization(title, datasetId, chartType, xField, yField, yearStart, yearEnd, countrySelectionMode, selectedCountryIds, topNCountries, savedDestination = "my_dashboards") {
    const config = {
      title,
      datasetId,
      chartType,
      xField,
      yField,
      yearStart,
      yearEnd,
      countrySelectionMode,
      selectedCountryIds,
      topNCountries,
      savedDestination
    };

    const validation = this._validateVisualizationConfig(config);
    if (!validation.valid) {
      return { visualization: null, success: false };
    }

    let visualizations = this._getFromStorage("visualizations");

    const visualization = {
      id: this._generateId("viz"),
      title: title || "",
      dataset_id: datasetId,
      chart_type: chartType,
      x_field: xField,
      y_field: yField,
      year_start: yearStart != null ? yearStart : null,
      year_end: yearEnd != null ? yearEnd : null,
      country_selection_mode: countrySelectionMode || null,
      selected_countries: Array.isArray(selectedCountryIds) ? selectedCountryIds : [],
      top_n_countries: topNCountries != null ? topNCountries : null,
      saved_destination: savedDestination || "my_dashboards",
      created_at: this._nowIso(),
      updated_at: this._nowIso()
    };

    visualizations.push(visualization);
    this._saveToStorage("visualizations", visualizations);

    return { visualization, success: true };
  }

  // listVisualizations()
  listVisualizations() {
    const visualizations = this._getFromStorage("visualizations");
    const datasets = this._getFromStorage("datasets");

    // Resolve dataset_id -> dataset for convenience
    return visualizations.map(v => ({
      ...v,
      dataset: datasets.find(d => d.id === v.dataset_id) || null
    }));
  }

  // getVisualizationDetails(visualizationId)
  getVisualizationDetails(visualizationId) {
    const visualizations = this._getFromStorage("visualizations");
    const datasets = this._getFromStorage("datasets");

    const visualization = visualizations.find(v => v.id === visualizationId) || null;
    let dataset = null;
    if (visualization) {
      dataset = datasets.find(d => d.id === visualization.dataset_id) || null;
    }

    return { visualization, dataset };
  }

  // updateVisualizationMetadata(visualizationId, title, savedDestination)
  updateVisualizationMetadata(visualizationId, title, savedDestination) {
    let visualizations = this._getFromStorage("visualizations");
    const visualization = visualizations.find(v => v.id === visualizationId) || null;
    if (!visualization) {
      return { visualization: null, success: false };
    }

    if (title != null) visualization.title = title;
    if (savedDestination != null) visualization.saved_destination = savedDestination;
    visualization.updated_at = this._nowIso();

    this._saveToStorage("visualizations", visualizations);

    return { visualization, success: true };
  }

  // reorderVisualizations(orderedVisualizationIds)
  reorderVisualizations(orderedVisualizationIds) {
    let visualizations = this._getFromStorage("visualizations");
    if (!Array.isArray(orderedVisualizationIds)) orderedVisualizationIds = [];

    const idToViz = new Map();
    visualizations.forEach(v => idToViz.set(v.id, v));

    const reordered = [];
    orderedVisualizationIds.forEach(id => {
      const v = idToViz.get(id);
      if (v) {
        reordered.push(v);
        idToViz.delete(id);
      }
    });

    // Append any remaining in original order
    visualizations.forEach(v => {
      if (idToViz.has(v.id)) {
        reordered.push(v);
      }
    });

    this._saveToStorage("visualizations", reordered);
    return { success: true };
  }

  // deleteVisualization(visualizationId, confirm)
  deleteVisualization(visualizationId, confirm) {
    if (!confirm) {
      return { success: false };
    }
    let visualizations = this._getFromStorage("visualizations");
    const before = visualizations.length;
    visualizations = visualizations.filter(v => v.id !== visualizationId);
    this._saveToStorage("visualizations", visualizations);
    return { success: visualizations.length < before };
  }

  // ---------- Advanced article search & citations ----------

  // advancedSearchArticles(citedReferences, minJournalImpactFactor, subjectAreas, page = 1, pageSize = 20)
  advancedSearchArticles(citedReferences, minJournalImpactFactor, subjectAreas, page = 1, pageSize = 20) {
    const articles = this._getFromStorage("articles");
    const journals = this._getFromStorage("journals");

    const refs = Array.isArray(citedReferences) ? citedReferences.map(r => String(r || "").toLowerCase()) : [];
    const subjAreas = Array.isArray(subjectAreas) ? subjectAreas : [];

    let results = articles.filter(a => {
      // Cited references: require all patterns present in references
      if (refs.length > 0) {
        const articleRefs = (a.references || []).map(r => String(r || "").toLowerCase());
        const hasAll = refs.every(refPattern => {
          const patternWords = String(refPattern || "").toLowerCase().split(/\s+/).filter(Boolean);
          return articleRefs.some(ar =>
            patternWords.every(w => ar.includes(w))
          );
        });
        if (!hasAll) return false;
      }

      // Journal impact factor
      if (minJournalImpactFactor != null) {
        let impact = a.journal_impact_factor;
        if (impact == null && a.journal_id) {
          const j = journals.find(jn => jn.id === a.journal_id);
          if (j && typeof j.impact_factor === "number") {
            impact = j.impact_factor;
          }
        }
        if (impact == null || impact < minJournalImpactFactor) return false;
      }

      // Subject areas
      if (subjAreas.length > 0) {
        const articleAreas = a.subject_areas || [];
        let ok = this._intersects(articleAreas, subjAreas);
        if (!ok && a.journal_id) {
          const j = journals.find(jn => jn.id === a.journal_id);
          if (j && j.subject_area_primary && subjAreas.includes(j.subject_area_primary)) {
            ok = true;
          }
        }
        if (!ok) return false;
      }

      return true;
    });

    const totalResults = results.length;
    const p = Math.max(1, parseInt(page || 1, 10));
    const ps = Math.max(1, parseInt(pageSize || 20, 10));
    const start = (p - 1) * ps;
    const paged = results.slice(start, start + ps);

    return {
      results: paged,
      totalResults,
      page: p,
      pageSize: ps
    };
  }

  // getArticleCitation(articleId, citationStyle)
  getArticleCitation(articleId, citationStyle) {
    const articles = this._getFromStorage("articles");
    const articleAuthors = this._getFromStorage("article_authors");
    const authors = this._getFromStorage("authors");
    const journals = this._getFromStorage("journals");

    const article = articles.find(a => a.id === articleId) || null;
    if (!article) {
      return { citationText: "" };
    }

    const aa = articleAuthors
      .filter(x => x.article_id === article.id)
      .sort((a, b) => (a.author_order || 0) - (b.author_order || 0));
    const authorNames = aa
      .map(x => authors.find(a => a.id === x.author_id))
      .filter(a => a != null)
      .map(a => a.full_name);

    let authorsPart = "";
    if (authorNames.length === 1) {
      authorsPart = authorNames[0];
    } else if (authorNames.length === 2) {
      authorsPart = `${authorNames[0]} & ${authorNames[1]}`;
    } else if (authorNames.length > 2) {
      authorsPart = authorNames.slice(0, -1).join(", ") + `, & ${authorNames[authorNames.length - 1]}`;
    }

    const year = article.publication_year ? `(${article.publication_year})` : "";

    let journalName = article.journal_name || "";
    if (!journalName && article.journal_id) {
      const j = journals.find(jn => jn.id === article.journal_id);
      if (j) journalName = j.name || "";
    }

    // Simple APA-like format
    const parts = [];
    if (authorsPart) parts.push(`${authorsPart}.`);
    if (year) parts.push(`${year}.`);
    if (article.title) parts.push(`${article.title}.`);
    if (journalName) parts.push(journalName);

    const citationText = parts.join(" ");

    return { citationText };
  }

  // copyArticleCitationToClipboard(articleId, citationStyle)
  copyArticleCitationToClipboard(articleId, citationStyle) {
    const style = citationStyle || this._getDefaultCitationStyle();
    const { citationText } = this.getArticleCitation(articleId, style);
    const success = !!citationText;

    // Instrumentation for task completion tracking (task_7)
    try {
      if (success && citationText) {
        localStorage.setItem(
          "task7_lastCitationCopy",
          JSON.stringify({
            articleId: articleId,
            citationStyle: style,
            copiedAt: this._nowIso()
          })
        );
      }
    } catch (e) {
      console.error("Instrumentation error (task_7 - lastCitationCopy):", e);
    }

    // Actual clipboard interaction handled on the front-end
    return { citationText, success };
  }

  // ---------- Tags ----------

  // listTags(query, limit = 20)
  listTags(query, limit = 20) {
    const tags = this._getFromStorage("tags");
    const q = String(query || "").trim().toLowerCase();
    let results = tags;
    if (q) {
      results = results.filter(t => String(t.name || "").toLowerCase().includes(q));
    }
    const lim = Math.max(1, parseInt(limit || 20, 10));
    return results.slice(0, lim);
  }

  // ---------- Reading Lists & Collections page ----------

  // getReadingListsAndCollectionsPageData()
  getReadingListsAndCollectionsPageData() {
    const lists = this._getFromStorage("saved_lists");
    let selectedListDetails = { list: null, items: [] };
    if (lists.length > 0) {
      selectedListDetails = this.getSavedListDetails(lists[0].id);
    }
    return {
      lists,
      selectedListDetails
    };
  }

  // ---------- About, Help, Contact ----------

  // getAboutContent()
  getAboutContent() {
    // Static descriptive text; not domain data
    return {
      mission: "Provide structured access to research and data on economics of crime, fraud, and related topics.",
      scope: "This site indexes articles, datasets, visualizations, and learning resources related to the economics of crime, fraud, tax evasion, money laundering, and cryptocurrency markets.",
      dataSources: "Metadata and records are stored locally in your browser or execution environment via localStorage. No external data sources are queried by this business logic layer.",
      curationStandards: "Entities follow a structured schema covering articles, datasets, authors, journals, alerts, visualizations, and learning resources. All persisted records are JSON-serializable.",
      acknowledgments: "This tool is a generic demonstration of business logic for an academic research portal focused on economics of crime and fraud."
    };
  }

  // getHelpFaqEntries()
  getHelpFaqEntries() {
    // To avoid mocking domain data, return empty help content; UI may provide its own static help.
    return {
      faqs: [],
      topics: []
    };
  }

  // submitContactFeedback(name, email, category, message)
  submitContactFeedback(name, email, category, message) {
    const msg = String(message || "").trim();
    if (!msg) {
      return { ticketId: "", success: false, message: "Message is required" };
    }

    let tickets = this._getFromStorage("contact_tickets");
    if (!Array.isArray(tickets)) tickets = [];

    const ticketId = this._generateId("ticket");
    tickets.push({
      id: ticketId,
      name: name || "",
      email: email || "",
      category: category || "",
      message: msg,
      created_at: this._nowIso()
    });
    this._saveToStorage("contact_tickets", tickets);

    return { ticketId, success: true, message: "Feedback submitted" };
  }
}

// Browser global + Node.js export
if (typeof window !== "undefined") {
  window.BusinessLogic = BusinessLogic;
  window.WebsiteSDK = new BusinessLogic();
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = BusinessLogic;
}