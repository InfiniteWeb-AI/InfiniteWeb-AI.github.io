'use strict';

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
  }

  // Initialization
  _initStorage() {
    const tableKeys = [
      'projects',
      'project_lists',
      'project_list_items',
      'project_update_subscriptions',
      'contact_messages',
      'notes',
      'briefings',
      'compare_sessions',
      'publications',
      'reading_lists',
      'reading_list_items',
      'events',
      'event_registrations',
      'datasets',
      'download_queue',
      'download_queue_items'
    ];

    tableKeys.forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    });

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }

    // helper state
    if (!localStorage.getItem('followed_projects')) {
      localStorage.setItem('followed_projects', JSON.stringify([]));
    }
    if (!localStorage.getItem('compare_session_current_id')) {
      localStorage.setItem('compare_session_current_id', '');
    }
    if (!localStorage.getItem('download_queue_current_id')) {
      localStorage.setItem('download_queue_current_id', '');
    }
  }

  // Generic storage helpers
  _getFromStorage(key) {
    const data = localStorage.getItem(key);
    if (!data) return [];
    try {
      return JSON.parse(data);
    } catch (e) {
      return [];
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

  _nowISO() {
    return new Date().toISOString();
  }

  _parseDate(value) {
    if (!value) return null;
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }

  _formatDate(date) {
    if (!date) return '';
    const d = date instanceof Date ? date : this._parseDate(date);
    if (!d) return '';
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  }

  _formatDateTime(date) {
    if (!date) return '';
    const d = date instanceof Date ? date : this._parseDate(date);
    if (!d) return '';
    return d.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  _buildDateDisplayStrings(start, end) {
    const startStr = this._formatDate(start);
    const endStr = this._formatDate(end);
    let range = '';
    if (startStr && endStr) {
      range = startStr + '  ' + endStr;
    } else if (startStr) {
      range = startStr + '  Present';
    } else if (endStr) {
      range = 'Until ' + endStr;
    }
    return {
      formatted_start_date: startStr,
      formatted_end_date: endStr,
      formatted_date_range: range
    };
  }

  _formatFunding(amount, currency) {
    if (typeof amount !== 'number' || isNaN(amount)) return '';
    const curr = currency || 'usd';
    const symbol = curr === 'eur' ? '€' : curr === 'gbp' ? '£' : '$';
    // Simple formatting: thousands separator, no cents
    const parts = Math.round(amount).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return symbol + parts;
  }

  // Enum labels
  _resolveEnumLabels(group, value) {
    if (!value) return '';
    const maps = {
      project_topic: {
        freshwater_biodiversity: 'Freshwater biodiversity',
        coastal_restoration: 'Coastal restoration',
        water_quality: 'Water quality',
        renewable_energy: 'Renewable energy',
        climate_adaptation: 'Climate adaptation',
        deforestation: 'Deforestation',
        microplastics: 'Microplastics',
        urban_air_quality: 'Urban air quality',
        other: 'Other topic'
      },
      region: {
        africa: 'Africa',
        south_america: 'South America',
        southeast_asia: 'Southeast Asia',
        europe: 'Europe',
        north_america: 'North America',
        asia: 'Asia',
        oceania: 'Oceania',
        antarctica: 'Antarctica',
        global: 'Global',
        multiple_regions: 'Multiple regions',
        other_region: 'Other region'
      },
      project_status: {
        ongoing: 'Ongoing',
        completed: 'Completed',
        planned: 'Planned',
        cancelled: 'Cancelled'
      },
      risk_level: {
        low: 'Low',
        medium: 'Medium',
        high: 'High'
      },
      publication_type: {
        peer_reviewed_article: 'Peer-reviewed article',
        report: 'Report',
        dataset_description: 'Dataset description',
        book: 'Book',
        book_chapter: 'Book chapter',
        conference_paper: 'Conference paper',
        preprint: 'Preprint',
        other_publication: 'Other publication'
      },
      event_type: {
        webinar: 'Webinar',
        workshop: 'Workshop',
        conference: 'Conference',
        meeting: 'Meeting',
        training: 'Training',
        other_event: 'Other event'
      },
      dataset_license: {
        cc_by: 'CC-BY',
        cc0: 'CC0',
        cc_by_sa: 'CC-BY-SA',
        cc_by_nc: 'CC-BY-NC',
        other_license: 'Other license'
      },
      file_format: {
        csv: 'CSV',
        tsv: 'TSV',
        json: 'JSON',
        geojson: 'GeoJSON',
        shapefile: 'Shapefile',
        netcdf: 'NetCDF',
        xml: 'XML',
        other_format: 'Other format'
      }
    };
    const groupMap = maps[group] || {};
    return groupMap[value] || value;
  }

  // Helper: get or create compare session (single current session)
  _getOrCreateCompareSession() {
    const sessions = this._getFromStorage('compare_sessions');
    let currentId = localStorage.getItem('compare_session_current_id') || '';
    let session = null;
    if (currentId) {
      session = sessions.find((s) => s.id === currentId) || null;
    }
    if (!session) {
      session = {
        id: this._generateId('compare'),
        project_ids: [],
        created_at: this._nowISO()
      };
      sessions.push(session);
      this._saveToStorage('compare_sessions', sessions);
      localStorage.setItem('compare_session_current_id', session.id);
    }
    return session;
  }

  // Helper: get or create download queue (single queue)
  _getOrCreateDownloadQueue() {
    const queues = this._getFromStorage('download_queue');
    let currentId = localStorage.getItem('download_queue_current_id') || '';
    let queue = null;
    if (currentId) {
      queue = queues.find((q) => q.id === currentId) || null;
    }
    if (!queue) {
      queue = {
        id: this._generateId('dq'),
        created_at: this._nowISO(),
        updated_at: this._nowISO()
      };
      queues.push(queue);
      this._saveToStorage('download_queue', queues);
      localStorage.setItem('download_queue_current_id', queue.id);
    }
    return queue;
  }

  // Helper: latest registration for an event
  _getLatestEventRegistration(event_id) {
    const regs = this._getFromStorage('event_registrations');
    const filtered = regs.filter((r) => r.event_id === event_id);
    if (!filtered.length) return null;
    filtered.sort((a, b) => {
      const ta = this._parseDate(a.registered_at || 0)?.getTime() || 0;
      const tb = this._parseDate(b.registered_at || 0)?.getTime() || 0;
      return ta - tb;
    });
    return filtered[filtered.length - 1];
  }

  // Helper: simple full-text match
  _matchesQuery(obj, fields, query) {
    // Treat empty query as match-all
    if (!query) return true;
    const q = String(query).toLowerCase().trim();
    if (!q) return true;

    // Split query into whitespace-separated terms and require that each
    // term appears in at least one of the specified fields.
    const terms = q.split(/\s+/).filter(Boolean);

    return terms.every((term) => {
      return fields.some((field) => {
        const val = obj[field];
        if (val == null) return false;
        if (Array.isArray(val)) {
          return val.some((v) => String(v).toLowerCase().includes(term));
        }
        return String(val).toLowerCase().includes(term);
      });
    });
  }

  // Helper: get followed projects set
  _getFollowedProjectsSet() {
    const arr = this._getFromStorage('followed_projects');
    return new Set(arr);
  }

  _setFollowedProjectsSet(set) {
    this._saveToStorage('followed_projects', Array.from(set));
  }

  // 1) searchGlobalContent
  searchGlobalContent(query, maxPerType = 3) {
    const projectsRaw = this._getFromStorage('projects');
    const publicationsRaw = this._getFromStorage('publications');
    const datasetsRaw = this._getFromStorage('datasets');
    const eventsRaw = this._getFromStorage('events');

    const projectMatches = projectsRaw
      .filter((p) => this._matchesQuery(p, ['title', 'short_title', 'description', 'topic', 'region'], query))
      .slice(0, maxPerType)
      .map((p) => {
        const topic = this._resolveEnumLabels('project_topic', p.topic);
        const region = this._resolveEnumLabels('region', p.region);
        const dates = this._buildDateDisplayStrings(p.start_date, p.end_date);
        return {
          project: p,
          display_topic_label: topic,
          display_region_label: region,
          formatted_start_date: dates.formatted_start_date
        };
      });

    const publicationMatches = publicationsRaw
      .filter((pub) => this._matchesQuery(pub, ['title', 'abstract', 'topic'], query))
      .slice(0, maxPerType)
      .map((pub) => ({
        publication: pub,
        formatted_publication_year: String(pub.publication_year || ''),
        primary_author: Array.isArray(pub.authors) && pub.authors.length ? pub.authors[0] : ''
      }));

    const datasetMatches = datasetsRaw
      .filter((d) => this._matchesQuery(d, ['title', 'description', 'topic', 'region'], query))
      .slice(0, maxPerType)
      .map((d) => ({
        dataset: d,
        display_region_label: this._resolveEnumLabels('region', d.region),
        primary_format_label: this._resolveEnumLabels('file_format', d.primary_format || (Array.isArray(d.file_formats) ? d.file_formats[0] : ''))
      }));

    const eventMatches = eventsRaw
      .filter((e) => this._matchesQuery(e, ['title', 'description', 'topic', 'region'], query))
      .slice(0, maxPerType)
      .map((e) => ({
        event: e,
        formatted_start_datetime: this._formatDateTime(e.start_datetime),
        display_region_label: this._resolveEnumLabels('region', e.region)
      }));

    return {
      projects: projectMatches,
      publications: publicationMatches,
      datasets: datasetMatches,
      events: eventMatches
    };
  }

  // 2) getHomeOverviewContent
  getHomeOverviewContent() {
    const projects = this._getFromStorage('projects');
    const publications = this._getFromStorage('publications');
    const datasets = this._getFromStorage('datasets');
    const events = this._getFromStorage('events');

    return {
      hero_title: 'Environmental research insights, in one place',
      hero_subtitle: 'Explore projects, publications, datasets, and events focused on our changing planet.',
      intro_markdown:
        '# Environmental research catalog\n\nBrowse freshwater biodiversity initiatives, climate adaptation efforts, air quality studies, and more. Use filters to focus on specific regions, time periods, or methods.',
      project_count: projects.length,
      publication_count: publications.length,
      dataset_count: datasets.length,
      event_count: events.length
    };
  }

  // 3) getHomeFeaturedContent
  getHomeFeaturedContent() {
    const projects = this._getFromStorage('projects').slice(0, 3).map((p) => {
      const dates = this._buildDateDisplayStrings(p.start_date, p.end_date);
      return {
        project: p,
        reason_tag: 'Featured project',
        formatted_date_range: dates.formatted_date_range
      };
    });

    const publications = this._getFromStorage('publications')
      .sort((a, b) => (b.citation_count || 0) - (a.citation_count || 0))
      .slice(0, 3)
      .map((pub) => ({
        publication: pub,
        reason_tag: 'Highly cited'
      }));

    const now = Date.now();
    const events = this._getFromStorage('events')
      .filter((e) => {
        const d = this._parseDate(e.start_datetime);
        return d && d.getTime() >= now;
      })
      .sort((a, b) => {
        const ta = this._parseDate(a.start_datetime)?.getTime() || 0;
        const tb = this._parseDate(b.start_datetime)?.getTime() || 0;
        return ta - tb;
      })
      .slice(0, 3)
      .map((e) => ({
        event: e,
        formatted_start_datetime: this._formatDateTime(e.start_datetime)
      }));

    return {
      featured_projects: projects,
      featured_publications: publications,
      upcoming_events: events
    };
  }

  // 4) getProjectFilterOptions
  getProjectFilterOptions() {
    // Static enum-based options
    const topics = [
      'freshwater_biodiversity',
      'coastal_restoration',
      'water_quality',
      'renewable_energy',
      'climate_adaptation',
      'deforestation',
      'microplastics',
      'urban_air_quality',
      'other'
    ].map((val) => ({ value: val, label: this._resolveEnumLabels('project_topic', val) }));

    const regions = [
      'africa',
      'south_america',
      'southeast_asia',
      'europe',
      'north_america',
      'asia',
      'oceania',
      'antarctica',
      'global',
      'multiple_regions',
      'other_region'
    ].map((val) => ({ value: val, label: this._resolveEnumLabels('region', val) }));

    const statuses = ['ongoing', 'completed', 'planned', 'cancelled'].map((val) => ({
      value: val,
      label: this._resolveEnumLabels('project_status', val)
    }));

    const risk_levels = ['low', 'medium', 'high'].map((val) => ({
      value: val,
      label: this._resolveEnumLabels('risk_level', val)
    }));

    const projects = this._getFromStorage('projects');

    // component/tag suggestions
    const tagSet = new Set();
    projects.forEach((p) => {
      if (Array.isArray(p.components_tags)) {
        p.components_tags.forEach((t) => tagSet.add(t));
      }
    });

    // fieldwork years
    const yearSet = new Set();
    projects.forEach((p) => {
      if (Array.isArray(p.fieldwork_years)) {
        p.fieldwork_years.forEach((y) => {
          if (typeof y === 'number') yearSet.add(y);
        });
      }
    });
    const fieldwork_years = Array.from(yearSet).sort((a, b) => a - b);

    // start year range
    let minYear = null;
    let maxYear = null;
    projects.forEach((p) => {
      if (typeof p.start_year === 'number') {
        if (minYear == null || p.start_year < minYear) minYear = p.start_year;
        if (maxYear == null || p.start_year > maxYear) maxYear = p.start_year;
      }
    });

    // funding range
    let minFunding = null;
    let maxFunding = null;
    projects.forEach((p) => {
      if (typeof p.total_funding === 'number') {
        if (minFunding == null || p.total_funding < minFunding) minFunding = p.total_funding;
        if (maxFunding == null || p.total_funding > maxFunding) maxFunding = p.total_funding;
      }
    });

    const team_size_buckets = [
      { id: '1_10', label: '110 researchers', min_size: 1, max_size: 10 },
      { id: '11_25', label: '1125 researchers', min_size: 11, max_size: 25 },
      { id: '26_50', label: '2650 researchers', min_size: 26, max_size: 50 },
      { id: '51_plus', label: '51+ researchers', min_size: 51, max_size: Number.MAX_SAFE_INTEGER }
    ];

    const sort_options = [
      { value: 'relevance', label: 'Relevance' },
      { value: 'funding_high_to_low', label: 'Funding  High to Low' },
      { value: 'start_date_newest_first', label: 'Start date  Newest first' },
      { value: 'end_date_newest_first', label: 'End date  Newest first' },
      { value: 'next_milestone_soonest_first', label: 'Next milestone  Soonest first' }
    ];

    return {
      topics,
      regions,
      statuses,
      risk_levels,
      components_tags_suggestions: Array.from(tagSet),
      fieldwork_years,
      start_year_range: {
        min_year: minYear || null,
        max_year: maxYear || null
      },
      funding_range: {
        min_amount: minFunding || 0,
        max_amount: maxFunding || 0,
        currency: 'usd'
      },
      team_size_buckets,
      sort_options
    };
  }

  // 5) searchProjects
  searchProjects(query = '', filters = {}, sort = {}, page = 1, page_size = 20) {
    const projectsRaw = this._getFromStorage('projects');
    const compareSessionId = localStorage.getItem('compare_session_current_id') || '';
    const compareSessions = this._getFromStorage('compare_sessions');
    const compareSession = compareSessionId
      ? compareSessions.find((s) => s.id === compareSessionId) || null
      : null;
    const inCompareSet = new Set(compareSession ? compareSession.project_ids || [] : []);

    const listItems = this._getFromStorage('project_list_items');
    const savedSet = new Set(listItems.map((li) => li.project_id));

    let results = projectsRaw.filter((p) => this._matchesQuery(p, ['title', 'short_title', 'description'], query));

    if (filters) {
      if (filters.topic) {
        results = results.filter((p) => p.topic === filters.topic);
      }
      if (filters.region) {
        results = results.filter((p) => p.region === filters.region);
      }
      if (filters.status) {
        results = results.filter((p) => p.status === filters.status);
      }
      if (filters.risk_level) {
        results = results.filter((p) => p.risk_level === filters.risk_level);
      }
      if (filters.has_community_engagement) {
        results = results.filter((p) => p.has_community_engagement === true);
      }
      if (filters.components_tags && Array.isArray(filters.components_tags) && filters.components_tags.length) {
        results = results.filter((p) => {
          if (!Array.isArray(p.components_tags)) return false;
          return filters.components_tags.every((t) => p.components_tags.includes(t));
        });
      }
      if (typeof filters.fieldwork_year === 'number') {
        results = results.filter((p) =>
          Array.isArray(p.fieldwork_years) && p.fieldwork_years.includes(filters.fieldwork_year)
        );
      }
      if (typeof filters.start_year_min === 'number') {
        results = results.filter((p) => typeof p.start_year === 'number' && p.start_year >= filters.start_year_min);
      }
      if (typeof filters.start_year_max === 'number') {
        results = results.filter((p) => typeof p.start_year === 'number' && p.start_year <= filters.start_year_max);
      }
      if (typeof filters.funding_min === 'number') {
        results = results.filter((p) => typeof p.total_funding === 'number' && p.total_funding >= filters.funding_min);
      }
      if (typeof filters.funding_max === 'number') {
        results = results.filter((p) => typeof p.total_funding === 'number' && p.total_funding <= filters.funding_max);
      }
      // Team size
      if (typeof filters.team_size_min === 'number') {
        results = results.filter((p) => typeof p.team_size === 'number' && p.team_size >= filters.team_size_min);
      }
      if (typeof filters.team_size_max === 'number') {
        results = results.filter((p) => typeof p.team_size === 'number' && p.team_size <= filters.team_size_max);
      }
      if (filters.team_size_bucket_id) {
        const buckets = this.getProjectFilterOptions().team_size_buckets;
        const bucket = buckets.find((b) => b.id === filters.team_size_bucket_id);
        if (bucket) {
          results = results.filter((p) => {
            if (typeof p.team_size !== 'number') return false;
            return p.team_size >= bucket.min_size && p.team_size <= bucket.max_size;
          });
        }
      }
    }

    // Sorting
    const sortBy = sort.sort_by || 'relevance';
    const dir = (sort.sort_direction || 'asc').toLowerCase() === 'desc' ? -1 : 1;

    if (sortBy === 'funding') {
      results.sort((a, b) => {
        const fa = a.total_funding || 0;
        const fb = b.total_funding || 0;
        return (fa - fb) * dir;
      });
    } else if (sortBy === 'start_date') {
      results.sort((a, b) => {
        const ta = this._parseDate(a.start_date)?.getTime() || 0;
        const tb = this._parseDate(b.start_date)?.getTime() || 0;
        return (ta - tb) * dir;
      });
    } else if (sortBy === 'end_date') {
      results.sort((a, b) => {
        const ta = this._parseDate(a.end_date)?.getTime() || 0;
        const tb = this._parseDate(b.end_date)?.getTime() || 0;
        return (ta - tb) * dir;
      });
    } else if (sortBy === 'next_milestone') {
      results.sort((a, b) => {
        const ta = this._parseDate(a.next_milestone_date)?.getTime() || Number.MAX_SAFE_INTEGER;
        const tb = this._parseDate(b.next_milestone_date)?.getTime() || Number.MAX_SAFE_INTEGER;
        return (ta - tb) * dir;
      });
    }

    const total_results = results.length;
    const startIndex = (page - 1) * page_size;
    const pageItems = results.slice(startIndex, startIndex + page_size);

    const projects = pageItems.map((p) => {
      const topic = this._resolveEnumLabels('project_topic', p.topic);
      const region = this._resolveEnumLabels('region', p.region);
      const statusLabel = this._resolveEnumLabels('project_status', p.status);
      const dates = this._buildDateDisplayStrings(p.start_date, p.end_date);
      const fundingDisplay = this._formatFunding(p.total_funding, p.funding_currency);
      let milestoneBadge = '';
      if (p.next_milestone_date) {
        milestoneBadge = 'Next milestone: ' + this._formatDate(p.next_milestone_date);
      }
      return {
        project: p,
        display_topic_label: topic,
        display_region_label: region,
        display_status_label: statusLabel,
        formatted_start_date: dates.formatted_start_date,
        formatted_end_date: dates.formatted_end_date,
        formatted_date_range: dates.formatted_date_range,
        funding_display: fundingDisplay,
        next_milestone_badge: milestoneBadge,
        is_in_compare: inCompareSet.has(p.id),
        is_saved_to_any_list: savedSet.has(p.id)
      };
    });

    return {
      total_results,
      page,
      page_size,
      projects
    };
  }

  // 6) getProjectDetail
  getProjectDetail(projectId) {
    const projects = this._getFromStorage('projects');
    const project = projects.find((p) => p.id === projectId) || null;
    if (!project) {
      return {
        project: null,
        display_topic_label: '',
        display_region_label: '',
        display_status_label: '',
        formatted_start_date: '',
        formatted_end_date: '',
        formatted_date_range: '',
        funding_display: '',
        timeline_summary: '',
        team_summary: '',
        is_following: false,
        is_in_compare: false,
        has_update_subscription: false
      };
    }

    const topic = this._resolveEnumLabels('project_topic', project.topic);
    const region = this._resolveEnumLabels('region', project.region);
    const statusLabel = this._resolveEnumLabels('project_status', project.status);
    const dates = this._buildDateDisplayStrings(project.start_date, project.end_date);
    const fundingDisplay = this._formatFunding(project.total_funding, project.funding_currency);

    const timelineSummary = dates.formatted_date_range
      ? 'Project timeline: ' + dates.formatted_date_range
      : 'Project timeline not available';

    const teamSummary = typeof project.team_size === 'number'
      ? 'Team size: ' + project.team_size
      : 'Team size not specified';

    const followedSet = this._getFollowedProjectsSet();

    const compareSessionId = localStorage.getItem('compare_session_current_id') || '';
    const compareSessions = this._getFromStorage('compare_sessions');
    const compareSession = compareSessionId
      ? compareSessions.find((s) => s.id === compareSessionId) || null
      : null;
    const inCompare = compareSession && Array.isArray(compareSession.project_ids)
      ? compareSession.project_ids.includes(projectId)
      : false;

    const subs = this._getFromStorage('project_update_subscriptions');
    const hasSub = subs.some(
      (s) => s.project_id === projectId && !s.unsubscribed_at && s.email_updates_enabled
    );

    return {
      project,
      display_topic_label: topic,
      display_region_label: region,
      display_status_label: statusLabel,
      formatted_start_date: dates.formatted_start_date,
      formatted_end_date: dates.formatted_end_date,
      formatted_date_range: dates.formatted_date_range,
      funding_display: fundingDisplay,
      timeline_summary: timelineSummary,
      team_summary: teamSummary,
      is_following: followedSet.has(projectId),
      is_in_compare: inCompare,
      has_update_subscription: hasSub
    };
  }

  // 7) getProjectLists
  getProjectLists() {
    const lists = this._getFromStorage('project_lists');
    const items = this._getFromStorage('project_list_items');
    const result = lists.map((list) => {
      const itemCount = items.filter((it) => it.project_list_id === list.id).length;
      return {
        list,
        item_count: itemCount
      };
    });
    return result;
  }

  // 8) saveProjectToList
  saveProjectToList(projectId, targetList) {
    const projects = this._getFromStorage('projects');
    const project = projects.find((p) => p.id === projectId);
    if (!project) {
      return { success: false, project_list: null, message: 'Project not found' };
    }

    let lists = this._getFromStorage('project_lists');
    let items = this._getFromStorage('project_list_items');
    let list = null;

    if (!targetList || !targetList.mode) {
      return { success: false, project_list: null, message: 'Invalid targetList mode' };
    }

    if (targetList.mode === 'new') {
      if (!targetList.new_list_name) {
        return { success: false, project_list: null, message: 'List name required' };
      }
      list = {
        id: this._generateId('plist'),
        name: targetList.new_list_name,
        description: '',
        list_type: targetList.list_type || 'bookmark',
        created_at: this._nowISO(),
        updated_at: this._nowISO()
      };
      lists.push(list);
    } else if (targetList.mode === 'existing') {
      if (!targetList.project_list_id) {
        return { success: false, project_list: null, message: 'project_list_id is required' };
      }
      list = lists.find((l) => l.id === targetList.project_list_id) || null;
      if (!list) {
        return { success: false, project_list: null, message: 'Target list not found' };
      }
      list.updated_at = this._nowISO();
    } else {
      return { success: false, project_list: null, message: 'Unknown mode' };
    }

    const exists = items.some(
      (it) => it.project_list_id === list.id && it.project_id === projectId
    );
    if (!exists) {
      const item = {
        id: this._generateId('pli'),
        project_list_id: list.id,
        project_id: projectId,
        added_at: this._nowISO()
      };
      items.push(item);
    }

    this._saveToStorage('project_lists', lists);
    this._saveToStorage('project_list_items', items);

    return {
      success: true,
      project_list: list,
      message: 'Project saved to list'
    };
  }

  // 9) addProjectToCompare
  addProjectToCompare(projectId) {
    const projects = this._getFromStorage('projects');
    const project = projects.find((p) => p.id === projectId);
    if (!project) {
      return {
        compare_session: null,
        project_count: 0,
        is_limit_reached: false,
        message: 'Project not found'
      };
    }

    const sessions = this._getFromStorage('compare_sessions');
    let session = this._getOrCreateCompareSession();

    const maxItems = 4;
    let isLimitReached = false;
    let message = '';

    if (!Array.isArray(session.project_ids)) {
      session.project_ids = [];
    }

    if (session.project_ids.includes(projectId)) {
      message = 'Project already in comparison';
    } else if (session.project_ids.length >= maxItems) {
      isLimitReached = true;
      message = 'Comparison limit reached';
    } else {
      session.project_ids.push(projectId);
      session.created_at = session.created_at || this._nowISO();
      // persist updated session
      const idx = sessions.findIndex((s) => s.id === session.id);
      if (idx >= 0) {
        sessions[idx] = session;
      } else {
        sessions.push(session);
      }
      this._saveToStorage('compare_sessions', sessions);
      message = 'Project added to comparison';
    }

    return {
      compare_session: session,
      project_count: session.project_ids.length,
      is_limit_reached: isLimitReached,
      message
    };
  }

  // 10) removeProjectFromCompare
  removeProjectFromCompare(projectId) {
    const sessions = this._getFromStorage('compare_sessions');
    const currentId = localStorage.getItem('compare_session_current_id') || '';
    const session = currentId
      ? sessions.find((s) => s.id === currentId) || null
      : null;
    if (!session || !Array.isArray(session.project_ids)) {
      return {
        compare_session: null,
        project_count: 0
      };
    }

    session.project_ids = session.project_ids.filter((id) => id !== projectId);
    const idx = sessions.findIndex((s) => s.id === session.id);
    if (idx >= 0) {
      sessions[idx] = session;
      this._saveToStorage('compare_sessions', sessions);
    }

    return {
      compare_session: session,
      project_count: session.project_ids.length
    };
  }

  // 11) getCompareSessionSummary
  getCompareSessionSummary() {
    const sessions = this._getFromStorage('compare_sessions');
    const currentId = localStorage.getItem('compare_session_current_id') || '';
    const session = currentId
      ? sessions.find((s) => s.id === currentId) || null
      : null;
    const projectsRaw = this._getFromStorage('projects');

    if (!session) {
      return {
        compare_session: null,
        projects: []
      };
    }

    const projectEntities = session.project_ids
      .map((id) => projectsRaw.find((p) => p.id === id) || null)
      .filter((p) => !!p);

    let maxDuration = 0;
    projectEntities.forEach((p) => {
      const dur = typeof p.duration_months === 'number' ? p.duration_months : 0;
      if (dur > maxDuration) maxDuration = dur;
    });

    const projects = projectEntities.map((p) => {
      const topic = this._resolveEnumLabels('project_topic', p.topic);
      const region = this._resolveEnumLabels('region', p.region);
      const statusLabel = this._resolveEnumLabels('project_status', p.status);
      const fundingDisplay = this._formatFunding(p.total_funding, p.funding_currency);
      const durationMonths = typeof p.duration_months === 'number' ? p.duration_months : 0;
      const durationLabel = durationMonths ? durationMonths + ' months' : 'Duration not specified';
      const isLongest = maxDuration && durationMonths === maxDuration;
      return {
        project: p,
        display_topic_label: topic,
        display_region_label: region,
        display_status_label: statusLabel,
        funding_display: fundingDisplay,
        duration_months: durationMonths,
        duration_label: durationLabel,
        is_longest_duration: isLongest
      };
    });

    return {
      compare_session: session,
      projects
    };
  }

  // 12) clearCompareSession
  clearCompareSession() {
    const sessions = this._getFromStorage('compare_sessions');
    const currentId = localStorage.getItem('compare_session_current_id') || '';
    if (currentId) {
      const idx = sessions.findIndex((s) => s.id === currentId);
      if (idx >= 0) {
        sessions.splice(idx, 1);
        this._saveToStorage('compare_sessions', sessions);
      }
      localStorage.setItem('compare_session_current_id', '');
    }
    return { success: true };
  }

  // 13) subscribeToProjectUpdates
  subscribeToProjectUpdates(projectId, email, email_updates_enabled) {
    const projects = this._getFromStorage('projects');
    const project = projects.find((p) => p.id === projectId);
    if (!project) {
      return { subscription: null, success: false, message: 'Project not found' };
    }
    if (!email) {
      return { subscription: null, success: false, message: 'Email is required' };
    }

    const subs = this._getFromStorage('project_update_subscriptions');

    // Upsert by projectId + email
    let sub = subs.find((s) => s.project_id === projectId && s.email === email) || null;
    if (!sub) {
      sub = {
        id: this._generateId('sub'),
        project_id: projectId,
        email,
        email_updates_enabled: !!email_updates_enabled,
        created_at: this._nowISO(),
        unsubscribed_at: null
      };
      subs.push(sub);
    } else {
      sub.email_updates_enabled = !!email_updates_enabled;
      if (email_updates_enabled) {
        sub.unsubscribed_at = null;
      }
    }

    this._saveToStorage('project_update_subscriptions', subs);

    return {
      subscription: sub,
      success: true,
      message: 'Subscription saved'
    };
  }

  // 14) sendProjectContactMessage
  sendProjectContactMessage(projectId, sender_name, sender_email, message_body) {
    const projects = this._getFromStorage('projects');
    const project = projects.find((p) => p.id === projectId);
    if (!project) {
      return { contact_message: null, success: false, message: 'Project not found' };
    }
    if (!sender_name || !sender_email || !message_body) {
      return { contact_message: null, success: false, message: 'All fields are required' };
    }

    const messages = this._getFromStorage('contact_messages');
    const msg = {
      id: this._generateId('msg'),
      project_id: projectId,
      sender_name,
      sender_email,
      message_body,
      status: 'sent',
      created_at: this._nowISO()
    };
    messages.push(msg);
    this._saveToStorage('contact_messages', messages);

    return {
      contact_message: msg,
      success: true,
      message: 'Message sent'
    };
  }

  // 15) savePIContactToNote
  savePIContactToNote(projectId, note_title, note_body) {
    const projects = this._getFromStorage('projects');
    const project = projects.find((p) => p.id === projectId);
    if (!project) {
      return { note: null, success: false, message: 'Project not found' };
    }
    if (!note_title || !note_body) {
      return { note: null, success: false, message: 'Note title and body are required' };
    }

    const notes = this._getFromStorage('notes');
    const note = {
      id: this._generateId('note'),
      title: note_title,
      body: note_body,
      related_project_id: projectId,
      related_pi_name: project.primary_investigator_name || '',
      related_pi_email: project.primary_investigator_email || '',
      created_at: this._nowISO(),
      updated_at: this._nowISO()
    };
    notes.push(note);
    this._saveToStorage('notes', notes);

    return {
      note,
      success: true,
      message: 'PI contact saved to note'
    };
  }

  // 16) createBriefingFromProject
  createBriefingFromProject(projectId, briefing_title, included_sections) {
    const projects = this._getFromStorage('projects');
    const project = projects.find((p) => p.id === projectId);
    if (!project) {
      return { briefing: null, success: false, message: 'Project not found' };
    }
    if (!Array.isArray(included_sections) || !included_sections.length) {
      return { briefing: null, success: false, message: 'included_sections is required' };
    }

    const title = briefing_title || (project.title ? project.title + '  Briefing' : 'Project briefing');

    const briefing = {
      id: this._generateId('brf'),
      project_id: projectId,
      title,
      included_sections: included_sections.slice(),
      sections_enum: null,
      objectives_text: included_sections.includes('objectives') ? project.objectives || '' : '',
      methods_text: included_sections.includes('methods') ? project.methods || '' : '',
      key_outcomes_text: included_sections.includes('key_outcomes') ? project.key_outcomes || '' : '',
      additional_notes: '',
      created_at: this._nowISO(),
      updated_at: this._nowISO()
    };

    const briefings = this._getFromStorage('briefings');
    briefings.push(briefing);
    this._saveToStorage('briefings', briefings);

    return {
      briefing,
      success: true,
      message: 'Briefing created'
    };
  }

  // 17) followProject
  followProject(projectId, follow) {
    const followedSet = this._getFollowedProjectsSet();
    if (follow) {
      followedSet.add(projectId);
    } else {
      followedSet.delete(projectId);
    }
    this._setFollowedProjectsSet(followedSet);
    return { is_following: followedSet.has(projectId) };
  }

  // 18) getProjectQuickActionsState
  getProjectQuickActionsState(projectId) {
    const followedSet = this._getFollowedProjectsSet();

    const compareSessionId = localStorage.getItem('compare_session_current_id') || '';
    const compareSessions = this._getFromStorage('compare_sessions');
    const compareSession = compareSessionId
      ? compareSessions.find((s) => s.id === compareSessionId) || null
      : null;
    const inCompare = compareSession && Array.isArray(compareSession.project_ids)
      ? compareSession.project_ids.includes(projectId)
      : false;

    const subs = this._getFromStorage('project_update_subscriptions');
    const hasSub = subs.some(
      (s) => s.project_id === projectId && !s.unsubscribed_at && s.email_updates_enabled
    );

    return {
      is_following: followedSet.has(projectId),
      is_in_compare: inCompare,
      has_update_subscription: hasSub
    };
  }

  // 19) getPublicationFilterOptions
  getPublicationFilterOptions() {
    const publications = this._getFromStorage('publications');

    const types = [
      'peer_reviewed_article',
      'report',
      'dataset_description',
      'book',
      'book_chapter',
      'conference_paper',
      'preprint',
      'other_publication'
    ].map((val) => ({ value: val, label: this._resolveEnumLabels('publication_type', val) }));

    let minYear = null;
    let maxYear = null;
    const topicSet = new Set();

    publications.forEach((p) => {
      if (typeof p.publication_year === 'number') {
        if (minYear == null || p.publication_year < minYear) minYear = p.publication_year;
        if (maxYear == null || p.publication_year > maxYear) maxYear = p.publication_year;
      }
      if (p.topic) topicSet.add(p.topic);
    });

    const sort_options = [
      { value: 'citations_high_to_low', label: 'Citations  High to Low' },
      { value: 'publication_date_newest_first', label: 'Publication date  Newest first' },
      { value: 'relevance', label: 'Relevance' }
    ];

    return {
      types,
      year_range: {
        min_year: minYear || null,
        max_year: maxYear || null
      },
      topics: Array.from(topicSet),
      sort_options
    };
  }

  // 20) searchPublications
  searchPublications(query = '', filters = {}, sort = {}, page = 1, page_size = 20) {
    const publicationsRaw = this._getFromStorage('publications');
    let results = publicationsRaw.filter((p) =>
      this._matchesQuery(p, ['title', 'abstract', 'topic'], query)
    );

    if (filters) {
      if (filters.type) {
        results = results.filter((p) => p.type === filters.type);
      }
      if (typeof filters.is_peer_reviewed === 'boolean') {
        results = results.filter((p) => !!p.is_peer_reviewed === filters.is_peer_reviewed);
      }
      if (typeof filters.publication_year_min === 'number') {
        results = results.filter(
          (p) => typeof p.publication_year === 'number' && p.publication_year >= filters.publication_year_min
        );
      }
      if (typeof filters.publication_year_max === 'number') {
        results = results.filter(
          (p) => typeof p.publication_year === 'number' && p.publication_year <= filters.publication_year_max
        );
      }
      if (filters.topic) {
        results = results.filter((p) => p.topic === filters.topic);
      }
    }

    const sortBy = sort.sort_by || 'relevance';
    const dir = (sort.sort_direction || 'desc').toLowerCase() === 'asc' ? 1 : -1;

    if (sortBy === 'citations') {
      results.sort((a, b) => {
        const ca = a.citation_count || 0;
        const cb = b.citation_count || 0;
        return (ca - cb) * dir;
      });
    } else if (sortBy === 'publication_date') {
      results.sort((a, b) => {
        const ta = this._parseDate(a.publication_date)?.getTime() || 0;
        const tb = this._parseDate(b.publication_date)?.getTime() || 0;
        return (ta - tb) * dir;
      });
    }

    const total_results = results.length;
    const startIndex = (page - 1) * page_size;
    const pageItems = results.slice(startIndex, startIndex + page_size);

    const publications = pageItems.map((p) => ({
      publication: p,
      formatted_publication_year: String(p.publication_year || ''),
      primary_author: Array.isArray(p.authors) && p.authors.length ? p.authors[0] : '',
      citation_count_display: typeof p.citation_count === 'number'
        ? p.citation_count + ' citations'
        : 'No citation data'
    }));

    return {
      total_results,
      page,
      page_size,
      publications
    };
  }

  // 21) getPublicationDetail
  getPublicationDetail(publicationId) {
    const pubs = this._getFromStorage('publications');
    return pubs.find((p) => p.id === publicationId) || null;
  }

  // 22) addPublicationToReadingList
  addPublicationToReadingList(publicationId, targetList) {
    const pubs = this._getFromStorage('publications');
    const pub = pubs.find((p) => p.id === publicationId);
    if (!pub) {
      return { reading_list: null, reading_list_item: null, success: false, message: 'Publication not found' };
    }

    let lists = this._getFromStorage('reading_lists');
    let items = this._getFromStorage('reading_list_items');
    let list = null;

    if (!targetList || !targetList.mode) {
      return { reading_list: null, reading_list_item: null, success: false, message: 'Invalid targetList mode' };
    }

    if (targetList.mode === 'new') {
      if (!targetList.new_list_name) {
        return { reading_list: null, reading_list_item: null, success: false, message: 'List name required' };
      }
      list = {
        id: this._generateId('rlist'),
        name: targetList.new_list_name,
        description: '',
        created_at: this._nowISO(),
        updated_at: this._nowISO()
      };
      lists.push(list);
    } else if (targetList.mode === 'existing') {
      if (!targetList.reading_list_id) {
        return { reading_list: null, reading_list_item: null, success: false, message: 'reading_list_id required' };
      }
      list = lists.find((l) => l.id === targetList.reading_list_id) || null;
      if (!list) {
        return { reading_list: null, reading_list_item: null, success: false, message: 'Target list not found' };
      }
      list.updated_at = this._nowISO();
    } else {
      return { reading_list: null, reading_list_item: null, success: false, message: 'Unknown mode' };
    }

    // Avoid duplicates
    let item = items.find(
      (it) => it.reading_list_id === list.id && it.publication_id === publicationId
    ) || null;

    if (!item) {
      item = {
        id: this._generateId('rli'),
        reading_list_id: list.id,
        publication_id: publicationId,
        added_at: this._nowISO(),
        notes: '',
        position: null
      };
      items.push(item);
    }

    this._saveToStorage('reading_lists', lists);
    this._saveToStorage('reading_list_items', items);

    return {
      reading_list: list,
      reading_list_item: item,
      success: true,
      message: 'Publication added to reading list'
    };
  }

  // 23) getReadingListsSummary
  getReadingListsSummary() {
    const lists = this._getFromStorage('reading_lists');
    const items = this._getFromStorage('reading_list_items');
    return lists.map((list) => {
      const count = items.filter((it) => it.reading_list_id === list.id).length;
      return {
        reading_list: list,
        item_count: count
      };
    });
  }

  // 24) createReadingList
  createReadingList(name, description) {
    if (!name) return null;
    const lists = this._getFromStorage('reading_lists');
    const now = this._nowISO();
    const list = {
      id: this._generateId('rlist'),
      name,
      description: description || '',
      created_at: now,
      updated_at: now
    };
    lists.push(list);
    this._saveToStorage('reading_lists', lists);
    return list;
  }

  // 25) renameReadingList
  renameReadingList(reading_list_id, new_name) {
    const lists = this._getFromStorage('reading_lists');
    const list = lists.find((l) => l.id === reading_list_id) || null;
    if (!list || !new_name) return null;
    list.name = new_name;
    list.updated_at = this._nowISO();
    this._saveToStorage('reading_lists', lists);
    return list;
  }

  // 26) deleteReadingList
  deleteReadingList(reading_list_id) {
    let lists = this._getFromStorage('reading_lists');
    let items = this._getFromStorage('reading_list_items');
    const beforeCount = lists.length;
    lists = lists.filter((l) => l.id !== reading_list_id);
    items = items.filter((it) => it.reading_list_id !== reading_list_id);
    this._saveToStorage('reading_lists', lists);
    this._saveToStorage('reading_list_items', items);
    return {
      success: lists.length < beforeCount
    };
  }

  // 27) getReadingListDetail
  getReadingListDetail(reading_list_id) {
    const lists = this._getFromStorage('reading_lists');
    const list = lists.find((l) => l.id === reading_list_id) || null;
    if (!list) {
      return {
        reading_list: null,
        items: []
      };
    }

    const itemsRaw = this._getFromStorage('reading_list_items');
    const pubs = this._getFromStorage('publications');

    const items = itemsRaw
      .filter((it) => it.reading_list_id === reading_list_id)
      .sort((a, b) => {
        const pa = typeof a.position === 'number' ? a.position : Number.MAX_SAFE_INTEGER;
        const pb = typeof b.position === 'number' ? b.position : Number.MAX_SAFE_INTEGER;
        if (pa !== pb) return pa - pb;
        const ta = this._parseDate(a.added_at)?.getTime() || 0;
        const tb = this._parseDate(b.added_at)?.getTime() || 0;
        return ta - tb;
      })
      .map((it) => {
        const pub = pubs.find((p) => p.id === it.publication_id) || null;
        return {
          reading_list_item: it,
          publication: pub,
          formatted_publication_year: pub ? String(pub.publication_year || '') : ''
        };
      });

    return {
      reading_list: list,
      items
    };
  }

  // 28) removePublicationFromReadingList
  removePublicationFromReadingList(reading_list_item_id) {
    let items = this._getFromStorage('reading_list_items');
    const before = items.length;
    items = items.filter((it) => it.id !== reading_list_item_id);
    this._saveToStorage('reading_list_items', items);
    return {
      success: items.length < before
    };
  }

  // 29) updateReadingListItemNotes
  updateReadingListItemNotes(reading_list_item_id, notes) {
    const items = this._getFromStorage('reading_list_items');
    const item = items.find((it) => it.id === reading_list_item_id) || null;
    if (!item) return null;
    item.notes = notes || '';
    this._saveToStorage('reading_list_items', items);
    return item;
  }

  // 30) reorderReadingListItems
  reorderReadingListItems(reading_list_id, ordered_item_ids) {
    if (!Array.isArray(ordered_item_ids)) return { success: false };
    const items = this._getFromStorage('reading_list_items');
    const idToItem = new Map();
    items.forEach((it) => {
      if (it.reading_list_id === reading_list_id) {
        idToItem.set(it.id, it);
      }
    });
    ordered_item_ids.forEach((id, index) => {
      const item = idToItem.get(id);
      if (item) {
        item.position = index;
      }
    });
    this._saveToStorage('reading_list_items', items);
    return { success: true };
  }

  // 31) getEventFilterOptions
  getEventFilterOptions() {
    const events = this._getFromStorage('events');

    const event_types = [
      'webinar',
      'workshop',
      'conference',
      'meeting',
      'training',
      'other_event'
    ].map((val) => ({ value: val, label: this._resolveEnumLabels('event_type', val) }));

    const topicsEnum = [
      'freshwater_biodiversity',
      'coastal_restoration',
      'water_quality',
      'renewable_energy',
      'climate_adaptation',
      'deforestation',
      'microplastics',
      'urban_air_quality',
      'other'
    ];

    const topics = topicsEnum.map((val) => ({ value: val, label: this._resolveEnumLabels('project_topic', val) }));

    const regionsEnum = [
      'africa',
      'south_america',
      'southeast_asia',
      'europe',
      'north_america',
      'asia',
      'oceania',
      'antarctica',
      'global',
      'multiple_regions',
      'other_region'
    ];

    const regions = regionsEnum.map((val) => ({ value: val, label: this._resolveEnumLabels('region', val) }));

    let minDate = null;
    let maxDate = null;
    events.forEach((e) => {
      const d = this._parseDate(e.start_datetime);
      if (!d) return;
      if (!minDate || d < minDate) minDate = d;
      if (!maxDate || d > maxDate) maxDate = d;
    });

    const sort_options = [
      { value: 'date_soonest_first', label: 'Date  Soonest first' },
      { value: 'relevance', label: 'Relevance' }
    ];

    return {
      event_types,
      topics,
      regions,
      date_range: {
        min_date: minDate ? minDate.toISOString().slice(0, 10) : null,
        max_date: maxDate ? maxDate.toISOString().slice(0, 10) : null
      },
      sort_options
    };
  }

  // 32) searchEvents
  searchEvents(query = '', filters = {}, sort = {}, page = 1, page_size = 20) {
    const eventsRaw = this._getFromStorage('events');
    let results = eventsRaw.filter((e) => this._matchesQuery(e, ['title', 'description'], query));

    if (filters) {
      if (filters.event_type) {
        results = results.filter((e) => e.event_type === filters.event_type);
      }
      if (filters.topic) {
        results = results.filter((e) => e.topic === filters.topic);
      }
      if (filters.region) {
        results = results.filter((e) => e.region === filters.region);
      }
      if (filters.start_date) {
        const start = this._parseDate(filters.start_date);
        if (start) {
          results = results.filter((e) => {
            const d = this._parseDate(e.start_datetime);
            return d && d >= start;
          });
        }
      }
      if (filters.end_date) {
        const end = this._parseDate(filters.end_date);
        if (end) {
          results = results.filter((e) => {
            const d = this._parseDate(e.start_datetime);
            return d && d <= end;
          });
        }
      }
    }

    const sortBy = sort.sort_by || 'date';
    const dir = (sort.sort_direction || 'asc').toLowerCase() === 'desc' ? -1 : 1;

    if (sortBy === 'date') {
      results.sort((a, b) => {
        const ta = this._parseDate(a.start_datetime)?.getTime() || 0;
        const tb = this._parseDate(b.start_datetime)?.getTime() || 0;
        return (ta - tb) * dir;
      });
    }

    const total_results = results.length;
    const startIndex = (page - 1) * page_size;
    const pageItems = results.slice(startIndex, startIndex + page_size);

    const events = pageItems.map((e) => ({
      event: e,
      formatted_start_datetime: this._formatDateTime(e.start_datetime),
      formatted_end_datetime: this._formatDateTime(e.end_datetime),
      display_region_label: this._resolveEnumLabels('region', e.region)
    }));

    return {
      total_results,
      page,
      page_size,
      events
    };
  }

  // 33) getEventDetail
  getEventDetail(event_id) {
    const events = this._getFromStorage('events');
    const event = events.find((e) => e.id === event_id) || null;
    if (!event) {
      return {
        event: null,
        formatted_start_datetime: '',
        formatted_end_datetime: '',
        display_region_label: '',
        is_registered: false,
        can_add_to_schedule: false
      };
    }

    const regs = this._getFromStorage('event_registrations');
    const relevantRegs = regs.filter((r) => r.event_id === event_id && r.registration_status !== 'cancelled');
    const is_registered = relevantRegs.length > 0;
    const can_add_to_schedule = relevantRegs.some((r) => !r.added_to_schedule);

    return {
      event,
      formatted_start_datetime: this._formatDateTime(event.start_datetime),
      formatted_end_datetime: this._formatDateTime(event.end_datetime),
      display_region_label: this._resolveEnumLabels('region', event.region),
      is_registered,
      can_add_to_schedule
    };
  }

  // 34) registerForEvent
  registerForEvent(event_id, registrant_name, registrant_email) {
    const events = this._getFromStorage('events');
    const event = events.find((e) => e.id === event_id) || null;
    if (!event) {
      return { event_registration: null, success: false, message: 'Event not found' };
    }
    if (!registrant_name || !registrant_email) {
      return { event_registration: null, success: false, message: 'Name and email are required' };
    }

    const regs = this._getFromStorage('event_registrations');
    const reg = {
      id: this._generateId('ereg'),
      event_id,
      registrant_name,
      registrant_email,
      registered_at: this._nowISO(),
      registration_status: 'confirmed',
      added_to_schedule: false
    };
    regs.push(reg);
    this._saveToStorage('event_registrations', regs);

    return {
      event_registration: reg,
      success: true,
      message: 'Registration completed'
    };
  }

  // 35) addEventToMySchedule
  addEventToMySchedule(event_id) {
    const regs = this._getFromStorage('event_registrations');
    const latest = this._getLatestEventRegistration(event_id);
    if (!latest) {
      return { event_registration: null, success: false };
    }
    const idx = regs.findIndex((r) => r.id === latest.id);
    if (idx < 0) {
      return { event_registration: null, success: false };
    }
    regs[idx].added_to_schedule = true;
    this._saveToStorage('event_registrations', regs);
    return { event_registration: regs[idx], success: true };
  }

  // 36) getMySchedule
  getMySchedule() {
    const regs = this._getFromStorage('event_registrations');
    const events = this._getFromStorage('events');

    const scheduledRegs = regs.filter((r) => r.added_to_schedule);

    return scheduledRegs.map((reg) => {
      const event = events.find((e) => e.id === reg.event_id) || null;
      return {
        event_registration: reg,
        event,
        formatted_start_datetime: event ? this._formatDateTime(event.start_datetime) : '',
        formatted_end_datetime: event ? this._formatDateTime(event.end_datetime) : ''
      };
    });
  }

  // 37) removeEventFromSchedule
  removeEventFromSchedule(event_id) {
    const regs = this._getFromStorage('event_registrations');
    let changed = false;
    regs.forEach((r) => {
      if (r.event_id === event_id && r.added_to_schedule) {
        r.added_to_schedule = false;
        changed = true;
      }
    });
    if (changed) {
      this._saveToStorage('event_registrations', regs);
    }
    return { success: changed };
  }

  // 38) exportSchedule
  exportSchedule(format) {
    if (!format) {
      return { download_url: '', success: false };
    }
    const safeFormat = String(format).toLowerCase();
    const url = '/exports/schedule.' + safeFormat;
    return { download_url: url, success: true };
  }

  // 39) getDatasetFilterOptions
  getDatasetFilterOptions() {
    const datasets = this._getFromStorage('datasets');

    const topicsEnum = [
      'freshwater_biodiversity',
      'coastal_restoration',
      'water_quality',
      'renewable_energy',
      'climate_adaptation',
      'deforestation',
      'microplastics',
      'urban_air_quality',
      'other'
    ];

    const topics = topicsEnum.map((val) => ({ value: val, label: this._resolveEnumLabels('project_topic', val) }));

    const regionsEnum = [
      'africa',
      'south_america',
      'southeast_asia',
      'europe',
      'north_america',
      'asia',
      'oceania',
      'antarctica',
      'global',
      'multiple_regions',
      'other_region'
    ];

    const regions = regionsEnum.map((val) => ({ value: val, label: this._resolveEnumLabels('region', val) }));

    const licensesEnum = ['cc_by', 'cc0', 'cc_by_sa', 'cc_by_nc', 'other_license'];
    const licenses = licensesEnum.map((val) => ({
      value: val,
      label: this._resolveEnumLabels('dataset_license', val)
    }));

    const fileFormatsEnum = ['csv', 'tsv', 'json', 'geojson', 'shapefile', 'netcdf', 'xml', 'other_format'];
    const file_formats = fileFormatsEnum.map((val) => ({
      value: val,
      label: this._resolveEnumLabels('file_format', val)
    }));

    let minDate = null;
    let maxDate = null;
    datasets.forEach((d) => {
      const dt = this._parseDate(d.last_updated);
      if (!dt) return;
      if (!minDate || dt < minDate) minDate = dt;
      if (!maxDate || dt > maxDate) maxDate = dt;
    });

    const sort_options = [
      { value: 'last_updated_newest_first', label: 'Last updated  Newest first' },
      { value: 'size_largest_first', label: 'Size  Largest first' },
      { value: 'relevance', label: 'Relevance' }
    ];

    return {
      topics,
      regions,
      licenses,
      file_formats,
      last_updated_range: {
        min_date: minDate ? minDate.toISOString().slice(0, 10) : null,
        max_date: maxDate ? maxDate.toISOString().slice(0, 10) : null
      },
      sort_options
    };
  }

  // 40) searchDatasets
  searchDatasets(query = '', filters = {}, sort = {}, page = 1, page_size = 20) {
    const datasetsRaw = this._getFromStorage('datasets');
    let results = datasetsRaw.filter((d) =>
      this._matchesQuery(d, ['title', 'description', 'topic', 'region'], query)
    );

    if (filters) {
      if (filters.topic) {
        results = results.filter((d) => d.topic === filters.topic);
      }
      if (filters.region) {
        results = results.filter((d) => d.region === filters.region);
      }
      if (filters.license && Array.isArray(filters.license) && filters.license.length) {
        const set = new Set(filters.license);
        results = results.filter((d) => set.has(d.license));
      }
      if (filters.file_format) {
        results = results.filter((d) => {
          const primary = d.primary_format || null;
          const arr = Array.isArray(d.file_formats) ? d.file_formats : [];
          return primary === filters.file_format || arr.includes(filters.file_format);
        });
      }
      if (filters.last_updated_min) {
        const min = this._parseDate(filters.last_updated_min);
        if (min) {
          results = results.filter((d) => {
            const dt = this._parseDate(d.last_updated);
            return dt && dt >= min;
          });
        }
      }
      if (filters.last_updated_max) {
        const max = this._parseDate(filters.last_updated_max);
        if (max) {
          results = results.filter((d) => {
            const dt = this._parseDate(d.last_updated);
            return dt && dt <= max;
          });
        }
      }
    }

    const sortBy = sort.sort_by || 'last_updated';
    const dir = (sort.sort_direction || 'desc').toLowerCase() === 'asc' ? 1 : -1;

    if (sortBy === 'last_updated') {
      results.sort((a, b) => {
        const ta = this._parseDate(a.last_updated)?.getTime() || 0;
        const tb = this._parseDate(b.last_updated)?.getTime() || 0;
        return (ta - tb) * dir;
      });
    } else if (sortBy === 'size') {
      results.sort((a, b) => {
        const sa = a.size_mb || 0;
        const sb = b.size_mb || 0;
        return (sa - sb) * dir;
      });
    }

    const total_results = results.length;
    const startIndex = (page - 1) * page_size;
    const pageItems = results.slice(startIndex, startIndex + page_size);

    const datasets = pageItems.map((d) => ({
      dataset: d,
      display_region_label: this._resolveEnumLabels('region', d.region),
      license_label: this._resolveEnumLabels('dataset_license', d.license),
      primary_format_label: this._resolveEnumLabels('file_format', d.primary_format || (Array.isArray(d.file_formats) ? d.file_formats[0] : '')),
      last_updated_display: this._formatDate(d.last_updated)
    }));

    return {
      total_results,
      page,
      page_size,
      datasets
    };
  }

  // 41) getDatasetDetail
  getDatasetDetail(dataset_id) {
    const datasets = this._getFromStorage('datasets');
    return datasets.find((d) => d.id === dataset_id) || null;
  }

  // 42) addDatasetToDownloadQueue
  addDatasetToDownloadQueue(dataset_id) {
    const datasets = this._getFromStorage('datasets');
    const dataset = datasets.find((d) => d.id === dataset_id) || null;
    if (!dataset) {
      return { download_queue: null, download_queue_item: null, total_items: 0, success: false };
    }

    const queue = this._getOrCreateDownloadQueue();
    const items = this._getFromStorage('download_queue_items');

    let item = items.find(
      (it) => it.download_queue_id === queue.id && it.dataset_id === dataset_id
    ) || null;

    if (!item) {
      item = {
        id: this._generateId('dqi'),
        download_queue_id: queue.id,
        dataset_id,
        added_at: this._nowISO()
      };
      items.push(item);
      queue.updated_at = this._nowISO();
      const queues = this._getFromStorage('download_queue');
      const idx = queues.findIndex((q) => q.id === queue.id);
      if (idx >= 0) {
        queues[idx] = queue;
        this._saveToStorage('download_queue', queues);
      }
    }

    this._saveToStorage('download_queue_items', items);

    const total_items = items.filter((it) => it.download_queue_id === queue.id).length;

    return {
      download_queue: queue,
      download_queue_item: item,
      total_items,
      success: true
    };
  }

  // 43) getDownloadQueueDetail
  getDownloadQueueDetail() {
    const queue = this._getOrCreateDownloadQueue();
    const itemsRaw = this._getFromStorage('download_queue_items');
    const datasets = this._getFromStorage('datasets');

    const items = itemsRaw
      .filter((it) => it.download_queue_id === queue.id)
      .map((it) => {
        const dataset = datasets.find((d) => d.id === it.dataset_id) || null;
        return {
          download_queue_item: it,
          dataset,
          display_region_label: dataset ? this._resolveEnumLabels('region', dataset.region) : '',
          license_label: dataset ? this._resolveEnumLabels('dataset_license', dataset.license) : '',
          primary_format_label: dataset
            ? this._resolveEnumLabels('file_format', dataset.primary_format || (Array.isArray(dataset.file_formats) ? dataset.file_formats[0] : ''))
            : '',
          size_display: dataset && typeof dataset.size_mb === 'number'
            ? dataset.size_mb.toFixed(1) + ' MB'
            : 'Unknown size'
        };
      });

    return {
      download_queue: queue,
      items
    };
  }

  // 44) getDownloadQueueSummary
  getDownloadQueueSummary() {
    const queue = this._getOrCreateDownloadQueue();
    const items = this._getFromStorage('download_queue_items');
    const total_items = items.filter((it) => it.download_queue_id === queue.id).length;
    return {
      download_queue: queue,
      total_items
    };
  }

  // 45) removeDatasetFromDownloadQueue
  removeDatasetFromDownloadQueue(download_queue_item_id) {
    let items = this._getFromStorage('download_queue_items');
    const before = items.length;
    items = items.filter((it) => it.id !== download_queue_item_id);
    this._saveToStorage('download_queue_items', items);
    return {
      total_items: items.length,
      success: items.length < before
    };
  }

  // 46) downloadQueueAsZip
  downloadQueueAsZip() {
    const queue = this._getOrCreateDownloadQueue();
    const items = this._getFromStorage('download_queue_items').filter(
      (it) => it.download_queue_id === queue.id
    );
    const file_count = items.length;
    if (!file_count) {
      return { download_url: '', file_count: 0, success: false, message: 'Download queue is empty' };
    }
    // Simulate combined ZIP preparation by returning a URL-like string
    const url = '/downloads/datasets_queue_' + queue.id + '.zip';

    // Instrumentation for task completion tracking
    try {
      if (file_count >= 2) {
        localStorage.setItem(
          'task5_zipDownload',
          JSON.stringify({
            prepared: true,
            file_count: file_count,
            dataset_ids: items.map((it) => it.dataset_id)
          })
        );
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      download_url: url,
      file_count,
      success: true,
      message: 'ZIP download prepared'
    };
  }

  // 47) getNotesSummary
  getNotesSummary() {
    const notes = this._getFromStorage('notes');
    const projects = this._getFromStorage('projects');
    return notes.map((note) => {
      const project = note.related_project_id
        ? projects.find((p) => p.id === note.related_project_id) || null
        : null;
      return {
        note,
        related_project_title: project ? project.title : ''
      };
    });
  }

  // 48) getNoteDetail
  getNoteDetail(note_id) {
    const notes = this._getFromStorage('notes');
    return notes.find((n) => n.id === note_id) || null;
  }

  // 49) createNote
  createNote(title, body, related_project_id, related_pi_name, related_pi_email) {
    if (!title || !body) return null;
    const notes = this._getFromStorage('notes');
    const now = this._nowISO();
    const note = {
      id: this._generateId('note'),
      title,
      body,
      related_project_id: related_project_id || null,
      related_pi_name: related_pi_name || '',
      related_pi_email: related_pi_email || '',
      created_at: now,
      updated_at: now
    };
    notes.push(note);
    this._saveToStorage('notes', notes);
    return note;
  }

  // 50) updateNote
  updateNote(note_id, title, body) {
    const notes = this._getFromStorage('notes');
    const note = notes.find((n) => n.id === note_id) || null;
    if (!note) return null;
    if (typeof title === 'string') note.title = title;
    if (typeof body === 'string') note.body = body;
    note.updated_at = this._nowISO();
    this._saveToStorage('notes', notes);
    return note;
  }

  // 51) deleteNote
  deleteNote(note_id) {
    let notes = this._getFromStorage('notes');
    const before = notes.length;
    notes = notes.filter((n) => n.id !== note_id);
    this._saveToStorage('notes', notes);
    return {
      success: notes.length < before
    };
  }

  // 52) getBriefingsSummary
  getBriefingsSummary() {
    const briefings = this._getFromStorage('briefings');
    const projects = this._getFromStorage('projects');
    return briefings.map((b) => {
      const project = projects.find((p) => p.id === b.project_id) || null;
      return {
        briefing: b,
        project_title: project ? project.title : ''
      };
    });
  }

  // 53) getBriefingDetail
  getBriefingDetail(briefing_id) {
    const briefings = this._getFromStorage('briefings');
    return briefings.find((b) => b.id === briefing_id) || null;
  }

  // 54) updateBriefingSections
  updateBriefingSections(briefing_id, included_sections) {
    if (!Array.isArray(included_sections)) return null;
    const briefings = this._getFromStorage('briefings');
    const briefing = briefings.find((b) => b.id === briefing_id) || null;
    if (!briefing) return null;
    briefing.included_sections = included_sections.slice();
    briefing.updated_at = this._nowISO();
    this._saveToStorage('briefings', briefings);
    return briefing;
  }

  // 55) updateBriefingNotes
  updateBriefingNotes(briefing_id, additional_notes) {
    const briefings = this._getFromStorage('briefings');
    const briefing = briefings.find((b) => b.id === briefing_id) || null;
    if (!briefing) return null;
    briefing.additional_notes = additional_notes || '';
    briefing.updated_at = this._nowISO();
    this._saveToStorage('briefings', briefings);
    return briefing;
  }

  // 56) exportBriefing
  exportBriefing(briefing_id, format) {
    if (!format) return { download_url: '', success: false };
    const url = '/exports/briefings/' + briefing_id + '.' + String(format).toLowerCase();
    return {
      download_url: url,
      success: true
    };
  }

  // 57) getAboutContent
  getAboutContent() {
    return {
      mission_markdown:
        'Our mission is to make environmental research projects, data, and evidence easier to discover and use for decision making.',
      scope_markdown:
        'This catalog covers projects, publications, datasets, and events related to topics such as freshwater biodiversity, climate adaptation, renewable energy, deforestation, and air quality.',
      data_sources_markdown:
        'Content is aggregated from participating research institutions, open data portals, and project partners. Project teams can update their records directly.',
      funder_information_markdown:
        'The platform is supported by a consortium of research funders and philanthropic organizations committed to open environmental knowledge.'
    };
  }

  // 58) getHelpContent
  getHelpContent() {
    return {
      task_guides_markdown:
        '## How to use this site\n\nUse the Projects, Publications, Datasets, and Events sections to explore content. Sidebar filters help you focus on specific regions, years, topics, or formats. You can save projects and publications into lists, queue datasets for download, register for events, and create project briefings.',
      troubleshooting_markdown:
        'If filters return no results, try simplifying your search terms or clearing some filters. Ensure your browser allows local storage so that lists, notes, and schedules can be saved.',
      support_contact_email: 'support@example.org'
    };
  }

  // 59) getPolicyDocuments
  getPolicyDocuments() {
    return {
      privacy_policy_markdown:
        'We store only the minimum data required for browsing and personal organization features. Any email addresses you enter for subscriptions or event registrations are stored locally for demonstration purposes.',
      terms_of_use_markdown:
        'By using this site, you agree to use the information responsibly and to respect any license terms attached to datasets and publications.',
      data_protection_contact_email: 'dataprotection@example.org'
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