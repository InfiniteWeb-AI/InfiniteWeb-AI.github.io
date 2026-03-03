/* eslint-disable no-var */
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

  // -------------------- Storage helpers --------------------

  _initStorage() {
    // Generic array-based tables
    const arrayKeys = [
      'publications',
      'datasets',
      'authors',
      'events',
      'reading_lists',
      'reading_list_items',
      'dataset_cart_items',
      'citation_export_lists',
      'citation_export_items',
      'saved_search_alerts',
      'article_collections',
      'article_collection_items',
      'bookmarks',
      'planner_entries',
      'help_topics'
    ];

    arrayKeys.forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    });

    // dataset_cart is a single object, do not pre-create; leave null until needed

    // About content as single object
    if (!localStorage.getItem('about_content')) {
      const about = {
        title: 'About This Research Platform',
        intro: 'This platform aggregates academic resources on economics, financial crime, and fraud.',
        sections: [
          {
            heading: 'Purpose',
            body: 'Provide researchers and students with tools to discover publications, datasets, authors, and events related to financial crime and fraud.'
          },
          {
            heading: 'Scope',
            body: 'Focus on economics, finance, law, and related disciplines with an emphasis on fraud, tax evasion, money laundering, and financial crime.'
          }
        ]
      };
      localStorage.setItem('about_content', JSON.stringify(about));
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, fallback) {
    const data = localStorage.getItem(key);
    if (!data) return fallback !== undefined ? fallback : [];
    try {
      return JSON.parse(data);
    } catch (e) {
      return fallback !== undefined ? fallback : [];
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

  _normalizeString(str) {
    return (str || '').toString().toLowerCase();
  }

  _containsText(haystack, needle) {
    if (!needle) return true;
    if (!haystack) return false;
    return this._normalizeString(haystack).indexOf(this._normalizeString(needle)) !== -1;
  }

  _paginate(list, page, pageSize) {
    const p = page && page > 0 ? page : 1;
    const ps = pageSize && pageSize > 0 ? pageSize : 20;
    const start = (p - 1) * ps;
    const end = start + ps;
    const slice = list.slice(start, end);
    return { page: p, pageSize: ps, totalResults: list.length, results: slice };
  }

  // -------------------- Helper functions specified --------------------

  // Internal helper to get or create the single dataset cart for the current user.
  _getOrCreateDatasetCart() {
    let cart = this._getFromStorage('dataset_cart', null);
    if (!cart) {
      cart = {
        id: this._generateId('datasetcart'),
        created_at: this._nowIso(),
        updated_at: this._nowIso()
      };
      this._saveToStorage('dataset_cart', cart);
    }
    return cart;
  }

  // Internal helper to persist user-specific structures; accepts a partial state object.
  _persistUserListsState(state) {
    if (!state || typeof state !== 'object') return;
    if (state.readingLists) this._saveToStorage('reading_lists', state.readingLists);
    if (state.readingListItems) this._saveToStorage('reading_list_items', state.readingListItems);
    if (state.articleCollections) this._saveToStorage('article_collections', state.articleCollections);
    if (state.articleCollectionItems) this._saveToStorage('article_collection_items', state.articleCollectionItems);
    if (state.bookmarks) this._saveToStorage('bookmarks', state.bookmarks);
    if (state.citationExportLists) this._saveToStorage('citation_export_lists', state.citationExportLists);
    if (state.citationExportItems) this._saveToStorage('citation_export_items', state.citationExportItems);
    if (state.savedSearchAlerts) this._saveToStorage('saved_search_alerts', state.savedSearchAlerts);
    if (state.plannerEntries) this._saveToStorage('planner_entries', state.plannerEntries);
  }

  // Internal helper to execute a SavedSearchAlert configuration and return raw search results.
  _runSavedSearchQuery(alert, page, pageSize) {
    if (!alert) {
      return {
        searchScope: null,
        page: page || 1,
        pageSize: pageSize || 20,
        totalResults: 0,
        publications: [],
        datasets: [],
        authors: [],
        events: []
      };
    }

    const scope = alert.search_scope;
    const p = page || 1;
    const ps = pageSize || 20;

    if (scope === 'publications') {
      const filters = {};
      if (alert.filters_publication_type) filters.publicationType = alert.filters_publication_type;
      if (typeof alert.filters_year_from === 'number') filters.yearFrom = alert.filters_year_from;
      if (typeof alert.filters_year_to === 'number') filters.yearTo = alert.filters_year_to;
      if (typeof alert.filters_min_citations === 'number') filters.minCitations = alert.filters_min_citations;
      if (alert.filters_access_type) filters.accessType = alert.filters_access_type;
      if (alert.filters_language_code) filters.languageCode = alert.filters_language_code;
      if (typeof alert.filters_journal_impact_factor_min === 'number') {
        filters.journalImpactFactorMin = alert.filters_journal_impact_factor_min;
      }
      if (alert.filters_publication_status) filters.publicationStatus = alert.filters_publication_status;

      const searchRes = this.searchPublications(alert.query || '', filters, alert.sort_by || 'relevance', p, ps);
      return {
        searchScope: 'publications',
        page: searchRes.page,
        pageSize: searchRes.pageSize,
        totalResults: searchRes.totalResults,
        publications: searchRes.results.map((r) => {
          const allPubs = this._getFromStorage('publications', []);
          return allPubs.find((p2) => p2.id === r.publicationId) || null;
        }).filter(Boolean),
        datasets: [],
        authors: [],
        events: []
      };
    }

    if (scope === 'datasets') {
      const searchRes = this.searchDatasets(alert.query || '', {}, alert.sort_by || 'relevance', p, ps);
      return {
        searchScope: 'datasets',
        page: searchRes.page,
        pageSize: searchRes.pageSize,
        totalResults: searchRes.totalResults,
        publications: [],
        datasets: searchRes.results.map((r) => {
          const all = this._getFromStorage('datasets', []);
          return all.find((d) => d.id === r.datasetId) || null;
        }).filter(Boolean),
        authors: [],
        events: []
      };
    }

    if (scope === 'authors') {
      const searchRes = this.searchAuthors(alert.query || '', {}, alert.sort_by || 'publications_desc', p, ps);
      return {
        searchScope: 'authors',
        page: searchRes.page,
        pageSize: searchRes.pageSize,
        totalResults: searchRes.totalResults,
        publications: [],
        datasets: [],
        authors: searchRes.results.map((r) => {
          const all = this._getFromStorage('authors', []);
          return all.find((a) => a.id === r.authorId) || null;
        }).filter(Boolean),
        events: []
      };
    }

    if (scope === 'events') {
      const searchRes = this.searchEvents(alert.query || '', {}, alert.sort_by || 'start_date_earliest', p, ps);
      return {
        searchScope: 'events',
        page: searchRes.page,
        pageSize: searchRes.pageSize,
        totalResults: searchRes.totalResults,
        publications: [],
        datasets: [],
        authors: [],
        events: searchRes.results.map((r) => {
          const all = this._getFromStorage('events', []);
          return all.find((e) => e.id === r.eventId) || null;
        }).filter(Boolean)
      };
    }

    return {
      searchScope: scope,
      page: p,
      pageSize: ps,
      totalResults: 0,
      publications: [],
      datasets: [],
      authors: [],
      events: []
    };
  }

  // -------------------- Dashboard --------------------

  getUserDashboardSummary() {
    const readingLists = this._getFromStorage('reading_lists', []);
    const readingListItems = this._getFromStorage('reading_list_items', []);
    const datasetCart = this._getFromStorage('dataset_cart', null);
    const datasetCartItems = this._getFromStorage('dataset_cart_items', []);
    const citationExportLists = this._getFromStorage('citation_export_lists', []);
    const citationExportItems = this._getFromStorage('citation_export_items', []);
    const articleCollections = this._getFromStorage('article_collections', []);
    const articleCollectionItems = this._getFromStorage('article_collection_items', []);
    const bookmarks = this._getFromStorage('bookmarks', []);
    const savedSearchAlerts = this._getFromStorage('saved_search_alerts', []);
    const plannerEntries = this._getFromStorage('planner_entries', []);
    const events = this._getFromStorage('events', []);

    // Recent reading lists (e.g., last 5)
    const listsWithCounts = readingLists
      .map((list) => {
        const itemCount = readingListItems.filter((it) => it.reading_list_id === list.id).length;
        return {
          readingListId: list.id,
          name: list.name,
          itemCount: itemCount,
          updatedAt: list.updated_at
        };
      })
      .sort((a, b) => (a.updatedAt || '').localeCompare(b.updatedAt || ''));

    const recentReadingLists = listsWithCounts.reverse().slice(0, 5);

    const cartId = datasetCart ? datasetCart.id : null;
    const datasetCount = datasetCart
      ? datasetCartItems.filter((it) => it.dataset_cart_id === datasetCart.id).length
      : 0;

    const citationExportListsSummary = citationExportLists.map((list) => {
      const count = citationExportItems.filter((it) => it.citation_export_list_id === list.id).length;
      return {
        citationExportListId: list.id,
        name: list.name,
        citationCount: count
      };
    });

    const articleCollectionsSummary = articleCollections.map((col) => {
      const count = articleCollectionItems.filter((it) => it.article_collection_id === col.id).length;
      return {
        articleCollectionId: col.id,
        name: col.name,
        itemCount: count
      };
    });

    const bookmarksCount = bookmarks.length;
    const alertsCount = savedSearchAlerts.filter((a) => a.is_enabled).length;

    const upcoming = plannerEntries
      .map((pe) => {
        const event = events.find((ev) => ev.id === pe.event_id) || null;
        if (!event || !event.is_upcoming) return null;
        return {
          plannerEntryId: pe.id,
          eventId: event.id,
          eventTitle: event.title,
          startDate: event.start_date,
          locationCity: event.location_city || null,
          locationCountry: event.location_country || null,
          event: event
        };
      })
      .filter(Boolean)
      .sort((a, b) => (a.startDate || '').localeCompare(b.startDate || ''))
      .slice(0, 5);

    return {
      recentReadingLists: recentReadingLists,
      datasetCart: {
        cartId: cartId,
        datasetCount: datasetCount
      },
      citationExportLists: citationExportListsSummary,
      articleCollections: articleCollectionsSummary,
      bookmarksCount: bookmarksCount,
      alertsCount: alertsCount,
      upcomingPlannerEntries: upcoming
    };
  }

  // -------------------- Publications search --------------------

  globalPublicationSearchPreview(query, maxResults) {
    const pubs = this._getFromStorage('publications', []);
    const q = this._normalizeString(query);
    const filtered = pubs.filter((p) => {
      if (!q) return true;
      const inTitle = this._containsText(p.title, q);
      const inAbstract = this._containsText(p.abstract, q);
      const inKeywords = Array.isArray(p.keywords) && p.keywords.some((k) => this._containsText(k, q));
      const inTopics = Array.isArray(p.topics) && p.topics.some((t) => this._containsText(t, q));
      return inTitle || inAbstract || inKeywords || inTopics;
    });

    const limit = typeof maxResults === 'number' && maxResults > 0 ? maxResults : 5;
    const slice = filtered.slice(0, limit).map((p) => ({
      publicationId: p.id,
      title: p.title,
      publicationType: p.publication_type,
      publicationYear: p.publication_year,
      citationCount: p.citation_count,
      hasFullText: p.has_full_text,
      isOpenAccess: p.is_open_access
    }));

    return {
      query: query,
      totalMatches: filtered.length,
      results: slice
    };
  }

  getPublicationFilterOptions() {
    const pubs = this._getFromStorage('publications', []);

    const publicationTypesEnum = [
      'working_paper',
      'journal_article',
      'book_chapter',
      'report',
      'other'
    ];

    const publicationTypes = publicationTypesEnum.map((val) => ({
      value: val,
      label: val.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    }));

    let minYear = null;
    let maxYear = null;
    pubs.forEach((p) => {
      if (typeof p.publication_year === 'number') {
        if (minYear === null || p.publication_year < minYear) minYear = p.publication_year;
        if (maxYear === null || p.publication_year > maxYear) maxYear = p.publication_year;
      }
    });

    const accessTypesEnum = ['open_access', 'subscription', 'hybrid', 'embargoed'];
    const accessTypes = accessTypesEnum.map((val) => ({
      value: val,
      label: val.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    }));

    const langMap = {};
    pubs.forEach((p) => {
      if (p.language_code && !langMap[p.language_code]) {
        langMap[p.language_code] = {
          code: p.language_code,
          label: p.language_code
        };
      }
    });
    const languages = Object.keys(langMap).map((k) => langMap[k]);

    const publicationStatusesEnum = ['normal', 'retracted', 'corrected', 'withdrawn'];
    const publicationStatuses = publicationStatusesEnum.map((val) => ({
      value: val,
      label: val.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    }));

    let journalImpactFactorMin = null;
    pubs.forEach((p) => {
      if (typeof p.journal_impact_factor === 'number') {
        if (journalImpactFactorMin === null || p.journal_impact_factor < journalImpactFactorMin) {
          journalImpactFactorMin = p.journal_impact_factor;
        }
      }
    });

    return {
      publicationTypes: publicationTypes,
      yearsRange: {
        minYear: minYear,
        maxYear: maxYear
      },
      accessTypes: accessTypes,
      languages: languages,
      publicationStatuses: publicationStatuses,
      journalImpactFactorMin: journalImpactFactorMin
    };
  }

  _matchesPublicationFilters(pub, filters) {
    if (!filters) return true;

    if (filters.publicationType && pub.publication_type !== filters.publicationType) return false;

    if (typeof filters.yearFrom === 'number' && pub.publication_year < filters.yearFrom) return false;
    if (typeof filters.yearTo === 'number' && pub.publication_year > filters.yearTo) return false;

    if (typeof filters.minCitations === 'number' && pub.citation_count < filters.minCitations) return false;

    if (filters.accessType && pub.access_type !== filters.accessType) return false;

    if (filters.languageCode && pub.language_code !== filters.languageCode) return false;

    if (typeof filters.journalImpactFactorMin === 'number') {
      const jif = typeof pub.journal_impact_factor === 'number' ? pub.journal_impact_factor : 0;
      if (jif < filters.journalImpactFactorMin) return false;
    }

    if (filters.publicationStatus && pub.publication_status !== filters.publicationStatus) return false;

    if (Array.isArray(filters.regionsCovered) && filters.regionsCovered.length > 0) {
      const regions = Array.isArray(pub.regions_covered) ? pub.regions_covered : [];
      const hasRegion = filters.regionsCovered.some((r) => regions.indexOf(r) !== -1);
      if (!hasRegion) return false;
    }

    if (Array.isArray(filters.topics) && filters.topics.length > 0) {
      const topics = Array.isArray(pub.topics) ? pub.topics : [];
      const hasTopic = filters.topics.some((t) => topics.indexOf(t) !== -1);
      if (!hasTopic) return false;
    }

    return true;
  }

  searchPublications(query, filters, sortBy, page, pageSize) {
    const pubs = this._getFromStorage('publications', []);
    const q = this._normalizeString(query);

    let filtered = pubs.filter((p) => {
      const matchesQuery = !q
        ? true
        : (
            this._containsText(p.title, q) ||
            this._containsText(p.abstract, q) ||
            (Array.isArray(p.keywords) && p.keywords.some((k) => this._containsText(k, q))) ||
            (Array.isArray(p.topics) && p.topics.some((t) => this._containsText(t, q)))
          );
      if (!matchesQuery) return false;
      return this._matchesPublicationFilters(p, filters || {});
    });

    const sort = sortBy || 'relevance';
    if (sort === 'publication_date_newest') {
      filtered.sort((a, b) => (b.publication_date || '').localeCompare(a.publication_date || ''));
    } else if (sort === 'publication_date_oldest') {
      filtered.sort((a, b) => (a.publication_date || '').localeCompare(b.publication_date || ''));
    } else if (sort === 'citation_count_high_to_low') {
      filtered.sort((a, b) => (b.citation_count || 0) - (a.citation_count || 0));
    } else if (sort === 'citation_count_low_to_high') {
      filtered.sort((a, b) => (a.citation_count || 0) - (b.citation_count || 0));
    } else {
      // relevance: basic heuristic (keep natural order)
    }

    const pg = this._paginate(filtered, page, pageSize);

    const results = pg.results.map((p) => ({
      publicationId: p.id,
      title: p.title,
      abstractSnippet: p.abstract ? String(p.abstract).slice(0, 300) : '',
      publicationType: p.publication_type,
      publicationStatus: p.publication_status,
      publicationYear: p.publication_year,
      publicationDate: p.publication_date,
      citationCount: p.citation_count,
      accessType: p.access_type,
      isOpenAccess: p.is_open_access,
      languageCode: p.language_code,
      journalName: p.journal_name || null,
      journalImpactFactor: typeof p.journal_impact_factor === 'number' ? p.journal_impact_factor : null,
      hasFullText: p.has_full_text,
      fullTextFormats: Array.isArray(p.full_text_formats) ? p.full_text_formats : [],
      keywords: Array.isArray(p.keywords) ? p.keywords : [],
      topics: Array.isArray(p.topics) ? p.topics : [],
      regionsCovered: Array.isArray(p.regions_covered) ? p.regions_covered : []
    }));

    return {
      query: query,
      page: pg.page,
      pageSize: pg.pageSize,
      totalResults: pg.totalResults,
      results: results
    };
  }

  getPublicationDetail(publicationId) {
    const pubs = this._getFromStorage('publications', []);
    const authorsAll = this._getFromStorage('authors', []);
    const bookmarks = this._getFromStorage('bookmarks', []);
    const readingLists = this._getFromStorage('reading_lists', []);
    const readingListItems = this._getFromStorage('reading_list_items', []);
    const collections = this._getFromStorage('article_collections', []);
    const collectionItems = this._getFromStorage('article_collection_items', []);

    const pub = pubs.find((p) => p.id === publicationId) || null;
    if (!pub) {
      return { publication: null, authors: [], userState: { isBookmarked: false, bookmarkTags: [], readingListsContaining: [], collectionsContaining: [] } };
    }

    const authors = Array.isArray(pub.author_ids)
      ? pub.author_ids.map((id) => authorsAll.find((a) => a.id === id) || null).filter(Boolean)
      : [];

    const bookmark = bookmarks.find((b) => b.publication_id === publicationId) || null;
    const isBookmarked = !!bookmark;
    const bookmarkTags = bookmark && Array.isArray(bookmark.tags) ? bookmark.tags : [];

    const readingListsContaining = readingListItems
      .filter((it) => it.publication_id === publicationId)
      .map((it) => {
        const list = readingLists.find((rl) => rl.id === it.reading_list_id);
        if (!list) return null;
        return {
          readingListId: list.id,
          name: list.name
        };
      })
      .filter(Boolean);

    const collectionsContaining = collectionItems
      .filter((it) => it.publication_id === publicationId)
      .map((it) => {
        const col = collections.find((c) => c.id === it.article_collection_id);
        if (!col) return null;
        return {
          articleCollectionId: col.id,
          name: col.name
        };
      })
      .filter(Boolean);

    return {
      publication: pub,
      authors: authors,
      userState: {
        isBookmarked: isBookmarked,
        bookmarkTags: bookmarkTags,
        readingListsContaining: readingListsContaining,
        collectionsContaining: collectionsContaining
      }
    };
  }

  // -------------------- Reading Lists --------------------

  createReadingList(name, description) {
    const lists = this._getFromStorage('reading_lists', []);
    const now = this._nowIso();
    const list = {
      id: this._generateId('readinglist'),
      name: name,
      description: description || '',
      created_at: now,
      updated_at: now
    };
    lists.push(list);
    this._saveToStorage('reading_lists', lists);
    return list;
  }

  getReadingListsSummary() {
    const lists = this._getFromStorage('reading_lists', []);
    const items = this._getFromStorage('reading_list_items', []);
    return lists.map((list) => {
      const itemCount = items.filter((it) => it.reading_list_id === list.id).length;
      return {
        readingListId: list.id,
        name: list.name,
        description: list.description || '',
        itemCount: itemCount,
        createdAt: list.created_at,
        updatedAt: list.updated_at
      };
    });
  }

  addPublicationToReadingList(publicationId, readingListId) {
    const lists = this._getFromStorage('reading_lists', []);
    const items = this._getFromStorage('reading_list_items', []);
    const pubs = this._getFromStorage('publications', []);

    const list = lists.find((l) => l.id === readingListId) || null;
    const pub = pubs.find((p) => p.id === publicationId) || null;
    if (!list || !pub) {
      return { readingListItem: null, readingList: null };
    }

    const existingItem = items.find(
      (it) => it.reading_list_id === readingListId && it.publication_id === publicationId
    );
    if (existingItem) {
      return { readingListItem: existingItem, readingList: list };
    }

    const now = this._nowIso();
    const newItem = {
      id: this._generateId('readinglistitem'),
      reading_list_id: readingListId,
      publication_id: publicationId,
      added_at: now,
      order_index: items.filter((it) => it.reading_list_id === readingListId).length
    };
    items.push(newItem);
    this._saveToStorage('reading_list_items', items);

    list.updated_at = now;
    this._saveToStorage('reading_lists', lists);

    return { readingListItem: newItem, readingList: list };
  }

  getReadingListDetail(readingListId) {
    const lists = this._getFromStorage('reading_lists', []);
    const items = this._getFromStorage('reading_list_items', []);
    const pubs = this._getFromStorage('publications', []);

    const list = lists.find((l) => l.id === readingListId) || null;
    if (!list) {
      return { readingList: null, items: [] };
    }

    const listItems = items
      .filter((it) => it.reading_list_id === readingListId)
      .sort((a, b) => (a.order_index || 0) - (b.order_index || 0))
      .map((it) => {
        const pub = pubs.find((p) => p.id === it.publication_id) || null;
        return {
          readingListItemId: it.id,
          orderIndex: it.order_index,
          addedAt: it.added_at,
          publication: pub
            ? {
                publicationId: pub.id,
                title: pub.title,
                publicationType: pub.publication_type,
                publicationYear: pub.publication_year,
                citationCount: pub.citation_count,
                hasFullText: pub.has_full_text
              }
            : null
        };
      });

    return {
      readingList: list,
      items: listItems
    };
  }

  removeReadingListItem(readingListItemId) {
    const items = this._getFromStorage('reading_list_items', []);
    const idx = items.findIndex((it) => it.id === readingListItemId);
    if (idx === -1) {
      return { success: false, readingListId: null, remainingItemCount: items.length };
    }
    const readingListId = items[idx].reading_list_id;
    items.splice(idx, 1);
    this._saveToStorage('reading_list_items', items);
    const remainingItemCount = items.filter((it) => it.reading_list_id === readingListId).length;
    return { success: true, readingListId: readingListId, remainingItemCount: remainingItemCount };
  }

  reorderReadingListItems(readingListId, orderedItemIds) {
    const items = this._getFromStorage('reading_list_items', []);
    const idToItem = {};
    items.forEach((it) => {
      if (it.reading_list_id === readingListId) {
        idToItem[it.id] = it;
      }
    });

    orderedItemIds.forEach((id, index) => {
      const it = idToItem[id];
      if (it) {
        it.order_index = index;
      }
    });

    this._saveToStorage('reading_list_items', items);
    return { readingListId: readingListId, success: true };
  }

  renameReadingList(readingListId, newName) {
    const lists = this._getFromStorage('reading_lists', []);
    const list = lists.find((l) => l.id === readingListId) || null;
    if (!list) return null;
    list.name = newName;
    list.updated_at = this._nowIso();
    this._saveToStorage('reading_lists', lists);
    return list;
  }

  deleteReadingList(readingListId) {
    let lists = this._getFromStorage('reading_lists', []);
    let items = this._getFromStorage('reading_list_items', []);

    const beforeLen = lists.length;
    lists = lists.filter((l) => l.id !== readingListId);
    items = items.filter((it) => it.reading_list_id !== readingListId);

    this._saveToStorage('reading_lists', lists);
    this._saveToStorage('reading_list_items', items);

    return { success: lists.length !== beforeLen };
  }

  // -------------------- Article Collections --------------------

  createArticleCollection(name, description) {
    const cols = this._getFromStorage('article_collections', []);
    const now = this._nowIso();
    const col = {
      id: this._generateId('articlecollection'),
      name: name,
      description: description || '',
      created_at: now,
      updated_at: now
    };
    cols.push(col);
    this._saveToStorage('article_collections', cols);
    return col;
  }

  getArticleCollectionsSummary() {
    const cols = this._getFromStorage('article_collections', []);
    const items = this._getFromStorage('article_collection_items', []);
    return cols.map((col) => {
      const count = items.filter((it) => it.article_collection_id === col.id).length;
      return {
        articleCollectionId: col.id,
        name: col.name,
        description: col.description || '',
        itemCount: count,
        createdAt: col.created_at,
        updatedAt: col.updated_at
      };
    });
  }

  addPublicationToCollection(publicationId, articleCollectionId) {
    const cols = this._getFromStorage('article_collections', []);
    const items = this._getFromStorage('article_collection_items', []);
    const pubs = this._getFromStorage('publications', []);

    const col = cols.find((c) => c.id === articleCollectionId) || null;
    const pub = pubs.find((p) => p.id === publicationId) || null;
    if (!col || !pub) return { articleCollectionItem: null, articleCollection: null };

    const existing = items.find(
      (it) => it.article_collection_id === articleCollectionId && it.publication_id === publicationId
    );
    if (existing) {
      return { articleCollectionItem: existing, articleCollection: col };
    }

    const now = this._nowIso();
    const newItem = {
      id: this._generateId('articlecollectionitem'),
      article_collection_id: articleCollectionId,
      publication_id: publicationId,
      added_at: now,
      order_index: items.filter((it) => it.article_collection_id === articleCollectionId).length
    };
    items.push(newItem);
    this._saveToStorage('article_collection_items', items);

    col.updated_at = now;
    this._saveToStorage('article_collections', cols);

    return { articleCollectionItem: newItem, articleCollection: col };
  }

  getArticleCollectionDetail(articleCollectionId) {
    const cols = this._getFromStorage('article_collections', []);
    const items = this._getFromStorage('article_collection_items', []);
    const pubs = this._getFromStorage('publications', []);

    const col = cols.find((c) => c.id === articleCollectionId) || null;
    if (!col) return { articleCollection: null, items: [] };

    const resItems = items
      .filter((it) => it.article_collection_id === articleCollectionId)
      .sort((a, b) => (a.order_index || 0) - (b.order_index || 0))
      .map((it) => {
        const pub = pubs.find((p) => p.id === it.publication_id) || null;
        return {
          articleCollectionItemId: it.id,
          orderIndex: it.order_index,
          addedAt: it.added_at,
          publication: pub
            ? {
                publicationId: pub.id,
                title: pub.title,
                publicationYear: pub.publication_year,
                hasFullText: pub.has_full_text,
                isOpenAccess: pub.is_open_access
              }
            : null
        };
      });

    return {
      articleCollection: col,
      items: resItems
    };
  }

  removeArticleFromCollection(articleCollectionItemId) {
    const items = this._getFromStorage('article_collection_items', []);
    const idx = items.findIndex((it) => it.id === articleCollectionItemId);
    if (idx === -1) {
      return { success: false, articleCollectionId: null, remainingItemCount: items.length };
    }
    const articleCollectionId = items[idx].article_collection_id;
    items.splice(idx, 1);
    this._saveToStorage('article_collection_items', items);
    const remainingItemCount = items.filter((it) => it.article_collection_id === articleCollectionId).length;
    return { success: true, articleCollectionId: articleCollectionId, remainingItemCount: remainingItemCount };
  }

  reorderArticleCollectionItems(articleCollectionId, orderedItemIds) {
    const items = this._getFromStorage('article_collection_items', []);
    const idToItem = {};
    items.forEach((it) => {
      if (it.article_collection_id === articleCollectionId) idToItem[it.id] = it;
    });
    orderedItemIds.forEach((id, index) => {
      const it = idToItem[id];
      if (it) it.order_index = index;
    });
    this._saveToStorage('article_collection_items', items);
    return { articleCollectionId: articleCollectionId, success: true };
  }

  // -------------------- Citations & Export Lists --------------------

  getFormattedCitation(publicationId, citationStyle) {
    const pubs = this._getFromStorage('publications', []);
    const pub = pubs.find((p) => p.id === publicationId) || null;
    if (!pub) {
      return { citationStyle: citationStyle, formattedCitation: '' };
    }

    const style = (citationStyle || 'apa').toLowerCase();
    const title = pub.title || '';
    const year = pub.publication_year || '';
    const journal = pub.journal_name || '';

    let formatted = '';
    if (style === 'apa') {
      formatted = title + ' (' + year + '). ' + journal + '.';
    } else if (style === 'mla') {
      formatted = '"' + title + '." ' + journal + ', ' + year + '.';
    } else if (style === 'chicago') {
      formatted = title + '. ' + journal + ', ' + year + '.';
    } else if (style === 'harvard') {
      formatted = title + ' (' + year + ') ' + journal + '.';
    } else if (style === 'ieee') {
      formatted = '"' + title + '", ' + journal + ', ' + year + '.';
    } else {
      formatted = title + ' (' + year + '). ' + journal + '.';
    }

    return {
      citationStyle: style,
      formattedCitation: formatted
    };
  }

  createCitationExportList(name, description) {
    const lists = this._getFromStorage('citation_export_lists', []);
    const now = this._nowIso();
    const list = {
      id: this._generateId('citationexportlist'),
      name: name,
      description: description || '',
      created_at: now,
      updated_at: now
    };
    lists.push(list);
    this._saveToStorage('citation_export_lists', lists);
    return list;
  }

  getCitationExportListsSummary() {
    const lists = this._getFromStorage('citation_export_lists', []);
    const items = this._getFromStorage('citation_export_items', []);
    return lists.map((list) => {
      const count = items.filter((it) => it.citation_export_list_id === list.id).length;
      return {
        citationExportListId: list.id,
        name: list.name,
        description: list.description || '',
        citationCount: count,
        createdAt: list.created_at,
        updatedAt: list.updated_at
      };
    });
  }

  addCitationToExportList(publicationId, citationStyle, citationExportListId) {
    const lists = this._getFromStorage('citation_export_lists', []);
    const items = this._getFromStorage('citation_export_items', []);
    const pubs = this._getFromStorage('publications', []);

    const list = lists.find((l) => l.id === citationExportListId) || null;
    const pub = pubs.find((p) => p.id === publicationId) || null;
    if (!list || !pub) return { citationExportItem: null, citationExportList: null };

    const formatted = this.getFormattedCitation(publicationId, citationStyle);
    const now = this._nowIso();
    const item = {
      id: this._generateId('citationexportitem'),
      citation_export_list_id: citationExportListId,
      publication_id: publicationId,
      citation_style: formatted.citationStyle,
      formatted_citation: formatted.formattedCitation,
      added_at: now
    };
    items.push(item);
    this._saveToStorage('citation_export_items', items);

    list.updated_at = now;
    this._saveToStorage('citation_export_lists', lists);

    return {
      citationExportItem: item,
      citationExportList: list
    };
  }

  getCitationExportListDetail(citationExportListId) {
    const lists = this._getFromStorage('citation_export_lists', []);
    const items = this._getFromStorage('citation_export_items', []);
    const pubs = this._getFromStorage('publications', []);

    const list = lists.find((l) => l.id === citationExportListId) || null;
    if (!list) return { citationExportList: null, items: [] };

    const detailItems = items
      .filter((it) => it.citation_export_list_id === citationExportListId)
      .map((it) => {
        const pub = pubs.find((p) => p.id === it.publication_id) || null;
        return {
          id: it.id,
          citation_export_list_id: it.citation_export_list_id,
          publication_id: it.publication_id,
          citation_style: it.citation_style,
          formatted_citation: it.formatted_citation,
          added_at: it.added_at,
          publication: pub
        };
      });

    return {
      citationExportList: list,
      items: detailItems
    };
  }

  renameCitationExportList(citationExportListId, newName) {
    const lists = this._getFromStorage('citation_export_lists', []);
    const list = lists.find((l) => l.id === citationExportListId) || null;
    if (!list) return null;
    list.name = newName;
    list.updated_at = this._nowIso();
    this._saveToStorage('citation_export_lists', lists);
    return list;
  }

  deleteCitationExportList(citationExportListId) {
    let lists = this._getFromStorage('citation_export_lists', []);
    let items = this._getFromStorage('citation_export_items', []);
    const before = lists.length;
    lists = lists.filter((l) => l.id !== citationExportListId);
    items = items.filter((it) => it.citation_export_list_id !== citationExportListId);
    this._saveToStorage('citation_export_lists', lists);
    this._saveToStorage('citation_export_items', items);
    return { success: lists.length !== before };
  }

  removeCitationExportItem(citationExportItemId) {
    const items = this._getFromStorage('citation_export_items', []);
    const idx = items.findIndex((it) => it.id === citationExportItemId);
    if (idx === -1) {
      return { success: false, citationExportListId: null, remainingItemCount: items.length };
    }
    const citationExportListId = items[idx].citation_export_list_id;
    items.splice(idx, 1);
    this._saveToStorage('citation_export_items', items);
    const remainingItemCount = items.filter((it) => it.citation_export_list_id === citationExportListId).length;
    return { success: true, citationExportListId: citationExportListId, remainingItemCount: remainingItemCount };
  }

  exportCitationExportList(citationExportListId, exportFormat) {
    const detail = this.getCitationExportListDetail(citationExportListId);
    const list = detail.citationExportList;
    const items = detail.items || [];
    const fmt = (exportFormat || 'plain_text').toLowerCase();

    let content = '';
    if (fmt === 'plain_text') {
      content = items.map((it) => it.formatted_citation).join('\n');
    } else if (fmt === 'ris') {
      content = items
        .map((it) => {
          const pub = it.publication || {};
          const year = pub.publication_year || '';
          const title = pub.title || '';
          return 'TY  - JOUR\nTI  - ' + title + '\nPY  - ' + year + '\nER  - ';
        })
        .join('\n');
    } else if (fmt === 'bibtex') {
      content = items
        .map((it, idx) => {
          const pub = it.publication || {};
          const year = pub.publication_year || '';
          const title = pub.title || '';
          const key = 'ref' + (idx + 1);
          return '@article{' + key + ',\n  title={' + title + '},\n  year={' + year + '}\n}';
        })
        .join('\n\n');
    } else {
      content = items.map((it) => it.formatted_citation).join('\n');
    }

    const fileNameSuggestion = (list && list.name ? list.name.replace(/\s+/g, '_') : 'citations') + '.' + (fmt === 'plain_text' ? 'txt' : fmt);

    return {
      exportFormat: fmt,
      content: content,
      fileNameSuggestion: fileNameSuggestion
    };
  }

  // -------------------- Bookmarks --------------------

  createBookmark(publicationId, tags, note) {
    const bookmarks = this._getFromStorage('bookmarks', []);
    const pubs = this._getFromStorage('publications', []);
    const pub = pubs.find((p) => p.id === publicationId) || null;
    if (!pub) return null;

    const existing = bookmarks.find((b) => b.publication_id === publicationId);
    if (existing) {
      if (Array.isArray(tags)) existing.tags = tags;
      if (typeof note === 'string') existing.note = note;
      this._saveToStorage('bookmarks', bookmarks);
      return existing;
    }

    const bm = {
      id: this._generateId('bookmark'),
      publication_id: publicationId,
      tags: Array.isArray(tags) ? tags : [],
      note: note || '',
      created_at: this._nowIso()
    };
    bookmarks.push(bm);
    this._saveToStorage('bookmarks', bookmarks);
    return bm;
  }

  getBookmarks(filters) {
    const bookmarks = this._getFromStorage('bookmarks', []);
    const pubs = this._getFromStorage('publications', []);
    const f = filters || {};

    return bookmarks
      .map((bm) => {
        const pub = pubs.find((p) => p.id === bm.publication_id) || null;
        return { bookmark: bm, publication: pub };
      })
      .filter((pair) => {
        const bm = pair.bookmark;
        const pub = pair.publication;
        if (!pub) return false;

        if (f.tag) {
          const t = f.tag;
          if (!Array.isArray(bm.tags) || bm.tags.indexOf(t) === -1) return false;
        }

        if (f.publicationType && pub.publication_type !== f.publicationType) return false;

        if (f.keyword) {
          const k = this._normalizeString(f.keyword);
          const inTitle = this._containsText(pub.title, k);
          const inNote = this._containsText(bm.note, k);
          const inTags = Array.isArray(bm.tags) && bm.tags.some((tg) => this._containsText(tg, k));
          if (!inTitle && !inNote && !inTags) return false;
        }

        return true;
      })
      .map((pair) => ({
        bookmark: pair.bookmark,
        publication: {
          publicationId: pair.publication.id,
          title: pair.publication.title,
          publicationType: pair.publication.publication_type,
          publicationYear: pair.publication.publication_year,
          publicationStatus: pair.publication.publication_status
        }
      }));
  }

  updateBookmark(bookmarkId, tags, note) {
    const bookmarks = this._getFromStorage('bookmarks', []);
    const bm = bookmarks.find((b) => b.id === bookmarkId) || null;
    if (!bm) return null;
    if (Array.isArray(tags)) bm.tags = tags;
    if (typeof note === 'string') bm.note = note;
    this._saveToStorage('bookmarks', bookmarks);
    return bm;
  }

  deleteBookmark(bookmarkId) {
    let bookmarks = this._getFromStorage('bookmarks', []);
    const before = bookmarks.length;
    bookmarks = bookmarks.filter((b) => b.id !== bookmarkId);
    this._saveToStorage('bookmarks', bookmarks);
    return { success: bookmarks.length !== before };
  }

  // -------------------- Saved Search Alerts --------------------

  createSavedSearchAlert(name, searchScope, query, filters, sortBy, notificationType, notificationFrequency) {
    const alerts = this._getFromStorage('saved_search_alerts', []);
    const f = filters || {};
    const now = this._nowIso();

    const alert = {
      id: this._generateId('savedsearch'),
      name: name,
      search_scope: searchScope,
      query: query,
      filters_publication_type: f.publicationType || null,
      filters_year_from: typeof f.yearFrom === 'number' ? f.yearFrom : null,
      filters_year_to: typeof f.yearTo === 'number' ? f.yearTo : null,
      filters_min_citations: typeof f.minCitations === 'number' ? f.minCitations : null,
      filters_access_type: f.accessType || null,
      filters_language_code: f.languageCode || null,
      filters_journal_impact_factor_min:
        typeof f.journalImpactFactorMin === 'number' ? f.journalImpactFactorMin : null,
      filters_publication_status: f.publicationStatus || null,
      sort_by: sortBy,
      notification_type: notificationType,
      notification_frequency: notificationFrequency,
      is_enabled: true,
      created_at: now,
      updated_at: now,
      last_run_at: null
    };

    alerts.push(alert);
    this._saveToStorage('saved_search_alerts', alerts);
    return alert;
  }

  getSavedSearchAlertsSummary() {
    const alerts = this._getFromStorage('saved_search_alerts', []);
    return alerts.map((a) => ({
      savedSearchAlertId: a.id,
      name: a.name,
      searchScope: a.search_scope,
      query: a.query,
      sortBy: a.sort_by,
      notificationType: a.notification_type,
      notificationFrequency: a.notification_frequency,
      isEnabled: a.is_enabled,
      lastRunAt: a.last_run_at
    }));
  }

  updateSavedSearchAlertSettings(savedSearchAlertId, name, notificationType, notificationFrequency, isEnabled) {
    const alerts = this._getFromStorage('saved_search_alerts', []);
    const alert = alerts.find((a) => a.id === savedSearchAlertId) || null;
    if (!alert) return null;

    if (typeof name === 'string' && name.length > 0) alert.name = name;
    if (typeof notificationType === 'string') alert.notification_type = notificationType;
    if (typeof notificationFrequency === 'string') {
      alert.notification_frequency = notificationFrequency;
    }
    if (typeof isEnabled === 'boolean') alert.is_enabled = isEnabled;

    alert.updated_at = this._nowIso();
    this._saveToStorage('saved_search_alerts', alerts);
    return alert;
  }

  deleteSavedSearchAlert(savedSearchAlertId) {
    let alerts = this._getFromStorage('saved_search_alerts', []);
    const before = alerts.length;
    alerts = alerts.filter((a) => a.id !== savedSearchAlertId);
    this._saveToStorage('saved_search_alerts', alerts);
    return { success: alerts.length !== before };
  }

  runSavedSearchAlert(savedSearchAlertId, page, pageSize) {
    const alerts = this._getFromStorage('saved_search_alerts', []);
    const alert = alerts.find((a) => a.id === savedSearchAlertId) || null;
    if (!alert) {
      return {
        searchScope: null,
        page: page || 1,
        pageSize: pageSize || 20,
        totalResults: 0,
        publications: [],
        datasets: [],
        authors: [],
        events: []
      };
    }

    const res = this._runSavedSearchQuery(alert, page, pageSize);

    alert.last_run_at = this._nowIso();
    alert.updated_at = alert.last_run_at;
    this._saveToStorage('saved_search_alerts', alerts);

    return res;
  }

  // -------------------- Dataset search & cart --------------------

  getDatasetFilterOptions() {
    const dataTypesEnum = [
      'micro_level_transaction_data',
      'aggregate_panel_data',
      'survey_microdata',
      'synthetic_data',
      'other'
    ];
    const licenseTypesEnum = ['non_commercial_research', 'open', 'restricted', 'proprietary', 'mixed'];

    const dataTypes = dataTypesEnum.map((v) => ({
      value: v,
      label: v.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    }));
    const licenseTypes = licenseTypesEnum.map((v) => ({
      value: v,
      label: v.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    }));

    return {
      dataTypes: dataTypes,
      licenseTypes: licenseTypes
    };
  }

  searchDatasets(query, filters, sortBy, page, pageSize) {
    const datasets = this._getFromStorage('datasets', []);
    const q = this._normalizeString(query);
    const f = filters || {};

    let filtered = datasets.filter((d) => {
      const matchesQuery = !q
        ? true
        : (
            this._containsText(d.title, q) ||
            this._containsText(d.description, q) ||
            (Array.isArray(d.keywords) && d.keywords.some((k) => this._containsText(k, q))) ||
            (Array.isArray(d.topics) && d.topics.some((t) => this._containsText(t, q)))
          );
      if (!matchesQuery) return false;

      if (f.dataType && d.data_type !== f.dataType) return false;
      if (f.licenseType && d.license_type !== f.licenseType) return false;
      if (f.geographicCoverage && d.geographic_coverage !== f.geographicCoverage) return false;
      return true;
    });

    const sort = sortBy || 'relevance';
    if (sort === 'observations_high_to_low') {
      filtered.sort((a, b) => (b.num_observations || 0) - (a.num_observations || 0));
    } else if (sort === 'observations_low_to_high') {
      filtered.sort((a, b) => (a.num_observations || 0) - (b.num_observations || 0));
    }

    const pg = this._paginate(filtered, page, pageSize);

    const results = pg.results.map((d) => ({
      datasetId: d.id,
      title: d.title,
      descriptionSnippet: d.description ? String(d.description).slice(0, 300) : '',
      dataType: d.data_type,
      licenseType: d.license_type,
      numObservations: d.num_observations,
      numVariables: d.num_variables,
      geographicCoverage: d.geographic_coverage || null,
      releaseDate: d.release_date || null
    }));

    return {
      query: query,
      page: pg.page,
      pageSize: pg.pageSize,
      totalResults: pg.totalResults,
      results: results
    };
  }

  getDatasetDetail(datasetId) {
    const datasets = this._getFromStorage('datasets', []);
    return datasets.find((d) => d.id === datasetId) || null;
  }

  getDatasetCart() {
    const cart = this._getFromStorage('dataset_cart', null);
    const items = this._getFromStorage('dataset_cart_items', []);
    const datasets = this._getFromStorage('datasets', []);

    if (!cart) {
      return {
        datasetCart: null,
        items: [],
        totalDatasets: 0
      };
    }

    const cartItems = items
      .filter((it) => it.dataset_cart_id === cart.id)
      .map((it) => {
        const d = datasets.find((ds) => ds.id === it.dataset_id) || null;
        return {
          datasetCartItemId: it.id,
          addedAt: it.added_at,
          dataset: d
            ? {
                datasetId: d.id,
                title: d.title,
                numObservations: d.num_observations,
                numVariables: d.num_variables,
                licenseType: d.license_type
              }
            : null
        };
      });

    return {
      datasetCart: cart,
      items: cartItems,
      totalDatasets: cartItems.length
    };
  }

  addDatasetToCart(datasetId) {
    const cart = this._getOrCreateDatasetCart();
    const items = this._getFromStorage('dataset_cart_items', []);
    const datasets = this._getFromStorage('datasets', []);

    const dataset = datasets.find((d) => d.id === datasetId) || null;
    if (!dataset) {
      return { datasetCartItem: null, datasetCart: cart, totalDatasets: items.length };
    }

    const existing = items.find(
      (it) => it.dataset_cart_id === cart.id && it.dataset_id === datasetId
    );
    if (existing) {
      return { datasetCartItem: existing, datasetCart: cart, totalDatasets: items.filter((it) => it.dataset_cart_id === cart.id).length };
    }

    const newItem = {
      id: this._generateId('datasetcartitem'),
      dataset_cart_id: cart.id,
      dataset_id: datasetId,
      added_at: this._nowIso()
    };
    items.push(newItem);
    this._saveToStorage('dataset_cart_items', items);

    cart.updated_at = this._nowIso();
    this._saveToStorage('dataset_cart', cart);

    const total = items.filter((it) => it.dataset_cart_id === cart.id).length;
    return { datasetCartItem: newItem, datasetCart: cart, totalDatasets: total };
  }

  removeDatasetFromCart(datasetCartItemId) {
    const items = this._getFromStorage('dataset_cart_items', []);
    const idx = items.findIndex((it) => it.id === datasetCartItemId);
    if (idx === -1) {
      return { success: false, totalDatasets: items.length };
    }
    const datasetCartId = items[idx].dataset_cart_id;
    items.splice(idx, 1);
    this._saveToStorage('dataset_cart_items', items);
    const remaining = items.filter((it) => it.dataset_cart_id === datasetCartId).length;
    return { success: true, totalDatasets: remaining };
  }

  clearDatasetCart() {
    const cart = this._getFromStorage('dataset_cart', null);
    if (!cart) return { success: true };
    let items = this._getFromStorage('dataset_cart_items', []);
    items = items.filter((it) => it.dataset_cart_id !== cart.id);
    this._saveToStorage('dataset_cart_items', items);
    return { success: true };
  }

  initiateDatasetCartDownload() {
    const cart = this._getFromStorage('dataset_cart', null);
    const items = this._getFromStorage('dataset_cart_items', []);
    const datasets = this._getFromStorage('datasets', []);

    if (!cart) {
      return {
        datasetCartId: null,
        requiresAgreement: false,
        agreementText: '',
        datasets: []
      };
    }

    const cartItems = items.filter((it) => it.dataset_cart_id === cart.id);
    const ds = cartItems.map((it) => {
      const d = datasets.find((dd) => dd.id === it.dataset_id) || null;
      if (!d) return null;
      return {
        datasetId: d.id,
        title: d.title,
        licenseType: d.license_type,
        accessUrl: d.access_url || '',
        requiresExternalRequest: d.license_type === 'restricted' || d.license_type === 'proprietary'
      };
    }).filter(Boolean);

    const requiresAgreement = ds.some((d) => d.licenseType === 'restricted' || d.licenseType === 'proprietary');

    return {
      datasetCartId: cart.id,
      requiresAgreement: requiresAgreement,
      agreementText: requiresAgreement
        ? 'By proceeding you agree to the terms of use for restricted/proprietary datasets.'
        : '',
      datasets: ds
    };
  }

  // -------------------- Authors & following --------------------

  getAuthorFilterOptions() {
    const authors = this._getFromStorage('authors', []);

    const topicMap = {};
    const regionMap = {};
    const institutionMap = {};

    authors.forEach((a) => {
      if (Array.isArray(a.topics)) {
        a.topics.forEach((t) => {
          if (!topicMap[t]) topicMap[t] = { value: t, label: t };
        });
      }
      if (a.region && !regionMap[a.region]) {
        regionMap[a.region] = { value: a.region, label: a.region };
      }
      if (a.affiliation && !institutionMap[a.affiliation]) {
        institutionMap[a.affiliation] = { value: a.affiliation, label: a.affiliation };
      }
    });

    return {
      topics: Object.keys(topicMap).map((k) => topicMap[k]),
      regions: Object.keys(regionMap).map((k) => regionMap[k]),
      institutions: Object.keys(institutionMap).map((k) => institutionMap[k])
    };
  }

  searchAuthors(query, filters, sortBy, page, pageSize) {
    const authors = this._getFromStorage('authors', []);
    const q = this._normalizeString(query);
    const f = filters || {};

    let filtered = authors.filter((a) => {
      const matchesQuery = !q
        ? true
        : (this._containsText(a.full_name, q) || this._containsText(a.bio, q) ||
            (Array.isArray(a.topics) && a.topics.some((t) => this._containsText(t, q))));
      if (!matchesQuery) return false;

      if (f.topic) {
        if (!Array.isArray(a.topics) || a.topics.indexOf(f.topic) === -1) return false;
      }
      if (f.institution && a.affiliation !== f.institution) return false;
      if (f.region && a.region !== f.region) return false;

      return true;
    });

    const sort = sortBy || 'publications_desc';
    if (sort === 'publications_desc') {
      filtered.sort((a, b) => (b.total_publications || 0) - (a.total_publications || 0));
    } else if (sort === 'name_asc') {
      filtered.sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''));
    } else if (sort === 'citations_desc') {
      filtered.sort((a, b) => (b.total_citations || 0) - (a.total_citations || 0));
    }

    const pg = this._paginate(filtered, page, pageSize);

    const results = pg.results.map((a) => ({
      authorId: a.id,
      fullName: a.full_name,
      affiliation: a.affiliation || '',
      region: a.region || '',
      topics: Array.isArray(a.topics) ? a.topics : [],
      totalPublications: a.total_publications,
      totalCitations: a.total_citations || 0,
      isFollowed: !!a.is_followed
    }));

    return {
      query: query,
      page: pg.page,
      pageSize: pg.pageSize,
      totalResults: pg.totalResults,
      results: results
    };
  }

  getAuthorProfile(authorId) {
    const authors = this._getFromStorage('authors', []);
    const pubs = this._getFromStorage('publications', []);

    const author = authors.find((a) => a.id === authorId) || null;
    if (!author) return { author: null, publications: [] };

    const publications = pubs.filter(
      (p) => Array.isArray(p.author_ids) && p.author_ids.indexOf(authorId) !== -1
    );

    return { author: author, publications: publications };
  }

  followAuthor(authorId) {
    const authors = this._getFromStorage('authors', []);
    const author = authors.find((a) => a.id === authorId) || null;
    if (!author) return null;
    author.is_followed = true;
    this._saveToStorage('authors', authors);
    return author;
  }

  unfollowAuthor(authorId) {
    const authors = this._getFromStorage('authors', []);
    const author = authors.find((a) => a.id === authorId) || null;
    if (!author) return null;
    author.is_followed = false;
    this._saveToStorage('authors', authors);
    return author;
  }

  getFollowedAuthorsSummary() {
    const authors = this._getFromStorage('authors', []);
    return authors.filter((a) => a.is_followed).map((a) => a);
  }

  // -------------------- Events & planner --------------------

  getEventFilterOptions() {
    const events = this._getFromStorage('events', []);
    const regionMap = {};
    let minFee = null;
    let maxFee = null;

    events.forEach((e) => {
      if (e.region && !regionMap[e.region]) {
        regionMap[e.region] = {
          value: e.region,
          label: e.region
        };
      }
      if (typeof e.registration_fee === 'number') {
        if (minFee === null || e.registration_fee < minFee) minFee = e.registration_fee;
        if (maxFee === null || e.registration_fee > maxFee) maxFee = e.registration_fee;
      }
    });

    return {
      regions: Object.keys(regionMap).map((k) => regionMap[k]),
      minRegistrationFee: minFee,
      maxRegistrationFee: maxFee
    };
  }

  searchEvents(query, filters, sortBy, page, pageSize) {
    const events = this._getFromStorage('events', []);
    const q = this._normalizeString(query);
    const f = filters || {};

    let filtered = events.filter((e) => {
      const matchesQuery = !q
        ? true
        : (this._containsText(e.title, q) || this._containsText(e.description, q) ||
            (Array.isArray(e.topics) && e.topics.some((t) => this._containsText(t, q))));
      if (!matchesQuery) return false;

      if (f.region && e.region !== f.region) return false;

      if (f.startDateFrom && e.start_date && e.start_date < f.startDateFrom) return false;
      if (f.startDateTo && e.start_date && e.start_date > f.startDateTo) return false;

      if (typeof f.maxRegistrationFee === 'number') {
        if (typeof e.registration_fee === 'number' && e.registration_fee > f.maxRegistrationFee) {
          return false;
        }
      }

      return true;
    });

    const sort = sortBy || 'start_date_earliest';
    if (sort === 'start_date_earliest') {
      filtered.sort((a, b) => (a.start_date || '').localeCompare(b.start_date || ''));
    } else if (sort === 'start_date_latest') {
      filtered.sort((a, b) => (b.start_date || '').localeCompare(a.start_date || ''));
    }

    const pg = this._paginate(filtered, page, pageSize);

    const results = pg.results.map((e) => ({
      eventId: e.id,
      title: e.title,
      topics: Array.isArray(e.topics) ? e.topics : [],
      region: e.region,
      locationCity: e.location_city || '',
      locationCountry: e.location_country || '',
      startDate: e.start_date,
      endDate: e.end_date,
      registrationFee: e.registration_fee,
      currency: e.currency,
      isUpcoming: !!e.is_upcoming
    }));

    return {
      query: query,
      page: pg.page,
      pageSize: pg.pageSize,
      totalResults: pg.totalResults,
      results: results
    };
  }

  getEventDetail(eventId) {
    const events = this._getFromStorage('events', []);
    return events.find((e) => e.id === eventId) || null;
  }

  addEventToPlanner(eventId) {
    const events = this._getFromStorage('events', []);
    const event = events.find((e) => e.id === eventId) || null;
    if (!event) return null;

    const entries = this._getFromStorage('planner_entries', []);
    const existing = entries.find((pe) => pe.event_id === eventId);
    if (existing) return existing;

    const entry = {
      id: this._generateId('plannerentry'),
      event_id: eventId,
      added_at: this._nowIso(),
      status: 'planned'
    };
    entries.push(entry);
    this._saveToStorage('planner_entries', entries);
    return entry;
  }

  getPlannerEntries() {
    const entries = this._getFromStorage('planner_entries', []);
    const events = this._getFromStorage('events', []);
    return entries.map((pe) => {
      const ev = events.find((e) => e.id === pe.event_id) || null;
      return {
        plannerEntry: pe,
        event: ev
      };
    });
  }

  updatePlannerEntryStatus(plannerEntryId, status) {
    const entries = this._getFromStorage('planner_entries', []);
    const entry = entries.find((pe) => pe.id === plannerEntryId) || null;
    if (!entry) return null;
    entry.status = status;
    this._saveToStorage('planner_entries', entries);
    return entry;
  }

  removePlannerEntry(plannerEntryId) {
    let entries = this._getFromStorage('planner_entries', []);
    const before = entries.length;
    entries = entries.filter((pe) => pe.id !== plannerEntryId);
    this._saveToStorage('planner_entries', entries);
    return { success: entries.length !== before };
  }

  // -------------------- Static content (About & Help) --------------------

  getAboutContent() {
    const about = this._getFromStorage('about_content', null);
    if (!about) {
      return {
        title: 'About',
        intro: '',
        sections: []
      };
    }
    return about;
  }

  getHelpTopicsSummary() {
    const topics = this._getFromStorage('help_topics', []);
    return topics.map((t) => ({
      topicId: t.topicId,
      title: t.title,
      category: t.category,
      shortDescription: t.shortDescription || ''
    }));
  }

  getHelpTopicDetail(topicId) {
    const topics = this._getFromStorage('help_topics', []);
    const topic = topics.find((t) => t.topicId === topicId) || null;
    if (!topic) {
      return {
        topicId: topicId,
        title: '',
        category: '',
        body: '',
        steps: [],
        faqs: [],
        contactInfo: ''
      };
    }
    return topic;
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
