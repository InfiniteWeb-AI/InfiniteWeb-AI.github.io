/*
  Business Logic implementation for Outdoor Education Programs website
  - Uses localStorage (with Node.js polyfill) for persistence
  - No DOM/window/document usage except localStorage
*/

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

  // ------------------------
  // Storage helpers
  // ------------------------

  _initStorage() {
    const keys = [
      'programs',
      'locations',
      'favorite_program_lists',
      'quote_requests',
      'activities',
      'itineraries',
      'itinerary_items',
      'trip_pricing_profiles',
      'meal_plans',
      'gear_rental_options',
      'cost_estimates',
      'teacher_profiles',
      'safety_sections',
      'safety_documents',
      'contact_inquiries',
      'planning_call_slots',
      'planning_call_bookings',
      'addon_options',
      'reservations',
      'reservation_addons',
      'resources',
      'resource_collections',
      'resource_collection_items'
    ];

    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, defaultValue) {
    const data = localStorage.getItem(key);
    if (data === null || data === undefined) {
      return defaultValue !== undefined ? defaultValue : [];
    }
    try {
      return JSON.parse(data);
    } catch (e) {
      return defaultValue !== undefined ? defaultValue : [];
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

  _parseDateOnly(dateTimeIso) {
    if (!dateTimeIso) return null;
    return dateTimeIso.substring(0, 10);
  }

  _haversineDistanceMiles(lat1, lon1, lat2, lon2) {
    if (
      lat1 === null || lat1 === undefined ||
      lon1 === null || lon1 === undefined ||
      lat2 === null || lat2 === undefined ||
      lon2 === null || lon2 === undefined
    ) {
      return null;
    }
    const toRad = (v) => (v * Math.PI) / 180;
    const R = 3958.8; // miles
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  _gradeRangeText(min, max) {
    if (!min && !max) return 'All grades';
    if (min && !max) return 'Grade ' + min;
    if (!min && max) return 'Up to grade ' + max;
    if (min === max) return 'Grade ' + min;
    return 'Grades ' + min + '–' + max;
  }

  _durationLabel(nights, tripType) {
    if (nights === 0 || tripType === 'day_trip') {
      return 'Day Trip';
    }
    if (nights === 1) return '1-night Overnight';
    return nights + '-night Overnight';
  }

  _seasonLabel(season) {
    if (!season) return '';
    return season.charAt(0).toUpperCase() + season.slice(1);
  }

  _categoryLabel(cat) {
    if (!cat) return '';
    return cat
      .split('_')
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
      .join(' ');
  }

  _findProgramById(programId) {
    const programs = this._getFromStorage('programs', []);
    return programs.find((p) => p.id === programId) || null;
  }

  _findLocationById(locationId) {
    const locations = this._getFromStorage('locations', []);
    return locations.find((l) => l.id === locationId) || null;
  }

  _findActivityById(activityId) {
    const activities = this._getFromStorage('activities', []);
    return activities.find((a) => a.id === activityId) || null;
  }

  _findMealPlanById(mealPlanId) {
    const mealPlans = this._getFromStorage('meal_plans', []);
    return mealPlans.find((m) => m.id === mealPlanId) || null;
  }

  _findGearRentalOptionById(gearRentalOptionId) {
    const options = this._getFromStorage('gear_rental_options', []);
    return options.find((g) => g.id === gearRentalOptionId) || null;
  }

  _findAddonOptionById(addonOptionId) {
    const options = this._getFromStorage('addon_options', []);
    return options.find((a) => a.id === addonOptionId) || null;
  }

  // ------------------------
  // Helper functions (private)
  // ------------------------

  _getOrCreateFavoriteProgramList() {
    let lists = this._getFromStorage('favorite_program_lists', []);
    if (lists.length > 0) {
      return lists[0];
    }
    const now = this._nowIso();
    const list = {
      id: this._generateId('favlist'),
      programIds: [],
      createdAt: now,
      updatedAt: now
    };
    lists.push(list);
    this._saveToStorage('favorite_program_lists', lists);
    return list;
  }

  _getOrCreateCurrentItinerary() {
    const currentId = localStorage.getItem('current_itinerary_id');
    let itineraries = this._getFromStorage('itineraries', []);
    if (currentId) {
      const existing = itineraries.find((i) => i.id === currentId);
      if (existing) return existing;
    }
    const now = this._nowIso();
    const itinerary = {
      id: this._generateId('itin'),
      name: 'Untitled Itinerary',
      notes: '',
      createdAt: now,
      updatedAt: now
    };
    itineraries.push(itinerary);
    this._saveToStorage('itineraries', itineraries);
    localStorage.setItem('current_itinerary_id', itinerary.id);
    return itinerary;
  }

  _getOrCreateResourceCollection() {
    const currentId = localStorage.getItem('current_resource_collection_id');
    let collections = this._getFromStorage('resource_collections', []);
    if (currentId) {
      const existing = collections.find((c) => c.id === currentId);
      if (existing) return existing;
    }
    const now = this._nowIso();
    const shareToken = this._generateId('share');
    const shareUrl = 'https://example.com/resources/' + shareToken;
    const collection = {
      id: this._generateId('rc'),
      name: null,
      shareToken: shareToken,
      shareUrl: shareUrl,
      createdAt: now,
      updatedAt: now
    };
    collections.push(collection);
    this._saveToStorage('resource_collections', collections);
    localStorage.setItem('current_resource_collection_id', collection.id);
    return collection;
  }

  _getCurrentTeacherProfile() {
    const currentId = localStorage.getItem('current_teacher_profile_id');
    const profiles = this._getFromStorage('teacher_profiles', []);
    if (!currentId) return null;
    return profiles.find((p) => p.id === currentId) || null;
  }

  _getOrCreateReservation(programId) {
    let reservations = this._getFromStorage('reservations', []);
    const currentId = localStorage.getItem('current_reservation_id');
    if (currentId) {
      const existing = reservations.find(
        (r) => r.id === currentId && r.status === 'in_progress'
      );
      if (existing && (!programId || existing.programId === programId)) {
        return existing;
      }
    }
    // Create new reservation
    const program = this._findProgramById(programId);
    if (!program) {
      throw new Error('Program not found for reservation');
    }
    const now = this._nowIso();
    const reservation = {
      id: this._generateId('res'),
      programId: programId,
      groupName: '',
      startDate: '',
      numberOfStudents: 0,
      paymentMethod: 'not_set',
      status: 'in_progress',
      subtotalBase: 0,
      subtotalAddons: 0,
      totalCost: 0,
      currency: program.currency || 'USD',
      notes: '',
      createdAt: now,
      updatedAt: now
    };
    reservations.push(reservation);
    this._saveToStorage('reservations', reservations);
    localStorage.setItem('current_reservation_id', reservation.id);
    return reservation;
  }

  _saveCostEstimateRecord(payload) {
    const estimates = this._getFromStorage('cost_estimates', []);
    const now = this._nowIso();
    const id = this._generateId('ce');
    const record = {
      id: id,
      groupType: payload.groupType,
      gradeLevel: payload.gradeLevel,
      numberOfStudents: payload.numberOfStudents,
      tripLength: payload.tripLength,
      mealPlanId: payload.mealPlanId || null,
      gearRentalOptionId: payload.gearRentalOptionId || null,
      basePricePerStudent: payload.basePricePerStudent,
      mealPricePerStudent: payload.mealPricePerStudent,
      gearPricePerStudent: payload.gearPricePerStudent,
      totalPrice: payload.totalPrice,
      pricePerStudent: payload.pricePerStudent,
      currency: payload.currency || 'USD',
      createdAt: now
    };
    estimates.push(record);
    this._saveToStorage('cost_estimates', estimates);
    return record;
  }

  _updatePlanningCallSlotAvailability(slotId, bookingData) {
    let slots = this._getFromStorage('planning_call_slots', []);
    let bookings = this._getFromStorage('planning_call_bookings', []);
    const slot = slots.find((s) => s.id === slotId || s.slotId === slotId);
    if (!slot || slot.isAvailable === false) {
      return { success: false, message: 'Slot not available', booking: null };
    }
    slot.isAvailable = false;
    slot.updatedAt = this._nowIso();
    const bookingId = this._generateId('pcb');
    const booking = {
      id: bookingId,
      slotId: slot.id || slot.slotId,
      name: bookingData.name,
      role: bookingData.role,
      schoolName: bookingData.schoolName,
      email: bookingData.email,
      notes: bookingData.notes || '',
      status: 'scheduled',
      callType: 'planning_call',
      createdAt: this._nowIso()
    };
    bookings.push(booking);
    this._saveToStorage('planning_call_slots', slots);
    this._saveToStorage('planning_call_bookings', bookings);
    return { success: true, booking: booking, slot: slot };
  }

  // ------------------------
  // Interface implementations
  // ------------------------

  // getHomePageContent()
  getHomePageContent() {
    const programs = this._getFromStorage('programs', []);
    const locations = this._getFromStorage('locations', []);

    const activePrograms = programs.filter((p) => p.isActive);

    const featuredPrograms = activePrograms
      .filter((p) => p.isFeatured)
      .slice(0, 6)
      .map((p) => {
        const loc = locations.find((l) => l.id === p.mainLocationId) || null;
        return {
          programId: p.id,
          title: p.title,
          shortDescription: p.shortDescription || '',
          gradeRangeText: this._gradeRangeText(p.gradeMin, p.gradeMax),
          tripType: p.tripType,
          durationNights: p.durationNights,
          durationLabel: this._durationLabel(p.durationNights, p.tripType),
          season: p.season,
          basePricePerStudent: p.basePricePerStudent,
          currency: p.currency || 'USD',
          mainLocationName: loc ? loc.name : '',
          requestQuoteEnabled: !!p.requestQuoteEnabled,
          reservationEnabled: !!p.reservationEnabled,
          isFeatured: !!p.isFeatured
        };
      });

    // Seasonal highlights grouping
    const seasonalMap = {};
    for (let i = 0; i < activePrograms.length; i++) {
      const p = activePrograms[i];
      if (!seasonalMap[p.season]) {
        seasonalMap[p.season] = [];
      }
      seasonalMap[p.season].push(p.id);
    }
    const seasonalHighlights = Object.keys(seasonalMap).map((season) => ({
      season: season,
      heading: this._seasonLabel(season) + ' Programs',
      description: '',
      programIds: seasonalMap[season]
    }));

    const quickActions = [
      { key: 'find_programs', label: 'Find Programs' },
      { key: 'view_pricing', label: 'Pricing & Packages' },
      { key: 'plan_trip', label: 'Plan Your Trip' },
      { key: 'for_administrators', label: 'For Administrators' },
      { key: 'teacher_resources', label: 'Teacher Resources' },
      { key: 'view_safety', label: 'Safety & Risk Management' }
    ];

    return {
      heroTitle: 'Outdoor education programs for schools',
      heroSubtitle: 'Plan day trips and overnight experiences that align with your curriculum.',
      featuredPrograms: featuredPrograms,
      seasonalHighlights: seasonalHighlights,
      quickActions: quickActions
    };
  }

  // searchLocations(query)
  searchLocations(query) {
    const q = (query || '').trim().toLowerCase();
    const locations = this._getFromStorage('locations', []);
    if (!q) return locations;
    return locations.filter((loc) => {
      const fields = [loc.name, loc.city, loc.state, loc.country, loc.postalCode];
      for (let i = 0; i < fields.length; i++) {
        const v = fields[i];
        if (v && String(v).toLowerCase().indexOf(q) !== -1) return true;
      }
      return false;
    });
  }

  // getProgramFilterOptions()
  getProgramFilterOptions() {
    const programs = this._getFromStorage('programs', []);
    const gradeSet = {};
    const durationSet = {};
    const seasonSet = {};
    for (let i = 0; i < programs.length; i++) {
      const p = programs[i];
      if (!p.isActive) continue;
      for (let g = p.gradeMin; g <= p.gradeMax; g++) {
        gradeSet[g] = true;
      }
      durationSet[p.durationNights] = true;
      seasonSet[p.season] = true;
    }
    const gradeLevels = Object.keys(gradeSet)
      .map((k) => parseInt(k, 10))
      .sort((a, b) => a - b);
    const durations = Object.keys(durationSet)
      .map((k) => parseInt(k, 10))
      .sort((a, b) => a - b)
      .map((n) => ({ nights: n, label: this._durationLabel(n, n === 0 ? 'day_trip' : 'overnight_trip') }));
    const seasons = Object.keys(seasonSet).map((s) => ({ value: s, label: this._seasonLabel(s) }));

    const priceRanges = [
      { min: 0, max: 50, label: 'Up to $50' },
      { min: 50, max: 100, label: '$50–$100' },
      { min: 100, max: 200, label: '$100–$200' },
      { min: 200, max: null, label: '$200+' }
    ];

    const distanceOptionsMiles = [
      { value: 10, label: 'Within 10 miles' },
      { value: 25, label: 'Within 25 miles' },
      { value: 50, label: 'Within 50 miles' },
      { value: 100, label: 'Within 100 miles' }
    ];

    const monthOptions = [];
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    for (let m = 1; m <= 12; m++) {
      monthOptions.push({ value: m, label: monthNames[m - 1] });
    }

    return {
      gradeLevels: gradeLevels,
      tripTypes: [
        { value: 'day_trip', label: 'Day Trip' },
        { value: 'overnight_trip', label: 'Overnight' }
      ],
      durations: durations,
      seasons: seasons,
      priceRanges: priceRanges,
      distanceOptionsMiles: distanceOptionsMiles,
      monthOptions: monthOptions
    };
  }

  // searchPrograms(...)
  searchPrograms(
    grades,
    tripType,
    minDurationNights,
    maxDurationNights,
    season,
    months,
    locationId,
    radiusMiles,
    maxPricePerStudent,
    startDate,
    endDate,
    sortBy,
    limit,
    offset
  ) {
    const programs = this._getFromStorage('programs', []);
    const locations = this._getFromStorage('locations', []);

    const gradeList = Array.isArray(grades) ? grades : null;
    const monthList = Array.isArray(months) ? months : null;
    const startMonth = startDate ? new Date(startDate).getMonth() + 1 : null;
    const endMonth = endDate ? new Date(endDate).getMonth() + 1 : null;

    const searchLocation = locationId ? locations.find((l) => l.id === locationId) : null;

    let filtered = programs.filter((p) => p.isActive);

    if (gradeList && gradeList.length > 0) {
      filtered = filtered.filter((p) => {
        for (let i = 0; i < gradeList.length; i++) {
          const g = gradeList[i];
          if (p.gradeMin <= g && p.gradeMax >= g) return true;
        }
        return false;
      });
    }

    if (tripType) {
      filtered = filtered.filter((p) => p.tripType === tripType);
    }

    if (typeof minDurationNights === 'number') {
      filtered = filtered.filter((p) => p.durationNights >= minDurationNights);
    }
    if (typeof maxDurationNights === 'number') {
      filtered = filtered.filter((p) => p.durationNights <= maxDurationNights);
    }

    if (season) {
      filtered = filtered.filter((p) => p.season === season);
    }

    if (monthList && monthList.length > 0) {
      filtered = filtered.filter((p) => {
        if (!Array.isArray(p.typicalMonths) || p.typicalMonths.length === 0) return true;
        for (let i = 0; i < p.typicalMonths.length; i++) {
          if (monthList.indexOf(p.typicalMonths[i]) !== -1) return true;
        }
        return false;
      });
    }

    if (startMonth) {
      filtered = filtered.filter((p) => {
        if (!Array.isArray(p.typicalMonths) || p.typicalMonths.length === 0) return true;
        return p.typicalMonths.indexOf(startMonth) !== -1;
      });
    }

    if (maxPricePerStudent != null) {
      filtered = filtered.filter((p) => p.basePricePerStudent <= maxPricePerStudent);
    }

    // Distance filtering
    let withDistance = filtered.map((p) => {
      const loc = locations.find((l) => l.id === p.mainLocationId) || null;
      let distanceMilesValue = null;
      if (
        searchLocation &&
        searchLocation.latitude != null &&
        searchLocation.longitude != null &&
        loc &&
        loc.latitude != null &&
        loc.longitude != null
      ) {
        distanceMilesValue = this._haversineDistanceMiles(
          searchLocation.latitude,
          searchLocation.longitude,
          loc.latitude,
          loc.longitude
        );
      }
      return { program: p, location: loc, distanceMiles: distanceMilesValue };
    });

    if (radiusMiles != null && searchLocation) {
      withDistance = withDistance.filter((item) => {
        if (item.distanceMiles == null) return true;
        return item.distanceMiles <= radiusMiles;
      });
    }

    // Sorting
    if (sortBy === 'price_low_to_high') {
      withDistance.sort((a, b) => a.program.basePricePerStudent - b.program.basePricePerStudent);
    } else if (sortBy === 'price_high_to_low') {
      withDistance.sort((a, b) => b.program.basePricePerStudent - a.program.basePricePerStudent);
    } else if (sortBy === 'name_az') {
      withDistance.sort((a, b) => {
        const at = (a.program.title || '').toLowerCase();
        const bt = (b.program.title || '').toLowerCase();
        if (at < bt) return -1;
        if (at > bt) return 1;
        return 0;
      });
    } else if (sortBy === 'distance' && searchLocation) {
      withDistance.sort((a, b) => {
        const da = a.distanceMiles == null ? Infinity : a.distanceMiles;
        const db = b.distanceMiles == null ? Infinity : b.distanceMiles;
        return da - db;
      });
    }

    const totalCount = withDistance.length;
    const start = offset || 0;
    const end = typeof limit === 'number' ? start + limit : totalCount;
    const slice = withDistance.slice(start, end);

    const items = slice.map((item) => ({
      programId: item.program.id,
      title: item.program.title,
      shortDescription: item.program.shortDescription || '',
      gradeRangeText: this._gradeRangeText(item.program.gradeMin, item.program.gradeMax),
      tripType: item.program.tripType,
      durationNights: item.program.durationNights,
      durationLabel: this._durationLabel(item.program.durationNights, item.program.tripType),
      season: item.program.season,
      typicalMonths: Array.isArray(item.program.typicalMonths) ? item.program.typicalMonths : [],
      basePricePerStudent: item.program.basePricePerStudent,
      currency: item.program.currency || 'USD',
      mainLocationName: item.location ? item.location.name : '',
      distanceMiles: item.distanceMiles,
      requestQuoteEnabled: !!item.program.requestQuoteEnabled,
      reservationEnabled: !!item.program.reservationEnabled,
      isFeatured: !!item.program.isFeatured
    }));

    // Instrumentation for task completion tracking
    try {
      localStorage.setItem(
        'task2_lastSearchParams',
        JSON.stringify({
          grades,
          tripType,
          minDurationNights,
          maxDurationNights,
          season,
          months,
          locationId,
          radiusMiles,
          maxPricePerStudent,
          startDate,
          endDate,
          sortBy
        })
      );
      localStorage.setItem(
        'task2_lastSearchResultProgramIds',
        JSON.stringify(items.map((item) => item.programId))
      );
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return { totalCount: totalCount, items: items };
  }

  // getProgramDetail(programId)
  getProgramDetail(programId) {
    const programs = this._getFromStorage('programs', []);
    const program = programs.find((p) => p.id === programId);
    if (!program) {
      return null;
    }
    const locations = this._getFromStorage('locations', []);
    const loc = locations.find((l) => l.id === program.mainLocationId) || null;

    const addonOptions = this._getFromStorage('addon_options', []);
    const allowedAddons = Array.isArray(program.allowedAddonOptionIds)
      ? program.allowedAddonOptionIds
          .map((id) => addonOptions.find((a) => a.id === id && a.isActive))
          .filter((a) => !!a)
          .map((a) => ({
            addonOptionId: a.id,
            name: a.name,
            category: a.category || null,
            pricePerStudent: a.pricePerStudent,
            description: a.description || ''
          }))
      : [];

    const favList = this._getOrCreateFavoriteProgramList();
    const isFavorite = favList.programIds.indexOf(program.id) !== -1;

    return {
      programId: program.id,
      title: program.title,
      shortDescription: program.shortDescription || '',
      fullDescription: program.fullDescription || '',
      gradeMin: program.gradeMin,
      gradeMax: program.gradeMax,
      gradeRangeText: this._gradeRangeText(program.gradeMin, program.gradeMax),
      tripType: program.tripType,
      durationNights: program.durationNights,
      durationLabel: this._durationLabel(program.durationNights, program.tripType),
      season: program.season,
      typicalMonths: Array.isArray(program.typicalMonths) ? program.typicalMonths : [],
      basePricePerStudent: program.basePricePerStudent,
      currency: program.currency || 'USD',
      mainLocation: loc
        ? {
            locationId: loc.id,
            name: loc.name,
            city: loc.city || '',
            state: loc.state || '',
            country: loc.country || ''
          }
        : null,
      includedActivitiesSummary: Array.isArray(program.includedActivitiesSummary)
        ? program.includedActivitiesSummary
        : [],
      learningOutcomes: Array.isArray(program.learningOutcomes) ? program.learningOutcomes : [],
      highLevelItinerary: Array.isArray(program.highLevelItinerary) ? program.highLevelItinerary : [],
      allowedAddons: allowedAddons,
      requestQuoteEnabled: !!program.requestQuoteEnabled,
      reservationEnabled: !!program.reservationEnabled,
      isFavorite: isFavorite
    };
  }

  // addProgramToFavorites(programId)
  addProgramToFavorites(programId) {
    let lists = this._getFromStorage('favorite_program_lists', []);
    let list = this._getOrCreateFavoriteProgramList();
    if (list.programIds.indexOf(programId) === -1) {
      list.programIds.push(programId);
      list.updatedAt = this._nowIso();
      lists[0] = list; // single-user list
      this._saveToStorage('favorite_program_lists', lists);
    }

    // Instrumentation for task completion tracking
    try {
      localStorage.setItem('task2_favoriteProgramId', String(programId));
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      success: true,
      favoriteCount: list.programIds.length,
      message: 'Program added to favorites.'
    };
  }

  // removeProgramFromFavorites(programId)
  removeProgramFromFavorites(programId) {
    let lists = this._getFromStorage('favorite_program_lists', []);
    if (lists.length === 0) {
      return { success: true, favoriteCount: 0, message: 'No favorites list.' };
    }
    const list = lists[0];
    const idx = list.programIds.indexOf(programId);
    if (idx !== -1) {
      list.programIds.splice(idx, 1);
      list.updatedAt = this._nowIso();
      lists[0] = list;
      this._saveToStorage('favorite_program_lists', lists);
    }
    return {
      success: true,
      favoriteCount: list.programIds.length,
      message: 'Program removed from favorites.'
    };
  }

  // getFavoritePrograms()
  getFavoritePrograms() {
    const list = this._getOrCreateFavoriteProgramList();
    const programs = this._getFromStorage('programs', []);
    const locations = this._getFromStorage('locations', []);
    const items = [];
    for (let i = 0; i < list.programIds.length; i++) {
      const pid = list.programIds[i];
      const p = programs.find((pr) => pr.id === pid);
      if (!p) continue;
      const loc = locations.find((l) => l.id === p.mainLocationId) || null;
      items.push({
        programId: p.id,
        title: p.title,
        shortDescription: p.shortDescription || '',
        gradeRangeText: this._gradeRangeText(p.gradeMin, p.gradeMax),
        tripType: p.tripType,
        durationNights: p.durationNights,
        durationLabel: this._durationLabel(p.durationNights, p.tripType),
        season: p.season,
        basePricePerStudent: p.basePricePerStudent,
        currency: p.currency || 'USD',
        mainLocationName: loc ? loc.name : ''
      });
    }
    return { totalCount: items.length, items: items };
  }

  // clearFavoritePrograms()
  clearFavoritePrograms() {
    let lists = this._getFromStorage('favorite_program_lists', []);
    if (lists.length > 0) {
      lists[0].programIds = [];
      lists[0].updatedAt = this._nowIso();
      this._saveToStorage('favorite_program_lists', lists);
    }
    return { success: true, message: 'Favorites cleared.' };
  }

  // submitProgramQuoteRequest(...)
  submitProgramQuoteRequest(
    programId,
    requesterName,
    requesterEmail,
    gradeLevel,
    preferredDate,
    numberOfStudents,
    maxPricePerStudent
  ) {
    const quoteRequests = this._getFromStorage('quote_requests', []);
    const now = this._nowIso();
    const id = this._generateId('qr');
    const record = {
      id: id,
      programId: programId,
      requesterName: requesterName,
      requesterEmail: requesterEmail,
      gradeLevel: gradeLevel != null ? gradeLevel : null,
      preferredDate: preferredDate,
      numberOfStudents: numberOfStudents,
      maxPricePerStudent: maxPricePerStudent != null ? maxPricePerStudent : null,
      status: 'new',
      notesInternal: '',
      createdAt: now,
      updatedAt: now
    };
    quoteRequests.push(record);
    this._saveToStorage('quote_requests', quoteRequests);
    return {
      success: true,
      quoteRequestId: id,
      status: 'new',
      message: 'Quote request submitted.'
    };
  }

  // startProgramReservation(programId)
  startProgramReservation(programId) {
    const reservation = this._getOrCreateReservation(programId);
    const program = this._findProgramById(programId);
    if (!program) {
      throw new Error('Program not found');
    }
    const addonOptions = this._getFromStorage('addon_options', []);
    const allowedAddons = Array.isArray(program.allowedAddonOptionIds)
      ? program.allowedAddonOptionIds
          .map((id) => addonOptions.find((a) => a.id === id && a.isActive))
          .filter((a) => !!a)
          .map((a) => ({
            addonOptionId: a.id,
            name: a.name,
            category: a.category || null,
            pricePerStudent: a.pricePerStudent,
            description: a.description || ''
          }))
      : [];

    const programSummary = {
      programId: program.id,
      title: program.title,
      gradeRangeText: this._gradeRangeText(program.gradeMin, program.gradeMax),
      tripType: program.tripType,
      durationNights: program.durationNights,
      season: program.season,
      basePricePerStudent: program.basePricePerStudent,
      currency: program.currency || 'USD'
    };

    return {
      reservationId: reservation.id,
      programSummary: programSummary,
      allowedAddons: allowedAddons,
      reservation: {
        groupName: reservation.groupName,
        startDate: reservation.startDate,
        numberOfStudents: reservation.numberOfStudents,
        paymentMethod: reservation.paymentMethod,
        status: reservation.status,
        subtotalBase: reservation.subtotalBase,
        subtotalAddons: reservation.subtotalAddons,
        totalCost: reservation.totalCost,
        currency: reservation.currency
      },
      currentStep: 'details'
    };
  }

  // updateReservationDetails(reservationId,...)
  updateReservationDetails(reservationId, groupName, startDate, numberOfStudents) {
    let reservations = this._getFromStorage('reservations', []);
    const reservation = reservations.find((r) => r.id === reservationId);
    if (!reservation) {
      return { success: false, reservationId: reservationId, reservation: null };
    }
    const program = this._findProgramById(reservation.programId);
    const basePricePerStudent = program ? program.basePricePerStudent : 0;
    reservation.groupName = groupName;
    reservation.startDate = startDate;
    reservation.numberOfStudents = numberOfStudents;
    reservation.subtotalBase = basePricePerStudent * numberOfStudents;

    // Recalculate totalCost including addons
    const reservationAddons = this._getFromStorage('reservation_addons', []);
    const addonOptions = this._getFromStorage('addon_options', []);
    const selectedAddonIds = reservationAddons
      .filter((ra) => ra.reservationId === reservation.id)
      .map((ra) => ra.addonOptionId);
    let subtotalAddons = 0;
    for (let i = 0; i < selectedAddonIds.length; i++) {
      const opt = addonOptions.find((a) => a.id === selectedAddonIds[i]);
      if (opt) {
        subtotalAddons += opt.pricePerStudent * numberOfStudents;
      }
    }
    reservation.subtotalAddons = subtotalAddons;
    reservation.totalCost = reservation.subtotalBase + reservation.subtotalAddons;
    reservation.updatedAt = this._nowIso();

    this._saveToStorage('reservations', reservations);

    return {
      success: true,
      reservationId: reservation.id,
      reservation: {
        groupName: reservation.groupName,
        startDate: reservation.startDate,
        numberOfStudents: reservation.numberOfStudents,
        subtotalBase: reservation.subtotalBase,
        currency: reservation.currency
      }
    };
  }

  // getReservationAvailableAddons(reservationId)
  getReservationAvailableAddons(reservationId) {
    const reservations = this._getFromStorage('reservations', []);
    const reservation = reservations.find((r) => r.id === reservationId);
    if (!reservation) {
      return { reservationId: reservationId, addons: [] };
    }
    const program = this._findProgramById(reservation.programId);
    const addonOptions = this._getFromStorage('addon_options', []);
    const reservationAddons = this._getFromStorage('reservation_addons', []);
    const selectedIds = reservationAddons
      .filter((ra) => ra.reservationId === reservation.id)
      .map((ra) => ra.addonOptionId);

    const addons = Array.isArray(program.allowedAddonOptionIds)
      ? program.allowedAddonOptionIds
          .map((id) => addonOptions.find((a) => a.id === id && a.isActive))
          .filter((a) => !!a)
          .map((a) => ({
            addonOptionId: a.id,
            name: a.name,
            category: a.category || null,
            description: a.description || '',
            pricePerStudent: a.pricePerStudent,
            isSelected: selectedIds.indexOf(a.id) !== -1,
            // Foreign key resolution (addonOptionId -> addonOption)
            addonOption: a
          }))
      : [];

    return { reservationId: reservation.id, addons: addons };
  }

  // updateReservationAddons(reservationId, addonOptionIds)
  updateReservationAddons(reservationId, addonOptionIds) {
    const reservations = this._getFromStorage('reservations', []);
    const reservation = reservations.find((r) => r.id === reservationId);
    if (!reservation) {
      return { success: false, reservationId: reservationId };
    }
    let reservationAddons = this._getFromStorage('reservation_addons', []);
    const addonOptions = this._getFromStorage('addon_options', []);

    const newIds = Array.isArray(addonOptionIds) ? addonOptionIds : [];

    // Remove existing for this reservation
    reservationAddons = reservationAddons.filter((ra) => ra.reservationId !== reservation.id);

    const now = this._nowIso();
    let subtotalAddons = 0;
    const selectedAddons = [];
    for (let i = 0; i < newIds.length; i++) {
      const id = newIds[i];
      const opt = addonOptions.find((a) => a.id === id && a.isActive);
      if (!opt) continue;
      const ra = {
        id: this._generateId('resa'),
        reservationId: reservation.id,
        addonOptionId: id,
        pricePerStudent: opt.pricePerStudent,
        createdAt: now
      };
      reservationAddons.push(ra);
      subtotalAddons += opt.pricePerStudent * reservation.numberOfStudents;
      selectedAddons.push({
        addonOptionId: opt.id,
        name: opt.name,
        pricePerStudent: opt.pricePerStudent
      });
    }

    reservation.subtotalAddons = subtotalAddons;
    reservation.totalCost = reservation.subtotalBase + subtotalAddons;
    reservation.updatedAt = now;

    this._saveToStorage('reservation_addons', reservationAddons);
    this._saveToStorage('reservations', reservations);

    return {
      success: true,
      reservationId: reservation.id,
      subtotalAddons: reservation.subtotalAddons,
      totalCost: reservation.totalCost,
      currency: reservation.currency,
      selectedAddons: selectedAddons
    };
  }

  // updateReservationPaymentMethod(reservationId, paymentMethod)
  updateReservationPaymentMethod(reservationId, paymentMethod) {
    const reservations = this._getFromStorage('reservations', []);
    const reservation = reservations.find((r) => r.id === reservationId);
    if (!reservation) {
      return { success: false, reservationId: reservationId, paymentMethod: null, message: 'Reservation not found.' };
    }
    reservation.paymentMethod = paymentMethod;
    reservation.updatedAt = this._nowIso();
    this._saveToStorage('reservations', reservations);
    return {
      success: true,
      reservationId: reservation.id,
      paymentMethod: paymentMethod,
      message: 'Payment method updated.'
    };
  }

  // getReservationSummary(reservationId)
  getReservationSummary(reservationId) {
    const reservations = this._getFromStorage('reservations', []);
    const reservation = reservations.find((r) => r.id === reservationId);
    if (!reservation) {
      return null;
    }
    const program = this._findProgramById(reservation.programId);
    const reservationAddons = this._getFromStorage('reservation_addons', []);
    const addonOptions = this._getFromStorage('addon_options', []);
    const selectedAddonRelations = reservationAddons.filter((ra) => ra.reservationId === reservation.id);

    const selectedAddons = selectedAddonRelations.map((ra) => {
      const opt = addonOptions.find((a) => a.id === ra.addonOptionId);
      return opt
        ? {
            addonOptionId: opt.id,
            name: opt.name,
            category: opt.category || null,
            pricePerStudent: opt.pricePerStudent,
            addonOption: opt
          }
        : {
            addonOptionId: ra.addonOptionId,
            name: '',
            category: null,
            pricePerStudent: ra.pricePerStudent,
            addonOption: null
          };
    });

    const canConfirm =
      reservation.groupName &&
      reservation.groupName.trim().length > 0 &&
      reservation.startDate &&
      reservation.numberOfStudents > 0 &&
      reservation.paymentMethod &&
      reservation.paymentMethod !== 'not_set';

    const programSummary = program
      ? {
          programId: program.id,
          title: program.title,
          gradeRangeText: this._gradeRangeText(program.gradeMin, program.gradeMax),
          tripType: program.tripType,
          durationNights: program.durationNights,
          season: program.season
        }
      : null;

    return {
      reservationId: reservation.id,
      status: reservation.status,
      groupName: reservation.groupName,
      startDate: reservation.startDate,
      numberOfStudents: reservation.numberOfStudents,
      paymentMethod: reservation.paymentMethod,
      subtotalBase: reservation.subtotalBase,
      subtotalAddons: reservation.subtotalAddons,
      totalCost: reservation.totalCost,
      currency: reservation.currency,
      programSummary: programSummary,
      selectedAddons: selectedAddons,
      canConfirm: !!canConfirm
    };
  }

  // getActivityFilterOptions()
  getActivityFilterOptions() {
    const activities = this._getFromStorage('activities', []);
    const categorySet = {};
    const gradeSet = {};
    for (let i = 0; i < activities.length; i++) {
      const a = activities[i];
      if (!a.isActive) continue;
      if (a.category) categorySet[a.category] = true;
      if (a.gradeMin != null && a.gradeMax != null) {
        for (let g = a.gradeMin; g <= a.gradeMax; g++) {
          gradeSet[g] = true;
        }
      }
    }
    const categories = Object.keys(categorySet).map((c) => ({ value: c, label: this._categoryLabel(c) }));
    const gradeLevels = Object.keys(gradeSet)
      .map((k) => parseInt(k, 10))
      .sort((a, b) => a - b);

    const ratingThresholds = [
      { value: 3.0, label: '3.0 stars and up' },
      { value: 4.0, label: '4.0 stars and up' },
      { value: 4.5, label: '4.5 stars and up' }
    ];

    const durationOptionsMinutes = [
      { min: 0, max: 60, label: 'Up to 1 hour' },
      { min: 60, max: 120, label: '1–2 hours' },
      { min: 120, max: null, label: '2+ hours' }
    ];

    return {
      categories: categories,
      ratingThresholds: ratingThresholds,
      durationOptionsMinutes: durationOptionsMinutes,
      gradeLevels: gradeLevels
    };
  }

  // searchActivities(...)
  searchActivities(
    category,
    minRating,
    minGrade,
    maxGrade,
    minDurationMinutes,
    maxDurationMinutes,
    sortBy,
    limit,
    offset
  ) {
    let activities = this._getFromStorage('activities', []);
    activities = activities.filter((a) => a.isActive);

    if (category) {
      activities = activities.filter((a) => a.category === category);
    }
    if (minRating != null) {
      activities = activities.filter((a) => a.rating >= minRating);
    }
    if (minGrade != null || maxGrade != null) {
      activities = activities.filter((a) => {
        if (a.gradeMin == null && a.gradeMax == null) return true;
        const min = a.gradeMin != null ? a.gradeMin : minGrade;
        const max = a.gradeMax != null ? a.gradeMax : maxGrade;
        if (minGrade != null && max != null && max < minGrade) return false;
        if (maxGrade != null && min != null && min > maxGrade) return false;
        return true;
      });
    }
    if (minDurationMinutes != null) {
      activities = activities.filter((a) => {
        if (a.durationMinutes == null) return true;
        return a.durationMinutes >= minDurationMinutes;
      });
    }
    if (maxDurationMinutes != null) {
      activities = activities.filter((a) => {
        if (a.durationMinutes == null) return true;
        return a.durationMinutes <= maxDurationMinutes;
      });
    }

    // Sorting
    if (sortBy === 'rating_desc') {
      activities.sort((a, b) => b.rating - a.rating);
    } else if (sortBy === 'name_az') {
      activities.sort((a, b) => {
        const at = (a.title || '').toLowerCase();
        const bt = (b.title || '').toLowerCase();
        if (at < bt) return -1;
        if (at > bt) return 1;
        return 0;
      });
    } else if (sortBy === 'duration_asc') {
      activities.sort((a, b) => {
        const ad = a.durationMinutes == null ? Infinity : a.durationMinutes;
        const bd = b.durationMinutes == null ? Infinity : b.durationMinutes;
        return ad - bd;
      });
    }

    const totalCount = activities.length;
    const start = offset || 0;
    const end = typeof limit === 'number' ? start + limit : totalCount;
    const slice = activities.slice(start, end);

    const items = slice.map((a) => ({
      activityId: a.id,
      title: a.title,
      description: a.description || '',
      category: a.category,
      gradeRangeText: this._gradeRangeText(a.gradeMin, a.gradeMax),
      durationMinutes: a.durationMinutes != null ? a.durationMinutes : null,
      rating: a.rating,
      ratingCount: a.ratingCount != null ? a.ratingCount : 0
    }));

    return { totalCount: totalCount, items: items };
  }

  // addActivityToCurrentItinerary(activityId)
  addActivityToCurrentItinerary(activityId) {
    const itinerary = this._getOrCreateCurrentItinerary();
    let items = this._getFromStorage('itinerary_items', []);
    const activity = this._findActivityById(activityId);
    if (!activity) {
      throw new Error('Activity not found');
    }
    const now = this._nowIso();
    const item = {
      id: this._generateId('iti'),
      itineraryId: itinerary.id,
      activityId: activityId,
      dayNumber: null,
      timeSlot: 'morning',
      order: null,
      notes: ''
    };
    items.push(item);
    this._saveToStorage('itinerary_items', items);

    const itineraryItems = items.filter((ii) => ii.itineraryId === itinerary.id);
    const activities = this._getFromStorage('activities', []);
    const mapped = itineraryItems.map((ii) => {
      const act = activities.find((a) => a.id === ii.activityId) || {};
      return {
        itineraryItemId: ii.id,
        activityId: ii.activityId,
        title: act.title || '',
        category: act.category || null,
        dayNumber: ii.dayNumber,
        timeSlot: ii.timeSlot
      };
    });

    const unscheduledCount = itineraryItems.filter((ii) => ii.dayNumber == null || ii.dayNumber <= 0).length;

    return {
      itineraryId: itinerary.id,
      name: itinerary.name,
      items: mapped,
      unscheduledCount: unscheduledCount
    };
  }

  // getCurrentItinerary()
  getCurrentItinerary() {
    const currentId = localStorage.getItem('current_itinerary_id');
    if (!currentId) {
      return {
        itineraryId: null,
        name: '',
        days: [],
        unscheduledActivities: []
      };
    }
    const itineraries = this._getFromStorage('itineraries', []);
    const itinerary = itineraries.find((i) => i.id === currentId);
    if (!itinerary) {
      return {
        itineraryId: null,
        name: '',
        days: [],
        unscheduledActivities: []
      };
    }
    const items = this._getFromStorage('itinerary_items', []).filter((ii) => ii.itineraryId === itinerary.id);
    const activities = this._getFromStorage('activities', []);

    const dayMap = {};
    const unscheduled = [];

    for (let i = 0; i < items.length; i++) {
      const ii = items[i];
      const act = activities.find((a) => a.id === ii.activityId) || {};
      const activityObj = {
        itineraryItemId: ii.id,
        activityId: ii.activityId,
        title: act.title || '',
        category: act.category || null,
        durationMinutes: act.durationMinutes != null ? act.durationMinutes : null,
        activity: act // foreign key resolution
      };
      if (ii.dayNumber == null || ii.dayNumber <= 0) {
        unscheduled.push(activityObj);
      } else {
        const dayNumber = ii.dayNumber;
        if (!dayMap[dayNumber]) {
          dayMap[dayNumber] = {
            dayNumber: dayNumber,
            label: 'Day ' + dayNumber,
            timeSlots: {
              morning: [],
              afternoon: [],
              evening: [],
              night: []
            }
          };
        }
        const slotKey = ii.timeSlot || 'morning';
        if (!dayMap[dayNumber].timeSlots[slotKey]) {
          dayMap[dayNumber].timeSlots[slotKey] = [];
        }
        dayMap[dayNumber].timeSlots[slotKey].push(activityObj);
      }
    }

    const dayNumbers = Object.keys(dayMap)
      .map((k) => parseInt(k, 10))
      .sort((a, b) => a - b);

    const days = dayNumbers.map((dn) => {
      const day = dayMap[dn];
      const slots = ['morning', 'afternoon', 'evening', 'night'].map((slotKey) => ({
        timeSlot: slotKey,
        label: slotKey.charAt(0).toUpperCase() + slotKey.slice(1),
        activities: day.timeSlots[slotKey] || []
      }));
      return {
        dayNumber: dn,
        label: day.label,
        timeSlots: slots
      };
    });

    return {
      itineraryId: itinerary.id,
      name: itinerary.name,
      days: days,
      unscheduledActivities: unscheduled
    };
  }

  // updateItineraryActivitySlot(itineraryItemId, dayNumber, timeSlot, order)
  updateItineraryActivitySlot(itineraryItemId, dayNumber, timeSlot, order) {
    let items = this._getFromStorage('itinerary_items', []);
    const item = items.find((ii) => ii.id === itineraryItemId);
    if (!item) {
      return { success: false, itineraryId: null, item: null };
    }
    item.dayNumber = dayNumber;
    item.timeSlot = timeSlot;
    if (order != null) item.order = order;
    this._saveToStorage('itinerary_items', items);

    return {
      success: true,
      itineraryId: item.itineraryId,
      item: {
        itineraryItemId: item.id,
        dayNumber: item.dayNumber,
        timeSlot: item.timeSlot,
        order: item.order != null ? item.order : null
      }
    };
  }

  // removeActivityFromCurrentItinerary(itineraryItemId)
  removeActivityFromCurrentItinerary(itineraryItemId) {
    let items = this._getFromStorage('itinerary_items', []);
    const item = items.find((ii) => ii.id === itineraryItemId);
    if (!item) {
      return { success: false, itineraryId: null, remainingItemCount: items.length };
    }
    const itineraryId = item.itineraryId;
    items = items.filter((ii) => ii.id !== itineraryItemId);
    this._saveToStorage('itinerary_items', items);
    const remainingItemCount = items.filter((ii) => ii.itineraryId === itineraryId).length;
    return { success: true, itineraryId: itineraryId, remainingItemCount: remainingItemCount };
  }

  // saveCurrentItinerary(name, notes)
  saveCurrentItinerary(name, notes) {
    const currentId = localStorage.getItem('current_itinerary_id');
    if (!currentId) {
      return { success: false, itineraryId: null, name: '', message: 'No current itinerary.' };
    }
    let itineraries = this._getFromStorage('itineraries', []);
    const itinerary = itineraries.find((i) => i.id === currentId);
    if (!itinerary) {
      return { success: false, itineraryId: null, name: '', message: 'Itinerary not found.' };
    }
    itinerary.name = name;
    if (notes != null) itinerary.notes = notes;
    itinerary.updatedAt = this._nowIso();
    this._saveToStorage('itineraries', itineraries);
    return {
      success: true,
      itineraryId: itinerary.id,
      name: itinerary.name,
      message: 'Itinerary saved.'
    };
  }

  // getItineraryDetails(itineraryId)
  getItineraryDetails(itineraryId) {
    const itineraries = this._getFromStorage('itineraries', []);
    const itinerary = itineraries.find((i) => i.id === itineraryId);
    if (!itinerary) {
      return null;
    }
    const items = this._getFromStorage('itinerary_items', []).filter((ii) => ii.itineraryId === itinerary.id);
    const activities = this._getFromStorage('activities', []);

    const dayMap = {};
    for (let i = 0; i < items.length; i++) {
      const ii = items[i];
      if (ii.dayNumber == null || ii.dayNumber <= 0) continue; // unscheduled omitted here
      const act = activities.find((a) => a.id === ii.activityId) || {};
      const activityObj = {
        itineraryItemId: ii.id,
        activityId: ii.activityId,
        title: act.title || '',
        category: act.category || null,
        durationMinutes: act.durationMinutes != null ? act.durationMinutes : null,
        notes: ii.notes || '',
        activity: act // foreign key resolution
      };
      const dayNumber = ii.dayNumber;
      if (!dayMap[dayNumber]) {
        dayMap[dayNumber] = {
          dayNumber: dayNumber,
          label: 'Day ' + dayNumber,
          timeSlots: {
            morning: [],
            afternoon: [],
            evening: [],
            night: []
          }
        };
      }
      const slotKey = ii.timeSlot || 'morning';
      if (!dayMap[dayNumber].timeSlots[slotKey]) {
        dayMap[dayNumber].timeSlots[slotKey] = [];
      }
      dayMap[dayNumber].timeSlots[slotKey].push(activityObj);
    }

    const dayNumbers = Object.keys(dayMap)
      .map((k) => parseInt(k, 10))
      .sort((a, b) => a - b);

    const days = dayNumbers.map((dn) => {
      const day = dayMap[dn];
      const slots = ['morning', 'afternoon', 'evening', 'night'].map((slotKey) => ({
        timeSlot: slotKey,
        label: slotKey.charAt(0).toUpperCase() + slotKey.slice(1),
        activities: day.timeSlots[slotKey] || []
      }));
      return {
        dayNumber: dn,
        label: day.label,
        timeSlots: slots
      };
    });

    return {
      itineraryId: itinerary.id,
      name: itinerary.name,
      notes: itinerary.notes || '',
      createdAt: itinerary.createdAt,
      updatedAt: itinerary.updatedAt,
      days: days
    };
  }

  // getPricingOverviewContent()
  getPricingOverviewContent() {
    // This content is not modeled as entities; keep lightweight and static
    const sections = [
      {
        id: 'overview',
        title: 'How pricing works',
        contentHtml: '<p>Pricing is based on grade level, trip length, season, and optional add-ons like meals and gear.</p>'
      }
    ];

    const examplePackages = [];

    return { sections: sections, examplePackages: examplePackages };
  }

  // getCostCalculatorConfig()
  getCostCalculatorConfig() {
    const mealPlansRaw = this._getFromStorage('meal_plans', []);
    const gearOptionsRaw = this._getFromStorage('gear_rental_options', []);

    const mealPlans = mealPlansRaw
      .filter((m) => m.isActive)
      .map((m) => ({
        mealPlanId: m.id,
        name: m.name,
        description: m.description || '',
        pricePerStudent: m.pricePerStudent,
        tripLengthApplicability: m.tripLengthApplicability,
        isLunchOnly: !!m.isLunchOnly,
        mealPlan: m // foreign key resolution
      }));

    const gearRentalOptions = gearOptionsRaw
      .filter((g) => g.isActive)
      .map((g) => ({
        gearRentalOptionId: g.id,
        name: g.name,
        description: g.description || '',
        pricePerStudent: g.pricePerStudent,
        category: g.category || null,
        gearRentalOption: g // foreign key resolution
      }));

    const groupTypes = [
      { value: 'elementary_school', label: 'Elementary School' },
      { value: 'middle_school', label: 'Middle School' },
      { value: 'high_school', label: 'High School' },
      { value: 'other_group', label: 'Other Group' }
    ];

    const gradeLevels = [];
    for (let g = 1; g <= 12; g++) gradeLevels.push(g);

    const tripLengths = [
      { value: 'day_trip_1_day', label: 'Day Trip (1 day)' },
      { value: 'overnight_1_night', label: 'Overnight (1 night)' },
      { value: 'overnight_2_nights', label: 'Overnight (2 nights)' },
      { value: 'overnight_3_nights', label: 'Overnight (3 nights)' }
    ];

    return {
      groupTypes: groupTypes,
      gradeLevels: gradeLevels,
      tripLengths: tripLengths,
      mealPlans: mealPlans,
      gearRentalOptions: gearRentalOptions
    };
  }

  // calculateTripCostEstimate(...)
  calculateTripCostEstimate(
    groupType,
    gradeLevel,
    numberOfStudents,
    tripLength,
    mealPlanId,
    gearRentalOptionId,
    season
  ) {
    const profiles = this._getFromStorage('trip_pricing_profiles', []).filter(
      (p) => p.isActive && p.groupType === groupType && p.tripLength === tripLength
    );

    let profile = null;
    for (let i = 0; i < profiles.length; i++) {
      const p = profiles[i];
      if (gradeLevel >= p.gradeMin && gradeLevel <= p.gradeMax) {
        if (season && p.season === season) {
          profile = p;
          break;
        }
        if (!season || p.season === 'multi_season' || !p.season) {
          profile = profile || p;
        }
      }
    }

    const basePricePerStudent = profile ? profile.basePricePerStudent : 0;

    const mealPlan = mealPlanId ? this._findMealPlanById(mealPlanId) : null;
    let mealPricePerStudent = 0;
    if (mealPlan && mealPlan.isActive) {
      const applicable =
        mealPlan.tripLengthApplicability === 'any_trip' ||
        (mealPlan.tripLengthApplicability === 'day_trips_only' && tripLength === 'day_trip_1_day') ||
        (mealPlan.tripLengthApplicability === 'overnight_only' && tripLength !== 'day_trip_1_day');
      if (applicable) {
        mealPricePerStudent = mealPlan.pricePerStudent;
      }
    }

    const gearOption = gearRentalOptionId ? this._findGearRentalOptionById(gearRentalOptionId) : null;
    let gearPricePerStudent = 0;
    if (gearOption && gearOption.isActive) {
      gearPricePerStudent = gearOption.pricePerStudent;
    }

    const pricePerStudent = basePricePerStudent + mealPricePerStudent + gearPricePerStudent;
    const totalPrice = pricePerStudent * numberOfStudents;
    const currency = profile && profile.currency ? profile.currency : 'USD';

    const saved = this._saveCostEstimateRecord({
      groupType: groupType,
      gradeLevel: gradeLevel,
      numberOfStudents: numberOfStudents,
      tripLength: tripLength,
      mealPlanId: mealPlan ? mealPlan.id : null,
      gearRentalOptionId: gearOption ? gearOption.id : null,
      basePricePerStudent: basePricePerStudent,
      mealPricePerStudent: mealPricePerStudent,
      gearPricePerStudent: gearPricePerStudent,
      pricePerStudent: pricePerStudent,
      totalPrice: totalPrice,
      currency: currency
    });

    return {
      estimateId: saved.id,
      groupType: saved.groupType,
      gradeLevel: saved.gradeLevel,
      numberOfStudents: saved.numberOfStudents,
      tripLength: saved.tripLength,
      mealPlanId: saved.mealPlanId,
      gearRentalOptionId: saved.gearRentalOptionId,
      basePricePerStudent: saved.basePricePerStudent,
      mealPricePerStudent: saved.mealPricePerStudent,
      gearPricePerStudent: saved.gearPricePerStudent,
      pricePerStudent: saved.pricePerStudent,
      totalPrice: saved.totalPrice,
      currency: saved.currency,
      createdAt: saved.createdAt
    };
  }

  // registerTeacherAccount(userType, name, email, password)
  registerTeacherAccount(userType, name, email, password) {
    // Password is accepted but not stored separately beyond this profile context
    let profiles = this._getFromStorage('teacher_profiles', []);
    const now = this._nowIso();
    const profile = {
      id: this._generateId('teacher'),
      userType: userType,
      name: name,
      email: email,
      preferredGrades: [],
      interests: [],
      emailPlanningTips: false,
      emailProgramUpdates: false,
      createdAt: now,
      updatedAt: now
    };
    profiles.push(profile);
    this._saveToStorage('teacher_profiles', profiles);
    localStorage.setItem('current_teacher_profile_id', profile.id);

    return {
      success: true,
      profile: {
        id: profile.id,
        userType: profile.userType,
        name: profile.name,
        email: profile.email,
        preferredGrades: profile.preferredGrades,
        interests: profile.interests,
        emailPlanningTips: profile.emailPlanningTips,
        emailProgramUpdates: profile.emailProgramUpdates
      },
      message: 'Account created.'
    };
  }

  // getTeacherProfile()
  getTeacherProfile() {
    const current = this._getCurrentTeacherProfile();
    if (!current) {
      return { exists: false, profile: null };
    }
    return {
      exists: true,
      profile: {
        id: current.id,
        userType: current.userType,
        name: current.name,
        email: current.email,
        preferredGrades: Array.isArray(current.preferredGrades) ? current.preferredGrades : [],
        interests: Array.isArray(current.interests) ? current.interests : [],
        emailPlanningTips: !!current.emailPlanningTips,
        emailProgramUpdates: !!current.emailProgramUpdates,
        createdAt: current.createdAt,
        updatedAt: current.updatedAt
      }
    };
  }

  // updateTeacherPreferences(...)
  updateTeacherPreferences(preferredGrades, interests, emailPlanningTips, emailProgramUpdates) {
    let profiles = this._getFromStorage('teacher_profiles', []);
    const currentId = localStorage.getItem('current_teacher_profile_id');
    if (!currentId) {
      return { success: false, profile: null, message: 'Not logged in.' };
    }
    const profile = profiles.find((p) => p.id === currentId);
    if (!profile) {
      return { success: false, profile: null, message: 'Profile not found.' };
    }
    if (preferredGrades != null) {
      profile.preferredGrades = preferredGrades;
    }
    if (interests != null) {
      profile.interests = interests;
    }
    if (emailPlanningTips != null) {
      profile.emailPlanningTips = !!emailPlanningTips;
    }
    if (emailProgramUpdates != null) {
      profile.emailProgramUpdates = !!emailProgramUpdates;
    }
    profile.updatedAt = this._nowIso();
    this._saveToStorage('teacher_profiles', profiles);

    return {
      success: true,
      profile: {
        id: profile.id,
        userType: profile.userType,
        name: profile.name,
        email: profile.email,
        preferredGrades: Array.isArray(profile.preferredGrades) ? profile.preferredGrades : [],
        interests: Array.isArray(profile.interests) ? profile.interests : [],
        emailPlanningTips: !!profile.emailPlanningTips,
        emailProgramUpdates: !!profile.emailProgramUpdates,
        updatedAt: profile.updatedAt
      },
      message: 'Preferences updated.'
    };
  }

  // logOutTeacher()
  logOutTeacher() {
    localStorage.removeItem('current_teacher_profile_id');
    return { success: true, message: 'Logged out.' };
  }

  // clearTeacherProfileData()
  clearTeacherProfileData() {
    this._saveToStorage('teacher_profiles', []);
    localStorage.removeItem('current_teacher_profile_id');
    return { success: true, message: 'Teacher profile data cleared.' };
  }

  // getSafetyPageContent()
  getSafetyPageContent() {
    const sectionsRaw = this._getFromStorage('safety_sections', []);
    const docsRaw = this._getFromStorage('safety_documents', []);

    const sections = sectionsRaw.map((s) => {
      const docs = docsRaw
        .filter((d) => d.relatedSectionId === s.id && d.isActive)
        .map((d) => ({
          documentId: d.id,
          title: d.title,
          description: d.description || '',
          url: d.url,
          documentType: d.documentType || null,
          fileFormat: d.fileFormat || null
        }));
      return {
        sectionId: s.id,
        title: s.title,
        slug: s.slug || '',
        category: s.category || null,
        isExpandable: !!s.isExpandable,
        order: s.order != null ? s.order : null,
        contentHtml: s.contentHtml || '',
        documents: docs
      };
    });

    sections.sort((a, b) => {
      const ao = a.order == null ? 9999 : a.order;
      const bo = b.order == null ? 9999 : b.order;
      return ao - bo;
    });

    return { sections: sections };
  }

  // getContactTopics()
  getContactTopics() {
    const topics = [
      { value: 'safety_medical', label: 'Safety & Medical' },
      { value: 'programs_pricing', label: 'Programs & Pricing' },
      { value: 'reservations', label: 'Reservations' },
      { value: 'general_question', label: 'General Question' },
      { value: 'administrator_support', label: 'Administrator Support' },
      { value: 'other', label: 'Other' }
    ];
    return { topics: topics };
  }

  // submitContactInquiry(...)
  submitContactInquiry(topic, name, email, message, relatedProgramId) {
    const inquiries = this._getFromStorage('contact_inquiries', []);
    const now = this._nowIso();
    const id = this._generateId('ci');
    const record = {
      id: id,
      topic: topic,
      name: name,
      email: email,
      message: message,
      relatedProgramId: relatedProgramId || null,
      status: 'new',
      createdAt: now,
      updatedAt: now
    };
    inquiries.push(record);
    this._saveToStorage('contact_inquiries', inquiries);
    return {
      success: true,
      inquiryId: id,
      status: 'new',
      message: 'Inquiry submitted.'
    };
  }

  // getAdministratorsPageContent()
  getAdministratorsPageContent() {
    return {
      heroTitle: 'Support for school administrators',
      heroSubtitle: 'Align outdoor programs with your school policies and educational goals.',
      educationalOutcomesHtml:
        '<p>Our programs support curriculum standards, social-emotional learning, and leadership development.</p>',
      logisticsHighlights: [
        'Flexible scheduling for day and overnight programs',
        'Transparent pricing and sample parent communication templates',
        'Comprehensive safety and risk management procedures'
      ],
      supervisionStandardsHtml:
        '<p>We maintain age-appropriate supervision ratios and partner closely with school chaperones.</p>',
      policySummaryHtml:
        '<p>All programs follow established safety protocols, emergency procedures, and optional insurance coverage.</p>'
    };
  }

  // getAvailablePlanningCallSlots(date, audience)
  getAvailablePlanningCallSlots(date, audience) {
    const slotsRaw = this._getFromStorage('planning_call_slots', []);
    const targetDateStr = date;
    const audienceFilter = audience || null;

    const slots = slotsRaw
      .filter((s) => {
        const startDateOnly = this._parseDateOnly(s.startDateTime);
        if (startDateOnly !== targetDateStr) return false;
        if (!s.isAvailable) return false;
        if (!audienceFilter || s.audience === 'any' || !s.audience) return true;
        return s.audience === audienceFilter;
      })
      .map((s) => ({
        slotId: s.id || s.slotId,
        startDateTime: s.startDateTime,
        endDateTime: s.endDateTime,
        audience: s.audience || 'any',
        isAvailable: !!s.isAvailable
      }));

    return { slots: slots };
  }

  // bookPlanningCall(...)
  bookPlanningCall(slotId, name, role, schoolName, email, notes) {
    const result = this._updatePlanningCallSlotAvailability(slotId, {
      name: name,
      role: role,
      schoolName: schoolName,
      email: email,
      notes: notes
    });
    if (!result.success) {
      return {
        success: false,
        bookingId: null,
        slot: null,
        name: name,
        role: role,
        schoolName: schoolName,
        email: email,
        notes: notes,
        status: null,
        callType: null,
        message: result.message || 'Unable to book slot.'
      };
    }
    const booking = result.booking;
    const slot = result.slot;
    return {
      success: true,
      bookingId: booking.id,
      slot: {
        slotId: slot.id || slot.slotId,
        startDateTime: slot.startDateTime,
        endDateTime: slot.endDateTime
      },
      name: booking.name,
      role: booking.role,
      schoolName: booking.schoolName,
      email: booking.email,
      notes: booking.notes,
      status: booking.status,
      callType: booking.callType,
      message: 'Planning call scheduled.'
    };
  }

  // getResourceFilterOptions()
  getResourceFilterOptions() {
    const resources = this._getFromStorage('resources', []);
    const gradeSet = {};
    const topicSet = {};
    const typeSet = {};

    for (let i = 0; i < resources.length; i++) {
      const r = resources[i];
      if (!r.isActive) continue;
      if (r.gradeMin != null && r.gradeMax != null) {
        for (let g = r.gradeMin; g <= r.gradeMax; g++) gradeSet[g] = true;
      }
      if (r.topic) topicSet[r.topic] = true;
      if (r.resourceType) typeSet[r.resourceType] = true;
    }

    const grades = Object.keys(gradeSet)
      .map((k) => parseInt(k, 10))
      .sort((a, b) => a - b);

    const topics = Object.keys(topicSet).map((t) => ({ value: t, label: this._categoryLabel(t) }));
    const resourceTypes = Object.keys(typeSet).map((t) => ({ value: t, label: this._categoryLabel(t) }));

    const sortOptions = [
      { value: 'most_popular', label: 'Most Popular' },
      { value: 'title_az', label: 'Title A–Z' },
      { value: 'newest', label: 'Newest' }
    ];

    return {
      grades: grades,
      topics: topics,
      resourceTypes: resourceTypes,
      sortOptions: sortOptions
    };
  }

  // searchResources(...)
  searchResources(grade, topic, resourceType, sortBy, limit, offset) {
    let resources = this._getFromStorage('resources', []);
    resources = resources.filter((r) => r.isActive);

    if (grade != null) {
      resources = resources.filter((r) => {
        if (r.gradeMin == null && r.gradeMax == null) return true;
        const min = r.gradeMin != null ? r.gradeMin : grade;
        const max = r.gradeMax != null ? r.gradeMax : grade;
        return grade >= min && grade <= max;
      });
    }
    if (topic) {
      resources = resources.filter((r) => r.topic === topic);
    }
    if (resourceType) {
      resources = resources.filter((r) => r.resourceType === resourceType);
    }

    if (sortBy === 'most_popular') {
      resources.sort((a, b) => (b.popularityScore || 0) - (a.popularityScore || 0));
    } else if (sortBy === 'title_az') {
      resources.sort((a, b) => {
        const at = (a.title || '').toLowerCase();
        const bt = (b.title || '').toLowerCase();
        if (at < bt) return -1;
        if (at > bt) return 1;
        return 0;
      });
    } else if (sortBy === 'newest') {
      resources.sort((a, b) => {
        const ai = a.id || '';
        const bi = b.id || '';
        if (ai < bi) return 1;
        if (ai > bi) return -1;
        return 0;
      });
    }

    const totalCount = resources.length;
    const start = offset || 0;
    const end = typeof limit === 'number' ? start + limit : totalCount;
    const slice = resources.slice(start, end);

    const items = slice.map((r) => ({
      resourceId: r.id,
      title: r.title,
      description: r.description || '',
      gradeRangeText: this._gradeRangeText(r.gradeMin, r.gradeMax),
      topic: r.topic || null,
      resourceType: r.resourceType,
      popularityScore: r.popularityScore != null ? r.popularityScore : 0,
      url: r.url || ''
    }));

    return { totalCount: totalCount, items: items };
  }

  // addResourceToCollection(resourceId)
  addResourceToCollection(resourceId) {
    const collection = this._getOrCreateResourceCollection();
    let items = this._getFromStorage('resource_collection_items', []);
    const now = this._nowIso();

    const existing = items.find((ci) => ci.collectionId === collection.id && ci.resourceId === resourceId);
    if (!existing) {
      const order = items.filter((ci) => ci.collectionId === collection.id).length;
      const item = {
        id: this._generateId('rci'),
        collectionId: collection.id,
        resourceId: resourceId,
        order: order,
        addedAt: now
      };
      items.push(item);
      this._saveToStorage('resource_collection_items', items);
    }

    const itemCount = items.filter((ci) => ci.collectionId === collection.id).length;
    return {
      success: true,
      collectionId: collection.id,
      itemCount: itemCount,
      message: 'Resource added to collection.'
    };
  }

  // getResourceCollection()
  getResourceCollection() {
    const currentId = localStorage.getItem('current_resource_collection_id');
    if (!currentId) {
      return { collectionId: null, name: null, shareUrl: null, items: [] };
    }
    const collections = this._getFromStorage('resource_collections', []);
    const collection = collections.find((c) => c.id === currentId);
    if (!collection) {
      return { collectionId: null, name: null, shareUrl: null, items: [] };
    }
    const itemsRaw = this._getFromStorage('resource_collection_items', []).filter(
      (ci) => ci.collectionId === collection.id
    );
    const resources = this._getFromStorage('resources', []);

    itemsRaw.sort((a, b) => {
      const ao = a.order == null ? 9999 : a.order;
      const bo = b.order == null ? 9999 : b.order;
      return ao - bo;
    });

    const items = itemsRaw.map((ci) => {
      const res = resources.find((r) => r.id === ci.resourceId) || {};
      return {
        collectionItemId: ci.id,
        resourceId: ci.resourceId,
        title: res.title || '',
        description: res.description || '',
        resourceType: res.resourceType || null,
        topic: res.topic || null,
        gradeRangeText: this._gradeRangeText(res.gradeMin, res.gradeMax),
        order: ci.order,
        resource: res // foreign key resolution
      };
    });

    return {
      collectionId: collection.id,
      name: collection.name,
      shareUrl: collection.shareUrl,
      items: items
    };
  }

  // removeResourceFromCollection(collectionItemId)
  removeResourceFromCollection(collectionItemId) {
    let items = this._getFromStorage('resource_collection_items', []);
    const item = items.find((ci) => ci.id === collectionItemId);
    if (!item) {
      return { success: false, collectionId: null, itemCount: items.length, message: 'Item not found.' };
    }
    const collectionId = item.collectionId;
    items = items.filter((ci) => ci.id !== collectionItemId);
    this._saveToStorage('resource_collection_items', items);
    const itemCount = items.filter((ci) => ci.collectionId === collectionId).length;
    return {
      success: true,
      collectionId: collectionId,
      itemCount: itemCount,
      message: 'Item removed from collection.'
    };
  }

  // reorderResourceCollectionItems(collectionId, orderedCollectionItemIds)
  reorderResourceCollectionItems(collectionId, orderedCollectionItemIds) {
    let items = this._getFromStorage('resource_collection_items', []);
    const idOrder = Array.isArray(orderedCollectionItemIds) ? orderedCollectionItemIds : [];
    const idToIndex = {};
    for (let i = 0; i < idOrder.length; i++) {
      idToIndex[idOrder[i]] = i;
    }
    for (let i = 0; i < items.length; i++) {
      const ci = items[i];
      if (ci.collectionId === collectionId && idToIndex.hasOwnProperty(ci.id)) {
        ci.order = idToIndex[ci.id];
      }
    }
    this._saveToStorage('resource_collection_items', items);
    return { success: true, collectionId: collectionId, message: 'Collection items reordered.' };
  }

  // getResourceCollectionShareLink()
  getResourceCollectionShareLink() {
    const collection = this._getOrCreateResourceCollection();

    // Instrumentation for task completion tracking
    try {
      if (collection && collection.shareUrl) {
        localStorage.setItem('task9_shareLinkRequested', 'true');
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      success: true,
      collectionId: collection.id,
      shareUrl: collection.shareUrl,
      message: 'Share link ready.'
    };
  }

  // getAboutPageContent()
  getAboutPageContent() {
    return {
      heroTitle: 'About our outdoor education programs',
      heroSubtitle: 'Connecting classroom learning with hands-on experiences in nature.',
      missionHtml:
        '<p>Our mission is to support teachers and schools in delivering high-quality, standards-aligned outdoor education.</p>',
      philosophyHtml:
        '<p>We believe that time in nature builds resilience, curiosity, and a sense of community for every student.</p>',
      staffProfiles: [],
      accreditations: []
    };
  }

  // getPrivacyPolicyContent()
  getPrivacyPolicyContent() {
    return {
      lastUpdated: '2024-01-01',
      contentHtml:
        '<p>We use local storage to remember your planning preferences on this device. No personal data is transmitted by this library.</p>'
    };
  }

  // getTermsAndConditionsContent()
  getTermsAndConditionsContent() {
    return {
      lastUpdated: '2024-01-01',
      contentHtml:
        '<p>By using this planning tool, you agree that all bookings are subject to your organization&apos;s policies and any additional provider terms.</p>'
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