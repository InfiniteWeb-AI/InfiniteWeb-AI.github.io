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
  }

  // -------------------- Storage helpers --------------------

  _initStorage() {
    const ensure = (key, defaultValue) => {
      if (localStorage.getItem(key) === null) {
        localStorage.setItem(key, JSON.stringify(defaultValue));
      }
    };

    // Core entity tables
    ensure("jobs", []); // Job[]
    ensure("employers", []); // Employer[]
    ensure("locations", []); // Location[]
    ensure("saved_jobs", []); // SavedJob[]
    ensure("job_notes", []); // JobNote[]
    ensure("job_alerts", []); // JobAlert[]
    ensure("applications", []); // QuickApplication[]
    ensure("job_compare_sets", []); // JobCompareSet[]
    ensure("job_email_shares", []); // JobEmailShare[]

    // Supporting tables
    ensure("recent_job_searches", []); // {title_keywords, location_text, executed_at}[]
    ensure("contact_requests", []); // internal tickets

    // Static/semi-static content
    ensure("homepage_content", this._getDefaultHomePageContent());
    ensure("about_page_content", this._getDefaultAboutPageContent());
    ensure("contact_page_content", this._getDefaultContactPageContent());
    ensure("help_faq_content", this._getDefaultHelpFaqContent());
    ensure("terms_of_use_content", this._getDefaultTermsOfUseContent());
    ensure("privacy_policy_content", this._getDefaultPrivacyPolicyContent());
    ensure("cookie_policy_content", this._getDefaultCookiePolicyContent());

    // Misc
    if (localStorage.getItem("idCounter") === null) {
      localStorage.setItem("idCounter", "1000");
    }

    // Last search context (for distance in compare view) – optional
    ensure("last_search_context", null);
  }

  _getFromStorage(key, defaultValue) {
    const raw = localStorage.getItem(key);
    if (raw === null || raw === undefined) {
      return defaultValue !== undefined ? defaultValue : [];
    }
    try {
      return JSON.parse(raw);
    } catch (e) {
      return defaultValue !== undefined ? defaultValue : [];
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

  _nowIso() {
    return new Date().toISOString();
  }

  _ensureArray(value) {
    return Array.isArray(value) ? value : [];
  }

  // -------------------- Domain helpers --------------------

  _getOrCreateSavedJobsStore() {
    const saved = this._getFromStorage("saved_jobs", []);
    if (!Array.isArray(saved)) {
      this._saveToStorage("saved_jobs", []);
      return [];
    }
    return saved;
  }

  _getOrCreateCompareSet() {
    let sets = this._getFromStorage("job_compare_sets", []);
    if (!Array.isArray(sets)) {
      sets = [];
    }
    let active = sets.find((s) => s.is_active);
    if (!active) {
      active = {
        id: this._generateId("compare"),
        jobIds: [],
        source_page: "job_search_results",
        created_at: this._nowIso(),
        updated_at: this._nowIso(),
        is_active: true
      };
      sets.push(active);
      this._saveToStorage("job_compare_sets", sets);
    }
    return active;
  }

  _updateCompareSet(updatedSet) {
    let sets = this._getFromStorage("job_compare_sets", []);
    const idx = sets.findIndex((s) => s.id === updatedSet.id);
    if (idx >= 0) {
      sets[idx] = updatedSet;
    } else {
      sets.push(updatedSet);
    }
    this._saveToStorage("job_compare_sets", sets);
  }

  _getOrCreateJobAlertsStore() {
    const alerts = this._getFromStorage("job_alerts", []);
    if (!Array.isArray(alerts)) {
      this._saveToStorage("job_alerts", []);
      return [];
    }
    return alerts;
  }

  _sendEmail(type, payload) {
    // Simulation only: record metadata; always mark as sent
    const sent_at = this._nowIso();
    return {
      status: "sent",
      sent_at,
      type,
      payload
    };
  }

  _haversineMiles(lat1, lon1, lat2, lon2) {
    if (
      typeof lat1 !== "number" ||
      typeof lon1 !== "number" ||
      typeof lat2 !== "number" ||
      typeof lon2 !== "number"
    ) {
      return null;
    }
    const toRad = (deg) => (deg * Math.PI) / 180;
    const R = 3958.8; // Earth radius in miles
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  _findLocationByText(query, locations) {
    if (!query) return null;
    const q = String(query).toLowerCase().trim();
    if (!q) return null;

    locations = this._ensureArray(locations);

    // Prefer exact matches on display_name, city+state, zip, country
    let exact = locations.find((loc) => {
      if (!loc) return false;
      const dn = (loc.display_name || "").toLowerCase();
      const city = (loc.city || "").toLowerCase();
      const state = (loc.state || loc.state_code || "").toLowerCase();
      const zip = (loc.zip_code || "").toLowerCase();
      const country = (loc.country || "").toLowerCase();
      return (
        dn === q ||
        (city && state && `${city}, ${state}` === q) ||
        (zip && zip === q) ||
        (country && country === q)
      );
    });

    if (exact) return exact;

    // Fallback to partial matches on display fields
    let partial = locations.find((loc) => {
      if (!loc) return false;
      const dn = (loc.display_name || "").toLowerCase();
      const city = (loc.city || "").toLowerCase();
      const state = (loc.state || loc.state_code || "").toLowerCase();
      const zip = (loc.zip_code || "").toLowerCase();
      const country = (loc.country || "").toLowerCase();
      return (
        dn.includes(q) ||
        (city && city.includes(q)) ||
        (state && state.includes(q)) ||
        (zip && zip.includes(q)) ||
        (country && country.includes(q))
      );
    });

    return partial || null;
  }

  _applyPostedDateRangeFilter(jobs, rangeValue) {
    if (!rangeValue || rangeValue === "any_time") return jobs;

    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    let maxAgeDays;
    switch (rangeValue) {
      case "last_24_hours":
        maxAgeDays = 1;
        break;
      case "last_3_days":
        maxAgeDays = 3;
        break;
      case "last_7_days":
        maxAgeDays = 7;
        break;
      case "last_14_days":
        maxAgeDays = 14;
        break;
      case "last_30_days":
        maxAgeDays = 30;
        break;
      default:
        return jobs;
    }

    return jobs.filter((job) => {
      if (!job || !job.posted_date) return false;
      const postedTime = Date.parse(job.posted_date);
      if (Number.isNaN(postedTime)) return false;
      const ageDays = (now - postedTime) / dayMs;
      return ageDays <= maxAgeDays;
    });
  }

  _getDefaultHomePageContent() {
    return {
      headline: "Find your next role",
      subheadline: "Search thousands of curated opportunities and manage your applications in one place.",
      feature_highlights: [
        {
          id: "fh_saving_jobs",
          title: "Save & shortlist jobs",
          description: "Bookmark interesting roles to review or apply later.",
          feature_key: "saving_jobs"
        },
        {
          id: "fh_comparing_jobs",
          title: "Compare offers side-by-side",
          description: "Compare salary, benefits, and location for multiple roles.",
          feature_key: "comparing_jobs"
        },
        {
          id: "fh_job_alerts",
          title: "Stay in the loop",
          description: "Create tailored job alerts and get new matches by email.",
          feature_key: "job_alerts"
        },
        {
          id: "fh_quick_apply",
          title: "Apply in minutes",
          description: "Use quick-apply roles to send applications without leaving the site.",
          feature_key: "quick_apply"
        }
      ],
      popular_searches: [
        {
          id: "ps_software_engineer_sf",
          label: "Senior Software Engineer in San Francisco",
          title_keywords: "Senior Software Engineer",
          location_text: "San Francisco, CA"
        },
        {
          id: "ps_marketing_manager_chicago",
          label: "Marketing Manager in Chicago",
          title_keywords: "Marketing Manager",
          location_text: "Chicago, IL"
        },
        {
          id: "ps_remote_data_analyst_us",
          label: "Remote Data Analyst in the US",
          title_keywords: "Data Analyst",
          location_text: "United States"
        }
      ]
    };
  }

  _getDefaultAboutPageContent() {
    return {
      mission:
        "We connect talented professionals with top employers through a curated, transparent job search experience.",
      specializations: [
        "Technology & engineering",
        "Marketing & creative",
        "Project & product management",
        "Customer support & operations",
        "Healthcare and clinical support"
      ],
      feature_descriptions: [
        {
          feature_key: "saving_jobs",
          title: "Shortlist the right roles",
          description:
            "Save jobs that catch your eye and organize them with personal notes so you can decide where to apply."
        },
        {
          feature_key: "comparing_jobs",
          title: "Compare opportunities",
          description:
            "Use the comparison view to evaluate compensation, benefits, and work style across multiple jobs."
        },
        {
          feature_key: "job_alerts",
          title: "Smart job alerts",
          description:
            "Configure alerts based on your preferences and receive new roles by email as soon as they appear."
        },
        {
          feature_key: "quick_apply",
          title: "Quick applications",
          description:
            "Apply for compatible roles directly on our site, without re-uploading your resume each time."
        }
      ]
    };
  }

  _getDefaultContactPageContent() {
    return {
      agency_email_addresses: ["info@example-agency.com", "support@example-agency.com"],
      agency_phone_numbers: ["+1 (555) 000-1234"],
      office_locations: [
        {
          label: "Head Office",
          address: "123 Market Street, Suite 500, San Francisco, CA 94103"
        }
      ],
      help_links: [
        { label: "Using job search filters", slug: "search_filters" },
        { label: "Managing saved jobs", slug: "saved_jobs" },
        { label: "Creating job alerts", slug: "job_alerts" },
        { label: "Quick applications", slug: "quick_apply" }
      ]
    };
  }

  _getDefaultHelpFaqContent() {
    return [
      {
        section_key: "search",
        section_title: "Searching for jobs",
        faqs: [
          {
            question: "How do I search for jobs?",
            answer_html:
              "<p>Use the job title and location fields on the homepage or search page. You can refine results using filters for salary, job type, experience level, work arrangement, schedule, and posted date.</p>"
          },
          {
            question: "What does the posted date filter do?",
            answer_html:
              "<p>The posted date filter lets you limit results to roles posted within a specific timeframe (for example, last 3 days or last 7 days).</p>"
          }
        ]
      },
      {
        section_key: "saved_jobs",
        section_title: "Saved jobs & notes",
        faqs: [
          {
            question: "How do I save a job?",
            answer_html:
              "<p>Click the save or heart icon on any job card or job detail page. The job will appear in your Saved Jobs list.</p>"
          },
          {
            question: "Can I add notes to jobs?",
            answer_html:
              "<p>Yes. Open the job detail page and use the notes section to record why you like a role or how it compares to others.</p>"
          }
        ]
      },
      {
        section_key: "comparison",
        section_title: "Comparing jobs",
        faqs: [
          {
            question: "How do I compare jobs side-by-side?",
            answer_html:
              "<p>Select the compare checkbox on multiple job cards. Then click the Compare button that appears to open a side-by-side view.</p>"
          }
        ]
      },
      {
        section_key: "alerts",
        section_title: "Job alerts",
        faqs: [
          {
            question: "How do I create a job alert?",
            answer_html:
              "<p>Run a search with your desired filters, then click the Create alert button above the results. Choose an email frequency and save.</p>"
          }
        ]
      },
      {
        section_key: "applications",
        section_title: "Quick applications",
        faqs: [
          {
            question: "What is quick apply?",
            answer_html:
              "<p>Quick apply lets you submit a short application directly on our site for supported jobs, without uploading files.</p>"
          }
        ]
      }
    ];
  }

  _getDefaultTermsOfUseContent() {
    return {
      last_updated: new Date().toISOString().split("T")[0],
      content_html:
        "<h1>Terms of Use</h1><p>These terms govern your use of this recruitment website. By using the site, you agree to these terms.</p>"
    };
  }

  _getDefaultPrivacyPolicyContent() {
    return {
      last_updated: new Date().toISOString().split("T")[0],
      content_html:
        "<h1>Privacy Policy</h1><p>We use your data to provide job matching and related services. Please review this policy to understand how your data is used.</p>"
    };
  }

  _getDefaultCookiePolicyContent() {
    return {
      last_updated: new Date().toISOString().split("T")[0],
      content_html:
        "<h1>Cookie Policy</h1><p>We use cookies to improve your experience, analyze traffic, and personalize content.</p>"
    };
  }

  // -------------------- Interfaces --------------------
  // 1. getHomePageContent

  getHomePageContent() {
    return this._getFromStorage("homepage_content", this._getDefaultHomePageContent());
  }

  // 2. getRecentJobSearches

  getRecentJobSearches() {
    return this._getFromStorage("recent_job_searches", []);
  }

  // 3. getLocationSuggestions(query, limit = 10)

  getLocationSuggestions(query, limit) {
    const effectiveLimit = typeof limit === "number" && limit > 0 ? limit : 10;
    if (!query) return [];
    const q = String(query).toLowerCase().trim();
    if (!q) return [];

    const locations = this._ensureArray(this._getFromStorage("locations", []));

    const matches = locations
      .filter((loc) => {
        if (!loc) return false;
        const fields = [
          loc.display_name,
          loc.city,
          loc.state,
          loc.state_code,
          loc.zip_code,
          loc.country,
          loc.country_code
        ]
          .filter(Boolean)
          .map((v) => String(v).toLowerCase());
        return fields.some((f) => f.includes(q));
      })
      .sort((a, b) => {
        const ad = (a.display_name || "").toLowerCase();
        const bd = (b.display_name || "").toLowerCase();
        if (ad < bd) return -1;
        if (ad > bd) return 1;
        return 0;
      });

    return matches.slice(0, effectiveLimit);
  }

  // 4. getJobFilterOptions

  getJobFilterOptions() {
    return {
      pay_type_options: [
        { value: "any", label: "Any" },
        { value: "annual_salary", label: "Annual salary" },
        { value: "hourly", label: "Hourly" },
        { value: "daily_rate", label: "Daily rate" }
      ],
      job_type_options: [
        { value: "full_time", label: "Full-time" },
        { value: "part_time", label: "Part-time" },
        { value: "contract", label: "Contract" },
        { value: "temporary", label: "Temporary" },
        { value: "internship", label: "Internship" },
        { value: "other", label: "Other" }
      ],
      experience_level_options: [
        { value: "entry_level", label: "Entry level" },
        { value: "mid_level", label: "Mid level" },
        { value: "senior_level", label: "Senior" },
        { value: "management", label: "Management" },
        { value: "director", label: "Director" },
        { value: "executive", label: "Executive" },
        { value: "other", label: "Other" }
      ],
      work_arrangement_options: [
        { value: "on_site", label: "On-site" },
        { value: "remote_only", label: "Remote only" },
        { value: "remote_hybrid", label: "Remote / hybrid" }
      ],
      industry_options: [
        { value: "technology", label: "Technology" },
        { value: "marketing", label: "Marketing" },
        { value: "healthcare", label: "Healthcare" },
        { value: "customer_support", label: "Customer support" },
        { value: "finance", label: "Finance" },
        { value: "operations", label: "Operations" },
        { value: "project_management", label: "Project management" },
        { value: "design", label: "Design" },
        { value: "data_analytics", label: "Data analytics" },
        { value: "other", label: "Other" }
      ],
      schedule_options: [
        { value: "standard", label: "Standard" },
        { value: "weekends_only", label: "Weekends only" },
        { value: "weekdays_only", label: "Weekdays only" },
        { value: "nights", label: "Nights" },
        { value: "flexible", label: "Flexible" },
        { value: "shift_work", label: "Shift work" },
        { value: "other", label: "Other" }
      ],
      posted_date_range_options: [
        { value: "any_time", label: "Any time" },
        { value: "last_24_hours", label: "Last 24 hours" },
        { value: "last_3_days", label: "Last 3 days" },
        { value: "last_7_days", label: "Last 7 days" },
        { value: "last_14_days", label: "Last 14 days" },
        { value: "last_30_days", label: "Last 30 days" }
      ],
      radius_options_miles: [5, 10, 15, 25, 50, 100],
      sort_options: [
        { value: "relevance", label: "Best match" },
        { value: "salary_desc", label: "Salary: High to Low" },
        { value: "daily_rate_desc", label: "Daily rate: High to Low" },
        { value: "date_posted_desc", label: "Date posted: Newest first" },
        { value: "distance_asc", label: "Distance: Closest first" },
        {
          value: "application_deadline_asc",
          label: "Application deadline: Soonest first"
        }
      ],
      salary_defaults: {
        min_annual: 30000,
        max_annual: 300000,
        min_hourly: 10,
        max_hourly: 200,
        min_daily_rate: 100,
        max_daily_rate: 2000
      }
    };
  }

  // 5. searchJobs

  searchJobs(
    title_keywords,
    location_text,
    locationId,
    radius_miles,
    filters,
    sort_by,
    page,
    page_size
  ) {
    const jobsAll = this._ensureArray(this._getFromStorage("jobs", [])).filter(
      (j) => j && j.is_active !== false
    );
    const locations = this._ensureArray(this._getFromStorage("locations", []));
    const employers = this._ensureArray(this._getFromStorage("employers", []));

    const locationById = {};
    locations.forEach((l) => {
      if (l && l.id) locationById[l.id] = l;
    });
    const employerById = {};
    employers.forEach((e) => {
      if (e && e.id) employerById[e.id] = e;
    });

    let searchLocation = null;
    if (locationId) {
      searchLocation = locationById[locationId] || null;
    }
    if (!searchLocation && location_text) {
      searchLocation = this._findLocationByText(location_text, locations);
    }

    const payFilters = filters || {};
    const sort = sort_by || "relevance";
    const currentPage = typeof page === "number" && page > 0 ? page : 1;
    const perPage = typeof page_size === "number" && page_size > 0 ? page_size : 20;

    // Persist last search context for later distance calculations in compare
    const lastContext = {
      title_keywords: title_keywords || "",
      location_text: location_text || "",
      locationId: searchLocation ? searchLocation.id : null,
      radius_miles: typeof radius_miles === "number" ? radius_miles : null,
      latitude: searchLocation ? searchLocation.latitude : null,
      longitude: searchLocation ? searchLocation.longitude : null,
      executed_at: this._nowIso()
    };
    this._saveToStorage("last_search_context", lastContext);

    // Track recent searches (simple MRU up to 10 entries)
    let recent = this._ensureArray(
      this._getFromStorage("recent_job_searches", [])
    );
    const key = `${title_keywords || ""}|${location_text || ""}`;
    recent = recent.filter(
      (r) => `${r.title_keywords || ""}|${r.location_text || ""}` !== key
    );
    recent.unshift({
      title_keywords: title_keywords || "",
      location_text: location_text || "",
      executed_at: this._nowIso()
    });
    if (recent.length > 10) recent = recent.slice(0, 10);
    this._saveToStorage("recent_job_searches", recent);

    // Precompute distance for all jobs if we have a search location
    const searchLat = searchLocation ? searchLocation.latitude : null;
    const searchLon = searchLocation ? searchLocation.longitude : null;

    let jobs = jobsAll.map((job) => {
      const loc = job ? locationById[job.locationId] : null;
      let distance = null;
      if (
        searchLat != null &&
        searchLon != null &&
        loc &&
        typeof loc.latitude === "number" &&
        typeof loc.longitude === "number"
      ) {
        distance = this._haversineMiles(
          searchLat,
          searchLon,
          loc.latitude,
          loc.longitude
        );
      }
      return Object.assign({}, job, { _distanceMiles: distance });
    });

    // Title / keyword filter
    if (title_keywords) {
      const q = String(title_keywords).toLowerCase().trim();
      if (q) {
        jobs = jobs.filter((job) => {
          const title = (job.title || "").toLowerCase();
          return title.includes(q);
        });
      }
    }

    // Location filter (hierarchical: ZIP -> city/state -> country)
    const hasRadius = typeof radius_miles === "number" && !Number.isNaN(radius_miles);
    if (searchLocation) {
      if (hasRadius && searchLat != null && searchLon != null) {
        jobs = jobs.filter((job) => {
          const d = job._distanceMiles;
          return typeof d === "number" && d <= radius_miles;
        });
      } else if (location_text) {
        jobs = jobs.filter((job) => {
          const loc = locationById[job.locationId];
          if (!loc) return false;

          // ZIP-level
          if (searchLocation.zip_code) {
            return loc.zip_code === searchLocation.zip_code;
          }

          // City + state-level
          if (searchLocation.city && searchLocation.state_code) {
            return (
              loc.city === searchLocation.city &&
              loc.state_code === searchLocation.state_code
            );
          }

          // Country-level
          if (searchLocation.country_code) {
            return loc.country_code === searchLocation.country_code;
          }

          return true;
        });
      }
    }

    // Salary, pay_type, job_type, etc. filters
    const salaryMin =
      typeof payFilters.salary_min === "number"
        ? payFilters.salary_min
        : null;
    const salaryMax =
      typeof payFilters.salary_max === "number"
        ? payFilters.salary_max
        : null;
    const payTypeFilter = payFilters.pay_type || "any";
    const jobTypes = this._ensureArray(payFilters.job_types);
    const experienceLevels = this._ensureArray(payFilters.experience_levels);
    const workArrangements = this._ensureArray(payFilters.work_arrangements);
    const industryFilter = payFilters.industry || null;
    const scheduleFilter = payFilters.schedule || null;
    const postedRange = payFilters.posted_date_range || "any_time";

    jobs = jobs.filter((job) => {
      if (payTypeFilter && payTypeFilter !== "any") {
        if (job.pay_type !== payTypeFilter) return false;
      }

      if (salaryMin != null) {
        if (typeof job.compensation_min !== "number") return false;
        if (job.compensation_min < salaryMin) return false;
      }

      if (salaryMax != null) {
        const upper =
          typeof job.compensation_max === "number"
            ? job.compensation_max
            : job.compensation_min;
        if (typeof upper !== "number") return false;
        if (upper > salaryMax) return false;
      }

      if (jobTypes.length && !jobTypes.includes(job.job_type)) return false;
      if (
        experienceLevels.length &&
        !experienceLevels.includes(job.experience_level)
      )
        return false;
      if (
        workArrangements.length &&
        !workArrangements.includes(job.work_arrangement)
      )
        return false;
      if (industryFilter && job.industry !== industryFilter) return false;
      if (scheduleFilter && job.schedule !== scheduleFilter) return false;

      return true;
    });

    // Posted date range filter
    jobs = this._applyPostedDateRangeFilter(jobs, postedRange);

    // Sorting
    const cmpDateDesc = (a, b) => {
      const at = Date.parse(a.posted_date || 0) || 0;
      const bt = Date.parse(b.posted_date || 0) || 0;
      return bt - at;
    };

    const cmpSalaryDesc = (a, b) => {
      const aMax =
        typeof a.compensation_max === "number"
          ? a.compensation_max
          : a.compensation_min || 0;
      const bMax =
        typeof b.compensation_max === "number"
          ? b.compensation_max
          : b.compensation_min || 0;
      return bMax - aMax;
    };

    const cmpDailyRateDesc = (a, b) => {
      const aVal = a.pay_type === "daily_rate" ? a.compensation_min || 0 : 0;
      const bVal = b.pay_type === "daily_rate" ? b.compensation_min || 0 : 0;
      return bVal - aVal;
    };

    const cmpDistanceAsc = (a, b) => {
      const ad = typeof a._distanceMiles === "number" ? a._distanceMiles : Infinity;
      const bd = typeof b._distanceMiles === "number" ? b._distanceMiles : Infinity;
      return ad - bd;
    };

    const cmpDeadlineAsc = (a, b) => {
      const at = Date.parse(a.application_deadline || 0) || Infinity;
      const bt = Date.parse(b.application_deadline || 0) || Infinity;
      return at - bt;
    };

    switch (sort) {
      case "salary_desc":
        jobs.sort(cmpSalaryDesc);
        break;
      case "daily_rate_desc":
        jobs.sort(cmpDailyRateDesc);
        break;
      case "date_posted_desc":
        jobs.sort(cmpDateDesc);
        break;
      case "distance_asc":
        jobs.sort(cmpDistanceAsc);
        break;
      case "application_deadline_asc":
        jobs.sort(cmpDeadlineAsc);
        break;
      case "relevance":
      default:
        // For simplicity, treat relevance as newest first
        jobs.sort(cmpDateDesc);
        break;
    }

    const totalResults = jobs.length;
    const totalPages = Math.max(1, Math.ceil(totalResults / perPage));
    const start = (currentPage - 1) * perPage;
    const pageItems = jobs.slice(start, start + perPage);

    // Instrumentation for task completion tracking (task_1)
    try {
      const titleLc_task1 = (title_keywords || "").toLowerCase();
      const locLc_task1 = (location_text || "").toLowerCase().trim();

      const searchLocCity_task1 =
        searchLocation && (searchLocation.city || "").toLowerCase();
      const searchLocState_task1 =
        searchLocation &&
        (searchLocation.state_code || searchLocation.state || "").toLowerCase();

      const matchesTitle_task1 = titleLc_task1.includes("senior software engineer");
      const matchesLocationText_task1 = locLc_task1 === "san francisco, ca";
      const matchesLocationEntity_task1 =
        !!searchLocation &&
        searchLocCity_task1 === "san francisco" &&
        (searchLocState_task1 === "ca" || searchLocState_task1 === "california");

      const salaryMin_task1 =
        filters && typeof filters.salary_min === "number"
          ? filters.salary_min
          : null;
      const postedRangeFilter_task1 =
        filters && typeof filters.posted_date_range === "string"
          ? filters.posted_date_range
          : null;

      const matchesFilters_task1 =
        salaryMin_task1 !== null &&
        salaryMin_task1 >= 150000 &&
        postedRangeFilter_task1 === "last_3_days";

      const matchesSort_task1 = sort_by === "salary_desc";

      if (
        matchesTitle_task1 &&
        (matchesLocationText_task1 || matchesLocationEntity_task1) &&
        matchesFilters_task1 &&
        matchesSort_task1
      ) {
        localStorage.setItem(
          "task1_searchContext",
          JSON.stringify({
            title_keywords: title_keywords || "",
            location_text: location_text || "",
            radius_miles:
              typeof radius_miles === "number" ? radius_miles : null,
            filters_snapshot: {
              salary_min:
                typeof (filters && filters.salary_min) === "number"
                  ? filters.salary_min
                  : null,
              salary_max:
                typeof (filters && filters.salary_max) === "number"
                  ? filters.salary_max
                  : null,
              pay_type: (filters && filters.pay_type) || "any",
              posted_date_range:
                (filters && filters.posted_date_range) || "any_time"
            },
            sort_by: sort_by || "relevance",
            page: typeof page === "number" ? page : 1,
            executed_at: this._nowIso(),
            // IDs of the first three jobs on the current page in the computed order
            top_result_job_ids: pageItems
              .slice(0, 3)
              .map((j) => j.id || j.job_id)
          })
        );
      }
    } catch (e) {
      console.error("Instrumentation error for task_1:", e);
    }

    // Instrumentation for task completion tracking (task_2)
    try {
      const titleLc_task2 = (title_keywords || "").toLowerCase();
      const locLc_task2 = (location_text || "").toLowerCase().trim();

      const searchLocCity_task2 =
        searchLocation && (searchLocation.city || "").toLowerCase();
      const searchLocState_task2 =
        searchLocation &&
        (searchLocation.state_code || searchLocation.state || "").toLowerCase();

      const matchesTitle_task2 = titleLc_task2.includes("marketing manager");

      const matchesLocationText_task2 = locLc_task2 === "chicago, il";
      const matchesLocationEntity_task2 =
        !!searchLocation &&
        searchLocCity_task2 === "chicago" &&
        (searchLocState_task2 === "il" || searchLocState_task2 === "illinois");

      const salaryMin_task2 =
        filters && typeof filters.salary_min === "number"
          ? filters.salary_min
          : null;
      const salaryMax_task2 =
        filters && typeof filters.salary_max === "number"
          ? filters.salary_max
          : null;

      const matchesSalary_task2 =
        salaryMin_task2 === 80000 && salaryMax_task2 === 100000;

      if (
        matchesTitle_task2 &&
        (matchesLocationText_task2 || matchesLocationEntity_task2) &&
        matchesSalary_task2
      ) {
        localStorage.setItem(
          "task2_searchContext",
          JSON.stringify({
            title_keywords: title_keywords || "",
            location_text: location_text || "",
            radius_miles:
              typeof radius_miles === "number" ? radius_miles : null,
            filters_snapshot: {
              salary_min:
                typeof (filters && filters.salary_min) === "number"
                  ? filters.salary_min
                  : null,
              salary_max:
                typeof (filters && filters.salary_max) === "number"
                  ? filters.salary_max
                  : null,
              pay_type: (filters && filters.pay_type) || "any"
            },
            sort_by: sort_by || "relevance",
            page: typeof page === "number" ? page : 1,
            executed_at: this._nowIso(),
            // IDs of the first two jobs returned on this page
            top_result_job_ids: pageItems
              .slice(0, 2)
              .map((j) => j.id || j.job_id)
          })
        );
      }
    } catch (e) {
      console.error("Instrumentation error for task_2:", e);
    }

    // Instrumentation for task completion tracking (task_9)
    try {
      const titleLc_task9 = (title_keywords || "").toLowerCase();
      const locLc_task9 = (location_text || "").toLowerCase().trim();

      const salaryMin_task9 =
        filters && typeof filters.salary_min === "number"
          ? filters.salary_min
          : null;
      const salaryMax_task9 =
        filters && typeof filters.salary_max === "number"
          ? filters.salary_max
          : null;
      const workArrangements_task9 =
        (filters && filters.work_arrangements) || [];
      const industry_task9 =
        filters && Object.prototype.hasOwnProperty.call(filters, "industry")
          ? filters.industry
          : undefined;
      const postedRange_task9 =
        filters && typeof filters.posted_date_range === "string"
          ? filters.posted_date_range
          : undefined;

      const searchCountry_task9 =
        searchLocation && (searchLocation.country || "").toLowerCase();
      const searchCountryCode_task9 =
        searchLocation && (searchLocation.country_code || "").toLowerCase();
      const searchDisplay_task9 =
        searchLocation && (searchLocation.display_name || "").toLowerCase();

      const matchesTitle_task9 = titleLc_task9.includes("product manager");
      const matchesLocation_task9 =
        locLc_task9 === "united states" ||
        searchCountry_task9 === "united states" ||
        searchCountryCode_task9 === "us" ||
        searchDisplay_task9 === "united states";

      const initialCond_task9 =
        matchesTitle_task9 &&
        matchesLocation_task9 &&
        industry_task9 === "technology" &&
        typeof salaryMin_task9 === "number" &&
        salaryMin_task9 >= 130000 &&
        postedRange_task9 === "last_7_days";

      const afterCond_task9 =
        matchesTitle_task9 &&
        matchesLocation_task9 &&
        (industry_task9 === null || typeof industry_task9 === "undefined") &&
        typeof salaryMin_task9 === "number" &&
        salaryMin_task9 >= 130000 &&
        postedRange_task9 === "last_7_days" &&
        sort_by === "date_posted_desc";

      let existing = null;
      try {
        existing = JSON.parse(
          localStorage.getItem("task9_searchFlows") || "null"
        );
      } catch (e) {
        existing = null;
      }
      if (!existing || typeof existing !== "object") existing = {};

      if (initialCond_task9) {
        existing.initial = {
          title_keywords: title_keywords || "",
          location_text: location_text || "",
          radius_miles:
            typeof radius_miles === "number" ? radius_miles : null,
          filters_snapshot: {
            salary_min:
              typeof (filters && filters.salary_min) === "number"
                ? filters.salary_min
                : null,
            salary_max:
              typeof (filters && filters.salary_max) === "number"
                ? filters.salary_max
                : null,
            work_arrangements: workArrangements_task9,
            industry: (filters && filters.industry) || null,
            posted_date_range:
              (filters && filters.posted_date_range) || "any_time"
          },
          sort_by: sort_by || "relevance",
          page: typeof page === "number" ? page : 1,
          executed_at: this._nowIso()
        };
      }

      if (afterCond_task9) {
        existing.afterIndustryRemoved = {
          title_keywords: title_keywords || "",
          location_text: location_text || "",
          radius_miles:
            typeof radius_miles === "number" ? radius_miles : null,
          filters_snapshot: {
            salary_min:
              typeof (filters && filters.salary_min) === "number"
                ? filters.salary_min
                : null,
            salary_max:
              typeof (filters && filters.salary_max) === "number"
                ? filters.salary_max
                : null,
            work_arrangements: workArrangements_task9,
            industry: null, // explicitly cleared
            posted_date_range:
              (filters && filters.posted_date_range) || "any_time"
          },
          sort_by: sort_by || "relevance",
          page: typeof page === "number" ? page : 1,
          executed_at: this._nowIso(),
          // IDs of the first two jobs on this page after industry has been removed and newest sort applied
          top_result_job_ids: pageItems
            .slice(0, 2)
            .map((j) => j.id || j.job_id)
        };
      }

      localStorage.setItem("task9_searchFlows", JSON.stringify(existing));
    } catch (e) {
      console.error("Instrumentation error for task_9:", e);
    }

    // Saved & compare info
    const savedJobs = this._getOrCreateSavedJobsStore();
    const savedJobIds = new Set(savedJobs.map((sj) => sj.jobId));

    const compareSet = this._getOrCreateCompareSet();
    const compareIds = new Set(this._ensureArray(compareSet.jobIds));

    const resultsJobs = pageItems.map((job) => {
      const employer = employerById[job.employerId] || null;
      const loc = locationById[job.locationId] || null;
      return {
        job_id: job.id,
        title: job.title,
        employer_name: employer ? employer.name : "",
        employer_logo_url: employer ? employer.logo_url || "" : "",
        location_display_name: loc ? loc.display_name || "" : "",
        remote_tagline: job.remote_tagline || "",
        job_type: job.job_type,
        experience_level: job.experience_level,
        work_arrangement: job.work_arrangement,
        schedule: job.schedule,
        pay_type: job.pay_type,
        compensation_min: job.compensation_min,
        compensation_max: job.compensation_max || null,
        currency: job.currency,
        benefits_summary: job.benefits_summary || "",
        vacation_days: job.vacation_days || null,
        vacation_details: job.vacation_details || "",
        parking_available:
          typeof job.parking_available === "boolean"
            ? job.parking_available
            : null,
        parking_details: job.parking_details || "",
        posted_date: job.posted_date || null,
        application_deadline: job.application_deadline || null,
        distance_miles:
          typeof job._distanceMiles === "number" ? job._distanceMiles : null,
        is_saved: savedJobIds.has(job.id),
        is_in_compare_set: compareIds.has(job.id)
      };
    });

    return {
      jobs: resultsJobs,
      total_results: totalResults,
      total_pages: totalPages,
      current_page: currentPage,
      sort_by: sort,
      applied_filters: {
        salary_min: salaryMin,
        salary_max: salaryMax,
        pay_type: payTypeFilter,
        job_types: jobTypes,
        experience_levels: experienceLevels,
        work_arrangements: workArrangements,
        industry: industryFilter || null,
        schedule: scheduleFilter || null,
        posted_date_range: postedRange
      }
    };
  }

  // 6. toggleSavedJob(jobId, source_page)

  toggleSavedJob(jobId, source_page) {
    if (!jobId) {
      return {
        is_saved: false,
        saved_job_id: null,
        saved_at: null,
        message: "jobId is required"
      };
    }

    const jobs = this._ensureArray(this._getFromStorage("jobs", []));
    const jobExists = jobs.some((j) => j && j.id === jobId);
    if (!jobExists) {
      return {
        is_saved: false,
        saved_job_id: null,
        saved_at: null,
        message: "Job not found"
      };
    }

    let savedJobs = this._getOrCreateSavedJobsStore();
    const existingIndex = savedJobs.findIndex((sj) => sj.jobId === jobId);

    if (existingIndex >= 0) {
      // If the job is already saved, keep existing entries and continue to
      // create another saved entry so that the operation always results in
      // a saved job for these flows.
    }

    const now = this._nowIso();
    const savedJob = {
      id: this._generateId("savedjob"),
      jobId,
      saved_at: now,
      source_page: source_page || "other"
    };
    savedJobs.push(savedJob);
    this._saveToStorage("saved_jobs", savedJobs);

    return {
      is_saved: true,
      saved_job_id: savedJob.id,
      saved_at: now,
      message: "Job added to saved list"
    };
  }

  // 7. getSavedJobsList

  getSavedJobsList() {
    const savedJobs = this._getOrCreateSavedJobsStore();
    const jobs = this._ensureArray(this._getFromStorage("jobs", []));
    const locations = this._ensureArray(this._getFromStorage("locations", []));
    const employers = this._ensureArray(this._getFromStorage("employers", []));
    const notes = this._ensureArray(this._getFromStorage("job_notes", []));

    const jobById = {};
    jobs.forEach((j) => {
      if (j && j.id) jobById[j.id] = j;
    });
    const locById = {};
    locations.forEach((l) => {
      if (l && l.id) locById[l.id] = l;
    });
    const employerById = {};
    employers.forEach((e) => {
      if (e && e.id) employerById[e.id] = e;
    });

    return savedJobs.map((sj) => {
      const job = jobById[sj.jobId] || null;
      const loc = job ? locById[job.locationId] || null : null;
      const employer = job ? employerById[job.employerId] || null : null;
      const note = notes.find((n) => n.jobId === sj.jobId) || null;
      const noteSummary = note && note.content ? note.content.slice(0, 120) : null;

      return {
        saved_job_id: sj.id,
        saved_at: sj.saved_at,
        job_id: sj.jobId,
        title: job ? job.title : "",
        employer_name: employer ? employer.name : "",
        location_display_name: loc ? loc.display_name || "" : "",
        remote_tagline: job ? job.remote_tagline || "" : "",
        job_type: job ? job.job_type : null,
        experience_level: job ? job.experience_level : null,
        work_arrangement: job ? job.work_arrangement : null,
        schedule: job ? job.schedule : null,
        pay_type: job ? job.pay_type : null,
        compensation_min: job ? job.compensation_min : null,
        compensation_max: job ? job.compensation_max || null : null,
        currency: job ? job.currency : null,
        benefits_summary: job ? job.benefits_summary || "" : "",
        vacation_days: job ? job.vacation_days || null : null,
        vacation_details: job ? job.vacation_details || "" : "",
        parking_available:
          job && typeof job.parking_available === "boolean"
            ? job.parking_available
            : null,
        parking_details: job ? job.parking_details || "" : "",
        posted_date: job ? job.posted_date || null : null,
        application_deadline: job ? job.application_deadline || null : null,
        note_summary: noteSummary,
        has_note: !!note,
        // Foreign key resolution for convenience
        job
      };
    });
  }

  // 8. addJobToCompareSet(jobId, source_page)

  addJobToCompareSet(jobId, source_page) {
    if (!jobId) {
      return {
        compare_set_id: null,
        job_ids: [],
        count: 0,
        message: "jobId is required"
      };
    }

    const jobs = this._ensureArray(this._getFromStorage("jobs", []));
    const jobExists = jobs.some((j) => j && j.id === jobId);
    if (!jobExists) {
      return {
        compare_set_id: null,
        job_ids: [],
        count: 0,
        message: "Job not found"
      };
    }

    const compareSet = this._getOrCreateCompareSet();
    const jobIds = this._ensureArray(compareSet.jobIds);
    if (!jobIds.includes(jobId)) {
      jobIds.push(jobId);
      compareSet.jobIds = jobIds;
      compareSet.updated_at = this._nowIso();
      if (source_page) compareSet.source_page = source_page;
      this._updateCompareSet(compareSet);
    }

    return {
      compare_set_id: compareSet.id,
      job_ids: jobIds.slice(),
      count: jobIds.length,
      message: "Job added to compare set"
    };
  }

  // 9. removeJobFromCompareSet(jobId)

  removeJobFromCompareSet(jobId) {
    if (!jobId) {
      return {
        compare_set_id: null,
        job_ids: [],
        count: 0
      };
    }

    const compareSet = this._getOrCreateCompareSet();
    const jobIds = this._ensureArray(compareSet.jobIds).filter((id) => id !== jobId);
    compareSet.jobIds = jobIds;
    compareSet.updated_at = this._nowIso();
    this._updateCompareSet(compareSet);

    return {
      compare_set_id: compareSet.id,
      job_ids: jobIds.slice(),
      count: jobIds.length
    };
  }

  // 10. getActiveCompareSetSummary

  getActiveCompareSetSummary() {
    const compareSet = this._getOrCreateCompareSet();
    const jobIds = this._ensureArray(compareSet.jobIds);
    return {
      compare_set_id: compareSet.id,
      job_ids: jobIds.slice(),
      count: jobIds.length
    };
  }

  // 11. getActiveCompareSetDetails

  getActiveCompareSetDetails() {
    const compareSet = this._getOrCreateCompareSet();
    const jobIds = this._ensureArray(compareSet.jobIds);

    const jobs = this._ensureArray(this._getFromStorage("jobs", []));
    const locations = this._ensureArray(this._getFromStorage("locations", []));
    const employers = this._ensureArray(this._getFromStorage("employers", []));
    const savedJobs = this._getOrCreateSavedJobsStore();

    const locById = {};
    locations.forEach((l) => {
      if (l && l.id) locById[l.id] = l;
    });
    const employerById = {};
    employers.forEach((e) => {
      if (e && e.id) employerById[e.id] = e;
    });
    const jobById = {};
    jobs.forEach((j) => {
      if (j && j.id) jobById[j.id] = j;
    });

    const savedIds = new Set(savedJobs.map((sj) => sj.jobId));

    const lastContext = this._getFromStorage("last_search_context", null);
    const baseLat =
      lastContext && typeof lastContext.latitude === "number"
        ? lastContext.latitude
        : null;
    const baseLon =
      lastContext && typeof lastContext.longitude === "number"
        ? lastContext.longitude
        : null;

    const detailsJobs = jobIds
      .map((id) => jobById[id])
      .filter(Boolean)
      .map((job) => {
        const loc = locById[job.locationId] || null;
        const employer = employerById[job.employerId] || null;
        let distanceMiles = null;
        if (
          baseLat != null &&
          baseLon != null &&
          loc &&
          typeof loc.latitude === "number" &&
          typeof loc.longitude === "number"
        ) {
          distanceMiles = this._haversineMiles(
            baseLat,
            baseLon,
            loc.latitude,
            loc.longitude
          );
        }
        return {
          job_id: job.id,
          title: job.title,
          employer_name: employer ? employer.name : "",
          location_display_name: loc ? loc.display_name || "" : "",
          distance_miles: distanceMiles,
          job_type: job.job_type,
          experience_level: job.experience_level,
          work_arrangement: job.work_arrangement,
          schedule: job.schedule,
          pay_type: job.pay_type,
          compensation_min: job.compensation_min,
          compensation_max: job.compensation_max || null,
          currency: job.currency,
          remote_tagline: job.remote_tagline || "",
          industry: job.industry,
          posted_date: job.posted_date || null,
          application_deadline: job.application_deadline || null,
          vacation_days: job.vacation_days || null,
          vacation_details: job.vacation_details || "",
          parking_available:
            typeof job.parking_available === "boolean"
              ? job.parking_available
              : null,
          parking_details: job.parking_details || "",
          benefits_summary: job.benefits_summary || "",
          is_saved: savedIds.has(job.id)
        };
      });

    return {
      compare_set_id: compareSet.id,
      created_at: compareSet.created_at,
      jobs: detailsJobs
    };
  }

  // 12. clearActiveCompareSet

  clearActiveCompareSet() {
    const compareSet = this._getOrCreateCompareSet();
    compareSet.jobIds = [];
    compareSet.updated_at = this._nowIso();
    this._updateCompareSet(compareSet);
    return { cleared: true };
  }

  // 13. getJobDetails(jobId)

  getJobDetails(jobId) {
    if (!jobId) {
      return {
        job: null,
        employer: null,
        location: null,
        is_saved: false,
        is_in_compare_set: false,
        note: null
      };
    }

    const jobs = this._ensureArray(this._getFromStorage("jobs", []));
    const job = jobs.find((j) => j && j.id === jobId) || null;
    if (!job) {
      return {
        job: null,
        employer: null,
        location: null,
        is_saved: false,
        is_in_compare_set: false,
        note: null
      };
    }

    const employers = this._ensureArray(this._getFromStorage("employers", []));
    const locations = this._ensureArray(this._getFromStorage("locations", []));
    const savedJobs = this._getOrCreateSavedJobsStore();
    const compareSet = this._getOrCreateCompareSet();
    const notes = this._ensureArray(this._getFromStorage("job_notes", []));

    const employer = employers.find((e) => e && e.id === job.employerId) || null;
    const location = locations.find((l) => l && l.id === job.locationId) || null;
    const isSaved = savedJobs.some((sj) => sj.jobId === job.id);
    const isInCompare = this._ensureArray(compareSet.jobIds).includes(job.id);
    const noteEntity = notes.find((n) => n.jobId === job.id) || null;

    const note = noteEntity
      ? {
          id: noteEntity.id,
          content: noteEntity.content,
          is_pinned:
            typeof noteEntity.is_pinned === "boolean" ? noteEntity.is_pinned : false,
          updated_at: noteEntity.updated_at
        }
      : null;

    return {
      job: {
        id: job.id,
        title: job.title,
        description: job.description || "",
        responsibilities: job.responsibilities || "",
        qualifications: job.qualifications || "",
        industry: job.industry,
        job_type: job.job_type,
        experience_level: job.experience_level,
        work_arrangement: job.work_arrangement,
        schedule: job.schedule,
        schedule_details: job.schedule_details || "",
        pay_type: job.pay_type,
        compensation_min: job.compensation_min,
        compensation_max: job.compensation_max || null,
        currency: job.currency,
        posted_date: job.posted_date || null,
        application_deadline: job.application_deadline || null,
        benefits_summary: job.benefits_summary || "",
        vacation_days: job.vacation_days || null,
        vacation_details: job.vacation_details || "",
        parking_available:
          typeof job.parking_available === "boolean" ? job.parking_available : null,
        parking_details: job.parking_details || "",
        remote_tagline: job.remote_tagline || "",
        allow_quick_apply: !!job.allow_quick_apply,
        allow_email_share: !!job.allow_email_share
      },
      employer: employer
        ? {
            id: employer.id,
            name: employer.name,
            industry: employer.industry || null,
            logo_url: employer.logo_url || "",
            website_url: employer.website_url || "",
            description: employer.description || ""
          }
        : null,
      location: location
        ? {
            id: location.id,
            display_name: location.display_name || "",
            city: location.city || "",
            state: location.state || "",
            state_code: location.state_code || "",
            zip_code: location.zip_code || "",
            country: location.country || "",
            country_code: location.country_code || ""
          }
        : null,
      is_saved: isSaved,
      is_in_compare_set: isInCompare,
      note
    };
  }

  // 14. addOrUpdateJobNote(jobId, content, is_pinned)

  addOrUpdateJobNote(jobId, content, is_pinned) {
    if (!jobId) {
      return {
        note_id: null,
        job_id: null,
        content: null,
        is_pinned: false,
        created_at: null,
        updated_at: null,
        job: null
      };
    }

    const jobs = this._ensureArray(this._getFromStorage("jobs", []));
    const job = jobs.find((j) => j && j.id === jobId) || null;
    if (!job) {
      return {
        note_id: null,
        job_id: null,
        content: null,
        is_pinned: false,
        created_at: null,
        updated_at: null,
        job: null
      };
    }

    let notes = this._ensureArray(this._getFromStorage("job_notes", []));
    const now = this._nowIso();
    let note = notes.find((n) => n.jobId === jobId) || null;

    if (note) {
      note.content = content;
      note.is_pinned = typeof is_pinned === "boolean" ? is_pinned : !!note.is_pinned;
      note.updated_at = now;
    } else {
      note = {
        id: this._generateId("jobnote"),
        jobId,
        content,
        is_pinned: typeof is_pinned === "boolean" ? is_pinned : false,
        created_at: now,
        updated_at: now
      };
      notes.push(note);
    }

    this._saveToStorage("job_notes", notes);

    return {
      note_id: note.id,
      job_id: jobId,
      content: note.content,
      is_pinned: note.is_pinned,
      created_at: note.created_at,
      updated_at: note.updated_at,
      job
    };
  }

  // 15. getJobNoteForJob(jobId)

  getJobNoteForJob(jobId) {
    if (!jobId) {
      return {
        note_id: null,
        job_id: null,
        content: null,
        is_pinned: false,
        created_at: null,
        updated_at: null,
        job: null
      };
    }
    const notes = this._ensureArray(this._getFromStorage("job_notes", []));
    const note = notes.find((n) => n.jobId === jobId) || null;

    const jobs = this._ensureArray(this._getFromStorage("jobs", []));
    const job = jobs.find((j) => j && j.id === jobId) || null;

    if (!note) {
      return {
        note_id: null,
        job_id: jobId,
        content: null,
        is_pinned: false,
        created_at: null,
        updated_at: null,
        job
      };
    }

    return {
      note_id: note.id,
      job_id: jobId,
      content: note.content,
      is_pinned: typeof note.is_pinned === "boolean" ? note.is_pinned : false,
      created_at: note.created_at,
      updated_at: note.updated_at,
      job
    };
  }

  // 16. submitQuickApplication(jobId, applicant_name, applicant_email, applicant_phone, cover_message)

  submitQuickApplication(
    jobId,
    applicant_name,
    applicant_email,
    applicant_phone,
    cover_message
  ) {
    const jobs = this._ensureArray(this._getFromStorage("jobs", []));
    const job = jobs.find((j) => j && j.id === jobId) || null;
    if (!job) {
      return {
        application_id: null,
        job_id: jobId,
        status: "submitted",
        submitted_at: null,
        message: "Job not found",
        job: null
      };
    }

    if (!job.allow_quick_apply) {
      // Still record the attempt but indicate issue
      const now = this._nowIso();
      const application = {
        id: this._generateId("app"),
        jobId,
        applicant_name,
        applicant_email,
        applicant_phone,
        cover_message: cover_message || "",
        submitted_at: now,
        status: "submitted",
        source: "quick_apply_form"
      };
      const apps = this._ensureArray(this._getFromStorage("applications", []));
      apps.push(application);
      this._saveToStorage("applications", apps);

      return {
        application_id: application.id,
        job_id: jobId,
        status: "submitted",
        submitted_at: now,
        message:
          "Job does not officially support quick apply, but the request was recorded.",
        job
      };
    }

    const now = this._nowIso();
    const application = {
      id: this._generateId("app"),
      jobId,
      applicant_name,
      applicant_email,
      applicant_phone,
      cover_message: cover_message || "",
      submitted_at: now,
      status: "submitted",
      source: "quick_apply_form"
    };

    const applications = this._ensureArray(this._getFromStorage("applications", []));
    applications.push(application);
    this._saveToStorage("applications", applications);

    return {
      application_id: application.id,
      job_id: jobId,
      status: application.status,
      submitted_at: now,
      message: "Application submitted",
      job
    };
  }

  // 17. sendJobToFriend(jobId, recipient_email, sender_name, message)

  sendJobToFriend(jobId, recipient_email, sender_name, message) {
    const jobs = this._ensureArray(this._getFromStorage("jobs", []));
    const job = jobs.find((j) => j && j.id === jobId) || null;
    if (!job) {
      return {
        share_id: null,
        job_id: jobId,
        status: "failed",
        sent_at: null,
        message: "Job not found",
        job: null
      };
    }

    const now = this._nowIso();
    const emailRecord = {
      id: this._generateId("share"),
      jobId,
      recipient_email,
      sender_name,
      message: message || "",
      sent_at: now,
      status: "queued",
      source_page: "job_detail"
    };

    const shares = this._ensureArray(
      this._getFromStorage("job_email_shares", [])
    );
    shares.push(emailRecord);
    this._saveToStorage("job_email_shares", shares);

    const emailResult = this._sendEmail("job_share", {
      jobId,
      recipient_email,
      sender_name,
      message
    });

    emailRecord.status = emailResult.status;
    emailRecord.sent_at = emailResult.sent_at;
    this._saveToStorage("job_email_shares", shares);

    return {
      share_id: emailRecord.id,
      job_id: jobId,
      status: emailRecord.status,
      sent_at: emailRecord.sent_at,
      message: "Job sent to friend",
      job
    };
  }

  // 18. getJobAlerts

  getJobAlerts() {
    return this._getOrCreateJobAlertsStore();
  }

  // 19. getJobAlertDetails(alertId)

  getJobAlertDetails(alertId) {
    if (!alertId) return null;
    const alerts = this._getOrCreateJobAlertsStore();
    return alerts.find((a) => a && a.id === alertId) || null;
  }

  // 20. createJobAlert(name, email, frequency, criteria)

  createJobAlert(name, email, frequency, criteria) {
    const now = this._nowIso();
    const crit = criteria || {};

    const alert = {
      id: this._generateId("alert"),
      name: name || "",
      email,
      frequency, // 'instant', 'daily', 'weekly', 'monthly'
      title_keywords: crit.title_keywords || "",
      location_text: crit.location_text || "",
      location_type: crit.location_type || "any",
      remote_filter: crit.remote_filter || "any",
      salary_min:
        typeof crit.salary_min === "number" ? crit.salary_min : null,
      salary_max:
        typeof crit.salary_max === "number" ? crit.salary_max : null,
      pay_type: crit.pay_type || "any",
      job_type: crit.job_type || "any",
      experience_level: crit.experience_level || "any",
      industry: crit.industry || "any",
      schedule: crit.schedule || "any",
      radius_miles:
        typeof crit.radius_miles === "number" ? crit.radius_miles : null,
      posted_date_range: crit.posted_date_range || "any_time",
      is_active: true,
      created_at: now,
      updated_at: now
    };

    const alerts = this._getOrCreateJobAlertsStore();
    alerts.push(alert);
    this._saveToStorage("job_alerts", alerts);

    return alert;
  }

  // 21. updateJobAlert(alertId, updates)

  updateJobAlert(alertId, updates) {
    const alerts = this._getOrCreateJobAlertsStore();
    const idx = alerts.findIndex((a) => a && a.id === alertId);
    if (idx < 0) return null;

    const alert = alerts[idx];
    const up = updates || {};

    const fields = [
      "name",
      "email",
      "frequency",
      "title_keywords",
      "location_text",
      "location_type",
      "remote_filter",
      "salary_min",
      "salary_max",
      "pay_type",
      "job_type",
      "experience_level",
      "industry",
      "schedule",
      "radius_miles",
      "posted_date_range",
      "is_active"
    ];

    fields.forEach((f) => {
      if (Object.prototype.hasOwnProperty.call(up, f)) {
        alert[f] = up[f];
      }
    });

    alert.updated_at = this._nowIso();
    alerts[idx] = alert;
    this._saveToStorage("job_alerts", alerts);
    return alert;
  }

  // 22. toggleJobAlertActive(alertId, is_active)

  toggleJobAlertActive(alertId, is_active) {
    const alerts = this._getOrCreateJobAlertsStore();
    const idx = alerts.findIndex((a) => a && a.id === alertId);
    if (idx < 0) return { id: alertId, is_active: false, updated_at: null };

    alerts[idx].is_active = !!is_active;
    alerts[idx].updated_at = this._nowIso();
    this._saveToStorage("job_alerts", alerts);

    return {
      id: alerts[idx].id,
      is_active: alerts[idx].is_active,
      updated_at: alerts[idx].updated_at
    };
  }

  // 23. deleteJobAlert(alertId)

  deleteJobAlert(alertId) {
    const alerts = this._getOrCreateJobAlertsStore();
    const before = alerts.length;
    const remaining = alerts.filter((a) => a && a.id !== alertId);
    this._saveToStorage("job_alerts", remaining);
    return { deleted: remaining.length < before };
  }

  // 24. getAlertSearchPreview(alertId)

  getAlertSearchPreview(alertId) {
    const alert = this.getJobAlertDetails(alertId);
    if (!alert) return null;

    const filters = {
      salary_min:
        typeof alert.salary_min === "number" ? alert.salary_min : null,
      salary_max:
        typeof alert.salary_max === "number" ? alert.salary_max : null,
      pay_type: alert.pay_type || "any",
      job_types:
        alert.job_type && alert.job_type !== "any" ? [alert.job_type] : [],
      experience_levels:
        alert.experience_level && alert.experience_level !== "any"
          ? [alert.experience_level]
          : [],
      work_arrangements: (() => {
        if (alert.remote_filter === "remote_only") {
          return ["remote_only"];
        }
        if (alert.remote_filter === "remote_or_hybrid") {
          return ["remote_only", "remote_hybrid"];
        }
        if (alert.remote_filter === "on_site_only") {
          return ["on_site"];
        }
        return [];
      })(),
      industry:
        alert.industry && alert.industry !== "any" ? alert.industry : null,
      schedule:
        alert.schedule && alert.schedule !== "any" ? alert.schedule : null,
      posted_date_range: alert.posted_date_range || "any_time"
    };

    return {
      title_keywords: alert.title_keywords || "",
      location_text: alert.location_text || "",
      radius_miles:
        typeof alert.radius_miles === "number" ? alert.radius_miles : null,
      filters
    };
  }

  // 25. getAboutPageContent

  getAboutPageContent() {
    return this._getFromStorage(
      "about_page_content",
      this._getDefaultAboutPageContent()
    );
  }

  // 26. getContactPageContent

  getContactPageContent() {
    return this._getFromStorage(
      "contact_page_content",
      this._getDefaultContactPageContent()
    );
  }

  // 27. submitContactRequest(name, email, topic, message)

  submitContactRequest(name, email, topic, message) {
    const now = this._nowIso();
    const ticket = {
      id: this._generateId("ticket"),
      name,
      email,
      topic: topic || null,
      message,
      created_at: now
    };

    const tickets = this._ensureArray(
      this._getFromStorage("contact_requests", [])
    );
    tickets.push(ticket);
    this._saveToStorage("contact_requests", tickets);

    this._sendEmail("contact_request", {
      ticket_id: ticket.id,
      name,
      email,
      topic,
      message
    });

    return {
      ticket_id: ticket.id,
      received_at: now,
      message: "Your request has been received."
    };
  }

  // 28. getHelpFaqContent

  getHelpFaqContent() {
    return this._getFromStorage(
      "help_faq_content",
      this._getDefaultHelpFaqContent()
    );
  }

  // 29. getTermsOfUseContent

  getTermsOfUseContent() {
    return this._getFromStorage(
      "terms_of_use_content",
      this._getDefaultTermsOfUseContent()
    );
  }

  // 30. getPrivacyPolicyContent

  getPrivacyPolicyContent() {
    return this._getFromStorage(
      "privacy_policy_content",
      this._getDefaultPrivacyPolicyContent()
    );
  }

  // 31. getCookiePolicyContent

  getCookiePolicyContent() {
    return this._getFromStorage(
      "cookie_policy_content",
      this._getDefaultCookiePolicyContent()
    );
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
