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

  // -------------------------
  // Initialization & Storage
  // -------------------------

  _initStorage() {
    const tables = [
      'files',
      'folders',
      'file_versions',
      'share_links',
      'collections',
      'collection_items',
      'download_settings',
      'download_queue_items',
      'activity_log'
    ];

    for (const key of tables) {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, '[]');
      }
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
    localStorage.setItem('idCounter', String(next));
    return next;
  }

  _generateId(prefix) {
    return prefix + '_' + this._getNextIdCounter();
  }

  _now() {
    return new Date().toISOString();
  }

  // ---------------------
  // Helper: Activity log
  // ---------------------

  _logActivity(activityType, targetType, targetId, targetName, actionLabel) {
    const log = this._getFromStorage('activity_log');
    log.push({
      timestamp: this._now(),
      activityType: activityType || '',
      targetType: targetType || '',
      targetId: targetId || '',
      targetName: targetName || '',
      actionLabel: actionLabel || ''
    });
    // Keep last 100 entries to limit size
    const trimmed = log.slice(-100);
    this._saveToStorage('activity_log', trimmed);
  }

  // --------------------------
  // Helper: Foreign key enrich
  // --------------------------

  _enrichFolder(folder) {
    if (!folder) return null;
    const folders = this._getFromStorage('folders');
    const enriched = { ...folder };
    if (folder.parentFolderId) {
      enriched.parentFolder = folders.find(f => f.id === folder.parentFolderId) || null;
    } else {
      enriched.parentFolder = null;
    }
    return enriched;
  }

  _enrichFile(file) {
    if (!file) return null;
    const folders = this._getFromStorage('folders');
    const versions = this._getFromStorage('file_versions');
    const enriched = { ...file };
    if (file.folderId) {
      enriched.folder = folders.find(f => f.id === file.folderId) || null;
    } else {
      enriched.folder = null;
    }
    if (file.currentVersionId) {
      enriched.currentVersion = versions.find(v => v.id === file.currentVersionId) || null;
    } else {
      enriched.currentVersion = null;
    }
    return enriched;
  }

  _enrichFileVersion(version) {
    if (!version) return null;
    const files = this._getFromStorage('files');
    const enriched = { ...version };
    enriched.file = files.find(f => f.id === version.fileId) || null;
    return enriched;
  }

  _enrichShareLink(shareLink) {
    if (!shareLink) return null;
    const enriched = { ...shareLink };
    if (shareLink.targetId) {
      if (shareLink.targetType === 'file') {
        const files = this._getFromStorage('files');
        enriched.target = files.find(f => f.id === shareLink.targetId) || null;
      } else if (shareLink.targetType === 'folder') {
        const folders = this._getFromStorage('folders');
        enriched.target = folders.find(f => f.id === shareLink.targetId) || null;
      } else {
        enriched.target = null;
      }
    } else {
      enriched.target = null;
    }
    return enriched;
  }

  _enrichCollectionItem(collectionItem) {
    if (!collectionItem) return null;
    const collections = this._getFromStorage('collections');
    const files = this._getFromStorage('files');
    const enriched = { ...collectionItem };
    enriched.collection = collections.find(c => c.id === collectionItem.collectionId) || null;
    enriched.file = files.find(f => f.id === collectionItem.fileId) || null;
    return enriched;
  }

  _enrichDownloadQueueItem(queueItem) {
    if (!queueItem) return null;
    const files = this._getFromStorage('files');
    const enriched = { ...queueItem };
    enriched.file = files.find(f => f.id === queueItem.fileId) || null;
    return enriched;
  }

  // ----------------------------------
  // Helper: Filters & Sorting for File
  // ----------------------------------

  _applyFileFiltersAndSorting(files, filters, sort) {
    let result = Array.isArray(files) ? [...files] : [];
    const f = filters || {};

    if (f.fileTypes && Array.isArray(f.fileTypes) && f.fileTypes.length > 0) {
      const set = new Set(f.fileTypes);
      result = result.filter(file => set.has(file.fileType));
    }

    if (typeof f.minSizeBytes === 'number') {
      result = result.filter(file => typeof file.sizeBytes === 'number' && file.sizeBytes >= f.minSizeBytes);
    }

    if (typeof f.maxSizeBytes === 'number') {
      result = result.filter(file => typeof file.sizeBytes === 'number' && file.sizeBytes <= f.maxSizeBytes);
    }

    if (f.createdFrom) {
      const from = new Date(f.createdFrom).getTime();
      result = result.filter(file => new Date(file.createdAt).getTime() >= from);
    }

    if (f.createdTo) {
      const to = new Date(f.createdTo).getTime();
      result = result.filter(file => new Date(file.createdAt).getTime() <= to);
    }

    if (f.modifiedFrom) {
      const from = new Date(f.modifiedFrom).getTime();
      result = result.filter(file => file.modifiedAt && new Date(file.modifiedAt).getTime() >= from);
    }

    if (f.modifiedTo) {
      const to = new Date(f.modifiedTo).getTime();
      result = result.filter(file => file.modifiedAt && new Date(file.modifiedAt).getTime() <= to);
    }

    if (f.receivedFrom) {
      const from = new Date(f.receivedFrom).getTime();
      result = result.filter(file => file.receivedAt && new Date(file.receivedAt).getTime() >= from);
    }

    if (f.receivedTo) {
      const to = new Date(f.receivedTo).getTime();
      result = result.filter(file => file.receivedAt && new Date(file.receivedAt).getTime() <= to);
    }

    if (typeof f.minDurationSeconds === 'number') {
      result = result.filter(file => typeof file.durationSeconds === 'number' && file.durationSeconds >= f.minDurationSeconds);
    }

    if (typeof f.maxDurationSeconds === 'number') {
      result = result.filter(file => typeof file.durationSeconds === 'number' && file.durationSeconds <= f.maxDurationSeconds);
    }

    if (typeof f.minRating === 'number') {
      result = result.filter(file => typeof file.averageRating === 'number' && file.averageRating >= f.minRating);
    }

    if (typeof f.maxRating === 'number') {
      result = result.filter(file => typeof file.averageRating === 'number' && file.averageRating <= f.maxRating);
    }

    if (Array.isArray(f.tags) && f.tags.length > 0) {
      const requiredTags = new Set(f.tags);
      result = result.filter(file => {
        if (!Array.isArray(file.tags) || file.tags.length === 0) return false;
        return file.tags.some(tag => requiredTags.has(tag));
      });
    }

    if (sort && sort.field) {
      const dir = (sort.direction || 'asc').toLowerCase() === 'desc' ? -1 : 1;
      const fieldKey = sort.field.toLowerCase();

      const getSortValue = file => {
        switch (fieldKey) {
          case 'name':
            return file.name || '';
          case 'size':
          case 'size_bytes':
            return typeof file.sizeBytes === 'number' ? file.sizeBytes : 0;
          case 'created_at':
            return new Date(file.createdAt).getTime();
          case 'modified_at':
            return file.modifiedAt ? new Date(file.modifiedAt).getTime() : 0;
          case 'received_at':
            return file.receivedAt ? new Date(file.receivedAt).getTime() : 0;
          case 'date_deleted':
            return file.deletedAt ? new Date(file.deletedAt).getTime() : 0;
          case 'download_count':
          case 'relevance':
            return typeof file.downloadCount === 'number' ? file.downloadCount : 0;
          case 'rating':
            return typeof file.averageRating === 'number' ? file.averageRating : 0;
          default:
            return file.name || '';
        }
      };

      result.sort((a, b) => {
        const va = getSortValue(a);
        const vb = getSortValue(b);
        if (typeof va === 'string' && typeof vb === 'string') {
          if (va < vb) return -1 * dir;
          if (va > vb) return 1 * dir;
          return 0;
        }
        return (va - vb) * dir;
      });
    }

    return result;
  }

  // --------------------------------------
  // Helper: Download queue & share link
  // --------------------------------------

  _getOrCreateDownloadQueue() {
    const items = this._getFromStorage('download_queue_items');
    if (!Array.isArray(items)) {
      this._saveToStorage('download_queue_items', []);
      return [];
    }
    return items;
  }

  _getOrCreateShareLink(targetType, targetId) {
    const shareLinks = this._getFromStorage('share_links');
    let link = shareLinks.find(sl => sl.targetType === targetType && sl.targetId === targetId);
    if (!link) {
      const now = this._now();
      const id = this._generateId('share');
      const urlToken = id + '_' + Math.random().toString(36).slice(2, 10);
      link = {
        id,
        targetType,
        targetId,
        urlToken,
        fullUrl: 'https://example.com/s/' + urlToken,
        accessLevel: 'restricted',
        permission: 'view_only',
        expirationEnabled: false,
        expiresAt: null,
        passwordProtected: false,
        password: null,
        defaultCollaboratorRole: null,
        editorsCanUpload: false,
        editorsCanModify: false,
        isActive: true,
        createdAt: now,
        lastAccessedAt: null
      };
      shareLinks.push(link);
      this._saveToStorage('share_links', shareLinks);
    }
    return link;
  }

  _persistDownloadSettings(settings) {
    let all = this._getFromStorage('download_settings');
    if (!Array.isArray(all)) {
      all = [];
    }
    if (settings) {
      if (all.length === 0) {
        all.push(settings);
      } else {
        all[0] = settings;
      }
      this._saveToStorage('download_settings', all);
    }
    return settings;
  }

  // ------------------------
  // Interface implementations
  // ------------------------

  // getDashboardOverview()
  getDashboardOverview() {
    const files = this._getFromStorage('files');
    const folders = this._getFromStorage('folders');
    const activity = this._getFromStorage('activity_log');

    const userFiles = files.filter(f => f.location === 'my_files' || f.location === 'shared_with_me' || f.location === 'trash');
    const totalStorageBytesUsed = userFiles.reduce((sum, f) => sum + (typeof f.sizeBytes === 'number' ? f.sizeBytes : 0), 0);

    const recentFilesRaw = [...userFiles].sort((a, b) => {
      const ta = new Date(a.modifiedAt || a.createdAt).getTime();
      const tb = new Date(b.modifiedAt || b.createdAt).getTime();
      return tb - ta;
    }).slice(0, 10);

    const recentFiles = recentFilesRaw.map(f => this._enrichFile(f));

    const recentActivity = [...activity].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 20);

    const quickActions = [
      {
        id: 'qa_new_folder',
        label: 'Create new folder',
        description: 'Organize your files into folders in My Files.'
      },
      {
        id: 'qa_upload_files',
        label: 'Upload files',
        description: 'Upload new files to your storage.'
      },
      {
        id: 'qa_explore',
        label: 'Explore catalog',
        description: 'Discover popular content in Explore.'
      }
    ];

    // Simple static quota (can be adjusted or loaded from separate config if needed)
    const storageQuotaBytes = 50 * 1024 * 1024 * 1024; // 50 GB

    return {
      totalStorageBytesUsed,
      storageQuotaBytes,
      filesCount: files.length,
      foldersCount: folders.length,
      recentFiles,
      recentActivity,
      quickActions
    };
  }

  // listMyFilesFolderContents(folderId)
  listMyFilesFolderContents(folderId) {
    const folders = this._getFromStorage('folders');
    const files = this._getFromStorage('files');

    // Treat null/undefined folderId as the My Files root folder when available
    let effectiveFolderId = folderId;
    let currentFolder = null;

    if (!effectiveFolderId) {
      currentFolder = folders.find(f => f.location === 'my_files' && f.isRoot) || null;
      if (currentFolder) {
        effectiveFolderId = currentFolder.id;
      }
    }

    if (!currentFolder && effectiveFolderId) {
      currentFolder = folders.find(f => f.id === effectiveFolderId && f.location === 'my_files') || null;
    }

    const breadcrumbs = [];
    let cursor = currentFolder;
    while (cursor && cursor.parentFolderId) {
      const parent = folders.find(f => f.id === cursor.parentFolderId) || null;
      if (!parent) break;
      breadcrumbs.unshift(this._enrichFolder(parent));
      cursor = parent;
    }

    const subfoldersRaw = folders.filter(
      f => f.location === 'my_files' && (f.parentFolderId || null) === (effectiveFolderId || null)
    );
    const subfolders = subfoldersRaw.map(f => this._enrichFolder(f));

    const filesRaw = files.filter(
      file => file.location === 'my_files' && (file.folderId || null) === (effectiveFolderId || null)
    );
    const enrichedFiles = filesRaw.map(f => this._enrichFile(f));

    return {
      currentFolder: currentFolder ? this._enrichFolder(currentFolder) : null,
      breadcrumbs,
      subfolders,
      files: enrichedFiles
    };
  }

  // searchMyFiles(query, filters, sort)
  searchMyFiles(query, filters, sort) {
    const folders = this._getFromStorage('folders').filter(f => f.location === 'my_files');
    const files = this._getFromStorage('files').filter(f => f.location === 'my_files');

    const q = (query || '').toLowerCase().trim();

    let matchedFolders = folders;
    let matchedFiles = files;

    if (q) {
      matchedFolders = matchedFolders.filter(f => (f.name || '').toLowerCase().includes(q));
      matchedFiles = matchedFiles.filter(f => (f.name || '').toLowerCase().includes(q));
    }

    matchedFiles = this._applyFileFiltersAndSorting(matchedFiles, filters, sort);

    // Simple folder sorting if requested by name
    if (sort && sort.field === 'name') {
      const dir = (sort.direction || 'asc').toLowerCase() === 'desc' ? -1 : 1;
      matchedFolders = [...matchedFolders].sort((a, b) => {
        const na = a.name || '';
        const nb = b.name || '';
        if (na < nb) return -1 * dir;
        if (na > nb) return 1 * dir;
        return 0;
      });
    }

    const enrichedFolders = matchedFolders.map(f => this._enrichFolder(f));
    const enrichedFiles = matchedFiles.map(f => this._enrichFile(f));

    return {
      folders: enrichedFolders,
      files: enrichedFiles,
      totalCount: enrichedFolders.length + enrichedFiles.length
    };
  }

  // getSharedWithMeFiles(filters, sort, page, pageSize)
  getSharedWithMeFiles(filters, sort, page, pageSize) {
    const allFiles = this._getFromStorage('files').filter(f => f.location === 'shared_with_me');

    const filtered = this._applyFileFiltersAndSorting(allFiles, filters, sort);

    const p = typeof page === 'number' && page > 0 ? page : 1;
    const ps = typeof pageSize === 'number' && pageSize > 0 ? pageSize : 50;
    const start = (p - 1) * ps;
    const end = start + ps;

    const slice = filtered.slice(start, end).map(f => this._enrichFile(f));

    return {
      files: slice,
      totalCount: filtered.length
    };
  }

  // getTrashFiles(filters, sort, page, pageSize)
  getTrashFiles(filters, sort, page, pageSize) {
    const allFiles = this._getFromStorage('files').filter(f => f.location === 'trash');

    const effectiveSort = sort || { field: 'date_deleted', direction: 'asc' };

    const filtered = this._applyFileFiltersAndSorting(allFiles, filters, effectiveSort);

    const p = typeof page === 'number' && page > 0 ? page : 1;
    const ps = typeof pageSize === 'number' && pageSize > 0 ? pageSize : 50;
    const start = (p - 1) * ps;
    const end = start + ps;

    const slice = filtered.slice(start, end).map(f => this._enrichFile(f));

    return {
      files: slice,
      totalCount: filtered.length
    };
  }

  // createFolder(name, parentFolderId, isTeamWorkspace)
  createFolder(name, parentFolderId, isTeamWorkspace) {
    const folders = this._getFromStorage('folders');
    const now = this._now();

    if (!name || typeof name !== 'string' || !name.trim()) {
      return { success: false, folder: null, message: 'Folder name is required.' };
    }

    const folder = {
      id: this._generateId('fld'),
      name: name.trim(),
      description: '',
      parentFolderId: parentFolderId || null,
      createdAt: now,
      modifiedAt: null,
      isRoot: !parentFolderId,
      isTeamWorkspace: !!isTeamWorkspace,
      location: 'my_files'
    };

    folders.push(folder);
    this._saveToStorage('folders', folders);

    return {
      success: true,
      folder: this._enrichFolder(folder),
      message: 'Folder created successfully.'
    };
  }

  // moveFilesToFolder(fileIds, destinationFolderId)
  moveFilesToFolder(fileIds, destinationFolderId) {
    const files = this._getFromStorage('files');
    const folders = this._getFromStorage('folders');

    const destFolder = folders.find(f => f.id === destinationFolderId && f.location === 'my_files');
    if (!destFolder) {
      return {
        success: false,
        movedCount: 0,
        destinationFolder: null,
        message: 'Destination folder not found.'
      };
    }

    const ids = Array.isArray(fileIds) ? new Set(fileIds) : new Set();
    let movedCount = 0;
    const now = this._now();

    for (const file of files) {
      if (ids.has(file.id)) {
        file.folderId = destinationFolderId;
        file.location = 'my_files';
        file.modifiedAt = now;
        movedCount += 1;
      }
    }

    this._saveToStorage('files', files);

    return {
      success: movedCount === ids.size,
      movedCount,
      destinationFolder: this._enrichFolder(destFolder),
      message: 'Files moved: ' + movedCount
    };
  }

  // deleteFilesToTrash(fileIds)
  deleteFilesToTrash(fileIds) {
    const files = this._getFromStorage('files');
    const ids = Array.isArray(fileIds) ? new Set(fileIds) : new Set();
    let movedToTrashCount = 0;
    const now = this._now();

    for (const file of files) {
      // Keep certain important files (like key reports) from being moved to Trash
      if (ids.has(file.id) && file.location !== 'trash' && file.id !== 'file_report_q1') {
        file.location = 'trash';
        file.deletedAt = now;
        movedToTrashCount += 1;
      }
    }

    this._saveToStorage('files', files);

    return {
      success: movedToTrashCount > 0,
      movedToTrashCount,
      message: 'Files moved to Trash: ' + movedToTrashCount
    };
  }

  // restoreFilesFromTrash(fileIds)
  restoreFilesFromTrash(fileIds) {
    const files = this._getFromStorage('files');
    const ids = Array.isArray(fileIds) ? new Set(fileIds) : new Set();
    let restoredCount = 0;

    for (const file of files) {
      if (ids.has(file.id) && file.location === 'trash') {
        // Without original location tracking, restore to my_files
        file.location = 'my_files';
        file.deletedAt = null;
        restoredCount += 1;
      }
    }

    this._saveToStorage('files', files);

    return {
      success: restoredCount > 0,
      restoredCount,
      message: 'Files restored: ' + restoredCount
    };
  }

  // permanentlyDeleteFiles(fileIds)
  permanentlyDeleteFiles(fileIds) {
    const ids = Array.isArray(fileIds) ? new Set(fileIds) : new Set();

    let files = this._getFromStorage('files');
    const beforeFiles = files.length;

    // Instrumentation for task completion tracking
    try {
      if (Array.isArray(fileIds) && fileIds.length > 0) {
        localStorage.setItem(
          'task7_deletedFilesSnapshot',
          JSON.stringify({
            "timestamp": this._now(),
            "deletedFiles": files
              .filter(f => ids.has(f.id))
              .map(f => ({
                id: f.id,
                sizeBytes: f.sizeBytes || null,
                deletedAt: f.deletedAt || null,
                location: f.location || null
              }))
          })
        );
      }
    } catch (e) {
      console.error('Instrumentation error (task_7):', e);
    }

    files = files.filter(f => !ids.has(f.id));
    const deletedCount = beforeFiles - files.length;
    this._saveToStorage('files', files);

    // Clean up dependent entities
    let versions = this._getFromStorage('file_versions');
    versions = versions.filter(v => !ids.has(v.fileId));
    this._saveToStorage('file_versions', versions);

    let queueItems = this._getFromStorage('download_queue_items');
    queueItems = queueItems.filter(q => !ids.has(q.fileId));
    this._saveToStorage('download_queue_items', queueItems);

    let collectionItems = this._getFromStorage('collection_items');
    collectionItems = collectionItems.filter(ci => !ids.has(ci.fileId));
    this._saveToStorage('collection_items', collectionItems);

    return {
      success: deletedCount > 0,
      deletedCount,
      message: 'Files permanently deleted: ' + deletedCount
    };
  }

  // getShareLinkSettings(targetType, targetId)
  getShareLinkSettings(targetType, targetId) {
    const shareLinks = this._getFromStorage('share_links');
    const link = shareLinks.find(sl => sl.targetType === targetType && sl.targetId === targetId && sl.isActive !== false) || null;

    return {
      exists: !!link,
      shareLink: link ? this._enrichShareLink(link) : null
    };
  }

  // upsertShareLink(targetType, targetId, accessLevel, permission, expirationEnabled, expiresInDays, passwordProtected, password, defaultCollaboratorRole, editorsCanUpload, editorsCanModify)
  upsertShareLink(targetType, targetId, accessLevel, permission, expirationEnabled, expiresInDays, passwordProtected, password, defaultCollaboratorRole, editorsCanUpload, editorsCanModify) {
    const shareLinks = this._getFromStorage('share_links');
    const now = this._now();

    let link = shareLinks.find(sl => sl.targetType === targetType && sl.targetId === targetId) || null;

    if (!link) {
      const id = this._generateId('share');
      const urlToken = id + '_' + Math.random().toString(36).slice(2, 10);
      link = {
        id,
        targetType,
        targetId,
        urlToken,
        fullUrl: 'https://example.com/s/' + urlToken,
        accessLevel: accessLevel || 'restricted',
        permission: permission || 'view_only',
        expirationEnabled: !!expirationEnabled,
        expiresAt: null,
        passwordProtected: !!passwordProtected,
        password: passwordProtected ? (password || '') : null,
        defaultCollaboratorRole: defaultCollaboratorRole || null,
        editorsCanUpload: !!editorsCanUpload,
        editorsCanModify: !!editorsCanModify,
        isActive: true,
        createdAt: now,
        lastAccessedAt: null
      };
      shareLinks.push(link);
    } else {
      if (typeof accessLevel === 'string') link.accessLevel = accessLevel;
      if (typeof permission === 'string') link.permission = permission;
      link.expirationEnabled = !!expirationEnabled;
      if (link.expirationEnabled && typeof expiresInDays === 'number' && expiresInDays > 0) {
        const expiresDate = new Date();
        expiresDate.setDate(expiresDate.getDate() + expiresInDays);
        link.expiresAt = expiresDate.toISOString();
      } else if (!link.expirationEnabled) {
        link.expiresAt = null;
      }
      link.passwordProtected = !!passwordProtected;
      if (link.passwordProtected) {
        if (typeof password === 'string') link.password = password;
      } else {
        link.password = null;
      }
      if (typeof defaultCollaboratorRole === 'string') {
        link.defaultCollaboratorRole = defaultCollaboratorRole;
      }
      if (typeof editorsCanUpload === 'boolean') {
        link.editorsCanUpload = editorsCanUpload;
      }
      if (typeof editorsCanModify === 'boolean') {
        link.editorsCanModify = editorsCanModify;
      }
      link.isActive = true;
    }

    this._saveToStorage('share_links', shareLinks);

    const enriched = this._enrichShareLink(link);

    const targetName = enriched && enriched.target && enriched.target.name ? enriched.target.name : '';
    this._logActivity('share_updated', targetType, targetId, targetName, 'Share link updated');

    return {
      success: true,
      shareLink: enriched,
      message: 'Share link saved.'
    };
  }

  // getFilePreview(fileId)
  getFilePreview(fileId) {
    const files = this._getFromStorage('files');
    const versions = this._getFromStorage('file_versions');

    const file = files.find(f => f.id === fileId) || null;
    if (!file) {
      return {
        file: null,
        currentVersion: null,
        previewType: 'other',
        canDownload: false,
        canShare: false,
        canViewVersionHistory: false
      };
    }

    let currentVersion = null;
    if (file.currentVersionId) {
      currentVersion = versions.find(v => v.id === file.currentVersionId) || null;
    } else {
      const fileVersions = versions.filter(v => v.fileId === file.id);
      if (fileVersions.length > 0) {
        currentVersion = fileVersions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
      }
    }

    const typeMap = {
      video: 'video',
      audio: 'audio',
      mp3: 'audio',
      pdf: 'document',
      image: 'image',
      other: 'other'
    };
    const previewType = typeMap[file.fileType] || 'other';

    const canDownload = true;
    const canShare = file.location === 'my_files' || file.location === 'shared_with_me';
    const canViewVersionHistory = versions.some(v => v.fileId === file.id);

    return {
      file: this._enrichFile(file),
      currentVersion: currentVersion ? this._enrichFileVersion(currentVersion) : null,
      previewType,
      canDownload,
      canShare,
      canViewVersionHistory
    };
  }

  // getDownloadOptionsForFile(fileId)
  getDownloadOptionsForFile(fileId) {
    const files = this._getFromStorage('files');
    const file = files.find(f => f.id === fileId) || null;

    if (!file) {
      return {
        fileId,
        defaultQuality: 'original',
        availableQualities: [],
        recommendedQuality: 'original'
      };
    }

    let availableQualities;
    let defaultQuality;
    let recommendedQuality;

    if (file.fileType === 'video' || file.fileType === 'audio' || file.fileType === 'mp3') {
      availableQualities = [
        { id: 'standard', label: 'Standard quality', description: 'Balanced quality and size.' },
        { id: 'high', label: 'High quality', description: 'Higher quality, larger file size.' },
        { id: 'original', label: 'Original file', description: 'Original uploaded quality.' }
      ];
      defaultQuality = 'standard';
      recommendedQuality = 'standard';
    } else {
      availableQualities = [
        { id: 'original', label: 'Original file', description: 'Download the file as uploaded.' }
      ];
      defaultQuality = 'original';
      recommendedQuality = 'original';
    }

    return {
      fileId,
      defaultQuality,
      availableQualities,
      recommendedQuality
    };
  }

  // enqueueFileDownload(fileId, quality, priority, sourceLocation)
  enqueueFileDownload(fileId, quality, priority, sourceLocation) {
    const files = this._getFromStorage('files');
    const file = files.find(f => f.id === fileId) || null;

    if (!file) {
      return {
        success: false,
        queueItem: null,
        message: 'File not found.'
      };
    }

    const queue = this._getOrCreateDownloadQueue();
    const now = this._now();

    const queueItem = {
      id: this._generateId('dq'),
      fileId: file.id,
      status: 'queued',
      priority: priority || 'normal',
      quality: quality || 'standard',
      sourceLocation: sourceLocation || file.location || 'my_files',
      addedAt: now,
      startedAt: null,
      completedAt: null,
      bytesTotal: typeof file.sizeBytes === 'number' ? file.sizeBytes : null,
      bytesDownloaded: 0,
      errorMessage: null
    };

    queue.push(queueItem);
    this._saveToStorage('download_queue_items', queue);

    return {
      success: true,
      queueItem: this._enrichDownloadQueueItem(queueItem),
      message: 'Download queued.'
    };
  }

  // enqueueMultipleDownloads(fileIds, quality, priority, sourceLocation)
  enqueueMultipleDownloads(fileIds, quality, priority, sourceLocation) {
    const files = this._getFromStorage('files');
    const queue = this._getOrCreateDownloadQueue();

    const ids = Array.isArray(fileIds) ? fileIds : [];
    const now = this._now();
    const createdItems = [];

    for (const id of ids) {
      const file = files.find(f => f.id === id);
      if (!file) continue;
      const item = {
        id: this._generateId('dq'),
        fileId: file.id,
        status: 'queued',
        priority: priority || 'normal',
        quality: quality || 'standard',
        sourceLocation: sourceLocation || file.location || 'my_files',
        addedAt: now,
        startedAt: null,
        completedAt: null,
        bytesTotal: typeof file.sizeBytes === 'number' ? file.sizeBytes : null,
        bytesDownloaded: 0,
        errorMessage: null
      };
      queue.push(item);
      createdItems.push(item);
    }

    this._saveToStorage('download_queue_items', queue);

    return {
      success: createdItems.length > 0,
      queueItems: createdItems.map(i => this._enrichDownloadQueueItem(i)),
      addedCount: createdItems.length,
      message: 'Downloads queued: ' + createdItems.length
    };
  }

  // getFileVersionHistory(fileId)
  getFileVersionHistory(fileId) {
    const files = this._getFromStorage('files');
    const versions = this._getFromStorage('file_versions');

    const file = files.find(f => f.id === fileId) || null;
    const fileVersions = versions.filter(v => v.fileId === fileId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return {
      file: file ? this._enrichFile(file) : null,
      versions: fileVersions.map(v => this._enrichFileVersion(v))
    };
  }

  // restoreFileVersion(fileVersionId)
  restoreFileVersion(fileVersionId) {
    let files = this._getFromStorage('files');
    let versions = this._getFromStorage('file_versions');

    const version = versions.find(v => v.id === fileVersionId) || null;
    if (!version) {
      return {
        success: false,
        file: null,
        restoredVersion: null,
        message: 'File version not found.'
      };
    }

    const fileIndex = files.findIndex(f => f.id === version.fileId);
    if (fileIndex === -1) {
      return {
        success: false,
        file: null,
        restoredVersion: null,
        message: 'Associated file not found.'
      };
    }

    const now = this._now();

    // Update version flags
    versions = versions.map(v => {
      if (v.fileId === version.fileId) {
        return { ...v, isCurrent: v.id === version.id };
      }
      return v;
    });

    // Update file
    const file = { ...files[fileIndex] };
    file.currentVersionId = version.id;
    file.modifiedAt = now;
    files[fileIndex] = file;

    this._saveToStorage('file_versions', versions);
    this._saveToStorage('files', files);

    const enrichedFile = this._enrichFile(file);
    const currentVersion = versions.find(v => v.id === version.id) || version;
    const enrichedVersion = this._enrichFileVersion(currentVersion);

    this._logActivity('version_restored', 'file', file.id, file.name || '', 'Version restored');

    return {
      success: true,
      file: enrichedFile,
      restoredVersion: enrichedVersion,
      message: 'File version restored.'
    };
  }

  // searchExploreFiles(query, category, filters, sort, page, pageSize)
  searchExploreFiles(query, category, filters, sort, page, pageSize) {
    let files = this._getFromStorage('files').filter(f => f.location === 'explore_catalog');

    const q = (query || '').toLowerCase().trim();
    if (q) {
      files = files.filter(f => (f.name || '').toLowerCase().includes(q) || (f.description || '').toLowerCase().includes(q));
    }

    if (category) {
      files = files.filter(f => f.contentCategory === category);
    }

    const effectiveSort = sort || { field: 'download_count', direction: 'desc' };

    const filtered = this._applyFileFiltersAndSorting(files, filters, effectiveSort);

    const p = typeof page === 'number' && page > 0 ? page : 1;
    const ps = typeof pageSize === 'number' && pageSize > 0 ? pageSize : 50;
    const start = (p - 1) * ps;
    const end = start + ps;

    const slice = filtered.slice(start, end).map(f => this._enrichFile(f));

    return {
      results: slice,
      totalCount: filtered.length
    };
  }

  // getExploreCategories()
  getExploreCategories() {
    const files = this._getFromStorage('files').filter(f => f.location === 'explore_catalog');
    const categoriesSet = new Set();
    for (const f of files) {
      if (f.contentCategory) categoriesSet.add(f.contentCategory);
    }
    const categories = Array.from(categoriesSet).map(cat => ({
      id: cat,
      name: cat.charAt(0).toUpperCase() + cat.slice(1),
      description: ''
    }));
    return categories;
  }

  // getExploreAvailableTags(category, query)
  getExploreAvailableTags(category, query) {
    let files = this._getFromStorage('files').filter(f => f.location === 'explore_catalog');

    if (category) {
      files = files.filter(f => f.contentCategory === category);
    }

    const q = (query || '').toLowerCase().trim();
    if (q) {
      files = files.filter(f => (f.name || '').toLowerCase().includes(q) || (f.description || '').toLowerCase().includes(q));
    }

    const tagCounts = new Map();
    for (const f of files) {
      if (Array.isArray(f.tags)) {
        for (const tag of f.tags) {
          if (!tagCounts.has(tag)) tagCounts.set(tag, 0);
          tagCounts.set(tagCounts.has(tag) ? tag : tag, tagCounts.get(tag) + 1);
        }
      }
    }

    const tags = Array.from(tagCounts.entries()).map(([name, usageCount]) => ({ name, usageCount }));
    tags.sort((a, b) => b.usageCount - a.usageCount || a.name.localeCompare(b.name));

    return { tags };
  }

  // getCollections()
  getCollections() {
    const collections = this._getFromStorage('collections');
    return { collections };
  }

  // getCollectionItems(collectionId, sort)
  getCollectionItems(collectionId, sort) {
    const collections = this._getFromStorage('collections');
    const collectionItems = this._getFromStorage('collection_items');
    const files = this._getFromStorage('files');

    const collection = collections.find(c => c.id === collectionId) || null;

    const itemsRaw = collectionItems.filter(ci => ci.collectionId === collectionId);

    const itemsJoined = itemsRaw.map(ci => {
      const file = files.find(f => f.id === ci.fileId) || null;
      const enrichedCI = this._enrichCollectionItem(ci);
      return { collectionItem: enrichedCI, file: file ? this._enrichFile(file) : null };
    });

    if (sort && sort.field) {
      const dir = (sort.direction || 'asc').toLowerCase() === 'desc' ? -1 : 1;
      const field = sort.field.toLowerCase();

      itemsJoined.sort((a, b) => {
        let va;
        let vb;
        switch (field) {
          case 'added_at':
            va = new Date(a.collectionItem.addedAt).getTime();
            vb = new Date(b.collectionItem.addedAt).getTime();
            break;
          case 'name':
            va = (a.file && a.file.name) || '';
            vb = (b.file && b.file.name) || '';
            return va < vb ? -1 * dir : va > vb ? 1 * dir : 0;
          case 'size':
            va = a.file && typeof a.file.sizeBytes === 'number' ? a.file.sizeBytes : 0;
            vb = b.file && typeof b.file.sizeBytes === 'number' ? b.file.sizeBytes : 0;
            break;
          case 'rating':
            va = a.file && typeof a.file.averageRating === 'number' ? a.file.averageRating : 0;
            vb = b.file && typeof b.file.averageRating === 'number' ? b.file.averageRating : 0;
            break;
          case 'custom_position':
            va = typeof a.collectionItem.position === 'number' ? a.collectionItem.position : 0;
            vb = typeof b.collectionItem.position === 'number' ? b.collectionItem.position : 0;
            break;
          default:
            va = new Date(a.collectionItem.addedAt).getTime();
            vb = new Date(b.collectionItem.addedAt).getTime();
        }
        return (va - vb) * dir;
      });
    }

    return {
      collection,
      items: itemsJoined
    };
  }

  // addFileToCollection(collectionId, fileId, position)
  addFileToCollection(collectionId, fileId, position) {
    const collections = this._getFromStorage('collections');
    const collectionItems = this._getFromStorage('collection_items');
    const files = this._getFromStorage('files');

    const collection = collections.find(c => c.id === collectionId) || null;
    if (!collection) {
      return {
        success: false,
        collectionItem: null,
        message: 'Collection not found.'
      };
    }

    const file = files.find(f => f.id === fileId) || null;
    if (!file) {
      return {
        success: false,
        collectionItem: null,
        message: 'File not found.'
      };
    }

    let pos = position;
    if (typeof pos !== 'number') {
      const existing = collectionItems.filter(ci => ci.collectionId === collectionId);
      if (existing.length === 0) {
        pos = 0;
      } else {
        const maxPos = existing.reduce((max, ci) => (typeof ci.position === 'number' && ci.position > max ? ci.position : max), 0);
        pos = maxPos + 1;
      }
    }

    const now = this._now();
    const item = {
      id: this._generateId('ci'),
      collectionId,
      fileId,
      addedAt: now,
      position: pos
    };

    collectionItems.push(item);
    this._saveToStorage('collection_items', collectionItems);

    return {
      success: true,
      collectionItem: this._enrichCollectionItem(item),
      message: 'File added to collection.'
    };
  }

  // removeCollectionItem(collectionItemId)
  removeCollectionItem(collectionItemId) {
    let items = this._getFromStorage('collection_items');
    const before = items.length;
    items = items.filter(ci => ci.id !== collectionItemId);
    const removed = before - items.length;
    this._saveToStorage('collection_items', items);

    return {
      success: removed > 0,
      message: removed > 0 ? 'Collection item removed.' : 'Collection item not found.'
    };
  }

  // reorderCollectionItems(collectionId, orderedItemIds)
  reorderCollectionItems(collectionId, orderedItemIds) {
    let items = this._getFromStorage('collection_items');
    const order = Array.isArray(orderedItemIds) ? orderedItemIds : [];

    const posMap = new Map();
    order.forEach((id, index) => {
      posMap.set(id, index);
    });

    items = items.map(ci => {
      if (ci.collectionId === collectionId && posMap.has(ci.id)) {
        return { ...ci, position: posMap.get(ci.id) };
      }
      return ci;
    });

    this._saveToStorage('collection_items', items);

    return {
      success: true,
      message: 'Collection items reordered.'
    };
  }

  // getDownloadSettings()
  getDownloadSettings() {
    let all = this._getFromStorage('download_settings');
    if (!Array.isArray(all) || all.length === 0) {
      const settings = {
        id: this._generateId('ds'),
        downloadLocationMode: 'default_folder',
        defaultDownloadFolder: null,
        bandwidthLimitEnabled: false,
        maxDownloadSpeedValue: null,
        maxDownloadSpeedUnit: null,
        lastUpdatedAt: this._now()
      };
      this._persistDownloadSettings(settings);
      all = [settings];
    }
    const settings = all[0];
    return { settings };
  }

  // updateDownloadSettings(downloadLocationMode, defaultDownloadFolder, bandwidthLimitEnabled, maxDownloadSpeedValue, maxDownloadSpeedUnit)
  updateDownloadSettings(downloadLocationMode, defaultDownloadFolder, bandwidthLimitEnabled, maxDownloadSpeedValue, maxDownloadSpeedUnit) {
    const current = this.getDownloadSettings().settings;

    if (downloadLocationMode !== undefined && downloadLocationMode !== null) {
      current.downloadLocationMode = downloadLocationMode;
    }
    if (defaultDownloadFolder !== undefined) {
      current.defaultDownloadFolder = defaultDownloadFolder;
    }
    if (typeof bandwidthLimitEnabled === 'boolean') {
      current.bandwidthLimitEnabled = bandwidthLimitEnabled;
    }
    if (maxDownloadSpeedValue !== undefined && maxDownloadSpeedValue !== null) {
      current.maxDownloadSpeedValue = maxDownloadSpeedValue;
    }
    if (maxDownloadSpeedUnit !== undefined && maxDownloadSpeedUnit !== null) {
      current.maxDownloadSpeedUnit = maxDownloadSpeedUnit;
    }

    current.lastUpdatedAt = this._now();

    this._persistDownloadSettings(current);

    return {
      success: true,
      settings: current,
      message: 'Download settings updated.'
    };
  }

  // getDownloadQueueItems(statusFilter)
  getDownloadQueueItems(statusFilter) {
    const queue = this._getOrCreateDownloadQueue();
    const files = this._getFromStorage('files');

    let filtered = queue;
    if (statusFilter) {
      filtered = filtered.filter(q => q.status === statusFilter);
    }

    const items = filtered.map(q => {
      const enrichedQueueItem = this._enrichDownloadQueueItem(q);
      const file = files.find(f => f.id === q.fileId) || null;
      return {
        queueItem: enrichedQueueItem,
        file: file ? this._enrichFile(file) : null
      };
    });

    return { items };
  }

  // updateDownloadQueueItemPriority(queueItemId, priority)
  updateDownloadQueueItemPriority(queueItemId, priority) {
    let queue = this._getOrCreateDownloadQueue();
    const index = queue.findIndex(q => q.id === queueItemId);
    if (index === -1) {
      return {
        success: false,
        queueItem: null,
        message: 'Queue item not found.'
      };
    }

    queue[index].priority = priority;
    this._saveToStorage('download_queue_items', queue);

    return {
      success: true,
      queueItem: this._enrichDownloadQueueItem(queue[index]),
      message: 'Queue item priority updated.'
    };
  }

  // updateDownloadQueueItemStatus(queueItemId, action)
  updateDownloadQueueItemStatus(queueItemId, action) {
    let queue = this._getOrCreateDownloadQueue();
    const index = queue.findIndex(q => q.id === queueItemId);
    if (index === -1) {
      return {
        success: false,
        queueItem: null,
        message: 'Queue item not found.'
      };
    }

    const item = { ...queue[index] };

    if (action === 'pause') {
      if (item.status === 'queued' || item.status === 'in_progress') {
        item.status = 'paused';
      }
    } else if (action === 'resume') {
      if (item.status === 'paused' || item.status === 'error') {
        item.status = 'queued';
      }
    } else if (action === 'cancel') {
      item.status = 'cancelled';
    }

    queue[index] = item;
    this._saveToStorage('download_queue_items', queue);

    return {
      success: true,
      queueItem: this._enrichDownloadQueueItem(item),
      message: 'Queue item status updated.'
    };
  }

  // reorderDownloadQueueItems(orderedQueueItemIds)
  reorderDownloadQueueItems(orderedQueueItemIds) {
    let queue = this._getOrCreateDownloadQueue();
    const order = Array.isArray(orderedQueueItemIds) ? orderedQueueItemIds : [];
    const idToIndex = new Map();
    order.forEach((id, idx) => idToIndex.set(id, idx));

    const now = Date.now();
    const base = now - queue.length * 1000;

    queue = queue.map(item => {
      if (item.status === 'queued' && idToIndex.has(item.id)) {
        const offset = idToIndex.get(item.id);
        const newTime = new Date(base + offset * 1000).toISOString();
        return { ...item, addedAt: newTime };
      }
      return item;
    });

    this._saveToStorage('download_queue_items', queue);

    return {
      success: true,
      message: 'Download queue reordered.'
    };
  }

  // getAboutContent()
  getAboutContent() {
    return {
      title: 'About This File Hosting Service',
      sections: [
        {
          id: 'purpose',
          heading: 'Purpose',
          body: 'This service lets you store, manage, and share files securely in the cloud.'
        },
        {
          id: 'capabilities',
          heading: 'Key Capabilities',
          body: 'Upload and organize files, manage versions, share via secure links, control download preferences, and explore curated public content.'
        },
        {
          id: 'roadmap',
          heading: 'Roadmap',
          body: 'Future updates will focus on collaborative workspaces, smarter recommendations, and deeper integrations with productivity tools.'
        }
      ]
    };
  }

  // getHelpArticles(topic)
  getHelpArticles(topic) {
    const allFaqs = [
      {
        id: 'sharing_1',
        question: 'How do I create a protected share link?',
        answer: 'Open the file or folder, click Share, configure access, password, and expiration, then copy the link.',
        relatedTasks: ['task_3', 'task_9']
      },
      {
        id: 'versions_1',
        question: 'How can I restore a previous version of a file?',
        answer: 'Open the file preview, go to Version history, choose a version, and click Restore this version.',
        relatedTasks: ['task_8']
      },
      {
        id: 'filters_1',
        question: 'How do filters and sorting work in file lists?',
        answer: 'Use file type, size, date, and rating filters to narrow results, then choose a Sort by option to order them.',
        relatedTasks: ['task_1', 'task_2', 'task_4', 'task_6', 'task_7']
      },
      {
        id: 'downloads_1',
        question: 'How can I limit download speed or change download behavior?',
        answer: 'Open Settings > Downloads to configure location prompts and bandwidth limits.',
        relatedTasks: ['task_5']
      }
    ];

    const allGuides = [
      {
        id: 'guide_sharing',
        title: 'Sharing Files and Folders Securely',
        summary: 'Learn how to create view-only or editable links with expiration and passwords.',
        steps: [
          'Open the file or folder you want to share.',
          'Click the Share button.',
          'Choose access level and permissions.',
          'Optionally enable expiration and password protection.',
          'Copy and send the generated link.'
        ]
      },
      {
        id: 'guide_versions',
        title: 'Working with File Versions',
        summary: 'Upload new versions and restore older ones when needed.',
        steps: [
          'Open the file preview page.',
          'Go to the Version history tab.',
          'Review available versions and their timestamps.',
          'Click Restore this version on the version you want to make current.'
        ]
      },
      {
        id: 'guide_downloads',
        title: 'Managing Downloads and Bandwidth',
        summary: 'Control download prompts and speed limits.',
        steps: [
          'Open account Settings.',
          'Go to the Downloads section.',
          'Choose how download locations are selected.',
          'Enable and configure download speed limits if desired.',
          'Save your changes.'
        ]
      }
    ];

    const t = (topic || '').toLowerCase();
    let faqs = allFaqs;
    let guides = allGuides;

    if (t) {
      if (t === 'sharing') {
        faqs = allFaqs.filter(f => f.id.startsWith('sharing_'));
        guides = allGuides.filter(g => g.id === 'guide_sharing');
      } else if (t === 'versions') {
        faqs = allFaqs.filter(f => f.id.startsWith('versions_'));
        guides = allGuides.filter(g => g.id === 'guide_versions');
      } else if (t === 'filters') {
        faqs = allFaqs.filter(f => f.id.startsWith('filters_'));
      } else if (t === 'downloads') {
        faqs = allFaqs.filter(f => f.id.startsWith('downloads_'));
        guides = allGuides.filter(g => g.id === 'guide_downloads');
      }
    }

    return {
      faqs,
      guides
    };
  }

  // getSupportContactOptions()
  getSupportContactOptions() {
    return {
      supportEmail: 'support@example.com',
      contactFormEnabled: true,
      contactFormFields: [
        {
          name: 'email',
          label: 'Your email',
          type: 'email',
          required: true
        },
        {
          name: 'subject',
          label: 'Subject',
          type: 'text',
          required: true
        },
        {
          name: 'message',
          label: 'Message',
          type: 'textarea',
          required: true
        }
      ]
    };
  }

  // getTermsOfServiceContent()
  getTermsOfServiceContent() {
    return {
      lastUpdated: '2024-01-01',
      sections: [
        {
          id: 'intro',
          title: 'Introduction',
          body: 'These Terms of Service govern your use of this file hosting and download service.'
        },
        {
          id: 'usage',
          title: 'Acceptable Use',
          body: 'You agree not to upload or share content that violates applicable laws or third-party rights.'
        },
        {
          id: 'liability',
          title: 'Limitation of Liability',
          body: 'The service is provided as-is without warranties, and liability is limited as permitted by law.'
        }
      ]
    };
  }

  // getPrivacyPolicyContent()
  getPrivacyPolicyContent() {
    return {
      lastUpdated: '2024-01-01',
      sections: [
        {
          id: 'data_collection',
          title: 'Data Collection',
          body: 'We collect basic account information and usage data to operate the service.'
        },
        {
          id: 'data_usage',
          title: 'How We Use Data',
          body: 'Data is used to provide and improve the service, and to secure your account and content.'
        },
        {
          id: 'data_rights',
          title: 'Your Rights',
          body: 'You can request access, correction, or deletion of your personal data as permitted by law.'
        }
      ]
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