// localStorage polyfill for Node.js and environments without localStorage
const localStorage = (function () {
  try {
    if (typeof globalThis !== 'undefined' && globalThis.localStorage) {
      return globalThis.localStorage;
    }
  } catch (e) {}
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
    const keys = [
      'after_school_programs',
      'program_favorites',
      'menu_weeks',
      'menu_items',
      'daily_menu_entries',
      'meal_plan_weeks',
      'meal_plan_entries',
      'bus_routes',
      'bus_stops',
      'saved_routes',
      'events',
      'saved_events',
      'staff_members',
      'teacher_messages',
      'policy_sections',
      'bookmarks',
      'supply_items',
      'supply_checklists',
      'supply_checklist_items',
      'summer_camp_sessions',
      'camp_interest_submissions'
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

  _getFromStorageObject(key, defaultValue) {
    const data = localStorage.getItem(key);
    if (!data) return defaultValue;
    try {
      return JSON.parse(data);
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
    localStorage.setItem('idCounter', String(next));
    return next;
  }

  _generateId(prefix) {
    return prefix + '_' + this._getNextIdCounter();
  }

  _nowIso() {
    return new Date().toISOString();
  }

  // ---------- Generic helpers ----------

  _parseTimeStringToMinutes(timeStr) {
    if (!timeStr || typeof timeStr !== 'string') return null;
    const trimmed = timeStr.trim();
    const match = trimmed.match(/^(\d{1,2}):(\d{2})\s*([AaPp][Mm])$/);
    if (!match) return null;
    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const period = match[3].toUpperCase();
    if (period === 'PM' && hours < 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
    return hours * 60 + minutes;
  }

  _parseAndCompareTimeStrings(timeA, timeB) {
    const a = this._parseTimeStringToMinutes(timeA);
    const b = this._parseTimeStringToMinutes(timeB);
    if (a == null || b == null) return 0;
    return a - b;
  }

  _getGradeLabel(gradeKey) {
    const map = {
      kindergarten: 'Kindergarten',
      first_grade: '1st Grade',
      second_grade: '2nd Grade',
      third_grade: '3rd Grade',
      fourth_grade: '4th Grade',
      fifth_grade: '5th Grade'
    };
    return map[gradeKey] || gradeKey;
  }

  _getAfterSchoolCategoryLabel(category) {
    const map = {
      math_science: 'Math & Science',
      arts: 'Arts',
      sports: 'Sports',
      language_culture: 'Language & Culture',
      technology: 'Technology',
      homework_help: 'Homework Help',
      general_enrichment: 'General Enrichment',
      other: 'Other'
    };
    return map[category] || category;
  }

  _getFeeFrequencyLabel(freq) {
    const map = {
      per_month: 'Per Month',
      per_week: 'Per Week',
      per_session: 'Per Session',
      per_semester: 'Per Semester',
      free: 'Free'
    };
    return map[freq] || freq;
  }

  _getBusGradeRangeLabel(range) {
    const map = {
      k_5_elementary: 'K-5 (Elementary)',
      middle_school: 'Middle School',
      high_school: 'High School',
      k_8: 'K-8',
      k_12: 'K-12'
    };
    return map[range] || range;
  }

  _getEventAudienceLabel(audience) {
    const map = {
      all_families: 'All Families',
      kindergarten_families: 'Kindergarten Families',
      first_grade_families: '1st Grade Families',
      second_grade_families: '2nd Grade Families',
      third_grade_families: '3rd Grade Families',
      fourth_grade_families: '4th Grade Families',
      fifth_grade_families: '5th Grade Families',
      staff_only: 'Staff Only',
      students_only: 'Students Only',
      community: 'Community',
      other: 'Other'
    };
    return map[audience] || audience;
  }

  _getEventCategoryLabel(category) {
    const map = {
      school_event: 'School Event',
      parent_meeting: 'Parent Meeting',
      holiday: 'Holiday',
      performance: 'Performance',
      sports_event: 'Sports Event',
      testing: 'Testing',
      other: 'Other'
    };
    return map[category] || category;
  }

  _getStaffSubjectLabel(subject) {
    const map = {
      math: 'Math',
      science: 'Science',
      reading: 'Reading',
      writing: 'Writing',
      language_arts: 'Language Arts',
      art: 'Art',
      music: 'Music',
      physical_education: 'Physical Education',
      social_studies: 'Social Studies',
      stem: 'STEM',
      special_education: 'Special Education',
      other: 'Other'
    };
    return map[subject] || subject;
  }

  _getSupplyCategoryLabel(category) {
    const map = {
      writing: 'Writing',
      paper: 'Paper',
      art: 'Art',
      storage: 'Storage',
      technology: 'Technology',
      hygiene: 'Hygiene',
      classroom_donation: 'Classroom Donation',
      other: 'Other'
    };
    return map[category] || category;
  }

  _toggleSavedState(options) {
    const { storageKey, foreignKeyField, targetId, mode } = options;
    const list = this._getFromStorage(storageKey);
    const existingIndex = list.findIndex((item) => item[foreignKeyField] === targetId);
    const now = this._nowIso();

    if (mode === 'remove') {
      if (existingIndex === -1) return { changed: false, item: null };
      const removed = list.splice(existingIndex, 1)[0];
      this._saveToStorage(storageKey, list);
      return { changed: true, item: removed };
    }

    if (existingIndex !== -1) {
      return { changed: false, item: list[existingIndex] };
    }

    const newItem = {
      id: this._generateId(storageKey.replace(/s$/, '')),
      [foreignKeyField]: targetId,
      saved_at: now
    };
    list.push(newItem);
    this._saveToStorage(storageKey, list);
    return { changed: true, item: newItem };
  }

  _getOrCreateMealPlanWeek(menuWeek) {
    const mealPlanWeeks = this._getFromStorage('meal_plan_weeks');
    let existing = mealPlanWeeks.find((mpw) => mpw.menu_week_id === menuWeek.id);
    if (existing) return existing;
    const newWeek = {
      id: this._generateId('meal_plan_week'),
      menu_week_id: menuWeek.id,
      label: menuWeek.label,
      start_date: menuWeek.start_date,
      end_date: menuWeek.end_date
    };
    mealPlanWeeks.push(newWeek);
    this._saveToStorage('meal_plan_weeks', mealPlanWeeks);
    return newWeek;
  }

  _getOrCreateSupplyChecklist(gradeLevel) {
    const checklists = this._getFromStorage('supply_checklists');
    let existing = checklists.find((cl) => cl.grade_level === gradeLevel);
    if (existing) return existing;
    const title = this._getGradeLabel(gradeLevel) + ' Supply Checklist';
    const newChecklist = {
      id: this._generateId('supply_checklist'),
      grade_level: gradeLevel,
      title,
      created_at: this._nowIso()
    };
    checklists.push(newChecklist);
    this._saveToStorage('supply_checklists', checklists);
    return newChecklist;
  }

  // ---------- 1. Home page ----------

  getHomePageOverview() {
    const overview = this._getFromStorageObject('home_page_overview', null);
    if (overview && typeof overview === 'object') {
      return {
        hero_title: overview.hero_title || '',
        hero_subtitle: overview.hero_subtitle || '',
        announcements: Array.isArray(overview.announcements) ? overview.announcements : [],
        highlights: Array.isArray(overview.highlights) ? overview.highlights : [],
        quick_tools: Array.isArray(overview.quick_tools) ? overview.quick_tools : []
      };
    }
    return {
      hero_title: '',
      hero_subtitle: '',
      announcements: [],
      highlights: [],
      quick_tools: []
    };
  }

  // ---------- 2. After-School Programs (Task 1) ----------

  getAfterSchoolProgramFilterOptions() {
    const gradeLevels = [
      { value: 'kindergarten', label: 'Kindergarten' },
      { value: 'first_grade', label: '1st Grade' },
      { value: 'second_grade', label: '2nd Grade' },
      { value: 'third_grade', label: '3rd Grade' },
      { value: 'fourth_grade', label: '4th Grade' },
      { value: 'fifth_grade', label: '5th Grade' }
    ];
    const categories = [
      'math_science',
      'arts',
      'sports',
      'language_culture',
      'technology',
      'homework_help',
      'general_enrichment',
      'other'
    ].map((value) => ({ value, label: this._getAfterSchoolCategoryLabel(value) }));
    const feeFrequencies = [
      'per_month',
      'per_week',
      'per_session',
      'per_semester',
      'free'
    ].map((value) => ({ value, label: this._getFeeFrequencyLabel(value) }));
    const scheduleDays = [
      { value: 'monday', label: 'Monday' },
      { value: 'tuesday', label: 'Tuesday' },
      { value: 'wednesday', label: 'Wednesday' },
      { value: 'thursday', label: 'Thursday' },
      { value: 'friday', label: 'Friday' }
    ];
    const sortOptions = [
      { value: 'start_time_asc', label: 'Start Time – Earliest First' },
      { value: 'start_time_desc', label: 'Start Time – Latest First' },
      { value: 'fee_amount_asc', label: 'Fee – Low to High' },
      { value: 'fee_amount_desc', label: 'Fee – High to Low' }
    ];
    return {
      grade_levels: gradeLevels,
      categories,
      fee_frequencies: feeFrequencies,
      schedule_days: scheduleDays,
      sort_options: sortOptions
    };
  }

  searchAfterSchoolPrograms(filters, sort_by) {
    const programs = this._getFromStorage('after_school_programs');
    const favorites = this._getFromStorage('program_favorites');
    const f = filters || {};
    const isActiveOnly = f.is_active_only !== false;

    let result = programs.filter((p) => {
      if (isActiveOnly && !p.is_active) return false;

      if (Array.isArray(f.grade_levels) && f.grade_levels.length > 0) {
        const programGrades = Array.isArray(p.grade_levels) ? p.grade_levels : [];
        const hasOverlap = programGrades.some((g) => f.grade_levels.indexOf(g) !== -1);
        if (!hasOverlap) return false;
      }

      if (Array.isArray(f.categories) && f.categories.length > 0) {
        if (f.categories.indexOf(p.category) === -1) return false;
      }

      if (typeof f.max_fee_amount === 'number') {
        const feeFreqFilter = f.fee_frequency;
        const isFree = p.fee_frequency === 'free';
        const feeAmount = isFree ? 0 : (p.fee_amount || 0);
        if (feeFreqFilter && !isFree && p.fee_frequency !== feeFreqFilter) {
          return false;
        }
        if (feeAmount > f.max_fee_amount) return false;
      }

      if (f.end_time_before) {
        if (this._parseAndCompareTimeStrings(p.end_time, f.end_time_before) > 0) {
          return false;
        }
      }

      if (Array.isArray(f.schedule_days) && f.schedule_days.length > 0) {
        const days = Array.isArray(p.schedule_days) ? p.schedule_days : [];
        const overlap = days.some((d) => f.schedule_days.indexOf(d) !== -1);
        if (!overlap) return false;
      }

      return true;
    });

    const sortKey = sort_by || 'start_time_asc';
    result.sort((a, b) => {
      if (sortKey === 'start_time_asc' || sortKey === 'start_time_desc') {
        const cmp = this._parseAndCompareTimeStrings(a.start_time, b.start_time);
        return sortKey === 'start_time_asc' ? cmp : -cmp;
      }
      if (sortKey === 'fee_amount_asc' || sortKey === 'fee_amount_desc') {
        const feeA = a.fee_frequency === 'free' ? 0 : (a.fee_amount || 0);
        const feeB = b.fee_frequency === 'free' ? 0 : (b.fee_amount || 0);
        const cmp = feeA - feeB;
        return sortKey === 'fee_amount_asc' ? cmp : -cmp;
      }
      return 0;
    });

    const scheduleDayLabelMap = {
      monday: 'Mon',
      tuesday: 'Tue',
      wednesday: 'Wed',
      thursday: 'Thu',
      friday: 'Fri'
    };

    return result.map((p) => {
      const isFavorited = favorites.some((fav) => fav.program_id === p.id);
      const grade_level_labels = (Array.isArray(p.grade_levels) ? p.grade_levels : []).map((g) => this._getGradeLabel(g));
      const scheduleDays = Array.isArray(p.schedule_days) ? p.schedule_days : [];
      const schedule_days_label = scheduleDays.map((d) => scheduleDayLabelMap[d] || d).join(', ');
      return {
        id: p.id,
        name: p.name,
        description: p.description || '',
        category: p.category,
        category_label: this._getAfterSchoolCategoryLabel(p.category),
        grade_levels: p.grade_levels || [],
        grade_level_labels,
        fee_amount: p.fee_amount,
        fee_frequency: p.fee_frequency,
        fee_frequency_label: this._getFeeFrequencyLabel(p.fee_frequency),
        fee_notes: p.fee_notes || '',
        schedule_days: scheduleDays,
        schedule_days_label,
        start_time: p.start_time,
        end_time: p.end_time,
        location: p.location || '',
        instructor_name: p.instructor_name || '',
        max_enrollment: p.max_enrollment,
        is_active: !!p.is_active,
        is_favorited: isFavorited
      };
    });
  }

  saveAfterSchoolProgramFavorite(programId) {
    const programs = this._getFromStorage('after_school_programs');
    const program = programs.find((p) => p.id === programId);
    if (!program) {
      return { success: false, favorite_id: null, saved_at: null, message: 'Program not found' };
    }
    const favorites = this._getFromStorage('program_favorites');
    const existing = favorites.find((f) => f.program_id === programId);
    if (existing) {
      return { success: true, favorite_id: existing.id, saved_at: existing.saved_at, message: 'Program already saved' };
    }
    const now = this._nowIso();
    const favorite = {
      id: this._generateId('program_favorite'),
      program_id: programId,
      saved_at: now
    };
    favorites.push(favorite);
    this._saveToStorage('program_favorites', favorites);
    return { success: true, favorite_id: favorite.id, saved_at: favorite.saved_at, message: 'Program saved' };
  }

  // ---------- 3. Lunch Menu & Meal Planner (Task 2) ----------

  getMenuWeeks() {
    const weeks = this._getFromStorage('menu_weeks');
    return weeks.map((w) => ({
      id: w.id,
      label: w.label,
      start_date: w.start_date,
      end_date: w.end_date
    }));
  }

  getLunchMenuForWeek(menuWeekId, filters) {
    const weeks = this._getFromStorage('menu_weeks');
    const menuWeek = weeks.find((w) => w.id === menuWeekId) || null;
    const entries = this._getFromStorage('daily_menu_entries').filter((e) => e.menu_week_id === menuWeekId);
    const items = this._getFromStorage('menu_items');
    const f = filters || {};
    const mealType = f.meal_type || 'lunch';

    const grouped = {};
    entries.forEach((entry) => {
      if (entry.meal_type !== mealType) return;
      const item = items.find((it) => it.id === entry.menu_item_id);
      if (!item) return;
      if (f.is_vegetarian === true && !item.is_vegetarian) return;
      if (f.is_nut_free === true && !item.is_nut_free) return;
      const dateKey = entry.date;
      if (!grouped[dateKey]) {
        grouped[dateKey] = {
          date: entry.date,
          day_of_week: entry.day_of_week,
          entries: []
        };
      }
      grouped[dateKey].entries.push({
        daily_menu_entry_id: entry.id,
        is_primary_entree: !!entry.is_primary_entree,
        meal_type: entry.meal_type,
        menu_item_id: item.id,
        name: item.name,
        description: item.description || '',
        item_type: item.item_type,
        is_vegetarian: !!item.is_vegetarian,
        is_nut_free: !!item.is_nut_free,
        allergen_labels: item.other_allergens || [],
        calories: item.calories,
        image_url: item.image_url || '',
        menu_item: item
      });
    });

    const days = Object.values(grouped).sort((a, b) => {
      if (a.date < b.date) return -1;
      if (a.date > b.date) return 1;
      return 0;
    });

    return {
      menu_week: menuWeek
        ? {
            id: menuWeek.id,
            label: menuWeek.label,
            start_date: menuWeek.start_date,
            end_date: menuWeek.end_date
          }
        : { id: null, label: '', start_date: null, end_date: null },
      days
    };
  }

  addMealToPlanner(menuWeekId, date, menuItemId) {
    const weeks = this._getFromStorage('menu_weeks');
    const menuWeek = weeks.find((w) => w.id === menuWeekId);
    if (!menuWeek) {
      return { success: false, message: 'Menu week not found', meal_plan_week: null, entries_by_day: [] };
    }
    const menuItems = this._getFromStorage('menu_items');
    const menuItem = menuItems.find((m) => m.id === menuItemId);
    if (!menuItem) {
      return { success: false, message: 'Menu item not found', meal_plan_week: null, entries_by_day: [] };
    }

    const mealPlanWeek = this._getOrCreateMealPlanWeek(menuWeek);
    const entries = this._getFromStorage('meal_plan_entries');
    const newEntry = {
      id: this._generateId('meal_plan_entry'),
      meal_plan_week_id: mealPlanWeek.id,
      date,
      menu_item_id: menuItem.id,
      menu_item_name_snapshot: menuItem.name,
      is_vegetarian: !!menuItem.is_vegetarian,
      is_nut_free: !!menuItem.is_nut_free,
      created_at: this._nowIso()
    };
    entries.push(newEntry);
    this._saveToStorage('meal_plan_entries', entries);

    const plan = this.getMealPlanForWeek(menuWeekId);
    return {
      success: true,
      message: 'Meal added to planner',
      meal_plan_week: plan.meal_plan_week,
      entries_by_day: plan.entries_by_day
    };
  }

  getMealPlanForWeek(menuWeekId) {
    const weeks = this._getFromStorage('menu_weeks');
    const menuWeek = weeks.find((w) => w.id === menuWeekId) || null;
    const mealPlanWeeks = this._getFromStorage('meal_plan_weeks');
    const mpw = mealPlanWeeks.find((w) => w.menu_week_id === menuWeekId) || null;
    if (!mpw) {
      return { meal_plan_week: null, entries_by_day: [] };
    }
    const entries = this._getFromStorage('meal_plan_entries').filter((e) => e.meal_plan_week_id === mpw.id);
    const menuItems = this._getFromStorage('menu_items');

    const grouped = {};
    entries.forEach((entry) => {
      const dateKey = entry.date;
      if (!grouped[dateKey]) {
        grouped[dateKey] = { date: entry.date, entries: [] };
      }
      const menuItem = menuItems.find((m) => m.id === entry.menu_item_id) || null;
      grouped[dateKey].entries.push({
        meal_plan_entry_id: entry.id,
        menu_item_id: entry.menu_item_id,
        menu_item_name_snapshot: entry.menu_item_name_snapshot,
        is_vegetarian: !!entry.is_vegetarian,
        is_nut_free: !!entry.is_nut_free,
        created_at: entry.created_at,
        menu_item: menuItem
      });
    });

    const entriesByDay = Object.values(grouped).sort((a, b) => {
      if (a.date < b.date) return -1;
      if (a.date > b.date) return 1;
      return 0;
    });

    const mealPlanWeek = {
      id: mpw.id,
      menu_week_id: mpw.menu_week_id,
      label: mpw.label,
      start_date: mpw.start_date,
      end_date: mpw.end_date,
      menu_week: menuWeek
    };

    return { meal_plan_week: mealPlanWeek, entries_by_day: entriesByDay };
  }

  removeMealFromPlanner(mealPlanEntryId) {
    const entries = this._getFromStorage('meal_plan_entries');
    const index = entries.findIndex((e) => e.id === mealPlanEntryId);
    if (index === -1) {
      return { success: false, message: 'Meal plan entry not found' };
    }
    entries.splice(index, 1);
    this._saveToStorage('meal_plan_entries', entries);
    return { success: true, message: 'Meal removed from planner' };
  }

  // ---------- 4. Bus Routes (Task 3) ----------

  getBusRouteFilterOptions() {
    const gradeRanges = [
      'k_5_elementary',
      'middle_school',
      'high_school',
      'k_8',
      'k_12'
    ].map((value) => ({ value, label: this._getBusGradeRangeLabel(value) }));

    const arrivalTimeWindows = [
      {
        value: 'before_7_45_am',
        label: 'Arrives before 7:45 AM',
        cutoff_time: '7:45 AM'
      }
    ];

    const sortOptions = [
      { value: 'arrival_time_asc', label: 'Arrival Time – Earliest First' },
      { value: 'arrival_time_desc', label: 'Arrival Time – Latest First' },
      { value: 'route_number_asc', label: 'Route Number – A to Z' }
    ];

    return {
      grade_ranges: gradeRanges,
      arrival_time_windows: arrivalTimeWindows,
      sort_options: sortOptions
    };
  }

  searchBusRoutes(query, filters, sort_by) {
    const routes = this._getFromStorage('bus_routes');
    const savedRoutes = this._getFromStorage('saved_routes');
    const f = filters || {};
    const isActiveOnly = f.is_active_only !== false;
    const q = (query || '').trim().toLowerCase();

    const options = this.getBusRouteFilterOptions();
    let cutoffTimeStr = null;
    if (f.arrival_time_window) {
      const win = options.arrival_time_windows.find((w) => w.value === f.arrival_time_window);
      if (win) cutoffTimeStr = win.cutoff_time;
    }

    let result = routes.filter((r) => {
      if (isActiveOnly && !r.is_active) return false;

      if (f.grade_range && r.grade_range !== f.grade_range) return false;

      if (cutoffTimeStr) {
        if (this._parseAndCompareTimeStrings(r.arrival_time_at_school, cutoffTimeStr) > 0) {
          return false;
        }
      }

      if (q) {
        const inName = (r.name || '').toLowerCase().indexOf(q) !== -1;
        const inRouteNumber = (r.route_number || '').toLowerCase().indexOf(q) !== -1;
        const streets = Array.isArray(r.served_streets) ? r.served_streets : [];
        const inStreet = streets.some((s) => (s || '').toLowerCase().indexOf(q) !== -1);
        if (!inName && !inRouteNumber && !inStreet) return false;
      }

      return true;
    });

    const sortKey = sort_by || 'arrival_time_asc';
    result.sort((a, b) => {
      if (sortKey === 'arrival_time_asc' || sortKey === 'arrival_time_desc') {
        const cmp = this._parseAndCompareTimeStrings(a.arrival_time_at_school, b.arrival_time_at_school);
        return sortKey === 'arrival_time_asc' ? cmp : -cmp;
      }
      if (sortKey === 'route_number_asc') {
        const ra = (a.route_number || '').toString();
        const rb = (b.route_number || '').toString();
        if (ra < rb) return -1;
        if (ra > rb) return 1;
        return 0;
      }
      return 0;
    });

    return result.map((r) => {
      const isSaved = savedRoutes.some((sr) => sr.bus_route_id === r.id);
      return {
        id: r.id,
        route_number: r.route_number,
        name: r.name,
        description: r.description || '',
        grade_range: r.grade_range,
        grade_range_label: this._getBusGradeRangeLabel(r.grade_range),
        arrival_time_at_school: r.arrival_time_at_school,
        school_name: r.school_name,
        served_streets: r.served_streets || [],
        is_active: !!r.is_active,
        is_saved: isSaved
      };
    });
  }

  getBusRouteDetail(busRouteId) {
    const routes = this._getFromStorage('bus_routes');
    const route = routes.find((r) => r.id === busRouteId) || null;
    const stops = this._getFromStorage('bus_stops').filter((s) => s.bus_route_id === busRouteId);
    const savedRoutes = this._getFromStorage('saved_routes');
    const isSaved = route ? savedRoutes.some((sr) => sr.bus_route_id === route.id) : false;

    const routeObj = route
      ? {
          id: route.id,
          route_number: route.route_number,
          name: route.name,
          description: route.description || '',
          grade_range: route.grade_range,
          grade_range_label: this._getBusGradeRangeLabel(route.grade_range),
          arrival_time_at_school: route.arrival_time_at_school,
          school_name: route.school_name,
          served_streets: route.served_streets || [],
          is_active: !!route.is_active,
          notes: route.notes || '',
          is_saved: isSaved
        }
      : null;

    const sortedStops = stops
      .slice()
      .sort((a, b) => {
        return (a.stop_order || 0) - (b.stop_order || 0);
      })
      .map((s) => ({
        id: s.id,
        stop_order: s.stop_order,
        stop_name: s.stop_name,
        street_name: s.street_name,
        cross_street: s.cross_street || '',
        pickup_time: s.pickup_time,
        dropoff_time: s.dropoff_time || ''
      }));

    return { route: routeObj, stops: sortedStops };
  }

  saveBusRouteToMyRoutes(busRouteId) {
    const routes = this._getFromStorage('bus_routes');
    const route = routes.find((r) => r.id === busRouteId);
    if (!route) {
      return { success: false, saved_route_id: null, saved_at: null, message: 'Bus route not found' };
    }
    const savedRoutes = this._getFromStorage('saved_routes');
    const existing = savedRoutes.find((sr) => sr.bus_route_id === busRouteId);
    if (existing) {
      return { success: true, saved_route_id: existing.id, saved_at: existing.saved_at, message: 'Route already saved' };
    }
    const now = this._nowIso();
    const newSaved = {
      id: this._generateId('saved_route'),
      bus_route_id: busRouteId,
      saved_at: now
    };
    savedRoutes.push(newSaved);
    this._saveToStorage('saved_routes', savedRoutes);
    return { success: true, saved_route_id: newSaved.id, saved_at: newSaved.saved_at, message: 'Route saved' };
  }

  getMyRoutes() {
    const savedRoutes = this._getFromStorage('saved_routes');
    const routes = this._getFromStorage('bus_routes');
    return savedRoutes.map((sr) => {
      const route = routes.find((r) => r.id === sr.bus_route_id) || null;
      return {
        saved_route_id: sr.id,
        saved_at: sr.saved_at,
        bus_route_id: sr.bus_route_id,
        route_number: route ? route.route_number : null,
        name: route ? route.name : null,
        arrival_time_at_school: route ? route.arrival_time_at_school : null,
        school_name: route ? route.school_name : null,
        primary_streets: route && Array.isArray(route.served_streets) ? route.served_streets : [],
        bus_route: route
      };
    });
  }

  removeSavedRoute(savedRouteId) {
    const savedRoutes = this._getFromStorage('saved_routes');
    const index = savedRoutes.findIndex((sr) => sr.id === savedRouteId);
    if (index === -1) {
      return { success: false, message: 'Saved route not found' };
    }
    savedRoutes.splice(index, 1);
    this._saveToStorage('saved_routes', savedRoutes);
    return { success: true, message: 'Saved route removed' };
  }

  // ---------- 5. Calendar & Events (Task 4) ----------

  getCalendarFilterOptions() {
    const audiences = [
      'all_families',
      'kindergarten_families',
      'first_grade_families',
      'second_grade_families',
      'third_grade_families',
      'fourth_grade_families',
      'fifth_grade_families',
      'staff_only',
      'students_only',
      'community',
      'other'
    ].map((value) => ({ value, label: this._getEventAudienceLabel(value) }));

    const timeOfDayRanges = [
      {
        value: 'evening_5_8_pm',
        label: '5:00 PM–8:00 PM',
        start_time: '5:00 PM',
        end_time: '8:00 PM'
      }
    ];

    const sortOptions = [
      { value: 'start_datetime_asc', label: 'Start Time – Earliest First' }
    ];

    return {
      audiences,
      time_of_day_ranges: timeOfDayRanges,
      sort_options: sortOptions
    };
  }

  searchCalendarEvents(month, year, filters, sort_by) {
    const events = this._getFromStorage('events');
    const savedEvents = this._getFromStorage('saved_events');
    const f = filters || {};

    const opts = this.getCalendarFilterOptions();
    let timeRange = null;
    if (f.time_of_day_range) {
      timeRange = opts.time_of_day_ranges.find((r) => r.value === f.time_of_day_range) || null;
    }

    const startMinutes = timeRange ? this._parseTimeStringToMinutes(timeRange.start_time) : null;
    const endMinutes = timeRange ? this._parseTimeStringToMinutes(timeRange.end_time) : null;

    const filtered = events.filter((ev) => {
      if (!ev.start_datetime) return false;
      const d = new Date(ev.start_datetime);
      if (d.getUTCFullYear() !== year || d.getUTCMonth() + 1 !== month) return false;

      if (f.audience && ev.audience !== f.audience) return false;

      if (timeRange && startMinutes != null && endMinutes != null) {
        const minutes = d.getUTCHours() * 60 + d.getUTCMinutes();
        if (minutes < startMinutes || minutes > endMinutes) return false;
      }

      return true;
    });

    const sortKey = sort_by || 'start_datetime_asc';
    filtered.sort((a, b) => {
      if (sortKey === 'start_datetime_asc') {
        const da = new Date(a.start_datetime).getTime();
        const db = new Date(b.start_datetime).getTime();
        return da - db;
      }
      return 0;
    });

    const resultEvents = filtered.map((ev) => {
      const isSaved = savedEvents.some((se) => se.event_id === ev.id);
      return {
        id: ev.id,
        title: ev.title,
        description: ev.description || '',
        location: ev.location || '',
        start_datetime: ev.start_datetime,
        end_datetime: ev.end_datetime,
        audience: ev.audience,
        audience_label: this._getEventAudienceLabel(ev.audience),
        category: ev.category || 'other',
        category_label: this._getEventCategoryLabel(ev.category || 'other'),
        is_all_day: !!ev.is_all_day,
        is_saved: isSaved
      };
    });

    return { month, year, events: resultEvents };
  }

  getEventDetail(eventId) {
    const events = this._getFromStorage('events');
    const ev = events.find((e) => e.id === eventId);
    if (!ev) return null;
    const savedEvents = this._getFromStorage('saved_events');
    const isSaved = savedEvents.some((se) => se.event_id === ev.id);
    return {
      id: ev.id,
      title: ev.title,
      description: ev.description || '',
      location: ev.location || '',
      start_datetime: ev.start_datetime,
      end_datetime: ev.end_datetime,
      audience: ev.audience,
      audience_label: this._getEventAudienceLabel(ev.audience),
      grade_levels: ev.grade_levels || [],
      grade_level_labels: (ev.grade_levels || []).map((g) => this._getGradeLabel(g)),
      category: ev.category || 'other',
      category_label: this._getEventCategoryLabel(ev.category || 'other'),
      is_all_day: !!ev.is_all_day,
      external_link: ev.external_link || '',
      is_saved: isSaved
    };
  }

  saveEventToMyEvents(eventId) {
    const events = this._getFromStorage('events');
    const ev = events.find((e) => e.id === eventId);
    if (!ev) {
      return { success: false, saved_event_id: null, saved_at: null, message: 'Event not found' };
    }
    const savedEvents = this._getFromStorage('saved_events');
    const existing = savedEvents.find((se) => se.event_id === eventId);
    if (existing) {
      return { success: true, saved_event_id: existing.id, saved_at: existing.saved_at, message: 'Event already saved' };
    }
    const now = this._nowIso();
    const newSaved = {
      id: this._generateId('saved_event'),
      event_id: eventId,
      saved_at: now
    };
    savedEvents.push(newSaved);
    this._saveToStorage('saved_events', savedEvents);
    return { success: true, saved_event_id: newSaved.id, saved_at: newSaved.saved_at, message: 'Event saved' };
  }

  getMyEvents() {
    const savedEvents = this._getFromStorage('saved_events');
    const events = this._getFromStorage('events');
    return savedEvents.map((se) => {
      const ev = events.find((e) => e.id === se.event_id) || null;
      return {
        saved_event_id: se.id,
        saved_at: se.saved_at,
        event_id: se.event_id,
        title: ev ? ev.title : null,
        start_datetime: ev ? ev.start_datetime : null,
        end_datetime: ev ? ev.end_datetime : null,
        audience_label: ev ? this._getEventAudienceLabel(ev.audience) : null,
        location: ev ? ev.location : null,
        category_label: ev ? this._getEventCategoryLabel(ev.category || 'other') : null,
        event: ev
      };
    });
  }

  removeSavedEvent(savedEventId) {
    const savedEvents = this._getFromStorage('saved_events');
    const index = savedEvents.findIndex((se) => se.id === savedEventId);
    if (index === -1) {
      return { success: false, message: 'Saved event not found' };
    }
    savedEvents.splice(index, 1);
    this._saveToStorage('saved_events', savedEvents);
    return { success: true, message: 'Saved event removed' };
  }

  // ---------- 6. Staff Directory & Messages (Task 5) ----------

  getStaffDirectoryFilterOptions() {
    const gradeLevels = [
      'kindergarten',
      'first_grade',
      'second_grade',
      'third_grade',
      'fourth_grade',
      'fifth_grade'
    ].map((value) => ({ value, label: this._getGradeLabel(value) }));

    const subjects = [
      'math',
      'science',
      'reading',
      'writing',
      'language_arts',
      'art',
      'music',
      'physical_education',
      'social_studies',
      'stem',
      'special_education',
      'other'
    ].map((value) => ({ value, label: this._getStaffSubjectLabel(value) }));

    const sortOptions = [
      { value: 'experience_desc', label: 'Years of Experience – Most to Least' },
      { value: 'experience_asc', label: 'Years of Experience – Least to Most' },
      { value: 'name_asc', label: 'Name – A to Z' }
    ];

    return { grade_levels: gradeLevels, subjects, sort_options: sortOptions };
  }

  searchStaffDirectory(filters, sort_by) {
    const staff = this._getFromStorage('staff_members');
    const f = filters || {};
    const isTeacherOnly = f.is_teacher_only !== false;

    let result = staff.filter((s) => {
      if (isTeacherOnly && !s.is_teacher) return false;
      if (f.grade_level) {
        const grades = Array.isArray(s.grade_levels) ? s.grade_levels : [];
        if (grades.indexOf(f.grade_level) === -1) return false;
      }
      if (f.primary_subject && s.primary_subject !== f.primary_subject) return false;
      return true;
    });

    const sortKey = sort_by || 'experience_desc';
    result.sort((a, b) => {
      if (sortKey === 'experience_desc' || sortKey === 'experience_asc') {
        const cmp = (a.years_of_experience || 0) - (b.years_of_experience || 0);
        return sortKey === 'experience_desc' ? -cmp : cmp;
      }
      if (sortKey === 'name_asc') {
        const na = (a.full_name || '').toLowerCase();
        const nb = (b.full_name || '').toLowerCase();
        if (na < nb) return -1;
        if (na > nb) return 1;
        return 0;
      }
      return 0;
    });

    return result.map((s) => ({
      id: s.id,
      full_name: s.full_name,
      role_title: s.role_title,
      department: s.department || '',
      grade_levels: s.grade_levels || [],
      grade_level_labels: (s.grade_levels || []).map((g) => this._getGradeLabel(g)),
      primary_subject: s.primary_subject || 'other',
      primary_subject_label: this._getStaffSubjectLabel(s.primary_subject || 'other'),
      years_of_experience: s.years_of_experience || 0,
      email: s.email || '',
      room_number: s.room_number || '',
      photo_url: s.photo_url || '',
      is_teacher: !!s.is_teacher
    }));
  }

  getTeacherProfile(staffMemberId) {
    const staff = this._getFromStorage('staff_members');
    const s = staff.find((st) => st.id === staffMemberId);
    if (!s) return null;
    return {
      id: s.id,
      full_name: s.full_name,
      first_name: s.first_name,
      last_name: s.last_name,
      role_title: s.role_title,
      department: s.department || '',
      grade_levels: s.grade_levels || [],
      grade_level_labels: (s.grade_levels || []).map((g) => this._getGradeLabel(g)),
      primary_subject: s.primary_subject || 'other',
      primary_subject_label: this._getStaffSubjectLabel(s.primary_subject || 'other'),
      subjects_taught: s.subjects_taught || [],
      years_of_experience: s.years_of_experience || 0,
      email: s.email || '',
      phone: s.phone || '',
      room_number: s.room_number || '',
      bio: s.bio || '',
      photo_url: s.photo_url || '',
      is_teacher: !!s.is_teacher
    };
  }

  sendTeacherMessage(staffMemberId, parentName, studentName, email, messageBody) {
    const staff = this._getFromStorage('staff_members');
    const s = staff.find((st) => st.id === staffMemberId);
    if (!s) {
      return {
        success: false,
        teacher_message_id: null,
        status: 'failed',
        created_at: null,
        message: 'Staff member not found'
      };
    }
    const messages = this._getFromStorage('teacher_messages');
    const now = this._nowIso();
    const msg = {
      id: this._generateId('teacher_message'),
      staff_member_id: staffMemberId,
      parent_name: parentName,
      student_name: studentName,
      email,
      message_body: messageBody,
      created_at: now,
      status: 'sent'
    };
    messages.push(msg);
    this._saveToStorage('teacher_messages', messages);
    return {
      success: true,
      teacher_message_id: msg.id,
      status: msg.status,
      created_at: msg.created_at,
      message: 'Message sent'
    };
  }

  // ---------- 7. Homework Policies & Bookmarks (Task 6) ----------

  getPolicyGradeLevels() {
    const grades = [
      'kindergarten',
      'first_grade',
      'second_grade',
      'third_grade',
      'fourth_grade',
      'fifth_grade'
    ];
    return grades.map((value) => ({ value, label: this._getGradeLabel(value) }));
  }

  getPolicySectionsForGrade(gradeLevel) {
    const sections = this._getFromStorage('policy_sections').filter((s) => s.grade_level === gradeLevel);
    const keyLabelMap = {
      homework_time_guidelines: 'Homework Time Guidelines',
      grading_scale: 'Grading Scale',
      late_work_policy: 'Late Work Policy',
      test_retake_policy: 'Test Retake Policy',
      general_guidelines: 'General Guidelines',
      other: 'Other'
    };
    return sections.map((s) => ({
      id: s.id,
      grade_level: s.grade_level,
      section_key: s.section_key,
      section_key_label: keyLabelMap[s.section_key] || s.section_key,
      section_title: s.section_title,
      content: s.content,
      nightly_homework_minutes_limit: s.nightly_homework_minutes_limit,
      anchor_id: s.anchor_id || '',
      last_updated: s.last_updated || null
    }));
  }

  bookmarkPolicySection(policySectionId) {
    const sections = this._getFromStorage('policy_sections');
    const section = sections.find((s) => s.id === policySectionId);
    if (!section) {
      return { success: false, bookmark_id: null, created_at: null, message: 'Policy section not found', bookmark: null };
    }
    const bookmarks = this._getFromStorage('bookmarks');
    const existing = bookmarks.find((b) => b.policy_section_id === policySectionId);
    if (existing) {
      return {
        success: true,
        bookmark_id: existing.id,
        created_at: existing.created_at,
        message: 'Section already bookmarked',
        bookmark: {
          policy_section_id: existing.policy_section_id,
          section_title_snapshot: existing.section_title_snapshot,
          page_url: existing.page_url,
          anchor_id: existing.anchor_id || ''
        }
      };
    }
    const now = this._nowIso();
    const baseUrl = '/academics/homework-grading-policies';
    const newBookmark = {
      id: this._generateId('bookmark'),
      policy_section_id: policySectionId,
      section_title_snapshot: section.section_title,
      page_url: baseUrl,
      anchor_id: section.anchor_id || '',
      created_at: now
    };
    bookmarks.push(newBookmark);
    this._saveToStorage('bookmarks', bookmarks);
    return {
      success: true,
      bookmark_id: newBookmark.id,
      created_at: newBookmark.created_at,
      message: 'Bookmark created',
      bookmark: {
        policy_section_id: newBookmark.policy_section_id,
        section_title_snapshot: newBookmark.section_title_snapshot,
        page_url: newBookmark.page_url,
        anchor_id: newBookmark.anchor_id
      }
    };
  }

  getMyBookmarks() {
    const bookmarks = this._getFromStorage('bookmarks');
    const sections = this._getFromStorage('policy_sections');
    return bookmarks.map((b) => {
      const section = sections.find((s) => s.id === b.policy_section_id) || null;
      return {
        bookmark_id: b.id,
        policy_section_id: b.policy_section_id,
        section_title_snapshot: b.section_title_snapshot,
        page_url: b.page_url,
        anchor_id: b.anchor_id || '',
        created_at: b.created_at,
        policy_section: section
      };
    });
  }

  removeBookmark(bookmarkId) {
    const bookmarks = this._getFromStorage('bookmarks');
    const index = bookmarks.findIndex((b) => b.id === bookmarkId);
    if (index === -1) {
      return { success: false, message: 'Bookmark not found' };
    }
    bookmarks.splice(index, 1);
    this._saveToStorage('bookmarks', bookmarks);
    return { success: true, message: 'Bookmark removed' };
  }

  // ---------- 8. Supply Lists & Checklist (Task 7) ----------

  getSupplyGradeLevels() {
    const grades = [
      'kindergarten',
      'first_grade',
      'second_grade',
      'third_grade',
      'fourth_grade',
      'fifth_grade'
    ];
    return grades.map((value) => ({ value, label: this._getGradeLabel(value) }));
  }

  getSupplyListForGrade(gradeLevel, options) {
    const opts = options || {};
    const optionalOnly = opts.optional_items_only === true;
    const sortBy = opts.sort_by || 'estimated_cost_asc';

    let items = this._getFromStorage('supply_items').filter((i) => i.grade_level === gradeLevel);
    if (optionalOnly) {
      items = items.filter((i) => !i.is_required);
    }

    items.sort((a, b) => {
      if (sortBy === 'estimated_cost_asc' || sortBy === 'estimated_cost_desc') {
        const cmp = (a.estimated_cost || 0) - (b.estimated_cost || 0);
        return sortBy === 'estimated_cost_asc' ? cmp : -cmp;
      }
      if (sortBy === 'name_asc') {
        const na = (a.name || '').toLowerCase();
        const nb = (b.name || '').toLowerCase();
        if (na < nb) return -1;
        if (na > nb) return 1;
        return 0;
      }
      return 0;
    });

    const mappedItems = items.map((i) => ({
      id: i.id,
      name: i.name,
      description: i.description || '',
      category: i.category || 'other',
      category_label: this._getSupplyCategoryLabel(i.category || 'other'),
      quantity_recommended: i.quantity_recommended,
      estimated_cost: i.estimated_cost,
      is_required: !!i.is_required,
      is_required_label: i.is_required ? 'Required' : 'Optional',
      notes: i.notes || ''
    }));

    return {
      grade_level: gradeLevel,
      grade_label: this._getGradeLabel(gradeLevel),
      items: mappedItems
    };
  }

  addSupplyItemToChecklist(gradeLevel, supplyItemId, quantity) {
    const items = this._getFromStorage('supply_items');
    const item = items.find((i) => i.id === supplyItemId);
    if (!item) {
      return {
        success: false,
        message: 'Supply item not found',
        supply_checklist_id: null,
        checklist_title: null,
        added_item: null
      };
    }
    const checklist = this._getOrCreateSupplyChecklist(gradeLevel);
    const checklistItems = this._getFromStorage('supply_checklist_items');
    const finalQty = typeof quantity === 'number' && quantity > 0 ? quantity : (item.quantity_recommended || 1);

    const newItem = {
      id: this._generateId('supply_checklist_item'),
      supply_checklist_id: checklist.id,
      supply_item_id: item.id,
      name_snapshot: item.name,
      estimated_cost_snapshot: item.estimated_cost,
      is_required_snapshot: !!item.is_required,
      quantity: finalQty,
      is_purchased: false,
      added_at: this._nowIso()
    };
    checklistItems.push(newItem);
    this._saveToStorage('supply_checklist_items', checklistItems);

    return {
      success: true,
      message: 'Item added to checklist',
      supply_checklist_id: checklist.id,
      checklist_title: checklist.title,
      added_item: {
        checklist_item_id: newItem.id,
        supply_item_id: newItem.supply_item_id,
        name_snapshot: newItem.name_snapshot,
        estimated_cost_snapshot: newItem.estimated_cost_snapshot,
        is_required_snapshot: newItem.is_required_snapshot,
        quantity: newItem.quantity,
        is_purchased: newItem.is_purchased,
        added_at: newItem.added_at,
        supply_item: item
      }
    };
  }

  getMySupplyChecklist(gradeLevel) {
    const checklists = this._getFromStorage('supply_checklists');
    const checklistItems = this._getFromStorage('supply_checklist_items');
    const items = this._getFromStorage('supply_items');

    const filteredChecklists = gradeLevel
      ? checklists.filter((cl) => cl.grade_level === gradeLevel)
      : checklists;

    const result = filteredChecklists.map((cl) => {
      const clItems = checklistItems.filter((ci) => ci.supply_checklist_id === cl.id);
      const mappedItems = clItems.map((ci) => {
        const item = items.find((i) => i.id === ci.supply_item_id) || null;
        return {
          checklist_item_id: ci.id,
          supply_item_id: ci.supply_item_id,
          name_snapshot: ci.name_snapshot,
          estimated_cost_snapshot: ci.estimated_cost_snapshot,
          is_required_snapshot: ci.is_required_snapshot,
          quantity: ci.quantity,
          is_purchased: ci.is_purchased,
          added_at: ci.added_at,
          supply_item: item
        };
      });
      return {
        supply_checklist_id: cl.id,
        grade_level: cl.grade_level,
        grade_label: this._getGradeLabel(cl.grade_level),
        title: cl.title,
        created_at: cl.created_at,
        items: mappedItems
      };
    });

    return { checklists: result };
  }

  setSupplyChecklistItemPurchased(checklistItemId, isPurchased) {
    const checklistItems = this._getFromStorage('supply_checklist_items');
    const item = checklistItems.find((ci) => ci.id === checklistItemId);
    if (!item) {
      return { success: false, checklist_item_id: null, is_purchased: null, message: 'Checklist item not found' };
    }
    item.is_purchased = !!isPurchased;
    this._saveToStorage('supply_checklist_items', checklistItems);
    return { success: true, checklist_item_id: item.id, is_purchased: item.is_purchased, message: 'Checklist item updated' };
  }

  removeSupplyChecklistItem(checklistItemId) {
    const checklistItems = this._getFromStorage('supply_checklist_items');
    const index = checklistItems.findIndex((ci) => ci.id === checklistItemId);
    if (index === -1) {
      return { success: false, message: 'Checklist item not found' };
    }
    checklistItems.splice(index, 1);
    this._saveToStorage('supply_checklist_items', checklistItems);
    return { success: true, message: 'Checklist item removed' };
  }

  // ---------- 9. Summer Camps & Interest Forms (Task 8) ----------

  getSummerCampFilterOptions() {
    const months = [
      { value: 'june', label: 'June' },
      { value: 'july', label: 'July' },
      { value: 'august', label: 'August' }
    ];

    const dailyScheduleOptions = [
      {
        value: '9_00_am_3_00_pm',
        label: '9:00 AM–3:00 PM',
        daily_start_time: '9:00 AM',
        daily_end_time: '3:00 PM'
      }
    ];

    const maxFeePresets = [
      { value: 100, label: 'Up to $100/week' },
      { value: 150, label: 'Up to $150/week' },
      { value: 200, label: 'Up to $200/week' }
    ];

    const sortOptions = [
      { value: 'start_date_asc', label: 'Start Date – Earliest First' },
      { value: 'weekly_fee_asc', label: 'Weekly Fee – Low to High' }
    ];

    return {
      months,
      daily_schedule_options: dailyScheduleOptions,
      max_fee_presets: maxFeePresets,
      sort_options: sortOptions
    };
  }

  searchSummerCampSessions(filters, sort_by) {
    const f = filters || {};
    const sessions = this._getFromStorage('summer_camp_sessions');
    const isActiveOnly = f.is_active_only !== false;

    const opts = this.getSummerCampFilterOptions();
    let scheduleConfig = null;
    if (f.daily_schedule_value) {
      scheduleConfig = opts.daily_schedule_options.find((o) => o.value === f.daily_schedule_value) || null;
    }

    let result = sessions.filter((s) => {
      if (isActiveOnly && !s.is_active) return false;
      if (f.month && s.month !== f.month) return false;
      if (scheduleConfig) {
        if (s.daily_start_time !== scheduleConfig.daily_start_time || s.daily_end_time !== scheduleConfig.daily_end_time) {
          return false;
        }
      }
      if (typeof f.max_weekly_fee === 'number') {
        if ((s.weekly_fee || 0) > f.max_weekly_fee) return false;
      }
      return true;
    });

    const sortKey = sort_by || 'start_date_asc';
    result.sort((a, b) => {
      if (sortKey === 'start_date_asc') {
        const da = new Date(a.start_date).getTime();
        const db = new Date(b.start_date).getTime();
        return da - db;
      }
      if (sortKey === 'weekly_fee_asc') {
        return (a.weekly_fee || 0) - (b.weekly_fee || 0);
      }
      return 0;
    });

    return result.map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description || '',
      location: s.location || '',
      start_date: s.start_date,
      end_date: s.end_date,
      month: s.month,
      daily_start_time: s.daily_start_time,
      daily_end_time: s.daily_end_time,
      weekly_fee: s.weekly_fee,
      currency: s.currency,
      eligible_grades: s.eligible_grades || [],
      eligible_grade_labels: (s.eligible_grades || []).map((g) => this._getGradeLabel(g)),
      activities_summary: s.activities_summary || '',
      session_label: s.session_label,
      is_active: !!s.is_active
    }));
  }

  getSummerCampSessionDetail(campSessionId) {
    const sessions = this._getFromStorage('summer_camp_sessions');
    const s = sessions.find((cs) => cs.id === campSessionId);
    if (!s) return null;
    return {
      id: s.id,
      name: s.name,
      description: s.description || '',
      location: s.location || '',
      start_date: s.start_date,
      end_date: s.end_date,
      month: s.month,
      daily_start_time: s.daily_start_time,
      daily_end_time: s.daily_end_time,
      weekly_fee: s.weekly_fee,
      currency: s.currency,
      eligible_grades: s.eligible_grades || [],
      eligible_grade_labels: (s.eligible_grades || []).map((g) => this._getGradeLabel(g)),
      activities_summary: s.activities_summary || '',
      session_label: s.session_label,
      is_active: !!s.is_active
    };
  }

  submitCampInterestForm(campSessionId, childName, upcomingGrade, guardianName, phoneNumber, email, preferredSessionLabel) {
    const sessions = this._getFromStorage('summer_camp_sessions');
    const s = sessions.find((cs) => cs.id === campSessionId);
    if (!s) {
      return {
        success: false,
        camp_interest_submission_id: null,
        status: 'cancelled',
        submitted_at: null,
        message: 'Camp session not found'
      };
    }
    const submissions = this._getFromStorage('camp_interest_submissions');
    const now = this._nowIso();
    const sub = {
      id: this._generateId('camp_interest_submission'),
      camp_session_id: campSessionId,
      child_name: childName,
      upcoming_grade: upcomingGrade,
      guardian_name: guardianName,
      phone_number: phoneNumber,
      email: email || '',
      preferred_session_label: preferredSessionLabel,
      submitted_at: now,
      status: 'submitted'
    };
    submissions.push(sub);
    this._saveToStorage('camp_interest_submissions', submissions);
    return {
      success: true,
      camp_interest_submission_id: sub.id,
      status: sub.status,
      submitted_at: sub.submitted_at,
      message: 'Camp interest submitted'
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
