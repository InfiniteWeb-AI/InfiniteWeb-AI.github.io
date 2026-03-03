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

  // ---------------------- Storage helpers ----------------------

  _initStorage() {
    const ensureArrayKey = (key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    };

    // Core entity tables
    ensureArrayKey('publications');
    ensureArrayKey('saved_lists');
    ensureArrayKey('saved_list_items');
    ensureArrayKey('notes');
    ensureArrayKey('projects');
    ensureArrayKey('team_members');
    ensureArrayKey('project_team_members');
    ensureArrayKey('bookmark_folders');
    ensureArrayKey('bookmarks');
    ensureArrayKey('courses');
    ensureArrayKey('events');
    ensureArrayKey('event_reminders');
    ensureArrayKey('contact_requests');
    ensureArrayKey('availability_slots');

    // Singleton / object-style tables
    if (!localStorage.getItem('profile_settings')) {
      localStorage.setItem('profile_settings', JSON.stringify(null));
    }
    if (!localStorage.getItem('about_page_content')) {
      const about = {
        biographyHtml: '',
        researchThemes: [],
        positions: []
      };
      localStorage.setItem('about_page_content', JSON.stringify(about));
    }
    if (!localStorage.getItem('cv_content')) {
      const cv = {
        cvSections: [],
        lastUpdated: null,
        downloadFileId: null
      };
      localStorage.setItem('cv_content', JSON.stringify(cv));
    }
    if (!localStorage.getItem('contact_form_config')) {
      const cfg = {
        reasonOptions: [
          { value: 'general_inquiry', label: 'General inquiry' },
          { value: 'prospective_phd_student', label: 'Prospective PhD student' },
          { value: 'prospective_ms_student', label: 'Prospective Master\'s student' },
          { value: 'collaboration_request', label: 'Collaboration request' },
          { value: 'media_request', label: 'Media request' },
          { value: 'other', label: 'Other' }
        ],
        defaultReason: 'general_inquiry',
        instructions: '',
        officeHours: '',
        schedulerConfig: {
          timeZone: 'UTC',
          slotDurationMinutes: 30,
          minDate: null,
          maxDate: null
        }
      };
      localStorage.setItem('contact_form_config', JSON.stringify(cfg));
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

  _nowIso() {
    return new Date().toISOString();
  }

  _parseDate(dateStr) {
    return dateStr ? new Date(dateStr) : null;
  }

  _clone(obj) {
    return obj == null ? obj : JSON.parse(JSON.stringify(obj));
  }

  // ---------------------- Private helpers (required) ----------------------

  // Internal helper to find an existing SavedList by name and listType or create it if not exist.
  _getOrCreateSavedListByNameAndType(name, listType) {
    const trimmedName = (name || '').trim() || 'Untitled list';
    let lists = this._getFromStorage('saved_lists');
    let existing = lists.find(
      (l) => l.listType === listType && typeof l.name === 'string' && l.name.toLowerCase() === trimmedName.toLowerCase()
    );
    if (existing) {
      return existing;
    }
    const now = this._nowIso();
    const newList = {
      id: this._generateId('list'),
      name: trimmedName,
      listType: listType,
      description: '',
      createdAt: now,
      updatedAt: now
    };
    lists.push(newList);
    this._saveToStorage('saved_lists', lists);
    return newList;
  }

  // Internal helper to find or create a BookmarkFolder with a given name.
  _getOrCreateBookmarkFolderByName(name) {
    const trimmedName = (name || '').trim() || 'Uncategorized';
    let folders = this._getFromStorage('bookmark_folders');
    let existing = folders.find(
      (f) => typeof f.name === 'string' && f.name.toLowerCase() === trimmedName.toLowerCase()
    );
    if (existing) {
      return existing;
    }
    const folder = {
      id: this._generateId('bmf'),
      name: trimmedName,
      description: '',
      createdAt: this._nowIso()
    };
    folders.push(folder);
    this._saveToStorage('bookmark_folders', folders);
    return folder;
  }

  // Internal helper to apply filter and sort logic to Publication records.
  _applyPublicationFiltersAndSort(publications, query, filters, sortOrder) {
    let results = Array.isArray(publications) ? publications.slice() : [];

    const q = (query || '').trim().toLowerCase();
    if (q) {
      results = results.filter((p) => {
        const inTitle = (p.title || '').toLowerCase().includes(q);
        const inAbstract = (p.abstract || '').toLowerCase().includes(q);
        const inKeywords = Array.isArray(p.keywords)
          ? p.keywords.some((k) => (k || '').toLowerCase().includes(q))
          : false;
        const inTopics = Array.isArray(p.topics)
          ? p.topics.some((k) => (k || '').toLowerCase().includes(q))
          : false;
        return inTitle || inAbstract || inKeywords || inTopics;
      });
    }

    if (filters && typeof filters === 'object') {
      if (Array.isArray(filters.publicationTypes) && filters.publicationTypes.length > 0) {
        const set = new Set(filters.publicationTypes);
        results = results.filter((p) => set.has(p.publicationType));
      }
      if (typeof filters.minYear === 'number') {
        results = results.filter((p) => typeof p.year === 'number' && p.year >= filters.minYear);
      }
      if (typeof filters.maxYear === 'number') {
        results = results.filter((p) => typeof p.year === 'number' && p.year <= filters.maxYear);
      }
      if (typeof filters.minCitationCount === 'number') {
        results = results.filter(
          (p) => typeof p.citationCount === 'number' && p.citationCount >= filters.minCitationCount
        );
      }
      if (typeof filters.maxCitationCount === 'number') {
        results = results.filter(
          (p) => typeof p.citationCount === 'number' && p.citationCount <= filters.maxCitationCount
        );
      }
      if (Array.isArray(filters.keywords) && filters.keywords.length > 0) {
        const kw = filters.keywords.map((k) => (k || '').toLowerCase());
        results = results.filter((p) => {
          if (!Array.isArray(p.keywords) || p.keywords.length === 0) return false;
          const lower = p.keywords.map((k) => (k || '').toLowerCase());
          return kw.some((k) => lower.includes(k));
        });
      }
    }

    const order = sortOrder || 'citations_high_to_low';
    results.sort((a, b) => {
      const yearA = typeof a.year === 'number' ? a.year : 0;
      const yearB = typeof b.year === 'number' ? b.year : 0;
      const citA = typeof a.citationCount === 'number' ? a.citationCount : 0;
      const citB = typeof b.citationCount === 'number' ? b.citationCount : 0;

      if (order === 'citations_low_to_high') {
        if (citA !== citB) return citA - citB;
        return yearA - yearB;
      }
      if (order === 'year_newest_first') {
        if (yearA !== yearB) return yearB - yearA;
        return citB - citA;
      }
      if (order === 'year_oldest_first') {
        if (yearA !== yearB) return yearA - yearB;
        return citB - citA;
      }
      // default 'citations_high_to_low'
      if (citA !== citB) return citB - citA;
      return yearB - yearA;
    });

    return results;
  }

  // Internal helper to compute reminderDateTime
  _calculateReminderDateTime(eventStartDateTime, reminderOffsetDays) {
    const start = this._parseDate(eventStartDateTime);
    if (!start || typeof reminderOffsetDays !== 'number') return null;
    const msOffset = reminderOffsetDays * 24 * 60 * 60 * 1000;
    const reminder = new Date(start.getTime() - msOffset);
    return reminder.toISOString();
  }

  // Internal helper to load or initialize the single ProfileSettings record.
  _getProfileSettingsSingleton() {
    const raw = localStorage.getItem('profile_settings');
    let settings = raw ? JSON.parse(raw) : null;
    if (!settings) {
      settings = {
        id: 'profile_settings_singleton',
        tagline: '',
        primaryResearchKeywords: [],
        publicationsDisplayCount: 5,
        publicationsSortOrder: 'citations_high_to_low',
        featuredPublicationId: null,
        updatedAt: this._nowIso()
      };
      localStorage.setItem('profile_settings', JSON.stringify(settings));
    }
    return settings;
  }

  _saveProfileSettings(settings) {
    localStorage.setItem('profile_settings', JSON.stringify(settings));
  }

  // ---------------------- Interface implementations ----------------------

  // getHomePageOverview
  getHomePageOverview() {
    const settings = this._getProfileSettingsSingleton();
    const publications = this._getFromStorage('publications');
    const projects = this._getFromStorage('projects');
    const events = this._getFromStorage('events');
    const courses = this._getFromStorage('courses');

    // Featured publication
    let featuredPublication = null;
    let isExplicitlyFeatured = false;
    if (settings.featuredPublicationId) {
      featuredPublication = publications.find((p) => p.id === settings.featuredPublicationId) || null;
      if (featuredPublication) {
        isExplicitlyFeatured = true;
      }
    }
    if (!featuredPublication && publications.length > 0) {
      const sortedByCitations = publications.slice().sort((a, b) => {
        const ca = typeof a.citationCount === 'number' ? a.citationCount : 0;
        const cb = typeof b.citationCount === 'number' ? b.citationCount : 0;
        return cb - ca;
      });
      featuredPublication = sortedByCitations[0] || null;
      isExplicitlyFeatured = false;
    }

    // Featured project: highest-funded active project
    let featuredProject = null;
    const activeProjects = projects.filter((p) => p.status === 'active');
    if (activeProjects.length > 0) {
      featuredProject = activeProjects.slice().sort((a, b) => {
        const fa = typeof a.fundingAmount === 'number' ? a.fundingAmount : 0;
        const fb = typeof b.fundingAmount === 'number' ? b.fundingAmount : 0;
        return fb - fa;
      })[0];
    }

    // Next upcoming public event
    const now = new Date();
    const upcomingPublicEvents = events.filter((e) => {
      const start = this._parseDate(e.startDateTime);
      if (!start) return false;
      if (e.accessType !== 'public') return false;
      if (e.isCanceled) return false;
      return start >= now;
    });
    let nextUpcomingEvent = null;
    if (upcomingPublicEvents.length > 0) {
      nextUpcomingEvent = upcomingPublicEvents
        .slice()
        .sort((a, b) => this._parseDate(a.startDateTime) - this._parseDate(b.startDateTime))[0];
    }

    const upcomingEventsCount = upcomingPublicEvents.length;

    return {
      tagline: settings.tagline || '',
      primaryResearchKeywords: Array.isArray(settings.primaryResearchKeywords)
        ? settings.primaryResearchKeywords
        : [],
      featuredPublication: featuredPublication
        ? { publication: featuredPublication, isExplicitlyFeatured: isExplicitlyFeatured }
        : { publication: null, isExplicitlyFeatured: false },
      featuredProject: featuredProject || null,
      nextUpcomingEvent: nextUpcomingEvent || null,
      summaryCounts: {
        publicationsCount: publications.length,
        projectsCount: projects.length,
        coursesCount: courses.length,
        upcomingEventsCount: upcomingEventsCount
      }
    };
  }

  // getPublicationFilterOptions
  getPublicationFilterOptions() {
    const publications = this._getFromStorage('publications');
    const typesSet = new Set();
    const years = [];
    const citations = [];

    for (const p of publications) {
      if (p.publicationType) typesSet.add(p.publicationType);
      if (typeof p.year === 'number') years.push(p.year);
      if (typeof p.citationCount === 'number') citations.push(p.citationCount);
    }

    const publicationTypes = Array.from(typesSet).map((value) => ({
      value,
      label: value
        .split('_')
        .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
        .join(' ')
    }));

    const yearRange = {
      minYear: years.length ? Math.min.apply(null, years) : null,
      maxYear: years.length ? Math.max.apply(null, years) : null
    };

    const citationCountRange = {
      minCitations: citations.length ? Math.min.apply(null, citations) : null,
      maxCitations: citations.length ? Math.max.apply(null, citations) : null
    };

    const sortOptions = [
      { value: 'citations_high_to_low', label: 'Citations – High to Low' },
      { value: 'citations_low_to_high', label: 'Citations – Low to High' },
      { value: 'year_newest_first', label: 'Year – Newest First' },
      { value: 'year_oldest_first', label: 'Year – Oldest First' }
    ];

    return {
      publicationTypes,
      yearRange,
      citationCountRange,
      sortOptions
    };
  }

  // searchPublications(query, filters, sortOrder, page, pageSize)
  searchPublications(query, filters, sortOrder, page, pageSize) {
    const publications = this._getFromStorage('publications');
    const settings = this._getProfileSettingsSingleton();
    const effectivePage = typeof page === 'number' && page > 0 ? page : 1;
    const effectivePageSize = typeof pageSize === 'number' && pageSize > 0 ? pageSize : 20;

    const filteredSorted = this._applyPublicationFiltersAndSort(publications, query, filters || {}, sortOrder);

    const total = filteredSorted.length;
    const startIndex = (effectivePage - 1) * effectivePageSize;
    const endIndex = startIndex + effectivePageSize;
    const pageItems = filteredSorted.slice(startIndex, endIndex);

    const results = pageItems.map((p) => {
      const authors = Array.isArray(p.authors) ? p.authors : [];
      const authorsDisplay = authors.join(', ');
      const isFeaturedFlag = !!p.isFeatured || p.id === settings.featuredPublicationId;
      return {
        id: p.id,
        title: p.title,
        year: p.year,
        publicationType: p.publicationType,
        venueName: p.venueName,
        citationCount: p.citationCount,
        keywords: Array.isArray(p.keywords) ? p.keywords : [],
        authorsDisplay,
        isFeatured: isFeaturedFlag
      };
    });

    return {
      results,
      total,
      page: effectivePage,
      pageSize: effectivePageSize
    };
  }

  // getReadingListsForPublications
  getReadingListsForPublications() {
    const lists = this._getFromStorage('saved_lists');
    return lists.filter((l) => l.listType === 'reading_list');
  }

  // savePublicationsToReadingList(listId, listName, description, publicationIds)
  savePublicationsToReadingList(listId, listName, description, publicationIds) {
    let lists = this._getFromStorage('saved_lists');
    let items = this._getFromStorage('saved_list_items');

    let targetList = null;
    if (listId) {
      targetList = lists.find((l) => l.id === listId && l.listType === 'reading_list') || null;
    }
    if (!targetList) {
      targetList = this._getOrCreateSavedListByNameAndType(listName || 'Thesis Sources', 'reading_list');
      lists = this._getFromStorage('saved_lists');
    }
    if (description && typeof description === 'string') {
      targetList.description = description;
      targetList.updatedAt = this._nowIso();
      this._saveToStorage('saved_lists', lists);
    }

    let addedCount = 0;
    if (Array.isArray(publicationIds)) {
      const now = this._nowIso();
      for (const pubId of publicationIds) {
        const exists = items.some(
          (it) => it.listId === targetList.id && it.itemType === 'publication' && it.itemId === pubId
        );
        if (!exists) {
          const newItem = {
            id: this._generateId('sli'),
            listId: targetList.id,
            itemType: 'publication',
            itemId: pubId,
            addedAt: now
          };
          items.push(newItem);
          addedCount++;
        }
      }
      this._saveToStorage('saved_list_items', items);
    }

    const totalItemsInList = items.filter((it) => it.listId === targetList.id).length;

    return {
      success: true,
      list: targetList,
      addedItemCount: addedCount,
      totalItemsInList,
      message: 'Publications saved to reading list.'
    };
  }

  // addPublicationToReadingList(publicationId, listId, listName)
  addPublicationToReadingList(publicationId, listId, listName) {
    let lists = this._getFromStorage('saved_lists');
    let items = this._getFromStorage('saved_list_items');

    let targetList = null;
    if (listId) {
      targetList = lists.find((l) => l.id === listId && l.listType === 'reading_list') || null;
    }
    if (!targetList) {
      targetList = this._getOrCreateSavedListByNameAndType(listName || 'Reading list', 'reading_list');
      lists = this._getFromStorage('saved_lists');
    }

    let savedListItem = items.find(
      (it) => it.listId === targetList.id && it.itemType === 'publication' && it.itemId === publicationId
    );

    let message;
    if (!savedListItem) {
      savedListItem = {
        id: this._generateId('sli'),
        listId: targetList.id,
        itemType: 'publication',
        itemId: publicationId,
        addedAt: this._nowIso()
      };
      items.push(savedListItem);
      this._saveToStorage('saved_list_items', items);
      message = 'Publication added to reading list.';
    } else {
      message = 'Publication already in reading list.';
    }

    return {
      success: true,
      list: targetList,
      savedListItem,
      message
    };
  }

  // getPublicationDetail(publicationId)
  getPublicationDetail(publicationId) {
    const publications = this._getFromStorage('publications');
    const events = this._getFromStorage('events');
    const projects = this._getFromStorage('projects');

    const publication = publications.find((p) => p.id === publicationId) || null;
    if (!publication) {
      return {
        publication: null,
        authorsDisplay: '',
        citationStylesAvailable: ['apa', 'mla', 'chicago', 'bibtex'],
        relatedProjects: [],
        relatedEvents: []
      };
    }

    const authors = Array.isArray(publication.authors) ? publication.authors : [];
    const authorsDisplay = authors.join(', ');

    const relatedEvents = events.filter((e) => {
      return Array.isArray(e.relatedPublicationIds) && e.relatedPublicationIds.includes(publicationId);
    });

    const projectIdSet = new Set();
    for (const e of relatedEvents) {
      if (Array.isArray(e.relatedProjectIds)) {
        for (const pid of e.relatedProjectIds) {
          projectIdSet.add(pid);
        }
      }
    }
    const relatedProjects = projects.filter((p) => projectIdSet.has(p.id));

    return {
      publication,
      authorsDisplay,
      citationStylesAvailable: ['apa', 'mla', 'chicago', 'bibtex'],
      relatedProjects,
      relatedEvents
    };
  }

  // getPublicationCitation(publicationId, style)
  getPublicationCitation(publicationId, style) {
    const publications = this._getFromStorage('publications');
    const publication = publications.find((p) => p.id === publicationId) || null;
    const normalizedStyle = style || 'apa';

    if (!publication) {
      return {
        style: normalizedStyle,
        citationText: ''
      };
    }

    let citationText = '';

    if (normalizedStyle === 'apa') {
      if (publication.apaCitation) {
        citationText = publication.apaCitation;
      } else {
        const authors = Array.isArray(publication.authors) ? publication.authors.join(', ') : '';
        const year = publication.year ? `(${publication.year}).` : '';
        const title = publication.title || '';
        const venue = publication.venueName ? `${publication.venueName}.` : '';
        const doi = publication.doi ? ` https://doi.org/${publication.doi}` : '';
        citationText = [authors, year, title, venue].filter(Boolean).join(' ') + doi;
      }
    } else if (normalizedStyle === 'mla') {
      const authors = Array.isArray(publication.authors) ? publication.authors.join(', ') : '';
      const title = publication.title ? `"${publication.title}."` : '';
      const venue = publication.venueName || '';
      const year = publication.year || '';
      citationText = [authors, title, venue, year].filter(Boolean).join(' ');
    } else if (normalizedStyle === 'chicago') {
      const authors = Array.isArray(publication.authors) ? publication.authors.join(', ') : '';
      const title = publication.title ? `"${publication.title}"` : '';
      const venue = publication.venueName || '';
      const year = publication.year || '';
      citationText = [authors + '.', title + '.', venue, year + '.'].filter(Boolean).join(' ');
    } else if (normalizedStyle === 'bibtex') {
      const key = publication.id || 'citationKey';
      citationText = `@article{${key},\n  title={${publication.title || ''}},\n  year={${publication.year || ''}},\n  journal={${publication.venueName || ''}}\n}`;
    }

    return {
      style: normalizedStyle,
      citationText
    };
  }

  // getNotesList (with foreign key resolution)
  getNotesList() {
    const notes = this._getFromStorage('notes');
    const publications = this._getFromStorage('publications');
    return notes.map((n) => {
      const relatedPublication = n.relatedPublicationId
        ? publications.find((p) => p.id === n.relatedPublicationId) || null
        : null;
      return {
        ...n,
        relatedPublication
      };
    });
  }

  // createNote(title, content, relatedPublicationId)
  createNote(title, content, relatedPublicationId) {
    const notes = this._getFromStorage('notes');
    const now = this._nowIso();
    const note = {
      id: this._generateId('note'),
      title,
      content,
      relatedPublicationId: relatedPublicationId || null,
      createdAt: now,
      updatedAt: now
    };
    notes.push(note);
    this._saveToStorage('notes', notes);
    return note;
  }

  // updateNote(noteId, title, content)
  updateNote(noteId, title, content) {
    const notes = this._getFromStorage('notes');
    const idx = notes.findIndex((n) => n.id === noteId);
    if (idx === -1) return null;
    if (typeof title === 'string') notes[idx].title = title;
    if (typeof content === 'string') notes[idx].content = content;
    notes[idx].updatedAt = this._nowIso();
    this._saveToStorage('notes', notes);
    return notes[idx];
  }

  // deleteNote(noteId)
  deleteNote(noteId) {
    const notes = this._getFromStorage('notes');
    const newNotes = notes.filter((n) => n.id !== noteId);
    const success = newNotes.length !== notes.length;
    if (success) {
      this._saveToStorage('notes', newNotes);
    }
    return { success };
  }

  // getProjectFilterOptions
  getProjectFilterOptions() {
    const projects = this._getFromStorage('projects');
    const statusSet = new Set();
    for (const p of projects) {
      if (p.status) statusSet.add(p.status);
    }
    const statusOptions = Array.from(statusSet).map((value) => ({
      value,
      label: value
        .split('_')
        .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
        .join(' ')
    }));
    const sortOptions = [
      { value: 'funding_high_to_low', label: 'Funding – High to Low' },
      { value: 'funding_low_to_high', label: 'Funding – Low to High' },
      { value: 'start_date_newest_first', label: 'Start date – Newest First' },
      { value: 'start_date_oldest_first', label: 'Start date – Oldest First' }
    ];
    return { statusOptions, sortOptions };
  }

  // searchProjects(query, filters, sortOrder, page, pageSize)
  searchProjects(query, filters, sortOrder, page, pageSize) {
    const projects = this._getFromStorage('projects');
    const bookmarks = this._getFromStorage('bookmarks');
    const bookmarkFolders = this._getFromStorage('bookmark_folders');

    const q = (query || '').trim().toLowerCase();

    let results = projects.slice();
    if (q) {
      results = results.filter((p) => {
        const t = (p.title || '').toLowerCase();
        const st = (p.shortTitle || '').toLowerCase();
        const d = (p.description || '').toLowerCase();
        const kw = Array.isArray(p.topicKeywords)
          ? p.topicKeywords.map((k) => (k || '').toLowerCase())
          : [];
        return (
          t.includes(q) ||
          st.includes(q) ||
          d.includes(q) ||
          kw.some((k) => k.includes(q))
        );
      });
    }

    if (filters && typeof filters === 'object') {
      if (filters.status) {
        results = results.filter((p) => p.status === filters.status);
      }
      if (typeof filters.climateRelated === 'boolean') {
        results = results.filter((p) => !!p.climateRelated === filters.climateRelated);
      }
      if (typeof filters.minFundingAmount === 'number') {
        results = results.filter(
          (p) => typeof p.fundingAmount === 'number' && p.fundingAmount >= filters.minFundingAmount
        );
      }
      if (typeof filters.maxFundingAmount === 'number') {
        results = results.filter(
          (p) => typeof p.fundingAmount === 'number' && p.fundingAmount <= filters.maxFundingAmount
        );
      }
      if (typeof filters.minTeamMemberCount === 'number') {
        results = results.filter(
          (p) => typeof p.teamMemberCount === 'number' && p.teamMemberCount >= filters.minTeamMemberCount
        );
      }
    }

    const order = sortOrder || 'funding_high_to_low';
    results.sort((a, b) => {
      const fa = typeof a.fundingAmount === 'number' ? a.fundingAmount : 0;
      const fb = typeof b.fundingAmount === 'number' ? b.fundingAmount : 0;
      const sa = this._parseDate(a.startDate) || new Date(0);
      const sb = this._parseDate(b.startDate) || new Date(0);

      if (order === 'funding_low_to_high') {
        if (fa !== fb) return fa - fb;
        return sa - sb;
      }
      if (order === 'start_date_newest_first') {
        if (sa.getTime() !== sb.getTime()) return sb - sa;
        return fb - fa;
      }
      if (order === 'start_date_oldest_first') {
        if (sa.getTime() !== sb.getTime()) return sa - sb;
        return fb - fa;
      }
      // default funding_high_to_low
      if (fb !== fa) return fb - fa;
      return sb - sa;
    });

    const effectivePage = typeof page === 'number' && page > 0 ? page : 1;
    const effectivePageSize = typeof pageSize === 'number' && pageSize > 0 ? pageSize : 20;
    const total = results.length;
    const startIndex = (effectivePage - 1) * effectivePageSize;
    const endIndex = startIndex + effectivePageSize;
    const pageItems = results.slice(startIndex, endIndex);

    const mapped = pageItems.map((p) => {
      const projectBookmarks = bookmarks.filter(
        (b) => b.itemType === 'project' && b.itemId === p.id
      );
      const isBookmarked = projectBookmarks.length > 0;
      const folderNamesSet = new Set();
      for (const bm of projectBookmarks) {
        if (!bm.folderId) continue;
        const folder = bookmarkFolders.find((f) => f.id === bm.folderId);
        if (folder && folder.name) folderNamesSet.add(folder.name);
      }
      return {
        id: p.id,
        title: p.title,
        shortTitle: p.shortTitle,
        status: p.status,
        fundingAmount: p.fundingAmount,
        fundingCurrency: p.fundingCurrency,
        teamMemberCount: p.teamMemberCount,
        climateRelated: !!p.climateRelated,
        isBookmarked,
        bookmarkFolderNames: Array.from(folderNamesSet)
      };
    });

    return {
      results: mapped,
      total,
      page: effectivePage,
      pageSize: effectivePageSize
    };
  }

  // getProjectDetail(projectId)
  getProjectDetail(projectId) {
    const projects = this._getFromStorage('projects');
    const projectTeamMembers = this._getFromStorage('project_team_members');
    const teamMembers = this._getFromStorage('team_members');
    const bookmarks = this._getFromStorage('bookmarks');
    const bookmarkFolders = this._getFromStorage('bookmark_folders');
    const events = this._getFromStorage('events');
    const publications = this._getFromStorage('publications');

    const project = projects.find((p) => p.id === projectId) || null;
    if (!project) {
      return {
        project: null,
        teamMembers: [],
        isBookmarked: false,
        bookmarkFolderIds: [],
        relatedPublications: [],
        relatedEvents: []
      };
    }

    const ptms = projectTeamMembers.filter((ptm) => ptm.projectId === projectId);
    const teamMembersOut = ptms.map((ptm) => {
      const tm = teamMembers.find((t) => t.id === ptm.teamMemberId) || {};
      return {
        id: tm.id,
        fullName: tm.fullName,
        role: ptm.role || tm.role || '',
        affiliation: tm.affiliation
      };
    });

    const projectBookmarks = bookmarks.filter(
      (b) => b.itemType === 'project' && b.itemId === projectId
    );
    const isBookmarked = projectBookmarks.length > 0;
    const bookmarkFolderIds = projectBookmarks
      .map((b) => b.folderId)
      .filter((id) => !!id && bookmarkFolders.some((f) => f.id === id));

    const relatedEvents = events.filter(
      (e) => Array.isArray(e.relatedProjectIds) && e.relatedProjectIds.includes(projectId)
    );

    const pubIdSet = new Set();
    for (const e of relatedEvents) {
      if (Array.isArray(e.relatedPublicationIds)) {
        for (const pid of e.relatedPublicationIds) pubIdSet.add(pid);
      }
    }
    const relatedPublications = publications.filter((p) => pubIdSet.has(p.id));

    return {
      project,
      teamMembers: teamMembersOut,
      isBookmarked,
      bookmarkFolderIds,
      relatedPublications,
      relatedEvents
    };
  }

  // getBookmarkFolders
  getBookmarkFolders() {
    return this._getFromStorage('bookmark_folders');
  }

  // saveProjectBookmark(projectId, folderId, folderName)
  saveProjectBookmark(projectId, folderId, folderName) {
    let bookmarks = this._getFromStorage('bookmarks');
    let folder = null;

    if (folderId) {
      const folders = this._getFromStorage('bookmark_folders');
      folder = folders.find((f) => f.id === folderId) || null;
    }
    if (!folder && folderName) {
      folder = this._getOrCreateBookmarkFolderByName(folderName);
    }

    let bookmark = bookmarks.find(
      (b) =>
        b.itemType === 'project' &&
        b.itemId === projectId &&
        ((folder && b.folderId === folder.id) || (!folder && !b.folderId))
    );

    let message;
    if (!bookmark) {
      bookmark = {
        id: this._generateId('bm'),
        folderId: folder ? folder.id : null,
        itemType: 'project',
        itemId: projectId,
        createdAt: this._nowIso()
      };
      bookmarks.push(bookmark);
      this._saveToStorage('bookmarks', bookmarks);
      message = 'Project bookmarked.';
    } else {
      message = 'Project already bookmarked.';
    }

    return {
      success: true,
      bookmark,
      folder: folder || null,
      message
    };
  }

  // getCourseFilterOptions
  getCourseFilterOptions() {
    const courses = this._getFromStorage('courses');
    const termSet = new Set();
    const levelSet = new Set();
    const credits = [];

    for (const c of courses) {
      if (c.termLabel) termSet.add(c.termLabel);
      if (c.level) levelSet.add(c.level);
      if (typeof c.credits === 'number') credits.push(c.credits);
    }

    const termLabels = Array.from(termSet).sort();
    const levelOptions = Array.from(levelSet).map((value) => ({
      value,
      label: value
        .split('_')
        .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
        .join(' ')
    }));

    const creditRange = {
      minCredits: credits.length ? Math.min.apply(null, credits) : null,
      maxCredits: credits.length ? Math.max.apply(null, credits) : null
    };

    const sortOptions = [
      { value: 'course_number_low_to_high', label: 'Course number – Low to High' },
      { value: 'course_number_high_to_low', label: 'Course number – High to Low' },
      { value: 'term_newest_first', label: 'Term – Newest First' },
      { value: 'term_oldest_first', label: 'Term – Oldest First' }
    ];

    return { termLabels, levelOptions, creditRange, sortOptions };
  }

  // searchCourses(filters, sortOrder, page, pageSize)
  searchCourses(filters, sortOrder, page, pageSize) {
    const courses = this._getFromStorage('courses');
    let results = courses.slice();

    const f = filters || {};
    if (f.termLabel) {
      results = results.filter((c) => c.termLabel === f.termLabel);
    }
    if (f.termSeason) {
      results = results.filter((c) => c.termSeason === f.termSeason);
    }
    if (typeof f.termYear === 'number') {
      results = results.filter((c) => c.termYear === f.termYear);
    }
    if (f.level) {
      results = results.filter((c) => c.level === f.level);
    }
    if (typeof f.minCredits === 'number') {
      results = results.filter((c) => typeof c.credits === 'number' && c.credits >= f.minCredits);
    }
    if (typeof f.maxCredits === 'number') {
      results = results.filter((c) => typeof c.credits === 'number' && c.credits <= f.maxCredits);
    }

    const seasonOrder = { spring: 1, summer: 2, fall: 3, winter: 4, other: 5 };
    const order = sortOrder || 'course_number_low_to_high';

    results.sort((a, b) => {
      const numA = typeof a.courseNumber === 'number' ? a.courseNumber : 0;
      const numB = typeof b.courseNumber === 'number' ? b.courseNumber : 0;
      const yearA = typeof a.termYear === 'number' ? a.termYear : 0;
      const yearB = typeof b.termYear === 'number' ? b.termYear : 0;
      const seasonA = seasonOrder[a.termSeason] || 99;
      const seasonB = seasonOrder[b.termSeason] || 99;

      if (order === 'course_number_high_to_low') {
        if (numA !== numB) return numB - numA;
        if (yearA !== yearB) return yearB - yearA;
        return seasonB - seasonA;
      }
      if (order === 'term_newest_first') {
        if (yearA !== yearB) return yearB - yearA;
        if (seasonA !== seasonB) return seasonB - seasonA;
        return numA - numB;
      }
      if (order === 'term_oldest_first') {
        if (yearA !== yearB) return yearA - yearB;
        if (seasonA !== seasonB) return seasonA - seasonB;
        return numA - numB;
      }
      // default course_number_low_to_high
      if (numA !== numB) return numA - numB;
      if (yearA !== yearB) return yearA - yearB;
      return seasonA - seasonB;
    });

    const effectivePage = typeof page === 'number' && page > 0 ? page : 1;
    const effectivePageSize = typeof pageSize === 'number' && pageSize > 0 ? pageSize : 20;
    const total = results.length;
    const startIndex = (effectivePage - 1) * effectivePageSize;
    const endIndex = startIndex + effectivePageSize;
    const pageItems = results.slice(startIndex, endIndex);

    const mapped = pageItems.map((c) => ({
      id: c.id,
      courseCode: c.courseCode,
      courseNumber: c.courseNumber,
      title: c.title,
      termLabel: c.termLabel,
      level: c.level,
      credits: c.credits,
      descriptionSnippet: (c.description || '').slice(0, 200)
    }));

    return {
      results: mapped,
      total,
      page: effectivePage,
      pageSize: effectivePageSize
    };
  }

  // getCourseLists
  getCourseLists() {
    const lists = this._getFromStorage('saved_lists');
    return lists.filter((l) => l.listType === 'course_list');
  }

  // saveCoursesToCourseList(listId, listName, courseIds)
  saveCoursesToCourseList(listId, listName, courseIds) {
    let lists = this._getFromStorage('saved_lists');
    let items = this._getFromStorage('saved_list_items');

    let targetList = null;
    if (listId) {
      targetList = lists.find((l) => l.id === listId && l.listType === 'course_list') || null;
    }
    if (!targetList) {
      targetList = this._getOrCreateSavedListByNameAndType(listName || 'Course list', 'course_list');
      lists = this._getFromStorage('saved_lists');
    }

    let addedItemCount = 0;
    const now = this._nowIso();
    if (Array.isArray(courseIds)) {
      for (const courseId of courseIds) {
        const exists = items.some(
          (it) => it.listId === targetList.id && it.itemType === 'course' && it.itemId === courseId
        );
        if (!exists) {
          const newItem = {
            id: this._generateId('sli'),
            listId: targetList.id,
            itemType: 'course',
            itemId: courseId,
            addedAt: now
          };
          items.push(newItem);
          addedItemCount++;
        }
      }
      this._saveToStorage('saved_list_items', items);
    }

    const totalItemsInList = items.filter((it) => it.listId === targetList.id).length;

    return {
      success: true,
      list: targetList,
      addedItemCount,
      totalItemsInList,
      message: 'Courses saved to course list.'
    };
  }

  // getEventFilterOptions
  getEventFilterOptions() {
    const events = this._getFromStorage('events');
    const accessTypeSet = new Set();
    const locationExamplesSet = new Set();

    for (const e of events) {
      if (e.accessType) accessTypeSet.add(e.accessType);
      if (e.locationCity) locationExamplesSet.add(e.locationCity);
      if (e.locationType === 'online' || (e.locationName || '').toLowerCase() === 'online') {
        locationExamplesSet.add('Online');
      }
    }

    const accessTypeOptions = Array.from(accessTypeSet).map((value) => ({
      value,
      label: value
        .split('_')
        .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
        .join(' ')
    }));

    const locationExamples = Array.from(locationExamplesSet);

    const defaultDateRangeDaysAhead = 180;
    const sortOptions = [
      { value: 'date_soonest_first', label: 'Date – Soonest First' },
      { value: 'date_latest_first', label: 'Date – Latest First' }
    ];

    return {
      accessTypeOptions,
      locationExamples,
      defaultDateRangeDaysAhead,
      sortOptions
    };
  }

  // searchEvents(filters, sortOrder, page, pageSize)
  searchEvents(filters, sortOrder, page, pageSize) {
    const events = this._getFromStorage('events');
    const savedLists = this._getFromStorage('saved_lists');
    const savedListItems = this._getFromStorage('saved_list_items');
    const eventReminders = this._getFromStorage('event_reminders');

    const f = filters || {};
    let results = events.slice();

    if (f.startDateTime) {
      const start = this._parseDate(f.startDateTime);
      if (start) {
        results = results.filter((e) => {
          const es = this._parseDate(e.startDateTime);
          return es && es >= start;
        });
      }
    }
    if (f.endDateTime) {
      const end = this._parseDate(f.endDateTime);
      if (end) {
        results = results.filter((e) => {
          const es = this._parseDate(e.startDateTime);
          return es && es <= end;
        });
      }
    }
    if (Array.isArray(f.locationCities) && f.locationCities.length > 0) {
      const citySet = new Set(f.locationCities.map((c) => (c || '').toLowerCase()));
      results = results.filter((e) => {
        const city = (e.locationCity || '').toLowerCase();
        const isCityMatch = city && citySet.has(city);
        const isOnlineMatch = f.includeOnline && e.locationType === 'online';
        return isCityMatch || isOnlineMatch;
      });
    } else if (f.includeOnline) {
      // Only filter by includeOnline if no specific cities are given
      // In that case, include all events, online or otherwise.
    }

    if (Array.isArray(f.accessTypes) && f.accessTypes.length > 0) {
      const accessSet = new Set(f.accessTypes);
      results = results.filter((e) => accessSet.has(e.accessType));
    }

    if (f.hideCanceled) {
      results = results.filter((e) => !e.isCanceled);
    }

    const order = sortOrder || 'date_soonest_first';
    results.sort((a, b) => {
      const sa = this._parseDate(a.startDateTime) || new Date(0);
      const sb = this._parseDate(b.startDateTime) || new Date(0);
      if (order === 'date_latest_first') {
        return sb - sa;
      }
      // default soonest first
      return sa - sb;
    });

    const effectivePage = typeof page === 'number' && page > 0 ? page : 1;
    const effectivePageSize = typeof pageSize === 'number' && pageSize > 0 ? pageSize : 20;
    const total = results.length;
    const startIndex = (effectivePage - 1) * effectivePageSize;
    const endIndex = startIndex + effectivePageSize;
    const pageItems = results.slice(startIndex, endIndex);

    const attendLists = savedLists.filter((l) => l.listType === 'event_attend_list');
    const attendListIds = new Set(attendLists.map((l) => l.id));

    const mapped = pageItems.map((e) => {
      const isInAttendList = savedListItems.some(
        (it) =>
          it.itemType === 'event' &&
          it.itemId === e.id &&
          attendListIds.has(it.listId)
      );
      const hasReminder = eventReminders.some((r) => r.eventId === e.id);
      return {
        id: e.id,
        title: e.title,
        startDateTime: e.startDateTime,
        endDateTime: e.endDateTime,
        locationName: e.locationName,
        locationCity: e.locationCity,
        locationType: e.locationType,
        accessType: e.accessType,
        isInAttendList,
        hasReminder
      };
    });

    return {
      results: mapped,
      total,
      page: effectivePage,
      pageSize: effectivePageSize
    };
  }

  // getAttendLists
  getAttendLists() {
    const lists = this._getFromStorage('saved_lists');
    return lists.filter((l) => l.listType === 'event_attend_list');
  }

  // getEventDetail(eventId) with foreign key resolution for reminders
  getEventDetail(eventId) {
    const events = this._getFromStorage('events');
    const savedLists = this._getFromStorage('saved_lists');
    const savedListItems = this._getFromStorage('saved_list_items');
    const eventReminders = this._getFromStorage('event_reminders');
    const projects = this._getFromStorage('projects');
    const publications = this._getFromStorage('publications');

    const event = events.find((e) => e.id === eventId) || null;
    if (!event) {
      return {
        event: null,
        isInAttendList: false,
        attendListIds: [],
        reminders: [],
        relatedProjects: [],
        relatedPublications: []
      };
    }

    const attendListItems = savedListItems.filter(
      (it) => it.itemType === 'event' && it.itemId === eventId
    );
    const attendListIds = Array.from(
      new Set(attendListItems.map((it) => it.listId).filter((id) => !!id))
    );
    const isInAttendList = attendListIds.length > 0;

    const remindersRaw = eventReminders.filter((r) => r.eventId === eventId);
    const reminders = remindersRaw.map((r) => {
      const list = r.listId ? savedLists.find((l) => l.id === r.listId) || null : null;
      return {
        ...r,
        event,
        list
      };
    });

    const relatedProjects = Array.isArray(event.relatedProjectIds)
      ? projects.filter((p) => event.relatedProjectIds.includes(p.id))
      : [];

    const relatedPublications = Array.isArray(event.relatedPublicationIds)
      ? publications.filter((p) => event.relatedPublicationIds.includes(p.id))
      : [];

    return {
      event,
      isInAttendList,
      attendListIds,
      reminders,
      relatedProjects,
      relatedPublications
    };
  }

  // saveEventToAttendList(eventId, listId, listName)
  saveEventToAttendList(eventId, listId, listName) {
    let lists = this._getFromStorage('saved_lists');
    let items = this._getFromStorage('saved_list_items');

    let targetList = null;
    if (listId) {
      targetList = lists.find((l) => l.id === listId && l.listType === 'event_attend_list') || null;
    }
    if (!targetList) {
      targetList = this._getOrCreateSavedListByNameAndType(listName || 'Attend', 'event_attend_list');
      lists = this._getFromStorage('saved_lists');
    }

    let savedListItem = items.find(
      (it) => it.listId === targetList.id && it.itemType === 'event' && it.itemId === eventId
    );
    let message;
    if (!savedListItem) {
      savedListItem = {
        id: this._generateId('sli'),
        listId: targetList.id,
        itemType: 'event',
        itemId: eventId,
        addedAt: this._nowIso()
      };
      items.push(savedListItem);
      this._saveToStorage('saved_list_items', items);
      message = 'Event saved to Attend list.';
    } else {
      message = 'Event already in Attend list.';
    }

    return {
      success: true,
      list: targetList,
      savedListItem,
      message
    };
  }

  // setEventReminder(eventId, listId, reminderOffsetDays)
  setEventReminder(eventId, listId, reminderOffsetDays) {
    const events = this._getFromStorage('events');
    const event = events.find((e) => e.id === eventId) || null;
    let reminders = this._getFromStorage('event_reminders');

    let reminder = reminders.find(
      (r) => r.eventId === eventId && ((listId && r.listId === listId) || (!listId && !r.listId))
    );

    const eventStart = event ? event.startDateTime : null;
    const reminderDateTime = this._calculateReminderDateTime(eventStart, reminderOffsetDays);

    if (!reminder) {
      reminder = {
        id: this._generateId('er'),
        eventId,
        listId: listId || null,
        reminderOffsetDays,
        reminderDateTime,
        createdAt: this._nowIso()
      };
      reminders.push(reminder);
    } else {
      reminder.reminderOffsetDays = reminderOffsetDays;
      reminder.reminderDateTime = reminderDateTime;
    }

    this._saveToStorage('event_reminders', reminders);
    return reminder;
  }

  // getSavedLists
  getSavedLists() {
    const lists = this._getFromStorage('saved_lists');
    const items = this._getFromStorage('saved_list_items');

    return lists.map((l) => {
      const itemCount = items.filter((it) => it.listId === l.id).length;
      return { list: l, itemCount };
    });
  }

  // getSavedListDetails(listId) with foreign key resolution for SavedListItem
  getSavedListDetails(listId) {
    const lists = this._getFromStorage('saved_lists');
    const items = this._getFromStorage('saved_list_items');
    const publications = this._getFromStorage('publications');
    const courses = this._getFromStorage('courses');
    const events = this._getFromStorage('events');
    const projects = this._getFromStorage('projects');
    const notes = this._getFromStorage('notes');

    const list = lists.find((l) => l.id === listId) || null;
    if (!list) {
      return {
        list: null,
        items: []
      };
    }

    const listItems = items.filter((it) => it.listId === listId);

    const mappedItems = listItems.map((it) => {
      let itemEntity = null;
      let title = '';
      let subtitle = '';
      let extraInfo = '';

      if (it.itemType === 'publication') {
        itemEntity = publications.find((p) => p.id === it.itemId) || null;
        if (itemEntity) {
          title = itemEntity.title || '';
          subtitle = itemEntity.venueName || (itemEntity.year ? String(itemEntity.year) : '');
          if (typeof itemEntity.citationCount === 'number') {
            extraInfo = `${itemEntity.citationCount} citations`;
          }
        }
      } else if (it.itemType === 'course') {
        itemEntity = courses.find((c) => c.id === it.itemId) || null;
        if (itemEntity) {
          title = itemEntity.title || '';
          subtitle = itemEntity.termLabel || '';
          if (typeof itemEntity.credits === 'number') {
            extraInfo = `${itemEntity.credits} credits`;
          }
        }
      } else if (it.itemType === 'event') {
        itemEntity = events.find((e) => e.id === it.itemId) || null;
        if (itemEntity) {
          title = itemEntity.title || '';
          subtitle = itemEntity.locationName || itemEntity.locationCity || '';
          extraInfo = itemEntity.startDateTime || '';
        }
      } else if (it.itemType === 'project') {
        itemEntity = projects.find((p) => p.id === it.itemId) || null;
        if (itemEntity) {
          title = itemEntity.title || '';
          subtitle = itemEntity.status || '';
          if (typeof itemEntity.fundingAmount === 'number') {
            extraInfo = `${itemEntity.fundingAmount} ${itemEntity.fundingCurrency || ''}`.trim();
          }
        }
      } else if (it.itemType === 'note') {
        itemEntity = notes.find((n) => n.id === it.itemId) || null;
        if (itemEntity) {
          title = itemEntity.title || '';
          subtitle = '';
          extraInfo = (itemEntity.content || '').slice(0, 80);
        }
      }

      const savedListItem = {
        ...it,
        list,
        item: itemEntity
      };

      const itemSummary = {
        itemType: it.itemType,
        title,
        subtitle,
        extraInfo
      };

      return { savedListItem, itemSummary };
    });

    return {
      list,
      items: mappedItems
    };
  }

  // renameSavedList(listId, newName)
  renameSavedList(listId, newName) {
    const lists = this._getFromStorage('saved_lists');
    const idx = lists.findIndex((l) => l.id === listId);
    if (idx === -1) return null;
    lists[idx].name = newName;
    lists[idx].updatedAt = this._nowIso();
    this._saveToStorage('saved_lists', lists);
    return lists[idx];
  }

  // deleteSavedList(listId)
  deleteSavedList(listId) {
    const lists = this._getFromStorage('saved_lists');
    const items = this._getFromStorage('saved_list_items');

    const newLists = lists.filter((l) => l.id !== listId);
    const success = newLists.length !== lists.length;
    if (!success) {
      return { success: false };
    }

    const newItems = items.filter((it) => it.listId !== listId);
    this._saveToStorage('saved_lists', newLists);
    this._saveToStorage('saved_list_items', newItems);
    return { success: true };
  }

  // removeItemFromSavedList(savedListItemId)
  removeItemFromSavedList(savedListItemId) {
    const items = this._getFromStorage('saved_list_items');
    const newItems = items.filter((it) => it.id !== savedListItemId);
    const success = newItems.length !== items.length;
    if (success) {
      this._saveToStorage('saved_list_items', newItems);
    }
    return { success };
  }

  // getBookmarkOverview (with foreign key resolution for Bookmark)
  getBookmarkOverview() {
    const folders = this._getFromStorage('bookmark_folders');
    const bookmarks = this._getFromStorage('bookmarks');
    const projects = this._getFromStorage('projects');
    const events = this._getFromStorage('events');
    const publications = this._getFromStorage('publications');
    const courses = this._getFromStorage('courses');

    const folderMap = new Map();
    for (const f of folders) {
      folderMap.set(f.id, f);
    }

    const resolveItem = (bm) => {
      if (bm.itemType === 'project') {
        return projects.find((p) => p.id === bm.itemId) || null;
      }
      if (bm.itemType === 'event') {
        return events.find((e) => e.id === bm.itemId) || null;
      }
      if (bm.itemType === 'publication') {
        return publications.find((p) => p.id === bm.itemId) || null;
      }
      if (bm.itemType === 'course') {
        return courses.find((c) => c.id === bm.itemId) || null;
      }
      return null;
    };

    const buildItemSummary = (bm, entity) => {
      if (!entity) {
        return {
          itemType: bm.itemType,
          title: '',
          subtitle: '',
          extraInfo: ''
        };
      }
      if (bm.itemType === 'project') {
        return {
          itemType: 'project',
          title: entity.title || '',
          subtitle: entity.status || '',
          extraInfo: typeof entity.fundingAmount === 'number'
            ? `${entity.fundingAmount} ${entity.fundingCurrency || ''}`.trim()
            : ''
        };
      }
      if (bm.itemType === 'event') {
        return {
          itemType: 'event',
          title: entity.title || '',
          subtitle: entity.locationName || entity.locationCity || '',
          extraInfo: entity.startDateTime || ''
        };
      }
      if (bm.itemType === 'publication') {
        return {
          itemType: 'publication',
          title: entity.title || '',
          subtitle: entity.venueName || '',
          extraInfo: typeof entity.citationCount === 'number'
            ? `${entity.citationCount} citations`
            : ''
        };
      }
      if (bm.itemType === 'course') {
        return {
          itemType: 'course',
          title: entity.title || '',
          subtitle: entity.termLabel || '',
          extraInfo: typeof entity.credits === 'number' ? `${entity.credits} credits` : ''
        };
      }
      return {
        itemType: bm.itemType,
        title: '',
        subtitle: '',
        extraInfo: ''
      };
    };

    const overview = folders.map((folder) => {
      const folderBookmarks = bookmarks.filter((bm) => bm.folderId === folder.id);
      const mappedBookmarks = folderBookmarks.map((bm) => {
        const entity = resolveItem(bm);
        const bookmark = {
          ...bm,
          folder,
          item: entity
        };
        const itemSummary = buildItemSummary(bm, entity);
        return { bookmark, itemSummary };
      });
      return { folder, bookmarks: mappedBookmarks };
    });

    return overview;
  }

  // createBookmarkFolder(name, description)
  createBookmarkFolder(name, description) {
    const folders = this._getFromStorage('bookmark_folders');
    const folder = {
      id: this._generateId('bmf'),
      name: (name || '').trim() || 'Unnamed folder',
      description: description || '',
      createdAt: this._nowIso()
    };
    folders.push(folder);
    this._saveToStorage('bookmark_folders', folders);
    return folder;
  }

  // renameBookmarkFolder(folderId, name)
  renameBookmarkFolder(folderId, name) {
    const folders = this._getFromStorage('bookmark_folders');
    const idx = folders.findIndex((f) => f.id === folderId);
    if (idx === -1) return null;
    folders[idx].name = (name || '').trim() || folders[idx].name;
    this._saveToStorage('bookmark_folders', folders);
    return folders[idx];
  }

  // deleteBookmarkFolder(folderId, deleteBookmarks)
  deleteBookmarkFolder(folderId, deleteBookmarks) {
    const folders = this._getFromStorage('bookmark_folders');
    const bookmarks = this._getFromStorage('bookmarks');

    const newFolders = folders.filter((f) => f.id !== folderId);
    const success = newFolders.length !== folders.length;
    if (!success) {
      return { success: false };
    }

    let newBookmarks;
    if (deleteBookmarks === false) {
      newBookmarks = bookmarks.map((bm) => {
        if (bm.folderId === folderId) {
          return { ...bm, folderId: null };
        }
        return bm;
      });
    } else {
      newBookmarks = bookmarks.filter((bm) => bm.folderId !== folderId);
    }

    this._saveToStorage('bookmark_folders', newFolders);
    this._saveToStorage('bookmarks', newBookmarks);
    return { success: true };
  }

  // moveBookmark(bookmarkId, targetFolderId)
  moveBookmark(bookmarkId, targetFolderId) {
    const folders = this._getFromStorage('bookmark_folders');
    const bookmarks = this._getFromStorage('bookmarks');
    const folder = folders.find((f) => f.id === targetFolderId) || null;
    if (!folder) return null;

    const idx = bookmarks.findIndex((bm) => bm.id === bookmarkId);
    if (idx === -1) return null;

    bookmarks[idx].folderId = targetFolderId;
    this._saveToStorage('bookmarks', bookmarks);
    return bookmarks[idx];
  }

  // removeBookmark(bookmarkId)
  removeBookmark(bookmarkId) {
    const bookmarks = this._getFromStorage('bookmarks');
    const newBookmarks = bookmarks.filter((bm) => bm.id !== bookmarkId);
    const success = newBookmarks.length !== bookmarks.length;
    if (success) {
      this._saveToStorage('bookmarks', newBookmarks);
    }
    return { success };
  }

  // getContactFormConfig
  getContactFormConfig() {
    const raw = localStorage.getItem('contact_form_config');
    let cfg = raw ? JSON.parse(raw) : null;
    if (!cfg) {
      cfg = {
        reasonOptions: [
          { value: 'general_inquiry', label: 'General inquiry' },
          { value: 'prospective_phd_student', label: 'Prospective PhD student' },
          { value: 'prospective_ms_student', label: 'Prospective Master\'s student' },
          { value: 'collaboration_request', label: 'Collaboration request' },
          { value: 'media_request', label: 'Media request' },
          { value: 'other', label: 'Other' }
        ],
        defaultReason: 'general_inquiry',
        instructions: '',
        officeHours: '',
        schedulerConfig: {
          timeZone: 'UTC',
          slotDurationMinutes: 30,
          minDate: null,
          maxDate: null
        }
      };
    }

    // Derive scheduler date range from availability_slots if possible
    const slots = this._getFromStorage('availability_slots');
    if (slots.length > 0) {
      const dates = slots.map((s) => this._parseDate(s.startDateTime)).filter((d) => !!d);
      if (dates.length > 0) {
        dates.sort((a, b) => a - b);
        const minDate = dates[0];
        const maxDate = dates[dates.length - 1];
        cfg.schedulerConfig.minDate = minDate.toISOString().slice(0, 10);
        cfg.schedulerConfig.maxDate = maxDate.toISOString().slice(0, 10);
      }
    }

    return cfg;
  }

  // getAvailabilitySlots(startDate, endDate)
  getAvailabilitySlots(startDate, endDate) {
    const slots = this._getFromStorage('availability_slots');
    const start = startDate ? new Date(startDate + 'T00:00:00Z') : null;
    const end = endDate ? new Date(endDate + 'T23:59:59Z') : null;

    return slots.filter((s) => {
      if (!s.isAvailable) return false;
      const d = this._parseDate(s.startDateTime);
      if (!d) return false;
      if (start && d < start) return false;
      if (end && d > end) return false;
      return true;
    });
  }

  // submitContactRequest(name, email, subject, reason, message, preferredSlotId)
  submitContactRequest(name, email, subject, reason, message, preferredSlotId) {
    const requests = this._getFromStorage('contact_requests');
    const slots = this._getFromStorage('availability_slots');

    let preferredStartDateTime = null;
    if (preferredSlotId) {
      const slot = slots.find((s) => s.id === preferredSlotId) || null;
      if (slot) {
        preferredStartDateTime = slot.startDateTime;
      }
    }

    const request = {
      id: this._generateId('contact'),
      name,
      email,
      subject,
      reason,
      message,
      preferredSlotId: preferredSlotId || null,
      preferredStartDateTime,
      createdAt: this._nowIso(),
      status: 'submitted'
    };

    requests.push(request);
    this._saveToStorage('contact_requests', requests);
    return request;
  }

  // getProfileSettings (with foreign key resolution featuredPublication)
  getProfileSettings() {
    const settings = this._getProfileSettingsSingleton();
    const publications = this._getFromStorage('publications');
    const featuredPublication = settings.featuredPublicationId
      ? publications.find((p) => p.id === settings.featuredPublicationId) || null
      : null;

    const settingsWithResolved = {
      ...settings,
      featuredPublication
    };

    const availableSortOrders = [
      'citations_high_to_low',
      'citations_low_to_high',
      'year_newest_first',
      'year_oldest_first'
    ];

    return {
      settings: settingsWithResolved,
      availableSortOrders
    };
  }

  // updateProfileTaglineAndKeywords(tagline, primaryResearchKeywords)
  updateProfileTaglineAndKeywords(tagline, primaryResearchKeywords) {
    if (!Array.isArray(primaryResearchKeywords) || primaryResearchKeywords.length !== 3) {
      return {
        success: false,
        settings: this._getProfileSettingsSingleton()
      };
    }
    const settings = this._getProfileSettingsSingleton();
    settings.tagline = tagline || '';
    settings.primaryResearchKeywords = primaryResearchKeywords;
    settings.updatedAt = this._nowIso();
    this._saveProfileSettings(settings);
    return {
      success: true,
      settings
    };
  }

  // updatePublicationsDisplayPreferences(publicationsDisplayCount, publicationsSortOrder)
  updatePublicationsDisplayPreferences(publicationsDisplayCount, publicationsSortOrder) {
    const allowed = [
      'citations_high_to_low',
      'citations_low_to_high',
      'year_newest_first',
      'year_oldest_first'
    ];
    const settings = this._getProfileSettingsSingleton();
    settings.publicationsDisplayCount = typeof publicationsDisplayCount === 'number'
      ? publicationsDisplayCount
      : settings.publicationsDisplayCount;
    if (allowed.includes(publicationsSortOrder)) {
      settings.publicationsSortOrder = publicationsSortOrder;
    }
    settings.updatedAt = this._nowIso();
    this._saveProfileSettings(settings);
    return {
      success: true,
      settings
    };
  }

  // setFeaturedPublication(publicationId)
  setFeaturedPublication(publicationId) {
    const publications = this._getFromStorage('publications');
    const idx = publications.findIndex((p) => p.id === publicationId);
    if (idx === -1) {
      const settings = this._getProfileSettingsSingleton();
      return {
        success: false,
        settings,
        featuredPublication: null,
        message: 'Publication not found.'
      };
    }

    // Clear previous isFeatured
    for (const p of publications) {
      if (p.isFeatured) p.isFeatured = false;
    }
    publications[idx].isFeatured = true;
    this._saveToStorage('publications', publications);

    const settings = this._getProfileSettingsSingleton();
    settings.featuredPublicationId = publicationId;
    settings.updatedAt = this._nowIso();
    this._saveProfileSettings(settings);

    return {
      success: true,
      settings,
      featuredPublication: publications[idx],
      message: 'Featured publication updated.'
    };
  }

  // getAboutPageContent
  getAboutPageContent() {
    const raw = localStorage.getItem('about_page_content');
    const data = raw ? JSON.parse(raw) : { biographyHtml: '', researchThemes: [], positions: [] };
    return {
      biographyHtml: data.biographyHtml || '',
      researchThemes: Array.isArray(data.researchThemes) ? data.researchThemes : [],
      positions: Array.isArray(data.positions) ? data.positions : []
    };
  }

  // getCurriculumVitae
  getCurriculumVitae() {
    const raw = localStorage.getItem('cv_content');
    const data = raw
      ? JSON.parse(raw)
      : { cvSections: [], lastUpdated: null, downloadFileId: null };
    return {
      cvSections: Array.isArray(data.cvSections) ? data.cvSections : [],
      lastUpdated: data.lastUpdated || null,
      downloadFileId: data.downloadFileId || null
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
