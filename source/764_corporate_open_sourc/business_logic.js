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

  // ---------------------- Storage Helpers ----------------------

  _initStorage() {
    const keys = [
      "projects",
      "issues",
      "project_subscriptions",
      "project_bookmarks",
      "policies",
      "policy_reading_list_items",
      "project_proposals",
      "events",
      "event_registrations",
      "component_libraries",
      "pinned_documentation",
      "security_advisories",
      "risk_watchlist_items"
    ];

    for (const key of keys) {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    }

    if (!localStorage.getItem("idCounter")) {
      localStorage.setItem("idCounter", "1000");
    }
  }

  _getFromStorage(key, defaultValue = []) {
    const data = localStorage.getItem(key);
    if (data === null || data === undefined) {
      return defaultValue;
    }
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
    const current = parseInt(localStorage.getItem("idCounter") || "1000", 10);
    const next = current + 1;
    localStorage.setItem("idCounter", String(next));
    return next;
  }

  _generateId(prefix) {
    return prefix + "_" + this._getNextIdCounter();
  }

  _getCurrentUserContext() {
    // Single-user context for this SDK; extend here if multi-user is added later.
    return { userId: "current_user" };
  }

  // ---------------------- Generic Helpers ----------------------

  _applyPagination(items, page, page_size) {
    const p = Number(page) && Number(page) > 0 ? Number(page) : 1;
    const ps = Number(page_size) && Number(page_size) > 0 ? Number(page_size) : 20;
    const total_count = items.length;
    const start = (p - 1) * ps;
    const end = start + ps;
    const pagedItems = items.slice(start, end);
    return { items: pagedItems, total_count, page: p, page_size: ps };
  }

  _normalizeDateFilter(from, to, preset) {
    // Returns { from: isoOrNull, to: isoOrNull }
    if (preset && (!from && !to)) {
      const now = new Date();
      let fromDate = null;
      let toDate = null;

      if (preset === "last_7_days") {
        toDate = now;
        fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      } else if (preset === "last_30_days") {
        toDate = now;
        fromDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      } else if (preset === "last_90_days") {
        toDate = now;
        fromDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      }

      return {
        from: fromDate ? fromDate.toISOString() : null,
        to: toDate ? toDate.toISOString() : null
      };
    }

    return {
      from: from || null,
      to: to || null
    };
  }

  _resolveSortOption(entityType, sortBy) {
    // Returns a comparator function (a, b) => number
    const defaultComparator = () => 0;

    const comparators = {
      project: {
        recently_updated: (a, b) => new Date(b.last_updated_at) - new Date(a.last_updated_at),
        stars_high_to_low: (a, b) => (b.stars || 0) - (a.stars || 0),
        stars_low_to_high: (a, b) => (a.stars || 0) - (b.stars || 0)
      },
      policy: {
        last_updated_newest_first: (a, b) => new Date(b.last_updated_at) - new Date(a.last_updated_at),
        last_updated_oldest_first: (a, b) => new Date(a.last_updated_at) - new Date(b.last_updated_at)
      },
      event: {
        date_soonest_first: (a, b) => new Date(a.start_datetime) - new Date(b.start_datetime),
        date_latest_first: (a, b) => new Date(b.start_datetime) - new Date(a.start_datetime)
      },
      issue: {
        newest_first: (a, b) => new Date(b.created_at) - new Date(a.created_at),
        oldest_first: (a, b) => new Date(a.created_at) - new Date(b.created_at),
        least_effort: (a, b) => {
          const ae = typeof a.estimated_effort_hours === "number" ? a.estimated_effort_hours : Number.POSITIVE_INFINITY;
          const be = typeof b.estimated_effort_hours === "number" ? b.estimated_effort_hours : Number.POSITIVE_INFINITY;
          return ae - be;
        },
        most_effort: (a, b) => {
          const ae = typeof a.estimated_effort_hours === "number" ? a.estimated_effort_hours : Number.NEGATIVE_INFINITY;
          const be = typeof b.estimated_effort_hours === "number" ? b.estimated_effort_hours : Number.NEGATIVE_INFINITY;
          return be - ae;
        }
      },
      component_library: {
        last_updated_newest_first: (a, b) => new Date(b.last_updated_at) - new Date(a.last_updated_at),
        last_updated_oldest_first: (a, b) => new Date(a.last_updated_at) - new Date(b.last_updated_at)
      },
      security_advisory: {
        impact_score_high_to_low: (a, b) => (b.impact_score || 0) - (a.impact_score || 0),
        reported_date_newest_first: (a, b) => new Date(b.reported_at) - new Date(a.reported_at),
        reported_date_oldest_first: (a, b) => new Date(a.reported_at) - new Date(b.reported_at)
      }
    };

    const entityComparators = comparators[entityType] || {};
    const comparator = entityComparators[sortBy] || Object.values(entityComparators)[0] || defaultComparator;
    return comparator;
  }

  _unique(array) {
    return Array.from(new Set(array));
  }

  _stringIncludes(haystack, needle) {
    if (!haystack || !needle) return false;
    return haystack.toLowerCase().includes(needle.toLowerCase());
  }

  // ---------------------- Interface Implementations ----------------------

  // 1. getHomePageContent
  getHomePageContent() {
    const projects = this._getFromStorage("projects", []);
    const events = this._getFromStorage("events", []);
    const securityAdvisories = this._getFromStorage("security_advisories", []);

    // Key stats
    const projects_count = projects.length;

    // active_contributors_count is not modeled; allow optional override via localStorage key, else 0
    const rawContrib = localStorage.getItem("active_contributors_count");
    const active_contributors_count = rawContrib ? parseInt(rawContrib, 10) || 0 : 0;

    // departments_involved_count from using_departments + owning_business_unit
    const deptSet = new Set();
    for (const p of projects) {
      if (Array.isArray(p.using_departments)) {
        for (const d of p.using_departments) {
          if (d) deptSet.add(d);
        }
      }
      if (p.owning_business_unit) {
        deptSet.add(p.owning_business_unit);
      }
    }
    const departments_involved_count = deptSet.size;

    // last_updated_at for stats: max project.last_updated_at or now
    let lastUpdated = null;
    for (const p of projects) {
      if (p.last_updated_at) {
        const d = new Date(p.last_updated_at);
        if (!lastUpdated || d > lastUpdated) lastUpdated = d;
      }
    }
    const last_updated_at = (lastUpdated || new Date()).toISOString();

    // Featured beginner-friendly projects: first few that match
    const featured_beginner_projects = projects
      .filter(p => p.experience_level === "beginner_friendly")
      .slice(0, 3);

    // Upcoming events: start_datetime in future
    const now = new Date();
    const upcoming_events = events
      .filter(e => e.start_datetime && new Date(e.start_datetime) > now)
      .sort(this._resolveSortOption("event", "date_soonest_first"))
      .slice(0, 5);

    // Highlighted security advisories: critical/high and not resolved
    const highlighted_security_advisories = securityAdvisories
      .filter(a => (a.severity === "critical" || a.severity === "high") && a.status !== "resolved")
      .sort(this._resolveSortOption("security_advisory", "impact_score_high_to_low"))
      .slice(0, 5);

    return {
      initiative_title: "Corporate Open Source Initiative",
      initiative_tagline: "Collaborate, contribute, and grow our open source ecosystem.",
      mission_statement:
        "Our mission is to foster sustainable open source projects across the organization, " +
        "enabling teams to collaborate in the open, share reusable components, and give back to the community.",
      key_stats: {
        projects_count,
        active_contributors_count,
        departments_involved_count,
        last_updated_at
      },
      featured_beginner_projects,
      upcoming_events,
      highlighted_security_advisories
    };
  }

  // 2. getProjectsFilterOptions
  getProjectsFilterOptions() {
    const projects = this._getFromStorage("projects", []);
    const issues = this._getFromStorage("issues", []);

    const languages = [
      { value: "python", label: "Python" },
      { value: "javascript", label: "JavaScript" },
      { value: "typescript", label: "TypeScript" },
      { value: "java", label: "Java" },
      { value: "go", label: "Go" },
      { value: "ruby", label: "Ruby" },
      { value: "other", label: "Other" }
    ];

    const experience_levels = [
      { value: "beginner_friendly", label: "Beginner-friendly" },
      { value: "intermediate", label: "Intermediate" },
      { value: "advanced", label: "Advanced" },
      { value: "all_levels", label: "All levels" }
    ];

    // Collect distinct issue labels from issues
    const labelSet = new Set();
    for (const issue of issues) {
      if (Array.isArray(issue.labels)) {
        for (const l of issue.labels) {
          if (l) labelSet.add(l);
        }
      }
    }
    const issue_labels = Array.from(labelSet);

    // Collect categories from projects
    const catSet = new Set();
    for (const p of projects) {
      if (Array.isArray(p.categories)) {
        for (const c of p.categories) {
          if (c) catSet.add(c);
        }
      }
    }
    const categories = Array.from(catSet);

    const business_units = [
      "analytics",
      "engineering",
      "marketing",
      "security",
      "legal",
      "it",
      "other"
    ];

    const departments = [
      "analytics",
      "engineering",
      "marketing",
      "security",
      "legal",
      "it",
      "other"
    ];

    // Stars range from existing projects
    let minStars = null;
    let maxStars = null;
    for (const p of projects) {
      if (typeof p.stars === "number") {
        if (minStars === null || p.stars < minStars) minStars = p.stars;
        if (maxStars === null || p.stars > maxStars) maxStars = p.stars;
      }
    }
    if (minStars === null) minStars = 0;
    if (maxStars === null) maxStars = 0;

    const last_updated_presets = [
      { value: "last_7_days", label: "Last 7 days" },
      { value: "last_30_days", label: "Last 30 days" },
      { value: "last_90_days", label: "Last 90 days" }
    ];

    const sort_options = [
      { value: "recently_updated", label: "Recently updated" },
      { value: "stars_high_to_low", label: "Stars – High to Low" },
      { value: "stars_low_to_high", label: "Stars – Low to High" }
    ];

    return {
      languages,
      experience_levels,
      issue_labels,
      categories,
      business_units,
      departments,
      stars_range: { min: minStars, max: maxStars },
      last_updated_presets,
      sort_options
    };
  }

  // 3. searchProjects(filters, sort_by, page, page_size)
  searchProjects(filters, sort_by, page, page_size) {
    const projects = this._getFromStorage("projects", []);
    const issues = this._getFromStorage("issues", []);
    const f = filters || {};

    let results = projects.filter(p => {
      if (f.primary_language && p.primary_language !== f.primary_language) return false;
      if (f.experience_level && p.experience_level !== f.experience_level) return false;

      if (typeof f.has_good_first_issues === "boolean") {
        const hasGfi = !!p.has_good_first_issues;
        if (hasGfi !== f.has_good_first_issues) return false;
      }

      if (Array.isArray(f.categories) && f.categories.length > 0) {
        const pcats = Array.isArray(p.categories) ? p.categories : [];
        const intersects = f.categories.some(c => pcats.includes(c));
        if (!intersects) return false;
      }

      if (f.owning_business_unit && p.owning_business_unit !== f.owning_business_unit) return false;

      if (f.using_department) {
        const uds = Array.isArray(p.using_departments) ? p.using_departments : [];
        if (!uds.includes(f.using_department)) return false;
      }

      if (typeof f.stars_min === "number") {
        if (typeof p.stars !== "number" || p.stars < f.stars_min) return false;
      }

      if (typeof f.stars_max === "number") {
        if (typeof p.stars !== "number" || p.stars > f.stars_max) return false;
      }

      if (f.last_updated_from) {
        if (!p.last_updated_at || new Date(p.last_updated_at) < new Date(f.last_updated_from)) return false;
      }

      if (f.last_updated_to) {
        if (!p.last_updated_at || new Date(p.last_updated_at) > new Date(f.last_updated_to)) return false;
      }

      if (f.text_query) {
        const q = f.text_query.toLowerCase();
        const name = (p.name || "").toLowerCase();
        const desc = (p.description || "").toLowerCase();
        if (!name.includes(q) && !desc.includes(q)) return false;
      }

      return true;
    });

    // Issue label-based filtering (hierarchical relation Issue -> Project)
    if (Array.isArray(f.issue_labels) && f.issue_labels.length > 0) {
      const labelsLower = f.issue_labels.map(l => l.toLowerCase());
      const projectHasLabel = new Set();

      for (const issue of issues) {
        if (Array.isArray(issue.labels) && issue.project_id) {
          const issueLabelsLower = issue.labels.map(l => String(l).toLowerCase());
          const intersects = labelsLower.some(l => issueLabelsLower.includes(l));
          if (intersects) {
            projectHasLabel.add(issue.project_id);
          }
        }
      }

      results = results.filter(p => projectHasLabel.has(p.id));
    }

    const comparator = this._resolveSortOption("project", sort_by || "recently_updated");
    const sorted = [...results].sort(comparator);

    const { items, total_count, page: p, page_size: ps } = this._applyPagination(sorted, page, page_size);

    // Instrumentation for task completion tracking
    try {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      let matchesTask1 = true;

      if (!filters || typeof filters !== "object") {
        matchesTask1 = false;
      } else {
        if (filters.primary_language !== "python") {
          matchesTask1 = false;
        } else if (filters.experience_level !== "beginner_friendly") {
          matchesTask1 = false;
        } else if (!Array.isArray(filters.issue_labels)) {
          matchesTask1 = false;
        } else {
          const hasGoodFirstIssue = filters.issue_labels.some(label => {
            const labelStr = String(label).toLowerCase();
            return labelStr.includes("good first issue");
          });
          if (!hasGoodFirstIssue) {
            matchesTask1 = false;
          }
        }

        if (matchesTask1) {
          if (typeof filters.stars_min !== "number" || filters.stars_min < 10) {
            matchesTask1 = false;
          }
        }

        if (matchesTask1 && filters.last_updated_from) {
          const fromDate = new Date(filters.last_updated_from);
          if (
            isNaN(fromDate.getTime()) ||
            fromDate < thirtyDaysAgo ||
            fromDate > now
          ) {
            matchesTask1 = false;
          }
        }

        if (matchesTask1 && sort_by !== "recently_updated") {
          matchesTask1 = false;
        }
      }

      if (matchesTask1) {
        localStorage.setItem(
          "task1_searchParams",
          JSON.stringify({ filters, sort_by, searched_at: new Date().toISOString() })
        );
      }
    } catch (e) {
      console.error("Instrumentation error:", e);
    }

    return {
      projects: items,
      total_count,
      page: p,
      page_size: ps
    };
  }

  // 4. getProjectDetail(projectId)
  getProjectDetail(projectId) {
    const projects = this._getFromStorage("projects", []);
    const issues = this._getFromStorage("issues", []);
    const subscriptions = this._getFromStorage("project_subscriptions", []);
    const bookmarks = this._getFromStorage("project_bookmarks", []);

    const project = projects.find(p => p.id === projectId) || null;
    if (!project) {
      return {
        project: null,
        has_contribution_guide: false,
        contribution_guide_content: null,
        issues_summary: {
          open_issues_count: 0,
          good_first_issues_count: 0,
          documentation_issues_count: 0
        },
        security_summary: {
          open_security_issues_count: 0,
          total_security_issues_count: 0
        },
        is_bookmarked: false,
        active_subscriptions_count: 0
      };
    }

    const projectIssues = issues.filter(i => i.project_id === projectId);
    let openCount = 0;
    let gfiCount = 0;
    let docCount = 0;
    for (const issue of projectIssues) {
      if (issue.status === "open") openCount += 1;
      if (Array.isArray(issue.labels)) {
        if (issue.labels.includes("good first issue")) gfiCount += 1;
        if (issue.labels.includes("documentation")) docCount += 1;
      }
    }

    const issues_summary = {
      open_issues_count: openCount,
      good_first_issues_count: gfiCount,
      documentation_issues_count: docCount
    };

    const security_summary = {
      open_security_issues_count: typeof project.open_security_issues_count === "number" ? project.open_security_issues_count : 0,
      total_security_issues_count: typeof project.total_security_issues_count === "number" ? project.total_security_issues_count : 0
    };

    const is_bookmarked = bookmarks.some(b => b.project_id === projectId);
    const active_subscriptions_count = subscriptions.filter(s => s.project_id === projectId && s.active).length;

    // Instrumentation for task completion tracking
    try {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      let matchesTask1 = true;

      if (project.primary_language !== "python") {
        matchesTask1 = false;
      } else if (project.experience_level !== "beginner_friendly") {
        matchesTask1 = false;
      } else if (typeof project.stars !== "number" || project.stars < 10) {
        matchesTask1 = false;
      } else if (!project.last_updated_at) {
        matchesTask1 = false;
      } else {
        const lastUpdatedDate = new Date(project.last_updated_at);
        if (
          isNaN(lastUpdatedDate.getTime()) ||
          lastUpdatedDate < thirtyDaysAgo ||
          lastUpdatedDate > now
        ) {
          matchesTask1 = false;
        }
      }

      if (matchesTask1 && !project.has_contribution_guide) {
        matchesTask1 = false;
      }

      if (matchesTask1 && (!issues_summary || issues_summary.good_first_issues_count <= 0)) {
        matchesTask1 = false;
      }

      if (matchesTask1) {
        localStorage.setItem(
          "task1_selectedProject",
          JSON.stringify({ project_id: projectId, viewed_at: new Date().toISOString() })
        );
      }
    } catch (e) {
      console.error("Instrumentation error:", e);
    }

    return {
      project,
      has_contribution_guide: !!project.has_contribution_guide,
      contribution_guide_content: project.contribution_guide_content || null,
      issues_summary,
      security_summary,
      is_bookmarked,
      active_subscriptions_count
    };
  }

  // 5. getProjectIssues(projectId, filters, sort_by, page, page_size)
  getProjectIssues(projectId, filters, sort_by, page, page_size) {
    const issues = this._getFromStorage("issues", []);
    const projects = this._getFromStorage("projects", []);
    const project = projects.find(p => p.id === projectId) || null;
    const f = filters || {};

    let projectIssues = issues.filter(i => i.project_id === projectId);

    if (Array.isArray(f.labels) && f.labels.length > 0) {
      const labelsLower = f.labels.map(l => l.toLowerCase());
      projectIssues = projectIssues.filter(issue => {
        if (!Array.isArray(issue.labels) || issue.labels.length === 0) return false;
        const issueLabelsLower = issue.labels.map(l => String(l).toLowerCase());
        return labelsLower.some(l => issueLabelsLower.includes(l));
      });
    }

    if (typeof f.estimated_effort_max_hours === "number") {
      projectIssues = projectIssues.filter(issue => {
        if (typeof issue.estimated_effort_hours !== "number") return false;
        return issue.estimated_effort_hours <= f.estimated_effort_max_hours;
      });
    }

    if (typeof f.estimated_effort_min_hours === "number") {
      projectIssues = projectIssues.filter(issue => {
        if (typeof issue.estimated_effort_hours !== "number") return false;
        return issue.estimated_effort_hours >= f.estimated_effort_min_hours;
      });
    }

    if (f.status) {
      projectIssues = projectIssues.filter(issue => issue.status === f.status);
    }

    if (typeof f.volunteered_by_current_user === "boolean") {
      projectIssues = projectIssues.filter(issue => !!issue.volunteered_by_current_user === f.volunteered_by_current_user);
    }

    const comparator = this._resolveSortOption("issue", sort_by || "newest_first");
    const sorted = [...projectIssues].sort(comparator);

    const { items, total_count, page: p, page_size: ps } = this._applyPagination(sorted, page, page_size);

    // Foreign key resolution: each issue should include its project object
    const issuesWithProject = items.map(issue => ({
      ...issue,
      project
    }));

    return {
      issues: issuesWithProject,
      total_count,
      page: p,
      page_size: ps
    };
  }

  // 6. subscribeToProjectUpdates(projectId, frequency, topics)
  subscribeToProjectUpdates(projectId, frequency, topics) {
    const allowedFrequencies = ["immediate", "daily", "weekly", "monthly"];
    if (!allowedFrequencies.includes(frequency)) {
      return { success: false, message: "Invalid frequency", subscription: null };
    }

    if (!Array.isArray(topics) || topics.length === 0) {
      return { success: false, message: "At least one topic is required", subscription: null };
    }

    const projects = this._getFromStorage("projects", []);
    const project = projects.find(p => p.id === projectId) || null;
    if (!project) {
      return { success: false, message: "Project not found", subscription: null };
    }

    let subscriptions = this._getFromStorage("project_subscriptions", []);

    let subscription = subscriptions.find(s => s.project_id === projectId) || null;
    const nowIso = new Date().toISOString();

    if (subscription) {
      subscription.frequency = frequency;
      subscription.topics = topics;
      subscription.active = true;
      // keep original created_at
    } else {
      subscription = {
        id: this._generateId("project_subscription"),
        project_id: projectId,
        frequency,
        topics,
        active: true,
        created_at: nowIso
      };
      subscriptions.push(subscription);
    }

    this._saveToStorage("project_subscriptions", subscriptions);

    // Update convenience subscription_count on project
    const countForProject = subscriptions.filter(s => s.project_id === projectId && s.active).length;
    project.subscription_count = countForProject;
    this._saveToStorage("projects", projects);

    // Foreign key resolution: include project object
    const subscriptionWithProject = {
      ...subscription,
      project
    };

    return {
      success: true,
      message: "Subscription saved",
      subscription: subscriptionWithProject
    };
  }

  // 7. bookmarkProject(projectId, label)
  bookmarkProject(projectId, label) {
    const projects = this._getFromStorage("projects", []);
    const project = projects.find(p => p.id === projectId) || null;
    if (!project) {
      return { success: false, message: "Project not found", bookmark: null };
    }

    let bookmarks = this._getFromStorage("project_bookmarks", []);
    let bookmark = bookmarks.find(b => b.project_id === projectId) || null;
    const nowIso = new Date().toISOString();

    if (bookmark) {
      if (typeof label === "string") {
        bookmark.label = label;
      }
      // keep original created_at
    } else {
      bookmark = {
        id: this._generateId("project_bookmark"),
        project_id: projectId,
        label: typeof label === "string" ? label : undefined,
        created_at: nowIso
      };
      bookmarks.push(bookmark);
    }

    this._saveToStorage("project_bookmarks", bookmarks);

    // Convenience flag on project
    project.is_bookmarked = true;
    this._saveToStorage("projects", projects);

    const bookmarkWithProject = {
      ...bookmark,
      project
    };

    return {
      success: true,
      message: "Project bookmarked",
      bookmark: bookmarkWithProject
    };
  }

  // 8. getIssueDetail(issueId)
  getIssueDetail(issueId) {
    const issues = this._getFromStorage("issues", []);
    const projects = this._getFromStorage("projects", []);

    const issue = issues.find(i => i.id === issueId) || null;
    if (!issue) {
      return { issue: null, project: null };
    }

    const fullProject = projects.find(p => p.id === issue.project_id) || null;
    const projectMeta = fullProject
      ? {
          id: fullProject.id,
          name: fullProject.name,
          primary_language: fullProject.primary_language
        }
      : null;

    // Foreign key resolution: attach full project to issue object as well
    const issueWithProject = {
      ...issue,
      project: fullProject
    };

    return {
      issue: issueWithProject,
      project: projectMeta
    };
  }

  // 9. volunteerForIssue(issueId, target_completion_date)
  volunteerForIssue(issueId, target_completion_date) {
    const issues = this._getFromStorage("issues", []);
    const index = issues.findIndex(i => i.id === issueId);
    if (index === -1) {
      return { success: false, message: "Issue not found", issue: null };
    }

    let isoDate = null;
    if (target_completion_date) {
      const d = new Date(target_completion_date);
      if (!isNaN(d.getTime())) {
        isoDate = d.toISOString();
      }
    }

    issues[index].volunteered_by_current_user = true;
    if (isoDate) {
      issues[index].target_completion_date = isoDate;
    }

    this._saveToStorage("issues", issues);

    return {
      success: true,
      message: "You are now volunteered for this issue",
      issue: issues[index]
    };
  }

  // 10. getPoliciesFilterOptions
  getPoliciesFilterOptions() {
    const policy_types = [
      { value: "contribution_policy", label: "Contribution policy" },
      { value: "security_policy", label: "Security policy" },
      { value: "governance_policy", label: "Governance policy" },
      { value: "licensing_policy", label: "Licensing policy" },
      { value: "other", label: "Other" }
    ];

    const date_presets = [
      { value: "last_30_days", label: "Last 30 days" },
      { value: "last_90_days", label: "Last 90 days" }
    ];

    const sort_options = [
      { value: "last_updated_newest_first", label: "Last updated – Newest first" },
      { value: "last_updated_oldest_first", label: "Last updated – Oldest first" }
    ];

    return {
      policy_types,
      date_presets,
      sort_options
    };
  }

  // 11. searchPolicies(filters, sort_by, page, page_size)
  searchPolicies(filters, sort_by, page, page_size) {
    const policies = this._getFromStorage("policies", []);
    const f = filters || {};

    let results = policies.filter(p => {
      if (f.type && p.type !== f.type) return false;

      if (f.last_updated_from) {
        if (!p.last_updated_at || new Date(p.last_updated_at) < new Date(f.last_updated_from)) return false;
      }

      if (f.last_updated_to) {
        if (!p.last_updated_at || new Date(p.last_updated_at) > new Date(f.last_updated_to)) return false;
      }

      if (f.owning_team) {
        if (!p.owning_team || p.owning_team !== f.owning_team) return false;
      }

      if (f.text_query) {
        const q = f.text_query.toLowerCase();
        const title = (p.title || "").toLowerCase();
        const content = (p.content || "").toLowerCase();
        if (!title.includes(q) && !content.includes(q)) return false;
      }

      return true;
    });

    const comparator = this._resolveSortOption("policy", sort_by || "last_updated_newest_first");
    const sorted = [...results].sort(comparator);

    const { items, total_count, page: p, page_size: ps } = this._applyPagination(sorted, page, page_size);

    return {
      policies: items,
      total_count,
      page: p,
      page_size: ps
    };
  }

  // 12. getPolicyDetail(policyId)
  getPolicyDetail(policyId) {
    const policies = this._getFromStorage("policies", []);
    const readingList = this._getFromStorage("policy_reading_list_items", []);

    const policy = policies.find(p => p.id === policyId) || null;
    const is_in_reading_list = readingList.some(item => item.policy_id === policyId);

    return {
      policy,
      is_in_reading_list
    };
  }

  // 13. addPolicyToReadingList(policyId)
  addPolicyToReadingList(policyId) {
    const policies = this._getFromStorage("policies", []);
    const policy = policies.find(p => p.id === policyId) || null;
    if (!policy) {
      return { success: false, message: "Policy not found", reading_list_item: null };
    }

    let readingList = this._getFromStorage("policy_reading_list_items", []);
    let item = readingList.find(i => i.policy_id === policyId) || null;

    if (!item) {
      item = {
        id: this._generateId("policy_reading_list_item"),
        policy_id: policyId,
        added_at: new Date().toISOString()
      };
      readingList.push(item);
      this._saveToStorage("policy_reading_list_items", readingList);
    }

    const itemWithPolicy = {
      ...item,
      policy
    };

    return {
      success: true,
      message: "Policy added to reading list",
      reading_list_item: itemWithPolicy
    };
  }

  // 14. getProjectProposalFormOptions
  getProjectProposalFormOptions() {
    const languages = [
      { value: "python", label: "Python" },
      { value: "javascript", label: "JavaScript" },
      { value: "typescript", label: "TypeScript" },
      { value: "java", label: "Java" },
      { value: "go", label: "Go" },
      { value: "ruby", label: "Ruby" },
      { value: "other", label: "Other" }
    ];

    const licenses = [
      { value: "mit", label: "MIT" },
      { value: "apache_2_0", label: "Apache 2.0" },
      { value: "gpl_3_0", label: "GPL 3.0" },
      { value: "bsd_3_clause", label: "BSD 3-Clause" },
      { value: "mpl_2_0", label: "MPL 2.0" },
      { value: "lgpl_3_0", label: "LGPL 3.0" },
      { value: "proprietary", label: "Proprietary" },
      { value: "other", label: "Other" }
    ];

    const maturity_levels = [
      { value: "prototype", label: "Prototype" },
      { value: "alpha", label: "Alpha" },
      { value: "beta", label: "Beta" },
      { value: "production", label: "Production" },
      { value: "deprecated", label: "Deprecated" },
      { value: "archived", label: "Archived" }
    ];

    const business_units = [
      { value: "analytics", label: "Analytics" },
      { value: "engineering", label: "Engineering" },
      { value: "marketing", label: "Marketing" },
      { value: "security", label: "Security" },
      { value: "legal", label: "Legal" },
      { value: "it", label: "IT" },
      { value: "other", label: "Other" }
    ];

    const guidance = {
      overview:
        "Use this form to propose a new open source project. Be explicit about the problem, " +
        "the scope of the solution, and how it will be maintained.",
      good_goals_examples:
        "Examples: 'Provide a reusable data ingestion toolkit for analytics teams' or 'Standardize UI components across web applications'.",
      good_features_examples:
        "Examples: 'Configurable connectors for common data sources', 'pluggable transformation steps', 'CLI for running pipelines locally'.",
      target_users_examples:
        "Examples: 'Data engineers building analytics workflows', 'Frontend engineers building internal tools', 'Security engineers automating checks'."
    };

    return {
      languages,
      licenses,
      maturity_levels,
      business_units,
      guidance
    };
  }

  // 15. submitProjectProposal(...)
  submitProjectProposal(
    project_name,
    primary_language,
    intended_license,
    maturity,
    owning_business_unit,
    description,
    initial_team_size,
    confirm_no_confidential_code,
    confirm_manager_approval
  ) {
    if (!project_name || !primary_language || !intended_license || !maturity || !owning_business_unit) {
      return { success: false, message: "Missing required fields", proposal: null };
    }

    if (!description || typeof description !== "string" || description.trim().length < 20) {
      return { success: false, message: "Description is too short", proposal: null };
    }

    if (typeof initial_team_size !== "number" || initial_team_size <= 0) {
      return { success: false, message: "Initial team size must be a positive number", proposal: null };
    }

    if (!confirm_no_confidential_code || !confirm_manager_approval) {
      return { success: false, message: "All confirmations are required", proposal: null };
    }

    const proposals = this._getFromStorage("project_proposals", []);
    const nowIso = new Date().toISOString();

    const proposal = {
      id: this._generateId("project_proposal"),
      project_name,
      primary_language,
      intended_license,
      maturity,
      owning_business_unit,
      description,
      initial_team_size,
      confirm_no_confidential_code: !!confirm_no_confidential_code,
      confirm_manager_approval: !!confirm_manager_approval,
      status: "submitted",
      submitted_at: nowIso
    };

    proposals.push(proposal);
    this._saveToStorage("project_proposals", proposals);

    return {
      success: true,
      message: "Project proposal submitted",
      proposal
    };
  }

  // 16. getEventsFilterOptions
  getEventsFilterOptions() {
    const event_types = [
      { value: "workshop", label: "Workshop" },
      { value: "talk", label: "Talk" },
      { value: "training", label: "Training" },
      { value: "webinar", label: "Webinar" },
      { value: "meetup", label: "Meetup" },
      { value: "conference", label: "Conference" }
    ];

    const topics = [
      { value: "open_source_license_compliance", label: "Open Source License Compliance" },
      { value: "open_source_governance", label: "Open Source Governance" },
      { value: "inner_source", label: "Inner Source" },
      { value: "community_building", label: "Community Building" },
      { value: "security_best_practices", label: "Security Best Practices" },
      { value: "other", label: "Other" }
    ];

    const time_of_day_options = [
      { value: "morning", label: "Morning", time_range: "08:00–11:00" },
      { value: "midday", label: "Midday", time_range: "11:00–15:00" },
      { value: "afternoon", label: "Afternoon", time_range: "15:00–18:00" },
      { value: "evening", label: "Evening", time_range: "18:00–21:00" }
    ];

    const sort_options = [
      { value: "date_soonest_first", label: "Date – Soonest first" },
      { value: "date_latest_first", label: "Date – Latest first" }
    ];

    return {
      event_types,
      topics,
      time_of_day_options,
      sort_options
    };
  }

  // 17. searchEvents(filters, sort_by, page, page_size)
  searchEvents(filters, sort_by, page, page_size) {
    const events = this._getFromStorage("events", []);
    const f = filters || {};

    let results = events.filter(e => {
      if (f.event_type && e.event_type !== f.event_type) return false;
      if (f.topic && e.topic !== f.topic) return false;

      if (f.start_date_from) {
        if (!e.start_datetime || new Date(e.start_datetime) < new Date(f.start_date_from)) return false;
      }

      if (f.start_date_to) {
        if (!e.start_datetime || new Date(e.start_datetime) > new Date(f.start_date_to)) return false;
      }

      if (f.time_of_day) {
        if (!e.start_datetime) return false;
        const d = new Date(e.start_datetime);
        const hour = d.getUTCHours();
        if (f.time_of_day === "morning" && !(hour >= 8 && hour < 11)) return false;
        if (f.time_of_day === "midday" && !(hour >= 11 && hour < 15)) return false;
        if (f.time_of_day === "afternoon" && !(hour >= 15 && hour < 18)) return false;
        if (f.time_of_day === "evening" && !(hour >= 18 && hour < 21)) return false;
      }

      if (f.location_type && e.location_type !== f.location_type) return false;

      return true;
    });

    const comparator = this._resolveSortOption("event", sort_by || "date_soonest_first");
    const sorted = [...results].sort(comparator);

    const { items, total_count, page: p, page_size: ps } = this._applyPagination(sorted, page, page_size);

    return {
      events: items,
      total_count,
      page: p,
      page_size: ps
    };
  }

  // 18. getEventDetail(eventId)
  getEventDetail(eventId) {
    const events = this._getFromStorage("events", []);
    const registrations = this._getFromStorage("event_registrations", []);

    const event = events.find(e => e.id === eventId) || null;

    // Agenda and speakers could be stored separately; if not, return empty defaults.
    // Optionally allow external code to store a map under 'event_agendas' / 'event_speakers'.
    const agendasMap = this._getFromStorage("event_agendas", {});
    const speakersMap = this._getFromStorage("event_speakers", {});

    const agenda = agendasMap[eventId] || "";
    const speakers = Array.isArray(speakersMap[eventId]) ? speakersMap[eventId] : [];

    const regForEvent = registrations.filter(r => r.event_id === eventId);
    let is_registered = false;
    let registered_at = null;
    if (regForEvent.length > 0) {
      is_registered = true;
      // Use the most recent registration
      regForEvent.sort((a, b) => new Date(b.registered_at) - new Date(a.registered_at));
      registered_at = regForEvent[0].registered_at;
    }

    return {
      event,
      agenda,
      speakers,
      registration_status: {
        is_registered,
        registered_at
      }
    };
  }

  // 19. registerForEvent(eventId, attendee_name, department, experience_level)
  registerForEvent(eventId, attendee_name, department, experience_level) {
    const events = this._getFromStorage("events", []);
    const event = events.find(e => e.id === eventId) || null;
    if (!event) {
      return { success: false, message: "Event not found", registration: null };
    }

    if (!attendee_name) {
      return { success: false, message: "Attendee name is required", registration: null };
    }

    const allowedDepartments = [
      "analytics",
      "engineering",
      "marketing",
      "security",
      "legal",
      "it",
      "other"
    ];
    if (!allowedDepartments.includes(department)) {
      return { success: false, message: "Invalid department", registration: null };
    }

    const allowedExperience = ["beginner", "intermediate", "advanced"];
    if (!allowedExperience.includes(experience_level)) {
      return { success: false, message: "Invalid experience level", registration: null };
    }

    let registrations = this._getFromStorage("event_registrations", []);

    const registration = {
      id: this._generateId("event_registration"),
      event_id: eventId,
      attendee_name,
      department,
      experience_level,
      registered_at: new Date().toISOString()
    };

    registrations.push(registration);
    this._saveToStorage("event_registrations", registrations);

    // Update event.registered_count convenience field
    const countForEvent = registrations.filter(r => r.event_id === eventId).length;
    event.registered_count = countForEvent;
    this._saveToStorage("events", events);

    const registrationWithEvent = {
      ...registration,
      event
    };

    return {
      success: true,
      message: "Registered for event",
      registration: registrationWithEvent
    };
  }

  // 20. getResourceCategories
  getResourceCategories() {
    const componentLibraries = this._getFromStorage("component_libraries", []);

    const categories = [
      {
        id: "component_libraries",
        name: "Component Libraries",
        description: "Reusable UI component libraries and design systems.",
        item_count: componentLibraries.length
      }
    ];

    return { categories };
  }

  // 21. getFeaturedResources
  getFeaturedResources() {
    const componentLibraries = this._getFromStorage("component_libraries", []);
    const sorted = [...componentLibraries].sort(
      this._resolveSortOption("component_library", "last_updated_newest_first")
    );
    const featured = sorted.slice(0, 5);

    return {
      component_libraries: featured
    };
  }

  // 22. getComponentLibraryFilterOptions
  getComponentLibraryFilterOptions() {
    const componentLibraries = this._getFromStorage("component_libraries", []);

    const licenses = [
      { value: "mit", label: "MIT" },
      { value: "apache_2_0", label: "Apache 2.0" },
      { value: "gpl_3_0", label: "GPL 3.0" },
      { value: "bsd_3_clause", label: "BSD 3-Clause" },
      { value: "mpl_2_0", label: "MPL 2.0" },
      { value: "lgpl_3_0", label: "LGPL 3.0" },
      { value: "proprietary", label: "Proprietary" },
      { value: "other", label: "Other" }
    ];

    const tagSet = new Set();
    for (const lib of componentLibraries) {
      if (Array.isArray(lib.tags)) {
        for (const t of lib.tags) {
          if (t) tagSet.add(t);
        }
      }
    }
    const tags = Array.from(tagSet);

    const sort_options = [
      { value: "last_updated_newest_first", label: "Last updated – Newest first" },
      { value: "last_updated_oldest_first", label: "Last updated – Oldest first" }
    ];

    return {
      licenses,
      tags,
      sort_options
    };
  }

  // 23. searchComponentLibraries(filters, sort_by, page, page_size)
  searchComponentLibraries(filters, sort_by, page, page_size) {
    const libs = this._getFromStorage("component_libraries", []);
    const f = filters || {};

    let results = libs.filter(lib => {
      if (f.license && lib.license !== f.license) return false;

      if (Array.isArray(f.tags) && f.tags.length > 0) {
        const ltags = Array.isArray(lib.tags) ? lib.tags : [];
        const intersects = f.tags.some(t => ltags.includes(t));
        if (!intersects) return false;
      }

      if (typeof f.has_design_guidelines === "boolean") {
        if (!!lib.has_design_guidelines !== f.has_design_guidelines) return false;
      }

      if (typeof f.has_storybook === "boolean") {
        if (!!lib.has_storybook !== f.has_storybook) return false;
      }

      if (f.text_query) {
        const q = f.text_query.toLowerCase();
        const name = (lib.name || "").toLowerCase();
        const desc = (lib.description || "").toLowerCase();
        if (!name.includes(q) && !desc.includes(q)) return false;
      }

      return true;
    });

    const comparator = this._resolveSortOption(
      "component_library",
      sort_by || "last_updated_newest_first"
    );
    const sorted = [...results].sort(comparator);

    const { items, total_count, page: p, page_size: ps } = this._applyPagination(sorted, page, page_size);

    return {
      component_libraries: items,
      total_count,
      page: p,
      page_size: ps
    };
  }

  // 24. getComponentLibraryDetail(componentLibraryId)
  getComponentLibraryDetail(componentLibraryId) {
    const libs = this._getFromStorage("component_libraries", []);
    const pinned = this._getFromStorage("pinned_documentation", []);

    const component_library = libs.find(l => l.id === componentLibraryId) || null;
    const supported_platforms = component_library && Array.isArray(component_library.primary_frameworks)
      ? component_library.primary_frameworks
      : [];

    const is_pinned = pinned.some(p => p.component_library_id === componentLibraryId);

    return {
      component_library,
      supported_platforms,
      is_pinned
    };
  }

  // 25. pinComponentLibraryDocumentation(componentLibraryId)
  pinComponentLibraryDocumentation(componentLibraryId) {
    const libs = this._getFromStorage("component_libraries", []);
    const lib = libs.find(l => l.id === componentLibraryId) || null;
    if (!lib) {
      return { success: false, message: "Component library not found", pinned_documentation: null };
    }

    let pinned = this._getFromStorage("pinned_documentation", []);
    let item = pinned.find(p => p.component_library_id === componentLibraryId) || null;

    if (!item) {
      item = {
        id: this._generateId("pinned_documentation"),
        component_library_id: componentLibraryId,
        documentation_url: lib.documentation_url || "",
        pinned_at: new Date().toISOString()
      };
      pinned.push(item);
      this._saveToStorage("pinned_documentation", pinned);
    }

    const itemWithLibrary = {
      ...item,
      component_library: lib
    };

    return {
      success: true,
      message: "Documentation pinned",
      pinned_documentation: itemWithLibrary
    };
  }

  // 26. getSecurityOverviewPageContent
  getSecurityOverviewPageContent() {
    const policies = this._getFromStorage("policies", []);
    const advisories = this._getFromStorage("security_advisories", []);

    const featured_policies = policies
      .filter(p => p.type === "security_policy")
      .sort(this._resolveSortOption("policy", "last_updated_newest_first"))
      .slice(0, 3);

    const highlighted_advisories = advisories
      .filter(a => (a.severity === "critical" || a.severity === "high") && a.status !== "resolved")
      .sort(this._resolveSortOption("security_advisory", "impact_score_high_to_low"))
      .slice(0, 5);

    return {
      summary:
        "We apply a risk-based approach to securing our open source ecosystem, " +
        "combining automated scanning, manual reviews, and clear remediation guidance.",
      risk_management_approach:
        "Security advisories are triaged by impact and likelihood. Critical and high-severity issues " +
        "are prioritized for immediate investigation, and mitigations are tracked on the risk watchlist.",
      featured_policies,
      highlighted_advisories
    };
  }

  // 27. getSecurityAdvisoryFilterOptions
  getSecurityAdvisoryFilterOptions() {
    const severities = [
      { value: "low", label: "Low" },
      { value: "medium", label: "Medium" },
      { value: "high", label: "High" },
      { value: "critical", label: "Critical" }
    ];

    const date_presets = [
      { value: "last_30_days", label: "Last 30 days" },
      { value: "last_90_days", label: "Last 90 days" }
    ];

    const statuses = [
      { value: "open", label: "Open" },
      { value: "under_investigation", label: "Under investigation" },
      { value: "mitigated", label: "Mitigated" },
      { value: "resolved", label: "Resolved" }
    ];

    const sort_options = [
      { value: "impact_score_high_to_low", label: "Impact score – High to Low" },
      { value: "reported_date_newest_first", label: "Reported date – Newest first" },
      { value: "reported_date_oldest_first", label: "Reported date – Oldest first" }
    ];

    return {
      severities,
      date_presets,
      statuses,
      sort_options
    };
  }

  // 28. searchSecurityAdvisories(filters, sort_by, page, page_size)
  searchSecurityAdvisories(filters, sort_by, page, page_size) {
    const advisories = this._getFromStorage("security_advisories", []);
    const f = filters || {};

    let results = advisories.filter(a => {
      if (f.severity && a.severity !== f.severity) return false;

      if (f.reported_from) {
        if (!a.reported_at || new Date(a.reported_at) < new Date(f.reported_from)) return false;
      }

      if (f.reported_to) {
        if (!a.reported_at || new Date(a.reported_at) > new Date(f.reported_to)) return false;
      }

      if (f.status && a.status !== f.status) return false;

      if (f.affected_component_query) {
        const q = f.affected_component_query.toLowerCase();
        const comps = Array.isArray(a.affected_components) ? a.affected_components : [];
        const matches = comps.some(c => String(c).toLowerCase().includes(q));
        if (!matches) return false;
      }

      return true;
    });

    const comparator = this._resolveSortOption(
      "security_advisory",
      sort_by || "impact_score_high_to_low"
    );
    const sorted = [...results].sort(comparator);

    const { items, total_count, page: p, page_size: ps } = this._applyPagination(sorted, page, page_size);

    return {
      advisories: items,
      total_count,
      page: p,
      page_size: ps
    };
  }

  // 29. getSecurityAdvisoryDetail(securityAdvisoryId)
  getSecurityAdvisoryDetail(securityAdvisoryId) {
    const advisories = this._getFromStorage("security_advisories", []);
    const watchlist = this._getFromStorage("risk_watchlist_items", []);

    const advisory = advisories.find(a => a.id === securityAdvisoryId) || null;
    const is_in_watchlist = watchlist.some(w => w.security_advisory_id === securityAdvisoryId);

    return {
      advisory,
      is_in_watchlist
    };
  }

  // 30. addSecurityAdvisoryToRiskWatchlist(securityAdvisoryId, priority, follow_up_notes)
  addSecurityAdvisoryToRiskWatchlist(securityAdvisoryId, priority, follow_up_notes) {
    const allowedPriorities = ["low", "medium", "high"];
    if (!allowedPriorities.includes(priority)) {
      return { success: false, message: "Invalid priority", watchlist_item: null };
    }

    const advisories = this._getFromStorage("security_advisories", []);
    const advisory = advisories.find(a => a.id === securityAdvisoryId) || null;
    if (!advisory) {
      return { success: false, message: "Security advisory not found", watchlist_item: null };
    }

    let watchlist = this._getFromStorage("risk_watchlist_items", []);
    let item = watchlist.find(w => w.security_advisory_id === securityAdvisoryId) || null;

    if (item) {
      item.priority = priority;
      item.follow_up_notes = follow_up_notes || item.follow_up_notes;
    } else {
      item = {
        id: this._generateId("risk_watchlist_item"),
        security_advisory_id: securityAdvisoryId,
        priority,
        follow_up_notes: follow_up_notes || "",
        created_at: new Date().toISOString()
      };
      watchlist.push(item);
    }

    this._saveToStorage("risk_watchlist_items", watchlist);

    const itemWithAdvisory = {
      ...item,
      advisory
    };

    return {
      success: true,
      message: "Advisory added to risk watchlist",
      watchlist_item: itemWithAdvisory
    };
  }

  // 31. getAboutPageContent
  getAboutPageContent() {
    const purpose =
      "This initiative coordinates open source efforts across the organization, " +
      "providing governance, tooling, and best practices for teams who build in the open.";

    const goals =
      "• Increase reuse of internal and external open source components.\n" +
      "• Encourage collaboration across departments through shared projects.\n" +
      "• Ensure compliance with licensing and security requirements.";

    const principles =
      "We value transparency, community, security, and long-term sustainability in all open source work.";

    const governance_structure =
      "A cross-functional steering group (Engineering, Security, Legal, and key business units) " +
      "reviews new project proposals and sets policy. Maintainer teams own day-to-day project decisions.";

    const key_roles = [
      {
        role_name: "Project Maintainer",
        description: "Owns the technical direction of a project and reviews contributions."
      },
      {
        role_name: "Open Source Program Office (OSPO)",
        description: "Provides guidance on licensing, compliance, and community best practices."
      },
      {
        role_name: "Security Partner",
        description: "Advises on threat modeling, vulnerability triage, and remediation."
      }
    ];

    const contact_information =
      "For questions about this initiative, email opensource@example.com or contact the OSPO via the internal directory.";

    const related_links = [
      { label: "Policies & Guidelines", target: "policies" },
      { label: "Help / FAQ", target: "help_faq" },
      { label: "Start a Project", target: "start_project" }
    ];

    return {
      purpose,
      goals,
      principles,
      governance_structure,
      key_roles,
      contact_information,
      related_links
    };
  }

  // 32. getHelpFaqContent
  getHelpFaqContent() {
    const faq_groups = [
      {
        group_title: "Projects & Contributions",
        items: [
          {
            question: "How do I find beginner-friendly projects?",
            answer:
              "Use the Projects page filters: select your preferred language, choose the 'Beginner-friendly' " +
              "experience level, and look for projects with 'good first issue' labels in their issues."
          },
          {
            question: "How do I volunteer for an issue?",
            answer:
              "Open the project, go to the Issues tab, filter by labels or effort, select an issue, and use " +
              "the 'Volunteer to work on this issue' action to set your target completion date."
          }
        ]
      },
      {
        group_title: "Starting a New Project",
        items: [
          {
            question: "When should I submit a new project proposal?",
            answer:
              "Submit a proposal when you plan to create a reusable codebase that will be shared beyond your immediate team, " +
              "or when you intend to release code publicly."
          },
          {
            question: "Who approves new project proposals?",
            answer:
              "Proposals are reviewed by the governance group, with input from Legal, Security, and relevant business units."
          }
        ]
      },
      {
        group_title: "Security & Compliance",
        items: [
          {
            question: "How are security advisories handled?",
            answer:
              "Security advisories are logged with severity and impact scores. Critical items are tracked on the risk watchlist, " +
              "and remediation guidance is provided where available."
          },
          {
            question: "Where can I learn about license compliance?",
            answer:
              "Use the Events page to search for 'Open Source License Compliance' workshops and trainings, and review the licensing policies in the Policies section."
          }
        ]
      }
    ];

    return { faq_groups };
  }

  // 33. getHelpTaskGuides
  getHelpTaskGuides() {
    const task_guides = [
      {
        id: "guide_submit_project_proposal",
        title: "Submit a New Project Proposal",
        related_task_ids: ["task_5"],
        steps: [
          "Open the Start a Project form from the main navigation.",
          "Fill in the project name, primary language, intended license, and maturity.",
          "Describe the goals, key features, and expected users in several sentences.",
          "Specify the initial team size and confirm the required approvals.",
          "Submit the proposal for review."
        ]
      },
      {
        id: "guide_volunteer_for_issue",
        title: "Volunteer for a Documentation Issue",
        related_task_ids: ["task_9"],
        steps: [
          "Navigate to the target project and open the Issues tab.",
          "Filter issues by the 'documentation' label and low estimated effort.",
          "Open an issue and review the description and acceptance criteria.",
          "Use the volunteer action to assign yourself and set a target completion date.",
          "Communicate in the issue comments if you run into blockers."
        ]
      }
    ];

    return { task_guides };
  }
}

// Browser global + Node.js export
if (typeof window !== "undefined") {
  window.BusinessLogic = BusinessLogic;
  window.WebsiteSDK = new BusinessLogic();
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = BusinessLogic;
}
