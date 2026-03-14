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
    this._ensureIdCounter();
    this._initStorage();
  }

  _ensureIdCounter() {
    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
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

  _getFromStorage(key, defaultValue = []) {
    const data = localStorage.getItem(key);
    if (!data) return Array.isArray(defaultValue) ? [] : defaultValue;
    try {
      const parsed = JSON.parse(data);
      return parsed === null ? defaultValue : parsed;
    } catch (e) {
      return Array.isArray(defaultValue) ? [] : defaultValue;
    }
  }

  _saveToStorage(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
  }

  _getObjectFromStorage(key, defaultValue = {}) {
    const data = localStorage.getItem(key);
    if (!data) return defaultValue;
    try {
      const parsed = JSON.parse(data);
      return parsed === null ? defaultValue : parsed;
    } catch (e) {
      return defaultValue;
    }
  }

  _initStorage() {
    // Core entity tables
    if (!localStorage.getItem('storage_items')) {
      this._saveToStorage('storage_items', []);
    }
    if (!localStorage.getItem('file_versions')) {
      this._saveToStorage('file_versions', []);
    }
    if (!localStorage.getItem('share_links')) {
      this._saveToStorage('share_links', []);
    }
    if (!localStorage.getItem('collaborator_permissions')) {
      this._saveToStorage('collaborator_permissions', []);
    }
    if (!localStorage.getItem('incoming_shares')) {
      this._saveToStorage('incoming_shares', []);
    }
    if (!localStorage.getItem('labels')) {
      this._saveToStorage('labels', []);
    }
    if (!localStorage.getItem('item_labels')) {
      this._saveToStorage('item_labels', []);
    }

    // User settings and auxiliary tables
    if (!localStorage.getItem('user_settings')) {
      const defaults = this._defaultUserSettings();
      this._saveToStorage('user_settings', defaults);
    }
    if (!localStorage.getItem('help_topics')) {
      this._saveToStorage('help_topics', { categories: [], topArticles: [] });
    }
    if (!localStorage.getItem('static_pages')) {
      this._saveToStorage('static_pages', {});
    }
    if (!localStorage.getItem('contact_categories')) {
      this._saveToStorage('contact_categories', []);
    }
    if (!localStorage.getItem('support_requests')) {
      this._saveToStorage('support_requests', []);
    }
    if (!localStorage.getItem('storage_usage_cache')) {
      this._saveToStorage('storage_usage_cache', {
        totalUsedBytes: 0,
        totalQuotaBytes: 10 * 1024 * 1024 * 1024,
        usageByFolder: [],
        usageByFileType: [],
        largestItems: []
      });
    }

    // Ensure special root folders exist (Documents, Projects, Videos, Reports)
    let storageItems = this._getFromStorage('storage_items');
    const nowIso = new Date().toISOString();

    const ensureRootFolder = (name) => {
      const exists = storageItems.find(
        (it) => !it.isDeleted && it.itemType === 'folder' && it.parentId == null && it.name === name
      );
      if (exists) return;
      const id = this._generateId('folder');
      const folder = {
        id,
        name,
        itemType: 'folder',
        extension: null,
        fileType: null,
        mimeType: null,
        sizeBytes: 0,
        parentId: null,
        path: '/' + name,
        createdAt: nowIso,
        modifiedAt: nowIso,
        lastOpenedAt: null,
        starred: false,
        isAvailableOffline: false,
        isDeleted: false,
        deletedAt: null,
        originalParentId: null,
        hasVersionHistory: false,
        currentVersionId: null
      };
      storageItems.push(folder);
    };

    ensureRootFolder('Documents');
    ensureRootFolder('Projects');
    ensureRootFolder('Videos');
    ensureRootFolder('Reports');

    this._saveToStorage('storage_items', storageItems);
    this._updateStorageUsageCache();
  }

  _defaultUserSettings() {
    return {
      defaultSortField: 'name',
      defaultSortDirection: 'asc',
      defaultViewMode: 'list',
      language: 'en_us',
      region: 'us',
      defaultLinkAccessLevel: 'only_invited_people',
      defaultLinkPermission: 'can_view',
      defaultLinkAllowDownload: true,
      offlineMaxSizeMb: 1024,
      offlineLowDiskBehavior: 'show_warning_only',
      notificationPreferences: {
        sharingActivity: true,
        versionChanges: true,
        storageLimits: true
      }
    };
  }

  // ---------- Generic helpers ----------

  _parseDate(value) {
    if (!value) return null;
    const d = value instanceof Date ? value : new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }

  _compareValues(a, b, direction) {
    if (a == null && b == null) return 0;
    if (a == null) return direction === 'asc' ? 1 : -1;
    if (b == null) return direction === 'asc' ? -1 : 1;
    if (a < b) return direction === 'asc' ? -1 : 1;
    if (a > b) return direction === 'asc' ? 1 : -1;
    return 0;
  }

  _applyItemFiltersAndSorting(items, sortBy, sortDirection, filters) {
    let result = Array.isArray(items) ? items.slice() : [];
    const f = filters || {};

    if (f.searchQuery) {
      const q = String(f.searchQuery).toLowerCase();
      result = result.filter((it) => (it.name || '').toLowerCase().includes(q));
    }

    if (f.fileType) {
      result = result.filter((it) => it.fileType === f.fileType);
    }

    if (typeof f.onlyStarred === 'boolean') {
      if (f.onlyStarred) {
        result = result.filter((it) => !!it.starred);
      }
    }

    if (f.modifiedFrom) {
      const from = this._parseDate(f.modifiedFrom);
      if (from) {
        result = result.filter((it) => {
          const m = this._parseDate(it.modifiedAt);
          return m && m >= from;
        });
      }
    }

    if (f.modifiedTo) {
      const to = this._parseDate(f.modifiedTo);
      if (to) {
        result = result.filter((it) => {
          const m = this._parseDate(it.modifiedAt);
          return m && m <= to;
        });
      }
    }

    if (typeof f.minSizeBytes === 'number') {
      result = result.filter((it) => (it.sizeBytes || 0) >= f.minSizeBytes);
    }

    if (typeof f.maxSizeBytes === 'number') {
      result = result.filter((it) => (it.sizeBytes || 0) <= f.maxSizeBytes);
    }

    const direction = sortDirection === 'desc' ? 'desc' : 'asc';
    const key = sortBy || 'name';

    result.sort((a, b) => {
      let va;
      let vb;
      switch (key) {
        case 'modified_at':
          va = this._parseDate(a.modifiedAt)?.getTime() || 0;
          vb = this._parseDate(b.modifiedAt)?.getTime() || 0;
          break;
        case 'last_opened_at':
          va = this._parseDate(a.lastOpenedAt)?.getTime() || 0;
          vb = this._parseDate(b.lastOpenedAt)?.getTime() || 0;
          break;
        case 'size':
          va = a.sizeBytes || 0;
          vb = b.sizeBytes || 0;
          break;
        case 'deleted_at':
          va = this._parseDate(a.deletedAt)?.getTime() || 0;
          vb = this._parseDate(b.deletedAt)?.getTime() || 0;
          break;
        case 'name':
        default:
          va = (a.name || '').toLowerCase();
          vb = (b.name || '').toLowerCase();
          break;
      }
      return this._compareValues(va, vb, direction);
    });

    return result;
  }

  _buildBreadcrumbForFolder(folder, allItems) {
    const breadcrumb = [];
    if (!folder) {
      return [{ id: 'root', name: 'My Files' }];
    }
    let current = folder;
    const byId = {};
    (allItems || []).forEach((it) => {
      byId[it.id] = it;
    });
    while (current) {
      breadcrumb.unshift({ id: current.id, name: current.name });
      if (!current.parentId) break;
      current = byId[current.parentId] || null;
    }
    breadcrumb.unshift({ id: 'root', name: 'My Files' });
    return breadcrumb;
  }

  _resolveSpecialFolderId(key) {
    const map = {
      documents: 'Documents',
      projects: 'Projects',
      videos: 'Videos',
      reports: 'Reports'
    };
    const name = map[key];
    if (!name) return null;
    const storageItems = this._getFromStorage('storage_items');
    const folder = storageItems.find(
      (it) => !it.isDeleted && it.itemType === 'folder' && it.parentId == null && it.name === name
    );
    return folder ? folder.id : null;
  }

  _resolveStorageItemForeignKeys(item, allItems, allVersions) {
    if (!item) return null;
    const storageItems = allItems || this._getFromStorage('storage_items');
    const versions = allVersions || this._getFromStorage('file_versions');
    const parent = item.parentId ? storageItems.find((it) => it.id === item.parentId) || null : null;
    const originalParent = item.originalParentId
      ? storageItems.find((it) => it.id === item.originalParentId) || null
      : null;
    const currentVersion = item.currentVersionId
      ? versions.find((v) => v.id === item.currentVersionId) || null
      : null;
    const resolved = { ...item };
    if (parent) resolved.parent = { ...parent };
    else resolved.parent = null;
    if (originalParent) resolved.originalParent = { ...originalParent };
    else resolved.originalParent = null;
    if (currentVersion) resolved.currentVersion = { ...currentVersion };
    else resolved.currentVersion = null;
    return resolved;
  }

  _resolveFileVersionForeignKeys(version, allItems) {
    if (!version) return null;
    const storageItems = allItems || this._getFromStorage('storage_items');
    const item = storageItems.find((it) => it.id === version.storageItemId) || null;
    const resolved = { ...version };
    if (item) resolved.storageItem = this._resolveStorageItemForeignKeys(item, storageItems);
    else resolved.storageItem = null;
    return resolved;
  }

  _resolveShareLinkForeignKeys(link, allItems) {
    if (!link) return null;
    const storageItems = allItems || this._getFromStorage('storage_items');
    const item = storageItems.find((it) => it.id === link.storageItemId) || null;
    const resolved = { ...link };
    if (item) resolved.storageItem = this._resolveStorageItemForeignKeys(item, storageItems);
    else resolved.storageItem = null;
    return resolved;
  }

  _resolveCollaboratorPermissionForeignKeys(collab, allItems) {
    if (!collab) return null;
    const storageItems = allItems || this._getFromStorage('storage_items');
    const item = storageItems.find((it) => it.id === collab.storageItemId) || null;
    const resolved = { ...collab };
    if (item) resolved.storageItem = this._resolveStorageItemForeignKeys(item, storageItems);
    else resolved.storageItem = null;
    return resolved;
  }

  _resolveIncomingShareForeignKeys(share, allItems) {
    if (!share) return null;
    const storageItems = allItems || this._getFromStorage('storage_items');
    const item = storageItems.find((it) => it.id === share.storageItemId) || null;
    const resolved = { ...share };
    if (item) resolved.storageItem = this._resolveStorageItemForeignKeys(item, storageItems);
    else resolved.storageItem = null;
    return resolved;
  }

  _resolveItemLabelForeignKeys(itemLabel, allItems, allLabels) {
    if (!itemLabel) return null;
    const storageItems = allItems || this._getFromStorage('storage_items');
    const labels = allLabels || this._getFromStorage('labels');
    const item = storageItems.find((it) => it.id === itemLabel.storageItemId) || null;
    const label = labels.find((lb) => lb.id === itemLabel.labelId) || null;
    const resolved = { ...itemLabel };
    resolved.storageItem = item ? this._resolveStorageItemForeignKeys(item, storageItems) : null;
    resolved.label = label ? { ...label } : null;
    return resolved;
  }

  _getOrCreatePrimaryShareLink(storageItemId) {
    let shareLinks = this._getFromStorage('share_links');
    let link = shareLinks.find((l) => l.storageItemId === storageItemId) || null;
    const nowIso = new Date().toISOString();
    if (!link) {
      const id = this._generateId('share');
      link = {
        id,
        storageItemId,
        accessLevel: 'only_invited_people',
        permission: 'can_view',
        allowDownload: true,
        expiresAt: null,
        url: 'https://cloud.local/share/' + id,
        isEnabled: true,
        createdAt: nowIso
      };
      shareLinks.push(link);
      this._saveToStorage('share_links', shareLinks);
    }
    return link;
  }

  _ensureLabelExists(name, color, description) {
    const labels = this._getFromStorage('labels');
    const existing = labels.find((l) => l.name.toLowerCase() === String(name).toLowerCase());
    if (existing) return existing;
    const nowIso = new Date().toISOString();
    const label = {
      id: this._generateId('label'),
      name,
      color: color || null,
      description: description || null,
      createdAt: nowIso
    };
    labels.push(label);
    this._saveToStorage('labels', labels);
    return label;
  }

  _getUserSettingsInternal() {
    const settings = this._getObjectFromStorage('user_settings', null);
    if (!settings) {
      const defaults = this._defaultUserSettings();
      this._saveToStorage('user_settings', defaults);
      return defaults;
    }
    return settings;
  }

  _updateStorageUsageCache() {
    const storageItems = this._getFromStorage('storage_items');
    const files = storageItems.filter((it) => !it.isDeleted && it.itemType === 'file');
    const totalUsedBytes = files.reduce((sum, f) => sum + (f.sizeBytes || 0), 0);
    const defaultQuota = 10 * 1024 * 1024 * 1024; // 10 GB

    const usageByFolderMap = {
      documents: { folderKey: 'documents', folderName: 'Documents', usedBytes: 0 },
      projects: { folderKey: 'projects', folderName: 'Projects', usedBytes: 0 },
      videos: { folderKey: 'videos', folderName: 'Videos', usedBytes: 0 },
      reports: { folderKey: 'reports', folderName: 'Reports', usedBytes: 0 },
      other: { folderKey: 'other', folderName: 'Other', usedBytes: 0 }
    };

    const usageByFileTypeMap = {};

    files.forEach((file) => {
      const size = file.sizeBytes || 0;
      const path = file.path || '';
      let key = 'other';
      if (path.startsWith('/Documents')) key = 'documents';
      else if (path.startsWith('/Projects')) key = 'projects';
      else if (path.startsWith('/Videos')) key = 'videos';
      else if (path.startsWith('/Reports')) key = 'reports';
      usageByFolderMap[key].usedBytes += size;

      const ft = file.fileType || 'other';
      if (!usageByFileTypeMap[ft]) {
        usageByFileTypeMap[ft] = { fileType: ft, usedBytes: 0 };
      }
      usageByFileTypeMap[ft].usedBytes += size;
    });

    const usageByFolder = Object.values(usageByFolderMap);
    const usageByFileType = Object.values(usageByFileTypeMap);

    const largestItems = files
      .slice()
      .sort((a, b) => (b.sizeBytes || 0) - (a.sizeBytes || 0));

    const cache = {
      totalUsedBytes,
      totalQuotaBytes: defaultQuota,
      usageByFolder,
      usageByFileType,
      largestItems
    };

    this._saveToStorage('storage_usage_cache', cache);
    return cache;
  }

  _detectFileTypeFromExtension(ext) {
    const e = (ext || '').toLowerCase();
    if (e === 'pdf') return 'pdf';
    if (e === 'doc' || e === 'docx' || e === 'txt' || e === 'md') return 'document';
    if (e === 'xls' || e === 'xlsx' || e === 'csv') return 'spreadsheet';
    if (e === 'mp4' || e === 'mov' || e === 'avi' || e === 'mkv') return 'video';
    if (e === 'jpg' || e === 'jpeg' || e === 'png' || e === 'gif' || e === 'bmp' || e === 'webp') return 'image';
    if (e === 'zip' || e === 'rar' || e === '7z' || e === 'tar' || e === 'gz') return 'archive';
    return 'other';
  }

  _updateItemPathAndDescendants(item, newPath, storageItems) {
    const items = storageItems || this._getFromStorage('storage_items');
    const oldPath = item.path || '';
    item.path = newPath;
    if (!oldPath) return;
    const prefix = oldPath.endsWith('/') ? oldPath : oldPath + '/';
    const newPrefix = newPath.endsWith('/') ? newPath : newPath + '/';
    items.forEach((it) => {
      if (it.id === item.id) return;
      if (it.path && it.path.startsWith(prefix)) {
        it.path = newPrefix + it.path.substring(prefix.length);
      }
    });
  }

  // ---------- Core interface implementations ----------

  // getSidebarOverview()
  getSidebarOverview() {
    const storageItems = this._getFromStorage('storage_items');
    const incomingShares = this._getFromStorage('incoming_shares');
    const trashCount = storageItems.filter((it) => it.isDeleted).length;

    const cache = this._getObjectFromStorage('storage_usage_cache', this._updateStorageUsageCache());
    const totalUsed = cache.totalUsedBytes || 0;
    const totalQuota = cache.totalQuotaBytes || 10 * 1024 * 1024 * 1024;
    const isNearLimit = totalQuota > 0 ? totalUsed / totalQuota >= 0.8 : false;

    const sections = [
      { key: 'my_files_root', label: 'My Files', badgeCount: 0 },
      { key: 'documents', label: 'Documents', badgeCount: 0 },
      { key: 'projects', label: 'Projects', badgeCount: 0 },
      { key: 'videos', label: 'Videos', badgeCount: 0 },
      { key: 'reports', label: 'Reports', badgeCount: 0 },
      { key: 'recent', label: 'Recent', badgeCount: 0 },
      { key: 'shared_with_me', label: 'Shared with me', badgeCount: incomingShares.length },
      { key: 'storage', label: 'Storage', badgeCount: 0 },
      { key: 'trash', label: 'Trash', badgeCount: trashCount }
    ];

    return {
      sections,
      storageSummary: {
        totalUsedBytes: totalUsed,
        totalQuotaBytes: totalQuota,
        isNearLimit
      },
      trashItemsCount: trashCount
    };
  }

  // getSpecialFolder(key)
  getSpecialFolder(key) {
    const id = this._resolveSpecialFolderId(key);
    if (!id) return null;
    const storageItems = this._getFromStorage('storage_items');
    const folder = storageItems.find((it) => it.id === id) || null;
    return this._resolveStorageItemForeignKeys(folder, storageItems);
  }

  // getRootFolderContents(sortBy, sortDirection, filters)
  getRootFolderContents(sortBy, sortDirection, filters) {
    const storageItems = this._getFromStorage('storage_items');
    let items = storageItems.filter((it) => !it.isDeleted && it.parentId == null);
    items = this._applyItemFiltersAndSorting(items, sortBy || 'name', sortDirection || 'asc', filters || {});
    const resolvedItems = items.map((it) => this._resolveStorageItemForeignKeys(it, storageItems));
    const breadcrumb = [{ id: 'root', name: 'My Files' }];

    return {
      items: resolvedItems,
      breadcrumb,
      totalCount: resolvedItems.length,
      hasMore: false
    };
  }

  // getFolderContents(folderId, sortBy, sortDirection, filters)
  getFolderContents(folderId, sortBy, sortDirection, filters) {
    const storageItems = this._getFromStorage('storage_items');
    const folder = storageItems.find((it) => it.id === folderId && it.itemType === 'folder') || null;
    if (!folder || folder.isDeleted) {
      return {
        folder: null,
        items: [],
        breadcrumb: [{ id: 'root', name: 'My Files' }],
        totalCount: 0,
        hasMore: false
      };
    }
    let items = storageItems.filter((it) => !it.isDeleted && it.parentId === folderId);
    items = this._applyItemFiltersAndSorting(items, sortBy || 'name', sortDirection || 'asc', filters || {});
    const resolvedFolder = this._resolveStorageItemForeignKeys(folder, storageItems);
    const resolvedItems = items.map((it) => this._resolveStorageItemForeignKeys(it, storageItems));
    const breadcrumb = this._buildBreadcrumbForFolder(folder, storageItems);

    return {
      folder: resolvedFolder,
      items: resolvedItems,
      breadcrumb,
      totalCount: resolvedItems.length,
      hasMore: false
    };
  }

  // createFolder(parentFolderId, name)
  createFolder(parentFolderId, name) {
    const storageItems = this._getFromStorage('storage_items');
    const parent = storageItems.find((it) => it.id === parentFolderId && it.itemType === 'folder' && !it.isDeleted);
    if (!parent) {
      return { success: false, folder: null, message: 'Parent folder not found or invalid.' };
    }
    const nowIso = new Date().toISOString();
    const id = this._generateId('folder');
    const path = (parent.path || '') + '/' + name;
    const folder = {
      id,
      name,
      itemType: 'folder',
      extension: null,
      fileType: null,
      mimeType: null,
      sizeBytes: 0,
      parentId: parent.id,
      path,
      createdAt: nowIso,
      modifiedAt: nowIso,
      lastOpenedAt: null,
      starred: false,
      isAvailableOffline: false,
      isDeleted: false,
      deletedAt: null,
      originalParentId: null,
      hasVersionHistory: false,
      currentVersionId: null
    };
    storageItems.push(folder);
    this._saveToStorage('storage_items', storageItems);
    this._updateStorageUsageCache();

    return {
      success: true,
      folder: this._resolveStorageItemForeignKeys(folder, storageItems),
      message: 'Folder created.'
    };
  }

  // uploadFilesToFolder(parentFolderId, files)
  uploadFilesToFolder(parentFolderId, files) {
    const storageItems = this._getFromStorage('storage_items');
    const parent = storageItems.find((it) => it.id === parentFolderId && it.itemType === 'folder' && !it.isDeleted);
    if (!parent) {
      return [];
    }
    const nowIso = new Date().toISOString();
    const createdItems = [];

    (files || []).forEach((f) => {
      const name = f.name;
      let ext = f.extension;
      if (!ext && typeof name === 'string' && name.includes('.')) {
        ext = name.split('.').pop();
      }
      const fileType = this._detectFileTypeFromExtension(ext);
      const id = this._generateId('file');
      const path = (parent.path || '') + '/' + name;
      const item = {
        id,
        name,
        itemType: 'file',
        extension: ext || null,
        fileType,
        mimeType: f.mimeType || null,
        sizeBytes: typeof f.sizeBytes === 'number' ? f.sizeBytes : 0,
        parentId: parent.id,
        path,
        createdAt: nowIso,
        modifiedAt: nowIso,
        lastOpenedAt: null,
        starred: false,
        isAvailableOffline: false,
        isDeleted: false,
        deletedAt: null,
        originalParentId: null,
        hasVersionHistory: false,
        currentVersionId: null
      };
      storageItems.push(item);
      createdItems.push(item);
    });

    this._saveToStorage('storage_items', storageItems);
    this._updateStorageUsageCache();

    return createdItems.map((it) => this._resolveStorageItemForeignKeys(it, storageItems));
  }

  // searchFolderItems(folderId, query, filters, sortBy, sortDirection)
  searchFolderItems(folderId, query, filters, sortBy, sortDirection) {
    const storageItems = this._getFromStorage('storage_items');
    const folder = storageItems.find((it) => it.id === folderId && it.itemType === 'folder');
    if (!folder || folder.isDeleted) {
      return { items: [], totalCount: 0, hasMore: false };
    }
    const basePath = folder.path || '';
    let items = storageItems.filter((it) => {
      if (it.isDeleted) return false;
      if (!it.path) return false;
      if (it.id === folder.id) return false;
      return it.path === basePath || it.path.startsWith(basePath + '/');
    });

    if (query) {
      const q = String(query).toLowerCase();
      items = items.filter((it) => (it.name || '').toLowerCase().includes(q));
    }

    const effectiveFilters = filters || {};
    items = this._applyItemFiltersAndSorting(
      items,
      sortBy && sortBy !== 'relevance' ? sortBy : 'name',
      sortDirection || 'asc',
      effectiveFilters
    );

    const resolvedItems = items.map((it) => this._resolveStorageItemForeignKeys(it, storageItems));
    return {
      items: resolvedItems,
      totalCount: resolvedItems.length,
      hasMore: false
    };
  }

  // globalSearchItems(query, filters, sortBy, sortDirection)
  globalSearchItems(query, filters, sortBy, sortDirection) {
    const storageItems = this._getFromStorage('storage_items');
    const f = filters || {};
    let items = storageItems.filter((it) => !it.isDeleted);

    if (query) {
      const q = String(query).toLowerCase();
      items = items.filter((it) => (it.name || '').toLowerCase().includes(q));
    }

    if (f.fileType) {
      items = items.filter((it) => it.fileType === f.fileType);
    }

    if (f.modifiedFrom) {
      const from = this._parseDate(f.modifiedFrom);
      if (from) {
        items = items.filter((it) => {
          const m = this._parseDate(it.modifiedAt);
          return m && m >= from;
        });
      }
    }

    if (f.modifiedTo) {
      const to = this._parseDate(f.modifiedTo);
      if (to) {
        items = items.filter((it) => {
          const m = this._parseDate(it.modifiedAt);
          return m && m <= to;
        });
      }
    }

    if (typeof f.minSizeBytes === 'number') {
      items = items.filter((it) => (it.sizeBytes || 0) >= f.minSizeBytes);
    }

    if (typeof f.maxSizeBytes === 'number') {
      items = items.filter((it) => (it.sizeBytes || 0) <= f.maxSizeBytes);
    }

    if (f.pathPrefix) {
      const prefix = String(f.pathPrefix);
      items = items.filter((it) => (it.path || '').startsWith(prefix));
    }

    const sortField = sortBy && sortBy !== 'relevance' ? sortBy : 'name';
    const direction = sortDirection || 'desc';

    items = this._applyItemFiltersAndSorting(items, sortField, direction, {});
    const resolvedItems = items.map((it) => this._resolveStorageItemForeignKeys(it, storageItems));

    return {
      items: resolvedItems,
      totalCount: resolvedItems.length,
      hasMore: false
    };
  }

  // moveItemsToFolder(itemIds, destinationFolderId)
  moveItemsToFolder(itemIds, destinationFolderId) {
    const storageItems = this._getFromStorage('storage_items');
    const dest = storageItems.find((it) => it.id === destinationFolderId && it.itemType === 'folder' && !it.isDeleted);
    if (!dest) {
      return { success: false, movedItemIds: [], destinationFolder: null, message: 'Destination folder not found.' };
    }
    const destPath = dest.path || '';
    const movedIds = [];

    (itemIds || []).forEach((id) => {
      const item = storageItems.find((it) => it.id === id && !it.isDeleted);
      if (!item) return;
      if (item.id === dest.id) return;
      const itemPath = item.path || '';
      if (item.itemType === 'folder' && destPath && itemPath && destPath.startsWith(itemPath + '/')) {
        return; // avoid moving folder into own descendant
      }
      item.parentId = dest.id;
      const newPath = destPath + '/' + item.name;
      this._updateItemPathAndDescendants(item, newPath, storageItems);
      item.modifiedAt = new Date().toISOString();
      movedIds.push(item.id);
    });

    this._saveToStorage('storage_items', storageItems);
    this._updateStorageUsageCache();

    // Instrumentation for task completion tracking (task3_archiveMoveParams)
    try {
      if (dest && !dest.isDeleted && dest.itemType === 'folder' && dest.path === '/Videos/Archive') {
        const value = {
          movedItemIds: movedIds,
          destinationFolderId: dest.id,
          destinationPath: dest.path,
          timestamp: new Date().toISOString()
        };
        localStorage.setItem('task3_archiveMoveParams', JSON.stringify(value));
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      success: true,
      movedItemIds: movedIds,
      destinationFolder: this._resolveStorageItemForeignKeys(dest, storageItems),
      message: 'Items moved.'
    };
  }

  // copyItemsToFolder(itemIds, destinationFolderId)
  copyItemsToFolder(itemIds, destinationFolderId) {
    const storageItems = this._getFromStorage('storage_items');
    const dest = storageItems.find((it) => it.id === destinationFolderId && it.itemType === 'folder' && !it.isDeleted);
    if (!dest) {
      return { success: false, copiedItems: [], message: 'Destination folder not found.' };
    }
    const destPath = dest.path || '';
    const nowIso = new Date().toISOString();
    const copiedItems = [];

    (itemIds || []).forEach((id) => {
      const src = storageItems.find((it) => it.id === id && !it.isDeleted);
      if (!src) return;
      const copyId = this._generateId('copy');
      const newPath = destPath + '/' + src.name;
      const copy = {
        ...src,
        id: copyId,
        parentId: dest.id,
        path: newPath,
        createdAt: nowIso,
        modifiedAt: nowIso,
        isDeleted: false,
        deletedAt: null,
        originalParentId: null
      };
      storageItems.push(copy);
      copiedItems.push(copy);
    });

    this._saveToStorage('storage_items', storageItems);
    this._updateStorageUsageCache();

    return {
      success: true,
      copiedItems: copiedItems.map((it) => this._resolveStorageItemForeignKeys(it, storageItems)),
      message: 'Items copied.'
    };
  }

  // renameItem(itemId, newName)
  renameItem(itemId, newName) {
    const storageItems = this._getFromStorage('storage_items');
    const item = storageItems.find((it) => it.id === itemId && !it.isDeleted);
    if (!item) {
      return { success: false, item: null, message: 'Item not found.' };
    }
    const oldPath = item.path || '';
    item.name = newName;
    if (item.itemType === 'file') {
      if (newName && newName.includes('.')) {
        const ext = newName.split('.').pop();
        item.extension = ext;
        item.fileType = this._detectFileTypeFromExtension(ext);
      }
    }
    const parentPath = item.parentId
      ? (storageItems.find((it) => it.id === item.parentId) || {}).path || ''
      : '';
    const newPath = parentPath + '/' + newName;
    this._updateItemPathAndDescendants({ ...item, path: oldPath }, newPath, storageItems);
    item.modifiedAt = new Date().toISOString();

    this._saveToStorage('storage_items', storageItems);
    this._updateStorageUsageCache();

    return {
      success: true,
      item: this._resolveStorageItemForeignKeys(item, storageItems),
      message: 'Item renamed.'
    };
  }

  // setItemStarStatus(itemId, starred)
  setItemStarStatus(itemId, starred) {
    const storageItems = this._getFromStorage('storage_items');
    const item = storageItems.find((it) => it.id === itemId);
    if (!item) {
      return { success: false, item: null, message: 'Item not found.' };
    }
    item.starred = !!starred;
    item.modifiedAt = new Date().toISOString();

    this._saveToStorage('storage_items', storageItems);
    return {
      success: true,
      item: this._resolveStorageItemForeignKeys(item, storageItems),
      message: starred ? 'Item starred.' : 'Item unstarred.'
    };
  }

  // setItemsOfflineStatus(itemIds, isAvailableOffline)
  setItemsOfflineStatus(itemIds, isAvailableOffline) {
    const storageItems = this._getFromStorage('storage_items');
    const updatedIds = [];

    (itemIds || []).forEach((id) => {
      const item = storageItems.find((it) => it.id === id && !it.isDeleted);
      if (!item) return;
      item.isAvailableOffline = !!isAvailableOffline;
      item.modifiedAt = new Date().toISOString();
      updatedIds.push(item.id);
    });

    this._saveToStorage('storage_items', storageItems);

    return {
      success: true,
      updatedItemIds: updatedIds,
      message: isAvailableOffline ? 'Items set to available offline.' : 'Items set to online only.'
    };
  }

  // softDeleteItems(itemIds)
  softDeleteItems(itemIds) {
    let storageItems = this._getFromStorage('storage_items');
    const nowIso = new Date().toISOString();
    const deletedIds = [];

    const markDeletedRecursive = (item) => {
      if (item.isDeleted) return;
      item.isDeleted = true;
      item.deletedAt = nowIso;
      if (!item.originalParentId) {
        item.originalParentId = item.parentId || null;
      }
      deletedIds.push(item.id);
      if (item.itemType === 'folder' && item.path) {
        const prefix = item.path.endsWith('/') ? item.path : item.path + '/';
        storageItems.forEach((it) => {
          if (it.isDeleted) return;
          if (it.path && it.path.startsWith(prefix)) {
            markDeletedRecursive(it);
          }
        });
      }
    };

    (itemIds || []).forEach((id) => {
      const item = storageItems.find((it) => it.id === id);
      if (!item) return;
      markDeletedRecursive(item);
    });

    this._saveToStorage('storage_items', storageItems);
    this._updateStorageUsageCache();

    return {
      success: true,
      deletedItemIds: deletedIds,
      message: 'Items moved to Trash.'
    };
  }

  // restoreItemsFromTrash(itemIds)
  restoreItemsFromTrash(itemIds) {
    const storageItems = this._getFromStorage('storage_items');
    const restored = [];

    const restoreRecursive = (item) => {
      if (!item.isDeleted) return;
      item.isDeleted = false;
      item.deletedAt = null;
      if (item.originalParentId) {
        item.parentId = item.originalParentId;
      }
      restored.push(item);
      if (item.itemType === 'folder' && item.path) {
        const prefix = item.path.endsWith('/') ? item.path : item.path + '/';
        storageItems.forEach((it) => {
          if (!it.isDeleted) return;
          if (it.path && it.path.startsWith(prefix)) {
            restoreRecursive(it);
          }
        });
      }
    };

    (itemIds || []).forEach((id) => {
      const item = storageItems.find((it) => it.id === id);
      if (!item) return;
      restoreRecursive(item);
    });

    this._saveToStorage('storage_items', storageItems);
    this._updateStorageUsageCache();

    const resolved = restored.map((it) => this._resolveStorageItemForeignKeys(it, storageItems));
    return {
      success: true,
      restoredItems: resolved,
      message: 'Items restored from Trash.'
    };
  }

  // permanentlyDeleteItems(itemIds)
  permanentlyDeleteItems(itemIds) {
    let storageItems = this._getFromStorage('storage_items');
    let fileVersions = this._getFromStorage('file_versions');
    let shareLinks = this._getFromStorage('share_links');
    let collaboratorPermissions = this._getFromStorage('collaborator_permissions');
    let incomingShares = this._getFromStorage('incoming_shares');
    let itemLabels = this._getFromStorage('item_labels');

    const toDeleteIds = new Set();

    (itemIds || []).forEach((id) => {
      const item = storageItems.find((it) => it.id === id);
      if (!item) return;
      toDeleteIds.add(item.id);
      if (item.itemType === 'folder' && item.path) {
        const prefix = item.path.endsWith('/') ? item.path : item.path + '/';
        storageItems.forEach((it) => {
          if (it.path && it.path.startsWith(prefix)) {
            toDeleteIds.add(it.id);
          }
        });
      }
    });

    const idsArray = Array.from(toDeleteIds);

    // Instrumentation for task completion tracking (task3_permanentDeleteParams)
    try {
      const value = {
        permanentlyDeletedItemIds: idsArray,
        timestamp: new Date().toISOString()
      };
      localStorage.setItem('task3_permanentDeleteParams', JSON.stringify(value));
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    storageItems = storageItems.filter((it) => !toDeleteIds.has(it.id));
    fileVersions = fileVersions.filter((v) => !toDeleteIds.has(v.storageItemId));
    shareLinks = shareLinks.filter((l) => !toDeleteIds.has(l.storageItemId));
    collaboratorPermissions = collaboratorPermissions.filter((c) => !toDeleteIds.has(c.storageItemId));
    incomingShares = incomingShares.filter((s) => !toDeleteIds.has(s.storageItemId));
    itemLabels = itemLabels.filter((il) => !toDeleteIds.has(il.storageItemId));

    this._saveToStorage('storage_items', storageItems);
    this._saveToStorage('file_versions', fileVersions);
    this._saveToStorage('share_links', shareLinks);
    this._saveToStorage('collaborator_permissions', collaboratorPermissions);
    this._saveToStorage('incoming_shares', incomingShares);
    this._saveToStorage('item_labels', itemLabels);
    this._updateStorageUsageCache();

    return {
      success: true,
      permanentlyDeletedItemIds: idsArray,
      message: 'Items permanently deleted.'
    };
  }

  // getSharingSettingsForItem(storageItemId)
  getSharingSettingsForItem(storageItemId) {
    const storageItems = this._getFromStorage('storage_items');
    const item = storageItems.find((it) => it.id === storageItemId) || null;
    const collaborators = this._getFromStorage('collaborator_permissions').filter(
      (c) => c.storageItemId === storageItemId
    );
    const shareLinks = this._getFromStorage('share_links').filter(
      (l) => l.storageItemId === storageItemId
    );

    const resolvedItem = this._resolveStorageItemForeignKeys(item, storageItems);
    const resolvedCollaborators = collaborators.map((c) =>
      this._resolveCollaboratorPermissionForeignKeys(c, storageItems)
    );
    const resolvedShareLinks = shareLinks.map((l) => this._resolveShareLinkForeignKeys(l, storageItems));

    const userSettings = this._getUserSettingsInternal();

    return {
      item: resolvedItem,
      collaborators: resolvedCollaborators,
      shareLinks: resolvedShareLinks,
      defaults: {
        defaultAccessLevel: userSettings.defaultLinkAccessLevel,
        defaultPermission: userSettings.defaultLinkPermission,
        defaultAllowDownload: userSettings.defaultLinkAllowDownload
      }
    };
  }

  // updateCollaboratorsForItem(storageItemId, collaborators)
  updateCollaboratorsForItem(storageItemId, collaborators) {
    let existing = this._getFromStorage('collaborator_permissions');
    const nowIso = new Date().toISOString();

    (collaborators || []).forEach((c) => {
      const name = c.collaboratorName;
      if (!name) return;
      let entry = existing.find(
        (e) => e.storageItemId === storageItemId && e.collaboratorName === name
      );
      if (!entry) {
        entry = {
          id: this._generateId('collab'),
          storageItemId,
          collaboratorName: name,
          role: c.role === 'editor' ? 'editor' : 'viewer',
          allowDownload: typeof c.allowDownload === 'boolean' ? c.allowDownload : true,
          addedAt: nowIso,
          lastUpdatedAt: nowIso
        };
        existing.push(entry);
      } else {
        entry.role = c.role === 'editor' ? 'editor' : 'viewer';
        if (typeof c.allowDownload === 'boolean') {
          entry.allowDownload = c.allowDownload;
        }
        entry.lastUpdatedAt = nowIso;
      }
    });

    this._saveToStorage('collaborator_permissions', existing);
    const storageItems = this._getFromStorage('storage_items');
    return existing
      .filter((e) => e.storageItemId === storageItemId)
      .map((e) => this._resolveCollaboratorPermissionForeignKeys(e, storageItems));
  }

  // upsertShareLinkForItem(storageItemId, accessLevel, permission, allowDownload, expiresAt, enable)
  upsertShareLinkForItem(storageItemId, accessLevel, permission, allowDownload, expiresAt, enable) {
    let shareLinks = this._getFromStorage('share_links');
    let link = shareLinks.find((l) => l.storageItemId === storageItemId) || null;
    const nowIso = new Date().toISOString();

    if (!link) {
      const id = this._generateId('share');
      link = {
        id,
        storageItemId,
        accessLevel: accessLevel === 'anyone_with_link' ? 'anyone_with_link' : 'only_invited_people',
        permission: permission === 'can_edit' ? 'can_edit' : 'can_view',
        allowDownload: !!allowDownload,
        expiresAt: expiresAt ? this._parseDate(expiresAt)?.toISOString() : null,
        url: 'https://cloud.local/share/' + id,
        isEnabled: enable === false ? false : true,
        createdAt: nowIso
      };
      shareLinks.push(link);
    } else {
      link.accessLevel = accessLevel === 'anyone_with_link' ? 'anyone_with_link' : 'only_invited_people';
      link.permission = permission === 'can_edit' ? 'can_edit' : 'can_view';
      link.allowDownload = !!allowDownload;
      link.expiresAt = expiresAt ? this._parseDate(expiresAt)?.toISOString() : null;
      link.isEnabled = enable === false ? false : true;
    }

    this._saveToStorage('share_links', shareLinks);
    const storageItems = this._getFromStorage('storage_items');
    return this._resolveShareLinkForeignKeys(link, storageItems);
  }

  // getStorageOverview()
  getStorageOverview() {
    const cache = this._updateStorageUsageCache();
    const storageItems = this._getFromStorage('storage_items');
    const resolvedLargest = (cache.largestItems || []).map((it) =>
      this._resolveStorageItemForeignKeys(it, storageItems)
    );
    return {
      totalUsedBytes: cache.totalUsedBytes,
      totalQuotaBytes: cache.totalQuotaBytes,
      usageByFolder: cache.usageByFolder || [],
      usageByFileType: cache.usageByFileType || [],
      largestItems: resolvedLargest
    };
  }

  // getStorageFileList(filters, sortBy, sortDirection)
  getStorageFileList(filters, sortBy, sortDirection) {
    const storageItems = this._getFromStorage('storage_items');
    const f = filters || {};
    let items = storageItems.filter((it) => !it.isDeleted && it.itemType === 'file');

    if (f.fileType) {
      items = items.filter((it) => it.fileType === f.fileType);
    }
    if (typeof f.minSizeBytes === 'number') {
      items = items.filter((it) => (it.sizeBytes || 0) >= f.minSizeBytes);
    }
    if (typeof f.maxSizeBytes === 'number') {
      items = items.filter((it) => (it.sizeBytes || 0) <= f.maxSizeBytes);
    }

    const key = sortBy || 'size';
    const direction = sortDirection || 'desc';

    items.sort((a, b) => {
      let va;
      let vb;
      switch (key) {
        case 'name':
          va = (a.name || '').toLowerCase();
          vb = (b.name || '').toLowerCase();
          break;
        case 'modified_at':
          va = this._parseDate(a.modifiedAt)?.getTime() || 0;
          vb = this._parseDate(b.modifiedAt)?.getTime() || 0;
          break;
        case 'size':
        default:
          va = a.sizeBytes || 0;
          vb = b.sizeBytes || 0;
          break;
      }
      return this._compareValues(va, vb, direction);
    });

    // Instrumentation for task completion tracking (task3_videoFilterParams)
    try {
      if (
        filters &&
        filters.fileType === 'video' &&
        typeof filters.minSizeBytes === 'number' &&
        filters.minSizeBytes >= 500 * 1024 * 1024 &&
        (sortBy === 'size' || sortBy == null) &&
        (sortDirection === 'desc' || sortDirection == null)
      ) {
        const value = {
          filtersUsed: {
            fileType: filters.fileType,
            minSizeBytes: filters.minSizeBytes || null,
            maxSizeBytes: filters.maxSizeBytes || null
          },
          sortBy: sortBy || 'size',
          sortDirection: sortDirection || 'desc',
          topThreeIds: items.slice(0, 3).map((it) => it.id)
        };
        localStorage.setItem('task3_videoFilterParams', JSON.stringify(value));
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    const resolved = items.map((it) => this._resolveStorageItemForeignKeys(it, storageItems));
    return {
      items: resolved,
      totalCount: resolved.length,
      hasMore: false
    };
  }

  // getRecentItems(filters, sortBy, sortDirection)
  getRecentItems(filters, sortBy, sortDirection) {
    const storageItems = this._getFromStorage('storage_items');
    const f = filters || {};
    let items = storageItems.filter((it) => !it.isDeleted && it.lastOpenedAt);

    if (f.fileType) {
      items = items.filter((it) => it.fileType === f.fileType);
    }

    const key = sortBy || 'last_opened_at';
    const direction = sortDirection || 'desc';

    items.sort((a, b) => {
      let va;
      let vb;
      switch (key) {
        case 'name':
          va = (a.name || '').toLowerCase();
          vb = (b.name || '').toLowerCase();
          break;
        case 'modified_at':
          va = this._parseDate(a.modifiedAt)?.getTime() || 0;
          vb = this._parseDate(b.modifiedAt)?.getTime() || 0;
          break;
        case 'last_opened_at':
        default:
          va = this._parseDate(a.lastOpenedAt)?.getTime() || 0;
          vb = this._parseDate(b.lastOpenedAt)?.getTime() || 0;
          break;
      }
      return this._compareValues(va, vb, direction);
    });

    const resolved = items.map((it) => this._resolveStorageItemForeignKeys(it, storageItems));
    return {
      items: resolved,
      totalCount: resolved.length
    };
  }

  // getIncomingSharesList(filters, sortBy, sortDirection)
  getIncomingSharesList(filters, sortBy, sortDirection) {
    const shares = this._getFromStorage('incoming_shares');
    const storageItems = this._getFromStorage('storage_items');
    const f = filters || {};

    let items = shares.map((share) => {
      const item = storageItems.find((it) => it.id === share.storageItemId) || null;
      return { share, item };
    });

    if (f.itemType) {
      items = items.filter((pair) => pair.item && pair.item.itemType === f.itemType);
    }
    if (f.ownerName) {
      items = items.filter((pair) => pair.share.ownerName === f.ownerName);
    }
    if (f.permission) {
      items = items.filter((pair) => pair.share.permission === f.permission);
    }

    const key = sortBy || 'shared_date';
    const direction = sortDirection || 'desc';

    items.sort((a, b) => {
      let va;
      let vb;
      switch (key) {
        case 'name':
          va = (a.item?.name || '').toLowerCase();
          vb = (b.item?.name || '').toLowerCase();
          break;
        case 'owner':
          va = (a.share.ownerName || '').toLowerCase();
          vb = (b.share.ownerName || '').toLowerCase();
          break;
        case 'last_opened_at':
          va = this._parseDate(a.item?.lastOpenedAt)?.getTime() || 0;
          vb = this._parseDate(b.item?.lastOpenedAt)?.getTime() || 0;
          break;
        case 'shared_date':
        default:
          va = this._parseDate(a.share.sharedDate)?.getTime() || 0;
          vb = this._parseDate(b.share.sharedDate)?.getTime() || 0;
          break;
      }
      return this._compareValues(va, vb, direction);
    });

    const resolvedItems = items.map((pair) => {
      const resolvedShare = this._resolveIncomingShareForeignKeys(pair.share, storageItems);
      const resolvedItem = this._resolveStorageItemForeignKeys(pair.item, storageItems);
      return { share: resolvedShare, item: resolvedItem };
    });

    return {
      items: resolvedItems,
      totalCount: resolvedItems.length
    };
  }

  // getTrashItems(filters, sortBy, sortDirection)
  getTrashItems(filters, sortBy, sortDirection) {
    const storageItems = this._getFromStorage('storage_items');
    const f = filters || {};
    let items = storageItems.filter((it) => it.isDeleted);

    if (f.itemType) {
      items = items.filter((it) => it.itemType === f.itemType);
    }

    const key = sortBy || 'deleted_at';
    const direction = sortDirection || 'desc';

    items.sort((a, b) => {
      let va;
      let vb;
      switch (key) {
        case 'name':
          va = (a.name || '').toLowerCase();
          vb = (b.name || '').toLowerCase();
          break;
        case 'size':
          va = a.sizeBytes || 0;
          vb = b.sizeBytes || 0;
          break;
        case 'original_location':
          va = (a.path || '').toLowerCase();
          vb = (b.path || '').toLowerCase();
          break;
        case 'deleted_at':
        default:
          va = this._parseDate(a.deletedAt)?.getTime() || 0;
          vb = this._parseDate(b.deletedAt)?.getTime() || 0;
          break;
      }
      return this._compareValues(va, vb, direction);
    });

    const resolved = items.map((it) => this._resolveStorageItemForeignKeys(it, storageItems));
    return {
      items: resolved,
      totalCount: resolved.length
    };
  }

  // getFileViewerContext(storageItemId)
  getFileViewerContext(storageItemId) {
    const storageItems = this._getFromStorage('storage_items');
    const item = storageItems.find((it) => it.id === storageItemId) || null;
    const resolvedItem = this._resolveStorageItemForeignKeys(item, storageItems);

    const breadcrumb = item && item.itemType === 'file'
      ? this._buildBreadcrumbForFolder(
          storageItems.find((it) => it.id === item.parentId) || null,
          storageItems
        )
      : [{ id: 'root', name: 'My Files' }];

    const itemLabels = this._getFromStorage('item_labels').filter(
      (il) => il.storageItemId === storageItemId
    );
    const labelsAll = this._getFromStorage('labels');
    const labels = itemLabels
      .map((il) => labelsAll.find((l) => l.id === il.labelId) || null)
      .filter((l) => !!l)
      .map((l) => ({ ...l }));

    const fileVersions = this._getFromStorage('file_versions').filter(
      (v) => v.storageItemId === storageItemId
    );
    const versionsCount = fileVersions.length;
    const lastVersionCreatedAt = versionsCount
      ? fileVersions
          .map((v) => this._parseDate(v.createdAt)?.getTime() || 0)
          .reduce((a, b) => (a > b ? a : b), 0)
      : null;

    const shareLinks = this._getFromStorage('share_links').filter(
      (l) => l.storageItemId === storageItemId && l.isEnabled
    );
    const collaborators = this._getFromStorage('collaborator_permissions').filter(
      (c) => c.storageItemId === storageItemId
    );

    const primaryLinkRaw = shareLinks[0] || null;
    const primaryLink = primaryLinkRaw
      ? this._resolveShareLinkForeignKeys(primaryLinkRaw, storageItems)
      : null;

    return {
      item: resolvedItem,
      breadcrumb,
      labels,
      hasVersionHistory: !!(item && item.hasVersionHistory),
      versionSummary: {
        currentVersionId: item ? item.currentVersionId : null,
        versionsCount,
        lastVersionCreatedAt: lastVersionCreatedAt
          ? new Date(lastVersionCreatedAt).toISOString()
          : null
      },
      offlineStatus: !!(item && item.isAvailableOffline),
      sharingSummary: {
        hasShareLinks: shareLinks.length > 0,
        primaryLink,
        collaboratorsCount: collaborators.length
      }
    };
  }

  // getFileVersionHistory(storageItemId)
  getFileVersionHistory(storageItemId) {
    const versions = this._getFromStorage('file_versions').filter(
      (v) => v.storageItemId === storageItemId
    );
    const storageItems = this._getFromStorage('storage_items');
    return versions.map((v) => this._resolveFileVersionForeignKeys(v, storageItems));
  }

  // restoreFileVersion(fileVersionId)
  restoreFileVersion(fileVersionId) {
    let fileVersions = this._getFromStorage('file_versions');
    const storageItems = this._getFromStorage('storage_items');
    const version = fileVersions.find((v) => v.id === fileVersionId) || null;
    if (!version) {
      return { success: false, restoredVersion: null, item: null, message: 'Version not found.' };
    }
    const item = storageItems.find((it) => it.id === version.storageItemId) || null;
    if (!item) {
      return { success: false, restoredVersion: null, item: null, message: 'File not found.' };
    }

    fileVersions = fileVersions.map((v) => {
      if (v.storageItemId === item.id) {
        return { ...v, isCurrent: v.id === fileVersionId };
      }
      return v;
    });
    item.currentVersionId = fileVersionId;
    item.modifiedAt = version.createdAt;

    this._saveToStorage('file_versions', fileVersions);
    this._saveToStorage('storage_items', storageItems);

    const resolvedVersion = this._resolveFileVersionForeignKeys(version, storageItems);
    const resolvedItem = this._resolveStorageItemForeignKeys(item, storageItems);

    return {
      success: true,
      restoredVersion: resolvedVersion,
      item: resolvedItem,
      message: 'File version restored.'
    };
  }

  // getLabelsList()
  getLabelsList() {
    const labels = this._getFromStorage('labels');
    return labels.map((l) => ({ ...l }));
  }

  // createLabel(name, color, description)
  createLabel(name, color, description) {
    return this._ensureLabelExists(name, color, description);
  }

  // applyLabelToItem(storageItemId, labelId)
  applyLabelToItem(storageItemId, labelId) {
    let itemLabels = this._getFromStorage('item_labels');
    const existing = itemLabels.find(
      (il) => il.storageItemId === storageItemId && il.labelId === labelId
    );
    if (existing) {
      const storageItems = this._getFromStorage('storage_items');
      const labels = this._getFromStorage('labels');
      return this._resolveItemLabelForeignKeys(existing, storageItems, labels);
    }
    const nowIso = new Date().toISOString();
    const itemLabel = {
      id: this._generateId('itemlabel'),
      storageItemId,
      labelId,
      appliedAt: nowIso
    };
    itemLabels.push(itemLabel);
    this._saveToStorage('item_labels', itemLabels);

    const storageItems = this._getFromStorage('storage_items');
    const labels = this._getFromStorage('labels');
    return this._resolveItemLabelForeignKeys(itemLabel, storageItems, labels);
  }

  // removeLabelFromItem(storageItemId, labelId)
  removeLabelFromItem(storageItemId, labelId) {
    let itemLabels = this._getFromStorage('item_labels');
    const before = itemLabels.length;
    itemLabels = itemLabels.filter(
      (il) => !(il.storageItemId === storageItemId && il.labelId === labelId)
    );
    this._saveToStorage('item_labels', itemLabels);
    return { success: itemLabels.length < before };
  }

  // getUserSettings()
  getUserSettings() {
    return this._getUserSettingsInternal();
  }

  // updateUserSettings(settings)
  updateUserSettings(settings) {
    const current = this._getUserSettingsInternal();
    const updated = { ...current };

    const s = settings || {};
    const topLevelKeys = [
      'defaultSortField',
      'defaultSortDirection',
      'defaultViewMode',
      'language',
      'region',
      'defaultLinkAccessLevel',
      'defaultLinkPermission',
      'defaultLinkAllowDownload',
      'offlineMaxSizeMb',
      'offlineLowDiskBehavior'
    ];

    topLevelKeys.forEach((k) => {
      if (Object.prototype.hasOwnProperty.call(s, k)) {
        updated[k] = s[k];
      }
    });

    if (s.notificationPreferences) {
      updated.notificationPreferences = {
        ...(current.notificationPreferences || {}),
        ...s.notificationPreferences
      };
    }

    this._saveToStorage('user_settings', updated);
    return { updatedSettings: updated };
  }

  // getHelpTopicsOverview()
  getHelpTopicsOverview() {
    const data = this._getObjectFromStorage('help_topics', { categories: [], topArticles: [] });
    return {
      categories: Array.isArray(data.categories) ? data.categories : [],
      topArticles: Array.isArray(data.topArticles) ? data.topArticles : []
    };
  }

  // searchHelpArticles(query)
  searchHelpArticles(query) {
    const data = this._getObjectFromStorage('help_topics', { categories: [], topArticles: [] });
    const q = (query || '').toLowerCase();
    if (!q) return [];
    const articles = Array.isArray(data.topArticles) ? data.topArticles : [];
    const results = articles.filter((a) => {
      const title = (a.title || '').toLowerCase();
      const summary = (a.summary || '').toLowerCase();
      return title.includes(q) || summary.includes(q);
    });
    return results.map((a) => ({
      id: a.id,
      title: a.title,
      categoryId: a.categoryId,
      excerpt: a.summary
    }));
  }

  // getStaticPageContent(pageKey)
  getStaticPageContent(pageKey) {
    const pages = this._getObjectFromStorage('static_pages', {});
    const page = pages[pageKey] || null;
    if (!page) {
      return {
        pageKey,
        title: '',
        lastUpdatedAt: null,
        sections: []
      };
    }
    return page;
  }

  // getContactCategories()
  getContactCategories() {
    const categories = this._getFromStorage('contact_categories');
    return categories.map((c) => ({ ...c }));
  }

  // submitContactRequest(categoryKey, subject, message, email)
  submitContactRequest(categoryKey, subject, message, email) {
    let requests = this._getFromStorage('support_requests');
    const id = this._generateId('ticket');
    const nowIso = new Date().toISOString();
    const req = {
      id,
      categoryKey,
      subject,
      message,
      email: email || null,
      createdAt: nowIso
    };
    requests.push(req);
    this._saveToStorage('support_requests', requests);
    return {
      success: true,
      ticketId: id,
      message: 'Support request submitted.'
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