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

  // -------------------- STORAGE HELPERS --------------------

  _initStorage() {
    const keys = [
      'pages',
      'navigation_links',
      'profiles',
      'project_categories',
      'projects',
      'project_comparisons',
      'skill_categories',
      'skills',
      'skill_shortlists',
      'blog_tags',
      'blog_posts',
      'reading_lists',
      'experience_roles',
      'recruiter_evaluations',
      'resume_configurations',
      'contact_messages',
      'newsletter_topics',
      'newsletter_subscriptions'
    ];

    for (const key of keys) {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key) {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    try {
      return JSON.parse(raw);
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
    if (isNaN(d.getTime())) return null;
    return d;
  }

  _compareDatesDesc(a, b) {
    const da = this._parseDate(a);
    const db = this._parseDate(b);
    const ta = da ? da.getTime() : 0;
    const tb = db ? db.getTime() : 0;
    return tb - ta;
  }

  _compareDatesAsc(a, b) {
    const da = this._parseDate(a);
    const db = this._parseDate(b);
    const ta = da ? da.getTime() : 0;
    const tb = db ? db.getTime() : 0;
    return ta - tb;
  }

  _findById(list, id) {
    return list.find(function (item) { return item && item.id === id; }) || null;
  }

  _unique(array) {
    const seen = new Set();
    const result = [];
    for (const v of array) {
      if (v == null) continue;
      if (!seen.has(v)) {
        seen.add(v);
        result.push(v);
      }
    }
    return result;
  }

  _caseInsensitiveIncludes(haystack, needle) {
    if (!haystack || !needle) return false;
    return haystack.toLowerCase().indexOf(needle.toLowerCase()) !== -1;
  }

  // -------------------- PRIVATE HELPERS (SPECIFIED) --------------------

  _getOrCreateProjectComparisonSelection() {
    const key = 'project_comparisons';
    let selections = this._getFromStorage(key);
    let selection = selections.find(function (s) { return s && s.is_active; });

    if (!selection) {
      selection = {
        id: this._generateId('projcmp'),
        project_ids: [],
        created_at: this._nowISO(),
        updated_at: this._nowISO(),
        is_active: true
      };
      selections.push(selection);
      this._saveToStorage(key, selections);
    }

    return selection;
  }

  _getOrCreateSkillShortlist() {
    const key = 'skill_shortlists';
    let lists = this._getFromStorage(key);
    let shortlist = lists[0] || null;

    if (!shortlist) {
      shortlist = {
        id: this._generateId('skillsl'),
        skill_ids: [],
        created_at: this._nowISO(),
        updated_at: this._nowISO()
      };
      lists.push(shortlist);
      this._saveToStorage(key, lists);
    }

    return shortlist;
  }

  _getOrCreateReadingList() {
    const key = 'reading_lists';
    let lists = this._getFromStorage(key);
    let readingList = lists[0] || null;

    if (!readingList) {
      readingList = {
        id: this._generateId('readlst'),
        blog_post_ids: [],
        created_at: this._nowISO(),
        updated_at: this._nowISO()
      };
      lists.push(readingList);
      this._saveToStorage(key, lists);
    }

    return readingList;
  }

  _getOrCreateRecruiterEvaluation() {
    const key = 'recruiter_evaluations';
    let list = this._getFromStorage(key);
    let evaluation = list[0] || null;

    if (!evaluation) {
      evaluation = {
        id: this._generateId('reval'),
        most_relevant_project: null,
        most_relevant_project_id: null,
        earliest_devops_sre_year: null,
        notes: null,
        updated_at: this._nowISO()
      };
      list.push(evaluation);
      this._saveToStorage(key, list);
    }

    return evaluation;
  }

  _getOrCreateResumeConfiguration() {
    const key = 'resume_configurations';
    let list = this._getFromStorage(key);
    let config = list[0] || null;

    if (!config) {
      config = {
        id: this._generateId('rescfg'),
        target_role: null,
        location: null,
        experience_timeframe: 'all',
        focus_skills: [],
        remote_preference: null,
        include_projects: true,
        include_skills: true,
        include_education: true,
        include_certifications: true,
        generated_at: null,
        last_viewed_at: null
      };
      list.push(config);
      this._saveToStorage(key, list);
    }

    return config;
  }

  _extractContactMessageMetadata(message) {
    const result = {
      related_project_ids: [],
      preferred_interview_date: null
    };

    if (!message || typeof message !== 'string') {
      return result;
    }

    // Infer related projects by exact title substring match
    const projects = this._getFromStorage('projects');
    const relatedIds = [];
    for (const p of projects) {
      if (!p || !p.title) continue;
      if (message.indexOf(p.title) !== -1) {
        relatedIds.push(p.id);
      }
    }
    result.related_project_ids = this._unique(relatedIds);

    // Try to parse a date from the message
    let date = null;

    // Pattern like: on 15 August 2024 or 15 August 2024
    const monthNames = 'january february march april may june july august september october november december'.split(' ');
    const monthPattern = '(?:' + monthNames.join('|') + ')';
    const regex1 = new RegExp('(on\\s+)?(\\d{1,2}\\s+' + monthPattern + '\\s+\\d{4})', 'i');
    const m1 = message.match(regex1);
    if (m1 && m1[2]) {
      const d = new Date(m1[2]);
      if (!isNaN(d.getTime())) {
        date = d;
      }
    }

    // ISO-like 2024-08-15
    if (!date) {
      const m2 = message.match(/(20\\d{2}-\\d{2}-\\d{2})/);
      if (m2 && m2[1]) {
        const d = new Date(m2[1]);
        if (!isNaN(d.getTime())) {
          date = d;
        }
      }
    }

    // US/European 15/08/2024 or 08/15/2024 (treat as day/month/year)
    if (!date) {
      const regex3 = new RegExp('(\\d{1,2})\\/(\\d{1,2})\\/(\\d{4})');
      const m3 = message.match(regex3);
      if (m3) {
        const day = parseInt(m3[1], 10);
        const month = parseInt(m3[2], 10) - 1;
        const year = parseInt(m3[3], 10);
        const d = new Date(year, month, day);
        if (!isNaN(d.getTime())) {
          date = d;
        }
      }
    }

    result.preferred_interview_date = date ? date.toISOString() : null;

    return result;
  }

  // -------------------- HOME OVERVIEW --------------------

  // getHomeOverview()
  getHomeOverview() {
    const profiles = this._getFromStorage('profiles');
    const profile = profiles[0] || null;

    const projects = this._getFromStorage('projects');
    const categories = this._getFromStorage('project_categories');
    const blogPosts = this._getFromStorage('blog_posts');
    const blogTags = this._getFromStorage('blog_tags');

    const featuredProjectsRaw = projects.filter(function (p) { return p && p.is_featured; });
    // Sort featured by last_updated desc as a heuristic for recency
    featuredProjectsRaw.sort((a, b) => {
      const aDate = a.last_updated || a.start_date || a.created_at;
      const bDate = b.last_updated || b.start_date || b.created_at;
      return this._compareDatesDesc(aDate, bDate);
    });

    const featured_projects = featuredProjectsRaw.map(function (p) {
      const category = categories.find(function (c) { return c && c.id === p.category_id; }) || null;
      const lastUpdated = p.last_updated || p.start_date || p.created_at;
      const isRecent = (function () {
        if (!lastUpdated) return false;
        const d = new Date(lastUpdated);
        if (isNaN(d.getTime())) return false;
        const now = new Date();
        const diffMs = now.getTime() - d.getTime();
        const diffDays = diffMs / (1000 * 60 * 60 * 24);
        return diffDays <= 180; // within ~6 months
      })();
      // Foreign key resolution on project itself
      const projectWithCategory = Object.assign({}, p, {
        category: category || null
      });
      return {
        project: projectWithCategory,
        category_name: category ? category.name : null,
        category_slug: category ? category.slug : null,
        is_recent: isRecent
      };
    });

    // Recent blog posts: published and newest first
    const publishedPosts = blogPosts.filter(function (p) { return p && (p.is_published === undefined || p.is_published === true); });
    publishedPosts.sort((a, b) => this._compareDatesDesc(a.published_at, b.published_at));

    const recent_blog_posts = publishedPosts.slice(0, 5).map(function (post) {
      const primaryTag = post.primary_tag_slug ? blogTags.find(function (t) { return t && t.slug === post.primary_tag_slug; }) : null;
      const tagNames = (post.tag_slugs || []).map(function (slug) {
        const t = blogTags.find(function (bt) { return bt && bt.slug === slug; });
        return t ? t.name : slug;
      });
      return {
        post: post,
        primary_tag_name: primaryTag ? primaryTag.name : null,
        tag_names: tagNames
      };
    });

    const primary_specializations = profile && Array.isArray(profile.primary_specializations)
      ? profile.primary_specializations
      : [];

    const value_proposition = profile && profile.headline
      ? profile.headline
      : (profile && profile.summary ? profile.summary : '');

    return {
      profile: profile,
      primary_specializations: primary_specializations,
      value_proposition: value_proposition,
      featured_projects: featured_projects,
      recent_blog_posts: recent_blog_posts
    };
  }

  // -------------------- PROJECTS --------------------

  // getProjectFilterOptions()
  getProjectFilterOptions() {
    const projects = this._getFromStorage('projects');
    const categories = this._getFromStorage('project_categories');

    const technologies = this._unique(
      projects.reduce(function (acc, p) {
        if (Array.isArray(p.technologies)) {
          return acc.concat(p.technologies);
        }
        return acc;
      }, [])
    );

    const tags = this._unique(
      projects.reduce(function (acc, p) {
        if (Array.isArray(p.tags)) {
          return acc.concat(p.tags);
        }
        return acc;
      }, [])
    );

    const languageLabelMap = {
      go: 'Go',
      node_js: 'Node.js',
      python: 'Python',
      typescript: 'TypeScript',
      javascript: 'JavaScript',
      java: 'Java',
      csharp: 'C#',
      ruby: 'Ruby',
      php: 'PHP',
      rust: 'Rust',
      other: 'Other'
    };

    const allLanguageKeys = this._unique(
      projects.reduce(function (acc, p) {
        if (p.primary_backend_language) acc.push(p.primary_backend_language);
        if (Array.isArray(p.languages)) acc = acc.concat(p.languages);
        return acc;
      }, [])
    );

    const languages = allLanguageKeys.map(function (key) {
      return {
        key: key,
        label: languageLabelMap[key] || key
      };
    });

    const cloudProviderLabelMap = {
      aws: 'AWS',
      gcp: 'GCP',
      azure: 'Azure',
      on_premises: 'On-premises',
      multi_cloud: 'Multi-cloud',
      other: 'Other'
    };
    const allCloudProviderKeys = this._unique(
      projects.reduce(function (acc, p) {
        if (p.cloud_provider) acc.push(p.cloud_provider);
        return acc;
      }, [])
    );

    const cloud_providers = allCloudProviderKeys.map(function (key) {
      return {
        key: key,
        label: cloudProviderLabelMap[key] || key
      };
    });

    const environmentLabelMap = {
      production: 'Production',
      staging: 'Staging',
      development: 'Development',
      test: 'Test',
      sandbox: 'Sandbox',
      other: 'Other'
    };

    const allEnvironmentKeys = this._unique(
      projects.reduce(function (acc, p) {
        if (p.environment) acc.push(p.environment);
        return acc;
      }, [])
    );

    const environments = allEnvironmentKeys.map(function (key) {
      return {
        key: key,
        label: environmentLabelMap[key] || key
      };
    });

    const sort_options = [
      {
        key: 'last_updated_desc',
        label: 'Last updated (Newest first)',
        description: 'Sort projects by last updated date, newest first.'
      },
      {
        key: 'start_date_desc',
        label: 'Start date (Newest first)',
        description: 'Sort projects by start date, newest first.'
      },
      {
        key: 'start_date_asc',
        label: 'Start date (Oldest first)',
        description: 'Sort projects by start date, oldest first.'
      },
      {
        key: 'relevance',
        label: 'Relevance',
        description: 'Sort projects by relevance to your search.'
      }
    ];

    return {
      categories: categories,
      technologies: technologies,
      tags: tags,
      languages: languages,
      cloud_providers: cloud_providers,
      environments: environments,
      sort_options: sort_options
    };
  }

  // searchProjects(query, categoryIds, technologies, tags, languageKeys, cloudProviders, environments, usesKubernetes, usesTerraform, usesAws, hasCiCd, isMicroservices, sortBy, page, pageSize)
  searchProjects(
    query,
    categoryIds,
    technologies,
    tags,
    languageKeys,
    cloudProviders,
    environments,
    usesKubernetes,
    usesTerraform,
    usesAws,
    hasCiCd,
    isMicroservices,
    sortBy,
    page,
    pageSize
  ) {
    const projects = this._getFromStorage('projects');
    const categories = this._getFromStorage('project_categories');
    const comparisonSelection = this._getOrCreateProjectComparisonSelection();
    const selectedComparisonIds = Array.isArray(comparisonSelection.project_ids) ? comparisonSelection.project_ids : [];

    const q = query && typeof query === 'string' ? query.trim().toLowerCase() : '';
    const catIdSet = Array.isArray(categoryIds) ? new Set(categoryIds) : null;
    const techList = Array.isArray(technologies) ? technologies : null;
    const tagList = Array.isArray(tags) ? tags : null;
    const langSet = Array.isArray(languageKeys) ? new Set(languageKeys) : null;
    const cpSet = Array.isArray(cloudProviders) ? new Set(cloudProviders) : null;
    const envSet = Array.isArray(environments) ? new Set(environments) : null;

    let filtered = projects.filter(function (p) { return !!p; });

    if (q) {
      filtered = filtered.filter(function (p) {
        const text = [p.title, p.summary, p.description].filter(Boolean).join(' ').toLowerCase();
        const tagsText = Array.isArray(p.tags) ? p.tags.join(' ').toLowerCase() : '';
        const techText = Array.isArray(p.technologies) ? p.technologies.join(' ').toLowerCase() : '';
        return text.indexOf(q) !== -1 || tagsText.indexOf(q) !== -1 || techText.indexOf(q) !== -1;
      });
    }

    if (catIdSet && catIdSet.size > 0) {
      filtered = filtered.filter(function (p) { return p.category_id && catIdSet.has(p.category_id); });
    }

    if (techList && techList.length > 0) {
      filtered = filtered.filter(function (p) {
        const pTechs = Array.isArray(p.technologies) ? p.technologies : [];
        // Require all requested technologies to be present
        return techList.every(function (t) { return pTechs.indexOf(t) !== -1; });
      });
    }

    if (tagList && tagList.length > 0) {
      filtered = filtered.filter(function (p) {
        const pTags = Array.isArray(p.tags) ? p.tags : [];
        return tagList.every(function (t) { return pTags.indexOf(t) !== -1; });
      });
    }

    if (langSet && langSet.size > 0) {
      filtered = filtered.filter(function (p) {
        if (p.primary_backend_language && langSet.has(p.primary_backend_language)) return true;
        if (Array.isArray(p.languages)) {
          return p.languages.some(function (l) { return langSet.has(l); });
        }
        return false;
      });
    }

    if (cpSet && cpSet.size > 0) {
      filtered = filtered.filter(function (p) { return p.cloud_provider && cpSet.has(p.cloud_provider); });
    }

    if (envSet && envSet.size > 0) {
      filtered = filtered.filter(function (p) { return p.environment && envSet.has(p.environment); });
    }

    if (usesKubernetes === true) {
      filtered = filtered.filter(function (p) { return !!p.uses_kubernetes; });
    }

    if (usesTerraform === true) {
      filtered = filtered.filter(function (p) { return !!p.uses_terraform; });
    }

    if (usesAws === true) {
      filtered = filtered.filter(function (p) {
        return !!p.uses_aws || p.cloud_provider === 'aws' || p.cloud_provider === 'multi_cloud';
      });
    }

    if (hasCiCd === true) {
      filtered = filtered.filter(function (p) { return !!p.has_ci_cd; });
    }

    if (isMicroservices === true) {
      filtered = filtered.filter(function (p) { return !!p.is_microservices; });
    }

    const sortKey = sortBy || 'last_updated_desc';
    if (sortKey === 'last_updated_desc') {
      filtered.sort((a, b) => {
        const aDate = a.last_updated || a.start_date || a.created_at;
        const bDate = b.last_updated || b.start_date || b.created_at;
        return this._compareDatesDesc(aDate, bDate);
      });
    } else if (sortKey === 'start_date_desc') {
      filtered.sort((a, b) => this._compareDatesDesc(a.start_date, b.start_date));
    } else if (sortKey === 'start_date_asc') {
      filtered.sort((a, b) => this._compareDatesAsc(a.start_date, b.start_date));
    } else if (sortKey === 'relevance') {
      // For now, use last_updated_desc as a proxy for relevance
      filtered.sort((a, b) => {
        const aDate = a.last_updated || a.start_date || a.created_at;
        const bDate = b.last_updated || b.start_date || b.created_at;
        return this._compareDatesDesc(aDate, bDate);
      }.bind(this));
    }

    const total_count = filtered.length;
    const pg = page && page > 0 ? page : 1;
    const ps = pageSize && pageSize > 0 ? pageSize : 20;
    const start = (pg - 1) * ps;
    const end = start + ps;
    const pageItems = filtered.slice(start, end);

    const projectsResult = pageItems.map(function (p) {
      const category = categories.find(function (c) { return c && c.id === p.category_id; }) || null;
      const isInComparison = selectedComparisonIds.indexOf(p.id) !== -1;
      const projectWithCategory = Object.assign({}, p, {
        category: category || null
      });
      return {
        project: projectWithCategory,
        category_name: category ? category.name : null,
        category_slug: category ? category.slug : null,
        is_in_comparison: isInComparison
      };
    });

    return {
      projects: projectsResult,
      total_count: total_count,
      page: pg,
      page_size: ps
    };
  }

  // getProjectDetails(projectId)
  getProjectDetails(projectId) {
    const projects = this._getFromStorage('projects');
    const categories = this._getFromStorage('project_categories');
    const comparisonSelection = this._getOrCreateProjectComparisonSelection();
    const selectedComparisonIds = Array.isArray(comparisonSelection.project_ids) ? comparisonSelection.project_ids : [];

    const project = projects.find(function (p) { return p && p.id === projectId; }) || null;
    const category = project ? categories.find(function (c) { return c && c.id === project.category_id; }) || null : null;
    const isInComparison = project ? (selectedComparisonIds.indexOf(project.id) !== -1) : false;

    // Related projects: same category, different id, pick up to 3
    let related_projects = [];
    if (project && project.category_id) {
      related_projects = projects.filter(function (p) {
        return p && p.id !== project.id && p.category_id === project.category_id;
      }).slice(0, 3);
    }

    const projectWithCategory = project ? Object.assign({}, project, { category: category || null }) : null;

    return {
      project: projectWithCategory,
      category: category,
      is_in_comparison: isInComparison,
      related_projects: related_projects
    };
  }

  // addProjectToComparison(projectId)
  addProjectToComparison(projectId) {
    const projects = this._getFromStorage('projects');
    const project = projects.find(function (p) { return p && p.id === projectId; }) || null;
    if (!project) {
      return {
        success: false,
        message: 'Project not found',
        comparison: null,
        selected_projects: []
      };
    }

    const key = 'project_comparisons';
    let selections = this._getFromStorage(key);
    let selection = selections.find(function (s) { return s && s.is_active; });

    if (!selection) {
      selection = this._getOrCreateProjectComparisonSelection();
      selections = this._getFromStorage(key); // reload after creation
    }

    if (!Array.isArray(selection.project_ids)) {
      selection.project_ids = [];
    }

    if (selection.project_ids.indexOf(projectId) === -1) {
      selection.project_ids.push(projectId);
      selection.updated_at = this._nowISO();
    }

    // Persist updated selection
    selections = selections.map(function (s) {
      return s.id === selection.id ? selection : s;
    });
    this._saveToStorage(key, selections);

    const selected_projects = selection.project_ids
      .map(function (id) { return projects.find(function (p) { return p && p.id === id; }) || null; })
      .filter(function (p) { return !!p; });

    // Foreign key resolution for project_ids
    const selectionWithProjects = Object.assign({}, selection, {
      projects: selected_projects
    });

    return {
      success: true,
      message: 'Project added to comparison',
      comparison: selectionWithProjects,
      selected_projects: selected_projects
    };
  }

  // removeProjectFromComparison(projectId)
  removeProjectFromComparison(projectId) {
    const projects = this._getFromStorage('projects');
    const key = 'project_comparisons';
    let selections = this._getFromStorage(key);
    let selection = selections.find(function (s) { return s && s.is_active; });

    if (!selection || !Array.isArray(selection.project_ids)) {
      return {
        success: false,
        message: 'No active comparison selection',
        comparison: null,
        selected_projects: []
      };
    }

    const idx = selection.project_ids.indexOf(projectId);
    if (idx !== -1) {
      selection.project_ids.splice(idx, 1);
      selection.updated_at = this._nowISO();
    }

    selections = selections.map(function (s) {
      return s.id === selection.id ? selection : s;
    });
    this._saveToStorage(key, selections);

    const selected_projects = selection.project_ids
      .map(function (id) { return projects.find(function (p) { return p && p.id === id; }) || null; })
      .filter(function (p) { return !!p; });

    const selectionWithProjects = Object.assign({}, selection, {
      projects: selected_projects
    });

    return {
      success: true,
      message: 'Project removed from comparison',
      comparison: selectionWithProjects,
      selected_projects: selected_projects
    };
  }

  // getProjectComparisonSelection()
  getProjectComparisonSelection() {
    const projects = this._getFromStorage('projects');
    const selection = this._getOrCreateProjectComparisonSelection();
    const selected_projects = (selection.project_ids || [])
      .map(function (id) { return projects.find(function (p) { return p && p.id === id; }) || null; })
      .filter(function (p) { return !!p; });

    const selectionWithProjects = Object.assign({}, selection, {
      projects: selected_projects
    });

    return {
      selection: selectionWithProjects,
      selected_projects: selected_projects
    };
  }

  // getProjectComparisonView()
  getProjectComparisonView() {
    const projects = this._getFromStorage('projects');
    const categories = this._getFromStorage('project_categories');
    const selectionInfo = this.getProjectComparisonSelection();
    const selected_projects = selectionInfo.selected_projects;

    const cloudProviderLabelMap = {
      aws: 'AWS',
      gcp: 'GCP',
      azure: 'Azure',
      on_premises: 'On-premises',
      multi_cloud: 'Multi-cloud',
      other: 'Other'
    };

    const environmentLabelMap = {
      production: 'Production',
      staging: 'Staging',
      development: 'Development',
      test: 'Test',
      sandbox: 'Sandbox',
      other: 'Other'
    };

    const detailedProjects = selected_projects.map(function (p) {
      const category = categories.find(function (c) { return c && c.id === p.category_id; }) || null;
      const isTerraformAwsProd = !!p.uses_terraform &&
        (!!p.uses_aws || p.cloud_provider === 'aws' || p.cloud_provider === 'multi_cloud') &&
        p.environment === 'production';
      const projectWithCategory = Object.assign({}, p, { category: category || null });
      return {
        project: projectWithCategory,
        category: category,
        environment_label: environmentLabelMap[p.environment] || p.environment || null,
        cloud_provider_label: cloudProviderLabelMap[p.cloud_provider] || p.cloud_provider || null,
        technologies: Array.isArray(p.technologies) ? p.technologies : [],
        is_terraform_on_aws_production: isTerraformAwsProd
      };
    });

    // For now, sort_by is start_date_desc, matching the task scenario
    return {
      projects: detailedProjects,
      sort_by: 'start_date_desc'
    };
  }

  // -------------------- SKILLS --------------------

  // getSkillFilterOptions()
  getSkillFilterOptions() {
    const categories = this._getFromStorage('skill_categories');

    const platformProviderLabelMap = {
      aws: 'AWS',
      gcp: 'GCP',
      azure: 'Azure',
      kubernetes: 'Kubernetes',
      linux: 'Linux',
      docker: 'Docker',
      terraform: 'Terraform',
      monitoring: 'Monitoring',
      ci_cd: 'CI/CD',
      programming_language: 'Programming Language',
      other: 'Other'
    };

    const platform_providers = Object.keys(platformProviderLabelMap).map(function (key) {
      return {
        key: key,
        label: platformProviderLabelMap[key]
      };
    });

    const proficiency_range = {
      min: 1,
      max: 5,
      step: 1,
      default_min: 1,
      default_max: 5
    };

    return {
      categories: categories,
      platform_providers: platform_providers,
      proficiency_range: proficiency_range
    };
  }

  // searchSkills(categoryIds, platformProviders, minProficiency, maxProficiency, query)
  searchSkills(categoryIds, platformProviders, minProficiency, maxProficiency, query) {
    const skills = this._getFromStorage('skills');
    const categories = this._getFromStorage('skill_categories');
    const shortlist = this._getOrCreateSkillShortlist();
    const shortlistedIds = Array.isArray(shortlist.skill_ids) ? shortlist.skill_ids : [];

    const catIdSet = Array.isArray(categoryIds) ? new Set(categoryIds) : null;
    const ppSet = Array.isArray(platformProviders) ? new Set(platformProviders) : null;
    const minP = typeof minProficiency === 'number' ? minProficiency : null;
    const maxP = typeof maxProficiency === 'number' ? maxProficiency : null;
    const q = query && typeof query === 'string' ? query.trim().toLowerCase() : '';

    const platformProviderLabelMap = {
      aws: 'AWS',
      gcp: 'GCP',
      azure: 'Azure',
      kubernetes: 'Kubernetes',
      linux: 'Linux',
      docker: 'Docker',
      terraform: 'Terraform',
      monitoring: 'Monitoring',
      ci_cd: 'CI/CD',
      programming_language: 'Programming Language',
      other: 'Other'
    };

    let filtered = skills.filter(function (s) { return !!s; });

    if (catIdSet && catIdSet.size > 0) {
      filtered = filtered.filter(function (s) { return s.category_id && catIdSet.has(s.category_id); });
    }

    if (ppSet && ppSet.size > 0) {
      filtered = filtered.filter(function (s) { return s.platform_provider && ppSet.has(s.platform_provider); });
    }

    if (minP !== null) {
      filtered = filtered.filter(function (s) { return typeof s.proficiency === 'number' && s.proficiency >= minP; });
    }

    if (maxP !== null) {
      filtered = filtered.filter(function (s) { return typeof s.proficiency === 'number' && s.proficiency <= maxP; });
    }

    if (q) {
      filtered = filtered.filter(function (s) {
        const text = [s.name, s.description].filter(Boolean).join(' ').toLowerCase();
        const tagsText = Array.isArray(s.tags) ? s.tags.join(' ').toLowerCase() : '';
        return text.indexOf(q) !== -1 || tagsText.indexOf(q) !== -1;
      });
    }

    const results = filtered.map(function (skill) {
      const category = categories.find(function (c) { return c && c.id === skill.category_id; }) || null;
      const isShortlisted = shortlistedIds.indexOf(skill.id) !== -1;
      const platformLabel = platformProviderLabelMap[skill.platform_provider] || skill.platform_provider || null;
      const skillWithCategory = Object.assign({}, skill, { category: category || null });
      return {
        skill: skillWithCategory,
        category_name: category ? category.name : null,
        platform_provider_label: platformLabel,
        is_shortlisted: isShortlisted
      };
    });

    return {
      skills: results,
      total_count: results.length
    };
  }

  // addSkillToShortlist(skillId)
  addSkillToShortlist(skillId) {
    const skills = this._getFromStorage('skills');
    const skill = skills.find(function (s) { return s && s.id === skillId; }) || null;
    if (!skill) {
      return {
        success: false,
        message: 'Skill not found',
        shortlist: null,
        shortlisted_skills: []
      };
    }

    const key = 'skill_shortlists';
    let lists = this._getFromStorage(key);
    let shortlist = lists[0] || null;

    if (!shortlist) {
      shortlist = this._getOrCreateSkillShortlist();
      lists = this._getFromStorage(key);
    }

    if (!Array.isArray(shortlist.skill_ids)) {
      shortlist.skill_ids = [];
    }

    if (shortlist.skill_ids.indexOf(skillId) === -1) {
      shortlist.skill_ids.push(skillId);
      shortlist.updated_at = this._nowISO();
    }

    lists = [shortlist];
    this._saveToStorage(key, lists);

    const shortlisted_skills = shortlist.skill_ids
      .map(function (id) { return skills.find(function (s) { return s && s.id === id; }) || null; })
      .filter(function (s) { return !!s; });

    const shortlistWithSkills = Object.assign({}, shortlist, {
      skills: shortlisted_skills
    });

    return {
      success: true,
      message: 'Skill added to shortlist',
      shortlist: shortlistWithSkills,
      shortlisted_skills: shortlisted_skills
    };
  }

  // removeSkillFromShortlist(skillId)
  removeSkillFromShortlist(skillId) {
    const skills = this._getFromStorage('skills');
    const key = 'skill_shortlists';
    let lists = this._getFromStorage(key);
    let shortlist = lists[0] || null;

    if (!shortlist || !Array.isArray(shortlist.skill_ids)) {
      return {
        success: false,
        message: 'No shortlist found',
        shortlist: null,
        shortlisted_skills: []
      };
    }

    const idx = shortlist.skill_ids.indexOf(skillId);
    if (idx !== -1) {
      shortlist.skill_ids.splice(idx, 1);
      shortlist.updated_at = this._nowISO();
    }

    lists = [shortlist];
    this._saveToStorage(key, lists);

    const shortlisted_skills = shortlist.skill_ids
      .map(function (id) { return skills.find(function (s) { return s && s.id === id; }) || null; })
      .filter(function (s) { return !!s; });

    const shortlistWithSkills = Object.assign({}, shortlist, {
      skills: shortlisted_skills
    });

    return {
      success: true,
      message: 'Skill removed from shortlist',
      shortlist: shortlistWithSkills,
      shortlisted_skills: shortlisted_skills
    };
  }

  // getSkillShortlist()
  getSkillShortlist() {
    const skills = this._getFromStorage('skills');
    const categories = this._getFromStorage('skill_categories');
    const shortlist = this._getOrCreateSkillShortlist();

    const shortlistedSkillObjects = (shortlist.skill_ids || [])
      .map(function (id) { return skills.find(function (s) { return s && s.id === id; }) || null; })
      .filter(function (s) { return !!s; });

    const formattedSkills = shortlistedSkillObjects.map(function (skill) {
      const category = categories.find(function (c) { return c && c.id === skill.category_id; }) || null;
      const platformProviderLabelMap = {
        aws: 'AWS',
        gcp: 'GCP',
        azure: 'Azure',
        kubernetes: 'Kubernetes',
        linux: 'Linux',
        docker: 'Docker',
        terraform: 'Terraform',
        monitoring: 'Monitoring',
        ci_cd: 'CI/CD',
        programming_language: 'Programming Language',
        other: 'Other'
      };
      const platformLabel = platformProviderLabelMap[skill.platform_provider] || skill.platform_provider || null;
      const skillWithCategory = Object.assign({}, skill, { category: category || null });
      return {
        skill: skillWithCategory,
        category_name: category ? category.name : null,
        platform_provider_label: platformLabel
      };
    });

    const shortlistWithSkills = Object.assign({}, shortlist, {
      skills: shortlistedSkillObjects
    });

    return {
      shortlist: shortlistWithSkills,
      skills: formattedSkills
    };
  }

  // -------------------- BLOG & READING LIST --------------------

  // getBlogTagFilterOptions()
  getBlogTagFilterOptions() {
    const tags = this._getFromStorage('blog_tags');
    return {
      tags: tags
    };
  }

  // searchBlogPosts(tagSlugs, startDate, endDate, minReadingTimeMinutes, maxReadingTimeMinutes, query, page, pageSize)
  searchBlogPosts(tagSlugs, startDate, endDate, minReadingTimeMinutes, maxReadingTimeMinutes, query, page, pageSize) {
    const posts = this._getFromStorage('blog_posts');
    const tags = this._getFromStorage('blog_tags');

    const tagSlugSet = Array.isArray(tagSlugs) ? new Set(tagSlugs) : null;
    const minRT = typeof minReadingTimeMinutes === 'number' ? minReadingTimeMinutes : null;
    const maxRT = typeof maxReadingTimeMinutes === 'number' ? maxReadingTimeMinutes : null;
    const q = query && typeof query === 'string' ? query.trim().toLowerCase() : '';

    const start = startDate ? this._parseDate(startDate) : null;
    let end = null;
    if (endDate) {
      end = this._parseDate(endDate);
    } else {
      end = new Date();
    }

    let filtered = posts.filter(function (p) { return !!p; });

    // Only published posts if is_published is defined
    filtered = filtered.filter(function (p) { return p.is_published === undefined || p.is_published === true; });

    if (tagSlugSet && tagSlugSet.size > 0) {
      filtered = filtered.filter(function (p) {
        const pTags = Array.isArray(p.tag_slugs) ? p.tag_slugs : [];
        // Require at least one of the filter tags
        return pTags.some(function (slug) { return tagSlugSet.has(slug); });
      });
    }

    if (start || end) {
      filtered = filtered.filter(function (p) {
        const d = new Date(p.published_at);
        if (isNaN(d.getTime())) return false;
        if (start && d.getTime() < start.getTime()) return false;
        if (end && d.getTime() > end.getTime()) return false;
        return true;
      });
    }

    if (minRT !== null) {
      filtered = filtered.filter(function (p) { return typeof p.reading_time_minutes === 'number' && p.reading_time_minutes >= minRT; });
    }

    if (maxRT !== null) {
      filtered = filtered.filter(function (p) { return typeof p.reading_time_minutes === 'number' && p.reading_time_minutes <= maxRT; });
    }

    if (q) {
      filtered = filtered.filter(function (p) {
        const text = [p.title, p.summary, p.content].filter(Boolean).join(' ').toLowerCase();
        return text.indexOf(q) !== -1;
      });
    }

    // Sort by published_at desc
    filtered.sort((a, b) => this._compareDatesDesc(a.published_at, b.published_at));

    const total_count = filtered.length;
    const pg = page && page > 0 ? page : 1;
    const ps = pageSize && pageSize > 0 ? pageSize : 20;
    const startIndex = (pg - 1) * ps;
    const endIndex = startIndex + ps;
    const pageItems = filtered.slice(startIndex, endIndex);

    const mapped = pageItems.map(function (post) {
      const primaryTag = post.primary_tag_slug ? tags.find(function (t) { return t && t.slug === post.primary_tag_slug; }) : null;
      const tagNames = (post.tag_slugs || []).map(function (slug) {
        const t = tags.find(function (bt) { return bt && bt.slug === slug; });
        return t ? t.name : slug;
      });
      return {
        post: post,
        primary_tag_name: primaryTag ? primaryTag.name : null,
        tag_names: tagNames
      };
    });

    return {
      posts: mapped,
      total_count: total_count,
      page: pg,
      page_size: ps
    };
  }

  // getBlogPostDetails(postId)
  getBlogPostDetails(postId) {
    const posts = this._getFromStorage('blog_posts');
    const tags = this._getFromStorage('blog_tags');
    const readingList = this._getOrCreateReadingList();
    const savedIds = Array.isArray(readingList.blog_post_ids) ? readingList.blog_post_ids : [];

    const post = posts.find(function (p) { return p && p.id === postId; }) || null;
    const is_in_reading_list = savedIds.indexOf(postId) !== -1;

    const postTags = post ? (post.tag_slugs || []).map(function (slug) {
      return tags.find(function (t) { return t && t.slug === slug; }) || null;
    }).filter(function (t) { return !!t; }) : [];

    // Determine previous and next posts by published_at desc
    const sorted = posts.slice().sort((a, b) => this._compareDatesDesc(a.published_at, b.published_at));
    let previous_post = null;
    let next_post = null;
    if (post) {
      const idx = sorted.findIndex(function (p) { return p && p.id === post.id; });
      if (idx !== -1) {
        if (idx > 0) {
          next_post = sorted[idx - 1];
        }
        if (idx < sorted.length - 1) {
          previous_post = sorted[idx + 1];
        }
      }
    }

    return {
      post: post,
      tags: postTags,
      is_in_reading_list: is_in_reading_list,
      next_post: next_post,
      previous_post: previous_post
    };
  }

  // addBlogPostToReadingList(blogPostId)
  addBlogPostToReadingList(blogPostId) {
    const posts = this._getFromStorage('blog_posts');
    const post = posts.find(function (p) { return p && p.id === blogPostId; }) || null;
    if (!post) {
      return {
        success: false,
        message: 'Blog post not found',
        reading_list: null,
        saved_posts: []
      };
    }

    const key = 'reading_lists';
    let lists = this._getFromStorage(key);
    let readingList = lists[0] || null;

    if (!readingList) {
      readingList = this._getOrCreateReadingList();
      lists = this._getFromStorage(key);
    }

    if (!Array.isArray(readingList.blog_post_ids)) {
      readingList.blog_post_ids = [];
    }

    if (readingList.blog_post_ids.indexOf(blogPostId) === -1) {
      readingList.blog_post_ids.push(blogPostId);
      readingList.updated_at = this._nowISO();
    }

    lists = [readingList];
    this._saveToStorage(key, lists);

    const saved_posts = readingList.blog_post_ids
      .map(function (id) { return posts.find(function (p) { return p && p.id === id; }) || null; })
      .filter(function (p) { return !!p; });

    const readingListWithPosts = Object.assign({}, readingList, {
      blog_posts: saved_posts
    });

    return {
      success: true,
      message: 'Blog post added to reading list',
      reading_list: readingListWithPosts,
      saved_posts: saved_posts
    };
  }

  // removeBlogPostFromReadingList(blogPostId)
  removeBlogPostFromReadingList(blogPostId) {
    const posts = this._getFromStorage('blog_posts');
    const key = 'reading_lists';
    let lists = this._getFromStorage(key);
    let readingList = lists[0] || null;

    if (!readingList || !Array.isArray(readingList.blog_post_ids)) {
      return {
        success: false,
        message: 'No reading list found',
        reading_list: null,
        saved_posts: []
      };
    }

    const idx = readingList.blog_post_ids.indexOf(blogPostId);
    if (idx !== -1) {
      readingList.blog_post_ids.splice(idx, 1);
      readingList.updated_at = this._nowISO();
    }

    lists = [readingList];
    this._saveToStorage(key, lists);

    const saved_posts = readingList.blog_post_ids
      .map(function (id) { return posts.find(function (p) { return p && p.id === id; }) || null; })
      .filter(function (p) { return !!p; });

    const readingListWithPosts = Object.assign({}, readingList, {
      blog_posts: saved_posts
    });

    return {
      success: true,
      message: 'Blog post removed from reading list',
      reading_list: readingListWithPosts,
      saved_posts: saved_posts
    };
  }

  // getReadingListPosts()
  getReadingListPosts() {
    const posts = this._getFromStorage('blog_posts');
    const tags = this._getFromStorage('blog_tags');
    const readingList = this._getOrCreateReadingList();

    const saved = (readingList.blog_post_ids || [])
      .map(function (id) { return posts.find(function (p) { return p && p.id === id; }) || null; })
      .filter(function (p) { return !!p; });

    const mapped = saved.map(function (post) {
      const tagNames = (post.tag_slugs || []).map(function (slug) {
        const t = tags.find(function (bt) { return bt && bt.slug === slug; });
        return t ? t.name : slug;
      });
      return {
        post: post,
        tag_names: tagNames
      };
    });

    const readingListWithPosts = Object.assign({}, readingList, {
      blog_posts: saved
    });

    return {
      reading_list: readingListWithPosts,
      posts: mapped
    };
  }

  // -------------------- ABOUT & EXPERIENCE --------------------

  // getAboutPageContent()
  getAboutPageContent() {
    const profiles = this._getFromStorage('profiles');
    const profile = profiles[0] || null;

    const bio = profile && profile.summary ? profile.summary : '';
    const primary_specializations = profile && Array.isArray(profile.primary_specializations)
      ? profile.primary_specializations
      : [];

    return {
      profile: profile,
      bio: bio,
      primary_specializations: primary_specializations
    };
  }

  // getExperienceTimeline(roleTypes)
  getExperienceTimeline(roleTypes) {
    const roles = this._getFromStorage('experience_roles');
    const roleTypeSet = Array.isArray(roleTypes) ? new Set(roleTypes) : null;

    let filtered = roles.filter(function (r) { return !!r; });

    if (roleTypeSet && roleTypeSet.size > 0) {
      filtered = filtered.filter(function (r) { return r.role_type && roleTypeSet.has(r.role_type); });
    }

    // Sort by start_date desc (newest first)
    filtered.sort((a, b) => this._compareDatesDesc(a.start_date, b.start_date));

    return {
      roles: filtered,
      sort_order: 'start_date_desc'
    };
  }

  // getRecruiterEvaluation()
  getRecruiterEvaluation() {
    const evaluation = this._getOrCreateRecruiterEvaluation();
    const projects = this._getFromStorage('projects');

    const mostRelevantProject = evaluation.most_relevant_project_id
      ? projects.find(function (p) { return p && p.id === evaluation.most_relevant_project_id; }) || null
      : null;

    const evaluationWithProject = Object.assign({}, evaluation, {
      most_relevant_project_object: mostRelevantProject
    });

    return {
      evaluation: evaluationWithProject
    };
  }

  // updateRecruiterEvaluation(mostRelevantProject, mostRelevantProjectId, earliestDevopsSreYear, notes)
  updateRecruiterEvaluation(mostRelevantProject, mostRelevantProjectId, earliestDevopsSreYear, notes) {
    const key = 'recruiter_evaluations';
    let list = this._getFromStorage(key);
    let evaluation = list[0] || null;

    if (!evaluation) {
      evaluation = this._getOrCreateRecruiterEvaluation();
      list = this._getFromStorage(key);
    }

    if (typeof mostRelevantProject !== 'undefined') {
      evaluation.most_relevant_project = mostRelevantProject;
    }

    if (typeof mostRelevantProjectId !== 'undefined') {
      evaluation.most_relevant_project_id = mostRelevantProjectId;
    }

    if (typeof earliestDevopsSreYear !== 'undefined') {
      evaluation.earliest_devops_sre_year = earliestDevopsSreYear;
    }

    if (typeof notes !== 'undefined') {
      evaluation.notes = notes;
    }

    evaluation.updated_at = this._nowISO();

    list = [evaluation];
    this._saveToStorage(key, list);

    const projects = this._getFromStorage('projects');
    const mostRelevantProjectObj = evaluation.most_relevant_project_id
      ? projects.find(function (p) { return p && p.id === evaluation.most_relevant_project_id; }) || null
      : null;

    const evaluationWithProject = Object.assign({}, evaluation, {
      most_relevant_project_object: mostRelevantProjectObj
    });

    return {
      success: true,
      message: 'Recruiter evaluation updated',
      evaluation: evaluationWithProject
    };
  }

  // -------------------- TAILORED RESUME --------------------

  // getResumeBuilderOptions()
  getResumeBuilderOptions() {
    const target_roles = [
      {
        key: 'senior_devops_engineer',
        label: 'Senior DevOps Engineer',
        description: 'Focus on CI/CD, cloud infrastructure, and reliability.'
      },
      {
        key: 'devops_engineer',
        label: 'DevOps Engineer',
        description: 'General DevOps engineering roles.'
      },
      {
        key: 'site_reliability_engineer',
        label: 'Site Reliability Engineer',
        description: 'SRE roles focused on reliability and observability.'
      }
    ];

    const experience_timeframes = [
      { key: 'last_1_year', label: 'Last 1 year' },
      { key: 'last_2_years', label: 'Last 2 years' },
      { key: 'last_3_years', label: 'Last 3 years' },
      { key: 'last_4_years', label: 'Last 4 years' },
      { key: 'last_5_years', label: 'Last 5 years' },
      { key: 'all', label: 'All experience' }
    ];

    const focus_skill_suggestions = ['CI/CD', 'Observability', 'Kubernetes', 'Terraform', 'AWS', 'Monitoring'];

    const remote_preferences = [
      { key: 'onsite_only', label: 'On-site only' },
      { key: 'hybrid', label: 'Hybrid' },
      { key: 'open_to_remote', label: 'Open to remote' },
      { key: 'remote_only', label: 'Remote only' }
    ];

    return {
      target_roles: target_roles,
      experience_timeframes: experience_timeframes,
      focus_skill_suggestions: focus_skill_suggestions,
      remote_preferences: remote_preferences
    };
  }

  _filterRolesByTimeframe(experienceRoles, timeframeKey) {
    if (!timeframeKey || timeframeKey === 'all') return experienceRoles.slice();

    const now = new Date();
    let years = null;
    if (timeframeKey === 'last_1_year') years = 1;
    else if (timeframeKey === 'last_2_years') years = 2;
    else if (timeframeKey === 'last_3_years') years = 3;
    else if (timeframeKey === 'last_4_years') years = 4;
    else if (timeframeKey === 'last_5_years') years = 5;

    if (!years) return experienceRoles.slice();

    const threshold = new Date(now.getFullYear() - years, now.getMonth(), now.getDate()).getTime();

    return experienceRoles.filter(function (role) {
      const start = new Date(role.start_date);
      const end = role.end_date ? new Date(role.end_date) : null;
      if (isNaN(start.getTime())) return false;
      const endTime = end && !isNaN(end.getTime()) ? end.getTime() : start.getTime();
      return endTime >= threshold;
    });
  }

  _buildTailoredSummary(profile, targetRole, location, focusSkills) {
    const namePart = profile && profile.full_name ? profile.full_name + ' - ' : '';
    const rolePart = targetRole || (profile && profile.headline) || 'DevOps Engineer';
    const locationPart = location ? ' targeting roles in ' + location : '';
    const skillsPart = Array.isArray(focusSkills) && focusSkills.length > 0
      ? ' with a focus on ' + focusSkills.join(', ')
      : '';
    return namePart + rolePart + locationPart + skillsPart + '.';
  }

  _filterProjectsForResume(projects, timeframeKey) {
    if (!timeframeKey || timeframeKey === 'all') return projects.slice();

    const now = new Date();
    let years = null;
    if (timeframeKey === 'last_1_year') years = 1;
    else if (timeframeKey === 'last_2_years') years = 2;
    else if (timeframeKey === 'last_3_years') years = 3;
    else if (timeframeKey === 'last_4_years') years = 4;
    else if (timeframeKey === 'last_5_years') years = 5;
    if (!years) return projects.slice();

    const threshold = new Date(now.getFullYear() - years, now.getMonth(), now.getDate()).getTime();

    return projects.filter(function (p) {
      const end = p.end_date ? new Date(p.end_date) : null;
      const last = p.last_updated ? new Date(p.last_updated) : null;
      const start = p.start_date ? new Date(p.start_date) : null;
      let t = 0;
      if (last && !isNaN(last.getTime())) t = last.getTime();
      else if (end && !isNaN(end.getTime())) t = end.getTime();
      else if (start && !isNaN(start.getTime())) t = start.getTime();
      return t >= threshold;
    });
  }

  _filterSkillsForFocus(skills, focusSkills) {
    if (!Array.isArray(focusSkills) || focusSkills.length === 0) return skills.slice();
    const lowerFocus = focusSkills.map(function (s) { return s.toLowerCase(); });
    return skills.filter(function (s) {
      const name = (s.name || '').toLowerCase();
      const tagsText = Array.isArray(s.tags) ? s.tags.join(' ').toLowerCase() : '';
      return lowerFocus.some(function (f) { return name.indexOf(f) !== -1 || tagsText.indexOf(f) !== -1; });
    });
  }

  // generateTailoredResume(targetRole, location, experienceTimeframe, focusSkills, remotePreference, includeProjects, includeSkills, includeEducation, includeCertifications)
  generateTailoredResume(
    targetRole,
    location,
    experienceTimeframe,
    focusSkills,
    remotePreference,
    includeProjects,
    includeSkills,
    includeEducation,
    includeCertifications
  ) {
    const key = 'resume_configurations';
    let list = this._getFromStorage(key);
    let config = list[0] || null;

    if (!config) {
      config = this._getOrCreateResumeConfiguration();
      list = this._getFromStorage(key);
    }

    if (typeof targetRole !== 'undefined') {
      config.target_role = targetRole;
    }
    if (typeof location !== 'undefined') {
      config.location = location;
    }
    if (typeof experienceTimeframe !== 'undefined') {
      config.experience_timeframe = experienceTimeframe;
    }
    if (typeof focusSkills !== 'undefined') {
      config.focus_skills = Array.isArray(focusSkills) ? focusSkills : [];
    }
    if (typeof remotePreference !== 'undefined') {
      config.remote_preference = remotePreference;
    }
    if (typeof includeProjects !== 'undefined') {
      config.include_projects = includeProjects;
    }
    if (typeof includeSkills !== 'undefined') {
      config.include_skills = includeSkills;
    }
    if (typeof includeEducation !== 'undefined') {
      config.include_education = includeEducation;
    }
    if (typeof includeCertifications !== 'undefined') {
      config.include_certifications = includeCertifications;
    }

    config.generated_at = this._nowISO();

    list = [config];
    this._saveToStorage(key, list);

    const profiles = this._getFromStorage('profiles');
    const profile = profiles[0] || null;
    const allRoles = this._getFromStorage('experience_roles');
    const rolesForTimeframe = this._filterRolesByTimeframe(allRoles, config.experience_timeframe);

    const allProjects = this._getFromStorage('projects');
    const projectsForTimeframe = config.include_projects
      ? this._filterProjectsForResume(allProjects, config.experience_timeframe)
      : [];

    const allSkills = this._getFromStorage('skills');
    let skillsForResume = config.include_skills ? allSkills.slice() : [];
    if (config.include_skills && Array.isArray(config.focus_skills) && config.focus_skills.length > 0) {
      const focused = this._filterSkillsForFocus(allSkills, config.focus_skills);
      // If focus returns at least one, use it; otherwise fall back to all skills
      skillsForResume = focused.length > 0 ? focused : allSkills.slice();
    }
    // Sort skills by proficiency desc
    skillsForResume.sort(function (a, b) {
      const pa = typeof a.proficiency === 'number' ? a.proficiency : 0;
      const pb = typeof b.proficiency === 'number' ? b.proficiency : 0;
      return pb - pa;
    });

    const summary = this._buildTailoredSummary(profile, config.target_role, config.location, config.focus_skills || []);

    const resume_preview = {
      profile: profile,
      summary: summary,
      experience_roles: rolesForTimeframe,
      projects: projectsForTimeframe,
      skills: skillsForResume,
      generated_at: this._nowISO()
    };

    return {
      configuration: config,
      resume_preview: resume_preview
    };
  }

  // getTailoredResumePrintView()
  getTailoredResumePrintView() {
    const key = 'resume_configurations';
    let list = this._getFromStorage(key);
    let config = list[0] || null;

    if (!config) {
      config = this._getOrCreateResumeConfiguration();
      list = this._getFromStorage(key);
    }

    config.last_viewed_at = this._nowISO();
    list = [config];
    this._saveToStorage(key, list);

    const profiles = this._getFromStorage('profiles');
    const profile = profiles[0] || null;
    const allRoles = this._getFromStorage('experience_roles');
    const rolesForTimeframe = this._filterRolesByTimeframe(allRoles, config.experience_timeframe);

    const allProjects = this._getFromStorage('projects');
    const projectsForTimeframe = config.include_projects
      ? this._filterProjectsForResume(allProjects, config.experience_timeframe)
      : [];

    const allSkills = this._getFromStorage('skills');
    let skillsForResume = config.include_skills ? allSkills.slice() : [];
    if (config.include_skills && Array.isArray(config.focus_skills) && config.focus_skills.length > 0) {
      const focused = this._filterSkillsForFocus(allSkills, config.focus_skills);
      skillsForResume = focused.length > 0 ? focused : allSkills.slice();
    }

    const summary = this._buildTailoredSummary(profile, config.target_role, config.location, config.focus_skills || []);

    return {
      configuration: config,
      profile: profile,
      summary: summary,
      experience_roles: rolesForTimeframe,
      projects: projectsForTimeframe,
      skills: skillsForResume
    };
  }

  // -------------------- CONTACT --------------------

  // submitContactMessage(email, subject, message)
  submitContactMessage(email, subject, message) {
    if (!email || !subject || !message) {
      return {
        success: false,
        message: 'Email, subject and message are required.',
        contact_message: null
      };
    }

    const metadata = this._extractContactMessageMetadata(message);

    const contactMessage = {
      id: this._generateId('contact'),
      email: email,
      subject: subject,
      message: message,
      related_project_ids: metadata.related_project_ids || [],
      preferred_interview_date: metadata.preferred_interview_date,
      created_at: this._nowISO()
    };

    const key = 'contact_messages';
    const list = this._getFromStorage(key);
    list.push(contactMessage);
    this._saveToStorage(key, list);

    return {
      success: true,
      message: 'Contact message submitted',
      contact_message: contactMessage
    };
  }

  // -------------------- NEWSLETTER --------------------

  // getNewsletterTopics()
  getNewsletterTopics() {
    const topics = this._getFromStorage('newsletter_topics');
    // Default frequency is weekly by convention
    return {
      topics: topics,
      default_frequency: 'weekly'
    };
  }

  // subscribeToNewsletter(email, frequency, topicKeys)
  subscribeToNewsletter(email, frequency, topicKeys) {
    if (!email) {
      return {
        success: false,
        message: 'Email is required.',
        subscription: null
      };
    }

    const validFrequencies = new Set(['daily', 'weekly', 'monthly']);
    const freq = validFrequencies.has(frequency) ? frequency : 'weekly';

    const topicKeysArr = Array.isArray(topicKeys) ? this._unique(topicKeys) : [];

    const key = 'newsletter_subscriptions';
    const list = this._getFromStorage(key);

    let subscription = list.find(function (s) { return s && s.email === email && s.is_active; }) || null;

    if (!subscription) {
      subscription = {
        id: this._generateId('sub'),
        email: email,
        frequency: freq,
        topic_keys: topicKeysArr,
        subscribed_at: this._nowISO(),
        unsubscribed_at: null,
        is_active: true
      };
      list.push(subscription);
    } else {
      subscription.frequency = freq;
      subscription.topic_keys = topicKeysArr;
      subscription.is_active = true;
      subscription.unsubscribed_at = null;
    }

    this._saveToStorage(key, list);

    return {
      success: true,
      message: 'Subscription saved',
      subscription: subscription
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
