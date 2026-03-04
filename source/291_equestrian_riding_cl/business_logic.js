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

  // -----------------------------
  // Storage helpers
  // -----------------------------

  _initStorage() {
    const arrayKeys = [
      'lessons',
      'instructors',
      'clinics',
      'lesson_inquiry_submissions',
      'clinic_interest_registrations',
      'membership_plans',
      'membership_join_submissions',
      'events',
      'event_interest_lists',
      'boarding_options',
      'boarding_waitlist_requests',
      'camp_sessions',
      'camp_pre_registration_submissions',
      'facility_packages',
      'facility_booking_requests',
      'safety_gear_items',
      'safety_acknowledgment_submissions',
      'volunteer_opportunities',
      'volunteer_signup_submissions',
      'general_contact_submissions'
    ];

    const objectKeys = [
      'home_page_content',
      'safety_page_content',
      'contact_forms_summary',
      'about_page_content'
    ];

    for (let i = 0; i < arrayKeys.length; i++) {
      const key = arrayKeys[i];
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    }

    for (let j = 0; j < objectKeys.length; j++) {
      const key = objectKeys[j];
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify({}));
      }
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, defaultValue) {
    const data = localStorage.getItem(key);
    if (data === null || typeof data === 'undefined') {
      return typeof defaultValue === 'undefined' ? [] : defaultValue;
    }
    try {
      return JSON.parse(data);
    } catch (e) {
      return typeof defaultValue === 'undefined' ? [] : defaultValue;
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

  _getCurrentTimestamp() {
    return new Date().toISOString();
  }

  _validateEmailFormat(email) {
    if (typeof email !== 'string') return false;
    // Basic email regex, not exhaustive but sufficient for validation
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email.trim());
  }

  _truncateText(text, maxLength) {
    if (!text || typeof text !== 'string') return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 1) + '…';
  }

  _formatCurrency(amount, suffix) {
    if (typeof amount !== 'number' || isNaN(amount)) return '';
    const formatted = '$' + amount.toFixed(2).replace(/\.00$/, '');
    return suffix ? formatted + ' ' + suffix : formatted;
  }

  _paginate(items, page, pageSize) {
    const p = page && page > 0 ? page : 1;
    const ps = pageSize && pageSize > 0 ? pageSize : 20;
    const start = (p - 1) * ps;
    const end = start + ps;
    return items.slice(start, end);
  }

  _parseDate(dateStr) {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
  }

  _formatDateRange(startStr, endStr) {
    const start = this._parseDate(startStr);
    const end = this._parseDate(endStr);
    if (!start) return '';
    const optionsDate = { year: 'numeric', month: 'short', day: 'numeric' };
    const optionsTime = { hour: 'numeric', minute: '2-digit' };
    if (!end) {
      return start.toLocaleDateString(undefined, optionsDate) + ' ' + start.toLocaleTimeString(undefined, optionsTime);
    }
    const sameDay = start.toDateString() === end.toDateString();
    if (sameDay) {
      return (
        start.toLocaleDateString(undefined, optionsDate) +
        ' ' +
        start.toLocaleTimeString(undefined, optionsTime) +
        ' – ' +
        end.toLocaleTimeString(undefined, optionsTime)
      );
    }
    return (
      start.toLocaleDateString(undefined, optionsDate) +
      ' ' +
      start.toLocaleTimeString(undefined, optionsTime) +
      ' – ' +
      end.toLocaleDateString(undefined, optionsDate) +
      ' ' +
      end.toLocaleTimeString(undefined, optionsTime)
    );
  }

  _getMonthKeyFromDate(date) {
    const months = [
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
    return months[date.getMonth()];
  }

  _getMonthLabel(monthKey) {
    if (!monthKey) return '';
    return monthKey.charAt(0).toUpperCase() + monthKey.slice(1);
  }

  // -----------------------------
  // Label helpers (enums)
  // -----------------------------

  _getRidingLevelLabel(value) {
    const map = {
      beginner: 'Beginner',
      intermediate: 'Intermediate',
      advanced: 'Advanced',
      all_levels: 'All levels'
    };
    return map[value] || '';
  }

  _getAgeGroupLabel(value) {
    const map = {
      children_8_12: 'Children 8–12',
      children_10_13: 'Children 10–13',
      teens_13_17: 'Teens 13–17',
      adults_18_plus: 'Adults 18+',
      all_ages: 'All ages'
    };
    return map[value] || '';
  }

  _getDayOfWeekLabel(value) {
    const map = {
      monday: 'Monday',
      tuesday: 'Tuesday',
      wednesday: 'Wednesday',
      thursday: 'Thursday',
      friday: 'Friday',
      saturday: 'Saturday',
      sunday: 'Sunday'
    };
    return map[value] || '';
  }

  _getFormatLabel(value) {
    const map = {
      group: 'Group',
      private: 'Private',
      semi_private: 'Semi-private'
    };
    return map[value] || '';
  }

  _getDisciplineLabel(value) {
    const map = {
      jumping: 'Jumping',
      dressage: 'Dressage',
      flatwork: 'Flatwork',
      trail: 'Trail',
      horsemanship: 'Horsemanship',
      general_riding: 'General riding'
    };
    return map[value] || '';
  }

  _getMemberTypeLabel(value) {
    const map = {
      adult: 'Adult',
      youth: 'Youth',
      child: 'Child',
      family: 'Family',
      senior: 'Senior'
    };
    return map[value] || '';
  }

  _getEventTypeLabel(value) {
    const map = {
      show: 'Show',
      competition: 'Competition',
      open_house: 'Open house',
      clinic: 'Clinic',
      fundraiser: 'Fundraiser',
      social_event: 'Social event',
      other: 'Other'
    };
    return map[value] || '';
  }

  _getStallTypeLabel(value) {
    const map = {
      indoor_stall: 'Indoor stall',
      outdoor_stall: 'Outdoor stall',
      pasture_board: 'Pasture board',
      paddock_stall: 'Paddock stall'
    };
    return map[value] || '';
  }

  _getTurnoutTypeLabel(value) {
    const map = {
      daily_turnout: 'Daily turnout',
      partial_turnout: 'Partial turnout',
      no_turnout: 'No turnout'
    };
    return map[value] || '';
  }

  _getDayLengthLabel(value) {
    const map = {
      half_day: 'Half-day',
      full_day: 'Full-day',
      overnight: 'Overnight'
    };
    return map[value] || '';
  }

  // -----------------------------
  // Event interest list helpers
  // -----------------------------

  _getOrCreateEventInterestList() {
    let lists = this._getFromStorage('event_interest_lists', []);
    if (!Array.isArray(lists)) {
      lists = [];
    }
    if (lists.length === 0) {
      const newList = {
        id: this._generateId('event_interest_list'),
        eventIds: [],
        savedAt: null,
        lastUpdatedAt: null
      };
      lists.push(newList);
      this._saveToStorage('event_interest_lists', lists);
      return newList;
    }
    return lists[0];
  }

  _updateEventInterestList(eventIds) {
    let lists = this._getFromStorage('event_interest_lists', []);
    if (!Array.isArray(lists)) {
      lists = [];
    }
    const timestamp = this._getCurrentTimestamp();
    if (lists.length === 0) {
      const newList = {
        id: this._generateId('event_interest_list'),
        eventIds: eventIds.slice(),
        savedAt: null,
        lastUpdatedAt: timestamp
      };
      lists.push(newList);
    } else {
      lists[0].eventIds = eventIds.slice();
      lists[0].lastUpdatedAt = timestamp;
    }
    this._saveToStorage('event_interest_lists', lists);
    return lists[0];
  }

  // -----------------------------
  // Interface implementations
  // -----------------------------

  // getHomePageContent()
  getHomePageContent() {
    const stored = this._getFromStorage('home_page_content', {});
    const content = stored && typeof stored === 'object' ? stored : {};

    // Featured lessons derived from actual lessons if not provided
    let featuredLessons = Array.isArray(content.featuredLessons)
      ? content.featuredLessons
      : [];

    if (!featuredLessons || featuredLessons.length === 0) {
      const lessonSearch = this.searchLessons({}, 'price_asc', 1, 3);
      featuredLessons = (lessonSearch.results || []).map((l) => ({
        lessonId: l.lessonId,
        name: l.name,
        ridingLevelLabel: l.ridingLevelLabel,
        ageGroupLabel: l.ageGroupLabel,
        dayOfWeekLabel: l.dayOfWeekLabel,
        priceDisplay: l.priceDisplay
      }));
    }

    // Upcoming events preview
    let upcomingEventsPreview = Array.isArray(content.upcomingEventsPreview)
      ? content.upcomingEventsPreview
      : [];

    if (!upcomingEventsPreview || upcomingEventsPreview.length === 0) {
      const now = this._getCurrentTimestamp();
      const eventsSearch = this.searchEvents(
        {
          dateRangePreset: 'next_60_days',
          startDate: now,
          endDate: null,
          eventType: null,
          isSpectatorFriendly: null,
          maxSpectatorEntryFee: null
        },
        'date_soonest_first',
        1,
        3
      );
      upcomingEventsPreview = (eventsSearch.results || []).map((e) => ({
        eventId: e.eventId,
        name: e.name,
        dateDisplay: e.dateDisplay,
        isSpectatorFriendly: !!e.isSpectatorFriendly
      }));
    }

    return {
      heroTitle: content.heroTitle || '',
      heroSubtitle: content.heroSubtitle || '',
      heroImageUrl: content.heroImageUrl || '',
      locationSummary: content.locationSummary || '',
      highlights: Array.isArray(content.highlights) ? content.highlights : [],
      quickLinks: Array.isArray(content.quickLinks) ? content.quickLinks : [],
      featuredLessons: featuredLessons,
      upcomingEventsPreview: upcomingEventsPreview
    };
  }

  // getLessonFilterOptions()
  getLessonFilterOptions() {
    const ridingLevels = [
      { value: 'beginner', label: 'Beginner' },
      { value: 'intermediate', label: 'Intermediate' },
      { value: 'advanced', label: 'Advanced' },
      { value: 'all_levels', label: 'All levels' }
    ];

    const ageGroups = [
      { value: 'children_8_12', label: 'Children 8–12' },
      { value: 'children_10_13', label: 'Children 10–13' },
      { value: 'teens_13_17', label: 'Teens 13–17' },
      { value: 'adults_18_plus', label: 'Adults 18+' },
      { value: 'all_ages', label: 'All ages' }
    ];

    const daysOfWeek = [
      { value: 'monday', label: 'Monday' },
      { value: 'tuesday', label: 'Tuesday' },
      { value: 'wednesday', label: 'Wednesday' },
      { value: 'thursday', label: 'Thursday' },
      { value: 'friday', label: 'Friday' },
      { value: 'saturday', label: 'Saturday' },
      { value: 'sunday', label: 'Sunday' }
    ];

    const formats = [
      { value: 'group', label: 'Group' },
      { value: 'private', label: 'Private' },
      { value: 'semi_private', label: 'Semi-private' }
    ];

    const lessons = this._getFromStorage('lessons', []);
    const prices = lessons
      .filter((l) => typeof l.pricePerSession === 'number')
      .map((l) => l.pricePerSession);
    const priceMin = prices.length ? Math.min.apply(null, prices) : 0;
    const priceMax = prices.length ? Math.max.apply(null, prices) : 0;

    const sortOptions = [
      { value: 'price_asc', label: 'Price: low to high' },
      { value: 'price_desc', label: 'Price: high to low' },
      { value: 'day_of_week', label: 'Day of week' },
      { value: 'name_asc', label: 'Name A–Z' }
    ];

    return {
      ridingLevels: ridingLevels,
      ageGroups: ageGroups,
      daysOfWeek: daysOfWeek,
      formats: formats,
      pricePerSessionRange: {
        min: priceMin,
        max: priceMax,
        step: 5
      },
      sortOptions: sortOptions
    };
  }

  // searchLessons(filters, sortBy, page, pageSize)
  searchLessons(filters, sortBy, page, pageSize) {
    const f = filters || {};
    const lessons = this._getFromStorage('lessons', []);
    const instructors = this._getFromStorage('instructors', []);
    const instructorsById = {};
    for (let i = 0; i < instructors.length; i++) {
      instructorsById[instructors[i].id] = instructors[i];
    }

    let filtered = lessons.filter((l) => l && l.isActive !== false);

    if (f.ridingLevel) {
      filtered = filtered.filter((l) => l.ridingLevel === f.ridingLevel);
    }
    if (f.ageGroupCode) {
      filtered = filtered.filter((l) => l.ageGroupCode === f.ageGroupCode);
    }
    if (f.dayOfWeek) {
      filtered = filtered.filter((l) => l.dayOfWeek === f.dayOfWeek);
    }
    if (f.format) {
      filtered = filtered.filter((l) => l.format === f.format);
    }
    if (typeof f.maxPricePerSession === 'number') {
      filtered = filtered.filter(
        (l) => typeof l.pricePerSession === 'number' && l.pricePerSession <= f.maxPricePerSession
      );
    }

    if (sortBy === 'price_asc') {
      filtered.sort((a, b) => (a.pricePerSession || 0) - (b.pricePerSession || 0));
    } else if (sortBy === 'price_desc') {
      filtered.sort((a, b) => (b.pricePerSession || 0) - (a.pricePerSession || 0));
    } else if (sortBy === 'day_of_week') {
      const order = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      filtered.sort((a, b) => order.indexOf(a.dayOfWeek) - order.indexOf(b.dayOfWeek));
    } else if (sortBy === 'name_asc') {
      filtered.sort((a, b) => {
        const an = (a.name || '').toLowerCase();
        const bn = (b.name || '').toLowerCase();
        if (an < bn) return -1;
        if (an > bn) return 1;
        return 0;
      });
    }

    const totalCount = filtered.length;
    const pageItems = this._paginate(filtered, page, pageSize);

    const results = pageItems.map((lesson) => {
      const instructor = lesson.instructorId ? instructorsById[lesson.instructorId] : null;
      return {
        lessonId: lesson.id,
        name: lesson.name,
        offeringType: lesson.offeringType,
        descriptionSnippet: this._truncateText(lesson.description || '', 160),
        ridingLevelLabel: this._getRidingLevelLabel(lesson.ridingLevel),
        ageGroupLabel: this._getAgeGroupLabel(lesson.ageGroupCode),
        dayOfWeekLabel: this._getDayOfWeekLabel(lesson.dayOfWeek),
        formatLabel: this._getFormatLabel(lesson.format),
        pricePerSession: lesson.pricePerSession,
        priceDisplay: this._formatCurrency(lesson.pricePerSession, 'per lesson'),
        durationMinutes: lesson.durationMinutes,
        instructorName: instructor ? instructor.name : '',
        isActive: lesson.isActive !== false
      };
    });

    return {
      results: results,
      totalCount: totalCount,
      appliedFilters: {
        ridingLevel: f.ridingLevel || null,
        ageGroupCode: f.ageGroupCode || null,
        dayOfWeek: f.dayOfWeek || null,
        format: f.format || null,
        maxPricePerSession: typeof f.maxPricePerSession === 'number' ? f.maxPricePerSession : null,
        sortBy: sortBy || null
      }
    };
  }

  // getLessonDetails(lessonId)
  getLessonDetails(lessonId) {
    const lessons = this._getFromStorage('lessons', []);
    const lesson = lessons.find((l) => l.id === lessonId) || null;
    if (!lesson) {
      return {
        lesson: null,
        ridingLevelLabel: '',
        ageGroupLabel: '',
        dayOfWeekLabel: '',
        formatLabel: '',
        priceDisplay: '',
        instructor: null
      };
    }

    const instructors = this._getFromStorage('instructors', []);
    const instructor = lesson.instructorId
      ? instructors.find((i) => i.id === lesson.instructorId) || null
      : null;

    return {
      lesson: {
        id: lesson.id,
        name: lesson.name,
        offeringType: lesson.offeringType,
        description: lesson.description || '',
        ridingLevel: lesson.ridingLevel,
        ageGroupCode: lesson.ageGroupCode,
        minAge: lesson.minAge,
        maxAge: lesson.maxAge,
        dayOfWeek: lesson.dayOfWeek,
        format: lesson.format,
        pricePerSession: lesson.pricePerSession,
        durationMinutes: lesson.durationMinutes,
        location: lesson.location || '',
        isActive: lesson.isActive !== false
      },
      ridingLevelLabel: this._getRidingLevelLabel(lesson.ridingLevel),
      ageGroupLabel: this._getAgeGroupLabel(lesson.ageGroupCode),
      dayOfWeekLabel: this._getDayOfWeekLabel(lesson.dayOfWeek),
      formatLabel: this._getFormatLabel(lesson.format),
      priceDisplay: this._formatCurrency(lesson.pricePerSession, 'per lesson'),
      instructor: instructor
        ? {
            id: instructor.id,
            name: instructor.name,
            primaryDiscipline: instructor.primaryDiscipline || null,
            bio: instructor.bio || '',
            rating: instructor.rating,
            yearsExperience: instructor.yearsExperience,
            photoUrl: instructor.photoUrl || ''
          }
        : null
    };
  }

  // getClinicFilterOptions()
  getClinicFilterOptions() {
    const disciplines = [
      { value: 'jumping', label: 'Jumping' },
      { value: 'dressage', label: 'Dressage' },
      { value: 'flatwork', label: 'Flatwork' },
      { value: 'trail', label: 'Trail' },
      { value: 'horsemanship', label: 'Horsemanship' },
      { value: 'general_riding', label: 'General riding' }
    ];

    const ridingLevels = [
      { value: 'beginner', label: 'Beginner' },
      { value: 'intermediate', label: 'Intermediate' },
      { value: 'advanced', label: 'Advanced' },
      { value: 'all_levels', label: 'All levels' }
    ];

    const clinics = this._getFromStorage('clinics', []);
    const prices = clinics
      .filter((c) => typeof c.pricePerRider === 'number')
      .map((c) => c.pricePerRider);
    const priceMin = prices.length ? Math.min.apply(null, prices) : 0;
    const priceMax = prices.length ? Math.max.apply(null, prices) : 0;

    const ratingThresholds = [0, 3, 3.5, 4, 4.5, 5];
    const experienceThresholdsYears = [0, 1, 3, 5, 10];

    const sortOptions = [
      { value: 'price_asc', label: 'Price: low to high' },
      { value: 'price_desc', label: 'Price: high to low' },
      { value: 'date_asc', label: 'Date: soonest first' }
    ];

    return {
      disciplines: disciplines,
      ridingLevels: ridingLevels,
      ratingThresholds: ratingThresholds,
      experienceThresholdsYears: experienceThresholdsYears,
      pricePerRiderRange: {
        min: priceMin,
        max: priceMax,
        step: 5
      },
      sortOptions: sortOptions
    };
  }

  // searchClinics(filters, sortBy, page, pageSize)
  searchClinics(filters, sortBy, page, pageSize) {
    const f = filters || {};
    const clinics = this._getFromStorage('clinics', []);
    const instructors = this._getFromStorage('instructors', []);
    const instructorsById = {};
    for (let i = 0; i < instructors.length; i++) {
      instructorsById[instructors[i].id] = instructors[i];
    }

    let filtered = clinics.filter((c) => c && c.isActive !== false);

    if (f.discipline) {
      filtered = filtered.filter((c) => c.discipline === f.discipline);
    }
    if (f.ridingLevel) {
      filtered = filtered.filter((c) => c.ridingLevel === f.ridingLevel);
    }
    if (typeof f.minInstructorRating === 'number') {
      filtered = filtered.filter((c) => {
        const instr = instructorsById[c.instructorId];
        const rating = instr && typeof instr.rating === 'number' ? instr.rating : 0;
        return rating >= f.minInstructorRating;
      });
    }
    if (typeof f.minInstructorExperienceYears === 'number') {
      filtered = filtered.filter((c) => {
        const instr = instructorsById[c.instructorId];
        const years = instr && typeof instr.yearsExperience === 'number' ? instr.yearsExperience : 0;
        return years >= f.minInstructorExperienceYears;
      });
    }
    if (typeof f.maxPricePerRider === 'number') {
      filtered = filtered.filter(
        (c) => typeof c.pricePerRider === 'number' && c.pricePerRider <= f.maxPricePerRider
      );
    }
    if (f.startDate) {
      const start = this._parseDate(f.startDate);
      if (start) {
        filtered = filtered.filter((c) => {
          const s = this._parseDate(c.startDateTime);
          return s && s >= start;
        });
      }
    }
    if (f.endDate) {
      const end = this._parseDate(f.endDate);
      if (end) {
        filtered = filtered.filter((c) => {
          const s = this._parseDate(c.startDateTime);
          return s && s <= end;
        });
      }
    }

    if (sortBy === 'price_asc') {
      filtered.sort((a, b) => (a.pricePerRider || 0) - (b.pricePerRider || 0));
    } else if (sortBy === 'price_desc') {
      filtered.sort((a, b) => (b.pricePerRider || 0) - (a.pricePerRider || 0));
    } else if (sortBy === 'date_asc') {
      filtered.sort((a, b) => {
        const as = this._parseDate(a.startDateTime) || new Date(0);
        const bs = this._parseDate(b.startDateTime) || new Date(0);
        return as - bs;
      });
    }

    const totalCount = filtered.length;
    const pageItems = this._paginate(filtered, page, pageSize);

    const results = pageItems.map((clinic) => {
      const instr = instructorsById[clinic.instructorId];
      return {
        clinicId: clinic.id,
        name: clinic.name,
        disciplineLabel: this._getDisciplineLabel(clinic.discipline),
        ridingLevelLabel: this._getRidingLevelLabel(clinic.ridingLevel),
        pricePerRider: clinic.pricePerRider,
        priceDisplay: this._formatCurrency(clinic.pricePerRider, 'per rider'),
        startDateTime: clinic.startDateTime,
        endDateTime: clinic.endDateTime,
        durationHours: clinic.durationHours,
        instructorName: instr ? instr.name : '',
        instructorRating: instr ? instr.rating : null,
        instructorYearsExperience: instr ? instr.yearsExperience : null,
        isActive: clinic.isActive !== false
      };
    });

    return {
      results: results,
      totalCount: totalCount,
      appliedFilters: {
        discipline: f.discipline || null,
        ridingLevel: f.ridingLevel || null,
        minInstructorRating:
          typeof f.minInstructorRating === 'number' ? f.minInstructorRating : null,
        minInstructorExperienceYears:
          typeof f.minInstructorExperienceYears === 'number'
            ? f.minInstructorExperienceYears
            : null,
        maxPricePerRider:
          typeof f.maxPricePerRider === 'number' ? f.maxPricePerRider : null,
        startDate: f.startDate || null,
        endDate: f.endDate || null,
        sortBy: sortBy || null
      }
    };
  }

  // getClinicDetails(clinicId)
  getClinicDetails(clinicId) {
    const clinics = this._getFromStorage('clinics', []);
    const clinic = clinics.find((c) => c.id === clinicId) || null;
    if (!clinic) {
      return {
        clinic: null,
        disciplineLabel: '',
        ridingLevelLabel: '',
        priceDisplay: '',
        dateRangeDisplay: '',
        instructor: null
      };
    }

    const instructors = this._getFromStorage('instructors', []);
    const instructor = clinic.instructorId
      ? instructors.find((i) => i.id === clinic.instructorId) || null
      : null;

    return {
      clinic: {
        id: clinic.id,
        name: clinic.name,
        description: clinic.description || '',
        discipline: clinic.discipline,
        ridingLevel: clinic.ridingLevel,
        pricePerRider: clinic.pricePerRider,
        startDateTime: clinic.startDateTime,
        endDateTime: clinic.endDateTime,
        durationHours: clinic.durationHours,
        location: clinic.location || '',
        maxParticipants: clinic.maxParticipants,
        isActive: clinic.isActive !== false
      },
      disciplineLabel: this._getDisciplineLabel(clinic.discipline),
      ridingLevelLabel: this._getRidingLevelLabel(clinic.ridingLevel),
      priceDisplay: this._formatCurrency(clinic.pricePerRider, 'per rider'),
      dateRangeDisplay: this._formatDateRange(clinic.startDateTime, clinic.endDateTime),
      instructor: instructor
        ? {
            id: instructor.id,
            name: instructor.name,
            primaryDiscipline: instructor.primaryDiscipline || null,
            bio: instructor.bio || '',
            rating: instructor.rating,
            yearsExperience: instructor.yearsExperience,
            photoUrl: instructor.photoUrl || ''
          }
        : null
    };
  }

  // submitLessonInquiry(lessonId, name, email, message)
  submitLessonInquiry(lessonId, name, email, message) {
    const lessons = this._getFromStorage('lessons', []);
    const lesson = lessons.find((l) => l.id === lessonId) || null;
    if (!lesson || !name || !email || !message || !this._validateEmailFormat(email)) {
      return {
        success: false,
        submissionId: null,
        lessonNameSnapshot: lesson ? lesson.name : '',
        submittedAt: null,
        confirmationMessage: 'Unable to submit lesson inquiry. Please check your input.'
      };
    }

    const submissions = this._getFromStorage('lesson_inquiry_submissions', []);
    const submissionId = this._generateId('lesson_inquiry');
    const submittedAt = this._getCurrentTimestamp();

    const record = {
      id: submissionId,
      lessonId: lessonId,
      lessonNameSnapshot: lesson.name,
      name: name,
      email: email,
      message: message,
      submittedAt: submittedAt
    };

    submissions.push(record);
    this._saveToStorage('lesson_inquiry_submissions', submissions);

    return {
      success: true,
      submissionId: submissionId,
      lessonNameSnapshot: lesson.name,
      submittedAt: submittedAt,
      confirmationMessage: 'Your inquiry has been submitted. We will contact you soon.'
    };
  }

  // submitClinicInterestRegistration(clinicId, fullName, email, message)
  submitClinicInterestRegistration(clinicId, fullName, email, message) {
    const clinics = this._getFromStorage('clinics', []);
    const clinic = clinics.find((c) => c.id === clinicId) || null;
    if (!clinic || !fullName || !email || !message || !this._validateEmailFormat(email)) {
      return {
        success: false,
        submissionId: null,
        clinicNameSnapshot: clinic ? clinic.name : '',
        submittedAt: null,
        confirmationMessage: 'Unable to submit clinic interest. Please check your input.'
      };
    }

    const submissions = this._getFromStorage('clinic_interest_registrations', []);
    const submissionId = this._generateId('clinic_interest');
    const submittedAt = this._getCurrentTimestamp();

    const record = {
      id: submissionId,
      clinicId: clinicId,
      clinicNameSnapshot: clinic.name,
      fullName: fullName,
      email: email,
      message: message,
      submittedAt: submittedAt
    };

    submissions.push(record);
    this._saveToStorage('clinic_interest_registrations', submissions);

    return {
      success: true,
      submissionId: submissionId,
      clinicNameSnapshot: clinic.name,
      submittedAt: submittedAt,
      confirmationMessage: 'Your interest in this clinic has been recorded.'
    };
  }

  // getMembershipFilterOptions()
  getMembershipFilterOptions() {
    const memberTypes = [
      { value: 'adult', label: 'Adult' },
      { value: 'youth', label: 'Youth' },
      { value: 'child', label: 'Child' },
      { value: 'family', label: 'Family' },
      { value: 'senior', label: 'Senior' }
    ];

    const plans = this._getFromStorage('membership_plans', []);
    const fees = plans
      .filter((p) => typeof p.monthlyFee === 'number')
      .map((p) => p.monthlyFee);
    const feeMin = fees.length ? Math.min.apply(null, fees) : 0;
    const feeMax = fees.length ? Math.max.apply(null, fees) : 0;

    const sortOptions = [
      { value: 'monthly_fee_asc', label: 'Monthly fee: low to high' },
      { value: 'monthly_fee_desc', label: 'Monthly fee: high to low' },
      { value: 'lessons_desc', label: 'Most lessons included' }
    ];

    return {
      memberTypes: memberTypes,
      monthlyFeeRange: {
        min: feeMin,
        max: feeMax,
        step: 10
      },
      sortOptions: sortOptions
    };
  }

  // searchMembershipPlans(filters, sortBy, page, pageSize)
  searchMembershipPlans(filters, sortBy, page, pageSize) {
    const f = filters || {};
    let plans = this._getFromStorage('membership_plans', []);

    plans = plans.filter((p) => p && p.isActive !== false);

    if (f.memberType) {
      plans = plans.filter((p) => p.memberType === f.memberType);
    }
    if (typeof f.maxMonthlyFee === 'number') {
      plans = plans.filter(
        (p) => typeof p.monthlyFee === 'number' && p.monthlyFee <= f.maxMonthlyFee
      );
    }
    if (typeof f.weekendArenaAccess === 'boolean') {
      plans = plans.filter((p) => !!p.weekendArenaAccess === f.weekendArenaAccess);
    }

    if (sortBy === 'monthly_fee_asc') {
      plans.sort((a, b) => (a.monthlyFee || 0) - (b.monthlyFee || 0));
    } else if (sortBy === 'monthly_fee_desc') {
      plans.sort((a, b) => (b.monthlyFee || 0) - (a.monthlyFee || 0));
    } else if (sortBy === 'lessons_desc') {
      plans.sort(
        (a, b) => (b.includedLessonsPerMonth || 0) - (a.includedLessonsPerMonth || 0)
      );
    }

    const totalCount = plans.length;
    const pageItems = this._paginate(plans, page, pageSize);

    const results = pageItems.map((plan) => ({
      planId: plan.id,
      name: plan.name,
      memberTypeLabel: this._getMemberTypeLabel(plan.memberType),
      monthlyFee: plan.monthlyFee,
      monthlyFeeDisplay: this._formatCurrency(plan.monthlyFee, 'per month'),
      includedLessonsPerMonth: plan.includedLessonsPerMonth,
      weekendArenaAccess: !!plan.weekendArenaAccess,
      highlightsSnippet: this._truncateText(plan.highlights || plan.description || '', 160),
      isActive: plan.isActive !== false
    }));

    return {
      results: results,
      totalCount: totalCount,
      appliedFilters: {
        memberType: f.memberType || null,
        maxMonthlyFee:
          typeof f.maxMonthlyFee === 'number' ? f.maxMonthlyFee : null,
        weekendArenaAccess:
          typeof f.weekendArenaAccess === 'boolean' ? f.weekendArenaAccess : null,
        sortBy: sortBy || null
      }
    };
  }

  // getMembershipPlanDetails(planId)
  getMembershipPlanDetails(planId) {
    const plans = this._getFromStorage('membership_plans', []);
    const plan = plans.find((p) => p.id === planId) || null;
    if (!plan) {
      return {
        plan: null,
        memberTypeLabel: '',
        monthlyFeeDisplay: '',
        includedLessonsLabel: ''
      };
    }

    const includedLabel =
      (typeof plan.includedLessonsPerMonth === 'number'
        ? plan.includedLessonsPerMonth + ' lessons per month'
        : 'No lessons included');

    return {
      plan: {
        id: plan.id,
        name: plan.name,
        memberType: plan.memberType,
        monthlyFee: plan.monthlyFee,
        includedLessonsPerMonth: plan.includedLessonsPerMonth,
        weekendArenaAccess: !!plan.weekendArenaAccess,
        description: plan.description || '',
        highlights: plan.highlights || '',
        isActive: plan.isActive !== false
      },
      memberTypeLabel: this._getMemberTypeLabel(plan.memberType),
      monthlyFeeDisplay: this._formatCurrency(plan.monthlyFee, 'per month'),
      includedLessonsLabel: includedLabel
    };
  }

  // submitMembershipJoin(planId, fullName, email)
  submitMembershipJoin(planId, fullName, email) {
    const plans = this._getFromStorage('membership_plans', []);
    const plan = plans.find((p) => p.id === planId) || null;
    if (!plan || !fullName || !email || !this._validateEmailFormat(email)) {
      return {
        success: false,
        joinSubmissionId: null,
        planNameSnapshot: plan ? plan.name : '',
        status: 'draft',
        submittedAt: null,
        confirmationMessage: 'Unable to submit membership join request. Please check your input.'
      };
    }

    const joins = this._getFromStorage('membership_join_submissions', []);
    const id = this._generateId('membership_join');
    const submittedAt = this._getCurrentTimestamp();

    const record = {
      id: id,
      planId: planId,
      planNameSnapshot: plan.name,
      fullName: fullName,
      email: email,
      status: 'submitted',
      submittedAt: submittedAt
    };

    joins.push(record);
    this._saveToStorage('membership_join_submissions', joins);

    return {
      success: true,
      joinSubmissionId: id,
      planNameSnapshot: plan.name,
      status: 'submitted',
      submittedAt: submittedAt,
      confirmationMessage: 'Your membership request has been submitted.'
    };
  }

  // getEventFilterOptions()
  getEventFilterOptions() {
    const dateRangePresets = [
      { value: 'next_60_days', label: 'Next 60 days' },
      { value: 'this_month', label: 'This month' },
      { value: 'next_30_days', label: 'Next 30 days' }
    ];

    const eventTypes = [
      { value: 'show', label: 'Show' },
      { value: 'competition', label: 'Competition' },
      { value: 'open_house', label: 'Open house' },
      { value: 'clinic', label: 'Clinic' },
      { value: 'fundraiser', label: 'Fundraiser' },
      { value: 'social_event', label: 'Social event' },
      { value: 'other', label: 'Other' }
    ];

    const spectatorFriendlyOption = {
      label: 'Spectator friendly',
      description: 'Only show events suitable for spectators.'
    };

    const events = this._getFromStorage('events', []);
    const fees = events
      .filter((e) => typeof e.spectatorEntryFee === 'number')
      .map((e) => e.spectatorEntryFee);
    const feeMin = fees.length ? Math.min.apply(null, fees) : 0;
    const feeMax = fees.length ? Math.max.apply(null, fees) : 0;

    const sortOptions = [
      { value: 'date_soonest_first', label: 'Date: soonest first' },
      { value: 'fee_low_to_high', label: 'Entry fee: low to high' }
    ];

    return {
      dateRangePresets: dateRangePresets,
      eventTypes: eventTypes,
      spectatorFriendlyOption: spectatorFriendlyOption,
      spectatorEntryFeeRange: {
        min: feeMin,
        max: feeMax,
        step: 1
      },
      sortOptions: sortOptions
    };
  }

  // searchEvents(filters, sortBy, page, pageSize)
  searchEvents(filters, sortBy, page, pageSize) {
    const f = filters || {};
    let events = this._getFromStorage('events', []);

    events = events.filter((e) => e && !e.isCancelled);

    const now = new Date();
    let rangeStart = null;
    let rangeEnd = null;

    if (f.dateRangePreset === 'next_60_days') {
      rangeStart = now;
      rangeEnd = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);
    } else if (f.dateRangePreset === 'next_30_days') {
      rangeStart = now;
      rangeEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    } else if (f.dateRangePreset === 'this_month') {
      rangeStart = new Date(now.getFullYear(), now.getMonth(), 1);
      rangeEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    }

    if (f.dateRangePreset && rangeStart && rangeEnd) {
      events = events.filter((e) => {
        const s = this._parseDate(e.startDateTime);
        return s && s >= rangeStart && s <= rangeEnd;
      });
    } else {
      if (f.startDate) {
        const start = this._parseDate(f.startDate);
        if (start) {
          events = events.filter((e) => {
            const s = this._parseDate(e.startDateTime);
            return s && s >= start;
          });
        }
      }
      if (f.endDate) {
        const end = this._parseDate(f.endDate);
        if (end) {
          events = events.filter((e) => {
            const s = this._parseDate(e.startDateTime);
            return s && s <= end;
          });
        }
      }
    }

    if (f.eventType) {
      events = events.filter((e) => e.eventType === f.eventType);
    }
    if (typeof f.isSpectatorFriendly === 'boolean') {
      events = events.filter((e) => !!e.isSpectatorFriendly === f.isSpectatorFriendly);
    }
    if (typeof f.maxSpectatorEntryFee === 'number') {
      events = events.filter((e) => {
        if (typeof e.spectatorEntryFee !== 'number') return false;
        return e.spectatorEntryFee <= f.maxSpectatorEntryFee;
      });
    }

    if (sortBy === 'fee_low_to_high') {
      events.sort((a, b) => (a.spectatorEntryFee || 0) - (b.spectatorEntryFee || 0));
    } else if (sortBy === 'date_soonest_first') {
      events.sort((a, b) => {
        const as = this._parseDate(a.startDateTime) || new Date(0);
        const bs = this._parseDate(b.startDateTime) || new Date(0);
        return as - bs;
      });
    }

    const interestList = this._getOrCreateEventInterestList();
    const interestIds = Array.isArray(interestList.eventIds) ? interestList.eventIds : [];

    const totalCount = events.length;
    const pageItems = this._paginate(events, page, pageSize);

    const results = pageItems.map((e) => {
      const s = this._parseDate(e.startDateTime);
      const dateDisplay = s
        ? s.toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
          })
        : '';
      const feeDisplay =
        typeof e.spectatorEntryFee === 'number'
          ? this._formatCurrency(e.spectatorEntryFee)
          : 'Free';
      return {
        eventId: e.id,
        name: e.name,
        eventTypeLabel: this._getEventTypeLabel(e.eventType),
        startDateTime: e.startDateTime,
        endDateTime: e.endDateTime,
        dateDisplay: dateDisplay,
        spectatorEntryFee: e.spectatorEntryFee,
        spectatorEntryFeeDisplay: feeDisplay,
        isSpectatorFriendly: !!e.isSpectatorFriendly,
        location: e.location || '',
        isCancelled: !!e.isCancelled,
        isInInterestList: interestIds.indexOf(e.id) !== -1
      };
    });

    return {
      results: results,
      totalCount: totalCount,
      appliedFilters: {
        dateRangePreset: f.dateRangePreset || null,
        startDate: f.startDate || null,
        endDate: f.endDate || null,
        eventType: f.eventType || null,
        isSpectatorFriendly:
          typeof f.isSpectatorFriendly === 'boolean' ? f.isSpectatorFriendly : null,
        maxSpectatorEntryFee:
          typeof f.maxSpectatorEntryFee === 'number' ? f.maxSpectatorEntryFee : null,
        sortBy: sortBy || null
      }
    };
  }

  // addEventToInterestList(eventId)
  addEventToInterestList(eventId) {
    const list = this._getOrCreateEventInterestList();
    const ids = Array.isArray(list.eventIds) ? list.eventIds.slice() : [];
    if (ids.indexOf(eventId) === -1) {
      ids.push(eventId);
    }
    const updated = this._updateEventInterestList(ids);
    return {
      success: true,
      currentEventIds: updated.eventIds.slice(),
      totalEventsInList: updated.eventIds.length
    };
  }

  // removeEventFromInterestList(eventId)
  removeEventFromInterestList(eventId) {
    const list = this._getOrCreateEventInterestList();
    const ids = Array.isArray(list.eventIds) ? list.eventIds.slice() : [];
    const idx = ids.indexOf(eventId);
    if (idx !== -1) {
      ids.splice(idx, 1);
    }
    const updated = this._updateEventInterestList(ids);
    return {
      success: true,
      currentEventIds: updated.eventIds.slice(),
      totalEventsInList: updated.eventIds.length
    };
  }

  // getMyEventInterestList()
  getMyEventInterestList() {
    const list = this._getOrCreateEventInterestList();
    const eventIds = Array.isArray(list.eventIds) ? list.eventIds : [];
    const events = this._getFromStorage('events', []);

    const selectedEvents = events
      .filter((e) => eventIds.indexOf(e.id) !== -1)
      .map((e) => {
        const s = this._parseDate(e.startDateTime);
        const dateDisplay = s
          ? s.toLocaleDateString(undefined, {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit'
            })
          : '';
        const feeDisplay =
          typeof e.spectatorEntryFee === 'number'
            ? this._formatCurrency(e.spectatorEntryFee)
            : 'Free';
        return {
          eventId: e.id,
          name: e.name,
          eventTypeLabel: this._getEventTypeLabel(e.eventType),
          startDateTime: e.startDateTime,
          dateDisplay: dateDisplay,
          spectatorEntryFeeDisplay: feeDisplay,
          isSpectatorFriendly: !!e.isSpectatorFriendly
        };
      });

    // Keep the order consistent with eventIds
    selectedEvents.sort((a, b) => {
      return eventIds.indexOf(a.eventId) - eventIds.indexOf(b.eventId);
    });

    return {
      events: selectedEvents,
      totalEvents: selectedEvents.length,
      hasAtLeastThreeEvents: selectedEvents.length >= 3,
      savedAt: list.savedAt || null,
      lastUpdatedAt: list.lastUpdatedAt || null
    };
  }

  // saveMyEventInterestList()
  saveMyEventInterestList() {
    let lists = this._getFromStorage('event_interest_lists', []);
    if (!Array.isArray(lists) || lists.length === 0) {
      const list = this._getOrCreateEventInterestList();
      lists = [list];
    }
    const timestamp = this._getCurrentTimestamp();
    lists[0].savedAt = timestamp;
    lists[0].lastUpdatedAt = timestamp;
    this._saveToStorage('event_interest_lists', lists);

    const totalEvents = Array.isArray(lists[0].eventIds) ? lists[0].eventIds.length : 0;

    return {
      success: true,
      savedAt: timestamp,
      totalEvents: totalEvents
    };
  }

  // getBoardingFilterOptions()
  getBoardingFilterOptions() {
    const stallTypes = [
      { value: 'indoor_stall', label: 'Indoor stall' },
      { value: 'outdoor_stall', label: 'Outdoor stall' },
      { value: 'pasture_board', label: 'Pasture board' },
      { value: 'paddock_stall', label: 'Paddock stall' }
    ];

    const turnoutTypes = [
      { value: 'daily_turnout', label: 'Daily turnout' },
      { value: 'partial_turnout', label: 'Partial turnout' },
      { value: 'no_turnout', label: 'No turnout' }
    ];

    const options = this._getFromStorage('boarding_options', []);
    const prices = options
      .filter((o) => typeof o.monthlyBoardPrice === 'number')
      .map((o) => o.monthlyBoardPrice);
    const priceMin = prices.length ? Math.min.apply(null, prices) : 0;
    const priceMax = prices.length ? Math.max.apply(null, prices) : 0;

    const sortOptions = [
      { value: 'minimum_contract_shortest_first', label: 'Minimum contract: shortest first' },
      { value: 'price_low_to_high', label: 'Price: low to high' },
      { value: 'price_high_to_low', label: 'Price: high to low' }
    ];

    return {
      stallTypes: stallTypes,
      turnoutTypes: turnoutTypes,
      monthlyBoardPriceRange: {
        min: priceMin,
        max: priceMax,
        step: 25
      },
      sortOptions: sortOptions
    };
  }

  // searchBoardingOptions(filters, sortBy, page, pageSize)
  searchBoardingOptions(filters, sortBy, page, pageSize) {
    const f = filters || {};
    let options = this._getFromStorage('boarding_options', []);

    options = options.filter((o) => o && o.isActive !== false);

    if (f.stallType) {
      options = options.filter((o) => o.stallType === f.stallType);
    }
    if (f.turnoutType) {
      options = options.filter((o) => o.turnoutType === f.turnoutType);
    }
    if (typeof f.maxMonthlyBoardPrice === 'number') {
      options = options.filter(
        (o) => typeof o.monthlyBoardPrice === 'number' && o.monthlyBoardPrice <= f.maxMonthlyBoardPrice
      );
    }

    if (sortBy === 'minimum_contract_shortest_first') {
      options.sort(
        (a, b) => (a.minimumContractMonths || 0) - (b.minimumContractMonths || 0)
      );
    } else if (sortBy === 'price_low_to_high') {
      options.sort((a, b) => (a.monthlyBoardPrice || 0) - (b.monthlyBoardPrice || 0));
    } else if (sortBy === 'price_high_to_low') {
      options.sort((a, b) => (b.monthlyBoardPrice || 0) - (a.monthlyBoardPrice || 0));
    }

    const totalCount = options.length;
    const pageItems = this._paginate(options, page, pageSize);

    const results = pageItems.map((o) => ({
      boardingOptionId: o.id,
      name: o.name,
      stallTypeLabel: this._getStallTypeLabel(o.stallType),
      turnoutTypeLabel: this._getTurnoutTypeLabel(o.turnoutType),
      monthlyBoardPrice: o.monthlyBoardPrice,
      priceDisplay: this._formatCurrency(o.monthlyBoardPrice, 'per month'),
      minimumContractMonths: o.minimumContractMonths,
      hasWaitlist: !!o.hasWaitlist,
      isActive: o.isActive !== false
    }));

    return {
      results: results,
      totalCount: totalCount,
      appliedFilters: {
        stallType: f.stallType || null,
        turnoutType: f.turnoutType || null,
        maxMonthlyBoardPrice:
          typeof f.maxMonthlyBoardPrice === 'number' ? f.maxMonthlyBoardPrice : null,
        sortBy: sortBy || null
      }
    };
  }

  // getBoardingOptionDetails(boardingOptionId)
  getBoardingOptionDetails(boardingOptionId) {
    const options = this._getFromStorage('boarding_options', []);
    const o = options.find((x) => x.id === boardingOptionId) || null;
    if (!o) {
      return {
        boardingOption: null,
        stallTypeLabel: '',
        turnoutTypeLabel: '',
        priceDisplay: '',
        minimumContractLabel: ''
      };
    }

    const minContractLabel =
      typeof o.minimumContractMonths === 'number'
        ? o.minimumContractMonths + ' month minimum contract'
        : '';

    return {
      boardingOption: {
        id: o.id,
        name: o.name,
        description: o.description || '',
        stallType: o.stallType,
        turnoutType: o.turnoutType,
        monthlyBoardPrice: o.monthlyBoardPrice,
        minimumContractMonths: o.minimumContractMonths,
        servicesIncluded: o.servicesIncluded || '',
        facilitiesIncluded: o.facilitiesIncluded || '',
        hasWaitlist: !!o.hasWaitlist,
        isActive: o.isActive !== false
      },
      stallTypeLabel: this._getStallTypeLabel(o.stallType),
      turnoutTypeLabel: this._getTurnoutTypeLabel(o.turnoutType),
      priceDisplay: this._formatCurrency(o.monthlyBoardPrice, 'per month'),
      minimumContractLabel: minContractLabel
    };
  }

  // submitBoardingWaitlistRequest(boardingOptionId, name, email, numberOfHorses, preferredStartDateText, comments)
  submitBoardingWaitlistRequest(
    boardingOptionId,
    name,
    email,
    numberOfHorses,
    preferredStartDateText,
    comments
  ) {
    const options = this._getFromStorage('boarding_options', []);
    const option = options.find((o) => o.id === boardingOptionId) || null;
    const horsesNum = typeof numberOfHorses === 'number' ? numberOfHorses : parseInt(numberOfHorses, 10);

    if (!option || !name || !email || !this._validateEmailFormat(email) || !horsesNum) {
      return {
        success: false,
        waitlistRequestId: null,
        boardingOptionNameSnapshot: option ? option.name : '',
        submittedAt: null,
        confirmationMessage: 'Unable to submit waitlist request. Please check your input.'
      };
    }

    const list = this._getFromStorage('boarding_waitlist_requests', []);
    const id = this._generateId('boarding_waitlist');
    const submittedAt = this._getCurrentTimestamp();

    const record = {
      id: id,
      boardingOptionId: boardingOptionId,
      boardingOptionNameSnapshot: option.name,
      name: name,
      email: email,
      numberOfHorses: horsesNum,
      preferredStartDateText: preferredStartDateText || '',
      comments: comments || '',
      submittedAt: submittedAt
    };

    list.push(record);
    this._saveToStorage('boarding_waitlist_requests', list);

    return {
      success: true,
      waitlistRequestId: id,
      boardingOptionNameSnapshot: option.name,
      submittedAt: submittedAt,
      confirmationMessage: 'Your boarding waitlist request has been submitted.'
    };
  }

  // getCampFilterOptions()
  getCampFilterOptions() {
    const months = [
      { value: 'june', label: 'June' },
      { value: 'july', label: 'July' },
      { value: 'august', label: 'August' }
    ];

    const ageGroups = [
      { value: 'children_8_12', label: 'Children 8–12' },
      { value: 'children_10_13', label: 'Children 10–13' },
      { value: 'teens_13_17', label: 'Teens 13–17' },
      { value: 'all_ages', label: 'All ages' }
    ];

    const ridingLevels = [
      { value: 'beginner', label: 'Beginner' },
      { value: 'intermediate', label: 'Intermediate' },
      { value: 'advanced', label: 'Advanced' },
      { value: 'all_levels', label: 'All levels' }
    ];

    const dayLengths = [
      { value: 'half_day', label: 'Half-day' },
      { value: 'full_day', label: 'Full-day' },
      { value: 'overnight', label: 'Overnight' }
    ];

    return {
      months: months,
      ageGroups: ageGroups,
      ridingLevels: ridingLevels,
      dayLengths: dayLengths
    };
  }

  // searchCampSessions(filters, page, pageSize)
  searchCampSessions(filters, page, pageSize) {
    const f = filters || {};
    let sessions = this._getFromStorage('camp_sessions', []);

    sessions = sessions.filter((s) => s && s.isActive !== false);

    if (f.month) {
      sessions = sessions.filter((s) => {
        const start = this._parseDate(s.startDate);
        if (!start) return false;
        return this._getMonthKeyFromDate(start) === f.month;
      });
    }
    if (f.ageGroupCode) {
      sessions = sessions.filter((s) => s.ageGroupCode === f.ageGroupCode);
    }
    if (f.ridingLevel) {
      sessions = sessions.filter((s) => s.ridingLevel === f.ridingLevel);
    }
    if (f.dayLength) {
      sessions = sessions.filter((s) => s.dayLength === f.dayLength);
    }

    const totalCount = sessions.length;
    const pageItems = this._paginate(sessions, page, pageSize);

    const results = pageItems.map((s) => {
      const start = this._parseDate(s.startDate);
      const monthKey = start ? this._getMonthKeyFromDate(start) : null;
      return {
        campSessionId: s.id,
        name: s.name,
        startDate: s.startDate,
        endDate: s.endDate,
        startDayOfWeekLabel: this._getDayOfWeekLabel(s.startDayOfWeek),
        monthLabel: this._getMonthLabel(monthKey),
        ageGroupLabel: this._getAgeGroupLabel(s.ageGroupCode),
        ridingLevelLabel: this._getRidingLevelLabel(s.ridingLevel),
        dayLengthLabel: this._getDayLengthLabel(s.dayLength),
        price: s.price,
        priceDisplay: typeof s.price === 'number' ? this._formatCurrency(s.price) : '',
        isActive: s.isActive !== false
      };
    });

    return {
      results: results,
      totalCount: totalCount,
      appliedFilters: {
        month: f.month || null,
        ageGroupCode: f.ageGroupCode || null,
        ridingLevel: f.ridingLevel || null,
        dayLength: f.dayLength || null
      }
    };
  }

  // getCampSessionDetails(campSessionId)
  getCampSessionDetails(campSessionId) {
    const sessions = this._getFromStorage('camp_sessions', []);
    const s = sessions.find((x) => x.id === campSessionId) || null;
    if (!s) {
      return {
        campSession: null,
        dateRangeDisplay: '',
        startDayOfWeekLabel: '',
        ageGroupLabel: '',
        ridingLevelLabel: '',
        dayLengthLabel: '',
        priceDisplay: ''
      };
    }

    return {
      campSession: {
        id: s.id,
        name: s.name,
        description: s.description || '',
        startDate: s.startDate,
        endDate: s.endDate,
        startDayOfWeek: s.startDayOfWeek,
        ageGroupCode: s.ageGroupCode,
        ridingLevel: s.ridingLevel,
        dayLength: s.dayLength,
        price: s.price,
        isActive: s.isActive !== false
      },
      dateRangeDisplay: this._formatDateRange(s.startDate, s.endDate),
      startDayOfWeekLabel: this._getDayOfWeekLabel(s.startDayOfWeek),
      ageGroupLabel: this._getAgeGroupLabel(s.ageGroupCode),
      ridingLevelLabel: this._getRidingLevelLabel(s.ridingLevel),
      dayLengthLabel: this._getDayLengthLabel(s.dayLength),
      priceDisplay: typeof s.price === 'number' ? this._formatCurrency(s.price) : ''
    };
  }

  // submitCampPreRegistration(campSessionId, parentGuardianName, childAge, email, selectedCampSessionLabel)
  submitCampPreRegistration(
    campSessionId,
    parentGuardianName,
    childAge,
    email,
    selectedCampSessionLabel
  ) {
    const sessions = this._getFromStorage('camp_sessions', []);
    const s = sessions.find((x) => x.id === campSessionId) || null;
    const childAgeNum = typeof childAge === 'number' ? childAge : parseInt(childAge, 10);

    if (!s || !parentGuardianName || !email || !this._validateEmailFormat(email) || !childAgeNum) {
      return {
        success: false,
        preRegistrationId: null,
        campNameSnapshot: s ? s.name : '',
        submittedAt: null,
        confirmationMessage: 'Unable to submit camp pre-registration. Please check your input.'
      };
    }

    const list = this._getFromStorage('camp_pre_registration_submissions', []);
    const id = this._generateId('camp_pre_reg');
    const submittedAt = this._getCurrentTimestamp();

    const record = {
      id: id,
      campSessionId: campSessionId,
      campNameSnapshot: s.name,
      parentGuardianName: parentGuardianName,
      childAge: childAgeNum,
      email: email,
      selectedCampSessionLabel: selectedCampSessionLabel || s.name,
      submittedAt: submittedAt
    };

    list.push(record);
    this._saveToStorage('camp_pre_registration_submissions', list);

    return {
      success: true,
      preRegistrationId: id,
      campNameSnapshot: s.name,
      submittedAt: submittedAt,
      confirmationMessage: 'Your camp pre-registration has been submitted.'
    };
  }

  // getFacilityPackageFilterOptions()
  getFacilityPackageFilterOptions() {
    const facilityPackages = [
      { packageType: 'indoor_arena_only', label: 'Indoor arena only' },
      { packageType: 'indoor_arena_plus_party_room', label: 'Indoor arena + party room' },
      { packageType: 'outdoor_arena_only', label: 'Outdoor arena only' },
      { packageType: 'party_room_only', label: 'Party room only' },
      { packageType: 'outdoor_arena_plus_party_room', label: 'Outdoor arena + party room' },
      { packageType: 'entire_facility', label: 'Entire facility' },
      { packageType: 'other', label: 'Other' }
    ];

    const packages = this._getFromStorage('facility_packages', []);
    const prices = packages
      .filter((p) => typeof p.basePrice === 'number')
      .map((p) => p.basePrice);
    const priceMin = prices.length ? Math.min.apply(null, prices) : 0;
    const priceMax = prices.length ? Math.max.apply(null, prices) : 0;

    const timeSlotOptions = [
      { durationHours: 1, label: '1 hour' },
      { durationHours: 2, label: '2 hours' },
      { durationHours: 3, label: '3 hours' }
    ];

    const now = new Date();
    const minDate = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const maxDate = new Date(now.getFullYear(), now.getMonth() + 6, now.getDate()).toISOString();

    const datePickerConfig = {
      allowWeekendOnly: false,
      minDate: minDate,
      maxDate: maxDate
    };

    return {
      facilityPackages: facilityPackages,
      maxTotalCostRange: {
        min: priceMin,
        max: priceMax,
        step: 25
      },
      timeSlotOptions: timeSlotOptions,
      datePickerConfig: datePickerConfig
    };
  }

  _timeStringToHours(timeStr) {
    if (!timeStr || typeof timeStr !== 'string') return null;
    const parts = timeStr.split(':');
    if (parts.length < 2) return null;
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) || 0;
    if (isNaN(h) || isNaN(m)) return null;
    return h + m / 60;
  }

  // searchFacilityPackages(filters, page, pageSize)
  searchFacilityPackages(filters, page, pageSize) {
    const f = filters || {};
    let packages = this._getFromStorage('facility_packages', []);

    packages = packages.filter((p) => p && p.isActive !== false);

    if (f.packageType) {
      packages = packages.filter((p) => p.packageType === f.packageType);
    }
    if (typeof f.requireWeekendEligible === 'boolean' && f.requireWeekendEligible) {
      packages = packages.filter((p) => !!p.weekendEligible);
    }

    let requestedDurationHours = null;
    if (f.preferredStartTime && f.preferredEndTime) {
      const startH = this._timeStringToHours(f.preferredStartTime);
      const endH = this._timeStringToHours(f.preferredEndTime);
      if (startH !== null && endH !== null && endH > startH) {
        requestedDurationHours = endH - startH;
      }
    }

    if (typeof f.maxTotalCost === 'number') {
      packages = packages.filter((p) => {
        const base = typeof p.basePrice === 'number' ? p.basePrice : 0;
        const defaultDuration = typeof p.defaultDurationHours === 'number' ? p.defaultDurationHours : 1;
        const duration = requestedDurationHours || defaultDuration;
        const estimated = base * (duration / defaultDuration);
        return estimated <= f.maxTotalCost;
      });
    }

    const totalCount = packages.length;
    const pageItems = this._paginate(packages, page, pageSize);

    const results = pageItems.map((p) => {
      const base = typeof p.basePrice === 'number' ? p.basePrice : 0;
      const defaultDuration = typeof p.defaultDurationHours === 'number' ? p.defaultDurationHours : 1;
      const duration = requestedDurationHours || defaultDuration;
      const estimatedTotalPrice = base * (duration / defaultDuration);

      const packageTypeLabelMap = {
        indoor_arena_only: 'Indoor arena only',
        indoor_arena_plus_party_room: 'Indoor arena + party room',
        outdoor_arena_only: 'Outdoor arena only',
        party_room_only: 'Party room only',
        outdoor_arena_plus_party_room: 'Outdoor arena + party room',
        entire_facility: 'Entire facility',
        other: 'Other'
      };

      return {
        facilityPackageId: p.id,
        name: p.name,
        packageTypeLabel: packageTypeLabelMap[p.packageType] || '',
        includedSpacesDescription: p.includedSpacesDescription || '',
        defaultDurationHours: p.defaultDurationHours,
        basePrice: p.basePrice,
        estimatedTotalPrice: estimatedTotalPrice,
        priceDisplay: this._formatCurrency(estimatedTotalPrice),
        weekendEligible: !!p.weekendEligible,
        isAvailableForRequestedSlot: true
      };
    });

    return {
      results: results,
      totalCount: totalCount
    };
  }

  // getFacilityPackageDetails(facilityPackageId, requestedStartDateTime, requestedEndDateTime)
  getFacilityPackageDetails(facilityPackageId, requestedStartDateTime, requestedEndDateTime) {
    const packages = this._getFromStorage('facility_packages', []);
    const p = packages.find((x) => x.id === facilityPackageId) || null;
    if (!p) {
      return {
        facilityPackage: null,
        packageTypeLabel: '',
        basePriceDisplay: '',
        requestedStartDateTime: requestedStartDateTime || null,
        requestedEndDateTime: requestedEndDateTime || null,
        requestedSlotDisplay: ''
      };
    }

    const packageTypeLabelMap = {
      indoor_arena_only: 'Indoor arena only',
      indoor_arena_plus_party_room: 'Indoor arena + party room',
      outdoor_arena_only: 'Outdoor arena only',
      party_room_only: 'Party room only',
      outdoor_arena_plus_party_room: 'Outdoor arena + party room',
      entire_facility: 'Entire facility',
      other: 'Other'
    };

    const requestedSlotDisplay = requestedStartDateTime
      ? this._formatDateRange(requestedStartDateTime, requestedEndDateTime)
      : '';

    return {
      facilityPackage: {
        id: p.id,
        name: p.name,
        description: p.description || '',
        packageType: p.packageType,
        includedSpacesDescription: p.includedSpacesDescription || '',
        defaultDurationHours: p.defaultDurationHours,
        basePrice: p.basePrice,
        weekendEligible: !!p.weekendEligible,
        notes: p.notes || '',
        isActive: p.isActive !== false
      },
      packageTypeLabel: packageTypeLabelMap[p.packageType] || '',
      basePriceDisplay: this._formatCurrency(p.basePrice),
      requestedStartDateTime: requestedStartDateTime || null,
      requestedEndDateTime: requestedEndDateTime || null,
      requestedSlotDisplay: requestedSlotDisplay
    };
  }

  // submitFacilityBookingRequest(facilityPackageId, name, email, eventDescription, requestedStartDateTime, requestedEndDateTime)
  submitFacilityBookingRequest(
    facilityPackageId,
    name,
    email,
    eventDescription,
    requestedStartDateTime,
    requestedEndDateTime
  ) {
    const packages = this._getFromStorage('facility_packages', []);
    const p = packages.find((x) => x.id === facilityPackageId) || null;

    if (!p || !name || !email || !eventDescription || !this._validateEmailFormat(email)) {
      return {
        success: false,
        bookingRequestId: null,
        facilityPackageNameSnapshot: p ? p.name : '',
        submittedAt: null,
        confirmationMessage: 'Unable to submit facility booking request. Please check your input.'
      };
    }

    const list = this._getFromStorage('facility_booking_requests', []);
    const id = this._generateId('facility_booking');
    const submittedAt = this._getCurrentTimestamp();

    const record = {
      id: id,
      facilityPackageId: facilityPackageId,
      facilityPackageNameSnapshot: p.name,
      name: name,
      email: email,
      eventDescription: eventDescription,
      requestedStartDateTime: requestedStartDateTime,
      requestedEndDateTime: requestedEndDateTime,
      submittedAt: submittedAt
    };

    list.push(record);
    this._saveToStorage('facility_booking_requests', list);

    return {
      success: true,
      bookingRequestId: id,
      facilityPackageNameSnapshot: p.name,
      submittedAt: submittedAt,
      confirmationMessage: 'Your facility booking request has been submitted.'
    };
  }

  // getSafetyPageContent()
  getSafetyPageContent() {
    const stored = this._getFromStorage('safety_page_content', {});
    const content = stored && typeof stored === 'object' ? stored : {};

    return {
      generalGuidelines: content.generalGuidelines || '',
      barnRules: content.barnRules || '',
      ridingPolicies: content.ridingPolicies || '',
      riderGearSectionIntro: content.riderGearSectionIntro || ''
    };
  }

  // getSafetyGearItems()
  getSafetyGearItems() {
    const items = this._getFromStorage('safety_gear_items', []);
    return items
      .filter((g) => g && g.isActive !== false)
      .map((g) => {
        const requiredStatusLabelMap = {
          required: 'Required',
          recommended: 'Recommended',
          optional: 'Optional'
        };
        return {
          gearItemId: g.id,
          name: g.name,
          description: g.description || '',
          category: g.category,
          requiredStatus: g.requiredStatus,
          requiredStatusLabel: requiredStatusLabelMap[g.requiredStatus] || '',
          isActive: g.isActive !== false
        };
      });
  }

  // getContactFormsSummary()
  getContactFormsSummary() {
    const stored = this._getFromStorage('contact_forms_summary', {});
    if (Array.isArray(stored)) {
      return stored;
    }
    // Fallback minimal forms list
    return [
      {
        formKey: 'rider_safety_acknowledgment',
        title: 'Rider Safety Acknowledgment',
        description: 'Acknowledge and submit the required rider safety gear checklist.'
      },
      {
        formKey: 'general_contact',
        title: 'General Contact',
        description: 'Send us a general inquiry about the riding club.'
      }
    ];
  }

  // submitSafetyAcknowledgment(name, email, requiredGearChecklistText, hasConfirmedUnderstanding)
  submitSafetyAcknowledgment(name, email, requiredGearChecklistText, hasConfirmedUnderstanding) {
    if (!name || !email || !this._validateEmailFormat(email) || !requiredGearChecklistText) {
      return {
        success: false,
        acknowledgmentId: null,
        submittedAt: null,
        confirmationMessage: 'Unable to submit safety acknowledgment. Please check your input.'
      };
    }

    const list = this._getFromStorage('safety_acknowledgment_submissions', []);
    const id = this._generateId('safety_ack');
    const submittedAt = this._getCurrentTimestamp();

    const record = {
      id: id,
      name: name,
      email: email,
      requiredGearChecklistText: requiredGearChecklistText,
      hasConfirmedUnderstanding: !!hasConfirmedUnderstanding,
      submittedAt: submittedAt
    };

    list.push(record);
    this._saveToStorage('safety_acknowledgment_submissions', list);

    return {
      success: true,
      acknowledgmentId: id,
      submittedAt: submittedAt,
      confirmationMessage: 'Your rider safety acknowledgment has been submitted.'
    };
  }

  // submitGeneralContact(name, email, subject, message)
  submitGeneralContact(name, email, subject, message) {
    if (!name || !email || !subject || !message || !this._validateEmailFormat(email)) {
      return {
        success: false,
        submittedAt: null,
        confirmationMessage: 'Unable to submit contact form. Please check your input.'
      };
    }

    const list = this._getFromStorage('general_contact_submissions', []);
    const id = this._generateId('general_contact');
    const submittedAt = this._getCurrentTimestamp();

    const record = {
      id: id,
      name: name,
      email: email,
      subject: subject,
      message: message,
      submittedAt: submittedAt
    };

    list.push(record);
    this._saveToStorage('general_contact_submissions', list);

    return {
      success: true,
      submittedAt: submittedAt,
      confirmationMessage: 'Your message has been sent.'
    };
  }

  // getVolunteerFilterOptions()
  getVolunteerFilterOptions() {
    const roleTypes = [
      { value: 'horse_grooming_care', label: 'Horse grooming / care' },
      { value: 'barn_chores', label: 'Barn chores' },
      { value: 'event_staff', label: 'Event staff' },
      { value: 'office_admin', label: 'Office admin' },
      { value: 'lesson_sidewalker', label: 'Lesson sidewalker' },
      { value: 'other', label: 'Other' }
    ];

    const daysOfWeek = [
      { value: 'monday', label: 'Monday' },
      { value: 'tuesday', label: 'Tuesday' },
      { value: 'wednesday', label: 'Wednesday' },
      { value: 'thursday', label: 'Thursday' },
      { value: 'friday', label: 'Friday' },
      { value: 'saturday', label: 'Saturday' },
      { value: 'sunday', label: 'Sunday' }
    ];

    const timeOfDayOptions = [
      { value: 'morning', label: 'Morning' },
      { value: 'afternoon', label: 'Afternoon' },
      { value: 'evening', label: 'Evening' },
      { value: 'full_day', label: 'Full day' },
      { value: 'flexible', label: 'Flexible' }
    ];

    const shiftLengthOptionsHours = [1, 2, 3, 4, 6, 8];

    return {
      roleTypes: roleTypes,
      daysOfWeek: daysOfWeek,
      timeOfDayOptions: timeOfDayOptions,
      shiftLengthOptionsHours: shiftLengthOptionsHours
    };
  }

  // searchVolunteerOpportunities(filters, page, pageSize)
  searchVolunteerOpportunities(filters, page, pageSize) {
    const f = filters || {};
    let opps = this._getFromStorage('volunteer_opportunities', []);

    opps = opps.filter((o) => o && o.isActive !== false);

    if (f.roleType) {
      opps = opps.filter((o) => o.roleType === f.roleType);
    }
    if (Array.isArray(f.daysOfWeek) && f.daysOfWeek.length > 0) {
      opps = opps.filter((o) => f.daysOfWeek.indexOf(o.dayOfWeek) !== -1);
    }
    if (f.timeOfDay) {
      opps = opps.filter((o) => o.timeOfDay === f.timeOfDay);
    }
    if (typeof f.minShiftLengthHours === 'number') {
      opps = opps.filter((o) => (o.shiftLengthHours || 0) >= f.minShiftLengthHours);
    }

    const totalCount = opps.length;
    const pageItems = this._paginate(opps, page, pageSize);

    const results = pageItems.map((o) => ({
      volunteerOpportunityId: o.id,
      name: o.name,
      roleTypeLabel: (function () {
        const map = {
          horse_grooming_care: 'Horse grooming / care',
          barn_chores: 'Barn chores',
          event_staff: 'Event staff',
          office_admin: 'Office admin',
          lesson_sidewalker: 'Lesson sidewalker',
          other: 'Other'
        };
        return map[o.roleType] || '';
      })(),
      dayOfWeekLabel: this._getDayOfWeekLabel(o.dayOfWeek),
      timeOfDayLabel: (function () {
        const map = {
          morning: 'Morning',
          afternoon: 'Afternoon',
          evening: 'Evening',
          full_day: 'Full day',
          flexible: 'Flexible'
        };
        return map[o.timeOfDay] || '';
      })(),
      startDateTime: o.startDateTime,
      endDateTime: o.endDateTime,
      shiftLengthHours: o.shiftLengthHours,
      isWeekday: !!o.isWeekday,
      isActive: o.isActive !== false
    }));

    return {
      results: results,
      totalCount: totalCount,
      appliedFilters: {
        roleType: f.roleType || null,
        daysOfWeek: Array.isArray(f.daysOfWeek) ? f.daysOfWeek.slice() : [],
        timeOfDay: f.timeOfDay || null,
        minShiftLengthHours:
          typeof f.minShiftLengthHours === 'number' ? f.minShiftLengthHours : null
      }
    };
  }

  // getVolunteerOpportunityDetails(volunteerOpportunityId)
  getVolunteerOpportunityDetails(volunteerOpportunityId) {
    const opps = this._getFromStorage('volunteer_opportunities', []);
    const o = opps.find((x) => x.id === volunteerOpportunityId) || null;
    if (!o) {
      return {
        volunteerOpportunity: null,
        roleTypeLabel: '',
        dayOfWeekLabel: '',
        timeOfDayLabel: '',
        dateTimeDisplay: ''
      };
    }

    const roleTypeLabelMap = {
      horse_grooming_care: 'Horse grooming / care',
      barn_chores: 'Barn chores',
      event_staff: 'Event staff',
      office_admin: 'Office admin',
      lesson_sidewalker: 'Lesson sidewalker',
      other: 'Other'
    };

    const timeOfDayLabelMap = {
      morning: 'Morning',
      afternoon: 'Afternoon',
      evening: 'Evening',
      full_day: 'Full day',
      flexible: 'Flexible'
    };

    const dateTimeDisplay = this._formatDateRange(o.startDateTime, o.endDateTime);

    return {
      volunteerOpportunity: {
        id: o.id,
        name: o.name,
        description: o.description || '',
        roleType: o.roleType,
        dayOfWeek: o.dayOfWeek,
        timeOfDay: o.timeOfDay,
        startDateTime: o.startDateTime,
        endDateTime: o.endDateTime,
        shiftLengthHours: o.shiftLengthHours,
        isWeekday: !!o.isWeekday,
        isActive: o.isActive !== false
      },
      roleTypeLabel: roleTypeLabelMap[o.roleType] || '',
      dayOfWeekLabel: this._getDayOfWeekLabel(o.dayOfWeek),
      timeOfDayLabel: timeOfDayLabelMap[o.timeOfDay] || '',
      dateTimeDisplay: dateTimeDisplay
    };
  }

  // submitVolunteerSignup(volunteerOpportunityId, name, email)
  submitVolunteerSignup(volunteerOpportunityId, name, email) {
    const opps = this._getFromStorage('volunteer_opportunities', []);
    const o = opps.find((x) => x.id === volunteerOpportunityId) || null;

    if (!o || !name || !email || !this._validateEmailFormat(email)) {
      return {
        success: false,
        signupId: null,
        volunteerOpportunityNameSnapshot: o ? o.name : '',
        submittedAt: null,
        confirmationMessage: 'Unable to submit volunteer signup. Please check your input.'
      };
    }

    const list = this._getFromStorage('volunteer_signup_submissions', []);
    const id = this._generateId('volunteer_signup');
    const submittedAt = this._getCurrentTimestamp();

    const record = {
      id: id,
      volunteerOpportunityId: volunteerOpportunityId,
      volunteerOpportunityNameSnapshot: o.name,
      name: name,
      email: email,
      submittedAt: submittedAt
    };

    list.push(record);
    this._saveToStorage('volunteer_signup_submissions', list);

    return {
      success: true,
      signupId: id,
      volunteerOpportunityNameSnapshot: o.name,
      submittedAt: submittedAt,
      confirmationMessage: 'Your volunteer signup has been submitted.'
    };
  }

  // getAboutPageContent()
  getAboutPageContent() {
    const stored = this._getFromStorage('about_page_content', {});
    let content = stored && typeof stored === 'object' ? stored : {};

    // If no staffProfiles provided, derive from active instructors
    let staffProfiles = Array.isArray(content.staffProfiles) ? content.staffProfiles : null;
    if (!staffProfiles) {
      const instructors = this._getFromStorage('instructors', []);
      staffProfiles = instructors
        .filter((i) => i && i.isActive !== false)
        .map((i) => ({
          name: i.name,
          role: 'Instructor',
          bio: i.bio || '',
          photoUrl: i.photoUrl || '',
          isInstructor: true,
          instructorPrimaryDiscipline: i.primaryDiscipline || null,
          instructorRating: i.rating,
          instructorYearsExperience: i.yearsExperience
        }));
    }

    return {
      history: content.history || '',
      mission: content.mission || '',
      values: content.values || '',
      staffProfiles: staffProfiles
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
