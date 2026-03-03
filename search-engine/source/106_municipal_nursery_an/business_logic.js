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

  // ----------------------
  // Storage helpers
  // ----------------------

  _initStorage() {
    const tables = {
      // Core entities
      nurseries: [],
      nursery_opening_hours: [],
      nursery_fee_schedules: [],
      favorite_nurseries: [],
      visit_slots: [],
      visit_bookings: [],
      applications: [],
      application_nursery_preferences: [],
      activity_centers: [],
      activities: [],
      activity_registration_lists: [],
      activity_registration_items: [],
      fee_plans: [],
      calendar_days: [],
      contact_inquiries: [],
      home_locations: []
    };

    Object.keys(tables).forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify(tables[key]));
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
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) || typeof parsed === 'object' ? parsed : [];
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

  _nowIso() {
    return new Date().toISOString();
  }

  _parseDate(dateStr) {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
  }

  _getDateOnlyString(dateStrOrIso) {
    if (!dateStrOrIso) return '';
    // If it's already YYYY-MM-DD, return as-is
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStrOrIso)) return dateStrOrIso;
    const d = this._parseDate(dateStrOrIso);
    if (!d) return '';
    const year = d.getUTCFullYear();
    const month = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return year + '-' + month + '-' + day;
  }

  _districtLabel(district) {
    const map = {
      north: 'North',
      east: 'East',
      south: 'South',
      west: 'West',
      downtown: 'Downtown',
      central: 'Central'
    };
    return map[district] || district || '';
  }

  _compareTimesHHMM(a, b) {
    if (!a && !b) return 0;
    if (!a) return 1;
    if (!b) return -1;
    return a.localeCompare(b);
  }

  _calculateEstimatedMonthlyFeeForNursery(nurseryId, careType, childAgeYears, desiredStartDate) {
    const schedules = this._getFromStorage('nursery_fee_schedules');
    const relevant = schedules.filter((s) => {
      if (s.nurseryId !== nurseryId) return false;
      if (careType && s.careType !== careType) return false;
      if (typeof childAgeYears === 'number') {
        const months = Math.round(childAgeYears * 12);
        if (typeof s.ageMinMonths === 'number' && months < s.ageMinMonths) return false;
        if (typeof s.ageMaxMonths === 'number' && months > s.ageMaxMonths) return false;
      }
      const refDate = desiredStartDate ? this._parseDate(desiredStartDate) : null;
      if (refDate) {
        if (s.validFrom) {
          const vf = this._parseDate(s.validFrom);
          if (vf && refDate < vf) return false;
        }
        if (s.validTo) {
          const vt = this._parseDate(s.validTo);
          if (vt && refDate > vt) return false;
        }
      }
      return true;
    });
    if (!relevant.length) return null;
    let min = null;
    relevant.forEach((s) => {
      if (typeof s.monthlyFee === 'number') {
        if (min === null || s.monthlyFee < min) min = s.monthlyFee;
      }
    });
    return min;
  }

  // ----------------------
  // Required helperFunctions
  // ----------------------

  _getOrCreateFavoritesStore() {
    let favorites = this._getFromStorage('favorite_nurseries');
    if (!Array.isArray(favorites)) {
      favorites = [];
      this._saveToStorage('favorite_nurseries', favorites);
    }
    return favorites;
  }

  _getOrCreateActivityRegistrationList() {
    let lists = this._getFromStorage('activity_registration_lists');
    let current = lists.find((l) => l.status === 'in_progress');
    if (!current) {
      current = {
        id: this._generateId('activity_reg_list'),
        childName: '',
        numChildren: 0,
        status: 'in_progress',
        createdAt: this._nowIso(),
        submittedAt: null
      };
      lists.push(current);
      this._saveToStorage('activity_registration_lists', lists);
    }
    return current;
  }

  _getOrCreateCurrentApplication() {
    let applications = this._getFromStorage('applications');
    let app = applications.find((a) => a.status === 'draft');
    if (!app) {
      const todayStr = this._getDateOnlyString(new Date().toISOString());
      app = {
        id: this._generateId('application'),
        desiredStartDate: todayStr,
        careType: 'other',
        scheduleType: 'other',
        childName: '',
        childDateOfBirth: todayStr,
        parentName: '',
        parentPhone: '',
        parentEmail: '',
        districtFilter: null,
        source: 'nursery_search',
        status: 'draft',
        createdAt: this._nowIso(),
        updatedAt: this._nowIso()
      };
      applications.push(app);
      this._saveToStorage('applications', applications);
    }
    return app;
  }

  _calculateChildAgeInMonths(dateOfBirth, referenceDate) {
    if (!dateOfBirth) return null;
    const dob = this._parseDate(dateOfBirth);
    if (!dob) return null;
    const ref = referenceDate ? this._parseDate(referenceDate) : new Date();
    if (!ref) return null;
    let months = (ref.getFullYear() - dob.getFullYear()) * 12;
    months += ref.getMonth() - dob.getMonth();
    if (ref.getDate() < dob.getDate()) {
      months -= 1;
    }
    return months;
  }

  // ----------------------
  // Foreign key resolution helpers (per method usage)
  // ----------------------

  _getNurseryById(id) {
    const nurseries = this._getFromStorage('nurseries');
    return nurseries.find((n) => n.id === id) || null;
  }

  _getVisitSlotById(id) {
    const slots = this._getFromStorage('visit_slots');
    return slots.find((s) => s.id === id) || null;
  }

  _getApplicationById(id) {
    const apps = this._getFromStorage('applications');
    return apps.find((a) => a.id === id) || null;
  }

  _getActivityById(id) {
    const activities = this._getFromStorage('activities');
    return activities.find((a) => a.id === id) || null;
  }

  _getActivityCenterById(id) {
    const centers = this._getFromStorage('activity_centers');
    return centers.find((c) => c.id === id) || null;
  }

  _getActivityRegistrationListById(id) {
    const lists = this._getFromStorage('activity_registration_lists');
    return lists.find((l) => l.id === id) || null;
  }

  // ----------------------
  // Interface: getHomepageHighlights
  // ----------------------

  getHomepageHighlights() {
    const nurseryFilters = this.getNurserySearchFilterOptions();
    const quickSearchDefaults = {
      maxDistanceKmOptions: nurseryFilters.maxDistanceKmOptions,
      careTypes: nurseryFilters.careTypes
    };

    const popularTasks = [
      {
        id: 'apply_for_place',
        title: 'Apply for a nursery place',
        description: 'Search for nurseries and start an application for your child.',
        primaryAction: 'open_nursery_search'
      },
      {
        id: 'book_a_visit',
        title: 'Book a nursery visit',
        description: 'Find a nearby nursery and book a visit or tour.',
        primaryAction: 'open_visit_search'
      },
      {
        id: 'calculate_fees',
        title: 'Check your fees and subsidies',
        description: 'Estimate your monthly nursery fees based on income and schedule.',
        primaryAction: 'open_fee_calculator'
      }
    ];

    return { quickSearchDefaults, popularTasks };
  }

  // ----------------------
  // Interface: getNurserySearchFilterOptions
  // ----------------------

  getNurserySearchFilterOptions() {
    const districts = [
      { value: 'north', label: 'North' },
      { value: 'east', label: 'East' },
      { value: 'south', label: 'South' },
      { value: 'west', label: 'West' },
      { value: 'downtown', label: 'Downtown' },
      { value: 'central', label: 'Central' }
    ];

    const maxDistanceKmOptions = [1, 2, 3, 5, 10];

    const careTypes = [
      { value: 'full_day_8h_plus', label: 'Full day (8+ hours)' },
      { value: 'half_day_5h', label: 'Half-day (5 hours)' },
      { value: 'other', label: 'Other schedules' }
    ];

    const ratingOptions = [3.0, 3.5, 4.0, 4.5, 5.0];

    const openingTimeOptions = ['06:30', '07:00', '07:30', '08:00'];

    const mealsDietOptions = {
      nutFreeLabel: 'Nut-free menu',
      lactoseFreeLabel: 'Lactose-free options'
    };

    const feeRangeSuggestions = [300, 400, 500, 600, 700];

    const sortOptions = [
      { value: 'monthly_fee_asc', label: 'Monthly fee: Low to High' },
      { value: 'monthly_fee_desc', label: 'Monthly fee: High to Low' },
      { value: 'rating_desc', label: 'Rating: High to Low' },
      { value: 'rating_asc', label: 'Rating: Low to High' },
      { value: 'opening_time_asc', label: 'Opening time: Earliest first' },
      { value: 'distance_asc', label: 'Distance: Nearest first' },
      { value: 'name_asc', label: 'Name: A to Z' }
    ];

    return {
      districts,
      maxDistanceKmOptions,
      careTypes,
      ratingOptions,
      openingTimeOptions,
      mealsDietOptions,
      feeRangeSuggestions,
      sortOptions
    };
  }

  // ----------------------
  // Interface: searchNurseries
  // ----------------------

  searchNurseries(
    childAgeYears,
    desiredStartDate,
    maxDistanceKm,
    district,
    careType,
    maxMonthlyFee,
    minRating,
    opensByTimeWeekday,
    hasNutFreeMenu,
    hasLactoseFreeOptions,
    hasLargeOutdoorPlayground,
    sortBy
  ) {
    const nurseries = this._getFromStorage('nurseries');
    const favorites = this._getFromStorage('favorite_nurseries');

    const results = [];

    for (let i = 0; i < nurseries.length; i++) {
      const n = nurseries[i];

      // Distance filter
      if (typeof maxDistanceKm === 'number') {
        if (typeof n.distanceFromHomeKm === 'number') {
          if (n.distanceFromHomeKm > maxDistanceKm) continue;
        } else {
          // No distance info, exclude when a maxDistance is specified
          continue;
        }
      }

      // District filter
      if (district && n.district !== district) continue;

      // Care type filter (based on flags)
      if (careType === 'full_day_8h_plus' && !n.hasFullDayCare) continue;
      if (careType === 'half_day_5h' && !n.hasHalfDayCare) continue;

      // Age acceptance filter
      if (typeof childAgeYears === 'number') {
        const childAgeMonths = Math.round(childAgeYears * 12);
        if (typeof n.acceptedAgeMinMonths === 'number' && childAgeMonths < n.acceptedAgeMinMonths) {
          continue;
        }
        if (typeof n.acceptedAgeMaxMonths === 'number' && childAgeMonths > n.acceptedAgeMaxMonths) {
          continue;
        }
      }

      // Meals filters
      if (hasNutFreeMenu === true && !n.hasNutFreeMenu) continue;
      if (hasLactoseFreeOptions === true && !n.hasLactoseFreeOptions) continue;

      // Facilities
      if (hasLargeOutdoorPlayground === true && !n.hasLargeOutdoorPlayground) continue;

      // Opening time filter
      if (opensByTimeWeekday) {
        if (!n.opensByTimeWeekday) continue;
        if (this._compareTimesHHMM(n.opensByTimeWeekday, opensByTimeWeekday) > 0) continue;
      }

      // Rating filter
      if (typeof minRating === 'number') {
        if (typeof n.ratingAverage !== 'number' || n.ratingAverage < minRating) continue;
      }

      // Fee estimation
      let estimatedFee = null;
      if (careType) {
        estimatedFee = this._calculateEstimatedMonthlyFeeForNursery(
          n.id,
          careType,
          childAgeYears,
          desiredStartDate
        );
      }
      if (estimatedFee === null && typeof n.baseMonthlyFee === 'number') {
        estimatedFee = n.baseMonthlyFee;
      }

      if (typeof maxMonthlyFee === 'number') {
        if (estimatedFee === null || estimatedFee > maxMonthlyFee) continue;
      }

      const isFavorite = favorites.some((f) => f.nurseryId === n.id);

      const card = {
        nurseryId: n.id,
        name: n.name,
        district: n.district,
        districtLabel: this._districtLabel(n.district),
        address: n.address || '',
        distanceFromHomeKm: typeof n.distanceFromHomeKm === 'number' ? n.distanceFromHomeKm : null,
        ratingAverage: typeof n.ratingAverage === 'number' ? n.ratingAverage : null,
        ratingCount: typeof n.ratingCount === 'number' ? n.ratingCount : 0,
        baseMonthlyFee: typeof n.baseMonthlyFee === 'number' ? n.baseMonthlyFee : null,
        currency: n.currency || 'EUR',
        opensByTimeWeekday: n.opensByTimeWeekday || null,
        hasFullDayCare: !!n.hasFullDayCare,
        hasHalfDayCare: !!n.hasHalfDayCare,
        hasLargeOutdoorPlayground: !!n.hasLargeOutdoorPlayground,
        hasNutFreeMenu: !!n.hasNutFreeMenu,
        hasLactoseFreeOptions: !!n.hasLactoseFreeOptions,
        estimatedMonthlyFeeForCriteria: estimatedFee,
        isFavorite: isFavorite,
        // Foreign key resolution: include full nursery object
        nursery: n
      };

      results.push(card);
    }

    // Sorting
    const sortKey = sortBy || 'distance_asc';

    const numOrNull = (v) => (typeof v === 'number' ? v : null);

    results.sort((a, b) => {
      const direction = (key, asc = true) => {
        const va = numOrNull(a[key]);
        const vb = numOrNull(b[key]);
        if (va === null && vb === null) return 0;
        if (va === null) return 1;
        if (vb === null) return -1;
        return asc ? va - vb : vb - va;
      };

      switch (sortKey) {
        case 'monthly_fee_asc':
          return direction('estimatedMonthlyFeeForCriteria', true);
        case 'monthly_fee_desc':
          return direction('estimatedMonthlyFeeForCriteria', false);
        case 'rating_desc':
          return direction('ratingAverage', false);
        case 'rating_asc':
          return direction('ratingAverage', true);
        case 'opening_time_asc':
          return this._compareTimesHHMM(a.opensByTimeWeekday, b.opensByTimeWeekday);
        case 'name_asc':
          return (a.name || '').localeCompare(b.name || '');
        case 'distance_asc':
        default:
          return direction('distanceFromHomeKm', true);
      }
    });

    return results;
  }

  // ----------------------
  // Interface: getNurseryDetails
  // ----------------------

  getNurseryDetails(nurseryId) {
    const nurseries = this._getFromStorage('nurseries');
    const openings = this._getFromStorage('nursery_opening_hours');
    const feeSchedules = this._getFromStorage('nursery_fee_schedules');
    const favorites = this._getFromStorage('favorite_nurseries');

    const nursery = nurseries.find((n) => n.id === nurseryId) || null;

    const openingHours = openings
      .filter((o) => o.nurseryId === nurseryId)
      .map((o) => ({
        ...o,
        // Foreign key resolution
        nursery: nursery
      }));

    const feeSchedulesForNursery = feeSchedules
      .filter((f) => f.nurseryId === nurseryId)
      .map((f) => ({
        ...f,
        // Foreign key resolution
        nursery: nursery
      }));

    const isFavorite = favorites.some((f) => f.nurseryId === nurseryId);

    return {
      nursery,
      openingHours,
      feeSchedules: feeSchedulesForNursery,
      isFavorite
    };
  }

  // ----------------------
  // Interface: toggleNurseryFavorite
  // ----------------------

  toggleNurseryFavorite(nurseryId, mode) {
    let favorites = this._getOrCreateFavoritesStore();

    const existingIndex = favorites.findIndex((f) => f.nurseryId === nurseryId);
    let isFavorite = false;

    if (mode === 'add') {
      if (existingIndex === -1) {
        favorites.push({
          id: this._generateId('favorite_nursery'),
          nurseryId,
          createdAt: this._nowIso()
        });
      }
      isFavorite = true;
    } else if (mode === 'remove') {
      if (existingIndex !== -1) {
        favorites.splice(existingIndex, 1);
      }
      isFavorite = false;
    } else {
      // toggle
      if (existingIndex === -1) {
        favorites.push({
          id: this._generateId('favorite_nursery'),
          nurseryId,
          createdAt: this._nowIso()
        });
        isFavorite = true;
      } else {
        favorites.splice(existingIndex, 1);
        isFavorite = false;
      }
    }

    this._saveToStorage('favorite_nurseries', favorites);

    return {
      success: true,
      isFavorite,
      totalFavorites: favorites.length,
      message: isFavorite ? 'Nursery added to favorites.' : 'Nursery removed from favorites.'
    };
  }

  // ----------------------
  // Interface: getFavoriteNurseries
  // ----------------------

  getFavoriteNurseries() {
    const favorites = this._getFromStorage('favorite_nurseries');
    const nurseries = this._getFromStorage('nurseries');

    const result = favorites.map((fav) => {
      const nursery = nurseries.find((n) => n.id === fav.nurseryId) || null;
      return {
        favoriteId: fav.id,
        addedAt: fav.createdAt,
        nurseryId: fav.nurseryId,
        name: nursery ? nursery.name : '',
        district: nursery ? nursery.district : null,
        address: nursery ? nursery.address || '' : '',
        distanceFromHomeKm: nursery && typeof nursery.distanceFromHomeKm === 'number' ? nursery.distanceFromHomeKm : null,
        ratingAverage: nursery && typeof nursery.ratingAverage === 'number' ? nursery.ratingAverage : null,
        ratingCount: nursery && typeof nursery.ratingCount === 'number' ? nursery.ratingCount : 0,
        baseMonthlyFee: nursery && typeof nursery.baseMonthlyFee === 'number' ? nursery.baseMonthlyFee : null,
        currency: nursery && nursery.currency ? nursery.currency : 'EUR',
        opensByTimeWeekday: nursery && nursery.opensByTimeWeekday ? nursery.opensByTimeWeekday : null,
        hasFullDayCare: !!(nursery && nursery.hasFullDayCare),
        hasHalfDayCare: !!(nursery && nursery.hasHalfDayCare),
        // Foreign key resolution
        nursery: nursery
      };
    });

    // Sort by addedAt ascending
    result.sort((a, b) => (a.addedAt || '').localeCompare(b.addedAt || ''));

    return result;
  }

  // ----------------------
  // Interface: getVisitSearchFilterOptions
  // ----------------------

  getVisitSearchFilterOptions() {
    const maxDistanceKmOptions = [1, 2, 3, 5, 10];
    const facilityOptions = {
      largeOutdoorPlaygroundLabel: 'Large outdoor playground'
    };
    const ratingOptions = [3.0, 3.5, 4.0, 4.5, 5.0];
    const feeRangeSuggestions = [300, 400, 500, 550, 600];
    const sortOptions = [
      { value: 'rating_desc', label: 'Rating: High to Low' },
      { value: 'distance_asc', label: 'Distance: Nearest first' },
      { value: 'opening_time_asc', label: 'Opening time: Earliest first' }
    ];

    return {
      maxDistanceKmOptions,
      facilityOptions,
      ratingOptions,
      feeRangeSuggestions,
      sortOptions
    };
  }

  // ----------------------
  // Interface: searchNurseriesForVisit
  // ----------------------

  searchNurseriesForVisit(
    childAgeYears,
    maxDistanceKm,
    hasLargeOutdoorPlayground,
    maxMonthlyFee,
    minRating,
    sortBy
  ) {
    const nurseries = this._getFromStorage('nurseries');

    const results = [];

    for (let i = 0; i < nurseries.length; i++) {
      const n = nurseries[i];

      // Distance filter
      if (typeof maxDistanceKm === 'number') {
        if (typeof n.distanceFromHomeKm === 'number') {
          if (n.distanceFromHomeKm > maxDistanceKm) continue;
        } else {
          continue;
        }
      }

      // Age acceptance filter (optional, same logic as in searchNurseries)
      if (typeof childAgeYears === 'number') {
        const childAgeMonths = Math.round(childAgeYears * 12);
        if (typeof n.acceptedAgeMinMonths === 'number' && childAgeMonths < n.acceptedAgeMinMonths) continue;
        if (typeof n.acceptedAgeMaxMonths === 'number' && childAgeMonths > n.acceptedAgeMaxMonths) continue;
      }

      // Playground
      if (hasLargeOutdoorPlayground === true && !n.hasLargeOutdoorPlayground) continue;

      // Rating
      if (typeof minRating === 'number') {
        if (typeof n.ratingAverage !== 'number' || n.ratingAverage < minRating) continue;
      }

      // Fee: use baseMonthlyFee as simple proxy
      if (typeof maxMonthlyFee === 'number') {
        if (typeof n.baseMonthlyFee !== 'number' || n.baseMonthlyFee > maxMonthlyFee) continue;
      }

      const card = {
        nurseryId: n.id,
        name: n.name,
        district: n.district,
        distanceFromHomeKm: typeof n.distanceFromHomeKm === 'number' ? n.distanceFromHomeKm : null,
        ratingAverage: typeof n.ratingAverage === 'number' ? n.ratingAverage : null,
        ratingCount: typeof n.ratingCount === 'number' ? n.ratingCount : 0,
        baseMonthlyFee: typeof n.baseMonthlyFee === 'number' ? n.baseMonthlyFee : null,
        currency: n.currency || 'EUR',
        opensByTimeWeekday: n.opensByTimeWeekday || null,
        hasLargeOutdoorPlayground: !!n.hasLargeOutdoorPlayground,
        earliestAvailableVisitDateTime: null,
        nursery: n
      };

      results.push(card);
    }

    const sortKey = sortBy || 'rating_desc';

    const numOrNull = (v) => (typeof v === 'number' ? v : null);

    results.sort((a, b) => {
      switch (sortKey) {
        case 'distance_asc': {
          const va = numOrNull(a.distanceFromHomeKm);
          const vb = numOrNull(b.distanceFromHomeKm);
          if (va === null && vb === null) return 0;
          if (va === null) return 1;
          if (vb === null) return -1;
          return va - vb;
        }
        case 'opening_time_asc':
          return this._compareTimesHHMM(a.opensByTimeWeekday, b.opensByTimeWeekday);
        case 'rating_desc':
        default: {
          const va = numOrNull(a.ratingAverage);
          const vb = numOrNull(b.ratingAverage);
          if (va === null && vb === null) return 0;
          if (va === null) return 1;
          if (vb === null) return -1;
          return vb - va;
        }
      }
    });

    return results;
  }

  // ----------------------
  // Interface: getVisitAvailability
  // ----------------------

  getVisitAvailability(nurseryId, startDate, endDate) {
    const nursery = this._getNurseryById(nurseryId);
    const slots = this._getFromStorage('visit_slots');

    const start = this._parseDate(startDate);
    const end = this._parseDate(endDate);

    const availableSlots = slots
      .filter((s) => {
        if (s.nurseryId !== nurseryId) return false;
        if (s.isBooked) return false;
        const dateObj = this._parseDate(s.date);
        if (!dateObj) return false;
        if (start && dateObj < start) return false;
        if (end && dateObj > end) return false;
        return true;
      })
      .map((s) => ({
        ...s,
        nursery: nursery
      }));

    return { nursery, availableSlots };
  }

  // ----------------------
  // Interface: createVisitBooking
  // ----------------------

  createVisitBooking(
    nurseryId,
    visitSlotId,
    visitDate,
    startTime,
    endTime,
    parentName,
    parentPhone,
    reminderMethod
  ) {
    const bookings = this._getFromStorage('visit_bookings');
    const slots = this._getFromStorage('visit_slots');

    let slot = null;
    let visitDateTime = null;
    let finalEndTime = endTime || null;

    if (visitSlotId) {
      slot = slots.find((s) => s.id === visitSlotId) || null;
      if (slot) {
        visitDateTime = this._getDateOnlyString(slot.date) + 'T' + (slot.startTime || '00:00') + ':00';
        finalEndTime = slot.endTime || finalEndTime;
      }
    } else {
      const datePart = this._getDateOnlyString(visitDate);
      const startPart = startTime || '00:00';
      visitDateTime = datePart + 'T' + startPart + ':00';
    }

    const booking = {
      id: this._generateId('visit_booking'),
      nurseryId,
      visitSlotId: visitSlotId || null,
      visitDateTime,
      endTime: finalEndTime || null,
      parentName,
      parentPhone,
      reminderMethod: reminderMethod || 'none',
      createdAt: this._nowIso(),
      status: 'confirmed'
    };

    bookings.push(booking);

    // Mark slot as booked if applicable
    if (slot) {
      slot.isBooked = true;
      const idx = slots.findIndex((s) => s.id === slot.id);
      if (idx !== -1) {
        slots[idx] = slot;
      }
      this._saveToStorage('visit_slots', slots);
    }

    this._saveToStorage('visit_bookings', bookings);

    const nursery = this._getNurseryById(nurseryId);
    const visitSlot = booking.visitSlotId ? this._getVisitSlotById(booking.visitSlotId) : null;

    const bookingWithRelations = {
      ...booking,
      nursery,
      visitSlot
    };

    return {
      booking: bookingWithRelations,
      message: 'Visit booking created successfully.'
    };
  }

  // ----------------------
  // Interface: getVisitBookingSummary
  // ----------------------

  getVisitBookingSummary(visitBookingId) {
    const bookings = this._getFromStorage('visit_bookings');
    const booking = bookings.find((b) => b.id === visitBookingId) || null;
    if (!booking) {
      return { booking: null, nursery: null };
    }
    const nursery = this._getNurseryById(booking.nurseryId);
    const visitSlot = booking.visitSlotId ? this._getVisitSlotById(booking.visitSlotId) : null;

    const bookingWithRelations = {
      ...booking,
      nursery,
      visitSlot
    };

    return {
      booking: bookingWithRelations,
      nursery
    };
  }

  // ----------------------
  // Interface: getActivityFilterOptions
  // ----------------------

  getActivityFilterOptions() {
    const ageGroups = [
      { minYears: 0, maxYears: 3, label: '0–3 years' },
      { minYears: 4, maxYears: 5, label: '4–5 years' },
      { minYears: 6, maxYears: 8, label: '6–8 years' }
    ];

    const monthOptions = [
      '2025-06',
      '2025-07',
      '2025-08',
      '2025-09'
    ];

    const timeOfDayOptions = [
      { value: 'morning', label: 'Morning' },
      { value: 'afternoon', label: 'Afternoon (after 15:00)' },
      { value: 'full_day', label: 'Full day' }
    ];

    const priceRangeSuggestions = [10, 20, 30, 40, 50];

    return {
      ageGroups,
      monthOptions,
      timeOfDayOptions,
      priceRangeSuggestions
    };
  }

  // ----------------------
  // Interface: searchActivities
  // ----------------------

  searchActivities(
    ageMinYears,
    ageMaxYears,
    month,
    startDate,
    endDate,
    timeOfDay,
    maxPricePerSession
  ) {
    const activities = this._getFromStorage('activities');
    const centers = this._getFromStorage('activity_centers');

    const start = startDate ? this._parseDate(startDate) : null;
    const end = endDate ? this._parseDate(endDate) : null;

    const results = [];

    for (let i = 0; i < activities.length; i++) {
      const a = activities[i];

      // Age overlap filter
      if (typeof ageMinYears === 'number' || typeof ageMaxYears === 'number') {
        const minFilter = typeof ageMinYears === 'number' ? ageMinYears : ageMaxYears;
        const maxFilter = typeof ageMaxYears === 'number' ? ageMaxYears : ageMinYears;
        if (typeof a.ageMinYears === 'number' && typeof a.ageMaxYears === 'number') {
          const overlaps = a.ageMinYears <= maxFilter && a.ageMaxYears >= minFilter;
          if (!overlaps) continue;
        }
      }

      // Month filter
      if (month) {
        const dateStr = this._getDateOnlyString(a.date);
        if (!dateStr.startsWith(month)) continue;
      }

      // Date range filter
      if (start || end) {
        const d = this._parseDate(a.date);
        if (!d) continue;
        if (start && d < start) continue;
        if (end && d > end) continue;
      }

      // Time of day
      if (timeOfDay && a.timeOfDay !== timeOfDay) continue;

      // Price
      if (typeof maxPricePerSession === 'number') {
        if (typeof a.pricePerSession !== 'number' || a.pricePerSession > maxPricePerSession) continue;
      }

      const center = centers.find((c) => c.id === a.centerId) || null;
      results.push({
        activityId: a.id,
        name: a.name,
        date: this._getDateOnlyString(a.date),
        startTime: a.startTime,
        endTime: a.endTime,
        timeOfDay: a.timeOfDay,
        pricePerSession: a.pricePerSession,
        currency: a.currency || 'EUR',
        ageMinYears: a.ageMinYears,
        ageMaxYears: a.ageMaxYears,
        centerId: a.centerId,
        centerName: center ? center.name : '',
        centerDistrict: center ? center.district : null,
        // Foreign key resolution
        activity: a,
        center: center
      });
    }

    // Sort by date/time ascending then name
    results.sort((r1, r2) => {
      const d1 = r1.date.localeCompare(r2.date);
      if (d1 !== 0) return d1;
      const t1 = (r1.startTime || '').localeCompare(r2.startTime || '');
      if (t1 !== 0) return t1;
      return (r1.name || '').localeCompare(r2.name || '');
    });

    return results;
  }

  // ----------------------
  // Interface: getActivityDetails
  // ----------------------

  getActivityDetails(activityId) {
    const activities = this._getFromStorage('activities');
    const centers = this._getFromStorage('activity_centers');
    const items = this._getFromStorage('activity_registration_items');
    const lists = this._getFromStorage('activity_registration_lists');

    const activity = activities.find((a) => a.id === activityId) || null;
    const center = activity ? centers.find((c) => c.id === activity.centerId) || null : null;

    // Determine current in-progress registration list if any
    const currentList = lists.find((l) => l.status === 'in_progress') || null;
    let isInRegistrationList = false;
    if (currentList) {
      isInRegistrationList = items.some(
        (item) => item.registrationListId === currentList.id && item.activityId === activityId
      );
    }

    const activityWithCenter = activity
      ? {
          ...activity,
          center
        }
      : null;

    return {
      activity: activityWithCenter,
      center,
      isInRegistrationList
    };
  }

  // ----------------------
  // Interface: addActivityToRegistrationList
  // ----------------------

  addActivityToRegistrationList(activityId, childName, numChildren) {
    const list = this._getOrCreateActivityRegistrationList();

    // Update child details if provided
    let lists = this._getFromStorage('activity_registration_lists');
    const listIndex = lists.findIndex((l) => l.id === list.id);
    if (listIndex !== -1) {
      if (typeof childName === 'string' && childName) {
        lists[listIndex].childName = childName;
      }
      if (typeof numChildren === 'number' && numChildren > 0) {
        lists[listIndex].numChildren = numChildren;
      }
      list.childName = lists[listIndex].childName;
      list.numChildren = lists[listIndex].numChildren;
      this._saveToStorage('activity_registration_lists', lists);
    }

    let items = this._getFromStorage('activity_registration_items');

    const addedItem = {
      id: this._generateId('activity_reg_item'),
      registrationListId: list.id,
      activityId,
      addedAt: this._nowIso()
    };

    items.push(addedItem);
    this._saveToStorage('activity_registration_items', items);

    const listItemsCount = items.filter((i) => i.registrationListId === list.id).length;

    return {
      registrationList: list,
      addedItem,
      totalItems: listItemsCount
    };
  }

  // ----------------------
  // Interface: getActivityRegistrationSummary
  // ----------------------

  getActivityRegistrationSummary() {
    const list = this._getOrCreateActivityRegistrationList();
    const items = this._getFromStorage('activity_registration_items');
    const activities = this._getFromStorage('activities');
    const centers = this._getFromStorage('activity_centers');

    const itemsForList = items.filter((i) => i.registrationListId === list.id);

    // Group by center
    const byCenterMap = {};

    for (let i = 0; i < itemsForList.length; i++) {
      const regItem = itemsForList[i];
      const activity = activities.find((a) => a.id === regItem.activityId) || null;
      if (!activity) continue;
      const center = centers.find((c) => c.id === activity.centerId) || null;
      const centerId = center ? center.id : 'unknown';
      if (!byCenterMap[centerId]) {
        byCenterMap[centerId] = {
          center,
          items: []
        };
      }
      const regItemWithRelations = {
        ...regItem,
        registrationList: list,
        activity
      };
      byCenterMap[centerId].items.push({
        registrationItem: regItemWithRelations,
        activity
      });
    }

    const activitiesByCenter = Object.keys(byCenterMap).map((key) => byCenterMap[key]);

    return {
      registrationList: list,
      activitiesByCenter
    };
  }

  // ----------------------
  // Interface: updateActivityRegistrationChildDetails
  // ----------------------

  updateActivityRegistrationChildDetails(childName, numChildren) {
    const list = this._getOrCreateActivityRegistrationList();
    let lists = this._getFromStorage('activity_registration_lists');
    const idx = lists.findIndex((l) => l.id === list.id);
    if (idx !== -1) {
      lists[idx].childName = childName;
      lists[idx].numChildren = numChildren;
      this._saveToStorage('activity_registration_lists', lists);
      return { registrationList: lists[idx] };
    }
    return { registrationList: list };
  }

  // ----------------------
  // Interface: removeActivityFromRegistrationList
  // ----------------------

  removeActivityFromRegistrationList(registrationItemId) {
    const list = this._getOrCreateActivityRegistrationList();
    let items = this._getFromStorage('activity_registration_items');
    const idx = items.findIndex((i) => i.id === registrationItemId);
    let success = false;
    if (idx !== -1) {
      items.splice(idx, 1);
      success = true;
      this._saveToStorage('activity_registration_items', items);
    }

    const remainingItemsCount = items.filter((i) => i.registrationListId === list.id).length;

    return {
      success,
      registrationList: list,
      remainingItemsCount
    };
  }

  // ----------------------
  // Interface: submitActivityRegistrationList
  // ----------------------

  submitActivityRegistrationList() {
    const list = this._getOrCreateActivityRegistrationList();
    let lists = this._getFromStorage('activity_registration_lists');
    let items = this._getFromStorage('activity_registration_items');
    const activities = this._getFromStorage('activities');

    const idx = lists.findIndex((l) => l.id === list.id);
    if (idx !== -1) {
      lists[idx].status = 'submitted';
      lists[idx].submittedAt = this._nowIso();
      this._saveToStorage('activity_registration_lists', lists);
    }

    const itemsForList = items.filter((i) => i.registrationListId === list.id);
    let totalActivities = itemsForList.length;
    let totalPrice = 0;
    let currency = 'EUR';

    for (let i = 0; i < itemsForList.length; i++) {
      const activity = activities.find((a) => a.id === itemsForList[i].activityId);
      if (activity) {
        if (typeof activity.pricePerSession === 'number') {
          totalPrice += activity.pricePerSession;
        }
        if (activity.currency) {
          currency = activity.currency;
        }
      }
    }

    const updatedList = idx !== -1 ? lists[idx] : list;

    return {
      registrationList: updatedList,
      totalActivities,
      totalPrice,
      currency,
      message: 'Activity registration submitted.'
    };
  }

  // ----------------------
  // Interface: getFeesOverviewContent
  // ----------------------

  getFeesOverviewContent() {
    const overviewText =
      'Municipal nursery fees depend on your household income, your child\'s age, and the chosen schedule. ' +
      'Use the fee calculator to estimate your monthly fee and learn about available subsidies.';

    const exampleFees = [
      {
        scheduleType: 'half_day_5_days',
        ageYears: 2,
        monthlyFee: 250,
        currency: 'EUR'
      },
      {
        scheduleType: 'full_day_5_days',
        ageYears: 2,
        monthlyFee: 420,
        currency: 'EUR'
      }
    ];

    const subsidiesSummary =
      'Families with lower household income may be eligible for reduced fees or subsidies. ' +
      'Reductions are calculated automatically based on your declared income. Contact the municipal nursery ' +
      'service if you need help understanding your eligibility.';

    return {
      overviewText,
      exampleFees,
      subsidiesSummary
    };
  }

  // ----------------------
  // Interface: calculateFeeEstimate
  // ----------------------

  calculateFeeEstimate(householdMonthlyIncome, childAgeYears, scheduleType) {
    const income = typeof householdMonthlyIncome === 'number' ? householdMonthlyIncome : 0;

    let base;
    if (scheduleType === 'half_day_5_days') {
      base = 200;
    } else if (scheduleType === 'full_day_5_days') {
      base = 350;
    } else {
      base = 250;
    }

    const incomeComponent = income * 0.05; // 5% of monthly income

    const ageFactor = typeof childAgeYears === 'number' ? Math.max(0, 3 - childAgeYears) * 10 : 0;

    let estimatedMonthlyFee = Math.round(base + incomeComponent + ageFactor);
    if (estimatedMonthlyFee < 50) estimatedMonthlyFee = 50;

    return {
      estimatedMonthlyFee,
      currency: 'EUR',
      inputsEcho: {
        householdMonthlyIncome: income,
        childAgeYears,
        scheduleType
      }
    };
  }

  // ----------------------
  // Interface: saveFeePlan
  // ----------------------

  saveFeePlan(name, householdMonthlyIncome, childAgeYears, scheduleType, estimatedMonthlyFee) {
    const plans = this._getFromStorage('fee_plans');

    const plan = {
      id: this._generateId('fee_plan'),
      name,
      householdMonthlyIncome,
      childAgeYears,
      scheduleType,
      estimatedMonthlyFee,
      createdAt: this._nowIso()
    };

    plans.push(plan);
    this._saveToStorage('fee_plans', plans);

    return {
      feePlan: plan,
      message: 'Fee plan saved.'
    };
  }

  // ----------------------
  // Interface: getSavedFeePlans
  // ----------------------

  getSavedFeePlans() {
    return this._getFromStorage('fee_plans');
  }

  // ----------------------
  // Interface: startApplicationWithNurseries
  // ----------------------

  startApplicationWithNurseries(
    nurseryIds,
    desiredStartDate,
    careType,
    scheduleType,
    source,
    districtFilter
  ) {
    const applications = this._getFromStorage('applications');
    const preferences = this._getFromStorage('application_nursery_preferences');
    const nurseries = this._getFromStorage('nurseries');

    const desiredDateStr = this._getDateOnlyString(desiredStartDate);

    const application = {
      id: this._generateId('application'),
      desiredStartDate: desiredDateStr,
      careType,
      scheduleType: scheduleType || null,
      childName: '',
      childDateOfBirth: desiredDateStr,
      parentName: '',
      parentPhone: '',
      parentEmail: '',
      districtFilter: districtFilter || null,
      source,
      status: 'draft',
      createdAt: this._nowIso(),
      updatedAt: this._nowIso()
    };

    applications.push(application);
    this._saveToStorage('applications', applications);

    const nurseryPreferences = [];

    for (let i = 0; i < nurseryIds.length; i++) {
      const nid = nurseryIds[i];
      const nursery = nurseries.find((n) => n.id === nid) || null;
      const pref = {
        id: this._generateId('application_pref'),
        applicationId: application.id,
        nurseryId: nid,
        preferenceOrder: i + 1,
        selectedRatingAtCreation: nursery && typeof nursery.ratingAverage === 'number' ? nursery.ratingAverage : null
      };
      preferences.push(pref);
      nurseryPreferences.push({
        preference: {
          ...pref,
          application,
          nursery
        },
        nursery
      });
    }

    this._saveToStorage('application_nursery_preferences', preferences);

    return {
      application,
      nurseryPreferences
    };
  }

  // ----------------------
  // Interface: startApplicationFromCalendarDate
  // ----------------------

  startApplicationFromCalendarDate(desiredStartDate) {
    const applications = this._getFromStorage('applications');

    const desiredDateStr = this._getDateOnlyString(desiredStartDate);

    const application = {
      id: this._generateId('application'),
      desiredStartDate: desiredDateStr,
      careType: 'other',
      scheduleType: 'other',
      childName: '',
      childDateOfBirth: desiredDateStr,
      parentName: '',
      parentPhone: '',
      parentEmail: '',
      districtFilter: null,
      source: 'calendar',
      status: 'draft',
      createdAt: this._nowIso(),
      updatedAt: this._nowIso()
    };

    applications.push(application);
    this._saveToStorage('applications', applications);

    return { application };
  }

  // ----------------------
  // Interface: getApplicationState
  // ----------------------

  getApplicationState(applicationId) {
    const applications = this._getFromStorage('applications');
    const preferences = this._getFromStorage('application_nursery_preferences');
    const nurseries = this._getFromStorage('nurseries');

    const application = applications.find((a) => a.id === applicationId) || null;
    if (!application) {
      return { application: null, nurseryPreferences: [] };
    }

    const prefsForApp = preferences
      .filter((p) => p.applicationId === applicationId)
      .sort((a, b) => a.preferenceOrder - b.preferenceOrder);

    const nurseryPreferences = prefsForApp.map((p) => {
      const nursery = nurseries.find((n) => n.id === p.nurseryId) || null;
      const prefWithRelations = {
        ...p,
        application,
        nursery
      };
      return {
        preference: prefWithRelations,
        nursery
      };
    });

    return {
      application,
      nurseryPreferences
    };
  }

  // ----------------------
  // Interface: updateApplicationDetails
  // ----------------------

  updateApplicationDetails(
    applicationId,
    desiredStartDate,
    careType,
    scheduleType,
    childName,
    childDateOfBirth,
    parentName,
    parentPhone,
    parentEmail,
    districtFilter
  ) {
    let applications = this._getFromStorage('applications');
    const idx = applications.findIndex((a) => a.id === applicationId);
    if (idx === -1) {
      return { application: null };
    }

    const app = { ...applications[idx] };

    if (desiredStartDate) app.desiredStartDate = this._getDateOnlyString(desiredStartDate);
    if (careType) app.careType = careType;
    if (scheduleType) app.scheduleType = scheduleType;
    if (typeof childName === 'string') app.childName = childName;
    if (childDateOfBirth) app.childDateOfBirth = this._getDateOnlyString(childDateOfBirth);
    if (typeof parentName === 'string') app.parentName = parentName;
    if (typeof parentPhone === 'string') app.parentPhone = parentPhone;
    if (typeof parentEmail === 'string') app.parentEmail = parentEmail;
    if (districtFilter) app.districtFilter = districtFilter;

    app.updatedAt = this._nowIso();

    applications[idx] = app;
    this._saveToStorage('applications', applications);

    return { application: app };
  }

  // ----------------------
  // Interface: addNurseryToApplication
  // ----------------------

  addNurseryToApplication(applicationId, nurseryId) {
    const applications = this._getFromStorage('applications');
    const preferences = this._getFromStorage('application_nursery_preferences');
    const nurseries = this._getFromStorage('nurseries');

    const application = applications.find((a) => a.id === applicationId) || null;
    if (!application) {
      return { preference: null, nursery: null };
    }

    const prefsForApp = preferences.filter((p) => p.applicationId === applicationId);
    let maxOrder = 0;
    prefsForApp.forEach((p) => {
      if (typeof p.preferenceOrder === 'number' && p.preferenceOrder > maxOrder) {
        maxOrder = p.preferenceOrder;
      }
    });

    const nursery = nurseries.find((n) => n.id === nurseryId) || null;

    const pref = {
      id: this._generateId('application_pref'),
      applicationId,
      nurseryId,
      preferenceOrder: maxOrder + 1,
      selectedRatingAtCreation: nursery && typeof nursery.ratingAverage === 'number' ? nursery.ratingAverage : null
    };

    preferences.push(pref);
    this._saveToStorage('application_nursery_preferences', preferences);

    const prefWithRelations = {
      ...pref,
      application,
      nursery
    };

    const preferenceWrapper = {
      preference: prefWithRelations,
      nursery
    };

    return {
      preference: preferenceWrapper,
      nursery
    };
  }

  // ----------------------
  // Interface: removeNurseryFromApplication
  // ----------------------

  removeNurseryFromApplication(applicationId, nurseryId) {
    let preferences = this._getFromStorage('application_nursery_preferences');

    const beforeCount = preferences.length;
    preferences = preferences.filter((p) => !(p.applicationId === applicationId && p.nurseryId === nurseryId));

    // Resequence remaining preferences for this application
    const prefsForApp = preferences
      .filter((p) => p.applicationId === applicationId)
      .sort((a, b) => a.preferenceOrder - b.preferenceOrder);

    for (let i = 0; i < prefsForApp.length; i++) {
      prefsForApp[i].preferenceOrder = i + 1;
    }

    // Persist
    this._saveToStorage('application_nursery_preferences', preferences);

    const remainingPreferencesCount = prefsForApp.length;

    return {
      success: preferences.length < beforeCount,
      applicationId,
      remainingPreferencesCount
    };
  }

  // ----------------------
  // Interface: setApplicationNurseryPreferences
  // ----------------------

  setApplicationNurseryPreferences(applicationId, preferencesInput) {
    const applications = this._getFromStorage('applications');
    const nurseries = this._getFromStorage('nurseries');
    let preferences = this._getFromStorage('application_nursery_preferences');

    const application = applications.find((a) => a.id === applicationId) || null;
    if (!application) {
      return { nurseryPreferences: [] };
    }

    // Remove existing prefs for this application
    preferences = preferences.filter((p) => p.applicationId !== applicationId);

    const nurseryPreferences = [];

    for (let i = 0; i < preferencesInput.length; i++) {
      const input = preferencesInput[i];
      const nursery = nurseries.find((n) => n.id === input.nurseryId) || null;
      const pref = {
        id: this._generateId('application_pref'),
        applicationId,
        nurseryId: input.nurseryId,
        preferenceOrder: input.preferenceOrder,
        selectedRatingAtCreation: nursery && typeof nursery.ratingAverage === 'number' ? nursery.ratingAverage : null
      };
      preferences.push(pref);
      const prefWithRelations = {
        ...pref,
        application,
        nursery
      };
      nurseryPreferences.push({ preference: prefWithRelations, nursery });
    }

    // Persist
    this._saveToStorage('application_nursery_preferences', preferences);

    // Sort by preferenceOrder in return
    nurseryPreferences.sort((a, b) => a.preference.preferenceOrder - b.preference.preferenceOrder);

    return {
      nurseryPreferences
    };
  }

  // ----------------------
  // Interface: submitApplication
  // ----------------------

  submitApplication(applicationId) {
    let applications = this._getFromStorage('applications');
    const idx = applications.findIndex((a) => a.id === applicationId);
    if (idx === -1) {
      return { application: null, message: 'Application not found.' };
    }

    applications[idx].status = 'submitted';
    applications[idx].updatedAt = this._nowIso();
    this._saveToStorage('applications', applications);

    return {
      application: applications[idx],
      message: 'Application submitted.'
    };
  }

  // ----------------------
  // Interface: getCalendarMonthDays
  // ----------------------

  getCalendarMonthDays(year, month) {
    const days = this._getFromStorage('calendar_days');

    const result = days.filter((d) => {
      const date = this._parseDate(d.date);
      if (!date) return false;
      const y = date.getFullYear();
      const m = date.getMonth() + 1; // JS months are 0-based
      return y === year && m === month;
    });

    // Sort by date
    result.sort((a, b) => {
      const da = this._getDateOnlyString(a.date);
      const db = this._getDateOnlyString(b.date);
      return da.localeCompare(db);
    });

    return result;
  }

  // ----------------------
  // Interface: getFirstOpenDayAfter
  // ----------------------

  getFirstOpenDayAfter(fromDate) {
    const days = this._getFromStorage('calendar_days');
    const from = this._parseDate(fromDate);

    let candidate = null;

    for (let i = 0; i < days.length; i++) {
      const d = days[i];
      if (d.status !== 'open') continue;
      const dateObj = this._parseDate(d.date);
      if (!dateObj || !from) continue;
      if (dateObj <= from) continue;
      if (!candidate) {
        candidate = d;
      } else {
        const candDate = this._parseDate(candidate.date);
        if (candDate && dateObj < candDate) {
          candidate = d;
        }
      }
    }

    if (!candidate) {
      return { date: '', calendarDay: null };
    }

    const dateOnly = this._getDateOnlyString(candidate.date);
    return { date: dateOnly, calendarDay: candidate };
  }

  // ----------------------
  // Interface: getContactSubjects
  // ----------------------

  getContactSubjects() {
    return [
      { value: 'meals_allergies', label: 'Meals / Allergies' },
      { value: 'applications', label: 'Applications' },
      { value: 'visits_tours', label: 'Visits & Tours' },
      { value: 'general_question', label: 'General question' }
    ];
  }

  // ----------------------
  // Interface: submitContactInquiry
  // ----------------------

  submitContactInquiry(subject, message, parentName, email, phone, nurseryId) {
    const inquiries = this._getFromStorage('contact_inquiries');

    const inquiry = {
      id: this._generateId('contact_inquiry'),
      subject,
      message,
      parentName,
      email,
      phone: phone || '',
      nurseryId: nurseryId || null,
      createdAt: this._nowIso()
    };

    inquiries.push(inquiry);
    this._saveToStorage('contact_inquiries', inquiries);

    const nursery = nurseryId ? this._getNurseryById(nurseryId) : null;

    const inquiryWithRelations = {
      ...inquiry,
      nursery
    };

    return {
      inquiry: inquiryWithRelations,
      message: 'Contact inquiry submitted.'
    };
  }

  // ----------------------
  // Interface: getAboutServiceContent
  // ----------------------

  getAboutServiceContent() {
    const nurseries = this._getFromStorage('nurseries');
    const centers = this._getFromStorage('activity_centers');

    const missionText =
      'The municipal nursery service provides safe, inclusive and affordable early childhood education ' +
      'for families across all city districts.';

    const valuesText =
      'We focus on children\'s well-being, play-based learning, strong family partnerships and high-quality staff.';

    const numCenters = centers.length || nurseries.length || 0;

    const districtsSet = {};
    nurseries.forEach((n) => {
      if (n.district) districtsSet[this._districtLabel(n.district)] = true;
    });
    centers.forEach((c) => {
      if (c.district) districtsSet[this._districtLabel(c.district)] = true;
    });
    const districtsServed = Object.keys(districtsSet);

    const contactChannels = [
      {
        type: 'phone',
        label: 'Phone',
        description: 'Call the municipal nursery service center during office hours.'
      },
      {
        type: 'email',
        label: 'Email',
        description: 'Send us an email and we will respond within 2–3 working days.'
      },
      {
        type: 'in_person',
        label: 'In person',
        description: 'Visit the family services desk at the city hall for personal assistance.'
      }
    ];

    return {
      missionText,
      valuesText,
      numCenters,
      districtsServed,
      contactChannels
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
