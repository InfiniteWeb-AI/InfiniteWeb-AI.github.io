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

  // ---------------------- Storage helpers ----------------------

  _initStorage() {
    const tableKeys = [
      'projects',
      'project_members',
      'project_publications',
      'saved_project_lists',
      'saved_project_items',
      'publications',
      'publication_authors',
      'reading_lists',
      'reading_list_items',
      'people',
      'events',
      'event_speakers',
      'schedules',
      'schedule_items',
      'expression_of_interest_submissions',
      'contact_messages'
    ];

    for (const key of tableKeys) {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, defaultValue = []) {
    const data = localStorage.getItem(key);
    if (data === null || data === undefined) return defaultValue;
    try {
      return JSON.parse(data);
    } catch (e) {
      return defaultValue;
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

  _findById(collection, id) {
    return collection.find((item) => item.id === id) || null;
  }

  _parseDate(value) {
    if (!value) return null;
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }

  _compareStrings(a, b) {
    return (a || '').localeCompare(b || undefined, undefined, { sensitivity: 'base' });
  }

  // Single-user state helper (simple get-or-init for arbitrary key)
  _persistSingleUserState(key, defaultValue) {
    const existing = this._getFromStorage(key, null);
    if (existing !== null) return existing;
    if (defaultValue !== undefined) {
      this._saveToStorage(key, defaultValue);
      return defaultValue;
    }
    return null;
  }

  // ---------------------- Single-user containers ----------------------

  _getOrCreateSavedProjectList() {
    let lists = this._getFromStorage('saved_project_lists', []);
    let list = lists[0] || null;
    if (!list) {
      const now = new Date().toISOString();
      list = {
        id: this._generateId('savedprojlist'),
        name: 'Default Saved Projects',
        created_at: now,
        updated_at: now
      };
      lists.push(list);
      this._saveToStorage('saved_project_lists', lists);
    }
    return list;
  }

  _getOrCreateReadingList() {
    let lists = this._getFromStorage('reading_lists', []);
    let list = lists[0] || null;
    if (!list) {
      const now = new Date().toISOString();
      list = {
        id: this._generateId('readinglist'),
        name: 'My Reading List',
        created_at: now,
        updated_at: now
      };
      lists.push(list);
      this._saveToStorage('reading_lists', lists);
    }
    return list;
  }

  _getOrCreateSchedule() {
    let schedules = this._getFromStorage('schedules', []);
    let schedule = schedules[0] || null;
    if (!schedule) {
      const now = new Date().toISOString();
      schedule = {
        id: this._generateId('schedule'),
        created_at: now,
        updated_at: now
      };
      schedules.push(schedule);
      this._saveToStorage('schedules', schedules);
    }
    return schedule;
  }

  // ---------------------- Home / Overview ----------------------

  getHomeOverview() {
    const projects = this._getFromStorage('projects', []);
    const people = this._getFromStorage('people', []);
    const publications = this._getFromStorage('publications', []);

    const stats = {
      project_count: projects.length,
      people_count: people.length,
      publication_count: publications.length
    };

    // Content may be managed elsewhere; default to minimal values while
    // relying on live counts from localStorage.
    const stored = this._getFromStorage('home_overview', null);
    if (stored) {
      return {
        mission: stored.mission || '',
        tagline: stored.tagline || '',
        research_areas_highlight: stored.research_areas_highlight || [],
        stats,
        featured_sections: stored.featured_sections || []
      };
    }

    return {
      mission: '',
      tagline: '',
      research_areas_highlight: [],
      stats,
      featured_sections: []
    };
  }

  getFeaturedProjects(limit = 3) {
    const projects = this._getFromStorage('projects', []);
    const featured = projects
      .filter((p) => !!p.is_featured)
      .sort((a, b) => {
        const da = this._parseDate(a.start_date) || new Date(0);
        const db = this._parseDate(b.start_date) || new Date(0);
        return db - da; // newest first
      });
    return featured.slice(0, limit);
  }

  getRecentPublications(limit = 5) {
    const publications = this._getFromStorage('publications', []);
    const sorted = publications.sort((a, b) => {
      const da = this._parseDate(a.publication_date) || new Date(a.year || 0, 0, 1);
      const db = this._parseDate(b.publication_date) || new Date(b.year || 0, 0, 1);
      return db - da;
    });
    return sorted.slice(0, limit);
  }

  getUpcomingEventsPreview(limit = 3) {
    const now = new Date();
    const events = this._getFromStorage('events', []);
    const upcoming = events
      .filter((e) => {
        const d = this._parseDate(e.start_datetime);
        return d && d >= now;
      })
      .sort((a, b) => {
        const da = this._parseDate(a.start_datetime) || new Date(0);
        const db = this._parseDate(b.start_datetime) || new Date(0);
        return da - db; // soonest first
      });
    return upcoming.slice(0, limit);
  }

  globalSearch(query) {
    const q = (query || '').trim().toLowerCase();
    const emptyResult = {
      suggested_section: 'projects',
      projects_preview: [],
      publications_preview: [],
      people_preview: [],
      events_preview: []
    };
    if (!q) return emptyResult;

    const projects = this._getFromStorage('projects', []);
    const publications = this._getFromStorage('publications', []);
    const people = this._getFromStorage('people', []);
    const events = this._getFromStorage('events', []);

    const projects_preview = projects
      .map((p) => {
        const haystack = [p.title, p.summary, p.abstract]
          .concat(p.keywords || [])
          .concat(p.research_areas || [])
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(q)) return null;
        let match_score = 1;
        if ((p.title || '').toLowerCase().includes(q)) match_score += 2;
        return {
          id: p.id,
          title: p.title,
          summary: p.summary || '',
          match_score
        };
      })
      .filter(Boolean);

    const publications_preview = publications
      .map((pub) => {
        const haystack = [pub.title, pub.abstract]
          .concat(pub.keywords || [])
          .concat(pub.research_areas || [])
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(q)) return null;
        let match_score = 1;
        if ((pub.title || '').toLowerCase().includes(q)) match_score += 2;
        return {
          id: pub.id,
          title: pub.title,
          year: pub.year,
          type: pub.type,
          match_score
        };
      })
      .filter(Boolean);

    const people_preview = people
      .map((person) => {
        const haystack = [person.full_name, person.bio]
          .concat(person.research_areas || [])
          .concat(person.tags || [])
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(q)) return null;
        let match_score = 1;
        if ((person.full_name || '').toLowerCase().includes(q)) match_score += 2;
        return {
          id: person.id,
          full_name: person.full_name,
          role: person.role,
          match_score
        };
      })
      .filter(Boolean);

    const events_preview = events
      .map((evt) => {
        const haystack = [evt.title, evt.description]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(q)) return null;
        let match_score = 1;
        if ((evt.title || '').toLowerCase().includes(q)) match_score += 2;
        return {
          id: evt.id,
          title: evt.title,
          start_datetime: evt.start_datetime,
          match_score
        };
      })
      .filter(Boolean);

    const sections = [
      { key: 'projects', items: projects_preview },
      { key: 'publications', items: publications_preview },
      { key: 'people', items: people_preview },
      { key: 'events', items: events_preview }
    ];

    let suggested_section = 'projects';
    let bestScore = -1;
    for (const s of sections) {
      if (!s.items.length) continue;
      const score = s.items.reduce((acc, it) => acc + (it.match_score || 1), 0);
      if (score > bestScore) {
        bestScore = score;
        suggested_section = s.key;
      }
    }

    return {
      suggested_section,
      projects_preview,
      publications_preview,
      people_preview,
      events_preview
    };
  }

  // ---------------------- Projects ----------------------

  getProjectFilterOptions() {
    const projects = this._getFromStorage('projects', []);

    const researchAreaMap = new Map();
    let minYear = null;
    let maxYear = null;
    let minFunding = null;
    let maxFunding = null;

    for (const p of projects) {
      if (typeof p.start_year === 'number') {
        if (minYear === null || p.start_year < minYear) minYear = p.start_year;
        if (maxYear === null || p.start_year > maxYear) maxYear = p.start_year;
      }
      if (typeof p.funding_amount === 'number') {
        if (minFunding === null || p.funding_amount < minFunding) minFunding = p.funding_amount;
        if (maxFunding === null || p.funding_amount > maxFunding) maxFunding = p.funding_amount;
      }
      (p.research_areas || []).forEach((area) => {
        const count = researchAreaMap.get(area) || 0;
        researchAreaMap.set(area, count + 1);
      });
    }

    const research_areas = Array.from(researchAreaMap.entries()).map(([name, project_count]) => ({
      name,
      project_count
    }));

    return {
      statuses: ['ongoing', 'completed', 'planned'],
      funding_source_types: ['industry', 'government', 'foundation', 'internal', 'other'],
      research_areas,
      start_year_range: {
        min_year: minYear,
        max_year: maxYear
      },
      funding_amount_range: {
        min_amount: minFunding,
        max_amount: maxFunding
      }
    };
  }

  searchProjects(query, filters, sort_by, page = 1, page_size = 20) {
    const q = (query || '').trim().toLowerCase();
    const projects = this._getFromStorage('projects', []);

    filters = filters || {};
    let items = projects.slice();

    if (q) {
      items = items.filter((p) => {
        const haystack = [p.title, p.summary, p.abstract]
          .concat(p.keywords || [])
          .concat(p.research_areas || [])
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return haystack.includes(q);
      });
    }

    if (filters.research_area) {
      items = items.filter((p) => Array.isArray(p.research_areas) && p.research_areas.includes(filters.research_area));
    }

    if (filters.status) {
      items = items.filter((p) => p.status === filters.status);
    }

    if (filters.funding_source_type) {
      items = items.filter((p) => p.funding_source_type === filters.funding_source_type);
    }

    if (typeof filters.start_year_min === 'number') {
      items = items.filter((p) => typeof p.start_year === 'number' && p.start_year >= filters.start_year_min);
    }

    if (typeof filters.start_year_max === 'number') {
      items = items.filter((p) => typeof p.start_year === 'number' && p.start_year <= filters.start_year_max);
    }

    if (typeof filters.funding_min === 'number') {
      items = items.filter((p) => typeof p.funding_amount === 'number' && p.funding_amount >= filters.funding_min);
    }

    if (typeof filters.funding_max === 'number') {
      items = items.filter((p) => typeof p.funding_amount === 'number' && p.funding_amount <= filters.funding_max);
    }

    // Sorting
    const sortKey = sort_by || 'relevance';
    if (sortKey === 'start_date_newest') {
      items.sort((a, b) => {
        const da = this._parseDate(a.start_date) || new Date(0);
        const db = this._parseDate(b.start_date) || new Date(0);
        return db - da;
      });
    } else if (sortKey === 'funding_amount_desc') {
      items.sort((a, b) => (b.funding_amount || 0) - (a.funding_amount || 0));
    } else if (sortKey === 'sponsor_name_asc') {
      items.sort((a, b) => this._compareStrings(a.sponsor_name, b.sponsor_name));
    } else if (sortKey === 'relevance' && q) {
      items.sort((a, b) => {
        const at = (a.title || '').toLowerCase().includes(q) ? 1 : 0;
        const bt = (b.title || '').toLowerCase().includes(q) ? 1 : 0;
        if (at !== bt) return bt - at;
        const da = this._parseDate(a.start_date) || new Date(0);
        const db = this._parseDate(b.start_date) || new Date(0);
        return db - da;
      });
    }

    const total = items.length;
    const start = (page - 1) * page_size;
    const paged = items.slice(start, start + page_size);

    return {
      items: paged,
      total,
      page,
      page_size
    };
  }

  getProjectDetail(projectId) {
    const projects = this._getFromStorage('projects', []);
    let project = projects.find((p) => p.id === projectId) || null;

    const project_members = this._getFromStorage('project_members', []);
    const people = this._getFromStorage('people', []);
    const project_publications = this._getFromStorage('project_publications', []);
    const publications = this._getFromStorage('publications', []);
    const saved_items = this._getFromStorage('saved_project_items', []);

    // Instrumentation for task completion tracking
    try {
      const existingRaw = localStorage.getItem('task5_comparedProjectIds');
      if (!existingRaw) {
        const obj = { first: projectId, second: null };
        localStorage.setItem('task5_comparedProjectIds', JSON.stringify(obj));
      } else {
        const obj = JSON.parse(existingRaw);
        if (
          obj &&
          obj.first !== null &&
          obj.second === null &&
          projectId !== obj.first
        ) {
          obj.second = projectId;
          localStorage.setItem('task5_comparedProjectIds', JSON.stringify(obj));
        }
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    if (!project) {
      const hasLinks = project_publications.some((pp) => pp.project_id === projectId);
      if (!hasLinks) {
        return {
          project: null,
          principal_investigators: [],
          team: [],
          team_counts: {
            total: 0,
            principal_investigator: 0,
            co_principal_investigator: 0,
            research_staff: 0,
            phd_student: 0,
            masters_student: 0,
            undergraduate_student: 0,
            collaborator: 0,
            other: 0
          },
          related_publications: [],
          is_saved: false,
          is_favorite: false
        };
      }
      // Create a minimal stub project so that related publications can still be navigated
      project = {
        id: projectId,
        title: projectId,
        slug: projectId,
        summary: '',
        abstract: '',
        status: 'ongoing',
        start_date: null,
        end_date: null,
        start_year: null,
        end_year: null,
        funding_amount: null,
        sponsor_name: '',
        funding_source_type: 'other',
        research_areas: [],
        keywords: []
      };
      const updatedProjects = projects.concat([project]);
      this._saveToStorage('projects', updatedProjects);
    }

    const membersForProject = project_members.filter((m) => m.project_id === projectId);
    const team_counts = {
      total: membersForProject.length,
      principal_investigator: 0,
      co_principal_investigator: 0,
      research_staff: 0,
      phd_student: 0,
      masters_student: 0,
      undergraduate_student: 0,
      collaborator: 0,
      other: 0
    };

    const team = membersForProject.map((m) => {
      const person = people.find((p) => p.id === m.person_id) || {};
      if (team_counts.hasOwnProperty(m.role)) {
        team_counts[m.role] += 1;
      }
      return {
        person_id: m.person_id,
        full_name: person.full_name,
        role: m.role,
        profile_slug: person.profile_slug,
        is_principal_investigator: !!m.is_principal_investigator
      };
    });

    const principal_investigators = team.filter(
      (t) => t.role === 'principal_investigator' || t.is_principal_investigator
    );

    const relatedPubsLinks = project_publications
      .filter((pp) => pp.project_id === projectId)
      .sort((a, b) => (a.display_order || 0) - (b.display_order || 0));

    const related_publications = relatedPubsLinks.map((link) => {
      const pub = publications.find((p) => p.id === link.publication_id) || {};
      return {
        publication_id: link.publication_id,
        title: pub.title,
        year: pub.year,
        type: pub.type,
        display_order: link.display_order
      };
    });

    const savedItem = saved_items.find((si) => si.project_id === projectId) || null;
    const is_saved = !!savedItem;
    const is_favorite = savedItem ? !!savedItem.is_favorite : false;

    return {
      project: {
        id: project.id,
        title: project.title,
        slug: project.slug,
        summary: project.summary,
        abstract: project.abstract,
        status: project.status,
        start_date: project.start_date,
        end_date: project.end_date,
        start_year: project.start_year,
        end_year: project.end_year,
        funding_amount: project.funding_amount,
        sponsor_name: project.sponsor_name,
        funding_source_type: project.funding_source_type,
        research_areas: project.research_areas || [],
        keywords: project.keywords || []
      },
      principal_investigators,
      team,
      team_counts,
      related_publications,
      is_saved,
      is_favorite
    };
  }

  saveProject(projectId) {
    const projects = this._getFromStorage('projects', []);
    const project = projects.find((p) => p.id === projectId);
    if (!project) {
      return {
        success: false,
        saved_item_id: null,
        project_id: projectId,
        date_saved: null,
        is_favorite: false,
        saved_count: 0,
        message: 'Project not found.'
      };
    }

    const list = this._getOrCreateSavedProjectList();
    const saved_items = this._getFromStorage('saved_project_items', []);
    let existing = saved_items.find(
      (si) => si.project_id === projectId && si.saved_project_list_id === list.id
    );

    if (existing) {
      const count = saved_items.filter((si) => si.saved_project_list_id === list.id).length;
      return {
        success: true,
        saved_item_id: existing.id,
        project_id: projectId,
        date_saved: existing.date_saved,
        is_favorite: !!existing.is_favorite,
        saved_count: count,
        message: 'Project already saved.'
      };
    }

    const now = new Date().toISOString();
    const newItem = {
      id: this._generateId('savedprojitem'),
      saved_project_list_id: list.id,
      project_id: projectId,
      is_favorite: false,
      date_saved: now
    };
    saved_items.push(newItem);
    this._saveToStorage('saved_project_items', saved_items);

    const count = saved_items.filter((si) => si.saved_project_list_id === list.id).length;
    return {
      success: true,
      saved_item_id: newItem.id,
      project_id: projectId,
      date_saved: now,
      is_favorite: false,
      saved_count: count,
      message: 'Project saved.'
    };
  }

  markProjectFavorite(projectId, isFavorite = true) {
    const list = this._getOrCreateSavedProjectList();
    const saved_items = this._getFromStorage('saved_project_items', []);
    let item = saved_items.find(
      (si) => si.project_id === projectId && si.saved_project_list_id === list.id
    );

    if (!item) {
      const saveResult = this.saveProject(projectId);
      if (!saveResult.success) {
        return {
          success: false,
          project_id: projectId,
          is_favorite: false,
          message: 'Project not found.'
        };
      }
      const updatedItems = this._getFromStorage('saved_project_items', []);
      item = updatedItems.find(
        (si) => si.project_id === projectId && si.saved_project_list_id === list.id
      );
    }

    item.is_favorite = !!isFavorite;
    this._saveToStorage('saved_project_items', saved_items);

    return {
      success: true,
      project_id: projectId,
      is_favorite: !!isFavorite,
      message: isFavorite ? 'Project marked as favorite.' : 'Project unmarked as favorite.'
    };
  }

  getSavedProjects(sort_by) {
    const list = this._getOrCreateSavedProjectList();
    const saved_items = this._getFromStorage('saved_project_items', []);
    const projects = this._getFromStorage('projects', []);

    let items = saved_items
      .filter((si) => si.saved_project_list_id === list.id)
      .map((si) => {
        const proj = projects.find((p) => p.id === si.project_id) || null;
        return {
          project: proj
            ? {
                id: proj.id,
                title: proj.title,
                summary: proj.summary,
                status: proj.status,
                start_year: proj.start_year,
                end_year: proj.end_year,
                funding_amount: proj.funding_amount,
                sponsor_name: proj.sponsor_name,
                funding_source_type: proj.funding_source_type,
                research_areas: proj.research_areas || []
              }
            : null,
          is_favorite: !!si.is_favorite,
          date_saved: si.date_saved
        };
      });

    const sortKey = sort_by || 'date_saved_desc';
    if (sortKey === 'date_saved_desc') {
      items.sort((a, b) => {
        const da = this._parseDate(a.date_saved) || new Date(0);
        const db = this._parseDate(b.date_saved) || new Date(0);
        return db - da;
      });
    } else if (sortKey === 'start_date_newest') {
      items.sort((a, b) => {
        const da = this._parseDate(a.project && a.project.start_date) || new Date(0);
        const db = this._parseDate(b.project && b.project.start_date) || new Date(0);
        return db - da;
      });
    } else if (sortKey === 'sponsor_name_asc') {
      items.sort((a, b) => this._compareStrings(a.project && a.project.sponsor_name, b.project && b.project.sponsor_name));
    } else if (sortKey === 'is_favorite_first') {
      items.sort((a, b) => {
        if (a.is_favorite === b.is_favorite) return 0;
        return a.is_favorite ? -1 : 1;
      });
    }

    // Instrumentation for task completion tracking
    try {
      localStorage.setItem('task1_savedProjectsPageOpened', 'true');
      localStorage.setItem('task8_savedProjectsPageOpened', 'true');
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      items,
      total: items.length
    };
  }

  removeSavedProject(projectId) {
    const list = this._getOrCreateSavedProjectList();
    let saved_items = this._getFromStorage('saved_project_items', []);
    const before = saved_items.length;
    saved_items = saved_items.filter(
      (si) => !(si.project_id === projectId && si.saved_project_list_id === list.id)
    );
    this._saveToStorage('saved_project_items', saved_items);
    const after = saved_items.length;

    return {
      success: before !== after,
      project_id: projectId,
      remaining_count: saved_items.filter((si) => si.saved_project_list_id === list.id).length,
      message: before !== after ? 'Project removed from saved list.' : 'Project was not in saved list.'
    };
  }

  // ---------------------- Publications ----------------------

  getPublicationFilterOptions() {
    const publications = this._getFromStorage('publications', []);

    let minYear = null;
    let maxYear = null;
    const researchAreaMap = new Map();
    const keywordMap = new Map();

    for (const pub of publications) {
      if (typeof pub.year === 'number') {
        if (minYear === null || pub.year < minYear) minYear = pub.year;
        if (maxYear === null || pub.year > maxYear) maxYear = pub.year;
      }
      (pub.research_areas || []).forEach((area) => {
        const count = researchAreaMap.get(area) || 0;
        researchAreaMap.set(area, count + 1);
      });
      (pub.keywords || []).forEach((kw) => {
        const count = keywordMap.get(kw) || 0;
        keywordMap.set(kw, count + 1);
      });
    }

    const research_areas = Array.from(researchAreaMap.entries()).map(([name, publication_count]) => ({
      name,
      publication_count
    }));

    const keywords = Array.from(keywordMap.entries()).map(([keyword, publication_count]) => ({
      keyword,
      publication_count
    }));

    const typeValues = [
      'journal_article',
      'conference_paper',
      'book_chapter',
      'book',
      'thesis',
      'report',
      'other'
    ];
    const types = typeValues.map((value) => ({
      value,
      label: value
        .split('_')
        .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
        .join(' ')
    }));

    return {
      types,
      year_range: {
        min_year: minYear,
        max_year: maxYear
      },
      research_areas,
      keywords
    };
  }

  searchPublications(query, filters, sort_by, page = 1, page_size = 20) {
    const q = (query || '').trim().toLowerCase();
    const publications = this._getFromStorage('publications', []);
    filters = filters || {};

    let items = publications.slice();

    if (q) {
      items = items.filter((pub) => {
        const haystack = [pub.title, pub.abstract]
          .concat(pub.keywords || [])
          .concat(pub.research_areas || [])
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return haystack.includes(q);
      });
    }

    if (typeof filters.year_min === 'number') {
      items = items.filter((p) => typeof p.year === 'number' && p.year >= filters.year_min);
    }

    if (typeof filters.year_max === 'number') {
      items = items.filter((p) => typeof p.year === 'number' && p.year <= filters.year_max);
    }

    if (Array.isArray(filters.types) && filters.types.length > 0) {
      items = items.filter((p) => filters.types.includes(p.type));
    }

    if (Array.isArray(filters.research_areas) && filters.research_areas.length > 0) {
      items = items.filter((p) => {
        const areas = p.research_areas || [];
        return filters.research_areas.some((ra) => areas.includes(ra));
      });
    }

    if (Array.isArray(filters.keywords) && filters.keywords.length > 0) {
      items = items.filter((p) => {
        const kws = p.keywords || [];
        return filters.keywords.some((kw) => kws.includes(kw));
      });
    }

    const sortKey = sort_by || (q ? 'relevance' : 'year_desc');
    if (sortKey === 'year_desc') {
      items.sort((a, b) => (b.year || 0) - (a.year || 0));
    } else if (sortKey === 'year_asc') {
      items.sort((a, b) => (a.year || 0) - (b.year || 0));
    } else if (sortKey === 'title_asc') {
      items.sort((a, b) => this._compareStrings(a.title, b.title));
    } else if (sortKey === 'relevance' && q) {
      items.sort((a, b) => {
        const at = (a.title || '').toLowerCase().includes(q) ? 1 : 0;
        const bt = (b.title || '').toLowerCase().includes(q) ? 1 : 0;
        if (at !== bt) return bt - at;
        return (b.year || 0) - (a.year || 0);
      });
    }

    const total = items.length;
    const start = (page - 1) * page_size;
    const paged = items.slice(start, start + page_size);

    return {
      items: paged,
      total,
      page,
      page_size
    };
  }

  getPublicationDetail(publicationId) {
    const publications = this._getFromStorage('publications', []);
    let publication = publications.find((p) => p.id === publicationId) || null;

    const publication_authors = this._getFromStorage('publication_authors', []);
    const people = this._getFromStorage('people', []);
    const project_publications = this._getFromStorage('project_publications', []);
    const projects = this._getFromStorage('projects', []);
    const reading_list_items = this._getFromStorage('reading_list_items', []);

    // Instrumentation for task completion tracking
    try {
      localStorage.setItem('task9_openedPublicationId', String(publicationId));
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    if (!publication) {
      // Create a minimal stub publication so that linked metadata remains navigable
      publication = {
        id: publicationId,
        title: publicationId,
        slug: publicationId,
        abstract: 'Details for this publication are not available in the local dataset.',
        year: null,
        publication_date: null,
        type: 'other',
        venue: '',
        citation: '',
        doi: '',
        url: '',
        research_areas: [],
        keywords: [],
        is_open_access: false
      };
      // Persist stub so that other APIs (e.g., reading lists) can resolve it
      const updatedPublications = publications.concat([publication]);
      this._saveToStorage('publications', updatedPublications);
    }

    const authors = publication_authors
      .filter((pa) => pa.publication_id === publicationId)
      .sort((a, b) => (a.author_order || 0) - (b.author_order || 0))
      .map((a) => {
        const person = a.person_id
          ? people.find((p) => p.id === a.person_id) || null
          : null;
        return {
          author_name: a.author_name,
          person_id: a.person_id || null,
          person_profile_slug: person ? person.profile_slug : null,
          author_order: a.author_order,
          is_corresponding_author: !!a.is_corresponding_author
        };
      });

    const related_projects = project_publications
      .filter((pp) => pp.publication_id === publicationId)
      .map((pp) => {
        const proj = projects.find((p) => p.id === pp.project_id) || {};
        return {
          project_id: pp.project_id,
          title: proj.title,
          status: proj.status,
          start_year: proj.start_year,
          end_year: proj.end_year,
          project: proj || null // foreign key resolution helper
        };
      });

    const is_in_reading_list = reading_list_items.some((ri) => ri.publication_id === publicationId);

    return {
      publication: {
        id: publication.id,
        title: publication.title,
        slug: publication.slug,
        abstract: publication.abstract,
        year: publication.year,
        publication_date: publication.publication_date,
        type: publication.type,
        venue: publication.venue,
        citation: publication.citation,
        doi: publication.doi,
        url: publication.url,
        research_areas: publication.research_areas || [],
        keywords: publication.keywords || [],
        is_open_access: !!publication.is_open_access
      },
      authors,
      related_projects,
      is_in_reading_list
    };
  }

  addToReadingList(publicationId) {
    const publications = this._getFromStorage('publications', []);
    const publication = publications.find((p) => p.id === publicationId);
    if (!publication) {
      return {
        success: false,
        publication_id: publicationId,
        date_added: null,
        reading_list_count: 0,
        message: 'Publication not found.'
      };
    }

    const list = this._getOrCreateReadingList();
    const items = this._getFromStorage('reading_list_items', []);
    let existing = items.find(
      (ri) => ri.publication_id === publicationId && ri.reading_list_id === list.id
    );

    if (existing) {
      const count = items.filter((ri) => ri.reading_list_id === list.id).length;
      return {
        success: true,
        publication_id: publicationId,
        date_added: existing.date_added,
        reading_list_count: count,
        message: 'Publication already in reading list.'
      };
    }

    const now = new Date().toISOString();
    const newItem = {
      id: this._generateId('readinglistitem'),
      reading_list_id: list.id,
      publication_id: publicationId,
      date_added: now,
      notes: ''
    };
    items.push(newItem);
    this._saveToStorage('reading_list_items', items);

    const count = items.filter((ri) => ri.reading_list_id === list.id).length;
    return {
      success: true,
      publication_id: publicationId,
      date_added: now,
      reading_list_count: count,
      message: 'Publication added to reading list.'
    };
  }

  getReadingList(sort_by, group_by) {
    const list = this._getOrCreateReadingList();
    const items = this._getFromStorage('reading_list_items', []);
    const publications = this._getFromStorage('publications', []);

    let mapped = items
      .filter((ri) => ri.reading_list_id === list.id)
      .map((ri) => {
        const pub = publications.find((p) => p.id === ri.publication_id) || null;
        const base = {
          publication: pub
            ? {
                id: pub.id,
                title: pub.title,
                year: pub.year,
                type: pub.type,
                venue: pub.venue
              }
            : null,
          date_added: ri.date_added,
          notes: ri.notes || ''
        };

        let group_key = null;
        let group_label = null;
        if (group_by === 'year' && pub) {
          group_key = String(pub.year || '');
          group_label = group_key;
        } else if (group_by === 'type' && pub) {
          group_key = pub.type || '';
          group_label = (pub.type || '')
            .split('_')
            .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
            .join(' ');
        }

        return Object.assign({}, base, {
          group_key,
          group_label
        });
      });

    const sortKey = sort_by || 'date_added_desc';
    if (sortKey === 'date_added_desc') {
      mapped.sort((a, b) => {
        const da = this._parseDate(a.date_added) || new Date(0);
        const db = this._parseDate(b.date_added) || new Date(0);
        return db - da;
      });
    } else if (sortKey === 'year_desc') {
      mapped.sort((a, b) => {
        const ay = (a.publication && a.publication.year) || 0;
        const by = (b.publication && b.publication.year) || 0;
        return by - ay;
      });
    } else if (sortKey === 'title_asc') {
      mapped.sort((a, b) => this._compareStrings(a.publication && a.publication.title, b.publication && b.publication.title));
    }

    // Instrumentation for task completion tracking
    try {
      localStorage.setItem('task3_readingListOpened', 'true');
      localStorage.setItem('task7_readingListOpened', 'true');
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      items: mapped,
      total: mapped.length
    };
  }

  removeFromReadingList(publicationId) {
    const list = this._getOrCreateReadingList();
    let items = this._getFromStorage('reading_list_items', []);
    const before = items.length;
    items = items.filter(
      (ri) => !(ri.publication_id === publicationId && ri.reading_list_id === list.id)
    );
    this._saveToStorage('reading_list_items', items);
    const after = items.length;

    return {
      success: before !== after,
      publication_id: publicationId,
      remaining_count: items.filter((ri) => ri.reading_list_id === list.id).length,
      message: before !== after
        ? 'Publication removed from reading list.'
        : 'Publication was not in reading list.'
    };
  }

  // ---------------------- People ----------------------

  getPeopleFilterOptions() {
    const people = this._getFromStorage('people', []);

    const rolesEnum = [
      'faculty',
      'postdoc',
      'phd_student',
      'masters_student',
      'undergraduate_student',
      'staff',
      'visitor',
      'alumni',
      'other'
    ];

    const roles = rolesEnum.map((value) => ({
      value,
      label: value
        .split('_')
        .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
        .join(' ')
    }));

    const researchAreaMap = new Map();
    const tagMap = new Map();

    for (const person of people) {
      (person.research_areas || []).forEach((ra) => {
        const count = researchAreaMap.get(ra) || 0;
        researchAreaMap.set(ra, count + 1);
      });
      (person.tags || []).forEach((tag) => {
        const count = tagMap.get(tag) || 0;
        tagMap.set(tag, count + 1);
      });
    }

    const research_areas = Array.from(researchAreaMap.entries()).map(([name, person_count]) => ({
      name,
      person_count
    }));

    const tags = Array.from(tagMap.entries()).map(([tag, person_count]) => ({
      tag,
      person_count
    }));

    return {
      roles,
      research_areas,
      tags
    };
  }

  searchPeople(query, role, research_areas, tags, sort_by, page = 1, page_size = 50) {
    const q = (query || '').trim().toLowerCase();
    const people = this._getFromStorage('people', []);

    let items = people.slice();

    if (q) {
      items = items.filter((person) => {
        const haystack = [person.full_name, person.bio]
          .concat(person.research_areas || [])
          .concat(person.tags || [])
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return haystack.includes(q);
      });
    }

    if (role) {
      items = items.filter((p) => p.role === role);
    }

    if (Array.isArray(research_areas) && research_areas.length > 0) {
      items = items.filter((p) => {
        const areas = p.research_areas || [];
        return research_areas.some((ra) => areas.includes(ra));
      });
    }

    if (Array.isArray(tags) && tags.length > 0) {
      items = items.filter((p) => {
        const ptags = p.tags || [];
        return tags.some((t) => ptags.includes(t));
      });
    }

    const sortKey = sort_by || 'display_order';
    if (sortKey === 'display_order') {
      items.sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
    } else if (sortKey === 'name_asc') {
      items.sort((a, b) => this._compareStrings(a.full_name, b.full_name));
    }

    const total = items.length;
    const start = (page - 1) * page_size;
    const paged = items.slice(start, start + page_size);

    return {
      items: paged,
      total,
      page,
      page_size
    };
  }

  getPersonProfile(personId) {
    const people = this._getFromStorage('people', []);
    const person = people.find((p) => p.id === personId) || null;

    const project_members = this._getFromStorage('project_members', []);
    const projects = this._getFromStorage('projects', []);
    const publication_authors = this._getFromStorage('publication_authors', []);
    const publications = this._getFromStorage('publications', []);

    if (!person) {
      return {
        person: null,
        contact: {
          email: null,
          has_public_email: false,
          can_copy_email: false
        },
        projects: [],
        publications: []
      };
    }

    const contact = {
      email: person.email || null,
      has_public_email: !!person.has_public_email,
      can_copy_email: !!person.has_public_email && !!person.email
    };

    const projectsForPerson = project_members
      .filter((pm) => pm.person_id === personId)
      .map((pm) => {
        const proj = projects.find((p) => p.id === pm.project_id) || null;
        if (!proj) return null;
        return {
          project_id: pm.project_id,
          title: proj.title,
          status: proj.status,
          start_year: proj.start_year,
          end_year: proj.end_year,
          project: proj // foreign key resolution helper
        };
      })
      .filter(Boolean);

    const publicationsForPerson = publication_authors
      .filter((pa) => pa.person_id === personId)
      .map((pa) => {
        const pub = publications.find((p) => p.id === pa.publication_id) || null;
        return {
          publication_id: pa.publication_id,
          title: pub && pub.title ? pub.title : pa.author_name || '',
          year: pub && typeof pub.year === 'number' ? pub.year : null,
          type: pub ? pub.type : null,
          venue: pub ? pub.venue : null,
          publication: pub // foreign key resolution helper
        };
      });

    return {
      person: {
        id: person.id,
        full_name: person.full_name,
        role: person.role,
        affiliation: person.affiliation,
        bio: person.bio,
        photo_url: person.photo_url,
        website_url: person.website_url,
        research_areas: person.research_areas || [],
        tags: person.tags || []
      },
      contact,
      projects: projectsForPerson,
      publications: publicationsForPerson
    };
  }

  copyEmail(personId) {
    const people = this._getFromStorage('people', []);
    const person = people.find((p) => p.id === personId) || null;
    if (!person || !person.email || !person.has_public_email) {
      return {
        success: false,
        email: null,
        message: 'Email is not available for this person.'
      };
    }

    // Instrumentation for task completion tracking
    try {
      localStorage.setItem('task2_copiedEmailPersonId', String(personId));
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      success: true,
      email: person.email,
      message: 'Email retrieved for copying.'
    };
  }

  // ---------------------- Events & Schedule ----------------------

  getEventFilterOptions() {
    const events = this._getFromStorage('events', []);

    let earliest = null;
    let latest = null;
    for (const evt of events) {
      const d = this._parseDate(evt.start_datetime);
      if (!d) continue;
      if (!earliest || d < earliest) earliest = d;
      if (!latest || d > latest) latest = d;
    }

    const audiencesEnum = ['public', 'students', 'staff', 'partners', 'internal', 'other'];
    const audiences = audiencesEnum.map((value) => ({
      value,
      label: value.charAt(0).toUpperCase() + value.slice(1)
    }));

    return {
      audiences,
      date_range: {
        earliest: earliest ? earliest.toISOString() : null,
        latest: latest ? latest.toISOString() : null
      }
    };
  }

  getEvents(audience, date_from, date_to, include_past = false, sort_by, page = 1, page_size = 20) {
    const events = this._getFromStorage('events', []);
    const now = new Date();

    let items = events.slice();

    if (audience) {
      items = items.filter((e) => e.audience === audience);
    }

    if (date_from) {
      const fromDate = this._parseDate(date_from);
      if (fromDate) {
        items = items.filter((e) => {
          const d = this._parseDate(e.start_datetime);
          return d && d >= fromDate;
        });
      }
    }

    if (date_to) {
      const toDate = this._parseDate(date_to);
      if (toDate) {
        items = items.filter((e) => {
          const d = this._parseDate(e.start_datetime);
          return d && d <= toDate;
        });
      }
    }

    if (!include_past && !date_from) {
      items = items.filter((e) => {
        const d = this._parseDate(e.start_datetime);
        return d && d >= now;
      });
    }

    const sortKey = sort_by || 'date_soonest';
    if (sortKey === 'date_soonest') {
      items.sort((a, b) => {
        const da = this._parseDate(a.start_datetime) || new Date(0);
        const db = this._parseDate(b.start_datetime) || new Date(0);
        return da - db;
      });
    } else if (sortKey === 'date_latest') {
      items.sort((a, b) => {
        const da = this._parseDate(a.start_datetime) || new Date(0);
        const db = this._parseDate(b.start_datetime) || new Date(0);
        return db - da;
      });
    }

    const total = items.length;
    const start = (page - 1) * page_size;
    const paged = items.slice(start, start + page_size);

    return {
      items: paged,
      total,
      page,
      page_size
    };
  }

  getEventDetail(eventId) {
    const events = this._getFromStorage('events', []);
    const event = events.find((e) => e.id === eventId) || null;

    const event_speakers = this._getFromStorage('event_speakers', []);
    const people = this._getFromStorage('people', []);
    const schedule_items = this._getFromStorage('schedule_items', []);

    if (!event) {
      return {
        event: null,
        speakers: [],
        is_in_schedule: false
      };
    }

    const speakers = event_speakers
      .filter((es) => es.event_id === eventId)
      .map((es) => {
        const person = people.find((p) => p.id === es.person_id) || {};
        return {
          person_id: es.person_id,
          full_name: person.full_name,
          role: es.role
        };
      });

    const is_in_schedule = schedule_items.some((si) => si.event_id === eventId);

    return {
      event: {
        id: event.id,
        title: event.title,
        slug: event.slug,
        description: event.description,
        start_datetime: event.start_datetime,
        end_datetime: event.end_datetime,
        location: event.location,
        audience: event.audience,
        is_all_day: !!event.is_all_day
      },
      speakers,
      is_in_schedule
    };
  }

  addEventToSchedule(eventId) {
    const events = this._getFromStorage('events', []);
    const event = events.find((e) => e.id === eventId);
    if (!event) {
      return {
        success: false,
        event_id: eventId,
        date_added: null,
        schedule_count: 0,
        message: 'Event not found.'
      };
    }

    const schedule = this._getOrCreateSchedule();
    const items = this._getFromStorage('schedule_items', []);
    let existing = items.find((si) => si.event_id === eventId && si.schedule_id === schedule.id);

    if (existing) {
      const count = items.filter((si) => si.schedule_id === schedule.id).length;
      return {
        success: true,
        event_id: eventId,
        date_added: existing.date_added,
        schedule_count: count,
        message: 'Event already in schedule.'
      };
    }

    const now = new Date().toISOString();
    const newItem = {
      id: this._generateId('scheduleitem'),
      schedule_id: schedule.id,
      event_id: eventId,
      date_added: now,
      notes: ''
    };

    items.push(newItem);
    this._saveToStorage('schedule_items', items);

    const count = items.filter((si) => si.schedule_id === schedule.id).length;
    return {
      success: true,
      event_id: eventId,
      date_added: now,
      schedule_count: count,
      message: 'Event added to schedule.'
    };
  }

  getScheduleItems(upcoming_only = false, sort_by) {
    const schedule = this._getOrCreateSchedule();
    const items = this._getFromStorage('schedule_items', []);
    const events = this._getFromStorage('events', []);

    const now = new Date();

    let mapped = items
      .filter((si) => si.schedule_id === schedule.id)
      .map((si) => {
        const event = events.find((e) => e.id === si.event_id) || null;
        return {
          event,
          date_added: si.date_added,
          notes: si.notes || ''
        };
      })
      .filter((item) => {
        if (!upcoming_only) return true;
        return !!item.event;
      });

    const sortKey = sort_by || 'date_soonest';
    if (sortKey === 'date_soonest') {
      mapped.sort((a, b) => {
        const da = this._parseDate(a.event && a.event.start_datetime) || new Date(0);
        const db = this._parseDate(b.event && b.event.start_datetime) || new Date(0);
        return da - db;
      });
    } else if (sortKey === 'date_latest') {
      mapped.sort((a, b) => {
        const da = this._parseDate(a.event && a.event.start_datetime) || new Date(0);
        const db = this._parseDate(b.event && b.event.start_datetime) || new Date(0);
        return db - da;
      });
    }

    // Instrumentation for task completion tracking
    try {
      localStorage.setItem('task4_scheduleOpened', 'true');
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      items: mapped,
      total: mapped.length
    };
  }

  removeEventFromSchedule(eventId) {
    const schedule = this._getOrCreateSchedule();
    let items = this._getFromStorage('schedule_items', []);
    const before = items.length;
    items = items.filter(
      (si) => !(si.event_id === eventId && si.schedule_id === schedule.id)
    );
    this._saveToStorage('schedule_items', items);
    const after = items.length;

    return {
      success: before !== after,
      event_id: eventId,
      remaining_count: items.filter((si) => si.schedule_id === schedule.id).length,
      message: before !== after ? 'Event removed from schedule.' : 'Event was not in schedule.'
    };
  }

  // ---------------------- Join Us / Expression of Interest ----------------------

  getJoinUsContent() {
    const stored = this._getFromStorage('join_us_content', null);
    if (stored) {
      return {
        overview_html: stored.overview_html || '',
        sections: stored.sections || [],
        prospective_students_intro: stored.prospective_students_intro || ''
      };
    }
    return {
      overview_html: '',
      sections: [],
      prospective_students_intro: ''
    };
  }

  submitExpressionOfInterest(full_name, email, intended_role, preferred_start_term, research_interests) {
    if (!full_name || !email || !intended_role || !preferred_start_term || !research_interests) {
      return {
        success: false,
        submission_id: null,
        status: null,
        message: 'All fields are required.'
      };
    }

    const submissions = this._getFromStorage('expression_of_interest_submissions', []);
    const id = this._generateId('eoi');
    const now = new Date().toISOString();

    const submission = {
      id,
      full_name,
      email,
      intended_role,
      preferred_start_term,
      research_interests,
      submitted_at: now,
      status: 'new'
    };

    submissions.push(submission);
    this._saveToStorage('expression_of_interest_submissions', submissions);

    return {
      success: true,
      submission_id: id,
      status: 'new',
      message: 'Expression of interest submitted.'
    };
  }

  // ---------------------- About & Contact ----------------------

  getAboutContent() {
    const stored = this._getFromStorage('about_content', null);
    if (stored) {
      return {
        mission_html: stored.mission_html || '',
        history_html: stored.history_html || '',
        research_themes: stored.research_themes || [],
        achievements: stored.achievements || []
      };
    }
    return {
      mission_html: '',
      history_html: '',
      research_themes: [],
      achievements: []
    };
  }

  getContactContent() {
    const stored = this._getFromStorage('contact_content', null);
    if (stored) {
      return {
        address: stored.address || '',
        email: stored.email || '',
        phone: stored.phone || '',
        additional_info_html: stored.additional_info_html || ''
      };
    }
    return {
      address: '',
      email: '',
      phone: '',
      additional_info_html: ''
    };
  }

  submitContactMessage(full_name, email, subject, message) {
    if (!full_name || !email || !message) {
      return {
        success: false,
        message_id: null,
        status: null,
        message_text: 'Full name, email, and message are required.'
      };
    }

    const messages = this._getFromStorage('contact_messages', []);
    const id = this._generateId('contactmsg');
    const now = new Date().toISOString();

    const record = {
      id,
      full_name,
      email,
      subject: subject || '',
      message,
      submitted_at: now,
      status: 'new'
    };

    messages.push(record);
    this._saveToStorage('contact_messages', messages);

    return {
      success: true,
      message_id: id,
      status: 'new',
      message_text: 'Message submitted.'
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