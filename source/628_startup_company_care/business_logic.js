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

  _initStorage() {
    const ensureArray = (key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    };

    // Core data tables
    ensureArray('jobs'); // Job
    ensureArray('saved_jobs'); // SavedJob
    ensureArray('job_comparison_lists'); // JobComparisonList
    ensureArray('job_comparison_items'); // JobComparisonItem
    ensureArray('job_alerts'); // JobAlert
    ensureArray('job_applications'); // JobApplication
    ensureArray('talent_pool_submissions'); // TalentPoolSubmission
    ensureArray('careers_contact_messages'); // CareersContactMessage
    ensureArray('events'); // Event
    ensureArray('event_registrations'); // EventRegistration
    ensureArray('interview_process_sections'); // InterviewProcessSection
    ensureArray('content_pages'); // Generic CMS content pages: {slug, ...}

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

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

  // ----------------------
  // Helper functions
  // ----------------------

  _getOrCreateSavedJobsStore() {
    // Single user, just ensure the key exists and return the array
    let savedJobs = this._getFromStorage('saved_jobs');
    if (!Array.isArray(savedJobs)) {
      savedJobs = [];
      this._saveToStorage('saved_jobs', savedJobs);
    }
    return savedJobs;
  }

  _getOrCreateDefaultComparisonList() {
    let lists = this._getFromStorage('job_comparison_lists');
    let list = lists.find((l) => l.id === 'default');
    const now = new Date().toISOString();
    if (!list) {
      list = {
        id: 'default',
        name: 'Default Comparison List',
        createdAt: now,
        updatedAt: now
      };
      lists.push(list);
      this._saveToStorage('job_comparison_lists', lists);
    }
    return list;
  }

  _persistJobApplicationState(application) {
    let applications = this._getFromStorage('job_applications');
    const existingIndex = applications.findIndex((a) => a.id === application.id);
    if (existingIndex >= 0) {
      applications[existingIndex] = application;
    } else {
      applications.push(application);
    }
    this._saveToStorage('job_applications', applications);
    return application;
  }

  _getContentPageFromCMS(slug) {
    // Stored as array of { slug: string, ...contentFields }
    const pages = this._getFromStorage('content_pages');
    return pages.find((p) => p.slug === slug) || null;
  }

  _parseISODate(str) {
    if (!str) return null;
    const d = new Date(str);
    return isNaN(d.getTime()) ? null : d;
  }

  _filterJobsByDatePosted(jobs, datePostedOption) {
    if (!datePostedOption || datePostedOption === 'anytime') return jobs;
    const now = new Date();
    let days = null;
    switch (datePostedOption) {
      case 'last_24_hours':
        days = 1;
        break;
      case 'last_7_days':
        days = 7;
        break;
      case 'last_14_days':
        days = 14;
        break;
      case 'last_30_days':
        days = 30;
        break;
      default:
        return jobs;
    }
    const threshold = now.getTime() - days * 24 * 60 * 60 * 1000;
    return jobs.filter((job) => {
      const d = this._parseISODate(job.date_posted);
      if (!d) return false;
      return d.getTime() >= threshold;
    });
  }

  _sortJobs(jobs, sortBy) {
    const arr = jobs.slice();
    const dateDesc = (a, b) => {
      const da = this._parseISODate(a.date_posted);
      const db = this._parseISODate(b.date_posted);
      const ta = da ? da.getTime() : 0;
      const tb = db ? db.getTime() : 0;
      return tb - ta;
    };

    if (!sortBy || sortBy === 'relevance' || sortBy === 'date_posted_desc') {
      return arr.sort(dateDesc);
    }

    if (sortBy === 'salary_high_to_low' || sortBy === 'salary_low_to_high') {
      arr.sort((a, b) => {
        const aMax = (typeof a.salary_max === 'number' ? a.salary_max : (typeof a.salary_min === 'number' ? a.salary_min : -Infinity));
        const bMax = (typeof b.salary_max === 'number' ? b.salary_max : (typeof b.salary_min === 'number' ? b.salary_min : -Infinity));
        if (sortBy === 'salary_high_to_low') {
          return bMax - aMax;
        }
        return aMax - bMax;
      });
      return arr;
    }

    // Fallback
    return arr.sort(dateDesc);
  }

  // ----------------------
  // Core interface implementations
  // ----------------------

  // getHomePageData(): mission text + featured jobs/events
  getHomePageData() {
    const cms = this._getContentPageFromCMS('home') || {};
    const jobs = this._getFromStorage('jobs');
    const events = this._getFromStorage('events');

    const featured_jobs = jobs
      .filter((j) => j.status === 'open' && j.is_featured === true)
      .slice(0, 6);

    const featured_events = events
      .filter((e) => e.is_featured === true)
      .slice(0, 6);

    return {
      mission_heading: cms.mission_heading || '',
      mission_body: cms.mission_body || '',
      culture_summary: cms.culture_summary || '',
      featured_jobs,
      featured_events
    };
  }

  // getJobFilterOptions(): returns enums and derived options
  getJobFilterOptions() {
    const jobs = this._getFromStorage('jobs');

    // Enumerations based on data model
    const departmentValues = [
      'engineering',
      'marketing',
      'operations',
      'design',
      'product',
      'other'
    ];
    const jobTypeValues = [
      'full_time',
      'part_time',
      'contract',
      'internship',
      'temporary'
    ];
    const seniorityValues = [
      'intern',
      'entry_level',
      'junior',
      'mid_level',
      'senior',
      'lead',
      'manager',
      'director'
    ];
    const salaryCurrencyValues = ['usd', 'eur', 'gbp', 'other'];

    const departments = departmentValues.map((v) => ({ value: v, label: v.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) }));
    const job_types = jobTypeValues.map((v) => ({ value: v, label: v.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) }));
    const seniority_levels = seniorityValues.map((v) => ({ value: v, label: v.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) }));

    // Locations derived from jobs
    const locationMap = new Map();
    jobs.forEach((job) => {
      if (job.location_display) {
        const key = job.location_display;
        if (!locationMap.has(key)) {
          locationMap.set(key, {
            display_text: job.location_display,
            city: job.location_city || '',
            state: job.location_state || '',
            country: job.location_country || '',
            is_remote_option: job.remote_type === 'remote' || job.is_remote_only === true
          });
        }
      }
    });

    // Ensure a generic Remote option exists if any remote jobs
    const hasRemoteJob = jobs.some((j) => j.remote_type === 'remote' || j.is_remote_only === true);
    if (hasRemoteJob && !locationMap.has('Remote')) {
      locationMap.set('Remote', {
        display_text: 'Remote',
        city: '',
        state: '',
        country: '',
        is_remote_option: true
      });
    }

    const locations = Array.from(locationMap.values());

    const salary_currencies = salaryCurrencyValues.map((v) => ({
      value: v,
      label: v.toUpperCase()
    }));

    const date_posted_options = [
      { value: 'last_24_hours', label: 'Last 24 hours' },
      { value: 'last_7_days', label: 'Last 7 days' },
      { value: 'last_14_days', label: 'Last 14 days' },
      { value: 'last_30_days', label: 'Last 30 days' },
      { value: 'anytime', label: 'Anytime' }
    ];

    const sort_options = [
      { value: 'relevance', label: 'Relevance' },
      { value: 'date_posted_desc', label: 'Date posted (newest)' },
      { value: 'salary_high_to_low', label: 'Salary – High to Low' },
      { value: 'salary_low_to_high', label: 'Salary – Low to High' }
    ];

    const search_tabs = [
      { value: 'all_roles', label: 'All roles' },
      { value: 'internships', label: 'Internships' }
    ];

    const internshipSeasonValues = ['spring', 'summer', 'fall', 'winter'];
    const internship_seasons = internshipSeasonValues.map((v) => ({
      value: v,
      label: v.replace(/\b\w/g, (c) => c.toUpperCase())
    }));

    // Internship years derived from data
    const yearSet = new Set();
    jobs.forEach((job) => {
      if (typeof job.internship_year === 'number') yearSet.add(job.internship_year);
    });
    const internship_years = Array.from(yearSet).sort((a, b) => a - b);

    return {
      departments,
      job_types,
      seniority_levels,
      locations,
      salary_currencies,
      date_posted_options,
      sort_options,
      search_tabs,
      internship_seasons,
      internship_years
    };
  }

  // searchJobs(...): filtering, internships, salary, sorting, pagination
  searchJobs(
    keyword,
    location_text,
    remote_only,
    department,
    job_type,
    seniority_level,
    salary_min,
    salary_max,
    salary_currency,
    date_posted,
    search_tab,
    internship_season,
    internship_year,
    internship_duration_weeks_min,
    sort_by,
    page = 1,
    page_size = 20
  ) {
    let jobs = this._getFromStorage('jobs');

    // Only open jobs by default
    jobs = jobs.filter((j) => j.status === 'open');

    // Tab filter: internships vs all_roles
    if (search_tab === 'internships') {
      jobs = jobs.filter((j) => j.job_type === 'internship' || j.is_internship_program === true);
    }

    // Keyword filter (case-insensitive on title, description, tags, department)
    if (keyword && keyword.trim()) {
      const kw = keyword.trim().toLowerCase();
      jobs = jobs.filter((j) => {
        const inTitle = (j.title || '').toLowerCase().includes(kw);
        const inDesc = (j.description || '').toLowerCase().includes(kw);
        const inTags = Array.isArray(j.tags) && j.tags.some((t) => String(t).toLowerCase().includes(kw));
        const inDept = (j.department || '').toLowerCase().includes(kw);
        return inTitle || inDesc || inTags || inDept;
      });
    }

    // Location and remote filters
    if (remote_only) {
      jobs = jobs.filter((j) => j.is_remote_only === true || j.remote_type === 'remote');
    }

    if (location_text && location_text.trim()) {
      const lt = location_text.trim().toLowerCase();
      if (lt === 'remote' || lt === 'remote only') {
        jobs = jobs.filter((j) => j.is_remote_only === true || j.remote_type === 'remote');
      } else {
        jobs = jobs.filter((j) => {
          const ld = (j.location_display || '').toLowerCase();
          const city = (j.location_city || '').toLowerCase();
          const state = (j.location_state || '').toLowerCase();
          const country = (j.location_country || '').toLowerCase();
          return (
            ld === lt ||
            ld.includes(lt) ||
            (city && lt.includes(city)) ||
            (country && lt.includes(country))
          );
        });
      }
    }

    if (department) {
      jobs = jobs.filter((j) => j.department === department);
    }

    if (job_type) {
      jobs = jobs.filter((j) => j.job_type === job_type);
    }

    if (seniority_level) {
      jobs = jobs.filter((j) => j.seniority_level === seniority_level);
    }

    // Salary filters
    if (salary_currency) {
      jobs = jobs.filter((j) => !j.salary_currency || j.salary_currency === salary_currency);
    }

    if (typeof salary_min === 'number') {
      jobs = jobs.filter((j) => {
        const min = typeof j.salary_min === 'number' ? j.salary_min : null;
        const max = typeof j.salary_max === 'number' ? j.salary_max : null;
        if (min != null) return min >= salary_min;
        if (max != null) return max >= salary_min;
        return false;
      });
    }

    if (typeof salary_max === 'number') {
      jobs = jobs.filter((j) => {
        const min = typeof j.salary_min === 'number' ? j.salary_min : null;
        const max = typeof j.salary_max === 'number' ? j.salary_max : null;
        if (max != null) return max <= salary_max;
        if (min != null) return min <= salary_max;
        return false;
      });
    }

    // Date posted filter
    jobs = this._filterJobsByDatePosted(jobs, date_posted);

    // Internship-specific filters
    if (internship_season) {
      jobs = jobs.filter((j) => j.internship_season === internship_season);
    }

    if (typeof internship_year === 'number') {
      jobs = jobs.filter((j) => j.internship_year === internship_year);
    }

    if (typeof internship_duration_weeks_min === 'number') {
      jobs = jobs.filter((j) => {
        if (typeof j.internship_duration_weeks === 'number') {
          return j.internship_duration_weeks >= internship_duration_weeks_min;
        }
        return false;
      });
    }

    // Sorting
    const sorted = this._sortJobs(jobs, sort_by);

    // Pagination
    const total_count = sorted.length;
    const safePage = page && page > 0 ? page : 1;
    const safePageSize = page_size && page_size > 0 ? page_size : 20;
    const startIdx = (safePage - 1) * safePageSize;
    const endIdx = startIdx + safePageSize;
    const pageJobs = sorted.slice(startIdx, endIdx);

    return {
      jobs: pageJobs,
      total_count,
      page: safePage,
      page_size: safePageSize,
      has_more: endIdx < total_count
    };
  }

  // createJobAlert(...)
  createJobAlert(
    email,
    frequency,
    alert_name,
    keyword,
    location_text,
    remote_only,
    remote_type,
    salary_min,
    salary_max,
    salary_currency,
    department,
    job_type,
    seniority_level,
    search_tab
  ) {
    if (!email) {
      return { success: false, message: 'Email is required', alert: null };
    }

    const allowedFrequencies = ['instant', 'daily', 'weekly', 'monthly'];
    if (!allowedFrequencies.includes(frequency)) {
      return { success: false, message: 'Invalid frequency', alert: null };
    }

    const alerts = this._getFromStorage('job_alerts');
    const now = new Date().toISOString();

    const alert = {
      id: this._generateId('job_alert'),
      alert_name: alert_name || null,
      email,
      keyword: keyword || null,
      location_text: location_text || null,
      remote_only: !!remote_only,
      remote_type: remote_type || null,
      salary_min: typeof salary_min === 'number' ? salary_min : null,
      salary_max: typeof salary_max === 'number' ? salary_max : null,
      salary_currency: salary_currency || null,
      department: department || null,
      job_type: job_type || null,
      seniority_level: seniority_level || null,
      frequency,
      search_tab: search_tab || null,
      is_active: true,
      createdAt: now,
      lastSentAt: null
    };

    alerts.push(alert);
    this._saveToStorage('job_alerts', alerts);

    return {
      success: true,
      message: 'Job alert created',
      alert
    };
  }

  // getJobDetails(jobId)
  getJobDetails(jobId) {
    const jobs = this._getFromStorage('jobs');
    return jobs.find((j) => j.id === jobId) || null;
  }

  // saveJob(jobId)
  saveJob(jobId) {
    if (!jobId) {
      return { success: false, message: 'jobId is required', saved_job: null, total_saved: 0 };
    }

    const jobs = this._getFromStorage('jobs');
    const job = jobs.find((j) => j.id === jobId);
    if (!job) {
      const savedJobs = this._getOrCreateSavedJobsStore();
      return {
        success: false,
        message: 'Job not found',
        saved_job: null,
        total_saved: savedJobs.length
      };
    }

    let savedJobs = this._getOrCreateSavedJobsStore();
    let existing = savedJobs.find((s) => s.jobId === jobId);
    const now = new Date().toISOString();

    if (!existing) {
      existing = {
        id: this._generateId('saved_job'),
        jobId,
        savedAt: now
      };
      savedJobs.push(existing);
      this._saveToStorage('saved_jobs', savedJobs);
    }

    return {
      success: true,
      message: 'Job saved',
      saved_job: existing,
      total_saved: savedJobs.length
    };
  }

  // unsaveJob(jobId)
  unsaveJob(jobId) {
    if (!jobId) {
      const savedJobs = this._getOrCreateSavedJobsStore();
      return { success: false, message: 'jobId is required', total_saved: savedJobs.length };
    }
    let savedJobs = this._getOrCreateSavedJobsStore();
    const before = savedJobs.length;
    savedJobs = savedJobs.filter((s) => s.jobId !== jobId);
    this._saveToStorage('saved_jobs', savedJobs);
    const after = savedJobs.length;
    const success = after < before;
    return {
      success,
      message: success ? 'Job unsaved' : 'Job was not in saved list',
      total_saved: after
    };
  }

  // getSavedJobs(): resolve jobId -> job
  getSavedJobs() {
    const savedJobs = this._getOrCreateSavedJobsStore();
    const jobs = this._getFromStorage('jobs');

    const saved_jobs = savedJobs.map((s) => {
      const job = jobs.find((j) => j.id === s.jobId) || null;
      return {
        saved_job_id: s.id,
        saved_at: s.savedAt,
        job
      };
    });

    return { saved_jobs };
  }

  // addJobToComparison(jobId)
  addJobToComparison(jobId) {
    if (!jobId) {
      const list = this._getOrCreateDefaultComparisonList();
      const items = this._getFromStorage('job_comparison_items').filter((i) => i.comparisonListId === list.id);
      return { success: false, message: 'jobId is required', comparison_list: list, total_items: items.length };
    }

    const jobs = this._getFromStorage('jobs');
    const job = jobs.find((j) => j.id === jobId);
    const comparison_list = this._getOrCreateDefaultComparisonList();
    let items = this._getFromStorage('job_comparison_items');

    if (!job) {
      const count = items.filter((i) => i.comparisonListId === comparison_list.id).length;
      return { success: false, message: 'Job not found', comparison_list, total_items: count };
    }

    const existing = items.find((i) => i.comparisonListId === comparison_list.id && i.jobId === jobId);
    if (!existing) {
      const now = new Date().toISOString();
      const item = {
        id: this._generateId('job_comparison_item'),
        comparisonListId: comparison_list.id,
        jobId,
        addedAt: now
      };
      items.push(item);
      this._saveToStorage('job_comparison_items', items);
      // update list updatedAt
      let lists = this._getFromStorage('job_comparison_lists');
      const idx = lists.findIndex((l) => l.id === comparison_list.id);
      if (idx >= 0) {
        lists[idx].updatedAt = now;
        this._saveToStorage('job_comparison_lists', lists);
      }
    }

    const total_items = items.filter((i) => i.comparisonListId === comparison_list.id).length;
    return {
      success: true,
      message: 'Job added to comparison list',
      comparison_list,
      total_items
    };
  }

  // removeJobFromComparison(jobId)
  removeJobFromComparison(jobId) {
    const comparison_list = this._getOrCreateDefaultComparisonList();
    let items = this._getFromStorage('job_comparison_items');
    const before = items.length;
    items = items.filter((i) => !(i.comparisonListId === comparison_list.id && i.jobId === jobId));
    this._saveToStorage('job_comparison_items', items);
    const after = items.length;
    const total_items = items.filter((i) => i.comparisonListId === comparison_list.id).length;
    return {
      success: after < before,
      message: after < before ? 'Job removed from comparison list' : 'Job was not in comparison list',
      total_items
    };
  }

  // getJobComparisonList(): resolves jobId -> job
  getJobComparisonList() {
    const comparison_list = this._getOrCreateDefaultComparisonList();
    const itemsRaw = this._getFromStorage('job_comparison_items').filter(
      (i) => i.comparisonListId === comparison_list.id
    );
    const jobs = this._getFromStorage('jobs');

    const items = itemsRaw.map((i) => {
      const job = jobs.find((j) => j.id === i.jobId) || null;
      return {
        job_comparison_item_id: i.id,
        added_at: i.addedAt,
        job
      };
    });

    return {
      comparison_list,
      items
    };
  }

  // startJobApplication(jobId, first_name, last_name, email)
  startJobApplication(jobId, first_name, last_name, email) {
    if (!jobId || !first_name || !last_name || !email) {
      return {
        success: false,
        message: 'jobId, first_name, last_name, and email are required',
        application: null
      };
    }

    const jobs = this._getFromStorage('jobs');
    const job = jobs.find((j) => j.id === jobId);
    if (!job) {
      return {
        success: false,
        message: 'Job not found',
        application: null
      };
    }

    const now = new Date().toISOString();
    const application = {
      id: this._generateId('job_application'),
      jobId,
      first_name,
      last_name,
      email,
      status: 'started',
      current_step: 'personal_info',
      createdAt: now,
      updatedAt: now
    };

    this._persistJobApplicationState(application);

    return {
      success: true,
      message: 'Application started',
      application
    };
  }

  // getTalentPoolPageContent()
  getTalentPoolPageContent() {
    const cms = this._getContentPageFromCMS('talent_pool') || {};

    const departmentValues = [
      'engineering',
      'marketing',
      'operations',
      'design',
      'product',
      'other'
    ];
    const department_options = departmentValues.map((v) => ({
      value: v,
      label: v.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    }));

    const salaryCurrencyValues = ['usd', 'eur', 'gbp', 'other'];
    const salary_currency_options = salaryCurrencyValues.map((v) => ({
      value: v,
      label: v.toUpperCase()
    }));

    return {
      heading: cms.heading || '',
      intro_text: cms.intro_text || '',
      department_options,
      salary_currency_options
    };
  }

  // submitTalentPoolSubmission(...)
  submitTalentPoolSubmission(
    first_name,
    last_name,
    email,
    department_interest,
    target_salary,
    salary_currency,
    preferred_roles
  ) {
    if (!first_name || !last_name || !email || !department_interest || typeof target_salary !== 'number') {
      return {
        success: false,
        message: 'first_name, last_name, email, department_interest and numeric target_salary are required',
        submission: null
      };
    }

    const submissions = this._getFromStorage('talent_pool_submissions');
    const now = new Date().toISOString();

    const submission = {
      id: this._generateId('talent_pool_submission'),
      first_name,
      last_name,
      email,
      department_interest,
      target_salary,
      salary_currency: salary_currency || null,
      preferred_roles: preferred_roles || null,
      createdAt: now
    };

    submissions.push(submission);
    this._saveToStorage('talent_pool_submissions', submissions);

    return {
      success: true,
      message: 'Talent pool submission created',
      submission
    };
  }

  // getInterviewProcessOverview()
  getInterviewProcessOverview() {
    const sections = this._getFromStorage('interview_process_sections');
    return { sections };
  }

  // getInterviewProcessSectionByRoleType(role_type)
  getInterviewProcessSectionByRoleType(role_type) {
    if (!role_type) return null;
    const sections = this._getFromStorage('interview_process_sections');
    const filtered = sections.filter((s) => s.role_type === role_type);
    if (filtered.length === 0) return null;
    // Prefer featured
    const featured = filtered.find((s) => s.is_featured === true);
    return featured || filtered[0];
  }

  // getCareersContactPageContent()
  getCareersContactPageContent() {
    const cms = this._getContentPageFromCMS('careers_contact') || {};

    const topic_options = [
      { value: 'roles', label: 'Roles and applications' },
      { value: 'interview_process', label: 'Interview process' },
      { value: 'events', label: 'Events and campus' },
      { value: 'other', label: 'Other' }
    ];

    const related_page_options = [
      { value: 'careers', label: 'Careers' },
      { value: 'interview_process', label: 'Interview process' },
      { value: 'events', label: 'Events' },
      { value: 'talent_pool', label: 'Talent pool' },
      { value: 'about', label: 'About' },
      { value: 'other', label: 'Other' }
    ];

    return {
      intro_text: cms.intro_text || '',
      topic_options,
      related_page_options
    };
  }

  // submitCareersContactMessage(...)
  submitCareersContactMessage(name, email, message, topic, related_page) {
    if (!name || !email || !message) {
      return {
        success: false,
        message: 'name, email, and message are required',
        contact_message: null
      };
    }

    const messages = this._getFromStorage('careers_contact_messages');
    const now = new Date().toISOString();

    const contact_message = {
      id: this._generateId('careers_contact_message'),
      name,
      email,
      message,
      topic: topic || null,
      related_page: related_page || null,
      createdAt: now
    };

    messages.push(contact_message);
    this._saveToStorage('careers_contact_messages', messages);

    return {
      success: true,
      message: 'Message submitted',
      contact_message
    };
  }

  // getEventFilterOptions()
  getEventFilterOptions() {
    const monthValues = [
      'january',
      'february',
      'march',
      'april',
      'may',
      'june',
      'july',
      'august',
      'september',
      'october',
      'november',
      'december'
    ];
    const month_options = monthValues.map((v) => ({
      value: v,
      label: v.replace(/\b\w/g, (c) => c.toUpperCase())
    }));

    const audienceValues = [
      'software_engineering',
      'engineering',
      'computer_science_students',
      'general'
    ];
    const audience_options = audienceValues.map((v) => ({
      value: v,
      label: v.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    }));

    const formatValues = ['campus', 'university', 'office', 'virtual', 'hybrid'];
    const format_options = formatValues.map((v) => ({
      value: v,
      label: v.replace(/\b\w/g, (c) => c.toUpperCase())
    }));

    return {
      month_options,
      audience_options,
      format_options
    };
  }

  // searchEvents(month, audience, format, location_text)
  searchEvents(month, audience, format, location_text) {
    let events = this._getFromStorage('events');

    if (month) {
      events = events.filter((e) => e.month === month);
    }

    if (audience) {
      events = events.filter((e) => e.audience === audience);
    }

    if (format) {
      events = events.filter((e) => e.format === format);
    }

    if (location_text && location_text.trim()) {
      const lt = location_text.trim().toLowerCase();
      events = events.filter((e) => {
        const loc = (e.location || '').toLowerCase();
        const city = (e.location_city || '').toLowerCase();
        const country = (e.location_country || '').toLowerCase();
        return (
          loc.includes(lt) ||
          (city && lt.includes(city)) ||
          (country && lt.includes(country))
        );
      });
    }

    return { events };
  }

  // getEventDetails(eventId)
  getEventDetails(eventId) {
    const events = this._getFromStorage('events');
    return events.find((e) => e.id === eventId) || null;
  }

  // registerForEvent(eventId, name, email, current_school, selected_timeslot)
  registerForEvent(eventId, name, email, current_school, selected_timeslot) {
    if (!eventId || !name || !email) {
      return {
        success: false,
        message: 'eventId, name, and email are required',
        registration: null
      };
    }

    const events = this._getFromStorage('events');
    const event = events.find((e) => e.id === eventId);
    if (!event) {
      return {
        success: false,
        message: 'Event not found',
        registration: null
      };
    }

    const registrations = this._getFromStorage('event_registrations');
    const now = new Date().toISOString();

    let slotValue = null;
    if (selected_timeslot) {
      // Store as ISO string; caller should supply ISO if needed
      slotValue = selected_timeslot;
    }

    const registration = {
      id: this._generateId('event_registration'),
      eventId,
      name,
      email,
      current_school: current_school || null,
      selected_timeslot: slotValue,
      createdAt: now
    };

    registrations.push(registration);
    this._saveToStorage('event_registrations', registrations);

    return {
      success: true,
      message: 'Registered for event',
      registration
    };
  }

  // getAboutPageContent()
  getAboutPageContent() {
    const cms = this._getContentPageFromCMS('about') || {};
    return {
      mission: cms.mission || '',
      vision: cms.vision || '',
      values: Array.isArray(cms.values) ? cms.values : [],
      culture: cms.culture || '',
      diversity_inclusion: cms.diversity_inclusion || '',
      teams_summary: Array.isArray(cms.teams_summary) ? cms.teams_summary : []
    };
  }

  // getPrivacyPolicyContent()
  getPrivacyPolicyContent() {
    const cms = this._getContentPageFromCMS('privacy_policy') || {};
    return {
      title: cms.title || '',
      content: cms.content || '',
      last_updated: cms.last_updated || null
    };
  }

  // getTermsOfUseContent()
  getTermsOfUseContent() {
    const cms = this._getContentPageFromCMS('terms_of_use') || {};
    return {
      title: cms.title || '',
      content: cms.content || '',
      last_updated: cms.last_updated || null
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