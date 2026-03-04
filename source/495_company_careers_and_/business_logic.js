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

  // ------------------------
  // Initialization & Storage
  // ------------------------

  _initStorage() {
    const tables = [
      "jobs",
      "locations",
      "departments",
      "job_alerts",
      "candidate_profiles",
      "saved_jobs",
      "not_interested_jobs",
      "applications",
      "interviews",
      "benefits",
      "contact_messages",
      "salary_estimates",
      "interview_availability"
    ];

    for (let i = 0; i < tables.length; i++) {
      const key = tables[i];
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    }

    // Optional content blobs
    if (!localStorage.getItem("about_company_content")) {
      localStorage.setItem("about_company_content", JSON.stringify({ sections: [] }));
    }
    if (!localStorage.getItem("privacy_policy_content")) {
      localStorage.setItem(
        "privacy_policy_content",
        JSON.stringify({ last_updated: null, sections: [] })
      );
    }

    if (!localStorage.getItem("idCounter")) {
      localStorage.setItem("idCounter", "1000");
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

  // ------------------------
  // Helper functions
  // ------------------------

  // Load or initialize single-user state-related collections
  _getOrCreateUserState() {
    return {
      jobAlerts: this._getFromStorage("job_alerts"),
      candidateProfiles: this._getFromStorage("candidate_profiles"),
      savedJobs: this._getFromStorage("saved_jobs"),
      notInterestedJobs: this._getFromStorage("not_interested_jobs"),
      applications: this._getFromStorage("applications"),
      interviews: this._getFromStorage("interviews")
    };
  }

  // Apply keyword, filters, and sorting to jobs list
  _applyJobSearchFilters(jobs, keyword, locationIds, filters, sortBy) {
    const locations = this._getFromStorage("locations");

    const locationById = {};
    for (let i = 0; i < locations.length; i++) {
      locationById[locations[i].id] = locations[i];
    }

    const normalizedKeyword = keyword ? String(keyword).toLowerCase() : null;
    const filterLocationIds = Array.isArray(locationIds) ? locationIds : [];

    // Build helper sets for location hierarchy matching
    const selectedLocations = [];
    for (let i = 0; i < filterLocationIds.length; i++) {
      const l = locationById[filterLocationIds[i]];
      if (l) selectedLocations.push(l);
    }

    const salaryCurrency = filters && filters.salaryCurrency ? filters.salaryCurrency : null;
    const salaryMin = filters && typeof filters.salaryMin === "number" ? filters.salaryMin : null;
    const salaryMax = filters && typeof filters.salaryMax === "number" ? filters.salaryMax : null;
    const postedDateFilter = filters && filters.postedDateFilter ? filters.postedDateFilter : null;
    const isRemoteOnly = filters && filters.isRemoteOnly ? true : false;
    const visaSponsorshipRequired =
      filters && filters.visaSponsorshipRequired ? true : false;

    let filtered = [];

    for (let j = 0; j < jobs.length; j++) {
      const job = jobs[j];

      // Only open jobs
      if (job.status && job.status !== "open") {
        continue;
      }

      // Keyword search
      if (normalizedKeyword) {
        const haystack = [
          job.title || "",
          job.description || "",
          job.requirements || "",
          job.responsibilities || ""
        ]
          .join(" \n")
          .toLowerCase();
        if (haystack.indexOf(normalizedKeyword) === -1) {
          continue;
        }
      }

      // Location filter with hierarchical logic
      if (selectedLocations.length > 0) {
        const jobLocation = locationById[job.location_id];
        let locationMatch = false;

        if (jobLocation) {
          for (let k = 0; k < selectedLocations.length; k++) {
            const sel = selectedLocations[k];

            // Direct match on id
            if (jobLocation.id === sel.id) {
              locationMatch = true;
              break;
            }

            // Country-level: any job in that country
            if (sel.location_type === "country" && jobLocation.country && sel.country) {
              if (jobLocation.country === sel.country) {
                locationMatch = true;
                break;
              }
            }

            // Region-level: region match
            if (sel.location_type === "region" && jobLocation.region && sel.region) {
              if (jobLocation.region === sel.region) {
                locationMatch = true;
                break;
              }
            }

            // Remote-region: match remote flag and similar name
            if (
              sel.location_type === "remote_region" &&
              jobLocation.is_remote &&
              jobLocation.name &&
              sel.name &&
              jobLocation.name.toLowerCase() === sel.name.toLowerCase()
            ) {
              locationMatch = true;
              break;
            }
          }
        }

        if (!locationMatch) {
          continue;
        }
      }

      // Job type filter
      if (filters && Array.isArray(filters.jobTypes) && filters.jobTypes.length > 0) {
        if (!job.job_type || filters.jobTypes.indexOf(job.job_type) === -1) {
          continue;
        }
      }

      // Job level filter
      if (filters && Array.isArray(filters.jobLevels) && filters.jobLevels.length > 0) {
        if (!job.job_level || filters.jobLevels.indexOf(job.job_level) === -1) {
          continue;
        }
      }

      // Currency filter
      if (salaryCurrency && job.salary_currency && job.salary_currency !== salaryCurrency) {
        continue;
      }

      // Salary filters (range overlap check)
      if (salaryMin !== null) {
        const jMin = typeof job.salary_min === "number" ? job.salary_min : null;
        const jMax = typeof job.salary_max === "number" ? job.salary_max : null;
        if (jMin === null && jMax === null) {
          continue;
        }
        const maxToCompare = jMax !== null ? jMax : jMin;
        if (maxToCompare < salaryMin) {
          continue;
        }
      }

      if (salaryMax !== null) {
        const jMin2 = typeof job.salary_min === "number" ? job.salary_min : null;
        const jMax2 = typeof job.salary_max === "number" ? job.salary_max : null;
        if (jMin2 === null && jMax2 === null) {
          continue;
        }
        const minToCompare = jMin2 !== null ? jMin2 : jMax2;
        if (minToCompare > salaryMax) {
          continue;
        }
      }

      // Posted date filter
      if (postedDateFilter) {
        const postedAt = job.posted_at ? new Date(job.posted_at) : null;
        if (postedAt) {
          const now = new Date();
          let diffDays = null;
          diffDays = (now.getTime() - postedAt.getTime()) / (1000 * 60 * 60 * 24);

          if (postedDateFilter === "last_24_hours" && diffDays > 1) {
            continue;
          }
          if (postedDateFilter === "last_7_days" && diffDays > 7) {
            continue;
          }
          if (postedDateFilter === "last_14_days" && diffDays > 14) {
            continue;
          }
          if (postedDateFilter === "last_30_days" && diffDays > 30) {
            continue;
          }
          // "all_time" => no filter
        }
      }

      // Remote-only filter
      if (isRemoteOnly && !job.is_remote) {
        continue;
      }

      // Visa sponsorship filter
      if (visaSponsorshipRequired && !job.visa_sponsorship_available) {
        continue;
      }

      filtered.push(job);
    }

    // Sorting
    const sortKey = sortBy || "most_relevant";
    if (sortKey === "most_recent") {
      filtered.sort(function (a, b) {
        const da = a.posted_at ? new Date(a.posted_at).getTime() : 0;
        const db = b.posted_at ? new Date(b.posted_at).getTime() : 0;
        return db - da;
      });
    } else if (sortKey === "most_relevant") {
      // Simple heuristic: highlighted first, then most recent
      filtered.sort(function (a, b) {
        const ha = a.highlighted ? 1 : 0;
        const hb = b.highlighted ? 1 : 0;
        if (ha !== hb) return hb - ha;
        const da = a.posted_at ? new Date(a.posted_at).getTime() : 0;
        const db = b.posted_at ? new Date(b.posted_at).getTime() : 0;
        return db - da;
      });
    }

    return filtered;
  }

  // Keep Application.status consistent with Interview statuses
  _updateApplicationAndInterviewStatus(applicationId) {
    const applications = this._getFromStorage("applications");
    const interviews = this._getFromStorage("interviews");
    const appIndex = applications.findIndex(function (a) {
      return a.id === applicationId;
    });
    if (appIndex === -1) return null;

    const nowIso = this._now();

    const related = [];
    for (let i = 0; i < interviews.length; i++) {
      if (interviews[i].application_id === applicationId) {
        related.push(interviews[i]);
      }
    }

    let hasScheduled = false;
    for (let j = 0; j < related.length; j++) {
      if (related[j].status === "scheduled" || related[j].status === "rescheduled") {
        hasScheduled = true;
        break;
      }
    }

    let newStatus = applications[appIndex].status;
    if (hasScheduled) {
      newStatus = "interview_scheduled";
    } else {
      // If no scheduled interviews and currently interview_scheduled, fall back to in_review
      if (applications[appIndex].status === "interview_scheduled") {
        newStatus = "in_review";
      }
    }

    if (newStatus !== applications[appIndex].status) {
      applications[appIndex].status = newStatus;
      applications[appIndex].updated_at = nowIso;
      applications[appIndex].last_status_change_at = nowIso;
      this._saveToStorage("applications", applications);
    } else {
      // still update updated_at timestamp
      applications[appIndex].updated_at = nowIso;
      this._saveToStorage("applications", applications);
    }

    return newStatus;
  }

  // Resolve foreign key fields (ending with _id) for a single entity object
  _resolveForeignKeysForObject(obj) {
    if (!obj || typeof obj !== "object") return obj;

    const result = Object.assign({}, obj);
    const keys = Object.keys(obj);

    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      if (key.endsWith("_id") && obj[key] != null) {
        const baseName = key.slice(0, -3); // remove "_id"
        let table = null;
        if (baseName === "job") table = "jobs";
        else if (baseName === "location") table = "locations";
        else if (baseName === "department") table = "departments";
        else if (baseName === "related_benefit") table = "benefits";
        else if (baseName === "application") table = "applications";
        else if (baseName === "benefit") table = "benefits";
        else if (baseName === "salary_estimate") table = "salary_estimates";

        if (table) {
          const arr = this._getFromStorage(table);
          const fkValue = obj[key];
          let found = null;
          for (let j = 0; j < arr.length; j++) {
            if (arr[j].id === fkValue) {
              found = arr[j];
              break;
            }
          }
          result[baseName] = found;
        }
      }
    }

    return result;
  }

  // Resolve foreign keys for arrays of objects
  _resolveForeignKeysForArray(items) {
    if (!Array.isArray(items)) return items;
    const out = [];
    for (let i = 0; i < items.length; i++) {
      out.push(this._resolveForeignKeysForObject(items[i]));
    }
    return out;
  }

  // ------------------------
  // Interface implementations
  // ------------------------

  // getHomePageHighlights()
  getHomePageHighlights() {
    const jobs = this._getFromStorage("jobs");
    const departments = this._getFromStorage("departments");
    const locations = this._getFromStorage("locations");

    const deptById = {};
    for (let i = 0; i < departments.length; i++) {
      deptById[departments[i].id] = departments[i];
    }

    const locById = {};
    for (let i2 = 0; i2 < locations.length; i2++) {
      locById[locations[i2].id] = locations[i2];
    }

    const openJobs = [];
    for (let j = 0; j < jobs.length; j++) {
      if (!jobs[j].status || jobs[j].status === "open") {
        openJobs.push(jobs[j]);
      }
    }

    const highlightedJobs = openJobs.filter(function (job) {
      return !!job.highlighted;
    });

    const sortByDateDesc = function (a, b) {
      const da = a.posted_at ? new Date(a.posted_at).getTime() : 0;
      const db = b.posted_at ? new Date(b.posted_at).getTime() : 0;
      return db - da;
    };

    const baseList = highlightedJobs.length > 0 ? highlightedJobs : openJobs;
    baseList.sort(sortByDateDesc);

    const featured_jobs = [];
    const maxFeatured = 10;
    for (let k = 0; k < baseList.length && k < maxFeatured; k++) {
      const job = baseList[k];
      const dept = job.department_id ? deptById[job.department_id] : null;
      const loc = job.location_id ? locById[job.location_id] : null;

      const card = {
        job_id: job.id,
        title: job.title,
        department_name: dept ? dept.name : null,
        location_name: loc ? loc.name : null,
        location_country: loc ? loc.country : null,
        job_type: job.job_type || null,
        job_level: job.job_level || null,
        is_remote: !!job.is_remote,
        salary_currency: job.salary_currency || null,
        salary_min: typeof job.salary_min === "number" ? job.salary_min : null,
        salary_max: typeof job.salary_max === "number" ? job.salary_max : null,
        posted_at: job.posted_at || null,
        highlighted: !!job.highlighted
      };

      // Resolve job foreign keys and attach for convenience
      const jobResolved = this._resolveForeignKeysForObject(job);
      card.job = jobResolved;

      featured_jobs.push(card);
    }

    const featured_departments = [];
    for (let d = 0; d < departments.length; d++) {
      const dept = departments[d];
      let count = 0;
      for (let j2 = 0; j2 < openJobs.length; j2++) {
        if (openJobs[j2].department_id === dept.id) {
          count++;
        }
      }
      featured_departments.push({
        department_id: dept.id,
        department_name: dept.name,
        description: dept.description || null,
        open_roles_count: count
      });
    }

    const primary_cta = {
      label: "Browse open roles",
      target_page: "careers"
    };

    return {
      featured_jobs: featured_jobs,
      featured_departments: featured_departments,
      primary_cta: primary_cta
    };
  }

  // getJobSearchFilterOptions()
  getJobSearchFilterOptions() {
    const locations = this._getFromStorage("locations");
    const departments = this._getFromStorage("departments");

    const job_types = [
      { value: "full_time", label: "Full-time" },
      { value: "part_time", label: "Part-time" },
      { value: "contract", label: "Contract" },
      { value: "internship", label: "Internship" },
      { value: "temporary", label: "Temporary" }
    ];

    const job_levels = [
      { value: "entry_level", label: "Entry level" },
      { value: "mid_level", label: "Mid-level" },
      { value: "senior", label: "Senior" },
      { value: "lead", label: "Lead" },
      { value: "director", label: "Director" }
    ];

    const posted_date_filters = [
      { value: "last_24_hours", label: "Last 24 hours" },
      { value: "last_7_days", label: "Last 7 days" },
      { value: "last_14_days", label: "Last 14 days" },
      { value: "last_30_days", label: "Last 30 days" },
      { value: "all_time", label: "All time" }
    ];

    const salary_currencies = [
      { value: "usd", label: "USD" },
      { value: "eur", label: "EUR" },
      { value: "gbp", label: "GBP" }
    ];

    const work_authorization_options = [
      { value: "visa_sponsorship_available", label: "Visa sponsorship available" }
    ];

    return {
      locations: locations,
      departments: departments,
      job_types: job_types,
      job_levels: job_levels,
      posted_date_filters: posted_date_filters,
      salary_currencies: salary_currencies,
      work_authorization_options: work_authorization_options
    };
  }

  // searchJobs(keyword, locationIds, filters, sortBy, page, pageSize)
  searchJobs(keyword, locationIds, filters, sortBy, page, pageSize) {
    const jobs = this._getFromStorage("jobs");
    const departments = this._getFromStorage("departments");
    const locations = this._getFromStorage("locations");
    const savedJobs = this._getFromStorage("saved_jobs");
    const notInterested = this._getFromStorage("not_interested_jobs");

    const deptById = {};
    for (let i = 0; i < departments.length; i++) {
      deptById[departments[i].id] = departments[i];
    }

    const locById = {};
    for (let i2 = 0; i2 < locations.length; i2++) {
      locById[locations[i2].id] = locations[i2];
    }

    const savedJobIds = new Set();
    for (let s = 0; s < savedJobs.length; s++) {
      savedJobIds.add(savedJobs[s].job_id);
    }

    const notInterestedJobIds = new Set();
    for (let n = 0; n < notInterested.length; n++) {
      notInterestedJobIds.add(notInterested[n].job_id);
    }

    const effectivePage = typeof page === "number" && page > 0 ? page : 1;
    const effectivePageSize = typeof pageSize === "number" && pageSize > 0 ? pageSize : 20;

    const filt = filters || {};
    const filteredJobs = this._applyJobSearchFilters(
      jobs,
      keyword || "",
      Array.isArray(locationIds) ? locationIds : [],
      filt,
      sortBy || "most_relevant"
    );

    const total_count = filteredJobs.length;
    const startIndex = (effectivePage - 1) * effectivePageSize;
    const endIndex = startIndex + effectivePageSize;

    const jobsPage = [];
    for (let j = startIndex; j < endIndex && j < filteredJobs.length; j++) {
      const job = filteredJobs[j];
      const dept = job.department_id ? deptById[job.department_id] : null;
      const loc = job.location_id ? locById[job.location_id] : null;

      const card = {
        job_id: job.id,
        title: job.title,
        department_name: dept ? dept.name : null,
        location_name: loc ? loc.name : null,
        location_country: loc ? loc.country : null,
        is_remote: !!job.is_remote,
        job_type: job.job_type || null,
        job_level: job.job_level || null,
        salary_currency: job.salary_currency || null,
        salary_min: typeof job.salary_min === "number" ? job.salary_min : null,
        salary_max: typeof job.salary_max === "number" ? job.salary_max : null,
        posted_at: job.posted_at || null,
        highlighted: !!job.highlighted,
        visa_sponsorship_available: !!job.visa_sponsorship_available,
        is_saved: savedJobIds.has(job.id),
        is_not_interested: notInterestedJobIds.has(job.id)
      };

      // Attach full job object with resolved foreign keys
      card.job = this._resolveForeignKeysForObject(job);

      jobsPage.push(card);
    }

    return {
      total_count: total_count,
      page: effectivePage,
      page_size: effectivePageSize,
      jobs: jobsPage,
      active_filters: {
        keyword: keyword || "",
        locationIds: Array.isArray(locationIds) ? locationIds : [],
        filters: {
          jobTypes: (filt && filt.jobTypes) || [],
          jobLevels: (filt && filt.jobLevels) || [],
          salaryCurrency: (filt && filt.salaryCurrency) || null,
          salaryMin: typeof filt.salaryMin === "number" ? filt.salaryMin : null,
          salaryMax: typeof filt.salaryMax === "number" ? filt.salaryMax : null,
          postedDateFilter: (filt && filt.postedDateFilter) || null,
          isRemoteOnly: !!(filt && filt.isRemoteOnly),
          visaSponsorshipRequired: !!(filt && filt.visaSponsorshipRequired)
        },
        sortBy: sortBy || "most_relevant"
      }
    };
  }

  // getJobDetails(jobId)
  getJobDetails(jobId) {
    const jobs = this._getFromStorage("jobs");
    const departments = this._getFromStorage("departments");
    const locations = this._getFromStorage("locations");
    const savedJobs = this._getFromStorage("saved_jobs");
    const notInterested = this._getFromStorage("not_interested_jobs");

    const job = jobs.find(function (j) {
      return j.id === jobId;
    });

    if (!job) {
      return {
        job: null,
        department_name: null,
        is_saved: false,
        is_not_interested: false,
        similar_jobs: []
      };
    }

    const dept = job.department_id
      ? departments.find(function (d) {
          return d.id === job.department_id;
        })
      : null;

    const loc = job.location_id
      ? locations.find(function (l) {
          return l.id === job.location_id;
        })
      : null;

    const is_saved = savedJobs.some(function (s) {
      return s.job_id === job.id;
    });

    const is_not_interested = notInterested.some(function (n) {
      return n.job_id === job.id;
    });

    // Instrumentation for task completion tracking
    try {
      if (
        job &&
        job.is_remote &&
        job.visa_sponsorship_available &&
        (job.job_level === "mid_level" || job.job_level === "senior") &&
        !is_not_interested
      ) {
        localStorage.setItem("task8_openedRemainingJobId", job.id);
      }
    } catch (e) {
      console.error("Instrumentation error:", e);
    }

    const jobDetails = {
      id: job.id,
      title: job.title,
      description: job.description || "",
      requirements: job.requirements || "",
      responsibilities: job.responsibilities || "",
      location_name: loc ? loc.name : null,
      location_country: loc ? loc.country : null,
      job_type: job.job_type || null,
      job_level: job.job_level || null,
      is_remote: !!job.is_remote,
      visa_sponsorship_available: !!job.visa_sponsorship_available,
      salary_currency: job.salary_currency || null,
      salary_min: typeof job.salary_min === "number" ? job.salary_min : null,
      salary_max: typeof job.salary_max === "number" ? job.salary_max : null,
      posted_at: job.posted_at || null,
      status: job.status || null
    };

    // Similar jobs: same department or same location, open, excluding self
    const similar_jobs_raw = [];
    for (let i = 0; i < jobs.length; i++) {
      const j = jobs[i];
      if (j.id === job.id) continue;
      if (j.status && j.status !== "open") continue;

      const sameDept = job.department_id && j.department_id === job.department_id;
      const sameLoc = job.location_id && j.location_id === job.location_id;
      if (!sameDept && !sameLoc) continue;

      const sDept = j.department_id
        ? departments.find(function (d) {
            return d.id === j.department_id;
          })
        : null;
      const sLoc = j.location_id
        ? locations.find(function (l) {
            return l.id === j.location_id;
          })
        : null;

      similar_jobs_raw.push({
        job_id: j.id,
        title: j.title,
        department_name: sDept ? sDept.name : null,
        location_name: sLoc ? sLoc.name : null,
        job_type: j.job_type || null,
        job_level: j.job_level || null,
        salary_currency: j.salary_currency || null,
        salary_min: typeof j.salary_min === "number" ? j.salary_min : null,
        salary_max: typeof j.salary_max === "number" ? j.salary_max : null
      });
    }

    const similar_jobs = similar_jobs_raw.slice(0, 10);

    // Attach full job object for similar_jobs
    for (let s = 0; s < similar_jobs.length; s++) {
      const sj = jobs.find(function (j) {
        return j.id === similar_jobs[s].job_id;
      });
      similar_jobs[s].job = sj ? this._resolveForeignKeysForObject(sj) : null;
    }

    return {
      job: jobDetails,
      department_name: dept ? dept.name : null,
      is_saved: is_saved,
      is_not_interested: is_not_interested,
      similar_jobs: similar_jobs
    };
  }

  // getJobApplicationForm(jobId)
  getJobApplicationForm(jobId) {
    const jobs = this._getFromStorage("jobs");
    const locations = this._getFromStorage("locations");
    const profiles = this._getFromStorage("candidate_profiles");

    const job = jobs.find(function (j) {
      return j.id === jobId;
    });

    const loc = job && job.location_id
      ? locations.find(function (l) {
          return l.id === job.location_id;
        })
      : null;

    const job_summary = {
      job_id: job ? job.id : null,
      title: job ? job.title : null,
      location_name: loc ? loc.name : null
    };

    const profile = profiles.length > 0 ? profiles[0] : null;

    const candidate_defaults = {
      full_name: profile ? profile.full_name : "",
      email: profile ? profile.email : "",
      phone: profile ? profile.phone || "" : "",
      linkedin_url: "",
      salary_currency: job && job.salary_currency
        ? job.salary_currency
        : profile && profile.salary_currency
        ? profile.salary_currency
        : "usd"
    };

    const required_fields = ["full_name", "email"]; // minimal required fields

    return {
      job_summary: job_summary,
      candidate_defaults: candidate_defaults,
      required_fields: required_fields
    };
  }

  // submitJobApplication(jobId, candidateFullName, candidateEmail, candidatePhone, candidateLinkedinUrl, expectedSalary, salaryCurrency, notes)
  submitJobApplication(
    jobId,
    candidateFullName,
    candidateEmail,
    candidatePhone,
    candidateLinkedinUrl,
    expectedSalary,
    salaryCurrency,
    notes
  ) {
    const jobs = this._getFromStorage("jobs");
    const locations = this._getFromStorage("locations");
    const applications = this._getFromStorage("applications");

    const job = jobs.find(function (j) {
      return j.id === jobId;
    });

    if (!job) {
      return {
        success: false,
        application: null,
        message: "Job not found"
      };
    }

    if (job.status && job.status !== "open") {
      return {
        success: false,
        application: null,
        message: "Job is not open for applications"
      };
    }

    const loc = job.location_id
      ? locations.find(function (l) {
          return l.id === job.location_id;
        })
      : null;

    const nowIso = this._now();

    const application = {
      id: this._generateId("app"),
      job_id: job.id,
      job_title_snapshot: job.title,
      job_location_snapshot: loc ? loc.name : null,
      candidate_full_name: candidateFullName,
      candidate_email: candidateEmail,
      candidate_phone: candidatePhone || null,
      candidate_linkedin_url: candidateLinkedinUrl || null,
      expected_salary: typeof expectedSalary === "number" ? expectedSalary : null,
      salary_currency: salaryCurrency || job.salary_currency || null,
      status: "submitted",
      notes: notes || null,
      created_at: nowIso,
      updated_at: nowIso,
      last_status_change_at: nowIso
    };

    applications.push(application);
    this._saveToStorage("applications", applications);

    const appResolved = this._resolveForeignKeysForObject(application);

    return {
      success: true,
      application: appResolved,
      message: "Application submitted successfully"
    };
  }

  // saveJob(jobId, source)
  saveJob(jobId, source) {
    const jobs = this._getFromStorage("jobs");
    const savedJobs = this._getFromStorage("saved_jobs");

    const job = jobs.find(function (j) {
      return j.id === jobId;
    });

    if (!job) {
      return {
        success: false,
        saved_job: null,
        total_saved_count: savedJobs.length
      };
    }

    let existing = null;
    for (let i = 0; i < savedJobs.length; i++) {
      if (savedJobs[i].job_id === jobId) {
        existing = savedJobs[i];
        break;
      }
    }

    let savedJobRecord = existing;
    if (!existing) {
      savedJobRecord = {
        id: this._generateId("saved"),
        job_id: jobId,
        source: source || "manual",
        saved_at: this._now()
      };
      savedJobs.push(savedJobRecord);
      this._saveToStorage("saved_jobs", savedJobs);
    }

    const savedJobResolved = this._resolveForeignKeysForObject(savedJobRecord);

    return {
      success: true,
      saved_job: savedJobResolved,
      total_saved_count: savedJobs.length
    };
  }

  // unsaveJob(jobId)
  unsaveJob(jobId) {
    const savedJobs = this._getFromStorage("saved_jobs");
    const filtered = savedJobs.filter(function (s) {
      return s.job_id !== jobId;
    });

    const changed = filtered.length !== savedJobs.length;
    if (changed) {
      this._saveToStorage("saved_jobs", filtered);
    }

    return {
      success: changed,
      total_saved_count: filtered.length
    };
  }

  // markJobNotInterested(jobId, reason)
  markJobNotInterested(jobId, reason) {
    const jobs = this._getFromStorage("jobs");
    const notInterested = this._getFromStorage("not_interested_jobs");

    const job = jobs.find(function (j) {
      return j.id === jobId;
    });
    if (!job) {
      return {
        success: false,
        not_interested_job: null,
        hidden_jobs_count: notInterested.length
      };
    }

    let existing = null;
    for (let i = 0; i < notInterested.length; i++) {
      if (notInterested[i].job_id === jobId) {
        existing = notInterested[i];
        break;
      }
    }

    let record = existing;
    if (!existing) {
      record = {
        id: this._generateId("ni"),
        job_id: jobId,
        reason: reason || null,
        created_at: this._now()
      };
      notInterested.push(record);
      this._saveToStorage("not_interested_jobs", notInterested);
    }

    const recordResolved = this._resolveForeignKeysForObject(record);

    return {
      success: true,
      not_interested_job: recordResolved,
      hidden_jobs_count: notInterested.length
    };
  }

  // unmarkJobNotInterested(jobId)
  unmarkJobNotInterested(jobId) {
    const notInterested = this._getFromStorage("not_interested_jobs");
    const filtered = notInterested.filter(function (n) {
      return n.job_id !== jobId;
    });

    const changed = filtered.length !== notInterested.length;
    if (changed) {
      this._saveToStorage("not_interested_jobs", filtered);
    }

    return {
      success: changed,
      hidden_jobs_count: filtered.length
    };
  }

  // getJobAlerts()
  getJobAlerts() {
    const alerts = this._getFromStorage("job_alerts");
    const locations = this._getFromStorage("locations");
    const departments = this._getFromStorage("departments");

    const result = [];
    for (let i = 0; i < alerts.length; i++) {
      const alert = alerts[i];
      const loc = alert.location_id
        ? locations.find(function (l) {
            return l.id === alert.location_id;
          })
        : null;
      const dept = alert.department_id
        ? departments.find(function (d) {
            return d.id === alert.department_id;
          })
        : null;

      const alertWithRelations = Object.assign({}, alert, {
        location: loc || null,
        department: dept || null
      });

      result.push({
        job_alert: alertWithRelations,
        location_name: loc ? loc.name : null,
        department_name: dept ? dept.name : null
      });
    }

    return result;
  }

  // createJobAlert(keyword, locationId, salaryMin, salaryMax, departmentId, alertFrequency, email, onlySendNew, postedDateFilter)
  createJobAlert(
    keyword,
    locationId,
    salaryMin,
    salaryMax,
    departmentId,
    alertFrequency,
    email,
    onlySendNew,
    postedDateFilter
  ) {
    const alerts = this._getFromStorage("job_alerts");

    const allowedFrequencies = ["immediate", "daily", "weekly", "monthly"];
    if (allowedFrequencies.indexOf(alertFrequency) === -1) {
      return {
        success: false,
        job_alert: null,
        message: "Invalid alert frequency"
      };
    }

    const nowIso = this._now();

    const alert = {
      id: this._generateId("alert"),
      keyword: keyword || null,
      location_id: locationId || null,
      salary_min: typeof salaryMin === "number" ? salaryMin : null,
      salary_max: typeof salaryMax === "number" ? salaryMax : null,
      department_id: departmentId || null,
      alert_frequency: alertFrequency,
      email: email,
      only_send_new: !!onlySendNew,
      posted_date_filter: postedDateFilter || null,
      active: true,
      created_at: nowIso,
      updated_at: nowIso,
      last_sent_at: null
    };

    alerts.push(alert);
    this._saveToStorage("job_alerts", alerts);

    const alertResolved = this._resolveForeignKeysForObject(alert);

    return {
      success: true,
      job_alert: alertResolved,
      message: "Job alert created"
    };
  }

  // updateJobAlert(jobAlertId, updates)
  updateJobAlert(jobAlertId, updates) {
    const alerts = this._getFromStorage("job_alerts");
    const index = alerts.findIndex(function (a) {
      return a.id === jobAlertId;
    });
    if (index === -1) {
      return {
        success: false,
        job_alert: null
      };
    }

    const allowedUpdates = [
      "keyword",
      "locationId",
      "salaryMin",
      "salaryMax",
      "departmentId",
      "alertFrequency",
      "email",
      "onlySendNew",
      "postedDateFilter",
      "active"
    ];

    const current = alerts[index];

    if (updates) {
      if (Object.prototype.hasOwnProperty.call(updates, "keyword")) {
        current.keyword = updates.keyword;
      }
      if (Object.prototype.hasOwnProperty.call(updates, "locationId")) {
        current.location_id = updates.locationId;
      }
      if (Object.prototype.hasOwnProperty.call(updates, "salaryMin")) {
        current.salary_min = updates.salaryMin;
      }
      if (Object.prototype.hasOwnProperty.call(updates, "salaryMax")) {
        current.salary_max = updates.salaryMax;
      }
      if (Object.prototype.hasOwnProperty.call(updates, "departmentId")) {
        current.department_id = updates.departmentId;
      }
      if (Object.prototype.hasOwnProperty.call(updates, "alertFrequency")) {
        current.alert_frequency = updates.alertFrequency;
      }
      if (Object.prototype.hasOwnProperty.call(updates, "email")) {
        current.email = updates.email;
      }
      if (Object.prototype.hasOwnProperty.call(updates, "onlySendNew")) {
        current.only_send_new = !!updates.onlySendNew;
      }
      if (Object.prototype.hasOwnProperty.call(updates, "postedDateFilter")) {
        current.posted_date_filter = updates.postedDateFilter;
      }
      if (Object.prototype.hasOwnProperty.call(updates, "active")) {
        current.active = !!updates.active;
      }
    }

    current.updated_at = this._now();
    alerts[index] = current;
    this._saveToStorage("job_alerts", alerts);

    const alertResolved = this._resolveForeignKeysForObject(current);

    return {
      success: true,
      job_alert: alertResolved
    };
  }

  // deleteJobAlert(jobAlertId)
  deleteJobAlert(jobAlertId) {
    const alerts = this._getFromStorage("job_alerts");
    const filtered = alerts.filter(function (a) {
      return a.id !== jobAlertId;
    });
    const changed = filtered.length !== alerts.length;
    if (changed) {
      this._saveToStorage("job_alerts", filtered);
    }
    return {
      success: changed
    };
  }

  // toggleJobAlertActive(jobAlertId, active)
  toggleJobAlertActive(jobAlertId, active) {
    const alerts = this._getFromStorage("job_alerts");
    const index = alerts.findIndex(function (a) {
      return a.id === jobAlertId;
    });
    if (index === -1) {
      return {
        success: false,
        job_alert: null
      };
    }

    alerts[index].active = !!active;
    alerts[index].updated_at = this._now();
    this._saveToStorage("job_alerts", alerts);

    const alertResolved = this._resolveForeignKeysForObject(alerts[index]);

    return {
      success: true,
      job_alert: alertResolved
    };
  }

  // getCandidateProfile()
  getCandidateProfile() {
    const profiles = this._getFromStorage("candidate_profiles");
    const locations = this._getFromStorage("locations");

    const profile = profiles.length > 0 ? profiles[0] : null;

    let preferred_locations = [];
    let profileWithRelations = null;

    if (profile) {
      const locIds = Array.isArray(profile.preferred_location_ids)
        ? profile.preferred_location_ids
        : [];
      preferred_locations = locIds.map(function (id) {
        const loc = locations.find(function (l) {
          return l.id === id;
        });
        return {
          location_id: id,
          location_name: loc ? loc.name : null
        };
      });

      profileWithRelations = Object.assign({}, profile, {
        preferred_locations: preferred_locations.map(function (pl) {
          const loc = locations.find(function (l) {
            return l.id === pl.location_id;
          });
          return loc || null;
        })
      });
    }

    return {
      profileExists: !!profile,
      profile: profileWithRelations,
      preferred_locations: preferred_locations
    };
  }

  // upsertCandidateProfile(fullName, email, phone, currentRole, primarySkills, preferredLocationIds, preferredJobTypes, salaryCurrency, desiredSalaryMin, desiredSalaryMax, openToRelocation)
  upsertCandidateProfile(
    fullName,
    email,
    phone,
    currentRole,
    primarySkills,
    preferredLocationIds,
    preferredJobTypes,
    salaryCurrency,
    desiredSalaryMin,
    desiredSalaryMax,
    openToRelocation
  ) {
    const profiles = this._getFromStorage("candidate_profiles");
    const locations = this._getFromStorage("locations");

    const nowIso = this._now();

    let profile = profiles.length > 0 ? profiles[0] : null;

    if (!profile) {
      profile = {
        id: this._generateId("profile"),
        full_name: fullName,
        email: email,
        phone: phone || null,
        current_role: currentRole || null,
        primary_skills: Array.isArray(primarySkills) ? primarySkills : [],
        preferred_location_ids: Array.isArray(preferredLocationIds)
          ? preferredLocationIds
          : [],
        preferred_job_types: Array.isArray(preferredJobTypes)
          ? preferredJobTypes
          : [],
        salary_currency: salaryCurrency || null,
        desired_salary_min:
          typeof desiredSalaryMin === "number" ? desiredSalaryMin : null,
        desired_salary_max:
          typeof desiredSalaryMax === "number" ? desiredSalaryMax : null,
        open_to_relocation: typeof openToRelocation === "boolean" ? openToRelocation : null,
        created_at: nowIso,
        updated_at: nowIso
      };
      profiles.push(profile);
    } else {
      profile.full_name = fullName;
      profile.email = email;
      profile.phone = phone || null;
      profile.current_role = currentRole || null;
      profile.primary_skills = Array.isArray(primarySkills) ? primarySkills : [];
      profile.preferred_location_ids = Array.isArray(preferredLocationIds)
        ? preferredLocationIds
        : [];
      profile.preferred_job_types = Array.isArray(preferredJobTypes)
        ? preferredJobTypes
        : [];
      profile.salary_currency = salaryCurrency || null;
      profile.desired_salary_min =
        typeof desiredSalaryMin === "number" ? desiredSalaryMin : null;
      profile.desired_salary_max =
        typeof desiredSalaryMax === "number" ? desiredSalaryMax : null;
      profile.open_to_relocation =
        typeof openToRelocation === "boolean" ? openToRelocation : null;
      profile.updated_at = nowIso;
      profiles[0] = profile;
    }

    this._saveToStorage("candidate_profiles", profiles);

    const preferred_locations = (profile.preferred_location_ids || []).map(function (id) {
      const loc = locations.find(function (l) {
        return l.id === id;
      });
      return loc || null;
    });

    const profileWithRelations = Object.assign({}, profile, {
      preferred_locations: preferred_locations
    });

    return {
      success: true,
      profile: profileWithRelations
    };
  }

  // getSavedJobs()
  getSavedJobs() {
    const savedJobs = this._getFromStorage("saved_jobs");
    const jobs = this._getFromStorage("jobs");
    const departments = this._getFromStorage("departments");
    const locations = this._getFromStorage("locations");
    const notInterested = this._getFromStorage("not_interested_jobs");

    const deptById = {};
    for (let d = 0; d < departments.length; d++) {
      deptById[departments[d].id] = departments[d];
    }

    const locById = {};
    for (let l = 0; l < locations.length; l++) {
      locById[locations[l].id] = locations[l];
    }

    const notInterestedIds = new Set();
    for (let n = 0; n < notInterested.length; n++) {
      notInterestedIds.add(notInterested[n].job_id);
    }

    const resultJobs = [];

    for (let i = 0; i < savedJobs.length; i++) {
      const sj = savedJobs[i];
      const job = jobs.find(function (j) {
        return j.id === sj.job_id;
      });

      const dept = job && job.department_id ? deptById[job.department_id] : null;
      const loc = job && job.location_id ? locById[job.location_id] : null;

      resultJobs.push({
        job_id: sj.job_id,
        title: job ? job.title : null,
        department_name: dept ? dept.name : null,
        location_name: loc ? loc.name : null,
        job_type: job ? job.job_type || null : null,
        job_level: job ? job.job_level || null : null,
        is_remote: job ? !!job.is_remote : false,
        salary_currency: job ? job.salary_currency || null : null,
        salary_min: job && typeof job.salary_min === "number" ? job.salary_min : null,
        salary_max: job && typeof job.salary_max === "number" ? job.salary_max : null,
        saved_at: sj.saved_at,
        is_not_interested: notInterestedIds.has(sj.job_id),
        job: job ? this._resolveForeignKeysForObject(job) : null
      });
    }

    // Instrumentation for task completion tracking
    try {
      localStorage.setItem("task5_savedJobsPageOpened", "true");
    } catch (e) {
      console.error("Instrumentation error:", e);
    }

    return {
      jobs: resultJobs
    };
  }

  // getApplicationsDashboard()
  getApplicationsDashboard() {
    const applications = this._getFromStorage("applications");
    const interviews = this._getFromStorage("interviews");

    const now = new Date();

    const items = applications.map(function (app) {
      const hasUpcomingInterview = interviews.some(function (iv) {
        if (iv.application_id !== app.id) return false;
        if (iv.status !== "scheduled" && iv.status !== "rescheduled") return false;
        if (!iv.scheduled_start) return false;
        const start = new Date(iv.scheduled_start);
        return start.getTime() > now.getTime();
      });

      return {
        application_id: app.id,
        job_title_snapshot: app.job_title_snapshot,
        job_location_snapshot: app.job_location_snapshot,
        status: app.status,
        created_at: app.created_at,
        last_status_change_at: app.last_status_change_at || app.created_at,
        has_upcoming_interview: hasUpcomingInterview
      };
    });

    return {
      applications: items
    };
  }

  // getApplicationDetail(applicationId)
  getApplicationDetail(applicationId) {
    const applications = this._getFromStorage("applications");
    const jobs = this._getFromStorage("jobs");
    const locations = this._getFromStorage("locations");
    const interviews = this._getFromStorage("interviews");

    const application = applications.find(function (a) {
      return a.id === applicationId;
    });

    if (!application) {
      return {
        application: null,
        job_summary: null,
        interviews: []
      };
    }

    const job = jobs.find(function (j) {
      return j.id === application.job_id;
    });

    const loc = job && job.location_id
      ? locations.find(function (l) {
          return l.id === job.location_id;
        })
      : null;

    const job_summary = {
      job_id: job ? job.id : application.job_id,
      title: job ? job.title : application.job_title_snapshot,
      location_name: loc ? loc.name : application.job_location_snapshot
    };

    const applicationResolved = Object.assign(
      {},
      application,
      {
        job: job || null
      }
    );

    const relatedInterviewsRaw = interviews.filter(function (iv) {
      return iv.application_id === application.id;
    });

    const relatedInterviews = relatedInterviewsRaw.map(
      function (iv) {
        return Object.assign({}, iv, { application: applicationResolved });
      }
    );

    return {
      application: applicationResolved,
      job_summary: job_summary,
      interviews: relatedInterviews
    };
  }

  // getInterviewAvailability(applicationId, fromDate, toDate)
  getInterviewAvailability(applicationId, fromDate, toDate) {
    let availability = this._getFromStorage("interview_availability");

    const from = new Date(fromDate);
    const to = new Date(toDate);

    // First, find any existing slots in the given range for this application
    let matchingSlots = availability.filter(function (slot) {
      if (slot.application_id !== applicationId) return false;
      if (!slot.start) return false;
      const start = new Date(slot.start);
      return start.getTime() >= from.getTime() && start.getTime() <= to.getTime();
    });

    // If no availability exists yet for this application in the requested range,
    // generate some default afternoon slots (2	3pm) for weekdays in that range.
    if (matchingSlots.length === 0 && !isNaN(from.getTime()) && !isNaN(to.getTime())) {
      const generated = [];
      const cursor = new Date(from.getTime());
      while (cursor.getTime() <= to.getTime()) {
        const day = cursor.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
        if (day >= 1 && day <= 5) {
          const start = new Date(cursor.getTime());
          start.setHours(14, 0, 0, 0); // 2pm
          const end = new Date(cursor.getTime());
          end.setHours(15, 0, 0, 0); // 3pm
          if (start.getTime() >= from.getTime() && start.getTime() <= to.getTime()) {
            const slot = {
              application_id: applicationId,
              start: start.toISOString(),
              end: end.toISOString(),
              timezone: "UTC"
            };
            availability.push(slot);
            generated.push(slot);
          }
        }
        cursor.setDate(cursor.getDate() + 1);
      }
      if (generated.length > 0) {
        this._saveToStorage("interview_availability", availability);
        matchingSlots = generated;
      }
    }

    const time_slots = matchingSlots.map(function (slot) {
      return {
        start: slot.start,
        end: slot.end || null,
        timezone: slot.timezone || null
      };
    });

    return {
      time_slots: time_slots
    };
  }

  // scheduleInterview(applicationId, start, end, timezone, interviewType)
  scheduleInterview(applicationId, start, end, timezone, interviewType) {
    const applications = this._getFromStorage("applications");
    const interviews = this._getFromStorage("interviews");

    const app = applications.find(function (a) {
      return a.id === applicationId;
    });

    if (!app) {
      return {
        success: false,
        interview: null,
        application_status_updated_to: null
      };
    }

    const interview = {
      id: this._generateId("iv"),
      application_id: applicationId,
      scheduled_start: start,
      scheduled_end: end || null,
      timezone: timezone || null,
      interview_type: interviewType || "video_interview",
      status: "scheduled",
      created_at: this._now(),
      updated_at: this._now()
    };

    interviews.push(interview);
    this._saveToStorage("interviews", interviews);

    const newStatus = this._updateApplicationAndInterviewStatus(applicationId);

    const interviewResolved = Object.assign({}, interview, {
      application: app
    });

    return {
      success: true,
      interview: interviewResolved,
      application_status_updated_to: newStatus
    };
  }

  // rescheduleInterview(interviewId, newStart, newEnd, timezone)
  rescheduleInterview(interviewId, newStart, newEnd, timezone) {
    const interviews = this._getFromStorage("interviews");
    const index = interviews.findIndex(function (iv) {
      return iv.id === interviewId;
    });

    if (index === -1) {
      return {
        success: false,
        interview: null
      };
    }

    const interview = interviews[index];
    interview.scheduled_start = newStart;
    interview.scheduled_end = newEnd || null;
    if (timezone) {
      interview.timezone = timezone;
    }
    interview.status = "rescheduled";
    interview.updated_at = this._now();
    interviews[index] = interview;

    this._saveToStorage("interviews", interviews);

    const newStatus = this._updateApplicationAndInterviewStatus(interview.application_id);

    const applications = this._getFromStorage("applications");
    const app = applications.find(function (a) {
      return a.id === interview.application_id;
    });

    const interviewResolved = Object.assign({}, interview, {
      application: app || null
    });

    return {
      success: true,
      interview: interviewResolved,
      application_status_updated_to: newStatus
    };
  }

  // cancelInterview(interviewId, reason)
  cancelInterview(interviewId, reason) {
    const interviews = this._getFromStorage("interviews");
    const index = interviews.findIndex(function (iv) {
      return iv.id === interviewId;
    });

    if (index === -1) {
      return {
        success: false,
        interview: null
      };
    }

    const interview = interviews[index];
    interview.status = "canceled";
    interview.updated_at = this._now();
    // reason is not stored in the model; it's ignored or could be logged elsewhere
    interviews[index] = interview;

    this._saveToStorage("interviews", interviews);

    const newStatus = this._updateApplicationAndInterviewStatus(interview.application_id);

    const applications = this._getFromStorage("applications");
    const app = applications.find(function (a) {
      return a.id === interview.application_id;
    });

    const interviewResolved = Object.assign({}, interview, {
      application: app || null
    });

    return {
      success: true,
      interview: interviewResolved,
      application_status_updated_to: newStatus
    };
  }

  // getBenefitsOverview()
  getBenefitsOverview() {
    const benefits = this._getFromStorage("benefits");

    const items = benefits.map(function (b) {
      return {
        id: b.id,
        name: b.name,
        slug: b.slug,
        short_description: b.short_description || null,
        is_highlighted: !!b.is_highlighted
      };
    });

    return {
      benefits: items
    };
  }

  // getBenefitDetail(slug)
  getBenefitDetail(slug) {
    const benefits = this._getFromStorage("benefits");
    const benefit = benefits.find(function (b) {
      return b.slug === slug;
    });

    return {
      benefit: benefit || null
    };
  }

  // submitContactMessage(fullName, email, topic, message, relatedBenefitId)
  submitContactMessage(fullName, email, topic, message, relatedBenefitId) {
    const allowedTopics = [
      "benefits_and_compensation",
      "application_status",
      "technical_issue",
      "general_question",
      "other"
    ];

    if (allowedTopics.indexOf(topic) === -1) {
      return {
        success: false,
        contact_message: null,
        confirmation_message: "Invalid topic"
      };
    }

    const messages = this._getFromStorage("contact_messages");

    const nowIso = this._now();

    const contactMessage = {
      id: this._generateId("msg"),
      full_name: fullName,
      email: email,
      topic: topic,
      message: message,
      related_benefit_id: relatedBenefitId || null,
      created_at: nowIso,
      status: "new"
    };

    messages.push(contactMessage);
    this._saveToStorage("contact_messages", messages);

    const contactResolved = this._resolveForeignKeysForObject(contactMessage);

    return {
      success: true,
      contact_message: contactResolved,
      confirmation_message: "Your message has been sent to the recruiting team."
    };
  }

  // getSalaryEstimatorConfig()
  getSalaryEstimatorConfig() {
    const locations = this._getFromStorage("locations");

    const experience_ranges = [
      { value: "zero_to_one_years", label: "0-1 years" },
      { value: "two_to_three_years", label: "2-3 years" },
      { value: "four_to_six_years", label: "4-6 years" },
      { value: "seven_to_nine_years", label: "7-9 years" },
      { value: "ten_plus_years", label: "10+ years" }
    ];

    const currencies = [
      { value: "usd", label: "USD" },
      { value: "eur", label: "EUR" },
      { value: "gbp", label: "GBP" }
    ];

    return {
      experience_ranges: experience_ranges,
      currencies: currencies,
      supported_locations: locations
    };
  }

  // getSalaryEstimate(jobTitle, locationId, experienceRange)
  getSalaryEstimate(jobTitle, locationId, experienceRange) {
    const salaryEstimates = this._getFromStorage("salary_estimates");
    const locations = this._getFromStorage("locations");
    const jobs = this._getFromStorage("jobs");

    let estimate = salaryEstimates.find(function (e) {
      return (
        e.job_title === jobTitle &&
        e.location_id === locationId &&
        e.experience_range === experienceRange
      );
    });

    const location = locations.find(function (l) {
      return l.id === locationId;
    });

    // Derive from jobs if not present
    if (!estimate) {
      const matchingJobs = jobs.filter(function (j) {
        if (j.location_id !== locationId) return false;
        if (!j.title) return false;
        return j.title.toLowerCase().indexOf(jobTitle.toLowerCase()) !== -1;
      });

      let minVals = [];
      let maxVals = [];
      for (let i = 0; i < matchingJobs.length; i++) {
        const j = matchingJobs[i];
        if (typeof j.salary_min === "number") minVals.push(j.salary_min);
        if (typeof j.salary_max === "number") maxVals.push(j.salary_max);
      }

      let salary_min_estimate = 0;
      let salary_max_estimate = 0;
      let currency = "eur";

      if (minVals.length > 0 || maxVals.length > 0) {
        if (minVals.length === 0 && maxVals.length > 0) {
          salary_min_estimate = maxVals.reduce(function (a, b) {
            return a + b;
          }, 0) / maxVals.length;
          salary_max_estimate = salary_min_estimate;
        } else if (maxVals.length === 0 && minVals.length > 0) {
          salary_min_estimate = minVals.reduce(function (a, b) {
            return a + b;
          }, 0) / minVals.length;
          salary_max_estimate = salary_min_estimate;
        } else {
          salary_min_estimate = minVals.reduce(function (a, b) {
            return a + b;
          }, 0) / minVals.length;
          salary_max_estimate = maxVals.reduce(function (a, b) {
            return a + b;
          }, 0) / maxVals.length;
        }

        // Use currency of first matching job with currency, else infer from location country
        const jobWithCurrency = matchingJobs.find(function (j) {
          return !!j.salary_currency;
        });
        if (jobWithCurrency) {
          currency = jobWithCurrency.salary_currency;
        } else if (location && location.country) {
          const c = location.country.toLowerCase();
          if (c === "united states" || c === "usa" || c === "us") currency = "usd";
          else if (c === "united kingdom" || c === "uk") currency = "gbp";
          else currency = "eur";
        }
      } else {
        // No data available; leave estimates at 0, currency default to EUR
        currency = "eur";
      }

      estimate = {
        id: this._generateId("se"),
        job_title: jobTitle,
        location_id: locationId,
        experience_range: experienceRange,
        currency: currency,
        salary_min_estimate: salary_min_estimate,
        salary_max_estimate: salary_max_estimate,
        created_at: this._now()
      };

      salaryEstimates.push(estimate);
      this._saveToStorage("salary_estimates", salaryEstimates);
    }

    const estimateResolved = this._resolveForeignKeysForObject(estimate);

    return {
      estimate: estimateResolved,
      location_name: location ? location.name : null
    };
  }

  // getAboutCompanyContent()
  getAboutCompanyContent() {
    const raw = localStorage.getItem("about_company_content");
    if (!raw) {
      return { sections: [] };
    }
    try {
      const parsed = JSON.parse(raw);
      return {
        sections: Array.isArray(parsed.sections) ? parsed.sections : []
      };
    } catch (e) {
      return { sections: [] };
    }
  }

  // getPrivacyPolicyContent()
  getPrivacyPolicyContent() {
    const raw = localStorage.getItem("privacy_policy_content");
    if (!raw) {
      return { last_updated: null, sections: [] };
    }
    try {
      const parsed = JSON.parse(raw);
      return {
        last_updated: parsed.last_updated || null,
        sections: Array.isArray(parsed.sections) ? parsed.sections : []
      };
    } catch (e) {
      return { last_updated: null, sections: [] };
    }
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