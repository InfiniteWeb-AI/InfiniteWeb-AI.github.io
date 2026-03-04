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

  // -------------------- Storage helpers --------------------

  _initStorage() {
    const keys = [
      'companies',
      'jobs',
      'candidate_profiles',
      'saved_jobs',
      'saved_job_lists',
      'saved_job_list_items',
      'job_alerts',
      'job_applications',
      'shortlists',
      'interview_slots',
      'contact_tickets'
    ];

    keys.forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    });

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }

    if (!localStorage.getItem('employer_session')) {
      localStorage.setItem('employer_session', JSON.stringify({ isLoggedIn: false }));
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

  _nowISO() {
    return new Date().toISOString();
  }

  _parseDate(value) {
    if (!value) return null;
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }

  _clone(obj) {
    return obj == null ? obj : JSON.parse(JSON.stringify(obj));
  }

  _getSession(key, fallback) {
    const raw = localStorage.getItem(key);
    if (!raw) return this._clone(fallback);
    try {
      return JSON.parse(raw);
    } catch (e) {
      return this._clone(fallback);
    }
  }

  // -------------------- Domain helpers --------------------

  // Load or initialize the current candidate profile
  _getOrCreateCurrentCandidateProfile() {
    let profiles = this._getFromStorage('candidate_profiles');
    let current = profiles.find((p) => p.is_current_user === true);

    if (!current) {
      const id = this._generateId('cand');
      current = {
        id,
        full_name: '',
        email: '',
        headline_title: '',
        current_role: '',
        years_experience: 0,
        location: '',
        desired_locations: [],
        target_salary_min: null,
        target_salary_max: null,
        skills: [],
        rating: null,
        summary: '',
        is_current_user: true,
        created_at: this._nowISO(),
        updated_at: this._nowISO()
      };
      profiles.push(current);
      this._saveToStorage('candidate_profiles', profiles);
    }

    return this._clone(current);
  }

  // Employer session management
  _getOrCreateEmployerSession() {
    const session = this._getSession('employer_session', { isLoggedIn: false });
    if (!session || typeof session.isLoggedIn === 'undefined') {
      const clean = { isLoggedIn: false };
      localStorage.setItem('employer_session', JSON.stringify(clean));
      return clean;
    }
    return session;
  }

  _setEmployerSession(session) {
    localStorage.setItem('employer_session', JSON.stringify(session));
  }

  // Resolve company for a job
  _resolveJobCompany(job, companies) {
    const company = companies.find((c) => c.id === job.company_id) || null;
    return { ...job, company };
  }

  // Interview slot expansion with foreign key resolution
  _expandInterviewSlot(slot) {
    const candidates = this._getFromStorage('candidate_profiles');
    const shortlists = this._getFromStorage('shortlists');
    const jobs = this._getFromStorage('jobs');
    const companies = this._getFromStorage('companies');

    const candidate = candidates.find((c) => c.id === slot.candidate_id) || null;
    const shortlist = slot.shortlist_id
      ? shortlists.find((s) => s.id === slot.shortlist_id) || null
      : null;
    let job = null;
    let company = null;
    if (slot.job_id) {
      job = jobs.find((j) => j.id === slot.job_id) || null;
      if (job) {
        company = companies.find((c) => c.id === job.company_id) || null;
        job = { ...job, company };
      }
    }

    return {
      ...slot,
      candidate,
      shortlist,
      job
    };
  }

  // Apply filters and sorting to job search
  _applyJobSearchFilters(jobs, filters, companies, sort_by) {
    const now = new Date();
    let result = jobs.filter((job) => {
      // Only active & non-expired
      if (job.job_status && job.job_status !== 'active') return false;
      if (job.posting_expiry_date) {
        const exp = this._parseDate(job.posting_expiry_date);
        if (exp && exp < now) return false;
      }
      return true;
    });

    if (filters) {
      const {
        salary_min,
        salary_max,
        work_arrangements,
        employment_types,
        company_rating_min
      } = filters;

      if (typeof salary_min === 'number') {
        result = result.filter((job) => {
          const min = typeof job.salary_min === 'number' ? job.salary_min : null;
          const max = typeof job.salary_max === 'number' ? job.salary_max : null;
          if (min != null && min >= salary_min) return true;
          if (max != null && max >= salary_min) return true;
          return false;
        });
      }

      if (typeof salary_max === 'number') {
        result = result.filter((job) => {
          const min = typeof job.salary_min === 'number' ? job.salary_min : null;
          const max = typeof job.salary_max === 'number' ? job.salary_max : null;
          if (max != null && max <= salary_max) return true;
          if (max == null && min != null && min <= salary_max) return true;
          return false;
        });
      }

      if (Array.isArray(work_arrangements) && work_arrangements.length > 0) {
        result = result.filter((job) => work_arrangements.includes(job.work_arrangement));
      }

      if (Array.isArray(employment_types) && employment_types.length > 0) {
        result = result.filter((job) => employment_types.includes(job.employment_type));
      }

      if (typeof company_rating_min === 'number') {
        result = result.filter((job) => {
          const company = companies.find((c) => c.id === job.company_id);
          if (!company || typeof company.rating !== 'number') return false;
          return company.rating >= company_rating_min;
        });
      }
    }

    // Sorting
    const sortBy = sort_by || 'relevance';
    const toNumber = (v, fallback = 0) => (typeof v === 'number' ? v : fallback);

    if (sortBy === 'date_posted_newest') {
      result.sort((a, b) => {
        const da = this._parseDate(a.date_posted) || new Date(0);
        const db = this._parseDate(b.date_posted) || new Date(0);
        return db - da;
      });
    } else if (sortBy === 'salary_high_to_low') {
      result.sort((a, b) => {
        const aVal = toNumber(a.salary_max, a.salary_min || 0);
        const bVal = toNumber(b.salary_max, b.salary_min || 0);
        return bVal - aVal;
      });
    } else if (sortBy === 'salary_low_to_high') {
      result.sort((a, b) => {
        const aVal = toNumber(a.salary_min, a.salary_max || Number.MAX_SAFE_INTEGER);
        const bVal = toNumber(b.salary_min, b.salary_max || Number.MAX_SAFE_INTEGER);
        return aVal - bVal;
      });
    } else {
      // 'relevance' or unknown => default to newest first as a reasonable behavior
      result.sort((a, b) => {
        const da = this._parseDate(a.date_posted) || new Date(0);
        const db = this._parseDate(b.date_posted) || new Date(0);
        return db - da;
      });
    }

    return result;
  }

  _calculatePostingExpiryDate(datePostedISO, posting_duration_days) {
    if (!posting_duration_days || typeof posting_duration_days !== 'number') return null;
    const date = this._parseDate(datePostedISO);
    if (!date) return null;
    const exp = new Date(date.getTime());
    exp.setDate(exp.getDate() + posting_duration_days);
    return exp.toISOString();
  }

  // Keep SavedJobListItem associations in sync when jobs are unsaved
  _updateSavedJobsDerivedLists(action, jobId) {
    let listItems = this._getFromStorage('saved_job_list_items');
    if (action === 'unsave') {
      const before = listItems.length;
      listItems = listItems.filter((item) => item.job_id !== jobId);
      if (listItems.length !== before) {
        this._saveToStorage('saved_job_list_items', listItems);
      }
    }
    // For 'save' we don't auto-add to any list; nothing to do.
  }

  _recomputeShortlistCandidateIds(shortlist, candidateProfiles) {
    if (!shortlist.candidate_ids || !Array.isArray(shortlist.candidate_ids)) {
      shortlist.candidate_ids = [];
    }
    const existingIds = new Set(candidateProfiles.map((c) => c.id));
    const deduped = [];
    shortlist.candidate_ids.forEach((id) => {
      if (existingIds.has(id) && !deduped.includes(id)) deduped.push(id);
    });
    shortlist.candidate_ids = deduped;
    shortlist.updated_at = this._nowISO();
    return shortlist;
  }

  _validateInterviewSlots(candidateId, shortlistId, jobId, slots) {
    const now = new Date();
    const allSlots = this._getFromStorage('interview_slots');
    const existingStarts = new Set(
      allSlots
        .filter((s) => s.candidate_id === candidateId)
        .map((s) => s.start_datetime)
    );

    const valid = [];
    const newStarts = new Set();

    (slots || []).forEach((slot) => {
      if (!slot || !slot.start_datetime) return;
      const start = this._parseDate(slot.start_datetime);
      if (!start) return;
      if (start <= now) return; // must be in the future

      if (existingStarts.has(slot.start_datetime) || newStarts.has(slot.start_datetime)) {
        return; // avoid duplicate start times for this candidate
      }

      if (slot.end_datetime) {
        const end = this._parseDate(slot.end_datetime);
        if (!end || end <= start) return; // invalid end
      }

      newStarts.add(slot.start_datetime);
      valid.push(slot);
    });

    return valid;
  }

  // -------------------- Interfaces implementation --------------------

  // getHomepageSummary
  getHomepageSummary() {
    const jobs = this._getFromStorage('jobs');
    const companies = this._getFromStorage('companies');
    const saved_jobs = this._getFromStorage('saved_jobs');
    const job_alerts = this._getFromStorage('job_alerts');
    const job_applications = this._getFromStorage('job_applications');
    const shortlists = this._getFromStorage('shortlists');

    const now = new Date();
    const activeJobs = jobs.filter((job) => {
      if (job.job_status && job.job_status !== 'active') return false;
      if (job.posting_expiry_date) {
        const exp = this._parseDate(job.posting_expiry_date);
        if (exp && exp < now) return false;
      }
      return true;
    });

    // Featured & recent: newest active jobs
    const sortedByDate = [...activeJobs].sort((a, b) => {
      const da = this._parseDate(a.date_posted) || new Date(0);
      const db = this._parseDate(b.date_posted) || new Date(0);
      return db - da;
    });

    const featured_jobs = sortedByDate.slice(0, 5).map((job) => {
      const company = companies.find((c) => c.id === job.company_id) || null;
      return { ...job, company };
    });

    const recent_jobs = sortedByDate.slice(0, 10).map((job) => {
      const company = companies.find((c) => c.id === job.company_id) || null;
      return { ...job, company };
    });

    const profile = this._getOrCreateCurrentCandidateProfile();

    const candidate_summary = {
      has_profile: !!profile && (!!profile.full_name || !!profile.email),
      saved_jobs_count: saved_jobs.length,
      active_alerts_count: job_alerts.filter((a) => a.is_active !== false).length,
      recent_application_count: job_applications.length
    };

    const employerSession = this._getOrCreateEmployerSession();
    const employerActiveJobs = activeJobs.filter((j) => j.is_owned_by_current_employer === true);

    const employer_summary = {
      is_employer_logged_in: !!employerSession.isLoggedIn,
      active_jobs_count: employerActiveJobs.length,
      shortlists_count: shortlists.length
    };

    // Popular searches - could be static or derived; keep simple & static
    const popular_searches = [
      { label: 'Software Engineer in New York', keywords: 'Software Engineer', location: 'New York, NY' },
      { label: 'Product Manager in San Francisco', keywords: 'Product Manager', location: 'San Francisco, CA' },
      { label: 'Data Scientist in Boston', keywords: 'Data Scientist', location: 'Boston, MA' }
    ];

    return {
      featured_jobs,
      recent_jobs,
      popular_searches,
      candidate_summary,
      employer_summary
    };
  }

  // getJobSearchFilterOptions
  getJobSearchFilterOptions() {
    return {
      work_arrangement_options: ['remote', 'hybrid', 'onsite'],
      employment_type_options: ['full_time', 'part_time', 'contract', 'temporary', 'internship', 'freelance', 'other'],
      company_rating_thresholds: [3.0, 3.5, 4.0, 4.5],
      salary_presets: [40000, 60000, 80000, 100000, 120000, 150000],
      sort_options: [
        { value: 'relevance', label: 'Relevance' },
        { value: 'date_posted_newest', label: 'Date posted: Newest first' },
        { value: 'salary_high_to_low', label: 'Salary: High to Low' },
        { value: 'salary_low_to_high', label: 'Salary: Low to High' }
      ]
    };
  }

  // searchJobs(keywords, location, filters, sort_by, page, page_size)
  searchJobs(keywords, location, filters, sort_by, page, page_size) {
    const jobs = this._getFromStorage('jobs');
    const companies = this._getFromStorage('companies');
    const saved_jobs = this._getFromStorage('saved_jobs');

    const kw = (keywords || '').trim().toLowerCase();
    const loc = (location || '').trim().toLowerCase();

    let filtered = jobs;

    if (kw) {
      filtered = filtered.filter((job) => {
        const inTitle = (job.title || '').toLowerCase().includes(kw);
        const inDesc = (job.description || '').toLowerCase().includes(kw);
        return inTitle || inDesc;
      });
    }

    if (loc) {
      filtered = filtered.filter((job) => (job.location || '').toLowerCase() === loc);
    }

    filtered = this._applyJobSearchFilters(filtered, filters || {}, companies, sort_by);

    // Instrumentation for task completion tracking (task_3: task3_searchContext)
    try {
      const kwRaw = (keywords || '').trim().toLowerCase();
      const locRaw = (location || '').trim().toLowerCase();
      const f = filters || {};
      const salaryMin = typeof f.salary_min === 'number' ? f.salary_min : null;
      const employmentTypes = Array.isArray(f.employment_types) ? f.employment_types : [];
      const workArrangements = Array.isArray(f.work_arrangements) ? f.work_arrangements : f.work_arrangements || [];

      if (
        kwRaw === 'marketing manager' &&
        locRaw === 'chicago, il' &&
        salaryMin != null &&
        salaryMin >= 80000 &&
        employmentTypes.includes('full_time')
      ) {
        const firstTwoJobIds = filtered.slice(0, 2).map((j) => j.id);
        const contextObj = {
          keywords,
          location,
          filters: {
            salary_min: f.salary_min,
            salary_max: f.salary_max,
            employment_types: employmentTypes,
            work_arrangements: workArrangements,
            company_rating_min: f.company_rating_min
          },
          sort_by: sort_by || 'relevance',
          firstTwoJobIds
        };
        localStorage.setItem('task3_searchContext', JSON.stringify(contextObj));
      }
    } catch (e) {
      console.error('Instrumentation error (task_3 searchJobs):', e);
    }

    const total_count = filtered.length;
    const currentPage = page && page > 0 ? page : 1;
    const size = page_size && page_size > 0 ? page_size : 20;
    const start = (currentPage - 1) * size;
    const end = start + size;
    const pageJobs = filtered.slice(start, end);

    const jobsWithContext = pageJobs.map((job) => {
      const company = companies.find((c) => c.id === job.company_id) || null;
      const is_saved = saved_jobs.some((s) => s.job_id === job.id);
      return {
        job,
        company,
        is_saved
      };
    });

    const applied_filters = {
      salary_min: filters && filters.salary_min != null ? filters.salary_min : undefined,
      salary_max: filters && filters.salary_max != null ? filters.salary_max : undefined,
      work_arrangements: filters && filters.work_arrangements ? filters.work_arrangements : [],
      employment_types: filters && filters.employment_types ? filters.employment_types : [],
      company_rating_min: filters && filters.company_rating_min != null ? filters.company_rating_min : undefined,
      sort_by: sort_by || 'relevance'
    };

    return {
      jobs: jobsWithContext,
      total_count,
      page: currentPage,
      page_size: size,
      applied_filters
    };
  }

  // getJobDetails(jobId)
  getJobDetails(jobId) {
    const jobs = this._getFromStorage('jobs');
    const companies = this._getFromStorage('companies');
    const saved_jobs = this._getFromStorage('saved_jobs');

    const job = jobs.find((j) => j.id === jobId) || null;
    const company = job ? companies.find((c) => c.id === job.company_id) || null : null;
    const is_saved = saved_jobs.some((s) => s.job_id === jobId);

    // Instrumentation for task completion tracking (task_3: task3_comparedJobIds)
    try {
      const ctxRaw = localStorage.getItem('task3_searchContext');
      if (ctxRaw) {
        let ctxObj = null;
        try {
          ctxObj = JSON.parse(ctxRaw);
        } catch (e) {
          ctxObj = null;
        }
        if (ctxObj && Array.isArray(ctxObj.firstTwoJobIds) && ctxObj.firstTwoJobIds.includes(jobId)) {
          const existingRaw = localStorage.getItem('task3_comparedJobIds');
          let compared = { jobIds: [] };
          if (existingRaw) {
            try {
              const parsed = JSON.parse(existingRaw);
              if (parsed && Array.isArray(parsed.jobIds)) {
                compared = parsed;
              }
            } catch (e) {
              // ignore parse error, fall back to default
            }
          }
          if (!compared.jobIds.includes(jobId)) {
            compared.jobIds.push(jobId);
            localStorage.setItem('task3_comparedJobIds', JSON.stringify(compared));
          }
        }
      }
    } catch (e) {
      console.error('Instrumentation error (task_3 getJobDetails):', e);
    }

    return {
      job,
      company,
      is_saved
    };
  }

  // saveJob(jobId)
  saveJob(jobId) {
    let saved_jobs = this._getFromStorage('saved_jobs');
    const existing = saved_jobs.find((s) => s.job_id === jobId);

    if (existing) {
      return {
        success: true,
        saved_job: existing,
        total_saved_count: saved_jobs.length,
        message: 'Job is already saved.'
      };
    }

    const newSaved = {
      id: this._generateId('savedjob'),
      job_id: jobId,
      saved_at: this._nowISO(),
      notes: ''
    };

    saved_jobs.push(newSaved);
    this._saveToStorage('saved_jobs', saved_jobs);

    // keep derived lists in sync (no-op for save right now)
    this._updateSavedJobsDerivedLists('save', jobId);

    return {
      success: true,
      saved_job: newSaved,
      total_saved_count: saved_jobs.length,
      message: 'Job saved successfully.'
    };
  }

  // unsaveJob(jobId)
  unsaveJob(jobId) {
    let saved_jobs = this._getFromStorage('saved_jobs');
    const before = saved_jobs.length;
    saved_jobs = saved_jobs.filter((s) => s.job_id !== jobId);
    this._saveToStorage('saved_jobs', saved_jobs);

    // Remove from any named lists as well
    this._updateSavedJobsDerivedLists('unsave', jobId);

    const success = saved_jobs.length !== before;
    return {
      success,
      total_saved_count: saved_jobs.length,
      message: success ? 'Job removed from saved jobs.' : 'Job was not in saved jobs.'
    };
  }

  // getSavedJobs(sort_by, sort_direction)
  getSavedJobs(sort_by, sort_direction) {
    const saved_jobs = this._getFromStorage('saved_jobs');
    const jobs = this._getFromStorage('jobs');
    const companies = this._getFromStorage('companies');
    const lists = this._getFromStorage('saved_job_lists');
    const listItems = this._getFromStorage('saved_job_list_items');

    const items = saved_jobs.map((saved_job) => {
      const job = jobs.find((j) => j.id === saved_job.job_id) || null;
      const company = job ? companies.find((c) => c.id === job.company_id) || null : null;
      const relatedListIds = listItems
        .filter((li) => li.job_id === saved_job.job_id)
        .map((li) => li.list_id);
      const relatedLists = lists.filter((l) => relatedListIds.includes(l.id));
      return { saved_job, job, company, lists: relatedLists };
    });

    const sortBy = sort_by || 'date_saved_newest';
    const dir = (sort_direction || 'desc').toLowerCase();
    const factor = dir === 'asc' ? 1 : -1;

    items.sort((a, b) => {
      if (sortBy === 'salary_low_to_high') {
        const aVal = typeof (a.job && a.job.salary_min) === 'number' ? a.job.salary_min : Number.MAX_SAFE_INTEGER;
        const bVal = typeof (b.job && b.job.salary_min) === 'number' ? b.job.salary_min : Number.MAX_SAFE_INTEGER;
        return factor * (aVal - bVal);
      }
      if (sortBy === 'date_posted_newest') {
        const da = this._parseDate(a.job && a.job.date_posted) || new Date(0);
        const db = this._parseDate(b.job && b.job.date_posted) || new Date(0);
        return factor * (db - da);
      }
      // default: date_saved_newest
      const sa = this._parseDate(a.saved_job && a.saved_job.saved_at) || new Date(0);
      const sb = this._parseDate(b.saved_job && b.saved_job.saved_at) || new Date(0);
      return factor * (sb - sa);
    });

    return {
      items,
      total_count: items.length
    };
  }

  // getSavedJobLists()
  getSavedJobLists() {
    const lists = this._getFromStorage('saved_job_lists');
    return lists;
  }

  // createSavedJobList(name, description, jobIds)
  createSavedJobList(name, description, jobIds) {
    const now = this._nowISO();
    const lists = this._getFromStorage('saved_job_lists');
    const listItems = this._getFromStorage('saved_job_list_items');

    const list = {
      id: this._generateId('savedlist'),
      name,
      description: description || '',
      created_at: now,
      updated_at: null
    };

    lists.push(list);

    const items = [];
    if (Array.isArray(jobIds)) {
      jobIds.forEach((jobId) => {
        const item = {
          id: this._generateId('savedlistitem'),
          list_id: list.id,
          job_id: jobId,
          added_at: now
        };
        listItems.push(item);
        items.push(item);
      });
    }

    this._saveToStorage('saved_job_lists', lists);
    this._saveToStorage('saved_job_list_items', listItems);

    return {
      list,
      list_items: items
    };
  }

  // addJobsToSavedJobList(listId, jobIds)
  addJobsToSavedJobList(listId, jobIds) {
    const lists = this._getFromStorage('saved_job_lists');
    let listItems = this._getFromStorage('saved_job_list_items');

    const list = lists.find((l) => l.id === listId) || null;
    if (!list) {
      return {
        list: null,
        list_items: []
      };
    }

    const now = this._nowISO();
    const existingPairs = new Set(
      listItems
        .filter((li) => li.list_id === listId)
        .map((li) => `${li.list_id}:${li.job_id}`)
    );

    (jobIds || []).forEach((jobId) => {
      const key = `${listId}:${jobId}`;
      if (existingPairs.has(key)) return;
      const item = {
        id: this._generateId('savedlistitem'),
        list_id: listId,
        job_id: jobId,
        added_at: now
      };
      listItems.push(item);
      existingPairs.add(key);
    });

    this._saveToStorage('saved_job_list_items', listItems);

    const list_items = listItems.filter((li) => li.list_id === listId);
    return {
      list,
      list_items
    };
  }

  // removeJobFromSavedJobList(listId, jobId)
  removeJobFromSavedJobList(listId, jobId) {
    let listItems = this._getFromStorage('saved_job_list_items');
    const before = listItems.length;
    listItems = listItems.filter((li) => !(li.list_id === listId && li.job_id === jobId));
    this._saveToStorage('saved_job_list_items', listItems);

    return {
      success: listItems.length !== before
    };
  }

  // candidateSignup(full_name, email, password)
  candidateSignup(full_name, email, password) {
    let profiles = this._getFromStorage('candidate_profiles');

    // Mark existing profiles as not current
    profiles = profiles.map((p) => ({ ...p, is_current_user: false }));

    const now = this._nowISO();
    const profile = {
      id: this._generateId('cand'),
      full_name,
      email,
      headline_title: '',
      current_role: '',
      years_experience: 0,
      location: '',
      desired_locations: [],
      target_salary_min: null,
      target_salary_max: null,
      skills: [],
      rating: null,
      summary: '',
      password, // stored here for simplicity
      is_current_user: true,
      created_at: now,
      updated_at: now
    };

    profiles.push(profile);
    this._saveToStorage('candidate_profiles', profiles);

    return {
      success: true,
      profile,
      message: 'Candidate account created.'
    };
  }

  // getCandidateProfile()
  getCandidateProfile() {
    return this._getOrCreateCurrentCandidateProfile();
  }

  // updateCandidateProfile(profileUpdates)
  updateCandidateProfile(profileUpdates) {
    if (!profileUpdates || typeof profileUpdates !== 'object') {
      return {
        profile: null,
        success: false,
        message: 'Invalid profile updates.'
      };
    }

    let profiles = this._getFromStorage('candidate_profiles');
    const current = profiles.find((p) => p.is_current_user === true);
    if (!current) {
      return {
        profile: null,
        success: false,
        message: 'Current candidate profile not found.'
      };
    }

    const updated = { ...current };
    Object.keys(profileUpdates).forEach((key) => {
      const value = profileUpdates[key];
      if (typeof value !== 'undefined') {
        updated[key] = value;
      }
    });
    updated.updated_at = this._nowISO();

    profiles = profiles.map((p) => (p.id === current.id ? updated : p));
    this._saveToStorage('candidate_profiles', profiles);

    return {
      profile: updated,
      success: true,
      message: 'Profile updated.'
    };
  }

  // getCandidateDashboardOverview()
  getCandidateDashboardOverview() {
    const profile = this._getOrCreateCurrentCandidateProfile();
    const saved_jobs = this._getFromStorage('saved_jobs');
    const job_alerts = this._getFromStorage('job_alerts');
    const job_applications = this._getFromStorage('job_applications');
    const jobs = this._getFromStorage('jobs');
    const companies = this._getFromStorage('companies');

    const recent_applications = job_applications
      .slice()
      .sort((a, b) => {
        const da = this._parseDate(a.submitted_at) || new Date(0);
        const db = this._parseDate(b.submitted_at) || new Date(0);
        return db - da;
      })
      .map((application) => {
        const job = jobs.find((j) => j.id === application.job_id) || null;
        const company = job ? companies.find((c) => c.id === job.company_id) || null : null;
        return { application, job, company };
      });

    // Simple recommendation: active jobs in desired locations and above target salary
    const desiredLocations = Array.isArray(profile.desired_locations) ? profile.desired_locations : [];
    const targetMin = typeof profile.target_salary_min === 'number' ? profile.target_salary_min : null;
    const now = new Date();

    const recommended_jobs = jobs
      .filter((job) => {
        if (job.job_status && job.job_status !== 'active') return false;
        if (job.posting_expiry_date) {
          const exp = this._parseDate(job.posting_expiry_date);
          if (exp && exp < now) return false;
        }
        if (desiredLocations.length > 0 && !desiredLocations.includes(job.location)) return false;
        if (targetMin != null && typeof job.salary_min === 'number' && job.salary_min < targetMin) return false;
        return true;
      })
      .slice(0, 10)
      .map((job) => {
        const company = companies.find((c) => c.id === job.company_id) || null;
        return { ...job, company };
      });

    return {
      profile,
      saved_jobs_count: saved_jobs.length,
      active_alerts_count: job_alerts.filter((a) => a.is_active !== false).length,
      recent_applications,
      recommended_jobs
    };
  }

  // getJobAlerts()
  getJobAlerts() {
    const alerts = this._getFromStorage('job_alerts');
    return alerts;
  }

  // createJobAlert(job_title_keywords, location, salary_min, salary_max, frequency, name)
  createJobAlert(job_title_keywords, location, salary_min, salary_max, frequency, name) {
    const alerts = this._getFromStorage('job_alerts');
    const now = this._nowISO();

    const alert = {
      id: this._generateId('alert'),
      name: name || `${job_title_keywords || ''}${location ? ' - ' + location : ''}`.trim(),
      job_title_keywords,
      location: location || '',
      salary_min: typeof salary_min === 'number' ? salary_min : null,
      salary_max: typeof salary_max === 'number' ? salary_max : null,
      frequency,
      is_active: true,
      created_at: now,
      last_run_at: null
    };

    alerts.push(alert);
    this._saveToStorage('job_alerts', alerts);
    return alert;
  }

  // updateJobAlert(alertId, updates)
  updateJobAlert(alertId, updates) {
    if (!updates || typeof updates !== 'object') return null;
    let alerts = this._getFromStorage('job_alerts');
    const idx = alerts.findIndex((a) => a.id === alertId);
    if (idx === -1) return null;

    const updated = { ...alerts[idx] };
    Object.keys(updates).forEach((key) => {
      const value = updates[key];
      if (typeof value !== 'undefined') {
        updated[key] = value;
      }
    });

    alerts[idx] = updated;
    this._saveToStorage('job_alerts', alerts);
    return updated;
  }

  // toggleJobAlertActive(alertId, is_active)
  toggleJobAlertActive(alertId, is_active) {
    let alerts = this._getFromStorage('job_alerts');
    const idx = alerts.findIndex((a) => a.id === alertId);
    if (idx === -1) return null;
    alerts[idx] = { ...alerts[idx], is_active: !!is_active };
    this._saveToStorage('job_alerts', alerts);
    return alerts[idx];
  }

  // deleteJobAlert(alertId)
  deleteJobAlert(alertId) {
    let alerts = this._getFromStorage('job_alerts');
    const before = alerts.length;
    alerts = alerts.filter((a) => a.id !== alertId);
    this._saveToStorage('job_alerts', alerts);
    return { success: alerts.length !== before };
  }

  // submitJobApplication(jobId, applicant_name, applicant_email, applicant_phone, cover_letter)
  submitJobApplication(jobId, applicant_name, applicant_email, applicant_phone, cover_letter) {
    const applications = this._getFromStorage('job_applications');
    const jobs = this._getFromStorage('jobs');

    const job = jobs.find((j) => j.id === jobId) || null;
    if (!job) {
      return {
        application: null,
        success: false,
        message: 'Job not found.'
      };
    }

    const candidate = this._getOrCreateCurrentCandidateProfile();

    const application = {
      id: this._generateId('app'),
      job_id: jobId,
      candidate_profile_id: candidate.id,
      applicant_name,
      applicant_email,
      applicant_phone,
      cover_letter,
      submitted_at: this._nowISO(),
      status: 'submitted'
    };

    applications.push(application);
    this._saveToStorage('job_applications', applications);

    // Increment job applications_count if present
    const jobIdx = jobs.findIndex((j) => j.id === jobId);
    if (jobIdx !== -1) {
      const updatedJob = { ...jobs[jobIdx] };
      updatedJob.applications_count = (updatedJob.applications_count || 0) + 1;
      jobs[jobIdx] = updatedJob;
      this._saveToStorage('jobs', jobs);
    }

    return {
      application,
      success: true,
      message: 'Application submitted successfully.'
    };
  }

  // getJobApplicationsHistory()
  getJobApplicationsHistory() {
    const applications = this._getFromStorage('job_applications');
    const jobs = this._getFromStorage('jobs');
    const companies = this._getFromStorage('companies');

    return applications.map((application) => {
      const job = jobs.find((j) => j.id === application.job_id) || null;
      const company = job ? companies.find((c) => c.id === job.company_id) || null : null;
      return { application, job, company };
    });
  }

  // employerLogin(email, password)
  employerLogin(email, password) {
    const nameFromEmail = (email || '').split('@')[0] || 'Employer';
    const session = {
      email,
      employer_name: nameFromEmail,
      isLoggedIn: true,
      logged_in_at: this._nowISO()
    };
    this._setEmployerSession(session);

    return {
      success: true,
      employer_name: session.employer_name,
      message: 'Employer logged in.'
    };
  }

  // getEmployerDashboardOverview()
  getEmployerDashboardOverview() {
    const jobs = this._getFromStorage('jobs');
    const companies = this._getFromStorage('companies');
    const applications = this._getFromStorage('job_applications');
    const shortlists = this._getFromStorage('shortlists');

    const active_jobs = jobs
      .filter((j) => j.is_owned_by_current_employer === true && j.job_status === 'active')
      .map((job) => {
        const company = companies.find((c) => c.id === job.company_id) || null;
        return { ...job, company };
      });

    const activeJobIds = new Set(active_jobs.map((j) => j.id));
    const total_applications_count = applications.filter((a) => activeJobIds.has(a.job_id)).length;

    const metrics = {
      active_jobs_count: active_jobs.length,
      total_applications_count,
      shortlists_count: shortlists.length
    };

    const recent_shortlists = shortlists
      .slice()
      .sort((a, b) => {
        const da = this._parseDate(a.created_at) || new Date(0);
        const db = this._parseDate(b.created_at) || new Date(0);
        return db - da;
      })
      .slice(0, 5);

    return {
      active_jobs,
      metrics,
      recent_shortlists
    };
  }

  // getEmployerJobs(status)
  getEmployerJobs(status) {
    const jobs = this._getFromStorage('jobs');
    const companies = this._getFromStorage('companies');
    const filtered = jobs.filter((j) => {
      if (j.is_owned_by_current_employer !== true) return false;
      if (status && j.job_status !== status) return false;
      return true;
    });

    return filtered.map((job) => {
      const company = companies.find((c) => c.id === job.company_id) || null;
      return { ...job, company };
    });
  }

  // getPostJobFormOptions()
  getPostJobFormOptions() {
    return {
      employment_type_options: ['full_time', 'part_time', 'contract', 'temporary', 'internship', 'freelance', 'other'],
      work_arrangement_options: ['remote', 'hybrid', 'onsite'],
      posting_duration_options: [7, 14, 30, 60]
    };
  }

  // postJob(title, companyId, location, work_arrangement, employment_type, salary_min, salary_max, currency, description, required_skills, posting_duration_days)
  postJob(title, companyId, location, work_arrangement, employment_type, salary_min, salary_max, currency, description, required_skills, posting_duration_days) {
    const jobs = this._getFromStorage('jobs');
    let companies = this._getFromStorage('companies');
    const session = this._getOrCreateEmployerSession();

    let resolvedCompanyId = companyId || null;

    if (!resolvedCompanyId) {
      // Derive company from employer session name if possible
      const employerName = session && session.employer_name ? session.employer_name : 'Employer Company';
      let company = companies.find((c) => c.name === employerName);
      if (!company) {
        company = {
          id: this._generateId('comp'),
          name: employerName,
          rating: 0,
          review_count: 0,
          location_headquarters: '',
          industry: '',
          website_url: '',
          logo_url: '',
          description: ''
        };
        companies.push(company);
        this._saveToStorage('companies', companies);
      }
      resolvedCompanyId = company.id;
    }

    const now = this._nowISO();
    const job = {
      id: this._generateId('job'),
      title,
      company_id: resolvedCompanyId,
      location,
      work_arrangement,
      employment_type,
      salary_min,
      salary_max: typeof salary_max === 'number' ? salary_max : null,
      currency: currency || 'USD',
      date_posted: now,
      description,
      required_skills: Array.isArray(required_skills) ? required_skills : [],
      posting_duration_days: posting_duration_days || null,
      posting_expiry_date: this._calculatePostingExpiryDate(now, posting_duration_days),
      job_status: 'active',
      is_owned_by_current_employer: true,
      applications_count: 0
    };

    jobs.push(job);
    this._saveToStorage('jobs', jobs);

    return job;
  }

  // updateJobPosting(jobId, updates)
  updateJobPosting(jobId, updates) {
    if (!updates || typeof updates !== 'object') return null;
    let jobs = this._getFromStorage('jobs');
    const idx = jobs.findIndex((j) => j.id === jobId);
    if (idx === -1) return null;

    const job = { ...jobs[idx] };
    const beforeDuration = job.posting_duration_days;

    Object.keys(updates).forEach((key) => {
      const value = updates[key];
      if (typeof value !== 'undefined') {
        job[key] = value;
      }
    });

    // Recalculate expiry if duration changed
    if (typeof updates.posting_duration_days === 'number' || updates.posting_duration_days === null) {
      job.posting_expiry_date = this._calculatePostingExpiryDate(job.date_posted, job.posting_duration_days);
    } else if (beforeDuration && !job.posting_expiry_date && job.posting_duration_days) {
      job.posting_expiry_date = this._calculatePostingExpiryDate(job.date_posted, job.posting_duration_days);
    }

    jobs[idx] = job;
    this._saveToStorage('jobs', jobs);
    return job;
  }

  // getCandidateSearchFilterOptions()
  getCandidateSearchFilterOptions() {
    const profiles = this._getFromStorage('candidate_profiles');
    const skillSet = new Set();
    const locationSet = new Set();

    profiles.forEach((p) => {
      if (Array.isArray(p.skills)) {
        p.skills.forEach((s) => {
          if (s) skillSet.add(s);
        });
      }
      if (p.location) locationSet.add(p.location);
    });

    const skill_suggestions = Array.from(skillSet).sort();
    const location_suggestions = Array.from(locationSet).sort();

    const sort_options = [
      { value: 'rating_high_to_low', label: 'Rating: High to Low' },
      { value: 'best_match', label: 'Best match' },
      { value: 'experience_high_to_low', label: 'Experience: High to Low' }
    ];

    return {
      skill_suggestions,
      location_suggestions,
      sort_options
    };
  }

  // searchCandidates(keywords, filters, sort_by, page, page_size)
  searchCandidates(keywords, filters, sort_by, page, page_size) {
    const profiles = this._getFromStorage('candidate_profiles');

    const kw = (keywords || '').trim().toLowerCase();
    const f = filters || {};
    const locFilter = (f.location || '').trim().toLowerCase();
    const minExp = typeof f.min_years_experience === 'number' ? f.min_years_experience : null;
    const skillsFilter = Array.isArray(f.skills) ? f.skills.map((s) => (s || '').toLowerCase()) : [];
    const ratingMin = typeof f.rating_min === 'number' ? f.rating_min : null;

    let result = profiles.filter((p) => p.is_current_user === false || p.is_current_user === undefined);

    if (kw) {
      result = result.filter((p) => {
        const fields = [p.full_name, p.headline_title, p.current_role].filter(Boolean);
        const skills = Array.isArray(p.skills) ? p.skills : [];
        const all = fields.concat(skills);
        return all.some((v) => (v || '').toLowerCase().includes(kw));
      });
    }

    if (locFilter) {
      result = result.filter((p) => (p.location || '').toLowerCase() === locFilter);
    }

    if (minExp != null) {
      result = result.filter((p) => (typeof p.years_experience === 'number' ? p.years_experience : 0) >= minExp);
    }

    if (skillsFilter.length > 0) {
      result = result.filter((p) => {
        const skillSet = new Set((p.skills || []).map((s) => (s || '').toLowerCase()));
        return skillsFilter.every((s) => skillSet.has(s));
      });
    }

    if (ratingMin != null) {
      result = result.filter((p) => (typeof p.rating === 'number' ? p.rating : 0) >= ratingMin);
    }

    const sortBy = sort_by || 'rating_high_to_low';
    if (sortBy === 'experience_high_to_low') {
      result.sort((a, b) => {
        const ae = typeof a.years_experience === 'number' ? a.years_experience : 0;
        const be = typeof b.years_experience === 'number' ? b.years_experience : 0;
        return be - ae;
      });
    } else {
      // 'rating_high_to_low' or 'best_match' => use rating desc then experience
      result.sort((a, b) => {
        const ar = typeof a.rating === 'number' ? a.rating : 0;
        const br = typeof b.rating === 'number' ? b.rating : 0;
        if (br !== ar) return br - ar;
        const ae = typeof a.years_experience === 'number' ? a.years_experience : 0;
        const be = typeof b.years_experience === 'number' ? b.years_experience : 0;
        return be - ae;
      });
    }

    const total_count = result.length;
    const currentPage = page && page > 0 ? page : 1;
    const size = page_size && page_size > 0 ? page_size : 20;
    const start = (currentPage - 1) * size;
    const end = start + size;
    const paged = result.slice(start, end);

    return {
      candidates: paged,
      total_count,
      page: currentPage,
      page_size: size
    };
  }

  // createShortlist(name, description, candidateIds)
  createShortlist(name, description, candidateIds) {
    const shortlists = this._getFromStorage('shortlists');
    const profiles = this._getFromStorage('candidate_profiles');
    const now = this._nowISO();

    let candidate_ids = Array.isArray(candidateIds) ? candidateIds.slice() : [];
    const validIds = new Set(profiles.map((p) => p.id));
    candidate_ids = candidate_ids.filter((id, idx) => validIds.has(id) && candidate_ids.indexOf(id) === idx);

    const shortlist = {
      id: this._generateId('sl'),
      name,
      description: description || '',
      candidate_ids,
      status: 'active',
      created_at: now,
      updated_at: now
    };

    shortlists.push(shortlist);
    this._saveToStorage('shortlists', shortlists);
    return shortlist;
  }

  // addCandidatesToShortlist(shortlistId, candidateIds)
  addCandidatesToShortlist(shortlistId, candidateIds) {
    let shortlists = this._getFromStorage('shortlists');
    const profiles = this._getFromStorage('candidate_profiles');

    const idx = shortlists.findIndex((s) => s.id === shortlistId);
    if (idx === -1) return null;

    const shortlist = { ...shortlists[idx] };
    if (!Array.isArray(shortlist.candidate_ids)) shortlist.candidate_ids = [];

    const validIds = new Set(profiles.map((p) => p.id));
    (candidateIds || []).forEach((id) => {
      if (validIds.has(id) && !shortlist.candidate_ids.includes(id)) {
        shortlist.candidate_ids.push(id);
      }
    });

    this._recomputeShortlistCandidateIds(shortlist, profiles);

    shortlists[idx] = shortlist;
    this._saveToStorage('shortlists', shortlists);
    return shortlist;
  }

  // getShortlists()
  getShortlists() {
    const shortlists = this._getFromStorage('shortlists');
    return shortlists.map((shortlist) => ({
      shortlist,
      candidate_count: Array.isArray(shortlist.candidate_ids) ? shortlist.candidate_ids.length : 0
    }));
  }

  // renameShortlist(shortlistId, name)
  renameShortlist(shortlistId, name) {
    let shortlists = this._getFromStorage('shortlists');
    const idx = shortlists.findIndex((s) => s.id === shortlistId);
    if (idx === -1) return null;

    const updated = { ...shortlists[idx], name, updated_at: this._nowISO() };
    shortlists[idx] = updated;
    this._saveToStorage('shortlists', shortlists);
    return updated;
  }

  // deleteShortlist(shortlistId)
  deleteShortlist(shortlistId) {
    let shortlists = this._getFromStorage('shortlists');
    const before = shortlists.length;
    shortlists = shortlists.filter((s) => s.id !== shortlistId);
    this._saveToStorage('shortlists', shortlists);
    // Note: interview slots referencing this shortlist are kept; they still reference candidate & job.
    return { success: shortlists.length !== before };
  }

  // getShortlistDetails(shortlistId)
  getShortlistDetails(shortlistId) {
    const shortlists = this._getFromStorage('shortlists');
    const profiles = this._getFromStorage('candidate_profiles');
    const interview_slots = this._getFromStorage('interview_slots');

    const shortlist = shortlists.find((s) => s.id === shortlistId) || null;
    if (!shortlist) {
      return {
        shortlist: null,
        candidate_entries: []
      };
    }

    const candidate_entries = (shortlist.candidate_ids || []).map((cid) => {
      const candidate = profiles.find((c) => c.id === cid) || null;
      const slots = interview_slots
        .filter((slot) => slot.candidate_id === cid && slot.shortlist_id === shortlistId)
        .map((slot) => this._expandInterviewSlot(slot));
      return { candidate, interview_slots: slots };
    });

    return {
      shortlist,
      candidate_entries
    };
  }

  // getCandidateProfileForEmployer(candidateId)
  getCandidateProfileForEmployer(candidateId) {
    const profiles = this._getFromStorage('candidate_profiles');
    const shortlists = this._getFromStorage('shortlists');
    const interview_slots = this._getFromStorage('interview_slots');

    const candidate = profiles.find((c) => c.id === candidateId) || null;
    if (!candidate) {
      return {
        candidate: null,
        shortlists: [],
        interview_slots: []
      };
    }

    const candidate_shortlists = shortlists.filter((s) => Array.isArray(s.candidate_ids) && s.candidate_ids.includes(candidateId));
    const slots = interview_slots
      .filter((slot) => slot.candidate_id === candidateId)
      .map((slot) => this._expandInterviewSlot(slot));

    return {
      candidate,
      shortlists: candidate_shortlists,
      interview_slots: slots
    };
  }

  // scheduleInterviewsForCandidate(candidateId, shortlistId, jobId, slots)
  scheduleInterviewsForCandidate(candidateId, shortlistId, jobId, slots) {
    const profiles = this._getFromStorage('candidate_profiles');
    const candidate = profiles.find((c) => c.id === candidateId) || null;
    if (!candidate) {
      return {
        created_slots: [],
        all_slots_for_candidate: [],
        success: false
      };
    }

    let interview_slots = this._getFromStorage('interview_slots');
    const validSlots = this._validateInterviewSlots(candidateId, shortlistId, jobId, slots || []);
    const now = this._nowISO();

    const created_raw = validSlots.map((slot) => {
      const newSlot = {
        id: this._generateId('intslot'),
        candidate_id: candidateId,
        shortlist_id: shortlistId || null,
        job_id: jobId || null,
        start_datetime: slot.start_datetime,
        end_datetime: slot.end_datetime || null,
        location: slot.location || '',
        status: 'scheduled',
        created_at: now,
        notes: ''
      };
      interview_slots.push(newSlot);
      return newSlot;
    });

    this._saveToStorage('interview_slots', interview_slots);

    const created_slots = created_raw.map((s) => this._expandInterviewSlot(s));
    const all_slots_for_candidate = interview_slots
      .filter((s) => s.candidate_id === candidateId)
      .map((s) => this._expandInterviewSlot(s));

    return {
      created_slots,
      all_slots_for_candidate,
      success: created_slots.length > 0
    };
  }

  // getCandidateInterviewSlots(candidateId)
  getCandidateInterviewSlots(candidateId) {
    const interview_slots = this._getFromStorage('interview_slots');
    const filtered = interview_slots.filter((s) => s.candidate_id === candidateId);
    return filtered.map((s) => this._expandInterviewSlot(s));
  }

  // getAboutContent()
  getAboutContent() {
    return {
      headline: 'Connecting top talent with leading employers.',
      mission: 'Our mission is to make hiring and job searching transparent, efficient, and human-centric for both candidates and employers.',
      values: [
        'Candidate-first experience',
        'Data-driven matching',
        'Inclusive opportunities',
        'Long-term partnerships'
      ],
      candidate_services: 'We provide curated job opportunities, profile tools, and job alerts so candidates can discover roles that match their skills, salary expectations, and preferred locations.',
      employer_services: 'We help employers reach qualified candidates through targeted job postings, curated shortlists, and built-in interview scheduling.',
      differentiators: [
        'End-to-end workflow covering search, applications, shortlists, and interviews',
        'Structured data model enabling precise filtering by salary, skills, and location',
        'Unified experience for both candidates and employers'
      ]
    };
  }

  // getContactInfo()
  getContactInfo() {
    return {
      support_email: 'support@examplejobs.com',
      sales_email: 'sales@examplejobs.com',
      phone_numbers: ['+1 (800) 555-0100'],
      office_locations: [
        {
          label: 'Headquarters',
          address: '123 Market Street, Suite 500, San Francisco, CA 94103'
        }
      ]
    };
  }

  // submitContactForm(name, email, subject, message)
  submitContactForm(name, email, subject, message) {
    const tickets = this._getFromStorage('contact_tickets');
    const ticket = {
      id: this._generateId('ticket'),
      name,
      email,
      subject,
      message,
      created_at: this._nowISO()
    };
    tickets.push(ticket);
    this._saveToStorage('contact_tickets', tickets);

    return {
      success: true,
      ticket_id: ticket.id,
      message: 'Your inquiry has been received. We will get back to you shortly.'
    };
  }

  // getHelpFaqContent()
  getHelpFaqContent() {
    return [
      {
        section: 'Candidates',
        audience: 'candidate',
        faqs: [
          {
            question: 'How do I create a candidate profile?',
            answer: 'Use the sign-up form to create an account, then complete your profile with your current role, experience, skills, and target salary.'
          },
          {
            question: 'How can I save jobs for later?',
            answer: 'On any job listing, click the Save or heart icon. You can manage your saved jobs from the Saved Jobs section in your dashboard.'
          },
          {
            question: 'How do job alerts work?',
            answer: 'Create a job alert with your preferred title, location, salary range, and frequency. We will periodically evaluate new jobs and notify you when matches are found.'
          }
        ]
      },
      {
        section: 'Employers',
        audience: 'employer',
        faqs: [
          {
            question: 'How do I post a job?',
            answer: 'Log in as an employer, navigate to your dashboard, and click "Post a job". Fill in the job details including salary range, location, and required skills, then publish.'
          },
          {
            question: 'What is a shortlist?',
            answer: 'A shortlist is a collection of candidate profiles that you want to track for a specific role or hiring campaign. You can create multiple shortlists and schedule interviews directly from them.'
          },
          {
            question: 'Can I schedule interviews from the platform?',
            answer: 'Yes. From a candidate profile or shortlist, use the scheduling tool to create interview time slots and keep track of upcoming sessions.'
          }
        ]
      },
      {
        section: 'General',
        audience: 'both',
        faqs: [
          {
            question: 'Is my data stored securely?',
            answer: 'We store only the structured data required to power the job and candidate workflows, and we design our logic to be portable and secure across environments.'
          }
        ]
      }
    ];
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