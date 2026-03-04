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

  // --------------------------
  // Storage helpers
  // --------------------------

  _initStorage() {
    const arrayKeys = [
      'outputs',
      'departments',
      'faculties',
      'authors',
      'grants',
      'lists',
      'list_items',
      'alerts',
      'followed_departments',
      'private_notes',
      'department_metrics',
      'batch_exports'
    ];

    arrayKeys.forEach((key) => {
      if (localStorage.getItem(key) === null) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    });

    if (localStorage.getItem('settings') === null) {
      // Singleton settings record for the single user; allow null to mean "not initialized"
      localStorage.setItem('settings', JSON.stringify(null));
    }

    if (localStorage.getItem('informational_pages') === null) {
      // Map of pageKey -> {title, sections, lastUpdated}
      localStorage.setItem('informational_pages', JSON.stringify({}));
    }

    if (localStorage.getItem('idCounter') === null) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, defaultValue) {
    const data = localStorage.getItem(key);
    if (data === null || data === undefined) {
      return defaultValue !== undefined ? defaultValue : null;
    }
    try {
      return JSON.parse(data);
    } catch (e) {
      return defaultValue !== undefined ? defaultValue : null;
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

  // --------------------------
  // Entity fetch helpers
  // --------------------------

  _getOutputs() {
    return this._getFromStorage('outputs', []);
  }

  _getDepartments() {
    return this._getFromStorage('departments', []);
  }

  _getFaculties() {
    return this._getFromStorage('faculties', []);
  }

  _getAuthors() {
    return this._getFromStorage('authors', []);
  }

  _getGrants() {
    return this._getFromStorage('grants', []);
  }

  _getLists() {
    return this._getFromStorage('lists', []);
  }

  _getListItems() {
    return this._getFromStorage('list_items', []);
  }

  _getAlerts() {
    return this._getFromStorage('alerts', []);
  }

  _getFollowedDepartments() {
    return this._getFromStorage('followed_departments', []);
  }

  _getPrivateNotes() {
    return this._getFromStorage('private_notes', []);
  }

  _getDepartmentMetricsTable() {
    return this._getFromStorage('department_metrics', []);
  }

  _getBatchExports() {
    return this._getFromStorage('batch_exports', []);
  }

  _getInformationalPages() {
    return this._getFromStorage('informational_pages', {});
  }

  // --------------------------
  // Core internal helpers
  // --------------------------

  _getUserSingletonSettings() {
    let settings = this._getFromStorage('settings', null);
    if (!settings || typeof settings !== 'object') {
      const now = this._now();
      settings = {
        id: 'settings_singleton',
        defaultCitationStyle: 'apa',
        itemsPerPage: 20,
        theme: 'light',
        createdAt: now,
        updatedAt: now
      };
      this._saveToStorage('settings', settings);
    }
    return settings;
  }

  _getOrCreateList(listName, listType) {
    const effectiveType = listType || 'generic';
    let lists = this._getLists();
    let existing = null;
    if (listName) {
      existing = lists.find(
        (l) => l.name === listName && l.listType === effectiveType
      );
    }
    if (existing) {
      return { list: existing, created: false };
    }
    const now = this._now();
    const newList = {
      id: this._generateId('list'),
      name: listName || 'Untitled list',
      description: '',
      listType: effectiveType,
      createdAt: now,
      updatedAt: now
    };
    lists.push(newList);
    this._saveToStorage('lists', lists);
    return { list: newList, created: true };
  }

  _enforceBatchExportLimit(outputIds, max) {
    const limit = typeof max === 'number' && max > 0 ? max : 10;
    const idsArray = Array.isArray(outputIds) ? outputIds.slice() : [];
    const limited = idsArray.slice(0, limit);
    return {
      outputIds: limited,
      includedOutputCount: limited.length
    };
  }

  _upsertPrivateNoteForOutput(outputId, text) {
    let notes = this._getPrivateNotes();
    const now = this._now();
    let note = notes.find((n) => n.outputId === outputId);
    if (note) {
      note.text = text;
      note.updatedAt = now;
    } else {
      note = {
        id: this._generateId('note'),
        outputId: outputId,
        text: text,
        createdAt: now,
        updatedAt: now
      };
      notes.push(note);
    }
    this._saveToStorage('private_notes', notes);
    return note;
  }

  _getAccessBadgeLabel(accessStatus) {
    switch (accessStatus) {
      case 'open_access':
        return 'Open Access';
      case 'embargoed':
        return 'Embargoed';
      case 'restricted':
        return 'Restricted';
      case 'closed':
        return 'Closed';
      case 'metadata_only':
        return 'Metadata only';
      default:
        return '';
    }
  }

  _normalizeString(value) {
    return (value || '').toString().toLowerCase();
  }

  _compareByDateDesc(a, b) {
    const tA = a ? Date.parse(a) : NaN;
    const tB = b ? Date.parse(b) : NaN;
    if (isNaN(tA) && isNaN(tB)) return 0;
    if (isNaN(tA)) return 1;
    if (isNaN(tB)) return -1;
    return tB - tA;
  }

  _getOutputSortDate(output) {
    if (output && output.publicationDate) {
      const t = Date.parse(output.publicationDate);
      if (!isNaN(t)) return t;
    }
    if (output && typeof output.publicationYear === 'number') {
      return new Date(output.publicationYear, 0, 1).getTime();
    }
    return 0;
  }

  // --------------------------
  // Interface: searchOutputs
  // --------------------------

  // searchOutputs(query, searchScope, filters, sortBy, sortDirection, page, pageSize)
  searchOutputs(query, searchScope, filters, sortBy, sortDirection, page, pageSize) {
    const q = this._normalizeString(query || '');
    const useQuery = q.length > 0;
    const scope = searchScope || 'all_fields';
    const f = filters || {};
    const sortField = sortBy || 'relevance';
    const sortDir = sortDirection === 'asc' ? 'asc' : 'desc';

    const outputs = this._getOutputs();
    const departments = this._getDepartments();
    const faculties = this._getFaculties();
    const authors = this._getAuthors();
    const grants = this._getGrants();
    const lists = this._getLists();
    const listItems = this._getListItems();

    const deptMap = {};
    departments.forEach((d) => {
      deptMap[d.id] = d;
    });
    const facultyMap = {};
    faculties.forEach((fa) => {
      facultyMap[fa.id] = fa;
    });
    const authorMap = {};
    authors.forEach((a) => {
      authorMap[a.id] = a;
    });
    const grantMap = {};
    grants.forEach((g) => {
      grantMap[g.id] = g;
    });
    const listMap = {};
    lists.forEach((l) => {
      listMap[l.id] = l;
    });

    const filtered = outputs.filter((o) => {
      // Query match
      if (useQuery) {
        let haystacks = [];
        const title = o.title || '';
        const abstractText = o.abstract || '';
        const keywords = Array.isArray(o.keywords) ? o.keywords.join(' ') : '';

        if (scope === 'title') {
          haystacks = [title];
        } else if (scope === 'abstract') {
          haystacks = [abstractText];
        } else if (scope === 'keywords') {
          haystacks = [keywords];
        } else if (scope === 'full_text') {
          // No full text indexed; approximate with title + abstract + keywords
          haystacks = [title, abstractText, keywords];
        } else {
          haystacks = [title, abstractText, keywords];
        }

        const matches = haystacks.some((h) =>
          this._normalizeString(h).includes(q)
        );
        if (!matches) return false;
      }

      // Document types
      if (Array.isArray(f.documentTypes) && f.documentTypes.length > 0) {
        if (!f.documentTypes.includes(o.documentType)) return false;
      }

      // Department filter
      if (Array.isArray(f.departmentIds) && f.departmentIds.length > 0) {
        const outputDeptIds = Array.isArray(o.departmentIds) ? o.departmentIds : [];
        const hasDept = f.departmentIds.some((id) => outputDeptIds.includes(id));
        if (!hasDept) return false;
      }

      // Faculty filter (consider facultyIds on output and facultyId via departments)
      if (Array.isArray(f.facultyIds) && f.facultyIds.length > 0) {
        const outputFacultyIdsSet = new Set(Array.isArray(o.facultyIds) ? o.facultyIds : []);
        const outputDeptIds = Array.isArray(o.departmentIds) ? o.departmentIds : [];
        outputDeptIds.forEach((deptId) => {
          const dept = deptMap[deptId];
          if (dept && dept.facultyId) {
            outputFacultyIdsSet.add(dept.facultyId);
          }
        });
        const hasFaculty = f.facultyIds.some((fid) => outputFacultyIdsSet.has(fid));
        if (!hasFaculty) return false;
      }

      // Year range
      if (typeof f.yearFrom === 'number' && o.publicationYear < f.yearFrom) {
        return false;
      }
      if (typeof f.yearTo === 'number' && o.publicationYear > f.yearTo) {
        return false;
      }

      // Open access
      if (f.openAccessOnly) {
        if (!(o.isOpenAccess === true || o.accessStatus === 'open_access')) {
          return false;
        }
      }

      // Access status list
      if (Array.isArray(f.accessStatuses) && f.accessStatuses.length > 0) {
        if (!f.accessStatuses.includes(o.accessStatus)) return false;
      }

      // Grant
      if (f.grantId) {
        const outputGrantIds = Array.isArray(o.grantIds) ? o.grantIds : [];
        if (!outputGrantIds.includes(f.grantId)) return false;
      }

      // Author
      if (f.authorId) {
        const outputAuthorIds = Array.isArray(o.authorIds) ? o.authorIds : [];
        if (!outputAuthorIds.includes(f.authorId)) return false;
      }

      return true;
    });

    // Sorting
    const sorted = filtered.slice();
    sorted.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'date') {
        const tA = this._getOutputSortDate(a);
        const tB = this._getOutputSortDate(b);
        cmp = tA - tB;
      } else if (sortField === 'citations') {
        const cA = typeof a.citationCount === 'number' ? a.citationCount : 0;
        const cB = typeof b.citationCount === 'number' ? b.citationCount : 0;
        cmp = cA - cB;
      } else if (sortField === 'downloads') {
        const dA = typeof a.downloadCount === 'number' ? a.downloadCount : 0;
        const dB = typeof b.downloadCount === 'number' ? b.downloadCount : 0;
        cmp = dA - dB;
      } else {
        // relevance or unknown: fallback to title ascending
        const tA = this._normalizeString(a.title);
        const tB = this._normalizeString(b.title);
        if (tA < tB) cmp = -1;
        else if (tA > tB) cmp = 1;
        else cmp = 0;
      }

      if (sortDir === 'asc') return cmp;
      return -cmp;
    });

    // Pagination
    const settings = this._getUserSingletonSettings();
    const effectivePageSize =
      typeof pageSize === 'number' && pageSize > 0
        ? pageSize
        : (settings && settings.itemsPerPage) || 20;
    const effectivePage = typeof page === 'number' && page > 0 ? page : 1;
    const startIndex = (effectivePage - 1) * effectivePageSize;
    const pageItems = sorted.slice(startIndex, startIndex + effectivePageSize);

    // Map list memberships
    const listItemsByOutput = {};
    listItems.forEach((li) => {
      if (!listItemsByOutput[li.outputId]) listItemsByOutput[li.outputId] = [];
      listItemsByOutput[li.outputId].push(li);
    });

    const results = pageItems.map((o) => {
      const departmentNames = (Array.isArray(o.departmentIds) ? o.departmentIds : [])
        .map((id) => (deptMap[id] ? deptMap[id].name : null))
        .filter((name) => !!name);
      const facultyNames = (Array.isArray(o.facultyIds) ? o.facultyIds : [])
        .map((id) => (facultyMap[id] ? facultyMap[id].name : null))
        .filter((name) => !!name);
      const authorNames = (Array.isArray(o.authorIds) ? o.authorIds : [])
        .map((id) => (authorMap[id] ? authorMap[id].fullName : null))
        .filter((name) => !!name);
      const grantCodes = (Array.isArray(o.grantIds) ? o.grantIds : [])
        .map((id) => (grantMap[id] ? grantMap[id].code : null))
        .filter((code) => !!code);

      const memberships = listItemsByOutput[o.id] || [];
      const listNames = [];
      memberships.forEach((li) => {
        const list = listMap[li.listId];
        if (list && !listNames.includes(list.name)) {
          listNames.push(list.name);
        }
      });

      const result = {
        outputId: o.id,
        title: o.title,
        subtitle: o.subtitle || '',
        documentType: o.documentType,
        publicationYear: o.publicationYear,
        isOpenAccess: !!o.isOpenAccess,
        accessStatus: o.accessStatus,
        citationCount: typeof o.citationCount === 'number' ? o.citationCount : 0,
        downloadCount: typeof o.downloadCount === 'number' ? o.downloadCount : 0,
        departmentNames: departmentNames,
        facultyNames: facultyNames,
        authorNames: authorNames,
        grantCodes: grantCodes,
        hasFullText: !!o.hasFullText,
        accessBadgeLabel: this._getAccessBadgeLabel(o.accessStatus),
        listMembership: {
          inAnyList: memberships.length > 0,
          listNames: listNames
        }
      };

      // Foreign key resolution: include full output object
      result.output = o || null;

      return result;
    });

    const availableSortOptions = [
      { value: 'relevance', label: 'Relevance' },
      { value: 'date', label: 'Date' },
      { value: 'citations', label: 'Citations' },
      { value: 'downloads', label: 'Downloads' }
    ];

    return {
      results: results,
      totalResults: sorted.length,
      page: effectivePage,
      pageSize: effectivePageSize,
      availableSortOptions: availableSortOptions
    };
  }

  // --------------------------
  // Interface: getSearchFilterOptions
  // --------------------------

  getSearchFilterOptions() {
    const outputs = this._getOutputs();
    const departments = this._getDepartments();
    const faculties = this._getFaculties();

    const documentTypeOptions = [
      { value: 'journal_article', label: 'Journal Article' },
      { value: 'doctoral_thesis', label: 'Doctoral Thesis' },
      { value: 'conference_paper', label: 'Conference Paper' },
      { value: 'dataset', label: 'Dataset' },
      { value: 'other', label: 'Other' }
    ];

    const facultyMap = {};
    faculties.forEach((f) => {
      facultyMap[f.id] = f;
    });

    const departmentOptions = departments.map((d) => {
      const faculty = d.facultyId ? facultyMap[d.facultyId] : null;
      const option = {
        id: d.id,
        name: d.name,
        facultyName: faculty ? faculty.name : null
      };
      // Foreign key resolution: include department object
      option.department = d;
      return option;
    });

    const facultyOptions = faculties.map((f) => ({
      id: f.id,
      name: f.name,
      faculty: f // foreign key resolution for completeness
    }));

    const accessStatusOptions = [
      { value: 'open_access', label: 'Open Access' },
      { value: 'embargoed', label: 'Embargoed' },
      { value: 'restricted', label: 'Restricted' },
      { value: 'closed', label: 'Closed' },
      { value: 'metadata_only', label: 'Metadata only' }
    ];

    let minYear = null;
    let maxYear = null;
    outputs.forEach((o) => {
      if (typeof o.publicationYear === 'number') {
        if (minYear === null || o.publicationYear < minYear) {
          minYear = o.publicationYear;
        }
        if (maxYear === null || o.publicationYear > maxYear) {
          maxYear = o.publicationYear;
        }
      }
    });

    const grantSearchEnabled = this._getGrants().length > 0;

    return {
      documentTypeOptions: documentTypeOptions,
      departmentOptions: departmentOptions,
      facultyOptions: facultyOptions,
      accessStatusOptions: accessStatusOptions,
      yearRange: {
        minYear: minYear,
        maxYear: maxYear
      },
      grantSearchEnabled: grantSearchEnabled
    };
  }

  // --------------------------
  // Interface: searchGrants
  // --------------------------

  // searchGrants(query, limit)
  searchGrants(query, limit) {
    const q = this._normalizeString(query || '');
    const max = typeof limit === 'number' && limit > 0 ? limit : 10;
    const grants = this._getGrants();
    const outputs = this._getOutputs();

    const grantUsageCounts = {};
    outputs.forEach((o) => {
      (Array.isArray(o.grantIds) ? o.grantIds : []).forEach((gid) => {
        grantUsageCounts[gid] = (grantUsageCounts[gid] || 0) + 1;
      });
    });

    const filtered = grants.filter((g) => {
      if (!q) return true;
      const code = this._normalizeString(g.code || '');
      const title = this._normalizeString(g.title || '');
      return code.includes(q) || title.includes(q);
    });

    const results = filtered.slice(0, max).map((g) => ({
      grantId: g.id,
      code: g.code,
      title: g.title || '',
      funderName: g.funderName || '',
      totalFundedOutputs:
        typeof g.totalFundedOutputs === 'number'
          ? g.totalFundedOutputs
          : grantUsageCounts[g.id] || 0,
      grant: g // foreign key resolution
    }));

    return results;
  }

  // --------------------------
  // Interface: getHomePageHighlights
  // --------------------------

  getHomePageHighlights() {
    const outputs = this._getOutputs();
    const departments = this._getDepartments();

    const deptMap = {};
    departments.forEach((d) => {
      deptMap[d.id] = d;
    });

    const outputsWithDates = outputs.slice().sort((a, b) => {
      const tA = this._getOutputSortDate(a);
      const tB = this._getOutputSortDate(b);
      return tB - tA;
    });

    const mostCited = outputs.slice().sort((a, b) => {
      const cA = typeof a.citationCount === 'number' ? a.citationCount : 0;
      const cB = typeof b.citationCount === 'number' ? b.citationCount : 0;
      return cB - cA;
    });

    const mostDownloaded = outputs.slice().sort((a, b) => {
      const dA = typeof a.downloadCount === 'number' ? a.downloadCount : 0;
      const dB = typeof b.downloadCount === 'number' ? b.downloadCount : 0;
      return dB - dA;
    });

    const mapToRecent = (o) => {
      const departmentNames = (Array.isArray(o.departmentIds) ? o.departmentIds : [])
        .map((id) => (deptMap[id] ? deptMap[id].name : null))
        .filter((name) => !!name);
      const obj = {
        outputId: o.id,
        title: o.title,
        publicationYear: o.publicationYear,
        documentType: o.documentType,
        departmentNames: departmentNames,
        isOpenAccess: !!o.isOpenAccess
      };
      obj.output = o; // foreign key resolution
      return obj;
    };

    const mapToMostCited = (o) => {
      const departmentNames = (Array.isArray(o.departmentIds) ? o.departmentIds : [])
        .map((id) => (deptMap[id] ? deptMap[id].name : null))
        .filter((name) => !!name);
      const obj = {
        outputId: o.id,
        title: o.title,
        citationCount: typeof o.citationCount === 'number' ? o.citationCount : 0,
        documentType: o.documentType,
        departmentNames: departmentNames
      };
      obj.output = o; // foreign key resolution
      return obj;
    };

    const mapToMostDownloaded = (o) => {
      const departmentNames = (Array.isArray(o.departmentIds) ? o.departmentIds : [])
        .map((id) => (deptMap[id] ? deptMap[id].name : null))
        .filter((name) => !!name);
      const obj = {
        outputId: o.id,
        title: o.title,
        downloadCount: typeof o.downloadCount === 'number' ? o.downloadCount : 0,
        documentType: o.documentType,
        departmentNames: departmentNames
      };
      obj.output = o; // foreign key resolution
      return obj;
    };

    return {
      recentOutputs: outputsWithDates.slice(0, 5).map(mapToRecent),
      mostCitedOutputs: mostCited.slice(0, 5).map(mapToMostCited),
      mostDownloadedOutputs: mostDownloaded.slice(0, 5).map(mapToMostDownloaded)
    };
  }

  // --------------------------
  // Interface: getOutputDetail
  // --------------------------

  // getOutputDetail(outputId)
  getOutputDetail(outputId) {
    const outputs = this._getOutputs();
    const departments = this._getDepartments();
    const faculties = this._getFaculties();
    const authors = this._getAuthors();
    const grants = this._getGrants();
    const notes = this._getPrivateNotes();
    const lists = this._getLists();
    const listItems = this._getListItems();

    const output = outputs.find((o) => o.id === outputId);
    if (!output) {
      return null;
    }

    const deptMap = {};
    departments.forEach((d) => {
      deptMap[d.id] = d;
    });
    const facultyMap = {};
    faculties.forEach((f) => {
      facultyMap[f.id] = f;
    });
    const authorMap = {};
    authors.forEach((a) => {
      authorMap[a.id] = a;
    });
    const grantMap = {};
    grants.forEach((g) => {
      grantMap[g.id] = g;
    });

    const note = notes.find((n) => n.outputId === outputId) || null;

    const inUserListsMap = {};
    listItems
      .filter((li) => li.outputId === outputId)
      .forEach((li) => {
        const list = lists.find((l) => l.id === li.listId);
        if (list && !inUserListsMap[list.id]) {
          inUserListsMap[list.id] = list;
        }
      });

    const inUserLists = Object.keys(inUserListsMap).map((listId) => {
      const list = inUserListsMap[listId];
      return {
        listId: list.id,
        listName: list.name,
        listType: list.listType,
        list: list // foreign key resolution
      };
    });

    const authorsArr = (Array.isArray(output.authorIds) ? output.authorIds : []).map(
      (aid) => {
        const a = authorMap[aid] || null;
        const obj = {
          authorId: aid,
          fullName: a ? a.fullName : '',
          profileUrl: a ? a.profileUrl || '' : ''
        };
        obj.author = a; // foreign key resolution
        return obj;
      }
    );

    const departmentsArr = (Array.isArray(output.departmentIds)
      ? output.departmentIds
      : []
    ).map((did) => {
      const d = deptMap[did] || null;
      const obj = {
        departmentId: did,
        name: d ? d.name : ''
      };
      obj.department = d; // foreign key resolution
      return obj;
    });

    const facultiesArr = (Array.isArray(output.facultyIds)
      ? output.facultyIds
      : []
    ).map((fid) => {
      const f = facultyMap[fid] || null;
      const obj = {
        facultyId: fid,
        name: f ? f.name : ''
      };
      obj.faculty = f; // foreign key resolution
      return obj;
    });

    const grantsArr = (Array.isArray(output.grantIds) ? output.grantIds : []).map(
      (gid) => {
        const g = grantMap[gid] || null;
        const obj = {
          grantId: gid,
          code: g ? g.code : '',
          title: g ? g.title || '' : ''
        };
        obj.grant = g; // foreign key resolution
        return obj;
      }
    );

    const existingPrivateNote = note
      ? {
          noteId: note.id,
          text: note.text,
          createdAt: note.createdAt,
          updatedAt: note.updatedAt
        }
      : null;

    const detail = {
      outputId: output.id,
      title: output.title,
      subtitle: output.subtitle || '',
      abstract: output.abstract || '',
      documentType: output.documentType,
      publicationYear: output.publicationYear,
      publicationDate: output.publicationDate || null,
      accessStatus: output.accessStatus,
      isOpenAccess: !!output.isOpenAccess,
      citationCount: typeof output.citationCount === 'number' ? output.citationCount : 0,
      downloadCount: typeof output.downloadCount === 'number' ? output.downloadCount : 0,
      keywords: Array.isArray(output.keywords) ? output.keywords : [],
      license: output.license || '',
      fileUrl: output.fileUrl || '',
      hasFullText: !!output.hasFullText,
      doi: output.doi || '',
      issn: output.issn || '',
      isbn: output.isbn || '',
      journalTitle: output.journalTitle || '',
      volume: output.volume || '',
      issue: output.issue || '',
      pages: output.pages || '',
      publisher: output.publisher || '',
      language: output.language || '',
      authors: authorsArr,
      departments: departmentsArr,
      faculties: facultiesArr,
      grants: grantsArr,
      availableCitationStyles: Array.isArray(output.availableCitationStyles)
        ? output.availableCitationStyles
        : [],
      apaCitation: output.apaCitation || '',
      metadataDownloadFormats: Array.isArray(output.metadataDownloadFormats)
        ? output.metadataDownloadFormats
        : [],
      existingPrivateNote: existingPrivateNote,
      inUserLists: inUserLists
    };

    // Foreign key resolution for output itself
    detail.output = output;

    return detail;
  }

  // --------------------------
  // Interface: exportOutputCitation
  // --------------------------

  // exportOutputCitation(outputId, citationStyle)
  exportOutputCitation(outputId, citationStyle) {
    const outputs = this._getOutputs();
    const output = outputs.find((o) => o.id === outputId);
    if (!output) {
      return {
        success: false,
        citationStyle: citationStyle,
        citationText: '',
        message: 'Output not found'
      };
    }

    const style = citationStyle;
    if (style !== 'apa') {
      return {
        success: false,
        citationStyle: style,
        citationText: '',
        message: 'Citation style not supported by this implementation'
      };
    }

    let citationText = output.apaCitation || '';
    if (!citationText) {
      citationText = this._generateApaCitationFromOutput(output);
    }

    const result = {
      success: true,
      citationStyle: style,
      citationText: citationText,
      message: 'Citation generated'
    };

    // Instrumentation for task completion tracking
    try {
      if (result && result.success === true && result.citationStyle === 'apa') {
        localStorage.setItem(
          'task4_exportedCitation',
          JSON.stringify({ "outputId": outputId, "citationStyle": citationStyle, "exportedAt": this._now() })
        );
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return result;
  }

  _generateApaCitationFromOutput(output) {
    // Very simplified APA-like formatter using stored metadata
    const authors = this._getAuthors();
    const authorMap = {};
    authors.forEach((a) => {
      authorMap[a.id] = a;
    });

    const authorNames = (Array.isArray(output.authorIds) ? output.authorIds : [])
      .map((aid) => (authorMap[aid] ? authorMap[aid].fullName : null))
      .filter((name) => !!name);

    const authorsPart = authorNames.join(', ');
    const yearPart = output.publicationYear ? '(' + output.publicationYear + ').' : '';
    const titlePart = output.title ? output.title + '.' : '';
    const journalPart = output.journalTitle ? ' ' + output.journalTitle : '';
    const volumePart = output.volume ? ', ' + output.volume : '';
    const issuePart = output.issue ? '(' + output.issue + ')' : '';
    const pagesPart = output.pages ? ', ' + output.pages : '';
    const doiPart = output.doi ? ' https://doi.org/' + output.doi : '';

    return [authorsPart, yearPart, titlePart, journalPart + volumePart + issuePart + pagesPart + '.', doiPart]
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // --------------------------
  // Interface: exportOutputMetadata
  // --------------------------

  // exportOutputMetadata(outputId, format)
  exportOutputMetadata(outputId, format) {
    const outputs = this._getOutputs();
    const output = outputs.find((o) => o.id === outputId);
    if (!output) {
      return {
        exportId: null,
        status: 'failed',
        format: format,
        fileUrl: '',
        message: 'Output not found'
      };
    }

    const availableFormats = Array.isArray(output.metadataDownloadFormats)
      ? output.metadataDownloadFormats
      : [];
    if (availableFormats.length > 0 && !availableFormats.includes(format)) {
      return {
        exportId: null,
        status: 'failed',
        format: format,
        fileUrl: '',
        message: 'Requested format not available for this output'
      };
    }

    const exportsTable = this._getBatchExports();
    const exportId = this._generateId('export');
    const fileUrl = '/exports/' + exportId + '.' + format;
    const record = {
      id: exportId,
      outputIds: [outputId],
      format: format,
      status: 'completed',
      source: 'output_detail',
      fileUrl: fileUrl,
      createdAt: this._now()
    };
    exportsTable.push(record);
    this._saveToStorage('batch_exports', exportsTable);

    return {
      exportId: exportId,
      status: 'completed',
      format: format,
      fileUrl: fileUrl,
      message: 'Export created'
    };
  }

  // --------------------------
  // Interface: savePrivateNote
  // --------------------------

  // savePrivateNote(outputId, text)
  savePrivateNote(outputId, text) {
    const note = this._upsertPrivateNoteForOutput(outputId, text);
    return {
      noteId: note.id,
      outputId: note.outputId,
      text: note.text,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt
    };
  }

  // --------------------------
  // Interface: deletePrivateNote
  // --------------------------

  // deletePrivateNote(outputId)
  deletePrivateNote(outputId) {
    let notes = this._getPrivateNotes();
    const beforeLength = notes.length;
    notes = notes.filter((n) => n.outputId !== outputId);
    this._saveToStorage('private_notes', notes);

    const success = notes.length !== beforeLength;
    return {
      success: success,
      message: success ? 'Note deleted' : 'No note found for this output'
    };
  }

  // --------------------------
  // Interface: addOutputToList
  // --------------------------

  // addOutputToList(outputId, listId, listName, listType)
  addOutputToList(outputId, listId, listName, listType) {
    let lists = this._getLists();
    let listItems = this._getListItems();

    let targetList = null;
    let createdNewList = false;

    if (listId) {
      targetList = lists.find((l) => l.id === listId) || null;
      if (!targetList && listName) {
        const res = this._getOrCreateList(listName, listType);
        targetList = res.list;
        createdNewList = res.created;
        lists = this._getLists(); // _getOrCreateList already saved
      }
    } else if (listName) {
      const res = this._getOrCreateList(listName, listType || 'generic');
      targetList = res.list;
      createdNewList = res.created;
      lists = this._getLists();
    }

    if (!targetList) {
      return {
        listId: null,
        listName: '',
        listType: listType || 'generic',
        listItemId: null,
        position: null,
        createdNewList: false
      };
    }

    // Avoid duplicate membership
    const existingItem = listItems.find(
      (li) => li.listId === targetList.id && li.outputId === outputId
    );
    if (existingItem) {
      return {
        listId: targetList.id,
        listName: targetList.name,
        listType: targetList.listType,
        listItemId: existingItem.id,
        position: typeof existingItem.position === 'number' ? existingItem.position : null,
        createdNewList: createdNewList
      };
    }

    const itemsForList = listItems.filter((li) => li.listId === targetList.id);
    const maxPosition = itemsForList.reduce((max, li) => {
      const pos = typeof li.position === 'number' ? li.position : 0;
      return pos > max ? pos : max;
    }, 0);

    const listItemId = this._generateId('list_item');
    const position = maxPosition + 1;
    const addedAt = this._now();

    const newListItem = {
      id: listItemId,
      listId: targetList.id,
      outputId: outputId,
      position: position,
      addedAt: addedAt
    };

    listItems.push(newListItem);
    this._saveToStorage('list_items', listItems);

    return {
      listId: targetList.id,
      listName: targetList.name,
      listType: targetList.listType,
      listItemId: listItemId,
      position: position,
      createdNewList: createdNewList
    };
  }

  // --------------------------
  // Interface: getUserLists
  // --------------------------

  getUserLists() {
    const lists = this._getLists();
    const listItems = this._getListItems();

    const counts = {};
    listItems.forEach((li) => {
      counts[li.listId] = (counts[li.listId] || 0) + 1;
    });

    return lists.map((l) => ({
      listId: l.id,
      name: l.name,
      description: l.description || '',
      listType: l.listType,
      itemCount: counts[l.id] || 0,
      createdAt: l.createdAt,
      updatedAt: l.updatedAt || null
    }));
  }

  // --------------------------
  // Interface: getListDetail
  // --------------------------

  // getListDetail(listId, sortBy)
  getListDetail(listId, sortBy) {
    const lists = this._getLists();
    const listItems = this._getListItems();
    const outputs = this._getOutputs();

    const list = lists.find((l) => l.id === listId);
    if (!list) {
      return null;
    }

    const outputMap = {};
    outputs.forEach((o) => {
      outputMap[o.id] = o;
    });

    const relevantItems = listItems.filter((li) => li.listId === listId);

    let items = relevantItems.map((li) => {
      const o = outputMap[li.outputId] || null;
      const departmentNames = o && Array.isArray(o.departmentIds)
        ? o.departmentIds
            .map((id) => {
              const dept = this._getDepartments().find((d) => d.id === id);
              return dept ? dept.name : null;
            })
            .filter((name) => !!name)
        : [];
      const item = {
        listItemId: li.id,
        position: typeof li.position === 'number' ? li.position : null,
        addedAt: li.addedAt,
        outputId: li.outputId,
        title: o ? o.title : '',
        documentType: o ? o.documentType : '',
        publicationYear: o ? o.publicationYear : null,
        departmentNames: departmentNames,
        isOpenAccess: o ? !!o.isOpenAccess : false
      };
      // Foreign key resolution: include full output object
      item.output = o;
      return item;
    });

    const sortField = sortBy || 'position';
    items.sort((a, b) => {
      if (sortField === 'position') {
        const pA = typeof a.position === 'number' ? a.position : 0;
        const pB = typeof b.position === 'number' ? b.position : 0;
        return pA - pB;
      }
      if (sortField === 'date_added') {
        return this._compareByDateDesc(a.addedAt, b.addedAt);
      }
      if (sortField === 'publication_year') {
        const yA = typeof a.publicationYear === 'number' ? a.publicationYear : 0;
        const yB = typeof b.publicationYear === 'number' ? b.publicationYear : 0;
        return yB - yA;
      }
      if (sortField === 'document_type') {
        const dtA = this._normalizeString(a.documentType);
        const dtB = this._normalizeString(b.documentType);
        if (dtA < dtB) return -1;
        if (dtA > dtB) return 1;
        return 0;
      }
      return 0;
    });

    const detail = {
      listId: list.id,
      name: list.name,
      description: list.description || '',
      listType: list.listType,
      createdAt: list.createdAt,
      updatedAt: list.updatedAt || null,
      items: items
    };

    // Foreign key resolution for list itself
    detail.list = list;

    return detail;
  }

  // --------------------------
  // Interface: createList
  // --------------------------

  // createList(name, description, listType)
  createList(name, description, listType) {
    const lists = this._getLists();
    const now = this._now();
    const newList = {
      id: this._generateId('list'),
      name: name,
      description: description || '',
      listType: listType,
      createdAt: now,
      updatedAt: now
    };
    lists.push(newList);
    this._saveToStorage('lists', lists);

    return {
      listId: newList.id,
      name: newList.name,
      description: newList.description,
      listType: newList.listType,
      createdAt: newList.createdAt
    };
  }

  // --------------------------
  // Interface: updateList
  // --------------------------

  // updateList(listId, name, description, listType)
  updateList(listId, name, description, listType) {
    const lists = this._getLists();
    const list = lists.find((l) => l.id === listId);
    if (!list) {
      return null;
    }
    const now = this._now();
    if (typeof name === 'string') list.name = name;
    if (typeof description === 'string') list.description = description;
    if (typeof listType === 'string') list.listType = listType;
    list.updatedAt = now;
    this._saveToStorage('lists', lists);

    return {
      listId: list.id,
      name: list.name,
      description: list.description,
      listType: list.listType,
      updatedAt: list.updatedAt
    };
  }

  // --------------------------
  // Interface: deleteList
  // --------------------------

  // deleteList(listId)
  deleteList(listId) {
    let lists = this._getLists();
    let listItems = this._getListItems();

    const beforeLists = lists.length;
    lists = lists.filter((l) => l.id !== listId);
    listItems = listItems.filter((li) => li.listId !== listId);

    this._saveToStorage('lists', lists);
    this._saveToStorage('list_items', listItems);

    const success = lists.length !== beforeLists;
    return {
      success: success,
      message: success ? 'List deleted' : 'List not found'
    };
  }

  // --------------------------
  // Interface: removeOutputFromList
  // --------------------------

  // removeOutputFromList(listId, outputId)
  removeOutputFromList(listId, outputId) {
    let listItems = this._getListItems();
    const beforeLength = listItems.length;
    listItems = listItems.filter(
      (li) => !(li.listId === listId && li.outputId === outputId)
    );
    this._saveToStorage('list_items', listItems);

    const success = listItems.length !== beforeLength;
    return {
      success: success,
      message: success ? 'Output removed from list' : 'No such list item found'
    };
  }

  // --------------------------
  // Interface: exportSelectedOutputs
  // --------------------------

  // exportSelectedOutputs(outputIds, format, source)
  exportSelectedOutputs(outputIds, format, source) {
    const limitResult = this._enforceBatchExportLimit(outputIds, 10);
    const ids = limitResult.outputIds;
    const count = limitResult.includedOutputCount;

    if (count === 0) {
      return {
        exportId: null,
        status: 'failed',
        format: format,
        fileUrl: '',
        includedOutputCount: 0,
        message: 'No outputs selected for export'
      };
    }

    const exportsTable = this._getBatchExports();
    const exportId = this._generateId('export');
    const fileUrl = '/exports/' + exportId + '.' + format;
    const record = {
      id: exportId,
      outputIds: ids,
      format: format,
      status: 'completed',
      source: source || 'search_results',
      fileUrl: fileUrl,
      createdAt: this._now()
    };

    exportsTable.push(record);
    this._saveToStorage('batch_exports', exportsTable);

    return {
      exportId: exportId,
      status: 'completed',
      format: format,
      fileUrl: fileUrl,
      includedOutputCount: count,
      message: 'Batch export created'
    };
  }

  // --------------------------
  // Interface: getAnalyticsYearOptions
  // --------------------------

  getAnalyticsYearOptions() {
    const metrics = this._getDepartmentMetricsTable();
    const yearsSet = new Set();
    metrics.forEach((m) => {
      if (typeof m.year === 'number') yearsSet.add(m.year);
    });
    return Array.from(yearsSet).sort((a, b) => b - a);
  }

  // --------------------------
  // Interface: getDepartmentMetrics
  // --------------------------

  // getDepartmentMetrics(year, metricType, sortBy, sortDirection)
  getDepartmentMetrics(year, metricType, sortBy, sortDirection) {
    const metrics = this._getDepartmentMetricsTable();
    const departments = this._getDepartments();
    const faculties = this._getFaculties();

    const deptMap = {};
    departments.forEach((d) => {
      deptMap[d.id] = d;
    });
    const facultyMap = {};
    faculties.forEach((f) => {
      facultyMap[f.id] = f;
    });

    const filtered = metrics.filter(
      (m) => m.year === year && m.metricType === metricType
    );

    const sortField = sortBy || 'value';
    const sortDir = sortDirection === 'asc' ? 'asc' : 'desc';

    const sorted = filtered.slice().sort((a, b) => {
      let cmp = 0;
      if (sortField === 'department_name') {
        const dA = deptMap[a.departmentId];
        const dB = deptMap[b.departmentId];
        const nA = this._normalizeString(dA ? dA.name : '');
        const nB = this._normalizeString(dB ? dB.name : '');
        if (nA < nB) cmp = -1;
        else if (nA > nB) cmp = 1;
        else cmp = 0;
      } else {
        const vA = typeof a.value === 'number' ? a.value : 0;
        const vB = typeof b.value === 'number' ? b.value : 0;
        cmp = vA - vB;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    const results = [];
    sorted.forEach((m, index) => {
      const dept = deptMap[m.departmentId] || null;
      const faculty = dept && dept.facultyId ? facultyMap[dept.facultyId] : null;
      const row = {
        departmentId: m.departmentId,
        departmentName: dept ? dept.name : '',
        facultyName: faculty ? faculty.name : '',
        metricType: m.metricType,
        year: m.year,
        value: typeof m.value === 'number' ? m.value : 0,
        rank: index + 1
      };
      // Foreign key resolution: include department object
      row.department = dept;
      return results.push(row);
    });

    return results;
  }

  // --------------------------
  // Interface: getDepartmentsList
  // --------------------------

  // getDepartmentsList(query)
  getDepartmentsList(query) {
    const departments = this._getDepartments();
    const faculties = this._getFaculties();

    const q = this._normalizeString(query || '');
    const facultyMap = {};
    faculties.forEach((f) => {
      facultyMap[f.id] = f;
    });

    return departments
      .filter((d) => {
        if (!q) return true;
        return this._normalizeString(d.name).includes(q);
      })
      .map((d) => {
        const faculty = d.facultyId ? facultyMap[d.facultyId] : null;
        const obj = {
          departmentId: d.id,
          name: d.name,
          facultyName: faculty ? faculty.name : '',
          isActive: !!d.isActive
        };
        obj.department = d; // foreign key resolution
        return obj;
      });
  }

  // --------------------------
  // Interface: getDepartmentDetail
  // --------------------------

  // getDepartmentDetail(departmentId)
  getDepartmentDetail(departmentId) {
    const departments = this._getDepartments();
    const faculties = this._getFaculties();
    const outputs = this._getOutputs();
    const followed = this._getFollowedDepartments();

    const dept = departments.find((d) => d.id === departmentId);
    if (!dept) return null;

    const faculty = dept.facultyId
      ? faculties.find((f) => f.id === dept.facultyId)
      : null;

    const isFollowed = followed.some((f) => f.departmentId === departmentId);

    const outputsForDept = outputs.filter((o) =>
      Array.isArray(o.departmentIds) && o.departmentIds.includes(departmentId)
    );

    const summaryMap = {};
    outputsForDept.forEach((o) => {
      const year = o.publicationYear;
      if (typeof year !== 'number') return;
      if (!summaryMap[year]) {
        summaryMap[year] = { year: year, totalOutputs: 0, openAccessOutputs: 0 };
      }
      summaryMap[year].totalOutputs += 1;
      if (o.isOpenAccess === true || o.accessStatus === 'open_access') {
        summaryMap[year].openAccessOutputs += 1;
      }
    });

    const publicationSummaryByYear = Object.keys(summaryMap)
      .map((yearStr) => summaryMap[yearStr])
      .sort((a, b) => b.year - a.year);

    const recentOutputs = outputsForDept
      .slice()
      .sort((a, b) => this._getOutputSortDate(b) - this._getOutputSortDate(a))
      .slice(0, 5)
      .map((o) => {
        const obj = {
          outputId: o.id,
          title: o.title,
          publicationYear: o.publicationYear,
          documentType: o.documentType,
          citationCount: typeof o.citationCount === 'number' ? o.citationCount : 0,
          downloadCount: typeof o.downloadCount === 'number' ? o.downloadCount : 0,
          isOpenAccess: o.isOpenAccess === true
        };
        obj.output = o; // foreign key resolution
        return obj;
      });

    const detail = {
      departmentId: dept.id,
      name: dept.name,
      code: dept.code || '',
      facultyName: faculty ? faculty.name : '',
      description: dept.description || '',
      homepageUrl: dept.homepageUrl || '',
      isActive: !!dept.isActive,
      isFollowed: isFollowed,
      publicationSummaryByYear: publicationSummaryByYear,
      recentOutputs: recentOutputs
    };

    // Foreign key resolution for department
    detail.department = dept;

    return detail;
  }

  // --------------------------
  // Interface: getDepartmentOutputs
  // --------------------------

  // getDepartmentOutputs(departmentId, filters, sortBy, sortDirection, page, pageSize)
  getDepartmentOutputs(
    departmentId,
    filters,
    sortBy,
    sortDirection,
    page,
    pageSize
  ) {
    const outputs = this._getOutputs();

    const f = filters || {};
    const sortField = sortBy || 'date';
    const sortDir = sortDirection === 'asc' ? 'asc' : 'desc';

    const filtered = outputs.filter((o) => {
      if (!Array.isArray(o.departmentIds) || !o.departmentIds.includes(departmentId)) {
        return false;
      }

      if (Array.isArray(f.documentTypes) && f.documentTypes.length > 0) {
        if (!f.documentTypes.includes(o.documentType)) return false;
      }

      if (typeof f.yearFrom === 'number' && o.publicationYear < f.yearFrom) {
        return false;
      }
      if (typeof f.yearTo === 'number' && o.publicationYear > f.yearTo) {
        return false;
      }

      if (f.openAccessOnly) {
        if (!(o.isOpenAccess === true || o.accessStatus === 'open_access')) {
          return false;
        }
      }

      return true;
    });

    const sorted = filtered.slice().sort((a, b) => {
      let cmp = 0;
      if (sortField === 'citations') {
        const cA = typeof a.citationCount === 'number' ? a.citationCount : 0;
        const cB = typeof b.citationCount === 'number' ? b.citationCount : 0;
        cmp = cA - cB;
      } else if (sortField === 'downloads') {
        const dA = typeof a.downloadCount === 'number' ? a.downloadCount : 0;
        const dB = typeof b.downloadCount === 'number' ? b.downloadCount : 0;
        cmp = dA - dB;
      } else {
        const tA = this._getOutputSortDate(a);
        const tB = this._getOutputSortDate(b);
        cmp = tA - tB;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    const settings = this._getUserSingletonSettings();
    const effectivePageSize =
      typeof pageSize === 'number' && pageSize > 0
        ? pageSize
        : (settings && settings.itemsPerPage) || 20;
    const effectivePage = typeof page === 'number' && page > 0 ? page : 1;
    const startIndex = (effectivePage - 1) * effectivePageSize;
    const pageItems = sorted.slice(startIndex, startIndex + effectivePageSize);

    const results = pageItems.map((o) => {
      const obj = {
        outputId: o.id,
        title: o.title,
        publicationYear: o.publicationYear,
        documentType: o.documentType,
        citationCount:
          typeof o.citationCount === 'number' ? o.citationCount : 0,
        downloadCount:
          typeof o.downloadCount === 'number' ? o.downloadCount : 0,
        isOpenAccess: !!o.isOpenAccess
      };
      obj.output = o; // foreign key resolution
      return obj;
    });

    return {
      results: results,
      totalResults: sorted.length,
      page: effectivePage,
      pageSize: effectivePageSize
    };
  }

  // --------------------------
  // Interface: followDepartment
  // --------------------------

  // followDepartment(departmentId)
  followDepartment(departmentId) {
    const departments = this._getDepartments();
    const dept = departments.find((d) => d.id === departmentId) || null;

    let followed = this._getFollowedDepartments();
    let existing = followed.find((f) => f.departmentId === departmentId);
    const now = this._now();

    if (!existing) {
      existing = {
        id: this._generateId('followed_department'),
        departmentId: departmentId,
        followedAt: now
      };
      followed.push(existing);
      this._saveToStorage('followed_departments', followed);
    }

    return {
      followedDepartmentId: existing.id,
      departmentId: existing.departmentId,
      departmentName: dept ? dept.name : '',
      followedAt: existing.followedAt,
      department: dept // foreign key resolution
    };
  }

  // --------------------------
  // Interface: unfollowDepartment
  // --------------------------

  // unfollowDepartment(departmentId)
  unfollowDepartment(departmentId) {
    let followed = this._getFollowedDepartments();
    const beforeLength = followed.length;
    followed = followed.filter((f) => f.departmentId !== departmentId);
    this._saveToStorage('followed_departments', followed);

    const success = followed.length !== beforeLength;
    return {
      success: success,
      message: success ? 'Department unfollowed' : 'Department was not followed'
    };
  }

  // --------------------------
  // Interface: getAuthorsList
  // --------------------------

  // getAuthorsList(query, initialLetter, departmentId)
  getAuthorsList(query, initialLetter, departmentId) {
    const authors = this._getAuthors();
    const departments = this._getDepartments();

    const q = this._normalizeString(query || '');
    const initial = (initialLetter || '').toString().toLowerCase();

    const deptMap = {};
    departments.forEach((d) => {
      deptMap[d.id] = d;
    });

    return authors
      .filter((a) => {
        if (q) {
          if (!this._normalizeString(a.fullName).includes(q)) return false;
        }

        if (initial) {
          const name = this._normalizeString(a.fullName);
          if (!name.startsWith(initial)) return false;
        }

        if (departmentId) {
          const authorDeptIds = Array.isArray(a.departmentIds) ? a.departmentIds : [];
          if (!authorDeptIds.includes(departmentId)) return false;
        }

        return true;
      })
      .map((a) => {
        const departmentNames = (Array.isArray(a.departmentIds) ? a.departmentIds : [])
          .map((id) => (deptMap[id] ? deptMap[id].name : null))
          .filter((name) => !!name);
        const obj = {
          authorId: a.id,
          fullName: a.fullName,
          departmentNames: departmentNames,
          totalOutputs: typeof a.totalOutputs === 'number' ? a.totalOutputs : 0,
          totalCitations:
            typeof a.totalCitations === 'number' ? a.totalCitations : 0
        };
        obj.author = a; // foreign key resolution
        return obj;
      });
  }

  // --------------------------
  // Interface: getAuthorDetail
  // --------------------------

  // getAuthorDetail(authorId)
  getAuthorDetail(authorId) {
    const authors = this._getAuthors();
    const departments = this._getDepartments();
    const faculties = this._getFaculties();

    const author = authors.find((a) => a.id === authorId);
    if (!author) return null;

    const deptMap = {};
    departments.forEach((d) => {
      deptMap[d.id] = d;
    });
    const facultyMap = {};
    faculties.forEach((f) => {
      facultyMap[f.id] = f;
    });

    const departmentNames = (Array.isArray(author.departmentIds)
      ? author.departmentIds
      : []
    )
      .map((id) => (deptMap[id] ? deptMap[id].name : null))
      .filter((name) => !!name);

    const facultyNames = (Array.isArray(author.facultyIds)
      ? author.facultyIds
      : []
    )
      .map((id) => (facultyMap[id] ? facultyMap[id].name : null))
      .filter((name) => !!name);

    const detail = {
      authorId: author.id,
      fullName: author.fullName,
      firstName: author.firstName || '',
      lastName: author.lastName || '',
      orcid: author.orcid || '',
      departmentNames: departmentNames,
      facultyNames: facultyNames,
      totalOutputs:
        typeof author.totalOutputs === 'number' ? author.totalOutputs : 0,
      totalCitations:
        typeof author.totalCitations === 'number' ? author.totalCitations : 0,
      profileUrl: author.profileUrl || ''
    };

    detail.author = author; // foreign key resolution

    return detail;
  }

  // --------------------------
  // Interface: getAuthorOutputs
  // --------------------------

  // getAuthorOutputs(authorId, filters, sortBy, sortDirection, page, pageSize)
  getAuthorOutputs(
    authorId,
    filters,
    sortBy,
    sortDirection,
    page,
    pageSize
  ) {
    const outputs = this._getOutputs();
    const authors = this._getAuthors();
    const authorMap = {};
    authors.forEach((a) => {
      authorMap[a.id] = a;
    });

    const f = filters || {};
    const sortField = sortBy || 'date';
    const sortDir = sortDirection === 'asc' ? 'asc' : 'desc';

    const filtered = outputs.filter((o) => {
      const authorIds = Array.isArray(o.authorIds) ? o.authorIds : [];
      if (!authorIds.includes(authorId)) return false;

      if (Array.isArray(f.documentTypes) && f.documentTypes.length > 0) {
        if (!f.documentTypes.includes(o.documentType)) return false;
      }

      if (f.departmentId) {
        const deptIds = Array.isArray(o.departmentIds) ? o.departmentIds : [];
        if (!deptIds.includes(f.departmentId)) return false;
      }

      if (f.coAuthorId) {
        if (!authorIds.includes(f.coAuthorId)) return false;
      }

      return true;
    });

    const sorted = filtered.slice().sort((a, b) => {
      let cmp = 0;
      if (sortField === 'citations') {
        const cA = typeof a.citationCount === 'number' ? a.citationCount : 0;
        const cB = typeof b.citationCount === 'number' ? b.citationCount : 0;
        cmp = cA - cB;
      } else if (sortField === 'downloads') {
        const dA = typeof a.downloadCount === 'number' ? a.downloadCount : 0;
        const dB = typeof b.downloadCount === 'number' ? b.downloadCount : 0;
        cmp = dA - dB;
      } else {
        const tA = this._getOutputSortDate(a);
        const tB = this._getOutputSortDate(b);
        cmp = tA - tB;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    const settings = this._getUserSingletonSettings();
    const effectivePageSize =
      typeof pageSize === 'number' && pageSize > 0
        ? pageSize
        : (settings && settings.itemsPerPage) || 20;
    const effectivePage = typeof page === 'number' && page > 0 ? page : 1;
    const startIndex = (effectivePage - 1) * effectivePageSize;
    const pageItems = sorted.slice(startIndex, startIndex + effectivePageSize);

    const results = pageItems.map((o) => {
      const coAuthorIds = (Array.isArray(o.authorIds) ? o.authorIds : []).filter(
        (id) => id !== authorId
      );
      const coAuthorNames = coAuthorIds
        .map((id) => (authorMap[id] ? authorMap[id].fullName : null))
        .filter((name) => !!name);

      const obj = {
        outputId: o.id,
        title: o.title,
        publicationYear: o.publicationYear,
        documentType: o.documentType,
        citationCount:
          typeof o.citationCount === 'number' ? o.citationCount : 0,
        downloadCount:
          typeof o.downloadCount === 'number' ? o.downloadCount : 0,
        coAuthorNames: coAuthorNames
      };
      obj.output = o; // foreign key resolution
      return obj;
    });

    return {
      results: results,
      totalResults: sorted.length,
      page: effectivePage,
      pageSize: effectivePageSize
    };
  }

  // --------------------------
  // Interface: getCoauthorSuggestions
  // --------------------------

  // getCoauthorSuggestions(authorId, query, limit)
  getCoauthorSuggestions(authorId, query, limit) {
    const outputs = this._getOutputs();
    const authors = this._getAuthors();
    const authorMap = {};
    authors.forEach((a) => {
      authorMap[a.id] = a;
    });

    const q = this._normalizeString(query || '');
    const max = typeof limit === 'number' && limit > 0 ? limit : 10;

    const coauthorCounts = {};

    outputs.forEach((o) => {
      const authorIds = Array.isArray(o.authorIds) ? o.authorIds : [];
      if (!authorIds.includes(authorId)) return;
      authorIds.forEach((aid) => {
        if (aid === authorId) return;
        coauthorCounts[aid] = (coauthorCounts[aid] || 0) + 1;
      });
    });

    const coauthorIds = Object.keys(coauthorCounts);

    const suggestions = coauthorIds
      .map((aid) => {
        const a = authorMap[aid];
        return {
          authorId: aid,
          fullName: a ? a.fullName : '',
          coauthoredOutputCount: coauthorCounts[aid],
          author: a // foreign key resolution
        };
      })
      .filter((s) => {
        if (!q) return true;
        return this._normalizeString(s.fullName).includes(q);
      })
      .sort((a, b) => b.coauthoredOutputCount - a.coauthoredOutputCount)
      .slice(0, max);

    return suggestions;
  }

  // --------------------------
  // Interface: getProfileOverview
  // --------------------------

  getProfileOverview() {
    const followed = this._getFollowedDepartments();
    const alerts = this._getAlerts();
    const notes = this._getPrivateNotes();
    const outputs = this._getOutputs();
    const departments = this._getDepartments();
    const faculties = this._getFaculties();
    const settings = this._getUserSingletonSettings();

    const deptMap = {};
    departments.forEach((d) => {
      deptMap[d.id] = d;
    });
    const facultyMap = {};
    faculties.forEach((f) => {
      facultyMap[f.id] = f;
    });
    const outputMap = {};
    outputs.forEach((o) => {
      outputMap[o.id] = o;
    });

    const followedDepartments = followed.map((f) => {
      const dept = deptMap[f.departmentId] || null;
      const faculty = dept && dept.facultyId ? facultyMap[dept.facultyId] : null;
      const obj = {
        departmentId: f.departmentId,
        departmentName: dept ? dept.name : '',
        facultyName: faculty ? faculty.name : '',
        followedAt: f.followedAt
      };
      obj.department = dept; // foreign key resolution
      return obj;
    });

    const alertsArr = alerts.map((a) => {
      const dept = deptMap[a.departmentId] || null;
      const obj = {
        alertId: a.id,
        name: a.name || '',
        departmentId: a.departmentId,
        departmentName: dept ? dept.name : '',
        keyword: a.keyword,
        searchScope: a.searchScope,
        frequency: a.frequency,
        deliveryMethod: a.deliveryMethod,
        status: a.status
      };
      obj.department = dept; // foreign key resolution
      return obj;
    });

    const recentAnnotated = notes
      .slice()
      .sort((a, b) => {
        const tA = Date.parse(a.updatedAt || a.createdAt || 0) || 0;
        const tB = Date.parse(b.updatedAt || b.createdAt || 0) || 0;
        return tB - tA;
      })
      .slice(0, 10)
      .map((n) => {
        const o = outputMap[n.outputId] || null;
        const preview = (n.text || '').substring(0, 200);
        const obj = {
          outputId: n.outputId,
          title: o ? o.title : '',
          notePreview: preview,
          noteUpdatedAt: n.updatedAt || n.createdAt
        };
        obj.output = o; // foreign key resolution
        return obj;
      });

    return {
      followedDepartments: followedDepartments,
      alerts: alertsArr,
      recentAnnotatedOutputs: recentAnnotated,
      settings: {
        defaultCitationStyle: settings.defaultCitationStyle,
        itemsPerPage: settings.itemsPerPage,
        theme: settings.theme
      }
    };
  }

  // --------------------------
  // Interface: getUserSettings
  // --------------------------

  getUserSettings() {
    const settings = this._getUserSingletonSettings();
    return {
      defaultCitationStyle: settings.defaultCitationStyle,
      itemsPerPage: settings.itemsPerPage,
      theme: settings.theme
    };
  }

  // --------------------------
  // Interface: updateUserSettings
  // --------------------------

  // updateUserSettings(defaultCitationStyle, itemsPerPage, theme)
  updateUserSettings(defaultCitationStyle, itemsPerPage, theme) {
    let settings = this._getUserSingletonSettings();
    const now = this._now();

    if (typeof defaultCitationStyle === 'string') {
      settings.defaultCitationStyle = defaultCitationStyle;
    }
    if (typeof itemsPerPage === 'number' && itemsPerPage > 0) {
      settings.itemsPerPage = itemsPerPage;
    }
    if (typeof theme === 'string') {
      settings.theme = theme;
    }

    settings.updatedAt = now;
    this._saveToStorage('settings', settings);

    return {
      defaultCitationStyle: settings.defaultCitationStyle,
      itemsPerPage: settings.itemsPerPage,
      theme: settings.theme
    };
  }

  // --------------------------
  // Interface: createAlert
  // --------------------------

  // createAlert(departmentId, keyword, searchScope, frequency, deliveryMethod, name)
  createAlert(departmentId, keyword, searchScope, frequency, deliveryMethod, name) {
    const alerts = this._getAlerts();
    const departments = this._getDepartments();

    const dept = departments.find((d) => d.id === departmentId) || null;

    const now = this._now();
    const newAlert = {
      id: this._generateId('alert'),
      name: name || '',
      departmentId: departmentId,
      keyword: keyword,
      searchScope: searchScope,
      frequency: frequency,
      deliveryMethod: deliveryMethod,
      status: 'active',
      createdAt: now,
      updatedAt: now
    };

    alerts.push(newAlert);
    this._saveToStorage('alerts', alerts);

    const result = {
      alertId: newAlert.id,
      name: newAlert.name,
      departmentId: newAlert.departmentId,
      keyword: newAlert.keyword,
      searchScope: newAlert.searchScope,
      frequency: newAlert.frequency,
      deliveryMethod: newAlert.deliveryMethod,
      status: newAlert.status,
      createdAt: newAlert.createdAt
    };

    result.department = dept; // foreign key resolution

    return result;
  }

  // --------------------------
  // Interface: updateAlert
  // --------------------------

  // updateAlert(alertId, name, keyword, searchScope, frequency, deliveryMethod, status)
  updateAlert(alertId, name, keyword, searchScope, frequency, deliveryMethod, status) {
    const alerts = this._getAlerts();
    const departments = this._getDepartments();

    const alert = alerts.find((a) => a.id === alertId);
    if (!alert) return null;

    if (typeof name === 'string') alert.name = name;
    if (typeof keyword === 'string') alert.keyword = keyword;
    if (typeof searchScope === 'string') alert.searchScope = searchScope;
    if (typeof frequency === 'string') alert.frequency = frequency;
    if (typeof deliveryMethod === 'string') alert.deliveryMethod = deliveryMethod;
    if (typeof status === 'string') alert.status = status;
    alert.updatedAt = this._now();

    this._saveToStorage('alerts', alerts);

    const dept = departments.find((d) => d.id === alert.departmentId) || null;

    const result = {
      alertId: alert.id,
      name: alert.name || '',
      departmentId: alert.departmentId,
      keyword: alert.keyword,
      searchScope: alert.searchScope,
      frequency: alert.frequency,
      deliveryMethod: alert.deliveryMethod,
      status: alert.status,
      updatedAt: alert.updatedAt
    };

    result.department = dept; // foreign key resolution

    return result;
  }

  // --------------------------
  // Interface: deleteAlert
  // --------------------------

  // deleteAlert(alertId)
  deleteAlert(alertId) {
    let alerts = this._getAlerts();
    const beforeLength = alerts.length;
    alerts = alerts.filter((a) => a.id !== alertId);
    this._saveToStorage('alerts', alerts);

    const success = alerts.length !== beforeLength;
    return {
      success: success,
      message: success ? 'Alert deleted' : 'Alert not found'
    };
  }

  // --------------------------
  // Interface: getInformationalPageContent
  // --------------------------

  // getInformationalPageContent(pageKey)
  getInformationalPageContent(pageKey) {
    const pages = this._getInformationalPages();
    const data = pages[pageKey] || null;

    if (data) {
      return {
        title: data.title || '',
        sections: Array.isArray(data.sections) ? data.sections : [],
        lastUpdated: data.lastUpdated || null
      };
    }

    // No stored content: return minimal structure derived from key
    const title = pageKey
      ? pageKey.charAt(0).toUpperCase() + pageKey.slice(1)
      : '';

    return {
      title: title,
      sections: [],
      lastUpdated: null
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