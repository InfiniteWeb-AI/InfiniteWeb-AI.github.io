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

  /**
   * Initialize all data tables in localStorage if they do not exist.
   * No domain data is mocked; we only create empty collections and metadata keys.
   */
  _initStorage() {
    const keysWithDefaults = {
      accounts: [],
      current_account: null,
      jobs: [],
      saved_jobs: [],
      applications: [],
      interviews: [],
      candidate_profiles: [],
      shortlists: [],
      shortlist_items: [],
      employer_plans: [],
      employer_consultations: [],
      job_alerts: [],
      salary_datasets: [],
      salary_reports: [],
      skills: []
    };

    Object.keys(keysWithDefaults).forEach((key) => {
      if (localStorage.getItem(key) === null) {
        localStorage.setItem(key, JSON.stringify(keysWithDefaults[key]));
      }
    });

    if (!localStorage.getItem("idCounter")) {
      localStorage.setItem("idCounter", "1000");
    }

    // Shortlist metadata
    if (!localStorage.getItem("current_shortlist_id")) {
      localStorage.setItem("current_shortlist_id", "");
    }
  }

  _getFromStorage(key, fallback) {
    const data = localStorage.getItem(key);
    if (data === null || data === undefined) {
      return fallback !== undefined ? fallback : [];
    }
    try {
      return JSON.parse(data);
    } catch (e) {
      return fallback !== undefined ? fallback : [];
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

  _nowISO() {
    return new Date().toISOString();
  }

  _toISODate(dateStr) {
    // Convert 'YYYY-MM-DD' to ISO datetime (midnight local time)
    if (!dateStr) return null;
    const d = new Date(dateStr + "T00:00:00");
    if (isNaN(d.getTime())) return null;
    return d.toISOString();
  }

  _parseLocationDisplay(location_display) {
    if (typeof location_display !== "string") {
      return { location_city: "", location_state: "" };
    }
    const trimmed = location_display.trim();
    if (!trimmed) return { location_city: "", location_state: "" };
    const parts = trimmed.split(",");
    const city = parts[0] ? parts[0].trim() : "";
    const state = parts[1] ? parts[1].trim() : "";
    return { location_city: city, location_state: state };
  }

  _inferExperienceLevel(total_years_experience) {
    const y = Number(total_years_experience);
    if (!isFinite(y) || y < 0) return "entry_level_0_2_years";
    if (y <= 2) return "entry_level_0_2_years";
    if (y <= 5) return "mid_level_3_5_years";
    if (y <= 8) return "senior_level_6_8_years";
    return "lead_9_plus_years";
  }

  _getOrCreateCurrentAccount() {
    let current = this._getFromStorage("current_account", null);
    let accounts = this._getFromStorage("accounts", []);

    if (current && current.id) {
      return current;
    }

    if (accounts.length > 0) {
      current = accounts[0];
      this._saveToStorage("current_account", current);
      return current;
    }

    const newAccount = {
      id: this._generateId("acct"),
      name: "Guest",
      email: "",
      account_type: "general",
      created_at: this._nowISO()
    };
    accounts.push(newAccount);
    this._saveToStorage("accounts", accounts);
    this._saveToStorage("current_account", newAccount);
    return newAccount;
  }

  _getCurrentShortlistId() {
    const id = localStorage.getItem("current_shortlist_id");
    return id || "";
  }

  _setCurrentShortlistId(id) {
    localStorage.setItem("current_shortlist_id", id || "");
  }

  _getOrCreateShortlist() {
    let shortlists = this._getFromStorage("shortlists", []);
    let shortlistId = this._getCurrentShortlistId();

    let shortlist = shortlists.find((s) => s.id === shortlistId);
    if (shortlist) return shortlist;

    shortlist = {
      id: this._generateId("shortlist"),
      name: "My Shortlist",
      description: "Candidates you are considering",
      created_at: this._nowISO()
    };
    shortlists.push(shortlist);
    this._saveToStorage("shortlists", shortlists);
    this._setCurrentShortlistId(shortlist.id);
    return shortlist;
  }

  _decorateSalaryReport(report) {
    if (!report) return null;
    const salaryDatasets = this._getFromStorage("salary_datasets", []);
    const primary_dataset = report.primary_dataset_id
      ? salaryDatasets.find((d) => d.id === report.primary_dataset_id) || null
      : null;
    const comparison_dataset = report.comparison_dataset_id
      ? salaryDatasets.find((d) => d.id === report.comparison_dataset_id) || null
      : null;
    return {
      ...report,
      primary_dataset,
      comparison_dataset
    };
  }

  // =====================
  // Content / static pages
  // =====================

  // getHomeContent()
  getHomeContent() {
    return {
      hero_title: "Staffing made simple for growing teams and ambitious talent",
      hero_subtitle:
        "Connect with vetted professionals and employers across marketing, product, design, operations, and technology.",
      candidate_value_points: [
        "Search thousands of curated roles from vetted employers",
        "Set up smart alerts so the right jobs come to you",
        "Create a profile once and apply with one click"
      ],
      employer_value_points: [
        "Source pre-screened candidates across key skill areas",
        "Streamline interviews and offers from one dashboard",
        "Flexible plans including background checks and onboarding support"
      ],
      candidate_primary_cta_label: "Start job search",
      candidate_primary_cta_action: "start_job_search",
      employer_primary_cta_label: "Explore employer solutions",
      employer_primary_cta_action: "view_employer_solutions",
      salary_insights_promo: {
        title: "Know your market value",
        description:
          "Compare salaries by role, location, and experience level so you can negotiate with confidence.",
        cta_label: "Explore salary insights"
      },
      employer_services_highlights: [
        {
          title: "Permanent and contract hiring",
          description:
            "Fill critical roles with full-time or project-based talent, backed by our recruiting specialists."
        },
        {
          title: "Screening and background checks",
          description:
            "Add skills assessments and compliant background checks to streamline hiring decisions."
        },
        {
          title: "Talent pool access",
          description:
            "Browse a curated pool of developers, designers, marketers, and operations professionals."
        }
      ]
    };
  }

  // getAboutContent()
  getAboutContent() {
    return {
      mission:
        "We connect fast-growing companies with exceptional talent through a blend of technology and human expertise.",
      values: [
        "Candidate-first experience",
        "Data-informed hiring decisions",
        "Equity and inclusion",
        "Long-term partnerships"
      ],
      specializations: [
        "Marketing and Growth",
        "Product Management",
        "Design and UX",
        "Software Engineering",
        "Customer Support and Success",
        "Operations and HR"
      ],
      contact_email: "hello@agency-example.com",
      contact_phone: "+1 (555) 555-0123"
    };
  }

  // getEmployerSolutionsContent()
  getEmployerSolutionsContent() {
    return {
      hero_title: "Scalable hiring solutions for modern teams",
      hero_body:
        "Whether you need one critical hire or a steady pipeline of candidates, our recruiters and platform help you move from job description to signed offer faster.",
      core_services: [
        {
          name: "Contingent search",
          description:
            "Pay only when you hire. Ideal for one-off roles and specialized positions.",
          includes_background_checks: false
        },
        {
          name: "Managed recruiting",
          description:
            "Partner with a dedicated recruiter who manages sourcing, screening, and interview coordination.",
          includes_background_checks: true
        },
        {
          name: "RPO (Recruitment Process Outsourcing)",
          description:
            "Embed our team into your talent function to support consistent hiring across departments.",
          includes_background_checks: true
        }
      ],
      benefit_highlights: [
        "Access a curated talent pool across multiple disciplines",
        "Standardized screening and structured interview support",
        "Integrated tools for scheduling, feedback, and offers"
      ],
      recommended_next_actions: [
        {
          action_type: "view_pricing_plans",
          label: "Compare pricing & plans",
          description: "Find the service tier that matches your hiring volume and budget."
        },
        {
          action_type: "post_a_job",
          label: "Post a job",
          description:
            "Publish a new role in minutes and start receiving qualified applicants."
        },
        {
          action_type: "browse_candidates",
          label: "Browse the talent pool",
          description:
            "Search profiles by role, skills, location, and experience level to build your shortlist."
        }
      ]
    };
  }

  // =====================
  // Job search & details
  // =====================

  // getJobSearchFilterOptions()
  getJobSearchFilterOptions() {
    return {
      work_arrangements: [
        { value: "remote", label: "Remote" },
        { value: "on_site", label: "On-site" },
        { value: "hybrid", label: "Hybrid" }
      ],
      employment_types: [
        { value: "full_time", label: "Full-time" },
        { value: "part_time", label: "Part-time" },
        { value: "contract", label: "Contract" },
        { value: "temporary", label: "Temporary" },
        { value: "internship", label: "Internship" }
      ],
      sort_options: [
        { value: "relevance", label: "Best match" },
        { value: "date_posted_desc", label: "Newest first" },
        { value: "salary_desc", label: "Highest salary" }
      ],
      salary_range_presets: [
        { min: 40000, max: 60000, label: "$40k - $60k" },
        { min: 60000, max: 80000, label: "$60k - $80k" },
        { min: 80000, max: 100000, label: "$80k - $100k" },
        { min: 100000, max: 150000, label: "$100k - $150k" }
      ]
    };
  }

  // searchJobs(keyword, location, work_arrangement, employment_type, salary_min, salary_max, sort_by, page, page_size)
  searchJobs(
    keyword,
    location,
    work_arrangement,
    employment_type,
    salary_min,
    salary_max,
    sort_by = "relevance",
    page = 1,
    page_size = 20
  ) {
    const jobs = this._getFromStorage("jobs", []);
    const savedJobs = this._getFromStorage("saved_jobs", []);
    const savedSet = new Set(savedJobs.map((s) => s.jobId));

    const kw = keyword ? String(keyword).trim().toLowerCase() : "";
    const loc = location ? String(location).trim().toLowerCase() : "";
    const minSalary = salary_min != null ? Number(salary_min) : null;
    const maxSalary = salary_max != null ? Number(salary_max) : null;

    let filtered = jobs.filter((job) => {
      if (!job || job.status !== "open") return false;

      // Keyword filter
      if (kw) {
        const haystack = (
          (job.title || "") +
          " " +
          (job.company_name || "") +
          " " +
          (job.description || "")
        ).toLowerCase();
        if (!haystack.includes(kw)) return false;
      }

      // Location filter
      if (loc) {
        if (loc === "remote") {
          if (job.work_arrangement !== "remote") return false;
        } else {
          const locationDisplay = (job.location_display || "").toLowerCase();
          const combined =
            ((job.location_city || "") + ", " + (job.location_state || "")).toLowerCase();
          if (
            !locationDisplay.includes(loc) &&
            !combined.includes(loc)
          ) {
            return false;
          }
        }
      }

      // Work arrangement filter
      if (work_arrangement && job.work_arrangement !== work_arrangement) {
        return false;
      }

      // Employment type filter
      if (employment_type && job.employment_type !== employment_type) {
        return false;
      }

      // Salary filters
      if (minSalary != null && isFinite(minSalary)) {
        // Require that the max salary meets or exceeds the requested minimum
        if (Number(job.salary_max) < minSalary) return false;
      }
      if (maxSalary != null && isFinite(maxSalary)) {
        // Require that the min salary is not above the requested maximum
        if (Number(job.salary_min) > maxSalary) return false;
      }

      return true;
    });

    // Sorting
    filtered.sort((a, b) => {
      if (sort_by === "date_posted_desc") {
        const ad = a.date_posted ? new Date(a.date_posted).getTime() : 0;
        const bd = b.date_posted ? new Date(b.date_posted).getTime() : 0;
        return bd - ad;
      }
      if (sort_by === "salary_desc") {
        const as = Number(a.salary_max) || 0;
        const bs = Number(b.salary_max) || 0;
        return bs - as;
      }
      // "relevance" fallback: newest first
      const ad = a.date_posted ? new Date(a.date_posted).getTime() : 0;
      const bd = b.date_posted ? new Date(b.date_posted).getTime() : 0;
      return bd - ad;
    });

    const total_results = filtered.length;
    const start = (page - 1) * page_size;
    const end = start + page_size;
    const pageJobs = filtered.slice(start, end).map((job) => {
      const short_description = (job.description || "").slice(0, 260);
      return {
        id: job.id,
        title: job.title,
        company_name: job.company_name,
        location_display:
          job.location_display || `${job.location_city || ""}, ${job.location_state || ""}`.trim(),
        work_arrangement: job.work_arrangement,
        employment_type: job.employment_type,
        salary_min: job.salary_min,
        salary_max: job.salary_max,
        salary_currency: job.salary_currency || "USD",
        experience_min_years: job.experience_min_years || null,
        experience_max_years: job.experience_max_years || null,
        date_posted: job.date_posted || null,
        status: job.status,
        is_saved: savedSet.has(job.id),
        is_own_posting: !!job.is_own_posting,
        short_description
      };
    });

    return {
      total_results,
      page,
      page_size,
      applied_filters: {
        keyword: keyword || "",
        location: location || "",
        work_arrangement: work_arrangement || "",
        employment_type: employment_type || "",
        salary_min: minSalary,
        salary_max: maxSalary
      },
      jobs: pageJobs
    };
  }

  // getJobDetails(jobId)
  getJobDetails(jobId) {
    const jobs = this._getFromStorage("jobs", []);
    const job = jobs.find((j) => j.id === jobId) || null;

    if (!job) {
      return {
        job: null,
        is_saved: false,
        has_applied: false,
        application_status: null
      };
    }

    const savedJobs = this._getFromStorage("saved_jobs", []);
    const is_saved = savedJobs.some((s) => s.jobId === jobId);

    const applications = this._getFromStorage("applications", []);
    const jobApplications = applications.filter((a) => a.jobId === jobId);

    let has_applied = false;
    let application_status = null;
    if (jobApplications.length > 0) {
      // For single-user scenario, any application for this job counts as "applied"
      has_applied = true;
      // Take the most recent application's status
      jobApplications.sort((a, b) => {
        const at = new Date(a.created_at).getTime();
        const bt = new Date(b.created_at).getTime();
        return bt - at;
      });
      application_status = jobApplications[0].status;
    }

    return {
      job,
      is_saved,
      has_applied,
      application_status
    };
  }

  // =====================
  // Saved jobs
  // =====================

  // saveJob(jobId)
  saveJob(jobId) {
    const jobs = this._getFromStorage("jobs", []);
    const job = jobs.find((j) => j.id === jobId);
    if (!job) {
      return {
        success: false,
        message: "Job not found",
        saved_job: null,
        total_saved_count: this._getFromStorage("saved_jobs", []).length
      };
    }

    let savedJobs = this._getFromStorage("saved_jobs", []);
    const existing = savedJobs.find((s) => s.jobId === jobId);
    if (existing) {
      return {
        success: true,
        message: "Job already saved",
        saved_job: {
          ...existing,
          job
        },
        total_saved_count: savedJobs.length
      };
    }

    const saved_job = {
      id: this._generateId("savedjob"),
      jobId,
      savedAt: this._nowISO(),
      notes: ""
    };
    savedJobs.push(saved_job);
    this._saveToStorage("saved_jobs", savedJobs);

    return {
      success: true,
      message: "Job saved",
      saved_job: {
        ...saved_job,
        job
      },
      total_saved_count: savedJobs.length
    };
  }

  // removeSavedJob(jobId)
  removeSavedJob(jobId) {
    let savedJobs = this._getFromStorage("saved_jobs", []);
    const before = savedJobs.length;
    savedJobs = savedJobs.filter((s) => s.jobId !== jobId);
    this._saveToStorage("saved_jobs", savedJobs);
    const removed = before !== savedJobs.length;

    return {
      success: removed,
      message: removed ? "Saved job removed" : "Saved job not found",
      total_saved_count: savedJobs.length
    };
  }

  // getSavedJobsList()
  getSavedJobsList() {
    const savedJobs = this._getFromStorage("saved_jobs", []);
    const jobs = this._getFromStorage("jobs", []);

    const jobsWithMeta = savedJobs.map((s) => {
      const job = jobs.find((j) => j.id === s.jobId) || null;
      return {
        job,
        saved_at: s.savedAt,
        notes: s.notes || ""
      };
    });

    return {
      total_saved: savedJobs.length,
      jobs: jobsWithMeta
    };
  }

  // =====================
  // Applications
  // =====================

  // submitJobApplication(jobId, full_name, email, phone, professional_summary, resume_url)
  submitJobApplication(jobId, full_name, email, phone, professional_summary, resume_url) {
    const jobs = this._getFromStorage("jobs", []);
    const job = jobs.find((j) => j.id === jobId);
    if (!job) {
      return {
        success: false,
        message: "Job not found",
        application: null
      };
    }

    const applications = this._getFromStorage("applications", []);
    const application = {
      id: this._generateId("app"),
      jobId,
      candidate_full_name: full_name,
      candidate_email: email,
      candidate_phone: phone,
      professional_summary: professional_summary || "",
      resume_url: resume_url || "",
      created_at: this._nowISO(),
      status: "submitted",
      match_score: null
    };

    applications.push(application);
    this._saveToStorage("applications", applications);

    return {
      success: true,
      message: "Application submitted",
      application
    };
  }

  // =====================
  // Accounts & dashboard
  // =====================

  // createAccount(account_type, name, email, password, marketing_opt_in, origin_context)
  createAccount(account_type, name, email, password, marketing_opt_in = false, origin_context) {
    const accounts = this._getFromStorage("accounts", []);

    const account = {
      id: this._generateId("acct"),
      name,
      email,
      account_type,
      password: password || "",
      marketing_opt_in: !!marketing_opt_in,
      origin_context: origin_context || "",
      created_at: this._nowISO()
    };

    accounts.push(account);
    this._saveToStorage("accounts", accounts);
    this._saveToStorage("current_account", account);

    let recommended_next_route = "dashboard";
    if (account_type === "candidate") recommended_next_route = "candidate_dashboard";
    else if (account_type === "employer") recommended_next_route = "employer_dashboard";

    return {
      success: true,
      message: "Account created",
      account: {
        name: account.name,
        email: account.email,
        account_type: account.account_type
      },
      recommended_next_route
    };
  }

  // createAccountAndSaveSalaryReport(name, email, password, salary_report_id)
  createAccountAndSaveSalaryReport(name, email, password, salary_report_id) {
    const accounts = this._getFromStorage("accounts", []);
    const salaryReports = this._getFromStorage("salary_reports", []);

    const account = {
      id: this._generateId("acct"),
      name,
      email,
      account_type: "general",
      password: password || "",
      created_at: this._nowISO()
    };
    accounts.push(account);
    this._saveToStorage("accounts", accounts);
    this._saveToStorage("current_account", account);

    const idx = salaryReports.findIndex((r) => r.id === salary_report_id);
    let savedReport = null;
    if (idx !== -1) {
      salaryReports[idx].saved = true;
      savedReport = this._decorateSalaryReport(salaryReports[idx]);
      this._saveToStorage("salary_reports", salaryReports);
    }

    return {
      success: !!savedReport,
      message: savedReport ? "Account created and report saved" : "Account created, report not found",
      account: {
        name: account.name,
        email: account.email,
        account_type: account.account_type
      },
      saved_report: savedReport,
      recommended_next_route: "dashboard"
    };
  }

  // getUserDashboardOverview()
  getUserDashboardOverview() {
    const account = this._getOrCreateCurrentAccount();

    const candidateProfiles = this._getFromStorage("candidate_profiles", []);
    const jobs = this._getFromStorage("jobs", []);
    const applications = this._getFromStorage("applications", []);
    const savedJobs = this._getFromStorage("saved_jobs", []);
    const jobAlerts = this._getFromStorage("job_alerts", []);
    const salaryReports = this._getFromStorage("salary_reports", []);

    const selfProfile = candidateProfiles.find((p) => p.is_self_profile) || null;

    let candidate_profile_summary = {
      exists: false,
      is_complete: false,
      preferred_job_title: "",
      location_display: "",
      desired_salary: null,
      missing_fields: []
    };

    if (selfProfile) {
      const missing = [];
      if (!selfProfile.preferred_job_title) missing.push("preferred_job_title");
      if (!selfProfile.location_city || !selfProfile.location_state) missing.push("location");
      if (selfProfile.total_years_experience === undefined || selfProfile.total_years_experience === null) {
        missing.push("total_years_experience");
      }
      if (!selfProfile.experience_level) missing.push("experience_level");
      const is_complete = missing.length === 0;
      candidate_profile_summary = {
        exists: true,
        is_complete,
        preferred_job_title: selfProfile.preferred_job_title || "",
        location_display: `${selfProfile.location_city || ""}, ${selfProfile.location_state || ""}`.trim(),
        desired_salary: selfProfile.desired_salary || null,
        missing_fields: missing
      };
    }

    const ownJobs = jobs.filter((j) => j.is_own_posting);
    const employer_summary = {
      has_jobs: ownJobs.length > 0,
      open_jobs_count: ownJobs.filter((j) => j.status === "open").length,
      pending_applicants_count: applications.filter((a) => {
        const job = jobs.find((j) => j.id === a.jobId);
        if (!job || !job.is_own_posting) return false;
        return a.status === "submitted" || a.status === "under_review";
      }).length
    };

    const savedJobsJoined = savedJobs
      .slice()
      .sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime())
      .slice(0, 5)
      .map((s) => {
        const job = jobs.find((j) => j.id === s.jobId) || null;
        return {
          job,
          saved_at: s.savedAt
        };
      });

    const recentApplications = applications
      .slice()
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5)
      .map((app) => {
        const job = jobs.find((j) => j.id === app.jobId) || {};
        return {
          application: app,
          job_title: job.title || "",
          company_name: job.company_name || ""
        };
      });

    const saved_salary_reports = salaryReports
      .filter((r) => r.saved)
      .map((r) => this._decorateSalaryReport(r));

    return {
      account_type: account.account_type,
      candidate_profile_summary,
      employer_summary,
      saved_jobs_preview: savedJobsJoined,
      recent_applications: recentApplications,
      job_alerts: jobAlerts,
      saved_salary_reports
    };
  }

  // getCandidateProfileForEdit()
  getCandidateProfileForEdit() {
    const account = this._getOrCreateCurrentAccount();
    const candidateProfiles = this._getFromStorage("candidate_profiles", []);
    const profile = candidateProfiles.find((p) => p.is_self_profile) || null;

    const availability_options = [
      { value: "immediately", label: "Immediately" },
      { value: "one_week", label: "Within 1 week" },
      { value: "two_weeks", label: "Within 2 weeks" },
      { value: "one_month", label: "Within 1 month" },
      { value: "flexible", label: "Flexible" }
    ];

    if (!profile) {
      const templateProfile = {
        id: null,
        full_name: account.name || "",
        headline: "",
        preferred_job_title: "",
        location_city: "",
        location_state: "",
        desired_salary: null,
        skills: [],
        availability: null,
        experience_level: "entry_level_0_2_years",
        total_years_experience: 0,
        rating: null,
        is_self_profile: true,
        created_at: null,
        updated_at: null
      };

      return {
        exists: false,
        profile: templateProfile,
        availability_options
      };
    }

    return {
      exists: true,
      profile,
      availability_options
    };
  }

  // updateCandidateProfile(full_name, preferred_job_title, location_display, desired_salary, skills, availability, headline, total_years_experience, experience_level)
  updateCandidateProfile(
    full_name,
    preferred_job_title,
    location_display,
    desired_salary,
    skills,
    availability,
    headline,
    total_years_experience,
    experience_level
  ) {
    const account = this._getOrCreateCurrentAccount();
    let candidateProfiles = this._getFromStorage("candidate_profiles", []);
    let skillsMaster = this._getFromStorage("skills", []);

    let profile = candidateProfiles.find((p) => p.is_self_profile) || null;

    const { location_city, location_state } = this._parseLocationDisplay(location_display);

    // Map skill names to IDs, creating skills as needed
    let skillIds = [];
    if (Array.isArray(skills)) {
      skills.forEach((nameRaw) => {
        const name = String(nameRaw).trim();
        if (!name) return;
        let skill = skillsMaster.find(
          (s) => s.name.toLowerCase() === name.toLowerCase() && s.is_active
        );
        if (!skill) {
          skill = {
            id: this._generateId("skill"),
            name,
            category: null,
            is_active: true
          };
          skillsMaster.push(skill);
        }
        skillIds.push(skill.id);
      });
    }

    this._saveToStorage("skills", skillsMaster);

    const now = this._nowISO();

    if (!profile) {
      profile = {
        id: this._generateId("cand"),
        full_name: full_name || account.name || "",
        headline: headline || "",
        preferred_job_title,
        location_city,
        location_state,
        desired_salary: desired_salary != null ? Number(desired_salary) : null,
        skills: skillIds,
        availability: availability || null,
        experience_level:
          experience_level || this._inferExperienceLevel(total_years_experience),
        total_years_experience:
          total_years_experience != null ? Number(total_years_experience) : 0,
        rating: null,
        is_self_profile: true,
        created_at: now,
        updated_at: now
      };
      candidateProfiles.push(profile);
    } else {
      profile.full_name = full_name || profile.full_name || account.name || "";
      profile.headline = headline != null ? headline : profile.headline;
      profile.preferred_job_title = preferred_job_title;
      profile.location_city = location_city;
      profile.location_state = location_state;
      if (desired_salary != null) {
        profile.desired_salary = Number(desired_salary);
      }
      if (skillIds.length > 0) {
        profile.skills = skillIds;
      }
      if (availability) profile.availability = availability;
      if (total_years_experience != null) {
        profile.total_years_experience = Number(total_years_experience);
      }
      if (experience_level) {
        profile.experience_level = experience_level;
      } else if (!profile.experience_level) {
        profile.experience_level = this._inferExperienceLevel(
          profile.total_years_experience
        );
      }
      profile.is_self_profile = true;
      profile.updated_at = now;
    }

    // Persist updated profile list
    candidateProfiles = candidateProfiles.map((p) =>
      p.is_self_profile ? profile : p
    );
    this._saveToStorage("candidate_profiles", candidateProfiles);

    return {
      success: true,
      message: "Profile updated",
      profile
    };
  }

  // getSkillSuggestions(query)
  getSkillSuggestions(query) {
    const q = String(query || "").trim().toLowerCase();
    if (!q) return [];
    const skills = this._getFromStorage("skills", []);
    return skills.filter(
      (s) => s.is_active && s.name.toLowerCase().includes(q)
    );
  }

  // =====================
  // Employer plans & consultations
  // =====================

  // getEmployerPlansForComparison()
  getEmployerPlansForComparison() {
    const plansRaw = this._getFromStorage("employer_plans", []);

    const plans = plansRaw.map((plan) => {
      const is_mid_tier = plan.tier === "standard" || (!plan.is_highest_priced && plan.tier !== "basic");
      let recommended_for_company_sizes = [];
      if (plan.tier === "basic") {
        recommended_for_company_sizes = ["1-10 employees", "11-50 employees"];
      } else if (plan.tier === "standard") {
        recommended_for_company_sizes = ["11-50 employees", "51-200 employees"];
      } else if (plan.tier === "premium") {
        recommended_for_company_sizes = [
          "51-200 employees",
          "201-500 employees",
          "501-1000 employees",
          "1000+ employees"
        ];
      }
      const highlight_label = is_mid_tier ? "Best for growing teams" : "";

      return {
        plan,
        is_mid_tier,
        recommended_next_actions: undefined,
        recommended_for_company_sizes,
        highlight_label
      };
    });

    return { plans };
  }

  // getEmployerPlanDetails(planId)
  getEmployerPlanDetails(planId) {
    const plans = this._getFromStorage("employer_plans", []);
    const plan = plans.find((p) => p.id === planId) || null;

    if (!plan) {
      return {
        plan: null,
        detailed_features: [],
        faq: []
      };
    }

    const detailed_features = Array.isArray(plan.features) ? plan.features : [];

    const faq = [
      {
        question: "What is included in this plan?",
        answer:
          "This plan includes access to our talent pool, job posting tools, and the services listed in the feature breakdown."
      },
      {
        question: "Can I upgrade or downgrade later?",
        answer:
          "Yes. You can adjust your plan at any time; changes will be reflected on your next billing cycle."
      },
      {
        question: "Are background checks included?",
        answer: plan.includes_background_checks
          ? "Yes, background checks are included for hires made under this plan."
          : "Background checks are available as an add-on for this plan."
      }
    ];

    return {
      plan,
      detailed_features,
      faq
    };
  }

  // createEmployerConsultation(planId, company_name, work_email, company_size_range, preferred_date, preferred_time_slot, notes)
  createEmployerConsultation(
    planId,
    company_name,
    work_email,
    company_size_range,
    preferred_date,
    preferred_time_slot,
    notes
  ) {
    const employerConsultations = this._getFromStorage("employer_consultations", []);
    const plans = this._getFromStorage("employer_plans", []);
    const plan = plans.find((p) => p.id === planId) || null;

    const consultation = {
      id: this._generateId("consult"),
      planId,
      company_name,
      work_email,
      company_size_range,
      preferred_date: this._toISODate(preferred_date),
      preferred_time_slot,
      created_at: this._nowISO(),
      status: "requested",
      notes: notes || ""
    };

    employerConsultations.push(consultation);
    this._saveToStorage("employer_consultations", employerConsultations);

    // Foreign key resolution for planId -> plan
    const decorated = {
      ...consultation,
      plan
    };

    return {
      success: true,
      message: "Consultation requested",
      consultation: decorated
    };
  }

  // =====================
  // Job posting & employer job management
  // =====================

  // getJobFormOptions()
  getJobFormOptions() {
    return {
      work_arrangements: [
        { value: "remote", label: "Remote" },
        { value: "on_site", label: "On-site" },
        { value: "hybrid", label: "Hybrid" }
      ],
      employment_types: [
        { value: "full_time", label: "Full-time" },
        { value: "part_time", label: "Part-time" },
        { value: "contract", label: "Contract" },
        { value: "temporary", label: "Temporary" },
        { value: "internship", label: "Internship" }
      ],
      default_salary_currency: "USD",
      application_deadline_help_text:
        "Select the last date you will accept applications. The job will automatically close after this date."
    };
  }

  // createJobPosting(title, location_display, work_arrangement, employment_type, salary_min, salary_max, salary_currency, description, responsibilities, screening_questions, application_deadline)
  createJobPosting(
    title,
    location_display,
    work_arrangement,
    employment_type,
    salary_min,
    salary_max,
    salary_currency = "USD",
    description,
    responsibilities,
    screening_questions,
    application_deadline
  ) {
    const account = this._getOrCreateCurrentAccount();
    const jobs = this._getFromStorage("jobs", []);

    const { location_city, location_state } = this._parseLocationDisplay(location_display);

    let responsibilitiesArray = Array.isArray(responsibilities)
      ? responsibilities
      : [];
    if (!responsibilitiesArray.length && description) {
      responsibilitiesArray = description
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);
    }

    const job = {
      id: this._generateId("job"),
      title,
      company_name: account.name || "Your Company",
      location_city,
      location_state,
      location_display,
      work_arrangement,
      employment_type,
      salary_min: Number(salary_min),
      salary_max: Number(salary_max),
      salary_currency: salary_currency || "USD",
      experience_min_years: null,
      experience_max_years: null,
      description,
      responsibilities: responsibilitiesArray,
      screening_questions: Array.isArray(screening_questions)
        ? screening_questions
        : [],
      application_deadline: this._toISODate(application_deadline),
      date_posted: this._nowISO(),
      status: "open",
      is_own_posting: true
    };

    jobs.push(job);
    this._saveToStorage("jobs", jobs);

    return {
      success: true,
      message: "Job created",
      job
    };
  }

  // getMyJobsList()
  getMyJobsList() {
    const jobs = this._getFromStorage("jobs", []);
    const applications = this._getFromStorage("applications", []);
    const interviews = this._getFromStorage("interviews", []);

    const ownJobs = jobs.filter((j) => j.is_own_posting);

    const items = ownJobs.map((job) => {
      const applicant_count = applications.filter((a) => a.jobId === job.id).length;
      const interview_scheduled_count = interviews.filter(
        (i) => i.jobId === job.id && i.status === "scheduled"
      ).length;
      const views_count = job.views_count || 0;
      return {
        job,
        applicant_count,
        interview_scheduled_count,
        views_count
      };
    });

    return { jobs: items };
  }

  // updateJobStatus(jobId, status)
  updateJobStatus(jobId, status) {
    let jobs = this._getFromStorage("jobs", []);
    const idx = jobs.findIndex((j) => j.id === jobId);
    if (idx === -1) {
      return {
        success: false,
        message: "Job not found",
        job: null
      };
    }

    jobs[idx].status = status;
    this._saveToStorage("jobs", jobs);

    return {
      success: true,
      message: "Job status updated",
      job: jobs[idx]
    };
  }

  // getJobDashboardOverview(jobId)
  getJobDashboardOverview(jobId) {
    const jobs = this._getFromStorage("jobs", []);
    const job = jobs.find((j) => j.id === jobId) || null;
    if (!job) {
      return {
        job: null,
        applicant_counts: {
          total: 0,
          new: 0,
          under_review: 0,
          interview_scheduled: 0,
          rejected: 0,
          hired: 0
        },
        interview_summary: {
          upcoming_count: 0,
          next_interview_time: null
        },
        posting_performance: {
          views: 0,
          clicks: 0
        }
      };
    }

    const applications = this._getFromStorage("applications", []);
    const interviews = this._getFromStorage("interviews", []);

    const jobApps = applications.filter((a) => a.jobId === jobId);
    const applicant_counts = {
      total: jobApps.length,
      new: jobApps.filter((a) => a.status === "submitted").length,
      under_review: jobApps.filter((a) => a.status === "under_review").length,
      interview_scheduled: jobApps.filter(
        (a) => a.status === "interview_scheduled"
      ).length,
      rejected: jobApps.filter((a) => a.status === "rejected").length,
      hired: jobApps.filter((a) => a.status === "hired").length
    };

    const jobInterviews = interviews.filter(
      (i) => i.jobId === jobId && i.status === "scheduled"
    );
    let upcoming_count = jobInterviews.length;
    let next_interview_time = null;
    if (jobInterviews.length > 0) {
      jobInterviews.sort(
        (a, b) => new Date(a.scheduled_start).getTime() - new Date(b.scheduled_start).getTime()
      );
      next_interview_time = jobInterviews[0].scheduled_start;
    }

    const posting_performance = {
      views: job.views_count || 0,
      clicks: job.clicks_count || 0
    };

    return {
      job,
      applicant_counts,
      interview_summary: {
        upcoming_count,
        next_interview_time
      },
      posting_performance
    };
  }

  // =====================
  // Applicants & interviews
  // =====================

  // getJobApplicants(jobId, sort_by, status_filter)
  getJobApplicants(jobId, sort_by = "match_score_desc", status_filter) {
    const applications = this._getFromStorage("applications", []);
    const candidateProfiles = this._getFromStorage("candidate_profiles", []);
    const jobs = this._getFromStorage("jobs", []);

    let jobApps = applications.filter((a) => a.jobId === jobId);
    if (status_filter) {
      jobApps = jobApps.filter((a) => a.status === status_filter);
    }

    // Sorting
    if (sort_by === "recent_first") {
      jobApps.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    } else if (sort_by === "match_score_asc") {
      jobApps.sort((a, b) => {
        const am = a.match_score != null ? a.match_score : -Infinity;
        const bm = b.match_score != null ? b.match_score : -Infinity;
        return am - bm;
      });
    } else {
      // match_score_desc default
      jobApps.sort((a, b) => {
        const am = a.match_score != null ? a.match_score : -Infinity;
        const bm = b.match_score != null ? b.match_score : -Infinity;
        return bm - am;
      });
    }

    const applicants = jobApps.map((application) => {
      const profile = candidateProfiles.find(
        (p) => p.full_name === application.candidate_full_name
      );
      const candidate_name = application.candidate_full_name;
      const candidate_preferred_title = profile ? profile.preferred_job_title : "";
      const candidate_location = profile
        ? `${profile.location_city || ""}, ${profile.location_state || ""}`.trim()
        : "";

      const job = jobs.find((j) => j.id === application.jobId) || null;
      // Foreign key resolution: embed job on application
      const decoratedApplication = {
        ...application,
        job
      };

      return {
        application: decoratedApplication,
        candidate_name,
        candidate_preferred_title,
        candidate_location,
        match_score: application.match_score != null ? application.match_score : null
      };
    });

    return {
      jobId,
      applicants
    };
  }

  // scheduleInterview(jobId, applicationId, scheduled_start, scheduled_end)
  scheduleInterview(jobId, applicationId, scheduled_start, scheduled_end) {
    const interviews = this._getFromStorage("interviews", []);
    const applications = this._getFromStorage("applications", []);
    const jobs = this._getFromStorage("jobs", []);

    const application = applications.find((a) => a.id === applicationId) || null;
    if (!application || application.jobId !== jobId) {
      return {
        success: false,
        message: "Application not found for this job",
        interview: null
      };
    }

    const interview = {
      id: this._generateId("int"),
      jobId,
      applicationId,
      scheduled_start,
      scheduled_end: scheduled_end || null,
      status: "scheduled"
    };

    interviews.push(interview);
    this._saveToStorage("interviews", interviews);

    const job = jobs.find((j) => j.id === jobId) || null;
    const decoratedInterview = {
      ...interview,
      job,
      application
    };

    return {
      success: true,
      message: "Interview scheduled",
      interview: decoratedInterview
    };
  }

  // getJobInterviewSchedule(jobId)
  getJobInterviewSchedule(jobId) {
    const interviews = this._getFromStorage("interviews", []);
    const applications = this._getFromStorage("applications", []);
    const jobs = this._getFromStorage("jobs", []);

    const job = jobs.find((j) => j.id === jobId) || null;

    const items = interviews
      .filter((i) => i.jobId === jobId)
      .map((interview) => {
        const application = applications.find((a) => a.id === interview.applicationId) || null;
        const candidate_name = application ? application.candidate_full_name : "";
        const decoratedInterview = {
          ...interview,
          application,
          job
        };

        return {
          interview: decoratedInterview,
          candidate_name
        };
      });

    return {
      jobId,
      interviews: items
    };
  }

  // =====================
  // Candidate search & shortlist
  // =====================

  // getCandidateSearchFilterOptions()
  getCandidateSearchFilterOptions() {
    return {
      experience_levels: [
        { value: "entry_level_0_2_years", label: "Entry level (0–2 years)" },
        { value: "mid_level_3_5_years", label: "Mid-level (3–5 years)" },
        { value: "senior_level_6_8_years", label: "Senior (6–8 years)" },
        { value: "lead_9_plus_years", label: "Lead (9+ years)" }
      ],
      sort_options: [
        { value: "rating_desc", label: "Rating: High to Low" },
        { value: "rating_asc", label: "Rating: Low to High" }
      ]
    };
  }

  // searchCandidates(keyword, location, experience_level, skills, sort_by, page, page_size)
  searchCandidates(
    keyword,
    location,
    experience_level,
    skills,
    sort_by = "rating_desc",
    page = 1,
    page_size = 20
  ) {
    const profiles = this._getFromStorage("candidate_profiles", []);
    const skillsMaster = this._getFromStorage("skills", []);
    const shortlistId = this._getCurrentShortlistId();
    const shortlistItems = this._getFromStorage("shortlist_items", []);
    const shortlistedIds = new Set(
      shortlistItems
        .filter((si) => si.shortlistId === shortlistId)
        .map((si) => si.candidateProfileId)
    );

    const kw = keyword ? String(keyword).trim().toLowerCase() : "";
    const loc = location ? String(location).trim().toLowerCase() : "";

    // Map skill names to IDs
    let requiredSkillIds = [];
    if (Array.isArray(skills)) {
      skills.forEach((nameRaw) => {
        const name = String(nameRaw).trim().toLowerCase();
        if (!name) return;
        const skill = skillsMaster.find(
          (s) => s.name.toLowerCase() === name
        );
        if (skill) requiredSkillIds.push(skill.id);
      });
    }

    let filtered = profiles.filter((p) => {
      // Keyword filter on preferred title and headline
      if (kw) {
        const haystack = (
          (p.preferred_job_title || "") +
          " " +
          (p.headline || "")
        ).toLowerCase();
        if (!haystack.includes(kw)) return false;
      }

      // Location filter
      if (loc) {
        const combined =
          ((p.location_city || "") + ", " + (p.location_state || "")).toLowerCase();
        if (!combined.includes(loc)) return false;
      }

      // Experience level filter
      if (experience_level && p.experience_level !== experience_level) {
        return false;
      }

      // Skills filter (all required skills must be present)
      if (requiredSkillIds.length > 0) {
        const profileSkillIds = Array.isArray(p.skills) ? p.skills : [];
        const hasAll = requiredSkillIds.every((id) => profileSkillIds.includes(id));
        if (!hasAll) return false;
      }

      return true;
    });

    // Sorting by rating
    filtered.sort((a, b) => {
      const ar = a.rating != null ? a.rating : 0;
      const br = b.rating != null ? b.rating : 0;
      if (sort_by === "rating_asc") return ar - br;
      // rating_desc default
      return br - ar;
    });

    const total_results = filtered.length;
    const start = (page - 1) * page_size;
    const end = start + page_size;
    const pageProfiles = filtered.slice(start, end).map((profile) => {
      const profileSkillIds = Array.isArray(profile.skills) ? profile.skills : [];
      const skillNames = profileSkillIds
        .map((id) => {
          const skill = skillsMaster.find((s) => s.id === id);
          return skill ? skill.name : null;
        })
        .filter(Boolean);

      return {
        profile,
        skills: skillNames,
        is_shortlisted: shortlistedIds.has(profile.id)
      };
    });

    return {
      total_results,
      page,
      page_size,
      candidates: pageProfiles
    };
  }

  // addCandidateToShortlist(candidateProfileId)
  addCandidateToShortlist(candidateProfileId) {
    const shortlist = this._getOrCreateShortlist();
    let shortlistItems = this._getFromStorage("shortlist_items", []);

    const exists = shortlistItems.some(
      (si) => si.shortlistId === shortlist.id && si.candidateProfileId === candidateProfileId
    );

    if (!exists) {
      const item = {
        id: this._generateId("slitem"),
        shortlistId: shortlist.id,
        candidateProfileId,
        added_at: this._nowISO()
      };
      shortlistItems.push(item);
      this._saveToStorage("shortlist_items", shortlistItems);
    }

    const total_candidates_in_shortlist = shortlistItems.filter(
      (si) => si.shortlistId === shortlist.id
    ).length;

    return {
      success: true,
      message: exists ? "Candidate already in shortlist" : "Candidate added to shortlist",
      shortlist,
      total_candidates_in_shortlist
    };
  }

  // removeCandidateFromShortlist(candidateProfileId)
  removeCandidateFromShortlist(candidateProfileId) {
    const shortlistId = this._getCurrentShortlistId();
    if (!shortlistId) {
      return {
        success: false,
        message: "No active shortlist",
        shortlist: null,
        total_candidates_in_shortlist: 0
      };
    }

    const shortlists = this._getFromStorage("shortlists", []);
    const shortlist = shortlists.find((s) => s.id === shortlistId) || null;

    if (!shortlist) {
      return {
        success: false,
        message: "Shortlist not found",
        shortlist: null,
        total_candidates_in_shortlist: 0
      };
    }

    let shortlistItems = this._getFromStorage("shortlist_items", []);
    const before = shortlistItems.length;
    shortlistItems = shortlistItems.filter(
      (si) => !(si.shortlistId === shortlistId && si.candidateProfileId === candidateProfileId)
    );
    this._saveToStorage("shortlist_items", shortlistItems);

    const total_candidates_in_shortlist = shortlistItems.filter(
      (si) => si.shortlistId === shortlistId
    ).length;

    const removed = before !== shortlistItems.length;

    return {
      success: removed,
      message: removed ? "Candidate removed from shortlist" : "Candidate was not in shortlist",
      shortlist,
      total_candidates_in_shortlist
    };
  }

  // getCurrentShortlist()
  getCurrentShortlist() {
    const shortlistId = this._getCurrentShortlistId();
    const shortlists = this._getFromStorage("shortlists", []);
    const shortlist = shortlists.find((s) => s.id === shortlistId) || null;

    if (!shortlist) {
      return {
        exists: false,
        shortlist: null,
        items: []
      };
    }

    const shortlistItems = this._getFromStorage("shortlist_items", []);
    const candidateProfiles = this._getFromStorage("candidate_profiles", []);

    const items = shortlistItems
      .filter((si) => si.shortlistId === shortlistId)
      .map((si) => {
        const profile = candidateProfiles.find((p) => p.id === si.candidateProfileId) || null;
        return {
          profile,
          added_at: si.added_at
        };
      });

    return {
      exists: true,
      shortlist,
      items
    };
  }

  // =====================
  // Job alerts
  // =====================

  // getJobAlertsPageState()
  getJobAlertsPageState() {
    const jobAlerts = this._getFromStorage("job_alerts", []);
    const frequency_options = [
      { value: "instant", label: "Instant" },
      { value: "daily", label: "Daily" },
      { value: "weekly", label: "Weekly" },
      { value: "monthly", label: "Monthly" }
    ];

    return {
      frequency_options,
      existing_alerts: jobAlerts
    };
  }

  // createJobAlert(title_keywords, location, work_arrangement, min_salary, frequency, email)
  createJobAlert(
    title_keywords,
    location,
    work_arrangement,
    min_salary,
    frequency,
    email
  ) {
    const jobAlerts = this._getFromStorage("job_alerts", []);

    const alert = {
      id: this._generateId("alert"),
      title_keywords,
      location,
      work_arrangement: work_arrangement || null,
      min_salary: min_salary != null ? Number(min_salary) : null,
      frequency,
      email,
      is_active: true,
      created_at: this._nowISO()
    };

    jobAlerts.push(alert);
    this._saveToStorage("job_alerts", jobAlerts);

    return {
      success: true,
      message: "Job alert created",
      alert
    };
  }

  // updateJobAlertStatus(alertId, is_active)
  updateJobAlertStatus(alertId, is_active) {
    const jobAlerts = this._getFromStorage("job_alerts", []);
    const idx = jobAlerts.findIndex((a) => a.id === alertId);
    if (idx === -1) {
      return {
        success: false,
        message: "Alert not found",
        alert: null
      };
    }

    jobAlerts[idx].is_active = !!is_active;
    this._saveToStorage("job_alerts", jobAlerts);

    return {
      success: true,
      message: "Alert updated",
      alert: jobAlerts[idx]
    };
  }

  // =====================
  // Salary insights
  // =====================

  // getSalaryInsightOptions()
  getSalaryInsightOptions() {
    return {
      experience_levels: [
        { value: "entry_level_0_2_years", label: "Entry level (0–2 years)" },
        { value: "mid_level_3_5_years", label: "Mid-level (3–5 years)" },
        { value: "senior_level_6_8_years", label: "Senior (6–8 years)" },
        { value: "lead_9_plus_years", label: "Lead (9+ years)" }
      ],
      popular_roles: [
        "Product Manager",
        "Software Engineer",
        "Data Analyst",
        "UX Designer",
        "Project Manager"
      ]
    };
  }

  // generateSalaryComparison(role_name, primary_location, comparison_location, experience_level)
  generateSalaryComparison(
    role_name,
    primary_location,
    comparison_location,
    experience_level
  ) {
    const salaryDatasets = this._getFromStorage("salary_datasets", []);
    const salaryReports = this._getFromStorage("salary_reports", []);

    const primary_dataset =
      salaryDatasets.find(
        (d) =>
          d.role_name === role_name &&
          d.location === primary_location &&
          d.experience_level === experience_level
      ) || null;

    const comparison_dataset =
      salaryDatasets.find(
        (d) =>
          d.role_name === role_name &&
          d.location === comparison_location &&
          d.experience_level === experience_level
      ) || null;

    const report = {
      id: this._generateId("salrep"),
      role_name,
      primary_location,
      comparison_location,
      experience_level,
      primary_dataset_id: primary_dataset ? primary_dataset.id : null,
      comparison_dataset_id: comparison_dataset ? comparison_dataset.id : null,
      generated_at: this._nowISO(),
      saved: false,
      notes: ""
    };

    salaryReports.push(report);
    this._saveToStorage("salary_reports", salaryReports);

    const primary_summary = {
      median_salary: primary_dataset ? primary_dataset.median_salary : null,
      percentile_25_salary: primary_dataset ? primary_dataset.percentile_25_salary : null,
      percentile_75_salary: primary_dataset ? primary_dataset.percentile_75_salary : null
    };

    const comparison_summary = {
      median_salary: comparison_dataset ? comparison_dataset.median_salary : null,
      percentile_25_salary: comparison_dataset
        ? comparison_dataset.percentile_25_salary
        : null,
      percentile_75_salary: comparison_dataset
        ? comparison_dataset.percentile_75_salary
        : null
    };

    const salary_difference =
      (primary_summary.median_salary || 0) - (comparison_summary.median_salary || 0);

    const currency =
      (primary_dataset && primary_dataset.currency) ||
      (comparison_dataset && comparison_dataset.currency) ||
      "USD";

    return {
      report,
      primary_dataset,
      comparison_dataset,
      primary_summary,
      comparison_summary,
      salary_difference,
      currency
    };
  }

  // saveSalaryReport(salary_report_id)
  saveSalaryReport(salary_report_id) {
    const salaryReports = this._getFromStorage("salary_reports", []);
    const idx = salaryReports.findIndex((r) => r.id === salary_report_id);
    if (idx === -1) {
      return {
        success: false,
        message: "Salary report not found",
        report: null
      };
    }

    salaryReports[idx].saved = true;
    this._saveToStorage("salary_reports", salaryReports);

    const decorated = this._decorateSalaryReport(salaryReports[idx]);

    return {
      success: true,
      message: "Salary report saved",
      report: decorated
    };
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
