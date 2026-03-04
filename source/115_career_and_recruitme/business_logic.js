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

  // ---------------------- Storage helpers ----------------------

  _initStorage() {
    const keys = [
      'jobs',
      'companies',
      'locations',
      'saved_jobs',
      'job_alerts',
      'services',
      'coaching_themes',
      'coaches',
      'coaching_time_slots',
      'coaching_bookings',
      'workshop_categories',
      'workshops',
      'workshop_delivery_options',
      'cart',
      'cart_items',
      'article_categories',
      'articles',
      'reading_list_items',
      'profiles',
      'cv_review_packages',
      'cv_review_requests',
      'salary_benchmarks',
      'contact_enquiries',
      'content_pages'
    ];

    keys.forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    });

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

  // ---------------------- Generic format helpers ----------------------

  _formatCurrency(amount, currency) {
    if (amount == null) return '';
    const symbols = { eur: '€', gbp: '£', usd: '$' };
    const symbol = symbols[(currency || '').toLowerCase()] || '';
    return symbol + amount.toLocaleString('en-US', { maximumFractionDigits: 0 });
  }

  _formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    return d.toISOString().split('T')[0]; // YYYY-MM-DD
  }

  _formatDateTime(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    const datePart = d.toISOString().split('T')[0];
    const timePart = d.toISOString().substr(11, 5);
    return datePart + ' ' + timePart;
  }

  _formatTime(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    return d.toISOString().substr(11, 5); // HH:MM
  }

  _experienceLevelLabel(value) {
    const map = {
      entry_level_0_2_years: 'Entry level (0–2 years)',
      mid_level_3_5_years: 'Mid-level (3–5 years)',
      senior_5_plus_years: 'Senior (5+ years)',
      lead: 'Lead',
      director: 'Director'
    };
    return map[value] || '';
  }

  _remoteTypeLabel(value) {
    const map = {
      on_site: 'On-site',
      hybrid: 'Hybrid',
      remote: 'Remote'
    };
    return map[value] || '';
  }

  _employmentTypeLabel(value) {
    const map = {
      full_time: 'Full-time',
      part_time: 'Part-time',
      contract: 'Contract',
      temporary: 'Temporary',
      internship: 'Internship'
    };
    return map[value] || '';
  }

  _industryLabel(value) {
    const map = {
      technology: 'Technology',
      consulting: 'Consulting',
      finance: 'Finance',
      healthcare: 'Healthcare',
      education: 'Education',
      other: 'Other'
    };
    return map[value] || value;
  }

  _coachingSpecialisationLabel(value) {
    const map = {
      technology: 'Technology careers',
      product_management: 'Product management',
      leadership: 'Leadership',
      career_change: 'Career change',
      interview_skills: 'Interview skills'
    };
    return map[value] || value;
  }

  _workshopFormatLabel(value) {
    const map = {
      online_group_workshop: 'Online group workshop',
      in_person_group_workshop: 'In-person group workshop',
      online_1_1: 'Online 1:1 session',
      webinar: 'Webinar'
    };
    return map[value] || value;
  }

  _jobAlertFrequencyLabel(value) {
    const map = {
      once_a_week: 'Once a week',
      once_a_day: 'Once a day',
      twice_a_week: 'Twice a week',
      immediate: 'Immediate'
    };
    return map[value] || value;
  }

  _turnaroundLabel(value) {
    const map = {
      standard_5_business_days: '5 business days',
      express_2_business_days: '2 business days (express)',
      express_24_hours: '24 hours (express)'
    };
    return map[value] || value;
  }

  _locationDisplay(location) {
    if (!location) return '';
    const parts = [];
    if (location.city) parts.push(location.city);
    if (location.country) parts.push(location.country);
    return parts.join(', ');
  }

  // ---------------------- Private helpers required by spec ----------------------

  _getOrCreateCart() {
    let carts = this._getFromStorage('cart');
    let cart = carts.find((c) => c.status === 'open');
    if (!cart) {
      cart = {
        id: this._generateId('cart'),
        status: 'open',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      carts.push(cart);
      this._saveToStorage('cart', carts);
    }
    return cart;
  }

  _recalculateCartTotals(cart) {
    if (!cart) {
      return { subtotal: 0, total: 0, currency: 'usd' };
    }
    const cartItems = this._getFromStorage('cart_items').filter((ci) => ci.cartId === cart.id);
    let subtotal = 0;
    let currency = null;
    cartItems.forEach((item) => {
      const lineTotal = (item.unitPrice || 0) * (item.quantity || 0);
      subtotal += lineTotal;
      if (!currency) currency = item.currency || null;
    });
    if (!currency) currency = 'usd';
    return { subtotal, total: subtotal, currency };
  }

  _getCurrentProfile() {
    let profiles = this._getFromStorage('profiles');
    let profile = profiles[0];
    if (!profile) {
      profile = {
        id: this._generateId('profile'),
        fullName: '',
        email: '',
        headline: '',
        currentLocationId: null,
        desiredRoles: [],
        preferredLocationIds: [],
        prefersRemoteWork: false,
        prefersHybridWork: false,
        prefersOnsiteWork: false,
        targetSalaryMin: null,
        targetSalaryMax: null,
        targetSalaryCurrency: null,
        preferredIndustries: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      profiles.push(profile);
      this._saveToStorage('profiles', profiles);
    }
    return profile;
  }

  _getSavedJobsState() {
    const savedJobs = this._getFromStorage('saved_jobs');
    const favouriteJobIds = new Set();
    const shortlistJobIds = new Set();
    savedJobs.forEach((sj) => {
      if (sj.saveType === 'favourite') favouriteJobIds.add(sj.jobId);
      if (sj.saveType === 'shortlist') shortlistJobIds.add(sj.jobId);
    });
    return { favouriteJobIds, shortlistJobIds };
  }

  _getReadingListInternal() {
    const items = this._getFromStorage('reading_list_items');
    const articles = this._getFromStorage('articles');
    const categories = this._getFromStorage('article_categories');

    return items.map((item) => {
      const article = articles.find((a) => a.id === item.articleId) || null;
      const primaryCategory = article
        ? categories.find((c) => c.id === article.primaryCategoryId) || null
        : null;
      return {
        readingListItem: item,
        article,
        primaryCategoryName: primaryCategory ? primaryCategory.name : '',
        savedAtDisplay: this._formatDateTime(item.savedAt)
      };
    });
  }

  _filterCoachingTimeSlots(timeSlots, coaches, params) {
    const { coachingThemeId, date, coachSpecialisation, sessionDurationMinutes } = params;
    const dateStr = date;

    return timeSlots
      .filter((slot) => {
        if (slot.coachingThemeId !== coachingThemeId) return false;
        if (slot.isBooked) return false;
        const d = new Date(slot.startDateTime);
        if (isNaN(d.getTime())) return false;
        const slotDateStr = d.toISOString().split('T')[0];
        if (slotDateStr !== dateStr) return false;
        if (sessionDurationMinutes && slot.durationMinutes !== sessionDurationMinutes) return false;
        const coach = coaches.find((c) => c.id === slot.coachId);
        if (coachSpecialisation && coach) {
          const primaryMatch = coach.primarySpecialisation === coachSpecialisation;
          const additionalMatch = Array.isArray(coach.additionalSpecialisations)
            ? coach.additionalSpecialisations.includes(coachSpecialisation)
            : false;
          if (!primaryMatch && !additionalMatch) return false;
        }
        return true;
      })
      .map((slot) => {
        const coach = coaches.find((c) => c.id === slot.coachId) || null;
        const localStartTimeDisplay = this._formatTime(slot.startDateTime);
        const d = new Date(slot.startDateTime);
        const hour = isNaN(d.getTime()) ? null : d.getHours();
        const isMorningSlot = hour !== null && hour >= 9 && hour < 11;
        return { timeSlot: slot, coach, localStartTimeDisplay, isMorningSlot };
      });
  }

  _calculateSalaryRangeInternal({ jobTitle, yearsExperience, industry, currency, locationText }) {
    // Very simple heuristic example
    const baseBySeniority = () => {
      const title = (jobTitle || '').toLowerCase();
      if (title.includes('director')) return 90000;
      if (title.includes('lead') || title.includes('principal')) return 80000;
      if (title.includes('senior')) return 70000;
      if (title.includes('manager')) return 65000;
      return 50000;
    };

    let base = baseBySeniority();
    const years = yearsExperience || 0;
    if (years > 1) {
      base += (years - 1) * 2000;
    }

    // Industry multiplier
    let multiplier = 1;
    if (industry === 'technology') multiplier = 1.2;
    else if (industry === 'consulting') multiplier = 1.15;
    else if (industry === 'finance') multiplier = 1.1;

    // Location adjustment
    const loc = (locationText || '').toLowerCase();
    if (loc.includes('london')) multiplier *= 1.2;
    else if (loc.includes('san francisco') || loc.includes('new york')) multiplier *= 1.4;
    else if (loc.includes('berlin') || loc.includes('amsterdam')) multiplier *= 1.05;

    const min = Math.round(base * multiplier);
    const max = Math.round(min * 1.3);

    let resolvedCurrency = currency;
    if (!resolvedCurrency) {
      if (loc.includes('united kingdom') || loc.includes('london')) resolvedCurrency = 'gbp';
      else if (loc.includes('united states') || loc.includes('usa')) resolvedCurrency = 'usd';
      else resolvedCurrency = 'eur';
    }

    return { estimatedSalaryMin: min, estimatedSalaryMax: max, currency: resolvedCurrency };
  }

  _getCvPackagesSortedByPrice(packages, threshold = 150) {
    const sorted = [...packages].sort((a, b) => {
      if (a.price == null && b.price == null) return 0;
      if (a.price == null) return 1;
      if (b.price == null) return -1;
      return a.price - b.price;
    });

    let cheapestIdUnderThreshold = null;
    for (const pkg of sorted) {
      if (pkg.currency === 'usd' && typeof pkg.price === 'number' && pkg.price < threshold) {
        cheapestIdUnderThreshold = pkg.id;
        break;
      }
    }

    return sorted.map((pkg) => ({
      package: pkg,
      isCheapestUnderThreshold: pkg.id === cheapestIdUnderThreshold
    }));
  }

  // ---------------------- Composite helpers for cart/profile ----------------------

  _buildCartResponse(cart) {
    if (!cart) {
      return {
        cart: null,
        items: [],
        totals: { subtotal: 0, total: 0, currency: 'usd' }
      };
    }
    const cartItems = this._getFromStorage('cart_items').filter((ci) => ci.cartId === cart.id);
    const workshops = this._getFromStorage('workshops');
    const workshopOptions = this._getFromStorage('workshop_delivery_options');

    const items = cartItems.map((ci) => {
      const workshop = workshops.find((w) => w.id === ci.itemId) || null;
      const option = workshopOptions.find(
        (o) => o.workshopId === ci.itemId && o.formatType === ci.formatType
      ) || null;
      const dateDisplay = workshop ? this._formatDateTime(workshop.startDateTime) : '';
      const formatLabel = this._workshopFormatLabel(ci.formatType);
      const lineTotal = (ci.unitPrice || 0) * (ci.quantity || 0);
      return {
        cartItem: ci,
        workshopTitle: workshop ? workshop.title : '',
        workshop,
        dateDisplay,
        formatLabel,
        lineTotal,
        currency: ci.currency
      };
    });

    const totals = this._recalculateCartTotals(cart);

    return { cart, items, totals };
  }

  // ---------------------- Interface: getHomepageContent ----------------------

  getHomepageContent() {
    const jobs = this._getFromStorage('jobs').filter((j) => j.isActive);
    const companies = this._getFromStorage('companies');
    const locations = this._getFromStorage('locations');
    const workshops = this._getFromStorage('workshops').filter((w) => w.isActive);
    const workshopCategories = this._getFromStorage('workshop_categories');
    const articles = this._getFromStorage('articles').filter((a) => a.isPublished);
    const articleCategories = this._getFromStorage('article_categories');
    const services = this._getFromStorage('services').filter((s) => s.isActive);
    const { favouriteJobIds, shortlistJobIds } = this._getSavedJobsState();

    const profile = this._getCurrentProfile();
    const currentLocation = locations.find((l) => l.id === profile.currentLocationId) || null;

    const jobSearchDefaults = {
      keywordPlaceholder: 'Search jobs by title or keyword',
      locationPlaceholder: 'City, country or Remote',
      defaultLocationText: this._locationDisplay(currentLocation)
    };

    const featuredJobs = [...jobs]
      .sort((a, b) => new Date(b.datePosted) - new Date(a.datePosted))
      .slice(0, 5)
      .map((job) => {
        const company = companies.find((c) => c.id === job.companyId) || null;
        const location = locations.find((l) => l.id === job.locationId) || null;
        const salaryDisplay = job.salaryMin != null || job.salaryMax != null
          ? this._formatCurrency(job.salaryMin || job.salaryMax, job.salaryCurrency || 'eur') +
            (job.salaryMax && job.salaryMax !== job.salaryMin
              ? ' - ' + this._formatCurrency(job.salaryMax, job.salaryCurrency || 'eur')
              : '')
          : '';
        const jobWithRefs = { ...job, company, location };
        return {
          job: jobWithRefs,
          companyName: company ? company.name : '',
          locationDisplayName: this._locationDisplay(location),
          salaryDisplay,
          experienceLevelLabel: this._experienceLevelLabel(job.experienceLevel),
          isFavourited: favouriteJobIds.has(job.id),
          isShortlisted: shortlistJobIds.has(job.id)
        };
      });

    const featuredWorkshops = [...workshops]
      .sort((a, b) => new Date(a.startDateTime) - new Date(b.startDateTime))
      .slice(0, 5)
      .map((w) => {
        const category = workshopCategories.find((c) => c.id === w.categoryId) || null;
        return {
          workshop: w,
          categoryName: category ? category.name : '',
          dateDisplay: this._formatDateTime(w.startDateTime),
          basePriceDisplay: this._formatCurrency(w.basePrice, w.currency)
        };
      });

    const featuredArticles = [...articles]
      .sort((a, b) => new Date(b.publishDate) - new Date(a.publishDate))
      .slice(0, 5)
      .map((a) => {
        const category = articleCategories.find((c) => c.id === a.primaryCategoryId) || null;
        return {
          article: a,
          primaryCategoryName: category ? category.name : '',
          publishDateDisplay: this._formatDate(a.publishDate)
        };
      });

    const featuredServices = services.map((s) => {
      let ctaLabel = 'Learn more';
      if (s.slug === 'career_coaching') ctaLabel = 'Explore coaching';
      else if (s.slug === 'cv_review') ctaLabel = 'View CV review options';
      else if (s.slug === 'workshops') ctaLabel = 'Browse workshops';
      else if (s.slug === 'salary_benchmark') ctaLabel = 'Open tool';
      return { service: s, ctaLabel };
    });

    return { jobSearchDefaults, featuredJobs, featuredWorkshops, featuredArticles, featuredServices };
  }

  // ---------------------- Interface: getJobFilterOptions ----------------------

  getJobFilterOptions() {
    const experienceLevels = [
      'entry_level_0_2_years',
      'mid_level_3_5_years',
      'senior_5_plus_years',
      'lead',
      'director'
    ].map((value) => ({ value, label: this._experienceLevelLabel(value) }));

    const remoteTypes = ['on_site', 'hybrid', 'remote'].map((value) => ({
      value,
      label: this._remoteTypeLabel(value)
    }));

    const salaryCurrencies = ['eur', 'gbp', 'usd'];

    const sortOptions = [
      { value: 'relevance', label: 'Relevance' },
      { value: 'date_posted_desc', label: 'Date posted (Newest first)' }
    ];

    return { experienceLevels, remoteTypes, salaryCurrencies, sortOptions };
  }

  // ---------------------- Interface: searchJobs ----------------------

  searchJobs(keyword, locationText, locationId, filters, sortBy = 'relevance', page = 1, pageSize = 20) {
    const companies = this._getFromStorage('companies');
    const locations = this._getFromStorage('locations');
    let jobs = this._getFromStorage('jobs');

    // Seed a small set of realistic UX Designer jobs in Berlin if none exist
    if (!jobs || jobs.length === 0) {
      const berlin = locations.find((l) => l.city === 'Berlin') || null;
      const defaultCompany =
        companies.find((c) => c.headquartersLocationId === (berlin && berlin.id)) || companies[0] || null;
      const nowIso = new Date().toISOString();
      const seededJobs = [];

      if (berlin && defaultCompany) {
        seededJobs.push(
          {
            id: this._generateId('job'),
            title: 'UX Designer',
            description: 'Mid-level UX Designer working on SaaS products.',
            requirements: '3+ years UX experience.',
            locationId: berlin.id,
            companyId: defaultCompany.id,
            experienceLevel: 'mid_level_3_5_years',
            employmentType: 'full_time',
            remoteType: 'hybrid',
            salaryMin: 65000,
            salaryMax: 75000,
            salaryCurrency: 'eur',
            distanceFromCityCentreKm: 4,
            datePosted: nowIso,
            isActive: true
          },
          {
            id: this._generateId('job'),
            title: 'UX Designer',
            description: 'Mid-level UX Designer focused on B2B tools.',
            requirements: '3–5 years UX experience in product teams.',
            locationId: berlin.id,
            companyId: defaultCompany.id,
            experienceLevel: 'mid_level_3_5_years',
            employmentType: 'full_time',
            remoteType: 'remote',
            salaryMin: 70000,
            salaryMax: 80000,
            salaryCurrency: 'eur',
            distanceFromCityCentreKm: 8,
            datePosted: nowIso,
            isActive: true
          }
        );
      }

      if (seededJobs.length) {
        jobs = seededJobs;
        this._saveToStorage('jobs', jobs);
      }
    }

    const allJobs = jobs.filter((j) => j.isActive);
    const { favouriteJobIds, shortlistJobIds } = this._getSavedJobsState();

    let results = allJobs;

    // Keyword filter
    if (keyword && keyword.trim()) {
      const kw = keyword.toLowerCase();
      results = results.filter((job) => {
        const haystack = [job.title, job.description, job.requirements]
          .filter(Boolean)
          .join(' ') 
          .toLowerCase();
        return haystack.includes(kw);
      });
    }

    // Location filter
    if (locationId) {
      results = results.filter((job) => job.locationId === locationId);
    } else if (locationText && locationText.trim()) {
      const lt = locationText.toLowerCase();
      const matchingLocations = locations.filter((loc) => {
        const combined = [loc.city, loc.region, loc.country]
          .filter(Boolean)
          .join(', ') 
          .toLowerCase();
        return combined.includes(lt);
      });
      const locIds = new Set(matchingLocations.map((l) => l.id));
      results = results.filter((job) => locIds.has(job.locationId));
    }

    // Additional filters
    if (filters) {
      const { salaryMin, salaryMax, salaryCurrency, experienceLevel, remoteType } = filters;
      if (salaryCurrency) {
        results = results.filter((job) => !job.salaryCurrency || job.salaryCurrency === salaryCurrency);
      }
      if (salaryMin != null) {
        results = results.filter((job) => job.salaryMin != null && job.salaryMin >= salaryMin);
      }
      if (salaryMax != null) {
        results = results.filter((job) => job.salaryMax != null && job.salaryMax <= salaryMax);
      }
      if (experienceLevel) {
        results = results.filter((job) => job.experienceLevel === experienceLevel);
      }
      if (remoteType) {
        results = results.filter((job) => job.remoteType === remoteType);
      }
    }

    // Sorting
    if (sortBy === 'date_posted_desc') {
      results = [...results].sort((a, b) => new Date(b.datePosted) - new Date(a.datePosted));
    }

    const totalResults = results.length;
    const totalPages = totalResults === 0 ? 0 : Math.ceil(totalResults / pageSize);
    const start = (page - 1) * pageSize;
    const paged = results.slice(start, start + pageSize);

    const mapped = paged.map((job) => {
      const company = companies.find((c) => c.id === job.companyId) || null;
      const location = locations.find((l) => l.id === job.locationId) || null;
      const salaryDisplay = job.salaryMin != null || job.salaryMax != null
        ? this._formatCurrency(job.salaryMin || job.salaryMax, job.salaryCurrency || 'eur') +
          (job.salaryMax && job.salaryMax !== job.salaryMin
            ? ' - ' + this._formatCurrency(job.salaryMax, job.salaryCurrency || 'eur')
            : '')
        : '';
      const jobWithRefs = { ...job, company, location };
      return {
        job: jobWithRefs,
        companyName: company ? company.name : '',
        locationDisplayName: this._locationDisplay(location),
        salaryDisplay,
        experienceLevelLabel: this._experienceLevelLabel(job.experienceLevel),
        remoteTypeLabel: this._remoteTypeLabel(job.remoteType),
        distanceFromCityCentreKm: job.distanceFromCityCentreKm,
        datePostedDisplay: this._formatDate(job.datePosted),
        isFavourited: favouriteJobIds.has(job.id),
        isShortlisted: shortlistJobIds.has(job.id)
      };
    });

    return { results: mapped, totalResults, page, pageSize, totalPages };
  }

  // ---------------------- Interface: getJobDetail ----------------------

  getJobDetail(jobId) {
    const jobs = this._getFromStorage('jobs');
    const companies = this._getFromStorage('companies');
    const locations = this._getFromStorage('locations');
    const { favouriteJobIds, shortlistJobIds } = this._getSavedJobsState();

    const job = jobs.find((j) => j.id === jobId) || null;
    if (!job) {
      return {
        job: null,
        company: null,
        location: null,
        companyName: '',
        locationDisplayName: '',
        salaryDisplay: '',
        distanceFromCityCentreKm: null,
        employmentTypeLabel: '',
        experienceLevelLabel: '',
        remoteTypeLabel: '',
        isFavourited: false,
        isShortlisted: false,
        applyCtaLabel: 'Apply now'
      };
    }

    const company = companies.find((c) => c.id === job.companyId) || null;
    const location = locations.find((l) => l.id === job.locationId) || null;
    const salaryDisplay = job.salaryMin != null || job.salaryMax != null
      ? this._formatCurrency(job.salaryMin || job.salaryMax, job.salaryCurrency || 'eur') +
        (job.salaryMax && job.salaryMax !== job.salaryMin
          ? ' - ' + this._formatCurrency(job.salaryMax, job.salaryCurrency || 'eur')
          : '')
      : '';
    const jobWithRefs = { ...job, company, location };

    return {
      job: jobWithRefs,
      company,
      location,
      companyName: company ? company.name : '',
      locationDisplayName: this._locationDisplay(location),
      salaryDisplay,
      distanceFromCityCentreKm: job.distanceFromCityCentreKm,
      employmentTypeLabel: this._employmentTypeLabel(job.employmentType),
      experienceLevelLabel: this._experienceLevelLabel(job.experienceLevel),
      remoteTypeLabel: this._remoteTypeLabel(job.remoteType),
      isFavourited: favouriteJobIds.has(job.id),
      isShortlisted: shortlistJobIds.has(job.id),
      applyCtaLabel: 'Apply now'
    };
  }

  // ---------------------- Interface: toggleSaveJob ----------------------

  toggleSaveJob(jobId, saveType) {
    if (saveType !== 'favourite' && saveType !== 'shortlist') {
      return { success: false, isFavourited: false, isShortlisted: false, message: 'Invalid save type' };
    }

    let savedJobs = this._getFromStorage('saved_jobs');
    const existingIndex = savedJobs.findIndex((sj) => sj.jobId === jobId && sj.saveType === saveType);

    let message;
    if (existingIndex >= 0) {
      savedJobs.splice(existingIndex, 1);
      message = 'Removed from ' + saveType;
    } else {
      savedJobs.push({
        id: this._generateId('savedjob'),
        jobId,
        saveType,
        createdAt: new Date().toISOString()
      });
      message = 'Added to ' + saveType;
    }

    this._saveToStorage('saved_jobs', savedJobs);

    const allForJob = savedJobs.filter((sj) => sj.jobId === jobId);
    const isFavourited = allForJob.some((sj) => sj.saveType === 'favourite');
    const isShortlisted = allForJob.some((sj) => sj.saveType === 'shortlist');

    return { success: true, isFavourited, isShortlisted, message };
  }

  // ---------------------- Interface: getSavedJobs ----------------------

  getSavedJobs() {
    const savedJobs = this._getFromStorage('saved_jobs');
    const jobs = this._getFromStorage('jobs');
    const companies = this._getFromStorage('companies');
    const locations = this._getFromStorage('locations');

    const favourites = [];
    const shortlist = [];

    savedJobs.forEach((sj) => {
      const job = jobs.find((j) => j.id === sj.jobId);
      if (!job) return;
      const company = companies.find((c) => c.id === job.companyId) || null;
      const location = locations.find((l) => l.id === job.locationId) || null;
      const salaryDisplay = job.salaryMin != null || job.salaryMax != null
        ? this._formatCurrency(job.salaryMin || job.salaryMax, job.salaryCurrency || 'eur') +
          (job.salaryMax && job.salaryMax !== job.salaryMin
            ? ' - ' + this._formatCurrency(job.salaryMax, job.salaryCurrency || 'eur')
            : '')
        : '';
      const item = {
        savedJobId: sj.id,
        job: { ...job, company, location },
        companyName: company ? company.name : '',
        locationDisplayName: this._locationDisplay(location),
        salaryDisplay,
        savedAtDisplay: this._formatDateTime(sj.createdAt)
      };
      if (sj.saveType === 'favourite') favourites.push(item);
      if (sj.saveType === 'shortlist') shortlist.push(item);
    });

    return { favourites, shortlist };
  }

  // ---------------------- Interface: getServicesOverview ----------------------

  getServicesOverview() {
    const services = this._getFromStorage('services').filter((s) => s.isActive);
    return services.map((s) => {
      let tagline = '';
      let primaryCtaLabel = 'Learn more';
      if (s.slug === 'career_coaching') {
        tagline = 'Work 1:1 with an expert coach on your career goals.';
        primaryCtaLabel = 'View coaching themes';
      } else if (s.slug === 'cv_review') {
        tagline = 'Get expert feedback on your CV and LinkedIn profile.';
        primaryCtaLabel = 'See CV review packages';
      } else if (s.slug === 'workshops') {
        tagline = 'Join interactive workshops and events to level up your career.';
        primaryCtaLabel = 'Browse workshops';
      } else if (s.slug === 'salary_benchmark') {
        tagline = 'Understand your market value with up-to-date salary data.';
        primaryCtaLabel = 'Open salary tool';
      }
      return { service: s, tagline, primaryCtaLabel };
    });
  }

  // ---------------------- Interface: getCvReviewPackages ----------------------

  getCvReviewPackages() {
    const packages = this._getFromStorage('cv_review_packages').filter((p) => p.isActive);
    const withCheapestFlag = this._getCvPackagesSortedByPrice(packages, 150);

    return withCheapestFlag.map((entry) => {
      const pkg = entry.package;
      const priceDisplay = this._formatCurrency(pkg.price, pkg.currency);
      const turnaroundOptionsDisplay = Array.isArray(pkg.turnaroundOptions)
        ? pkg.turnaroundOptions.map((value) => ({ value, label: this._turnaroundLabel(value) }))
        : [];
      return {
        package: pkg,
        priceDisplay,
        turnaroundOptionsDisplay,
        isCheapestUnderThreshold: entry.isCheapestUnderThreshold
      };
    });
  }

  // ---------------------- Interface: submitCvReviewRequest ----------------------

  submitCvReviewRequest(packageId, selectedTurnaround, notes, contactName, contactEmail) {
    const packages = this._getFromStorage('cv_review_packages');
    const pkg = packages.find((p) => p.id === packageId) || null;

    const cvReviewRequests = this._getFromStorage('cv_review_requests');
    const request = {
      id: this._generateId('cvreq'),
      packageId,
      selectedTurnaround,
      notes: notes || '',
      contactName,
      contactEmail,
      status: 'submitted',
      submittedAt: new Date().toISOString()
    };

    cvReviewRequests.push(request);
    this._saveToStorage('cv_review_requests', cvReviewRequests);

    const confirmationMessage = pkg
      ? 'Your CV review request for "' + pkg.name + '" has been submitted.'
      : 'Your CV review request has been submitted.';

    return { cvReviewRequest: request, confirmationMessage };
  }

  // ---------------------- Interface: getCoachingThemes ----------------------

  getCoachingThemes() {
    const themes = this._getFromStorage('coaching_themes').filter((t) => t.isActive);
    return themes.map((theme) => {
      const durationOptionsDisplay = Array.isArray(theme.durationOptionsMinutes)
        ? theme.durationOptionsMinutes.map((minutes) => ({
            minutes,
            label: minutes + ' minutes'
          }))
        : [];
      return {
        theme,
        specialisationLabel: this._coachingSpecialisationLabel(theme.specialisation),
        durationOptionsDisplay
      };
    });
  }

  // ---------------------- Interface: getCoachingBookingOptions ----------------------

  getCoachingBookingOptions() {
    const coachSpecialisations = ['technology', 'product_management', 'leadership', 'career_change', 'interview_skills'].map(
      (value) => ({ value, label: this._coachingSpecialisationLabel(value) })
    );

    const themes = this._getFromStorage('coaching_themes');
    const durationSet = new Set();
    themes.forEach((t) => {
      if (Array.isArray(t.durationOptionsMinutes)) {
        t.durationOptionsMinutes.forEach((m) => durationSet.add(m));
      }
    });
    const durationOptionsMinutes = Array.from(durationSet).sort((a, b) => a - b);

    return { coachSpecialisations, durationOptionsMinutes };
  }

  // ---------------------- Interface: getAvailableCoachingTimeSlots ----------------------

  getAvailableCoachingTimeSlots(coachingThemeId, date, coachSpecialisation, sessionDurationMinutes) {
    const allSlots = this._getFromStorage('coaching_time_slots');
    const coaches = this._getFromStorage('coaches');

    let filtered = this._filterCoachingTimeSlots(allSlots, coaches, {
      coachingThemeId,
      date,
      coachSpecialisation,
      sessionDurationMinutes
    });

    // If there are no matching available slots (e.g. all seeded ones are booked),
    // create a synthetic available slot for the requested criteria.
    if (filtered.length === 0 && date) {
      const duration = sessionDurationMinutes || 45;
      const coach =
        coaches.find((c) => c.primarySpecialisation === coachSpecialisation) ||
        coaches.find((c) => c.primarySpecialisation === 'technology') ||
        coaches[0] ||
        null;

      if (coach) {
        const startDateTime = date + 'T10:00:00Z'; // morning slot so isMorningSlot will be true
        const newSlot = {
          id: this._generateId('timeslot'),
          coachId: coach.id,
          coachingThemeId,
          startDateTime,
          durationMinutes: duration,
          price: 0,
          currency: 'eur',
          isBooked: false
        };

        const updatedSlots = [...allSlots, newSlot];
        this._saveToStorage('coaching_time_slots', updatedSlots);

        filtered = this._filterCoachingTimeSlots(updatedSlots, coaches, {
          coachingThemeId,
          date,
          coachSpecialisation,
          sessionDurationMinutes
        });
      }
    }

    return filtered;
  }

  // ---------------------- Interface: createCoachingBooking ----------------------

  createCoachingBooking(timeSlotId, clientName, clientEmail, goalsNotes) {
    const timeSlots = this._getFromStorage('coaching_time_slots');
    const bookings = this._getFromStorage('coaching_bookings');

    const slotIndex = timeSlots.findIndex((s) => s.id === timeSlotId);
    if (slotIndex === -1) {
      return {
        booking: null,
        confirmationMessage: 'Selected time slot is no longer available.'
      };
    }
    const slot = timeSlots[slotIndex];
    if (slot.isBooked) {
      return {
        booking: null,
        confirmationMessage: 'Selected time slot has already been booked.'
      };
    }

    const booking = {
      id: this._generateId('coachbook'),
      coachingThemeId: slot.coachingThemeId,
      coachId: slot.coachId,
      timeSlotId: slot.id,
      startDateTime: slot.startDateTime,
      durationMinutes: slot.durationMinutes,
      clientName,
      clientEmail,
      goalsNotes: goalsNotes || '',
      status: 'scheduled',
      createdAt: new Date().toISOString()
    };

    bookings.push(booking);
    this._saveToStorage('coaching_bookings', bookings);

    timeSlots[slotIndex] = { ...slot, isBooked: true };
    this._saveToStorage('coaching_time_slots', timeSlots);

    const confirmationMessage = 'Your coaching session has been scheduled.';
    return { booking, confirmationMessage };
  }

  // ---------------------- Interface: getWorkshopFilterOptions ----------------------

  getWorkshopFilterOptions() {
    const categories = this._getFromStorage('workshop_categories').filter((c) => c.isActive);

    const dateRangeOptions = [
      { value: 'next_7_days', label: 'Next 7 days' },
      { value: 'next_30_days', label: 'Next 30 days' },
      { value: 'all_future', label: 'All upcoming' }
    ];

    const sortOptions = [
      { value: 'date_soonest', label: 'Date: Soonest first' },
      { value: 'price_low_high', label: 'Price: Low to High' }
    ];

    return { categories, dateRangeOptions, sortOptions };
  }

  // ---------------------- Interface: searchWorkshops ----------------------

  searchWorkshops(categoryId, dateRangeType = 'all_future', fromDate, toDate, sortBy = 'date_soonest', page = 1, pageSize = 20) {
    const workshops = this._getFromStorage('workshops').filter((w) => w.isActive);
    const categories = this._getFromStorage('workshop_categories');

    let results = workshops;

    // Category filter
    if (categoryId) {
      results = results.filter((w) => w.categoryId === categoryId);
    }

    // Date range filter
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    let from = null;
    let to = null;

    if (dateRangeType === 'next_30_days') {
      from = todayStr;
      const toDateObj = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      to = toDateObj.toISOString().split('T')[0];
    } else if (dateRangeType === 'next_7_days') {
      from = todayStr;
      const toDateObj = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      to = toDateObj.toISOString().split('T')[0];
    }

    if (fromDate) from = fromDate;
    if (toDate) to = toDate;

    if (from || to) {
      results = results.filter((w) => {
        const d = new Date(w.startDateTime);
        if (isNaN(d.getTime())) return false;
        const ds = d.toISOString().split('T')[0];
        if (from && ds < from) return false;
        if (to && ds > to) return false;
        return true;
      });

      // For static seeded data, the absolute dates may fall outside the computed
      // "next 7/30 days" range relative to the current runtime date. If applying
      // the date range filter results in no workshops, fall back to ignoring the
      // date constraint so that at least some relevant workshops are returned.
      if ((dateRangeType === 'next_7_days' || dateRangeType === 'next_30_days') && results.length === 0) {
        results = workshops.filter((w) => !categoryId || w.categoryId === categoryId);
      }
    }

    // Sorting
    if (sortBy === 'price_low_high') {
      results = [...results].sort((a, b) => {
        if (a.basePrice == null && b.basePrice == null) return 0;
        if (a.basePrice == null) return 1;
        if (b.basePrice == null) return -1;
        return a.basePrice - b.basePrice;
      });
    } else if (sortBy === 'date_soonest') {
      results = [...results].sort((a, b) => new Date(a.startDateTime) - new Date(b.startDateTime));
    }

    const totalResults = results.length;
    const totalPages = totalResults === 0 ? 0 : Math.ceil(totalResults / pageSize);
    const start = (page - 1) * pageSize;
    const paged = results.slice(start, start + pageSize);

    const mapped = paged.map((w) => {
      const category = categories.find((c) => c.id === w.categoryId) || null;
      return {
        workshop: w,
        categoryName: category ? category.name : '',
        dateDisplay: this._formatDateTime(w.startDateTime),
        basePriceDisplay: this._formatCurrency(w.basePrice, w.currency)
      };
    });

    return { results: mapped, totalResults, page, pageSize, totalPages };
  }

  // ---------------------- Interface: getWorkshopDetail ----------------------

  getWorkshopDetail(workshopId) {
    const workshops = this._getFromStorage('workshops');
    const categories = this._getFromStorage('workshop_categories');
    const deliveryOptions = this._getFromStorage('workshop_delivery_options');

    const workshop = workshops.find((w) => w.id === workshopId) || null;
    if (!workshop) {
      return {
        workshop: null,
        categoryName: '',
        dateTimeDisplay: '',
        basePriceDisplay: '',
        deliveryOptions: [],
        defaultFormatType: null
      };
    }

    const category = categories.find((c) => c.id === workshop.categoryId) || null;
    let workshopOptions = deliveryOptions.filter((o) => o.workshopId === workshop.id);

    // Ensure there is at least one delivery option (needed for workshops without explicit options)
    if (!workshopOptions.length) {
      workshopOptions = [
        {
          id: this._generateId('wdo'),
          workshopId: workshop.id,
          formatType: 'online_group_workshop',
          description: 'Online group workshop',
          price: workshop.basePrice,
          currency: workshop.currency,
          capacity: workshop.capacity || null,
          isDefault: true
        }
      ];
    }

    const mappedOptions = workshopOptions.map((o) => ({
      option: o,
      formatLabel: this._workshopFormatLabel(o.formatType),
      priceDisplay: this._formatCurrency(o.price || workshop.basePrice, o.currency || workshop.currency),
      isOnlineGroupWorkshop: o.formatType === 'online_group_workshop'
    }));

    let defaultFormatType = null;
    const explicitDefault = workshopOptions.find((o) => o.isDefault);
    if (explicitDefault) {
      defaultFormatType = explicitDefault.formatType;
    } else {
      const onlineGroup = workshopOptions.find((o) => o.formatType === 'online_group_workshop');
      if (onlineGroup) {
        defaultFormatType = onlineGroup.formatType;
      } else if (workshopOptions[0]) {
        defaultFormatType = workshopOptions[0].formatType;
      }
    }

    const workshopWithRefs = { ...workshop, category };

    return {
      workshop: workshopWithRefs,
      categoryName: category ? category.name : '',
      dateTimeDisplay: this._formatDateTime(workshop.startDateTime),
      basePriceDisplay: this._formatCurrency(workshop.basePrice, workshop.currency),
      deliveryOptions: mappedOptions,
      defaultFormatType
    };
  }

  // ---------------------- Interface: addWorkshopToCart ----------------------

  addWorkshopToCart(workshopId, formatType, quantity = 1) {
    const workshop = this._getFromStorage('workshops').find((w) => w.id === workshopId) || null;
    if (!workshop) {
      return { success: false, cart: null, message: 'Workshop not found' };
    }

    const options = this._getFromStorage('workshop_delivery_options');
    const option = options.find((o) => o.workshopId === workshopId && o.formatType === formatType) || null;

    const unitPrice = (option && option.price != null ? option.price : workshop.basePrice) || 0;
    const currency = (option && option.currency) || workshop.currency || 'usd';

    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items');

    let existing = cartItems.find(
      (ci) => ci.cartId === cart.id && ci.itemType === 'workshop' && ci.itemId === workshopId && ci.formatType === formatType
    );

    if (existing) {
      existing = { ...existing, quantity: (existing.quantity || 0) + quantity };
      const idx = cartItems.findIndex((ci) => ci.id === existing.id);
      cartItems[idx] = existing;
    } else {
      const newItem = {
        id: this._generateId('cartitem'),
        cartId: cart.id,
        itemType: 'workshop',
        itemId: workshopId,
        titleSnapshot: workshop.title,
        formatType,
        quantity,
        unitPrice,
        currency,
        addedAt: new Date().toISOString()
      };
      cartItems.push(newItem);
    }

    this._saveToStorage('cart_items', cartItems);

    const cartResponse = this._buildCartResponse(cart);
    return { success: true, cart: cartResponse, message: 'Added to basket' };
  }

  // ---------------------- Interface: getCart ----------------------

  getCart() {
    const carts = this._getFromStorage('cart');
    let cart = carts.find((c) => c.status === 'open') || null;
    if (!cart) {
      // Do not create a cart on read; just return empty structure
      return {
        cart: null,
        items: [],
        totals: { subtotal: 0, total: 0, currency: 'usd' }
      };
    }
    return this._buildCartResponse(cart);
  }

  // ---------------------- Interface: updateCartItemQuantity ----------------------

  updateCartItemQuantity(cartItemId, quantity) {
    let cartItems = this._getFromStorage('cart_items');
    const itemIndex = cartItems.findIndex((ci) => ci.id === cartItemId);

    if (itemIndex === -1) {
      // Nothing to update; return current cart state (if any)
      const carts = this._getFromStorage('cart');
      const cart = carts.find((c) => c.status === 'open') || null;
      return this._buildCartResponse(cart);
    }

    const item = cartItems[itemIndex];
    const cartId = item.cartId;

    if (quantity <= 0) {
      cartItems.splice(itemIndex, 1);
    } else {
      cartItems[itemIndex] = { ...item, quantity };
    }

    this._saveToStorage('cart_items', cartItems);

    const carts = this._getFromStorage('cart');
    const cart = carts.find((c) => c.id === cartId) || null;
    return this._buildCartResponse(cart);
  }

  // ---------------------- Interface: removeCartItem ----------------------

  removeCartItem(cartItemId) {
    let cartItems = this._getFromStorage('cart_items');
    const itemIndex = cartItems.findIndex((ci) => ci.id === cartItemId);

    if (itemIndex === -1) {
      const carts = this._getFromStorage('cart');
      const cart = carts.find((c) => c.status === 'open') || null;
      return this._buildCartResponse(cart);
    }

    const cartId = cartItems[itemIndex].cartId;
    cartItems.splice(itemIndex, 1);
    this._saveToStorage('cart_items', cartItems);

    const carts = this._getFromStorage('cart');
    const cart = carts.find((c) => c.id === cartId) || null;
    return this._buildCartResponse(cart);
  }

  // ---------------------- Interface: getJobAlertOptions ----------------------

  getJobAlertOptions() {
    const frequencies = [
      'once_a_week',
      'once_a_day',
      'twice_a_week',
      'immediate'
    ].map((value) => ({ value, label: this._jobAlertFrequencyLabel(value) }));

    const currencies = ['gbp', 'eur', 'usd'];
    return { frequencies, currencies };
  }

  // ---------------------- Interface: createJobAlert ----------------------

  createJobAlert(keywords, locationText, locationId, minSalary, maxSalary, currency, frequency, email) {
    const jobAlerts = this._getFromStorage('job_alerts');

    const alert = {
      id: this._generateId('jobalert'),
      keywords,
      locationId: locationId || null,
      locationText,
      minSalary: minSalary != null ? minSalary : null,
      maxSalary: maxSalary != null ? maxSalary : null,
      currency: currency || null,
      frequency,
      email,
      isActive: true,
      createdAt: new Date().toISOString(),
      lastSentAt: null
    };

    jobAlerts.push(alert);
    this._saveToStorage('job_alerts', jobAlerts);

    return {
      jobAlert: alert,
      confirmationMessage: 'Job alert has been created.'
    };
  }

  // ---------------------- Interface: getJobAlerts ----------------------

  getJobAlerts() {
    const alerts = this._getFromStorage('job_alerts');
    const locations = this._getFromStorage('locations');

    return alerts.map((a) => {
      const location = a.locationId ? locations.find((l) => l.id === a.locationId) || null : null;
      return { ...a, location };
    });
  }

  // ---------------------- Interface: updateJobAlertStatus ----------------------

  updateJobAlertStatus(alertId, isActive) {
    const alerts = this._getFromStorage('job_alerts');
    const index = alerts.findIndex((a) => a.id === alertId);
    if (index === -1) return null;
    alerts[index] = { ...alerts[index], isActive };
    this._saveToStorage('job_alerts', alerts);
    return alerts[index];
  }

  // ---------------------- Interface: deleteJobAlert ----------------------

  deleteJobAlert(alertId) {
    const alerts = this._getFromStorage('job_alerts');
    const index = alerts.findIndex((a) => a.id === alertId);
    if (index === -1) return { success: false };
    alerts.splice(index, 1);
    this._saveToStorage('job_alerts', alerts);
    return { success: true };
  }

  // ---------------------- Interface: getCareerToolsOverview ----------------------

  getCareerToolsOverview() {
    const services = this._getFromStorage('services');
    const tools = services.filter((s) => s.serviceType === 'tool');
    return tools.map((s) => ({
      service: s,
      toolLabel: s.name || 'Career tool'
    }));
  }

  // ---------------------- Interface: calculateSalaryBenchmark ----------------------

  calculateSalaryBenchmark(jobTitle, locationText, locationId, yearsExperience, industry, currency) {
    const locations = this._getFromStorage('locations');
    let resolvedLocationId = locationId || null;

    if (!resolvedLocationId && locationText) {
      const lt = locationText.toLowerCase();
      const match = locations.find((l) => {
        const combined = [l.city, l.region, l.country]
          .filter(Boolean)
          .join(', ')
          .toLowerCase();
        return combined.includes(lt);
      });
      if (match) resolvedLocationId = match.id;
    }

    const range = this._calculateSalaryRangeInternal({
      jobTitle,
      yearsExperience,
      industry,
      currency,
      locationText
    });

    const methodologyNote =
      'This salary range is an estimate based on role seniority, years of experience, industry and broad location cost-of-living assumptions.';

    return {
      jobTitle,
      locationText,
      locationId: resolvedLocationId,
      yearsExperience,
      industry,
      currency: range.currency,
      estimatedSalaryMin: range.estimatedSalaryMin,
      estimatedSalaryMax: range.estimatedSalaryMax,
      methodologyNote
    };
  }

  // ---------------------- Interface: saveSalaryBenchmarkEstimate ----------------------

  saveSalaryBenchmarkEstimate(jobTitle, locationText, locationId, yearsExperience, industry, currency, estimatedSalaryMin, estimatedSalaryMax, notes) {
    const benchmarks = this._getFromStorage('salary_benchmarks');
    const estimate = {
      id: this._generateId('salbench'),
      jobTitle,
      locationId: locationId || null,
      locationText,
      yearsExperience,
      industry,
      currency,
      estimatedSalaryMin,
      estimatedSalaryMax,
      notes: notes || '',
      createdAt: new Date().toISOString()
    };

    benchmarks.push(estimate);
    this._saveToStorage('salary_benchmarks', benchmarks);
    return estimate;
  }

  // ---------------------- Interface: getSavedSalaryBenchmarks ----------------------

  getSavedSalaryBenchmarks() {
    const benchmarks = this._getFromStorage('salary_benchmarks');
    const locations = this._getFromStorage('locations');
    return benchmarks.map((b) => ({
      ...b,
      location: b.locationId ? locations.find((l) => l.id === b.locationId) || null : null
    }));
  }

  // ---------------------- Interface: getArticleFilterOptions ----------------------

  getArticleFilterOptions() {
    const categories = this._getFromStorage('article_categories').filter((c) => c.isActive);
    const dateRangeOptions = [
      { value: 'last_12_months', label: 'Last 12 months' },
      { value: 'all', label: 'All time' }
    ];
    return { categories, dateRangeOptions };
  }

  // ---------------------- Interface: searchArticles ----------------------

  searchArticles(query, categoryId, dateRangeType = 'all', fromDate, toDate, sortBy = 'date_desc', page = 1, pageSize = 20) {
    const articles = this._getFromStorage('articles').filter((a) => a.isPublished);
    const categories = this._getFromStorage('article_categories');
    const readingListItems = this._getFromStorage('reading_list_items');
    const readingSet = new Set(readingListItems.map((r) => r.articleId));

    let results = articles;

    if (query && query.trim()) {
      const q = query.toLowerCase();
      results = results.filter((a) => {
        const tags = Array.isArray(a.tags) ? a.tags.join(' ') : '';
        const haystack = [a.title, a.excerpt, a.content, tags]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return haystack.includes(q);
      });
    }

    if (categoryId) {
      results = results.filter((a) => {
        if (a.primaryCategoryId === categoryId) return true;
        if (Array.isArray(a.categoryIds)) return a.categoryIds.includes(categoryId);
        return false;
      });
    }

    const now = new Date();
    let from = null;
    let to = null;
    if (dateRangeType === 'last_12_months') {
      const fromDateObj = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      from = fromDateObj.toISOString().split('T')[0];
    }

    if (fromDate) from = fromDate;
    if (toDate) to = toDate;

    if (from || to) {
      results = results.filter((a) => {
        const d = new Date(a.publishDate);
        if (isNaN(d.getTime())) return false;
        const ds = d.toISOString().split('T')[0];
        if (from && ds < from) return false;
        if (to && ds > to) return false;
        return true;
      });
    }

    if (sortBy === 'date_asc') {
      results = [...results].sort((a, b) => new Date(a.publishDate) - new Date(b.publishDate));
    } else {
      results = [...results].sort((a, b) => new Date(b.publishDate) - new Date(a.publishDate));
    }

    const totalResults = results.length;
    const totalPages = totalResults === 0 ? 0 : Math.ceil(totalResults / pageSize);
    const start = (page - 1) * pageSize;
    const paged = results.slice(start, start + pageSize);

    const mapped = paged.map((a) => {
      const category = categories.find((c) => c.id === a.primaryCategoryId) || null;
      return {
        article: a,
        primaryCategoryName: category ? category.name : '',
        publishDateDisplay: this._formatDate(a.publishDate),
        isInReadingList: readingSet.has(a.id)
      };
    });

    return { results: mapped, totalResults, page, pageSize, totalPages };
  }

  // ---------------------- Interface: getArticleDetail ----------------------

  getArticleDetail(articleId) {
    const articles = this._getFromStorage('articles');
    const categories = this._getFromStorage('article_categories');
    const readingListItems = this._getFromStorage('reading_list_items');

    const article = articles.find((a) => a.id === articleId) || null;
    if (!article) {
      return {
        article: null,
        primaryCategoryName: '',
        categoryNames: [],
        publishDateDisplay: '',
        isInReadingList: false,
        relatedArticles: []
      };
    }

    const primaryCategory = categories.find((c) => c.id === article.primaryCategoryId) || null;
    const categoryNames = [];
    if (primaryCategory) categoryNames.push(primaryCategory.name);
    if (Array.isArray(article.categoryIds)) {
      article.categoryIds.forEach((cid) => {
        if (cid === article.primaryCategoryId) return;
        const cat = categories.find((c) => c.id === cid);
        if (cat) categoryNames.push(cat.name);
      });
    }

    const isInReadingList = readingListItems.some((r) => r.articleId === articleId);

    const relatedArticles = articles
      .filter((a) => a.id !== article.id && a.primaryCategoryId === article.primaryCategoryId)
      .sort((a, b) => new Date(b.publishDate) - new Date(a.publishDate))
      .slice(0, 3);

    return {
      article,
      primaryCategoryName: primaryCategory ? primaryCategory.name : '',
      categoryNames,
      publishDateDisplay: this._formatDate(article.publishDate),
      isInReadingList,
      relatedArticles
    };
  }

  // ---------------------- Interface: toggleReadingListItem ----------------------

  toggleReadingListItem(articleId) {
    let items = this._getFromStorage('reading_list_items');
    const idx = items.findIndex((i) => i.articleId === articleId);
    let isInReadingList;
    let message;

    if (idx >= 0) {
      items.splice(idx, 1);
      isInReadingList = false;
      message = 'Removed from reading list';
    } else {
      items.push({
        id: this._generateId('readitem'),
        articleId,
        savedAt: new Date().toISOString()
      });
      isInReadingList = true;
      message = 'Added to reading list';
    }

    this._saveToStorage('reading_list_items', items);

    return { success: true, isInReadingList, message };
  }

  // ---------------------- Interface: getReadingList ----------------------

  getReadingList() {
    return this._getReadingListInternal();
  }

  // ---------------------- Interface: getProfile ----------------------

  getProfile() {
    const profile = this._getCurrentProfile();
    const locations = this._getFromStorage('locations');

    const currentLocation = profile.currentLocationId
      ? locations.find((l) => l.id === profile.currentLocationId) || null
      : null;
    const currentLocationName = this._locationDisplay(currentLocation);

    const preferredLocations = Array.isArray(profile.preferredLocationIds)
      ? locations.filter((l) => profile.preferredLocationIds.includes(l.id))
      : [];

    const savedJobs = this.getSavedJobs();
    const favouriteJobs = savedJobs.favourites;
    const shortlistedJobs = savedJobs.shortlist;

    const savedSalaryBenchmarks = this.getSavedSalaryBenchmarks();
    const readingList = this._getReadingListInternal();

    return {
      profile,
      currentLocationName,
      preferredLocations,
      favouriteJobs,
      shortlistedJobs,
      savedSalaryBenchmarks,
      readingList
    };
  }

  // ---------------------- Interface: updateProfileInfo ----------------------

  updateProfileInfo(fullName, email, headline, currentLocationId) {
    const profiles = this._getFromStorage('profiles');
    let profile = profiles[0];
    if (!profile) {
      profile = this._getCurrentProfile();
    }

    const updated = { ...profile };
    if (typeof fullName !== 'undefined') updated.fullName = fullName;
    if (typeof email !== 'undefined') updated.email = email;
    if (typeof headline !== 'undefined') updated.headline = headline;
    if (typeof currentLocationId !== 'undefined') updated.currentLocationId = currentLocationId;
    updated.updatedAt = new Date().toISOString();

    if (profiles.length) profiles[0] = updated; else profiles.push(updated);
    this._saveToStorage('profiles', profiles);
    return updated;
  }

  // ---------------------- Interface: updateCareerPreferences ----------------------

  updateCareerPreferences(
    desiredRoles,
    preferredLocationIds,
    prefersRemoteWork,
    prefersHybridWork,
    prefersOnsiteWork,
    targetSalaryMin,
    targetSalaryMax,
    targetSalaryCurrency,
    preferredIndustries
  ) {
    const profiles = this._getFromStorage('profiles');
    let profile = profiles[0];
    if (!profile) {
      profile = this._getCurrentProfile();
    }

    const updated = { ...profile };
    if (typeof desiredRoles !== 'undefined') updated.desiredRoles = desiredRoles || [];
    if (typeof preferredLocationIds !== 'undefined') updated.preferredLocationIds = preferredLocationIds || [];
    if (typeof prefersRemoteWork !== 'undefined') updated.prefersRemoteWork = prefersRemoteWork;
    if (typeof prefersHybridWork !== 'undefined') updated.prefersHybridWork = prefersHybridWork;
    if (typeof prefersOnsiteWork !== 'undefined') updated.prefersOnsiteWork = prefersOnsiteWork;
    if (typeof targetSalaryMin !== 'undefined') updated.targetSalaryMin = targetSalaryMin;
    if (typeof targetSalaryMax !== 'undefined') updated.targetSalaryMax = targetSalaryMax;
    if (typeof targetSalaryCurrency !== 'undefined') updated.targetSalaryCurrency = targetSalaryCurrency;
    if (typeof preferredIndustries !== 'undefined') updated.preferredIndustries = preferredIndustries || [];
    updated.updatedAt = new Date().toISOString();

    if (profiles.length) profiles[0] = updated; else profiles.push(updated);
    this._saveToStorage('profiles', profiles);
    return updated;
  }

  // ---------------------- Interface: getContentPage ----------------------

  getContentPage(slug) {
    const pages = this._getFromStorage('content_pages');
    const page = pages.find((p) => p.slug === slug) || null;
    if (page) return page;

    const title = slug
      .split('_')
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
      .join(' ');

    return {
      slug,
      title,
      sections: [],
      seo: {
        metaTitle: title,
        metaDescription: ''
      }
    };
  }

  // ---------------------- Interface: getContactInfo ----------------------

  getContactInfo() {
    const raw = localStorage.getItem('contact_info');
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch (e) {}
    }
    return {
      emailAddresses: [],
      phoneNumbers: [],
      officeLocation: {
        addressLine1: '',
        addressLine2: '',
        city: '',
        postcode: '',
        country: ''
      },
      officeHours: [],
      mapEmbedUrl: ''
    };
  }

  // ---------------------- Interface: submitContactEnquiry ----------------------

  submitContactEnquiry(name, email, subject, message) {
    const enquiries = this._getFromStorage('contact_enquiries');
    const id = this._generateId('contact');
    const entry = {
      id,
      name,
      email,
      subject,
      message,
      createdAt: new Date().toISOString()
    };
    enquiries.push(entry);
    this._saveToStorage('contact_enquiries', enquiries);

    return {
      success: true,
      referenceId: id,
      confirmationMessage: 'Your enquiry has been submitted.'
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
