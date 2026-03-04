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
    this.idCounter = this._getNextIdCounter(); // not strictly needed but kept from template
  }

  // ------------------------
  // Storage helpers
  // ------------------------
  _initStorage() {
    // Ensure id counter exists
    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }

    const ensureArray = (key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, '[]');
      } else {
        // if not valid JSON, reset to []
        try {
          JSON.parse(localStorage.getItem(key));
        } catch (e) {
          localStorage.setItem(key, '[]');
        }
      }
    };

    // Core tables from data models
    ensureArray('school_tours');
    ensureArray('tour_registrations');

    ensureArray('after_school_clubs');
    ensureArray('saved_clubs');

    ensureArray('menu_weeks');
    ensureArray('lunch_menu_items');
    ensureArray('weekly_meal_plans');
    ensureArray('meal_plan_items');

    ensureArray('staff_members');
    ensureArray('teacher_contact_messages');

    ensureArray('bus_routes');
    ensureArray('bus_stops');
    ensureArray('transportation_inquiries');

    ensureArray('events');
    ensureArray('saved_events');

    ensureArray('policy_documents');
    ensureArray('saved_documents');

    ensureArray('newsletter_subscriptions');

    ensureArray('enrollment_checklist_configs');
    ensureArray('enrollment_requirements');
    ensureArray('enrollment_checklist_items');
    ensureArray('saved_enrollment_forms');
    ensureArray('print_preparation_batches');

    // Legacy/example tables from template (kept but unused)
    ensureArray('users');
    ensureArray('products');
    ensureArray('carts');
    ensureArray('cartItems');
  }

  _getFromStorage(key, defaultValue) {
    const data = localStorage.getItem(key);
    if (!data) {
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

  _ensureSavedListInitialized() {
    const keys = [
      'saved_clubs',
      'saved_events',
      'saved_documents',
      'saved_enrollment_forms'
    ];
    keys.forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, '[]');
      } else {
        try {
          JSON.parse(localStorage.getItem(key));
        } catch (e) {
          localStorage.setItem(key, '[]');
        }
      }
    });
  }

  // ------------------------
  // Generic helpers
  // ------------------------
  _safeParseDate(dateStr) {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;
    return d;
  }

  _normalizeTimeString(timeStr) {
    if (!timeStr) return null;
    let s = String(timeStr).trim();
    if (!s) return null;

    // Handle ISO datetime: extract time part
    const isoMatch = s.match(/T(\d{2}:\d{2})(?::\d{2})?/);
    if (isoMatch) {
      s = isoMatch[1];
    }

    // 12-hour with AM/PM
    const ampmMatch = s.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/i);
    if (ampmMatch) {
      let h = parseInt(ampmMatch[1], 10);
      let m = parseInt(ampmMatch[2] || '0', 10);
      const mer = ampmMatch[3].toUpperCase();
      if (mer === 'PM' && h < 12) h += 12;
      if (mer === 'AM' && h === 12) h = 0;
      return this._pad2(h) + ':' + this._pad2(m);
    }

    // 24-hour HH:MM
    const hhmmMatch = s.match(/^(\d{1,2}):(\d{2})$/);
    if (hhmmMatch) {
      let h = parseInt(hhmmMatch[1], 10);
      let m = parseInt(hhmmMatch[2], 10);
      if (h >= 0 && h < 24 && m >= 0 && m < 60) {
        return this._pad2(h) + ':' + this._pad2(m);
      }
    }

    // 4-digit 24h e.g. 1530
    const hhmminteger = s.match(/^(\d{1,2})(\d{2})$/);
    if (hhmminteger) {
      let h = parseInt(hhmminteger[1], 10);
      let m = parseInt(hhmminteger[2], 10);
      if (h >= 0 && h < 24 && m >= 0 && m < 60) {
        return this._pad2(h) + ':' + this._pad2(m);
      }
    }

    return null; // unknown format
  }

  _pad2(num) {
    return num.toString().padStart(2, '0');
  }

  _gradeCodeToLabel(gradeCode) {
    if (!gradeCode) return '';
    const map = {
      pre_k: 'Pre-K',
      kindergarten: 'Kindergarten',
      grade_1: 'Grade 1',
      grade_2: 'Grade 2',
      grade_3: 'Grade 3',
      grade_4: 'Grade 4',
      grade_5: 'Grade 5',
      grade_6: 'Grade 6'
    };
    return map[gradeCode] || gradeCode;
  }

  _studentTypeToLabel(studentType) {
    if (!studentType) return '';
    const map = {
      new_student: 'New Student',
      returning_student: 'Returning Student',
      transfer_student: 'Transfer Student',
      other: 'Other'
    };
    return map[studentType] || studentType;
  }

  _capitalize(word) {
    if (!word) return '';
    return word.charAt(0).toUpperCase() + word.slice(1);
  }

  _dayOfWeekLabel(day) {
    const map = {
      monday: 'Monday',
      tuesday: 'Tuesday',
      wednesday: 'Wednesday',
      thursday: 'Thursday',
      friday: 'Friday',
      saturday: 'Saturday',
      sunday: 'Sunday'
    };
    return map[day] || day;
  }

  _formatCurrency(amount, currency) {
    if (typeof amount !== 'number') return '';
    const cur = currency || 'USD';
    // Simple formatter to avoid Intl dependency issues
    const rounded = amount.toFixed(2);
    const symbol = cur === 'USD' ? '$' : '';
    return symbol + rounded.replace(/\.00$/, '') + '/month';
  }

  _extractTimeFromDateTime(dtStr) {
    if (!dtStr) return null;
    const d = this._safeParseDate(dtStr);
    if (d) {
      return this._pad2(d.getHours()) + ':' + this._pad2(d.getMinutes());
    }
    // Fallback: look for HH:MM pattern in string
    const match = String(dtStr).match(/(\d{1,2}:\d{2})/);
    if (match) {
      return this._normalizeTimeString(match[1]);
    }
    return null;
  }

  _getOrCreateWeeklyMealPlan(weekId) {
    let plans = this._getFromStorage('weekly_meal_plans');
    let plan = plans.find((p) => p.week_id === weekId);
    if (!plan) {
      plan = {
        id: this._generateId('mealplan'),
        week_id: weekId,
        created_at: new Date().toISOString(),
        notes: ''
      };
      plans.push(plan);
      this._saveToStorage('weekly_meal_plans', plans);
    }
    return plan;
  }

  _getLatestEnrollmentChecklistConfig() {
    const configs = this._getFromStorage('enrollment_checklist_configs');
    if (!configs.length) return null;
    // Latest by created_at
    let latest = configs[0];
    let latestDate = this._safeParseDate(latest.created_at) || new Date(0);
    for (let i = 1; i < configs.length; i++) {
      const c = configs[i];
      const d = this._safeParseDate(c.created_at) || new Date(0);
      if (d > latestDate) {
        latest = c;
        latestDate = d;
      }
    }
    return latest;
  }

  // ------------------------
  // Homepage / Overview
  // ------------------------

  getHomepageSummary() {
    // All content must come from localStorage; if absent, return empty structure
    const stored = this._getFromStorage('homepage_summary', null);
    if (stored && typeof stored === 'object' && !Array.isArray(stored)) {
      return {
        mainSections: stored.mainSections || [],
        quickActions: stored.quickActions || [],
        announcements: stored.announcements || []
      };
    }
    return {
      mainSections: [],
      quickActions: [],
      announcements: []
    };
  }

  getSchoolOverviewInfo() {
    const stored = this._getFromStorage('school_overview_info', null);
    if (stored && typeof stored === 'object' && !Array.isArray(stored)) {
      return {
        mission: stored.mission || '',
        values: stored.values || '',
        address: stored.address || '',
        schoolHours: stored.schoolHours || '',
        gradesServed: stored.gradesServed || '',
        mainOfficePhone: stored.mainOfficePhone || '',
        mainOfficeEmail: stored.mainOfficeEmail || '',
        mapEmbedCode: stored.mapEmbedCode || '',
        highlightedSections: stored.highlightedSections || []
      };
    }
    return {
      mission: '',
      values: '',
      address: '',
      schoolHours: '',
      gradesServed: '',
      mainOfficePhone: '',
      mainOfficeEmail: '',
      mapEmbedCode: '',
      highlightedSections: []
    };
  }

  // ------------------------
  // School Tours (Admissions)
  // ------------------------

  getSchoolTourFilterOptions() {
    const tours = this._getFromStorage('school_tours');

    // Months from existing tours
    const monthMap = {};
    tours.forEach((t) => {
      const d = this._safeParseDate(t.start_datetime);
      if (!d) return;
      const month = d.getMonth() + 1;
      const year = d.getFullYear();
      const key = year + '-' + month;
      if (!monthMap[key]) {
        const label = d.toLocaleString(undefined, { month: 'long', year: 'numeric' });
        monthMap[key] = { month, year, label };
      }
    });
    const months = Object.values(monthMap).sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.month - b.month;
    });

    const dayOfWeekOptions = [
      { value: 'any', label: 'Any Day' },
      { value: 'weekdays', label: 'Weekdays (Mon–Fri)' },
      { value: 'monday', label: 'Monday' },
      { value: 'tuesday', label: 'Tuesday' },
      { value: 'wednesday', label: 'Wednesday' },
      { value: 'thursday', label: 'Thursday' },
      { value: 'friday', label: 'Friday' }
    ];

    // Start time options derived from tours, plus a few common entries
    const timeSet = new Set();
    tours.forEach((t) => {
      const time = this._extractTimeFromDateTime(t.start_datetime);
      if (time) timeSet.add(time);
    });
    const times = Array.from(timeSet).sort();
    const startTimeOptions = times.map((time) => {
      return { value: time, label: time + ' or later' };
    });

    // Ensure at least a 3:00 PM or later option exists
    const threePm = '15:00';
    if (!startTimeOptions.some((o) => o.value === threePm)) {
      startTimeOptions.push({ value: threePm, label: '3:00 PM or later' });
      startTimeOptions.sort((a, b) => a.value.localeCompare(b.value));
    }

    return { months, dayOfWeekOptions, startTimeOptions };
  }

  listSchoolTours(filters, sortBy) {
    filters = filters || {};
    sortBy = sortBy || 'date_earliest_first';

    let tours = this._getFromStorage('school_tours');

    tours = tours.filter((t) => {
      const d = this._safeParseDate(t.start_datetime);
      if (!d) return false;

      if (filters.month && filters.year) {
        if (d.getMonth() + 1 !== filters.month || d.getFullYear() !== filters.year) {
          return false;
        }
      }

      if (filters.dayOfWeekFilter && filters.dayOfWeekFilter !== 'any') {
        if (filters.dayOfWeekFilter === 'weekdays') {
          if (!t.is_weekday) return false;
        } else {
          if (t.day_of_week !== filters.dayOfWeekFilter) return false;
        }
      }

      if (filters.minStartTime) {
        const minTime = this._normalizeTimeString(filters.minStartTime);
        const tourTime = this._extractTimeFromDateTime(t.start_datetime);
        if (minTime && tourTime && tourTime < minTime) {
          return false;
        }
      }

      if (filters.onlyWithSpotsRemaining) {
        const hasSpots = (typeof t.spots_remaining !== 'number') || t.spots_remaining > 0;
        if (!(t.status === 'scheduled' && hasSpots)) return false;
      }

      return true;
    });

    tours.sort((a, b) => {
      const da = this._safeParseDate(a.start_datetime) || new Date(0);
      const db = this._safeParseDate(b.start_datetime) || new Date(0);
      if (sortBy === 'date_latest_first') {
        return db - da;
      }
      if (sortBy === 'time_earliest_first') {
        const ta = this._extractTimeFromDateTime(a.start_datetime) || '00:00';
        const tb = this._extractTimeFromDateTime(b.start_datetime) || '00:00';
        if (ta === tb) return da - db;
        return ta.localeCompare(tb);
      }
      // default date_earliest_first
      return da - db;
    });

    return tours;
  }

  registerForSchoolTour(tourId, parentName, parentEmail, childExpectedGrade, numberOfAttendees) {
    const tours = this._getFromStorage('school_tours');
    const registrations = this._getFromStorage('tour_registrations');

    const tour = tours.find((t) => t.id === tourId);
    if (!tour) {
      return {
        registrationId: null,
        status: 'failed',
        confirmationCode: null,
        message: 'Selected tour not found.'
      };
    }

    // Only block registration if tour status explicitly indicates it's unavailable
    if (tour.status && ['cancelled', 'canceled', 'unavailable'].includes(tour.status)) {
      return {
        registrationId: null,
        status: 'failed',
        confirmationCode: null,
        message: 'This tour is not available for registration.'
      };
    }

    if (typeof tour.spots_remaining === 'number' && tour.spots_remaining <= 0) {
      return {
        registrationId: null,
        status: 'failed',
        confirmationCode: null,
        message: 'This tour is full.'
      };
    }

    const regId = this._generateId('tourreg');
    const confirmationCode = 'TR-' + regId.split('_')[1];

    const registration = {
      id: regId,
      tour_id: tourId,
      parent_name: parentName,
      parent_email: parentEmail,
      child_expected_grade: childExpectedGrade,
      number_of_attendees: Number(numberOfAttendees) || 1,
      submitted_at: new Date().toISOString(),
      confirmation_code: confirmationCode,
      status: 'submitted'
    };

    registrations.push(registration);

    // Decrement spots_remaining if numeric
    const tourIndex = tours.findIndex((t) => t.id === tourId);
    if (tourIndex !== -1 && typeof tours[tourIndex].spots_remaining === 'number') {
      tours[tourIndex].spots_remaining = Math.max(
        0,
        tours[tourIndex].spots_remaining - registration.number_of_attendees
      );
    }

    this._saveToStorage('tour_registrations', registrations);
    this._saveToStorage('school_tours', tours);

    return {
      registrationId: regId,
      status: registration.status,
      confirmationCode,
      message: 'Your tour registration has been submitted.'
    };
  }

  // ------------------------
  // After-School Clubs
  // ------------------------

  getAfterSchoolClubFilterOptions() {
    const clubs = this._getFromStorage('after_school_clubs');

    const gradeSet = new Set();
    const daySet = new Set();
    let minFee = null;
    let maxFee = null;

    clubs.forEach((c) => {
      if (Array.isArray(c.grade_levels)) {
        c.grade_levels.forEach((g) => gradeSet.add(g));
      }
      if (Array.isArray(c.meeting_days)) {
        c.meeting_days.forEach((d) => daySet.add(d));
      }
      if (typeof c.monthly_fee === 'number') {
        if (minFee === null || c.monthly_fee < minFee) minFee = c.monthly_fee;
        if (maxFee === null || c.monthly_fee > maxFee) maxFee = c.monthly_fee;
      }
    });

    const gradeLevels = Array.from(gradeSet).sort().map((g) => ({
      value: g,
      label: this._gradeCodeToLabel(g)
    }));

    const meetingDays = Array.from(daySet).sort().map((d) => ({
      value: d,
      label: this._dayOfWeekLabel(d)
    }));

    return {
      gradeLevels,
      meetingDays,
      feeRange: {
        minFee: minFee !== null ? minFee : 0,
        maxFee: maxFee !== null ? maxFee : 0,
        currency: 'USD'
      }
    };
  }

  listAfterSchoolClubs(filters, sortBy) {
    filters = filters || {};
    sortBy = sortBy || 'end_time_earliest_first';

    let clubs = this._getFromStorage('after_school_clubs');

    clubs = clubs.filter((c) => {
      if (filters.gradeLevel) {
        if (!Array.isArray(c.grade_levels) || !c.grade_levels.includes(filters.gradeLevel)) {
          return false;
        }
      }

      if (filters.meetingDay) {
        if (!Array.isArray(c.meeting_days) || !c.meeting_days.includes(filters.meetingDay)) {
          return false;
        }
      }

      if (typeof filters.maxMonthlyFee === 'number') {
        if (typeof c.monthly_fee !== 'number' || c.monthly_fee > filters.maxMonthlyFee) {
          return false;
        }
      }

      if (filters.category) {
        if (c.category !== filters.category) return false;
      }

      if (filters.onlyActive) {
        if (c.status !== 'active') return false;
      }

      if (filters.excludeFull) {
        if (c.is_full) return false;
      }

      return true;
    });

    clubs.sort((a, b) => {
      if (sortBy === 'name_a_to_z') {
        return (a.name || '').localeCompare(b.name || '');
      }
      // default: end_time_earliest_first
      const ta = this._normalizeTimeString(a.end_time) || '00:00';
      const tb = this._normalizeTimeString(b.end_time) || '00:00';
      if (ta === tb) {
        return (a.name || '').localeCompare(b.name || '');
      }
      return ta.localeCompare(tb);
    });

    return clubs;
  }

  getAfterSchoolClubDetails(clubId) {
    const clubs = this._getFromStorage('after_school_clubs');
    const club = clubs.find((c) => c.id === clubId) || null;
    if (!club) {
      return {
        club: null,
        scheduleSummary: '',
        feeDisplay: '',
        isSavedToMyClubs: false
      };
    }

    const daysLabel = Array.isArray(club.meeting_days)
      ? club.meeting_days.map((d) => this._dayOfWeekLabel(d)).join(', ')
      : '';
    const start = club.start_time || '';
    const end = club.end_time || '';
    const scheduleSummary = daysLabel
      ? daysLabel + (start || end ? ', ' : '') + [start, end].filter(Boolean).join(' – ')
      : [start, end].filter(Boolean).join(' – ');

    const feeDisplay = this._formatCurrency(club.monthly_fee, 'USD');

    const savedClubs = this._getFromStorage('saved_clubs');
    const isSavedToMyClubs = !!savedClubs.find((s) => s.club_id === clubId);

    return {
      club,
      scheduleSummary,
      feeDisplay,
      isSavedToMyClubs
    };
  }

  saveClubToMyClubs(clubId, markAsFavorite) {
    this._ensureSavedListInitialized();
    const clubs = this._getFromStorage('after_school_clubs');
    const club = clubs.find((c) => c.id === clubId);
    if (!club) {
      return {
        savedClubId: null,
        isNew: false,
        message: 'Club not found.'
      };
    }

    let savedClubs = this._getFromStorage('saved_clubs');
    let existing = savedClubs.find((s) => s.club_id === clubId);

    if (existing) {
      if (typeof markAsFavorite === 'boolean') {
        existing.is_favorite = markAsFavorite;
        this._saveToStorage('saved_clubs', savedClubs);
      }
      return {
        savedClubId: existing.id,
        isNew: false,
        message: 'Club is already saved.'
      };
    }

    const id = this._generateId('savedclub');
    const saved = {
      id,
      club_id: clubId,
      saved_at: new Date().toISOString(),
      notes: '',
      is_favorite: !!markAsFavorite
    };
    savedClubs.push(saved);
    this._saveToStorage('saved_clubs', savedClubs);

    return {
      savedClubId: id,
      isNew: true,
      message: 'Club saved to My Clubs.'
    };
  }

  getMySavedClubs() {
    this._ensureSavedListInitialized();
    const savedClubs = this._getFromStorage('saved_clubs');
    const clubs = this._getFromStorage('after_school_clubs');
    return savedClubs.map((item) => ({
      ...item,
      club: clubs.find((c) => c.id === item.club_id) || null
    }));
  }

  // ------------------------
  // Lunch Menu & Weekly Meal Plan
  // ------------------------

  getMenuWeeks() {
    return this._getFromStorage('menu_weeks');
  }

  listLunchMenuItemsForWeek(weekId, filters, sortBy) {
    filters = filters || {};
    sortBy = sortBy || 'calories_lowest_first';

    let items = this._getFromStorage('lunch_menu_items');
    items = items.filter((i) => i.week_id === weekId);

    items = items.filter((i) => {
      if (filters.dietaryTags && filters.dietaryTags.length) {
        if (!Array.isArray(i.dietary_tags)) return false;
        const allMatch = filters.dietaryTags.every((tag) => i.dietary_tags.includes(tag));
        if (!allMatch) return false;
      }

      if (filters.mealTypes && filters.mealTypes.length) {
        if (!filters.mealTypes.includes(i.meal_type)) return false;
      }

      if (typeof filters.maxCalories === 'number') {
        if (typeof i.calories !== 'number' || i.calories > filters.maxCalories) return false;
      }

      return true;
    });

    items.sort((a, b) => {
      if (sortBy === 'name_a_to_z') {
        return (a.name || '').localeCompare(b.name || '');
      }
      // default: calories_lowest_first
      const ca = typeof a.calories === 'number' ? a.calories : Number.MAX_SAFE_INTEGER;
      const cb = typeof b.calories === 'number' ? b.calories : Number.MAX_SAFE_INTEGER;
      if (ca === cb) {
        return (a.name || '').localeCompare(b.name || '');
      }
      return ca - cb;
    });

    return items;
  }

  addMenuItemToWeeklyPlan(weekId, menuItemId, dayOfWeek) {
    const items = this._getFromStorage('lunch_menu_items');
    const menuItem = items.find((i) => i.id === menuItemId);
    if (!menuItem) {
      return {
        mealPlanItemId: null,
        weekId,
        message: 'Menu item not found.'
      };
    }

    const plan = this._getOrCreateWeeklyMealPlan(weekId);
    const mealPlanItems = this._getFromStorage('meal_plan_items');

    const dow = dayOfWeek || menuItem.day_of_week;

    const id = this._generateId('mealplanitem');
    const mpi = {
      id,
      meal_plan_id: plan.id,
      menu_item_id: menuItemId,
      day_of_week: dow,
      added_at: new Date().toISOString()
    };

    mealPlanItems.push(mpi);
    this._saveToStorage('meal_plan_items', mealPlanItems);

    return {
      mealPlanItemId: id,
      weekId,
      message: 'Menu item added to weekly plan.'
    };
  }

  getWeeklyMealPlan(weekId) {
    const weeks = this._getFromStorage('menu_weeks');
    const week = weeks.find((w) => w.id === weekId) || null;

    const plans = this._getFromStorage('weekly_meal_plans');
    const plan = plans.find((p) => p.week_id === weekId) || null;

    const items = this._getFromStorage('meal_plan_items');
    const menuItems = this._getFromStorage('lunch_menu_items');

    const byDay = {
      monday: [],
      tuesday: [],
      wednesday: [],
      thursday: [],
      friday: []
    };

    if (plan) {
      items
        .filter((i) => i.meal_plan_id === plan.id)
        .forEach((i) => {
          const mi = menuItems.find((m) => m.id === i.menu_item_id) || null;
          const entry = {
            mealPlanItemId: i.id,
            menuItemId: i.menu_item_id,
            menuItemName: mi ? mi.name : '',
            calories: mi && typeof mi.calories === 'number' ? mi.calories : null,
            dietaryTags: mi && Array.isArray(mi.dietary_tags) ? mi.dietary_tags : []
          };
          const dow = i.day_of_week;
          if (byDay[dow]) {
            byDay[dow].push(entry);
          }
        });
    }

    return {
      week: week
        ? {
            id: week.id,
            week_start_date: week.week_start_date,
            week_end_date: week.week_end_date,
            label: week.label,
            is_current_week: !!week.is_current_week
          }
        : null,
      plan: plan
        ? {
            mealPlanId: plan.id,
            created_at: plan.created_at,
            notes: plan.notes || ''
          }
        : null,
      itemsByDay: byDay
    };
  }

  removeMealFromWeeklyPlan(mealPlanItemId) {
    let items = this._getFromStorage('meal_plan_items');
    const idx = items.findIndex((i) => i.id === mealPlanItemId);
    if (idx === -1) {
      return {
        success: false,
        message: 'Meal plan item not found.'
      };
    }
    items.splice(idx, 1);
    this._saveToStorage('meal_plan_items', items);
    return {
      success: true,
      message: 'Meal removed from weekly plan.'
    };
  }

  prepareWeeklyMealPlanForDownload(weekId, format) {
    format = format || 'pdf';
    const exportId = this._generateId('mealplan_export');
    // We only simulate export; no heavy data stored
    return {
      exportId,
      format,
      message: 'Weekly meal plan prepared for download as ' + format + '.'
    };
  }

  // ------------------------
  // Staff Directory & Teacher Contact
  // ------------------------

  getStaffFilterOptions() {
    const staff = this._getFromStorage('staff_members');

    const gradeSet = new Set();
    const subjectSet = new Set();

    staff.forEach((s) => {
      if (Array.isArray(s.grade_levels)) {
        s.grade_levels.forEach((g) => gradeSet.add(g));
      }
      if (Array.isArray(s.subjects)) {
        s.subjects.forEach((sub) => subjectSet.add(sub));
      }
    });

    const gradeLevels = Array.from(gradeSet).sort().map((g) => ({
      value: g,
      label: this._gradeCodeToLabel(g)
    }));

    const subjects = Array.from(subjectSet).sort().map((sub) => ({
      value: sub,
      label: this._capitalize(sub)
    }));

    return { gradeLevels, subjects };
  }

  listStaffMembers(filters) {
    filters = filters || {};
    let staff = this._getFromStorage('staff_members');

    staff = staff.filter((s) => {
      if (filters.gradeLevel) {
        if (!Array.isArray(s.grade_levels) || !s.grade_levels.includes(filters.gradeLevel)) {
          return false;
        }
      }

      if (filters.subject) {
        if (!Array.isArray(s.subjects) || !s.subjects.includes(filters.subject)) {
          return false;
        }
      }

      if (filters.onlyActive) {
        if (s.status !== 'active') return false;
      }

      if (filters.onlyTeachers) {
        if (!s.is_teacher) return false;
      }

      return true;
    });

    return staff;
  }

  getStaffProfile(staffId) {
    const staff = this._getFromStorage('staff_members');
    const s = staff.find((m) => m.id === staffId) || null;
    return { staff: s };
  }

  sendTeacherContactMessage(staffId, parentName, parentEmail, subject, messageBody) {
    const staff = this._getFromStorage('staff_members');
    const teacher = staff.find((s) => s.id === staffId);
    if (!teacher) {
      return {
        messageId: null,
        status: 'failed',
        confirmationText: 'Teacher not found.'
      };
    }

    const messages = this._getFromStorage('teacher_contact_messages');
    const id = this._generateId('teachmsg');

    const msg = {
      id,
      staff_id: staffId,
      parent_name: parentName,
      parent_email: parentEmail,
      subject,
      message_body: messageBody,
      sent_at: new Date().toISOString(),
      status: 'submitted'
    };

    messages.push(msg);
    this._saveToStorage('teacher_contact_messages', messages);

    return {
      messageId: id,
      status: 'submitted',
      confirmationText: 'Your message has been sent to ' + (teacher.name || 'the teacher') + '.'
    };
  }

  // ------------------------
  // Transportation & Bus Routes
  // ------------------------

  getTransportationOverview() {
    const stored = this._getFromStorage('transportation_overview', null);
    if (stored && typeof stored === 'object' && !Array.isArray(stored)) {
      return {
        overviewText: stored.overviewText || '',
        contactPhone: stored.contactPhone || '',
        contactEmail: stored.contactEmail || '',
        officeHours: stored.officeHours || ''
      };
    }
    return {
      overviewText: '',
      contactPhone: '',
      contactEmail: '',
      officeHours: ''
    };
  }

  listBusRoutes(filters, sortBy) {
    filters = filters || {};
    sortBy = sortBy || 'arrival_time_earliest_first';

    let routes = this._getFromStorage('bus_routes');
    const stops = this._getFromStorage('bus_stops');

    if (filters.stopNameQuery) {
      const q = filters.stopNameQuery.toLowerCase();
      const routeIdSet = new Set();
      stops.forEach((s) => {
        if (s.name && s.name.toLowerCase().includes(q)) {
          routeIdSet.add(s.route_id);
        }
      });
      routes = routes.filter((r) => routeIdSet.has(r.id));
    }

    routes = routes.filter((r) => {
      if (filters.isMorningRoute === true) {
        if (!r.is_morning_route) return false;
      }
      if (filters.isAfternoonRoute === true) {
        if (!r.is_afternoon_route) return false;
      }
      if (filters.onlyActive) {
        if (r.status !== 'active') return false;
      }
      return true;
    });

    if (sortBy === 'arrival_time_earliest_first') {
      routes.sort((a, b) => {
        const ta = this._normalizeTimeString(a.arrival_time_school) || '00:00';
        const tb = this._normalizeTimeString(b.arrival_time_school) || '00:00';
        if (ta === tb) return (a.route_number || '').localeCompare(b.route_number || '');
        return ta.localeCompare(tb);
      });
    }

    return routes;
  }

  getBusRouteDetails(routeId) {
    const routes = this._getFromStorage('bus_routes');
    const route = routes.find((r) => r.id === routeId) || null;
    const stops = this._getFromStorage('bus_stops').filter((s) => s.route_id === routeId);

    // Foreign key resolution for stops: include route object on each for convenience
    const stopsWithRoute = stops.map((s) => ({
      ...s,
      route
    }));

    return {
      route,
      stops: stopsWithRoute
    };
  }

  submitTransportationInquiry(routeId, routeNumber, parentName, parentEmail, reason, message) {
    const routes = this._getFromStorage('bus_routes');
    const route = routes.find((r) => r.id === routeId);
    if (!route) {
      return {
        inquiryId: null,
        status: 'failed',
        confirmationText: 'Bus route not found.'
      };
    }

    const inquiries = this._getFromStorage('transportation_inquiries');
    const id = this._generateId('businq');

    const inquiry = {
      id,
      route_id: routeId,
      route_number: routeNumber,
      parent_name: parentName,
      parent_email: parentEmail,
      reason,
      message,
      submitted_at: new Date().toISOString(),
      status: 'submitted'
    };

    inquiries.push(inquiry);
    this._saveToStorage('transportation_inquiries', inquiries);

    return {
      inquiryId: id,
      status: 'submitted',
      confirmationText: 'Your transportation inquiry has been submitted.'
    };
  }

  // ------------------------
  // Events & My Calendar
  // ------------------------

  listEvents(filters, sortBy) {
    filters = filters || {};
    sortBy = sortBy || 'date_earliest_first';

    let events = this._getFromStorage('events');

    events = events.filter((e) => {
      const d = this._safeParseDate(e.start_datetime);
      if (!d) return false;

      if (filters.startDate) {
        const start = this._safeParseDate(filters.startDate);
        if (start && d < start) return false;
      }

      if (filters.endDate) {
        const end = this._safeParseDate(filters.endDate);
        if (end && d > end) return false;
      }

      if (filters.category) {
        if (e.category !== filters.category) return false;
      }

      if (filters.minStartTime) {
        const minTime = this._normalizeTimeString(filters.minStartTime);
        const eventTime = this._extractTimeFromDateTime(e.start_datetime);
        if (minTime && eventTime && eventTime < minTime) return false;
      }

      if (filters.visibility) {
        if (e.visibility !== filters.visibility) return false;
      }

      return true;
    });

    if (sortBy === 'date_earliest_first') {
      events.sort((a, b) => {
        const da = this._safeParseDate(a.start_datetime) || new Date(0);
        const db = this._safeParseDate(b.start_datetime) || new Date(0);
        return da - db;
      });
    }

    return events;
  }

  addEventToMyCalendar(eventId) {
    this._ensureSavedListInitialized();
    const events = this._getFromStorage('events');
    const event = events.find((e) => e.id === eventId);
    if (!event) {
      return {
        savedEventId: null,
        isNew: false,
        message: 'Event not found.'
      };
    }

    let savedEvents = this._getFromStorage('saved_events');
    let existing = savedEvents.find((s) => s.event_id === eventId);

    if (existing) {
      return {
        savedEventId: existing.id,
        isNew: false,
        message: 'Event is already in My Calendar.'
      };
    }

    const id = this._generateId('savedevent');
    const saved = {
      id,
      event_id: eventId,
      saved_at: new Date().toISOString(),
      notes: ''
    };

    savedEvents.push(saved);
    this._saveToStorage('saved_events', savedEvents);

    return {
      savedEventId: id,
      isNew: true,
      message: 'Event added to My Calendar.'
    };
  }

  getMySavedEvents() {
    this._ensureSavedListInitialized();
    const savedEvents = this._getFromStorage('saved_events');
    const events = this._getFromStorage('events');
    return savedEvents.map((item) => ({
      ...item,
      event: events.find((e) => e.id === item.event_id) || null
    }));
  }

  removeEventFromMyCalendar(savedEventId) {
    let savedEvents = this._getFromStorage('saved_events');
    const idx = savedEvents.findIndex((s) => s.id === savedEventId);
    if (idx === -1) {
      return {
        success: false,
        message: 'Saved event not found.'
      };
    }
    savedEvents.splice(idx, 1);
    this._saveToStorage('saved_events', savedEvents);
    return {
      success: true,
      message: 'Event removed from My Calendar.'
    };
  }

  // ------------------------
  // Policies & Saved Documents
  // ------------------------

  getPolicyFilterOptions() {
    const policies = this._getFromStorage('policy_documents');

    const categorySet = new Set();
    const yearSet = new Set();

    policies.forEach((p) => {
      if (p.category) categorySet.add(p.category);
      if (typeof p.year_published === 'number') yearSet.add(p.year_published);
    });

    const categories = Array.from(categorySet).sort().map((c) => ({
      value: c,
      label: c
        .split('_')
        .map((w) => this._capitalize(w))
        .join(' ')
    }));

    const years = Array.from(yearSet).sort((a, b) => a - b);

    return { categories, years };
  }

  listPolicyDocuments(filters, sortBy) {
    filters = filters || {};
    sortBy = sortBy || 'newest_first';

    let docs = this._getFromStorage('policy_documents');

    docs = docs.filter((d) => {
      if (filters.category) {
        if (d.category !== filters.category) return false;
      }
      if (typeof filters.minYearPublished === 'number') {
        if (typeof d.year_published !== 'number' || d.year_published < filters.minYearPublished) {
          return false;
        }
      }
      if (filters.status) {
        if (d.status !== filters.status) return false;
      }
      if (filters.onlyForms) {
        if (!d.is_form) return false;
      }
      return true;
    });

    docs.sort((a, b) => {
      const ya = typeof a.year_published === 'number' ? a.year_published : 0;
      const yb = typeof b.year_published === 'number' ? b.year_published : 0;
      if (sortBy === 'oldest_first') {
        if (ya === yb) return (a.title || '').localeCompare(b.title || '');
        return ya - yb;
      }
      // default newest_first
      if (ya === yb) return (a.title || '').localeCompare(b.title || '');
      return yb - ya;
    });

    return docs;
  }

  getPolicyDetails(policyId) {
    const policies = this._getFromStorage('policy_documents');
    const policy = policies.find((p) => p.id === policyId) || null;

    const savedDocs = this._getFromStorage('saved_documents');
    const isSaved = !!savedDocs.find((s) => s.policy_id === policyId);

    return {
      policy,
      isSaved
    };
  }

  savePolicyDocument(policyId) {
    this._ensureSavedListInitialized();
    const policies = this._getFromStorage('policy_documents');
    const policy = policies.find((p) => p.id === policyId);
    if (!policy) {
      return {
        savedDocumentId: null,
        isNew: false,
        message: 'Policy not found.'
      };
    }

    let savedDocs = this._getFromStorage('saved_documents');
    let existing = savedDocs.find((s) => s.policy_id === policyId);

    if (existing) {
      return {
        savedDocumentId: existing.id,
        isNew: false,
        message: 'Document is already saved.'
      };
    }

    const id = this._generateId('saveddoc');
    const saved = {
      id,
      policy_id: policyId,
      saved_at: new Date().toISOString(),
      notes: ''
    };
    savedDocs.push(saved);
    this._saveToStorage('saved_documents', savedDocs);

    return {
      savedDocumentId: id,
      isNew: true,
      message: 'Document saved.'
    };
  }

  getSavedDocuments() {
    this._ensureSavedListInitialized();
    const savedDocs = this._getFromStorage('saved_documents');
    const policies = this._getFromStorage('policy_documents');
    return savedDocs.map((item) => ({
      ...item,
      policy: policies.find((p) => p.id === item.policy_id) || null
    }));
  }

  removeSavedDocument(savedDocumentId) {
    let savedDocs = this._getFromStorage('saved_documents');
    const idx = savedDocs.findIndex((s) => s.id === savedDocumentId);
    if (idx === -1) {
      return {
        success: false,
        message: 'Saved document not found.'
      };
    }
    savedDocs.splice(idx, 1);
    this._saveToStorage('saved_documents', savedDocs);
    return {
      success: true,
      message: 'Document removed from Saved Documents.'
    };
  }

  // ------------------------
  // Newsletter Subscription
  // ------------------------

  getNewsletterOptions() {
    // Grade interests based on grade codes used elsewhere
    const gradeInterests = [
      'pre_k',
      'kindergarten',
      'grade_1',
      'grade_2',
      'grade_3',
      'grade_4',
      'grade_5',
      'grade_6'
    ].map((g) => ({
      value: g,
      label: this._gradeCodeToLabel(g)
    }));

    // Topic interests – structural config, not content
    const topicInterests = [
      { value: 'after_school_activities', label: 'After-School Activities' },
      { value: 'school_announcements', label: 'School Announcements' },
      { value: 'cafeteria_menu', label: 'Cafeteria & Lunch Menu' },
      { value: 'pta_events', label: 'PTA & Family Events' }
    ];

    const frequencyOptions = [
      { value: 'instant', label: 'Instant' },
      { value: 'daily_digest', label: 'Daily Digest' },
      { value: 'weekly_summary', label: 'Weekly Summary' },
      { value: 'monthly_summary', label: 'Monthly Summary' }
    ];

    return { gradeInterests, topicInterests, frequencyOptions };
  }

  subscribeToNewsletter(parentName, parentEmail, gradeInterests, topicInterests, frequency) {
    const validFrequencies = ['instant', 'daily_digest', 'weekly_summary', 'monthly_summary'];
    if (!validFrequencies.includes(frequency)) {
      return {
        subscriptionId: null,
        isActive: false,
        message: 'Invalid frequency option.'
      };
    }

    let subs = this._getFromStorage('newsletter_subscriptions');
    let existing = subs.find((s) => s.parent_email === parentEmail);

    const now = new Date().toISOString();

    if (existing) {
      existing.parent_name = parentName;
      existing.grade_interests = Array.isArray(gradeInterests) ? gradeInterests : [];
      existing.topic_interests = Array.isArray(topicInterests) ? topicInterests : [];
      existing.frequency = frequency;
      existing.is_active = true;
      existing.unsubscribed_at = null;
      this._saveToStorage('newsletter_subscriptions', subs);
      return {
        subscriptionId: existing.id,
        isActive: true,
        message: 'Newsletter subscription updated.'
      };
    }

    const id = this._generateId('newsletter');
    const sub = {
      id,
      parent_name: parentName,
      parent_email: parentEmail,
      grade_interests: Array.isArray(gradeInterests) ? gradeInterests : [],
      topic_interests: Array.isArray(topicInterests) ? topicInterests : [],
      frequency,
      is_active: true,
      subscribed_at: now,
      unsubscribed_at: null
    };

    subs.push(sub);
    this._saveToStorage('newsletter_subscriptions', subs);

    return {
      subscriptionId: id,
      isActive: true,
      message: 'Subscribed to newsletter.'
    };
  }

  // ------------------------
  // Enrollment & Checklists
  // ------------------------

  getEnrollmentOverviewInfo() {
    const stored = this._getFromStorage('enrollment_overview_info', null);
    if (stored && typeof stored === 'object' && !Array.isArray(stored)) {
      return {
        overviewText: stored.overviewText || '',
        timelineSummary: stored.timelineSummary || '',
        eligibilitySummary: stored.eligibilitySummary || '',
        stepsSummary: stored.stepsSummary || ''
      };
    }
    return {
      overviewText: '',
      timelineSummary: '',
      eligibilitySummary: '',
      stepsSummary: ''
    };
  }

  getEnrollmentChecklistOptions() {
    // School years: at least one 
    const schoolYears = [
      { value: '2026-2027', label: '2026–2027' }
    ];

    const grades = [
      'pre_k',
      'kindergarten',
      'grade_1',
      'grade_2',
      'grade_3',
      'grade_4',
      'grade_5',
      'grade_6'
    ].map((g) => ({
      value: g,
      label: this._gradeCodeToLabel(g)
    }));

    const studentTypes = [
      'new_student',
      'returning_student',
      'transfer_student',
      'other'
    ].map((st) => ({
      value: st,
      label: this._studentTypeToLabel(st)
    }));

    return { schoolYears, grades, studentTypes };
  }

  generateEnrollmentChecklist(schoolYear, grade, studentType) {
    const now = new Date().toISOString();

    const configId = this._generateId('enrollcfg');
    const label =
      'Enrollment ' +
      schoolYear +
      ' - ' +
      this._gradeCodeToLabel(grade) +
      ' (' +
      this._studentTypeToLabel(studentType) +
      ')';

    const checklistConfig = {
      id: configId,
      school_year: schoolYear,
      grade,
      student_type: studentType,
      created_at: now,
      label
    };

    const configs = this._getFromStorage('enrollment_checklist_configs');
    configs.push(checklistConfig);
    this._saveToStorage('enrollment_checklist_configs', configs);

    const requirements = this._getFromStorage('enrollment_requirements');

    const applicable = requirements.filter((r) => {
      let gradeOk = true;
      let typeOk = true;
      if (Array.isArray(r.grade_applicability) && r.grade_applicability.length) {
        gradeOk = r.grade_applicability.includes(grade);
      }
      if (Array.isArray(r.student_types_applicability) && r.student_types_applicability.length) {
        typeOk = r.student_types_applicability.includes(studentType);
      }
      return gradeOk && typeOk;
    });

    const items = [];
    const checklistItems = this._getFromStorage('enrollment_checklist_items');

    applicable.forEach((req, index) => {
      const item = {
        id: this._generateId('enrollitem'),
        checklist_config_id: configId,
        requirement_id: req.id,
        is_required: !!req.is_required,
        status: 'not_started',
        notes: '',
        position: index
      };
      checklistItems.push(item);
      items.push(item);
    });

    this._saveToStorage('enrollment_checklist_items', checklistItems);

    return {
      checklistConfig,
      items
    };
  }

  getEnrollmentChecklist(checklistConfigId) {
    let config = null;
    const configs = this._getFromStorage('enrollment_checklist_configs');

    if (checklistConfigId) {
      config = configs.find((c) => c.id === checklistConfigId) || null;
    } else {
      config = this._getLatestEnrollmentChecklistConfig();
    }

    if (!config) {
      return {
        checklistConfig: null,
        items: []
      };
    }

    const allItems = this._getFromStorage('enrollment_checklist_items');
    const requirements = this._getFromStorage('enrollment_requirements');

    const items = allItems
      .filter((i) => i.checklist_config_id === config.id)
      .sort((a, b) => {
        const pa = typeof a.position === 'number' ? a.position : 0;
        const pb = typeof b.position === 'number' ? b.position : 0;
        return pa - pb;
      })
      .map((i) => ({
        ...i,
        requirement: requirements.find((r) => r.id === i.requirement_id) || null
      }));

    return {
      checklistConfig: config,
      items
    };
  }

  addEnrollmentRequirementToSavedForms(requirementId, checklistConfigId) {
    this._ensureSavedListInitialized();

    let config = null;
    const configs = this._getFromStorage('enrollment_checklist_configs');

    if (checklistConfigId) {
      config = configs.find((c) => c.id === checklistConfigId) || null;
    } else {
      config = this._getLatestEnrollmentChecklistConfig();
    }

    if (!config) {
      return {
        savedEnrollmentFormId: null,
        isNew: false,
        message: 'No enrollment checklist configuration found.'
      };
    }

    const requirements = this._getFromStorage('enrollment_requirements');
    const req = requirements.find((r) => r.id === requirementId);
    if (!req) {
      return {
        savedEnrollmentFormId: null,
        isNew: false,
        message: 'Enrollment requirement not found.'
      };
    }

    let savedForms = this._getFromStorage('saved_enrollment_forms');
    let existing = savedForms.find(
      (s) => s.requirement_id === requirementId && s.checklist_config_id === config.id
    );

    if (existing) {
      return {
        savedEnrollmentFormId: existing.id,
        isNew: false,
        message: 'Form is already in Saved Forms.'
      };
    }

    const id = this._generateId('savedform');
    const saved = {
      id,
      checklist_config_id: config.id,
      requirement_id: requirementId,
      added_at: new Date().toISOString(),
      included_in_print_prep: false
    };

    savedForms.push(saved);
    this._saveToStorage('saved_enrollment_forms', savedForms);

    return {
      savedEnrollmentFormId: id,
      isNew: true,
      message: 'Form added to Saved Forms.'
    };
  }

  getSavedEnrollmentForms(checklistConfigId) {
    this._ensureSavedListInitialized();

    let config = null;
    const configs = this._getFromStorage('enrollment_checklist_configs');

    if (checklistConfigId) {
      config = configs.find((c) => c.id === checklistConfigId) || null;
    } else {
      config = this._getLatestEnrollmentChecklistConfig();
    }

    if (!config) {
      return [];
    }

    const savedForms = this._getFromStorage('saved_enrollment_forms').filter(
      (s) => s.checklist_config_id === config.id
    );
    const requirements = this._getFromStorage('enrollment_requirements');

    return savedForms.map((s) => ({
      ...s,
      requirement: requirements.find((r) => r.id === s.requirement_id) || null,
      checklistConfig: config
    }));
  }

  prepareSavedEnrollmentFormsForPrinting(checklistConfigId) {
    this._ensureSavedListInitialized();

    let config = null;
    const configs = this._getFromStorage('enrollment_checklist_configs');

    if (checklistConfigId) {
      config = configs.find((c) => c.id === checklistConfigId) || null;
    } else {
      config = this._getLatestEnrollmentChecklistConfig();
    }

    if (!config) {
      return {
        batchId: null,
        status: 'failed',
        formIds: [],
        message: 'No enrollment checklist configuration found.'
      };
    }

    const savedForms = this._getFromStorage('saved_enrollment_forms');
    const formsForConfig = savedForms.filter((s) => s.checklist_config_id === config.id);
    const formIds = formsForConfig.map((s) => s.id);

    // Mark forms as included in print prep
    formsForConfig.forEach((f) => {
      f.included_in_print_prep = true;
    });
    this._saveToStorage('saved_enrollment_forms', savedForms);

    const batches = this._getFromStorage('print_preparation_batches');
    const batchId = this._generateId('printbatch');

    const batch = {
      id: batchId,
      checklist_config_id: config.id,
      form_ids: formIds,
      created_at: new Date().toISOString(),
      status: 'prepared'
    };

    batches.push(batch);
    this._saveToStorage('print_preparation_batches', batches);

    return {
      batchId,
      status: 'prepared',
      formIds,
      message: 'Saved forms prepared for printing.'
    };
  }
}

// Global export for browser and Node.js
if (typeof globalThis !== 'undefined') {
  globalThis.BusinessLogic = BusinessLogic;
  // Singleton-like SDK instance
  if (!globalThis.WebsiteSDK) {
    globalThis.WebsiteSDK = new BusinessLogic();
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = BusinessLogic;
}
