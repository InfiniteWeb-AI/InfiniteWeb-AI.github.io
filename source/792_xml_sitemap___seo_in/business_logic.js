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
    this._seoUrlStorageKey = 'seo_urls';
    this._sitemapFileStorageKey = 'sitemap_files';
    this._duplicateUrlStorageKey = 'duplicate_urls';
    this._seoAuditItemStorageKey = 'seo_audit_items';
    this._titleFixItemStorageKey = 'title_fix_items';
    this._seoToolOverviewKey = 'seo_tool_overview';
    this._helpContentKey = 'help_content';

    this._initStorage();
    this.idCounter = this._getNextIdCounter();
  }

  // ----------------------
  // Storage helpers
  // ----------------------
  _initStorage() {
    // Core data tables
    if (!localStorage.getItem(this._seoUrlStorageKey)) {
      localStorage.setItem(this._seoUrlStorageKey, JSON.stringify([]));
    }
    if (!localStorage.getItem(this._sitemapFileStorageKey)) {
      localStorage.setItem(this._sitemapFileStorageKey, JSON.stringify([]));
    }
    if (!localStorage.getItem(this._duplicateUrlStorageKey)) {
      localStorage.setItem(this._duplicateUrlStorageKey, JSON.stringify([]));
    }
    if (!localStorage.getItem(this._seoAuditItemStorageKey)) {
      localStorage.setItem(this._seoAuditItemStorageKey, JSON.stringify([]));
    }
    if (!localStorage.getItem(this._titleFixItemStorageKey)) {
      localStorage.setItem(this._titleFixItemStorageKey, JSON.stringify([]));
    }
    // Config / content tables
    if (!localStorage.getItem(this._seoToolOverviewKey)) {
      const defaultOverview = {
        headline: 'SEO Tools Overview',
        intro: 'Explore and manage your URLs via the SEO Index, XML Sitemap URLs, and Sitemap Index views.',
        sections: []
      };
      localStorage.setItem(this._seoToolOverviewKey, JSON.stringify(defaultOverview));
    }
    if (!localStorage.getItem(this._helpContentKey)) {
      const defaultHelp = {
        sections: [],
        workflows: [],
        quickLinks: []
      };
      localStorage.setItem(this._helpContentKey, JSON.stringify(defaultHelp));
    }
    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, fallback) {
    const data = localStorage.getItem(key);
    if (!data) {
      return fallback !== undefined ? fallback : [];
    }
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

  _parseDate(value) {
    if (!value) return null;
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }

  _compareValues(a, b, direction) {
    const dir = direction === 'asc' ? 1 : -1;
    if (a == null && b == null) return 0;
    if (a == null) return 1 * dir;
    if (b == null) return -1 * dir;

    const aNum =
      typeof a === 'number' ||
      (typeof a === 'string' && a.trim() !== '' && !isNaN(Number(a)))
        ? Number(a)
        : null;
    const bNum =
      typeof b === 'number' ||
      (typeof b === 'string' && b.trim() !== '' && !isNaN(Number(b)))
        ? Number(b)
        : null;

    if (aNum !== null && bNum !== null) {
      if (aNum === bNum) return 0;
      return aNum < bNum ? -1 * dir : 1 * dir;
    }

    const aStr = String(a);
    const bStr = String(b);
    const cmp = aStr.localeCompare(bStr);
    return cmp * dir;
  }

  // ----------------------
  // Private helpers (required by spec)
  // ----------------------

  // Apply SEO Index filters and sorting to SeoUrl records
  _applySeoUrlFiltersAndSorting(urls, filters, sort) {
    let result = Array.isArray(urls) ? urls.slice() : [];
    const f = filters || {};

    if (f.contentType) {
      result = result.filter(u => u.contentType === f.contentType);
    }
    if (f.pathPrefix) {
      result = result.filter(
        u => typeof u.path === 'string' && u.path.indexOf(f.pathPrefix) === 0
      );
    }
    if (f.searchQuery) {
      const q = String(f.searchQuery).toLowerCase();
      result = result.filter(u => {
        const urlStr = (u.url || '').toLowerCase();
        const pathStr = (u.path || '').toLowerCase();
        const titleStr = (u.title || '').toLowerCase();
        return urlStr.includes(q) || pathStr.includes(q) || titleStr.includes(q);
      });
    }
    if (f.lastModifiedFrom) {
      const from = this._parseDate(f.lastModifiedFrom);
      if (from) {
        result = result.filter(u => {
          const lm = this._parseDate(u.lastModified);
          return lm && lm >= from;
        });
      }
    }
    if (f.lastModifiedTo) {
      const to = this._parseDate(f.lastModifiedTo);
      if (to) {
        result = result.filter(u => {
          const lm = this._parseDate(u.lastModified);
          return lm && lm <= to;
        });
      }
    }
    if (typeof f.priorityMin === 'number') {
      result = result.filter(
        u => typeof u.priority === 'number' && u.priority >= f.priorityMin
      );
    }
    if (typeof f.priorityMax === 'number') {
      result = result.filter(
        u => typeof u.priority === 'number' && u.priority <= f.priorityMax
      );
    }
    if (f.changefreq) {
      result = result.filter(u => u.changefreq === f.changefreq);
    }
    if (f.indexStatus) {
      result = result.filter(u => u.indexStatus === f.indexStatus);
    }
    if (typeof f.duplicateCountMin === 'number') {
      result = result.filter(
        u =>
          typeof u.duplicateCount === 'number' &&
          u.duplicateCount >= f.duplicateCountMin
      );
    }
    if (typeof f.urlDepthMin === 'number') {
      result = result.filter(
        u => typeof u.urlDepth === 'number' && u.urlDepth >= f.urlDepthMin
      );
    }
    if (typeof f.urlDepthMax === 'number') {
      result = result.filter(
        u => typeof u.urlDepth === 'number' && u.urlDepth <= f.urlDepthMax
      );
    }
    if (typeof f.titleLengthMin === 'number') {
      result = result.filter(
        u =>
          typeof u.titleLength === 'number' &&
          u.titleLength >= f.titleLengthMin
      );
    }
    if (typeof f.titleLengthMax === 'number') {
      result = result.filter(
        u =>
          typeof u.titleLength === 'number' &&
          u.titleLength <= f.titleLengthMax
      );
    }
    if (typeof f.hasMetaDescription === 'boolean') {
      result = result.filter(
        u => !!u.hasMetaDescription === f.hasMetaDescription
      );
    }
    if (f.canonicalType) {
      result = result.filter(u => u.canonicalType === f.canonicalType);
    }

    if (sort && sort.field) {
      const field = sort.field;
      const direction = sort.direction === 'asc' ? 'asc' : 'desc';
      result.sort((a, b) => {
        let aVal;
        let bVal;
        switch (field) {
          case 'last_modified':
            aVal = this._parseDate(a.lastModified);
            bVal = this._parseDate(b.lastModified);
            break;
          case 'priority':
            aVal = a.priority;
            bVal = b.priority;
            break;
          case 'duplicate_count':
            aVal = a.duplicateCount;
            bVal = b.duplicateCount;
            break;
          case 'title_length':
            aVal = a.titleLength;
            bVal = b.titleLength;
            break;
          case 'url_depth':
            aVal = a.urlDepth;
            bVal = b.urlDepth;
            break;
          case 'organic_traffic':
            aVal = a.organicTraffic;
            bVal = b.organicTraffic;
            break;
          case 'url':
            aVal = a.url;
            bVal = b.url;
            break;
          default:
            aVal = a.url;
            bVal = b.url;
        }
        return this._compareValues(aVal, bVal, direction);
      });
    }

    return result;
  }

  // Apply XML Sitemap URL filters and sorting to SeoUrl records
  _applySitemapUrlFiltersAndSorting(urls, filters, sort) {
    let result = Array.isArray(urls) ? urls.slice() : [];
    const f = filters || {};

    if (f.sitemapFileId) {
      result = result.filter(u => u.sitemapFileId === f.sitemapFileId);
    }
    if (f.contentType) {
      result = result.filter(u => u.contentType === f.contentType);
    }
    if (typeof f.priorityMin === 'number') {
      result = result.filter(
        u => typeof u.priority === 'number' && u.priority >= f.priorityMin
      );
    }
    if (typeof f.priorityMax === 'number') {
      result = result.filter(
        u => typeof u.priority === 'number' && u.priority <= f.priorityMax
      );
    }
    if (f.changefreq) {
      result = result.filter(u => u.changefreq === f.changefreq);
    }

    let lastFrom = f.lastModifiedFrom
      ? this._parseDate(f.lastModifiedFrom)
      : null;
    let lastTo = f.lastModifiedTo ? this._parseDate(f.lastModifiedTo) : null;

    // Handle lastModifiedPreset in a data-relative way so behavior is stable
    if (f.lastModifiedPreset && (!lastFrom || !lastTo)) {
      const preset = f.lastModifiedPreset;
      let days = null;
      if (preset === 'last_1_day') days = 1;
      else if (preset === 'last_7_days') days = 7;
      else if (preset === 'last_30_days') days = 30;

      if (days !== null) {
        // Use the most recent lastModified date among the (already filtered) URLs
        let maxDate = null;
        for (const u of result) {
          const lm = this._parseDate(u.lastModified);
          if (lm && (!maxDate || lm > maxDate)) {
            maxDate = lm;
          }
        }

        const referenceTo = lastTo || maxDate;
        if (referenceTo) {
          const from = new Date(
            referenceTo.getTime() - days * 24 * 60 * 60 * 1000
          );
          if (!lastFrom) lastFrom = from;
          if (!lastTo) lastTo = referenceTo;
        }
      }
    }

    if (lastFrom) {
      result = result.filter(u => {
        const lm = this._parseDate(u.lastModified);
        return lm && lm >= lastFrom;
      });
    }
    if (lastTo) {
      result = result.filter(u => {
        const lm = this._parseDate(u.lastModified);
        return lm && lm <= lastTo;
      });
    }

    if (sort && sort.field) {
      const field = sort.field;
      const direction = sort.direction === 'asc' ? 'asc' : 'desc';
      result.sort((a, b) => {
        let aVal;
        let bVal;
        switch (field) {
          case 'last_modified':
            aVal = this._parseDate(a.lastModified);
            bVal = this._parseDate(b.lastModified);
            break;
          case 'priority':
            aVal = a.priority;
            bVal = b.priority;
            break;
          case 'url':
            aVal = a.url;
            bVal = b.url;
            break;
          default:
            aVal = a.url;
            bVal = b.url;
        }
        return this._compareValues(aVal, bVal, direction);
      });
    }

    return result;
  }

  // Internal helper to copy a list of string URLs to the system clipboard or simulated clipboard
  _copyToClipboard(urls) {
    if (!Array.isArray(urls)) return false;
    const text = urls.join('\n');
    try {
      if (
        typeof navigator !== 'undefined' &&
        navigator.clipboard &&
        typeof navigator.clipboard.writeText === 'function'
      ) {
        // Fire-and-forget; cannot guarantee sync completion
        navigator.clipboard.writeText(text).catch(() => {
          try {
            localStorage.setItem('clipboard', text);
          } catch (e2) {}
        });
      } else {
        // Fallback: store in localStorage as simulated clipboard
        localStorage.setItem('clipboard', text);
      }
      return true;
    } catch (e) {
      try {
        localStorage.setItem('clipboard', text);
      } catch (e2) {}
      return false;
    }
  }

  // Create SeoAuditItem records from SeoUrl IDs
  _createSeoAuditItems(seoUrlIds, issueSummary) {
    const ids = Array.isArray(seoUrlIds) ? seoUrlIds : [];
    if (!ids.length) return [];

    const seoUrls = this._getFromStorage(this._seoUrlStorageKey, []);
    const seoUrlMap = new Map(seoUrls.map(u => [u.id, u]));

    const auditItems = this._getFromStorage(this._seoAuditItemStorageKey, []);
    const existingBySeoUrlId = new Map(auditItems.map(i => [i.seoUrlId, i]));
    const created = [];
    const now = new Date().toISOString();

    ids.forEach(id => {
      if (!seoUrlMap.has(id)) return;
      if (existingBySeoUrlId.has(id)) return; // avoid duplicates
      const item = {
        id: this._generateId('seo_audit'),
        seoUrlId: id,
        addedAt: now,
        issueSummary: issueSummary || '',
        resolved: false,
        resolvedAt: null
      };
      auditItems.push(item);
      created.push(item);
    });

    this._saveToStorage(this._seoAuditItemStorageKey, auditItems);
    return created;
  }

  // Create TitleFixItem records from SeoUrl IDs
  _createTitleFixItems(seoUrlIds) {
    const ids = Array.isArray(seoUrlIds) ? seoUrlIds : [];
    if (!ids.length) return [];

    const seoUrls = this._getFromStorage(this._seoUrlStorageKey, []);
    const seoUrlMap = new Map(seoUrls.map(u => [u.id, u]));

    const titleFixItems = this._getFromStorage(this._titleFixItemStorageKey, []);
    const existingBySeoUrlId = new Map(titleFixItems.map(i => [i.seoUrlId, i]));
    const created = [];
    const now = new Date().toISOString();

    ids.forEach(id => {
      const url = seoUrlMap.get(id);
      if (!url) return;
      if (existingBySeoUrlId.has(id)) return; // avoid duplicates
      const item = {
        id: this._generateId('title_fix'),
        seoUrlId: id,
        addedAt: now,
        currentTitle: url.title || '',
        titleLength:
          typeof url.titleLength === 'number'
            ? url.titleLength
            : url.title
            ? url.title.length
            : 0,
        contentType: url.contentType,
        resolved: false,
        resolvedAt: null,
        notes: ''
      };
      titleFixItems.push(item);
      created.push(item);
    });

    this._saveToStorage(this._titleFixItemStorageKey, titleFixItems);
    return created;
  }

  // Update indexAsap flag on SeoUrl records
  _updateSeoUrlIndexAsapFlag(seoUrlIds, indexAsap) {
    const ids = new Set(Array.isArray(seoUrlIds) ? seoUrlIds : []);
    if (!ids.size) {
      return { urls: [], updatedCount: 0 };
    }
    const seoUrls = this._getFromStorage(this._seoUrlStorageKey, []);
    let updatedCount = 0;
    seoUrls.forEach(u => {
      if (ids.has(u.id)) {
        if (u.indexAsap !== indexAsap) {
          u.indexAsap = indexAsap;
          updatedCount += 1;
        }
      }
    });
    this._saveToStorage(this._seoUrlStorageKey, seoUrls);
    return { urls: seoUrls, updatedCount };
  }

  // Update metadata fields on a SeoUrl record and related derived fields
  _updateSeoMetadata(seoUrlId, updates) {
    const seoUrls = this._getFromStorage(this._seoUrlStorageKey, []);
    const idx = seoUrls.findIndex(u => u.id === seoUrlId);
    if (idx === -1) {
      return null;
    }
    const url = seoUrls[idx];

    if (Object.prototype.hasOwnProperty.call(updates, 'metaTitle')) {
      url.metaTitle = updates.metaTitle;
    }
    if (Object.prototype.hasOwnProperty.call(updates, 'metaDescription')) {
      url.metaDescription = updates.metaDescription;
      const has =
        !!(updates.metaDescription &&
        String(updates.metaDescription).trim().length > 0);
      url.hasMetaDescription = has;
    }
    if (Object.prototype.hasOwnProperty.call(updates, 'metaRobots')) {
      url.metaRobots = updates.metaRobots;
    }
    if (Object.prototype.hasOwnProperty.call(updates, 'canonicalUrl')) {
      url.canonicalUrl = updates.canonicalUrl;
      const selfUrl = url.url || '';
      if (!updates.canonicalUrl) {
        url.canonicalType = 'none';
      } else if (updates.canonicalUrl === selfUrl) {
        url.canonicalType = 'canonical';
      } else {
        url.canonicalType = 'duplicate';
      }
    }

    url.updatedAt = new Date().toISOString();
    seoUrls[idx] = url;
    this._saveToStorage(this._seoUrlStorageKey, seoUrls);
    return url;
  }

  // Load and cache SitemapFile records for the Sitemap Index
  _loadSitemapFiles() {
    if (!this._sitemapFilesCache) {
      this._sitemapFilesCache = this._getFromStorage(
        this._sitemapFileStorageKey,
        []
      );
    } else {
      // Always refresh from storage to reflect external changes
      this._sitemapFilesCache = this._getFromStorage(
        this._sitemapFileStorageKey,
        []
      );
    }
    return this._sitemapFilesCache.slice();
  }

  // Helpers for Audit / TitleFix filtering
  _filterSeoAuditItems(auditItems, seoUrls, filters) {
    const f = filters || {};
    const seoUrlMap = new Map(seoUrls.map(u => [u.id, u]));
    const result = [];

    const from = f.dateAddedFrom ? this._parseDate(f.dateAddedFrom) : null;
    const to = f.dateAddedTo ? this._parseDate(f.dateAddedTo) : null;
    const query = f.issueSummaryQuery
      ? String(f.issueSummaryQuery).toLowerCase()
      : null;

    auditItems.forEach(item => {
      const seoUrl = seoUrlMap.get(item.seoUrlId) || null;

      if (typeof f.resolved === 'boolean' && item.resolved !== f.resolved) {
        return;
      }
      if (from) {
        const added = this._parseDate(item.addedAt);
        if (!added || added < from) return;
      }
      if (to) {
        const added = this._parseDate(item.addedAt);
        if (!added || added > to) return;
      }
      if (query) {
        const summary = (item.issueSummary || '').toLowerCase();
        if (!summary.includes(query)) return;
      }
      if (f.contentType) {
        if (!seoUrl || seoUrl.contentType !== f.contentType) return;
      }

      result.push({ auditItem: item, seoUrl });
    });

    return result;
  }

  _filterTitleFixItems(titleFixItems, seoUrls, filters) {
    const f = filters || {};
    const seoUrlMap = new Map(seoUrls.map(u => [u.id, u]));
    const result = [];

    const from = f.dateAddedFrom ? this._parseDate(f.dateAddedFrom) : null;
    const to = f.dateAddedTo ? this._parseDate(f.dateAddedTo) : null;

    titleFixItems.forEach(item => {
      const seoUrl = seoUrlMap.get(item.seoUrlId) || null;

      if (typeof f.resolved === 'boolean' && item.resolved !== f.resolved) {
        return;
      }
      if (
        typeof f.titleLengthMin === 'number' &&
        item.titleLength < f.titleLengthMin
      ) {
        return;
      }
      if (
        typeof f.titleLengthMax === 'number' &&
        item.titleLength > f.titleLengthMax
      ) {
        return;
      }
      if (from) {
        const added = this._parseDate(item.addedAt);
        if (!added || added < from) return;
      }
      if (to) {
        const added = this._parseDate(item.addedAt);
        if (!added || added > to) return;
      }
      if (f.contentType) {
        if (!item.contentType || item.contentType !== f.contentType) return;
      }

      result.push({ titleFixItem: item, seoUrl });
    });

    return result;
  }

  // ----------------------
  // Core interface implementations
  // ----------------------

  // getSeoToolOverview()
  getSeoToolOverview() {
    const overview = this._getFromStorage(this._seoToolOverviewKey, null);
    if (!overview || typeof overview !== 'object') {
      const fallback = {
        headline: 'SEO Tools Overview',
        intro:
          'Explore and manage your URLs via the SEO Index, XML Sitemap URLs, and Sitemap Index views.',
        sections: []
      };
      this._saveToStorage(this._seoToolOverviewKey, fallback);
      return fallback;
    }
    return overview;
  }

  // getSeoIndexFilterOptions()
  getSeoIndexFilterOptions() {
    const contentTypes = [
      { value: 'blog_post', label: 'Blog Post' },
      { value: 'product', label: 'Product' },
      { value: 'faq', label: 'FAQ' },
      { value: 'category', label: 'Category' },
      { value: 'home', label: 'Home' },
      { value: 'help', label: 'Help' },
      { value: 'other', label: 'Other' }
    ];

    const changefreqOptions = [
      { value: 'always', label: 'Always' },
      { value: 'hourly', label: 'Hourly' },
      { value: 'daily', label: 'Daily' },
      { value: 'weekly', label: 'Weekly' },
      { value: 'monthly', label: 'Monthly' },
      { value: 'yearly', label: 'Yearly' },
      { value: 'never', label: 'Never' },
      { value: 'unknown', label: 'Unknown' }
    ];

    const indexStatusOptions = [
      { value: 'indexed', label: 'Indexed' },
      { value: 'not_indexed', label: 'Not Indexed' },
      { value: 'excluded', label: 'Excluded' },
      { value: 'unknown', label: 'Unknown' }
    ];

    const canonicalTypeOptions = [
      { value: 'canonical', label: 'Canonical' },
      { value: 'duplicate', label: 'Duplicate' },
      { value: 'none', label: 'None' },
      { value: 'unknown', label: 'Unknown' }
    ];

    const lastModifiedPresets = [
      { value: 'last_1_day', label: 'Last 1 day' },
      { value: 'last_7_days', label: 'Last 7 days' },
      { value: 'last_30_days', label: 'Last 30 days' }
    ];

    const priorityPresets = [
      { min: 0.0, max: 1.0, label: 'Any' },
      { min: 0.5, max: 1.0, label: '0.5 - 1.0' },
      { min: 0.7, max: 1.0, label: '0.7 - 1.0' }
    ];

    const titleLengthPresets = [
      { min: 0, max: 60, label: '0 - 60 characters' },
      { min: 61, max: 120, label: 'Over 60 characters' }
    ];

    const urlDepthPresets = [
      { min: 0, max: 1, label: 'Depth 0-1' },
      { min: 0, max: 2, label: 'Depth 0-2' },
      { min: 3, max: 99, label: 'Depth 3+' }
    ];

    const sortableFields = [
      'last_modified',
      'priority',
      'duplicate_count',
      'title_length',
      'url_depth',
      'organic_traffic',
      'url'
    ];

    return {
      contentTypes,
      changefreqOptions,
      indexStatusOptions,
      canonicalTypeOptions,
      lastModifiedPresets,
      priorityPresets,
      titleLengthPresets,
      urlDepthPresets,
      sortableFields
    };
  }

  // getSeoIndexUrls(filters, sort, page, pageSize)
  getSeoIndexUrls(filters, sort, page, pageSize) {
    const allUrls = this._getFromStorage(this._seoUrlStorageKey, []);
    const filteredSorted = this._applySeoUrlFiltersAndSorting(
      allUrls,
      filters || {},
      sort || null
    );

    const currentPage = typeof page === 'number' && page > 0 ? page : 1;
    const currentPageSize =
      typeof pageSize === 'number' && pageSize > 0 ? pageSize : 50;
    const totalCount = filteredSorted.length;
    const start = (currentPage - 1) * currentPageSize;
    const end = start + currentPageSize;
    const pageItems = filteredSorted.slice(start, end);

    // Instrumentation for task completion tracking
    try {
      if (
        filters &&
        typeof filters.urlDepthMax === 'number' &&
        filters.urlDepthMax === 2 &&
        typeof filters.hasMetaDescription === 'boolean' &&
        filters.hasMetaDescription === false &&
        currentPage === 1
      ) {
        const instrumentationValue = {
          filtersUsed: filters || {},
          sortUsed: sort || null,
          page: currentPage,
          pageSize: currentPageSize,
          firstItemSeoUrlId: pageItems[0] ? pageItems[0].id : null
        };
        localStorage.setItem(
          'task8_shallowMissingMetaList',
          JSON.stringify(instrumentationValue)
        );
      }
    } catch (e) {
      console.error('Instrumentation error (task8_shallowMissingMetaList):', e);
    }

    // Foreign key resolution: sitemapFileId -> sitemapFile
    const sitemapFiles = this._loadSitemapFiles();
    const sitemapMap = new Map(sitemapFiles.map(s => [s.id, s]));
    const itemsWithRelations = pageItems.map(u => ({
      ...u,
      sitemapFile: u.sitemapFileId
        ? sitemapMap.get(u.sitemapFileId) || null
        : null
    }));

    return {
      items: itemsWithRelations,
      totalCount,
      page: currentPage,
      pageSize: currentPageSize,
      hasNextPage: end < totalCount,
      hasPreviousPage: start > 0
    };
  }

  // addUrlsToSeoAuditList(seoUrlIds, issueSummary)
  addUrlsToSeoAuditList(seoUrlIds, issueSummary) {
    const createdItems = this._createSeoAuditItems(seoUrlIds, issueSummary);
    const success = createdItems.length > 0;
    return {
      success,
      createdItems,
      message: success
        ? 'SEO audit items created.'
        : 'No SEO audit items were created.'
    };
  }

  // markUrlsIndexAsap(seoUrlIds)
  markUrlsIndexAsap(seoUrlIds) {
    const { updatedCount } = this._updateSeoUrlIndexAsapFlag(seoUrlIds, true);
    return {
      success: updatedCount > 0,
      updatedCount,
      message:
        updatedCount > 0
          ? 'URLs marked as Index ASAP.'
          : 'No URLs were updated.'
    };
  }

  // addUrlsToTitleFixList(seoUrlIds)
  addUrlsToTitleFixList(seoUrlIds) {
    const createdItems = this._createTitleFixItems(seoUrlIds);
    const success = createdItems.length > 0;
    return {
      success,
      createdItems,
      message: success
        ? 'Title Fix items created.'
        : 'No Title Fix items were created.'
    };
  }

  // getCanonicalDetail(canonicalSeoUrlId, duplicateSort)
  getCanonicalDetail(canonicalSeoUrlId, duplicateSort) {
    const seoUrls = this._getFromStorage(this._seoUrlStorageKey, []);
    const duplicatesRaw = this._getFromStorage(this._duplicateUrlStorageKey, []);

    const canonical = seoUrls.find(u => u.id === canonicalSeoUrlId) || null;

    let duplicates = duplicatesRaw.filter(
      d => d.canonicalSeoUrlId === canonicalSeoUrlId
    );

    if (duplicateSort && duplicateSort.field) {
      const field = duplicateSort.field;
      const direction = duplicateSort.direction === 'asc' ? 'asc' : 'desc';
      duplicates.sort((a, b) => {
        let aVal;
        let bVal;
        switch (field) {
          case 'organic_traffic':
            aVal = a.organicTraffic;
            bVal = b.organicTraffic;
            break;
          default:
            aVal = a.organicTraffic;
            bVal = b.organicTraffic;
        }
        return this._compareValues(aVal, bVal, direction);
      });
    }

    // Instrumentation for task completion tracking
    try {
      if (
        canonical &&
        typeof canonical.duplicateCount === 'number' &&
        canonical.duplicateCount >= 2 &&
        duplicateSort &&
        duplicateSort.field === 'organic_traffic' &&
        duplicateSort.direction === 'asc'
      ) {
        const instrumentationValue = {
          canonicalSeoUrlId: canonicalSeoUrlId,
          duplicateSortUsed: duplicateSort || null,
          duplicateCount: duplicates.length,
          lowestTrafficDuplicate: duplicates[0]
            ? {
                url: duplicates[0].url,
                organicTraffic: duplicates[0].organicTraffic
              }
            : null
        };
        localStorage.setItem(
          'task5_canonicalDetailView',
          JSON.stringify(instrumentationValue)
        );
      }
    } catch (e) {
      console.error('Instrumentation error (task5_canonicalDetailView):', e);
    }

    const sitemapFiles = this._loadSitemapFiles();
    const sitemapMap = new Map(sitemapFiles.map(s => [s.id, s]));
    const canonicalWithRelations = canonical
      ? {
          ...canonical,
          sitemapFile: canonical.sitemapFileId
            ? sitemapMap.get(canonical.sitemapFileId) || null
            : null
        }
      : null;

    const duplicatesWithRelations = duplicates.map(d => ({
      ...d,
      canonicalSeoUrl: canonicalWithRelations
    }));

    return {
      canonical: canonicalWithRelations,
      duplicates: duplicatesWithRelations
    };
  }

  // getSeoUrlMetadata(seoUrlId)
  getSeoUrlMetadata(seoUrlId) {
    const seoUrls = this._getFromStorage(this._seoUrlStorageKey, []);
    const url = seoUrls.find(u => u.id === seoUrlId);
    if (!url) return null;

    // Instrumentation for task completion tracking
    try {
      if (
        typeof url.urlDepth === 'number' &&
        url.urlDepth <= 2 &&
        !url.hasMetaDescription
      ) {
        localStorage.setItem('task8_editMetadataSeoUrlId', seoUrlId);
      }
    } catch (e) {
      console.error('Instrumentation error (task8_editMetadataSeoUrlId):', e);
    }

    return {
      id: url.id,
      url: url.url,
      contentType: url.contentType,
      title: url.title,
      metaTitle: url.metaTitle || '',
      metaDescription: url.metaDescription || '',
      metaRobots: url.metaRobots || '',
      canonicalUrl: url.canonicalUrl || '',
      hasMetaDescription: !!url.hasMetaDescription,
      lastModified: url.lastModified
    };
  }

  // updateSeoUrlMetadata(seoUrlId, metaTitle, metaDescription, metaRobots, canonicalUrl)
  updateSeoUrlMetadata(
    seoUrlId,
    metaTitle,
    metaDescription,
    metaRobots,
    canonicalUrl
  ) {
    const updates = {};
    if (metaTitle !== undefined) updates.metaTitle = metaTitle;
    if (metaDescription !== undefined) updates.metaDescription = metaDescription;
    if (metaRobots !== undefined) updates.metaRobots = metaRobots;
    if (canonicalUrl !== undefined) updates.canonicalUrl = canonicalUrl;

    const updatedSeoUrl = this._updateSeoMetadata(seoUrlId, updates);
    const success = !!updatedSeoUrl;
    return {
      success,
      updatedSeoUrl: updatedSeoUrl || null,
      message: success ? 'Metadata updated.' : 'SEO URL not found.'
    };
  }

  // getXmlSitemapFilterOptions()
  getXmlSitemapFilterOptions() {
    const contentTypes = [
      { value: 'blog_post', label: 'Blog Post' },
      { value: 'product', label: 'Product' },
      { value: 'faq', label: 'FAQ' },
      { value: 'category', label: 'Category' },
      { value: 'home', label: 'Home' },
      { value: 'help', label: 'Help' },
      { value: 'other', label: 'Other' }
    ];

    const changefreqOptions = [
      { value: 'always', label: 'Always' },
      { value: 'hourly', label: 'Hourly' },
      { value: 'daily', label: 'Daily' },
      { value: 'weekly', label: 'Weekly' },
      { value: 'monthly', label: 'Monthly' },
      { value: 'yearly', label: 'Yearly' },
      { value: 'never', label: 'Never' },
      { value: 'unknown', label: 'Unknown' }
    ];

    const lastModifiedPresets = [
      { value: 'last_1_day', label: 'Last 1 day' },
      { value: 'last_7_days', label: 'Last 7 days' },
      { value: 'last_30_days', label: 'Last 30 days' }
    ];

    const priorityPresets = [
      { min: 0.0, max: 1.0, label: 'Any' },
      { min: 0.5, max: 1.0, label: '0.5 - 1.0' },
      { min: 0.7, max: 1.0, label: '0.7 - 1.0' }
    ];

    const sortableFields = ['last_modified', 'priority', 'url'];

    return {
      contentTypes,
      changefreqOptions,
      lastModifiedPresets,
      priorityPresets,
      sortableFields
    };
  }

  // getXmlSitemapUrls(filters, sort, page, pageSize)
  getXmlSitemapUrls(filters, sort, page, pageSize) {
    const allUrls = this._getFromStorage(this._seoUrlStorageKey, []);
    const filteredSorted = this._applySitemapUrlFiltersAndSorting(
      allUrls,
      filters || {},
      sort || null
    );

    const currentPage = typeof page === 'number' && page > 0 ? page : 1;
    const currentPageSize =
      typeof pageSize === 'number' && pageSize > 0 ? pageSize : 100;
    const totalCount = filteredSorted.length;
    const start = (currentPage - 1) * currentPageSize;
    const end = start + currentPageSize;
    const pageItems = filteredSorted.slice(start, end);

    const sitemapFiles = this._loadSitemapFiles();

    // Instrumentation for task completion tracking
    try {
      // task_1: task1_blogSitemapQuery
      if (
        filters &&
        filters.contentType === 'blog_post' &&
        sort &&
        sort.field === 'last_modified' &&
        sort.direction === 'desc' &&
        currentPage === 1
      ) {
        const instrumentationValueTask1 = {
          filtersUsed: filters || {},
          sortUsed: sort || null,
          page: currentPage,
          pageSize: currentPageSize,
          firstItemSeoUrlId: pageItems[0] ? pageItems[0].id : null
        };
        localStorage.setItem(
          'task1_blogSitemapQuery',
          JSON.stringify(instrumentationValueTask1)
        );
      }

      // task_2: task2_topProductSitemapQuery
      if (
        filters &&
        filters.contentType === 'product' &&
        typeof filters.priorityMin === 'number' &&
        filters.priorityMin >= 0.7 &&
        filters.changefreq === 'weekly' &&
        sort &&
        sort.field === 'priority' &&
        sort.direction === 'desc' &&
        currentPage === 1
      ) {
        const instrumentationValueTask2 = {
          filtersUsed: filters || {},
          sortUsed: sort || null,
          page: currentPage,
          pageSize: currentPageSize,
          firstFiveSeoUrlIds: pageItems.slice(0, 5).map(u => u.id)
        };
        localStorage.setItem(
          'task2_topProductSitemapQuery',
          JSON.stringify(instrumentationValueTask2)
        );
      }

      // task_6: task6_maxUrlSitemapSecondPage
      if (
        filters &&
        filters.sitemapFileId &&
        currentPage === 2 &&
        Array.isArray(sitemapFiles) &&
        sitemapFiles.length > 0
      ) {
        let maxFile = null;
        sitemapFiles.forEach(file => {
          const fileUrlCount =
            typeof file.urlCount === 'number' ? file.urlCount : 0;
          const maxUrlCount =
            maxFile && typeof maxFile.urlCount === 'number'
              ? maxFile.urlCount
              : 0;
          if (!maxFile || fileUrlCount > maxUrlCount) {
            maxFile = file;
          }
        });
        if (maxFile && filters.sitemapFileId === maxFile.id) {
          const instrumentationValueTask6 = {
            sitemapFileId: filters.sitemapFileId,
            page: currentPage,
            pageSize: currentPageSize
          };
          localStorage.setItem(
            'task6_maxUrlSitemapSecondPage',
            JSON.stringify(instrumentationValueTask6)
          );
        }
      }
    } catch (e) {
      console.error('Instrumentation error (getXmlSitemapUrls):', e);
    }

    const sitemapMap = new Map(sitemapFiles.map(s => [s.id, s]));

    const itemsWithRelations = pageItems.map(u => ({
      ...u,
      sitemapFile: u.sitemapFileId
        ? sitemapMap.get(u.sitemapFileId) || null
        : null
    }));

    return {
      items: itemsWithRelations,
      totalCount,
      page: currentPage,
      pageSize: currentPageSize,
      hasNextPage: end < totalCount,
      hasPreviousPage: start > 0
    };
  }

  // copySitemapUrlsToClipboard(selectionMode, seoUrlIds, filters)
  copySitemapUrlsToClipboard(selectionMode, seoUrlIds, filters) {
    let urlsToCopy = [];
    const mode = selectionMode || 'ids';

    if (mode === 'ids') {
      const idsSet = new Set(Array.isArray(seoUrlIds) ? seoUrlIds : []);
      if (idsSet.size) {
        const allUrls = this._getFromStorage(this._seoUrlStorageKey, []);
        urlsToCopy = allUrls.filter(u => idsSet.has(u.id)).map(u => u.url);
      }
    } else if (mode === 'filters') {
      const allUrls = this._getFromStorage(this._seoUrlStorageKey, []);
      const filteredSorted = this._applySitemapUrlFiltersAndSorting(
        allUrls,
        filters || {},
        null
      );
      urlsToCopy = filteredSorted.map(u => u.url);
    }

    const success =
      urlsToCopy.length > 0 && this._copyToClipboard(urlsToCopy);
    return {
      success,
      copiedCount: urlsToCopy.length,
      message: success ? 'URLs copied to clipboard.' : 'No URLs to copy.'
    };
  }

  // getSitemapFiles(sort, page, pageSize)
  getSitemapFiles(sort, page, pageSize) {
    const files = this._loadSitemapFiles();
    let result = files.slice();

    if (sort && sort.field) {
      const field = sort.field;
      const direction = sort.direction === 'asc' ? 'asc' : 'desc';
      result.sort((a, b) => {
        let aVal;
        let bVal;
        switch (field) {
          case 'url_count':
            aVal = a.urlCount;
            bVal = b.urlCount;
            break;
          case 'last_generated_at':
            aVal = this._parseDate(a.lastGeneratedAt);
            bVal = this._parseDate(b.lastGeneratedAt);
            break;
          case 'name':
            aVal = a.name;
            bVal = b.name;
            break;
          default:
            aVal = a.name;
            bVal = b.name;
        }
        return this._compareValues(aVal, bVal, direction);
      });
    }

    const currentPage = typeof page === 'number' && page > 0 ? page : 1;
    const currentPageSize =
      typeof pageSize === 'number' && pageSize > 0 ? pageSize : 50;
    const totalCount = result.length;
    const start = (currentPage - 1) * currentPageSize;
    const end = start + currentPageSize;
    const pageItems = result.slice(start, end);

    return {
      items: pageItems,
      totalCount,
      page: currentPage,
      pageSize: currentPageSize,
      hasNextPage: end < totalCount,
      hasPreviousPage: start > 0
    };
  }

  // getSeoAuditItems(filters, sort, page, pageSize)
  getSeoAuditItems(filters, sort, page, pageSize) {
    const auditItems = this._getFromStorage(this._seoAuditItemStorageKey, []);
    const seoUrls = this._getFromStorage(this._seoUrlStorageKey, []);

    let items = this._filterSeoAuditItems(auditItems, seoUrls, filters || {});

    if (sort && sort.field) {
      const field = sort.field;
      const direction = sort.direction === 'asc' ? 'asc' : 'desc';
      items.sort((a, b) => {
        let aVal;
        let bVal;
        switch (field) {
          case 'date_added':
            aVal = this._parseDate(a.auditItem.addedAt);
            bVal = this._parseDate(b.auditItem.addedAt);
            break;
          case 'content_type':
            aVal = a.seoUrl ? a.seoUrl.contentType : '';
            bVal = b.seoUrl ? b.seoUrl.contentType : '';
            break;
          case 'resolved':
            aVal = a.auditItem.resolved;
            bVal = b.auditItem.resolved;
            break;
          default:
            aVal = this._parseDate(a.auditItem.addedAt);
            bVal = this._parseDate(b.auditItem.addedAt);
        }
        return this._compareValues(aVal, bVal, direction);
      });
    }

    const currentPage = typeof page === 'number' && page > 0 ? page : 1;
    const currentPageSize =
      typeof pageSize === 'number' && pageSize > 0 ? pageSize : 50;
    const totalCount = items.length;
    const start = (currentPage - 1) * currentPageSize;
    const end = start + currentPageSize;
    const pageItems = items.slice(start, end);

    return {
      items: pageItems,
      totalCount,
      page: currentPage,
      pageSize: currentPageSize,
      hasNextPage: end < totalCount,
      hasPreviousPage: start > 0
    };
  }

  // removeSeoAuditItems(seoAuditItemIds)
  removeSeoAuditItems(seoAuditItemIds) {
    const idsSet = new Set(Array.isArray(seoAuditItemIds) ? seoAuditItemIds : []);
    if (!idsSet.size) {
      return { success: false, removedCount: 0, message: 'No IDs provided.' };
    }
    const auditItems = this._getFromStorage(this._seoAuditItemStorageKey, []);
    const before = auditItems.length;
    const remaining = auditItems.filter(item => !idsSet.has(item.id));
    const removedCount = before - remaining.length;
    this._saveToStorage(this._seoAuditItemStorageKey, remaining);
    return {
      success: removedCount > 0,
      removedCount,
      message:
        removedCount > 0
          ? 'SEO Audit items removed.'
          : 'No SEO Audit items removed.'
    };
  }

  // setSeoAuditItemsResolved(seoAuditItemIds, resolved)
  setSeoAuditItemsResolved(seoAuditItemIds, resolved) {
    const idsSet = new Set(Array.isArray(seoAuditItemIds) ? seoAuditItemIds : []);
    const auditItems = this._getFromStorage(this._seoAuditItemStorageKey, []);
    const nowIso = new Date().toISOString();
    let updatedCount = 0;
    auditItems.forEach(item => {
      if (idsSet.has(item.id)) {
        if (item.resolved !== resolved) {
          item.resolved = resolved;
          item.resolvedAt = resolved ? nowIso : null;
          updatedCount += 1;
        }
      }
    });
    this._saveToStorage(this._seoAuditItemStorageKey, auditItems);
    return {
      success: updatedCount > 0,
      updatedCount,
      message:
        updatedCount > 0
          ? 'SEO Audit items updated.'
          : 'No SEO Audit items updated.'
    };
  }

  // copySeoAuditUrlsToClipboard(selectionMode, seoAuditItemIds, filters)
  copySeoAuditUrlsToClipboard(selectionMode, seoAuditItemIds, filters) {
    const mode = selectionMode || 'ids';
    const auditItems = this._getFromStorage(this._seoAuditItemStorageKey, []);
    const seoUrls = this._getFromStorage(this._seoUrlStorageKey, []);
    const seoUrlMap = new Map(seoUrls.map(u => [u.id, u]));
    let urlsToCopy = [];

    if (mode === 'ids') {
      const idsSet = new Set(
        Array.isArray(seoAuditItemIds) ? seoAuditItemIds : []
      );
      auditItems.forEach(item => {
        if (idsSet.has(item.id)) {
          const seoUrl = seoUrlMap.get(item.seoUrlId);
          if (seoUrl && seoUrl.url) {
            urlsToCopy.push(seoUrl.url);
          }
        }
      });
    } else if (mode === 'filters') {
      const filtered = this._filterSeoAuditItems(
        auditItems,
        seoUrls,
        filters || {}
      );
      urlsToCopy = filtered
        .map(it => (it.seoUrl && it.seoUrl.url ? it.seoUrl.url : null))
        .filter(u => !!u);
    }

    const success =
      urlsToCopy.length > 0 && this._copyToClipboard(urlsToCopy);
    return {
      success,
      copiedCount: urlsToCopy.length,
      message: success
        ? 'SEO Audit URLs copied to clipboard.'
        : 'No URLs to copy.'
    };
  }

  // getTitleFixItems(filters, sort, page, pageSize)
  getTitleFixItems(filters, sort, page, pageSize) {
    const titleFixItems = this._getFromStorage(this._titleFixItemStorageKey, []);
    const seoUrls = this._getFromStorage(this._seoUrlStorageKey, []);

    let items = this._filterTitleFixItems(
      titleFixItems,
      seoUrls,
      filters || {}
    );

    if (sort && sort.field) {
      const field = sort.field;
      const direction = sort.direction === 'asc' ? 'asc' : 'desc';
      items.sort((a, b) => {
        let aVal;
        let bVal;
        switch (field) {
          case 'title_length':
            aVal = a.titleFixItem.titleLength;
            bVal = b.titleFixItem.titleLength;
            break;
          case 'date_added':
            aVal = this._parseDate(a.titleFixItem.addedAt);
            bVal = this._parseDate(b.titleFixItem.addedAt);
            break;
          case 'content_type':
            aVal = a.titleFixItem.contentType;
            bVal = b.titleFixItem.contentType;
            break;
          default:
            aVal = this._parseDate(a.titleFixItem.addedAt);
            bVal = this._parseDate(b.titleFixItem.addedAt);
        }
        return this._compareValues(aVal, bVal, direction);
      });
    }

    const currentPage = typeof page === 'number' && page > 0 ? page : 1;
    const currentPageSize =
      typeof pageSize === 'number' && pageSize > 0 ? pageSize : 50;
    const totalCount = items.length;
    const start = (currentPage - 1) * currentPageSize;
    const end = start + currentPageSize;
    const pageItems = items.slice(start, end);

    return {
      items: pageItems,
      totalCount,
      page: currentPage,
      pageSize: currentPageSize,
      hasNextPage: end < totalCount,
      hasPreviousPage: start > 0
    };
  }

  // deleteTitleFixItems(titleFixItemIds)
  deleteTitleFixItems(titleFixItemIds) {
    const idsSet = new Set(
      Array.isArray(titleFixItemIds) ? titleFixItemIds : []
    );
    if (!idsSet.size) {
      return { success: false, removedCount: 0, message: 'No IDs provided.' };
    }
    const titleFixItems = this._getFromStorage(this._titleFixItemStorageKey, []);
    const before = titleFixItems.length;
    const remaining = titleFixItems.filter(item => !idsSet.has(item.id));
    const removedCount = before - remaining.length;
    this._saveToStorage(this._titleFixItemStorageKey, remaining);
    return {
      success: removedCount > 0,
      removedCount,
      message:
        removedCount > 0
          ? 'Title Fix items removed.'
          : 'No Title Fix items removed.'
    };
  }

  // setTitleFixItemsResolved(titleFixItemIds, resolved)
  setTitleFixItemsResolved(titleFixItemIds, resolved) {
    const idsSet = new Set(
      Array.isArray(titleFixItemIds) ? titleFixItemIds : []
    );
    const titleFixItems = this._getFromStorage(this._titleFixItemStorageKey, []);
    const nowIso = new Date().toISOString();
    let updatedCount = 0;
    titleFixItems.forEach(item => {
      if (idsSet.has(item.id)) {
        if (item.resolved !== resolved) {
          item.resolved = resolved;
          item.resolvedAt = resolved ? nowIso : null;
          updatedCount += 1;
        }
      }
    });
    this._saveToStorage(this._titleFixItemStorageKey, titleFixItems);
    return {
      success: updatedCount > 0,
      updatedCount,
      message:
        updatedCount > 0
          ? 'Title Fix items updated.'
          : 'No Title Fix items updated.'
    };
  }

  // copyTitleFixUrlsToClipboard(selectionMode, titleFixItemIds, filters)
  copyTitleFixUrlsToClipboard(selectionMode, titleFixItemIds, filters) {
    const mode = selectionMode || 'ids';
    const titleFixItems = this._getFromStorage(this._titleFixItemStorageKey, []);
    const seoUrls = this._getFromStorage(this._seoUrlStorageKey, []);
    const seoUrlMap = new Map(seoUrls.map(u => [u.id, u]));
    let urlsToCopy = [];

    if (mode === 'ids') {
      const idsSet = new Set(
        Array.isArray(titleFixItemIds) ? titleFixItemIds : []
      );
      titleFixItems.forEach(item => {
        if (idsSet.has(item.id)) {
          const seoUrl = seoUrlMap.get(item.seoUrlId);
          if (seoUrl && seoUrl.url) {
            urlsToCopy.push(seoUrl.url);
          }
        }
      });
    } else if (mode === 'filters') {
      const filtered = this._filterTitleFixItems(
        titleFixItems,
        seoUrls,
        filters || {}
      );
      urlsToCopy = filtered
        .map(it => (it.seoUrl && it.seoUrl.url ? it.seoUrl.url : null))
        .filter(u => !!u);
    }

    const success =
      urlsToCopy.length > 0 && this._copyToClipboard(urlsToCopy);
    return {
      success,
      copiedCount: urlsToCopy.length,
      message: success
        ? 'Title Fix URLs copied to clipboard.'
        : 'No URLs to copy.'
    };
  }

  // getHelpContent()
  getHelpContent() {
    const help = this._getFromStorage(this._helpContentKey, null);
    if (!help || typeof help !== 'object') {
      const fallback = {
        sections: [],
        workflows: [],
        quickLinks: []
      };
      this._saveToStorage(this._helpContentKey, fallback);
      return fallback;
    }
    return help;
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