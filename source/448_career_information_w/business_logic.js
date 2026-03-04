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

  // =========================
  // Storage & ID helpers
  // =========================

  _initStorage() {
    // Core data tables from spec
    const defaults = {
      jobs: [],
      saved_jobs: [],
      facilities: [],
      facility_comparisons: [],
      state_salary_profiles: [],
      salary_estimates: [],
      courses: [],
      learning_plans: [],
      learning_plan_items: [],
      checklists: [],
      checklist_tasks: [],
      question_submissions: [],
      articles: [],
      bookmarks: [],
      assessments: [],
      assessment_questions: [],
      assessment_results: [],
      assessment_responses: [],
      requirement_items: [],
      requirement_comparisons: [],
      // UI / auxiliary tables
      home_overview_panels: [],
      help_topics: [],
      help_topic_contents: {},
      about_content: { mission: "", data_sources: "", disclaimers: "" },
      contact_info: { support_email: "", mailing_address: "", additional_notes: "" },
      privacy_policy_content: { last_updated: "", content: "" },
      terms_of_use_content: { last_updated: "", content: "" },
      contact_messages: [],
      // Legacy/demo keys from template (kept empty to avoid mocking domain data)
      users: [],
      products: [],
      carts: [],
      cartItems: []
    };

    Object.keys(defaults).forEach((key) => {
      if (localStorage.getItem(key) === null) {
        localStorage.setItem(key, JSON.stringify(defaults[key]));
      }
    });

    if (localStorage.getItem("idCounter") === null) {
      localStorage.setItem("idCounter", "1000");
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
    const current = parseInt(localStorage.getItem("idCounter") || "1000", 10);
    const next = current + 1;
    localStorage.setItem("idCounter", String(next));
    return next;
  }

  _generateId(prefix) {
    return prefix + "_" + this._getNextIdCounter();
  }

  _now() {
    return new Date().toISOString();
  }

  _findById(list, id) {
    return list.find((item) => item.id === id) || null;
  }

  _singleUserStorageAdapter() {
    // Simple adapter abstraction over localStorage for single-user state
    const self = this;
    return {
      get: function (key, defaultValue) {
        return self._getFromStorage(key, defaultValue);
      },
      set: function (key, value) {
        self._saveToStorage(key, value);
      },
      remove: function (key) {
        localStorage.removeItem(key);
      },
      clear: function () {
        localStorage.clear();
      }
    };
  }

  // =========================
  // Label / formatting helpers
  // =========================

  _getExperienceLabel(value) {
    const map = {
      entry_level_no_experience: "Entry level / No experience required",
      mid_level: "Mid-level",
      senior: "Senior",
      supervisory: "Supervisory",
      managerial: "Managerial"
    };
    return map[value] || value || "";
  }

  _getFacilityTypeLabel(value) {
    const map = {
      federal_prison: "Federal prison",
      state_prison: "State prison",
      county_jail: "County jail",
      juvenile_facility: "Juvenile facility",
      private_facility: "Private facility",
      other: "Other facility"
    };
    return map[value] || value || "";
  }

  _getCourseCategoryLabel(value) {
    const map = {
      de_escalation: "De-escalation",
      mental_health: "Mental Health",
      physical_training: "Physical Training",
      legal_procedures: "Legal Procedures",
      communications: "Communications",
      safety_tactics: "Safety Tactics",
      other: "Other"
    };
    return map[value] || value || "";
  }

  _getDeliveryFormatLabel(value) {
    const map = {
      online: "Online",
      in_person: "In person",
      hybrid: "Hybrid"
    };
    return map[value] || value || "";
  }

  _getStateNameFromCode(code) {
    if (!code) return "";
    const upper = String(code).toUpperCase();
    const map = {
      AL: "Alabama",
      AK: "Alaska",
      AZ: "Arizona",
      AR: "Arkansas",
      CA: "California",
      CO: "Colorado",
      CT: "Connecticut",
      DE: "Delaware",
      FL: "Florida",
      GA: "Georgia",
      HI: "Hawaii",
      ID: "Idaho",
      IL: "Illinois",
      IN: "Indiana",
      IA: "Iowa",
      KS: "Kansas",
      KY: "Kentucky",
      LA: "Louisiana",
      ME: "Maine",
      MD: "Maryland",
      MA: "Massachusetts",
      MI: "Michigan",
      MN: "Minnesota",
      MS: "Mississippi",
      MO: "Missouri",
      MT: "Montana",
      NE: "Nebraska",
      NV: "Nevada",
      NH: "New Hampshire",
      NJ: "New Jersey",
      NM: "New Mexico",
      NY: "New York",
      NC: "North Carolina",
      ND: "North Dakota",
      OH: "Ohio",
      OK: "Oklahoma",
      OR: "Oregon",
      PA: "Pennsylvania",
      RI: "Rhode Island",
      SC: "South Carolina",
      SD: "South Dakota",
      TN: "Tennessee",
      TX: "Texas",
      UT: "Utah",
      VT: "Vermont",
      VA: "Virginia",
      WA: "Washington",
      WV: "West Virginia",
      WI: "Wisconsin",
      WY: "Wyoming"
    };
    return map[upper] || code;
  }

  _formatCurrency(amount, currency) {
    if (amount === null || amount === undefined || isNaN(amount)) return "";
    const cur = currency || "USD";
    const formatter = typeof Intl !== "undefined" && Intl.NumberFormat
      ? new Intl.NumberFormat("en-US", { style: "currency", currency: cur })
      : null;
    if (formatter) return formatter.format(amount);
    return "$" + Number(amount).toFixed(2);
  }

  _annualizeSalary(job) {
    if (!job || !job.is_salary_visible || job.salary_min === null || job.salary_min === undefined) {
      return null;
    }
    if (job.salary_unit === "annual") {
      return Number(job.salary_min);
    }
    if (job.salary_unit === "hourly") {
      // 40 hours/week * 52 weeks/year
      return Number(job.salary_min) * 2080;
    }
    return null;
  }

  _formatJobSalary(job) {
    if (!job || !job.is_salary_visible || job.salary_min === null || job.salary_min === undefined) {
      return "Salary not listed";
    }
    const currency = job.salary_currency || "USD";
    const unitLabel = job.salary_unit === "hourly" ? "per hour" : "per year";
    const min = this._formatCurrency(job.salary_min, currency);
    const max = job.salary_max !== null && job.salary_max !== undefined
      ? this._formatCurrency(job.salary_max, currency)
      : null;
    if (max) {
      return min + " - " + max + " " + unitLabel;
    }
    return min + "+ " + unitLabel;
  }

  // =========================
  // Salary helpers
  // =========================

  _calculateAnnualSalaryFromProfile(stateProfile, years_experience, regular_hours_per_week, overtime_hours_per_week) {
    if (!stateProfile) return null;
    const baseRate = Number(stateProfile.base_hourly_rate_entry_level) +
      Number(stateProfile.hourly_increment_per_year_experience || 0) * Number(years_experience || 0);

    const standard = Number(stateProfile.standard_hours_per_week || 40);
    let regularHours = Number(regular_hours_per_week || 0);
    let overtimeHours = Number(overtime_hours_per_week || 0);

    if (regularHours > standard) {
      // Treat hours beyond standard as overtime
      overtimeHours += (regularHours - standard);
      regularHours = standard;
    }

    const otMultiplier = Number(stateProfile.overtime_multiplier || 1.5);

    const weeklyRegularPay = regularHours * baseRate;
    const weeklyOvertimePay = overtimeHours * baseRate * otMultiplier;
    const annual = (weeklyRegularPay + weeklyOvertimePay) * 52;
    return annual;
  }

  _calculateAssessmentScore(assessmentId, responses) {
    const assessmentQuestions = this._getFromStorage("assessment_questions", [])
      .filter((q) => q.assessment_id === assessmentId);

    if (!responses || responses.length === 0 || assessmentQuestions.length === 0) {
      return {
        overall_score: 0,
        summary: "No responses available to calculate a score."
      };
    }

    // Map question id -> definition
    const questionMap = {};
    assessmentQuestions.forEach((q) => {
      questionMap[q.id] = q;
    });

    let totalNormalized = 0;
    let count = 0;

    responses.forEach((resp) => {
      const q = questionMap[resp.question_id];
      if (!q) return;
      let normalized = 0.5; // default mid value

      if (q.question_type === "scale") {
        const v = parseFloat(resp.answer_value);
        if (!isNaN(v)) {
          // Assume a 1-5 scale as a reasonable default
          const min = 1;
          const max = 5;
          const clamped = Math.min(Math.max(v, min), max);
          normalized = (clamped - min) / (max - min);
        }
      } else if (q.question_type === "single_choice") {
        normalized = 0.7; // arbitrary but consistent
      } else if (q.question_type === "multiple_choice") {
        normalized = 0.8;
      } else if (q.question_type === "open_ended") {
        normalized = 0.5;
      }

      totalNormalized += normalized;
      count += 1;
    });

    if (count === 0) {
      return {
        overall_score: 0,
        summary: "No valid responses available to calculate a score."
      };
    }

    const avgNormalized = totalNormalized / count;
    const overall_score = Math.round(avgNormalized * 100);
    const summary =
      "Your readiness score is " +
      overall_score +
      " out of 100 based on your responses. Use this as a general guide and review detailed feedback in the assessment tool.";

    return { overall_score, summary };
  }

  // =========================
  // Internal get-or-create helpers
  // =========================

  _getOrCreateCurrentLearningPlan() {
    const plans = this._getFromStorage("learning_plans", []);
    let plan = plans.find((p) => p.status === "draft");
    if (!plan) {
      plan = {
        id: this._generateId("learning_plan"),
        name: "My Learning Plan",
        status: "draft",
        total_duration_hours: 0,
        created_at: this._now(),
        updated_at: this._now()
      };
      plans.push(plan);
      this._saveToStorage("learning_plans", plans);
    }
    return plan;
  }

  _recalculateLearningPlanTotalDuration(learningPlan) {
    const items = this._getFromStorage("learning_plan_items", []);
    const courses = this._getFromStorage("courses", []);
    const relevantItems = items.filter((it) => it.learning_plan_id === learningPlan.id);
    let total = 0;

    relevantItems.forEach((it) => {
      const course = courses.find((c) => c.id === it.course_id);
      if (course && course.duration_hours) {
        total += Number(course.duration_hours);
      }
    });

    learningPlan.total_duration_hours = total;
    learningPlan.updated_at = this._now();

    // Persist updated plan
    const plans = this._getFromStorage("learning_plans", []);
    const idx = plans.findIndex((p) => p.id === learningPlan.id);
    if (idx !== -1) {
      plans[idx] = learningPlan;
      this._saveToStorage("learning_plans", plans);
    }

    return total;
  }

  _getOrCreateCurrentChecklist() {
    const checklists = this._getFromStorage("checklists", []);
    let checklist = checklists.find((c) => c.status === "draft");
    if (!checklist) {
      checklist = {
        id: this._generateId("checklist"),
        name: "Application Preparation Checklist",
        description: "",
        time_horizon_months: null,
        status: "draft",
        created_at: this._now(),
        updated_at: this._now()
      };
      checklists.push(checklist);
      this._saveToStorage("checklists", checklists);
    }
    return checklist;
  }

  _getOrCreateFacilityComparison() {
    const comparisons = this._getFromStorage("facility_comparisons", []);
    let comparison = comparisons[0] || null;
    if (!comparison) {
      comparison = {
        id: this._generateId("facility_comparison"),
        facility_ids: [],
        preferred_facility_id: null,
        label: "",
        created_at: this._now(),
        updated_at: this._now()
      };
      comparisons.push(comparison);
      this._saveToStorage("facility_comparisons", comparisons);
    }
    return comparison;
  }

  _getOrCreateRequirementComparison() {
    const comparisons = this._getFromStorage("requirement_comparisons", []);
    let comparison = comparisons[0] || null;
    if (!comparison) {
      comparison = {
        id: this._generateId("requirement_comparison"),
        name: "",
        description: "",
        federal_requirement_ids: [],
        state_requirement_ids: [],
        created_at: this._now()
      };
      comparisons.push(comparison);
      this._saveToStorage("requirement_comparisons", comparisons);
    }
    return comparison;
  }

  // =========================
  // Interfaces implementation
  // =========================

  // ---- Home / overview ----

  getHomeOverviewPanels() {
    // Panels are stored in localStorage under 'home_overview_panels'
    return this._getFromStorage("home_overview_panels", []);
  }

  getFeaturedArticles(limit = 3) {
    const articles = this._getFromStorage("articles", []);
    const published = articles.filter((a) => a.is_published);
    // Prefer stress/burnout topics
    const prioritized = published.filter((a) => {
      const topics = a.topics || [];
      return topics.includes("stress") || topics.includes("burnout");
    });
    const others = published.filter((a) => !prioritized.includes(a));

    const sortByDateDesc = (arr) => {
      return arr.slice().sort((a, b) => {
        const da = a.publish_date || a.created_at || "";
        const db = b.publish_date || b.created_at || "";
        return db.localeCompare(da);
      });
    };

    const ordered = sortByDateDesc(prioritized).concat(sortByDateDesc(others));
    return ordered.slice(0, limit);
  }

  getFeaturedCourses(limit = 3) {
    const courses = this._getFromStorage("courses", []);
    if (courses.length === 0) return [];

    const prioritized = courses.filter((c) => {
      if (c.is_featured) return true;
      const cats = c.categories || [];
      return cats.includes("de_escalation") || cats.includes("mental_health");
    });

    const others = courses.filter((c) => !prioritized.includes(c));

    const sortByDurationDesc = (arr) =>
      arr.slice().sort((a, b) => Number(b.duration_hours || 0) - Number(a.duration_hours || 0));

    const ordered = sortByDurationDesc(prioritized).concat(sortByDurationDesc(others));
    return ordered.slice(0, limit);
  }

  // ---- Job search / saved jobs ----

  getJobSearchFilterOptions() {
    const jobs = this._getFromStorage("jobs", []);
    const experience_levels = [
      "entry_level_no_experience",
      "mid_level",
      "senior",
      "supervisory",
      "managerial"
    ].map((value) => ({ value, label: this._getExperienceLabel(value) }));

    const stateCodesSet = new Set();
    jobs.forEach((job) => {
      if (job.location_state) {
        stateCodesSet.add(job.location_state);
      }
    });
    const states = Array.from(stateCodesSet).map((code) => ({
      state_code: code,
      state_name: this._getStateNameFromCode(code)
    }));

    const salary_units = ["annual", "hourly"];

    return {
      experience_levels,
      states,
      salary_units,
      default_salary_unit: "annual"
    };
  }

  searchJobs(keyword, location, filters, sort, page = 1, page_size = 20) {
    let jobs = this._getFromStorage("jobs", []);
    const savedJobs = this._getFromStorage("saved_jobs", []);

    // Keyword filtering
    if (keyword && keyword.trim()) {
      const kw = keyword.trim().toLowerCase();
      jobs = jobs.filter((job) => {
        const title = (job.title || "").toLowerCase();
        const employer = (job.employer_name || "").toLowerCase();
        const desc = (job.description || "").toLowerCase();
        return title.includes(kw) || employer.includes(kw) || desc.includes(kw);
      });
    }

    // Location filtering
    if (location && typeof location === "object") {
      if (location.state_code) {
        jobs = jobs.filter((job) => job.location_state === location.state_code);
      }
      if (location.city) {
        const cityLower = String(location.city).toLowerCase();
        jobs = jobs.filter((job) => (job.location_city || "").toLowerCase().includes(cityLower));
      }
    }

    // Other filters
    if (filters && typeof filters === "object") {
      if (filters.experience_levels && filters.experience_levels.length > 0) {
        const allowed = new Set(filters.experience_levels);
        jobs = jobs.filter((job) => allowed.has(job.experience_level));
      }

      if (filters.only_with_visible_salary) {
        jobs = jobs.filter((job) => job.is_salary_visible && job.salary_min !== null && job.salary_min !== undefined);
      }

      if (filters.min_annual_salary_usd !== null && filters.min_annual_salary_usd !== undefined) {
        const minAnnual = Number(filters.min_annual_salary_usd);
        jobs = jobs.filter((job) => {
          const annual = this._annualizeSalary(job);
          return annual !== null && annual >= minAnnual;
        });
      }
    }

    // Sorting
    const sort_by = sort && sort.sort_by ? sort.sort_by : "relevance";
    jobs = jobs.slice();

    const getDate = (job) => job.posted_date || job.created_at || "";

    if (sort_by === "date_posted_desc" || sort_by === "relevance") {
      jobs.sort((a, b) => getDate(b).localeCompare(getDate(a)));
    } else if (sort_by === "salary_desc" || sort_by === "salary_asc") {
      jobs.sort((a, b) => {
        const sa = this._annualizeSalary(a);
        const sb = this._annualizeSalary(b);
        if (sa === null && sb === null) return 0;
        if (sa === null) return 1;
        if (sb === null) return -1;
        return sort_by === "salary_desc" ? sb - sa : sa - sb;
      });
    }

    const total_count = jobs.length;
    const start = (page - 1) * page_size;
    const end = start + page_size;
    const pageJobs = jobs.slice(start, end);

    const results = pageJobs.map((job) => {
      const is_saved = !!savedJobs.find((s) => s.job_id === job.id);
      const city = job.location_city || "";
      const state = job.location_state || "";
      const display_location = city && state ? city + ", " + state : city || state || "";
      const display_salary = this._formatJobSalary(job);
      const experience_label = this._getExperienceLabel(job.experience_level);
      return {
        job,
        is_saved,
        display_location,
        display_salary,
        experience_label
      };
    });

    // Instrumentation for task completion tracking (Task 1)
    try {
      let keywordMatches = false;
      if (typeof keyword === "string") {
        keywordMatches = keyword.toLowerCase().includes("correctional officer");
      }

      let locationMatches = false;
      if (location && typeof location === "object") {
        const stateValue = location.state_code || location.state || location.stateCode;
        if (typeof stateValue === "string") {
          const upper = stateValue.toUpperCase();
          const lower = stateValue.toLowerCase();
          if (upper === "AZ" || lower === "arizona") {
            locationMatches = true;
          }
        }
      }

      let filtersMatches = false;
      if (filters && typeof filters === "object") {
        const expLevels = Array.isArray(filters.experience_levels)
          ? filters.experience_levels
          : [];
        const hasEntry =
          expLevels.indexOf("entry_level_no_experience") !== -1;
        const minAnnual = filters.min_annual_salary_usd;
        const hasMinSalary =
          minAnnual !== null &&
          minAnnual !== undefined &&
          Number(minAnnual) >= 48000;
        filtersMatches = hasEntry && hasMinSalary;
      }

      if (keywordMatches && locationMatches && filtersMatches) {
        const task1_searchParams = {
          keyword: keyword,
          location: location,
          filters: filters,
          sort: sort,
          page: page,
          page_size: page_size,
          timestamp: this._now()
        };
        localStorage.setItem(
          "task1_searchParams",
          JSON.stringify(task1_searchParams)
        );
      }
    } catch (e) {
      try {
        console.error("Instrumentation error:", e);
      } catch (e2) {}
    }

    return { total_count, page, page_size, results };
  }

  saveJob(jobId, note) {
    const jobs = this._getFromStorage("jobs", []);
    const job = jobs.find((j) => j.id === jobId) || null;
    if (!job) {
      throw new Error("Job not found for id " + jobId);
    }

    const savedJobs = this._getFromStorage("saved_jobs", []);
    let saved = savedJobs.find((s) => s.job_id === jobId) || null;

    if (saved) {
      // Update note and timestamp if provided
      if (typeof note === "string") {
        saved.note = note;
      }
      saved.saved_at = this._now();
    } else {
      saved = {
        id: this._generateId("saved_job"),
        job_id: jobId,
        saved_at: this._now(),
        note: typeof note === "string" ? note : ""
      };
      savedJobs.push(saved);
    }

    this._saveToStorage("saved_jobs", savedJobs);

    return {
      saved_job: saved,
      job,
      message: "Job saved successfully."
    };
  }

  getSavedJobs() {
    const savedJobs = this._getFromStorage("saved_jobs", []);
    const jobs = this._getFromStorage("jobs", []);

    return savedJobs.map((saved) => {
      const job = jobs.find((j) => j.id === saved.job_id) || null;
      const display_salary = this._formatJobSalary(job);
      const city = job && job.location_city ? job.location_city : "";
      const state = job && job.location_state ? job.location_state : "";
      const display_location = city && state ? city + ", " + state : city || state || "";
      return {
        saved_job: saved,
        job,
        display_salary,
        display_location
      };
    });
  }

  // ---- Facilities & comparison ----

  getFacilityFilterOptions() {
    const facilities = this._getFromStorage("facilities", []);
    const statesSet = new Set();
    facilities.forEach((f) => {
      if (f.state) statesSet.add(f.state);
    });
    const states = Array.from(statesSet).map((code) => ({
      state_code: code,
      state_name: this._getStateNameFromCode(code)
    }));

    const facility_types_values = [
      "federal_prison",
      "state_prison",
      "county_jail",
      "juvenile_facility",
      "private_facility",
      "other"
    ];
    const facility_types = facility_types_values.map((value) => ({
      value,
      label: this._getFacilityTypeLabel(value)
    }));

    return { states, facility_types };
  }

  listFacilities(state_code, facility_type, page = 1, page_size = 20) {
    let facilities = this._getFromStorage("facilities", []);

    if (state_code) {
      const stateName = this._getStateNameFromCode(state_code);
      const normalizedCode = String(state_code).toUpperCase();
      facilities = facilities.filter((f) => {
        const facilityState = f.state || "";
        const facilityStateUpper = String(facilityState).toUpperCase();
        return (
          facilityState === state_code ||
          facilityState === stateName ||
          facilityStateUpper === normalizedCode
        );
      });
    }

    if (facility_type) {
      facilities = facilities.filter((f) => f.facility_type === facility_type);
    }

    facilities = facilities.slice().sort((a, b) => {
      const an = (a.name || "").toLowerCase();
      const bn = (b.name || "").toLowerCase();
      if (an < bn) return -1;
      if (an > bn) return 1;
      return 0;
    });

    const total_count = facilities.length;
    const start = (page - 1) * page_size;
    const end = start + page_size;
    const pageFacilities = facilities.slice(start, end);

    return { total_count, page, page_size, facilities: pageFacilities };
  }

  addFacilityToComparison(facilityId) {
    const facilities = this._getFromStorage("facilities", []);
    const facility = facilities.find((f) => f.id === facilityId) || null;
    if (!facility) {
      throw new Error("Facility not found for id " + facilityId);
    }

    const allComparisons = this._getFromStorage("facility_comparisons", []);
    let comparison = allComparisons[0] || null;
    if (!comparison) {
      comparison = this._getOrCreateFacilityComparison();
    }

    const ids = comparison.facility_ids || [];
    if (!ids.includes(facilityId)) {
      if (ids.length >= 2) {
        // Keep the most recent two selections: drop the oldest
        ids.shift();
      }
      ids.push(facilityId);
      comparison.facility_ids = ids;
      comparison.updated_at = this._now();

      // Persist
      if (allComparisons.length === 0) {
        allComparisons.push(comparison);
      } else {
        allComparisons[0] = comparison;
      }
      this._saveToStorage("facility_comparisons", allComparisons);
    }

    const selectedFacilities = ids
      .map((id) => facilities.find((f) => f.id === id) || null)
      .filter((f) => !!f);

    return {
      comparison,
      facilities: selectedFacilities,
      message: "Facility added to comparison."
    };
  }

  getCurrentFacilityComparison() {
    const comparison = this._getOrCreateFacilityComparison();
    const facilitiesAll = this._getFromStorage("facilities", []);

    const facilities = (comparison.facility_ids || []).map((id) => {
      const facility = facilitiesAll.find((f) => f.id === id) || null;
      const is_preferred = !!facility && comparison.preferred_facility_id === id;
      const average_commute_time_minutes = facility
        ? facility.average_commute_time_minutes
        : null;
      return { facility, is_preferred, average_commute_time_minutes };
    });

    return { comparison, facilities };
  }

  setPreferredFacilityInComparison(facilityId) {
    const allComparisons = this._getFromStorage("facility_comparisons", []);
    let comparison = allComparisons[0] || null;
    if (!comparison) {
      comparison = this._getOrCreateFacilityComparison();
    }

    if (!(comparison.facility_ids || []).includes(facilityId)) {
      throw new Error("Facility is not part of the current comparison selection.");
    }

    comparison.preferred_facility_id = facilityId;
    comparison.updated_at = this._now();

    if (allComparisons.length === 0) {
      allComparisons.push(comparison);
    } else {
      allComparisons[0] = comparison;
    }
    this._saveToStorage("facility_comparisons", allComparisons);

    const facilitiesAll = this._getFromStorage("facilities", []);
    const facilities = (comparison.facility_ids || []).map((id) => {
      const facility = facilitiesAll.find((f) => f.id === id) || null;
      const is_preferred = !!facility && comparison.preferred_facility_id === id;
      return { facility, is_preferred };
    });

    return {
      comparison,
      facilities,
      message: "Preferred facility updated."
    };
  }

  // ---- Salary & benefits ----

  getSalaryOverviewByState(state_code) {
    const profiles = this._getFromStorage("state_salary_profiles", []);
    const state_profile = profiles.find((p) => p.state_code === state_code) || null;

    if (!state_profile) {
      return {
        state_profile: null,
        estimated_entry_level_annual_salary: null,
        overtime_policy_summary: "No salary profile is available for this state.",
        benefits_summary: "Benefits information is not available for this state."
      };
    }

    const estimated_entry_level_annual_salary = this._calculateAnnualSalaryFromProfile(
      state_profile,
      0,
      state_profile.standard_hours_per_week,
      0
    );

    const overtime_policy_summary =
      "Overtime is generally paid at " +
      (state_profile.overtime_multiplier || 1.5) +
      "x the base hourly rate for hours worked beyond " +
      (state_profile.standard_hours_per_week || 40) +
      " hours per week.";

    const benefits_summary =
      "Typical correctional officer benefits in this state may include health insurance, retirement contributions, paid leave, and overtime opportunities. Check specific agencies for exact details.";

    return {
      state_profile,
      estimated_entry_level_annual_salary,
      overtime_policy_summary,
      benefits_summary
    };
  }

  calculateSalaryEstimate(state_code, years_experience, regular_hours_per_week, overtime_hours_per_week) {
    const profiles = this._getFromStorage("state_salary_profiles", []);
    const state_profile = profiles.find((p) => p.state_code === state_code) || null;

    if (!state_profile) {
      return {
        state_profile: null,
        estimated_annual_salary: null,
        currency: "USD",
        calculation_breakdown: "No state salary profile found for state code " + state_code + "."
      };
    }

    const annual = this._calculateAnnualSalaryFromProfile(
      state_profile,
      years_experience,
      regular_hours_per_week,
      overtime_hours_per_week
    );

    const currency = state_profile.currency || "USD";

    const calculation_breakdown =
      "Base hourly rate starts at " +
      this._formatCurrency(state_profile.base_hourly_rate_entry_level, currency) +
      " and increases by " +
      this._formatCurrency(state_profile.hourly_increment_per_year_experience, currency) +
      " per year of experience. Regular hours per week: " +
      regular_hours_per_week +
      ", overtime hours per week: " +
      overtime_hours_per_week +
      ". Overtime paid at " +
      (state_profile.overtime_multiplier || 1.5) +
      "x. Annual estimate computed on 52 weeks/year.";

    return {
      state_profile,
      estimated_annual_salary: annual,
      currency,
      calculation_breakdown
    };
  }

  saveSalaryEstimate(state_code, years_experience, regular_hours_per_week, overtime_hours_per_week, label) {
    const profiles = this._getFromStorage("state_salary_profiles", []);
    const state_profile = profiles.find((p) => p.state_code === state_code) || null;

    if (!state_profile) {
      throw new Error("No state salary profile found for state code " + state_code);
    }

    const annual = this._calculateAnnualSalaryFromProfile(
      state_profile,
      years_experience,
      regular_hours_per_week,
      overtime_hours_per_week
    );

    const salary_estimates = this._getFromStorage("salary_estimates", []);

    const estimate = {
      id: this._generateId("salary_estimate"),
      state_code,
      years_experience,
      regular_hours_per_week,
      overtime_hours_per_week,
      estimated_annual_salary: annual,
      currency: state_profile.currency || "USD",
      label: label || "",
      created_at: this._now()
    };

    salary_estimates.push(estimate);
    this._saveToStorage("salary_estimates", salary_estimates);

    return {
      salary_estimate: estimate,
      message: "Salary estimate saved."
    };
  }

  getSavedSalaryEstimates() {
    return this._getFromStorage("salary_estimates", []);
  }

  // ---- Training & Education / Learning Plan ----

  getTrainingFilterOptions() {
    const categories_values = [
      "de_escalation",
      "mental_health",
      "physical_training",
      "legal_procedures",
      "communications",
      "safety_tactics",
      "other"
    ];
    const categories = categories_values.map((value) => ({
      value,
      label: this._getCourseCategoryLabel(value)
    }));

    const delivery_formats_values = ["online", "in_person", "hybrid"];
    const delivery_formats = delivery_formats_values.map((value) => ({
      value,
      label: this._getDeliveryFormatLabel(value)
    }));

    const sort_options = [
      { value: "duration_desc", label: "Duration: Longest first" },
      { value: "duration_asc", label: "Duration: Shortest first" },
      { value: "alphabetical", label: "Title A–Z" }
    ];

    return {
      categories,
      delivery_formats,
      sort_options,
      min_duration_step_hours: 1
    };
  }

  searchCourses(query, filters, sort_by, page = 1, page_size = 20) {
    let courses = this._getFromStorage("courses", []);

    if (query && query.trim()) {
      const q = query.trim().toLowerCase();
      courses = courses.filter((c) => {
        const title = (c.title || "").toLowerCase();
        const desc = (c.description || "").toLowerCase();
        return title.includes(q) || desc.includes(q);
      });
    }

    if (filters && typeof filters === "object") {
      if (filters.categories_any && filters.categories_any.length > 0) {
        const allowed = new Set(filters.categories_any);
        courses = courses.filter((c) => {
          const cats = c.categories || [];
          return cats.some((cat) => allowed.has(cat));
        });
      }
      if (filters.delivery_formats_any && filters.delivery_formats_any.length > 0) {
        const allowed = new Set(filters.delivery_formats_any);
        courses = courses.filter((c) => allowed.has(c.delivery_format));
      }
      if (filters.min_duration_hours !== null && filters.min_duration_hours !== undefined) {
        const minDur = Number(filters.min_duration_hours);
        courses = courses.filter((c) => Number(c.duration_hours || 0) >= minDur);
      }
    }

    const sortVal = sort_by || "duration_desc";
    courses = courses.slice();

    if (sortVal === "duration_desc") {
      courses.sort((a, b) => Number(b.duration_hours || 0) - Number(a.duration_hours || 0));
    } else if (sortVal === "duration_asc") {
      courses.sort((a, b) => Number(a.duration_hours || 0) - Number(b.duration_hours || 0));
    } else if (sortVal === "alphabetical") {
      courses.sort((a, b) => {
        const at = (a.title || "").toLowerCase();
        const bt = (b.title || "").toLowerCase();
        if (at < bt) return -1;
        if (at > bt) return 1;
        return 0;
      });
    }

    const total_count = courses.length;
    const start = (page - 1) * page_size;
    const end = start + page_size;
    const pageCourses = courses.slice(start, end);

    return { total_count, page, page_size, courses: pageCourses };
  }

  addCourseToLearningPlan(courseId) {
    const courses = this._getFromStorage("courses", []);
    const course = courses.find((c) => c.id === courseId) || null;
    if (!course) {
      throw new Error("Course not found for id " + courseId);
    }

    const learningPlan = this._getOrCreateCurrentLearningPlan();
    const items = this._getFromStorage("learning_plan_items", []);

    let existing = items.find(
      (it) => it.learning_plan_id === learningPlan.id && it.course_id === courseId
    );

    if (!existing) {
      existing = {
        id: this._generateId("learning_plan_item"),
        learning_plan_id: learningPlan.id,
        course_id: courseId,
        added_at: this._now()
      };
      items.push(existing);
      this._saveToStorage("learning_plan_items", items);
      this._recalculateLearningPlanTotalDuration(learningPlan);
    }

    const planItems = items.filter((it) => it.learning_plan_id === learningPlan.id);

    return {
      learning_plan: learningPlan,
      items: planItems,
      total_duration_hours: learningPlan.total_duration_hours || 0,
      message: "Course added to learning plan."
    };
  }

  getCurrentLearningPlan() {
    const learningPlan = this._getOrCreateCurrentLearningPlan();
    const items = this._getFromStorage("learning_plan_items", []);
    const courses = this._getFromStorage("courses", []);

    const planItems = items.filter((it) => it.learning_plan_id === learningPlan.id);

    const coursesResolved = planItems.map((it) => ({
      learning_plan_item: it,
      course: courses.find((c) => c.id === it.course_id) || null
    }));

    const total_duration_hours =
      typeof learningPlan.total_duration_hours === "number"
        ? learningPlan.total_duration_hours
        : this._recalculateLearningPlanTotalDuration(learningPlan);

    return {
      learning_plan: learningPlan,
      courses: coursesResolved,
      total_duration_hours
    };
  }

  removeCourseFromLearningPlan(courseId) {
    const learningPlan = this._getOrCreateCurrentLearningPlan();
    let items = this._getFromStorage("learning_plan_items", []);

    const beforeLength = items.length;
    items = items.filter(
      (it) => !(it.learning_plan_id === learningPlan.id && it.course_id === courseId)
    );

    if (items.length !== beforeLength) {
      this._saveToStorage("learning_plan_items", items);
      this._recalculateLearningPlanTotalDuration(learningPlan);
    }

    const coursesAll = this._getFromStorage("courses", []);
    const planItems = items.filter((it) => it.learning_plan_id === learningPlan.id);
    const coursesResolved = planItems.map((it) => ({
      learning_plan_item: it,
      course: coursesAll.find((c) => c.id === it.course_id) || null
    }));

    return {
      learning_plan: learningPlan,
      courses: coursesResolved,
      total_duration_hours: learningPlan.total_duration_hours || 0,
      message: "Course removed from learning plan."
    };
  }

  saveCurrentLearningPlan(name) {
    const plans = this._getFromStorage("learning_plans", []);
    let learningPlan = plans.find((p) => p.status === "draft") || null;
    if (!learningPlan) {
      learningPlan = this._getOrCreateCurrentLearningPlan();
    }

    learningPlan.name = name || learningPlan.name || "My Learning Plan";
    learningPlan.status = "saved";
    learningPlan.updated_at = this._now();

    const idx = plans.findIndex((p) => p.id === learningPlan.id);
    if (idx === -1) {
      plans.push(learningPlan);
    } else {
      plans[idx] = learningPlan;
    }

    this._saveToStorage("learning_plans", plans);

    return {
      learning_plan: learningPlan,
      message: "Learning plan saved."
    };
  }

  // ---- Career Planning / Checklist ----

  getCurrentApplicationChecklist(time_horizon_months) {
    const checklists = this._getFromStorage("checklists", []);
    let checklist = checklists.find((c) => c.status === "draft") || null;

    if (!checklist) {
      checklist = {
        id: this._generateId("checklist"),
        name: "Application Preparation Checklist",
        description: "",
        time_horizon_months: time_horizon_months || null,
        status: "draft",
        created_at: this._now(),
        updated_at: this._now()
      };
      checklists.push(checklist);
      this._saveToStorage("checklists", checklists);
    }

    const tasks = this._getFromStorage("checklist_tasks", []).filter(
      (t) => t.checklist_id === checklist.id
    );

    return { checklist, tasks };
  }

  addChecklistTask(title, category, due_date, notes) {
    const checklist = this._getOrCreateCurrentChecklist();
    const tasks = this._getFromStorage("checklist_tasks", []);
    const checklistTasks = tasks.filter((t) => t.checklist_id === checklist.id);

    const order_index = checklistTasks.length;

    const task = {
      id: this._generateId("checklist_task"),
      checklist_id: checklist.id,
      title,
      category,
      due_date,
      is_completed: false,
      order_index,
      notes: notes || "",
      created_at: this._now()
    };

    tasks.push(task);
    this._saveToStorage("checklist_tasks", tasks);

    checklist.updated_at = this._now();
    const checklists = this._getFromStorage("checklists", []);
    const idx = checklists.findIndex((c) => c.id === checklist.id);
    if (idx !== -1) {
      checklists[idx] = checklist;
      this._saveToStorage("checklists", checklists);
    }

    const updatedTasks = tasks.filter((t) => t.checklist_id === checklist.id);

    return { task, checklist, tasks: updatedTasks };
  }

  updateChecklistTask(taskId, updates) {
    const tasks = this._getFromStorage("checklist_tasks", []);
    const idx = tasks.findIndex((t) => t.id === taskId);
    if (idx === -1) {
      throw new Error("Checklist task not found for id " + taskId);
    }

    const task = tasks[idx];

    if (updates.title !== undefined) task.title = updates.title;
    if (updates.category !== undefined) task.category = updates.category;
    if (updates.due_date !== undefined) task.due_date = updates.due_date;
    if (updates.is_completed !== undefined) task.is_completed = updates.is_completed;
    if (updates.notes !== undefined) task.notes = updates.notes;

    tasks[idx] = task;
    this._saveToStorage("checklist_tasks", tasks);

    const checklistTasks = tasks.filter((t) => t.checklist_id === task.checklist_id);

    return { task, tasks: checklistTasks };
  }

  reorderChecklistTasks(orderedTaskIds) {
    const checklist = this._getOrCreateCurrentChecklist();
    const tasks = this._getFromStorage("checklist_tasks", []);

    const checklistTasks = tasks.filter((t) => t.checklist_id === checklist.id);
    const taskMap = {};
    checklistTasks.forEach((t) => {
      taskMap[t.id] = t;
    });

    let index = 0;
    orderedTaskIds.forEach((id) => {
      const t = taskMap[id];
      if (t) {
        t.order_index = index++;
      }
    });

    // Any remaining tasks not in orderedTaskIds keep their relative order after
    checklistTasks
      .filter((t) => !orderedTaskIds.includes(t.id))
      .sort((a, b) => (a.order_index || 0) - (b.order_index || 0))
      .forEach((t) => {
        t.order_index = index++;
      });

    // Persist back into full tasks array
    const updatedTasks = tasks.map((t) => {
      const updated = checklistTasks.find((ct) => ct.id === t.id);
      return updated || t;
    });

    this._saveToStorage("checklist_tasks", updatedTasks);

    return checklistTasks.sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
  }

  deleteChecklistTask(taskId) {
    const tasks = this._getFromStorage("checklist_tasks", []);
    const task = tasks.find((t) => t.id === taskId) || null;
    const checklist_id = task ? task.checklist_id : null;

    const remaining = tasks.filter((t) => t.id !== taskId);
    this._saveToStorage("checklist_tasks", remaining);

    const checklistTasks = checklist_id
      ? remaining.filter((t) => t.checklist_id === checklist_id)
      : [];

    return {
      tasks: checklistTasks,
      message: "Checklist task deleted."
    };
  }

  saveCurrentChecklist(name, description) {
    const checklists = this._getFromStorage("checklists", []);
    let checklist = checklists.find((c) => c.status === "draft") || null;
    if (!checklist) {
      checklist = this._getOrCreateCurrentChecklist();
    }

    if (name) checklist.name = name;
    if (description !== undefined) checklist.description = description;
    checklist.status = "saved";
    checklist.updated_at = this._now();

    const idx = checklists.findIndex((c) => c.id === checklist.id);
    if (idx === -1) {
      checklists.push(checklist);
    } else {
      checklists[idx] = checklist;
    }

    this._saveToStorage("checklists", checklists);

    return {
      checklist,
      message: "Checklist saved."
    };
  }

  // ---- Q&A / Ask a Question ----

  getQuestionFormOptions() {
    const topics_values = [
      "work_schedule_shifts",
      "pay_benefits",
      "training_education",
      "hiring_process",
      "job_duties",
      "career_progression",
      "other"
    ];

    const topicLabels = {
      work_schedule_shifts: "Work Schedule & Shifts",
      pay_benefits: "Pay & Benefits",
      training_education: "Training & Education",
      hiring_process: "Hiring Process",
      job_duties: "Job Duties",
      career_progression: "Career Progression",
      other: "Other"
    };

    const topics = topics_values.map((value) => ({ value, label: topicLabels[value] }));

    const facilityTypesValues = [
      "federal_prison",
      "state_prison",
      "county_jail",
      "juvenile_facility",
      "private_facility",
      "other"
    ];

    const facility_types = facilityTypesValues.map((value) => ({
      value,
      label: this._getFacilityTypeLabel(value)
    }));

    // Based on task requirements: 150-200 characters
    const question_text_min_length = 150;
    const question_text_max_length = 200;

    return {
      topics,
      facility_types,
      question_text_min_length,
      question_text_max_length
    };
  }

  submitCareerQuestion(topic, facility_type, email, question_text) {
    const options = this.getQuestionFormOptions();
    const minLen = options.question_text_min_length;
    const maxLen = options.question_text_max_length;

    if (typeof question_text !== "string") {
      throw new Error("question_text must be a string.");
    }

    const len = question_text.length;
    if (len < minLen || len > maxLen) {
      throw new Error(
        "question_text must be between " + minLen + " and " + maxLen + " characters."
      );
    }

    const question_submissions = this._getFromStorage("question_submissions", []);

    const submission = {
      id: this._generateId("question_submission"),
      topic,
      facility_type,
      email,
      question_text,
      status: "submitted",
      created_at: this._now()
    };

    question_submissions.push(submission);
    this._saveToStorage("question_submissions", question_submissions);

    return {
      question_submission: submission,
      message: "Question submitted successfully."
    };
  }

  // ---- Articles & Bookmarks ----

  getArticleSearchFilterOptions() {
    const articles = this._getFromStorage("articles", []);
    const topicsSet = new Set();
    articles.forEach((a) => {
      (a.topics || []).forEach((t) => topicsSet.add(t));
    });

    const topics = Array.from(topicsSet).map((value) => ({
      value,
      label: value
        .split("_")
        .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
        .join(" ")
    }));

    const sort_options = [
      { value: "recent_first", label: "Most recent first" },
      { value: "alphabetical", label: "Title A–Z" }
    ];

    return { topics, sort_options };
  }

  searchArticles(query, topic, sort_by, page = 1, page_size = 20) {
    let articles = this._getFromStorage("articles", []);

    articles = articles.filter((a) => a.is_published);

    if (query && query.trim()) {
      const q = query.trim().toLowerCase();
      articles = articles.filter((a) => {
        const title = (a.title || "").toLowerCase();
        const summary = (a.summary || "").toLowerCase();
        const content = (a.content || "").toLowerCase();
        return title.includes(q) || summary.includes(q) || content.includes(q);
      });
    }

    if (topic) {
      articles = articles.filter((a) => (a.topics || []).includes(topic));
    }

    const sortVal = sort_by || "recent_first";

    if (sortVal === "alphabetical") {
      articles = articles.slice().sort((a, b) => {
        const at = (a.title || "").toLowerCase();
        const bt = (b.title || "").toLowerCase();
        if (at < bt) return -1;
        if (at > bt) return 1;
        return 0;
      });
    } else {
      articles = articles.slice().sort((a, b) => {
        const da = a.publish_date || a.created_at || "";
        const db = b.publish_date || b.created_at || "";
        return db.localeCompare(da);
      });
    }

    const total_count = articles.length;
    const start = (page - 1) * page_size;
    const end = start + page_size;
    const pageArticles = articles.slice(start, end);

    return { total_count, page, page_size, articles: pageArticles };
  }

  getArticleDetail(slug) {
    const articles = this._getFromStorage("articles", []);
    const article = articles.find((a) => a.slug === slug) || null;

    if (!article) {
      return { article: null, is_bookmarked: false };
    }

    const bookmarks = this._getFromStorage("bookmarks", []);
    const is_bookmarked = !!bookmarks.find((b) => b.article_id === article.id);

    return { article, is_bookmarked };
  }

  bookmarkArticle(articleId, note) {
    const articles = this._getFromStorage("articles", []);
    const article = articles.find((a) => a.id === articleId) || null;
    if (!article) {
      throw new Error("Article not found for id " + articleId);
    }

    const bookmarks = this._getFromStorage("bookmarks", []);
    let bookmark = bookmarks.find((b) => b.article_id === articleId) || null;

    if (bookmark) {
      bookmark.note = note || bookmark.note || "";
      bookmark.created_at = this._now();
    } else {
      bookmark = {
        id: this._generateId("bookmark"),
        article_id: articleId,
        note: note || "",
        created_at: this._now()
      };
      bookmarks.push(bookmark);
    }

    this._saveToStorage("bookmarks", bookmarks);

    return {
      bookmark,
      article,
      message: "Article bookmarked."
    };
  }

  getBookmarks() {
    const bookmarks = this._getFromStorage("bookmarks", []);
    const articles = this._getFromStorage("articles", []);

    return bookmarks.map((b) => ({
      bookmark: b,
      article: articles.find((a) => a.id === b.article_id) || null
    }));
  }

  // ---- Self-Assessments ----

  listSelfAssessments() {
    return this._getFromStorage("assessments", []);
  }

  getAssessmentQuestions(assessmentId) {
    return this._getFromStorage("assessment_questions", []).filter(
      (q) => q.assessment_id === assessmentId
    );
  }

  calculateAssessmentResult(assessmentId, responses) {
    const score = this._calculateAssessmentScore(assessmentId, responses || []);
    return {
      assessment_id: assessmentId,
      overall_score: score.overall_score,
      summary: score.summary
    };
  }

  saveAssessmentResult(assessmentId, label, responses) {
    const score = this._calculateAssessmentScore(assessmentId, responses || []);

    const assessment_results = this._getFromStorage("assessment_results", []);
    const assessment_responses = this._getFromStorage("assessment_responses", []);

    const result = {
      id: this._generateId("assessment_result"),
      assessment_id: assessmentId,
      label: label || "",
      overall_score: score.overall_score,
      summary: score.summary,
      created_at: this._now()
    };

    assessment_results.push(result);

    const savedResponses = (responses || []).map((r) => {
      const resp = {
        id: this._generateId("assessment_response"),
        assessment_id: assessmentId,
        assessment_result_id: result.id,
        question_id: r.question_id,
        answer_value: r.answer_value,
        created_at: this._now()
      };
      assessment_responses.push(resp);
      return resp;
    });

    this._saveToStorage("assessment_results", assessment_results);
    this._saveToStorage("assessment_responses", assessment_responses);

    return {
      assessment_result: result,
      responses: savedResponses
    };
  }

  getSavedAssessmentResults() {
    return this._getFromStorage("assessment_results", []);
  }

  // ---- Requirements & comparison ----

  getRequirementFilterOptions() {
    const requirement_items = this._getFromStorage("requirement_items", []);
    const statesSet = new Set();
    requirement_items
      .filter((r) => r.level === "state" && r.state_code)
      .forEach((r) => statesSet.add(r.state_code));

    const states = Array.from(statesSet).map((code) => ({
      state_code: code,
      state_name: this._getStateNameFromCode(code)
    }));

    const levels = [
      { value: "federal", label: "Federal" },
      { value: "state", label: "State" }
    ];

    return { levels, states };
  }

  listRequirements(level, state_code, only_certifications) {
    let requirements = this._getFromStorage("requirement_items", []);

    requirements = requirements.filter((r) => r.level === level);

    if (level === "state" && state_code) {
      requirements = requirements.filter((r) => r.state_code === state_code);
    }

    if (only_certifications) {
      requirements = requirements.filter((r) => r.is_certification);
    }

    return requirements;
  }

  addRequirementToCurrentComparison(requirementId) {
    const requirement_items = this._getFromStorage("requirement_items", []);
    const req = requirement_items.find((r) => r.id === requirementId) || null;
    if (!req) {
      throw new Error("Requirement item not found for id " + requirementId);
    }

    const allComparisons = this._getFromStorage("requirement_comparisons", []);
    let comparison = allComparisons[0] || null;
    if (!comparison) {
      comparison = this._getOrCreateRequirementComparison();
    }

    if (!comparison.federal_requirement_ids) comparison.federal_requirement_ids = [];
    if (!comparison.state_requirement_ids) comparison.state_requirement_ids = [];

    if (req.level === "federal") {
      if (!comparison.federal_requirement_ids.includes(req.id)) {
        comparison.federal_requirement_ids.push(req.id);
      }
    } else if (req.level === "state") {
      if (!comparison.state_requirement_ids.includes(req.id)) {
        comparison.state_requirement_ids.push(req.id);
      }
    }

    if (allComparisons.length === 0) {
      allComparisons.push(comparison);
    } else {
      allComparisons[0] = comparison;
    }
    this._saveToStorage("requirement_comparisons", allComparisons);

    const federal_requirements = comparison.federal_requirement_ids
      .map((id) => requirement_items.find((r) => r.id === id) || null)
      .filter((r) => !!r);

    const state_requirements = comparison.state_requirement_ids
      .map((id) => requirement_items.find((r) => r.id === id) || null)
      .filter((r) => !!r);

    return {
      comparison,
      federal_requirements,
      state_requirements
    };
  }

  getCurrentRequirementComparison() {
    const comparison = this._getOrCreateRequirementComparison();
    const requirement_items = this._getFromStorage("requirement_items", []);

    const federal_requirements = (comparison.federal_requirement_ids || [])
      .map((id) => requirement_items.find((r) => r.id === id) || null)
      .filter((r) => !!r);

    const state_requirements = (comparison.state_requirement_ids || [])
      .map((id) => requirement_items.find((r) => r.id === id) || null)
      .filter((r) => !!r);

    return {
      comparison,
      federal_requirements,
      state_requirements
    };
  }

  saveCurrentRequirementComparison(name, description) {
    const allComparisons = this._getFromStorage("requirement_comparisons", []);
    let comparison = allComparisons[0] || null;
    if (!comparison) {
      comparison = this._getOrCreateRequirementComparison();
    }

    comparison.name = name;
    if (description !== undefined) comparison.description = description;

    if (allComparisons.length === 0) {
      allComparisons.push(comparison);
    } else {
      allComparisons[0] = comparison;
    }

    this._saveToStorage("requirement_comparisons", allComparisons);

    return {
      comparison,
      message: "Requirement comparison saved."
    };
  }

  // ---- About / Contact / Help / Policy ----

  getAboutContent() {
    return this._getFromStorage("about_content", {
      mission: "",
      data_sources: "",
      disclaimers: ""
    });
  }

  getContactInfo() {
    return this._getFromStorage("contact_info", {
      support_email: "",
      mailing_address: "",
      additional_notes: ""
    });
  }

  submitContactMessage(name, email, subject, message) {
    const contact_messages = this._getFromStorage("contact_messages", []);

    const msg = {
      id: this._generateId("contact_message"),
      name: name || "",
      email,
      subject,
      message,
      created_at: this._now()
    };

    contact_messages.push(msg);
    this._saveToStorage("contact_messages", contact_messages);

    return {
      success: true,
      message: "Contact message submitted."
    };
  }

  listHelpTopics() {
    return this._getFromStorage("help_topics", []);
  }

  getHelpTopicContent(slug) {
    const contents = this._getFromStorage("help_topic_contents", {});
    const entry = contents[slug] || { title: "", content: "" };
    return {
      title: entry.title || "",
      content: entry.content || ""
    };
  }

  getPrivacyPolicyContent() {
    return this._getFromStorage("privacy_policy_content", {
      last_updated: "",
      content: ""
    });
  }

  getTermsOfUseContent() {
    return this._getFromStorage("terms_of_use_content", {
      last_updated: "",
      content: ""
    });
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