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

  // ----------------------
  // Storage initialization
  // ----------------------
  _initStorage() {
    const ensureArray = (key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    };

    // Core data entities
    ensureArray('programs'); // Program
    ensureArray('program_categories'); // ProgramCategory
    ensureArray('providers'); // Provider
    ensureArray('locations'); // Location
    ensureArray('payment_options'); // PaymentOption

    // User-facing collections
    ensureArray('favorites'); // FavoriteItem
    ensureArray('compare_items'); // CompareItem
    ensureArray('shortlist_items'); // ShortlistItem
    ensureArray('scheduled_programs'); // ScheduledProgram
    ensureArray('child_profiles'); // ChildProfile
    ensureArray('family_plan_items'); // FamilyPlanItem
    ensureArray('program_enrollments'); // ProgramEnrollment
    ensureArray('program_contact_messages'); // ProgramContactMessage
    ensureArray('support_messages'); // SupportMessage

    // Auth & users
    ensureArray('users');
    if (!localStorage.getItem('auth_state')) {
      localStorage.setItem('auth_state', JSON.stringify({ isAuthenticated: false, email: null }));
    }

    // Optional auxiliary data (content/config) - keep empty if not provided
    if (!localStorage.getItem('about_page_content')) {
      localStorage.setItem('about_page_content', JSON.stringify({}));
    }
    if (!localStorage.getItem('help_faq_content')) {
      localStorage.setItem('help_faq_content', JSON.stringify([]));
    }
    if (!localStorage.getItem('support_contact_info')) {
      localStorage.setItem('support_contact_info', JSON.stringify({}));
    }
    if (!localStorage.getItem('terms_policies')) {
      localStorage.setItem('terms_policies', JSON.stringify({}));
    }
    // Optional: zip -> coordinates mapping (if provided externally)
    if (!localStorage.getItem('zip_coordinates')) {
      localStorage.setItem('zip_coordinates', JSON.stringify([]));
    }

    // ID counter
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

  _getObjectFromStorage(key, defaultValue) {
    const data = localStorage.getItem(key);
    if (!data) return defaultValue;
    try {
      const parsed = JSON.parse(data);
      return parsed && typeof parsed === 'object' ? parsed : defaultValue;
    } catch (e) {
      return defaultValue;
    }
  }

  _saveToStorage(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
  }

  _getNextIdCounter() {
    const current = parseInt(localStorage.getItem('idCounter') || '1000', 10);
    const next = current + 1;
    localStorage.setItem('idCounter', next.toString());
    return next;
  }

  _generateId(prefix) {
    return prefix + '_' + this._getNextIdCounter();
  }

  // ----------------------
  // Generic helpers
  // ----------------------

  _normalizeDay(day) {
    return typeof day === 'string' ? day.toLowerCase() : day;
  }

  _buildPriceDisplay(program) {
    if (!program) return '';
    if (program.isFree) return 'Free';
    const price = typeof program.monthlyPrice === 'number' ? program.monthlyPrice : null;
    if (price == null) return '';
    const currency = program.currency || 'USD';
    const symbol = currency === 'USD' ? '$' : '';
    if (program.billingPeriod === 'per_month') {
      return symbol + price + '/month';
    }
    if (program.billingPeriod === 'per_term') {
      return symbol + price + ' per term';
    }
    if (program.billingPeriod === 'per_session') {
      return symbol + price + ' per session';
    }
    if (program.billingPeriod === 'per_class') {
      return symbol + price + ' per class';
    }
    return symbol + price;
  }

  _buildLocationSummary(location, program) {
    if (!program) return '';
    if (program.deliveryMode === 'online_virtual') {
      return 'Online';
    }
    if (!location) return '';
    const parts = [];
    if (location.city) parts.push(location.city);
    if (location.state) parts.push(location.state);
    if (parts.length) return parts.join(', ');
    if (location.zipCode) return location.zipCode;
    return location.name || '';
  }

  _buildDescriptionSnippet(description, maxLength) {
    if (!description) return '';
    const limit = maxLength || 160;
    if (description.length <= limit) return description;
    return description.slice(0, limit - 1).trimEnd() + '…';
  }

  _parseDate(dateStr) {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
  }

  _getZipCoordinates(zipCode) {
    if (!zipCode) return null;
    const entries = this._getFromStorage('zip_coordinates');
    const entry = entries.find((z) => z && z.zipCode === zipCode);
    if (!entry || typeof entry.latitude !== 'number' || typeof entry.longitude !== 'number') {
      return null;
    }
    return { latitude: entry.latitude, longitude: entry.longitude };
  }

  _calculateDistanceMiles(lat1, lon1, lat2, lon2) {
    // Haversine formula
    const toRad = (v) => (v * Math.PI) / 180;
    const R = 3958.8; // radius of Earth in miles
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  _filterProgramsByLocation(programs, locationFilter) {
    if (!locationFilter || !locationFilter.zipCode) {
      return { programs, distances: {} };
    }
    const zipCode = locationFilter.zipCode;
    const maxDistance = typeof locationFilter.distanceMiles === 'number' ? locationFilter.distanceMiles : null;

    const locations = this._getFromStorage('locations');
    let center = this._getZipCoordinates(zipCode);
    if (!center) {
      const zipLocation = locations.find(
        (l) =>
          l &&
          l.zipCode === zipCode &&
          typeof l.latitude === 'number' &&
          typeof l.longitude === 'number'
      );
      if (zipLocation) {
        center = { latitude: zipLocation.latitude, longitude: zipLocation.longitude };
      }
    }

    const distances = {};
    const filtered = programs.filter((program) => {
      if (!program.locationId) return false; // in-person/hybrid only when location specified
      const loc = locations.find((l) => l.id === program.locationId);
      if (!loc) return false;

      // If we have coordinates for both the zip and the location, use distance
      if (center && typeof loc.latitude === 'number' && typeof loc.longitude === 'number') {
        const distance = this._calculateDistanceMiles(
          center.latitude,
          center.longitude,
          loc.latitude,
          loc.longitude
        );
        distances[program.id] = distance;
        if (maxDistance != null) {
          return distance <= maxDistance;
        }
        return true;
      }

      // Fallback: if no coordinates, filter by ZIP equality only
      if (loc.zipCode && loc.zipCode === zipCode) {
        distances[program.id] = 0;
        return true;
      }
      return false;
    });

    return { programs: filtered, distances };
  }

  _applySearchFilters(programs, filters) {
    if (!filters) return programs.slice();
    const normalized = programs.slice();

    return normalized.filter((program) => {
      // Age
      if (typeof filters.age === 'number') {
        // Treat age as a minimum eligibility check only so that slightly older
        // children can still see programs with a lower minimum age.
        if (typeof program.minAge === 'number' && program.minAge > filters.age) return false;
      }
      if (typeof filters.minAge === 'number') {
        if (typeof program.maxAge === 'number' && program.maxAge < filters.minAge) return false;
      }
      if (typeof filters.maxAge === 'number') {
        if (typeof program.minAge === 'number' && program.minAge > filters.maxAge) return false;
      }

      // Meeting days (OR logic: any overlap)
      if (Array.isArray(filters.meetingDays) && filters.meetingDays.length > 0) {
        const programDays = (program.meetingDays || []).map((d) => this._normalizeDay(d));
        const requestedDays = filters.meetingDays.map((d) => this._normalizeDay(d));
        const hasOverlap = requestedDays.some((d) => programDays.includes(d));
        if (!hasOverlap) return false;
      }

      // Time window
      if (filters.startTimeFrom) {
        if (program.startTime && program.startTime < filters.startTimeFrom) return false;
      }
      if (filters.endTimeTo) {
        if (program.endTime && program.endTime > filters.endTimeTo) return false;
      }

      // Price
      if (typeof filters.priceMax === 'number') {
        const effectivePrice = program.isFree ? 0 : program.billingPeriod === 'per_month' && typeof program.monthlyPrice === 'number'
          ? program.monthlyPrice
          : null;
        if (effectivePrice == null || effectivePrice > filters.priceMax) {
          return false;
        }
      }
      if (filters.isFree === true && !program.isFree) {
        return false;
      }

      // Delivery modes
      if (Array.isArray(filters.deliveryModes) && filters.deliveryModes.length > 0) {
        if (!filters.deliveryModes.includes(program.deliveryMode)) return false;
      }

      // Rating
      if (typeof filters.ratingMin === 'number') {
        if (typeof program.rating !== 'number' || program.rating < filters.ratingMin) return false;
      }

      // Group size
      if (typeof filters.maxGroupSize === 'number') {
        if (typeof program.maxGroupSize !== 'number' || program.maxGroupSize > filters.maxGroupSize) return false;
      }

      // Date range (overlap)
      if (filters.dateRangeStart || filters.dateRangeEnd) {
        const progStart = this._parseDate(program.startDate);
        const progEnd = this._parseDate(program.endDate);
        if (!progStart || !progEnd) {
          // If program has no dates, conservatively exclude when date filters are applied
          return false;
        }
        const rangeStart = this._parseDate(filters.dateRangeStart) || progStart;
        const rangeEnd = this._parseDate(filters.dateRangeEnd) || progEnd;
        // Overlap check: progEnd >= rangeStart && progStart <= rangeEnd
        if (progEnd < rangeStart || progStart > rangeEnd) return false;
      }

      // Minimum hours per week
      if (typeof filters.minHoursPerWeek === 'number') {
        if (typeof program.hoursPerWeek !== 'number' || program.hoursPerWeek < filters.minHoursPerWeek) return false;
      }

      // Minimum review count
      if (typeof filters.reviewCountMin === 'number') {
        if (typeof program.reviewCount !== 'number' || program.reviewCount < filters.reviewCountMin) return false;
      }

      return true;
    });
  }

  _sortPrograms(programs, sortBy, distanceMap) {
    const list = programs.slice();
    const sb = sortBy || 'relevance';

    const priceValue = (p) => {
      if (p.isFree) return 0;
      if (p.billingPeriod === 'per_month' && typeof p.monthlyPrice === 'number') return p.monthlyPrice;
      return Number.POSITIVE_INFINITY;
    };

    if (sb === 'rating_desc' || sb === 'relevance') {
      list.sort((a, b) => {
        const ra = typeof a.rating === 'number' ? a.rating : 0;
        const rb = typeof b.rating === 'number' ? b.rating : 0;
        if (rb !== ra) return rb - ra;
        const rca = typeof a.reviewCount === 'number' ? a.reviewCount : 0;
        const rcb = typeof b.reviewCount === 'number' ? b.reviewCount : 0;
        if (rcb !== rca) return rcb - rca;
        return (a.title || '').localeCompare(b.title || '');
      });
    } else if (sb === 'price_asc') {
      list.sort((a, b) => {
        const pa = priceValue(a);
        const pb = priceValue(b);
        if (pa !== pb) return pa - pb;
        return (a.title || '').localeCompare(b.title || '');
      });
    } else if (sb === 'price_desc') {
      list.sort((a, b) => {
        const pa = priceValue(a);
        const pb = priceValue(b);
        if (pa !== pb) return pb - pa;
        return (a.title || '').localeCompare(b.title || '');
      });
    } else if (sb === 'distance_asc') {
      list.sort((a, b) => {
        const da = distanceMap && typeof distanceMap[a.id] === 'number' ? distanceMap[a.id] : Number.POSITIVE_INFINITY;
        const db = distanceMap && typeof distanceMap[b.id] === 'number' ? distanceMap[b.id] : Number.POSITIVE_INFINITY;
        if (da !== db) return da - db;
        return (a.title || '').localeCompare(b.title || '');
      });
    } else if (sb === 'hours_per_week_desc') {
      list.sort((a, b) => {
        const ha = typeof a.hoursPerWeek === 'number' ? a.hoursPerWeek : 0;
        const hb = typeof b.hoursPerWeek === 'number' ? b.hoursPerWeek : 0;
        if (hb !== ha) return hb - ha;
        return (a.title || '').localeCompare(b.title || '');
      });
    }

    return list;
  }

  // ----------------------
  // Internal stores helpers (as per spec)
  // ----------------------

  _getOrCreateFavoritesStore() {
    return this._getFromStorage('favorites');
  }

  _getOrCreateCompareSet() {
    return this._getFromStorage('compare_items');
  }

  _getOrCreateShortlistStore() {
    return this._getFromStorage('shortlist_items');
  }

  _getOrCreateSchedule() {
    return this._getFromStorage('scheduled_programs');
  }

  _getOrCreateFamilyPlanState() {
    return {
      children: this._getFromStorage('child_profiles'),
      items: this._getFromStorage('family_plan_items')
    };
  }

  _getAuthState() {
    const state = this._getObjectFromStorage('auth_state', { isAuthenticated: false, email: null });
    // Ensure required fields exist
    if (typeof state.isAuthenticated !== 'boolean' || typeof state.email === 'undefined') {
      const normalized = { isAuthenticated: !!state.isAuthenticated, email: state.email || null };
      localStorage.setItem('auth_state', JSON.stringify(normalized));
      return normalized;
    }
    return state;
  }

  // ----------------------
  // Interface implementations
  // ----------------------

  // getHomePageSummary()
  getHomePageSummary() {
    const categories = this._getFromStorage('program_categories');
    const programs = this._getFromStorage('programs');

    // Quick filters derived from existing data
    const ages = new Set();
    let minPrice = Number.POSITIVE_INFINITY;
    let maxPrice = 0;

    programs.forEach((p) => {
      if (typeof p.minAge === 'number') ages.add(p.minAge);
      if (typeof p.maxAge === 'number') ages.add(p.maxAge);
      if (p.isFree) {
        minPrice = Math.min(minPrice, 0);
      }
      if (p.billingPeriod === 'per_month' && typeof p.monthlyPrice === 'number') {
        minPrice = Math.min(minPrice, p.monthlyPrice);
        maxPrice = Math.max(maxPrice, p.monthlyPrice);
      }
    });

    const agePresets = Array.from(ages)
      .sort((a, b) => a - b)
      .slice(0, 6)
      .map((age) => ({ label: 'Age ' + age, age }));

    const dayOfWeekOptions = [
      { id: 'monday', label: 'Monday' },
      { id: 'tuesday', label: 'Tuesday' },
      { id: 'wednesday', label: 'Wednesday' },
      { id: 'thursday', label: 'Thursday' },
      { id: 'friday', label: 'Friday' },
      { id: 'saturday', label: 'Saturday' },
      { id: 'sunday', label: 'Sunday' }
    ];

    const deliveryModes = [
      { id: 'in_person', label: 'In person' },
      { id: 'online_virtual', label: 'Online / Virtual' },
      { id: 'hybrid', label: 'Hybrid' }
    ];

    const priceHints = {
      minMonthly: isFinite(minPrice) ? minPrice : 0,
      maxMonthly: maxPrice || 0
    };

    const quickFilters = {
      agePresets,
      dayOfWeekOptions,
      deliveryModes,
      priceHints,
      defaultLocationRadiusMiles: 5
    };

    const savedCounts = {
      favorites: this._getFromStorage('favorites').length,
      shortlist: this._getFromStorage('shortlist_items').length,
      compare: this._getFromStorage('compare_items').length,
      schedule: this._getFromStorage('scheduled_programs').length,
      familyPlanItems: this._getFromStorage('family_plan_items').length
    };

    return {
      categories,
      quickFilters,
      savedCounts
    };
  }

  // getProgramCategories()
  getProgramCategories() {
    return this._getFromStorage('program_categories');
  }

  // getHeaderSavedCounts()
  getHeaderSavedCounts() {
    return {
      favorites: this._getFromStorage('favorites').length,
      shortlist: this._getFromStorage('shortlist_items').length,
      compare: this._getFromStorage('compare_items').length,
      schedule: this._getFromStorage('scheduled_programs').length,
      familyPlanItems: this._getFromStorage('family_plan_items').length
    };
  }

  // getProgramFilterOptions()
  getProgramFilterOptions() {
    const programs = this._getFromStorage('programs');

    let minAge = Number.POSITIVE_INFINITY;
    let maxAge = 0;
    let minMonthly = Number.POSITIVE_INFINITY;
    let maxMonthly = 0;
    let minGroup = Number.POSITIVE_INFINITY;
    let maxGroup = 0;
    const ratingsSet = new Set();
    let minDate = null;
    let maxDate = null;

    programs.forEach((p) => {
      if (typeof p.minAge === 'number') minAge = Math.min(minAge, p.minAge);
      if (typeof p.maxAge === 'number') maxAge = Math.max(maxAge, p.maxAge);

      if (p.isFree) {
        minMonthly = Math.min(minMonthly, 0);
      }
      if (p.billingPeriod === 'per_month' && typeof p.monthlyPrice === 'number') {
        minMonthly = Math.min(minMonthly, p.monthlyPrice);
        maxMonthly = Math.max(maxMonthly, p.monthlyPrice);
      }

      if (typeof p.maxGroupSize === 'number') {
        minGroup = Math.min(minGroup, p.maxGroupSize);
        maxGroup = Math.max(maxGroup, p.maxGroupSize);
      }

      if (typeof p.rating === 'number') ratingsSet.add(p.rating);

      const ps = this._parseDate(p.startDate);
      const pe = this._parseDate(p.endDate);
      if (ps) {
        if (!minDate || ps < minDate) minDate = ps;
      }
      if (pe) {
        if (!maxDate || pe > maxDate) maxDate = pe;
      }
    });

    const ageRange = {
      min: isFinite(minAge) ? minAge : 0,
      max: maxAge || 0
    };

    const ratingOptions = Array.from(ratingsSet).sort((a, b) => b - a);

    const priceRange = {
      minMonthly: isFinite(minMonthly) ? minMonthly : 0,
      maxMonthly: maxMonthly || 0
    };

    const groupSizeRange = {
      min: isFinite(minGroup) ? minGroup : 0,
      max: maxGroup || 0
    };

    const dayOfWeekOptions = [
      { id: 'monday', label: 'Monday' },
      { id: 'tuesday', label: 'Tuesday' },
      { id: 'wednesday', label: 'Wednesday' },
      { id: 'thursday', label: 'Thursday' },
      { id: 'friday', label: 'Friday' },
      { id: 'saturday', label: 'Saturday' },
      { id: 'sunday', label: 'Sunday' }
    ];

    const deliveryModes = [
      { id: 'in_person', label: 'In person' },
      { id: 'online_virtual', label: 'Online / Virtual' },
      { id: 'hybrid', label: 'Hybrid' }
    ];

    const dateRangeDefaults = {
      start: minDate ? minDate.toISOString().slice(0, 10) : null,
      end: maxDate ? maxDate.toISOString().slice(0, 10) : null
    };

    const distanceOptionsMiles = [1, 3, 5, 10, 20];

    return {
      ageRange,
      dayOfWeekOptions,
      deliveryModes,
      ratingOptions,
      priceRange,
      groupSizeRange,
      distanceOptionsMiles,
      dateRangeDefaults
    };
  }

  // getProgramSortOptions()
  getProgramSortOptions() {
    return [
      { id: 'relevance', label: 'Relevance' },
      { id: 'rating_desc', label: 'Rating: High to Low' },
      { id: 'price_asc', label: 'Price: Low to High' },
      { id: 'price_desc', label: 'Price: High to Low' },
      { id: 'distance_asc', label: 'Distance: Nearest First' },
      { id: 'hours_per_week_desc', label: 'Hours per Week: High to Low' }
    ];
  }

  // searchPrograms(query, categoryId, location, filters, sortBy, page, pageSize)
  searchPrograms(query, categoryId, location, filters, sortBy, page, pageSize) {
    const allPrograms = this._getFromStorage('programs');
    const categories = this._getFromStorage('program_categories');
    const providers = this._getFromStorage('providers');
    const locations = this._getFromStorage('locations');
    const favorites = this._getFromStorage('favorites');
    const compareItems = this._getFromStorage('compare_items');
    const shortlistItems = this._getFromStorage('shortlist_items');

    const q = (query || '').trim().toLowerCase();

    let filtered = allPrograms.filter((p) => {
      if (categoryId && p.categoryId !== categoryId) return false;

      if (q) {
        const haystack = [
          p.title || '',
          p.subtitle || '',
          p.description || '',
          ...(Array.isArray(p.keywords) ? p.keywords : []),
          ...(Array.isArray(p.tags) ? p.tags : [])
        ]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }

      return true;
    });

    // Location filtering & distance calculation
    let distanceMap = {};
    if (location && location.zipCode) {
      const res = this._filterProgramsByLocation(filtered, location);
      filtered = res.programs;
      distanceMap = res.distances || {};
    }

    // Other filters
    filtered = this._applySearchFilters(filtered, filters || {});

    // Sorting
    filtered = this._sortPrograms(filtered, sortBy, distanceMap);

    const totalCount = filtered.length;
    const currentPage = page && page > 0 ? page : 1;
    const size = pageSize && pageSize > 0 ? pageSize : 20;
    const startIdx = (currentPage - 1) * size;
    const pageItems = filtered.slice(startIdx, startIdx + size);

    const results = pageItems.map((p) => {
      const category = categories.find((c) => c.id === p.categoryId) || null;
      const provider = providers.find((pr) => pr.id === p.providerId) || null;
      const locationObj = locations.find((l) => l.id === p.locationId) || null;
      const priceDisplay = this._buildPriceDisplay(p);
      const locationSummary = this._buildLocationSummary(locationObj, p);
      const distanceMiles = typeof distanceMap[p.id] === 'number' ? distanceMap[p.id] : null;

      const isFavorite = favorites.some((f) => f.programId === p.id);
      const isInCompare = compareItems.some((ci) => ci.programId === p.id);
      const isShortlisted = shortlistItems.some((si) => si.programId === p.id);

      return {
        id: p.id,
        title: p.title,
        subtitle: p.subtitle,
        categoryId: p.categoryId,
        categoryName: category ? category.name : '',
        descriptionSnippet: this._buildDescriptionSnippet(p.description, 160),
        minAge: p.minAge,
        maxAge: p.maxAge,
        ageGroupLabel: p.ageGroupLabel,
        meetingDays: p.meetingDays || [],
        startTime: p.startTime,
        endTime: p.endTime,
        hoursPerWeek: p.hoursPerWeek,
        billingPeriod: p.billingPeriod,
        monthlyPrice: p.monthlyPrice,
        isFree: !!p.isFree,
        currency: p.currency,
        priceDisplay,
        rating: p.rating,
        reviewCount: p.reviewCount,
        maxGroupSize: p.maxGroupSize,
        deliveryMode: p.deliveryMode,
        providerName: provider ? provider.name : '',
        locationSummary,
        distanceMiles,
        startDate: p.startDate || null,
        endDate: p.endDate || null,
        imageUrl: p.imageUrl,
        tags: p.tags || [],
        isFavorite,
        isInCompare,
        isShortlisted
      };
    });

    return {
      results,
      totalCount,
      page: currentPage,
      pageSize: size
    };
  }

  // getProgramDetails(programId)
  getProgramDetails(programId) {
    const programs = this._getFromStorage('programs');
    const categories = this._getFromStorage('program_categories');
    const providers = this._getFromStorage('providers');
    const locations = this._getFromStorage('locations');
    const paymentOptionsAll = this._getFromStorage('payment_options');
    const favorites = this._getFromStorage('favorites');
    const compareItems = this._getFromStorage('compare_items');
    const shortlistItems = this._getFromStorage('shortlist_items');
    const familyItems = this._getFromStorage('family_plan_items');
    const scheduleItems = this._getFromStorage('scheduled_programs');

    const program = programs.find((p) => p.id === programId) || null;

    if (!program) {
      return {
        program: null,
        provider: null,
        location: null,
        paymentOptions: [],
        isFavorite: false,
        isInCompare: false,
        isShortlisted: false,
        isInFamilyPlan: false,
        isScheduled: false
      };
    }

    const category = categories.find((c) => c.id === program.categoryId) || null;
    const provider = providers.find((pr) => pr.id === program.providerId) || null;
    const location = program.locationId ? locations.find((l) => l.id === program.locationId) || null : null;

    const paymentOptionsRaw = paymentOptionsAll.filter((po) => po.programId === program.id);
    const paymentOptions = paymentOptionsRaw.map((po) => ({
      ...po,
      // Foreign key resolution: include program object
      program
    }));

    const isFavorite = favorites.some((f) => f.programId === program.id);
    const isInCompare = compareItems.some((ci) => ci.programId === program.id);
    const isShortlisted = shortlistItems.some((si) => si.programId === program.id);
    const isInFamilyPlan = familyItems.some((fi) => fi.programId === program.id);
    const isScheduled = scheduleItems.some((sp) => sp.programId === program.id);

    const programDetails = {
      id: program.id,
      title: program.title,
      subtitle: program.subtitle,
      categoryId: program.categoryId,
      categoryName: category ? category.name : '',
      description: program.description,
      keywords: program.keywords || [],
      deliveryMode: program.deliveryMode,
      minAge: program.minAge,
      maxAge: program.maxAge,
      ageGroupLabel: program.ageGroupLabel,
      meetingDays: program.meetingDays || [],
      startTime: program.startTime,
      endTime: program.endTime,
      hoursPerWeek: program.hoursPerWeek,
      startDate: program.startDate,
      endDate: program.endDate,
      billingPeriod: program.billingPeriod,
      monthlyPrice: program.monthlyPrice,
      isFree: !!program.isFree,
      currency: program.currency,
      rating: program.rating,
      reviewCount: program.reviewCount,
      maxGroupSize: program.maxGroupSize,
      onlinePlatform: program.onlinePlatform,
      imageUrl: program.imageUrl,
      tags: program.tags || []
    };

    const providerDetails = provider
      ? {
          id: provider.id,
          name: provider.name,
          description: provider.description,
          phone: provider.phone,
          email: provider.email,
          website: provider.website
        }
      : null;

    const locationDetails = location
      ? {
          id: location.id,
          name: location.name,
          addressLine1: location.addressLine1,
          addressLine2: location.addressLine2,
          city: location.city,
          state: location.state,
          zipCode: location.zipCode,
          latitude: location.latitude,
          longitude: location.longitude,
          locationType: location.locationType
        }
      : null;

    return {
      program: programDetails,
      provider: providerDetails,
      location: locationDetails,
      paymentOptions,
      isFavorite,
      isInCompare,
      isShortlisted,
      isInFamilyPlan,
      isScheduled
    };
  }

  // addProgramToFavorites(programId, source)
  addProgramToFavorites(programId, source) {
    const programs = this._getFromStorage('programs');
    const program = programs.find((p) => p.id === programId);
    if (!program) {
      return { success: false, favoriteId: null, message: 'Program not found' };
    }

    const favorites = this._getOrCreateFavoritesStore();
    const normalizedSource = source || 'program_detail';
    const existing = favorites.find((f) => f.programId === programId && f.source === normalizedSource);
    if (existing) {
      return { success: true, favoriteId: existing.id, message: 'Already in favorites' };
    }

    const favoriteId = this._generateId('fav');
    const newItem = {
      id: favoriteId,
      programId,
      source: normalizedSource,
      savedAt: new Date().toISOString()
    };

    favorites.push(newItem);
    this._saveToStorage('favorites', favorites);

    return { success: true, favoriteId, message: 'Added to favorites' };
  }

  // getFavoritesList(filters, sortBy)
  getFavoritesList(filters, sortBy) {
    const favorites = this._getFromStorage('favorites');
    const programs = this._getFromStorage('programs');
    const categories = this._getFromStorage('program_categories');
    const locations = this._getFromStorage('locations');

    const appliedFilters = filters || {};

    let items = favorites.map((fav) => {
      const program = programs.find((p) => p.id === fav.programId) || null;
      if (!program) {
        return {
          favoriteId: fav.id,
          savedAt: fav.savedAt,
          program: null
        };
      }
      const category = categories.find((c) => c.id === program.categoryId) || null;
      const location = program.locationId ? locations.find((l) => l.id === program.locationId) || null : null;
      const priceDisplay = this._buildPriceDisplay(program);
      const locationSummary = this._buildLocationSummary(location, program);

      const programSummary = {
        id: program.id,
        title: program.title,
        categoryName: category ? category.name : '',
        meetingDays: program.meetingDays || [],
        startTime: program.startTime,
        endTime: program.endTime,
        monthlyPrice: program.monthlyPrice,
        isFree: !!program.isFree,
        priceDisplay,
        rating: program.rating,
        reviewCount: program.reviewCount,
        deliveryMode: program.deliveryMode,
        locationSummary,
        // Also include full program for foreign key resolution convenience
        program
      };

      return {
        favoriteId: fav.id,
        savedAt: fav.savedAt,
        program: programSummary
      };
    });

    // Apply filters
    items = items.filter((item) => {
      const p = item.program && item.program.program ? item.program.program : null;
      if (!p) return false;

      if (appliedFilters.categoryId && p.categoryId !== appliedFilters.categoryId) return false;

      if (Array.isArray(appliedFilters.meetingDays) && appliedFilters.meetingDays.length > 0) {
        const programDays = (p.meetingDays || []).map((d) => this._normalizeDay(d));
        const requestedDays = appliedFilters.meetingDays.map((d) => this._normalizeDay(d));
        const hasOverlap = requestedDays.some((d) => programDays.includes(d));
        if (!hasOverlap) return false;
      }

      if (typeof appliedFilters.priceMax === 'number') {
        const effectivePrice = p.isFree
          ? 0
          : p.billingPeriod === 'per_month' && typeof p.monthlyPrice === 'number'
          ? p.monthlyPrice
          : null;
        if (effectivePrice == null || effectivePrice > appliedFilters.priceMax) return false;
      }

      if (typeof appliedFilters.ratingMin === 'number') {
        if (typeof p.rating !== 'number' || p.rating < appliedFilters.ratingMin) return false;
      }

      if (appliedFilters.zipCode) {
        const location = p.locationId ? locations.find((l) => l.id === p.locationId) || null : null;
        if (!location || location.zipCode !== appliedFilters.zipCode) return false;
      }

      return true;
    });

    // Sorting
    const sb = sortBy || 'rating_desc';
    if (sb === 'rating_desc') {
      items.sort((a, b) => {
        const pa = a.program && a.program.program ? a.program.program : null;
        const pb = b.program && b.program.program ? b.program.program : null;
        const ra = pa && typeof pa.rating === 'number' ? pa.rating : 0;
        const rb = pb && typeof pb.rating === 'number' ? pb.rating : 0;
        if (rb !== ra) return rb - ra;
        return (pa ? pa.title : '').localeCompare(pb ? pb.title : '');
      });
    } else if (sb === 'price_asc') {
      items.sort((a, b) => {
        const pa = a.program && a.program.program ? a.program.program : null;
        const pb = b.program && b.program.program ? b.program.program : null;
        const priceA = pa
          ? pa.isFree
            ? 0
            : pa.billingPeriod === 'per_month' && typeof pa.monthlyPrice === 'number'
            ? pa.monthlyPrice
            : Number.POSITIVE_INFINITY
          : Number.POSITIVE_INFINITY;
        const priceB = pb
          ? pb.isFree
            ? 0
            : pb.billingPeriod === 'per_month' && typeof pb.monthlyPrice === 'number'
            ? pb.monthlyPrice
            : Number.POSITIVE_INFINITY
          : Number.POSITIVE_INFINITY;
        if (priceA !== priceB) return priceA - priceB;
        return (pa ? pa.title : '').localeCompare(pb ? pb.title : '');
      });
    }

    return items;
  }

  // removeFavoriteItem(favoriteId)
  removeFavoriteItem(favoriteId) {
    const favorites = this._getFromStorage('favorites');
    const index = favorites.findIndex((f) => f.id === favoriteId);
    if (index === -1) {
      return { success: false, message: 'Favorite not found' };
    }
    favorites.splice(index, 1);
    this._saveToStorage('favorites', favorites);
    return { success: true, message: 'Favorite removed' };
  }

  // addProgramToCompare(programId)
  addProgramToCompare(programId) {
    const programs = this._getFromStorage('programs');
    const program = programs.find((p) => p.id === programId);
    if (!program) {
      return { success: false, compareItemId: null, message: 'Program not found' };
    }

    const compareItems = this._getOrCreateCompareSet();
    const existing = compareItems.find((c) => c.programId === programId);
    if (existing) {
      return { success: true, compareItemId: existing.id, message: 'Already in compare list' };
    }

    const compareItemId = this._generateId('cmp');
    const newItem = {
      id: compareItemId,
      programId,
      addedAt: new Date().toISOString()
    };

    compareItems.push(newItem);
    this._saveToStorage('compare_items', compareItems);

    return { success: true, compareItemId, message: 'Added to compare list' };
  }

  // getCompareItems()
  getCompareItems() {
    const compareItems = this._getFromStorage('compare_items');
    const programs = this._getFromStorage('programs');
    const categories = this._getFromStorage('program_categories');
    const locations = this._getFromStorage('locations');

    return compareItems.map((item) => {
      const program = programs.find((p) => p.id === item.programId) || null;
      if (!program) {
        return {
          compareItemId: item.id,
          addedAt: item.addedAt,
          program: null
        };
      }
      const category = categories.find((c) => c.id === program.categoryId) || null;
      const location = program.locationId ? locations.find((l) => l.id === program.locationId) || null : null;
      const priceDisplay = this._buildPriceDisplay(program);
      const locationSummary = this._buildLocationSummary(location, program);

      const programSummary = {
        id: program.id,
        title: program.title,
        categoryName: category ? category.name : '',
        minAge: program.minAge,
        maxAge: program.maxAge,
        ageGroupLabel: program.ageGroupLabel,
        meetingDays: program.meetingDays || [],
        startTime: program.startTime,
        endTime: program.endTime,
        hoursPerWeek: program.hoursPerWeek,
        billingPeriod: program.billingPeriod,
        monthlyPrice: program.monthlyPrice,
        isFree: !!program.isFree,
        priceDisplay,
        rating: program.rating,
        reviewCount: program.reviewCount,
        deliveryMode: program.deliveryMode,
        locationSummary,
        // Full program for FK resolution
        program
      };

      return {
        compareItemId: item.id,
        addedAt: item.addedAt,
        program: programSummary
      };
    });
  }

  // removeCompareItem(compareItemId)
  removeCompareItem(compareItemId) {
    const compareItems = this._getFromStorage('compare_items');
    const index = compareItems.findIndex((c) => c.id === compareItemId);
    if (index === -1) {
      return { success: false, message: 'Compare item not found' };
    }
    compareItems.splice(index, 1);
    this._saveToStorage('compare_items', compareItems);
    return { success: true, message: 'Compare item removed' };
  }

  // addProgramToShortlist(programId, notes)
  addProgramToShortlist(programId, notes) {
    const programs = this._getFromStorage('programs');
    const program = programs.find((p) => p.id === programId);
    if (!program) {
      return { success: false, shortlistItemId: null, message: 'Program not found' };
    }

    const shortlist = this._getOrCreateShortlistStore();
    const existing = shortlist.find((s) => s.programId === programId);
    if (existing) {
      // Update notes if provided
      if (typeof notes === 'string') {
        existing.notes = notes;
        this._saveToStorage('shortlist_items', shortlist);
      }
      return { success: true, shortlistItemId: existing.id, message: 'Already in shortlist' };
    }

    const shortlistItemId = this._generateId('sl');
    const newItem = {
      id: shortlistItemId,
      programId,
      addedAt: new Date().toISOString(),
      notes: typeof notes === 'string' ? notes : ''
    };

    shortlist.push(newItem);
    this._saveToStorage('shortlist_items', shortlist);

    return { success: true, shortlistItemId, message: 'Added to shortlist' };
  }

  // getShortlistItems()
  getShortlistItems() {
    const shortlist = this._getFromStorage('shortlist_items');
    const programs = this._getFromStorage('programs');
    const categories = this._getFromStorage('program_categories');
    const locations = this._getFromStorage('locations');

    return shortlist.map((item) => {
      const program = programs.find((p) => p.id === item.programId) || null;
      if (!program) {
        return {
          shortlistItemId: item.id,
          addedAt: item.addedAt,
          notes: item.notes,
          program: null
        };
      }
      const category = categories.find((c) => c.id === program.categoryId) || null;
      const location = program.locationId ? locations.find((l) => l.id === program.locationId) || null : null;
      const priceDisplay = this._buildPriceDisplay(program);
      const locationSummary = this._buildLocationSummary(location, program);

      const programSummary = {
        id: program.id,
        title: program.title,
        categoryName: category ? category.name : '',
        meetingDays: program.meetingDays || [],
        startTime: program.startTime,
        endTime: program.endTime,
        monthlyPrice: program.monthlyPrice,
        isFree: !!program.isFree,
        priceDisplay,
        rating: program.rating,
        deliveryMode: program.deliveryMode,
        locationSummary,
        // Full program object
        program
      };

      return {
        shortlistItemId: item.id,
        addedAt: item.addedAt,
        notes: item.notes,
        program: programSummary
      };
    });
  }

  // updateShortlistItem(shortlistItemId, notes)
  updateShortlistItem(shortlistItemId, notes) {
    const shortlist = this._getFromStorage('shortlist_items');
    const item = shortlist.find((s) => s.id === shortlistItemId);
    if (!item) {
      return { success: false, message: 'Shortlist item not found' };
    }
    item.notes = typeof notes === 'string' ? notes : '';
    this._saveToStorage('shortlist_items', shortlist);
    return { success: true, message: 'Shortlist item updated' };
  }

  // removeShortlistItem(shortlistItemId)
  removeShortlistItem(shortlistItemId) {
    const shortlist = this._getFromStorage('shortlist_items');
    const index = shortlist.findIndex((s) => s.id === shortlistItemId);
    if (index === -1) {
      return { success: false, message: 'Shortlist item not found' };
    }
    shortlist.splice(index, 1);
    this._saveToStorage('shortlist_items', shortlist);
    return { success: true, message: 'Shortlist item removed' };
  }

  // addProgramToSchedule(programId, assignedDay, assignedStartTime, assignedEndTime, notes)
  addProgramToSchedule(programId, assignedDay, assignedStartTime, assignedEndTime, notes) {
    const programs = this._getFromStorage('programs');
    const program = programs.find((p) => p.id === programId);
    if (!program) {
      return { success: false, scheduledProgramId: null, message: 'Program not found' };
    }

    const schedule = this._getOrCreateSchedule();
    const scheduledProgramId = this._generateId('sched');
    const newItem = {
      id: scheduledProgramId,
      programId,
      assignedDay: this._normalizeDay(assignedDay),
      assignedStartTime: assignedStartTime || null,
      assignedEndTime: assignedEndTime || null,
      createdAt: new Date().toISOString(),
      notes: typeof notes === 'string' ? notes : ''
    };

    schedule.push(newItem);
    this._saveToStorage('scheduled_programs', schedule);

    return { success: true, scheduledProgramId, message: 'Program added to schedule' };
  }

  // getMySchedule()
  getMySchedule() {
    const scheduled = this._getFromStorage('scheduled_programs');
    const programs = this._getFromStorage('programs');
    const categories = this._getFromStorage('program_categories');
    const locations = this._getFromStorage('locations');

    const daysOrder = [
      { dayId: 'monday', label: 'Monday' },
      { dayId: 'tuesday', label: 'Tuesday' },
      { dayId: 'wednesday', label: 'Wednesday' },
      { dayId: 'thursday', label: 'Thursday' },
      { dayId: 'friday', label: 'Friday' },
      { dayId: 'saturday', label: 'Saturday' },
      { dayId: 'sunday', label: 'Sunday' }
    ];

    const dayMap = {};
    const programsPerDay = {
      monday: 0,
      tuesday: 0,
      wednesday: 0,
      thursday: 0,
      friday: 0,
      saturday: 0,
      sunday: 0
    };

    daysOrder.forEach((d) => {
      dayMap[d.dayId] = {
        dayId: d.dayId,
        label: d.label,
        programs: []
      };
    });

    scheduled.forEach((sp) => {
      const program = programs.find((p) => p.id === sp.programId) || null;
      if (!program) return;
      const category = categories.find((c) => c.id === program.categoryId) || null;
      const location = program.locationId ? locations.find((l) => l.id === program.locationId) || null : null;
      const locationSummary = this._buildLocationSummary(location, program);
      const assignedDay = this._normalizeDay(sp.assignedDay || '');
      const targetDay = dayMap[assignedDay];
      if (!targetDay) return;

      const entry = {
        scheduledProgramId: sp.id,
        programId: program.id,
        title: program.title,
        categoryName: category ? category.name : '',
        assignedStartTime: sp.assignedStartTime || program.startTime,
        assignedEndTime: sp.assignedEndTime || program.endTime,
        locationSummary,
        deliveryMode: program.deliveryMode,
        monthlyPrice: program.monthlyPrice,
        isFree: !!program.isFree,
        // Foreign key resolution: full program
        program
      };

      targetDay.programs.push(entry);
      programsPerDay[assignedDay] = (programsPerDay[assignedDay] || 0) + 1;
    });

    const days = daysOrder.map((d) => dayMap[d.dayId]);
    const totalPrograms = scheduled.length;

    return {
      days,
      totalPrograms,
      programsPerDay
    };
  }

  // updateScheduledProgram(scheduledProgramId, assignedDay, assignedStartTime, assignedEndTime, notes)
  updateScheduledProgram(scheduledProgramId, assignedDay, assignedStartTime, assignedEndTime, notes) {
    const scheduled = this._getFromStorage('scheduled_programs');
    const item = scheduled.find((sp) => sp.id === scheduledProgramId);
    if (!item) {
      return { success: false, message: 'Scheduled program not found' };
    }

    if (assignedDay) item.assignedDay = this._normalizeDay(assignedDay);
    if (typeof assignedStartTime === 'string') item.assignedStartTime = assignedStartTime;
    if (typeof assignedEndTime === 'string') item.assignedEndTime = assignedEndTime;
    if (typeof notes === 'string') item.notes = notes;

    this._saveToStorage('scheduled_programs', scheduled);
    return { success: true, message: 'Scheduled program updated' };
  }

  // removeScheduledProgram(scheduledProgramId)
  removeScheduledProgram(scheduledProgramId) {
    const scheduled = this._getFromStorage('scheduled_programs');
    const index = scheduled.findIndex((sp) => sp.id === scheduledProgramId);
    if (index === -1) {
      return { success: false, message: 'Scheduled program not found' };
    }
    scheduled.splice(index, 1);
    this._saveToStorage('scheduled_programs', scheduled);
    return { success: true, message: 'Scheduled program removed' };
  }

  // getChildProfiles()
  getChildProfiles() {
    return this._getFromStorage('child_profiles');
  }

  // addChildProfile(name, age, notes)
  addChildProfile(name, age, notes) {
    const children = this._getFromStorage('child_profiles');
    const childId = this._generateId('child');
    const newChild = {
      id: childId,
      name,
      age,
      notes: typeof notes === 'string' ? notes : ''
    };
    children.push(newChild);
    this._saveToStorage('child_profiles', children);
    return { success: true, childId, message: 'Child profile added' };
  }

  // updateChildProfile(childId, name, age, notes)
  updateChildProfile(childId, name, age, notes) {
    const children = this._getFromStorage('child_profiles');
    const child = children.find((c) => c.id === childId);
    if (!child) {
      return { success: false, message: 'Child profile not found' };
    }
    if (typeof name === 'string') child.name = name;
    if (typeof age === 'number') child.age = age;
    if (typeof notes === 'string') child.notes = notes;
    this._saveToStorage('child_profiles', children);
    return { success: true, message: 'Child profile updated' };
  }

  // removeChildProfile(childId)
  removeChildProfile(childId) {
    let children = this._getFromStorage('child_profiles');
    const idx = children.findIndex((c) => c.id === childId);
    if (idx === -1) {
      return { success: false, message: 'Child profile not found' };
    }
    children.splice(idx, 1);
    this._saveToStorage('child_profiles', children);

    // Also remove associated FamilyPlanItems
    let familyItems = this._getFromStorage('family_plan_items');
    familyItems = familyItems.filter((fi) => fi.childId !== childId);
    this._saveToStorage('family_plan_items', familyItems);

    return { success: true, message: 'Child profile and associated family plan items removed' };
  }

  // addProgramToFamilyPlan(childId, programId, assignedDay)
  addProgramToFamilyPlan(childId, programId, assignedDay) {
    const children = this._getFromStorage('child_profiles');
    const programs = this._getFromStorage('programs');
    const child = children.find((c) => c.id === childId);
    if (!child) {
      return { success: false, familyPlanItemId: null, message: 'Child not found' };
    }
    const program = programs.find((p) => p.id === programId);
    if (!program) {
      return { success: false, familyPlanItemId: null, message: 'Program not found' };
    }

    const familyItems = this._getFromStorage('family_plan_items');
    const familyPlanItemId = this._generateId('fpi');
    const newItem = {
      id: familyPlanItemId,
      childId,
      programId,
      assignedDay: assignedDay ? this._normalizeDay(assignedDay) : null,
      createdAt: new Date().toISOString()
    };

    familyItems.push(newItem);
    this._saveToStorage('family_plan_items', familyItems);

    return { success: true, familyPlanItemId, message: 'Program added to family plan' };
  }

  // getFamilyPlan()
  getFamilyPlan() {
    const children = this._getFromStorage('child_profiles');
    const familyItems = this._getFromStorage('family_plan_items');
    const programs = this._getFromStorage('programs');
    const categories = this._getFromStorage('program_categories');
    const locations = this._getFromStorage('locations');

    const resultChildren = [];
    let totalMonthlyCost = 0;

    children.forEach((child) => {
      const childPrograms = [];
      let monthlySubtotal = 0;

      familyItems
        .filter((fi) => fi.childId === child.id)
        .forEach((fi) => {
          const program = programs.find((p) => p.id === fi.programId) || null;
          if (!program) return;
          const category = categories.find((c) => c.id === program.categoryId) || null;
          const location = program.locationId ? locations.find((l) => l.id === program.locationId) || null : null;
          const priceDisplay = this._buildPriceDisplay(program);
          const locationSummary = this._buildLocationSummary(location, program);

          const effectivePrice = program.isFree
            ? 0
            : program.billingPeriod === 'per_month' && typeof program.monthlyPrice === 'number'
            ? program.monthlyPrice
            : 0;

          monthlySubtotal += effectivePrice;

          childPrograms.push({
            familyPlanItemId: fi.id,
            programId: program.id,
            title: program.title,
            categoryName: category ? category.name : '',
            assignedDay: fi.assignedDay,
            monthlyPrice: program.monthlyPrice,
            isFree: !!program.isFree,
            priceDisplay,
            deliveryMode: program.deliveryMode,
            locationSummary,
            // Full program object for FK resolution
            program
          });
        });

      totalMonthlyCost += monthlySubtotal;

      resultChildren.push({
        child: {
          id: child.id,
          name: child.name,
          age: child.age
        },
        programs: childPrograms,
        monthlySubtotal
      });
    });

    return {
      children: resultChildren,
      totalMonthlyCost
    };
  }

  // updateFamilyPlanItem(familyPlanItemId, childId, assignedDay)
  updateFamilyPlanItem(familyPlanItemId, childId, assignedDay) {
    const familyItems = this._getFromStorage('family_plan_items');
    const item = familyItems.find((fi) => fi.id === familyPlanItemId);
    if (!item) {
      return { success: false, message: 'Family plan item not found' };
    }

    if (childId) item.childId = childId;
    if (assignedDay) item.assignedDay = this._normalizeDay(assignedDay);

    this._saveToStorage('family_plan_items', familyItems);
    return { success: true, message: 'Family plan item updated' };
  }

  // removeFamilyPlanItem(familyPlanItemId)
  removeFamilyPlanItem(familyPlanItemId) {
    const familyItems = this._getFromStorage('family_plan_items');
    const index = familyItems.findIndex((fi) => fi.id === familyPlanItemId);
    if (index === -1) {
      return { success: false, message: 'Family plan item not found' };
    }
    familyItems.splice(index, 1);
    this._saveToStorage('family_plan_items', familyItems);
    return { success: true, message: 'Family plan item removed' };
  }

  // getProgramEnrollmentContext(programId, enrollmentType)
  getProgramEnrollmentContext(programId, enrollmentType) {
    const programs = this._getFromStorage('programs');
    const categories = this._getFromStorage('program_categories');
    const locations = this._getFromStorage('locations');
    const paymentOptionsAll = this._getFromStorage('payment_options');

    const program = programs.find((p) => p.id === programId) || null;
    if (!program) {
      return {
        program: null,
        paymentOptions: [],
        defaultPaymentPlanType: 'none'
      };
    }

    const category = categories.find((c) => c.id === program.categoryId) || null;
    const location = program.locationId ? locations.find((l) => l.id === program.locationId) || null : null;
    const priceDisplay = this._buildPriceDisplay(program);
    const locationSummary = this._buildLocationSummary(location, program);

    const programSummary = {
      id: program.id,
      title: program.title,
      categoryName: category ? category.name : '',
      ageGroupLabel: program.ageGroupLabel,
      meetingDays: program.meetingDays || [],
      startTime: program.startTime,
      endTime: program.endTime,
      monthlyPrice: program.monthlyPrice,
      isFree: !!program.isFree,
      priceDisplay,
      deliveryMode: program.deliveryMode,
      locationSummary
    };

    const paymentOptionsRaw = paymentOptionsAll.filter((po) => po.programId === program.id);
    const paymentOptions = paymentOptionsRaw.map((po) => ({
      ...po,
      // Foreign key resolution
      program
    }));

    let defaultPaymentPlanType = 'none';
    if (paymentOptions.some((po) => po.billingPeriod === 'per_month')) {
      defaultPaymentPlanType = 'monthly';
    } else if (paymentOptions.length > 0) {
      defaultPaymentPlanType = 'one_time';
    }

    return {
      program: programSummary,
      paymentOptions,
      defaultPaymentPlanType
    };
  }

  // submitProgramEnrollment(programId, enrollmentType, childName, childAge, guardianName, guardianPhone, guardianEmail, preferredStartDate, paymentOptionId, paymentPlanType, notes)
  submitProgramEnrollment(
    programId,
    enrollmentType,
    childName,
    childAge,
    guardianName,
    guardianPhone,
    guardianEmail,
    preferredStartDate,
    paymentOptionId,
    paymentPlanType,
    notes
  ) {
    const programs = this._getFromStorage('programs');
    const program = programs.find((p) => p.id === programId);
    if (!program) {
      return { success: false, enrollmentId: null, status: 'draft', message: 'Program not found' };
    }

    const enrollments = this._getFromStorage('program_enrollments');
    const enrollmentId = this._generateId('enroll');

    const record = {
      id: enrollmentId,
      programId,
      enrollmentType: enrollmentType === 'pre_registration' ? 'pre_registration' : 'enrollment',
      childName,
      childAge,
      guardianName,
      guardianPhone,
      guardianEmail: guardianEmail || null,
      preferredStartDate: preferredStartDate ? new Date(preferredStartDate).toISOString() : null,
      paymentOptionId: paymentOptionId || null,
      paymentPlanType: paymentPlanType || 'none',
      status: 'submitted',
      createdAt: new Date().toISOString(),
      notes: typeof notes === 'string' ? notes : ''
    };

    enrollments.push(record);
    this._saveToStorage('program_enrollments', enrollments);

    return {
      success: true,
      enrollmentId,
      status: 'submitted',
      message: 'Enrollment submitted'
    };
  }

  // sendProgramContactMessage(programId, subject, messageBody, contactEmail, contactPhone)
  sendProgramContactMessage(programId, subject, messageBody, contactEmail, contactPhone) {
    if (!messageBody || typeof messageBody !== 'string' || !messageBody.trim()) {
      return { success: false, messageId: null, status: 'failed', feedback: 'Message body is required' };
    }

    const programs = this._getFromStorage('programs');
    const program = programs.find((p) => p.id === programId) || null;
    const providerId = program ? program.providerId : null;

    const messages = this._getFromStorage('program_contact_messages');
    const messageId = this._generateId('pcmsg');

    const record = {
      id: messageId,
      programId,
      providerId,
      subject: subject || null,
      messageBody,
      contactEmail: contactEmail || null,
      contactPhone: contactPhone || null,
      status: 'sent',
      createdAt: new Date().toISOString()
    };

    messages.push(record);
    this._saveToStorage('program_contact_messages', messages);

    return {
      success: true,
      messageId,
      status: 'sent',
      feedback: 'Message sent to provider'
    };
  }

  // getAboutPageContent()
  getAboutPageContent() {
    const content = this._getObjectFromStorage('about_page_content', {});
    return {
      mission: content.mission || '',
      howProgramsAreSourced: content.howProgramsAreSourced || '',
      verificationProcess: content.verificationProcess || '',
      ratingsAndReviewsInfo: content.ratingsAndReviewsInfo || '',
      forProviders: content.forProviders || ''
    };
  }

  // getHelpAndFaqContent()
  getHelpAndFaqContent() {
    const items = this._getFromStorage('help_faq_content');
    return Array.isArray(items) ? items : [];
  }

  // getSupportContactInfo()
  getSupportContactInfo() {
    const info = this._getObjectFromStorage('support_contact_info', {});
    return {
      supportEmail: info.supportEmail || '',
      supportPhone: info.supportPhone || '',
      supportHours: info.supportHours || ''
    };
  }

  // submitSupportMessage(subject, messageBody, contactEmail, contactPhone)
  submitSupportMessage(subject, messageBody, contactEmail, contactPhone) {
    if (!messageBody || typeof messageBody !== 'string' || !messageBody.trim()) {
      return { success: false, supportMessageId: null, status: 'closed', message: 'Message body is required' };
    }

    const supportMessages = this._getFromStorage('support_messages');
    const supportMessageId = this._generateId('supmsg');

    const record = {
      id: supportMessageId,
      subject: subject || null,
      messageBody,
      contactEmail: contactEmail || null,
      contactPhone: contactPhone || null,
      status: 'submitted',
      createdAt: new Date().toISOString()
    };

    supportMessages.push(record);
    this._saveToStorage('support_messages', supportMessages);

    return {
      success: true,
      supportMessageId,
      status: 'submitted',
      message: 'Support message submitted'
    };
  }

  // getTermsAndPolicies()
  getTermsAndPolicies() {
    const policies = this._getObjectFromStorage('terms_policies', {});
    return {
      termsOfUse: policies.termsOfUse || '',
      privacyPolicy: policies.privacyPolicy || '',
      cookiesAndTracking: policies.cookiesAndTracking || '',
      userReviewsGuidelines: policies.userReviewsGuidelines || '',
      providerResponsibilities: policies.providerResponsibilities || ''
    };
  }

  // signUpWithEmail(email, password)
  signUpWithEmail(email, password) {
    if (!email || !password) {
      return { success: false, message: 'Email and password are required' };
    }
    const users = this._getFromStorage('users');
    const existing = users.find((u) => u.email === email);
    if (existing) {
      return { success: false, message: 'Email already registered' };
    }

    const userId = this._generateId('user');
    const newUser = {
      id: userId,
      email,
      password // Note: stored in plain text for simplicity; hashing should be added in real apps
    };
    users.push(newUser);
    this._saveToStorage('users', users);

    const authState = { isAuthenticated: true, email };
    localStorage.setItem('auth_state', JSON.stringify(authState));

    return { success: true, message: 'Account created' };
  }

  // logInWithEmail(email, password)
  logInWithEmail(email, password) {
    if (!email || !password) {
      return { success: false, message: 'Email and password are required' };
    }
    const users = this._getFromStorage('users');
    const user = users.find((u) => u.email === email && u.password === password);
    if (!user) {
      return { success: false, message: 'Invalid email or password' };
    }

    const authState = { isAuthenticated: true, email };
    localStorage.setItem('auth_state', JSON.stringify(authState));
    return { success: true, message: 'Logged in' };
  }

  // logOut()
  logOut() {
    const authState = { isAuthenticated: false, email: null };
    localStorage.setItem('auth_state', JSON.stringify(authState));
    return { success: true };
  }

  // getAuthStatus()
  getAuthStatus() {
    const state = this._getAuthState();
    return {
      isAuthenticated: !!state.isAuthenticated,
      email: state.email || null
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
