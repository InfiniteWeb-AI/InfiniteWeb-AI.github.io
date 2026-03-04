// localStorage polyfill for Node.js and environments without localStorage
const localStorage = (function () {
  try {
    if (typeof globalThis !== 'undefined' && globalThis.localStorage) {
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

  // ----------------------
  // Initialization / Storage helpers
  // ----------------------

  _initStorage() {
    const arrayKeys = [
      'projects',
      'blog_posts',
      'skills',
      'experience_roles',
      'service_offerings',
      'contact_requests',
      'skills_messages',
      'service_engagement_requests',
      'shortlist_items',
      'comparison_items',
      'reading_list_items',
      'theme_preferences'
    ];

    arrayKeys.forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    });

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, fallback) {
    const data = localStorage.getItem(key);
    if (data == null) {
      return typeof fallback !== 'undefined' ? fallback : [];
    }
    try {
      return JSON.parse(data);
    } catch (e) {
      return typeof fallback !== 'undefined' ? fallback : [];
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

  _nowIso() {
    return new Date().toISOString();
  }

  // ----------------------
  // Label helpers
  // ----------------------

  _projectCategoryLabel(value) {
    const map = {
      web_design: 'Web Design',
      mobile_apps: 'Mobile Apps',
      dashboards_data_visualization: 'Dashboards / Data Visualization',
      branding: 'Branding',
      product_design: 'Product Design',
      other: 'Other'
    };
    return map[value] || value;
  }

  _projectTypeLabel(value) {
    const map = {
      case_study: 'Case Study',
      concept: 'Concept',
      experiment: 'Experiment',
      exploration: 'Exploration'
    };
    return map[value] || value;
  }

  _industryLabel(value) {
    const map = {
      saas: 'SaaS',
      fintech: 'Fintech',
      ecommerce: 'E-commerce',
      healthcare: 'Healthcare',
      education: 'Education',
      agency: 'Agency',
      other: 'Other'
    };
    return map[value] || value;
  }

  _blogCategoryLabel(value) {
    const map = {
      usability_testing: 'Usability Testing',
      product_design: 'Product Design',
      process: 'Process',
      case_studies: 'Case Studies',
      career: 'Career',
      dashboard: 'Dashboards',
      other: 'Other'
    };
    return map[value] || value;
  }

  _skillCategoryLabel(value) {
    const map = {
      research: 'Research',
      visual_design: 'Visual Design',
      interaction_design: 'Interaction Design',
      information_architecture: 'Information Architecture',
      facilitation: 'Facilitation',
      other: 'Other'
    };
    return map[value] || value;
  }

  _proficiencyLabel(value) {
    const map = {
      advanced: 'Advanced',
      intermediate: 'Intermediate',
      beginner: 'Beginner'
    };
    return map[value] || value;
  }

  _durationLabelForExperience(durationMonths) {
    if (durationMonths == null) return '';
    if (durationMonths < 12) return 'under_12_months';
    return 'twelve_plus_months';
  }

  // ----------------------
  // Internal helpers from specification
  // ----------------------

  _getOrCreateThemePreference() {
    const prefs = this._getFromStorage('theme_preferences', []);
    if (prefs.length > 0) {
      return prefs[0];
    }
    const pref = {
      id: 'theme_pref_1',
      themeMode: 'light',
      updatedAt: this._nowIso()
    };
    this._saveToStorage('theme_preferences', [pref]);
    return pref;
  }

  _getOrCreateShortlist() {
    const items = this._getFromStorage('shortlist_items', []);
    if (!Array.isArray(items)) {
      this._saveToStorage('shortlist_items', []);
      return [];
    }
    return items;
  }

  _getOrCreateComparisonList() {
    const items = this._getFromStorage('comparison_items', []);
    if (!Array.isArray(items)) {
      this._saveToStorage('comparison_items', []);
      return [];
    }
    return items;
  }

  _getOrCreateReadingList() {
    const items = this._getFromStorage('reading_list_items', []);
    if (!Array.isArray(items)) {
      this._saveToStorage('reading_list_items', []);
      return [];
    }
    return items;
  }

  // ----------------------
  // THEME
  // ----------------------

  getThemePreference() {
    const pref = this._getOrCreateThemePreference();
    return {
      themeMode: pref.themeMode,
      updatedAt: pref.updatedAt
    };
  }

  setThemeMode(themeMode) {
    if (themeMode !== 'light' && themeMode !== 'dark') {
      return {
        success: false,
        themeMode: this._getOrCreateThemePreference().themeMode,
        message: 'Invalid theme mode.'
      };
    }
    const prefs = this._getFromStorage('theme_preferences', []);
    let pref;
    if (prefs.length === 0) {
      pref = {
        id: 'theme_pref_1',
        themeMode,
        updatedAt: this._nowIso()
      };
      this._saveToStorage('theme_preferences', [pref]);
    } else {
      pref = prefs[0];
      pref.themeMode = themeMode;
      pref.updatedAt = this._nowIso();
      this._saveToStorage('theme_preferences', [pref]);
    }

    // Instrumentation for task completion tracking
    try {
      const key = 'task6_darkModeJourney';
      let raw = localStorage.getItem(key);
      let obj;
      try {
        obj = raw ? JSON.parse(raw) : {};
      } catch (e) {
        obj = {};
      }

      if (themeMode === 'dark') {
        if (!obj || typeof obj !== 'object') obj = {};
        if (!obj.darkModeEnabledAt) {
          obj.darkModeEnabledAt = this._nowIso();
        }
        if (!Array.isArray(obj.webDesignProjectIdsVisitedInDark)) {
          obj.webDesignProjectIdsVisitedInDark = [];
        }
        if (typeof obj.aboutVisitedInDarkMode !== 'boolean') {
          obj.aboutVisitedInDarkMode = false;
        }
        if (typeof obj.contactVisitedInDarkMode !== 'boolean') {
          obj.contactVisitedInDarkMode = false;
        }
        if (typeof obj.contactVisitedAt === 'undefined') {
          obj.contactVisitedAt = null;
        }
      } else if (themeMode === 'light') {
        if (!obj || typeof obj !== 'object') obj = {};
        obj.darkModeDisabledAt = this._nowIso();
      }

      localStorage.setItem(key, JSON.stringify(obj));
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      success: true,
      themeMode: pref.themeMode,
      message: 'Theme mode updated.'
    };
  }

  // ----------------------
  // HOME
  // ----------------------

  getHomeIntroContent() {
    // Lazily initialize a simple intro config
    let cfg = this._getFromStorage('home_intro_content', null);
    if (!cfg) {
      cfg = {
        headline: 'Portfolio',
        subheadline: 'Selected product design and UX work',
        introBody: 'Explore case studies, experiments, and writing across product design, research, and visual design.',
        primaryCtaLabel: 'View projects',
        primaryCtaTarget: 'projects',
        secondaryCtaLabel: 'Get in touch',
        secondaryCtaTarget: 'contact'
      };
      this._saveToStorage('home_intro_content', cfg);
    }
    return cfg;
  }

  getHomeFeaturedProjects(limit = 3) {
    const projects = this._getFromStorage('projects', []);
    const featured = projects
      .filter((p) => p.isFeatured)
      .sort((a, b) => {
        // newest year first, then impact score
        if (b.year !== a.year) return (b.year || 0) - (a.year || 0);
        return (b.impactScore || 0) - (a.impactScore || 0);
      })
      .slice(0, limit)
      .map((p) => ({
        id: p.id,
        title: p.title,
        slug: p.slug,
        category: p.category,
        categoryLabel: this._projectCategoryLabel(p.category),
        type: p.type,
        typeLabel: this._projectTypeLabel(p.type),
        industry: p.industry,
        industryLabel: this._industryLabel(p.industry),
        year: p.year,
        impactScore: p.impactScore,
        summary: p.summary,
        thumbnailImageUrl: p.thumbnailImageUrl || null,
        isFeatured: !!p.isFeatured
      }));
    return featured;
  }

  getHomeFeaturedBlogPosts(limit = 3) {
    const posts = this._getFromStorage('blog_posts', []);
    const featured = posts
      .filter((p) => p.isFeatured)
      .sort((a, b) => {
        const da = a.publishedAt ? Date.parse(a.publishedAt) : 0;
        const db = b.publishedAt ? Date.parse(b.publishedAt) : 0;
        return db - da; // newest first
      })
      .slice(0, limit)
      .map((p) => ({
        id: p.id,
        title: p.title,
        slug: p.slug,
        excerpt: p.excerpt || '',
        category: p.category,
        categoryLabel: this._blogCategoryLabel(p.category),
        publishedAt: p.publishedAt || null,
        readingTimeMinutes: p.readingTimeMinutes,
        heroImageUrl: p.heroImageUrl || null,
        isFeatured: !!p.isFeatured
      }));
    return featured;
  }

  // ----------------------
  // PROJECTS
  // ----------------------

  getProjectFilterOptions() {
    const projects = this._getFromStorage('projects', []);

    const categoriesEnum = [
      'web_design',
      'mobile_apps',
      'dashboards_data_visualization',
      'branding',
      'product_design',
      'other'
    ];
    const typesEnum = ['case_study', 'concept', 'experiment', 'exploration'];
    const industriesEnum = ['saas', 'fintech', 'ecommerce', 'healthcare', 'education', 'other'];

    const categories = categoriesEnum.map((value) => ({
      value,
      label: this._projectCategoryLabel(value),
      count: projects.filter((p) => p.category === value).length
    }));

    const types = typesEnum.map((value) => ({
      value,
      label: this._projectTypeLabel(value),
      count: projects.filter((p) => p.type === value).length
    }));

    const industries = industriesEnum.map((value) => ({
      value,
      label: this._industryLabel(value),
      count: projects.filter((p) => p.industry === value).length
    }));

    const toolCounts = {};
    projects.forEach((p) => {
      if (Array.isArray(p.tools)) {
        p.tools.forEach((t) => {
          toolCounts[t] = (toolCounts[t] || 0) + 1;
        });
      }
    });
    const tools = Object.keys(toolCounts).map((value) => ({
      value,
      label: value,
      count: toolCounts[value]
    }));

    const durationLabelsEnum = [
      'under_3_months',
      'three_to_six_months',
      'six_to_twelve_months',
      'twelve_plus_months'
    ];

    const durationLabels = durationLabelsEnum.map((value) => ({
      value,
      label:
        value === 'under_3_months'
          ? 'Under 3 months'
          : value === 'three_to_six_months'
          ? '3–6 months'
          : value === 'six_to_twelve_months'
          ? '6–12 months'
          : '12+ months'
    }));

    const yearsSet = new Set();
    projects.forEach((p) => {
      if (typeof p.year === 'number') yearsSet.add(p.year);
    });
    const years = Array.from(yearsSet).sort((a, b) => b - a);

    const sortOptions = [
      { value: 'year_newest_first', label: 'Year  Newest first' },
      { value: 'year_oldest_first', label: 'Year  Oldest first' },
      { value: 'impact_score_desc', label: 'Impact score  High to low' },
      { value: 'impact_score_asc', label: 'Impact score  Low to high' },
      { value: 'created_at_desc', label: 'Added  Newest first' }
    ];

    return {
      categories,
      types,
      industries,
      tools,
      durationLabels,
      years,
      sortOptions
    };
  }

  listProjects(filters = {}, sort = 'year_newest_first', page = 1, pageSize = 12) {
    const projects = this._getFromStorage('projects', []);
    const shortlistItems = this._getOrCreateShortlist();
    const comparisonItems = this._getOrCreateComparisonList();

    let items = projects.slice();

    if (filters.category) {
      items = items.filter((p) => p.category === filters.category);
    }
    if (filters.type) {
      items = items.filter((p) => p.type === filters.type);
    }
    if (filters.industry) {
      items = items.filter((p) => p.industry === filters.industry);
    }
    if (filters.requiredToolsAll && filters.requiredToolsAll.length > 0) {
      items = items.filter((p) => {
        const tools = Array.isArray(p.tools) ? p.tools : [];
        return filters.requiredToolsAll.every((t) => tools.includes(t));
      });
    }
    if (filters.durationLabel) {
      items = items.filter((p) => p.durationLabel === filters.durationLabel);
    }
    if (typeof filters.maxDurationMonths === 'number') {
      items = items.filter((p) => typeof p.durationMonths === 'number' && p.durationMonths <= filters.maxDurationMonths);
    }
    if (typeof filters.year === 'number') {
      items = items.filter((p) => p.year === filters.year);
    }
    if (typeof filters.minYear === 'number') {
      items = items.filter((p) => typeof p.year === 'number' && p.year >= filters.minYear);
    }
    if (typeof filters.maxYear === 'number') {
      items = items.filter((p) => typeof p.year === 'number' && p.year <= filters.maxYear);
    }
    if (filters.searchQuery && filters.searchQuery.trim()) {
      const q = filters.searchQuery.trim().toLowerCase();
      items = items.filter((p) => {
        const title = (p.title || '').toLowerCase();
        const summary = (p.summary || '').toLowerCase();
        return title.includes(q) || summary.includes(q);
      });
    }

    items.sort((a, b) => {
      if (sort === 'year_oldest_first') {
        return (a.year || 0) - (b.year || 0);
      }
      if (sort === 'impact_score_desc') {
        return (b.impactScore || 0) - (a.impactScore || 0);
      }
      if (sort === 'impact_score_asc') {
        return (a.impactScore || 0) - (b.impactScore || 0);
      }
      if (sort === 'created_at_desc') {
        const da = a.createdAt ? Date.parse(a.createdAt) : 0;
        const db = b.createdAt ? Date.parse(b.createdAt) : 0;
        return db - da;
      }
      // default: year_newest_first
      if ((b.year || 0) !== (a.year || 0)) {
        return (b.year || 0) - (a.year || 0);
      }
      return (b.impactScore || 0) - (a.impactScore || 0);
    });

    const total = items.length;

    if (page < 1) page = 1;
    if (pageSize < 1) pageSize = 1;

    const start = (page - 1) * pageSize;
    const pagedItems = items.slice(start, start + pageSize);

    const resultItems = pagedItems.map((p) => {
      const isShortlisted = shortlistItems.some(
        (s) => s.itemType === 'project' && s.itemId === p.id
      );
      const inComparison = comparisonItems.some((c) => c.projectId === p.id);
      return {
        id: p.id,
        title: p.title,
        slug: p.slug,
        category: p.category,
        categoryLabel: this._projectCategoryLabel(p.category),
        type: p.type,
        typeLabel: this._projectTypeLabel(p.type),
        industry: p.industry,
        industryLabel: this._industryLabel(p.industry),
        tools: Array.isArray(p.tools) ? p.tools : [],
        durationMonths: p.durationMonths,
        durationLabel: p.durationLabel,
        year: p.year,
        impactScore: p.impactScore,
        summary: p.summary,
        thumbnailImageUrl: p.thumbnailImageUrl || null,
        isFeatured: !!p.isFeatured,
        isShortlisted,
        inComparison
      };
    });

    const filterDescParts = [];
    if (filters.category) {
      filterDescParts.push(this._projectCategoryLabel(filters.category));
    }
    if (filters.industry) {
      filterDescParts.push(this._industryLabel(filters.industry));
    }
    if (filters.year) {
      filterDescParts.push('Year ' + filters.year);
    }
    if (filters.requiredToolsAll && filters.requiredToolsAll.length) {
      filterDescParts.push('Tools: ' + filters.requiredToolsAll.join(', '));
    }
    const appliedFiltersDescription = filterDescParts.length
      ? filterDescParts.join('  b7 ')
      : 'All projects';

    return {
      items: resultItems,
      total,
      page,
      pageSize,
      appliedFiltersDescription
    };
  }

  getProjectDetails(slug, projectId) {
    const projects = this._getFromStorage('projects', []);
    const shortlistItems = this._getOrCreateShortlist();
    const comparisonItems = this._getOrCreateComparisonList();

    let project = null;
    if (slug) {
      project = projects.find((p) => p.slug === slug) || null;
    } else if (projectId) {
      project = projects.find((p) => p.id === projectId) || null;
    }
    if (!project) {
      return null;
    }

    const isShortlisted = shortlistItems.some(
      (s) => s.itemType === 'project' && s.itemId === project.id
    );
    const inComparison = comparisonItems.some((c) => c.projectId === project.id);

    let relatedProjects = [];
    if (Array.isArray(project.relatedProjectIds) && project.relatedProjectIds.length) {
      relatedProjects = project.relatedProjectIds
        .map((id) => projects.find((p) => p.id === id))
        .filter(Boolean)
        .map((p) => ({
          id: p.id,
          title: p.title,
          slug: p.slug,
          categoryLabel: this._projectCategoryLabel(p.category),
          thumbnailImageUrl: p.thumbnailImageUrl || null
        }));
    }

    // Navigation based on sequenceIndex when available
    let navigation = { previous: null, next: null };
    const withSeq = projects.filter((p) => typeof p.sequenceIndex === 'number');
    if (typeof project.sequenceIndex === 'number' && withSeq.length > 0) {
      const currentIdx = project.sequenceIndex;
      let prev = null;
      let next = null;
      withSeq.forEach((p) => {
        if (p.sequenceIndex < currentIdx) {
          if (!prev || p.sequenceIndex > prev.sequenceIndex) prev = p;
        }
        if (p.sequenceIndex > currentIdx) {
          if (!next || p.sequenceIndex < next.sequenceIndex) next = p;
        }
      });
      if (prev) {
        navigation.previous = { id: prev.id, slug: prev.slug, title: prev.title };
      }
      if (next) {
        navigation.next = { id: next.id, slug: next.slug, title: next.title };
      }
    }

    // Instrumentation for task completion tracking
    try {
      const pref = this._getOrCreateThemePreference();
      if (pref && pref.themeMode === 'dark' && project.category === 'web_design') {
        const key = 'task6_darkModeJourney';
        let raw = localStorage.getItem(key);
        let obj;
        try {
          obj = raw ? JSON.parse(raw) : {};
        } catch (e) {
          obj = {};
        }

        if (!Array.isArray(obj.webDesignProjectIdsVisitedInDark)) {
          obj.webDesignProjectIdsVisitedInDark = [];
        }
        if (!obj.webDesignProjectIdsVisitedInDark.includes(project.id)) {
          obj.webDesignProjectIdsVisitedInDark.push(project.id);
        }

        localStorage.setItem(key, JSON.stringify(obj));
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      id: project.id,
      title: project.title,
      slug: project.slug,
      summary: project.summary,
      description: project.description,
      outcomeSummary: project.outcomeSummary || '',
      metrics: Array.isArray(project.metrics) ? project.metrics : [],
      category: project.category,
      categoryLabel: this._projectCategoryLabel(project.category),
      type: project.type,
      typeLabel: this._projectTypeLabel(project.type),
      industry: project.industry,
      industryLabel: this._industryLabel(project.industry),
      tools: Array.isArray(project.tools) ? project.tools : [],
      durationMonths: project.durationMonths,
      durationLabel: project.durationLabel,
      year: project.year,
      impactScore: project.impactScore,
      coverImageUrl: project.coverImageUrl || null,
      thumbnailImageUrl: project.thumbnailImageUrl || null,
      sequenceIndex: project.sequenceIndex,
      isShortlisted,
      inComparison,
      relatedProjects,
      navigation
    };
  }

  // ----------------------
  // SHORTLIST (Projects & Experience)
  // ----------------------

  toggleProjectShortlist(projectId) {
    const projects = this._getFromStorage('projects', []);
    const projectExists = projects.some((p) => p.id === projectId);
    if (!projectExists) {
      return {
        isShortlisted: false,
        totalShortlistedProjects: this._getOrCreateShortlist().filter(
          (s) => s.itemType === 'project'
        ).length,
        message: 'Project not found.'
      };
    }

    let shortlist = this._getOrCreateShortlist();
    const existingIndex = shortlist.findIndex(
      (s) => s.itemType === 'project' && s.itemId === projectId
    );

    let isShortlisted;
    if (existingIndex >= 0) {
      shortlist.splice(existingIndex, 1);
      isShortlisted = false;
    } else {
      shortlist.push({
        id: this._generateId('shortlist'),
        itemType: 'project',
        itemId: projectId,
        addedAt: this._nowIso()
      });
      isShortlisted = true;
    }

    this._saveToStorage('shortlist_items', shortlist);

    const totalShortlistedProjects = shortlist.filter(
      (s) => s.itemType === 'project'
    ).length;

    return {
      isShortlisted,
      totalShortlistedProjects,
      message: isShortlisted ? 'Project added to shortlist.' : 'Project removed from shortlist.'
    };
  }

  toggleExperienceRoleShortlist(experienceRoleId) {
    const roles = this._getFromStorage('experience_roles', []);
    const roleExists = roles.some((r) => r.id === experienceRoleId);
    if (!roleExists) {
      return {
        isShortlisted: false,
        totalShortlistedExperienceRoles: this._getOrCreateShortlist().filter(
          (s) => s.itemType === 'experience_role'
        ).length,
        message: 'Experience role not found.'
      };
    }

    let shortlist = this._getOrCreateShortlist();
    const existingIndex = shortlist.findIndex(
      (s) => s.itemType === 'experience_role' && s.itemId === experienceRoleId
    );

    let isShortlisted;
    if (existingIndex >= 0) {
      shortlist.splice(existingIndex, 1);
      isShortlisted = false;
    } else {
      shortlist.push({
        id: this._generateId('shortlist'),
        itemType: 'experience_role',
        itemId: experienceRoleId,
        addedAt: this._nowIso()
      });
      isShortlisted = true;
    }

    this._saveToStorage('shortlist_items', shortlist);

    const totalShortlistedExperienceRoles = shortlist.filter(
      (s) => s.itemType === 'experience_role'
    ).length;

    return {
      isShortlisted,
      totalShortlistedExperienceRoles,
      message: isShortlisted
        ? 'Experience role added to shortlist.'
        : 'Experience role removed from shortlist.'
    };
  }

  getShortlistItemsDetailed() {
    const shortlist = this._getOrCreateShortlist();
    const projects = this._getFromStorage('projects', []);
    const roles = this._getFromStorage('experience_roles', []);

    const projectItems = shortlist
      .filter((s) => s.itemType === 'project')
      .map((s) => {
        const project = projects.find((p) => p.id === s.itemId) || null;
        return {
          shortlistItemId: s.id,
          addedAt: s.addedAt,
          project: project
            ? {
                id: project.id,
                title: project.title,
                slug: project.slug,
                categoryLabel: this._projectCategoryLabel(project.category),
                typeLabel: this._projectTypeLabel(project.type),
                industryLabel: this._industryLabel(project.industry),
                year: project.year,
                impactScore: project.impactScore,
                thumbnailImageUrl: project.thumbnailImageUrl || null
              }
            : null
        };
      });

    const experienceRoleItems = shortlist
      .filter((s) => s.itemType === 'experience_role')
      .map((s) => {
        const role = roles.find((r) => r.id === s.itemId) || null;
        return {
          shortlistItemId: s.id,
          addedAt: s.addedAt,
          role: role
            ? {
                id: role.id,
                title: role.title,
                companyName: role.companyName,
                industryLabel: this._industryLabel(role.industry),
                startDate: role.startDate || null,
                endDate: role.endDate || null,
                durationMonths: role.durationMonths
              }
            : null
        };
      });

    return {
      projects: projectItems,
      experienceRoles: experienceRoleItems
    };
  }

  removeShortlistItem(shortlistItemId) {
    let shortlist = this._getOrCreateShortlist();
    const index = shortlist.findIndex((s) => s.id === shortlistItemId);
    if (index === -1) {
      return { success: false, message: 'Shortlist item not found.' };
    }
    shortlist.splice(index, 1);
    this._saveToStorage('shortlist_items', shortlist);
    return { success: true, message: 'Shortlist item removed.' };
  }

  // ----------------------
  // COMPARISON
  // ----------------------

  addProjectToComparison(projectId) {
    const projects = this._getFromStorage('projects', []);
    const exists = projects.some((p) => p.id === projectId);
    if (!exists) {
      return {
        inComparison: false,
        comparisonCount: this._getOrCreateComparisonList().length,
        message: 'Project not found.'
      };
    }

    let comparison = this._getOrCreateComparisonList();
    const already = comparison.some((c) => c.projectId === projectId);
    if (!already) {
      comparison.push({
        id: this._generateId('comparison'),
        projectId,
        addedAt: this._nowIso()
      });
      this._saveToStorage('comparison_items', comparison);
    }

    return {
      inComparison: true,
      comparisonCount: comparison.length,
      message: already ? 'Project already in comparison.' : 'Project added to comparison.'
    };
  }

  removeProjectFromComparison(projectId) {
    let comparison = this._getOrCreateComparisonList();
    const index = comparison.findIndex((c) => c.projectId === projectId);
    if (index >= 0) {
      comparison.splice(index, 1);
      this._saveToStorage('comparison_items', comparison);
      return {
        inComparison: false,
        comparisonCount: comparison.length,
        message: 'Project removed from comparison.'
      };
    }
    return {
      inComparison: false,
      comparisonCount: comparison.length,
      message: 'Project not in comparison.'
    };
  }

  clearComparisonList() {
    this._saveToStorage('comparison_items', []);
    return {
      success: true,
      comparisonCount: 0,
      message: 'Comparison list cleared.'
    };
  }

  getComparisonView() {
    const comparison = this._getOrCreateComparisonList();
    const projects = this._getFromStorage('projects', []);

    const items = comparison.map((c) => {
      const project = projects.find((p) => p.id === c.projectId) || null;
      return {
        comparisonItemId: c.id,
        addedAt: c.addedAt,
        project: project
          ? {
              id: project.id,
              title: project.title,
              slug: project.slug,
              categoryLabel: this._projectCategoryLabel(project.category),
              typeLabel: this._projectTypeLabel(project.type),
              industryLabel: this._industryLabel(project.industry),
              tools: Array.isArray(project.tools) ? project.tools : [],
              durationMonths: project.durationMonths,
              durationLabel: project.durationLabel,
              impactScore: project.impactScore,
              summary: project.summary,
              year: project.year
            }
          : null
      };
    });

    return { projects: items };
  }

  // ----------------------
  // BLOG / READING LIST
  // ----------------------

  getBlogFilterOptions() {
    const posts = this._getFromStorage('blog_posts', []);

    const categoriesEnum = [
      'usability_testing',
      'product_design',
      'process',
      'case_studies',
      'career',
      'dashboard',
      'other'
    ];

    const categories = categoriesEnum.map((value) => ({
      value,
      label: this._blogCategoryLabel(value),
      count: posts.filter((p) => p.category === value).length
    }));

    const tagCounts = {};
    posts.forEach((p) => {
      if (Array.isArray(p.tags)) {
        p.tags.forEach((t) => {
          tagCounts[t] = (tagCounts[t] || 0) + 1;
        });
      }
    });
    const tags = Object.keys(tagCounts).map((value) => ({
      value,
      label: value,
      count: tagCounts[value]
    }));

    const readingTimeBuckets = [
      {
        value: 'under_5_minutes',
        label: 'Under 5 minutes',
        minMinutes: 0,
        maxMinutes: 4
      },
      {
        value: '6_plus_minutes',
        label: '6+ minutes',
        minMinutes: 6,
        maxMinutes: 999
      }
    ];

    let minDate = null;
    let maxDate = null;
    posts.forEach((p) => {
      if (p.publishedAt) {
        if (!minDate || p.publishedAt < minDate) minDate = p.publishedAt;
        if (!maxDate || p.publishedAt > maxDate) maxDate = p.publishedAt;
      }
    });

    const sortOptions = [
      { value: 'date_newest_first', label: 'Date  Newest first' },
      { value: 'date_oldest_first', label: 'Date  Oldest first' }
    ];

    return {
      categories,
      tags,
      readingTimeBuckets,
      defaultDateRange: {
        minDate,
        maxDate
      },
      sortOptions
    };
  }

  listBlogPosts(filters = {}, sort = 'date_newest_first', page = 1, pageSize = 10) {
    const posts = this._getFromStorage('blog_posts', []);
    const readingList = this._getOrCreateReadingList();

    let items = posts.slice();

    if (filters.category) {
      items = items.filter((p) => p.category === filters.category);
    }
    if (filters.tagsAny && filters.tagsAny.length) {
      const tagsAnyLower = filters.tagsAny.map((t) => String(t).toLowerCase());
      items = items.filter((p) => {
        const ptags = Array.isArray(p.tags) ? p.tags.map((t) => String(t).toLowerCase()) : [];
        return tagsAnyLower.some((t) => ptags.includes(t));
      });
    }
    if (typeof filters.minReadingTimeMinutes === 'number') {
      items = items.filter(
        (p) => typeof p.readingTimeMinutes === 'number' && p.readingTimeMinutes >= filters.minReadingTimeMinutes
      );
    }
    if (typeof filters.maxReadingTimeMinutes === 'number') {
      items = items.filter(
        (p) => typeof p.readingTimeMinutes === 'number' && p.readingTimeMinutes <= filters.maxReadingTimeMinutes
      );
    }

    if (filters.dateFrom) {
      const from = Date.parse(filters.dateFrom);
      items = items.filter((p) => {
        if (!p.publishedAt) return false;
        return Date.parse(p.publishedAt) >= from;
      });
    }
    if (filters.dateTo) {
      const to = Date.parse(filters.dateTo);
      items = items.filter((p) => {
        if (!p.publishedAt) return false;
        return Date.parse(p.publishedAt) <= to;
      });
    }

    if (filters.searchQuery && filters.searchQuery.trim()) {
      const q = filters.searchQuery.trim().toLowerCase();
      items = items.filter((p) => {
        const title = (p.title || '').toLowerCase();
        const content = (p.content || '').toLowerCase();
        return title.includes(q) || content.includes(q);
      });
    }

    items.sort((a, b) => {
      const da = a.publishedAt ? Date.parse(a.publishedAt) : 0;
      const db = b.publishedAt ? Date.parse(b.publishedAt) : 0;
      if (sort === 'date_oldest_first') return da - db;
      // default newest first
      return db - da;
    });

    const total = items.length;
    if (page < 1) page = 1;
    if (pageSize < 1) pageSize = 1;
    const start = (page - 1) * pageSize;
    const pagedItems = items.slice(start, start + pageSize);

    const resultItems = pagedItems.map((p) => {
      const isBookmarked = readingList.some((r) => r.blogPostId === p.id);
      return {
        id: p.id,
        title: p.title,
        slug: p.slug,
        excerpt: p.excerpt || '',
        category: p.category,
        categoryLabel: this._blogCategoryLabel(p.category),
        tags: Array.isArray(p.tags) ? p.tags : [],
        publishedAt: p.publishedAt || null,
        readingTimeMinutes: p.readingTimeMinutes,
        heroImageUrl: p.heroImageUrl || null,
        isFeatured: !!p.isFeatured,
        isBookmarked
      };
    });

    return {
      items: resultItems,
      total,
      page,
      pageSize
    };
  }

  getBlogPostDetails(slug, blogPostId) {
    const posts = this._getFromStorage('blog_posts', []);
    const readingList = this._getOrCreateReadingList();

    let post = null;
    if (slug) {
      post = posts.find((p) => p.slug === slug) || null;
    } else if (blogPostId) {
      post = posts.find((p) => p.id === blogPostId) || null;
    }
    if (!post) return null;

    const isBookmarked = readingList.some((r) => r.blogPostId === post.id);

    let relatedPosts = [];
    if (Array.isArray(post.relatedPostIds) && post.relatedPostIds.length) {
      relatedPosts = post.relatedPostIds
        .map((id) => posts.find((p) => p.id === id))
        .filter(Boolean)
        .map((p) => ({
          id: p.id,
          title: p.title,
          slug: p.slug,
          categoryLabel: this._blogCategoryLabel(p.category),
          publishedAt: p.publishedAt || null
        }));
    }

    return {
      id: post.id,
      title: post.title,
      slug: post.slug,
      content: post.content,
      category: post.category,
      categoryLabel: this._blogCategoryLabel(post.category),
      tags: Array.isArray(post.tags) ? post.tags : [],
      publishedAt: post.publishedAt || null,
      readingTimeMinutes: post.readingTimeMinutes,
      heroImageUrl: post.heroImageUrl || null,
      isBookmarked,
      relatedPosts
    };
  }

  toggleBlogPostReadingList(blogPostId) {
    const posts = this._getFromStorage('blog_posts', []);
    const exists = posts.some((p) => p.id === blogPostId);
    if (!exists) {
      return {
        isBookmarked: false,
        totalReadingListItems: this._getOrCreateReadingList().length,
        message: 'Blog post not found.'
      };
    }

    let readingList = this._getOrCreateReadingList();
    const index = readingList.findIndex((r) => r.blogPostId === blogPostId);

    let isBookmarked;
    if (index >= 0) {
      // Already bookmarked; keep it bookmarked (idempotent add)
      isBookmarked = true;
    } else {
      readingList.push({
        id: this._generateId('reading_list'),
        blogPostId,
        addedAt: this._nowIso()
      });
      isBookmarked = true;
    }

    this._saveToStorage('reading_list_items', readingList);

    return {
      isBookmarked,
      totalReadingListItems: readingList.length,
      message: isBookmarked ? 'Blog post bookmarked.' : 'Blog post removed from reading list.'
    };
  }

  getReadingListItemsDetailed() {
    const readingList = this._getOrCreateReadingList();
    const posts = this._getFromStorage('blog_posts', []);

    const items = readingList.map((r) => {
      const post = posts.find((p) => p.id === r.blogPostId) || null;
      return {
        readingListItemId: r.id,
        addedAt: r.addedAt,
        post: post
          ? {
              id: post.id,
              title: post.title,
              slug: post.slug,
              categoryLabel: this._blogCategoryLabel(post.category),
              publishedAt: post.publishedAt || null,
              readingTimeMinutes: post.readingTimeMinutes
            }
          : null
      };
    });

    return { posts: items };
  }

  // ----------------------
  // SKILLS
  // ----------------------

  getSkillFilterOptions() {
    const categories = [
      'research',
      'visual_design',
      'interaction_design',
      'information_architecture',
      'facilitation',
      'other'
    ].map((value) => ({
      value,
      label: this._skillCategoryLabel(value)
    }));

    const proficiencyLevels = ['advanced', 'intermediate', 'beginner'].map((value) => ({
      value,
      label: this._proficiencyLabel(value)
    }));

    return { categories, proficiencyLevels };
  }

  listSkills(filters = {}, sort = 'sort_index_asc') {
    let skills = this._getFromStorage('skills', []);

    if (filters.category) {
      skills = skills.filter((s) => s.category === filters.category);
    }
    if (filters.proficiencyLevel) {
      skills = skills.filter((s) => s.proficiencyLevel === filters.proficiencyLevel);
    }

    if (sort === 'name_asc') {
      skills.sort((a, b) => {
        const an = (a.name || '').toLowerCase();
        const bn = (b.name || '').toLowerCase();
        if (an < bn) return -1;
        if (an > bn) return 1;
        return 0;
      });
    } else {
      // sort_index_asc default
      skills.sort((a, b) => {
        const ai = typeof a.sortIndex === 'number' ? a.sortIndex : Number.MAX_SAFE_INTEGER;
        const bi = typeof b.sortIndex === 'number' ? b.sortIndex : Number.MAX_SAFE_INTEGER;
        if (ai !== bi) return ai - bi;
        const an = (a.name || '').toLowerCase();
        const bn = (b.name || '').toLowerCase();
        if (an < bn) return -1;
        if (an > bn) return 1;
        return 0;
      });
    }

    const items = skills.map((s) => ({
      id: s.id,
      name: s.name,
      category: s.category,
      categoryLabel: this._skillCategoryLabel(s.category),
      proficiencyLevel: s.proficiencyLevel,
      proficiencyLabel: this._proficiencyLabel(s.proficiencyLevel),
      description: s.description || '',
      sortIndex: s.sortIndex
    }));

    return { items };
  }

  submitSkillsMessage(message) {
    const trimmed = (message || '').trim();
    if (!trimmed) {
      return {
        success: false,
        skillsMessageId: null,
        createdAt: null,
        message: 'Message is required.'
      };
    }
    const msgs = this._getFromStorage('skills_messages', []);
    const id = this._generateId('skills_msg');
    const createdAt = this._nowIso();
    msgs.push({ id, message: trimmed, createdAt });
    this._saveToStorage('skills_messages', msgs);
    return {
      success: true,
      skillsMessageId: id,
      createdAt,
      message: 'Skills message submitted.'
    };
  }

  // ----------------------
  // EXPERIENCE
  // ----------------------

  listExperienceRoles(filters = {}, sort = 'start_date_newest_first') {
    const roles = this._getFromStorage('experience_roles', []);
    const shortlist = this._getOrCreateShortlist();

    let items = roles.slice();

    if (filters.industry) {
      items = items.filter((r) => r.industry === filters.industry);
    }

    if (filters.durationLabel) {
      if (filters.durationLabel === 'under_12_months') {
        items = items.filter((r) => typeof r.durationMonths === 'number' && r.durationMonths < 12);
      } else if (filters.durationLabel === 'twelve_plus_months') {
        items = items.filter((r) => typeof r.durationMonths === 'number' && r.durationMonths >= 12);
      }
    }
    if (typeof filters.minDurationMonths === 'number') {
      items = items.filter(
        (r) => typeof r.durationMonths === 'number' && r.durationMonths >= filters.minDurationMonths
      );
    }

    items.sort((a, b) => {
      const da = a.startDate ? Date.parse(a.startDate) : 0;
      const db = b.startDate ? Date.parse(b.startDate) : 0;
      if (sort === 'start_date_oldest_first') return da - db;
      // default newest first
      return db - da;
    });

    const mapped = items.map((r) => {
      const isShortlisted = shortlist.some(
        (s) => s.itemType === 'experience_role' && s.itemId === r.id
      );
      return {
        id: r.id,
        title: r.title,
        companyName: r.companyName,
        industry: r.industry,
        industryLabel: this._industryLabel(r.industry),
        location: r.location || '',
        startDate: r.startDate || null,
        endDate: r.endDate || null,
        durationMonths: r.durationMonths,
        summary: r.summary || '',
        isShortlisted
      };
    });

    return { items: mapped };
  }

  getExperienceRoleDetails(experienceRoleId) {
    const roles = this._getFromStorage('experience_roles', []);
    const shortlist = this._getOrCreateShortlist();

    const role = roles.find((r) => r.id === experienceRoleId) || null;
    if (!role) return null;

    const isShortlisted = shortlist.some(
      (s) => s.itemType === 'experience_role' && s.itemId === role.id
    );

    return {
      id: role.id,
      title: role.title,
      companyName: role.companyName,
      industry: role.industry,
      industryLabel: this._industryLabel(role.industry),
      location: role.location || '',
      startDate: role.startDate || null,
      endDate: role.endDate || null,
      durationMonths: role.durationMonths,
      summary: role.summary || '',
      responsibilities: Array.isArray(role.responsibilities) ? role.responsibilities : [],
      highlights: Array.isArray(role.highlights) ? role.highlights : [],
      isShortlisted
    };
  }

  // ----------------------
  // CONTACT
  // ----------------------

  getContactPageConfig() {
    let cfg = this._getFromStorage('contact_page_config', null);
    if (!cfg) {
      cfg = {
        budgetRanges: [
          {
            value: 'under_5k',
            label: 'Under $5k',
            description: 'Smaller engagements or audits.'
          },
          {
            value: '5k_10k',
            label: '$5k 10k',
            description: 'Focused project scope.'
          },
          {
            value: '10k_25k',
            label: '$10k 25k',
            description: 'End-to-end or multi-phase work.'
          },
          {
            value: 'over_25k',
            label: 'Over $25k',
            description: 'Large or long-running engagements.'
          }
        ],
        timelineOptions: [
          {
            value: 'asap',
            label: 'ASAP',
            description: 'Ready to start immediately.'
          },
          {
            value: 'within_1_month',
            label: 'Within 1 month',
            description: 'Kickoff in the next few weeks.'
          },
          {
            value: 'within_3_months',
            label: 'Within 3 months',
            description: 'Planning ahead a bit.'
          },
          {
            value: 'three_to_six_months',
            label: '3 6 months',
            description: 'Longer-term planning.'
          },
          {
            value: 'flexible',
            label: 'Flexible',
            description: 'Open to discussing timing.'
          }
        ],
        instructions: 'Share a bit about your project, budget, and timing, and Ill follow up with next steps.'
      };
      this._saveToStorage('contact_page_config', cfg);
    }

    // Instrumentation for task completion tracking
    try {
      const pref = this._getOrCreateThemePreference();
      if (pref && pref.themeMode === 'dark') {
        const key = 'task6_darkModeJourney';
        let raw = localStorage.getItem(key);
        let obj;
        try {
          obj = raw ? JSON.parse(raw) : {};
        } catch (e) {
          obj = {};
        }

        if (!obj || typeof obj !== 'object') obj = {};
        obj.contactVisitedInDarkMode = true;
        obj.contactVisitedAt = this._nowIso();

        localStorage.setItem(key, JSON.stringify(obj));
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return cfg;
  }

  submitContactRequest(
    name,
    email,
    budgetRange,
    timeline,
    message,
    referencedProjectTitle
  ) {
    const trimmedName = (name || '').trim();
    const trimmedEmail = (email || '').trim();
    const trimmedMessage = (message || '').trim();
    if (!trimmedName || !trimmedEmail || !trimmedMessage) {
      return {
        success: false,
        contactRequestId: null,
        createdAt: null,
        message: 'Name, email, and message are required.'
      };
    }

    const validBudget = ['under_5k', '5k_10k', '10k_25k', 'over_25k'];
    const validTimeline = [
      'asap',
      'within_1_month',
      'within_3_months',
      'three_to_six_months',
      'flexible'
    ];

    if (!validBudget.includes(budgetRange)) {
      return {
        success: false,
        contactRequestId: null,
        createdAt: null,
        message: 'Invalid budget range.'
      };
    }
    if (!validTimeline.includes(timeline)) {
      return {
        success: false,
        contactRequestId: null,
        createdAt: null,
        message: 'Invalid timeline.'
      };
    }

    const requests = this._getFromStorage('contact_requests', []);
    const id = this._generateId('contact');
    const createdAt = this._nowIso();

    const payload = {
      id,
      name: trimmedName,
      email: trimmedEmail,
      budgetRange,
      timeline,
      message: trimmedMessage,
      referencedProjectTitle: referencedProjectTitle || undefined,
      createdAt
    };

    requests.push(payload);
    this._saveToStorage('contact_requests', requests);

    return {
      success: true,
      contactRequestId: id,
      createdAt,
      message: 'Contact request submitted.'
    };
  }

  // ----------------------
  // SERVICES / ENGAGEMENT
  // ----------------------

  getServiceEngagementConfig() {
    const serviceOfferings = this._getFromStorage('service_offerings', []);

    const engagementTypes = [
      {
        value: 'end_to_end_product_design',
        label: 'End-to-end product design',
        description: 'From discovery and research through UI, prototyping, and handoff.'
      },
      {
        value: 'ux_audit',
        label: 'UX audit',
        description: 'Heuristic review and prioritized recommendations.'
      },
      {
        value: 'design_sprint',
        label: 'Design sprint',
        description: 'Intensive, time-boxed problem-solving collaboration.'
      },
      {
        value: 'consulting',
        label: 'Consulting',
        description: 'Flexible design and product consulting support.'
      }
    ];

    const services = serviceOfferings
      .slice()
      .sort((a, b) => {
        const ai = typeof a.sortIndex === 'number' ? a.sortIndex : Number.MAX_SAFE_INTEGER;
        const bi = typeof b.sortIndex === 'number' ? b.sortIndex : Number.MAX_SAFE_INTEGER;
        return ai - bi;
      });

    const collaborationStyles = [
      { value: 'remote', label: 'Remote' },
      { value: 'onsite', label: 'Onsite' },
      { value: 'hybrid', label: 'Hybrid' }
    ];

    const budgetRanges = [
      { value: 'under_5k', label: 'Under $5k' },
      { value: '5k_10k', label: '$5k 10k' },
      { value: '10k_25k', label: '$10k 25k' },
      { value: 'over_25k', label: 'Over $25k' }
    ];

    const defaultStartDateHint = 'Most projects can begin within 2 4 weeks depending on scope.';

    return {
      engagementTypes,
      services,
      collaborationStyles,
      budgetRanges,
      defaultStartDateHint
    };
  }

  createServiceEngagementRequest(
    engagementType,
    selectedServiceIds,
    preferredStartDate,
    collaborationStyle,
    budgetRange,
    projectGoals
  ) {
    const validEngagementTypes = [
      'end_to_end_product_design',
      'ux_audit',
      'design_sprint',
      'consulting'
    ];
    const validCollab = ['remote', 'onsite', 'hybrid'];
    const validBudget = ['under_5k', '5k_10k', '10k_25k', 'over_25k'];

    if (!validEngagementTypes.includes(engagementType)) {
      return {
        success: false,
        serviceEngagementRequestId: null,
        createdAt: null,
        proposalSummary: 'Invalid engagement type.'
      };
    }
    if (!Array.isArray(selectedServiceIds) || selectedServiceIds.length === 0) {
      return {
        success: false,
        serviceEngagementRequestId: null,
        createdAt: null,
        proposalSummary: 'At least one service must be selected.'
      };
    }
    if (!validCollab.includes(collaborationStyle)) {
      return {
        success: false,
        serviceEngagementRequestId: null,
        createdAt: null,
        proposalSummary: 'Invalid collaboration style.'
      };
    }
    if (!validBudget.includes(budgetRange)) {
      return {
        success: false,
        serviceEngagementRequestId: null,
        createdAt: null,
        proposalSummary: 'Invalid budget range.'
      };
    }
    const trimmedGoals = (projectGoals || '').trim();
    if (!trimmedGoals) {
      return {
        success: false,
        serviceEngagementRequestId: null,
        createdAt: null,
        proposalSummary: 'Project goals are required.'
      };
    }

    const offerings = this._getFromStorage('service_offerings', []);
    const selectedServices = selectedServiceIds
      .map((id) => offerings.find((s) => s.id === id))
      .filter(Boolean);

    const startDateIso = preferredStartDate
      ? new Date(preferredStartDate).toISOString()
      : null;

    const id = this._generateId('service_eng');
    const createdAt = this._nowIso();

    const serviceNames = selectedServices.map((s) => s.name || s.key).join(', ');

    const collabLabel =
      collaborationStyle === 'remote'
        ? 'remote'
        : collaborationStyle === 'onsite'
        ? 'onsite'
        : 'hybrid';

    const proposalSummary =
      'Engagement type: ' +
      engagementType.replace(/_/g, ' ') +
      '. Services: ' +
      serviceNames +
      '. Preferred start date: ' +
      (startDateIso || 'not specified') +
      '. Collaboration style: ' +
      collabLabel +
      '. Budget range: ' +
      budgetRange.replace(/_/g, ' ') +
      '. Goals: ' +
      trimmedGoals;

    const requests = this._getFromStorage('service_engagement_requests', []);
    requests.push({
      id,
      engagementType,
      selectedServiceIds,
      preferredStartDate: startDateIso,
      collaborationStyle,
      budgetRange,
      projectGoals: trimmedGoals,
      proposalSummary,
      createdAt
    });
    this._saveToStorage('service_engagement_requests', requests);

    return {
      success: true,
      serviceEngagementRequestId: id,
      createdAt,
      proposalSummary
    };
  }

  // ----------------------
  // GLOBAL SEARCH
  // ----------------------

  searchGlobal(query, limitProjects = 5, limitBlogPosts = 5) {
    const q = (query || '').trim().toLowerCase();
    if (!q) {
      return {
        projects: [],
        blogPosts: [],
        totalProjects: 0,
        totalBlogPosts: 0
      };
    }

    const projects = this._getFromStorage('projects', []);
    const posts = this._getFromStorage('blog_posts', []);

    const projectResults = [];
    projects.forEach((p) => {
      const title = (p.title || '').toLowerCase();
      const summary = (p.summary || '').toLowerCase();
      let score = 0;
      if (title.includes(q)) score += 3;
      if (summary.includes(q)) score += 1;
      if (score > 0) {
        const snippetSource = p.summary || p.description || '';
        const snippet = snippetSource.substring(0, 160);
        projectResults.push({
          id: p.id,
          title: p.title,
          slug: p.slug,
          categoryLabel: this._projectCategoryLabel(p.category),
          snippet,
          matchScore: score
        });
      }
    });

    const blogResults = [];
    posts.forEach((p) => {
      const title = (p.title || '').toLowerCase();
      const content = (p.content || '').toLowerCase();
      let score = 0;
      if (title.includes(q)) score += 3;
      if (content.includes(q)) score += 1;
      if (score > 0) {
        const snippetSource = p.excerpt || p.content || '';
        const snippet = snippetSource.substring(0, 160);
        blogResults.push({
          id: p.id,
          title: p.title,
          slug: p.slug,
          categoryLabel: this._blogCategoryLabel(p.category),
          snippet,
          matchScore: score
        });
      }
    });

    projectResults.sort((a, b) => b.matchScore - a.matchScore || a.title.localeCompare(b.title));
    blogResults.sort((a, b) => b.matchScore - a.matchScore || a.title.localeCompare(b.title));

    const totalProjects = projectResults.length;
    const totalBlogPosts = blogResults.length;

    return {
      projects: projectResults.slice(0, limitProjects),
      blogPosts: blogResults.slice(0, limitBlogPosts),
      totalProjects,
      totalBlogPosts
    };
  }

  // ----------------------
  // ABOUT / LEGAL PAGES
  // ----------------------

  getAboutPageContent() {
    let content = this._getFromStorage('about_page_content', null);
    if (!content) {
      content = {
        headline: 'About',
        subheadline: 'Designer and problem-solver focused on usable, thoughtful products.',
        biographyHtml:
          '<p>This portfolio highlights selected work across product design, research, and front-end collaboration. For each project, I focus on the problem, approach, and measurable impact.</p>',
        highlights: [],
        notableClients: []
      };
      this._saveToStorage('about_page_content', content);
    }

    // Instrumentation for task completion tracking
    try {
      const pref = this._getOrCreateThemePreference();
      if (pref && pref.themeMode === 'dark') {
        const key = 'task6_darkModeJourney';
        let raw = localStorage.getItem(key);
        let obj;
        try {
          obj = raw ? JSON.parse(raw) : {};
        } catch (e) {
          obj = {};
        }

        if (!obj || typeof obj !== 'object') obj = {};
        obj.aboutVisitedInDarkMode = true;

        localStorage.setItem(key, JSON.stringify(obj));
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return content;
  }

  getPrivacyPolicyContent() {
    let content = this._getFromStorage('privacy_policy_content', null);
    if (!content) {
      content = {
        lastUpdated: this._nowIso(),
        contentHtml:
          '<p>This site uses local storage in your browser to remember preferences such as theme, and to store any shortlist or reading list items you save. No personal data is sent to a server by this logic layer.</p>'
      };
      this._saveToStorage('privacy_policy_content', content);
    }
    return content;
  }

  getTermsOfUseContent() {
    let content = this._getFromStorage('terms_of_use_content', null);
    if (!content) {
      content = {
        lastUpdated: this._nowIso(),
        contentHtml:
          '<p>All project details and writing are provided for informational purposes only and remain the property of their respective owners.</p>'
      };
      this._saveToStorage('terms_of_use_content', content);
    }
    return content;
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