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
    // Initialize localStorage with default data structures
    this._initStorage();
    this.idCounter = this._getNextIdCounter();
  }

  // ---------------------- Initialization & Storage Helpers ----------------------

  _initStorage() {
    const ensureArray = (key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    };

    ensureArray('sitemaps');
    ensureArray('sitemap_urls');
    ensureArray('url_lists');
    ensureArray('url_list_items');
    ensureArray('sitemap_groups');
    ensureArray('sitemap_group_memberships');
    ensureArray('activity_log_entries');
    ensureArray('contact_requests');

    // Help topics stored in localStorage so they can be extended but not mocked as data entities
    if (!localStorage.getItem('help_topics')) {
      const helpTopics = [
        {
          id: 'help_sitemap_index_filters',
          title: 'Using filters on the Sitemap Index',
          summary: 'Learn how to filter sitemaps by type, status, URL counts, and last modified date.',
          related_page: 'sitemap_index'
        },
        {
          id: 'help_sitemap_urls_view',
          title: 'Working with sitemap URLs',
          summary: 'Filter, sort, and bulk-edit URLs within a sitemap, including indexing status and HTTP errors.',
          related_page: 'sitemap_urls'
        },
        {
          id: 'help_url_lists',
          title: 'Monitoring and error lists',
          summary: 'Use URL lists like "Monitoring", "Fix errors", and "Redirects" to manage workflows.',
          related_page: 'url_lists'
        },
        {
          id: 'help_sitemap_groups',
          title: 'Organizing sitemaps into groups',
          summary: 'Group sitemaps for shared crawl strategies, such as high-volume video sitemaps.',
          related_page: 'sitemap_groups'
        },
        {
          id: 'help_reports',
          title: 'Reports overview',
          summary: 'Understand coverage, change frequency distribution, and error summaries.',
          related_page: 'reports'
        }
      ];
      localStorage.setItem('help_topics', JSON.stringify(helpTopics));
    }

    // Contact info: static configuration stored in localStorage
    if (!localStorage.getItem('contact_info')) {
      const contactInfo = {
        primary_email: 'support@example.com',
        channels: [
          {
            type: 'email',
            label: 'Email support',
            value: 'support@example.com',
            description: 'Typical response within 1 business day.'
          },
          {
            type: 'form',
            label: 'Contact form',
            value: '/contact',
            description: 'Submit a support ticket directly from the app.'
          }
        ]
      };
      localStorage.setItem('contact_info', JSON.stringify(contactInfo));
    }

    // Global settings single record
    if (!localStorage.getItem('global_settings')) {
      const defaultSettings = {
        id: 'default',
        default_sitemap_change_frequency: 'daily',
        default_sitemap_priority: 0.5,
        timezone: 'UTC',
        date_format: 'iso_8601',
        default_rows_per_page: 25
      };
      localStorage.setItem('global_settings', JSON.stringify(defaultSettings));
    }

    // ID counter for generated IDs
    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, fallback = []) {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : fallback;
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

  _getGlobalSettingsRecord() {
    const raw = localStorage.getItem('global_settings');
    if (!raw) {
      const settings = {
        id: 'default',
        default_sitemap_change_frequency: 'daily',
        default_sitemap_priority: 0.5,
        timezone: 'UTC',
        date_format: 'iso_8601',
        default_rows_per_page: 25
      };
      localStorage.setItem('global_settings', JSON.stringify(settings));
      return settings;
    }
    return JSON.parse(raw);
  }

  _setGlobalSettingsRecord(settings) {
    this._saveToStorage('global_settings', settings);
  }

  _getDefaultPaginationSettings() {
    const settings = this._getGlobalSettingsRecord();
    return {
      page: 1,
      pageSize: settings.default_rows_per_page || 25
    };
  }

  _paginate(items, page, pageSize) {
    const totalCount = items.length;
    const currentPage = page && page > 0 ? page : 1;
    const size = pageSize && pageSize > 0 ? pageSize : this._getDefaultPaginationSettings().pageSize;
    const start = (currentPage - 1) * size;
    const pagedItems = items.slice(start, start + size);
    return {
      items: pagedItems,
      totalCount,
      page: currentPage,
      pageSize: size
    };
  }

  // ---------------------- Filtering Helpers ----------------------

  _applySitemapFilters(sitemaps, options) {
    let result = sitemaps.slice();

    const {
      search,
      type,
      status,
      minUrlCount,
      maxUrlCount,
      changeFrequency,
      lastModifiedAfter,
      lastModifiedBefore,
      sortBy = 'last_modified',
      sortOrder = 'desc'
    } = options || {};

    if (search && search.trim()) {
      const term = search.toLowerCase();
      result = result.filter((s) => {
        const fn = (s.filename || '').toLowerCase();
        const dn = (s.display_name || '').toLowerCase();
        return fn.includes(term) || dn.includes(term);
      });
    }

    if (type) {
      result = result.filter((s) => s.type === type);
    }

    if (status) {
      result = result.filter((s) => s.status === status);
    }

    if (typeof minUrlCount === 'number') {
      result = result.filter((s) => s.url_count >= minUrlCount);
    }

    if (typeof maxUrlCount === 'number') {
      result = result.filter((s) => s.url_count <= maxUrlCount);
    }

    if (changeFrequency) {
      result = result.filter((s) => s.default_change_frequency === changeFrequency);
    }

    if (lastModifiedAfter) {
      const afterTs = new Date(lastModifiedAfter).getTime();
      result = result.filter((s) => new Date(s.last_modified).getTime() >= afterTs);
    }

    if (lastModifiedBefore) {
      const beforeTs = new Date(lastModifiedBefore).getTime();
      result = result.filter((s) => new Date(s.last_modified).getTime() <= beforeTs);
    }

    const order = (sortOrder || 'desc').toLowerCase() === 'asc' ? 1 : -1;
    const sortField = sortBy || 'last_modified';

    result.sort((a, b) => {
      let av = a[sortField];
      let bv = b[sortField];

      if (sortField === 'url_count') {
        av = Number(av) || 0;
        bv = Number(bv) || 0;
      }

      if (sortField === 'last_modified' || sortField === 'created_at') {
        av = new Date(av).getTime();
        bv = new Date(bv).getTime();
      }

      if (av < bv) return -1 * order;
      if (av > bv) return 1 * order;
      return 0;
    });

    return result;
  }

  _applyUrlFilters(urls, options) {
    let result = urls.slice();

    const {
      search,
      urlContains,
      priorityMin,
      priorityMax,
      lastModifiedAfter,
      lastModifiedBefore,
      lastModifiedPreset,
      httpStatusCodes,
      indexingStatus
    } = options || {};

    if (search && search.trim()) {
      const term = search.toLowerCase();
      result = result.filter((u) => (u.url || '').toLowerCase().includes(term));
    }

    if (urlContains && urlContains.trim()) {
      const term = urlContains.toLowerCase();
      result = result.filter((u) => (u.url || '').toLowerCase().includes(term));
    }

    if (typeof priorityMin === 'number') {
      result = result.filter((u) => u.priority >= priorityMin);
    }

    if (typeof priorityMax === 'number') {
      result = result.filter((u) => u.priority <= priorityMax);
    }

    let afterTs = null;
    let beforeTs = null;

    if (lastModifiedPreset) {
      const now = Date.now();
      let days = 0;
      if (lastModifiedPreset === 'last_7_days') days = 7;
      if (lastModifiedPreset === 'last_30_days') days = 30;
      if (days > 0) {
        afterTs = now - days * 24 * 60 * 60 * 1000;
      }
    } else {
      if (lastModifiedAfter) {
        afterTs = new Date(lastModifiedAfter).getTime();
      }
      if (lastModifiedBefore) {
        beforeTs = new Date(lastModifiedBefore).getTime();
      }
    }

    if (afterTs !== null) {
      result = result.filter((u) => new Date(u.last_modified).getTime() >= afterTs);
    }

    if (beforeTs !== null) {
      result = result.filter((u) => new Date(u.last_modified).getTime() <= beforeTs);
    }

    if (Array.isArray(httpStatusCodes) && httpStatusCodes.length > 0) {
      const set = new Set(httpStatusCodes.map((c) => Number(c)));
      result = result.filter((u) => set.has(Number(u.http_status_code)));
    }

    if (indexingStatus) {
      result = result.filter((u) => u.indexing_status === indexingStatus);
    }

    return result;
  }

  // ---------------------- Activity Logging ----------------------

  _recordActivityEvent(activity_type, description, meta) {
    const activityLogEntries = this._getFromStorage('activity_log_entries');

    const entry = {
      id: this._generateId('activity'),
      activity_type,
      description,
      sitemap_id: meta && meta.sitemap_id ? meta.sitemap_id : null,
      sitemap_url_id: meta && meta.sitemap_url_id ? meta.sitemap_url_id : null,
      list_id: meta && meta.list_id ? meta.list_id : null,
      group_id: meta && meta.group_id ? meta.group_id : null,
      created_at: new Date().toISOString()
    };

    activityLogEntries.push(entry);
    this._saveToStorage('activity_log_entries', activityLogEntries);
    return entry;
  }

  // ---------------------- Utility Helpers ----------------------

  _findOrCreateUrlListByName(name, description) {
    const trimmed = (name || '').trim();
    if (!trimmed) return null;

    let lists = this._getFromStorage('url_lists');
    let existing = lists.find((l) => (l.name || '').toLowerCase() === trimmed.toLowerCase());

    if (existing) return existing;

    const now = new Date().toISOString();
    const list = {
      id: this._generateId('urllist'),
      name: trimmed,
      description: description || '',
      created_at: now
    };

    lists.push(list);
    this._saveToStorage('url_lists', lists);
    return list;
  }

  _findSitemapByFilename(filename) {
    if (!filename) return null;
    const sitemaps = this._getFromStorage('sitemaps');
    const lower = filename.toLowerCase();
    return sitemaps.find((s) => (s.filename || '').toLowerCase() === lower) || null;
  }

  _bulkUpdateSitemapUrls(sitemapUrlIds, updateFields) {
    if (!Array.isArray(sitemapUrlIds) || sitemapUrlIds.length === 0) {
      return { updatedUrls: [], updatedCount: 0, failedIds: sitemapUrlIds || [] };
    }

    let urls = this._getFromStorage('sitemap_urls');
    const idSet = new Set(sitemapUrlIds);
    const updatedUrls = [];
    const failedIds = [];

    urls = urls.map((u) => {
      if (!idSet.has(u.id)) return u;
      const updated = { ...u, ...updateFields };
      updatedUrls.push(updated);
      return updated;
    });

    sitemapUrlIds.forEach((id) => {
      if (!urls.find((u) => u.id === id)) {
        failedIds.push(id);
      }
    });

    this._saveToStorage('sitemap_urls', urls);
    return { updatedUrls, updatedCount: updatedUrls.length, failedIds };
  }

  // ---------------------- Interface Implementations ----------------------

  // getDashboardSummary()
  getDashboardSummary() {
    const sitemaps = this._getFromStorage('sitemaps');
    const urls = this._getFromStorage('sitemap_urls');

    // sitemapCountsByType
    const typeMap = {};
    sitemaps.forEach((s) => {
      if (!typeMap[s.type]) {
        typeMap[s.type] = { type: s.type, total: 0, active: 0, disabled: 0, archived: 0 };
      }
      const entry = typeMap[s.type];
      entry.total += 1;
      if (s.status === 'active') entry.active += 1;
      if (s.status === 'disabled') entry.disabled += 1;
      if (s.status === 'archived') entry.archived += 1;
    });

    const sitemapCountsByType = Object.values(typeMap);

    // sitemapCountsByStatus
    const statusMap = {};
    sitemaps.forEach((s) => {
      if (!statusMap[s.status]) {
        statusMap[s.status] = { status: s.status, count: 0 };
      }
      statusMap[s.status].count += 1;
    });

    const sitemapCountsByStatus = Object.values(statusMap);

    // urlCountsByIndexingStatus
    const indexMap = {};
    urls.forEach((u) => {
      const key = u.indexing_status || 'index';
      if (!indexMap[key]) {
        indexMap[key] = { indexing_status: key, count: 0 };
      }
      indexMap[key].count += 1;
    });

    const urlCountsByIndexingStatus = Object.values(indexMap);

    // errorCountsByStatusCode
    const errorMap = {};
    urls.forEach((u) => {
      if (typeof u.http_status_code !== 'number') return;
      const code = u.http_status_code;
      if (!errorMap[code]) {
        errorMap[code] = { http_status_code: code, url_count: 0 };
      }
      errorMap[code].url_count += 1;
    });

    const errorCountsByStatusCode = Object.values(errorMap);

    return {
      sitemapCountsByType,
      sitemapCountsByStatus,
      urlCountsByIndexingStatus,
      errorCountsByStatusCode,
      lastUpdatedAt: new Date().toISOString()
    };
  }

  // getRecentActivityLog(limit = 10)
  getRecentActivityLog(limit) {
    const lim = typeof limit === 'number' && limit > 0 ? limit : 10;
    let entries = this._getFromStorage('activity_log_entries');
    const sitemaps = this._getFromStorage('sitemaps');
    const urls = this._getFromStorage('sitemap_urls');
    const lists = this._getFromStorage('url_lists');
    const groups = this._getFromStorage('sitemap_groups');

    entries.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    entries = entries.slice(0, lim);

    return entries.map((e) => {
      const sitemap = e.sitemap_id ? sitemaps.find((s) => s.id === e.sitemap_id) || null : null;
      const sitemap_url = e.sitemap_url_id ? urls.find((u) => u.id === e.sitemap_url_id) || null : null;
      const list = e.list_id ? lists.find((l) => l.id === e.list_id) || null : null;
      const group = e.group_id ? groups.find((g) => g.id === e.group_id) || null : null;
      return {
        ...e,
        sitemap,
        sitemap_url,
        list,
        group
      };
    });
  }

  // getSitemapIndexFilterOptions()
  getSitemapIndexFilterOptions() {
    const sitemaps = this._getFromStorage('sitemaps');

    const types = [
      { value: 'product', label: 'Product' },
      { value: 'blog', label: 'Blog' },
      { value: 'category', label: 'Category' },
      { value: 'video', label: 'Video' },
      { value: 'marketing', label: 'Marketing' }
    ];

    const statuses = [
      { value: 'active', label: 'Active' },
      { value: 'disabled', label: 'Disabled' },
      { value: 'archived', label: 'Archived' }
    ];

    const changeFrequencies = [
      { value: 'hourly', label: 'Hourly' },
      { value: 'daily', label: 'Daily' },
      { value: 'weekly', label: 'Weekly' },
      { value: 'monthly', label: 'Monthly' },
      { value: 'yearly', label: 'Yearly' },
      { value: 'never', label: 'Never' }
    ];

    let minUrl = 0;
    let maxUrl = 0;
    let earliest = null;
    let latest = null;

    if (sitemaps.length > 0) {
      minUrl = Math.min(...sitemaps.map((s) => s.url_count));
      maxUrl = Math.max(...sitemaps.map((s) => s.url_count));

      const times = sitemaps.map((s) => new Date(s.last_modified).getTime());
      const minTs = Math.min(...times);
      const maxTs = Math.max(...times);
      earliest = new Date(minTs).toISOString();
      latest = new Date(maxTs).toISOString();
    }

    return {
      types,
      statuses,
      changeFrequencies,
      urlCountRange: { min: minUrl, max: maxUrl },
      lastModifiedRange: { earliest, latest }
    };
  }

  // listSitemaps(...)
  listSitemaps(
    search,
    type,
    status,
    minUrlCount,
    maxUrlCount,
    changeFrequency,
    lastModifiedAfter,
    lastModifiedBefore,
    sortBy,
    sortOrder,
    page,
    pageSize
  ) {
    const sitemaps = this._getFromStorage('sitemaps');

    const filtered = this._applySitemapFilters(sitemaps, {
      search,
      type,
      status,
      minUrlCount,
      maxUrlCount,
      changeFrequency,
      lastModifiedAfter,
      lastModifiedBefore,
      sortBy: sortBy || 'last_modified',
      sortOrder: sortOrder || 'desc'
    });

    const pagination = this._paginate(filtered, page, pageSize);

    return {
      items: pagination.items,
      totalCount: pagination.totalCount,
      page: pagination.page,
      pageSize: pagination.pageSize,
      filtersApplied: {
        search: search || null,
        type: type || null,
        status: status || null,
        minUrlCount: typeof minUrlCount === 'number' ? minUrlCount : null,
        maxUrlCount: typeof maxUrlCount === 'number' ? maxUrlCount : null,
        changeFrequency: changeFrequency || null,
        lastModifiedAfter: lastModifiedAfter || null,
        lastModifiedBefore: lastModifiedBefore || null,
        sortBy: sortBy || 'last_modified',
        sortOrder: sortOrder || 'desc'
      }
    };
  }

  // getSitemapDetails(sitemapId)
  getSitemapDetails(sitemapId) {
    const sitemaps = this._getFromStorage('sitemaps');
    const groups = this._getFromStorage('sitemap_groups');
    const memberships = this._getFromStorage('sitemap_group_memberships');

    const sitemap = sitemaps.find((s) => s.id === sitemapId) || null;
    if (!sitemap) {
      return { sitemap: null, groups: [] };
    }

    const groupIds = memberships
      .filter((m) => m.sitemap_id === sitemapId)
      .map((m) => m.group_id);

    const sitemapGroups = groups.filter((g) => groupIds.includes(g.id));

    return { sitemap, groups: sitemapGroups };
  }

  // createSitemap(...)
  createSitemap(
    url,
    filename,
    display_name,
    type,
    status,
    default_change_frequency,
    default_priority,
    crawl_priority,
    description
  ) {
    const sitemaps = this._getFromStorage('sitemaps');
    const now = new Date().toISOString();

    const derivedFilename = filename || (url ? url.split('/').filter(Boolean).slice(-1)[0] : '');
    const derivedDisplayName = display_name || derivedFilename;

    const settings = this._getGlobalSettingsRecord();

    const sitemap = {
      id: this._generateId('sitemap'),
      filename: derivedFilename,
      url: url,
      display_name: derivedDisplayName,
      type: type,
      status: status,
      url_count: 0,
      default_change_frequency:
        default_change_frequency || settings.default_sitemap_change_frequency || 'daily',
      default_priority:
        typeof default_priority === 'number' ? default_priority : settings.default_sitemap_priority || 0.5,
      crawl_priority: crawl_priority || 'normal',
      last_modified: now,
      created_at: now,
      description: description || ''
    };

    sitemaps.push(sitemap);
    this._saveToStorage('sitemaps', sitemaps);

    this._recordActivityEvent('sitemap_created', `Sitemap created: ${sitemap.filename}`, {
      sitemap_id: sitemap.id
    });

    return {
      success: true,
      sitemap,
      message: 'Sitemap created successfully.'
    };
  }

  // updateSitemap(...)
  updateSitemap(
    sitemapId,
    type,
    status,
    default_change_frequency,
    default_priority,
    crawl_priority,
    display_name,
    description
  ) {
    let sitemaps = this._getFromStorage('sitemaps');
    const index = sitemaps.findIndex((s) => s.id === sitemapId);
    if (index === -1) {
      return { success: false, sitemap: null, message: 'Sitemap not found.' };
    }

    const existing = sitemaps[index];
    const updated = { ...existing };

    const now = new Date().toISOString();

    if (type) updated.type = type;
    if (status) updated.status = status;
    if (default_change_frequency) updated.default_change_frequency = default_change_frequency;
    if (typeof default_priority === 'number') updated.default_priority = default_priority;
    if (crawl_priority) updated.crawl_priority = crawl_priority;
    if (display_name) updated.display_name = display_name;
    if (typeof description === 'string') updated.description = description;

    updated.last_modified = now;

    sitemaps[index] = updated;
    this._saveToStorage('sitemaps', sitemaps);

    this._recordActivityEvent('sitemap_updated', `Sitemap updated: ${updated.filename}`, {
      sitemap_id: updated.id
    });

    if (status && status !== existing.status) {
      this._recordActivityEvent(
        'sitemap_status_changed',
        `Sitemap status changed to ${status}: ${updated.filename}`,
        { sitemap_id: updated.id }
      );
    }

    if (
      default_change_frequency &&
      default_change_frequency !== existing.default_change_frequency
    ) {
      this._recordActivityEvent(
        'sitemap_change_frequency_updated',
        `Sitemap change frequency updated to ${default_change_frequency}: ${updated.filename}`,
        { sitemap_id: updated.id }
      );
    }

    if (crawl_priority && crawl_priority !== existing.crawl_priority) {
      this._recordActivityEvent(
        'sitemap_crawl_priority_updated',
        `Sitemap crawl priority updated to ${crawl_priority}: ${updated.filename}`,
        { sitemap_id: updated.id }
      );
    }

    return {
      success: true,
      sitemap: updated,
      message: 'Sitemap updated successfully.'
    };
  }

  // bulkUpdateSitemapStatus(sitemapIds, status)
  bulkUpdateSitemapStatus(sitemapIds, status) {
    if (!Array.isArray(sitemapIds) || sitemapIds.length === 0) {
      return {
        success: false,
        status,
        updatedCount: 0,
        failedIds: [],
        message: 'No sitemap IDs provided.'
      };
    }

    let sitemaps = this._getFromStorage('sitemaps');
    const idSet = new Set(sitemapIds);
    const failedIds = [];
    let updatedCount = 0;
    const now = new Date().toISOString();

    sitemaps = sitemaps.map((s) => {
      if (!idSet.has(s.id)) return s;
      if (!s) {
        failedIds.push(s.id);
        return s;
      }
      updatedCount += 1;
      return { ...s, status, last_modified: now };
    });

    this._saveToStorage('sitemaps', sitemaps);

    if (updatedCount > 0) {
      this._recordActivityEvent(
        'sitemap_bulk_status_updated',
        `Bulk updated status to ${status} for ${updatedCount} sitemaps`,
        {}
      );
    }

    return {
      success: updatedCount > 0,
      status,
      updatedCount,
      failedIds,
      message: updatedCount > 0 ? 'Sitemap statuses updated.' : 'No sitemaps were updated.'
    };
  }

  // bulkUpdateSitemapChangeFrequency(sitemapIds, new_change_frequency)
  bulkUpdateSitemapChangeFrequency(sitemapIds, new_change_frequency) {
    if (!Array.isArray(sitemapIds) || sitemapIds.length === 0) {
      return {
        success: false,
        new_change_frequency,
        updatedCount: 0,
        failedIds: [],
        message: 'No sitemap IDs provided.'
      };
    }

    let sitemaps = this._getFromStorage('sitemaps');
    const idSet = new Set(sitemapIds);
    const failedIds = [];
    let updatedCount = 0;
    const now = new Date().toISOString();

    sitemaps = sitemaps.map((s) => {
      if (!idSet.has(s.id)) return s;
      if (!s) {
        failedIds.push(s.id);
        return s;
      }
      updatedCount += 1;
      return { ...s, default_change_frequency: new_change_frequency };
    });

    this._saveToStorage('sitemaps', sitemaps);

    if (updatedCount > 0) {
      this._recordActivityEvent(
        'sitemap_bulk_change_frequency_updated',
        `Bulk updated change frequency to ${new_change_frequency} for ${updatedCount} sitemaps`,
        {}
      );
    }

    return {
      success: updatedCount > 0,
      new_change_frequency,
      updatedCount,
      failedIds,
      message: updatedCount > 0 ? 'Change frequency updated.' : 'No sitemaps were updated.'
    };
  }

  // addSitemapsToGroup(sitemapIds, groupId)
  addSitemapsToGroup(sitemapIds, groupId) {
    if (!Array.isArray(sitemapIds) || sitemapIds.length === 0) {
      return {
        success: false,
        group: null,
        addedCount: 0,
        alreadyMemberCount: 0,
        message: 'No sitemap IDs provided.'
      };
    }

    const groups = this._getFromStorage('sitemap_groups');
    let memberships = this._getFromStorage('sitemap_group_memberships');

    const group = groups.find((g) => g.id === groupId) || null;
    if (!group) {
      return {
        success: false,
        group: null,
        addedCount: 0,
        alreadyMemberCount: 0,
        message: 'Group not found.'
      };
    }

    const existingPairs = new Set(
      memberships.map((m) => `${m.group_id}::${m.sitemap_id}`)
    );

    let addedCount = 0;
    let alreadyMemberCount = 0;
    const now = new Date().toISOString();

    sitemapIds.forEach((sid) => {
      const key = `${groupId}::${sid}`;
      if (existingPairs.has(key)) {
        alreadyMemberCount += 1;
        return;
      }
      const membership = {
        id: this._generateId('sgm'),
        group_id: groupId,
        sitemap_id: sid,
        added_at: now
      };
      memberships.push(membership);
      existingPairs.add(key);
      addedCount += 1;

      this._recordActivityEvent(
        'sitemap_added_to_group',
        `Sitemap added to group ${group.name}`,
        { group_id: groupId, sitemap_id: sid }
      );
    });

    this._saveToStorage('sitemap_group_memberships', memberships);

    return {
      success: addedCount > 0,
      group,
      addedCount,
      alreadyMemberCount,
      message:
        addedCount > 0
          ? `Added ${addedCount} sitemaps to group.`
          : 'No sitemaps were added to the group.'
    };
  }

  // createSitemapGroupAndAddSitemaps(name, description, sitemapIds)
  createSitemapGroupAndAddSitemaps(name, description, sitemapIds) {
    if (!Array.isArray(sitemapIds) || sitemapIds.length === 0) {
      return {
        success: false,
        group: null,
        addedCount: 0,
        message: 'No sitemap IDs provided.'
      };
    }

    let groups = this._getFromStorage('sitemap_groups');
    let memberships = this._getFromStorage('sitemap_group_memberships');

    const now = new Date().toISOString();
    const group = {
      id: this._generateId('sitemapgroup'),
      name: name,
      description: description || '',
      created_at: now
    };

    groups.push(group);
    this._saveToStorage('sitemap_groups', groups);

    this._recordActivityEvent('sitemap_group_created', `Sitemap group created: ${group.name}`, {
      group_id: group.id
    });

    let addedCount = 0;
    const existingPairs = new Set(
      memberships.map((m) => `${m.group_id}::${m.sitemap_id}`)
    );

    sitemapIds.forEach((sid) => {
      const key = `${group.id}::${sid}`;
      if (existingPairs.has(key)) return;
      const membership = {
        id: this._generateId('sgm'),
        group_id: group.id,
        sitemap_id: sid,
        added_at: now
      };
      memberships.push(membership);
      existingPairs.add(key);
      addedCount += 1;

      this._recordActivityEvent(
        'sitemap_added_to_group',
        `Sitemap added to group ${group.name}`,
        { group_id: group.id, sitemap_id: sid }
      );
    });

    this._saveToStorage('sitemap_group_memberships', memberships);

    return {
      success: true,
      group,
      addedCount,
      message: 'Sitemap group created and sitemaps added.'
    };
  }

  // listSitemapURLs(...)
  listSitemapURLs(
    sitemapId,
    search,
    urlContains,
    priorityMin,
    priorityMax,
    lastModifiedAfter,
    lastModifiedBefore,
    lastModifiedPreset,
    httpStatusCodes,
    indexingStatus,
    viewMode,
    sortBy,
    sortOrder,
    page,
    pageSize
  ) {
    const sitemaps = this._getFromStorage('sitemaps');
    const allUrls = this._getFromStorage('sitemap_urls');

    const sitemap = sitemaps.find((s) => s.id === sitemapId) || null;
    const urlsForSitemap = allUrls.filter((u) => u.sitemap_id === sitemapId);

    let filtered = this._applyUrlFilters(urlsForSitemap, {
      search,
      urlContains,
      priorityMin,
      priorityMax,
      lastModifiedAfter,
      lastModifiedBefore,
      lastModifiedPreset,
      httpStatusCodes,
      indexingStatus
    });

    const effectiveSortBy = typeof sortBy === 'string' && sortBy ? sortBy : 'last_modified';
    const sortOrderValue = typeof sortOrder === 'string' && sortOrder ? sortOrder : 'desc';
    const effectiveSortOrder = sortOrderValue.toLowerCase() === 'asc' ? 'asc' : 'desc';
    const order = effectiveSortOrder === 'asc' ? 1 : -1;

    filtered.sort((a, b) => {
      let av = a[effectiveSortBy];
      let bv = b[effectiveSortBy];

      if (effectiveSortBy === 'priority') {
        av = Number(av) || 0;
        bv = Number(bv) || 0;
      }

      if (effectiveSortBy === 'last_modified') {
        av = new Date(av).getTime();
        bv = new Date(bv).getTime();
      }

      if (effectiveSortBy === 'http_status_code') {
        av = Number(av) || 0;
        bv = Number(bv) || 0;
      }

      if (av < bv) return -1 * order;
      if (av > bv) return 1 * order;
      return 0;
    });

    const pagination = this._paginate(filtered, page, pageSize);

    // Foreign key resolution: attach sitemap to each URL item
    const itemsWithSitemap = pagination.items.map((u) => ({
      ...u,
      sitemap
    }));

    return {
      sitemap,
      items: itemsWithSitemap,
      totalCount: pagination.totalCount,
      page: pagination.page,
      pageSize: pagination.pageSize,
      filtersApplied: {
        search: search || null,
        urlContains: urlContains || null,
        priorityMin: typeof priorityMin === 'number' ? priorityMin : null,
        priorityMax: typeof priorityMax === 'number' ? priorityMax : null,
        lastModifiedAfter: lastModifiedAfter || null,
        lastModifiedBefore: lastModifiedBefore || null,
        lastModifiedPreset: lastModifiedPreset || null,
        httpStatusCodes: Array.isArray(httpStatusCodes) ? httpStatusCodes : [],
        indexingStatus: indexingStatus || null,
        viewMode: viewMode || null,
        sortBy: effectiveSortBy,
        sortOrder: effectiveSortOrder
      }
    };
  }

  // getSitemapUrlFilterOptions(sitemapId)
  getSitemapUrlFilterOptions(sitemapId) {
    const urls = this._getFromStorage('sitemap_urls').filter(
      (u) => u.sitemap_id === sitemapId
    );

    let minPriority = 0;
    let maxPriority = 0;
    let earliest = null;
    let latest = null;
    const statusCodesSet = new Set();

    if (urls.length > 0) {
      minPriority = Math.min(...urls.map((u) => u.priority));
      maxPriority = Math.max(...urls.map((u) => u.priority));

      const times = urls.map((u) => new Date(u.last_modified).getTime());
      const minTs = Math.min(...times);
      const maxTs = Math.max(...times);
      earliest = new Date(minTs).toISOString();
      latest = new Date(maxTs).toISOString();

      urls.forEach((u) => {
        if (typeof u.http_status_code === 'number') {
          statusCodesSet.add(u.http_status_code);
        }
      });
    }

    const httpStatusCodes = Array.from(statusCodesSet).map((code) => ({
      code,
      label: String(code)
    }));

    const indexingStatuses = [
      { value: 'index', label: 'Index' },
      { value: 'noindex', label: 'Noindex' }
    ];

    const datePresets = [
      { value: 'last_7_days', label: 'Last 7 days' },
      { value: 'last_30_days', label: 'Last 30 days' }
    ];

    return {
      priorityRange: { min: minPriority, max: maxPriority },
      lastModifiedRange: { earliest, latest },
      httpStatusCodes,
      indexingStatuses,
      datePresets
    };
  }

  // bulkAddUrlsToList(sitemapUrlIds, listId, newListName, newListDescription)
  bulkAddUrlsToList(sitemapUrlIds, listId, newListName, newListDescription) {
    if (!Array.isArray(sitemapUrlIds) || sitemapUrlIds.length === 0) {
      return {
        success: false,
        list: null,
        addedCount: 0,
        message: 'No URL IDs provided.'
      };
    }

    let lists = this._getFromStorage('url_lists');
    let list = null;

    if (listId) {
      list = lists.find((l) => l.id === listId) || null;
      if (!list) {
        return {
          success: false,
          list: null,
          addedCount: 0,
          message: 'Target list not found.'
        };
      }
    } else if (newListName) {
      list = this._findOrCreateUrlListByName(newListName, newListDescription || '');
      lists = this._getFromStorage('url_lists');
    } else {
      return {
        success: false,
        list: null,
        addedCount: 0,
        message: 'Either listId or newListName must be provided.'
      };
    }

    let items = this._getFromStorage('url_list_items');
    const existingPairs = new Set(items.map((i) => `${i.list_id}::${i.sitemap_url_id}`));
    let addedCount = 0;
    const now = new Date().toISOString();

    sitemapUrlIds.forEach((uid) => {
      const key = `${list.id}::${uid}`;
      if (existingPairs.has(key)) return;
      const item = {
        id: this._generateId('urlitem'),
        list_id: list.id,
        sitemap_url_id: uid,
        added_at: now
      };
      items.push(item);
      existingPairs.add(key);
      addedCount += 1;
    });

    this._saveToStorage('url_list_items', items);

    if (addedCount > 0) {
      this._recordActivityEvent(
        'urls_added_to_list',
        `Added ${addedCount} URLs to list ${list.name}`,
        { list_id: list.id }
      );
    }

    return {
      success: addedCount > 0,
      list,
      addedCount,
      message:
        addedCount > 0
          ? `Added ${addedCount} URLs to list.`
          : 'No new URLs were added to the list (duplicates skipped).'
    };
  }

  // bulkUpdateUrlIndexingStatus(sitemapUrlIds, indexing_status)
  bulkUpdateUrlIndexingStatus(sitemapUrlIds, indexing_status) {
    if (!Array.isArray(sitemapUrlIds) || sitemapUrlIds.length === 0) {
      return {
        success: false,
        indexing_status,
        updatedCount: 0,
        failedIds: [],
        message: 'No URL IDs provided.'
      };
    }

    const { updatedUrls, updatedCount, failedIds } = this._bulkUpdateSitemapUrls(
      sitemapUrlIds,
      { indexing_status }
    );

    if (updatedCount > 0) {
      this._recordActivityEvent(
        'url_indexing_status_updated',
        `Updated indexing status to ${indexing_status} for ${updatedCount} URLs`,
        {}
      );
    }

    return {
      success: updatedCount > 0,
      indexing_status,
      updatedCount,
      failedIds,
      message: updatedCount > 0 ? 'URL indexing status updated.' : 'No URLs were updated.'
    };
  }

  // listUrlLists(search, page, pageSize)
  listUrlLists(search, page, pageSize) {
    let lists = this._getFromStorage('url_lists');
    const items = this._getFromStorage('url_list_items');

    if (search && search.trim()) {
      const term = search.toLowerCase();
      lists = lists.filter((l) => {
        const n = (l.name || '').toLowerCase();
        const d = (l.description || '').toLowerCase();
        return n.includes(term) || d.includes(term);
      });
    }

    // compute url_count
    const countMap = {};
    items.forEach((i) => {
      if (!countMap[i.list_id]) countMap[i.list_id] = 0;
      countMap[i.list_id] += 1;
    });

    const listsWithCounts = lists.map((l) => ({
      id: l.id,
      name: l.name,
      description: l.description,
      created_at: l.created_at,
      url_count: countMap[l.id] || 0
    }));

    listsWithCounts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const pagination = this._paginate(listsWithCounts, page, pageSize);

    return {
      items: pagination.items,
      totalCount: pagination.totalCount,
      page: pagination.page,
      pageSize: pagination.pageSize
    };
  }

  // getUrlListDetails(...)
  getUrlListDetails(
    listId,
    search,
    urlContains,
    httpStatusCodes,
    indexingStatus,
    priorityMin,
    priorityMax,
    lastModifiedAfter,
    lastModifiedBefore,
    sortBy,
    sortOrder,
    page,
    pageSize
  ) {
    const lists = this._getFromStorage('url_lists');
    const list = lists.find((l) => l.id === listId) || null;

    const memberships = this._getFromStorage('url_list_items').filter(
      (i) => i.list_id === listId
    );
    const urls = this._getFromStorage('sitemap_urls');
    const sitemaps = this._getFromStorage('sitemaps');

    // Build enriched items
    let enriched = memberships.map((m) => {
      const url = urls.find((u) => u.id === m.sitemap_url_id) || null;
      const sitemap = url ? sitemaps.find((s) => s.id === url.sitemap_id) || null : null;

      return {
        list_item_id: m.id,
        sitemap_url_id: url ? url.id : null,
        url: url ? url.url : null,
        sitemap_id: sitemap ? sitemap.id : null,
        sitemap_filename: sitemap ? sitemap.filename : null,
        sitemap_type: sitemap ? sitemap.type : null,
        priority: url ? url.priority : null,
        last_modified: url ? url.last_modified : null,
        http_status_code: url ? url.http_status_code : null,
        indexing_status: url ? url.indexing_status : null,
        sitemap_url_created_at: url ? url.created_at : null,
        added_at: m.added_at,
        // Foreign key resolution objects
        sitemap_url: url,
        sitemap: sitemap
      };
    });

    // Apply filters
    if (search && search.trim()) {
      const term = search.toLowerCase();
      enriched = enriched.filter((e) => {
        const u = (e.url || '').toLowerCase();
        const f = (e.sitemap_filename || '').toLowerCase();
        return u.includes(term) || f.includes(term);
      });
    }

    if (urlContains && urlContains.trim()) {
      const term = urlContains.toLowerCase();
      enriched = enriched.filter((e) => (e.url || '').toLowerCase().includes(term));
    }

    if (Array.isArray(httpStatusCodes) && httpStatusCodes.length > 0) {
      const set = new Set(httpStatusCodes.map((c) => Number(c)));
      enriched = enriched.filter((e) => set.has(Number(e.http_status_code)));
    }

    if (indexingStatus) {
      enriched = enriched.filter((e) => e.indexing_status === indexingStatus);
    }

    if (typeof priorityMin === 'number') {
      enriched = enriched.filter((e) => typeof e.priority === 'number' && e.priority >= priorityMin);
    }

    if (typeof priorityMax === 'number') {
      enriched = enriched.filter((e) => typeof e.priority === 'number' && e.priority <= priorityMax);
    }

    if (lastModifiedAfter) {
      const afterTs = new Date(lastModifiedAfter).getTime();
      enriched = enriched.filter((e) => new Date(e.last_modified).getTime() >= afterTs);
    }

    if (lastModifiedBefore) {
      const beforeTs = new Date(lastModifiedBefore).getTime();
      enriched = enriched.filter((e) => new Date(e.last_modified).getTime() <= beforeTs);
    }

    const effectiveSortBy = sortBy || 'last_modified';
    const sortOrderValue = typeof sortOrder === 'string' && sortOrder ? sortOrder : 'desc';
    const effectiveSortOrder = sortOrderValue.toLowerCase() === 'asc' ? 'asc' : 'desc';
    const order = effectiveSortOrder === 'asc' ? 1 : -1;

    enriched.sort((a, b) => {
      let av = a[effectiveSortBy];
      let bv = b[effectiveSortBy];

      if (effectiveSortBy === 'priority') {
        av = Number(av) || 0;
        bv = Number(bv) || 0;
      }

      if (effectiveSortBy === 'last_modified' || effectiveSortBy === 'added_at') {
        av = new Date(av).getTime();
        bv = new Date(bv).getTime();
      }

      if (effectiveSortBy === 'http_status_code') {
        av = Number(av) || 0;
        bv = Number(bv) || 0;
      }

      if (av < bv) return -1 * order;
      if (av > bv) return 1 * order;
      return 0;
    });

    const pagination = this._paginate(enriched, page, pageSize);

    return {
      list,
      items: pagination.items,
      totalCount: pagination.totalCount,
      page: pagination.page,
      pageSize: pagination.pageSize
    };
  }

  // createUrlList(name, description)
  createUrlList(name, description) {
    const trimmed = (name || '').trim();
    if (!trimmed) {
      return {
        success: false,
        list: null,
        message: 'List name is required.'
      };
    }

    let lists = this._getFromStorage('url_lists');
    const now = new Date().toISOString();
    const list = {
      id: this._generateId('urllist'),
      name: trimmed,
      description: description || '',
      created_at: now
    };

    lists.push(list);
    this._saveToStorage('url_lists', lists);

    return {
      success: true,
      list,
      message: 'URL list created successfully.'
    };
  }

  // renameUrlList(listId, newName)
  renameUrlList(listId, newName) {
    let lists = this._getFromStorage('url_lists');
    const index = lists.findIndex((l) => l.id === listId);
    if (index === -1) {
      return { success: false, list: null, message: 'List not found.' };
    }

    lists[index] = { ...lists[index], name: newName };
    this._saveToStorage('url_lists', lists);

    return {
      success: true,
      list: lists[index],
      message: 'List renamed successfully.'
    };
  }

  // deleteUrlList(listId)
  deleteUrlList(listId) {
    let lists = this._getFromStorage('url_lists');
    const beforeCount = lists.length;
    lists = lists.filter((l) => l.id !== listId);
    this._saveToStorage('url_lists', lists);

    let items = this._getFromStorage('url_list_items');
    items = items.filter((i) => i.list_id !== listId);
    this._saveToStorage('url_list_items', items);

    const removed = beforeCount !== lists.length;

    return {
      success: removed,
      message: removed ? 'List deleted.' : 'List not found.'
    };
  }

  // removeUrlsFromList(listItemIds)
  removeUrlsFromList(listItemIds) {
    if (!Array.isArray(listItemIds) || listItemIds.length === 0) {
      return {
        success: false,
        removedCount: 0,
        message: 'No list item IDs provided.'
      };
    }

    let items = this._getFromStorage('url_list_items');
    const before = items.length;
    const idSet = new Set(listItemIds);

    items = items.filter((i) => !idSet.has(i.id));
    const removedCount = before - items.length;

    this._saveToStorage('url_list_items', items);

    return {
      success: removedCount > 0,
      removedCount,
      message: removedCount > 0 ? 'URLs removed from list.' : 'No URLs were removed.'
    };
  }

  // exportUrlList(listId, format)
  exportUrlList(listId, format) {
    const memberships = this._getFromStorage('url_list_items').filter(
      (i) => i.list_id === listId
    );
    const urls = this._getFromStorage('sitemap_urls');
    const sitemaps = this._getFromStorage('sitemaps');

    const rows = memberships.map((m) => {
      const url = urls.find((u) => u.id === m.sitemap_url_id) || {};
      const sitemap = sitemaps.find((s) => s.id === url.sitemap_id) || {};

      return {
        url: url.url || null,
        sitemap_filename: sitemap.filename || null,
        sitemap_type: sitemap.type || null,
        priority: url.priority || null,
        last_modified: url.last_modified || null,
        http_status_code: url.http_status_code || null,
        indexing_status: url.indexing_status || null
      };
    });

    return {
      format: format,
      rows
    };
  }

  // listSitemapGroups(search, page, pageSize)
  listSitemapGroups(search, page, pageSize) {
    let groups = this._getFromStorage('sitemap_groups');
    const memberships = this._getFromStorage('sitemap_group_memberships');
    const sitemaps = this._getFromStorage('sitemaps');

    if (search && search.trim()) {
      const term = search.toLowerCase();
      groups = groups.filter((g) => {
        const n = (g.name || '').toLowerCase();
        const d = (g.description || '').toLowerCase();
        return n.includes(term) || d.includes(term);
      });
    }

    const membershipByGroup = {};
    memberships.forEach((m) => {
      if (!membershipByGroup[m.group_id]) membershipByGroup[m.group_id] = [];
      membershipByGroup[m.group_id].push(m);
    });

    const sitemapById = {};
    sitemaps.forEach((s) => {
      sitemapById[s.id] = s;
    });

    const groupsWithCounts = groups.map((g) => {
      const groupMemberships = membershipByGroup[g.id] || [];
      const sitemapIds = groupMemberships.map((m) => m.sitemap_id);
      const sitemap_count = sitemapIds.length;
      let aggregate_url_count = 0;
      sitemapIds.forEach((sid) => {
        const s = sitemapById[sid];
        if (s) aggregate_url_count += s.url_count || 0;
      });

      return {
        id: g.id,
        name: g.name,
        description: g.description,
        created_at: g.created_at,
        sitemap_count,
        aggregate_url_count
      };
    });

    groupsWithCounts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const pagination = this._paginate(groupsWithCounts, page, pageSize);

    return {
      items: pagination.items,
      totalCount: pagination.totalCount,
      page: pagination.page,
      pageSize: pagination.pageSize
    };
  }

  // getSitemapGroupDetails(...)
  getSitemapGroupDetails(
    groupId,
    search,
    type,
    status,
    minUrlCount,
    maxUrlCount,
    changeFrequency,
    sortBy,
    sortOrder,
    page,
    pageSize
  ) {
    const groups = this._getFromStorage('sitemap_groups');
    const group = groups.find((g) => g.id === groupId) || null;
    const memberships = this._getFromStorage('sitemap_group_memberships').filter(
      (m) => m.group_id === groupId
    );
    const sitemaps = this._getFromStorage('sitemaps');

    const sitemapIds = memberships.map((m) => m.sitemap_id);
    const memberSitemaps = sitemaps.filter((s) => sitemapIds.includes(s.id));

    const filtered = this._applySitemapFilters(memberSitemaps, {
      search,
      type,
      status,
      minUrlCount,
      maxUrlCount,
      changeFrequency,
      sortBy: sortBy || 'filename',
      sortOrder: sortOrder || 'asc'
    });

    const pagination = this._paginate(filtered, page, pageSize);

    return {
      group,
      sitemaps: pagination.items,
      totalCount: pagination.totalCount,
      page: pagination.page,
      pageSize: pagination.pageSize
    };
  }

  // createSitemapGroup(name, description)
  createSitemapGroup(name, description) {
    let groups = this._getFromStorage('sitemap_groups');
    const now = new Date().toISOString();
    const group = {
      id: this._generateId('sitemapgroup'),
      name,
      description: description || '',
      created_at: now
    };

    groups.push(group);
    this._saveToStorage('sitemap_groups', groups);

    this._recordActivityEvent('sitemap_group_created', `Sitemap group created: ${group.name}`, {
      group_id: group.id
    });

    return {
      success: true,
      group,
      message: 'Sitemap group created successfully.'
    };
  }

  // renameSitemapGroup(groupId, newName)
  renameSitemapGroup(groupId, newName) {
    let groups = this._getFromStorage('sitemap_groups');
    const index = groups.findIndex((g) => g.id === groupId);
    if (index === -1) {
      return {
        success: false,
        group: null,
        message: 'Group not found.'
      };
    }

    groups[index] = { ...groups[index], name: newName };
    this._saveToStorage('sitemap_groups', groups);

    return {
      success: true,
      group: groups[index],
      message: 'Group renamed successfully.'
    };
  }

  // deleteSitemapGroup(groupId)
  deleteSitemapGroup(groupId) {
    let groups = this._getFromStorage('sitemap_groups');
    const before = groups.length;
    groups = groups.filter((g) => g.id !== groupId);
    this._saveToStorage('sitemap_groups', groups);

    let memberships = this._getFromStorage('sitemap_group_memberships');
    memberships = memberships.filter((m) => m.group_id !== groupId);
    this._saveToStorage('sitemap_group_memberships', memberships);

    const removed = before !== groups.length;

    return {
      success: removed,
      message: removed ? 'Group deleted.' : 'Group not found.'
    };
  }

  // removeSitemapsFromGroup(membershipIds)
  removeSitemapsFromGroup(membershipIds) {
    if (!Array.isArray(membershipIds) || membershipIds.length === 0) {
      return {
        success: false,
        removedCount: 0,
        message: 'No membership IDs provided.'
      };
    }

    let memberships = this._getFromStorage('sitemap_group_memberships');
    const before = memberships.length;
    const idSet = new Set(membershipIds);

    memberships = memberships.filter((m) => !idSet.has(m.id));
    const removedCount = before - memberships.length;

    this._saveToStorage('sitemap_group_memberships', memberships);

    return {
      success: removedCount > 0,
      removedCount,
      message: removedCount > 0 ? 'Sitemaps removed from group.' : 'No memberships were removed.'
    };
  }

  // getReportsOverview()
  getReportsOverview() {
    const sitemaps = this._getFromStorage('sitemaps');
    const urls = this._getFromStorage('sitemap_urls');

    // sitemapCoverageByType
    const coverageMap = {};
    sitemaps.forEach((s) => {
      if (!coverageMap[s.type]) {
        coverageMap[s.type] = { type: s.type, sitemap_count: 0, url_count: 0 };
      }
      coverageMap[s.type].sitemap_count += 1;
      coverageMap[s.type].url_count += s.url_count || 0;
    });

    const sitemapCoverageByType = Object.values(coverageMap);

    // highPriorityUrlSummary (priority >= 0.8)
    const sitemapById = {};
    sitemaps.forEach((s) => {
      sitemapById[s.id] = s;
    });

    const highPriorityMap = {};
    urls.forEach((u) => {
      if (u.priority >= 0.8) {
        const sm = sitemapById[u.sitemap_id];
        if (!sm) return;
        if (!highPriorityMap[sm.type]) {
          highPriorityMap[sm.type] = {
            sitemap_type: sm.type,
            url_count_priority_ge_0_8: 0
          };
        }
        highPriorityMap[sm.type].url_count_priority_ge_0_8 += 1;
      }
    });

    const highPriorityUrlSummary = Object.values(highPriorityMap);

    // changeFrequencyDistribution
    const freqMap = {};
    sitemaps.forEach((s) => {
      const freq = s.default_change_frequency;
      if (!freqMap[freq]) {
        freqMap[freq] = { default_change_frequency: freq, sitemap_count: 0 };
      }
      freqMap[freq].sitemap_count += 1;
    });

    const changeFrequencyDistribution = Object.values(freqMap);

    return {
      sitemapCoverageByType,
      highPriorityUrlSummary,
      changeFrequencyDistribution,
      generatedAt: new Date().toISOString()
    };
  }

  // getErrorSummaryReport()
  getErrorSummaryReport() {
    const sitemaps = this._getFromStorage('sitemaps');
    const urls = this._getFromStorage('sitemap_urls');
    const lists = this._getFromStorage('url_lists');
    const listItems = this._getFromStorage('url_list_items');

    const urlsBySitemap = {};
    urls.forEach((u) => {
      if (!urlsBySitemap[u.sitemap_id]) urlsBySitemap[u.sitemap_id] = [];
      urlsBySitemap[u.sitemap_id].push(u);
    });

    const summary_by_sitemap = sitemaps.map((s) => {
      const arr = urlsBySitemap[s.id] || [];
      let url_404_count = 0;
      let url_301_count = 0;
      arr.forEach((u) => {
        if (u.http_status_code === 404) url_404_count += 1;
        if (u.http_status_code === 301) url_301_count += 1;
      });
      return {
        sitemap_id: s.id,
        sitemap_filename: s.filename,
        sitemap_type: s.type,
        url_404_count,
        url_301_count
      };
    });

    const urlsById = {};
    urls.forEach((u) => {
      urlsById[u.id] = u;
    });

    const summary_by_list = lists.map((l) => {
      const itemsForList = listItems.filter((i) => i.list_id === l.id);
      let url_404_count = 0;
      let url_301_count = 0;
      itemsForList.forEach((i) => {
        const u = urlsById[i.sitemap_url_id];
        if (!u) return;
        if (u.http_status_code === 404) url_404_count += 1;
        if (u.http_status_code === 301) url_301_count += 1;
      });
      return {
        list_id: l.id,
        list_name: l.name,
        url_404_count,
        url_301_count
      };
    });

    return {
      summary_by_sitemap,
      summary_by_list
    };
  }

  // exportReport(reportType, format)
  exportReport(reportType, format) {
    const type = reportType;

    if (type === 'overview') {
      const overview = this.getReportsOverview();
      // Combine type + frequency into rows
      const sitemaps = this._getFromStorage('sitemaps');
      const rowsMap = {};
      sitemaps.forEach((s) => {
        const key = `${s.type}::${s.default_change_frequency}`;
        if (!rowsMap[key]) {
          rowsMap[key] = {
            type: s.type,
            sitemap_count: 0,
            url_count: 0,
            default_change_frequency: s.default_change_frequency
          };
        }
        rowsMap[key].sitemap_count += 1;
        rowsMap[key].url_count += s.url_count || 0;
      });
      const overview_rows = Object.values(rowsMap);

      return {
        reportType: type,
        format,
        overview_rows,
        error_summary_rows: []
      };
    }

    if (type === 'error_summary') {
      const summary = this.getErrorSummaryReport();
      const error_summary_rows = [];

      summary.summary_by_sitemap.forEach((s) => {
        error_summary_rows.push({
          scope: 'sitemap',
          scope_id: s.sitemap_id,
          scope_name: s.sitemap_filename,
          url_404_count: s.url_404_count,
          url_301_count: s.url_301_count
        });
      });

      summary.summary_by_list.forEach((l) => {
        error_summary_rows.push({
          scope: 'list',
          scope_id: l.list_id,
          scope_name: l.list_name,
          url_404_count: l.url_404_count,
          url_301_count: l.url_301_count
        });
      });

      return {
        reportType: type,
        format,
        overview_rows: [],
        error_summary_rows
      };
    }

    return {
      reportType: type,
      format,
      overview_rows: [],
      error_summary_rows: []
    };
  }

  // getGlobalSettings()
  getGlobalSettings() {
    return this._getGlobalSettingsRecord();
  }

  // updateGlobalSettings(...)
  updateGlobalSettings(
    default_sitemap_change_frequency,
    default_sitemap_priority,
    timezone,
    date_format,
    default_rows_per_page
  ) {
    const settings = this._getGlobalSettingsRecord();

    if (default_sitemap_change_frequency) {
      settings.default_sitemap_change_frequency = default_sitemap_change_frequency;
    }
    if (typeof default_sitemap_priority === 'number') {
      settings.default_sitemap_priority = default_sitemap_priority;
    }
    if (timezone) {
      settings.timezone = timezone;
    }
    if (date_format) {
      settings.date_format = date_format;
    }
    if (typeof default_rows_per_page === 'number' && default_rows_per_page > 0) {
      settings.default_rows_per_page = default_rows_per_page;
    }

    this._setGlobalSettingsRecord(settings);

    return {
      success: true,
      settings,
      message: 'Global settings updated.'
    };
  }

  // getHelpTopics(currentPage)
  getHelpTopics(currentPage) {
    const topics = this._getFromStorage('help_topics');
    const cp = currentPage || null;

    const suggestedForPage = cp
      ? topics.filter((t) => t.related_page === cp).map((t) => t.id)
      : [];

    return {
      topics,
      suggestedForPage
    };
  }

  // searchHelpContent(query, currentPage)
  searchHelpContent(query, currentPage) {
    const topics = this._getFromStorage('help_topics');
    const q = (query || '').trim().toLowerCase();
    const cp = currentPage || null;

    if (!q) return [];

    return topics
      .filter((t) => {
        if (cp && t.related_page && t.related_page !== cp) return false;
        const title = (t.title || '').toLowerCase();
        const summary = (t.summary || '').toLowerCase();
        return title.includes(q) || summary.includes(q);
      })
      .map((t) => ({
        id: t.id,
        title: t.title,
        excerpt: t.summary,
        related_page: t.related_page
      }));
  }

  // getAboutInfo()
  getAboutInfo() {
    return {
      application_name: 'XML Sitemap Manager',
      version: '1.0.0',
      description:
        'A technical XML sitemap index management tool for organizing, monitoring, and optimizing crawl coverage.',
      technologies: ['JavaScript', 'localStorage', 'Node.js-compatible business logic']
    };
  }

  // getContactInfo()
  getContactInfo() {
    const info = this._getFromStorage('contact_info', {});
    return info;
  }

  // submitContactRequest(subject, message, category, email)
  submitContactRequest(subject, message, category, email) {
    const trimmedSubject = (subject || '').trim();
    const trimmedMessage = (message || '').trim();

    if (!trimmedSubject || !trimmedMessage) {
      return {
        success: false,
        ticketId: null,
        message: 'Subject and message are required.'
      };
    }

    let requests = this._getFromStorage('contact_requests');
    const ticketId = this._generateId('ticket');
    const now = new Date().toISOString();

    const req = {
      id: ticketId,
      subject: trimmedSubject,
      message: trimmedMessage,
      category: category || null,
      email: email || null,
      created_at: now
    };

    requests.push(req);
    this._saveToStorage('contact_requests', requests);

    return {
      success: true,
      ticketId,
      message: 'Your request has been submitted.'
    };
  }

  // ---------------------- High-level Task Execution Helpers ----------------------

  // executeTask_BulkDisableOutdatedLowVolumeSitemaps(lastModifiedBefore, maxUrlCount)
  executeTask_BulkDisableOutdatedLowVolumeSitemaps(lastModifiedBefore, maxUrlCount) {
    const sitemaps = this._getFromStorage('sitemaps');
    const cutoffTs = new Date(lastModifiedBefore).getTime();

    const matched = sitemaps.filter((s) => {
      const lm = new Date(s.last_modified).getTime();
      return (
        s.status === 'active' &&
        lm <= cutoffTs &&
        typeof s.url_count === 'number' &&
        s.url_count <= maxUrlCount
      );
    });

    const ids = matched.map((s) => s.id);
    const bulkResult = this.bulkUpdateSitemapStatus(ids, 'disabled');

    return {
      matchedSitemaps: matched,
      disabledCount: bulkResult.updatedCount,
      success: bulkResult.success,
      message:
        bulkResult.updatedCount > 0
          ? `Disabled ${bulkResult.updatedCount} outdated low-volume sitemaps.`
          : 'No matching sitemaps to disable.'
    };
  }

  // executeTask_PromoteLargestHighVolumeProductSitemap(minUrlCount)
  executeTask_PromoteLargestHighVolumeProductSitemap(minUrlCount) {
    const sitemaps = this._getFromStorage('sitemaps');

    const candidates = sitemaps
      .filter((s) => s.type === 'product' && s.url_count >= minUrlCount)
      .sort((a, b) => b.url_count - a.url_count);

    if (candidates.length === 0) {
      return {
        targetSitemap: null,
        success: false,
        message: 'No product sitemaps meet the minimum URL count.'
      };
    }

    const target = candidates[0];
    const updateResult = this.updateSitemap(
      target.id,
      undefined,
      undefined,
      undefined,
      undefined,
      'high',
      undefined,
      undefined
    );

    return {
      targetSitemap: updateResult.sitemap,
      success: updateResult.success,
      message: updateResult.success
        ? `Promoted sitemap ${updateResult.sitemap.filename} to high crawl priority.`
        : updateResult.message
    };
  }

  // executeTask_AddRecentHighPriorityBlogUrlsToMonitoring(...)
  executeTask_AddRecentHighPriorityBlogUrlsToMonitoring(
    sitemapFilename,
    minPriority,
    daysBack,
    maxUrlsToAdd
  ) {
    const sitemap = this._findSitemapByFilename(sitemapFilename);
    if (!sitemap) {
      return {
        sitemap: null,
        selectedUrls: [],
        list: null,
        addedCount: 0,
        success: false,
        message: 'Sitemap not found.'
      };
    }

    const allUrls = this._getFromStorage('sitemap_urls');
    const urlsForSitemap = allUrls.filter((u) => u.sitemap_id === sitemap.id);

    const now = Date.now();
    const cutoff = now - daysBack * 24 * 60 * 60 * 1000;

    let filtered = urlsForSitemap.filter((u) => {
      const lm = new Date(u.last_modified).getTime();
      return u.priority >= minPriority && lm >= cutoff;
    });

    // Sort by last_modified desc
    filtered.sort(
      (a, b) => new Date(b.last_modified).getTime() - new Date(a.last_modified).getTime()
    );

    const selected = filtered.slice(0, maxUrlsToAdd);
    const ids = selected.map((u) => u.id);

    const list = this._findOrCreateUrlListByName('Monitoring', 'Monitoring list');
    const result = this.bulkAddUrlsToList(ids, list.id, null, null);

    return {
      sitemap,
      selectedUrls: selected,
      list: result.list,
      addedCount: result.addedCount,
      success: result.success,
      message: result.message
    };
  }

  // executeTask_ArchiveLowerVolumeCategoryMonthSitemap(janFilename, febFilename)
  executeTask_ArchiveLowerVolumeCategoryMonthSitemap(janFilename, febFilename) {
    const jan = this._findSitemapByFilename(janFilename);
    const feb = this._findSitemapByFilename(febFilename);

    if (!jan || !feb) {
      return {
        archivedSitemap: null,
        otherSitemap: null,
        success: false,
        message: 'One or both category sitemaps not found.'
      };
    }

    let archiveTarget = jan;
    let other = feb;

    if (feb.url_count < jan.url_count || feb.url_count === jan.url_count) {
      archiveTarget = feb;
      other = jan;
    }

    const updateResult = this.updateSitemap(
      archiveTarget.id,
      undefined,
      'archived',
      undefined,
      undefined,
      undefined,
      undefined,
      undefined
    );

    return {
      archivedSitemap: updateResult.sitemap,
      otherSitemap: other,
      success: updateResult.success,
      message: updateResult.success
        ? `Archived sitemap ${archiveTarget.filename}.`
        : updateResult.message
    };
  }

  // executeTask_GroupActiveHighVolumeVideoSitemaps(minUrlCount, groupName)
  executeTask_GroupActiveHighVolumeVideoSitemaps(minUrlCount, groupName) {
    const sitemaps = this._getFromStorage('sitemaps');

    const matched = sitemaps.filter(
      (s) => s.type === 'video' && s.status === 'active' && s.url_count > minUrlCount
    );

    if (matched.length === 0) {
      return {
        group: null,
        matchedSitemaps: [],
        addedCount: 0,
        success: false,
        message: 'No active high-volume video sitemaps found.'
      };
    }

    const ids = matched.map((s) => s.id);
    const groupResult = this.createSitemapGroupAndAddSitemaps(
      groupName,
      'High-volume video sitemaps',
      ids
    );

    return {
      group: groupResult.group,
      matchedSitemaps: matched,
      addedCount: groupResult.addedCount,
      success: groupResult.success,
      message: groupResult.message
    };
  }

  // executeTask_SetNoindexOnLowPriorityClearanceUrls(...)
  executeTask_SetNoindexOnLowPriorityClearanceUrls(
    sitemapFilename,
    urlContains,
    maxPriority,
    maxUrlsToUpdate
  ) {
    const sitemap = this._findSitemapByFilename(sitemapFilename);
    if (!sitemap) {
      return {
        sitemap: null,
        updatedUrls: [],
        updatedCount: 0,
        success: false,
        message: 'Sitemap not found.'
      };
    }

    const allUrls = this._getFromStorage('sitemap_urls');
    const urlsForSitemap = allUrls.filter((u) => u.sitemap_id === sitemap.id);

    let filtered = this._applyUrlFilters(urlsForSitemap, {
      urlContains,
      priorityMax: maxPriority
    });

    // Sort by last_modified desc (as typical URL table default)
    filtered.sort(
      (a, b) => new Date(b.last_modified).getTime() - new Date(a.last_modified).getTime()
    );

    // Update indexing status for all matching URLs, but only return up to maxUrlsToUpdate
    const allIds = filtered.map((u) => u.id);
    const bulkResult = this.bulkUpdateUrlIndexingStatus(allIds, 'noindex');

    const selected = filtered.slice(0, maxUrlsToUpdate);
    const selectedIds = selected.map((u) => u.id);

    // Re-fetch updated URLs
    const updatedAll = this._getFromStorage('sitemap_urls');
    const updatedUrls = updatedAll.filter((u) => selectedIds.includes(u.id));

    const updatedCount = updatedUrls.length;

    return {
      sitemap,
      updatedUrls,
      updatedCount,
      success: updatedCount > 0,
      message: bulkResult.message
    };
  }

  // executeTask_DowngradeDormantDailySitemaps(cutoffDate)
  executeTask_DowngradeDormantDailySitemaps(cutoffDate) {
    const sitemaps = this._getFromStorage('sitemaps');
    const cutoffTs = new Date(cutoffDate).getTime();

    const matched = sitemaps.filter((s) => {
      const lm = new Date(s.last_modified).getTime();
      return s.default_change_frequency === 'daily' && lm < cutoffTs;
    });

    const ids = matched.map((s) => s.id);
    const bulkResult = this.bulkUpdateSitemapChangeFrequency(ids, 'weekly');

    return {
      matchedSitemaps: matched,
      updatedCount: bulkResult.updatedCount,
      success: bulkResult.success,
      message:
        bulkResult.updatedCount > 0
          ? `Downgraded ${bulkResult.updatedCount} daily sitemaps to weekly.`
          : 'No matching sitemaps to downgrade.'
    };
  }

  // executeTask_SplitErrorsSitemapIntoLists(sitemapFilename)
  executeTask_SplitErrorsSitemapIntoLists(sitemapFilename) {
    const sitemap = this._findSitemapByFilename(sitemapFilename);
    if (!sitemap) {
      return {
        sitemap: null,
        fixErrorsList: null,
        redirectsList: null,
        fixErrorsCount: 0,
        redirectsCount: 0,
        success: false,
        message: 'Sitemap not found.'
      };
    }

    const urls = this._getFromStorage('sitemap_urls').filter(
      (u) => u.sitemap_id === sitemap.id
    );

    const urls404 = urls.filter((u) => u.http_status_code === 404);
    const urls301 = urls.filter((u) => u.http_status_code === 301);

    const ids404 = urls404.map((u) => u.id);
    const ids301 = urls301.map((u) => u.id);

    const fixErrorsList = this._findOrCreateUrlListByName(
      'Fix errors',
      'URLs returning 404 errors'
    );
    const redirectsList = this._findOrCreateUrlListByName(
      'Redirects',
      'URLs returning 301 redirects'
    );

    const result404 = this.bulkAddUrlsToList(ids404, fixErrorsList.id, null, null);
    const result301 = this.bulkAddUrlsToList(ids301, redirectsList.id, null, null);

    return {
      sitemap,
      fixErrorsList: result404.list,
      redirectsList: result301.list,
      fixErrorsCount: result404.addedCount,
      redirectsCount: result301.addedCount,
      success: true,
      message: 'Error URLs split into Fix errors and Redirects lists.'
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
