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
    // Initialize localStorage with default data structures
    this._initStorage();
    this.idCounter = this._getNextIdCounter();
  }

  _initStorage() {
    // Initialize all data tables in localStorage if not exist
    if (!localStorage.getItem('sitemaps')) {
      localStorage.setItem('sitemaps', JSON.stringify([]));
    }
    if (!localStorage.getItem('sitemap_urls')) {
      localStorage.setItem('sitemap_urls', JSON.stringify([]));
    }
    if (!localStorage.getItem('pages')) {
      localStorage.setItem('pages', JSON.stringify([]));
    }
    if (!localStorage.getItem('navigation_links')) {
      localStorage.setItem('navigation_links', JSON.stringify([]));
    }
    if (!localStorage.getItem('bulk_action_executions')) {
      localStorage.setItem('bulk_action_executions', JSON.stringify([]));
    }
    if (!localStorage.getItem('sitemap_generation_jobs')) {
      localStorage.setItem('sitemap_generation_jobs', JSON.stringify([]));
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
    localStorage.setItem('idCounter', next.toString());
    return next;
  }

  _generateId(prefix) {
    return prefix + '_' + this._getNextIdCounter();
  }

  _nowIso() {
    return new Date().toISOString();
  }

  // --------- Private helpers for filtering/sorting ---------

  _filterAndSortSitemaps(sitemaps, searchQuery, filters, sort) {
    let result = Array.isArray(sitemaps) ? sitemaps.slice() : [];

    if (searchQuery && typeof searchQuery === 'string') {
      const q = searchQuery.toLowerCase();
      result = result.filter((s) => (s.name || '').toLowerCase().includes(q));
    }

    if (filters && typeof filters === 'object') {
      const f = filters;

      if (Array.isArray(f.types) && f.types.length > 0) {
        result = result.filter((s) => f.types.includes(s.type));
      }

      if (typeof f.minUrlCount === 'number') {
        result = result.filter((s) => typeof s.urlCount === 'number' && s.urlCount >= f.minUrlCount);
      }
      if (typeof f.maxUrlCount === 'number') {
        result = result.filter((s) => typeof s.urlCount === 'number' && s.urlCount <= f.maxUrlCount);
      }

      if (typeof f.minErrorCount === 'number') {
        result = result.filter((s) => typeof s.errorCount === 'number' && s.errorCount >= f.minErrorCount);
      }
      if (typeof f.maxErrorCount === 'number') {
        result = result.filter((s) => typeof s.errorCount === 'number' && s.errorCount <= f.maxErrorCount);
      }
      if (typeof f.errorsEquals === 'number') {
        result = result.filter((s) => (typeof s.errorCount === 'number' ? s.errorCount : 0) === f.errorsEquals);
      }

      if (typeof f.autoGenerationEnabled === 'boolean') {
        result = result.filter((s) => !!s.autoGenerationEnabled === f.autoGenerationEnabled);
      }

      if (f.lastGeneratedFrom) {
        const from = new Date(f.lastGeneratedFrom).getTime();
        if (!isNaN(from)) {
          result = result.filter((s) => {
            if (!s.lastGeneratedAt) return false;
            const t = new Date(s.lastGeneratedAt).getTime();
            return !isNaN(t) && t >= from;
          });
        }
      }

      if (f.lastGeneratedTo) {
        const to = new Date(f.lastGeneratedTo).getTime();
        if (!isNaN(to)) {
          result = result.filter((s) => {
            if (!s.lastGeneratedAt) return false;
            const t = new Date(s.lastGeneratedAt).getTime();
            return !isNaN(t) && t <= to;
          });
        }
      }

      if (Array.isArray(f.lastGenerationStatuses) && f.lastGenerationStatuses.length > 0) {
        result = result.filter((s) => f.lastGenerationStatuses.includes(s.lastGenerationStatus));
      }
    }

    if (sort && typeof sort === 'object' && sort.field) {
      const dir = (sort.direction || 'asc').toLowerCase() === 'desc' ? -1 : 1;
      const fieldMap = {
        name: 'name',
        url_count: 'urlCount',
        urlCount: 'urlCount',
        error_count: 'errorCount',
        errorCount: 'errorCount',
        last_generated_at: 'lastGeneratedAt',
        lastGeneratedAt: 'lastGeneratedAt',
        created_at: 'createdAt',
        createdAt: 'createdAt',
        updated_at: 'updatedAt',
        updatedAt: 'updatedAt'
      };
      const prop = fieldMap[sort.field] || 'name';

      result.sort((a, b) => {
        const va = a[prop];
        const vb = b[prop];

        if (va == null && vb == null) return 0;
        if (va == null) return -1 * dir;
        if (vb == null) return 1 * dir;

        // Date-like fields
        if (prop === 'lastGeneratedAt' || prop === 'createdAt' || prop === 'updatedAt') {
          const ta = new Date(va).getTime();
          const tb = new Date(vb).getTime();
          if (ta === tb) return 0;
          return ta < tb ? -1 * dir : 1 * dir;
        }

        if (typeof va === 'number' && typeof vb === 'number') {
          if (va === vb) return 0;
          return va < vb ? -1 * dir : 1 * dir;
        }

        const sa = String(va).toLowerCase();
        const sb = String(vb).toLowerCase();
        if (sa === sb) return 0;
        return sa < sb ? -1 * dir : 1 * dir;
      });
    }

    return result;
  }

  _filterAndSortSitemapUrls(urls, filters, sort) {
    let result = Array.isArray(urls) ? urls.slice() : [];

    if (filters && typeof filters === 'object') {
      const f = filters;

      if (Array.isArray(f.statusCodes) && f.statusCodes.length > 0) {
        result = result.filter((u) => f.statusCodes.includes(u.statusCode));
      }
      if (Array.isArray(f.indexStatuses) && f.indexStatuses.length > 0) {
        result = result.filter((u) => f.indexStatuses.includes(u.indexStatus));
      }
      if (typeof f.minPriority === 'number') {
        result = result.filter((u) => typeof u.priority === 'number' && u.priority >= f.minPriority);
      }
      if (typeof f.maxPriority === 'number') {
        result = result.filter((u) => typeof u.priority === 'number' && u.priority <= f.maxPriority);
      }
      if (f.lastModifiedFrom) {
        const from = new Date(f.lastModifiedFrom).getTime();
        if (!isNaN(from)) {
          result = result.filter((u) => {
            const t = new Date(u.lastModifiedAt).getTime();
            return !isNaN(t) && t >= from;
          });
        }
      }
      if (f.lastModifiedTo) {
        const to = new Date(f.lastModifiedTo).getTime();
        if (!isNaN(to)) {
          result = result.filter((u) => {
            const t = new Date(u.lastModifiedAt).getTime();
            return !isNaN(t) && t <= to;
          });
        }
      }
      if (Array.isArray(f.inclusionStatuses) && f.inclusionStatuses.length > 0) {
        result = result.filter((u) => f.inclusionStatuses.includes(u.inclusionStatus));
      }
    }

    if (sort && typeof sort === 'object' && sort.field) {
      const dir = (sort.direction || 'asc').toLowerCase() === 'desc' ? -1 : 1;
      const fieldMap = {
        url: 'url',
        status_code: 'statusCode',
        statusCode: 'statusCode',
        priority: 'priority',
        last_modified_at: 'lastModifiedAt',
        lastModifiedAt: 'lastModifiedAt'
      };
      const prop = fieldMap[sort.field] || 'url';

      result.sort((a, b) => {
        const va = a[prop];
        const vb = b[prop];

        if (va == null && vb == null) return 0;
        if (va == null) return -1 * dir;
        if (vb == null) return 1 * dir;

        if (prop === 'lastModifiedAt') {
          const ta = new Date(va).getTime();
          const tb = new Date(vb).getTime();
          if (ta === tb) return 0;
          return ta < tb ? -1 * dir : 1 * dir;
        }

        if (typeof va === 'number' && typeof vb === 'number') {
          if (va === vb) return 0;
          return va < vb ? -1 * dir : 1 * dir;
        }

        const sa = String(va).toLowerCase();
        const sb = String(vb).toLowerCase();
        if (sa === sb) return 0;
        return sa < sb ? -1 * dir : 1 * dir;
      });
    }

    return result;
  }

  _createSitemapGenerationJobRecord(sitemapId, triggeredFrom, status, message) {
    const jobs = this._getFromStorage('sitemap_generation_jobs');
    const now = this._nowIso();
    const job = {
      id: this._generateId('sitemap_job'),
      sitemapId: sitemapId,
      triggeredFrom: triggeredFrom || 'manual',
      status: status || 'pending',
      startedAt: now,
      completedAt: status === 'success' || status === 'failed' ? now : null,
      message: message || ''
    };
    jobs.push(job);
    this._saveToStorage('sitemap_generation_jobs', jobs);
    return job;
  }

  _logBulkActionExecution(sitemapId, actionType, targetUrlIds, newPriority, newChangefreq) {
    const logs = this._getFromStorage('bulk_action_executions');
    const now = this._nowIso();
    const logEntry = {
      id: this._generateId('bulk'),
      sitemapId: sitemapId,
      actionType: actionType,
      targetUrlIds: Array.isArray(targetUrlIds) ? targetUrlIds.slice() : [],
      newPriority: typeof newPriority === 'number' ? newPriority : null,
      newChangefreq: newChangefreq || null,
      executedAt: now
    };
    logs.push(logEntry);
    this._saveToStorage('bulk_action_executions', logs);
    return logEntry;
  }

  _exportUrlsToFormat(urls, format) {
    const fmt = (format || 'xml').toLowerCase();
    const safeUrls = Array.isArray(urls) ? urls : [];

    if (fmt === 'json') {
      return JSON.stringify(safeUrls);
    }

    if (fmt === 'csv') {
      const header = 'url,status_code,index_status,priority,changefreq,last_modified_at,inclusion_status';
      const lines = safeUrls.map((u) => {
        const esc = (v) => {
          if (v == null) return '';
          const s = String(v).replace(/"/g, '""');
          if (s.indexOf(',') !== -1 || s.indexOf('"') !== -1 || s.indexOf('\n') !== -1) {
            return '"' + s + '"';
          }
          return s;
        };
        return [
          esc(u.url),
          esc(u.statusCode),
          esc(u.indexStatus),
          esc(u.priority),
          esc(u.changefreq),
          esc(u.lastModifiedAt),
          esc(u.inclusionStatus)
        ].join(',');
      });
      return [header].concat(lines).join('\n');
    }

    // default to XML
    const escapeXml = (str) => {
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
    };

    const urlEntries = safeUrls
      .map((u) => {
        const loc = u.url || '';
        const lastmod = u.lastModifiedAt || '';
        const priority = typeof u.priority === 'number' ? u.priority.toFixed(1) : '';
        const changefreq = u.changefreq || '';
        return [
          '  <url>',
          '    <loc>' + escapeXml(loc) + '</loc>',
          lastmod ? '    <lastmod>' + escapeXml(lastmod) + '</lastmod>' : null,
          changefreq ? '    <changefreq>' + escapeXml(changefreq) + '</changefreq>' : null,
          priority ? '    <priority>' + escapeXml(priority) + '</priority>' : null,
          '  </url>'
        ]
          .filter(Boolean)
          .join('\n');
      })
      .join('\n');

    const xml =
      '<?xml version="1.0" encoding="UTF-8"?>\n' +
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
      urlEntries +
      '\n</urlset>';

    return xml;
  }

  // --------- Core interface implementations ---------

  // getDashboardOverview()
  getDashboardOverview() {
    const sitemaps = this._getFromStorage('sitemaps');
    const urls = this._getFromStorage('sitemap_urls');
    const jobs = this._getFromStorage('sitemap_generation_jobs');

    const totalSitemaps = sitemaps.length;
    const totalUrls = urls.filter((u) => u.inclusionStatus === 'included').length;
    const totalErrors = sitemaps.reduce((sum, s) => sum + (typeof s.errorCount === 'number' ? s.errorCount : 0), 0);
    const sitemapsWithErrorsCount = sitemaps.filter((s) => (typeof s.errorCount === 'number' ? s.errorCount : 0) > 0).length;

    let lastGenerationAt = null;
    if (jobs.length > 0) {
      const sortedJobs = jobs.slice().sort((a, b) => {
        const ta = new Date(a.completedAt || a.startedAt).getTime();
        const tb = new Date(b.completedAt || b.startedAt).getTime();
        if (ta === tb) return 0;
        return ta < tb ? 1 : -1;
      });
      lastGenerationAt = sortedJobs[0].completedAt || sortedJobs[0].startedAt;
    }

    const topErrorSitemaps = sitemaps
      .slice()
      .sort((a, b) => {
        const ea = typeof a.errorCount === 'number' ? a.errorCount : 0;
        const eb = typeof b.errorCount === 'number' ? b.errorCount : 0;
        if (ea === eb) return 0;
        return ea < eb ? 1 : -1;
      })
      .slice(0, 5);

    const jobsWithSitemap = jobs
      .slice()
      .sort((a, b) => {
        const ta = new Date(a.startedAt).getTime();
        const tb = new Date(b.startedAt).getTime();
        if (ta === tb) return 0;
        return ta < tb ? 1 : -1;
      })
      .slice(0, 10)
      .map((job) => {
        const sitemap = sitemaps.find((s) => s.id === job.sitemapId) || null;
        return Object.assign({}, job, { sitemap });
      });

    return {
      totalSitemaps,
      totalUrls,
      totalErrors,
      sitemapsWithErrorsCount,
      lastGenerationAt,
      recentGenerationJobs: jobsWithSitemap,
      topErrorSitemaps
    };
  }

  // getSitemapListFilterOptions()
  getSitemapListFilterOptions() {
    const sitemaps = this._getFromStorage('sitemaps');

    const typeEnumValues = ['standard', 'blog', 'news', 'products', 'misc', 'other'];
    const typeOptions = typeEnumValues.map((value) => ({
      value,
      label: value.charAt(0).toUpperCase() + value.slice(1)
    }));

    let minError = 0;
    let maxError = 0;
    let minUrl = 0;
    let maxUrl = 0;

    if (sitemaps.length > 0) {
      minError = maxError = sitemaps[0].errorCount || 0;
      minUrl = maxUrl = sitemaps[0].urlCount || 0;
      sitemaps.forEach((s) => {
        const e = typeof s.errorCount === 'number' ? s.errorCount : 0;
        const u = typeof s.urlCount === 'number' ? s.urlCount : 0;
        if (e < minError) minError = e;
        if (e > maxError) maxError = e;
        if (u < minUrl) minUrl = u;
        if (u > maxUrl) maxUrl = u;
      });
    }

    const autoGenerationFrequencyOptions = ['hourly', 'daily', 'weekly', 'monthly'].map((value) => ({
      value,
      label: value.charAt(0).toUpperCase() + value.slice(1)
    }));

    const generationStatusOptions = ['never_run', 'success', 'warning', 'failed'];

    return {
      typeOptions,
      errorCountRange: { min: minError, max: maxError },
      urlCountRange: { min: minUrl, max: maxUrl },
      autoGenerationFrequencyOptions,
      generationStatusOptions
    };
  }

  // getSitemapsListing(searchQuery, filters, sort, pagination)
  getSitemapsListing(searchQuery, filters, sort, pagination) {
    const sitemaps = this._getFromStorage('sitemaps');

    const filteredSorted = this._filterAndSortSitemaps(sitemaps, searchQuery, filters, sort);

    const page = (pagination && typeof pagination.page === 'number' && pagination.page > 0) ? pagination.page : 1;
    const pageSize = (pagination && typeof pagination.pageSize === 'number' && pagination.pageSize > 0) ? pagination.pageSize : 25;

    const start = (page - 1) * pageSize;
    const end = start + pageSize;

    const items = filteredSorted.slice(start, end);

    const availableSortFields = ['name', 'url_count', 'error_count', 'last_generated_at', 'created_at', 'updated_at'];

    return {
      items,
      totalCount: filteredSorted.length,
      page,
      pageSize,
      availableSortFields
    };
  }

  // getSitemapSettingsOptions()
  getSitemapSettingsOptions() {
    const typeEnumValues = ['standard', 'blog', 'news', 'products', 'misc', 'other'];
    const typeOptions = typeEnumValues.map((value) => ({
      value,
      label: value.charAt(0).toUpperCase() + value.slice(1)
    }));

    const changefreqEnumValues = ['always', 'hourly', 'daily', 'weekly', 'monthly', 'yearly', 'never'];
    const changefreqOptions = changefreqEnumValues.map((value) => ({
      value,
      label: value.charAt(0).toUpperCase() + value.slice(1)
    }));

    const autoGenerationFrequencyEnumValues = ['hourly', 'daily', 'weekly', 'monthly'];
    const autoGenerationFrequencyOptions = autoGenerationFrequencyEnumValues.map((value) => ({
      value,
      label: value.charAt(0).toUpperCase() + value.slice(1)
    }));

    const defaultValues = {
      defaultChangefreq: 'weekly',
      defaultPriority: 0.5,
      autoGenerationEnabled: true,
      autoGenerationFrequency: 'weekly'
    };

    return {
      typeOptions,
      changefreqOptions,
      autoGenerationFrequencyOptions,
      defaultValues
    };
  }

  // getSitemapSettings(sitemapId)
  getSitemapSettings(sitemapId) {
    const sitemaps = this._getFromStorage('sitemaps');
    const sitemap = sitemaps.find((s) => s.id === sitemapId) || null;
    return { sitemap };
  }

  // saveSitemapSettings(sitemapId, name, type, urlPattern, defaultChangefreq, defaultPriority, autoGenerationEnabled, autoGenerationFrequency)
  saveSitemapSettings(sitemapId, name, type, urlPattern, defaultChangefreq, defaultPriority, autoGenerationEnabled, autoGenerationFrequency) {
    const sitemaps = this._getFromStorage('sitemaps');
    const now = this._nowIso();

    const allowedTypes = ['standard', 'blog', 'news', 'products', 'misc', 'other'];
    const allowedChangefreq = ['always', 'hourly', 'daily', 'weekly', 'monthly', 'yearly', 'never'];
    const allowedAutoGenFreq = ['hourly', 'daily', 'weekly', 'monthly'];

    if (!name || typeof name !== 'string') {
      return { success: false, created: false, sitemap: null, message: 'Name is required.' };
    }
    if (!allowedTypes.includes(type)) {
      return { success: false, created: false, sitemap: null, message: 'Invalid sitemap type.' };
    }
    if (!allowedChangefreq.includes(defaultChangefreq)) {
      return { success: false, created: false, sitemap: null, message: 'Invalid default changefreq.' };
    }
    if (typeof defaultPriority !== 'number' || defaultPriority < 0 || defaultPriority > 1) {
      return { success: false, created: false, sitemap: null, message: 'defaultPriority must be between 0.0 and 1.0.' };
    }
    if (autoGenerationEnabled && autoGenerationFrequency && !allowedAutoGenFreq.includes(autoGenerationFrequency)) {
      return { success: false, created: false, sitemap: null, message: 'Invalid auto-generation frequency.' };
    }

    let sitemap;
    let created = false;

    if (sitemapId) {
      const idx = sitemaps.findIndex((s) => s.id === sitemapId);
      if (idx === -1) {
        return { success: false, created: false, sitemap: null, message: 'Sitemap not found.' };
      }
      sitemap = Object.assign({}, sitemaps[idx], {
        name,
        type,
        urlPattern: urlPattern || null,
        defaultChangefreq,
        defaultPriority,
        autoGenerationEnabled: !!autoGenerationEnabled,
        autoGenerationFrequency: autoGenerationEnabled ? autoGenerationFrequency || null : null,
        updatedAt: now
      });
      sitemaps[idx] = sitemap;
    } else {
      sitemap = {
        id: this._generateId('sitemap'),
        name,
        type,
        urlPattern: urlPattern || null,
        urlCount: 0,
        errorCount: 0,
        defaultChangefreq,
        defaultPriority,
        autoGenerationEnabled: !!autoGenerationEnabled,
        autoGenerationFrequency: autoGenerationEnabled ? autoGenerationFrequency || null : null,
        lastGeneratedAt: null,
        lastGenerationStatus: 'never_run',
        createdAt: now,
        updatedAt: now
      };
      sitemaps.push(sitemap);
      created = true;
    }

    // Instrumentation for task completion tracking (task_5)
    try {
      if (
        sitemapId &&
        sitemap &&
        sitemap.type === 'standard' &&
        sitemap.autoGenerationEnabled === true &&
        sitemap.autoGenerationFrequency === 'daily'
      ) {
        let isSmallestStandardAtSave = false;
        const standardSitemaps = sitemaps.filter((s) => s.type === 'standard');
        if (standardSitemaps.length > 0) {
          let minUrlCount = null;
          standardSitemaps.forEach((s) => {
            const count = typeof s.urlCount === 'number' ? s.urlCount : 0;
            if (minUrlCount === null || count < minUrlCount) {
              minUrlCount = count;
            }
          });
          const thisUrlCount = typeof sitemap.urlCount === 'number' ? sitemap.urlCount : 0;
          isSmallestStandardAtSave = minUrlCount !== null && thisUrlCount === minUrlCount;
        }
        localStorage.setItem(
          'task5_smallestSitemapUpdate',
          JSON.stringify({
            sitemapId: sitemap.id,
            name: sitemap.name,
            type: sitemap.type,
            urlCountAtSave: typeof sitemap.urlCount === 'number' ? sitemap.urlCount : 0,
            autoGenerationEnabled: sitemap.autoGenerationEnabled,
            autoGenerationFrequency: sitemap.autoGenerationFrequency,
            isSmallestStandardAtSave: isSmallestStandardAtSave,
            evaluatedAt: now
          })
        );
      }

      if (
        sitemapId &&
        sitemap &&
        sitemap.type === 'standard' &&
        sitemap.autoGenerationEnabled === true &&
        sitemap.autoGenerationFrequency === 'weekly'
      ) {
        let isLargestStandardAtSave = false;
        const standardSitemaps = sitemaps.filter((s) => s.type === 'standard');
        if (standardSitemaps.length > 0) {
          let maxUrlCount = null;
          standardSitemaps.forEach((s) => {
            const count = typeof s.urlCount === 'number' ? s.urlCount : 0;
            if (maxUrlCount === null || count > maxUrlCount) {
              maxUrlCount = count;
            }
          });
          const thisUrlCount = typeof sitemap.urlCount === 'number' ? sitemap.urlCount : 0;
          isLargestStandardAtSave = maxUrlCount !== null && thisUrlCount === maxUrlCount;
        }
        localStorage.setItem(
          'task5_largestSitemapUpdate',
          JSON.stringify({
            sitemapId: sitemap.id,
            name: sitemap.name,
            type: sitemap.type,
            urlCountAtSave: typeof sitemap.urlCount === 'number' ? sitemap.urlCount : 0,
            autoGenerationEnabled: sitemap.autoGenerationEnabled,
            autoGenerationFrequency: sitemap.autoGenerationFrequency,
            isLargestStandardAtSave: isLargestStandardAtSave,
            evaluatedAt: now
          })
        );
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    this._saveToStorage('sitemaps', sitemaps);

    return {
      success: true,
      created,
      sitemap,
      message: created ? 'Sitemap created.' : 'Sitemap updated.'
    };
  }

  // triggerSitemapGeneration(sitemapId, reason)
  triggerSitemapGeneration(sitemapId, reason) {
    const sitemaps = this._getFromStorage('sitemaps');
    const sitemapIdx = sitemaps.findIndex((s) => s.id === sitemapId);
    if (sitemapIdx === -1) {
      return { success: false, job: null, message: 'Sitemap not found.' };
    }

    const message = reason || 'manual_regeneration_from_listing';
    const job = this._createSitemapGenerationJobRecord(sitemapId, 'manual', 'success', message);

    const now = job.completedAt || job.startedAt;
    const updatedSitemap = Object.assign({}, sitemaps[sitemapIdx], {
      lastGeneratedAt: now,
      lastGenerationStatus: 'success',
      updatedAt: now
    });
    sitemaps[sitemapIdx] = updatedSitemap;
    this._saveToStorage('sitemaps', sitemaps);

    const jobWithSitemap = Object.assign({}, job, { sitemap: updatedSitemap });

    return {
      success: true,
      job: jobWithSitemap,
      message: 'Regeneration started.'
    };
  }

  // getSitemapUrlFilterOptions(sitemapId)
  getSitemapUrlFilterOptions(sitemapId) {
    const sitemaps = this._getFromStorage('sitemaps');
    const sitemap = sitemaps.find((s) => s.id === sitemapId) || null;
    if (!sitemap) {
      return {
        statusCodeOptions: [],
        indexStatusOptions: ['indexed', 'not_indexed', 'unknown'],
        priorityRange: { minPriority: 0, maxPriority: 0 },
        lastModifiedRange: { earliest: null, latest: null },
        changefreqOptions: ['always', 'hourly', 'daily', 'weekly', 'monthly', 'yearly', 'never'],
        inclusionStatusOptions: ['included', 'excluded']
      };
    }

    const urls = this._getFromStorage('sitemap_urls').filter((u) => u.sitemapId === sitemapId);

    const statusCodeSet = new Set();
    let minPriority = 0;
    let maxPriority = 0;
    let earliest = null;
    let latest = null;

    if (urls.length > 0) {
      minPriority = maxPriority = typeof urls[0].priority === 'number' ? urls[0].priority : 0;
      urls.forEach((u) => {
        if (typeof u.statusCode === 'number') {
          statusCodeSet.add(u.statusCode);
        }
        if (typeof u.priority === 'number') {
          if (u.priority < minPriority) minPriority = u.priority;
          if (u.priority > maxPriority) maxPriority = u.priority;
        }
        const t = new Date(u.lastModifiedAt).getTime();
        if (!isNaN(t)) {
          if (!earliest || t < new Date(earliest).getTime()) {
            earliest = u.lastModifiedAt;
          }
          if (!latest || t > new Date(latest).getTime()) {
            latest = u.lastModifiedAt;
          }
        }
      });
    }

    const statusCodeOptions = Array.from(statusCodeSet.values()).sort((a, b) => a - b);

    const indexStatusOptions = ['indexed', 'not_indexed', 'unknown'];
    const changefreqOptions = ['always', 'hourly', 'daily', 'weekly', 'monthly', 'yearly', 'never'];
    const inclusionStatusOptions = ['included', 'excluded'];

    return {
      statusCodeOptions,
      indexStatusOptions,
      priorityRange: { minPriority, maxPriority },
      lastModifiedRange: { earliest, latest },
      changefreqOptions,
      inclusionStatusOptions
    };
  }

  // getSitemapUrlList(sitemapId, filters, sort, pagination)
  getSitemapUrlList(sitemapId, filters, sort, pagination) {
    const sitemaps = this._getFromStorage('sitemaps');
    const sitemap = sitemaps.find((s) => s.id === sitemapId) || null;

    const allUrls = this._getFromStorage('sitemap_urls').filter((u) => u.sitemapId === sitemapId);

    const filteredSorted = this._filterAndSortSitemapUrls(allUrls, filters, sort);

    const page = (pagination && typeof pagination.page === 'number' && pagination.page > 0) ? pagination.page : 1;
    const pageSize = (pagination && typeof pagination.pageSize === 'number' && pagination.pageSize > 0) ? pagination.pageSize : 25;

    const start = (page - 1) * pageSize;
    const end = start + pageSize;

    const slice = filteredSorted.slice(start, end);

    const items = slice.map((u) => Object.assign({}, u, { sitemap }));

    return {
      items,
      totalCount: filteredSorted.length,
      page,
      pageSize
    };
  }

  // createSitemapUrl(sitemapId, url, statusCode, indexStatus, priority, changefreq, lastModifiedAt, inclusionStatus)
  createSitemapUrl(sitemapId, url, statusCode, indexStatus, priority, changefreq, lastModifiedAt, inclusionStatus) {
    const sitemaps = this._getFromStorage('sitemaps');
    const sitemapIdx = sitemaps.findIndex((s) => s.id === sitemapId);
    if (sitemapIdx === -1) {
      return { success: false, sitemapUrl: null, message: 'Sitemap not found.' };
    }

    if (!url || typeof url !== 'string') {
      return { success: false, sitemapUrl: null, message: 'URL is required.' };
    }
    if (typeof priority !== 'number' || priority < 0 || priority > 1) {
      return { success: false, sitemapUrl: null, message: 'Priority must be between 0.0 and 1.0.' };
    }
    const allowedChangefreq = ['always', 'hourly', 'daily', 'weekly', 'monthly', 'yearly', 'never'];
    if (!allowedChangefreq.includes(changefreq)) {
      return { success: false, sitemapUrl: null, message: 'Invalid changefreq.' };
    }

    const urls = this._getFromStorage('sitemap_urls');
    const now = this._nowIso();

    const sitemapUrl = {
      id: this._generateId('sitemap_url'),
      sitemapId,
      url,
      statusCode: typeof statusCode === 'number' ? statusCode : 200,
      indexStatus: indexStatus || 'unknown',
      priority,
      changefreq,
      lastModifiedAt: lastModifiedAt || now,
      inclusionStatus: inclusionStatus || 'included',
      createdAt: now,
      updatedAt: now
    };

    urls.push(sitemapUrl);
    this._saveToStorage('sitemap_urls', urls);

    if (sitemapUrl.inclusionStatus === 'included') {
      const currentCount = typeof sitemaps[sitemapIdx].urlCount === 'number' ? sitemaps[sitemapIdx].urlCount : 0;
      sitemaps[sitemapIdx] = Object.assign({}, sitemaps[sitemapIdx], {
        urlCount: currentCount + 1,
        updatedAt: now
      });
      this._saveToStorage('sitemaps', sitemaps);
    }

    const sitemap = sitemaps[sitemapIdx];
    const sitemapUrlWithSitemap = Object.assign({}, sitemapUrl, { sitemap });

    return {
      success: true,
      sitemapUrl: sitemapUrlWithSitemap,
      message: 'Sitemap URL created.'
    };
  }

  // getSitemapUrlDetails(urlId)
  getSitemapUrlDetails(urlId) {
    const urls = this._getFromStorage('sitemap_urls');
    const url = urls.find((u) => u.id === urlId) || null;
    if (!url) {
      return { sitemapUrl: null };
    }
    const sitemaps = this._getFromStorage('sitemaps');
    const sitemap = sitemaps.find((s) => s.id === url.sitemapId) || null;
    const sitemapUrl = Object.assign({}, url, { sitemap });
    return { sitemapUrl };
  }

  // updateSitemapUrl(urlId, url, statusCode, indexStatus, priority, changefreq, lastModifiedAt, inclusionStatus)
  updateSitemapUrl(urlId, url, statusCode, indexStatus, priority, changefreq, lastModifiedAt, inclusionStatus) {
    const urls = this._getFromStorage('sitemap_urls');
    const idx = urls.findIndex((u) => u.id === urlId);
    if (idx === -1) {
      return { success: false, sitemapUrl: null, message: 'Sitemap URL not found.' };
    }

    const old = urls[idx];
    const now = this._nowIso();

    const updated = Object.assign({}, old);

    if (url !== undefined) {
      if (!url || typeof url !== 'string') {
        return { success: false, sitemapUrl: null, message: 'URL must be a non-empty string.' };
      }
      updated.url = url;
    }
    if (statusCode !== undefined) {
      if (typeof statusCode !== 'number') {
        return { success: false, sitemapUrl: null, message: 'statusCode must be a number.' };
      }
      updated.statusCode = statusCode;
    }
    if (indexStatus !== undefined) {
      updated.indexStatus = indexStatus;
    }
    if (priority !== undefined) {
      if (typeof priority !== 'number' || priority < 0 || priority > 1) {
        return { success: false, sitemapUrl: null, message: 'Priority must be between 0.0 and 1.0.' };
      }
      updated.priority = priority;
    }
    if (changefreq !== undefined) {
      const allowedChangefreq = ['always', 'hourly', 'daily', 'weekly', 'monthly', 'yearly', 'never'];
      if (!allowedChangefreq.includes(changefreq)) {
        return { success: false, sitemapUrl: null, message: 'Invalid changefreq.' };
      }
      updated.changefreq = changefreq;
    }
    if (lastModifiedAt !== undefined) {
      updated.lastModifiedAt = lastModifiedAt;
    }
    let inclusionChanged = false;
    if (inclusionStatus !== undefined && inclusionStatus !== old.inclusionStatus) {
      updated.inclusionStatus = inclusionStatus;
      inclusionChanged = true;
    }

    updated.updatedAt = now;
    urls[idx] = updated;
    this._saveToStorage('sitemap_urls', urls);

    const sitemaps = this._getFromStorage('sitemaps');
    const sitemapIdx = sitemaps.findIndex((s) => s.id === updated.sitemapId);
    let sitemap = sitemapIdx !== -1 ? sitemaps[sitemapIdx] : null;

    if (sitemap && inclusionChanged) {
      let urlCount = typeof sitemap.urlCount === 'number' ? sitemap.urlCount : 0;
      if (old.inclusionStatus === 'included' && updated.inclusionStatus === 'excluded') {
        urlCount = Math.max(0, urlCount - 1);
      } else if (old.inclusionStatus === 'excluded' && updated.inclusionStatus === 'included') {
        urlCount = urlCount + 1;
      }
      sitemap = Object.assign({}, sitemap, { urlCount, updatedAt: now });
      sitemaps[sitemapIdx] = sitemap;
      this._saveToStorage('sitemaps', sitemaps);
    }

    const sitemapUrlWithSitemap = Object.assign({}, updated, { sitemap });

    return {
      success: true,
      sitemapUrl: sitemapUrlWithSitemap,
      message: 'Sitemap URL updated.'
    };
  }

  // executeBulkUrlAction(sitemapId, actionType, targetUrlIds, newPriority, newChangefreq)
  executeBulkUrlAction(sitemapId, actionType, targetUrlIds, newPriority, newChangefreq) {
    const sitemaps = this._getFromStorage('sitemaps');
    const sitemapIdx = sitemaps.findIndex((s) => s.id === sitemapId);
    if (sitemapIdx === -1) {
      return { success: false, affectedCount: 0, bulkAction: null, message: 'Sitemap not found.' };
    }

    const allowedActions = ['change_priority', 'change_changefreq', 'exclude_from_sitemap', 'include_in_sitemap', 'remove_url'];
    if (!allowedActions.includes(actionType)) {
      return { success: false, affectedCount: 0, bulkAction: null, message: 'Invalid bulk action type.' };
    }

    if (!Array.isArray(targetUrlIds) || targetUrlIds.length === 0) {
      return { success: false, affectedCount: 0, bulkAction: null, message: 'No target URL IDs specified.' };
    }

    let urls = this._getFromStorage('sitemap_urls');
    const now = this._nowIso();

    let affectedUrls = urls.filter((u) => u.sitemapId === sitemapId && targetUrlIds.includes(u.id));

    if (affectedUrls.length === 0) {
      const bulkAction = this._logBulkActionExecution(sitemapId, actionType, [], newPriority, newChangefreq);
      const sitemap = sitemaps[sitemapIdx];
      const bulkActionResolved = Object.assign({}, bulkAction, { sitemap, targetUrls: [] });
      return { success: true, affectedCount: 0, bulkAction: bulkActionResolved, message: 'No matching URLs for the given IDs.' };
    }

    let sitemap = sitemaps[sitemapIdx];
    let urlCount = typeof sitemap.urlCount === 'number' ? sitemap.urlCount : 0;

    if (actionType === 'change_priority') {
      if (typeof newPriority !== 'number' || newPriority < 0 || newPriority > 1) {
        return { success: false, affectedCount: 0, bulkAction: null, message: 'newPriority must be between 0.0 and 1.0.' };
      }
      affectedUrls.forEach((u) => {
        u.priority = newPriority;
        u.updatedAt = now;
      });
    } else if (actionType === 'change_changefreq') {
      const allowedChangefreq = ['always', 'hourly', 'daily', 'weekly', 'monthly', 'yearly', 'never'];
      if (!allowedChangefreq.includes(newChangefreq)) {
        return { success: false, affectedCount: 0, bulkAction: null, message: 'Invalid newChangefreq.' };
      }
      affectedUrls.forEach((u) => {
        u.changefreq = newChangefreq;
        u.updatedAt = now;
      });
    } else if (actionType === 'exclude_from_sitemap') {
      affectedUrls.forEach((u) => {
        if (u.inclusionStatus === 'included') {
          u.inclusionStatus = 'excluded';
          u.updatedAt = now;
          urlCount = Math.max(0, urlCount - 1);
        }
      });
      sitemap = Object.assign({}, sitemap, { urlCount, updatedAt: now });
      sitemaps[sitemapIdx] = sitemap;
      this._saveToStorage('sitemaps', sitemaps);
    } else if (actionType === 'include_in_sitemap') {
      affectedUrls.forEach((u) => {
        if (u.inclusionStatus === 'excluded') {
          u.inclusionStatus = 'included';
          u.updatedAt = now;
          urlCount = urlCount + 1;
        }
      });
      sitemap = Object.assign({}, sitemap, { urlCount, updatedAt: now });
      sitemaps[sitemapIdx] = sitemap;
      this._saveToStorage('sitemaps', sitemaps);
    } else if (actionType === 'remove_url') {
      affectedUrls.forEach((u) => {
        if (u.inclusionStatus === 'included') {
          urlCount = Math.max(0, urlCount - 1);
        }
      });
      sitemap = Object.assign({}, sitemap, { urlCount, updatedAt: now });
      sitemaps[sitemapIdx] = sitemap;
      this._saveToStorage('sitemaps', sitemaps);
      // Remove from urls array
      const targetSet = new Set(targetUrlIds);
      urls = urls.filter((u) => !(u.sitemapId === sitemapId && targetSet.has(u.id)));
      this._saveToStorage('sitemap_urls', urls);
    }

    if (actionType !== 'remove_url') {
      // Save modified URLs back
      const affectedSet = new Set(affectedUrls.map((u) => u.id));
      const newUrls = urls.map((u) => (affectedSet.has(u.id) ? affectedUrls.find((au) => au.id === u.id) || u : u));
      this._saveToStorage('sitemap_urls', newUrls);
    }

    const affectedCount = affectedUrls.length;

    const bulkAction = this._logBulkActionExecution(sitemapId, actionType, targetUrlIds, newPriority, newChangefreq);

    const targetUrlsResolved = affectedUrls.map((u) => Object.assign({}, u, { sitemap }));
    const bulkActionResolved = Object.assign({}, bulkAction, { sitemap, targetUrls: targetUrlsResolved });

    // Instrumentation for task completion tracking (task_4)
    try {
      if (actionType === 'change_priority' && sitemap && sitemap.name === 'products-sitemap.xml') {
        const allUrlsForSitemap = urls.filter((u) => u.sitemapId === sitemapId);
        const sortedByLastModified = allUrlsForSitemap.slice().sort((a, b) => {
          const ta = new Date(a.lastModifiedAt).getTime();
          const tb = new Date(b.lastModifiedAt).getTime();
          if (isNaN(ta) && isNaN(tb)) return 0;
          if (isNaN(ta)) return 1;
          if (isNaN(tb)) return -1;
          if (ta === tb) return 0;
          return ta < tb ? 1 : -1;
        });
        const top5 = sortedByLastModified.slice(0, 5);
        const top5Ids = top5.map((u) => u.id);
        const targetSet = new Set(Array.isArray(targetUrlIds) ? targetUrlIds : []);
        let correctMostRecentSelection = false;
        if (top5Ids.length === targetSet.size && top5Ids.length > 0) {
          correctMostRecentSelection = top5Ids.every((id) => targetSet.has(id));
        }

        localStorage.setItem(
          'task4_bulkPriorityChange',
          JSON.stringify({
            sitemapId: sitemap.id,
            sitemapName: sitemap.name,
            newPriority: newPriority,
            targetUrlIds: Array.isArray(targetUrlIds) ? targetUrlIds.slice() : [],
            selectedCount: affectedUrls.length,
            executedAt: now,
            top5UrlIdsAtExecution: top5Ids,
            correctMostRecentSelection: correctMostRecentSelection
          })
        );
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      success: true,
      affectedCount,
      bulkAction: bulkActionResolved,
      message: 'Bulk action executed.'
    };
  }

  // exportSitemapUrls(sitemapId, filters, format)
  exportSitemapUrls(sitemapId, filters, format) {
    const sitemaps = this._getFromStorage('sitemaps');
    const sitemap = sitemaps.find((s) => s.id === sitemapId) || null;
    if (!sitemap) {
      return { success: false, format: format || 'xml', urlCount: 0, generatedAt: null, content: '' };
    }

    const allUrls = this._getFromStorage('sitemap_urls').filter((u) => u.sitemapId === sitemapId);

    const filtered = this._filterAndSortSitemapUrls(allUrls, filters, null);

    const fmt = (format || 'xml').toLowerCase();
    const content = this._exportUrlsToFormat(filtered, fmt);
    const generatedAt = this._nowIso();

    // Instrumentation for task completion tracking (task_3)
    try {
      localStorage.setItem(
        'task3_exportParams',
        JSON.stringify({
          sitemapId: sitemap.id,
          sitemapName: sitemap.name,
          filters: filters || null,
          format: (format || 'xml').toLowerCase(),
          generatedAt: generatedAt
        })
      );
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      success: true,
      format: fmt,
      urlCount: filtered.length,
      generatedAt,
      content
    };
  }

  // getHelpContent(topicId)
  getHelpContent(topicId) {
    const topics = [
      {
        id: 'regenerate_sitemap',
        title: 'Regenerate a sitemap with high errors',
        summary: 'Explains how to locate sitemaps with many errors and manually regenerate them.',
        relatedTaskIds: ['task_1'],
        relatedPageNames: ['Dashboard', 'Sitemap Listing'],
        steps: [
          {
            order: 1,
            title: 'Open the sitemap listing',
            description: 'Navigate from the dashboard to the sitemap listing using the Sitemaps navigation link.'
          },
          {
            order: 2,
            title: 'Filter and sort by errors',
            description: 'Filter to standard sitemaps and sort by error count descending to find the most problematic sitemap.'
          },
          {
            order: 3,
            title: 'Trigger regeneration',
            description: 'Use the row actions menu to start a manual regeneration job for the selected sitemap.'
          }
        ],
        conceptsCovered: ['sitemap_types', 'auto_generation_frequency']
      },
      {
        id: 'create_sitemap',
        title: 'Create a new sitemap',
        summary: 'How to create a new sitemap for a specific path with default settings and schedule.',
        relatedTaskIds: ['task_2'],
        relatedPageNames: ['Sitemap Listing'],
        steps: [
          {
            order: 1,
            title: 'Open the create form',
            description: 'Click the Create or New Sitemap button on the sitemap listing page.'
          },
          {
            order: 2,
            title: 'Fill in basic settings',
            description: 'Provide a name, type, URL pattern, default changefreq, and priority.'
          },
          {
            order: 3,
            title: 'Configure auto-generation',
            description: 'Enable and configure the generation schedule if needed, then save.'
          }
        ],
        conceptsCovered: ['sitemap_types', 'priority', 'changefreq', 'auto_generation_frequency']
      },
      {
        id: 'bulk_edit_urls',
        title: 'Bulk edit sitemap URLs',
        summary: 'Use bulk actions to update or exclude many URLs at once.',
        relatedTaskIds: ['task_4', 'task_6', 'task_9'],
        relatedPageNames: ['Sitemap URL List'],
        steps: [
          {
            order: 1,
            title: 'Filter URL list',
            description: 'Use filters like status code, index status, or last modified date to narrow down URLs.'
          },
          {
            order: 2,
            title: 'Select URLs',
            description: 'Select individual rows or use the header checkbox to select all filtered URLs.'
          },
          {
            order: 3,
            title: 'Apply bulk action',
            description: 'Choose a bulk action such as changing priority, changefreq, or excluding from the sitemap.'
          }
        ],
        conceptsCovered: ['priority', 'changefreq', 'index_status']
      },
      {
        id: 'export_urls',
        title: 'Export filtered URLs',
        summary: 'Export a filtered subset of URLs from a sitemap.',
        relatedTaskIds: ['task_3'],
        relatedPageNames: ['Sitemap URL List'],
        steps: [
          {
            order: 1,
            title: 'Filter URLs',
            description: 'Filter URLs by status code, priority, and other criteria as needed.'
          },
          {
            order: 2,
            title: 'Export',
            description: 'Click the Export action and choose a format to download the filtered URLs.'
          }
        ],
        conceptsCovered: ['priority', 'status_codes']
      }
    ];

    let filteredTopics = topics;
    if (topicId) {
      filteredTopics = topics.filter((t) => t.id === topicId);
    }

    return { topics: filteredTopics };
  }

  // getAboutInfo()
  getAboutInfo() {
    return {
      appName: 'Sitemap Management Tool',
      description: 'A lightweight XML sitemap management tool for configuring, generating, and exporting sitemaps.',
      version: '1.0.0',
      releaseNotes: 'Initial version with sitemap listing, URL management, bulk actions, export, and scheduling.',
      supportEmail: 'support@example.com',
      supportUrl: 'https://example.com/support'
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