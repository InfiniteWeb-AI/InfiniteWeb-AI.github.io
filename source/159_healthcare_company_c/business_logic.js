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

  _initStorage() {
    // Legacy sample keys (harmless, kept for compatibility if present in instructions)
    if (!localStorage.getItem('users')) {
      localStorage.setItem('users', JSON.stringify([]));
    }
    if (!localStorage.getItem('products')) {
      localStorage.setItem('products', JSON.stringify([]));
    }
    if (!localStorage.getItem('carts')) {
      localStorage.setItem('carts', JSON.stringify([]));
    }
    if (!localStorage.getItem('cartItems')) {
      localStorage.setItem('cartItems', JSON.stringify([]));
    }

    // Healthcare careers data tables
    const tables = [
      'jobs',
      'locations',
      'departments',
      'saved_jobs',
      'saved_searches',
      'candidate_profiles',
      'job_applications',
      'job_comparison_sets',
      'benefit_resources',
      'saved_resources',
      'events',
      'event_registrations',
      'contact_inquiries'
    ];

    for (let i = 0; i < tables.length; i++) {
      const key = tables[i];
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
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

  _nowIso() {
    return new Date().toISOString();
  }

  _degToRad(deg) {
    return deg * (Math.PI / 180);
  }

  _calculateDistanceMiles(lat1, lon1, lat2, lon2) {
    if (
      typeof lat1 !== 'number' || typeof lon1 !== 'number' ||
      typeof lat2 !== 'number' || typeof lon2 !== 'number'
    ) {
      return null;
    }
    const R = 3958.8; // Earth radius in miles
    const dLat = this._degToRad(lat2 - lat1);
    const dLon = this._degToRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this._degToRad(lat1)) *
        Math.cos(this._degToRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  _indexById(list) {
    const map = {};
    for (let i = 0; i < list.length; i++) {
      const item = list[i];
      if (item && item.id) {
        map[item.id] = item;
      }
    }
    return map;
  }

  _resolveJobForeignKeys(job, departmentsById, locationsById) {
    if (!job) return null;
    const department = job.departmentId ? (departmentsById[job.departmentId] || null) : null;
    const location = job.locationId ? (locationsById[job.locationId] || null) : null;
    // Return a shallow copy enriched with resolved relations
    const enriched = Object.assign({}, job);
    enriched.department = department;
    enriched.location = location;
    return enriched;
  }

  _findLocationByText(text, locations) {
    if (!text) return null;
    const query = String(text).trim().toLowerCase();
    if (!query) return null;
    let best = null;
    for (let i = 0; i < locations.length; i++) {
      const loc = locations[i];
      const name = (loc.name || '').toLowerCase();
      const label = (loc.displayLabel || '').toLowerCase();
      const city = (loc.city || '').toLowerCase();
      const state = (loc.state || '').toLowerCase();
      if (
        name === query ||
        label === query ||
        (city && state && (city + ', ' + state) === query)
      ) {
        return loc;
      }
      if (
        !best &&
        (name.indexOf(query) !== -1 ||
          label.indexOf(query) !== -1 ||
          city.indexOf(query) !== -1 ||
          state.indexOf(query) !== -1)
      ) {
        best = loc;
      }
    }
    return best;
  }

  // ------------------------
  // Helper stores (private)
  // ------------------------

  _getOrCreateSavedJobsStore() {
    // Single-user context: just return the array
    return this._getFromStorage('saved_jobs');
  }

  _getOrCreateJobComparisonSet() {
    let sets = this._getFromStorage('job_comparison_sets');
    if (!sets || !Array.isArray(sets)) {
      sets = [];
    }
    let set = sets[0] || null;
    if (!set) {
      set = {
        id: this._generateId('jobcomparison'),
        name: null,
        jobIds: [],
        createdAt: this._nowIso(),
        updatedAt: this._nowIso()
      };
      sets.push(set);
      this._saveToStorage('job_comparison_sets', sets);
    }
    return set;
  }

  _saveJobComparisonSet(set) {
    let sets = this._getFromStorage('job_comparison_sets');
    if (!sets || !Array.isArray(sets)) {
      sets = [];
    }
    let replaced = false;
    for (let i = 0; i < sets.length; i++) {
      if (sets[i].id === set.id) {
        sets[i] = set;
        replaced = true;
        break;
      }
    }
    if (!replaced) {
      sets.push(set);
    }
    this._saveToStorage('job_comparison_sets', sets);
  }

  _getOrCreateCandidateProfile() {
    let profiles = this._getFromStorage('candidate_profiles');
    if (!profiles || !Array.isArray(profiles)) {
      profiles = [];
    }
    let profile = profiles[0] || null;
    if (!profile) {
      profile = {
        id: this._generateId('candidate'),
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        primaryProfession: 'other',
        preferredLocationTexts: [],
        preferredLocationIds: [],
        desiredEmploymentType: null,
        emailJobAlertsEnabled: false,
        jobAlertFrequency: 'none',
        createdAt: this._nowIso(),
        updatedAt: this._nowIso()
      };
      profiles.push(profile);
      this._saveToStorage('candidate_profiles', profiles);
    }
    return profile;
  }

  _saveCandidateProfileInternal(profile) {
    let profiles = this._getFromStorage('candidate_profiles');
    if (!profiles || !Array.isArray(profiles)) {
      profiles = [];
    }
    let replaced = false;
    for (let i = 0; i < profiles.length; i++) {
      if (profiles[i].id === profile.id) {
        profiles[i] = profile;
        replaced = true;
        break;
      }
    }
    if (!replaced) {
      profiles.push(profile);
    }
    this._saveToStorage('candidate_profiles', profiles);
  }

  _getOrCreateSavedSearchStore() {
    let saved = this._getFromStorage('saved_searches');
    if (!saved || !Array.isArray(saved)) {
      saved = [];
      this._saveToStorage('saved_searches', saved);
    }
    return saved;
  }

  _saveSavedSearchStore(store) {
    this._saveToStorage('saved_searches', store || []);
  }

  _getOrCreateApplicationStore() {
    let apps = this._getFromStorage('job_applications');
    if (!apps || !Array.isArray(apps)) {
      apps = [];
      this._saveToStorage('job_applications', apps);
    }
    return apps;
  }

  _saveApplicationStore(store) {
    this._saveToStorage('job_applications', store || []);
  }

  _getOrCreateSavedResourcesStore() {
    let saved = this._getFromStorage('saved_resources');
    if (!saved || !Array.isArray(saved)) {
      saved = [];
      this._saveToStorage('saved_resources', saved);
    }
    return saved;
  }

  _saveSavedResourcesStore(store) {
    this._saveToStorage('saved_resources', store || []);
  }

  _getOrCreateEventRegistrationStore() {
    let regs = this._getFromStorage('event_registrations');
    if (!regs || !Array.isArray(regs)) {
      regs = [];
      this._saveToStorage('event_registrations', regs);
    }
    return regs;
  }

  _saveEventRegistrationStore(store) {
    this._saveToStorage('event_registrations', store || []);
  }

  // ------------------------
  // Interface implementations
  // ------------------------

  // 1. getHomeFeaturedContent
  getHomeFeaturedContent() {
    const jobs = this._getFromStorage('jobs');
    const departments = this._getFromStorage('departments');
    const locations = this._getFromStorage('locations');
    const benefitResources = this._getFromStorage('benefit_resources');
    const events = this._getFromStorage('events');

    const departmentsById = this._indexById(departments);
    const locationsById = this._indexById(locations);

    // Featured jobs: latest by postingDate
    const jobsCopy = jobs.slice();
    jobsCopy.sort(function (a, b) {
      const da = a.postingDate ? new Date(a.postingDate).getTime() : 0;
      const db = b.postingDate ? new Date(b.postingDate).getTime() : 0;
      return db - da;
    });
    const featuredJobs = jobsCopy.slice(0, 3).map((job) =>
      this._resolveJobForeignKeys(job, departmentsById, locationsById)
    );

    // Featured benefit resources: those marked isFeatured, or first 3
    let featuredBenefitResources = [];
    for (let i = 0; i < benefitResources.length; i++) {
      const r = benefitResources[i];
      if (r && r.isFeatured) {
        featuredBenefitResources.push(r);
      }
    }
    if (!featuredBenefitResources.length) {
      featuredBenefitResources = benefitResources.slice(0, 3);
    }

    // Featured events: upcoming by startDateTime
    const now = Date.now();
    const upcoming = [];
    for (let i = 0; i < events.length; i++) {
      const e = events[i];
      if (!e || !e.startDateTime) continue;
      const t = new Date(e.startDateTime).getTime();
      if (!isNaN(t) && t >= now) {
        upcoming.push(e);
      }
    }
    upcoming.sort(function (a, b) {
      const da = new Date(a.startDateTime).getTime();
      const db = new Date(b.startDateTime).getTime();
      return da - db;
    });
    const featuredEvents = upcoming.slice(0, 3);

    return {
      headline: 'Explore your next role in healthcare',
      subheadline: 'Discover open roles, benefits and upcoming hiring events.',
      featuredJobs: featuredJobs,
      featuredBenefitResources: featuredBenefitResources,
      featuredEvents: featuredEvents
    };
  }

  // 2. getLocationSuggestions
  getLocationSuggestions(query, includeRemoteOption) {
    const locations = this._getFromStorage('locations');
    const q = (query || '').trim().toLowerCase();
    const includeRemote = includeRemoteOption !== false; // default true

    const results = [];

    for (let i = 0; i < locations.length; i++) {
      const loc = locations[i];
      if (!loc) continue;
      const name = (loc.name || '').toLowerCase();
      const label = (loc.displayLabel || '').toLowerCase();
      const city = (loc.city || '').toLowerCase();
      const state = (loc.state || '').toLowerCase();

      if (!q) {
        results.push({
          id: loc.id,
          name: loc.name,
          locationType: loc.locationType,
          displayLabel: loc.displayLabel || loc.name
        });
      } else {
        const haystack = [name, label, city, state].join(' ');
        if (haystack.indexOf(q) !== -1) {
          results.push({
            id: loc.id,
            name: loc.name,
            locationType: loc.locationType,
            displayLabel: loc.displayLabel || loc.name
          });
        }
      }
    }

    if (includeRemote) {
      for (let i = 0; i < locations.length; i++) {
        const loc = locations[i];
        if (!loc) continue;
        if (loc.locationType === 'remote') {
          const labelLower = (loc.displayLabel || loc.name || '').toLowerCase();
          if (!q || labelLower.indexOf(q) !== -1 || 'remote'.indexOf(q) !== -1) {
            let exists = false;
            for (let j = 0; j < results.length; j++) {
              if (results[j].id === loc.id) {
                exists = true;
                break;
              }
            }
            if (!exists) {
              results.push({
                id: loc.id,
                name: loc.name,
                locationType: loc.locationType,
                displayLabel: loc.displayLabel || loc.name
              });
            }
          }
        }
      }
    }

    return results;
  }

  // 3. getJobSearchFilterOptions
  getJobSearchFilterOptions() {
    const departments = this._getFromStorage('departments');
    const jobs = this._getFromStorage('jobs');

    let salaryCurrency = 'usd';
    for (let i = 0; i < jobs.length; i++) {
      const j = jobs[i];
      if (j && j.salaryCurrency) {
        salaryCurrency = j.salaryCurrency;
        break;
      }
    }

    return {
      departments: departments,
      employmentTypes: [
        { value: 'full_time_36_40_hours', label: 'Full-time (36–40 hours)' },
        { value: 'full_time_30_35_hours', label: 'Full-time (30–35 hours)' },
        { value: 'part_time_up_to_20_hours', label: 'Part-time (up to 20 hours)' },
        { value: 'part_time_20_35_hours', label: 'Part-time (20–35 hours)' },
        { value: 'per_diem', label: 'Per diem' },
        { value: 'temporary', label: 'Temporary' },
        { value: 'internship', label: 'Internship' }
      ],
      shifts: [
        { value: 'day_shift', label: 'Day shift' },
        { value: 'evening_shift', label: 'Evening shift' },
        { value: 'night_shift', label: 'Night shift' },
        { value: 'rotating_shift', label: 'Rotating shift' },
        { value: 'variable_shift', label: 'Variable shift' }
      ],
      jobTypes: [
        { value: 'standard_job', label: 'Jobs' },
        { value: 'internship', label: 'Internships' }
      ],
      programTypes: [
        { value: 'none', label: 'None' },
        { value: 'summer_internship', label: 'Summer internship' },
        { value: 'fall_internship', label: 'Fall internship' },
        { value: 'winter_internship', label: 'Winter internship' },
        { value: 'spring_internship', label: 'Spring internship' },
        { value: 'year_round_internship', label: 'Year-round internship' }
      ],
      distanceOptionsMiles: [
        { value: 5, label: 'Within 5 miles' },
        { value: 10, label: 'Within 10 miles' },
        { value: 15, label: 'Within 15 miles' },
        { value: 25, label: 'Within 25 miles' },
        { value: 50, label: 'Within 50 miles' }
      ],
      sortOptions: [
        { value: 'relevance', label: 'Relevance' },
        { value: 'posting_date_newest_first', label: 'Posting date – Newest first' }
      ],
      remoteOptionLabel: 'Remote / Work From Home',
      salaryCurrency: salaryCurrency
    };
  }

  // 4. searchJobs
  searchJobs(
    keyword,
    locationText,
    locationId,
    distanceMiles,
    minSalary,
    maxSalary,
    employmentTypeFilters,
    shiftFilters,
    departmentIds,
    jobTypeFilters,
    programTypeFilters,
    internshipStartDate,
    isRemoteOnly,
    sortBy,
    page,
    pageSize
  ) {
    const jobs = this._getFromStorage('jobs');
    const locations = this._getFromStorage('locations');
    const departments = this._getFromStorage('departments');
    const departmentsById = this._indexById(departments);
    const locationsById = this._indexById(locations);

    // Instrumentation for task completion tracking
    try {
      const kwArg = keyword ? String(keyword).toLowerCase() : '';
      const hasNurse = kwArg.indexOf('nurse') !== -1;
      const hasCardiology = kwArg.indexOf('cardiology') !== -1;
      const correctKeyword = hasNurse && hasCardiology;

      const correctDistance =
        typeof distanceMiles === 'number' && distanceMiles === 15;

      let isChicagoLocation = false;
      const lt = locationText != null ? String(locationText).toLowerCase() : '';
      if (lt) {
        if (
          lt.indexOf('chicago') !== -1 &&
          (lt.indexOf('il') !== -1 || lt.indexOf('illinois') !== -1)
        ) {
          isChicagoLocation = true;
        }
      }
      if (!isChicagoLocation && locationId && locationsById[locationId]) {
        const loc = locationsById[locationId];
        const cityLower = (loc.city || '').toLowerCase();
        const stateLower = (loc.state || '').toLowerCase();
        if (
          cityLower === 'chicago' &&
          (stateLower === 'il' || stateLower === 'illinois')
        ) {
          isChicagoLocation = true;
        }
      }

      const correctMinSalary =
        typeof minSalary === 'number' && minSalary >= 80000;

      const hasNightShift =
        Array.isArray(shiftFilters) &&
        shiftFilters.indexOf('night_shift') !== -1;

      if (
        correctKeyword &&
        correctDistance &&
        isChicagoLocation &&
        correctMinSalary &&
        hasNightShift
      ) {
        const instrumentationValue = {
          keyword: keyword,
          locationText: locationText,
          locationId: locationId,
          distanceMiles: distanceMiles,
          minSalary: minSalary,
          maxSalary: maxSalary,
          shiftFilters: shiftFilters,
          employmentTypeFilters: employmentTypeFilters,
          departmentIds: departmentIds,
          isRemoteOnly: isRemoteOnly,
          sortBy: sortBy,
          recordedAt: this._nowIso()
        };
        localStorage.setItem(
          'task1_searchParams',
          JSON.stringify(instrumentationValue)
        );
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    let filtered = jobs.slice();
    const kw = keyword ? String(keyword).toLowerCase() : null;

    if (kw) {
      const tokens = kw.split(/\s+/).filter(Boolean);
      filtered = filtered.filter((job) => {
        if (!job) return false;
        const title = (job.title || '').toLowerCase();
        const desc = (job.description || '').toLowerCase();
        const dept = (job.departmentName || '').toLowerCase();
        const locLabel = (job.locationLabel || '').toLowerCase();
        const combined = [title, desc, dept, locLabel].join(' ');
        for (let i = 0; i < tokens.length; i++) {
          if (combined.indexOf(tokens[i]) === -1) {
            return false;
          }
        }
        return true;
      });
    }

    const remoteOnly = !!isRemoteOnly;
    if (remoteOnly) {
      filtered = filtered.filter((job) => job && job.isRemote === true);
    }

    // Location + distance filtering
    let centerLocation = null;
    if (locationId) {
      centerLocation = locationsById[locationId] || null;
    } else if (locationText) {
      centerLocation = this._findLocationByText(locationText, locations);
    }

    const dist = typeof distanceMiles === 'number' && !isNaN(distanceMiles)
      ? distanceMiles
      : null;

    if (centerLocation) {
      if (dist && centerLocation.latitude != null && centerLocation.longitude != null) {
        const clat = centerLocation.latitude;
        const clon = centerLocation.longitude;
        filtered = filtered.filter((job) => {
          if (!job) return false;
          const loc = locationsById[job.locationId];
          if (!loc) return false;
          if (job.isRemote && !remoteOnly) {
            // Remote jobs generally not tied to radius; exclude when radius specified
            return false;
          }
          if (loc.latitude == null || loc.longitude == null) {
            return job.locationId === centerLocation.id;
          }
          const d = this._calculateDistanceMiles(clat, clon, loc.latitude, loc.longitude);
          if (d == null) return false;
          return d <= dist;
        });
      } else {
        // No numeric distance or coordinates; match by facility/city
        filtered = filtered.filter((job) => {
          if (!job) return false;
          if (job.locationId === centerLocation.id) return true;
          const loc = locationsById[job.locationId];
          if (!loc) return false;
          const ct = (centerLocation.city || '').toLowerCase();
          const st = (centerLocation.state || '').toLowerCase();
          const locCity = (loc.city || '').toLowerCase();
          const locState = (loc.state || '').toLowerCase();
          if (ct && st && locCity === ct && locState === st) return true;
          const q = (locationText || centerLocation.name || '').toLowerCase();
          const hay = ((loc.name || '') + ' ' + (loc.displayLabel || '')).toLowerCase();
          return hay.indexOf(q) !== -1;
        });
      }
    } else if (locationText && !remoteOnly) {
      const textLower = locationText.trim().toLowerCase();
      filtered = filtered.filter((job) => {
        if (!job) return false;
        const loc = locationsById[job.locationId];
        if (!loc) return false;
        const hay = [
          loc.name || '',
          loc.displayLabel || '',
          loc.city || '',
          loc.state || ''
        ]
          .join(' ')
          .toLowerCase();
        return hay.indexOf(textLower) !== -1;
      });
    }

    // Salary filters
    if (typeof minSalary === 'number' && !isNaN(minSalary)) {
      const min = minSalary;
      filtered = filtered.filter((job) => {
        if (!job) return false;
        const sMin = typeof job.salaryMin === 'number' ? job.salaryMin : null;
        const sMax = typeof job.salaryMax === 'number' ? job.salaryMax : null;
        if (sMin == null && sMax == null) return false;
        if (sMin != null && sMin >= min) return true;
        if (sMax != null && sMax >= min) return true;
        return false;
      });
    }

    if (typeof maxSalary === 'number' && !isNaN(maxSalary)) {
      const max = maxSalary;
      filtered = filtered.filter((job) => {
        if (!job) return false;
        const sMin = typeof job.salaryMin === 'number' ? job.salaryMin : null;
        const sMax = typeof job.salaryMax === 'number' ? job.salaryMax : null;
        if (sMin == null && sMax == null) return false;
        if (sMin != null && sMin <= max) return true;
        if (sMax != null && sMax <= max) return true;
        return false;
      });
    }

    // Employment type
    if (Array.isArray(employmentTypeFilters) && employmentTypeFilters.length) {
      const set = {};
      for (let i = 0; i < employmentTypeFilters.length; i++) {
        set[employmentTypeFilters[i]] = true;
      }
      filtered = filtered.filter((job) => job && set[job.employmentType]);
    }

    // Shift filters
    if (Array.isArray(shiftFilters) && shiftFilters.length) {
      const set = {};
      for (let i = 0; i < shiftFilters.length; i++) {
        set[shiftFilters[i]] = true;
      }
      filtered = filtered.filter((job) => job && set[job.shift]);
    }

    // Department filters
    if (Array.isArray(departmentIds) && departmentIds.length) {
      const set = {};
      for (let i = 0; i < departmentIds.length; i++) {
        set[departmentIds[i]] = true;
      }
      filtered = filtered.filter((job) => job && set[job.departmentId]);
    }

    // Job type filters
    if (Array.isArray(jobTypeFilters) && jobTypeFilters.length) {
      const set = {};
      for (let i = 0; i < jobTypeFilters.length; i++) {
        set[jobTypeFilters[i]] = true;
      }
      filtered = filtered.filter((job) => job && set[job.jobType]);
    }

    // Program type filters
    if (Array.isArray(programTypeFilters) && programTypeFilters.length) {
      const set = {};
      for (let i = 0; i < programTypeFilters.length; i++) {
        set[programTypeFilters[i]] = true;
      }
      filtered = filtered.filter((job) => job && set[job.programType]);
    }

    // Internship start date filter (ISO date string)
    if (internshipStartDate) {
      const targetTime = new Date(internshipStartDate).getTime();
      if (!isNaN(targetTime)) {
        filtered = filtered.filter((job) => {
          if (!job || job.jobType !== 'internship') return false;
          if (!job.internshipStartDate) return false;
          const jt = new Date(job.internshipStartDate).getTime();
          if (isNaN(jt)) return false;
          // Include internships starting on or after the target date
          return jt >= targetTime;
        });
      }
    }

    // Sorting
    const sort = sortBy || 'relevance';
    if (sort === 'posting_date_newest_first') {
      filtered.sort(function (a, b) {
        const da = a.postingDate ? new Date(a.postingDate).getTime() : 0;
        const db = b.postingDate ? new Date(b.postingDate).getTime() : 0;
        return db - da;
      });
    }

    const totalCount = filtered.length;
    const pageNum = page && page > 0 ? page : 1;
    const size = pageSize && pageSize > 0 ? pageSize : 20;
    const start = (pageNum - 1) * size;
    const end = start + size;
    const pageItems = filtered.slice(start, end);

    const results = pageItems.map((job) =>
      this._resolveJobForeignKeys(job, departmentsById, locationsById)
    );

    return {
      results: results,
      totalCount: totalCount,
      page: pageNum,
      pageSize: size
    };
  }

  // 5. saveJobSearch
  saveJobSearch(
    name,
    keyword,
    locationText,
    locationId,
    distanceMiles,
    minSalary,
    maxSalary,
    shiftFilters,
    employmentTypeFilters,
    departmentIds,
    jobTypeFilters,
    programTypeFilters,
    internshipStartDate,
    isRemoteOnly,
    sortBy
  ) {
    if (!name) {
      return {
        success: false,
        savedSearch: null,
        message: 'Search name is required.'
      };
    }

    const store = this._getOrCreateSavedSearchStore();
    const now = this._nowIso();
    const savedSearch = {
      id: this._generateId('savedsearch'),
      name: name,
      keyword: keyword || null,
      locationText: locationText || null,
      locationId: locationId || null,
      distanceMiles:
        typeof distanceMiles === 'number' && !isNaN(distanceMiles)
          ? distanceMiles
          : null,
      minSalary:
        typeof minSalary === 'number' && !isNaN(minSalary) ? minSalary : null,
      maxSalary:
        typeof maxSalary === 'number' && !isNaN(maxSalary) ? maxSalary : null,
      shiftFilters: Array.isArray(shiftFilters) ? shiftFilters.slice() : [],
      employmentTypeFilters: Array.isArray(employmentTypeFilters)
        ? employmentTypeFilters.slice()
        : [],
      departmentIds: Array.isArray(departmentIds) ? departmentIds.slice() : [],
      jobTypeFilters: Array.isArray(jobTypeFilters)
        ? jobTypeFilters.slice()
        : [],
      programTypeFilters: Array.isArray(programTypeFilters)
        ? programTypeFilters.slice()
        : [],
      internshipStartDate: internshipStartDate || null,
      isRemoteOnly: !!isRemoteOnly,
      sortBy: sortBy || 'relevance',
      createdAt: now
    };

    store.push(savedSearch);
    this._saveSavedSearchStore(store);

    return {
      success: true,
      savedSearch: {
        id: savedSearch.id,
        name: savedSearch.name,
        createdAt: savedSearch.createdAt
      },
      message: 'Search saved successfully.'
    };
  }

  // 6. getSavedSearches
  getSavedSearches() {
    const searches = this._getFromStorage('saved_searches');
    const locations = this._getFromStorage('locations');
    const departments = this._getFromStorage('departments');
    const locationsById = this._indexById(locations);
    const departmentsById = this._indexById(departments);

    return searches.map((s) => {
      const obj = Object.assign({}, s);
      if (s.locationId) {
        obj.location = locationsById[s.locationId] || null;
      } else {
        obj.location = null;
      }
      if (Array.isArray(s.departmentIds) && s.departmentIds.length) {
        const resolved = [];
        for (let i = 0; i < s.departmentIds.length; i++) {
          const dep = departmentsById[s.departmentIds[i]];
          if (dep) resolved.push(dep);
        }
        obj.departments = resolved;
      } else {
        obj.departments = [];
      }
      return obj;
    });
  }

  // 7. getJobDetails
  getJobDetails(jobId) {
    const jobs = this._getFromStorage('jobs');
    const departments = this._getFromStorage('departments');
    const locations = this._getFromStorage('locations');
    const savedJobs = this._getFromStorage('saved_jobs');
    const comparisonSet = this._getFromStorage('job_comparison_sets')[0] || null;

    const departmentsById = this._indexById(departments);
    const locationsById = this._indexById(locations);

    let job = null;
    for (let i = 0; i < jobs.length; i++) {
      if (jobs[i].id === jobId) {
        job = jobs[i];
        break;
      }
    }

    if (!job) {
      return {
        job: null,
        isSaved: false,
        isInComparisonSet: false
      };
    }

    const enrichedJob = this._resolveJobForeignKeys(job, departmentsById, locationsById);

    let isSaved = false;
    for (let i = 0; i < savedJobs.length; i++) {
      if (savedJobs[i].jobId === jobId) {
        isSaved = true;
        break;
      }
    }

    let isInComparisonSet = false;
    if (comparisonSet && Array.isArray(comparisonSet.jobIds)) {
      for (let i = 0; i < comparisonSet.jobIds.length; i++) {
        if (comparisonSet.jobIds[i] === jobId) {
          isInComparisonSet = true;
          break;
        }
      }
    }

    return {
      job: enrichedJob,
      isSaved: isSaved,
      isInComparisonSet: isInComparisonSet
    };
  }

  // 8. saveJob
  saveJob(jobId, source, label) {
    if (!jobId) {
      return {
        success: false,
        savedJob: null,
        totalSavedCount: this._getFromStorage('saved_jobs').length,
        message: 'jobId is required.'
      };
    }

    let savedJobs = this._getOrCreateSavedJobsStore();

    // Avoid duplicates per jobId
    for (let i = 0; i < savedJobs.length; i++) {
      if (savedJobs[i].jobId === jobId) {
        // Instrumentation for task completion tracking
        try {
          const jobs = this._getFromStorage('jobs');
          const locations = this._getFromStorage('locations');
          const jobsById = this._indexById(jobs);
          const locationsById = this._indexById(locations);
          const job = jobsById[jobId];

          if (job) {
            const combinedText = (
              (job.title || '') +
              ' ' +
              (job.description || '')
            ).toLowerCase();
            const hasNurse = combinedText.indexOf('nurse') !== -1;
            const hasCardiology = combinedText.indexOf('cardiology') !== -1;
            const correctKeyword = hasNurse && hasCardiology;

            const correctShift = job.shift === 'night_shift';

            const sMin = typeof job.salaryMin === 'number' ? job.salaryMin : null;
            const sMax = typeof job.salaryMax === 'number' ? job.salaryMax : null;
            const correctSalary =
              (sMin != null && sMin >= 80000) ||
              (sMax != null && sMax >= 80000);

            let nearChicago = false;
            const jobLoc = job.locationId ? locationsById[job.locationId] : null;

            if (jobLoc) {
              for (let j = 0; j < locations.length; j++) {
                const chicagoCandidate = locations[j];
                if (!chicagoCandidate) continue;
                const cityLower = (chicagoCandidate.city || '').toLowerCase();
                const stateLower = (chicagoCandidate.state || '').toLowerCase();
                if (
                  cityLower === 'chicago' &&
                  (stateLower === 'il' || stateLower === 'illinois')
                ) {
                  if (
                    typeof jobLoc.latitude === 'number' &&
                    typeof jobLoc.longitude === 'number' &&
                    typeof chicagoCandidate.latitude === 'number' &&
                    typeof chicagoCandidate.longitude === 'number'
                  ) {
                    const d = this._calculateDistanceMiles(
                      jobLoc.latitude,
                      jobLoc.longitude,
                      chicagoCandidate.latitude,
                      chicagoCandidate.longitude
                    );
                    if (d != null && d <= 15) {
                      nearChicago = true;
                      break;
                    }
                  } else {
                    const jobCity = (jobLoc.city || '').toLowerCase();
                    const jobState = (jobLoc.state || '').toLowerCase();
                    if (
                      jobCity === 'chicago' &&
                      (jobState === 'il' || jobState === 'illinois')
                    ) {
                      nearChicago = true;
                      break;
                    }
                  }
                }
              }
            }

            if (correctKeyword && correctShift && correctSalary && nearChicago) {
              localStorage.setItem('task1_savedJobId', jobId);
            }
          }
        } catch (e) {
          console.error('Instrumentation error:', e);
        }

        return {
          success: true,
          savedJob: {
            id: savedJobs[i].id,
            jobId: savedJobs[i].jobId,
            label: savedJobs[i].label,
            savedAt: savedJobs[i].savedAt
          },
          totalSavedCount: savedJobs.length,
          message: 'Job already saved.'
        };
      }
    }

    const entry = {
      id: this._generateId('savedjob'),
      jobId: jobId,
      source: source || 'other',
      label: label || null,
      savedAt: this._nowIso()
    };

    savedJobs.push(entry);
    this._saveToStorage('saved_jobs', savedJobs);

    // Instrumentation for task completion tracking
    try {
      const jobs = this._getFromStorage('jobs');
      const locations = this._getFromStorage('locations');
      const jobsById = this._indexById(jobs);
      const locationsById = this._indexById(locations);
      const job = jobsById[jobId];

      if (job) {
        const combinedText = (
          (job.title || '') +
          ' ' +
          (job.description || '')
        ).toLowerCase();
        const hasNurse = combinedText.indexOf('nurse') !== -1;
        const hasCardiology = combinedText.indexOf('cardiology') !== -1;
        const correctKeyword = hasNurse && hasCardiology;

        const correctShift = job.shift === 'night_shift';

        const sMin = typeof job.salaryMin === 'number' ? job.salaryMin : null;
        const sMax = typeof job.salaryMax === 'number' ? job.salaryMax : null;
        const correctSalary =
          (sMin != null && sMin >= 80000) ||
          (sMax != null && sMax >= 80000);

        let nearChicago = false;
        const jobLoc = job.locationId ? locationsById[job.locationId] : null;

        if (jobLoc) {
          for (let j = 0; j < locations.length; j++) {
            const chicagoCandidate = locations[j];
            if (!chicagoCandidate) continue;
            const cityLower = (chicagoCandidate.city || '').toLowerCase();
            const stateLower = (chicagoCandidate.state || '').toLowerCase();
            if (
              cityLower === 'chicago' &&
              (stateLower === 'il' || stateLower === 'illinois')
            ) {
              if (
                typeof jobLoc.latitude === 'number' &&
                typeof jobLoc.longitude === 'number' &&
                typeof chicagoCandidate.latitude === 'number' &&
                typeof chicagoCandidate.longitude === 'number'
              ) {
                const d = this._calculateDistanceMiles(
                  jobLoc.latitude,
                  jobLoc.longitude,
                  chicagoCandidate.latitude,
                  chicagoCandidate.longitude
                );
                if (d != null && d <= 15) {
                  nearChicago = true;
                  break;
                }
              } else {
                const jobCity = (jobLoc.city || '').toLowerCase();
                const jobState = (jobLoc.state || '').toLowerCase();
                if (
                  jobCity === 'chicago' &&
                  (jobState === 'il' || jobState === 'illinois')
                ) {
                  nearChicago = true;
                  break;
                }
              }
            }
          }
        }

        if (correctKeyword && correctShift && correctSalary && nearChicago) {
          localStorage.setItem('task1_savedJobId', jobId);
        }
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      success: true,
      savedJob: {
        id: entry.id,
        jobId: entry.jobId,
        label: entry.label,
        savedAt: entry.savedAt
      },
      totalSavedCount: savedJobs.length,
      message: 'Job saved successfully.'
    };
  }

  // 9. getSavedJobs
  getSavedJobs() {
    const savedJobs = this._getFromStorage('saved_jobs');
    const jobs = this._getFromStorage('jobs');
    const departments = this._getFromStorage('departments');
    const locations = this._getFromStorage('locations');

    const jobsById = this._indexById(jobs);
    const departmentsById = this._indexById(departments);
    const locationsById = this._indexById(locations);

    // Instrumentation for task completion tracking
    try {
      localStorage.setItem('task9_savedJobsViewed', 'true');
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return savedJobs.map((s) => {
      const jobRaw = jobsById[s.jobId] || null;
      const job = jobRaw
        ? this._resolveJobForeignKeys(jobRaw, departmentsById, locationsById)
        : null;
      return {
        savedJobId: s.id,
        label: s.label || null,
        savedAt: s.savedAt,
        job: job
      };
    });
  }

  // 10. removeSavedJob
  removeSavedJob(savedJobId, jobId) {
    let savedJobs = this._getFromStorage('saved_jobs');
    const before = savedJobs.length;

    if (savedJobId) {
      savedJobs = savedJobs.filter((s) => s.id !== savedJobId);
    } else if (jobId) {
      savedJobs = savedJobs.filter((s) => s.jobId !== jobId);
    }

    this._saveToStorage('saved_jobs', savedJobs);

    return {
      success: savedJobs.length !== before,
      remainingSavedCount: savedJobs.length,
      message:
        savedJobs.length !== before
          ? 'Saved job removed.'
          : 'No matching saved job found.'
    };
  }

  // 11. getJobComparisonSet
  getJobComparisonSet() {
    const set = this._getOrCreateJobComparisonSet();
    const jobs = this._getFromStorage('jobs');
    const departments = this._getFromStorage('departments');
    const locations = this._getFromStorage('locations');

    const jobsById = this._indexById(jobs);
    const departmentsById = this._indexById(departments);
    const locationsById = this._indexById(locations);

    const items = [];
    let maxPto = null;

    for (let i = 0; i < set.jobIds.length; i++) {
      const jobId = set.jobIds[i];
      const jobRaw = jobsById[jobId];
      if (!jobRaw) continue;
      const pto = typeof jobRaw.ptoDaysPerYear === 'number'
        ? jobRaw.ptoDaysPerYear
        : null;
      if (pto != null) {
        if (maxPto == null || pto > maxPto) {
          maxPto = pto;
        }
      }
    }

    for (let i = 0; i < set.jobIds.length; i++) {
      const jobId = set.jobIds[i];
      const jobRaw = jobsById[jobId];
      if (!jobRaw) continue;
      const jobEnriched = this._resolveJobForeignKeys(
        jobRaw,
        departmentsById,
        locationsById
      );
      const isHighestPto =
        maxPto != null && jobRaw.ptoDaysPerYear === maxPto ? true : false;

      items.push({
        jobId: jobId,
        title: jobRaw.title,
        departmentName: jobRaw.departmentName || null,
        locationLabel: jobRaw.locationLabel || null,
        employmentType: jobRaw.employmentType || null,
        shift: jobRaw.shift || null,
        salaryMin: jobRaw.salaryMin != null ? jobRaw.salaryMin : null,
        salaryMax: jobRaw.salaryMax != null ? jobRaw.salaryMax : null,
        salaryCurrency: jobRaw.salaryCurrency || null,
        ptoDaysPerYear: jobRaw.ptoDaysPerYear != null
          ? jobRaw.ptoDaysPerYear
          : null,
        isHighestPto: isHighestPto,
        job: jobEnriched
      });
    }

    return {
      comparisonSetId: set.id,
      jobs: items
    };
  }

  // 12. addJobToComparison
  addJobToComparison(jobId) {
    if (!jobId) {
      return {
        success: false,
        comparisonSetId: null,
        jobCount: 0,
        message: 'jobId is required.'
      };
    }

    const set = this._getOrCreateJobComparisonSet();
    if (!Array.isArray(set.jobIds)) {
      set.jobIds = [];
    }

    let exists = false;
    for (let i = 0; i < set.jobIds.length; i++) {
      if (set.jobIds[i] === jobId) {
        exists = true;
        break;
      }
    }

    if (!exists) {
      set.jobIds.push(jobId);
      set.updatedAt = this._nowIso();
      this._saveJobComparisonSet(set);
    }

    return {
      success: true,
      comparisonSetId: set.id,
      jobCount: set.jobIds.length,
      message: exists
        ? 'Job already in comparison set.'
        : 'Job added to comparison set.'
    };
  }

  // 13. removeJobFromComparison
  removeJobFromComparison(jobId) {
    if (!jobId) {
      return {
        success: false,
        comparisonSetId: null,
        jobCount: 0
      };
    }

    const set = this._getOrCreateJobComparisonSet();
    const before = set.jobIds.length;
    set.jobIds = set.jobIds.filter((id) => id !== jobId);
    set.updatedAt = this._nowIso();
    this._saveJobComparisonSet(set);

    return {
      success: set.jobIds.length !== before,
      comparisonSetId: set.id,
      jobCount: set.jobIds.length
    };
  }

  // 14. clearJobComparisonSet
  clearJobComparisonSet() {
    const set = this._getOrCreateJobComparisonSet();
    set.jobIds = [];
    set.updatedAt = this._nowIso();
    this._saveJobComparisonSet(set);
    return { success: true };
  }

  // 15. copyJobShareLink
  copyJobShareLink(jobId, method) {
    if (!jobId) {
      return {
        shareLink: null,
        success: false,
        message: 'jobId is required.'
      };
    }
    const m = method || 'copy_link';
    // Construct a relative share link; front-end can prefix with site origin
    const shareLink = '/jobs/' + encodeURIComponent(jobId);

    // Instrumentation for task completion tracking
    try {
      const jobs = this._getFromStorage('jobs');
      const locations = this._getFromStorage('locations');
      const locationsById = this._indexById(locations);

      const campusIds = [];
      const campusMatch = 'main hospital campus';

      for (let i = 0; i < locations.length; i++) {
        const loc = locations[i];
        if (!loc) continue;
        const nameLower = (loc.name || '').toLowerCase();
        const labelLower = (loc.displayLabel || '').toLowerCase();
        if (
          nameLower.indexOf(campusMatch) !== -1 ||
          labelLower.indexOf(campusMatch) !== -1
        ) {
          campusIds.push(loc.id);
        }
      }

      if (campusIds.length) {
        let mostRecentJobId = null;
        let mostRecentTime = -Infinity;

        for (let i = 0; i < jobs.length; i++) {
          const job = jobs[i];
          if (!job) continue;
          const titleLower = (job.title || '').toLowerCase();
          if (titleLower.indexOf('lab technician') === -1) continue;
          if (!job.locationId) continue;
          if (campusIds.indexOf(job.locationId) === -1) continue;

          const t = job.postingDate
            ? new Date(job.postingDate).getTime()
            : NaN;
          const time = isNaN(t) ? 0 : t;

          if (time > mostRecentTime) {
            mostRecentTime = time;
            mostRecentJobId = job.id;
          }
        }

        if (mostRecentJobId && jobId === mostRecentJobId) {
          localStorage.setItem('task6_copiedJobId', jobId);
        }
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      shareLink: shareLink,
      success: true,
      message: m === 'copy_link' ? 'Link ready to copy.' : 'Share link generated.'
    };
  }

  // 16. getCandidateProfile
  getCandidateProfile() {
    const profiles = this._getFromStorage('candidate_profiles');
    const profile = profiles && profiles.length ? profiles[0] : null;

    return {
      profileExists: !!profile,
      profile: profile || null
    };
  }

  // 17. saveCandidateProfile
  saveCandidateProfile(
    firstName,
    lastName,
    email,
    phone,
    primaryProfession,
    preferredLocationTexts,
    preferredLocationIds,
    desiredEmploymentType,
    emailJobAlertsEnabled,
    jobAlertFrequency
  ) {
    if (!firstName || !lastName || !email) {
      return {
        success: false,
        profile: null,
        message: 'First name, last name, and email are required.'
      };
    }

    let profiles = this._getFromStorage('candidate_profiles');
    if (!profiles || !Array.isArray(profiles)) {
      profiles = [];
    }

    let profile = profiles[0] || null;
    const now = this._nowIso();

    if (!profile) {
      profile = {
        id: this._generateId('candidate'),
        createdAt: now
      };
      profiles.push(profile);
    }

    profile.firstName = firstName;
    profile.lastName = lastName;
    profile.email = email;
    profile.phone = phone || '';
    profile.primaryProfession = primaryProfession || profile.primaryProfession || 'other';
    profile.preferredLocationTexts = Array.isArray(preferredLocationTexts)
      ? preferredLocationTexts.slice()
      : [];
    profile.preferredLocationIds = Array.isArray(preferredLocationIds)
      ? preferredLocationIds.slice()
      : [];
    profile.desiredEmploymentType = desiredEmploymentType || null;
    profile.emailJobAlertsEnabled = emailJobAlertsEnabled === true;
    if (profile.emailJobAlertsEnabled) {
      profile.jobAlertFrequency = jobAlertFrequency || 'instant';
    } else {
      profile.jobAlertFrequency = jobAlertFrequency || 'none';
    }
    profile.updatedAt = now;

    this._saveToStorage('candidate_profiles', profiles);

    return {
      success: true,
      profile: {
        id: profile.id,
        firstName: profile.firstName,
        lastName: profile.lastName,
        email: profile.email,
        phone: profile.phone,
        primaryProfession: profile.primaryProfession,
        preferredLocationTexts: profile.preferredLocationTexts,
        desiredEmploymentType: profile.desiredEmploymentType,
        emailJobAlertsEnabled: profile.emailJobAlertsEnabled,
        jobAlertFrequency: profile.jobAlertFrequency
      },
      message: 'Profile saved successfully.'
    };
  }

  // 18. getStudentsAndGraduatesContent
  getStudentsAndGraduatesContent() {
    return {
      heroTitle: 'Students & Graduates',
      heroBody:
        'Discover internships and early-career opportunities designed for students and recent graduates.',
      internshipsTileLabel: 'Internships',
      internshipsTileDescription:
        'Explore clinical and non-clinical internships across our health system.',
      featuredPrograms: [],
      resources: []
    };
  }

  // 19. startJobApplication
  startJobApplication(jobId) {
    if (!jobId) {
      return {
        applicationId: null,
        jobId: null,
        status: null,
        currentStep: null
      };
    }

    let apps = this._getOrCreateApplicationStore();
    let existing = null;
    for (let i = 0; i < apps.length; i++) {
      if (apps[i].jobId === jobId && apps[i].status !== 'withdrawn') {
        existing = apps[i];
        break;
      }
    }

    if (existing) {
      return {
        applicationId: existing.id,
        jobId: existing.jobId,
        status: existing.status,
        currentStep: existing.currentStep
      };
    }

    const now = this._nowIso();
    const app = {
      id: this._generateId('jobapp'),
      jobId: jobId,
      status: 'in_progress',
      currentStep: 'personal_info',
      createdAt: now,
      updatedAt: now,
      personalFirstName: null,
      personalLastName: null,
      personalEmail: null,
      personalPhone: null,
      educationSchoolName: null,
      educationDegreeType: null,
      educationMajor: null,
      motivationText: null,
      additionalInfo: null
    };

    apps.push(app);
    this._saveApplicationStore(apps);

    return {
      applicationId: app.id,
      jobId: app.jobId,
      status: app.status,
      currentStep: app.currentStep
    };
  }

  // 20. getJobApplication
  getJobApplication(applicationId) {
    const apps = this._getFromStorage('job_applications');
    const jobs = this._getFromStorage('jobs');
    const departments = this._getFromStorage('departments');
    const locations = this._getFromStorage('locations');

    const departmentsById = this._indexById(departments);
    const locationsById = this._indexById(locations);
    const jobsById = this._indexById(jobs);

    let app = null;
    for (let i = 0; i < apps.length; i++) {
      if (apps[i].id === applicationId) {
        app = apps[i];
        break;
      }
    }

    if (!app) {
      return {
        applicationId: null,
        jobId: null,
        status: null,
        currentStep: null,
        personalFirstName: null,
        personalLastName: null,
        personalEmail: null,
        personalPhone: null,
        educationSchoolName: null,
        educationDegreeType: null,
        educationMajor: null,
        motivationText: null,
        additionalInfo: null,
        job: null
      };
    }

    const jobRaw = jobsById[app.jobId] || null;
    const job = jobRaw
      ? this._resolveJobForeignKeys(jobRaw, departmentsById, locationsById)
      : null;

    return {
      applicationId: app.id,
      jobId: app.jobId,
      status: app.status,
      currentStep: app.currentStep,
      personalFirstName: app.personalFirstName || null,
      personalLastName: app.personalLastName || null,
      personalEmail: app.personalEmail || null,
      personalPhone: app.personalPhone || null,
      educationSchoolName: app.educationSchoolName || null,
      educationDegreeType: app.educationDegreeType || null,
      educationMajor: app.educationMajor || null,
      motivationText: app.motivationText || null,
      additionalInfo: app.additionalInfo || null,
      job: job
    };
  }

  // 21. updateJobApplicationPersonalInfo
  updateJobApplicationPersonalInfo(
    applicationId,
    firstName,
    lastName,
    email,
    phone,
    advanceToNextStep
  ) {
    if (!applicationId) {
      return {
        applicationId: null,
        status: null,
        currentStep: null
      };
    }
    let apps = this._getOrCreateApplicationStore();
    let app = null;
    for (let i = 0; i < apps.length; i++) {
      if (apps[i].id === applicationId) {
        app = apps[i];
        break;
      }
    }
    if (!app) {
      return {
        applicationId: null,
        status: null,
        currentStep: null
      };
    }

    app.personalFirstName = firstName;
    app.personalLastName = lastName;
    app.personalEmail = email;
    app.personalPhone = phone || null;
    const advance = advanceToNextStep !== false; // default true
    if (advance) {
      app.currentStep = 'education';
    }
    app.updatedAt = this._nowIso();

    this._saveApplicationStore(apps);

    return {
      applicationId: app.id,
      status: app.status,
      currentStep: app.currentStep
    };
  }

  // 22. updateJobApplicationEducation
  updateJobApplicationEducation(
    applicationId,
    schoolName,
    degreeType,
    major,
    advanceToNextStep
  ) {
    if (!applicationId) {
      return {
        applicationId: null,
        status: null,
        currentStep: null
      };
    }
    let apps = this._getOrCreateApplicationStore();
    let app = null;
    for (let i = 0; i < apps.length; i++) {
      if (apps[i].id === applicationId) {
        app = apps[i];
        break;
      }
    }
    if (!app) {
      return {
        applicationId: null,
        status: null,
        currentStep: null
      };
    }

    app.educationSchoolName = schoolName;
    app.educationDegreeType = degreeType;
    app.educationMajor = major;
    const advance = advanceToNextStep !== false; // default true
    if (advance) {
      app.currentStep = 'motivation';
    }
    app.updatedAt = this._nowIso();

    this._saveApplicationStore(apps);

    return {
      applicationId: app.id,
      status: app.status,
      currentStep: app.currentStep
    };
  }

  // 23. updateJobApplicationMotivation
  updateJobApplicationMotivation(
    applicationId,
    motivationText,
    additionalInfo,
    advanceToReview
  ) {
    if (!applicationId) {
      return {
        applicationId: null,
        status: null,
        currentStep: null
      };
    }

    let apps = this._getOrCreateApplicationStore();
    let app = null;
    for (let i = 0; i < apps.length; i++) {
      if (apps[i].id === applicationId) {
        app = apps[i];
        break;
      }
    }
    if (!app) {
      return {
        applicationId: null,
        status: null,
        currentStep: null
      };
    }

    app.motivationText = motivationText;
    app.additionalInfo = additionalInfo || null;
    const advance = advanceToReview !== false; // default true
    if (advance) {
      app.currentStep = 'review';
    }
    app.updatedAt = this._nowIso();

    this._saveApplicationStore(apps);

    return {
      applicationId: app.id,
      status: app.status,
      currentStep: app.currentStep
    };
  }

  // 24. submitJobApplication
  submitJobApplication(applicationId) {
    if (!applicationId) {
      return {
        applicationId: null,
        status: null,
        currentStep: null,
        confirmationMessage: 'applicationId is required.'
      };
    }

    let apps = this._getOrCreateApplicationStore();
    let app = null;
    for (let i = 0; i < apps.length; i++) {
      if (apps[i].id === applicationId) {
        app = apps[i];
        break;
      }
    }

    if (!app) {
      return {
        applicationId: null,
        status: null,
        currentStep: null,
        confirmationMessage: 'Application not found.'
      };
    }

    app.status = 'submitted';
    app.currentStep = 'submitted';
    app.updatedAt = this._nowIso();
    this._saveApplicationStore(apps);

    return {
      applicationId: app.id,
      status: app.status,
      currentStep: app.currentStep,
      confirmationMessage: 'Application submitted successfully.'
    };
  }

  // 25. getWorkingHereContent
  getWorkingHereContent(tab, audience) {
    let tabTitle = '';
    let tabBody = '';

    if (tab === 'culture') {
      tabTitle = 'Our Culture';
      tabBody =
        'Learn about our mission-driven culture, interdisciplinary teams, and commitment to patient-centered care.';
    } else if (tab === 'benefits') {
      tabTitle = 'Benefits';
      tabBody =
        'Explore comprehensive benefits designed to support your wellbeing at work and at home.';
    } else if (tab === 'career_development') {
      tabTitle = 'Career Development';
      tabBody =
        'Grow your career with ongoing education, mentorship, and leadership opportunities.';
    } else {
      tabTitle = 'Working Here';
      tabBody = 'Learn more about careers at our organization.';
    }

    const audienceText = audience || 'all_employees';

    const sections = [
      {
        heading: 'Who we hire',
        body:
          'We welcome professionals across nursing, allied health, pharmacy, laboratory services, physicians, and support roles.'
      },
      {
        heading: 'Inclusive environment',
        body:
          'Our teams reflect the diversity of the communities we serve and foster an inclusive, respectful workplace.'
      }
    ];

    return {
      tabTitle: tabTitle,
      tabBody: tabBody + ' Audience: ' + audienceText + '.',
      sections: sections
    };
  }

  // 26. getBenefitResources
  getBenefitResources(audience) {
    const all = this._getFromStorage('benefit_resources');
    if (!audience) return all;
    return all.filter((r) => r && r.audience === audience);
  }

  // 27. getBenefitResourceDetails
  getBenefitResourceDetails(resourceId) {
    const all = this._getFromStorage('benefit_resources');
    let resource = null;
    for (let i = 0; i < all.length; i++) {
      if (all[i].id === resourceId) {
        resource = all[i];
        break;
      }
    }

    // Instrumentation for task completion tracking
    try {
      if (resource) {
        let openedRaw = localStorage.getItem('task7_openedResourceIds');
        let opened = [];
        if (openedRaw) {
          try {
            const parsed = JSON.parse(openedRaw);
            if (Array.isArray(parsed)) {
              opened = parsed;
            }
          } catch (e2) {
            // Ignore JSON parse errors for instrumentation
          }
        }
        if (opened.indexOf(resourceId) === -1) {
          opened.push(resourceId);
        }
        localStorage.setItem('task7_openedResourceIds', JSON.stringify(opened));
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      resource: resource
    };
  }

  // 28. saveBenefitResourceToMyResources
  saveBenefitResourceToMyResources(resourceId, notes) {
    if (!resourceId) {
      return {
        success: false,
        savedResource: null,
        message: 'resourceId is required.'
      };
    }

    const resources = this._getFromStorage('benefit_resources');
    let existsResource = false;
    for (let i = 0; i < resources.length; i++) {
      if (resources[i].id === resourceId) {
        existsResource = true;
        break;
      }
    }
    if (!existsResource) {
      return {
        success: false,
        savedResource: null,
        message: 'Benefit resource not found.'
      };
    }

    let savedStore = this._getOrCreateSavedResourcesStore();

    // Avoid duplicate saved resources
    for (let i = 0; i < savedStore.length; i++) {
      if (savedStore[i].resourceId === resourceId) {
        return {
          success: true,
          savedResource: savedStore[i],
          message: 'Resource already saved.'
        };
      }
    }

    const entry = {
      id: this._generateId('savedres'),
      resourceId: resourceId,
      savedAt: this._nowIso(),
      notes: notes || null
    };

    savedStore.push(entry);
    this._saveSavedResourcesStore(savedStore);

    return {
      success: true,
      savedResource: entry,
      message: 'Resource saved to My Resources.'
    };
  }

  // 29. getSavedResources
  getSavedResources() {
    const saved = this._getFromStorage('saved_resources');
    const resources = this._getFromStorage('benefit_resources');
    const resourcesById = this._indexById(resources);

    return saved.map((s) => {
      return {
        savedResourceId: s.id,
        savedAt: s.savedAt,
        notes: s.notes || null,
        resource: resourcesById[s.resourceId] || null
      };
    });
  }

  // 30. removeSavedResource
  removeSavedResource(savedResourceId) {
    if (!savedResourceId) {
      return {
        success: false
      };
    }
    let saved = this._getFromStorage('saved_resources');
    const before = saved.length;
    saved = saved.filter((s) => s.id !== savedResourceId);
    this._saveToStorage('saved_resources', saved);
    return {
      success: saved.length !== before
    };
  }

  // 31. getJobSearchMapPins
  getJobSearchMapPins(keyword, employmentTypeFilters, departmentIds, jobTypeFilters) {
    const jobs = this._getFromStorage('jobs');
    const locations = this._getFromStorage('locations');
    const departments = this._getFromStorage('departments');

    const locationsById = this._indexById(locations);
    const departmentsById = this._indexById(departments);

    const kw = keyword ? String(keyword).toLowerCase() : null;
    const empSet = {};
    const depSet = {};
    const jtSet = {};

    if (Array.isArray(employmentTypeFilters)) {
      for (let i = 0; i < employmentTypeFilters.length; i++) {
        empSet[employmentTypeFilters[i]] = true;
      }
    }
    if (Array.isArray(departmentIds)) {
      for (let i = 0; i < departmentIds.length; i++) {
        depSet[departmentIds[i]] = true;
      }
    }
    if (Array.isArray(jobTypeFilters)) {
      for (let i = 0; i < jobTypeFilters.length; i++) {
        jtSet[jobTypeFilters[i]] = true;
      }
    }

    const countsByLocationId = {};

    for (let i = 0; i < jobs.length; i++) {
      const job = jobs[i];
      if (!job) continue;

      if (kw) {
        const title = (job.title || '').toLowerCase();
        const desc = (job.description || '').toLowerCase();
        const dept = (job.departmentName || '').toLowerCase();
        if (
          title.indexOf(kw) === -1 &&
          desc.indexOf(kw) === -1 &&
          dept.indexOf(kw) === -1
        ) {
          continue;
        }
      }

      if (employmentTypeFilters && employmentTypeFilters.length) {
        if (!empSet[job.employmentType]) continue;
      }

      if (departmentIds && departmentIds.length) {
        if (!depSet[job.departmentId]) continue;
      }

      if (jobTypeFilters && jobTypeFilters.length) {
        if (!jtSet[job.jobType]) continue;
      }

      const locId = job.locationId;
      if (!locId) continue;
      if (!countsByLocationId[locId]) {
        countsByLocationId[locId] = 0;
      }
      countsByLocationId[locId]++;
    }

    const pins = [];
    const locIds = Object.keys(countsByLocationId);
    for (let i = 0; i < locIds.length; i++) {
      const id = locIds[i];
      const loc = locationsById[id];
      if (!loc) continue;
      pins.push({
        locationId: loc.id,
        name: loc.name,
        displayLabel: loc.displayLabel || loc.name,
        latitude: loc.latitude != null ? loc.latitude : null,
        longitude: loc.longitude != null ? loc.longitude : null,
        jobCount: countsByLocationId[id],
        location: loc
      });
    }

    return pins;
  }

  // 32. getEventsFilterOptions
  getEventsFilterOptions() {
    return {
      eventTypes: [
        { value: 'virtual', label: 'Virtual' },
        { value: 'in_person', label: 'In person' }
      ],
      professionAudiences: [
        { value: 'pharmacy', label: 'Pharmacy' },
        { value: 'nursing', label: 'Nursing' },
        { value: 'physicians', label: 'Physicians' },
        { value: 'allied_health', label: 'Allied health' },
        { value: 'general', label: 'General audience' }
      ]
    };
  }

  // 33. searchEvents
  searchEvents(eventType, professionAudience, startDate, endDate) {
    const events = this._getFromStorage('events');

    const et = eventType || null;
    const pa = professionAudience || null;
    const startTime = startDate ? new Date(startDate).getTime() : null;
    const endTime = endDate ? new Date(endDate).getTime() : null;

    const result = [];

    for (let i = 0; i < events.length; i++) {
      const e = events[i];
      if (!e) continue;
      if (et && e.eventType !== et) continue;
      if (pa && e.professionAudience !== pa) continue;

      if (startTime != null || endTime != null) {
        const st = e.startDateTime ? new Date(e.startDateTime).getTime() : null;
        if (st == null) continue;
        if (startTime != null && st < startTime) continue;
        if (endTime != null && st > endTime) continue;
      }

      result.push(e);
    }

    return result;
  }

  // 34. getEventDetails
  getEventDetails(eventId) {
    const events = this._getFromStorage('events');
    const registrations = this._getFromStorage('event_registrations');

    let event = null;
    for (let i = 0; i < events.length; i++) {
      if (events[i].id === eventId) {
        event = events[i];
        break;
      }
    }

    let isRegistered = false;
    if (event) {
      for (let i = 0; i < registrations.length; i++) {
        if (registrations[i].eventId === eventId) {
          isRegistered = true;
          break;
        }
      }
    }

    return {
      event: event,
      isRegistered: isRegistered
    };
  }

  // 35. registerForEvent
  registerForEvent(eventId, firstName, lastName, email, currentRole) {
    if (!eventId || !firstName || !lastName || !email) {
      return {
        registrationId: null,
        eventId: eventId || null,
        success: false,
        confirmationMessage: 'eventId, firstName, lastName, and email are required.'
      };
    }

    const events = this._getFromStorage('events');
    let eventExists = false;
    for (let i = 0; i < events.length; i++) {
      if (events[i].id === eventId) {
        eventExists = true;
        break;
      }
    }

    if (!eventExists) {
      return {
        registrationId: null,
        eventId: eventId,
        success: false,
        confirmationMessage: 'Event not found.'
      };
    }

    let regs = this._getOrCreateEventRegistrationStore();

    const reg = {
      id: this._generateId('eventreg'),
      eventId: eventId,
      firstName: firstName,
      lastName: lastName,
      email: email,
      currentRole: currentRole || null,
      registrationDateTime: this._nowIso()
    };

    regs.push(reg);
    this._saveEventRegistrationStore(regs);

    return {
      registrationId: reg.id,
      eventId: eventId,
      success: true,
      confirmationMessage: 'You are registered for the event.'
    };
  }

  // 36. getAboutUsContent
  getAboutUsContent() {
    return {
      mission:
        'We advance health and healing through compassionate care, innovation, and education.',
      values:
        'We value safety, integrity, respect, teamwork, and excellence across every role.',
      history:
        'Our health system has grown from a single hospital to a regional network of care sites.',
      locationsOverview:
        'We serve patients across hospitals, clinics, and outpatient centers, as well as through virtual care.'
    };
  }

  // 37. getContactInfo
  getContactInfo() {
    return {
      emailAddresses: ['careers@examplehealth.org'],
      phoneNumbers: ['+1-800-555-0123'],
      mailingAddress: 'Recruitment Office, Example Health, 123 Wellness Way, Anytown, ST 00000',
      additionalSupportLinks: [
        {
          label: 'Frequently asked questions',
          url: '/careers/faq'
        }
      ]
    };
  }

  // 38. submitContactInquiry
  submitContactInquiry(name, email, topic, message) {
    if (!name || !email || !message) {
      return {
        success: false,
        referenceId: null,
        confirmationMessage: 'Name, email, and message are required.'
      };
    }

    let inquiries = this._getFromStorage('contact_inquiries');
    if (!Array.isArray(inquiries)) {
      inquiries = [];
    }

    const entry = {
      id: this._generateId('contact'),
      name: name,
      email: email,
      topic: topic || null,
      message: message,
      submittedAt: this._nowIso()
    };

    inquiries.push(entry);
    this._saveToStorage('contact_inquiries', inquiries);

    return {
      success: true,
      referenceId: entry.id,
      confirmationMessage:
        'Thank you for contacting us. A member of our recruitment team will follow up.'
    };
  }

  // 39. getPrivacyPolicyContent
  getPrivacyPolicyContent() {
    return {
      lastUpdated: '2024-01-01',
      sections: [
        {
          heading: 'Introduction',
          body:
            'This privacy policy describes how we collect, use, and protect information you provide when using our careers website.'
        },
        {
          heading: 'Data we collect',
          body:
            'We may collect contact details, application materials, and site usage analytics to support recruitment activities.'
        },
        {
          heading: 'How we use your data',
          body:
            'Your information is used to process applications, communicate with you about opportunities, and improve our recruitment services.'
        }
      ]
    };
  }

  // 40. getTermsOfUseContent
  getTermsOfUseContent() {
    return {
      lastUpdated: '2024-01-01',
      sections: [
        {
          heading: 'Acceptance of terms',
          body:
            'By using this careers website, you agree to these terms of use and any applicable policies referenced herein.'
        },
        {
          heading: 'Use of the site',
          body:
            'You agree to provide accurate information in your applications and to use the site only for lawful job search activities.'
        },
        {
          heading: 'No employment guarantee',
          body:
            'Submitting an application or profile does not guarantee employment or an interview.'
        }
      ]
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